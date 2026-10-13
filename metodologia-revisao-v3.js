/* ===========================================================================
   DECISOES METODOLOGICAS DE 13/10/2026 -> HOLOS-V1 v4
   (o arquivo mantem o nome e a variavel MetodologiaRevisaoV3 porque a tela de
   Homologacao, os scripts e a publicacao direta leem esse nome)

   POR QUE v4 (13/10, 05:37 UTC): um navegador com o front antigo (46cab4e) ainda
   carregado publicou o RASCUNHO de 12/10 como HOLOS-V1 v3 em producao. Um pacote
   publicado e imutavel e nao e apagado: o v3 fica no historico (0 aplicacoes) e
   estas decisoes entram como v4, que ao ser publicada retira o v3. O conteudo e o
   mesmo testado como "v3"; so o numero da versao muda.
   ===========================================================================

   Origem: decisoes explicitas de Rodrigo na revisao de 13/10/2026 (regra
   operacional: decisao explicita de Rodrigo = autorizacao para implementar).
   Base: o pacote ATIVO em producao, HOLOS-V1 v2. SO estas decisoes; o rascunho
   de 12/10 (textos revisados, trocas, ESP-404, SNT-209, ESP-102) NAO entra —
   ele ficou arquivado em docs/v1/metodologia/historico/ e nao e fonte desta
   versao.

   Este arquivo e SO a lista de decisoes. Quem monta a versao nova e
   PacoteMetodologico.aplicarRevisao(v2, esta revisao): copia o v2, aplica
   exatamente isto e devolve o v4 em_revisao; a publicacao direta
   (publicar_pacote_metodologico) poe o v4 no ar e retira a versao no ar (o v3).

   O HOLOS-V1 v2 NAO muda. Aplicacoes, respostas, notas, sinais dominantes,
   Resultados HOLOS, Proximos Passos e emissoes (PDF) ja salvos continuam no v2.

   Regra metodologica ativa (13/10/2026):
   - "Uma relacao holistica, simbolica ou contextual entre emocao e corpo nao e
     suficiente, por si so, para justificar que uma resposta mental/emocional
     altere matematicamente a nota de um sistema fisico."
   - "Perguntas mentais/emocionais devem pontuar sistema fisico somente quando
     existir justificativa metodologica especifica, documentada e aprovada para
     aquela associacao."

   Pesos: as 13 perguntas movidas tem peso 1, escala 0-3, orientacao direta —
   o mesmo de todos os itens primarios do MEE. O peso e preservado (nenhuma
   inconsistencia: o denominador do sistema e recalculado pelos itens). Escalas,
   faixas, Indice, Triade (regra), ausencia e cobertura minima (80%) NAO mudam;
   as contagens sao recalculadas pela composicao nova.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  var MOTIVO_EXAME = "Exames e documentos não participam do Resultado HOLOS.";
  var MEE = "mental_emocional_espiritual";

  raiz.MetodologiaRevisaoV3 = {
    id: "HOLOS-V1-DECISOES-2026-10-13",
    decidido_em: "2026-10-13",
    revisao_publica: "decisões explícitas de Rodrigo em 13/10/2026 (decisão explícita = autorização para implementar); base: HOLOS-V1 v2 ativo",
    base: { code: "HOLOS-V1", version: 2 },
    versao_nova: 4,

    regra_metodologica: [
      "Uma relação holística, simbólica ou contextual entre emoção e corpo não é suficiente, por si só, para justificar que uma resposta mental/emocional altere matematicamente a nota de um sistema físico.",
      "Perguntas mentais/emocionais devem pontuar sistema físico somente quando existir justificativa metodológica específica, documentada e aprovada para aquela associação."
    ],

    /* nada de texto revisado nem troca de pergunta nesta versao */
    textos: {},
    trocar: {},

    /* removidas da versao nova: nem pontuavel, nem contextual, nem em outro sistema; sem item substituto */
    remover: {
      "SNT-210": MOTIVO_EXAME + " PCR/VHS não deve alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos.",
      "SNT-309": MOTIVO_EXAME + " Triglicerídeos/HDL não devem alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos."
    },

    /* associacao PRIMARIA passa para o Sistema Mental Emocional Espiritual (peso e Triade iguais).
       motivo = justificativa oficial da decisao. */
    mover: {
      "EMO-101": { de: "fungico", para: MEE, motivo: "Procrastinação, prontidão e autorregulação comportamental." },
      "EMO-102": { de: "fungico", para: MEE, motivo: "Organização pessoal e comportamento." },
      "EMO-103": { de: "fungico", para: MEE, motivo: "Prontidão, dificuldade percebida para iniciar mudança e autorregulação." },
      "EMO-201": { de: "acido_inflamatorio", para: MEE, motivo: "Irritabilidade e regulação emocional." },
      "EMO-202": { de: "acido_inflamatorio", para: MEE, motivo: "Intensidade e duração percebida da raiva." },
      "EMO-203": { de: "acido_inflamatorio", para: MEE, motivo: "Limites, comportamento interpessoal e evitação de conflito." },
      "EMO-204": { de: "acido_inflamatorio", para: MEE, motivo: "Expressão emocional e comportamento interpessoal." },
      "EMO-301": { de: "metabolico", para: MEE, motivo: "Relação entre estado emocional e alimentação." },
      "EMO-302": { de: "metabolico", para: MEE, motivo: "Consciência, atenção ao comportamento e funcionamento em piloto automático." },
      "EMO-303": { de: "metabolico", para: MEE, motivo: "Uso da comida como recompensa e comportamento alimentar associado ao estado emocional." },
      "EMO-401": { de: "detox_linfatico", para: MEE, motivo: "Ruminação emocional." },
      "EMO-402": { de: "detox_linfatico", para: MEE, motivo: "Expressão e regulação emocional." },
      "EMO-403": { de: "detox_linfatico", para: MEE, motivo: "Apoio, vínculo e capacidade de receber cuidado." }
    },

    /* associacoes secundarias/contextuais (sem peso) que SAEM junto com a mudanca. Decisao: a relacao antiga
       com sistema fisico nao fica automaticamente como contextual; e o contextual MEE vira redundante
       (o MEE passa a ser o primario). */
    remover_contextuais: {
      "EMO-101": ["metabolico"],
      "EMO-103": [MEE],
      "EMO-201": [MEE],
      "EMO-203": ["detox_linfatico"],
      "EMO-301": [MEE],
      "EMO-302": [MEE],
      "EMO-402": [MEE]
    },

    /* o que a versao nova TEM de ter (aplicarRevisao recusa se nao bater) — recalculado pela composicao */
    esperado: {
      total: 82,
      por_bloco: { fisico: 47, mental_emocional: 19, espiritual: 16 },
      por_sistema: { fungico: 12, acido_inflamatorio: 11, metabolico: 10, detox_linfatico: 12, mental_emocional_espiritual: 37 },
      invertidas: ["SNT-507", "EMO-507", "ESP-101", "ESP-102", "ESP-201", "ESP-202", "ESP-301", "ESP-302", "ESP-501"],
      escalas: { frequencia: 71, intensidade: 11 }
    }
  };
})();
