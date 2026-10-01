-- Rodada 08, onda 2 — reescrita na Etapa 0 da V1 (reconciliacao com o
-- Documento Mestre). NAO APLICADA em producao ate esta data.
--
-- EXAMES: identidade da coleta e o ID, nunca (paciente + data).
--
-- Documento Mestre, secoes 22, 34.2 e 43.2: "Duas coletas na mesma data tem
-- IDs independentes"; "Coletas nao usam apenas paciente mais data como
-- identidade"; "Editar uma coleta e diferente de criar outra".
--
-- A RPC salvar_coleta_exames em producao (fase6 + fix_rpc_record_value)
-- faz UPSERT por (nutritionist_id, patient_id, coletado_em): uma segunda
-- coleta na mesma data substitui a primeira e APAGA os resultados dela. A
-- versao anterior desta migration (Rodada 08) trocava isso por uma RECUSA
-- ("coleta ja existe nesta data") no modo "nova" — tambem contraria ao
-- Mestre, porque continuava tratando a data como identidade.
--
-- O que esta versao faz:
--   * collection.id presente  -> EDITAR aquela coleta (tem de ser do
--                                 nutricionista autenticado; senao RAISE);
--                                 atualiza data/laboratorio/observacao e
--                                 TROCA os resultados dela;
--   * collection.id ausente   -> INSERIR uma coleta nova, sempre, mesmo que
--                                 ja exista outra na mesma data.
--   * collection.modo e aceito e ignorado (compatibilidade com o front da
--     Rodada 08); a identidade vem so do id.
--   * nenhuma busca por data; nenhuma recusa por data.
--
-- O que NAO esta aqui (de proposito): a regra "data da coleta nao pode ser
-- futura" da Rodada 08. Ela nao e contrato do Mestre e foi separada em
-- supabase/migrations-pendentes/PENDENTE_lab_collections_data_nao_futura.sql,
-- pendente de decisao de produto/clinica.
--
-- Nao muda: tabelas, colunas, RLS, grants, assinatura da RPC.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

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
    dt := (col_data->>'coletado_em')::date;
    if dt is null then
      raise exception 'coleta com data: informe coletado_em, ou marque data_coleta_desconhecida';
    end if;
  end if;

  -- Etapa 0: identidade da coleta e o id. Com id, EDITA aquela coleta; sem
  -- id, INSERE uma nova. Nunca procura coleta por (paciente, data).
  if col_data->>'id' is not null then
    col_id := (col_data->>'id')::uuid;

    -- a coleta tem de existir e ser do nutricionista autenticado
    perform 1 from public.lab_collections c
      where c.id = col_id and c.nutritionist_id = uid and c.patient_id = pid;
    if not found then
      raise exception 'coleta % nao encontrada para este paciente', col_id using errcode = 'P0002';
    end if;

    update public.lab_collections
       set coletado_em = dt,
           data_coleta_desconhecida = desconhecida,
           laboratorio = col_data->>'laboratorio',
           observacao  = col_data->>'observacao'
     where id = col_id;

    -- editar = trocar os resultados DESTA coleta
    delete from public.lab_results where collection_id = col_id;
  else
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
