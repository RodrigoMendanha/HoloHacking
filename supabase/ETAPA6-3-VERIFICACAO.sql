-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3 — VERIFICACAO DE GOVERNANCA (SOMENTE LEITURA; nao mostra uid nem e-mail)
-- Rodar ANTES do passo A (guardar "historicas_fingerprint") e ao final do gate. "gate_6_3_ok" = true so quando tudo confere.
-- Hash esperado HOLOS-V1@2 (metodologia_hash_conteudo): 7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402
-- Hash esperado LI-V1@2 (li_hash_conteudo):             fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9
-- "historicas" = aplicacoes HOLOSCAN criadas antes de 2026-10-03 (antes da 6.2): esperado 4, todas sem proveniencia, fingerprint inalterado.
-- ============================================================================
with h as (select id from public.methodology_packages where code = 'HOLOS-V1' and version = 2 order by created_at limit 1),
     l as (select id from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
     v as (
  select
    (select count(*) from supabase_migrations.schema_migrations) as hist_n,
    (select count(*) from public.methodology_approvers where active) as approvers,
    (select count(distinct user_id) from public.methodology_approvers) as approvers_uids_distintos,
    (select coalesce(string_agg(scope || '/' || approval_stage || '/' || display_name, ',' order by scope, approval_stage), 'nenhum') from public.methodology_approvers where active) as approvers_papeis,
    (select coalesce(string_agg(code || '@' || version || ':' || status, ',' order by version), 'nenhum') from public.methodology_packages where code = 'HOLOS-V1') as holos_pacotes,
    (select status from public.methodology_packages where id = (select id from h)) as holos_v2_status,
    (select public.metodologia_hash_conteudo(id) from h) as holos_v2_hash,
    (select public.validar_pacote_metodologico(id)->>'publicavel' from h) as holos_v2_publicavel,
    (select count(*) from public.methodology_questions where package_id = (select id from h)) as holos_v2_perguntas,
    (select count(*) from public.methodology_systems where package_id = (select id from h)) as holos_v2_sistemas,
    (select count(*) from public.methodology_ranges where package_id = (select id from h)) as holos_v2_faixas,
    (select effective_from::text from public.methodology_packages where id = (select id from h)) as holos_v2_vigente_desde,
    (select coalesce(string_agg(a.step || ':' || a.responsible, ',' order by a.step), 'nenhuma') from public.methodology_package_approvals a where a.package_id = (select id from h) and a.invalidated_at is null) as holos_aprovacoes,
    (select count(*) from public.methodology_package_approvals a where a.package_id = (select id from h) and a.invalidated_at is null and a.content_hash = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402') as holos_aprovacoes_hash_ok,
    (select count(distinct a.approved_by) from public.methodology_package_approvals a where a.package_id = (select id from h) and a.invalidated_at is null) as holos_aprovadores_distintos,
    (select count(*) from public.methodology_homologation_records r where r.package_id = (select id from h) and r.topic is not null) as holos_registros,
    (select status from public.integrated_reading_rule_packages where id = (select id from l)) as li_v2_status,
    (select public.li_hash_conteudo(id) from l) as li_v2_hash,
    (select coalesce(string_agg(step || ':' || responsible, ',' order by step), 'nenhuma') from public.integrated_reading_package_approvals where package_id = (select id from l) and invalidated_at is null) as li_aprovacoes,
    (select count(*) from public.integrated_reading_package_approvals where package_id = (select id from l) and invalidated_at is null and content_hash = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9') as li_aprovacoes_hash_ok,
    (select count(distinct approved_by) from public.integrated_reading_package_approvals where package_id = (select id from l) and invalidated_at is null) as li_aprovadores_distintos,
    (select count(*) from public.integrated_reading_package_snapshots where package_id = (select id from l)) as li_snapshots,
    (select count(*) from public.holoscan_applications where created_at < '2026-10-03') as historicas,
    (select count(*) from public.holoscan_applications where created_at < '2026-10-03' and methodology_package_id is null and methodology_package_version is null) as historicas_sem_proveniencia,
    (select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from public.holoscan_applications where created_at < '2026-10-03') as historicas_fingerprint,
    (select count(*) from public.holoscan_applications where created_at >= '2026-10-03' and methodology_package_id is null) as novas_sem_proveniencia,
    (select count(*) from public.holoscan_applications a join public.methodology_packages p on p.id = a.methodology_package_id where p.status <> 'aprovado') as apps_com_pacote_nao_aprovado,
    (select count(*) from public.holoscan_applications a where a.methodology_package_id = (select id from h) and a.methodology_package_version = 2) as apps_com_holos_v2,
    (select count(*) from public.integrated_readings) as leituras
)
select json_build_object(
  'gate_6_3_ok', (approvers = 4 and approvers_uids_distintos = 2 and holos_v2_status = 'aprovado'
                  and holos_v2_hash = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402' and holos_aprovacoes = '1:Daniel,2:Rodrigo'
                  and holos_aprovacoes_hash_ok = 2 and holos_aprovadores_distintos = 2 and li_v2_status = 'aprovado'
                  and li_v2_hash = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9' and li_aprovacoes = '1:Daniel,2:Rodrigo'
                  and li_aprovacoes_hash_ok = 2 and li_aprovadores_distintos = 2 and li_snapshots = 1
                  and historicas = 4 and historicas_sem_proveniencia = 4 and apps_com_pacote_nao_aprovado = 0),
  'hist_n', hist_n, 'approvers', approvers, 'approvers_uids_distintos', approvers_uids_distintos, 'approvers_papeis', approvers_papeis,
  'holos_pacotes', holos_pacotes, 'holos_v2_status', holos_v2_status, 'holos_v2_hash', holos_v2_hash, 'holos_v2_publicavel', holos_v2_publicavel,
  'holos_v2_perguntas', holos_v2_perguntas, 'holos_v2_sistemas', holos_v2_sistemas, 'holos_v2_faixas', holos_v2_faixas, 'holos_v2_vigente_desde', holos_v2_vigente_desde,
  'holos_aprovacoes', holos_aprovacoes, 'holos_aprovacoes_hash_ok', holos_aprovacoes_hash_ok, 'holos_aprovadores_distintos', holos_aprovadores_distintos,
  'li_v2_status', li_v2_status, 'li_v2_hash', li_v2_hash, 'li_aprovacoes', li_aprovacoes, 'li_aprovacoes_hash_ok', li_aprovacoes_hash_ok,
  'li_aprovadores_distintos', li_aprovadores_distintos, 'li_snapshots', li_snapshots,
  'historicas', historicas, 'historicas_sem_proveniencia', historicas_sem_proveniencia, 'historicas_fingerprint', historicas_fingerprint,
  'novas_sem_proveniencia', novas_sem_proveniencia, 'apps_com_pacote_nao_aprovado', apps_com_pacote_nao_aprovado, 'apps_com_holos_v2', apps_com_holos_v2, 'leituras', leituras
) as governanca from v;
