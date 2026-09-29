/* ===========================================================================
   METANUTRI — o mentor de NEGOCIO da nutricionista, dentro do app
   ===========================================================================

   Precificacao, captacao, posicionamento e consultorio. Nao e clinico.

   O caminho de cada fala:
     tela --(JWT da sessao)--> edge function holos-ai --(chave)--> hub
   A chave do hub mora so no secret da funcao; aqui nao ha chave nenhuma.

   A conversa vive SO na memoria desta tela: nao vai para o banco, nem para
   localStorage/IndexedDB. Sair da conta ou recarregar a pagina apaga tudo.
   O corpo de cada pedido e so {mensagem, historico} — nada de paciente.
   =========================================================================== */

(function () {
  "use strict";

  var MAX_MENSAGEM = 2000;
  var MAX_HISTORICO = 20;
  var TETO_MS = 70000;   // a funcao corta em 60 s; aqui so uma rede de seguranca

  var FRASES = {
    sem_login: "Entre na sua conta do HoloHacking pra falar com o MetaNutri.",
    hub_fora: "Não consegui falar com o MetaNutri agora. Tente de novo em instantes.",
    tempo_esgotado: "O MetaNutri demorou demais pra responder. Tente de novo em instantes.",
    paciente: "Tire o nome do paciente da pergunta. O MetaNutri é mentor de negócio e não recebe dado de paciente."
  };

  /* estado — so em memoria */
  var historico = [];      // [{autor: "visitante"|"agente", texto}] das trocas que deram certo
  var pendente = null;     // a pergunta que falhou, para "Tentar de novo"
  var enviando = false;

  function $(id) { return document.getElementById(id); }

  function autenticado() {
    return !!(window.HoloAuth && window.HoloAuth.sessaoAtiva());
  }

  /* ------------------------------------------------------------ rede --- */

  function urlDaFuncao() {
    var p = window.supabaseProjeto;
    return p && p.url ? p.url.replace(/\/+$/, "") + "/functions/v1/holos-ai" : null;
  }

  function tokenDaSessao() {
    var c = window.supabaseClient;
    if (!c || !c.auth || typeof c.auth.getSession !== "function") return Promise.resolve(null);
    return Promise.resolve(c.auth.getSession()).then(function (r) {
      var s = r && r.data && r.data.session;
      return s && s.access_token ? s.access_token : null;
    }, function () { return null; });
  }

  /** Devolve sempre {texto} ou {motivo, frase}. Nunca lanca. */
  function perguntar(mensagem, falas) {
    var url = urlDaFuncao();
    if (!url) return Promise.resolve({ motivo: "hub_fora", frase: FRASES.hub_fora });
    return tokenDaSessao().then(function (token) {
      if (!token) return { motivo: "sem_login", frase: FRASES.sem_login };
      var controle = typeof AbortController === "function" ? new AbortController() : null;
      var estourou = false;
      var relogio = setTimeout(function () { estourou = true; if (controle) controle.abort(); }, TETO_MS);
      var p = window.supabaseProjeto || {};
      return fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
          "apikey": p.chavePublica || ""
        },
        body: JSON.stringify({ mensagem: mensagem, historico: falas }),
        signal: controle ? controle.signal : undefined
      }).then(function (r) {
        return r.text().then(function (t) {
          var d = null;
          try { d = JSON.parse(t); } catch (e) { d = null; }
          if (d && typeof d.texto === "string" && d.texto.trim()) return { texto: d.texto };
          if (d && typeof d.frase === "string" && d.frase.trim()) {
            return { motivo: String(d.motivo || "hub_fora"), frase: d.frase };
          }
          if (r.status === 401) return { motivo: "sem_login", frase: FRASES.sem_login };
          return { motivo: "hub_fora", frase: FRASES.hub_fora };
        });
      }).catch(function () {
        return estourou
          ? { motivo: "tempo_esgotado", frase: FRASES.tempo_esgotado }
          : { motivo: "hub_fora", frase: FRASES.hub_fora };
      }).then(function (res) { clearTimeout(relogio); return res; });
    });
  }

  /* ------------------------------------------------- dado de paciente --- */

  function normalizar(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }

  /** O nome completo de algum paciente da conta aparece na pergunta? */
  function citaPaciente(texto) {
    var todos = typeof window.pacientesTodos === "function" ? (window.pacientesTodos() || []) : [];
    var alvo = " " + normalizar(texto) + " ";
    return todos.some(function (p) {
      var n = normalizar(p && p.nome);
      return n.indexOf(" ") > 0 && alvo.indexOf(" " + n + " ") >= 0;
    });
  }

  /* ------------------------------------------------------------ tela --- */

  function bolha(classe, texto) {
    var b = document.createElement("div");
    b.className = "mn-fala " + classe;
    b.textContent = texto;
    return b;
  }

  function rolarParaFim() {
    var c = $("mn-conversa");
    if (c) c.scrollTop = c.scrollHeight;
  }

  function limparEstados() {
    var c = $("mn-conversa");
    if (!c) return;
    c.querySelectorAll(".mn-carregando, .mn-erro").forEach(function (n) { n.remove(); });
  }

  function mostrarCarregando() {
    var b = bolha("mn-agente mn-carregando", "MetaNutri está pensando…");
    b.setAttribute("role", "status");
    $("mn-conversa").appendChild(b);
    rolarParaFim();
  }

  function mostrarErro(frase, semTentar) {
    var caixa = document.createElement("div");
    caixa.className = "mn-fala mn-erro";
    caixa.setAttribute("role", "alert");
    var p = document.createElement("p");
    p.className = "mn-erro-frase";
    p.textContent = frase;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn-fantasma mn-tentar";
    b.id = "mn-tentar";
    b.textContent = "Tentar de novo";
    b.addEventListener("click", function () { if (pendente) enviar(pendente, true); });
    caixa.appendChild(p);
    if (!semTentar) caixa.appendChild(b);
    $("mn-conversa").appendChild(caixa);
    rolarParaFim();
  }

  function travar(sim) {
    enviando = sim;
    var botao = $("mn-enviar");
    if (botao) botao.disabled = sim;
    var campo = $("mn-mensagem");
    if (campo) campo.setAttribute("aria-busy", sim ? "true" : "false");
  }

  function atualizarContador() {
    var campo = $("mn-mensagem"), cont = $("mn-contador");
    if (campo && cont) cont.textContent = campo.value.length + "/" + MAX_MENSAGEM;
  }

  /** Envia `texto`. De novo = "Tentar de novo": a bolha da pergunta ja esta na tela. */
  function enviar(texto, deNovo) {
    if (enviando) return;
    texto = String(texto || "").trim();
    if (!texto) return;
    limparEstados();
    if (texto.length > MAX_MENSAGEM) { mostrarErro("Escreva uma pergunta de até 2000 caracteres.", true); return; }
    if (citaPaciente(texto)) { mostrarErro(FRASES.paciente, true); return; }

    if (!deNovo) {
      $("mn-conversa").appendChild(bolha("mn-visitante", texto));
      var campo = $("mn-mensagem");
      if (campo) { campo.value = ""; atualizarContador(); }
    }
    pendente = texto;
    travar(true);
    mostrarCarregando();

    var falas = historico.slice(-MAX_HISTORICO);
    var contaNoEnvio = contaAtual();
    perguntar(texto, falas).then(function (res) {
      if (contaAtual() !== contaNoEnvio) return;   // saiu/trocou de conta no meio
      limparEstados();
      travar(false);
      if (res.texto) {
        historico.push({ autor: "visitante", texto: texto });
        historico.push({ autor: "agente", texto: res.texto });
        historico = historico.slice(-MAX_HISTORICO);
        pendente = null;
        $("mn-conversa").appendChild(bolha("mn-agente", res.texto));
        rolarParaFim();
      } else {
        mostrarErro(res.frase || FRASES.hub_fora);
      }
    });
  }

  function contaAtual() {
    var u = window.HoloAuth && window.HoloAuth.usuarioAtual && window.HoloAuth.usuarioAtual();
    return u && u.id ? u.id : null;
  }

  /** Apaga a conversa inteira (troca de conta, saida). */
  function esquecer() {
    historico = [];
    pendente = null;
    travar(false);
    var c = $("mn-conversa");
    if (c) c.innerHTML = "";
    var campo = $("mn-mensagem");
    if (campo) { campo.value = ""; atualizarContador(); }
  }

  /** A entrada so aparece para quem esta logada. */
  function mostrarEntrada() {
    var logada = autenticado();
    var item = $("nav-metanutri");
    if (item) item.hidden = !logada;
    var grupo = $("nav-grupo-metanutri");
    if (grupo) grupo.hidden = !logada;
    var titulo = $("nav-titulo-metanutri");
    if (titulo) titulo.hidden = !logada;
    if (!logada) {
      esquecer();
      var secao = $("secao-metanutri");
      if (secao && secao.classList.contains("ativa") && window.irParaSecao) window.irParaSecao("dashboard");
    }
  }

  function iniciar() {
    var form = $("mn-form");
    if (!form) return;
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      enviar($("mn-mensagem").value, false);
    });
    var campo = $("mn-mensagem");
    campo.addEventListener("input", atualizarContador);
    campo.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
        ev.preventDefault();
        enviar(campo.value, false);
      }
    });
    atualizarContador();
    mostrarEntrada();

    var contaVista = null;
    function aoMudar() {
      var agora = contaAtual();
      if (agora !== contaVista) { esquecer(); contaVista = agora; }
      mostrarEntrada();
    }
    /* login.js carrega depois deste arquivo */
    var tentativas = 0;
    (function ligar() {
      if (window.HoloAuth && window.HoloAuth.aoMudarEstado) { window.HoloAuth.aoMudarEstado(aoMudar); return; }
      if (++tentativas < 100) setTimeout(ligar, 50);
    })();
  }

  window.MetaNutri = {
    perguntar: perguntar,
    historico: function () { return historico.slice(); },
    esquecer: esquecer
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
