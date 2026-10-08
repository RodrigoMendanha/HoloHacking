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
    if (/password.*at least|password.*too short|at least \d|weak.*password/i.test(msg)) return "A senha deve ter pelo menos 8 caracteres.";
    if (/network|fetch|failed to fetch|load failed/i.test(msg)) return "Sem conexão com o servidor. Verifique sua internet.";
    return "Não foi possível entrar. Tente novamente.";
  }

  /* ====================================================== LIMPEZA DE DADOS ==
     Chamado quando a sessao encerra (SIGNED_OUT). Isola dados clinicos por
     conta: guarda o estado atual sob a uid do usuario que esta saindo, depois
     limpa as chaves principais. Na proxima vez que o mesmo usuario entrar,
     restaurarEstadoLocal devolve tudo.

     NAO apaga IndexedDB: arquivo-store.js filtra por uid internamente.
     NAO toca nas chaves sb-*-auth-token — o Supabase cuida dessas. */

  var CHAVES_CLINICAS = [
    "holohacking.dados.pacientes", "holohacking.dados.holoscan",
    "holohacking.dados.oq3", "holohacking.dados.pqq",
    "holohacking.dados.consultas", "holohacking.dados.bloqueios",
    "holohacking.dados.aplicacoes", "holohacking.dados.perfil",
    "holohacking.pontuacao", "holohacking.questionario", "holohacking.respostas_aplicadas",
    "holohacking.ferramentas", "holohacking.exames",
    "holohacking.agenda", "holohacking.sincronizacao"
  ];

  /* De quem sao as caixas clinicas que estao no disco AGORA. Gravado quando
     uma sessao comeca, apagado no logout. Sem isto, uma sessao que terminou
     sem SIGNED_OUT (token expirado, navegador fechado) deixava as caixas da
     conta A no disco, e a conta B que entrasse depois as herdava — inclusive
     para a migracao local → servidor, que as enviaria como sendo de B. */
  var CHAVE_DONO = "holohacking.dono_local";

  function limparEstadoLocal(uidSaindo) {
    try {
      if (!uidSaindo) uidSaindo = localStorage.getItem(CHAVE_DONO);
      if (uidSaindo) {
        CHAVES_CLINICAS.forEach(function (k) {
          var v = localStorage.getItem(k);
          if (v !== null) {
            localStorage.setItem("holohacking._stash." + uidSaindo + "." + k, v);
          }
        });
      }
      CHAVES_CLINICAS.forEach(function (k) { localStorage.removeItem(k); });
      localStorage.removeItem(CHAVE_DONO);
    } catch (e) { /* navegador em modo privado */ }
    if (window.Sujeira) window.Sujeira.limparTudo();   // edicao nao salva da conta que saiu
    if (window.ArquivoStore && window.ArquivoStore.esquecerListas) window.ArquivoStore.esquecerListas();
    if (window.limparEstadoApp) window.limparEstadoApp();
    if (window.limparEstadoPerfil) window.limparEstadoPerfil();
    if (window.Sincronizacao) window.Sincronizacao.esquecer();
    if (window.Agenda && window.Agenda.esquecer) window.Agenda.esquecer();
    if (window.Aplicacoes && window.Aplicacoes.esquecer) window.Aplicacoes.esquecer();
    if (window.AtendimentoAtual && window.AtendimentoAtual.esquecer) window.AtendimentoAtual.esquecer();
    if (window.Anamnese && window.Anamnese.esquecer) window.Anamnese.esquecer();
    if (window.Conduta && window.Conduta.esquecer) window.Conduta.esquecer();
    if (window.Relatorios && window.Relatorios.esquecer) window.Relatorios.esquecer();
    if (window.Evolucao && window.Evolucao.esquecer) window.Evolucao.esquecer();
  }

  function restaurarEstadoLocal(uid) {
    if (!uid) return;
    try {
      /* O disco ainda tem as caixas de OUTRA conta (a sessao dela terminou
         sem logout): guarda-as no stash dela e limpa antes de restaurar. */
      var dono = localStorage.getItem(CHAVE_DONO);
      if (dono && dono !== uid) {
        CHAVES_CLINICAS.forEach(function (k) {
          var v = localStorage.getItem(k);
          if (v !== null) localStorage.setItem("holohacking._stash." + dono + "." + k, v);
          localStorage.removeItem(k);
        });
        if (window.limparEstadoApp) window.limparEstadoApp();
        if (window.Sincronizacao) window.Sincronizacao.esquecer();
        if (window.Agenda && window.Agenda.esquecer) window.Agenda.esquecer();
        if (window.Aplicacoes && window.Aplicacoes.esquecer) window.Aplicacoes.esquecer();
        if (window.AtendimentoAtual && window.AtendimentoAtual.esquecer) window.AtendimentoAtual.esquecer();
        if (window.Anamnese && window.Anamnese.esquecer) window.Anamnese.esquecer();
        if (window.Conduta && window.Conduta.esquecer) window.Conduta.esquecer();
        if (window.Relatorios && window.Relatorios.esquecer) window.Relatorios.esquecer();
        if (window.Evolucao && window.Evolucao.esquecer) window.Evolucao.esquecer();
      }
      CHAVES_CLINICAS.forEach(function (k) {
        var stash = "holohacking._stash." + uid + "." + k;
        var v = localStorage.getItem(stash);
        if (v !== null && localStorage.getItem(k) === null) {
          localStorage.setItem(k, v);
        }
      });
      localStorage.setItem(CHAVE_DONO, uid);
    } catch (e) { /* navegador em modo privado */ }
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
        .then(function (r) {
          /* a resposta nunca diz se a conta existe (privacidade); mas limite de
             envio e falha de servidor de e-mail precisam aparecer, senao a
             pessoa espera um e-mail que nao vai chegar */
          var m = r && r.error ? String(r.error.message || "") + " " + String(r.error.code || "") : "";
          if (/rate limit|too many|over_email_send_rate_limit|429/i.test(m)) {
            return { ok: false, motivo: "LIMITE", mensagem: "Muitos pedidos de recuperação em pouco tempo. Aguarde alguns minutos e tente de novo." };
          }
          if (/smtp|sending|send.*email|email.*send/i.test(m)) {
            return { ok: false, motivo: "EMAIL", mensagem: "Não foi possível enviar o e-mail agora. Tente mais tarde ou fale com a equipe HoloHacking." };
          }
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

    /* CADASTRO (08/10): a nutricionista cria a propria conta. Nome e telefone
       vao nos metadados; o gatilho do banco (lidar_novo_usuario) cria o perfil
       PENDENTE. A senha vai direto para o Supabase, como no login. */
    cadastrar: function (d) {
      if (!window.supabaseClient) {
        return Promise.resolve({ ok: false, motivo: "SEM_CLIENTE", mensagem: "Autenticação não está configurada neste ambiente." });
      }
      return window.supabaseClient.auth.signUp({
        email: d.email, password: d.senha,
        options: { data: { nome: d.nome, telefone: d.telefone }, emailRedirectTo: recuperarSenhaUrl() }
      }).then(function (r) {
        if (r.error) {
          var m = String(r.error.message || ""), c = String(r.error.code || "");
          var txt = /already registered|already exists|user_already_exists/i.test(m + " " + c)
              ? "Já existe uma conta com este e-mail. Entre com sua senha ou use \"Esqueci minha senha\"."
            : /signups? not allowed|signup.*disabled/i.test(m) ? "O cadastro está fechado no momento. Fale com a equipe HoloHacking."
            : /password/i.test(m) ? "Senha fraca: use pelo menos 8 caracteres, misturando letras e números."
            : /rate limit|too many/i.test(m) ? "Muitos cadastros em pouco tempo. Aguarde alguns minutos e tente de novo."
            : /invalid.*email|email.*invalid/i.test(m) ? "Este e-mail não foi aceito. Confira se está correto."
            : mensagemDeErro(r.error);
          return { ok: false, motivo: c || "ERRO_CADASTRO", mensagem: txt };
        }
        /* com "Confirm email" ligado no painel, o Supabase nao devolve sessao
           (e devolve usuario sem identidades quando o e-mail ja existia) */
        var u = r.data && r.data.user;
        if (u && Array.isArray(u.identities) && u.identities.length === 0) {
          return { ok: false, motivo: "JA_EXISTE", mensagem: "Já existe uma conta com este e-mail. Entre com sua senha ou use \"Esqueci minha senha\"." };
        }
        return { ok: true, sessao: r.data ? r.data.session : null, mensagem: "" };
      });
    },

    /* Status da conta: "ativo" | "pendente" | "recusado", ou null se o servidor
       nao respondeu. Se a funcao ainda nao existe no banco (SQL do cadastro nao
       aplicado), todo mundo continua entrando como antes. */
    statusConta: function () {
      if (!window.supabaseClient) return Promise.resolve("ativo");
      return Promise.resolve(window.supabaseClient.rpc("minha_conta_status")).then(function (r) {
        if (r && !r.error) return r.data || "pendente";
        var e = r ? r.error : null, txt = String((e && (e.message || "")) + " " + (e && e.code || ""));
        if (/PGRST202|42883|could not find the function|does not exist/i.test(txt)) return "ativo";
        return null;
      }, function () { return null; });
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

  // Cadastro e status da conta (08/10)
  var telaCadastro, formCadastro, cadNome, cadEmail, cadTelefone, cadSenha, cadSenha2, btnCadastrar, cadMensagem,
      telaStatus, statusTitulo, statusTexto, statusMensagem, btnStatusVerificar;

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

  function esconderNovas() {
    if (telaCadastro) telaCadastro.hidden = true;
    if (telaStatus) telaStatus.hidden = true;
  }

  function esconderTudo() {
    if (loginCabecalho) loginCabecalho.hidden = true;
    form.hidden = true;
    if (telaRecuperar) telaRecuperar.hidden = true;
    if (telaNovaSenha) telaNovaSenha.hidden = true;
    esconderNovas();
    if (blocoDev) blocoDev.hidden = true;
    var rodape = document.querySelector(".login-rodape");
    if (rodape) rodape.hidden = true;
  }

  function mostrarCadastro() {
    esconderTudo();
    telaCadastro.hidden = false;
    mensagemEm(cadMensagem, "", null);
    if (cadEmail && campoEmail && !cadEmail.value) cadEmail.value = campoEmail.value.trim();
    if (cadNome) cadNome.focus();
  }

  /* A conta entrou, mas ainda nao foi liberada (ou foi recusada). O app nao abre. */
  function mostrarStatusConta(status) {
    esconderTudo();
    telaStatus.hidden = false;
    var u = sessaoAtual && sessaoAtual.user;
    var nome = (u && u.user_metadata && u.user_metadata.nome) || (u && u.email) || "";
    if (status === "recusado") {
      statusTitulo.textContent = "Acesso não liberado";
      statusTexto.textContent = "O cadastro" + (nome ? " de " + nome : "") + " não foi liberado para usar o HoloHacking. Se você acha que é um engano, fale com a equipe HoloHacking.";
      btnStatusVerificar.hidden = true;
    } else if (status === null) {
      statusTitulo.textContent = "Não foi possível verificar seu acesso";
      statusTexto.textContent = "O servidor não respondeu. Confira sua internet e tente de novo.";
      btnStatusVerificar.hidden = false;
    } else {
      statusTitulo.textContent = "Seu cadastro está em análise";
      statusTexto.textContent = "Recebemos o cadastro" + (nome ? " de " + nome : "") + ". A equipe HoloHacking vai liberar o seu acesso e avisar você por WhatsApp ou e-mail. Depois disso, é só entrar com seu e-mail e senha.";
      btnStatusVerificar.hidden = false;
    }
    mensagemEm(statusMensagem, "", null);
  }

  function mostrarLogin() {
    esconderNovas();
    if (loginCabecalho) loginCabecalho.hidden = false;
    form.hidden = false;
    if (telaRecuperar) telaRecuperar.hidden = true;
    if (telaNovaSenha) telaNovaSenha.hidden = true;
    if (blocoDev) blocoDev.hidden = !ambienteLocal();
    var rodape = document.querySelector(".login-rodape");
    if (rodape) rodape.hidden = false;
  }

  function mostrarRecuperar() {
    esconderNovas();
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
    esconderNovas();
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

  /* Abrir o app passa pelo status da conta (08/10): pendente ou recusada fica
     na tela de status. O app ja aberto nao e re-checado a cada renovacao de
     token (um soluco de rede nao pode derrubar quem esta atendendo). */
  var checando = null;
  function liberarApp() {
    if (camada && camada.hidden) return;
    if (modoRecuperacao) return;
    if (!sessaoAtual) { abrirApp(); return; }
    if (checando) return;
    checando = window.AuthService.statusConta().then(function (st) {
      checando = null;
      if (!sessaoAtual || modoRecuperacao) return;   // chegou pelo link de "esqueci minha senha": primeiro a senha nova
      if (st === "ativo") abrirApp();
      else mostrarStatusConta(st);
    });
  }

  function abrirApp() {
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
    } else if (nova.length < 8) {
      marcarErro(campoNovaSenha, erroNovaSenha, "A senha deve ter pelo menos 8 caracteres.");
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
          try { if (chegouPeloLinkDeRecuperacao()) window.history.replaceState(null, "", "/"); } catch (x) { /* nada */ }
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

  /* ---------- cadastro --------------------------------------------------- */

  function digitos(v) { return String(v || "").replace(/\D/g, ""); }
  function mascaraTelefone(v) {
    var d = digitos(v).slice(0, 11);
    if (d.length <= 2) return d ? "(" + d : "";
    if (d.length <= 6) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length <= 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function aoEnviarCadastro(e) {
    e.preventDefault();
    if (enviando) return;
    var pares = [[cadNome, "erro-cad-nome"], [cadEmail, "erro-cad-email"], [cadTelefone, "erro-cad-telefone"], [cadSenha, "erro-cad-senha"], [cadSenha2, "erro-cad-senha2"]];
    pares.forEach(function (p) { p[0].removeAttribute("aria-invalid"); var el = document.getElementById(p[1]); el.textContent = ""; el.hidden = true; });
    var nome = cadNome.value.trim().replace(/\s+/g, " "), email = cadEmail.value.trim(), tel = digitos(cadTelefone.value),
        senha = cadSenha.value, senha2 = cadSenha2.value, primeiro = null;
    var erro = function (campo, id, txt) { marcarErro(campo, document.getElementById(id), txt); primeiro = primeiro || campo; };
    if (!nome) erro(cadNome, "erro-cad-nome", "Informe seu nome completo.");
    else if (nome.split(" ").length < 2 || nome.length < 5) erro(cadNome, "erro-cad-nome", "Informe nome e sobrenome.");
    if (!email) erro(cadEmail, "erro-cad-email", "Informe o e-mail.");
    else if (!pareceEmail(email)) erro(cadEmail, "erro-cad-email", "Informe um e-mail válido.");
    if (!tel) erro(cadTelefone, "erro-cad-telefone", "Informe o telefone com DDD.");
    else if (tel.length < 10 || tel.length > 11) erro(cadTelefone, "erro-cad-telefone", "Telefone com DDD: 10 ou 11 dígitos.");
    if (!senha) erro(cadSenha, "erro-cad-senha", "Crie uma senha.");
    else if (senha.length < 8) erro(cadSenha, "erro-cad-senha", "A senha precisa de pelo menos 8 caracteres.");
    if (!senha2) erro(cadSenha2, "erro-cad-senha2", "Repita a senha.");
    else if (senha && senha2 !== senha) erro(cadSenha2, "erro-cad-senha2", "As senhas não coincidem.");
    if (primeiro) { primeiro.focus(); return; }

    enviando = true; btnCadastrar.disabled = true; btnCadastrar.setAttribute("aria-busy", "true"); camada.classList.add("enviando");
    mensagemEm(cadMensagem, "", null);
    window.AuthService.cadastrar({ nome: nome, email: email, telefone: tel, senha: senha })
      .then(function (r) {
        if (!r.ok) { mensagemEm(cadMensagem, r.mensagem, "aviso"); return; }
        cadSenha.value = ""; cadSenha2.value = "";
        if (!r.sessao) {
          mensagemEm(cadMensagem, "Cadastro recebido! Confirme seu e-mail pelo link que enviamos. Depois disso, a equipe HoloHacking libera o seu acesso.", "ok");
        }
        /* com sessao, o SIGNED_IN abre a tela "em analise" sozinho */
        try { if (window.history && /\/cadastro\/?$/.test(window.location.pathname)) window.history.replaceState(null, "", "/"); } catch (x) { /* nada */ }
      })
      .catch(function () { mensagemEm(cadMensagem, "Não foi possível falar com o servidor. Tente de novo.", "aviso"); })
      .then(function () { enviando = false; btnCadastrar.disabled = false; btnCadastrar.setAttribute("aria-busy", "false"); camada.classList.remove("enviando"); });
  }

  function ehRotaCadastro() {
    return /\/cadastro\/?$/.test(window.location.pathname) || window.location.hash === "#cadastro";
  }

  /* A saida de desenvolvimento. So existe (visivel e funcional) em
     localhost/127.0.0.1 — ambienteLocal() decide os dois. Fora dali o clique
     nao faz nada, mesmo que o bloco seja reexibido via devtools. */
  function sairParaOApp(e) {
    if (e) e.preventDefault();
    if (!ambienteLocal()) return;
    abrirApp();
  }

  /* ---------- sessao: restaurar, reagir a mudanca ----------------------- */

  /* O link do e-mail de "Esqueci minha senha" volta com type=recovery no
     endereco. O evento PASSWORD_RECOVERY do supabase-js pode chegar depois da
     sessao inicial — e ai o app abria direto, sem pedir a senha nova. Lendo o
     endereco no carregamento, a tela de nova senha vem primeiro, sempre. */
  function chegouPeloLinkDeRecuperacao() {
    var h = window.location.hash || "", q = window.location.search || "";
    return /type=recovery/.test(h) || /type=recovery/.test(q);
  }
  function linkDeRecuperacaoInvalido() {
    var h = window.location.hash || "", q = window.location.search || "";
    return /error_code=otp_expired|error=access_denied/.test(h + q);
  }

  function verificarSessaoInicial() {
    if (chegouPeloLinkDeRecuperacao()) { modoRecuperacao = true; bloquearApp(); mostrarNovaSenha(); }
    else if (linkDeRecuperacaoInvalido()) {
      try { window.history.replaceState(null, "", "/"); } catch (x) { /* nada */ }
      setTimeout(function () { mensagem("O link de recuperação expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\".", "aviso"); }, 0);
    }
    if (!window.supabaseClient) { definirEstadoAuth("nao_autenticado"); campoEmail.focus(); return; }
    window.supabaseClient.auth.getSession().then(function (r) {
      var sessao = r && r.data && r.data.session;
      sessaoAtual = sessao || null;
      prontoParaAvisar = true;
      if (sessao) restaurarEstadoLocal(sessao.user.id);
      definirEstadoAuth(sessao ? "autenticado" : "nao_autenticado");
      if (sessao && !modoRecuperacao) liberarApp();
      else if (!modoRecuperacao && ehRotaCadastro()) mostrarCadastro();
      else if (!modoRecuperacao) campoEmail.focus();
    });
  }

  function ligarOuvinteDeSessao() {
    if (!window.supabaseClient) return;
    window.supabaseClient.auth.onAuthStateChange(function (evento, sessao) {
      var uidSaindo = sessaoAtual && sessaoAtual.user ? sessaoAtual.user.id : null;
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
        limparEstadoLocal(uidSaindo);
        definirEstadoAuth("nao_autenticado");
        bloquearApp();
      } else if (sessao && (evento === "SIGNED_IN" || evento === "TOKEN_REFRESHED" || evento === "USER_UPDATED")) {
        if (evento === "SIGNED_IN") restaurarEstadoLocal(sessao.user.id);
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

    // Cadastro e status da conta
    telaCadastro = document.getElementById("tela-cadastro");
    formCadastro = document.getElementById("form-cadastro");
    cadNome = document.getElementById("cad-nome");
    cadEmail = document.getElementById("cad-email");
    cadTelefone = document.getElementById("cad-telefone");
    cadSenha = document.getElementById("cad-senha");
    cadSenha2 = document.getElementById("cad-senha2");
    btnCadastrar = document.getElementById("btn-cadastrar");
    cadMensagem = document.getElementById("cadastro-mensagem");
    telaStatus = document.getElementById("tela-status-conta");
    statusTitulo = document.getElementById("status-conta-titulo");
    statusTexto = document.getElementById("status-conta-texto");
    statusMensagem = document.getElementById("status-conta-mensagem");
    btnStatusVerificar = document.getElementById("btn-status-verificar");
    if (formCadastro) {
      formCadastro.addEventListener("submit", aoEnviarCadastro);
      cadTelefone.addEventListener("input", function () { cadTelefone.value = mascaraTelefone(cadTelefone.value); });
      var olhoCad = document.getElementById("btn-olho-cad");
      if (olhoCad) olhoCad.addEventListener("click", function () { alternarVisibilidade(cadSenha, olhoCad); });
      document.getElementById("link-criar-conta").addEventListener("click", function (ev) {
        ev.preventDefault();
        try { window.history.pushState(null, "", "/cadastro"); } catch (x) { /* nada */ }
        mostrarCadastro();
      });
      document.getElementById("link-cadastro-voltar").addEventListener("click", function (ev) {
        ev.preventDefault();
        try { if (ehRotaCadastro()) window.history.replaceState(null, "", "/"); } catch (x) { /* nada */ }
        mostrarLogin();
        if (campoEmail) campoEmail.focus();
      });
    }
    if (telaStatus) {
      btnStatusVerificar.addEventListener("click", function () {
        mensagemEm(statusMensagem, "Verificando…", null);
        window.AuthService.statusConta().then(function (st) {
          if (st === "ativo") abrirApp();
          else { mostrarStatusConta(st); mensagemEm(statusMensagem, st === "pendente" ? "Ainda aguardando liberação." : "", null); }
        });
      });
      document.getElementById("link-status-sair").addEventListener("click", function (ev) { ev.preventDefault(); window.HoloAuth.sair(); });
    }

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

  if (ambienteLocal()) {
    window._testeIsolamento = {
      limpar: limparEstadoLocal,
      restaurar: restaurarEstadoLocal
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
