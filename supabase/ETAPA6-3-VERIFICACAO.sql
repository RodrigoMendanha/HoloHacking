-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3 — VERIFICACAO DE GOVERNANCA (SOMENTE LEITURA; nao mostra uid nem e-mail)
-- Rodar antes e depois de cada passo do gate 6.3. Valores esperados por passo em docs/v1/ETAPA6-3-PLANO-GOVERNANCA-E-DEPLOY.md.
-- Hash esperado HOLOS-V1@2 (metodologia_hash_conteudo): 7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402
-- Hash esperado LI-V1@2 (li_hash_conteudo):             fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9
-- ============================================================================
select json_build_object(
  'hist_n', (select count(*) from supabase_migrations.schema_migrations),
  'aprovadores', (select coalesce(string_agg(scope || '/' || approval_stage || '/' || display_name || case when active then '' else '(inativo)' end, ',' order by scope, approval_stage), 'nenhum') from public.methodology_approvers),
  'aprovadores_contas_distintas', (select count(distinct user_id) from public.methodology_approvers),
  'holos_pacotes', (select coalesce(string_agg(code || '@' || version || ':' || status, ',' order by version), 'nenhum') from public.methodology_packages where code = 'HOLOS-V1'),
  'holos_v2_donos', (select count(distinct nutritionist_id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
  'holos_v2_hash_sql', (select public.metodologia_hash_conteudo(id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2 order by created_at limit 1),
  'holos_v2_hash_ok', (select public.metodologia_hash_conteudo(id) = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402' from public.methodology_packages where code = 'HOLOS-V1' and version = 2 order by created_at limit 1),
  'holos_v2_publicavel', (select public.validar_pacote_metodologico(id)->>'publicavel' from public.methodology_packages where code = 'HOLOS-V1' and version = 2 order by created_at limit 1),
  'holos_v2_contagens', (select json_build_object('perguntas', (select count(*) from public.methodology_questions q where q.package_id = p.id), 'sistemas', (select count(*) from public.methodology_systems s where s.package_id = p.id), 'faixas', (select count(*) from public.methodology_ranges r where r.package_id = p.id)) from public.methodology_packages p where code = 'HOLOS-V1' and version = 2 order by created_at limit 1),
  'holos_v2_vigencia', (select effective_from::text || '..' || coalesce(effective_to::text, '') from public.methodology_packages where code = 'HOLOS-V1' and version = 2 and status = 'aprovado' limit 1),
  'holos_aprovacoes_vigentes', (select coalesce(string_agg(a.step || ':' || a.responsible, ',' order by a.step), 'nenhuma') from public.methodology_package_approvals a join public.methodology_packages p on p.id = a.package_id where p.code = 'HOLOS-V1' and a.invalidated_at is null),
  'holos_aprovacoes_hash_ok', (select bool_and(a.content_hash = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402') from public.methodology_package_approvals a join public.methodology_packages p on p.id = a.package_id where p.code = 'HOLOS-V1' and a.invalidated_at is null),
  'holos_quatro_olhos', (select count(distinct a.approved_by) = count(*) from public.methodology_package_approvals a join public.methodology_packages p on p.id = a.package_id where p.code = 'HOLOS-V1' and a.invalidated_at is null),
  'li_pacotes', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
  'li_v2_hash_ok', (select public.li_hash_conteudo(id) = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9' from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
  'li_aprovacoes_vigentes', (select coalesce(string_agg(step || ':' || responsible, ',' order by step), 'nenhuma') from public.integrated_reading_package_approvals where invalidated_at is null),
  'li_quatro_olhos', (select count(distinct approved_by) = count(*) from public.integrated_reading_package_approvals where invalidated_at is null),
  'li_snapshots', (select count(*) from public.integrated_reading_package_snapshots),
  'apps_total', (select count(*) from public.holoscan_applications),
  'apps_historicas_sem_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is null),
  'apps_com_holos_v2', (select count(*) from public.holoscan_applications a join public.methodology_packages p on p.id = a.methodology_package_id where p.code = 'HOLOS-V1' and p.version = 2 and a.methodology_package_version = 2),
  'apps_com_pacote_nao_aprovado', (select count(*) from public.holoscan_applications a join public.methodology_packages p on p.id = a.methodology_package_id where p.status <> 'aprovado'),
  'ultima_app_tem_proveniencia', (select methodology_package_id is not null from public.holoscan_applications order by created_at desc limit 1),
  'leituras', (select count(*) from public.integrated_readings)
) as governanca;
