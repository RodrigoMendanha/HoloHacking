"use strict";
(function () {
  window.escapar = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };
  window.dataBR = function (iso) {
    if (!iso) return "";
    var d = String(iso).slice(0, 10).split("-");
    return d.length === 3 ? d[2] + "/" + d[1] + "/" + d[0] : "";
  };
  window.hojeISO = function () {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  };

  /* ---------- AUSENCIA DE DADO (rodada 08) --------------------------------

     O motor devolve, para sistema sem nenhuma resposta, nota 10 com
     avaliavel = false; e, para eixo da Triada sem resposta, 10 com
     triada_com_dado[eixo] = false. O 10 e artefato da conta (10 - carga 0),
     nao sinal de saude. Regra: SEM DADO = SEM DADO. Toda tela, exportacao e
     contexto passa por aqui:

       normalizar(r)   copia do resultado com a ausencia explicita (null)
       semNota(s)      o sistema nao tem nota
       suficiente(s)   tem nota E cobertura minima para ser lido como nota
       fmt(v)          "—" para ausencia, senao o numero com 1 casa
       porNota(a, b)   ordena do mais carregado ao mais leve; sem nota por ultimo
       notas(r)        mapa sistema -> nota, SO com quem tem nota

     COBERTURA_MINIMA e um limiar de APRESENTACAO (quantas perguntas do sistema
     precisam de resposta para a nota ser mostrada como leitura, e nao como
     "dados insuficientes"). Nao muda o calculo nem o Indice. O valor precisa
     de validacao da responsavel pelo metodo. */
  var COBERTURA_MINIMA = 0.5;

  function vazioNum(v) { return v === null || v === undefined || typeof v !== "number" || isNaN(v); }

  function semNota(s) {
    return !s || s.avaliavel === false || vazioNum(s.nota);
  }

  function cobertura(s) {
    if (!s || typeof s.respondidos !== "number" || typeof s.total_marcadores !== "number" ||
        s.total_marcadores <= 0) return null;
    return s.respondidos / s.total_marcadores;
  }

  function suficiente(s) {
    if (semNota(s)) return false;
    var c = cobertura(s);
    return c === null || c >= COBERTURA_MINIMA;
  }

  function normalizar(r) {
    if (!r || typeof r !== "object") return r;
    var out = Object.assign({}, r);
    if (Array.isArray(r.sistemas)) {
      out.sistemas = r.sistemas.map(function (s) {
        if (!s || s.avaliavel !== false) return s;
        return Object.assign({}, s, { nota: null, carga: null, faixa: null });
      });
    }
    if (r.triada && typeof r.triada === "object") {
      var t = {};
      Object.keys(r.triada).forEach(function (k) {
        var sem = r.triada_com_dado && r.triada_com_dado[k] === false;
        t[k] = sem || vazioNum(r.triada[k]) ? null : r.triada[k];
      });
      out.triada = t;
    }
    return out;
  }

  function fmt(v, casas) {
    return vazioNum(v) ? "—" : Number(v).toFixed(casas === undefined ? 1 : casas);
  }

  function porNota(a, b) {
    var sa = semNota(a), sb = semNota(b);
    if (sa !== sb) return sa ? 1 : -1;
    if (sa) return 0;
    return a.nota - b.nota;
  }

  /* Ordem de LEITURA: primeiro quem tem nota e cobertura suficiente (do mais
     carregado ao mais leve), depois quem tem nota com cobertura insuficiente,
     por ultimo quem nao tem nota. Sistema parcial nao disputa prioridade com
     avaliacao completa. */
  function grau(s) { return semNota(s) ? 2 : suficiente(s) ? 0 : 1; }
  function porLeitura(a, b) {
    var ga = grau(a), gb = grau(b);
    if (ga !== gb) return ga - gb;
    return ga === 2 ? 0 : a.nota - b.nota;
  }

  function notas(r) {
    var n = {};
    if (r && Array.isArray(r.sistemas)) {
      r.sistemas.forEach(function (s) { if (!semNota(s)) n[s.sistema] = s.nota; });
    }
    return n;
  }

  window.HoloAusencia = {
    COBERTURA_MINIMA: COBERTURA_MINIMA,
    normalizar: normalizar, semNota: semNota, suficiente: suficiente,
    cobertura: cobertura, fmt: fmt, porNota: porNota, porLeitura: porLeitura, notas: notas
  };
})();
