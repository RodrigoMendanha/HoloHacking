/* ===========================================================================
   SISTEMAS-FECHAMENTO — fechamento deterministico dos CINCO SISTEMAS (MR-V1)
   ===========================================================================

   Motor de resultados HOLOHACKING V1 (12/10, itens 5-14 do pedido). Para cada
   sistema do HOLOSCAN, a partir SO do snapshot salvo do Resultado HOLOS
   (nada recalculado, nenhuma nota alterada):

     A. O QUE ESTE EIXO ORGANIZA          definicao segura aprovada (itens 7-11)
     B. SEU RESULTADO NESTA APLICACAO     nota/faixa salvas, posicao na ordem
                                          "Por onde investigar" (1a/2a area para
                                          aprofundar), cobertura
     C. O QUE MAIS CONTRIBUIU             ate 3 sinais dominantes reais (texto
                                          aprovado da pergunta; item 12)
     D. O QUE ISSO SIGNIFICA              significado comum das notas (item 6)
     E. O QUE ISSO NAO SIGNIFICA          ressalva segura (item 6)
     F. O QUE PODE MERECER APROFUNDAMENTO texto aprovado do sistema, quando
                                          existe (itens 7-11); senao PENDENCIA
     G. PROXIMO PASSO                     so o catalogo vigente (PP-V1, item 14):
                                          SISTEMA -> CATALOGO -> FERRAMENTA. Os
                                          sinais NAO escolhem a ferramenta.

   Nao gera: diagnostico, doenca, gravidade, risco, causa, prescricao, conduta.
   Onde nao ha texto aprovado: PENDENCIA METODOLOGICA (so na visao profissional).

   Funciona no navegador (window.SistemasFechamento) e no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var VERSAO = "MR-V1";
  var SELO_PENDENCIA = "PENDÊNCIA METODOLÓGICA";

  /* A + F: textos do pedido de 12/10 (itens 7-11), literais. Onde o pedido descreve o que dizer sem dar a frase
     ("indicar que ..."), a frase abaixo diz exatamente aquilo, sem acrescentar tema. */
  var SISTEMAS = {
    fungico: {
      definicao: "Categoria autoral que organiza determinados relatos digestivos, alimentares, sensoriais, de hábitos e vitalidade previstos pelo HOLOSCAN.",
      prioritario: "Este eixo concentrou mais marcadores nesta aplicação e merece ser aprofundado no contexto da alimentação, rotina e sinais relatados."
    },
    acido_inflamatorio: {
      definicao: "Categoria autoral que organiza relatos relacionados a desconfortos, dor, irritação e reatividade percebida.",
      prioritario: "Vale contextualizar quando e em que situações os desconfortos aparecem."
    },
    metabolico: {
      definicao: "Organiza relatos relacionados a energia, fome, comportamento alimentar, refeições e resposta percebida à alimentação e à rotina.",
      prioritario: "Alimentação, horários, fome, energia e rotina merecem aprofundamento."
    },
    detox_linfatico: {
      definicao: "Categoria autoral que organiza determinados relatos ligados a eliminação, funcionamento intestinal, retenção percebida, rotina e outros elementos previstos no questionário.",
      /* homologado em 13/10 (fechamento de homologacao do MR-V1), literal; a ressalva vai sempre junto */
      prioritario: "Quando este eixo aparece entre as primeiras áreas para aprofundar, vale observar como funcionamento intestinal, retenção percebida, alimentação, hidratação, movimento e organização da rotina aparecem no contexto real da paciente.",
      ressalva: "Esse resultado não mede toxinas, capacidade de detoxificação, função hepática ou fluxo linfático."
    },
    mental_emocional_espiritual: {
      definicao: "Organiza relatos relacionados a pensamentos, emoções, comportamento, autorregulação, identidade, conexão, pertencimento, valores e sentido.",
      prioritario: "Este domínio concentrou marcadores que merecem aprofundamento dentro dos limites da atuação nutricional."
    }
  };
  /* item 7, "se nao prioritario": frase transversal HOMOLOGADA em 13/10 para os cinco sistemas (fora das 2 primeiras areas) */
  var NAO_PRIORITARIO = "Este eixo apresentou relativamente menos marcadores do que as áreas prioritárias desta aplicação.";
  var PENDENCIA_PRIORITARIO = "Não há texto aprovado de aprofundamento para este sistema quando ele aparece como área prioritária.";

  /* Termos que NUNCA aparecem no fechamento (itens 7-11 e 13). Usado pelos testes de linguagem proibida. Os de "todos"
     so podem aparecer NEGADOS no bloco E (item 6: "nao significa doenca, gravidade, risco...") — o teste tira o bloco E. */
  var PROIBIDOS = {
    fungico: ["candid", "fungo", "fúngica", "infecç", "microbi"],
    acido_inflamatorio: ["inflamação sistêmica", "corpo ácido", "acidose", "pH"],
    metabolico: ["resistência à insulina", "diabet", "doença metabólica", "tireoid"],
    detox_linfatico: ["toxina", "detoxificação", "falha linfática", "hepátic"],
    mental_emocional_espiritual: ["transtorno", "doença psicológica", "problema espiritual", "trauma", "causa emocional"],
    todos: ["mais grave", "pior sistema", "prioridade clínica", "risco", "isso causou", "diagnóstico de "]
  };

  /* D: significado comum das notas (item 6), pela faixa salva */
  var SIGNIFICADO = {
    baixa: "Nota mais baixa indica maior concentração dos marcadores contemplados neste eixo dentro do instrumento e, por isso, maior motivo de aprofundamento.",
    intermediaria: "Nota intermediária indica uma posição intermediária dentro da escala do instrumento. Não possui significado clínico independente.",
    alta: "Nota mais alta indica menor carga relativa dos itens que reduzem a nota neste eixo nesta aplicação."
  };
  /* E: o que NAO significa (item 6) */
  var NAO_SIGNIFICA = {
    baixa: "Não significa doença, gravidade, risco nem pior saúde.",
    intermediaria: "Não indica doença nem normalidade.",
    alta: "Não significa ausência de doença, \"sistema saudável\" nem normalidade clínica."
  };
  var SEM_NOTA = "Sem nota nesta aplicação (menos respostas do que o mínimo): este eixo não entra na ordem de aprofundamento.";
  var INTRO_SINAIS = "Alguns dos sinais que mais contribuíram para este eixo nesta aplicação:";
  var RESSALVA_SINAIS = "Estes foram alguns dos itens que mais contribuíram para a pontuação deste eixo.";
  var SINAIS_FORA = "Os sinais que mais contribuíram não foram registrados neste resultado.";
  /* G: item 14, texto seguro */
  var PP_POR_QUE = "Esta ferramenta é recomendada pelo catálogo metodológico para aprofundar este sistema.";
  var PP_SINAIS = "Nesta aplicação, os sinais abaixo ajudam a contextualizar por que esta área apareceu como prioridade.";

  var NOME_FERRAMENTA = {
    oq3: "OQ³", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina",
    pqq: "PQQ", mapa_crencas: "Mapa de Crenças Alimentares", gatilhos_respostas_v1: "Gatilhos & Respostas",
    mapa: "Mapa do Propósito", roda_vida: "Roda Holística da Vida", carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento"
  };

  function num(v) { return typeof v === "number" && !isNaN(v); }
  function temNota(s) { return !!s && s.avaliavel !== false && num(s.nota); }
  function fmt(v) { return num(v) ? (Math.round(v * 10) / 10).toString().replace(".", ",") : "—"; }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* a MESMA ordem de "Por onde investigar" do HOLOSCAN, da Sintese e dos Proximos Passos */
  function ordem(sistemas) {
    if (raiz.ResultadoSintese && raiz.ResultadoSintese.ordenar) return raiz.ResultadoSintese.ordenar(sistemas);
    var A = raiz.HoloAusencia, l = (sistemas || []).slice();
    if (A && A.porLeitura) l.sort(A.porLeitura); else l.sort(function (a, b) { return (a.nota || 0) - (b.nota || 0); });
    return l.filter(temNota);
  }

  /* C: dominantes do snapshot (template 4); em resultado anterior, os congelados nos Proximos Passos (mesma conta);
     sem nenhum dos dois, nada (nunca recalculado aqui) */
  function sinaisDe(s, pp) {
    if (Array.isArray(s.dominantes)) return { origem: "resultado", lista: s.dominantes.slice(0, 3).map(function (d) { return { question_id: d.question_id, texto: d.enunciado || d.rotulo || d.question_id }; }) };
    var o = pp && pp.registrado ? (pp.systems_order || []).filter(function (x) { return x.system_id === s.sistema; })[0] : null;
    if (o && Array.isArray(o.dominantes)) return { origem: "proximos_passos", lista: o.dominantes.slice(0, 3).map(function (d) { return { question_id: d.question_id, texto: d.rotulo || d.enunciado || d.question_id }; }) };
    return { origem: "nenhuma", lista: [] };
  }

  /* G: as ferramentas que o catalogo vigente congelou para ESTE sistema (pendentes do atendimento, template 3+;
     senao a selecao original). Nunca escolhidas aqui. */
  function proximoPasso(s, pp, sinais, nomeF) {
    if (!pp || !pp.registrado) return [];
    var pend = pp.pendentes && Array.isArray(pp.pendentes.selection) ? pp.pendentes.selection : null;
    var sel = pend || (Array.isArray(pp.selection) ? pp.selection : []);
    return sel.filter(function (x) { return x.system_id === s.sistema; }).map(function (x) {
      return { tool_id: x.tool_id, nome: nomeF(x.tool_id), papel: x.papel, rule_id: x.rule_id || null,
        por_que: PP_POR_QUE, investiga: x.professional_reason || null, fazer_agora: x.next_action || null,
        sinais_intro: PP_SINAIS, sinais: sinais.lista.slice() };
    });
  }

  /* O fechamento de UM sistema. pos = 1, 2, ... na ordem de investigacao (null sem nota). */
  function fechamento(s, pos, pp, nomeF) {
    var def = SISTEMAS[s.sistema] || null, avaliavel = temNota(s);
    var prioritario = avaliavel && (pos === 1 || pos === 2);
    var sinais = avaliavel ? sinaisDe(s, pp) : { origem: "nenhuma", lista: [] };
    var pend = [];
    var aprofundar = null, ressalva = null;
    if (!def) pend.push("Sistema sem definição aprovada no motor de resultados (" + s.sistema + ").");
    if (avaliavel && def) {
      if (prioritario) {
        if (def.prioritario) { aprofundar = def.prioritario; ressalva = def.ressalva || null; }
        else pend.push(PENDENCIA_PRIORITARIO);
      } else aprofundar = NAO_PRIORITARIO;
    }
    return {
      motor: VERSAO,
      sistema: s.sistema,
      nome: s.nome || s.sistema,
      organiza: def ? def.definicao : null,                                  // A
      resultado: {                                                           // B
        avaliavel: avaliavel, nota: avaliavel ? s.nota : null, faixa: avaliavel ? (s.faixa || null) : null,
        posicao: avaliavel ? pos : null, prioridade: prioritario ? pos + "ª área para aprofundar" : null,
        respondidos: num(s.respondidos) ? s.respondidos : null, total: num(s.total_marcadores) ? s.total_marcadores : null
      },
      contribuiu: { intro: INTRO_SINAIS, ressalva: RESSALVA_SINAIS, origem: sinais.origem, sinais: sinais.lista },   // C
      significado: avaliavel ? (SIGNIFICADO[s.faixa] || null) : SEM_NOTA,    // D
      nao_significa: avaliavel ? (NAO_SIGNIFICA[s.faixa] || null) : null,    // E
      aprofundamento: aprofundar,                                            // F
      ressalva_aprofundamento: ressalva,
      proximo_passo: prioritario ? proximoPasso(s, pp, sinais, nomeF) : [],  // G
      pendencias: pend
    };
  }

  /* Os cinco fechamentos, na ordem do pacote (como o snapshot traz). */
  function deResultado(snap, nomeFerramenta) {
    snap = snap || {};
    var nomeF = nomeFerramenta || function (id) { return NOME_FERRAMENTA[id] || id; };
    var h = snap.holoscan || {}, sis = h.sistemas || [], pp = snap.proximos_passos || null;
    var ord = ordem(sis).map(function (s) { return s.sistema; });
    return sis.map(function (s) { var i = ord.indexOf(s.sistema); return fechamento(s, i >= 0 ? i + 1 : null, pp, nomeF); });
  }

  /* Template < 4 desenhado com o motor atual: item 40 do pedido */
  var ROTULO_HISTORICO = "Gerado com o motor de resultados atual a partir do registro histórico.";
  function historico(snap) { return ((snap && snap.template_version) || 1) < 4; }

  /* ---------- desenho ----------------------------------------------------------- */
  function lista(itens) { return '<ul class="sf-sinais">' + itens.map(function (d) { return "<li>" + esc(d.texto) + "</li>"; }).join("") + "</ul>"; }
  function blocoPP(p, paciente) {
    if (paciente) return '<p class="sf-pp-pac"><b>Próximo aprofundamento sugerido:</b> ' + esc(p.nome) + "</p>";
    return '<div class="sf-pp" data-sf-pp="' + esc(p.tool_id) + '">' +
      '<p class="sf-pp-tit"><span class="sf-rot">Ferramenta recomendada' + (p.papel === "principal" ? " (principal)" : "") + "</span> <b>" + esc(p.nome) + "</b></p>" +
      '<p><span class="sf-rot">Por que esta ferramenta é usada neste sistema</span> ' + esc(p.por_que) + "</p>" +
      (p.investiga ? '<p><span class="sf-rot">O que ela ajuda a investigar</span> ' + esc(p.investiga) + "</p>" : "") +
      (p.fazer_agora ? '<p><span class="sf-rot">O que fazer agora</span> ' + esc(p.fazer_agora) + "</p>" : "") +
      (p.sinais.length ? '<div><span class="sf-rot">Sinais deste sistema que merecem atenção</span><p class="sf-nota">' + esc(p.sinais_intro) + "</p>" + lista(p.sinais) + "</div>" : "") +
      "</div>";
  }
  /* ---------- visao da PACIENTE: linguagem simples (rodada de UX de 13/10) — a profissional continua com o texto tecnico ---------- */
  var INTRO_SINAIS_PACIENTE = "Os itens abaixo são alguns dos que mais contribuíram matematicamente para este eixo dentro da organização autoral do HOLOSCAN. Essa associação ajuda a orientar a investigação e não significa que um desses fatores cause os outros.";
  var PP_PACIENTE_TITULO = "Possíveis próximos aprofundamentos";
  var PP_PACIENTE_ESCOLHA = "A escolha do que aplicar e em qual momento é feita com sua nutricionista.";
  /* "Categoria autoral que organiza..." / "Organiza..." -> "Este eixo reune..." (mesmo conteudo, sem jargao) */
  function definicaoPaciente(t) { return String(t || "").replace(/^(Categoria autoral que organiza|Organiza)\s+/, "Este eixo reúne "); }
  function significadoPaciente(t) { return String(t || "").replace("Não possui significado clínico independente.", "Essa nota, sozinha, não indica uma condição de saúde."); }
  /* ferramentas do mesmo sistema: a principal (papel/rank do catalogo) em destaque; as outras como "outra possibilidade" */
  function ppPaciente(lista) {
    var l = lista.slice().sort(function (a, b) { return (a.papel === "principal" ? 0 : 1) - (b.papel === "principal" ? 0 : 1); });
    var h = '<div class="sf-bloco sf-g sf-g-pac"><span class="sf-rot">' + PP_PACIENTE_TITULO + "</span>";
    if (l.length === 1) h += '<p class="sf-pp-principal">' + esc(l[0].nome) + "</p>";
    else h += '<p class="sf-pp-principal"><span class="sf-pp-rot">Principal:</span> ' + esc(l[0].nome) + "</p>" +
      l.slice(1).map(function (p) { return '<p class="sf-pp-outra"><span class="sf-pp-rot">Outra possibilidade:</span> ' + esc(p.nome) + "</p>"; }).join("");
    return h + '<p class="sf-nota">' + PP_PACIENTE_ESCOLHA + "</p></div>";
  }
  /* versao COMPACTA (paciente, "Detalhes do mapa"): nome, nota, marcadores, definicao curta */
  function htmlSistemaCompacto(f, extras) {
    var r = f.resultado; extras = extras || {};
    return '<article class="rh-sis sf-sis sf-compacto rh-faixa-' + esc(r.faixa || "sem") + '" data-sf-sistema="' + esc(f.sistema) + '">' +
      "<header><h4>" + esc(f.nome) + '</h4><span class="rh-sis-nota">' + (r.avaliavel ? fmt(r.nota) : "—") + "</span></header>" +
      '<p class="rh-sis-faixa">' + (r.prioridade ? '<b class="sf-prioridade">' + esc(r.prioridade) + "</b> · " : "") +
        esc(r.avaliavel ? (extras.faixaPaciente ? extras.faixaPaciente(r.faixa) : "") : "sem nota") + "</p>" +
      (f.organiza ? '<p class="sf-def-curta">' + esc(definicaoPaciente(f.organiza)) + "</p>" : "") + "</article>";
  }

  /* visao: "profissional" | "paciente". Paciente: sem faixa tecnica, sem cobertura, sem pendencia, sem regra. */
  function htmlSistema(f, visao, extras) {
    var paciente = visao === "paciente", r = f.resultado;
    extras = extras || {};
    var faixaTxt = r.avaliavel ? (paciente ? (extras.faixaPaciente ? extras.faixaPaciente(r.faixa) : "") : "faixa " + (extras.faixaTxt ? extras.faixaTxt(r.faixa) : r.faixa)) : "sem nota";
    var h = '<article class="rh-sis sf-sis rh-faixa-' + esc(r.faixa || "sem") + (r.prioridade ? " sf-prioritario" : "") + '" data-sf-sistema="' + esc(f.sistema) + '">' +
      "<header><h4>" + esc(f.nome) + '</h4><span class="rh-sis-nota">' + (r.avaliavel ? fmt(r.nota) : "—") + "</span></header>" +
      '<p class="rh-sis-faixa">' + (r.prioridade ? '<b class="sf-prioridade">' + esc(r.prioridade) + "</b> · " : "") + esc(faixaTxt) +
        (!paciente && r.total !== null ? " · " + esc(r.respondidos + " de " + r.total) + " respondidas" : "") + "</p>";
    if (f.organiza) h += '<div class="sf-bloco sf-a"><span class="sf-rot">O que este eixo ' + (paciente ? "reúne" : "organiza") + "</span><p>" + esc(paciente ? definicaoPaciente(f.organiza) : f.organiza) + "</p></div>";
    if (r.avaliavel) {
      h += '<div class="sf-bloco sf-c"><span class="sf-rot">O que mais contribuiu para este resultado</span>' +
        (f.contribuiu.sinais.length ? (paciente ? '<p class="sf-nota">' + esc(INTRO_SINAIS_PACIENTE) + "</p>" + lista(f.contribuiu.sinais)
            : '<p class="sf-nota">' + esc(f.contribuiu.intro) + "</p>" + lista(f.contribuiu.sinais) + '<p class="sf-nota">' + esc(f.contribuiu.ressalva) + "</p>")
          : '<p class="sf-nota">' + esc(f.contribuiu.origem === "nenhuma" && !paciente ? SINAIS_FORA : "Nenhum sinal pontuou neste eixo nesta aplicação.") + "</p>") + "</div>";
    }
    if (f.significado) h += '<div class="sf-bloco sf-d"><span class="sf-rot">O que isso significa dentro do HOLOSCAN</span><p>' + esc(paciente ? significadoPaciente(f.significado) : f.significado) + "</p></div>";
    if (f.nao_significa) h += '<div class="sf-bloco sf-e"><span class="sf-rot">O que isso não significa</span><p>' + esc(f.nao_significa) + " O HOLOSCAN não é diagnóstico.</p></div>";
    if (f.aprofundamento) h += '<div class="sf-bloco sf-f"><span class="sf-rot">O que pode merecer aprofundamento</span><p>' + esc(f.aprofundamento) + "</p>" +
      (f.ressalva_aprofundamento ? '<p class="sf-ressalva">' + esc(f.ressalva_aprofundamento) + "</p>" : "") + "</div>";
    if (!paciente && f.pendencias.length) h += '<div class="sf-bloco sf-f sf-pend"><span class="sf-rot">' + SELO_PENDENCIA + "</span>" + f.pendencias.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("") + "</div>";
    if (f.proximo_passo.length && paciente && extras.mostrarPP) h += ppPaciente(f.proximo_passo);
    else if (f.proximo_passo.length && !paciente) {
      h += '<div class="sf-bloco sf-g"><span class="sf-rot">Próximo passo pelo catálogo</span>' + f.proximo_passo.map(function (p) { return blocoPP(p, paciente); }).join("") + "</div>";
    }
    return h + "</article>";
  }

  var api = {
    VERSAO: VERSAO, SISTEMAS: SISTEMAS, NAO_PRIORITARIO: NAO_PRIORITARIO, SIGNIFICADO: SIGNIFICADO, NAO_SIGNIFICA: NAO_SIGNIFICA,
    PROIBIDOS: PROIBIDOS, PP_POR_QUE: PP_POR_QUE, PP_SINAIS: PP_SINAIS, INTRO_SINAIS: INTRO_SINAIS, RESSALVA_SINAIS: RESSALVA_SINAIS,
    ROTULO_HISTORICO: ROTULO_HISTORICO, SELO_PENDENCIA: SELO_PENDENCIA, PENDENCIA_PRIORITARIO: PENDENCIA_PRIORITARIO,
    fechamento: fechamento, deResultado: deResultado, historico: historico, htmlSistema: htmlSistema, htmlSistemaCompacto: htmlSistemaCompacto,
    INTRO_SINAIS_PACIENTE: INTRO_SINAIS_PACIENTE, PP_PACIENTE_TITULO: PP_PACIENTE_TITULO, PP_PACIENTE_ESCOLHA: PP_PACIENTE_ESCOLHA, definicaoPaciente: definicaoPaciente
  };
  raiz.SistemasFechamento = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
