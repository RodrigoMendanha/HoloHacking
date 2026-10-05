/* ===========================================================================
   REGISTROS CLÍNICOS ESTRUTURADOS — visualização (Etapa 6.5)
   ===========================================================================

   Mapa da Rotina (linha do tempo), Gatilhos & Respostas (fluxo) e Conexão &
   Pertencimento (rede). Este arquivo só DESENHA o que foi registrado:

   - não calcula escore, faixa, nível, classificação ou interpretação;
   - não sugere nada: "alternativa" e "espaço para mudança" aparecem como foram
     escritos por quem registrou;
   - não lê nem escreve HOLOSCAN, Índice, Tríada, exames ou Leitura Integrada.

   Todo texto vindo do registro passa por escapar() antes de entrar no HTML ou
   no SVG. Nenhum valor do registro vira atributo de estilo, classe ou URL; as
   classes usadas saem de listas fechadas (REGISTRO_OPCOES) via índice.
   =========================================================================== */

(function () {
  "use strict";

  var escapar = window.escapar;
  var dataBR = window.dataBR;
  var OP = window.REGISTRO_OPCOES || {};
  var DIAS = OP.dias || ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  var DIAS_NOME = { seg: "Segunda", ter: "Terça", qua: "Quarta", qui: "Quinta", sex: "Sexta", "sáb": "Sábado", dom: "Domingo" };

  function tem(v) {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== "";
  }

  /* texto com quebras de linha preservadas pelo CSS (white-space: pre-wrap) */
  function txt(v) { return '<span class="rv-texto">' + escapar(v) + "</span>"; }

  function indiceEm(lista, v) { var i = (lista || []).indexOf(v); return i < 0 ? "x" : String(i); }

  /* ---------- resumo das respostas (todas as três) ------------------------ */

  function camposDe(f) {
    var lista = [];
    (f.grupos || []).forEach(function (g) {
      lista.push({ grupo: g.titulo, campos: g.campos || [] });
    });
    if (f.campos && f.campos.length) lista.push({ grupo: "Observações", campos: f.campos });
    return lista;
  }

  function resumo(f, r) {
    r = r || {};
    var partes = camposDe(f).map(function (g) {
      var linhas = g.campos.filter(function (c) { return tem(r[c.id]); }).map(function (c) {
        var v = r[c.id];
        if (c.tipo === "data") v = dataBR(v);
        if (c.tipo === "nota") v = v + " de 10 (percepção do paciente)";
        return "<dt>" + escapar(c.rotulo) + "</dt><dd>" + txt(v) + "</dd>";
      });
      if (!linhas.length) return "";
      return '<div class="rv-resumo-grupo"><h5>' + escapar(g.grupo) + "</h5><dl>" + linhas.join("") + "</dl></div>";
    }).filter(Boolean);
    return partes.length
      ? '<div class="rv-resumo">' + partes.join("") + "</div>"
      : "";
  }

  /* ---------- MAPA DA ROTINA: linha do tempo -------------------------------- */

  function eventosOrdenados(r) {
    var ev = Array.isArray(r.eventos) ? r.eventos.slice() : [];
    return ev.map(function (e, i) { return { e: e || {}, i: i }; }).sort(function (a, b) {
      var ha = a.e.inicio || "99:99", hb = b.e.inicio || "99:99";
      return ha === hb ? a.i - b.i : (ha < hb ? -1 : 1);
    }).map(function (x) { return x.e; });
  }

  function eventoHTML(e, curto) {
    var hora = tem(e.inicio) ? escapar(e.inicio) + (tem(e.fim) ? "–" + escapar(e.fim) : "") : "sem horário";
    var cat = tem(e.categoria)
      ? '<span class="rv-cat rv-cat-' + indiceEm(OP.rotina_categorias, e.categoria) + '">' + escapar(e.categoria) + "</span>"
      : "";
    var corpo = (tem(e.titulo) ? "<b>" + escapar(e.titulo) + "</b>" : "") +
      (!curto && tem(e.descricao) ? '<p class="rv-texto">' + escapar(e.descricao) + "</p>" : "") +
      (tem(e.percepcao) ? '<p class="rv-percebida">Percepção do paciente: ' + escapar(e.percepcao) + "</p>" : "") +
      (!curto && Array.isArray(e.dias) && e.dias.length ? '<p class="rv-dias">' + e.dias.map(escapar).join(", ") + "</p>" : "") +
      (!curto && tem(e.observacao) ? '<p class="rv-obs rv-texto">' + escapar(e.observacao) + "</p>" : "");
    return '<li class="rv-evento"><span class="rv-hora">' + hora + "</span>" +
      '<div class="rv-evento-corpo">' + cat + corpo + "</div></li>";
  }

  function timeline(r) {
    var ev = eventosOrdenados(r);
    if (!ev.length && !tem(r.acorda) && !tem(r.dorme)) {
      return '<p class="rv-vazio">Nenhum evento registrado na linha do dia.</p>';
    }
    var dia = '<ol class="rv-linha" aria-label="Linha do dia">' +
      (tem(r.acorda) ? '<li class="rv-ancora"><span class="rv-hora">' + escapar(r.acorda) + "</span><b>Acorda</b></li>" : "") +
      ev.map(function (e) { return eventoHTML(e, false); }).join("") +
      (tem(r.dorme) ? '<li class="rv-ancora"><span class="rv-hora">' + escapar(r.dorme) + "</span><b>Dorme</b></li>" : "") +
      "</ol>";

    var colunas = DIAS.map(function (d) {
      var doDia = ev.filter(function (e) { return Array.isArray(e.dias) && e.dias.indexOf(d) >= 0; });
      return '<div class="rv-semana-dia"><h6>' + escapar(DIAS_NOME[d] || d) + "</h6>" +
        (doDia.length ? '<ul class="rv-semana-lista">' + doDia.map(function (e) { return eventoHTML(e, true); }).join("") + "</ul>"
                      : '<p class="rv-vazio">—</p>') + "</div>";
    });
    var semDia = ev.filter(function (e) { return !Array.isArray(e.dias) || !e.dias.length; });
    if (semDia.length) {
      colunas.push('<div class="rv-semana-dia rv-sem-dia"><h6>Sem dia definido</h6><ul class="rv-semana-lista">' +
        semDia.map(function (e) { return eventoHTML(e, true); }).join("") + "</ul></div>");
    }
    var semana = '<div class="rv-semana" aria-label="Semana">' + colunas.join("") + "</div>";

    return '<div class="rv-timeline" data-rv-modo="dia">' +
      '<div class="rv-alternar" role="group" aria-label="Visualização">' +
        '<button type="button" class="btn-opcao marcado" data-rv-ver="dia" aria-pressed="true">Dia</button>' +
        '<button type="button" class="btn-opcao" data-rv-ver="semana" aria-pressed="false">Semana</button>' +
      "</div>" +
      '<div class="rv-painel" data-rv-painel="dia">' + dia + "</div>" +
      '<div class="rv-painel" data-rv-painel="semana" hidden>' + semana + "</div></div>";
  }

  /* ---------- GATILHOS & RESPOSTAS: o fluxo de um episódio ------------------ */

  function caixa(titulo, conteudo) {
    return '<li class="rv-passo"><h6>' + escapar(titulo) + "</h6>" +
      (conteudo ? conteudo : '<p class="rv-vazio">não registrado</p>') + "</li>";
  }

  function fluxo(r) {
    var p = function (v) { return tem(v) ? '<p class="rv-texto">' + escapar(v) + "</p>" : ""; };
    var emocao = p(r.emocao) + (tem(r.intensidade)
      ? '<p class="rv-percebida">Intensidade percebida pelo paciente: ' + escapar(r.intensidade) + " de 10</p>" : "");
    var consequencia = (tem(r.consequencia_imediata) ? "<p><em>Imediata</em> " + txt(r.consequencia_imediata) + "</p>" : "") +
      (tem(r.consequencia_posterior) ? "<p><em>Depois</em> " + txt(r.consequencia_posterior) + "</p>" : "");
    var quando = [tem(r.data) ? dataBR(r.data) : "", tem(r.horario) ? escapar(r.horario) : ""].filter(Boolean).join(" · ");
    return '<div class="rv-fluxo">' +
      (quando || tem(r.contexto)
        ? '<p class="rv-contexto">' + (quando ? "<b>" + quando + "</b> " : "") + (tem(r.contexto) ? txt(r.contexto) : "") + "</p>" : "") +
      '<ol class="rv-passos" aria-label="Gatilho, pensamento, emoção, resposta e consequência">' +
        caixa("Gatilho", p(r.gatilho)) +
        caixa("Pensamento", p(r.pensamento)) +
        caixa("Emoção", emocao) +
        caixa("Resposta", p(r.resposta)) +
        caixa("Consequência", consequencia) +
      "</ol>" +
      (tem(r.alternativa)
        ? '<p class="rv-alternativa"><em>Resposta alternativa registrada</em> ' + txt(r.alternativa) +
          ' <span class="dica">escrita por quem atende ou pelo paciente — não é sugestão do sistema</span></p>' : "") +
      "</div>";
  }

  /* ---------- CONEXÃO & PERTENCIMENTO: a rede -------------------------------- */

  var RAIO = { "próxima": 0.42, "intermediária": 0.66, "distante": 0.9 };
  var TRACO = { apoia: "", dificulta: "8 5", neutro: "2 4", "variável": "10 4 2 4" };

  function curto(s, n) { s = String(s || ""); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  function rede(r) {
    var vs = (Array.isArray(r.vinculos) ? r.vinculos : []).filter(function (v) { return v && tem(v.rotulo); });
    if (!vs.length) return '<p class="rv-vazio">Nenhum vínculo registrado.</p>';
    var W = 420, H = 420, cx = W / 2, cy = H / 2, R = 180;
    var linhas = "", nos = "";
    vs.forEach(function (v, i) {
      var ang = -Math.PI / 2 + (2 * Math.PI * i) / vs.length;
      var k = RAIO[v.proximidade] || 0.78;
      var x = cx + Math.cos(ang) * R * k, y = cy + Math.sin(ang) * R * k;
      var inativo = v.momento === "não presente no momento";
      var traco = TRACO.hasOwnProperty(v.papel) ? TRACO[v.papel] : "1 3";
      linhas += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x.toFixed(1) + '" y2="' + y.toFixed(1) +
        '" class="rv-rede-linha rv-papel-' + indiceEm(OP.vinculo_papel, v.papel) + (inativo ? " rv-inativo" : "") + '"' +
        (traco ? ' stroke-dasharray="' + traco + '"' : "") + "/>";
      nos += '<g class="rv-no' + (inativo ? " rv-inativo" : "") + '"><title>' + escapar(v.rotulo) +
        (tem(v.papel) ? " — " + escapar(v.papel) : "") + "</title>" +
        '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="7"/>' +
        '<text x="' + x.toFixed(1) + '" y="' + (y + 20).toFixed(1) + '" text-anchor="middle">' + escapar(curto(v.rotulo, 18)) + "</text></g>";
    });
    var svg = '<svg class="rv-rede-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Rede de vínculos registrada: ' +
      vs.length + ' vínculo(s). A tabela abaixo traz os mesmos dados.">' + linhas +
      '<g class="rv-centro"><circle cx="' + cx + '" cy="' + cy + '" r="16"/><text x="' + cx + '" y="' + (cy + 34) +
      '" text-anchor="middle">Paciente</text></g>' + nos + "</svg>";

    var legenda = '<ul class="rv-legenda" aria-label="Legenda">' +
      ["apoia", "dificulta", "neutro", "variável"].map(function (p) {
        return '<li><svg width="36" height="8" aria-hidden="true"><line x1="0" y1="4" x2="36" y2="4" class="rv-rede-linha rv-papel-' +
          indiceEm(OP.vinculo_papel, p) + '"' + (TRACO[p] ? ' stroke-dasharray="' + TRACO[p] + '"' : "") + "/></svg>" + escapar(p) + "</li>";
      }).join("") +
      "</ul><p class=\"dica\">Linhas e distâncias mostram o papel e a proximidade <b>como foram registrados</b>. " +
      "Não é classificação da rede nem das relações.</p>";

    var COLS = [["rotulo", "Nome ou rótulo"], ["natureza", "Natureza"], ["tipo", "Tipo"], ["relacao", "Relação"],
      ["papel", "Papel na mudança"], ["proximidade", "Proximidade"], ["momento", "Momento"], ["contexto", "Data ou contexto"],
      ["observacao", "Observação"]];
    var tabela = '<div class="rv-tabela-rolagem"><table class="rv-tabela"><caption>Vínculos registrados</caption><thead><tr>' +
      COLS.map(function (c) { return '<th scope="col">' + c[1] + "</th>"; }).join("") + "</tr></thead><tbody>" +
      vs.map(function (v) {
        return "<tr>" + COLS.map(function (c) { return "<td>" + (tem(v[c[0]]) ? escapar(v[c[0]]) : "—") + "</td>"; }).join("") + "</tr>";
      }).join("") + "</tbody></table></div>";

    return '<div class="rv-rede"><div class="rv-rede-grafico">' + svg + legenda + "</div>" + tabela + "</div>";
  }

  /* ---------- API ------------------------------------------------------------ */

  /** A visualização da aplicação (sem campos de edição). */
  function desenhar(f, r) {
    r = r || {};
    if (f.visualizacao === "timeline") return timeline(r);
    if (f.visualizacao === "fluxo") return fluxo(r);
    if (f.visualizacao === "rede") return rede(r);
    return "";
  }

  /** Uma linha para o histórico: o que distingue esta aplicação das outras. */
  function previa(f, app) {
    var r = (app && app.respostas) || {};
    if (f.visualizacao === "fluxo") {
      var g = tem(r.gatilho) ? curto(r.gatilho, 60) : "episódio sem gatilho registrado";
      return (tem(r.data) ? dataBR(r.data) + " · " : "") + g;
    }
    if (f.visualizacao === "timeline") {
      var n = Array.isArray(r.eventos) ? r.eventos.length : 0;
      return n + (n === 1 ? " evento" : " eventos");
    }
    if (f.visualizacao === "rede") {
      var m = Array.isArray(r.vinculos) ? r.vinculos.length : 0;
      return m + (m === 1 ? " vínculo" : " vínculos");
    }
    return "";
  }

  /* alternar Dia/Semana: um ouvinte só, delegado */
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest ? ev.target.closest("[data-rv-ver]") : null;
    if (!b) return;
    var raiz = b.closest(".rv-timeline");
    if (!raiz) return;
    var modo = b.dataset.rvVer === "semana" ? "semana" : "dia";
    raiz.dataset.rvModo = modo;
    raiz.querySelectorAll("[data-rv-ver]").forEach(function (x) {
      var on = x.dataset.rvVer === modo;
      x.classList.toggle("marcado", on);
      x.setAttribute("aria-pressed", on ? "true" : "false");
    });
    raiz.querySelectorAll("[data-rv-painel]").forEach(function (p) { p.hidden = p.dataset.rvPainel !== modo; });
  });

  window.RegistroVisual = { desenhar: desenhar, resumo: resumo, previa: previa };
})();
