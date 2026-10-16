/* ===========================================================================
   ATENDIMENTOS — o que ja aconteceu, em ordem de tempo (V1, Etapa 1)
   ===========================================================================

   A tela (id tecnico "consultas") lista os ATENDIMENTOS clinicos registrados
   (encounters): paciente, data/hora clinica, origem (com/sem agendamento),
   tipo, e abre a ficha com aquele atendimento selecionado. Abaixo, com o
   nome certo, os agendamentos da agenda (proximos e anteriores) e as
   aplicacoes do HOLOSCAN. Agendamento futuro nao e atendimento; aplicacao
   do HOLOSCAN nao e atendimento; cada bloco e o que diz ser.

   --- o texto abaixo e o da versao anterior, mantido pelo historico ---

   O app guardava cada aplicacao do HOLOSCAN dentro do paciente. Isso responde
   "como a Marina evoluiu", e responde bem. Mas nao responde "o que eu atendi
   este mes" — e essa e a pergunta de quem precisa saber se a semana rendeu,
   quem sumiu, e ha quanto tempo nao aparece ninguem.

   Aqui cada linha e uma aplicacao: a data, quem, qual aplicacao daquele
   paciente foi, o Indice e para onde ele andou desde a anterior.

   O que esta tela NAO faz, de proposito: inventar consulta. Se nao houve
   aplicacao do mapa, nao houve atendimento registrado — e aparecer uma linha
   ali diria que houve. Ferramenta preenchida tambem nao entra: ela nao guarda
   data, entao ninguem consegue dizer a que dia ela pertence.

   Nada e calculado aqui. Panorama.consultas() monta a lista a partir do mesmo
   historico que a tela de evolucao le.
   =========================================================================== */

(function () {
  "use strict";

  var alvo = null;

  var escapar = window.escapar;

  function inicial(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
  }

  function dataBR(iso) { return window.dataBR(iso) || "—"; }

  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
               "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  /** "setembro de 2026" — o titulo de cada faixa da lista. */
  function mesPorExtenso(iso) {
    if (!iso) return "sem data";
    var p = iso.split("-");
    return MESES[Number(p[1]) - 1] + " de " + p[0];
  }

  function ordinal(n) {
    return n + "ª aplicação";
  }

  function nomeDoPaciente(pid) {
    var todos = (window.pacientesTodos && window.pacientesTodos()) || [];
    for (var i = 0; i < todos.length; i++) if (todos[i].id === pid) return todos[i].nome;
    return "Paciente";
  }

  /* ===== REDESENHO 14/10: painel do historico clinico =====================
     Ordem: filtro de mes (topo) -> numeros do periodo -> abas (Atendimentos | HOLOSCAN) -> tabela.
     A agenda saiu daqui (tem o menu proprio). No celular a tabela vira cartoes compactos e os
     numeros, uma faixa com rolagem lateral. Linha inteira clicavel. Nada e calculado alem de contar. */
  var estado = { mes: null, aba: "atendimentos" };
  var MESES_CURTOS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  function rotuloMes(m) { if (!m) return "Todos os meses"; var p = m.split("-"); return MESES_CURTOS[Number(p[1]) - 1] + " de " + p[0]; }
  function mesAtual() { return hojeISO().slice(0, 7); }

  function atendimentos() {
    var A = window.AtendimentoAtual;
    var lista = A && A.todos ? A.todos() : [];
    return lista.map(function (e) {
      var w = A.paraParede(e.occurred_at, e.timezone || A.fuso());
      return { e: e, data: w.data || "", hora: w.hora || "", nome: nomeDoPaciente(e.patient_id) };
    }).sort(function (a, b) { return (b.data + b.hora).localeCompare(a.data + a.hora); });
  }
  function aplicacoes() {
    var P = window.Panorama;
    try { return (P && P.consultas ? P.consultas() : []); } catch (err) { return []; }
  }
  function doMes(itens, campo) {
    if (!estado.mes) return itens;
    return itens.filter(function (x) { return String(x[campo] || "").slice(0, 7) === estado.mes; });
  }

  function situacaoResultado(eid) {
    var J = window.JornadaPaciente;
    var r = J && J.resultadoDoAtendimento ? J.resultadoDoAtendimento(eid) : null;
    if (r === "emitido") return { cls: "ok", txt: "Resultado emitido" };
    if (r === "gerado") return { cls: "meio", txt: "Resultado gerado" };
    if (r === "nenhum") return { cls: "pendente", txt: "Sem resultado" };
    return null;
  }

  function numeros(ats, aps) {
    var P = window.Panorama;
    var apsSalvas = aps.filter(function (c) { return !(P && P.naoSalva && P.naoSalva(c)); });
    var pessoas = {};
    ats.forEach(function (x) { pessoas[x.e.patient_id] = true; });
    apsSalvas.forEach(function (c) { pessoas[c.paciente.id] = true; });
    var semRes = ats.filter(function (x) { var s = situacaoResultado(x.e.id); return s && s.cls === "pendente"; }).length;
    /* quem voltou para reavaliar: aplicacoes em pelo menos dois dias (no historico todo da pessoa) */
    var dias = {};
    aplicacoes().filter(function (c) { return !(P && P.naoSalva && P.naoSalva(c)); }).forEach(function (c) {
      (dias[c.paciente.id] = dias[c.paciente.id] || {})[c.quando || ""] = true;
    });
    var noPeriodo = {}; apsSalvas.forEach(function (c) { noPeriodo[c.paciente.id] = true; });
    var voltaram = Object.keys(dias).filter(function (k) { return noPeriodo[k] && Object.keys(dias[k]).length > 1; }).length;
    var tiles = [
      { n: ats.length, r: ats.length === 1 ? "atendimento" : "atendimentos" },
      { n: apsSalvas.length, r: apsSalvas.length === 1 ? "aplicação do HOLOSCAN" : "aplicações do HOLOSCAN" },
      { n: Object.keys(pessoas).length, r: Object.keys(pessoas).length === 1 ? "paciente atendido" : "pacientes atendidos" },
      { n: voltaram, r: voltaram === 1 ? "voltou para reavaliar" : "voltaram para reavaliar" },
      { n: semRes, r: semRes === 1 ? "atendimento sem resultado" : "atendimentos sem resultado", alerta: semRes > 0 }
    ];
    return '<div class="dash-numeros at-metricas" role="list">' + tiles.map(function (t) {
      return '<div class="dash-tile' + (t.alerta ? " at-alerta" : "") + '" role="listitem"><b>' + escapar(t.n) + "</b><span>" + escapar(t.r) + "</span></div>";
    }).join("") + "</div>";
  }

  function vazio(txt, botao, destino) {
    return '<div class="at-vazio"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9.5 4V2.8h5V4M9.5 10.5h5M9.5 14.5h3"/></svg>' +
      "<p>" + escapar(txt) + "</p>" +
      (botao ? '<button type="button" class="btn-verde" data-secao-destino="' + destino + '">' + escapar(botao) + "</button>" : "") + "</div>";
  }

  function tabelaAtendimentos(ats) {
    if (!ats.length) return vazio(estado.mes ? "Nenhum atendimento registrado em " + rotuloMes(estado.mes).toLowerCase() + "." : "Nenhum atendimento registrado.", "Iniciar atendimento", "agenda");
    return '<table class="at-tabela"><thead><tr><th>Data</th><th>Paciente</th><th>Tipo</th><th>Situação</th><th class="at-col-acao"><span class="sr-only">Ação</span></th></tr></thead><tbody>' +
      ats.map(function (x) {
        var sit = situacaoResultado(x.e.id);
        var arq = window.pacienteArquivado && window.pacienteArquivado(x.e.patient_id);
        return '<tr class="con-linha at-linha" tabindex="0" data-atendimento="' + escapar(x.e.id) + '" data-paciente-at="' + escapar(x.e.patient_id) + '">' +
          '<td class="at-c-data" data-rot="Data">' + escapar(dataBR(x.data)) + ' <span class="at-hora">' + escapar(x.hora) + "</span></td>" +
          '<td class="at-c-quem" data-rot="Paciente"><span class="at-quem"><span class="pac-avatar" aria-hidden="true">' + escapar(inicial(x.nome)) + "</span><b>" + escapar(x.nome) + "</b>" + (arq ? ' <span class="at-pilula neutra">arquivado</span>' : "") + "</span></td>" +
          '<td data-rot="Tipo"><span class="at-pilula neutra">' + (x.e.consultation_id ? "Agendado" : "Avulso") + "</span></td>" +
          '<td data-rot="Situação">' + (sit ? '<span class="at-pilula ' + sit.cls + '">' + escapar(sit.txt) + "</span>" : '<span class="at-pilula neutra">—</span>') + "</td>" +
          '<td class="at-col-acao"><span class="at-abrir">Abrir <span aria-hidden="true">&rarr;</span></span></td></tr>';
      }).join("") + "</tbody></table>";
  }

  function tabelaHoloscan(aps) {
    if (!aps.length) return vazio(estado.mes ? "Nenhuma aplicação do HOLOSCAN em " + rotuloMes(estado.mes).toLowerCase() + "." : "Nenhuma aplicação do HOLOSCAN registrada.", "Aplicar o HOLOSCAN", "holoscan");
    var M = window.Metodologia;
    return '<table class="at-tabela"><thead><tr><th>Data</th><th>Paciente</th><th>Índice HOLOS</th><th>Sistemas mais baixos</th><th class="at-col-acao"><span class="sr-only">Ação</span></th></tr></thead><tbody>' +
      aps.map(function (c) {
        var baixos = (c.maisBaixos || []).map(function (s) { return escapar(s.nome) + " " + window.HoloAusencia.notaTexto(s); }).join(" &middot; ");
        var indice = c.oficial ? window.HoloAusencia.indiceTexto(c) : (typeof c.indice === "number" ? String(Math.round(c.indice)) : "—");
        return '<tr class="con-linha" tabindex="0" data-paciente="' + escapar(c.paciente.id) + '">' +
          '<td class="at-c-data" data-rot="Data">' + escapar(dataBR(c.quando)) + ' <span class="at-hora">' + escapar(ordinal(c.numero)) + "</span></td>" +
          '<td class="at-c-quem" data-rot="Paciente"><span class="at-quem"><span class="pac-avatar" aria-hidden="true">' + escapar(inicial(c.paciente.nome)) + "</span><b>" + escapar(c.paciente.nome) + "</b></span></td>" +
          '<td data-rot="Índice HOLOS"><b class="at-indice">' + escapar(indice) + "</b>" + (M ? ' <span class="con-var homologacao">' + M.seloAplicacao(c) + "</span>" : "") + "</td>" +
          '<td class="at-c-baixos" data-rot="Mais baixos">' + (baixos || "—") + "</td>" +
          '<td class="at-col-acao"><span class="at-abrir">Abrir <span aria-hidden="true">&rarr;</span></span></td></tr>';
      }).join("") + "</tbody></table>";
  }

  function csv(ats, aps) {
    var q = function (v) { return '"' + String(v === null || v === undefined ? "" : v).replace(/"/g, '""') + '"'; };
    var linhas;
    if (estado.aba === "holoscan") {
      linhas = [["Data", "Paciente", "Aplicação", "Índice HOLOS", "Sistemas mais baixos"]].concat(aps.map(function (c) {
        return [dataBR(c.quando), c.paciente.nome, ordinal(c.numero), c.oficial ? window.HoloAusencia.indiceTexto(c) : (typeof c.indice === "number" ? Math.round(c.indice) : ""),
          (c.maisBaixos || []).map(function (s) { return s.nome + " " + window.HoloAusencia.notaTexto(s); }).join(" / ")];
      }));
    } else {
      linhas = [["Data", "Hora", "Paciente", "Tipo", "Situação"]].concat(ats.map(function (x) {
        var sit = situacaoResultado(x.e.id);
        return [dataBR(x.data), x.hora, x.nome, x.e.consultation_id ? "Agendado" : "Avulso", sit ? sit.txt : ""];
      }));
    }
    var blob = new Blob(["﻿" + linhas.map(function (l) { return l.map(q).join(";"); }).join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (estado.aba === "holoscan" ? "historico-holoscan" : "historico-atendimentos") + "-" + (estado.mes || "todos") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 30000);
  }

  function desenhar() {
    if (!alvo) return;
    var todosAt = atendimentos(), todasAp = aplicacoes();
    var meses = {}; meses[mesAtual()] = true;
    todosAt.forEach(function (x) { if (x.data) meses[x.data.slice(0, 7)] = true; });
    todasAp.forEach(function (c) { if (c.quando) meses[c.quando.slice(0, 7)] = true; });
    if (estado.mes === null) estado.mes = mesAtual();
    if (estado.mes && !meses[estado.mes]) meses[estado.mes] = true;
    var opcoes = Object.keys(meses).sort().reverse();
    var ats = doMes(todosAt, "data"), aps = doMes(todasAp, "quando");

    alvo.innerHTML =
      '<div class="at-topo">' +
        '<div class="secao-cabeca at-cabeca"><span class="eyebrow">Histórico clínico</span><h2>Seus <em>atendimentos</em></h2></div>' +
        '<label class="at-periodo"><span class="sr-only">Período</span><select id="at-mes" aria-label="Período">' +
          opcoes.map(function (m) { return '<option value="' + m + '"' + (m === estado.mes ? " selected" : "") + ">" + escapar(rotuloMes(m)) + "</option>"; }).join("") +
          '<option value=""' + (!estado.mes ? " selected" : "") + ">Todos os meses</option></select></label>" +
      "</div>" +
      numeros(ats, aps) +
      '<div class="at-barra"><div class="at-abas" role="tablist" aria-label="Histórico">' +
        '<button type="button" role="tab" class="at-aba' + (estado.aba === "atendimentos" ? " ativa" : "") + '" aria-selected="' + (estado.aba === "atendimentos") + '" data-at-aba="atendimentos">Histórico de atendimentos <span class="at-conta">' + ats.length + "</span></button>" +
        '<button type="button" role="tab" class="at-aba' + (estado.aba === "holoscan" ? " ativa" : "") + '" aria-selected="' + (estado.aba === "holoscan") + '" data-at-aba="holoscan">Histórico HOLOSCAN <span class="at-conta">' + aps.length + "</span></button>" +
      '</div><button type="button" class="btn-fantasma at-csv" data-at-csv="1">Exportar CSV</button></div>' +
      '<div class="at-tabela-caixa" id="atendimentos-lista">' + (estado.aba === "holoscan" ? tabelaHoloscan(aps) : tabelaAtendimentos(ats)) + "</div>";

    ligar(ats, aps);
  }

  function abrirAtendimento(pid, eid) {
    if (window.irParaSecao) window.irParaSecao("pacientes");
    if (window.abrirFichaDe) window.abrirFichaDe(pid);
    if (eid && window.AtendimentoAtual) window.AtendimentoAtual.selecionarPorId(eid);
  }
  function ligar(ats, aps) {
    var mes = document.getElementById("at-mes");
    if (mes) mes.addEventListener("change", function () { estado.mes = mes.value || ""; desenhar(); });
    alvo.querySelectorAll("[data-at-aba]").forEach(function (b) {
      b.addEventListener("click", function () { estado.aba = b.dataset.atAba; desenhar(); });
    });
    var exp = alvo.querySelector("[data-at-csv]");
    if (exp) exp.addEventListener("click", function () { csv(ats, aps); });
    /* a linha inteira abre (clique ou Enter/Espaco) */
    alvo.querySelectorAll("tr[data-atendimento], tr[data-paciente]").forEach(function (tr) {
      var ir = function () {
        if (tr.dataset.atendimento) abrirAtendimento(tr.dataset.pacienteAt, tr.dataset.atendimento);
        else { abrirAtendimento(tr.dataset.paciente, null); if (window.levarParaFicha) window.levarParaFicha("aba:holoscan", tr.dataset.paciente); }
      };
      tr.addEventListener("click", ir);
      tr.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ir(); } });
    });
    alvo.querySelectorAll("[data-secao-destino]").forEach(function (b) {
      b.addEventListener("click", function () { if (window.irParaSecao) window.irParaSecao(b.dataset.secaoDestino); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    alvo = document.getElementById("consultas-corpo");
    if (!alvo) return;

    // derivada da carteira: muda quando a carteira muda
    /* sempre em dia: atendimento novo/alterado, resultados lidos e cada vez que a pagina abre (releitura) */
    if (window.AtendimentoAtual && window.AtendimentoAtual.aoMudar) window.AtendimentoAtual.aoMudar(function () { if (visivel()) desenhar(); });
    if (window.JornadaPaciente && window.JornadaPaciente.aoCarregar) window.JornadaPaciente.aoCarregar(function () { if (visivel()) desenhar(); });
    var nav = document.querySelector('.nav-item[data-secao="consultas"]');
    if (nav) nav.addEventListener("click", function () { if (window.JornadaPaciente && window.JornadaPaciente.recarregar) window.JornadaPaciente.recarregar(); setTimeout(desenhar, 0); });
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      desenhar();
    };
    desenhar();
  });

  function visivel() { var sec = document.getElementById("secao-consultas"); return !!(sec && sec.classList.contains("ativa")); }
  window.redesenharConsultas = desenhar;
})();
