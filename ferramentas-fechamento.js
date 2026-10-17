/* ===========================================================================
   FERRAMENTAS-FECHAMENTO — o "resultado estruturado" de cada ferramenta
   ===========================================================================

   Decisao metodologica aprovada (10/10, DECISOES-V1 item 180, Decisao 2):
   toda ferramenta pode ter um resultado estruturado, e RESULTADO NAO E SCORE.
   Este modulo so ORGANIZA o que foi registrado na aplicacao, com os rotulos do
   metodo. Nao classifica (baixo/medio/alto), nao interpreta, nao cria
   categoria, nao infere causa, trauma, padrao ou diagnostico, nao calcula
   media e nao indica proxima ferramenta. Le so as respostas do snapshot.

     OQ3                Quero / Preciso / Consigo / Alavancas
     Linha do Momentum  estado ESCOLHIDO pela nutricionista + justificativa +
                        dimensoes registradas (o sistema nunca sugere estado)
     Mapa da Rotina     a realidade pratica, descritiva
     PQQ                os cinco niveis + a sintese construida com a paciente
     Mapa de Crencas    descritivo, sem taxonomia
     Gatilhos           a cadeia registrada, sem causalidade
     Mapa do Proposito  derivado de OQ3 + PQQ (unica relacao ferramenta ->
                        ferramenta homologada; opcional)
     Roda Holistica     a percepcao da pessoa por area, sem media obrigatoria
     Carta ao Futuro Eu so "realizada" (sem interpretar; o conteudo nao vai
                        para a paciente automaticamente)
     Conexao            mapa contextual, sem score nem classificacao; na
                        sintese, so contagens (minimiza dado de terceiros)

   Motor de resultados V1 (12/10, itens 16-26): resultado() e o RESULTADO DA FERRAMENTA (contrato: o que apareceu /
   o que significa / o que pode mudar / proximo passo), versionado (MR-V1); de() continua sendo o REGISTRO DA
   FERRAMENTA (a reorganizacao do que foi preenchido).

   Funciona no navegador (window.FerramentasFechamento) e no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var ESTADOS_MOMENTUM = { preservar: "Preservar", reorganizar: "Reorganizar", construir: "Construir", expandir: "Expandir" };
  var DIM_MOMENTUM = [["energia", "Energia disponível"], ["carga", "Carga de vida"], ["controle", "Controle sobre a rotina"],
    ["suporte", "Suporte"], ["espaco", "Espaço mental"], ["estabilidade", "Estabilidade atual"]];
  var AREAS_RODA = [["saude", "Saúde"], ["relacoes", "Relações"], ["trabalho", "Trabalho"], ["financas", "Finanças"],
    ["espiritualidade", "Espiritualidade"], ["lazer", "Lazer"], ["desenvolvimento", "Desenvolvimento"], ["proposito", "Propósito"]];
  var NOMES = {
    oq3: "OQ³", pqq: "PQQ — Escada dos Porquês", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina",
    mapa_crencas: "Mapa de Crenças Alimentares", gatilhos_respostas_v1: "Gatilhos & Respostas", roda_vida: "Roda Holística da Vida",
    carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento", mapa: "Mapa do Propósito"
  };

  function tem(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }
  function txt(v) { return Array.isArray(v) ? v.filter(tem).join(", ") : String(v); }
  function num(v) { var n = Number(v); return v !== null && v !== undefined && v !== "" && !isNaN(n) ? n : null; }

  /* item: { rotulo, valor, so_profissional? } — so entra se houver valor */
  function itens(r, pares) {
    return pares.filter(function (p) { return tem(r[p[0]]); }).map(function (p) {
      return { rotulo: p[1], valor: txt(r[p[0]]), so_profissional: !!p[2] };
    });
  }

  function oq3(r) {
    var it = itens(r, [["quer", "O que quer"], ["precisa", "O que precisa de atenção"], ["consegue", "O que consegue sustentar agora"], ["alavancas", "Alavancas"]]);
    var partes = [["quer", "Quero"], ["precisa", "Preciso"], ["consegue", "Consigo"]].filter(function (p) { return tem(r[p[0]]); }).map(function (p) { return p[1]; });
    return { itens: it, linha: partes.length ? partes.join(", ").replace(/, ([^,]*)$/, " e $1") + (partes.length > 1 ? " registrados." : " registrado.") : "nada preenchido." };
  }
  function pqq(r) {
    var niveis = ["r1", "r2", "r3", "r4", "r5"].filter(function (k) { return tem(r[k]); });
    var it = itens(r, [["objetivo", "Objetivo declarado"]]);
    niveis.forEach(function (k) { it.push({ rotulo: "Nível " + k.slice(1) + " — por que importa", valor: txt(r[k]) }); });
    if (tem(r.verdadeiro)) it.push({ rotulo: "Síntese construída com a paciente", valor: txt(r.verdadeiro) });
    /* rodada UX 14/10: o PQQ novo tem 3 perguntas; aplicacao antiga com respostas 4/5 continua contando de 5 */
    var total = tem(r.r4) || tem(r.r5) ? 5 : 3;
    return { itens: it, linha: niveis.length + " de " + total + " níveis registrados" + (tem(r.verdadeiro) ? "; síntese final registrada." : ".") };
  }
  function momentum(r) {
    var est = r.estado_confirmado ? (ESTADOS_MOMENTUM[r.estado_confirmado] || String(r.estado_confirmado)) : null;
    var it = [];
    it.push({ rotulo: "Estado escolhido pela nutricionista", valor: est || "não registrado" });
    if (tem(r.justificativa_estado)) it.push({ rotulo: "Justificativa / registro profissional", valor: txt(r.justificativa_estado), so_profissional: true });
    var dims = DIM_MOMENTUM.filter(function (d) { return num(r[d[0]]) !== null; });
    if (dims.length) it.push({ rotulo: "Dimensões registradas", valor: dims.map(function (d) { return d[1] + " " + num(r[d[0]]); }).join(" · ") });
    it = it.concat(itens(r, [["sustenta", "O que sustenta"], ["limita", "O que limita"], ["nao_pedir", "O que não pedir agora"]]));
    return { itens: it, linha: est ? "estado escolhido pela nutricionista: " + est + "." : "estado não registrado.", estado: est };
  }
  function rotina(r) {
    var it = [];
    var sono = [tem(r.acorda) ? "acorda " + r.acorda : "", tem(r.dorme) ? "dorme " + r.dorme : "", tem(r.sono) ? txt(r.sono) : ""].filter(Boolean).join(" · ");
    if (sono) it.push({ rotulo: "Sono", valor: sono });
    it = it.concat(itens(r, [["trabalho", "Trabalho"], ["deslocamentos", "Deslocamento"]]));
    var resp = [["familia", "família"], ["domesticas", "tarefas domésticas"], ["estudos", "estudos"], ["compromissos", "compromissos"]]
      .filter(function (p) { return tem(r[p[0]]); }).map(function (p) { return p[1] + ": " + txt(r[p[0]]); });
    if (resp.length) it.push({ rotulo: "Responsabilidades", valor: resp.join(" · ") });
    var ev = Array.isArray(r.eventos) ? r.eventos : [];
    if (ev.length) {
      it.push({ rotulo: "O dia registrado (refeições, atividade, pausas…)", valor: ev.map(function (e) {
        return [e.inicio, e.titulo || e.categoria, e.percepcao ? "(" + txt(e.percepcao) + ")" : ""].filter(tem).join(" ");
      }).join(" · ") });
    }
    it = it.concat(itens(r, [["dificuldade", "Momentos de dificuldade"], ["disponiveis", "Momentos disponíveis"],
      ["espacos", "Oportunidades / espaços para a mudança"], ["observacoes", "Observações"]]));
    return { itens: it, linha: ev.length + (ev.length === 1 ? " momento do dia registrado" : " momentos do dia registrados") + (tem(r.espacos) ? "; espaços para a mudança registrados." : ".") };
  }
  function crencas(r) {
    return { itens: itens(r, [["crencas", "Crença(s) relatada(s)"], ["origem", "Contexto / origem relatada"], ["mais_atrapalha", "Efeito percebido (o que mais atrapalha)"], ["alternativa", "Alternativa registrada"]]),
      linha: tem(r.crencas) ? "crença(s) relatada(s) registrada(s), sem classificação." : "nada preenchido." };
  }
  function gatilhos(r) {
    var quando = [r.data, r.horario].filter(tem).join(" ");
    var it = [];
    if (quando || tem(r.contexto)) it.push({ rotulo: "Situação", valor: [quando, tem(r.contexto) ? txt(r.contexto) : ""].filter(Boolean).join(" · ") });
    it = it.concat(itens(r, [["gatilho", "Gatilho"], ["pensamento", "Pensamento relatado"]]));
    if (tem(r.emocao)) it.push({ rotulo: "Emoção relatada", valor: txt(r.emocao) + (num(r.intensidade) !== null ? " (intensidade " + num(r.intensidade) + ")" : "") });
    it = it.concat(itens(r, [["resposta", "Resposta / comportamento"], ["consequencia_imediata", "Consequência percebida (logo depois)"],
      ["consequencia_posterior", "Consequência percebida (mais tarde)"], ["necessidade", "Necessidade relatada"], ["alternativa", "Recurso / alternativa"],
      ["observacao_nutri", "Observação da nutricionista", true]]));
    var elos = ["gatilho", "pensamento", "emocao", "resposta", "consequencia_imediata", "alternativa"].filter(function (k) { return tem(r[k]); }).length;
    return { itens: it, linha: "cadeia registrada como foi relatada (" + elos + " de 6 elos: gatilho → pensamento/emoção → resposta → consequência → recurso)." };
  }
  function roda(r) {
    var areas = AREAS_RODA.filter(function (a) { return num(r[a[0]]) !== null; }).map(function (a) { return { nome: a[1], valor: num(r[a[0]]) }; });
    var it = [];
    if (areas.length) {
      it.push({ rotulo: "Percepção por área", valor: areas.map(function (a) { return a.nome + " " + a.valor; }).join(" · ") });
      var max = Math.max.apply(null, areas.map(function (a) { return a.valor; })), min = Math.min.apply(null, areas.map(function (a) { return a.valor; }));
      if (max !== min) {
        it.push({ rotulo: "Áreas percebidas como mais cuidadas", valor: areas.filter(function (a) { return a.valor === max; }).map(function (a) { return a.nome; }).join(", ") });
        it.push({ rotulo: "Áreas percebidas como menos cuidadas", valor: areas.filter(function (a) { return a.valor === min; }).map(function (a) { return a.nome; }).join(", ") });
      } else it.push({ rotulo: "Distribuição", valor: "todas as áreas registradas com a mesma nota" });
    }
    it = it.concat(itens(r, [["puxa", "Área que a pessoa disse que puxa para baixo"]]));
    return { itens: it, linha: areas.length + " de 8 áreas com percepção registrada (sem média)." };
  }
  function carta(r) {
    return { itens: [{ rotulo: "Carta ao Futuro Eu", valor: "realizada" + (tem(r.para_quando) ? " (para " + txt(r.para_quando) + ")" : "") }],
      linha: "realizada.", conteudo_privado: true };
  }
  function conexao(r) {
    var it = itens(r, [["contar", "Com quem pode contar"], ["apoia_mudanca", "Quem apoia a mudança"], ["dificulta_mudanca", "O que dificulta a mudança"],
      ["pertence", "Pertencimento"], ["sozinha", "Quando se sente só"], ["fortalecem", "Ambientes que fortalecem"], ["dificultam", "Ambientes que dificultam"],
      ["referencias", "Referências"], ["espacos_seguros", "Espaços seguros"], ["percepcao_apoio", "Percepção de apoio"], ["conexao_consigo", "Conexão consigo"]]);
    var esp = itens(r, [["espiritualidade", "Espiritualidade"], ["comunidade_religiosa", "Comunidade"], ["pratica_espiritual", "Prática"], ["algo_maior", "Algo maior"]]);
    if (esp.length) it.push({ rotulo: "Espiritualidade (registrada porque fez sentido para a pessoa)", valor: esp.map(function (x) { return x.rotulo + ": " + x.valor; }).join(" · ") });
    var v = Array.isArray(r.vinculos) ? r.vinculos : [];
    if (v.length) it.push({ rotulo: "Vínculos registrados", valor: v.length + (v.length === 1 ? " vínculo" : " vínculos"), so_profissional: false });
    it = it.concat(itens(r, [["observacoes", "Observações"]]));
    return { itens: it, linha: v.length + (v.length === 1 ? " vínculo registrado" : " vínculos registrados") + " (mapa contextual, sem classificação)." };
  }

  var POR_FERRAMENTA = { oq3: oq3, pqq: pqq, linha_momentum: momentum, mapa_rotina_v1: rotina, mapa_crencas: crencas,
    gatilhos_respostas_v1: gatilhos, roda_vida: roda, carta_futuro: carta, conexao_pertencimento_v1: conexao };

  /** Fechamento estruturado de uma aplicacao do snapshot ({ferramenta_id, respostas}). */
  function de(t) {
    if (!t) return null;
    var fn = POR_FERRAMENTA[t.ferramenta_id];
    var r = t.respostas || {};
    var f = fn ? fn(r) : { itens: [], linha: "registrada." };
    f.ferramenta_id = t.ferramenta_id;
    f.nome = NOMES[t.ferramenta_id] || t.ferramenta_id;
    return f;
  }

  /* OQ3 + PQQ -> Mapa do Proposito: a unica relacao ferramenta -> ferramenta homologada (opcional).
     Criterio: aplicacoes validas (concluidas/revisadas — as unicas que entram no snapshot) de OQ3 e de
     PQQ, cada uma com conteudo (OQ3: quer, precisa ou consegue; PQQ: objetivo, algum nivel ou a sintese). */
  function temConteudoOq3(t) { var r = (t && t.respostas) || {}; return tem(r.quer) || tem(r.precisa) || tem(r.consegue); }
  function temConteudoPqq(t) { var r = (t && t.respostas) || {}; return tem(r.objetivo) || tem(r.verdadeiro) || ["r1", "r2", "r3", "r4", "r5"].some(function (k) { return tem(r[k]); }); }
  function valida(t) { return !!t && (t.status === undefined || t.status === "concluida" || t.status === "revisada"); }
  function propositoDisponivel(ferramentas) {
    var fs = ferramentas || [];
    var a = fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0], b = fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0];
    return !!(valida(a) && valida(b) && temConteudoOq3(a) && temConteudoPqq(b));
  }
  function proposito(ferramentas) {
    if (!propositoDisponivel(ferramentas)) return null;
    var fs = ferramentas || [];
    var a = (fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0].respostas) || {}, b = (fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0].respostas) || {};
    return { ferramenta_id: "mapa", nome: NOMES.mapa,
      itens: itens({ quer: a.quer, importa: b.verdadeiro, direcao: b.objetivo, sustenta: a.consegue },
        [["quer", "O que quer"], ["importa", "Por que importa"], ["sustenta", "O que consegue sustentar"]]),
      linha: "organizado a partir do OQ³ e do PQQ (opcional)." };
  }

  /* As relacoes ferramenta -> ferramenta que o sistema gera sozinho: so esta. */
  var RELACOES_AUTOMATICAS = [{ de: ["oq3", "pqq"], para: "mapa", obrigatoria: false }];

  /* ===========================================================================
     RESULTADO DA FERRAMENTA — motor de resultados V1 (12/10, itens 16-26)
     Contrato universal: 1. O QUE APARECEU · 2. O QUE ISSO SIGNIFICA NESTA FERRAMENTA · 3. O QUE ISSO PODE MUDAR NO
     ACOMPANHAMENTO · 4. PROXIMO PASSO POSSIVEL. So textos do pedido de 12/10 (literais). Onde o metodo nao sustenta
     2-4, o campo fica null e a pendencia e marcada (so a nutricionista ve). Nada de IA, score, classificacao, causa,
     conduta. "apareceu" so reorganiza o que foi registrado (cada item: rotulo, valor, so_profissional, sensivel).
     =========================================================================== */
  var VERSAO_RESULTADO = "MR-V1";
  var PROPOSITO_OPCIONAL = "Mapa do Propósito disponível como aprofundamento opcional.";
  var MUDA = {
    oq3: "O planejamento da etapa deve considerar simultaneamente desejo, necessidade e capacidade atual.",
    linha_momentum: "Este estado ajuda a calibrar a exigência e a quantidade de mudanças propostas nesta etapa.",
    mapa_rotina_v1: "Essas informações ajudam a escolher mudanças que realmente caibam na rotina atual.",
    pqq: "Essa síntese pode ajudar a manter as mudanças conectadas ao significado que a própria paciente atribui ao objetivo.",
    mapa_crencas: "Esse registro ajuda a tornar visíveis ideias que podem estar influenciando escolhas alimentares e permite observá-las em situações reais.",
    gatilhos_respostas_v1: "A sequência ajuda a tornar observável o que acontece antes e depois de determinado comportamento.",
    roda_vida: "Essa percepção ajuda a escolher quais áreas merecem atenção neste momento.",
    conexao_pertencimento_v1: "Essas informações ajudam a compreender quais recursos de apoio estão disponíveis durante o processo."
  };
  /* "Por que usamos esta ferramenta" (rodada de UX de 13/10): SO os textos homologados; as demais ferramentas ficam sem o bloco */
  var POR_QUE_USAMOS = {
    mapa_rotina_v1: "Para entender onde as dificuldades e as possibilidades de mudança aparecem na rotina real, antes de combinar mudanças que talvez não caibam no dia a dia.",
    pqq: "Para compreender o que o objetivo desejado representa para a paciente e conectar a mudança a significados que façam sentido para ela."
  };
  var CARTA_PACIENTE = "A Carta ao Futuro Eu foi realizada como exercício de reflexão sobre identidade, direção e cuidado futuro.";
  var PEND = {
    significa: "Não há texto aprovado sobre o que este registro significa nesta ferramenta.",
    muda: "Não há texto aprovado sobre o que este registro pode mudar no acompanhamento.",
    estado: "O texto do que cada estado do Momentum representa ainda não está aprovado (banco de estados em rascunho).",
    intervencao: "\"Ponto de intervenção\" em Gatilhos & Respostas: não há regra homologada.",
    direcao: "\"Direção desta etapa\" no Mapa do Propósito: não há regra homologada; o bloco não é mostrado.",
    proximo: "Não há próximo passo automático homologado para esta ferramenta."
  };

  function item(rotulo, valor, extra) { var o = { rotulo: rotulo, valor: txt(valor), so_profissional: false, sensivel: false }; if (extra) for (var k in extra) o[k] = extra[k]; return o; }
  function campos(r, pares) { return pares.filter(function (p) { return tem(r[p[0]]); }).map(function (p) { return item(p[1], r[p[0]], p[2]); }); }
  function acha(fs, id) { return (fs || []).filter(function (t) { return t.ferramenta_id === id; })[0] || null; }

  var RESULTADO = {
    oq3: function (r, fs) {
      return { apareceu: campos(r, [["quer", "O que a pessoa quer"], ["precisa", "O que precisa ser considerado"], ["consegue", "O que ela consegue sustentar agora"], ["alavancas", "Possíveis alavancas"]]),
        proximo: propositoDisponivel(fs) ? PROPOSITO_OPCIONAL : null };
    },
    linha_momentum: function (r) {
      var est = r.estado_confirmado ? (ESTADOS_MOMENTUM[r.estado_confirmado] || String(r.estado_confirmado)) : null;
      var ap = [item("Estado atual (escolhido pela nutricionista)", est || "não registrado")];
      if (tem(r.justificativa_estado)) ap.push(item("Justificativa da nutricionista", r.justificativa_estado, { so_profissional: true }));
      ap = ap.concat(campos(r, [["sustenta", "Fatores que sustentam"], ["limita", "Fatores que limitam"], ["nao_pedir", "O que evitar nesta etapa"]]));
      return { apareceu: ap, estado: est, pendencias: est ? [PEND.estado] : [] };
    },
    mapa_rotina_v1: function (r, fs, t) {
      var atual = [];
      if (tem(r.acorda) || tem(r.dorme)) atual.push([tem(r.acorda) ? "acorda " + r.acorda : "", tem(r.dorme) ? "dorme " + r.dorme : ""].filter(Boolean).join(", "));
      if (tem(r.sono)) atual.push("sono: " + txt(r.sono));
      if (tem(r.trabalho)) atual.push("trabalho: " + txt(r.trabalho));
      var ev = Array.isArray(r.eventos) ? r.eventos : [];
      if (ev.length) atual.push(ev.length + (ev.length === 1 ? " momento do dia registrado" : " momentos do dia registrados"));
      var ap = atual.length ? [item("Rotina atual", atual.join(" · "))] : [];
      ap = ap.concat(campos(r, [["dificuldade", "Momentos de maior dificuldade"], ["disponiveis", "Momentos disponíveis"], ["espacos", "Oportunidades / espaços para mudança"]]));
      return { apareceu: ap, leitura_nutri: t && tem(t.leitura) ? txt(t.leitura) : null };
    },
    pqq: function (r, fs) {
      var ap = campos(r, [["objetivo", "Objetivo declarado"]]);
      var niveis = ["r1", "r2", "r3", "r4", "r5"].filter(function (k) { return tem(r[k]); }).map(function (k) { return txt(r[k]); });
      if (niveis.length) ap.push(item("O que foi ganhando importância ao longo do PQQ", niveis.join(" → ")));
      if (tem(r.verdadeiro)) ap.push(item("Síntese construída com a paciente", r.verdadeiro));
      return { apareceu: ap, proximo: propositoDisponivel(fs) ? PROPOSITO_OPCIONAL : null };
    },
    mapa_crencas: function (r) {
      return { apareceu: campos(r, [["crencas", "Crença registrada"], ["origem", "Origem percebida"], ["mais_atrapalha", "Crença que mais dificulta"], ["alternativa", "Alternativa construída"]]) };
    },
    gatilhos_respostas_v1: function (r) {
      var quando = [r.data, r.horario].filter(tem).join(" ");
      var cadeia = [];
      if (quando || tem(r.contexto)) cadeia.push(item("Situação", [quando, tem(r.contexto) ? txt(r.contexto) : ""].filter(Boolean).join(" · ")));
      cadeia = cadeia.concat(campos(r, [["gatilho", "Gatilho"]]));
      var pe = [tem(r.pensamento) ? txt(r.pensamento) : "", tem(r.emocao) ? txt(r.emocao) + (num(r.intensidade) !== null ? " (intensidade " + num(r.intensidade) + ")" : "") : ""].filter(Boolean);
      if (pe.length) cadeia.push(item("Pensamento / emoção relatada", pe.join(" · ")));
      cadeia = cadeia.concat(campos(r, [["resposta", "Resposta / comportamento"]]));
      var cons = [r.consequencia_imediata, r.consequencia_posterior].filter(tem).map(txt);
      if (cons.length) cadeia.push(item("Consequência percebida", cons.join(" · ")));
      cadeia = cadeia.concat(campos(r, [["necessidade", "Necessidade / recurso"], ["alternativa", "Alternativa"]]));
      cadeia.forEach(function (c) { c.elo = true; });
      cadeia = cadeia.concat(campos(r, [["observacao_nutri", "Observação da nutricionista", { so_profissional: true }]]));
      return { apareceu: cadeia, pendencias: [PEND.intervencao] };
    },
    mapa: function () { return { apareceu: [] }; },
    roda_vida: function (r) {
      var areas = AREAS_RODA.filter(function (a) { return num(r[a[0]]) !== null; }).map(function (a) { return { nome: a[1], valor: num(r[a[0]]) }; });
      var ap = [];
      if (areas.length) {
        var max = Math.max.apply(null, areas.map(function (a) { return a.valor; })), min = Math.min.apply(null, areas.map(function (a) { return a.valor; }));
        if (max !== min) {
          ap.push(item("Áreas percebidas como mais cuidadas", areas.filter(function (a) { return a.valor === max; }).map(function (a) { return a.nome; })));
          ap.push(item("Áreas percebidas como menos cuidadas", areas.filter(function (a) { return a.valor === min; }).map(function (a) { return a.nome; })));
        } else ap.push(item("Percepção por área", "todas as áreas registradas com a mesma nota"));
        ap.push(item("Notas percebidas por área", areas.map(function (a) { return a.nome + " " + a.valor; }).join(" · "), { so_profissional: true }));
      }
      return { apareceu: ap };
    },
    carta_futuro: function (r) {
      return { apareceu: [item("Carta ao Futuro Eu", CARTA_PACIENTE)].concat(tem(r.para_quando) ? [item("Para quando", r.para_quando, { so_profissional: true })] : []) };
    },
    conexao_pertencimento_v1: function (r) {
      var v = Array.isArray(r.vinculos) ? r.vinculos : [];
      var apoio = v.filter(function (x) { return x && x.papel === "apoia"; }).length;
      var ap = [];
      /* fontes de apoio: na paciente, so contagem (sem nome de terceiro); a nutricionista ve o que foi escrito */
      if (v.length) ap.push(item("Fontes de apoio registradas", apoio + " de " + v.length + (v.length === 1 ? " vínculo registrado" : " vínculos registrados") + " apontado(s) como apoio"));
      ap = ap.concat(campos(r, [["contar", "Com quem pode contar", { so_profissional: true, sensivel: true }]]));
      ap = ap.concat(campos(r, [["pertence", "Contextos de pertencimento", { sensivel: true }]]));
      var esp = [["espiritualidade", "Espiritualidade"], ["comunidade_religiosa", "Comunidade"], ["pratica_espiritual", "Prática"], ["algo_maior", "Algo maior"], ["conexao_consigo", "Conexão consigo"]]
        .filter(function (p) { return tem(r[p[0]]); }).map(function (p) { return p[1] + ": " + txt(r[p[0]]); });
      /* "somente se a paciente respondeu e autorizou os campos pertinentes": nao ha campo de autorizacao no registro ->
         a nutricionista ve; a paciente nao (ate existir a regra) */
      if (esp.length) ap.push(item("Conexão / espiritualidade", esp.join(" · "), { so_profissional: true, sensivel: true }));
      return { apareceu: ap, pendencias: esp.length ? ["Conexão / espiritualidade na visão da paciente: não há campo de autorização no registro; fica só na visão profissional."] : [] };
    }
  };

  /** Resultado de UMA ferramenta (t = item do snapshot); fs = todas as ferramentas do mesmo resultado. */
  function resultado(t, fs) {
    if (!t) return null;
    var fn = RESULTADO[t.ferramenta_id];
    if (!fn) return { motor: VERSAO_RESULTADO, ferramenta_id: t.ferramenta_id, nome: NOMES[t.ferramenta_id] || t.ferramenta_id, apareceu: [], significa: null, muda: null, proximo: null, pendencias: [PEND.significa, PEND.muda] };
    var x = fn(t.respostas || {}, fs || [], t);
    var pend = [PEND.significa].concat(MUDA[t.ferramenta_id] ? [] : [PEND.muda]).concat(x.pendencias || []);
    if (!x.proximo) pend.push(PEND.proximo);
    return { motor: VERSAO_RESULTADO, ferramenta_id: t.ferramenta_id, nome: NOMES[t.ferramenta_id] || t.ferramenta_id,
      por_que_usamos: POR_QUE_USAMOS[t.ferramenta_id] || null,
      apareceu: x.apareceu || [], significa: null, muda: MUDA[t.ferramenta_id] || null, proximo: x.proximo || null,
      estado: x.estado || null, leitura_nutri: x.leitura_nutri || null, pendencias: pend };
  }

  /** Mapa do Proposito (item 23): versao derivada de OQ3 + PQQ, com a referencia das aplicacoes fonte. */
  function resultadoProposito(fs, derivado) {
    var c, fontes, historico = false;
    if (derivado && derivado.campos) {          // template 4: a versao derivada congelada no snapshot (servidor)
      c = derivado.campos; fontes = derivado.fontes || [];
    } else {                                    // resultado anterior: derivado agora, pela mesma regra (proposito())
      if (!proposito(fs)) return null;
      var a = acha(fs, "oq3"), b = acha(fs, "pqq"), ra = a.respostas || {}, rb = b.respostas || {};
      c = { quer: ra.quer, importa: rb.verdadeiro, sustenta: ra.consegue, direcao: rb.objetivo };
      fontes = [{ ferramenta_id: "oq3", id: a.id || null, concluida_em: a.concluida_em || null }, { ferramenta_id: "pqq", id: b.id || null, concluida_em: b.concluida_em || null }];
      historico = true;
    }
    var ap = campos(c,
      /* 13/10 (fechamento de homologacao): sem bloco "Direcao desta etapa" — nao ha regra homologada; so o factual de OQ3 + PQQ */
      [["quer", "O que eu quero"], ["importa", "Por que isso importa"], ["sustenta", "O que consigo sustentar agora"]]);
    return { motor: VERSAO_RESULTADO, ferramenta_id: "mapa", nome: NOMES.mapa, derivado: true, derivado_agora: historico, fontes: fontes,
      apareceu: ap, significa: null, muda: null, proximo: null, pendencias: [PEND.significa, PEND.muda, PEND.direcao] };
  }

  var api = { de: de, proposito: proposito, propositoDisponivel: propositoDisponivel, RELACOES_AUTOMATICAS: RELACOES_AUTOMATICAS,
    ESTADOS_MOMENTUM: ESTADOS_MOMENTUM, NOMES: NOMES, AREAS_RODA: AREAS_RODA,
    resultado: resultado, resultadoProposito: resultadoProposito, VERSAO_RESULTADO: VERSAO_RESULTADO, MUDA: MUDA,
    CARTA_PACIENTE: CARTA_PACIENTE, POR_QUE_USAMOS: POR_QUE_USAMOS, PROPOSITO_OPCIONAL: PROPOSITO_OPCIONAL, PENDENCIAS_RESULTADO: PEND };
  raiz.FerramentasFechamento = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
