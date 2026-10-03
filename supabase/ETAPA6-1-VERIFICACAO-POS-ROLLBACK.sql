-- ============================================================================
-- SEGUNDO BLOCO — EXECUTAR SOMENTE DEPOIS DO PRIMEIRO BLOCO TERMINAR
-- Somente leitura: prova que nenhuma alteracao persistiu. Esperado (estado de 2026-10-02):
--   hist_n = 16, hist_ultima = 20260929192605, n_tabelas = 14, n_funcoes = 7, n_policies = 49, n_triggers = 12,
--   n_constraints = 64, tabelas_novas_existem = 0, encounters_existe = false, coluna_proveniencia = 0,
--   reference_status = 0, usuarios_sinteticos = 0, pacientes_sinteticos = 0, nota_nullable = 'NO',
--   constraint_scores_existe = false, sessoes_em_transacao = 0, aprovadores/aprovacoes/leituras = 'tabela ausente'.
-- ============================================================================
select json_build_object(
  'hist_n', (select count(*) from supabase_migrations.schema_migrations),
  'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
  'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
  'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
  'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
  'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
  'tabelas_novas_existem', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('methodology_packages','methodology_approvers','methodology_package_approvals','integrated_reading_rule_packages','integrated_reading_domains','integrated_reading_exam_domain_links','integrated_reading_rules','integrated_readings','lab_exam_catalog','encounters')),
  'encounters_existe', to_regclass('public.encounters') is not null,
  'coluna_proveniencia', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_package_id','methodology_package_version')),
  'reference_status', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'lab_results' and column_name = 'reference_status'),
  'nota_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_system_scores' and column_name = 'nota'),
  'constraint_scores_existe', exists (select 1 from pg_constraint where conname = 'holoscan_system_scores_sem_dado_coerente'),
  'usuarios_sinteticos', (select count(*) from auth.users where email like 'e61-%@teste.invalid'),
  'pacientes_sinteticos', (select count(*) from public.patients where nome = 'E61 SINTETICO'),
  'aprovadores', case when to_regclass('public.methodology_approvers') is null then 'tabela ausente' else 'TABELA EXISTE: investigar' end,
  'aprovacoes', case when to_regclass('public.integrated_reading_package_approvals') is null then 'tabela ausente' else 'TABELA EXISTE: investigar' end,
  'leituras', case when to_regclass('public.integrated_readings') is null then 'tabela ausente' else 'TABELA EXISTE: investigar' end,
  'contagens', json_build_object('patients', (select count(*) from public.patients), 'holoscan_applications', (select count(*) from public.holoscan_applications), 'holoscan_system_scores', (select count(*) from public.holoscan_system_scores), 'lab_collections', (select count(*) from public.lab_collections), 'lab_results', (select count(*) from public.lab_results), 'auth_users', (select count(*) from auth.users)),
  'sessoes_em_transacao', (select count(*) from pg_stat_activity where state like 'idle in transaction%')
) as estado_persistente_pos_rollback;
