-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 3 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Semente, bloco 2: as regras 16-30, a conferencia (30 regras, 5 sistemas) e o content_hash.
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if (select count(*) from public.holos_recommendation_rules where catalog_version = 1) < 15 then raise exception 'rode a PARTE 2 antes (regras 1-15 nao existem)'; end if;
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

commit;
