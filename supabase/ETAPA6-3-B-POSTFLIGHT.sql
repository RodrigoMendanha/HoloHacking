-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3-B — POST-FLIGHT (rodar DEPOIS do COMMIT) (SOMENTE LEITURA; nao mostra uid, e-mail nem dado clinico)
-- Gerado por scripts/gerar-aplicacao-aprovador-unico.py. "aplicacao_ok" = true so quando TODAS as medidas batem com o esperado.
-- Guarde tambem "digitais": o POST-FLIGHT tem de devolver os MESMOS valores (aplicacoes, scores, Aprovacao 1, pacote HOLOS, exames, LI).
-- ============================================================================
with m as (select jsonb_build_object(
    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'papeis', (select string_agg(scope || '/' || approval_stage || '/' || display_name || '/' || active, ',' order by scope, approval_stage) from public.methodology_approvers),
    'aprovadores_uids', (select count(distinct user_id) from public.methodology_approvers),
    'daniel_mesmo_uid_2_escopos', (select count(distinct user_id) = 1 and count(*) = 2 from public.methodology_approvers where approval_stage = 1 and display_name = 'Daniel'),
    'met_pacotes', (select count(*) from public.methodology_packages),
    'holos', (select string_agg(code || '@' || version || ':' || status, ',') from public.methodology_packages),
    'holos_hash', (select public.metodologia_hash_conteudo(id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_dono_e_daniel', (select p.nutritionist_id = d.user_id from public.methodology_packages p, public.methodology_approvers d where p.code = 'HOLOS-V1' and p.version = 2 and d.scope = 'holoscan' and d.approval_stage = 1 and d.display_name = 'Daniel'),
    'holos_reviewed_by_nulo', (select reviewed_by is null and reviewed_at is null from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'met_aprovacoes', (select string_agg(a.step || ':' || a.responsible || ':' || a.role || ':v' || a.package_version || ':vigente=' || (a.invalidated_at is null) || ':hash_ok=' || (a.content_hash = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402') || ':uid_daniel=' || (a.approved_by = d.user_id) || ':papel_daniel=' || (a.approver_id = d.id), ',' order by a.approved_at) from public.methodology_package_approvals a left join public.methodology_approvers d on d.scope = 'holoscan' and d.approval_stage = 1 and d.display_name = 'Daniel'),
    'met_aprovacoes_n', (select count(*) from public.methodology_package_approvals),
    'met_registros', (select count(*) from public.methodology_homologation_records),
    'li', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
    'li_hash', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
    'li_aprovacoes', (select count(*) from public.integrated_reading_package_approvals),
    'li_snapshots', (select count(*) from public.integrated_reading_package_snapshots),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
    'patients', (select count(*) from public.patients),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'auth_users', (select count(*) from auth.users),
    'leituras', (select count(*) from public.integrated_readings),
    'etapa2_ativos', (select count(*) from public.methodology_approvers where approval_stage = 2 and active),
    'rodrigo_desativados_com_data_e_motivo', (select count(*) from public.methodology_approvers where approval_stage = 2 and display_name = 'Rodrigo' and not active and deactivated_at is not null and length(btrim(deactivation_reason)) > 0),
    'aprovadores_total', (select count(*) from public.methodology_approvers),
    'aprovacoes_etapa2', (select (select count(*) from public.methodology_package_approvals where step <> 1) + (select count(*) from public.integrated_reading_package_approvals where step <> 1)),
    'holos_regime', (select coalesce(governance_regime, 'nulo') from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'snapshot_approval_2_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'integrated_reading_package_snapshots' and column_name = 'approval_2')
  ) as f),
e as (select '{"hist_n":31,"hist_ultima":"20261003100000","n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":323,"papeis":"holoscan/1/Daniel/true,holoscan/2/Rodrigo/false,integrated_reading/1/Daniel/true,integrated_reading/2/Rodrigo/false","aprovadores_uids":2,"daniel_mesmo_uid_2_escopos":true,"met_pacotes":1,"holos":"HOLOS-V1@2:em_revisao","holos_hash":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_dono_e_daniel":true,"holos_reviewed_by_nulo":true,"met_aprovacoes":"1:Daniel:responsavel_primario:v2:vigente=true:hash_ok=true:uid_daniel=true:papel_daniel=true","met_aprovacoes_n":1,"met_registros":0,"li":"LI-V1@1:rascunho,LI-V1@2:em_revisao","li_hash":"fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9","li_aprovacoes":0,"li_snapshots":0,"holoscan_applications":4,"apps_com_proveniencia":0,"patients":5,"holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"auth_users":3,"leituras":0,"etapa2_ativos":0,"rodrigo_desativados_com_data_e_motivo":2,"aprovadores_total":4,"aprovacoes_etapa2":0,"holos_regime":"nulo","snapshot_approval_2_nullable":"YES"}'::jsonb as e),
d as (select jsonb_object_agg(k, antes) as dig from (values
    ('apps', (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('met_aprovacoes', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_pacote', (select md5(coalesce(string_agg((to_jsonb(p) - 'governance_regime')::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('daniel', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, active, notes, created_at, created_by from public.methodology_approvers where approval_stage = 1) r)),
    ('rodrigo_identidade', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, notes, created_at, created_by from public.methodology_approvers where approval_stage = 2) r)),
    ('lab_results', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r))) as x(k, antes))
select jsonb_pretty(jsonb_build_object(
  'aplicacao_ok', (select bool_and((m.f->>k) is not distinct from (e.e->>k)) from m, e, jsonb_object_keys(e.e) k),
  'divergencias', (select coalesce(jsonb_object_agg(k, jsonb_build_object('atual', m.f->k, 'esperado', e.e->k)), '{}'::jsonb) from m, e, jsonb_object_keys(e.e) k where (m.f->>k) is distinct from (e.e->>k)),
  'medidas', (select f from m),
  'digitais', (select dig from d))) as resultado;
