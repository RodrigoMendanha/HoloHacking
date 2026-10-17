-- ============================================================================
-- RESULTADO FINAL HOLOS (decisoes metodologicas aprovadas em 10/10/2026, DECISOES-V1 item 180)
-- ============================================================================
-- SOMENTE ADITIVA. Nao altera HOLOS-V1@2, perguntas, pesos, faixas, Indice, Triade, cobertura, o catalogo
-- Sistema -> Ferramenta (HOLOS-RECOMENDACOES-V1), nenhum Resultado HOLOS ja salvo, nenhum snapshot e nenhum hash.
--
-- 1. Resultado HOLOS, template 2 (so resultados NOVOS):
--    * o snapshot passa a CONGELAR os Proximos Passos HOLOS ja registrados para a aplicacao (holos_next_steps,
--      imutavel) — a Sintese de um resultado salvo sai so do snapshot, nunca de dado vivo;
--    * "Compartilhar Proximos Passos com a paciente" (visao_paciente.proximos_passos, padrao DESLIGADO) fica
--      gravado no snapshot (visibilidade.proximos_passos).
--    Resultados salvos antes continuam template 1, intactos (sem backfill, sem recalculo, mesmo hash).
-- 2. Emissao imutavel do Resultado Final (holos_result_emissions): congela o Resultado HOLOS usado (id + hash),
--    a Conduta destinada a paciente, a identidade profissional (nome, CRN, logo, assinatura, carimbo), o template
--    e a data/hora; gera snapshot + sha256. O PDF de uma emissao reproduz sempre o mesmo conteudo.
-- 3. Correcao: convite de anamnese pre-consulta e apagado junto com a paciente (cascata), sem travar a exclusao.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1a. campos que o navegador pode mandar: + visao_paciente.proximos_passos (boolean, padrao false)
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_campos(payload jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'holoscan_application_id', payload->>'holoscan_application_id',
    'tool_application_ids', coalesce(payload->'tool_application_ids', '[]'::jsonb),
    'visao_paciente', jsonb_build_object(
      'ferramentas', coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb),
      'proximos_passos', coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb)));
$$;
revoke all on function public.resultado_holos_campos(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1b. ferramentas do snapshot (mesmas regras do template 1): lista de uuids sem repeticao, do mesmo paciente/profissional,
--     concluidas/revisadas, uma por ferramenta, do catalogo atual; copia integral + "mostrar ao paciente"
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_ferramentas(uid uuid, v_pid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tools jsonb := coalesce(payload->'tool_application_ids', '[]'::jsonb);
  v_vis jsonb := coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb);
  v_ids uuid[] := '{}'; v_id uuid; x text; n_tools int; n_ok int; n_ferr int; v_ferramentas jsonb; v_fontes jsonb;
begin
  if jsonb_typeof(v_tools) <> 'array' then raise exception 'lista de ferramentas invalida' using errcode = '22023', hint = 'payload_invalido'; end if;
  for x in select jsonb_array_elements_text(v_tools) loop
    begin v_id := x::uuid; exception when others then
      raise exception 'identificador de ferramenta invalido' using errcode = '22023', hint = 'payload_invalido'; end;
    if v_id = any(v_ids) then raise exception 'ferramenta repetida' using errcode = 'P0001', hint = 'fonte_repetida'; end if;
    v_ids := v_ids || v_id;
  end loop;
  n_tools := coalesce(array_length(v_ids, 1), 0);
  if n_tools > 9 then raise exception 'no maximo 9 ferramentas' using errcode = 'P0001', hint = 'payload_invalido'; end if;
  select count(*), count(distinct t.ferramenta_id) into n_ok, n_ferr from public.tool_applications t
    where t.id = any(v_ids) and t.patient_id = v_pid and t.nutritionist_id = uid;
  if n_ok <> n_tools then raise exception 'ferramenta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if n_ferr <> n_tools then raise exception 'escolha uma unica aplicacao por ferramenta' using errcode = 'P0001', hint = 'fonte_repetida'; end if;
  if exists (select 1 from public.tool_applications t where t.id = any(v_ids) and t.status not in ('concluida', 'revisada')) then
    raise exception 'ferramenta em rascunho nao entra no Resultado HOLOS' using errcode = 'P0001', hint = 'fonte_nao_consolidada';
  end if;
  if exists (select 1 from public.tool_applications t where t.id = any(v_ids) and t.ferramenta_id not in
      ('oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro', 'mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1')) then
    raise exception 'ferramenta fora do catalogo atual' using errcode = 'P0001', hint = 'fonte_invalida';
  end if;
  if jsonb_typeof(v_vis) <> 'object' then raise exception 'visibilidade invalida' using errcode = '22023', hint = 'payload_invalido'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'ferramenta_id', t.ferramenta_id, 'versao_ferramenta', t.versao_ferramenta, 'status', t.status,
      'iniciada_em', t.iniciada_em, 'concluida_em', t.concluida_em, 'encounter_id', t.encounter_id,
      'respostas', coalesce(t.respostas, '{}'::jsonb), 'leitura', t.leitura, 'prioridade', t.prioridade, 'proximo_passo', t.proximo_passo,
      'mostrar_paciente', coalesce((v_vis #>> array[t.id::text, 'mostrar'])::boolean, false), 'ocultar', '[]'::jsonb
    ) order by array_position(v_ids, t.id)), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('tipo', 'tool_application', 'id', t.id, 'updated_at', t.updated_at, 'status', t.status)
      order by array_position(v_ids, t.id)), '[]'::jsonb)
    into v_ferramentas, v_fontes from public.tool_applications t where t.id = any(v_ids);
  return jsonb_build_object('ferramentas', v_ferramentas, 'fontes', v_fontes);
end;
$$;
revoke all on function public.resultado_holos_ferramentas(uuid, uuid, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1c. Proximos Passos do snapshot: SO o registro imutavel ja existente (catalogo mais recente registrado). Nada e
--     calculado: sem registro, o snapshot diz isso (aplicacao anterior ao catalogo nao ganha recomendacao em silencio).
-- ----------------------------------------------------------------------------
create or replace function public.resultado_holos_proximos_passos(uid uuid, p_app uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare pp record;
begin
  select n.* into pp from public.holos_next_steps n
    where n.holoscan_application_id = p_app and n.nutritionist_id = uid order by n.catalog_version desc, n.created_at desc limit 1;
  if not found then return jsonb_build_object('registrado', false); end if;
  return jsonb_build_object('registrado', true, 'registro_id', pp.id, 'registrado_em', pp.created_at,
    'catalogo', jsonb_build_object('code', pp.catalog_code, 'version', pp.catalog_version, 'content_hash', pp.catalog_hash),
    'engine_version', pp.engine_version, 'content_hash', pp.content_hash,
    'systems_order', pp.systems_order, 'selection', pp.selection, 'motivo', pp.content_snapshot->'motivo');
end;
$$;
revoke all on function public.resultado_holos_proximos_passos(uuid, uuid) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1d. montagem do snapshot, template 2: igual ao template 1 + proximos_passos (registro congelado) + visibilidade
-- ----------------------------------------------------------------------------
create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid; pac record; enc record; app record; pk record;
  v_pp_vis jsonb := coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb);
  v_sistemas jsonb; v_ferr jsonb; v_prof text; v_pp jsonb;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  begin
    v_pid := (payload->>'patient_id')::uuid;
    v_eid := nullif(payload->>'encounter_id', '')::uuid;
    v_hid := nullif(payload->>'holoscan_application_id', '')::uuid;
  exception when others then
    raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido';
  end;
  if v_pid is null then raise exception 'paciente obrigatorio' using errcode = '22023', hint = 'payload_invalido'; end if;
  if jsonb_typeof(v_pp_vis) <> 'boolean' then raise exception 'compartilhamento invalido' using errcode = '22023', hint = 'payload_invalido'; end if;
  select p.id, p.nome, p.status into pac from public.patients p where p.id = v_pid and p.nutritionist_id = uid;
  if not found then raise exception 'paciente nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if pac.status = 'inativo' then
    raise exception 'paciente arquivado: reative antes de registrar novas informacoes' using errcode = 'P0001', hint = 'paciente_arquivado';
  end if;
  if v_eid is null then raise exception 'atendimento obrigatorio' using errcode = 'P0001', hint = 'atendimento_obrigatorio'; end if;
  select e.id, e.occurred_at, e.timezone, e.type, e.modality into enc
    from public.encounters e where e.id = v_eid and e.patient_id = v_pid and e.nutritionist_id = uid;
  if not found then raise exception 'atendimento de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if v_hid is null then raise exception 'HOLOSCAN obrigatorio' using errcode = 'P0001', hint = 'holoscan_obrigatorio'; end if;
  select a.* into app from public.holoscan_applications a where a.id = v_hid and a.patient_id = v_pid and a.nutritionist_id = uid;
  if not found then raise exception 'aplicacao HOLOSCAN de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if app.methodology_package_id is null or coalesce(app.calculation_mode, '') <> 'oficial' then
    raise exception 'aplicacao HOLOSCAN historica, sem pacote metodologico oficial' using errcode = 'P0001', hint = 'holoscan_nao_oficial';
  end if;
  select m.id, m.code, m.version, m.status, m.content_hash into pk from public.methodology_packages m where m.id = app.methodology_package_id;
  if not found or pk.status not in ('aprovado', 'retirado') then
    raise exception 'pacote metodologico da aplicacao nao esta aprovado' using errcode = 'P0001', hint = 'holoscan_nao_oficial';
  end if;
  v_ferr := public.resultado_holos_ferramentas(uid, v_pid, payload);
  v_sistemas := public.resultado_holos_sistemas(app.id, pk.id);
  v_pp := public.resultado_holos_proximos_passos(uid, app.id);
  select pr.nome into v_prof from public.profiles pr where pr.id = uid;
  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 2,
      'paciente', jsonb_build_object('id', pac.id, 'nome', pac.nome),
      'profissional', jsonb_build_object('nome', v_prof),
      'atendimento', jsonb_build_object('id', enc.id, 'occurred_at', enc.occurred_at, 'timezone', enc.timezone, 'type', enc.type, 'modality', enc.modality),
      'holoscan', jsonb_build_object(
        'id', app.id, 'quando', app.quando, 'registrado_em', app.created_at, 'encounter_id', app.encounter_id,
        'pacote', jsonb_build_object('id', pk.id, 'code', pk.code, 'version', pk.version, 'content_hash', pk.content_hash),
        'engine_version', app.engine_version, 'calculation_mode', app.calculation_mode,
        'cobertura', app.cobertura, 'indice', app.indice, 'indice_maximo', app.indice_maximo, 'avaliavel', app.avaliavel,
        'nota_media', app.nota_media, 'triada', app.triada, 'triada_com_dado', app.triada_com_dado,
        'interpretacao_texto', app.interpretacao_texto, 'sistemas', v_sistemas),
      'ferramentas', v_ferr->'ferramentas',
      'proximos_passos', v_pp,
      'visibilidade', jsonb_build_object('proximos_passos', v_pp_vis),
      'exames', jsonb_build_object('incluidos', false, 'nota', 'Exames e Leitura Integrada nao fazem parte desta versao do Resultado HOLOS.')
    ),
    'fontes', jsonb_build_object('holoscan', jsonb_build_object('id', app.id, 'updated_at', app.updated_at), 'ferramentas', v_ferr->'fontes',
      'proximos_passos', case when (v_pp->>'registrado') = 'true' then jsonb_build_object('id', v_pp->'registro_id', 'content_hash', v_pp->'content_hash') else null end),
    'pacote', jsonb_build_object('id', pk.id, 'version', pk.version, 'content_hash', pk.content_hash)
  );
end;
$$;
revoke all on function public.montar_resultado_holos(uuid, jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1e. salvar: igual ao anterior + grava template_version do snapshot (2 para os novos)
-- ----------------------------------------------------------------------------
create or replace function public.salvar_resultado_holos(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_id uuid; r record; m jsonb; conteudo jsonb; agora timestamptz := now(); h text; v_op uuid;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  begin v_op := nullif(payload->>'operation_id', '')::uuid; exception when others then
    raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_op is not null then
    select h2.id into v_id from public.holos_results h2 where h2.nutritionist_id = uid and h2.operation_id = v_op and h2.status <> 'rascunho';
    if found then return v_id; end if;
  end if;
  v_id := public.salvar_rascunho_resultado_holos(payload - 'operation_id');
  select h2.* into r from public.holos_results h2 where h2.id = v_id and h2.nutritionist_id = uid for update;
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', r.patient_id, 'encounter_id', r.encounter_id)
         || r.selected_sources);
  conteudo := (m->'conteudo') || jsonb_build_object(
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'supersedes_id', r.supersedes_id, 'salvo_em', agora),
    'observacoes', jsonb_build_object('leitura_profissional', r.leitura_profissional, 'pontos_acompanhar', r.pontos_acompanhar,
      'questoes_aprofundar', r.questoes_aprofundar));
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  update public.holos_results set status = 'salvo', content_snapshot = conteudo, source_snapshot = m->'fontes', content_hash = h,
    template_version = coalesce((conteudo->>'template_version')::int, 1),
    methodology_package_id = (m#>>'{pacote,id}')::uuid, methodology_package_version = (m#>>'{pacote,version}')::int,
    methodology_content_hash = m#>>'{pacote,content_hash}', saved_at = agora, operation_id = coalesce(v_op, r.operation_id)
    where id = v_id;
  if r.supersedes_id is not null then
    update public.holos_results set superseded_at = agora where id = r.supersedes_id and superseded_at is null;
  end if;
  return v_id;
end;
$$;
revoke all on function public.salvar_resultado_holos(jsonb) from public, anon;
grant execute on function public.salvar_resultado_holos(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 2. EMISSAO IMUTAVEL DO RESULTADO FINAL
-- ----------------------------------------------------------------------------
create table if not exists public.holos_result_emissions (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  holos_result_id       uuid not null,
  result_content_hash   text not null,
  conduct_id            uuid,
  emission_number       integer not null,
  template_version      text not null default 'RF-1',
  content_snapshot      jsonb not null,
  content_hash          text not null,
  operation_id          uuid,
  created_at            timestamptz not null default now(),
  constraint holos_result_emissions_numero check (emission_number >= 1),
  constraint holos_result_emissions_hash check (content_hash ~ '^[0-9a-f]{64}$' and result_content_hash ~ '^[0-9a-f]{64}$'),
  constraint holos_result_emissions_template check (template_version in ('RF-1')),
  constraint holos_result_emissions_tamanho check (pg_column_size(content_snapshot) <= 3145728),
  constraint holos_result_emissions_numero_unico unique (patient_id, emission_number),
  constraint holos_result_emissions_paciente_fk foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id) on delete restrict,
  constraint holos_result_emissions_resultado_fk foreign key (holos_result_id, patient_id, nutritionist_id)
    references public.holos_results (id, patient_id, nutritionist_id) on delete restrict,
  constraint holos_result_emissions_conduta_fk foreign key (conduct_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict
);
comment on table public.holos_result_emissions is
  'Emissao do Resultado Final para a paciente: congela Resultado HOLOS (id + hash), Conduta destinada a paciente, identidade profissional e imagens, template e data. Imutavel.';
create index if not exists holos_result_emissions_paciente on public.holos_result_emissions (patient_id, created_at desc);
create unique index if not exists holos_result_emissions_operacao on public.holos_result_emissions (nutritionist_id, operation_id) where operation_id is not null;

create or replace function public.proteger_emissao_resultado()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'emissao do Resultado Final e imutavel: gere uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel';
end;
$$;
revoke all on function public.proteger_emissao_resultado() from public, anon, authenticated;
drop trigger if exists holos_result_emissions_proteger on public.holos_result_emissions;
create trigger holos_result_emissions_proteger before update or delete on public.holos_result_emissions
  for each row execute function public.proteger_emissao_resultado();
drop trigger if exists holos_result_emissions_paciente_arquivado on public.holos_result_emissions;
create trigger holos_result_emissions_paciente_arquivado before insert on public.holos_result_emissions
  for each row execute function public.bloquear_escrita_paciente_arquivado();
do $$ begin
  if to_regprocedure('public.exigir_conta_ativa()') is not null then
    drop trigger if exists exigir_conta_ativa on public.holos_result_emissions;
    create trigger exigir_conta_ativa before insert or update or delete on public.holos_result_emissions
      for each statement execute function public.exigir_conta_ativa();
  end if;
end $$;

alter table public.holos_result_emissions enable row level security;
revoke all on public.holos_result_emissions from public, anon, authenticated;
grant select on public.holos_result_emissions to authenticated;
drop policy if exists holos_result_emissions_select_proprias on public.holos_result_emissions;
create policy holos_result_emissions_select_proprias on public.holos_result_emissions for select to authenticated
  using (nutritionist_id = (select auth.uid()));

-- imagem do Perfil congelada na emissao (data URL; o navegador le do Perfil e manda; ate ~700 KB cada)
create or replace function public.emissao_imagem_valida(p jsonb)
returns text language plpgsql immutable set search_path = '' as $$
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) <> 'string' or length(p #>> '{}') > 700000 or (p #>> '{}') !~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' then
    raise exception 'imagem invalida' using errcode = '22023', hint = 'imagem_invalida';
  end if;
  return p #>> '{}';
end;
$$;
revoke all on function public.emissao_imagem_valida(jsonb) from public, anon, authenticated;

-- payload: { holos_result_id, operation_id, imagens: { logo, assinatura, carimbo } }
-- O servidor congela: o Resultado HOLOS (salvo/revisado, nao substituido) por id + hash; a Conduta vigente mais recente
-- (consolidada) nos campos destinados a paciente + combinados; o Perfil (nome, profissao, CRN, especialidade, cidade,
-- contato, cores). A Sintese e a visibilidade vem do snapshot congelado do Resultado HOLOS (template RF-1).
create or replace function public.emitir_resultado_final(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_rid uuid; v_op uuid; r record; pac record; cd record; pr record; em record;
  v_acordos jsonb; v_conduta jsonb; v_img jsonb := coalesce(payload->'imagens', '{}'::jsonb);
  v_logo text; v_ass text; v_car text; v_num int; snap jsonb; h text; agora timestamptz := now();
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  begin
    v_rid := (payload->>'holos_result_id')::uuid;
    v_op := nullif(payload->>'operation_id', '')::uuid;
  exception when others then raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_rid is null then raise exception 'resultado obrigatorio' using errcode = '22023', hint = 'payload_invalido'; end if;
  if jsonb_typeof(v_img) <> 'object' then raise exception 'imagens invalidas' using errcode = '22023', hint = 'imagem_invalida'; end if;
  if v_op is not null then
    select e.* into em from public.holos_result_emissions e where e.nutritionist_id = uid and e.operation_id = v_op;
    if found then return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at); end if;
  end if;

  select h.* into r from public.holos_results h where h.id = v_rid and h.nutritionist_id = uid;
  if not found then raise exception 'resultado nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if r.status = 'rascunho' or r.content_snapshot is null then raise exception 'so Resultado HOLOS salvo e emitido' using errcode = 'P0001', hint = 'resultado_nao_finalizado'; end if;
  if r.superseded_at is not null then raise exception 'esta versao foi substituida: emita a versao atual' using errcode = 'P0001', hint = 'resultado_substituido'; end if;
  select p.id, p.nome, p.status into pac from public.patients p where p.id = r.patient_id and p.nutritionist_id = uid;
  if pac.status = 'inativo' then raise exception 'paciente arquivado: reative antes de registrar novas informacoes' using errcode = 'P0001', hint = 'paciente_arquivado'; end if;

  -- Conduta vigente: a consolidada mais recente (atendimento mais recente, maior revisao) — a mesma regra da tela
  select c.*, e.occurred_at as atendimento_em into cd from public.conducts c join public.encounters e on e.id = c.encounter_id
   where c.patient_id = r.patient_id and c.nutritionist_id = uid and c.status in ('salvo', 'revisado')
   order by e.occurred_at desc, c.revision_number desc limit 1;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object('description', a.description, 'due_text', a.due_text) order by a.position, a.created_at), '[]'::jsonb)
      into v_acordos from public.agreements a where a.conduct_id = cd.id and a.nutritionist_id = uid and length(btrim(a.description)) > 0;
    v_conduta := jsonb_build_object('id', cd.id, 'revision_number', cd.revision_number, 'encounter_id', cd.encounter_id, 'atendimento_em', cd.atendimento_em,
      'campos', jsonb_build_object('objective', cd.objective, 'nutrition_strategy', cd.nutrition_strategy, 'actions', cd.actions,
        'resources', cd.resources, 'professional_guidance', cd.professional_guidance, 'return_plan', cd.return_plan),
      'acordos', v_acordos);
  else
    v_conduta := null;
  end if;

  select p.nome, p.profissao, p.registro, p.especialidade, p.cidade, p.telefone, p.instagram, p.cor_primaria, p.cor_secundaria
    into pr from public.profiles p where p.id = uid;
  v_logo := public.emissao_imagem_valida(v_img->'logo');
  v_ass := public.emissao_imagem_valida(v_img->'assinatura');
  v_car := public.emissao_imagem_valida(v_img->'carimbo');

  select coalesce(max(e.emission_number), 0) + 1 into v_num from public.holos_result_emissions e where e.patient_id = r.patient_id;
  snap := jsonb_build_object(
    'template', 'RF-1',
    'emitida_em', agora,
    'emissao', jsonb_build_object('numero', v_num),
    'paciente', jsonb_build_object('id', pac.id, 'nome', pac.nome),
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'status', r.status, 'salvo_em', r.saved_at,
      'content_hash', r.content_hash, 'template_version', r.template_version),
    'conduta', v_conduta,
    'profissional', jsonb_build_object('nome', pr.nome, 'profissao', pr.profissao, 'registro', pr.registro, 'especialidade', pr.especialidade,
      'cidade', pr.cidade, 'telefone', pr.telefone, 'instagram', pr.instagram, 'cor_primaria', pr.cor_primaria, 'cor_secundaria', pr.cor_secundaria),
    'imagens', jsonb_build_object('logo', v_logo, 'assinatura', v_ass, 'carimbo', v_car));
  h := encode(sha256(convert_to(snap::text, 'UTF8')), 'hex');
  insert into public.holos_result_emissions (nutritionist_id, patient_id, holos_result_id, result_content_hash, conduct_id, emission_number,
      template_version, content_snapshot, content_hash, operation_id, created_at)
    values (uid, r.patient_id, r.id, r.content_hash, case when v_conduta is null then null else cd.id end, v_num, 'RF-1', snap, h, v_op, agora)
    returning * into em;
  return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at);
end;
$$;
revoke all on function public.emitir_resultado_final(jsonb) from public, anon;
grant execute on function public.emitir_resultado_final(jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. Convite de pre-anamnese: apagado na cascata da exclusao da paciente (antes travava a exclusao)
-- ----------------------------------------------------------------------------
create or replace function public.proteger_convite_anamnese()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    -- pg_trigger_depth() > 1: a exclusao vem da cascata da paciente (FK on delete cascade): permitida
    if pg_trigger_depth() > 1 then return old; end if;
    raise exception 'convite de anamnese nao e apagado: revogue' using errcode = 'P0001', hint = 'convite_imutavel';
  end if;
  if new.nutritionist_id is distinct from old.nutritionist_id or new.patient_id is distinct from old.patient_id
     or new.token_hash is distinct from old.token_hash or new.created_at is distinct from old.created_at
     or new.professional_snapshot is distinct from old.professional_snapshot then
    raise exception 'convite nao muda de dona, paciente ou token' using errcode = 'P0001', hint = 'convite_imutavel';
  end if;
  if old.status = 'concluido' and (new.submitted_content is distinct from old.submitted_content or new.submitted_at is distinct from old.submitted_at
     or new.status is distinct from old.status or new.draft_content is distinct from old.draft_content) then
    raise exception 'resposta enviada pela paciente e imutavel' using errcode = 'P0001', hint = 'convite_concluido';
  end if;
  if old.status = 'revogado' and (new.status is distinct from old.status or new.draft_content is distinct from old.draft_content
     or new.submitted_content is distinct from old.submitted_content) then
    raise exception 'convite revogado nao volta' using errcode = 'P0001', hint = 'convite_revogado';
  end if;
  return new;
end;
$$;
revoke all on function public.proteger_convite_anamnese() from public, anon, authenticated;

commit;
