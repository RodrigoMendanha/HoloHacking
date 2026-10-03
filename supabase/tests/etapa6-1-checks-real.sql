-- ETAPA 6.1 — checagens do dry-run no banco REAL (rodam DENTRO de BEGIN ... ROLLBACK, depois das 14 migrations pendentes).
-- Dados sinteticos (auth.users/approvers/paciente/pacote/coleta/leitura) existem SO dentro da transacao e desaparecem no ROLLBACK.
-- Nenhum dado real e alterado; aplicacoes historicas so sao CONTADAS. Nunca executar fora de scripts/validar-cadeia-real-dry-run.sh.
create temp table _r(k text, ok boolean, d text) on commit drop;
create temp table _v(k text primary key, v text) on commit drop;
grant select, insert on _r to authenticated; grant select on _v to authenticated;
create or replace function pg_temp.como(p uuid) returns void language sql as $$ select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true) $$;
grant execute on all functions in schema pg_temp to authenticated;
do $e61$
declare pk uuid; h text; v jsonb; r record; n int; n2 int; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  pid uuid; mp uuid; app uuid; app2 uuid; cid uuid; rid uuid; rid2 uuid; j jsonb; txt text; falta text := '';
  esperado text := 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9';
begin
  -- A. schema pos-migrations
  for txt in select unnest(array['methodology_packages','methodology_approvers','methodology_package_approvals','integrated_reading_rule_packages','integrated_reading_domains','integrated_reading_exam_domain_links','integrated_reading_rules','integrated_readings','integrated_reading_package_approvals','lab_exam_catalog','consultations']) loop
    if to_regclass('public.' || txt) is null then falta := falta || txt || ' '; end if;
  end loop;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r';
  select count(*) into n2 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public';
  insert into _r values ('A1 tabelas/funcoes esperadas existem', falta = '', 'tabelas=' || n || ' funcoes=' || n2 || case when falta <> '' then ' FALTAM: ' || falta else '' end);
  select string_agg(c.relname, ',') into txt from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  insert into _r values ('A2 RLS ativo em todas as tabelas public', txt is null, coalesce('SEM RLS: ' || txt, 'todas com RLS'));
  select count(*) into n from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public';
  select count(*) into n2 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and not t.tgisinternal;
  insert into _r values ('A3 policies/triggers', n > 49 and n2 > 12, 'policies=' || n || ' triggers=' || n2);
  falta := '';
  for txt in select unnest(array['salvar_holoscan_completo','salvar_coleta_laboratorial','revisar_coleta_laboratorial','lab_gravar_resultados','salvar_leitura_integrada','registrar_aprovacao_li','homologar_pacote_li','li_hash_conteudo','li_conteudo_canonico','li_validar_completude','li_invalidar_aprovacoes','aprovador_autorizado','registrar_aprovacao_metodologica','proteger_proveniencia_holoscan']) loop
    if not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = txt) then falta := falta || txt || ' '; end if;
  end loop;
  insert into _r values ('A4 RPCs/funcoes esperadas existem', falta = '', coalesce(nullif('FALTAM: ' || falta, 'FALTAM: '), 'todas'));
  falta := '';
  for txt in select unnest(array['salvar_holoscan_completo(jsonb)','salvar_coleta_laboratorial(jsonb)','salvar_leitura_integrada(jsonb)','registrar_aprovacao_li(uuid,integer,text,integer,text,text)','homologar_pacote_li(uuid,integer,text,text)','registrar_aprovacao_metodologica(uuid,integer,text,text,text)']) loop
    if has_function_privilege('anon', 'public.' || txt, 'execute') then falta := falta || txt || ' '; end if;
  end loop;
  insert into _r values ('A5 anon sem EXECUTE nas RPCs mutaveis', falta = '', coalesce(nullif('ANON EXECUTA: ' || falta, 'ANON EXECUTA: '), 'anon sem execute'));
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute 'select count(*) from supabase_migrations.schema_migrations' into n;
    insert into _r values ('A6 historico de migrations nao alterado pelo dry-run', n = 16, 'registros=' || n);
  else insert into _r values ('A6 historico de migrations nao alterado pelo dry-run', true, 'sem tabela de historico (ambiente local)'); end if;
  -- B. pacote LI-V1@2
  select id into pk from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2;
  h := public.li_hash_conteudo(pk);
  insert into _r values ('B1 LI-V1@2 existe em_revisao', pk is not null and (select status from public.integrated_reading_rule_packages where id = pk) = 'em_revisao', coalesce((select status from public.integrated_reading_rule_packages where id = pk), 'ausente'));
  insert into _r values ('B2 content_hash SQL real == esperado', h = esperado, 'sql=' || coalesce(h, 'null'));
  v := public.li_validar_completude(pk);
  insert into _r values ('B3 completude publicavel', (v->>'publicavel')::boolean, 'bloqueios=' || (v->>'total_bloqueios'));
  insert into _r values ('B4 LI-V1@1 historico rascunho', (select status from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1) = 'rascunho', '');
  -- C. contagens
  select count(*) into n from public.integrated_reading_domains where package_id = pk; insert into _r values ('C1 dominios = 7', n = 7, n::text);
  select count(*) into n from public.lab_exam_catalog; insert into _r values ('C2 exames base = 45', n = 45, n::text);
  select count(distinct exam_code) into n from public.integrated_reading_exam_domain_links where package_id = pk; insert into _r values ('C3 exames com dominio = 42', n = 42, n::text);
  select count(*) into n from public.lab_exam_catalog c where not exists (select 1 from public.integrated_reading_exam_domain_links l where l.package_id = pk and l.exam_code = c.code); insert into _r values ('C4 exames sem dominio = 3', n = 3, n::text);
  select count(*) into n from public.integrated_reading_exam_domain_links where package_id = pk; insert into _r values ('C5 pares exame->dominio = 47', n = 47, n::text);
  select count(*) into n from (select exam_code from public.integrated_reading_exam_domain_links where package_id = pk group by exam_code having count(*) > 1) z; insert into _r values ('C6 exames multidominio = 5', n = 5, n::text);
  select count(*) filter (where cross_source_role = 'directional'), count(*) filter (where cross_source_role = 'contextual') into n, n2 from public.integrated_reading_exam_domain_links where package_id = pk;
  insert into _r values ('C7 directional = 9 / contextual = 38', n = 9 and n2 = 38, n || '/' || n2);
  select string_agg(d.code || '=' || x.n, ' ' order by d.code) into txt from public.integrated_reading_domains d join lateral (select count(*) n from public.integrated_reading_exam_domain_links l where l.domain_id = d.id) x on true where d.package_id = pk;
  insert into _r values ('C8 D01..D07 = 7/3/5/4/4/12/12', txt = 'LI-D01=7 LI-D02=3 LI-D03=5 LI-D04=4 LI-D05=4 LI-D06=12 LI-D07=12', txt);
  -- D. regras
  select payload into j from public.integrated_reading_rules where package_id = pk and rule_type = 'temporal' and target = 'global';
  insert into _r values ('D1 LI-TEMP-01 v1 +-30 dias inclusivos', j->>'code' = 'LI-TEMP-01' and (j->>'version')::int = 1 and (j->>'max_days')::int = 30 and (j->>'inclusive')::boolean and (j->>'symmetric')::boolean, coalesce(j->>'code','?') || ' v' || coalesce(j->>'version','?') || ' max_days=' || coalesce(j->>'max_days','?'));
  select count(*) into n from public.integrated_reading_rules where package_id = pk and rule_type = 'mixed' and target in ('LI-D01','LI-D02','LI-D03','LI-D04') and (payload->>'version')::int = 2 and payload->>'indeterminate_participant_reason' = 'directional_result_indeterminate' and payload->>'mixture_reason' = 'mixed_results_indeterminate' and payload->>'indeterminate_participant_reason' <> payload->>'mixture_reason' and (payload->>'indeterminate_optional_ignored')::boolean;
  insert into _r values ('D2 mixed v2 D01-D04: directional_result_indeterminate <> mixed_results_indeterminate', n = 4, 'dominios_ok=' || n);
  select payload into j from public.integrated_reading_rules where package_id = pk and rule_type = 'reason_semantics';
  insert into _r values ('D3 reason_semantics tem ambos os codigos', (j->'codes') ? 'directional_result_indeterminate' and (j->'codes') ? 'mixed_results_indeterminate' and (j->'codes') ? 'ambiguous_reference', '');
  select payload into j from public.integrated_reading_rules where package_id = pk and rule_type = 'holoscan_direction';
  insert into _r values ('D4 holoscan_direction: HOLOS-V1>=2 aprovado, incompatible_holoscan_version', j->>'package_code' = 'HOLOS-V1' and (j->>'min_package_version')::int = 2 and j->>'incompatible_reason' = 'incompatible_holoscan_version' and j->'faixa_map'->>'baixa' = 'attention_present', '');
  -- E. proveniencia HOLOSCAN (schema + historico, somente contagens)
  insert into _r values ('E1 colunas/constraint/trigger de proveniencia', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_package_id','methodology_package_version')) = 2 and exists (select 1 from pg_constraint where conname = 'holoscan_applications_pacote_coerente') and exists (select 1 from pg_trigger where tgname = 'holoscan_applications_proveniencia'), '');
  select count(*), count(*) filter (where methodology_package_id is not null) into n, n2 from public.holoscan_applications;
  insert into _r values ('E2 aplicacoes historicas: com/sem proveniencia (somente leitura)', n2 = 0, 'total=' || n || ' com=' || n2 || ' sem=' || (n - n2));
  insert into _r values ('E3 lab_results.reference_status informed/missing/ambiguous', exists (select 1 from pg_constraint k where k.conrelid = 'public.lab_results'::regclass and pg_get_constraintdef(k.oid) like '%ambiguous%') and exists (select 1 from pg_constraint k where k.conrelid = 'public.lab_results'::regclass and k.conname like '%referencia_informada%'), '');
  select count(*) into n from public.methodology_approvers; insert into _r values ('E4 methodology_approvers vazia antes dos sinteticos', n = 0, 'registros=' || n);
  -- F. identidades e dados SINTETICOS (so nesta transacao)
  insert into auth.users (id, email) values (ua, 'e61-a@teste.invalid'), (ub, 'e61-b@teste.invalid'), (uc, 'e61-c@teste.invalid');
  insert into public.methodology_approvers (user_id, scope, approval_stage, display_name, notes) values (ua, 'integrated_reading', 1, 'Daniel', 'TEST_FIXTURE_E61'), (ub, 'integrated_reading', 2, 'Rodrigo', 'TEST_FIXTURE_E61');
  insert into public.patients (nutritionist_id, nome, status) values (ua, 'E61 SINTETICO', 'ativo') returning id into pid;
  insert into public.methodology_packages (nutritionist_id, code, version, status) values (ua, 'HOLOS-V1', 2, 'rascunho') returning id into mp;
  insert into _v values ('ua', ua::text), ('ub', ub::text), ('uc', uc::text), ('pid', pid::text), ('pk', pk::text), ('mp', mp::text), ('h', h);
  perform pg_temp.como(ua); execute 'set local role authenticated';
  -- G. HOLOSCAN: nova aplicacao com proveniencia; incoerente recusada; historica sintetica sem backfill
  app := public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pid, 'quando', '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb, 'methodology_package_id', mp, 'methodology_package_version', 2), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
  insert into _r values ('G1 nova aplicacao recebe methodology_package_id/version', (select methodology_package_id = mp and methodology_package_version = 2 from public.holoscan_applications where id = app), '');
  begin
    perform public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pid, 'quando', '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb, 'methodology_package_id', mp, 'methodology_package_version', 1), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
    insert into _r values ('G2 versao incoerente recusada', false, 'ACEITA');
  exception when others then insert into _r values ('G2 versao incoerente recusada', true, left(sqlerrm, 50)); end;
  app2 := public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pid, 'quando', '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
  execute 'reset role';
  begin
    update public.holoscan_applications set methodology_package_id = mp, methodology_package_version = 2 where id = app2;
    insert into _r values ('G3 backfill em aplicacao sem proveniencia recusado (trigger)', false, 'ACEITO');
  exception when others then insert into _r values ('G3 backfill em aplicacao sem proveniencia recusado (trigger)', true, left(sqlerrm, 50)); end;
  insert into _r values ('G4 aplicacao sem proveniencia continua nula', (select methodology_package_id is null from public.holoscan_applications where id = app2), '');
  -- H. laboratorio: referencia ambigua persistida; ambigua sem referencia recusada
  perform pg_temp.como(ua); execute 'set local role authenticated';
  j := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pid, 'clinical_date', '2026-03-12', 'state', 'salvo'), 'results', jsonb_build_array(
    jsonb_build_object('exam_code', 'LAB-016', 'value_original_text', '30', 'numeric_value', 30, 'qualifier', 'eq', 'unit_original', 'mg/L', 'report_reference_text', '10 a 20', 'report_reference_min', 10, 'report_reference_max', 20),
    jsonb_build_object('exam_code', 'LAB-018', 'value_original_text', '300', 'numeric_value', 300, 'qualifier', 'eq', 'unit_original', 'mg/dL', 'report_reference_text', '200 a 400 ou 150 a 350', 'report_reference_min', 200, 'report_reference_max', 400, 'reference_ambiguous', true))));
  cid := (j->>'id')::uuid;
  select id into rid from public.lab_results where collection_id = cid and exam_code = 'LAB-018';
  select id into rid2 from public.lab_results where collection_id = cid and exam_code = 'LAB-016';
  insert into _r values ('H1 referencia ambigua persistida com texto/limites originais', (select reference_status = 'ambiguous' and report_reference_text = '200 a 400 ou 150 a 350' and report_reference_min = 200 from public.lab_results where id = rid) and (select reference_status = 'informed' from public.lab_results where id = rid2), '');
  j := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pid, 'clinical_date', '2026-03-13', 'state', 'salvo'), 'results', jsonb_build_array(jsonb_build_object('exam_code', 'LAB-016', 'value_original_text', '30', 'numeric_value', 30, 'qualifier', 'eq', 'unit_original', 'mg/L', 'reference_ambiguous', true))));
  insert into _r values ('H2 flag ambigua SEM referencia nao fabrica status: fica missing', (select reference_status = 'missing' from public.lab_results where collection_id = (j->>'id')::uuid), coalesce((select reference_status from public.lab_results where collection_id = (j->>'id')::uuid), '?'));
  execute 'reset role';
  begin update public.lab_results set reference_status = 'ambiguous', report_reference_text = null, report_reference_min = null, report_reference_max = null where id = rid2; insert into _r values ('H3 escrita direta de ambiguous sem referencia recusada', false, 'ACEITO');
  exception when others then insert into _r values ('H3 escrita direta de ambiguous sem referencia recusada', true, left(sqlerrm, 50)); end;
  perform pg_temp.como(ua); execute 'set local role authenticated';
  -- I. governanca LI sintetica: 4 olhos, hash, invalidacao, homologacao
  begin perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'E61 sintetico'); insert into _r values ('I1 aprovacao 1 (aprovador estagio 1)', true, '');
  exception when others then insert into _r values ('I1 aprovacao 1 (aprovador estagio 1)', false, left(sqlerrm, 60)); end;
  begin perform public.registrar_aprovacao_li(pk, 2, h, 2, 'Rodrigo', 'E61 sintetico'); insert into _r values ('I2 mesmo usuario na aprovacao 2 recusado', false, 'ACEITO');
  exception when others then insert into _r values ('I2 mesmo usuario na aprovacao 2 recusado', true, left(sqlerrm, 50)); end;
  perform pg_temp.como(uc);
  begin perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'E61 sintetico'); insert into _r values ('I3 usuario sem papel recusado', false, 'ACEITO');
  exception when others then insert into _r values ('I3 usuario sem papel recusado', true, left(sqlerrm, 50)); end;
  perform pg_temp.como(ub);
  begin perform public.registrar_aprovacao_li(pk, 2, repeat('0', 64), 2, 'Rodrigo', 'E61 sintetico'); insert into _r values ('I4 hash divergente recusado', false, 'ACEITO');
  exception when others then insert into _r values ('I4 hash divergente recusado', true, left(sqlerrm, 50)); end;
  execute 'reset role';
  update public.integrated_reading_rules set payload = payload || '{"e61":true}'::jsonb where package_id = pk and rule_type = 'text';
  select count(*) into n from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null;
  insert into _r values ('I5 mudanca de conteudo invalida aprovacao', n = 0 and public.li_hash_conteudo(pk) <> h, 'ativas=' || n);
  update public.integrated_reading_rules set payload = payload - 'e61' where package_id = pk and rule_type = 'text';
  insert into _r values ('I6 conteudo restaurado volta ao hash esperado', public.li_hash_conteudo(pk) = esperado, left(public.li_hash_conteudo(pk), 12));
  perform pg_temp.como(ua); execute 'set local role authenticated';
  perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'E61 sintetico');
  perform pg_temp.como(ub);
  perform public.registrar_aprovacao_li(pk, 2, h, 2, 'Rodrigo', 'E61 sintetico');
  select count(*) into n from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null;
  insert into _r values ('I7 dupla aprovacao ativa (2 uids distintos)', n = 2, 'ativas=' || n);
  begin perform public.homologar_pacote_li(pk, 2, h, 'Rodrigo'); insert into _r values ('I8 homologacao explicita', (select status from public.integrated_reading_rule_packages where id = pk) = 'aprovado', '');
  exception when others then insert into _r values ('I8 homologacao explicita', false, left(sqlerrm, 60)); end;
  execute 'reset role';
  begin update public.integrated_reading_rules set payload = payload || '{"e61":true}'::jsonb where package_id = pk and rule_type = 'text'; insert into _r values ('I9 conteudo homologado imutavel', false, 'ACEITO');
  exception when others then insert into _r values ('I9 conteudo homologado imutavel', true, left(sqlerrm, 50)); end;
  -- J. leitura integrada: snapshot preserva ambiguous_reference; coerencia
  perform pg_temp.como(ua); execute 'set local role authenticated';
  j := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'sem_dados_suficientes', 'domain_code', 'LI-D01', 'rule_package_id', pk, 'holoscan_application_id', app, 'selected_collection_ids', jsonb_build_array(cid), 'selected_result_ids', jsonb_build_array(rid, rid2), 'reason_codes', jsonb_build_array('directional_result_indeterminate'), 'engine_version', 'motor-leitura-integrada-2.0.1',
    'snapshot', jsonb_build_object('excluded', jsonb_build_array(jsonb_build_object('result_id', rid, 'exam_code', 'LAB-018', 'reason', 'ambiguous_reference', 'reference_status', 'ambiguous', 'reference_text', '200 a 400 ou 150 a 350')), 'selected_result_ids', jsonb_build_array(rid, rid2))));
  insert into _r values ('J1 leitura salva; snapshot preserva ambiguous_reference e referencia original', (select snapshot->'excluded'->0->>'reason' = 'ambiguous_reference' and snapshot->'excluded'->0->>'reference_text' = '200 a 400 ou 150 a 350' and reason_codes ? 'directional_result_indeterminate' and state = 'sem_dados_suficientes' and domain_code = 'LI-D01' and rule_version = 2 from public.integrated_readings where id = (j->>'id')::uuid), '');
  j := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'convergente', 'domain_code', 'LI-D01', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'rule_package_id', pk, 'holoscan_application_id', app, 'selected_collection_ids', jsonb_build_array(cid), 'selected_result_ids', jsonb_build_array(rid2), 'engine_version', 'motor-leitura-integrada-2.0.1'));
  insert into _r values ('J2 leitura convergente aceita com pacote homologado', (j->>'state') = 'convergente', '');
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'divergente', 'domain_code', 'LI-D01', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'rule_package_id', pk, 'engine_version', 'x'));
    insert into _r values ('J3 estado incoerente recusado', false, 'ACEITO');
  exception when others then insert into _r values ('J3 estado incoerente recusado', true, left(sqlerrm, 50)); end;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'convergente', 'domain_code', 'LI-D05', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'rule_package_id', pk, 'engine_version', 'x'));
    insert into _r values ('J4 D05 sem confronto recusado', false, 'ACEITO');
  exception when others then insert into _r values ('J4 D05 sem confronto recusado', true, left(sqlerrm, 50)); end;
  -- K. RLS: usuario comum sem papel
  perform pg_temp.como(uc);
  select count(*) into n from public.patients; select count(*) into n2 from public.integrated_readings;
  insert into _r values ('K1 usuario comum nao ve pacientes/leituras de outros', n = 0 and n2 = 0, 'patients=' || n || ' leituras=' || n2);
  begin insert into public.methodology_approvers (user_id, scope, approval_stage, display_name) values (uc, 'integrated_reading', 1, 'Daniel'); insert into _r values ('K2 usuario comum nao grava methodology_approvers', false, 'ACEITO');
  exception when others then insert into _r values ('K2 usuario comum nao grava methodology_approvers', true, left(sqlerrm, 50)); end;
  begin select count(*) into n from public.methodology_approvers; insert into _r values ('K3 usuario comum nao le aprovadores', n = 0, 'linhas=' || n);
  exception when others then insert into _r values ('K3 usuario comum nao le aprovadores', true, left(sqlerrm, 40)); end;
  begin update public.integrated_reading_rule_packages set status = 'em_revisao' where id = pk; get diagnostics n = row_count; insert into _r values ('K4 usuario comum nao altera pacote LI', n = 0, 'linhas=' || n);
  exception when others then insert into _r values ('K4 usuario comum nao altera pacote LI', true, left(sqlerrm, 40)); end;
  execute 'reset role';
end $e61$;
select json_agg(json_build_object('k', k, 'ok', ok, 'd', d) order by k) as relatorio from _r;
