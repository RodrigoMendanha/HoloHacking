-- =====================================================================
-- RESET DOS DADOS DE TESTE (pacientes e tudo ligado a eles)
-- Rodar inteiro no SQL Editor do Supabase. IRREVERSIVEL depois do COMMIT.
--
-- APAGA: pacientes, consultas, atendimentos, HOLOSCAN (respostas e
--   pontuacoes), ferramentas, coletas e resultados de exames, Leituras
--   Integradas, anamneses, condutas, acordos, relatorios, documentos
--   (so os registros; os arquivos ficam no Storage, ver abaixo) e
--   conversas de IA.
-- MANTEM: contas e perfil, assinatura/marca (professional_assets),
--   bloqueios de agenda, exames personalizados, pacotes metodologicos
--   (HOLOS-V1@2), aprovacoes, aprovadores, catalogo laboratorial e
--   pacotes/regras da Leitura Integrada.
--
-- Por que TRUNCATE e nao DELETE: as protecoes de imutabilidade
-- (coleta consolidada, resultado consolidado, leitura integrada) sao
-- gatilhos de DELETE por linha e recusam apagar registros fechados.
-- TRUNCATE nao passa por eles. Sem CASCADE de proposito: se alguma
-- tabela que aponta para estas ficar de fora, o Postgres recusa e
-- nada e apagado.
-- =====================================================================

begin;

truncate table
  public.ai_messages,
  public.ai_threads,
  public.integrated_readings,
  public.holoscan_answers,
  public.holoscan_system_scores,
  public.holoscan_applications,
  public.lab_result_components,
  public.lab_results,
  public.lab_collections,
  public.tool_applications,
  public.report_emissions,
  public.agreements,
  public.conducts,
  public.anamneses,
  public.documents,
  public.encounters,
  public.consultations,
  public.patients;

commit;

-- POSTFLIGHT: tudo do paciente deve dar 0; a metodologia continua igual.
select 'patients' as tabela, count(*) as linhas from public.patients
union all select 'consultations', count(*) from public.consultations
union all select 'encounters', count(*) from public.encounters
union all select 'holoscan_applications', count(*) from public.holoscan_applications
union all select 'holoscan_answers', count(*) from public.holoscan_answers
union all select 'tool_applications', count(*) from public.tool_applications
union all select 'lab_collections', count(*) from public.lab_collections
union all select 'lab_results', count(*) from public.lab_results
union all select 'integrated_readings', count(*) from public.integrated_readings
union all select 'documents', count(*) from public.documents
union all select '(mantido) methodology_packages', count(*) from public.methodology_packages
union all select '(mantido) methodology_package_approvals', count(*) from public.methodology_package_approvals
union all select '(mantido) integrated_reading_rule_packages', count(*) from public.integrated_reading_rule_packages
union all select '(mantido) lab_exam_catalog', count(*) from public.lab_exam_catalog
union all select '(mantido) profiles', count(*) from public.profiles;
