/* ===========================================================================
   RELATORIOS CLINICOS — V1, Etapa 3 (aba "Relatorio" da ficha)
   ===========================================================================

   Rascunho editavel -> emissao IMUTAVEL (report_emissions). O snapshot
   (source_snapshot + content_snapshot) e montado PELO SERVIDOR (RPC
   emitir_relatorio) a partir das fontes que a profissional ESCOLHEU uma a
   uma: atendimentos, anamneses consolidadas, aplicacoes do HOLOSCAN,
   coletas, ferramentas concluidas, condutas consolidadas (com acordos),
   documentos e a interpretacao profissional. Nada e selecionado por padrao;
   conteudo intimo (campos emocionais, sentido pessoal, respostas das
   ferramentas) so entra com a marcacao explicita.

   O que aparece "emitido" so aparece depois que o servidor confirmou.
   Retificacao = NOVA emissao (revision_number + 1) ligada pela
   supersedes_report_id; a original continua acessivel. Impressao/PDF: pelo
   navegador, a partir do snapshot — nunca da ficha viva. content_hash e um
   hash tecnico (sha256 do snapshot), nao assinatura digital.

   Metodologia nao homologada: o snapshot do HOLOSCAN traz so id, data,
   versao, cobertura bruta e interpretacao profissional; nenhuma nota, faixa,
   Indice ou Triada e apresentada como resultado oficial.
   =========================================================================== */

(function () {
  "use strict";

  var escapar = window.escapar;
  var TIPOS_CONTEUDO = {
    RELATO_DO_PACIENTE: "Relato do paciente", OBSERVACAO_PROFISSIONAL: "Observação profissional", DADO_MEDIDO: "Dado medido",
    DADO_DOCUMENTAL: "Dado documental", INDICADOR_CALCULADO: "Indicador calculado", TEXTO_ASSISTIDO: "Texto assistido"
  };
  var PENDENCIA_EXAMES = "Solicitação de exames com assinatura: não implementada nesta etapa (pendência registrada).";

  var cache = [], carregando = false, ouvintes = [];
  var modo = "lista", vendo = null, form = null, documentosCache = {}, estadoMsg = "";

  function dataBR(iso) { return window.dataBR ? window.dataBR(String(iso || "").slice(0, 10)) : String(iso || "").slice(0, 10); }
  function dataHora(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return String(iso); return dataBR(iso) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function tabela() { return window.DadosRouter ? window.DadosRouter.from("relatorios") : null; }
  function pacienteId() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function uuid() { return (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : "op-" + Date.now() + "-" + Math.random().toString(16).slice(2); }
  function avisar() { ouvintes.forEach(function (f) { try { f(); } catch (e) { console.error(e); } }); }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function erroHumano(e) { return window.mensagemHumana ? window.mensagemHumana(e) : (e && e.message) || String(e); }

  /* ---------- dados ------------------------------------------------------- */

  function carregar() {
    if (!temSupa()) { cache = []; return Promise.resolve(cache); }
    var t = tabela(); if (!t) return Promise.resolve(cache);
    carregando = true;
    return Promise.resolve(t.select("*").order("created_at", { ascending: true }))
      .then(function (r) { if (r && !r.error && Array.isArray(r.data)) cache = r.data; return cache; })
      .catch(function (e) { console.error("[relatorios] carregar:", e); return cache; })
      .finally(function () { carregando = false; });
  }
  function doPaciente(pid) { return cache.filter(function (r) { return r.patient_id === pid; }).map(function (r) { return Object.assign({}, r); }); }
  function porId(id) { var r = cache.filter(function (x) { return x.id === id; })[0]; return r ? Object.assign({}, r) : null; }
  function emitidos(pid) { return doPaciente(pid).filter(function (r) { return r.status === "emitido"; }).sort(function (a, b) { return String(b.issued_at).localeCompare(String(a.issued_at)); }); }
  function rascunhos(pid) { return doPaciente(pid).filter(function (r) { return r.status === "rascunho"; }); }
  function ultimoEmitido(pid) { return emitidos(pid).filter(function (r) { return !r.superseded_at; })[0] || emitidos(pid)[0] || null; }
  function todosRascunhos() { return cache.filter(function (r) { return r.status === "rascunho"; }).map(function (r) { return Object.assign({}, r); }); }

  function chamar(nome, payload) {
    if (!temSupa()) return Promise.reject(new Error("Relatórios exigem sessão: entre para emitir."));
    return Promise.resolve(window.supabaseClient.rpc(nome, { payload: payload })).then(function (r) {
      if (r && r.error) throw r.error;
      return r && r.data;
    }).then(function (id) { return carregar().then(function () { avisar(); return id; }); });
  }
  function salvarRascunho(payload) { return chamar("salvar_rascunho_relatorio", payload); }
  function emitir(payload) { return chamar("emitir_relatorio", payload); }

  /* ---------- fontes selecionaveis (so consolidado) ---------------------- */

  function fontesDisponiveis(pid) {
    var A = window.AtendimentoAtual, An = window.Anamnese, Cd = window.Conduta, comSessao = temSupa();
    var f = { atendimentos: [], anamneses: [], holoscan: [], coletas: [], ferramentas: [], condutas: [], documentos: documentosCache[pid] || [] };
    if (A) f.atendimentos = A.doPaciente(pid).slice().sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
    if (An) f.anamneses = An.doPaciente(pid).filter(An.consolidada);
    if (Cd) f.condutas = Cd.doPaciente(pid).filter(Cd.consolidada);
    var h = window.historicoPontuacao ? (window.historicoPontuacao(pid) || []) : [];
    f.holoscan = h.filter(function (x) { return x._supa_id; });
    f.coletas = (window.Sincronizacao ? window.Sincronizacao.coletas(pid) : null) || [];
    if (window.Aplicacoes) f.ferramentas = window.Aplicacoes.doPaciente(pid).filter(function (a) { return a.status !== "rascunho" && a.id && (comSessao || true); });
    return f;
  }
  function rotuloAtendimento(e) { var A = window.AtendimentoAtual; return A ? A.rotuloQuando(e) : String(e.occurred_at); }
  function diaDoAtendimento(eid) { var A = window.AtendimentoAtual, e = A && A.porId(eid); return e ? A.paraParede(e.occurred_at, e.timezone || A.fuso()).data : ""; }
  function nomeFerramenta(fid) {
    var cat = (window.CATALOGO_FERRAMENTAS || []).filter(function (f) { return f.id === fid; })[0];
    return cat ? cat.titulo : fid === "oq3" ? "OQ³" : fid === "pqq" ? "PQQ" : String(fid || "");
  }

  function novoForm(pid, base) {
    var f = { pid: pid, id: null, expected_updated_at: null, supersedes_report_id: null, operation_id: uuid(), title: "Relatório clínico",
      period_start: "", period_end: "", encounter_id: null, professional_text: "",
      sel: { encounter_ids: [], anamnesis_ids: [], holoscan_application_ids: [], lab_collection_ids: [], tool_application_ids: [], conduct_ids: [], agreement_ids: [], document_ids: [],
             incluir_interpretacao: true, incluir_intimo: false } };
    if (base) {
      f.id = base.status === "rascunho" ? base.id : null;
      f.expected_updated_at = base.status === "rascunho" ? base.updated_at : null;
      f.supersedes_report_id = base.status === "emitido" ? base.id : (base.supersedes_report_id || null);
      f.title = base.title || f.title; f.period_start = base.period_start || ""; f.period_end = base.period_end || "";
      f.encounter_id = base.encounter_id || null; f.professional_text = base.professional_text || "";
      var s = base.selected_sources || {};
      Object.keys(f.sel).forEach(function (k) { if (s[k] !== undefined) f.sel[k] = Array.isArray(s[k]) ? s[k].slice() : s[k]; });
      if (base.status === "emitido") f.title = base.title || f.title;
    }
    return f;
  }
  function payloadDe(f) {
    return { id: f.id, patient_id: f.pid, encounter_id: f.encounter_id || null, title: f.title || null, period_start: f.period_start || null, period_end: f.period_end || null,
      selected_sources: f.sel, professional_text: f.professional_text || null, supersedes_report_id: f.supersedes_report_id || null,
      operation_id: f.operation_id, expected_updated_at: f.expected_updated_at || null };
  }
  function totalFontes(sel) {
    return ["encounter_ids", "anamnesis_ids", "holoscan_application_ids", "lab_collection_ids", "tool_application_ids", "conduct_ids", "document_ids"]
      .reduce(function (n, k) { return n + (sel[k] || []).length; }, 0);
  }

  /* ---------- previa (cliente) — rotulada, nunca "emitida" ------------------ */

  function montarPrevia(pid, f) {
    var F = fontesDisponiveis(pid), An = window.Anamnese, Cd = window.Conduta, sel = f.sel, intimo = !!sel.incluir_intimo, interp = sel.incluir_interpretacao !== false;
    var p = (window.pacientesTodos ? window.pacientesTodos() : []).filter(function (x) { return x.id === pid; })[0] || {};
    var prof = window.Perfil && window.Perfil.atual ? window.Perfil.atual() : {};
    var em = function (lista, ids, chave) { return lista.filter(function (x) { return ids.indexOf(x[chave || "id"]) >= 0; }); };
    var c = { template_version: 1, previa: true, titulo: f.title, paciente: { nome: p.nome, nascimento: p.nascimento, sexo: p.sexo },
      profissional: { nome: prof.nome, profissao: prof.profissao, registro: prof.registro }, periodo: { inicio: f.period_start || null, fim: f.period_end || null },
      metodologia: "Resultados metodológicos do HOLOSCAN ainda não são oficiais (Pacote Metodológico V1 não homologado).", texto_assistido: [] };
    c.atendimentos = em(F.atendimentos, sel.encounter_ids).map(function (e) { return { tipo_conteudo: "DADO_DOCUMENTAL", id: e.id, occurred_at: e.occurred_at, timezone: e.timezone, type: e.type, modality: e.modality, com_agendamento: !!e.consultation_id }; });
    c.anamneses = em(F.anamneses, sel.anamnesis_ids).map(function (a) {
      var itens = [];
      Object.keys((a.content && a.content.dominios) || {}).forEach(function (dom) {
        if (!intimo && (dom === "emocional" || dom === "sentido_pessoal")) return;
        ((a.content.dominios[dom] || {}).itens || []).forEach(function (it) {
          var tipo = it.origem === "observacao_profissional" ? "OBSERVACAO_PROFISSIONAL" : it.origem === "documento_externo" ? "DADO_DOCUMENTAL" : it.origem === "dado_medido" ? "DADO_MEDIDO" : "RELATO_DO_PACIENTE";
          itens.push(Object.assign({ dominio: dom, tipo_conteudo: tipo }, it));
        });
      });
      return { id: a.id, encounter_id: a.encounter_id, revision_number: a.revision_number, status: a.status, intimo_incluido: intimo, itens: itens };
    });
    c.holoscan = em(F.holoscan, sel.holoscan_application_ids, "_supa_id").map(function (h) {
      return { tipo_conteudo: "INDICADOR_CALCULADO", id: h._supa_id, quando: h.quando, versao_estrutura: h.versao_estrutura, cobertura: h.cobertura, resultados_oficiais: false,
        interpretacao_profissional: interp && h.interpretacao ? h.interpretacao.texto : null };
    });
    c.exames = em(F.coletas, sel.lab_collection_ids).map(function (k) {
      return { tipo_conteudo: "DADO_MEDIDO", id: k.id, coletado_em: k.coletado_em, data_coleta_desconhecida: k.data_coleta_desconhecida, laboratorio: k.laboratorio,
        state: k.state || null, revision: k.revision || 1,
        resultados: (k.resultados || []).map(function (r) {
          if (r.exam_code || r.custom_exam_id || r.value_original_text) {
            /* Etapa 5: snapshot do valor ORIGINAL e da referencia DO LAUDO usados; nenhuma classificacao */
            return { exame_id: r.exam_code || null, custom_exam_id: r.custom_exam_id || null, nome: window.Laboratorio ? window.Laboratorio.nomeExame(r) : (r.exam_code || "exame"), variante: r.variant || null, material: r.material || null, metodo: r.method || null,
              valor: r.value_original_text, unidade: r.unit_original || null, referencia_laudo: r.reference_status === "informed" ? { texto: r.report_reference_text || null, min: r.report_reference_min, max: r.report_reference_max, unidade: r.report_reference_unit || null } : null };
          }
          return { exame_id: r.exame_id, nome: r.nome_exame_no_momento, valor: r.valor, unidade: r.unidade_no_momento };
        }) };
    });
    c.ferramentas = em(F.ferramentas, sel.tool_application_ids).map(function (a) {
      return { tipo_conteudo: "RELATO_DO_PACIENTE", id: a.id, ferramenta_id: a.ferramenta_id, versao_ferramenta: a.versao_ferramenta, concluida_em: a.concluida_em, status: a.status,
        respostas: intimo ? a.respostas : null, respostas_incluidas: intimo, leitura_profissional: interp ? a.leitura : null, prioridade: a.prioridade, proximo_passo: a.proximo_passo };
    });
    c.condutas = em(F.condutas, sel.conduct_ids).map(function (k) {
      var o = { tipo_conteudo: "OBSERVACAO_PROFISSIONAL", id: k.id, encounter_id: k.encounter_id, revision_number: k.revision_number, status: k.status };
      (Cd ? Cd.CAMPOS : []).forEach(function (cp) { o[cp[0]] = k[cp[0]] || null; });
      o.acordos = (Cd ? Cd.acordosDe(k.id) : []).filter(function (g) { return !(sel.agreement_ids || []).length || sel.agreement_ids.indexOf(g.id) >= 0; })
        .map(function (g) { return { id: g.id, description: g.description, responsible: g.responsible, due_text: g.due_text, follow_up: g.follow_up, status: g.status, status_note: g.status_note }; });
      return o;
    });
    c.documentos = em(F.documentos, sel.document_ids, "_supa_id").map(function (d) { return { tipo_conteudo: "DADO_DOCUMENTAL", id: d._supa_id, nome: d.nome, tipo: d.tipo, data_documento: d.data }; });
    c.interpretacao_profissional = interp && f.professional_text ? { tipo_conteudo: "OBSERVACAO_PROFISSIONAL", texto: f.professional_text } : null;
    void An;
    return c;
  }

  /* ---------- HTML do snapshot (emissao ou previa) ------------------------ */

  function tag(t) { return t ? '<span class="rel-tipo" title="tipo de conteúdo">' + escapar(TIPOS_CONTEUDO[t] || t) + "</span>" : ""; }
  function bloco(titulo, corpo) { return corpo ? '<section class="rel-secao"><h4>' + escapar(titulo) + "</h4>" + corpo + "</section>" : ""; }
  function lista(itens) { return itens && itens.length ? '<ul class="rel-lista">' + itens.join("") + "</ul>" : ""; }

  /* teste real 07/10: a referencia do laudo vai no snapshot, mas nao era desenhada */
  function refLaudo(r2) {
    if (!("referencia_laudo" in r2)) return "";
    var f = r2.referencia_laudo;
    if (!f) return ' <span class="rel-ref">(referência do laudo não informada)</span>';
    var num = function (v) { return v === null || v === undefined || v === "" ? null : String(v).replace(".", ","); };
    var t = f.texto || (num(f.min) && num(f.max) ? num(f.min) + " a " + num(f.max) : num(f.max) ? "até " + num(f.max) : num(f.min) ? "≥ " + num(f.min) : "");
    return t ? ' <span class="rel-ref">(referência do laudo: ' + escapar(t) + (f.unidade && !f.texto ? " " + escapar(f.unidade) : "") + ")</span>" : "";
  }

  function snapshotHtml(r) {
    var c = (r && r.content_snapshot) || {}, Cd = window.Conduta, An = window.Anamnese;
    var cab = '<header class="rel-cabecalho">' +
      '<h3>' + escapar(c.titulo || r.title || "Relatório clínico") + "</h3>" +
      (c.previa ? '<p class="rel-previa-selo">PRÉVIA — não emitida. Nada aqui foi registrado.</p>' : "") +
      (r.status === "emitido" ? '<p class="rel-meta">Emissão nº ' + escapar(String(r.revision_number)) + " · emitida em " + escapar(dataHora(r.issued_at)) +
        (r.supersedes_report_id ? " · retifica a emissão " + escapar(String(r.supersedes_report_id).slice(0, 8)) : "") +
        (r.superseded_at ? ' · <b>substituída por retificação em ' + escapar(dataHora(r.superseded_at)) + "</b>" : "") + "</p>" : "") +
      '<p class="rel-meta">Profissional: ' + escapar((c.profissional || {}).nome || "—") + ((c.profissional || {}).profissao ? " · " + escapar(c.profissional.profissao) : "") + ((c.profissional || {}).registro ? " · registro " + escapar(c.profissional.registro) : "") + "</p>" +
      '<p class="rel-meta">Paciente: ' + escapar((c.paciente || {}).nome || "—") + ((c.paciente || {}).nascimento ? " · nascimento " + escapar(dataBR(c.paciente.nascimento)) : "") + "</p>" +
      (c.periodo && (c.periodo.inicio || c.periodo.fim) ? '<p class="rel-meta">Período: ' + escapar(dataBR(c.periodo.inicio)) + " – " + escapar(dataBR(c.periodo.fim)) + "</p>" : "") +
      "</header>";
    var h = cab;
    h += bloco("Atendimentos", lista((c.atendimentos || []).map(function (e) {
      var A = window.AtendimentoAtual, w = A ? A.paraParede(e.occurred_at, e.timezone || A.fuso()) : { data: String(e.occurred_at).slice(0, 10), hora: "" };
      return "<li>" + tag(e.tipo_conteudo) + " <b>" + escapar(dataBR(w.data)) + " " + escapar(w.hora) + "</b>" + (e.type ? " · " + escapar(e.type) : "") + (e.modality ? " · " + escapar(e.modality) : "") + (e.com_agendamento ? " · com agendamento" : "") + "</li>";
    })));
    h += bloco("Anamnese", (c.anamneses || []).map(function (a) {
      var porDom = {};
      (a.itens || []).forEach(function (it) { (porDom[it.dominio] = porDom[it.dominio] || []).push(it); });
      return '<div class="rel-anamnese"><p class="rel-meta">Revisão ' + escapar(String(a.revision_number)) + " · " + escapar(a.status) + (a.encounter_id ? " · atendimento de " + escapar(dataBR(diaDoAtendimento(a.encounter_id)) || "—") : "") +
        (a.intimo_incluido ? " · inclui campos íntimos" : " · campos íntimos não incluídos") + "</p>" +
        Object.keys(porDom).map(function (dom) {
          return "<h5>" + escapar(An ? An.rotulo(dom) : dom) + "</h5>" + lista(porDom[dom].map(function (it) {
            return "<li>" + tag(it.tipo_conteudo) + " <b>" + escapar(it.campo || "") + "</b>: " + (it.estado === "informado" ? escapar(it.valor || "(informado)") : "[" + escapar(An ? An.rotulo(it.estado) : it.estado) + "]") +
              (it.medida && it.medida.valor != null ? " · " + escapar(String(it.medida.valor)) + " " + escapar(it.medida.unidade || "") + (it.medida.data ? " em " + escapar(dataBR(it.medida.data)) : "") : "") + "</li>";
          }));
        }).join("") + "</div>";
    }).join(""));
    h += bloco("HOLOSCAN (aplicações realizadas)", (c.holoscan || []).length ? '<p class="rel-aviso">' + escapar(c.metodologia || "") + "</p>" + lista((c.holoscan || []).map(function (x) {
      var cob = x.cobertura && typeof x.cobertura.respondidos === "number" ? x.cobertura.respondidos + " de " + x.cobertura.total + " respondidas" : "cobertura não registrada";
      return "<li>" + tag(x.tipo_conteudo) + " <b>" + escapar(dataBR(x.quando)) + "</b> · versão " + escapar(x.versao_estrutura || "?") + " · " + escapar(cob) + " · resultados não oficiais" +
        (x.interpretacao_profissional ? "<br>" + tag("OBSERVACAO_PROFISSIONAL") + " " + escapar(x.interpretacao_profissional) : "") + "</li>";
    })) : "");
    h += bloco("Exames", (c.exames || []).map(function (k) {
      return '<div class="rel-coleta"><p class="rel-meta">' + tag(k.tipo_conteudo) + " Coleta " + (k.data_coleta_desconhecida || !k.coletado_em ? "(data não informada)" : "de " + escapar(dataBR(k.coletado_em))) + (k.laboratorio ? " · " + escapar(k.laboratorio) : "") + "</p>" +
        lista((k.resultados || []).map(function (r2) { return "<li>" + escapar(r2.nome || r2.exame_id) + ": <b>" + escapar(String(r2.valor)) + "</b> " + escapar(r2.unidade || "") + refLaudo(r2) + "</li>"; })) + "</div>";
    }).join(""));
    h += bloco("Ferramentas", lista((c.ferramentas || []).map(function (a) {
      return "<li>" + tag(a.tipo_conteudo) + " <b>" + escapar(nomeFerramenta(a.ferramenta_id)) + "</b> · " + escapar(dataBR(a.concluida_em)) + " · versão " + escapar(a.versao_ferramenta || "?") +
        (a.respostas_incluidas ? " · respostas incluídas" : " · respostas não incluídas") +
        (a.leitura_profissional ? "<br>" + tag("OBSERVACAO_PROFISSIONAL") + " " + escapar(a.leitura_profissional) : "") + "</li>";
    })));
    h += bloco("Conduta", (c.condutas || []).map(function (k) {
      return '<div class="rel-conduta"><p class="rel-meta">' + tag(k.tipo_conteudo) + " Revisão " + escapar(String(k.revision_number)) + " · " + escapar(k.status) + (k.encounter_id ? " · atendimento de " + escapar(dataBR(diaDoAtendimento(k.encounter_id)) || "—") : "") + "</p>" +
        lista((Cd ? Cd.CAMPOS : []).filter(function (cp) { return k[cp[0]]; }).map(function (cp) { return "<li><b>" + escapar(cp[1]) + ":</b> " + escapar(k[cp[0]]) + "</li>"; })) +
        ((k.acordos || []).length ? "<h5>Acordos</h5>" + lista(k.acordos.map(function (g) { return "<li>" + escapar(g.description) + " · " + escapar(Cd ? Cd.rotulo(g.status) : g.status) + (g.responsible ? " · " + escapar(g.responsible) : "") + (g.due_text ? " · " + escapar(g.due_text) : "") + "</li>"; })) : "") +
        (k.return_plan ? '<p class="rel-meta"><b>Retorno:</b> ' + escapar(k.return_plan) + "</p>" : "") + "</div>";
    }).join(""));
    h += bloco("Documentos anexados", lista((c.documentos || []).map(function (d) { return "<li>" + tag(d.tipo_conteudo) + " " + escapar(d.nome) + (d.tipo ? " · " + escapar(d.tipo) : "") + (d.data_documento ? " · " + escapar(dataBR(d.data_documento)) : "") + "</li>"; })));
    if (c.interpretacao_profissional && c.interpretacao_profissional.texto) h += bloco("Interpretação profissional", "<p>" + tag(c.interpretacao_profissional.tipo_conteudo) + " " + escapar(c.interpretacao_profissional.texto).replace(/\n/g, "<br>") + "</p>");
    if (r.status === "emitido") h += '<footer class="rel-rodape"><p class="rel-meta">Hash técnico do snapshot (sha256, não é assinatura digital): <code>' + escapar(r.content_hash || "") + "</code></p>" +
      '<p class="rel-meta">Modelo ' + escapar(String(r.template_version || 1)) + " · emissão " + escapar(r.id) + "</p></footer>";
    return '<article class="rel-documento' + (c.previa ? " previa" : "") + '" id="rel-documento">' + h + "</article>";
  }

  /** Texto bruto de UMA emissao, para a HOLOS AI e exportacao. */
  function textoBruto(r) {
    var div = document.createElement("div"); div.innerHTML = snapshotHtml(r);
    div.querySelectorAll("li, p, h3, h4, h5").forEach(function (el) { el.insertAdjacentText("afterend", "\n"); });
    return div.textContent.replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------- impressao: do snapshot, pelo navegador ----------------------- */

  function imprimir(id) {
    var r = porId(id); if (!r || r.status !== "emitido") { toast("Só uma emissão pode ser impressa."); return false; }
    var w = window.open("", "_blank");
    if (!w) { toast("O navegador bloqueou a janela de impressão."); return false; }
    w.document.write("<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\"><title>" + escapar(r.title || "Relatório clínico") + "</title>" +
      "<style>body{font-family:Georgia,serif;max-width:800px;margin:24px auto;color:#222}.rel-tipo{font-size:.7em;border:1px solid #999;border-radius:3px;padding:0 4px;margin-right:4px}.rel-meta{color:#555;font-size:.9em}.rel-aviso{font-size:.85em;border-left:3px solid #c9a35a;padding-left:8px}h5{margin:8px 0 2px}code{font-size:.8em;word-break:break-all}</style></head><body>" +
      snapshotHtml(r) + "<script>window.onload=function(){window.print();}</script></body></html>");
    w.document.close();
    return true;
  }

  /* ---------- a aba ------------------------------------------------------- */

  function htmlLista(pid) {
    var todos = doPaciente(pid).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    var h = '<div class="rel-topo"><h3 class="dash-titulo">Relatórios clínicos</h3>' +
      '<button type="button" class="btn-principal" data-rel-acao="novo"' + (temSupa() ? "" : " disabled") + ">Novo relatório</button></div>" +
      '<p class="dash-sub">Emissão = snapshot imutável das fontes escolhidas. Correção = nova emissão (retificação). ' + escapar(PENDENCIA_EXAMES) + "</p>";
    if (!temSupa()) h += '<div class="dash-vazio">Relatórios exigem sessão: entre para emitir.</div>';
    else if (!todos.length) h += '<div class="dash-vazio" id="rel-vazio">Nenhum relatório ainda. “Novo relatório” abre a seleção de fontes.</div>';
    else h += '<ul class="rel-emissoes" id="rel-emissoes">' + todos.map(function (r) {
      var emitido = r.status === "emitido";
      return '<li class="rel-emissao ' + r.status + (r.superseded_at ? " substituida" : "") + '" data-rel-id="' + escapar(r.id) + '">' +
        '<span class="rel-selo ' + r.status + '">' + (emitido ? (r.supersedes_report_id ? "Retificação" : "Emitido") : "Rascunho") + "</span>" +
        "<span class=\"rel-emissao-corpo\"><b>" + escapar(r.title || "Relatório clínico") + "</b>" +
        '<span class="rel-meta">' + (emitido ? "emissão nº " + escapar(String(r.revision_number)) + " · emitida em " + escapar(dataHora(r.issued_at)) + (r.superseded_at ? " · substituída por retificação" : "") + (r.supersedes_report_id ? " · retifica " + escapar(String(r.supersedes_report_id).slice(0, 8)) : "")
          : "rascunho · atualizado em " + escapar(dataHora(r.updated_at)) + " · não emitido") + "</span></span>" +
        '<span class="rel-acoes">' + (emitido ? '<button type="button" class="btn-fantasma" data-rel-acao="ver" data-rel-id="' + escapar(r.id) + '">Ver</button>' +
          '<button type="button" class="btn-fantasma" data-rel-acao="imprimir" data-rel-id="' + escapar(r.id) + '">Imprimir</button>' +
          (r.superseded_at ? "" : '<button type="button" class="btn-fantasma" data-rel-acao="retificar" data-rel-id="' + escapar(r.id) + '">Retificar</button>')
          : '<button type="button" class="btn-fantasma" data-rel-acao="continuar" data-rel-id="' + escapar(r.id) + '">Continuar rascunho</button>') + "</span></li>";
    }).join("") + "</ul>";
    return h;
  }

  function htmlForm(pid, f) {
    var F = fontesDisponiveis(pid), Cd = window.Conduta, An = window.Anamnese;
    var marcado = function (k, id) { return (f.sel[k] || []).indexOf(id) >= 0 ? " checked" : ""; };
    var grupo = function (titulo, k, itens, rotular, idDe) {
      return '<fieldset class="rel-grupo"><legend>' + escapar(titulo) + (itens.length ? "" : " <small>(nada consolidado)</small>") + "</legend>" +
        itens.map(function (x) { var id = idDe ? idDe(x) : x.id; return '<label class="rel-fonte"><input type="checkbox" data-rel-fonte="' + k + '" value="' + escapar(id) + '"' + marcado(k, id) + "> " + rotular(x) + "</label>"; }).join("") + "</fieldset>";
    };
    var h = '<div class="rel-form" id="rel-form">' +
      '<div class="rel-topo"><h3 class="dash-titulo">' + (f.supersedes_report_id ? "Retificação (nova emissão)" : f.id ? "Rascunho de relatório" : "Novo relatório") + "</h3>" +
      '<button type="button" class="btn-fantasma" data-rel-acao="voltar">Voltar</button></div>' +
      (f.supersedes_report_id ? '<p class="dash-sub">Retifica a emissão ' + escapar(String(f.supersedes_report_id).slice(0, 8)) + ". A original continua acessível; esta será a emissão seguinte.</p>" : "") +
      '<div class="rel-campos">' +
      '<label class="rel-campo"><span>Título</span><input type="text" data-rel-campo="title" value="' + escapar(f.title || "") + '"></label>' +
      '<label class="rel-campo"><span>Período (início)</span><input type="date" data-rel-campo="period_start" value="' + escapar(f.period_start || "") + '"></label>' +
      '<label class="rel-campo"><span>Período (fim)</span><input type="date" data-rel-campo="period_end" value="' + escapar(f.period_end || "") + '"></label>' +
      "</div>" +
      '<p class="dash-sub">Fontes: nada vem marcado. Só o consolidado aparece (rascunhos de anamnese/conduta e cálculos não sincronizados não entram).</p>' +
      grupo("Atendimentos", "encounter_ids", F.atendimentos, function (e) { return escapar(rotuloAtendimento(e)) + (e.type ? " · " + escapar(e.type) : ""); }) +
      grupo("Anamnese (salva/revisada)", "anamnesis_ids", F.anamneses, function (a) { return "rev. " + a.revision_number + " · " + escapar(a.status) + " · atendimento de " + escapar(dataBR(diaDoAtendimento(a.encounter_id))) + (a.superseded_at ? " · substituída" : "") + " · " + (An ? An.contarItens(a.content) : "?") + " itens"; }) +
      grupo("HOLOSCAN (aplicações consolidadas — sem resultados oficiais)", "holoscan_application_ids", F.holoscan, function (x) { return escapar(dataBR(x.quando)) + " · versão " + escapar(x.versao_estrutura || "?"); }, function (x) { return x._supa_id; }) +
      grupo("Exames (coletas)", "lab_collection_ids", F.coletas, function (k) { return (k.data_coleta_desconhecida || !k.coletado_em ? "data não informada" : escapar(dataBR(k.coletado_em))) + " · " + (k.resultados || []).length + " exames" + (k.laboratorio ? " · " + escapar(k.laboratorio) : ""); }) +
      grupo("Ferramentas (concluídas)", "tool_application_ids", F.ferramentas, function (a) { return escapar(nomeFerramenta(a.ferramenta_id)) + " · " + escapar(dataBR(a.concluida_em || a.iniciada_em)); }) +
      grupo("Conduta (salva/revisada) e acordos", "conduct_ids", F.condutas, function (k) {
        var ac = Cd ? Cd.acordosDe(k.id) : [];
        return "rev. " + k.revision_number + " · " + escapar(k.status) + " · atendimento de " + escapar(dataBR(diaDoAtendimento(k.encounter_id))) + (k.objective ? " · " + escapar(k.objective) : "") +
          (ac.length ? '<span class="rel-acordos">' + ac.map(function (g) { return '<label class="rel-fonte rel-fonte-acordo"><input type="checkbox" data-rel-fonte="agreement_ids" value="' + escapar(g.id) + '"' + marcado("agreement_ids", g.id) + "> acordo: " + escapar(g.description) + " (" + escapar(Cd.rotulo(g.status)) + ")</label>"; }).join("") + "</span>" : "");
      }) +
      grupo("Documentos anexados", "document_ids", F.documentos, function (d) { return escapar(d.nome) + (d.data ? " · " + escapar(dataBR(d.data)) : ""); }, function (d) { return d._supa_id; }) +
      '<fieldset class="rel-grupo"><legend>Conteúdo profissional e íntimo</legend>' +
      '<label class="rel-fonte"><input type="checkbox" data-rel-opcao="incluir_interpretacao"' + (f.sel.incluir_interpretacao !== false ? " checked" : "") + "> Incluir interpretação profissional (HOLOSCAN, leituras das ferramentas e o texto abaixo)</label>" +
      '<label class="rel-fonte"><input type="checkbox" data-rel-opcao="incluir_intimo"' + (f.sel.incluir_intimo ? " checked" : "") + "> Incluir conteúdo íntimo (campos emocionais, sentido pessoal, respostas das ferramentas) — <b>não entra por padrão</b></label>" +
      '<label class="rel-campo rel-campo-texto"><span>Interpretação profissional (texto seu, nunca gerado)</span><textarea data-rel-campo="professional_text" rows="4">' + escapar(f.professional_text || "") + "</textarea></label></fieldset>" +
      '<p class="dash-sub">' + escapar(PENDENCIA_EXAMES) + "</p>" +
      '<div class="rel-botoes">' +
      '<button type="button" class="btn-fantasma" data-rel-acao="previa">Prévia</button>' +
      (f.supersedes_report_id ? "" : '<button type="button" class="btn-fantasma" data-rel-acao="rascunho">Salvar rascunho</button>') +
      '<button type="button" class="btn-principal" data-rel-acao="emitir">Emitir</button>' +
      '<span class="rel-estado" id="rel-estado">' + escapar(estadoMsg) + "</span></div>" +
      '<div id="rel-previa"></div></div>';
    return h;
  }

  function lerForm(alvo) {
    if (!form) return;
    alvo.querySelectorAll("[data-rel-campo]").forEach(function (el) { form[el.dataset.relCampo] = el.value; });
    alvo.querySelectorAll("[data-rel-opcao]").forEach(function (el) { form.sel[el.dataset.relOpcao] = el.checked; });
    Object.keys(form.sel).forEach(function (k) { if (Array.isArray(form.sel[k])) form.sel[k] = []; });
    alvo.querySelectorAll("[data-rel-fonte]").forEach(function (el) { if (el.checked) form.sel[el.dataset.relFonte].push(el.value); });
    // acordo so acompanha conduta escolhida
    form.sel.agreement_ids = form.sel.agreement_ids.filter(function (gid) {
      var g = (window.Conduta ? window.Conduta.todosAcordos() : []).filter(function (x) { return x.id === gid; })[0];
      return g && form.sel.conduct_ids.indexOf(g.conduct_id) >= 0;
    });
  }

  function desenhar() {
    var alvo = document.getElementById("relatorios-emissoes");
    if (!alvo) return;
    var pid = pacienteId();
    if (!pid) { alvo.innerHTML = ""; return; }
    if (form && form.pid !== pid) { form = null; modo = "lista"; vendo = null; }
    if (modo === "ver" && vendo) {
      var r = porId(vendo);
      if (!r) { modo = "lista"; return desenhar(); }
      alvo.innerHTML = '<div class="rel-topo"><h3 class="dash-titulo">' + (r.status === "emitido" ? "Emissão" : "Rascunho") + '</h3><span class="rel-acoes">' +
        (r.status === "emitido" ? '<button type="button" class="btn-fantasma" data-rel-acao="imprimir" data-rel-id="' + escapar(r.id) + '">Imprimir</button>' : "") +
        (r.supersedes_report_id ? '<button type="button" class="btn-fantasma" data-rel-acao="ver" data-rel-id="' + escapar(r.supersedes_report_id) + '">Ver emissão original</button>' : "") +
        '<button type="button" class="btn-fantasma" data-rel-acao="voltar">Voltar</button></span></div>' + snapshotHtml(r);
    } else if (modo === "novo" && form) {
      alvo.innerHTML = htmlForm(pid, form);
      if (temSupa() && window.ArquivoStore && !documentosCache[pid]) {
        window.ArquivoStore.listar(pid).then(function (docs) { documentosCache[pid] = (docs || []).filter(function (d) { return d._supa_id; }); if (modo === "novo") desenhar(); }).catch(function () {});
      }
    } else {
      modo = "lista";
      alvo.innerHTML = htmlLista(pid);
    }
    ligar(alvo, pid);
  }

  function estado(m) { estadoMsg = m || ""; var el = document.getElementById("rel-estado"); if (el) el.textContent = estadoMsg; }

  function ligar(alvo, pid) {
    if (alvo.dataset.relLigado) return;
    alvo.dataset.relLigado = "1";
    alvo.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-rel-acao]"); if (!b) return;
      var acao = b.dataset.relAcao, id = b.dataset.relId;
      pid = pacienteId();
      if (acao === "novo") { form = novoForm(pid); modo = "novo"; estadoMsg = ""; desenhar(); return; }
      if (acao === "voltar") { modo = "lista"; vendo = null; estadoMsg = ""; desenhar(); return; }
      if (acao === "ver") { vendo = id; modo = "ver"; desenhar(); return; }
      if (acao === "imprimir") { imprimir(id); return; }
      if (acao === "continuar") { var r = porId(id); if (r) { form = novoForm(pid, r); modo = "novo"; estadoMsg = ""; desenhar(); } return; }
      if (acao === "retificar") { var o = porId(id); if (o) { form = novoForm(pid, o); modo = "novo"; estadoMsg = ""; desenhar(); } return; }
      if (acao === "previa") {
        lerForm(alvo);
        var pr = document.getElementById("rel-previa");
        if (pr) pr.innerHTML = snapshotHtml({ status: "previa", title: form.title, content_snapshot: montarPrevia(pid, form) });
        return;
      }
      if (acao === "rascunho") {
        lerForm(alvo); estado("Salvando rascunho…");
        salvarRascunho(payloadDe(form)).then(function (nid) {
          var r2 = porId(nid); form.id = nid; form.expected_updated_at = r2 ? r2.updated_at : null; form.operation_id = uuid();
          estado("Rascunho salvo em " + dataHora(r2 ? r2.updated_at : new Date().toISOString()) + " — não emitido."); toast("Rascunho do relatório salvo.");
        }).catch(function (e) { estado("Não foi possível salvar o rascunho: " + erroHumano(e)); toast(erroHumano(e)); });
        return;
      }
      if (acao === "emitir") {
        lerForm(alvo);
        if (!totalFontes(form.sel) && !form.professional_text) { estado("Escolha ao menos uma fonte ou escreva a interpretação profissional."); return; }
        var confirmar = window.abrirModalConfirmar ? window.abrirModalConfirmar({
          titulo: form.supersedes_report_id ? "Emitir retificação?" : "Emitir relatório?",
          corpo: "<p>" + totalFontes(form.sel) + " fonte(s) selecionada(s)" + (form.sel.incluir_intimo ? ", <b>com conteúdo íntimo</b>" : ", sem conteúdo íntimo") + ". A emissão é um snapshot imutável: correções só por nova emissão (retificação).</p>",
          botaoConfirmar: "Emitir", classeConfirmar: "btn-principal" }) : Promise.resolve("confirmar");
        confirmar.then(function (res) {
          if (res !== "confirmar") return;
          estado("Emitindo…");
          return emitir(payloadDe(form)).then(function (nid) {
            form = null; modo = "ver"; vendo = nid; estadoMsg = ""; toast("Relatório emitido."); desenhar();
          }).catch(function (e) { estado("Não foi possível emitir: " + erroHumano(e) + " Nada foi emitido."); toast(erroHumano(e)); });
        });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () { if (typeof anterior === "function") anterior(); form = null; modo = "lista"; vendo = null; estadoMsg = ""; };
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { carregar().then(function () { avisar(); if (document.getElementById("relatorios-emissoes") && !document.getElementById("aba-relatorio").classList.contains("hidden")) desenhar(); }); });
  });

  window.Relatorios = {
    TIPOS_CONTEUDO: TIPOS_CONTEUDO, PENDENCIA_EXAMES: PENDENCIA_EXAMES,
    carregar: carregar, carregando: function () { return carregando; },
    doPaciente: doPaciente, porId: porId, emitidos: emitidos, rascunhos: rascunhos, ultimoEmitido: ultimoEmitido, todosRascunhos: todosRascunhos,
    fontesDisponiveis: fontesDisponiveis, novoForm: novoForm, montarPrevia: montarPrevia, snapshotHtml: snapshotHtml, textoBruto: textoBruto,
    salvarRascunho: salvarRascunho, emitir: emitir, imprimir: imprimir, desenhar: desenhar,
    abrirNovo: function (base) { var pid = pacienteId(); form = novoForm(pid, base ? porId(base) : null); modo = "novo"; estadoMsg = ""; desenhar(); },
    formAtual: function () { return form ? JSON.parse(JSON.stringify(form)) : null; },
    aoMudar: function (f) { if (typeof f === "function") ouvintes.push(f); },
    esquecer: function () { cache = []; form = null; modo = "lista"; vendo = null; documentosCache = {}; estadoMsg = ""; }
  };
})();
