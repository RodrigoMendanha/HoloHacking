-- =====================================================================
-- CORRECOES DA JORNADA (12/10) — teste completo com paciente ficticia
--
-- Aditiva. NAO muda o motor do HOLOSCAN, o catalogo HOLOS-RECOMENDACOES-V1,
-- nenhum Resultado HOLOS salvo nem nenhuma emissao do Resultado Final.
--
-- Bug 1 — Proximos Passos no Resultado: o registro feito ao salvar o HOLOSCAN
-- (antes de qualquer ferramenta) continua congelado como esta; o Resultado HOLOS
-- NOVO (template 3) congela tambem os "pendentes": a mesma escolha do catalogo
-- (mesma ordem de sistemas, mesmo catalogo registrado), excluindo as ferramentas
-- ja concluidas/revisadas no atendimento do resultado e no do HOLOSCAN. Sem
-- nenhuma pendente: todas_realizadas = true (a tela mostra mensagem neutra).
-- =====================================================================

create or replace function public.proximos_passos_pendentes(p_uid uuid, p_app uuid, p_encontros uuid[])
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  reg record; v_pac uuid; sis_ids text[] := '{}'; concluidas text[] := '{}'; usadas text[];
  slots text[]; s text; escolha jsonb; selecao jsonb := '[]'::jsonb; n int := 0;
begin
  if p_uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select x.* into reg from public.holos_next_steps x
    where x.holoscan_application_id = p_app and x.nutritionist_id = p_uid order by x.catalog_version desc, x.created_at desc limit 1;
  if not found then return null; end if;
  select a.patient_id into v_pac from public.holoscan_applications a where a.id = p_app and a.nutritionist_id = p_uid;
  select coalesce(array_agg(e.x->>'system_id' order by e.o), '{}') into sis_ids
    from jsonb_array_elements(reg.systems_order) with ordinality as e(x, o);
  select coalesce(array_agg(distinct t.ferramenta_id order by t.ferramenta_id), '{}') into concluidas from public.tool_applications t
    where t.nutritionist_id = p_uid and t.patient_id = v_pac and t.encounter_id = any(p_encontros) and t.status in ('concluida', 'revisada');
  usadas := concluidas;   -- concluida no atendimento nao volta como sugestao
  if array_length(sis_ids, 1) is not null then
    slots := case when array_length(sis_ids, 1) >= 2 then array[sis_ids[1], sis_ids[2], sis_ids[1]] else array[sis_ids[1], sis_ids[1], sis_ids[1]] end;
    foreach s in array slots loop
      escolha := public.proximos_passos_escolher(reg.catalog_id, s, usadas, concluidas);
      if escolha is not null then
        n := n + 1;
        usadas := usadas || (escolha->>'tool_id');
        selecao := selecao || (escolha || jsonb_build_object('papel', case when n = 1 then 'principal' else 'complementar' end, 'slot', n));
      end if;
    end loop;
  end if;
  return jsonb_build_object('concluidas_no_atendimento', to_jsonb(concluidas), 'selection', selecao,
    'todas_realizadas', (n = 0 and array_length(sis_ids, 1) is not null));
end;
$$;
revoke all on function public.proximos_passos_pendentes(uuid, uuid, uuid[]) from public, anon, authenticated;

create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid; pac record; enc record; app record; pk record;
  v_pp_vis jsonb := coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb);
  v_sistemas jsonb; v_ferr jsonb; v_prof text; v_pp jsonb; v_pend jsonb;
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
  -- template 3: o que ainda nao foi feito no atendimento (o registro original continua congelado ao lado)
  v_pend := public.proximos_passos_pendentes(uid, app.id, array[enc.id, app.encounter_id]);
  if v_pend is not null then v_pp := v_pp || jsonb_build_object('pendentes', v_pend); end if;
  select pr.nome into v_prof from public.profiles pr where pr.id = uid;
  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 3,
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
