-- RESULTADO FINAL HOLOS (10/10) — PARTE 3 de 7: montagem do snapshot, template 2 (so resultados NOVOS)
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA.
-- Identico a supabase/migrations/20261015100000_resultado_final_holos.sql. A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if to_regprocedure('public.resultado_holos_proximos_passos(uuid, uuid)') is null then raise exception 'rode a PARTE 2 antes (nada foi aplicado)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 1d. montagem do snapshot, template 2: igual ao template 1 + proximos_passos (registro congelado) + visibilidade
-- ----------------------------------------------------------------------------
create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid; pac record; enc record; app record; pk record;
  v_pp_vis jsonb := coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb);
  v_sistemas jsonb; v_ferr jsonb; v_prof text; v_pp jsonb;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  begin
    v_pid := (payload->>'patient_id')::uuid;
    v_eid := nullif(payload->>'encounter_id', '')::uuid;
    v_hid := nullif(payload->>'holoscan_application_id', '')::uuid;
  exception when others then
    raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido';
  end;
  if v_pid is null then raise exception 'paciente obrigatorio' using errcode = '22023', hint = 'payload_invalido'; end if;
  if jsonb_typeof(v_pp_vis) <> 'boolean' then raise exception 'compartilhamento invalido' using errcode = '22023', hint = 'payload_invalido'; end if;
  select p.id, p.nome, p.status into pac from public.patients p where p.id = v_pid and p.nutritionist_id = uid;
  if not found then raise exception 'paciente nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if pac.status = 'inativo' then
    raise exception 'paciente arquivado: reative antes de registrar novas informacoes' using errcode = 'P0001', hint = 'paciente_arquivado';
  end if;
  if v_eid is null then raise exception 'atendimento obrigatorio' using errcode = 'P0001', hint = 'atendimento_obrigatorio'; end if;
  select e.id, e.occurred_at, e.timezone, e.type, e.modality into enc
    from public.encounters e where e.id = v_eid and e.patient_id = v_pid and e.nutritionist_id = uid;
  if not found then raise exception 'atendimento de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if v_hid is null then raise exception 'HOLOSCAN obrigatorio' using errcode = 'P0001', hint = 'holoscan_obrigatorio'; end if;
  select a.* into app from public.holoscan_applications a where a.id = v_hid and a.patient_id = v_pid and a.nutritionist_id = uid;
  if not found then raise exception 'aplicacao HOLOSCAN de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if app.methodology_package_id is null or coalesce(app.calculation_mode, '') <> 'oficial' then
    raise exception 'aplicacao HOLOSCAN historica, sem pacote metodologico oficial' using errcode = 'P0001', hint = 'holoscan_nao_oficial';
  end if;
  select m.id, m.code, m.version, m.status, m.content_hash into pk from public.methodology_packages m where m.id = app.methodology_package_id;
  if not found or pk.status not in ('aprovado', 'retirado') then
    raise exception 'pacote metodologico da aplicacao nao esta aprovado' using errcode = 'P0001', hint = 'holoscan_nao_oficial';
  end if;
  v_ferr := public.resultado_holos_ferramentas(uid, v_pid, payload);
  v_sistemas := public.resultado_holos_sistemas(app.id, pk.id);
  v_pp := public.resultado_holos_proximos_passos(uid, app.id);
  select pr.nome into v_prof from public.profiles pr where pr.id = uid;
  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 2,
      'paciente', jsonb_build_object('id', pac.id, 'nome', pac.nome),
      'profissional', jsonb_build_object('nome', v_prof),
      'atendimento', jsonb_build_object('id', enc.id, 'occurred_at', enc.occurred_at, 'timezone', enc.timezone, 'type', enc.type, 'modality', enc.modality),
      'holoscan', jsonb_build_object(
        'id', app.id, 'quando', app.quando, 'registrado_em', app.created_at, 'encounter_id', app.encounter_id,
        'pacote', jsonb_build_object('id', pk.id, 'code', pk.code, 'version', pk.version, 'content_hash', pk.content_hash),
        'engine_version', app.engine_version, 'calculation_mode', app.calculation_mode,
        'cobertura', app.cobertura, 'indice', app.indice, 'indice_maximo', app.indice_maximo, 'avaliavel', app.avaliavel,
        'nota_media', app.nota_media, 'triada', app.triada, 'triada_com_dado', app.triada_com_dado,
        'interpretacao_texto', app.interpretacao_texto, 'sistemas', v_sistemas),
      'ferramentas', v_ferr->'ferramentas',
      'proximos_passos', v_pp,
      'visibilidade', jsonb_build_object('proximos_passos', v_pp_vis),
      'exames', jsonb_build_object('incluidos', false, 'nota', 'Exames e Leitura Integrada nao fazem parte desta versao do Resultado HOLOS.')
    ),
    'fontes', jsonb_build_object('holoscan', jsonb_build_object('id', app.id, 'updated_at', app.updated_at), 'ferramentas', v_ferr->'fontes',
      'proximos_passos', case when (v_pp->>'registrado') = 'true' then jsonb_build_object('id', v_pp->'registro_id', 'content_hash', v_pp->'content_hash') else null end),
    'pacote', jsonb_build_object('id', pk.id, 'version', pk.version, 'content_hash', pk.content_hash)
  );
end;
$$;
revoke all on function public.montar_resultado_holos(uuid, jsonb) from public, anon, authenticated;
commit;
select 'montar_resultado_holos template 2' as item, (position('''template_version'', 2' in pg_get_functiondef('public.montar_resultado_holos(uuid, jsonb)'::regprocedure)) > 0)::text as valor
union all select 'resultados ja salvos (continuam iguais)', (select count(*)::text from public.holos_results where status <> 'rascunho');
