-- ============================================================================
-- FASE 6 — RPC salvar_coleta_exames
-- ============================================================================
--
-- Insere ou atualiza atomicamente em duas tabelas:
--   lab_collections  (1 linha — upsert por patient_id + coletado_em)
--   lab_results      (N linhas — recriadas a cada save)
--
-- O frontend chama:
--   supabaseClient.rpc('salvar_coleta_exames', { payload: {...} })
--
-- O payload e um JSON com:
--   collection: { patient_id, coletado_em (nullable), data_coleta_desconhecida,
--                 laboratorio, observacao }
--   results:    [{ exame_id, valor, unidade_no_momento, ideal_min_no_momento,
--                  ideal_max_no_momento, nome_exame_no_momento,
--                  sistema_no_momento }, ...]
--
-- Semantica de upsert:
--   Se ja existe uma lab_collection para o mesmo nutritionist + patient_id
--   + coletado_em (ou ambos null com data_coleta_desconhecida = true),
--   apaga os results antigos e insere os novos.
--   Se nao existe, cria a collection e insere os results.
--
-- Retorna o id da collection.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================

create or replace function public.salvar_coleta_exames(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
      r.elem->>'exame_id',
      (r.elem->>'valor')::numeric,
      r.elem->>'unidade_no_momento',
      (r.elem->>'ideal_min_no_momento')::numeric,
      (r.elem->>'ideal_max_no_momento')::numeric,
      r.elem->>'nome_exame_no_momento',
      r.elem->>'sistema_no_momento'
    );
  end loop;

  return col_id;
end;
$$;
