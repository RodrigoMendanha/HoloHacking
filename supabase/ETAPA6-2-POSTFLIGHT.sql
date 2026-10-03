-- ============================================================================
-- ETAPA 6.2 — POST-FLIGHT (SOMENTE LEITURA). Executar DEPOIS da aplicacao real das 14 migrations (apos o COMMIT do script de aplicacao).
-- Esperado (derivado do dry-run 6.1 no real + deltas medidos localmente sobre o MESMO fingerprint inicial 14/7/49/12/64):
--   hist_n 30, hist_ultima 20261002130000, versoes_novas_registradas 14, n_tabelas 44, n_funcoes 62, n_policies 129, n_triggers 89,
--   n_constraints 317, n_indexes 139 (informativo: real tinha 45, local 44; delta +94), identidade_violacoes 0, identidade_validada true,
--   lab_results 22 (todos com legacy_exame_id e value_original_text), catalogo 45, li_pacotes 'LI-V1@1:rascunho,LI-V1@2:em_revisao',
--   li_hash_v2 fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9, approvers 0, li_aprovacoes 0, met_aprovacoes 0, leituras 0,
--   met_pacotes 0, encounters 0, apps 4 / apps_com_proveniencia 0, nota_nullable 'YES', triggers_arquivado_ativos 'O,O',
--   contagens inalteradas (patients 5, holoscan_applications 4, holoscan_system_scores 20, lab_collections 3, lab_results 22, auth_users 3), sessoes_em_transacao 0.
-- ============================================================================
select json_build_object(
  'hist_n', (select count(*) from supabase_migrations.schema_migrations),
  'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
  'versoes_novas_registradas', (select count(*) from supabase_migrations.schema_migrations where version in ('20260930130000','20260930140000','20260930150000','20260930160000','20260930170000','20260930180000','20260930190000','20261001200000','20261001210000','20261001220000','20261002100000','20261002110000','20261002120000','20261002130000')),
  'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
  'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
  'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
  'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
  'n_indexes', (select count(*) from pg_indexes where schemaname = 'public'),
  'identidade_violacoes', (select count(*) from public.lab_results where not (exam_code is not null or custom_exam_id is not null or origin in ('additional_legacy','legacy_migrated') or requires_manual_mapping)),
  'identidade_validada', (select convalidated from pg_constraint where conname = 'lab_results_identidade'),
  'lab_results_legado_preenchido', (select count(*) from public.lab_results where legacy_exame_id is not null and value_original_text is not null),
  'lab_results_mapeamento_manual', (select count(*) from public.lab_results where requires_manual_mapping),
  'catalogo', (select count(*) from public.lab_exam_catalog),
  'li_pacotes', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
  'li_hash_v2', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
  'approvers', (select count(*) from public.methodology_approvers),
  'li_aprovacoes', (select count(*) from public.integrated_reading_package_approvals),
  'met_aprovacoes', (select count(*) from public.methodology_package_approvals),
  'leituras', (select count(*) from public.integrated_readings),
  'met_pacotes', (select count(*) from public.methodology_packages),
  'encounters', (select count(*) from public.encounters),
  'apps', (select count(*) from public.holoscan_applications),
  'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
  'nota_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_system_scores' and column_name = 'nota'),
  'triggers_arquivado_ativos', (select string_agg(tgenabled::text, ',' order by tgname) from pg_trigger where tgname in ('lab_collections_paciente_arquivado','lab_results_paciente_arquivado')),
  'contagens', json_build_object('patients', (select count(*) from public.patients), 'holoscan_applications', (select count(*) from public.holoscan_applications), 'holoscan_system_scores', (select count(*) from public.holoscan_system_scores), 'lab_collections', (select count(*) from public.lab_collections), 'lab_results', (select count(*) from public.lab_results), 'auth_users', (select count(*) from auth.users)),
  'sessoes_em_transacao', (select count(*) from pg_stat_activity where state like 'idle in transaction%')
) as postflight;
