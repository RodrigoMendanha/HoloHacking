-- Harness DUPLA APROVACAO (migration 20261001210000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), depois de etapa4-2-harness.sql (usa pg_temp.gravar_pacote e _pacotes).
-- Grava uma copia do candidato V1 como versao 3 (so para o teste) e percorre o ciclo de aprovacao.
-- As aprovacoes aqui sao de TESTE, num banco local descartavel; nada persiste.
create temp table _logda (passo text) on commit drop;
grant insert, select on _logda to authenticated;
set local role authenticated;
do $$
declare pk uuid; h text; h2 text; v jsonb; n int; t text; ok boolean;
  falha text;
begin
  pk := pg_temp.gravar_pacote(jsonb_set((select doc from _pacotes where nome = 'candidato'), '{version}', '3'));
  h := public.metodologia_hash_conteudo(pk);
  insert into _logda values ('D00 ' || case when h ~ '^[0-9a-f]{64}$' then 'ok' else 'FALHOU' end || ': hash do conteudo calculado no servidor');

  -- ordem, pessoas e hash
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'conferido', repeat('0', 64)); insert into _logda values ('D01 FALHOU: aprovacao com hash divergente aceita');
  exception when others then insert into _logda values ('D01 ok: hash divergente recusado: ' || left(sqlerrm, 40)); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisado', h); insert into _logda values ('D02 FALHOU: Aprovacao 2 antes da 1 aceita');
  exception when others then insert into _logda values ('D02 ok: Aprovacao 2 antes da 1 recusada: ' || left(sqlerrm, 40)); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Rodrigo', 'x', h); insert into _logda values ('D03 FALHOU: Aprovacao 1 por Rodrigo aceita');
  exception when others then insert into _logda values ('D03 ok: Aprovacao 1 so por Daniel'); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Liderança do método HOLOSCAN', 'x', h); insert into _logda values ('D04 FALHOU: aprovacao da Lideranca aceita');
  exception when others then insert into _logda values ('D04 ok: aprovacao atribuida a "Liderança do método HOLOSCAN" recusada'); end;
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', '   ', h); insert into _logda values ('D05 FALHOU: aprovacao sem justificativa aceita');
  exception when others then insert into _logda values ('D05 ok: aprovacao sem justificativa recusada'); end;
  begin insert into public.methodology_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification) values (pk, 3, h, 1, 'responsavel_primario', 'Daniel', 'direto');
    insert into _logda values ('D06 FALHOU: aprovacao inserida direto na tabela');
  exception when others then insert into _logda values ('D06 ok: aprovacao so pela RPC (insert direto recusado)'); end;
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D07 FALHOU: homologado sem aprovacoes');
  exception when others then insert into _logda values ('D07 ok: homologacao sem aprovacoes recusada'); end;

  -- Aprovacao 1; pacote nao muda de status
  v := public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'conteudo conferido (teste)', h);
  select status into t from public.methodology_packages where id = pk;
  insert into _logda values ('D08 ' || case when t = 'em_revisao' and v->>'content_hash' = h and (v->>'package_version')::int = 3 then 'ok' else 'FALHOU' end || ': Aprovacao 1 (Daniel) registrada; pacote continua em_revisao');
  begin perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'de novo', h); insert into _logda values ('D09 FALHOU: Aprovacao 1 duplicada');
  exception when others then insert into _logda values ('D09 ok: Aprovacao 1 repetida recusada'); end;
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D10 FALHOU: homologado so com a Aprovacao 1');
  exception when others then insert into _logda values ('D10 ok: so com a Aprovacao 1 nao homologa'); end;

  -- pacote muda entre as aprovacoes -> ciclo invalidado
  update public.methodology_ranges set message_nutri = message_nutri || ' ' where package_id = pk and destination_id = 'fungico' and label = 'baixa';
  select count(*) into n from public.methodology_package_approvals where package_id = pk and step = 1 and invalidated_at is not null;
  insert into _logda values ('D11 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': conteudo alterado depois da Aprovacao 1 -> Aprovacao 1 invalidada (historico mantido)');
  h2 := public.metodologia_hash_conteudo(pk);
  begin perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisado', h2); insert into _logda values ('D12 FALHOU: Aprovacao 2 sem Aprovacao 1 valida');
  exception when others then insert into _logda values ('D12 ok: Aprovacao 2 recusada depois da mudanca: exige nova Aprovacao 1'); end;
  update public.methodology_ranges set message_nutri = rtrim(message_nutri) where package_id = pk and destination_id = 'fungico' and label = 'baixa';
  begin perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisado', h); insert into _logda values ('D13 FALHOU: conteudo voltou ao hash antigo e a Aprovacao 1 invalidada foi reaproveitada');
  exception when others then insert into _logda values ('D13 ok: voltar ao mesmo hash nao ressuscita a Aprovacao 1 invalidada'); end;

  -- ciclo completo; depois mudanca de versao invalida as duas
  perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'conteudo conferido de novo (teste)', h);
  perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisao final (teste)', h);
  update public.methodology_packages set version = 4 where id = pk;
  select count(*) into n from public.methodology_package_approvals where package_id = pk and invalidated_at is null;
  insert into _logda values ('D14 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': versao alterada -> Aprovacoes 1 e 2 invalidadas (' || n || ' vigentes)');
  begin perform public.aprovar_pacote_metodologico(pk, '{}'); insert into _logda values ('D15 FALHOU: homologado com aprovacoes invalidadas');
  exception when others then insert into _logda values ('D15 ok: aprovacoes de outra versao nao homologam'); end;
  update public.methodology_packages set version = 3 where id = pk;

  -- ciclo valido sobre o mesmo package_id, version e content_hash
  perform public.registrar_aprovacao_metodologica(pk, 1, 'Daniel', 'responsavel primario: conteudo conferido (teste)', h);
  perform public.registrar_aprovacao_metodologica(pk, 2, 'Rodrigo', 'revisao final concluida (teste)', h);
  select count(*) = 2 and bool_and(package_version = 3 and content_hash = h) into ok from public.methodology_package_approvals where package_id = pk and invalidated_at is null;
  insert into _logda values ('D16 ' || case when ok then 'ok' else 'FALHOU' end || ': Aprovacao 1 (Daniel) e 2 (Rodrigo) sobre o mesmo package_id, version 3 e content_hash');
  v := public.aprovar_pacote_metodologico(pk, '{}');
  select status, content_hash, responsible into t, h2, falha from public.methodology_packages where id = pk;
  insert into _logda values ('D17 ' || case when t = 'aprovado' and h2 = h and falha like 'Daniel%' and falha like '%Rodrigo%' then 'ok' else 'FALHOU' end || ': pacote homologado com o hash aprovado; responsavel = Daniel / Rodrigo');
  select count(*) into n from public.methodology_homologation_records where package_id = pk and decision = 'aprovado' and responsible like 'Daniel%Rodrigo%' and evidence like '%' || h || '%';
  insert into _logda values ('D18 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': registro de homologacao com as duas aprovacoes e o content_hash');
  select count(*) into n from public.methodology_package_approvals where package_id = pk;
  insert into _logda values ('D19 ' || case when n = 5 then 'ok' else 'FALHOU' end || ': historico completo: 5 aprovacoes (3 invalidadas + 2 vigentes)');
  begin update public.methodology_package_approvals set responsible = 'Rodrigo' where package_id = pk; get diagnostics n = row_count;
    insert into _logda values ('D20 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': aprovacao nao e editavel (' || n || ' linhas)');
  exception when others then insert into _logda values ('D20 ok: aprovacao nao e editavel (recusado)'); end;
  begin insert into public.methodology_homologation_records (package_id, topic, element, decision, responsible, decided_at) values (pk, 'pacote', 'x', 'aprovado', 'Liderança do método HOLOSCAN', current_date);
    insert into _logda values ('D21 FALHOU: registro atribuido a Lideranca aceito');
  exception when others then insert into _logda values ('D21 ok: registro de homologacao atribuido a "Liderança do método HOLOSCAN" recusado'); end;
exception when others then insert into _logda values ('ERRO GERAL dupla aprovacao: ' || sqlerrm || ' / ' || sqlstate);
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _logda;
