-- ============================================================================
-- RENAME holoscope_* → holoscan_*
-- ============================================================================
--
-- Renomeia as tres tabelas, suas constraints, indices, triggers, policies e
-- a funcao de protecao de snapshot. Cria salvar_holoscan_completo como
-- substituta da salvar_holoscope_completo (mantida como wrapper temporario).
-- Migra o tipo de consulta reavaliacao_holoscope → reavaliacao_holoscan.
--
-- Nenhum dado e copiado ou recriado. ALTER ... RENAME preserva tudo.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. RENOMEAR TABELAS
-- ============================================================================

ALTER TABLE public.holoscope_applications RENAME TO holoscan_applications;
ALTER TABLE public.holoscope_answers      RENAME TO holoscan_answers;
ALTER TABLE public.holoscope_system_scores RENAME TO holoscan_system_scores;


-- ============================================================================
-- 2. RENOMEAR CONSTRAINTS
-- ============================================================================

-- holoscan_applications
ALTER TABLE public.holoscan_applications
  RENAME CONSTRAINT holoscope_applications_versao_positiva
  TO holoscan_applications_versao_positiva;

ALTER TABLE public.holoscan_applications
  RENAME CONSTRAINT holoscope_applications_indice_maximo_positivo
  TO holoscan_applications_indice_maximo_positivo;

ALTER TABLE public.holoscan_applications
  RENAME CONSTRAINT holoscope_applications_patient_nutritionist_fk
  TO holoscan_applications_patient_nutritionist_fk;

-- holoscan_answers
ALTER TABLE public.holoscan_answers
  RENAME CONSTRAINT holoscope_answers_valor_valido
  TO holoscan_answers_valor_valido;

ALTER TABLE public.holoscan_answers
  RENAME CONSTRAINT holoscope_answers_application_marcador_unique
  TO holoscan_answers_application_marcador_unique;

-- holoscan_system_scores
ALTER TABLE public.holoscan_system_scores
  RENAME CONSTRAINT holoscope_system_scores_application_sistema_unique
  TO holoscan_system_scores_application_sistema_unique;

ALTER TABLE public.holoscan_system_scores
  RENAME CONSTRAINT holoscope_system_scores_sistema_valido
  TO holoscan_system_scores_sistema_valido;

ALTER TABLE public.holoscan_system_scores
  RENAME CONSTRAINT holoscope_system_scores_faixa_valida
  TO holoscan_system_scores_faixa_valida;

ALTER TABLE public.holoscan_system_scores
  RENAME CONSTRAINT holoscope_system_scores_respondidos_valido
  TO holoscan_system_scores_respondidos_valido;

ALTER TABLE public.holoscan_system_scores
  RENAME CONSTRAINT holoscope_system_scores_total_marcadores_valido
  TO holoscan_system_scores_total_marcadores_valido;

ALTER TABLE public.holoscan_system_scores
  RENAME CONSTRAINT holoscope_system_scores_respondidos_coerente
  TO holoscan_system_scores_respondidos_coerente;


-- ============================================================================
-- 3. RENOMEAR INDICES
-- ============================================================================

ALTER INDEX IF EXISTS holoscope_applications_nutritionist_id_idx
  RENAME TO holoscan_applications_nutritionist_id_idx;

ALTER INDEX IF EXISTS holoscope_applications_patient_quando_idx
  RENAME TO holoscan_applications_patient_quando_idx;

ALTER INDEX IF EXISTS holoscope_applications_patient_nutritionist_idx
  RENAME TO holoscan_applications_patient_nutritionist_idx;


-- ============================================================================
-- 4. RENOMEAR TRIGGERS
-- ============================================================================

ALTER TRIGGER holoscope_applications_tocar_updated_at
  ON public.holoscan_applications
  RENAME TO holoscan_applications_tocar_updated_at;

ALTER TRIGGER holoscope_applications_proteger_snapshot
  ON public.holoscan_applications
  RENAME TO holoscan_applications_proteger_snapshot;


-- ============================================================================
-- 5. RENOMEAR POLICIES
-- ============================================================================

-- holoscan_applications (4 policies)
ALTER POLICY holoscope_applications_select_proprios
  ON public.holoscan_applications
  RENAME TO holoscan_applications_select_proprios;

ALTER POLICY holoscope_applications_insert_proprios
  ON public.holoscan_applications
  RENAME TO holoscan_applications_insert_proprios;

ALTER POLICY holoscope_applications_update_proprios
  ON public.holoscan_applications
  RENAME TO holoscan_applications_update_proprios;

ALTER POLICY holoscope_applications_delete_proprios
  ON public.holoscan_applications
  RENAME TO holoscan_applications_delete_proprios;

-- holoscan_answers (2 policies)
ALTER POLICY holoscope_answers_select_proprios
  ON public.holoscan_answers
  RENAME TO holoscan_answers_select_proprios;

ALTER POLICY holoscope_answers_insert_proprios
  ON public.holoscan_answers
  RENAME TO holoscan_answers_insert_proprios;

-- holoscan_system_scores (2 policies)
ALTER POLICY holoscope_system_scores_select_proprios
  ON public.holoscan_system_scores
  RENAME TO holoscan_system_scores_select_proprios;

ALTER POLICY holoscope_system_scores_insert_proprios
  ON public.holoscan_system_scores
  RENAME TO holoscan_system_scores_insert_proprios;


-- ============================================================================
-- 6. RENOMEAR FUNCAO DE PROTECAO DE SNAPSHOT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.proteger_snapshot_holoscan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.nutritionist_id       IS DISTINCT FROM old.nutritionist_id
  OR new.patient_id            IS DISTINCT FROM old.patient_id
  OR new.quando                IS DISTINCT FROM old.quando
  OR new.versao_estrutura      IS DISTINCT FROM old.versao_estrutura
  OR new.versao_bancos         IS DISTINCT FROM old.versao_bancos
  OR new.indice                IS DISTINCT FROM old.indice
  OR new.indice_maximo         IS DISTINCT FROM old.indice_maximo
  OR new.avaliavel             IS DISTINCT FROM old.avaliavel
  OR new.nota_media            IS DISTINCT FROM old.nota_media
  OR new.triada                IS DISTINCT FROM old.triada
  OR new.triada_com_dado       IS DISTINCT FROM old.triada_com_dado
  OR new.cobertura             IS DISTINCT FROM old.cobertura
  OR new.combinacoes           IS DISTINCT FROM old.combinacoes
  OR new.aprofundamentos       IS DISTINCT FROM old.aprofundamentos
  THEN
    RAISE EXCEPTION 'campos historicos do snapshot HOLOSCAN sao imutaveis; '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  END IF;
  RETURN new;
END;
$$;

-- Atualizar o trigger para usar a funcao nova
DROP TRIGGER IF EXISTS holoscan_applications_proteger_snapshot
  ON public.holoscan_applications;
CREATE TRIGGER holoscan_applications_proteger_snapshot
  BEFORE UPDATE ON public.holoscan_applications
  FOR EACH ROW EXECUTE FUNCTION public.proteger_snapshot_holoscan();

-- Remover funcao antiga (nenhum trigger a referencia mais)
DROP FUNCTION IF EXISTS public.proteger_snapshot_holoscope();


-- ============================================================================
-- 7. CRIAR RPC salvar_holoscan_completo
-- ============================================================================

CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_id    uuid;
  app_data  jsonb := payload->'application';
  ans_data  jsonb := payload->'answers';
  sc_data   jsonb := payload->'scores';
  uid       uuid  := auth.uid();
  r         record;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'nao autenticado';
  END IF;

  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto: application, answers e scores sao obrigatorios';
  END IF;

  -- 1. inserir holoscan_applications
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao
  )
  VALUES (
    uid,
    (app_data->>'patient_id')::uuid,
    (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer,
    app_data->>'versao_bancos',
    (app_data->>'indice')::numeric,
    (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean,
    (app_data->>'nota_media')::numeric,
    app_data->'triada',
    app_data->'triada_com_dado',
    app_data->'cobertura',
    COALESCE(app_data->'combinacoes', '[]'::jsonb),
    COALESCE(app_data->'aprofundamentos', '[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL
         THEN (app_data->>'interpretacao_em')::timestamptz
         ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL
         THEN (app_data->>'interpretacao_versao')::integer
         ELSE NULL END
  )
  RETURNING id INTO app_id;

  -- 2. inserir holoscan_answers
  FOR r IN SELECT * FROM jsonb_array_elements(ans_data) AS elem
  LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.elem->>'marcador_id', (r.elem->>'valor')::smallint);
  END LOOP;

  -- 3. inserir holoscan_system_scores
  FOR r IN SELECT * FROM jsonb_array_elements(sc_data) AS elem
  LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    )
    VALUES (
      app_id,
      r.elem->>'sistema',
      r.elem->>'nome',
      (r.elem->>'nota')::numeric,
      (r.elem->>'carga')::numeric,
      r.elem->>'faixa',
      (r.elem->>'obtido')::numeric,
      (r.elem->>'maximo')::numeric,
      (r.elem->>'respondidos')::integer,
      (r.elem->>'total_marcadores')::integer,
      (r.elem->>'avaliavel')::boolean
    );
  END LOOP;

  RETURN app_id;
END;
$$;

-- Wrapper de compatibilidade: frontend antigo continua funcionando
CREATE OR REPLACE FUNCTION public.salvar_holoscope_completo(payload jsonb)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.salvar_holoscan_completo(payload);
$$;


-- ============================================================================
-- 8. REVOGAR ACESSO ANON NAS NOVAS TABELAS/FUNCAO
-- ============================================================================

REVOKE ALL ON TABLE public.holoscan_applications FROM anon;
REVOKE ALL ON TABLE public.holoscan_answers FROM anon;
REVOKE ALL ON TABLE public.holoscan_system_scores FROM anon;
REVOKE EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) FROM anon;


-- ============================================================================
-- 9. TIPO DE CONSULTA reavaliacao_holoscope → reavaliacao_holoscan
-- ============================================================================

-- Atualizar registros existentes ANTES de trocar a constraint
UPDATE public.consultations
SET tipo = 'reavaliacao_holoscan'
WHERE tipo = 'reavaliacao_holoscope';

-- Trocar a constraint
ALTER TABLE public.consultations
  DROP CONSTRAINT IF EXISTS consultations_tipo_valido;

ALTER TABLE public.consultations
  ADD CONSTRAINT consultations_tipo_valido
  CHECK (tipo IN (
    'primeira_consulta',
    'retorno',
    'reavaliacao_holoscan',
    'online'
  ));


COMMIT;
