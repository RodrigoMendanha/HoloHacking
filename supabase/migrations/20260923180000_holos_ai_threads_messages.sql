-- ============================================================================
-- HOLOS AI — tabelas ai_threads e ai_messages
-- ============================================================================
--
-- Conversas entre o nutricionista e a IA assistente, vinculadas a um paciente.
-- Cada thread pertence a um nutricionista e a um paciente. As mensagens dentro
-- da thread guardam role (user/assistant/system) e conteudo.
--
-- O contexto do paciente (mapa, exames, ferramentas) e montado sob demanda
-- pela Edge Function a cada requisicao — NAO e copiado permanentemente para
-- ai_messages. O campo metadata em ai_messages guarda apenas metadados leves
-- (versao do prompt, modelo, tokens usados).
--
-- RLS: cada nutricionista so ve threads e mensagens dos SEUS pacientes.
-- Nenhum acesso anon.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. AI_THREADS — uma conversa da IA sobre um paciente
-- ---------------------------------------------------------------------------

create table if not exists public.ai_threads (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  patient_id       uuid not null references public.patients(id) on delete cascade,
  titulo           text not null default 'Nova conversa',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint ai_threads_patient_owner
    foreign key (patient_id, nutritionist_id)
    references public.patients(id, nutritionist_id)
    -- esta FK composta garante em nivel de banco que o paciente pertence
    -- ao nutricionista. Precisa de um UNIQUE em patients(id, nutritionist_id).
    -- Sera criado abaixo, se nao existir.
);

-- A FK composta exige uma constraint unique em patients(id, nutritionist_id).
-- patients.id ja e PK (unique), mas a FK precisa de ambas as colunas juntas.
-- Se ja existir, o CREATE INDEX IF NOT EXISTS nao faz nada.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.patients'::regclass
      and contype = 'u'
      and array_length(conkey, 1) = 2
  ) then
    alter table public.patients
      add constraint patients_id_nutritionist_unique
      unique (id, nutritionist_id);
  end if;
end $$;

comment on table public.ai_threads is
  'Conversa entre nutricionista e HOLOS AI sobre um paciente. '
  'O contexto clinico e montado pela Edge Function a cada requisicao — '
  'nao e copiado para dentro das mensagens.';

create index if not exists ai_threads_nutritionist_idx
  on public.ai_threads (nutritionist_id);

create index if not exists ai_threads_patient_idx
  on public.ai_threads (patient_id);

alter table public.ai_threads enable row level security;

create policy "ai_threads_select_proprios"
  on public.ai_threads for select
  to authenticated
  using (nutritionist_id = auth.uid());

create policy "ai_threads_insert_proprios"
  on public.ai_threads for insert
  to authenticated
  with check (nutritionist_id = auth.uid());

create policy "ai_threads_update_proprios"
  on public.ai_threads for update
  to authenticated
  using (nutritionist_id = auth.uid())
  with check (nutritionist_id = auth.uid());

create policy "ai_threads_delete_proprios"
  on public.ai_threads for delete
  to authenticated
  using (nutritionist_id = auth.uid());

-- updated_at automatico
drop trigger if exists ai_threads_tocar_updated_at on public.ai_threads;
create trigger ai_threads_tocar_updated_at
  before update on public.ai_threads
  for each row execute function public.tocar_updated_at();


-- ---------------------------------------------------------------------------
-- 2. AI_MESSAGES — cada mensagem dentro de uma thread
-- ---------------------------------------------------------------------------

create table if not exists public.ai_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.ai_threads(id) on delete cascade,
  role        text not null,
  content     text not null,
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now(),

  constraint ai_messages_role_valido
    check (role in ('user', 'assistant', 'system'))
);

comment on table public.ai_messages is
  'Mensagens individuais dentro de uma conversa HOLOS AI. '
  'role: user (nutricionista), assistant (IA), system (prompt do sistema). '
  'metadata guarda versao do prompt, modelo, tokens — nunca dados clinicos.';

create index if not exists ai_messages_thread_idx
  on public.ai_messages (thread_id, created_at);

alter table public.ai_messages enable row level security;

-- A RLS de ai_messages verifica ownership via ai_threads: o nutricionista
-- so le mensagens de threads que sao dele.
create policy "ai_messages_select_proprios"
  on public.ai_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.ai_threads t
      where t.id = ai_messages.thread_id
        and t.nutritionist_id = auth.uid()
    )
  );

create policy "ai_messages_insert_proprios"
  on public.ai_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.ai_threads t
      where t.id = ai_messages.thread_id
        and t.nutritionist_id = auth.uid()
    )
  );

-- Mensagens nao sao editadas nem apagadas individualmente:
-- apagar a thread cascateia para as mensagens.
-- Nenhuma policy de UPDATE ou DELETE individual.


-- ---------------------------------------------------------------------------
-- 3. Revogar acesso anon (defesa em profundidade)
-- ---------------------------------------------------------------------------

revoke all on table public.ai_threads  from anon;
revoke all on table public.ai_messages from anon;
