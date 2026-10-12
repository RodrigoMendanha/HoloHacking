/* ===========================================================================
   HOLOSCAN OFICIAL — o unico caminho do questionario ate a aplicacao V1
   (correcao P0 pos-deploy da Etapa 6.4)
   ===========================================================================

   Antes: "Gerar o mapa" chamava o motor LEGADO (holoscan.js, pesos 1..3 do
   CSV, vinculos secundarios pontuando, Indice renormalizado) e "Salvar"
   carimbava o resultado com o pacote HOLOS-V1@2. Resultado legado + carimbo
   V1@2: proibido.

   Agora: a tela e o dado salvo saem do MESMO objeto, calculado aqui pelo
   MotorMetodologico em modo OFICIAL sobre o pacote aprovado e vigente
   (Metodologia.obterPacoteAtivo). Este arquivo NAO faz conta: so monta a
   entrada do motor e traduz a saida para o formato que a tela ja desenha.

   - Sem pacote aprovado/vigente/publicavel: ErroSemPacote. Sem fallback
     para o legado, sem calculo "provisorio".
   - Exames, ferramentas e Panorama NAO entram: o motor oficial nao os recebe.
   - Combinacoes (CMB), aprofundamentos, frequencias e territorios nao fazem
     parte do HOLOS-V1@2: saem vazios.
   - Vinculos secondary_contextual so aparecem como contexto (o motor nao os
     soma, nao os conta no total do sistema, nem no Indice ou na Triada).
   - Indice nao avaliavel = null (sem Indice parcial). nota_media = Indice/10
     (a mesma grandeza, na escala 0..10), null quando o Indice e null.
   - As respostas usadas no calculo vao junto (snapshot): o que se salva e
     exatamente o que se calculou.
   =========================================================================== */
(function () {
  "use strict";
  var raiz = typeof window !== "undefined" ? window : globalThis;

  var MSG_SEM_PACOTE = "Não foi possível carregar o pacote metodológico oficial vigente. " +
    "O mapa não pode ser gerado nem salvo.";
  var ORDEM = ["fungico", "acido_inflamatorio", "metabolico", "detox_linfatico", "mental_emocional_espiritual"];
  var EIXOS = ["fisico", "mental", "espiritual"];
  var MODO = "oficial";

  function ErroSemPacote(motivos) {
    this.name = "ErroSemPacote"; this.codigo = "sem_pacote_oficial";
    this.message = MSG_SEM_PACOTE; this.motivos = motivos || [];
  }
  ErroSemPacote.prototype = Object.create(Error.prototype);

  function hoje() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  /** O pacote aprovado, vigente e publicavel no dia, ou null. Fonte unica: a barreira Metodologia. */
  function pacote(dia) {
    var M = raiz.Metodologia;
    if (!M || !M.obterPacoteAtivo || !M.motivosBloqueio) return null;
    var p = M.obterPacoteAtivo(dia);
    if (!p || p.status !== "aprovado") return null;
    if (M.motivosBloqueio(dia).length) return null;
    return p;
  }
  function motivos(dia) {
    var M = raiz.Metodologia;
    if (!M || !M.motivosBloqueio) return ["barreira metodologica indisponivel"];
    return M.motivosBloqueio(dia);
  }
  function disponivel(dia) { return !!pacote(dia); }

  /** Recarrega os pacotes do servidor (botao "Tentar novamente"). */
  function recarregar() {
    var P = raiz.PacoteMetodologico;
    if (!P || !P.carregar) return Promise.resolve(false);
    return Promise.resolve(P.carregar()).then(function () { return disponivel(); }, function () { return false; });
  }

  /** Texto do item para exibicao (nao entra em conta nenhuma). Motor de resultados V1 (12/10, item 4.5): o texto
      APROVADO da pergunta no pacote — nunca o rotulo clinico curto do holoscan.js (ex.: "marcador inflamatorio alterado
      no exame"), que nao e texto aprovado. O rotulo legado so vale sem pacote (modo local/legado). */
  function rotuloItem(p, id) {
    var q = (p && p.perguntas || []).filter(function (x) { return x.stable_id === id; })[0];
    if (q && q.statement) return q.statement;
    try {
      if (!rotuloItem._mapa && raiz.HOLOSCAN && raiz.HOLOSCAN.questionario) {
        rotuloItem._mapa = {};
        raiz.HOLOSCAN.questionario().forEach(function (x) { rotuloItem._mapa[x.id] = x.rotulo; });
      }
    } catch (e) { rotuloItem._mapa = {}; }
    return (rotuloItem._mapa && rotuloItem._mapa[id]) || id;
  }

  /* ---------- as perguntas que a tela mostra (12/10) ----------------------
     Antes a tela lia as perguntas do holoscan.js (gerado dos CSVs do motor
     antigo) e o calculo usava o pacote: texto novo no pacote nao aparecia na
     tela, e pergunta removida do pacote continuava sendo perguntada. Agora a
     lista sai do pacote APROVADO e VIGENTE (texto, escala, bloco e ordem do
     pacote). Sem pacote (modo local sem servidor, homologacao do legado), a
     lista do holoscan.js continua valendo. No HOLOS-V1 v2 as duas listas sao
     identicas (mesma ordem, textos e escalas). */
  var ORIGEM_DO_BLOCO = { fisico: "sintoma", mental_emocional: "emocao", espiritual: "espiritual" };
  var cachePerguntas = { chave: null, lista: null };
  function perguntasLegado() {
    try { return raiz.HOLOSCAN && raiz.HOLOSCAN.questionario ? raiz.HOLOSCAN.questionario() : []; } catch (e) { return []; }
  }
  function perguntas(dia) {
    var M = raiz.Metodologia;
    var p = M && M.obterPacoteAtivo ? M.obterPacoteAtivo(dia) : null;
    if (!p || !p.perguntas || !p.perguntas.length) return perguntasLegado();
    var chave = (p.id || p.code + "@" + p.version) + "|" + (p.content_hash || "") + "|" + p.perguntas.length;
    if (cachePerguntas.chave === chave) return cachePerguntas.lista;
    var lista = p.perguntas.slice().sort(function (a, b) { return (a.position || 0) - (b.position || 0) || (a.stable_id < b.stable_id ? -1 : 1); })
      .map(function (q) {
        return { id: q.stable_id, origem: ORIGEM_DO_BLOCO[q.block] || q.block, pergunta: q.statement, escala: q.scale_code,
          rotulo: q.statement, sentido: q.orientation === "invertida" ? "invertido" : "direto",
          pacote: p.code + " v" + p.version };
      });
    cachePerguntas = { chave: chave, lista: lista };
    return lista;
  }

  /**
   * respostas: { stable_id: inteiro } — so as dadas.
   * contexto:  { patient_id?, applied_at? (AAAA-MM-DD) }
   * Devolve o resultado no formato da tela + proveniencia + snapshot das respostas.
   */
  function calcular(respostas, contexto) {
    contexto = contexto || {};
    var dia = contexto.applied_at || hoje();
    var p = pacote(dia);
    if (!p) throw new ErroSemPacote(motivos(dia));
    var MM = raiz.MotorMetodologico;
    if (!MM || !MM.calcular) throw new ErroSemPacote(["motor metodologico nao carregado"]);
    var resp = {};
    Object.keys(respostas || {}).forEach(function (id) { resp[id] = respostas[id]; });
    var v = MM.calcular({
      responses: resp, response_states: {}, methodology_package: p, mode: MODO, engine_version: MM.VERSAO,
      questionnaire_edition: p.edicao ? { code: p.edicao.code, version: p.edicao.version } : undefined,
      application_context: { applied_at: dia, patient_id: contexto.patient_id || null }
    });
    return paraTela(v, p, resp, dia);
  }

  /** Traducao 1:1 da saida do motor para o formato que a tela/payload usam. Nenhuma conta nova. */
  function paraTela(v, p, resp, dia) {
    var nomes = {};
    (p.sistemas || []).forEach(function (s) { nomes[s.code] = s.name || s.code; });
    var codigos = ORDEM.filter(function (c) { return v.system_results[c]; });
    Object.keys(v.system_results).forEach(function (c) { if (codigos.indexOf(c) < 0) codigos.push(c); });
    var sistemas = codigos.map(function (c) {
      var sr = v.system_results[c];
      var meus = v.item_contributions.filter(function (x) { return x.destination_type === "system" && x.destination === c; });
      var obtido = 0, maximo = 0;
      meus.forEach(function (x) { obtido += x.contribution; maximo += x.max; });
      var dominantes = meus.filter(function (x) { return x.contribution > 0; })
        .sort(function (a, b) { return b.contribution - a.contribution || a.question_id.localeCompare(b.question_id); })
        .slice(0, 5)
        .map(function (x) { return { marcador_id: x.question_id, rotulo: rotuloItem(p, x.question_id), pontos: x.contribution }; });
      return {
        sistema: c, nome: nomes[c] || c,
        nota: sr.avaliavel ? sr.nota : null, nota_exata: sr.avaliavel ? sr.nota_exata : null, nota_exibicao: sr.avaliavel ? sr.nota_exibicao : null,
        carga: sr.avaliavel ? sr.carga : null, faixa: sr.avaliavel ? sr.faixa : null,
        obtido: obtido, maximo: maximo, respondidos: sr.respondidos, total_marcadores: sr.total,
        avaliavel: !!sr.avaliavel, cobertura: sr.cobertura, motivo: sr.motivo || null, dominantes: dominantes
      };
    });
    var ix = v.index_result;
    var triada = {}, triadaComDado = {}, triadaExib = {};
    EIXOS.forEach(function (e) {
      var t = v.triad_result[e] || {};
      triada[e] = t.avaliavel ? t.nota : null;
      triadaComDado[e] = !!t.avaliavel;
      triadaExib[e] = t.avaliavel ? t.nota_exibicao : null;
    });
    var cob = v.coverage;
    var indice = ix.avaliavel ? ix.valor : null;
    return {
      oficial: true, calculation_mode: MODO,
      methodology_package_id: p.id || null, methodology_package_version: p.version,
      methodology_package_code: p.code, methodology_content_hash: v.package_content_hash,
      engine_version: v.engine_version, engine_contract_version: v.engine_contract_version,
      edition: v.edition, hash_entrada: v.trace.hash_entrada, applied_at: dia,
      versao_estrutura: 3, versao_bancos: null,
      indice: indice, indice_exibicao: ix.avaliavel ? ix.valor_exibicao : null, indice_motivo: ix.avaliavel ? null : ix.motivo,
      indice_maximo: 100,
      nota_media: indice === null ? null : indice / 10,
      avaliavel: sistemas.some(function (s) { return s.avaliavel; }),
      sistemas: sistemas,
      triada: triada, triada_com_dado: triadaComDado, triada_exibicao: triadaExib,
      cobertura: { respondidos: cob.respondidos, total: cob.total, fracao: cob.fracao, percentual: cob.percentual,
        percentual_exibicao: cob.percentual_exibicao, recusados: cob.recusados, nao_aplicaveis: cob.nao_aplicaveis, em_branco: cob.em_branco },
      contextuais: v.contextual_associations.map(function (a) { return { question_id: a.question_id, destination: a.destination }; }),
      combinacoes: [], aprofundamentos: [], frequencias: [], territorios: [],
      nao_avaliaveis: v.non_evaluable_reasons.slice(),
      respostas: resp
    };
  }

  /** O que vai para salvar_holoscan_completo: SO o resultado oficial, sem reler nada da tela. */
  function payload(r, extra) {
    if (!r || r.oficial !== true || r.calculation_mode !== MODO || !r.methodology_package_id) {
      throw new ErroSemPacote(["resultado sem proveniencia oficial: recalcule o mapa"]);
    }
    extra = extra || {};
    return {
      application: {
        patient_id: extra.patient_id, encounter_id: extra.encounter_id,
        methodology_package_id: r.methodology_package_id, methodology_package_version: r.methodology_package_version,
        methodology_content_hash: r.methodology_content_hash, engine_version: r.engine_version,
        engine_contract_version: r.engine_contract_version, calculation_mode: r.calculation_mode,
        quando: extra.quando, versao_estrutura: r.versao_estrutura, versao_bancos: null,
        indice: r.indice, indice_maximo: r.indice_maximo, avaliavel: r.avaliavel, nota_media: r.nota_media,
        triada: r.triada, triada_com_dado: r.triada_com_dado, cobertura: r.cobertura,
        combinacoes: [], aprofundamentos: [],
        interpretacao_texto: extra.interpretacao_texto || null, interpretacao_em: extra.interpretacao_em || null,
        interpretacao_versao: extra.interpretacao_versao || null
      },
      answers: Object.keys(r.respostas).sort().map(function (id) { return { marcador_id: id, valor: r.respostas[id] }; }),
      scores: r.sistemas.map(function (s) {
        return { sistema: s.sistema, nome: s.nome, nota: s.nota, carga: s.carga, faixa: s.faixa, obtido: s.obtido,
          maximo: s.maximo, respondidos: s.respondidos, total_marcadores: s.total_marcadores, avaliavel: s.avaliavel };
      })
    };
  }

  /** Classificacao de uma aplicacao (salva ou na tela) para selos e textos. */
  function natureza(app) {
    if (!app) return "nenhuma";
    if (app.oficial === true || app.methodology_package_id) return "oficial_v1";
    return "historica_sem_pacote";
  }

  raiz.HoloscanOficial = {
    MSG_SEM_PACOTE: MSG_SEM_PACOTE, ErroSemPacote: ErroSemPacote,
    pacote: pacote, disponivel: disponivel, motivos: motivos, recarregar: recarregar,
    calcular: calcular, paraTela: paraTela, payload: payload, natureza: natureza, perguntas: perguntas
  };
})();
