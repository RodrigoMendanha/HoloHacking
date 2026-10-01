/* ===========================================================================
   MOTOR METODOLOGICO GENERICO — V1 (Etapa 4, contrato fechado na Etapa 4.2)
   ===========================================================================

   Deterministico, sem rede, sem aleatoriedade, sem regra clinica escrita aqui:
   tudo que decide numero vem do PACOTE recebido. Mesma entrada + mesmas
   versoes = mesma saida, com trilha de calculo reproduzivel por contribuicao.
   Nenhum fallback: nada de CSV legado, app.js, peso/faixa antigos, Indice
   soma x 2, renormalizacao, Triada derivada por acidente, CMB, REC ou SEL.

   ARITMETICA: racional EXATA (BigInt). A nota guardada e a fracao; a faixa e
   classificada pela fracao (nunca pelo numero arredondado de tela); a
   exibicao (1 casa, meia-unidade para cima) sai da fracao.

   CONTRATO DE ENTRADA
     responses              { stable_id: valor }  (inteiro na escala do item)
     response_states        { stable_id: 'respondido'|'nao_respondido'|'em_branco'|'recusado'|'nao_aplicavel' }
     questionnaire_edition  { code, version }
     methodology_package    o pacote (status, version, escalas, sistemas, perguntas, associacoes, faixas, regras)
     application_context    { patient_id?, encounter_id?, applied_at?, note? } — so passa pela trilha / comparabilidade
     engine_version         string
     mode                   'homologacao' | 'oficial'

   CONTRATO DE SAIDA
     mode, package_status, package_code, package_version, package_content_hash,
     engine_version, engine_contract_version, edition
     coverage               { respondidos, total, fracao, percentual, recusados, nao_aplicaveis, em_branco }
     item_contributions     [{ question_id, raw_response, oriented_value, destination_type, destination, role, weight, contribution, max }]
     contextual_associations [{ question_id, destination, role }]  — secundarias: SEM contribuicao numerica
     system_results         { code: { nota, nota_exata, nota_exibicao, carga, faixa, mensagem_nutri, mensagem_paciente,
                              avaliavel, respondidos, total, cobertura, cobertura_exibicao, mostrar_cobertura, itens_pontuados, motivo } }
     index_result           { valor, valor_exato, valor_exibicao, avaliavel, motivo }
     triad_result           { eixo: { nota, nota_exata, nota_exibicao, avaliavel, respondidos, total, cobertura, ... motivo } }
     non_evaluable_reasons  [string]
     trace                  { passos: [...], hash_entrada }

   REGRAS DO CONTRATO (nao sao parametro):
   - ID desconhecido, estado desconhecido, valor fora da escala, opcao
     inexistente = ERRO DE VALIDACAO (nunca zero silencioso);
   - ausencia, em branco, recusada e nao aplicavel != 0: nao contam como
     resposta valida e REDUZEM a cobertura; 0 valido = respondido;
   - orientacao ausente (ou desconhecida) num item respondido = ERRO;
   - so a associacao PRIMARIA pontua sistema; secondary_contextual nao soma,
     nao entra no denominador nem na cobertura, nao toca Indice nem Triada;
   - nota pelos respondidos: A = Σ peso·z, D = Σ peso·(max−min),
     nota = 10 − 10·A/D, so quando a cobertura do sistema >= minimo do pacote;
   - Indice so com TODOS os sistemas avaliaveis: sem parcial, sem renormalizar;
   - modo OFICIAL so com pacote aprovado E vigente E publicavel; sem fallback.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO_MOTOR = "motor-generico-2.0.0";
  var CONTRATO_MOTOR = "holoscan-motor-contrato-v1";
  var EIXOS = ["fisico", "mental", "espiritual"];
  var ESTADOS = ["respondido", "nao_respondido", "em_branco", "recusado", "nao_aplicavel"];
  var NAO_VALIDOS = ["nao_respondido", "em_branco", "recusado", "nao_aplicavel"];

  function ErroValidacao(codigo, mensagem, detalhe) { this.name = "ErroValidacao"; this.codigo = codigo; this.message = mensagem; this.detalhe = detalhe || null; }
  ErroValidacao.prototype = Object.create(Error.prototype);
  function num(v) { return typeof v === "number" && isFinite(v); }
  function vigente(p, dia) { return raiz.PacoteMetodologico ? raiz.PacoteMetodologico.vigente(p, dia) : (p && p.status === "aprovado" && !!p.effective_from); }

  /* ---------- fracoes exatas (BigInt) ------------------------------------- */
  function gcd(a, b) { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) { var t = a % b; a = b; b = t; } return a; }
  function F(n, d) {
    if (d === undefined) d = 1n;
    if (d === 0n) throw new ErroValidacao("divisao_por_zero", "divisao por zero no calculo");
    if (d < 0n) { n = -n; d = -d; }
    var g = gcd(n, d) || 1n; return { n: n / g, d: d / g };
  }
  /** numero (pela sua forma decimal), "a/b", "2.5" -> fracao exata. */
  function fr(x) {
    if (x && typeof x === "object" && typeof x.n === "bigint") return x;
    var s = String(x).trim();
    var m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?(?:\s*\/\s*(\d+))?$/i.exec(s);
    if (!m) throw new ErroValidacao("numero_invalido", "valor numerico invalido: " + s);
    var dec = m[3] || "", n = BigInt(m[2] + dec), d = 10n ** BigInt(dec.length), e = m[4] ? parseInt(m[4], 10) : 0;
    if (e > 0) n *= 10n ** BigInt(e); else if (e < 0) d *= 10n ** BigInt(-e);
    if (m[5]) d *= BigInt(m[5]);
    return F(m[1] ? -n : n, d);
  }
  function soma(a, b) { return F(a.n * b.d + b.n * a.d, a.d * b.d); }
  function menos(a, b) { return F(a.n * b.d - b.n * a.d, a.d * b.d); }
  function vezes(a, b) { return F(a.n * b.n, a.d * b.d); }
  function divid(a, b) { return F(a.n * b.d, a.d * b.n); }
  function cmp(a, b) { var x = a.n * b.d, y = b.n * a.d; return x < y ? -1 : x > y ? 1 : 0; }
  function paraNumero(a) { return Number(a.n) / Number(a.d); }
  function texto(a) { return a.d === 1n ? String(a.n) : a.n + "/" + a.d; }
  /** Exibicao com `casas` casas, meia unidade para longe do zero, feita na fracao. */
  function exibir(a, casas) {
    var c = casas === undefined ? 1 : casas, k = 10n ** BigInt(c), neg = a.n < 0n, n = neg ? -a.n : a.n;
    var q = (2n * n * k + a.d) / (2n * a.d), inteiro = q / k, resto = String(q % k);
    while (resto.length < c) resto = "0" + resto;
    return (neg && q !== 0n ? "-" : "") + String(inteiro) + (c ? "." + resto : "");
  }
  var DEZ = F(10n), ZERO = F(0n);

  /** Hash simples e deterministico da entrada (FNV-1a sobre JSON canonico), para a trilha. */
  function hashEntrada(obj) {
    var s = JSON.stringify(canon(obj)), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ("00000000" + h.toString(16)).slice(-8);
  }
  function canon(o) {
    if (Array.isArray(o)) return o.map(canon);
    if (o && typeof o === "object") { var k = Object.keys(o).sort(), r = {}; k.forEach(function (x) { r[x] = canon(o[x]); }); return r; }
    return o;
  }

  function regra(p, tipo, alvo) { return (p.regras || []).filter(function (r) { return r.rule_type === tipo && (alvo === undefined || r.target === alvo); })[0] || null; }
  function limite(f, qual) { var ex = f[qual + "_bound_exact"]; return fr(ex !== null && ex !== undefined && ex !== "" ? ex : f[qual + "_bound"]); }
  /** Faixa pela fracao exata (inclusividade respeitada). */
  function faixaDe(p, tipo, dest, valor) {
    var f = (p.faixas || []).filter(function (x) { return x.destination_type === tipo && x.destination_id === dest; });
    for (var i = 0; i < f.length; i++) {
      var r = f[i], lo = cmp(valor, limite(r, "lower")), hi = cmp(valor, limite(r, "upper"));
      if ((r.lower_inclusive ? lo >= 0 : lo > 0) && (r.upper_inclusive ? hi <= 0 : hi < 0)) return r;
    }
    return null;
  }
  function minimo(payload) { return payload && num(payload.cobertura_minima) && payload.cobertura_minima > 0 && payload.cobertura_minima <= 1 ? fr(payload.cobertura_minima) : null; }
  function pct(fracao) { return exibir(vezes(fracao, F(100n)), 1) + "%"; }

  /** Motivos pelos quais o modo OFICIAL recusa um pacote. Vazio = pode. */
  function motivosBloqueioOficial(p, dia) {
    var m = [];
    if (!p) { m.push("sem pacote metodologico"); return m; }
    if (p.status !== "aprovado") m.push("pacote com status '" + p.status + "' (so 'aprovado' produz saida oficial)");
    if (p.status === "aprovado" && !vigente(p, dia)) m.push("pacote aprovado mas nao vigente (effective_from/effective_to)");
    if (raiz.PacoteMetodologico) { var v = raiz.PacoteMetodologico.validar(p); if (!v.publicavel) m.push("validador de publicacao: " + v.total_erros + " erro(s)"); }
    return m;
  }

  /** Nota normalizada 0..10 pelos respondidos: 10 − 10·A/D. */
  function notaDe(contribs) {
    var A = ZERO, D = ZERO;
    contribs.forEach(function (c) { A = soma(A, c._A); D = soma(D, c._D); });
    var carga = vezes(DEZ, divid(A, D));
    return { A: A, D: D, carga: carga, nota: menos(DEZ, carga) };
  }
  function resultadoNota(r, n, casas) {
    r.nota = paraNumero(n.nota); r.nota_exata = texto(n.nota); r.nota_exibicao = exibir(n.nota, casas);
    r.carga = paraNumero(n.carga); r.carga_exata = texto(n.carga); r.avaliavel = true;
  }

  function calcular(entrada) {
    entrada = entrada || {};
    var p = entrada.methodology_package, mode = entrada.mode === "oficial" ? "oficial" : "homologacao";
    var dia = entrada.application_context && entrada.application_context.applied_at ? String(entrada.application_context.applied_at).slice(0, 10) : undefined;
    if (!p) throw new ErroValidacao("pacote_ausente", "configuracao metodologica indisponivel: sem pacote");
    if (mode === "oficial") {
      var bloqueios = motivosBloqueioOficial(p, dia);
      if (bloqueios.length) throw new ErroValidacao("oficial_bloqueado", "calculo oficial recusado: " + bloqueios.join("; "), bloqueios);
    }
    var perguntas = p.perguntas || [];
    var porId = {}; perguntas.forEach(function (q) { porId[q.stable_id] = q; });
    var escalas = {}; (p.escalas || []).forEach(function (e) { escalas[e.code] = e; });
    var respostas = entrada.responses || {}, estados = entrada.response_states || {};
    var motivos = [], trilha = [];
    var casas = (function () { var sc = (p.regras || []).filter(function (r) { return r.rule_type === "scoring" && r.payload && num(r.payload.casas_exibicao); })[0]; return sc ? sc.payload.casas_exibicao : 1; })();

    // ---- validacao: erro, nunca zero silencioso ----
    Object.keys(estados).forEach(function (id) {
      if (!porId[id]) throw new ErroValidacao("id_desconhecido", "estado para ID desconhecido: " + id, { id: id });
      if (ESTADOS.indexOf(estados[id]) < 0) throw new ErroValidacao("estado_invalido", "estado de resposta desconhecido em " + id + ": " + estados[id], { id: id });
    });
    var validos = {};
    Object.keys(respostas).forEach(function (id) {
      var q = porId[id];
      if (!q) throw new ErroValidacao("id_desconhecido", "resposta para ID desconhecido: " + id, { id: id });
      var v = respostas[id];
      if (v === null || v === undefined) return;
      var e = escalas[q.scale_code];
      if (!e) throw new ErroValidacao("escala_ausente", "item " + id + " sem escala conhecida no pacote (" + (q.scale_code || "AUSENTE") + ")", { id: id });
      if (!Number.isInteger(v) || v < e.min_value || v > e.max_value) throw new ErroValidacao("valor_fora_da_escala", "valor " + v + " fora da escala " + e.min_value + ".." + e.max_value + " em " + id, { id: id, valor: v });
      if (e.labels && Array.isArray(e.labels) && e.labels.length && !(v - e.min_value < e.labels.length)) throw new ErroValidacao("opcao_inexistente", "opcao " + v + " nao existe em " + id, { id: id, valor: v });
      if (NAO_VALIDOS.indexOf(estados[id]) >= 0) return;   // estado manda: nao e resposta numerica valida
      if (q.orientation !== "direta" && q.orientation !== "invertida") throw new ErroValidacao(q.orientation ? "orientacao_invalida" : "orientacao_ausente", "item " + id + " sem orientacao valida no pacote (" + (q.orientation || "AUSENTE") + "): nunca inferida", { id: id });
      validos[id] = { v: v, z: q.orientation === "invertida" ? e.max_value - v : v - e.min_value, amp: e.max_value - e.min_value };
    });

    // ---- cobertura global de preenchimento (informativa) ----
    var respondidos = Object.keys(validos).length, recusados = 0, naoAplicaveis = 0;
    perguntas.forEach(function (q) { if (validos[q.stable_id]) return; var st = estados[q.stable_id]; if (st === "recusado") recusados++; else if (st === "nao_aplicavel") naoAplicaveis++; });
    var fracGlobal = perguntas.length ? F(BigInt(respondidos), BigInt(perguntas.length)) : ZERO;
    var coverage = { respondidos: respondidos, total: perguntas.length, fracao: texto(fracGlobal), percentual: paraNumero(vezes(fracGlobal, F(100n))), percentual_exibicao: pct(fracGlobal),
      recusados: recusados, nao_aplicaveis: naoAplicaveis, em_branco: perguntas.length - respondidos - recusados - naoAplicaveis, pendentes: perguntas.length - respondidos - recusados - naoAplicaveis, rotulo: "cobertura de preenchimento" };

    // ---- contribuicoes (so primarias pontuam sistema; triade por item) ----
    var contribs = [], contextuais = [];
    (p.associacoes || []).forEach(function (a) {
      var x = validos[a.question_stable_id]; if (!x) return;
      if (a.destination_type === "system" && a.role !== "primaria") { contextuais.push({ question_id: a.question_stable_id, destination: a.destination_id, role: a.role || null, contribution: null }); return; }
      if (!num(a.weight)) { motivos.push("associacao " + a.question_stable_id + "→" + a.destination_id + " sem peso: fora do calculo"); return; }
      var w = fr(a.weight), A = vezes(w, F(BigInt(x.z))), D = vezes(w, F(BigInt(x.amp)));
      contribs.push({ question_id: a.question_stable_id, raw_response: x.v, oriented_value: x.z, destination_type: a.destination_type, destination: a.destination_id, role: a.role || null, weight: a.weight, contribution: paraNumero(A), max: paraNumero(D), _A: A, _D: D });
    });
    var ordem = function (x, y) { return x.question_id.localeCompare(y.question_id) || (x.destination_type || "").localeCompare(y.destination_type || "") || x.destination.localeCompare(y.destination); };
    contribs.sort(ordem); contextuais.sort(ordem);

    // ---- sistemas ----
    var aus = regra(p, "absence");
    var denom = aus && aus.payload ? aus.payload.denominador : null, minSist = aus ? minimo(aus.payload) : null;
    var system_results = {}, notasExatas = {};
    (p.sistemas || []).forEach(function (s) {
      var sc = regra(p, "scoring", s.code);
      var itens = {}; (p.associacoes || []).forEach(function (a) { if (a.destination_type === "system" && a.destination_id === s.code && a.role === "primaria") itens[a.question_stable_id] = true; });
      var total = Object.keys(itens).length;
      var minhas = contribs.filter(function (c) { return c.destination_type === "system" && c.destination === s.code; });
      var cobertura = total ? F(BigInt(minhas.length), BigInt(total)) : ZERO;
      var r = { carga: null, nota: null, nota_exata: null, nota_exibicao: null, faixa: null, mensagem_nutri: null, mensagem_paciente: null, avaliavel: false, respondidos: minhas.length, total: total,
        cobertura: paraNumero(cobertura), cobertura_exibicao: pct(cobertura), mostrar_cobertura: cmp(cobertura, F(1n)) < 0, itens_pontuados: minhas.map(function (c) { return c.question_id; }), motivo: null };
      if (!sc) r.motivo = "sem regra de pontuacao para " + s.code;
      else if (denom === null || denom === undefined) r.motivo = "sem politica de denominador aprovada: nota bloqueada (dados e cobertura preservados)";
      else if (denom !== "respondidos") r.motivo = "denominador '" + denom + "' nao suportado pelo contrato (so 'respondidos')";
      else if (!minSist) r.motivo = "sem cobertura minima aprovada: nota bloqueada (dados e cobertura preservados)";
      else if (!total) r.motivo = "sistema sem itens primarios";
      else if (!minhas.length) r.motivo = "sem dados suficientes (nenhum item primario respondido)";
      else if (cmp(cobertura, minSist) < 0) r.motivo = "cobertura " + minhas.length + "/" + total + " abaixo do minimo aprovado " + aus.payload.cobertura_minima;
      else {
        var n = notaDe(minhas); resultadoNota(r, n, casas); notasExatas[s.code] = n.nota;
        var fx = faixaDe(p, "system", s.code, n.nota);
        if (fx) { r.faixa = fx.label; r.mensagem_nutri = fx.message_nutri || null; r.mensagem_paciente = fx.message_paciente || null; }
        trilha.push({ passo: "sistema", sistema: s.code, respondidos: minhas.length, total: total, A: texto(n.A), D: texto(n.D), nota: r.nota_exata, faixa: r.faixa });
      }
      if (!r.avaliavel) { motivos.push(s.code + ": " + r.motivo); trilha.push({ passo: "sistema", sistema: s.code, respondidos: minhas.length, total: total, nota: null, motivo: r.motivo }); }
      system_results[s.code] = r;
    });

    // ---- Indice: so com TODOS os sistemas avaliaveis; sem parcial; sem renormalizar ----
    var idx = regra(p, "index", "global");
    var index_result = { valor: null, valor_exato: null, valor_exibicao: null, avaliavel: false, motivo: null, faixa: null };
    if (!idx || !idx.payload || !idx.payload.alphas) index_result.motivo = "configuracao do Indice indisponivel";
    else if (idx.payload.indice_parcial !== false || idx.payload.renormalizacao === true) index_result.motivo = "Indice parcial / renormalizacao nao existem no contrato";
    else {
      var alphas = idx.payload.alphas, codigos = Object.keys(alphas).sort();
      var faltam = codigos.filter(function (k) { return !notasExatas[k]; });
      (p.sistemas || []).forEach(function (s) { if (codigos.indexOf(s.code) < 0) faltam.push(s.code + " (sem alpha)"); });
      if (faltam.length) index_result.motivo = "sistema(s) nao avaliavel(is): " + faltam.join(", ") + " — o Indice exige todos os sistemas avaliaveis (sem Indice parcial)";
      else {
        var media = ZERO; codigos.forEach(function (k) { media = soma(media, vezes(fr(alphas[k]), notasExatas[k])); });
        var mult = num(idx.payload.multiplicador) ? fr(idx.payload.multiplicador) : DEZ;
        var v = vezes(media, mult);
        index_result.valor = paraNumero(v); index_result.valor_exato = texto(v); index_result.valor_exibicao = exibir(v, num(idx.payload.casas) ? idx.payload.casas : 1); index_result.avaliavel = true;
        if (idx.payload.faixas !== false) { var fi = faixaDe(p, "index", "global", v); index_result.faixa = fi ? fi.label : null; }
      }
    }
    if (!index_result.avaliavel) motivos.push("indice: " + index_result.motivo);
    trilha.push({ passo: "indice", valor: index_result.valor_exato, motivo: index_result.motivo });

    // ---- Triada: eixo pelo bloco, cobertura minima por eixo, sem nota global ----
    var triad_result = {};
    EIXOS.forEach(function (eixo) {
      var t = regra(p, "triad", eixo);
      var itens = {}; (p.associacoes || []).forEach(function (a) { if (a.destination_type === "triad" && a.destination_id === eixo) itens[a.question_stable_id] = true; });
      var total = Object.keys(itens).length;
      var minhas = contribs.filter(function (c) { return c.destination_type === "triad" && c.destination === eixo; });
      var cobertura = total ? F(BigInt(minhas.length), BigInt(total)) : ZERO, minT = t ? minimo(t.payload) : null;
      var r = { nota: null, nota_exata: null, nota_exibicao: null, avaliavel: false, respondidos: minhas.length, total: total, cobertura: paraNumero(cobertura), cobertura_exibicao: pct(cobertura), mostrar_cobertura: cmp(cobertura, F(1n)) < 0, itens_pontuados: minhas.map(function (c) { return c.question_id; }), motivo: null, faixa: null };
      if (!t || !t.payload || !t.payload.agregacao) r.motivo = "configuracao do eixo indisponivel";
      else if (t.payload.contribuicao !== "por_id") r.motivo = "politica de contribuicao '" + t.payload.contribuicao + "' nao suportada pelo motor";
      else if (!minT) r.motivo = "sem cobertura minima aprovada para o eixo";
      else if (!minhas.length) r.motivo = "sem dados suficientes";
      else if (cmp(cobertura, minT) < 0) r.motivo = "cobertura " + minhas.length + "/" + total + " abaixo do minimo aprovado " + t.payload.cobertura_minima;
      else {
        var n = notaDe(minhas); resultadoNota(r, n, casas); delete r.carga; delete r.carga_exata;
        if (t.payload.faixas !== false) { var ft = faixaDe(p, "triad", eixo, n.nota); r.faixa = ft ? ft.label : null; }
      }
      if (!r.avaliavel) motivos.push("triada." + eixo + ": " + r.motivo);
      triad_result[eixo] = r;
      trilha.push({ passo: "triada", eixo: eixo, respondidos: minhas.length, total: total, nota: r.nota_exata, motivo: r.motivo });
    });

    contribs.forEach(function (c) { delete c._A; delete c._D; });
    var ctx = entrada.application_context || null;
    return {
      mode: mode, package_status: p.status, package_version: p.version, package_code: p.code, package_content_hash: p.content_hash || null,
      engine_version: entrada.engine_version || VERSAO_MOTOR, engine_contract_version: CONTRATO_MOTOR,
      edition: entrada.questionnaire_edition ? { code: entrada.questionnaire_edition.code, version: entrada.questionnaire_edition.version } : (p.edicao ? { code: p.edicao.code, version: p.edicao.version } : null),
      application_context: ctx,
      coverage: coverage, item_contributions: contribs, contextual_associations: contextuais, system_results: system_results, index_result: index_result, triad_result: triad_result,
      non_evaluable_reasons: motivos, oficial: mode === "oficial",
      trace: { hash_entrada: hashEntrada({ responses: respostas, response_states: estados, package: p.code + "@" + p.version + ":" + p.status + ":" + (p.content_hash || ""), edition: entrada.questionnaire_edition ? entrada.questionnaire_edition.code + "@" + entrada.questionnaire_edition.version : null, engine: (entrada.engine_version || VERSAO_MOTOR) + "/" + CONTRATO_MOTOR }), passos: trilha }
    };
  }

  /* ---------- comparabilidade (regra do pacote) ---------------------------
     Delta numerico de um sistema so quando TODOS os requisitos valem; senao,
     lado a lado, sem delta. Direcao so "subiu"/"desceu"/"permaneceu" —
     nunca melhorou/piorou: interpretacao e da profissional. */
  function comparar(anterior, atual, sistema, pacote) {
    var motivos = [];
    var rc = pacote ? regra(pacote, "comparability", "global") : null;
    var ra = anterior && anterior.system_results ? anterior.system_results[sistema] : null, rb = atual && atual.system_results ? atual.system_results[sistema] : null;
    var lado = { sistema: sistema, anterior: ra && ra.avaliavel ? ra.nota_exibicao : null, atual: rb && rb.avaliavel ? rb.nota_exibicao : null };
    if (!rc || !rc.payload || rc.payload.delta_permitido !== true) motivos.push("pacote sem regra de comparabilidade que permita delta");
    if (!anterior || !atual) motivos.push("faltam aplicacoes");
    else {
      var pa = anterior.application_context && (anterior.application_context.patient_id || anterior.application_context.patient_ref), pb = atual.application_context && (atual.application_context.patient_id || atual.application_context.patient_ref);
      if (!pa || pa !== pb) motivos.push("pacientes diferentes ou nao identificados");
      if (!anterior.edition || !atual.edition || anterior.edition.code !== atual.edition.code || anterior.edition.version !== atual.edition.version) motivos.push("edicoes do questionario diferentes");
      if (anterior.package_code !== atual.package_code || anterior.package_version !== atual.package_version || (anterior.package_content_hash || null) !== (atual.package_content_hash || null)) motivos.push("versoes do pacote metodologico diferentes");
      if (anterior.engine_contract_version !== atual.engine_contract_version) motivos.push("contratos do motor diferentes");
      if (!ra || !rb || !ra.avaliavel || !rb.avaliavel) motivos.push("sistema nao avaliavel em uma das aplicacoes");
      else if (ra.itens_pontuados.slice().sort().join(",") !== rb.itens_pontuados.slice().sort().join(",")) motivos.push("conjuntos de itens pontuados diferentes");
    }
    if (motivos.length) return Object.assign(lado, { comparavel: false, delta: null, delta_exato: null, delta_exibicao: null, direcao: null, motivos: motivos, apresentacao: "lado_a_lado" });
    var d = menos(fr(rb.nota_exata), fr(ra.nota_exata)), c = cmp(d, ZERO);
    return Object.assign(lado, { comparavel: true, delta: paraNumero(d), delta_exato: texto(d), delta_exibicao: (c > 0 ? "+" : "") + exibir(d, 1), direcao: c > 0 ? "subiu" : c < 0 ? "desceu" : "permaneceu", motivos: [], apresentacao: "delta" });
  }

  /** Confere um caso de referencia (payload formato v1) contra o motor. Devolve a lista de divergencias. */
  function conferirExemplo(p, payload) {
    var dif = [], ent = payload.entrada || {}, esp = payload.esperado || {}, exb = payload.exibicao || {};
    var r = calcular({ responses: ent.responses || {}, response_states: ent.response_states || {}, methodology_package: p, mode: "homologacao", engine_version: VERSAO_MOTOR });
    var igual = function (rotulo, obtido, esperado) { if (esperado === undefined) return; if (obtido === null || obtido === undefined) { dif.push(rotulo + ": nulo (esperado " + esperado + ")"); return; } if (cmp(fr(obtido), fr(esperado)) !== 0) dif.push(rotulo + ": " + obtido + " (esperado " + esperado + ")"); };
    var tela = function (rotulo, obtido, esperado) { if (esperado !== undefined && obtido !== esperado) dif.push(rotulo + " (tela): " + obtido + " (esperado " + esperado + ")"); };
    Object.keys(esp.sistemas || {}).forEach(function (k) { igual("sistema " + k, r.system_results[k] && r.system_results[k].nota_exata, esp.sistemas[k]); });
    Object.keys(esp.triade || {}).forEach(function (k) { igual("triade " + k, r.triad_result[k] && r.triad_result[k].nota_exata, esp.triade[k]); });
    igual("indice", r.index_result.valor_exato, esp.indice);
    igual("cobertura", r.coverage.fracao, esp.cobertura);
    Object.keys(exb.sistemas || {}).forEach(function (k) { tela("sistema " + k, r.system_results[k] && r.system_results[k].nota_exibicao, exb.sistemas[k]); });
    Object.keys(exb.triade || {}).forEach(function (k) { tela("triade " + k, r.triad_result[k] && r.triad_result[k].nota_exibicao, exb.triade[k]); });
    tela("indice", r.index_result.valor_exibicao, exb.indice);
    return dif;
  }

  raiz.MotorMetodologico = { VERSAO: VERSAO_MOTOR, CONTRATO: CONTRATO_MOTOR, EIXOS: EIXOS, ESTADOS: ESTADOS, calcular: calcular, comparar: comparar, conferirExemplo: conferirExemplo,
    motivosBloqueioOficial: motivosBloqueioOficial, ErroValidacao: ErroValidacao, hashEntrada: hashEntrada,
    fracao: { de: fr, texto: texto, exibir: exibir, comparar: cmp, numero: paraNumero } };
})();
