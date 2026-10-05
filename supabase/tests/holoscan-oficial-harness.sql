-- Harness CORRECAO P0 (migration 20261005100000 — aplicacao HOLOSCAN so oficial): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), DEPOIS da migration (e de holoscan-oficial-pre.sql, antes dela).
-- Dados ficticios; nada persiste. O pacote usado e o fixture LOCAL aprovado e vigente que a cadeia de testes deixa (mesmo conteudo do
-- HOLOS-V1@2 homologado; o numero de versao do fixture local nao e versao metodologica — nenhuma v3 existe no banco real) (84 perguntas,
-- 84 vinculos primarios, 11 secondary_contextual) — o mesmo conteudo do HOLOS-V1@2 real.
reset role;

-- payload VALIDO (estrutura do HoloscanOficial.payload): todas as perguntas respondidas, uma nota por sistema,
-- respondidos/total pelos vinculos PRIMARIOS. Os valores de nota sao ficticios: o servidor nao refaz a conta clinica.
create or replace function pg_temp.ho_payload(mp uuid, pa uuid, en uuid, d date) returns jsonb language plpgsql as $$
declare ans jsonb; sc jsonb; nq int; pk record;
begin
  select version, content_hash into pk from public.methodology_packages where id = mp;
  select jsonb_agg(jsonb_build_object('marcador_id', q.stable_id, 'valor', s.min_value + 1) order by q.stable_id) into ans
    from public.methodology_questions q join public.methodology_scales s on s.package_id = q.package_id and s.code = q.scale_code where q.package_id = mp;
  select count(*) into nq from public.methodology_questions where package_id = mp;
  select jsonb_agg(jsonb_build_object('sistema', y.code, 'nome', y.name, 'nota', 5, 'carga', 5, 'faixa', 'intermediaria', 'obtido', 1, 'maximo', 2,
      'respondidos', (select count(*) from public.methodology_associations x where x.package_id = mp and x.destination_type = 'system' and x.role = 'primaria' and x.destination_id = y.code),
      'total_marcadores', (select count(*) from public.methodology_associations x where x.package_id = mp and x.destination_type = 'system' and x.role = 'primaria' and x.destination_id = y.code),
      'avaliavel', true) order by y.code) into sc
    from public.methodology_systems y where y.package_id = mp;
  return jsonb_build_object('application', jsonb_build_object('patient_id', pa, 'encounter_id', en, 'quando', d, 'versao_estrutura', 3,
      'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5,
      'triada', jsonb_build_object('fisico', 5, 'mental', 5, 'espiritual', 5), 'triada_com_dado', jsonb_build_object('fisico', true, 'mental', true, 'espiritual', true),
      'cobertura', jsonb_build_object('respondidos', nq, 'total', nq), 'combinacoes', '[]'::jsonb, 'aprofundamentos', '[]'::jsonb,
      'methodology_package_id', mp, 'methodology_package_version', pk.version, 'methodology_content_hash', pk.content_hash,
      'engine_version', 'motor-generico-2.0.0', 'engine_contract_version', 'holoscan-motor-contrato-v1', 'calculation_mode', 'oficial'),
    'answers', ans, 'scores', sc);
end $$;
-- tenta gravar; devolve 'ACEITO:<id>' ou o hint do erro (ou a mensagem, se nao houver hint)
create or replace function pg_temp.ho_tenta(p jsonb) returns text language plpgsql as $$
declare h text; m text; id uuid;
begin
  id := public.salvar_holoscan_completo(p);
  return 'ACEITO:' || id;
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text;
  return coalesce(nullif(h, ''), m);
end $$;
-- troca o score de um sistema
create or replace function pg_temp.ho_score(p jsonb, sistema text, campo text, valor jsonb) returns jsonb language sql as $$
  select jsonb_set(p, '{scores}', (select jsonb_agg(case when e->>'sistema' = sistema then jsonb_set(e, array[campo], valor) else e end) from jsonb_array_elements(p->'scores') e))
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- pacote aprovado e vigente hoje + um pacote NAO aprovado (fixture)
do $$
declare mp uuid; mr uuid; uid uuid := (select v::uuid from _aprov where k = 'daniel');
begin
  select id into mp from public.methodology_packages where status = 'aprovado' and effective_from <= current_date and (effective_to is null or effective_to >= current_date) order by version desc limit 1;
  insert into _ho values ('mp', mp::text);
  insert into _logho values ('H00 ' || case when mp is not null and public.metodologia_hash_conteudo(mp) = (select content_hash from public.methodology_packages where id = mp)
    and (select count(*) from public.methodology_associations where package_id = mp and role = 'secondary_contextual') = 11 then 'ok' else 'FALHOU' end || ': pacote HOLOS-V1 aprovado, vigente, hash conferido, 11 secondary_contextual');
  insert into public.methodology_packages (nutritionist_id, code, version, status, origin, justification) values (uid, 'TEST_FIXTURE_ONLY-HO', 1, 'rascunho', 'fixture', 'fixture') returning id into mr;
  insert into _ho values ('mr', mr::text);
end $$;

set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); mr uuid := (select v::uuid from _ho where k = 'mr');
  pa uuid; en uuid; ok jsonb; t text; aid uuid; d date := current_date; n int; x record;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'HO TESTE FICTICIO') returning id into pa;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pa, now()) returning id into en;
  ok := pg_temp.ho_payload(mp, pa, en, d);

  -- H01 aceito, com a proveniencia completa
  t := pg_temp.ho_tenta(ok);
  aid := case when t like 'ACEITO:%' then substr(t, 8)::uuid end;
  select * into x from public.holoscan_applications where id = aid;
  insert into _logho values ('H01 ' || case when aid is not null and x.calculation_mode = 'oficial' and x.methodology_package_id = mp and x.methodology_content_hash = (select content_hash from public.methodology_packages where id = mp)
    and x.engine_contract_version = 'holoscan-motor-contrato-v1' and x.engine_version = 'motor-generico-2.0.0' and x.combinacoes = '[]'::jsonb and x.aprofundamentos = '[]'::jsonb
    and (select count(*) from public.holoscan_system_scores where application_id = aid) = 5 and (select count(*) from public.holoscan_answers where application_id = aid) = 84 then 'ok' else 'FALHOU' end
    || ': aplicacao oficial aceita: pacote, versao, hash, motor, contrato, modo; 5 notas e 84 respostas (' || t || ')');
  -- H02 proveniencia nula
  t := pg_temp.ho_tenta(jsonb_set(jsonb_set(ok, '{application,methodology_package_id}', 'null'), '{application,methodology_package_version}', 'null'));
  insert into _logho values ('H02 ' || case when t = 'proveniencia_obrigatoria' then 'ok' else 'FALHOU' end || ': proveniencia nula recusada (' || t || ')');
  t := pg_temp.ho_tenta(jsonb_set(ok, '{application}', (ok->'application') - 'methodology_package_id' - 'methodology_package_version'));
  insert into _logho values ('H03 ' || case when t = 'proveniencia_obrigatoria' then 'ok' else 'FALHOU' end || ': payload antigo, sem campos de proveniencia, recusado (' || t || ')');
  -- H04 pacote nao aprovado
  t := pg_temp.ho_tenta(jsonb_set(jsonb_set(ok, '{application,methodology_package_id}', to_jsonb(mr)), '{application,methodology_package_version}', '1'));
  insert into _logho values ('H04 ' || case when t = 'pacote_nao_aprovado' then 'ok' else 'FALHOU' end || ': pacote nao aprovado recusado (' || t || ')');
  -- H05 pacote nao vigente na data clinica
  t := pg_temp.ho_tenta(jsonb_set(ok, '{application,quando}', '"2020-01-01"'));
  insert into _logho values ('H05 ' || case when t = 'pacote_nao_vigente' then 'ok' else 'FALHOU' end || ': pacote nao vigente na data recusado (' || t || ')');
  -- H06 versao divergente
  t := pg_temp.ho_tenta(jsonb_set(ok, '{application,methodology_package_version}', '99'));
  insert into _logho values ('H06 ' || case when t = 'proveniencia_incoerente' then 'ok' else 'FALHOU' end || ': versao divergente recusada (' || t || ')');
  -- H07 hash divergente / ausente
  t := pg_temp.ho_tenta(jsonb_set(ok, '{application,methodology_content_hash}', '"0000"'));
  insert into _logho values ('H07 ' || case when t = 'hash_divergente' and pg_temp.ho_tenta(jsonb_set(ok, '{application}', (ok->'application') - 'methodology_content_hash')) = 'hash_divergente' then 'ok' else 'FALHOU' end || ': hash divergente ou ausente recusado (' || t || ')');
  -- H08 modo nao oficial / motor desconhecido / sem atendimento / pacote inexistente
  insert into _logho values ('H08 ' || case when pg_temp.ho_tenta(jsonb_set(ok, '{application,calculation_mode}', '"homologacao"')) = 'modo_nao_oficial'
    and pg_temp.ho_tenta(jsonb_set(ok, '{application}', (ok->'application') - 'calculation_mode')) = 'modo_nao_oficial'
    and pg_temp.ho_tenta(jsonb_set(ok, '{application,engine_contract_version}', '"legado"')) = 'motor_desconhecido'
    and pg_temp.ho_tenta(jsonb_set(ok, '{application,encounter_id}', 'null')) = 'sem_atendimento'
    and pg_temp.ho_tenta(jsonb_set(ok, '{application,methodology_package_id}', to_jsonb(gen_random_uuid()))) = 'pacote_inexistente' then 'ok' else 'FALHOU' end
    || ': modo homologacao/ausente, contrato desconhecido, sem atendimento e pacote inexistente recusados');
  -- H09 vinculo secundario contado como pontuavel (o erro do motor legado) — respondidos/total inflados
  select count(*) into n from public.methodology_associations where package_id = mp and role = 'secondary_contextual' and destination_id = 'metabolico';
  t := pg_temp.ho_tenta(pg_temp.ho_score(pg_temp.ho_score(ok, 'metabolico', 'respondidos', to_jsonb(((select (e->>'respondidos')::int from jsonb_array_elements(ok->'scores') e where e->>'sistema' = 'metabolico') + n))),
       'metabolico', 'total_marcadores', to_jsonb(((select (e->>'total_marcadores')::int from jsonb_array_elements(ok->'scores') e where e->>'sistema' = 'metabolico') + n))));
  insert into _logho values ('H09 ' || case when n = 5 and t = 'contagem_divergente' then 'ok' else 'FALHOU' end || ': metabolico com as ' || n || ' secundarias somadas (19 em vez de 14) recusado (' || t || ')');
  -- H10 respostas fora do pacote / fora da escala / duplicadas
  insert into _logho values ('H10 ' || case when pg_temp.ho_tenta(jsonb_set(ok, '{answers}', (ok->'answers') || jsonb_build_array(jsonb_build_object('marcador_id', 'XXX-999', 'valor', 1)))) = 'resposta_invalida'
    and pg_temp.ho_tenta(jsonb_set(ok, '{answers,0,valor}', '4')) = 'resposta_invalida'
    and pg_temp.ho_tenta(jsonb_set(ok, '{answers,0,valor}', '1.5')) = 'resposta_invalida'
    and pg_temp.ho_tenta(jsonb_set(ok, '{answers}', (ok->'answers') || jsonb_build_array(ok->'answers'->0))) = 'resposta_duplicada' then 'ok' else 'FALHOU' end
    || ': resposta fora do pacote, fora da escala (4, 1.5) e duplicada recusadas');
  -- H11 cobertura divergente e notas que nao cobrem os sistemas do pacote
  insert into _logho values ('H11 ' || case when pg_temp.ho_tenta(jsonb_set(ok, '{application,cobertura,respondidos}', '83')) = 'contagem_divergente'
    and pg_temp.ho_tenta(jsonb_set(ok, '{scores}', (ok->'scores') - 0)) = 'sistemas_divergentes'
    and pg_temp.ho_tenta(pg_temp.ho_score(ok, 'fungico', 'sistema', '"inventado"')) = 'sistemas_divergentes' then 'ok' else 'FALHOU' end
    || ': cobertura divergente, sistema faltando e sistema inventado recusados');
  -- H12 Indice so com todos os sistemas avaliaveis; ausencia nao e zero
  insert into _logho values ('H12 ' || case when pg_temp.ho_tenta(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(ok, 'fungico', 'avaliavel', 'false'), 'fungico', 'nota', 'null'), 'fungico', 'faixa', 'null')) = 'indice_incoerente'
    and pg_temp.ho_tenta(jsonb_set(jsonb_set(ok, '{application,indice}', 'null'), '{application,nota_media}', 'null')) = 'indice_incoerente'
    and pg_temp.ho_tenta(jsonb_set(ok, '{application,nota_media}', 'null')) = 'indice_incoerente'
    and pg_temp.ho_tenta(pg_temp.ho_score(ok, 'fungico', 'avaliavel', 'false')) = 'nota_incoerente'
    and pg_temp.ho_tenta(pg_temp.ho_score(ok, 'fungico', 'nota', '11')) = 'nota_incoerente' then 'ok' else 'FALHOU' end
    || ': Indice parcial, Indice ausente com todos avaliaveis, nota em sistema nao avaliavel e nota fora de 0..10 recusados');
  -- H13 aplicacao incompleta valida: um sistema nao avaliavel, Indice e nota_media nulos -> aceita (ausencia explicita)
  t := pg_temp.ho_tenta(jsonb_set(jsonb_set(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(ok, 'fungico', 'avaliavel', 'false'), 'fungico', 'nota', 'null'), 'fungico', 'faixa', 'null'),
       '{application,indice}', 'null'), '{application,nota_media}', 'null'));
  aid := case when t like 'ACEITO:%' then substr(t, 8)::uuid end;
  insert into _logho values ('H13 ' || case when aid is not null and (select indice is null and nota_media is null from public.holoscan_applications where id = aid)
    and (select nota is null and faixa is null and not avaliavel from public.holoscan_system_scores where application_id = aid and sistema = 'fungico') then 'ok' else 'FALHOU' end
    || ': aplicacao oficial com sistema nao avaliavel aceita com Indice NULL (sem Indice parcial, sem zero) (' || left(t, 7) || ')');
  -- H14 combinacoes/aprofundamentos nao homologados
  insert into _logho values ('H14 ' || case when pg_temp.ho_tenta(jsonb_set(ok, '{application,combinacoes}', '[{"id":"CMB-001"}]')) = 'saida_nao_homologada'
    and pg_temp.ho_tenta(jsonb_set(ok, '{application,aprofundamentos}', '["SNT-101"]')) = 'saida_nao_homologada' then 'ok' else 'FALHOU' end
    || ': combinacoes e aprofundamentos na aplicacao oficial recusados');
  -- H14b faixa que nao e do pacote (rotulo legado) recusada
  insert into _logho values ('H14b ' || case when pg_temp.ho_tenta(pg_temp.ho_score(ok, 'fungico', 'faixa', '"medio"')) = 'faixa_fora_do_pacote' then 'ok' else 'FALHOU' end
    || ': faixa legada (medio) numa aplicacao oficial recusada: so rotulos das faixas do pacote');
  -- H15 escrita direta (fora da RPC) nao existe mais
  begin insert into public.holoscan_applications (nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura)
          values (uid, pa, en, d, 2, 50, 100, true, 5, '{}', '{}', '{}'); insert into _logho values ('H15 FALHOU: insert direto em holoscan_applications aceito');
  exception when others then insert into _logho values ('H15 ok: insert direto em holoscan_applications recusado (' || left(sqlerrm, 50) || ')'); end;
  begin insert into public.holoscan_system_scores (application_id, sistema, nome, nota, obtido, maximo, respondidos, total_marcadores, avaliavel)
          values ((select id from public.holoscan_applications where patient_id = pa limit 1), 'fungico', 'x', 1, 0, 0, 0, 0, true); insert into _logho values ('H16 FALHOU: insert direto em holoscan_system_scores aceito');
  exception when others then insert into _logho values ('H16 ok: insert direto em holoscan_system_scores recusado (' || left(sqlerrm, 40) || ')'); end;
  -- H17 proveniencia do calculo imutavel
  aid := (select id from public.holoscan_applications where patient_id = pa and indice is not null limit 1);
  if aid is null then insert into _logho values ('H17 FALHOU: nenhuma aplicacao oficial gravada para testar'); end if;
  begin update public.holoscan_applications set methodology_content_hash = 'x' where id = aid; insert into _logho values ('H17 FALHOU: hash alterado');
  exception when others then
    begin update public.holoscan_applications set calculation_mode = null where id = aid; insert into _logho values ('H17 FALHOU: modo alterado');
    exception when others then insert into _logho values ('H17 ok: hash e modo do calculo imutaveis'); end;
  end;
  -- H18 interpretacao continua editavel
  begin update public.holoscan_applications set interpretacao_texto = 'nota da profissional' where id = aid; insert into _logho values ('H18 ok: interpretacao profissional continua editavel');
  exception when others then insert into _logho values ('H18 FALHOU: interpretacao bloqueada: ' || left(sqlerrm, 40)); end;
end $$;
reset role;

-- H19 o trigger barra insert sem proveniencia mesmo fora da RPC (gestao tecnica)
do $$
declare pa uuid := (select id from public.patients where nome = 'HO TESTE FICTICIO');
begin
  begin insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura)
          values ((select nutritionist_id from public.patients where id = pa), pa, current_date, 2, 50, 100, true, 5, '{}', '{}', '{}');
        insert into _logho values ('H19 FALHOU: insert sem proveniencia aceito pelo trigger');
  exception when others then insert into _logho values ('H19 ok: trigger recusa aplicacao nova sem proveniencia mesmo fora da RPC (' || left(sqlerrm, 40) || ')'); end;
end $$;

-- H20 historicas intactas: as linhas que existiam antes da migration nao mudaram, nao ganharam proveniencia, sem backfill
do $$
declare fp text;
begin
  select md5(coalesce(string_agg(concat_ws('|', a.id, a.nutritionist_id, a.patient_id, a.encounter_id, a.quando, a.versao_estrutura, a.versao_bancos, a.indice, a.indice_maximo,
         a.avaliavel, a.nota_media, a.triada, a.triada_com_dado, a.cobertura, a.combinacoes, a.aprofundamentos, a.interpretacao_texto, a.interpretacao_em, a.interpretacao_versao,
         a.methodology_package_id, a.methodology_package_version, a.created_at, a.updated_at), ';' order by a.id), '')) into fp
    from public.holoscan_applications a where a.calculation_mode is null;
  insert into _logho values ('H20 ' || case when fp = (select v from _ho where k = 'apps')
    and (select count(*)::text from public.holoscan_applications where calculation_mode is null) = (select v from _ho where k = 'n_apps')
    and (select count(*)::text from public.holoscan_applications where calculation_mode is null and methodology_package_id is null) = (select v from _ho where k = 'n_sem_pacote')
    and not exists (select 1 from public.holoscan_applications where calculation_mode is null and (methodology_content_hash is not null or engine_version is not null or engine_contract_version is not null))
    and (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s join public.holoscan_applications a on a.id = s.application_id where a.calculation_mode is null) = (select v from _ho where k = 'scores')
    then 'ok' else 'FALHOU' end || ': aplicacoes anteriores identicas (' || (select v from _ho where k = 'n_apps') || ' linhas, ' || (select v from _ho where k = 'n_sem_pacote') || ' sem pacote), scores identicos, sem backfill');
end $$;

select string_agg(passo, ' | ' order by passo) from _logho;
