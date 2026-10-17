-- Harness REVISAO DAS PERGUNTAS (migration 20261010100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), depois da migration. Usa o pacote metodologico aprovado que a cadeia de testes deixa. Nada persiste.
reset role;
create temp table _rv (k text primary key, v text) on commit drop;
create temp table _logrv (passo text) on commit drop;
grant insert, select, update on _rv, _logrv to anon;
create or replace function pg_temp.rv_sql(sql text) returns text language plpgsql as $$
declare h text; m text; r text;
begin
  execute sql into r;
  return 'ACEITO:' || coalesce(r, '');
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text;
  return coalesce(nullif(h, ''), m);
end $$;
grant execute on all functions in schema pg_temp to anon;
create or replace function pg_temp.rv_pacote() returns text language sql as $$
  select md5(coalesce(string_agg(to_jsonb(q)::text, ';' order by q.id), '')) from public.methodology_questions q;
$$;

-- abrir (dono do banco): copia as perguntas do pacote aprovado
insert into _rv select 'pk', m.code || '|' || m.version from public.methodology_packages m
 where m.status = 'aprovado' and exists (select 1 from public.methodology_questions q where q.package_id = m.id) order by m.version desc limit 1;
insert into _rv values ('antes', pg_temp.rv_pacote());
insert into _rv select 'rid', public.revisao_perguntas_abrir(split_part(v, '|', 1), split_part(v, '|', 2)::int, 15)::text from _rv where k = 'pk';
insert into _rv select 'n', count(*)::text from public.revisoes_perguntas_itens where revisao_id = (select v::uuid from _rv where k = 'rid');
insert into _rv select 'q1', stable_id from public.revisoes_perguntas_itens where revisao_id = (select v::uuid from _rv where k = 'rid') order by posicao limit 1;
insert into _rv select 'q2', stable_id from public.revisoes_perguntas_itens where revisao_id = (select v::uuid from _rv where k = 'rid') order by posicao offset 1 limit 1;
insert into _rv select 'q3', stable_id from public.revisoes_perguntas_itens where revisao_id = (select v::uuid from _rv where k = 'rid') order by posicao offset 2 limit 1;
insert into _logrv values ('V01 ' || case when (select v::int from _rv where k = 'n') = (select count(*) from public.methodology_questions q join public.methodology_packages m on m.id = q.package_id
    where m.code || '|' || m.version = (select v from _rv where k = 'pk'))
  and (select count(*) from public.revisoes_perguntas_itens where revisao_id = (select v::uuid from _rv where k = 'rid') and sistema_code is not null and texto_original <> '') = (select v::int from _rv where k = 'n')
  and pg_temp.rv_sql(format('select public.revisao_perguntas_abrir(%L, %s, 15)::text', split_part((select v from _rv where k = 'pk'), '|', 1), split_part((select v from _rv where k = 'pk'), '|', 2))) like '%ja existe uma revisao aberta%'
  then 'ok' else 'FALHOU' end || ': revisao aberta com todas as perguntas do pacote aprovado (' || (select v from _rv where k = 'n') || '), cada uma com sistema e texto; segunda abertura recusada');

-- o visitante sem login (anon)
set local role anon;
insert into _logrv values ('V02 ' || case when pg_temp.rv_sql('select count(*)::text from public.revisoes_perguntas') like '%permission denied%'
  and pg_temp.rv_sql('select count(*)::text from public.revisoes_perguntas_respostas') like '%permission denied%'
  and pg_temp.rv_sql('select count(*)::text from public.revisoes_perguntas_itens') like '%permission denied%'
  and pg_temp.rv_sql('select count(*)::text from public.patients') like '%permission denied%'
  and pg_temp.rv_sql('select public.revisao_perguntas_abrir(''X'', 1, 15)::text') like '%permission denied%'
  then 'ok' else 'FALHOU' end || ': sem login nao le nenhuma tabela (revisao, historico, pacientes) nem abre revisao');
insert into _logrv values ('V03 ' || case when (public.revisao_perguntas_ler()->>'estado') = 'aberta'
  and jsonb_array_length(public.revisao_perguntas_ler()->'itens') = (select v::int from _rv where k = 'n')
  and not exists (select 1 from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'decisao' is not null)
  then 'ok' else 'FALHOU' end || ': a pagina le a revisao aberta, todas as perguntas, nenhuma decidida');

select public.revisao_perguntas_registrar((select v from _rv where k = 'q1'), 'aprovar');
select public.revisao_perguntas_registrar((select v from _rv where k = 'q2'), 'negar', null, 'pergunta ambigua');
select public.revisao_perguntas_registrar((select v from _rv where k = 'q3'), 'editar', '  Texto <b>novo</b> sugerido  ', 'mais claro');
insert into _logrv values ('V04 ' || case when (select e->>'decisao' from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'stable_id' = (select v from _rv where k = 'q1')) = 'aprovar'
  and (select e->>'comentario' from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'stable_id' = (select v from _rv where k = 'q2')) = 'pergunta ambigua'
  and (select e->>'texto_sugerido' from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'stable_id' = (select v from _rv where k = 'q3')) = 'Texto <b>novo</b> sugerido'
  then 'ok' else 'FALHOU' end || ': aprovar, negar (com motivo) e editar (com texto, guardado cru e sem espacos nas pontas) gravados');
insert into _logrv values ('V05 ' || case when pg_temp.rv_sql(format('select public.revisao_perguntas_registrar(%L, %L)::text', (select v from _rv where k = 'q1'), 'editar')) = 'texto_obrigatorio'
  and pg_temp.rv_sql(format('select public.revisao_perguntas_registrar(%L, %L)::text', (select v from _rv where k = 'q1'), 'apagar_tudo')) = 'decisao_invalida'
  and pg_temp.rv_sql('select public.revisao_perguntas_registrar(''NAO-EXISTE'', ''aprovar'')::text') = 'pergunta_invalida'
  and pg_temp.rv_sql(format('select public.revisao_perguntas_registrar(%L, %L, %L)::text', (select v from _rv where k = 'q1'), 'editar', repeat('x', 1001))) = 'texto_longo'
  then 'ok' else 'FALHOU' end || ': editar sem texto, decisao invalida, pergunta de fora e texto longo demais recusados');
-- mudar de ideia: novo registro, a ultima decisao vale; "limpar" volta a pendente
select public.revisao_perguntas_registrar((select v from _rv where k = 'q1'), 'negar');
select public.revisao_perguntas_registrar((select v from _rv where k = 'q2'), 'limpar');
insert into _logrv values ('V06 ' || case when (select e->>'decisao' from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'stable_id' = (select v from _rv where k = 'q1')) = 'negar'
  and (select e->>'decisao' from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'stable_id' = (select v from _rv where k = 'q2')) is null
  then 'ok' else 'FALHOU' end || ': mudar de ideia grava de novo (a ultima decisao vale); limpar volta a pendente');
insert into _logrv values ('V07 ' || case when pg_temp.rv_sql('select public.revisao_perguntas_concluir(''Rodrigo'')::text') = 'revisao_incompleta'
  then 'ok' else 'FALHOU' end || ': concluir com pergunta pendente recusado');
reset role;
insert into _logrv values ('V08 ' || case when (select count(*) from public.revisoes_perguntas_respostas where revisao_id = (select v::uuid from _rv where k = 'rid')) = 5
  and pg_temp.rv_sql('update public.revisoes_perguntas_respostas set decisao = ''aprovar''') like '%nao e alterado%'
  and pg_temp.rv_sql('delete from public.revisoes_perguntas_respostas') like '%nao e apagado%'
  then 'ok' else 'FALHOU' end || ': historico completo (5 registros) e imutavel, nem o dono do banco altera ou apaga');

-- decide o resto e conclui (sem login)
set local role anon;
select count(public.revisao_perguntas_registrar(e->>'stable_id', 'aprovar')) from jsonb_array_elements(public.revisao_perguntas_ler()->'itens') e where e->>'decisao' is null;
insert into _rv select 'resumo', public.revisao_perguntas_concluir('  Rodrigo  ')::text;
insert into _logrv values ('V09 ' || case when ((select v from _rv where k = 'resumo')::jsonb->>'total')::int = (select v::int from _rv where k = 'n')
  and ((select v from _rv where k = 'resumo')::jsonb->>'negadas')::int = 1 and ((select v from _rv where k = 'resumo')::jsonb->>'editadas')::int = 1
  and (public.revisao_perguntas_ler()->>'estado') = 'concluida' and (public.revisao_perguntas_ler()->>'concluida_por_nome') = 'Rodrigo'
  then 'ok' else 'FALHOU' end || ': concluida com o resumo certo (' || (select v from _rv where k = 'resumo') || ')');
insert into _logrv values ('V10 ' || case when pg_temp.rv_sql(format('select public.revisao_perguntas_registrar(%L, %L)::text', (select v from _rv where k = 'q1'), 'aprovar')) = 'revisao_fechada'
  and pg_temp.rv_sql('select public.revisao_perguntas_concluir(null)::text') = 'revisao_fechada'
  and jsonb_array_length(public.revisao_perguntas_ler()->'itens') = (select v::int from _rv where k = 'n')
  then 'ok' else 'FALHOU' end || ': depois de concluida nada e aceito; a pagina continua lendo (so leitura)');
reset role;

-- prazo: uma revisao nova vencida nao aceita nada
select public.revisao_perguntas_abrir(split_part(v, '|', 1), split_part(v, '|', 2)::int, 15) from _rv where k = 'pk';
update public.revisoes_perguntas set expira_em = now() - interval '1 minute' where status = 'aberta';
set local role anon;
insert into _logrv values ('V11 ' || case when (public.revisao_perguntas_ler()->>'estado') = 'expirada'
  and pg_temp.rv_sql(format('select public.revisao_perguntas_registrar(%L, %L)::text', (select v from _rv where k = 'q1'), 'aprovar')) = 'revisao_expirada'
  then 'ok' else 'FALHOU' end || ': revisao vencida aparece como expirada e nao aceita decisoes');
reset role;
insert into _logrv values ('V12 ' || case when pg_temp.rv_pacote() = (select v from _rv where k = 'antes')
  then 'ok' else 'FALHOU' end || ': as perguntas oficiais do pacote nao mudaram');

select string_agg(passo, ' | ' order by passo) from _logrv;
