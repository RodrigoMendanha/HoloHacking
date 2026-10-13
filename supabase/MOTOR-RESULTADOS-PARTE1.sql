-- =====================================================================
-- MOTOR DE RESULTADOS V1 — PARTE 1 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- sinais dominantes por sistema + montagem do snapshot do Resultado HOLOS (template 4, motor MR-V1, derivados.mapa_proposito).
-- Rode as partes NA ORDEM (1 a 3), so DEPOIS da homologacao. Se uma parte der erro, nada dela e aplicada:
-- corrija e rode de novo a MESMA parte. Pode rodar a mesma parte mais de uma vez (create or replace).
-- NAO DESTRUTIVA: nenhum dado clinico, HOLOSCAN, Resultado ou emissao ja salvos sao alterados (sem backfill).
-- Conteudo identico a supabase/migrations/20261019100000_motor_resultados_v1.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- 1a. sinais dominantes de um sistema (ate 3), so leitura
create or replace function public.resultado_holos_dominantes(p_app uuid, p_pk uuid, p_sistema text)
returns jsonb language sql stable set search_path = '' as $$
select coalesce(jsonb_agg(jsonb_build_object('question_id', d.qid, 'enunciado', d.statement, 'pontos', d.contrib) order by d.contrib desc, d.qid asc), '[]'::jsonb)
from (
  select ans.marcador_id as qid, q.statement,
         (a.weight * (case when q.orientation = 'invertida' then sc2.max_value - ans.valor else ans.valor - sc2.min_value end))::numeric as contrib
  from public.holoscan_answers ans
  join public.methodology_associations a on a.package_id = p_pk and a.question_stable_id = ans.marcador_id
       and a.destination_type = 'system' and a.destination_id = p_sistema and a.role = 'primaria' and a.weight is not null
  join public.methodology_questions q on q.package_id = p_pk and q.stable_id = ans.marcador_id
  join public.methodology_scales sc2 on sc2.package_id = p_pk and sc2.code = q.scale_code
  where ans.application_id = p_app and ans.valor is not null
  order by contrib desc, qid asc
  limit 3
) d where d.contrib > 0;
$$;
revoke all on function public.resultado_holos_dominantes(uuid, uuid, text) from public, anon, authenticated;

-- 1b. montagem do snapshot, template 4 (o resto identico ao template 3 de 20261017100000)
create or replace function public.montar_resultado_holos(uid uuid, payload jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_pid uuid; v_eid uuid; v_hid uuid; pac record; enc record; app record; pk record;
  v_pp_vis jsonb := coalesce(payload#>'{visao_paciente,proximos_passos}', 'false'::jsonb);
  v_sistemas jsonb; v_ferr jsonb; v_prof text; v_pp jsonb; v_pend jsonb; v_oq3 jsonb; v_pqq jsonb; v_mapa jsonb;
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
  -- MR-V1 (item 23): Mapa do Proposito DERIVADO de OQ3 + PQQ (a unica relacao ferramenta -> ferramenta homologada),
  -- com a referencia das aplicacoes fonte. Mesmo criterio de FerramentasFechamento.propositoDisponivel: OQ3 com quer,
  -- precisa ou consegue; PQQ com objetivo, algum nivel ou a sintese. Fica em 'derivados', separado das respostas.
  select t into v_oq3 from jsonb_array_elements(v_ferr->'ferramentas') t where t->>'ferramenta_id' = 'oq3' limit 1;
  select t into v_pqq from jsonb_array_elements(v_ferr->'ferramentas') t where t->>'ferramenta_id' = 'pqq' limit 1;
  if v_oq3 is not null and v_pqq is not null
     and (coalesce(btrim(v_oq3#>>'{respostas,quer}'), '') <> '' or coalesce(btrim(v_oq3#>>'{respostas,precisa}'), '') <> '' or coalesce(btrim(v_oq3#>>'{respostas,consegue}'), '') <> '')
     and (coalesce(btrim(v_pqq#>>'{respostas,objetivo}'), '') <> '' or coalesce(btrim(v_pqq#>>'{respostas,verdadeiro}'), '') <> ''
          or exists (select 1 from unnest(array['r1','r2','r3','r4','r5']) k where coalesce(btrim(v_pqq->'respostas'->>k), '') <> '')) then
    v_mapa := jsonb_build_object('ferramenta_id', 'mapa', 'motor', 'MR-V1', 'regra', 'OQ3+PQQ', 'opcional', true,
      'fontes', jsonb_build_array(
        jsonb_build_object('ferramenta_id', 'oq3', 'id', v_oq3->'id', 'concluida_em', v_oq3->'concluida_em'),
        jsonb_build_object('ferramenta_id', 'pqq', 'id', v_pqq->'id', 'concluida_em', v_pqq->'concluida_em')),
      'campos', jsonb_build_object('quer', v_oq3#>'{respostas,quer}', 'importa', v_pqq#>'{respostas,verdadeiro}',
        'sustenta', v_oq3#>'{respostas,consegue}', 'direcao', v_pqq#>'{respostas,objetivo}'));
  end if;
  -- template 4: os sinais dominantes reais de cada sistema (texto aprovado da pergunta)
  select coalesce(jsonb_agg(x.s || jsonb_build_object('dominantes', public.resultado_holos_dominantes(app.id, pk.id, x.s->>'sistema')) order by x.n), '[]'::jsonb)
    into v_sistemas from jsonb_array_elements(v_sistemas) with ordinality as x(s, n);
  v_pp := public.resultado_holos_proximos_passos(uid, app.id);
  -- template 3: o que ainda nao foi feito no atendimento (o registro original continua congelado ao lado)
  v_pend := public.proximos_passos_pendentes(uid, app.id, array[enc.id, app.encounter_id]);
  if v_pend is not null then v_pp := v_pp || jsonb_build_object('pendentes', v_pend); end if;
  select pr.nome into v_prof from public.profiles pr where pr.id = uid;
  return jsonb_build_object(
    'conteudo', jsonb_build_object(
      'template_version', 4,
      'motor_resultados', 'MR-V1',
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
      'derivados', jsonb_build_object('mapa_proposito', v_mapa),
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
