-- ============================================================================
-- MOTOR DE RESULTADOS V1 (12/10) — correcoes tecnicas do Resultado HOLOS
-- ============================================================================
-- Nada aqui muda o HOLOSCAN: perguntas, pesos, formula, cobertura, cinco sistemas, Indice, Triade, faixas e associacoes
-- do HOLOS-V1 v2 ficam intocados; o catalogo HOLOS-RECOMENDACOES-V1 e o motor PP-V1 tambem. Resultados HOLOS e emissoes
-- ja salvos NAO sao reescritos (sem backfill, sem recalculo, sem mudar hash).
--
-- 1. Resultado HOLOS template 4: alem do que o template 3 congela, cada sistema leva os SINAIS DOMINANTES reais da
--    aplicacao (ate 3; contribuicao = peso x valor orientado, a mesma conta do motor e dos Proximos Passos; texto APROVADO
--    da pergunta no pacote) e o snapshot registra a versao do motor de resultados que o desenha ('MR-V1').
-- 2. Emissao do Resultado Final RF-2: a Conduta congelada e a do ATENDIMENTO DO RESULTADO (antes: a mais recente da
--    paciente, de qualquer atendimento). Sem Conduta consolidada nesse atendimento, a emissao sai sem Conduta.
--    Emissoes RF-1 ja feitas continuam como estao (o navegador as desenha com o desenho congelado da epoca).
-- 3. Relatorio emitido: o texto sobre a metodologia sai do estado real do pacote das aplicacoes incluidas (antes: fixo
--    "Pacote Metodologico V1 nao homologado"). Relatorios ja emitidos nao mudam.
-- ============================================================================

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

-- 2. emissao RF-2: Conduta do atendimento do resultado (RF-1 continua valido para as emissoes ja feitas)
alter table public.holos_result_emissions drop constraint holos_result_emissions_template;
alter table public.holos_result_emissions add constraint holos_result_emissions_template check (template_version in ('RF-1', 'RF-2'));
create or replace function public.emitir_resultado_final(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); v_rid uuid; v_op uuid; r record; pac record; cd record; pr record; em record;
  v_acordos jsonb; v_conduta jsonb; v_img jsonb := coalesce(payload->'imagens', '{}'::jsonb);
  v_logo text; v_ass text; v_car text; v_num int; snap jsonb; h text; agora timestamptz := now();
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  begin
    v_rid := (payload->>'holos_result_id')::uuid;
    v_op := nullif(payload->>'operation_id', '')::uuid;
  exception when others then raise exception 'identificador invalido' using errcode = '22023', hint = 'payload_invalido'; end;
  if v_rid is null then raise exception 'resultado obrigatorio' using errcode = '22023', hint = 'payload_invalido'; end if;
  if jsonb_typeof(v_img) <> 'object' then raise exception 'imagens invalidas' using errcode = '22023', hint = 'imagem_invalida'; end if;
  if v_op is not null then
    select e.* into em from public.holos_result_emissions e where e.nutritionist_id = uid and e.operation_id = v_op;
    if found then return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at); end if;
  end if;

  select h.* into r from public.holos_results h where h.id = v_rid and h.nutritionist_id = uid;
  if not found then raise exception 'resultado nao encontrado' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if r.status = 'rascunho' or r.content_snapshot is null then raise exception 'so Resultado HOLOS salvo e emitido' using errcode = 'P0001', hint = 'resultado_nao_finalizado'; end if;
  if r.superseded_at is not null then raise exception 'esta versao foi substituida: emita a versao atual' using errcode = 'P0001', hint = 'resultado_substituido'; end if;
  select p.id, p.nome, p.status into pac from public.patients p where p.id = r.patient_id and p.nutritionist_id = uid;
  if pac.status = 'inativo' then raise exception 'paciente arquivado: reative antes de registrar novas informacoes' using errcode = 'P0001', hint = 'paciente_arquivado'; end if;

  -- RF-2 (motor de resultados V1, item 4.6): a Conduta do ATENDIMENTO DO RESULTADO (a consolidada de maior revisao
  -- desse atendimento) — nunca a de outro atendimento. Sem Conduta consolidada nele, a emissao sai sem Conduta.
  select c.*, e.occurred_at as atendimento_em into cd from public.conducts c join public.encounters e on e.id = c.encounter_id
   where c.patient_id = r.patient_id and c.nutritionist_id = uid and c.status in ('salvo', 'revisado') and c.encounter_id = r.encounter_id
   order by c.revision_number desc limit 1;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object('description', a.description, 'due_text', a.due_text) order by a.position, a.created_at), '[]'::jsonb)
      into v_acordos from public.agreements a where a.conduct_id = cd.id and a.nutritionist_id = uid and length(btrim(a.description)) > 0;
    v_conduta := jsonb_build_object('id', cd.id, 'revision_number', cd.revision_number, 'encounter_id', cd.encounter_id, 'atendimento_em', cd.atendimento_em,
      'campos', jsonb_build_object('objective', cd.objective, 'nutrition_strategy', cd.nutrition_strategy, 'actions', cd.actions,
        'resources', cd.resources, 'professional_guidance', cd.professional_guidance, 'return_plan', cd.return_plan),
      'acordos', v_acordos);
  else
    v_conduta := null;
  end if;

  select p.nome, p.profissao, p.registro, p.especialidade, p.cidade, p.telefone, p.instagram, p.cor_primaria, p.cor_secundaria
    into pr from public.profiles p where p.id = uid;
  v_logo := public.emissao_imagem_valida(v_img->'logo');
  v_ass := public.emissao_imagem_valida(v_img->'assinatura');
  v_car := public.emissao_imagem_valida(v_img->'carimbo');

  select coalesce(max(e.emission_number), 0) + 1 into v_num from public.holos_result_emissions e where e.patient_id = r.patient_id;
  snap := jsonb_build_object(
    'template', 'RF-2',
    'emitida_em', agora,
    'emissao', jsonb_build_object('numero', v_num),
    'paciente', jsonb_build_object('id', pac.id, 'nome', pac.nome),
    'resultado', jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'status', r.status, 'salvo_em', r.saved_at,
      'content_hash', r.content_hash, 'template_version', r.template_version),
    'conduta', v_conduta,
    'profissional', jsonb_build_object('nome', pr.nome, 'profissao', pr.profissao, 'registro', pr.registro, 'especialidade', pr.especialidade,
      'cidade', pr.cidade, 'telefone', pr.telefone, 'instagram', pr.instagram, 'cor_primaria', pr.cor_primaria, 'cor_secundaria', pr.cor_secundaria),
    'imagens', jsonb_build_object('logo', v_logo, 'assinatura', v_ass, 'carimbo', v_car));
  h := encode(sha256(convert_to(snap::text, 'UTF8')), 'hex');
  insert into public.holos_result_emissions (nutritionist_id, patient_id, holos_result_id, result_content_hash, conduct_id, emission_number,
      template_version, content_snapshot, content_hash, operation_id, created_at)
    values (uid, r.patient_id, r.id, r.content_hash, case when v_conduta is null then null else cd.id end, v_num, 'RF-2', snap, h, v_op, agora)
    returning * into em;
  return jsonb_build_object('id', em.id, 'emission_number', em.emission_number, 'content_hash', em.content_hash, 'created_at', em.created_at);
end;
$$;
revoke all on function public.emitir_resultado_final(jsonb) from public, anon;
grant execute on function public.emitir_resultado_final(jsonb) to authenticated;

-- 3. relatorio: texto da metodologia pelo estado real do pacote (o resto identico a 20261011100000)
create or replace function public.emitir_relatorio(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_pid uuid; v_enc uuid; sel jsonb; atual public.report_emissions%rowtype;
  sup public.report_emissions%rowtype; rev int := 1; intimo boolean; interp boolean;
  pac record; prof record; x text; r record; r2 record;
  fontes jsonb := '{}'::jsonb; conteudo jsonb; secao jsonb; itens jsonb; dom record; it jsonb; tipo text;
  dominios_intimos text[] := array['emocional','sentido_pessoal'];
  hash text; agora timestamptz := now(); v_met text;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select r0.id into v_id from public.report_emissions r0 where r0.nutritionist_id = uid and r0.operation_id = v_op and r0.status = 'emitido';
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.report_emissions r0 where r0.id = v_id and r0.nutritionist_id = uid for update;
    if not found then raise exception 'relatorio % nao encontrado', v_id using errcode = 'P0002'; end if;
    if atual.status = 'emitido' then
      if v_op is not null and atual.operation_id = v_op then return v_id; end if;
      raise exception 'relatorio ja emitido; retifique criando uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel';
    end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho do relatorio foi alterado em outro lugar; recarregue antes de emitir' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_pid := atual.patient_id;
  else
    v_pid := (payload->>'patient_id')::uuid;
  end if;
  if v_pid is null then raise exception 'patient_id e obrigatorio'; end if;
  v_enc := nullif(payload->>'encounter_id','')::uuid;
  sel := coalesce(payload->'selected_sources', atual.selected_sources, '{}'::jsonb);
  intimo := coalesce((sel->>'incluir_intimo')::boolean, false);
  interp := coalesce((sel->>'incluir_interpretacao')::boolean, true);

  -- retificacao: a emissao substituida tem de ser do mesmo paciente e estar emitida
  if nullif(payload->>'supersedes_report_id','') is not null or atual.supersedes_report_id is not null then
    select * into sup from public.report_emissions r0
      where r0.id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, atual.supersedes_report_id) and r0.nutritionist_id = uid for update;
    if not found then raise exception 'emissao a retificar nao encontrada' using errcode = 'P0002'; end if;
    if sup.patient_id <> v_pid then raise exception 'emissao a retificar e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if sup.status <> 'emitido' then raise exception 'so uma emissao pode ser retificada' using errcode = 'P0001'; end if;
    rev := sup.revision_number + 1;
  end if;

  -- identificacao proporcional + profissional (do servidor, nao do payload)
  select p.nome, p.nascimento, p.sexo into pac from public.patients p where p.id = v_pid and p.nutritionist_id = uid;
  if pac.nome is null then raise exception 'paciente nao encontrado' using errcode = 'P0002'; end if;
  select pr.nome, pr.profissao, pr.registro into prof from public.profiles pr where pr.id = uid;

  -- motor de resultados V1 (12/10, item 4.4): o texto sobre a metodologia sai do ESTADO REAL do pacote de cada
  -- aplicacao HOLOSCAN incluida (antes era fixo: "Pacote Metodologico V1 nao homologado", mesmo com pacote aprovado)
  select case
    when coalesce(jsonb_array_length(sel->'holoscan_application_ids'), 0) = 0 then 'Nenhuma aplicação HOLOSCAN incluída neste relatório.'
    when exists (select 1 from jsonb_array_elements_text(sel->'holoscan_application_ids') x
                   left join public.holoscan_applications h on h.id::text = x.value and h.nutritionist_id = uid
                   left join public.methodology_packages m on m.id = h.methodology_package_id
                  where h.id is null or h.methodology_package_id is null or m.status not in ('aprovado', 'retirado'))
      then 'Há aplicação HOLOSCAN histórica, sem pacote metodológico oficial aprovado: seus resultados metodológicos não são oficiais; constam só identificação, data, versão e cobertura bruta.'
    else 'Aplicações HOLOSCAN calculadas pelo pacote metodológico oficial aprovado (' ||
      (select string_agg(distinct m.code || ' v' || m.version, ', ') from jsonb_array_elements_text(sel->'holoscan_application_ids') x
         join public.holoscan_applications h on h.id::text = x.value and h.nutritionist_id = uid
         join public.methodology_packages m on m.id = h.methodology_package_id) ||
      '). Este relatório registra identificação, data, versão, cobertura e a interpretação profissional; notas, Índice, Tríade e o resultado do método ficam no Resultado HOLOS.'
  end into v_met;

  conteudo := jsonb_build_object(
    'template_version', 1,
    'tipos_de_conteudo', jsonb_build_array('RELATO_DO_PACIENTE','OBSERVACAO_PROFISSIONAL','DADO_MEDIDO','DADO_DOCUMENTAL','INDICADOR_CALCULADO','TEXTO_ASSISTIDO'),
    'paciente', jsonb_build_object('nome', pac.nome, 'nascimento', pac.nascimento, 'sexo', pac.sexo),
    'profissional', jsonb_build_object('nome', prof.nome, 'profissao', prof.profissao, 'registro', prof.registro),
    'periodo', jsonb_build_object('inicio', nullif(payload->>'period_start',''), 'fim', nullif(payload->>'period_end','')),
    'titulo', payload->>'title',
    'metodologia', v_met,
    'texto_assistido', '[]'::jsonb
  );

  -- atendimentos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'encounter_ids','[]'::jsonb)) loop
    select * into r from public.encounters e where e.id = x::uuid and e.patient_id = v_pid and e.nutritionist_id = uid;
    if not found then raise exception 'atendimento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'occurred_at', r.occurred_at, 'timezone', r.timezone, 'type', r.type, 'modality', r.modality, 'com_agendamento', r.consultation_id is not null);
    fontes := jsonb_set(fontes, '{encounters}', coalesce(fontes->'encounters','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('atendimentos', itens);

  -- anamneses (so consolidadas); itens intimos so com incluir_intimo
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'anamnesis_ids','[]'::jsonb)) loop
    select * into r from public.anamneses a where a.id = x::uuid and a.patient_id = v_pid and a.nutritionist_id = uid;
    if not found then raise exception 'anamnese % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'anamnese % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    secao := '[]'::jsonb;
    if r.content->'dominios' is not null then
      for dom in select key, value from jsonb_each(r.content->'dominios') loop
        if not intimo and dom.key = any(dominios_intimos) then continue; end if;
        for it in select * from jsonb_array_elements(coalesce(dom.value->'itens','[]'::jsonb)) loop
          tipo := case it->>'origem' when 'relato_paciente' then 'RELATO_DO_PACIENTE' when 'observacao_profissional' then 'OBSERVACAO_PROFISSIONAL'
                                      when 'documento_externo' then 'DADO_DOCUMENTAL' when 'dado_medido' then 'DADO_MEDIDO' else 'RELATO_DO_PACIENTE' end;
          secao := secao || (jsonb_build_object('dominio', dom.key, 'tipo_conteudo', tipo) || (it - 'fonte_anamnese_id'));
        end loop;
      end loop;
    end if;
    itens := itens || jsonb_build_object('id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number, 'status', r.status,
      'reviewed_at', r.reviewed_at, 'itens', secao, 'intimo_incluido', intimo);
    fontes := jsonb_set(fontes, '{anamneses}', coalesce(fontes->'anamneses','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('anamneses', itens);

  -- HOLOSCAN: identificacao, data, versao, cobertura, interpretacao profissional — nada de nota/indice/triada/faixa
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'holoscan_application_ids','[]'::jsonb)) loop
    select * into r from public.holoscan_applications h where h.id = x::uuid and h.patient_id = v_pid and h.nutritionist_id = uid;
    if not found then raise exception 'HOLOSCAN % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'INDICADOR_CALCULADO', 'id', r.id, 'encounter_id', r.encounter_id, 'quando', r.quando,
      'versao_estrutura', r.versao_estrutura, 'versao_bancos', r.versao_bancos, 'cobertura', r.cobertura,
      'resultados_oficiais', false, 'interpretacao_profissional', case when interp then r.interpretacao_texto else null end,
      'interpretacao_tipo', 'OBSERVACAO_PROFISSIONAL');
    fontes := jsonb_set(fontes, '{holoscan_applications}', coalesce(fontes->'holoscan_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('holoscan', itens);

  -- Prontuario (20261011100000): exame e documento sao SO arquivos do prontuario. lab_collection_ids e ignorado: nenhum
  -- valor, unidade ou referencia laboratorial entra no relatorio. As coletas antigas continuam no banco, so leitura.
  conteudo := conteudo || jsonb_build_object('exames_incluidos', false);

  -- ferramentas consolidadas; respostas (conteudo intimo) so com incluir_intimo
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'tool_application_ids','[]'::jsonb)) loop
    select * into r from public.tool_applications t where t.id = x::uuid and t.patient_id = v_pid and t.nutritionist_id = uid;
    if not found then raise exception 'ferramenta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'ferramenta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'RELATO_DO_PACIENTE', 'id', r.id, 'encounter_id', r.encounter_id, 'ferramenta_id', r.ferramenta_id,
      'versao_ferramenta', r.versao_ferramenta, 'concluida_em', r.concluida_em, 'status', r.status,
      'respostas', case when intimo then r.respostas else null end, 'respostas_incluidas', intimo,
      'leitura_profissional', case when interp then r.leitura else null end, 'leitura_tipo', 'OBSERVACAO_PROFISSIONAL',
      'prioridade', r.prioridade, 'proximo_passo', r.proximo_passo);
    fontes := jsonb_set(fontes, '{tool_applications}', coalesce(fontes->'tool_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('ferramentas', itens);

  -- condutas consolidadas + acordos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'conduct_ids','[]'::jsonb)) loop
    select * into r from public.conducts c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
    if not found then raise exception 'conduta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'conduta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'description', g.description, 'responsible', g.responsible, 'due_text', g.due_text,
        'follow_up', g.follow_up, 'status', g.status, 'status_note', g.status_note) order by g.position, g.created_at), '[]'::jsonb)
      into secao from public.agreements g where g.conduct_id = r.id
        and (sel->'agreement_ids' is null or jsonb_array_length(coalesce(sel->'agreement_ids','[]'::jsonb)) = 0 or (sel->'agreement_ids') ? g.id::text);
    itens := itens || jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number,
      'status', r.status, 'priorities', r.priorities, 'objective', r.objective, 'nutrition_strategy', r.nutrition_strategy, 'actions', r.actions,
      'resources', r.resources, 'requested_exams', r.requested_exams, 'monitoring', r.monitoring, 'return_plan', r.return_plan,
      'observations', r.observations,
      'professional_guidance', r.professional_guidance, 'previous_decision', r.previous_decision, 'previous_decision_note', r.previous_decision_note,
      'acordos', secao);
    fontes := jsonb_set(fontes, '{conducts}', coalesce(fontes->'conducts','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('condutas', itens);

  -- documentos: so a referencia administrativa (quantos arquivos ativos o prontuario guarda). document_ids e ignorado:
  -- nome, tipo e conteudo do arquivo nao entram no relatorio.
  conteudo := conteudo || jsonb_build_object('documentos_armazenados',
    (select count(*) from public.documents d where d.patient_id = v_pid and d.nutritionist_id = uid and d.arquivado_em is null));

  -- interpretacao profissional escrita para este relatorio
  conteudo := conteudo || jsonb_build_object('interpretacao_profissional',
    case when interp and nullif(payload->>'professional_text','') is not null
         then jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'texto', payload->>'professional_text') else null end);

  hash := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');   -- sha256() nativo do PostgreSQL (>= 11): hash tecnico, nao assinatura

  if v_id is not null then
    update public.report_emissions set
      status = 'emitido', encounter_id = coalesce(v_enc, encounter_id), title = coalesce(payload->>'title', title),
      period_start = coalesce(nullif(payload->>'period_start','')::date, period_start), period_end = coalesce(nullif(payload->>'period_end','')::date, period_end),
      selected_sources = sel, professional_text = coalesce(payload->>'professional_text', professional_text),
      source_snapshot = fontes, content_snapshot = conteudo, content_hash = hash, template_version = 1,
      issued_at = agora, created_by = uid, revision_number = rev,
      supersedes_report_id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, supersedes_report_id),
      operation_id = coalesce(operation_id, v_op)
    where id = v_id;
  else
    insert into public.report_emissions (nutritionist_id, patient_id, encounter_id, status, title, period_start, period_end, selected_sources,
      professional_text, source_snapshot, content_snapshot, content_hash, template_version, issued_at, created_by, revision_number,
      supersedes_report_id, operation_id)
    values (uid, v_pid, v_enc, 'emitido', payload->>'title', nullif(payload->>'period_start','')::date, nullif(payload->>'period_end','')::date, sel,
      payload->>'professional_text', fontes, conteudo, hash, 1, agora, uid, rev, nullif(payload->>'supersedes_report_id','')::uuid, v_op)
    returning id into v_id;
  end if;
  if sup.id is not null then
    update public.report_emissions set superseded_at = agora where id = sup.id and superseded_at is null;
  end if;
  return v_id;
end;
$$;
