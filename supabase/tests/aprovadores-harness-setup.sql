-- Setup dos APROVADORES de teste (migration 20261002110000): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh, antes dos harnesses que registram aprovacoes (dupla-aprovacao, etapa5-2, etapa5-3).
-- Gestao tecnica num banco local descartavel: uidA (profissional dos pacientes) = Daniel (aprovador unico, etapa 1);
-- uidB (conta nova) = Rodrigo com os papeis de etapa 2 DESATIVADOS (como no banco real depois da migration
-- 20261003100000: historico preservado, sem poder de aprovar); uidC = conta autenticada SEM papel.
-- Nada aqui e configuracao real; nada persiste.
create temp table _aprov (k text primary key, v text) on commit drop;
grant select on _aprov to authenticated;
reset role;
do $$
declare a uuid; b uuid := gen_random_uuid(); c uuid := gen_random_uuid();
begin
  select nutritionist_id into a from public.patients where status = 'ativo' order by created_at limit 1;
  insert into auth.users (id, email) values (b, 'rodrigo-teste@local.invalid'), (c, 'sem-papel-teste@local.invalid');
  insert into public.methodology_approvers (user_id, scope, approval_stage, display_name, notes) values
    (a, 'holoscan', 1, 'Daniel', 'TEST_FIXTURE_ONLY'), (a, 'integrated_reading', 1, 'Daniel', 'TEST_FIXTURE_ONLY');
  insert into public.methodology_approvers (user_id, scope, approval_stage, display_name, notes, active, deactivated_at, deactivation_reason) values
    (b, 'holoscan', 2, 'Rodrigo', 'TEST_FIXTURE_ONLY', false, now(), 'teste: etapa 2 descontinuada (aprovador unico)'),
    (b, 'integrated_reading', 2, 'Rodrigo', 'TEST_FIXTURE_ONLY', false, now(), 'teste: etapa 2 descontinuada (aprovador unico)');
  insert into _aprov values ('daniel', a::text), ('rodrigo', b::text), ('ninguem', c::text);
end $$;
-- troca de identidade dentro dos harnesses (claims locais a transacao)
create or replace function pg_temp.como(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true) $$;
create or replace function pg_temp.como_daniel() returns void language sql as $$ select pg_temp.como((select v::uuid from _aprov where k = 'daniel')) $$;
create or replace function pg_temp.como_rodrigo() returns void language sql as $$ select pg_temp.como((select v::uuid from _aprov where k = 'rodrigo')) $$;
create or replace function pg_temp.como_ninguem() returns void language sql as $$ select pg_temp.como((select v::uuid from _aprov where k = 'ninguem')) $$;
grant execute on all functions in schema pg_temp to authenticated;
select pg_temp.como_daniel();
set local role authenticated;
