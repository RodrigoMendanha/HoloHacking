-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.5 — VERIFICACAO POS-DEPLOY (SOMENTE LEITURA; nao mostra uid, e-mail nem dado clinico)
-- Substitui ETAPA6-4-VERIFICACAO-POS-DEPLOY.sql depois da migration 20261005100000 (correcao P0: aplicacao HOLOSCAN so oficial).
-- Rodar: (a) depois da aplicacao da 6.5 e do deploy do front, antes de qualquer uso; (b) depois da PRIMEIRA aplicacao HOLOSCAN nova.
-- "deploy_ok"       = governanca intacta + historicas intactas (sem backfill) + toda aplicacao nova e OFICIAL.
-- "primeira_app_ok" = existe ao menos 1 aplicacao nova e TODAS sao oficiais: HOLOS-V1@2 aprovado, hash homologado, motor/contrato,
--                     calculation_mode = oficial, combinacoes/aprofundamentos vazios, 5 notas, total_marcadores so dos vinculos primarios.
-- Referencias: 4 historicas sem proveniencia, historicas_fingerprint 205812d8e238e293fe8b58205ffa5631 (coluna a coluna; nao depende das
-- colunas novas). Os totais por sistema do HOLOS-V1@2 (vinculos primarios) somam 84.
-- ============================================================================
with h as (select id, content_hash from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
     l as (select id from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
     hist as (select a.* from public.holoscan_applications a where a.created_at < '2026-10-03'),
     novas as (select a.* from public.holoscan_applications a where a.created_at >= '2026-10-03'),
     prim as (select x.destination_id as sistema, count(*) as n from public.methodology_associations x, h
               where x.package_id = h.id and x.destination_type = 'system' and x.role = 'primaria' group by x.destination_id),
     v as (select
    (select count(*) from supabase_migrations.schema_migrations) as hist_n,
    (select max(version) from supabase_migrations.schema_migrations) as hist_ultima,
    (select string_agg(code || '@' || version || ':' || status || ':' || coalesce(governance_regime, '-'), ',') from public.methodology_packages) as holos,
    (select public.metodologia_hash_conteudo(id) from h) as holos_hash,
    (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages) as li,
    (select public.li_hash_conteudo(id) from l) as li_hash,
    (select count(*) from public.integrated_reading_package_snapshots) as li_snapshots,
    (select string_agg(scope || '/' || approval_stage || '/' || display_name || '/' || active, ',' order by scope, approval_stage) from public.methodology_approvers) as papeis,
    (select count(*) from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a') as policies_insert_holoscan,
    (select count(*) from hist) as historicas,
    (select count(*) from hist where methodology_package_id is null and methodology_package_version is null and calculation_mode is null and methodology_content_hash is null) as historicas_sem_proveniencia,
    (select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from hist) as historicas_fingerprint,
    (select count(*) from novas) as novas,
    (select count(*) from novas n, h where n.methodology_package_id = h.id and n.methodology_package_version = 2 and n.methodology_content_hash = h.content_hash
       and n.calculation_mode = 'oficial' and n.engine_contract_version = 'holoscan-motor-contrato-v1' and n.engine_version is not null and n.encounter_id is not null
       and n.combinacoes = '[]'::jsonb and n.aprofundamentos = '[]'::jsonb) as novas_oficiais,
    (select count(*) from novas n where (select count(*) from public.holoscan_system_scores s where s.application_id = n.id) <> 5
       or exists (select 1 from public.holoscan_system_scores s left join prim p on p.sistema = s.sistema where s.application_id = n.id and s.total_marcadores is distinct from p.n)) as novas_com_contagem_divergente,
    (select count(*) from novas n where exists (select 1 from public.holoscan_system_scores s where s.application_id = n.id and s.faixa in ('baixo', 'medio', 'alto'))) as novas_com_faixa_legada,
    (select (n.calculation_mode = 'oficial' and n.methodology_package_id = (select id from h)) from novas n order by created_at desc limit 1) as ultima_nova_oficial,
    (select count(*) from public.holoscan_applications a join public.methodology_packages p on p.id = a.methodology_package_id where p.status <> 'aprovado') as apps_com_pacote_nao_aprovado,
    (select count(*) from public.integrated_readings) as leituras,
    (select count(*) from public.integrated_readings r where r.rule_package_id is distinct from (select id from l) or r.rule_version is distinct from 2) as leituras_fora_li_v2
)
select json_build_object(
  'deploy_ok', (hist_n = 32 and hist_ultima = '20261005100000' and holos = 'HOLOS-V1@2:aprovado:aprovador_unico' and holos_hash = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402'
                and li = 'LI-V1@1:rascunho,LI-V1@2:aprovado' and li_hash = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9' and li_snapshots = 1
                and policies_insert_holoscan = 0
                and historicas = 4 and historicas_sem_proveniencia = 4 and historicas_fingerprint = '205812d8e238e293fe8b58205ffa5631'
                and novas_oficiais = novas and novas_com_contagem_divergente = 0 and novas_com_faixa_legada = 0
                and apps_com_pacote_nao_aprovado = 0 and leituras_fora_li_v2 = 0),
  'primeira_app_ok', (novas >= 1 and novas_oficiais = novas and novas_com_contagem_divergente = 0 and novas_com_faixa_legada = 0 and coalesce(ultima_nova_oficial, false)),
  'hist_n', hist_n, 'hist_ultima', hist_ultima, 'holos', holos, 'holos_hash', holos_hash, 'li', li, 'li_hash', li_hash, 'li_snapshots', li_snapshots, 'papeis', papeis,
  'policies_insert_holoscan', policies_insert_holoscan,
  'historicas', historicas, 'historicas_sem_proveniencia', historicas_sem_proveniencia, 'historicas_fingerprint', historicas_fingerprint,
  'novas', novas, 'novas_oficiais', novas_oficiais, 'novas_com_contagem_divergente', novas_com_contagem_divergente, 'novas_com_faixa_legada', novas_com_faixa_legada,
  'ultima_nova_oficial', ultima_nova_oficial, 'apps_com_pacote_nao_aprovado', apps_com_pacote_nao_aprovado,
  'leituras', leituras, 'leituras_fora_li_v2', leituras_fora_li_v2
) as pos_deploy from v;
