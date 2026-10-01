-- V1 — HOMOLOGACAO METODOLOGICA COM DUPLA APROVACAO (ordem obrigatoria).
-- NAO APLICADA em producao. Entra depois de 130000..200000.
--
--   Aprovacao 1: responsavel = Daniel  · papel = responsavel primario pela homologacao
--   Aprovacao 2: responsavel = Rodrigo · papel = segundo responsavel / revisao final
--
-- Regras:
--   1. Cada aprovacao e um ATO HUMANO registrado pela RPC registrar_aprovacao_metodologica,
--      sobre um package_id, uma version e um content_hash (calculado no servidor e
--      CONFERIDO contra o hash que a pessoa viu). Nada cria aprovacao automaticamente.
--   2. Aprovacao 2 so existe sobre uma Aprovacao 1 valida do MESMO package_id, version e
--      content_hash.
--   3. Se o pacote mudar (qualquer filha inserida/alterada/apagada, ou code/version do
--      pacote), as aprovacoes vigentes daquela versao sao INVALIDADAS (ficam como historico,
--      com motivo): o ciclo recomeca pela Aprovacao 1.
--   4. aprovar_pacote_metodologico so passa o pacote a 'aprovado' com as duas aprovacoes
--      validas sobre o conteudo atual. O registro de homologacao nomeia Daniel e Rodrigo.
--   5. Nenhuma aprovacao (nem registro de homologacao) pode ser atribuida a
--      "Liderança do método HOLOSCAN".

-- ============================================================================
-- 1. HASH DO CONTEUDO (o mesmo da aprovacao final; agora reutilizavel)
-- ============================================================================
create or replace function public.metodologia_hash_conteudo(p_package_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select encode(sha256(convert_to(jsonb_build_object(
    'questions', (select coalesce(jsonb_agg(to_jsonb(q) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' - 'edition_id' order by q.stable_id), '[]') from public.methodology_questions q where q.package_id = p_package_id),
    'associations', (select coalesce(jsonb_agg(to_jsonb(a) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by a.question_stable_id, a.destination_type, a.destination_id, a.role), '[]') from public.methodology_associations a where a.package_id = p_package_id),
    'ranges', (select coalesce(jsonb_agg(to_jsonb(f) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by f.destination_type, f.destination_id, f.lower_bound), '[]') from public.methodology_ranges f where f.package_id = p_package_id),
    'systems', (select coalesce(jsonb_agg(to_jsonb(s) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by s.code), '[]') from public.methodology_systems s where s.package_id = p_package_id),
    'scales', (select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by e.code), '[]') from public.methodology_scales e where e.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(to_jsonb(x) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by x.rule_type, x.target), '[]') from public.methodology_rules x where x.package_id = p_package_id),
    'editions', (select coalesce(jsonb_agg(to_jsonb(d) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by d.code, d.version), '[]') from public.methodology_questionnaire_editions d where d.package_id = p_package_id)
  )::text, 'UTF8')), 'hex')
$$;
revoke all on function public.metodologia_hash_conteudo(uuid) from public, anon;
grant execute on function public.metodologia_hash_conteudo(uuid) to authenticated;

-- ============================================================================
-- 2. APROVACOES
-- ============================================================================
create table public.methodology_package_approvals (
  id                 uuid primary key default gen_random_uuid(),
  nutritionist_id    uuid not null default auth.uid() references auth.users(id),
  package_id         uuid not null,
  package_version    integer not null,
  content_hash       text not null,
  step               smallint not null,
  role               text not null,
  responsible        text not null,
  justification      text not null,
  approved_by        uuid not null default auth.uid() references auth.users(id),
  approved_at        timestamptz not null default now(),
  invalidated_at     timestamptz,
  invalidated_reason text,
  created_at         timestamptz not null default now(),
  constraint methodology_approvals_ordem check (
    (step = 1 and role = 'responsavel_primario' and responsible = 'Daniel')
    or (step = 2 and role = 'revisao_final' and responsible = 'Rodrigo')),
  constraint methodology_approvals_sem_lideranca check (responsible !~* 'lideran'),
  constraint methodology_approvals_justificativa check (length(btrim(justification)) > 0),
  constraint methodology_approvals_hash check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint methodology_approvals_invalidacao check ((invalidated_at is null) = (invalidated_reason is null)),
  constraint methodology_approvals_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);
-- no maximo UMA aprovacao vigente por etapa e pacote
create unique index methodology_approvals_uma_vigente on public.methodology_package_approvals (package_id, step) where invalidated_at is null;
create index methodology_approvals_pacote_idx on public.methodology_package_approvals (package_id, approved_at);

-- registro de homologacao tambem nunca e da "Liderança"
alter table public.methodology_homologation_records add constraint methodology_records_sem_lideranca check (responsible !~* 'lideran');

-- aprovacao nao muda (so pode ser invalidada uma vez) e nunca e apagada
create or replace function public.proteger_aprovacao_metodologica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'aprovacao metodologica e historico: nao e apagada' using errcode = 'P0001', hint = 'aprovacao_imutavel';
  end if;
  if old.invalidated_at is not null or new.invalidated_at is null
     or (to_jsonb(old) - 'invalidated_at' - 'invalidated_reason') <> (to_jsonb(new) - 'invalidated_at' - 'invalidated_reason') then
    raise exception 'aprovacao metodologica e imutavel: so pode ser invalidada (uma vez)' using errcode = 'P0001', hint = 'aprovacao_imutavel';
  end if;
  return new;
end;
$$;
create trigger methodology_approvals_proteger before update or delete on public.methodology_package_approvals
  for each row execute function public.proteger_aprovacao_metodologica();

-- Pacote mudou -> aprovacoes vigentes daquela versao deixam de valer
create or replace function public.metodologia_invalidar_aprovacoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_pid uuid;
begin
  if tg_table_name = 'methodology_packages' then
    if new.version is not distinct from old.version and new.code is not distinct from old.code then return new; end if;
    v_pid := new.id;
  else
    v_pid := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  end if;
  update public.methodology_package_approvals
     set invalidated_at = now(), invalidated_reason = 'pacote alterado depois da aprovacao (' || tg_table_name || ' ' || lower(tg_op) || ')'
   where package_id = v_pid and invalidated_at is null;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.metodologia_invalidar_aprovacoes() from public, anon, authenticated;
create trigger methodology_packages_invalida_aprovacoes after update on public.methodology_packages for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_editions_invalida_aprovacoes after insert or update or delete on public.methodology_questionnaire_editions for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_scales_invalida_aprovacoes after insert or update or delete on public.methodology_scales for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_systems_invalida_aprovacoes after insert or update or delete on public.methodology_systems for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_questions_invalida_aprovacoes after insert or update or delete on public.methodology_questions for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_associations_invalida_aprovacoes after insert or update or delete on public.methodology_associations for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_ranges_invalida_aprovacoes after insert or update or delete on public.methodology_ranges for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_rules_invalida_aprovacoes after insert or update or delete on public.methodology_rules for each row execute function public.metodologia_invalidar_aprovacoes();

-- RLS: leitura do dono (e de pacote aprovado/retirado); escrita SO pela RPC
alter table public.methodology_package_approvals enable row level security;
create policy methodology_approvals_select on public.methodology_package_approvals for select to authenticated
  using (nutritionist_id = (select auth.uid()) or exists (select 1 from public.methodology_packages p where p.id = methodology_package_approvals.package_id and p.status in ('aprovado','retirado')));
revoke all on table public.methodology_package_approvals from public, anon, authenticated;
grant select on table public.methodology_package_approvals to authenticated;

-- ============================================================================
-- 3. REGISTRAR UMA APROVACAO (ato humano, uma etapa por chamada)
-- ============================================================================
-- p_content_hash: o hash que a pessoa conferiu na tela; tem de ser o do conteudo atual.
create or replace function public.registrar_aprovacao_metodologica(p_package_id uuid, p_etapa integer, p_responsavel text, p_justificativa text, p_content_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; h text; v jsonb; resp text := btrim(coalesce(p_responsavel, '')); a1 public.methodology_package_approvals%rowtype; novo uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario pela homologacao (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e do segundo responsavel / revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'aprovacao bloqueada pelo validador: % erro(s)', v->>'total_erros' using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  -- aprovacoes vigentes de outra versao ou outro conteudo nao valem mais
  update public.methodology_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if p_etapa = 1 then
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (uid, p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid) returning id into novo;
  else
    select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) valida sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (uid, p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', case when p_etapa = 1 then 'Daniel' else 'Rodrigo' end, 'status_pacote', pk.status);
end;
$$;
revoke all on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) from public, anon;
grant execute on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) to authenticated;

-- ============================================================================
-- 4. APROVAR (homologar) — so com as duas aprovacoes sobre o conteudo atual
-- ============================================================================
-- p_registro (opcional): { effective_from? }. O responsavel NAO vem do chamador: vem das aprovacoes.
create or replace function public.aprovar_pacote_metodologico(p_package_id uuid, p_registro jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; v jsonb; h text; a1 public.methodology_package_approvals%rowtype; a2 public.methodology_package_approvals%rowtype; resp text;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser aprovado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left((v->'erros')::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  select * into a2 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null;
  if a1.id is null or a2.id is null or a1.package_version <> pk.version or a2.package_version <> pk.version or a1.content_hash <> h or a2.content_hash <> h or a2.approved_at < a1.approved_at then
    raise exception 'homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) validas sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  resp := 'Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)';
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', resp, current_date, 'dupla aprovacao',
    'Aprovação 1: ' || a1.justification || ' | Aprovação 2: ' || a2.justification,
    'aprovacoes ' || a1.id || ' e ' || a2.id || '; content_hash ' || h || '; validar_pacote_metodologico: 0 erros');
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', approved_at = now(), approved_by = a2.approved_by, reviewed_by = a2.approved_by, reviewed_at = a2.approved_at,
    responsible = resp, justification = coalesce(justification, 'dupla aprovacao'),
    effective_from = coalesce((p_registro->>'effective_from')::date, effective_from, current_date), content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'aprovacao_1', a1.id, 'aprovacao_2', a2.id, 'validacao', v);
end;
$$;
revoke all on function public.aprovar_pacote_metodologico(uuid, jsonb) from public, anon;
grant execute on function public.aprovar_pacote_metodologico(uuid, jsonb) to authenticated;
