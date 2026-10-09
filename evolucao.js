/* ===========================================================================
   EVOLUCAO — a comparacao entre duas aplicacoes
   ===========================================================================

   Era a promessa central do produto desde o primeiro material — "um indice
   HOLOS que rastreia evolucao em 4, 8 e 12 semanas" — e a unica peca grande
   que nunca existiu. Ela nao existia por um motivo simples: o app guardava a
   ultima pontuacao sobrescrevendo a anterior, e sem duas nao ha o que comparar.

   Agora o historico e guardado, e isto o le. Nao calcula nada: as duas
   Pontuacoes ja vieram prontas do motor. Aqui so se faz a subtracao.

   Aparece na tela do HOLOSCAN quando houver mais de uma aplicacao. Com uma
   so, nao aparece — comparar um ponto consigo mesmo nao diz nada.
   =========================================================================== */

(function () {
  "use strict";

  function historico() {
    return window.historicoPontuacao ? window.historicoPontuacao() : [];
  }
  var escapar = window.escapar;
  function dataBonita(iso) {
    if (!iso) return "";
    var meses = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
    var p = iso.split("-");
    return p[2] + " " + meses[Number(p[1]) - 1] + " " + p[0];
  }
  function semanasEntre(a, b) {
    var sa = String(a).slice(0, 10), sb = String(b).slice(0, 10);
    var d = (new Date(sb + "T00:00:00") - new Date(sa + "T00:00:00")) / 86400000;
    return isNaN(d) ? null : Math.round(d / 7);
  }

  /** Nome curto de cada vertice: sem eles o pentagono nao diz o que e o quê. */
  var ROTULO = {
    fungico: "Fúngico",
    acido_inflamatorio: "Inflamatório",
    metabolico: "Metabólico",
    detox_linfatico: "Detox",
    mental_emocional_espiritual: "Mental"
  };

  /** Pentagono com os dois momentos sobrepostos: o antes fica fantasma. */
  function radarDuplo(antes, depois, tam, rotulos) {
    var C = tam / 2, R = tam * .36, i, a, moldura = "", eixos = "", nomes = "";
    /* Com algum sistema sem nota, o poligono daquela aplicacao nao e
       desenhado: qualquer vertice inventado seria afirmacao sobre dado que
       nao existe (mesma regra da Triade). */
    function completo(valores) {
      return valores.every(function (v) { return typeof v === "number" && !isNaN(v); });
    }
    function pontos(valores) {
      var p = [];
      for (var k = 0; k < 5; k++) {
        var ang = -Math.PI / 2 + k * 2 * Math.PI / 5;
        var r = R * valores[k] / 10;
        p.push((C + r * Math.cos(ang)).toFixed(1) + "," + (C + r * Math.sin(ang)).toFixed(1));
      }
      return p.join(" ");
    }
    [.25, .5, .75, 1].forEach(function (f) {
      var q = [];
      for (var k = 0; k < 5; k++) {
        var g = -Math.PI / 2 + k * 2 * Math.PI / 5;
        q.push((C + R * f * Math.cos(g)).toFixed(1) + "," + (C + R * f * Math.sin(g)).toFixed(1));
      }
      moldura += '<polygon points="' + q.join(" ") + '" fill="none" ' +
                 'stroke="rgba(201,163,90,.12)" stroke-width="1"/>';
    });
    for (i = 0; i < 5; i++) {
      a = -Math.PI / 2 + i * 2 * Math.PI / 5;
      eixos += '<line x1="' + C + '" y1="' + C + '" x2="' + (C + R * Math.cos(a)).toFixed(1) +
               '" y2="' + (C + R * Math.sin(a)).toFixed(1) +
               '" stroke="rgba(201,163,90,.14)" stroke-width="1"/>';

      // o rotulo de cada vertice, empurrado para fora e alinhado pelo lado
      var lx = C + (R + 16) * Math.cos(a), ly = C + (R + 16) * Math.sin(a);
      var ancora = Math.abs(Math.cos(a)) < .3 ? "middle" : (Math.cos(a) > 0 ? "start" : "end");
      var dy = Math.sin(a) < -.7 ? -4 : (Math.sin(a) > .7 ? 11 : 4);
      nomes += '<text x="' + lx.toFixed(1) + '" y="' + (ly + dy).toFixed(1) +
               '" text-anchor="' + ancora + '" class="evo-eixo">' +
               ((rotulos && rotulos[i]) || "") + "</text>";

      // e o ponto de agora em cada vertice, para o olho achar o valor
      if (typeof depois[i] === "number" && !isNaN(depois[i])) {
        var rr = R * depois[i] / 10;
        nomes += '<circle cx="' + (C + rr * Math.cos(a)).toFixed(1) + '" cy="' +
                 (C + rr * Math.sin(a)).toFixed(1) + '" r="3.5" fill="var(--dourado)"/>';
      }
    }
    return '<svg width="' + (tam + 60) + '" height="' + tam + '" viewBox="' +
           (-30) + ' 0 ' + (tam + 60) + ' ' + tam + '" class="evo-radar">' + moldura + eixos + nomes +
      (completo(antes) ? '<polygon points="' + pontos(antes) + '" fill="none" ' +
        'stroke="rgba(201,163,90,.45)" stroke-width="1.5" stroke-dasharray="4 3"/>' : "") +
      (completo(depois) ? '<polygon points="' + pontos(depois) + '" fill="rgba(201,163,90,.2)" ' +
        'stroke="var(--dourado)" stroke-width="2.5" stroke-linejoin="round"/>' : "") + "</svg>";
  }

  /* Rodada 08: antes x agora tambem na Triade, e a lista de todas as
     aplicacoes (data e Indice) — a evolucao nao e so a primeira e a ultima. */
  var EIXOS = [["fisico", "Físico"], ["mental", "Mental"], ["espiritual", "Espiritual"]];
  function blocoTriada(antes, depois) {
    var ta = antes.triada || {}, td = depois.triada || {};
    var F = window.HoloAusencia.fmt;
    var linhas = EIXOS.filter(function (e) { return e[0] in ta || e[0] in td; });
    if (!linhas.length) return "";
    // Etapa 0 da V1: antes e agora lado a lado, sem delta (ver desenhar()).
    return '<div class="evo-triada"><h5 class="evo-sub">Tríade</h5>' +
      linhas.map(function (e) {
        var a = ta[e[0]], d = td[e[0]];
        return '<div class="evo-linha evo-linha-triada"><span class="evo-nome">' + e[1] + "</span>" +
          '<span class="evo-de">' + F(a) + "</span>" +
          '<span class="evo-para">' + F(d) + "</span>" +
          '<span class="evo-delta sem-dado" title="sem comparação calculada">&middot;</span></div>';
      }).join("") + "</div>";
  }
  function blocoAplicacoes(h) {
    return '<div class="evo-aplicacoes"><h5 class="evo-sub">Aplicações</h5><ol class="evo-lista">' +
      h.map(function (p, i) {
        return "<li><span>" + (i + 1) + "ª &middot; " + escapar(dataBonita(p.quando)) + "</span>" +
          "<b>Índice " + escapar(window.HoloAusencia.indiceTexto(p)) + "</b></li>";
      }).join("") + "</ol></div>";
  }

  /* Etapa 0 da V1 — LADO A LADO, SEM DELTA.

     O Documento Mestre (§8, §19, §31) exige que um motor verifique a
     comparabilidade de duas aplicacoes (edicao, itens, escalas, pesos,
     politica de parcialidade, cobertura por eixo, contexto temporal) antes
     de qualquer diferenca numerica; enquanto isso nao existe, "mostra as
     fontes lado a lado sem calcular melhora ou piora". Entao saiu daqui o
     ganho (+N), a frase "o Indice subiu/caiu", a coluna de delta e as
     classes sobe/desce. O que fica: a primeira e a ultima aplicacao lado a
     lado (numeros e radar), a Triade das duas, e a lista de todas as
     aplicacoes — tudo com o selo "em homologacao". O historico nao e
     reescrito. */
  function desenhar() {
    var alvo = document.getElementById("holo-evolucao");
    if (!alvo) return;
    var h = historico();
    if (h.length < 2) { alvo.classList.add("hidden"); alvo.innerHTML = ""; return; }

    var antes = h[0], depois = h[h.length - 1];
    var sem = semanasEntre(antes.quando, depois.quando);
    var F = window.HoloAusencia.fmt;
    var M = window.Metodologia;

    var porSistema = {};
    antes.sistemas.forEach(function (s) { porSistema[s.sistema] = { nome: s.nome, antes: s.nota }; });
    depois.sistemas.forEach(function (s) {
      if (porSistema[s.sistema]) porSistema[s.sistema].depois = s.nota;
    });
    // ordem estavel e tecnica: a do motor, sem hierarquia por diferenca
    var linhas = Object.keys(porSistema).map(function (k) { return porSistema[k]; });

    var vAntes = antes.sistemas.map(function (s) { return s.nota; });
    var vDepois = depois.sistemas.map(function (s) { return s.nota; });

    var html =
      '<h4 class="leitura-titulo">Aplicações lado a lado ' + (M ? M.selo("comparabilidade não verificada") : "") + "</h4>" +
      '<p class="evo-nota">Duas aplicações do HOLOSCAN, uma ao lado da outra. O sistema não ' +
      "calcula melhora nem piora: a regra de comparabilidade entre aplicações ainda não foi " +
      "homologada.</p>" +
      '<div class="evo-corpo">' +
      radarDuplo(vAntes, vDepois, 250,
                 antes.sistemas.map(function (s) { return ROTULO[s.sistema] || s.nome; })) +
      '<div class="evo-numeros">' +
      '<div class="evo-indice">' +
      '<span class="evo-um"><i>' + escapar(dataBonita(antes.quando)) + "</i><b>" +
        escapar(window.HoloAusencia.indiceTexto(antes)) + "</b></span>" +
      '<span class="evo-seta">&middot;</span>' +
      '<span class="evo-um agora"><i>' + escapar(dataBonita(depois.quando)) + "</i><b>" +
        escapar(window.HoloAusencia.indiceTexto(depois)) + "</b></span></div>" +
      '<p class="evo-frase">' +
        (sem ? "<b>" + sem + " semanas</b> entre as duas aplicações. " : "") +
        "Índice HOLOS de cada uma, sem diferença calculada.</p>" +
      '<div class="evo-linhas">' +
      linhas.map(function (l) {
        return '<div class="evo-linha"><span class="evo-nome">' + escapar(l.nome) + "</span>" +
          '<span class="evo-de">' + F(l.antes) + "</span>" +
          '<span class="evo-para">' + F(l.depois) + "</span>" +
          '<span class="evo-delta sem-dado" title="sem comparação calculada">&middot;</span></div>';
      }).join("") +
      "</div></div></div>" +
      blocoTriada(antes, depois) +
      blocoAplicacoes(h) +
      '<p class="evo-nota">Linha pontilhada: a primeira aplicação. ' +
      'Área cheia: a mais recente.' +
      (h.length > 2 ? " Há " + h.length + " aplicações no histórico." : "") + "</p>";

    alvo.innerHTML = html;
    alvo.classList.remove("hidden");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var triada = document.getElementById("holo-triada");
    if (!triada) return;
    var caixa = document.createElement("div");
    caixa.id = "holo-evolucao";
    caixa.className = "holo-evolucao hidden";
    triada.parentNode.insertBefore(caixa, triada);

    desenhar();
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      desenhar();
    };
  });

  window.redesenharEvolucao = desenhar;
})();

/* ===========================================================================
   EVOLUCAO CLINICA — V1, Etapa 3 (aba "Evolucao" da ficha)
   ===========================================================================

   Historico LONGITUDINAL por atendimento: dois pontos escolhidos
   EXPLICITAMENTE (atendimento anterior x atual, linha de base x atual, dois
   atendimentos, ou duas datas) e as fontes consolidadas de cada um lado a
   lado — atendimentos, anamnese, medidas, HOLOSCAN, ferramentas,
   conduta e acordos, e a timeline do intervalo. Exames NAO entram (decisao
   de produto 09/10: exame e so arquivo do prontuario, nunca comparado).

   Regras (docs/v1/ETAPA3-ARQUITETURA-EVOLUCAO-RELATORIOS.md):
   - nada e inferido: sem dois pontos escolhidos nao ha comparacao, e a
     "primeira aplicacao" nunca vira linha de base em silencio;
   - so o consolidado entra (rascunho, previa e cache local ficam fora);
   - delta numerico so quando a medida/a ferramenta sao a MESMA coisa
     na MESMA unidade/versao; nunca "melhorou", "piorou" ou "+X%";
   - HOLOSCAN: nenhum delta de nota, Indice, Triada ou faixa (metodologia nao
     homologada) — datas, versao, cobertura, interpretacao e id lado a lado;
   - acordos: estado anterior -> estado atual, sem "adesao" nem "nao cumpriu".
   =========================================================================== */

(function () {
  "use strict";

  var escapar = window.escapar;
  var MODOS = [
    ["anterior_atual", "Atendimento anterior × atual"],
    ["base_atual", "Linha de base × atual"],
    ["escolha", "Dois atendimentos escolhidos"],
    ["datas", "Duas datas"]
  ];
  var FONTES = [
    ["atendimentos", "Atendimentos"], ["anamnese", "Anamnese"], ["medidas", "Medidas"], ["holoscan", "HOLOSCAN"],
    ["ferramentas", "Ferramentas"], ["conduta", "Conduta e acordos"], ["timeline", "Linha do tempo do intervalo"]
  ];
  var ESTADOS_SEM_INFO = ["desconhecido", "nao_investigado", "recusado", "nao_aplicavel"];
  var selecoes = {};   // por paciente: { modo, a, b, dataA, dataB, fontes, aberto }

  function dataBR(iso) { return window.dataBR ? window.dataBR(String(iso || "").slice(0, 10)) : String(iso || "").slice(0, 10); }
  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function diaLocal(iso) { return window.Timeline ? window.Timeline.diaLocal(iso) : String(iso || "").slice(0, 10); }
  function norm(s) { return String(s || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function num(v) { if (v === null || v === undefined || v === "") return null; var n = Number(String(v).replace(",", ".")); return isNaN(n) ? null : n; }
  function fmtDelta(d) { var s = (Math.round(d * 100) / 100); return (s > 0 ? "+" : "") + String(s).replace(".", ","); }

  function selecao(pid) {
    if (!selecoes[pid]) {
      var f = {}; FONTES.forEach(function (x) { f[x[0]] = true; });
      selecoes[pid] = { modo: "anterior_atual", a: null, b: null, dataA: "", dataB: "", fontes: f, aberto: {} };
    }
    return selecoes[pid];
  }

  /** Os atendimentos registrados do paciente, do mais antigo ao mais recente. */
  function atendimentos(pid) {
    var A = window.AtendimentoAtual; if (!A) return [];
    return A.doPaciente(pid).slice().sort(function (a, b) { return String(a.occurred_at).localeCompare(String(b.occurred_at)); })
      .map(function (e) { var w = A.paraParede(e.occurred_at, e.timezone || A.fuso()); return { id: e.id, data: w.data, hora: w.hora, rotulo: dataBR(w.data) + " " + w.hora + (e.type ? " · " + e.type : ""), bruto: e }; });
  }

  /** Os dois pontos da comparacao, SEMPRE escolhidos: null quando falta escolha. */
  function pontos(pid) {
    var s = selecao(pid), lista = atendimentos(pid), porId = {};
    lista.forEach(function (p) { porId[p.id] = p; });
    function ponto(p, papel) { return p ? { tipo: "atendimento", id: p.id, data: p.data, rotulo: p.rotulo, papel: papel } : null; }
    if (s.modo === "anterior_atual") {
      if (lista.length < 2) return { a: null, b: null, motivo: lista.length ? "Há só um atendimento registrado: não existe “anterior” para comparar. Escolha outro modo ou registre o próximo atendimento." : "Nenhum atendimento registrado. A Evolução é organizada por atendimento." };
      return { a: ponto(lista[lista.length - 2], "Atendimento anterior"), b: ponto(lista[lista.length - 1], "Atendimento atual") };
    }
    if (s.modo === "base_atual") {
      if (!lista.length) return { a: null, b: null, motivo: "Nenhum atendimento registrado." };
      var base = porId[s.a];
      if (!base) return { a: null, b: ponto(lista[lista.length - 1], "Atendimento atual"), motivo: "Escolha qual atendimento é a linha de base. Nada é assumido como base automaticamente." };
      return { a: ponto(base, "Linha de base (escolhida)"), b: ponto(lista[lista.length - 1], "Atendimento atual") };
    }
    if (s.modo === "escolha") {
      var pa = porId[s.a], pb = porId[s.b];
      if (!pa || !pb) return { a: ponto(pa, "Atendimento A"), b: ponto(pb, "Atendimento B"), motivo: "Escolha os dois atendimentos a comparar." };
      if (pa.id === pb.id) return { a: null, b: null, motivo: "Escolha dois atendimentos diferentes." };
      return { a: ponto(pa, "Atendimento A"), b: ponto(pb, "Atendimento B") };
    }
    if (!s.dataA || !s.dataB) return { a: null, b: null, motivo: "Informe as duas datas." };
    if (s.dataA >= s.dataB) return { a: null, b: null, motivo: "A primeira data precisa ser anterior à segunda." };
    return { a: { tipo: "data", id: null, data: s.dataA, rotulo: dataBR(s.dataA), papel: "Até " + dataBR(s.dataA) },
             b: { tipo: "data", id: null, data: s.dataB, rotulo: dataBR(s.dataB), papel: "Até " + dataBR(s.dataB) } };
  }

  /* ---------- o que vale em cada ponto (so consolidado) ------------------ */

  function ultimoAte(lista, data, campoData) {
    var cand = lista.filter(function (x) { var d = diaLocal(x[campoData]); return d && d <= data; });
    return cand.length ? cand[cand.length - 1] : null;
  }
  function anamneseEm(pid, p) {
    var An = window.Anamnese; if (!An || !p) return null;
    if (p.tipo === "atendimento") return An.vigente(p.id);
    var A = window.AtendimentoAtual;
    var cons = An.doPaciente(pid).filter(An.consolidada).filter(function (a) { return !a.superseded_at; })
      .map(function (a) { var e = A.porId(a.encounter_id); return { a: a, dia: e ? A.paraParede(e.occurred_at, e.timezone || A.fuso()).data : "" }; })
      .filter(function (x) { return x.dia && x.dia <= p.data; }).sort(function (x, y) { return x.dia.localeCompare(y.dia); });
    return cons.length ? cons[cons.length - 1].a : null;
  }
  function condutaEm(pid, p) {
    var Cd = window.Conduta; if (!Cd || !p) return null;
    if (p.tipo === "atendimento") return Cd.vigente(p.id);
    var A = window.AtendimentoAtual;
    var cons = Cd.doPaciente(pid).filter(Cd.consolidada).filter(function (c) { return !c.superseded_at; })
      .map(function (c) { var e = A.porId(c.encounter_id); return { c: c, dia: e ? A.paraParede(e.occurred_at, e.timezone || A.fuso()).data : "" }; })
      .filter(function (x) { return x.dia && x.dia <= p.data; }).sort(function (x, y) { return x.dia.localeCompare(y.dia); });
    return cons.length ? cons[cons.length - 1].c : null;
  }
  function holoscanConsolidado(pid) {
    var h = window.historicoPontuacao ? (window.historicoPontuacao(pid) || []) : [];
    var comSessao = temSupa();
    return h.filter(function (x) { return !comSessao || x._supa_id; });
  }
  function holoscanEm(pid, p) {
    if (!p) return null;
    var h = holoscanConsolidado(pid);
    if (p.tipo === "atendimento") {
      var doAt = h.filter(function (x) { return x._supa_encounter_id === p.id; });
      if (doAt.length) return { app: doAt[doAt.length - 1], vinculo: "do atendimento" };
      var u = ultimoAte(h, p.data, "quando");
      return u ? { app: u, vinculo: "mais recente até a data do atendimento" } : null;
    }
    var u2 = ultimoAte(h, p.data, "quando");
    return u2 ? { app: u2, vinculo: "mais recente até a data" } : null;
  }
  function ferramentasEm(pid, p) {
    if (!window.Aplicacoes || !p) return [];
    var comSessao = temSupa();
    var todas = window.Aplicacoes.doPaciente(pid).filter(function (a) { return a.status !== "rascunho" && (a.id || !comSessao); })
      .sort(function (a, b) { return String(a.concluida_em || a.iniciada_em).localeCompare(String(b.concluida_em || b.iniciada_em)); });
    var porFerr = {};
    todas.forEach(function (a) {
      var d = diaLocal(a.concluida_em || a.iniciada_em);
      if (p.tipo === "atendimento" && a.encounter_id === p.id) { porFerr[a.ferramenta_id] = a; return; }
      if (d && d <= p.data && !(porFerr[a.ferramenta_id] && porFerr[a.ferramenta_id].encounter_id === p.id)) porFerr[a.ferramenta_id] = a;
    });
    return Object.keys(porFerr).map(function (k) { return porFerr[k]; });
  }
  function nomeFerramenta(fid) {
    var cat = (window.CATALOGO_FERRAMENTAS || []).filter(function (f) { return f.id === fid; })[0];
    if (cat) return cat.titulo;
    return fid === "oq3" ? "OQ³" : fid === "pqq" ? "PQQ" : String(fid || "");
  }

  /* ---------- comparacoes (sem julgamento) ------------------------------- */

  function medidaDiferente(a, b) {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return String(a.valor) !== String(b.valor) || norm(a.unidade) !== norm(b.unidade);
  }
  /** Itens da anamnese B contra A: novo / alterado / negado / sem informacao /
      previo (copiado e nao revisto) / anterior nao revisto. */
  function compararAnamnese(a, b) {
    var An = window.Anamnese;
    function itens(an) {
      var out = {};
      if (!an || !an.content || !an.content.dominios) return out;
      Object.keys(an.content.dominios).forEach(function (dom) {
        ((an.content.dominios[dom] || {}).itens || []).forEach(function (it) {
          if (!it || !it.campo) return;
          out[dom + "|" + norm(it.campo)] = { dom: dom, it: it };
        });
      });
      return out;
    }
    var ia = itens(a), ib = itens(b), linhas = [];
    Object.keys(ib).forEach(function (k) {
      var x = ib[k], prev = ia[k], it = x.it, cat;
      if (it.estado === "negado_explicitamente") cat = "negado";
      else if (ESTADOS_SEM_INFO.indexOf(it.estado) >= 0) cat = "sem_informacao";
      else if (!prev) cat = it.previo ? "previo" : "novo";
      else if (norm(prev.it.valor) !== norm(it.valor) || prev.it.estado !== it.estado || medidaDiferente(prev.it.medida, it.medida)) cat = "alterado";
      else cat = it.previo ? "previo" : "mantido";
      linhas.push({ categoria: cat, dominio: x.dom, campo: it.campo, antes: prev ? prev.it : null, depois: it });
    });
    Object.keys(ia).forEach(function (k) {
      if (!ib[k]) linhas.push({ categoria: "nao_revisto", dominio: ia[k].dom, campo: ia[k].it.campo, antes: ia[k].it, depois: null });
    });
    var rot = { novo: "Novo", alterado: "Alterado", negado: "Negado explicitamente", sem_informacao: "Sem informação", previo: "Prévio (copiado, não revisto)", mantido: "Mantido", nao_revisto: "Anterior não revisto" };
    linhas.forEach(function (l) { l.rotulo = rot[l.categoria]; l.dominio_rotulo = An ? An.rotulo(l.dominio) : l.dominio; });
    return linhas;
  }

  /** Medidas (itens com `medida`) por campo: delta so com unidade igual e valores numericos. */
  function compararMedidas(a, b) {
    function medidas(an) {
      var out = {};
      if (!an || !an.content || !an.content.dominios) return out;
      Object.keys(an.content.dominios).forEach(function (dom) {
        ((an.content.dominios[dom] || {}).itens || []).forEach(function (it) {
          if (it && it.medida && it.medida.valor !== null && it.medida.valor !== undefined && it.campo) out[norm(it.campo)] = { campo: it.campo, medida: it.medida };
        });
      });
      return out;
    }
    var ma = medidas(a), mb = medidas(b), chaves = {};
    Object.keys(ma).concat(Object.keys(mb)).forEach(function (k) { chaves[k] = true; });
    return Object.keys(chaves).sort().map(function (k) {
      var x = ma[k], y = mb[k], va = x ? num(x.medida.valor) : null, vb = y ? num(y.medida.valor) : null;
      var ua = x ? norm(x.medida.unidade) : "", ub = y ? norm(y.medida.unidade) : "";
      var r = { campo: (y || x).campo, antes: x ? x.medida : null, depois: y ? y.medida : null, delta: null, motivo: "" };
      if (!x || !y) r.motivo = !x ? "sem medida no ponto anterior" : "sem medida no ponto atual";
      else if (ua !== ub) r.motivo = "unidades diferentes (" + (x.medida.unidade || "?") + " × " + (y.medida.unidade || "?") + "): sem delta";
      else if (va === null || vb === null) r.motivo = "valor não numérico: sem delta";
      else { r.delta = vb - va; r.unidade = y.medida.unidade; }
      return r;
    });
  }

  function compararFerramentas(fa, fb) {
    var porId = {};
    fa.forEach(function (a) { porId[a.ferramenta_id] = { a: a }; });
    fb.forEach(function (b) { porId[b.ferramenta_id] = porId[b.ferramenta_id] || {}; porId[b.ferramenta_id].b = b; });
    return Object.keys(porId).sort().map(function (fid) {
      var x = porId[fid].a, y = porId[fid].b, out = { ferramenta_id: fid, nome: nomeFerramenta(fid), antes: x || null, depois: y || null, deltas: [], motivo: "" };
      if (!x || !y) out.motivo = !x ? "sem aplicação no ponto anterior" : "sem aplicação no ponto atual";
      else if (x.id && y.id && x.id === y.id) out.motivo = "a mesma aplicação nos dois pontos";
      else if (String(x.versao_ferramenta || "") !== String(y.versao_ferramenta || "")) out.motivo = "versões diferentes (" + (x.versao_ferramenta || "?") + " × " + (y.versao_ferramenta || "?") + "): só lado a lado, sem delta";
      else {
        var ra = x.resultado && typeof x.resultado === "object" ? x.resultado : {}, rb = y.resultado && typeof y.resultado === "object" ? y.resultado : {};
        Object.keys(rb).forEach(function (k) { var va = num(ra[k]), vb = num(rb[k]); if (va !== null && vb !== null) out.deltas.push({ chave: k, antes: va, depois: vb, delta: vb - va }); });
        if (!out.deltas.length) out.motivo = "sem chave numérica comparável: só lado a lado";
      }
      return out;
    });
  }

  /** Acordos da conduta B frente aos da A: continuado / alterado / revisto / encerrado / novo / sem registro. */
  function compararAcordos(ca, cb) {
    var Cd = window.Conduta; if (!Cd) return [];
    var ga = ca ? Cd.acordosDe(ca.id) : [], gb = cb ? Cd.acordosDe(cb.id) : [], usados = {}, linhas = [];
    gb.forEach(function (g) {
      var origem = g.origin_agreement_id ? ga.filter(function (o) { return o.id === g.origin_agreement_id; })[0] : null;
      if (!origem) origem = ga.filter(function (o) { return !usados[o.id] && norm(o.description) === norm(g.description); })[0] || null;
      var situacao;
      if (!origem) situacao = "novo";
      else if (g.status === "encerrado") situacao = "encerrado";
      else if (g.status === "revisto") situacao = "revisto";
      else if (norm(origem.description) === norm(g.description) && origem.status === g.status) situacao = "continuado";
      else situacao = "alterado";
      if (origem) usados[origem.id] = true;
      linhas.push({ situacao: situacao, antes: origem, depois: g });
    });
    ga.forEach(function (o) { if (!usados[o.id]) linhas.push({ situacao: "sem_registro", antes: o, depois: null }); });
    var rot = { novo: "Novo", encerrado: "Encerrado", revisto: "Revisto", continuado: "Continuado", alterado: "Alterado", sem_registro: "Sem registro na conduta atual" };
    linhas.forEach(function (l) { l.rotulo = rot[l.situacao]; });
    return linhas;
  }

  /** Tudo que a aba desenha, PURO: a comparacao entre os dois pontos. */
  function comparar(pid) {
    var pts = pontos(pid);
    if (!pts.a || !pts.b) return { pontos: pts, pronto: false };
    var anA = anamneseEm(pid, pts.a), anB = anamneseEm(pid, pts.b);
    var cdA = condutaEm(pid, pts.a), cdB = condutaEm(pid, pts.b);
    var fA = ferramentasEm(pid, pts.a), fB = ferramentasEm(pid, pts.b);
    return {
      pontos: pts, pronto: true,
      anamnese: { a: anA, b: anB, itens: compararAnamnese(anA, anB) },
      medidas: compararMedidas(anA, anB),
      holoscan: { a: holoscanEm(pid, pts.a), b: holoscanEm(pid, pts.b) },
      ferramentas: { a: fA, b: fB, itens: compararFerramentas(fA, fB) },
      conduta: { a: cdA, b: cdB, campos: (window.Conduta ? window.Conduta.CAMPOS : []).map(function (c) {
        var va = cdA ? (cdA[c[0]] || "") : "", vb = cdB ? (cdB[c[0]] || "") : "";
        return { campo: c[0], rotulo: c[1], antes: va, depois: vb, situacao: !va && !vb ? "vazio" : norm(va) === norm(vb) ? "igual" : "alterado" };
      }).filter(function (x) { return x.situacao !== "vazio"; }), acordos: compararAcordos(cdA, cdB) },
      timeline: window.Timeline ? window.Timeline.noIntervalo(pid, pts.a.data, pts.b.data, { semAgenda: true }) : []
    };
  }

  /* ---------- HTML ------------------------------------------------------- */

  function col2(ta, va, tb, vb) {
    return '<div class="evo-par"><div class="evo-col"><span class="evo-col-titulo">' + escapar(ta) + "</span>" + va + '</div><div class="evo-col"><span class="evo-col-titulo">' + escapar(tb) + "</span>" + vb + "</div></div>";
  }
  function secao(id, titulo, corpo, s) {
    var aberto = s.aberto[id] !== false;
    return '<section class="evo-secao' + (aberto ? "" : " fechada") + '" data-evo-secao="' + id + '">' +
      '<button type="button" class="evo-secao-titulo" data-evo-abrir="' + id + '" aria-expanded="' + aberto + '">' + escapar(titulo) + "</button>" +
      '<div class="evo-secao-corpo"' + (aberto ? "" : " hidden") + ">" + corpo + "</div></section>";
  }
  function vazio(t) { return '<p class="dash-vazio">' + escapar(t) + "</p>"; }

  function htmlSelecao(pid, s, pts) {
    var lista = atendimentos(pid);
    var opcoes = function (sel) {
      return '<option value="">— escolher —</option>' + lista.map(function (p) { return '<option value="' + escapar(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" + escapar(p.rotulo) + "</option>"; }).join("");
    };
    var h = '<div class="evo-selecao" id="evo-selecao">' +
      '<label class="evo-campo"><span>Comparar</span><select data-evo-modo>' + MODOS.map(function (m) { return '<option value="' + m[0] + '"' + (m[0] === s.modo ? " selected" : "") + ">" + escapar(m[1]) + "</option>"; }).join("") + "</select></label>";
    if (s.modo === "base_atual") h += '<label class="evo-campo"><span>Linha de base</span><select data-evo-a>' + opcoes(s.a) + "</select></label>";
    if (s.modo === "escolha") h += '<label class="evo-campo"><span>Atendimento A</span><select data-evo-a>' + opcoes(s.a) + "</select></label>" +
      '<label class="evo-campo"><span>Atendimento B</span><select data-evo-b>' + opcoes(s.b) + "</select></label>";
    if (s.modo === "datas") h += '<label class="evo-campo"><span>De</span><input type="date" data-evo-data-a value="' + escapar(s.dataA) + '"></label>' +
      '<label class="evo-campo"><span>Até</span><input type="date" data-evo-data-b value="' + escapar(s.dataB) + '"></label>';
    h += '<div class="evo-fontes" role="group" aria-label="Fontes">' + FONTES.map(function (f) {
      return '<label class="evo-fonte"><input type="checkbox" data-evo-fonte="' + f[0] + '"' + (s.fontes[f[0]] ? " checked" : "") + "> " + escapar(f[1]) + "</label>";
    }).join("") + "</div>";
    if (pts.a || pts.b) h += '<p class="evo-pontos">' + (pts.a ? "<b>A:</b> " + escapar(pts.a.papel) + " — " + escapar(pts.a.rotulo) : "<b>A:</b> não escolhido") +
      " &nbsp;·&nbsp; " + (pts.b ? "<b>B:</b> " + escapar(pts.b.papel) + " — " + escapar(pts.b.rotulo) : "<b>B:</b> não escolhido") + "</p>";
    return h + "</div>";
  }

  function htmlAnamnese(c) {
    var a = c.anamnese.a, b = c.anamnese.b;
    if (!a && !b) return vazio("Nenhuma anamnese consolidada nos dois pontos.");
    var cab = col2("A", a ? "<small>rev. " + a.revision_number + " · " + escapar(a.status) + " · registrada em " + escapar(dataBR(a.created_at)) + "</small>" : "<small>sem anamnese consolidada</small>",
                   "B", b ? "<small>rev. " + b.revision_number + " · " + escapar(b.status) + " · registrada em " + escapar(dataBR(b.created_at)) + "</small>" : "<small>sem anamnese consolidada</small>");
    var itens = c.anamnese.itens.filter(function (l) { return l.categoria !== "mantido"; });
    var mantidos = c.anamnese.itens.length - itens.length;
    var tabela = itens.length ? '<table class="evo-tabela"><thead><tr><th>Domínio</th><th>Item</th><th>A</th><th>B</th><th>Situação</th></tr></thead><tbody>' +
      itens.map(function (l) {
        var f = function (it) { if (!it) return "—"; return it.estado === "informado" ? escapar(it.valor || "(informado)") : "[" + escapar(window.Anamnese.rotulo(it.estado)) + "]"; };
        return '<tr class="evo-an-' + l.categoria + '"><td>' + escapar(l.dominio_rotulo) + "</td><td>" + escapar(l.campo) + "</td><td>" + f(l.antes) + "</td><td>" + f(l.depois) + '</td><td><span class="evo-tag ' + l.categoria + '">' + escapar(l.rotulo) + "</span></td></tr>";
      }).join("") + "</tbody></table>" : vazio("Nenhuma diferença entre os itens das duas anamneses.");
    return cab + tabela + (mantidos ? '<p class="evo-nota">' + mantidos + (mantidos === 1 ? " item mantido" : " itens mantidos") + " sem alteração.</p>" : "") +
      '<p class="evo-nota">Diferenças documentais: nenhum item vira “melhora” ou “piora”. Vazio não é negado; só “negado explicitamente” nega.</p>';
  }

  function htmlMedidas(c) {
    if (!c.medidas.length) return vazio("Nenhuma medida (valor + unidade + data) registrada nas anamneses dos dois pontos.");
    var f = function (m) { return m ? escapar(String(m.valor)) + " " + escapar(m.unidade || "") + (m.data ? " <small>(" + escapar(dataBR(m.data)) + ")</small>" : "") : "—"; };
    return '<table class="evo-tabela"><thead><tr><th>Medida</th><th>A</th><th>B</th><th>Delta</th></tr></thead><tbody>' +
      c.medidas.map(function (m) {
        return "<tr><td>" + escapar(m.campo) + "</td><td>" + f(m.antes) + "</td><td>" + f(m.depois) + '</td><td class="evo-delta-cel">' +
          (m.delta !== null ? "<b>delta " + escapar(fmtDelta(m.delta)) + " " + escapar(m.unidade || "") + "</b>" : '<span class="evo-sem-delta">' + escapar(m.motivo) + "</span>") + "</td></tr>";
      }).join("") + "</tbody></table><p class=\"evo-nota\">Delta só entre a mesma medida na mesma unidade. Nenhuma conversão, nenhuma leitura de melhora.</p>";
  }

  function htmlHoloscan(c) {
    var a = c.holoscan.a, b = c.holoscan.b, M = window.Metodologia;
    if (!a && !b) return vazio("Nenhuma aplicação consolidada do HOLOSCAN até os pontos escolhidos.");
    var f = function (x) {
      if (!x) return "<small>sem aplicação consolidada</small>";
      var p = x.app, cob = p.cobertura && typeof p.cobertura.respondidos === "number" ? p.cobertura.respondidos + " de " + p.cobertura.total + " respondidas" : "cobertura não registrada";
      return "<ul class=\"evo-lista-simples\"><li><b>" + escapar(dataBR(p.quando)) + "</b> <small>(" + escapar(x.vinculo) + ")</small></li>" +
        "<li>versão " + escapar(p.versao_estrutura || "?") + "</li><li>" + escapar(cob) + "</li>" +
        (p.interpretacao && p.interpretacao.texto ? "<li>Interpretação profissional: " + escapar(p.interpretacao.texto) + "</li>" : "<li>sem interpretação profissional</li>") +
        "<li><small>aplicação " + escapar(p._supa_id || "(só neste dispositivo)") + "</small></li></ul>";
    };
    var mesma = a && b && a.app._supa_id && a.app._supa_id === b.app._supa_id;
    return col2("A", f(a), "B", f(b)) + (mesma ? '<p class="evo-nota">A mesma aplicação vale nos dois pontos.</p>' : "") +
      '<p class="evo-nota">' + (M ? M.selo("comparação não homologada") + " " : "") + "Sem delta de notas, Índice, Tríade ou faixas: a regra de comparabilidade entre aplicações não foi homologada. Datas, versão, cobertura bruta e interpretação profissional lado a lado.</p>";
  }

  function htmlFerramentas(c) {
    var it = c.ferramentas.itens;
    if (!it.length) return vazio("Nenhuma ferramenta concluída até os pontos escolhidos.");
    var f = function (a) { return a ? "<small>" + escapar(dataBR(a.concluida_em || a.iniciada_em)) + " · versão " + escapar(a.versao_ferramenta || "?") + (a.leitura ? "</small><br>" + escapar(a.leitura) : "</small>") : "—"; };
    return it.map(function (x) {
      return '<div class="evo-ferr"><h5 class="evo-sub">' + escapar(x.nome) + "</h5>" + col2("A", f(x.antes), "B", f(x.depois)) +
        (x.deltas.length ? '<ul class="evo-lista-simples">' + x.deltas.map(function (d) { return "<li>" + escapar(d.chave) + ": " + escapar(String(d.antes)) + " → " + escapar(String(d.depois)) + " <b>(delta " + escapar(fmtDelta(d.delta)) + ")</b></li>"; }).join("") + "</ul>"
          : '<p class="evo-sem-delta">' + escapar(x.motivo) + "</p>") + "</div>";
    }).join("") + '<p class="evo-nota">Delta só na mesma ferramenta, mesma versão e mesma escala. Nenhuma leitura automática.</p>';
  }

  function htmlConduta(c) {
    var a = c.conduta.a, b = c.conduta.b, Cd = window.Conduta;
    if (!a && !b) return vazio("Nenhuma conduta consolidada nos dois pontos.");
    var cab = col2("A", a ? "<small>rev. " + a.revision_number + " · " + escapar(a.status) + "</small>" : "<small>sem conduta consolidada</small>",
                   "B", b ? "<small>rev. " + b.revision_number + " · " + escapar(b.status) + (b.previous_decision ? " · decisão sobre a anterior: " + escapar(Cd.rotulo(b.previous_decision)) : "") + "</small>" : "<small>sem conduta consolidada</small>");
    var campos = c.conduta.campos.length ? '<table class="evo-tabela"><thead><tr><th>Campo</th><th>A</th><th>B</th><th></th></tr></thead><tbody>' +
      c.conduta.campos.map(function (x) { return "<tr><td>" + escapar(x.rotulo) + "</td><td>" + escapar(x.antes || "—") + "</td><td>" + escapar(x.depois || "—") + '</td><td><span class="evo-tag ' + x.situacao + '">' + (x.situacao === "igual" ? "Igual" : "Alterado") + "</span></td></tr>"; }).join("") + "</tbody></table>" : "";
    var ac = c.conduta.acordos.length ? '<h5 class="evo-sub">Acordos</h5><table class="evo-tabela" id="evo-acordos"><thead><tr><th>Acordo (A)</th><th>Estado em A</th><th>Acordo (B)</th><th>Estado em B</th><th>Situação</th></tr></thead><tbody>' +
      c.conduta.acordos.map(function (l) {
        return "<tr><td>" + (l.antes ? escapar(l.antes.description) : "—") + "</td><td>" + (l.antes ? escapar(Cd.rotulo(l.antes.status)) : "—") + "</td><td>" + (l.depois ? escapar(l.depois.description) : "—") + "</td><td>" + (l.depois ? escapar(Cd.rotulo(l.depois.status)) : "—") + '</td><td><span class="evo-tag ' + l.situacao + '">' + escapar(l.rotulo) + "</span></td></tr>";
      }).join("") + "</tbody></table>" : vazio("Nenhum acordo nas duas condutas.");
    return cab + campos + ac + '<p class="evo-nota">Estado anterior → estado atual, como registrado. Nenhum índice de adesão; “sem registro” não é “não cumpriu”.</p>';
  }

  function htmlAtendimentos(pid, c) {
    var A = window.AtendimentoAtual, lista = atendimentos(pid);
    var de = c.pontos.a.data, ate = c.pontos.b.data;
    var dentro = lista.filter(function (p) { return p.data >= de && p.data <= ate; });
    if (!dentro.length) return vazio("Nenhum atendimento registrado entre os dois pontos.");
    return '<ul class="evo-lista-simples">' + dentro.map(function (p) {
      var e = p.bruto;
      return "<li><b>" + escapar(p.rotulo) + "</b>" + (e.modality ? " · " + escapar(e.modality) : "") + (e.summary_text ? "<br>" + escapar(e.summary_text) : "") +
        " <small>registrado em " + escapar(dataBR(e.created_at)) + "</small></li>";
    }).join("") + "</ul>";
  }

  function htmlTimeline(c) {
    if (!c.timeline.length) return vazio("Nenhum evento consolidado entre os dois pontos.");
    return '<div class="fic-tempo">' + c.timeline.map(window.Timeline.eventoHtml).join("") + "</div>";
  }

  function resumo(c) {
    var n = function (lista, f) { return lista.filter(f).length; };
    var partes = [];
    partes.push(n(c.anamnese.itens, function (l) { return l.categoria !== "mantido"; }) + " itens de anamnese com diferença");
    partes.push(n(c.medidas, function (m) { return m.delta !== null; }) + " medidas com delta comparável");
    partes.push(c.conduta.acordos.length + " acordos acompanhados");
    partes.push(c.timeline.length + " eventos consolidados no intervalo");
    return '<p class="evo-resumo">' + partes.map(escapar).join(" · ") + "</p>";
  }

  function desenhar() {
    var alvo = document.getElementById("aba-evolucao");
    if (!alvo) return;
    var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
    if (!pid) { alvo.innerHTML = '<div class="dash-vazio">Escolha uma paciente.</div>'; return; }
    var s = selecao(pid), c = comparar(pid), M = window.Metodologia;
    var html = '<div class="evo-cabecalho"><h3 class="dash-titulo">Evolução por atendimento</h3>' +
      '<p class="dash-sub">Dois pontos escolhidos por você, fontes consolidadas lado a lado. Nada é comparado por conta própria' +
      (M ? " " + M.selo("sem comparação metodológica") : "") + ".</p></div>";
    html += htmlSelecao(pid, s, c.pontos);
    if (!c.pronto) {
      html += '<div class="dash-vazio" id="evo-sem-comparacao">' + escapar(c.pontos.motivo || "Escolha os dois pontos.") + "</div>";
    } else {
      html += resumo(c);
      if (s.fontes.atendimentos) html += secao("atendimentos", "Atendimentos no intervalo", htmlAtendimentos(pid, c), s);
      if (s.fontes.anamnese) html += secao("anamnese", "Anamnese: o que mudou", htmlAnamnese(c), s);
      if (s.fontes.medidas) html += secao("medidas", "Medidas", htmlMedidas(c), s);
      if (s.fontes.holoscan) html += secao("holoscan", "HOLOSCAN lado a lado", htmlHoloscan(c), s);
      if (s.fontes.ferramentas) html += secao("ferramentas", "Ferramentas", htmlFerramentas(c), s);
      if (s.fontes.conduta) html += secao("conduta", "Conduta e acordos", htmlConduta(c), s);
      if (s.fontes.timeline) html += secao("timeline", "Linha do tempo do intervalo", htmlTimeline(c), s);
    }
    alvo.innerHTML = html;
    ligar(alvo, pid);
  }

  function ligar(alvo, pid) {
    var s = selecao(pid);
    var sel = alvo.querySelector("[data-evo-modo]");
    if (sel) sel.addEventListener("change", function () { s.modo = sel.value; desenhar(); });
    var a = alvo.querySelector("[data-evo-a]"); if (a) a.addEventListener("change", function () { s.a = a.value || null; desenhar(); });
    var b = alvo.querySelector("[data-evo-b]"); if (b) b.addEventListener("change", function () { s.b = b.value || null; desenhar(); });
    var da = alvo.querySelector("[data-evo-data-a]"); if (da) da.addEventListener("change", function () { s.dataA = da.value; desenhar(); });
    var db = alvo.querySelector("[data-evo-data-b]"); if (db) db.addEventListener("change", function () { s.dataB = db.value; desenhar(); });
    alvo.querySelectorAll("[data-evo-fonte]").forEach(function (cb) { cb.addEventListener("change", function () { s.fontes[cb.dataset.evoFonte] = cb.checked; desenhar(); }); });
    alvo.querySelectorAll("[data-evo-abrir]").forEach(function (btn) { btn.addEventListener("click", function () { var id = btn.dataset.evoAbrir; s.aberto[id] = s.aberto[id] === false; desenhar(); }); });
    alvo.querySelectorAll("[data-ir]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var ir = btn.dataset.ir;
        if (ir.indexOf("aba:") === 0) { var aba = document.querySelector('[data-aba="' + ir.slice(4) + '"]'); if (aba) aba.click(); }
        else if (window.irParaSecao) window.irParaSecao(ir);
      });
    });
  }

  /** Metadados da Evolucao para exportacao e HOLOS AI (sem HTML, sem julgamento). */
  function metadados(pid) {
    var c = comparar(pid);
    if (!c.pronto) return { modo: selecao(pid).modo, pronto: false, motivo: c.pontos.motivo || null };
    return {
      modo: selecao(pid).modo, pronto: true,
      a: { tipo: c.pontos.a.tipo, id: c.pontos.a.id, data: c.pontos.a.data, papel: c.pontos.a.papel },
      b: { tipo: c.pontos.b.tipo, id: c.pontos.b.id, data: c.pontos.b.data, papel: c.pontos.b.papel },
      anamnese: { a_id: c.anamnese.a ? c.anamnese.a.id : null, b_id: c.anamnese.b ? c.anamnese.b.id : null,
        itens: c.anamnese.itens.map(function (l) { return { dominio: l.dominio, campo: l.campo, categoria: l.categoria }; }) },
      medidas: c.medidas.map(function (m) { return { campo: m.campo, antes: m.antes, depois: m.depois, delta: m.delta, unidade: m.unidade || null, motivo: m.motivo || null }; }),
      holoscan: { a_id: c.holoscan.a ? c.holoscan.a.app._supa_id || null : null, b_id: c.holoscan.b ? c.holoscan.b.app._supa_id || null : null, delta: null, nota: "sem comparação metodológica (não homologada)" },
      ferramentas: c.ferramentas.itens.map(function (x) { return { ferramenta_id: x.ferramenta_id, a_id: x.antes ? x.antes.id : null, b_id: x.depois ? x.depois.id : null, deltas: x.deltas, motivo: x.motivo || null }; }),
      conduta: { a_id: c.conduta.a ? c.conduta.a.id : null, b_id: c.conduta.b ? c.conduta.b.id : null,
        acordos: c.conduta.acordos.map(function (l) { return { origem_id: l.antes ? l.antes.id : null, atual_id: l.depois ? l.depois.id : null, estado_anterior: l.antes ? l.antes.status : null, estado_atual: l.depois ? l.depois.status : null, situacao: l.situacao }; }) },
      eventos_no_intervalo: c.timeline.length
    };
  }

  window.Evolucao = {
    MODOS: MODOS, FONTES: FONTES,
    selecao: selecao, selecionar: function (pid, patch) { Object.assign(selecao(pid), patch || {}); },
    atendimentos: atendimentos, pontos: pontos, comparar: comparar, metadados: metadados, desenhar: desenhar,
    compararAnamnese: compararAnamnese, compararMedidas: compararMedidas,
    compararFerramentas: compararFerramentas, compararAcordos: compararAcordos,
    esquecer: function () { selecoes = {}; }
  };
})();
