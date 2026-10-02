-- V1 — ETAPA 5.3: IDENTIDADE REAL NA DUPLA APROVACAO (HOLOSCAN e Leitura Integrada).
-- NAO APLICADA em producao. Entra depois de 130000..20261002100000.
--
-- Auditoria (Etapa 5.3): nas migrations 210000 (HOLOSCAN) e 20261002100000 (LI), a Aprovacao 1/2 validava
-- apenas a STRING p_responsavel ('Daniel' / 'Rodrigo') e gravava approved_by = auth.uid() sem conferir se
-- aquele uid estava autorizado para o papel: qualquer usuario autenticado conseguia informar "Daniel".
-- Correcao, compativel com Daniel -> Rodrigo, hash conferido, invalidacao, historico e acao final:
--   1. methodology_approvers: quem (auth user) e aprovador de qual escopo (holoscan | integrated_reading) e
--      etapa (1 | 2). Configurada SO por gestao tecnica (migration/SQL com os uids reais, que NAO estao no
--      repositorio). A aplicacao so le os proprios papeis. Nasce VAZIA: ate ser configurada, ninguem aprova.
--   2. Um usuario tem no maximo UM papel por escopo (unique (scope, user_id)): quatro olhos de verdade.
--   3. registrar_aprovacao_metodologica / registrar_aprovacao_li: o chamador (auth.uid()) tem de ser o aprovador
--      ativo daquele escopo+etapa; o nome continua sendo conferido (display/auditoria) e tem de bater com o papel.
--      approver_id e approved_by ficam na aprovacao (historico: nome + uid real).
--   4. homologar_pacote_li: so por aprovador ativo da LI (p_responsavel = seu display_name).
--      aprovar_pacote_metodologico (HOLOSCAN) continua sendo o ato do dono do pacote, depois das duas aprovacoes.
--   5. Aprovadores (Daniel/Rodrigo) podem LER o pacote HOLOSCAN em_revisao de outro profissional (e suas filhas,
--      aprovacoes e registros) para conferir o hash: antes, so o dono via o pacote — e por isso o dono digitava
--      os dois nomes. Nenhuma escrita nova e concedida.

-- ============================================================================
-- 1. APROVADORES AUTORIZADOS (gestao tecnica; vazia)
-- ============================================================================
create table public.methodology_approvers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete restrict,
  scope           text not null,
  approval_stage  smallint not null,
  display_name    text not null,
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  constraint approvers_scope check (scope in ('holoscan','integrated_reading')),
  constraint approvers_stage check (approval_stage in (1, 2)),
  constraint approvers_nome_por_etapa check ((approval_stage = 1 and display_name = 'Daniel') or (approval_stage = 2 and display_name = 'Rodrigo')),
  constraint approvers_sem_lideranca check (display_name !~* 'lideran'),
  constraint approvers_um_papel_por_escopo unique (scope, user_id)
);
create index approvers_lookup on public.methodology_approvers (scope, approval_stage) where active;
alter table public.methodology_approvers enable row level security;
create policy approvers_select_proprio on public.methodology_approvers for select to authenticated using (user_id = (select auth.uid()));
revoke all on table public.methodology_approvers from public, anon, authenticated;
grant select on table public.methodology_approvers to authenticated;

-- aprovador ativo do chamador para (escopo, etapa); null se nao autorizado
create or replace function public.aprovador_autorizado(p_scope text, p_stage integer)
returns public.methodology_approvers
language sql stable security definer set search_path = '' as $$
  select a.* from public.methodology_approvers a
   where a.user_id = auth.uid() and a.scope = p_scope and a.approval_stage = p_stage and a.active
   limit 1
$$;
create or replace function public.eh_aprovador(p_scope text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.methodology_approvers a where a.user_id = auth.uid() and a.scope = p_scope and a.active)
$$;
-- a tela so precisa saber os PROPRIOS papeis
create or replace function public.meus_papeis_aprovacao()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('scope', a.scope, 'approval_stage', a.approval_stage, 'display_name', a.display_name) order by a.scope, a.approval_stage), '[]'::jsonb)
    from public.methodology_approvers a where a.user_id = auth.uid() and a.active
$$;
revoke all on function public.aprovador_autorizado(text, integer), public.eh_aprovador(text), public.meus_papeis_aprovacao() from public, anon;
grant execute on function public.aprovador_autorizado(text, integer), public.eh_aprovador(text), public.meus_papeis_aprovacao() to authenticated;

-- ============================================================================
-- 2. APROVACOES GUARDAM O APROVADOR REAL (nome + uid ja estavam; agora tambem o papel autorizado)
-- ============================================================================
alter table public.methodology_package_approvals add column approver_id uuid references public.methodology_approvers(id);
alter table public.integrated_reading_package_approvals add column approver_id uuid references public.methodology_approvers(id);

-- ============================================================================
-- 3. APROVADOR LE O PACOTE HOLOSCAN em_revisao de outro profissional (para conferir o hash); nenhuma escrita
-- ============================================================================
create policy methodology_packages_aprovador_select on public.methodology_packages for select to authenticated
  using (status = 'em_revisao' and public.eh_aprovador('holoscan'));
do $$
declare t text;
begin
  foreach t in array array['methodology_questionnaire_editions','methodology_scales','methodology_systems','methodology_questions','methodology_associations','methodology_ranges','methodology_rules','methodology_homologation_records','methodology_package_approvals'] loop
    execute format('create policy %I_aprovador_select on public.%I for select to authenticated using (public.eh_aprovador(''holoscan'') and exists (select 1 from public.methodology_packages p where p.id = %I.package_id and p.status = ''em_revisao''))', t, t, t);
  end loop;
end $$;

-- ============================================================================
-- 4. HOLOSCAN: registrar aprovacao exige o aprovador autenticado do papel
-- ============================================================================
create or replace function public.registrar_aprovacao_metodologica(p_package_id uuid, p_etapa integer, p_responsavel text, p_justificativa text, p_content_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; h text; v jsonb; resp text := btrim(coalesce(p_responsavel, '')); a1 public.methodology_package_approvals%rowtype; novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario pela homologacao (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e do segundo responsavel / revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  -- identidade real: o usuario autenticado tem de ser o aprovador ativo deste escopo e etapa
  ap := public.aprovador_autorizado('holoscan', p_etapa);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado para a Aprovacao % do HOLOSCAN (%)', p_etapa, resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
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
  if p_etapa = 1 then
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (pk.nutritionist_id, p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  else
    select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) valida sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if a1.approved_by = uid then
      raise exception 'Aprovacao 2 tem de ser de outra pessoa (quatro olhos): o mesmo usuario registrou a Aprovacao 1' using errcode = 'P0001', hint = 'aprovador_nao_autorizado'; end if;
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (pk.nutritionist_id, p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid, ap.id) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status);
end;
$$;

-- ============================================================================
-- 5. LEITURA INTEGRADA: registrar aprovacao e homologar exigem o aprovador autenticado
-- ============================================================================
create or replace function public.registrar_aprovacao_li(p_package_id uuid, p_version integer, p_content_hash text, p_etapa integer, p_responsavel text, p_justificativa text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; h text; resp text := btrim(coalesce(p_responsavel, '')); a1 public.integrated_reading_package_approvals%rowtype; novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e da revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('integrated_reading', p_etapa);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado para a Aprovacao % da Leitura Integrada (%)', p_etapa, resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
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
  if p_etapa = 1 then
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  else
    select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if a1.approved_by = uid then
      raise exception 'Aprovacao 2 tem de ser de outra pessoa (quatro olhos): o mesmo usuario registrou a Aprovacao 1' using errcode = 'P0001', hint = 'aprovador_nao_autorizado'; end if;
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid, ap.id) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status, 'completude', public.li_validar_completude(p_package_id));
end;
$$;

create or replace function public.homologar_pacote_li(p_package_id uuid, p_version integer, p_content_hash text, p_responsavel text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; v jsonb; h text; a1 public.integrated_reading_package_approvals%rowtype; a2 public.integrated_reading_package_approvals%rowtype;
        resp text := btrim(coalesce(p_responsavel, '')); snap jsonb; sid uuid; prov jsonb; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if resp ~* 'lideran' or resp not in ('Daniel', 'Rodrigo') then raise exception 'homologacao e ato de Daniel ou Rodrigo (nunca da "Liderança do método HOLOSCAN")' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  select a.* into ap from public.methodology_approvers a where a.user_id = uid and a.scope = 'integrated_reading' and a.active limit 1;
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e aprovador autorizado da Leitura Integrada (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
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
  select * into a2 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null;
  if a1.id is null or a2.id is null or a1.package_version <> pk.version or a2.package_version <> pk.version or a1.content_hash <> h or a2.content_hash <> h or a2.approved_at < a1.approved_at then
    raise exception 'homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) vigentes sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  snap := public.li_conteudo_canonico(p_package_id);
  prov := jsonb_build_object('aprovacao_1', jsonb_build_object('id', a1.id, 'responsavel', a1.responsible, 'papel', a1.role, 'em', a1.approved_at, 'justificativa', a1.justification, 'approved_by', a1.approved_by),
                             'aprovacao_2', jsonb_build_object('id', a2.id, 'responsavel', a2.responsible, 'papel', a2.role, 'em', a2.approved_at, 'justificativa', a2.justification, 'approved_by', a2.approved_by),
                             'homologado_por', resp, 'homologado_por_uid', uid, 'homologado_em', now(), 'content_hash', h, 'completude', v);
  perform set_config('holohacking.li_homologar', p_package_id::text, true);
  insert into public.integrated_reading_package_snapshots (package_id, package_version, content_hash, snapshot, approval_1, approval_2, homologated_by)
    values (p_package_id, pk.version, h, snap, a1.id, a2.id, uid) returning id into sid;
  update public.integrated_reading_rule_packages set status = 'aprovado', content_hash = h,
    responsible = 'Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)', approval_provenance = prov
    where id = p_package_id;
  perform set_config('holohacking.li_homologar', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'aprovacao_1', a1.id, 'aprovacao_2', a2.id, 'snapshot_id', sid, 'completude', v);
end;
$$;

-- ============================================================================
-- 6. NADA MUDA NOS DADOS: tabela de aprovadores vazia; nenhuma aprovacao criada
-- ============================================================================
do $$
begin
  if (select count(*) from public.methodology_approvers) <> 0 then raise exception 'aprovadores: a migration nao cadastra ninguem (gestao tecnica com os uids reais)'; end if;
  if (select count(*) from public.integrated_reading_package_approvals) <> 0 then raise exception 'aprovadores: nenhuma aprovacao LI pode nascer da migration'; end if;
end $$;
