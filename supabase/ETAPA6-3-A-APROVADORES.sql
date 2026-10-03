-- ============================================================================
-- HISTORICO — EXECUTADO no banco real em 2026-10-03 (4 papeis cadastrados). SUPERADO pela Etapa 6.3-B
-- (migration 20261003100000 / supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql): governanca de APROVADOR UNICO (Daniel);
-- os papeis de etapa 2 (Rodrigo) passam a historico desativado. NAO executar de novo (a guarda tambem recusa: tabela nao vazia).
-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3-A — CADASTRO DOS APROVADORES REAIS (gestao tecnica; SQL Editor como postgres)
-- MODELO PARAMETRIZADO: NAO contem uid real. Antes de executar, substituir LOCALMENTE (nunca commitar o arquivo preenchido):
--   __UID_DANIEL__   -> auth.users.id da conta de Daniel  (aprovacao 1 / responsavel primario)
--   __UID_RODRIGO__  -> auth.users.id da conta de Rodrigo (aprovacao 2 / revisao final)
-- Cria 4 linhas: holoscan/1/Daniel, holoscan/2/Rodrigo, integrated_reading/1/Daniel, integrated_reading/2/Rodrigo.
-- UMA transacao; guarda aborta se: placeholder nao substituido, uid invalido/inexistente, uids iguais, tabela nao vazia,
-- ou estado diferente do pos-6.2 (30 migrations, 44/62/129/89/317, 0 pacotes HOLOS, LI-V1@2 em_revisao, 0 aprovacoes).
-- Nao aprova, nao homologa, nao grava pacote. Executar ANTES de gravar o HOLOS-V1@2.
-- ============================================================================
BEGIN;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create temp table _aprov_param (k text primary key, v text) on commit drop;
insert into _aprov_param values ('daniel', '__UID_DANIEL__'), ('rodrigo', '__UID_RODRIGO__');
do $guarda$
declare d text := (select v from _aprov_param where k = 'daniel'); r text := (select v from _aprov_param where k = 'rodrigo');
begin
  if d !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or r !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'ETAPA 6.3-A ABORTADA: placeholders nao substituidos ou uid invalido (use o id em minusculas de auth.users)' using errcode = 'P0001'; end if;
  if d = r then raise exception 'ETAPA 6.3-A ABORTADA: Daniel e Rodrigo precisam ser contas DIFERENTES (quatro olhos)' using errcode = 'P0001'; end if;
  if not exists (select 1 from auth.users where id = d::uuid) or not exists (select 1 from auth.users where id = r::uuid) then
    raise exception 'ETAPA 6.3-A ABORTADA: uid nao existe em auth.users' using errcode = 'P0001'; end if;
  if (select count(*) from public.methodology_approvers) <> 0 then raise exception 'ETAPA 6.3-A ABORTADA: methodology_approvers nao esta vazia (ja cadastrado?)' using errcode = 'P0001'; end if;
  if (select count(*) from supabase_migrations.schema_migrations) <> 30 or (select max(version) from supabase_migrations.schema_migrations) <> '20261002130000'
     or (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r') <> 44
     or (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public') <> 62
     or (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public') <> 129
     or (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal) <> 89
     or (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public') <> 317 then
    raise exception 'ETAPA 6.3-A ABORTADA: banco fora do fingerprint pos-6.2 (30 / 44 / 62 / 129 / 89 / 317)' using errcode = 'P0001'; end if;
  if (select count(*) from public.methodology_packages) <> 0
     or (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages) <> 'LI-V1@1:rascunho,LI-V1@2:em_revisao' then
    raise exception 'ETAPA 6.3-A ABORTADA: pacotes fora do estado pos-6.2 (esperado: 0 pacotes HOLOS; LI-V1@2 em_revisao)' using errcode = 'P0001'; end if;
  if (select count(*) from public.methodology_package_approvals) + (select count(*) from public.integrated_reading_package_approvals) <> 0 then
    raise exception 'ETAPA 6.3-A ABORTADA: ja existem aprovacoes registradas' using errcode = 'P0001'; end if;
end $guarda$;
insert into public.methodology_approvers (user_id, scope, approval_stage, display_name, notes)
select (select v from _aprov_param where k = 'daniel')::uuid, s, 1, 'Daniel', 'Etapa 6.3-A: cadastro por gestao tecnica' from unnest(array['holoscan','integrated_reading']) s
union all
select (select v from _aprov_param where k = 'rodrigo')::uuid, s, 2, 'Rodrigo', 'Etapa 6.3-A: cadastro por gestao tecnica' from unnest(array['holoscan','integrated_reading']) s;
do $pos$
begin
  if (select count(*) from public.methodology_approvers where active) <> 4
     or (select count(distinct user_id) from public.methodology_approvers) <> 2
     or (select string_agg(scope || '/' || approval_stage || '/' || display_name, ',' order by scope, approval_stage) from public.methodology_approvers)
        <> 'holoscan/1/Daniel,holoscan/2/Rodrigo,integrated_reading/1/Daniel,integrated_reading/2/Rodrigo' then
    raise exception 'ETAPA 6.3-A ABORTADA NA VERIFICACAO: cadastro diferente do esperado' using errcode = 'P0001'; end if;
  if (select count(*) from public.methodology_package_approvals) + (select count(*) from public.integrated_reading_package_approvals) <> 0
     or (select count(*) from public.methodology_packages) <> 0 then
    raise exception 'ETAPA 6.3-A ABORTADA NA VERIFICACAO: o cadastro nao pode aprovar nem gravar pacote' using errcode = 'P0001'; end if;
  raise notice 'ETAPA 6.3-A: 4 papeis cadastrados (holoscan 1/2, integrated_reading 1/2), 2 contas distintas';
end $pos$;
COMMIT;
