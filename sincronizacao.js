/* ===========================================================================
   SINCRONIZACAO — o servidor e a fonte; o navegador e copia
   ===========================================================================

   Com sessao Supabase ativa, HOLOSCAN e exames sao GRAVADOS no servidor
   (RPCs salvar_holoscan_completo e salvar_coleta_exames), mas as telas leem
   caixas do localStorage (holohacking.pontuacao, holohacking.questionario,
   holohacking.exames). Este arquivo e a ponte de volta: le o servidor e
   REESCREVE essas caixas a partir dele. Sem isto, abrir o app num segundo
   computador mostrava um paciente sem HOLOSCAN e sem exame.

   REGRAS (Release 01)
     1. Servidor vence. Uma entrada local que ja tem identidade remota
        (_supa_id / coleta) e substituida pela versao do servidor — ou some,
        se o servidor nao a tem mais.
     2. Identidade e o ID remoto, nunca a data. Duas aplicacoes do HOLOSCAN
        no mesmo dia sao dois registros.
     3. Erro nao e vazio. Se qualquer leitura falhar, NADA local e tocado e
        o estado fica "erro" — a tela diz que nao conseguiu ler, em vez de
        dizer "nenhum HOLOSCAN".
     4. O que so existe aqui nao se perde. Entrada local sem identidade
        remota (calculada e ainda nao salva, ou feita offline) continua, a
        menos que o servidor ja tenha a aplicacao daquele dia gravada depois
        dela. Rascunho de exame digitado e nao conferido fica. Resposta de
        questionario editada depois da ultima sincronizacao fica.
     5. Em lote. Uma leitura por tabela (fatiada por 100 ids e paginada de
        1000 em 1000), nunca uma por paciente, resposta ou exame.
     6. De quem e. Se a conta mudar no meio da leitura, o resultado e jogado
        fora: nada da conta A e escrito no navegador enquanto B esta logada.

   O QUE GUARDA
     holohacking.sincronizacao (localStorage, por conta — entra no stash do
     logout junto com as caixas clinicas). Nao e dado clinico: e o que o
     navegador sabe sobre a relacao entre as caixas e o servidor.
       questionario[pid] = { app, assinatura }   de qual aplicacao remota
                                                 vieram as respostas, e como
                                                 elas estavam naquela hora
       exames[pid]       = { estado, coleta, coletado_em }
                           estado: "sincronizado" | "rascunho" | "pendente"

     As COLETAS (historico estruturado de exames) ficam so em memoria: elas
     sao derivadas do servidor a cada carga, e sem sessao elas nao existem.
   =========================================================================== */

(function () {
  "use strict";

  var CHAVE_PONT = "holohacking.pontuacao";
  var CHAVE_Q = "holohacking.questionario";
  var CHAVE_APLICADAS = "holohacking.respostas_aplicadas";
  var CHAVE_EX = "holohacking.exames";
  var CHAVE_SYNC = "holohacking.sincronizacao";

  var LOTE_IDS = 100;     // ids por filtro .in() — a URL tem limite
  var PAGINA = 1000;      // max_rows padrao do PostgREST no Supabase

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  var ORDEM_SISTEMAS = ["fungico", "acido_inflamatorio", "metabolico",
                        "detox_linfatico", "mental_emocional_espiritual"];

  var COLS_APP = "id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos, indice, " +
    "indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura, " +
    "combinacoes, aprofundamentos, interpretacao_texto, interpretacao_em, " +
    "interpretacao_versao, created_at, methodology_package_id, methodology_package_version";
  var COLS_SCORE = "application_id, sistema, nome, nota, carga, faixa, obtido, " +
    "maximo, respondidos, total_marcadores, avaliavel";
  var COLS_ANSWER = "application_id, marcador_id, valor";
  /* V1, Etapa 5: as colunas novas das coletas/resultados (estado, revisao, valor
     original, variante, referencia do laudo). As colunas legado continuam. */
  var COLS_COLETA = "id, patient_id, encounter_id, coletado_em, data_coleta_desconhecida, " +
    "laboratorio, observacao, created_at, updated_at, clinical_time, state, source, revision, " +
    "supersedes_id, superseded_at, revision_note, document_id, reviewed_at, operation_id";
  var COLS_RESULT = "id, collection_id, exame_id, valor, unidade_no_momento, " +
    "ideal_min_no_momento, ideal_max_no_momento, nome_exame_no_momento, sistema_no_momento, " +
    "exam_code, custom_exam_id, variant, value_original_text, numeric_value, qualifier, censor_limit, " +
    "unit_original, method, material, report_reference_text, report_reference_min, report_reference_max, " +
    "report_reference_operator, report_reference_unit, reference_status, origin, notes, result_date, " +
    "legacy_exame_id, requires_manual_mapping, position";

  /* ---------- estado em memoria ------------------------------------------- */

  var estado = { holoscan: "ocioso", exames: "ocioso" };
  var coletasPorPaciente = {};     // pid -> [coleta], so com sessao
  var emCurso = Promise.resolve();
  var geracao = 0;                 // cada hidratar() invalida as anteriores

  /* ---------- utilitarios -------------------------------------------------- */

  function sb() { return window.supabaseClient || null; }

  function uidAtual() {
    try {
      var u = window.HoloAuth && window.HoloAuth.usuarioAtual && window.HoloAuth.usuarioAtual();
      return u && u.id ? u.id : null;
    } catch (e) { return null; }
  }

  function temSupa() {
    return !!(sb() && window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva());
  }

  function lerJSON(chave) {
    try {
      var v = JSON.parse(localStorage.getItem(chave));
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch (e) { return {}; }
  }

  function gravarJSON(chave, valor, revisao) {
    localStorage.setItem(chave, JSON.stringify(valor));
    if (window.Concorrencia && revisao) window.Concorrencia.avancarRevisao(revisao);
  }

  function lerSync() {
    var s = lerJSON(CHAVE_SYNC);
    if (!s.questionario || typeof s.questionario !== "object") s.questionario = {};
    if (!s.exames || typeof s.exames !== "object") s.exames = {};
    return s;
  }

  function gravarSync(s) {
    try { localStorage.setItem(CHAVE_SYNC, JSON.stringify(s)); } catch (e) { /* cota */ }
  }

  function vazio(obj) { return !obj || Object.keys(obj).length === 0; }

  /** Uma forma estavel de comparar dois conjuntos de respostas/valores. */
  function assinatura(obj) {
    if (!obj || typeof obj !== "object") return "";
    return Object.keys(obj).sort().map(function (k) {
      return k + "=" + String(obj[k]);
    }).join("|");
  }

  function fatiar(lista, n) {
    var out = [];
    for (var i = 0; i < lista.length; i += n) out.push(lista.slice(i, i + n));
    return out;
  }

  function hojeLocal() {
    if (window.hojeISO) return window.hojeISO();
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /** Le TODAS as linhas de `tabela` cujo `campo` esta em `ids`: fatiado por
      LOTE_IDS e paginado por PAGINA. Devolve { ok, linhas } ou { ok:false,
      erro } — nunca uma lista vazia no lugar de um erro. */
  function lerEmLote(tabela, colunas, campo, ids, ordens) {
    var linhas = [];
    var fatias = fatiar(ids, LOTE_IDS);

    function pagina(fatia, de) {
      var q = sb().from(tabela).select(colunas).in(campo, fatia);
      (ordens || []).forEach(function (o) { q = q.order(o, { ascending: true }); });
      return Promise.resolve(q.range(de, de + PAGINA - 1)).then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("resposta vazia de " + tabela);
        var dados = Array.isArray(r.data) ? r.data : [];
        linhas = linhas.concat(dados);
        if (dados.length >= PAGINA) return pagina(fatia, de + PAGINA);
        return null;
      });
    }

    var cadeia = Promise.resolve();
    fatias.forEach(function (f) { cadeia = cadeia.then(function () { return pagina(f, 0); }); });
    return cadeia
      .then(function () { return { ok: true, linhas: linhas }; })
      .catch(function (e) {
        console.error("[sincronizacao] " + tabela + ":", e && e.message ? e.message : e);
        return { ok: false, erro: e };
      });
  }

  function idsDePacientes(pacientes) {
    var vistos = {};
    return (pacientes || []).map(function (p) { return p && p.id; })
      .filter(function (id) {
        if (!id || !UUID_RE.test(id) || vistos[id]) return false;
        vistos[id] = true;
        return true;
      });
  }

  /* =========================================================== HOLOSCAN === */

  function ordemSistema(s) {
    var i = ORDEM_SISTEMAS.indexOf(s);
    return i < 0 ? ORDEM_SISTEMAS.length : i;
  }

  function carimbo(e) { return e._supa_criado_em || e.calculado_em || ""; }

  function compararEntradas(a, b) {
    return (a.quando || "").localeCompare(b.quando || "") ||
      carimbo(a).localeCompare(carimbo(b));
  }

  /** Linha de holoscan_applications + seus scores → a entrada que a tela ja
      sabe desenhar (o mesmo formato que guardarPontuacao grava). */
  function entradaDeRemoto(app, scores) {
    var sist = (scores || []).slice().sort(function (a, b) {
      return ordemSistema(a.sistema) - ordemSistema(b.sistema) ||
        String(a.sistema).localeCompare(String(b.sistema));
    });
    var e = {
      quando: app.quando,
      versao_estrutura: app.versao_estrutura,
      versao_bancos: app.versao_bancos,
      indice: app.indice === null || app.indice === undefined ? app.indice : Number(app.indice),
      indice_maximo: app.indice_maximo === null || app.indice_maximo === undefined
        ? app.indice_maximo : Number(app.indice_maximo),
      avaliavel: app.avaliavel,
      nota_media: app.nota_media === null || app.nota_media === undefined
        ? app.nota_media : Number(app.nota_media),
      triada: app.triada,
      triada_com_dado: app.triada_com_dado,
      cobertura: app.cobertura,
      combinacoes: app.combinacoes || [],
      aprofundamentos: app.aprofundamentos || [],
      sistemas: sist.map(function (s) {
        return {
          sistema: s.sistema, nome: s.nome,
          nota: s.nota === null || s.nota === undefined ? s.nota : Number(s.nota),
          carga: s.carga, faixa: s.faixa,
          obtido: s.obtido === null || s.obtido === undefined ? s.obtido : Number(s.obtido),
          maximo: s.maximo === null || s.maximo === undefined ? s.maximo : Number(s.maximo),
          respondidos: s.respondidos, total_marcadores: s.total_marcadores,
          avaliavel: s.avaliavel
        };
      }),
      _supa_id: app.id,
      _supa_criado_em: app.created_at || "",
      _supa_encounter_id: app.encounter_id || null,  // V1 Etapa 3: o atendimento (Evolucao por atendimento)
      /* proveniencia metodologica (Etapa 6.0.1 / correcao P0): aplicacao oficial V1 x historica sem pacote */
      methodology_package_id: app.methodology_package_id || null,
      methodology_package_version: app.methodology_package_version === undefined ? null : app.methodology_package_version
    };
    if (e.methodology_package_id) e.oficial = true;
    if (app.interpretacao_texto) {
      e.interpretacao = {
        texto: app.interpretacao_texto,
        quando_escrita: app.interpretacao_em || app.quando,
        versao: app.interpretacao_versao || 1
      };
    }
    return e;
  }

  /** PURA. O historico local de UM paciente + o historico remoto dele (ja no
      formato de entrada) → o historico que fica no navegador. */
  function mesclarHistorico(local, remoto) {
    var loc = Array.isArray(local) ? local : (local ? [local] : []);
    var rem = (remoto || []).map(function (r) { return Object.assign({}, r); });
    var porId = {};
    rem.forEach(function (r) { porId[r._supa_id] = r; });

    /* interpretacao escrita aqui e ainda nao confirmada pelo servidor
       (pendente) sobrevive a versao remota; sem remota, a daqui tambem
       sobrevive. Confirmada, o servidor manda. */
    loc.forEach(function (l) {
      var r = l && l._supa_id ? porId[l._supa_id] : null;
      if (!r || !l.interpretacao) return;
      if (!r.interpretacao || l.interpretacao.pendente) r.interpretacao = l.interpretacao;
    });

    var pendentes = loc.filter(function (l) {
      if (!l || l._supa_id) return false;       // com identidade: o servidor decide
      var mesmoDia = rem.filter(function (r) { return r.quando === l.quando; });
      if (!mesmoDia.length) return true;        // so existe aqui
      /* o mesmo calculo de uma aplicacao que o servidor ja tem (mesmas
         respostas ou mesmas notas) nao e pendencia: e ela */
      var A = window.HoloAusencia;
      if (A && A.mesmaAplicacao && mesmoDia.some(function (r) { return A.mesmaAplicacao(l, r); })) return false;
      if (!l.calculado_em) return false;        // legado sem carimbo: o do servidor e ele
      return mesmoDia.every(function (r) { return (r._supa_criado_em || "") < l.calculado_em; });
    });

    return rem.concat(pendentes).sort(compararEntradas);
  }

  function sincronizarHoloscan(ids, uid, gen) {
    if (!ids.length) return Promise.resolve({ estado: "ok", aplicacoes: 0 });

    return lerEmLote("holoscan_applications", COLS_APP, "patient_id", ids, ["quando", "created_at", "id"])
      .then(function (apps) {
        if (!apps.ok) return { estado: "erro" };
        var appIds = apps.linhas.map(function (a) { return a.id; });
        if (!appIds.length) return aplicarHoloscan(ids, [], {}, {}, uid, gen);

        return lerEmLote("holoscan_system_scores", COLS_SCORE, "application_id", appIds,
                         ["application_id", "sistema"])
          .then(function (sc) {
            if (!sc.ok) return { estado: "erro" };
            var scores = {};
            sc.linhas.forEach(function (s) {
              (scores[s.application_id] = scores[s.application_id] || []).push(s);
            });

            /* respostas: so as da ultima aplicacao de cada paciente — e o que
               a tela reabre. As das anteriores so sao buscadas no caso
               ambiguo (ver decidirQuestionario). */
            var ultima = {};
            apps.linhas.forEach(function (a) {
              var u = ultima[a.patient_id];
              if (!u || compararEntradas({ quando: u.quando, _supa_criado_em: u.created_at },
                                         { quando: a.quando, _supa_criado_em: a.created_at }) <= 0) {
                ultima[a.patient_id] = a;
              }
            });
            var ultIds = Object.keys(ultima).map(function (pid) { return ultima[pid].id; });
            return lerEmLote("holoscan_answers", COLS_ANSWER, "application_id", ultIds,
                             ["application_id", "marcador_id"])
              .then(function (ans) {
                if (!ans.ok) return { estado: "erro" };
                return aplicarHoloscan(ids, apps.linhas, scores, agruparRespostas(ans.linhas), uid, gen);
              });
          });
      });
  }

  function agruparRespostas(linhas) {
    var por = {};
    (linhas || []).forEach(function (r) {
      (por[r.application_id] = por[r.application_id] || {})[r.marcador_id] =
        r.valor === null || r.valor === undefined ? r.valor : Number(r.valor);
    });
    return por;
  }

  /** O que fazer com as respostas locais de um paciente. PURA.
        local       respostas no navegador
        registro    o que se sabia na ultima sincronizacao ({app, assinatura})
        ultimaApp   id da ultima aplicacao remota
        remotas     respostas dessa aplicacao
      Devolve "manter" | "substituir" | "ambiguo". */
  function decidirQuestionario(local, registro, ultimaApp, remotas) {
    var aLocal = assinatura(local), aRemota = assinatura(remotas);
    if (vazio(remotas)) return "manter";                 // nada para trazer
    if (vazio(local)) {
      /* limpo de proposito depois de sincronizar com ESTA aplicacao: a pessoa
         comecou uma reaplicacao. Nao devolver as respostas antigas. */
      if (registro && registro.app === ultimaApp) return "manter";
      return "substituir";
    }
    if (aLocal === aRemota) return "manter";
    if (registro) {
      // intocado desde a ultima sincronizacao → e copia velha
      if (registro.assinatura === aLocal) return registro.app === ultimaApp ? "manter" : "substituir";
      return "manter";                                   // editado aqui depois: rascunho
    }
    return "ambiguo";                                    // sem registro: legado
  }

  function aplicarHoloscan(ids, apps, scores, respostasUltima, uid, gen) {
    var porPaciente = {};
    apps.forEach(function (a) {
      (porPaciente[a.patient_id] = porPaciente[a.patient_id] || [])
        .push(entradaDeRemoto(a, scores[a.id]));
    });
    Object.keys(porPaciente).forEach(function (pid) { porPaciente[pid].sort(compararEntradas); });

    // decidir o questionario antes de escrever qualquer coisa
    var q = lerJSON(CHAVE_Q);
    var sync = lerSync();
    var decisoes = {}, ambiguos = [];
    ids.forEach(function (pid) {
      var lista = porPaciente[pid];
      if (!lista || !lista.length) return;
      var ult = lista[lista.length - 1];
      var d = decidirQuestionario(q[pid], sync.questionario[pid], ult._supa_id,
                                  respostasUltima[ult._supa_id]);
      decisoes[pid] = d;
      if (d === "ambiguo") ambiguos.push(pid);
    });

    var resolverAmbiguos = Promise.resolve({});
    if (ambiguos.length) {
      var idsAmb = [];
      ambiguos.forEach(function (pid) {
        porPaciente[pid].forEach(function (e) { idsAmb.push(e._supa_id); });
      });
      resolverAmbiguos = lerEmLote("holoscan_answers", COLS_ANSWER, "application_id", idsAmb,
                                   ["application_id", "marcador_id"])
        .then(function (r) { return r.ok ? agruparRespostas(r.linhas) : null; });
    }

    return resolverAmbiguos.then(function (todasAmb) {
      if (todasAmb === null) return { estado: "erro" };
      if (!aindaValido(uid, gen)) return { estado: "descartado" };

      ambiguos.forEach(function (pid) {
        /* as respostas locais sao igual a alguma aplicacao ja salva? Entao sao
           copia velha. Senao, sao um rascunho que ninguem salvou: ficam. */
        var aLocal = assinatura(q[pid]);
        var bate = porPaciente[pid].some(function (e) {
          return assinatura(todasAmb[e._supa_id]) === aLocal;
        });
        decisoes[pid] = bate ? "substituir" : "manter";
      });

      // 1. historico de pontuacao
      var tudo = lerJSON(CHAVE_PONT);
      var mudouPont = false;
      ids.forEach(function (pid) {
        var antes = JSON.stringify(tudo[pid] || []);
        var novo = mesclarHistorico(tudo[pid], porPaciente[pid] || []);
        if (novo.length) tudo[pid] = novo; else delete tudo[pid];
        if (JSON.stringify(tudo[pid] || []) !== antes) mudouPont = true;
      });
      if (mudouPont) gravarJSON(CHAVE_PONT, tudo, "pontuacao");

      /* 2. respostas (rodada 08)
         As respostas da ultima aplicacao do servidor vao para
         holohacking.respostas_aplicadas (so para rever o que foi respondido).
         O rascunho do questionario (holohacking.questionario) NUNCA e
         preenchido com elas: reaplicar comeca vazio. Rascunho que e so copia
         de aplicacao ja salva ("substituir", ou igual as remotas) e apagado;
         rascunho de verdade (respostas novas, nao salvas) fica. */
      var ap = lerJSON(CHAVE_APLICADAS);
      var mudouQ = false, mudouAp = false;
      ids.forEach(function (pid) {
        var lista = porPaciente[pid];
        if (!lista || !lista.length) return;
        var ult = lista[lista.length - 1];
        var remotas = respostasUltima[ult._supa_id] || {};
        if (!vazio(remotas)) {
          var novo = { app: ult._supa_id, quando: ult.quando, respostas: Object.assign({}, remotas) };
          if (JSON.stringify(ap[pid]) !== JSON.stringify(novo)) { ap[pid] = novo; mudouAp = true; }
        }
        var copia = decisoes[pid] === "substituir" ||
          (!vazio(q[pid]) && assinatura(q[pid]) === assinatura(remotas));
        if (copia && q[pid] !== undefined) { delete q[pid]; mudouQ = true; }
        if (copia || vazio(q[pid])) {
          sync.questionario[pid] = { app: ult._supa_id, assinatura: assinatura({}) };
        }
      });
      if (mudouQ) gravarJSON(CHAVE_Q, q, "questionario");
      if (mudouAp) gravarJSON(CHAVE_APLICADAS, ap, "respostas_aplicadas");
      gravarSync(sync);

      return { estado: "ok", aplicacoes: apps.length };
    });
  }

  /* ============================================================= EXAMES === */

  /** A coleta "mais nova": com data, a de data maior; sem data (data de
      coleta desconhecida — o legado migrado), antes de qualquer datada;
      empate pela ultima atualizacao. */
  function compararColetas(a, b) {
    var da = a.data_coleta_desconhecida ? "" : (a.coletado_em || "");
    var db = b.data_coleta_desconhecida ? "" : (b.coletado_em || "");
    return da.localeCompare(db) ||
      String(a.updated_at || a.created_at || "").localeCompare(String(b.updated_at || b.created_at || "")) ||
      String(a.id).localeCompare(String(b.id));
  }

  /** A coleta que o painel mostra como "atual": a ultima REGISTRADA
      (updated_at), nao a de data clinica maior: registrar hoje uma coleta
      antiga nao pode esconder a que foi registrada ontem. E registro legado
      sem data de coleta nao tem data clinica para comparar. */
  /* Etapa 5: o painel legado so enxerga coletas do PROPRIO painel (source
     legacy_panel, ou antigas sem source). Coletas V1 nao viram "valor atual". */
  function doPainelLegado(c) { return !c.source || c.source === "legacy_panel"; }
  function ultimaRegistrada(coletas) {
    var u = null;
    (coletas || []).filter(doPainelLegado).forEach(function (c) {
      var t = String(c.updated_at || c.created_at || "");
      if (!u || t > String(u.updated_at || u.created_at || "") ||
          (t === String(u.updated_at || u.created_at || "") && compararColetas(c, u) > 0)) u = c;
    });
    return u;
  }

  function valoresDaColeta(c) {
    var v = {};
    (c.resultados || []).forEach(function (r) {
      if (r.valor !== null && r.valor !== undefined) v[r.exame_id] = Number(r.valor);
    });
    return v;
  }

  /** PURA. Decide os valores locais de UM paciente.
        local     valores no navegador ({exameId: valor})
        registro  sync.exames[pid] ou undefined
        coletas   coletas remotas do paciente (a atual e a ultima registrada)
      Devolve { valores (ou null = apagar), registro }. */
  function decidirExames(local, registro, coletas) {
    var ult = ultimaRegistrada(coletas);
    var est = registro && registro.estado;
    if (est === "rascunho" || est === "pendente") {
      return { valores: local || {}, registro: registro };    // nunca descartar o que foi digitado aqui
    }
    if (ult) {
      return { valores: valoresDaColeta(ult),
               registro: { estado: "sincronizado", coleta: ult.id,
                           coletado_em: ult.data_coleta_desconhecida ? null : ult.coletado_em } };
    }
    // o servidor nao tem coleta nenhuma deste paciente
    if (est === "sincronizado") return { valores: null, registro: null };  // foi apagada la
    return { valores: local || {}, registro: registro || null };            // legado local: fica
  }

  function payloadColeta(pid, valores, coletadoEm) {
    var g = window.HOLOSCAN;
    if (!g || !g.listaDeExames) return null;
    var porId = {};
    g.listaDeExames().forEach(function (e) { porId[e.id] = e; });
    var results = [];
    Object.keys(valores || {}).forEach(function (eid) {
      var e = porId[eid];
      var v = valores[eid];
      if (!e || v === null || v === undefined || v === "") return;
      var partes = String(e.faixa || "").split(" a ");
      results.push({
        exame_id: eid, valor: Number(v),
        unidade_no_momento: e.unidade,
        ideal_min_no_momento: Number(partes[0]),
        ideal_max_no_momento: Number(partes[1]),
        nome_exame_no_momento: e.exame,
        sistema_no_momento: e.sistema
      });
    });
    if (!results.length) return null;
    var desconhecida = !coletadoEm;
    return {
      collection: {
        patient_id: pid,
        coletado_em: desconhecida ? null : coletadoEm,
        data_coleta_desconhecida: desconhecida
      },
      results: results
    };
  }

  /** Grava a coleta de um paciente no servidor e diz se funcionou.
      coletadoEm: a data CLINICA da coleta ("AAAA-MM-DD"), ou null quando
      ninguem a informou — ai vai como data de coleta desconhecida, nunca
      como "hoje". Um envio pendente e reenviado com a MESMA data (ou a
      mesma ausencia de data) com que foi registrado. */
  function novoIdColeta() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    var h = "0123456789abcdef", t = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
    return t.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return h[c === "x" ? r : (r & 3 | 8)];
    });
  }

  function marcarPendente(pid, registro) {
    var s = lerSync();
    s.exames[pid] = registro;
    gravarSync(s);
  }

  function marcarSincronizado(pid, coletaId, coletadoEm) {
    var s = lerSync();
    s.exames[pid] = { estado: "sincronizado", coleta: coletaId || null, coletado_em: coletadoEm || null };
    gravarSync(s);
  }

  /* A IDENTIDADE DA COLETA E O ID — Etapa 0 da V1 (Mestre §22, §34.2).

     Na Rodada 08 este caminho valia so para coleta SEM data; a coleta com
     data ia pela RPC salvar_coleta_exames, que em producao faz upsert por
     (paciente, data) e apaga os resultados da coleta que ja existe naquele
     dia. "Duas coletas na mesma data tem IDs independentes" — entao TODA
     coleta passa a ser gravada aqui, direto nas tabelas, sob as mesmas
     policies de RLS, com a identidade gerada no cliente (nova) ou escolhida
     pela nutricionista (editar):

       1. lab_collections: upsert por id, ignoreDuplicates — o reenvio do
          mesmo registro cai na mesma linha, nunca numa segunda;
       2. lab_results: upsert por (collection_id, exame_id) — a unique que o
          schema ja tem; um comando so, atomico;
       3. resultados da coleta que nao estao mais no registro saem.

     Se o passo 2 ou 3 falhar, o registro fica pendente com o MESMO id e a
     proxima tentativa completa a mesma coleta. A RPC continua existindo
     (migration 20260930140000, reescrita sem upsert por data) para outros
     clientes; o app nao a chama mais. */
  function salvarColetaPorId(pid, payload, coletaId, coletadoEm, encounterId) {
    /* V1, Etapa 1: encounter_id so quando quem atende pediu o vinculo
       (checkbox) — nunca deduzido pela data. undefined = nao mexer. */
    var linhaColeta = { id: coletaId, patient_id: pid,
                        coletado_em: coletadoEm || null,
                        data_coleta_desconhecida: !coletadoEm,
                        source: "legacy_panel", state: "salvo" };   // Etapa 5: painel legado, fora da saida oficial
    if (encounterId !== undefined) linhaColeta.encounter_id = encounterId;
    var resultados = payload.results.map(function (r) {
      return Object.assign({ collection_id: coletaId }, r);
    });
    var exames = resultados.map(function (r) { return r.exame_id; });
    var criadaAgora = false;

    /* Protocolo de consolidacao (Mestre §34.2): se a coleta foi criada
       NESTA chamada e os resultados nao entraram, a linha vazia e desfeita
       (melhor esforco) — um salvamento incompleto nao fica no servidor
       parecendo coleta. O registro local continua pendente com o mesmo id,
       e "Tentar de novo" refaz a mesma coleta. */
    function desfazerSeCriada(e) {
      if (!criadaAgora) throw e;
      return Promise.resolve(sb().from("lab_collections").delete().eq("id", coletaId))
        .then(function () { throw e; }, function () { throw e; });
    }

    return Promise.resolve(sb().from("lab_collections").select("id").eq("id", coletaId))
      .then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("sem resposta (coleta)");
        criadaAgora = !(r.data || []).length;
        return sb().from("lab_collections")
          .upsert([linhaColeta], { onConflict: "id", ignoreDuplicates: true });
      })
      .then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("sem resposta (coleta)");
        /* coleta ja existente (editar): o upsert com ignoreDuplicates nao toca
           nela; o vinculo pedido e gravado a parte */
        if (criadaAgora || encounterId === undefined) return r;
        return Promise.resolve(sb().from("lab_collections").update({ encounter_id: encounterId }).eq("id", coletaId));
      })
      .then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("sem resposta (vinculo)");
        return Promise.resolve(sb().from("lab_results").upsert(resultados, { onConflict: "collection_id,exame_id" }))
          .then(function (r2) {
            if (!r2 || r2.error) throw (r2 && r2.error) || new Error("sem resposta (resultados)");
            return r2;
          })
          .catch(desfazerSeCriada);
      })
      .then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("sem resposta (resultados)");
        return sb().from("lab_results").select("id, exame_id").eq("collection_id", coletaId);
      })
      .then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("sem resposta (conferencia)");
        var sobra = (r.data || []).filter(function (x) { return exames.indexOf(x.exame_id) < 0; })
          .map(function (x) { return x.id; });
        if (!sobra.length) return null;
        return Promise.resolve(sb().from("lab_results").delete().in("id", sobra)).then(function (d) {
          if (d && d.error) throw d.error;
        });
      })
      .then(function () { return coletaId; });
  }

  /** Grava a coleta de um paciente no servidor e diz se funcionou.
      coletadoEm: a data CLINICA da coleta ("AAAA-MM-DD"), ou null quando
      ninguem a informou — ai vai como data de coleta desconhecida, nunca
      como "hoje".
      opcoes.coletaId: a coleta a EDITAR (o id escolhido na lista), ou o
      MESMO id de um envio pendente que falhou — completa a mesma coleta em
      vez de criar outra. Sem coletaId e uma coleta NOVA, com id novo, mesmo
      que ja exista outra na mesma data (Etapa 0 da V1: data nao e
      identidade). opcoes.modo e so informativo.
      Um envio pendente e reenviado com a MESMA data (ou a mesma ausencia de
      data) com que foi registrado. */
  function salvarColeta(pid, valores, coletadoEm, opcoes) {
    opcoes = opcoes || {};
    if (!temSupa()) return Promise.resolve({ ok: false, motivo: "offline" });
    if (!pid || !UUID_RE.test(pid)) return Promise.resolve({ ok: false, motivo: "paciente" });
    var payload = payloadColeta(pid, valores, coletadoEm);
    if (!payload) return Promise.resolve({ ok: false, motivo: "vazio" });

    /* registrar de novo exatamente o que a coleta atual ja tem (mesma data,
       mesmos valores) nao e uma coleta nova — e clicar duas vezes em
       "Conferir". Guarda tecnica de idempotencia, nao regra de metodo. */
    var anterior = lerSync().exames[pid] || {};
    if (!opcoes.coletaId && anterior.estado === "sincronizado" && anterior.coleta) {
      var atual = (coletasPorPaciente[pid] || []).filter(function (c) { return c.id === anterior.coleta; })[0];
      var mesmaData = atual && (atual.data_coleta_desconhecida ? !coletadoEm : atual.coletado_em === coletadoEm);
      if (mesmaData && assinatura(valoresDaColeta(atual)) === assinatura(
            valoresDaColeta({ resultados: payload.results }))) {
        return Promise.resolve({ ok: true, coleta: atual.id, semMudanca: true });
      }
    }

    var coletaId = opcoes.coletaId || novoIdColeta();
    marcarPendente(pid, { estado: "pendente", coleta: coletaId, coletado_em: coletadoEm || null, coletaPropria: true });
    return salvarColetaPorId(pid, payload, coletaId, coletadoEm || null,
                             "encounterId" in opcoes ? (opcoes.encounterId || null) : undefined)
      .then(function (id) {
        marcarSincronizado(pid, id, coletadoEm || null);
        return { ok: true, coleta: id };
      })
      .catch(function (e) {
        console.error("[sincronizacao] coleta:", e && e.message ? e.message : e);
        return { ok: false, motivo: "erro", erro: e, coleta: coletaId };
      });
  }

  /** Valores digitados e ainda nao conferidos/salvos. */
  function marcarRascunhoExames(pid) {
    if (!temSupa() || !pid || !UUID_RE.test(pid)) return;
    var s = lerSync();
    var r = s.exames[pid] || {};
    if (r.estado === "pendente") return;       // o pendente ja protege os valores
    s.exames[pid] = { estado: "rascunho", coleta: r.coleta || null, coletado_em: r.coletado_em || null };
    gravarSync(s);
  }

  function reenviarPendentes(ids) {
    var s = lerSync();
    var ex = lerJSON(CHAVE_EX);
    var cadeia = Promise.resolve();
    ids.forEach(function (pid) {
      var r = s.exames[pid];
      if (!r || r.estado !== "pendente") return;
      cadeia = cadeia.then(function () {
        if (vazio(ex[pid])) {
          var s2 = lerSync(); delete s2.exames[pid]; gravarSync(s2);
          return null;
        }
        /* reenvio: mesma data (ou mesma ausencia de data) e, sem data, a
           MESMA coleta. Pendente antigo sem id proprio (gravado antes desta
           regra) vira coleta nova — nunca reaproveita a coleta de outro
           registro. */
        return salvarColeta(pid, ex[pid], r.coletado_em || null,
                            r.coletaPropria && r.coleta ? { coletaId: r.coleta } : {});
      });
    });
    return cadeia;
  }

  function sincronizarExames(ids, uid, gen) {
    if (!ids.length) return Promise.resolve({ estado: "ok", coletas: 0 });

    return reenviarPendentes(ids)
      .then(function () {
        return lerEmLote("lab_collections", COLS_COLETA, "patient_id", ids, ["patient_id", "created_at", "id"]);
      })
      .then(function (cols) {
        if (!cols.ok) return { estado: "erro" };
        var colIds = cols.linhas.map(function (c) { return c.id; });
        var resultados = colIds.length
          ? lerEmLote("lab_results", COLS_RESULT, "collection_id", colIds, ["collection_id", "exame_id", "id"])
          : Promise.resolve({ ok: true, linhas: [] });
        return resultados.then(function (res) {
          if (!res.ok) return { estado: "erro" };
          if (!aindaValido(uid, gen)) return { estado: "descartado" };
          return aplicarExames(ids, cols.linhas, res.linhas);
        });
      });
  }

  function aplicarExames(ids, colunas, resultados) {
    var porColeta = {};
    resultados.forEach(function (r) {
      (porColeta[r.collection_id] = porColeta[r.collection_id] || []).push(r);
    });
    var porPaciente = {};
    colunas.forEach(function (c) {
      var col = Object.assign({}, c, { resultados: porColeta[c.id] || [] });
      (porPaciente[c.patient_id] = porPaciente[c.patient_id] || []).push(col);
    });
    Object.keys(porPaciente).forEach(function (pid) { porPaciente[pid].sort(compararColetas); });

    var ex = lerJSON(CHAVE_EX);
    var sync = lerSync();
    var mudou = false;
    ids.forEach(function (pid) {
      coletasPorPaciente[pid] = porPaciente[pid] || [];
      var d = decidirExames(ex[pid], sync.exames[pid], porPaciente[pid] || []);
      var antes = assinatura(ex[pid]);
      if (d.valores === null || vazio(d.valores)) {
        if (Object.prototype.hasOwnProperty.call(ex, pid)) { delete ex[pid]; mudou = true; }
      } else if (assinatura(d.valores) !== antes) {
        ex[pid] = d.valores; mudou = true;
      }
      if (d.registro) sync.exames[pid] = d.registro; else delete sync.exames[pid];
    });
    if (mudou) gravarJSON(CHAVE_EX, ex, "caixa:" + CHAVE_EX);
    gravarSync(sync);
    return { estado: "ok", coletas: colunas.length };
  }

  /* ======================================================== ORQUESTRACAO === */

  function aindaValido(uid, gen) {
    return gen === geracao && temSupa() && uidAtual() === uid;
  }

  /** Relê do servidor tudo o que as telas leem de caixas locais, para os
      pacientes dados. Resolve sempre (nunca rejeita) com o estado de cada
      dominio: "ok" | "erro" | "offline" | "descartado". */
  function hidratar(pacientes) {
    geracao++;
    var gen = geracao;
    if (!temSupa()) {
      estado = { holoscan: "offline", exames: "offline" };
      coletasPorPaciente = {};
      emCurso = Promise.resolve({ holoscan: "offline", exames: "offline" });
      return emCurso;
    }
    var uid = uidAtual();
    var ids = idsDePacientes(pacientes);
    estado = { holoscan: "carregando", exames: "carregando" };

    var recarregarAgenda = window.Agenda && window.Agenda.carregarDados
      ? Promise.resolve(window.Agenda.carregarDados()).catch(function () {}) : Promise.resolve();
    var recarregarAplicacoes = window.Aplicacoes && window.Aplicacoes.carregar
      ? Promise.resolve(window.Aplicacoes.carregar()).catch(function () {}) : Promise.resolve();
    var recarregarAtendimentos = window.AtendimentoAtual && window.AtendimentoAtual.carregar
      ? Promise.resolve(window.AtendimentoAtual.carregar()).catch(function () {}) : Promise.resolve();
    var recarregarAnamneses = window.Anamnese && window.Anamnese.carregar
      ? Promise.resolve(window.Anamnese.carregar()).catch(function () {}) : Promise.resolve();
    var recarregarCondutas = window.Conduta && window.Conduta.carregar
      ? Promise.resolve(window.Conduta.carregar()).catch(function () {}) : Promise.resolve();
    var recarregarRelatorios = window.Relatorios && window.Relatorios.carregar
      ? Promise.resolve(window.Relatorios.carregar()).catch(function () {}) : Promise.resolve();

    emCurso = Promise.all([
      sincronizarHoloscan(ids, uid, gen).catch(function (e) {
        console.error("[sincronizacao] holoscan:", e); return { estado: "erro" };
      }),
      sincronizarExames(ids, uid, gen).catch(function (e) {
        console.error("[sincronizacao] exames:", e); return { estado: "erro" };
      }),
      recarregarAgenda,
      recarregarAplicacoes,
      recarregarAtendimentos,
      recarregarAnamneses,
      recarregarCondutas,
      recarregarRelatorios
    ]).then(function (r) {
      if (gen === geracao) estado = { holoscan: r[0].estado, exames: r[1].estado };
      /* Os dados chegaram com o dashboard possivelmente ja aberto: sem isto,
         os numeros ficavam os da carga anterior ate trocar de tela. */
      if (gen === geracao && typeof window.redesenharDashboard === "function") {
        try { window.redesenharDashboard(); } catch (e) { console.error("[sincronizacao] dashboard:", e); }
      }
      return { holoscan: r[0].estado, exames: r[1].estado };
    });
    return emCurso;
  }

  /** Esquece o que esta em memoria (logout). As caixas locais sao cuidadas
      pelo login.js (stash por conta). */
  function esquecer() {
    geracao++;
    estado = { holoscan: "ocioso", exames: "ocioso" };
    coletasPorPaciente = {};
    emCurso = Promise.resolve();
  }

  /** Depois de salvar_holoscan_completo: as respostas locais passam a ser as
      desta aplicacao remota. */
  function registrarHoloscanSalvo(pid, appId, respostas) {
    if (!pid || !appId) return;
    var s = lerSync();
    s.questionario[pid] = { app: appId, assinatura: assinatura(respostas || {}) };
    gravarSync(s);
  }

  /** EXPORTACAO (rodada 08): todas as aplicacoes do HOLOSCAN de um paciente
      como estao NO SERVIDOR — cada uma com as respostas e as notas por
      sistema dela. { ok: true, aplicacoes } ou { ok: false }. Nada do cache
      local entra: exportacao nao pode misturar rascunho com registro. */
  function holoscanDoServidor(pid) {
    if (!temSupa() || !pid || !UUID_RE.test(pid)) return Promise.resolve({ ok: false });
    return lerEmLote("holoscan_applications", COLS_APP, "patient_id", [pid], ["quando", "created_at", "id"])
      .then(function (apps) {
        if (!apps.ok) return { ok: false };
        var ids = apps.linhas.map(function (a) { return a.id; });
        if (!ids.length) return { ok: true, aplicacoes: [] };
        return Promise.all([
          lerEmLote("holoscan_system_scores", COLS_SCORE, "application_id", ids, ["application_id", "sistema"]),
          lerEmLote("holoscan_answers", COLS_ANSWER, "application_id", ids, ["application_id", "marcador_id"])
        ]).then(function (r) {
          if (!r[0].ok || !r[1].ok) return { ok: false };
          var sc = {}, an = {};
          r[0].linhas.forEach(function (x) { (sc[x.application_id] = sc[x.application_id] || []).push(x); });
          r[1].linhas.forEach(function (x) { (an[x.application_id] = an[x.application_id] || []).push(x); });
          var lista = apps.linhas.slice().sort(function (a, b) {
            return String(a.quando).localeCompare(String(b.quando)) ||
                   String(a.created_at).localeCompare(String(b.created_at));
          }).map(function (a) {
            var app = {};
            Object.keys(a).forEach(function (k) { if (k !== "patient_id") app[k] = a[k]; });
            app.sistemas = (sc[a.id] || []).map(function (x) {
              var o = Object.assign({}, x); delete o.application_id; return o;
            });
            app.respostas = (an[a.id] || []).map(function (x) {
              return { marcador_id: x.marcador_id, valor: x.valor };
            });
            return app;
          });
          return { ok: true, aplicacoes: lista };
        });
      });
  }

  /** O registro de sincronizacao dos exames do paciente (copia) ou null:
      { estado: "rascunho" | "pendente" | "sincronizado", coleta, coletado_em }. */
  function estadoExames(pid) {
    var r = lerSync().exames[pid];
    return r ? JSON.parse(JSON.stringify(r)) : null;
  }

  /* Faz os valores locais voltarem a ser os da coleta atual do servidor
     (ou nenhum, se o servidor nao tem coleta). So com leitura remota ok. */
  function voltarParaServidor(pid) {
    if (estado.exames !== "ok" || !coletasPorPaciente[pid]) return false;
    var ex = lerJSON(CHAVE_EX), s = lerSync();
    var ult = ultimaRegistrada(coletasPorPaciente[pid]);
    if (ult) {
      ex[pid] = valoresDaColeta(ult);
      s.exames[pid] = { estado: "sincronizado", coleta: ult.id,
                        coletado_em: ult.data_coleta_desconhecida ? null : ult.coletado_em };
    } else {
      delete ex[pid];
      delete s.exames[pid];
    }
    gravarJSON(CHAVE_EX, ex, "caixa:" + CHAVE_EX);
    gravarSync(s);
    return true;
  }

  /** Descarta o rascunho de exames do paciente: volta ao que o servidor tem. */
  function descartarRascunhoExames(pid) {
    return voltarParaServidor(pid);
  }

  /** EXCLUIR COLETA (rodada 08): apaga UMA coleta — a linha de
      lab_collections e, por ON DELETE CASCADE, os lab_results dela. So
      responde ok depois que o servidor confirma que a linha saiu (delete com
      retorno). Os valores locais passam a ser os da coleta atual que sobrou;
      um rascunho digitado aqui nao e tocado. */
  function excluirColeta(pid, coletaId) {
    if (!temSupa()) return Promise.resolve({ ok: false, motivo: "offline" });
    if (!pid || !UUID_RE.test(pid) || !coletaId) return Promise.resolve({ ok: false, motivo: "paciente" });
    return Promise.resolve(sb().from("lab_collections").delete()
        .eq("id", coletaId).eq("patient_id", pid).select("id"))
      .then(function (r) {
        if (!r || r.error) throw (r && r.error) || new Error("sem resposta");
        if (!(r.data || []).length) return { ok: false, motivo: "nao_encontrada" };
        coletasPorPaciente[pid] = (coletasPorPaciente[pid] || []).filter(function (c) { return c.id !== coletaId; });
        var reg = lerSync().exames[pid];
        if (!reg || reg.estado === "sincronizado") {
          voltarParaServidor(pid);
        } else if (reg.coleta === coletaId) {
          var s = lerSync(); s.exames[pid].coleta = null; gravarSync(s);
        }
        return atualizarColetas(pid).then(function () {
          var reg2 = lerSync().exames[pid];
          if (!reg2 || reg2.estado === "sincronizado") voltarParaServidor(pid);
          return { ok: true };
        });
      })
      .catch(function (e) {
        console.error("[sincronizacao] excluir coleta:", e && e.message ? e.message : e);
        return { ok: false, motivo: "erro", erro: e };
      });
  }

  /** Relê so as coletas de um paciente (depois de salvar uma). */
  function atualizarColetas(pid) {
    if (!temSupa() || !pid || !UUID_RE.test(pid)) return Promise.resolve();
    var uid = uidAtual(), gen = geracao;
    return lerEmLote("lab_collections", COLS_COLETA, "patient_id", [pid], ["patient_id", "created_at", "id"])
      .then(function (cols) {
        if (!cols.ok) return;
        var colIds = cols.linhas.map(function (c) { return c.id; });
        var res = colIds.length
          ? lerEmLote("lab_results", COLS_RESULT, "collection_id", colIds, ["collection_id", "exame_id", "id"])
          : Promise.resolve({ ok: true, linhas: [] });
        return res.then(function (r) {
          if (!r.ok || !aindaValido(uid, gen)) return;
          var porColeta = {};
          r.linhas.forEach(function (x) { (porColeta[x.collection_id] = porColeta[x.collection_id] || []).push(x); });
          coletasPorPaciente[pid] = cols.linhas.map(function (c) {
            return Object.assign({}, c, { resultados: porColeta[c.id] || [] });
          }).sort(compararColetas);
        });
      });
  }

  window.Sincronizacao = {
    hidratar: hidratar,
    aguardar: function () { return emCurso; },
    estado: function () { return { holoscan: estado.holoscan, exames: estado.exames }; },
    falhou: function (dominio) { return estado[dominio] === "erro"; },
    esquecer: esquecer,

    /** Coletas remotas do paciente (copia), da mais antiga para a mais nova.
        null quando nao ha leitura remota (offline, erro, ou ainda carregando). */
    coletas: function (pid) {
      if (estado.exames !== "ok" || !coletasPorPaciente[pid]) return null;
      return JSON.parse(JSON.stringify(coletasPorPaciente[pid]));
    },
    /** Etapa 5: so as coletas do painel legado (o painel antigo nao mostra nem edita coletas V1). */
    coletasLegado: function (pid) {
      if (estado.exames !== "ok" || !coletasPorPaciente[pid]) return null;
      return JSON.parse(JSON.stringify(coletasPorPaciente[pid].filter(doPainelLegado)));
    },
    doPainelLegado: doPainelLegado,

    salvarColeta: salvarColeta,
    /** Leitura remota em lote e paginada; { ok, linhas } ou { ok:false }. */
    lerEmLote: function (t, c, campo, ids, ordens) {
      if (!temSupa()) return Promise.resolve({ ok: false, erro: new Error("sem sessao") });
      return lerEmLote(t, c, campo, ids, ordens);
    },
    atualizarColetas: atualizarColetas,
    marcarRascunhoExames: marcarRascunhoExames,
    estadoExames: estadoExames,
    holoscanDoServidor: holoscanDoServidor,
    descartarRascunhoExames: descartarRascunhoExames,
    excluirColeta: excluirColeta,
    valoresDaColeta: function (c) { return valoresDaColeta(c || {}); },
    registrarHoloscanSalvo: registrarHoloscanSalvo,
    hoje: hojeLocal,

    /* puras — expostas para teste */
    _mesclarHistorico: mesclarHistorico,
    _decidirQuestionario: decidirQuestionario,
    _decidirExames: decidirExames,
    _assinatura: assinatura,
    _entradaDeRemoto: entradaDeRemoto
  };
})();
