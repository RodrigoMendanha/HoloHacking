/* ===========================================================================
   ATENDIMENTO — o contexto clinico ativo (V1, Etapa 1)
   ===========================================================================

   AGENDA e ATENDIMENTO sao coisas diferentes. A agenda (consultations) e o
   compromisso administrativo: dia, hora, duracao. O atendimento (encounters)
   e o fato clinico: aconteceu, em tal instante, com ou sem agendamento de
   origem. Um agendamento pode nunca virar atendimento; um atendimento pode
   nascer sem agendamento.

   Este arquivo guarda UM atendimento ativo por vez e e o unico lugar que o
   cria. Quem grava registro clinico novo (HOLOSCAN, ferramenta, coleta)
   pergunta aqui qual e o atendimento escolhido — e NUNCA deduz pela data
   ("a consulta de hoje", "a primeira desta data", "a ultima consulta").

   O atendimento ativo so nasce por gesto explicito: "Iniciar atendimento"
   num agendamento da agenda, ou "Novo atendimento" na ficha. Abrir a
   agenda, abrir a ficha, clicar num agendamento ou a passagem da hora nao
   criam nada.

   Com sessao, o servidor e a fonte (RPC criar_atendimento, idempotente por
   operation_id; tabela encounters sob RLS). Sem sessao (localhost, so para
   desenvolvimento) os atendimentos ficam em memoria nesta pagina: nao vao
   para o localStorage, nao entram no backup e nao se misturam com conta.
   =========================================================================== */

(function () {
  "use strict";

  var FUSO_PADRAO = "America/Sao_Paulo";
  var MSG_SEM_ATENDIMENTO = "Selecione ou inicie um atendimento para salvar.";

  var atual = null;          // o atendimento ativo (copia da linha) ou null
  var cache = [];            // todos os atendimentos carregados do servidor
  var carregando = false;
  var ouvintes = [];
  var locais = [];           // modo sem sessao: so em memoria

  var escapar = window.escapar;

  /* ---------- sessao e dados ---------------------------------------------- */

  function temSupa() {
    return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva());
  }

  function tabela() {
    return window.DadosRouter ? window.DadosRouter.from("atendimentos") : null;
  }

  function novoId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function avisar(fn) { ouvintes.forEach(function (o) { try { o(atual); } catch (e) { console.error(e); } }); }

  function emitir() {
    avisar();
    desenharCabecalho();
    if (typeof window.redesenharFicha === "function") window.redesenharFicha();
    if (typeof window.redesenharConsultas === "function") window.redesenharConsultas();
  }

  function ordenar(lista) {
    return lista.slice().sort(function (a, b) {
      return String(b.occurred_at || "").localeCompare(String(a.occurred_at || "")) ||
             String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  }

  /** Le do servidor (com sessao) ou da memoria (sem). Erro de leitura nao
      zera o que ja se tinha. */
  function carregar() {
    if (!temSupa()) { cache = ordenar(locais); return Promise.resolve(cache); }
    var t = tabela();
    if (!t) return Promise.resolve(cache);
    carregando = true;
    return Promise.resolve(t.select("*").order("occurred_at", { ascending: false }))
      .then(function (r) {
        if (r && !r.error && Array.isArray(r.data)) cache = ordenar(r.data);
        /* o ativo acompanha a linha recarregada (updated_at novo, etc.) */
        if (atual) {
          var fresco = porId(atual.id);
          if (fresco) atual = Object.assign({}, fresco);
        }
        return cache;
      })
      .catch(function (e) { console.error("[atendimento] carregar:", e); return cache; })
      .finally(function () { carregando = false; });
  }

  function porId(id) {
    for (var i = 0; i < cache.length; i++) if (cache[i].id === id) return cache[i];
    return null;
  }

  function doPaciente(pid) {
    return cache.filter(function (e) { return e.patient_id === pid; }).map(function (e) { return Object.assign({}, e); });
  }

  /** O atendimento ja vinculado a um agendamento, se houver. */
  function porAgendamento(cid) {
    if (!cid) return null;
    for (var i = 0; i < cache.length; i++) if (cache[i].consultation_id === cid) return Object.assign({}, cache[i]);
    return null;
  }

  /* ---------- fuso ----------------------------------------------------------
     occurred_at e instante absoluto (TIMESTAMPTZ). A tela trabalha com a
     "hora de parede" no fuso de quem atende (profiles.fuso); a conversao e
     feita aqui, nos dois sentidos, sem biblioteca. */

  function fuso() {
    try {
      var p = window.Perfil && window.Perfil.atual ? window.Perfil.atual() : null;
      return (p && p.fuso) || FUSO_PADRAO;
    } catch (e) { return FUSO_PADRAO; }
  }

  function partes(instante, tz) {
    var f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var o = {};
    f.formatToParts(instante).forEach(function (p) { o[p.type] = p.value; });
    return {
      ano: Number(o.year), mes: Number(o.month), dia: Number(o.day),
      hora: Number(o.hour) % 24, min: Number(o.minute), seg: Number(o.second)
    };
  }

  /** Deslocamento (ms) do fuso em relacao a UTC naquele instante. */
  function deslocamento(instante, tz) {
    var p = partes(instante, tz);
    var comoUtc = Date.UTC(p.ano, p.mes - 1, p.dia, p.hora, p.min, p.seg);
    return comoUtc - instante.getTime();
  }

  /** "2026-09-30" + "14:30" no fuso -> ISO absoluto. */
  function paraInstante(data, hora, tz) {
    tz = tz || fuso();
    var d = String(data || "").split("-").map(Number);
    var h = String(hora || "00:00").split(":").map(Number);
    if (d.length < 3 || isNaN(d[0])) return null;
    var chute = Date.UTC(d[0], d[1] - 1, d[2], h[0] || 0, h[1] || 0, 0);
    var utc = chute - deslocamento(new Date(chute), tz);
    utc = chute - deslocamento(new Date(utc), tz);     // segunda passada: borda de horario de verao
    return new Date(utc).toISOString();
  }

  /** ISO absoluto -> { data: "AAAA-MM-DD", hora: "HH:MM" } no fuso. */
  function paraParede(iso, tz) {
    if (!iso) return { data: "", hora: "" };
    var d = new Date(iso);
    if (isNaN(d)) return { data: "", hora: "" };
    var p = partes(d, tz || fuso());
    var dd = function (n) { return String(n).padStart(2, "0"); };
    return { data: p.ano + "-" + dd(p.mes) + "-" + dd(p.dia), hora: dd(p.hora) + ":" + dd(p.min) };
  }

  function rotuloQuando(e) {
    if (!e || !e.occurred_at) return "";
    var w = paraParede(e.occurred_at, e.timezone || fuso());
    return (window.dataBR ? window.dataBR(w.data) : w.data) + " às " + w.hora;
  }

  /* ---------- criar -------------------------------------------------------- */

  /** Cria o atendimento e o torna ativo. `dados`:
        patient_id (obrigatorio), occurred_at (ISO, obrigatorio),
        consultation_id (agendamento de origem, ou null), timezone, type,
        modality, status, summary_text, operation_id (idempotencia).
      Devolve a linha criada. Rejeita com Error quando o servidor recusou. */
  function iniciar(dados) {
    dados = dados || {};
    if (!dados.patient_id) return Promise.reject(new Error("atendimento sem paciente"));
    if (!dados.occurred_at) return Promise.reject(new Error("atendimento sem data/hora clinica"));
    if (window.pacienteArquivado && window.pacienteArquivado(dados.patient_id)) {
      return Promise.reject(new Error(window.MSG_ARQUIVADO || "paciente arquivado"));
    }
    var payload = {
      patient_id: dados.patient_id,
      consultation_id: dados.consultation_id || null,
      occurred_at: dados.occurred_at,
      timezone: dados.timezone || fuso(),
      type: dados.type || null,
      modality: dados.modality || null,
      status: dados.status || "aberto",
      summary_text: dados.summary_text || null,
      operation_id: dados.operation_id || novoId()
    };

    var criado;
    if (!temSupa()) {
      /* idempotencia tambem aqui: a mesma operation_id devolve o mesmo */
      var existente = locais.filter(function (e) { return e.operation_id === payload.operation_id; })[0];
      if (existente) { criado = Promise.resolve(existente); }
      else {
        var agora = new Date().toISOString();
        var linha = Object.assign({ id: novoId(), nutritionist_id: null, created_at: agora, updated_at: agora }, payload);
        locais.push(linha);
        criado = Promise.resolve(linha);
      }
    } else {
      criado = Promise.resolve(window.supabaseClient.rpc("criar_atendimento", { payload: payload }))
        .then(function (r) {
          if (!r || r.error) throw (r && r.error) || new Error("sem resposta do servidor");
          if (!r.data) throw new Error("o servidor nao devolveu o id do atendimento");
          return Promise.resolve(tabela().select("*").eq("id", r.data).single()).then(function (q) {
            if (!q || q.error || !q.data) throw (q && q.error) || new Error("atendimento criado mas nao lido");
            return q.data;
          });
        });
    }

    return criado.then(function (linha) {
      return carregar().then(function () {
        selecionar(porId(linha.id) || linha);
        return Object.assign({}, atual);
      });
    });
  }

  /* ---------- selecionar / limpar ----------------------------------------- */

  function selecionar(e) {
    if (!e) { limpar(); return; }
    var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
    /* nunca paciente A com atendimento de B: se o atendimento e de outra
       pessoa, o paciente ativo passa a ser ela — a troca e explicita */
    if (pid && e.patient_id !== pid && window.definirPacienteAtivo) window.definirPacienteAtivo(e.patient_id);
    atual = Object.assign({}, e);
    emitir();
  }

  function selecionarPorId(id) {
    var e = porId(id);
    if (e) selecionar(e);
    return !!e;
  }

  function limpar() {
    if (!atual) return;
    atual = null;
    emitir();
  }

  /* ---------- editar (controle otimista) -----------------------------------
     Duas abas no mesmo atendimento: a segunda gravacao so passa se o
     updated_at que ela viu ainda e o do servidor (mesmo padrao do cadastro
     do paciente em app.js). Devolve { ok, conflito }. */
  function atualizar(id, mudancas) {
    var e = porId(id);
    if (!e) return Promise.resolve({ ok: false, motivo: "nao_encontrado" });
    var permitidas = ["type", "modality", "status", "summary_text", "occurred_at", "timezone"];
    var m = {};
    Object.keys(mudancas || {}).forEach(function (k) { if (permitidas.indexOf(k) >= 0) m[k] = mudancas[k]; });
    if (!Object.keys(m).length) return Promise.resolve({ ok: true, semMudanca: true });

    if (!temSupa()) {
      var alvo = locais.filter(function (x) { return x.id === id; })[0];
      if (!alvo) return Promise.resolve({ ok: false, motivo: "nao_encontrado" });
      if (alvo.updated_at !== e.updated_at) return Promise.resolve({ ok: false, conflito: true });
      Object.assign(alvo, m, { updated_at: new Date(Date.parse(alvo.updated_at) + 1).toISOString() });
      return carregar().then(function () { if (atual && atual.id === id) atual = Object.assign({}, porId(id)); emitir(); return { ok: true }; });
    }
    return Promise.resolve(tabela().update(m).eq("id", id).eq("updated_at", e.updated_at).select())
      .then(function (r) {
        if (!r || r.error) return { ok: false, motivo: "erro", erro: r && r.error };
        var linhas = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []);
        if (!linhas.length) return { ok: false, conflito: true };
        return carregar().then(function () { if (atual && atual.id === id) atual = Object.assign({}, porId(id)); emitir(); return { ok: true }; });
      });
  }

  /* ---------- a janela "Iniciar / Novo atendimento" ------------------------
     Um so dialogo para os dois caminhos. Mostra o paciente, o agendamento de
     origem (se houver) e pede a data/hora clinica efetiva — pre-preenchida
     com o agendamento ou com agora, no fuso do perfil — antes de criar. */

  function nomeDe(pid) {
    var todos = (window.pacientesTodos && window.pacientesTodos()) || [];
    for (var i = 0; i < todos.length; i++) if (todos[i].id === pid) return todos[i].nome;
    return "Paciente";
  }

  function abrirDialogo(opcoes) {
    opcoes = opcoes || {};
    var pid = opcoes.patient_id || (window.pacienteAtivoId ? window.pacienteAtivoId() : null);
    if (!pid) { if (window.avisar) window.avisar("Selecione um paciente antes de iniciar um atendimento."); return Promise.resolve(null); }
    if (window.pacienteArquivado && window.pacienteArquivado(pid)) {
      if (window.avisar) window.avisar(window.MSG_ARQUIVADO);
      return Promise.resolve(null);
    }
    var c = opcoes.consulta || null;
    var tz = fuso();
    var agora = paraParede(new Date().toISOString(), tz);
    /* Correcao (auditoria Agenda): o atendimento e o que ACONTECEU. Se a
       consulta de origem ainda esta no futuro, a sugestao e agora; data/hora
       no futuro sao recusadas ao confirmar. Consulta ja passada continua
       sugerindo o horario dela (registrar depois e o caso comum). */
    var data = c && c.data ? c.data : agora.data;
    var hora = c && c.hora ? String(c.hora).slice(0, 5) : agora.hora;
    var instC = c ? paraInstante(data, hora, tz) : null;
    if (c && (!instC || new Date(instC).getTime() > Date.now())) { data = agora.data; hora = agora.hora; }
    var noFuturo = function (inst) { return !!inst && new Date(inst).getTime() > Date.now() + 60000; };

    if (!window.abrirModalConfirmar) {
      if (noFuturo(paraInstante(data, hora, tz))) return Promise.resolve(null);
      return iniciar({ patient_id: pid, consultation_id: c ? c.id : null,
        occurred_at: paraInstante(data, hora, tz), timezone: tz, type: c ? c.tipo : null, operation_id: novoId() });
    }
    var corpo =
      '<p><b>Paciente:</b> ' + escapar(nomeDe(pid)) + "</p>" +
      (c ? '<p><b>Agendamento de origem:</b> ' + escapar((window.dataBR ? window.dataBR(c.data) : c.data) + " às " + String(c.hora).slice(0, 5)) +
             (c.tipo ? " &middot; " + escapar(c.tipo) : "") + "</p>"
         : '<p><b>Sem agendamento</b> &mdash; atendimento registrado diretamente na ficha.</p>') +
      '<div class="perf-grade">' +
        '<div class="perf-campo"><label for="at-data">Data clínica</label>' +
          '<input type="date" id="at-data" value="' + escapar(data) + '" max="' + escapar(agora.data) + '"></div>' +
        '<div class="perf-campo"><label for="at-hora">Hora</label>' +
          '<input type="time" id="at-hora" value="' + escapar(hora) + '" step="300"></div>' +
      "</div>" +
      '<p class="perf-ajuda">Fuso: ' + escapar(tz) + ". Nada é gravado até confirmar.</p>";
    var operacao = novoId();      // uma operation_id por abertura do dialogo: reenvio nao duplica
    return window.abrirModalConfirmar({
      titulo: c ? "Iniciar atendimento" : "Novo atendimento",
      corpo: corpo,
      botaoConfirmar: c ? "Iniciar atendimento" : "Criar atendimento",
      classeConfirmar: "btn-verde"
    }).then(function (resp) {
      if (resp !== "confirmar") return null;
      var d = document.getElementById("at-data"), h = document.getElementById("at-hora");
      var dataEsc = d && d.value ? d.value : data;
      var horaEsc = h && h.value ? h.value : hora;
      var quando = paraInstante(dataEsc, horaEsc, tz);
      if (!quando) { if (window.avisar) window.avisar("Informe a data e a hora do atendimento."); return null; }
      if (noFuturo(quando)) {
        if (window.avisar) window.avisar("O atendimento não pode ter data e hora no futuro: registre quando ele acontecer. Nada foi gravado.");
        return null;
      }
      return iniciar({ patient_id: pid, consultation_id: c ? c.id : null, occurred_at: quando,
                       timezone: tz, type: c ? c.tipo : null, operation_id: operacao })
        .then(function (e) {
          if (window.avisar) window.avisar("Atendimento iniciado: " + rotuloQuando(e) + ".");
          return e;
        })
        .catch(function (err) {
          console.error("[atendimento] iniciar:", err);
          if (window.avisar) window.avisar(window.mensagemHumana ? window.mensagemHumana(err)
            : "Não foi possível iniciar o atendimento. Nada foi gravado; tente de novo.");
          return null;
        });
    });
  }

  /* ---------- o cabecalho da ficha ----------------------------------------- */

  function desenharCabecalho() {
    var alvo = document.getElementById("ficha-atendimento");
    if (!alvo) return;
    var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
    var e = atual && pid && atual.patient_id === pid ? atual : null;
    var arquivado = window.pacienteArquivado && window.pacienteArquivado(pid);
    var html = '<span class="fic-at-rot">Atendimento ativo</span>';
    if (e) {
      html += '<b class="fic-at-valor" id="fic-at-valor">' + escapar(rotuloQuando(e)) +
        (e.type ? " &middot; " + escapar(e.type) : "") +
        (e.consultation_id ? ' <i class="fic-at-origem">com agendamento</i>' : ' <i class="fic-at-origem">sem agendamento</i>') + "</b>";
    } else {
      html += '<b class="fic-at-valor vazio" id="fic-at-valor">Nenhum atendimento selecionado</b>';
    }
    html += '<span class="fic-at-acoes">' +
      '<button type="button" class="perf-botao" data-at-acao="selecionar">Selecionar atendimento</button>' +
      (arquivado ? "" : '<button type="button" class="btn-verde" data-at-acao="novo">Iniciar novo atendimento</button>') +
      (e ? '<button type="button" class="btn-fantasma" data-at-acao="limpar">Soltar</button>' : "") +
      "</span>";
    alvo.innerHTML = html;
  }

  function ligarCabecalho() {
    var alvo = document.getElementById("ficha-atendimento");
    if (!alvo) return;
    alvo.addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-at-acao]");
      if (!b) return;
      var acao = b.dataset.atAcao;
      if (acao === "novo") { abrirDialogo({}); return; }
      if (acao === "limpar") { limpar(); return; }
      if (acao === "selecionar") {
        var aba = document.querySelector('[data-aba="consultas"]');
        if (aba) { aba.click(); aba.scrollIntoView({ block: "center" }); }
      }
    });
  }

  /* ---------- ligar ao resto do app ----------------------------------------- */

  document.addEventListener("DOMContentLoaded", function () {
    ligarCabecalho();
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
      /* trocar de paciente solta um atendimento que nao e dele */
      if (atual && atual.patient_id !== pid) { atual = null; avisar(); }
      desenharCabecalho();
    };
    carregar().then(desenharCabecalho);
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
      window.HoloAuth.aoMudarEstado(function (estado) {
        if (estado === "pendente") return;
        if (estado !== "autenticado") { atual = null; cache = []; }
        carregar().then(desenharCabecalho);
      });
    }
  });

  window.AtendimentoAtual = {
    MSG_SEM_ATENDIMENTO: MSG_SEM_ATENDIMENTO,
    /** O atendimento ativo (copia) — ou null. So vale para o paciente ativo. */
    atual: function () {
      var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
      return atual && (!pid || atual.patient_id === pid) ? Object.assign({}, atual) : null;
    },
    /** O id do atendimento ativo DESTE paciente, ou null. */
    idPara: function (pid) {
      return atual && atual.patient_id === pid ? atual.id : null;
    },
    carregando: function () { return carregando; },
    iniciar: iniciar,
    abrirDialogo: abrirDialogo,
    selecionar: selecionar,
    selecionarPorId: selecionarPorId,
    limpar: limpar,
    atualizar: atualizar,
    carregar: carregar,
    todos: function () { return cache.map(function (e) { return Object.assign({}, e); }); },
    doPaciente: doPaciente,
    porId: function (id) { var e = porId(id); return e ? Object.assign({}, e) : null; },
    porAgendamento: porAgendamento,
    fuso: fuso,
    paraInstante: paraInstante,
    paraParede: paraParede,
    rotuloQuando: rotuloQuando,
    aoMudar: function (fn) { if (typeof fn === "function") ouvintes.push(fn); },
    desenharCabecalho: desenharCabecalho,
    /** Logout: nada da conta que saiu fica em memoria. */
    esquecer: function () { atual = null; cache = []; locais = []; desenharCabecalho(); }
  };
})();
