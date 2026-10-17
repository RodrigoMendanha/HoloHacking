-- Harness PRONTUARIO (migration 20261011100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration (e de prontuario-pre.sql, antes dela). Dados ficticios; nada persiste.
reset role;
create or replace function pg_temp.pt_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- P00 — a migration nao mexeu em nenhum dado existente
insert into _logpt select 'P00 ' || case when (select v from _pt where k = 'pre') = pg_temp.pt_digitais()::text then 'ok' else 'FALHOU' end
  || ': historico intacto (coletas, resultados, componentes, Leituras Integradas e pacotes LI, relatorios, documentos, arquivos, condutas, anamneses, HOLOSCAN, ferramentas, Resultado HOLOS, metodologia)';
insert into _logpt select 'P01 ' || case when (select count(*) from public.methodology_questions q join public.methodology_packages p on p.id = q.package_id
    where p.id = (select v::uuid from _ho where k = 'mp')) = 84 then 'ok' else 'FALHOU' end || ': o pacote vigente continua com 84 perguntas';

-- fixtures do harness: um paciente com coleta e documento ANTIGOS (antes do bloqueio, como no banco real)
reset role;
do $$
declare uid uuid := (select v::uuid from _aprov where k = 'daniel'); p uuid; e uuid; c uuid; d uuid;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'PT TESTE FICTICIO 2') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e;
  insert into public.documents (nutritionist_id, patient_id, nome, tipo, data_documento, mime_type, tamanho_bytes, storage_path)
    values (uid, p, 'laudo.pdf', 'Exame laboratorial', current_date - 3, 'application/pdf', 1234, uid || '/' || p || '/1_laudo.pdf') returning id into d;
  insert into storage.objects (bucket_id, name, owner) values ('patient-documents', uid || '/' || p || '/1_laudo.pdf', uid);
  insert into storage.objects (bucket_id, name, owner) values ('patient-documents', uid || '/' || p || '/2_orfao.pdf', uid);
  insert into _pt values ('p2', p::text), ('e2', e::text), ('d2', d::text);
  select id into c from public.lab_collections limit 1;
  insert into _pt values ('c_qualquer', coalesce(c::text, ''));
end $$;

-- o stub local nao da ao papel authenticated o acesso ao schema storage que o Supabase da
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
set local role authenticated;
select pg_temp.como_daniel();

-- P02..P05 — gravacao nova de exame estruturado recusada (RPCs antigas e escrita direta)
insert into _logpt select 'P02 ' || case when pg_temp.pt_tenta(format('select public.salvar_coleta_laboratorial(%L::jsonb)',
    jsonb_build_object('patient_id', (select v from _pt where k = 'p2'), 'clinical_date', current_date, 'state', 'salvo',
      'results', jsonb_build_array(jsonb_build_object('exam_code', 'LAB-002', 'value_original_text', '5')))::text)) = 'laboratorio_desativado'
  then 'ok' else 'FALHOU' end || ': salvar_coleta_laboratorial recusa (laboratorio_desativado)';
insert into _logpt select 'P03 ' || case when pg_temp.pt_tenta(format('select public.salvar_coleta_exames(%L::jsonb)',
    jsonb_build_object('patient_id', (select v from _pt where k = 'p2'), 'coletado_em', current_date, 'resultados', '[]'::jsonb)::text)) = 'laboratorio_desativado'
  and pg_temp.pt_tenta('select public.revisar_coleta_laboratorial(''{}''::jsonb)') = 'laboratorio_desativado'
  and pg_temp.pt_tenta(format('select public.marcar_coleta_revisada(%L::uuid, ''x'')', coalesce(nullif((select v from _pt where k = 'c_qualquer'), ''), gen_random_uuid()::text))) = 'laboratorio_desativado'
  then 'ok' else 'FALHOU' end || ': salvar_coleta_exames, revisar_coleta_laboratorial e marcar_coleta_revisada recusam';
insert into _logpt select 'P04 ' || case when pg_temp.pt_tenta(format('insert into public.lab_collections (patient_id, coletado_em) values (%L, current_date)', (select v from _pt where k = 'p2'))) like '42501:%'
  and pg_temp.pt_tenta('update public.lab_collections set observacao = ''x''') like '42501:%'
  and pg_temp.pt_tenta('delete from public.lab_collections') like '42501:%'
  and pg_temp.pt_tenta('delete from public.lab_results') like '42501:%'
  and pg_temp.pt_tenta('update public.lab_result_components set position = 0') like '42501:%'
  and pg_temp.pt_tenta('insert into public.lab_custom_exams (name) values (''x'')') like '42501:%'
  then 'ok' else 'FALHOU' end || ': a API nao grava, altera nem apaga coleta, resultado, componente nem exame personalizado';
insert into _logpt select 'P05 ' || case when pg_temp.pt_tenta('select count(*) from public.lab_collections') = 'ACEITO'
  and pg_temp.pt_tenta('select count(*) from public.lab_results') = 'ACEITO'
  and pg_temp.pt_tenta('select count(*) from public.integrated_readings') = 'ACEITO'
  then 'ok' else 'FALHOU' end || ': o historico continua legivel pelo dono (so leitura)';

-- P06 — Leitura Integrada nova recusada
insert into _logpt select 'P06 ' || case when pg_temp.pt_tenta(format('select public.salvar_leitura_integrada(%L::jsonb)',
    jsonb_build_object('patient_id', (select v from _pt where k = 'p2'), 'state', 'sem_dados_suficientes', 'responsible', 'x')::text)) = 'li_desativada'
  then 'ok' else 'FALHOU' end || ': salvar_leitura_integrada recusa (li_desativada), inclusive sem_dados_suficientes';

-- P07..P11 — documentos: novo com titulo/observacao, nao apaga, arquiva, arquivo imutavel
do $$
declare uid uuid := auth.uid(); p uuid := (select v::uuid from _pt where k = 'p2'); d uuid; r record;
begin
  insert into public.documents (patient_id, nome, titulo, tipo, data_documento, observacao, mime_type, tamanho_bytes, storage_path, arquivado_em, arquivado_por)
    values (p, 'receita.pdf', 'Receita da dermatologista', 'Receita', current_date - 1, 'trouxe na consulta', 'application/pdf', 10,
            uid || '/' || p || '/3_receita.pdf', now() - interval '1 day', gen_random_uuid()) returning id into d;
  select * into r from public.documents where id = d;
  insert into _pt values ('d3', d::text);
  insert into _logpt values ('P07 ' || case when r.titulo = 'Receita da dermatologista' and r.observacao = 'trouxe na consulta' and r.tipo = 'Receita'
    and r.nutritionist_id = uid and r.arquivado_em is null and r.arquivado_por is null then 'ok' else 'FALHOU' end
    || ': documento novo guarda titulo, tipo, data e observacao; nasce ativo (arquivado_em do payload e ignorado)');
end $$;
insert into _logpt select 'P08 ' || case when pg_temp.pt_tenta(format('delete from public.documents where id = %L', (select v from _pt where k = 'd2'))) like '42501:%'
  and (select count(*) from public.documents where id = (select v::uuid from _pt where k = 'd2')) = 1
  then 'ok' else 'FALHOU' end || ': documento nao e apagado pela API (a linha continua)';
reset role;
insert into _logpt select 'P09 ' || case when pg_temp.pt_tenta(format('delete from public.documents where id = %L', (select v from _pt where k = 'd2'))) = 'documento_nao_apaga'
  then 'ok' else 'FALHOU' end || ': nem o dono do banco apaga documento (gatilho documento_nao_apaga)';
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare d uuid := (select v::uuid from _pt where k = 'd2'); r record; n int;
begin
  update public.documents set arquivado_em = '2000-01-01', arquivado_por = gen_random_uuid(), titulo = 'Hemograma de setembro' where id = d;
  get diagnostics n = row_count;
  select * into r from public.documents where id = d;
  insert into _logpt values ('P10 ' || case when n = 1 and r.arquivado_em > now() - interval '1 minute' and r.arquivado_por = auth.uid()
    and r.titulo = 'Hemograma de setembro' and r.storage_path like '%/1_laudo.pdf' then 'ok' else 'FALHOU' end
    || ': arquivar grava quando e quem (do servidor) e o registro continua com o mesmo arquivo');
end $$;
insert into _logpt select 'P11 ' || case when pg_temp.pt_tenta(format('update public.documents set storage_path = ''x/y/z.pdf'' where id = %L', (select v from _pt where k = 'd2'))) = 'documento_imutavel'
  and pg_temp.pt_tenta(format('update public.documents set patient_id = %L where id = %L', (select v from _rh where k = 'pa'), (select v from _pt where k = 'd2'))) = 'documento_imutavel'
  then 'ok' else 'FALHOU' end || ': o arquivo e o paciente do documento nao mudam';
do $$
declare n int; m int;
begin
  delete from storage.objects where bucket_id = 'patient-documents' and name like '%/1_laudo.pdf';
  get diagnostics n = row_count;
  delete from storage.objects where bucket_id = 'patient-documents' and name like '%/2_orfao.pdf';
  get diagnostics m = row_count;
  insert into _logpt values ('P12 ' || case when n = 0 and m = 1 then 'ok' else 'FALHOU (' || n || ',' || m || ')' end
    || ': o arquivo de documento registrado nao sai do Storage; so o upload orfao (sem linha) pode ser limpo');
end $$;
insert into _logpt select 'P13 ' || case when not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_patient_docs_update')
  then 'ok' else 'FALHOU' end || ': arquivo do prontuario nao pode ser sobrescrito (sem politica de UPDATE no bucket)';

-- P14 — conduta sem prescricao dietetica, diagnostico nutricional e encaminhamentos
do $$
declare c1 uuid; r record; e uuid := (select v::uuid from _pt where k = 'e2');
begin
  c1 := public.salvar_conduta(jsonb_build_object('encounter_id', e, 'status', 'salvo', 'objective', 'reorganizar a rotina',
    'dietary_prescription', 'dieta 1200 kcal', 'nutrition_diagnosis', 'diag', 'referrals', 'endocrino', 'professional_guidance', 'caminhar'));
  select * into r from public.conducts where id = c1;
  insert into _pt values ('cond', c1::text);
  insert into _logpt values ('P14 ' || case when r.objective = 'reorganizar a rotina' and r.professional_guidance = 'caminhar'
    and r.dietary_prescription is null and r.nutrition_diagnosis is null and r.referrals is null then 'ok' else 'FALHOU' end
    || ': conduta nova nao guarda prescricao dietetica, diagnostico nutricional nem encaminhamentos (o resto e guardado)');
end $$;

-- P15 — relatorio novo: sem exames, documento so como contagem, conduta sem os 3 campos
do $$
declare rid uuid; c jsonb; p uuid := (select v::uuid from _pt where k = 'p2'); col uuid;
begin
  rid := public.emitir_relatorio(jsonb_build_object('patient_id', p, 'title', 'teste',
    'selected_sources', jsonb_build_object('lab_collection_ids', '[]'::jsonb, 'document_ids', jsonb_build_array((select v from _pt where k = 'd3')),
      'conduct_ids', jsonb_build_array((select v from _pt where k = 'cond')))));
  select content_snapshot into c from public.report_emissions where id = rid;
  insert into _logpt values ('P15 ' || case when c ? 'exames' = false and (c->>'exames_incluidos') = 'false' and c ? 'documentos' = false
    and (c->>'documentos_armazenados')::int = 1
    and not (c->'condutas'->0 ? 'dietary_prescription') and not (c->'condutas'->0 ? 'nutrition_diagnosis') and not (c->'condutas'->0 ? 'referrals')
    and position('Leitura Integrada' in c::text) = 0 then 'ok' else 'FALHOU: ' || left(c::text, 300) end
    || ': relatorio novo nao leva exame, nome de documento, Leitura Integrada nem prescricao (so "1 documento armazenado")');
end $$;

-- P16 — HOLOSCAN: o mesmo payload grava exatamente o mesmo resultado de antes da migration
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); p uuid; e uuid; h uuid;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'PT TESTE FICTICIO 3') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, p, e, current_date));
  insert into _logpt values ('P16 ' || case when pg_temp.pt_holoscan(h)::text = (select v from _pt where k = 'hs_ref') then 'ok' else 'FALHOU' end
    || ': HOLOSCAN identico (notas, faixas, Indice, Triada, cobertura e respostas) para a mesma entrada');
end $$;

-- P17 — Resultado HOLOS: a mesma entrada da a mesma previa
insert into _logpt select 'P17 ' || case when public.previa_resultado_holos(jsonb_build_object('patient_id', (select v from _rh where k = 'pa'), 'encounter_id', (select v from _rh where k = 'ea'),
    'holoscan_application_id', (select v from _rh where k = 'ha'),
    'tool_application_ids', jsonb_build_array((select v from _rh where k = 't_rot'), (select v from _rh where k = 't_gat'), (select v from _rh where k = 't_con')),
    'leitura_profissional', 'texto da nutri', 'pontos_acompanhar', 'sono'))::text = (select v from _pt where k = 'rh_ref')
  then 'ok' else 'FALHOU' end || ': Resultado HOLOS identico para a mesma entrada (exames continuam fora)';

reset role;
-- P18 — o historico pre-existente continua intacto depois de tudo acima (so o que foi criado AQUI mudou)
insert into _logpt select 'P18 ' || case when (select count(*) from public.lab_collections) = (select count(*) from public.lab_collections)
  and (select v from _pt where k = 'pre')::jsonb->>'lab_results' = pg_temp.pt_digitais()->>'lab_results'
  and (select v from _pt where k = 'pre')::jsonb->>'lab_collections' = pg_temp.pt_digitais()->>'lab_collections'
  and (select v from _pt where k = 'pre')::jsonb->>'integrated_readings' = pg_temp.pt_digitais()->>'integrated_readings'
  and (select v from _pt where k = 'pre')::jsonb->>'metodologia' = pg_temp.pt_digitais()->>'metodologia'
  then 'ok' else 'FALHOU' end || ': coletas, resultados, Leituras Integradas e metodologia continuam identicos ao fim do harness';

select string_agg(passo, ' | ' order by passo) from _logpt;
