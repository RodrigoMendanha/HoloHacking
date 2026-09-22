-- ============================================================================
-- FASE 5 — RPC salvar_holoscope_completo
-- ============================================================================
--
-- Insere atomicamente em tres tabelas:
--   holoscope_applications  (1 linha)
--   holoscope_answers       (ate 84 linhas)
--   holoscope_system_scores (5 linhas)
--
-- O frontend chama:
--   supabaseClient.rpc('salvar_holoscope_completo', { payload: {...} })
--
-- O payload e um JSON com:
--   application: { patient_id, quando, versao_estrutura, versao_bancos,
--                   indice, indice_maximo, avaliavel, nota_media,
--                   triada, triada_com_dado, cobertura, combinacoes,
--                   aprofundamentos, interpretacao_texto, interpretacao_em,
--                   interpretacao_versao }
--   answers:     [{ marcador_id, valor }, ...]
--   scores:      [{ sistema, nome, nota, carga, faixa, obtido, maximo,
--                   respondidos, total_marcadores, avaliavel }, ...]
--
-- Retorna o id da aplicacao criada.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================

create or replace function public.salvar_holoscope_completo(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  app_id    uuid;
  app_data  jsonb := payload->'application';
  ans_data  jsonb := payload->'answers';
  sc_data   jsonb := payload->'scores';
  uid       uuid  := auth.uid();
  r         record;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;

  if app_data is null or ans_data is null or sc_data is null then
    raise exception 'payload incompleto: application, answers e scores sao obrigatorios';
  end if;

  -- 1. inserir holoscope_applications
  insert into public.holoscope_applications (
    nutritionist_id, patient_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao
  )
  values (
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
    coalesce(app_data->'combinacoes', '[]'::jsonb),
    coalesce(app_data->'aprofundamentos', '[]'::jsonb),
    app_data->>'interpretacao_texto',
    case when app_data->>'interpretacao_em' is not null
         then (app_data->>'interpretacao_em')::timestamptz
         else null end,
    case when app_data->>'interpretacao_versao' is not null
         then (app_data->>'interpretacao_versao')::integer
         else null end
  )
  returning id into app_id;

  -- 2. inserir holoscope_answers
  for r in select * from jsonb_array_elements(ans_data) as elem
  loop
    insert into public.holoscope_answers (application_id, marcador_id, valor)
    values (app_id, r.elem->>'marcador_id', (r.elem->>'valor')::smallint);
  end loop;

  -- 3. inserir holoscope_system_scores
  for r in select * from jsonb_array_elements(sc_data) as elem
  loop
    insert into public.holoscope_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    )
    values (
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
  end loop;

  return app_id;
end;
$$;
