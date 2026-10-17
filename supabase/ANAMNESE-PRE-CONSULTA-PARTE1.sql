-- =====================================================================
-- ANAMNESE PRE-CONSULTA POR LINK (09/10) — PARTE 1 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- Tabela anamnesis_invites (convite com token so como hash).
-- Rode as partes NA ORDEM (1 a 5). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema ("if not exists" / "create or replace" / "drop ... if exists").
-- SOMENTE ADITIVA: tabela e funcoes novas. Nao altera anamneses, HOLOSCAN, ferramentas, Resultado HOLOS nem metodologia.
-- Conteudo identico a supabase/migrations/20261014100000_anamnese_pre_consulta.sql (dividido so para caber no editor).
-- A ULTIMA LINHA ANTES DA CONFERENCIA E "commit;". Se o editor cortar o texto, nao rode.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
declare faltando text[] := '{}';
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261013100000') then faltando := faltando || 'migration 20261013100000 (conta pendente)'; end if;
  if to_regprocedure('public.exigir_conta_ativa()') is null then faltando := faltando || 'exigir_conta_ativa()'; end if;
  if to_regprocedure('extensions.gen_random_bytes(integer)') is null then faltando := faltando || 'extensions.gen_random_bytes (pgcrypto)'; end if;
  if to_regprocedure('extensions.digest(bytea, text)') is null then faltando := faltando || 'extensions.digest (pgcrypto)'; end if;
  if array_length(faltando, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(faltando, ', '); end if;
end $$;
create table if not exists public.anamnesis_invites (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  patient_id            uuid not null,
  encounter_id          uuid,
  token_hash            text not null,
  status                text not null default 'enviado',
  form_version          integer not null default 2,
  form_tipo             text not null default 'primeira',
  expires_at            timestamptz not null,
  draft_content         jsonb,
  submitted_content     jsonb,
  save_count            integer not null default 0,
  professional_snapshot jsonb not null default '{}'::jsonb,
  imported_anamnesis_id uuid,
  imported_at           timestamptz,
  created_at            timestamptz not null default now(),
  started_at            timestamptz,
  last_saved_at         timestamptz,
  submitted_at          timestamptz,
  revoked_at            timestamptz,
  constraint anamnesis_invites_token_hash_unico unique (token_hash),
  constraint anamnesis_invites_token_hash_formato check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint anamnesis_invites_status_valido check (status in ('enviado', 'iniciado', 'concluido', 'revogado')),
  constraint anamnesis_invites_tipo_valido check (form_tipo in ('primeira', 'retorno')),
  constraint anamnesis_invites_versao_valida check (form_version = 2),
  constraint anamnesis_invites_concluido_coerente check ((status = 'concluido') = (submitted_content is not null and submitted_at is not null)),
  constraint anamnesis_invites_revogado_coerente check ((status = 'revogado') = (revoked_at is not null)),
  constraint anamnesis_invites_tamanho check (coalesce(pg_column_size(draft_content), 0) <= 65536 and coalesce(pg_column_size(submitted_content), 0) <= 65536
                                              and pg_column_size(professional_snapshot) <= 131072),
  constraint anamnesis_invites_paciente_fk foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete cascade,
  constraint anamnesis_invites_atendimento_fk foreign key (encounter_id, patient_id, nutritionist_id) references public.encounters (id, patient_id, nutritionist_id)
);
comment on table public.anamnesis_invites is 'Anamnese pre-consulta por link: convite (token so como sha256), rascunho e resposta enviada pela paciente (relato_paciente, imutavel). Nao e anamnese do atendimento ate a nutricionista levar para la.';
create index if not exists anamnesis_invites_paciente on public.anamnesis_invites (patient_id, created_at desc);
commit;

select 'tabela anamnesis_invites' as item, (to_regclass('public.anamnesis_invites') is not null)::text as valor;
