/* ===========================================================================
   LABORATORIO V1 — coletas, resultados e Leitura Integrada (Etapa 5)
   ===========================================================================

   Painel oficial de exames da ficha (#lab-corpo, aba Documentos) e a tela
   de Leitura Integrada (#holo-confronto e #aba-holoscan-laboratorial).

   Regras que este arquivo cumpre e os testes provam:
   - catalogo-base de 45 exames, somente leitura; busca por nome/alias e
     filtro por categoria; nenhum "checklist obrigatorio";
   - NOVA COLETA comeca vazia; EDITAR exige escolher a coleta pelo id;
     duas coletas na mesma data sao duas coletas; "usar estrutura da coleta
     anterior" copia so quais exames estavam presentes (nunca valores);
   - valor original preservado; numerico, censurado e qualitativo tratados
     pelo LabMotor; referencia DO LAUDO digitada pela profissional; ausencia
     de referencia nao significa "dentro"; nenhuma faixa ideal;
   - estados rascunho | salvo | revisado; "Salvo" so depois do servidor;
     coleta consolidada se corrige por REVISAO (nova versao);
   - exames nunca tocam HOLOSCAN; nenhum score laboratorial;
   - Leitura Integrada: selecao EXPLICITA de 1 aplicacao HOLOSCAN e N coletas;
     pacote real LI-V1 sem regra => sempre sem_dados_suficientes, com motivo;
     o confronto legado (nota <= 3 + um exame fora) nao e chamado.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar, dataBR = window.dataBR;
  var SEM_PACIENTE = "__sem_paciente__";
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var TEXTO_ESTADO = { nao_salvo: "Não salvo", salvando: "Salvando...", salvo: "Salvo", nao_sincronizado: "Não sincronizado", local: "Sem conta: nada é gravado" };
  var ROTULO_STATE = { rascunho: "rascunho", salvo: "salvo", revisado: "revisado" };

  function sb() { return window.supabaseClient; }
  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function paciente() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function cat() { return window.LabCatalogo; }
  function motor() { return window.LabMotor; }
  function uuid() { if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID(); return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); }); }

  /* ---------- dados (servidor e fonte; sem sessao nao ha coleta V1) -------- */
  var dados = { pid: null, coletas: [], resultados: {}, componentes: {}, customizados: [], documentos: [], pacoteLI: null, leituras: [], aplicacoes: [], erro: null };
  function limpar(pid) { dados = { pid: pid, coletas: [], resultados: {}, componentes: {}, customizados: [], documentos: [], pacoteLI: null, leituras: [], aplicacoes: [], erro: null }; }
  function q(tabela, cols) { return Promise.resolve(sb().from(tabela).select(cols)); }
  function carregar(pid) {
    if (!pid || pid === SEM_PACIENTE || !UUID_RE.test(pid) || !temSupa()) { limpar(pid); return Promise.resolve(dados); }
    /* monta num objeto LOCAL e so troca `dados` no fim: duas cargas concorrentes nunca
       escrevem no mesmo objeto (nem duplicam resultados) */
    var d = { pid: pid, coletas: [], resultados: {}, componentes: {}, customizados: [], documentos: [], pacoteLI: null, leituras: [], aplicacoes: [], erro: null };
    var publicar = function () { if (dados.pid === pid || !dados.pid) dados = d; return dados; };
    return Promise.all([
      Promise.resolve(sb().from("lab_collections").select("*").eq("patient_id", pid)),
      Promise.resolve(sb().from("lab_custom_exams").select("*").eq("status", "ativo")),
      Promise.resolve(sb().from("documents").select("id, nome, tipo, data_documento").eq("patient_id", pid)),
      Promise.resolve(sb().from("integrated_reading_rule_packages").select("*").eq("code", "LI-V1")),
      Promise.resolve(sb().from("integrated_readings").select("*").eq("patient_id", pid)),
      /* as aplicacoes HOLOSCAN so sao lidas quando a Leitura Integrada e desenhada (carregarAplicacoes):
         o painel de exames nao le o HOLOSCAN — laboratorio e motor HOLOSCAN sao independentes */
      Promise.resolve({ data: dados.pid === pid ? dados.aplicacoes : [] })
    ]).then(function (rs) {
      if (rs.some(function (r) { return r && r.error; })) { d.erro = rs.filter(function (r) { return r.error; })[0].error; return publicar(); }
      d.coletas = (rs[0].data || []).slice().sort(ordemClinica);
      d.customizados = rs[1].data || []; d.documentos = rs[2].data || [];
      d.leituras = (rs[4].data || []).slice().sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
      d.aplicacoes = (rs[5].data || []).slice().sort(function (a, b) { return String(b.quando).localeCompare(String(a.quando)) || String(b.created_at).localeCompare(String(a.created_at)); });
      var pk = (rs[3].data || [])[0];
      var ids = d.coletas.map(function (c) { return c.id; });
      var pRes = ids.length ? Promise.resolve(sb().from("lab_results").select("*").in("collection_id", ids)) : Promise.resolve({ data: [] });
      var pPk = pk ? Promise.all([Promise.resolve(sb().from("integrated_reading_domains").select("*").eq("package_id", pk.id)), Promise.resolve(sb().from("integrated_reading_exam_domain_links").select("*").eq("package_id", pk.id)), Promise.resolve(sb().from("integrated_reading_rules").select("*").eq("package_id", pk.id))]) : Promise.resolve(null);
      return Promise.all([pRes, pPk]).then(function (x) {
        var res = x[0].data || [];
        res.forEach(function (r) { (d.resultados[r.collection_id] = d.resultados[r.collection_id] || []).push(r); });
        Object.keys(d.resultados).forEach(function (k) { d.resultados[k].sort(function (a, b) { return (a.position || 0) - (b.position || 0) || String(a.exam_code || a.legacy_exame_id || "").localeCompare(String(b.exam_code || b.legacy_exame_id || "")); }); });
        d.pacoteLI = pk ? { id: pk.id, code: pk.code, version: pk.version, status: pk.status, domains: (x[1][0].data || []), links: (x[1][1].data || []), rules: (x[1][2].data || []) } : null;
        var rids = res.map(function (r) { return r.id; });
        return (rids.length ? Promise.resolve(sb().from("lab_result_components").select("*").in("result_id", rids)) : Promise.resolve({ data: [] })).then(function (k) {
          (k.data || []).forEach(function (c) { (d.componentes[c.result_id] = d.componentes[c.result_id] || []).push(c); });
          return publicar();
        });
      });
    }).catch(function (e) { d.erro = e; return publicar(); });
  }
  /** Historico: data CLINICA (coletado_em) desc, depois hora, depois registro. Nunca por updated_at. */
  function ordemClinica(a, b) {
    var da = a.coletado_em || "", db = b.coletado_em || "";
    return db.localeCompare(da) || String(b.clinical_time || "").localeCompare(String(a.clinical_time || "")) || String(b.created_at || "").localeCompare(String(a.created_at || ""));
  }
  function nomeExame(r) {
    if (r.exam_code && cat()) { var e = cat().porCodigo(r.exam_code); if (e) return e.canonical_name; }
    if (r.custom_exam_id) { var c = dados.customizados.filter(function (x) { return x.id === r.custom_exam_id; })[0]; if (c) return c.name + " (customizado)"; return "exame customizado"; }
    if (r.nome_exame_no_momento) return r.nome_exame_no_momento + " (legado)";
    return r.legacy_exame_id || r.exame_id || "exame";
  }
  function identidadeTexto(r) { return nomeExame(r) + (r.variant ? " · " + r.variant : "") + (r.material ? " · " + r.material : "") + (r.method ? " · " + r.method : ""); }
  function referenciaDoLaudo(r) {
    if (r.reference_status !== "informed") return null;
    var op = r.report_reference_operator || "range";
    return { source: "laudo", min: r.report_reference_min === null || r.report_reference_min === undefined ? null : Number(r.report_reference_min), max: r.report_reference_max === null || r.report_reference_max === undefined ? null : Number(r.report_reference_max), operator: op, unit: r.report_reference_unit || r.unit_original || null, text: r.report_reference_text || null };
  }
  /** Classificacao de um resultado contra a referencia DO LAUDO. Nunca contra ideal legado. */
  function classificar(r) { return motor() ? motor().classificar(r, referenciaDoLaudo(r), { conversoes: [] }) : null; }
  function textoClassificacao(r) {
    var c = classificar(r); if (!c) return "";
    if (c.classification === "not_classifiable") return "não classificável — " + (motor().MOTIVO[c.reason_codes[0]] || c.reason_codes[0]);
    return motor().ROTULO[c.classification];
  }
  function atual(c) { return !c.superseded_at; }
  function rotuloColeta(c) {
    return (c.coletado_em ? dataBR(c.coletado_em) : "data da coleta não informada") + (c.clinical_time ? " " + String(c.clinical_time).slice(0, 5) : "") + (c.laboratorio ? " · " + c.laboratorio : "") +
      " · " + (ROTULO_STATE[c.state] || c.state) + (c.revision > 1 ? " · revisão " + c.revision : "") + (c.superseded_at ? " · substituída" : "") + (c.encounter_id ? " · vinculada a atendimento" : "") + (c.source === "legacy_panel" ? " · painel legado" : "");
  }

  /* ---------- estado do editor --------------------------------------------- */
  var editor = null;   // { modo: 'nova'|'editar'|'revisar', coleta, linhas: [...], estadoSalvo, motivo }
  var filtro = { texto: "", categoria: "" };
  function novaLinha(e) { return { chave: uuid(), exam_code: e && e.exam_code || null, custom_exam_id: e && e.custom_exam_id || null, variant: e && e.variant || "", material: e && e.material || "", method: e && e.method || "", value_original_text: "", unit_original: "", report_reference_text: "", report_reference_min: "", report_reference_max: "", notes: "", components: [] }; }
  function linhaDeResultado(r) {
    var l = novaLinha({ exam_code: r.exam_code, custom_exam_id: r.custom_exam_id, variant: r.variant, material: r.material, method: r.method });
    l.value_original_text = r.value_original_text || ""; l.unit_original = r.unit_original || ""; l.report_reference_text = r.report_reference_text || "";
    l.report_reference_min = r.report_reference_min === null || r.report_reference_min === undefined ? "" : String(r.report_reference_min); l.report_reference_max = r.report_reference_max === null || r.report_reference_max === undefined ? "" : String(r.report_reference_max); l.notes = r.notes || "";
    l.components = (dados.componentes[r.id] || []).map(function (k) { return { original_name: k.original_name, value_original_text: k.value_original_text, unit_original: k.unit_original || "", report_reference_text: k.report_reference_text || "" }; });
    return l;
  }
  function abrirNova() { editor = { modo: "nova", coleta: null, linhas: [], estadoSalvo: temSupa() ? "" : "local", data: "", hora: "", laboratorio: "", notas: "", documento: "", vincular: false }; desenhar(); }
  function abrirEditar(id) {
    var c = dados.coletas.filter(function (x) { return x.id === id; })[0]; if (!c) return;
    var consolidada = c.state !== "rascunho";
    editor = { modo: consolidada ? "revisar" : "editar", coleta: c, linhas: (dados.resultados[c.id] || []).filter(function (r) { return !r.exame_id; }).map(linhaDeResultado), estadoSalvo: "", data: c.coletado_em || "", hora: c.clinical_time ? String(c.clinical_time).slice(0, 5) : "", laboratorio: c.laboratorio || "", notas: c.observacao || "", documento: c.document_id || "", vincular: !!c.encounter_id, motivo: "" };
    desenhar();
  }
  function fechar() { editor = null; desenhar(); }
  /** "Usar estrutura da coleta anterior": copia SO quais exames/variantes/materiais/metodos; nunca valores, referencias, observacoes ou datas. */
  function usarEstrutura(id) {
    if (!editor) return;
    var ja = {}; editor.linhas.forEach(function (l) { ja[chaveIdentidade(l)] = true; });
    (dados.resultados[id] || []).filter(function (r) { return !r.exame_id; }).forEach(function (r) {
      var l = novaLinha({ exam_code: r.exam_code, custom_exam_id: r.custom_exam_id, variant: r.variant, material: r.material, method: r.method });
      if (!ja[chaveIdentidade(l)]) editor.linhas.push(l);
    });
    editor.estadoSalvo = temSupa() ? "nao_salvo" : "local"; desenhar();
  }
  function chaveIdentidade(l) { return [l.exam_code || "", l.custom_exam_id || "", String(l.variant || "").trim().toLowerCase(), String(l.material || "").trim().toLowerCase()].join("|"); }
  function adicionarExame(exam_code, custom_exam_id) {
    if (!editor) return;
    var l = novaLinha({ exam_code: exam_code || null, custom_exam_id: custom_exam_id || null });
    editor.linhas.push(l); editor.estadoSalvo = temSupa() ? "nao_salvo" : "local"; desenhar(); var el = document.querySelector('[data-lab-linha="' + l.chave + '"] [data-lab-campo="value_original_text"]'); if (el) el.focus();
  }
  function colher() {
    if (!editor) return;
    var d = function (id) { var el = document.getElementById(id); return el ? el.value : ""; };
    editor.data = d("lab-data"); editor.hora = d("lab-hora"); editor.laboratorio = d("lab-laboratorio"); editor.notas = d("lab-notas"); editor.documento = d("lab-documento"); editor.motivo = d("lab-motivo");
    var cb = document.getElementById("lab-vincular"); editor.vincular = !!(cb && cb.checked);
    editor.linhas.forEach(function (l) {
      var row = document.querySelector('[data-lab-linha="' + l.chave + '"]'); if (!row) return;
      ["variant", "material", "method", "value_original_text", "unit_original", "report_reference_text", "report_reference_min", "report_reference_max", "notes"].forEach(function (k) { var el = row.querySelector('[data-lab-campo="' + k + '"]'); if (el) l[k] = el.value; });
      l.components = [].map.call(row.querySelectorAll("[data-lab-comp]"), function (cr) { return { original_name: cr.querySelector('[data-lab-ccampo="original_name"]').value, value_original_text: cr.querySelector('[data-lab-ccampo="value_original_text"]').value, unit_original: cr.querySelector('[data-lab-ccampo="unit_original"]').value, report_reference_text: cr.querySelector('[data-lab-ccampo="report_reference_text"]').value }; });
    });
  }
  function atendimentoAtivo() { var A = window.AtendimentoAtual, e = A && A.atual ? A.atual() : null; return e && e.patient_id === paciente() ? e : null; }
  function numeroOuNulo(t) { var v = motor().interpretarValor(t); return v.kind === "numeric" ? v.numeric_value : null; }
  /** Monta o payload da RPC a partir do editor. Devolve { payload } ou { erro }. */
  function payload(state) {
    colher();
    var pid = paciente();
    var linhas = editor.linhas.filter(function (l) { return String(l.value_original_text || "").trim() !== "" || l.components.some(function (k) { return String(k.value_original_text || "").trim(); }); });
    var vistos = {};
    for (var i = 0; i < linhas.length; i++) { var k = chaveIdentidade(linhas[i]); if (vistos[k]) return { erro: "O mesmo exame (" + nomeExame(linhas[i]) + ", mesma variante e material) aparece duas vezes. Use variante/material diferentes ou remova a repetição." }; vistos[k] = true; }
    if (state === "salvo" && !editor.data) return { erro: "Informe a data da coleta para salvar." };
    if (state === "salvo" && !linhas.length) return { erro: "Preencha ao menos um resultado para salvar a coleta." };
    var results = linhas.map(function (l) {
      var v = motor().interpretarValor(l.value_original_text);
      var temRef = String(l.report_reference_text || "").trim() || String(l.report_reference_min || "").trim() || String(l.report_reference_max || "").trim();
      var r = { exam_code: l.exam_code || null, custom_exam_id: l.custom_exam_id || null, variant: l.variant || null, material: l.material || null, method: l.method || null,
        value_original_text: String(l.value_original_text || "").trim() || "ver componentes", qualifier: v.kind === "empty" ? "text" : v.qualifier, numeric_value: v.kind === "numeric" ? v.numeric_value : null, censor_limit: v.kind === "censored" ? v.censor_limit : null,
        unit_original: l.unit_original || null, notes: l.notes || null,
        report_reference_text: temRef ? (String(l.report_reference_text || "").trim() || null) : null, report_reference_min: temRef ? numeroOuNulo(l.report_reference_min) : null, report_reference_max: temRef ? numeroOuNulo(l.report_reference_max) : null,
        report_reference_operator: temRef ? "range" : null, report_reference_unit: temRef ? (l.unit_original || null) : null,
        components: l.components.filter(function (c) { return String(c.original_name || "").trim() && String(c.value_original_text || "").trim(); }).map(function (c, i) { var cv = motor().interpretarValor(c.value_original_text); return { position: i + 1, original_name: c.original_name.trim(), value_original_text: c.value_original_text.trim(), qualifier: cv.qualifier || "text", numeric_value: cv.kind === "numeric" ? cv.numeric_value : null, censor_limit: cv.kind === "censored" ? cv.censor_limit : null, unit_original: c.unit_original || null, report_reference_text: c.report_reference_text || null }; }) };
      if (r.exam_code !== "LAB-001") r.components = [];
      return r;
    });
    var col = { patient_id: pid, clinical_date: editor.data || null, clinical_time: editor.hora || null, laboratory_name: editor.laboratorio || null, notes: editor.notas || null, state: state };
    if (editor.documento) col.document_id = editor.documento; else if (editor.modo !== "nova") col.document_id = null;
    var e = atendimentoAtivo();
    if (e && editor.vincular) col.encounter_id = e.id; else if (editor.modo !== "nova" && editor.coleta && editor.coleta.encounter_id && e && !editor.vincular) col.encounter_id = null;
    if (editor.modo === "editar") col.id = editor.coleta.id;
    if (editor.modo === "nova") { editor.operation_id = editor.operation_id || uuid(); col.operation_id = editor.operation_id; }
    return { payload: { collection: col, results: results } };
  }
  function mostrarEstado(novo) { if (editor) editor.estadoSalvo = novo || ""; var el = document.getElementById("lab-salvo"); if (!el) return; el.className = "ex-salvo" + (novo ? " " + novo : ""); el.textContent = TEXTO_ESTADO[novo] || ""; }
  function salvar(state) {
    if (!editor) return Promise.resolve(false);
    var pid = paciente();
    if (window.bloqueioArquivado && window.bloqueioArquivado(pid)) return Promise.resolve(false);
    if (!temSupa()) { mostrarEstado("local"); if (window.avisar) window.avisar("Sem conta ativa, a coleta não é gravada no servidor."); return Promise.resolve(false); }
    var p = payload(state);
    if (p.erro) { if (window.avisar) window.avisar(p.erro); var erroEl = document.getElementById("lab-erro"); if (erroEl) erroEl.textContent = p.erro; return Promise.resolve(false); }
    var chamada;
    if (editor.modo === "revisar") {
      if (!String(editor.motivo || "").trim()) { if (window.avisar) window.avisar("Informe o motivo da revisão."); return Promise.resolve(false); }
      chamada = sb().rpc("revisar_coleta_laboratorial", { payload: { collection_id: editor.coleta.id, reason: editor.motivo.trim(), collection: p.payload.collection, results: p.payload.results } });
    } else chamada = sb().rpc("salvar_coleta_laboratorial", { payload: p.payload });
    mostrarEstado("salvando");
    return Promise.resolve(chamada).then(function (r) {
      if (!r || r.error) throw (r && r.error) || new Error("sem resposta");
      var id = r.data && r.data.id;
      return Promise.all([carregar(pid), sincronizarCopias(pid)]).then(function () {
        if (pid !== paciente()) return true;
        if (state === "rascunho") { editor = null; abrirEditar(id); mostrarEstado("salvo"); }
        else { editor = null; desenhar(); var el = document.getElementById("lab-aviso"); if (el) el.textContent = "Coleta " + (r.data.revision ? "revisada (versão " + r.data.revision + ")" : "salva") + " no servidor."; }
        if (window.desenharHoloscanLaboratorial) window.desenharHoloscanLaboratorial();
        if (window.Timeline && window.Timeline.invalidar) window.Timeline.invalidar();
        return true;
      });
    }).catch(function (e) {
      if (pid !== paciente()) return false;
      mostrarEstado(editor.modo === "nova" ? "nao_sincronizado" : "nao_salvo");
      if (window.avisar) window.avisar("Não foi possível gravar a coleta no servidor: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message));
      return false;
    });
  }
  function marcarRevisada(id) {
    var resp = window.prompt ? window.prompt("Quem está revisando esta coleta? (nome)") : null;
    if (!resp || !resp.trim()) return Promise.resolve(false);
    var pid = paciente();
    return Promise.resolve(sb().rpc("marcar_coleta_revisada", { p_collection_id: id, p_responsible: resp.trim() })).then(function (r) { if (r.error) throw r.error; return Promise.all([carregar(pid), sincronizarCopias(pid)]).then(function () { desenhar(); return true; }); })
      .catch(function (e) { if (window.avisar) window.avisar("Não foi possível marcar como revisada: " + e.message); return false; });
  }
  function criarCustomizado(nome) {
    nome = String(nome || "").trim(); if (!nome) return Promise.resolve(null);
    if (cat() && cat().porNomeExato(nome)) { if (window.avisar) window.avisar("Esse nome já é um exame do catálogo-base: use o item do catálogo."); return Promise.resolve(null); }
    return Promise.resolve(sb().from("lab_custom_exams").insert({ name: nome }).select()).then(function (r) { if (r.error) throw r.error; return carregar(paciente()).then(function () { return r.data[0]; }); })
      .catch(function (e) { if (window.avisar) window.avisar("Não foi possível criar o exame customizado: " + e.message); return null; });
  }

  /* ---------- HTML ---------------------------------------------------------- */
  function htmlLista() {
    var atuais = dados.coletas.filter(atual);
    if (!atuais.length) return '<p class="dash-vazio" id="lab-vazio">Nenhuma coleta registrada no servidor para este paciente.</p>';
    return '<ul class="ex-coletas-lista lab-coletas" id="lab-coletas">' + atuais.map(function (c) {
      var rs = (dados.resultados[c.id] || []), legado = c.source === "legacy_panel";
      var versoes = dados.coletas.filter(function (x) { return x.id !== c.id && cadeia(c).indexOf(x.id) >= 0; });
      return '<li class="ex-coleta lab-coleta" data-lab-coleta="' + escapar(c.id) + '"><b>' + escapar(rotuloColeta(c)) + "</b> &middot; " + rs.length + (rs.length === 1 ? " resultado" : " resultados") +
        (versoes.length ? ' <small class="lab-versoes">(' + versoes.length + (versoes.length === 1 ? " versão anterior preservada" : " versões anteriores preservadas") + ")</small>" : "") +
        (legado ? ' <small class="lab-legado">registro do painel legado — fora da saída oficial; edite pelo painel legado</small>' : "") +
        (!legado ? ' <button type="button" class="btn-fantasma" data-lab-acao="ver" data-id="' + escapar(c.id) + '">Ver</button>' +
          (c.state === "rascunho" ? ' <button type="button" class="btn-fantasma" data-lab-acao="editar" data-id="' + escapar(c.id) + '">Editar esta coleta</button>' : ' <button type="button" class="btn-fantasma" data-lab-acao="editar" data-id="' + escapar(c.id) + '">Revisar (nova versão)</button>') +
          (c.state === "salvo" ? ' <button type="button" class="btn-fantasma" data-lab-acao="marcar-revisada" data-id="' + escapar(c.id) + '">Marcar como revisada</button>' : "") : "") +
        (verAberta === c.id ? htmlResultados(c) : "") + "</li>";
    }).join("") + "</ul>";
  }
  var verAberta = null;
  function cadeia(c) { var ids = [], x = c; while (x && x.supersedes_id) { ids.push(x.supersedes_id); x = dados.coletas.filter(function (y) { return y.id === x.supersedes_id; })[0]; } return ids; }
  function htmlResultados(c) {
    var rs = dados.resultados[c.id] || [];
    return '<table class="evo-tabela lab-tabela"><thead><tr><th>Exame</th><th>Valor (original)</th><th>Unidade</th><th>Referência do laudo</th><th>Classificação</th></tr></thead><tbody>' +
      rs.map(function (r) {
        var comps = dados.componentes[r.id] || [];
        return "<tr><td>" + escapar(identidadeTexto(r)) + (r.requires_manual_mapping ? ' <small class="lab-legado">mapeamento manual pendente</small>' : "") + (r.origin === "additional_legacy" ? ' <small class="lab-legado">legado fora dos 45</small>' : "") + "</td><td><b>" + escapar(r.value_original_text) + "</b></td><td>" + escapar(r.unit_original || "") + "</td><td>" +
          (r.reference_status === "informed" ? escapar(r.report_reference_text || ((r.report_reference_min ?? "") + " a " + (r.report_reference_max ?? ""))) : '<i>não informada</i>') + "</td><td>" + escapar(textoClassificacao(r)) + "</td></tr>" +
          (comps.length ? '<tr><td colspan="5"><small>Componentes: ' + comps.map(function (k) { return escapar(k.original_name) + " " + escapar(k.value_original_text) + (k.unit_original ? " " + escapar(k.unit_original) : "") + (k.report_reference_text ? " (ref. " + escapar(k.report_reference_text) + ")" : ""); }).join(" · ") + "</small></td></tr>" : "");
      }).join("") + "</tbody></table>" + (c.revision_note ? '<p class="dash-sub">Revisão: ' + escapar(c.revision_note) + "</p>" : "");
  }
  function htmlBusca() {
    var C = cat(); if (!C) return "";
    var lista = C.buscar(filtro.texto, filtro.categoria);
    var custom = dados.customizados.filter(function (c) { return !filtro.texto || C.normalizar(c.name).indexOf(C.normalizar(filtro.texto)) >= 0; });
    return '<div class="lab-busca"><input type="search" id="lab-busca" placeholder="buscar exame por nome ou sigla (45 do catálogo + customizados)" value="' + escapar(filtro.texto) + '">' +
      '<select id="lab-categoria"><option value="">todas as categorias</option>' + C.CATEGORIAS.map(function (k) { return '<option value="' + escapar(k) + '"' + (filtro.categoria === k ? " selected" : "") + ">" + escapar(k) + "</option>"; }).join("") + "</select>" +
      '<span class="dash-sub">' + lista.length + " de 45 · nenhum é obrigatório</span></div>" +
      '<div class="lab-catalogo" id="lab-catalogo">' + lista.map(function (e) { return '<button type="button" class="lab-exame" data-lab-add="' + e.code + '" title="' + escapar(e.category) + '">' + escapar(e.canonical_name) + (e.aliases.length ? ' <small>(' + escapar(e.aliases.join(", ")) + ")</small>" : "") + "</button>"; }).join("") +
      custom.map(function (c) { return '<button type="button" class="lab-exame lab-exame-custom" data-lab-add-custom="' + escapar(c.id) + '">' + escapar(c.name) + " <small>(customizado)</small></button>"; }).join("") + "</div>" +
      '<div class="lab-custom-novo"><input type="text" id="lab-custom-nome" placeholder="exame fora dos 45: nome do exame customizado"><button type="button" class="btn-fantasma" data-lab-acao="criar-custom">Criar exame customizado</button></div>';
  }
  function htmlLinha(l) {
    var nome = nomeExame(l), hemo = l.exam_code === "LAB-001";
    var inp = function (k, ph, cls) { return '<input type="text" data-lab-campo="' + k + '" placeholder="' + ph + '" value="' + escapar(l[k] || "") + '"' + (cls ? ' class="' + cls + '"' : "") + ">"; };
    var v = motor() ? motor().interpretarValor(l.value_original_text) : null;
    return '<div class="lab-linha" data-lab-linha="' + l.chave + '"><div class="lab-linha-cabeca"><b>' + escapar(nome) + "</b> " + inp("variant", "variante (ex.: ultrassensível, eritrocitário)", "lab-curto") + inp("material", "material", "lab-curto") + inp("method", "método", "lab-curto") +
      ' <button type="button" class="btn-fantasma" data-lab-remover="' + l.chave + '">Remover</button></div>' +
      '<div class="lab-linha-valor">' + inp("value_original_text", "valor exatamente como no laudo (7,2 · < 0,10 · Negativo)", "lab-valor") + inp("unit_original", "unidade", "lab-curto") +
      '<span class="lab-interp">' + (v && v.kind === "numeric" ? "numérico " + v.numeric_value : v && v.kind === "censored" ? "censurado (" + v.qualifier + (v.censor_limit !== null ? " " + v.censor_limit : "") + ")" : v && v.kind === "qualitative" ? "qualitativo" : "") + "</span></div>" +
      '<div class="lab-linha-ref">referência do laudo: ' + inp("report_reference_text", "texto da referência no laudo", "lab-medio") + inp("report_reference_min", "mín.", "lab-curto") + inp("report_reference_max", "máx.", "lab-curto") + inp("notes", "observação", "lab-medio") + "</div>" +
      (hemo ? '<div class="lab-componentes"><small>Componentes do hemograma (nome, valor, unidade, referência do laudo):</small>' + l.components.map(function (k, i) { return '<div class="lab-comp" data-lab-comp="' + i + '"><input type="text" data-lab-ccampo="original_name" placeholder="componente" value="' + escapar(k.original_name || "") + '"><input type="text" data-lab-ccampo="value_original_text" placeholder="valor" value="' + escapar(k.value_original_text || "") + '"><input type="text" data-lab-ccampo="unit_original" placeholder="unidade" value="' + escapar(k.unit_original || "") + '"><input type="text" data-lab-ccampo="report_reference_text" placeholder="referência" value="' + escapar(k.report_reference_text || "") + '"></div>'; }).join("") +
        ' <button type="button" class="btn-fantasma" data-lab-comp-add="' + l.chave + '">+ componente</button></div>' : "") + "</div>";
  }
  function htmlEditor() {
    var e = editor, at = atendimentoAtivo();
    var titulo = e.modo === "nova" ? "Nova coleta" : e.modo === "editar" ? "Editar esta coleta (rascunho)" : "Revisar coleta consolidada — nova versão";
    var anteriores = dados.coletas.filter(function (c) { return atual(c) && c.source !== "legacy_panel" && (!e.coleta || c.id !== e.coleta.id); });
    return '<div class="lab-editor" id="lab-editor"><div class="ex-modo" id="lab-modo"><b>' + titulo + "</b>" + (e.coleta ? " &middot; " + escapar(rotuloColeta(e.coleta)) : " &middot; o formulário começa vazio") +
      ' <button type="button" class="btn-fantasma" data-lab-acao="fechar">Fechar sem salvar</button></div>' +
      '<div class="ex-acoes lab-cabecalho"><label class="ex-data">Data da coleta <input type="date" id="lab-data" value="' + escapar(e.data) + '"' + (e.modo === "revisar" ? "" : "") + "></label>" +
      '<label class="ex-data">Hora <input type="time" id="lab-hora" value="' + escapar(e.hora) + '"></label>' +
      '<label class="ex-data">Laboratório <input type="text" id="lab-laboratorio" value="' + escapar(e.laboratorio) + '"></label>' +
      (at ? '<label class="ex-vinculo"><input type="checkbox" id="lab-vincular"' + (e.vincular ? " checked" : "") + "> Vincular ao atendimento ativo (" + escapar(window.AtendimentoAtual.rotuloQuando(at)) + ")</label>" : (e.coleta && e.coleta.encounter_id ? '<span class="ex-vinculo">Vinculada a um atendimento</span>' : "")) +
      '<label class="ex-data">Laudo (documento) <select id="lab-documento"><option value="">nenhum</option>' + dados.documentos.map(function (d) { return '<option value="' + escapar(d.id) + '"' + (e.documento === d.id ? " selected" : "") + ">" + escapar(d.nome) + (d.data_documento ? " (" + dataBR(d.data_documento) + ")" : "") + "</option>"; }).join("") + "</select></label>" +
      '<label class="ex-data lab-notas">Observações <input type="text" id="lab-notas" value="' + escapar(e.notas) + '"></label>' +
      (e.modo === "revisar" ? '<label class="ex-data lab-motivo">Motivo da revisão <input type="text" id="lab-motivo" value="' + escapar(e.motivo || "") + '" placeholder="obrigatório"></label>' : "") + "</div>" +
      (anteriores.length && e.modo === "nova" ? '<div class="lab-estrutura"><select id="lab-estrutura-de">' + anteriores.map(function (c) { return '<option value="' + escapar(c.id) + '">' + escapar(rotuloColeta(c)) + "</option>"; }).join("") + '</select> <button type="button" class="btn-fantasma" data-lab-acao="usar-estrutura">Usar estrutura da coleta anterior</button> <small>copia só quais exames estavam presentes — nenhum valor, referência, observação ou data</small></div>' : "") +
      htmlBusca() +
      '<div class="lab-linhas" id="lab-linhas">' + (e.linhas.length ? e.linhas.map(htmlLinha).join("") : '<p class="dash-vazio">Nenhum exame nesta coleta ainda. Escolha no catálogo acima.</p>') + "</div>" +
      '<div class="ex-acoes lab-rodape">' + (e.modo !== "revisar" ? '<button type="button" class="btn-fantasma" data-lab-acao="salvar-rascunho">Guardar rascunho</button>' : "") +
      '<button type="button" class="btn-verde" data-lab-acao="salvar">' + (e.modo === "revisar" ? "Salvar nova versão" : "Salvar coleta") + "</button>" +
      '<span class="ex-salvo' + (e.estadoSalvo ? " " + e.estadoSalvo : "") + '" id="lab-salvo" role="status">' + escapar(TEXTO_ESTADO[e.estadoSalvo] || "") + '</span><span class="ex-data-erro" id="lab-erro" role="alert"></span></div></div>';
  }
  function desenhar() {
    var alvo = document.getElementById("lab-corpo"); if (!alvo) return;
    var pid = paciente();
    if (dados.pid !== pid) { carregar(pid).then(desenhar); alvo.innerHTML = '<p class="dash-vazio">Carregando coletas…</p>'; return; }
    var html = '<div class="lab-topo"><p class="arq-sub">Catálogo-base de <b>45 exames</b> (nenhum obrigatório), exames customizados, variante, método, material, valor exatamente como no laudo e <b>referência do próprio laudo</b>. Exames <b>não alteram</b> o HOLOSCAN. Não existe nota ou score laboratorial.</p>' +
      (!temSupa() ? '<p class="dash-sub">Sem conta ativa: as coletas V1 ficam no servidor; entre na sua conta para registrar.</p>' : "") +
      (dados.erro ? '<p class="q-erro">Não foi possível ler as coletas do servidor agora.</p>' : "") +
      (!editor ? '<p><button type="button" class="btn-verde" data-lab-acao="nova">Nova coleta</button> <span class="dash-sub" id="lab-aviso"></span></p>' : "") + "</div>" +
      (editor ? htmlEditor() : "") +
      '<div class="ex-coletas lab-historico"><h4>Histórico de coletas (ordem pela data clínica)</h4>' + htmlLista() + "</div>";
    alvo.innerHTML = html;
    ligar(alvo);
  }
  function ligar(el) {
    el.querySelectorAll("[data-lab-acao]").forEach(function (b) {
      b.addEventListener("click", function () {
        var a = b.dataset.labAcao, id = b.dataset.id;
        if (a === "nova") abrirNova();
        if (a === "editar") abrirEditar(id);
        if (a === "ver") { colherSeEditor(); verAberta = verAberta === id ? null : id; desenhar(); }
        if (a === "fechar") fechar();
        if (a === "salvar") salvar("salvo");
        if (a === "salvar-rascunho") salvar("rascunho");
        if (a === "marcar-revisada") marcarRevisada(id);
        if (a === "usar-estrutura") { colher(); var sel = document.getElementById("lab-estrutura-de"); if (sel && sel.value) usarEstrutura(sel.value); }
        if (a === "criar-custom") { colher(); var n = document.getElementById("lab-custom-nome"); criarCustomizado(n && n.value).then(function (c) { if (c) adicionarExame(null, c.id); }); }
      });
    });
    el.querySelectorAll("[data-lab-add]").forEach(function (b) { b.addEventListener("click", function () { colher(); adicionarExame(b.dataset.labAdd, null); }); });
    el.querySelectorAll("[data-lab-add-custom]").forEach(function (b) { b.addEventListener("click", function () { colher(); adicionarExame(null, b.dataset.labAddCustom); }); });
    el.querySelectorAll("[data-lab-remover]").forEach(function (b) { b.addEventListener("click", function () { colher(); editor.linhas = editor.linhas.filter(function (l) { return l.chave !== b.dataset.labRemover; }); editor.estadoSalvo = temSupa() ? "nao_salvo" : "local"; desenhar(); }); });
    el.querySelectorAll("[data-lab-comp-add]").forEach(function (b) { b.addEventListener("click", function () { colher(); var l = editor.linhas.filter(function (x) { return x.chave === b.dataset.labCompAdd; })[0]; if (l) l.components.push({ original_name: "", value_original_text: "", unit_original: "", report_reference_text: "" }); desenhar(); }); });
    var busca = el.querySelector("#lab-busca"); if (busca) busca.addEventListener("input", function () { colher(); filtro.texto = busca.value; var c = document.getElementById("lab-catalogo"); if (c) { c.outerHTML = htmlBusca().split('<div class="lab-catalogo"')[1] ? '<div class="lab-catalogo"' + htmlBusca().split('<div class="lab-catalogo"')[1].split('<div class="lab-custom-novo">')[0] : c.outerHTML; ligarCatalogo(el); } });
    var catg = el.querySelector("#lab-categoria"); if (catg) catg.addEventListener("change", function () { colher(); filtro.categoria = catg.value; desenhar(); });
    el.querySelectorAll("#lab-linhas input").forEach(function (i) { i.addEventListener("input", function () { if (editor && editor.estadoSalvo !== "salvando") mostrarEstado(temSupa() ? "nao_salvo" : "local"); if (i.dataset.labCampo === "value_original_text") { var row = i.closest(".lab-linha"), v = motor().interpretarValor(i.value), s = row.querySelector(".lab-interp"); if (s) s.textContent = v.kind === "numeric" ? "numérico " + v.numeric_value : v.kind === "censored" ? "censurado (" + v.qualifier + (v.censor_limit !== null ? " " + v.censor_limit : "") + ")" : v.kind === "qualitative" ? "qualitativo" : ""; } }); });
  }
  function ligarCatalogo(el) {
    el.querySelectorAll("[data-lab-add]").forEach(function (b) { b.addEventListener("click", function () { colher(); adicionarExame(b.dataset.labAdd, null); }); });
    el.querySelectorAll("[data-lab-add-custom]").forEach(function (b) { b.addEventListener("click", function () { colher(); adicionarExame(null, b.dataset.labAddCustom); }); });
  }
  function colherSeEditor() { if (editor) colher(); }

  /* ---------- Leitura Integrada (selecao explicita; pacote real sem regra) ---- */
  var li = { app: "", coletas: {}, resultado: null };
  function pacoteReal() { return dados.pacoteLI || { id: null, code: "LI-V1", version: 1, status: "rascunho", domains: [], links: [], rules: [] }; }
  function calcularLI() {
    var L = window.LeituraIntegradaMotor; if (!L) return null;
    var app = dados.aplicacoes.filter(function (a) { return a.id === li.app; })[0] || null;
    var cols = dados.coletas.filter(function (c) { return li.coletas[c.id]; });
    var res = []; cols.forEach(function (c) { (dados.resultados[c.id] || []).forEach(function (r) { res.push(Object.assign({}, r, { clinical_date: c.coletado_em })); }); });
    var cls = {}; res.forEach(function (r) { var c = classificar(r); if (c) cls[r.id] = c; });
    li.resultado = L.calcular({ rule_package: pacoteReal(), holoscan_application: app ? { id: app.id, applied_at: app.quando, system_results: {} } : null, collections: cols.map(function (c) { return { id: c.id, clinical_date: c.coletado_em }; }), results: res, classifications: cls, engine_version: L.VERSAO });
    return li.resultado;
  }
  function salvarLI(alvo) {
    var pid = paciente(); if (!temSupa() || !li.resultado) return Promise.resolve(false);
    var raizEl = alvo || document;   // a mesma leitura pode estar desenhada em mais de um lugar: le os campos DO alvo clicado
    var resp = raizEl.querySelector("#li-responsavel"), nota = raizEl.querySelector("#li-nota");
    if (!resp || !resp.value.trim()) { if (window.avisar) window.avisar("Informe quem é responsável pela leitura."); return Promise.resolve(false); }
    var pk = pacoteReal(), cols = Object.keys(li.coletas).filter(function (k) { return li.coletas[k]; });
    var rids = []; cols.forEach(function (c) { (dados.resultados[c] || []).forEach(function (r) { rids.push(r.id); }); });
    var refs = []; cols.forEach(function (c) { (dados.resultados[c] || []).forEach(function (r) { if (r.reference_status === "informed") refs.push({ result_id: r.id, source: "laudo", text: r.report_reference_text, min: r.report_reference_min, max: r.report_reference_max, unit: r.report_reference_unit || r.unit_original }); }); });
    var p = { patient_id: pid, responsible: resp.value.trim(), rule_package_id: pk.id, engine_version: li.resultado.trace.engine_version, state: li.resultado.estado_geral, reason_codes: li.resultado.reason_codes, trace: li.resultado.trace,
      holoscan_application_id: li.app || null, selected_collection_ids: cols, selected_result_ids: rids, references_snapshot: refs, sources_snapshot: { holoscan: li.app || null, collections: cols.map(function (c) { var x = dados.coletas.filter(function (y) { return y.id === c; })[0]; return { id: c, clinical_date: x && x.coletado_em, revision: x && x.revision }; }) }, professional_note: nota ? nota.value.trim() || null : null };
    return Promise.resolve(sb().rpc("salvar_leitura_integrada", { payload: p })).then(function (r) { if (r.error) throw r.error; return carregar(pid).then(function () { desenharLI(true); if (window.avisar) window.avisar("Leitura integrada salva (estado: " + r.data.state + ")."); return true; }); })
      .catch(function (e) { if (window.avisar) window.avisar("Não foi possível salvar a leitura: " + (window.mensagemHumana ? window.mensagemHumana(e) : e.message)); return false; });
  }
  var alvosLI = [];
  function htmlLI(compacto) {
    var L = window.LeituraIntegradaMotor, pk = pacoteReal();
    var aviso = window.Metodologia ? window.Metodologia.avisoHtml() : "";
    var regra = L && L.pacoteTemRegraReal(pk);
    var cab = '<p class="dash-sub li-status" id="li-status"><b>Pacote de regras ' + escapar(pk.code + " v" + pk.version) + " · " + escapar(pk.status) + ".</b> " + (regra ? "" : "Nenhum domínio, vínculo exame → domínio, suficiência, janela temporal ou regra de resultados mistos foi homologado: a única leitura possível é <b>sem dados suficientes</b>. Nenhum exame fora da referência confirma ou contradiz o HOLOSCAN.") + "</p>";
    if (!temSupa()) return aviso + cab + '<p class="dash-vazio">Sem conta ativa não há aplicação HOLOSCAN nem coleta no servidor para selecionar.</p>';
    var sel = '<div class="li-selecao"><label class="evo-campo"><span>Aplicação HOLOSCAN consolidada</span><select id="li-app"><option value="">— escolher —</option>' + dados.aplicacoes.map(function (a) { return '<option value="' + escapar(a.id) + '"' + (li.app === a.id ? " selected" : "") + ">" + escapar(dataBR(a.quando)) + " · estrutura v" + escapar(String(a.versao_estrutura)) + (a.cobertura && typeof a.cobertura.respondidos === "number" ? " · cobertura " + a.cobertura.respondidos + "/" + a.cobertura.total : "") + " · id " + escapar(String(a.id).slice(0, 8)) + "</option>"; }).join("") + "</select></label>" +
      '<div class="li-coletas"><span>Coletas (escolha explícita; nada é escolhido por data de edição)</span>' + (dados.coletas.filter(atual).length ? dados.coletas.filter(atual).map(function (c) { return '<label><input type="checkbox" data-li-coleta="' + escapar(c.id) + '"' + (li.coletas[c.id] ? " checked" : "") + "> " + escapar(rotuloColeta(c)) + " · " + (dados.resultados[c.id] || []).length + " resultado(s) · id " + escapar(String(c.id).slice(0, 8)) + "</label>"; }).join("") : '<p class="dash-vazio">Nenhuma coleta registrada.</p>') + "</div>" +
      '<button type="button" class="btn-fantasma" data-li-acao="calcular">Calcular leitura</button></div>';
    var r = li.resultado, saida = "";
    if (r) {
      saida = '<div class="li-resultado" id="li-resultado"><p><b>Estado:</b> <span class="conf-selo li-estado ' + escapar(r.estado_geral) + '">' + escapar(r.estado_geral.replace(/_/g, " ")) + "</span></p>" +
        '<p><b>Motivos:</b> ' + (r.reason_codes.length ? r.reason_codes.map(function (m) { return "<code>" + escapar(m) + "</code> " + escapar(L.MOTIVO[m] || ""); }).join("; ") : "—") + "</p>" +
        '<details><summary>Trace</summary><pre class="mh-pre">' + escapar(JSON.stringify(r.trace, null, 2)) + "</pre></details>" +
        '<div class="li-salvar"><input type="text" id="li-responsavel" placeholder="responsável pela leitura (nome)"><input type="text" id="li-nota" placeholder="nota profissional (opcional)"><button type="button" class="btn-fantasma" data-li-acao="salvar">Salvar leitura (congela fontes)</button></div></div>';
    }
    var salvas = dados.leituras.length ? '<div class="dash-bloco dash-bloco-compacto"><h3 class="dash-titulo">Leituras salvas</h3><ul class="dash-pendentes">' + dados.leituras.map(function (x) { return "<li>" + escapar(String(x.created_at).slice(0, 16)) + " · <b>" + escapar(x.state.replace(/_/g, " ")) + "</b> · rev " + x.revision + (x.superseded_at ? " (substituída)" : "") + " · " + escapar(x.responsible) + (x.professional_note ? " — " + escapar(x.professional_note) : "") + "</li>"; }).join("") + "</ul></div>" : "";
    return aviso + cab + (compacto ? "" : "") + sel + saida + salvas;
  }
  /* Timeline, Evolucao, relatorios e HOLOS AI leem as coletas pela Sincronizacao: depois de
     gravar pela RPC, recarrega a copia dela (o servidor e a fonte). */
  function sincronizarCopias(pid) {
    var S = window.Sincronizacao;
    return S && S.atualizarColetas ? Promise.resolve(S.atualizarColetas(pid)).catch(function () {}) : Promise.resolve();
  }
  function desenharLI(recarregado) {
    alvosLI.forEach(function (id) {
      var alvo = document.getElementById(id); if (!alvo) return;
      var pid = paciente();
      /* sempre relê o servidor ao abrir a Leitura Integrada: a aplicacao HOLOSCAN ou a coleta
         podem ter sido gravadas depois da ultima leitura (o cache nunca escolhe por nos) */
      /* alvo escondido (secao/aba fechada): nada e lido do servidor agora — quem abre a secao
         (irPara("confronto"), aba HOLOSCAN da ficha) redesenha e ai sim le */
      var secao = alvo.closest(".secao");
      if (!recarregado && id === "holo-confronto" && secao && !secao.classList.contains("ativa")) { alvo.innerHTML = '<p class="dash-vazio">Abra a Leitura Integrada para carregar.</p>'; return; }
      if (!recarregado) { carregar(pid).then(function () { return carregarAplicacoes(pid); }).then(function () { desenharLI(true); }); alvo.innerHTML = '<p class="dash-vazio">Carregando…</p>'; return; }
      alvo.innerHTML = htmlLI(id !== "holo-confronto");
      var sel = alvo.querySelector("#li-app"); if (sel) sel.addEventListener("change", function () { li.app = sel.value; });
      alvo.querySelectorAll("[data-li-coleta]").forEach(function (cb) { cb.addEventListener("change", function () { li.coletas[cb.dataset.liColeta] = cb.checked; }); });
      alvo.querySelectorAll("[data-li-acao]").forEach(function (b) { b.addEventListener("click", function () { if (b.dataset.liAcao === "calcular") { calcularLI(); desenharLI(true); } if (b.dataset.liAcao === "salvar") salvarLI(alvo); }); });
    });
  }
  /** Leitura Integrada: le as aplicacoes HOLOSCAN consolidadas do paciente (so aqui). */
  function carregarAplicacoes(pid) {
    if (!pid || pid === SEM_PACIENTE || !UUID_RE.test(pid) || !temSupa()) return Promise.resolve([]);
    return Promise.resolve(sb().from("holoscan_applications").select("id, quando, versao_estrutura, cobertura, avaliavel, methodology_package_id, created_at").eq("patient_id", pid))
      .then(function (r) {
        if (r && r.error) { if (dados.pid === pid) dados.erro = dados.erro || r.error; return dados.aplicacoes; }
        var lista = (r.data || []).slice().sort(function (a, b) { return String(b.quando).localeCompare(String(a.quando)) || String(b.created_at).localeCompare(String(a.created_at)); });
        if (dados.pid === pid) dados.aplicacoes = lista;
        return lista;
      });
  }
  function desenharLeituraIntegrada(alvoId) { if (alvoId && alvosLI.indexOf(alvoId) < 0) alvosLI.push(alvoId); desenharLI(false); }
  /** Entrada publica do painel: sempre relê o servidor (abrir a aba nao e editar, mas e olhar o estado atual). */
  function desenharRecarregando() {
    var alvo = document.getElementById("lab-corpo"); if (!alvo) return;
    var pid = paciente();
    alvo.innerHTML = '<p class="dash-vazio">Carregando coletas…</p>';
    carregar(pid).then(desenhar);
  }

  /* ---------- API --------------------------------------------------------- */
  window.Laboratorio = {
    desenhar: desenharRecarregando, redesenhar: desenhar, carregar: carregar, dados: function () { return dados; }, esquecer: function () { limpar(null); editor = null; li = { app: "", coletas: {}, resultado: null }; },
    nomeExame: nomeExame, identidadeTexto: identidadeTexto, referenciaDoLaudo: referenciaDoLaudo, classificar: classificar, textoClassificacao: textoClassificacao, rotuloColeta: rotuloColeta, ordemClinica: ordemClinica,
    desenharLeituraIntegrada: desenharLeituraIntegrada, calcularLeituraIntegrada: calcularLI, pacoteReal: pacoteReal,
    /** Para a Evolucao: compara dois resultados V1 pelo LabMotor (compatibilidade verificada; delta so quando compativel). */
    comparar: function (a, b) { return motor().comparar(a, b, { conversoes: [] }); }
  };
  document.addEventListener("DOMContentLoaded", function () {
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () { limpar(null); });
  });
})();
