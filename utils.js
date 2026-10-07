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

     COBERTURA MINIMA (Etapa 0 da V1): a Rodada 08 tinha aqui um corte de 0,5
     (sistema com menos de metade das perguntas respondidas aparecia como
     "dados insuficientes"). O Documento Mestre (secao 18) proibe presumir
     50%, 70% ou qualquer outro corte sem politica de parcialidade homologada.
     O corte foi REMOVIDO e nao foi substituido: a cobertura bruta
     (respondidos/total) continua calculada e mostrada, mas nao decide
     avaliabilidade. Quando o Pacote Metodologico trouxer uma politica, ela
     entra por window.Metodologia.coberturaMinima() — nunca por um numero
     escrito aqui. */
  function coberturaMinima() {
    return window.Metodologia && typeof window.Metodologia.coberturaMinima === "function"
      ? window.Metodologia.coberturaMinima() : null;
  }

  function vazioNum(v) { return v === null || v === undefined || typeof v !== "number" || isNaN(v); }

  function semNota(s) {
    return !s || s.avaliavel === false || vazioNum(s.nota);
  }

  function cobertura(s) {
    if (!s || typeof s.respondidos !== "number" || typeof s.total_marcadores !== "number" ||
        s.total_marcadores <= 0) return null;
    return s.respondidos / s.total_marcadores;
  }

  /** Tem nota E, se houver politica homologada de cobertura minima, cobre o
      minimo. Sem politica (hoje), ter nota basta — e a nota inteira vai para a
      tela com o selo "em homologacao" (window.Metodologia). */
  function suficiente(s) {
    if (semNota(s)) return false;
    var minimo = coberturaMinima();
    if (minimo === null || minimo === undefined) return true;
    var c = cobertura(s);
    return c === null || c >= minimo;
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

  /* Arredondamento de EXIBICAO: meia unidade para longe do zero, como o
     MotorMetodologico faz na fracao exata. toFixed() erra quando o numero
     guardado (binario) fica um fio abaixo do ...5 decimal (ex.: 5.65). */
  function arredondar(v, casas) {
    var c = casas === undefined ? 1 : casas, k = Math.pow(10, c), n = Number(v);
    var r = Math.floor(Math.abs(n) * k + 0.5 + 1e-9) / k;
    return (n < 0 && r !== 0 ? -r : r).toFixed(c);
  }
  function fmt(v, casas) {
    return vazioNum(v) ? "—" : arredondar(v, casas);
  }
  /** Nota de um sistema na tela: a exibicao do motor oficial quando existe. */
  function notaTexto(s) {
    if (semNota(s)) return "—";
    return typeof s.nota_exibicao === "string" && s.nota_exibicao ? s.nota_exibicao : fmt(s.nota);
  }
  /** Indice HOLOS na tela. Aplicacao oficial V1: 1 casa, ou "—" quando nao
      avaliavel (sem Indice parcial). Historica: o numero como foi gravado. */
  function indiceTexto(p) {
    if (!p || vazioNum(p.indice)) return "—";
    if (typeof p.indice_exibicao === "string" && p.indice_exibicao) return p.indice_exibicao;
    if (p.oficial === true || p.methodology_package_id) return arredondar(p.indice, 1);
    return String(p.indice);
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

  /* Duas entradas do historico sao a MESMA aplicacao? Com as respostas dos
     dois lados, compara as respostas; sem elas (entrada que veio do
     servidor nao traz respostas), compara as notas dos cinco sistemas, a
     cobertura e o pacote. Serve so para nao deixar um calculo repetido
     pendurado como "nao salvo no servidor" ao lado da aplicacao salva. */
  function assinRespostas(o) {
    return JSON.stringify(Object.keys(o || {}).sort().map(function (k) { return [k, o[k]]; }));
  }
  function mesmaAplicacao(a, b) {
    if (!a || !b) return false;
    if (a.methodology_package_id && b.methodology_package_id && a.methodology_package_id !== b.methodology_package_id) return false;
    var ra = a.respostas && Object.keys(a.respostas).length, rb = b.respostas && Object.keys(b.respostas).length;
    if (ra && rb) return assinRespostas(a.respostas) === assinRespostas(b.respostas);
    if (!Array.isArray(a.sistemas) || !Array.isArray(b.sistemas) || a.sistemas.length !== b.sistemas.length) return false;
    var nb = {};
    b.sistemas.forEach(function (s) { nb[s.sistema] = s; });
    var iguais = a.sistemas.every(function (s) {
      var o = nb[s.sistema];
      if (!o) return false;
      if (semNota(s) || semNota(o)) return semNota(s) === semNota(o);
      return Math.abs(Number(s.nota) - Number(o.nota)) < 0.005;
    });
    if (!iguais) return false;
    var ca = a.cobertura && a.cobertura.respondidos, cb = b.cobertura && b.cobertura.respondidos;
    return ca === undefined || cb === undefined || ca === cb;
  }

  window.HoloAusencia = {
    mesmaAplicacao: mesmaAplicacao,
    coberturaMinima: coberturaMinima,
    normalizar: normalizar, semNota: semNota, suficiente: suficiente,
    cobertura: cobertura, fmt: fmt, porNota: porNota, porLeitura: porLeitura, notas: notas,
    notaTexto: notaTexto, indiceTexto: indiceTexto, arredondar: arredondar
  };
})();

/* ---------- EDICAO NAO SALVA (rodada 08) ------------------------------------
   Um registro so, carregado antes de todo modulo: cada tela marca o que
   editou sem salvar (marcaSuja), limpa quando o servidor confirmou
   (limpaSuja) e registra como salvar e como descartar (registrarSujeira).
   A navegacao interna (app.js) pergunta Salvar / Descartar / Cancelar, e o
   fechamento da aba cai no aviso do navegador. */
(function () {
  "use strict";
  var sujas = new Set();
  var acoes = {};
  window.marcaSuja = function (chave) { sujas.add(chave); };
  window.limpaSuja = function (chave) { sujas.delete(chave); };
  window.registrarSujeira = function (chave, handlers) { acoes[chave] = handlers || {}; };
  window.Sujeira = {
    lista: function () { return Array.from(sujas); },
    tem: function () { return sujas.size > 0; },
    acoes: function (chave) { return acoes[chave] || null; },
    limparTudo: function () { sujas.clear(); }
  };
})();

/* ---------- PACIENTE ARQUIVADO (rodada 08) -----------------------------------
   Arquivado pode: ver, ler o historico, exportar, reativar. Nao pode: nova
   consulta, HOLOSCAN, coleta, ferramenta, documento, edicao clinica. Toda
   escrita clinica pergunta aqui antes; o servidor recusa de novo (migration
   20260930150000). bloqueioArquivado(pid) avisa e devolve true se barrou. */
(function () {
  "use strict";
  var MSG = "Paciente arquivado — reative antes de registrar novas informações.";
  window.MSG_ARQUIVADO = MSG;
  window.bloqueioArquivado = function (pid) {
    if (!window.pacienteArquivado || !window.pacienteArquivado(pid)) return false;
    if (window.avisar) window.avisar(MSG);
    return true;
  };
  /** O erro que o servidor devolve para escrita em paciente arquivado. */
  window.erroDeArquivado = function (e) {
    return /arquivad|inativo/i.test(String((e && (e.message || e.details)) || e || ""));
  };
})();

/* ---------- MENSAGEM HUMANA (rodada 08) --------------------------------------
   O erro do Postgres/PostgREST ("violates check constraint ...", "42501")
   nao vai para a tela. mensagemHumana(erro) devolve a frase que a pessoa
   entende; o erro cru continua no console para diagnostico. */
(function () {
  "use strict";
  window.mensagemHumana = function (e) {
    var m = String((e && (e.message || e.details || e.hint)) || e || "");
    var code = e && e.code ? String(e.code) : "";
    if (/arquivad/i.test(m)) return window.MSG_ARQUIVADO;
    if (/futur/i.test(m)) return "A data não pode ser no futuro.";
    if (/coleta ja existe/i.test(m)) return "Já existe uma coleta nessa data. Para mudar os valores dela, use Editar.";
    if (/Failed to fetch|NetworkError|network|sem conex/i.test(m)) {
      return "Sem conexão com o servidor. Nada foi gravado; tente de novo.";
    }
    if (code === "42501" || /row-level security|permission denied|JWT/i.test(m)) {
      return "Sem permissão para esta ação. Entre de novo na sua conta e tente outra vez.";
    }
    if (code === "23505" || /duplicate key/i.test(m)) return "Este registro já existe.";
    if (code === "23503" || /foreign key/i.test(m)) {
      return "Este registro depende de outro que não existe mais (ou ainda é usado por outro).";
    }
    if (code === "23514" || code === "22007" || code === "22008" || /check constraint|invalid input/i.test(m)) {
      return "Algum campo tem um valor que não é aceito. Confira e tente de novo.";
    }
    return "Não foi possível concluir agora. Nada foi alterado; tente de novo.";
  };
})();

/* ---------- ROTULOS EXIBIVEIS (rodada 08) ------------------------------------
   O banco do motor guarda alguns rotulos sem acento ("medio", "Acido urico").
   O dado do motor nao muda (ele e o metodo, e os snapshots gravados usam o
   nome dele); so a TELA mostra a forma correta. */
(function () {
  "use strict";
  var MAPA = {
    "medio": "médio",
    "intermediaria": "intermediária",
    "Acido urico": "Ácido úrico",
    "Triglicerideos": "Triglicerídeos",
    "PCR ultrassensivel": "PCR ultrassensível",
    "Magnesio eritrocitario": "Magnésio eritrocitário",
    "Homocisteina": "Homocisteína"
  };
  window.rotuloExibivel = function (s) {
    if (s === null || s === undefined) return s;
    var t = String(s);
    return Object.prototype.hasOwnProperty.call(MAPA, t) ? MAPA[t] : t;
  };
})();
