/* ===========================================================================
   DADOS-ROUTER — o unico lugar que decide onde cada tabela mora
   ===========================================================================

   Cada tabela do app (pacientes, consultas, bloqueios, aplicacoes, …)
   comecou no localStorage via DadosLocais. A migracao para Supabase
   acontece aqui, tabela por tabela, sem que o resto do app precise saber.

   COMO FUNCIONA
   Quando ha sessao Supabase ativa (HoloAuth.sessaoAtiva()), o roteador
   direciona tabelas migradas para supabaseClient.from(tabelaSupabase).
   Sem sessao, tudo cai para DadosLocais — offline funciona como antes.

   TRADUCAO DE CAMPOS
   Algumas tabelas Supabase usam nomes diferentes do DadosLocais. Em vez
   de mudar todo o frontend, o roteador traduz na borda:
     - Na escrita (insert/update): campo_local → campo_supabase
     - Na leitura (resultado):     campo_supabase → campo_local
   Isso garante que DadosLocais e Supabase convivem sem conflito.

   TABELAS ROTEADAS NESTA FASE
     pacientes  → patients            (campos iguais)
     consultas  → consultations       (paciente_id→patient_id, duracao→duracao_min, tipo traduzido)
     bloqueios  → schedule_blocks     (campos iguais)
     aplicacoes → tool_applications   (paciente_id→patient_id, consulta_id→consultation_id)

   TABELAS QUE CONTINUAM EM DADOSLOCAIS
     holoscope  — estrutura Supabase diferente (snapshot). Etapa 5.
     perfil     — id e campos diferentes. Etapa 9.
     oq3, pqq   — legado, sera migrado para tool_applications. Etapa 10.
   =========================================================================== */

(function () {
  "use strict";

  /* ---------- traducao de tipo de consulta --------------------------------
     O frontend usa strings legiveis ("Retorno"). O banco usa slugs
     ("retorno"). A traducao acontece aqui e so aqui. */

  var TIPO_PARA_SUPA = {
    "Primeira consulta": "primeira_consulta",
    "Retorno": "retorno",
    "Reavaliação HOLOSCOPE": "reavaliacao_holoscope",
    "Online": "online"
  };
  var TIPO_PARA_FRONT = {};
  for (var k in TIPO_PARA_SUPA) { TIPO_PARA_FRONT[TIPO_PARA_SUPA[k]] = k; }

  /* ---------- mapas de traducao por tabela -------------------------------- */

  var MAPAS = {
    consultas: {
      tabela: "consultations",
      campos: { paciente_id: "patient_id", duracao: "duracao_min" },
      inverso: { patient_id: "paciente_id", duracao_min: "duracao" },
      valorIn: function (campo, v) {
        return campo === "tipo" ? (TIPO_PARA_SUPA[v] || v) : v;
      },
      valorOut: function (campo, v) {
        return campo === "tipo" ? (TIPO_PARA_FRONT[v] || v) : v;
      }
    },
    bloqueios: {
      tabela: "schedule_blocks",
      campos: {},
      inverso: {}
    },
    aplicacoes: {
      tabela: "tool_applications",
      campos: { paciente_id: "patient_id", consulta_id: "consultation_id" },
      inverso: { patient_id: "paciente_id", consultation_id: "consulta_id" }
    }
  };

  /* ---------- proxy que traduz campos na ida e na volta ------------------- */

  function traduzirEntrada(mapa, obj) {
    if (!obj) return obj;
    var r = {};
    for (var chave in obj) {
      var novaCh = mapa.campos[chave] || chave;
      var val = obj[chave];
      if (mapa.valorIn) val = mapa.valorIn(novaCh, val);
      r[novaCh] = val;
    }
    return r;
  }

  function traduzirSaida(mapa, obj) {
    if (!obj) return obj;
    var r = {};
    for (var chave in obj) {
      var novaCh = mapa.inverso[chave] || chave;
      var val = obj[chave];
      if (mapa.valorOut) val = mapa.valorOut(chave, val);
      r[novaCh] = val;
    }
    return r;
  }

  function traduzirResultado(mapa, resultado) {
    if (!resultado) return resultado;
    if (resultado.data) {
      if (Array.isArray(resultado.data)) {
        resultado.data = resultado.data.map(function (item) {
          return traduzirSaida(mapa, item);
        });
      } else {
        resultado.data = traduzirSaida(mapa, resultado.data);
      }
    }
    return resultado;
  }

  /** Embrulha um builder Supabase ou Thenable para que toda a cadeia
      (select, insert, update, delete, eq, order, single, then, catch)
      continue traduzindo campos. */
  function embrulhar(mapa, inner) {
    var proxy = {
      select: function (cols) { return embrulhar(mapa, inner.select(cols)); },
      order: function (col, opts) {
        return embrulhar(mapa, inner.order(mapa.campos[col] || col, opts));
      },
      eq: function (col, val) {
        var novaCh = mapa.campos[col] || col;
        var novaVal = val;
        if (mapa.valorIn) novaVal = mapa.valorIn(novaCh, val);
        return embrulhar(mapa, inner.eq(novaCh, novaVal));
      },
      neq: function (col, val) {
        return embrulhar(mapa, inner.neq(mapa.campos[col] || col, val));
      },
      gt: function (col, val) {
        return embrulhar(mapa, inner.gt(mapa.campos[col] || col, val));
      },
      lt: function (col, val) {
        return embrulhar(mapa, inner.lt(mapa.campos[col] || col, val));
      },
      gte: function (col, val) {
        return embrulhar(mapa, inner.gte(mapa.campos[col] || col, val));
      },
      lte: function (col, val) {
        return embrulhar(mapa, inner.lte(mapa.campos[col] || col, val));
      },
      is: function (col, val) {
        return embrulhar(mapa, inner.is(mapa.campos[col] || col, val));
      },
      in: function (col, vals) {
        return embrulhar(mapa, inner.in(mapa.campos[col] || col, vals));
      },
      single: function () { return embrulhar(mapa, inner.single()); },
      maybeSingle: function () { return embrulhar(mapa, inner.maybeSingle()); },
      limit: function (n) { return embrulhar(mapa, inner.limit(n)); },
      range: function (a, b) { return embrulhar(mapa, inner.range(a, b)); },
      then: function (ok, falhou) {
        return inner.then(function (r) {
          var traduzido = traduzirResultado(mapa, r);
          return ok ? ok(traduzido) : traduzido;
        }, falhou);
      },
      catch: function (fn) { return inner.catch(fn); }
    };
    return proxy;
  }

  /** Cria o ponto de entrada para uma tabela mapeada. */
  function criarFrom(mapa) {
    var builder = window.supabaseClient.from(mapa.tabela);
    return {
      select: function (cols) { return embrulhar(mapa, builder.select(cols)); },
      insert: function (dados) {
        var d = Array.isArray(dados)
          ? dados.map(function (item) { return traduzirEntrada(mapa, item); })
          : traduzirEntrada(mapa, dados);
        return embrulhar(mapa, builder.insert(d));
      },
      update: function (dados) {
        return embrulhar(mapa, builder.update(traduzirEntrada(mapa, dados)));
      },
      delete: function () { return embrulhar(mapa, builder.delete()); },
      upsert: function (dados, opts) {
        var d = Array.isArray(dados)
          ? dados.map(function (item) { return traduzirEntrada(mapa, item); })
          : traduzirEntrada(mapa, dados);
        return embrulhar(mapa, builder.upsert(d, opts));
      }
    };
  }

  /* ---------- roteador principal ----------------------------------------- */

  window.DadosRouter = {
    from: function (tabela) {
      var temSessao = window.HoloAuth && window.HoloAuth.sessaoAtiva();

      if (window.supabaseClient && temSessao) {
        if (tabela === "pacientes") {
          return window.supabaseClient.from("patients");
        }
        var mapa = MAPAS[tabela];
        if (mapa) {
          return criarFrom(mapa);
        }
      }

      return window.DadosLocais.from(tabela);
    }
  };
})();
