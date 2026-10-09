/* ===========================================================================
   PROXIMOS PASSOS HOLOS — motor oficial V1 de recomendacao de ferramentas
   ===========================================================================

   HOLOSCAN -> Resultado -> sistemas prioritarios ("Por onde investigar") ->
   Proximos Passos HOLOS -> ferramenta recomendada + explicacao + botao.

   O que este modulo FAZ:
     * le o catalogo HOLOS-RECOMENDACOES-V1 do servidor (tabela global, somente
       leitura; 30 regras aprovadas, 6 por sistema, em ordem metodologica);
     * escolhe, pelos MESMOS dois sistemas de "Por onde investigar", no maximo
       1 recomendacao principal + 2 complementares, sem repetir ferramenta;
     * explica cada recomendacao com o sistema de origem e ate 3 sinais
       dominantes que o HOLOSCAN ja calcula (eles NAO escolhem a ferramenta);
     * desenha o bloco profissional no Resultado HOLOSCAN e, para aplicacao
       salva, registra o snapshot no servidor (RPC registrar_proximos_passos).

   O que este modulo NAO faz (decisao 09/10):
     * nao le exames, documentos, Leitura Integrada nem as REC/SEL legadas de
       corpo-bancos.js; nao altera HOLOS-V1@2, notas, Indice, Triade, faixas;
     * nao preenche nada artificialmente: sem sistema avaliavel, sem
       ferramenta; sem catalogo, sem ferramenta;
     * nao entra na pagina Resultado da paciente, no PDF, no WhatsApp, na
       Conduta nem na HOLOS AI.

   A mesma selecao existe no servidor (migration 20261012100000, funcoes
   proximos_passos_*); o motor daqui serve para a previa do resultado ainda
   nao salvo e para o servidor falso dos testes. Carregado tambem no Node
   (testes/supabase-falso.mjs): por isso usa `raiz`, nunca `document` fora
   das funcoes de tela.
   =========================================================================== */
(function (raiz) {
  "use strict";

  var VERSAO_MOTOR = "PP-V1";
  var CATALOGO_CODE = "HOLOS-RECOMENDACOES-V1";
  var ORDEM = ["fungico", "acido_inflamatorio", "metabolico", "detox_linfatico", "mental_emocional_espiritual"];
  /* as UNICAS 10 ferramentas que podem ser recomendadas (travadas/legadas ficam fora) */
  var FERRAMENTAS = ["oq3", "linha_momentum", "mapa_rotina_v1", "pqq", "mapa_crencas", "gatilhos_respostas_v1", "mapa", "roda_vida", "carta_futuro", "conexao_pertencimento_v1"];
  var NOME_FERRAMENTA = {
    oq3: "OQ³", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina",
    pqq: "PQQ", mapa_crencas: "Mapa de Crenças Alimentares", gatilhos_respostas_v1: "Gatilhos & Respostas",
    mapa: "Mapa do Propósito", roda_vida: "Roda Holística da Vida", carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento"
  };
  var EIXO_FERRAMENTA = { oq3: "Corpo", linha_momentum: "Corpo", mapa_rotina_v1: "Corpo", pqq: "Mente", mapa_crencas: "Mente", gatilhos_respostas_v1: "Mente",
    mapa: "Espírito", roda_vida: "Espírito", carta_futuro: "Espírito", conexao_pertencimento_v1: "Espírito" };
  var MSG_SEM_DADOS = "Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação.";
  var EXPLICACAO = "Este sistema apareceu entre as áreas prioritárias desta aplicação. Estes foram alguns dos sinais que mais contribuíram para sua pontuação.";

  function num(v) { return typeof v === "number" && !isNaN(v); }

  /* ---------- 1. os sistemas, na ordem de "Por onde investigar" ----------
     Exatamente a ordem que app.js usa (HoloAusencia.porLeitura) sobre os
     sistemas com nota; empate mantem a ordem do motor (sort estavel). */
  function ordenarSistemas(r) {
    if (!r || !Array.isArray(r.sistemas)) return [];
    var A = raiz.HoloAusencia;
    var lista = r.sistemas.slice();
    if (A && A.porLeitura) lista.sort(A.porLeitura);
    else lista.sort(function (a, b) { return (a.nota || 0) - (b.nota || 0); });
    return lista.filter(function (s) { return A && A.semNota ? !A.semNota(s) : (s.avaliavel !== false && num(s.nota)); })
      .map(function (s) {
        return { system_id: s.sistema, nome: s.nome || s.sistema, nota: s.nota, faixa: s.faixa || null,
          respondidos: s.respondidos, total_marcadores: s.total_marcadores,
          dominantes: (s.dominantes || []).slice(0, 3).map(function (d) { return { question_id: d.marcador_id, rotulo: d.rotulo || d.marcador_id, pontos: d.pontos }; }) };
      });
  }

  /* ---------- 2. a escolha (a mesma regra da funcao SQL proximos_passos_escolher) ---------- */
  function escolher(regras, sistema, usadas, concluidas) {
    var cand = (regras || []).filter(function (g) {
      return g.system_id === sistema && g.status === "aprovado" && FERRAMENTAS.indexOf(g.tool_id) >= 0 && usadas.indexOf(g.tool_id) < 0;
    }).map(function (g) { return Object.assign({}, g, { pulou_concluida: concluidas.indexOf(g.tool_id) >= 0 }); });
    /* pula ferramenta concluida NESTE atendimento enquanto houver outra; se so
       sobrar concluida, ela entra (nao se esconde o passo, nao se inventa outro) */
    cand.sort(function (a, b) { return (a.pulou_concluida ? 1 : 0) - (b.pulou_concluida ? 1 : 0) || a.rank - b.rank; });
    if (!cand.length) return null;
    var g = cand[0];
    return { rule_id: g.rule_id, system_id: g.system_id, rank: g.rank, tool_id: g.tool_id, professional_reason: g.professional_reason, next_action: g.next_action, pulou_concluida: g.pulou_concluida };
  }

  /**
   * selecionar({ sistemas, regras, concluidas })
   *   sistemas    [{system_id, ...}] ja na ordem de "Por onde investigar" (ordenarSistemas)
   *   regras      as regras do catalogo (status, system_id, rank, tool_id, textos)
   *   concluidas  ferramentas concluidas/revisadas NO ATENDIMENTO desta aplicacao
   * Deterministico: a mesma entrada da sempre a mesma saida.
   */
  function selecionar(entrada) {
    var sistemas = entrada.sistemas || [], regras = entrada.regras || [], concluidas = entrada.concluidas || [];
    var usadas = [], selecao = [], principal = null, c1 = null, c2 = null, motivo = null;
    var s1 = sistemas[0] ? sistemas[0].system_id : null, s2 = sistemas[1] ? sistemas[1].system_id : null;
    if (!s1) motivo = MSG_SEM_DADOS;
    else {
      principal = escolher(regras, s1, usadas, concluidas);
      if (principal) usadas.push(principal.tool_id);
      if (s2) {
        c1 = escolher(regras, s2, usadas, concluidas); if (c1) usadas.push(c1.tool_id);
        c2 = escolher(regras, s1, usadas, concluidas);
      } else {
        c1 = escolher(regras, s1, usadas, concluidas); if (c1) usadas.push(c1.tool_id);
        c2 = escolher(regras, s1, usadas, concluidas);
      }
      if (principal) selecao.push(Object.assign(principal, { papel: "principal", slot: 1 }));
      if (c1) selecao.push(Object.assign(c1, { papel: "complementar", slot: 2 }));
      if (c2) selecao.push(Object.assign(c2, { papel: "complementar", slot: 3 }));
      if (!principal) motivo = MSG_SEM_DADOS;
    }
    return { engine_version: VERSAO_MOTOR, systems_order: sistemas, concluidas_no_atendimento: concluidas.slice(), selection: selecao, motivo: motivo };
  }

  /* ---------- 3. o catalogo (servidor, somente leitura; cache em memoria) ---------- */
  var cache = null;          // { catalogo, regras }
  var carregando = null;
  function temSupa() { return !!(raiz.supabaseClient && raiz.HoloAuth && raiz.HoloAuth.sessaoAtiva && raiz.HoloAuth.sessaoAtiva()); }
  function carregarCatalogo(forcar) {
    if (!temSupa()) { cache = null; return Promise.resolve(null); }
    if (cache && !forcar) return Promise.resolve(cache);
    if (carregando) return carregando;
    var sb = raiz.supabaseClient;
    carregando = Promise.resolve(sb.from("holos_recommendation_catalogs").select("*").eq("code", CATALOGO_CODE).eq("status", "aprovado").order("version", { ascending: false }).limit(1))
      .then(function (r) {
        if (!r || r.error || !Array.isArray(r.data) || !r.data.length) return null;
        var cat = r.data[0];
        return Promise.resolve(sb.from("holos_recommendation_rules").select("*").eq("catalog_id", cat.id).eq("status", "aprovado").order("system_id").order("rank"))
          .then(function (rr) {
            if (!rr || rr.error || !Array.isArray(rr.data)) return null;
            cache = { catalogo: cat, regras: rr.data };
            return cache;
          });
      }).catch(function (e) { console.error("[proximos-passos] catalogo:", e); return null; })
      .then(function (c) { carregando = null; return c; });
    return carregando;
  }
  function catalogo() { return cache; }
  function esquecer() { cache = null; }

  /* ---------- 4. servidor: previa, registro e registros ja feitos ---------- */
  function rpc(nome, args) {
    if (!temSupa()) return Promise.reject(new Error("sem sessao"));
    return Promise.resolve(raiz.supabaseClient.rpc(nome, args)).then(function (r) { if (r.error) throw r.error; return r.data; });
  }
  function previa(appId) { return rpc("proximos_passos_holos", { p_application_id: appId }); }
  function registrar(appId) { return rpc("registrar_proximos_passos", { p_application_id: appId }); }
  function registros(appId) {
    if (!temSupa()) return Promise.resolve([]);
    return Promise.resolve(raiz.supabaseClient.from("holos_next_steps").select("*").eq("holoscan_application_id", appId).order("catalog_version", { ascending: false }))
      .then(function (r) { return (r && !r.error && Array.isArray(r.data)) ? r.data : []; });
  }

  /* ---------- 5. a tela (bloco profissional do Resultado HOLOSCAN) ---------- */
  function esc(s) { return raiz.escapar ? raiz.escapar(String(s == null ? "" : s)) : String(s == null ? "" : s); }
  function dataBR(iso) { if (!iso) return ""; var d = String(iso).slice(0, 10).split("-"); return d.length === 3 ? d[2] + "/" + d[1] + "/" + d[0] : String(iso); }
  function sistemaDe(saida, id) { return (saida.systems_order || []).filter(function (s) { return s.system_id === id; })[0] || { system_id: id, nome: id, dominantes: [] }; }
  function cartao(item, saida, principal) {
    var sis = sistemaDe(saida, item.system_id);
    var dom = (sis.dominantes || []).slice(0, 3);
    var nome = NOME_FERRAMENTA[item.tool_id] || item.tool_id;
    return '<article class="pp-card' + (principal ? " pp-principal" : "") + '" data-pp-regra="' + esc(item.rule_id) + '">' +
      (principal ? '<span class="eyebrow">Próximo passo recomendado</span>' : "") +
      '<h5 class="pp-ferramenta">' + esc(nome) + ' <small>' + esc(EIXO_FERRAMENTA[item.tool_id] || "") + '</small></h5>' +
      '<p class="pp-razao">' + esc(item.professional_reason) + '</p>' +
      '<div class="pp-porque"><b>Por que esta ferramenta?</b>' +
        '<p class="pp-sistema">Sistema relacionado: <b>' + esc(sis.nome || sis.system_id) + '</b></p>' +
        (dom.length ? '<p class="pp-sinais-tit">Sinais que contribuíram para esta área:</p><ul class="pp-sinais">' + dom.map(function (d) { return "<li>" + esc(d.rotulo || d.question_id) + "</li>"; }).join("") + "</ul>" : "") +
        '<p class="pp-explica">' + esc(EXPLICACAO) + '</p></div>' +
      '<div class="pp-acao"><b>O que fazer agora</b><p>' + esc(item.next_action) + '</p></div>' +
      '<button type="button" class="btn-verde pp-iniciar" data-pp-abrir="' + esc(item.tool_id) + '">Iniciar ferramenta</button>' +
      "</article>";
  }
  function htmlBloco(saida, meta) {
    var sel = saida.selection || [];
    var principal = sel.filter(function (x) { return x.papel === "principal"; })[0];
    var comps = sel.filter(function (x) { return x.papel === "complementar"; }).slice(0, 2);
    var h = '<h4 class="res-tit">Próximos Passos HOLOS</h4>' +
      '<p class="res-linha pp-sub">Ferramentas do método que podem ajudar a aprofundar as áreas prioritárias desta aplicação.</p>';
    if (!principal) {
      h += '<p class="res-linha pp-vazio">' + esc(saida.motivo || MSG_SEM_DADOS) + "</p>";
    } else {
      h += cartao(principal, saida, true);
      if (comps.length) h += '<h5 class="pp-outras">Outras possibilidades de aprofundamento</h5><div class="pp-comps">' + comps.map(function (c) { return cartao(c, saida, false); }).join("") + "</div>";
    }
    var cat = saida.catalogo || {};
    h += '<p class="pp-meta">Catálogo ' + esc(cat.code || CATALOGO_CODE) + (cat.version ? " v" + esc(cat.version) : "") + " · " + esc(meta || "") +
      " · A nutricionista decide como conduzir: seguir, abrir outra ferramenta ou ignorar não altera o Resultado HOLOSCAN.</p>";
    return h;
  }
  function ligarBotoes(alvo, pid) {
    alvo.querySelectorAll("[data-pp-abrir]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.dataset.ppAbrir;
        if (FERRAMENTAS.indexOf(id) < 0) return;
        /* paciente certo: o da aplicacao que gerou a recomendacao */
        if (pid && raiz.definirPacienteAtivo && raiz.pacienteAtivoId && raiz.pacienteAtivoId() !== pid) raiz.definirPacienteAtivo(pid);
        if (raiz.abrirFerramentaPorId) raiz.abrirFerramentaPorId(id);
      });
    });
  }

  /**
   * desenhar(r, alvo)
   *   r      o resultado do HOLOSCAN na tela (calculado agora, ou aplicacao salva com _supa_id)
   *   alvo   o elemento onde o bloco entra (#holo-proximos-passos)
   * Fontes, nesta ordem: registro ja feito no servidor (nunca recalculado) > registro automatico para aplicacao salva
   * depois do catalogo > acao explicita para aplicacao salva ANTES do catalogo > previa local (resultado ainda nao salvo).
   */
  var geracao = 0;
  function desenhar(r, alvo) {
    if (!alvo) return Promise.resolve(null);
    var g = ++geracao;
    var pid = raiz.pacienteAtivoId ? raiz.pacienteAtivoId() : null;
    alvo.innerHTML = '<p class="res-linha pp-carregando">Próximos Passos HOLOS: carregando…</p>';
    if (!r || !Array.isArray(r.sistemas)) { alvo.innerHTML = ""; return Promise.resolve(null); }
    if (!temSupa()) {
      alvo.innerHTML = '<h4 class="res-tit">Próximos Passos HOLOS</h4><p class="res-linha pp-vazio">Entre na sua conta para ver os Próximos Passos HOLOS: o catálogo de recomendações fica no servidor.</p>';
      return Promise.resolve(null);
    }
    var appId = r._supa_id || null;
    function pintar(saida, meta) {
      if (g !== geracao) return saida;
      alvo.innerHTML = htmlBloco(saida, meta);
      ligarBotoes(alvo, pid);
      return saida;
    }
    function falhou(e) {
      if (g !== geracao) return null;
      console.error("[proximos-passos]", e);
      var hint = e && (e.hint || e.message) || "";
      alvo.innerHTML = '<h4 class="res-tit">Próximos Passos HOLOS</h4><p class="res-linha pp-vazio">' +
        (/aplicacao_nao_oficial/.test(hint) ? "Próximos Passos HOLOS só para aplicações oficiais (pacote HOLOS-V1)."
          : /catalogo_indisponivel/.test(hint) ? "Catálogo de recomendações indisponível no servidor."
          : "Não foi possível carregar os Próximos Passos HOLOS agora. Nada foi inventado; tente de novo em instantes.") + "</p>";
      return null;
    }
    return carregarCatalogo().then(function (c) {
      if (!c) { pintar({ selection: [], motivo: "Catálogo de recomendações indisponível no servidor." }, ""); return null; }
      if (appId) {
        return registros(appId).then(function (regs) {
          if (regs.length) {
            var reg = regs[0];
            return pintar(reg.content_snapshot, "registrado em " + dataBR(reg.created_at) + " (aplicação salva)");
          }
          var criadoEm = r._supa_criado_em || "";
          var anterior = criadoEm && c.catalogo.created_at && criadoEm < c.catalogo.created_at;
          if (anterior) {
            /* aplicacao anterior ao catalogo: nada e recalculado em silencio */
            alvo.innerHTML = '<h4 class="res-tit">Próximos Passos HOLOS</h4><p class="res-linha pp-vazio">Esta aplicação é anterior ao catálogo de recomendações (' + esc(c.catalogo.code) + " v" + esc(c.catalogo.version) +
              '). Nada foi calculado automaticamente.</p><button type="button" class="btn-borda-ouro" id="pp-ver-atual">Ver Próximos Passos segundo o catálogo atual</button>';
            var b = alvo.querySelector("#pp-ver-atual");
            if (b) b.addEventListener("click", function () { b.disabled = true; registrar(appId).then(function (s) { pintar(s, "registrado agora, por ação explícita"); }, falhou); });
            return null;
          }
          return registrar(appId).then(function (s) { return pintar(s, "registrado em " + dataBR(s.registrado_em) + " (aplicação salva)"); });
        });
      }
      /* resultado ainda nao salvo: previa local com o mesmo motor; o registro acontece ao salvar o HOLOSCAN */
      var concluidas = [];
      try {
        var at = raiz.AtendimentoAtual && raiz.AtendimentoAtual.atual ? raiz.AtendimentoAtual.atual() : null;
        if (at && raiz.Aplicacoes && raiz.Aplicacoes.doPaciente) {
          raiz.Aplicacoes.doPaciente(pid).forEach(function (a) {
            if (a.encounter_id === at.id && (a.status === "concluida" || a.status === "revisada") && concluidas.indexOf(a.ferramenta_id) < 0) concluidas.push(a.ferramenta_id);
          });
        }
      } catch (e) { concluidas = []; }
      var saida = selecionar({ sistemas: ordenarSistemas(r), regras: c.regras, concluidas: concluidas });
      saida.catalogo = { id: c.catalogo.id, code: c.catalogo.code, version: c.catalogo.version, content_hash: c.catalogo.content_hash };
      return pintar(saida, "prévia — será registrado quando o HOLOSCAN for salvo");
    }).catch(falhou);
  }

  /* troca de paciente: o cache do catalogo e global (nao e de paciente); nada a limpar */
  raiz.ProximosPassos = {
    VERSAO_MOTOR: VERSAO_MOTOR, CATALOGO_CODE: CATALOGO_CODE, FERRAMENTAS: FERRAMENTAS.slice(), ORDEM: ORDEM.slice(), NOME_FERRAMENTA: NOME_FERRAMENTA,
    MSG_SEM_DADOS: MSG_SEM_DADOS, EXPLICACAO: EXPLICACAO,
    ordenarSistemas: ordenarSistemas, escolher: escolher, selecionar: selecionar,
    carregarCatalogo: carregarCatalogo, catalogo: catalogo, esquecer: esquecer,
    previa: previa, registrar: registrar, registros: registros, desenhar: desenhar, htmlBloco: htmlBloco
  };
})(typeof window !== "undefined" ? window : globalThis);
