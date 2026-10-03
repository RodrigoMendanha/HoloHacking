-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.4 — VERIFICACAO POS-DEPLOY (SOMENTE LEITURA; nao mostra uid, e-mail nem dado clinico)
-- Rodar: (a) logo apos o deploy, antes de qualquer uso; (b) depois da PRIMEIRA aplicacao HOLOSCAN nova.
-- "deploy_ok" = governanca intacta + historicas intactas + nenhuma aplicacao com pacote nao aprovado.
-- "primeira_app_ok" = existe ao menos 1 aplicacao nova e TODAS as novas tem proveniencia HOLOS-V1@2 (aprovado).
-- Referencias da Etapa 6.3 (2026-10-03): 4 historicas sem proveniencia, apps md5 d5a62c16..., scores md5 1c66f0d5...,
-- historicas_fingerprint 205812d8e238e293fe8b58205ffa5631. Nenhuma aplicacao nova existia no gate final.
-- ============================================================================
with h as (select id from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
     l as (select id from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
     hist as (select a.* from public.holoscan_applications a where a.created_at < '2026-10-03'),
     novas as (select a.* from public.holoscan_applications a where a.created_at >= '2026-10-03'),
     v as (select
    (select count(*) from supabase_migrations.schema_migrations) as hist_n,
    (select string_agg(code || '@' || version || ':' || status || ':' || coalesce(governance_regime, '-'), ',') from public.methodology_packages) as holos,
    (select public.metodologia_hash_conteudo(id) from h) as holos_hash,
    (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages) as li,
    (select public.li_hash_conteudo(id) from l) as li_hash,
    (select count(*) from public.integrated_reading_package_snapshots) as li_snapshots,
    (select string_agg(scope || '/' || approval_stage || '/' || display_name || '/' || active, ',' order by scope, approval_stage) from public.methodology_approvers) as papeis,
    (select count(*) from hist) as historicas,
    (select count(*) from hist where methodology_package_id is null and methodology_package_version is null) as historicas_sem_proveniencia,
    (select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from hist) as historicas_fingerprint,
    (select count(*) from novas) as novas,
    (select count(*) from novas where methodology_package_id is null or methodology_package_version is null) as novas_sem_proveniencia,
    (select count(*) from novas where methodology_package_id = (select id from h) and methodology_package_version = 2) as novas_com_holos_v2,
    (select count(*) from public.holoscan_applications a join public.methodology_packages p on p.id = a.methodology_package_id where p.status <> 'aprovado') as apps_com_pacote_nao_aprovado,
    (select (methodology_package_id = (select id from h) and methodology_package_version = 2) from novas order by created_at desc limit 1) as ultima_nova_com_holos_v2,
    (select count(*) from public.holoscan_system_scores s where s.application_id in (select id from novas)) as novas_scores,
    (select count(*) from public.integrated_readings) as leituras,
    (select count(*) from public.integrated_readings r where r.rule_package_id is distinct from (select id from l) or r.rule_version is distinct from 2) as leituras_fora_li_v2,
    (select coalesce(jsonb_object_agg(state, n), '{}'::jsonb) from (select state, count(*) n from public.integrated_readings group by state) x) as leituras_por_estado
)
select json_build_object(
  'deploy_ok', (hist_n = 31 and holos = 'HOLOS-V1@2:aprovado:aprovador_unico' and holos_hash = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402'
                and li = 'LI-V1@1:rascunho,LI-V1@2:aprovado' and li_hash = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9' and li_snapshots = 1
                and historicas = 4 and historicas_sem_proveniencia = 4 and historicas_fingerprint = '205812d8e238e293fe8b58205ffa5631'
                and apps_com_pacote_nao_aprovado = 0 and novas_sem_proveniencia = 0 and leituras_fora_li_v2 = 0),
  'primeira_app_ok', (novas >= 1 and novas_sem_proveniencia = 0 and novas_com_holos_v2 = novas and coalesce(ultima_nova_com_holos_v2, false)),
  'hist_n', hist_n, 'holos', holos, 'holos_hash', holos_hash, 'li', li, 'li_hash', li_hash, 'li_snapshots', li_snapshots, 'papeis', papeis,
  'historicas', historicas, 'historicas_sem_proveniencia', historicas_sem_proveniencia, 'historicas_fingerprint', historicas_fingerprint,
  'novas', novas, 'novas_sem_proveniencia', novas_sem_proveniencia, 'novas_com_holos_v2', novas_com_holos_v2, 'ultima_nova_com_holos_v2', ultima_nova_com_holos_v2,
  'novas_scores', novas_scores, 'apps_com_pacote_nao_aprovado', apps_com_pacote_nao_aprovado,
  'leituras', leituras, 'leituras_fora_li_v2', leituras_fora_li_v2, 'leituras_por_estado', leituras_por_estado
) as pos_deploy from v;
