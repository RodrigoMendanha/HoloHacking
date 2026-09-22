-- ============================================================================
-- FASE 2E FIX — indices para FK compostas sem cobertura
-- ============================================================================
--
-- O advisor de performance reportou 6 FK compostas sem indice de cobertura.
-- Sem estes indices, DELETE/UPDATE na tabela pai (patients, consultations)
-- precisa de sequential scan na filha para verificar a FK.
--
-- Cada indice cobre a FK composta (patient_id, nutritionist_id) ou
-- (consultation_id, patient_id, nutritionist_id), na ordem das colunas da FK.
--
-- Os indices _nutritionist_id_idx ja existentes NAO cobrem a FK composta
-- porque a FK comeca por patient_id (ou consultation_id).
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================

-- consultations: FK (patient_id, nutritionist_id) → patients
create index if not exists consultations_patient_nutritionist_idx
  on public.consultations (patient_id, nutritionist_id);

-- documents: FK (patient_id, nutritionist_id) → patients
create index if not exists documents_patient_nutritionist_idx
  on public.documents (patient_id, nutritionist_id);

-- holoscope_applications: FK (patient_id, nutritionist_id) → patients
create index if not exists holoscope_applications_patient_nutritionist_idx
  on public.holoscope_applications (patient_id, nutritionist_id);

-- lab_collections: FK (patient_id, nutritionist_id) → patients
create index if not exists lab_collections_patient_nutritionist_idx
  on public.lab_collections (patient_id, nutritionist_id);

-- tool_applications: FK (patient_id, nutritionist_id) → patients
create index if not exists tool_applications_patient_nutritionist_idx
  on public.tool_applications (patient_id, nutritionist_id);

-- tool_applications: FK (consultation_id, patient_id, nutritionist_id) → consultations
create index if not exists tool_applications_consultation_patient_nutritionist_idx
  on public.tool_applications (consultation_id, patient_id, nutritionist_id);
