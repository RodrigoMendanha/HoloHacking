-- =====================================================================
-- RESULTADO HOLOS — PARTE 1 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- Cria a tabela holos_results, os gatilhos de imutabilidade e a RLS.
-- Rode as partes NA ORDEM (1, 2, 3). Se uma parte der erro, nada dela e aplicado: corrija e rode de novo a MESMA parte.
-- Conteudo identico a supabase/migrations/20261009100000_resultado_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- PRE
do $$
declare faltando text[] := '{}';
begin
  if to_regclass('public.holos_results') is not null then raise exception 'PARTE 1 ja aplicada (holos_results existe): siga para a PARTE 2'; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261008100000') then faltando := faltando || 'migration 20261008100000 (cadastro)'; end if;
  if to_regprocedure('public.conta_ativa()') is null then faltando := faltando || 'conta_ativa()'; end if;
  if to_regprocedure('public.proteger_revisao_consolidada()') is null then faltando := faltando || 'proteger_revisao_consolidada()'; end if;
  if to_regprocedure('public.carimbar_revisao()') is null then faltando := faltando || 'carimbar_revisao()'; end if;
  if to_regprocedure('public.bloquear_escrita_paciente_arquivado()') is null then faltando := faltando || 'bloquear_escrita_paciente_arquivado()'; end if;
  if to_regprocedure('public.tocar_updated_at()') is null then faltando := faltando || 'tocar_updated_at()'; end if;
  if not exists (select 1 from pg_constraint where conname = 'patients_id_nutritionist_id_unique') then faltando := faltando || 'patients (id, nutritionist_id)'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name = 'calculation_mode') then faltando := faltando || 'holoscan_applications.calculation_mode'; end if;
  if array_length(faltando, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(faltando, ', '); end if;
end $$;

create table if not exists public.holos_results (
  id                         uuid primary key default gen_random_uuid(),
  nutritionist_id            uuid not null default auth.uid() references auth.users(id),
  patient_id                 uuid not null,
  encounter_id               uuid not null,
  status                     text not null default 'rascunho',
  revision_number            integer not null default 1,
  supersedes_id              uuid,
  superseded_at              timestamptz,
  holoscan_application_id    uuid not null,
  -- {holoscan_application_id, tool_application_ids[], visao_paciente:{ferramentas:{<id>:{mostrar:bool, ocultar:[]}}}}
  -- "ocultar" (lista de campos) fica reservado para a granularidade por item; nesta versao e sempre [].
  selected_sources           jsonb not null default '{}'::jsonb,
  leitura_profissional       text,
  pontos_acompanhar          text,
  questoes_aprofundar        text,
  content_snapshot           jsonb,
  source_snapshot            jsonb,
  content_hash               text,
  template_version           integer not null default 1,
  methodology_package_id     uuid,
  methodology_package_version integer,
  methodology_content_hash   text,
  operation_id               uuid,
  saved_at                   timestamptz,
  reviewed_at                timestamptz,
  reviewed_by                uuid,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  constraint holos_results_status_valido check (status in ('rascunho', 'salvo', 'revisado')),
  constraint holos_results_revisao_positiva check (revision_number >= 1),
  constraint holos_results_salvo_completo check (status = 'rascunho' or (content_snapshot is not null and source_snapshot is not null
    and content_hash is not null and saved_at is not null and methodology_package_id is not null)),
  constraint holos_results_hash_formato check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  constraint holos_results_textos_tamanho check (coalesce(length(leitura_profissional), 0) <= 20000
    and coalesce(length(pontos_acompanhar), 0) <= 10000 and coalesce(length(questoes_aprofundar), 0) <= 10000),
  constraint holos_results_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint holos_results_patient_fk foreign key (patient_id, nutritionist_id)
    references public.patients(id, nutritionist_id) on delete restrict,
  constraint holos_results_encounter_fk foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters(id, patient_id, nutritionist_id) on delete restrict,
  constraint holos_results_supersedes_fk foreign key (supersedes_id, patient_id, nutritionist_id)
    references public.holos_results(id, patient_id, nutritionist_id) on delete restrict
);

comment on table public.holos_results is
  'Resultado HOLOS: snapshot integrado (HOLOSCAN oficial + ferramentas + observacoes) montado pelo servidor; imutavel depois de salvo.';

create index if not exists holos_results_patient_idx on public.holos_results (patient_id, created_at desc);
create index if not exists holos_results_encounter_idx on public.holos_results (encounter_id);
create index if not exists holos_results_holoscan_idx on public.holos_results (holoscan_application_id);
create unique index if not exists holos_results_operation_unique on public.holos_results (nutritionist_id, operation_id) where operation_id is not null;
-- cada versao tem no maximo UMA versao seguinte (historico linear)
create unique index if not exists holos_results_supersedes_unique on public.holos_results (supersedes_id) where supersedes_id is not null;

-- gatilhos: updated_at, paciente arquivado, imutabilidade da revisao consolidada, carimbo de revisao
drop trigger if exists holos_results_tocar_updated_at on public.holos_results;
create trigger holos_results_tocar_updated_at before update on public.holos_results
  for each row execute function public.tocar_updated_at();
drop trigger if exists holos_results_paciente_arquivado on public.holos_results;
create trigger holos_results_paciente_arquivado before insert or update on public.holos_results
  for each row execute function public.bloquear_escrita_paciente_arquivado();
drop trigger if exists holos_results_proteger_revisao on public.holos_results;
create trigger holos_results_proteger_revisao before update on public.holos_results
  for each row execute function public.proteger_revisao_consolidada();
drop trigger if exists holos_results_carimbar_revisao on public.holos_results;
create trigger holos_results_carimbar_revisao before insert or update on public.holos_results
  for each row execute function public.carimbar_revisao();

-- identidade nunca muda (nem no rascunho) e resultado consolidado nunca e apagado
create or replace function public.proteger_identidade_resultado_holos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'rascunho' then
      raise exception 'resultado HOLOS salvo nao e apagado' using errcode = 'P0001', hint = 'revisao_imutavel';
    end if;
    return old;
  end if;
  if new.nutritionist_id <> old.nutritionist_id or new.patient_id <> old.patient_id or new.created_at <> old.created_at
     or new.revision_number <> old.revision_number or new.supersedes_id is distinct from old.supersedes_id then
    raise exception 'resultado HOLOS nao muda de paciente, profissional ou versao' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists holos_results_proteger_identidade on public.holos_results;
create trigger holos_results_proteger_identidade before update or delete on public.holos_results
  for each row execute function public.proteger_identidade_resultado_holos();

-- RLS: so a propria nutricionista le; escrita SO pelas funcoes abaixo
alter table public.holos_results enable row level security;
drop policy if exists holos_results_select_proprios on public.holos_results;
create policy holos_results_select_proprios on public.holos_results for select to authenticated
  using (nutritionist_id = (select auth.uid()));
revoke all on public.holos_results from public, anon, authenticated;
grant select on public.holos_results to authenticated;
do $$ begin
  if to_regclass('public.holos_results') is null then raise exception 'POS 1: tabela nao criada'; end if;
  if (select count(*) from pg_trigger where tgrelid = 'public.holos_results'::regclass and not tgisinternal) <> 5 then raise exception 'POS 1: esperados 5 gatilhos'; end if;
end $$;
commit;
select 'PARTE 1 OK: tabela holos_results, gatilhos e RLS. Agora rode a PARTE 2.' as resultado;
