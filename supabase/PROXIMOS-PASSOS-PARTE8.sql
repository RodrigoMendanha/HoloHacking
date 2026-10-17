-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 8 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Conferencia final (POS) e registro da migration em supabase_migrations. Nao muda dado nenhum.
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.registrar_proximos_passos(uuid)') is null then raise exception 'rode a PARTE 7 antes (RPCs nao existem)'; end if;
end $$;
-- POS: confere tudo e so entao registra a migration
do $$
declare n int;
begin
  select count(*) into n from public.holos_recommendation_rules r join public.holos_recommendation_catalogs c on c.id = r.catalog_id where c.code = 'HOLOS-RECOMENDACOES-V1' and c.version = 1 and c.status = 'aprovado' and r.status = 'aprovado';
  if n <> 30 then raise exception 'POS: esperadas 30 regras aprovadas, encontradas %', n; end if;
  if (select content_hash from public.holos_recommendation_catalogs where code = 'HOLOS-RECOMENDACOES-V1' and version = 1)
     <> (select encode(sha256(convert_to(string_agg(r.rule_id || '|' || r.system_id || '|' || r.rank || '|' || r.tool_id || '|' || r.professional_reason || '|' || r.next_action, E'\n' order by r.rule_id), 'UTF8')), 'hex') from public.holos_recommendation_rules r where r.catalog_version = 1)
     then raise exception 'POS: content_hash do catalogo nao confere'; end if;
  select count(*) into n from pg_trigger where not tgisinternal and tgname in ('holos_recommendation_catalogs_proteger', 'holos_recommendation_rules_proteger', 'holos_next_steps_proteger');
  if n <> 3 then raise exception 'POS: esperados 3 gatilhos, encontrados %', n; end if;
  if has_table_privilege('authenticated', 'public.holos_recommendation_rules', 'insert') or has_table_privilege('authenticated', 'public.holos_recommendation_rules', 'update') or has_table_privilege('authenticated', 'public.holos_recommendation_rules', 'delete')
     or has_table_privilege('authenticated', 'public.holos_next_steps', 'insert') or has_table_privilege('authenticated', 'public.holos_next_steps', 'update') or has_table_privilege('authenticated', 'public.holos_next_steps', 'delete')
     or has_table_privilege('anon', 'public.holos_recommendation_rules', 'select') or has_table_privilege('anon', 'public.holos_next_steps', 'select') then
    raise exception 'POS: privilegios de tabela mais largos que o esperado';
  end if;
  if not has_table_privilege('authenticated', 'public.holos_recommendation_rules', 'select') or not has_table_privilege('authenticated', 'public.holos_next_steps', 'select') then raise exception 'POS: a aplicacao perdeu a leitura'; end if;
  if has_function_privilege('anon', 'public.registrar_proximos_passos(uuid)', 'execute') or has_function_privilege('authenticated', 'public.proximos_passos_calcular(uuid, uuid)', 'execute')
     or not has_function_privilege('authenticated', 'public.proximos_passos_holos(uuid)', 'execute') or not has_function_privilege('authenticated', 'public.registrar_proximos_passos(uuid)', 'execute') then
    raise exception 'POS: execucao de funcao fora do esperado';
  end if;
end $$;

do $$ begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    insert into supabase_migrations.schema_migrations (version, name) values ('20261012100000', 'proximos_passos_holos') on conflict (version) do nothing;
  end if;
end $$;
commit;

select 'catalogos' as item, (select count(*)::text from public.holos_recommendation_catalogs) as valor
union all select 'regras aprovadas (v1)', (select count(*)::text from public.holos_recommendation_rules where catalog_version = 1 and status = 'aprovado')
union all select 'hash do catalogo', (select left(content_hash, 16) || '…' from public.holos_recommendation_catalogs where code = 'HOLOS-RECOMENDACOES-V1' and version = 1)
union all select 'registros de Proximos Passos', (select count(*)::text from public.holos_next_steps)
union all select 'authenticated escreve no catalogo', has_table_privilege('authenticated', 'public.holos_recommendation_rules', 'insert')::text
union all select 'authenticated escreve em holos_next_steps', has_table_privilege('authenticated', 'public.holos_next_steps', 'insert')::text
union all select 'HOLOSCAN (aplicacoes) — so leitura pelo motor', (select count(*)::text from public.holoscan_applications)
union all select 'migration registrada', (case when to_regclass('supabase_migrations.schema_migrations') is null then 'n/a' else (select count(*)::text from supabase_migrations.schema_migrations where version = '20261012100000') end);
