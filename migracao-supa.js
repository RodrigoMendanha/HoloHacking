/* ===========================================================================
   MIGRAÇÃO LOCAL → SUPABASE (idempotente, por conta)
   ===========================================================================

   O que foi criado neste navegador SEM sessao (dados.js / localStorage) sobe
   para o banco na primeira vez que uma conta entra, SEM apagar o local.
   Ordem importa: pacientes primeiro (FK de tudo), depois consultas,
   bloqueios, holoscan, exames e aplicacoes de ferramenta.

   MARCA POR CONTA (Release 01)
     A marca era uma so para o navegador (holohacking.migrado_supa_v1): a
     primeira conta que migrava impedia qualquer outra de migrar os proprios
     dados naquele navegador. Agora e holohacking.migrado_supa.<uid> — o uid
     estavel do Supabase Auth, nunca o e-mail.

     A marca antiga continua sendo LIDA, nunca mais gravada, e so para uma
     coisa: se ela existe e a conta que entrou ainda nao tem a marca propria,
     este navegador ja migrou dados de ALGUMA conta antes, e nao ha como
     provar que o que esta no disco agora e desta. Nesse caso (legado
     ambiguo) pacientes e bloqueios NAO sobem — eles sao os unicos que o
     banco aceitaria como sendo desta conta sem checar nada. O resto (HOLOSCAN,
     exames, consultas, aplicacoes) so entra se o paciente ja for desta conta
     no servidor: a FK (patient_id, nutritionist_id) recusa o contrario.

     A marca so e gravada se TODOS os passos terminaram sem erro. Com erro, a
     proxima carga tenta de novo — e pode, porque cada passo e idempotente.

   Idempotência:
     - patients/consultations/schedule_blocks/tool_applications: upsert por
       id com ignoreDuplicates
     - holoscan: pula entrada com _supa_id e confere (patient_id, quando) no
       servidor antes de inserir — leitura paginada; se a leitura falhar, o
       passo nao insere nada
     - exames: so para paciente sem nenhuma coleta no servidor e sem registro
       de sincronizacao (sincronizacao.js cuida dos demais); a RPC faz upsert
       por (nutritionist_id, patient_id, data_coleta_desconhecida)
   =========================================================================== */

(function () {
  "use strict";

  var MARCA_LEGADA = "holohacking.migrado_supa_v1";   // so leitura
  var PREFIXO_MARCA = "holohacking.migrado_supa.";
  var CHAVE_DONO = "holohacking.dono_local";

  var FERRAMENTAS_REMOTAS = ["oq3", "pqq", "linha_momentum", "mapa_crencas", "roda_vida", "carta_futuro"];
  var STATUS_APLICACAO = ["rascunho", "concluida", "revisada"];

  var erros = 0;       // da rodada atual

  function uidAtual() {
    try {
      var u = window.HoloAuth && window.HoloAuth.usuarioAtual && window.HoloAuth.usuarioAtual();
      return u && u.id ? u.id : null;
    } catch (e) { return null; }
  }

  function marcaDoUsuario(uid) { return PREFIXO_MARCA + uid; }

  function lerEmLote(tabela, colunas, campo, ids, ordens) {
    if (window.Sincronizacao && window.Sincronizacao.lerEmLote) {
      return window.Sincronizacao.lerEmLote(tabela, colunas, campo, ids, ordens);
    }
    return Promise.resolve({ ok: false, erro: new Error("sincronizacao.js ausente") });
  }
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function temSupa() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }

  function log(msg) { console.log("[migracao-supa] " + msg); }

  var TIPO_SLUG = {
    "Primeira consulta": "primeira_consulta",
    "Retorno": "retorno",
    "Reavaliação HOLOSCAN": "reavaliacao_holoscan",
    "Online": "online"
  };

  /* DadosLocais devolve uma consulta "thenable": o resultado so existe
     depois do then. Ler .data direto dava undefined — e por isso pacientes,
     consultas e bloqueios criados sem sessao NUNCA subiam (bug anterior ao
     Release 01, achado pelo teste de migracao). */
  function lerTabelaLocal(tabela) {
    var dl = window.DadosLocais;
    if (!dl) return Promise.resolve([]);
    return Promise.resolve(dl.from(tabela).select("*")).then(function (r) {
      return (r && Array.isArray(r.data)) ? r.data : [];
    }, function () { return []; });
  }

  /* ---- pacientes -------------------------------------------------------- */

  function migrarPacientes() {
    return lerTabelaLocal("pacientes").then(function (linhasLocais) {
      var res = { data: linhasLocais };
      var pacientes = (res.data || []).filter(function (p) {
        return p && p.id && UUID_RE.test(p.id) && p.nome;
      });
      if (!pacientes.length) return Promise.resolve(0);

      var rows = pacientes.map(function (p) {
        var row = { id: p.id, nome: p.nome, status: p.status || "ativo" };
        if (p.nascimento) row.nascimento = p.nascimento;
        if (p.sexo) row.sexo = p.sexo;
        if (p.inicio) row.inicio = p.inicio;
        if (p.queixa) row.queixa = p.queixa;
        if (p.created_at) row.created_at = p.created_at;

        if (p.telefone) row.telefone = p.telefone;
        else if (p.contato && String(p.contato).indexOf("@") < 0) row.telefone = p.contato;

        if (p.email) row.email = p.email;
        else if (p.contato && String(p.contato).indexOf("@") >= 0) row.email = p.contato;

        return row;
      });

      return window.supabaseClient
        .from("patients")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .then(function (r) {
          if (r.error) { erros++; log("pacientes erro: " + r.error.message); return 0; }
          return rows.length;
        });
    });
  }

  /* ---- consultas -------------------------------------------------------- */

  function migrarConsultas() {
    return lerTabelaLocal("consultas").then(function (linhasLocais) {
      var res = { data: linhasLocais };
      var consultas = (res.data || []).filter(function (c) {
        return c && c.id && UUID_RE.test(c.id) && c.paciente_id && UUID_RE.test(c.paciente_id);
      });
      if (!consultas.length) return Promise.resolve(0);

      var rows = consultas.map(function (c) {
        var row = {
          id: c.id,
          patient_id: c.paciente_id,
          data: c.data,
          hora: c.hora || "00:00",
          duracao_min: c.duracao || 60,
          tipo: TIPO_SLUG[c.tipo] || c.tipo || "retorno"
        };
        if (c.nota) row.nota = c.nota;
        if (c.created_at) row.created_at = c.created_at;
        return row;
      });

      return window.supabaseClient
        .from("consultations")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .then(function (r) {
          if (r.error) { erros++; log("consultas erro: " + r.error.message); return 0; }
          return rows.length;
        });
    });
  }

  /* ---- bloqueios -------------------------------------------------------- */

  function migrarBloqueios() {
    return lerTabelaLocal("bloqueios").then(function (linhasLocais) {
      var res = { data: linhasLocais };
      var bloqueios = (res.data || []).filter(function (b) {
        return b && b.id && UUID_RE.test(b.id) && b.data;
      });
      if (!bloqueios.length) return Promise.resolve(0);

      var rows = bloqueios.map(function (b) {
        var row = {
          id: b.id,
          data: b.data,
          dia_todo: !!b.dia_todo
        };
        if (!b.dia_todo) {
          row.inicio = b.inicio || null;
          row.fim = b.fim || null;
        }
        if (b.motivo) row.motivo = b.motivo;
        if (b.created_at) row.created_at = b.created_at;
        return row;
      });

      return window.supabaseClient
        .from("schedule_blocks")
        .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
        .then(function (r) {
          if (r.error) { erros++; log("bloqueios erro: " + r.error.message); return 0; }
          return rows.length;
        });
    });
  }

  /* ---- holoscan -------------------------------------------------------- */

  function migrarHoloscan() {
    var tudo;
    try { tudo = JSON.parse(localStorage.getItem("holohacking.pontuacao")) || {}; }
    catch (e) { return Promise.resolve(0); }

    var pidsLocais = Object.keys(tudo).filter(function (pid) { return UUID_RE.test(pid); });
    if (!pidsLocais.length) return Promise.resolve(0);

    return lerEmLote("holoscan_applications", "id, patient_id, quando", "patient_id", pidsLocais,
                     ["patient_id", "quando", "id"])
      .then(function (existRes) {
        /* erro nao e "nao existe nada": sem saber o que o servidor tem, nao se
           insere nada — senao cada falha de leitura duplicaria o historico. */
        if (!existRes.ok) { erros++; log("holoscan: leitura falhou, passo adiado"); return 0; }
        var existentes = {};
        existRes.linhas.forEach(function (e) {
          existentes[e.patient_id + "|" + e.quando] = true;
        });

        var qDados, apDados;
        try { qDados = JSON.parse(localStorage.getItem("holohacking.questionario")) || {}; }
        catch (e) { qDados = {}; }
        /* Rodada 08: salvar o HOLOSCAN (mesmo sem sessao) move as respostas do
           rascunho para respostas_aplicadas. A aplicacao local ainda nao
           enviada leva as respostas de la. */
        try { apDados = JSON.parse(localStorage.getItem("holohacking.respostas_aplicadas")) || {}; }
        catch (e) { apDados = {}; }

        var pendentes = [];

        Object.keys(tudo).forEach(function (pid) {
          if (!UUID_RE.test(pid)) return;
          var lista = Array.isArray(tudo[pid]) ? tudo[pid] : [tudo[pid]];

          lista.forEach(function (ent, idx) {
            if (ent._supa_id) return;
            if (!ent.quando) return;
            if (existentes[pid + "|" + ent.quando]) return;

            var scores = (ent.sistemas || []).map(function (s) {
              return {
                sistema: s.sistema, nome: s.nome,
                nota: s.nota, carga: s.carga, faixa: s.faixa,
                obtido: s.obtido, maximo: s.maximo,
                respondidos: s.respondidos,
                total_marcadores: s.total_marcadores,
                avaliavel: s.avaliavel
              };
            });
            if (!scores.length) return;

            var isUltima = idx === lista.length - 1;
            var answers = [];
            var ap = apDados[pid];
            var daAplicada = ap && !ap.app && ap.quando === ent.quando && ap.respostas;
            var q = daAplicada ? ap.respostas : (isUltima ? qDados[pid] : null);
            if (q && Object.keys(q).length) {
              answers = Object.keys(q).map(function (mid) {
                return { marcador_id: mid, valor: q[mid] };
              });
            }

            pendentes.push({
              pid: pid, idx: idx, quando: ent.quando,
              payload: {
                application: {
                  patient_id: pid,
                  quando: ent.quando,
                  versao_estrutura: ent.versao_estrutura || 1,
                  versao_bancos: ent.versao_bancos || null,
                  indice: ent.indice,
                  indice_maximo: ent.indice_maximo || 100,
                  avaliavel: ent.avaliavel !== false,
                  nota_media: typeof ent.nota_media === "number" ? ent.nota_media : 0,
                  triada: ent.triada || {},
                  triada_com_dado: ent.triada_com_dado || {},
                  cobertura: ent.cobertura || {},
                  combinacoes: ent.combinacoes || [],
                  aprofundamentos: ent.aprofundamentos || [],
                  interpretacao_texto: (ent.interpretacao && ent.interpretacao.texto) || null,
                  interpretacao_em: (ent.interpretacao && ent.interpretacao.quando_escrita) || null,
                  interpretacao_versao: (ent.interpretacao && ent.interpretacao.versao) || null
                },
                answers: answers,
                scores: scores
              }
            });
          });
        });

        if (!pendentes.length) return 0;

        var chain = Promise.resolve();
        var migrados = 0;

        pendentes.forEach(function (p) {
          chain = chain.then(function () {
            return window.supabaseClient
              .rpc("salvar_holoscan_completo", { payload: p.payload })
              .then(function (r) {
                if (r.error) {
                  erros++;
                  log("holoscan " + p.pid + "/" + p.quando + ": " + r.error.message);
                  return;
                }
                try {
                  var hist = JSON.parse(localStorage.getItem("holohacking.pontuacao") || "{}");
                  var arr = hist[p.pid];
                  if (arr && arr[p.idx] && arr[p.idx].quando === p.quando && !arr[p.idx]._supa_id) {
                    arr[p.idx]._supa_id = r.data;
                    arr[p.idx]._supa_criado_em = new Date().toISOString();
                    localStorage.setItem("holohacking.pontuacao", JSON.stringify(hist));
                  }
                } catch (e) { /* nao critico */ }
                migrados++;
              })
              .catch(function (e) { erros++; log("holoscan: " + (e && e.message || e)); });
          });
        });

        return chain.then(function () { return migrados; });
      });
  }

  /* ---- exames ----------------------------------------------------------- */

  function migrarExames() {
    var tudo;
    try { tudo = JSON.parse(localStorage.getItem("holohacking.exames")) || {}; }
    catch (e) { return Promise.resolve(0); }

    var g = window.HOLOSCAN || null;
    if (!g || !g.listaDeExames) return Promise.resolve(0);

    /* Paciente com registro de sincronizacao ja e da sincronizacao.js (ela
       sabe se o valor local e copia, rascunho ou pendente). Aqui so entra o
       legado: valores digitados sem sessao, que nunca foram para o servidor. */
    var sync;
    try { sync = (JSON.parse(localStorage.getItem("holohacking.sincronizacao")) || {}).exames || {}; }
    catch (e) { sync = {}; }

    var candidatos = Object.keys(tudo).filter(function (pid) {
      var vals = tudo[pid];
      return UUID_RE.test(pid) && vals && typeof vals === "object" &&
        Object.keys(vals).length > 0 && !sync[pid];
    });
    if (!candidatos.length) return Promise.resolve(0);

    return lerEmLote("lab_collections", "id, patient_id", "patient_id", candidatos, ["patient_id", "id"])
      .then(function (r) {
        if (!r.ok) { erros++; log("exames: leitura falhou, passo adiado"); return 0; }
        /* Se o servidor ja tem QUALQUER coleta do paciente, o valor local nao
           sobe como "data desconhecida": ou e copia dela, ou a sincronizacao
           decide. Subir criaria uma segunda coleta com os mesmos numeros. */
        var temRemoto = {};
        r.linhas.forEach(function (c) { temRemoto[c.patient_id] = true; });

        var cadeia = Promise.resolve();
        var migrados = 0;
        candidatos.forEach(function (pid) {
          if (temRemoto[pid]) return;
          cadeia = cadeia.then(function () {
            var s = window.Sincronizacao;
            if (!s || !s.salvarColeta) return;
            // data de coleta desconhecida: o valor legado nunca teve data
            return s.salvarColeta(pid, tudo[pid], null).then(function (res) {
              if (res.ok) migrados++;
              else if (res.motivo !== "vazio") { erros++; log("exames " + pid + ": " + res.motivo); }
            });
          });
        });
        return cadeia.then(function () { return migrados; });
      });
  }

  /* ---- aplicacoes de ferramenta ----------------------------------------
     Criadas sem sessao, vivem so em holohacking.dados.aplicacoes. O banco
     aceita as seis ferramentas ativas; aplicacao de ferramenta legada (fora
     do catalogo ativo) continua so neste navegador — ela e legivel no
     historico local, mas nao pode originar registro novo no servidor. */

  function migrarAplicacoes() {
    return lerTabelaLocal("aplicacoes").then(function (linhasLocais) {
      var res = { data: linhasLocais };
      var locais = (res.data || []).filter(function (a) {
        return a && a.id && UUID_RE.test(a.id) &&
          a.paciente_id && UUID_RE.test(a.paciente_id) &&
          FERRAMENTAS_REMOTAS.indexOf(a.ferramenta_id) >= 0;
      });
      if (!locais.length) return Promise.resolve(0);

      function linha(a, comConsulta) {
        var row = {
          id: a.id,
          patient_id: a.paciente_id,
          ferramenta_id: a.ferramenta_id,
          versao_ferramenta: String(a.versao_ferramenta || "1"),
          status: STATUS_APLICACAO.indexOf(a.status) >= 0 ? a.status : "rascunho",
          respostas: a.respostas && typeof a.respostas === "object" ? a.respostas : {},
          resultado: a.resultado === undefined ? null : a.resultado,
          leitura: a.leitura || null,
          prioridade: a.prioridade || null,
          proximo_passo: a.proximo_passo || null
        };
        if (a.origem_legada) row.origem_legada = a.origem_legada;
        if (a.iniciada_em) row.iniciada_em = a.iniciada_em;
        if (a.concluida_em) row.concluida_em = a.concluida_em;
        if (a.atualizada_em) row.atualizada_em = a.atualizada_em;
        if (a.created_at) row.created_at = a.created_at;
        if (comConsulta && a.consulta_id && UUID_RE.test(a.consulta_id)) row.consultation_id = a.consulta_id;
        return row;
      }

      function subir(row) {
        return Promise.resolve(window.supabaseClient
          .from("tool_applications")
          .upsert([row], { onConflict: "id", ignoreDuplicates: true }));
      }

      var cadeia = Promise.resolve();
      var migrados = 0;
      locais.forEach(function (a) {
        cadeia = cadeia.then(function () {
          return subir(linha(a, true)).then(function (r) {
            /* a consulta de origem pode nao existir no servidor (FK): a
               aplicacao sobe sem o vinculo em vez de nao subir */
            if (r && r.error && a.consulta_id) return subir(linha(a, false));
            return r;
          }).then(function (r) {
            if (r && r.error) { erros++; log("aplicacao " + a.id + ": " + r.error.message); return; }
            migrados++;
          }).catch(function (e) { erros++; log("aplicacao: " + (e && e.message || e)); });
        });
      });
      return cadeia.then(function () { return migrados; });
    });
  }

  /* ---- ponto de entrada ------------------------------------------------- */

  window.migrarParaSupabase = function () {
    if (!temSupa()) return Promise.resolve();
    var uid = uidAtual();
    if (!uid) return Promise.resolve();

    try {
      if (localStorage.getItem(marcaDoUsuario(uid))) return Promise.resolve();
      var dono = localStorage.getItem(CHAVE_DONO);
      /* login.js grava o dono antes de a carga comecar; se o disco for de
         outra conta, nada daqui sobe como sendo desta */
      if (dono && dono !== uid) { log("caixas locais de outra conta — nada a migrar"); return Promise.resolve(); }
    } catch (e) { /* segue */ }

    var legadoAmbiguo = false;
    try { legadoAmbiguo = !!localStorage.getItem(MARCA_LEGADA); } catch (e) { /* idem */ }

    erros = 0;
    log("iniciando" + (legadoAmbiguo ? " (legado: sem pacientes/bloqueios)" : ""));

    var passos = legadoAmbiguo
      ? Promise.resolve(0).then(function () { return migrarConsultas(); })
      : migrarPacientes()
          .then(function (n) { if (n) log(n + " pacientes"); return migrarConsultas(); });

    return passos
      .then(function (n) {
        if (n) log(n + " consultas");
        return legadoAmbiguo ? 0 : migrarBloqueios();
      })
      .then(function (n) { if (n) log(n + " bloqueios"); return migrarHoloscan(); })
      .then(function (n) { if (n) log(n + " holoscan(s)"); return migrarExames(); })
      .then(function (n) { if (n) log(n + " coleta(s) de exame"); return migrarAplicacoes(); })
      .then(function (n) {
        if (n) log(n + " aplicacao(oes) de ferramenta");
        if (erros === 0 && uidAtual() === uid) {
          try { localStorage.setItem(marcaDoUsuario(uid), new Date().toISOString()); } catch (e) { /* idem */ }
          log("concluída");
        } else {
          log("com " + erros + " erro(s) — tenta de novo na próxima carga");
        }
      })
      .catch(function (e) { log("erro: " + (e && e.message || e)); });
  };
})();
