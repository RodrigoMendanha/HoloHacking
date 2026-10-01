/* ===========================================================================
   CONDUTA CLINICA e ACORDOS — V1, Etapa 2
   ===========================================================================

   A conduta pertence a UM atendimento (encounters). Cada revisao e uma linha
   em `conducts`; os acordos de cada revisao ficam em `agreements`. RASCUNHO e
   editavel; SALVO/REVISADO sao imutaveis — corrigir cria revisao nova e a
   anterior fica, com o que foi mantido, alterado ou encerrado anotado.

   A conduta NAO depende de nota, faixa, Indice, HOLOSCAN completo nem
   ferramenta. Nao prescreve medicamento. Nenhum alerta, limiar ou diagnostico
   e inventado. Estados do acordo (proposto … encerrado) sao desenho funcional,
   nunca adesao; nada muda de estado sozinho.

   Retorno: na abertura de um atendimento, a conduta vigente do atendimento
   ANTERIOR do paciente e mostrada (acordos, estados, retorno planejado,
   observacoes). Nada e transportado automaticamente: continuar, substituir
   ou encerrar e decisao da profissional, com justificativa.

   Com sessao: RPC salvar_conduta. Sem sessao (localhost): memoria.
   =========================================================================== */

(function () {
  "use strict";

  var CAMPOS = [
    ["objective", "Objetivo da etapa"], ["nutrition_strategy", "Estratégia nutricional"], ["actions", "Ações"],
    ["resources", "Recursos"], ["requested_exams", "Exames solicitados (quando pertinente)"], ["referrals", "Encaminhamentos"],
    ["monitoring", "Monitoramento"], ["return_plan", "Retorno"], ["observations", "Observações"],
    ["nutrition_diagnosis", "Diagnóstico nutricional (quando utilizado)"],
    ["dietary_prescription", "Prescrição dietética (quando utilizada)"],
    ["professional_guidance", "Orientações profissionais"]
  ];
  var ESTADOS_ACORDO = [["proposto", "Proposto"], ["acordado", "Acordado"], ["em_acompanhamento", "Em acompanhamento"],
    ["concluido", "Concluído"], ["revisto", "Revisto"], ["encerrado", "Encerrado"]];
  var DECISOES = [["continuar", "Continuar"], ["substituir", "Substituir"], ["encerrar", "Encerrar"]];
  var ROTULO = {}; ESTADOS_ACORDO.concat(DECISOES).forEach(function (p) { ROTULO[p[0]] = p[1]; });
  var MSG_SEM_ATENDIMENTO = "Selecione ou inicie um atendimento para registrar a conduta.";

  var cache = [], acordos = [], locais = [], locaisAcordos = [];
  var carregando = false;
  var rascunho = null;     // { id|null, corrigeDe|null, encounter_id, campos..., agreements: [] }
  var estadoSalvo = "";
  var vendo = null;
  var escapar = window.escapar;
  var ouvintes = [];

  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function novoId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); });
  }
  function agora() { return new Date().toISOString(); }
  function consolidada(c) { return c && (c.status === "salvo" || c.status === "revisado"); }
  function avisarMudanca() { ouvintes.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }

  /* ---------- dados ------------------------------------------------------------ */

  function carregar() {
    if (!temSupa()) { cache = locais.slice(); acordos = locaisAcordos.slice(); return Promise.resolve(cache); }
    var R = window.DadosRouter; if (!R) return Promise.resolve(cache);
    carregando = true;
    return Promise.all([
      Promise.resolve(R.from("condutas").select("*").order("created_at", { ascending: true })),
      Promise.resolve(R.from("acordos").select("*").order("position", { ascending: true }))
    ]).then(function (r) {
      if (r[0] && !r[0].error && Array.isArray(r[0].data)) cache = r[0].data;
      if (r[1] && !r[1].error && Array.isArray(r[1].data)) acordos = r[1].data;
      return cache;
    }).catch(function (e) { console.error("[conduta] carregar:", e); return cache; })
      .finally(function () { carregando = false; });
  }
  function doAtendimento(eid) {
    return cache.filter(function (c) { return c.encounter_id === eid; })
      .sort(function (a, b) { return a.revision_number - b.revision_number; }).map(function (c) { return Object.assign({}, c); });
  }
  function vigente(eid) { var l = doAtendimento(eid).filter(consolidada); return l.length ? l[l.length - 1] : null; }
  function rascunhoDe(eid) { return doAtendimento(eid).filter(function (c) { return c.status === "rascunho"; })[0] || null; }
  function doPaciente(pid) { return cache.filter(function (c) { return c.patient_id === pid; }).map(function (c) { return Object.assign({}, c); }); }
  function acordosDe(cid) {
    return acordos.filter(function (a) { return a.conduct_id === cid; })
      .sort(function (a, b) { return (a.position || 0) - (b.position || 0) || String(a.created_at).localeCompare(String(b.created_at)); })
      .map(function (a) { return Object.assign({}, a); });
  }
  /** A conduta vigente do atendimento ANTERIOR do paciente (retorno). */
  function anteriorDe(pid, eid) {
    var A = window.AtendimentoAtual; if (!A) return null;
    var atual = A.porId(eid);
    var ref = atual ? String(atual.occurred_at) : "";
    var candidatos = A.doPaciente(pid).filter(function (e) { return e.id !== eid && (!ref || String(e.occurred_at) <= ref); })
      .sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
    for (var i = 0; i < candidatos.length; i++) { var v = vigente(candidatos[i].id); if (v) return v; }
    return null;
  }

  /* ---------- gravar ------------------------------------------------------------ */

  function gravarLocal(p) {
    var status = p.status || "rascunho";
    if (p.operation_id) { var ja = locais.filter(function (x) { return x.operation_id === p.operation_id; })[0]; if (ja) return Promise.resolve(ja.id); }
    var atual = p.id ? locais.filter(function (x) { return x.id === p.id; })[0] : null;
    var eid = atual ? atual.encounter_id : p.encounter_id;
    var e = window.AtendimentoAtual && window.AtendimentoAtual.porId(eid);
    if (!e) return Promise.reject(new Error("atendimento nao encontrado"));
    if (!atual) atual = locais.filter(function (x) { return x.encounter_id === eid && x.status === "rascunho"; })[0] || null;
    var campos = {};
    CAMPOS.forEach(function (c) { campos[c[0]] = p[c[0]] != null ? p[c[0]] : (atual ? atual[c[0]] : null); });
    var alvo;
    if (atual && atual.status === "rascunho") {
      if (p.expected_updated_at && atual.updated_at !== p.expected_updated_at) return Promise.reject(new Error("conflito"));
      Object.assign(atual, campos, { status: status, priorities: p.priorities || atual.priorities, related_tools: p.related_tools || atual.related_tools,
        references: p.references || atual.references, previous_conduct_id: p.previous_conduct_id || atual.previous_conduct_id,
        previous_decision: p.previous_decision || atual.previous_decision, previous_decision_note: p.previous_decision_note != null ? p.previous_decision_note : atual.previous_decision_note,
        revision_note: p.revision_note || atual.revision_note, updated_at: agora(), reviewed_at: status === "revisado" ? agora() : null });
      alvo = atual;
    } else {
      var rev = locais.filter(function (x) { return x.encounter_id === eid; }).length + 1;
      alvo = Object.assign({ id: novoId(), nutritionist_id: null, patient_id: e.patient_id, encounter_id: eid, revision_number: rev, status: status,
        priorities: p.priorities || (atual ? atual.priorities : []), related_tools: p.related_tools || (atual ? atual.related_tools : []),
        references: p.references || (atual ? atual.references : {}),
        previous_conduct_id: p.previous_conduct_id || (atual ? atual.previous_conduct_id : null),
        previous_decision: p.previous_decision || (atual ? atual.previous_decision : null),
        previous_decision_note: p.previous_decision_note || (atual ? atual.previous_decision_note : null),
        supersedes_id: atual ? atual.id : null, superseded_at: null, revision_note: p.revision_note || null,
        reviewed_at: status === "revisado" ? agora() : null, reviewed_by: null, operation_id: p.operation_id || null,
        created_at: agora(), updated_at: agora() }, campos);
      if (atual) atual.superseded_at = agora();
      locais.push(alvo);
    }
    if (Array.isArray(p.agreements)) {
      var mantidos = [];
      p.agreements.forEach(function (g, i) {
        var ex = g.id ? locaisAcordos.filter(function (x) { return x.id === g.id && x.conduct_id === alvo.id; })[0] : null;
        if (!ex && g.operation_id) ex = locaisAcordos.filter(function (x) { return x.operation_id === g.operation_id; })[0];
        if (ex) { if (g.status && g.status !== ex.status) ex.status_changed_at = agora(); Object.assign(ex, { description: g.description, responsible: g.responsible || null, due_text: g.due_text || null, follow_up: g.follow_up || null, status: g.status || ex.status, status_note: g.status_note || null, position: i, updated_at: agora() }); }
        else { ex = { id: novoId(), nutritionist_id: null, patient_id: e.patient_id, conduct_id: alvo.id, description: g.description, responsible: g.responsible || null, due_text: g.due_text || null, follow_up: g.follow_up || null, status: g.status || "proposto", status_note: g.status_note || null, status_changed_at: null, position: i, origin_agreement_id: g.origin_agreement_id || null, operation_id: g.operation_id || null, created_at: agora(), updated_at: agora() }; locaisAcordos.push(ex); }
        mantidos.push(ex.id);
      });
      if (p.status === "rascunho" || alvo.status === "rascunho") locaisAcordos = locaisAcordos.filter(function (x) { return x.conduct_id !== alvo.id || mantidos.indexOf(x.id) >= 0; });
    }
    return Promise.resolve(alvo.id);
  }

  function salvar(payload) {
    if (!payload || (!payload.encounter_id && !payload.id)) return Promise.reject(new Error("conduta sem atendimento"));
    var p = Object.assign({ operation_id: novoId() }, payload);
    (p.agreements || []).forEach(function (g) { if (!g.operation_id) g.operation_id = novoId(); });
    var feito = temSupa()
      ? Promise.resolve(window.supabaseClient.rpc("salvar_conduta", { payload: p })).then(function (r) {
          if (!r || r.error) throw (r && r.error) || new Error("sem resposta do servidor"); return r.data; })
      : gravarLocal(p);
    return feito.then(function (id) { return carregar().then(function () { avisarMudanca(); return cache.filter(function (c) { return c.id === id; })[0] || { id: id }; }); });
  }

  /** Muda a situacao de UM acordo (acao explicita). */
  function mudarAcordo(id, status, nota) {
    var g = acordos.filter(function (x) { return x.id === id; })[0];
    if (!g) return Promise.reject(new Error("acordo nao encontrado"));
    var feito;
    if (!temSupa()) {
      var l = locaisAcordos.filter(function (x) { return x.id === id; })[0];
      if (l.status !== status) l.status_changed_at = agora();
      l.status = status; l.status_note = nota || null; l.updated_at = agora();
      feito = Promise.resolve();
    } else {
      feito = Promise.resolve(window.DadosRouter.from("acordos").update({ status: status, status_note: nota || null }).eq("id", id).eq("updated_at", g.updated_at).select())
        .then(function (r) {
          if (!r || r.error) throw (r && r.error) || new Error("sem resposta");
          var linhas = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []);
          if (!linhas.length) throw new Error("conflito: o acordo foi alterado em outro lugar; recarregue");
        });
    }
    return feito.then(function () { return carregar(); }).then(function () { avisarMudanca(); return acordos.filter(function (x) { return x.id === id; })[0]; });
  }

  /* ---------- texto bruto (contexto, exportacao) -------------------------------- */

  function textoBruto(c) {
    if (!c || !consolidada(c)) return "";
    var t = "";
    if ((c.priorities || []).length) t += "- Prioridades: " + c.priorities.join("; ") + "\n";
    CAMPOS.forEach(function (f) { if (c[f[0]]) t += "- " + f[1] + ": " + c[f[0]] + "\n"; });
    var ag = acordosDe(c.id);
    if (ag.length) { t += "- Acordos:\n"; ag.forEach(function (g) { t += "  - " + g.description + " [" + (ROTULO[g.status] || g.status) + "]" + (g.responsible ? " · responsável: " + g.responsible : "") + (g.due_text ? " · " + g.due_text : "") + (g.follow_up ? " · acompanhamento: " + g.follow_up : "") + "\n"; }); }
    if (c.previous_decision) t += "- Em relação à conduta anterior: " + (ROTULO[c.previous_decision] || c.previous_decision) + (c.previous_decision_note ? " — " + c.previous_decision_note : "") + "\n";
    return t;
  }

  /* ---------- a tela ------------------------------------------------------------ */

  function atendimentoAtivo() {
    var A = window.AtendimentoAtual; var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
    var e = A && A.atual ? A.atual() : null; return e && e.patient_id === pid ? e : null;
  }
  function textoEstado() {
    return { "": "", salvando: "Salvando…", rascunho: "Rascunho salvo", salvo: "Salvo", revisado: "Revisado",
             falha: "Não foi possível salvar — nada mudou no servidor", conflito: "Alterada em outro lugar — recarregue antes de salvar" }[estadoSalvo] || "";
  }
  function mostrarEstado(s) { estadoSalvo = s; var el = document.getElementById("cd-estado"); if (el) el.textContent = textoEstado(); }

  function rascunhoVazio(e) {
    var r = { id: null, corrigeDe: null, encounter_id: e.id, priorities: [], related_tools: [], references: {}, agreements: [],
      previous_conduct_id: null, previous_decision: null, previous_decision_note: "" };
    CAMPOS.forEach(function (c) { r[c[0]] = ""; });
    return r;
  }
  function deLinha(c) {
    var r = { id: c.status === "rascunho" ? c.id : null, corrigeDe: c.status === "rascunho" ? null : c.id, encounter_id: c.encounter_id,
      priorities: (c.priorities || []).slice(), related_tools: (c.related_tools || []).slice(), references: JSON.parse(JSON.stringify(c.references || {})),
      previous_conduct_id: c.previous_conduct_id || null, previous_decision: c.previous_decision || null, previous_decision_note: c.previous_decision_note || "",
      updated_at: c.updated_at,
      agreements: acordosDe(c.id).map(function (g) { return { id: c.status === "rascunho" ? g.id : null, origin_agreement_id: c.status === "rascunho" ? g.origin_agreement_id : g.id,
        description: g.description, responsible: g.responsible, due_text: g.due_text, follow_up: g.follow_up, status: g.status, status_note: g.status_note }; }) };
    CAMPOS.forEach(function (f) { r[f[0]] = c[f[0]] || ""; });
    return r;
  }

  function acordoHtml(g, i, editavel, origem) {
    if (!editavel) {
      return '<li class="cd-acordo" data-acordo="' + escapar(g.id || "") + '"><b>' + escapar(g.description) + "</b>" +
        ' <span class="cd-acordo-estado ' + escapar(g.status) + '">' + escapar(ROTULO[g.status] || g.status) + "</span>" +
        (g.responsible ? " · " + escapar(g.responsible) : "") + (g.due_text ? " · " + escapar(g.due_text) : "") +
        (g.follow_up ? " · acompanhamento: " + escapar(g.follow_up) : "") + (g.status_note ? " · " + escapar(g.status_note) : "") +
        (origem ? ' <span class="cd-acoes-inline">' + ESTADOS_ACORDO.map(function (s) { return s[0] === g.status ? "" : '<button type="button" class="btn-fantasma" data-cd-acordo-estado="' + escapar(g.id) + '" data-cd-estado="' + s[0] + '">' + escapar(s[1]) + "</button>"; }).join("") + "</span>" : "") +
        "</li>";
    }
    return '<li class="cd-acordo edit" data-cd-i="' + i + '">' +
      '<input type="text" data-cd-g="description" placeholder="Descrição concreta do acordo" value="' + escapar(g.description || "") + '">' +
      '<div class="an-linha">' +
        '<input type="text" data-cd-g="responsible" placeholder="responsável (quando relevante)" value="' + escapar(g.responsible || "") + '">' +
        '<input type="text" data-cd-g="due_text" placeholder="prazo ou ocasião" value="' + escapar(g.due_text || "") + '">' +
        '<input type="text" data-cd-g="follow_up" placeholder="forma de acompanhamento" value="' + escapar(g.follow_up || "") + '">' +
        '<select data-cd-g="status">' + ESTADOS_ACORDO.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === (g.status || "proposto") ? " selected" : "") + ">" + escapar(s[1]) + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="btn-fantasma" data-cd-remover="' + i + '">remover</button>' +
      "</div>" +
      (g.origin_agreement_id ? '<span class="an-selo previo">vem da conduta anterior</span>' : "") +
    "</li>";
  }

  function referenciasHtml(pid, refs, editavel) {
    var S = window.Sincronizacao, A = window.AtendimentoAtual;
    var holos = []; try { holos = (S && S.holoscanConsolidado ? S.holoscanConsolidado(pid) : []) || []; } catch (e) {}
    var historico = (window.Panorama && window.Panorama.doPaciente) ? (window.Panorama.doPaciente(pid).historico || []) : [];
    var holoIds = historico.filter(function (h) { return h._supa_id; }).map(function (h) { return { id: h._supa_id, rot: "HOLOSCAN de " + (window.dataBR ? window.dataBR(h.quando) : h.quando) }; });
    var ferr = (window.Aplicacoes && window.Aplicacoes.doPaciente ? window.Aplicacoes.doPaciente(pid) : []).filter(function (a) { return a.id && a.status !== "rascunho"; })
      .map(function (a) { return { id: a.id, rot: a.ferramenta_id + " (" + String(a.concluida_em || a.iniciada_em || "").slice(0, 10) + ")" }; });
    var col = (S && S.coletas ? S.coletas(pid) : []) || [];
    var colIds = col.map(function (c) { return { id: c.id, rot: "coleta " + (c.coletado_em ? (window.dataBR ? window.dataBR(c.coletado_em) : c.coletado_em) : "sem data") }; });
    var enc = (A ? A.doPaciente(pid) : []).map(function (e) { return { id: e.id, rot: "atendimento " + A.rotuloQuando(e) }; });
    var grupos = [["holoscan_application_ids", "HOLOSCAN", holoIds], ["tool_application_ids", "Ferramentas", ferr], ["lab_collection_ids", "Coletas", colIds], ["previous_encounter_ids", "Atendimentos", enc]];
    var html = '<details class="an-dominio" id="cd-referencias"><summary><b>Referências clínicas</b> <span class="an-conta">por ID, sem copiar</span></summary>';
    grupos.forEach(function (gr) {
      var sel = (refs || {})[gr[0]] || [];
      if (!gr[2].length && !sel.length) return;
      html += '<div class="cd-ref-grupo"><span class="fic-rot">' + gr[1] + "</span>";
      if (editavel) gr[2].forEach(function (o) { html += '<label class="an-check"><input type="checkbox" data-cd-ref="' + gr[0] + '" value="' + escapar(o.id) + '"' + (sel.indexOf(o.id) >= 0 ? " checked" : "") + "> " + escapar(o.rot) + "</label>"; });
      else sel.forEach(function (id) { var o = gr[2].filter(function (x) { return x.id === id; })[0]; html += "<span class=\"an-medida\">" + escapar(o ? o.rot : id) + "</span> "; });
      html += "</div>";
    });
    return html + "</details>";
  }

  function anteriorHtml(ant, pid, editavel) {
    if (!ant) return "";
    var A = window.AtendimentoAtual, e = A && A.porId(ant.encounter_id);
    var ag = acordosDe(ant.id);
    var html = '<div class="dash-bloco dash-bloco-compacto cd-anterior" id="cd-anterior">' +
      '<h3 class="dash-titulo">Conduta anterior (retorno)</h3>' +
      '<p class="dash-sub">Atendimento de ' + escapar(e ? A.rotuloQuando(e) : "?") + " · rev. " + ant.revision_number + " · " + ant.status +
        ". O que foi feito, o que ajudou e as barreiras são conversa do retorno; nada aqui é presumido.</p>";
    if (ant.objective) html += "<p><b>Objetivo:</b> " + escapar(ant.objective) + "</p>";
    if (ant.return_plan) html += "<p><b>Retorno planejado:</b> " + escapar(ant.return_plan) + "</p>";
    if (ant.observations) html += "<p><b>Observações:</b> " + escapar(ant.observations) + "</p>";
    html += ag.length ? '<ul class="cd-acordos">' + ag.map(function (g) { return acordoHtml(g, 0, false, true); }).join("") + "</ul>" : '<p class="dash-vazio">Sem acordos registrados na conduta anterior.</p>';
    if (editavel) {
      html += '<div class="an-linha cd-decisao">' +
        '<label>Em relação à conduta anterior: <select id="cd-decisao">' + '<option value="">— decidir —</option>' +
          DECISOES.map(function (d) { return '<option value="' + d[0] + '"' + (rascunho && rascunho.previous_decision === d[0] ? " selected" : "") + ">" + escapar(d[1]) + "</option>"; }).join("") + "</select></label>" +
        '<input type="text" id="cd-decisao-nota" placeholder="justificativa profissional" value="' + escapar(rascunho ? (rascunho.previous_decision_note || "") : "") + '">' +
        (ag.length ? '<button type="button" class="perf-botao" data-cd-levar="' + escapar(ant.id) + '">Levar acordos para esta conduta</button>' : "") +
      "</div>";
    } else if (vigente && rascunho === null) { /* leitura */ }
    return html + "</div>";
  }

  function revisoesHtml(lista) {
    if (!lista.length) return "";
    return '<div class="an-revisoes"><span class="fic-rot">Revisões deste atendimento</span><ul>' + lista.map(function (c) {
      return "<li" + (c.status === "rascunho" ? ' class="rascunho"' : "") + '><b>rev. ' + c.revision_number + "</b> · " + c.status +
        (c.reviewed_at ? " · revisada em " + escapar(window.dataBR ? window.dataBR(c.reviewed_at.slice(0, 10)) : c.reviewed_at) : "") +
        (c.superseded_at ? " · substituída" : "") + (c.revision_note ? " · " + escapar(c.revision_note) : "") +
        (consolidada(c) && c.superseded_at ? ' <button type="button" class="btn-fantasma" data-cd-ver="' + c.id + '">ver</button>' : "") + "</li>";
    }).join("") + "</ul></div>";
  }

  function desenhar() {
    var alvo = document.getElementById("aba-conduta"); if (!alvo) return;
    var e = atendimentoAtivo();
    if (!e) {
      rascunho = null;
      alvo.innerHTML = '<div class="lista-vazia" id="cd-sem-atendimento"><strong>' + MSG_SEM_ATENDIMENTO + "</strong>" +
        "<span>A conduta pertence a um atendimento. Na aba Atendimentos, selecione um ou inicie um novo.</span></div>";
      return;
    }
    var pid = e.patient_id, A = window.AtendimentoAtual;
    var nome = window.pacienteAtivoNome ? window.pacienteAtivoNome() : "Paciente";
    var lista = doAtendimento(e.id), rasc = rascunhoDe(e.id), vig = vigente(e.id);
    var anterior = anteriorDe(pid, e.id);
    var arquivado = window.pacienteArquivado && window.pacienteArquivado(pid);
    if (rasc && (!rascunho || rascunho.id !== rasc.id)) rascunho = deLinha(rasc);
    if (!rasc && rascunho && rascunho.id) rascunho = null;

    var html = '<div class="an-topo"><div><span class="fic-rot">Conduta</span><b>' + escapar(nome) + "</b> · atendimento de " + escapar(A.rotuloQuando(e)) + "</div>" +
      '<span class="an-salvo" id="cd-estado" role="status" aria-live="polite">' + escapar(textoEstado()) + "</span></div>";
    if (vig) html += '<p class="perf-ajuda">Revisão vigente: <b>rev. ' + vig.revision_number + " · " + vig.status + "</b>.</p>";
    html += revisoesHtml(lista);

    var mostrar = null, editavel = false, titulo = "";
    if (vendo) { mostrar = lista.filter(function (c) { return c.id === vendo; })[0]; titulo = mostrar ? "Revisão " + mostrar.revision_number + " (histórico, somente leitura)" : ""; }
    if (!mostrar && rascunho) { mostrar = rascunho; editavel = !arquivado; titulo = rascunho.id ? "Rascunho em edição" : (rascunho.corrigeDe ? "Correção (nova revisão, ainda não salva)" : "Nova conduta (ainda não salva)"); }
    if (!mostrar && vig) { mostrar = vig; titulo = "Revisão vigente (rev. " + vig.revision_number + ")"; }

    html += '<div class="an-acoes">';
    if (vendo) html += '<button type="button" class="perf-botao" data-cd-acao="fechar-ver">Voltar</button>';
    else if (!rascunho && !vig && !arquivado) html += '<button type="button" class="btn-verde" data-cd-acao="nova">Iniciar conduta</button>';
    else if (!rascunho && vig && !arquivado) {
      html += '<button type="button" class="perf-botao" data-cd-acao="corrigir">Revisar (nova revisão)</button>';
      if (vig.status === "salvo") html += '<button type="button" class="btn-dourado" data-cd-acao="revisar">Marcar como revisada</button>';
    } else if (rascunho && !arquivado) {
      html += '<button type="button" class="perf-botao" data-cd-acao="rascunho">Salvar rascunho</button>' +
        '<button type="button" class="btn-verde" data-cd-acao="salvar">Salvar</button>' +
        (rascunho.corrigeDe || (rascunho.id && vig) ? '<button type="button" class="btn-fantasma" data-cd-acao="descartar">Descartar</button>' : "");
    }
    html += "</div>";

    html += anteriorHtml(anterior, pid, editavel);

    if (mostrar) {
      html += '<p class="an-titulo"><b>' + escapar(titulo) + "</b></p>" +
        '<p class="perf-ajuda">Nenhum campo é obrigatório. A conduta não depende de nota, faixa, Índice, HOLOSCAN completo nem ferramenta.</p>';
      if (editavel) {
        html += '<div class="perf-campo largo"><label for="cd-prioridades">Prioridades selecionadas (uma por linha)</label>' +
          '<textarea id="cd-prioridades" rows="3">' + escapar((mostrar.priorities || []).join("\n")) + "</textarea></div>";
        CAMPOS.forEach(function (f) {
          html += '<div class="perf-campo largo"><label for="cd-' + f[0] + '">' + escapar(f[1]) + "</label>" +
            '<textarea id="cd-' + f[0] + '" data-cd-campo="' + f[0] + '" rows="2">' + escapar(mostrar[f[0]] || "") + "</textarea></div>";
        });
        var cat = window.CATALOGO_FERRAMENTAS || [];
        html += '<details class="an-dominio"><summary><b>Ferramentas relacionadas</b></summary>' + cat.map(function (f) {
          return '<label class="an-check"><input type="checkbox" data-cd-tool="' + escapar(f.id) + '"' + ((mostrar.related_tools || []).indexOf(f.id) >= 0 ? " checked" : "") + "> " + escapar(f.titulo) + "</label>";
        }).join("") + "</details>";
        html += referenciasHtml(pid, mostrar.references, true);
        html += '<div class="cd-acordos-bloco"><span class="fic-rot">Acordos</span><ul class="cd-acordos" id="cd-acordos">' +
          (mostrar.agreements || []).map(function (g, i) { return acordoHtml(g, i, true); }).join("") + "</ul>" +
          '<button type="button" class="btn-fantasma" data-cd-acao="add-acordo">+ adicionar acordo</button></div>';
        if (rascunho.corrigeDe) html += '<div class="perf-campo largo"><label for="cd-nota">O que foi mantido, alterado ou encerrado nesta revisão</label><input type="text" id="cd-nota" value="' + escapar(rascunho.nota || "") + '"></div>';
      } else {
        if ((mostrar.priorities || []).length) html += "<p><b>Prioridades:</b> " + escapar(mostrar.priorities.join("; ")) + "</p>";
        CAMPOS.forEach(function (f) { if (mostrar[f[0]]) html += '<p class="cd-campo"><b>' + escapar(f[1]) + ":</b> " + escapar(mostrar[f[0]]) + "</p>"; });
        if ((mostrar.related_tools || []).length) html += "<p><b>Ferramentas relacionadas:</b> " + escapar(mostrar.related_tools.join(", ")) + "</p>";
        html += referenciasHtml(pid, mostrar.references, false);
        var ag = acordosDe(mostrar.id);
        html += '<div class="cd-acordos-bloco"><span class="fic-rot">Acordos</span>' + (ag.length ? '<ul class="cd-acordos" id="cd-acordos">' + ag.map(function (g) { return acordoHtml(g, 0, false, consolidada(mostrar) && !mostrar.superseded_at && !arquivado); }).join("") + "</ul>" : '<p class="dash-vazio">Nenhum acordo registrado.</p>') + "</div>";
        if (mostrar.previous_decision) html += "<p><b>Conduta anterior:</b> " + escapar(ROTULO[mostrar.previous_decision]) + (mostrar.previous_decision_note ? " — " + escapar(mostrar.previous_decision_note) : "") + "</p>";
      }
    }
    alvo.innerHTML = html;
  }

  function lerFormulario() {
    if (!rascunho) return;
    var alvo = document.getElementById("aba-conduta"); if (!alvo) return;
    var pr = document.getElementById("cd-prioridades");
    if (pr) rascunho.priorities = pr.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    CAMPOS.forEach(function (f) { var el = alvo.querySelector('[data-cd-campo="' + f[0] + '"]'); if (el) rascunho[f[0]] = el.value; });
    rascunho.related_tools = [].slice.call(alvo.querySelectorAll("[data-cd-tool]:checked")).map(function (c) { return c.dataset.cdTool; });
    var refs = {};
    alvo.querySelectorAll("[data-cd-ref]:checked").forEach(function (c) { (refs[c.dataset.cdRef] = refs[c.dataset.cdRef] || []).push(c.value); });
    if (alvo.querySelector("#cd-referencias")) rascunho.references = refs;
    var dec = document.getElementById("cd-decisao"), nota = document.getElementById("cd-decisao-nota");
    if (dec) rascunho.previous_decision = dec.value || null;
    if (nota) rascunho.previous_decision_note = nota.value;
    var rn = document.getElementById("cd-nota"); if (rn) rascunho.nota = rn.value;
    var lista = [];
    alvo.querySelectorAll("#cd-acordos .cd-acordo.edit").forEach(function (li, i) {
      var g = function (n) { var x = li.querySelector('[data-cd-g="' + n + '"]'); return x ? x.value : ""; };
      var antigo = (rascunho.agreements || [])[Number(li.dataset.cdI)] || {};
      lista.push({ id: antigo.id || null, origin_agreement_id: antigo.origin_agreement_id || null, operation_id: antigo.operation_id || null,
        description: g("description"), responsible: g("responsible"), due_text: g("due_text"), follow_up: g("follow_up"), status: g("status") || "proposto", status_note: antigo.status_note || null, position: i });
    });
    if (alvo.querySelector("#cd-acordos")) rascunho.agreements = lista;
  }

  function gravar(status) {
    var e = atendimentoAtivo();
    if (!e) { if (window.avisar) window.avisar(MSG_SEM_ATENDIMENTO); return Promise.resolve(null); }
    if (!rascunho) return Promise.resolve(null);
    lerFormulario();
    var vazios = (rascunho.agreements || []).filter(function (g) { return !String(g.description || "").trim(); });
    if (vazios.length) { if (window.avisar) window.avisar("Todo acordo precisa de uma descrição concreta (ou remova o acordo vazio)."); return Promise.resolve(null); }
    var ant = anteriorDe(e.patient_id, e.id);
    mostrarEstado("salvando");
    var payload = { id: rascunho.corrigeDe || rascunho.id || null, encounter_id: e.id, status: status, priorities: rascunho.priorities,
      related_tools: rascunho.related_tools, references: rascunho.references, agreements: rascunho.agreements,
      previous_conduct_id: ant ? ant.id : (rascunho.previous_conduct_id || null), previous_decision: rascunho.previous_decision || null,
      previous_decision_note: rascunho.previous_decision_note || null, revision_note: rascunho.nota || null,
      expected_updated_at: rascunho.corrigeDe ? null : (rascunho.updated_at || null) };
    CAMPOS.forEach(function (f) { payload[f[0]] = rascunho[f[0]] || null; });
    return salvar(payload).then(function (c) {
      rascunho = status === "rascunho" ? deLinha(cache.filter(function (x) { return x.id === c.id; })[0]) : null;
      vendo = null; desenhar(); mostrarEstado(status);
      if (window.avisar) window.avisar(status === "rascunho" ? "Rascunho da conduta salvo." : "Conduta salva (rev. " + c.revision_number + ").");
      return c;
    }).catch(function (err) {
      console.error("[conduta] salvar:", err);
      mostrarEstado(/conflito|alterada em outro lugar/i.test(err && err.message) ? "conflito" : "falha");
      if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err) : "Não foi possível salvar a conduta. Nada foi gravado; tente de novo.");
      return null;
    });
  }

  function ligar() {
    var alvo = document.getElementById("aba-conduta"); if (!alvo) return;
    alvo.addEventListener("click", function (ev) {
      var e = atendimentoAtivo(); if (!e) return;
      var b = ev.target.closest("[data-cd-acao]");
      if (b) {
        var acao = b.dataset.cdAcao;
        if (acao === "nova") { rascunho = rascunhoVazio(e); vendo = null; desenhar(); return; }
        if (acao === "corrigir") { var vig = vigente(e.id); if (!vig) return; rascunho = deLinha(vig); vendo = null; desenhar(); return; }
        if (acao === "descartar") { rascunho = null; vendo = null; desenhar(); return; }
        if (acao === "rascunho") { gravar("rascunho"); return; }
        if (acao === "salvar") { gravar("salvo"); return; }
        if (acao === "revisar") {
          var v2 = vigente(e.id); if (!v2) return; mostrarEstado("salvando");
          salvar({ id: v2.id, status: "revisado" }).then(function () { desenhar(); mostrarEstado("revisado"); })
            .catch(function (err) { mostrarEstado("falha"); if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err) : "Não foi possível marcar como revisada."); });
          return;
        }
        if (acao === "fechar-ver") { vendo = null; desenhar(); return; }
        if (acao === "add-acordo" && rascunho) { lerFormulario(); rascunho.agreements.push({ description: "", status: "proposto" }); desenhar(); mostrarEstado(""); return; }
      }
      var ver = ev.target.closest("[data-cd-ver]"); if (ver) { lerFormulario(); vendo = ver.dataset.cdVer; desenhar(); return; }
      var rem = ev.target.closest("[data-cd-remover]"); if (rem && rascunho) { lerFormulario(); rascunho.agreements.splice(Number(rem.dataset.cdRemover), 1); desenhar(); mostrarEstado(""); return; }
      var levar = ev.target.closest("[data-cd-levar]");
      if (levar && rascunho) {
        lerFormulario();
        acordosDe(levar.dataset.cdLevar).forEach(function (g) {
          if (rascunho.agreements.some(function (x) { return x.origin_agreement_id === g.id; })) return;
          rascunho.agreements.push({ origin_agreement_id: g.id, description: g.description, responsible: g.responsible, due_text: g.due_text, follow_up: g.follow_up, status: "proposto" });
        });
        desenhar(); mostrarEstado("");
        if (window.avisar) window.avisar("Acordos copiados como propostos; a situação de cada um é decisão sua.");
        return;
      }
      var est = ev.target.closest("[data-cd-acordo-estado]");
      if (est) {
        var id = est.dataset.cdAcordoEstado, novo = est.dataset.cdEstado;
        if (!window.abrirModalConfirmar) return;
        window.abrirModalConfirmar({ titulo: "Mudar situação do acordo", corpo: "<p>Nova situação: <b>" + escapar(ROTULO[novo]) + "</b>. Isto é registro do combinado, não avaliação de adesão.</p>" +
          '<div class="perf-campo largo"><label for="cd-acordo-nota">Nota (opcional)</label><input type="text" id="cd-acordo-nota"></div>',
          botaoConfirmar: "Registrar", classeConfirmar: "btn-verde" }).then(function (r) {
          if (r !== "confirmar") return;
          var n = document.getElementById("cd-acordo-nota");
          mudarAcordo(id, novo, n ? n.value.trim() : "").then(function () { desenhar(); })
            .catch(function (err) { if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err) : "Não foi possível registrar a situação do acordo."); });
        });
      }
    });
    alvo.addEventListener("input", function () { if (rascunho && estadoSalvo !== "salvando") mostrarEstado(""); });
    alvo.addEventListener("change", function () { if (rascunho && estadoSalvo !== "salvando") mostrarEstado(""); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("aba-conduta")) return;
    ligar(); carregar();
    if (window.AtendimentoAtual && window.AtendimentoAtual.aoMudar) window.AtendimentoAtual.aoMudar(function () { rascunho = null; vendo = null; estadoSalvo = ""; if (document.getElementById("aba-conduta")) desenhar(); });
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () { if (typeof anterior === "function") anterior(); rascunho = null; vendo = null; estadoSalvo = ""; };
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function (estado) { if (estado === "pendente") return; if (estado !== "autenticado") { cache = []; acordos = []; rascunho = null; } carregar(); });
  });

  window.Conduta = {
    MSG_SEM_ATENDIMENTO: MSG_SEM_ATENDIMENTO, CAMPOS: CAMPOS, ESTADOS_ACORDO: ESTADOS_ACORDO, DECISOES: DECISOES, rotulo: function (k) { return ROTULO[k] || k; },
    carregar: carregar, carregando: function () { return carregando; }, salvar: salvar, mudarAcordo: mudarAcordo,
    doAtendimento: doAtendimento, vigente: vigente, rascunhoDe: rascunhoDe, doPaciente: doPaciente, acordosDe: acordosDe, anteriorDe: anteriorDe,
    consolidada: consolidada, textoBruto: textoBruto, desenhar: desenhar, aoMudar: function (f) { if (typeof f === "function") ouvintes.push(f); },
    todosAcordos: function () { return acordos.map(function (a) { return Object.assign({}, a); }); },
    esquecer: function () { cache = []; acordos = []; locais = []; locaisAcordos = []; rascunho = null; vendo = null; }
  };
})();
