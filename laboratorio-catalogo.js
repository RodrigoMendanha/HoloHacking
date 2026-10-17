/* ===========================================================================
   CATALOGO LABORATORIAL V1 — 45 EXAMES-BASE (Etapa 5)
   ===========================================================================

   Dado de CONFIGURACAO GLOBAL, somente leitura no app. A mesma lista e
   semeada em public.lab_exam_catalog pela migration 20261001220000; os
   testes provam que as duas copias sao identicas.

   O catalogo NAO e painel obrigatorio: a profissional escolhe os exames
   pertinentes. Nenhum exame aqui tem referencia, faixa, unidade oficial,
   vinculo com sistema HOLOSCAN ou dominio da Leitura Integrada: isso e
   decisao metodologica futura (docs/v1/laboratorio/
   HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md).

   Aliases servem SO para localizar/identificar o exame por outro nome
   consagrado. Alias nunca muda variante, metodo, material, referencia ou
   unidade. Nao existe fuzzy matching: a busca e por inclusao textual
   simples e, havendo mais de um candidato, a escolha e humana.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO = "catalogo-lab-v1.0";

  var LINHAS = [
    ["LAB-001", "Hemograma completo", "Hematologia", [], true],
    ["LAB-002", "Glicemia de jejum", "Glicêmico", []],
    ["LAB-003", "Insulina basal", "Glicêmico", []],
    ["LAB-004", "Hemoglobina glicada", "Glicêmico", ["HbA1c"]],
    ["LAB-005", "Triglicerídeos", "Lipídico", []],
    ["LAB-006", "Colesterol total", "Lipídico", []],
    ["LAB-007", "LDL colesterol", "Lipídico", []],
    ["LAB-008", "LDL oxidada", "Lipídico especializado", []],
    ["LAB-009", "HDL colesterol", "Lipídico", []],
    ["LAB-010", "Creatinina", "Renal", []],
    ["LAB-011", "Ureia", "Renal", []],
    ["LAB-012", "TGO ou AST", "Hepático", ["TGO", "AST"]],
    ["LAB-013", "TGP ou ALT", "Hepático", ["TGP", "ALT"]],
    ["LAB-014", "Bilirrubina total", "Hepático", []],
    ["LAB-015", "Gama GT ou GGT", "Hepático", ["Gama GT", "GGT"]],
    ["LAB-016", "PCR", "Inflamação", ["Proteína C reativa"]],
    ["LAB-017", "Homocisteína", "Investigação contextual", []],
    ["LAB-018", "Fibrinogênio", "Investigação contextual", []],
    ["LAB-019", "Sódio", "Eletrólitos", []],
    ["LAB-020", "Potássio", "Eletrólitos", []],
    ["LAB-021", "Magnésio", "Minerais", []],
    ["LAB-022", "Zinco", "Minerais", []],
    ["LAB-023", "Selênio", "Minerais", []],
    ["LAB-024", "Fósforo", "Minerais", []],
    ["LAB-025", "Vitamina B12", "Vitaminas", []],
    ["LAB-026", "Ácido fólico", "Vitaminas", []],
    ["LAB-027", "Alumínio", "Elementos especializados", []],
    ["LAB-028", "Ferro sérico", "Ferro", []],
    ["LAB-029", "Ferritina", "Ferro", []],
    ["LAB-030", "TSH", "Tireoide", []],
    ["LAB-031", "T4 livre", "Tireoide", []],
    ["LAB-032", "T3 livre", "Tireoide", []],
    ["LAB-033", "Ácido úrico", "Metabólico", []],
    ["LAB-034", "Paratormônio ou PTH", "Metabolismo mineral", ["Paratormônio", "PTH"]],
    ["LAB-035", "25 OH vitamina D", "Vitaminas", ["Vitamina D 25-OH", "25-hidroxivitamina D"]],
    ["LAB-036", "DHT", "Hormonal", ["Di-hidrotestosterona"]],
    ["LAB-037", "Testosterona livre", "Hormonal", []],
    ["LAB-038", "Testosterona total", "Hormonal", []],
    ["LAB-039", "SHBG", "Hormonal", []],
    ["LAB-040", "Progesterona", "Hormonal", []],
    ["LAB-041", "Estradiol", "Hormonal", []],
    ["LAB-042", "LH", "Hormonal", []],
    ["LAB-043", "FSH", "Hormonal", []],
    ["LAB-044", "CK", "Muscular", ["Creatina quinase", "Creatinoquinase"]],
    ["LAB-045", "Cálcio ionizado sérico", "Metabolismo mineral", ["Cálcio iônico"]]
  ];

  var EXAMES = LINHAS.map(function (l, i) {
    return { code: l[0], position: i + 1, canonical_name: l[1], category: l[2], aliases: l[3].slice(), composite: !!l[4], status: "ativo", catalog_version: VERSAO };
  });
  var POR_CODIGO = {}; EXAMES.forEach(function (e) { POR_CODIGO[e.code] = e; });
  var CATEGORIAS = []; EXAMES.forEach(function (e) { if (CATEGORIAS.indexOf(e.category) < 0) CATEGORIAS.push(e.category); });

  /* Legado fora dos 45 (motor/bancos/exames.csv): preservado so como
     historico. Nenhum recebe associacao, faixa, leitura ou score. */
  var LEGADO_FORA_DOS_45 = ["EXA-001", "EXA-003", "EXA-007", "EXA-024"];   // Candida IgG, VHS, HOMA-IR, Cortisol matinal
  /* Mapeamento legado -> catalogo, determinístico, SO onde a identidade e inequívoca.
     variant preserva o que o nome legado dizia (PCR ultrassensivel, Magnesio eritrocitario).
     requires_manual_mapping: nome legado proximo mas nao provadamente identico. */
  var MAPA_LEGADO = {
    "EXA-002": { code: "LAB-016", variant: "ultrassensivel" },
    "EXA-004": { code: "LAB-033" },
    "EXA-005": { code: "LAB-002" },
    "EXA-006": { code: "LAB-003", requires_manual_mapping: true, nota: "Insulina de jejum × Insulina basal: confirmar identidade" },
    "EXA-008": { code: "LAB-004" },
    "EXA-009": { code: "LAB-005" },
    "EXA-010": { code: "LAB-009" },
    "EXA-011": { code: "LAB-030" },
    "EXA-012": { code: "LAB-031" },
    "EXA-013": { code: "LAB-012" },
    "EXA-014": { code: "LAB-013" },
    "EXA-015": { code: "LAB-015" },
    "EXA-016": { code: "LAB-014" },
    "EXA-017": { code: "LAB-011" },
    "EXA-018": { code: "LAB-010" },
    "EXA-019": { code: "LAB-035" },
    "EXA-020": { code: "LAB-025" },
    "EXA-021": { code: "LAB-029" },
    "EXA-022": { code: "LAB-021", variant: "eritrocitario" },
    "EXA-023": { code: "LAB-017" }
  };

  function norm(t) { return String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim(); }
  /* Teste real 07/10: no laudo o exame se chama "Glicose", e a busca nao achava
     "Glicemia de jejum". Sinonimos SO DE BUSCA, com o nome que os laudos usam:
     nao viram alias do catalogo (porNomeExato continua exato) e nao mudam o
     catalogo do servidor — so ajudam a achar o exame. A escolha continua humana. */
  var SINONIMOS_BUSCA = {
    "LAB-002": ["glicose", "glicemia"], "LAB-003": ["insulina"], "LAB-004": ["glicada", "a1c"],
    "LAB-005": ["triglicerides"], "LAB-007": ["ldl"], "LAB-009": ["hdl"], "LAB-016": ["proteina c", "pcr ultrassensivel", "pcr-us"],
    "LAB-025": ["cobalamina", "b12"], "LAB-026": ["folato"], "LAB-028": ["ferro"], "LAB-030": ["tireoestimulante", "tirotropina"],
    "LAB-031": ["tiroxina livre", "t4l"], "LAB-032": ["triiodotironina livre", "t3l"], "LAB-035": ["vitamina d", "25-hidroxi", "calcidiol"],
    "LAB-001": ["hemacias", "leucocitos", "plaquetas", "hemoglobina", "eritrograma", "leucograma"], "LAB-045": ["calcio"], "LAB-044": ["cpk"]
  };
  /** Busca por inclusao textual no nome canonico e nos aliases. Devolve TODOS os candidatos (a escolha e humana). */
  function buscar(texto, categoria) {
    var q = norm(texto);
    return EXAMES.filter(function (e) {
      if (categoria && e.category !== categoria) return false;
      if (!q) return true;
      return norm(e.canonical_name).indexOf(q) >= 0 || e.aliases.some(function (a) { return norm(a).indexOf(q) >= 0; }) || norm(e.code) === q ||
        (SINONIMOS_BUSCA[e.code] || []).some(function (a) { return a.indexOf(q) >= 0 || (q.length >= 4 && q.indexOf(a) >= 0); });
    });
  }
  /** Identidade exata por nome canonico ou alias (sem fuzzy). null se 0 ou mais de 1 candidato. */
  function porNomeExato(texto) {
    var q = norm(texto);
    var c = EXAMES.filter(function (e) { return norm(e.canonical_name) === q || e.aliases.some(function (a) { return norm(a) === q; }); });
    return c.length === 1 ? c[0] : null;
  }
  function validar() {
    var erros = [];
    if (EXAMES.length !== 45) erros.push("base_catalog_count = " + EXAMES.length + " (esperado 45)");
    var codes = {}, nomes = {};
    EXAMES.forEach(function (e) {
      if (!/^LAB-0(0[1-9]|[1-3][0-9]|4[0-5])$/.test(e.code)) erros.push("codigo fora do padrao: " + e.code);
      if (codes[e.code]) erros.push("codigo repetido: " + e.code); codes[e.code] = 1;
      var n = norm(e.canonical_name); if (nomes[n]) erros.push("nome repetido: " + e.canonical_name); nomes[n] = 1;
      if (!e.category) erros.push(e.code + " sem categoria");
      e.aliases.forEach(function (a) { var dono = porNomeExato(a); if (!dono || dono.code !== e.code) erros.push("alias ambiguo: " + a); });
    });
    return erros;
  }

  raiz.LabCatalogo = {
    VERSAO: VERSAO, EXAMES: EXAMES, CATEGORIAS: CATEGORIAS, LEGADO_FORA_DOS_45: LEGADO_FORA_DOS_45, MAPA_LEGADO: MAPA_LEGADO,
    porCodigo: function (c) { return POR_CODIGO[c] || null; }, buscar: buscar, porNomeExato: porNomeExato, validar: validar, normalizar: norm,
    /** Copia pura para seed/comparacao (sem funcoes). */
    linhasSeed: function () { return EXAMES.map(function (e) { return { code: e.code, position: e.position, canonical_name: e.canonical_name, category: e.category, aliases: e.aliases.slice(), composite: e.composite }; }); }
  };
})();
