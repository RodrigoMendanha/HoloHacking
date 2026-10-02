-- Harness ETAPA 6.0 (migration 20261002120000 — Leitura Integrada V1 executavel): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), depois de etapa5-3-harness.sql. Dados ficticios; nada persiste.
create temp table _log6 (passo text) on commit drop;
grant insert, select on _log6 to authenticated;
create temp table _li6 (k text primary key, v text) on commit drop;
grant insert, select, update on _li6 to authenticated;

-- ---------- gestao tecnica: o seed da migration (sem tocar em nada) ----------
reset role;
do $$
declare pk uuid := (select id from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2); n int; r record; v jsonb; ok boolean := true;
begin
  insert into _li6 values ('pk2', pk::text);
  insert into _log6 values ('E01 ' || case when (select status from public.integrated_reading_rule_packages where id = pk) = 'em_revisao' and (select status from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1) = 'rascunho' then 'ok' else 'FALHOU' end || ': LI-V1@2 em_revisao; LI-V1@1 segue em rascunho (historico)');
  select count(*) into n from public.integrated_reading_domains where package_id = pk;
  insert into _log6 values ('E02 ' || case when n = 7 then 'ok' else 'FALHOU' end || ': 7 dominios (' || n || ')');
  select count(*) into n from public.integrated_reading_exam_domain_links where package_id = pk;
  insert into _log6 values ('E03 ' || case when n = 47 then 'ok' else 'FALHOU' end || ': 47 vinculos (' || n || ')');
  select count(distinct exam_code) into n from public.integrated_reading_exam_domain_links where package_id = pk;
  insert into _log6 values ('E04 ' || case when n = 42 then 'ok' else 'FALHOU' end || ': 42 exames vinculados; ' || (select count(*) from public.lab_exam_catalog c where not exists (select 1 from public.integrated_reading_exam_domain_links l where l.package_id = pk and l.exam_code = c.code)) || ' sem dominio');
  select count(*) into n from (select exam_code from public.integrated_reading_exam_domain_links where package_id = pk group by exam_code having count(*) > 1) z;
  insert into _log6 values ('E05 ' || case when n = 5 then 'ok' else 'FALHOU' end || ': 5 exames multi-dominio (' || n || ')');
  for r in select d.code, count(l.id) n, count(l.id) filter (where l.cross_source_role = 'directional') nd from public.integrated_reading_domains d left join public.integrated_reading_exam_domain_links l on l.domain_id = d.id where d.package_id = pk group by d.code order by d.code loop
    if not ((r.code, r.n, r.nd) in (('LI-D01', 7, 2), ('LI-D02', 3, 3), ('LI-D03', 5, 2), ('LI-D04', 4, 2), ('LI-D05', 4, 0), ('LI-D06', 12, 0), ('LI-D07', 12, 0))) then ok := false; end if;
  end loop;
  insert into _log6 values ('E06 ' || case when ok then 'ok' else 'FALHOU' end || ': por dominio 7/3/5/4/4/12/12 e directional 2/3/2/2/0/0/0');
  insert into _log6 values ('E07 ' || case when (select count(*) from public.integrated_reading_exam_domain_links where package_id = pk and cross_source_role = 'directional') = 9 and (select count(*) from public.integrated_reading_exam_domain_links where package_id = pk and cross_source_role = 'contextual') = 38 then 'ok' else 'FALHOU' end || ': 9 directional + 38 contextual = 47');
  insert into _log6 values ('E08 ' || case when (select string_agg(code || ':' || holoscan_mapping_mode || ':' || coalesce(holoscan_system, '-'), ',' order by code) from public.integrated_reading_domains where package_id = pk) = 'LI-D01:mapped:acido_inflamatorio,LI-D02:mapped:metabolico,LI-D03:mapped:metabolico,LI-D04:mapped:detox_linfatico,LI-D05:none:-,LI-D06:none:-,LI-D07:none:-' then 'ok' else 'FALHOU' end || ': mapeamento D01 acido_inflamatorio, D02/D03 metabolico, D04 detox_linfatico, D05-D07 none');
  insert into _log6 values ('E09 ' || case when (select payload->>'max_days' = '30' and payload->>'code' = 'LI-TEMP-01' and (payload->>'inclusive')::boolean and (payload->>'symmetric')::boolean from public.integrated_reading_rules where package_id = pk and rule_type = 'temporal') then 'ok' else 'FALHOU' end || ': LI-TEMP-01 v1 ±30 inclusivo simetrico');
  insert into _log6 values ('E10 ' || case when (select payload->'faixa_map'->>'baixa' = 'attention_present' and payload->'faixa_map'->>'intermediaria' = 'indeterminate' and payload->'faixa_map'->>'alta' = 'attention_not_detected' from public.integrated_reading_rules where package_id = pk and rule_type = 'holoscan_direction') then 'ok' else 'FALHOU' end || ': regra 20/21-A de direcao HOLOSCAN');
  insert into _log6 values ('E11 ' || case when (select count(*) from public.integrated_reading_rules where package_id = pk and rule_type = 'mixed' and payload->>'mode' = 'unanimity' and payload->>'mixture_reason' = 'mixed_results_indeterminate') = 4 and (select count(*) from public.integrated_reading_rules where package_id = pk and rule_type in ('sufficiency', 'mixed') and payload->>'mode' = 'not_applicable') = 6 then 'ok' else 'FALHOU' end || ': mistos unanimidade D01-D04 (mixed_results_indeterminate); not_applicable D05-D07');
  v := public.li_validar_completude(pk);
  insert into _log6 values ('E12 ' || case when (v->>'publicavel')::boolean then 'ok' else 'FALHOU' end || ': completude publicavel (0 bloqueios) — ' || coalesce(v->>'total_bloqueios', '?'));
  insert into _li6 values ('h2', public.li_hash_conteudo(pk));
  insert into _log6 values ('E13 ' || case when public.li_hash_conteudo(pk) ~ '^[0-9a-f]{64}$' and public.li_hash_conteudo(pk) = public.li_hash_conteudo(pk) then 'ok' else 'FALHOU' end || ': hash LI-V1@2 estavel: ' || left(public.li_hash_conteudo(pk), 16));
  -- constraints novas
  begin insert into public.integrated_reading_domains (package_id, code, name, holoscan_mapping_mode, holoscan_system, status) values (pk, 'X', 'x', 'mapped', null, 'rascunho'); insert into _log6 values ('E14 FALHOU: mapped sem sistema aceito');
  exception when others then insert into _log6 values ('E14 ok: mapped exige holoscan_system: ' || left(sqlerrm, 40)); end;
  begin insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, cross_source_role, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-027', 'directional', 'rascunho'); insert into _log6 values ('E15 FALHOU: directional sem direction_rules aceito');
  exception when others then insert into _log6 values ('E15 ok: directional exige direction_rules: ' || left(sqlerrm, 40)); end;
  begin insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'pesos', 'global', '{}', 'rascunho'); insert into _log6 values ('E16 FALHOU: rule_type desconhecido aceito');
  exception when others then insert into _log6 values ('E16 ok: rule_type fora do contrato recusado'); end;
  insert into _log6 values ('E17 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pk) = 0 and (select count(*) from public.integrated_reading_package_snapshots where package_id = pk) = 0 then 'ok' else 'FALHOU' end || ': nenhuma aprovacao/snapshot de LI-V1@2 nasce da migration');
end $$;

-- ---------- aplicacao (authenticated): leitura por dominio, snapshot, barreira ----------
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); pk uuid := (select v::uuid from _li6 where k = 'pk2'); pa uuid; hid uuid; c1 jsonb; cid uuid; rid uuid; r jsonb; r2 jsonb; antes text; depois text; d date := date '2026-03-10'; n int;
begin
  insert into public.patients (nutritionist_id, nome, status) values (uid, 'E6 TESTE', 'ativo') returning id into pa;
  insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura) values (uid, pa, d, 2, 50, 100, true, 5, '{}', '{}', '{}') returning id into hid;
  c1 := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d, 'state', 'salvo'),
    'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-016','value_original_text','30','numeric_value',30,'qualifier','eq','unit_original','mg/L','report_reference_text','< 5','report_reference_max',5,'report_reference_operator','lt'))));
  cid := (c1->>'id')::uuid; select id into rid from public.lab_results where collection_id = cid;
  -- pacote em_revisao: convergente/divergente recusados; sem_dados aceito com dominio, direcoes e snapshot
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', pk, 'engine_version', 'x', 'state', 'convergente', 'domain_code', 'LI-D01', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'holoscan_application_id', hid, 'selected_collection_ids', jsonb_build_array(cid)));
    insert into _log6 values ('E18 FALHOU: convergente aceito com pacote em_revisao');
  exception when others then insert into _log6 values ('E18 ok: convergente recusado (pacote nao aprovado): ' || left(sqlerrm, 50)); end;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', pk, 'engine_version', 'x', 'state', 'sem_dados_suficientes', 'domain_code', 'LI-D05'));
    insert into _log6 values ('E19 FALHOU: leitura cross-source em D05 aceita');
  exception when others then insert into _log6 values ('E19 ok: D05 (sem confronto) nao recebe leitura cross-source: ' || left(sqlerrm, 40)); end;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', pk, 'engine_version', 'x', 'state', 'sem_dados_suficientes', 'domain_code', 'LI-D01', 'holoscan_direction', 'alto'));
    insert into _log6 values ('E20 FALHOU: direcao invalida aceita');
  exception when others then insert into _log6 values ('E20 ok: direcao fora do vocabulario recusada'); end;
  r := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pa, 'responsible', 'Prof', 'rule_package_id', pk, 'engine_version', 'motor-leitura-integrada-2.0.0', 'state', 'sem_dados_suficientes', 'domain_code', 'LI-D01',
    'holoscan_direction', 'indeterminate', 'laboratory_direction', 'attention_present', 'holoscan_application_id', hid, 'selected_collection_ids', jsonb_build_array(cid), 'selected_result_ids', jsonb_build_array(rid),
    'reason_codes', jsonb_build_array('incompatible_holoscan_version'), 'snapshot', jsonb_build_object('temporal_rule_code', 'LI-TEMP-01', 'temporal_rule_version', 1, 'collection_clinical_dates', jsonb_build_array(jsonb_build_object('id', cid, 'temporal_delta_days', 0)))));
  insert into _log6 values ('E21 ' || case when r->>'state' = 'sem_dados_suficientes' and r->>'domain_code' = 'LI-D01' and length(r->>'content_hash') = 64 then 'ok' else 'FALHOU' end || ': leitura por dominio salva (D01, sem dados, hash)');
  select snapshot::text into antes from public.integrated_readings where id = (r->>'id')::uuid;
  insert into _log6 values ('E22 ' || case when (select domain_code = 'LI-D01' and holoscan_direction = 'indeterminate' and laboratory_direction = 'attention_present' and snapshot->>'temporal_rule_code' = 'LI-TEMP-01' from public.integrated_readings where id = (r->>'id')::uuid) then 'ok' else 'FALHOU' end || ': dominio, direcoes e snapshot congelados na linha');
  -- nova coleta nao altera a leitura salva
  perform public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', d + 1, 'state', 'salvo'), 'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-016','value_original_text','1','numeric_value',1,'qualifier','eq','unit_original','mg/L'))));
  select snapshot::text into depois from public.integrated_readings where id = (r->>'id')::uuid;
  insert into _log6 values ('E23 ' || case when antes = depois and (select count(*) from public.lab_collections where patient_id = pa) = 2 then 'ok' else 'FALHOU' end || ': nova coleta nao reescreve a leitura salva');
  begin update public.integrated_readings set snapshot = '{}'::jsonb where id = (r->>'id')::uuid; insert into _log6 values ('E24 FALHOU: snapshot alterado');
  exception when others then insert into _log6 values ('E24 ok: snapshot da leitura e imutavel'); end;
  begin update public.integrated_readings set laboratory_direction = 'attention_not_detected' where id = (r->>'id')::uuid; insert into _log6 values ('E25 FALHOU: direcao alterada');
  exception when others then insert into _log6 values ('E25 ok: direcoes da leitura sao imutaveis'); end;
  -- HOLOSCAN intocado
  insert into _log6 values ('E26 ' || case when (select indice = 50 and nota_media = 5 from public.holoscan_applications where id = hid) then 'ok' else 'FALHOU' end || ': salvar leitura nao altera holoscan_applications');
  -- governanca: aprovacao exige hash atual; ninguem homologa sem as duas; conteudo imutavel apos aprovacao
  r2 := public.registrar_aprovacao_li(pk, 2, (select v from _li6 where k = 'h2'), 1, 'Daniel', 'conferido (harness local — NAO e aprovacao real)');
  insert into _log6 values ('E27 ' || case when (r2->>'etapa')::int = 1 and (r2->'completude'->>'publicavel')::boolean then 'ok' else 'FALHOU' end || ': Aprovacao 1 (fixture local) registrada sobre o hash atual; completude publicavel');
  begin perform public.homologar_pacote_li(pk, 2, (select v from _li6 where k = 'h2'), 'Daniel'); insert into _log6 values ('E28 FALHOU: homologou com uma aprovacao');
  exception when others then insert into _log6 values ('E28 ok: homologacao exige Aprovacao 1 e 2 vigentes'); end;
  insert into _log6 values ('E29 ' || case when (select status from public.integrated_reading_rule_packages where id = pk) = 'em_revisao' then 'ok' else 'FALHOU' end || ': LI-V1@2 continua em_revisao no fim do harness (nada homologado)');
end $$;
reset role;
-- alterar conteudo depois da aprovacao invalida a aprovacao (gestao tecnica)
do $$
declare pk uuid := (select v::uuid from _li6 where k = 'pk2');
begin
  update public.integrated_reading_rules set payload = payload || '{"note_harness": "x"}'::jsonb where package_id = pk and rule_type = 'text';
  insert into _log6 values ('E30 ' || case when (select count(*) from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null) = 0 and (select count(*) from public.integrated_reading_package_approvals where package_id = pk) = 1 then 'ok' else 'FALHOU' end || ': mudanca de conteudo invalida a aprovacao (historico mantido)');
end $$;
select passo from _log6 order by passo;
-- ---------- Etapa 6.0.1 (migration 20261002130000): hash recalculado; referencia ambigua; proveniencia HOLOSCAN ----------
reset role;
do $$ declare pk uuid := (select v::uuid from _li6 where k = 'pk2');
begin
  -- h2 foi capturado em E13, ANTES da mutacao de conteudo de E30 (que legitimamente muda o hash)
  insert into _log6 values ('E31 ' || case when (select v from _li6 where k = 'h2') = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9' then 'ok' else 'FALHOU' end || ': hash SQL de LI-V1@2 (seed intacto) == hash do pacote JS (6.0.1): ' || left((select v from _li6 where k = 'h2'), 12));
  insert into _log6 values ('E32 ' || case when (select count(*) from public.integrated_reading_rules where package_id = pk and rule_type = 'mixed' and payload->>'indeterminate_participant_reason' = 'directional_result_indeterminate' and (payload->>'version')::int = 2) = 4 then 'ok' else 'FALHOU' end || ': regra de mistos v2 com directional_result_indeterminate em D01-D04');
end $$;
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); pa uuid; c jsonb; cid uuid; hid uuid; mp uuid; x record;
begin
  select id into pa from public.patients where nutritionist_id = uid and nome = 'E6 TESTE';
  c := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pa, 'clinical_date', date '2026-03-12', 'state', 'salvo'),
    'results', jsonb_build_array(jsonb_build_object('exam_code','LAB-016','value_original_text','30','numeric_value',30,'qualifier','eq','unit_original','mg/L','report_reference_text','10 a 20 ou 5 a 15','report_reference_min',10,'report_reference_max',20,'reference_ambiguous',true))));
  cid := (c->>'id')::uuid;
  select reference_status, report_reference_text, report_reference_min into x from public.lab_results where collection_id = cid;
  insert into _log6 values ('E33 ' || case when x.reference_status = 'ambiguous' and x.report_reference_text = '10 a 20 ou 5 a 15' and x.report_reference_min = 10 then 'ok' else 'FALHOU' end || ': referencia ambigua persistida com o texto/limites originais');
  begin insert into public.lab_results (collection_id, exam_code, value_original_text, qualifier, reference_status) values (cid, 'LAB-018', '1', 'eq', 'ambiguous'); insert into _log6 values ('E34 FALHOU: ambiguous sem referencia aceito');
  exception when others then insert into _log6 values ('E34 ok: ambiguous exige referencia informada'); end;
  select id into mp from public.methodology_packages where nutritionist_id = uid order by created_at limit 1;
  if mp is null then insert into public.methodology_packages (nutritionist_id, code, version, status, origin, justification) values (uid, 'TEST_FIXTURE_ONLY-HP6', 1, 'rascunho', 'fixture', 'fixture') returning id into mp; end if;
  hid := public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pa, 'quando', date '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb,
    'methodology_package_id', mp, 'methodology_package_version', (select version from public.methodology_packages where id = mp)), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
  insert into _log6 values ('E35 ' || case when (select methodology_package_id = mp and methodology_package_version = (select version from public.methodology_packages where id = mp) from public.holoscan_applications where id = hid) then 'ok' else 'FALHOU' end || ': nova aplicacao HOLOSCAN recebe proveniencia declarada e validada');
  begin perform public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pa, 'quando', date '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb, 'methodology_package_id', mp, 'methodology_package_version', 99), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
    insert into _log6 values ('E36 FALHOU: versao incoerente aceita');
  exception when others then insert into _log6 values ('E36 ok: versao declarada incoerente recusada'); end;
  select id into hid from public.holoscan_applications where patient_id = pa and methodology_package_id is null limit 1;
  begin update public.holoscan_applications set methodology_package_id = mp, methodology_package_version = 1 where id = hid; insert into _log6 values ('E37 FALHOU: backfill de proveniencia aceito');
  exception when others then insert into _log6 values ('E37 ok: aplicacao historica sem proveniencia nao recebe backfill: ' || left(sqlerrm, 40)); end;
  insert into _log6 values ('E38 ' || case when (select methodology_package_id is null from public.holoscan_applications where id = hid) then 'ok' else 'FALHOU' end || ': aplicacao historica continua sem vinculo');
end $$;
reset role;
select passo from _log6 where passo >= 'E31' order by passo;
