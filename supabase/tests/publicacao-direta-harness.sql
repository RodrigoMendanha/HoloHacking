-- Harness PUBLICACAO DIRETA (migration 20261018100000, 12/10): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), depois do pacote-v3-harness.sql (usa _pacote_v3, _pv e a conta de Daniel do setup de aprovadores).
-- Prova, com as regras REAIS do banco (RLS, gatilhos, validador SQL, hash do servidor):
--   PD01 conta sem papel de responsavel metodologico nao publica
--   PD02 versao fora de ordem (pula numero) e recusada
--   PD03 publicar: em_revisao -> aprovado HOJE, regime publicacao_direta, hash do servidor, SEM aprovacao registrada;
--        a versao anterior sai do ar (retirado), com registro de auditoria
--   PD04 HOLOSCAN novo na versao publicada: aceito; na anterior: recusado
--   PD05 publicar de novo um pacote ja no ar: recusado; o publicado e imutavel
--   PD06 revisao publica das perguntas: as RPCs anonimas deixaram de ser chamaveis (respostas antigas intactas)
-- Nada persiste.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _pd (k text primary key, v text) on commit drop;
create temp table _logpd (n serial, passo text) on commit drop;
grant select, insert, update on _pd, _logpd to authenticated;
grant usage on sequence _logpd_n_seq to authenticated;
insert into _pd values ('respostas_revisao', (select count(*)::text from public.revisoes_perguntas_respostas));
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare ult int; antes uuid; prox uuid; pulo uuid;
begin
  select max(version) into ult from public.methodology_packages where code = 'HOLOS-V1' and nutritionist_id = auth.uid() and status in ('aprovado', 'retirado');
  select id into antes from public.methodology_packages where code = 'HOLOS-V1' and nutritionist_id = auth.uid() and status = 'aprovado' order by version desc limit 1;
  pulo := pg_temp.gravar_pacote(jsonb_set((select doc from _pacote_v3), '{version}', to_jsonb(ult + 2)));
  prox := pg_temp.gravar_pacote(jsonb_set((select doc from _pacote_v3), '{version}', to_jsonb(ult + 1)));
  insert into _pd values ('antes', antes::text), ('prox', prox::text), ('pulo', pulo::text), ('aprovacoes', (select count(*)::text from public.methodology_package_approvals));
end $$;

reset role;
select pg_temp.como_ninguem();
set local role authenticated;
do $$
declare r text := 'ACEITO';
begin
  begin perform public.publicar_pacote_metodologico((select v::uuid from _pd where k = 'prox'));
  exception when others then r := sqlerrm; end;
  insert into _logpd (passo) select 'PD01 ' || case when r like '%responsavel metodologico%' then 'ok' else 'FALHOU: ' || r end || ': conta sem papel nao publica';
end $$;

reset role;
select pg_temp.como_daniel();
set local role authenticated;
do $$
declare r text := 'ACEITO';
begin
  begin perform public.publicar_pacote_metodologico((select v::uuid from _pd where k = 'pulo'));
  exception when others then r := sqlerrm; end;
  insert into _logpd (passo) select 'PD02 ' || case when r like '%versao publicada tem de ser a seguinte%' then 'ok' else 'FALHOU: ' || r end || ': versao fora de ordem recusada';
end $$;

do $$
declare prox uuid := (select v::uuid from _pd where k = 'prox'); antes uuid := (select v::uuid from _pd where k = 'antes'); d jsonb; ok_novo boolean; ok_ant boolean;
begin
  d := public.publicar_pacote_metodologico(prox);
  select status = 'aprovado' and governance_regime = 'publicacao_direta' and effective_from = current_date and effective_to is null
     and content_hash = public.metodologia_hash_conteudo(prox) and approved_by = auth.uid() and reviewed_by is null
    into ok_novo from public.methodology_packages where id = prox;
  select status = 'retirado' and retired_at is not null and effective_to = greatest(effective_from, current_date - 1)
    into ok_ant from public.methodology_packages where id = antes;
  insert into _logpd (passo) select 'PD03 ' || case when ok_novo and ok_ant
      and (select count(*)::text from public.methodology_package_approvals) = (select v from _pd where k = 'aprovacoes')
      and exists (select 1 from public.methodology_homologation_records where package_id = prox and decision = 'aprovado' and source = 'publicacao direta')
      and exists (select 1 from public.methodology_homologation_records where package_id = antes and decision = 'retirado' and source = 'publicacao direta')
      and d->>'regime' = 'publicacao_direta'
    then 'ok' else 'FALHOU: ' || coalesce(d::text, '') end || ': publicado hoje (hash do servidor, sem aprovacao registrada); a versao anterior saiu do ar com auditoria';
end $$;

do $$
declare prox uuid := (select v::uuid from _pd where k = 'prox'); antes uuid := (select v::uuid from _pd where k = 'antes'); h uuid; r text;
begin
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(prox, (select v::uuid from _pv where k = 'p'), (select v::uuid from _pv where k = 'e'), current_date));
  r := pg_temp.ho_tenta(pg_temp.ho_payload(antes, (select v::uuid from _pv where k = 'p'), (select v::uuid from _pv where k = 'e'), current_date));
  insert into _logpd (passo) select 'PD04 ' || case when h is not null and (select methodology_package_id from public.holoscan_applications where id = h) = prox and r not like 'ACEITO:%'
    then 'ok' else 'FALHOU: ' || r end || ': HOLOSCAN novo na versao publicada aceito; na anterior recusado (' || r || ')';
end $$;

do $$
declare prox uuid := (select v::uuid from _pd where k = 'prox'); r text := 'ACEITO'; bloqueado boolean := false;
begin
  begin perform public.publicar_pacote_metodologico(prox);
  exception when others then r := sqlerrm; end;
  begin
    update public.methodology_questions set statement = 'texto alterado' where package_id = prox and stable_id = 'SNT-101';
  exception when others then bloqueado := true; end;
  insert into _logpd (passo) select 'PD05 ' || case when r like '%so um pacote em_revisao%' and bloqueado then 'ok' else 'FALHOU: ' || r end || ': publicar de novo recusado; publicado imutavel';
end $$;

reset role;
insert into _logpd (passo) select 'PD06 ' || case when not has_function_privilege('anon', 'public.revisao_perguntas_registrar(text, text, text, text)', 'execute')
    and not has_function_privilege('anon', 'public.revisao_perguntas_ler()', 'execute')
    and not has_function_privilege('authenticated', 'public.revisao_perguntas_concluir(text)', 'execute')
    and (select count(*)::text from public.revisoes_perguntas_respostas) = (select v from _pd where k = 'respostas_revisao')
  then 'ok' else 'FALHOU' end || ': revisao publica fora do ar (RPCs sem acesso pela API); respostas antigas intactas';
select passo from _logpd order by n;
