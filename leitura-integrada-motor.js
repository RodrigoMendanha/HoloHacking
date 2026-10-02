/* ===========================================================================
   LEITURA INTEGRADA — MOTOR GENERICO VERSIONADO (Etapa 5: INFRAESTRUTURA)
   ===========================================================================

   Le um PACOTE DE REGRAS (dominios, vinculos exame->dominio, suficiencia,
   janela temporal, resultados mistos, textos) e produz, por dominio, um
   estado: convergente | divergente | sem_dados_suficientes, com
   reason_codes e trace completo. Tudo que decide vem do pacote: este
   arquivo nao conhece nenhum exame, dominio, sistema ou limite.

   O PACOTE REAL V1 ("LI-V1") NAO TEM dominio, vinculo, suficiencia, janela
   nem regra de resultados mistos aprovados. Logo o unico estado possivel
   hoje e sem_dados_suficientes (sem_regra_homologada / sem_associacao_
   aprovada). Fixtures TEST_FIXTURE_ONLY provam convergente/divergente e
   nunca sao copiadas para o pacote real.

   A regra legada "nota <= 3 + um exame fora = confirma" (motor/src/
   exames.ts, confrontar()) NAO existe aqui e nao e alcancavel por este
   motor: so entra o que o pacote declarar como regra aprovada.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO = "motor-leitura-integrada-1.0.0";
  var ESTADOS = ["convergente", "divergente", "sem_dados_suficientes"];

  function dias(a, b) { var x = Date.parse(a), y = Date.parse(b); return isFinite(x) && isFinite(y) ? Math.round(Math.abs(x - y) / 86400000) : null; }
  function aprovado(x) { return !!x && x.status === "aprovado"; }
  function regra(p, tipo, alvo) { return (p.rules || []).filter(function (r) { return r.rule_type === tipo && (alvo === undefined || r.target === alvo || r.target === "global"); }).sort(function (a, b) { return (a.target === "global") - (b.target === "global"); })[0] || null; }

  /**
   * calcular({ rule_package, holoscan_application, collections, results, classifications, engine_version })
   *   rule_package           { id, code, version, status, domains[], links[], rules[] }
   *   holoscan_application   { id, applied_at, package_version, system_results{ code:{avaliavel, nota, faixa} } } ou null
   *   collections            [{ id, clinical_date }]
   *   results                [{ id, collection_id, exam_code, variant, material, unit_original }]
   *   classifications        { result_id: { classification, reason_codes } }  (saida do LabMotor)
   */
  function calcular(entrada) {
    entrada = entrada || {};
    var p = entrada.rule_package, trilha = [], dominios = {};
    var base = { engine_version: VERSAO, rule_package_id: p ? p.id || p.code : null, rule_version: p ? p.version : null, rule_package_status: p ? p.status : null,
      holoscan_application_id: entrada.holoscan_application ? entrada.holoscan_application.id : null,
      collection_ids: (entrada.collections || []).map(function (c) { return c.id; }), result_ids: (entrada.results || []).map(function (r) { return r.id; }) };
    if (!p) return { domains: {}, estado_geral: "sem_dados_suficientes", reason_codes: ["fonte_ausente"], trace: Object.assign({ passos: [{ passo: "pacote", motivo: "sem pacote de regras" }] }, base) };
    var doms = (p.domains || []).filter(aprovado);
    if (!doms.length) {
      var rc = (p.domains || []).length ? ["sem_regra_homologada"] : ["sem_regra_homologada", "sem_associacao_aprovada"];
      return { domains: {}, estado_geral: "sem_dados_suficientes", reason_codes: rc, trace: Object.assign({ passos: [{ passo: "dominios", aprovados: 0, total: (p.domains || []).length }] }, base) };
    }
    var resultados = entrada.results || [], colecoes = {}; (entrada.collections || []).forEach(function (c) { colecoes[c.id] = c; });
    var cls = entrada.classifications || {};
    var h = entrada.holoscan_application || null;
    doms.forEach(function (d) {
      var links = (p.links || []).filter(function (l) { return l.domain_id === d.id && aprovado(l); });
      var suf = regra(p, "sufficiency", d.id), temp = regra(p, "temporal", d.id), mix = regra(p, "mixed", d.id), conv = regra(p, "convergence", d.id);
      var incl = [], excl = [], reasons = [];
      var t = { domain_id: d.id, domain_code: d.code, rule_package_id: base.rule_package_id, rule_version: base.rule_version, holoscan_application_id: base.holoscan_application_id, collection_ids: base.collection_ids, result_ids: base.result_ids,
        reference_ids: [], temporal_rule: temp && aprovado(temp) ? temp.payload : null, included_items: incl, excluded_items: excl, excluded_reasons: {}, sufficiency: null, state: null, reason_codes: reasons, engine_version: VERSAO };
      var fim = function (estado) { t.state = estado; dominios[d.code] = { domain_id: d.id, state: estado, reason_codes: reasons.slice(), text: textoDe(p, d, estado), trace: t }; trilha.push({ passo: "dominio", dominio: d.code, estado: estado, motivos: reasons.slice() }); };
      if (!links.length) { reasons.push("sem_associacao_aprovada"); return fim("sem_dados_suficientes"); }
      if (!suf || !aprovado(suf) || !conv || !aprovado(conv)) { reasons.push("sem_regra_homologada"); return fim("sem_dados_suficientes"); }
      if (!h) { reasons.push("fonte_ausente"); return fim("sem_dados_suficientes"); }
      var sys = d.holoscan_system ? (h.system_results || {})[d.holoscan_system] : null;
      if (d.holoscan_system && (!sys || !sys.avaliavel)) { reasons.push("holoscan_nao_avaliavel"); return fim("sem_dados_suficientes"); }
      resultados.forEach(function (r) {
        var l = links.filter(function (x) { return x.exam_code === r.exam_code && (x.variant === undefined || x.variant === null || String(x.variant) === String(r.variant || "")) && (x.material === undefined || x.material === null || String(x.material) === String(r.material || "")); })[0];
        if (!l) { excl.push(r.id); t.excluded_reasons[r.id] = "sem_associacao_aprovada"; return; }
        var c = cls[r.id];
        if (!c || c.classification === "not_classifiable") { excl.push(r.id); t.excluded_reasons[r.id] = (c && c.reason_codes && c.reason_codes[0] === "incompatible_unit") ? "unidade_incompativel" : "sem_referencia_utilizavel"; return; }
        if (temp && aprovado(temp) && temp.payload && typeof temp.payload.max_days === "number" && h.applied_at) {
          var col = colecoes[r.collection_id], dd = col ? dias(col.clinical_date, h.applied_at) : null;
          if (dd === null || dd > temp.payload.max_days) { excl.push(r.id); t.excluded_reasons[r.id] = "incompatibilidade_temporal"; return; }
        }
        if (l.reference_id) t.reference_ids.push(l.reference_id);
        incl.push({ result_id: r.id, exam_code: r.exam_code, classification: c.classification, direction: l.direction || "any" });
      });
      var minimo = suf.payload && typeof suf.payload.min_results === "number" ? suf.payload.min_results : null;
      t.sufficiency = { min_results: minimo, included: incl.length };
      if (minimo === null) { reasons.push("sem_regra_homologada"); return fim("sem_dados_suficientes"); }
      if (incl.length < minimo) { reasons.push(excl.some(function (id) { return t.excluded_reasons[id] === "incompatibilidade_temporal"; }) ? "incompatibilidade_temporal" : excl.some(function (id) { return t.excluded_reasons[id] === "unidade_incompativel"; }) ? "unidade_incompativel" : "sem_referencia_utilizavel"); return fim("sem_dados_suficientes"); }
      // alterado = fora da referencia na direcao esperada pelo vinculo (any = qualquer fora)
      var alterados = incl.filter(function (i) { return i.classification !== "within" && (i.direction === "any" || i.direction === i.classification); }).length;
      var dentro = incl.filter(function (i) { return i.classification === "within"; }).length;
      if (alterados > 0 && dentro > 0) {
        if (!mix || !aprovado(mix) || !mix.payload || !mix.payload.policy) { reasons.push("dados_mistos_sem_regra"); return fim("sem_dados_suficientes"); }
        if (mix.payload.policy === "insufficient") { reasons.push("dados_mistos_sem_regra"); return fim("sem_dados_suficientes"); }
      }
      var cp = conv.payload || {};
      var labAlterado = mix && aprovado(mix) && mix.payload && mix.payload.policy === "majority" ? alterados > dentro : alterados > 0;
      var holoAlterado = sys && typeof cp.holoscan_max_nota === "number" ? sys.nota <= cp.holoscan_max_nota : sys && cp.holoscan_faixa ? sys.faixa === cp.holoscan_faixa : null;
      if (holoAlterado === null) { reasons.push("sem_regra_homologada"); return fim("sem_dados_suficientes"); }
      t.sufficiency.lab_alterado = labAlterado; t.sufficiency.holoscan_alterado = holoAlterado;
      fim(labAlterado === holoAlterado ? "convergente" : "divergente");
    });
    var estados = Object.keys(dominios).map(function (k) { return dominios[k].state; });
    var geral = estados.every(function (e) { return e === "sem_dados_suficientes"; }) ? "sem_dados_suficientes" : estados.some(function (e) { return e === "divergente"; }) ? "divergente" : "convergente";
    var rcs = []; Object.keys(dominios).forEach(function (k) { dominios[k].reason_codes.forEach(function (r) { if (rcs.indexOf(r) < 0) rcs.push(r); }); });
    return { domains: dominios, estado_geral: geral, reason_codes: rcs, trace: Object.assign({ passos: trilha }, base) };
  }
  function textoDe(p, d, estado) { var t = (p.rules || []).filter(function (r) { return r.rule_type === "text" && aprovado(r) && (r.target === d.id || r.target === "global") && r.payload && r.payload[estado]; })[0]; return t ? t.payload[estado] : null; }

  /** Barreira: um pacote REAL (nao fixture) so pode produzir sem_dados_suficientes enquanto nao tiver vinculo aprovado. */
  function pacoteTemRegraReal(p) { return !!p && (p.domains || []).some(aprovado) && (p.links || []).some(aprovado); }

  raiz.LeituraIntegradaMotor = { VERSAO: VERSAO, ESTADOS: ESTADOS, calcular: calcular, pacoteTemRegraReal: pacoteTemRegraReal,
    MOTIVO: { sem_regra_homologada: "sem regra homologada", sem_associacao_aprovada: "sem associação exame → domínio aprovada", sem_referencia_utilizavel: "sem referência utilizável", fonte_ausente: "fonte ausente (HOLOSCAN ou coleta)",
      incompatibilidade_temporal: "fora da janela temporal", dados_mistos_sem_regra: "resultados mistos sem regra", holoscan_nao_avaliavel: "HOLOSCAN não avaliável", unidade_incompativel: "unidade incompatível" } };
})();
