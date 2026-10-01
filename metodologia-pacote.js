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

  function vazio(v) { return v === null || v === undefined || v === ""; }
  function num(v) { return typeof v === "number" && isFinite(v); }
  function hoje() { return new Date().toISOString().slice(0, 10); }

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
      if (!assoc.some(function (a) { return a.question_stable_id === q.stable_id && a.destination_type === "system"; })) erro("associacao_orfa", q.stable_id, "pergunta sem associacao a sistema");
    });
    Object.keys(ids).forEach(function (id) { if (ids[id] > 1) erro("id_duplicado", id, "stable_id em " + ids[id] + " linhas do pacote"); });
    assoc.forEach(function (a) {
      var onde = a.question_stable_id + "→" + a.destination_id;
      if (!ids[a.question_stable_id]) erro("referencia_inexistente", a.question_stable_id, "associacao aponta para pergunta que nao existe no pacote");
      if (a.destination_type === "system" && sist.indexOf(a.destination_id) < 0) erro("referencia_inexistente", onde, "sistema de destino nao existe no pacote");
      if (a.destination_type === "triad" && EIXOS.indexOf(a.destination_id) < 0) erro("referencia_inexistente", onde, "eixo da Triada desconhecido");
      if (a.destination_type !== "system" && a.destination_type !== "triad") erro("referencia_inexistente", onde, "destination_type desconhecido");
      if (!num(a.weight)) erro("peso_ausente", onde, "peso obrigatorio ausente");
      if (a.conflict) erro("conflito_pendente", onde, a.conflict_note || "associacao em conflito nao resolvido");
    });
    if (assoc.some(function (a) { return a.conflict && (a.question_stable_id === "SNT-101" || a.question_stable_id === "SNT-501"); })) erro("snt_pendente", "SNT-101/SNT-501", "vinculos de SNT-101/SNT-501 pendentes de homologacao");
    // faixas por destino
    var destinos = {};
    faixas.forEach(function (f) { var k = f.destination_type + ":" + f.destination_id; (destinos[k] = destinos[k] || []).push(f); });
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
    }
    EIXOS.forEach(function (eixo) {
      var t = regra("triad", eixo);
      if (!t || !t.payload || ["contribuicao", "escala", "elegibilidade", "agregacao"].some(function (k) { return !(k in t.payload); })) erro("triada_incompleta", "triad/" + eixo, "configuracao do eixo incompleta (contribuicao, escala, elegibilidade, agregacao)");
    });
    sist.forEach(function (code) { var sc = regra("scoring", code); if (!sc || !sc.payload || !("formula" in sc.payload)) erro("regra_incompleta", "scoring/" + code, "sistema sem regra de pontuacao"); });
    if (!regras.some(function (r) { return r.rule_type === "example" && r.payload && r.payload.entrada && r.payload.esperado !== null && r.payload.esperado !== undefined; })) erro("exemplo_sem_resultado", "example", "nenhum exemplo deterministico com resultado esperado");
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
      conflitos: (p.associacoes || []).filter(function (a) { return a.conflict; }).length, faixas: (p.faixas || []).length, regras: (p.regras || []).length,
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
      var nomes = [["metodologia_edicoes", "edicoes"], ["metodologia_escalas", "escalas"], ["metodologia_sistemas", "sistemas"], ["metodologia_perguntas", "perguntas"], ["metodologia_associacoes", "associacoes"], ["metodologia_faixas", "faixas"], ["metodologia_regras", "regras"], ["metodologia_registros", "registros"]];
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

  /** Grava um pacote RASCUNHO novo no servidor (pacote + filhas). Nunca grava status aprovado. */
  function salvarRascunho(p) {
    if (!temSupa()) return Promise.reject(new Error("Sem sessao: o pacote fica so na tela."));
    if (p.status === "aprovado" || p.status === "retirado") return Promise.reject(new Error("aprovacao nao e gravacao: use a RPC com registro de homologacao"));
    var t = tabela("pacotes_metodologicos");
    return Promise.resolve(t.insert({ code: p.code, version: p.version, status: p.status || "rascunho", origin: p.origin, justification: p.justification, notes: p.notes }).select()).then(function (r) {
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
          .then(function () { return carregar(); }).then(function () { return id; });
      });
    });
  }
  function validarNoServidor(id) {
    if (!temSupa()) return Promise.reject(new Error("sem sessao"));
    return Promise.resolve(raiz.supabaseClient.rpc("validar_pacote_metodologico", { p_package_id: id })).then(function (r) { if (r.error) throw r.error; return r.data; });
  }

  raiz.PacoteMetodologico = {
    STATUS_PACOTE: STATUS_PACOTE, STATUS_ELEMENTO: STATUS_ELEMENTO, EIXOS: EIXOS, TEST_FIXTURE: TEST_FIXTURE,
    novo: novo, vigente: vigente, validar: validar, importarInventario: importarInventario,
    exportarJSON: exportarJSON, exportarCSV: exportarCSV, resumo: resumo,
    carregar: carregar, todos: todos, porId: porId, ativo: ativo, salvarRascunho: salvarRascunho, validarNoServidor: validarNoServidor,
    esquecer: function () { cache = []; }
  };
})();
