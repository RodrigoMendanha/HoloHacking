/* ===========================================================================
   LEITURA INTEGRADA — PACOTE EXECUTAVEL V1 (LI-V1 @ 2) — Etapa 6.0
   ===========================================================================

   Representacao executavel e DETERMINISTICA das decisoes humanas registradas
   em docs/v1/laboratorio (Etapas 5.4–5.13, Daniel, 02/10/2026):

     DECISAO 01  7 dominios LI-D01..LI-D07 (definicao e limites)
     DECISAO 02  47 vinculos exame -> dominio (direcao above/below/any)
     DECISAO 05  LI-TEMP-01 v1: ±30 dias corridos, inclusivos, global, simetrico
     DECISAO 16/17  suficiencia cross-source por dominio (so vinculos directional)
     DECISAO 19  resultados mistos: unanimidade; mistura -> indeterminate
     DECISAO 20/21  dominio -> sistema HOLOSCAN; faixa -> attention_*;
                 cross_source_role directional/contextual (DECISAO 20-21)
     DECISAO 22/23/24  reason codes e textos-base

   Este arquivo NAO calcula nada (o motor e leitura-integrada-motor.js) e NAO
   contem regra alem das decididas: nenhum corte, peso, equivalencia ou
   relacao foi acrescentado. A migration 20261002120000 insere EXATAMENTE
   este conteudo (LI-V1 versao 2, status em_revisao, 0 aprovacoes); a
   funcao conteudoCanonico() reproduz public.li_conteudo_canonico e
   hashConteudo() reproduz public.li_hash_conteudo (sha256 do texto jsonb).

   Nada aqui aprova, homologa ou publica: o pacote so passa a 'aprovado' por
   homologar_pacote_li (Daniel -> Rodrigo, identidade real, Bloco 30).
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var CODE = "LI-V1", VERSION = 2, STATUS = "em_revisao";
  var FONTE = "Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR";
  var SISTEMAS = ["fungico", "acido_inflamatorio", "metabolico", "detox_linfatico", "mental_emocional_espiritual"];

  /* ---------- DECISAO 01 — dominios (DECISAO 20-21: mapeamento) ---------- */
  var DOMINIOS = [
    { code: "LI-D01", name: "Hematológico e Inflamatório", position: 1, holoscan_mapping_mode: "mapped", holoscan_system: "acido_inflamatorio",
      definition: "Organiza dados laboratoriais relacionados ao perfil hematológico e a marcadores laboratoriais utilizados na avaliação de processos inflamatórios. Não representa diagnóstico de inflamação ou doença hematológica." },
    { code: "LI-D02", name: "Glicêmico e Metabólico", position: 2, holoscan_mapping_mode: "mapped", holoscan_system: "metabolico",
      definition: "Organiza dados relacionados ao metabolismo da glicose, resposta insulínica e outros marcadores metabólicos pertinentes. Não diagnostica diabetes, resistência à insulina ou síndrome metabólica." },
    { code: "LI-D03", name: "Lipídico", position: 3, holoscan_mapping_mode: "mapped", holoscan_system: "metabolico",
      definition: "Organiza dados relacionados ao perfil lipídico e suas variantes laboratoriais. Não transforma alterações isoladas em avaliação automática de risco cardiovascular." },
    { code: "LI-D04", name: "Hepático", position: 4, holoscan_mapping_mode: "mapped", holoscan_system: "detox_linfatico",
      definition: "Organiza resultados laboratoriais relacionados à avaliação bioquímica hepática. Não diagnostica doença hepática nem presume função hepática global a partir de marcador isolado." },
    { code: "LI-D05", name: "Renal e Hidroeletrolítico", position: 5, holoscan_mapping_mode: "none", holoscan_system: null,
      definition: "Organiza dados relacionados à avaliação renal e ao equilíbrio de eletrólitos medidos laboratorialmente. Não infere função renal ou estado de hidratação sem regra e contexto aprovados." },
    { code: "LI-D06", name: "Micronutrientes e Metabolismo Mineral", position: 6, holoscan_mapping_mode: "none", holoscan_system: null,
      definition: "Organiza vitaminas, minerais, elementos e marcadores de metabolismo mineral contemplados pelo catálogo. Não transforma faixa laboratorial em \"nível ideal\" autoral." },
    { code: "LI-D07", name: "Endócrino e Hormonal", position: 7, holoscan_mapping_mode: "none", holoscan_system: null,
      definition: "Organiza marcadores relacionados aos eixos tireoidiano e hormonal presentes no catálogo. Não diagnostica distúrbios endócrinos e não presume significado clínico fora de contexto." }
  ];

  /* ---------- DECISAO 02 + 20-21 — 47 vinculos -----------------------------
     direction: a direcao relevante decidida (above | below | any).
     cross_source_role: directional (participa da direcao laboratorial) | contextual.
     direction_rules: SO nos directional — classificacao -> direcao interna
       (attention_present | attention_not_detected | indeterminate), exatamente
       como ditado nas Etapas 5.12/5.13. Contextual: null.
     variants_declared: variantes distintas declaradas para o mesmo exame
       (DECISOES 02/11: PCR-us e Mg eritrocitario sao vinculos distintos que
       nao se fundem; outras variantes nao declaradas sao incompativeis). */
  var P = "attention_present", N = "attention_not_detected", I = "indeterminate";
  var ACIMA = { above: P, within: N, below: I }, QUALQUER = { above: P, below: P, within: N }, ABAIXO = { below: P, within: N, above: I };
  function v(dom, code, direction, role, rules, extra) {
    return Object.assign({ domain: dom, exam_code: code, variant: null, material: null, direction: direction, cross_source_role: role, direction_rules: rules || null, variants_declared: null, version: 1,
      source: FONTE, justification: role === "directional" ? "vínculo directional aprovado (DECISÕES 02, 20-21)" : "vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial" }, extra || {});
  }
  var VINCULOS = [
    // LI-D01 (7) — directional: LAB-016, LAB-018
    v("LI-D01", "LAB-001", "any", "contextual"),
    v("LI-D01", "LAB-016", "above", "directional", ACIMA, { variants_declared: ["ultrassensivel"] }),
    v("LI-D01", "LAB-018", "any", "directional", ACIMA),
    v("LI-D01", "LAB-025", "any", "contextual"), v("LI-D01", "LAB-026", "any", "contextual"), v("LI-D01", "LAB-028", "any", "contextual"), v("LI-D01", "LAB-029", "any", "contextual"),
    // LI-D02 (3) — directional: LAB-002, LAB-003 (nunca decide sozinha), LAB-004
    v("LI-D02", "LAB-002", "any", "directional", QUALQUER),
    v("LI-D02", "LAB-003", "any", "directional", QUALQUER, { justification: "vínculo directional aprovado (DECISÕES 02, 20-21): participa conforme referência aplicável, nunca resolve D02 isoladamente (suficiência: mínimo 2 + GLYCEMIC_ANCHOR)" }),
    v("LI-D02", "LAB-004", "above", "directional", ACIMA),
    // LI-D03 (5) — directional: LAB-005, LAB-009
    v("LI-D03", "LAB-005", "above", "directional", ACIMA), v("LI-D03", "LAB-006", "above", "contextual"), v("LI-D03", "LAB-007", "above", "contextual"), v("LI-D03", "LAB-008", "above", "contextual"),
    v("LI-D03", "LAB-009", "below", "directional", ABAIXO),
    // LI-D04 (4) — directional: LAB-013, LAB-015
    v("LI-D04", "LAB-012", "above", "contextual"), v("LI-D04", "LAB-013", "above", "directional", ACIMA), v("LI-D04", "LAB-014", "above", "contextual"), v("LI-D04", "LAB-015", "above", "directional", ACIMA),
    // LI-D05 (4) — sem sistema HOLOSCAN na V1: todos contextual
    v("LI-D05", "LAB-010", "above", "contextual"), v("LI-D05", "LAB-011", "above", "contextual"), v("LI-D05", "LAB-019", "any", "contextual"), v("LI-D05", "LAB-020", "any", "contextual"),
    // LI-D06 (12) — sem sistema HOLOSCAN na V1
    v("LI-D06", "LAB-017", "above", "contextual"), v("LI-D06", "LAB-021", "any", "contextual", null, { variants_declared: ["eritrocitario"] }), v("LI-D06", "LAB-022", "any", "contextual"), v("LI-D06", "LAB-023", "any", "contextual"),
    v("LI-D06", "LAB-024", "any", "contextual"), v("LI-D06", "LAB-025", "any", "contextual"), v("LI-D06", "LAB-026", "any", "contextual"), v("LI-D06", "LAB-028", "any", "contextual"), v("LI-D06", "LAB-029", "any", "contextual"),
    v("LI-D06", "LAB-034", "any", "contextual"), v("LI-D06", "LAB-035", "any", "contextual"), v("LI-D06", "LAB-045", "any", "contextual"),
    // LI-D07 (12) — sem sistema HOLOSCAN na V1
    v("LI-D07", "LAB-030", "any", "contextual"), v("LI-D07", "LAB-031", "any", "contextual"), v("LI-D07", "LAB-032", "any", "contextual"), v("LI-D07", "LAB-034", "any", "contextual"), v("LI-D07", "LAB-036", "any", "contextual"),
    v("LI-D07", "LAB-037", "any", "contextual"), v("LI-D07", "LAB-038", "any", "contextual"), v("LI-D07", "LAB-039", "any", "contextual"), v("LI-D07", "LAB-040", "any", "contextual"), v("LI-D07", "LAB-041", "any", "contextual"),
    v("LI-D07", "LAB-042", "any", "contextual"), v("LI-D07", "LAB-043", "any", "contextual")
  ];

  /* ---------- regras (payload integral entra no hash) ---------------------- */
  function suf(min, req, groups, opt) { return { mode: "rule_based", version: 1, min_classifiable_results: min, required_exam_codes: req, required_exam_groups: groups, optional_directional_exam_codes: opt, counts_only: "directional", contextual_counts: false, no_global_percentage: true }; }
  var NA_SUF = { mode: "not_applicable", version: 1, min_classifiable_results: null, required_exam_codes: [], required_exam_groups: [], optional_directional_exam_codes: [], counts_only: "directional", contextual_counts: false, no_global_percentage: true, note: "domínio laboratorial oficial sem confronto HOLOSCAN na V1 (holoscan_mapping_mode = none): não é suficiente, não é insuficiente, não é missing_domain_holoscan_mapping" };
  var UNANIM = { mode: "unanimity", version: 1, all_present: P, all_not_detected: N, mixture: I, mixture_reason: "mixed_results_indeterminate", indeterminate_optional_ignored: true, indeterminate_required_blocks: true, forbidden: ["majority", "mean", "weight", "lab_score", "one_altered_wins", "one_normal_wins", "altered_count", "altered_percentage"] };
  var NA_MIX = { mode: "not_applicable", version: 1 };
  var REGRAS = [
    { rule_type: "temporal", target: "global", payload: { code: "LI-TEMP-01", version: 1, max_days: 30, inclusive: true, symmetric: true, scope: "global", exceptions: [], anchors: { holoscan: "application_clinical_date", laboratory: "collection.clinical_date" },
      forbidden_anchors: ["created_at", "updated_at", "saved_at", "reviewed_at", "last_modified", "upload_date", "edit_date"], outside_window: "outside_time_window", missing_date: "missing_clinical_date", delta: "temporal_delta_days = collection.clinical_date - application_clinical_date (com sinal; so rastreabilidade/ordenacao/explicabilidade)",
      nature: "regra operacional autoral e versionada da V1; nao e validade fisiologica universal" } },
    { rule_type: "holoscan_direction", target: "global", payload: { version: 1, package_code: "HOLOS-V1", min_package_version: 2, required_package_status: "aprovado", faixa_map: { baixa: P, intermediaria: I, alta: N }, not_evaluable: I, not_evaluable_reason: "holoscan_not_evaluable", incompatible_reason: "incompatible_holoscan_version", missing_reason: "missing_holoscan_source", note: "faixas oficiais do HOLOS-V1@2 (10/3 e 20/3); nenhum corte novo; exames nunca alteram nota, faixa, Índice ou Tríada" } },
    { rule_type: "sufficiency", target: "LI-D01", payload: suf(1, ["LAB-016"], [], ["LAB-018"]) },
    { rule_type: "sufficiency", target: "LI-D02", payload: suf(2, [], [{ code: "GLYCEMIC_ANCHOR", any_of: ["LAB-002", "LAB-004"], min: 1 }], []) },
    { rule_type: "sufficiency", target: "LI-D03", payload: suf(2, ["LAB-005", "LAB-009"], [], []) },
    { rule_type: "sufficiency", target: "LI-D04", payload: suf(2, ["LAB-013", "LAB-015"], [], []) },
    { rule_type: "sufficiency", target: "LI-D05", payload: NA_SUF }, { rule_type: "sufficiency", target: "LI-D06", payload: NA_SUF }, { rule_type: "sufficiency", target: "LI-D07", payload: NA_SUF },
    { rule_type: "mixed", target: "LI-D01", payload: UNANIM }, { rule_type: "mixed", target: "LI-D02", payload: UNANIM }, { rule_type: "mixed", target: "LI-D03", payload: UNANIM }, { rule_type: "mixed", target: "LI-D04", payload: UNANIM },
    { rule_type: "mixed", target: "LI-D05", payload: NA_MIX }, { rule_type: "mixed", target: "LI-D06", payload: NA_MIX }, { rule_type: "mixed", target: "LI-D07", payload: NA_MIX },
    { rule_type: "convergence", target: "global", payload: { version: 1, convergente: [[P, P], [N, N]], divergente: [[P, N], [N, P]], indeterminate_never_converges: true, indeterminate_never_diverges: true, order: ["holoscan_source", "package_version", "temporal", "links", "selected_results", "reference_unit_context", "sufficiency", "mixed", "laboratory_direction", "holoscan_direction", "official_state"], states: ["convergente", "divergente", "sem_dados_suficientes"], note: "mistura entre exames laboratoriais nao e divergencia HOLOSCAN x laboratorio" } },
    { rule_type: "text", target: "global", payload: {
      convergente: "As fontes elegíveis deste domínio apontaram para uma direção semelhante segundo a regra metodológica indicada.",
      divergente: "As fontes elegíveis deste domínio apontaram para direções diferentes. A divergência não invalida nenhuma das fontes e deve ser considerada na avaliação profissional.",
      sem_dados_suficientes: "Não foi possível classificar este domínio com a regra atual. Consulte os dados ausentes, incompatíveis, excluídos ou não classificáveis indicados abaixo.",
      paciente: {
        convergente: "As informações do seu relato e os exames considerados apresentaram um padrão semelhante neste domínio. Esse resultado não representa diagnóstico e deve ser interpretado junto com sua nutricionista.",
        convergente_sem_sinal: "Nas fontes analisadas, não foram identificados sinais de atenção coincidentes neste domínio. Isso não significa ausência de doença ou garantia de saúde.",
        divergente: "Seu relato e os exames considerados apresentaram informações diferentes neste domínio. Isso pode ajudar a profissional a aprofundar a avaliação e não significa que uma das fontes esteja errada.",
        sem_dados_suficientes: "Ainda não há informações suficientes para uma leitura integrada deste domínio. Sua nutricionista poderá verificar quais dados precisam ser complementados ou revisados." },
      sem_confronto_holoscan: "Este domínio é apresentado como informação laboratorial na V1 e não possui confronto automático com um sistema HOLOSCAN." } },
    { rule_type: "reason_semantics", target: "global", payload: { version: 1, codes: {
      missing_holoscan_source: "Nenhuma aplicação HOLOSCAN elegível foi selecionada para esta leitura.",
      holoscan_not_evaluable: "O sistema HOLOSCAN relacionado não é avaliável nesta aplicação (cobertura abaixo do mínimo).",
      incompatible_holoscan_version: "A aplicação HOLOSCAN não foi calculada com o pacote metodológico homologado compatível com esta leitura.",
      missing_lab_source: "Nenhuma coleta laboratorial elegível foi selecionada para esta leitura.",
      insufficient_domain_coverage: "A quantidade mínima de resultados classificáveis exigida pela regra do domínio não foi atingida.",
      missing_required_exam: "Um exame obrigatório para a leitura deste domínio está ausente, não elegível ou não classificável.",
      missing_reference: "O resultado não tem referência do laudo aplicável.",
      ambiguous_reference: "A referência do laudo é ambígua e impede a classificação.",
      qualitative_rule_missing: "Resultado qualitativo sem regra homologada de interpretação.",
      censored_value_ambiguous: "Valor censurado (limite do método) cujo intervalo não prova um único estado.",
      incompatible_unit: "Unidade do resultado incompatível com a referência, sem conversão homologada.",
      incompatible_variant: "O tipo do exame disponível não é compatível com a regra utilizada para esta leitura.",
      incompatible_material: "O material do exame não é compatível com a referência aplicável.",
      incompatible_method: "O método do exame não é compatível com a regra aplicável.",
      outside_time_window: "A coleta está fora da janela temporal da leitura (LI-TEMP-01: ±30 dias corridos da aplicação HOLOSCAN).",
      missing_clinical_date: "Falta a data clínica necessária (coleta ou aplicação HOLOSCAN); nenhuma data técnica substitui a data clínica.",
      mixed_without_rule: "Este conjunto de resultados não possui regra metodológica homologada de agregação (cenário futuro; não ocorre nos domínios D01–D04 da V1).",
      mixed_results_indeterminate: "Há regra homologada para o conjunto, mas os resultados directional apontam direções diferentes (ou nenhuma direção utilizável): a direção laboratorial é indeterminada.",
      missing_domain_sufficiency_rule: "O domínio não possui regra de suficiência homologada.",
      missing_temporal_rule: "O pacote não possui regra temporal homologada.",
      duplicate_result_unresolved: "Há mais de um resultado do mesmo exame nas coletas selecionadas e nenhum foi escolhido explicitamente.",
      not_classifiable: "Resultado não classificável com a referência disponível.",
      not_eligible: "Resultado não elegível para a Leitura Integrada." },
      official_state_for_all: "sem_dados_suficientes", note: "mixed_results_indeterminate NAO e novo estado oficial; o estado continua SEM DADOS SUFICIENTES" } }
  ];

  /* ---------- pacote montado --------------------------------------------- */
  function pacote() {
    var doms = DOMINIOS.map(function (d) { return Object.assign({ status: "aprovado" }, d); });
    var links = VINCULOS.map(function (l) { return Object.assign({ status: "aprovado" }, l); });
    var rules = REGRAS.map(function (r) { return Object.assign({ status: "aprovado" }, r); });
    return { code: CODE, version: VERSION, status: STATUS, domains: doms, links: links, rules: rules, dependencies: [] };
  }

  /* ---------- contagens invariantes (DECISAO 02; nunca alteradas) ---------- */
  function contagens() {
    var cat = raiz.LabCatalogo ? raiz.LabCatalogo.EXAMES.map(function (e) { return e.code; }) : null;
    var porExame = {}; VINCULOS.forEach(function (l) { (porExame[l.exam_code] = porExame[l.exam_code] || []).push(l.domain); });
    var porDominio = {}; DOMINIOS.forEach(function (d) { porDominio[d.code] = VINCULOS.filter(function (l) { return l.domain === d.code; }).length; });
    var codes = Object.keys(porExame);
    return { exames_base: cat ? cat.length : null, vinculados: codes.length, sem_dominio: cat ? cat.filter(function (c) { return !porExame[c]; }) : null, pares: VINCULOS.length,
      multi_dominio: codes.filter(function (c) { return porExame[c].length > 1; }).sort(), por_dominio: porDominio,
      directional: VINCULOS.filter(function (l) { return l.cross_source_role === "directional"; }).length, contextual: VINCULOS.filter(function (l) { return l.cross_source_role === "contextual"; }).length };
  }

  /* ---------- conteudo canonico == public.li_conteudo_canonico ------------ */
  /* jsonb::text: chaves ordenadas por (comprimento, bytes); separadores ", " e ": ". */
  function bytesCmp(a, b) { var x = utf8(a), y = utf8(b); if (x.length !== y.length) return x.length - y.length; for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; }
  function utf8(s) { var out = [], i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); if (c < 128) out.push(c); else if (c < 2048) out.push(192 | c >> 6, 128 | c & 63); else if (c >= 0xd800 && c < 0xdc00) { var d = s.charCodeAt(++i), cp = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); out.push(240 | cp >> 18, 128 | cp >> 12 & 63, 128 | cp >> 6 & 63, 128 | cp & 63); } else out.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63); } return out; }
  function jsonbTexto(v) {
    if (v === null || v === undefined) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return JSON.stringify(v).replace(/\\u([0-9a-f]{4})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
    if (Array.isArray(v)) return "[" + v.map(jsonbTexto).join(", ") + "]";
    var ks = Object.keys(v).sort(bytesCmp);
    return "{" + ks.map(function (k) { return JSON.stringify(k) + ": " + jsonbTexto(v[k]); }).join(", ") + "}";
  }
  function cmpTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function conteudoCanonico(p) {
    p = p || pacote();
    var domains = p.domains.slice().sort(function (a, b) { return cmpTexto(a.code, b.code); }).map(function (d) {
      return { code: d.code, name: d.name, definition: d.definition || null, holoscan_mapping_mode: d.holoscan_mapping_mode, holoscan_system: d.holoscan_system || null, status: d.status }; });
    var links = p.links.slice().map(function (l) { return { domain: l.domain, exam_code: l.exam_code, variant: l.variant || null, material: l.material || null, direction: l.direction, cross_source_role: l.cross_source_role, direction_rules: l.direction_rules || null, variants_declared: l.variants_declared || null, version: l.version || 1, source: l.source || null, justification: l.justification || null, status: l.status, reference: null }; })
      .sort(function (a, b) { return cmpTexto(a.domain, b.domain) || cmpTexto(a.exam_code, b.exam_code) || cmpTexto(a.variant || "", b.variant || "") || cmpTexto(a.material || "", b.material || "") || cmpTexto(a.direction, b.direction); });
    var rules = p.rules.slice().map(function (r) { return { rule_type: r.rule_type, target: r.target, payload: r.payload, status: r.status }; }).sort(function (a, b) { return cmpTexto(a.rule_type, b.rule_type) || cmpTexto(a.target, b.target); });
    return { package: { code: p.code, version: p.version }, domains: domains, links: links, rules: rules, dependencies: [] };
  }
  function textoCanonico(p) { return jsonbTexto(conteudoCanonico(p)); }
  /** sha256 hex do texto canonico. Node: crypto; navegador: SubtleCrypto (assincrono) -> hashConteudoAsync. */
  function hashConteudo(p) {
    var t = textoCanonico(p);
    if (typeof require === "function") { try { return require("crypto").createHash("sha256").update(t, "utf8").digest("hex"); } catch (e) { /* segue */ } }
    if (raiz.process && raiz.process.versions && raiz.process.versions.node) { try { return (raiz.__nodeCrypto || (raiz.__nodeCrypto = raiz.process.getBuiltinModule ? raiz.process.getBuiltinModule("node:crypto") : null)).createHash("sha256").update(t, "utf8").digest("hex"); } catch (e2) { /* segue */ } }
    return null;
  }
  function hashConteudoAsync(p) {
    var t = textoCanonico(p), sync = hashConteudo(p);
    if (sync) return Promise.resolve(sync);
    var enc = new TextEncoder().encode(t);
    return raiz.crypto.subtle.digest("SHA-256", enc).then(function (buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join(""); });
  }

  /* ---------- SQL da migration (deterministico; gerado a partir destes dados) */
  function sqlLit(s) { return s === null || s === undefined ? "null" : "'" + String(s).replace(/'/g, "''") + "'"; }
  function sqlJson(o) { return o === null || o === undefined ? "null" : "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb"; }
  function sqlArr(a) { return a === null || a === undefined ? "null" : "array[" + a.map(sqlLit).join(",") + "]::text[]"; }
  function sqlInserts() {
    var out = [];
    out.push("insert into public.integrated_reading_rule_packages (code, version, status, notes) values (" + sqlLit(CODE) + ", " + VERSION + ", " + sqlLit(STATUS) + ", 'Etapa 6.0: conteudo metodologico decidido nas Etapas 5.4-5.13 (docs/v1/laboratorio). Candidato em revisao: 0 aprovacoes, nao homologado. Identico a leitura-integrada-pacote-v1.js.') returning id into pk;");
    DOMINIOS.forEach(function (d) {
      out.push("insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, " + [sqlLit(d.code), sqlLit(d.name), sqlLit(d.definition), sqlLit(d.holoscan_mapping_mode), sqlLit(d.holoscan_system), d.position, "'aprovado'"].join(", ") + ");");
    });
    VINCULOS.forEach(function (l) {
      out.push("insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = " + sqlLit(l.domain) + "), " +
        [sqlLit(l.exam_code), "null", "null", sqlLit(l.direction), sqlLit(l.cross_source_role), sqlJson(l.direction_rules), sqlArr(l.variants_declared), l.version, sqlLit(l.source), sqlLit(l.justification), "'aprovado'"].join(", ") + ");");
    });
    REGRAS.forEach(function (r) {
      out.push("insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, " + [sqlLit(r.rule_type), sqlLit(r.target), sqlJson(r.payload), "'aprovado'"].join(", ") + ");");
    });
    return out.join("\n  ");
  }

  raiz.LeituraIntegradaPacoteV1 = { CODE: CODE, VERSION: VERSION, STATUS: STATUS, SISTEMAS: SISTEMAS, DOMINIOS: DOMINIOS, VINCULOS: VINCULOS, REGRAS: REGRAS, FONTE: FONTE,
    pacote: pacote, contagens: contagens, conteudoCanonico: conteudoCanonico, textoCanonico: textoCanonico, jsonbTexto: jsonbTexto, hashConteudo: hashConteudo, hashConteudoAsync: hashConteudoAsync, sqlInserts: sqlInserts };
})();
