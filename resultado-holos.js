/* ===========================================================================
   RESULTADO HOLOS — visao integrada final do paciente (aba da ficha)
   ===========================================================================

   Consolida, por SELECAO EXPLICITA da nutricionista, uma aplicacao HOLOSCAN
   oficial (obrigatoria), as ferramentas concluidas de Corpo, Mente e Espirito
   e as observacoes profissionais. Nada vem marcado por padrao e nada e "o
   ultimo registro" escolhido em silencio.

   Quem monta o conteudo e o SERVIDOR (RPCs da migration 20261009100000): o
   navegador manda so ids, os textos da nutricionista e as chaves "mostrar ao
   paciente". O que esta tela desenha vem sempre do snapshot devolvido pelo
   servidor (previa) ou do snapshot gravado (resultado salvo) — nunca das
   ferramentas vivas, e o HOLOSCAN nao e recalculado aqui.

   Sem interpretacao automatica, sem diagnostico, sem prescricao, sem IA e sem
   exames nesta versao. Rascunho -> salvo (imutavel) -> revisado; correcao =
   "Nova versao a partir desta" (a anterior fica no historico).

   Preparado para o futuro (sem nada ligado agora): o snapshot e JSON
   estruturado e versionado (template_version) — pode alimentar o Relatorio e,
   depois, a HOLOS AI (sugestao -> revisao -> aprovacao da nutricionista).
   =========================================================================== */

(function () {
  "use strict";

  var escapar = window.escapar;
  var EIXOS = [["corpo", "Corpo", "fisico"], ["mente", "Mente", "mental"], ["espirito", "Espírito", "espiritual"]];
  var NOMES_EXTRA = { oq3: { titulo: "OQ³", modulo: "corpo" }, pqq: { titulo: "PQQ — Escada dos Porquês", modulo: "mente" }, mapa: { titulo: "Mapa do Propósito", modulo: "espirito" } };
  /* ordem e lista vem do catalogo (ferramentas.js): OQ3/PQQ + as ferramentas ativas, por eixo */
  function ordemFerr() {
    var ativas = window.FERRAMENTAS_ATIVAS || [], cat = window.CATALOGO_FERRAMENTAS || [];
    var mod = function (id) { var f = cat.filter(function (x) { return x.id === id; })[0]; return f ? f.modulo : (NOMES_EXTRA[id] || {}).modulo; };
    var base = ["oq3", "pqq"].concat(ativas);
    return ["corpo", "mente", "espirito"].reduce(function (acc, m) { return acc.concat(base.filter(function (id) { return mod(id) === m; })); }, []);
  }
  var ROTULO_STATUS = { rascunho: "Rascunho", salvo: "Salvo", revisado: "Revisado" };
  var MSG_HINT = {
    holoscan_obrigatorio: "Escolha a aplicação HOLOSCAN que compõe o resultado.",
    holoscan_nao_oficial: "Essa aplicação HOLOSCAN é histórica, sem o pacote metodológico oficial: ela não entra no Resultado HOLOS.",
    atendimento_obrigatorio: "Escolha o atendimento ao qual o Resultado HOLOS fica ligado.",
    referencia_cruzada: "Uma das fontes não pertence a este paciente (ou a esta conta). Nada foi salvo.",
    fonte_nao_consolidada: "Ferramenta em rascunho não entra no Resultado HOLOS: conclua a aplicação antes.",
    fonte_repetida: "Escolha só uma aplicação de cada ferramenta.",
    revisao_imutavel: "Resultado salvo não muda. Para corrigir, use “Nova versão a partir desta”.",
    conflito: "Esta versão já tem uma versão seguinte (ou o rascunho mudou em outra sessão). Recarregue a aba.",
    paciente_arquivado: window.MSG_ARQUIVADO || "Paciente arquivado: reative antes de registrar novas informações.",
    conta_inativa: "Sua conta ainda aguarda liberação.",
    payload_invalido: "Seleção inválida. Recarregue a aba e tente de novo."
  };

  var cache = { pid: null, linhas: [], erro: null, carregado: false };
  var modo = "lista";       // lista | editar | ver
  var form = null;          // rascunho em edicao
  var vendo = null;         // { id, visao: "profissional" | "paciente" }
  var previa = null;        // snapshot devolvido pelo servidor (nao gravado)
  var ocupado = false;

  /* ---------- utilitarios -------------------------------------------------- */
  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function pacienteId() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function alvo() { return document.getElementById("aba-resultado-holos"); }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function uuid() { return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null; }
  function dataBR(iso) { var d = String(iso || "").slice(0, 10); return window.dataBR ? window.dataBR(d) : d; }
  function hora(iso) {
    if (!iso || String(iso).length <= 10) return "";
    var d = new Date(iso); if (isNaN(d)) return "";
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function dataHora(iso) { var h = hora(iso); return dataBR(iso) + (h ? " · " + h : ""); }
  function curto(id) { return String(id || "").slice(0, 8); }
  function e(x) { return escapar(x === null || x === undefined ? "" : String(x)); }
  function num(v, casas) {
    if (v === null || v === undefined || v === "" || isNaN(Number(v))) return "—";
    return Number(v).toFixed(casas === undefined ? 1 : casas).replace(".", ",");
  }
  function faixaTxt(f) { return f ? (window.rotuloExibivel ? window.rotuloExibivel(f) : f) : ""; }
  function arquivado() { try { return !!(window.pacienteArquivado && window.pacienteArquivado()); } catch (x) { return false; } }
  function mensagemErro(err) {
    if (err && err.hint && MSG_HINT[err.hint]) return MSG_HINT[err.hint];
    return window.mensagemHumana ? window.mensagemHumana(err) : (err && err.message) || String(err);
  }
  function defFerr(fid) {
    var f = (window.CATALOGO_FERRAMENTAS || []).filter(function (x) { return x.id === fid; })[0];
    if (f) return f;
    return NOMES_EXTRA[fid] ? { id: fid, titulo: NOMES_EXTRA[fid].titulo, modulo: NOMES_EXTRA[fid].modulo } : { id: fid, titulo: fid, modulo: "corpo" };
  }
  function moduloDe(fid) { return defFerr(fid).modulo || "corpo"; }
  function rotuloAtendimento(eid) {
    var A = window.AtendimentoAtual, x = A && eid ? A.porId(eid) : null;
    return x ? A.rotuloQuando(x) : (eid ? "atendimento " + curto(eid) : "sem atendimento");
  }

  /* ---------- dados -------------------------------------------------------- */
  function carregar(pid) {
    pid = pid || pacienteId();
    if (!pid || !temSupa()) { cache = { pid: pid, linhas: [], erro: null, carregado: true }; return Promise.resolve(cache.linhas); }
    return Promise.resolve(window.supabaseClient.from("holos_results").select("*").eq("patient_id", pid).order("created_at", { ascending: false }))
      .then(function (r) {
        if (r && r.error) { cache = { pid: pid, linhas: [], erro: r.error, carregado: true }; return []; }
        cache = { pid: pid, linhas: (r && r.data) || [], erro: null, carregado: true };
        return cache.linhas;
      }, function (err) { cache = { pid: pid, linhas: [], erro: err, carregado: true }; return []; });
  }
  function doPaciente(pid) { return cache.pid === pid ? cache.linhas.slice() : []; }
  function porId(id) { return cache.linhas.filter(function (r) { return r.id === id; })[0] || null; }
  function rpc(nome, args) {
    return Promise.resolve(window.supabaseClient.rpc(nome, args)).then(function (r) {
      if (r && r.error) throw r.error;
      return r ? r.data : null;
    });
  }

  /* fontes elegiveis (o servidor confere de novo; aqui so se oferece o que pode entrar) */
  function aplicacoesHoloscan(pid) {
    var h = window.historicoPontuacao ? (window.historicoPontuacao(pid) || []) : [];
    var M = window.Metodologia;
    return h.filter(function (x) { return x._supa_id; }).map(function (x) {
      var oficial = M && M.naturezaAplicacao ? M.naturezaAplicacao(x) === "oficial_v1" : !!x.methodology_package_id;
      return { id: x._supa_id, quando: x.quando, criado: x._supa_criado_em || x.calculado_em || null, oficial: oficial && !!x.methodology_package_id,
        pacote: x.methodology_package_id ? (x.methodology_package_code || "HOLOS-V1") + (x.methodology_package_version ? " v" + x.methodology_package_version : "") : null,
        encounter_id: x._supa_encounter_id || null, indice: x.indice };
    }).sort(function (a, b) { return String(b.criado || b.quando).localeCompare(String(a.criado || a.quando)); });
  }
  function aplicacoesFerramentas(pid) {
    var A = window.Aplicacoes;
    var lista = A && A.doPaciente ? A.doPaciente(pid) : [];
    return lista.filter(function (a) { return a.id && ordemFerr().indexOf(a.ferramenta_id) >= 0 && (a.status === "concluida" || a.status === "revisada"); })
      .sort(function (a, b) { var o = ordemFerr(); return o.indexOf(a.ferramenta_id) - o.indexOf(b.ferramenta_id) || String(b.concluida_em || "").localeCompare(String(a.concluida_em || "")); });
  }

  /* ---------- formulario (rascunho) ---------------------------------------- */
  function novoForm(pid, base) {
    var at = window.AtendimentoAtual && window.AtendimentoAtual.idPara ? window.AtendimentoAtual.idPara(pid) : null;
    /* 12/10 (bug 10d): sem atendimento ativo na memoria (recarregou a pagina, trocou de paciente), o formulario vinha
       vazio. Agora: o atendimento ativo; senao, o da aplicacao HOLOSCAN mais recente; senao, o atendimento mais recente.
       O HOLOSCAN continua sem pre-marcacao (escolha explicita, decisao do Resultado HOLOS). A nutricionista pode trocar. */
    var hs0 = aplicacoesHoloscan(pid).filter(function (h) { return h.oficial; });
    if (!at && hs0.length && hs0[0].encounter_id) at = hs0[0].encounter_id;
    if (!at && window.AtendimentoAtual && window.AtendimentoAtual.doPaciente) {
      var ult = window.AtendimentoAtual.doPaciente(pid).slice().sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); })[0];
      if (ult) at = ult.id;
    }
    var f = { pid: pid, id: null, supersedes_id: null, encounter_id: at || "", holoscan_application_id: "", tools: [], mostrar: {}, compartilhar_pp: false,
      leitura_profissional: "", pontos_acompanhar: "", questoes_aprofundar: "", expected_updated_at: null };
    if (base) {
      var s = base.selected_sources || {};
      f.id = base.status === "rascunho" ? base.id : null;
      f.expected_updated_at = base.status === "rascunho" ? base.updated_at : null;
      f.supersedes_id = base.status === "rascunho" ? (base.supersedes_id || null) : base.id;
      f.encounter_id = base.status === "rascunho" ? base.encounter_id : (at || base.encounter_id);
      f.holoscan_application_id = s.holoscan_application_id || "";
      f.tools = (s.tool_application_ids || []).slice();
      var vis = (s.visao_paciente && s.visao_paciente.ferramentas) || {};
      Object.keys(vis).forEach(function (k) { f.mostrar[k] = !!(vis[k] && vis[k].mostrar); });
      f.compartilhar_pp = !!(s.visao_paciente && s.visao_paciente.proximos_passos === true);
      f.leitura_profissional = base.leitura_profissional || ""; f.pontos_acompanhar = base.pontos_acompanhar || ""; f.questoes_aprofundar = base.questoes_aprofundar || "";
    }
    return f;
  }
  function payloadDe(f) {
    var vis = {};
    f.tools.forEach(function (id) { vis[id] = { mostrar: !!f.mostrar[id], ocultar: [] }; });
    return { id: f.id || null, supersedes_id: f.supersedes_id || null, patient_id: f.pid, encounter_id: f.encounter_id || null,
      holoscan_application_id: f.holoscan_application_id || null, tool_application_ids: f.tools.slice(), visao_paciente: { ferramentas: vis, proximos_passos: !!f.compartilhar_pp },
      leitura_profissional: f.leitura_profissional, pontos_acompanhar: f.pontos_acompanhar, questoes_aprofundar: f.questoes_aprofundar,
      expected_updated_at: f.expected_updated_at || null };
  }
  function lerForm() {
    var a = alvo(); if (!a || !form) return;
    var enc = a.querySelector("#rh-atendimento"); if (enc) form.encounter_id = enc.value;
    var h = a.querySelector('input[name="rh-holoscan"]:checked'); form.holoscan_application_id = h ? h.value : "";
    form.tools = [].slice.call(a.querySelectorAll("[data-rh-ferr]:checked")).map(function (c) { return c.value; });
    [].slice.call(a.querySelectorAll("[data-rh-mostrar]")).forEach(function (c) { form.mostrar[c.dataset.rhMostrar] = c.checked; });
    var cpp = a.querySelector("#rh-compartilhar-pp"); if (cpp) form.compartilhar_pp = cpp.checked;
    ["leitura_profissional", "pontos_acompanhar", "questoes_aprofundar"].forEach(function (k) { var t = a.querySelector("#rh-" + k); if (t) form[k] = t.value; });
  }

  /* ---------- desenho: radar ----------------------------------------------- */
  function radarSvg(sistemas, tam) {
    tam = tam || 300;
    var n = sistemas.length, c = tam / 2, R = tam / 2 - 46;
    if (!n) return "";
    var ang = function (i) { return -Math.PI / 2 + (2 * Math.PI * i) / n; };
    var pt = function (i, v) { var r = R * v / 10; return [c + Math.cos(ang(i)) * r, c + Math.sin(ang(i)) * r]; };
    var grade = [2, 4, 6, 8, 10].map(function (v) {
      return '<polygon class="rh-radar-grade" points="' + sistemas.map(function (s, i) { return pt(i, v).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ") + '"/>';
    }).join("");
    var eixos = sistemas.map(function (s, i) { var p = pt(i, 10); return '<line class="rh-radar-eixo" x1="' + c + '" y1="' + c + '" x2="' + p[0].toFixed(1) + '" y2="' + p[1].toFixed(1) + '"/>'; }).join("");
    var comNota = sistemas.every(function (s) { return s.avaliavel && s.nota !== null && s.nota !== undefined; });
    var area = comNota ? '<polygon class="rh-radar-area" points="' + sistemas.map(function (s, i) { return pt(i, Number(s.nota)).map(function (x) { return x.toFixed(1); }).join(","); }).join(" ") + '"/>' : "";
    var pontos = sistemas.map(function (s, i) {
      if (!s.avaliavel || s.nota === null || s.nota === undefined) return "";
      var p = pt(i, Number(s.nota)); return '<circle class="rh-radar-ponto" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.5"/>';
    }).join("");
    var rot = sistemas.map(function (s, i) {
      var p = pt(i, 12.6), anc = Math.abs(p[0] - c) < 8 ? "middle" : (p[0] > c ? "start" : "end");
      return '<text class="rh-radar-rotulo" x="' + p[0].toFixed(1) + '" y="' + p[1].toFixed(1) + '" text-anchor="' + anc + '">' + e(abreviar(s.nome || s.sistema)) +
        ' <tspan class="rh-radar-nota">' + (s.avaliavel ? num(s.nota) : "—") + "</tspan></text>";
    }).join("");
    var desc = sistemas.map(function (s) { return (s.nome || s.sistema) + " " + (s.avaliavel ? num(s.nota) : "sem nota"); }).join("; ");
    /* margem lateral no viewBox: os nomes dos sistemas nas pontas nao sao cortados */
    return '<svg class="rh-radar" viewBox="-120 -6 ' + (tam + 240) + " " + (tam + 12) + '" role="img" aria-label="Radar dos cinco sistemas: ' + e(desc) + '">' + grade + eixos + area + pontos + rot + "</svg>";
  }
  function abreviar(nome) {
    return String(nome).replace(/^Sistema\s+/i, "").replace(/Mental[- ]Emocional[- ]Espiritual/i, "Mental-Emocional").replace(/Detox (e )?Linf[aá]tico/i, "Detox").replace(/[ÁA]cido[- ]Inflamat[oó]rio/i, "Ácido-Inflam.");
  }

  /* ---------- desenho: ferramentas ----------------------------------------- */
  function tem(v) { return v !== null && v !== undefined && !(typeof v === "string" && !v.trim()) && !(Array.isArray(v) && !v.length); }
  function valorTxt(v) { return Array.isArray(v) ? v.join(", ") : String(v); }
  function camposDe(f) {
    var out = [];
    (f.grupos || []).forEach(function (g) {
      var cs = g.origem === "momentum_dimensoes" && window.CorpoBancos && window.CorpoBancos.MOMENTUM
        ? window.CorpoBancos.MOMENTUM.dimensoes.map(function (d) { return { id: d.id, rotulo: d.rotulo, tipo: "nota" }; }) : (g.campos || []);
      out.push({ titulo: g.titulo, campos: cs });
    });
    if ((f.campos || []).length) out.push({ titulo: null, campos: f.campos });
    return out;
  }
  function barra(rot, v) {
    var n = Number(v), ok = !isNaN(n);
    return '<div class="rh-barra"><span class="rh-barra-rot">' + e(rot) + '</span><span class="rh-barra-trilho" aria-hidden="true"><span class="rh-barra-cheio" style="width:' +
      (ok ? Math.max(0, Math.min(100, n * 10)) : 0) + '%"></span></span><b class="rh-barra-val">' + (ok ? e(v) : "—") + "</b></div>";
  }
  function linhaCampo(rot, v) { return '<div class="rh-campo"><span>' + e(rot) + "</span><p>" + e(valorTxt(v)).replace(/\n/g, "<br>") + "</p></div>"; }
  function corpoGenerico(f, r, paciente) {
    var html = "";
    camposDe(f).forEach(function (g) {
      var barras = "", textos = "";
      g.campos.forEach(function (c) {
        var v = r[c.id];
        if (!tem(v)) return;
        if (c.tipo === "nota") barras += barra(c.rotulo, v);
        else textos += linhaCampo(c.rotulo, v);
      });
      if (barras || textos) html += (g.titulo && !paciente ? '<h6 class="rh-grupo-tit">' + e(g.titulo) + "</h6>" : "") + (barras ? '<div class="rh-barras">' + barras + "</div>" : "") + textos;
    });
    return html;
  }
  function corpoFerramenta(t, paciente) {
    var r = t.respostas || {}, f = defFerr(t.ferramenta_id), html = "";
    if (t.ferramenta_id === "oq3") {
      html = [["quer", "O que quer"], ["precisa", "O que precisa"], ["consegue", "O que consegue fazer agora"], ["alavancas", "Alavancas"]]
        .filter(function (k) { return tem(r[k[0]]); }).map(function (k) { return linhaCampo(k[1], r[k[0]]); }).join("");
    } else if (t.ferramenta_id === "pqq") {
      var degraus = ["r1", "r2", "r3", "r4", "r5"].filter(function (k) { return tem(r[k]); });
      html = (tem(r.objetivo) ? linhaCampo("Objetivo declarado", r.objetivo) : "") +
        (degraus.length ? '<ol class="rh-escada">' + degraus.map(function (k) { return "<li>" + e(r[k]) + "</li>"; }).join("") + "</ol>" : "") +
        (tem(r.verdadeiro) ? linhaCampo("Síntese construída com a paciente", r.verdadeiro) : "");
    } else {
      if (f.visualizacao && window.RegistroVisual) html += '<div class="rh-visual">' + window.RegistroVisual.desenhar(f, r) + "</div>";
      if (!f.visualizacao) html += corpoGenerico(f, r, paciente);
      else if (!paciente) html += corpoGenerico(f, r, paciente);
      if (f.lista && Array.isArray(r[f.lista.id]) && !f.visualizacao) {
        html += '<ul class="rh-lista">' + r[f.lista.id].map(function (it) { return "<li>" + f.lista.campos.filter(function (c) { return tem(it[c.id]); }).map(function (c) { return "<b>" + e(c.rotulo) + ":</b> " + e(valorTxt(it[c.id])); }).join(" · ") + "</li>"; }).join("") + "</ul>";
      }
    }
    if (!html) html = '<p class="rh-vazio">Nada preenchido nesta aplicação.</p>';
    if (!paciente && (tem(t.leitura) || tem(t.prioridade) || tem(t.proximo_passo))) {
      html += '<div class="rh-leitura-ferr"><span class="rh-tag">Leitura profissional registrada na ferramenta</span>' +
        (tem(t.leitura) ? "<p>" + e(t.leitura) + "</p>" : "") +
        (tem(t.prioridade) ? "<p><b>Prioridade:</b> " + e(t.prioridade) + "</p>" : "") +
        (tem(t.proximo_passo) ? "<p><b>Próximo passo:</b> " + e(t.proximo_passo) + "</p>" : "") + "</div>";
    }
    return html;
  }
  /* Resultado estruturado da ferramenta (decisao 2, item 180): organiza o registro, sem score nem interpretacao.
     Profissional: o fechamento + o registro completo (recolhido). Paciente: so o fechamento (sem o que e so da
     profissional; a Carta ao Futuro Eu aparece so como "realizada") e, nos registros visuais, o desenho. */
  /* 12/10 (motor de resultados, item 27): o que so reorganiza o preenchido e REGISTRO DA FERRAMENTA */
  function fechamentoHtml(t, paciente) {
    var FF = window.FerramentasFechamento, S = window.ResultadoSintese;
    if (!FF || !S) return "";
    var x = FF.de(t); x.nome = defFerr(t.ferramenta_id).titulo;
    return '<div class="rh-fech-caixa"><span class="rh-tag">Registro da ferramenta</span>' + S.htmlFechamento(x, paciente) + "</div>";
  }
  /* RESULTADO DA FERRAMENTA (motor de resultados V1, itens 16-26): 1. o que apareceu · 2. o que significa (so com texto
     aprovado) · 3. o que pode mudar no acompanhamento · 4. proximo passo possivel. Paciente: sem os itens so da
     profissional (nomes de terceiros, justificativa, notas, observacoes) e sem pendencias. */
  function htmlResultadoFerr(x, paciente) {
    if (!x) return "";
    var ap = (x.apareceu || []).filter(function (i) { return !paciente || !i.so_profissional; });
    var elos = ap.filter(function (i) { return i.elo; }), soltos = ap.filter(function (i) { return !i.elo; });
    var h = '<div class="rf-caixa" data-rf-motor="' + e(x.motor) + '"><span class="rh-tag rf-tag">Resultado da ferramenta</span>';
    if (x.por_que_usamos) h += '<div class="rf-bloco rf-porque"><span class="sf-rot">Por que usamos esta ferramenta</span><p>' + e(x.por_que_usamos) + "</p></div>";
    h += '<div class="rf-bloco"><span class="sf-rot">O que apareceu</span>' +
      (elos.length ? '<ol class="rf-cadeia">' + elos.map(function (i) { return "<li><b>" + e(i.rotulo) + "</b><p>" + e(i.valor) + "</p></li>"; }).join("") + "</ol>" : "") +
      (soltos.length ? soltos.map(function (i) { return '<div class="rh-campo"><span>' + e(i.rotulo) + "</span><p>" + e(i.valor).replace(/\n/g, "<br>") + "</p></div>"; }).join("") : "") +
      (!ap.length ? '<p class="rh-vazio">Nada registrado para mostrar aqui.</p>' : "") + "</div>";
    if (x.significa) h += '<div class="rf-bloco"><span class="sf-rot">O que isso significa nesta ferramenta</span><p>' + e(x.significa) + "</p></div>";
    if (x.muda) h += '<div class="rf-bloco"><span class="sf-rot">O que isso pode mudar no acompanhamento</span><p>' + e(x.muda) + "</p></div>";
    if (x.proximo) h += '<div class="rf-bloco"><span class="sf-rot">Próximo passo possível</span><p>' + e(x.proximo) + "</p></div>";
    if (!paciente && (x.pendencias || []).length) h += '<details class="rf-pend"><summary>Pendências metodológicas (' + x.pendencias.length + ")</summary><ul>" + x.pendencias.map(function (p) { return "<li>" + e(p) + "</li>"; }).join("") + "</ul></details>";
    return h + "</div>";
  }
  function cartaoFerramenta(t, paciente, todas) {
    var f = defFerr(t.ferramenta_id), FF = window.FerramentasFechamento;
    var res = FF && FF.resultado ? FF.resultado(t, todas || []) : null;
    if (res) res.nome = f.titulo;
    var fech = fechamentoHtml(t, paciente);
    var corpo;
    if (!res && !fech) corpo = corpoFerramenta(t, paciente);
    /* paciente: so o RESULTADO (sem formulario inteiro, sem desenho com nomes de terceiros, sem a Carta) — itens 31-33 */
    else if (paciente) corpo = res ? htmlResultadoFerr(res, true) : fech;
    else corpo = htmlResultadoFerr(res, false) +
      (tem(t.leitura) ? '<div class="rh-leitura-ferr rf-leitura"><span class="rh-tag">Leitura da nutricionista</span><p>' + e(t.leitura) + "</p></div>" : "") +
      '<details class="rh-registro"><summary>Registro da ferramenta (como foi preenchido)</summary>' + fech + corpoFerramenta(t, false) + "</details>";
    return '<article class="rh-ferr' + (f.visualizacao ? " rh-ferr-largo" : "") + '" data-rh-ferr-snap="' + e(t.ferramenta_id) + '">' +
      '<header class="rh-ferr-topo"><h5>' + e(f.titulo) + "</h5>" +
      '<span class="rh-ferr-meta">' + e(dataBR(t.concluida_em || t.iniciada_em)) + (paciente ? "" : " · " + e(t.status === "revisada" ? "revisada" : "concluída") +
        (t.mostrar_paciente ? ' · <span class="rh-selo-paciente">na visão do paciente</span>' : ' · <span class="rh-selo-privado">só na visão profissional</span>')) + "</span></header>" +
      corpo + "</article>";
  }
  function mapaProposito(snap, paciente) {
    var fs = snap.ferramentas || [], oq3 = fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0], pqq = fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0];
    if (!oq3 || !pqq) return "";
    /* OQ3 + PQQ -> Mapa do Proposito: a unica relacao ferramenta -> ferramenta homologada (opcional, item 180).
       Motor de resultados V1 (item 23): FerramentasFechamento.resultadoProposito (= proposito() aprovado); no template 4
       a versao derivada vem congelada do servidor (snapshot.derivados.mapa_proposito, com as aplicacoes fonte). */
    var FF = window.FerramentasFechamento;
    if (!FF) return "";
    if (paciente && !(oq3.mostrar_paciente && pqq.mostrar_paciente)) return "";
    var x = FF.resultadoProposito(fs, snap.derivados ? snap.derivados.mapa_proposito : null);
    if (!x) return "";
    var fontes = (x.fontes || []).map(function (f) { return (f.ferramenta_id === "oq3" ? "OQ³" : "PQQ") + (f.concluida_em ? " de " + dataBR(f.concluida_em) : ""); }).join(" + ");
    return '<article class="rh-ferr rh-ferr-mapa" data-rh-ferr-snap="mapa_proposito"><header class="rh-ferr-topo"><h5>Mapa do Propósito</h5>' +
      '<span class="rh-ferr-meta">derivado de ' + e(fontes || "OQ³ + PQQ") + " · aprofundamento opcional</span></header>" +
      htmlResultadoFerr(x, paciente) +
      (!paciente && x.derivado_agora ? '<p class="rh-nota-tec">Gerado com o motor de resultados atual a partir do registro histórico.</p>' : "") + "</article>";
  }

  /* ---------- documento (profissional | paciente) --------------------------- */
  /* texto da faixa para a PACIENTE: o que a nota quer dizer, sem instrucao tecnica nem leitura clinica */
  /* Motor de resultados V1 (12/10, item 4.1): junto do numero, onde quer que o Indice apareca */
  var AVISO_INDICE = "O Índice HOLOS organiza as respostas desta aplicação e não representa percentual de saúde.";
  /* item 4.2: na visao da paciente a faixa nao e o rotulo principal (a escala e contraintuitiva: faixa alta = menos
     marcadores). So camada de comunicacao: a faixa salva e a matematica nao mudam. */
  var FAIXA_PACIENTE = { baixa: "Mais marcadores neste eixo", intermediaria: "Alguns marcadores neste eixo", alta: "Menos marcadores neste eixo" };
  function faixaPaciente(f) { return FAIXA_PACIENTE[f] || ""; }

  function documentoHtml(snap, visao, meta) {
    meta = meta || {};
    var paciente = visao === "paciente";
    var h = snap.holoscan || {}, sis = h.sistemas || [];
    var ferr = (snap.ferramentas || []).filter(function (t) { return !paciente || t.mostrar_paciente; });
    var obs = snap.observacoes || meta.observacoes || {};
    var S = window.ResultadoSintese, SF = window.SistemasFechamento;
    var optsS = { moduloDe: moduloDe, nomeFerramenta: function (id) { return defFerr(id).titulo; }, observacoes: obs };
    var fechs = SF ? SF.deResultado(snap, function (id) { return defFerr(id).titulo; }) : null;
    var historico = !!(SF && SF.historico(snap));
    var ppPac = paciente && snap.visibilidade && snap.visibilidade.proximos_passos === true;
    var html = '<article class="rh-doc rh-doc-' + (paciente ? "paciente" : "profissional") + '" id="rh-doc" aria-label="Resultado HOLOS — ' + (paciente ? "visão do paciente" : "visão profissional") + '">';

    // identificacao (paciente: 1. SEU MAPA HOLOS)
    html += '<header class="rh-doc-cab"><span class="eyebrow">' + (paciente ? "Resultado HOLOS" : "Resultado HOLOS · visão profissional") + "</span>" +
      "<h2>" + (paciente ? "Seu Mapa HOLOS" : "Resultado HOLOS") + (snap.paciente && snap.paciente.nome ? " &middot; " + e(snap.paciente.nome) : "") + "</h2>";
    if (meta.previa) html += '<p class="rh-previa-selo" role="status">PRÉVIA — ainda não salva. Nada aqui foi registrado.</p>';
    if (paciente) {
      html += '<p class="rh-doc-sub">Avaliação de ' + e(dataBR(h.quando)) + (snap.profissional && snap.profissional.nome ? " · com " + e(snap.profissional.nome) : "") + "</p>" +
        '<p class="rh-intro">Nesta avaliação, as suas respostas ao HOLOSCAN e às ferramentas foram organizadas para mostrar por onde a conversa com a sua nutricionista pode seguir. O mapa não é um diagnóstico.</p>';
    } else {
      var r = snap.resultado || {};
      html += '<dl class="rh-ident">' +
        "<div><dt>Paciente</dt><dd>" + e(snap.paciente && snap.paciente.nome) + "</dd></div>" +
        "<div><dt>Data do resultado</dt><dd>" + (r.salvo_em ? e(dataHora(r.salvo_em)) : "prévia") + "</dd></div>" +
        "<div><dt>Nutricionista</dt><dd>" + e(snap.profissional && snap.profissional.nome || "—") + "</dd></div>" +
        "<div><dt>Atendimento</dt><dd>" + e(snap.atendimento ? dataHora(snap.atendimento.occurred_at) : "—") + "</dd></div>" +
        "<div><dt>HOLOSCAN</dt><dd>" + e(dataBR(h.quando)) + (h.registrado_em ? " · registrado " + e(dataHora(h.registrado_em)) : "") + " · " + e(curto(h.id)) + "</dd></div>" +
        "<div><dt>Ferramentas incluídas</dt><dd>" + (snap.ferramentas || []).length + "</dd></div>" +
        "<div><dt>Versão do resultado</dt><dd>" + (r.revision_number ? "nº " + e(r.revision_number) + (meta.status ? " · " + e(ROTULO_STATUS[meta.status] || meta.status) : "") : "—") + "</dd></div>" +
        "<div><dt>Pacote metodológico</dt><dd>" + e(h.pacote ? h.pacote.code + " v" + h.pacote.version : "—") + "</dd></div>" +
        "<div><dt>Motor de resultados</dt><dd>" + e(snap.motor_resultados || (SF ? SF.VERSAO + " (atual, sobre registro histórico)" : "—")) + "</dd></div>" +
        "</dl>";
    }
    if (historico) html += '<p class="rh-nota-tec sf-historico">' + e(SF.ROTULO_HISTORICO) + "</p>";
    html += "</header>";

    if (paciente) return html + documentoPaciente(snap, meta, { h: h, sis: sis, ferr: ferr, obs: obs, S: S, SF: SF, fechs: fechs, ppPac: ppPac, optsS: optsS }) + "</article>";

    /* ======================= VISAO PROFISSIONAL (item 30): conclusao primeiro, evidencia depois ======================= */
    // 1. RESUMO PARA DECISAO
    if (S && S.htmlResumoDecisao) html += S.htmlResumoDecisao(snap, optsS);

    // 2. POR QUE O SISTEMA CHEGOU A ISSO
    html += '<section class="rh-secao rh-porque" aria-labelledby="rh-t-porque"><h3 id="rh-t-porque">Por que o sistema chegou a isso</h3>' +
      '<p class="rh-nota-tec">Resultado do método (' + e(SF ? SF.VERSAO : "") + '): cálculo salvo da aplicação HOLOSCAN (' + e(h.pacote ? h.pacote.code + " v" + h.pacote.version : "") +
      ") e textos aprovados. Nada foi recalculado nesta página. Não é leitura profissional nem Conduta.</p>";
    html += '<h4 class="rh-sub" id="rh-t-geral">Visão geral HOLOSCAN</h4>' + gradeGeral(h, false);
    html += '<h4 class="rh-sub" id="rh-t-sis">Cinco sistemas</h4><div class="rh-sistemas">' + sis.map(function (s, i) { return cartaoSistema(s, fechs ? fechs[i] : null, false, false); }).join("") + "</div>" +
      (h.interpretacao_texto ? '<div class="rh-interp"><span class="rh-tag">Interpretação registrada no HOLOSCAN (escrita pela nutricionista)</span><p>' + e(h.interpretacao_texto).replace(/\n/g, "<br>") + "</p></div>" : "") +
      "</section>";

    // 3. RESULTADOS DAS FERRAMENTAS (Corpo | Mente | Espirito) + PANORAMA (item 29, sem integracao)
    html += '<section class="rh-secao rh-ferr-sec" aria-labelledby="rh-t-ferr"><h3 id="rh-t-ferr">Resultados das ferramentas</h3>';
    EIXOS.forEach(function (x) {
      var doEixo = ferr.filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
      var mapa = x[0] === "espirito" ? mapaProposito(snap, false) : "";
      html += '<div class="rh-eixo rh-eixo-' + x[0] + '"><h4 class="rh-sub" id="rh-t-' + x[0] + '">' + e(x[1]) + "</h4>" +
        (doEixo.length || mapa ? '<div class="rh-ferrs">' + mapa + doEixo.map(function (t) { return cartaoFerramenta(t, false, snap.ferramentas || []); }).join("") + "</div>"
          : '<p class="rh-vazio">Nenhuma ferramenta de ' + e(x[1]) + " selecionada para este resultado.</p>") + "</div>";
    });
    html += '<h4 class="rh-sub" id="rh-t-conj">Panorama das ferramentas aplicadas</h4>' +
      '<p class="rh-nota-tec">Os resultados lado a lado, por eixo. O sistema não integra Corpo, Mente e Espírito numa conclusão (integração automática: pendência metodológica); a leitura do conjunto é sua.</p><div class="rh-conjunta">' +
      EIXOS.map(function (x) {
        var doEixo = (snap.ferramentas || []).filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
        var tri = h.triada || {}, triOk = h.triada_com_dado || {};
        return '<div class="rh-conj-col rh-eixo-' + x[0] + '"><h5>' + e(x[1]) + ' <small>Tríade ' + (triOk[x[2]] === false || tri[x[2]] === null || tri[x[2]] === undefined ? "—" : num(tri[x[2]])) + "</small></h5>" +
          (doEixo.length ? '<ul class="rh-conj-lista">' + doEixo.map(function (t) { return panoramaFerr(t, snap.ferramentas || []); }).join("") + "</ul>" : '<p class="rh-vazio">Sem ferramentas aplicadas.</p>') + "</div>";
      }).join("") + "</div></section>";

    // 4. SINTESE HOLOS (5 blocos, item 28)
    if (S) html += S.html(snap, "profissional", optsS);

    // 5. LEITURA PROFISSIONAL (escrita pela nutricionista)
    html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-obs"><h3 id="rh-t-obs">Leitura profissional — observações da nutricionista</h3>' +
      '<p class="rh-nota-tec">Escrito pela nutricionista. Não é resultado do método nem é gerado pelo sistema.</p>' +
      [["leitura_profissional", "Leitura profissional da nutricionista"], ["pontos_acompanhar", "Pontos para acompanhar"], ["questoes_aprofundar", "Questões para aprofundar"]].map(function (k) {
        return '<div class="rh-obs-item"><h4>' + e(k[1]) + "</h4>" + (tem(obs[k[0]]) ? "<p>" + e(obs[k[0]]).replace(/\n/g, "<br>") + "</p>" : '<p class="rh-vazio">Não registrado.</p>') + "</div>";
      }).join("") + "</section>";

    // 6. CONDUTA (pagina propria, vinculo claro)
    html += '<section class="rh-secao rh-conduta-link" aria-labelledby="rh-t-cond"><h3 id="rh-t-cond">Conduta</h3>' +
      '<p>A Conduta é decisão da nutricionista e fica na página própria do atendimento' + (snap.atendimento ? " de " + e(dataHora(snap.atendimento.occurred_at)) : "") +
      '. O sistema não escreve a Conduta: este resultado a informa, não a gera.</p>' +
      '<button type="button" class="btn-borda-ouro rh-so-tela" data-rh-acao="ir-conduta">Abrir a Conduta</button></section>';

    html += '<p class="rh-futuro">Exames e Leitura Integrada — não incluídos nesta versão do Resultado HOLOS.</p>';
    html += '<footer class="rh-doc-rodape">Snapshot do Resultado HOLOS' + (meta.hash ? " · hash técnico " + e(String(meta.hash).slice(0, 16)) + "…" : "") + ". Documento organizado a partir de registros salvos; não é diagnóstico.</footer>";
    return html + "</article>";
  }

  /* ======================= VISAO DA PACIENTE (item 31): 8 blocos, carga tecnica minima ======================= */
  function documentoPaciente(snap, meta, c) {
    var html = "", blocos = meta.blocos || {};
    var investigar = c.fechs ? c.fechs.filter(function (f) { return f.resultado.prioridade; }).sort(function (a, b) { return a.resultado.posicao - b.resultado.posicao; }) : [];
    // 2. O QUE ENTENDEMOS NESTA ETAPA
    if (c.S) html += c.S.html(snap, "paciente", c.optsS);
    // 3. AREAS PARA APROFUNDAR (fechamento por sistema, item 32)
    if (investigar.length) {
      html += '<section class="rh-secao rh-areas" aria-labelledby="rh-t-areas"><h3 id="rh-t-areas">Áreas para aprofundar</h3>' +
        '<p class="rh-intro">Nesta aplicação, estas foram as primeiras áreas para aprofundar. Notas mais baixas indicam maior carga dos marcadores considerados neste eixo nesta aplicação. Isso ajuda a mostrar onde pode valer a pena aprofundar a conversa e não representa doença, gravidade ou diagnóstico.</p>' +
        '<div class="rh-sistemas rh-sistemas-areas">' + investigar.map(function (f) { return c.SF.htmlSistema(f, "paciente", { faixaPaciente: faixaPaciente, mostrarPP: c.ppPac }); }).join("") + "</div></section>";
    }
    // 4. O QUE DESCOBRIMOS COM AS FERRAMENTAS (so as compartilhadas; so o resultado, item 33)
    var mapa = mapaProposito(snap, true);
    /* os Proximos Passos compartilhados ja aparecem uma vez, em "O que entendemos nesta etapa" (um so bloco, item 34) */
    if (c.ferr.length || mapa) {
      html += '<section class="rh-secao rh-descobertas" aria-labelledby="rh-t-desc"><h3 id="rh-t-desc">O que descobrimos com as ferramentas</h3>';
      EIXOS.forEach(function (x) {
        var doEixo = c.ferr.filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
        var m = x[0] === "espirito" ? mapa : "";
        if (!doEixo.length && !m) return;
        html += '<div class="rh-eixo rh-eixo-' + x[0] + '"><h4 class="rh-sub">' + e(x[1]) + '</h4><div class="rh-ferrs">' + m + doEixo.map(function (t) { return cartaoFerramenta(t, true, snap.ferramentas || []); }).join("") + "</div></div>";
      });
      html += "</section>";
    }
    // 5. NOSSO FOCO AGORA (leitura da nutricionista + objetivo/estrategia da Conduta, quando a pagina Resultado entrega)
    var leitura = tem(c.obs.leitura_profissional) ? '<div class="rh-obs-item"><h4>O que sua nutricionista observou</h4><p>' + e(c.obs.leitura_profissional).replace(/\n/g, "<br>") + "</p></div>" : "";
    if (leitura || blocos.foco) html += '<section class="rh-secao rh-obs rh-foco" aria-labelledby="rh-t-foco"><h3 id="rh-t-foco">Nosso foco agora</h3>' + leitura + (blocos.foco || "") + "</section>";
    // 6. O QUE FICOU COMBINADO (Conduta da nutricionista)
    if (blocos.combinado) html += '<section class="rh-secao rp-conduta" aria-labelledby="rh-t-comb"><h3 id="rh-t-comb">O que ficou combinado</h3>' +
      '<p class="rh-intro">O que foi combinado com a sua nutricionista nesta etapa. Não é dieta nem prescrição automática: são passos escritos por ela para você.</p>' + blocos.combinado + "</section>";
    // 7. O QUE OBSERVAR ATE O PROXIMO ENCONTRO
    var pontos = tem(c.obs.pontos_acompanhar) ? '<div class="rh-obs-item"><h4>Pontos que serão acompanhados</h4><p>' + e(c.obs.pontos_acompanhar).replace(/\n/g, "<br>") + "</p></div>" : "";
    if (pontos || blocos.observar) html += '<section class="rh-secao rh-obs rh-observar" aria-labelledby="rh-t-pts"><h3 id="rh-t-pts">O que observar até o próximo encontro</h3>' + pontos + (blocos.observar || "") + "</section>";
    // 8. DETALHES DO MAPA (conteudo secundario)
    html += '<section class="rh-secao rh-detalhes" aria-labelledby="rh-t-det"><h3 id="rh-t-det">Detalhes do mapa</h3>' +
      '<p class="rh-intro">As suas respostas ao HOLOSCAN organizadas em cinco sistemas. Notas mais baixas indicam maior carga dos marcadores considerados neste eixo nesta aplicação. Isso ajuda a mostrar onde pode valer a pena aprofundar a conversa e não representa doença, gravidade ou diagnóstico.</p>' +
      gradeGeral(c.h, true) +
      /* rodada de UX 13/10: na paciente os cinco sistemas aparecem COMPACTOS aqui (as duas areas prioritarias ja estao completas acima) */
      '<h4 class="rh-sub">Os cinco sistemas</h4><div class="rh-sistemas rh-sistemas-compactos">' + c.sis.map(function (s, i) {
        return c.fechs && c.SF.htmlSistemaCompacto ? c.SF.htmlSistemaCompacto(c.fechs[i], { faixaPaciente: faixaPaciente }) : cartaoSistema(s, null, true, false); }).join("") + "</div></section>";
    if (!meta.semRodape) html += '<footer class="rh-doc-rodape">Este material organiza o que foi registrado na sua avaliação. Ele não é diagnóstico nem prescrição: os próximos passos são combinados com a sua nutricionista em consulta.</footer>';
    /* rodada de UX 13/10 (PDF): titulo de secao + texto de abertura ficam juntos, e titulo de subsecao fica com o que vem depois */
    return html.replace(/(<h3 id="rh-t-[^"]+">[^<]*<\/h3>)(<p class="rh-intro">[\s\S]*?<\/p>)?/g, '<div class="rh-junto">$1$2</div>')
      .replace(/(<h4 class="rh-sub">[^<]*<\/h4>)/g, '<div class="rh-junto rh-junto-sub">$1</div>');
  }

  /* radar + Indice (com o aviso) + Triade (+ cobertura so na profissional) */
  function gradeGeral(h, paciente) {
    var tri = h.triada || {}, triOk = h.triada_com_dado || {}, cob = h.cobertura || {};
    return '<div class="rh-geral-grade"><div class="rh-radar-caixa">' + radarSvg(h.sistemas || []) + "</div>" +
      '<div class="rh-numeros">' +
        '<div class="rh-num rh-num-indice"><span>Índice HOLOS</span><b>' + (h.indice === null || h.indice === undefined ? "—" : num(h.indice)) + "</b><small>de " + e(h.indice_maximo || 100) + "</small>" +
          '<small class="rh-indice-aviso">' + e(AVISO_INDICE) + "</small></div>" +
        EIXOS.map(function (x) { return '<div class="rh-num"><span>' + e(x[1]) + "</span><b>" + (triOk[x[2]] === false || tri[x[2]] === null || tri[x[2]] === undefined ? "—" : num(tri[x[2]])) + "</b><small>Tríade</small></div>"; }).join("") +
        (paciente ? "" : '<div class="rh-num rh-num-cob"><span>Cobertura</span><b>' + (typeof cob.respondidos === "number" ? e(cob.respondidos + "/" + cob.total) : "—") + "</b><small>respostas</small></div>") +
      "</div></div>";
  }
  /* cartao de um sistema: fechamento A-G (MR-V1); profissional com a mensagem do pacote e o registro completo */
  function cartaoSistema(s, f, paciente, mostrarPP) {
    var SF = window.SistemasFechamento;
    if (SF && f) {
      var art = SF.htmlSistema(f, paciente ? "paciente" : "profissional", { faixaPaciente: faixaPaciente, faixaTxt: faixaTxt, mostrarPP: mostrarPP });
      if (paciente) return art;
      return art.replace(/<\/article>$/, (s.mensagem_nutri ? '<p class="rh-sis-msg"><span class="sf-rot">Mensagem do pacote para a faixa</span>' + e(s.mensagem_nutri) + "</p>" : "") +
        (s.texto_publico ? '<p class="rh-sis-pub">' + e(s.texto_publico) + "</p>" : "") +
        '<details class="rh-sis-det"><summary>Pontuou neste sistema (' + (s.pontuou || []).length + ")</summary>" + listaRespostas(s.pontuou) + "</details>" +
        '<details class="rh-sis-det"><summary>Contexto, sem pontuar (' + (s.contexto || []).length + ")</summary>" +
          ((s.contexto || []).length ? listaRespostas(s.contexto) : '<p class="rh-vazio">Nenhuma resposta de contexto neste sistema.</p>') + "</details></article>");
    }
    return '<article class="rh-sis rh-faixa-' + e(s.faixa || "sem") + '"><header><h4>' + e(s.nome || s.sistema) + '</h4><span class="rh-sis-nota">' + (s.avaliavel ? num(s.nota) : "—") + "</span></header>" +
      '<p class="rh-sis-faixa">' + (s.avaliavel ? (paciente ? e(faixaPaciente(s.faixa)) : "faixa " + e(faixaTxt(s.faixa))) : "sem nota") + "</p></article>";
  }
  /* panorama (item 29): ferramenta + resumo do resultado + estado/contexto */
  function panoramaFerr(t, todas) {
    var S = window.ResultadoSintese, FF = window.FerramentasFechamento;
    var resumo = S && S.resumoResultado ? S.resumoResultado(t, todas, false) : "";
    var res = FF && FF.resultado ? FF.resultado(t, todas) : null;
    return '<li class="rh-conj-ferr"><b>' + e(defFerr(t.ferramenta_id).titulo) + "</b>" + (resumo ? "<p>" + e(resumo) + "</p>" : "") +
      (res && res.estado ? '<p class="rh-nota-tec">Estado escolhido pela nutricionista: ' + e(res.estado) + "</p>" : "") +
      (tem(t.leitura) ? '<p class="rh-nota-tec">Com leitura da nutricionista registrada.</p>' : "") + "</li>";
  }
  /* ======================= RELATORIO PROFISSIONAL UNIFICADO (item 35) =======================
     Uma logica so, a partir do Resultado HOLOS salvo (snapshot congelado) + a Conduta do atendimento do resultado:
     1 identificacao · 2 resumo executivo · 3 HOLOSCAN · 4 porque dos sistemas · 5 ferramentas aplicadas ·
     6 fechamento das ferramentas · 7 leitura profissional · 8 Conduta · 9 monitoramento/retorno ·
     10 proveniencia tecnica em rodape discreto. extras.conduta = { campos: {...}, acordos: [...] } ou null. */
  var CAMPOS_COND_REL = [["objective", "Objetivo desta etapa"], ["nutrition_strategy", "Estratégia"], ["actions", "Ações combinadas"],
    ["resources", "Recursos e apoios"], ["professional_guidance", "Orientações da nutricionista"]];
  function relatorioProfissionalHtml(linha, extras) {
    extras = extras || {};
    var snap = (linha && linha.content_snapshot) || {}, h = snap.holoscan || {}, sis = h.sistemas || [], ferr = snap.ferramentas || [];
    var obs = snap.observacoes || {}, S = window.ResultadoSintese, SF = window.SistemasFechamento;
    var optsS = { moduloDe: moduloDe, nomeFerramenta: function (id) { return defFerr(id).titulo; }, observacoes: obs };
    var fechs = SF ? SF.deResultado(snap, function (id) { return defFerr(id).titulo; }) : null;
    var c = extras.conduta || null, cc = (c && c.campos) || {};
    var sec = function (n, t, corpo) { return '<section class="rel-parte rh-rel-parte" data-rel-secao="' + n + '"><h3>' + n + ". " + e(t) + '</h3><div class="rel-bloco">' + corpo + "</div></section>"; };
    var html = '<div class="rh-rel-prof" data-rel-unificado="1">';
    // 1
    html += sec(1, "Identificação", '<dl class="rh-ident">' +
      "<div><dt>Paciente</dt><dd>" + e(snap.paciente && snap.paciente.nome) + "</dd></div>" +
      "<div><dt>Nutricionista</dt><dd>" + e(snap.profissional && snap.profissional.nome || "—") + "</dd></div>" +
      "<div><dt>Atendimento</dt><dd>" + e(snap.atendimento ? dataHora(snap.atendimento.occurred_at) : "—") + "</dd></div>" +
      "<div><dt>HOLOSCAN</dt><dd>" + e(dataBR(h.quando)) + "</dd></div>" +
      "<div><dt>Resultado HOLOS</dt><dd>nº " + e(linha.revision_number || 1) + " · " + e(ROTULO_STATUS[linha.status] || linha.status || "") + (linha.saved_at ? " · " + e(dataHora(linha.saved_at)) : "") + "</dd></div></dl>" +
      (SF && SF.historico(snap) ? '<p class="rh-nota-tec">' + e(SF.ROTULO_HISTORICO) + "</p>" : ""));
    // 2
    var dec = S && S.htmlResumoDecisao ? S.htmlResumoDecisao(snap, optsS).replace(/^<section[^>]*>|<\/section>$/g, "").replace(/<h3[^>]*>[\s\S]*?<\/h3>/, "") : "";
    html += sec(2, "Resumo executivo", dec || '<p class="rh-vazio">—</p>');
    // 3
    html += sec(3, "HOLOSCAN", gradeGeral(h, false) + '<ul class="rel-lista">' + sis.map(function (s) {
      return "<li><b>" + e(s.nome || s.sistema) + "</b> — " + (s.avaliavel ? "nota " + num(s.nota) + " · faixa " + e(faixaTxt(s.faixa)) : "sem nota") + "</li>"; }).join("") + "</ul>");
    // 4
    html += sec(4, "Por que os sistemas chegaram a isso", fechs ? '<div class="rh-sistemas">' + sis.map(function (s, i) { return SF.htmlSistema(fechs[i], "profissional", { faixaTxt: faixaTxt }); }).join("") + "</div>" : "");
    // 5
    html += sec(5, "Ferramentas aplicadas", (ferr.length ? '<ul class="rel-lista">' + ferr.map(function (t) {
      return "<li><b>" + e(defFerr(t.ferramenta_id).titulo) + "</b> — " + e(dataBR(t.concluida_em || t.iniciada_em)) + " · " + e(t.status === "revisada" ? "revisada" : "concluída") + "</li>"; }).join("") + "</ul>"
      : '<p class="rh-vazio">Nenhuma ferramenta neste resultado.</p>') +
      ((extras.foraDoResultado || []).length ? '<p class="rh-nota-tec">Também concluídas, fora deste Resultado HOLOS (sem fechamento aqui): ' +
        e(extras.foraDoResultado.map(function (t) { return defFerr(t.ferramenta_id).titulo + (t.concluida_em ? " (" + dataBR(t.concluida_em) + ")" : ""); }).join(", ")) + ".</p>" : ""));
    // 6
    var FF = window.FerramentasFechamento, prop = FF && FF.resultadoProposito ? FF.resultadoProposito(ferr, snap.derivados ? snap.derivados.mapa_proposito : null) : null;
    html += sec(6, "Fechamento das ferramentas", (ferr.length || prop) ? ferr.map(function (t) {
      var x = FF && FF.resultado ? FF.resultado(t, ferr) : null; if (x) x.nome = defFerr(t.ferramenta_id).titulo;
      return '<div class="rh-rel-ferr"><h4>' + e(defFerr(t.ferramenta_id).titulo) + "</h4>" + htmlResultadoFerr(x, false) + "</div>";
    }).join("") + (prop ? '<div class="rh-rel-ferr"><h4>Mapa do Propósito (derivado de OQ³ + PQQ)</h4>' + htmlResultadoFerr(prop, false) + "</div>" : "") : '<p class="rh-vazio">—</p>');
    // 7
    html += sec(7, "Leitura profissional", '<p class="rh-nota-tec">Escrito pela nutricionista; não é resultado do método.</p>' +
      [["leitura_profissional", "Leitura profissional"], ["questoes_aprofundar", "Questões para aprofundar"]].map(function (k) {
        return '<h5 class="rel-sub">' + e(k[1]) + "</h5>" + (tem(obs[k[0]]) ? "<p>" + e(obs[k[0]]).replace(/\n/g, "<br>") + "</p>" : '<p class="rh-vazio">Não registrado.</p>'); }).join("") +
      (h.interpretacao_texto ? '<p class="rh-nota-tec">A interpretação do HOLOSCAN (só para a nutricionista) está no campo editável abaixo.</p>' : "") +
      ferr.filter(function (t) { return tem(t.leitura); }).map(function (t) { return '<h5 class="rel-sub">Leitura da nutricionista — ' + e(defFerr(t.ferramenta_id).titulo) + "</h5><p>" + e(t.leitura) + "</p>"; }).join(""));
    // 8
    var campos = CAMPOS_COND_REL.filter(function (f) { return tem(cc[f[0]]); });
    var acordos = (c && c.acordos || []).filter(function (a) { return tem(a.description); });
    html += sec(8, "Conduta", c ? '<p class="rh-nota-tec">Decisão da nutricionista, do atendimento deste resultado. Não foi gerada pelo sistema.</p>' +
      campos.map(function (f) { return '<h5 class="rel-sub">' + e(f[1]) + "</h5><p>" + e(cc[f[0]]).replace(/\n/g, "<br>") + "</p>"; }).join("") +
      (acordos.length ? '<h5 class="rel-sub">Acordos</h5><ul class="rel-lista">' + acordos.map(function (a) { return "<li>" + e(a.description) + (tem(a.due_text) ? " (" + e(a.due_text) + ")" : "") + "</li>"; }).join("") + "</ul>" : "")
      : '<p class="rh-vazio">Nenhuma Conduta consolidada no atendimento deste resultado.</p>');
    // 9
    var mon = [["monitoring", "Monitoramento"], ["return_plan", "Retorno"]].filter(function (f) { return tem(cc[f[0]]); });
    html += sec(9, "Monitoramento e retorno", (mon.length || tem(obs.pontos_acompanhar)) ?
      mon.map(function (f) { return '<h5 class="rel-sub">' + e(f[1]) + "</h5><p>" + e(cc[f[0]]).replace(/\n/g, "<br>") + "</p>"; }).join("") +
      (tem(obs.pontos_acompanhar) ? '<h5 class="rel-sub">Pontos para acompanhar</h5><p>' + e(obs.pontos_acompanhar).replace(/\n/g, "<br>") + "</p>" : "")
      : '<p class="rh-vazio">Não registrado.</p>');
    // 10
    html += '<footer class="rh-rel-proveniencia" data-rel-secao="10">10. Proveniência técnica: pacote ' + e(h.pacote ? h.pacote.code + " v" + h.pacote.version : "—") +
      " · motor de resultados " + e(snap.motor_resultados || (SF ? SF.VERSAO + " (atual)" : "—")) + " · template " + e(snap.template_version || 1) +
      " · Resultado HOLOS " + e(curto(linha.id)) + (linha.content_hash ? " · hash " + e(String(linha.content_hash).slice(0, 12)) + "…" : "") +
      " · Próximos Passos " + e(snap.proximos_passos && snap.proximos_passos.catalogo ? snap.proximos_passos.catalogo.code + " v" + snap.proximos_passos.catalogo.version : "—") + ".</footer>";
    return html + "</div>";
  }
  function listaRespostas(lista) {
    if (!(lista || []).length) return '<p class="rh-vazio">Nenhuma.</p>';
    return '<ul class="rh-respostas">' + lista.map(function (q) {
      return "<li><span>" + e(q.enunciado) + '</span><b class="rh-resp">' + e(q.resposta !== null && q.resposta !== undefined ? q.resposta : q.valor) + "</b></li>";
    }).join("") + "</ul>";
  }

  /* ---------- telas ---------------------------------------------------------- */
  function cabecalho() {
    return '<div class="rh-topo"><div><span class="eyebrow">Integração</span><h3 class="rh-titulo">Resultado HOLOS</h3>' +
      '<p class="dash-sub">A visão integrada final: o HOLOSCAN oficial, as ferramentas de Corpo, Mente e Espírito e a sua leitura profissional — escolhidos um a um. Sem interpretação automática.</p></div></div>';
  }
  function htmlLista(pid) {
    var linhas = doPaciente(pid);
    var arq = arquivado();
    var html = cabecalho() + '<div class="rh-acoes-topo">' +
      '<button type="button" class="btn-verde" data-rh-acao="novo"' + (arq || !temSupa() ? " disabled" : "") + ">Gerar Resultado HOLOS</button>" +
      (arq ? '<span class="dash-sub">' + e(MSG_HINT.paciente_arquivado) + "</span>" : "") + "</div>";
    if (!temSupa()) return html + '<p class="dash-vazio">O Resultado HOLOS fica no servidor: entre com a sua conta para gerar e consultar.</p>';
    if (cache.erro) return html + '<p class="q-erro">Não foi possível carregar os Resultados HOLOS: ' + e(mensagemErro(cache.erro)) + "</p>";
    html += '<section class="rh-historico" aria-labelledby="rh-t-hist"><h4 id="rh-t-hist" class="dash-titulo">Histórico de Resultados HOLOS</h4>';
    if (!linhas.length) return html + '<p class="dash-vazio">Nenhum Resultado HOLOS ainda. Ele é gerado depois do HOLOSCAN e das ferramentas, antes da Conduta e do Relatório.</p></section>';
    html += '<ul class="rh-hist-lista">' + linhas.map(function (r) {
      var s = r.content_snapshot || {}, sel = r.selected_sources || {};
      var nF = r.status === "rascunho" ? (sel.tool_application_ids || []).length : (s.ferramentas || []).length;
      var hq = s.holoscan ? dataBR(s.holoscan.quando) : (sel.holoscan_application_id ? "aplicação " + curto(sel.holoscan_application_id) : "—");
      return '<li class="rh-hist-item rh-st-' + e(r.status) + '" data-rh-id="' + e(r.id) + '">' +
        '<div class="rh-hist-info"><b>' + (r.status === "rascunho" ? "Rascunho" : e(dataHora(r.saved_at))) + "</b>" +
        '<span class="rh-hist-meta">versão nº ' + e(r.revision_number) + " · " + e(ROTULO_STATUS[r.status] || r.status) + (r.superseded_at ? " · substituída por versão mais nova" : "") +
        " · atendimento " + e(rotuloAtendimento(r.encounter_id)) + " · HOLOSCAN " + e(hq) + " · " + nF + (nF === 1 ? " ferramenta" : " ferramentas") + "</span></div>" +
        '<div class="rh-hist-botoes">' + (r.status === "rascunho"
          ? '<button type="button" class="btn-borda-ouro" data-rh-acao="continuar" data-rh-id="' + e(r.id) + '"' + (arq ? " disabled" : "") + '>Continuar rascunho</button>' +
            '<button type="button" class="btn-fantasma" data-rh-acao="descartar" data-rh-id="' + e(r.id) + '"' + (arq ? " disabled" : "") + ">Descartar</button>"
          : '<button type="button" class="btn-borda-ouro" data-rh-acao="ver" data-rh-visao="profissional" data-rh-id="' + e(r.id) + '">Visão profissional</button>' +
            '<button type="button" class="btn-fantasma" data-rh-acao="ver" data-rh-visao="paciente" data-rh-id="' + e(r.id) + '">Visão do paciente</button>') +
        "</div></li>";
    }).join("") + "</ul></section>";
    return html;
  }

  function htmlEditar(pid) {
    var f = form, A = window.AtendimentoAtual;
    var encs = A ? A.doPaciente(pid).slice().sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); }) : [];
    var hs = aplicacoesHoloscan(pid), fs = aplicacoesFerramentas(pid);
    var html = cabecalho() + '<form class="rh-form" id="rh-form" novalidate>' +
      (f.supersedes_id ? '<p class="rh-aviso">Nova versão a partir do resultado nº ' + e((porId(f.supersedes_id) || {}).revision_number || "") + ". A versão anterior continua no histórico, sem mudança.</p>" : "") +
      (f.id ? '<p class="rh-aviso">Rascunho salvo. Enquanto for rascunho, seleção, visibilidade e observações podem mudar.</p>' : "");

    // atendimento
    html += '<fieldset class="rh-grupo"><legend>Atendimento</legend><label class="evo-campo"><span>Atendimento ao qual o resultado fica ligado</span><select id="rh-atendimento" required>' +
      '<option value="">— escolher o atendimento —</option>' + encs.map(function (x) {
        return '<option value="' + e(x.id) + '"' + (x.id === f.encounter_id ? " selected" : "") + ">" + e(A.rotuloQuando(x)) + (A.idPara && A.idPara(pid) === x.id ? " · atendimento ativo" : "") + "</option>";
      }).join("") + "</select></label>" + (encs.length ? "" : '<p class="q-erro">Este paciente ainda não tem atendimento: inicie um atendimento antes.</p>') + "</fieldset>";

    // HOLOSCAN
    html += '<fieldset class="rh-grupo"><legend>HOLOSCAN <small>(obrigatório — escolha uma aplicação)</small></legend>' + (hs.length ? '<div class="rh-opcoes">' + hs.map(function (h) {
      return '<label class="rh-opcao' + (h.oficial ? "" : " rh-opcao-off") + '"><input type="radio" name="rh-holoscan" value="' + e(h.id) + '"' + (h.id === f.holoscan_application_id ? " checked" : "") + (h.oficial ? "" : " disabled") + ">" +
        '<span class="rh-opcao-txt"><b>Aplicação ' + e(dataBR(h.quando)) + (h.criado ? " · " + e(hora(h.criado)) : "") + "</b>" +
        "<small>" + (h.oficial ? e(h.pacote) : "histórica, sem pacote oficial — não pode entrar") + " · cód. " + e(curto(h.id)) + " · " + e(rotuloAtendimento(h.encounter_id)) + "</small></span></label>";
    }).join("") + "</div>" : '<p class="q-erro">Nenhuma aplicação HOLOSCAN salva no servidor para este paciente. Aplique e salve o HOLOSCAN antes.</p>') + "</fieldset>";

    // ferramentas por eixo
    EIXOS.forEach(function (x) {
      var doEixo = fs.filter(function (a) { return moduloDe(a.ferramenta_id) === x[0]; });
      html += '<fieldset class="rh-grupo"><legend>' + e(x[1]) + " <small>(opcional)</small></legend>" + (doEixo.length ? '<div class="rh-opcoes">' + doEixo.map(function (a) {
        var marc = f.tools.indexOf(a.id) >= 0;
        return '<div class="rh-opcao rh-opcao-ferr"><label class="rh-opcao-sel"><input type="checkbox" data-rh-ferr="' + e(a.ferramenta_id) + '" value="' + e(a.id) + '"' + (marc ? " checked" : "") + ">" +
          '<span class="rh-opcao-txt"><b>' + e(defFerr(a.ferramenta_id).titulo) + " · " + e(dataBR(a.concluida_em || a.iniciada_em)) + (hora(a.concluida_em) ? " · " + e(hora(a.concluida_em)) : "") + "</b>" +
          "<small>" + e(a.status === "revisada" ? "revisada" : "concluída") + " · cód. " + e(curto(a.id)) + " · " + e(rotuloAtendimento(a.encounter_id)) + "</small></span></label>" +
          '<label class="rh-mostrar"><input type="checkbox" data-rh-mostrar="' + e(a.id) + '"' + (f.mostrar[a.id] ? " checked" : "") + (marc ? "" : " disabled") + "> Mostrar ao paciente</label></div>";
      }).join("") + "</div>" : '<p class="dash-vazio">Nenhuma ferramenta de ' + e(x[1]) + " concluída.</p>") + "</fieldset>";
    });

    // compartilhamento dos Proximos Passos (Modelo B): desligado por padrao
    html += '<fieldset class="rh-grupo"><legend>Visão da paciente</legend><label class="rh-mostrar rh-compartilhar"><input type="checkbox" id="rh-compartilhar-pp"' + (f.compartilhar_pp ? " checked" : "") + "> " +
      "Compartilhar Próximos Passos HOLOS com a paciente</label>" +
      '<p class="dash-sub">Desligado: os Próximos Passos ficam só na visão profissional. Ligado: aparecem para a paciente com linguagem simples (só os nomes das ferramentas). Cada ferramenta continua com o seu "Mostrar ao paciente".</p></fieldset>';

    // observacoes
    html += '<fieldset class="rh-grupo"><legend>Observações da nutricionista</legend>' +
      [["leitura_profissional", "Leitura profissional da nutricionista", 5], ["pontos_acompanhar", "Pontos para acompanhar", 3], ["questoes_aprofundar", "Questões para aprofundar (só na visão profissional)", 3]].map(function (k) {
        return '<label class="rh-texto"><span>' + e(k[1]) + '</span><textarea id="rh-' + k[0] + '" rows="' + k[2] + '" maxlength="' + (k[0] === "leitura_profissional" ? 20000 : 10000) + '">' + e(f[k[0]]) + "</textarea></label>";
      }).join("") + '<p class="dash-sub">"Leitura profissional" e "Pontos para acompanhar" aparecem na visão do paciente. Depois de salvo, nada disso muda.</p></fieldset>';

    html += '<div class="rh-form-acoes"><span class="rh-contagem" id="rh-contagem" aria-live="polite"></span>' +
      '<button type="button" class="btn-fantasma" data-rh-acao="cancelar">Cancelar</button>' +
      '<button type="button" class="btn-borda-ouro" data-rh-acao="previa">Pré-visualizar</button>' +
      '<button type="button" class="btn-borda-ouro" data-rh-acao="rascunho">Salvar rascunho</button>' +
      '<button type="button" class="btn-verde" data-rh-acao="salvar">Salvar Resultado HOLOS</button></div>' +
      '<p class="rh-erro q-erro" id="rh-erro" role="alert"></p></form>' +
      '<div id="rh-previa">' + (previa ? '<div class="rh-visao-troca">' + trocaVisao(vendo ? vendo.visao : "profissional") + "</div>" + documentoHtml(previa, vendo ? vendo.visao : "profissional", { previa: true }) : "") + "</div>";
    return html;
  }
  function trocaVisao(atual) {
    return '<div class="rel-registro" role="group" aria-label="Visão"><button type="button" class="rel-btn' + (atual === "profissional" ? " ativo" : "") + '" data-rh-visao-troca="profissional" aria-pressed="' + (atual === "profissional") + '">Visão profissional</button>' +
      '<button type="button" class="rel-btn' + (atual === "paciente" ? " ativo" : "") + '" data-rh-visao-troca="paciente" aria-pressed="' + (atual === "paciente") + '">Visão do paciente</button></div>';
  }
  function htmlVer() {
    var r = porId(vendo.id);
    if (!r || !r.content_snapshot) { modo = "lista"; return htmlLista(pacienteId()); }
    var proximo = cache.linhas.filter(function (x) { return x.supersedes_id === r.id; })[0];
    var arq = arquivado();
    return '<div class="rh-ver-topo"><button type="button" class="btn-voltar" data-rh-acao="voltar">&larr; Histórico</button>' + trocaVisao(vendo.visao) +
      '<div class="rh-ver-botoes"><button type="button" class="btn-verde" data-rh-acao="imprimir">Imprimir ou salvar em PDF</button>' +
      (r.status === "salvo" && !arq ? '<button type="button" class="btn-borda-ouro" data-rh-acao="revisar">Marcar como revisado</button>' : "") +
      (!proximo && !r.superseded_at && !arq ? '<button type="button" class="btn-borda-ouro" data-rh-acao="nova-versao">Nova versão a partir desta</button>' : "") + "</div></div>" +
      (r.superseded_at ? '<p class="rh-aviso">Esta versão foi substituída por uma versão mais nova. Ela continua aqui, como foi salva.</p>' : "") +
      (r.status === "revisado" ? '<p class="rh-aviso rh-aviso-ok">Revisado em ' + e(dataHora(r.reviewed_at)) + ".</p>" : "") +
      documentoHtml(r.content_snapshot, vendo.visao, { status: r.status, hash: r.content_hash });
  }

  function desenhar() {
    var a = alvo(); if (!a) return;
    var pid = pacienteId();
    if (!pid) { a.innerHTML = '<p class="dash-vazio">Escolha um paciente.</p>'; return; }
    if (cache.pid !== pid || !cache.carregado) {
      if (cache.pid !== pid) { modo = "lista"; form = null; vendo = null; previa = null; }
      a.innerHTML = cabecalho() + '<p class="dash-vazio">Carregando…</p>';
      carregar(pid).then(function () { if (pacienteId() === pid) pintar(); });
      return;
    }
    pintar();
  }
  function pintar() {
    var a = alvo(); if (!a) return;
    var pid = pacienteId();
    a.innerHTML = modo === "editar" && form ? htmlEditar(pid) : modo === "ver" && vendo ? htmlVer() : htmlLista(pid);
    if (modo === "editar") atualizarContagem();
  }
  function atualizarContagem() {
    var a = alvo(), c = a && a.querySelector("#rh-contagem"); if (!c) return;
    lerForm();
    c.textContent = (form.holoscan_application_id ? "HOLOSCAN escolhido" : "HOLOSCAN não escolhido") + " · " + form.tools.length + (form.tools.length === 1 ? " ferramenta" : " ferramentas") +
      " · " + form.tools.filter(function (id) { return form.mostrar[id]; }).length + " na visão do paciente" +
      " · Próximos Passos " + (form.compartilhar_pp ? "compartilhados" : "não compartilhados");
  }
  function mostrarErro(m) { var el = alvo() && alvo().querySelector("#rh-erro"); if (el) el.textContent = m || ""; if (m) toast(m); }
  function validarLocal() {
    lerForm();
    if (!form.encounter_id) return MSG_HINT.atendimento_obrigatorio;
    if (!form.holoscan_application_id) return MSG_HINT.holoscan_obrigatorio;
    return null;
  }

  function acao(nome, btn) {
    var pid = pacienteId();
    if (ocupado) return;
    if (nome === "novo") { form = novoForm(pid, null); previa = null; vendo = null; modo = "editar"; return pintar(); }
    if (nome === "continuar") { form = novoForm(pid, porId(btn.dataset.rhId)); previa = null; vendo = null; modo = "editar"; return pintar(); }
    if (nome === "cancelar" || nome === "voltar") { form = null; previa = null; vendo = null; modo = "lista"; return pintar(); }
    if (nome === "ver") { vendo = { id: btn.dataset.rhId, visao: btn.dataset.rhVisao || "profissional" }; modo = "ver"; return pintar(); }
    if (nome === "nova-versao") { form = novoForm(pid, porId(vendo.id)); previa = null; vendo = null; modo = "editar"; return pintar(); }
    if (nome === "imprimir") return imprimir();
    if (nome === "ir-conduta") { var ab = document.querySelector('[data-aba="conduta"]'); if (ab) ab.click(); return; }
    var travar = function (p) {
      ocupado = true; if (btn && window.travarBotao) window.travarBotao(btn, "Aguarde…");
      return p.finally(function () { ocupado = false; if (btn && window.destravarBotao) window.destravarBotao(btn); });
    };
    if (nome === "descartar") {
      return confirmar("Descartar rascunho", "<p>O rascunho deste Resultado HOLOS sai do histórico. Resultados salvos não são afetados.</p>", "Descartar").then(function (ok) {
        if (!ok) return;
        return travar(rpc("descartar_rascunho_resultado_holos", { p_id: btn.dataset.rhId }).then(function () { toast("Rascunho descartado."); return carregar(pid); }).then(pintar, function (err) { toast(mensagemErro(err)); }));
      });
    }
    if (nome === "revisar") {
      return travar(rpc("revisar_resultado_holos", { p_id: vendo.id }).then(function () { toast("Resultado HOLOS marcado como revisado."); return carregar(pid); }).then(pintar, function (err) { toast(mensagemErro(err)); }));
    }
    var problema = validarLocal();
    if (problema) return mostrarErro(problema);
    mostrarErro("");
    if (nome === "previa") {
      return travar(rpc("previa_resultado_holos", { payload: payloadDe(form) }).then(function (snap) {
        previa = Object.assign({}, snap, { observacoes: { leitura_profissional: form.leitura_profissional, pontos_acompanhar: form.pontos_acompanhar, questoes_aprofundar: form.questoes_aprofundar } });
        if (!vendo) vendo = { id: null, visao: "profissional" };
        pintar();
        var pv = alvo().querySelector("#rh-previa"); if (pv && pv.scrollIntoView) pv.scrollIntoView({ block: "start" });
      }, function (err) { mostrarErro(mensagemErro(err)); }));
    }
    if (nome === "rascunho") {
      return travar(rpc("salvar_rascunho_resultado_holos", { payload: Object.assign(payloadDe(form), { operation_id: form.id ? null : uuid() }) }).then(function (id) {
        return carregar(pid).then(function () { var r = porId(id); form = novoForm(pid, r); pintar(); toast("Rascunho salvo no servidor."); });
      }, function (err) { mostrarErro(mensagemErro(err)); }));
    }
    if (nome === "salvar") {
      return confirmar("Salvar Resultado HOLOS", "<p>Depois de salvo, as fontes, a visibilidade para o paciente e as observações <b>não mudam</b>. Para corrigir, cria-se uma nova versão — esta continua no histórico.</p>", "Salvar").then(function (ok) {
        if (!ok) return;
        return travar(rpc("salvar_resultado_holos", { payload: Object.assign(payloadDe(form), { operation_id: uuid() }) }).then(function (id) {
          return carregar(pid).then(function () { form = null; previa = null; vendo = { id: id, visao: "profissional" }; modo = "ver"; pintar(); toast("Resultado HOLOS salvo."); });
        }, function (err) { mostrarErro(mensagemErro(err)); }));
      });
    }
  }

  function confirmar(titulo, corpo, botao) {
    if (window.abrirModalConfirmar) return Promise.resolve(window.abrirModalConfirmar({ titulo: titulo, corpo: corpo, botaoConfirmar: botao })).then(function (r) { return r === "confirmar"; });
    return Promise.resolve(window.confirm(titulo + "?"));
  }

  /* impressao: so o documento aberto (visao escolhida), sem o resto do app */
  function imprimir() {
    var doc = document.getElementById("rh-doc"); if (!doc) return;
    document.body.classList.add("rh-imprimindo");
    /* no papel, os detalhes (respostas que pontuaram / contexto) saem abertos */
    var fechados = [].slice.call(doc.querySelectorAll("details:not([open])"));
    fechados.forEach(function (d) { d.open = true; });
    var limpar = function () { document.body.classList.remove("rh-imprimindo"); fechados.forEach(function (d) { d.open = false; }); fechados = []; window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    window.print();
    setTimeout(limpar, 1500);
  }

  /* ---------- eventos ---------------------------------------------------------- */
  document.addEventListener("click", function (ev) {
    var a = alvo(); if (!a || !a.contains(ev.target)) return;
    var b = ev.target.closest("[data-rh-acao]");
    if (b) { ev.preventDefault(); acao(b.dataset.rhAcao, b); return; }
    var v = ev.target.closest("[data-rh-visao-troca]");
    if (v) {
      if (modo === "editar") lerForm();
      vendo = Object.assign({}, vendo || { id: null }, { visao: v.dataset.rhVisaoTroca });
      pintar();
    }
  });
  document.addEventListener("change", function (ev) {
    var a = alvo(); if (!a || !a.contains(ev.target) || modo !== "editar") return;
    var t = ev.target;
    if (t.matches("[data-rh-ferr]")) {
      // uma aplicacao por ferramenta: marcar outra da MESMA ferramenta desmarca a anterior (escolha explicita, visivel)
      if (t.checked) [].slice.call(a.querySelectorAll('[data-rh-ferr="' + t.dataset.rhFerr + '"]')).forEach(function (o) { if (o !== t && o.checked) { o.checked = false; var m = a.querySelector('[data-rh-mostrar="' + o.value + '"]'); if (m) { m.checked = false; m.disabled = true; } } });
      var mostrar = a.querySelector('[data-rh-mostrar="' + t.value + '"]');
      if (mostrar) { mostrar.disabled = !t.checked; if (!t.checked) mostrar.checked = false; }
    }
    if (form) { previa = null; var pv = a.querySelector("#rh-previa"); if (pv && t.closest("#rh-form")) pv.innerHTML = ""; }
    atualizarContagem();
  });
  document.addEventListener("DOMContentLoaded", function () {
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { cache = { pid: null, linhas: [], erro: null, carregado: false }; modo = "lista"; form = null; vendo = null; previa = null; });
  });

  window.ResultadoHolos = {
    desenhar: desenhar, carregar: carregar, doPaciente: doPaciente, porId: porId,
    documentoHtml: documentoHtml, radarSvg: radarSvg, AVISO_INDICE: AVISO_INDICE, FAIXA_PACIENTE: FAIXA_PACIENTE, relatorioProfissionalHtml: relatorioProfissionalHtml,
    /** para o Relatorio e, no futuro, a HOLOS AI: o snapshot salvo, estruturado (nunca a ficha viva) */
    snapshotSalvo: function (id) { var r = porId(id); return r && r.status !== "rascunho" ? JSON.parse(JSON.stringify(r.content_snapshot)) : null; },
    esquecer: function () { cache = { pid: null, linhas: [], erro: null, carregado: false }; modo = "lista"; form = null; vendo = null; previa = null; }
  };
})();
