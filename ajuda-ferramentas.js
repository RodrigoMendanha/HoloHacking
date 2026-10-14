/* ===========================================================================
   AJUDA CONTEXTUAL "?" DAS 10 FERRAMENTAS OFICIAIS (rodada UX 14/10)

   Cada ferramenta ganha um "?" discreto ao lado do titulo: O que e · Por que usar · Quando usar.
   Textos curtos, tirados do que o catalogo e o fechamento das ferramentas ja dizem (ferramentas.js,
   ferramentas-fechamento.js) — nenhum conceito novo. "Quando usar" NUNCA e regra de bloqueio: toda
   ferramenta pode ser usada a qualquer momento ("Pode ser especialmente útil quando...").

   Interacao: passar o mouse ou focar (teclado) mostra; tocar/clicar fixa aberto; Esc ou clique fora fecha.
   O balao fica dentro da janela (sem rolagem lateral) e nao some enquanto o ponteiro esta sobre ele.
   =========================================================================== */
(function () {
  "use strict";

  var TEXTOS = {
    oq3: {
      nome: "OQ³",
      oque: "Três perguntas que separam o que a pessoa quer, o que precisa de atenção e o que consegue sustentar agora.",
      porque: "Ajuda a planejar a etapa considerando ao mesmo tempo desejo, necessidade e capacidade atual.",
      quando: "Pode ser especialmente útil no começo do acompanhamento ou quando o objetivo e a realidade parecem não conversar."
    },
    linha_momentum: {
      nome: "Linha do Momentum",
      oque: "Leitura da capacidade atual da pessoa de mobilizar recursos físicos, mentais e práticos para sustentar mudança — não é força de vontade nem motivação.",
      porque: "Ajuda a calibrar a exigência e a quantidade de mudanças propostas nesta etapa.",
      quando: "Pode ser especialmente útil antes de montar a conduta e quando a vida muda de fase."
    },
    mapa_rotina_v1: {
      nome: "Mapa da Rotina",
      oque: "Registro de como o dia e a semana acontecem de verdade, e de onde uma mudança pode caber.",
      porque: "Ajuda a escolher mudanças que realmente caibam na rotina atual, em vez de um plano que não cabe no dia a dia.",
      quando: "Pode ser especialmente útil na primeira consulta e quando a rotina muda de forma relevante."
    },
    pqq: {
      nome: "PQQ — Escada dos Porquês",
      oque: "Três perguntas “pra que que” a partir do objetivo declarado, até a síntese do que ele representa para a pessoa.",
      porque: "Ajuda a compreender o que o objetivo representa para a paciente e a conectar a mudança a significados que façam sentido para ela.",
      quando: "Pode ser especialmente útil quando o objetivo parece distante do que move a pessoa, ou para dar sentido às mudanças."
    },
    mapa_crencas: {
      nome: "Mapa de Crenças Alimentares",
      oque: "Levantamento das ideias sobre comida e corpo que a pessoa traz, de onde vieram e qual mais atrapalha hoje.",
      porque: "Ajuda a tornar visíveis ideias que podem estar influenciando escolhas alimentares e a observá-las em situações reais.",
      quando: "Pode ser especialmente útil quando aparecem regras rígidas, culpa ou “proibições” em torno da comida."
    },
    gatilhos_respostas_v1: {
      nome: "Gatilhos & Respostas",
      oque: "Registro de episódios: gatilho, pensamento, emoção, resposta e consequência.",
      porque: "Ajuda a tornar observável o que acontece antes e depois de determinado comportamento.",
      quando: "Pode ser especialmente útil quando há um episódio concreto para registrar, como comer sem fome ou beliscar em certo horário."
    },
    mapa: {
      nome: "Mapa do Propósito",
      oque: "Reunião do que o OQ³ e o PQQ trouxeram — objetivo, alavancas e o “pra que” verdadeiro — numa visão só.",
      porque: "Ajuda a manter a direção do acompanhamento ligada ao que a própria pessoa disse que importa.",
      quando: "Pode ser especialmente útil depois do OQ³ e do PQQ, como aprofundamento opcional."
    },
    roda_vida: {
      nome: "Roda Holística da Vida",
      oque: "Visão panorâmica das áreas da vida, com a nota que a própria pessoa dá a cada uma.",
      porque: "Ajuda a escolher quais áreas merecem atenção neste momento.",
      quando: "Pode ser especialmente útil quando a queixa alimentar parece ligada a outras áreas da vida."
    },
    carta_futuro: {
      nome: "Carta ao Futuro Eu",
      oque: "Exercício reflexivo para conectar a pessoa com uma direção futura desejada.",
      porque: "Ajuda a tornar mais concreto o que ela quer construir, fortalecer a motivação e dar sentido às mudanças.",
      quando: "Pode ser especialmente útil quando fizer sentido aprofundar identidade, direção, compromisso com o cuidado ou visão de futuro."
    },
    conexao_pertencimento_v1: {
      nome: "Conexão & Pertencimento",
      oque: "Registro de quem e o que sustenta a pessoa na vida — pessoas, grupos, ambientes e comunidades —, como ela os descreve.",
      porque: "Ajuda a compreender quais recursos de apoio estão disponíveis durante o processo, sem classificar nenhum vínculo.",
      quando: "Pode ser especialmente útil quando fizer sentido conversar sobre apoio, solidão ou pertencimento."
    }
  };
  var seq = 0;
  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /** HTML do "?" + balao para a ferramenta (vazio se nao for uma das 10). */
  function botao(id) {
    var t = TEXTOS[id];
    if (!t) return "";
    var pid = "ajuda-ferr-" + id + "-" + (++seq);
    return '<span class="ajuda-ferr" data-ajuda-ferr="' + esc(id) + '">' +
      '<button type="button" class="ajuda-ferr-btn" aria-label="Sobre a ferramenta ' + esc(t.nome) + '" aria-expanded="false" aria-controls="' + pid + '">?</button>' +
      '<span class="ajuda-ferr-pop" id="' + pid + '" role="tooltip" hidden>' +
        '<b class="ajuda-ferr-tit">' + esc(t.nome) + "</b>" +
        '<span class="ajuda-ferr-rot">O que é</span><span class="ajuda-ferr-txt">' + esc(t.oque) + "</span>" +
        '<span class="ajuda-ferr-rot">Por que usar</span><span class="ajuda-ferr-txt">' + esc(t.porque) + "</span>" +
        '<span class="ajuda-ferr-rot">Quando usar</span><span class="ajuda-ferr-txt">' + esc(t.quando) + "</span>" +
      "</span></span>";
  }

  /* ---- abrir / fechar ---- */
  var fixo = null, timer = null;
  function pop(w) { return w && w.querySelector(".ajuda-ferr-pop"); }
  function posicionar(w) {
    var p = pop(w); if (!p) return;
    p.style.left = ""; p.style.right = ""; p.style.top = ""; p.classList.remove("acima");
    var r = p.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    if (r.right > vw - 8) { p.style.left = "auto"; p.style.right = "0"; r = p.getBoundingClientRect(); }
    if (r.left < 8) { p.style.left = (8 - w.getBoundingClientRect().left) + "px"; p.style.right = "auto"; }
    if (r.bottom > window.innerHeight - 8 && w.getBoundingClientRect().top > r.height + 16) p.classList.add("acima");
  }
  function abrir(w) {
    if (!w) return;
    document.querySelectorAll(".ajuda-ferr.aberta").forEach(function (o) { if (o !== w) fechar(o, true); });
    var p = pop(w), b = w.querySelector(".ajuda-ferr-btn");
    if (!p) return;
    p.hidden = false; w.classList.add("aberta"); if (b) b.setAttribute("aria-expanded", "true");
    posicionar(w);
  }
  function fechar(w, forca) {
    if (!w || (!forca && fixo === w)) return;
    var p = pop(w), b = w.querySelector(".ajuda-ferr-btn");
    if (p) p.hidden = true; w.classList.remove("aberta"); if (b) b.setAttribute("aria-expanded", "false");
    if (fixo === w) fixo = null;
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".ajuda-ferr-btn");
    if (b) {
      ev.preventDefault(); ev.stopPropagation();
      var w = b.closest(".ajuda-ferr");
      if (fixo === w) { fechar(w, true); } else { abrir(w); fixo = w; }
      return;
    }
    if (fixo && !(ev.target.closest && ev.target.closest(".ajuda-ferr"))) fechar(fixo, true);
  }, true);
  document.addEventListener("mouseover", function (ev) {
    var w = ev.target.closest && ev.target.closest(".ajuda-ferr");
    if (!w) return;
    clearTimeout(timer); abrir(w);
  });
  document.addEventListener("mouseout", function (ev) {
    var w = ev.target.closest && ev.target.closest(".ajuda-ferr");
    if (!w || (ev.relatedTarget && w.contains(ev.relatedTarget))) return;
    clearTimeout(timer); timer = setTimeout(function () { fechar(w); }, 250);   // tempo para chegar ao balao
  });
  document.addEventListener("focusin", function (ev) { if (ev.target.classList && ev.target.classList.contains("ajuda-ferr-btn")) abrir(ev.target.closest(".ajuda-ferr")); });
  document.addEventListener("focusout", function (ev) {
    var w = ev.target.closest && ev.target.closest(".ajuda-ferr");
    if (w && !(ev.relatedTarget && w.contains(ev.relatedTarget))) fechar(w);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Escape") return;
    var w = document.querySelector(".ajuda-ferr.aberta");
    if (w) { fechar(w, true); var b = w.querySelector(".ajuda-ferr-btn"); if (b) b.focus(); }
  });

  /* as tres telas escritas a mao (OQ³, PQQ, Mapa do Proposito): o "?" entra ao lado do titulo */
  function montarFixas() {
    [["vista-oq3", "oq3"], ["vista-pqq", "pqq"], ["vista-mapa", "mapa"]].forEach(function (par) {
      var v = document.getElementById(par[0]);
      var h = v && v.querySelector(".secao-cabeca h2, h2");
      if (!h || h.querySelector(".ajuda-ferr")) return;
      h.insertAdjacentHTML("beforeend", " " + botao(par[1]));
    });
  }
  document.addEventListener("DOMContentLoaded", montarFixas);

  window.AjudaFerramentas = { TEXTOS: TEXTOS, botao: botao, montarFixas: montarFixas };
})();
