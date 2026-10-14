-- Harness MAPEAMENTO "REVISADO" (migration 20261025100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh,
-- depois do harness do "Link enviado" (reusa _ap, pg_temp.ap_tenta e os helpers de sessao). Dados ficticios.
reset role;
select pg_temp.sem_usuario();
create temp table _logmr (passo text) on commit drop;
create temp table _mr (k text primary key, v text) on commit drop;
grant select, insert, update on _logmr, _mr to authenticated, anon;
insert into public.patients (nutritionist_id, nome) values ((select v::uuid from _ap where k = 'd'), 'MR PACIENTE FICTICIA');
insert into _mr select 'p', id::text from public.patients where nome = 'MR PACIENTE FICTICIA';

insert into _logmr select 'MR00 ' || case when has_column_privilege('authenticated', 'public.anamnesis_invites', 'reviewed_at', 'select')
  and not has_function_privilege('anon', 'public.marcar_convite_anamnese_revisado(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.marcar_convite_anamnese_revisado(uuid)', 'execute')
  and (select count(*) from public.anamnesis_invites where reviewed_at is not null) = 0
  then 'ok' else 'FALHOU' end || ': coluna legivel pela dona; anon nao marca; convites antigos sem reviewed_at';

set local role authenticated;
select pg_temp.como_daniel();
do $$
declare r jsonb;
begin
  r := public.criar_convite_anamnese((select v::uuid from _mr where k = 'p'));
  insert into _mr values ('id', r->>'id'), ('tok', r->>'token');
end $$;
insert into _logmr select 'MR01 ' || case when pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_revisado(%L::uuid)', (select v from _mr where k = 'id'))) = 'convite_nao_recebido'
  then 'ok' else 'FALHOU' end || ': antes de o paciente enviar, nao marca revisado';

reset role;
select pg_temp.sem_usuario();
set local role anon;
select public.anamnese_publica_enviar((select v from _mr where k = 'tok'), '{"formulario":{"motivo":{"motivo":"Mais energia"}}}'::jsonb);
reset role;
set local role authenticated;
select pg_temp.como_rodrigo();
insert into _logmr select 'MR02 ' || case when pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_revisado(%L::uuid)', (select v from _mr where k = 'id'))) = 'convite_invalido'
  then 'ok' else 'FALHOU' end || ': outra nutricionista nao marca convite alheio';
select pg_temp.como_daniel();
insert into _mr select 'r1', public.marcar_convite_anamnese_revisado((select v::uuid from _mr where k = 'id'))::text;
insert into _mr select 'r2', public.marcar_convite_anamnese_revisado((select v::uuid from _mr where k = 'id'))::text;
insert into _logmr select 'MR03 ' || case when ((select v from _mr where k = 'r1')::jsonb ->> 'reviewed_at') is not null
  and ((select v from _mr where k = 'r1')::jsonb ->> 'reviewed_at') = ((select v from _mr where k = 'r2')::jsonb ->> 'reviewed_at')
  and (select status = 'concluido' and submitted_content is not null from public.anamnesis_invites where id = (select v::uuid from _mr where k = 'id'))
  and pg_temp.ap_tenta('update public.anamnesis_invites set reviewed_at = now()') like '42501:%'
  then 'ok' else 'FALHOU' end || ': marca revisado (idempotente), resposta e status intactos; a coluna so muda pela RPC';
reset role;
insert into _logmr select 'MR04 ' || case when pg_temp.ap_tenta(format('update public.anamnesis_invites set reviewed_at = now() where id = (select id from public.anamnesis_invites where patient_id = %L and status <> ''concluido'' limit 1)', (select v from _mr where k = 'p'))) like '23514:%'
  or not exists (select 1 from public.anamnesis_invites where patient_id = (select v::uuid from _mr where k = 'p') and status <> 'concluido')
  then 'ok' else 'FALHOU' end || ': reviewed_at so em convite respondido (coerencia)';

select passo from _logmr order by passo;
