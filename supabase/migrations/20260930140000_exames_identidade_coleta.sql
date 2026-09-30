-- Rodada 08, onda 2 — EXAMES: identidade da coleta e data nao futura.
--
-- 1. lab_collections ganha um trigger que recusa coletado_em no futuro
--    (tolerancia de 1 dia sobre a data UTC, para quem registra a leste de
--    Greenwich). Vale para a RPC e para a escrita direta (coleta sem data
--    e exclusao usam a tabela sob RLS). Linhas existentes nao sao tocadas.
-- 2. salvar_coleta_exames aceita collection.modo:
--      "nova"    se ja existe coleta do paciente nessa data, RAISE — antes a
--                RPC reaproveitava a coleta e APAGAVA os resultados dela;
--      "editar"  / ausente: comportamento de antes (troca os resultados da
--                coleta daquela data). O front antigo nao manda modo e
--                continua funcionando igual.
--    E recusa data futura com mensagem propria.
--
-- Nao muda: tabelas, colunas, RLS, grants, assinatura da RPC.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

create or replace function public.lab_collections_data_nao_futura()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.coletado_em is not null
     and new.coletado_em > (now() at time zone 'utc')::date + 1 then
    raise exception 'data da coleta no futuro: %', new.coletado_em using errcode = '22008';
  end if;
  return new;
end;
$$;

revoke all on function public.lab_collections_data_nao_futura() from public, anon, authenticated;

drop trigger if exists lab_collections_data_nao_futura on public.lab_collections;
create trigger lab_collections_data_nao_futura
  before insert or update of coletado_em on public.lab_collections
  for each row execute function public.lab_collections_data_nao_futura();

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
  modo      text;
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
  modo := col_data->>'modo';

  if desconhecida then
    dt := null;
  else
    dt := coalesce((col_data->>'coletado_em')::date, current_date);
  end if;

  -- rodada 08: data de coleta no futuro nao existe (tolerancia de 1 dia
  -- sobre o UTC, para o fuso de quem registra)
  if dt is not null and dt > (now() at time zone 'utc')::date + 1 then
    raise exception 'data da coleta no futuro: %', dt using errcode = '22008';
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

  -- rodada 08: "nova" nunca substitui a coleta que ja existe na data; para
  -- trocar os valores dela o cliente manda "editar" (ou nada: legado)
  if col_id is not null and modo = 'nova' then
    raise exception 'coleta ja existe nesta data: %', dt using errcode = '23505';
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
