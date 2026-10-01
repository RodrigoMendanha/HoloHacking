/* ===========================================================================
   DECISOES METODOLOGICAS V1 — FECHADAS (Etapa 4.2)
   ===========================================================================

   Registro, em dado, das 15 decisoes humanas que fecham a metodologia da V1
   (docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md). Este
   arquivo NAO calcula nada e NAO aprova nada: e a entrada de
   PacoteMetodologico.aplicarDecisoesV1(), que gera a NOVA versao candidata
   do pacote a partir do inventario importado (que continua preservado, com
   status e hash proprios).

   O pacote candidato fica em "em_revisao" ate o gate tecnico (cadeia de
   migrations validada no banco real) e ate a DUPLA APROVACAO humana:
   Aprovacao 1 = Daniel (responsavel primario pela homologacao), Aprovacao 2 =
   Rodrigo (segundo responsavel / revisao final). Nenhuma aprovacao e criada
   por este arquivo nem por codigo.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  var T30 = "SNT-101 SNT-102 SNT-103 SNT-106 SNT-107 SNT-108 SNT-201 SNT-202 SNT-203 SNT-204 SNT-205 SNT-207 SNT-208 SNT-209 SNT-301 SNT-303 SNT-304 SNT-307 SNT-401 SNT-402 SNT-404 SNT-405 SNT-409 SNT-501 SNT-502 SNT-503 SNT-504 SNT-505 SNT-506 SNT-507 SNT-508 SNT-509 SNT-510 EMO-101 EMO-102 EMO-103 EMO-201 EMO-202 EMO-301 EMO-302 EMO-303 EMO-401 EMO-501 EMO-502 EMO-504 ESP-201 ESP-302 ESP-303 ESP-501 ESP-502";
  var T3M = "SNT-104 SNT-105 SNT-111 SNT-206 SNT-308";
  var ATU = "SNT-305 SNT-306 SNT-408 SNT-410 EMO-505 EMO-507 ESP-101 ESP-102 ESP-103 ESP-202 ESP-301 ESP-401 ESP-404 ESP-405";
  var HAB = "SNT-110 SNT-403 SNT-406 SNT-407 EMO-203 EMO-204 EMO-402 EMO-403 EMO-503 ESP-203 ESP-402 ESP-403";
  var contextos = {};
  [["ultimos_30_dias", T30], ["ultimos_3_meses", T3M], ["atualmente", ATU], ["habitualmente", HAB], ["ao_longo_da_vida", "SNT-109"], ["sem_periodo_especifico", "SNT-210 SNT-309"]]
    .forEach(function (par) { par[1].split(" ").forEach(function (id) { contextos[id] = par[0]; }); });

  var MSG_FIM = " Revise os itens respondidos e a cobertura antes da interpretação profissional.";
  var MSG_PACIENTE = " Esta pontuação organiza respostas do HOLOSCAN e não representa, sozinha, um diagnóstico.";
  var msg = function (faixa) { return "A pontuação deste eixo ficou na faixa " + faixa + " nesta aplicação." + MSG_FIM; };

  raiz.MetodologiaDecisoesV1 = {
    id: "HOLOS-V1-DECISOES-FINAIS",
    etapa: "4.2",
    decidido_em: "2026-10-01",
    status_metodologico: "DECISOES METODOLOGICAS V1 FECHADAS",
    status_tecnico: "PUBLICACAO TECNICA PENDENTE DE VALIDACAO NO BANCO REAL",

    // D1 — questionario
    edicao: { code: "HOLOSCAN-V1", version: 1, total: 84, por_bloco: { fisico: 49, mental_emocional: 19, espiritual: 16 } },
    fora_da_v1: ["EMO-506"],
    nao_recriar: ["SNT-302", "SNT-310", "EMO-506"],
    contextos_temporais_permitidos: ["ultimos_7_dias", "ultimos_30_dias", "ultimos_3_meses", "atualmente", "habitualmente", "ao_longo_da_vida", "sem_periodo_especifico"],
    contexto_temporal: contextos,

    // D2 — escalas (atribuicao do Anexo A mantida: 73 frequencia / 11 intensidade)
    escalas: {
      frequencia: { min_value: 0, max_value: 3, labels: ["Nunca", "Às vezes", "Frequente", "Sempre"] },
      intensidade: { min_value: 0, max_value: 3, labels: ["Nada", "Um pouco", "Bastante", "Muito"] }
    },
    contagem_escalas: { frequencia: 73, intensidade: 11 },

    // D3 — orientacao (as outras 75 sao diretas)
    invertidas: ["SNT-507", "EMO-507", "ESP-101", "ESP-102", "ESP-201", "ESP-202", "ESP-301", "ESP-302", "ESP-501"],

    // D4, D5, D6 — associacoes: um primario pontuavel por pergunta; secundarias so contextuais
    primario_definido: {
      "SNT-101": { sistema: "fungico", contextual: "metabolico", historico: "SNT-302", decisao: "Decisão 5" },
      "SNT-501": { sistema: "mental_emocional_espiritual", contextual: "metabolico", historico: "SNT-310", decisao: "Decisão 6" }
    },
    papel_primario: "primaria",
    papel_secundario: "secondary_contextual",
    papel_triade: "triade_por_bloco",

    // D7 — pesos
    peso_primario: 1,
    peso_triade: 1,

    // D8 — parcialidade
    ausencia: { denominador: "respondidos", cobertura_minima: 0.8, em_branco: "reduz_cobertura", recusado: "reduz_cobertura", nao_aplicavel: "reduz_cobertura", conta_como_zero: false, minimos: { cobertura_minima_por_sistema: 0.8 }, redistribuicao: false, mostrar_cobertura_abaixo_de: 1 },

    // D9 — faixas (limites racionais exatos; classificacao com precisao interna)
    faixas: [
      { label: "baixa", lower: "0", upper: "10/3", lower_inclusive: true, upper_inclusive: false, nome: "baixa" },
      { label: "intermediaria", lower: "10/3", upper: "20/3", lower_inclusive: true, upper_inclusive: false, nome: "intermediária" },
      { label: "alta", lower: "20/3", upper: "10", lower_inclusive: true, upper_inclusive: true, nome: "alta" }
    ],
    mensagem_faixa: function (nome) { return msg(nome); },
    mensagem_paciente: function (nome) { return msg(nome) + MSG_PACIENTE; },
    casas_exibicao: 1,

    // D10 — Indice
    indice: { alphas: { fungico: 0.2, acido_inflamatorio: 0.2, metabolico: 0.2, detox_linfatico: 0.2, mental_emocional_espiritual: 0.2 }, elegibilidade: "todos_os_sistemas_avaliaveis", indice_parcial: false, renormalizacao: false, escala: "0-100", multiplicador: 10, casas: 1, faixas: false },

    // D11 — Triada
    triade: { eixo_por_bloco: { fisico: "fisico", mental_emocional: "mental", espiritual: "espiritual" }, contagem: { fisico: 49, mental: 19, espiritual: 16 }, cobertura_minima: 0.8, nota_global: false, faixas: false },

    // D12 — comparabilidade
    comparabilidade: { delta_permitido: true, requisitos: ["mesmo_paciente", "mesma_edicao", "mesmo_pacote", "mesmo_contrato_motor", "sistema_avaliavel_nas_duas", "mesmo_conjunto_pontuado"], sem_requisito: "lado_a_lado_sem_delta", janela_minima: null, janela_maxima: null, equivalencia_entre_versoes: false, direcao: ["subiu", "desceu", "permaneceu"], interpretacao_automatica: false },

    // D13 — nomenclatura e textos oficiais
    sistemas: {
      fungico: { nome: "Sistema Fúngico", texto: "Eixo autoral do HOLOSCAN que organiza respostas relacionadas a sinais digestivos, mucosas, pele e padrões de desejo alimentar agrupados pelo método. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença." },
      acido_inflamatorio: { nome: "Sistema Ácido Inflamatório", texto: "Eixo autoral que organiza respostas relacionadas a dor, rigidez, pele, mucosas e reatividade presentes no questionário. O termo 'ácido' faz parte da nomenclatura autoral e não representa medição do pH corporal. O eixo não diagnostica inflamação nem substitui avaliação ou exames clínicos." },
      metabolico: { nome: "Sistema Metabólico", texto: "Eixo autoral que organiza respostas relacionadas a energia, fome, comportamento alimentar, composição corporal percebida e achados laboratoriais relatados no questionário. Não diagnostica resistência à insulina, diabetes ou outra condição metabólica." },
      detox_linfatico: { nome: "Sistema Detox e Linfático", texto: "Eixo autoral que organiza respostas relacionadas a inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias presentes no questionário. 'Detox' é nomenclatura do método; a pontuação não mede toxinas, função hepática ou função linfática." },
      mental_emocional_espiritual: { nome: "Sistema Mental Emocional Espiritual", texto: "Eixo autoral que organiza respostas relacionadas a sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal. Não diagnostica transtornos mentais e não mede saúde, valor ou qualidade espiritual." }
    },
    termos_causais_proibidos: ["impacto espiritual", "plexo solar", "queda de frequência", "queda de frequencia", "dessintoniza", "bloqueio energético", "bloqueio energetico"],

    // D14 — casos de referencia (respostas por orientacao; esperado exato e de tela)
    referencias: [
      { id: "REF-01", descricao: "todas as diretas = 0; todas as invertidas = 3 (todo z = 0)", direta: 0, invertida: 3,
        esperado: { sistemas: "10", indice: "100", triade: "10", cobertura: "1" }, exibicao: { sistemas: "10.0", indice: "100.0", triade: "10.0" } },
      { id: "REF-02", descricao: "todas as diretas = 3; todas as invertidas = 0 (todo z = 3)", direta: 3, invertida: 0,
        esperado: { sistemas: "0", indice: "0", triade: "0", cobertura: "1" }, exibicao: { sistemas: "0.0", indice: "0.0", triade: "0.0" } },
      { id: "REF-03", descricao: "todas as diretas = 1; todas as invertidas = 2 (todo z = 1)", direta: 1, invertida: 2,
        esperado: { sistemas: "20/3", indice: "200/3", triade: "20/3", cobertura: "1" }, exibicao: { sistemas: "6.7", indice: "66.7", triade: "6.7" } }
    ],

    // D15 — CMB / REC / SEL
    sugestoes: { automatica: false, mensagem: "Não há sugestão automática validada para esta edição.", legado_nao_oficial: { combinacoes: "CMB-001..CMB-016", recomendacoes: "REC-001..REC-023", selecao: "SEL-001" }, executar_regras: false, catalogo_manual: "biblioteca das 10 ferramentas disponível para seleção manual profissional" },

    // resumo das 15 decisoes — so texto. NAO e aprovacao e NAO vira registro de
    // homologacao: a homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo),
    // registradas por pessoa, no sistema, sobre o mesmo package_id/version/content_hash.
    resumo: [
      ["Decisão 1", "questionário", "Edição V1 com 84 perguntas (49/19/16); EMO-506 fora; SNT-101 e SNT-501 com ID único; SNT-302, SNT-310 e EMO-506 não são recriadas. Contexto temporal por item (7 valores permitidos)."],
      ["Decisão 2", "escalas", "Escalas 0–3: frequência (Nunca/Às vezes/Frequente/Sempre) e intensidade (Nada/Um pouco/Bastante/Muito); atribuição do Anexo A mantida (73/11); escala desconhecida é erro."],
      ["Decisão 3", "orientação", "9 invertidas (SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501); 75 diretas; z = resposta ou 3 − resposta; orientação ausente é erro."],
      ["Decisão 4", "associações", "Exatamente um sistema primário pontuável por pergunta; as 9 secundárias recuperadas ficam como secondary_contextual, sem contribuição numérica."],
      ["Decisão 5", "SNT-101", "Primário pontuável: Sistema Fúngico, peso 1; Metabólico = secondary_contextual (linha histórica SNT-302); Tríada físico peso 1; ultimos_30_dias."],
      ["Decisão 6", "SNT-501", "Primário pontuável: Sistema Mental Emocional Espiritual, peso 1; Metabólico = secondary_contextual (linha histórica SNT-310); Tríada físico peso 1; ultimos_30_dias."],
      ["Decisão 7", "pesos", "Todos os 84 vínculos primários com peso 1; hierarquia 1/2/3 sai da fórmula e fica como legacy_recovered_weight."],
      ["Decisão 8", "parcialidade", "Cobertura por sistema = respondidos válidos / itens primários; avaliável com cobertura ≥ 0,80; em branco, recusada e não aplicável não são zero e reduzem a cobertura; nota pelos respondidos."],
      ["Decisão 9", "faixas", "0 ≤ nota < 10/3 baixa; 10/3 ≤ nota < 20/3 intermediária; 20/3 ≤ nota ≤ 10 alta; classificação com precisão interna; exibição com 1 casa; mensagens neutras."],
      ["Decisão 10", "Índice HOLOS", "Pesos 0,20; só com os cinco sistemas avaliáveis; sem renormalização; sem Índice parcial; Índice = 10 × Σ(nota × 0,20); 0–100; 1 casa; sem faixas."],
      ["Decisão 11", "Tríada", "Eixos físico/mental/espiritual pelo bloco (49/19/16), peso 1, mesma orientação; eixo avaliável com cobertura ≥ 0,80; sem nota global, sem faixa, sem interpretação automática."],
      ["Decisão 12", "comparabilidade", "Delta só com mesmo paciente, edição, pacote, contrato do motor, sistema avaliável nas duas e mesmo conjunto pontuado; senão lado a lado; nunca melhorou/piorou automático."],
      ["Decisão 13", "nomenclatura", "Nomes oficiais dos cinco sistemas e textos oficiais seguros; impacto espiritual causal e equivalentes fora do conteúdo oficial (legado preservado em provenance)."],
      ["Decisão 14", "casos de referência", "REF-01, REF-02 e REF-03 com resultado esperado exato e de tela."],
      ["Decisão 15", "CMB/REC/SEL", "Nenhuma combinação ou sugestão automática oficial na V1; CMB-001..016, REC-001..023 e SEL-001 como legado não oficial; seleção manual profissional preservada."]
    ]
  };
})();
