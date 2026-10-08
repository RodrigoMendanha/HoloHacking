-- ============================================================================
-- RESULTADO HOLOS — visao integrada final do paciente (09/10/2026)
-- ============================================================================
-- Consolida, por SELECAO EXPLICITA da nutricionista:
--   * 1 aplicacao HOLOSCAN oficial (obrigatoria; pacote metodologico registrado);
--   * ferramentas concluidas/revisadas de Corpo, Mente e Espirito (0 a 9; uma por ferramenta);
--   * observacoes profissionais (leitura, pontos para acompanhar, questoes para aprofundar);
--   * chave "mostrar ao paciente" por ferramenta (desligada por padrao).
--
-- O navegador envia SO ids, textos da nutricionista e chaves de visibilidade. O SERVIDOR busca as
-- fontes reais, valida paciente / nutricionista / atendimento, monta o snapshot, calcula o sha256 e
-- grava. Depois de salvo, o resultado e IMUTAVEL (gatilho): correcao = nova revisao (supersedes_id).
--
-- Somente leitura das fontes: esta migration NAO altera HOLOSCAN, notas, faixas, Indice, Triade,
-- respostas, ferramentas, Leitura Integrada, exames nem pacotes metodologicos (HOLOS-V1@2 / LI-V1@2).
-- Sem IA, sem exames nesta versao.
-- ============================================================================

begin;

create table if not exists public.holos_results (
  id                         uuid primary key default gen_random_uuid(),
  nutritionist_id            uuid not null default auth.uid() references auth.users(id),
  patient_id                 uuid not null,
  encounter_id               uuid not null,
  status                     text not null default 'rascunho',
  revision_number            integer not null default 1,
  supersedes_id              uuid,
  superseded_at              timestamptz,
  holoscan_application_id    uuid not null,
  -- {holoscan_application_id, tool_application_ids[], visao_paciente:{ferramentas:{<id>:{mostrar:bool, ocultar:[]}}}}
  -- "ocultar" (lista de campos) fica reservado para a granularidade por item; nesta versao e sempre [].
  selected_sources           jsonb not null default '{}'::jsonb,
  leitura_profissional       text,
  pontos_acompanhar          text,
  questoes_aprofundar        text,
  content_snapshot           jsonb,
  source_snapshot            jsonb,
  content_hash               text,
  template_version           integer not null default 1,
  methodology_package_id     uuid,
  methodology_package_version integer,
  methodology_content_hash   text,
  operation_id               uuid,
  saved_at                   timestamptz,
  reviewed_at                timestamptz,
  reviewed_by                uuid,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint holos_results_status_valido check (status in ('rascunho', 'salvo', 'revisado')),
  constraint holos_results_revisao_positiva check (revision_number >= 1),
  constraint holos_results_salvo_completo check (status = 'rascunho' or (content_snapshot is not null and source_snapshot is not null
    and content_hash is not null and saved_at is not null and methodology_package_id is not null)),
  constraint holos_results_hash_formato check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  constraint holos_results_textos_tamanho check (coalesce(length(leitura_profissional), 0) <= 20000
    and coalesce(length(pontos_acompanhar), 0) <= 10000 and coalesce(length(questoes_aprofundar), 0) <= 10000),
  constraint holos_results_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint holos_results_patient_fk foreign key (patient_id, nutritionist_id)
    references public.patients(id, nutritionist_id) on delete restrict,
  constraint holos_results_encounter_fk foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters(id, patient_id, nutritionist_id) on delete restrict,
  constraint holos_results_supersedes_fk foreign key (supersedes_id, patient_id, nutritionist_id)
    references public.holos_results(id, patient_id, nutritionist_id) on delete restrict
);

comment on table public.holos_results is
  'Resultado HOLOS: snapshot integrado (HOLOSCAN oficial + ferramentas + observacoes) montado pelo servidor; imutavel depois de salvo.';

create index if not exists holos_results_patient_idx on public.holos_results (patient_id, created_at desc);
create index if not exists holos_results_encounter_idx on public.holos_results (encounter_id);
create index if not exists holos_results_holoscan_idx on public.holos_results (holoscan_application_id);
create unique index if not exists holos_results_operation_unique on public.holos_results (nutritionist_id, operation_id) where operation_id is not null;
-- cada versao tem no maximo UMA versao seguinte (historico linear)
create unique index if not exists holos_results_supersedes_unique on public.holos_results (supersedes_id) where supersedes_id is not null;

-- gatilhos: updated_at, paciente arquivado, imutabilidade da revisao consolidada, carimbo de revisao
drop trigger if exists holos_results_tocar_updated_at on public.holos_results;
create trigger holos_results_tocar_updated_at before update on public.holos_results
  for each row execute function public.tocar_updated_at();
drop trigger if exists holos_results_paciente_arquivado on public.holos_results;
create trigger holos_results_paciente_arquivado before insert or update on public.holos_results
  for each row execute function public.bloquear_escrita_paciente_arquivado();
drop trigger if exists holos_results_proteger_revisao on public.holos_results;
create trigger holos_results_proteger_revisao before update on public.holos_results
  for each row execute function public.proteger_revisao_consolidada();
drop trigger if exists holos_results_carimbar_revisao on public.holos_results;
create trigger holos_results_carimbar_revisao before insert or update on public.holos_results
  for each row execute function public.carimbar_revisao();

-- identidade nunca muda (nem no rascunho) e resultado consolidado nunca e apagado
create or replace function public.proteger_identidade_resultado_holos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'resultado HOLOS salvo nao e apagado' using errcode = 'P0001', hint = 'revisao_imutavel';
    end if;
    return old;
  end if;
  if new.nutritionist_id <> old.nutritionist_id or new.patient_id <> old.patient_id or new.created_at <> old.created_at
     or new.revision_number <> old.revision_number or new.supersedes_id is distinct from old.supersedes_id then
    raise exception 'resultado HOLOS nao muda de paciente, profissional ou versao' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists holos_results_proteger_identidade on public.holos_results;
create trigger holos_results_proteger_identidade before update or delete on public.holos_results
  for each row execute function public.proteger_identidade_resultado_holos();

-- RLS: so a propria nutricionista le; escrita SO pelas funcoes abaixo
alter table public.holos_results enable row level security;
drop policy if exists holos_results_select_proprios on public.holos_results;
create policy holos_results_select_proprios on public.holos_results for select to authenticated
  using (nutritionist_id = (select auth.uid()));
revoke all on public.holos_results from public, anon, authenticated;
grant select on public.holos_results to authenticated;

-- ----------------------------------------------------------------------------
-- MONTAGEM DO SNAPSHOT (so leitura). Recebe o uid do chamador; valida tudo; devolve
-- {conteudo, fontes, pacote:{id,version,content_hash}}. Nada do conteudo clinico vem do payload.
-- ----------------------------------------------------------------------------
create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid;
  pac record; enc record; app record; pk record;
  v_tools jsonb := coalesce(payload->'tool_application_ids', '[]'::jsonb);
  v_vis jsonb := coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb);
  v_ids uuid[] := '{}'; v_id uuid; x text;
  n_tools int; n_ok int; n_ferr int;
  v_sistemas jsonb; v_ferramentas jsonb; v_fontes jsonb; v_prof text;
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

  -- ferramentas: lista de uuids, sem repeticao, todas do mesmo paciente/profissional, concluidas/revisadas, uma por ferramenta
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

  -- HOLOSCAN: notas/faixas SALVAS (nada recalculado) + textos oficiais do pacote + respostas que pontuaram / contexto
  select coalesce(jsonb_agg(jsonb_build_object(
      'sistema', s.sistema, 'nome', s.nome, 'nota', s.nota, 'carga', s.carga, 'faixa', s.faixa, 'obtido', s.obtido, 'maximo', s.maximo,
      'respondidos', s.respondidos, 'total_marcadores', s.total_marcadores, 'avaliavel', s.avaliavel,
      'texto_publico', ms.public_text,
      'mensagem_nutri', (select r.message_nutri from public.methodology_ranges r where r.package_id = pk.id and r.destination_type = 'system'
                          and r.destination_id = s.sistema and r.label = s.faixa limit 1),
      'mensagem_paciente', (select r.message_paciente from public.methodology_ranges r where r.package_id = pk.id and r.destination_type = 'system'
                          and r.destination_id = s.sistema and r.label = s.faixa limit 1),
      'pontuou', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.stable_id, 'enunciado', q.statement, 'valor', ans.valor,
                    'resposta', q.response_labels->>(ans.valor::int), 'peso', ma.weight) order by q.position nulls last, q.stable_id), '[]'::jsonb)
                  from public.methodology_associations ma
                  join public.methodology_questions q on q.package_id = ma.package_id and q.stable_id = ma.question_stable_id
                  join public.holoscan_answers ans on ans.application_id = app.id and ans.marcador_id = ma.question_stable_id
                  where ma.package_id = pk.id and ma.destination_type = 'system' and ma.destination_id = s.sistema and ma.role = 'primaria'),
      'contexto', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.stable_id, 'enunciado', q.statement, 'valor', ans.valor,
                    'resposta', q.response_labels->>(ans.valor::int)) order by q.position nulls last, q.stable_id), '[]'::jsonb)
                  from public.methodology_associations ma
                  join public.methodology_questions q on q.package_id = ma.package_id and q.stable_id = ma.question_stable_id
                  join public.holoscan_answers ans on ans.application_id = app.id and ans.marcador_id = ma.question_stable_id
                  where ma.package_id = pk.id and ma.destination_type = 'system' and ma.destination_id = s.sistema and ma.role = 'secondary_contextual')
    ) order by coalesce(ms.position, 99), s.sistema), '[]'::jsonb)
    into v_sistemas
    from public.holoscan_system_scores s
    left join public.methodology_systems ms on ms.package_id = pk.id and ms.code = s.sistema
    where s.application_id = app.id;

  -- ferramentas: copia integral do registro no momento do salvamento (mudancas futuras nao alcancam o snapshot)
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'ferramenta_id', t.ferramenta_id, 'versao_ferramenta', t.versao_ferramenta, 'status', t.status,
      'iniciada_em', t.iniciada_em, 'concluida_em', t.concluida_em, 'encounter_id', t.encounter_id,
      'respostas', coalesce(t.respostas, '{}'::jsonb), 'leitura', t.leitura, 'prioridade', t.prioridade, 'proximo_passo', t.proximo_passo,
      'mostrar_paciente', coalesce((v_vis #>> array[t.id::text, 'mostrar'])::boolean, false),
      'ocultar', '[]'::jsonb
    ) order by array_position(v_ids, t.id)), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('tipo', 'tool_application', 'id', t.id, 'updated_at', t.updated_at, 'status', t.status)
      order by array_position(v_ids, t.id)), '[]'::jsonb)
    into v_ferramentas, v_fontes
    from public.tool_applications t where t.id = any(v_ids);

  select pr.nome into v_prof from public.profiles pr where pr.id = uid;

  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 1,
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
      'ferramentas', v_ferramentas,
      'exames', jsonb_build_object('incluidos', false, 'nota', 'Exames e Leitura Integrada nao fazem parte desta versao do Resultado HOLOS.')
    ),
    'fontes', jsonb_build_object('holoscan', jsonb_build_object('id', app.id, 'updated_at', app.updated_at), 'ferramentas', v_fontes),
    'pacote', jsonb_build_object('id', pk.id, 'version', pk.version, 'content_hash', pk.content_hash)
  );
end;
$$;
revoke all on function public.montar_resultado_holos(uuid, jsonb) from public, anon, authenticated;

-- campos que o navegador pode mandar (e nada mais)
create or replace function public.resultado_holos_campos(payload jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'holoscan_application_id', payload->>'holoscan_application_id',
    'tool_application_ids', coalesce(payload->'tool_application_ids', '[]'::jsonb),
    'visao_paciente', jsonb_build_object('ferramentas', coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb)));
$$;
revoke all on function public.resultado_holos_campos(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- PREVIA (nao grava): o mesmo snapshot que o servidor gravaria agora
-- ----------------------------------------------------------------------------
create or replace function public.previa_resultado_holos(payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  return public.montar_resultado_holos(uid, payload) -> 'conteudo';
end;
$$;

-- ----------------------------------------------------------------------------
-- RASCUNHO: guarda selecao, textos e visibilidade. Valida tudo (mesmas regras do salvar).
-- ----------------------------------------------------------------------------
create or replace function public.salvar_rascunho_resultado_holos(payload jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_id uuid; atual record; anterior record; v_op uuid; v_sup uuid; v_rev int := 1; m jsonb;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  m := public.montar_resultado_holos(uid, payload);   -- valida paciente, atendimento, HOLOSCAN e ferramentas
  begin v_op := nullif(payload->>'operation_id', '')::uuid; v_id := nullif(payload->>'id', '')::uuid; v_sup := nullif(payload->>'supersedes_id', '')::uuid;
  exception when others then raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_op is not null then
    select h.id into v_id from public.holos_results h where h.nutritionist_id = uid and h.operation_id = v_op;
    if found then return v_id; end if;
  end if;
  if v_id is not null then
    select h.* into atual from public.holos_results h where h.id = v_id and h.nutritionist_id = uid for update;
    if not found then raise exception 'rascunho nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if atual.status <> 'rascunho' then raise exception 'resultado salvo e imutavel: crie uma nova versao' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
    if atual.patient_id <> (payload->>'patient_id')::uuid then raise exception 'rascunho de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if payload ? 'expected_updated_at' and nullif(payload->>'expected_updated_at', '') is not null
       and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho mudou em outra sessao' using errcode = 'P0001', hint = 'conflito';
    end if;
    update public.holos_results set encounter_id = (payload->>'encounter_id')::uuid,
      holoscan_application_id = (payload->>'holoscan_application_id')::uuid, selected_sources = public.resultado_holos_campos(payload),
      leitura_profissional = nullif(payload->>'leitura_profissional', ''), pontos_acompanhar = nullif(payload->>'pontos_acompanhar', ''),
      questoes_aprofundar = nullif(payload->>'questoes_aprofundar', '')
      where id = v_id;
    return v_id;
  end if;
  if v_sup is not null then
    select h.* into anterior from public.holos_results h where h.id = v_sup and h.nutritionist_id = uid and h.patient_id = (payload->>'patient_id')::uuid;
    if not found then raise exception 'versao anterior nao encontrada' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if anterior.status = 'rascunho' then raise exception 'so se cria nova versao a partir de resultado salvo' using errcode = 'P0001', hint = 'payload_invalido'; end if;
    if anterior.superseded_at is not null or exists (select 1 from public.holos_results h where h.supersedes_id = v_sup) then
      raise exception 'esta versao ja tem uma versao seguinte' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_rev := anterior.revision_number + 1;
  end if;
  insert into public.holos_results (nutritionist_id, patient_id, encounter_id, status, revision_number, supersedes_id,
      holoscan_application_id, selected_sources, leitura_profissional, pontos_acompanhar, questoes_aprofundar, operation_id)
    values (uid, (payload->>'patient_id')::uuid, (payload->>'encounter_id')::uuid, 'rascunho', v_rev, v_sup,
      (payload->>'holoscan_application_id')::uuid, public.resultado_holos_campos(payload), nullif(payload->>'leitura_profissional', ''),
      nullif(payload->>'pontos_acompanhar', ''), nullif(payload->>'questoes_aprofundar', ''), v_op)
    returning id into v_id;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- SALVAR: grava o rascunho (com o que veio agora) e CONGELA: snapshot montado no servidor + sha256.
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
    if found then return v_id; end if;   -- clique duplo / repeticao: devolve o mesmo resultado salvo
  end if;
  -- o operation_id do salvar nao pode colidir com o do rascunho: o rascunho e gravado sem ele
  v_id := public.salvar_rascunho_resultado_holos(payload - 'operation_id');
  select h2.* into r from public.holos_results h2 where h2.id = v_id and h2.nutritionist_id = uid for update;
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', r.patient_id, 'encounter_id', r.encounter_id)
         || r.selected_sources);   -- o snapshot sai do que esta GRAVADO, nunca do conteudo do navegador
  conteudo := (m->'conteudo') || jsonb_build_object(
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'supersedes_id', r.supersedes_id, 'salvo_em', agora),
    'observacoes', jsonb_build_object('leitura_profissional', r.leitura_profissional, 'pontos_acompanhar', r.pontos_acompanhar,
      'questoes_aprofundar', r.questoes_aprofundar));
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  update public.holos_results set status = 'salvo', content_snapshot = conteudo, source_snapshot = m->'fontes', content_hash = h,
    methodology_package_id = (m#>>'{pacote,id}')::uuid, methodology_package_version = (m#>>'{pacote,version}')::int,
    methodology_content_hash = m#>>'{pacote,content_hash}', saved_at = agora, operation_id = coalesce(v_op, r.operation_id)
    where id = v_id;
  if r.supersedes_id is not null then
    update public.holos_results set superseded_at = agora where id = r.supersedes_id and superseded_at is null;
  end if;
  return v_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- REVISAR: salvo -> revisado (quem e quando: carimbo do servidor). Nada mais muda.
-- ----------------------------------------------------------------------------
create or replace function public.revisar_resultado_holos(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  select h.* into r from public.holos_results h where h.id = p_id and h.nutritionist_id = uid for update;
  if not found then raise exception 'resultado nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if r.status <> 'salvo' then raise exception 'so um resultado salvo pode ser marcado como revisado' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
  update public.holos_results set status = 'revisado' where id = p_id;
  return p_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- DESCARTAR RASCUNHO (resultado salvo nunca e apagado)
-- ----------------------------------------------------------------------------
create or replace function public.descartar_rascunho_resultado_holos(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  delete from public.holos_results h where h.id = p_id and h.nutritionist_id = uid and h.status = 'rascunho';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'rascunho nao encontrado (resultado salvo nao e apagado)' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
  return true;
end;
$$;

revoke all on function public.previa_resultado_holos(jsonb) from public, anon;
revoke all on function public.salvar_rascunho_resultado_holos(jsonb) from public, anon;
revoke all on function public.salvar_resultado_holos(jsonb) from public, anon;
revoke all on function public.revisar_resultado_holos(uuid) from public, anon;
revoke all on function public.descartar_rascunho_resultado_holos(uuid) from public, anon;
grant execute on function public.previa_resultado_holos(jsonb) to authenticated;
grant execute on function public.salvar_rascunho_resultado_holos(jsonb) to authenticated;
grant execute on function public.salvar_resultado_holos(jsonb) to authenticated;
grant execute on function public.revisar_resultado_holos(uuid) to authenticated;
grant execute on function public.descartar_rascunho_resultado_holos(uuid) to authenticated;

commit;
