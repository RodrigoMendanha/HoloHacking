-- =====================================================================
-- RESULTADO HOLOS — PARTE 5 de 5 — rodar INTEIRA no SQL Editor (uma transacao).
-- Revisar e descartar, permissoes, registro da migration e conferencia final de tudo.
-- Rode NA ORDEM (a PARTE 1 ja foi aplicada). Se uma parte der erro, nada dela e aplicado: rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema.
-- Conteudo identico a supabase/migrations/20261009100000_resultado_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.salvar_resultado_holos(jsonb)') is null then raise exception 'rode a PARTE 4 antes (salvar_resultado_holos nao existe)'; end if;
end $$;

-- ----------------------------------------------------------------------------
-- REVISAR: salvo -> revisado (quem e quando: carimbo do servidor). Nada mais muda.
-- ----------------------------------------------------------------------------
create or replace function public.revisar_resultado_holos(p_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record;
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  select h.* into r from public.holos_results h where h.id = p_id and h.nutritionist_id = uid for update;
  if not found then raise exception 'resultado nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if r.status <> 'salvo' then raise exception 'so um resultado salvo pode ser marcado como revisado' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
  update public.holos_results set status = 'revisado' where id = p_id;
  return p_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- DESCARTAR RASCUNHO (resultado salvo nunca e apagado)
-- ----------------------------------------------------------------------------
create or replace function public.descartar_rascunho_resultado_holos(p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n int;
begin
  delete from public.holos_results h where h.id = p_id and h.nutritionist_id = uid and h.status = 'rascunho';
  get diagnostics n = row_count;
  if n = 0 then raise exception 'rascunho nao encontrado (resultado salvo nao e apagado)' using errcode = 'P0001', hint = 'revisao_imutavel'; end if;
  return true;
end;
$$;

revoke all on function public.previa_resultado_holos(jsonb) from public, anon;
revoke all on function public.salvar_rascunho_resultado_holos(jsonb) from public, anon;
revoke all on function public.salvar_resultado_holos(jsonb) from public, anon;
revoke all on function public.revisar_resultado_holos(uuid) from public, anon;
revoke all on function public.descartar_rascunho_resultado_holos(uuid) from public, anon;
grant execute on function public.previa_resultado_holos(jsonb) to authenticated;
grant execute on function public.salvar_rascunho_resultado_holos(jsonb) to authenticated;
grant execute on function public.salvar_resultado_holos(jsonb) to authenticated;
grant execute on function public.revisar_resultado_holos(uuid) to authenticated;
grant execute on function public.descartar_rascunho_resultado_holos(uuid) to authenticated;

-- historico de migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('20261009100000', 'resultado_holos') on conflict (version) do nothing;

-- POS (tudo)
do $$
declare n int;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.holos_results'::regclass) then raise exception 'POS: RLS desligada em holos_results'; end if;
  select count(*) into n from pg_policy where polrelid = 'public.holos_results'::regclass;
  if n <> 1 then raise exception 'POS: esperada 1 politica, encontradas %', n; end if;
  select count(*) into n from pg_trigger where tgrelid = 'public.holos_results'::regclass and not tgisinternal;
  if n <> 5 then raise exception 'POS: esperados 5 gatilhos, encontrados %', n; end if;
  select count(*) into n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname in
    ('montar_resultado_holos', 'resultado_holos_campos', 'resultado_holos_sistemas', 'previa_resultado_holos', 'salvar_rascunho_resultado_holos',
     'salvar_resultado_holos', 'revisar_resultado_holos', 'descartar_rascunho_resultado_holos', 'proteger_identidade_resultado_holos');
  if n <> 9 then raise exception 'POS: esperadas 9 funcoes, encontradas %', n; end if;
  if has_table_privilege('anon', 'public.holos_results', 'select') or has_table_privilege('authenticated', 'public.holos_results', 'insert')
     or has_table_privilege('authenticated', 'public.holos_results', 'update') or has_table_privilege('authenticated', 'public.holos_results', 'delete') then
    raise exception 'POS: privilegios de tabela mais largos que o esperado';
  end if;
  if has_function_privilege('anon', 'public.salvar_resultado_holos(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.montar_resultado_holos(uuid, jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.resultado_holos_sistemas(uuid, uuid)', 'execute') then
    raise exception 'POS: execucao de funcao mais larga que o esperado';
  end if;
end $$;
commit;

select 'tabela holos_results' as item, (to_regclass('public.holos_results') is not null)::text as valor
union all select 'RLS ligada', (select relrowsecurity::text from pg_class where oid = 'public.holos_results'::regclass)
union all select 'gatilhos', (select count(*)::text from pg_trigger where tgrelid = 'public.holos_results'::regclass and not tgisinternal)
union all select 'funcoes', (select count(*)::text from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname in
    ('montar_resultado_holos', 'resultado_holos_campos', 'resultado_holos_sistemas', 'previa_resultado_holos', 'salvar_rascunho_resultado_holos',
     'salvar_resultado_holos', 'revisar_resultado_holos', 'descartar_rascunho_resultado_holos', 'proteger_identidade_resultado_holos'))
union all select 'resultados gravados', (select count(*)::text from public.holos_results)
union all select 'migration registrada', (select count(*)::text from supabase_migrations.schema_migrations where version = '20261009100000');
