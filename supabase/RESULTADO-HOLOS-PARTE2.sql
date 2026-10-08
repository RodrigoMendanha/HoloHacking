-- =====================================================================
-- RESULTADO HOLOS — PARTE 2 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- Cria a montagem do snapshot (so leitura das fontes) e a previa.
-- Rode as partes NA ORDEM (1, 2, 3). Se uma parte der erro, nada dela e aplicado: corrija e rode de novo a MESMA parte.
-- Conteudo identico a supabase/migrations/20261009100000_resultado_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- PRE
do $$ begin
  if to_regclass('public.holos_results') is null then raise exception 'rode a PARTE 1 antes (holos_results nao existe)'; end if;
end $$;

-- ----------------------------------------------------------------------------
-- MONTAGEM DO SNAPSHOT (so leitura). Recebe o uid do chamador; valida tudo; devolve
-- {conteudo, fontes, pacote:{id,version,content_hash}}. Nada do conteudo clinico vem do payload.
-- ----------------------------------------------------------------------------
create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid;
  pac record; enc record; app record; pk record;
  v_tools jsonb := coalesce(payload->'tool_application_ids', '[]'::jsonb);
  v_vis jsonb := coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb);
  v_ids uuid[] := '{}'; v_id uuid; x text;
  n_tools int; n_ok int; n_ferr int;
  v_sistemas jsonb; v_ferramentas jsonb; v_fontes jsonb; v_prof text;
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

  -- ferramentas: lista de uuids, sem repeticao, todas do mesmo paciente/profissional, concluidas/revisadas, uma por ferramenta
  if jsonb_typeof(v_tools) <> 'array' then raise exception 'lista de ferramentas invalida' using errcode = '22023', hint = 'payload_invalido'; end if;
  for x in select jsonb_array_elements_text(v_tools) loop
    begin v_id := x::uuid; exception when others then
      raise exception 'identificador de ferramenta invalido' using errcode = '22023', hint = 'payload_invalido'; end;
    if v_id = any(v_ids) then raise exception 'ferramenta repetida' using errcode = 'P0001', hint = 'fonte_repetida'; end if;
    v_ids := v_ids || v_id;
  end loop;
  n_tools := coalesce(array_length(v_ids, 1), 0);
  if n_tools > 9 then raise exception 'no maximo 9 ferramentas' using errcode = 'P0001', hint = 'payload_invalido'; end if;
  select count(*), count(distinct t.ferramenta_id) into n_ok, n_ferr from public.tool_applications t
    where t.id = any(v_ids) and t.patient_id = v_pid and t.nutritionist_id = uid;
  if n_ok <> n_tools then raise exception 'ferramenta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if n_ferr <> n_tools then raise exception 'escolha uma unica aplicacao por ferramenta' using errcode = 'P0001', hint = 'fonte_repetida'; end if;
  if exists (select 1 from public.tool_applications t where t.id = any(v_ids) and t.status not in ('concluida', 'revisada')) then
    raise exception 'ferramenta em rascunho nao entra no Resultado HOLOS' using errcode = 'P0001', hint = 'fonte_nao_consolidada';
  end if;
  if exists (select 1 from public.tool_applications t where t.id = any(v_ids) and t.ferramenta_id not in
      ('oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro', 'mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1')) then
    raise exception 'ferramenta fora do catalogo atual' using errcode = 'P0001', hint = 'fonte_invalida';
  end if;
  if jsonb_typeof(v_vis) <> 'object' then raise exception 'visibilidade invalida' using errcode = '22023', hint = 'payload_invalido'; end if;

  -- HOLOSCAN: notas/faixas SALVAS (nada recalculado) + textos oficiais do pacote + respostas que pontuaram / contexto
  select coalesce(jsonb_agg(jsonb_build_object(
      'sistema', s.sistema, 'nome', s.nome, 'nota', s.nota, 'carga', s.carga, 'faixa', s.faixa, 'obtido', s.obtido, 'maximo', s.maximo,
      'respondidos', s.respondidos, 'total_marcadores', s.total_marcadores, 'avaliavel', s.avaliavel,
      'texto_publico', ms.public_text,
      'mensagem_nutri', (select r.message_nutri from public.methodology_ranges r where r.package_id = pk.id and r.destination_type = 'system'
                          and r.destination_id = s.sistema and r.label = s.faixa limit 1),
      'mensagem_paciente', (select r.message_paciente from public.methodology_ranges r where r.package_id = pk.id and r.destination_type = 'system'
                          and r.destination_id = s.sistema and r.label = s.faixa limit 1),
      'pontuou', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.stable_id, 'enunciado', q.statement, 'valor', ans.valor,
                    'resposta', q.response_labels->>(ans.valor::int), 'peso', ma.weight) order by q.position nulls last, q.stable_id), '[]'::jsonb)
                  from public.methodology_associations ma
                  join public.methodology_questions q on q.package_id = ma.package_id and q.stable_id = ma.question_stable_id
                  join public.holoscan_answers ans on ans.application_id = app.id and ans.marcador_id = ma.question_stable_id
                  where ma.package_id = pk.id and ma.destination_type = 'system' and ma.destination_id = s.sistema and ma.role = 'primaria'),
      'contexto', (select coalesce(jsonb_agg(jsonb_build_object('question_id', q.stable_id, 'enunciado', q.statement, 'valor', ans.valor,
                    'resposta', q.response_labels->>(ans.valor::int)) order by q.position nulls last, q.stable_id), '[]'::jsonb)
                  from public.methodology_associations ma
                  join public.methodology_questions q on q.package_id = ma.package_id and q.stable_id = ma.question_stable_id
                  join public.holoscan_answers ans on ans.application_id = app.id and ans.marcador_id = ma.question_stable_id
                  where ma.package_id = pk.id and ma.destination_type = 'system' and ma.destination_id = s.sistema and ma.role = 'secondary_contextual')
    ) order by coalesce(ms.position, 99), s.sistema), '[]'::jsonb)
    into v_sistemas
    from public.holoscan_system_scores s
    left join public.methodology_systems ms on ms.package_id = pk.id and ms.code = s.sistema
    where s.application_id = app.id;

  -- ferramentas: copia integral do registro no momento do salvamento (mudancas futuras nao alcancam o snapshot)
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', t.id, 'ferramenta_id', t.ferramenta_id, 'versao_ferramenta', t.versao_ferramenta, 'status', t.status,
      'iniciada_em', t.iniciada_em, 'concluida_em', t.concluida_em, 'encounter_id', t.encounter_id,
      'respostas', coalesce(t.respostas, '{}'::jsonb), 'leitura', t.leitura, 'prioridade', t.prioridade, 'proximo_passo', t.proximo_passo,
      'mostrar_paciente', coalesce((v_vis #>> array[t.id::text, 'mostrar'])::boolean, false),
      'ocultar', '[]'::jsonb
    ) order by array_position(v_ids, t.id)), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('tipo', 'tool_application', 'id', t.id, 'updated_at', t.updated_at, 'status', t.status)
      order by array_position(v_ids, t.id)), '[]'::jsonb)
    into v_ferramentas, v_fontes
    from public.tool_applications t where t.id = any(v_ids);

  select pr.nome into v_prof from public.profiles pr where pr.id = uid;

  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 1,
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
      'ferramentas', v_ferramentas,
      'exames', jsonb_build_object('incluidos', false, 'nota', 'Exames e Leitura Integrada nao fazem parte desta versao do Resultado HOLOS.')
    ),
    'fontes', jsonb_build_object('holoscan', jsonb_build_object('id', app.id, 'updated_at', app.updated_at), 'ferramentas', v_fontes),
    'pacote', jsonb_build_object('id', pk.id, 'version', pk.version, 'content_hash', pk.content_hash)
  );
end;
$$;
revoke all on function public.montar_resultado_holos(uuid, jsonb) from public, anon, authenticated;

-- campos que o navegador pode mandar (e nada mais)
create or replace function public.resultado_holos_campos(payload jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'holoscan_application_id', payload->>'holoscan_application_id',
    'tool_application_ids', coalesce(payload->'tool_application_ids', '[]'::jsonb),
    'visao_paciente', jsonb_build_object('ferramentas', coalesce(payload#>'{visao_paciente,ferramentas}', '{}'::jsonb)));
$$;
revoke all on function public.resultado_holos_campos(jsonb) from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- PREVIA (nao grava): o mesmo snapshot que o servidor gravaria agora
-- ----------------------------------------------------------------------------
create or replace function public.previa_resultado_holos(payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  return public.montar_resultado_holos(uid, payload) -> 'conteudo';
end;
$$;
do $$ begin
  if to_regprocedure('public.montar_resultado_holos(uuid, jsonb)') is null or to_regprocedure('public.previa_resultado_holos(jsonb)') is null
     or to_regprocedure('public.resultado_holos_campos(jsonb)') is null then raise exception 'POS 2: funcoes nao criadas'; end if;
end $$;
commit;
select 'PARTE 2 OK: montagem do snapshot e previa. Agora rode a PARTE 3.' as resultado;
