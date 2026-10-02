/* ===========================================================================
   MOTOR LABORATORIAL V1 — deterministico, versionado (Etapa 5)
   ===========================================================================

   O que faz: (1) interpreta o VALOR ORIGINAL do laudo sem destrui-lo
   (numerico exato, censurado "< 0,10", qualitativo "Negativo");
   (2) classifica UM resultado contra UMA referencia aplicavel
   (below | within | above | not_classifiable) com reason_codes e trace;
   (3) compara dois resultados so quando compativeis; (4) aplica conversao
   de unidade SO com regra aprovada (a tabela real V1 e vazia).

   O que NAO faz: nao inventa referencia, nao converte sem regra, nao soma
   exames, nao gera score/nota/indice laboratorial, nao interpreta
   qualitativo sem regra, nao toca em nada do HOLOSCAN.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO = "motor-lab-1.1.0";   // 1.1.0 (Etapa 6): censurado deterministico (DECISAO 15) e referencia ambigua (DECISAO 07)

  function vazio(v) { return v === null || v === undefined || String(v).trim() === ""; }
  function normU(u) { return String(u || "").replace(/\s+/g, "").replace(/µ/g, "u").toLowerCase(); }
  function normT(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }

  /* ---------- 1. valor original -> estrutura (nunca destroi o original) ---- */
  var QUALIFICADORES = { "<": "lt", "<=": "lte", "≤": "lte", ">": "gt", ">=": "gte", "≥": "gte" };
  var PALAVRAS = [
    [/^(abaixo|inferior|menor)\s+(de|do|que|a)\s+/i, "lt"], [/^(acima|superior|maior)\s+(de|do|que|a)\s+/i, "gt"],
    [/^(abaixo|inferior)\s+do\s+limite\s+de\s+(quantificacao|deteccao|medicao)/i, "lt_limit"], [/^(acima)\s+do\s+limite\s+de\s+(quantificacao|deteccao|medicao)/i, "gt_limit"]
  ];
  function numeroDe(t) {
    var s = String(t).trim().replace(/\s/g, "");
    if (!/^[-+]?\d+([.,]\d+)?$/.test(s) && !/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) return null;
    if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(",", ".");
    var n = Number(s); return isFinite(n) ? n : null;
  }
  /** Devolve { value_original_text, kind: 'numeric'|'censored'|'qualitative'|'empty', numeric_value, qualifier, censor_limit }. */
  function interpretarValor(original) {
    var out = { value_original_text: original === null || original === undefined ? "" : String(original), kind: "empty", numeric_value: null, qualifier: null, censor_limit: null };
    var t = out.value_original_text.trim();
    if (!t) return out;
    var n = numeroDe(t);
    if (n !== null) { out.kind = "numeric"; out.numeric_value = n; out.qualifier = "eq"; return out; }
    var m = /^(<=|>=|≤|≥|<|>)\s*(.+)$/.exec(t);
    if (m) { var lim = numeroDe(m[2]); if (lim !== null) { out.kind = "censored"; out.qualifier = QUALIFICADORES[m[1]]; out.censor_limit = lim; return out; } }
    for (var i = 0; i < PALAVRAS.length; i++) {
      var p = PALAVRAS[i], mm = p[0].exec(normT(t));
      if (mm) {
        var resto = normT(t).slice(mm[0].length), lim2 = numeroDe(resto);
        out.kind = "censored"; out.qualifier = p[1].replace("_limit", ""); out.censor_limit = lim2;   // limite pode ficar nulo ("abaixo do limite de quantificacao")
        return out;
      }
    }
    out.kind = "qualitative"; out.qualifier = "text";
    return out;
  }

  /* ---------- 2. conversao de unidade: SO regra aprovada ------------------ */
  /** regras: [{ exam_code, from_unit, to_unit, factor, status:'aprovado', rule_version }] — a tabela real V1 e vazia. */
  function converter(valor, de, para, regras, examCode) {
    if (normU(de) === normU(para)) return { ok: true, value: valor, unit: para, rule: null };
    var r = (regras || []).filter(function (x) { return x.status === "aprovado" && (!x.exam_code || x.exam_code === examCode) && normU(x.from_unit) === normU(de) && normU(x.to_unit) === normU(para); })[0];
    if (!r || typeof r.factor !== "number") return { ok: false, reason: "incompatible_unit" };
    return { ok: true, value: valor * r.factor, unit: para, rule: { id: r.id || null, version: r.rule_version || null, factor: r.factor }, original_value: valor, original_unit: de };
  }

  /* ---------- 3. classificacao ------------------------------------------- */
  /** Referencia aplicavel: { source:'laudo'|'metodologica', min, max, operator ('range'|'lt'|'lte'|'gt'|'gte'), unit, variant?, material?, method?, status? } */
  function compativel(ref, res) {
    var motivos = [];
    // a referencia declara a identidade a que se aplica: chave presente (mesmo nula) = exige igualdade; chave ausente = nao restringe
    if (Object.prototype.hasOwnProperty.call(ref, "variant") && normT(ref.variant) !== normT(res.variant)) motivos.push("incompatible_variant");
    if (Object.prototype.hasOwnProperty.call(ref, "material") && normT(ref.material) !== normT(res.material)) motivos.push("incompatible_material");
    if (ref.method_relevant === true && normT(ref.method) !== normT(res.method)) motivos.push("incompatible_method");
    return motivos;
  }
  /** classificar(resultado, referencia, opcoes{ conversoes[] }) */
  function classificar(res, ref, opcoes) {
    opcoes = opcoes || {};
    var v = interpretarValor(res.value_original_text !== undefined ? res.value_original_text : res.valor_original);
    var trace = { engine_version: VERSAO, exam: res.exam_code || res.custom_exam_id || null, variant: res.variant || null, material: res.material || null, method: res.method || null, unit: res.unit_original || null, value: v, reference: ref ? { source: ref.source || null, min: ref.min, max: ref.max, operator: ref.operator || "range", unit: ref.unit || null, status: ref.status || null } : null, steps: [] };
    var out = function (cls, reasons) { return { classification: cls, reason_codes: reasons, reference_source: ref ? (ref.source || null) : null, trace: trace }; };
    if (v.kind === "empty") return out("not_classifiable", ["empty_value"]);
    if (v.kind === "qualitative") return out("not_classifiable", ["qualitative_without_rule"]);
    if (!ref) return out("not_classifiable", ["missing_reference"]);
    if (ref.ambiguous === true) return out("not_classifiable", ["ambiguous_reference"]);   // DECISAO 07: referencia do laudo ambigua nunca e classificada
    if (ref.source === "metodologica" && ref.status !== "aprovado") return out("not_classifiable", ["reference_not_approved"]);
    var inc = compativel(ref, res); if (inc.length) return out("not_classifiable", inc);
    var valor = v.kind === "censored" ? v.censor_limit : v.numeric_value, unidade = res.unit_original;
    if (v.kind === "censored" && valor === null) return out("not_classifiable", ["censored_value_ambiguous"]);
    if (!vazio(ref.unit) && !vazio(unidade) && normU(ref.unit) !== normU(unidade)) {
      var c = converter(valor, unidade, ref.unit, opcoes.conversoes, res.exam_code);
      if (!c.ok) return out("not_classifiable", ["incompatible_unit"]);
      trace.steps.push({ step: "conversion", from: unidade, to: ref.unit, factor: c.rule.factor, rule_version: c.rule.version, original_value: valor, converted_value: c.value });
      valor = c.value;
    } else if (vazio(ref.unit) !== vazio(unidade)) return out("not_classifiable", ["incompatible_unit"]);
    var op = ref.operator || "range", min = typeof ref.min === "number" ? ref.min : null, max = typeof ref.max === "number" ? ref.max : null;
    if (op === "range" && (min === null || max === null)) { if (min === null && max === null) return out("not_classifiable", ["missing_reference"]); op = min === null ? "lte" : "gte"; }
    trace.steps.push({ step: "compare", value: valor, operator: op, min: min, max: max, censored: v.kind === "censored" ? v.qualifier : null });
    /* DECISAO 15: valor censurado so classifica quando o intervalo PROVA um unico estado; numeric_value continua nulo.
       "< L": todo valor possivel e < L -> below se L <= min; within se (max e L <= max e nao ha min); senao ambiguo.
       "> L": todo valor possivel e > L -> above se L >= max; within se (min e L >= min e nao ha max); senao ambiguo. */
    if (v.kind === "censored") {
      var q = v.qualifier, abaixo = q === "lt" || q === "lte", acima = q === "gt" || q === "gte";
      if (abaixo && min !== null && valor <= min && (op === "range" || op === "gt" || op === "gte")) return out("below", []);
      if (acima && max !== null && valor >= max && (op === "range" || op === "lt" || op === "lte")) return out("above", []);
      if (abaixo && (op === "lt" || op === "lte") && max !== null && valor <= max) return out("within", []);
      if (acima && (op === "gt" || op === "gte") && min !== null && valor >= min) return out("within", []);
      return out("not_classifiable", ["censored_value_ambiguous"]);
    }
    if (op === "range") return out(valor < min ? "below" : valor > max ? "above" : "within", []);
    if (op === "lt") return out(valor < max ? "within" : "above", []);
    if (op === "lte") return out(valor <= max ? "within" : "above", []);
    if (op === "gt") return out(valor > min ? "within" : "below", []);
    if (op === "gte") return out(valor >= min ? "within" : "below", []);
    return out("not_classifiable", ["unknown_operator"]);
  }

  /* ---------- 4. comparacao entre dois resultados ------------------------- */
  function identidade(r) { return [r.exam_code || "", r.custom_exam_id || "", normT(r.variant), normT(r.material)].join("|"); }
  /** comparar(anterior, atual, opcoes{ conversoes[], metodoRelevante }) -> lado a lado sempre; delta so quando compativel. */
  function comparar(a, b, opcoes) {
    opcoes = opcoes || {};
    var motivos = [];
    if (!a || !b) motivos.push("missing_result");
    else {
      if ((a.exam_code || null) !== (b.exam_code || null) || (a.custom_exam_id || null) !== (b.custom_exam_id || null)) motivos.push("different_exam");
      if (normT(a.variant) !== normT(b.variant)) motivos.push("incompatible_variant");
      if (normT(a.material) !== normT(b.material)) motivos.push("incompatible_material");
      if (opcoes.metodoRelevante && normT(a.method) !== normT(b.method)) motivos.push("incompatible_method");
    }
    var va = a ? interpretarValor(a.value_original_text) : null, vb = b ? interpretarValor(b.value_original_text) : null;
    var lado = { anterior: a ? { value: a.value_original_text, unit: a.unit_original, date: a.clinical_date || null, reference: a.report_reference_text || null, id: a.id || null } : null,
      atual: b ? { value: b.value_original_text, unit: b.unit_original, date: b.clinical_date || null, reference: b.report_reference_text || null, id: b.id || null } : null,
      referencias_diferentes: !!(a && b && (a.report_reference_text || b.report_reference_text) && String(a.report_reference_text || "") !== String(b.report_reference_text || "")) };
    if (!motivos.length && (va.kind !== "numeric" || vb.kind !== "numeric")) motivos.push("non_numeric_value");
    var x = va && va.numeric_value, y = vb && vb.numeric_value, unidade = b ? b.unit_original : null;
    if (!motivos.length && normU(a.unit_original) !== normU(b.unit_original)) {
      var c = converter(x, a.unit_original, b.unit_original, opcoes.conversoes, b.exam_code);
      if (!c.ok) motivos.push("incompatible_unit"); else { lado.conversao = { de: a.unit_original, para: b.unit_original, fator: c.rule.factor, rule_version: c.rule.version }; x = c.value; }
    }
    if (motivos.length) return Object.assign(lado, { comparavel: false, delta: null, unidade: null, direcao: null, motivos: motivos, apresentacao: "lado_a_lado", engine_version: VERSAO });
    var d = y - x;
    return Object.assign(lado, { comparavel: true, delta: Number(d.toFixed(6)), unidade: unidade, direcao: d > 0 ? "aumentou" : d < 0 ? "reduziu" : "permaneceu", motivos: [], apresentacao: "delta", engine_version: VERSAO });
  }

  raiz.LabMotor = { VERSAO: VERSAO, interpretarValor: interpretarValor, classificar: classificar, comparar: comparar, converter: converter, identidade: identidade, normalizarUnidade: normU,
    /** Mensagens neutras para a tela. Nunca "normal", "alterado", "melhorou", "piorou". */
    ROTULO: { below: "abaixo da referência informada", within: "dentro da referência informada", above: "acima da referência informada", not_classifiable: "não classificável" },
    MOTIVO: { empty_value: "sem valor", qualitative_without_rule: "resultado qualitativo sem regra homologada", missing_reference: "sem referência do laudo", reference_not_approved: "referência metodológica não aprovada",
      incompatible_unit: "unidade incompatível (sem conversão aprovada)", incompatible_variant: "variante incompatível", incompatible_material: "material incompatível", incompatible_method: "método incompatível",
      censored_value_ambiguous: "valor censurado (limite do método) cujo intervalo não prova um único estado", ambiguous_reference: "referência do laudo ambígua", unknown_operator: "operador de referência desconhecido", missing_result: "sem resultado", different_exam: "exames diferentes", non_numeric_value: "valor não numérico" } };
})();
