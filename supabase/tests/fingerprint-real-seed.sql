-- SEED LOCAL que reproduz o FINGERPRINT REAL pre-aplicacao da Etapa 6.2 sobre o banco "base" (stub + migrations ate 20260929192605):
-- auth_users 3, patients 5 (1 arquivado), holoscan_applications 4 (20 scores), lab_collections 3, lab_results 22 LEGADOS
-- (mapeaveis, EXA-006 manual, additional_legacy, sem mapeamento provado, paciente arquivado), + historico supabase_migrations
-- com as 16 versoes/nomes REAIS (statements placeholder local). Dados 100% sinteticos; so para teste local descartavel.
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key, statements text[], name text, created_by text, idempotency_key text unique, rollback text[]);
insert into supabase_migrations.schema_migrations (version, name, statements, created_by) values
 ('20260918181418','fase1_profiles_patients',array['-- local placeholder'],'local@teste.invalid'),
 ('20260918181457','fase1_endurecer_funcoes',array['-- local placeholder'],'local@teste.invalid'),
 ('20260918181530','fase1_otimizar_policies',array['-- local placeholder'],'local@teste.invalid'),
 ('20260921191729','fase2a_consultations_schedule_blocks_profiles',array['-- local placeholder'],'local@teste.invalid'),
 ('20260921200051','fase2b_holoscope',array['-- local placeholder'],'local@teste.invalid'),
 ('20260921202834','fase2c_lab_collections_results',array['-- local placeholder'],'local@teste.invalid'),
 ('20260921204743','fase2d_tool_applications',array['-- local placeholder'],'local@teste.invalid'),
 ('20260921210137','fase2e_documents_storage_assets',array['-- local placeholder'],'local@teste.invalid'),
 ('20260922004330','fase2e_fix_unindexed_fks',array['-- local placeholder'],'local@teste.invalid'),
 ('20260922010549','fase5_rpc_salvar_holoscope',array['-- local placeholder'],'local@teste.invalid'),
 ('20260922011936','fase6_rpc_salvar_coleta_exames',array['-- local placeholder'],'local@teste.invalid'),
 ('20260922125907','hardening_revoke_anon_grants',array['-- local placeholder'],'local@teste.invalid'),
 ('20260923232829','rename_holoscope_to_holoscan',array['-- local placeholder'],'local@teste.invalid'),
 ('20260924140359','holos_ai_threads_messages',array['-- local placeholder'],'local@teste.invalid'),
 ('20260924161619','revoke_anon_execute_security_definer',array['-- local placeholder'],'local@teste.invalid'),
 ('20260929192605','fix_rpc_record_value',array['-- local placeholder'],'local@teste.invalid');
do $$
declare u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid(); p uuid[] := '{}'; pid uuid; a uuid; c1 uuid; c2 uuid; c3 uuid; i int; sis text[] := array['fungico','acido_inflamatorio','metabolico','detox_linfatico','mental_emocional_espiritual'];
begin
  insert into auth.users (id, email) values (u1, 'fp-a@teste.invalid'), (u2, 'fp-b@teste.invalid');
  for i in 1..3 loop insert into public.patients (nutritionist_id, nome, status) values (u1, 'FP PACIENTE ' || i, 'ativo') returning id into pid; p := p || pid; end loop;
  insert into public.patients (nutritionist_id, nome, status) values (u1, 'FP ARQUIVADO', 'inativo') returning id into pid; p := p || pid;
  insert into public.consultations (nutritionist_id, patient_id, data, hora, duracao_min, tipo) values (u1, p[1], '2026-02-10', '09:00', 50, 'retorno');
  for i in 1..4 loop
    insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura, combinacoes, aprofundamentos)
      values (u1, p[((i - 1) % 3) + 1], date '2026-02-01' + i, 2, 50 + i, 100, true, 6, '{}'::jsonb, '{}'::jsonb, '{"respondidos":84,"total":84}'::jsonb, '[]'::jsonb, '[]'::jsonb) returning id into a;
    insert into public.holoscan_system_scores (application_id, sistema, nome, nota, carga, faixa, obtido, maximo, respondidos, total_marcadores, avaliavel)
      select a, s, s, case when s = 'metabolico' and i = 4 then 10 else 6.5 end, case when s = 'metabolico' and i = 4 then 0 else 3.5 end, case when s = 'metabolico' and i = 4 then 'alto' else 'medio' end, 21, 60, case when s = 'metabolico' and i = 4 then 0 else 12 end, 12, not (s = 'metabolico' and i = 4) from unnest(sis) s;
  end loop;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, laboratorio) values (u1, p[1], '2026-02-05', false, 'Lab FP') returning id into c1;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, laboratorio) values (u1, p[2], '2026-01-05', false, 'Lab FP') returning id into c2;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, laboratorio) values (u1, p[4], '2025-12-05', false, 'Lab FP') returning id into c3;   -- paciente ARQUIVADO
  insert into public.lab_results (collection_id, exame_id, valor, unidade_no_momento, ideal_min_no_momento, ideal_max_no_momento, nome_exame_no_momento, sistema_no_momento) values
    (c1,'EXA-002',1.8,'mg/L',0,1,'PCR us','acido_inflamatorio'), (c1,'EXA-004',5.2,'%',4,5.6,'HbA1c','metabolico'), (c1,'EXA-005',92,'mg/dL',70,99,'Glicemia','metabolico'),
    (c1,'EXA-006',12,'uUI/mL',2,10,'Insulina','metabolico'), (c1,'EXA-008',180,'mg/dL',0,190,'Colesterol','metabolico'), (c1,'EXA-009',150,'mg/dL',0,150,'Triglicerideos','metabolico'),
    (c1,'EXA-010',55,'mg/dL',40,80,'HDL','metabolico'), (c1,'EXA-001',1.2,'indice',0,0.9,'Candida IgG','fungico'), (c1,'EXA-099',7,'u',1,9,'Exame desconhecido','detox_linfatico'),
    (c1,'EXA-022',4.8,'mg/dL',4,6,'Magnesio eritrocitario','detox_linfatico'),
    (c2,'EXA-011',4.1,'mUI/L',0.4,4.5,'TSH','mental_emocional_espiritual'), (c2,'EXA-012',1.1,'ng/dL',0.8,1.8,'T4 livre','mental_emocional_espiritual'), (c2,'EXA-013',22,'U/L',0,40,'TGO','detox_linfatico'),
    (c2,'EXA-014',25,'U/L',0,41,'TGP','detox_linfatico'), (c2,'EXA-015',30,'U/L',0,60,'GGT','detox_linfatico'), (c2,'EXA-016',0.7,'mg/dL',0.2,1.2,'Bilirrubina','detox_linfatico'),
    (c2,'EXA-003',0.5,'indice',0,0.9,'Candida IgA','fungico'), (c2,'EXA-024',2,'u',0,1,'Exame adicional','fungico'),
    (c3,'EXA-009',210,'mg/dL',0,150,'Triglicerideos','metabolico'), (c3,'EXA-017',0.9,'mg/dL',0.6,1.2,'Creatinina','detox_linfatico'), (c3,'EXA-018',32,'mg/dL',15,45,'Ureia','detox_linfatico'), (c3,'EXA-007',3,'u',0,1,'Exame adicional 2','fungico');
end $$;
