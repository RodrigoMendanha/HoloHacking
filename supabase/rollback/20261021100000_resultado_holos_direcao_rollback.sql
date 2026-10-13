-- ROLLBACK do BANCO da migration 20261021100000_resultado_holos_direcao (Resultado HOLOS template 5).
-- Usar SO se o front tiver voltado para a versao anterior e o banco precisar voltar junto.
-- O que faz: devolve as 4 RPCs do Resultado HOLOS EXATAMENTE ao corpo que estava em producao antes do deploy
-- (conferido em 13/10 pelo md5 do corpo: montar 0212c43e, emitir a2a795a5, salvar 36c6f679, rascunho 9038d38b).
-- O que NAO faz (de proposito, para nao perder nada): nao apaga a coluna holos_results.direcao, nao apaga Resultados
-- template 5 ja salvos nem emissoes RF-3 (a constraint continua aceitando RF-3), nao apaga as funcoes auxiliares novas
-- (ficam sem uso). Resultados template 5 salvos continuam abrindo no front novo; o front antigo os mostra como os demais.
begin;
drop function if exists public.montar_resultado_holos(uuid, jsonb);
do $$ begin
  if to_regprocedure('public.montar_resultado_holos_t4(uuid, jsonb)') is not null then
    alter function public.montar_resultado_holos_t4(uuid, jsonb) rename to montar_resultado_holos;
  end if;
end $$;

-- montar_resultado_holos (de supabase/migrations/20261019100000_motor_resultados_v1.sql)
create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid; pac record; enc record; app record; pk record;
  v_pp_vis jsonb := coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb);
  v_sistemas jsonb; v_ferr jsonb; v_prof text; v_pp jsonb; v_pend jsonb; v_oq3 jsonb; v_pqq jsonb; v_mapa jsonb;
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
  -- MR-V1 (item 23): Mapa do Proposito DERIVADO de OQ3 + PQQ (a unica relacao ferramenta -> ferramenta homologada),
  -- com a referencia das aplicacoes fonte. Mesmo criterio de FerramentasFechamento.propositoDisponivel: OQ3 com quer,
  -- precisa ou consegue; PQQ com objetivo, algum nivel ou a sintese. Fica em 'derivados', separado das respostas.
  select t into v_oq3 from jsonb_array_elements(v_ferr->'ferramentas') t where t->>'ferramenta_id' = 'oq3' limit 1;
  select t into v_pqq from jsonb_array_elements(v_ferr->'ferramentas') t where t->>'ferramenta_id' = 'pqq' limit 1;
  if v_oq3 is not null and v_pqq is not null
     and (coalesce(btrim(v_oq3#>>'{respostas,quer}'), '') <> '' or coalesce(btrim(v_oq3#>>'{respostas,precisa}'), '') <> '' or coalesce(btrim(v_oq3#>>'{respostas,consegue}'), '') <> '')
     and (coalesce(btrim(v_pqq#>>'{respostas,objetivo}'), '') <> '' or coalesce(btrim(v_pqq#>>'{respostas,verdadeiro}'), '') <> ''
          or exists (select 1 from unnest(array['r1','r2','r3','r4','r5']) k where coalesce(btrim(v_pqq->'respostas'->>k), '') <> '')) then
    v_mapa := jsonb_build_object('ferramenta_id', 'mapa', 'motor', 'MR-V1', 'regra', 'OQ3+PQQ', 'opcional', true,
      'fontes', jsonb_build_array(
        jsonb_build_object('ferramenta_id', 'oq3', 'id', v_oq3->'id', 'concluida_em', v_oq3->'concluida_em'),
        jsonb_build_object('ferramenta_id', 'pqq', 'id', v_pqq->'id', 'concluida_em', v_pqq->'concluida_em')),
      'campos', jsonb_build_object('quer', v_oq3#>'{respostas,quer}', 'importa', v_pqq#>'{respostas,verdadeiro}',
        'sustenta', v_oq3#>'{respostas,consegue}', 'direcao', v_pqq#>'{respostas,objetivo}'));
  end if;
  -- template 4: os sinais dominantes reais de cada sistema (texto aprovado da pergunta)
  select coalesce(jsonb_agg(x.s || jsonb_build_object('dominantes', public.resultado_holos_dominantes(app.id, pk.id, x.s->>'sistema')) order by x.n), '[]'::jsonb)
    into v_sistemas from jsonb_array_elements(v_sistemas) with ordinality as x(s, n);
  v_pp := public.resultado_holos_proximos_passos(uid, app.id);
  -- template 3: o que ainda nao foi feito no atendimento (o registro original continua congelado ao lado)
  v_pend := public.proximos_passos_pendentes(uid, app.id, array[enc.id, app.encounter_id]);
  if v_pend is not null then v_pp := v_pp || jsonb_build_object('pendentes', v_pend); end if;
  select pr.nome into v_prof from public.profiles pr where pr.id = uid;
  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 4,
      'motor_resultados', 'MR-V1',
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
      'derivados', jsonb_build_object('mapa_proposito', v_mapa),
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

-- salvar_rascunho_resultado_holos (de supabase/migrations/20261009100000_resultado_holos.sql)
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

-- salvar_resultado_holos (de supabase/migrations/20261015100000_resultado_final_holos.sql)
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

-- emitir_resultado_final (de supabase/migrations/20261019100000_motor_resultados_v1.sql)
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

  -- RF-2 (motor de resultados V1, item 4.6): a Conduta do ATENDIMENTO DO RESULTADO (a consolidada de maior revisao
  -- desse atendimento) — nunca a de outro atendimento. Sem Conduta consolidada nele, a emissao sai sem Conduta.
  select c.*, e.occurred_at as atendimento_em into cd from public.conducts c join public.encounters e on e.id = c.encounter_id
   where c.patient_id = r.patient_id and c.nutritionist_id = uid and c.status in ('salvo', 'revisado') and c.encounter_id = r.encounter_id
   order by c.revision_number desc limit 1;
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
    'template', 'RF-2',
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
    values (uid, r.patient_id, r.id, r.content_hash, case when v_conduta is null then null else cd.id end, v_num, 'RF-2', snap, h, v_op, agora)
    returning * into em;
  return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at);
end;
$$;

revoke all on function public.montar_resultado_holos(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.salvar_rascunho_resultado_holos(jsonb) from public, anon;
grant execute on function public.salvar_rascunho_resultado_holos(jsonb) to authenticated;
revoke all on function public.salvar_resultado_holos(jsonb) from public, anon;
grant execute on function public.salvar_resultado_holos(jsonb) to authenticated;
revoke all on function public.emitir_resultado_final(jsonb) from public, anon;
grant execute on function public.emitir_resultado_final(jsonb) to authenticated;
commit;
