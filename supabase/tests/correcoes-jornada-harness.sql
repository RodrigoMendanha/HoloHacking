-- Harness CORRECOES DA JORNADA (migration 20261017100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration. Paciente, atendimentos e HOLOSCAN ficticios. Nada persiste.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _cj (k text primary key, v text) on commit drop;
create temp table _logcj (n serial, passo text) on commit drop;
grant select, insert, update on _cj, _logcj to authenticated;
grant usage on sequence _logcj_n_seq to authenticated;
create or replace function pg_temp.cj_tools(sel jsonb) returns text language sql as $$
  select coalesce(string_agg((x->>'papel') || ':' || (x->>'tool_id'), ' ' order by (x->>'slot')::int), '') from jsonb_array_elements(sel) x $$;
create or replace function pg_temp.cj_resp(f text) returns jsonb language sql as $$
  select case f
    when 'mapa_rotina_v1' then '{"acorda":"06:30","dorme":"23:00","eventos":[{"inicio":"07:00","categoria":"refeição","titulo":"café"}]}'::jsonb
    when 'gatilhos_respostas_v1' then '{"gatilho":"discussão","pensamento":"não aguento","emocao":"raiva","resposta":"come doce"}'::jsonb
    when 'conexao_pertencimento_v1' then '{"contar":"irmã","vinculos":[{"rotulo":"Irmã","natureza":"pessoa","papel":"apoia"}]}'::jsonb
    else '{"registro":"ficticio"}'::jsonb end $$;
grant execute on all functions in schema pg_temp to authenticated;
-- estado que nao pode mudar: registros de Proximos Passos e Resultados HOLOS ja salvos
insert into _cj values ('pp_antes', (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_next_steps)),
  ('rh_antes', (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || template_version, ',' order by id)), '') from public.holos_results));

-- montar_resultado_holos e interna (sem acesso pela API): o harness chama como dono, com a identidade da Daniel
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); p uuid; e uuid; e2 uuid; h uuid; reg jsonb;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'CJ TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now() - interval '20 days') returning id into e2;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, p, e, current_date));
  reg := public.registrar_proximos_passos(h);
  insert into _cj values ('p', p::text), ('e', e::text), ('e2', e2::text), ('h', h::text), ('reg', pg_temp.cj_tools(reg->'selection'));
end $$;

-- CJ01 — nada feito: pendentes = o registro; o Resultado novo e template 3
do $$
declare m jsonb := public.montar_resultado_holos(auth.uid(), jsonb_build_object('patient_id', (select v from _cj where k = 'p'),
  'encounter_id', (select v from _cj where k = 'e'), 'holoscan_application_id', (select v from _cj where k = 'h'), 'tool_application_ids', '[]'::jsonb));
begin
  insert into _logcj (passo) select 'CJ01 ' || case when (m#>>'{conteudo,template_version}') = '3'
      and pg_temp.cj_tools(m#>'{conteudo,proximos_passos,pendentes,selection}') = (select v from _cj where k = 'reg')
      and pg_temp.cj_tools(m#>'{conteudo,proximos_passos,selection}') = (select v from _cj where k = 'reg')
      and (m#>'{conteudo,proximos_passos,pendentes,concluidas_no_atendimento}') = '[]'::jsonb
      and (m#>>'{conteudo,proximos_passos,pendentes,todas_realizadas}') = 'false'
    then 'ok' else 'FALHOU: ' || coalesce((m#>'{conteudo,proximos_passos}')::text, 'null') end
    || ': sem ferramenta feita, os pendentes sao o proprio registro (template 3)';
end $$;

-- CJ02 — feita em OUTRO atendimento: nao conta (so o atendimento do resultado e o do HOLOSCAN)
do $$
declare uid uuid := auth.uid(); f text; m jsonb;
begin
  f := split_part(split_part((select v from _cj where k = 'reg'), ' ', 1), ':', 2);
  insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
    values (uid, (select v::uuid from _cj where k = 'p'), (select v::uuid from _cj where k = 'e2'), f, '1', 'concluida', pg_temp.cj_resp(f), now() - interval '20 days', now() - interval '20 days');
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', (select v from _cj where k = 'p'),
    'encounter_id', (select v from _cj where k = 'e'), 'holoscan_application_id', (select v from _cj where k = 'h'), 'tool_application_ids', '[]'::jsonb));
  insert into _logcj (passo) select 'CJ02 ' || case when pg_temp.cj_tools(m#>'{conteudo,proximos_passos,pendentes,selection}') = (select v from _cj where k = 'reg')
    then 'ok' else 'FALHOU: ' || pg_temp.cj_tools(m#>'{conteudo,proximos_passos,pendentes,selection}') end
    || ': ferramenta concluida em outro atendimento nao sai dos Proximos Passos';
end $$;

-- CJ03 — as 3 sugeridas feitas NESTE atendimento: nenhuma volta; a proxima do catalogo vira a principal; o registro fica igual
do $$
declare uid uuid := auth.uid(); f text; m jsonb; sel text;
begin
  foreach f in array (select array_agg(split_part(x, ':', 2)) from unnest(string_to_array((select v from _cj where k = 'reg'), ' ')) x) loop
    insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
      values (uid, (select v::uuid from _cj where k = 'p'), (select v::uuid from _cj where k = 'e'), f, '1', 'concluida', pg_temp.cj_resp(f), now(), now());
  end loop;
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', (select v from _cj where k = 'p'),
    'encounter_id', (select v from _cj where k = 'e'), 'holoscan_application_id', (select v from _cj where k = 'h'), 'tool_application_ids', '[]'::jsonb));
  sel := pg_temp.cj_tools(m#>'{conteudo,proximos_passos,pendentes,selection}');
  insert into _logcj (passo) select 'CJ03 ' || case when sel <> '' and sel like 'principal:%'
      and not exists (select 1 from jsonb_array_elements(m#>'{conteudo,proximos_passos,pendentes,selection}') x
                      where (x->>'tool_id') in (select split_part(y, ':', 2) from unnest(string_to_array((select v from _cj where k = 'reg'), ' ')) y))
      and jsonb_array_length(m#>'{conteudo,proximos_passos,pendentes,concluidas_no_atendimento}') = 3
      and pg_temp.cj_tools(m#>'{conteudo,proximos_passos,selection}') = (select v from _cj where k = 'reg')
    then 'ok' else 'FALHOU: ' || sel end || ': as 3 feitas no atendimento saem; a proxima do catalogo vira a principal; o registro original fica congelado';
end $$;

-- CJ04 — todas as do catalogo para as duas areas feitas: lista vazia e todas_realizadas
do $$
declare uid uuid := auth.uid(); f text; m jsonb;
begin
  for f in select distinct r.tool_id from public.holos_recommendation_rules r
      where r.catalog_code = 'HOLOS-RECOMENDACOES-V1' and r.tool_id <> 'mapa' and r.tool_id not in (select ferramenta_id from public.tool_applications where encounter_id = (select v::uuid from _cj where k = 'e')) loop
    insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
      values (uid, (select v::uuid from _cj where k = 'p'), (select v::uuid from _cj where k = 'e'), f, '1', 'concluida', pg_temp.cj_resp(f), now(), now());
  end loop;
  m := public.montar_resultado_holos(uid, jsonb_build_object('patient_id', (select v from _cj where k = 'p'),
    'encounter_id', (select v from _cj where k = 'e'), 'holoscan_application_id', (select v from _cj where k = 'h'), 'tool_application_ids', '[]'::jsonb));
  -- o Mapa do Proposito e derivado (OQ3 + PQQ), nao vira aplicacao: so ele pode sobrar
  insert into _logcj (passo) select 'CJ04 ' || case when not exists (select 1 from jsonb_array_elements(m#>'{conteudo,proximos_passos,pendentes,selection}') x where x->>'tool_id' <> 'mapa')
      and ((m#>'{conteudo,proximos_passos,pendentes,selection}') <> '[]'::jsonb or (m#>>'{conteudo,proximos_passos,pendentes,todas_realizadas}') = 'true')
    then 'ok' else 'FALHOU: ' || coalesce((m#>'{conteudo,proximos_passos,pendentes}')::text, 'null') end || ': tudo feito: nada volta (so o Mapa do Proposito, derivado, pode sobrar); lista vazia = todas_realizadas (mensagem neutra)';
end $$;

-- CJ05 — salvar de verdade grava template 3; registros de Proximos Passos e Resultados antigos intactos
do $$
declare uid uuid := auth.uid(); r uuid;
begin
  r := public.salvar_resultado_holos(jsonb_build_object('patient_id', (select v from _cj where k = 'p'), 'encounter_id', (select v from _cj where k = 'e'),
    'holoscan_application_id', (select v from _cj where k = 'h'), 'tool_application_ids', '[]'::jsonb));
  insert into _cj values ('r', r::text);
end $$;
insert into _logcj (passo) select 'CJ05 ' || case when (select template_version = 3 and content_snapshot#>>'{proximos_passos,pendentes,todas_realizadas}' = 'true'
      from public.holos_results where id = (select v::uuid from _cj where k = 'r'))
  and (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_next_steps where holoscan_application_id <> (select v::uuid from _cj where k = 'h')) =
      (select v from _cj where k = 'pp_antes')
  and (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || template_version, ',' order by id)), '') from public.holos_results where id <> (select v::uuid from _cj where k = 'r')) =
      (select v from _cj where k = 'rh_antes')
  and not has_function_privilege('authenticated', 'public.proximos_passos_pendentes(uuid, uuid, uuid[])', 'execute')
  then 'ok' else 'FALHOU' end || ': salvar grava template 3 com os pendentes; registros de Proximos Passos e Resultados HOLOS antigos identicos; funcao interna fechada para a API';

select passo from _logcj order by n;
