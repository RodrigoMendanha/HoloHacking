-- V1, Etapa 2 — ANAMNESE ESTRUTURADA e CONDUTA (com acordos), ligadas ao
-- ATENDIMENTO (encounters, Etapa 1). NAO APLICADA em producao. Entra depois de
-- 130000, 140000, 150000 e 160000, que nao sao reescritas.
--
-- Ver docs/v1/ETAPA2-ARQUITETURA-ANAMNESE-CONDUTA.md. Em resumo:
--   * anamneses e conducts: encounter_id NOT NULL, FK composta
--     (encounter_id, patient_id, nutritionist_id) -> encounters; cada REVISAO
--     e uma linha ((encounter_id, revision_number) unico); rascunho e editavel,
--     salvo/revisado e imutavel (corrigir = nova revisao, a anterior fica);
--   * agreements: acordos de cada revisao da conduta, FK composta -> conducts;
--     estados funcionais (proposto ... encerrado), nunca adesao;
--   * conteudo da anamnese em JSONB versionado, validado no servidor (estado e
--     origem obrigatorios em cada item; vazio != negado; medida com unidade);
--   * copia explicita da anamnese anterior (itens marcados como previos);
--   * referencias da conduta validadas contra o mesmo paciente/profissional;
--   * RLS so do dono, anon revogado, sem DELETE (exceto acordo de rascunho),
--     trigger de paciente arquivado, idempotencia por operation_id,
--     RPCs SECURITY INVOKER.
-- Nada metodologico: nenhum peso, faixa, limiar, alerta ou diagnostico.

-- ============================================================================
-- 1. VALIDACAO DO CONTEUDO DA ANAMNESE
-- ============================================================================

create or replace function public.validar_conteudo_anamnese(c jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  dom record; it jsonb; m jsonb;
  dominios text[] := array['motivo_objetivo','historia_alimentar','rotina_acesso','sono',
    'atividade_fisica','sintomas_relatados','condicoes_diagnosticos_informados','medicamentos',
    'suplementos','alergias_informadas','intolerancias_informadas','antecedentes',
    'contexto_familiar','contexto_social','avaliacoes','medidas','emocional','sentido_pessoal'];
  estados text[] := array['informado','negado_explicitamente','desconhecido','nao_investigado','nao_aplicavel','recusado'];
  origens text[] := array['relato_paciente','observacao_profissional','documento_externo','dado_medido'];
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if c->'dominios' is null then return true; end if;              -- anamnese vazia e valida (nada afirmado)
  if jsonb_typeof(c->'dominios') <> 'object' then return false; end if;
  for dom in select key, value from jsonb_each(c->'dominios') loop
    if not (dom.key = any(dominios)) then return false; end if;
    if jsonb_typeof(dom.value) <> 'object' or jsonb_typeof(dom.value->'itens') <> 'array' then return false; end if;
    for it in select * from jsonb_array_elements(dom.value->'itens') loop
      if jsonb_typeof(it) <> 'object' then return false; end if;
      if not ((it->>'estado') = any(estados)) then return false; end if;    -- estado OBRIGATORIO: vazio nunca vira "nao"
      if not ((it->>'origem') = any(origens)) then return false; end if;    -- origem OBRIGATORIA
      m := it->'medida';
      if m is not null and jsonb_typeof(m) <> 'null' then
        if jsonb_typeof(m) <> 'object' then return false; end if;
        if m->>'valor' is not null and coalesce(m->>'unidade','') = '' then return false; end if;  -- sem unidade padrao
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- ============================================================================
-- 2. ANAMNESES
-- ============================================================================

create table public.anamneses (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  encounter_id          uuid not null,
  revision_number       integer not null default 1,
  status                text not null default 'rascunho',
  content_version       integer not null default 1,
  content               jsonb not null default '{}'::jsonb,
  source_anamnesis_id   uuid,
  copied_from_previous  boolean not null default false,
  supersedes_id         uuid,
  superseded_at         timestamptz,
  revision_note         text,
  reviewed_at           timestamptz,
  reviewed_by           uuid references auth.users(id),
  operation_id          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint anamneses_status_valido check (status in ('rascunho','salvo','revisado')),
  constraint anamneses_conteudo_valido check (public.validar_conteudo_anamnese(content)),
  constraint anamneses_revisao_positiva check (revision_number >= 1),
  constraint anamneses_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint anamneses_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id) on delete restrict,
  constraint anamneses_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint anamneses_encounter_revision_unique unique (encounter_id, revision_number),
  constraint anamneses_source_fk
    foreign key (source_anamnesis_id, patient_id, nutritionist_id)
    references public.anamneses (id, patient_id, nutritionist_id) on delete restrict,
  constraint anamneses_supersedes_fk
    foreign key (supersedes_id, patient_id, nutritionist_id)
    references public.anamneses (id, patient_id, nutritionist_id) on delete restrict
);

create index anamneses_encounter_idx on public.anamneses (encounter_id, revision_number desc);
create index anamneses_patient_idx on public.anamneses (patient_id, created_at desc);
create unique index anamneses_um_rascunho_por_atendimento on public.anamneses (encounter_id) where status = 'rascunho';
create unique index anamneses_operation_unique on public.anamneses (nutritionist_id, operation_id) where operation_id is not null;

-- ============================================================================
-- 3. CONDUCTS
-- ============================================================================

create table public.conducts (
  id                      uuid primary key default gen_random_uuid(),
  nutritionist_id         uuid not null default auth.uid() references auth.users(id),
  patient_id              uuid not null,
  encounter_id            uuid not null,
  revision_number         integer not null default 1,
  status                  text not null default 'rascunho',
  priorities              jsonb not null default '[]'::jsonb,
  objective               text,
  nutrition_strategy      text,
  actions                 text,
  resources               text,
  related_tools           jsonb not null default '[]'::jsonb,
  requested_exams         text,
  referrals               text,
  monitoring              text,
  return_plan             text,
  observations            text,
  nutrition_diagnosis     text,
  dietary_prescription    text,
  professional_guidance   text,
  "references"            jsonb not null default '{}'::jsonb,
  previous_conduct_id     uuid,
  previous_decision       text,
  previous_decision_note  text,
  supersedes_id           uuid,
  superseded_at           timestamptz,
  revision_note           text,
  reviewed_at             timestamptz,
  reviewed_by             uuid references auth.users(id),
  operation_id            uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint conducts_status_valido check (status in ('rascunho','salvo','revisado')),
  constraint conducts_decisao_valida check (previous_decision is null or previous_decision in ('continuar','substituir','encerrar')),
  constraint conducts_revisao_positiva check (revision_number >= 1),
  constraint conducts_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint conducts_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id) on delete restrict,
  constraint conducts_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint conducts_encounter_revision_unique unique (encounter_id, revision_number),
  constraint conducts_previous_fk
    foreign key (previous_conduct_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict,
  constraint conducts_supersedes_fk
    foreign key (supersedes_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict
);

create index conducts_encounter_idx on public.conducts (encounter_id, revision_number desc);
create index conducts_patient_idx on public.conducts (patient_id, created_at desc);
create unique index conducts_um_rascunho_por_atendimento on public.conducts (encounter_id) where status = 'rascunho';
create unique index conducts_operation_unique on public.conducts (nutritionist_id, operation_id) where operation_id is not null;

-- ============================================================================
-- 4. AGREEMENTS
-- ============================================================================

create table public.agreements (
  id                   uuid primary key default gen_random_uuid(),
  nutritionist_id      uuid not null default auth.uid() references auth.users(id),
  patient_id           uuid not null,
  conduct_id           uuid not null,
  description          text not null,
  responsible          text,
  due_text             text,
  follow_up            text,
  status               text not null default 'proposto',
  status_note          text,
  status_changed_at    timestamptz,
  position             integer not null default 0,
  origin_agreement_id  uuid,
  operation_id         uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint agreements_descricao_nao_vazia check (length(btrim(description)) > 0),
  constraint agreements_status_valido check (status in ('proposto','acordado','em_acompanhamento','concluido','revisto','encerrado')),
  constraint agreements_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint agreements_conduct_fk
    foreign key (conduct_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict,
  constraint agreements_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint agreements_origin_fk
    foreign key (origin_agreement_id, patient_id, nutritionist_id)
    references public.agreements (id, patient_id, nutritionist_id) on delete restrict
);

create index agreements_conduct_idx on public.agreements (conduct_id, position);
create unique index agreements_operation_unique on public.agreements (nutritionist_id, operation_id) where operation_id is not null;

-- ============================================================================
-- 5. TRIGGERS: updated_at, paciente arquivado, imutabilidade, referencias
-- ============================================================================

create trigger anamneses_tocar_updated_at before update on public.anamneses
  for each row execute function public.tocar_updated_at();
create trigger conducts_tocar_updated_at before update on public.conducts
  for each row execute function public.tocar_updated_at();
create trigger agreements_tocar_updated_at before update on public.agreements
  for each row execute function public.tocar_updated_at();

create trigger anamneses_paciente_arquivado before insert or update on public.anamneses
  for each row execute function public.bloquear_escrita_paciente_arquivado();
create trigger conducts_paciente_arquivado before insert or update on public.conducts
  for each row execute function public.bloquear_escrita_paciente_arquivado();
create trigger agreements_paciente_arquivado before insert or update on public.agreements
  for each row execute function public.bloquear_escrita_paciente_arquivado();

-- Revisao consolidada (salvo/revisado) e imutavel: so pode (a) passar de salvo
-- para revisado, recebendo reviewed_at/reviewed_by, e (b) receber superseded_at
-- quando uma revisao nova a substitui. Corrigir = nova linha (RPC).
create or replace function public.proteger_revisao_consolidada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  antes jsonb; depois jsonb; chaves_livres text[] := array['updated_at','superseded_at','status','reviewed_at','reviewed_by'];
begin
  if old.status = 'rascunho' then return new; end if;
  antes  := to_jsonb(old) - chaves_livres;
  depois := to_jsonb(new) - chaves_livres;
  if antes <> depois then
    raise exception 'revisao consolidada e imutavel: corrija criando uma nova revisao'
      using errcode = 'P0001', hint = 'revisao_imutavel';
  end if;
  if new.status <> old.status and not (old.status = 'salvo' and new.status = 'revisado') then
    raise exception 'revisao consolidada so pode passar de salvo para revisado'
      using errcode = 'P0001', hint = 'revisao_imutavel';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then
    raise exception 'superseded_at nao pode ser alterado depois de definido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger anamneses_proteger_revisao before update on public.anamneses
  for each row execute function public.proteger_revisao_consolidada();
create trigger conducts_proteger_revisao before update on public.conducts
  for each row execute function public.proteger_revisao_consolidada();

-- status -> revisado carimba quem conferiu (identidade do servidor, nao do payload)
create or replace function public.carimbar_revisao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'revisado' and (tg_op = 'INSERT' or old.status <> 'revisado') then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := auth.uid();
  end if;
  if new.status <> 'revisado' then
    new.reviewed_at := null; new.reviewed_by := null;
  end if;
  return new;
end;
$$;
create trigger anamneses_carimbar_revisao before insert or update on public.anamneses
  for each row execute function public.carimbar_revisao();
create trigger conducts_carimbar_revisao before insert or update on public.conducts
  for each row execute function public.carimbar_revisao();

-- Acordo: identidade imutavel; mudanca de situacao e carimbada; nenhuma
-- mudanca de situacao acontece sozinha (so por UPDATE explicito).
create or replace function public.proteger_acordo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.conduct_id <> old.conduct_id or new.patient_id <> old.patient_id or new.nutritionist_id <> old.nutritionist_id then
    raise exception 'acordo nao muda de conduta, paciente ou profissional' using errcode = 'P0001';
  end if;
  if new.status <> old.status then new.status_changed_at := now(); end if;
  return new;
end;
$$;
create trigger agreements_proteger before update on public.agreements
  for each row execute function public.proteger_acordo();

-- Referencias da conduta: cada id citado tem de ser do MESMO paciente e do
-- MESMO profissional. Referencia, nao copia.
create or replace function public.validar_referencias_conduta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare r jsonb := coalesce(new."references", '{}'::jsonb); x text; n int;
begin
  if jsonb_typeof(r) <> 'object' then raise exception 'references deve ser objeto'; end if;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'holoscan_application_ids','[]'::jsonb)) loop
    select count(*) into n from public.holoscan_applications h where h.id = x::uuid and h.patient_id = new.patient_id and h.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a HOLOSCAN de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'tool_application_ids','[]'::jsonb)) loop
    select count(*) into n from public.tool_applications t where t.id = x::uuid and t.patient_id = new.patient_id and t.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a ferramenta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'lab_collection_ids','[]'::jsonb)) loop
    select count(*) into n from public.lab_collections c where c.id = x::uuid and c.patient_id = new.patient_id and c.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a coleta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'document_ids','[]'::jsonb)) loop
    select count(*) into n from public.documents d where d.id = x::uuid and d.patient_id = new.patient_id and d.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a documento de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'previous_encounter_ids','[]'::jsonb)) loop
    select count(*) into n from public.encounters e where e.id = x::uuid and e.patient_id = new.patient_id and e.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a atendimento de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.validar_referencias_conduta() from public, anon, authenticated;
create trigger conducts_validar_referencias before insert or update on public.conducts
  for each row execute function public.validar_referencias_conduta();

-- ============================================================================
-- 6. RLS E GRANTS
-- ============================================================================

alter table public.anamneses enable row level security;
alter table public.conducts enable row level security;
alter table public.agreements enable row level security;

create policy anamneses_select_proprios on public.anamneses for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy anamneses_insert_proprios on public.anamneses for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy anamneses_update_proprios on public.anamneses for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));

create policy conducts_select_proprios on public.conducts for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy conducts_insert_proprios on public.conducts for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy conducts_update_proprios on public.conducts for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));

create policy agreements_select_proprios on public.agreements for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy agreements_insert_proprios on public.agreements for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy agreements_update_proprios on public.agreements for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));
-- o unico DELETE: acordo de conduta ainda em RASCUNHO (nunca de revisao consolidada)
create policy agreements_delete_rascunho on public.agreements for delete to authenticated
  using (nutritionist_id = (select auth.uid()) and exists (
    select 1 from public.conducts c where c.id = agreements.conduct_id and c.nutritionist_id = (select auth.uid()) and c.status = 'rascunho'));

revoke all on table public.anamneses, public.conducts, public.agreements from public, anon;
grant select, insert, update on table public.anamneses, public.conducts to authenticated;
grant select, insert, update, delete on table public.agreements to authenticated;

-- ============================================================================
-- 7. RPC salvar_anamnese — rascunho editavel, consolidado vira nova revisao
-- ============================================================================
-- payload: { id?, encounter_id, content, status (rascunho|salvo|revisado),
--            operation_id?, expected_updated_at?, revision_note?,
--            source_anamnesis_id?, copied_from_previous? }
-- Devolve o id da linha gravada (a mesma, se rascunho; nova, se revisao).

create or replace function public.salvar_anamnese(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_enc uuid; v_pid uuid; v_status text;
  atual public.anamneses%rowtype; n int; novo uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_status := coalesce(nullif(payload->>'status',''), 'rascunho');
  if v_status not in ('rascunho','salvo','revisado') then raise exception 'status invalido'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select a.id into v_id from public.anamneses a where a.nutritionist_id = uid and a.operation_id = v_op;
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.anamneses a where a.id = v_id and a.nutritionist_id = uid for update;
    if not found then raise exception 'anamnese % nao encontrada', v_id using errcode = 'P0002'; end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'a anamnese foi alterada em outro lugar; recarregue antes de salvar' using errcode = 'P0001', hint = 'conflito';
    end if;
    if atual.status = 'rascunho' then
      update public.anamneses set
        content = coalesce(payload->'content', content),
        status = v_status,
        revision_note = coalesce(payload->>'revision_note', revision_note),
        operation_id = coalesce(operation_id, v_op)
      where id = v_id;
      return v_id;
    end if;
    -- consolidada: nova revisao, a anterior fica intacta
    select coalesce(max(revision_number),0)+1 into n from public.anamneses where encounter_id = atual.encounter_id;
    insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content_version, content,
      source_anamnesis_id, copied_from_previous, supersedes_id, revision_note, operation_id)
    values (uid, atual.patient_id, atual.encounter_id, n, v_status, atual.content_version,
      coalesce(payload->'content', atual.content), atual.source_anamnesis_id, atual.copied_from_previous,
      atual.id, payload->>'revision_note', v_op)
    returning id into novo;
    update public.anamneses set superseded_at = now() where id = atual.id;
    return novo;
  end if;
  -- nova anamnese para o atendimento
  v_enc := (payload->>'encounter_id')::uuid;
  if v_enc is null then raise exception 'encounter_id e obrigatorio'; end if;
  select e.patient_id into v_pid from public.encounters e where e.id = v_enc and e.nutritionist_id = uid;
  if v_pid is null then raise exception 'atendimento % nao encontrado', v_enc using errcode = 'P0002'; end if;
  select a.id into v_id from public.anamneses a where a.encounter_id = v_enc and a.status = 'rascunho';
  if v_id is not null then
    -- ja ha rascunho deste atendimento: e ele que recebe (idempotente por natureza)
    update public.anamneses set content = coalesce(payload->'content', content), status = v_status,
      revision_note = coalesce(payload->>'revision_note', revision_note), operation_id = coalesce(operation_id, v_op)
    where id = v_id;
    return v_id;
  end if;
  select coalesce(max(revision_number),0)+1 into n from public.anamneses where encounter_id = v_enc;
  insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content,
    source_anamnesis_id, copied_from_previous, revision_note, operation_id)
  values (uid, v_pid, v_enc, n, v_status, coalesce(payload->'content','{}'::jsonb),
    nullif(payload->>'source_anamnesis_id','')::uuid, coalesce((payload->>'copied_from_previous')::boolean, false),
    payload->>'revision_note', v_op)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.salvar_anamnese(jsonb) from public, anon;
grant execute on function public.salvar_anamnese(jsonb) to authenticated;

-- ============================================================================
-- 8. RPC criar_anamnese_a_partir_de — copia EXPLICITA, itens marcados previos
-- ============================================================================

create or replace function public.criar_anamnese_a_partir_de(p_encounter_id uuid, p_source_id uuid, p_operation_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); fonte public.anamneses%rowtype; v_pid uuid; v_id uuid; n int;
  novo_conteudo jsonb := '{}'::jsonb; dom record; itens jsonb; it jsonb;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_operation_id is not null then
    select a.id into v_id from public.anamneses a where a.nutritionist_id = uid and a.operation_id = p_operation_id;
    if v_id is not null then return v_id; end if;
  end if;
  select e.patient_id into v_pid from public.encounters e where e.id = p_encounter_id and e.nutritionist_id = uid;
  if v_pid is null then raise exception 'atendimento nao encontrado' using errcode = 'P0002'; end if;
  select * into fonte from public.anamneses a where a.id = p_source_id and a.nutritionist_id = uid;
  if not found then raise exception 'anamnese de origem nao encontrada' using errcode = 'P0002'; end if;
  if fonte.patient_id <> v_pid then raise exception 'anamnese de origem e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if fonte.status = 'rascunho' then raise exception 'so uma anamnese salva ou revisada pode ser copiada' using errcode = 'P0001'; end if;
  if exists (select 1 from public.anamneses a where a.encounter_id = p_encounter_id and a.status = 'rascunho') then
    raise exception 'este atendimento ja tem um rascunho de anamnese' using errcode = 'P0001', hint = 'rascunho_existente';
  end if;
  -- cada item vira informacao PREVIA, a revisar; a origem original fica no item
  if fonte.content->'dominios' is not null then
    for dom in select key, value from jsonb_each(fonte.content->'dominios') loop
      itens := '[]'::jsonb;
      for it in select * from jsonb_array_elements(coalesce(dom.value->'itens','[]'::jsonb)) loop
        itens := itens || jsonb_build_array(it || jsonb_build_object('previo', true, 'fonte_anamnese_id', fonte.id));
      end loop;
      novo_conteudo := jsonb_set(novo_conteudo, array['dominios', dom.key], jsonb_build_object('itens', itens), true);
    end loop;
  end if;
  select coalesce(max(revision_number),0)+1 into n from public.anamneses where encounter_id = p_encounter_id;
  insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content_version, content,
    source_anamnesis_id, copied_from_previous, operation_id)
  values (uid, v_pid, p_encounter_id, n, 'rascunho', fonte.content_version, novo_conteudo, fonte.id, true, p_operation_id)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.criar_anamnese_a_partir_de(uuid, uuid, uuid) from public, anon;
grant execute on function public.criar_anamnese_a_partir_de(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- 9. RPC salvar_conduta — mesma regra de revisao; acordos junto
-- ============================================================================
-- payload: { id?, encounter_id, status, campos..., references, previous_conduct_id,
--            previous_decision, previous_decision_note, revision_note,
--            operation_id?, expected_updated_at?,
--            agreements: [ { id?, description, responsible, due_text, follow_up,
--                            status, status_note, position, origin_agreement_id, operation_id? } ] }
-- Rascunho: acordos sao sincronizados (os que sairam da lista sao apagados —
-- unico DELETE permitido, e so em rascunho). Revisao nova: os acordos da
-- anterior ficam; os enviados nascem na revisao nova (origin_agreement_id
-- preserva de onde vieram).

create or replace function public.salvar_conduta(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_enc uuid; v_pid uuid; v_status text;
  atual public.conducts%rowtype; n int; alvo uuid; ag jsonb; ag_id uuid; ag_op uuid; mantidos uuid[] := '{}';
  promover boolean := false;   -- rascunho que vira salvo/revisado DEPOIS de sincronizar os acordos
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_status := coalesce(nullif(payload->>'status',''), 'rascunho');
  if v_status not in ('rascunho','salvo','revisado') then raise exception 'status invalido'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select c.id into v_id from public.conducts c where c.nutritionist_id = uid and c.operation_id = v_op;
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.conducts c where c.id = v_id and c.nutritionist_id = uid for update;
    if not found then raise exception 'conduta % nao encontrada', v_id using errcode = 'P0002'; end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'a conduta foi alterada em outro lugar; recarregue antes de salvar' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_pid := atual.patient_id; v_enc := atual.encounter_id;
    if atual.status = 'rascunho' then
      alvo := v_id; promover := true;
      update public.conducts set
        priorities = coalesce(payload->'priorities', priorities),
        objective = payload->>'objective', nutrition_strategy = payload->>'nutrition_strategy',
        actions = payload->>'actions', resources = payload->>'resources',
        related_tools = coalesce(payload->'related_tools', related_tools),
        requested_exams = payload->>'requested_exams', referrals = payload->>'referrals',
        monitoring = payload->>'monitoring', return_plan = payload->>'return_plan',
        observations = payload->>'observations', nutrition_diagnosis = payload->>'nutrition_diagnosis',
        dietary_prescription = payload->>'dietary_prescription', professional_guidance = payload->>'professional_guidance',
        "references" = coalesce(payload->'references', "references"),
        previous_conduct_id = coalesce(nullif(payload->>'previous_conduct_id','')::uuid, previous_conduct_id),
        previous_decision = coalesce(nullif(payload->>'previous_decision',''), previous_decision),
        previous_decision_note = coalesce(payload->>'previous_decision_note', previous_decision_note),
        revision_note = coalesce(payload->>'revision_note', revision_note),
        operation_id = coalesce(operation_id, v_op)
      where id = v_id;
    else
      select coalesce(max(revision_number),0)+1 into n from public.conducts where encounter_id = v_enc;
      insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, priorities, objective,
        nutrition_strategy, actions, resources, related_tools, requested_exams, referrals, monitoring, return_plan,
        observations, nutrition_diagnosis, dietary_prescription, professional_guidance, "references",
        previous_conduct_id, previous_decision, previous_decision_note, supersedes_id, revision_note, operation_id)
      values (uid, v_pid, v_enc, n, v_status, coalesce(payload->'priorities', atual.priorities),
        coalesce(payload->>'objective', atual.objective), coalesce(payload->>'nutrition_strategy', atual.nutrition_strategy),
        coalesce(payload->>'actions', atual.actions), coalesce(payload->>'resources', atual.resources),
        coalesce(payload->'related_tools', atual.related_tools), coalesce(payload->>'requested_exams', atual.requested_exams),
        coalesce(payload->>'referrals', atual.referrals), coalesce(payload->>'monitoring', atual.monitoring),
        coalesce(payload->>'return_plan', atual.return_plan), coalesce(payload->>'observations', atual.observations),
        coalesce(payload->>'nutrition_diagnosis', atual.nutrition_diagnosis),
        coalesce(payload->>'dietary_prescription', atual.dietary_prescription),
        coalesce(payload->>'professional_guidance', atual.professional_guidance),
        coalesce(payload->'references', atual."references"),
        atual.previous_conduct_id, atual.previous_decision, atual.previous_decision_note,
        atual.id, payload->>'revision_note', v_op)
      returning id into alvo;
      update public.conducts set superseded_at = now() where id = atual.id;
    end if;
  else
    v_enc := (payload->>'encounter_id')::uuid;
    if v_enc is null then raise exception 'encounter_id e obrigatorio'; end if;
    select e.patient_id into v_pid from public.encounters e where e.id = v_enc and e.nutritionist_id = uid;
    if v_pid is null then raise exception 'atendimento % nao encontrado', v_enc using errcode = 'P0002'; end if;
    select c.id into alvo from public.conducts c where c.encounter_id = v_enc and c.status = 'rascunho';
    if alvo is not null then
      return public.salvar_conduta(payload || jsonb_build_object('id', alvo));
    end if;
    select coalesce(max(revision_number),0)+1 into n from public.conducts where encounter_id = v_enc;
    promover := true;
    insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, priorities, objective,
      nutrition_strategy, actions, resources, related_tools, requested_exams, referrals, monitoring, return_plan,
      observations, nutrition_diagnosis, dietary_prescription, professional_guidance, "references",
      previous_conduct_id, previous_decision, previous_decision_note, revision_note, operation_id)
    values (uid, v_pid, v_enc, n, 'rascunho', coalesce(payload->'priorities','[]'::jsonb), payload->>'objective',
      payload->>'nutrition_strategy', payload->>'actions', payload->>'resources', coalesce(payload->'related_tools','[]'::jsonb),
      payload->>'requested_exams', payload->>'referrals', payload->>'monitoring', payload->>'return_plan',
      payload->>'observations', payload->>'nutrition_diagnosis', payload->>'dietary_prescription',
      payload->>'professional_guidance', coalesce(payload->'references','{}'::jsonb),
      nullif(payload->>'previous_conduct_id','')::uuid, nullif(payload->>'previous_decision',''),
      payload->>'previous_decision_note', payload->>'revision_note', v_op)
    returning id into alvo;
  end if;

  -- acordos desta revisao
  if payload->'agreements' is not null and jsonb_typeof(payload->'agreements') = 'array' then
    for ag in select * from jsonb_array_elements(payload->'agreements') loop
      ag_op := nullif(ag->>'operation_id','')::uuid;
      ag_id := null;
      if ag_op is not null then
        select g.id into ag_id from public.agreements g where g.nutritionist_id = uid and g.operation_id = ag_op;
      end if;
      if ag_id is null and nullif(ag->>'id','') is not null then
        select g.id into ag_id from public.agreements g where g.id = (ag->>'id')::uuid and g.conduct_id = alvo and g.nutritionist_id = uid;
      end if;
      if ag_id is not null then
        update public.agreements set description = coalesce(ag->>'description', description), responsible = ag->>'responsible',
          due_text = ag->>'due_text', follow_up = ag->>'follow_up', status = coalesce(nullif(ag->>'status',''), status),
          status_note = ag->>'status_note', position = coalesce((ag->>'position')::int, position)
        where id = ag_id;
      else
        insert into public.agreements (nutritionist_id, patient_id, conduct_id, description, responsible, due_text, follow_up,
          status, status_note, position, origin_agreement_id, operation_id)
        values (uid, v_pid, alvo, ag->>'description', ag->>'responsible', ag->>'due_text', ag->>'follow_up',
          coalesce(nullif(ag->>'status',''), 'proposto'), ag->>'status_note', coalesce((ag->>'position')::int, 0),
          nullif(ag->>'origin_agreement_id','')::uuid, ag_op)
        returning id into ag_id;
      end if;
      mantidos := mantidos || ag_id;
    end loop;
    -- em RASCUNHO, o que saiu da lista sai da conduta (unico DELETE permitido)
    if promover then
      delete from public.agreements g where g.conduct_id = alvo and not (g.id = any(mantidos));
    end if;
  end if;
  -- so agora o rascunho e consolidado (os acordos ja estao sincronizados)
  if promover and v_status <> 'rascunho' then
    update public.conducts set status = v_status where id = alvo;
  end if;
  return alvo;
end;
$$;
revoke all on function public.salvar_conduta(jsonb) from public, anon;
grant execute on function public.salvar_conduta(jsonb) to authenticated;
