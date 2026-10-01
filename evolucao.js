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
          "<b>Índice " + escapar(p.indice) + "</b></li>";
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
        escapar(antes.indice) + "</b></span>" +
      '<span class="evo-seta">&middot;</span>' +
      '<span class="evo-um agora"><i>' + escapar(dataBonita(depois.quando)) + "</i><b>" +
        escapar(depois.indice) + "</b></span></div>" +
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
