-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 1 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Catalogo HOLOS-RECOMENDACOES-V1: as duas tabelas (catalogos e regras), vazias.
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
declare faltando text[] := '{}';
begin
  if to_regclass('public.holoscan_applications') is null then faltando := faltando || 'holoscan_applications'; end if;
  if to_regclass('public.methodology_associations') is null then faltando := faltando || 'methodology_associations'; end if;
  if to_regprocedure('public.conta_ativa()') is null then faltando := faltando || 'conta_ativa()'; end if;
  if not exists (select 1 from pg_constraint where conname = 'patients_id_nutritionist_id_unique') then faltando := faltando || 'patients (id, nutritionist_id)'; end if;
  if to_regclass('supabase_migrations.schema_migrations') is not null and not exists (select 1 from supabase_migrations.schema_migrations where version = '20261011100000') then faltando := faltando || 'migration 20261011100000 (prontuario) — aplique-a antes'; end if;
  if array_length(faltando, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(faltando, ', '); end if;
end $$;
-- ----------------------------------------------------------------------------
-- 1. CATALOGO (global, somente leitura, imutavel)
-- ----------------------------------------------------------------------------
create table if not exists public.holos_recommendation_catalogs (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  version       integer not null,
  status        text not null,
  content_hash  text not null,
  provenance    text not null,
  approved_at   timestamptz not null,
  approved_by   uuid references auth.users(id),   -- nulo: aprovacao expressa registrada fora do sistema (ver provenance)
  created_at    timestamptz not null default now(),
  constraint holos_recommendation_catalogs_unico unique (code, version),
  constraint holos_recommendation_catalogs_status check (status in ('aprovado', 'retirado')),
  constraint holos_recommendation_catalogs_versao check (version >= 1)
);
comment on table public.holos_recommendation_catalogs is 'Catalogos de recomendacao de ferramentas (Proximos Passos HOLOS). Global; muda so por migration versionada.';

create table if not exists public.holos_recommendation_rules (
  id                  uuid primary key default gen_random_uuid(),
  catalog_id          uuid not null references public.holos_recommendation_catalogs(id),
  rule_id             text not null,
  catalog_code        text not null,
  catalog_version     integer not null,
  system_id           text not null,
  rank                integer not null,
  tool_id             text not null,
  professional_reason text not null,
  next_action         text not null,
  status              text not null,
  provenance          text not null,
  approved_at         timestamptz not null,
  approved_by         uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  constraint holos_recommendation_rules_rule_id_unico unique (rule_id),
  constraint holos_recommendation_rules_rank_unico unique (catalog_id, system_id, rank),
  constraint holos_recommendation_rules_tool_unico unique (catalog_id, system_id, tool_id),
  constraint holos_recommendation_rules_status check (status in ('aprovado', 'retirado')),
  constraint holos_recommendation_rules_rank check (rank between 1 and 6),
  constraint holos_recommendation_rules_sistema check (system_id in ('fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual')),
  constraint holos_recommendation_rules_ferramenta check (tool_id in ('oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1')),
  constraint holos_recommendation_rules_textos check (char_length(professional_reason) between 1 and 400 and char_length(next_action) between 1 and 400)
);
comment on table public.holos_recommendation_rules is 'Regras do catalogo de Proximos Passos HOLOS: sistema -> ferramenta (uma das 10 ativas), em ordem metodologica (rank). Nunca usa exames.';
create index if not exists holos_recommendation_rules_catalogo on public.holos_recommendation_rules (catalog_id, system_id, rank);

commit;
