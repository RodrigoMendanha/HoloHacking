-- Harness Etapa 4: roda DENTRO da transacao aberta por scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK).
-- Fixture TEST_FIXTURE_ONLY; nada aqui representa a metodologia HoloHacking.
create temp table _alvo on commit drop as select nutritionist_id as uid from patients where status='ativo' order by created_at limit 1;
create temp table _log (passo text) on commit drop;
grant select on _alvo to authenticated; grant insert, select on _log to authenticated;
select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) from _alvo;
set local role authenticated;
do $$
declare uid uuid := auth.uid(); outro uuid := gen_random_uuid(); pk uuid; ed uuid; vazio uuid; v jsonb; r jsonb; n int; t text; pa uuid; app uuid; q1 uuid; regid uuid; h text; e text;
begin
  -- pacote fixture completo (TEST_FIXTURE_ONLY), em_revisao, elementos aprovados
  insert into public.methodology_packages (nutritionist_id, code, version, status, origin) values (uid, 'TEST_FIXTURE_ONLY', 1, 'em_revisao', 'fixture') returning id into pk;
  insert into public.methodology_questionnaire_editions (nutritionist_id, package_id, code, version, status, item_count) values (uid, pk, 'fx-q', 1, 'aprovada', 3) returning id into ed;
  insert into public.methodology_scales (nutritionist_id, package_id, code, min_value, max_value, labels, status) values (uid, pk, 'e03', 0, 3, '["a","b","c","d"]', 'aprovado');
  insert into public.methodology_systems (nutritionist_id, package_id, code, name, status) values (uid, pk, 'A', 'Sistema A', 'aprovado'), (uid, pk, 'B', 'Sistema B', 'aprovado');
  insert into public.methodology_questions (nutritionist_id, package_id, edition_id, stable_id, statement, block, scale_code, orientation, status) values
    (uid, pk, ed, 'Q1', 'q1', 'fisico', 'e03', 'direta', 'aprovado'), (uid, pk, ed, 'Q2', 'q2', 'fisico', 'e03', 'invertida', 'aprovado'), (uid, pk, ed, 'Q3', 'q3', 'mental_emocional', 'e03', 'direta', 'aprovado');
  select id into q1 from public.methodology_questions where package_id = pk and stable_id = 'Q1';
  insert into public.methodology_associations (nutritionist_id, package_id, question_stable_id, destination_type, destination_id, weight, role, status) values
    (uid, pk, 'Q1', 'system', 'A', 2, 'primaria', 'aprovado'), (uid, pk, 'Q2', 'system', 'A', 1, 'primaria', 'aprovado'), (uid, pk, 'Q3', 'system', 'B', 3, 'primaria', 'aprovado'),
    (uid, pk, 'Q1', 'triad', 'fisico', 2, null, 'aprovado'), (uid, pk, 'Q2', 'triad', 'fisico', 1, null, 'aprovado'), (uid, pk, 'Q3', 'triad', 'mental', 3, null, 'aprovado');
  insert into public.methodology_ranges (nutritionist_id, package_id, destination_type, destination_id, lower_bound, upper_bound, lower_inclusive, upper_inclusive, label, status) values
    (uid, pk, 'system', 'A', 0, 5, true, true, 'baixo', 'aprovado'), (uid, pk, 'system', 'A', 5, 10, false, true, 'alto', 'aprovado'),
    (uid, pk, 'system', 'B', 0, 5, true, true, 'baixo', 'aprovado'), (uid, pk, 'system', 'B', 5, 10, false, true, 'alto', 'aprovado');
  insert into public.methodology_rules (nutritionist_id, package_id, rule_type, target, payload, status) values
    (uid, pk, 'scoring', 'A', '{"formula":"fixture"}', 'aprovado'), (uid, pk, 'scoring', 'B', '{"formula":"fixture"}', 'aprovado'),
    (uid, pk, 'absence', 'global', '{"denominador":"respondidos","cobertura_minima":0.5,"recusado":"exclui","nao_aplicavel":"exclui","minimos":{}}', 'aprovado'),
    (uid, pk, 'index', 'global', '{"alphas":{"A":0.5,"B":0.5},"elegibilidade":"todos","indice_parcial":false}', 'aprovado'),
    (uid, pk, 'triad', 'fisico', '{"contribuicao":"por_id","escala":"0..10","elegibilidade":"uma","agregacao":"ponderada"}', 'aprovado'),
    (uid, pk, 'triad', 'mental', '{"contribuicao":"por_id","escala":"0..10","elegibilidade":"uma","agregacao":"ponderada"}', 'aprovado'),
    (uid, pk, 'triad', 'espiritual', '{"contribuicao":"por_id","escala":"0..10","elegibilidade":"uma","agregacao":"ponderada"}', 'aprovado'),
    (uid, pk, 'example', 'ex1', '{"entrada":{"Q1":3},"esperado":{"A":{"nota":0}}}', 'aprovado');
  insert into _log values ('00 ok: fixture TEST_FIXTURE_ONLY montado (em_revisao)');

  -- 8. rascunho/em_revisao nao vira oficial por UPDATE direto
  begin update public.methodology_packages set status = 'aprovado' where id = pk; insert into _log values ('08 FALHOU: UPDATE direto para aprovado aceito');
  exception when others then insert into _log values ('08 ok: UPDATE direto para aprovado recusado: ' || left(sqlerrm, 50)); end;
  -- 7. aprovacao incompleta: sem responsavel; pacote vazio
  begin v := public.aprovar_pacote_metodologico(pk, '{"responsible":"","justification":"x"}'); insert into _log values ('07a FALHOU: sem responsavel aceito');
  exception when others then insert into _log values ('07a ok: sem responsavel humano recusado: ' || left(sqlerrm, 40)); end;
  insert into public.methodology_packages (nutritionist_id, code, version, status) values (uid, 'VAZIO', 1, 'em_revisao') returning id into vazio;
  v := public.validar_pacote_metodologico(vazio);
  insert into _log values ('22 ' || case when (v->>'publicavel') = 'false' and v->'erros' @> '[{"codigo":"vazio"}]' and v->'erros' @> '[{"codigo":"politica_parcialidade_ausente"}]' and v->'erros' @> '[{"codigo":"indice_incompleto"}]' then 'ok' else 'FALHOU' end || ': validador aponta pacote vazio (' || (v->>'total_erros') || ' erros)');
  begin v := public.aprovar_pacote_metodologico(vazio, '{"responsible":"R","justification":"j"}'); insert into _log values ('07b FALHOU: pacote incompleto aprovado');
  exception when others then insert into _log values ('07b ok: aprovacao de pacote incompleto bloqueada: ' || left(sqlerrm, 45)); end;
  -- 4-6. validador: duplicada (outra edicao), orfa, escala inexistente, orientacao ausente
  insert into public.methodology_questionnaire_editions (nutritionist_id, package_id, code, version, status) values (uid, pk, 'fx-q', 2, 'aprovada') returning id into ed;
  insert into public.methodology_questions (nutritionist_id, package_id, edition_id, stable_id, statement, block, scale_code, orientation, status) values (uid, pk, ed, 'Q1', 'dup', 'fisico', 'e03', 'direta', 'aprovado');
  insert into public.methodology_questions (nutritionist_id, package_id, edition_id, stable_id, statement, block, scale_code, orientation, status) values (uid, pk, ed, 'Q9', 'orfa', 'espiritual', 'e99', null, 'aprovado');
  v := public.validar_pacote_metodologico(pk);
  insert into _log values ('04 ' || case when v->'erros' @> '[{"codigo":"id_duplicado","onde":"Q1"}]' then 'ok' else 'FALHOU' end || ': pergunta duplicada detectada');
  insert into _log values ('05 ' || case when v->'erros' @> '[{"codigo":"associacao_orfa","onde":"Q9"}]' then 'ok' else 'FALHOU' end || ': associacao orfa detectada');
  insert into _log values ('06 ' || case when exists (select 1 from jsonb_array_elements(v->'erros') x where x->>'codigo' = 'referencia_inexistente' and x->>'mensagem' like '%e99%') then 'ok' else 'FALHOU' end || ': escala inexistente detectada');
  insert into _log values ('06b ' || case when v->'erros' @> '[{"codigo":"orientacao_ausente","onde":"Q9"}]' then 'ok' else 'FALHOU' end || ': orientacao ausente detectada (nao vira direta)');
  begin insert into public.methodology_questions (nutritionist_id, package_id, edition_id, stable_id, statement, block, scale_code, orientation, status) values (uid, pk, ed, 'Q1', 'dup2', 'fisico', 'e03', 'direta', 'aprovado'); insert into _log values ('04b FALHOU: duplicada na mesma edicao aceita');
  exception when unique_violation then insert into _log values ('04b ok: duplicada na mesma edicao recusada pelo unique'); end;
  begin v := public.aprovar_pacote_metodologico(pk, '{"responsible":"R","justification":"j"}'); insert into _log values ('07c FALHOU: aprovado com erros do validador');
  exception when others then insert into _log values ('07c ok: validador bloqueia a aprovacao com erros'); end;
  delete from public.methodology_questions where edition_id = ed; delete from public.methodology_questionnaire_editions where id = ed;
  insert into _log values ('DL ok: filhas de pacote em_revisao podem ser apagadas pelo dono');

  -- 1. aprovar pelo RPC; depois imutavel
  v := public.aprovar_pacote_metodologico(pk, jsonb_build_object('responsible', 'Responsavel humano (teste)', 'justification', 'fixture aprovado para teste', 'decided_at', '2026-10-01'));
  select status, content_hash into t, h from public.methodology_packages where id = pk;
  insert into _log values ('01 ' || case when t = 'aprovado' and length(h) = 64 and (v->>'status') = 'aprovado' then 'ok' else 'FALHOU' end || ': fixture aprovado pela RPC com hash sha256');
  select count(*) into n from public.methodology_homologation_records where package_id = pk and decision = 'aprovado' and responsible = 'Responsavel humano (teste)';
  insert into _log values ('23 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': registro de homologacao gravado com o responsavel informado');
  begin update public.methodology_packages set justification = 'depois' where id = pk; insert into _log values ('01b FALHOU: pacote aprovado alterado');
  exception when others then insert into _log values ('01b ok: pacote aprovado imutavel: ' || left(sqlerrm, 40)); end;
  begin update public.methodology_packages set status = 'rascunho' where id = pk; insert into _log values ('01c FALHOU: aprovado voltou a rascunho');
  exception when others then insert into _log values ('01c ok: aprovado nao volta a rascunho'); end;
  begin update public.methodology_questions set statement = 'outro' where id = q1; insert into _log values ('01d FALHOU: pergunta de pacote aprovado alterada');
  exception when others then insert into _log values ('01d ok: pergunta de pacote aprovado imutavel'); end;
  begin insert into public.methodology_associations (nutritionist_id, package_id, question_stable_id, destination_type, destination_id, weight, status) values (uid, pk, 'Q1', 'system', 'B', 9, 'aprovado'); insert into _log values ('01e FALHOU: associacao nova em pacote aprovado');
  exception when others then insert into _log values ('01e ok: nenhuma associacao nova em pacote aprovado'); end;
  begin delete from public.methodology_associations where package_id = pk;
  exception when others then null; end;
  select count(*) into n from public.methodology_associations where package_id = pk;
  insert into _log values ('01f ' || case when n = 6 then 'ok' else 'FALHOU' end || ': nada apagado de pacote aprovado (' || n || ' associacoes intactas)');
  select id into regid from public.methodology_homologation_records where package_id = pk limit 1;
  begin update public.methodology_homologation_records set responsible = 'outro' where id = regid; get diagnostics n = row_count;
    insert into _log values ('23b ' || case when n = 0 then 'ok' else 'FALHOU' end || ': registro de homologacao sem UPDATE (' || n || ' linhas)');
  exception when others then insert into _log values ('23b ok: registro de homologacao sem UPDATE (recusado: ' || left(sqlerrm, 40) || ')'); end;
  begin delete from public.methodology_packages where id = pk; get diagnostics n = row_count;
    insert into _log values ('DL2 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': sem DELETE de pacote (' || n || ' linhas)');
  exception when others then insert into _log values ('DL2 ok: sem DELETE de pacote (recusado: ' || left(sqlerrm, 40) || ')'); end;

  -- 10. registro historico mantem a versao do pacote (snapshot imutavel)
  insert into public.patients (nutritionist_id, nome, status) values (uid, 'E4 TESTE A', 'ativo') returning id into pa;
  insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura, methodology_package_id)
    values (uid, pa, current_date, 2, 50, 100, true, 5, '{}', '{}', '{}', pk) returning id into app;
  begin update public.holoscan_applications set methodology_package_id = null where id = app; insert into _log values ('10 FALHOU: methodology_package_id alterado no snapshot');
  exception when others then insert into _log values ('10 ok: methodology_package_id faz parte do snapshot imutavel'); end;
  begin insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura, methodology_package_id)
    values (uid, pa, current_date, 2, 50, 100, true, 5, '{}', '{}', '{}', gen_random_uuid()); insert into _log values ('10b FALHOU: pacote inexistente aceito');
  exception when others then insert into _log values ('10b ok: referencia a pacote inexistente recusada'); end;

  -- 2. retirar: recuperavel
  perform public.retirar_pacote_metodologico(pk, 'substituido pela v2', 'Responsavel humano (teste)');
  select status into t from public.methodology_packages where id = pk;
  select count(*) into n from public.methodology_questions where package_id = pk;
  insert into _log values ('02 ' || case when t = 'retirado' and n = 3 then 'ok' else 'FALHOU' end || ': retirado e conteudo continua legivel (' || n || ' perguntas)');
  begin update public.methodology_packages set status = 'aprovado' where id = pk; insert into _log values ('02b FALHOU: retirado voltou a aprovado');
  exception when others then insert into _log values ('02b ok: retirado nao volta nem muda: ' || left(sqlerrm, 40)); end;
  select count(*) into n from public.holoscan_applications where methodology_package_id = pk;
  insert into _log values ('02c ' || case when n = 1 then 'ok' else 'FALHOU' end || ': registro historico continua apontando para a versao retirada');
  select count(*) into n from public.methodology_homologation_records where package_id = pk;
  insert into _log values ('02d ' || case when n = 2 then 'ok' else 'FALHOU' end || ': dois registros (aprovado, retirado)');

  -- 9. pacote aprovado nao vigente (futuro) — a barreira e do app; aqui so o dado
  insert into public.methodology_packages (nutritionist_id, code, version, status) values (uid, 'FUTURO', 1, 'em_revisao') returning id into vazio;
  begin v := public.aprovar_pacote_metodologico(vazio, '{"responsible":"R","justification":"j","effective_from":"2099-01-01"}'); insert into _log values ('09 FALHOU: pacote vazio aprovado com vigencia futura');
  exception when others then insert into _log values ('09 ok: nem com vigencia futura um pacote incompleto e aprovado'); end;

  -- 3. outro profissional
  perform set_config('request.jwt.claims', json_build_object('sub', outro, 'role', 'authenticated')::text, true);
  select count(*) into n from public.methodology_packages where id = pk;
  insert into _log values ('03 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': outro profissional LE pacote retirado/aprovado (metodo compartilhado)');
  select count(*) into n from public.methodology_packages where id = vazio;
  insert into _log values ('03b ' || case when n = 0 then 'ok' else 'FALHOU' end || ': outro profissional NAO le pacote em_revisao alheio');
  begin update public.methodology_packages set notes = 'hack' where id = pk; get diagnostics n = row_count;
    insert into _log values ('03c ' || case when n = 0 then 'ok' else 'FALHOU' end || ': outro profissional nao altera (' || n || ' linhas)');
  exception when others then insert into _log values ('03c ok: outro profissional nao altera (recusado: ' || left(sqlerrm, 40) || ')'); end;
  begin v := public.aprovar_pacote_metodologico(vazio, '{"responsible":"R","justification":"j"}'); insert into _log values ('03d FALHOU: outro profissional aprovou');
  exception when others then insert into _log values ('03d ok: outro profissional nao aprova: ' || left(sqlerrm, 30)); end;
  begin insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, decision, responsible, decided_at) values (outro, pk, 'x', 'y', 'aprovado', 'B', current_date); insert into _log values ('03e FALHOU: outro profissional registrou homologacao em pacote alheio');
  exception when others then insert into _log values ('03e ok: outro profissional nao registra homologacao em pacote alheio'); end;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
exception when others then insert into _log values ('ERRO GERAL: ' || sqlerrm || ' / ' || sqlstate);
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _log;
