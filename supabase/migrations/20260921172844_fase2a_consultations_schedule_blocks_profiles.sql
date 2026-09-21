-- ============================================================================
-- FASE 2a — consultations, schedule_blocks e expansao de profiles
-- ============================================================================
--
-- Escopo desta migration, e so isto:
--   1. profiles  — colunas do perfil profissional (texto, preferencias)
--   2. patients  — unique composta (id, nutritionist_id) para FK filhas
--   3. consultations — agenda de atendimentos
--   4. schedule_blocks — bloqueios de horario (almoco, aula, viagem)
--
-- NAO cria: consultas, bloqueios, holoscope_mapas, holoscope, holoscan,
-- exames, documentos, aplicacoes, storage — tudo isso continua local.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================


-- ============================================================================
-- 1. PROFILES — expandir a tabela existente
-- ============================================================================

alter table public.profiles
  add column if not exists email_contato  text,
  add column if not exists profissao      text not null default 'Nutricionista',
  add column if not exists registro       text,
  add column if not exists especialidade  text,
  add column if not exists cidade         text,
  add column if not exists instagram      text,
  add column if not exists telefone       text,
  add column if not exists fuso           text not null default 'America/Sao_Paulo',
  add column if not exists cor_primaria   text not null default '#0b3325',
  add column if not exists cor_secundaria text not null default '#c9a35a',
  add column if not exists modulos        jsonb not null default
    '{"consultas":true,"agenda":true,"documentos":true}'::jsonb,
  add column if not exists updated_at     timestamptz not null default now();

-- Trigger de updated_at — reutiliza public.tocar_updated_at() da Fase 1.
drop trigger if exists profiles_tocar_updated_at on public.profiles;
create trigger profiles_tocar_updated_at
  before update on public.profiles
  for each row execute function public.tocar_updated_at();

-- Atualizar lidar_novo_usuario para preencher updated_at no bootstrap.
create or replace function public.lidar_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, updated_at)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email), now())
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Manter os revokes da Fase 1 — a funcao foi recriada, os grants resetam.
revoke execute on function public.lidar_novo_usuario() from public;
revoke execute on function public.lidar_novo_usuario() from anon;
revoke execute on function public.lidar_novo_usuario() from authenticated;


-- ============================================================================
-- 2. PATIENTS — unique composta para FK de tabelas filhas
-- ============================================================================

alter table public.patients
  add constraint patients_id_nutritionist_id_unique
  unique (id, nutritionist_id);


-- ============================================================================
-- 3. CONSULTATIONS — agenda de atendimentos
-- ============================================================================

create table public.consultations (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default (select auth.uid()),
  patient_id       uuid not null,
  data             date not null,
  hora             time not null,
  duracao_min      integer not null default 60,
  tipo             text not null,
  nota             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint consultations_duracao_positiva
    check (duracao_min > 0),

  constraint consultations_tipo_valido
    check (tipo in (
      'primeira_consulta',
      'retorno',
      'reavaliacao_holoscope',
      'online'
    )),

  constraint consultations_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict
);

create index consultations_nutritionist_id_idx
  on public.consultations (nutritionist_id);

create index consultations_patient_id_idx
  on public.consultations (patient_id);

create index consultations_nutritionist_data_idx
  on public.consultations (nutritionist_id, data);

drop trigger if exists consultations_tocar_updated_at on public.consultations;
create trigger consultations_tocar_updated_at
  before update on public.consultations
  for each row execute function public.tocar_updated_at();

alter table public.consultations enable row level security;

create policy consultations_select_proprios
  on public.consultations for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy consultations_insert_proprios
  on public.consultations for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy consultations_update_proprios
  on public.consultations for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy consultations_delete_proprios
  on public.consultations for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));


-- ============================================================================
-- 4. SCHEDULE_BLOCKS — bloqueios de horario
-- ============================================================================

create table public.schedule_blocks (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default (select auth.uid())
                     references auth.users(id),
  data             date not null,
  inicio           time,
  fim              time,
  dia_todo         boolean not null default false,
  motivo           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint schedule_blocks_horario_coerente
    check (
      (dia_todo = true and inicio is null and fim is null)
      or
      (dia_todo = false and inicio is not null and fim is not null)
    )
);

create index schedule_blocks_nutritionist_id_idx
  on public.schedule_blocks (nutritionist_id);

drop trigger if exists schedule_blocks_tocar_updated_at on public.schedule_blocks;
create trigger schedule_blocks_tocar_updated_at
  before update on public.schedule_blocks
  for each row execute function public.tocar_updated_at();

alter table public.schedule_blocks enable row level security;

create policy schedule_blocks_select_proprios
  on public.schedule_blocks for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy schedule_blocks_insert_proprios
  on public.schedule_blocks for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy schedule_blocks_update_proprios
  on public.schedule_blocks for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy schedule_blocks_delete_proprios
  on public.schedule_blocks for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));
