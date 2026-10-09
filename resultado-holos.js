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
  var NOMES_EXTRA = { oq3: { titulo: "OQ³", modulo: "corpo" }, pqq: { titulo: "PQQ — Escada dos Porquês", modulo: "mente" } };
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
        pacote: x.methodology_package_id ? (x.methodology_package_code || "HOLOS-V1") + (x.methodology_package_version ? "@" + x.methodology_package_version : "") : null,
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
    return '<svg class="rh-radar" viewBox="-95 -6 ' + (tam + 190) + " " + (tam + 12) + '" role="img" aria-label="Radar dos cinco sistemas: ' + e(desc) + '">' + grade + eixos + area + pontos + rot + "</svg>";
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
        (tem(r.verdadeiro) ? linhaCampo("O verdadeiro motivo, nas palavras registradas", r.verdadeiro) : "");
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
  function fechamentoHtml(t, paciente) {
    var FF = window.FerramentasFechamento, S = window.ResultadoSintese;
    if (!FF || !S) return "";
    var x = FF.de(t); x.nome = defFerr(t.ferramenta_id).titulo;
    return '<div class="rh-fech-caixa"><span class="rh-tag">Resultado estruturado</span>' + S.htmlFechamento(x, paciente) + "</div>";
  }
  function cartaoFerramenta(t, paciente) {
    var f = defFerr(t.ferramenta_id);
    var fech = fechamentoHtml(t, paciente);
    var corpo;
    if (!fech) corpo = corpoFerramenta(t, paciente);
    else if (paciente) corpo = fech + (t.ferramenta_id !== "carta_futuro" && f.visualizacao && window.RegistroVisual ? '<div class="rh-visual">' + window.RegistroVisual.desenhar(f, t.respostas || {}) + "</div>" : "");
    else corpo = fech + '<details class="rh-registro"><summary>Registro completo da aplicação</summary>' + corpoFerramenta(t, false) + "</details>";
    return '<article class="rh-ferr' + (f.visualizacao ? " rh-ferr-largo" : "") + '" data-rh-ferr-snap="' + e(t.ferramenta_id) + '">' +
      '<header class="rh-ferr-topo"><h5>' + e(f.titulo) + "</h5>" +
      '<span class="rh-ferr-meta">' + e(dataBR(t.concluida_em || t.iniciada_em)) + (paciente ? "" : " · " + e(t.status === "revisada" ? "revisada" : "concluída") +
        (t.mostrar_paciente ? ' · <span class="rh-selo-paciente">na visão do paciente</span>' : ' · <span class="rh-selo-privado">só na visão profissional</span>')) + "</span></header>" +
      corpo + "</article>";
  }
  function mapaProposito(snap, paciente) {
    var fs = snap.ferramentas || [], oq3 = fs.filter(function (t) { return t.ferramenta_id === "oq3"; })[0], pqq = fs.filter(function (t) { return t.ferramenta_id === "pqq"; })[0];
    if (!oq3 || !pqq) return "";
    /* OQ3 + PQQ -> Mapa do Proposito: a unica relacao ferramenta -> ferramenta homologada (opcional, item 180) */
    if (window.FerramentasFechamento && !window.FerramentasFechamento.propositoDisponivel(fs)) return "";
    if (paciente && !(oq3.mostrar_paciente && pqq.mostrar_paciente)) return "";
    var a = oq3.respostas || {}, b = pqq.respostas || {};
    return '<article class="rh-ferr rh-ferr-mapa" data-rh-ferr-snap="mapa_proposito"><header class="rh-ferr-topo"><h5>Mapa do Propósito</h5>' +
      '<span class="rh-ferr-meta">montado a partir do OQ³ e do PQQ selecionados · aprofundamento opcional</span></header>' +
      '<div class="rh-mapa-grade">' +
      [["Quer", a.quer], ["Precisa", a.precisa], ["Consegue", a.consegue], ["Objetivo", b.objetivo], ["Propósito registrado", b.verdadeiro]]
        .map(function (k) { return '<div class="rh-mapa-item"><span>' + e(k[0]) + "</span><p>" + (tem(k[1]) ? e(k[1]) : "—") + "</p></div>"; }).join("") +
      "</div></article>";
  }

  /* ---------- desenho: resumo de cada eixo (visao conjunta, sem conclusao) -- */
  function resumoFerr(t) {
    var r = t.respostas || {}, f = defFerr(t.ferramenta_id), linhas = [];
    var add = function (rot, v) { if (tem(v)) linhas.push("<li><b>" + e(rot) + ":</b> " + e(String(valorTxt(v)).slice(0, 140)) + "</li>"); };
    var visual = f.visualizacao;   // registros clinicos: timeline (rotina), fluxo (gatilhos), rede (conexao)
    if (visual === "timeline") { add("Acorda", r.acorda); add("Dorme", r.dorme); if (Array.isArray(r.eventos)) add("Eventos do dia", r.eventos.length + " registrado(s)"); add("Espaços para mudança", r.espacos); }
    else if (visual === "fluxo") { add("Gatilho", r.gatilho); add("Resposta", r.resposta); add("Necessidade", r.necessidade); }
    else if (visual === "rede") { if (Array.isArray(r.vinculos)) add("Vínculos registrados", r.vinculos.length); add("Com quem pode contar", r.contar); }
    else switch (t.ferramenta_id) {
      case "oq3": add("Quer", r.quer); add("Precisa", r.precisa); add("Consegue", r.consegue); break;
      case "linha_momentum": add("Estado registrado", r.estado_confirmado); add("O que sustenta", r.sustenta); add("O que limita", r.limita); break;
      case "pqq": add("Objetivo", r.objetivo); add("Verdadeiro motivo", r.verdadeiro); break;
      case "mapa_crencas": add("Crenças", r.crencas); add("Alternativa", r.alternativa); break;
      case "roda_vida": add("Área que puxa para baixo (registrada)", r.puxa); break;
      case "carta_futuro": add("Para quando", r.para_quando); break;
    }
    return '<li class="rh-conj-ferr"><b>' + e(f.titulo) + "</b>" + (linhas.length ? "<ul>" + linhas.join("") + "</ul>" : "") + "</li>";
  }

  /* ---------- documento (profissional | paciente) --------------------------- */
  function documentoHtml(snap, visao, meta) {
    meta = meta || {};
    var paciente = visao === "paciente";
    var h = snap.holoscan || {}, sis = h.sistemas || [], tri = h.triada || {}, triOk = h.triada_com_dado || {};
    var ferr = (snap.ferramentas || []).filter(function (t) { return !paciente || t.mostrar_paciente; });
    var obs = snap.observacoes || meta.observacoes || {};
    var html = '<article class="rh-doc rh-doc-' + (paciente ? "paciente" : "profissional") + '" id="rh-doc" aria-label="Resultado HOLOS — ' + (paciente ? "visão do paciente" : "visão profissional") + '">';

    // 1. identificacao
    html += '<header class="rh-doc-cab"><span class="eyebrow">' + (paciente ? "Resultado HOLOS" : "Resultado HOLOS · visão profissional") + "</span>" +
      "<h2>" + (paciente ? "Seu Mapa HOLOS" : "Resultado HOLOS") + (snap.paciente && snap.paciente.nome ? " &middot; " + e(snap.paciente.nome) : "") + "</h2>";
    if (meta.previa) html += '<p class="rh-previa-selo" role="status">PRÉVIA — ainda não salva. Nada aqui foi registrado.</p>';
    if (paciente) {
      html += '<p class="rh-doc-sub">Avaliação de ' + e(dataBR(h.quando)) + (snap.profissional && snap.profissional.nome ? " · com " + e(snap.profissional.nome) : "") + "</p>";
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
        "<div><dt>Pacote metodológico</dt><dd>" + e(h.pacote ? h.pacote.code + "@" + h.pacote.version : "—") + "</dd></div>" +
        "</dl>";
    }
    html += "</header>";

    // 1b. resumo estruturado (09/10): fatos + regra oficial + pendencias metodologicas, so a partir do snapshot
    if (window.ResultadoSintese) {
      html += window.ResultadoSintese.html(snap, visao, { moduloDe: moduloDe, nomeFerramenta: function (id) { return defFerr(id).titulo; } });
      /* Modelo B: Proximos Passos na visao da paciente SO quando a nutricionista compartilhou (padrao desligado) */
      if (paciente) html += window.ResultadoSintese.htmlProximosPassosPaciente(snap, function (id) { return defFerr(id).titulo; });
    }

    // 2. visao geral HOLOSCAN
    var cob = h.cobertura || {};
    html += '<section class="rh-secao rh-geral" aria-labelledby="rh-t-geral"><h3 id="rh-t-geral">' + (paciente ? "Seu Mapa HOLOS" : "Visão geral HOLOSCAN") + "</h3>" +
      (paciente ? '<p class="rh-intro">Nesta avaliação, as suas respostas ao HOLOSCAN foram organizadas em cinco sistemas. Notas mais baixas indicam onde mais sinais foram relatados. O mapa não é um diagnóstico: ele mostra por onde a conversa com a sua nutricionista pode seguir.</p>' : "") +
      '<div class="rh-geral-grade"><div class="rh-radar-caixa">' + radarSvg(sis) + "</div>" +
      '<div class="rh-numeros">' +
        '<div class="rh-num"><span>Índice HOLOS</span><b>' + (h.indice === null || h.indice === undefined ? "—" : num(h.indice)) + "</b><small>de " + e(h.indice_maximo || 100) + "</small></div>" +
        EIXOS.map(function (x) { return '<div class="rh-num"><span>' + e(x[1]) + "</span><b>" + (triOk[x[2]] === false || tri[x[2]] === null || tri[x[2]] === undefined ? "—" : num(tri[x[2]])) + "</b><small>Tríade</small></div>"; }).join("") +
        (paciente ? "" : '<div class="rh-num rh-num-cob"><span>Cobertura</span><b>' + (typeof cob.respondidos === "number" ? e(cob.respondidos + "/" + cob.total) : "—") + "</b><small>respostas</small></div>") +
      "</div></div>" +
      (paciente ? "" : '<p class="rh-nota-tec">Dados oficiais salvos da aplicação HOLOSCAN selecionada (' + e(h.pacote ? h.pacote.code + "@" + h.pacote.version : "") + '). Nada foi recalculado nesta página.</p>') +
      "</section>";

    // 3. cinco sistemas
    html += '<section class="rh-secao" aria-labelledby="rh-t-sis"><h3 id="rh-t-sis">' + (paciente ? "Os cinco sistemas" : "Cinco sistemas") + '</h3><div class="rh-sistemas">' +
      sis.map(function (s) {
        var msg = paciente ? s.mensagem_paciente : s.mensagem_nutri;
        return '<article class="rh-sis rh-faixa-' + e(s.faixa || "sem") + '"><header><h4>' + e(s.nome || s.sistema) + "</h4>" +
          '<span class="rh-sis-nota">' + (s.avaliavel ? num(s.nota) : "—") + "</span></header>" +
          '<p class="rh-sis-faixa">' + (s.avaliavel ? "faixa " + e(faixaTxt(s.faixa)) : "sem nota (menos respostas do que o mínimo)") +
            (paciente ? "" : " · " + e(s.respondidos + " de " + s.total_marcadores) + " respondidas" + (s.avaliavel ? "" : " · não avaliável")) + "</p>" +
          (msg ? '<p class="rh-sis-msg">' + e(msg) + "</p>" : "") +
          (!paciente && s.texto_publico ? '<p class="rh-sis-pub">' + e(s.texto_publico) + "</p>" : "") +
          (paciente ? "" :
            '<details class="rh-sis-det"><summary>Pontuou neste sistema (' + (s.pontuou || []).length + ")</summary>" + listaRespostas(s.pontuou) + "</details>" +
            '<details class="rh-sis-det"><summary>Contexto, sem pontuar (' + (s.contexto || []).length + ")</summary>" +
              ((s.contexto || []).length ? listaRespostas(s.contexto) : '<p class="rh-vazio">Nenhuma resposta de contexto neste sistema.</p>') + "</details>") +
          "</article>";
      }).join("") + "</div>" +
      (!paciente && h.interpretacao_texto ? '<div class="rh-interp"><span class="rh-tag">Interpretação registrada no HOLOSCAN</span><p>' + e(h.interpretacao_texto).replace(/\n/g, "<br>") + "</p></div>" : "") +
      "</section>";

    // 4-6. Corpo, Mente, Espirito
    EIXOS.forEach(function (x) {
      var doEixo = ferr.filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
      var mapa = x[0] === "espirito" ? mapaProposito(snap, paciente) : "";
      if (paciente && !doEixo.length && !mapa) return;
      html += '<section class="rh-secao rh-eixo rh-eixo-' + x[0] + '" aria-labelledby="rh-t-' + x[0] + '"><h3 id="rh-t-' + x[0] + '">' + e(x[1]) + "</h3>" +
        (paciente ? '<p class="rh-intro">Foi registrado nesta avaliação:</p>' : "") +
        (doEixo.length || mapa ? '<div class="rh-ferrs">' + mapa + doEixo.map(function (t) { return cartaoFerramenta(t, paciente); }).join("") + "</div>"
          : '<p class="rh-vazio">Nenhuma ferramenta de ' + e(x[1]) + " selecionada para este resultado.</p>") + "</section>";
    });

    // 7. visao conjunta (so profissional)
    if (!paciente) {
      html += '<section class="rh-secao" aria-labelledby="rh-t-conj"><h3 id="rh-t-conj">Visão conjunta — Corpo | Mente | Espírito</h3>' +
        '<p class="rh-nota-tec">Os registros lado a lado, como foram feitos. O sistema não tira conclusões: a leitura do conjunto é sua.</p><div class="rh-conjunta">' +
        EIXOS.map(function (x) {
          var doEixo = (snap.ferramentas || []).filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
          return '<div class="rh-conj-col rh-eixo-' + x[0] + '"><h4>' + e(x[1]) + ' <small>Tríade ' + (tri[x[2]] === null || tri[x[2]] === undefined ? "—" : num(tri[x[2]])) + "</small></h4>" +
            (doEixo.length ? '<ul class="rh-conj-lista">' + doEixo.map(resumoFerr).join("") + "</ul>" : '<p class="rh-vazio">Sem ferramentas selecionadas.</p>') + "</div>";
        }).join("") + "</div></section>";
    }

    // 8. observacoes
    if (paciente) {
      if (tem(obs.leitura_profissional)) html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-obs"><h3 id="rh-t-obs">O que sua nutricionista observou</h3><p>' + e(obs.leitura_profissional).replace(/\n/g, "<br>") + "</p></section>";
      if (tem(obs.pontos_acompanhar)) html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-pts"><h3 id="rh-t-pts">Pontos que serão acompanhados</h3><p>' + e(obs.pontos_acompanhar).replace(/\n/g, "<br>") + "</p></section>";
    } else {
      html += '<section class="rh-secao rh-obs" aria-labelledby="rh-t-obs"><h3 id="rh-t-obs">Observações da nutricionista</h3>' +
        [["leitura_profissional", "Leitura profissional da nutricionista"], ["pontos_acompanhar", "Pontos para acompanhar"], ["questoes_aprofundar", "Questões para aprofundar"]].map(function (k) {
          return '<div class="rh-obs-item"><h4>' + e(k[1]) + "</h4>" + (tem(obs[k[0]]) ? "<p>" + e(obs[k[0]]).replace(/\n/g, "<br>") + "</p>" : '<p class="rh-vazio">Não registrado.</p>') + "</div>";
        }).join("") + "</section>";
      html += '<p class="rh-futuro">Exames e Leitura Integrada — não incluídos nesta versão do Resultado HOLOS.</p>';
    }
    html += '<footer class="rh-doc-rodape">' + (paciente
      ? "Este material organiza o que foi registrado na sua avaliação. Ele não é diagnóstico nem prescrição: os próximos passos são combinados com a sua nutricionista em consulta."
      : "Snapshot do Resultado HOLOS" + (meta.hash ? " · hash técnico " + e(String(meta.hash).slice(0, 16)) + "…" : "") + ". Documento organizado a partir de registros salvos; não é diagnóstico.") + "</footer>";
    return html + "</article>";
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
    documentoHtml: documentoHtml, radarSvg: radarSvg,
    /** para o Relatorio e, no futuro, a HOLOS AI: o snapshot salvo, estruturado (nunca a ficha viva) */
    snapshotSalvo: function (id) { var r = porId(id); return r && r.status !== "rascunho" ? JSON.parse(JSON.stringify(r.content_snapshot)) : null; },
    esquecer: function () { cache = { pid: null, linhas: [], erro: null, carregado: false }; modo = "lista"; form = null; vendo = null; previa = null; }
  };
})();
