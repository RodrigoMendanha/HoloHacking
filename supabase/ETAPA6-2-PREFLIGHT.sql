-- ============================================================================
-- ETAPA 6.2 — PRE-FLIGHT (SOMENTE LEITURA). Executar IMEDIATAMENTE ANTES da aplicacao real, no projeto sllhyymeeyoozokgbnuv.
-- Prova que o banco ainda esta exatamente no fingerprint aprovado no gate 6.1. Se "pode_aplicar" = false: PARAR. Nao aplicar.
-- Esperado: hist_n 16, hist_ultima 20260929192605, n_tabelas 14, n_funcoes 7, n_policies 49, n_triggers 12, n_constraints 64,
--           patients 5, holoscan_applications 4, holoscan_system_scores 20, lab_collections 3, lab_results 22, auth_users 3,
--           tabelas_novas 0, sessoes_em_transacao 0, locks_pendentes 0.
-- ============================================================================
with f as (
  select
    (select count(*) from supabase_migrations.schema_migrations) as hist_n,
    (select max(version) from supabase_migrations.schema_migrations) as hist_ultima,
    (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r') as n_tabelas,
    (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') as n_funcoes,
    (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') as n_policies,
    (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal) as n_triggers,
    (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public') as n_constraints,
    (select count(*) from public.patients) as patients,
    (select count(*) from public.holoscan_applications) as holoscan_applications,
    (select count(*) from public.holoscan_system_scores) as holoscan_system_scores,
    (select count(*) from public.lab_collections) as lab_collections,
    (select count(*) from public.lab_results) as lab_results,
    (select count(*) from auth.users) as auth_users,
    (select count(*) from pg_tables where schemaname = 'public' and tablename in ('methodology_packages','methodology_approvers','integrated_reading_rule_packages','integrated_readings','lab_exam_catalog','encounters','anamneses','conducts','report_emissions')) as tabelas_novas,
    (select count(*) from pg_stat_activity where state like 'idle in transaction%') as sessoes_em_transacao,
    (select count(*) from pg_locks l join pg_class c on c.oid = l.relation join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and l.pid <> pg_backend_pid() and l.mode like '%Exclusive%') as locks_pendentes,
    (select version()) as pg
)
select json_build_object(
  'pode_aplicar', (hist_n = 16 and hist_ultima = '20260929192605' and n_tabelas = 14 and n_funcoes = 7 and n_policies = 49 and n_triggers = 12 and n_constraints = 64
                   and patients = 5 and holoscan_applications = 4 and holoscan_system_scores = 20 and lab_collections = 3 and lab_results = 22 and auth_users = 3
                   and tabelas_novas = 0 and sessoes_em_transacao = 0 and locks_pendentes = 0),
  'hist_n', hist_n, 'hist_ultima', hist_ultima, 'n_tabelas', n_tabelas, 'n_funcoes', n_funcoes, 'n_policies', n_policies, 'n_triggers', n_triggers, 'n_constraints', n_constraints,
  'patients', patients, 'holoscan_applications', holoscan_applications, 'holoscan_system_scores', holoscan_system_scores, 'lab_collections', lab_collections, 'lab_results', lab_results, 'auth_users', auth_users,
  'tabelas_novas', tabelas_novas, 'sessoes_em_transacao', sessoes_em_transacao, 'locks_pendentes', locks_pendentes, 'pg', left(pg, 16)
) as preflight from f;
