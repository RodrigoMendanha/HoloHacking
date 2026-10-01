-- V1, Etapa 4.2 — CONTRATO METODOLOGICO V1 NO BANCO (decisoes humanas fechadas).
-- NAO APLICADA em producao. Entra depois de 130000..190000 (cadeia ainda nao
-- validada no banco real: o pacote candidato NAO e publicado ate esse gate).
--
-- O que isto faz (estrutura e validador; nenhum dado metodologico e gravado):
--   1. Linhagem e provenance: methodology_packages.lineage (pacote anterior,
--      versao, status e hash); legacy jsonb em associacoes, sistemas e faixas
--      (peso recuperado = legacy_recovered_weight, textos e mensagens antigos),
--      preservados sem entrar no calculo nem na exibicao oficial.
--   2. Limites exatos de faixa: lower_bound_exact / upper_bound_exact ("10/3").
--   3. Contexto temporal com valores permitidos (7) e papeis de associacao
--      conhecidos; secondary_contextual nunca tem peso (nao pontua).
--   4. rule_type 'suggestion' (politica de sugestao: automatica = false na V1).
--   5. validar_pacote_metodologico com o contrato V1: contexto temporal,
--      exatamente um primario pontuavel por pergunta, Triada pelo bloco,
--      secundaria sem peso, ausencia nunca zero, Indice sem parcial e sem
--      renormalizacao, cobertura minima explicita, textos causais fora do
--      conteudo oficial, sugestao automatica proibida. O validador APONTA.

alter table public.methodology_packages add column if not exists lineage jsonb;
alter table public.methodology_associations add column if not exists legacy jsonb;
alter table public.methodology_systems add column if not exists legacy jsonb;
alter table public.methodology_ranges add column if not exists legacy jsonb;
alter table public.methodology_ranges add column if not exists lower_bound_exact text;
alter table public.methodology_ranges add column if not exists upper_bound_exact text;

alter table public.methodology_ranges add constraint methodology_ranges_limite_exato_formato check (
  (lower_bound_exact is null or lower_bound_exact ~ '^-?[0-9]+(\.[0-9]+)?(/[1-9][0-9]*)?$')
  and (upper_bound_exact is null or upper_bound_exact ~ '^-?[0-9]+(\.[0-9]+)?(/[1-9][0-9]*)?$'));
alter table public.methodology_questions add constraint methodology_questions_contexto_temporal_valido check (
  temporal_context is null or temporal_context in ('ultimos_7_dias','ultimos_30_dias','ultimos_3_meses','atualmente','habitualmente','ao_longo_da_vida','sem_periodo_especifico'));
-- 'secundaria' e 'derivada' continuam aceitos: o pacote importado (historico) permanece reproduzivel.
alter table public.methodology_associations add constraint methodology_associations_papel_conhecido check (
  role is null or role in ('primaria','secondary_contextual','triade_por_bloco','secundaria','derivada'));
alter table public.methodology_associations add constraint methodology_associations_contextual_sem_peso check (
  role is distinct from 'secondary_contextual' or weight is null);
alter table public.methodology_rules drop constraint methodology_rules_tipo_valido;
alter table public.methodology_rules add constraint methodology_rules_tipo_valido check (
  rule_type in ('scoring','absence','index','triad','coverage','comparability','example','suggestion'));

-- Valor de um limite exato ("10/3", "0", "2.5") como numeric; null se ausente.
create or replace function public.metodologia_valor_exato(t text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when t is null then null
              when position('/' in t) > 0 then split_part(t, '/', 1)::numeric / nullif(split_part(t, '/', 2)::numeric, 0)
              else t::numeric end
$$;
revoke all on function public.metodologia_valor_exato(text) from public, anon;
grant execute on function public.metodologia_valor_exato(text) to authenticated;

create or replace function public.validar_pacote_metodologico(p_package_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  erros jsonb := '[]'::jsonb; avisos jsonb := '[]'::jsonb; r record; r2 record; n int; soma numeric; ant record; sist text[]; eixos text[] := array['fisico','mental','espiritual'];
  idx jsonb; aus jsonb; tri jsonb; x numeric; termo text;
  contextos text[] := array['ultimos_7_dias','ultimos_30_dias','ultimos_3_meses','atualmente','habitualmente','ao_longo_da_vida','sem_periodo_especifico'];
  causais text[] := array['impacto espiritual','plexo solar','queda de frequência','queda de frequencia','dessintoniza','bloqueio energético','bloqueio energetico'];
begin
  perform 1 from public.methodology_packages p where p.id = p_package_id;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  select coalesce(array_agg(s.code), '{}') into sist from public.methodology_systems s where s.package_id = p_package_id;

  -- IDs duplicados (mesmo stable_id em mais de uma edicao / linha)
  for r in select q.stable_id, count(*) c from public.methodology_questions q where q.package_id = p_package_id group by q.stable_id having count(*) > 1 loop
    erros := erros || jsonb_build_object('codigo','id_duplicado','onde',r.stable_id,'mensagem','stable_id em '||r.c||' linhas do pacote');
  end loop;
  -- escala ausente / inexistente (escala desconhecida nunca vira frequencia)
  for r in select q.stable_id, q.scale_code from public.methodology_questions q where q.package_id = p_package_id loop
    if r.scale_code is null then erros := erros || jsonb_build_object('codigo','escala_ausente','onde',r.stable_id,'mensagem','pergunta sem escala');
    elsif not exists (select 1 from public.methodology_scales s where s.package_id = p_package_id and s.code = r.scale_code) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.stable_id,'mensagem','escala "'||r.scale_code||'" nao existe no pacote'); end if;
  end loop;
  -- orientacao ausente (nunca inferida) e contexto temporal
  for r in select q.stable_id, q.orientation, q.temporal_context, q.block from public.methodology_questions q where q.package_id = p_package_id loop
    if r.orientation is null then erros := erros || jsonb_build_object('codigo','orientacao_ausente','onde',r.stable_id,'mensagem','orientacao nao definida (ausente nao e direta)'); end if;
    if r.temporal_context is null then erros := erros || jsonb_build_object('codigo','contexto_temporal_ausente','onde',r.stable_id,'mensagem','pergunta sem contexto temporal');
    elsif not (r.temporal_context = any(contextos)) then erros := erros || jsonb_build_object('codigo','contexto_temporal_invalido','onde',r.stable_id,'mensagem','contexto temporal desconhecido: '||r.temporal_context); end if;
    -- sistema primario: exatamente um
    select count(*) filter (where a.destination_type = 'system'), count(*) filter (where a.destination_type = 'system' and a.role = 'primaria') into n, soma
      from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = r.stable_id;
    if n = 0 then erros := erros || jsonb_build_object('codigo','associacao_orfa','onde',r.stable_id,'mensagem','pergunta sem associacao a sistema');
    elsif soma = 0 then erros := erros || jsonb_build_object('codigo','primaria_ausente','onde',r.stable_id,'mensagem','pergunta sem sistema primario pontuavel');
    elsif soma > 1 then erros := erros || jsonb_build_object('codigo','primaria_multipla','onde',r.stable_id,'mensagem',soma||' sistemas primarios pontuaveis (o contrato exige exatamente um)'); end if;
    -- Triada: exatamente um eixo, o do bloco
    select count(*) into n from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = r.stable_id and a.destination_type = 'triad';
    if n = 0 then erros := erros || jsonb_build_object('codigo','triade_ausente','onde',r.stable_id,'mensagem','pergunta sem eixo da Triada');
    elsif n > 1 then erros := erros || jsonb_build_object('codigo','triade_multipla','onde',r.stable_id,'mensagem',n||' vinculos de Triada (o contrato exige exatamente um)');
    elsif exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = r.stable_id and a.destination_type = 'triad'
        and a.destination_id <> case r.block when 'fisico' then 'fisico' when 'mental_emocional' then 'mental' else 'espiritual' end) then
      erros := erros || jsonb_build_object('codigo','triade_eixo_divergente','onde',r.stable_id,'mensagem','bloco '||r.block||' exige o eixo do proprio bloco'); end if;
  end loop;
  -- associacoes: referencia inexistente, papel, peso, conflito nao resolvido
  for r in select a.* from public.methodology_associations a where a.package_id = p_package_id loop
    if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id and q.stable_id = r.question_stable_id) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id,'mensagem','associacao aponta para pergunta que nao existe no pacote'); end if;
    if r.destination_type = 'system' and not (r.destination_id = any(sist)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','sistema de destino nao existe no pacote'); end if;
    if r.destination_type = 'triad' and not (r.destination_id = any(eixos)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','eixo da Triada desconhecido'); end if;
    if r.destination_type = 'system' and (r.role is null or r.role not in ('primaria','secondary_contextual')) then
      erros := erros || jsonb_build_object('codigo','papel_invalido','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','papel de associacao desconhecido: '||coalesce(r.role,'AUSENTE')||' (permitidos: primaria, secondary_contextual)'); end if;
    if r.destination_type = 'system' and r.role = 'secondary_contextual' then
      if r.weight is not null then erros := erros || jsonb_build_object('codigo','secundaria_pontuavel','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','associacao secondary_contextual nao pontua: peso deve ser nulo'); end if;
    elsif r.weight is null then erros := erros || jsonb_build_object('codigo','peso_ausente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','peso obrigatorio ausente');
    elsif r.weight <= 0 then erros := erros || jsonb_build_object('codigo','peso_invalido','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','peso deve ser positivo'); end if;
    if r.conflict then erros := erros || jsonb_build_object('codigo','conflito_pendente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem',coalesce(r.conflict_note,'associacao em conflito nao resolvido')); end if;
  end loop;
  -- SNT pendente: perguntas marcadas pendentes de homologacao de vinculo (conflito em associacao primaria)
  if exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.conflict and a.question_stable_id in ('SNT-101','SNT-501')) then
    erros := erros || jsonb_build_object('codigo','snt_pendente','onde','SNT-101/SNT-501','mensagem','vinculos de SNT-101/SNT-501 pendentes de homologacao');
  end if;
  -- faixas: limites exatos coerentes, textos sem termo causal
  for r in select * from public.methodology_ranges f where f.package_id = p_package_id loop
    if r.lower_bound_exact is not null and abs(public.metodologia_valor_exato(r.lower_bound_exact) - r.lower_bound) > 0.000000001 then
      erros := erros || jsonb_build_object('codigo','faixa_limite_inconsistente','onde',r.destination_id||'/'||r.label,'mensagem','lower_bound_exact "'||r.lower_bound_exact||'" nao corresponde a lower_bound'); end if;
    if r.upper_bound_exact is not null and abs(public.metodologia_valor_exato(r.upper_bound_exact) - r.upper_bound) > 0.000000001 then
      erros := erros || jsonb_build_object('codigo','faixa_limite_inconsistente','onde',r.destination_id||'/'||r.label,'mensagem','upper_bound_exact "'||r.upper_bound_exact||'" nao corresponde a upper_bound'); end if;
    foreach termo in array causais loop
      if lower(coalesce(r.message_nutri,'') || ' ' || coalesce(r.message_paciente,'') || ' ' || coalesce(r.label,'')) like '%' || termo || '%' then
        erros := erros || jsonb_build_object('codigo','texto_causal','onde',r.destination_id||'/'||r.label,'mensagem','mensagem contem termo causal proibido: '||termo); end if;
    end loop;
  end loop;
  -- faixas: ordem, lacuna, sobreposicao, cobertura do dominio 0..10 por destino
  for r in select distinct a.destination_type, a.destination_id from public.methodology_ranges a where a.package_id = p_package_id loop
    ant := null; n := 0;
    for r2 in select * from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = r.destination_type and f.destination_id = r.destination_id order by f.lower_bound, f.upper_bound loop
      n := n + 1;
      if r2.lower_bound >= r2.upper_bound then erros := erros || jsonb_build_object('codigo','faixa_ordem_invalida','onde',r.destination_id||'/'||r2.label,'mensagem','limite inferior >= superior'); end if;
      if n > 1 then
        if r2.lower_bound < ant.upper_bound or (r2.lower_bound = ant.upper_bound and r2.lower_inclusive and ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_sobreposta','onde',r.destination_id||'/'||r2.label,'mensagem','sobrepoe "'||ant.label||'"');
        elsif r2.lower_bound > ant.upper_bound or (r2.lower_bound = ant.upper_bound and not r2.lower_inclusive and not ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','lacuna entre "'||ant.label||'" e "'||r2.label||'"');
        end if;
      elsif r2.lower_bound > 0 or not r2.lower_inclusive then
        erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','dominio nao comeca em 0 inclusivo');
      end if;
      ant := r2;
    end loop;
    if n > 0 and r.destination_type <> 'index' and (ant.upper_bound < 10 or not ant.upper_inclusive) then
      erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||ant.label,'mensagem','dominio nao termina em 10 inclusivo');
    end if;
  end loop;
  -- sistema sem faixa; textos de sistema
  for r in select s.* from public.methodology_systems s where s.package_id = p_package_id loop
    if not exists (select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = 'system' and f.destination_id = r.code) then
      erros := erros || jsonb_build_object('codigo','faixa_ausente','onde',r.code,'mensagem','sistema sem faixas'); end if;
    foreach termo in array causais loop
      if lower(coalesce(r.name,'') || ' ' || coalesce(r.public_text,'') || ' ' || coalesce(r.definition,'') || ' ' || coalesce(r.emotional_pattern,'') || ' ' || coalesce(r.spiritual_impact,'')) like '%' || termo || '%' then
        erros := erros || jsonb_build_object('codigo','texto_causal','onde',r.code,'mensagem','texto do sistema contem termo causal proibido: '||termo); end if;
    end loop;
    if r.emotional_pattern is not null or r.spiritual_impact is not null then
      erros := erros || jsonb_build_object('codigo','texto_causal_legado','onde',r.code,'mensagem','padrao emocional / impacto espiritual recuperados nao entram em conteudo oficial (preservar em legacy)'); end if;
  end loop;
  -- regras obrigatorias: ausencia (nunca zero; so denominador dos respondidos; cobertura minima explicita)
  select x.payload into aus from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'absence' limit 1;
  if aus is null or not (aus ? 'denominador' and aus ? 'cobertura_minima' and aus ? 'recusado' and aus ? 'nao_aplicavel' and aus ? 'minimos')
      or jsonb_typeof(aus->'denominador') = 'null' or jsonb_typeof(aus->'cobertura_minima') = 'null' then
    erros := erros || jsonb_build_object('codigo','politica_parcialidade_ausente','onde','absence','mensagem','politica de ausencia/parcialidade incompleta (denominador, cobertura_minima, recusado, nao_aplicavel, minimos)');
  else
    if aus->>'denominador' <> 'respondidos' then
      erros := erros || jsonb_build_object('codigo','politica_parcialidade_invalida','onde','absence','mensagem','denominador "'||(aus->>'denominador')||'" nao suportado (contrato: respondidos)'); end if;
    if jsonb_typeof(aus->'cobertura_minima') <> 'number' or (aus->>'cobertura_minima')::numeric <= 0 or (aus->>'cobertura_minima')::numeric > 1 then
      erros := erros || jsonb_build_object('codigo','politica_parcialidade_invalida','onde','absence','mensagem','cobertura_minima deve ser numero em (0, 1]'); end if;
    if aus->>'em_branco' in ('zero','0') or aus->>'recusado' in ('zero','0') or aus->>'nao_aplicavel' in ('zero','0') or aus->>'conta_como_zero' = 'true' then
      erros := erros || jsonb_build_object('codigo','politica_parcialidade_invalida','onde','absence','mensagem','ausencia nao e zero'); end if;
  end if;
  select x.payload into idx from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'index' and x.target = 'global';
  if idx is null or not (idx ? 'alphas') or not (idx ? 'elegibilidade') or not (idx ? 'indice_parcial') then
    erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','configuracao do Indice incompleta (alphas, elegibilidade, indice_parcial)');
  else
    soma := 0;
    for r2 in select key, value from jsonb_each(idx->'alphas') loop
      if not (r2.key = any(sist)) then erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde','index/'||r2.key,'mensagem','alpha para sistema inexistente'); end if;
      if jsonb_typeof(r2.value) <> 'number' then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.key,'mensagem','alpha ausente'); else soma := soma + (r2.value)::numeric; end if;
    end loop;
    for r2 in select unnest(sist) as code loop
      if not (idx->'alphas' ? r2.code) then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.code,'mensagem','sistema sem alpha'); end if;
    end loop;
    if abs(soma - 1) > 0.0001 then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','alphas somam '||soma||', esperado 1'); end if;
    if idx->'indice_parcial' is distinct from 'false'::jsonb then erros := erros || jsonb_build_object('codigo','indice_parcial_proibido','onde','index','mensagem','Indice parcial nao existe no contrato (indice_parcial deve ser false)'); end if;
    if idx->'renormalizacao' = 'true'::jsonb then erros := erros || jsonb_build_object('codigo','indice_parcial_proibido','onde','index','mensagem','renormalizacao do Indice proibida'); end if;
  end if;
  for r in select unnest(eixos) as eixo loop
    select x.payload into tri from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'triad' and x.target = r.eixo;
    if tri is null or not (tri ? 'contribuicao' and tri ? 'escala' and tri ? 'elegibilidade' and tri ? 'agregacao') then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','configuracao do eixo incompleta (contribuicao, escala, elegibilidade, agregacao)');
    elsif jsonb_typeof(tri->'cobertura_minima') is distinct from 'number' or (tri->>'cobertura_minima')::numeric <= 0 or (tri->>'cobertura_minima')::numeric > 1 then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','cobertura_minima do eixo deve ser numero em (0, 1]');
    elsif tri->'nota_global' = 'true'::jsonb then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','nota global da Triada nao existe no contrato');
    end if;
  end loop;
  for r in select unnest(sist) as code loop
    if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'scoring' and x.target = r.code and x.payload ? 'formula') then
      erros := erros || jsonb_build_object('codigo','regra_incompleta','onde','scoring/'||r.code,'mensagem','sistema sem regra de pontuacao'); end if;
  end loop;
  -- sugestao automatica: nenhuma oficial
  for r in select x.target, x.payload from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'suggestion' loop
    if r.payload->'automatica' is distinct from 'false'::jsonb then
      erros := erros || jsonb_build_object('codigo','sugestao_automatica_proibida','onde','suggestion/'||r.target,'mensagem','nenhuma combinacao ou sugestao automatica e oficial (automatica deve ser false)'); end if;
  end loop;
  -- exemplo deterministico com resultado esperado (a conferencia numerica e do motor: PacoteMetodologico.validar / testes)
  if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'example' and x.payload ? 'entrada' and x.payload ? 'esperado' and jsonb_typeof(x.payload->'esperado') <> 'null') then
    erros := erros || jsonb_build_object('codigo','exemplo_sem_resultado','onde','example','mensagem','nenhum exemplo deterministico com resultado esperado');
  end if;
  -- elementos nao aprovados individualmente
  select count(*) into n from (
    select 1 from public.methodology_questions q where q.package_id = p_package_id and q.status <> 'aprovado'
    union all select 1 from public.methodology_associations a where a.package_id = p_package_id and a.status <> 'aprovado'
    union all select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.status <> 'aprovado'
    union all select 1 from public.methodology_systems s where s.package_id = p_package_id and s.status <> 'aprovado'
    union all select 1 from public.methodology_scales e where e.package_id = p_package_id and e.status <> 'aprovado'
    union all select 1 from public.methodology_rules x where x.package_id = p_package_id and x.status <> 'aprovado') z;
  if n > 0 then erros := erros || jsonb_build_object('codigo','elemento_nao_aprovado','onde','pacote','mensagem',n||' elemento(s) com status diferente de aprovado'); end if;
  if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id) then
    erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem perguntas'); end if;
  if coalesce(array_length(sist,1),0) = 0 then erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem sistemas'); end if;
  return jsonb_build_object('erros', erros, 'avisos', avisos, 'publicavel', jsonb_array_length(erros) = 0, 'total_erros', jsonb_array_length(erros));
end;
$$;
revoke all on function public.validar_pacote_metodologico(uuid) from public, anon;
grant execute on function public.validar_pacote_metodologico(uuid) to authenticated;
