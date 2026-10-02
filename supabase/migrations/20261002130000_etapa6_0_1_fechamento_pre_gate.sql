-- V1 — ETAPA 6.0.1: FECHAMENTO PRE-GATE REAL. NAO APLICADA em producao. Entra depois de 20261002120000.
--
--   1. Referencia do laudo AMBIGUA preservada de ponta a ponta (DECISAO 07 / reason code ambiguous_reference):
--      lab_results.reference_status aceita 'ambiguous' (texto/limites originais preservados; nenhuma classificacao
--      fabricada); lab_gravar_resultados grava 'ambiguous' quando o payload traz reference_ambiguous = true e
--      existe referencia informada. A leitura integrada congela no snapshot o resultado afetado, o reason code,
--      a exclusao e a referencia original (migration 20261002120000 + motor 2.0.1).
--   2. Proveniencia metodologica das aplicacoes HOLOSCAN: toda NOVA aplicacao salva por salvar_holoscan_completo
--      pode receber methodology_package_id + methodology_package_version (validados: pacote existente e versao
--      coerente). Aplicacao historica sem proveniencia PERMANECE sem vinculo: os dois campos sao imutaveis depois
--      do insert (nenhum backfill, nenhuma inferencia por data, faixa, respostas ou estrutura parecida —
--      docs/v1/laboratorio/POLITICA-COMPATIBILIDADE-APLICACOES-HISTORICAS-HOLOSCAN-LI.md). A LI devolve
--      incompatible_holoscan_version quando nao consegue provar compatibilidade.

-- ============================================================================
-- 1. REFERENCIA AMBIGUA
-- ============================================================================
alter table public.lab_results drop constraint if exists lab_results_reference_status;
alter table public.lab_results add constraint lab_results_reference_status check (reference_status in ('informed','missing','ambiguous'));
alter table public.lab_results drop constraint if exists lab_results_referencia_informada;
alter table public.lab_results add constraint lab_results_referencia_informada check (
  (reference_status in ('informed','ambiguous') and (report_reference_text is not null or report_reference_min is not null or report_reference_max is not null))
  or (reference_status = 'missing' and report_reference_text is null and report_reference_min is null and report_reference_max is null));

create or replace function public.lab_gravar_resultados(p_cid uuid, p_uid uuid, p_results jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; comp jsonb; rid uuid; n integer := 0; pos integer := 0; v_code text; v_cust uuid; v_q text; v_nv numeric; v_refst text;
begin
  perform set_config('holohacking.lab_rpc', p_cid::text, true);
  delete from public.lab_result_components x using public.lab_results y where x.result_id = y.id and y.collection_id = p_cid and y.exame_id is null;
  delete from public.lab_results where collection_id = p_cid and exame_id is null;
  for r in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    pos := pos + 1;
    v_code := nullif(btrim(coalesce(r->>'exam_code','')), ''); v_cust := nullif(r->>'custom_exam_id','')::uuid;
    if v_code is null and v_cust is null then raise exception 'resultado % sem exame (exam_code ou custom_exam_id)', pos using errcode = 'P0001', hint = 'resultado_sem_exame'; end if;
    if v_code is not null and v_cust is not null then raise exception 'resultado % com exame do catalogo E customizado', pos using errcode = 'P0001'; end if;
    if v_code is not null and not exists (select 1 from public.lab_exam_catalog c where c.code = v_code and c.status = 'ativo') then raise exception 'exame % nao existe no catalogo-base', v_code using errcode = 'P0001', hint = 'exame_desconhecido'; end if;
    if v_cust is not null and not exists (select 1 from public.lab_custom_exams c where c.id = v_cust and c.nutritionist_id = p_uid) then raise exception 'exame customizado nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if length(btrim(coalesce(r->>'value_original_text',''))) = 0 then raise exception 'resultado % sem valor original', pos using errcode = 'P0001', hint = 'valor_ausente'; end if;
    v_q := coalesce(r->>'qualifier', 'text'); v_nv := case when v_q = 'eq' then (r->>'numeric_value')::numeric else null end;
    v_refst := case when r->>'report_reference_text' is not null or r->>'report_reference_min' is not null or r->>'report_reference_max' is not null
                    then case when coalesce((r->>'reference_ambiguous')::boolean, false) then 'ambiguous' else 'informed' end
                    else 'missing' end;
    insert into public.lab_results (collection_id, exam_code, custom_exam_id, variant, value_original_text, numeric_value, qualifier, censor_limit, unit_original, method, material,
        report_reference_text, report_reference_min, report_reference_max, report_reference_operator, report_reference_unit, report_reference_population, reference_status, reference_source, origin, notes, result_date, position)
      values (p_cid, v_code, v_cust, nullif(btrim(coalesce(r->>'variant','')), ''), btrim(r->>'value_original_text'), v_nv, v_q, (r->>'censor_limit')::numeric, nullif(btrim(coalesce(r->>'unit_original','')), ''), nullif(btrim(coalesce(r->>'method','')), ''), nullif(btrim(coalesce(r->>'material','')), ''),
        r->>'report_reference_text', (r->>'report_reference_min')::numeric, (r->>'report_reference_max')::numeric, coalesce(r->>'report_reference_operator', case when v_refst in ('informed','ambiguous') then 'range' end), r->>'report_reference_unit', r->>'report_reference_population', v_refst, 'laudo',
        coalesce(r->>'origin', 'manual'), r->>'notes', (r->>'result_date')::date, pos)
      returning id into rid;
    n := n + 1;
    for comp in select value from jsonb_array_elements(coalesce(r->'components', '[]'::jsonb)) loop
      insert into public.lab_result_components (result_id, position, original_name, canonical_component_key, value_original_text, numeric_value, qualifier, censor_limit, unit_original, report_reference_text, report_reference_min, report_reference_max, report_reference_operator, notes)
        values (rid, coalesce((comp->>'position')::int, 0), comp->>'original_name', comp->>'canonical_component_key', comp->>'value_original_text',
          case when coalesce(comp->>'qualifier','text') = 'eq' then (comp->>'numeric_value')::numeric end, coalesce(comp->>'qualifier','text'), (comp->>'censor_limit')::numeric, comp->>'unit_original',
          comp->>'report_reference_text', (comp->>'report_reference_min')::numeric, (comp->>'report_reference_max')::numeric, comp->>'report_reference_operator', comp->>'notes');
    end loop;
  end loop;
  perform set_config('holohacking.lab_rpc', '', true);
  return n;
end; $$;

-- ============================================================================
-- 2. PROVENIENCIA METODOLOGICA DA APLICACAO HOLOSCAN (sem backfill)
-- ============================================================================
alter table public.holoscan_applications add column if not exists methodology_package_version integer;
alter table public.holoscan_applications drop constraint if exists holoscan_applications_pacote_coerente;
-- versao so existe com pacote; o pacote sem versao e tolerado para linhas anteriores a esta migration (a RPC exige os dois para aplicacao NOVA)
alter table public.holoscan_applications add constraint holoscan_applications_pacote_coerente check (methodology_package_version is null or methodology_package_id is not null);

-- proveniencia imutavel: nao se preenche depois (nenhum backfill silencioso), nao se troca, nao se apaga
create or replace function public.proteger_proveniencia_holoscan()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.methodology_package_id is distinct from old.methodology_package_id or new.methodology_package_version is distinct from old.methodology_package_version then
    raise exception 'proveniencia metodologica da aplicacao HOLOSCAN e imutavel: ausencia de proveniencia nao pode ser preenchida silenciosamente (sem backfill)' using errcode = 'P0001', hint = 'proveniencia_imutavel';
  end if;
  return new;
end $$;
drop trigger if exists holoscan_applications_proveniencia on public.holoscan_applications;
create trigger holoscan_applications_proveniencia before update on public.holoscan_applications for each row execute function public.proteger_proveniencia_holoscan();

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
  triada_norm jsonb; mp_id uuid; mp_ver integer; mp_real integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
  -- proveniencia metodologica: so o que o cliente DECLAROU, validado; nunca inferido
  mp_id := NULLIF(app_data->>'methodology_package_id', '')::uuid;
  mp_ver := NULLIF(app_data->>'methodology_package_version', '')::integer;
  IF (mp_id IS NULL) <> (mp_ver IS NULL) THEN RAISE EXCEPTION 'proveniencia metodologica incompleta: informe methodology_package_id E methodology_package_version, ou nenhum' USING errcode = 'P0001', hint = 'proveniencia_incompleta'; END IF;
  IF mp_id IS NOT NULL THEN
    SELECT version INTO mp_real FROM public.methodology_packages WHERE id = mp_id;
    IF mp_real IS NULL THEN RAISE EXCEPTION 'pacote metodologico % nao existe', mp_id USING errcode = 'P0002'; END IF;
    IF mp_real <> mp_ver THEN RAISE EXCEPTION 'versao declarada (%) nao e a versao do pacote (%)', mp_ver, mp_real USING errcode = 'P0001', hint = 'proveniencia_incoerente'; END IF;
  END IF;
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao, methodology_package_id, methodology_package_version
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid,
    NULLIF(app_data->>'encounter_id', '')::uuid,
    (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    COALESCE(app_data->'combinacoes','[]'::jsonb),
    COALESCE(app_data->'aprofundamentos','[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END,
    mp_id, mp_ver
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
REVOKE EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) FROM anon;

do $$
begin
  if (select count(*) from public.holoscan_applications where methodology_package_id is not null) <> 0 then raise exception 'nenhum backfill de proveniencia pode nascer da migration'; end if;
  if (select count(*) from public.lab_results where reference_status = 'ambiguous') <> 0 then raise exception 'nenhuma referencia e marcada ambigua pela migration'; end if;
end $$;
