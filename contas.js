/* ===========================================================================
   CONTAS — liberar os cadastros das nutricionistas (08/10)
   ===========================================================================

   So aparece para administradores (public.administradores, conferido no
   servidor por eh_administrador). Lista os cadastros pendentes e os ultimos
   decididos; Aprovar libera a conta, Recusar mantem fora (com confirmacao).
   Quem decide e o servidor (decidir_conta): esconder a tela nao e a protecao.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar;
  var admin = false, pendentes = 0, avisou = false;

  function sb() { return window.supabaseClient; }
  function sessao() { return !!(sb() && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function dataHora(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", ""); }
    catch (e) { return String(iso).slice(0, 16); }
  }
  function telefoneTexto(t) {
    var d = String(t || "").replace(/\D/g, "");
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return d || "—";
  }
  function whatsapp(t) { var d = String(t || "").replace(/\D/g, ""); return d ? "https://wa.me/55" + d : null; }

  function conferirAdmin() {
    if (!sessao()) { admin = false; atualizarMenu(); return Promise.resolve(false); }
    return Promise.resolve(sb().rpc("eh_administrador")).then(function (r) {
      admin = !!(r && !r.error && r.data === true);
      atualizarMenu();
      if (admin) contarPendentes();
      return admin;
    }, function () { admin = false; atualizarMenu(); return false; });
  }

  function contarPendentes() {
    return Promise.resolve(sb().rpc("listar_contas", { p_status: "pendente" })).then(function (r) {
      pendentes = r && !r.error && Array.isArray(r.data) ? r.data.length : 0;
      atualizarMenu();
      if (pendentes && !avisou && window.avisar) {
        avisou = true;
        window.avisar(pendentes + (pendentes === 1 ? " cadastro aguardando liberação" : " cadastros aguardando liberação") + " (Configurações → Contas).");
      }
    });
  }

  function atualizarMenu() {
    var item = document.getElementById("nav-contas");
    if (!item) return;
    item.classList.toggle("hidden", !admin);
    var b = document.getElementById("nav-contas-num");
    if (b) { b.textContent = pendentes ? String(pendentes) : ""; b.hidden = !pendentes; }
  }

  function linha(c, decidida) {
    var wa = whatsapp(c.telefone);
    return '<li class="ct-linha" data-conta="' + escapar(c.id) + '"><div class="ct-quem"><b>' + escapar(c.nome || "(sem nome)") + "</b>" +
      '<span>' + escapar(c.email || "") + " · " + escapar(telefoneTexto(c.telefone)) + "</span>" +
      '<span class="ct-quando">' + (decidida ? (c.status === "ativo" ? "liberada" : "recusada") + " em " + escapar(dataHora(c.aprovado_em)) : "cadastro em " + escapar(dataHora(c.criado_em))) + "</span></div>" +
      '<div class="ct-acoes">' +
      (wa ? '<a class="perf-botao" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : "") +
      (decidida ? (c.status === "recusado" ? '<button type="button" class="perf-botao" data-ct-aprovar="' + escapar(c.id) + '">Liberar</button>' : "")
                : '<button type="button" class="btn-verde" data-ct-aprovar="' + escapar(c.id) + '">Liberar acesso</button>' +
                  '<button type="button" class="perf-tirar" data-ct-recusar="' + escapar(c.id) + '">Recusar</button>') +
      "</div></li>";
  }

  function desenhar() {
    var alvo = document.getElementById("contas-corpo");
    if (!alvo) return;
    if (!admin) { alvo.innerHTML = '<p class="dash-vazio">Esta área é só da equipe HoloHacking.</p>'; return; }
    alvo.innerHTML = '<p class="dash-vazio">Carregando cadastros…</p>';
    Promise.all([sb().rpc("listar_contas", { p_status: "pendente" }), sb().rpc("listar_contas", { p_status: null })]).then(function (rs) {
      if (rs[0].error || rs[1].error) { alvo.innerHTML = '<p class="q-erro">Não foi possível ler os cadastros agora.</p>'; return; }
      var pend = rs[0].data || [];
      var decididas = (rs[1].data || []).filter(function (c) { return c.status !== "pendente" && c.aprovado_em; })
        .sort(function (a, b) { return String(b.aprovado_em).localeCompare(String(a.aprovado_em)); }).slice(0, 20);
      pendentes = pend.length; atualizarMenu();
      alvo.innerHTML =
        '<div class="dash-bloco"><h3 class="dash-titulo">Aguardando liberação (' + pend.length + ")</h3>" +
        (pend.length ? '<ul class="ct-lista">' + pend.map(function (c) { return linha(c, false); }).join("") + "</ul>"
                     : '<p class="dash-vazio">Nenhum cadastro aguardando. O link para mandar às nutricionistas é <b>holohacking.com.br/cadastro</b>.</p>') + "</div>" +
        '<div class="dash-bloco"><h3 class="dash-titulo">Decididos recentemente</h3>' +
        (decididas.length ? '<ul class="ct-lista">' + decididas.map(function (c) { return linha(c, true); }).join("") + "</ul>" : '<p class="dash-vazio">Nenhum ainda.</p>') + "</div>" +
        '<p class="dash-sub">Depois de liberar, avise a nutricionista (o botão WhatsApp abre a conversa). Ela entra com o e-mail e a senha que cadastrou.</p>';
    });
  }

  function decidir(id, aprovar) {
    return Promise.resolve(sb().rpc("decidir_conta", { p_user: id, p_aprovar: aprovar })).then(function (r) {
      if (r && !r.error) { if (window.avisar) window.avisar(aprovar ? "Acesso liberado." : "Cadastro recusado."); }
      else if (window.avisar) window.avisar("Não foi possível registrar a decisão: " + ((r && r.error && r.error.message) || "erro"));
      desenhar();
    });
  }

  document.addEventListener("click", function (ev) {
    var a = ev.target.closest("[data-ct-aprovar]");
    if (a) { decidir(a.dataset.ctAprovar, true); return; }
    var r = ev.target.closest("[data-ct-recusar]");
    if (r) {
      var id = r.dataset.ctRecusar;
      var conf = window.abrirModalConfirmar
        ? window.abrirModalConfirmar({ titulo: "Recusar cadastro", corpo: "<p>Esta pessoa não vai conseguir usar o HoloHacking. Você pode liberar depois, se mudar de ideia.</p>", botaoConfirmar: "Recusar" })
        : Promise.resolve(window.confirm("Recusar este cadastro?") ? "confirmar" : null);
      conf.then(function (resp) { if (resp === "confirmar") decidir(id, false); });
      return;
    }
    var nav = ev.target.closest('.nav-item[data-secao="contas"]');
    if (nav) desenhar();
  });

  document.addEventListener("DOMContentLoaded", function () {
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
      window.HoloAuth.aoMudarEstado(function (estado) {
        if (estado === "autenticado") conferirAdmin();
        else { admin = false; pendentes = 0; avisou = false; atualizarMenu(); }
      });
    }
  });

  window.Contas = { desenhar: desenhar, conferirAdmin: conferirAdmin, eAdmin: function () { return admin; } };
})();
