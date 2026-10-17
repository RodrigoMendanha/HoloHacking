-- =====================================================================
-- CONTA PENDENTE = SOMENTE PERFIL (09/10) — PARTE 1 de 2 — rodar INTEIRA no SQL Editor (uma transacao).
-- Funcoes conta_pode_editar_perfil e exigir_conta_ativa; gatilho de trava em todas as tabelas de dado da nutricionista.
-- Rode as partes NA ORDEM (1, 2). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema (tudo e "create or replace" / "drop ... if exists").
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado ou alterado; status das contas intocado.
-- Conteudo identico a supabase/migrations/20261013100000_conta_pendente_somente_perfil.sql (dividido so para caber no editor).
-- A ULTIMA LINHA DESTE ARQUIVO (antes da conferencia) E "commit;". Se o editor cortar o texto, nao rode.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
declare faltando text[] := '{}';
begin
  if to_regprocedure('public.conta_ativa()') is null then faltando := faltando || 'conta_ativa() (cadastro com aprovacao)'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'status') then faltando := faltando || 'profiles.status'; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261012100000') then faltando := faltando || 'migration 20261012100000 (Proximos Passos HOLOS)'; end if;
  if exists (select 1 from auth.users u where not exists (select 1 from public.profiles p where p.id = u.id)) then faltando := faltando || 'ha conta sem perfil (ela ficaria travada)'; end if;
  if array_length(faltando, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(faltando, ', '); end if;
end $$;
-- 1. pode editar o proprio perfil? (pendente ou ativo; conta sem linha conta como pendente)
create or replace function public.conta_pode_editar_perfil()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.status from public.profiles p where p.id = (select auth.uid())), 'pendente') <> 'recusado';
$$;
revoke all on function public.conta_pode_editar_perfil() from public, anon;
grant execute on function public.conta_pode_editar_perfil() to authenticated;

-- 2. a trava: conta logada e nao ativa nao grava dado clinico
create or replace function public.exigir_conta_ativa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.conta_ativa() then
    raise exception 'conta ainda nao liberada: so o Perfil pode ser editado ate a equipe HoloHacking liberar o acesso (%)', tg_table_name
      using errcode = '42501', hint = 'conta_nao_liberada';
  end if;
  return null;
end;
$$;
revoke all on function public.exigir_conta_ativa() from public, anon, authenticated;

-- todas as tabelas com nutritionist_id (menos professional_assets, que e do Perfil)
-- + as tabelas-filhas gravadas junto com elas
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
      join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and c.column_name = 'nutritionist_id' and c.table_name <> 'professional_assets'
    union
    select u from unnest(array['ai_messages', 'holoscan_answers', 'holoscan_system_scores', 'lab_results', 'lab_result_components']) u
     where to_regclass('public.' || u) is not null
  loop
    execute format('drop trigger if exists exigir_conta_ativa on public.%I', t);
    execute format('create trigger exigir_conta_ativa before insert or update or delete on public.%I for each statement execute function public.exigir_conta_ativa()', t);
  end loop;
end $$;
commit;

select 'tabelas com a trava (gatilho exigir_conta_ativa)' as item, (select count(*)::text from pg_trigger where tgname = 'exigir_conta_ativa') as valor
union all select 'profiles/professional_assets com a trava (deve ser 0)', (select count(*)::text from pg_trigger where tgname = 'exigir_conta_ativa' and tgrelid in ('public.profiles'::regclass, 'public.professional_assets'::regclass))
union all select 'contas por status', (select string_agg(status || '=' || n, ', ') from (select status, count(*) n from public.profiles group by status order by status) s);
