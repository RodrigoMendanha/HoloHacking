/* ===========================================================================
   REVISAO DAS PERGUNTAS DO HOLOSCAN -> HOLOS-V1 v3 (12/10)
   ===========================================================================

   Origem: a revisao publica das 84 perguntas do HOLOS-V1 v2 (aprovacoes.html),
   concluida em 11/10 (53 aprovadas, 28 com texto novo, 3 negadas), mais as
   decisoes da dona do metodo em 12/10 (DECISOES-V1 item 183).

   Este arquivo e SO a lista de decisoes. Quem monta a versao nova e
   PacoteMetodologico.aplicarRevisao(v2, esta revisao): copia o v2 aprovado,
   aplica exatamente isto e devolve o v3 em_revisao. Nada aqui aprova nada: o
   v3 so vale depois da Aprovacao (aprovador unico) e de Homologar.

   Regras:
   - texto novo com o MESMO sentido: mesmo ID (as respostas continuam
     comparaveis em leitura humana; a versao da pergunta sobe);
   - pergunta trocada por OUTRO sinal: ID NOVO, nunca o antigo;
   - remover: o ID sai da edicao (as aplicacoes antigas continuam no v2);
   - mover: a pergunta passa a pontuar em outro sistema (peso e Triade iguais).
   Pesos, faixas, escalas, Indice, Triade (regra), ausencia e cobertura minima
   NAO mudam.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  raiz.MetodologiaRevisaoV3 = {
    id: "HOLOS-V1-REVISAO-PERGUNTAS-2026-10",
    decidido_em: "2026-10-12",
    revisao_publica: "concluida em 2026-10-11 (aprovacoes.html): 53 aprovadas, 28 com texto novo, 3 negadas",
    base: { code: "HOLOS-V1", version: 2 },
    versao_nova: 3,

    /* Texto novo, mesmo sentido (mesmo ID). Entre colchetes, o que mudou em
       relacao ao que o revisor escreveu. */
    textos: {
      "SNT-101": "Você sente uma forte vontade de ingerir doces ou pães quase todo dia?",
      "SNT-102": "Sua barriga incha/estufa ou fica com gases depois das refeições?",
      "SNT-103": "Sua língua costuma ter uma camada esbranquiçada no dia a dia?",
      // [detalhado pela dona do metodo: o "sapinho" e a candidiase da boca, termo que a paciente reconhece]
      "SNT-104": "Você tem candidíase com frequência (íntima ou na boca, o \"sapinho\")?",
      "SNT-105": "Você tem micose de pele ou unha que sempre volta?",
      "SNT-109": "Você precisou tomar antibióticos muitas vezes ao longo da vida?",
      "SNT-207": "Sua gengiva sangra ao escovar os dentes?",
      // [o texto do revisor ficou sem o verbo: "percebe que as dores ... quando come"]
      "SNT-208": "Você percebe que as dores no corpo ou de cabeça pioram quando come alimentos ultraprocessados ou açúcar?",
      "SNT-301": "Você sente muito sono logo depois do almoço?",
      "SNT-303": "Você fica com fome de novo pouco tempo depois de ter comido?",
      // [concordancia: "local em que"]
      "SNT-305": "O principal local em que a gordura se concentra no seu corpo é a região da barriga?",
      // [detalhado: "aveludada" e o que caracteriza o sinal]
      "SNT-306": "A pele do seu pescoço ou axila está mais escura e com textura mais grossa ou aveludada?",
      // [detalhado: o tremor e o sinal fisico]
      "SNT-307": "Você fica irritado, nervoso ou trêmulo se atrasa uma refeição?",
      "SNT-402": "Seu rosto amanhece muito inchado logo ao acordar?",
      "SNT-403": "Cheiros fortes te incomodam mais do que geralmente incomodam as outras pessoas?",
      "SNT-404": "Comida gordurosa te faz passar mal ou ter uma sensação de enjoo?",
      "SNT-406": "Uma quantidade pequena de bebida alcoólica (ex.: 1 a 2 taças de vinho ou cerveja) já te dá ressaca no dia seguinte?",
      "SNT-407": "Você tem fortes reações a medicamentos ou a café?",
      "SNT-409": "Seu suor tem um odor forte?",
      "SNT-503": "Você acorda de madrugada e tem dificuldade de voltar a dormir?",
      // [digitacao: "alimentação l?"]
      "EMO-302": "Você passa os dias no piloto automático sem perceber o que está fazendo em relação à alimentação?",
      "EMO-401": "Você se pega remoendo uma raiva ou mágoa antiga?",
      "EMO-502": "Quando você “sai da linha” na alimentação programada em um dia, sente que perdeu tudo e abandona?",
      // [ortografia: "autossabotando"]
      "ESP-402": "Quando as coisas começam a dar certo, você acaba se autossabotando ou boicotando?"
    },

    /* Outro sinal: ID novo no lugar do antigo (mesmo bloco, mesmo sistema, mesma Triade). */
    trocar: {
      "SNT-106": { novo_id: "SNT-112", texto: "Você sente coceira no corpo sem motivo aparente?",
        motivo: "revisor trocou \"coceira na região íntima ou anal\" por coceira no corpo sem motivo aparente" },
      "SNT-410": { novo_id: "SNT-411", texto: "Você costuma sentir gosto metálico na boca?",
        // "costuma" pede frequencia (a antiga, celulite, era intensidade/atualmente)
        scale_code: "frequencia", temporal_context: "ultimos_30_dias",
        motivo: "revisor trocou \"celulite acentuada\" por gosto metálico na boca" },
      "SNT-507": { novo_id: "SNT-511", texto: "Você tem se sentido triste e insatisfeito com sua saúde como um todo?",
        orientation: "direta",
        motivo: "revisor trocou a percepção de fome e saciedade (invertida) por tristeza e insatisfação com a saúde (direta)" }
    },

    /* Sai da edicao (negadas na revisao). */
    remover: {
      "SNT-209": "negada na revisão: sem relação causal direta com o Sistema Ácido Inflamatório",
      "ESP-102": "negada na revisão: muito ampla, ambígua para interpretação"
    },

    /* Passa a pontuar em outro sistema. */
    mover: {
      "ESP-404": { de: "acido_inflamatorio", para: "mental_emocional_espiritual",
        motivo: "negada na revisão por estar no Sistema Ácido Inflamatório; a dona do método manteve a pergunta no Sistema Mental Emocional Espiritual" }
    },

    /* O que o v3 tem de ter (conferido por aplicarRevisao e pelos testes). */
    esperado: {
      total: 82,
      por_bloco: { fisico: 48, mental_emocional: 19, espiritual: 15 },
      por_sistema: { fungico: 15, acido_inflamatorio: 14, metabolico: 14, detox_linfatico: 15, mental_emocional_espiritual: 24 },
      invertidas: ["EMO-507", "ESP-101", "ESP-201", "ESP-202", "ESP-301", "ESP-302", "ESP-501"],
      escalas: { frequencia: 73, intensidade: 9 }
    }
  };
})();
