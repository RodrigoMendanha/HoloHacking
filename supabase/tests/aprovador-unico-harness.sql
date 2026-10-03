-- Harness APROVADOR UNICO (migrations 20261001210000 + 20261003100000): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), depois de etapa4-2-harness.sql (usa pg_temp.gravar_pacote e _pacotes).
-- Substitui o antigo dupla-aprovacao-harness.sql (contrato Daniel -> Rodrigo, valido ate a Etapa 6.3-A; ver historico git).
-- Grava uma copia do candidato V1 como versao 3 (so para o teste) e percorre o ciclo: Aprovacao (Daniel) -> Homologar.
-- Nenhuma segunda revisao existe nem e simulada. As aprovacoes aqui sao de TESTE, num banco local descartavel; nada persiste.
create temp table _logda (passo text) on commit drop;
grant insert, select on _logda to authenticated;
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare pk uuid; h text; h2 text; v jsonb; n int; t text; ok boolean;
  falha text;
begin
  pk := pg_temp.gravar_pacote(jsonb_set((select doc from _pacotes where nome = 'candidato'), '{version}', '3'));
  h := public.metodologia_hash_conteudo(pk);
  insert into _logda values ('D00 ' || case when h ~ '^[0-9a-f]{64}$' then 'ok' else 'FALHOU' end || ': hash do conteudo calculado no servidor');

  -- ordem, pessoas e hash
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'conferido', repeat('0', 64)); insert into _logda values ('D01 FALHOU: aprovacao com hash divergente aceita');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D01 ok: hash divergente recusado: ' || left(sqlerrm, 40)); end;
  begin perform pg_temp.como_rodrigo(); perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisado', h); perform pg_temp.como_daniel(); insert into _logda values ('D02 FALHOU: Aprovacao 2 (descontinuada) aceita');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D02 ok: Aprovacao 2 descontinuada recusada: ' || left(sqlerrm, 40)); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisado', h); insert into _logda values ('D02b FALHOU: Aprovacao 2 aceita (Daniel)');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D02b ' || case when sqlerrm like '%descontinuada%' then 'ok' else 'FALHOU' end || ': etapa 2 recusada mesmo para o aprovador ativo (etapa_descontinuada)'); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Rodrigo', 'x', h); insert into _logda values ('D03 FALHOU: Aprovacao por Rodrigo aceita');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D03 ok: Aprovacao so por Daniel'); end;
  begin perform pg_temp.como_rodrigo(); perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'x', h); perform pg_temp.como_daniel(); insert into _logda values ('D03b FALHOU: identidade sem papel ativo aprovou como Daniel');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D03b ok: conta com papel desativado nao aprova (nem informando Daniel)'); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Liderança do método HOLOSCAN', 'x', h); insert into _logda values ('D04 FALHOU: aprovacao da Lideranca aceita');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D04 ok: aprovacao atribuida a "Liderança do método HOLOSCAN" recusada'); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', '   ', h); insert into _logda values ('D05 FALHOU: aprovacao sem justificativa aceita');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D05 ok: aprovacao sem justificativa recusada'); end;
  begin insert into public.methodology_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification) values (pk, 3, h, 1, 'responsavel_primario', 'Daniel', 'direto');
    insert into _logda values ('D06 FALHOU: aprovacao inserida direto na tabela');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D06 ok: aprovacao so pela RPC (insert direto recusado)'); end;
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D07 FALHOU: homologado sem aprovacao');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D07 ok: homologacao sem a Aprovacao (Daniel) recusada'); end;

  -- Aprovacao 1; pacote nao muda de status
  v := public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'conteudo conferido (teste)', h);
  select status into t from public.methodology_packages where id = pk;
  insert into _logda values ('D08 ' || case when t = 'em_revisao' and v->>'content_hash' = h and (v->>'package_version')::int = 3 and v->>'regime' = 'aprovador_unico' then 'ok' else 'FALHOU' end || ': Aprovacao (Daniel) registrada; pacote continua em_revisao (homologar e ato separado)');
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'de novo', h); insert into _logda values ('D09 FALHOU: Aprovacao 1 duplicada');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D09 ok: Aprovacao 1 repetida recusada'); end;
  begin perform pg_temp.como_rodrigo(); perform public.aprovar_pacote_metodologico(pk, '{}'); perform pg_temp.como_daniel(); insert into _logda values ('D10 FALHOU: quem nao e dono nem aprovador ativo homologou');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D10 ok: homologar exige dono do pacote E aprovador ativo holoscan/1 (Rodrigo recusado)'); end;

  -- pacote muda entre as aprovacoes -> ciclo invalidado
  update public.methodology_ranges set message_nutri = message_nutri || ' ' where package_id = pk and destination_id = 'fungico' and label = 'baixa';
  select count(*) into n from public.methodology_package_approvals where package_id = pk and step = 1 and invalidated_at is not null;
  insert into _logda values ('D11 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': conteudo alterado depois da Aprovacao 1 -> Aprovacao 1 invalidada (historico mantido)');
  h2 := public.metodologia_hash_conteudo(pk);
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D12 FALHOU: homologado com a Aprovacao invalidada');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D12 ok: homologacao recusada depois da mudanca: exige nova Aprovacao'); end;
  update public.methodology_ranges set message_nutri = rtrim(message_nutri) where package_id = pk and destination_id = 'fungico' and label = 'baixa';
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D13 FALHOU: conteudo voltou ao hash antigo e a Aprovacao invalidada foi reaproveitada');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D13 ok: voltar ao mesmo hash nao ressuscita a Aprovacao invalidada'); end;

  -- aprovacao valida; depois mudanca de versao a invalida
  perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'conteudo conferido de novo (teste)', h);
  update public.methodology_packages set version = 4 where id = pk;
  select count(*) into n from public.methodology_package_approvals where package_id = pk and invalidated_at is null;
  insert into _logda values ('D14 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': versao alterada -> Aprovacao invalidada (' || n || ' vigentes)');
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D15 FALHOU: homologado com aprovacao invalidada');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D15 ok: aprovacao de outra versao nao homologa'); end;
  update public.methodology_packages set version = 3 where id = pk;

  -- ciclo valido sobre o mesmo package_id, version e content_hash
  perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'aprovador unico: conteudo conferido (teste)', h);
  select count(*) = 1 and bool_and(step = 1 and package_version = 3 and content_hash = h) into ok from public.methodology_package_approvals where package_id = pk and invalidated_at is null;
  insert into _logda values ('D16 ' || case when ok then 'ok' else 'FALHOU' end || ': uma unica Aprovacao (Daniel) vigente sobre package_id, version 3 e content_hash');
  v := public.aprovar_pacote_metodologico(pk, '{}');
  select status, content_hash, responsible into t, h2, falha from public.methodology_packages where id = pk;
  insert into _logda values ('D17 ' || case when t = 'aprovado' and h2 = h and falha like 'Daniel%' and falha not like '%Rodrigo%' and v->>'regime' = 'aprovador_unico' then 'ok' else 'FALHOU' end || ': pacote homologado com o hash aprovado; responsavel = Daniel (aprovador unico)');
  select count(*) into n from public.methodology_homologation_records where package_id = pk and decision = 'aprovado' and responsible like 'Daniel%' and responsible not like '%Rodrigo%' and source = 'aprovador unico' and evidence like '%aprovador_unico%' || h || '%';
  insert into _logda values ('D18 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': registro de homologacao com o regime aprovador_unico, a aprovacao e o content_hash');
  select count(*) into n from public.methodology_package_approvals where package_id = pk;
  insert into _logda values ('D19 ' || case when n = 3 and not exists (select 1 from public.methodology_package_approvals where package_id = pk and step <> 1) then 'ok' else 'FALHOU' end || ': historico completo: 3 aprovacoes (2 invalidadas + 1 vigente), nenhuma de etapa 2');
  select (governance_regime = 'aprovador_unico' and reviewed_by is null and reviewed_at is null and approved_by = (select approved_by from public.methodology_package_approvals where package_id = pk and invalidated_at is null)) into ok from public.methodology_packages where id = pk;
  insert into _logda values ('D19b ' || case when ok then 'ok' else 'FALHOU' end || ': regime aprovador_unico; reviewed_by/reviewed_at NULOS (sem segunda revisao simulada); approved_by = aprovador');
  begin insert into public.methodology_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification) values (pk, 3, h, 2, 'revisao_final', 'Rodrigo', 'x');
    insert into _logda values ('D19c FALHOU: aprovacao de etapa 2 aceita pela tabela');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D19c ok: tabela nao aceita aprovacao de etapa 2'); end;
  begin update public.methodology_package_approvals set responsible = 'Rodrigo' where package_id = pk; get diagnostics n = row_count;
    insert into _logda values ('D20 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': aprovacao nao e editavel (' || n || ' linhas)');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D20 ok: aprovacao nao e editavel (recusado)'); end;
  begin insert into public.methodology_homologation_records (package_id, topic, element, decision, responsible, decided_at) values (pk, 'pacote', 'x', 'aprovado', 'Liderança do método HOLOSCAN', current_date);
    insert into _logda values ('D21 FALHOU: registro atribuido a Lideranca aceito');
  exception when others then perform pg_temp.como_daniel(); insert into _logda values ('D21 ok: registro de homologacao atribuido a "Liderança do método HOLOSCAN" recusado'); end;
exception when others then perform pg_temp.como_daniel(); insert into _logda values ('ERRO GERAL aprovador unico: ' || sqlerrm || ' / ' || sqlstate);
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _logda;
