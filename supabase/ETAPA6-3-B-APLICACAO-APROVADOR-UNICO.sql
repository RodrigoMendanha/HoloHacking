-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3-B — GOVERNANCA DE APROVADOR UNICO (Daniel): migration 20261003100000
-- Projeto alvo: Holohacking (sllhyymeeyoozokgbnuv). Executar INTEIRO, de uma vez, no SQL Editor (nada selecionado; Ctrl+End = COMMIT;).
-- Decisao: docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md (perda consciente dos quatro olhos; nenhuma segunda revisao simulada).
-- UMA transacao: guarda do estado real atual -> migration 20261003100000 -> 1 linha em supabase_migrations.schema_migrations
-- -> verificacao pos-aplicacao -> COMMIT. Qualquer falha aborta tudo: nada persiste.
-- Antes: backup/snapshot e supabase/ETAPA6-3-B-PREFLIGHT.sql com pode_aplicar = true. Depois: supabase/ETAPA6-3-B-POSTFLIGHT.sql.
-- NAO cria aprovacao, NAO homologa, NAO preenche reviewed_by, NAO apaga aprovador, NAO toca aplicacoes HOLOSCAN, scores, exames,
-- LI, nem a Aprovacao 1 ja registrada por Daniel no HOLOS-V1@2. Nenhum uid ou e-mail e impresso.
-- ============================================================================
BEGIN;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local idle_in_transaction_session_timeout = '60s';

-- ---------------------------------------------------------------------------
-- GUARDA (dentro da transacao): o banco tem de estar EXATAMENTE no estado real conferido em 2026-10-03
-- ---------------------------------------------------------------------------
create temp table _etapa63b_digitais (k text primary key, antes text not null) on commit drop;
do $guarda$
declare f jsonb; esperado jsonb := '{"hist_n":30,"hist_ultima":"20261002130000","n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":317,"papeis":"holoscan/1/Daniel/true,holoscan/2/Rodrigo/true,integrated_reading/1/Daniel/true,integrated_reading/2/Rodrigo/true","aprovadores_uids":2,"daniel_mesmo_uid_2_escopos":true,"met_pacotes":1,"holos":"HOLOS-V1@2:em_revisao","holos_hash":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_dono_e_daniel":true,"holos_reviewed_by_nulo":true,"met_aprovacoes":"1:Daniel:responsavel_primario:v2:vigente=true:hash_ok=true:uid_daniel=true:papel_daniel=true","met_aprovacoes_n":1,"met_registros":0,"li":"LI-V1@1:rascunho,LI-V1@2:em_revisao","li_hash":"fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9","li_aprovacoes":0,"li_snapshots":0,"holoscan_applications":4,"apps_com_proveniencia":0,"patients":5,"holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"auth_users":3,"leituras":0}'::jsonb; k text; dif text := '';
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261003100000') then
    raise exception 'ETAPA 6.3-B ABORTADA NA GUARDA: a versao 20261003100000 ja esta registrada (segunda execucao?)' using errcode = 'P0001', hint = 'etapa6_3_b_guarda';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'methodology_approvers' and column_name = 'deactivated_at') then
    raise exception 'ETAPA 6.3-B ABORTADA NA GUARDA: methodology_approvers.deactivated_at ja existe' using errcode = 'P0001', hint = 'etapa6_3_b_guarda';
  end if;
  select jsonb_build_object(
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
    'leituras', (select count(*) from public.integrated_readings)
  ) into f;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  if dif <> '' then raise exception 'ETAPA 6.3-B ABORTADA NA GUARDA: estado divergente do conferido -> %', dif using errcode = 'P0001', hint = 'etapa6_3_b_guarda'; end if;
  insert into _etapa63b_digitais (k, antes) values
    ('apps', (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('met_aprovacoes', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_pacote', (select md5(coalesce(string_agg((to_jsonb(p) - 'governance_regime')::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('daniel', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, active, notes, created_at, created_by from public.methodology_approvers where approval_stage = 1) r)),
    ('rodrigo_identidade', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, notes, created_at, created_by from public.methodology_approvers where approval_stage = 2) r)),
    ('lab_results', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r));
  raise notice 'ETAPA 6.3-B: guarda ok (30 migrations; 4 papeis ativos; HOLOS-V1@2 em_revisao 7af1dae6 com 1 aprovacao de Daniel; LI 0 aprovacoes; 4 aplicacoes sem proveniencia)';
end $guarda$;

-- ---------------------------------------------------------------------------
-- MIGRATION: 20261003100000_governanca_aprovador_unico.sql
-- ---------------------------------------------------------------------------
-- V1 — GOVERNANCA DE APROVADOR UNICO (Daniel) para HOLOSCAN e Leitura Integrada.
-- NAO APLICADA em producao. Entra depois de 130000..20261002130000.
-- Decisao formal: docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md
--
-- A V1 deixa de usar dupla aprovacao (Daniel -> Rodrigo) e passa a ter UM aprovador/homologador: Daniel.
-- A perda do controle de quatro olhos e uma decisao CONSCIENTE e registrada. Por isso nada aqui simula uma
-- segunda revisao:
--   1. methodology_approvers: os papeis de etapa 2 (Rodrigo) sao DESATIVADOS (active = false, com data e motivo),
--      nunca apagados. Etapa 2 ativa passa a ser impossivel (check). Historico preservado.
--   2. Aprovacoes: so existe a Aprovacao 1 (Daniel, responsavel_primario). Etapa 2 e recusada pelas RPCs
--      (hint etapa_descontinuada) e pelas tabelas (check step = 1). Aprovacoes ja registradas nao mudam.
--   3. HOLOSCAN: methodology_packages.governance_regime registra o regime. No regime 'aprovador_unico',
--      reviewed_by / reviewed_at (segundo revisor) ficam NULOS — nunca preenchidos com o proprio Daniel.
--      Homologar (aprovar_pacote_metodologico) exige: chamador = dono do pacote E aprovador ativo holoscan/1;
--      Aprovacao 1 vigente sobre a versao e o hash atuais; validador sem erros.
--   4. Leitura Integrada: snapshot com approval_2 NULO e governance_regime = 'aprovador_unico'; a proveniencia
--      registra o regime e nao tem aprovacao_2. Homologar exige aprovador ativo integrated_reading/1.
--   5. Nao muda: hashes (metodologia_hash_conteudo e li_hash_conteudo nao leem as colunas novas), triggers de
--      imutabilidade, invalidacao, regra clinica ou metodologica, aplicacoes historicas.

-- ============================================================================
-- 1. APROVADORES: desativacao auditavel (nunca exclusao)
-- ============================================================================
alter table public.methodology_approvers add column deactivated_at timestamptz;
alter table public.methodology_approvers add column deactivation_reason text;
alter table public.methodology_approvers add constraint approvers_desativacao_coerente check (
  (active and deactivated_at is null and deactivation_reason is null)
  or (not active and deactivated_at is not null and length(btrim(coalesce(deactivation_reason, ''))) > 0));

update public.methodology_approvers
   set active = false, deactivated_at = now(),
       deactivation_reason = 'Governanca V1 de aprovador unico (Daniel): etapa 2 (revisao final) descontinuada por decisao consciente; '
         || 'registro preservado como historico. Ver docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md'
 where approval_stage = 2 and display_name = 'Rodrigo' and active;

-- etapa 2 nao pode voltar a ser ativa sem nova decisao (nova migration)
alter table public.methodology_approvers add constraint approvers_somente_etapa1_ativa check (approval_stage = 1 or not active);

-- ============================================================================
-- 2. APROVACOES: so a Aprovacao 1 existe a partir daqui (as ja registradas seguem intactas)
-- ============================================================================
alter table public.methodology_package_approvals add constraint methodology_approvals_etapa_unica check (step = 1);
alter table public.integrated_reading_package_approvals add constraint li_approvals_etapa_unica check (step = 1);

-- ============================================================================
-- 3. HOLOSCAN: regime explicito; segundo revisor nulo no aprovador unico
-- ============================================================================
alter table public.methodology_packages add column governance_regime text;
alter table public.methodology_packages add constraint methodology_packages_regime_valido
  check (governance_regime is null or governance_regime in ('dupla_aprovacao', 'aprovador_unico'));
alter table public.methodology_packages drop constraint methodology_packages_aprovado_completo;
-- pacotes aprovados/retirados antes desta migration (regime nulo) continuam sob a regra da dupla aprovacao
alter table public.methodology_packages add constraint methodology_packages_aprovado_completo check (
  status not in ('aprovado','retirado') or (
    content_hash is not null and responsible is not null and effective_from is not null
    and approved_at is not null and approved_by is not null
    and (
      (governance_regime = 'aprovador_unico' and reviewed_by is null and reviewed_at is null)
      or (coalesce(governance_regime, 'dupla_aprovacao') = 'dupla_aprovacao' and reviewed_by is not null and reviewed_at is not null))));

-- ============================================================================
-- 4. LEITURA INTEGRADA: snapshot sem Aprovacao 2 no aprovador unico
-- ============================================================================
-- default so para linhas pre-existentes (que, se existirem, tem approval_2); depois o regime e sempre explicito
alter table public.integrated_reading_package_snapshots add column governance_regime text not null default 'dupla_aprovacao';
alter table public.integrated_reading_package_snapshots alter column governance_regime drop default;
alter table public.integrated_reading_package_snapshots alter column approval_2 drop not null;
alter table public.integrated_reading_package_snapshots add constraint li_snapshots_regime check (
  (governance_regime = 'aprovador_unico' and approval_2 is null)
  or (governance_regime = 'dupla_aprovacao' and approval_2 is not null));

-- ============================================================================
-- 5. HOLOSCAN: registrar aprovacao — so a Aprovacao 1 (Daniel)
-- ============================================================================
create or replace function public.registrar_aprovacao_metodologica(p_package_id uuid, p_etapa integer, p_responsavel text, p_justificativa text, p_content_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; h text; v jsonb; resp text := btrim(coalesce(p_responsavel, '')); novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa = 2 then raise exception 'Aprovacao 2 descontinuada: a V1 tem aprovador unico (Daniel); nao ha segunda revisao' using errcode = 'P0001', hint = 'etapa_descontinuada'; end if;
  if p_etapa is null or p_etapa <> 1 then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if resp <> 'Daniel' then raise exception 'a aprovacao e do aprovador unico da V1 (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('holoscan', 1);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado do HOLOSCAN (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'aprovacao bloqueada pelo validador: % erro(s)', v->>'total_erros' using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  update public.methodology_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
    raise exception 'Aprovacao ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
  insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
    values (pk.nutritionist_id, p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', 1,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status, 'regime', 'aprovador_unico');
end;
$$;
revoke all on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) from public, anon;
grant execute on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) to authenticated;

-- ============================================================================
-- 6. HOLOSCAN: homologar — dono do pacote E aprovador ativo holoscan/1; so a Aprovacao 1
-- ============================================================================
-- p_registro (opcional): { effective_from? }. O responsavel NAO vem do chamador: vem da aprovacao.
create or replace function public.aprovar_pacote_metodologico(p_package_id uuid, p_registro jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; v jsonb; h text; a1 public.methodology_package_approvals%rowtype; resp text; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  ap := public.aprovador_autorizado('holoscan', 1);
  if ap.id is null then
    raise exception 'homologar o HOLOSCAN e ato do aprovador unico ativo (Daniel)' using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser aprovado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left((v->'erros')::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  if a1.id is null or a1.package_version <> pk.version or a1.content_hash <> h then
    raise exception 'homologacao exige a Aprovacao (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  resp := 'Daniel (aprovador único — responsável metodológico)';
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', resp, current_date, 'aprovador unico',
    'Aprovação única (regime aprovador_unico, sem segunda revisão): ' || a1.justification,
    'regime aprovador_unico; aprovacao ' || a1.id || '; content_hash ' || h || '; validar_pacote_metodologico: 0 erros');
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', governance_regime = 'aprovador_unico',
    approved_at = now(), approved_by = a1.approved_by, reviewed_by = null, reviewed_at = null,
    responsible = resp, justification = coalesce(justification, 'aprovador unico'),
    effective_from = coalesce((p_registro->>'effective_from')::date, effective_from, current_date), content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'regime', 'aprovador_unico', 'content_hash', h, 'aprovacao_1', a1.id, 'validacao', v);
end;
$$;
revoke all on function public.aprovar_pacote_metodologico(uuid, jsonb) from public, anon;
grant execute on function public.aprovar_pacote_metodologico(uuid, jsonb) to authenticated;

-- ============================================================================
-- 7. LEITURA INTEGRADA: registrar aprovacao — so a Aprovacao 1 (Daniel)
-- ============================================================================
create or replace function public.registrar_aprovacao_li(p_package_id uuid, p_version integer, p_content_hash text, p_etapa integer, p_responsavel text, p_justificativa text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; h text; resp text := btrim(coalesce(p_responsavel, '')); novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa = 2 then raise exception 'Aprovacao 2 descontinuada: a V1 tem aprovador unico (Daniel); nao ha segunda revisao' using errcode = 'P0001', hint = 'etapa_descontinuada'; end if;
  if p_etapa is null or p_etapa <> 1 then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if resp <> 'Daniel' then raise exception 'a aprovacao e do aprovador unico da V1 (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('integrated_reading', 1);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado da Leitura Integrada (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual do pacote (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  update public.integrated_reading_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
    raise exception 'Aprovacao ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
  insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
    values (p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', 1,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status, 'regime', 'aprovador_unico',
    'completude', public.li_validar_completude(p_package_id));
end;
$$;

-- ============================================================================
-- 8. LEITURA INTEGRADA: homologar — aprovador ativo integrated_reading/1; so a Aprovacao 1
-- ============================================================================
create or replace function public.homologar_pacote_li(p_package_id uuid, p_version integer, p_content_hash text, p_responsavel text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; v jsonb; h text; a1 public.integrated_reading_package_approvals%rowtype;
        resp text := btrim(coalesce(p_responsavel, '')); snap jsonb; sid uuid; prov jsonb; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if resp ~* 'lideran' or resp <> 'Daniel' then raise exception 'homologacao e ato do aprovador unico da V1 (Daniel; nunca da "Liderança do método HOLOSCAN")' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('integrated_reading', 1);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado da Leitura Integrada (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser homologado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  v := public.li_validar_completude(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'metodologia da leitura integrada incompleta: % bloqueio(s) — %', v->>'total_bloqueios', left((v->'bloqueios')::text, 400) using errcode = 'P0001', hint = 'metodologia_incompleta';
  end if;
  select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  if a1.id is null or a1.package_version <> pk.version or a1.content_hash <> h then
    raise exception 'homologacao exige a Aprovacao (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  snap := public.li_conteudo_canonico(p_package_id);
  prov := jsonb_build_object('regime', 'aprovador_unico', 'segunda_revisao', false,
                             'aprovacao_1', jsonb_build_object('id', a1.id, 'responsavel', a1.responsible, 'papel', a1.role, 'em', a1.approved_at, 'justificativa', a1.justification, 'approved_by', a1.approved_by),
                             'homologado_por', resp, 'homologado_por_uid', uid, 'homologado_em', now(), 'content_hash', h, 'completude', v);
  perform set_config('holohacking.li_homologar', p_package_id::text, true);
  insert into public.integrated_reading_package_snapshots (package_id, package_version, content_hash, snapshot, approval_1, approval_2, homologated_by, governance_regime)
    values (p_package_id, pk.version, h, snap, a1.id, null, uid, 'aprovador_unico') returning id into sid;
  update public.integrated_reading_rule_packages set status = 'aprovado', content_hash = h,
    responsible = 'Daniel (aprovador único — responsável metodológico)', approval_provenance = prov
    where id = p_package_id;
  perform set_config('holohacking.li_homologar', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'regime', 'aprovador_unico', 'content_hash', h, 'aprovacao_1', a1.id, 'snapshot_id', sid, 'completude', v);
end;
$$;

-- ============================================================================
-- 9. CONFERENCIA: nenhuma etapa 2 ativa; nenhuma aprovacao criada ou alterada pela migration
-- ============================================================================
do $$
begin
  if exists (select 1 from public.methodology_approvers where approval_stage = 2 and active) then raise exception 'aprovador unico: ainda ha aprovador de etapa 2 ativo'; end if;
  if exists (select 1 from public.methodology_approvers where approval_stage = 2 and deactivated_at is null) then raise exception 'aprovador unico: etapa 2 sem registro de desativacao'; end if;
  if exists (select 1 from public.methodology_package_approvals where step <> 1) then raise exception 'aprovador unico: ha aprovacao HOLOSCAN de etapa 2'; end if;
  if exists (select 1 from public.integrated_reading_package_approvals where step <> 1) then raise exception 'aprovador unico: ha aprovacao LI de etapa 2'; end if;
  if exists (select 1 from public.methodology_packages where governance_regime is not null) then raise exception 'aprovador unico: nenhum pacote recebe regime pela migration'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- HISTORICO: 1 linha nova em supabase_migrations.schema_migrations, no mesmo formato das 14 linhas da Etapa 6.2
-- (statements = array de 1 elemento com o SQL do arquivo; created_by, idempotency_key e rollback = null). As 30 linhas existentes nao sao tocadas.
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261003100000', 'governanca_aprovador_unico', array[$hist_20261003100000$-- V1 — GOVERNANCA DE APROVADOR UNICO (Daniel) para HOLOSCAN e Leitura Integrada.
-- NAO APLICADA em producao. Entra depois de 130000..20261002130000.
-- Decisao formal: docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md
--
-- A V1 deixa de usar dupla aprovacao (Daniel -> Rodrigo) e passa a ter UM aprovador/homologador: Daniel.
-- A perda do controle de quatro olhos e uma decisao CONSCIENTE e registrada. Por isso nada aqui simula uma
-- segunda revisao:
--   1. methodology_approvers: os papeis de etapa 2 (Rodrigo) sao DESATIVADOS (active = false, com data e motivo),
--      nunca apagados. Etapa 2 ativa passa a ser impossivel (check). Historico preservado.
--   2. Aprovacoes: so existe a Aprovacao 1 (Daniel, responsavel_primario). Etapa 2 e recusada pelas RPCs
--      (hint etapa_descontinuada) e pelas tabelas (check step = 1). Aprovacoes ja registradas nao mudam.
--   3. HOLOSCAN: methodology_packages.governance_regime registra o regime. No regime 'aprovador_unico',
--      reviewed_by / reviewed_at (segundo revisor) ficam NULOS — nunca preenchidos com o proprio Daniel.
--      Homologar (aprovar_pacote_metodologico) exige: chamador = dono do pacote E aprovador ativo holoscan/1;
--      Aprovacao 1 vigente sobre a versao e o hash atuais; validador sem erros.
--   4. Leitura Integrada: snapshot com approval_2 NULO e governance_regime = 'aprovador_unico'; a proveniencia
--      registra o regime e nao tem aprovacao_2. Homologar exige aprovador ativo integrated_reading/1.
--   5. Nao muda: hashes (metodologia_hash_conteudo e li_hash_conteudo nao leem as colunas novas), triggers de
--      imutabilidade, invalidacao, regra clinica ou metodologica, aplicacoes historicas.

-- ============================================================================
-- 1. APROVADORES: desativacao auditavel (nunca exclusao)
-- ============================================================================
alter table public.methodology_approvers add column deactivated_at timestamptz;
alter table public.methodology_approvers add column deactivation_reason text;
alter table public.methodology_approvers add constraint approvers_desativacao_coerente check (
  (active and deactivated_at is null and deactivation_reason is null)
  or (not active and deactivated_at is not null and length(btrim(coalesce(deactivation_reason, ''))) > 0));

update public.methodology_approvers
   set active = false, deactivated_at = now(),
       deactivation_reason = 'Governanca V1 de aprovador unico (Daniel): etapa 2 (revisao final) descontinuada por decisao consciente; '
         || 'registro preservado como historico. Ver docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md'
 where approval_stage = 2 and display_name = 'Rodrigo' and active;

-- etapa 2 nao pode voltar a ser ativa sem nova decisao (nova migration)
alter table public.methodology_approvers add constraint approvers_somente_etapa1_ativa check (approval_stage = 1 or not active);

-- ============================================================================
-- 2. APROVACOES: so a Aprovacao 1 existe a partir daqui (as ja registradas seguem intactas)
-- ============================================================================
alter table public.methodology_package_approvals add constraint methodology_approvals_etapa_unica check (step = 1);
alter table public.integrated_reading_package_approvals add constraint li_approvals_etapa_unica check (step = 1);

-- ============================================================================
-- 3. HOLOSCAN: regime explicito; segundo revisor nulo no aprovador unico
-- ============================================================================
alter table public.methodology_packages add column governance_regime text;
alter table public.methodology_packages add constraint methodology_packages_regime_valido
  check (governance_regime is null or governance_regime in ('dupla_aprovacao', 'aprovador_unico'));
alter table public.methodology_packages drop constraint methodology_packages_aprovado_completo;
-- pacotes aprovados/retirados antes desta migration (regime nulo) continuam sob a regra da dupla aprovacao
alter table public.methodology_packages add constraint methodology_packages_aprovado_completo check (
  status not in ('aprovado','retirado') or (
    content_hash is not null and responsible is not null and effective_from is not null
    and approved_at is not null and approved_by is not null
    and (
      (governance_regime = 'aprovador_unico' and reviewed_by is null and reviewed_at is null)
      or (coalesce(governance_regime, 'dupla_aprovacao') = 'dupla_aprovacao' and reviewed_by is not null and reviewed_at is not null))));

-- ============================================================================
-- 4. LEITURA INTEGRADA: snapshot sem Aprovacao 2 no aprovador unico
-- ============================================================================
-- default so para linhas pre-existentes (que, se existirem, tem approval_2); depois o regime e sempre explicito
alter table public.integrated_reading_package_snapshots add column governance_regime text not null default 'dupla_aprovacao';
alter table public.integrated_reading_package_snapshots alter column governance_regime drop default;
alter table public.integrated_reading_package_snapshots alter column approval_2 drop not null;
alter table public.integrated_reading_package_snapshots add constraint li_snapshots_regime check (
  (governance_regime = 'aprovador_unico' and approval_2 is null)
  or (governance_regime = 'dupla_aprovacao' and approval_2 is not null));

-- ============================================================================
-- 5. HOLOSCAN: registrar aprovacao — so a Aprovacao 1 (Daniel)
-- ============================================================================
create or replace function public.registrar_aprovacao_metodologica(p_package_id uuid, p_etapa integer, p_responsavel text, p_justificativa text, p_content_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; h text; v jsonb; resp text := btrim(coalesce(p_responsavel, '')); novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa = 2 then raise exception 'Aprovacao 2 descontinuada: a V1 tem aprovador unico (Daniel); nao ha segunda revisao' using errcode = 'P0001', hint = 'etapa_descontinuada'; end if;
  if p_etapa is null or p_etapa <> 1 then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if resp <> 'Daniel' then raise exception 'a aprovacao e do aprovador unico da V1 (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('holoscan', 1);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado do HOLOSCAN (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'aprovacao bloqueada pelo validador: % erro(s)', v->>'total_erros' using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  update public.methodology_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
    raise exception 'Aprovacao ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
  insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
    values (pk.nutritionist_id, p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', 1,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status, 'regime', 'aprovador_unico');
end;
$$;
revoke all on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) from public, anon;
grant execute on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) to authenticated;

-- ============================================================================
-- 6. HOLOSCAN: homologar — dono do pacote E aprovador ativo holoscan/1; so a Aprovacao 1
-- ============================================================================
-- p_registro (opcional): { effective_from? }. O responsavel NAO vem do chamador: vem da aprovacao.
create or replace function public.aprovar_pacote_metodologico(p_package_id uuid, p_registro jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; v jsonb; h text; a1 public.methodology_package_approvals%rowtype; resp text; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  ap := public.aprovador_autorizado('holoscan', 1);
  if ap.id is null then
    raise exception 'homologar o HOLOSCAN e ato do aprovador unico ativo (Daniel)' using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser aprovado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left((v->'erros')::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  if a1.id is null or a1.package_version <> pk.version or a1.content_hash <> h then
    raise exception 'homologacao exige a Aprovacao (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  resp := 'Daniel (aprovador único — responsável metodológico)';
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', resp, current_date, 'aprovador unico',
    'Aprovação única (regime aprovador_unico, sem segunda revisão): ' || a1.justification,
    'regime aprovador_unico; aprovacao ' || a1.id || '; content_hash ' || h || '; validar_pacote_metodologico: 0 erros');
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', governance_regime = 'aprovador_unico',
    approved_at = now(), approved_by = a1.approved_by, reviewed_by = null, reviewed_at = null,
    responsible = resp, justification = coalesce(justification, 'aprovador unico'),
    effective_from = coalesce((p_registro->>'effective_from')::date, effective_from, current_date), content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'regime', 'aprovador_unico', 'content_hash', h, 'aprovacao_1', a1.id, 'validacao', v);
end;
$$;
revoke all on function public.aprovar_pacote_metodologico(uuid, jsonb) from public, anon;
grant execute on function public.aprovar_pacote_metodologico(uuid, jsonb) to authenticated;

-- ============================================================================
-- 7. LEITURA INTEGRADA: registrar aprovacao — so a Aprovacao 1 (Daniel)
-- ============================================================================
create or replace function public.registrar_aprovacao_li(p_package_id uuid, p_version integer, p_content_hash text, p_etapa integer, p_responsavel text, p_justificativa text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; h text; resp text := btrim(coalesce(p_responsavel, '')); novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa = 2 then raise exception 'Aprovacao 2 descontinuada: a V1 tem aprovador unico (Daniel); nao ha segunda revisao' using errcode = 'P0001', hint = 'etapa_descontinuada'; end if;
  if p_etapa is null or p_etapa <> 1 then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if resp <> 'Daniel' then raise exception 'a aprovacao e do aprovador unico da V1 (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('integrated_reading', 1);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado da Leitura Integrada (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual do pacote (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  update public.integrated_reading_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
    raise exception 'Aprovacao ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
  insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
    values (p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', 1,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status, 'regime', 'aprovador_unico',
    'completude', public.li_validar_completude(p_package_id));
end;
$$;

-- ============================================================================
-- 8. LEITURA INTEGRADA: homologar — aprovador ativo integrated_reading/1; so a Aprovacao 1
-- ============================================================================
create or replace function public.homologar_pacote_li(p_package_id uuid, p_version integer, p_content_hash text, p_responsavel text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; v jsonb; h text; a1 public.integrated_reading_package_approvals%rowtype;
        resp text := btrim(coalesce(p_responsavel, '')); snap jsonb; sid uuid; prov jsonb; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if resp ~* 'lideran' or resp <> 'Daniel' then raise exception 'homologacao e ato do aprovador unico da V1 (Daniel; nunca da "Liderança do método HOLOSCAN")' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('integrated_reading', 1);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado da Leitura Integrada (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser homologado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  v := public.li_validar_completude(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'metodologia da leitura integrada incompleta: % bloqueio(s) — %', v->>'total_bloqueios', left((v->'bloqueios')::text, 400) using errcode = 'P0001', hint = 'metodologia_incompleta';
  end if;
  select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  if a1.id is null or a1.package_version <> pk.version or a1.content_hash <> h then
    raise exception 'homologacao exige a Aprovacao (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  snap := public.li_conteudo_canonico(p_package_id);
  prov := jsonb_build_object('regime', 'aprovador_unico', 'segunda_revisao', false,
                             'aprovacao_1', jsonb_build_object('id', a1.id, 'responsavel', a1.responsible, 'papel', a1.role, 'em', a1.approved_at, 'justificativa', a1.justification, 'approved_by', a1.approved_by),
                             'homologado_por', resp, 'homologado_por_uid', uid, 'homologado_em', now(), 'content_hash', h, 'completude', v);
  perform set_config('holohacking.li_homologar', p_package_id::text, true);
  insert into public.integrated_reading_package_snapshots (package_id, package_version, content_hash, snapshot, approval_1, approval_2, homologated_by, governance_regime)
    values (p_package_id, pk.version, h, snap, a1.id, null, uid, 'aprovador_unico') returning id into sid;
  update public.integrated_reading_rule_packages set status = 'aprovado', content_hash = h,
    responsible = 'Daniel (aprovador único — responsável metodológico)', approval_provenance = prov
    where id = p_package_id;
  perform set_config('holohacking.li_homologar', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'regime', 'aprovador_unico', 'content_hash', h, 'aprovacao_1', a1.id, 'snapshot_id', sid, 'completude', v);
end;
$$;

-- ============================================================================
-- 9. CONFERENCIA: nenhuma etapa 2 ativa; nenhuma aprovacao criada ou alterada pela migration
-- ============================================================================
do $$
begin
  if exists (select 1 from public.methodology_approvers where approval_stage = 2 and active) then raise exception 'aprovador unico: ainda ha aprovador de etapa 2 ativo'; end if;
  if exists (select 1 from public.methodology_approvers where approval_stage = 2 and deactivated_at is null) then raise exception 'aprovador unico: etapa 2 sem registro de desativacao'; end if;
  if exists (select 1 from public.methodology_package_approvals where step <> 1) then raise exception 'aprovador unico: ha aprovacao HOLOSCAN de etapa 2'; end if;
  if exists (select 1 from public.integrated_reading_package_approvals where step <> 1) then raise exception 'aprovador unico: ha aprovacao LI de etapa 2'; end if;
  if exists (select 1 from public.methodology_packages where governance_regime is not null) then raise exception 'aprovador unico: nenhum pacote recebe regime pela migration'; end if;
end $$;
$hist_20261003100000$]);

-- ---------------------------------------------------------------------------
-- VERIFICACAO POS-APLICACAO (dentro da transacao): qualquer divergencia -> RAISE -> nada persiste
-- ---------------------------------------------------------------------------
do $pos$
declare f jsonb; esperado jsonb := '{"hist_n":31,"hist_ultima":"20261003100000","n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":323,"papeis":"holoscan/1/Daniel/true,holoscan/2/Rodrigo/false,integrated_reading/1/Daniel/true,integrated_reading/2/Rodrigo/false","aprovadores_uids":2,"daniel_mesmo_uid_2_escopos":true,"met_pacotes":1,"holos":"HOLOS-V1@2:em_revisao","holos_hash":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_dono_e_daniel":true,"holos_reviewed_by_nulo":true,"met_aprovacoes":"1:Daniel:responsavel_primario:v2:vigente=true:hash_ok=true:uid_daniel=true:papel_daniel=true","met_aprovacoes_n":1,"met_registros":0,"li":"LI-V1@1:rascunho,LI-V1@2:em_revisao","li_hash":"fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9","li_aprovacoes":0,"li_snapshots":0,"holoscan_applications":4,"apps_com_proveniencia":0,"patients":5,"holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"auth_users":3,"leituras":0}'::jsonb; k text; dif text := ''; dg record;
begin
  select jsonb_build_object(
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
    'snapshot_approval_2_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'integrated_reading_package_snapshots' and column_name = 'approval_2'),
    'rpcs_aprovador_unico', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
       and ((p.proname in ('registrar_aprovacao_metodologica', 'registrar_aprovacao_li') and p.prosrc like '%etapa_descontinuada%')
         or (p.proname in ('aprovar_pacote_metodologico', 'homologar_pacote_li') and p.prosrc like '%aprovador_unico%' and p.prosrc not like '%a2.%')))
  ) into f;
  esperado := esperado || '{"etapa2_ativos":0,"rodrigo_desativados_com_data_e_motivo":2,"aprovadores_total":4,"aprovacoes_etapa2":0,"holos_regime":"nulo","snapshot_approval_2_nullable":"YES","rpcs_aprovador_unico":4}'::jsonb;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  -- impressoes digitais: aplicacoes, scores, Aprovacao 1, pacote HOLOS, Daniel, identidade de Rodrigo, exames e pacotes LI identicos ao capturado na guarda
  for dg in select g.k, g.antes, d.depois from _etapa63b_digitais g join (values
    ('apps', (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('met_aprovacoes', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_pacote', (select md5(coalesce(string_agg((to_jsonb(p) - 'governance_regime')::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('daniel', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, active, notes, created_at, created_by from public.methodology_approvers where approval_stage = 1) r)),
    ('rodrigo_identidade', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, notes, created_at, created_by from public.methodology_approvers where approval_stage = 2) r)),
    ('lab_results', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r))) as d(k, depois) on d.k = g.k loop
    if dg.antes is distinct from dg.depois then dif := dif || 'digital ' || dg.k || ' mudou; '; end if;
  end loop;
  if (select count(*) from _etapa63b_digitais) <> 8 then dif := dif || 'digitais incompletas; '; end if;
  if dif <> '' then raise exception 'ETAPA 6.3-B ABORTADA NA VERIFICACAO POS-APLICACAO: %', dif using errcode = 'P0001', hint = 'etapa6_3_b_pos'; end if;
  raise notice 'ETAPA 6.3-B: verificacao pos-aplicacao ok (31 migrations; Rodrigo desativado x2 com data e motivo; Aprovacao 1 de Daniel intacta; 0 aprovacoes de etapa 2; 4 aplicacoes intactas)';
end $pos$;

-- ULTIMA INSTRUCAO: confirma tudo de uma vez. (Nao ha ROLLBACK no caminho de sucesso; toda falha acima ja aborta a transacao.)
COMMIT;
