-- V1, Etapa 4 — INFRAESTRUTURA DO PACOTE METODOLOGICO (Mestre §13, §35, §42).
-- NAO APLICADA em producao. Entra depois de 130000..180000.
--
-- O que isto E: persistencia versionada, rastreavel e homologavel de um pacote
-- metodologico (perguntas, escalas, sistemas, associacoes, pesos, faixas,
-- regras de ausencia/Indice/Triada, registro de homologacao).
-- O que isto NAO E: homologacao de conteudo. Nenhuma linha nasce aprovada;
-- nenhum valor atual e declarado correto; nenhum peso, faixa ou vinculo novo.
--
--   1. methodology_packages: id, code, version, status (rascunho | em_revisao |
--      aprovado | retirado), origin, justification, responsible, reviewed_by,
--      reviewed_at, effective_from, effective_to, content_hash, created_at.
--   2. Filhas por pacote: questionnaire_editions, questions, scales, systems,
--      associations (question -> system | triad, weight, role, conflito
--      preservado), ranges (limites + inclusividade), rules (scoring, absence,
--      index, triad, coverage, comparability, example — payload jsonb),
--      homologation_records (tema, elemento, versao, decisao, responsavel,
--      data, fonte, justificativa, evidencia).
--   3. Protecoes server-side: pacote aprovado/retirado e IMUTAVEL (ele e as
--      filhas); aprovado so passa a retirado (recuperavel, sem hard-delete);
--      "aprovado" so pela RPC aprovar_pacote_metodologico, que roda o
--      validador de publicacao (que APONTA, nao corrige) e exige registro de
--      homologacao com responsavel humano. Sem DELETE de pacote nem de registro.
--   4. RLS: dono le/escreve o proprio; qualquer autenticado LE pacote aprovado
--      ou retirado (o metodo e compartilhado); anon revogado.
--   5. holoscan_applications.methodology_package_id (nulo): registro
--      historico guarda a versao do pacote usada, quando houver.

-- ============================================================================
-- 1. PACOTES
-- ============================================================================
create table public.methodology_packages (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  code            text not null,
  version         integer not null default 1,
  status          text not null default 'rascunho',
  origin          text,
  justification   text,
  responsible     text,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  effective_from  date,
  effective_to    date,
  content_hash    text,
  approved_at     timestamptz,
  approved_by     uuid references auth.users(id),
  retired_at      timestamptz,
  retired_reason  text,
  notes           text,
  created_by      uuid default auth.uid() references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_packages_status_valido check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint methodology_packages_versao_positiva check (version >= 1),
  constraint methodology_packages_code_nao_vazio check (length(btrim(code)) > 0),
  constraint methodology_packages_vigencia_coerente check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint methodology_packages_aprovado_completo check (
    status not in ('aprovado','retirado') or (content_hash is not null and responsible is not null and reviewed_by is not null
      and reviewed_at is not null and effective_from is not null and approved_at is not null and approved_by is not null)),
  constraint methodology_packages_retirado_completo check (status <> 'retirado' or retired_at is not null),
  constraint methodology_packages_code_version_unique unique (nutritionist_id, code, version),
  constraint methodology_packages_id_nutritionist_unique unique (id, nutritionist_id)
);
create index methodology_packages_status_idx on public.methodology_packages (status, effective_from);

-- ============================================================================
-- 2. FILHAS
-- ============================================================================
create table public.methodology_questionnaire_editions (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  code            text not null,
  version         integer not null default 1,
  status          text not null default 'rascunho',
  item_count      integer,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_editions_status_valido check (status in ('rascunho','para_homologacao','aprovada','retirada')),
  constraint methodology_editions_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_editions_code_version_unique unique (package_id, code, version),
  constraint methodology_editions_id_nutritionist_unique unique (id, nutritionist_id)
);

create table public.methodology_scales (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  code            text not null,
  min_value       integer not null,
  max_value       integer not null,
  labels          jsonb,
  kind            text,
  status          text not null default 'rascunho',
  source          text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_scales_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_scales_intervalo check (max_value > min_value),
  constraint methodology_scales_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_scales_code_unique unique (package_id, code)
);

create table public.methodology_systems (
  id                uuid primary key default gen_random_uuid(),
  nutritionist_id   uuid not null default auth.uid() references auth.users(id),
  package_id        uuid not null,
  code              text not null,
  name              text not null,
  public_text       text,
  definition        text,
  emotional_pattern text,
  spiritual_impact  text,
  color             text,
  position          integer not null default 0,
  status            text not null default 'rascunho',
  source            text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint methodology_systems_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_systems_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_systems_code_unique unique (package_id, code)
);

create table public.methodology_questions (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  package_id       uuid not null,
  edition_id       uuid not null,
  stable_id        text not null,
  statement        text not null,
  block            text not null,
  scale_code       text,
  response_labels  jsonb,
  orientation      text,
  temporal_context text,
  status           text not null default 'rascunho',
  source           text,
  notes            text,
  version          integer not null default 1,
  position         integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint methodology_questions_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_questions_orientacao_valida check (orientation is null or orientation in ('direta','invertida')),
  constraint methodology_questions_bloco_valido check (block in ('fisico','mental_emocional','espiritual')),
  constraint methodology_questions_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_questions_edition_fk foreign key (edition_id, nutritionist_id) references public.methodology_questionnaire_editions (id, nutritionist_id) on delete restrict,
  constraint methodology_questions_stable_id_unique unique (edition_id, stable_id)
);

create table public.methodology_associations (
  id                uuid primary key default gen_random_uuid(),
  nutritionist_id   uuid not null default auth.uid() references auth.users(id),
  package_id        uuid not null,
  question_stable_id text not null,
  destination_type  text not null,
  destination_id    text not null,
  weight            numeric,
  role              text,
  status            text not null default 'rascunho',
  source            text,
  conflict          boolean not null default false,
  conflict_note     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint methodology_associations_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_associations_tipo_valido check (destination_type in ('system','triad')),
  constraint methodology_associations_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);
create index methodology_associations_question_idx on public.methodology_associations (package_id, question_stable_id);

create table public.methodology_ranges (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  package_id       uuid not null,
  destination_type text not null,
  destination_id   text not null,
  lower_bound      numeric not null,
  upper_bound      numeric not null,
  lower_inclusive  boolean not null default true,
  upper_inclusive  boolean not null default true,
  label            text not null,
  message_nutri    text,
  message_paciente text,
  status           text not null default 'rascunho',
  source           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint methodology_ranges_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_ranges_tipo_valido check (destination_type in ('system','index','triad')),
  constraint methodology_ranges_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);

create table public.methodology_rules (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  rule_type       text not null,
  target          text not null default 'global',
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'rascunho',
  source          text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_rules_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_rules_tipo_valido check (rule_type in ('scoring','absence','index','triad','coverage','comparability','example')),
  constraint methodology_rules_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_rules_tipo_alvo_unique unique (package_id, rule_type, target)
);

create table public.methodology_homologation_records (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  topic           text not null,
  element         text not null,
  version         text,
  decision        text not null,
  responsible     text not null,
  decided_at      date not null,
  source          text,
  justification   text,
  evidence        text,
  created_by      uuid default auth.uid() references auth.users(id),
  created_at      timestamptz not null default now(),
  constraint methodology_records_responsavel_nao_vazio check (length(btrim(responsible)) > 0),
  constraint methodology_records_decisao_nao_vazia check (length(btrim(decision)) > 0),
  constraint methodology_records_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);
create index methodology_records_package_idx on public.methodology_homologation_records (package_id, decided_at desc);

-- registro historico: qual pacote (versao) foi usado; nulo para tudo o que existe hoje.
-- Faz parte do snapshot imutavel (proteger_snapshot_holoscan passa a cobri-lo).
alter table public.holoscan_applications add column if not exists methodology_package_id uuid references public.methodology_packages(id) on delete restrict;
create index if not exists holoscan_applications_methodology_package_idx on public.holoscan_applications (methodology_package_id) where methodology_package_id is not null;
CREATE OR REPLACE FUNCTION public.proteger_snapshot_holoscan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.nutritionist_id       IS DISTINCT FROM old.nutritionist_id
  OR new.patient_id            IS DISTINCT FROM old.patient_id
  OR new.encounter_id          IS DISTINCT FROM old.encounter_id
  OR new.methodology_package_id IS DISTINCT FROM old.methodology_package_id
  OR new.quando                IS DISTINCT FROM old.quando
  OR new.versao_estrutura      IS DISTINCT FROM old.versao_estrutura
  OR new.versao_bancos         IS DISTINCT FROM old.versao_bancos
  OR new.indice                IS DISTINCT FROM old.indice
  OR new.indice_maximo         IS DISTINCT FROM old.indice_maximo
  OR new.avaliavel             IS DISTINCT FROM old.avaliavel
  OR new.nota_media            IS DISTINCT FROM old.nota_media
  OR new.triada                IS DISTINCT FROM old.triada
  OR new.triada_com_dado       IS DISTINCT FROM old.triada_com_dado
  OR new.cobertura             IS DISTINCT FROM old.cobertura
  OR new.combinacoes           IS DISTINCT FROM old.combinacoes
  OR new.aprofundamentos       IS DISTINCT FROM old.aprofundamentos
  THEN
    RAISE EXCEPTION 'campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id, e o pacote metodologico); '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  END IF;
  RETURN new;
END;
$$;

-- updated_at
create trigger methodology_packages_tocar_updated_at before update on public.methodology_packages for each row execute function public.tocar_updated_at();
create trigger methodology_editions_tocar_updated_at before update on public.methodology_questionnaire_editions for each row execute function public.tocar_updated_at();
create trigger methodology_scales_tocar_updated_at before update on public.methodology_scales for each row execute function public.tocar_updated_at();
create trigger methodology_systems_tocar_updated_at before update on public.methodology_systems for each row execute function public.tocar_updated_at();
create trigger methodology_questions_tocar_updated_at before update on public.methodology_questions for each row execute function public.tocar_updated_at();
create trigger methodology_associations_tocar_updated_at before update on public.methodology_associations for each row execute function public.tocar_updated_at();
create trigger methodology_ranges_tocar_updated_at before update on public.methodology_ranges for each row execute function public.tocar_updated_at();
create trigger methodology_rules_tocar_updated_at before update on public.methodology_rules for each row execute function public.tocar_updated_at();

-- ============================================================================
-- 3. PROTECOES
-- ============================================================================
-- Pacote aprovado/retirado e imutavel. A unica transicao permitida depois de
-- aprovado e aprovado -> retirado (retired_at, retired_reason, effective_to).
-- Passar a 'aprovado' so pela RPC (sinal de sessao holohacking.aprovacao_rpc).
create or replace function public.proteger_pacote_metodologico()
returns trigger
language plpgsql
set search_path = ''
as $$
declare livres text[] := array['updated_at'];
begin
  if new.status = 'aprovado' and old.status <> 'aprovado' then
    if coalesce(current_setting('holohacking.aprovacao_rpc', true), '') <> new.id::text then
      raise exception 'aprovacao nao e edicao administrativa: use aprovar_pacote_metodologico (validador + registro de homologacao)'
        using errcode = 'P0001', hint = 'aprovacao_sem_registro';
    end if;
    return new;
  end if;
  if old.status = 'aprovado' then
    if new.status = 'retirado' then
      livres := livres || array['status','retired_at','retired_reason','effective_to'];
      if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
        raise exception 'pacote aprovado e imutavel: retirar so muda status, retired_at, retired_reason e effective_to' using errcode = 'P0001', hint = 'pacote_imutavel';
      end if;
      return new;
    end if;
    if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
      raise exception 'pacote aprovado e imutavel: alteracao exige NOVA VERSAO' using errcode = 'P0001', hint = 'pacote_imutavel';
    end if;
    return new;
  end if;
  if old.status = 'retirado' then
    if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
      raise exception 'pacote retirado e historico: permanece recuperavel e nao muda' using errcode = 'P0001', hint = 'pacote_imutavel';
    end if;
    return new;
  end if;
  if new.status = 'retirado' then
    raise exception 'so um pacote aprovado pode ser retirado' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger methodology_packages_proteger before update on public.methodology_packages
  for each row execute function public.proteger_pacote_metodologico();

-- filhas: nenhuma escrita quando o pacote esta aprovado ou retirado
create or replace function public.proteger_filha_pacote_metodologico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_pid uuid; v_status text;
begin
  v_pid := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  select p.status into v_status from public.methodology_packages p where p.id = v_pid;
  if v_status in ('aprovado','retirado') and coalesce(current_setting('holohacking.aprovacao_rpc', true), '') <> v_pid::text then
    raise exception 'conteudo de pacote % e imutavel: crie uma nova versao do pacote', v_status using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  if tg_op = 'UPDATE' and (new.package_id <> old.package_id or new.nutritionist_id <> old.nutritionist_id) then
    raise exception 'elemento nao muda de pacote nem de profissional' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.proteger_filha_pacote_metodologico() from public, anon, authenticated;
create trigger methodology_editions_proteger before insert or update or delete on public.methodology_questionnaire_editions for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_scales_proteger before insert or update or delete on public.methodology_scales for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_systems_proteger before insert or update or delete on public.methodology_systems for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_questions_proteger before insert or update or delete on public.methodology_questions for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_associations_proteger before insert or update or delete on public.methodology_associations for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_ranges_proteger before insert or update or delete on public.methodology_ranges for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_rules_proteger before insert or update or delete on public.methodology_rules for each row execute function public.proteger_filha_pacote_metodologico();

-- registro de homologacao nunca muda (so insert); nutritionist_id nao e trocado
create or replace function public.proteger_registro_homologacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'registro de homologacao e imutavel: acrescente um novo registro' using errcode = 'P0001', hint = 'registro_imutavel';
end;
$$;
create trigger methodology_records_proteger before update on public.methodology_homologation_records
  for each row execute function public.proteger_registro_homologacao();

-- ============================================================================
-- 4. RLS
-- ============================================================================
alter table public.methodology_packages enable row level security;
alter table public.methodology_questionnaire_editions enable row level security;
alter table public.methodology_scales enable row level security;
alter table public.methodology_systems enable row level security;
alter table public.methodology_questions enable row level security;
alter table public.methodology_associations enable row level security;
alter table public.methodology_ranges enable row level security;
alter table public.methodology_rules enable row level security;
alter table public.methodology_homologation_records enable row level security;

-- pacote: dono le e escreve; qualquer autenticado le aprovado/retirado
create policy methodology_packages_select on public.methodology_packages for select to authenticated
  using (nutritionist_id = (select auth.uid()) or status in ('aprovado','retirado'));
create policy methodology_packages_insert on public.methodology_packages for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy methodology_packages_update on public.methodology_packages for update to authenticated
  using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));

-- filhas: leitura segue a do pacote; escrita so do dono; DELETE so com pacote rascunho/em_revisao
do $$
declare t text;
begin
  foreach t in array array['methodology_questionnaire_editions','methodology_scales','methodology_systems','methodology_questions','methodology_associations','methodology_ranges','methodology_rules'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (nutritionist_id = (select auth.uid()) or exists (select 1 from public.methodology_packages p where p.id = %I.package_id and p.status in (''aprovado'',''retirado'')))', t, t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (nutritionist_id = (select auth.uid()))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()))', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (nutritionist_id = (select auth.uid()) and exists (select 1 from public.methodology_packages p where p.id = %I.package_id and p.nutritionist_id = (select auth.uid()) and p.status in (''rascunho'',''em_revisao'')))', t, t, t);
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;
create policy methodology_records_select on public.methodology_homologation_records for select to authenticated
  using (nutritionist_id = (select auth.uid()) or exists (select 1 from public.methodology_packages p where p.id = methodology_homologation_records.package_id and p.status in ('aprovado','retirado')));
create policy methodology_records_insert on public.methodology_homologation_records for insert to authenticated with check (nutritionist_id = (select auth.uid()));
revoke all on table public.methodology_packages, public.methodology_homologation_records from public, anon;
grant select, insert, update on table public.methodology_packages to authenticated;
grant select, insert on table public.methodology_homologation_records to authenticated;

-- ============================================================================
-- 5. VALIDADOR DE PUBLICACAO — aponta, nao corrige
-- ============================================================================
-- Devolve {"erros":[{codigo, onde, mensagem}], "avisos":[...], "publicavel": bool}.
create or replace function public.validar_pacote_metodologico(p_package_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  erros jsonb := '[]'::jsonb; avisos jsonb := '[]'::jsonb; r record; r2 record; n int; soma numeric; ant record; sist text[]; eixos text[] := array['fisico','mental','espiritual'];
  idx jsonb;
begin
  perform 1 from public.methodology_packages p where p.id = p_package_id;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  select coalesce(array_agg(s.code), '{}') into sist from public.methodology_systems s where s.package_id = p_package_id;

  -- IDs duplicados (mesmo stable_id em mais de uma edicao / linha)
  for r in select q.stable_id, count(*) c from public.methodology_questions q where q.package_id = p_package_id group by q.stable_id having count(*) > 1 loop
    erros := erros || jsonb_build_object('codigo','id_duplicado','onde',r.stable_id,'mensagem','stable_id em '||r.c||' linhas do pacote');
  end loop;
  -- escala ausente / inexistente
  for r in select q.stable_id, q.scale_code from public.methodology_questions q where q.package_id = p_package_id loop
    if r.scale_code is null then erros := erros || jsonb_build_object('codigo','escala_ausente','onde',r.stable_id,'mensagem','pergunta sem escala');
    elsif not exists (select 1 from public.methodology_scales s where s.package_id = p_package_id and s.code = r.scale_code) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.stable_id,'mensagem','escala "'||r.scale_code||'" nao existe no pacote'); end if;
  end loop;
  -- orientacao ausente (nunca inferida)
  for r in select q.stable_id from public.methodology_questions q where q.package_id = p_package_id and q.orientation is null loop
    erros := erros || jsonb_build_object('codigo','orientacao_ausente','onde',r.stable_id,'mensagem','orientacao nao definida (ausente nao e direta)');
  end loop;
  -- associacoes: referencia inexistente, peso ausente, conflito nao resolvido
  for r in select a.* from public.methodology_associations a where a.package_id = p_package_id loop
    if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id and q.stable_id = r.question_stable_id) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id,'mensagem','associacao aponta para pergunta que nao existe no pacote'); end if;
    if r.destination_type = 'system' and not (r.destination_id = any(sist)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','sistema de destino nao existe no pacote'); end if;
    if r.destination_type = 'triad' and not (r.destination_id = any(eixos)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','eixo da Triada desconhecido'); end if;
    if r.weight is null then erros := erros || jsonb_build_object('codigo','peso_ausente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','peso obrigatorio ausente'); end if;
    if r.conflict then erros := erros || jsonb_build_object('codigo','conflito_pendente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem',coalesce(r.conflict_note,'associacao em conflito nao resolvido')); end if;
  end loop;
  -- associacao orfa: pergunta sem nenhum destino de sistema
  for r in select q.stable_id from public.methodology_questions q where q.package_id = p_package_id
      and not exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = q.stable_id and a.destination_type = 'system') loop
    erros := erros || jsonb_build_object('codigo','associacao_orfa','onde',r.stable_id,'mensagem','pergunta sem associacao a sistema');
  end loop;
  -- SNT pendente: perguntas marcadas pendentes de homologacao de vinculo (conflito em associacao primaria)
  if exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.conflict and a.question_stable_id in ('SNT-101','SNT-501')) then
    erros := erros || jsonb_build_object('codigo','snt_pendente','onde','SNT-101/SNT-501','mensagem','vinculos de SNT-101/SNT-501 pendentes de homologacao');
  end if;
  -- faixas: ordem, lacuna, sobreposicao, cobertura do dominio 0..10 por destino
  for r in select distinct a.destination_type, a.destination_id from public.methodology_ranges a where a.package_id = p_package_id loop
    ant := null; n := 0;
    for r2 in select * from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = r.destination_type and f.destination_id = r.destination_id order by f.lower_bound, f.upper_bound loop
      n := n + 1;
      if r2.lower_bound >= r2.upper_bound then erros := erros || jsonb_build_object('codigo','faixa_ordem_invalida','onde',r.destination_id||'/'||r2.label,'mensagem','limite inferior >= superior'); end if;
      if ant is not null then
        if r2.lower_bound < ant.upper_bound or (r2.lower_bound = ant.upper_bound and r2.lower_inclusive and ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_sobreposta','onde',r.destination_id||'/'||r2.label,'mensagem','sobrepoe "'||ant.label||'"');
        elsif r2.lower_bound > ant.upper_bound or (r2.lower_bound = ant.upper_bound and not r2.lower_inclusive and not ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','lacuna entre "'||ant.label||'" e "'||r2.label||'"');
        end if;
      elsif r2.lower_bound > 0 or not r2.lower_inclusive then
        erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','dominio nao comeca em 0 inclusivo');
      end if;
      ant := r2;
    end loop;
    if ant is not null and r.destination_type <> 'index' and (ant.upper_bound < 10 or not ant.upper_inclusive) then
      erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||ant.label,'mensagem','dominio nao termina em 10 inclusivo');
    end if;
  end loop;
  -- sistema sem faixa
  for r in select unnest(sist) as code loop
    if not exists (select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = 'system' and f.destination_id = r.code) then
      erros := erros || jsonb_build_object('codigo','faixa_ausente','onde',r.code,'mensagem','sistema sem faixas'); end if;
  end loop;
  -- regras obrigatorias
  if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'absence'
      and x.payload ? 'denominador' and x.payload ? 'cobertura_minima' and x.payload ? 'recusado' and x.payload ? 'nao_aplicavel' and x.payload ? 'minimos'
      and jsonb_typeof(x.payload->'denominador') <> 'null' and jsonb_typeof(x.payload->'cobertura_minima') <> 'null') then
    erros := erros || jsonb_build_object('codigo','politica_parcialidade_ausente','onde','absence','mensagem','politica de ausencia/parcialidade incompleta (denominador, cobertura_minima, recusado, nao_aplicavel, minimos)');
  end if;
  select x.payload into idx from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'index' and x.target = 'global';
  if idx is null or not (idx ? 'alphas') or not (idx ? 'elegibilidade') or not (idx ? 'indice_parcial') then
    erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','configuracao do Indice incompleta (alphas, elegibilidade, indice_parcial)');
  else
    soma := 0;
    for r2 in select key, value from jsonb_each(idx->'alphas') loop
      if not (r2.key = any(sist)) then erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde','index/'||r2.key,'mensagem','alpha para sistema inexistente'); end if;
      if jsonb_typeof(r2.value) <> 'number' then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.key,'mensagem','alpha ausente'); else soma := soma + (r2.value)::numeric; end if;
    end loop;
    for r2 in select unnest(sist) as code loop
      if not (idx->'alphas' ? r2.code) then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.code,'mensagem','sistema sem alpha'); end if;
    end loop;
    if abs(soma - 1) > 0.0001 then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','alphas somam '||soma||', esperado 1'); end if;
  end if;
  for r in select unnest(eixos) as eixo loop
    if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'triad' and x.target = r.eixo
        and x.payload ? 'contribuicao' and x.payload ? 'escala' and x.payload ? 'elegibilidade' and x.payload ? 'agregacao') then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','configuracao do eixo incompleta (contribuicao, escala, elegibilidade, agregacao)');
    end if;
  end loop;
  for r in select unnest(sist) as code loop
    if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'scoring' and x.target = r.code and x.payload ? 'formula') then
      erros := erros || jsonb_build_object('codigo','regra_incompleta','onde','scoring/'||r.code,'mensagem','sistema sem regra de pontuacao'); end if;
  end loop;
  -- exemplo deterministico com resultado esperado
  if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'example' and x.payload ? 'entrada' and x.payload ? 'esperado' and jsonb_typeof(x.payload->'esperado') <> 'null') then
    erros := erros || jsonb_build_object('codigo','exemplo_sem_resultado','onde','example','mensagem','nenhum exemplo deterministico com resultado esperado');
  end if;
  -- elementos nao aprovados individualmente
  select count(*) into n from (
    select 1 from public.methodology_questions q where q.package_id = p_package_id and q.status <> 'aprovado'
    union all select 1 from public.methodology_associations a where a.package_id = p_package_id and a.status <> 'aprovado'
    union all select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.status <> 'aprovado'
    union all select 1 from public.methodology_systems s where s.package_id = p_package_id and s.status <> 'aprovado'
    union all select 1 from public.methodology_scales e where e.package_id = p_package_id and e.status <> 'aprovado'
    union all select 1 from public.methodology_rules x where x.package_id = p_package_id and x.status <> 'aprovado') z;
  if n > 0 then erros := erros || jsonb_build_object('codigo','elemento_nao_aprovado','onde','pacote','mensagem',n||' elemento(s) com status diferente de aprovado'); end if;
  if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id) then
    erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem perguntas'); end if;
  if coalesce(array_length(sist,1),0) = 0 then erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem sistemas'); end if;
  return jsonb_build_object('erros', erros, 'avisos', avisos, 'publicavel', jsonb_array_length(erros) = 0, 'total_erros', jsonb_array_length(erros));
end;
$$;
revoke all on function public.validar_pacote_metodologico(uuid) from public, anon;
grant execute on function public.validar_pacote_metodologico(uuid) to authenticated;

-- ============================================================================
-- 6. RPCs: aprovar (com validador + registro humano) e retirar
-- ============================================================================
-- p_registro: { responsible, decided_at?, justification, source?, evidence?, effective_from? }
create or replace function public.aprovar_pacote_metodologico(p_package_id uuid, p_registro jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; v jsonb; h text; conteudo jsonb;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser aprovado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if p_registro is null or length(btrim(coalesce(p_registro->>'responsible',''))) = 0 or length(btrim(coalesce(p_registro->>'justification',''))) = 0 then
    raise exception 'aprovacao exige registro de homologacao com responsavel humano e justificativa' using errcode = 'P0001', hint = 'registro_incompleto';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left(v->'erros'::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  -- hash do conteudo (ordem canonica por chave natural)
  select jsonb_build_object(
    'questions', (select coalesce(jsonb_agg(to_jsonb(q) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' - 'edition_id' order by q.stable_id) ,'[]') from public.methodology_questions q where q.package_id = p_package_id),
    'associations', (select coalesce(jsonb_agg(to_jsonb(a) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by a.question_stable_id, a.destination_type, a.destination_id, a.role),'[]') from public.methodology_associations a where a.package_id = p_package_id),
    'ranges', (select coalesce(jsonb_agg(to_jsonb(f) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by f.destination_type, f.destination_id, f.lower_bound),'[]') from public.methodology_ranges f where f.package_id = p_package_id),
    'systems', (select coalesce(jsonb_agg(to_jsonb(s) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by s.code),'[]') from public.methodology_systems s where s.package_id = p_package_id),
    'scales', (select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by e.code),'[]') from public.methodology_scales e where e.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(to_jsonb(x) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by x.rule_type, x.target),'[]') from public.methodology_rules x where x.package_id = p_package_id)
  ) into conteudo;
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', p_registro->>'responsible', coalesce((p_registro->>'decided_at')::date, current_date),
    p_registro->>'source', p_registro->>'justification', coalesce(p_registro->>'evidence', 'validar_pacote_metodologico: 0 erros'));
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', approved_at = now(), approved_by = uid, reviewed_by = uid, reviewed_at = now(),
    responsible = p_registro->>'responsible', justification = coalesce(p_registro->>'justification', justification),
    effective_from = coalesce((p_registro->>'effective_from')::date, effective_from, current_date), content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'validacao', v);
end;
$$;
revoke all on function public.aprovar_pacote_metodologico(uuid, jsonb) from public, anon;
grant execute on function public.aprovar_pacote_metodologico(uuid, jsonb) to authenticated;

create or replace function public.retirar_pacote_metodologico(p_package_id uuid, p_motivo text, p_responsible text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'aprovado' then raise exception 'so um pacote aprovado pode ser retirado' using errcode = 'P0001'; end if;
  if length(btrim(coalesce(p_responsible,''))) = 0 then raise exception 'retirada exige responsavel' using errcode = 'P0001'; end if;
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, justification)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'retirado', p_responsible, current_date, p_motivo);
  update public.methodology_packages set status = 'retirado', retired_at = now(), retired_reason = p_motivo, effective_to = least(coalesce(effective_to, current_date), current_date) where id = p_package_id;
  return p_package_id;
end;
$$;
revoke all on function public.retirar_pacote_metodologico(uuid, text, text) from public, anon;
grant execute on function public.retirar_pacote_metodologico(uuid, text, text) to authenticated;
