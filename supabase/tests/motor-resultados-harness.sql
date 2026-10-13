-- Harness MOTOR DE RESULTADOS V1 (migration 20261019100000, 12/10): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration. Paciente, atendimentos, HOLOSCAN e Conduta ficticios. Nada persiste.
--   MR01 Resultado HOLOS novo: template 4, motor de resultados MR-V1, sinais dominantes em cada sistema (ate 3, texto aprovado)
--   MR02 os dominantes do Resultado = os dos Proximos Passos registrados (mesma conta, mesma ordem)
--   MR03 a montagem nao muda HOLOSCAN (notas, faixas, Indice, Triade, cobertura), catalogo nem Proximos Passos; resultados antigos intactos
--   MR04 emissao RF-2: a Conduta e a do ATENDIMENTO DO RESULTADO, mesmo havendo Conduta mais recente em outro atendimento
--   MR05 emissao RF-2 sem Conduta no atendimento do resultado: sai sem Conduta (nunca a de outro atendimento)
--   MR06 relatorio emitido: texto da metodologia pelo estado real do pacote (sem "nao homologado")
--   MR07 Mapa do Proposito derivado (OQ3 + PQQ) no snapshot, em 'derivados', com as aplicacoes fonte; so OQ3 -> nada
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _mr (k text primary key, v text) on commit drop;
create temp table _logmr (n serial, passo text) on commit drop;
grant select, insert, update on _mr, _logmr to authenticated;
grant usage on sequence _logmr_n_seq to authenticated;
insert into _mr values
  ('holo_antes', (select coalesce(md5(string_agg(s.application_id::text || s.sistema || coalesce(s.nota::text, '') || coalesce(s.faixa, ''), ',' order by s.application_id, s.sistema)), '') from public.holoscan_system_scores s)),
  ('app_antes', (select coalesce(md5(string_agg(a.id::text || coalesce(a.indice::text, '') || coalesce(a.triada::text, '') || coalesce(a.cobertura::text, '') || coalesce(a.triada_com_dado::text, ''), ',' order by a.id)), '') from public.holoscan_applications a)),
  ('pp_antes', (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_next_steps)),
  ('rh_antes', (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || template_version, ',' order by id)), '') from public.holos_results)),
  ('cat_antes', (select coalesce(md5(string_agg(system_id || rank || tool_id, ',' order by system_id, rank)), '') from public.holos_recommendation_rules));
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); p uuid; e uuid; e2 uuid; h uuid; r uuid; snap jsonb; ok_dom boolean; reg jsonb;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'MR TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now() - interval '10 days') returning id into e;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e2;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, p, e, current_date));
  reg := public.registrar_proximos_passos(h);
  r := public.salvar_resultado_holos(jsonb_build_object('patient_id', p, 'encounter_id', e, 'holoscan_application_id', h, 'tool_application_ids', '[]'::jsonb,
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false)));
  insert into _mr values ('p', p::text), ('e', e::text), ('e2', e2::text), ('h', h::text), ('r', r::text);
  select content_snapshot into snap from public.holos_results where id = r;
  select bool_and(jsonb_typeof(s->'dominantes') = 'array' and jsonb_array_length(s->'dominantes') <= 3
           and not exists (select 1 from jsonb_array_elements(s->'dominantes') d
                           where (d->>'pontos')::numeric <= 0
                              or d->>'enunciado' is distinct from (select q.statement from public.methodology_questions q where q.package_id = mp and q.stable_id = d->>'question_id')))
    into ok_dom from jsonb_array_elements(snap#>'{holoscan,sistemas}') s;
  insert into _logmr (passo) select 'MR01 ' || case when (snap->>'template_version')::int = 4 and snap->>'motor_resultados' = 'MR-V1' and ok_dom
      and (select template_version from public.holos_results where id = r) = 4
      and exists (select 1 from jsonb_array_elements(snap#>'{holoscan,sistemas}') s where jsonb_array_length(s->'dominantes') > 0)
    then 'ok' else 'FALHOU: ' || left(snap::text, 200) end || ': Resultado HOLOS novo = template 4, motor MR-V1, sinais dominantes reais por sistema (ate 3, texto aprovado da pergunta)';
  insert into _logmr (passo) select 'MR02 ' || case when not exists (
      select 1 from jsonb_array_elements(snap#>'{holoscan,sistemas}') s
      join jsonb_array_elements(snap#>'{proximos_passos,systems_order}') o on o->>'system_id' = s->>'sistema'
      where (select coalesce(string_agg(d->>'question_id', ',' order by n), '') from jsonb_array_elements(s->'dominantes') with ordinality as x(d, n))
         <> (select coalesce(string_agg(d->>'question_id', ',' order by n), '') from jsonb_array_elements(o->'dominantes') with ordinality as x(d, n)))
      and jsonb_array_length(snap#>'{proximos_passos,systems_order}') > 0
    then 'ok' else 'FALHOU' end || ': os dominantes do Resultado sao os mesmos (e na mesma ordem) dos Proximos Passos registrados';
end $$;

reset role;
insert into _logmr (passo) select 'MR03 ' || case when
    (select coalesce(md5(string_agg(s.application_id::text || s.sistema || coalesce(s.nota::text, '') || coalesce(s.faixa, ''), ',' order by s.application_id, s.sistema)), '') from public.holoscan_system_scores s
      where s.application_id <> (select v::uuid from _mr where k = 'h')) = (select v from _mr where k = 'holo_antes')
    and (select coalesce(md5(string_agg(system_id || rank || tool_id, ',' order by system_id, rank)), '') from public.holos_recommendation_rules) = (select v from _mr where k = 'cat_antes')
    and (select coalesce(md5(string_agg(a.id::text || coalesce(a.indice::text, '') || coalesce(a.triada::text, '') || coalesce(a.cobertura::text, '') || coalesce(a.triada_com_dado::text, ''), ',' order by a.id)), '') from public.holoscan_applications a
      where a.patient_id not in (select p.id from public.patients p where p.nome like 'MR TESTE FICTICIO%')) = (select v from _mr where k = 'app_antes')
    and (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_next_steps where holoscan_application_id <> (select v::uuid from _mr where k = 'h')) = (select v from _mr where k = 'pp_antes')
    and (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || template_version, ',' order by id)), '') from public.holos_results where patient_id <> (select v::uuid from _mr where k = 'p')) = (select v from _mr where k = 'rh_antes')
  then 'ok' else 'FALHOU' end || ': HOLOSCAN (notas/faixas, Indice, Triade, cobertura), catalogo, Proximos Passos e Resultados HOLOS anteriores intactos';

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare uid uuid := auth.uid(); p uuid := (select v::uuid from _mr where k = 'p'); e uuid := (select v::uuid from _mr where k = 'e'); e2 uuid := (select v::uuid from _mr where k = 'e2');
  r uuid := (select v::uuid from _mr where k = 'r'); em jsonb; s jsonb; p2 uuid; e3 uuid; h2 uuid; r2 uuid; em2 jsonb; s2 jsonb; mp uuid := (select v::uuid from _ho where k = 'mp'); rel uuid; met text;
begin
  insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, objective) values (uid, p, e, 1, 'salvo', 'OBJ_DO_ATENDIMENTO_DO_RESULTADO');
  insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, objective) values (uid, p, e2, 1, 'salvo', 'OBJ_DE_OUTRO_ATENDIMENTO_MAIS_RECENTE');
  em := public.emitir_resultado_final(jsonb_build_object('holos_result_id', r));
  select content_snapshot into s from public.holos_result_emissions where id = (em->>'id')::uuid;
  insert into _logmr (passo) select 'MR04 ' || case when s->>'template' = 'RF-2' and s#>>'{conduta,campos,objective}' = 'OBJ_DO_ATENDIMENTO_DO_RESULTADO'
      and (select template_version from public.holos_result_emissions where id = (em->>'id')::uuid) = 'RF-2'
    then 'ok' else 'FALHOU: ' || coalesce(s#>>'{conduta,campos,objective}', 'sem conduta') end || ': emissao RF-2 com a Conduta do atendimento do resultado (nao a mais recente de outro atendimento)';
  -- resultado de um atendimento SEM Conduta: a emissao sai sem Conduta
  insert into public.patients (nutritionist_id, nome) values (uid, 'MR TESTE FICTICIO 2') returning id into p2;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p2, now() - interval '5 days') returning id into e3;
  h2 := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, p2, e3, current_date));
  r2 := public.salvar_resultado_holos(jsonb_build_object('patient_id', p2, 'encounter_id', e3, 'holoscan_application_id', h2, 'tool_application_ids', '[]'::jsonb,
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false)));
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p2, now()) returning id into e3;
  insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, objective) values (uid, p2, e3, 1, 'salvo', 'OBJ_OUTRO');
  em2 := public.emitir_resultado_final(jsonb_build_object('holos_result_id', r2));
  select content_snapshot into s2 from public.holos_result_emissions where id = (em2->>'id')::uuid;
  insert into _logmr (passo) select 'MR05 ' || case when s2->'conduta' = 'null'::jsonb
      and (select conduct_id from public.holos_result_emissions where id = (em2->>'id')::uuid) is null
    then 'ok' else 'FALHOU: ' || coalesce(s2->>'conduta', '') end || ': sem Conduta no atendimento do resultado, a emissao sai sem Conduta (nunca a de outro atendimento)';
  -- relatorio com HOLOSCAN oficial: texto pelo estado real do pacote
  rel := public.emitir_relatorio(jsonb_build_object('patient_id', p, 'title', 'MR relatorio', 'selected_sources', jsonb_build_object('holoscan_application_ids', jsonb_build_array((select v from _mr where k = 'h')))));
  select content_snapshot->>'metodologia' into met from public.report_emissions where id = rel;
  insert into _logmr (passo) select 'MR06 ' || case when met like 'Aplicações HOLOSCAN calculadas pelo pacote metodológico oficial aprovado (HOLOS-V1 v%' and met not like '%não homologado%'
    then 'ok' else 'FALHOU: ' || coalesce(met, '') end || ': relatorio emitido diz o estado real do pacote (aprovado), sem "nao homologado"';
end $$;

do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); p uuid; e uuid; h uuid; t1 uuid; t2 uuid; r1 uuid; r2 uuid; s1 jsonb; s2 jsonb;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'MR TESTE FICTICIO 3') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now() - interval '2 days') returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, p, e, current_date));
  insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
    values (uid, p, e, 'oq3', '1', 'concluida', '{"quer":"QUER_FICTICIO","precisa":"PRECISA_FICTICIO","consegue":"CONSEGUE_FICTICIO"}', now(), now()) returning id into t1;
  r1 := public.salvar_resultado_holos(jsonb_build_object('patient_id', p, 'encounter_id', e, 'holoscan_application_id', h, 'tool_application_ids', jsonb_build_array(t1),
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false)));
  select content_snapshot into s1 from public.holos_results where id = r1;
  insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
    values (uid, p, e, 'pqq', '1', 'concluida', '{"objetivo":"OBJETIVO_FICTICIO","r1":"N1","verdadeiro":"SINTESE_FICTICIA"}', now(), now()) returning id into t2;
  r2 := public.salvar_resultado_holos(jsonb_build_object('patient_id', p, 'encounter_id', e, 'holoscan_application_id', h, 'tool_application_ids', jsonb_build_array(t1, t2),
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false), 'base_result_id', r1));
  select content_snapshot into s2 from public.holos_results where id = r2;
  insert into _logmr (passo) select 'MR07 ' || case when s1#>'{derivados,mapa_proposito}' = 'null'::jsonb
      and s2#>>'{derivados,mapa_proposito,motor}' = 'MR-V1' and s2#>>'{derivados,mapa_proposito,regra}' = 'OQ3+PQQ'
      and s2#>>'{derivados,mapa_proposito,fontes,0,id}' = t1::text and s2#>>'{derivados,mapa_proposito,fontes,1,id}' = t2::text
      and s2#>>'{derivados,mapa_proposito,campos,quer}' = 'QUER_FICTICIO' and s2#>>'{derivados,mapa_proposito,campos,importa}' = 'SINTESE_FICTICIA'
      and s2#>>'{derivados,mapa_proposito,campos,sustenta}' = 'CONSEGUE_FICTICIO' and s2#>>'{derivados,mapa_proposito,campos,direcao}' = 'OBJETIVO_FICTICIO'
      and not (s2->'ferramentas' @> '[{"ferramenta_id":"mapa"}]')
    then 'ok' else 'FALHOU: ' || coalesce(left((s1->'derivados')::text, 100), 'sem derivados') || ' | ' || coalesce(left((s2->'derivados')::text, 300), '') end
    || ': Mapa do Proposito derivado de OQ3 + PQQ no snapshot (derivados, motor MR-V1, fontes = as duas aplicacoes); so OQ3 -> sem mapa; respostas intactas';
end $$;

reset role;
select passo from _logmr order by n;
