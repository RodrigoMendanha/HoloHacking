-- ============================================================================
-- PROXIMOS PASSOS HOLOS V1 — motor oficial de recomendacao de ferramentas (decisao de produto 09/10/2026)
-- ============================================================================
-- HOLOSCAN -> Resultado -> sistemas prioritarios ("Por onde investigar") -> Proximos Passos HOLOS -> ferramenta
-- recomendada + explicacao + botao para iniciar. A nutricionista nao preenche nada para receber a recomendacao.
--
--   * catalogo HOLOS-RECOMENDACOES-V1: 30 regras APROVADAS (6 por sistema, rank 1..6), configuracao GLOBAL, somente
--     leitura para o frontend, imutavel por gatilho (nova versao = nova migration + nova linha de catalogo);
--   * NAO cria HOLOS-V1@3 nem toca methodology_* (perguntas, pesos, associacoes, faixas, mensagens, calculo);
--   * exames, documentos, Leitura Integrada e as REC/SEL legadas (corpo-bancos.js) NAO entram: o motor le SO
--     holoscan_system_scores / holoscan_answers da aplicacao oficial, o catalogo e tool_applications do atendimento;
--   * snapshot separado (holos_next_steps), um por (aplicacao, catalogo): reproduzivel, imutavel, nunca reescreve a
--     aplicacao nem o snapshot antigo quando o catalogo mudar; nao mistura recomendacao com score.
-- NAO DESTRUTIVA: nenhum dado clinico existente e alterado.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. CATALOGO (global, somente leitura, imutavel)
-- ----------------------------------------------------------------------------
create table if not exists public.holos_recommendation_catalogs (
  id            uuid primary key default gen_random_uuid(),
  code          text not null,
  version       integer not null,
  status        text not null,
  content_hash  text not null,
  provenance    text not null,
  approved_at   timestamptz not null,
  approved_by   uuid references auth.users(id),   -- nulo: aprovacao expressa registrada fora do sistema (ver provenance)
  created_at    timestamptz not null default now(),
  constraint holos_recommendation_catalogs_unico unique (code, version),
  constraint holos_recommendation_catalogs_status check (status in ('aprovado', 'retirado')),
  constraint holos_recommendation_catalogs_versao check (version >= 1)
);
comment on table public.holos_recommendation_catalogs is 'Catalogos de recomendacao de ferramentas (Proximos Passos HOLOS). Global; muda so por migration versionada.';

create table if not exists public.holos_recommendation_rules (
  id                  uuid primary key default gen_random_uuid(),
  catalog_id          uuid not null references public.holos_recommendation_catalogs(id),
  rule_id             text not null,
  catalog_code        text not null,
  catalog_version     integer not null,
  system_id           text not null,
  rank                integer not null,
  tool_id             text not null,
  professional_reason text not null,
  next_action         text not null,
  status              text not null,
  provenance          text not null,
  approved_at         timestamptz not null,
  approved_by         uuid references auth.users(id),
  created_at          timestamptz not null default now(),
  constraint holos_recommendation_rules_rule_id_unico unique (rule_id),
  constraint holos_recommendation_rules_rank_unico unique (catalog_id, system_id, rank),
  constraint holos_recommendation_rules_tool_unico unique (catalog_id, system_id, tool_id),
  constraint holos_recommendation_rules_status check (status in ('aprovado', 'retirado')),
  constraint holos_recommendation_rules_rank check (rank between 1 and 6),
  constraint holos_recommendation_rules_sistema check (system_id in ('fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual')),
  constraint holos_recommendation_rules_ferramenta check (tool_id in ('oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1')),
  constraint holos_recommendation_rules_textos check (char_length(professional_reason) between 1 and 400 and char_length(next_action) between 1 and 400)
);
comment on table public.holos_recommendation_rules is 'Regras do catalogo de Proximos Passos HOLOS: sistema -> ferramenta (uma das 10 ativas), em ordem metodologica (rank). Nunca usa exames.';
create index if not exists holos_recommendation_rules_catalogo on public.holos_recommendation_rules (catalog_id, system_id, rank);

-- semente: HOLOS-RECOMENDACOES-V1 (30 regras aprovadas em 09/10/2026), em dois blocos (para caber no SQL Editor)
-- bloco 1: o catalogo (hash 'pendente' ate o bloco 2) e as regras 1-15 (fungico, acido-inflamatorio, metabolico 01-03)
do $$
declare cid uuid;
begin
  if exists (select 1 from public.holos_recommendation_catalogs where code = 'HOLOS-RECOMENDACOES-V1' and version = 1) then return; end if;
  insert into public.holos_recommendation_catalogs (code, version, status, content_hash, provenance, approved_at)
    values ('HOLOS-RECOMENDACOES-V1', 1, 'aprovado', 'pendente', 'aprovacao metodologica expressa do responsavel pelo projeto em 09/10/2026 (decisao registrada em docs/v1/DECISOES-V1.md, item 176)', '2026-10-09')
    returning id into cid;
  insert into public.holos_recommendation_rules (catalog_id, catalog_code, catalog_version, status, provenance, approved_at, rule_id, system_id, rank, tool_id, professional_reason, next_action)
  select cid, 'HOLOS-RECOMENDACOES-V1', 1, 'aprovado', 'aprovacao metodologica expressa do responsavel pelo projeto em 09/10/2026 (decisao registrada em docs/v1/DECISOES-V1.md, item 176)', '2026-10-09'::timestamptz,
         v.rule_id, v.system_id, v.rank, v.tool_id, v.professional_reason, v.next_action
  from (values
  ('REC-FUN-01', 'fungico', 1, 'mapa_rotina_v1', 'Ajuda a localizar alimentação, horários, sinais percebidos e hábitos dentro do cotidiano real.', 'Aplique o Mapa da Rotina com foco em refeições, intervalos, sono, rotina e momentos em que os sinais são percebidos.'),
  ('REC-FUN-02', 'fungico', 2, 'gatilhos_respostas_v1', 'Ajuda a investigar o que costuma acontecer antes de comportamentos alimentares recorrentes.', 'Escolha um episódio recente e organize situação, pensamento ou emoção relatada, resposta e consequência percebida.'),
  ('REC-FUN-03', 'fungico', 3, 'mapa_crencas', 'Permite investigar ideias e regras sobre alimentação que podem estar influenciando escolhas.', 'Identifique uma crença relevante, sua origem percebida, as situações em que aparece e seu impacto relatado.'),
  ('REC-FUN-04', 'fungico', 4, 'linha_momentum', 'Ajuda a compreender quanto espaço físico, mental e prático existe hoje para sustentar mudanças.', 'Avalie as dimensões do Momentum e use essa leitura para calibrar a exigência da etapa.'),
  ('REC-FUN-05', 'fungico', 5, 'oq3', 'Ajuda a transformar diferentes pontos possíveis de trabalho em uma prioridade compatível com o momento atual.', 'Organize o que a paciente quer, o que precisa ser abordado e o que consegue sustentar agora.'),
  ('REC-FUN-06', 'fungico', 6, 'conexao_pertencimento_v1', 'Ajuda a compreender como apoio, convivência e ambiente podem influenciar a sustentação dos hábitos.', 'Mapeie pessoas, ambientes e relações que podem apoiar ou dificultar o cuidado.'),
  ('REC-AIN-01', 'acido_inflamatorio', 1, 'mapa_rotina_v1', 'Permite localizar desconfortos e sinais percebidos dentro do contexto de sono, alimentação, movimento e rotina.', 'Mapeie um dia real e identifique em quais momentos os sinais aparecem, diminuem ou se tornam mais perceptíveis.'),
  ('REC-AIN-02', 'acido_inflamatorio', 2, 'linha_momentum', 'Ajuda a calibrar o cuidado à energia, à carga de vida e à capacidade atual de sustentar mudanças.', 'Avalie energia disponível, carga de vida, controle da rotina, suporte, espaço mental e estabilidade atual.'),
  ('REC-AIN-03', 'acido_inflamatorio', 3, 'gatilhos_respostas_v1', 'Ajuda a observar situações recorrentes relacionadas a comportamentos ou desconfortos percebidos sem presumir causalidade.', 'Escolha um episódio concreto e organize a sequência de contexto, resposta percebida e consequência.'),
  ('REC-AIN-04', 'acido_inflamatorio', 4, 'roda_vida', 'Amplia o olhar para áreas da vida que podem estar contribuindo para a percepção de sobrecarga.', 'Aplique a Roda Holística da Vida e identifique quais dimensões merecem maior atenção neste momento.'),
  ('REC-AIN-05', 'acido_inflamatorio', 5, 'conexao_pertencimento_v1', 'Ajuda a reconhecer recursos de apoio e contextos relacionais relevantes para o autocuidado.', 'Mapeie pessoas, espaços e relações que podem funcionar como apoio ou dificuldade neste momento.'),
  ('REC-AIN-06', 'acido_inflamatorio', 6, 'oq3', 'Ajuda a definir foco quando existem diferentes pontos que poderiam ser trabalhados.', 'Organize Quero, Preciso e Consigo para escolher uma prioridade possível para esta etapa.'),
  ('REC-MET-01', 'metabolico', 1, 'mapa_rotina_v1', 'Ajuda a visualizar como refeições, horários, sono, energia e atividades se distribuem no cotidiano.', 'Construa um dia real da paciente e localize refeições, intervalos, sono, atividades, energia e barreiras.'),
  ('REC-MET-02', 'metabolico', 2, 'gatilhos_respostas_v1', 'Ajuda a aprofundar comportamentos alimentares recorrentes dentro das situações em que acontecem.', 'Escolha episódios concretos e observe o que acontece antes, durante e depois do comportamento.'),
  ('REC-MET-03', 'metabolico', 3, 'mapa_crencas', 'Ajuda a identificar crenças sobre alimentação, corpo ou controle que podem estar influenciando escolhas.', 'Mapeie a crença, o contexto em que aparece, o impacto relatado e uma alternativa possível.')
  ) as v(rule_id, system_id, rank, tool_id, professional_reason, next_action);
end $$;
-- bloco 2: as regras 16-30 (metabolico 04-06, detox-linfatico, mental-emocional-espiritual), a conferencia (30 regras, 5 sistemas) e o hash
do $$
declare cid uuid; h text; n int;
begin
  select id into cid from public.holos_recommendation_catalogs where code = 'HOLOS-RECOMENDACOES-V1' and version = 1 and content_hash = 'pendente';
  if cid is null then return; end if;   -- ja semeado por inteiro
  insert into public.holos_recommendation_rules (catalog_id, catalog_code, catalog_version, status, provenance, approved_at, rule_id, system_id, rank, tool_id, professional_reason, next_action)
  select cid, 'HOLOS-RECOMENDACOES-V1', 1, 'aprovado', 'aprovacao metodologica expressa do responsavel pelo projeto em 09/10/2026 (decisao registrada em docs/v1/DECISOES-V1.md, item 176)', '2026-10-09'::timestamptz,
         v.rule_id, v.system_id, v.rank, v.tool_id, v.professional_reason, v.next_action
  from (values
  ('REC-MET-04', 'metabolico', 4, 'linha_momentum', 'Ajuda a avaliar a capacidade atual de sustentar mudanças antes de aumentar a exigência.', 'Avalie as seis dimensões do Momentum e registre o estado escolhido pela profissional.'),
  ('REC-MET-05', 'metabolico', 5, 'oq3', 'Ajuda a transformar o desejo de mudança em uma prioridade compatível com necessidade e capacidade.', 'Trabalhe Quero, Preciso e Consigo para construir um ponto de partida possível.'),
  ('REC-MET-06', 'metabolico', 6, 'carta_futuro', 'Pode ajudar a ampliar a mudança para além do resultado imediato e conectá-la à identidade futura desejada.', 'Conduza uma escrita guiada sobre como a paciente deseja viver e cuidar de si no futuro.'),
  ('REC-DTL-01', 'detox_linfatico', 1, 'mapa_rotina_v1', 'Ajuda a organizar hidratação, refeições, sono, movimento, pausas e outros hábitos dentro da rotina real.', 'Construa uma visão temporal do cotidiano e localize hábitos, barreiras e pontos de apoio.'),
  ('REC-DTL-02', 'detox_linfatico', 2, 'linha_momentum', 'Ajuda a avaliar quanto espaço existe atualmente para acrescentar novas ações.', 'Avalie energia, carga de vida, controle da rotina, apoio, espaço mental e estabilidade.'),
  ('REC-DTL-03', 'detox_linfatico', 3, 'oq3', 'Ajuda a transformar vários pontos de atenção em uma prioridade possível para esta etapa.', 'Organize o que a paciente quer melhorar, o que merece atenção e o que consegue sustentar agora.'),
  ('REC-DTL-04', 'detox_linfatico', 4, 'roda_vida', 'Amplia a leitura do contexto quando diferentes áreas da vida estão ocupando energia e espaço.', 'Aplique a Roda Holística da Vida e identifique a área que merece maior atenção neste momento.'),
  ('REC-DTL-05', 'detox_linfatico', 5, 'conexao_pertencimento_v1', 'Ajuda a reconhecer onde existe apoio disponível e onde a paciente percebe excesso de responsabilidade.', 'Mapeie pessoas, ambientes e recursos de suporte pertinentes ao momento atual.'),
  ('REC-DTL-06', 'detox_linfatico', 6, 'gatilhos_respostas_v1', 'Ajuda a observar situações que antecedem hábitos recorrentes percebidos como difíceis de modificar.', 'Escolha um hábito relevante e aprofunde um episódio concreto com Gatilhos & Respostas.'),
  ('REC-MEE-01', 'mental_emocional_espiritual', 1, 'pqq', 'Ajuda a aprofundar por que a mudança importa e o que ela representa para a paciente.', 'Conduza o PQQ e organize o sentido declarado pela paciente para a mudança.'),
  ('REC-MEE-02', 'mental_emocional_espiritual', 2, 'mapa_crencas', 'Ajuda a tornar visíveis pensamentos e crenças que podem estar influenciando a relação com alimentação e cuidado.', 'Escolha uma crença relevante e investigue contexto, origem percebida, impacto e alternativa possível.'),
  ('REC-MEE-03', 'mental_emocional_espiritual', 3, 'gatilhos_respostas_v1', 'Ajuda a observar padrões recorrentes entre situações vividas e respostas posteriores.', 'Reconstrua um episódio concreto, distinguindo situação, percepção, resposta e consequência.'),
  ('REC-MEE-04', 'mental_emocional_espiritual', 4, 'mapa', 'Ajuda a organizar direção, significado e o que a paciente deseja construir neste momento.', 'Construa o Mapa do Propósito a partir das informações disponíveis, preservando a origem de OQ³ e PQQ quando existirem.'),
  ('REC-MEE-05', 'mental_emocional_espiritual', 5, 'carta_futuro', 'Ajuda a construir uma referência de identidade e direção futura para a mudança.', 'Conduza a Carta ao Futuro Eu como exercício de reflexão sobre como a paciente deseja viver e cuidar de si.'),
  ('REC-MEE-06', 'mental_emocional_espiritual', 6, 'conexao_pertencimento_v1', 'Ajuda a aprofundar relações, apoio, pertencimento e fontes de conexão pertinentes ao momento.', 'Mapeie relações, ambientes e fontes de apoio ou conexão respeitando os limites e preferências da paciente.')
  ) as v(rule_id, system_id, rank, tool_id, professional_reason, next_action);
  select count(*) into n from public.holos_recommendation_rules where catalog_id = cid;
  if n <> 30 then raise exception 'catalogo HOLOS-RECOMENDACOES-V1 deve ter exatamente 30 regras (tem %)', n; end if;
  if (select count(distinct system_id) from public.holos_recommendation_rules where catalog_id = cid) <> 5 then raise exception 'catalogo deve cobrir os 5 sistemas'; end if;
  -- content_hash: sha256 da forma canonica (rule_id|system_id|rank|tool_id|professional_reason|next_action, uma por linha, em ordem de rule_id)
  select encode(sha256(convert_to(string_agg(r.rule_id || '|' || r.system_id || '|' || r.rank || '|' || r.tool_id || '|' || r.professional_reason || '|' || r.next_action, E'\n' order by r.rule_id), 'UTF8')), 'hex')
    into h from public.holos_recommendation_rules r where r.catalog_id = cid;
  update public.holos_recommendation_catalogs set content_hash = h where id = cid;
end $$;

-- imutavel: nem a aplicacao nem o dono do banco alteram; nova versao = nova migration (que recria o gatilho)
create or replace function public.proteger_catalogo_recomendacoes()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'catalogo de recomendacoes e configuracao global aprovada: muda so por migration versionada' using errcode = 'P0001', hint = 'catalogo_imutavel'; end; $$;
revoke all on function public.proteger_catalogo_recomendacoes() from public, anon, authenticated;
drop trigger if exists holos_recommendation_catalogs_proteger on public.holos_recommendation_catalogs;
create trigger holos_recommendation_catalogs_proteger before insert or update or delete on public.holos_recommendation_catalogs for each row execute function public.proteger_catalogo_recomendacoes();
drop trigger if exists holos_recommendation_rules_proteger on public.holos_recommendation_rules;
create trigger holos_recommendation_rules_proteger before insert or update or delete on public.holos_recommendation_rules for each row execute function public.proteger_catalogo_recomendacoes();

alter table public.holos_recommendation_catalogs enable row level security;
alter table public.holos_recommendation_rules enable row level security;
drop policy if exists holos_recommendation_catalogs_select on public.holos_recommendation_catalogs;
create policy holos_recommendation_catalogs_select on public.holos_recommendation_catalogs for select to authenticated using (true);
drop policy if exists holos_recommendation_rules_select on public.holos_recommendation_rules;
create policy holos_recommendation_rules_select on public.holos_recommendation_rules for select to authenticated using (true);
revoke all on table public.holos_recommendation_catalogs, public.holos_recommendation_rules from public, anon, authenticated;
grant select on table public.holos_recommendation_catalogs, public.holos_recommendation_rules to authenticated;

-- ----------------------------------------------------------------------------
-- 2. SNAPSHOT: um por (aplicacao HOLOSCAN, catalogo); imutavel; so por RPC
-- ----------------------------------------------------------------------------
create table if not exists public.holos_next_steps (
  id                       uuid primary key default gen_random_uuid(),
  nutritionist_id          uuid not null default auth.uid() references auth.users(id),
  patient_id               uuid not null,
  encounter_id             uuid,
  holoscan_application_id  uuid not null references public.holoscan_applications(id),
  catalog_id               uuid not null references public.holos_recommendation_catalogs(id),
  catalog_code             text not null,
  catalog_version          integer not null,
  catalog_hash             text not null,
  engine_version           text not null,
  systems_order            jsonb not null,
  selection                jsonb not null,
  content_snapshot         jsonb not null,
  content_hash             text not null,
  created_at               timestamptz not null default now(),
  constraint holos_next_steps_unico unique (holoscan_application_id, catalog_id),
  constraint holos_next_steps_paciente_fk foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete cascade
);
comment on table public.holos_next_steps is 'Proximos Passos HOLOS registrados para uma aplicacao HOLOSCAN e um catalogo: o que foi recomendado, segundo qual catalogo/versao. Nunca reescrito.';
create index if not exists holos_next_steps_aplicacao on public.holos_next_steps (holoscan_application_id, catalog_version desc);

create or replace function public.proteger_proximos_passos()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Proximos Passos registrados sao imutaveis: catalogo novo gera registro novo' using errcode = 'P0001', hint = 'snapshot_imutavel'; end; $$;
revoke all on function public.proteger_proximos_passos() from public, anon, authenticated;
drop trigger if exists holos_next_steps_proteger on public.holos_next_steps;
create trigger holos_next_steps_proteger before update or delete on public.holos_next_steps for each row execute function public.proteger_proximos_passos();

alter table public.holos_next_steps enable row level security;
drop policy if exists holos_next_steps_select on public.holos_next_steps;
create policy holos_next_steps_select on public.holos_next_steps for select to authenticated using (nutritionist_id = (select auth.uid()));
revoke all on table public.holos_next_steps from public, anon, authenticated;
grant select on table public.holos_next_steps to authenticated;

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

-- previa (sem gravar): o que o motor recomenda hoje, pelo catalogo aprovado mais recente
create or replace function public.proximos_passos_holos(p_application_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); r jsonb; reg record;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  r := public.proximos_passos_calcular(uid, p_application_id);
  select n.id, n.created_at into reg from public.holos_next_steps n where n.nutritionist_id = uid and n.holoscan_application_id = p_application_id and n.catalog_id = (r#>>'{catalogo,id}')::uuid;
  return r || jsonb_build_object('registrado', found, 'registro_id', reg.id, 'registrado_em', reg.created_at);
end;
$$;
revoke all on function public.proximos_passos_holos(uuid) from public, anon;
grant execute on function public.proximos_passos_holos(uuid) to authenticated;

-- registra (uma vez por aplicacao e catalogo). Se ja existe, devolve o registrado — nunca reescreve.
create or replace function public.registrar_proximos_passos(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); r jsonb; reg record; h text; cid uuid;
begin
  if uid is null then raise exception 'sessao obrigatoria' using errcode = '42501'; end if;
  if not public.conta_ativa() then raise exception 'conta aguardando liberacao' using errcode = '42501', hint = 'conta_inativa'; end if;
  r := public.proximos_passos_calcular(uid, p_application_id);
  cid := (r#>>'{catalogo,id}')::uuid;
  select n.* into reg from public.holos_next_steps n where n.nutritionist_id = uid and n.holoscan_application_id = p_application_id and n.catalog_id = cid;
  if found then
    return reg.content_snapshot || jsonb_build_object('registrado', true, 'registro_id', reg.id, 'registrado_em', reg.created_at);
  end if;
  r := r - 'registrado' - 'registro_id' - 'registrado_em';
  h := encode(sha256(convert_to(r::text, 'UTF8')), 'hex');
  insert into public.holos_next_steps (nutritionist_id, patient_id, encounter_id, holoscan_application_id, catalog_id, catalog_code, catalog_version, catalog_hash,
    engine_version, systems_order, selection, content_snapshot, content_hash)
  values (uid, (r->>'patient_id')::uuid, nullif(r->>'encounter_id', '')::uuid, p_application_id, cid, r#>>'{catalogo,code}', (r#>>'{catalogo,version}')::int, r#>>'{catalogo,content_hash}',
    r->>'engine_version', r->'systems_order', r->'selection', r, h)
  returning * into reg;
  return reg.content_snapshot || jsonb_build_object('registrado', true, 'registro_id', reg.id, 'registrado_em', reg.created_at);
end;
$$;
revoke all on function public.registrar_proximos_passos(uuid) from public, anon;
grant execute on function public.registrar_proximos_passos(uuid) to authenticated;

commit;
