/* ===========================================================================
   RESULTADO-SINTESE — o resumo estruturado do Resultado HOLOS (09/10)
   ===========================================================================

   O Resultado HOLOS nao depende de texto da nutricionista: este modulo monta,
   SO a partir do snapshot salvo (nada recalculado, nada lido ao vivo), um
   resumo com quatro camadas que nunca se misturam:

     1. FATOS          o que esta registrado (Indice, notas, faixas, Triade,
                       ferramentas feitas, o que a nutri escolheu/escreveu)
     2. REGRA OFICIAL  so o que ja e homologado: "Por onde investigar" (os 2
                       sistemas de nota mais baixa — a mesma regra do HOLOSCAN
                       e do catalogo HOLOS-RECOMENDACOES-V1)
     3. PENDENCIAS     o que o metodo ainda nao decidiu (conclusao integrada,
                       fechamento por ferramenta, ferramenta -> ferramenta...):
                       aparece como PENDENCIA METODOLOGICA, nunca como texto
     4. DECISAO DA NUTRI  leitura/prioridade/proximo passo de cada ferramenta,
                       observacoes e Conduta — sempre identificados como dela

   Nenhuma frase aqui e conclusao clinica: as frases sao de estrutura
   ("tem nota", "foi aplicada", "e a mais baixa"), nao de interpretacao.
   Nao le exames, nem Leitura Integrada, nem anamnese.

   Funciona no navegador (window.ResultadoSintese) e no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  /* As pendencias metodologicas conhecidas. O texto e para a profissional e
     para a equipe: diz o que falta decidir, nao o que a paciente tem. */
  var PENDENCIAS = [
    { id: "PM-01", titulo: "Conclusão integrada Corpo | Mente | Espírito",
      texto: "Não há regra homologada que transforme o HOLOSCAN e as ferramentas em uma conclusão. O resumo mostra os dados lado a lado; a leitura do conjunto é da nutricionista." },
    { id: "PM-02", titulo: "Fechamento por ferramenta",
      texto: "Nenhuma das ferramentas tem regra oficial de \"resultado\" (a Linha do Momentum só registra o estado escolhido pela nutricionista). Os achados aparecem como foram registrados." },
    { id: "PM-03", titulo: "Ferramenta → próxima ferramenta",
      texto: "Não existe matriz homologada \"se a ferramenta X mostrar Y, aplicar Z\". A única indicação oficial é sistema → ferramenta (Próximos Passos HOLOS, catálogo HOLOS-RECOMENDACOES-V1)." },
    { id: "PM-04", titulo: "Prioridades e pontos de atenção automáticos",
      texto: "Além da ordem \"Por onde investigar\" (sistemas de nota mais baixa), não há regra para classificar prioridade ou gravidade." },
    { id: "PM-05", titulo: "O que a paciente vê",
      texto: "Mostrar à paciente \"Por onde investigar\" e os Próximos Passos HOLOS ainda não foi decidido (hoje só na visão profissional). A mensagem oficial de faixa para a paciente traz uma frase dirigida à profissional (pendência já registrada)." }
  ];
  var SELO = "PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO/DANIEL";

  var EIXOS = [["corpo", "Corpo", "fisico"], ["mente", "Mente", "mental"], ["espirito", "Espírito", "espiritual"]];

  function num(v) { return typeof v === "number" && !isNaN(v); }
  function temNota(s) { return !!s && s.avaliavel !== false && num(s.nota); }
  function fmt(v) { return num(v) ? (Math.round(v * 10) / 10).toString().replace(".", ",") : "—"; }
  function rotuloFaixa(f) { return raiz.rotuloExibivel ? raiz.rotuloExibivel(f) : String(f).replace(/_/g, " "); }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* "Por onde investigar": sistemas COM nota, do mais baixo ao mais alto, os
     dois primeiros. Mesma ordem do HOLOSCAN (HoloAusencia.porLeitura quando
     carregado; senao nota crescente, sort estavel = empate fica na ordem do
     pacote). */
  function ordenar(sistemas) {
    var A = raiz.HoloAusencia;
    var lista = (sistemas || []).slice();
    if (A && A.porLeitura) lista.sort(A.porLeitura);
    else lista.sort(function (a, b) { return (a.nota || 0) - (b.nota || 0); });
    return lista.filter(temNota);
  }

  /* moduloDe(ferramenta_id) -> "corpo" | "mente" | "espirito" (vem de quem chama) */
  function fatos(snap, moduloDe) {
    snap = snap || {};
    var h = snap.holoscan || {}, sis = h.sistemas || [];
    var tri = h.triada || {}, triOk = h.triada_com_dado || {};
    var ordem = ordenar(sis);
    var triade = EIXOS.map(function (x) {
      var v = tri[x[2]];
      return { eixo: x[0], nome: x[1], valor: (triOk[x[2]] === false || !num(v)) ? null : v };
    });
    var comValor = triade.filter(function (t) { return t.valor !== null; });
    var minimo = comValor.length > 1 ? Math.min.apply(null, comValor.map(function (t) { return t.valor; })) : null;
    var noMinimo = minimo === null ? [] : comValor.filter(function (t) { return t.valor === minimo; });
    /* empate no valor mais baixo: nao ha "dimensao mais baixa" (nao escolhe uma pela ordem) */
    var maisBaixa = noMinimo.length === 1 ? noMinimo[0] : null;
    var ferr = snap.ferramentas || [];
    var porEixo = {};
    EIXOS.forEach(function (x) { porEixo[x[0]] = []; });
    ferr.forEach(function (t) {
      var m = moduloDe ? moduloDe(t.ferramenta_id) : null;
      if (porEixo[m]) porEixo[m].push(t);
    });
    var obs = snap.observacoes || {};
    return {
      indice: num(h.indice) ? h.indice : null,
      indice_maximo: h.indice_maximo || 100,
      sistemas_total: sis.length,
      sistemas_com_nota: ordem.length,
      sem_nota: sis.filter(function (s) { return !temNota(s); }).map(function (s) { return s.nome || s.sistema; }),
      ordem: ordem.map(function (s) { return { sistema: s.sistema, nome: s.nome || s.sistema, nota: s.nota, faixa: s.faixa || null }; }),
      investigar: ordem.slice(0, 2).map(function (s) { return { sistema: s.sistema, nome: s.nome || s.sistema, nota: s.nota, faixa: s.faixa || null }; }),
      triade: triade,
      triade_mais_baixa: maisBaixa ? maisBaixa.nome : null,
      triade_empate: noMinimo.length > 1 && noMinimo.length < comValor.length ? noMinimo.map(function (t) { return t.nome; }) : (noMinimo.length > 1 ? ["todas"] : []),
      ferramentas: porEixo,
      ferramentas_total: ferr.length,
      eixos_sem_ferramenta: EIXOS.filter(function (x) { return !porEixo[x[0]].length; }).map(function (x) { return x[1]; }),
      momentum: (ferr.filter(function (t) { return t.ferramenta_id === "linha_momentum"; })[0] || {}).respostas
        ? ((ferr.filter(function (t) { return t.ferramenta_id === "linha_momentum"; })[0].respostas || {}).estado_confirmado || null) : null,
      leituras_nutri: ferr.filter(function (t) { return !!(t.leitura || t.prioridade || t.proximo_passo); }).length,
      observacoes_nutri: ["leitura_profissional", "pontos_acompanhar", "questoes_aprofundar"].filter(function (k) { return obs[k] && String(obs[k]).trim(); }).length
    };
  }

  /* HTML do resumo. visao "profissional" ou "paciente". opts.nomeFerramenta(id) da o nome. */
  function html(snap, visao, opts) {
    opts = opts || {};
    var f = fatos(snap, opts.moduloDe);
    var nome = opts.nomeFerramenta || function (id) { return id; };
    var paciente = visao === "paciente";
    var listaFerr = function (eixo) {
      var l = f.ferramentas[eixo] || [];
      if (paciente) l = l.filter(function (t) { return t.mostrar_paciente; });
      return l.map(function (t) { return esc(nome(t.ferramenta_id)); });
    };

    if (paciente) {
      var linhasP = EIXOS.map(function (x) { var l = listaFerr(x[0]); return l.length ? "<li><b>" + esc(x[1]) + ":</b> " + l.join(", ") + "</li>" : ""; }).join("");
      return '<section class="rh-secao rh-resumo" aria-labelledby="rh-t-resumo"><h3 id="rh-t-resumo">Resumo da sua avaliação</h3>' +
        '<ul class="rh-resumo-lista">' +
        "<li>Suas respostas ao HOLOSCAN foram organizadas em " + f.sistemas_total + " sistemas" +
          (f.sistemas_com_nota < f.sistemas_total ? " (" + f.sistemas_com_nota + " com nota)" : "") + ".</li>" +
        (f.indice !== null ? "<li>Índice HOLOS: <b>" + fmt(f.indice) + "</b> de " + esc(f.indice_maximo) + ".</li>" : "") +
        linhasP + "</ul>" +
        '<p class="rh-intro">Este resumo só organiza o que foi registrado. O que fazer com ele é combinado com a sua nutricionista.</p></section>';
    }

    var p = '<section class="rh-secao rh-resumo" aria-labelledby="rh-t-resumo"><h3 id="rh-t-resumo">Resumo estruturado</h3>' +
      '<p class="rh-nota-tec">Montado automaticamente a partir dos dados salvos neste resultado. Separa o que é <b>fato registrado</b>, o que é <b>regra oficial</b> e o que ainda é <b>pendência metodológica</b>. Não é conclusão clínica.</p>' +
      '<div class="rh-resumo-grade">' +
      '<div class="rh-resumo-bloco"><h4><span class="rh-rotulo rh-rotulo-fato">Fatos</span> HOLOSCAN</h4><ul class="rh-resumo-lista">' +
        "<li>Índice HOLOS: <b>" + (f.indice !== null ? fmt(f.indice) : "—") + "</b> de " + esc(f.indice_maximo) + ".</li>" +
        "<li>" + f.sistemas_com_nota + " de " + f.sistemas_total + " sistemas com nota" + (f.sem_nota.length ? " (sem nota: " + f.sem_nota.map(esc).join(", ") + ")" : "") + ".</li>" +
        (f.ordem.length ? "<li>Do mais baixo ao mais alto: " + f.ordem.map(function (s) { return esc(s.nome) + " " + fmt(s.nota); }).join(" · ") + ".</li>" : "") +
        "<li>Tríade: " + f.triade.map(function (t) { return esc(t.nome) + " " + fmt(t.valor); }).join(" · ") +
          (f.triade_mais_baixa ? " — dimensão mais baixa: <b>" + esc(f.triade_mais_baixa) + "</b>"
            : f.triade_empate.length ? (f.triade_empate[0] === "todas" ? " — as três com o mesmo valor" : " — empate no valor mais baixo: " + f.triade_empate.map(esc).join(" e ")) : "") + ".</li>" +
      "</ul></div>" +
      '<div class="rh-resumo-bloco"><h4><span class="rh-rotulo rh-rotulo-regra">Regra oficial</span> Por onde investigar</h4>' +
        (f.investigar.length
          ? '<ul class="rh-resumo-lista">' + f.investigar.map(function (s) { return "<li><b>" + esc(s.nome) + "</b> — nota " + fmt(s.nota) + (s.faixa ? " · faixa " + esc(rotuloFaixa(s.faixa)) : "") + "</li>"; }).join("") + "</ul>" +
            '<p class="rh-nota-tec">Os dois sistemas de nota mais baixa (mesma regra do HOLOSCAN e dos Próximos Passos HOLOS). É a aritmética das respostas, não diagnóstico.</p>'
          : '<p class="rh-vazio">Nenhum sistema com nota.</p>') +
        '<div class="rh-pp" data-rh-pp>' + (opts.proximosPassos || "") + "</div>" +
      "</div>" +
      '<div class="rh-resumo-bloco"><h4><span class="rh-rotulo rh-rotulo-fato">Fatos</span> Ferramentas aplicadas</h4><ul class="rh-resumo-lista">' +
        EIXOS.map(function (x) { var l = listaFerr(x[0]); return "<li><b>" + esc(x[1]) + ":</b> " + (l.length ? l.join(", ") : '<span class="rh-vazio">nenhuma neste resultado</span>') + "</li>"; }).join("") +
        (f.momentum ? "<li>Linha do Momentum — estado escolhido pela nutricionista: <b>" + esc(String(f.momentum).replace(/_/g, " ")) + "</b>.</li>" : "") +
      "</ul></div>" +
      '<div class="rh-resumo-bloco"><h4><span class="rh-rotulo rh-rotulo-nutri">Decisão da nutricionista</span> Registros dela</h4><ul class="rh-resumo-lista">' +
        "<li>Leituras de ferramenta registradas: <b>" + f.leituras_nutri + "</b> de " + f.ferramentas_total + ".</li>" +
        "<li>Observações deste resultado preenchidas: <b>" + f.observacoes_nutri + "</b> de 3 (nenhuma é obrigatória).</li>" +
      "</ul></div>" +
      "</div>" +
      '<details class="rh-pendencias"><summary>Pendências metodológicas (' + PENDENCIAS.length + ") — o que o sistema ainda não faz sozinho</summary>" +
        '<p class="rh-selo-pend">' + esc(SELO) + "</p><ul>" +
        PENDENCIAS.map(function (x) { return "<li><b>" + esc(x.id) + " · " + esc(x.titulo) + ".</b> " + esc(x.texto) + "</li>"; }).join("") +
      "</ul></details></section>";
    return p;
  }

  /* Proximos Passos HOLOS JA REGISTRADOS para a aplicacao (snapshot imutavel de holos_next_steps). So visao profissional. */
  function htmlProximosPassos(registro, nomeFerramenta) {
    if (!registro) return '<p class="rh-nota-tec">Próximos Passos HOLOS: nenhum registro salvo para esta aplicação (registre no quadro do HOLOSCAN).</p>';
    var nome = nomeFerramenta || function (id) { return id; };
    var sel = Array.isArray(registro.selection) ? registro.selection : [];
    if (!sel.length) return '<p class="rh-nota-tec">Próximos Passos HOLOS registrados: nenhuma recomendação para esta aplicação.</p>';
    return '<h5 class="rh-pp-tit"><span class="rh-rotulo rh-rotulo-regra">Regra oficial</span> Próximos Passos HOLOS registrados</h5><ul class="rh-resumo-lista">' +
      sel.map(function (s) {
        return "<li><b>" + esc(nome(s.tool_id)) + "</b>" + (s.papel === "principal" ? " (principal)" : "") +
          (s.next_action ? " — " + esc(s.next_action) : "") + "</li>";
      }).join("") + '</ul><p class="rh-nota-tec">Catálogo ' + esc(registro.catalog_code || "HOLOS-RECOMENDACOES-V1") +
      " v" + esc(registro.catalog_version || 1) + " (aprovado), registrado em " + esc(String(registro.created_at || "").slice(0, 10).split("-").reverse().join("/")) + ". Só na visão profissional.</p>";
  }

  var api = { fatos: fatos, html: html, htmlProximosPassos: htmlProximosPassos, PENDENCIAS: PENDENCIAS, SELO: SELO, ordenar: ordenar };
  raiz.ResultadoSintese = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
