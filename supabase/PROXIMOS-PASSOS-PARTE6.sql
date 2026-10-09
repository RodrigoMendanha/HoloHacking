-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 6 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Motor V1 no servidor: proximos_passos_calcular e proximos_passos_escolher (funcoes internas, sem execute para a aplicacao).
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regclass('public.holos_next_steps') is null then raise exception 'rode a PARTE 5 antes (holos_next_steps nao existe)'; end if;
end $$;
-- ----------------------------------------------------------------------------
-- 3. MOTOR V1 (no servidor): a mesma ordem de "Por onde investigar" + catalogo + ferramentas do atendimento
-- ----------------------------------------------------------------------------
-- Entrada: a aplicacao OFICIAL salva (pacote HOLOS-V1), os sistemas avaliaveis na ordem de leitura (nota crescente;
-- empate pela ordem do motor), os sinais dominantes (contribuicao = peso x valor orientado, so para EXPLICAR), o catalogo
-- aprovado mais recente e as ferramentas concluidas/revisadas no atendimento da aplicacao.
-- Saida: no maximo 1 principal + 2 complementares, sem repetir ferramenta. Sem exames, sem Leitura Integrada, sem REC legada.
create or replace function public.proximos_passos_calcular(p_uid uuid, p_app uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  app record; cat record; s record; r record;
  ordem text[] := array['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual'];
  sistemas jsonb := '[]'::jsonb; sis_ids text[] := '{}';
  dominantes jsonb; nome text;
  concluidas text[] := '{}';
  selecao jsonb := '[]'::jsonb; usadas text[] := '{}';
  principal jsonb; comp1 jsonb; comp2 jsonb;
  motivo text := null;
begin
  if p_uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  select a.* into app from public.holoscan_applications a where a.id = p_app and a.nutritionist_id = p_uid;
  if not found then raise exception 'aplicacao HOLOSCAN nao encontrada' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if app.methodology_package_id is null then
    raise exception 'Proximos Passos HOLOS so para aplicacao oficial (pacote HOLOS-V1)' using errcode = 'P0001', hint = 'aplicacao_nao_oficial';
  end if;
  select c.* into cat from public.holos_recommendation_catalogs c where c.code = 'HOLOS-RECOMENDACOES-V1' and c.status = 'aprovado' order by c.version desc limit 1;
  if not found then raise exception 'catalogo de recomendacoes indisponivel' using errcode = 'P0001', hint = 'catalogo_indisponivel'; end if;

  -- sistemas avaliaveis, na ordem de "Por onde investigar" (nota crescente; empate pela ordem do motor)
  for s in
    select sc.sistema, sc.nota, sc.faixa, sc.respondidos, sc.total_marcadores
    from public.holoscan_system_scores sc
    where sc.application_id = p_app and sc.avaliavel = true and sc.nota is not null
    order by sc.nota asc, coalesce(array_position(ordem, sc.sistema), 99) asc
  loop
    select ms.name into nome from public.methodology_systems ms where ms.package_id = app.methodology_package_id and ms.code = s.sistema limit 1;
    -- sinais dominantes (ate 3): so para explicar; contribuicao = peso x valor orientado (a mesma conta do motor)
    select coalesce(jsonb_agg(jsonb_build_object('question_id', d.qid, 'rotulo', d.statement, 'pontos', d.contrib) order by d.contrib desc, d.qid asc), '[]'::jsonb) into dominantes
    from (
      select ans.marcador_id as qid, q.statement,
             (a.weight * (case when q.orientation = 'invertida' then sc2.max_value - ans.valor else ans.valor - sc2.min_value end))::numeric as contrib
      from public.holoscan_answers ans
      join public.methodology_associations a on a.package_id = app.methodology_package_id and a.question_stable_id = ans.marcador_id
           and a.destination_type = 'system' and a.destination_id = s.sistema and a.role = 'primaria' and a.weight is not null
      join public.methodology_questions q on q.package_id = app.methodology_package_id and q.stable_id = ans.marcador_id
      join public.methodology_scales sc2 on sc2.package_id = app.methodology_package_id and sc2.code = q.scale_code
      where ans.application_id = p_app and ans.valor is not null
      order by contrib desc, qid asc
      limit 3
    ) d where d.contrib > 0;
    sistemas := sistemas || jsonb_build_object('system_id', s.sistema, 'nome', coalesce(nome, s.sistema), 'nota', s.nota, 'faixa', s.faixa,
      'respondidos', s.respondidos, 'total_marcadores', s.total_marcadores, 'dominantes', dominantes);
    sis_ids := sis_ids || s.sistema;
  end loop;

  -- ferramentas ja concluidas/revisadas NO ATENDIMENTO desta aplicacao (atendimento anterior nao conta)
  if app.encounter_id is not null then
    select coalesce(array_agg(distinct t.ferramenta_id), '{}') into concluidas from public.tool_applications t
    where t.nutritionist_id = p_uid and t.patient_id = app.patient_id and t.encounter_id = app.encounter_id and t.status in ('concluida', 'revisada');
  end if;

  if array_length(sis_ids, 1) is null then
    motivo := 'Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação.';
  else
    principal := public.proximos_passos_escolher(cat.id, sis_ids[1], usadas, concluidas);
    if principal is not null then usadas := usadas || (principal->>'tool_id'); end if;
    if array_length(sis_ids, 1) >= 2 then
      comp1 := public.proximos_passos_escolher(cat.id, sis_ids[2], usadas, concluidas);
      if comp1 is not null then usadas := usadas || (comp1->>'tool_id'); end if;
      comp2 := public.proximos_passos_escolher(cat.id, sis_ids[1], usadas, concluidas);
    else
      comp1 := public.proximos_passos_escolher(cat.id, sis_ids[1], usadas, concluidas);
      if comp1 is not null then usadas := usadas || (comp1->>'tool_id'); end if;
      comp2 := public.proximos_passos_escolher(cat.id, sis_ids[1], usadas, concluidas);
    end if;
    if principal is not null then selecao := selecao || (principal || '{"papel":"principal","slot":1}'::jsonb); end if;
    if comp1 is not null then selecao := selecao || (comp1 || '{"papel":"complementar","slot":2}'::jsonb); end if;
    if comp2 is not null then selecao := selecao || (comp2 || '{"papel":"complementar","slot":3}'::jsonb); end if;
    if principal is null then motivo := 'Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação.'; end if;
  end if;

  return jsonb_build_object(
    'catalogo', jsonb_build_object('id', cat.id, 'code', cat.code, 'version', cat.version, 'content_hash', cat.content_hash, 'created_at', cat.created_at),
    'engine_version', 'PP-V1',
    'holoscan_application_id', app.id, 'patient_id', app.patient_id, 'encounter_id', app.encounter_id, 'quando', app.quando,
    'methodology_package_id', app.methodology_package_id, 'methodology_content_hash', app.methodology_content_hash,
    'systems_order', sistemas, 'concluidas_no_atendimento', to_jsonb(concluidas),
    'selection', selecao, 'motivo', motivo);
end;
$$;
revoke all on function public.proximos_passos_calcular(uuid, uuid) from public, anon, authenticated;

-- escolhe, para um sistema, a primeira regra aprovada (por rank) cuja ferramenta nao foi usada; pula ferramenta concluida
-- no atendimento quando houver outra elegivel (se so sobrar concluida, ela entra: nada e preenchido artificialmente, mas
-- tambem nao se esconde o passo so por ja ter sido aplicada)
create or replace function public.proximos_passos_escolher(p_catalogo uuid, p_sistema text, p_usadas text[], p_concluidas text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with elegiveis as (
    select r.rule_id, r.system_id, r.rank, r.tool_id, r.professional_reason, r.next_action,
           (r.tool_id = any(p_concluidas)) as concluida
    from public.holos_recommendation_rules r
    where r.catalog_id = p_catalogo and r.system_id = p_sistema and r.status = 'aprovado'
      and not (r.tool_id = any(p_usadas))
      and r.tool_id in ('oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1')
  )
  select jsonb_build_object('rule_id', e.rule_id, 'system_id', e.system_id, 'rank', e.rank, 'tool_id', e.tool_id,
                            'professional_reason', e.professional_reason, 'next_action', e.next_action, 'pulou_concluida', e.concluida)
  from elegiveis e
  order by e.concluida asc, e.rank asc
  limit 1;
$$;
revoke all on function public.proximos_passos_escolher(uuid, text, text[], text[]) from public, anon, authenticated;

commit;
