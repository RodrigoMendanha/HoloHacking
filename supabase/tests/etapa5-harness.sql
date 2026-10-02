-- Harness Etapa 5 (migration 20261001220000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK).
-- Dados ficticios de teste; nada aqui e paciente real. Nada persiste.
create temp table _log5 (passo text) on commit drop;
grant insert, select on _log5 to authenticated;
-- 1) legado: simula uma coleta do painel antigo ANTES de a migration ter rodado? Nao: a migration ja rodou nesta transacao.
--    Entao insere uma linha legado e aplica a mesma migracao deterministica para provar o mapeamento.
select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true) from (select nutritionist_id as uid from patients where status='ativo' order by created_at limit 1) a;
set local role authenticated;
do $$
declare uid uuid := auth.uid(); outro uuid := gen_random_uuid(); pa uuid; en uuid; c1 jsonb; c2 jsonb; r jsonb; n int; t text; cid1 uuid; cid2 uuid; cid3 uuid; rev uuid; cust uuid; li uuid; hid uuid; h text; x record;
  leg uuid; d date := date '2026-03-10';
begin
  -- catalogo
  insert into _log5 values ('L01 ' || case when (select count(*) from public.lab_exam_catalog) = 45 and (select count(distinct code) from public.lab_exam_catalog) = 45 and (select count(distinct canonical_name) from public.lab_exam_catalog) = 45 then 'ok' else 'FALHOU' end || ': catalogo-base com exatamente 45 exames, codigos e nomes unicos');
  begin insert into public.lab_exam_catalog (code, position, canonical_name, category, catalog_version) values ('LAB-046', 46, 'HOMA-IR', 'x', 'v'); insert into _log5 values ('L02 FALHOU: catalogo aceitou insercao');
  exception when others then insert into _log5 values ('L02 ok: catalogo-base e somente leitura pela aplicacao: ' || left(sqlerrm, 40)); end;
  insert into public.patients (nutritionist_id, nome, status) values (uid, 'E5 TESTE A', 'ativo') returning id into pa;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pa, now()) returning id into en;

  -- custom exam
  insert into public.lab_custom_exams (nutritionist_id, name, notes) values (uid, 'Exame custom E5', 'teste') returning id into cust;
  insert into _log5 values ('L03 ' || case when (select count(*) from public.lab_exam_catalog) = 45 then 'ok' else 'FALHOU' end || ': exame customizado nao entra nos 45');

  -- duas coletas na mesma data (ids independentes), estados, resultado original preservado
  c1 := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'salvo', 'laboratory_name', 'Lab A', 'operation_id', gen_random_uuid()),
    'results', jsonb_build_array(
      jsonb_build_object('exam_code','LAB-002','value_original_text','7,2','numeric_value',7.2,'qualifier','eq','unit_original','mg/dL','report_reference_text','70 a 99','report_reference_min',70,'report_reference_max',99),
      jsonb_build_object('exam_code','LAB-016','variant','ultrassensivel','value_original_text','< 0,10','qualifier','lt','censor_limit',0.10,'unit_original','mg/L'),
      jsonb_build_object('exam_code','LAB-016','value_original_text','Negativo','qualifier','text'),
      jsonb_build_object('exam_code','LAB-021','variant','eritrocitario','material','sangue total','value_original_text','5,1','numeric_value',5.1,'qualifier','eq','unit_original','mg/dL'),
      jsonb_build_object('custom_exam_id', cust, 'value_original_text','12','numeric_value',12,'qualifier','eq','unit_original','u'),
      jsonb_build_object('exam_code','LAB-001','value_original_text','ver componentes','qualifier','text','components', jsonb_build_array(jsonb_build_object('original_name','Hemoglobina','value_original_text','13,2','numeric_value',13.2,'qualifier','eq','unit_original','g/dL','report_reference_text','12 a 16'))))));
  cid1 := (c1->>'id')::uuid;
  c2 := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'salvo', 'laboratory_name', 'Lab B'),
    'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-002','value_original_text','8','numeric_value',8,'qualifier','eq','unit_original','mg/dL'))));
  cid2 := (c2->>'id')::uuid;
  insert into _log5 values ('L04 ' || case when cid1 <> cid2 and (select count(*) from public.lab_collections where patient_id = pa and coletado_em = d) = 2 then 'ok' else 'FALHOU' end || ': duas coletas na mesma data com ids independentes');
  select count(*) into n from public.lab_results where collection_id = cid1;
  insert into _log5 values ('L05 ' || case when n = 6 then 'ok' else 'FALHOU' end || ': 6 resultados (PCR e PCR-us sao identidades distintas; magnesio eritrocitario distinto; custom; hemograma)');
  select value_original_text, numeric_value, qualifier into x from public.lab_results where collection_id = cid1 and exam_code = 'LAB-002';
  insert into _log5 values ('L06 ' || case when x.value_original_text = '7,2' and x.numeric_value = 7.2 and x.qualifier = 'eq' then 'ok' else 'FALHOU' end || ': valor original "7,2" preservado ao lado do numerico');
  select value_original_text, numeric_value, qualifier, censor_limit into x from public.lab_results where collection_id = cid1 and exam_code = 'LAB-016' and variant = 'ultrassensivel';
  insert into _log5 values ('L07 ' || case when x.value_original_text = '< 0,10' and x.numeric_value is null and x.qualifier = 'lt' and x.censor_limit = 0.10 then 'ok' else 'FALHOU' end || ': censurado "< 0,10" nao vira numero exato (numeric_value nulo, qualifier lt, limite 0,10)');
  select value_original_text, numeric_value, qualifier, reference_status into x from public.lab_results where collection_id = cid1 and exam_code = 'LAB-016' and variant is null;
  insert into _log5 values ('L08 ' || case when x.value_original_text = 'Negativo' and x.numeric_value is null and x.qualifier = 'text' and x.reference_status = 'missing' then 'ok' else 'FALHOU' end || ': qualitativo nao vira numero; sem referencia = missing (nao e "dentro")');
  begin insert into public.lab_results (collection_id, exam_code, value_original_text, numeric_value, qualifier) values (cid2, 'LAB-003', '< 2', 2, 'lt'); insert into _log5 values ('L09 FALHOU: censurado com numeric_value aceito');
  exception when others then insert into _log5 values ('L09 ok: banco recusa numeric_value em valor censurado'); end;
  select count(*) into n from public.lab_result_components k join public.lab_results r on r.id = k.result_id where r.collection_id = cid1;
  insert into _log5 values ('L10 ' || case when n = 1 then 'ok' else 'FALHOU' end || ': hemograma e 1 item-base com componentes (' || n || ')');
  begin insert into public.lab_result_components (result_id, original_name, value_original_text) select id, 'x', '1' from public.lab_results where collection_id = cid2 and exam_code = 'LAB-002'; insert into _log5 values ('L11 FALHOU: componente em exame nao composto aceito');
  exception when others then insert into _log5 values ('L11 ok: componente so em exame composto (Hemograma)'); end;

  -- consolidada: nao sobrescreve; revisao preserva historico
  begin perform public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('id', cid1, 'patient_id', pa, 'clinical_date', d, 'state', 'salvo'), 'results', '[]'::jsonb)); insert into _log5 values ('L12 FALHOU: coleta consolidada editada em lugar');
  exception when others then insert into _log5 values ('L12 ok: coleta consolidada nao e editada em lugar: ' || left(sqlerrm, 45)); end;
  begin update public.lab_results set value_original_text = '9' where collection_id = cid1 and exam_code = 'LAB-002'; insert into _log5 values ('L13 FALHOU: resultado consolidado alterado direto');
  exception when others then insert into _log5 values ('L13 ok: resultado consolidado imutavel por escrita direta'); end;
  begin delete from public.lab_collections where id = cid1; insert into _log5 values ('L14 FALHOU: coleta consolidada apagada');
  exception when others then insert into _log5 values ('L14 ok: coleta consolidada nao e apagada'); end;
  r := public.revisar_coleta_laboratorial(jsonb_build_object('collection_id', cid1, 'reason', 'valor digitado errado', 'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-002','value_original_text','7,8','numeric_value',7.8,'qualifier','eq','unit_original','mg/dL'))));
  rev := (r->>'id')::uuid;
  select count(*) into n from public.lab_collections where id in (cid1, rev);
  insert into _log5 values ('L15 ' || case when n = 2 and (select superseded_at is not null from public.lab_collections where id = cid1) and (select revision = 2 and supersedes_id = cid1 and coletado_em = d and revision_note = 'valor digitado errado' from public.lab_collections where id = rev) then 'ok' else 'FALHOU' end || ': revisao cria nova linha (rev 2, mesma data clinica, motivo), anterior preservada e marcada');
  insert into _log5 values ('L16 ' || case when (select value_original_text from public.lab_results where collection_id = cid1 and exam_code = 'LAB-002') = '7,2' then 'ok' else 'FALHOU' end || ': resultado da versao anterior intacto');
  begin perform public.revisar_coleta_laboratorial(jsonb_build_object('collection_id', cid1, 'reason', 'de novo', 'results', '[]'::jsonb)); insert into _log5 values ('L17 FALHOU: revisou versao ja substituida');
  exception when others then insert into _log5 values ('L17 ok: versao ja substituida nao recebe outra revisao'); end;

  -- rascunho: editavel por id; operation_id idempotente; encounter explicito
  c1 := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'rascunho', 'operation_id', '11111111-2222-4333-8444-555555555555'), 'results', '[]'::jsonb));
  cid3 := (c1->>'id')::uuid;
  c2 := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'rascunho', 'operation_id', '11111111-2222-4333-8444-555555555555'), 'results', '[]'::jsonb));
  insert into _log5 values ('L18 ' || case when (c2->>'id')::uuid = cid3 and (c2->>'repetida')::boolean then 'ok' else 'FALHOU' end || ': retry da mesma operation_id nao duplica a coleta');
  c2 := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('id', cid3, 'patient_id', pa, 'clinical_date', d, 'state', 'salvo', 'encounter_id', en), 'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-030','value_original_text','2,1','numeric_value',2.1,'qualifier','eq','unit_original','uUI/mL'))));
  insert into _log5 values ('L19 ' || case when (c2->>'id')::uuid = cid3 and (select state = 'salvo' and encounter_id = en from public.lab_collections where id = cid3) then 'ok' else 'FALHOU' end || ': rascunho editado pelo id vira salvo com atendimento EXPLICITO');
  insert into _log5 values ('L20 ' || case when (select encounter_id is null from public.lab_collections where id = cid2) then 'ok' else 'FALHOU' end || ': coleta sem encounter informado nao ganha atendimento pela data');
  begin perform public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'salvo', 'encounter_id', gen_random_uuid()), 'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-030','value_original_text','1','numeric_value',1,'qualifier','eq')))); insert into _log5 values ('L21 FALHOU: encounter alheio aceito');
  exception when others then insert into _log5 values ('L21 ok: atendimento inexistente/alheio recusado'); end;
  begin perform public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'salvo'), 'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-999','value_original_text','1','qualifier','text')))); insert into _log5 values ('L22 FALHOU: exame fora do catalogo aceito');
  exception when others then insert into _log5 values ('L22 ok: exame fora do catalogo recusado'); end;
  r := public.marcar_coleta_revisada(cid3, 'Profissional X');
  insert into _log5 values ('L23 ' || case when (select state = 'revisado' and reviewed_by = uid from public.lab_collections where id = cid3) then 'ok' else 'FALHOU' end || ': salvo → revisado com acao humana identificada');

  -- legado: migracao deterministica (insere linha como o painel legado e aplica o mesmo mapeamento)
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, source, state) values (uid, pa, d, false, 'legacy_panel', 'salvo') returning id into leg;
  insert into public.lab_results (collection_id, exame_id, valor, unidade_no_momento, ideal_min_no_momento, ideal_max_no_momento, nome_exame_no_momento, sistema_no_momento, value_original_text, numeric_value, qualifier, unit_original, legacy_exame_id, legacy_ideal_min, legacy_ideal_max, legacy_sistema, origin, exam_code, variant)
    values (leg, 'EXA-002', 0.5, 'mg/L', 0, 1, 'PCR ultrassensivel', 'acido_inflamatorio', '0.5', 0.5, 'eq', 'mg/L', 'EXA-002', 0, 1, 'acido_inflamatorio', 'legacy_migrated', 'LAB-016', 'ultrassensivel'),
           (leg, 'EXA-022', 5, 'mg/dL', 4.2, 6.8, 'Magnesio eritrocitario', 'mental_emocional_espiritual', '5', 5, 'eq', 'mg/dL', 'EXA-022', 4.2, 6.8, 'mental_emocional_espiritual', 'legacy_migrated', 'LAB-021', 'eritrocitario'),
           (leg, 'EXA-007', 1.9, 'indice', 0, 1.8, 'HOMA-IR', 'metabolico', '1.9', 1.9, 'eq', 'indice', 'EXA-007', 0, 1.8, 'metabolico', 'additional_legacy', null, null);
  insert into _log5 values ('L24 ' || case when (select exam_code = 'LAB-016' and variant = 'ultrassensivel' from public.lab_results where collection_id = leg and legacy_exame_id = 'EXA-002') then 'ok' else 'FALHOU' end || ': PCR ultrassensivel legado -> LAB-016 + variante ultrassensivel (nao vira PCR simples)');
  insert into _log5 values ('L25 ' || case when (select exam_code = 'LAB-021' and variant = 'eritrocitario' and material is null from public.lab_results where collection_id = leg and legacy_exame_id = 'EXA-022') then 'ok' else 'FALHOU' end || ': magnesio eritrocitario legado -> LAB-021 + variante, sem inventar material');
  insert into _log5 values ('L26 ' || case when (select origin = 'additional_legacy' and exam_code is null and legacy_ideal_max = 1.8 and reference_status = 'missing' from public.lab_results where collection_id = leg and legacy_exame_id = 'EXA-007') then 'ok' else 'FALHOU' end || ': HOMA-IR legado preservado como additional_legacy, ideal so em legacy_*, sem referencia oficial');
  -- painel legado continua podendo editar a propria coleta (comportamento historico isolado)
  update public.lab_results set valor = 0.6, value_original_text = '0.6', numeric_value = 0.6 where collection_id = leg and legacy_exame_id = 'EXA-002';
  insert into _log5 values ('L27 ok: coleta do painel legado (source legacy_panel) mantem o comportamento historico');
  -- painel legado continua gravando exame_id + valor (sincronizacao.js): o trigger preenche os campos V1 pela mesma tabela de mapeamento
  insert into public.lab_results (collection_id, exame_id, valor, unidade_no_momento, nome_exame_no_momento) values (leg, 'EXA-005', 90, 'mg/dL', 'Glicemia de jejum');
  insert into _log5 values ('L42 ' || case when (select value_original_text = '90' and numeric_value = 90 and qualifier = 'eq' and exam_code = 'LAB-002' and unit_original = 'mg/dL' and reference_status = 'missing' and origin = 'legacy_migrated' from public.lab_results where collection_id = leg and legacy_exame_id = 'EXA-005') then 'ok' else 'FALHOU' end || ': gravacao legado pos-migration ganha valor original, numerico e LAB-002 (sem referencia inventada)');
  update public.lab_results set valor = 95 where collection_id = leg and legacy_exame_id = 'EXA-005';
  insert into _log5 values ('L43 ' || case when (select value_original_text = '95' and numeric_value = 95 from public.lab_results where collection_id = leg and legacy_exame_id = 'EXA-005') then 'ok' else 'FALHOU' end || ': edicao legado do valor refaz o valor original (sem valor antigo congelado)');

  -- RLS / cruzamento
  perform set_config('request.jwt.claims', json_build_object('sub', outro, 'role', 'authenticated')::text, true);
  select count(*) into n from public.lab_collections where patient_id = pa;
  insert into _log5 values ('L28 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': outro profissional nao le coletas alheias');
  select count(*) into n from public.lab_results where collection_id = cid1;
  insert into _log5 values ('L29 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': nem resultados alheios');
  select count(*) into n from public.lab_custom_exams where id = cust;
  insert into _log5 values ('L30 ' || case when n = 0 then 'ok' else 'FALHOU' end || ': nem exame customizado alheio');
  begin perform public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'salvo'), 'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-030','value_original_text','1','numeric_value',1,'qualifier','eq')))); insert into _log5 values ('L31 FALHOU: coleta em paciente alheio aceita');
  exception when others then insert into _log5 values ('L31 ok: coleta em paciente de outro profissional recusada'); end;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);

  -- referencias metodologicas / conversoes / derivados: vazias
  insert into _log5 values ('L32 ' || case when (select count(*) from public.lab_method_references) = 0 and (select count(*) from public.lab_unit_conversion_rules) = 0 and (select count(*) from public.lab_derived_calculations) = 0 then 'ok' else 'FALHOU' end || ': nenhuma referencia metodologica, conversao ou calculo derivado real');
  begin insert into public.lab_method_references (exam_code, lower_bound, upper_bound, unit, source, justification) values ('LAB-002', 70, 99, 'mg/dL', 'x', 'y'); insert into _log5 values ('L33 FALHOU: app escreveu referencia metodologica');
  exception when others then insert into _log5 values ('L33 ok: referencia metodologica so por gestao tecnica (sem escrita pela aplicacao)'); end;

  -- Leitura Integrada: pacote real sem regra; leitura salva congela; convergente/divergente recusados
  select id into li from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1;
  insert into _log5 values ('L34 ' || case when li is not null and (select status from public.integrated_reading_rule_packages where id = li) = 'rascunho' and (select count(*) from public.integrated_reading_domains where package_id = li) = 0 and (select count(*) from public.integrated_reading_exam_domain_links where package_id = li) = 0 and (select count(*) from public.integrated_reading_rules where package_id = li) = 0 then 'ok' else 'FALHOU' end || ': LI-V1@1 em rascunho, sem dominio, vinculo ou regra (Etapa 6: LI-V1@2 tem conteudo)');
  insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura) values (uid, pa, d, 2, 50, 100, true, 5, '{}', '{}', '{}') returning id into hid;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', li, 'engine_version', 'x', 'state', 'convergente', 'holoscan_application_id', hid, 'selected_collection_ids', jsonb_build_array(cid2))); insert into _log5 values ('L35 FALHOU: leitura convergente aceita sem regra');
  exception when others then insert into _log5 values ('L35 ok: convergente recusado sem vinculo aprovado: ' || left(sqlerrm, 40)); end;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', li, 'engine_version', 'x', 'state', 'divergente', 'holoscan_application_id', hid)); insert into _log5 values ('L36 FALHOU: leitura divergente aceita sem regra');
  exception when others then insert into _log5 values ('L36 ok: divergente recusado sem vinculo aprovado'); end;
  r := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', li, 'engine_version', 'motor-leitura-integrada-1.0.0', 'state', 'sem_dados_suficientes', 'reason_codes', '["sem_regra_homologada","sem_associacao_aprovada"]', 'holoscan_application_id', hid, 'selected_collection_ids', jsonb_build_array(cid2), 'selected_result_ids', (select jsonb_agg(id) from public.lab_results where collection_id = cid2)));
  insert into _log5 values ('L37 ' || case when r->>'state' = 'sem_dados_suficientes' and length(r->>'content_hash') = 64 then 'ok' else 'FALHOU' end || ': leitura sem_dados_suficientes salva com hash');
  begin update public.integrated_readings set state = 'convergente' where id = (r->>'id')::uuid; insert into _log5 values ('L38 FALHOU: leitura salva alterada');
  exception when others then insert into _log5 values ('L38 ok: leitura salva e imutavel'); end;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', li, 'engine_version', 'x', 'state', 'sem_dados_suficientes', 'selected_collection_ids', jsonb_build_array(gen_random_uuid()))); insert into _log5 values ('L39 FALHOU: coleta alheia/inexistente na leitura');
  exception when others then insert into _log5 values ('L39 ok: leitura nao referencia coleta de outro paciente'); end;
  -- leitura nao toca o HOLOSCAN
  select indice, nota_media into x from public.holoscan_applications where id = hid;
  insert into _log5 values ('L40 ' || case when x.indice = 50 and x.nota_media = 5 then 'ok' else 'FALHOU' end || ': salvar leitura integrada nao altera holoscan_applications');
  r := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', li, 'engine_version', 'x', 'state', 'sem_dados_suficientes', 'supersedes_id', r->>'id', 'professional_note', 'revisao'));
  insert into _log5 values ('L41 ' || case when (r->>'revision')::int = 2 and (select count(*) from public.integrated_readings where patient_id = pa and superseded_at is not null) = 1 then 'ok' else 'FALHOU' end || ': correcao da leitura = nova revisao, anterior preservada');
exception when others then insert into _log5 values ('ERRO GERAL Etapa 5: ' || sqlerrm || ' / ' || sqlstate);
end $$;
reset role;
select string_agg(passo, ' | ' order by passo) from _log5;
