-- Harness RESULTADO HOLOS TEMPLATE 5 / DIRECAO (migration 20261021100000): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), DEPOIS da migration. Paciente, atendimentos, HOLOSCAN (v6),
-- Conduta e acordos FICTICIOS. Nada persiste.
--   RD00 estrutura: coluna direcao, funcoes internas fechadas, emissao aceita RF-3
--   RD01 rascunho SEM foco grava (com sugestao nao confirmada)
--   RD02 finalizar SEM foco -> foco_obrigatorio; foco so sugerido (nao confirmado) -> foco_obrigatorio
--   RD03 finalizar COM foco confirmado -> template 5; projecao da paciente: sugestao nao confirmada fora, confirmada dentro,
--        padrao observado confirmado dentro, HIPOTESE fora (mesmo com mostrar_paciente = true), territorio vazio = itens []
--   RD04 rastreabilidade: origem / ref / sugestao / texto_sugerido preservados na direcao (registro profissional)
--   RD05 validacao: schema_version, campo desconhecido, sugestao sem ref, tipo fora de padroes, ref de outra paciente
--   RD06 emissao: resultado template 4 (sem foco) recusado; template 5 -> RF-3 com a projecao; nenhuma hipotese no snapshot publico
--   RD07 retorno: o caminho le o resultado anterior (foco e avancos compartilhados) e o anterior fica identico
--   RD08 imutabilidade: direcao de resultado salvo nao muda; emissao nao muda
--   RD09 nao interferencia: HOLOSCAN, Resultados e emissoes de outras pacientes identicos
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _rd (k text primary key, v text) on commit drop;
create temp table _logrd (n serial, passo text) on commit drop;
grant select, insert, update on _rd, _logrd to authenticated;
grant usage on sequence _logrd_n_seq to authenticated;
create or replace function pg_temp.rd_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text; r text;
begin
  execute sql into r;
  return 'ACEITO:' || coalesce(r, '');
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
create or replace function pg_temp.rd_item(texto text, origem text, ref jsonb, sugestao boolean, confirmado boolean, mostrar boolean) returns jsonb language sql as $$
  select jsonb_strip_nulls(jsonb_build_object('texto', texto, 'texto_sugerido', case when sugestao then texto end, 'origem', origem, 'ref', ref,
    'sugestao', sugestao, 'confirmado', confirmado, 'mostrar_paciente', mostrar));
$$;
grant execute on all functions in schema pg_temp to authenticated;
insert into _rd values
  ('rh_antes', (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || status || updated_at::text, ',' order by id)), '') from public.holos_results)),
  ('em_antes', (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_result_emissions)),
  ('holo_antes', (select coalesce(md5(string_agg(s.application_id::text || s.sistema || coalesce(s.nota::text, '') || coalesce(s.faixa, ''), ',' order by s.application_id, s.sistema)), '') from public.holoscan_system_scores s)),
  ('r_t4', (select id::text from public.holos_results where status in ('salvo', 'revisado') and superseded_at is null and template_version = 4
             and nutritionist_id = (select nutritionist_id from public.methodology_packages where id = (select v::uuid from _pv6 where k = 'v6')) limit 1));

-- RD00 estrutura
insert into _logrd (passo) select 'RD00 ' || case when
    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'holos_results' and column_name = 'direcao' and data_type = 'jsonb')
    and not has_function_privilege('authenticated', 'public.resultado_holos_direcao_paciente(jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.resultado_holos_validar_direcao(uuid, uuid, jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.montar_resultado_holos(uuid, jsonb)', 'execute')
    and not has_function_privilege('authenticated', 'public.montar_resultado_holos_t4(uuid, jsonb)', 'execute')
    and has_function_privilege('authenticated', 'public.salvar_resultado_holos(jsonb)', 'execute')
    and not has_function_privilege('anon', 'public.salvar_resultado_holos(jsonb)', 'execute')
    and pg_get_constraintdef((select oid from pg_constraint where conname = 'holos_result_emissions_template')) like '%RF-3%'
  then 'ok' else 'FALHOU' end || ': coluna direcao jsonb; funcoes internas fechadas; RPCs so para authenticated; emissao aceita RF-3';

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare uid uuid := auth.uid(); v6 uuid := (select v::uuid from _pv6 where k = 'v6'); p uuid; p2 uuid; e1 uuid; e2 uuid; e9 uuid; h uuid; c1 uuid; a1 uuid;
  base jsonb; d jsonb; r1 uuid; t text; snap jsonb; dp jsonb;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'RD TESTE FICTICIO') returning id into p;
  insert into public.patients (nutritionist_id, nome) values (uid, 'RD OUTRA FICTICIA') returning id into p2;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now() - interval '30 days') returning id into e1;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e2;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p2, now()) returning id into e9;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(v6, p, e1, current_date));
  insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, objective, actions)
    values (uid, p, e1, 1, 'salvo', 'Organizar a tarde', 'Pausa para lanche as 16h') returning id into c1;
  insert into public.agreements (nutritionist_id, patient_id, conduct_id, description, status) values (uid, p, c1, 'Levar lanche para o trabalho', 'acordado') returning id into a1;
  insert into _rd values ('p', p::text), ('p2', p2::text), ('e1', e1::text), ('e2', e2::text), ('e9', e9::text), ('h', h::text), ('c1', c1::text), ('a1', a1::text);
  base := jsonb_build_object('patient_id', p, 'encounter_id', e1, 'holoscan_application_id', h, 'tool_application_ids', '[]'::jsonb,
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false));
  insert into _rd values ('base', base::text);

  -- RD01: rascunho sem foco, com uma sugestao ainda nao confirmada
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira',
    'dores', jsonb_build_array(pg_temp.rd_item('SUGESTAO_NAO_CONFIRMADA', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'actions'), true, false, true)));
  t := pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  insert into _logrd (passo) select 'RD01 ' || case when t like 'ACEITO:%'
      and (select status = 'rascunho' and direcao->'dores'->0->>'texto' = 'SUGESTAO_NAO_CONFIRMADA' from public.holos_results where id = substr(t, 8)::uuid)
    then 'ok' else 'FALHOU: ' || t end || ': rascunho grava SEM foco atual (com sugestao nao confirmada)';

  -- RD02: finalizar sem foco / com foco so sugerido
  t := pg_temp.rd_tenta(format('select public.salvar_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  insert into _logrd (passo) select 'RD02a ' || case when t = 'foco_obrigatorio' then 'ok' else 'FALHOU: ' || t end || ': finalizar sem foco atual e recusado (foco_obrigatorio)';
  t := pg_temp.rd_tenta(format('select public.salvar_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d || jsonb_build_object('foco_atual',
    pg_temp.rd_item('Organizar a tarde', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'objective'), true, false, true))))::text));
  insert into _logrd (passo) select 'RD02b ' || case when t = 'foco_obrigatorio' then 'ok' else 'FALHOU: ' || t end || ': foco so SUGERIDO (nao confirmado) tambem e recusado';
  insert into _logrd (passo) select 'RD02c ' || case when not exists (select 1 from public.holos_results where patient_id = p and status <> 'rascunho') then 'ok' else 'FALHOU' end
    || ': nenhuma recusa deixou resultado finalizado';

  -- RD03: finalizar com foco confirmado
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira',
    'momento', jsonb_build_array(pg_temp.rd_item('Voce chegou querendo mais energia a tarde.', 'relato_paciente', null, false, true, true)),
    'dores', jsonb_build_array(
       pg_temp.rd_item('SUGESTAO_NAO_CONFIRMADA', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'actions'), true, false, true),
       pg_temp.rd_item('Sono depois do almoco', 'holoscan', jsonb_build_object('tipo', 'holoscan', 'id', h, 'campo', 'SNT-507'), true, true, true)),
    'padroes', jsonb_build_array(
       pg_temp.rd_item('Nos dias com tarde longa sem pausa, relata mais fome a noite.', 'observacao_profissional', null, false, true, true) || '{"tipo":"padrao_observado"}',
       pg_temp.rd_item('HIPOTESE_SECRETA investigar organizacao da tarde', 'observacao_profissional', null, false, true, true) || '{"tipo":"hipotese"}'),
    'foco_atual', pg_temp.rd_item('Organizar a tarde', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'objective'), true, true, true),
    'direcionamentos', jsonb_build_array(
       pg_temp.rd_item('Organizar o periodo da tarde', 'nutricionista', null, false, true, true) || '{"id":"dir1","territorio":"corpo","porque":"fome forte no fim da tarde","objetivo":"chegar ao jantar com menos fome","status":"ativo","sistemas":["metabolico"]}',
       pg_temp.rd_item('DIRECIONAMENTO_NAO_CONFIRMADO', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'objective'), true, false, true) || '{"id":"dir2"}'),
    'estrategias', jsonb_build_array(
       pg_temp.rd_item('Pausa organizada no periodo da tarde', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'nutrition_strategy'), true, true, true)
         || '{"id":"est1","direcionamento_id":"dir1","acao":"lanche planejado as 16h","observar":"fome ao chegar em casa","status":"acordada"}'),
    'acordos_compartilhados', jsonb_build_array(pg_temp.rd_item('Levar lanche para o trabalho', 'acordo', jsonb_build_object('tipo', 'acordo', 'id', a1, 'campo', 'description'), true, true, true)),
    'corpo', jsonb_build_object('itens', jsonb_build_array(pg_temp.rd_item('Pausa para lanche as 16h', 'conduta', jsonb_build_object('tipo', 'conduta', 'id', c1, 'campo', 'actions'), true, true, true))),
    'mente', jsonb_build_object('itens', '[]'::jsonb),
    'observar', jsonb_build_array(pg_temp.rd_item('Como chega a noite', 'nutricionista', null, false, true, true)),
    'proxima_etapa', pg_temp.rd_item('Revisar a tarde em 3 semanas', 'nutricionista', null, false, true, true));
  t := pg_temp.rd_tenta(format('select public.salvar_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  if t not like 'ACEITO:%' then raise exception 'RD03 salvar falhou: %', t; end if;
  r1 := substr(t, 8)::uuid;
  insert into _rd values ('r1', r1::text);
  select content_snapshot into snap from public.holos_results where id = r1;
  dp := snap->'direcao_paciente';
  insert into _logrd (passo) select 'RD03a ' || case when (snap->>'template_version')::int = 5 and (select template_version from public.holos_results where id = r1) = 5
      and dp#>>'{foco_atual,texto}' = 'Organizar a tarde' then 'ok' else 'FALHOU' end || ': foco confirmado -> resultado finalizado, template 5, foco na projecao da paciente';
  insert into _logrd (passo) select 'RD03b ' || case when dp::text not like '%SUGESTAO_NAO_CONFIRMADA%' and jsonb_array_length(dp->'dores') = 1
      and dp#>>'{dores,0,texto}' = 'Sono depois do almoco' then 'ok' else 'FALHOU: ' || (dp->'dores')::text end
    || ': sugestao NAO confirmada fica fora da visao da paciente; sugestao confirmada aparece';
  insert into _logrd (passo) select 'RD03c ' || case when dp::text not like '%HIPOTESE_SECRETA%' and jsonb_array_length(dp->'padroes') = 1
      and dp#>>'{padroes,0,texto}' like 'Nos dias com tarde longa%' and (snap->'direcao')::text like '%HIPOTESE_SECRETA%'
    then 'ok' else 'FALHOU' end || ': HIPOTESE nunca na projecao da paciente (mesmo com mostrar_paciente = true); padrao observado confirmado aparece; a hipotese fica no registro profissional';
  insert into _logrd (passo) select 'RD03d ' || case when dp#>'{mente,itens}' = '[]'::jsonb and dp#>'{espirito,itens}' = '[]'::jsonb
      and jsonb_array_length(dp#>'{corpo,itens}') = 1 and dp->'acordos_compartilhados'->0->>'texto' = 'Levar lanche para o trabalho'
      and not (dp#>'{dores,0}' ? 'ref') then 'ok' else 'FALHOU' end || ': territorio sem material = itens [] (a tela mostra "Ainda nao aprofundado"); acordo da Conduta compartilhado; projecao sem ref';
  insert into _logrd (passo) select 'RD10a ' || case when jsonb_array_length(dp->'direcionamentos') = 1 and dp#>>'{direcionamentos,0,territorio}' = 'corpo'
      and dp#>'{direcionamentos,0,sistemas}' = '["metabolico"]'::jsonb and dp::text not like '%DIRECIONAMENTO_NAO_CONFIRMADO%'
      and dp#>>'{estrategias,0,direcionamento_id}' = 'dir1' and dp#>>'{estrategias,0,status}' = 'acordada' and not (dp#>'{estrategias,0}' ? 'ref')
    then 'ok' else 'FALHOU: ' || (dp->'direcionamentos')::text end || ': direcionamento confirmado (territorio, sistemas) e estrategia ligada a ele vao para a paciente; sugestao nao confirmada nao';
  insert into _logrd (passo) select 'RD04 ' || case when snap#>>'{direcao,dores,1,ref,tipo}' = 'holoscan' and snap#>>'{direcao,dores,1,ref,campo}' = 'SNT-507'
      and snap#>'{direcao,dores,1,sugestao}' = 'true'::jsonb and snap#>'{direcao,dores,1,confirmado}' = 'true'::jsonb
      and snap#>>'{direcao,foco_atual,ref,id}' = (select v from _rd where k = 'c1') and snap#>>'{direcao,dores,1,texto_sugerido}' = 'Sono depois do almoco'
      and (select direcao from public.holos_results where id = r1) = snap->'direcao'
    then 'ok' else 'FALHOU' end || ': origem, ref, sugestao, confirmado e texto_sugerido preservados (registro e snapshot)';

  -- RD05: validacao
  insert into _logrd (passo) select 'RD05a ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      (base || '{"direcao":{"schema_version":2}}'::jsonb)::text)) = 'direcao_invalida' then 'ok' else 'FALHOU' end || ': schema_version diferente de 1 recusado';
  insert into _logrd (passo) select 'RD05b ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      (base || '{"direcao":{"schema_version":1,"dieta":[]}}'::jsonb)::text)) = 'direcao_invalida' then 'ok' else 'FALHOU' end || ': campo desconhecido recusado';
  insert into _logrd (passo) select 'RD05c ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      (base || jsonb_build_object('direcao', jsonb_build_object('schema_version', 1, 'dores', jsonb_build_array(pg_temp.rd_item('x', 'holoscan', null, true, false, false)))))::text)) = 'direcao_invalida'
    then 'ok' else 'FALHOU' end || ': sugestao sem ref (rastreabilidade) recusada';
  insert into _logrd (passo) select 'RD05d ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      (base || jsonb_build_object('direcao', jsonb_build_object('schema_version', 1, 'dores', jsonb_build_array(pg_temp.rd_item('x', 'nutricionista', null, false, true, true) || '{"tipo":"hipotese"}'))))::text)) = 'direcao_invalida'
    then 'ok' else 'FALHOU' end || ': tipo (padrao/hipotese) fora da lista de padroes recusado';
  insert into _logrd (passo) select 'RD10c ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      (base || jsonb_build_object('direcao', jsonb_build_object('schema_version', 1, 'acompanhamento_estrategias', jsonb_build_array(
        pg_temp.rd_item('x', 'nutricionista', null, false, true, true) || jsonb_build_object('estrategia', jsonb_build_object('resultado_id', r1, 'estrategia_id', 'est1'))))))::text)) = 'direcao_invalida'
    then 'ok' else 'FALHOU' end || ': acompanhamento confirmado sem decisao (manter/ajustar/substituir/concluir/encerrar) e recusado';
  insert into _logrd (passo) select 'RD05e ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      (base || jsonb_build_object('direcao', jsonb_build_object('schema_version', 1, 'dores', jsonb_build_array(pg_temp.rd_item('x', 'conduta', jsonb_build_object('tipo', 'atendimento', 'id', e9), true, false, false)))))::text)) = 'referencia_cruzada'
    then 'ok' else 'FALHOU' end || ': ref para registro de OUTRA paciente recusada';
end $$;

-- RD06: emissao
select pg_temp.como_daniel();
set local role authenticated;
do $$
declare r1 uuid := (select v::uuid from _rd where k = 'r1'); rt4 uuid := (select v::uuid from _rd where k = 'r_t4'); t text; em jsonb; s jsonb;
begin
  t := case when rt4 is null then 'foco_obrigatorio' else pg_temp.rd_tenta(format('select public.emitir_resultado_final(%L::jsonb)::text', jsonb_build_object('holos_result_id', rt4)::text)) end;
  if t like 'ACEITO:%' then insert into _rd values ('em_t4', (substr(t, 8)::jsonb)->>'id'); end if;
  insert into _logrd (passo) select 'RD06a ' || case when rt4 is not null and t like 'ACEITO:%'
      and (select template_version = 'RF-2' and not (content_snapshot ? 'direcao_paciente') and content_snapshot->>'template' = 'RF-2'
           from public.holos_result_emissions where id = ((substr(t, 8)::jsonb)->>'id')::uuid)
    then 'ok' else 'FALHOU: ' || coalesce(t, '') || ' / t4=' || coalesce(rt4::text, 'nenhum') end
    || ': Resultado HISTORICO template 4 (sem direcao, sem foco) continua emitindo pela regra da epoca (RF-2)';
  em := public.emitir_resultado_final(jsonb_build_object('holos_result_id', r1));
  select content_snapshot into s from public.holos_result_emissions where id = (em->>'id')::uuid;
  insert into _rd values ('em1', em->>'id');
  insert into _logrd (passo) select 'RD06b ' || case when s->>'template' = 'RF-3' and s#>>'{direcao_paciente,foco_atual,texto}' = 'Organizar a tarde'
      and s::text not like '%HIPOTESE_SECRETA%' and s::text not like '%SUGESTAO_NAO_CONFIRMADA%' and not (s ? 'direcao')
      and (select template_version from public.holos_result_emissions where id = (em->>'id')::uuid) = 'RF-3'
    then 'ok' else 'FALHOU' end || ': foco confirmado permite emitir RF-3; snapshot publico sem hipotese e sem sugestao nao confirmada';
end $$;

-- RD07: retorno le o resultado anterior; o anterior nao muda
reset role;
insert into _rd values ('r1_fp', (select id::text || content_hash || status || updated_at::text || coalesce(direcao::text, '') from public.holos_results where id = (select v::uuid from _rd where k = 'r1')));
select pg_temp.como_daniel();
set local role authenticated;
do $$
declare p uuid := (select v::uuid from _rd where k = 'p'); e2 uuid := (select v::uuid from _rd where k = 'e2'); h uuid := (select v::uuid from _rd where k = 'h');
  r2 uuid; snap jsonb;
begin
  r2 := public.salvar_resultado_holos(jsonb_build_object('patient_id', p, 'encounter_id', e2, 'holoscan_application_id', h, 'tool_application_ids', '[]'::jsonb,
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false),
    'direcao', jsonb_build_object('schema_version', 1, 'tipo', 'retorno',
      'avancos', jsonb_build_array(pg_temp.rd_item('Conseguiu levar lanche 3 dias', 'relato_paciente', null, false, true, true)),
      'acompanhamento_estrategias', jsonb_build_array(pg_temp.rd_item('Pausa organizada no periodo da tarde', 'resultado_anterior',
          jsonb_build_object('tipo', 'resultado', 'id', (select v from _rd where k = 'r1'), 'campo', 'estrategias'), true, true, true)
        || jsonb_build_object('estrategia', jsonb_build_object('resultado_id', (select v from _rd where k = 'r1'), 'estrategia_id', 'est1'),
             'aplicou', 'conseguiu em 4 de 6 dias', 'percepcao', 'chega ao jantar com menos fome', 'observacao', 'OBSERVACAO_INTERNA_DA_NUTRI', 'decisao', 'manter')),
      'estrategias', jsonb_build_array(pg_temp.rd_item('Pausa organizada no periodo da tarde', 'nutricionista', null, false, true, true)
        || jsonb_build_object('id', 'est2', 'status', 'manter', 'anterior', jsonb_build_object('resultado_id', (select v from _rd where k = 'r1'), 'estrategia_id', 'est1'))),
      'foco_atual', pg_temp.rd_item('Manter a pausa da tarde', 'nutricionista', null, false, true, true))));
  insert into _rd values ('r2', r2::text);
  select content_snapshot into snap from public.holos_results where id = r2;
  insert into _logrd (passo) select 'RD10b ' || case when snap#>>'{direcao_paciente,acompanhamento_estrategias,0,decisao}' = 'manter'
      and snap#>>'{direcao_paciente,acompanhamento_estrategias,0,aplicou}' = 'conseguiu em 4 de 6 dias'
      and (snap->'direcao_paciente')::text not like '%OBSERVACAO_INTERNA_DA_NUTRI%' and (snap->'direcao')::text like '%OBSERVACAO_INTERNA_DA_NUTRI%'
      and snap#>>'{direcao_paciente,estrategias,0,anterior,estrategia_id}' = 'est1'
      and snap#>>'{caminho,0,estrategias,0,id}' = 'est1' and snap#>>'{caminho,0,direcionamentos,0,id}' = 'dir1'
    then 'ok' else 'FALHOU: ' || (snap->'direcao_paciente'->'acompanhamento_estrategias')::text end
    || ': retorno registra experiencia e decisao sobre a estrategia anterior (ligada pelo id), a nova estrategia guarda a anterior; observacao interna fica so profissional; caminho traz as estrategias e direcionamentos anteriores';
  insert into _logrd (passo) select 'RD10d ' || case when pg_temp.rd_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text',
      jsonb_build_object('patient_id', p, 'encounter_id', e2, 'holoscan_application_id', h, 'tool_application_ids', '[]'::jsonb,
        'direcao', jsonb_build_object('schema_version', 1, 'estrategias', jsonb_build_array(pg_temp.rd_item('x', 'nutricionista', null, false, true, true)
          || jsonb_build_object('anterior', jsonb_build_object('resultado_id', coalesce((select v from _rd where k = 'r_t4'), gen_random_uuid()::text), 'estrategia_id', 'zz')))))::text)) = 'referencia_cruzada'
    then 'ok' else 'FALHOU' end || ': estrategia anterior de Resultado de OUTRA paciente e recusada';
  insert into _logrd (passo) select 'RD07a ' || case when jsonb_array_length(snap->'caminho') = 1
      and snap#>>'{caminho,0,resultado_id}' = (select v from _rd where k = 'r1') and snap#>>'{caminho,0,foco,texto}' = 'Organizar a tarde'
      and snap#>>'{direcao_paciente,tipo}' = 'retorno' and (snap->'caminho')::text not like '%HIPOTESE_SECRETA%' and (snap->'caminho')::text not like '%nota%'
    then 'ok' else 'FALHOU: ' || (snap->'caminho')::text end || ': retorno le o Resultado anterior (foco compartilhado), sem hipotese e sem nota';
end $$;
reset role;
insert into _logrd (passo) select 'RD07b ' || case when (select id::text || content_hash || status || updated_at::text || coalesce(direcao::text, '') from public.holos_results where id = (select v::uuid from _rd where k = 'r1'))
    = (select v from _rd where k = 'r1_fp') then 'ok' else 'FALHOU' end || ': o Resultado anterior ficou identico (hash, status, direcao, updated_at)';

-- RD08: imutabilidade
insert into _logrd (passo) select 'RD08a ' || case when pg_temp.rd_tenta(format('update public.holos_results set direcao = %L::jsonb where id = %L returning id::text',
    '{"schema_version":1}', (select v from _rd where k = 'r1'))) = 'revisao_imutavel' then 'ok' else 'FALHOU' end || ': direcao de Resultado salvo nao muda (gatilho)';
insert into _logrd (passo) select 'RD08b ' || case when pg_temp.rd_tenta(format('update public.holos_result_emissions set content_hash = content_hash where id = %L returning id::text',
    (select v from _rd where k = 'em1'))) = 'emissao_imutavel' then 'ok' else 'FALHOU' end || ': emissao RF-3 imutavel';

-- RD09: nao interferencia
insert into _logrd (passo) select 'RD09 ' || case when
    (select coalesce(md5(string_agg(id::text || coalesce(content_hash, '') || status || updated_at::text, ',' order by id)), '') from public.holos_results
      where patient_id not in ((select v::uuid from _rd where k = 'p'), (select v::uuid from _rd where k = 'p2'))) = (select v from _rd where k = 'rh_antes')
    and (select coalesce(md5(string_agg(id::text || content_hash, ',' order by id)), '') from public.holos_result_emissions where patient_id <> (select v::uuid from _rd where k = 'p')
         and id::text is distinct from (select v from _rd where k = 'em_t4')) = (select v from _rd where k = 'em_antes')
    and (select coalesce(md5(string_agg(s.application_id::text || s.sistema || coalesce(s.nota::text, '') || coalesce(s.faixa, ''), ',' order by s.application_id, s.sistema)), '') from public.holoscan_system_scores s
      where s.application_id <> (select v::uuid from _rd where k = 'h')) = (select v from _rd where k = 'holo_antes')
  then 'ok' else 'FALHOU' end || ': Resultados, emissoes e HOLOSCAN anteriores identicos (sem backfill, sem recalculo)';

select passo from _logrd order by n;
