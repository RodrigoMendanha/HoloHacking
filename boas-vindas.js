/* =========================================================================
   Janelas de boas-vindas (09/10)
     1. cadastro  — ao abrir /cadastro (ou "Criar conta"): boas-vindas + passo a passo
     2. perfil    — primeira entrada da conta PENDENTE: o proximo passo e completar o perfil
     3. liberada  — primeira entrada depois que a equipe LIBERA a conta: boas-vindas de novo
   2 e 3 aparecem SO NO PRIMEIRO ACESSO: o "ja vi" fica na conta (vale em qualquer aparelho).
   A 3 so aparece para conta liberada nos ultimos 30 dias (profiles.aprovado_em):
   as contas antigas nao veem.
   ========================================================================= */
(function () {
  "use strict";

  var CHAVE = "holohacking.boasvindas.";
  var DIAS_LIBERADA = 30;

  /* "Ja vi" fica na propria conta (user_metadata do Auth, que a pessoa pode gravar: e so preferencia
     de tela) para valer em qualquer aparelho, e no navegador como reserva (sem rede, ou antes de
     o Auth confirmar). k = "perfil.<uid>" ou "liberada.<uid>". */
  function usuario() { return window.HoloAuth && window.HoloAuth.usuarioAtual ? window.HoloAuth.usuarioAtual() : null; }
  function campoConta(k) { return "holohacking_boasvindas_" + k.split(".")[0]; }
  function visto(k) {
    var u = usuario();
    if (u && u.id === k.split(".")[1] && u.user_metadata && u.user_metadata[campoConta(k)]) return true;
    try { return window.localStorage.getItem(CHAVE + k) === "1"; } catch (e) { return false; }
  }
  function marcar(k) {
    try { window.localStorage.setItem(CHAVE + k, "1"); } catch (e) { /* sem armazenamento */ }
    var u = usuario(), dados = {};
    if (!u || u.id !== k.split(".")[1] || !window.supabaseClient || !window.supabaseClient.auth.updateUser) return;
    dados[campoConta(k)] = true;
    try {
      Promise.resolve(window.supabaseClient.auth.updateUser({ data: dados })).then(function () {
        if (u.user_metadata) u.user_metadata[campoConta(k)] = true;
      }, function () { /* fica so no navegador */ });
    } catch (e) { /* nada */ }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function primeiroNome(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }

  /* Os tres passos, na ordem real: a pendente ja completa o perfil enquanto espera. */
  var PASSOS = ["Faça seu registro", "Complete seu perfil", "A equipe libera seu acesso completo"];
  function passos(atual) {
    return '<ol class="bv-passos">' + PASSOS.map(function (t, i) {
      var cls = i < atual ? "bv-feito" : i === atual ? "bv-atual" : "";
      return '<li class="' + cls + '"' + (i === atual ? ' aria-current="step"' : "") + '><span class="bv-num" aria-hidden="true">' +
        (i < atual ? "✓" : i + 1) + "</span><span>" + esc(t) +
        (i < atual ? '<span class="sr-only"> (feito)</span>' : "") + "</span></li>";
    }).join("") + "</ol>";
  }
  var SETA = ' <span class="bv-seta" aria-hidden="true">→</span>';

  /* ---------- a janela ---------------------------------------------------- */

  var aberta = null;

  function fechar(acao) {
    var j = aberta;
    if (!j) return;
    aberta = null;
    try { if (j.el.open && j.el.close) j.el.close(); } catch (e) { /* nada */ }
    if (j.el.parentNode) j.el.parentNode.removeChild(j.el);
    if (j.aoFechar) { try { j.aoFechar(acao || null); } catch (e) { /* nada */ } }
  }

  /* opc: { id, html, aoFechar(acao) } — botoes com data-bv-acao="<acao>" fecham e devolvem a acao */
  function abrir(opc) {
    fechar(null);
    var d = document.createElement("dialog");
    d.className = "bv-janela";
    d.id = opc.id;
    d.setAttribute("aria-labelledby", opc.id + "-titulo");
    d.innerHTML = '<div class="bv-corpo">' +
      '<button type="button" class="bv-x" data-bv-acao="fechar" aria-label="Fechar">&times;</button>' +
      '<img class="bv-logo" src="/logo-holohacking.png" alt="HoloHacking" width="76" height="76">' +
      opc.html + "</div>";
    document.body.appendChild(d);
    aberta = { el: d, aoFechar: opc.aoFechar };
    d.addEventListener("click", function (ev) {
      if (ev.target === d) { fechar("fechar"); return; }   // fora do cartao (o fundo)
      var b = ev.target.closest("[data-bv-acao]");
      if (b) fechar(b.getAttribute("data-bv-acao"));
    });
    d.addEventListener("cancel", function (ev) { ev.preventDefault(); fechar("fechar"); });   // Esc
    try { d.showModal(); } catch (e) { d.setAttribute("open", ""); }
    var foco = d.querySelector(".bv-principal");
    if (foco) foco.focus();
    return d;
  }

  /* ---------- 1. cadastro ------------------------------------------------- */

  /* aoFechar(acao): "entrar" volta ao login; qualquer outra leva ao formulario */
  function cadastro(aoFechar) {
    return abrir({
      id: "bv-cadastro",
      aoFechar: aoFechar,
      html:
        '<p class="bv-sobre">Plataforma clínica da nutrição holística</p>' +
        '<h2 class="bv-titulo" id="bv-cadastro-titulo">Seja bem-vindo(a), nutricionista, ao <span>HoloHacking</span></h2>' +
        '<p class="bv-texto">Em poucos minutos você cria sua conta. Depois, completa o seu perfil profissional enquanto a equipe HoloHacking libera o seu acesso.</p>' +
        '<p class="bv-rotulo">Próximo passo</p>' + passos(0) +
        '<div class="bv-acoes"><button type="button" class="bv-principal" data-bv-acao="registrar">Fazer meu registro' + SETA + "</button>" +
        '<button type="button" class="bv-link" data-bv-acao="entrar">Já tenho conta: entrar</button></div>'
    });
  }

  /* ---------- 2. primeira entrada da conta pendente (Perfil) --------------- */

  /* faltam: rotulos do checklist do Perfil que ainda faltam; aoFechar(acao) */
  function perfilPendente(uid, nome, faltam, aoFechar) {
    if (!uid || visto("perfil." + uid) || aberta) return null;
    marcar("perfil." + uid);
    var pn = primeiroNome(nome);
    var lista = faltam && faltam.length
      ? '<p class="bv-rotulo">O que falta no seu perfil</p><ul class="bv-faltam">' +
        faltam.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("") + "</ul>"
      : '<p class="bv-texto">Seu perfil já está completo. Agora é só aguardar a liberação.</p>';
    return abrir({
      id: "bv-perfil",
      aoFechar: aoFechar,
      html:
        '<p class="bv-sobre">Cadastro recebido</p>' +
        '<h2 class="bv-titulo" id="bv-perfil-titulo">Olá' + (pn ? ", " + esc(pn) : "") + "! Que bom ter você aqui.</h2>" +
        '<p class="bv-texto">Agora o próximo passo é <b>completar o seu perfil profissional</b>. Esses dados aparecem nos resultados e documentos que você entrega às suas pacientes.</p>' +
        passos(1) + lista +
        '<p class="bv-nota">Enquanto isso, a equipe HoloHacking analisa o seu cadastro e libera o acesso completo.</p>' +
        '<div class="bv-acoes"><button type="button" class="bv-principal" data-bv-acao="completar">Completar meu perfil' + SETA + "</button></div>"
    });
  }

  /* ---------- 3. conta liberada -------------------------------------------- */

  function recente(iso) {
    var t = iso ? Date.parse(iso) : NaN;
    return !isNaN(t) && Date.now() - t < DIAS_LIBERADA * 86400000 && t <= Date.now() + 60000;
  }

  function mostrarLiberada(uid, nome) {
    marcar("liberada." + uid);
    var pn = primeiroNome(nome);
    return abrir({
      id: "bv-liberada",
      aoFechar: function (acao) {
        var ir = window.irParaSecao;
        if (acao === "pacientes" && ir) {
          ir("pacientes");
          setTimeout(function () { var b = document.getElementById("btn-abrir-novo"); if (b) b.click(); }, 150);
        } else if (acao === "perfil" && ir) ir("perfil");
        else if (acao === "ajuda" && ir) ir("ajuda");
      },
      html:
        '<p class="bv-sobre">Acesso liberado</p>' +
        '<h2 class="bv-titulo" id="bv-liberada-titulo">Olá' + (pn ? ", " + esc(pn) : "") + "! Seja bem-vindo(a), nutri <span>HoloHacking</span></h2>" +
        '<p class="bv-texto">Seu acesso foi liberado. Agora você já pode cadastrar pacientes, aplicar o HOLOSCAN e as ferramentas de Corpo, Mente e Espírito.</p>' +
        passos(3) +
        '<div class="bv-atalhos">' +
        '<button type="button" class="bv-atalho" data-bv-acao="pacientes">Cadastrar a primeira paciente</button>' +
        '<button type="button" class="bv-atalho" data-bv-acao="perfil">Ver meu perfil</button>' +
        '<button type="button" class="bv-atalho" data-bv-acao="ajuda">Ajuda</button></div>' +
        '<div class="bv-acoes"><button type="button" class="bv-principal" data-bv-acao="comecar">Começar' + SETA + "</button></div>"
    });
  }

  /* Chamado por login.js quando a conta abre como ATIVA. Le a data de liberacao do
     proprio perfil; sem data (contas antigas) ou liberada ha mais de 30 dias: nada. */
  function contaLiberada() {
    var u = window.HoloAuth && window.HoloAuth.usuarioAtual && window.HoloAuth.usuarioAtual();
    var uid = u && u.id;
    if (!uid || visto("liberada." + uid) || !window.supabaseClient) return Promise.resolve(false);
    return Promise.resolve(window.supabaseClient.from("profiles").select("nome, aprovado_em").eq("id", uid).maybeSingle())
      .then(function (r) {
        var p = r && !r.error ? r.data : null;
        if (!p || !recente(p.aprovado_em) || aberta || visto("liberada." + uid)) return false;
        mostrarLiberada(uid, p.nome || (u.user_metadata && u.user_metadata.nome));
        return true;
      }, function () { return false; });
  }

  window.BoasVindas = {
    cadastro: cadastro,
    perfilPendente: perfilPendente,
    contaLiberada: contaLiberada,
    fechar: function () { fechar("fechar"); },
    aberta: function () { return aberta ? aberta.el.id : null; }
  };
})();
