-- Harness CORRECAO P0 (migration 20261005100000 — aplicacao HOLOSCAN so oficial), parte PRE: roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh, ANTES da migration. Guarda as impressoes digitais das aplicacoes que ja existem
-- (as "historicas" deste banco local) para provar, depois, que a migration nao tocou em nenhuma linha. Nada persiste.
reset role;
create temp table _ho (k text primary key, v text) on commit drop;
grant insert, select, update on _ho to authenticated;
create temp table _logho (passo text) on commit drop;
grant insert, select on _logho to authenticated;
insert into _ho
select 'apps', md5(coalesce(string_agg(concat_ws('|', a.id, a.nutritionist_id, a.patient_id, a.encounter_id, a.quando, a.versao_estrutura, a.versao_bancos, a.indice, a.indice_maximo,
         a.avaliavel, a.nota_media, a.triada, a.triada_com_dado, a.cobertura, a.combinacoes, a.aprofundamentos, a.interpretacao_texto, a.interpretacao_em, a.interpretacao_versao,
         a.methodology_package_id, a.methodology_package_version, a.created_at, a.updated_at), ';' order by a.id), '')) from public.holoscan_applications a
union all select 'scores', md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s
union all select 'answers', md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r
union all select 'n_apps', count(*)::text from public.holoscan_applications
union all select 'n_sem_pacote', count(*)::text from public.holoscan_applications where methodology_package_id is null;
