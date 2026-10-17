-- Harness ADMINISTRACAO (migration 20261016100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration. Contas ficticias (Daniel = administrador de teste, Rodrigo = conta comum).
-- Nada persiste. Nenhum dado real.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _ad (k text primary key, v text) on commit drop;
create temp table _logad (n serial, passo text) on commit drop;
grant select, insert, update on _ad, _logad to authenticated, anon, service_role;
grant usage on sequence _logad_n_seq to authenticated, anon, service_role;
create or replace function pg_temp.ad_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon, service_role;

insert into public.administradores (user_id) select v::uuid from _aprov where k = 'daniel' on conflict do nothing;
insert into public.profiles (id, nome, status) select v::uuid, 'Rodrigo Teste', 'pendente' from _aprov where k = 'rodrigo' on conflict (id) do nothing;
update public.profiles set status = 'pendente', aprovado_em = null, aprovado_por = null where id = (select v::uuid from _aprov where k = 'rodrigo');
insert into _ad values
  ('daniel', (select v from _aprov where k = 'daniel')), ('rodrigo', (select v from _aprov where k = 'rodrigo')),
  ('dig', (select md5(string_agg(t, '|' order by t)) from (
     select 'p' || count(*) t from public.patients union all select 'e' || count(*) from public.encounters
     union all select 'h' || count(*) from public.holoscan_applications union all select 'r' || count(*) from public.holos_results) z)),
  ('n_pacientes', (select count(*)::text from public.patients)),
  ('paciente', (select nome from public.patients where nutritionist_id = (select v::uuid from _aprov where k = 'daniel') and nome is not null limit 1));

-- AD00 — quem nao e administrador e recusado em todas as funcoes
select pg_temp.como_rodrigo();
set local role authenticated;
insert into _logad (passo) select 'AD00 ' || case when
     pg_temp.ad_tenta('select public.admin_painel()') like '42501%'
 and pg_temp.ad_tenta('select public.admin_historico(10)') like '42501%'
 and pg_temp.ad_tenta(format('select public.admin_definir_status(%L, ''ativo'')', (select v from _ad where k = 'rodrigo'))) like '42501%'
 and pg_temp.ad_tenta(format('select public.admin_editar_perfil(%L, ''Outro Nome'', '''')', (select v from _ad where k = 'daniel'))) like '42501%'
  then 'ok' else 'FALHOU' end || ': conta comum nao abre o painel, nao le o historico, nao libera nem edita ninguem (nem a si mesma)';

-- AD01 — sem login (anon) nem executa; conta comum nao le a tabela de registro direto pela API
reset role; select pg_temp.sem_usuario(); set local role anon;
insert into _logad (passo) select 'AD01 ' || case when pg_temp.ad_tenta('select public.admin_painel()') like '42501%'
  and pg_temp.ad_tenta('select public.admin_historico(1)') like '42501%' then 'ok' else 'FALHOU' end || ': anon sem acesso as funcoes';
reset role; select pg_temp.como_rodrigo(); set local role authenticated;
insert into _logad (passo) select 'AD01b ' || case when pg_temp.ad_tenta('select count(*) from public.admin_audit_log') like '42501%'
  and pg_temp.ad_tenta('insert into public.admin_audit_log (actor_id, acao) values (auth.uid(), ''liberar'')') like '42501%'
  then 'ok' else 'FALHOU' end || ': admin_audit_log fechada para a API (nem le, nem grava)';

-- AD02 — administrador abre o painel: contas, numeros e so CONTAGENS de uso (nenhum dado de paciente)
reset role; select pg_temp.como_daniel(); set local role authenticated;
do $$
declare j jsonb := public.admin_painel(); d jsonb; r jsonb;
begin
  select c into d from jsonb_array_elements(j -> 'contas') c where c ->> 'id' = (select v from _ad where k = 'daniel');
  select c into r from jsonb_array_elements(j -> 'contas') c where c ->> 'id' = (select v from _ad where k = 'rodrigo');
  insert into _logad (passo) select 'AD02 ' || case when d is not null and r is not null
      and (d ->> 'admin')::boolean and not (r ->> 'admin')::boolean and r ->> 'status' = 'pendente'
      and (d -> 'uso' ->> 'pacientes')::int > 0
      and (j -> 'resumo' ->> 'total')::int = jsonb_array_length(j -> 'contas')
      and (j -> 'resumo' ->> 'pendentes')::int >= 1
      and (j -> 'resumo' ->> 'pacientes') = (select v from _ad where k = 'n_pacientes')
      and d ? 'completude' and d -> 'perfil' ? 'assinatura' and d ? 'ultimo_acesso' and d ? 'bloqueado'
      and position((select v from _ad where k = 'paciente') in j::text) = 0
    then 'ok' else 'FALHOU: ' || left(coalesce(r::text, 'sem rodrigo'), 200) end
    || ': painel com contas, status, admin, perfil, uso (contagens) e resumo coerente; nenhum nome de paciente no retorno';
end $$;

-- AD03 — liberar uma conta: muda o status, registra quem/quando e grava no historico
insert into _ad values ('ad03', public.admin_definir_status((select v::uuid from _ad where k = 'rodrigo'), 'ativo', 'conferido') ->> 'alterado');
reset role;
insert into _logad (passo) select 'AD03 ' || case when (select v from _ad where k = 'ad03') = 'true'
  and (select status = 'ativo' and aprovado_por = (select v::uuid from _ad where k = 'daniel') and aprovado_em is not null from public.profiles where id = (select v::uuid from _ad where k = 'rodrigo'))
  then 'ok' else 'FALHOU' end || ': liberar muda status para ativo com aprovado_por/aprovado_em';
insert into _logad (passo) select 'AD03b ' || case when (select count(*) from public.admin_audit_log where acao = 'liberar'
    and target_user = (select v::uuid from _ad where k = 'rodrigo') and detalhes = '{"de": "pendente", "para": "ativo", "motivo": "conferido"}'::jsonb) = 1
  then 'ok' else 'FALHOU' end || ': registro imutavel da liberacao (de, para, motivo)';
set local role authenticated;

-- AD04 — repetir o mesmo status nao duplica registro
insert into _logad (passo) select 'AD04 ' || case when not (public.admin_definir_status((select v::uuid from _ad where k = 'rodrigo'), 'ativo') ->> 'alterado')::boolean
  and (select count(*) from public.admin_historico(500) h, jsonb_array_elements(h) e where e ->> 'acao' = 'liberar') = 1
  then 'ok' else 'FALHOU' end || ': mesmo status = nada muda, nada registrado';

-- AD05/06 — nao muda a propria conta; status invalido recusado
insert into _logad (passo) select 'AD05 ' || case when pg_temp.ad_tenta(format('select public.admin_definir_status(%L, ''recusado'')', (select v from _ad where k = 'daniel'))) = 'propria_conta'
  then 'ok' else 'FALHOU' end || ': administrador nao recusa/bloqueia a propria conta';
insert into _logad (passo) select 'AD06 ' || case when pg_temp.ad_tenta(format('select public.admin_definir_status(%L, ''banido'')', (select v from _ad where k = 'rodrigo'))) = 'status_invalido'
  and pg_temp.ad_tenta(format('select public.admin_definir_status(%L, ''ativo'')', gen_random_uuid())) = 'conta_nao_encontrada'
  then 'ok' else 'FALHOU' end || ': status fora de ativo/recusado/pendente e conta inexistente recusados';

-- AD07 — recusar e voltar para analise
insert into _ad values ('ad07', (public.admin_definir_status((select v::uuid from _ad where k = 'rodrigo'), 'recusado') ->> 'status')
  || (public.admin_definir_status((select v::uuid from _ad where k = 'rodrigo'), 'pendente') ->> 'status'));
reset role;
insert into _logad (passo) select 'AD07 ' || case when (select v from _ad where k = 'ad07') = 'recusadopendente'
  and (select status = 'pendente' and aprovado_em is null and aprovado_por is null from public.profiles where id = (select v::uuid from _ad where k = 'rodrigo'))
  then 'ok' else 'FALHOU' end || ': recusar e voltar para analise (pendente limpa aprovado_em/aprovado_por)';
select pg_temp.como_daniel(); set local role authenticated;

-- AD08 — corrigir nome e telefone (validado e registrado; sem mudanca = sem registro)
insert into _ad values ('ad08', (case when
     pg_temp.ad_tenta(format('select public.admin_editar_perfil(%L, ''X'', '''')', (select v from _ad where k = 'rodrigo'))) = 'nome_invalido'
 and pg_temp.ad_tenta(format('select public.admin_editar_perfil(%L, ''Rodrigo Teste'', ''123'')', (select v from _ad where k = 'rodrigo'))) = 'telefone_invalido'
 and (public.admin_editar_perfil((select v::uuid from _ad where k = 'rodrigo'), ' Rodrigo Corrigido ', '(11) 98888-7777') ->> 'alterado')::boolean
 and not (public.admin_editar_perfil((select v::uuid from _ad where k = 'rodrigo'), 'Rodrigo Corrigido', '11988887777') ->> 'alterado')::boolean
 then 'sim' else 'nao' end));
reset role;
insert into _logad (passo) select 'AD08 ' || case when (select v from _ad where k = 'ad08') = 'sim'
 and (select nome = 'Rodrigo Corrigido' and telefone = '11988887777' from public.profiles where id = (select v::uuid from _ad where k = 'rodrigo'))
  then 'ok' else 'FALHOU' end || ': nome/telefone validados, gravados limpos e registrados uma vez';
select pg_temp.como_daniel(); set local role authenticated;

-- AD09 — historico: mais recente primeiro, com ator e alvo
do $$
declare h jsonb := public.admin_historico(3);
begin
  insert into _logad (passo) select 'AD09 ' || case when jsonb_array_length(h) = 3 and h -> 0 ->> 'acao' = 'editar_perfil'
      and h -> 0 ->> 'alvo_nome' = 'Rodrigo Corrigido' and h -> 0 ->> 'ator_nome' is not null
      and h -> 0 -> 'detalhes' -> 'telefone' ->> 'para' = '11988887777'
      and (h -> 0 ->> 'created_at') >= (h -> 2 ->> 'created_at')
    then 'ok' else 'FALHOU: ' || left(h::text, 200) end || ': historico com limite, ordem, ator, alvo e detalhes';
end $$;

-- AD10 — registro imutavel ate para o dono do banco
reset role;
insert into _logad (passo) select 'AD10 ' || case when pg_temp.ad_tenta('update public.admin_audit_log set acao = ''recusar''') = 'registro_imutavel'
  and pg_temp.ad_tenta('delete from public.admin_audit_log') = 'registro_imutavel'
  then 'ok' else 'FALHOU' end || ': admin_audit_log nao aceita UPDATE nem DELETE';

-- AD11 — registro vindo da Edge Function: so service_role; ator tem de ser administrador; senha/token/link nunca gravados
select pg_temp.como_daniel(); set local role authenticated;
insert into _logad (passo) select 'AD11 ' || case when pg_temp.ad_tenta(format('select public.admin_registrar_acao_servico(%L, %L, ''bloquear'')',
    (select v from _ad where k = 'daniel'), (select v from _ad where k = 'rodrigo'))) like '42501%'
  then 'ok' else 'FALHOU' end || ': conta logada (mesmo administrador) nao chama a funcao de servico';
reset role; select pg_temp.sem_usuario(); set local role service_role;
insert into _logad (passo) select 'AD11b ' || case when
     pg_temp.ad_tenta(format('select public.admin_registrar_acao_servico(%L, %L, ''bloquear'')', (select v from _ad where k = 'rodrigo'), (select v from _ad where k = 'daniel'))) like '42501%'
 and pg_temp.ad_tenta(format('select public.admin_registrar_acao_servico(%L, %L, ''liberar'')', (select v from _ad where k = 'daniel'), (select v from _ad where k = 'rodrigo'))) = 'acao_invalida'
 and public.admin_registrar_acao_servico((select v::uuid from _ad where k = 'daniel'), (select v::uuid from _ad where k = 'rodrigo'), 'definir_senha',
       '{"senha": "x", "token": "y", "link": "z", "provisoria": true}'::jsonb) is not null
  then 'ok' else 'FALHOU' end || ': service_role grava so com ator administrador e acao de Auth';
reset role;
insert into _logad (passo) select 'AD11c ' || case when (select detalhes from public.admin_audit_log where acao = 'definir_senha') = '{"provisoria": true}'::jsonb
  then 'ok' else 'FALHOU' end || ': senha, token e link removidos do registro';

-- AD12 — nada clinico mudou
insert into _logad (passo) select 'AD12 ' || case when (select md5(string_agg(t, '|' order by t)) from (
     select 'p' || count(*) t from public.patients union all select 'e' || count(*) from public.encounters
     union all select 'h' || count(*) from public.holoscan_applications union all select 'r' || count(*) from public.holos_results) z)
  = (select v from _ad where k = 'dig') then 'ok' else 'FALHOU' end || ': pacientes, atendimentos, HOLOSCAN e resultados intactos';

select passo from _logad order by n;
