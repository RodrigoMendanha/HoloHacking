-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 5 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Snapshot holos_next_steps (um por aplicacao e catalogo), gatilho de imutabilidade, RLS (so leitura; escrita so por RPC).
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'holos_recommendation_rules_proteger') then raise exception 'rode a PARTE 4 antes (gatilho do catalogo nao existe)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 2. SNAPSHOT: um por (aplicacao HOLOSCAN, catalogo); imutavel; so por RPC
-- ----------------------------------------------------------------------------
create table if not exists public.holos_next_steps (
  id                       uuid primary key default gen_random_uuid(),
  nutritionist_id          uuid not null default auth.uid() references auth.users(id),
  patient_id               uuid not null,
  encounter_id             uuid,
  holoscan_application_id  uuid not null references public.holoscan_applications(id),
  catalog_id               uuid not null references public.holos_recommendation_catalogs(id),
  catalog_code             text not null,
  catalog_version          integer not null,
  catalog_hash             text not null,
  engine_version           text not null,
  systems_order            jsonb not null,
  selection                jsonb not null,
  content_snapshot         jsonb not null,
  content_hash             text not null,
  created_at               timestamptz not null default now(),
  constraint holos_next_steps_unico unique (holoscan_application_id, catalog_id),
  constraint holos_next_steps_paciente_fk foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete cascade
);
comment on table public.holos_next_steps is 'Proximos Passos HOLOS registrados para uma aplicacao HOLOSCAN e um catalogo: o que foi recomendado, segundo qual catalogo/versao. Nunca reescrito.';
create index if not exists holos_next_steps_aplicacao on public.holos_next_steps (holoscan_application_id, catalog_version desc);

create or replace function public.proteger_proximos_passos()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Proximos Passos registrados sao imutaveis: catalogo novo gera registro novo' using errcode = 'P0001', hint = 'snapshot_imutavel'; end; $$;
revoke all on function public.proteger_proximos_passos() from public, anon, authenticated;
drop trigger if exists holos_next_steps_proteger on public.holos_next_steps;
create trigger holos_next_steps_proteger before update or delete on public.holos_next_steps for each row execute function public.proteger_proximos_passos();

alter table public.holos_next_steps enable row level security;
drop policy if exists holos_next_steps_select on public.holos_next_steps;
create policy holos_next_steps_select on public.holos_next_steps for select to authenticated using (nutritionist_id = (select auth.uid()));
revoke all on table public.holos_next_steps from public, anon, authenticated;
grant select on table public.holos_next_steps to authenticated;

commit;
