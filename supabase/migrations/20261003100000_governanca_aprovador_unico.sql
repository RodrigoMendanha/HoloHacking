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
