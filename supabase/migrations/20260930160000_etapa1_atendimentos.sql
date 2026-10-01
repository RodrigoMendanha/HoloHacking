-- V1, Etapa 1 — FUNDACAO DE DADOS: AGENDA (agendamento) x ATENDIMENTO clinico.
-- NAO APLICADA em producao ate esta data. Entra DEPOIS das pendentes da
-- Etapa 0 (20260930130000, 20260930140000, 20260930150000), que nao sao
-- reescritas aqui.
--
-- O que muda (ver docs/v1/ETAPA1-ARQUITETURA-ATENDIMENTOS.md):
--   1. consultations continua sendo o AGENDAMENTO. Ganha cancelamento sem
--      DELETE (cancelled_at, cancellation_reason) e proveniencia de
--      reagendamento (rescheduled_from_id, rescheduled_to_id).
--   2. encounters e a entidade nova do ATENDIMENTO CLINICO: paciente,
--      profissional, data/hora clinica (occurred_at + timezone), agendamento
--      de origem OPCIONAL e operation_id para idempotencia.
--   3. holoscan_applications, tool_applications e lab_collections ganham
--      encounter_id (NULL para o historico; nenhum backfill por data), com
--      FK composta: registro do paciente A nunca aponta para atendimento
--      do paciente B nem de outro profissional.
--   4. RPCs criar_atendimento (idempotente por operation_id) e
--      reagendar_consulta (atomica, preserva o original). Ambas SECURITY
--      INVOKER: a RLS continua decidindo o que cada profissional ve.
--   5. salvar_holoscan_completo passa a aceitar application.encounter_id
--      (mantendo a normalizacao de ausencia da migration 130000).
--
-- Nao muda: RLS e policies existentes, estados do paciente, CHECKs de tipo
-- de consulta, snapshot do HOLOSCAN, identidade da coleta. Nenhum DELETE,
-- nenhum UPDATE em dado existente.

-- ============================================================================
-- 1. CONSULTATIONS — cancelar e reagendar sem apagar
-- ============================================================================

alter table public.consultations
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists rescheduled_from_id uuid,
  add column if not exists rescheduled_to_id   uuid;

alter table public.consultations
  add constraint consultations_rescheduled_from_fk
    foreign key (rescheduled_from_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (rescheduled_from_id);

alter table public.consultations
  add constraint consultations_rescheduled_to_fk
    foreign key (rescheduled_to_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (rescheduled_to_id);

create index if not exists consultations_cancelled_idx
  on public.consultations (nutritionist_id, cancelled_at)
  where cancelled_at is not null;

-- ============================================================================
-- 2. ENCOUNTERS — o atendimento clinico
-- ============================================================================

create table public.encounters (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid()
                     references auth.users(id),
  patient_id       uuid not null,
  consultation_id  uuid,
  occurred_at      timestamptz not null,
  timezone         text,
  type             text,
  modality         text,
  status           text,
  summary_text     text,
  operation_id     uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint encounters_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict,

  -- atendimento do paciente A nunca aponta para agendamento do paciente B
  -- (nem de outro profissional): a FK e composta.
  constraint encounters_consultation_fk
    foreign key (consultation_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (consultation_id),

  -- alvo das FKs compostas das tabelas clinicas
  constraint encounters_id_patient_nutritionist_unique
    unique (id, patient_id, nutritionist_id)
);

create index encounters_nutritionist_occurred_idx
  on public.encounters (nutritionist_id, occurred_at desc);
create index encounters_patient_idx
  on public.encounters (patient_id, occurred_at desc);
create index encounters_consultation_idx
  on public.encounters (consultation_id)
  where consultation_id is not null;

-- idempotencia: a mesma operacao, repetida, nao vira dois atendimentos
create unique index encounters_operation_unique
  on public.encounters (nutritionist_id, operation_id)
  where operation_id is not null;

drop trigger if exists encounters_tocar_updated_at on public.encounters;
create trigger encounters_tocar_updated_at
  before update on public.encounters
  for each row execute function public.tocar_updated_at();

-- paciente arquivado nao recebe atendimento (mesma funcao da migration 150000)
drop trigger if exists encounters_paciente_arquivado on public.encounters;
create trigger encounters_paciente_arquivado
  before insert or update on public.encounters
  for each row execute function public.bloquear_escrita_paciente_arquivado();

alter table public.encounters enable row level security;

create policy encounters_select_proprios
  on public.encounters for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy encounters_insert_proprios
  on public.encounters for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy encounters_update_proprios
  on public.encounters for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

-- sem policy de DELETE: atendimento nao e apagado nesta etapa.

revoke all on table public.encounters from public, anon;
grant select, insert, update on table public.encounters to authenticated;

-- ============================================================================
-- 3. VINCULO CLINICO NOVO: encounter_id nas tabelas clinicas
-- ============================================================================
-- NULL para tudo o que ja existe. Nenhum backfill: deduzir por data seria
-- afirmar um atendimento que ninguem registrou.

alter table public.holoscan_applications
  add column if not exists encounter_id uuid;
alter table public.holoscan_applications
  add constraint holoscan_applications_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id)
    on delete restrict;
create index if not exists holoscan_applications_encounter_idx
  on public.holoscan_applications (encounter_id) where encounter_id is not null;

alter table public.tool_applications
  add column if not exists encounter_id uuid;
alter table public.tool_applications
  add constraint tool_applications_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id)
    on delete restrict;
create index if not exists tool_applications_encounter_idx
  on public.tool_applications (encounter_id) where encounter_id is not null;
-- consultation_id continua: vinculo LEGADO com o agendamento (nao apagado,
-- nao backfilled). encounter_id e o vinculo clinico da V1.

alter table public.lab_collections
  add column if not exists encounter_id uuid;
alter table public.lab_collections
  add constraint lab_collections_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id)
    on delete restrict;
create index if not exists lab_collections_encounter_idx
  on public.lab_collections (encounter_id) where encounter_id is not null;

-- ============================================================================
-- 4. RPC criar_atendimento — idempotente por operation_id
-- ============================================================================
-- SECURITY INVOKER: insere como o proprio profissional autenticado; a RLS
-- e as FKs compostas continuam valendo. payload:
--   { patient_id, consultation_id?, occurred_at, timezone?, type?,
--     modality?, status?, summary_text?, operation_id? }
-- Devolve o id. Com operation_id repetido devolve o atendimento ja criado
-- (e recusa se ele for de outro paciente).

create or replace function public.criar_atendimento(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid     uuid := auth.uid();
  v_pid   uuid;
  v_op    uuid;
  v_id    uuid;
  v_outro uuid;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;
  if payload is null or payload->>'patient_id' is null or payload->>'occurred_at' is null then
    raise exception 'payload incompleto: patient_id e occurred_at sao obrigatorios';
  end if;
  v_pid := (payload->>'patient_id')::uuid;
  v_op  := nullif(payload->>'operation_id', '')::uuid;

  if v_op is not null then
    select e.id, e.patient_id into v_id, v_outro
      from public.encounters e
     where e.nutritionist_id = uid and e.operation_id = v_op;
    if v_id is not null then
      if v_outro <> v_pid then
        raise exception 'operation_id ja usado em atendimento de outro paciente'
          using errcode = 'P0001', hint = 'operation_id_conflito';
      end if;
      return v_id;
    end if;
  end if;

  begin
    insert into public.encounters (
      nutritionist_id, patient_id, consultation_id, occurred_at, timezone,
      type, modality, status, summary_text, operation_id
    ) values (
      uid, v_pid,
      nullif(payload->>'consultation_id', '')::uuid,
      (payload->>'occurred_at')::timestamptz,
      nullif(payload->>'timezone', ''),
      nullif(payload->>'type', ''),
      nullif(payload->>'modality', ''),
      nullif(payload->>'status', ''),
      nullif(payload->>'summary_text', ''),
      v_op
    ) returning id into v_id;
  exception when unique_violation then
    -- a mesma operacao chegou duas vezes ao mesmo tempo: fica a que venceu
    if v_op is null then raise; end if;
    select e.id into v_id from public.encounters e
     where e.nutritionist_id = uid and e.operation_id = v_op;
    if v_id is null then raise; end if;
  end;
  return v_id;
end;
$$;

revoke all on function public.criar_atendimento(jsonb) from public, anon;
grant execute on function public.criar_atendimento(jsonb) to authenticated;

-- ============================================================================
-- 5. RPC reagendar_consulta — atomica, preserva o original
-- ============================================================================
-- Cria o agendamento novo (rescheduled_from_id = original) e marca o original
-- como cancelado com rescheduled_to_id = novo. Nunca DELETE + INSERT.
-- Um agendamento ja cancelado ou ja reagendado nao e reagendado de novo.

create or replace function public.reagendar_consulta(
  p_consultation_id uuid,
  p_data date,
  p_hora time,
  p_duracao_min integer default null,
  p_tipo text default null,
  p_nota text default null,
  p_motivo text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  orig public.consultations%rowtype;
  novo uuid;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;
  if p_data is null or p_hora is null then
    raise exception 'informe a nova data e a nova hora';
  end if;
  select * into orig from public.consultations c
   where c.id = p_consultation_id and c.nutritionist_id = uid
   for update;
  if not found then
    raise exception 'consulta % nao encontrada', p_consultation_id using errcode = 'P0002';
  end if;
  if orig.cancelled_at is not null or orig.rescheduled_to_id is not null then
    raise exception 'consulta ja cancelada ou reagendada; reagende a consulta vigente'
      using errcode = 'P0001', hint = 'consulta_encerrada';
  end if;

  insert into public.consultations (
    nutritionist_id, patient_id, data, hora, duracao_min, tipo, nota, rescheduled_from_id
  ) values (
    uid, orig.patient_id, p_data, p_hora,
    coalesce(p_duracao_min, orig.duracao_min),
    coalesce(nullif(p_tipo, ''), orig.tipo),
    coalesce(p_nota, orig.nota),
    orig.id
  ) returning id into novo;

  update public.consultations
     set cancelled_at = now(),
         cancellation_reason = coalesce(nullif(p_motivo, ''), 'reagendada'),
         rescheduled_to_id = novo
   where id = orig.id;

  return novo;
end;
$$;

revoke all on function public.reagendar_consulta(uuid, date, time, integer, text, text, text) from public, anon;
grant execute on function public.reagendar_consulta(uuid, date, time, integer, text, text, text) to authenticated;

-- ============================================================================
-- 6. salvar_holoscan_completo aceita application.encounter_id
-- ============================================================================
-- Mesmo corpo da migration 20260930130000 (ausencia -> null) mais a coluna
-- encounter_id (NULL quando o payload nao a traz: compatibilidade com o
-- front antigo). A FK composta recusa atendimento de outro paciente.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record;
  triada_norm jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid,
    NULLIF(app_data->>'encounter_id', '')::uuid,
    (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    COALESCE(app_data->'combinacoes','[]'::jsonb),
    COALESCE(app_data->'aprofundamentos','[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END
  ) RETURNING id INTO app_id;
  FOR r IN SELECT * FROM jsonb_array_elements(ans_data) AS elem LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.value->>'marcador_id', (r.value->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(sc_data) AS elem LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.value->>'sistema', r.value->>'nome',
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'nota')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'carga')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN r.value->>'faixa' END,
      (r.value->>'obtido')::numeric, (r.value->>'maximo')::numeric,
      (r.value->>'respondidos')::integer, (r.value->>'total_marcadores')::integer,
      (r.value->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;
