-- Harness Etapa 4.2: roda DENTRO da transacao aberta por scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK),
-- depois de supabase/tests/etapa4-2-pacotes.sql (que carrega os dois pacotes gerados em _pacotes).
-- Grava o pacote importado (HOLOS-V1@1) e o candidato V1 (HOLOS-V1@2, em_revisao) e roda o validador SQL.
-- NAO aprova nada: o candidato fica em_revisao. Nada persiste (ROLLBACK).
create or replace function pg_temp.gravar_pacote(doc jsonb) returns uuid language plpgsql as $$
declare uid uuid := auth.uid(); pk uuid; ed uuid;
begin
  insert into public.methodology_packages (nutritionist_id, code, version, status, origin, justification, notes, lineage, content_hash)
    values (uid, doc->>'code', (doc->>'version')::int, doc->>'status', doc->>'origin', doc->>'justification', doc->>'notes', doc->'lineage', case when doc ? 'lineage' then doc->>'content_hash' end) returning id into pk;
  insert into public.methodology_questionnaire_editions (nutritionist_id, package_id, code, version, status, item_count, notes)
    values (uid, pk, doc->'edicao'->>'code', (doc->'edicao'->>'version')::int, doc->'edicao'->>'status', (doc->'edicao'->>'item_count')::int, doc->'edicao'->>'notes') returning id into ed;
  insert into public.methodology_scales (nutritionist_id, package_id, code, min_value, max_value, labels, kind, status, source, notes)
    select uid, pk, x.code, x.min_value, x.max_value, x.labels, x.kind, x.status, x.source, x.notes
    from jsonb_to_recordset(doc->'escalas') x(code text, min_value int, max_value int, labels jsonb, kind text, status text, source text, notes text);
  insert into public.methodology_systems (nutritionist_id, package_id, code, name, public_text, definition, emotional_pattern, spiritual_impact, color, position, status, source, notes, legacy)
    select uid, pk, x.code, x.name, x.public_text, x.definition, x.emotional_pattern, x.spiritual_impact, x.color, x.position, x.status, x.source, x.notes, x.legacy
    from jsonb_to_recordset(doc->'sistemas') x(code text, name text, public_text text, definition text, emotional_pattern text, spiritual_impact text, color text, position int, status text, source text, notes text, legacy jsonb);
  insert into public.methodology_questions (nutritionist_id, package_id, edition_id, stable_id, statement, block, scale_code, response_labels, orientation, temporal_context, status, source, notes, version, position)
    select uid, pk, ed, x.stable_id, x.statement, x.block, x.scale_code, x.response_labels, x.orientation, x.temporal_context, x.status, x.source, x.notes, coalesce(x.version, 1), x.position
    from jsonb_to_recordset(doc->'perguntas') x(stable_id text, statement text, block text, scale_code text, response_labels jsonb, orientation text, temporal_context text, status text, source text, notes text, version int, position int);
  insert into public.methodology_associations (nutritionist_id, package_id, question_stable_id, destination_type, destination_id, weight, role, status, source, conflict, conflict_note, legacy)
    select uid, pk, x.question_stable_id, x.destination_type, x.destination_id, x.weight, x.role, x.status, x.source, coalesce(x.conflict, false), x.conflict_note, x.legacy
    from jsonb_to_recordset(doc->'associacoes') x(question_stable_id text, destination_type text, destination_id text, weight numeric, role text, status text, source text, conflict boolean, conflict_note text, legacy jsonb);
  insert into public.methodology_ranges (nutritionist_id, package_id, destination_type, destination_id, lower_bound, upper_bound, lower_bound_exact, upper_bound_exact, lower_inclusive, upper_inclusive, label, message_nutri, message_paciente, status, source, legacy)
    select uid, pk, x.destination_type, x.destination_id, x.lower_bound, x.upper_bound, x.lower_bound_exact, x.upper_bound_exact, x.lower_inclusive, x.upper_inclusive, x.label, x.message_nutri, x.message_paciente, x.status, x.source, x.legacy
    from jsonb_to_recordset(doc->'faixas') x(destination_type text, destination_id text, lower_bound numeric, upper_bound numeric, lower_bound_exact text, upper_bound_exact text, lower_inclusive boolean, upper_inclusive boolean, label text, message_nutri text, message_paciente text, status text, source text, legacy jsonb);
  insert into public.methodology_rules (nutritionist_id, package_id, rule_type, target, payload, status, source, notes)
    select uid, pk, x.rule_type, x.target, x.payload, x.status, x.source, x.notes
    from jsonb_to_recordset(doc->'regras') x(rule_type text, target text, payload jsonb, status text, source text, notes text);
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
    select uid, pk, x.topic, x.element, x.version, x.decision, x.responsible, x.decided_at, x.source, x.justification, x.evidence
    from jsonb_to_recordset(coalesce(doc->'registros', '[]'::jsonb)) x(topic text, element text, version text, decision text, responsible text, decided_at date, source text, justification text, evidence text);
  return pk;
end $$;
create temp table _log42 (passo text) on commit drop;
grant insert, select on _log42 to authenticated;
select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) from (select nutritionist_id as uid from patients where status='ativo' order by created_at limit 1) a;
set local role authenticated;
do $$
declare imp uuid; cand uuid; v jsonb; n int; c text; codigos text; aid uuid;
  esperado_importado text[] := array['conflito_pendente','snt_pendente','politica_parcialidade_ausente','indice_incompleto','triada_incompleta','exemplo_sem_resultado','elemento_nao_aprovado','contexto_temporal_ausente','primaria_multipla','papel_invalido','texto_causal_legado'];
begin
  imp := pg_temp.gravar_pacote((select doc from _pacotes where nome = 'importado'));
  cand := pg_temp.gravar_pacote((select doc from _pacotes where nome = 'candidato'));
  select count(*) into n from public.methodology_questions where package_id = cand;
  insert into _log42 values ('40 ' || case when n = 84 then 'ok' else 'FALHOU' end || ': candidato gravado com 84 perguntas (' || n || ')');
  select count(*) into n from public.methodology_associations where package_id = cand and destination_type = 'system' and role = 'primaria' and weight = 1;
  insert into _log42 values ('41 ' || case when n = 84 then 'ok' else 'FALHOU' end || ': 84 primarias pontuaveis com peso 1 (' || n || ')');
  select count(*) into n from public.methodology_associations where package_id = cand and role = 'secondary_contextual' and weight is null and legacy ? 'legacy_recovered_weight';
  insert into _log42 values ('42 ' || case when n = 11 then 'ok' else 'FALHOU' end || ': 11 secondary_contextual sem peso, peso recuperado em legacy (' || n || ')');

  -- validador SQL no candidato: nenhum bloqueio metodologico
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('43 ' || case when (v->>'publicavel')::boolean and (v->>'total_erros')::int = 0 then 'ok' else 'FALHOU' end || ': validador SQL no candidato V1: ' || (v->>'total_erros') || ' erro(s) ' || left((v->'erros')::text, 300));
  select status into c from public.methodology_packages where id = cand;
  insert into _log42 values ('44 ' || case when c = 'em_revisao' then 'ok' else 'FALHOU' end || ': candidato continua em_revisao (nao publicado)');

  -- validador SQL no importado (historico): continua bloqueado, com os codigos esperados
  v := public.validar_pacote_metodologico(imp);
  select string_agg(distinct x->>'codigo', ',' order by x->>'codigo') into codigos from jsonb_array_elements(v->'erros') x;
  insert into _log42 values ('45 ' || case when not (v->>'publicavel')::boolean and (select bool_and(codigos like '%' || e || '%') from unnest(esperado_importado) e) then 'ok' else 'FALHOU' end || ': importado continua bloqueado (' || (v->>'total_erros') || ' erros: ' || codigos || ')');

  -- contrato: cada violacao e apontada (e desfeita em seguida)
  update public.methodology_questions set temporal_context = null where package_id = cand and stable_id = 'SNT-109';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('46 ' || case when v->'erros' @> '[{"codigo":"contexto_temporal_ausente","onde":"SNT-109"}]' then 'ok' else 'FALHOU' end || ': contexto temporal ausente apontado');
  update public.methodology_questions set temporal_context = 'ao_longo_da_vida' where package_id = cand and stable_id = 'SNT-109';
  begin update public.methodology_questions set temporal_context = 'ontem' where package_id = cand and stable_id = 'SNT-109'; insert into _log42 values ('47 FALHOU: contexto temporal invalido aceito');
  exception when check_violation then insert into _log42 values ('47 ok: contexto temporal fora dos 7 valores recusado pelo banco'); end;
  update public.methodology_associations set role = 'primaria', weight = 1 where package_id = cand and question_stable_id = 'SNT-101' and destination_id = 'metabolico' returning id into aid;
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('48 ' || case when v->'erros' @> '[{"codigo":"primaria_multipla","onde":"SNT-101"}]' then 'ok' else 'FALHOU' end || ': SNT-101 com dois primarios apontado');
  update public.methodology_associations set role = 'secondary_contextual', weight = null where id = aid;
  begin update public.methodology_associations set weight = 3 where id = aid; insert into _log42 values ('49 FALHOU: secondary_contextual com peso aceito');
  exception when check_violation then insert into _log42 values ('49 ok: secondary_contextual com peso recusado pelo banco'); end;
  update public.methodology_rules set payload = jsonb_set(payload, '{indice_parcial}', 'true') where package_id = cand and rule_type = 'index';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('50 ' || case when v->'erros' @> '[{"codigo":"indice_parcial_proibido"}]' then 'ok' else 'FALHOU' end || ': Indice parcial apontado');
  update public.methodology_rules set payload = jsonb_set(payload, '{indice_parcial}', 'false') where package_id = cand and rule_type = 'index';
  update public.methodology_rules set payload = jsonb_set(payload, '{automatica}', 'true') where package_id = cand and rule_type = 'suggestion';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('51 ' || case when v->'erros' @> '[{"codigo":"sugestao_automatica_proibida"}]' then 'ok' else 'FALHOU' end || ': sugestao automatica apontada');
  update public.methodology_rules set payload = jsonb_set(payload, '{automatica}', 'false') where package_id = cand and rule_type = 'suggestion';
  update public.methodology_ranges set lower_bound_exact = '10/4' where package_id = cand and destination_id = 'fungico' and label = 'intermediaria';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('52 ' || case when v->'erros' @> '[{"codigo":"faixa_limite_inconsistente"}]' then 'ok' else 'FALHOU' end || ': limite exato incoerente apontado');
  update public.methodology_ranges set lower_bound_exact = '10/3' where package_id = cand and destination_id = 'fungico' and label = 'intermediaria';
  update public.methodology_systems set spiritual_impact = 'texto legado' where package_id = cand and code = 'fungico';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('53 ' || case when v->'erros' @> '[{"codigo":"texto_causal_legado","onde":"fungico"}]' then 'ok' else 'FALHOU' end || ': texto causal legado em conteudo oficial apontado');
  update public.methodology_systems set spiritual_impact = null where package_id = cand and code = 'fungico';
  update public.methodology_rules set payload = jsonb_set(payload, '{denominador}', '"completo"') where package_id = cand and rule_type = 'absence';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('54 ' || case when v->'erros' @> '[{"codigo":"politica_parcialidade_invalida"}]' then 'ok' else 'FALHOU' end || ': denominador completo apontado');
  update public.methodology_rules set payload = jsonb_set(payload, '{denominador}', '"respondidos"') where package_id = cand and rule_type = 'absence';
  delete from public.methodology_associations where package_id = cand and question_stable_id = 'ESP-501' and destination_type = 'triad';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('55 ' || case when v->'erros' @> '[{"codigo":"triade_ausente","onde":"ESP-501"}]' then 'ok' else 'FALHOU' end || ': pergunta sem eixo da Triada apontada');
  insert into public.methodology_associations (package_id, question_stable_id, destination_type, destination_id, weight, role, status) values (cand, 'ESP-501', 'triad', 'mental', 1, 'triade_por_bloco', 'aprovado');
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('56 ' || case when v->'erros' @> '[{"codigo":"triade_eixo_divergente","onde":"ESP-501"}]' then 'ok' else 'FALHOU' end || ': eixo da Triada diferente do bloco apontado');
  update public.methodology_associations set destination_id = 'espiritual' where package_id = cand and question_stable_id = 'ESP-501' and destination_type = 'triad';
  v := public.validar_pacote_metodologico(cand);
  insert into _log42 values ('57 ' || case when (v->>'total_erros')::int = 0 then 'ok' else 'FALHOU' end || ': depois de desfazer as violacoes o candidato volta a 0 erros (' || (v->>'total_erros') || ')');
exception when others then insert into _log42 values ('ERRO GERAL 4.2: ' || sqlerrm || ' / ' || sqlstate);
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _log42;
