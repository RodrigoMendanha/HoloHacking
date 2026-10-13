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

  /* ===========================================================================
     LOTE 2B (decisoes explicitas de Rodrigo, 13/10/2026) -> HOLOS-V1 v5
     Base: HOLOS-V1 v4 (a versao no ar). So estas decisoes. v2, v3 e v4 ficam como
     estao; aplicacoes, Resultados, emissoes e relatorios ja salvos nao mudam.

     Regras metodologicas registradas:
     - "O bloco de origem da pergunta nao define automaticamente o sistema. A
        associacao deve ser sustentada pelo conteudo investigado." (conteudo da
        pergunta > bloco de origem para definicao do sistema)
     - "Associacao contextual nao altera nota, Indice, prioridade, sinais
        dominantes ou Proximos Passos e nao implica causalidade."

     Pesos: os 5 itens movidos tem peso 1 (igual a todos os primarios do MEE); o
     peso e preservado. ESP-501 e ESP-502 passam a SO CONTEXTUAIS: continuam no
     questionario (coletadas), a associacao com o sistema fisico vira
     secondary_contextual (sem peso) e saem da Triade — nao entram em nenhum
     denominador nem em nenhum score.
     =========================================================================== */
  raiz.MetodologiaRevisaoV5 = {
    id: "HOLOS-V1-LOTE-2B-2026-10-13",
    decidido_em: "2026-10-13",
    revisao_publica: "Lote 2B: decisões explícitas de Rodrigo em 13/10/2026 (decisão explícita = autorização para implementar); base: HOLOS-V1 v4 ativo",
    base: { code: "HOLOS-V1", version: 4 },
    versao_nova: 5,

    regra_metodologica: [
      "O bloco de origem da pergunta não define automaticamente o sistema. A associação deve ser sustentada pelo conteúdo investigado.",
      "Associação contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade."
    ],

    textos: {}, trocar: {}, remover: {},

    mover: {
      "ESP-101": { de: "metabolico", para: MEE, motivo: "Direção, propósito e sentido pertencem diretamente ao eixo Mental-Emocional-Espiritual." },
      "ESP-103": { de: "metabolico", para: MEE, motivo: "Investiga alinhamento entre rotina, escolhas e direção de vida." },
      "ESP-203": { de: "acido_inflamatorio", para: MEE, motivo: "Investiga valores, limites e comportamento interpessoal. Não deve pontuar um sistema físico por associação simbólica." },
      "ESP-404": { de: "acido_inflamatorio", para: MEE, motivo: "Investiga crença sobre saúde, sofrimento e privação. Não deve pontuar um sistema físico." },
      "ESP-405": { de: "detox_linfatico", para: MEE, motivo: "Investiga conteúdo emocional/simbólico relacionado a perdão. Não deve sugerir relação automática entre mágoa, detoxificação ou fluxo linfático." }
    },

    /* so contextuais: coletadas, sem pontuacao, sem Triade; nao vao para outro sistema pontuavel */
    contextualizar: {
      "ESP-501": { de: "fungico", motivo: "É informação holística potencialmente útil, mas não há justificativa metodológica suficiente para alterar matematicamente a nota do Sistema Fúngico ou de outro sistema." },
      "ESP-502": { de: "detox_linfatico", motivo: "Investiga contexto da refeição, ritmo, rotina e pertencimento, mas não há justificativa suficiente para alterar diretamente a nota do Sistema Detox + Linfático ou outro sistema físico." }
    },

    /* decisoes de MANTER (registro; nada muda no pacote) */
    manter: {
      "ESP-303": "MANTER como pergunta primária do Sistema Metabólico. Apesar de estar no bloco espiritual, o conteúdo da pergunta investiga diretamente comportamento alimentar e contexto da refeição.",
      "EMO-502": "MANTER a associação contextual com o Sistema Metabólico, sem pontuação metabólica.",
      "EMO-504": "MANTER a associação contextual com o Sistema Metabólico, sem pontuação metabólica."
    },

    esperado: {
      total: 82,
      por_bloco: { fisico: 47, mental_emocional: 19, espiritual: 16 },
      por_sistema: { fungico: 11, acido_inflamatorio: 9, metabolico: 8, detox_linfatico: 10, mental_emocional_espiritual: 42 },
      triade: { fisico: 47, mental: 19, espiritual: 14 },
      so_contextuais: ["ESP-501", "ESP-502"],
      invertidas: ["SNT-507", "EMO-507", "ESP-101", "ESP-102", "ESP-201", "ESP-202", "ESP-301", "ESP-302", "ESP-501"],
      escalas: { frequencia: 71, intensidade: 11 }
    }
  };

  /* ===========================================================================
     FECHAMENTO DAS 61 PERGUNTAS ABERTAS (decisao de Rodrigo, 13/10/2026: "resolva
     diretamente todas em que a decisao e sustentada pelas regras") -> HOLOS-V1 v6
     Base: HOLOS-V1 v5 (no ar). Criterio, nesta ordem, para cada pergunta:
       A. o conteudo investiga diretamente o dominio do sistema -> MANTER
       B. o conteudo pertence claramente a outro dos cinco sistemas -> MOVER
       C. util ao raciocinio, sem base para alterar matematicamente um sistema -> CONTEXTUAL
       D. inadequada, redundante ou excessivamente diagnostica -> REMOVER
     Regras vigentes (1) relacao simbolica emocao-corpo nao basta para pontuar sistema
     fisico; (2) o bloco de origem nao define o sistema; (3) contextual nao pontua e nao
     implica causalidade; (4) pergunta pode ser util sem pontuar; (5) na duvida entre
     inventar associacao pontuavel e contexto, prefere-se CONTEXTUAL.
     Condicoes nomeadas: "O HOLOSCAN pode registrar relato informado pela paciente, mas
     nao pode confirmar condicao, etiologia ou mecanismo."
     Pesos: todos os itens tem peso 1 (auditado); nenhum peso novo, nenhuma normalizacao.
     Textos das perguntas: inalterados.
     =========================================================================== */
  raiz.MetodologiaRevisaoV6 = {
    id: "HOLOS-V1-FECHAMENTO-61-2026-10-13",
    decidido_em: "2026-10-13",
    revisao_publica: "fechamento das 61 perguntas abertas pelas regras vigentes (decisão explícita de Rodrigo de resolver diretamente); base: HOLOS-V1 v5 ativo",
    base: { code: "HOLOS-V1", version: 5 },
    versao_nova: 6,

    regra_metodologica: [
      "Uma relação holística, simbólica ou contextual entre emoção e corpo não é suficiente, por si só, para justificar que uma resposta mental/emocional altere matematicamente a nota de um sistema físico.",
      "O bloco de origem da pergunta não define automaticamente o sistema. A associação precisa ser sustentada pelo conteúdo investigado.",
      "Associação contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade.",
      "Pergunta pode ser útil ao cuidado integral sem necessariamente pontuar um sistema.",
      "Quando uma informação for relevante, mas não houver justificativa suficiente para alterar matematicamente um sistema, preferir CONTEXTUAL a inventar uma associação pontuável.",
      "O HOLOSCAN pode registrar relato informado pela paciente, mas não pode confirmar condição, etiologia ou mecanismo."
    ],

    textos: {}, trocar: {},

    remover: {
      "SNT-110": "Redundante com SNT-406 (reação ao álcool já pontua no Detox + Linfático) e, dentro do Fúngico, sugeriria causa microbiológica que o HOLOSCAN não demonstra."
    },

    mover: {
      "SNT-404": { de: "detox_linfatico", para: "fungico", motivo: "Desconforto digestivo depois de comida gordurosa é relato digestivo/alimentar (domínio do Fúngico); no Detox sugeriria função hepática, que o HOLOSCAN não mede." },
      "SNT-501": { de: MEE, para: "metabolico", motivo: "Acordar cansado mesmo dormindo o suficiente é relato de energia (domínio do Metabólico); sono/alerta no MEE fica com as perguntas de pensamento acelerado e despertar." },
      "SNT-507": { de: MEE, para: "metabolico", motivo: "Perceber fome e saciedade investiga diretamente fome/saciedade, domínio do Metabólico." }
    },

    /* SNT-501 tinha contextual no Metabolico: vira redundante com o primario novo */
    remover_contextuais: { "SNT-501": ["metabolico"] },

    contextualizar: {
      "SNT-104": { de: "fungico", motivo: "Condição nomeada (candidíase/sapinho): dentro do Fúngico a pontuação pareceria confirmar a condição e sua causa. Fica como relato informado pela paciente, sem pontuar." },
      "SNT-105": { de: "fungico", motivo: "Condição nomeada (micose): dentro do Fúngico a pontuação pareceria confirmar a condição e sua causa. Fica como relato, sem pontuar." },
      "SNT-109": { de: "fungico", motivo: "Histórico de uso de antibiótico é informação de contexto (exposição ao longo da vida), não sinal atual; pontuar sugeriria mecanismo microbiológico." },
      "SNT-206": { de: "acido_inflamatorio", motivo: "Condições nomeadas (acne inflamada, eczema, psoríase): pontuar no Ácido-Inflamatório pareceria confirmar doença inflamatória. Fica como relato, sem pontuar." },
      "SNT-305": { de: "metabolico", motivo: "Distribuição de gordura é observação corporal que insinuaria diagnóstico metabólico; não é relato de energia, fome, saciedade ou comportamento alimentar." },
      "SNT-306": { de: "metabolico", motivo: "Pele escurecida e aveludada é sinal clínico que pede avaliação específica; pontuar insinuaria resistência à insulina. Fica como contexto para a profissional." },
      "SNT-308": { de: "metabolico", motivo: "Dificuldade percebida de perder peso não é relato direto de energia, fome, saciedade ou comportamento alimentar e insinuaria diagnóstico; fica como contexto." },
      "SNT-408": { de: "detox_linfatico", motivo: "Pele opaca e olheiras têm muitas explicações (sono, rotina); no Detox sugeririam toxinas. Fica como contexto." },
      "SNT-409": { de: "detox_linfatico", motivo: "Odor do suor no Detox sugeriria eliminação de toxinas, que o HOLOSCAN não mede. Fica como contexto." },
      "SNT-410": { de: "detox_linfatico", motivo: "Celulite no Detox sugeriria alteração linfática, que o HOLOSCAN não mede. Fica como contexto." }
    },

    /* MANTER: a associacao atual e sustentada pelo conteudo (registro da justificativa; nada muda no pacote) */
    manter: {
      "SNT-101": "Fúngico — vontade frequente de doce/pão é relato alimentar (hábito e preferência); contextual no Metabólico mantido, sem pontuar.",
      "SNT-102": "Fúngico — inchaço e gases depois das refeições são relato digestivo.",
      "SNT-103": "Fúngico — camada esbranquiçada na língua é relato de mucosa; não confirma fungo.",
      "SNT-106": "Fúngico — coceira íntima ou anal é relato de pele/mucosa; não confirma condição.",
      "SNT-107": "Fúngico — cabeça pesada depois de massa ou doce é relato alimentar/vitalidade ligado à refeição.",
      "SNT-108": "Fúngico — caspa ou coceira no couro cabeludo é relato de pele.",
      "SNT-111": "Fúngico — nariz entupido é relato de mucosa; a palavra sinusite é o termo comum da paciente e não é confirmada.",
      "SNT-201": "Ácido-Inflamatório — dor articular sem esforço é relato de dor.",
      "SNT-202": "Ácido-Inflamatório — rigidez ao acordar é relato de rigidez.",
      "SNT-203": "Ácido-Inflamatório — corpo dolorido sem causa clara é relato de dor/desconforto.",
      "SNT-204": "Ácido-Inflamatório — azia ou queimação é relato de desconforto/irritação; não mede acidez corporal.",
      "SNT-205": "Ácido-Inflamatório — dor de cabeça frequente é relato de dor.",
      "SNT-207": "Ácido-Inflamatório — gengiva que sangra é relato de irritação de mucosa.",
      "SNT-208": "Ácido-Inflamatório — piora percebida com ultraprocessados/açúcar é relato de reatividade percebida, não prova de inflamação.",
      "SNT-209": "Ácido-Inflamatório — mãos que amanhecem inchadas é relato de rigidez/desconforto matinal.",
      "SNT-301": "Metabólico — sono depois do almoço é resposta percebida à refeição.",
      "SNT-303": "Metabólico — fome pouco depois de comer é relato de fome/saciedade.",
      "SNT-304": "Metabólico — comer depois do jantar sem fome é comportamento alimentar.",
      "SNT-307": "Metabólico — irritação ou tremor ao atrasar refeição é resposta percebida à rotina alimentar.",
      "SNT-401": "Detox + Linfático — inchaço nas pernas no fim do dia é retenção percebida.",
      "SNT-402": "Detox + Linfático — rosto inchado ao acordar é retenção percebida.",
      "SNT-403": "Detox + Linfático — incômodo com cheiros fortes é sensibilidade relatada.",
      "SNT-405": "Detox + Linfático — ficar um dia ou mais sem evacuar é relato de eliminação/funcionamento intestinal.",
      "SNT-406": "Detox + Linfático — ressaca com pouca bebida é reação relatada ao álcool; não mede função hepática.",
      "SNT-407": "Detox + Linfático — reação forte a medicamento ou café é sensibilidade relatada.",
      "SNT-502": "Mental-Emocional-Espiritual — demora a dormir porque a cabeça não desliga (pensamento acelerado).",
      "SNT-503": "Mental-Emocional-Espiritual — despertar de madrugada com dificuldade de voltar a dormir (sono/alerta previsto no MEE).",
      "SNT-504": "Mental-Emocional-Espiritual — preocupação antecipatória.",
      "SNT-505": "Mental-Emocional-Espiritual — comer para se acalmar é comportamento alimentar ligado ao estado emocional (mesma lógica de EMO-301/303).",
      "SNT-506": "Mental-Emocional-Espiritual — estado de alerta constante.",
      "SNT-508": "Mental-Emocional-Espiritual — dificuldade de foco.",
      "SNT-509": "Mental-Emocional-Espiritual — perda de paciência (regulação emocional).",
      "SNT-510": "Mental-Emocional-Espiritual — afastamento das pessoas (conexão/pertencimento).",
      "EMO-501": "Mental-Emocional-Espiritual — diálogo interno autocrítico.",
      "EMO-502": "Mental-Emocional-Espiritual — padrão tudo-ou-nada; contextual no Metabólico mantido, sem pontuar.",
      "EMO-503": "Mental-Emocional-Espiritual — crenças fixas sobre si.",
      "EMO-504": "Mental-Emocional-Espiritual — culpa ou vergonha depois de comer; contextual no Metabólico mantido, sem pontuar.",
      "EMO-505": "Mental-Emocional-Espiritual — percepção de conflito com o próprio corpo.",
      "EMO-507": "Mental-Emocional-Espiritual — reconhecer-se na própria vida (identidade).",
      "ESP-102": "Mental-Emocional-Espiritual — sentido e propósito.",
      "ESP-201": "Mental-Emocional-Espiritual — coerência entre escolhas e valores.",
      "ESP-202": "Mental-Emocional-Espiritual — clareza de valores e limites.",
      "ESP-301": "Mental-Emocional-Espiritual — sensação de sustentação/sentido.",
      "ESP-302": "Mental-Emocional-Espiritual — prática de gratidão.",
      "ESP-401": "Mental-Emocional-Espiritual — merecimento.",
      "ESP-402": "Mental-Emocional-Espiritual — autossabotagem.",
      "ESP-403": "Mental-Emocional-Espiritual — narrativas familiares sobre si."
    },

    esperado: {
      total: 81,
      por_bloco: { fisico: 46, mental_emocional: 19, espiritual: 16 },
      por_sistema: { fungico: 8, acido_inflamatorio: 8, metabolico: 7, detox_linfatico: 6, mental_emocional_espiritual: 40 },
      triade: { fisico: 36, mental: 19, espiritual: 14 },
      so_contextuais: ["SNT-104", "SNT-105", "SNT-109", "SNT-206", "SNT-305", "SNT-306", "SNT-308", "SNT-408", "SNT-409", "SNT-410", "ESP-501", "ESP-502"],
      invertidas: ["SNT-507", "EMO-507", "ESP-101", "ESP-102", "ESP-201", "ESP-202", "ESP-301", "ESP-302", "ESP-501"],
      escalas: { frequencia: 70, intensidade: 11 }
    }
  };
})();
