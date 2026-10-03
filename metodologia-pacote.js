/* ===========================================================================
   PACOTE METODOLOGICO — modelo, validador de publicacao, importador do
   inventario e exportacao (V1, Etapa 4)
   ===========================================================================

   Um PACOTE e o conjunto versionado e identificavel que o Mestre (§13) exige:
   edicao do questionario (84 IDs), escalas, sistemas, associacoes (pergunta
   -> sistema | Triada, com peso e papel), faixas, regras (ausencia, Indice,
   Triada, pontuacao, cobertura, comparabilidade, exemplos) e o registro de
   homologacao. Status: rascunho | em_revisao | aprovado | retirado.

   O que este arquivo FAZ: representa, valida (APONTA, nunca corrige), importa
   o inventario recuperado como RASCUNHO e exporta para revisao humana.
   O que este arquivo NAO FAZ: aprovar nada, inventar peso, faixa, orientacao,
   denominador ou corte. Nenhum valor atual e declarado correto.

   Roda no navegador (window.PacoteMetodologico) e no Node (globalThis), para
   o Supabase falso e os testes usarem o MESMO validador do servidor.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  var STATUS_PACOTE = ["rascunho", "em_revisao", "aprovado", "retirado"];
  var STATUS_ELEMENTO = ["rascunho", "para_homologacao", "aprovado", "retirado"];
  var EIXOS = ["fisico", "mental", "espiritual"];
  var TEST_FIXTURE = "TEST_FIXTURE_ONLY";
  /* Contrato V1 (Etapa 4.2): valores permitidos e textos causais que nunca
     entram em conteudo oficial (podem ficar so em legacy/provenance). */
  var CONTEXTOS_TEMPORAIS = ["ultimos_7_dias", "ultimos_30_dias", "ultimos_3_meses", "atualmente", "habitualmente", "ao_longo_da_vida", "sem_periodo_especifico"];
  var PAPEIS_SISTEMA = ["primaria", "secondary_contextual"];
  var EIXO_DO_BLOCO = { fisico: "fisico", mental_emocional: "mental", espiritual: "espiritual" };
  var TERMOS_CAUSAIS = ["impacto espiritual", "plexo solar", "queda de frequência", "queda de frequencia", "dessintoniza", "bloqueio energético", "bloqueio energetico"];

  function vazio(v) { return v === null || v === undefined || v === ""; }
  function num(v) { return typeof v === "number" && isFinite(v); }
  function hoje() { return new Date().toISOString().slice(0, 10); }
  /** "10/3", "0", "2.5" -> numero; texto invalido -> null. */
  function valorExato(t) {
    var m = /^\s*(-?\d+(?:\.\d+)?)\s*(?:\/\s*(\d+))?\s*$/.exec(String(t));
    if (!m) return null; var n = parseFloat(m[1]), d = m[2] ? parseInt(m[2], 10) : 1;
    return d === 0 ? null : n / d;
  }
  function termoCausal(texto) {
    if (vazio(texto)) return null; var t = String(texto).toLowerCase();
    for (var i = 0; i < TERMOS_CAUSAIS.length; i++) if (t.indexOf(TERMOS_CAUSAIS[i]) >= 0) return TERMOS_CAUSAIS[i];
    return null;
  }

  /** Um pacote vazio, em rascunho. `code` e `version` identificam; nada mais vem preenchido. */
  function novo(code, version, extra) {
    return Object.assign({
      id: null, code: code, version: version || 1, status: "rascunho", origin: null, justification: null, responsible: null,
      reviewed_by: null, reviewed_at: null, effective_from: null, effective_to: null, content_hash: null, created_at: null, notes: null,
      edicao: { code: code + "-questionario", version: version || 1, status: "rascunho", item_count: 0 },
      escalas: [], sistemas: [], perguntas: [], associacoes: [], faixas: [], regras: [], registros: []
    }, extra || {});
  }

  /** O pacote esta vigente hoje (so faz sentido para aprovado)? */
  function vigente(p, dia) {
    if (!p || p.status !== "aprovado") return false;
    var d = dia || hoje();
    if (!p.effective_from || p.effective_from > d) return false;
    if (p.effective_to && p.effective_to < d) return false;
    return true;
  }

  /* ---------- validador de publicacao: APONTA, nao corrige ----------------- */
  function validar(p) {
    var erros = [], avisos = [];
    var erro = function (codigo, onde, mensagem) { erros.push({ codigo: codigo, onde: onde, mensagem: mensagem }); };
    if (!p) { erro("vazio", "pacote", "sem pacote"); return { erros: erros, avisos: avisos, publicavel: false, total_erros: erros.length }; }
    var sist = (p.sistemas || []).map(function (s) { return s.code; });
    var escalas = (p.escalas || []).map(function (e) { return e.code; });
    var perguntas = p.perguntas || [], assoc = p.associacoes || [], faixas = p.faixas || [], regras = p.regras || [];
    var ids = {};
    perguntas.forEach(function (q) {
      ids[q.stable_id] = (ids[q.stable_id] || 0) + 1;
      if (vazio(q.scale_code)) erro("escala_ausente", q.stable_id, "pergunta sem escala");
      else if (escalas.indexOf(q.scale_code) < 0) erro("referencia_inexistente", q.stable_id, 'escala "' + q.scale_code + '" nao existe no pacote');
      if (vazio(q.orientation)) erro("orientacao_ausente", q.stable_id, "orientacao nao definida (ausente nao e direta)");
      else if (q.orientation !== "direta" && q.orientation !== "invertida") erro("orientacao_invalida", q.stable_id, "orientacao desconhecida: " + q.orientation);
      if (vazio(q.temporal_context)) erro("contexto_temporal_ausente", q.stable_id, "pergunta sem contexto temporal");
      else if (CONTEXTOS_TEMPORAIS.indexOf(q.temporal_context) < 0) erro("contexto_temporal_invalido", q.stable_id, "contexto temporal desconhecido: " + q.temporal_context);
      var doItem = assoc.filter(function (a) { return a.question_stable_id === q.stable_id; });
      var sistemasDoItem = doItem.filter(function (a) { return a.destination_type === "system"; });
      var primarias = sistemasDoItem.filter(function (a) { return a.role === "primaria"; }).length;
      if (!sistemasDoItem.length) erro("associacao_orfa", q.stable_id, "pergunta sem associacao a sistema");
      else if (primarias === 0) erro("primaria_ausente", q.stable_id, "pergunta sem sistema primario pontuavel");
      else if (primarias > 1) erro("primaria_multipla", q.stable_id, primarias + " sistemas primarios pontuaveis (o contrato exige exatamente um)");
      var triades = doItem.filter(function (a) { return a.destination_type === "triad"; });
      if (!triades.length) erro("triade_ausente", q.stable_id, "pergunta sem eixo da Triada");
      else if (triades.length > 1) erro("triade_multipla", q.stable_id, triades.length + " vinculos de Triada (o contrato exige exatamente um)");
      else if (EIXO_DO_BLOCO[q.block] && triades[0].destination_id !== EIXO_DO_BLOCO[q.block]) erro("triade_eixo_divergente", q.stable_id, "bloco " + q.block + " exige eixo " + EIXO_DO_BLOCO[q.block] + ", nao " + triades[0].destination_id);
    });
    Object.keys(ids).forEach(function (id) { if (ids[id] > 1) erro("id_duplicado", id, "stable_id em " + ids[id] + " linhas do pacote"); });
    assoc.forEach(function (a) {
      var onde = a.question_stable_id + "→" + a.destination_id;
      if (!ids[a.question_stable_id]) erro("referencia_inexistente", a.question_stable_id, "associacao aponta para pergunta que nao existe no pacote");
      if (a.destination_type === "system" && sist.indexOf(a.destination_id) < 0) erro("referencia_inexistente", onde, "sistema de destino nao existe no pacote");
      if (a.destination_type === "triad" && EIXOS.indexOf(a.destination_id) < 0) erro("referencia_inexistente", onde, "eixo da Triada desconhecido");
      if (a.destination_type !== "system" && a.destination_type !== "triad") erro("referencia_inexistente", onde, "destination_type desconhecido");
      if (a.destination_type === "system" && PAPEIS_SISTEMA.indexOf(a.role) < 0) erro("papel_invalido", onde, "papel de associacao desconhecido: " + (a.role || "AUSENTE") + " (permitidos: primaria, secondary_contextual)");
      if (a.destination_type === "system" && a.role === "secondary_contextual") { if (!vazio(a.weight)) erro("secundaria_pontuavel", onde, "associacao secondary_contextual nao pontua: peso deve ser nulo (o legado fica em legacy)"); }
      else if (!num(a.weight)) erro("peso_ausente", onde, "peso obrigatorio ausente");
      else if (a.weight <= 0) erro("peso_invalido", onde, "peso deve ser positivo");
      if (a.conflict) erro("conflito_pendente", onde, a.conflict_note || "associacao em conflito nao resolvido");
    });
    if (assoc.some(function (a) { return a.conflict && (a.question_stable_id === "SNT-101" || a.question_stable_id === "SNT-501"); })) erro("snt_pendente", "SNT-101/SNT-501", "vinculos de SNT-101/SNT-501 pendentes de homologacao");
    // faixas por destino
    var destinos = {};
    faixas.forEach(function (f) {
      var k = f.destination_type + ":" + f.destination_id; (destinos[k] = destinos[k] || []).push(f);
      [["lower_bound_exact", "lower_bound"], ["upper_bound_exact", "upper_bound"]].forEach(function (par) {
        if (vazio(f[par[0]])) return;
        var x = valorExato(f[par[0]]);
        if (x === null || !num(f[par[1]]) || Math.abs(x - f[par[1]]) > 1e-9) erro("faixa_limite_inconsistente", f.destination_id + "/" + f.label, par[0] + " \"" + f[par[0]] + "\" nao corresponde a " + par[1] + " " + f[par[1]]);
      });
      ["message_nutri", "message_paciente", "label"].forEach(function (c) { var t = termoCausal(f[c]); if (t) erro("texto_causal", f.destination_id + "/" + f.label, c + " contem termo causal proibido: " + t); });
    });
    Object.keys(destinos).forEach(function (k) {
      var lista = destinos[k].slice().sort(function (a, b) { return a.lower_bound - b.lower_bound || a.upper_bound - b.upper_bound; });
      var ant = null, tipo = lista[0].destination_type, dest = lista[0].destination_id;
      lista.forEach(function (f, i) {
        if (!(f.lower_bound < f.upper_bound)) erro("faixa_ordem_invalida", dest + "/" + f.label, "limite inferior >= superior");
        if (ant) {
          if (f.lower_bound < ant.upper_bound || (f.lower_bound === ant.upper_bound && f.lower_inclusive && ant.upper_inclusive)) erro("faixa_sobreposta", dest + "/" + f.label, 'sobrepoe "' + ant.label + '"');
          else if (f.lower_bound > ant.upper_bound || (f.lower_bound === ant.upper_bound && !f.lower_inclusive && !ant.upper_inclusive)) erro("faixa_lacuna", dest + "/" + f.label, 'lacuna entre "' + ant.label + '" e "' + f.label + '"');
        } else if (f.lower_bound > 0 || !f.lower_inclusive) erro("faixa_lacuna", dest + "/" + f.label, "dominio nao comeca em 0 inclusivo");
        ant = f; void i;
      });
      if (ant && tipo !== "index" && (ant.upper_bound < 10 || !ant.upper_inclusive)) erro("faixa_lacuna", dest + "/" + ant.label, "dominio nao termina em 10 inclusivo");
    });
    sist.forEach(function (code) { if (!destinos["system:" + code]) erro("faixa_ausente", code, "sistema sem faixas"); });
    // regras obrigatorias
    var regra = function (tipo, alvo) { return regras.filter(function (r) { return r.rule_type === tipo && (alvo === undefined || r.target === alvo); })[0] || null; };
    var aus = regra("absence");
    if (!aus || !aus.payload || ["denominador", "cobertura_minima", "recusado", "nao_aplicavel", "minimos"].some(function (k) { return !(k in aus.payload); }) || aus.payload.denominador === null || aus.payload.cobertura_minima === null)
      erro("politica_parcialidade_ausente", "absence", "politica de ausencia/parcialidade incompleta (denominador, cobertura_minima, recusado, nao_aplicavel, minimos)");
    else {
      if (aus.payload.denominador !== "respondidos") erro("politica_parcialidade_invalida", "absence", "denominador \"" + aus.payload.denominador + "\" nao suportado (contrato: respondidos)");
      if (!num(aus.payload.cobertura_minima) || aus.payload.cobertura_minima <= 0 || aus.payload.cobertura_minima > 1) erro("politica_parcialidade_invalida", "absence", "cobertura_minima deve ser numero em (0, 1]");
      ["em_branco", "recusado", "nao_aplicavel"].forEach(function (k) { if (aus.payload[k] === "zero" || aus.payload[k] === 0) erro("politica_parcialidade_invalida", "absence", k + " nao pode valer zero (ausencia nao e zero)"); });
      if (aus.payload.conta_como_zero === true) erro("politica_parcialidade_invalida", "absence", "ausencia nao conta como zero");
    }
    var idx = regra("index", "global");
    if (!idx || !idx.payload || !idx.payload.alphas || !("elegibilidade" in idx.payload) || !("indice_parcial" in idx.payload)) erro("indice_incompleto", "index", "configuracao do Indice incompleta (alphas, elegibilidade, indice_parcial)");
    else {
      var soma = 0;
      Object.keys(idx.payload.alphas).forEach(function (k) {
        if (sist.indexOf(k) < 0) erro("referencia_inexistente", "index/" + k, "alpha para sistema inexistente");
        if (!num(idx.payload.alphas[k])) erro("indice_incompleto", "index/" + k, "alpha ausente"); else soma += idx.payload.alphas[k];
      });
      sist.forEach(function (k) { if (!(k in idx.payload.alphas)) erro("indice_incompleto", "index/" + k, "sistema sem alpha"); });
      if (Math.abs(soma - 1) > 0.0001) erro("indice_incompleto", "index", "alphas somam " + soma + ", esperado 1");
      if (idx.payload.indice_parcial !== false) erro("indice_parcial_proibido", "index", "Indice parcial nao existe no contrato (indice_parcial deve ser false)");
      if (idx.payload.renormalizacao === true) erro("indice_parcial_proibido", "index", "renormalizacao do Indice proibida");
    }
    EIXOS.forEach(function (eixo) {
      var t = regra("triad", eixo);
      if (!t || !t.payload || ["contribuicao", "escala", "elegibilidade", "agregacao"].some(function (k) { return !(k in t.payload); })) erro("triada_incompleta", "triad/" + eixo, "configuracao do eixo incompleta (contribuicao, escala, elegibilidade, agregacao)");
      else if (!num(t.payload.cobertura_minima) || t.payload.cobertura_minima <= 0 || t.payload.cobertura_minima > 1) erro("triada_incompleta", "triad/" + eixo, "cobertura_minima do eixo deve ser numero em (0, 1]");
      else if (t.payload.nota_global === true) erro("triada_incompleta", "triad/" + eixo, "nota global da Triada nao existe no contrato");
    });
    (p.sistemas || []).forEach(function (s) {
      ["name", "public_text", "definition", "emotional_pattern", "spiritual_impact"].forEach(function (c) { var t = termoCausal(s[c]); if (t) erro("texto_causal", s.code, c + " contem termo causal proibido: " + t); });
      if (!vazio(s.emotional_pattern) || !vazio(s.spiritual_impact)) erro("texto_causal_legado", s.code, "padrao emocional / impacto espiritual recuperados nao entram em conteudo oficial (preservar em legacy)");
    });
    regras.filter(function (r) { return r.rule_type === "suggestion"; }).forEach(function (r) {
      if (!r.payload || r.payload.automatica !== false) erro("sugestao_automatica_proibida", "suggestion/" + r.target, "nenhuma combinacao ou sugestao automatica e oficial (automatica deve ser false)");
    });
    sist.forEach(function (code) { var sc = regra("scoring", code); if (!sc || !sc.payload || !("formula" in sc.payload)) erro("regra_incompleta", "scoring/" + code, "sistema sem regra de pontuacao"); });
    if (!regras.some(function (r) { return r.rule_type === "example" && r.payload && r.payload.entrada && r.payload.esperado !== null && r.payload.esperado !== undefined; })) erro("exemplo_sem_resultado", "example", "nenhum exemplo deterministico com resultado esperado");
    else if (raiz.MotorMetodologico && raiz.MotorMetodologico.conferirExemplo) {
      regras.filter(function (r) { return r.rule_type === "example" && r.payload && r.payload.formato === "v1"; }).forEach(function (r) {
        var dif; try { dif = raiz.MotorMetodologico.conferirExemplo(p, r.payload); } catch (e) { dif = ["erro do motor: " + (e && e.message)]; }
        if (dif.length) erro("exemplo_divergente", "example/" + r.target, dif.slice(0, 3).join("; "));
      });
    }
    var naoAprovados = [].concat(perguntas, assoc, faixas, p.sistemas || [], p.escalas || [], regras).filter(function (x) { return x.status !== "aprovado"; }).length;
    if (naoAprovados) erro("elemento_nao_aprovado", "pacote", naoAprovados + " elemento(s) com status diferente de aprovado");
    if (!perguntas.length) erro("vazio", "pacote", "pacote sem perguntas");
    if (!sist.length) erro("vazio", "pacote", "pacote sem sistemas");
    return { erros: erros, avisos: avisos, publicavel: erros.length === 0, total_erros: erros.length };
  }

  /* ---------- importador: inventario recuperado -> pacote RASCUNHO ----------
     Tudo entra com status "para_homologacao". Orientacao e escala entram como
     foram ENCONTRADAS (vazio continua vazio). Conflitos sao preservados e
     marcados. Nenhuma regra de ausencia, Indice ou Triada e preenchida com
     valor oficial: as regras entram com o COMPORTAMENTO ATUAL descrito e
     status para_homologacao — o validador as acusa, de proposito. */
  function importarInventario(inv, code, version) {
    if (!inv || !inv.perguntas) throw new Error("inventario ausente");
    var p = novo(code || "HOLOS-V1", version || 1, { origin: "inventario recuperado dos bancos do motor (Etapa 4)", justification: null, notes: "IMPORTADO COMO RASCUNHO — PARA HOMOLOGACAO. Nenhum elemento aprovado." });
    var PH = "para_homologacao";
    p.edicao = { code: p.code + "-questionario", version: p.version, status: PH, item_count: inv.perguntas.length, notes: "84 IDs recuperados (" + inv.contagem.fisico + "/" + inv.contagem.mental_emocional + "/" + inv.contagem.espiritual + "); 86 linhas nos bancos" };
    p.escalas = (inv.escalas || []).map(function (e) { return { code: e.id, min_value: e.minimo, max_value: e.maximo, labels: e.rotulos, kind: e.tipo, status: PH, source: e.fonte, notes: e.observacao }; });
    p.sistemas = (inv.sistemas || []).map(function (s, i) { return { code: s.codigo, name: s.nome, public_text: null, definition: s.definicao, emotional_pattern: s.padrao_emocional, spiritual_impact: s.impacto_espiritual, color: s.cor, position: i + 1, status: PH, source: s.fonte, notes: "nome e texto recuperados; validacao clinica: nao" }; });
    p.perguntas = inv.perguntas.map(function (q) {
      return { stable_id: q.stable_id, statement: q.enunciado, block: q.bloco, scale_code: q.escala_id || null, response_labels: q.rotulos_resposta || null,
        orientation: q.orientacao_recuperada || null, temporal_context: q.contexto_temporal || null, status: PH, source: q.fonte + " (" + q.linhas.map(function (l) { return l.arquivo + ":" + l.linha; }).join(", ") + ")",
        notes: [q.rotulo, q.conflito ? "CONFLITO: " + q.conflito : null, q.orientacao_ausente ? "orientacao AUSENTE no banco" : null].filter(Boolean).join(" · "), version: 1, position: q.posicao };
    });
    p.associacoes = (inv.associacoes || []).map(function (a) { return { question_stable_id: a.question_id, destination_type: a.destination_type, destination_id: a.destination_id, weight: a.weight, role: a.role, status: PH, source: a.source, conflict: !!a.conflito, conflict_note: a.conflito_nota || null }; });
    p.faixas = (inv.faixas || []).map(function (f) { return { destination_type: f.destination_type, destination_id: f.destination_id, lower_bound: f.limite_inferior, upper_bound: f.limite_superior, lower_inclusive: f.inferior_inclusivo, upper_inclusive: f.superior_inclusivo, label: f.rotulo, message_nutri: f.mensagem_nutri, message_paciente: f.mensagem_paciente, status: PH, source: f.fonte }; });
    p.regras = [];
    (inv.sistemas || []).forEach(function (s) { p.regras.push({ rule_type: "scoring", target: s.codigo, payload: { formula: "proporcional_ponderada (recuperada de regras.csv)", carga: "10 × Σ peso × carga / Σ peso × escala_max", nota: "10 − carga", oficial: false }, status: PH, source: "motor/bancos/regras.csv + motor/src/motor.ts" }); });
    p.regras.push({ rule_type: "absence", target: "global", payload: { politica_oficial_aprovada: false, denominador: null, cobertura_minima: null, recusado: null, nao_aplicavel: null, minimos: null, redistribuicao: null, comportamento_atual: inv.ausencia }, status: PH, source: inv.ausencia ? inv.ausencia.fonte : null, notes: "SEM POLITICA OFICIAL APROVADA — campos oficiais vazios de proposito" });
    p.regras.push({ rule_type: "coverage", target: "global", payload: { definicao: inv.cobertura ? inv.cobertura.definicao_permitida : null, denominador: inv.cobertura ? inv.cobertura.denominador : null, decide_avaliabilidade: false, corte_minimo: null }, status: PH, source: inv.cobertura ? inv.cobertura.fonte : null });
    p.regras.push({ rule_type: "index", target: "global", payload: { oficial: false, alphas_recuperados: inv.indice ? inv.indice.pesos_atuais : null, renormalizacao_atual: inv.indice ? inv.indice.renormalizacao_atual : null, elegibilidade_atual: inv.indice ? inv.indice.elegibilidade_atual : null, nota: "alphas, elegibilidade e indice_parcial OFICIAIS nao preenchidos" }, status: PH, source: inv.indice ? inv.indice.fonte : null });
    EIXOS.forEach(function (e) { p.regras.push({ rule_type: "triad", target: e, payload: { oficial: false, comportamento_atual: inv.triada ? inv.triada.contribuicao_atual : null, nota: "contribuicao, escala, elegibilidade e agregacao OFICIAIS nao preenchidas" }, status: PH, source: inv.triada ? inv.triada.fonte : null }); });
    p.regras.push({ rule_type: "comparability", target: "global", payload: { implementada: false, regra: null }, status: PH, source: inv.comparabilidade ? inv.comparabilidade.fonte : null });
    return p;
  }

  /* ---------- hash de conteudo (SHA-256, sincrono, sem dependencia) -------- */
  function sha256(texto) {
    var bytes = typeof TextEncoder !== "undefined" ? new TextEncoder().encode(texto) : (function () { var s = unescape(encodeURIComponent(texto)), b = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; })();
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var len = bytes.length, total = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(total);
    m.set(bytes); m[len] = 0x80;
    var bits = len * 8; for (var i = 0; i < 8; i++) m[total - 1 - i] = (i < 4 ? (bits >>> (8 * i)) : Math.floor(bits / 4294967296) >>> (8 * (i - 4))) & 0xff;
    var W = new Array(64), rot = function (x, n) { return (x >>> n) | (x << (32 - n)); };
    for (var o = 0; o < total; o += 64) {
      for (var t = 0; t < 16; t++) W[t] = (m[o + 4 * t] << 24) | (m[o + 4 * t + 1] << 16) | (m[o + 4 * t + 2] << 8) | m[o + 4 * t + 3];
      for (t = 16; t < 64; t++) { var s0 = rot(W[t - 15], 7) ^ rot(W[t - 15], 18) ^ (W[t - 15] >>> 3), s1 = rot(W[t - 2], 17) ^ rot(W[t - 2], 19) ^ (W[t - 2] >>> 10); W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0; }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[t] + W[t]) | 0;
        var S0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22), maj = (a & b) ^ (a & c) ^ (b & c), t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }
  function canon(o) {
    if (Array.isArray(o)) return o.map(canon);
    if (o && typeof o === "object") { var r = {}; Object.keys(o).sort().forEach(function (k) { if (o[k] !== undefined && typeof o[k] !== "function") r[k] = canon(o[k]); }); return r; }
    return o;
  }
  var FORA_DO_HASH = ["id", "package_id", "edition_id", "nutritionist_id", "created_at", "updated_at", "created_by"];
  function limpo(x) { var c = {}; Object.keys(x || {}).forEach(function (k) { if (FORA_DO_HASH.indexOf(k) < 0 && k.charAt(0) !== "_") c[k] = x[k]; }); return c; }
  function ordenar(lista, chave) { return (lista || []).map(limpo).sort(function (a, b) { var x = chave(a), y = chave(b); return x < y ? -1 : x > y ? 1 : 0; }); }
  /** Hash SHA-256 do CONTEUDO metodologico (sem ids, datas, status do pacote nem registros), em ordem canonica. */
  function hashConteudo(p) {
    var conteudo = {
      code: p.code, version: p.version,
      edicao: limpo(p.edicao),
      escalas: ordenar(p.escalas, function (e) { return e.code; }),
      sistemas: ordenar(p.sistemas, function (s) { return s.code; }),
      perguntas: ordenar(p.perguntas, function (q) { return q.stable_id; }),
      associacoes: ordenar(p.associacoes, function (a) { return a.question_stable_id + "|" + a.destination_type + "|" + a.destination_id + "|" + (a.role || ""); }),
      faixas: ordenar(p.faixas, function (f) { return f.destination_type + "|" + f.destination_id + "|" + ("000000" + Math.round((f.lower_bound || 0) * 1e6)).slice(-12); }),
      regras: ordenar(p.regras, function (r) { return r.rule_type + "|" + r.target; })
    };
    return sha256(JSON.stringify(canon(conteudo)));
  }

  /* ---------- NOVA VERSAO CANDIDATA: decisoes V1 fechadas sobre o importado --
     Nao edita o pacote importado: copia, aplica as decisoes e devolve a v2,
     com linhagem (code/version/status/hash do pacote anterior) e hash novo.
     Toda divergencia entre as decisoes e o inventario e ERRO (nada e ajustado
     em silencio). Status do pacote: em_revisao (gate tecnico pendente);
     elementos: aprovado (decisoes fechadas). Nenhum registro de homologacao e criado: a homologacao do pacote exige a Aprovacao de Daniel (aprovador unico da V1). */
  function aplicarDecisoesV1(base, D) {
    if (!base || !base.perguntas || !D) throw new Error("pacote base e decisoes sao obrigatorios");
    var falhas = [];
    var ids = base.perguntas.map(function (q) { return q.stable_id; });
    var porBloco = {}; base.perguntas.forEach(function (q) { porBloco[q.block] = (porBloco[q.block] || 0) + 1; });
    if (ids.length !== D.edicao.total) falhas.push("edicao com " + ids.length + " perguntas (esperado " + D.edicao.total + ")");
    Object.keys(D.edicao.por_bloco).forEach(function (b) { if (porBloco[b] !== D.edicao.por_bloco[b]) falhas.push("bloco " + b + ": " + porBloco[b] + " (esperado " + D.edicao.por_bloco[b] + ")"); });
    D.nao_recriar.concat(D.fora_da_v1).forEach(function (id) { if (ids.indexOf(id) >= 0) falhas.push(id + " nao pode estar na edicao V1"); });
    ids.forEach(function (id) { if (!D.contexto_temporal[id]) falhas.push(id + " sem contexto temporal decidido"); });
    Object.keys(D.contexto_temporal).forEach(function (id) { if (ids.indexOf(id) < 0) falhas.push("contexto temporal para ID fora da edicao: " + id); if (D.contextos_temporais_permitidos.indexOf(D.contexto_temporal[id]) < 0) falhas.push(id + ": contexto nao permitido"); });
    var cont = {}; base.perguntas.forEach(function (q) { if (!D.escalas[q.scale_code]) falhas.push(q.stable_id + ": escala desconhecida " + q.scale_code); cont[q.scale_code] = (cont[q.scale_code] || 0) + 1; });
    Object.keys(D.contagem_escalas).forEach(function (e) { if (cont[e] !== D.contagem_escalas[e]) falhas.push("escala " + e + ": " + cont[e] + " itens (esperado " + D.contagem_escalas[e] + ")"); });
    base.perguntas.forEach(function (q) { var dec = D.invertidas.indexOf(q.stable_id) >= 0 ? "invertida" : "direta"; if (q.orientation !== dec) falhas.push(q.stable_id + ": orientacao recuperada " + q.orientation + " difere da decidida " + dec); });
    if (falhas.length) throw new Error("decisoes V1 nao batem com o pacote base: " + falhas.join("; "));

    var A = "aprovado", hashBase = hashConteudo(base);
    var fonte = function (n) { return "Etapa 4.2 — " + n + " (decisao metodologica V1 fechada)"; };
    var p = novo(base.code, base.version + 1, {
      status: "em_revisao",
      origin: "nova versao candidata: decisoes metodologicas V1 fechadas aplicadas sobre " + base.code + "@" + base.version,
      justification: "DECISOES METODOLOGICAS V1 FECHADAS (" + D.id + ", " + D.decidido_em + ")",
      notes: "CANDIDATO APROVADO METODOLOGICAMENTE — " + D.status_tecnico + ". Status em_revisao ate o gate tecnico; aprovacao formal so pela RPC aprovar_pacote_metodologico.",
      lineage: { parent_code: base.code, parent_version: base.version, parent_status: base.status, parent_content_hash: hashBase, decisoes: D.id, decididas_em: D.decidido_em }
    });
    p.edicao = { code: D.edicao.code, version: D.edicao.version, status: "aprovada", item_count: ids.length,
      notes: "Edicao V1: " + ids.length + " perguntas (" + D.edicao.por_bloco.fisico + "/" + D.edicao.por_bloco.mental_emocional + "/" + D.edicao.por_bloco.espiritual + "); fora da V1: " + D.fora_da_v1.join(", ") + "; nao recriadas: " + D.nao_recriar.join(", ") };
    p.escalas = base.escalas.map(function (e) { var d = D.escalas[e.code]; return { code: e.code, min_value: d.min_value, max_value: d.max_value, labels: d.labels.slice(), kind: e.kind || e.code, status: A, source: fonte("Decisão 2"), notes: "0–3; " + D.contagem_escalas[e.code] + " itens" }; });
    p.sistemas = base.sistemas.map(function (s) {
      var d = D.sistemas[s.code]; if (!d) throw new Error("sistema sem decisao de nome/texto: " + s.code);
      return { code: s.code, name: d.nome, public_text: d.texto, definition: null, emotional_pattern: null, spiritual_impact: null, color: s.color, position: s.position, status: A, source: fonte("Decisão 13"),
        notes: "texto oficial seguro; legado recuperado so em legacy (nao exibido)",
        legacy: { nome_recuperado: s.name, definicao: s.definition, padrao_emocional: s.emotional_pattern, impacto_espiritual: s.spiritual_impact, fonte: s.source, pacote: base.code + "@" + base.version } };
    });
    p.perguntas = base.perguntas.map(function (q) {
      var r = D.primario_definido[q.stable_id];
      return { stable_id: q.stable_id, statement: q.statement, block: q.block, scale_code: q.scale_code, response_labels: D.escalas[q.scale_code].labels.slice(),
        orientation: D.invertidas.indexOf(q.stable_id) >= 0 ? "invertida" : "direta", temporal_context: D.contexto_temporal[q.stable_id], status: A, source: q.source,
        notes: r ? "vinculo resolvido pela " + r.decisao + " (linha historica " + r.historico + " fica so como contexto)" : null, version: 1, position: q.position };
    });
    p.associacoes = [];
    base.associacoes.forEach(function (a) {
      var q = base.perguntas.filter(function (x) { return x.stable_id === a.question_stable_id; })[0];
      var leg = { legacy_recovered_weight: a.weight, legacy_role: a.role, legacy_source: a.source, legacy_conflict_note: a.conflict_note || null, pacote: base.code + "@" + base.version };
      if (a.destination_type === "triad") {
        var eixo = D.triade.eixo_por_bloco[q.block];
        if (eixo !== a.destination_id) throw new Error("Triada de " + q.stable_id + " recuperada em " + a.destination_id + ", bloco exige " + eixo);
        p.associacoes.push({ question_stable_id: a.question_stable_id, destination_type: "triad", destination_id: eixo, weight: D.peso_triade, role: D.papel_triade, status: A, source: fonte("Decisão 11"), conflict: false, conflict_note: null, legacy: leg });
        return;
      }
      var r = D.primario_definido[a.question_stable_id];
      var primaria = r ? a.destination_id === r.sistema : a.role === "primaria";
      if (r && !primaria && a.destination_id !== r.contextual) throw new Error(a.question_stable_id + ": linha " + a.destination_id + " nao prevista na decisao");
      if (r) { leg.historic_id = primaria ? null : r.historico; leg.conflito_resolvido_por = r.decisao; }
      p.associacoes.push({ question_stable_id: a.question_stable_id, destination_type: "system", destination_id: a.destination_id,
        weight: primaria ? D.peso_primario : null, role: primaria ? D.papel_primario : D.papel_secundario, status: A,
        source: fonte(r ? r.decisao : primaria ? "Decisão 7" : "Decisão 4"), conflict: false,
        conflict_note: r ? "conflito resolvido pela " + r.decisao + (primaria ? "" : " — contexto, sem contribuicao numerica (linha historica " + r.historico + ")") : null, legacy: leg });
    });
    var faixasBase = base.faixas || [];
    p.faixas = [];
    base.sistemas.forEach(function (s) {
      var antigas = faixasBase.filter(function (f) { return f.destination_type === "system" && f.destination_id === s.code; }).sort(function (x, y) { return x.lower_bound - y.lower_bound; });
      D.faixas.forEach(function (f, i) {
        var velha = antigas[i] || null;
        p.faixas.push({ destination_type: "system", destination_id: s.code, lower_bound: valorExato(f.lower), upper_bound: valorExato(f.upper), lower_bound_exact: f.lower, upper_bound_exact: f.upper,
          lower_inclusive: f.lower_inclusive, upper_inclusive: f.upper_inclusive, label: f.label, message_nutri: D.mensagem_faixa(f.nome), message_paciente: D.mensagem_paciente(f.nome), status: A, source: fonte("Decisão 9"),
          legacy: velha ? { rotulo: velha.label, intervalo: (velha.lower_inclusive ? "[" : "(") + velha.lower_bound + ", " + velha.upper_bound + (velha.upper_inclusive ? "]" : ")"), mensagem_nutri: velha.message_nutri, mensagem_paciente: velha.message_paciente, fonte: velha.source, pacote: base.code + "@" + base.version } : null });
      });
    });
    var R = function (tipo, alvo, payload, n) { return { rule_type: tipo, target: alvo, payload: payload, status: A, source: fonte(n) }; };
    p.regras = [];
    base.sistemas.forEach(function (s) { p.regras.push(R("scoring", s.code, { formula: "nota = 10 − 10 × Σ(peso × z) / Σ(peso × 3), so itens PRIMARIOS respondidos", itens: "primarios", peso: D.peso_primario, contribuicao_secundaria: false, precisao: "racional_exata", casas_exibicao: D.casas_exibicao }, "Decisões 7 e 8")); });
    p.regras.push(R("absence", "global", JSON.parse(JSON.stringify(D.ausencia)), "Decisão 8"));
    p.regras.push(R("coverage", "global", { global: "respostas numericas validas / " + ids.length, global_informativa: true, por_sistema: "respostas numericas validas dos itens primarios / itens primarios do sistema", decide_avaliabilidade: true, cobertura_minima: D.ausencia.cobertura_minima, mostrar_cobertura_abaixo_de: 1 }, "Decisão 8"));
    p.regras.push(R("index", "global", JSON.parse(JSON.stringify(D.indice)), "Decisão 10"));
    ["fisico", "mental", "espiritual"].forEach(function (e) {
      p.regras.push(R("triad", e, { contribuicao: "por_id", escala: "0..10", elegibilidade: "cobertura_minima", cobertura_minima: D.triade.cobertura_minima, agregacao: "normalizada_respondidos", eixo_por_bloco: D.triade.eixo_por_bloco, itens: D.triade.contagem[e], peso: D.peso_triade, nota_global: false, faixas: false, interpretacao_automatica: false, casas_exibicao: D.casas_exibicao }, "Decisão 11"));
    });
    p.regras.push(R("comparability", "global", JSON.parse(JSON.stringify(D.comparabilidade)), "Decisão 12"));
    p.regras.push(R("suggestion", "global", JSON.parse(JSON.stringify(D.sugestoes)), "Decisão 15"));
    D.referencias.forEach(function (ref) {
      var resp = {}; p.perguntas.forEach(function (q) { resp[q.stable_id] = q.orientation === "invertida" ? ref.invertida : ref.direta; });
      var sist = {}, tri = {}; p.sistemas.forEach(function (s) { sist[s.code] = ref.esperado.sistemas; }); ["fisico", "mental", "espiritual"].forEach(function (e) { tri[e] = ref.esperado.triade; });
      var sx = {}, tx = {}; p.sistemas.forEach(function (s) { sx[s.code] = ref.exibicao.sistemas; }); ["fisico", "mental", "espiritual"].forEach(function (e) { tx[e] = ref.exibicao.triade; });
      p.regras.push(R("example", ref.id, { formato: "v1", descricao: ref.descricao, entrada: { responses: resp },
        esperado: { sistemas: sist, indice: ref.esperado.indice, triade: tri, cobertura: ref.esperado.cobertura },
        exibicao: { sistemas: sx, indice: ref.exibicao.indice, triade: tx } }, "Decisão 14"));
    });
    // Nenhum registro de homologacao nasce aqui: aprovar e ato humano (Aprovacao de Daniel, aprovador unico; depois Homologar).
    p.registros = [];
    p.content_hash = hashConteudo(p);
    return p;
  }

  /* ---------- exportacao para revisao humana (so metodologia) --------------- */
  function exportarJSON(p) { return JSON.stringify(semPaciente(p), null, 2); }
  function semPaciente(p) { return p; }   // o pacote nao tem dado de paciente por construcao; a funcao existe para o teste provar isso
  function csvEsc(v) { var s = vazio(v) ? "" : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportarCSV(p) {
    var linhas = [["tipo", "id", "campo1", "campo2", "valor", "status", "fonte", "conflito", "observacao"]];
    (p.sistemas || []).forEach(function (s) { linhas.push(["sistema", s.code, s.name, "", s.definition, s.status, s.source, "", s.notes]); });
    (p.escalas || []).forEach(function (e) { linhas.push(["escala", e.code, e.min_value, e.max_value, (e.labels || []).join(" / "), e.status, e.source, "", e.notes]); });
    (p.perguntas || []).forEach(function (q) { linhas.push(["pergunta", q.stable_id, q.block, q.scale_code || "AUSENTE", q.statement, q.status, q.source, "", (q.orientation || "ORIENTACAO AUSENTE") + (q.notes ? " · " + q.notes : "")]); });
    (p.associacoes || []).forEach(function (a) { linhas.push(["associacao", a.question_stable_id, a.destination_type, a.destination_id, a.weight, a.status, a.source, a.conflict ? "sim" : "", (a.role || "") + (a.conflict_note ? " · " + a.conflict_note : "")]); });
    (p.faixas || []).forEach(function (f) { linhas.push(["faixa", f.destination_id, f.label, (f.lower_inclusive ? "[" : "(") + f.lower_bound + ", " + f.upper_bound + (f.upper_inclusive ? "]" : ")"), f.message_nutri, f.status, f.source, "", ""]); });
    (p.regras || []).forEach(function (r) { linhas.push(["regra", r.rule_type, r.target, "", JSON.stringify(r.payload), r.status, r.source, "", r.notes]); });
    return linhas.map(function (l) { return l.map(csvEsc).join(","); }).join("\n") + "\n";
  }

  /* ---------- resumo para a tela de homologacao --------------------------- */
  function resumo(p) {
    var v = validar(p);
    var porCodigo = {};
    v.erros.forEach(function (e) { porCodigo[e.codigo] = (porCodigo[e.codigo] || 0) + 1; });
    return { code: p.code, version: p.version, status: p.status, vigente: vigente(p), perguntas: (p.perguntas || []).length, associacoes: (p.associacoes || []).length,
      conflitos: (p.associacoes || []).filter(function (a) { return a.conflict; }).length,
      primarias: (p.associacoes || []).filter(function (a) { return a.destination_type === "system" && a.role === "primaria"; }).length,
      contextuais: (p.associacoes || []).filter(function (a) { return a.destination_type === "system" && a.role === "secondary_contextual"; }).length,
      triade: (p.associacoes || []).filter(function (a) { return a.destination_type === "triad"; }).length, faixas: (p.faixas || []).length, regras: (p.regras || []).length,
      publicavel: v.publicavel, erros: v.total_erros, erros_por_codigo: porCodigo, registros: (p.registros || []).length };
  }

  /* ---------- persistencia (Supabase, via DadosRouter) ---------------------- */
  function temSupa() { return !!(raiz.supabaseClient && raiz.HoloAuth && raiz.HoloAuth.sessaoAtiva()); }
  function tabela(nome) { return raiz.DadosRouter ? raiz.DadosRouter.from(nome) : null; }
  var cache = [];
  /** Carrega todos os pacotes visiveis (os proprios + aprovados/retirados de terceiros), com filhas. */
  function carregar() {
    if (!temSupa()) { cache = []; return Promise.resolve(cache); }
    var t = tabela("pacotes_metodologicos"); if (!t) return Promise.resolve(cache);
    return Promise.resolve(t.select("*").order("created_at", { ascending: true })).then(function (r) {
      if (!r || r.error || !Array.isArray(r.data)) return cache;
      var pacotes = r.data.map(function (row) { return Object.assign(novo(row.code, row.version), row); });
      var nomes = [["metodologia_edicoes", "edicoes"], ["metodologia_escalas", "escalas"], ["metodologia_sistemas", "sistemas"], ["metodologia_perguntas", "perguntas"], ["metodologia_associacoes", "associacoes"], ["metodologia_faixas", "faixas"], ["metodologia_regras", "regras"], ["metodologia_registros", "registros"], ["metodologia_aprovacoes", "aprovacoes"]];
      return Promise.all(nomes.map(function (n) { var tt = tabela(n[0]); return tt ? Promise.resolve(tt.select("*")) : Promise.resolve({ data: [] }); })).then(function (rs) {
        rs.forEach(function (res, i) {
          var chave = nomes[i][1]; var linhas = (res && !res.error && Array.isArray(res.data)) ? res.data : [];
          pacotes.forEach(function (p) {
            var minhas = linhas.filter(function (l) { return l.package_id === p.id; });
            if (chave === "edicoes") p.edicao = minhas[0] || p.edicao; else p[chave] = minhas;
          });
        });
        cache = pacotes; return cache;
      });
    }).catch(function (e) { console.error("[pacote] carregar:", e); return cache; });
  }
  function todos() { return cache.slice(); }
  function porId(id) { return cache.filter(function (p) { return p.id === id; })[0] || null; }
  /** O pacote APROVADO e VIGENTE, se houver. Rascunho e em_revisao nunca contam. */
  function ativo(dia) { return cache.filter(function (p) { return vigente(p, dia); }).sort(function (a, b) { return String(b.effective_from).localeCompare(String(a.effective_from)); })[0] || null; }

  /** Grava um pacote novo (rascunho, ou em_revisao para o candidato V1) no
      servidor: pacote + filhas. Nunca grava status aprovado nem aprovacao. */
  function salvarRascunho(p) {
    if (!temSupa()) return Promise.reject(new Error("Sem sessao: o pacote fica so na tela."));
    if (p.status === "aprovado" || p.status === "retirado") return Promise.reject(new Error("aprovacao nao e gravacao: use a RPC com registro de homologacao"));
    var t = tabela("pacotes_metodologicos");
    var cab = { code: p.code, version: p.version, status: p.status || "rascunho", origin: p.origin, justification: p.justification, notes: p.notes };
    if (p.lineage) { cab.lineage = p.lineage; cab.content_hash = p.content_hash || null; }
    return Promise.resolve(t.insert(cab).select()).then(function (r) {
      if (r.error) throw r.error;
      var id = r.data[0].id;
      var ins = function (nome, linhas) { if (!linhas.length) return Promise.resolve(); return Promise.resolve(tabela(nome).insert(linhas.map(function (l) { return Object.assign({}, l, { package_id: id }); }))).then(function (x) { if (x.error) throw x.error; }); };
      return Promise.resolve(tabela("metodologia_edicoes").insert(Object.assign({}, p.edicao, { package_id: id })).select()).then(function (e) {
        if (e.error) throw e.error;
        var eid = e.data[0].id;
        return ins("metodologia_escalas", p.escalas).then(function () { return ins("metodologia_sistemas", p.sistemas); })
          .then(function () { return ins("metodologia_perguntas", p.perguntas.map(function (q) { return Object.assign({}, q, { edition_id: eid }); })); })
          .then(function () { return ins("metodologia_associacoes", p.associacoes); })
          .then(function () { return ins("metodologia_faixas", p.faixas); })
          .then(function () { return ins("metodologia_regras", p.regras); })
          .then(function () { return ins("metodologia_registros", p.registros || []); })
          .then(function () { return carregar(); }).then(function () { return id; });
      });
    });
  }
  /* ---------- aprovador unico (migration 20261003100000) ---------------------
     A V1 tem UM aprovador/homologador: Daniel (responsavel metodologico). A
     Aprovacao e um ATO HUMANO: a pessoa confere o hash calculado no servidor e
     registra. Homologar (status aprovado) e outro ato explicito, do dono do pacote
     que tambem e o aprovador ativo, sobre o mesmo package_id, version e
     content_hash. Nao ha segunda revisao (decisao consciente; ver
     docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md). */
  var REGIME = "aprovador_unico";
  var APROVADORES = { 1: { responsavel: "Daniel", papel: "aprovador único — responsável metodológico" } };
  /** Estado do ciclo, a partir das aprovacoes gravadas e do hash atual do servidor. Puro. */
  function estadoAprovacao(p, hashAtual) {
    var vig = (p.aprovacoes || []).filter(function (a) { return !a.invalidated_at; });
    var a1 = vig.filter(function (a) { return a.step === 1; })[0] || null;
    var ok1 = !!a1 && a1.package_version === p.version && (!hashAtual || a1.content_hash === hashAtual);
    return { regime: REGIME, aprovacao1: a1, valida1: ok1, invalidadas: (p.aprovacoes || []).filter(function (a) { return !!a.invalidated_at; }).length,
      proxima: p.status !== "em_revisao" ? null : !ok1 ? 1 : "homologar", homologavel: p.status === "em_revisao" && ok1 };
  }
  function rpc(nome, args) {
    if (!temSupa()) return Promise.reject(new Error("sem sessao"));
    return Promise.resolve(raiz.supabaseClient.rpc(nome, args)).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function hashNoServidor(id) { return rpc("metodologia_hash_conteudo", { p_package_id: id }); }
  /** Registra a Aprovacao (etapa 1 — unica) digitada pela pessoa, sobre o hash que ela conferiu. */
  function registrarAprovacao(id, etapa, responsavel, justificativa, hashConferido) {
    return rpc("registrar_aprovacao_metodologica", { p_package_id: id, p_etapa: etapa, p_responsavel: responsavel, p_justificativa: justificativa, p_content_hash: hashConferido }).then(function (d) { return carregar().then(function () { return d; }); });
  }
  /** Passa a aprovado — o servidor recusa sem a Aprovacao (Daniel) valida sobre o conteudo atual. */
  function homologar(id, effectiveFrom) {
    return rpc("aprovar_pacote_metodologico", { p_package_id: id, p_registro: effectiveFrom ? { effective_from: effectiveFrom } : {} }).then(function (d) { return carregar().then(function () { return d; }); });
  }
  function validarNoServidor(id) {
    if (!temSupa()) return Promise.reject(new Error("sem sessao"));
    return Promise.resolve(raiz.supabaseClient.rpc("validar_pacote_metodologico", { p_package_id: id })).then(function (r) { if (r.error) throw r.error; return r.data; });
  }

  raiz.PacoteMetodologico = {
    STATUS_PACOTE: STATUS_PACOTE, STATUS_ELEMENTO: STATUS_ELEMENTO, EIXOS: EIXOS, TEST_FIXTURE: TEST_FIXTURE,
    CONTEXTOS_TEMPORAIS: CONTEXTOS_TEMPORAIS, EIXO_DO_BLOCO: EIXO_DO_BLOCO, TERMOS_CAUSAIS: TERMOS_CAUSAIS,
    novo: novo, vigente: vigente, validar: validar, importarInventario: importarInventario,
    aplicarDecisoesV1: aplicarDecisoesV1, hashConteudo: hashConteudo, sha256: sha256, valorExato: valorExato, termoCausal: termoCausal,
    exportarJSON: exportarJSON, exportarCSV: exportarCSV, resumo: resumo,
    carregar: carregar, todos: todos, porId: porId, ativo: ativo, salvarRascunho: salvarRascunho, validarNoServidor: validarNoServidor,
    REGIME_GOVERNANCA: REGIME, APROVADORES: APROVADORES, estadoAprovacao: estadoAprovacao, hashNoServidor: hashNoServidor, registrarAprovacao: registrarAprovacao, homologar: homologar,
    esquecer: function () { cache = []; }
  };
})();
