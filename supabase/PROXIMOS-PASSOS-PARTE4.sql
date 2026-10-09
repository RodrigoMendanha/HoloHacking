-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 4 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Gatilhos de imutabilidade do catalogo e RLS (a aplicacao so le).
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if (select count(*) from public.holos_recommendation_rules r join public.holos_recommendation_catalogs c on c.id = r.catalog_id where c.code = 'HOLOS-RECOMENDACOES-V1' and c.version = 1 and c.content_hash <> 'pendente') <> 30 then raise exception 'rode a PARTE 3 antes (catalogo com 30 regras e hash nao existe)'; end if;
end $$;
-- imutavel: nem a aplicacao nem o dono do banco alteram; nova versao = nova migration (que recria o gatilho)
create or replace function public.proteger_catalogo_recomendacoes()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'catalogo de recomendacoes e configuracao global aprovada: muda so por migration versionada' using errcode = 'P0001', hint = 'catalogo_imutavel'; end; $$;
revoke all on function public.proteger_catalogo_recomendacoes() from public, anon, authenticated;
drop trigger if exists holos_recommendation_catalogs_proteger on public.holos_recommendation_catalogs;
create trigger holos_recommendation_catalogs_proteger before insert or update or delete on public.holos_recommendation_catalogs for each row execute function public.proteger_catalogo_recomendacoes();
drop trigger if exists holos_recommendation_rules_proteger on public.holos_recommendation_rules;
create trigger holos_recommendation_rules_proteger before insert or update or delete on public.holos_recommendation_rules for each row execute function public.proteger_catalogo_recomendacoes();

alter table public.holos_recommendation_catalogs enable row level security;
alter table public.holos_recommendation_rules enable row level security;
drop policy if exists holos_recommendation_catalogs_select on public.holos_recommendation_catalogs;
create policy holos_recommendation_catalogs_select on public.holos_recommendation_catalogs for select to authenticated using (true);
drop policy if exists holos_recommendation_rules_select on public.holos_recommendation_rules;
create policy holos_recommendation_rules_select on public.holos_recommendation_rules for select to authenticated using (true);
revoke all on table public.holos_recommendation_catalogs, public.holos_recommendation_rules from public, anon, authenticated;
grant select on table public.holos_recommendation_catalogs, public.holos_recommendation_rules to authenticated;

commit;
