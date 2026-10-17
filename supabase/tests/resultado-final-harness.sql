-- Harness RESULTADO FINAL HOLOS (migration 20261015100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration. Usa os fixtures do resultado-holos-harness (_rh). Dados ficticios.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _logrf (passo text) on commit drop;
grant select, insert, update on _logrf to authenticated, anon;
create or replace function pg_temp.rf_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text; r text;
begin
  execute sql into r;
  return 'ACEITO:' || coalesce(r, '');
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- RF00 — estrutura
insert into _logrf select 'RF00 ' || case when (select relrowsecurity from pg_class where oid = 'public.holos_result_emissions'::regclass)
  and has_table_privilege('authenticated', 'public.holos_result_emissions', 'select')
  and not has_table_privilege('authenticated', 'public.holos_result_emissions', 'insert')
  and not has_table_privilege('authenticated', 'public.holos_result_emissions', 'update')
  and not has_table_privilege('authenticated', 'public.holos_result_emissions', 'delete')
  and not has_table_privilege('anon', 'public.holos_result_emissions', 'select')
  and has_function_privilege('authenticated', 'public.emitir_resultado_final(jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.emitir_resultado_final(jsonb)', 'execute')
  and exists (select 1 from pg_trigger where tgrelid = 'public.holos_result_emissions'::regclass and tgname = 'exigir_conta_ativa')
  and exists (select 1 from pg_trigger where tgrelid = 'public.holos_result_emissions'::regclass and tgname = 'holos_result_emissions_proteger')
  then 'ok' else 'FALHOU' end || ': emissoes: RLS ligada; so leitura pela API; escrita so pela RPC; anon sem acesso; gatilhos de imutabilidade e conta ativa';

-- RF01 — nao interferencia: HOLOSCAN, notas, respostas, ferramentas, pacotes, perguntas, pesos, faixas, catalogo e Proximos Passos iguais
insert into _logrf select 'RF01 ' || case when pg_temp.rf_digitais()::text = (select v from _rf where k = 'pre') then 'ok'
  else 'FALHOU: ' || pg_temp.rf_digitais()::text end
  || ': a migration nao mudou HOLOSCAN, notas, respostas, ferramentas, pacotes, 84 perguntas, pesos, faixas, regras, catalogo nem Proximos Passos';

-- RF02 — resultados salvos antes: status, hash, snapshot e template_version identicos (sem backfill)
insert into _logrf select 'RF02 ' || case when pg_temp.rf_resultados((select v from _rf where k = 'ids')::uuid[]) = (select v from _rf where k = 'res')
  and not exists (select 1 from public.holos_results where id = any((select v from _rf where k = 'ids')::uuid[]) and status <> 'rascunho' and template_version <> 1)
  and (select content_hash = encode(sha256(convert_to(content_snapshot::text, 'UTF8')), 'hex') from public.holos_results where id = (select v::uuid from _rh where k = 'r1'))
  then 'ok' else 'FALHOU' end || ': Resultados HOLOS antigos intactos (hash confere, template 1, nenhum retrofit)';

-- RF03 — catalogo Sistema -> Ferramenta: as 30 relacoes aprovadas, na mesma ordem
insert into _logrf select 'RF03 ' || case when (select string_agg(system_id || ':' || rank || ':' || tool_id, ',' order by system_id, rank) from public.holos_recommendation_rules where catalog_code = 'HOLOS-RECOMENDACOES-V1' and catalog_version = 1)
  = 'acido_inflamatorio:1:mapa_rotina_v1,acido_inflamatorio:2:linha_momentum,acido_inflamatorio:3:gatilhos_respostas_v1,acido_inflamatorio:4:roda_vida,acido_inflamatorio:5:conexao_pertencimento_v1,acido_inflamatorio:6:oq3,'
 || 'detox_linfatico:1:mapa_rotina_v1,detox_linfatico:2:linha_momentum,detox_linfatico:3:oq3,detox_linfatico:4:roda_vida,detox_linfatico:5:conexao_pertencimento_v1,detox_linfatico:6:gatilhos_respostas_v1,'
 || 'fungico:1:mapa_rotina_v1,fungico:2:gatilhos_respostas_v1,fungico:3:mapa_crencas,fungico:4:linha_momentum,fungico:5:oq3,fungico:6:conexao_pertencimento_v1,'
 || 'mental_emocional_espiritual:1:pqq,mental_emocional_espiritual:2:mapa_crencas,mental_emocional_espiritual:3:gatilhos_respostas_v1,mental_emocional_espiritual:4:mapa,mental_emocional_espiritual:5:carta_futuro,mental_emocional_espiritual:6:conexao_pertencimento_v1,'
 || 'metabolico:1:mapa_rotina_v1,metabolico:2:gatilhos_respostas_v1,metabolico:3:mapa_crencas,metabolico:4:linha_momentum,metabolico:5:oq3,metabolico:6:carta_futuro'
  then 'ok' else 'FALHOU' end || ': as 30 relacoes Sistema -> Ferramenta continuam identicas e na mesma ordem (rank)';

-- ===================== Resultado HOLOS template 2 =====================
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare pa uuid := (select v::uuid from _rh where k = 'pa'); ea uuid := (select v::uuid from _rh where k = 'ea'); ha uuid := (select v::uuid from _rh where k = 'ha');
  t_oq3 uuid := (select v::uuid from _rh where k = 't_oq3'); base jsonb; reg jsonb; t text; r3 uuid; r4 uuid; x record; y record;
begin
  reg := public.registrar_proximos_passos(ha);
  base := jsonb_build_object('patient_id', pa, 'encounter_id', ea, 'holoscan_application_id', ha, 'tool_application_ids', jsonb_build_array(t_oq3),
    'visao_paciente', jsonb_build_object('ferramentas', jsonb_build_object(t_oq3::text, jsonb_build_object('mostrar', true, 'ocultar', '[]'::jsonb))));
  t := pg_temp.rf_tenta(format('select public.salvar_resultado_holos(%L::jsonb)', base));
  r3 := case when t like 'ACEITO:%' then substr(t, 8)::uuid end;
  select * into x from public.holos_results where id = r3;
  insert into _logrf values ('RF04 ' || case when r3 is not null and x.template_version = 2 and (x.content_snapshot->>'template_version') = '2'
    and (x.content_snapshot#>>'{proximos_passos,registrado}') = 'true'
    and (x.content_snapshot#>'{proximos_passos,selection}') = (select selection from public.holos_next_steps where id = (reg->>'registro_id')::uuid)
    and (x.content_snapshot#>>'{proximos_passos,catalogo,code}') = 'HOLOS-RECOMENDACOES-V1'
    and (x.content_snapshot#>>'{visibilidade,proximos_passos}') = 'false'
    and x.content_hash = encode(sha256(convert_to(x.content_snapshot::text, 'UTF8')), 'hex')
    then 'ok' else 'FALHOU: ' || t end
    || ': novo Resultado HOLOS (template 2) congela os Proximos Passos registrados; compartilhar com a paciente DESLIGADO por padrao; hash confere');
  -- compartilhamento ligado
  t := pg_temp.rf_tenta(format('select public.salvar_resultado_holos(%L::jsonb)', jsonb_set(base, '{visao_paciente,proximos_passos}', 'true')));
  r4 := case when t like 'ACEITO:%' then substr(t, 8)::uuid end;
  select * into y from public.holos_results where id = r4;
  insert into _logrf values ('RF05 ' || case when r4 is not null and (y.content_snapshot#>>'{visibilidade,proximos_passos}') = 'true'
    and (y.selected_sources#>>'{visao_paciente,proximos_passos}') = 'true'
    and pg_temp.rf_tenta(format('select public.salvar_resultado_holos(%L::jsonb)', jsonb_set(base, '{visao_paciente,proximos_passos}', '"sim"'))) = 'payload_invalido'
    then 'ok' else 'FALHOU: ' || t end || ': "Compartilhar Proximos Passos" ligado fica no snapshot; valor que nao e true/false e recusado');
  insert into _rf values ('r3', r3::text), ('r4', r4::text);
end $$;

-- RF06 — aplicacao sem Proximos Passos registrados: o snapshot diz isso, nada e calculado em silencio
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); pb uuid; eb uuid; hb uuid; t text; x record;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'RF TESTE FICTICIO SEM PP') returning id into pb;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pb, now()) returning id into eb;
  hb := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, pb, eb, current_date));
  t := pg_temp.rf_tenta(format('select public.salvar_resultado_holos(%L::jsonb)', jsonb_build_object('patient_id', pb, 'encounter_id', eb, 'holoscan_application_id', hb)));
  select * into x from public.holos_results where id = substr(t, 8)::uuid;
  insert into _logrf values ('RF06 ' || case when t like 'ACEITO:%' and (x.content_snapshot#>>'{proximos_passos,registrado}') = 'false'
    and not exists (select 1 from public.holos_next_steps where holoscan_application_id = hb)
    then 'ok' else 'FALHOU: ' || t end || ': sem registro de Proximos Passos: snapshot marca registrado=false e nenhum registro e criado');
end $$;

-- ===================== EMISSAO =====================
do $$
declare uid uuid := auth.uid(); pa uuid := (select v::uuid from _rh where k = 'pa'); ea uuid := (select v::uuid from _rh where k = 'ea');
  r3 uuid := (select v::uuid from _rf where k = 'r3'); c1 uuid; t text; e1 jsonb; x record;
begin
  insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, objective, actions, return_plan)
    values (uid, pa, ea, 1, 'salvo', 'Objetivo A', 'Caminhar 10 min <b>', 'Retorno em 30 dias') returning id into c1;
  insert into public.agreements (nutritionist_id, patient_id, conduct_id, description, due_text, position) values (uid, pa, c1, 'Beber água', 'diário', 1);
  t := pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', r3,
    'imagens', jsonb_build_object('logo', 'data:image/png;base64,iVBORw0KGgo=', 'assinatura', null))));
  e1 := case when t like 'ACEITO:%' then substr(t, 8)::jsonb end;
  select * into x from public.holos_result_emissions where id = (e1->>'id')::uuid;
  insert into _logrf values ('RF07 ' || case when e1 is not null and x.emission_number = 1 and x.template_version = 'RF-1'
    and x.holos_result_id = r3 and x.result_content_hash = (select content_hash from public.holos_results where id = r3)
    and x.conduct_id = c1 and (x.content_snapshot#>>'{conduta,campos,objective}') = 'Objetivo A'
    and (x.content_snapshot#>'{conduta,acordos}') = '[{"description":"Beber água","due_text":"diário"}]'::jsonb
    and (x.content_snapshot#>>'{imagens,logo}') = 'data:image/png;base64,iVBORw0KGgo=' and (x.content_snapshot#>>'{imagens,assinatura}') is null
    and (x.content_snapshot#>>'{profissional,nome}') = (select nome from public.profiles where id = uid)
    and x.content_hash = encode(sha256(convert_to(x.content_snapshot::text, 'UTF8')), 'hex')
    then 'ok' else 'FALHOU: ' || t end
    || ': emissao congela Resultado (id + hash), Conduta vigente (campos + combinados), Perfil e imagens; template RF-1; hash confere');
  insert into _rf values ('em1', e1->>'id'), ('em1_snap', x.content_snapshot::text), ('em1_hash', x.content_hash), ('c1', c1::text);
end $$;

-- RF08 — Perfil e Conduta mudam depois: a emissao antiga nao muda; a nova usa os dados novos
reset role;
update public.profiles set nome = 'Nome Novo Ficticio', registro = 'CRN-9 9999' where id = (select v::uuid from _aprov where k = 'daniel');
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); pa uuid := (select v::uuid from _rh where k = 'pa'); ea uuid := (select v::uuid from _rh where k = 'ea');
  r3 uuid := (select v::uuid from _rf where k = 'r3'); c1 uuid := (select v::uuid from _rf where k = 'c1'); t text; e2 jsonb; x record; o record;
begin
  insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, objective, supersedes_id)
    values (uid, pa, ea, 2, 'salvo', 'Objetivo B', c1);
  t := pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', r3)));
  e2 := case when t like 'ACEITO:%' then substr(t, 8)::jsonb end;
  select * into x from public.holos_result_emissions where id = (e2->>'id')::uuid;
  select * into o from public.holos_result_emissions where id = (select v::uuid from _rf where k = 'em1');
  insert into _logrf values ('RF08 ' || case when e2 is not null and x.emission_number = 2
    and (x.content_snapshot#>>'{conduta,campos,objective}') = 'Objetivo B' and (x.content_snapshot#>>'{profissional,nome}') = 'Nome Novo Ficticio'
    and (x.content_snapshot#>>'{profissional,registro}') = 'CRN-9 9999' and (x.content_snapshot#>>'{imagens,logo}') is null
    and o.content_snapshot::text = (select v from _rf where k = 'em1_snap') and o.content_hash = (select v from _rf where k = 'em1_hash')
    and (o.content_snapshot#>>'{profissional,nome}') <> 'Nome Novo Ficticio' and (o.content_snapshot#>>'{conduta,campos,objective}') = 'Objetivo A'
    then 'ok' else 'FALHOU: ' || t end
    || ': Perfil, CRN e Conduta mudaram: a emissao 1 continua identica (snapshot e hash); a emissao 2 usa os dados novos');
end $$;

-- RF09 — emissao imutavel: UPDATE/DELETE pela API negados; nem o dono do banco altera
insert into _logrf select 'RF09 ' || case when pg_temp.rf_tenta(format('update public.holos_result_emissions set content_hash = %L where id = %L', repeat('0', 64), (select v from _rf where k = 'em1'))) like '%permission denied%'
  and pg_temp.rf_tenta(format('delete from public.holos_result_emissions where id = %L', (select v from _rf where k = 'em1'))) like '%permission denied%'
  and pg_temp.rf_tenta(format('insert into public.holos_result_emissions (patient_id, holos_result_id, result_content_hash, emission_number, content_snapshot, content_hash) values (%L, %L, %L, 99, %L, %L)',
      (select v from _rh where k = 'pa'), (select v from _rf where k = 'r3'), repeat('a', 64), '{}', repeat('a', 64))) like '%permission denied%'
  then 'ok' else 'FALHOU' end || ': emissao nao e alterada, apagada nem inserida direto pela API';
reset role;
insert into _logrf select 'RF09b ' || case when pg_temp.rf_tenta(format('update public.holos_result_emissions set content_hash = %L where id = %L', repeat('0', 64), (select v from _rf where k = 'em1'))) = 'emissao_imutavel'
  and pg_temp.rf_tenta(format('delete from public.holos_result_emissions where id = %L', (select v from _rf where k = 'em1'))) = 'emissao_imutavel'
  then 'ok' else 'FALHOU' end || ': nem o dono do banco altera ou apaga uma emissao (gatilho)';

-- RF10 — so Resultado salvo e atual; idempotencia; imagem invalida
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare pa uuid := (select v::uuid from _rh where k = 'pa'); ea uuid := (select v::uuid from _rh where k = 'ea'); ha uuid := (select v::uuid from _rh where k = 'ha');
  rasc uuid; r1 uuid := (select v::uuid from _rh where k = 'r1'); op uuid := gen_random_uuid(); a text; b text; n int;
begin
  rasc := public.salvar_rascunho_resultado_holos(jsonb_build_object('patient_id', pa, 'encounter_id', ea, 'holoscan_application_id', ha));
  a := pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3'), 'operation_id', op)));
  b := pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3'), 'operation_id', op)));
  select count(*) into n from public.holos_result_emissions where operation_id = op;
  insert into _logrf values ('RF10 ' || case when pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', rasc))) = 'resultado_nao_finalizado'
    and pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', r1))) = 'resultado_substituido'
    and a = b and a like 'ACEITO:%' and n = 1
    and pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3'), 'imagens', jsonb_build_object('logo', 'javascript:alert(1)')))) = 'imagem_invalida'
    and pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3'), 'imagens', jsonb_build_object('logo', 'data:image/svg+xml;base64,PHN2Zz4=')))) = 'imagem_invalida'
    then 'ok' else 'FALHOU: a=' || a || ' b=' || b end
    || ': rascunho e versao substituida nao sao emitidos; mesmo operation_id nao duplica; imagem que nao e PNG/JPEG/WebP em base64 e recusada');
end $$;

-- RF11 — outra nutricionista: nao ve e nao emite
select pg_temp.como_rodrigo();
insert into _logrf select 'RF11 ' || case when (select count(*) from public.holos_result_emissions) = 0
  and pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3')))) = 'referencia_cruzada'
  then 'ok' else 'FALHOU' end || ': outra nutricionista nao le as emissoes nem emite com o resultado de outra conta';

-- RF12 — paciente arquivado: nao emite
reset role;
update public.patients set status = 'inativo' where id = (select v::uuid from _rh where k = 'pa');
set local role authenticated;
select pg_temp.como_daniel();
insert into _logrf select 'RF12 ' || case when pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3')))) = 'paciente_arquivado'
  then 'ok' else 'FALHOU' end || ': paciente arquivado: nenhuma emissao nova';
reset role;
update public.patients set status = 'ativo' where id = (select v::uuid from _rh where k = 'pa');

-- RF13 — conta nao liberada: nao emite
update public.profiles set status = 'pendente' where id = (select v::uuid from _aprov where k = 'daniel');
set local role authenticated;
select pg_temp.como_daniel();
insert into _logrf select 'RF13 ' || case when pg_temp.rf_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', (select v from _rf where k = 'r3')))) = 'conta_inativa'
  then 'ok' else 'FALHOU' end || ': conta aguardando liberacao nao emite';
reset role;
update public.profiles set status = 'ativo' where id = (select v::uuid from _aprov where k = 'daniel');

-- RF14 — exclusao de paciente que so tem convite de pre-anamnese: o convite vai junto (antes travava); apagar convite direto continua negado
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare p uuid; c jsonb; t text;
begin
  insert into public.patients (nutritionist_id, nome) values (auth.uid(), 'Excluir Ficticio') returning id into p;
  c := public.criar_convite_anamnese(p, null, 7, 'primeira', null);
  insert into _rf values ('px', p::text), ('cx', c->>'id');
  t := pg_temp.rf_tenta(format('with d as (delete from public.patients where id = %L returning id) select count(*)::text from d', p));
  insert into _logrf values ('RF14 ' || case when t = 'ACEITO:1' and not exists (select 1 from public.anamnesis_invites where id = (c->>'id')::uuid) and not exists (select 1 from public.patients where id = p)
    then 'ok' else 'FALHOU: ' || t end || ': paciente so com convite e excluida; o convite vai junto (cascata)');
end $$;
reset role;
do $$
declare p uuid; c jsonb; t text;
begin
  insert into public.patients (nutritionist_id, nome) values ((select v::uuid from _aprov where k = 'daniel'), 'Convite Ficticio') returning id into p;
  insert into public.anamnesis_invites (nutritionist_id, patient_id, token_hash, expires_at) values ((select v::uuid from _aprov where k = 'daniel'), p, repeat('c', 64), now() + interval '1 day') returning to_jsonb(anamnesis_invites) into c;
  t := pg_temp.rf_tenta(format('delete from public.anamnesis_invites where id = %L', c->>'id'));
  insert into _logrf values ('RF14b ' || case when t = 'convite_imutavel' then 'ok' else 'FALHOU: ' || t end || ': apagar o convite direto continua negado');
end $$;

-- RF15 — de novo: nada do HOLOSCAN, metodologia ou catalogo mudou com as emissoes e os resultados novos
-- (holoscan/notas/respostas ficam de fora so porque o RF06 grava um HOLOSCAN novo como fixture; RF01 ja provou a migration)
insert into _logrf select 'RF15 ' || case when (pg_temp.rf_digitais() - 'proximos_passos' - 'condutas' - 'holoscan' - 'scores' - 'respostas')::text
    = ((select v from _rf where k = 'pre')::jsonb - 'proximos_passos' - 'condutas' - 'holoscan' - 'scores' - 'respostas')::text
  and pg_temp.rf_resultados((select v from _rf where k = 'ids')::uuid[]) = (select v from _rf where k = 'res')
  then 'ok' else 'FALHOU' end || ': depois de salvar e emitir: HOLOSCAN, ferramentas, pacotes, perguntas, pesos, faixas, catalogo e resultados antigos iguais';

select passo from _logrf;
