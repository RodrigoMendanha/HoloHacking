/**
 * HOLOS-RECOMENDACOES-V1 — as 30 regras aprovadas (aprovacao metodologica expressa do responsavel pelo projeto em
 * 09/10/2026). Este arquivo e a FIXTURE do servidor falso e a referencia do teste que confere a migration
 * 20261012100000 (testar-proximos-passos-motor.mjs): o conteudo tem de ser IDENTICO ao SQL. O navegador NUNCA le
 * daqui — ele le a tabela holos_recommendation_rules do servidor.
 */
export const CATALOGO = { code: 'HOLOS-RECOMENDACOES-V1', version: 1, status: 'aprovado', approved_at: '2026-10-09',
  provenance: 'aprovacao metodologica expressa do responsavel pelo projeto em 09/10/2026 (decisao registrada em docs/v1/DECISOES-V1.md, item 176)' };

const R = (rule_id, system_id, rank, tool_id, professional_reason, next_action) => ({ rule_id, system_id, rank, tool_id, professional_reason, next_action });
export const REGRAS = [
  // ---- SISTEMA FUNGICO
  R('REC-FUN-01', 'fungico', 1, 'mapa_rotina_v1', 'Ajuda a localizar alimentação, horários, sinais percebidos e hábitos dentro do cotidiano real.', 'Aplique o Mapa da Rotina com foco em refeições, intervalos, sono, rotina e momentos em que os sinais são percebidos.'),
  R('REC-FUN-02', 'fungico', 2, 'gatilhos_respostas_v1', 'Ajuda a investigar o que costuma acontecer antes de comportamentos alimentares recorrentes.', 'Escolha um episódio recente e organize situação, pensamento ou emoção relatada, resposta e consequência percebida.'),
  R('REC-FUN-03', 'fungico', 3, 'mapa_crencas', 'Permite investigar ideias e regras sobre alimentação que podem estar influenciando escolhas.', 'Identifique uma crença relevante, sua origem percebida, as situações em que aparece e seu impacto relatado.'),
  R('REC-FUN-04', 'fungico', 4, 'linha_momentum', 'Ajuda a compreender quanto espaço físico, mental e prático existe hoje para sustentar mudanças.', 'Avalie as dimensões do Momentum e use essa leitura para calibrar a exigência da etapa.'),
  R('REC-FUN-05', 'fungico', 5, 'oq3', 'Ajuda a transformar diferentes pontos possíveis de trabalho em uma prioridade compatível com o momento atual.', 'Organize o que a paciente quer, o que precisa ser abordado e o que consegue sustentar agora.'),
  R('REC-FUN-06', 'fungico', 6, 'conexao_pertencimento_v1', 'Ajuda a compreender como apoio, convivência e ambiente podem influenciar a sustentação dos hábitos.', 'Mapeie pessoas, ambientes e relações que podem apoiar ou dificultar o cuidado.'),
  // ---- SISTEMA ACIDO-INFLAMATORIO
  R('REC-AIN-01', 'acido_inflamatorio', 1, 'mapa_rotina_v1', 'Permite localizar desconfortos e sinais percebidos dentro do contexto de sono, alimentação, movimento e rotina.', 'Mapeie um dia real e identifique em quais momentos os sinais aparecem, diminuem ou se tornam mais perceptíveis.'),
  R('REC-AIN-02', 'acido_inflamatorio', 2, 'linha_momentum', 'Ajuda a calibrar o cuidado à energia, à carga de vida e à capacidade atual de sustentar mudanças.', 'Avalie energia disponível, carga de vida, controle da rotina, suporte, espaço mental e estabilidade atual.'),
  R('REC-AIN-03', 'acido_inflamatorio', 3, 'gatilhos_respostas_v1', 'Ajuda a observar situações recorrentes relacionadas a comportamentos ou desconfortos percebidos sem presumir causalidade.', 'Escolha um episódio concreto e organize a sequência de contexto, resposta percebida e consequência.'),
  R('REC-AIN-04', 'acido_inflamatorio', 4, 'roda_vida', 'Amplia o olhar para áreas da vida que podem estar contribuindo para a percepção de sobrecarga.', 'Aplique a Roda Holística da Vida e identifique quais dimensões merecem maior atenção neste momento.'),
  R('REC-AIN-05', 'acido_inflamatorio', 5, 'conexao_pertencimento_v1', 'Ajuda a reconhecer recursos de apoio e contextos relacionais relevantes para o autocuidado.', 'Mapeie pessoas, espaços e relações que podem funcionar como apoio ou dificuldade neste momento.'),
  R('REC-AIN-06', 'acido_inflamatorio', 6, 'oq3', 'Ajuda a definir foco quando existem diferentes pontos que poderiam ser trabalhados.', 'Organize Quero, Preciso e Consigo para escolher uma prioridade possível para esta etapa.'),
  // ---- SISTEMA METABOLICO
  R('REC-MET-01', 'metabolico', 1, 'mapa_rotina_v1', 'Ajuda a visualizar como refeições, horários, sono, energia e atividades se distribuem no cotidiano.', 'Construa um dia real da paciente e localize refeições, intervalos, sono, atividades, energia e barreiras.'),
  R('REC-MET-02', 'metabolico', 2, 'gatilhos_respostas_v1', 'Ajuda a aprofundar comportamentos alimentares recorrentes dentro das situações em que acontecem.', 'Escolha episódios concretos e observe o que acontece antes, durante e depois do comportamento.'),
  R('REC-MET-03', 'metabolico', 3, 'mapa_crencas', 'Ajuda a identificar crenças sobre alimentação, corpo ou controle que podem estar influenciando escolhas.', 'Mapeie a crença, o contexto em que aparece, o impacto relatado e uma alternativa possível.'),
  R('REC-MET-04', 'metabolico', 4, 'linha_momentum', 'Ajuda a avaliar a capacidade atual de sustentar mudanças antes de aumentar a exigência.', 'Avalie as seis dimensões do Momentum e registre o estado escolhido pela profissional.'),
  R('REC-MET-05', 'metabolico', 5, 'oq3', 'Ajuda a transformar o desejo de mudança em uma prioridade compatível com necessidade e capacidade.', 'Trabalhe Quero, Preciso e Consigo para construir um ponto de partida possível.'),
  R('REC-MET-06', 'metabolico', 6, 'carta_futuro', 'Pode ajudar a ampliar a mudança para além do resultado imediato e conectá-la à identidade futura desejada.', 'Conduza uma escrita guiada sobre como a paciente deseja viver e cuidar de si no futuro.'),
  // ---- SISTEMA DETOX + LINFATICO
  R('REC-DTL-01', 'detox_linfatico', 1, 'mapa_rotina_v1', 'Ajuda a organizar hidratação, refeições, sono, movimento, pausas e outros hábitos dentro da rotina real.', 'Construa uma visão temporal do cotidiano e localize hábitos, barreiras e pontos de apoio.'),
  R('REC-DTL-02', 'detox_linfatico', 2, 'linha_momentum', 'Ajuda a avaliar quanto espaço existe atualmente para acrescentar novas ações.', 'Avalie energia, carga de vida, controle da rotina, apoio, espaço mental e estabilidade.'),
  R('REC-DTL-03', 'detox_linfatico', 3, 'oq3', 'Ajuda a transformar vários pontos de atenção em uma prioridade possível para esta etapa.', 'Organize o que a paciente quer melhorar, o que merece atenção e o que consegue sustentar agora.'),
  R('REC-DTL-04', 'detox_linfatico', 4, 'roda_vida', 'Amplia a leitura do contexto quando diferentes áreas da vida estão ocupando energia e espaço.', 'Aplique a Roda Holística da Vida e identifique a área que merece maior atenção neste momento.'),
  R('REC-DTL-05', 'detox_linfatico', 5, 'conexao_pertencimento_v1', 'Ajuda a reconhecer onde existe apoio disponível e onde a paciente percebe excesso de responsabilidade.', 'Mapeie pessoas, ambientes e recursos de suporte pertinentes ao momento atual.'),
  R('REC-DTL-06', 'detox_linfatico', 6, 'gatilhos_respostas_v1', 'Ajuda a observar situações que antecedem hábitos recorrentes percebidos como difíceis de modificar.', 'Escolha um hábito relevante e aprofunde um episódio concreto com Gatilhos & Respostas.'),
  // ---- SISTEMA MENTAL-EMOCIONAL-ESPIRITUAL
  R('REC-MEE-01', 'mental_emocional_espiritual', 1, 'pqq', 'Ajuda a aprofundar por que a mudança importa e o que ela representa para a paciente.', 'Conduza o PQQ e organize o sentido declarado pela paciente para a mudança.'),
  R('REC-MEE-02', 'mental_emocional_espiritual', 2, 'mapa_crencas', 'Ajuda a tornar visíveis pensamentos e crenças que podem estar influenciando a relação com alimentação e cuidado.', 'Escolha uma crença relevante e investigue contexto, origem percebida, impacto e alternativa possível.'),
  R('REC-MEE-03', 'mental_emocional_espiritual', 3, 'gatilhos_respostas_v1', 'Ajuda a observar padrões recorrentes entre situações vividas e respostas posteriores.', 'Reconstrua um episódio concreto, distinguindo situação, percepção, resposta e consequência.'),
  R('REC-MEE-04', 'mental_emocional_espiritual', 4, 'mapa', 'Ajuda a organizar direção, significado e o que a paciente deseja construir neste momento.', 'Construa o Mapa do Propósito a partir das informações disponíveis, preservando a origem de OQ³ e PQQ quando existirem.'),
  R('REC-MEE-05', 'mental_emocional_espiritual', 5, 'carta_futuro', 'Ajuda a construir uma referência de identidade e direção futura para a mudança.', 'Conduza a Carta ao Futuro Eu como exercício de reflexão sobre como a paciente deseja viver e cuidar de si.'),
  R('REC-MEE-06', 'mental_emocional_espiritual', 6, 'conexao_pertencimento_v1', 'Ajuda a aprofundar relações, apoio, pertencimento e fontes de conexão pertinentes ao momento.', 'Mapeie relações, ambientes e fontes de apoio ou conexão respeitando os limites e preferências da paciente.'),
];

/** A mesma string canonica que a migration usa para o content_hash do catalogo (sha256 hex). */
export function canonico(regras) {
  return regras.slice().sort((a, b) => a.rule_id.localeCompare(b.rule_id))
    .map(r => [r.rule_id, r.system_id, r.rank, r.tool_id, r.professional_reason, r.next_action].join('|')).join('\n');
}
