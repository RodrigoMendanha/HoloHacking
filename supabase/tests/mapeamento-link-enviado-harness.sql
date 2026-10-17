-- Harness MAPEAMENTO "LINK ENVIADO" (migration 20261022100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh,
-- depois da migration e do harness da pre-consulta (reusa _ap, pg_temp.ap_tenta e os helpers de sessao). Dados ficticios.
reset role;
select pg_temp.sem_usuario();
create temp table _logmf (passo text) on commit drop;
create temp table _mf (k text primary key, v text) on commit drop;
grant select, insert, update on _logmf, _mf to authenticated, anon;
insert into public.patients (nutritionist_id, nome) values ((select v::uuid from _ap where k = 'd'), 'MF PACIENTE FICTICIA');
insert into _mf select 'p', id::text from public.patients where nome = 'MF PACIENTE FICTICIA';

insert into _logmf select 'MF00 ' || case when has_column_privilege('authenticated', 'public.anamnesis_invites', 'sent_at', 'select')
  and has_column_privilege('authenticated', 'public.anamnesis_invites', 'sent_via', 'select')
  and not has_column_privilege('authenticated', 'public.anamnesis_invites', 'token_hash', 'select')
  and not has_function_privilege('anon', 'public.marcar_convite_anamnese_enviado(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.marcar_convite_anamnese_enviado(uuid, text)', 'execute')
  and (select count(*) from public.anamnesis_invites where sent_at is not null) = 0
  then 'ok' else 'FALHOU' end || ': colunas novas legiveis pela dona (token_hash continua fechado); anon nao marca; convites antigos sem sent_at';

set local role authenticated;
select pg_temp.como_daniel();
do $$
declare r jsonb;
begin
  r := public.criar_convite_anamnese((select v::uuid from _mf where k = 'p'));
  insert into _mf values ('id', r->>'id'), ('tok', r->>'token');
end $$;
insert into _mf select 'via_ruim', pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_enviado(%L::uuid, ''email'')', (select v from _mf where k = 'id')));
insert into _mf select 'm1', public.marcar_convite_anamnese_enviado((select v::uuid from _mf where k = 'id'), 'copiado')::text;
insert into _mf select 'm2', public.marcar_convite_anamnese_enviado((select v::uuid from _mf where k = 'id'), 'whatsapp')::text;
insert into _logmf select 'MF01 ' || case when (select v from _mf where k = 'via_ruim') = 'via_invalida'
  and ((select v from _mf where k = 'm1')::jsonb ->> 'sent_via') = 'copiado'
  and ((select v from _mf where k = 'm2')::jsonb ->> 'sent_via') = 'copiado'
  and ((select v from _mf where k = 'm1')::jsonb ->> 'sent_at') = ((select v from _mf where k = 'm2')::jsonb ->> 'sent_at')
  and (select status from public.anamnesis_invites where id = (select v::uuid from _mf where k = 'id')) = 'enviado'
  then 'ok' else 'FALHOU' end || ': marcar envio grava o 1o envio (copiado) e e idempotente; meio desconhecido recusado; status do convite nao muda';

select pg_temp.como_rodrigo();
insert into _logmf select 'MF02 ' || case when pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_enviado(%L::uuid, ''whatsapp'')', (select v from _mf where k = 'id'))) = 'convite_invalido'
  then 'ok' else 'FALHOU' end || ': outra nutricionista nao marca convite alheio';

-- paciente responde: o convite respondido nao e mais marcado (e o sent_at fica como registro)
reset role;
select pg_temp.sem_usuario();
set local role anon;
insert into _mf select 'anon', pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_enviado(%L::uuid, ''whatsapp'')', (select v from _mf where k = 'id')));
select public.anamnese_publica_enviar((select v from _mf where k = 'tok'), '{"formulario":{"motivo":{"objetivo":"Mais energia"}}}'::jsonb);
reset role;
set local role authenticated;
select pg_temp.como_daniel();
insert into _logmf select 'MF03 ' || case when (select v from _mf where k = 'anon') like '42501:%'
  and pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_enviado(%L::uuid, ''whatsapp'')', (select v from _mf where k = 'id'))) = 'convite_fechado'
  and (select status = 'concluido' and sent_at is not null and sent_via = 'copiado' from public.anamnesis_invites where id = (select v::uuid from _mf where k = 'id'))
  then 'ok' else 'FALHOU' end || ': anonimo nao marca; convite respondido nao e remarcado e guarda quando o link saiu';

-- revogado e vencido nao sao marcados
do $$
declare r jsonb;
begin
  r := public.criar_convite_anamnese((select v::uuid from _mf where k = 'p'));
  perform public.revogar_convite_anamnese((r->>'id')::uuid);
  insert into _mf values ('rev', r->>'id');
end $$;
insert into _logmf select 'MF04 ' || case when pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_enviado(%L::uuid, ''copiado'')', (select v from _mf where k = 'rev'))) = 'convite_fechado'
  and pg_temp.ap_tenta('update public.anamnesis_invites set sent_at = now(), sent_via = ''copiado''') like '42501:%'
  then 'ok' else 'FALHOU' end || ': link revogado nao e marcado; a nutricionista nao grava a coluna direto (so pela RPC)';
reset role;
insert into _logmf select 'MF05 ' || case when pg_temp.ap_tenta(format('update public.anamnesis_invites set sent_at = now(), sent_via = null where id = %L', (select v from _mf where k = 'rev'))) like '23514:%'
  then 'ok' else 'FALHOU' end || ': sent_at sem sent_via recusado (coerencia)';

select passo from _logmf order by passo;
