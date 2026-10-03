-- SEED SINTETICO de dados LEGADOS (schema pre-Etapa 0..5) para a validacao LOCAL da cadeia (scripts/validar-cadeia-local.sh).
-- Roda DENTRO da transacao, ANTES das migrations pendentes; desaparece no ROLLBACK. Nunca usar no banco real.
-- Reproduz o que existe em producao antes da cadeia: pacientes (um arquivado), consulta, aplicacao HOLOSCAN com scores
-- (inclusive o artefato legado nota 10 / avaliavel=false), coletas e resultados laboratoriais legados (exame_id + valor).
do $$
declare u uuid := gen_random_uuid(); p1 uuid; p2 uuid; c1 uuid; c2 uuid; c3 uuid; a uuid;
begin
  insert into auth.users (id, email) values (u, 'legado-seed@teste.invalid');
  insert into public.patients (nutritionist_id, nome, status) values (u, 'LEGADO SEED ATIVO', 'ativo') returning id into p1;
  insert into public.patients (nutritionist_id, nome, status) values (u, 'LEGADO SEED ARQUIVADO', 'inativo') returning id into p2;
  insert into public.consultations (nutritionist_id, patient_id, data, hora, duracao_min, tipo) values (u, p1, '2026-02-10', '09:00', 50, 'retorno');
  insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura, combinacoes, aprofundamentos)
    values (u, p1, '2026-02-10', 2, 55, 100, true, 6.1, '{"a":10}'::jsonb, '{"a":false}'::jsonb, '{"respondidos":60,"total":84}'::jsonb, '[]'::jsonb, '[]'::jsonb) returning id into a;
  insert into public.holoscan_system_scores (application_id, sistema, nome, nota, carga, faixa, obtido, maximo, respondidos, total_marcadores, avaliavel) values
    (a, 'fungico', 'Fungico', 6.5, 3.5, 'medio', 21, 60, 12, 12, true),
    (a, 'metabolico', 'Metabolico', 10, 0, 'alto', 0, 60, 0, 12, false);   -- artefato legado: sem resposta gravado como 10 (migration 130000 so protege linhas novas)
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, laboratorio) values (u, p1, '2026-02-05', false, 'Lab Seed') returning id into c1;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, laboratorio) values (u, p1, '2026-01-05', false, 'Lab Seed') returning id into c2;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, laboratorio) values (u, p2, '2025-12-05', false, 'Lab Seed') returning id into c3;   -- paciente ARQUIVADO com resultados legados
  insert into public.lab_results (collection_id, exame_id, valor, unidade_no_momento, ideal_min_no_momento, ideal_max_no_momento, nome_exame_no_momento, sistema_no_momento) values
    (c1, 'EXA-002', 1.8, 'mg/L', 0, 1, 'PCR ultrassensivel', 'acido_inflamatorio'),    -- mapeavel: LAB-016 / ultrassensivel
    (c1, 'EXA-009', 150, 'mg/dL', 0, 150, 'Triglicerideos', 'metabolico'),            -- mapeavel: LAB-005
    (c1, 'EXA-006', 12, 'uUI/mL', 2, 10, 'Insulina de jejum', 'metabolico'),          -- EXA-006: mapeamento MANUAL
    (c1, 'EXA-001', 1.2, 'indice', 0, 0.9, 'Candida albicans IgG', 'fungico'),        -- additional_legacy
    (c1, 'EXA-099', 7, 'u', 1, 9, 'Exame legado desconhecido', 'detox_linfatico'),    -- legado SEM mapeamento provado
    (c2, 'EXA-002', 0.4, 'mg/L', 0, 1, 'PCR ultrassensivel', 'acido_inflamatorio'),    -- mesmo exame em outra coleta (unique por coleta)
    (c3, 'EXA-009', 210, 'mg/dL', 0, 150, 'Triglicerideos', 'metabolico');            -- resultado legado de paciente ARQUIVADO
  insert into public.tool_applications (nutritionist_id, patient_id, ferramenta_id, versao_ferramenta, status, respostas) values (u, p1, 'oq3', '1', 'concluida', '{}'::jsonb);
  insert into public.documents (nutritionist_id, patient_id, nome, tipo, mime_type, storage_path) values (u, p1, 'laudo-seed.pdf', 'exame', 'application/pdf', 'seed/laudo-seed.pdf');
end $$;
