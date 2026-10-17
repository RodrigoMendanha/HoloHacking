-- Harness HOLOS-V1 v7 (SO TEXTO, 13/10). Sem migration nova. Roda DENTRO da transacao do scripts/validar-cadeia-local.sh,
-- DEPOIS do resultado-direcao-harness.sql (v6 no ar, com HOLOSCAN, Resultados e emissoes feitos nela).
--   PV7-00 v6 no ar, sem rascunho pendente; impressao digital do historico (HOLOSCAN, Resultados, emissoes)
--   PV7-01 v7 gravada em_revisao sobre a v6; validador SQL: 0 erros
--   PV7-02 publicacao direta: v7 aprovado hoje (hash do servidor), v6 retirada com auditoria e mesmo hash
--   PV7-03 no banco: perguntas, associacoes, regras, faixas e escalas da v7 identicas as da v6; so o texto do Acido muda;
--          nenhum texto oficial da v7 cita exame/laboratorio/composicao corporal
--   PV7-04 HOLOSCAN novo na v7 com as MESMAS respostas do PV6-04: mesmas notas, faixas, denominadores e Indice
--   PV7-05 historico identico (aplicacoes, respostas, notas, Resultados HOLOS e emissoes)
reset role;
create temp table _pv7 (k text primary key, v text) on commit drop;
create temp table _logv7 (n serial, passo text) on commit drop;
grant select, insert, update on _pv7, _logv7 to authenticated;
grant usage on sequence _logv7_n_seq to authenticated;
insert into _pv7 values ('apps', (select coalesce(md5(string_agg(a.id::text || a.methodology_package_id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a)),
  ('respostas', (select coalesce(md5(string_agg(x.application_id::text || x.marcador_id || coalesce(x.valor::text, ''), ',' order by x.application_id, x.marcador_id)), '') from public.holoscan_answers x)),
  ('notas', (select coalesce(md5(string_agg(x.application_id::text || x.sistema || coalesce(x.nota::text, '') || x.total_marcadores, ',' order by x.application_id, x.sistema)), '') from public.holoscan_system_scores x)),
  ('resultados', (select coalesce(md5(string_agg(r.id::text || coalesce(r.content_hash, '') || r.status || coalesce(r.direcao::text, ''), ',' order by r.id)), '') from public.holos_results r)),
  ('emissoes', (select coalesce(md5(string_agg(e.id::text || e.content_hash, ',' order by e.id)), '') from public.holos_result_emissions e)),
  ('v6', (select v from _pv6 where k = 'v6')),
  ('v6_hash', (select content_hash from public.methodology_packages where id = (select v::uuid from _pv6 where k = 'v6')));
insert into _logv7 (passo) select 'PV7-00 ' || case when (select status from public.methodology_packages where id = (select v::uuid from _pv7 where k = 'v6')) = 'aprovado'
    and not exists (select 1 from public.methodology_packages p where p.code = 'HOLOS-V1' and p.status = 'em_revisao'
      and p.nutritionist_id = (select nutritionist_id from public.methodology_packages where id = (select v::uuid from _pv7 where k = 'v6'))
      and p.version > (select version from public.methodology_packages where id = (select v::uuid from _pv7 where k = 'v6')))
  then 'ok' else 'FALHOU' end || ': v6 no ar, sem rascunho pendente; impressao digital do historico registrada';

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare v6 uuid := (select v::uuid from _pv7 where k = 'v6'); v7 uuid; val jsonb; d jsonb;
begin
  v7 := pg_temp.gravar_pacote(jsonb_set((select doc from _pacote_v7), '{version}', to_jsonb((select version + 1 from public.methodology_packages where id = v6))));
  insert into _pv7 values ('v7', v7::text);
  val := public.validar_pacote_metodologico(v7);
  insert into _logv7 (passo) select 'PV7-01 ' || case when jsonb_array_length(val->'erros') = 0 and (select status from public.methodology_packages where id = v7) = 'em_revisao'
    then 'ok' else 'FALHOU: ' || left((val->'erros')::text, 300) end || ': v7 gravada em_revisao sobre a v6; validador SQL sem erros';
  d := public.publicar_pacote_metodologico(v7);
  insert into _logv7 (passo) select 'PV7-02 ' || case when (select status = 'aprovado' and governance_regime = 'publicacao_direta' and effective_from = current_date and content_hash = public.metodologia_hash_conteudo(v7) from public.methodology_packages where id = v7)
      and (select status from public.methodology_packages where id = v6) = 'retirado'
      and (select content_hash from public.methodology_packages where id = v6) = (select v from _pv7 where k = 'v6_hash')
      and exists (select 1 from public.methodology_homologation_records r where r.package_id = v6 and r.decision = 'retirado' and r.source = 'publicacao direta')
    then 'ok' else 'FALHOU' end || ': v7 publicada hoje (hash do servidor); v6 retirada com auditoria e com o mesmo hash';
end $$;

reset role;
do $$
declare v6 uuid := (select v::uuid from _pv7 where k = 'v6'); v7 uuid := (select v::uuid from _pv7 where k = 'v7'); iguais boolean; muda text;
begin
  select
    (select md5(string_agg(stable_id || '|' || statement || '|' || block || '|' || scale_code || '|' || orientation || '|' || coalesce(temporal_context, '') || '|' || position || '|' || status, E'\n' order by stable_id)) from public.methodology_questions where package_id = v6)
  = (select md5(string_agg(stable_id || '|' || statement || '|' || block || '|' || scale_code || '|' || orientation || '|' || coalesce(temporal_context, '') || '|' || position || '|' || status, E'\n' order by stable_id)) from public.methodology_questions where package_id = v7)
  and (select md5(string_agg(question_stable_id || '|' || destination_type || '|' || destination_id || '|' || role || '|' || coalesce(weight::text, '') || '|' || status, E'\n' order by question_stable_id, destination_type, destination_id, role)) from public.methodology_associations where package_id = v6)
  = (select md5(string_agg(question_stable_id || '|' || destination_type || '|' || destination_id || '|' || role || '|' || coalesce(weight::text, '') || '|' || status, E'\n' order by question_stable_id, destination_type, destination_id, role)) from public.methodology_associations where package_id = v7)
  and (select md5(string_agg(rule_type || '|' || coalesce(target, '') || '|' || payload::text, E'\n' order by rule_type, target, payload::text)) from public.methodology_rules where package_id = v6)
  = (select md5(string_agg(rule_type || '|' || coalesce(target, '') || '|' || payload::text, E'\n' order by rule_type, target, payload::text)) from public.methodology_rules where package_id = v7)
  and (select md5(string_agg(destination_type || '|' || destination_id || '|' || label || '|' || lower_bound::text || '|' || upper_bound::text || '|' || coalesce(message_paciente, '') || '|' || coalesce(message_nutri, ''), E'\n' order by destination_type, destination_id, lower_bound)) from public.methodology_ranges where package_id = v6)
  = (select md5(string_agg(destination_type || '|' || destination_id || '|' || label || '|' || lower_bound::text || '|' || upper_bound::text || '|' || coalesce(message_paciente, '') || '|' || coalesce(message_nutri, ''), E'\n' order by destination_type, destination_id, lower_bound)) from public.methodology_ranges where package_id = v7)
  and (select md5(string_agg(code || '|' || min_value || '|' || max_value || '|' || coalesce(labels::text, ''), E'\n' order by code)) from public.methodology_scales where package_id = v6)
  = (select md5(string_agg(code || '|' || min_value || '|' || max_value || '|' || coalesce(labels::text, ''), E'\n' order by code)) from public.methodology_scales where package_id = v7)
  into iguais;
  select string_agg(a.code, ',' order by a.code) into muda from public.methodology_systems a join public.methodology_systems b on b.code = a.code and b.package_id = v7
    where a.package_id = v6 and a.public_text is distinct from b.public_text;
  insert into _logv7 (passo) select 'PV7-03 ' || case when iguais and muda = 'acido_inflamatorio'
      and (select count(*) from public.methodology_systems where package_id = v7 and public_text ~* '(exame|laborat|composi[cç][aã]o corporal)') = 0
      and (select count(*) from public.methodology_systems where package_id = v6 and public_text ~* 'exame') = 1
    then 'ok' else 'FALHOU (iguais=' || coalesce(iguais::text, 'null') || ' muda=' || coalesce(muda, '') || ')' end
    || ': no banco perguntas, associacoes, regras, faixas e escalas da v7 identicas as da v6; so o texto do Acido muda; nenhum texto oficial da v7 cita exame';
end $$;

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare v7 uuid := (select v::uuid from _pv7 where k = 'v7'); p uuid; e uuid; h uuid; ok_n boolean;
begin
  insert into public.patients (nutritionist_id, nome) values (auth.uid(), 'PV7 TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (auth.uid(), p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(v7, p, e, current_date));
  insert into _pv7 values ('h7', h::text);
  /* mesmas respostas do PV6-04 (ho_payload: todas = 1) -> exatamente as mesmas notas, faixas, denominadores e Indice */
  select (select string_agg(sistema || ':' || coalesce(nota::text, '') || ':' || coalesce(faixa, '') || ':' || total_marcadores || ':' || respondidos, ',' order by sistema) from public.holoscan_system_scores where application_id = h)
       = (select string_agg(sistema || ':' || coalesce(nota::text, '') || ':' || coalesce(faixa, '') || ':' || total_marcadores || ':' || respondidos, ',' order by sistema) from public.holoscan_system_scores where application_id = (select v::uuid from _pv6 where k = 'h6'))
     and (select indice from public.holoscan_applications where id = h) is not distinct from (select indice from public.holoscan_applications where id = (select v::uuid from _pv6 where k = 'h6'))
     and (select count(*) from public.holoscan_answers where application_id = h) = 81 into ok_n;
  insert into _logv7 (passo) select 'PV7-04 ' || case when ok_n and (select methodology_package_id from public.holoscan_applications where id = h) = v7
    then 'ok' else 'FALHOU' end || ': HOLOSCAN novo na v7 com as mesmas respostas do PV6-04: mesmas notas, faixas, denominadores e Indice';
end $$;

reset role;
insert into _logv7 (passo) select 'PV7-05 ' || case when
    (select coalesce(md5(string_agg(a.id::text || a.methodology_package_id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a
      where a.id <> (select v::uuid from _pv7 where k = 'h7')) = (select v from _pv7 where k = 'apps')
    and (select coalesce(md5(string_agg(x.application_id::text || x.marcador_id || coalesce(x.valor::text, ''), ',' order by x.application_id, x.marcador_id)), '') from public.holoscan_answers x
      where x.application_id <> (select v::uuid from _pv7 where k = 'h7')) = (select v from _pv7 where k = 'respostas')
    and (select coalesce(md5(string_agg(x.application_id::text || x.sistema || coalesce(x.nota::text, '') || x.total_marcadores, ',' order by x.application_id, x.sistema)), '') from public.holoscan_system_scores x
      where x.application_id <> (select v::uuid from _pv7 where k = 'h7')) = (select v from _pv7 where k = 'notas')
    and (select coalesce(md5(string_agg(r.id::text || coalesce(r.content_hash, '') || r.status || coalesce(r.direcao::text, ''), ',' order by r.id)), '') from public.holos_results r) = (select v from _pv7 where k = 'resultados')
    and (select coalesce(md5(string_agg(e.id::text || e.content_hash, ',' order by e.id)), '') from public.holos_result_emissions e) = (select v from _pv7 where k = 'emissoes')
  then 'ok' else 'FALHOU' end || ': historico (aplicacoes, respostas, notas, Resultados HOLOS e emissoes) identico depois da v7';
select passo from _logv7 order by n;
