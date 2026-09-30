-- Rodada 08, onda 1 — HOLOSCAN: ausencia de dado e null, nunca 10.
--
-- O motor devolve, para sistema sem nenhuma resposta, nota 10 com
-- avaliavel = false, e, para eixo da Triada sem resposta, 10 com
-- triada_com_dado[eixo] = false. O 10 e artefato da conta (10 - carga 0),
-- nao sinal de saude. Gravado assim, qualquer leitor que olhe so o numero
-- (ficha, exportacao, contexto da HOLOS AI, relatorio SQL) le "equilibrio"
-- onde nao houve resposta.
--
-- O que muda:
-- 1. holoscan_system_scores: nota, carga e faixa aceitam NULL, e um CHECK
--    exige coerencia com avaliavel (sem dado = NULL; com dado = preenchido).
--    O CHECK entra NOT VALID: linhas ja gravadas nao sao reescritas nem
--    recusadas (rastreabilidade); so as novas precisam obedecer. Em 30-set a
--    tabela estava vazia.
-- 2. salvar_holoscan_completo normaliza no servidor, qualquer que seja o
--    cliente: score com avaliavel = false grava nota/carga/faixa NULL, e o
--    eixo da Triada com triada_com_dado = false grava null. Por isso esta
--    migration e compativel com o front antigo (que manda 10) e com o novo
--    (que ja manda null).
--
-- Nao muda: motor, pesos, calculo, Indice, RLS, grants, assinatura da RPC.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

ALTER TABLE public.holoscan_system_scores
  ALTER COLUMN nota  DROP NOT NULL,
  ALTER COLUMN carga DROP NOT NULL,
  ALTER COLUMN faixa DROP NOT NULL;

ALTER TABLE public.holoscan_system_scores
  ADD CONSTRAINT holoscan_system_scores_sem_dado_coerente CHECK (
    (avaliavel AND nota IS NOT NULL AND carga IS NOT NULL AND faixa IS NOT NULL)
    OR (NOT avaliavel AND nota IS NULL AND carga IS NULL AND faixa IS NULL)
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record;
  triada_norm jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
  -- Eixo da Triada sem resposta (triada_com_dado = false) grava null, nao 10.
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid, (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    COALESCE(app_data->'combinacoes','[]'::jsonb),
    COALESCE(app_data->'aprofundamentos','[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END
  ) RETURNING id INTO app_id;
  FOR r IN SELECT * FROM jsonb_array_elements(ans_data) AS elem LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.value->>'marcador_id', (r.value->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(sc_data) AS elem LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.value->>'sistema', r.value->>'nome',
      -- sistema sem nenhuma resposta: sem nota, sem carga, sem faixa
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'nota')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'carga')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN r.value->>'faixa' END,
      (r.value->>'obtido')::numeric, (r.value->>'maximo')::numeric,
      (r.value->>'respondidos')::integer, (r.value->>'total_marcadores')::integer,
      (r.value->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;
