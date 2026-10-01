/* ===========================================================================
   MOTOR METODOLOGICO GENERICO — V1, Etapa 4 (Mestre §14, §15, §19)
   ===========================================================================

   Deterministico, sem rede, sem aleatoriedade, sem regra clinica escrita aqui:
   tudo que decide numero vem do PACOTE recebido. Mesma entrada + mesmas
   versoes = mesma saida, com trilha de calculo reproduzivel por contribuicao.

   CONTRATO DE ENTRADA
     responses              { stable_id: valor }  (valor inteiro na escala do item)
     response_states        { stable_id: 'respondido'|'nao_respondido'|'recusado'|'nao_aplicavel' }  (opcional)
     questionnaire_edition  { code, version, perguntas? }  (as perguntas vem do pacote se ausentes)
     methodology_package    o pacote (status, version, escalas, sistemas, perguntas, associacoes, faixas, regras)
     application_context    { patient_ref?, encounter_ref?, applied_at?, note? }  — so passa pela trilha
     engine_version         string
     mode                   'homologacao' | 'oficial'

   CONTRATO DE SAIDA
     mode, package_status, package_version, package_code, engine_version, edition
     coverage               { respondidos, total, percentual, recusados, nao_aplicaveis, pendentes }
     item_contributions     [{ question_id, raw_response, oriented_value, destination_type, destination, weight, contribution, max }]
     system_results         { code: { carga, nota, faixa, avaliavel, respondidos, total, motivo } }
     index_result           { valor, avaliavel, motivo }
     triad_result           { eixo: { nota, avaliavel, motivo } }
     non_evaluable_reasons  [string]
     trace                  { passos: [...], hash_entrada }

   REGRAS FIXAS (nao sao parametro):
   - ID desconhecido, valor fora da escala, opcao inexistente, resposta
     duplicada = ERRO DE VALIDACAO (nunca zero silencioso);
   - ausencia != 0; 0 valido = respondido;
   - orientacao AUSENTE nao e tratada como direta: o item fica fora e o motivo
     e registrado;
   - modo OFICIAL so com pacote aprovado E vigente; sem isso o motor RECUSA
     (nenhum fallback para rascunho, nenhum fallback para regra antiga);
   - modo HOMOLOGACAO executa qualquer pacote, e toda saida carrega
     mode/package_status/package_version para a barreira central recusar.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;
  var VERSAO_MOTOR = "motor-generico-1.0.0";
  var EIXOS = ["fisico", "mental", "espiritual"];

  function ErroValidacao(codigo, mensagem, detalhe) { this.name = "ErroValidacao"; this.codigo = codigo; this.message = mensagem; this.detalhe = detalhe || null; }
  ErroValidacao.prototype = Object.create(Error.prototype);
  function num(v) { return typeof v === "number" && isFinite(v); }
  function arred(n, casas) { var f = Math.pow(10, casas); return Math.round((n + Number.EPSILON) * f) / f; }
  function vigente(p, dia) { return raiz.PacoteMetodologico ? raiz.PacoteMetodologico.vigente(p, dia) : (p && p.status === "aprovado" && !!p.effective_from); }

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
  function faixaDe(p, tipo, dest, valor) {
    var f = (p.faixas || []).filter(function (x) { return x.destination_type === tipo && x.destination_id === dest; });
    for (var i = 0; i < f.length; i++) {
      var r = f[i];
      var acimaMin = r.lower_inclusive ? valor >= r.lower_bound : valor > r.lower_bound;
      var abaixoMax = r.upper_inclusive ? valor <= r.upper_bound : valor < r.upper_bound;
      if (acimaMin && abaixoMax) return r.label;
    }
    return null;
  }

  /** Motivos pelos quais o modo OFICIAL recusa um pacote. Vazio = pode. */
  function motivosBloqueioOficial(p, dia) {
    var m = [];
    if (!p) { m.push("sem pacote metodologico"); return m; }
    if (p.status !== "aprovado") m.push("pacote com status '" + p.status + "' (so 'aprovado' produz saida oficial)");
    if (p.status === "aprovado" && !vigente(p, dia)) m.push("pacote aprovado mas nao vigente (effective_from/effective_to)");
    if (raiz.PacoteMetodologico) { var v = raiz.PacoteMetodologico.validar(p); if (!v.publicavel) m.push("validador de publicacao: " + v.total_erros + " erro(s)"); }
    return m;
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
    var perguntas = (entrada.questionnaire_edition && entrada.questionnaire_edition.perguntas) || p.perguntas || [];
    var porId = {}; perguntas.forEach(function (q) { porId[q.stable_id] = q; });
    var escalas = {}; (p.escalas || []).forEach(function (e) { escalas[e.code] = e; });
    var respostas = entrada.responses || {}, estados = entrada.response_states || {};
    var motivos = [], trilha = [];

    // ---- validacao das respostas: erro, nunca zero silencioso ----
    var ids = Object.keys(respostas);
    ids.forEach(function (id) {
      var q = porId[id];
      if (!q) throw new ErroValidacao("id_desconhecido", "resposta para ID desconhecido: " + id, { id: id });
      var v = respostas[id];
      if (v === null || v === undefined) return;   // ausencia explicita: sem contribuicao
      var e = escalas[q.scale_code];
      if (!e) throw new ErroValidacao("escala_ausente", "item " + id + " sem escala no pacote", { id: id });
      if (!Number.isInteger(v) || v < e.min_value || v > e.max_value) throw new ErroValidacao("valor_fora_da_escala", "valor " + v + " fora da escala " + e.min_value + ".." + e.max_value + " em " + id, { id: id, valor: v });
      if (e.labels && Array.isArray(e.labels) && e.labels.length && !(v - e.min_value < e.labels.length)) throw new ErroValidacao("opcao_inexistente", "opcao " + v + " nao existe em " + id, { id: id, valor: v });
    });
    Object.keys(estados).forEach(function (id) { if (!porId[id]) throw new ErroValidacao("id_desconhecido", "estado para ID desconhecido: " + id, { id: id }); });

    // ---- cobertura de preenchimento (IDs, nao linhas) ----
    var respondidos = 0, recusados = 0, naoAplicaveis = 0;
    perguntas.forEach(function (q) {
      var v = respostas[q.stable_id], st = estados[q.stable_id];
      if (st === "recusado") recusados++; else if (st === "nao_aplicavel") naoAplicaveis++; else if (v !== null && v !== undefined) respondidos++;
    });
    var coverage = { respondidos: respondidos, total: perguntas.length, percentual: perguntas.length ? arred(respondidos / perguntas.length * 100, 0) : 0, recusados: recusados, nao_aplicaveis: naoAplicaveis, pendentes: perguntas.length - respondidos - recusados - naoAplicaveis, rotulo: "cobertura de preenchimento" };

    // ---- contribuicoes por item (so respondidos com orientacao definida) ----
    var contribs = [];
    (p.associacoes || []).forEach(function (a) {
      var q = porId[a.question_stable_id]; if (!q) return;
      var v = respostas[q.stable_id], st = estados[q.stable_id];
      if (v === null || v === undefined || st === "recusado" || st === "nao_aplicavel") return;
      var e = escalas[q.scale_code]; if (!e) return;
      if (!q.orientation) { motivos.push("item " + q.stable_id + " sem orientacao aprovada: fora do calculo"); return; }
      if (!num(a.weight)) { motivos.push("associacao " + q.stable_id + "→" + a.destination_id + " sem peso: fora do calculo"); return; }
      var orientado = q.orientation === "invertida" ? e.max_value - v : v;
      contribs.push({ question_id: q.stable_id, raw_response: v, oriented_value: orientado, destination_type: a.destination_type, destination: a.destination_id, role: a.role || null, weight: a.weight, contribution: arred(a.weight * orientado, 4), max: a.weight * e.max_value });
    });
    contribs.sort(function (x, y) { return x.question_id.localeCompare(y.question_id) || x.destination_type.localeCompare(y.destination_type) || x.destination.localeCompare(y.destination); });

    // ---- sistemas ----
    var system_results = {};
    (p.sistemas || []).forEach(function (s) {
      var sc = regra(p, "scoring", s.code);
      var minhas = contribs.filter(function (c) { return c.destination_type === "system" && c.destination === s.code; });
      var total = (p.associacoes || []).filter(function (a) { return a.destination_type === "system" && a.destination_id === s.code; }).length;
      var r = { carga: null, nota: null, faixa: null, avaliavel: false, respondidos: minhas.length, total: total, motivo: null };
      if (!sc) r.motivo = "sem regra de pontuacao para " + s.code;
      else if (!minhas.length) r.motivo = "sem dados suficientes (nenhuma contribuicao respondida)";
      else {
        var A = 0, D = 0; minhas.forEach(function (c) { A += c.contribution; D += c.max; });
        var aus = regra(p, "absence");
        var denom = aus && aus.payload ? aus.payload.denominador : null;
        if (denom === "respondidos") { r.carga = arred(10 * A / D, 4); r.nota = arred(10 - r.carga, 4); r.avaliavel = true; }
        else if (denom === "completo") { var Dtot = 0; (p.associacoes || []).filter(function (a) { return a.destination_type === "system" && a.destination_id === s.code && num(a.weight); }).forEach(function (a) { var q = porId[a.question_stable_id]; var e = q && escalas[q.scale_code]; if (e) Dtot += a.weight * e.max_value; }); if (minhas.length < total) { r.motivo = "politica 'completo': faltam itens"; } else { r.carga = arred(10 * A / Dtot, 4); r.nota = arred(10 - r.carga, 4); r.avaliavel = true; } }
        else r.motivo = "sem politica de denominador aprovada: nota bloqueada (dados e cobertura preservados)";
        if (r.avaliavel && aus && aus.payload && num(aus.payload.cobertura_minima) && total > 0 && minhas.length / total < aus.payload.cobertura_minima) { r.avaliavel = false; r.motivo = "cobertura " + minhas.length + "/" + total + " abaixo do minimo aprovado " + aus.payload.cobertura_minima; r.carga = null; r.nota = null; }
        if (r.avaliavel) r.faixa = faixaDe(p, "system", s.code, r.nota);
      }
      if (!r.avaliavel && r.motivo) motivos.push(s.code + ": " + r.motivo);
      system_results[s.code] = r;
      trilha.push({ passo: "sistema", sistema: s.code, contribuicoes: minhas.length, carga: r.carga, nota: r.nota, faixa: r.faixa, motivo: r.motivo });
    });

    // ---- Indice ----
    var idx = regra(p, "index", "global");
    var index_result = { valor: null, avaliavel: false, motivo: null, faixa: null };
    if (!idx || !idx.payload || !idx.payload.alphas) index_result.motivo = "configuracao do Indice indisponivel";
    else {
      var alphas = idx.payload.alphas, faltam = Object.keys(alphas).filter(function (k) { return !system_results[k] || !system_results[k].avaliavel; });
      if (faltam.length && idx.payload.indice_parcial !== true) index_result.motivo = "sistema(s) sem nota: " + faltam.join(", ") + " (sem Indice parcial aprovado)";
      else {
        var soma = 0, pesoTot = 0;
        Object.keys(alphas).forEach(function (k) { if (system_results[k] && system_results[k].avaliavel) { soma += alphas[k] * system_results[k].nota; pesoTot += alphas[k]; } });
        if (pesoTot > 0) { index_result.valor = arred(10 * soma / (idx.payload.indice_parcial === true && faltam.length ? pesoTot : 1), 2); index_result.avaliavel = true; index_result.faixa = faixaDe(p, "index", "global", index_result.valor); }
        else index_result.motivo = "nenhum sistema avaliavel";
      }
    }
    if (!index_result.avaliavel && index_result.motivo) motivos.push("indice: " + index_result.motivo);
    trilha.push({ passo: "indice", valor: index_result.valor, motivo: index_result.motivo });

    // ---- Triada ----
    var triad_result = {};
    EIXOS.forEach(function (eixo) {
      var t = regra(p, "triad", eixo), r = { nota: null, avaliavel: false, motivo: null, faixa: null };
      var minhas = contribs.filter(function (c) { return c.destination_type === "triad" && c.destination === eixo; });
      if (!t || !t.payload || !t.payload.agregacao) r.motivo = "configuracao do eixo indisponivel";
      else if (!minhas.length) r.motivo = "sem dados suficientes";
      else if (t.payload.contribuicao === "por_id") {
        var vistos = {}, A = 0, D = 0;
        minhas.forEach(function (c) { if (vistos[c.question_id]) return; vistos[c.question_id] = true; A += c.contribution; D += c.max; });
        r.nota = arred(10 - 10 * A / D, 4); r.avaliavel = true; r.faixa = faixaDe(p, "triad", eixo, r.nota);
      } else r.motivo = "politica de contribuicao '" + t.payload.contribuicao + "' nao suportada pelo motor";
      if (!r.avaliavel && r.motivo) motivos.push("triada." + eixo + ": " + r.motivo);
      triad_result[eixo] = r;
      trilha.push({ passo: "triada", eixo: eixo, nota: r.nota, motivo: r.motivo });
    });

    return {
      mode: mode, package_status: p.status, package_version: p.version, package_code: p.code, engine_version: entrada.engine_version || VERSAO_MOTOR,
      edition: entrada.questionnaire_edition ? { code: entrada.questionnaire_edition.code, version: entrada.questionnaire_edition.version } : (p.edicao ? { code: p.edicao.code, version: p.edicao.version } : null),
      application_context: entrada.application_context || null,
      coverage: coverage, item_contributions: contribs, system_results: system_results, index_result: index_result, triad_result: triad_result,
      non_evaluable_reasons: motivos, oficial: mode === "oficial",
      trace: { hash_entrada: hashEntrada({ responses: respostas, response_states: estados, package: p.code + "@" + p.version + ":" + p.status + ":" + (p.content_hash || ""), edition: entrada.questionnaire_edition ? entrada.questionnaire_edition.code + "@" + entrada.questionnaire_edition.version : null, engine: entrada.engine_version || VERSAO_MOTOR }), passos: trilha }
    };
  }

  raiz.MotorMetodologico = { VERSAO: VERSAO_MOTOR, EIXOS: EIXOS, calcular: calcular, motivosBloqueioOficial: motivosBloqueioOficial, ErroValidacao: ErroValidacao, hashEntrada: hashEntrada };
})();
