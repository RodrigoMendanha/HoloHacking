/* ===========================================================================
   LOGIN — a tela de entrada da plataforma
   ===========================================================================

   Autenticacao real via Supabase Auth (signInWithPassword). AuthService
   continua sendo o unico ponto que fala com o mundo — so que agora o corpo
   de entrar() de fato conversa com o Supabase, em vez de devolver
   SEM_SERVIDOR sempre. A View (o resto deste arquivo) nao mudou de forma:
   ainda le { ok, motivo, mensagem } e nao sabe (nem precisa saber) que virou
   uma chamada de rede de verdade.

   A SESSAO
   supabase-js guarda o token em localStorage por conta propria (chave
   sb-<ref>-auth-token) e cuida de renovar sozinho (autoRefreshToken). Este
   arquivo nao le nem escreve esse token — so reage a onAuthStateChange e a
   getSession() no carregamento da pagina.

   A SENHA
   Continua sem sair daqui: vai direto de campoSenha.value para
   signInWithPassword, nunca para localStorage, dataset ou console.

   O BYPASS DE DESENVOLVIMENTO
   So funciona em localhost/127.0.0.1 — tanto na aparencia (o bloco some do
   HTML fora desses hosts) quanto no clique (o handler recusa mesmo que
   alguem reative o botao via devtools). Em producao a unica porta e uma
   sessao Supabase valida.
   =========================================================================== */

(function () {
  "use strict";

  /* ================================================================ AMBIENTE ==
     Onde o atalho de desenvolvimento pode existir. Checado duas vezes: uma
     vez para decidir se o bloco aparece, outra vez dentro do proprio clique
     — a segunda e a que importa de verdade, porque HTML escondido nao
     protege nada de quem abre o devtools. */

  function ambienteLocal() {
    var h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "";
  }

  function recuperarSenhaUrl() {
    if (ambienteLocal()) return window.location.origin;
    return "https://holohacking.com.br";
  }

  /* =========================================================== AUTHSERVICE ==
     A fronteira com o Supabase. Devolve sempre a mesma forma de resposta —
     { ok, motivo, mensagem } — para que a View nunca precise saber se veio
     de uma chamada real ou (nos testes) de um stub. */

  function mensagemDeErro(error) {
    var msg = (error && error.message) || "";
    if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
    if (/user not found/i.test(msg)) return "E-mail ou senha incorretos.";
    if (/email not confirmed/i.test(msg)) return "Esta conta ainda não confirmou o e-mail.";
    if (/too many requests|rate limit/i.test(msg)) return "Muitas tentativas seguidas. Aguarde um instante e tente de novo.";
    if (/new password should be different/i.test(msg)) return "A nova senha deve ser diferente da anterior.";
    if (/password.*at least|password.*too short|at least 6/i.test(msg)) return "A senha deve ter pelo menos 6 caracteres.";
    if (/network|fetch|failed to fetch|load failed/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet.";
    return "Não foi possível entrar. Tente novamente.";
  }

  /* ====================================================== LIMPEZA DE DADOS ==
     Chamado quando a sessao encerra (SIGNED_OUT). Remove dados clinicos do
     localStorage para que uma troca de conta nao exponha dados de A para B.
     NAO toca nas chaves sb-*-auth-token — o Supabase cuida dessas. */

  function limparEstadoLocal() {
    var chaves = [
      "holohacking.dados.pacientes", "holohacking.dados.holoscan",
      "holohacking.dados.oq3", "holohacking.dados.pqq",
      "holohacking.dados.consultas", "holohacking.dados.bloqueios",
      "holohacking.dados.aplicacoes", "holohacking.dados.perfil",
      "holohacking.pontuacao", "holohacking.questionario",
      "holohacking.ferramentas", "holohacking.exames",
      "holohacking.agenda"
    ];
    try {
      chaves.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* navegador em modo privado */ }
    try {
      indexedDB.deleteDatabase("holohacking");
    } catch (e) { /* ambiente sem IndexedDB */ }
    if (window.limparEstadoApp) window.limparEstadoApp();
    if (window.limparEstadoPerfil) window.limparEstadoPerfil();
  }

  window.AuthService = {
    entrar: function (credenciais) {
      if (!window.supabaseClient) {
        return Promise.resolve({
          ok: false,
          motivo: "SEM_CLIENTE",
          mensagem: "Autenticação não está configurada neste ambiente."
        });
      }
      return window.supabaseClient.auth
        .signInWithPassword({ email: credenciais.email, password: credenciais.senha })
        .then(function (r) {
          if (r.error) {
            return { ok: false, motivo: r.error.name || "ERRO_AUTH", mensagem: mensagemDeErro(r.error) };
          }
          return { ok: true, motivo: null, mensagem: "", sessao: r.data.session };
        });
    },

    recuperarSenha: function (email) {
      if (!window.supabaseClient) {
        return Promise.resolve({
          ok: false, motivo: "SEM_CLIENTE",
          mensagem: "Autenticação não está configurada neste ambiente."
        });
      }
      if (!email) {
        return Promise.resolve({
          ok: false, motivo: "EMAIL_VAZIO",
          mensagem: "Informe o e-mail."
        });
      }
      return window.supabaseClient.auth
        .resetPasswordForEmail(email, { redirectTo: recuperarSenhaUrl() })
        .then(function () {
          return {
            ok: true, motivo: null,
            mensagem: "Se houver uma conta associada a este e-mail, enviaremos as instruções."
          };
        })
        .catch(function () {
          return {
            ok: true, motivo: null,
            mensagem: "Se houver uma conta associada a este e-mail, enviaremos as instruções."
          };
        });
    },

    trocarSenha: function (novaSenha) {
      if (!window.supabaseClient) {
        return Promise.resolve({
          ok: false, motivo: "SEM_CLIENTE",
          mensagem: "Autenticação não está configurada neste ambiente."
        });
      }
      return window.supabaseClient.auth
        .updateUser({ password: novaSenha })
        .then(function (r) {
          if (r.error) {
            return { ok: false, motivo: r.error.name || "ERRO_AUTH", mensagem: mensagemDeErro(r.error) };
          }
          return { ok: true, motivo: null, mensagem: "Senha alterada com sucesso." };
        });
    }
  };

  /* =============================================================== HOLOAUTH ==
     O estado de sessao, para quem mais no app precisar saber "existe uma
     pessoa autenticada agora?" sem falar com o Supabase diretamente —
     dados-router.js usa isto para decidir se a tabela `pacientes` vai para o
     Supabase ou continua local. */

  var sessaoAtual = null;   // objeto Session do supabase-js, ou null
  var prontoParaAvisar = false;

  var estadoAuth = "pendente";   // "pendente" | "autenticado" | "nao_autenticado"
  var ouvintesDeEstado = [];

  function definirEstadoAuth(novo) {
    if (estadoAuth === novo) return;
    estadoAuth = novo;
    ouvintesDeEstado.forEach(function (fn) {
      try { fn(estadoAuth); } catch (e) { /* um ouvinte quebrado nao pode travar os outros */ }
    });
  }

  window.HoloAuth = {
    estado: function () { return estadoAuth; },
    sessaoAtiva: function () { return estadoAuth === "autenticado"; },
    usuarioAtual: function () { return sessaoAtual ? sessaoAtual.user : null; },
    aoMudarEstado: function (fn) {
      ouvintesDeEstado.push(fn);
      if (estadoAuth !== "pendente") fn(estadoAuth);
    },
    sair: function () {
      if (!window.supabaseClient) return Promise.resolve({ ok: false });
      return window.supabaseClient.auth.signOut().then(function (r) {
        return { ok: !r.error, error: r.error || null };
      });
    }
  };

  /* ============================================================= LOGINVIEW ==
     So tela: le campos, valida formato, mostra estado. A decisao de quem
     pode entrar e do Supabase (signInWithPassword + RLS do outro lado) —
     aqui so se reage ao resultado. */

  var form, campoEmail, campoSenha, btnOlho, btnEntrar, areaMensagem,
      erroEmail, erroSenha, linkEsqueci, camada, saidaDev, blocoDev;
  var loginCabecalho;

  // Recuperacao de senha
  var telaRecuperar, formRecuperar, campoRecuperarEmail, btnRecuperar,
      recuperarMensagem, erroRecuperarEmail, linkVoltarLogin;

  // Nova senha (apos clicar no link de recuperacao)
  var telaNovaSenha, formNovaSenha, campoNovaSenha, campoConfirmarSenha,
      btnNovaSenha, novaSenhaMensagem, erroNovaSenha, erroConfirmarSenha,
      btnOlhoNova;

  var enviando = false;
  var modoRecuperacao = false;

  function pareceEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function limparErros() {
    [[campoEmail, erroEmail], [campoSenha, erroSenha]].forEach(function (par) {
      par[0].removeAttribute("aria-invalid");
      par[1].textContent = "";
      par[1].hidden = true;
    });
  }

  function marcarErro(campo, alvo, texto) {
    campo.setAttribute("aria-invalid", "true");
    alvo.textContent = texto;
    alvo.hidden = false;
  }

  function mensagem(texto, tipo) {
    areaMensagem.className = "login-mensagem" + (tipo ? " " + tipo : "");
    areaMensagem.hidden = !texto;
    areaMensagem.textContent = texto || "";
  }

  function mensagemEm(el, texto, tipo) {
    if (!el) return;
    el.className = "login-mensagem" + (tipo ? " " + tipo : "");
    el.hidden = !texto;
    el.textContent = texto || "";
  }

  function validar() {
    limparErros();
    var email = campoEmail.value.trim();
    var senha = campoSenha.value;
    var primeiro = null;

    if (!email) {
      marcarErro(campoEmail, erroEmail, "Informe o e-mail.");
      primeiro = primeiro || campoEmail;
    } else if (!pareceEmail(email)) {
      marcarErro(campoEmail, erroEmail, "Informe um e-mail válido.");
      primeiro = primeiro || campoEmail;
    }
    if (!senha) {
      marcarErro(campoSenha, erroSenha, "Informe a senha.");
      primeiro = primeiro || campoSenha;
    }
    if (primeiro) {
      primeiro.focus();
      return null;
    }
    return { email: email, senha: senha, manterConectado: !!form.manter.checked };
  }

  function carregando(ligado) {
    enviando = ligado;
    btnEntrar.disabled = ligado;
    btnEntrar.setAttribute("aria-busy", ligado ? "true" : "false");
    camada.classList.toggle("enviando", ligado);
  }

  function carregandoRecuperar(ligado) {
    enviando = ligado;
    if (btnRecuperar) {
      btnRecuperar.disabled = ligado;
      btnRecuperar.setAttribute("aria-busy", ligado ? "true" : "false");
    }
    camada.classList.toggle("enviando", ligado);
  }

  function carregandoNovaSenha(ligado) {
    enviando = ligado;
    if (btnNovaSenha) {
      btnNovaSenha.disabled = ligado;
      btnNovaSenha.setAttribute("aria-busy", ligado ? "true" : "false");
    }
    camada.classList.toggle("enviando", ligado);
  }

  /* ---------- alternar entre telas internas do cartao ---------------------- */

  function mostrarLogin() {
    if (loginCabecalho) loginCabecalho.hidden = false;
    form.hidden = false;
    if (telaRecuperar) telaRecuperar.hidden = true;
    if (telaNovaSenha) telaNovaSenha.hidden = true;
    if (blocoDev) blocoDev.hidden = !ambienteLocal();
    var rodape = document.querySelector(".login-rodape");
    if (rodape) rodape.hidden = false;
  }

  function mostrarRecuperar() {
    if (loginCabecalho) loginCabecalho.hidden = true;
    form.hidden = true;
    if (telaRecuperar) telaRecuperar.hidden = false;
    if (telaNovaSenha) telaNovaSenha.hidden = true;
    if (blocoDev) blocoDev.hidden = true;
    var rodape = document.querySelector(".login-rodape");
    if (rodape) rodape.hidden = true;
    mensagemEm(recuperarMensagem, "", null);
    if (campoRecuperarEmail) {
      campoRecuperarEmail.value = campoEmail ? campoEmail.value.trim() : "";
      campoRecuperarEmail.focus();
    }
  }

  function mostrarNovaSenha() {
    if (loginCabecalho) loginCabecalho.hidden = true;
    form.hidden = true;
    if (telaRecuperar) telaRecuperar.hidden = true;
    if (telaNovaSenha) telaNovaSenha.hidden = false;
    if (blocoDev) blocoDev.hidden = true;
    var rodape = document.querySelector(".login-rodape");
    if (rodape) rodape.hidden = true;
    mensagemEm(novaSenhaMensagem, "", null);
    if (campoNovaSenha) {
      campoNovaSenha.value = "";
      if (campoConfirmarSenha) campoConfirmarSenha.value = "";
      campoNovaSenha.focus();
    }
  }

  /* ---------- abrir/fechar o app --------------------------------------- */

  function liberarApp() {
    modoRecuperacao = false;
    camada.hidden = true;
    document.body.classList.remove("login-aberto");
    document.getElementById("app").removeAttribute("aria-hidden");
  }

  function bloquearApp() {
    camada.hidden = false;
    document.body.classList.add("login-aberto");
    document.getElementById("app").setAttribute("aria-hidden", "true");
    if (!modoRecuperacao) {
      mostrarLogin();
      mensagem("", null);
      if (campoSenha) campoSenha.value = "";
      if (campoEmail) campoEmail.focus();
    }
  }

  /* ---------- handlers de formulario --------------------------------------- */

  function aoEnviar(e) {
    e.preventDefault();
    if (enviando) return;

    var credenciais = validar();
    if (!credenciais) {
      mensagem("", null);
      return;
    }

    mensagem("", null);
    carregando(true);

    window.AuthService.entrar(credenciais)
      .then(function (r) {
        if (r.ok) {
          mensagem("", null);
          liberarApp();
        } else {
          mensagem(r.mensagem, "aviso");
        }
      })
      .catch(function () {
        mensagem("Não foi possível falar com o servidor.", "aviso");
      })
      .then(function () {
        carregando(false);
        credenciais = null;
      });
  }

  function alternarVisibilidade(campo, botao) {
    var escondida = campo.type === "password";
    campo.type = escondida ? "text" : "password";
    botao.setAttribute("aria-pressed", escondida ? "true" : "false");
    botao.setAttribute("aria-label", escondida ? "Ocultar senha" : "Mostrar senha");
    botao.classList.toggle("revelada", escondida);
    var fim = campo.value.length;
    campo.focus();
    try { campo.setSelectionRange(fim, fim); } catch (e) { /* type=text nem sempre aceita */ }
  }

  function alternarSenha() {
    alternarVisibilidade(campoSenha, btnOlho);
  }

  function aoEsquecer(e) {
    e.preventDefault();
    mostrarRecuperar();
  }

  function aoVoltarLogin(e) {
    e.preventDefault();
    mostrarLogin();
    if (campoEmail) campoEmail.focus();
  }

  function aoEnviarRecuperacao(e) {
    e.preventDefault();
    if (enviando) return;

    var email = campoRecuperarEmail.value.trim();
    campoRecuperarEmail.removeAttribute("aria-invalid");
    if (erroRecuperarEmail) { erroRecuperarEmail.textContent = ""; erroRecuperarEmail.hidden = true; }

    if (!email) {
      marcarErro(campoRecuperarEmail, erroRecuperarEmail, "Informe o e-mail.");
      campoRecuperarEmail.focus();
      return;
    }
    if (!pareceEmail(email)) {
      marcarErro(campoRecuperarEmail, erroRecuperarEmail, "Informe um e-mail válido.");
      campoRecuperarEmail.focus();
      return;
    }

    carregandoRecuperar(true);
    mensagemEm(recuperarMensagem, "", null);

    window.AuthService.recuperarSenha(email)
      .then(function (r) {
        mensagemEm(recuperarMensagem, r.mensagem, r.ok ? "ok" : "aviso");
      })
      .catch(function () {
        mensagemEm(recuperarMensagem, "Não foi possível falar com o servidor.", "aviso");
      })
      .then(function () {
        carregandoRecuperar(false);
      });
  }

  function aoEnviarNovaSenha(e) {
    e.preventDefault();
    if (enviando) return;

    var nova = campoNovaSenha.value;
    var confirmar = campoConfirmarSenha.value;

    campoNovaSenha.removeAttribute("aria-invalid");
    campoConfirmarSenha.removeAttribute("aria-invalid");
    if (erroNovaSenha) { erroNovaSenha.textContent = ""; erroNovaSenha.hidden = true; }
    if (erroConfirmarSenha) { erroConfirmarSenha.textContent = ""; erroConfirmarSenha.hidden = true; }

    var primeiro = null;
    if (!nova) {
      marcarErro(campoNovaSenha, erroNovaSenha, "Informe a nova senha.");
      primeiro = primeiro || campoNovaSenha;
    } else if (nova.length < 6) {
      marcarErro(campoNovaSenha, erroNovaSenha, "A senha deve ter pelo menos 6 caracteres.");
      primeiro = primeiro || campoNovaSenha;
    }
    if (!confirmar) {
      marcarErro(campoConfirmarSenha, erroConfirmarSenha, "Confirme a nova senha.");
      primeiro = primeiro || campoConfirmarSenha;
    } else if (nova && confirmar !== nova) {
      marcarErro(campoConfirmarSenha, erroConfirmarSenha, "As senhas não coincidem.");
      primeiro = primeiro || campoConfirmarSenha;
    }
    if (primeiro) {
      primeiro.focus();
      return;
    }

    carregandoNovaSenha(true);
    mensagemEm(novaSenhaMensagem, "", null);

    window.AuthService.trocarSenha(nova)
      .then(function (r) {
        if (r.ok) {
          mensagemEm(novaSenhaMensagem, "Senha alterada com sucesso. Entrando…", "ok");
          setTimeout(function () {
            modoRecuperacao = false;
            liberarApp();
          }, 1500);
        } else {
          mensagemEm(novaSenhaMensagem, r.mensagem, "aviso");
        }
      })
      .catch(function () {
        mensagemEm(novaSenhaMensagem, "Não foi possível alterar a senha.", "aviso");
      })
      .then(function () {
        carregandoNovaSenha(false);
      });
  }

  /* A saida de desenvolvimento. So existe (visivel e funcional) em
     localhost/127.0.0.1 — ambienteLocal() decide os dois. Fora dali o clique
     nao faz nada, mesmo que o bloco seja reexibido via devtools. */
  function sairParaOApp(e) {
    if (e) e.preventDefault();
    if (!ambienteLocal()) return;
    liberarApp();
  }

  /* ---------- sessao: restaurar, reagir a mudanca ----------------------- */

  function verificarSessaoInicial() {
    if (!window.supabaseClient) { definirEstadoAuth("nao_autenticado"); campoEmail.focus(); return; }
    window.supabaseClient.auth.getSession().then(function (r) {
      var sessao = r && r.data && r.data.session;
      sessaoAtual = sessao || null;
      prontoParaAvisar = true;
      definirEstadoAuth(sessao ? "autenticado" : "nao_autenticado");
      if (sessao && !modoRecuperacao) liberarApp();
      else if (!modoRecuperacao) campoEmail.focus();
    });
  }

  function ligarOuvinteDeSessao() {
    if (!window.supabaseClient) return;
    window.supabaseClient.auth.onAuthStateChange(function (evento, sessao) {
      sessaoAtual = sessao || null;
      if (!prontoParaAvisar) return; // INITIAL_SESSION ja tratado por verificarSessaoInicial

      if (evento === "PASSWORD_RECOVERY") {
        modoRecuperacao = true;
        definirEstadoAuth("autenticado");
        bloquearApp();
        mostrarNovaSenha();
        return;
      }

      if (evento === "SIGNED_OUT") {
        limparEstadoLocal();
        definirEstadoAuth("nao_autenticado");
        bloquearApp();
      } else if (sessao && (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED" || evento === "USER_UPDATED")) {
        definirEstadoAuth("autenticado");
        if (!modoRecuperacao) liberarApp();
      }
    });
  }

  /* ---------- "Sair da conta" no rodape da sidebar ----------------------
     O rodape (Profissional/Nutricionista) e desenhado por perfil.js, mas
     este botao especifico e so de autenticacao — mora aqui, do lado do
     resto do estado de auth, e reage a aoMudarEstado como tudo mais.
     Chama HoloAuth.sair() direto: e a mesma funcao que a aba Conta usa,
     nenhuma segunda implementacao. */
  function ligarSaidaSidebar() {
    var botao = document.getElementById("sr-sair");
    if (!botao) return;
    botao.addEventListener("click", function () { window.HoloAuth.sair(); });
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
      window.HoloAuth.aoMudarEstado(function (estado) {
        botao.hidden = estado !== "autenticado";
      });
    }
  }

  function iniciar() {
    camada = document.getElementById("tela-login");
    if (!camada) return;
    form = document.getElementById("form-login");
    campoEmail = document.getElementById("login-email");
    campoSenha = document.getElementById("login-senha");
    btnOlho = document.getElementById("btn-olho");
    btnEntrar = document.getElementById("btn-entrar");
    areaMensagem = document.getElementById("login-mensagem");
    erroEmail = document.getElementById("erro-email");
    erroSenha = document.getElementById("erro-senha");
    linkEsqueci = document.getElementById("link-esqueci");
    saidaDev = document.getElementById("saida-dev");
    blocoDev = document.querySelector(".login-dev");
    loginCabecalho = document.getElementById("login-cabecalho");

    // Elementos da tela de recuperacao
    telaRecuperar = document.getElementById("tela-recuperar");
    formRecuperar = document.getElementById("form-recuperar");
    campoRecuperarEmail = document.getElementById("recuperar-email");
    btnRecuperar = document.getElementById("btn-recuperar");
    recuperarMensagem = document.getElementById("recuperar-mensagem");
    erroRecuperarEmail = document.getElementById("erro-recuperar-email");
    linkVoltarLogin = document.getElementById("link-voltar-login");

    // Elementos da tela de nova senha
    telaNovaSenha = document.getElementById("tela-nova-senha");
    formNovaSenha = document.getElementById("form-nova-senha");
    campoNovaSenha = document.getElementById("nova-senha");
    campoConfirmarSenha = document.getElementById("confirmar-senha");
    btnNovaSenha = document.getElementById("btn-nova-senha");
    novaSenhaMensagem = document.getElementById("nova-senha-mensagem");
    erroNovaSenha = document.getElementById("erro-nova-senha");
    erroConfirmarSenha = document.getElementById("erro-confirmar-senha");
    btnOlhoNova = document.getElementById("btn-olho-nova");

    // Formulario de login
    form.addEventListener("submit", aoEnviar);
    btnOlho.addEventListener("click", alternarSenha);
    linkEsqueci.addEventListener("click", aoEsquecer);
    if (saidaDev) saidaDev.addEventListener("click", sairParaOApp);

    // Formulario de recuperacao
    if (formRecuperar) formRecuperar.addEventListener("submit", aoEnviarRecuperacao);
    if (linkVoltarLogin) linkVoltarLogin.addEventListener("click", aoVoltarLogin);

    // Formulario de nova senha
    if (formNovaSenha) formNovaSenha.addEventListener("submit", aoEnviarNovaSenha);
    if (btnOlhoNova && campoNovaSenha) {
      btnOlhoNova.addEventListener("click", function () {
        alternarVisibilidade(campoNovaSenha, btnOlhoNova);
      });
    }

    // Limpar erros ao digitar — recuperacao
    if (campoRecuperarEmail) {
      campoRecuperarEmail.addEventListener("input", function () {
        if (campoRecuperarEmail.getAttribute("aria-invalid")) {
          campoRecuperarEmail.removeAttribute("aria-invalid");
          if (erroRecuperarEmail) { erroRecuperarEmail.textContent = ""; erroRecuperarEmail.hidden = true; }
        }
      });
    }

    // Limpar erros ao digitar — nova senha
    [campoNovaSenha, campoConfirmarSenha].forEach(function (c) {
      if (!c) return;
      c.addEventListener("input", function () {
        if (c.getAttribute("aria-invalid")) {
          c.removeAttribute("aria-invalid");
          var alvo = c === campoNovaSenha ? erroNovaSenha : erroConfirmarSenha;
          if (alvo) { alvo.textContent = ""; alvo.hidden = true; }
        }
      });
    });

    if (blocoDev && !ambienteLocal()) blocoDev.hidden = true;

    [campoEmail, campoSenha].forEach(function (c) {
      c.addEventListener("input", function () {
        if (c.getAttribute("aria-invalid")) {
          c.removeAttribute("aria-invalid");
          var alvo = c === campoEmail ? erroEmail : erroSenha;
          alvo.textContent = "";
          alvo.hidden = true;
        }
      });
    });

    document.body.classList.add("login-aberto");
    document.getElementById("app").setAttribute("aria-hidden", "true");

    ligarOuvinteDeSessao();
    ligarSaidaSidebar();
    verificarSessaoInicial();
  }

  /* Exposto para os testes e para telas que precisem forcar a entrada (ex.:
     N de testar-login.mjs, que confere que as telas clinicas nao mudaram) —
     nao para esconder atalho: o botao da saida esta visivel na tela, com o
     nome do que ele faz, e so existe em ambiente local. */
  window.LoginView = { abrirApp: liberarApp };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
