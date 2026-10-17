-- =====================================================================
-- PROXIMOS PASSOS HOLOS V1 — PARTE 2 de 8 — rodar INTEIRA no SQL Editor (uma transacao).
-- Semente, bloco 1: o catalogo (hash pendente) e as regras 1-15.
-- Rode as partes NA ORDEM (1 a 8). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez ("if not exists" / "create or replace"; a semente so entra uma vez).
-- NAO DESTRUTIVA: nenhum dado clinico e alterado; HOLOS-V1@2 (methodology_*) nao e tocado.
-- Conteudo identico a supabase/migrations/20261012100000_proximos_passos_holos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regclass('public.holos_recommendation_rules') is null then raise exception 'rode a PARTE 1 antes (tabelas do catalogo nao existem)'; end if;
end $$;
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

commit;
