/* ===========================================================================
   MIGRAÇÃO LOCAL → SUPABASE (idempotente)
   ===========================================================================

   Na primeira vez que o usuário entra com Supabase, os dados vivem em
   localStorage. Esta rotina empurra tudo para o banco, SEM apagar o local.
   Ordem importa: pacientes primeiro (FK de tudo), depois consultas,
   bloqueios, holoscan e exames. OQ3/PQQ viram tool_applications via
   aplicacoes.js, que já roda sozinho.

   Idempotência:
     - patients/consultations/schedule_blocks: upsert com ignoreDuplicates
     - holoscan: confere existência por (patient_id, quando) antes de inserir
     - exames: RPC faz upsert por (nutritionist_id, patient_id, data_coleta_desconhecida)
     - marca localStorage impede reexecução desnecessária

   A rotina é fire-and-forget no arranque: se falhar no meio, a próxima
   carga tenta de novo (a marca só é escrita no final).
   =========================================================================== */

(function () {
  "use strict";

  var MARCA = "holohacking.migrado_supa_v1";
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

  /* ---- pacientes -------------------------------------------------------- */

  function migrarPacientes() {
    var dl = window.DadosLocais;
    if (!dl) return Promise.resolve(0);

    var res = dl.from("pacientes").select("*");
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
        if (r.error) { log("pacientes erro: " + r.error.message); return 0; }
        return rows.length;
      });
  }

  /* ---- consultas -------------------------------------------------------- */

  function migrarConsultas() {
    var dl = window.DadosLocais;
    if (!dl) return Promise.resolve(0);

    var res = dl.from("consultas").select("*");
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
        if (r.error) { log("consultas erro: " + r.error.message); return 0; }
        return rows.length;
      });
  }

  /* ---- bloqueios -------------------------------------------------------- */

  function migrarBloqueios() {
    var dl = window.DadosLocais;
    if (!dl) return Promise.resolve(0);

    var res = dl.from("bloqueios").select("*");
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
        if (r.error) { log("bloqueios erro: " + r.error.message); return 0; }
        return rows.length;
      });
  }

  /* ---- holoscan -------------------------------------------------------- */

  function migrarHoloscan() {
    var tudo;
    try { tudo = JSON.parse(localStorage.getItem("holohacking.pontuacao")) || {}; }
    catch (e) { return Promise.resolve(0); }

    return window.supabaseClient
      .from("holoscan_applications")
      .select("patient_id, quando")
      .then(function (existRes) {
        var existentes = {};
        (existRes.data || []).forEach(function (e) {
          existentes[e.patient_id + "|" + e.quando] = true;
        });

        var qDados;
        try { qDados = JSON.parse(localStorage.getItem("holohacking.questionario")) || {}; }
        catch (e) { qDados = {}; }

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
            if (isUltima && qDados[pid]) {
              var q = qDados[pid];
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
                  log("holoscan " + p.pid + "/" + p.quando + ": " + r.error.message);
                  return;
                }
                try {
                  var hist = JSON.parse(localStorage.getItem("holohacking.pontuacao") || "{}");
                  var arr = hist[p.pid];
                  if (arr && arr[p.idx]) {
                    arr[p.idx]._supa_id = r.data;
                    localStorage.setItem("holohacking.pontuacao", JSON.stringify(hist));
                  }
                } catch (e) { /* nao critico */ }
                migrados++;
              })
              .catch(function (e) { log("holoscan: " + (e && e.message || e)); });
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

    var lista = g.listaDeExames();
    var porId = {};
    lista.forEach(function (e) { porId[e.id] = e; });

    var pendentes = [];

    Object.keys(tudo).forEach(function (pid) {
      if (!UUID_RE.test(pid)) return;
      var vals = tudo[pid];
      if (!vals || typeof vals !== "object") return;

      var results = [];
      Object.keys(vals).forEach(function (eid) {
        if (vals[eid] == null || vals[eid] === "") return;
        var e = porId[eid];
        if (!e) return;
        var partes = e.faixa.split(" a ");
        results.push({
          exame_id: eid, valor: Number(vals[eid]),
          unidade_no_momento: e.unidade,
          ideal_min_no_momento: Number(partes[0]),
          ideal_max_no_momento: Number(partes[1]),
          nome_exame_no_momento: e.exame,
          sistema_no_momento: e.sistema
        });
      });

      if (!results.length) return;

      pendentes.push({
        pid: pid,
        payload: {
          collection: {
            patient_id: pid,
            coletado_em: null,
            data_coleta_desconhecida: true
          },
          results: results
        }
      });
    });

    if (!pendentes.length) return Promise.resolve(0);

    var chain = Promise.resolve();
    var migrados = 0;

    pendentes.forEach(function (p) {
      chain = chain.then(function () {
        return window.supabaseClient
          .rpc("salvar_coleta_exames", { payload: p.payload })
          .then(function (r) {
            if (r.error) { log("exames " + p.pid + ": " + r.error.message); return; }
            migrados++;
          })
          .catch(function (e) { log("exames: " + (e && e.message || e)); });
      });
    });

    return chain.then(function () { return migrados; });
  }

  /* ---- ponto de entrada ------------------------------------------------- */

  window.migrarParaSupabase = function () {
    if (!temSupa()) return Promise.resolve();

    try { if (localStorage.getItem(MARCA)) return Promise.resolve(); }
    catch (e) { /* segue */ }

    log("iniciando");

    return migrarPacientes()
      .then(function (n) { if (n) log(n + " pacientes"); return migrarConsultas(); })
      .then(function (n) { if (n) log(n + " consultas"); return migrarBloqueios(); })
      .then(function (n) { if (n) log(n + " bloqueios"); return migrarHoloscan(); })
      .then(function (n) { if (n) log(n + " holoscan(s)"); return migrarExames(); })
      .then(function (n) {
        if (n) log(n + " coleta(s) de exame");
        try { localStorage.setItem(MARCA, new Date().toISOString()); } catch (e) { /* idem */ }
        log("concluída");
      })
      .catch(function (e) { log("erro: " + (e && e.message || e)); });
  };
})();
