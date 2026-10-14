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
    payload_invalido: "Seleção inválida. Recarregue a aba e tente de novo.",
    foco_obrigatorio: "Defina e confirme o Foco atual antes de finalizar o Resultado HOLOS. O rascunho pode ser salvo sem foco.",
    direcao_invalida: "Algum item do resultado para a paciente está em formato inválido. Revise os itens e tente de novo.",
    holos_ai_nao_concluida: "A revisão desta análise da HOLOS AI ainda não foi concluída. Conclua a revisão na aba HOLOS AI.",
    holos_ai_item_nao_aceito: "Um item da HOLOS AI foi descartado (ou não revisado) e não pode entrar confirmado. Exclua-o do resultado.",
    holos_ai_so_profissional: "Um item da HOLOS AI é só profissional (hipótese, alerta, fonte ou raciocínio) e não pode ir para a paciente."
  };

  var cache = { pid: null, linhas: [], erro: null, carregado: false };
  var modo = "lista";       // lista | editar | ver | playbook
  var form = null;          // rascunho em edicao
  var vendo = null;         // { id, visao: "profissional" | "paciente" }
  var previa = null;        // snapshot devolvido pelo servidor (nao gravado)
  var ocupado = false;
  var sugMsg = "";          // retorno do "Trazer sugestoes do sistema"
  function RD() { return window.ResultadoDirecao; }

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
      leitura_profissional: "", pontos_acompanhar: "", questoes_aprofundar: "", expected_updated_at: null, direcao: null };
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
    /* template 5: a direcao do rascunho (ou da versao anterior, para a nova versao); senao, uma nova — retorno quando a
       anamnese do atendimento e de retorno ou ja ha Resultado salvo de atendimento anterior */
    if (RD()) f.direcao = RD().normalizar(base ? base.direcao : null, tipoEncontro(pid, f.encounter_id));
    if (RD()) RD().definirCandidatos(null);
    sugMsg = "";
    return f;
  }
  function anteriorDe(pid, eid) {
    var A = window.AtendimentoAtual, atual = A && eid ? A.porId(eid) : null, ref = atual ? String(atual.occurred_at) : "";
    return doPaciente(pid).filter(function (r) {
      if (r.status === "rascunho" || r.superseded_at || !r.content_snapshot || r.encounter_id === eid) return false;
      var e = A ? A.porId(r.encounter_id) : null;
      return !ref || !e || String(e.occurred_at) < ref;
    }).sort(function (a, b) { return String(b.saved_at || "").localeCompare(String(a.saved_at || "")); })[0] || null;
  }
  function tipoEncontro(pid, eid) {
    var An = window.Anamnese, an = An && eid ? (An.vigente(eid) || An.rascunhoDe(eid)) : null;
    if (an && an.content && an.content.tipo === "retorno") return "retorno";
    return anteriorDe(pid, eid) ? "retorno" : "primeira";
  }
  /* contexto das sugestoes: SO registros existentes (anamnese e Conduta do atendimento, acordos, ferramentas e HOLOSCAN
     escolhidos — vindos da previa do servidor —, Resultado anterior). Nada e calculado aqui. */
  function contextoSugestoes(pid, f, snap) {
    var An = window.Anamnese, Cd = window.Conduta, SF = window.SistemasFechamento;
    var an = An ? (An.vigente(f.encounter_id) || An.rascunhoDe(f.encounter_id)) : null;
    /* 14/10 (auditoria Cowork, P0): Mapeamento recebido/revisado sem levar ao atendimento -> as respostas ORIGINAIS da
       paciente entram como relato, referenciando o atendimento (o servidor confere que e desta paciente). */
    if (!an) {
      var PC = window.PreConsulta, rec = PC && PC.respostaRecebida ? PC.respostaRecebida(pid) : null;
      if (rec && rec.formulario && f.encounter_id) an = { id: f.encounter_id, refTipo: "atendimento", content: { tipo: rec.tipo, formulario: rec.formulario } };
    }
    var cd = Cd ? (Cd.vigente(f.encounter_id) || Cd.rascunhoDe(f.encounter_id)) : null;
    var cdAnt = Cd && Cd.anteriorDe ? Cd.anteriorDe(pid, f.encounter_id) : null;
    var h = (snap && snap.holoscan) || {}, sis = h.sistemas || [];
    var fechs = SF && snap ? SF.deResultado(snap, function (id) { return defFerr(id).titulo; }) : [];
    var areas = fechs.map(function (x, i) { return { x: x, s: sis[i] }; }).filter(function (o) { return o.x && o.x.resultado && o.x.resultado.prioridade; })
      .sort(function (a, b) { return a.x.resultado.posicao - b.x.resultado.posicao; })
      .map(function (o) { return { nome: abreviar(o.x.nome), dominantes: (o.s && o.s.dominantes) || [] }; });
    var ant = anteriorDe(pid, f.encounter_id);
    return {
      tipo: f.direcao ? f.direcao.tipo : "primeira",
      anamnese: an ? { id: an.id, refTipo: an.refTipo || null, content: an.content } : null,
      conduta: cd, acordos: cd && Cd.acordosDe ? Cd.acordosDe(cd.id) : [],
      acordosAnteriores: cdAnt && Cd.acordosDe ? Cd.acordosDe(cdAnt.id) : [],
      ferramentas: ((snap && snap.ferramentas) || []).map(function (t) { return { id: t.id, ferramenta_id: t.ferramenta_id, modulo: moduloDe(t.ferramenta_id), respostas: t.respostas || {}, proximo_passo: t.proximo_passo, prioridade: t.prioridade }; }),
      direcaoAtual: f.direcao,
      holoscan: h.id ? { id: h.id, areas: areas } : null,
      anterior: ant && ant.content_snapshot && ant.content_snapshot.direcao_paciente ? { id: ant.id, direcao_paciente: ant.content_snapshot.direcao_paciente } : null
    };
  }
  function payloadDe(f) {
    var vis = {};
    f.tools.forEach(function (id) { vis[id] = { mostrar: !!f.mostrar[id], ocultar: [] }; });
    return { id: f.id || null, supersedes_id: f.supersedes_id || null, patient_id: f.pid, encounter_id: f.encounter_id || null,
      holoscan_application_id: f.holoscan_application_id || null, tool_application_ids: f.tools.slice(), visao_paciente: { ferramentas: vis, proximos_passos: !!f.compartilhar_pp },
      leitura_profissional: f.leitura_profissional, pontos_acompanhar: f.pontos_acompanhar, questoes_aprofundar: f.questoes_aprofundar,
      expected_updated_at: f.expected_updated_at || null, direcao: f.direcao && RD() ? RD().paraGravar(f.direcao) : null };
  }
  function lerForm() {
    var a = alvo(); if (!a || !form) return;
    var enc = a.querySelector("#rh-atendimento"); if (enc) form.encounter_id = enc.value;
    var h = a.querySelector('input[name="rh-holoscan"]:checked'); form.holoscan_application_id = h ? h.value : "";
    form.tools = [].slice.call(a.querySelectorAll("[data-rh-ferr]:checked")).map(function (c) { return c.value; });
    [].slice.call(a.querySelectorAll("[data-rh-mostrar]")).forEach(function (c) { form.mostrar[c.dataset.rhMostrar] = c.checked; });
    var cpp = a.querySelector("#rh-compartilhar-pp"); if (cpp) form.compartilhar_pp = cpp.checked;
    ["leitura_profissional", "pontos_acompanhar", "questoes_aprofundar"].forEach(function (k) { var t = a.querySelector("#rh-" + k); if (t) form[k] = t.value; });
    if (RD() && form.direcao) RD().lerEditor(a, form.direcao);
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
    var t5 = Number(snap.template_version || 1) >= 5;
    if (t5 && paciente && RD()) return documentoPaciente5(snap, meta);
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
    // template 5: o que foi montado para a paciente (estado, origem, referencia), antes da leitura tecnica
    if (t5 && RD()) html += RD().htmlProfissional(snap.direcao, snap.direcao_paciente);

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

    /* 14/10: a Conduta saiu do sistema; o Resultado HOLOS nao aponta mais para ela */
    html += '<p class="rh-futuro">Exames e Leitura Integrada — não incluídos nesta versão do Resultado HOLOS.</p>';
    html += '<footer class="rh-doc-rodape">Snapshot do Resultado HOLOS' + (meta.hash ? " · hash técnico " + e(String(meta.hash).slice(0, 16)) + "…" : "") + ". Documento organizado a partir de registros salvos; não é diagnóstico.</footer>";
    return html + "</article>";
  }

  /* ======================= VISAO DA PACIENTE, TEMPLATE 5: direcionamento + estrategias + acompanhamento; HOLOSCAN no fim =======================
     So a projecao montada pelo SERVIDOR (direcao_paciente; numa emissao RF-3, a congelada nela). Nunca a direcao completa. */
  function documentoPaciente5(snap, meta) {
    var h = snap.holoscan || {}, dp = meta.direcaoPaciente || snap.direcao_paciente, caminho = meta.caminho || snap.caminho || [];
    var dataEnc = snap.atendimento ? dataBR(snap.atendimento.occurred_at) : dataBR(h.quando);
    var html = '<article class="rh-doc rh-doc-paciente rd-doc" id="rh-doc" aria-label="Resultado HOLOS — visão do paciente">' +
      RD().htmlPaciente(dp, caminho, { nome: snap.paciente && snap.paciente.nome, data: dataEnc, profissional: snap.profissional && snap.profissional.nome,
        previa: !!meta.previa, detalhes: seuMapaPaciente(snap) });
    if (!meta.semRodape) html += '<footer class="rh-doc-rodape">Este material organiza o que foi registrado e combinado no seu acompanhamento. Ele não é diagnóstico nem prescrição: os próximos passos são combinados com a sua nutricionista em consulta.</footer>';
    return html + "</article>";
  }
  /* PDF da paciente — refino final (15/10): SEU MAPA HOLOS compacto, depois de toda a parte pratica (radar, Indice, Triade e as
     areas que merecem mais atencao, sem repetir direcionamentos/estrategias e sem a pagina dos cinco sistemas) + FERRAMENTAS
     UTILIZADAS em uma frase (as respostas e leituras das ferramentas ficam no sistema, nao no PDF). */
  function seuMapaPaciente(snap) {
    var h = snap.holoscan || {}, SF = window.SistemasFechamento;
    var html = "";
    if (h && (h.sistemas || []).length) {
      var fechs = SF ? SF.deResultado(snap, function (id) { return defFerr(id).titulo; }) : [];
      var areas = (fechs || []).filter(function (f) { return f && f.resultado && f.resultado.prioridade; })
        .sort(function (a, b) { return a.resultado.posicao - b.resultado.posicao; }).slice(0, 2);
      html += '<section class="pf-bloco pf-mapa" id="pf-mapa" aria-labelledby="pf-t-mapa"><h3 class="pf-tit" id="pf-t-mapa">Seu mapa HOLOS</h3>' +
        '<p class="pf-intro">O HOLOSCAN organiza os marcadores desta aplicação e ajuda a definir áreas para aprofundamento. Ele não é diagnóstico.</p>' +
        gradeGeral(h, true) +
        (areas.length ? '<div class="pf-areas"><p class="pf-rot">Áreas que merecem mais atenção nesta fase</p><ol class="pf-lista pf-lista-num">' + areas.map(function (f, i) {
          var nome = String(f.nome || f.sistema).replace(/^Sistema\s+/i, "");
          var def = f.organiza && SF && SF.definicaoPaciente ? primeiraFraseH(SF.definicaoPaciente(f.organiza)) : "";
          return '<li><i aria-hidden="true">' + (i + 1) + "</i><span><b>" + e(nome) + "</b>" + (def ? " — " + e(def) : "") + "</span></li>";
        }).join("") + "</ol></div>" : "") + "</section>";
    }
    var nomes = [], vistos = {};
    /* so o NOME das ferramentas aplicadas (as respostas e resultados ficam no sistema, inclusive as nao marcadas para a paciente) */
    (snap.ferramentas || []).forEach(function (t) { var n = defFerr(t.ferramenta_id).titulo; if (n && !vistos[n]) { vistos[n] = 1; nomes.push(n); } });
    if (nomes.length) {
      var lista = nomes.length > 1 ? nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1] : nomes[0];
      html += '<section class="pf-bloco pf-ferr" id="pf-ferramentas" aria-labelledby="pf-t-ferr"><h3 class="pf-tit" id="pf-t-ferr">Ferramentas utilizadas</h3>' +
        "<p>Para aprofundar a sua consulta, foram utilizadas ferramentas do método HOLOS: " + e(lista) + ". As respostas ficam guardadas com a sua nutricionista.</p></section>";
    }
    /* Proximos Passos so quando a nutricionista ligou "Compartilhar com a paciente" (so nomes de ferramentas, linguagem simples) */
    var S = window.ResultadoSintese;
    if (S && S.htmlProximosPassosPaciente && snap.visibilidade && snap.visibilidade.proximos_passos === true)
      html += '<section class="pf-bloco pf-pp" id="pf-pp">' + S.htmlProximosPassosPaciente(snap, function (id) { return defFerr(id).titulo; }, true) + "</section>";
    return html;
  }
  function primeiraFraseH(t) { t = String(t || "").trim(); var m = t.match(/^[\s\S]*?[.!?](\s|$)/); t = m ? m[0].trim() : t; return t.length > 160 ? t.slice(0, 159).replace(/\s+\S*$/, "") + "…" : t; }
  /* DETALHES DO MAPA (fim do documento): HOLOSCAN (radar, Indice, Triade, cinco sistemas compactos) + registros de ferramentas compartilhados */
  function dpDe(snap) { return snap.__dp || snap.direcao_paciente || {}; }
  function detalhesMapa(snap) {
    var h = snap.holoscan || {}, sis = h.sistemas || [], SF = window.SistemasFechamento;
    var fechs = SF ? SF.deResultado(snap, function (id) { return defFerr(id).titulo; }) : null;
    var ferr = (snap.ferramentas || []).filter(function (t) { return t.mostrar_paciente; });
    var html = '<section class="rh-secao rh-detalhes rd-detalhes" aria-labelledby="rh-t-det"><div class="rh-junto"><h3 id="rh-t-det">Detalhes do mapa</h3>' +
      '<p class="rh-intro">As suas respostas ao HOLOSCAN organizadas em cinco sistemas. Notas mais baixas indicam maior carga dos marcadores considerados neste eixo nesta aplicação. Isso ajuda a mostrar onde pode valer a pena aprofundar a conversa e não representa doença, gravidade ou diagnóstico.</p></div>' +
      gradeGeral(h, true);
    var mapa = mapaProposito(snap, true);
    if (ferr.length || mapa) {
      html += '<div class="rh-junto rh-junto-sub"><h4 class="rh-sub">Registros das ferramentas</h4></div><div class="rh-ferrs">' + mapa + ferr.map(function (t) { return cartaoFerramenta(t, true, snap.ferramentas || []); }).join("") + "</div>";
    }
    /* Proximos Passos so quando a nutricionista ligou "Compartilhar com a paciente" (o mesmo bloco do template 4) */
    var S = window.ResultadoSintese;
    if (S && S.htmlProximosPassosPaciente && snap.visibilidade && snap.visibilidade.proximos_passos === true)
      html += S.htmlProximosPassosPaciente(snap, function (id) { return defFerr(id).titulo; }, true);
    html += "</section>";
    /* OS CINCO SISTEMAS (ultima secao): o que apareceu, o que vale observar, como cuidar do eixo e, quando ligado pela
       nutricionista, o direcionamento e as estrategias pessoais (da direcao confirmada, nunca da nota) */
    if (RD()) html += RD().htmlCincoSistemas(sis, fechs, dpDe(snap));
    return html;
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
      html += '<section class="rh-secao rh-descobertas" aria-labelledby="rh-t-desc">';
      /* pos-teste MR-V1 13/10: o titulo da secao vai DENTRO do primeiro grupo de eixo — no PDF o grupo (titulo + eixo +
         cartao) fica junto e o titulo nunca sobra sozinho no fim da pagina */
      var tituloDesc = '<h3 id="rh-t-desc">O que descobrimos com as ferramentas</h3>';
      EIXOS.forEach(function (x) {
        var doEixo = c.ferr.filter(function (t) { return moduloDe(t.ferramenta_id) === x[0]; });
        var m = x[0] === "espirito" ? mapa : "";
        if (!doEixo.length && !m) return;
        html += '<div class="rh-eixo rh-eixo-' + x[0] + '">' + tituloDesc + '<h4 class="rh-sub">' + e(x[1]) + '</h4><div class="rh-ferrs">' + m + doEixo.map(function (t) { return cartaoFerramenta(t, true, snap.ferramentas || []); }).join("") + "</div></div>";
        tituloDesc = "";
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
    /* 14/10: a Conduta saiu do sistema; o bloco so aparece quando um resultado antigo tem Conduta registrada */
    if (c) html += sec(8, "Conduta", c ? '<p class="rh-nota-tec">Decisão da nutricionista, do atendimento deste resultado. Não foi gerada pelo sistema.</p>' +
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
  function linhaFoco(r) {
    var tv = r.status === "rascunho" ? 5 : Number((r.content_snapshot || {}).template_version || r.template_version || 1);
    if (tv < 5) return '<span class="rh-hist-meta rd-hist-foco">Formato anterior (sem Foco atual): para emitir, crie uma nova versão.</span>';
    var f = r.status === "rascunho" ? (RD() && RD().focoConfirmado(r.direcao) ? r.direcao.foco_atual.texto : null) : (((r.content_snapshot || {}).direcao_paciente || {}).foco_atual || {}).texto;
    return f ? '<span class="rh-hist-meta rd-hist-foco"><b>Foco:</b> ' + e(f) + "</span>" : '<span class="rh-hist-meta rd-hist-foco rd-construcao">' + e(RD() ? RD().EM_CONSTRUCAO : "RESULTADO EM CONSTRUÇÃO") + "</span>";
  }
  function htmlLista(pid) {
    var linhas = doPaciente(pid);
    var arq = arquivado();
    var html = cabecalho() + '<div class="rh-acoes-topo">' +
      /* simplificacao 14/10: o Resultado nasce da aba HOLOS AI (importar e gerar); a montagem manual fica como recurso avancado */
      (window.HOLOS_IA_VISIVEL === false ? "" : '<button type="button" class="btn-verde" data-rh-acao="ir-holos-ai"' + (arq || !temSupa() ? " disabled" : "") + ">Gerar pela HOLOS AI</button>") +
      /* Playbook HOLOS (PB-V1): o Resultado sem depender da IA — a nutricionista escolhe foco e estrategias do playbook */
      '<button type="button" class="btn-verde" data-rh-acao="playbook"' + (arq || !temSupa() || !window.ResultadoPlaybook ? " disabled" : "") + ">Montar com o Playbook</button>" +
      (arq ? '<span class="dash-sub">' + e(MSG_HINT.paciente_arquivado) + "</span>" : "") +
      '<details class="rh-manual"><summary>Montar manualmente (avançado)</summary><p class="dash-sub">Sem o Playbook: você escolhe as fontes e escreve cada parte.</p>' +
      '<button type="button" class="btn-fantasma" data-rh-acao="novo"' + (arq || !temSupa() ? " disabled" : "") + ">Montar Resultado HOLOS manualmente</button></details></div>";
    if (!temSupa()) return html + '<p class="dash-vazio">O Resultado HOLOS fica no servidor: entre com a sua conta para gerar e consultar.</p>';
    if (cache.erro) return html + '<p class="q-erro">Não foi possível carregar os Resultados HOLOS: ' + e(mensagemErro(cache.erro)) + "</p>";
    html += '<section class="rh-historico" aria-labelledby="rh-t-hist"><h4 id="rh-t-hist" class="dash-titulo">Histórico de Resultados HOLOS</h4>';
    if (!linhas.length) return html + '<p class="dash-vazio">Nenhum Resultado HOLOS ainda. Monte com o Playbook: você escolhe o foco e as estratégias, em poucos minutos.</p></section>';
    html += '<ul class="rh-hist-lista">' + linhas.map(function (r) {
      var s = r.content_snapshot || {}, sel = r.selected_sources || {};
      var nF = r.status === "rascunho" ? (sel.tool_application_ids || []).length : (s.ferramentas || []).length;
      var hq = s.holoscan ? dataBR(s.holoscan.quando) : (sel.holoscan_application_id ? "aplicação " + curto(sel.holoscan_application_id) : "—");
      return '<li class="rh-hist-item rh-st-' + e(r.status) + '" data-rh-id="' + e(r.id) + '">' +
        '<div class="rh-hist-info"><b>' + (r.status === "rascunho" ? "Rascunho" : e(dataHora(r.saved_at))) + "</b>" +
        '<span class="rh-hist-meta">versão nº ' + e(r.revision_number) + " · " + e(ROTULO_STATUS[r.status] || r.status) + (r.superseded_at ? " · substituída por versão mais nova" : "") +
        " · atendimento " + e(rotuloAtendimento(r.encounter_id)) + " · HOLOSCAN " + e(hq) + " · " + nF + (nF === 1 ? " ferramenta" : " ferramentas") + "</span>" + linhaFoco(r) + "</div>" +
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

    // template 5: MONTAR RESULTADO PARA A PACIENTE (direcionamento, estrategias, acompanhamento da evolucao)
    if (RD() && f.direcao) html += RD().htmlEditor(f.direcao, { sugMsg: sugMsg });

    // SO PARA A PROFISSIONAL: hipoteses, leitura tecnica, questoes, observacoes (nada daqui vai para a paciente)
    html += '<fieldset class="rh-grupo rd-so-prof-grupo"><legend>SÓ PARA A PROFISSIONAL</legend>' + (RD() && f.direcao ? RD().htmlSoProfissional(f.direcao) : "") +
      [["leitura_profissional", "Leitura técnica da nutricionista", 5], ["questoes_aprofundar", "Questões para aprofundar", 3], ["pontos_acompanhar", "Observações que não vão para a paciente", 3]].map(function (k) {
        return '<label class="rh-texto"><span>' + e(k[1]) + '</span><textarea id="rh-' + k[0] + '" rows="' + k[2] + '" maxlength="' + (k[0] === "leitura_profissional" ? 20000 : 10000) + '">' + e(f[k[0]]) + "</textarea></label>";
      }).join("") + '<p class="dash-sub">Ficam só no registro e na visão profissional. A paciente vê apenas o que você confirmou e compartilhou acima. Depois de finalizado, nada disso muda.</p></fieldset>';

    html += '<div class="rh-form-acoes"><span class="rh-contagem" id="rh-contagem" aria-live="polite"></span>' +
      '<button type="button" class="btn-fantasma" data-rh-acao="cancelar">Cancelar</button>' +
      '<button type="button" class="btn-borda-ouro" data-rh-acao="previa">Pré-visualizar</button>' +
      '<button type="button" class="btn-borda-ouro" data-rh-acao="rascunho">Salvar rascunho</button>' +
      '<button type="button" class="btn-verde" data-rh-acao="salvar">Finalizar Resultado HOLOS</button></div>' +
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
    if (modo === "playbook" && window.ResultadoPlaybook) { window.ResultadoPlaybook.pintar(a, pid); return; }
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
    if (nome === "playbook") return abrirPlaybook();
    if (nome === "ir-holos-ai") { var ah = document.querySelector('[data-aba="holos-ai"]'); if (ah) ah.click(); return; }
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
    /* template 5: finalizar exige o Foco atual confirmado (o rascunho nao) */
    if (nome === "salvar" && RD() && form && form.direcao && !RD().focoConfirmado(form.direcao)) return mostrarErro(MSG_HINT.foco_obrigatorio);
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
        /* o rascunho salvo continua na tela com as mesmas sugestoes de foco e proxima etapa a mao */
        var cand = RD() ? RD().candidatos() : null;
        return carregar(pid).then(function () { var r = porId(id); form = novoForm(pid, r); if (RD()) RD().definirCandidatos(cand); pintar(); toast("Rascunho salvo no servidor."); });
      }, function (err) { mostrarErro(mensagemErro(err)); }));
    }
    if (nome === "salvar") {
      return confirmar("Finalizar Resultado HOLOS", "<p>Depois de finalizado, as fontes, o foco, o que foi compartilhado com a paciente e as observações <b>não mudam</b>. Para corrigir, cria-se uma nova versão — esta continua no histórico.</p>", "Finalizar").then(function (ok) {
        if (!ok) return;
        return travar(rpc("salvar_resultado_holos", { payload: Object.assign(payloadDe(form), { operation_id: uuid() }) }).then(function (id) {
          return carregar(pid).then(function () { form = null; previa = null; vendo = { id: id, visao: "profissional" }; modo = "ver"; pintar(); toast("Resultado HOLOS finalizado."); });
        }, function (err) { mostrarErro(mensagemErro(err)); }));
      });
    }
  }

  /* acoes do bloco "Montar resultado para a paciente" */
  function acaoDirecao(el) {
    var pid = pacienteId(), a = alvo();
    lerForm();
    if (el.dataset.rdAcao === "sugerir") {
      var problema = validarLocal();
      if (problema) return mostrarErro(problema);
      if (ocupado) return;
      ocupado = true;
      /* a previa do servidor traz o HOLOSCAN (areas e sinais) e as ferramentas escolhidas, como serao congelados */
      return rpc("previa_resultado_holos", { payload: payloadDe(form) }).then(function (snap) {
        var S = RD().sugestoes(contextoSugestoes(pid, form, snap));
        var n = RD().mesclar(form.direcao, S);
        RD().definirCandidatos(S);
        var nU = (S.foco_atual || []).length + (S.proxima_etapa || []).length;
        sugMsg = n || nU ? (n + nU) + " sugestões encontradas. Revise, edite, confirme ou exclua cada uma." : "Nenhuma sugestão nova: não há registro de origem para sugerir.";
        previa = null; pintar();
      }, function (err) { mostrarErro(mensagemErro(err)); }).then(function () { ocupado = false; }, function () { ocupado = false; });
    }
    if (RD().acao(form.direcao, el, a)) { previa = null; pintar(); }
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
    var rd = ev.target.closest("[data-rd-acao]");
    if (rd && modo === "editar" && form && RD() && rd.tagName !== "INPUT") { ev.preventDefault(); acaoDirecao(rd); return; }
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
    if (form && RD() && t.matches('[data-rd-acao="compartilhar"]')) { lerForm(); RD().acao(form.direcao, t, a); previa = null; return pintar(); }
    if (form && RD() && t.matches('input[name="rd-tipo"]')) { lerForm(); previa = null; return pintar(); }
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

  /* PONTE HOLOS AI (14/10): o que a nutricionista CONFIRMOU na aba HOLOS AI entra no Resultado HOLOS deste atendimento.
     Continua o rascunho do mesmo atendimento (se houver) ou abre um novo; acrescenta os itens (origem "holos_ai", com a
     referencia ao item importado) sem tocar no que ja existe; o foco entra so como SUGESTAO (quem confirma e a nutricionista).
     Com HOLOSCAN escolhido (rascunho existente), grava o rascunho; senao abre o editor pedindo a escolha do HOLOSCAN. */
  function receberHolosAI(imp, itens) {
    var C = window.HolosAIContrato, pid = pacienteId();
    if (!C || !RD() || !imp || imp.status !== "confirmado") return Promise.resolve({ salvo: false, motivo: "importacao_nao_confirmada" });
    var m = C.paraDirecao(imp, itens);
    return carregar(pid).then(function () {
      var rasc = doPaciente(pid).filter(function (r) { return r.status === "rascunho" && r.encounter_id === imp.encounter_id; })
        .sort(function (a, b) { return String(b.updated_at || "").localeCompare(String(a.updated_at || "")); })[0] || null;
      form = novoForm(pid, rasc);
      form.encounter_id = imp.encounter_id;
      if (!rasc) form.direcao = RD().normalizar(null, tipoEncontro(pid, imp.encounter_id));
      var n = RD().mesclar(form.direcao, m.S);
      var temTexto = function (it) { return !!(it && typeof it.texto === "string" && it.texto.trim()); };
      if (m.foco && !temTexto(form.direcao.foco_atual)) { form.direcao.foco_atual = m.foco; n++; }
      if (m.proxima_etapa && !temTexto(form.direcao.proxima_etapa)) { form.direcao.proxima_etapa = m.proxima_etapa; n++; }
      if (m.leitura) {
        var bloco = "Síntese HOLOS AI (revisada pela nutricionista, importação v" + imp.versao + "): " + m.leitura;
        if ((form.leitura_profissional || "").indexOf(m.leitura) < 0) { form.leitura_profissional = (form.leitura_profissional ? form.leitura_profissional + "\n\n" : "") + bloco; n++; }
      }
      modo = "editar"; vendo = null; previa = null;
      sugMsg = n ? n + " itens confirmados da HOLOS AI entraram no Resultado. Revise, confirme o Foco atual e finalize." : "Os itens confirmados da HOLOS AI já estavam no Resultado.";
      var abrir = function () { var ab = document.querySelector('[data-aba="resultado-holos"]'); if (ab) ab.click(); else pintar(); };
      if (!form.holoscan_application_id) {
        abrir();
        mostrarErro(MSG_HINT.holoscan_obrigatorio + " Depois, salve o rascunho.");
        return { salvo: false, motivo: "holoscan_obrigatorio", itens: n };
      }
      return rpc("salvar_rascunho_resultado_holos", { payload: Object.assign(payloadDe(form), { operation_id: form.id ? null : uuid() }) }).then(function (id) {
        return carregar(pid).then(function () { var msg = sugMsg; form = novoForm(pid, porId(id)); sugMsg = msg; abrir(); toast("Resultado HOLOS atualizado com a análise confirmada."); return { salvo: true, id: id, itens: n }; });
      }, function (err) { abrir(); mostrarErro(mensagemErro(err)); return { salvo: false, motivo: "erro", erro: err }; });
    });
  }

  /* SIMPLIFICACAO DEFINITIVA (14/10): importacao HOLOS AI ACEITA pela regra fixa (aceitar_importacao_holos_ai) vira o
     Resultado HOLOS FINALIZADO deste atendimento, sem montagem manual:
       - HOLOSCAN: a aplicacao oficial salva do mesmo atendimento; senao a oficial mais recente (o servidor confere);
       - ferramentas concluidas do atendimento entram como fonte (registro), nunca como conteudo da paciente (mostrar = nao);
       - Mapeamento/anamnese (momento, o que pesa, o que quer, avancos, o que permaneceu) e acordos da Conduta entram
         confirmados e para a paciente (sao o relato dela e o combinado), menos texto com termo fora do metodo;
       - da HOLOS AI: o que a regra fixa marcou como elegivel vai para a paciente; o resto fica interno (registro);
       - foco = 1o direcionamento elegivel, confirmado; a sintese integrada fica so na leitura profissional.
     Nova importacao no mesmo atendimento = nova versao do Resultado (a anterior continua no historico). */
  var LISTAS_RELATO = ["momento", "dores", "desejos", "avancos", "permaneceu", "acordos_compartilhados"];
  var ORIGENS_RELATO = ["relato_paciente", "acordo", "resultado_anterior"];
  var LIMITE_PACIENTE = { momento: 2, dores: 3, desejos: 2, avancos: 3, permaneceu: 3, padroes: 3, direcionamentos: 3, estrategias: 4,
    corpo: 2, mente: 2, espirito: 2, acordos_compartilhados: 3, observar: 4 };
  function gerarAutomatico(imp, itens) {
    var C = window.HolosAIContrato, pid = imp && imp.patient_id || pacienteId();
    if (!C || !RD() || !imp || imp.status !== "confirmado") return Promise.resolve({ salvo: false, motivo: "importacao_nao_confirmada" });
    return carregar(pid).then(function () {
      var f = novoForm(pid, null);
      f.encounter_id = imp.encounter_id;
      var hs = aplicacoesHoloscan(pid).filter(function (h) { return h.oficial; });
      var h = hs.filter(function (x) { return x.encounter_id === imp.encounter_id; })[0] || hs[0];
      if (!h) return { salvo: false, motivo: "holoscan_obrigatorio", mensagem: MSG_HINT.holoscan_obrigatorio };
      f.holoscan_application_id = h.id;
      var visto = {};
      f.tools = aplicacoesFerramentas(pid).filter(function (a) {
        if (a.encounter_id !== imp.encounter_id || visto[a.ferramenta_id]) return false;
        visto[a.ferramenta_id] = true; return true;
      }).map(function (a) { return a.id; });
      f.compartilhar_pp = false;
      f.direcao = RD().normalizar(null, imp.tipo === "retorno" ? "retorno" : tipoEncontro(pid, imp.encounter_id));
      var finais = doPaciente(pid).filter(function (r) { return r.status !== "rascunho" && r.encounter_id === imp.encounter_id && !r.superseded_at; })
        .filter(function (r) { return !cache.linhas.some(function (x) { return x.supersedes_id === r.id; }); })
        .sort(function (a, b) { return String(b.saved_at || "").localeCompare(String(a.saved_at || "")); });
      f.supersedes_id = finais[0] ? finais[0].id : null;
      return rpc("previa_resultado_holos", { payload: payloadDe(f) }).then(function (snap) {
        /* 1. o relato da paciente e o combinado (registros existentes, com referencia) */
        var Ssis = RD().sugestoes(contextoSugestoes(pid, f, snap)), Srel = {}, nRel = 0;
        LISTAS_RELATO.forEach(function (k) {
          Srel[k] = (Ssis[k] || []).filter(function (it) { return it && ORIGENS_RELATO.indexOf(it.origem) >= 0; }).map(function (it) {
            nRel++;
            return Object.assign({}, it, { confirmado: true, mostrar_paciente: !RD().termosFora(it.texto).length, descartado: false });
          });
        });
        RD().mesclar(f.direcao, Srel);
        /* 2. a analise da HOLOS AI pela regra fixa */
        var m = C.paraDirecao(imp, itens, { automatico: true });
        RD().mesclar(f.direcao, m.S);
        /* PDF simples (2 a 4 paginas): cada lista da paciente leva no maximo LIMITE_PACIENTE itens, na ordem da analise
           (o_que_observar antes do plano de acompanhamento). O excedente fica no registro, interno — nada se perde. */
        Object.keys(LIMITE_PACIENTE).forEach(function (k) {
          var l = k === "corpo" || k === "mente" || k === "espirito" ? (f.direcao[k] || {}).itens : f.direcao[k], n = 0;
          (l || []).forEach(function (it) { if (it.mostrar_paciente && ++n > LIMITE_PACIENTE[k]) it.mostrar_paciente = false; });
        });
        if (m.foco) f.direcao.foco_atual = m.foco;
        if (m.proxima_etapa) f.direcao.proxima_etapa = m.proxima_etapa;
        f.leitura_profissional = m.leitura ? "Síntese HOLOS AI (importação v" + imp.versao + ", aceite automático): " + m.leitura : "";
        if (!RD().focoConfirmado(f.direcao)) return { salvo: false, motivo: "sem_foco", mensagem: "A análise da HOLOS AI não trouxe nenhum direcionamento: sem foco, o Resultado não fica pronto. Gere a análise de novo." };
        return rpc("salvar_resultado_holos", { payload: Object.assign(payloadDe(f), { operation_id: uuid() }) }).then(function (id) {
          return carregar(pid).then(function () {
            form = null; previa = null; vendo = { id: id, visao: "paciente" }; modo = "ver";
            return { salvo: true, id: id, relato: nRel, retidos: m.retidos.length, substituiu: f.supersedes_id };
          });
        });
      });
    }).catch(function (err) { return { salvo: false, motivo: "erro", erro: err, mensagem: mensagemErro(err) }; });
  }
  /* PLAYBOOK HOLOS (PB-V1, 14/10): o Resultado sem depender da IA. prepararPlaybook le as MESMAS fontes do caminho automatico
     (atendimento, HOLOSCAN oficial, ferramentas concluidas do atendimento, Mapeamento/anamnese, Resultado anterior) e devolve
     o que o assistente precisa mostrar; gerarPorPlaybook grava o Resultado com o que a NUTRICIONISTA escolheu
     (resultado-playbook.js). Nada e escolhido sozinho; o servidor valida a direcao como em qualquer Resultado. */
  function prepararPlaybook(pid) {
    pid = pid || pacienteId();
    if (!RD() || !temSupa()) return Promise.resolve({ erro: "O Resultado HOLOS fica no servidor: entre com a sua conta." });
    return carregar(pid).then(function () {
      var f = novoForm(pid, null);
      if (!f.encounter_id) return { erro: "Inicie um atendimento para montar o Resultado: ele fica ligado ao atendimento." };
      var hs = aplicacoesHoloscan(pid).filter(function (h) { return h.oficial; });
      var h = hs.filter(function (x) { return x.encounter_id === f.encounter_id; })[0] || hs[0];
      if (!h) return { erro: "Aplique e salve o HOLOSCAN deste paciente primeiro: é ele que define as áreas prioritárias e os focos do Playbook." };
      f.holoscan_application_id = h.id;
      var visto = {};
      f.tools = aplicacoesFerramentas(pid).filter(function (a) {
        if (a.encounter_id !== f.encounter_id || visto[a.ferramenta_id]) return false;
        visto[a.ferramenta_id] = true; return true;
      }).map(function (a) { return a.id; });
      f.compartilhar_pp = false;
      var finais = doPaciente(pid).filter(function (r) { return r.status !== "rascunho" && r.encounter_id === f.encounter_id && !r.superseded_at; })
        .filter(function (r) { return !cache.linhas.some(function (x) { return x.supersedes_id === r.id; }); })
        .sort(function (a, b) { return String(b.saved_at || "").localeCompare(String(a.saved_at || "")); });
      f.supersedes_id = finais[0] ? finais[0].id : null;
      return rpc("previa_resultado_holos", { payload: payloadDe(f) }).then(function (snap) {
        var SF = window.SistemasFechamento;
        var prio = (SF && snap ? SF.deResultado(snap, function (id) { return defFerr(id).titulo; }) : [])
          .filter(function (x) { return x && x.resultado && x.resultado.prioridade; })
          .sort(function (a, b) { return a.resultado.posicao - b.resultado.posicao; }).map(function (x) { return x.sistema; });
        var ferr = (snap && snap.ferramentas) || [];
        var mom = ferr.filter(function (t) { return t.ferramenta_id === "linha_momentum"; })[0];
        var ctx = contextoSugestoes(pid, f, snap), S = RD().sugestoes(ctx), relato = {};
        LISTAS_RELATO.forEach(function (k) {
          relato[k] = (S[k] || []).filter(function (it) { return it && ORIGENS_RELATO.indexOf(it.origem) >= 0 && !RD().termosFora(it.texto).length; });
        });
        /* o que o paciente respondeu NAS FERRAMENTAS (palavras dele, com referencia ao registro): desejos e Corpo/Mente/Espirito */
        var ferrRelato = [];
        ["desejos", "corpo", "mente", "espirito"].forEach(function (k) {
          (S[k] || []).forEach(function (it) { if (it && it.origem === "ferramenta" && !RD().termosFora(it.texto).length) ferrRelato.push({ lista: k, item: it }); });
        });
        var A = window.AtendimentoAtual, at = A && A.porId ? A.porId(f.encounter_id) : null;
        return { form: f, snap: snap, tipo: f.direcao.tipo, ferramentasRelato: ferrRelato, prioritarios: prio, ferramentas: ferr.map(function (t) { return t.ferramenta_id; }),
          nomesFerramentas: ferr.map(function (t) { return defFerr(t.ferramenta_id).titulo || t.ferramenta_id; }),
          momentum: mom && mom.respostas ? mom.respostas.estado_confirmado || mom.respostas.estado || null : null, relato: relato, anterior: ctx.anterior,
          anteriorDirecao: ctx.anterior && porId(ctx.anterior.id) ? porId(ctx.anterior.id).direcao || null : null,
          anteriorEm: ctx.anterior && porId(ctx.anterior.id) ? (function (r) { var e = A && A.porId ? A.porId(r.encounter_id) : null; return e ? e.occurred_at : r.saved_at; })(porId(ctx.anterior.id)) : null,
          atendimento: at ? (A.rotuloQuando ? A.rotuloQuando(at) : String(at.occurred_at || "").slice(0, 10)) : "", holoscanEm: h.quando || h.criado || "" };
      });
    }).catch(function (err) { return { erro: mensagemErro(err) }; });
  }
  /* escolha = { relato: [itens marcados], direcao: saida de PlaybookHolos.montarDirecao (ou parte dela),
     acompanhamento: [itens do retorno], continuadas: [estrategias mantidas/ajustadas], focoAnterior: item, direcionamentosAnteriores: [itens], resumo: texto } */
  function direcaoPorPlaybook(pb, escolha) {
    var f = Object.assign({}, pb.form), m = escolha.direcao || {};
    f.direcao = RD().normalizar(null, pb.tipo);
    var d = f.direcao, S = {};
    LISTAS_RELATO.forEach(function (k) { S[k] = []; });
    var terrFerr = { corpo: [], mente: [], espirito: [] };
    (escolha.relato || []).forEach(function (it) {
      var x = Object.assign({}, it.item, { confirmado: true, mostrar_paciente: true, descartado: false });
      if (S[it.lista]) S[it.lista].push(x); else if (terrFerr[it.lista]) terrFerr[it.lista].push(x);
    });
    RD().mesclar(d, S);
    d.acompanhamento_estrategias = (escolha.acompanhamento || []).slice();
    d.foco_atual = escolha.focoAnterior || m.foco_atual || null;
    d.direcionamentos = (escolha.direcionamentosAnteriores || []).concat(m.direcionamentos || []);
    d.estrategias = (escolha.continuadas || []).concat(m.estrategias || []).slice(0, (window.PlaybookHolos && window.PlaybookHolos.MAX_ESTRATEGIAS) || 6);
    /* Corpo · Mente · Espirito: primeiro o que o paciente trouxe nas ferramentas, depois as estrategias escolhidas */
    ["corpo", "mente", "espirito"].forEach(function (t) { d[t].itens = terrFerr[t].concat(m[t] || []); });
    (escolha.continuadas || []).forEach(function (e) {
      var PB = window.PlaybookHolos, def = PB ? PB.porId(PB.origemPlaybook(e.anterior && e.anterior.estrategia_id)) : null;
      if (def && d[def.territorio]) d[def.territorio].itens.push({ id: "pb1-" + def.id + "-t-" + Math.random().toString(36).slice(2, 8), texto: e.texto, texto_sugerido: e.texto,
        origem: "nutricionista", ref: null, sugestao: false, confirmado: true, mostrar_paciente: true, descartado: false });
    });
    d.observar = (m.observar || []).slice();
    d.proxima_etapa = m.proxima_etapa || null;
    f.leitura_profissional = escolha.resumo || "";
    return f;
  }
  function gerarPorPlaybook(pb, escolha) {
    if (!pb || !pb.form || !RD()) return Promise.resolve({ salvo: false, mensagem: "Prepare o Playbook de novo." });
    var f = direcaoPorPlaybook(pb, escolha), d = f.direcao, pid = f.pid;
    if (!RD().focoConfirmado(d)) return Promise.resolve({ salvo: false, mensagem: MSG_HINT.foco_obrigatorio });
    if (!d.estrategias.length) return Promise.resolve({ salvo: false, mensagem: "Escolha pelo menos 1 estratégia." });
    return rpc("salvar_resultado_holos", { payload: Object.assign(payloadDe(f), { operation_id: uuid() }) }).then(function (id) {
      return carregar(pid).then(function () { form = null; previa = null; vendo = { id: id, visao: "paciente" }; modo = "ver"; return { salvo: true, id: id }; });
    }, function (err) { return { salvo: false, mensagem: mensagemErro(err), erro: err }; });
  }
  /* previa: o mesmo Resultado que seria gravado, projetado para a paciente (nada salvo) */
  function previaPlaybook(pb, escolha) {
    if (!pb || !pb.form || !RD()) return "";
    var f = direcaoPorPlaybook(pb, escolha);
    var dp = RD().projecaoPaciente(f.direcao);
    var ant = pb.anterior && pb.anterior.direcao_paciente ? [{ foco: pb.anterior.direcao_paciente.foco_atual, atendimento_em: pb.anteriorEm || null }] : [];
    return RD().htmlPaciente(dp, ant, { previa: true });
  }
  /* o assistente desenha dentro da aba Resultado HOLOS (modo "playbook") */
  function abrirPlaybook() {
    form = null; previa = null; vendo = null; modo = "playbook";
    if (window.ResultadoPlaybook) window.ResultadoPlaybook.reiniciar();
    var ab = document.querySelector('[data-aba="resultado-holos"]');
    if (ab && !(ab.classList.contains("ativa") || ab.getAttribute("aria-selected") === "true")) ab.click(); else pintar();
  }
  function sairPlaybook(id) {
    if (id) { form = null; previa = null; vendo = { id: id, visao: "paciente" }; modo = "ver"; }
    else { modo = "lista"; }
    pintar();
  }

  /* abre a aba Resultado HOLOS ja na versao pedida (visao da paciente por padrao) ou no editor de nova versao */
  function abrirResultado(id, visao, editar) {
    var r = porId(id);
    if (!r) return false;
    previa = null;
    if (editar) { form = novoForm(pacienteId(), r); vendo = null; modo = "editar"; }
    else { form = null; vendo = { id: id, visao: visao || "paciente" }; modo = "ver"; }
    var ab = document.querySelector('[data-aba="resultado-holos"]');
    if (ab) ab.click(); else pintar();
    return true;
  }

  window.ResultadoHolos = {
    receberHolosAI: receberHolosAI, gerarAutomatico: gerarAutomatico, abrirResultado: abrirResultado,
    prepararPlaybook: prepararPlaybook, gerarPorPlaybook: gerarPorPlaybook, previaPlaybook: previaPlaybook, abrirPlaybook: abrirPlaybook, sairPlaybook: sairPlaybook,
    desenhar: desenhar, carregar: carregar, doPaciente: doPaciente, porId: porId,
    documentoHtml: documentoHtml, radarSvg: radarSvg, contextoSugestoes: contextoSugestoes, formAtual: function () { return form; }, AVISO_INDICE: AVISO_INDICE, FAIXA_PACIENTE: FAIXA_PACIENTE, relatorioProfissionalHtml: relatorioProfissionalHtml,
    /** para o Relatorio e, no futuro, a HOLOS AI: o snapshot salvo, estruturado (nunca a ficha viva) */
    snapshotSalvo: function (id) { var r = porId(id); return r && r.status !== "rascunho" ? JSON.parse(JSON.stringify(r.content_snapshot)) : null; },
    esquecer: function () { cache = { pid: null, linhas: [], erro: null, carregado: false }; modo = "lista"; form = null; vendo = null; previa = null; }
  };
})();
