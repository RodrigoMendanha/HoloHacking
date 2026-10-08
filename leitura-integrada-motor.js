/* ===========================================================================
   LEITURA INTEGRADA — MOTOR GENERICO VERSIONADO 2.0.0 (Etapa 6.0)
   ===========================================================================

   Le um PACOTE DE REGRAS (dominios com modo de mapeamento HOLOSCAN, vinculos
   exame->dominio com cross_source_role, regra temporal, regra de direcao
   HOLOSCAN, suficiencia e mistos por dominio, convergencia, textos) e produz,
   POR DOMINIO, a leitura: direcao HOLOSCAN, direcao laboratorial, estado
   oficial (convergente | divergente | sem_dados_suficientes) ou "sem
   confronto na V1", com reason_codes, trace e snapshot congelavel.

   Tudo que decide vem do pacote: este arquivo nao conhece exame, dominio,
   sistema, faixa ou limite. O conteudo real esta em
   leitura-integrada-pacote-v1.js (LI-V1 @ 2) e na migration 20261002120000.

   ORDEM OBRIGATORIA (DECISAO 19 / Etapa 5.9):
     1 fonte HOLOSCAN  2 versao compativel  3 temporalidade (LI-TEMP-01)
     4 vinculos  5 resultados selecionados (duplicidade)  6 referencia/unidade/
     contexto (classificacao do LabMotor)  7 suficiencia  8 mistos
     9 laboratory_direction  10 holoscan_direction  11 estado oficial.

   O que NUNCA acontece aqui: maioria, media, peso, score laboratorial, "um
   alterado vence", recalculo do HOLOSCAN com exames, heranca de legado,
   confrontar() antigo, inferencia por nome. Exames nunca alteram nota,
   faixa, Indice ou Triada: o HOLOSCAN entra como fonte congelada.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO = "motor-leitura-integrada-2.0.2";
  var ESTADOS = ["convergente", "divergente", "sem_dados_suficientes"];
  var DIRECOES = ["attention_present", "attention_not_detected", "indeterminate"];
  var P = "attention_present", N = "attention_not_detected", I = "indeterminate";
  var CLASSIF_PARA_REASON = { missing_reference: "missing_reference", ambiguous_reference: "ambiguous_reference", incompatible_unit: "incompatible_unit", incompatible_variant: "incompatible_variant", incompatible_material: "incompatible_material", incompatible_method: "incompatible_method",
    qualitative_without_rule: "qualitative_rule_missing", qualitative_rule_missing: "qualitative_rule_missing", censored_value: "censored_value_ambiguous", censored_value_ambiguous: "censored_value_ambiguous", empty_value: "not_classifiable", reference_not_approved: "missing_reference", unknown_operator: "not_classifiable" };

  function aprovado(x) { return !!x && x.status === "aprovado"; }
  function normT(t) { return String(t === null || t === undefined ? "" : t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  function diaUTC(s) { if (!s) return null; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); if (!m) return null; return Date.UTC(+m[1], +m[2] - 1, +m[3]); }
  /** Delta em dias corridos COM SINAL: coleta - aplicacao. Nulo quando falta data clinica. */
  function deltaDias(coleta, aplicacao) { var a = diaUTC(coleta), b = diaUTC(aplicacao); return a === null || b === null ? null : Math.round((a - b) / 86400000); }
  function regra(p, tipo, d) {
    var rs = (p.rules || []).filter(function (r) { return r.rule_type === tipo && aprovado(r); });
    var esp = d ? rs.filter(function (r) { return r.target === d.code || r.target === d.id; })[0] : null;
    return esp || rs.filter(function (r) { return r.target === "global"; })[0] || null;
  }
  function unico(arr) { var out = []; (arr || []).forEach(function (x) { if (x && out.indexOf(x) < 0) out.push(x); }); return out; }
  function identidade(r) { return [r.exam_code || "", normT(r.variant), normT(r.material)].join("|"); }

  /* ---------- passo 10: direcao HOLOSCAN (fonte congelada; faixas oficiais) --- */
  function direcaoHoloscan(hd, holo, d) {
    var out = { application_id: null, application_clinical_date: null, package: null, system: d.holoscan_system || null, avaliavel: null, faixa: null, nota: null, direction: I, reason: null };
    if (!holo || !holo.application) { out.reason = (hd && hd.payload.missing_reason) || "missing_holoscan_source"; return out; }
    var app = holo.application; out.application_id = app.id || null; out.application_clinical_date = app.clinical_date || null; out.package = app.methodology_package || null;
    if (!hd) { out.reason = "missing_holoscan_direction_rule"; return out; }
    var pl = hd.payload || {}, mp = app.methodology_package;
    var compat = !!mp && (!pl.package_code || mp.code === pl.package_code) && (typeof pl.min_package_version !== "number" || Number(mp.version) >= pl.min_package_version) && (!pl.required_package_status || mp.status === pl.required_package_status);
    if (!compat) { out.reason = pl.incompatible_reason || "incompatible_holoscan_version"; return out; }
    var sr = holo.system_results && d.holoscan_system ? holo.system_results[d.holoscan_system] : null;
    if (!sr || sr.avaliavel !== true) { out.avaliavel = false; out.direction = pl.not_evaluable || I; out.reason = pl.not_evaluable_reason || "holoscan_not_evaluable"; return out; }
    out.avaliavel = true; out.faixa = sr.faixa || null; out.nota = sr.nota_exata !== undefined ? sr.nota_exata : (sr.nota !== undefined ? sr.nota : null);
    var dir = pl.faixa_map ? pl.faixa_map[sr.faixa] : null;
    if (!dir) { out.direction = I; out.reason = pl.not_evaluable_reason || "holoscan_not_evaluable"; return out; }
    out.direction = dir; return out;
  }

  /* ---------- passos 3..9 por dominio ------------------------------------- */
  function dominio(p, d, ent, holo, temp, cls, colecoes, selecionados) {
    var links = (p.links || []).filter(function (l) { return ((d.id !== undefined && d.id !== null && l.domain_id === d.id) || (l.domain !== undefined && l.domain === d.code)) && aprovado(l); });
    var suf = regra(p, "sufficiency", d), mix = regra(p, "mixed", d), conv = regra(p, "convergence", d), hd = regra(p, "holoscan_direction", d), txt = regra(p, "text", d);
    var mapped = d.holoscan_mapping_mode === "mapped" && !!d.holoscan_system;
    var reasons = [], itens = [], temporal = { rule_code: temp ? temp.payload.code : null, rule_version: temp ? temp.payload.version : null, max_days: temp ? temp.payload.max_days : null, inclusive: temp ? temp.payload.inclusive !== false : null, application_clinical_date: holo && holo.application ? holo.application.clinical_date || null : null, collections: [] };
    var appDate = temporal.application_clinical_date;
    // 3. temporalidade por coleta (datas CLINICAS; nunca created_at/updated_at)
    Object.keys(colecoes).forEach(function (cid) {
      var c = colecoes[cid], dd = temp && appDate ? deltaDias(c.clinical_date, appDate) : null, st;
      if (!temp) st = "missing_temporal_rule"; else if (!holo || !holo.application) st = "missing_holoscan_source"; else if (!c.clinical_date || !appDate) st = "missing_clinical_date"; else st = Math.abs(dd) <= temp.payload.max_days ? "compatible" : "incompatible";
      temporal.collections.push({ id: cid, clinical_date: c.clinical_date || null, temporal_delta_days: dd, temporal_status: st });
    });
    var tempDe = {}; temporal.collections.forEach(function (c) { tempDe[c.id] = c; });
    // 4. vinculos: so resultados com vinculo aprovado neste dominio; variante tem de ser nula ou declarada
    (ent.results || []).forEach(function (r) {
      var l = links.filter(function (x) { return x.exam_code === r.exam_code; })[0];
      if (!l) return;
      var it = { result_id: r.id, collection_id: r.collection_id, exam_code: r.exam_code, variant: r.variant || null, material: r.material || null, method: r.method || null, value_original_text: r.value_original_text !== undefined ? r.value_original_text : null, unit_original: r.unit_original || null,
        reference_status: r.reference_status || null, reference_text: r.report_reference_text !== undefined ? r.report_reference_text : null, reference_min: r.report_reference_min !== undefined ? r.report_reference_min : null, reference_max: r.report_reference_max !== undefined ? r.report_reference_max : null,
        cross_source_role: l.cross_source_role || "contextual", link_direction: l.direction || "any", classification: null, classification_reasons: [], reference_source: null, direction: null, temporal_status: null, temporal_delta_days: null, included: false, exclusion_reason: null };
      var variante = normT(r.variant);
      if (variante && !(l.variants_declared || []).map(normT).some(function (v) { return v === variante; })) { it.exclusion_reason = "incompatible_variant"; itens.push(it); return; }
      var tc = tempDe[r.collection_id] || { temporal_status: "missing_clinical_date", temporal_delta_days: null };
      it.temporal_status = tc.temporal_status; it.temporal_delta_days = tc.temporal_delta_days;
      var c = cls[r.id] || null;
      it.classification = c ? c.classification : null; it.classification_reasons = c ? (c.reason_codes || []) : ["not_classifiable"]; it.reference_source = c ? (c.reference_source || null) : null;
      if (tc.temporal_status === "incompatible") { it.exclusion_reason = "outside_time_window"; itens.push(it); return; }
      if (tc.temporal_status !== "compatible") { it.exclusion_reason = tc.temporal_status; itens.push(it); return; }
      // 6. referencia/unidade/contexto: classificacao do LabMotor (nunca duplicada aqui)
      if (!c || c.classification === "not_classifiable") { it.exclusion_reason = CLASSIF_PARA_REASON[(c && c.reason_codes && c.reason_codes[0]) || "not_classifiable"] || "not_classifiable"; itens.push(it); return; }
      it.included = true;
      if (l.cross_source_role === "directional" && l.direction_rules) it.direction = l.direction_rules[c.classification] || I;
      itens.push(it);
    });
    // 5. duplicidade: mesma identidade (exame+variante+material) elegivel em mais de uma coleta -> escolha explicita por result_id
    var grupos = {}; itens.filter(function (i) { return i.included; }).forEach(function (i) { (grupos[identidade(i)] = grupos[identidade(i)] || []).push(i); });
    var duplicados = [];
    Object.keys(grupos).forEach(function (k) {
      var g = grupos[k]; if (g.length < 2) return;
      var esc = g.filter(function (i) { return selecionados.indexOf(i.result_id) >= 0; });
      if (esc.length === 1) { g.forEach(function (i) { if (i !== esc[0]) { i.included = false; i.exclusion_reason = "not_selected_duplicate"; } }); return; }
      g.forEach(function (i) { i.included = false; i.exclusion_reason = "duplicate_result_unresolved"; }); duplicados.push(k);
    });
    var incl = itens.filter(function (i) { return i.included; });
    var dirInc = incl.filter(function (i) { return i.cross_source_role === "directional"; }), ctxInc = incl.filter(function (i) { return i.cross_source_role === "contextual"; });
    var disponibilidade = { results_total: itens.length, classifiable: incl.length, directional_classifiable: dirInc.length, contextual_classifiable: ctxInc.length, excluded: itens.length - incl.length };
    var textos = txt ? txt.payload : {};
    var base = { domain_id: d.id || null, domain_code: d.code, domain_name: d.name, domain_definition: d.definition || null, holoscan_mapping_mode: mapped ? "mapped" : "none", holoscan_system: d.holoscan_system || null,
      cross_source_mode: mapped ? "enabled" : "not_applicable", lab_domain_availability: disponibilidade, temporal: temporal, items: itens, duplicates_unresolved: duplicados, engine_version: VERSAO };
    // dominio SEM confronto na V1: informacao laboratorial; nenhum estado oficial, nenhum missing_domain_holoscan_mapping
    if (!mapped) {
      return Object.assign(base, { sufficiency: { mode: "not_applicable", satisfied: null }, mixed: { mode: "not_applicable", considered: [] }, holoscan: null, laboratory_direction: null, holoscan_direction: null, state: null, reason_codes: [],
        text: { profissional: textos.sem_confronto_holoscan || null, paciente: textos.sem_confronto_holoscan || null } });
    }
    // 7. suficiencia (SO directional; contextual nao conta)
    var sp = suf ? suf.payload : null, sufic = { mode: sp ? sp.mode : null, rule_version: sp ? sp.version : null, min_classifiable_results: sp ? sp.min_classifiable_results : null, required_exam_codes: sp ? sp.required_exam_codes || [] : [], required_exam_groups: sp ? sp.required_exam_groups || [] : [], optional_directional_exam_codes: sp ? sp.optional_directional_exam_codes || [] : [],
      classifiable_directional_count: dirInc.length, required_missing: [], groups_unmet: [], satisfied: false };
    if (!suf || !sp || sp.mode !== "rule_based") reasons.push("missing_domain_sufficiency_rule");
    else {
      var temCodigo = function (code) { return dirInc.some(function (i) { return i.exam_code === code; }); };
      sufic.required_missing = (sp.required_exam_codes || []).filter(function (c) { return !temCodigo(c); });
      sufic.groups_unmet = (sp.required_exam_groups || []).filter(function (g) { return (g.any_of || []).filter(temCodigo).length < (g.min || 1); }).map(function (g) { return g.code; });
      var minimo = typeof sp.min_classifiable_results === "number" ? sp.min_classifiable_results : null;
      if (sufic.required_missing.length) reasons.push("missing_required_exam");
      if (sufic.groups_unmet.length) reasons.push("missing_required_exam");
      if (minimo === null || dirInc.length < minimo) reasons.push("insufficient_domain_coverage");
      sufic.satisfied = !sufic.required_missing.length && !sufic.groups_unmet.length && minimo !== null && dirInc.length >= minimo;
    }
    // motivos reais da causa (exclusoes dos directional) e duplicidade
    // simulacao 08/10: um exame excluido (ex.: coleta antiga fora da janela) que tem OUTRO resultado do mesmo
    // exame incluido nao e causa de nada — o motivo dele so polui o dominio. Estado e suficiencia nao mudam.
    var codIncluidos = {}; itens.forEach(function (i) { if (i.included) codIncluidos[i.exam_code] = true; });
    itens.filter(function (i) { return i.cross_source_role === "directional" && !i.included && i.exclusion_reason && i.exclusion_reason !== "not_selected_duplicate" && !codIncluidos[i.exam_code]; }).forEach(function (i) { reasons.push(i.exclusion_reason); });
    if (!temp) reasons.push("missing_temporal_rule");
    if (!(ent.collections || []).length) reasons.push("missing_lab_source");
    // 8. mistos (unanimidade; mistura -> indeterminate; nunca maioria/media/peso/score)
    var mp = mix ? mix.payload : null, mixed = { mode: mp ? mp.mode : null, rule_version: mp ? mp.version : null, considered: [], laboratory_direction: I, reason: null };
    if (sufic.satisfied) {
      if (!mp || mp.mode !== "unanimity") { mixed.reason = "mixed_without_rule"; reasons.push("mixed_without_rule"); }
      else {
        var opc = sp.optional_directional_exam_codes || [];
        var uteis = [], bloqueio = false;
        dirInc.forEach(function (i) {
          // participante = todo directional que nao e opcional (obrigatorio, membro de grupo ou directional sem lista); opcional = optional_directional_exam_codes
          var eOpcional = opc.indexOf(i.exam_code) >= 0;
          mixed.considered.push({ result_id: i.result_id, exam_code: i.exam_code, direction: i.direction, role: eOpcional ? "optional" : "participant" });
          if (i.direction === P || i.direction === N) uteis.push(i.direction);
          else if (!eOpcional && mp.indeterminate_participant_blocks !== false && mp.indeterminate_required_blocks !== false) bloqueio = true;   // participante indeterminate -> directional_result_indeterminate; opcional (ex.: fibrinogenio em D01) nao conta nem bloqueia
        });
        // 9. laboratory_direction
        var temP = uteis.indexOf(P) >= 0, temN = uteis.indexOf(N) >= 0;
        if (temP && temN) { mixed.laboratory_direction = mp.mixture || I; mixed.reason = mp.mixture_reason || "mixed_results_indeterminate"; }   // mistura real present + not_detected
        else if (bloqueio || !uteis.length) { mixed.laboratory_direction = I; mixed.reason = mp.indeterminate_participant_reason || "directional_result_indeterminate"; }   // participante indeterminate, sem excecao
        else if (temP) mixed.laboratory_direction = mp.all_present || P;
        else mixed.laboratory_direction = mp.all_not_detected || N;
        if (mixed.laboratory_direction === I) reasons.push(mixed.reason);
      }
    }
    var labDir = sufic.satisfied && mixed.laboratory_direction ? mixed.laboratory_direction : I;
    // 1/2/10. HOLOSCAN (fonte congelada): compatibilidade de versao, avaliabilidade, faixa -> direcao
    var hol = direcaoHoloscan(hd, holo, d);
    if (hol.reason) reasons.unshift(hol.reason);
    var holDir = hol.direction;
    // 11. estado oficial
    var estado = "sem_dados_suficientes";
    var cp = conv ? conv.payload : null;
    if (!conv) reasons.push("missing_convergence_rule");
    if (conv && sufic.satisfied && labDir !== I && holDir !== I && !hol.reason) {
      var par = [holDir, labDir], emLista = function (lista) { return (lista || []).some(function (x) { return x[0] === par[0] && x[1] === par[1]; }); };
      if (emLista(cp.convergente)) estado = "convergente"; else if (emLista(cp.divergente)) estado = "divergente";
    }
    var rc = unico(reasons);
    if (estado !== "sem_dados_suficientes") rc = [];
    var semSinal = estado === "convergente" && holDir === N;
    var texto = { profissional: textos[estado] || null, paciente: textos.paciente ? (semSinal && textos.paciente.convergente_sem_sinal ? textos.paciente.convergente_sem_sinal : textos.paciente[estado] || null) : null };
    return Object.assign(base, { sufficiency: sufic, mixed: mixed, holoscan: hol, laboratory_direction: labDir, holoscan_direction: holDir, state: estado, reason_codes: rc, text: texto });
  }

  /** Snapshot congelavel (DECISAO 25 / Etapa 6): tudo que a leitura usou, sem a observacao profissional (separada). */
  function snapshotDe(p, dom, ent, holo, cls) {
    var refs = []; dom.items.forEach(function (i) { var c = cls[i.result_id]; if (c && c.trace && c.trace.reference) refs.push({ result_id: i.result_id, source: c.reference_source || null, reference: c.trace.reference }); });
    return { engine_version: VERSAO, patient_id: ent.patient_id || null, domain_code: dom.domain_code, holoscan_mapping_mode: dom.holoscan_mapping_mode, holoscan_system: dom.holoscan_system,
      application_id: holo && holo.application ? holo.application.id || null : null, application_clinical_date: holo && holo.application ? holo.application.clinical_date || null : null,
      holoscan_package: holo && holo.application ? holo.application.methodology_package || null : null, holoscan_system_result: dom.holoscan ? { avaliavel: dom.holoscan.avaliavel, faixa: dom.holoscan.faixa, nota: dom.holoscan.nota } : null,
      selected_collection_ids: (ent.collections || []).map(function (c) { return c.id; }), collection_clinical_dates: dom.temporal.collections.map(function (c) { return { id: c.id, clinical_date: c.clinical_date, temporal_delta_days: c.temporal_delta_days, temporal_status: c.temporal_status }; }),
      selected_result_ids: dom.items.filter(function (i) { return i.included; }).map(function (i) { return i.result_id; }),
      items: dom.items.map(function (i) { return { result_id: i.result_id, collection_id: i.collection_id, exam_code: i.exam_code, variant: i.variant, material: i.material, method: i.method, value_original_text: i.value_original_text, unit_original: i.unit_original, cross_source_role: i.cross_source_role, classification: i.classification, classification_reasons: i.classification_reasons, reference_source: i.reference_source, reference_status: i.reference_status, reference_text: i.reference_text, reference_min: i.reference_min, reference_max: i.reference_max, direction: i.direction, temporal_delta_days: i.temporal_delta_days, temporal_status: i.temporal_status, included: i.included, exclusion_reason: i.exclusion_reason }; }),
      references: refs, excluded: dom.items.filter(function (i) { return !i.included; }).map(function (i) { return { result_id: i.result_id, exam_code: i.exam_code, reason: i.exclusion_reason }; }),
      temporal_rule_code: dom.temporal.rule_code, temporal_rule_version: dom.temporal.rule_version, li_package: { id: p.id || null, code: p.code, version: p.version, status: p.status },
      sufficiency_rule: dom.sufficiency ? { mode: dom.sufficiency.mode, version: dom.sufficiency.rule_version, min_classifiable_results: dom.sufficiency.min_classifiable_results, required_exam_codes: dom.sufficiency.required_exam_codes, required_exam_groups: dom.sufficiency.required_exam_groups, optional_directional_exam_codes: dom.sufficiency.optional_directional_exam_codes } : null,
      mixed_rule: dom.mixed ? { mode: dom.mixed.mode, version: dom.mixed.rule_version } : null,
      holoscan_direction: dom.holoscan_direction, laboratory_direction: dom.laboratory_direction, official_state: dom.state, reason_codes: dom.reason_codes };
  }

  /**
   * calcular({ rule_package, holoscan: { application: { id, clinical_date, methodology_package: { id, code, version, status } }, system_results: { code: { avaliavel, nota, nota_exata, faixa } } } | null,
   *            collections: [{ id, clinical_date }], results: [{ id, collection_id, exam_code, variant, material, method, value_original_text, unit_original }],
   *            classifications: { result_id: saida de LabMotor.classificar }, selected_result_ids: [ids escolhidos explicitamente p/ duplicidade], patient_id })
   */
  function calcular(entrada) {
    entrada = entrada || {};
    var p = entrada.rule_package, dominios = {}, trilha = [];
    var base = { engine_version: VERSAO, rule_package_id: p ? p.id || p.code : null, rule_package_code: p ? p.code : null, rule_version: p ? p.version : null, rule_package_status: p ? p.status : null,
      holoscan_application_id: entrada.holoscan && entrada.holoscan.application ? entrada.holoscan.application.id : null, collection_ids: (entrada.collections || []).map(function (c) { return c.id; }), result_ids: (entrada.results || []).map(function (r) { return r.id; }) };
    if (!p) return { engine_version: VERSAO, domains: {}, estado_geral: "sem_dados_suficientes", reason_codes: ["missing_domain_sufficiency_rule"], trace: Object.assign({ passos: [{ passo: "pacote", motivo: "sem pacote de regras" }] }, base) };
    var doms = (p.domains || []).filter(aprovado).slice().sort(function (a, b) { return (a.position || 0) - (b.position || 0) || String(a.code).localeCompare(String(b.code)); });
    var temp = regra(p, "temporal", null);
    var cls = entrada.classifications || {}, holo = entrada.holoscan || null;
    var colecoes = {}; (entrada.collections || []).forEach(function (c) { colecoes[c.id] = c; });
    var sel = entrada.selected_result_ids || [];
    doms.forEach(function (d) {
      var r = dominio(p, d, entrada, holo, temp, cls, colecoes, sel);
      r.snapshot = snapshotDe(p, r, entrada, holo, cls);
      dominios[d.code] = r;
      trilha.push({ passo: "dominio", dominio: d.code, modo: r.cross_source_mode, estado: r.state, holoscan: r.holoscan_direction, laboratorio: r.laboratory_direction, motivos: r.reason_codes });
    });
    var habilitados = Object.keys(dominios).filter(function (k) { return dominios[k].cross_source_mode === "enabled"; });
    var estados = habilitados.map(function (k) { return dominios[k].state; });
    var geral = !estados.length || estados.every(function (e) { return e === "sem_dados_suficientes"; }) ? "sem_dados_suficientes" : estados.some(function (e) { return e === "divergente"; }) ? "divergente" : "convergente";
    var rcs = []; habilitados.forEach(function (k) { dominios[k].reason_codes.forEach(function (r) { if (rcs.indexOf(r) < 0) rcs.push(r); }); });
    return { engine_version: VERSAO, domains: dominios, cross_source_enabled: habilitados, not_applicable: Object.keys(dominios).filter(function (k) { return dominios[k].cross_source_mode !== "enabled"; }), estado_geral: geral, reason_codes: rcs, trace: Object.assign({ passos: trilha }, base) };
  }

  /** Barreira: um pacote REAL so produz convergente/divergente se tiver dominio e vinculo aprovados (e, no servidor, status aprovado). */
  function pacoteTemRegraReal(p) { return !!p && (p.domains || []).some(aprovado) && (p.links || []).some(aprovado); }
  /** Texto humano de um reason code, pela semantica do pacote (regra reason_semantics) ou fallback neutro. */
  function motivoHumano(p, code) { var r = p ? regra(p, "reason_semantics", null) : null; var m = r && r.payload && r.payload.codes ? r.payload.codes[code] : null; return m || MOTIVO[code] || code; }
  var MOTIVO = { missing_holoscan_direction_rule: "sem regra de direção HOLOSCAN homologada", missing_convergence_rule: "sem regra de convergência homologada", not_selected_duplicate: "resultado duplicado não escolhido para esta leitura", not_classifiable: "resultado não classificável", missing_temporal_rule: "sem regra temporal homologada", missing_lab_source: "nenhuma coleta selecionada" };
  var ROTULO_DIRECAO = { attention_present: "sinal de atenção presente", attention_not_detected: "sinal de atenção não detectado", indeterminate: "indeterminada" };

  raiz.LeituraIntegradaMotor = { VERSAO: VERSAO, ESTADOS: ESTADOS, DIRECOES: DIRECOES, calcular: calcular, pacoteTemRegraReal: pacoteTemRegraReal, deltaDias: deltaDias, motivoHumano: motivoHumano, MOTIVO: MOTIVO, ROTULO_DIRECAO: ROTULO_DIRECAO };
})();
