-- Conserta o erro 42703 "record \"r\" has no field \"elem\"" nas RPCs de escrita.
--
-- Em PL/pgSQL, `FOR r IN SELECT * FROM jsonb_array_elements(x) AS elem` faz de
-- `elem` apenas o alias da tabela; o record `r` tem uma unica coluna, `value`
-- (parametro OUT de jsonb_array_elements). Todo `r.elem` passa a `r.value`.
--
-- Origem do bug: 20260922010000_fase5_rpc_salvar_holoscope,
-- 20260922020000_fase6_rpc_salvar_coleta_exames e
-- 20260923200000_rename_holoscope_to_holoscan.
--
-- Os corpos abaixo sao as definicoes que estavam em producao em 29-set
-- (pg_get_functiondef), com essa unica troca. Assinatura, retorno,
-- SECURITY DEFINER, search_path e grants nao mudam (CREATE OR REPLACE
-- preserva dono e privilegios). Nenhuma tabela, RLS ou Auth e alterada.

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
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
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
    app_data->'triada', app_data->'triada_com_dado', app_data->'cobertura',
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
      (r.value->>'nota')::numeric, (r.value->>'carga')::numeric, r.value->>'faixa',
      (r.value->>'obtido')::numeric, (r.value->>'maximo')::numeric,
      (r.value->>'respondidos')::integer, (r.value->>'total_marcadores')::integer,
      (r.value->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.salvar_coleta_exames(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  col_id    uuid;
  col_data  jsonb := payload->'collection';
  res_data  jsonb := payload->'results';
  uid       uuid  := auth.uid();
  pid       uuid;
  dt        date;
  desconhecida boolean;
  r         record;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;

  if col_data is null or res_data is null then
    raise exception 'payload incompleto: collection e results sao obrigatorios';
  end if;

  pid := (col_data->>'patient_id')::uuid;
  desconhecida := coalesce((col_data->>'data_coleta_desconhecida')::boolean, false);

  if desconhecida then
    dt := null;
  else
    dt := coalesce((col_data->>'coletado_em')::date, current_date);
  end if;

  -- tentar encontrar collection existente para upsert
  if desconhecida then
    select id into col_id
    from public.lab_collections
    where nutritionist_id = uid
      and patient_id = pid
      and data_coleta_desconhecida = true
    limit 1;
  else
    select id into col_id
    from public.lab_collections
    where nutritionist_id = uid
      and patient_id = pid
      and coletado_em = dt
    limit 1;
  end if;

  if col_id is not null then
    -- atualizar campos da collection existente
    update public.lab_collections
    set laboratorio = col_data->>'laboratorio',
        observacao  = col_data->>'observacao'
    where id = col_id;

    -- limpar results antigos
    delete from public.lab_results where collection_id = col_id;
  else
    -- criar nova collection
    insert into public.lab_collections (
      nutritionist_id, patient_id, coletado_em,
      data_coleta_desconhecida, laboratorio, observacao
    )
    values (
      uid, pid, dt, desconhecida,
      col_data->>'laboratorio', col_data->>'observacao'
    )
    returning id into col_id;
  end if;

  -- inserir results
  for r in select * from jsonb_array_elements(res_data) as elem
  loop
    insert into public.lab_results (
      collection_id, exame_id, valor,
      unidade_no_momento, ideal_min_no_momento, ideal_max_no_momento,
      nome_exame_no_momento, sistema_no_momento
    )
    values (
      col_id,
      r.value->>'exame_id',
      (r.value->>'valor')::numeric,
      r.value->>'unidade_no_momento',
      (r.value->>'ideal_min_no_momento')::numeric,
      (r.value->>'ideal_max_no_momento')::numeric,
      r.value->>'nome_exame_no_momento',
      r.value->>'sistema_no_momento'
    );
  end loop;

  return col_id;
end;
$function$;
