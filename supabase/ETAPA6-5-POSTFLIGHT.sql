-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.5 — POST-FLIGHT (rodar DEPOIS do COMMIT) (SOMENTE LEITURA; nao mostra uid, e-mail nem dado clinico)
-- Gerado por scripts/gerar-aplicacao-holoscan-oficial.py. "aplicacao_ok" = true so quando TODAS as medidas batem com o esperado.
-- Guarde tambem "digitais": o POST-FLIGHT tem de devolver os MESMOS valores (aplicacoes, scores, respostas, pacotes, aprovacoes, LI, exames, ferramentas).
-- ============================================================================
with m as (select jsonb_build_object(
    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'holos', (select string_agg(code || '@' || version || ':' || status || ':' || coalesce(governance_regime, '-'), ',') from public.methodology_packages),
    'holos_hash', (select public.metodologia_hash_conteudo(id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_content_hash_homologado', (select content_hash from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_vigencia', (select effective_from::text || '..' || coalesce(effective_to::text, '') from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'li', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
    'li_hash', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
    'apps_novas', (select count(*) from public.holoscan_applications where created_at >= '2026-10-03'),
    'historicas_fingerprint', (select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from public.holoscan_applications where created_at < '2026-10-03'),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'leituras', (select count(*) from public.integrated_readings),
    'registros_clinicos', (select count(*) from public.tool_applications where ferramenta_id in ('mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1')),
    'colunas_novas', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_content_hash', 'engine_version', 'engine_contract_version', 'calculation_mode')),
    'colunas_novas_preenchidas', (select count(*) from public.holoscan_applications where methodology_content_hash is not null or engine_version is not null or engine_contract_version is not null or calculation_mode is not null),
    'indice_aceita_nulo', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name = 'indice'),
    'policies_insert_holoscan', (select count(*) from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a'),
    'trigger_exigir_oficial', (select count(*) from pg_trigger where tgrelid = 'public.holoscan_applications'::regclass and tgname = 'holoscan_applications_exigir_oficial'),
    'rpc_exige_oficial', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'salvar_holoscan_completo'
       and p.prosrc like '%proveniencia_obrigatoria%' and p.prosrc like '%contagem_divergente%' and p.prosrc like '%faixa_fora_do_pacote%' and p.prosrc like '%metodologia_hash_conteudo%'),
    'rpc_sem_anon', (select not has_function_privilege('anon', 'public.salvar_holoscan_completo(jsonb)', 'execute')),
    'rpc_authenticated', (select has_function_privilege('authenticated', 'public.salvar_holoscan_completo(jsonb)', 'execute')),
    'faixa_aceita_v1', (select pg_get_constraintdef(oid) like '%intermediaria%' and pg_get_constraintdef(oid) like '%medio%' from pg_constraint where conname = 'holoscan_system_scores_faixa_valida'),
    'ferramentas_aceitas', (select pg_get_constraintdef(oid) like '%mapa_rotina_v1%' and pg_get_constraintdef(oid) like '%gatilhos_respostas_v1%' and pg_get_constraintdef(oid) like '%conexao_pertencimento_v1%' and pg_get_constraintdef(oid) like '%carta_futuro%' from pg_constraint where conname = 'tool_applications_ferramenta_valida'),
    'ids_antigos_proibidos', (select pg_get_constraintdef(oid) not like '%''mapa_rotina''%' and pg_get_constraintdef(oid) not like '%''gatilhos_respostas''%' and pg_get_constraintdef(oid) not like '%''conexao_pertencimento''%' from pg_constraint where conname = 'tool_applications_ferramenta_valida'),
    'triggers_registro', (select count(*) from pg_trigger where tgrelid = 'public.tool_applications'::regclass and tgname in ('tool_applications_validar_registro', 'tool_applications_registro_concluido')),
    'funcoes_registro_sem_anon', (select bool_and(not has_function_privilege('anon', p.oid, 'execute')) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and (p.proname like 'registro_clinico%' or p.proname = 'validar_registro_clinico'))
  ) as f),
e as (select '{"hist_n":33,"hist_ultima":"20261005110000","n_tabelas":44,"n_funcoes":68,"n_policies":126,"n_triggers":92,"n_constraints":326,"holos":"HOLOS-V1@2:aprovado:aprovador_unico","holos_hash":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_content_hash_homologado":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_vigencia":"2026-10-03..","li":"LI-V1@1:rascunho,LI-V1@2:aprovado","li_hash":"fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9","holoscan_applications":4,"apps_com_proveniencia":0,"apps_novas":0,"historicas_fingerprint":"205812d8e238e293fe8b58205ffa5631","holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"leituras":0,"registros_clinicos":0,"colunas_novas":4,"colunas_novas_preenchidas":0,"indice_aceita_nulo":"YES","policies_insert_holoscan":0,"trigger_exigir_oficial":1,"rpc_exige_oficial":1,"rpc_sem_anon":true,"rpc_authenticated":true,"faixa_aceita_v1":true,"ferramentas_aceitas":true,"ids_antigos_proibidos":true,"triggers_registro":2,"funcoes_registro_sem_anon":true}'::jsonb as e),
d as (select jsonb_object_agg(k, antes) as dig from (values
    ('apps', (select md5(coalesce(string_agg(concat_ws('|', a.id, a.nutritionist_id, a.patient_id, a.encounter_id, a.quando, a.versao_estrutura, a.versao_bancos, a.indice, a.indice_maximo, a.avaliavel, a.nota_media, a.triada, a.triada_com_dado, a.cobertura, a.combinacoes, a.aprofundamentos, a.interpretacao_texto, a.interpretacao_em, a.interpretacao_versao, a.methodology_package_id, a.methodology_package_version, a.created_at, a.updated_at), ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('respostas', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r)),
    ('holos_pacote', (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('holos_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_registro', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_homologation_records x)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r)),
    ('li_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_approvals x)),
    ('li_snapshot', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_snapshots x)),
    ('exames', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r)),
    ('ferramentas', (select md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) from public.tool_applications t))) as x(k, antes))
select jsonb_pretty(jsonb_build_object(
  'aplicacao_ok', (select bool_and((m.f->>k) is not distinct from (e.e->>k)) from m, e, jsonb_object_keys(e.e) k),
  'divergencias', (select coalesce(jsonb_object_agg(k, jsonb_build_object('atual', m.f->k, 'esperado', e.e->k)), '{}'::jsonb) from m, e, jsonb_object_keys(e.e) k where (m.f->>k) is distinct from (e.e->>k)),
  'medidas', (select f from m),
  'digitais', (select dig from d))) as resultado;
