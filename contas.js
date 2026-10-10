/* ===========================================================================
   ADMINISTRACAO — pagina so da equipe HoloHacking (08/10, ampliada em 10/10)
   ===========================================================================

   So aparece para administradores (public.administradores, conferido no
   servidor por eh_administrador). Quem decide e o servidor: cada funcao
   admin_* recusa quem nao e administrador. Esconder a tela nao e a protecao.

   Abas:
     Visao geral  numeros (contas, cadastros hoje/7/30 dias, acessos, uso)
     Cadastros    quem esta se cadastrando: aguardando liberacao + recentes
     Contas       todas as contas, busca e filtro; "Gerenciar" abre o painel
                  da conta: dados, perfil, uso (so contagens), liberar/recusar/
                  voltar para analise, corrigir nome/telefone e o ACESSO
                  (senha provisoria, link de nova senha, trocar e-mail,
                  bloquear/desbloquear — Edge Function admin-usuarios)
     Historico    tudo que a administracao fez (registro imutavel)

   Nenhum dado de paciente passa por aqui: so quantidades.
   Sem a migration 20261016100000 (admin_painel ausente) a pagina cai no modo
   antigo (listar_contas/decidir_conta): pendentes + decididos.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar;
  var admin = false, pendentes = 0, avisou = false, meuId = null;
  var completo = null;          // true = migration nova; false = modo antigo; null = ainda nao sei
  var painel = null, historico = null;
  var aba = null, busca = "", filtro = "todas", aberta = null, senhaMostrada = null;
  var conhecidos = null, vigia = null;

  function sb() { return window.supabaseClient; }
  function sessao() { return !!(sb() && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function avisar(t) { if (window.avisar) window.avisar(t); }
  function dataHora(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", ""); }
    catch (e) { return String(iso).slice(0, 16); }
  }
  function relativo(iso) {
    if (!iso) return "nunca";
    var ms = Date.now() - new Date(iso).getTime();
    if (!(ms >= 0)) return dataHora(iso);
    var min = Math.floor(ms / 60000);
    if (min < 2) return "agora há pouco";
    if (min < 60) return "há " + min + " min";
    var h = Math.floor(min / 60);
    if (h < 24) return "há " + h + (h === 1 ? " hora" : " horas");
    var d = Math.floor(h / 24);
    if (d < 31) return "há " + d + (d === 1 ? " dia" : " dias");
    return dataHora(iso).slice(0, 10);
  }
  function telefoneTexto(t) {
    var d = String(t || "").replace(/\D/g, "");
    if (d.length === 11) return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    if (d.length === 10) return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
    return d || "—";
  }
  function whatsapp(t, texto) {
    var d = String(t || "").replace(/\D/g, "");
    return d ? "https://wa.me/55" + d + (texto ? "?text=" + encodeURIComponent(texto) : "") : null;
  }
  function semFuncao(e) {
    var txt = String((e && (e.message || "")) + " " + (e && e.code || ""));
    return /PGRST202|42883|could not find the function|does not exist/i.test(txt);
  }
  function plural(n, um, varios) { n = Number(n) || 0; return n + " " + (n === 1 ? um : varios); }
  var NOME_STATUS = { ativo: "Liberada", pendente: "Aguardando", recusado: "Recusada" };

  /* ---------- quem e administrador + contador do menu ---------- */
  function conferirAdmin() {
    if (!sessao()) { admin = false; atualizarMenu(); return Promise.resolve(false); }
    var u = window.HoloAuth.usuarioAtual && window.HoloAuth.usuarioAtual();
    meuId = u ? u.id : null;
    return Promise.resolve(sb().rpc("eh_administrador")).then(function (r) {
      admin = !!(r && !r.error && r.data === true);
      atualizarMenu();
      if (admin) { contarPendentes(); vigiar(); }
      return admin;
    }, function () { admin = false; atualizarMenu(); return false; });
  }

  function lerPendentes() {
    return Promise.resolve(sb().rpc("listar_contas", { p_status: "pendente" })).then(function (r) {
      return r && !r.error && Array.isArray(r.data) ? r.data : null;
    }, function () { return null; });
  }

  function contarPendentes() {
    return lerPendentes().then(function (lista) {
      if (!lista) return;
      pendentes = lista.length;
      atualizarMenu();
      /* cadastro novo enquanto o app esta aberto: avisa com o nome */
      var ids = lista.map(function (c) { return c.id; });
      if (conhecidos) {
        var novos = lista.filter(function (c) { return conhecidos.indexOf(c.id) < 0; });
        if (novos.length) avisar(novos.length === 1 ? "Novo cadastro: " + (novos[0].nome || novos[0].email) + "." : novos.length + " cadastros novos.");
        if (novos.length && document.getElementById("secao-contas") && document.getElementById("secao-contas").classList.contains("ativa")) carregar();
      }
      conhecidos = ids;
      if (pendentes && !avisou) {
        avisou = true;
        avisar(pendentes + (pendentes === 1 ? " cadastro aguardando liberação" : " cadastros aguardando liberação") + " (Configurações → Administração).");
      }
    });
  }

  function vigiar() {
    if (vigia) return;
    vigia = setInterval(function () { if (admin && sessao() && !document.hidden) contarPendentes(); }, 120000);
  }

  function atualizarMenu() {
    var item = document.getElementById("nav-contas");
    if (!item) return;
    item.classList.toggle("hidden", !admin);
    var b = document.getElementById("nav-contas-num");
    if (b) { b.textContent = pendentes ? String(pendentes) : ""; b.hidden = !pendentes; }
  }

  /* ---------- leitura ---------- */
  function carregar() {
    var alvo = document.getElementById("contas-corpo");
    if (!alvo) return Promise.resolve();
    if (!admin) { alvo.innerHTML = '<p class="dash-vazio">Esta área é só da equipe HoloHacking.</p>'; return Promise.resolve(); }
    if (!painel) alvo.innerHTML = '<p class="dash-vazio">Carregando…</p>';
    return Promise.resolve(sb().rpc("admin_painel")).then(function (r) {
      if (r && !r.error && r.data && Array.isArray(r.data.contas)) {
        completo = true; painel = r.data;
        pendentes = painel.resumo ? Number(painel.resumo.pendentes) || 0 : 0;
        conhecidos = painel.contas.filter(function (c) { return c.status === "pendente"; }).map(function (c) { return c.id; });
        atualizarMenu();
        return Promise.resolve(sb().rpc("admin_historico", { p_limite: 200 })).then(function (h) {
          historico = h && !h.error && Array.isArray(h.data) ? h.data : [];
          if (!aba) aba = pendentes ? "cadastros" : "geral";
          desenhar();
        });
      }
      if (r && r.error && semFuncao(r.error)) { completo = false; return desenharAntigo(); }
      alvo.innerHTML = '<p class="q-erro">Não foi possível ler as contas agora.</p><button type="button" class="perf-botao" data-ad-atualizar>Tentar de novo</button>';
    }, function () {
      alvo.innerHTML = '<p class="q-erro">Não foi possível falar com o servidor.</p><button type="button" class="perf-botao" data-ad-atualizar>Tentar de novo</button>';
    });
  }

  /* ---------- desenho ---------- */
  function selo(c) {
    if (c.bloqueado) return '<span class="ad-selo ad-selo-bloq">Bloqueada</span>';
    return '<span class="ad-selo ad-selo-' + escapar(c.status) + '">' + escapar(NOME_STATUS[c.status] || c.status) + "</span>";
  }

  function abas() {
    var r = painel.resumo || {};
    var item = function (id, rotulo, num) {
      return '<button type="button" role="tab" class="ad-aba' + (aba === id ? " ativa" : "") + '" aria-selected="' + (aba === id) + '" data-ad-aba="' + id + '">' +
        rotulo + (num ? ' <span class="nav-badge">' + num + "</span>" : "") + "</button>";
    };
    return '<div class="ad-topo"><div class="ad-abas" role="tablist">' + item("geral", "Visão geral") + item("cadastros", "Cadastros", r.pendentes) +
      item("contas", "Contas") + item("historico", "Histórico") + "</div>" +
      '<button type="button" class="perf-botao" data-ad-atualizar title="Ler de novo do servidor">Atualizar</button></div>';
  }

  function numero(v, rotulo, destaque) {
    return '<div class="ad-num' + (destaque ? " ad-num-destaque" : "") + '"><b>' + escapar(String(v == null ? 0 : v)) + "</b><span>" + escapar(rotulo) + "</span></div>";
  }

  function desenharGeral() {
    var r = painel.resumo || {};
    var recentes = painel.contas.slice(0, 5);
    return '<div class="dash-bloco"><h3 class="dash-titulo">Contas</h3><div class="ad-nums">' +
        numero(r.total, "contas no total") + numero(r.pendentes, "aguardando liberação", r.pendentes > 0) + numero(r.ativos, "liberadas") +
        numero(r.recusados, "recusadas") + numero(r.bloqueados, "bloqueadas") + "</div></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Cadastros e acessos</h3><div class="ad-nums">' +
        numero(r.cadastros_hoje, "cadastros hoje") + numero(r.cadastros_7d, "nos últimos 7 dias") + numero(r.cadastros_30d, "nos últimos 30 dias") +
        numero(r.acessaram_7d, "entraram nos últimos 7 dias") + numero(r.nunca_acessaram, "nunca entraram") + "</div></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Uso do HoloHacking</h3><p class="dash-sub">Só quantidades, somando todas as contas. Nenhum dado de paciente aparece aqui.</p><div class="ad-nums">' +
        numero(r.pacientes, "pacientes") + numero(r.atendimentos, "atendimentos") + numero(r.holoscans, "HOLOSCAN") + numero(r.resultados, "Resultados HOLOS") + "</div></div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Últimos cadastros</h3>' +
        (recentes.length ? '<ul class="ct-lista">' + recentes.map(function (c) { return linhaConta(c, true); }).join("") + "</ul>" : '<p class="dash-vazio">Nenhuma conta ainda.</p>') +
        '<p class="dash-sub">Link para mandar às nutricionistas: <b>holohacking.com.br/cadastro</b> ' +
        '<button type="button" class="perf-botao" data-ad-copiar="https://holohacking.com.br/cadastro">Copiar link</button></p></div>';
  }

  function linhaPendente(c) {
    var wa = whatsapp(c.telefone);
    return '<li class="ct-linha" data-conta="' + escapar(c.id) + '"><div class="ct-quem"><b>' + escapar(c.nome || "(sem nome)") + "</b>" +
      "<span>" + escapar(c.email || "") + " · " + escapar(telefoneTexto(c.telefone)) + "</span>" +
      '<span class="ct-quando">cadastro em ' + escapar(dataHora(c.criado_em)) + " (" + escapar(relativo(c.criado_em)) + ")" +
      (c.email_confirmado_em === null ? " · e-mail não confirmado" : "") + "</span></div>" +
      '<div class="ct-acoes">' + (wa ? '<a class="perf-botao" href="' + wa + '" target="_blank" rel="noopener">WhatsApp</a>' : "") +
      '<button type="button" class="perf-botao" data-ad-gerenciar="' + escapar(c.id) + '">Ver conta</button>' +
      '<button type="button" class="btn-verde" data-ct-aprovar="' + escapar(c.id) + '">Liberar acesso</button>' +
      '<button type="button" class="perf-tirar" data-ct-recusar="' + escapar(c.id) + '">Recusar</button></div></li>';
  }

  function desenharCadastros() {
    var pend = painel.contas.filter(function (c) { return c.status === "pendente"; });
    var limite = Date.now() - 30 * 86400000;
    var recentes = painel.contas.filter(function (c) { return c.status !== "pendente" && new Date(c.criado_em).getTime() > limite; });
    return '<div class="dash-bloco"><h3 class="dash-titulo">Aguardando liberação (' + pend.length + ")</h3>" +
        (pend.length ? '<ul class="ct-lista">' + pend.map(linhaPendente).join("") + "</ul>"
                     : '<p class="dash-vazio">Nenhum cadastro aguardando. O link para mandar às nutricionistas é <b>holohacking.com.br/cadastro</b>.</p>') + "</div>" +
      '<div class="dash-bloco"><h3 class="dash-titulo">Cadastros dos últimos 30 dias já decididos</h3>' +
        (recentes.length ? '<ul class="ct-lista">' + recentes.map(function (c) { return linhaConta(c, true); }).join("") + "</ul>" : '<p class="dash-vazio">Nenhum.</p>') + "</div>" +
      '<p class="dash-sub">Depois de liberar, avise a nutricionista (o botão WhatsApp abre a conversa). Ela entra com o e-mail e a senha que cadastrou. A lista se atualiza sozinha a cada 2 minutos.</p>';
  }

  function linhaConta(c, curta) {
    var uso = c.uso || {};
    return '<li class="ct-linha ad-linha' + (aberta === c.id && !curta ? " aberta" : "") + '" data-conta="' + escapar(c.id) + '">' +
      '<div class="ct-quem"><b>' + escapar(c.nome || "(sem nome)") + (c.admin ? ' <span class="ad-selo ad-selo-admin">Administração</span>' : "") + " " + selo(c) + "</b>" +
      "<span>" + escapar(c.email || "") + " · " + escapar(telefoneTexto(c.telefone)) + "</span>" +
      '<span class="ct-quando">cadastro ' + escapar(relativo(c.criado_em)) + " · último acesso " + escapar(relativo(c.ultimo_acesso)) +
      (curta ? "" : " · perfil " + escapar(String(c.completude || 0)) + "% · " + plural(uso.pacientes, "paciente", "pacientes") + " · " + plural(uso.atendimentos, "atendimento", "atendimentos")) + "</span></div>" +
      '<div class="ct-acoes"><button type="button" class="perf-botao" data-ad-gerenciar="' + escapar(c.id) + '" aria-expanded="' + (aberta === c.id) + '">' +
      (aberta === c.id && !curta ? "Fechar" : "Gerenciar") + "</button></div>" +
      (aberta === c.id && !curta ? detalhe(c) : "") + "</li>";
  }

  function passaFiltro(c) {
    if (filtro === "ativas" && c.status !== "ativo") return false;
    if (filtro === "pendentes" && c.status !== "pendente") return false;
    if (filtro === "recusadas" && c.status !== "recusado") return false;
    if (filtro === "bloqueadas" && !c.bloqueado) return false;
    if (filtro === "nunca" && c.ultimo_acesso) return false;
    if (filtro === "senha" && !c.precisa_trocar_senha) return false;
    if (!busca) return true;
    var b = busca.toLowerCase(), dig = busca.replace(/\D/g, "");
    return String(c.nome || "").toLowerCase().indexOf(b) >= 0 || String(c.email || "").toLowerCase().indexOf(b) >= 0 ||
      (dig.length >= 3 && String(c.telefone || "").indexOf(dig) >= 0);
  }

  function desenharContas() {
    var lista = painel.contas.filter(passaFiltro);
    var op = function (v, t) { return '<option value="' + v + '"' + (filtro === v ? " selected" : "") + ">" + t + "</option>"; };
    return '<div class="ad-filtros"><input type="search" id="ad-busca" placeholder="Buscar por nome, e-mail ou telefone" value="' + escapar(busca) + '" aria-label="Buscar conta">' +
      '<select id="ad-filtro" aria-label="Filtrar contas">' + op("todas", "Todas") + op("ativas", "Liberadas") + op("pendentes", "Aguardando") +
      op("recusadas", "Recusadas") + op("bloqueadas", "Bloqueadas") + op("nunca", "Nunca entraram") + op("senha", "Com senha provisória") + "</select>" +
      '<span class="ad-conta-total">' + lista.length + (lista.length === 1 ? " conta" : " contas") + "</span></div>" +
      (lista.length ? '<ul class="ct-lista" id="ad-lista">' + lista.map(function (c) { return linhaConta(c, false); }).join("") + "</ul>"
                    : '<p class="dash-vazio">Nenhuma conta com esse filtro.</p>');
  }

  function item(rotulo, valor) { return "<div><dt>" + escapar(rotulo) + "</dt><dd>" + valor + "</dd></div>"; }
  function sim(v) { return v ? '<span class="ad-ok">sim</span>' : '<span class="ad-falta">não</span>'; }

  function detalhe(c) {
    var p = c.perfil || {}, uso = c.uso || {}, eu = c.id === meuId, id = escapar(c.id);
    var mostrada = senhaMostrada && senhaMostrada.id === c.id ? senhaMostrada.senha : null;
    var msgWa = mostrada ? "Olá! Seu acesso ao HoloHacking foi redefinido. Entre em holohacking.com.br com o seu e-mail e a senha provisória " + mostrada + " — o sistema vai pedir para você criar uma senha nova." : "";
    return '<div class="ad-detalhe" id="ad-detalhe">' +
      '<div class="ad-col"><h4>Conta</h4><dl class="ad-dl">' +
        item("Situação", selo(c) + (c.bloqueado && c.bloqueado_ate ? " até " + escapar(dataHora(c.bloqueado_ate).slice(0, 10)) : "")) +
        item("E-mail", escapar(c.email || "—")) + item("Telefone", escapar(telefoneTexto(c.telefone))) +
        item("Cadastro", escapar(dataHora(c.criado_em))) +
        item("E-mail confirmado", c.email_confirmado_em ? escapar(dataHora(c.email_confirmado_em)) : '<span class="ad-falta">não</span>') +
        item("Último acesso", c.ultimo_acesso ? escapar(dataHora(c.ultimo_acesso)) : '<span class="ad-falta">nunca entrou</span>') +
        item(c.status === "recusado" ? "Recusada em" : "Liberada em", c.aprovado_em ? escapar(dataHora(c.aprovado_em)) + (c.aprovado_por ? " por " + escapar(c.aprovado_por) : "") : "—") +
        (c.precisa_trocar_senha ? item("Senha", '<span class="ad-falta">provisória — vai trocar no próximo acesso</span>') : "") +
      "</dl></div>" +
      '<div class="ad-col"><h4>Perfil profissional (' + escapar(String(c.completude || 0)) + '%)</h4><dl class="ad-dl">' +
        item("Profissão", escapar(p.profissao || "—")) + item("Registro", escapar(p.registro || "—")) + item("Especialidade", escapar(p.especialidade || "—")) +
        item("Cidade", escapar(p.cidade || "—")) + item("Instagram", escapar(p.instagram || "—")) +
        item("Foto · Logo", sim(p.foto) + " · " + sim(p.logo)) + item("Assinatura · Carimbo", sim(p.assinatura) + " · " + sim(p.carimbo)) +
      "</dl><h4>Uso</h4><dl class=\"ad-dl\">" +
        item("Pacientes", escapar(String(uso.pacientes || 0))) + item("Atendimentos", escapar(String(uso.atendimentos || 0))) +
        item("HOLOSCAN", escapar(String(uso.holoscans || 0))) + item("Resultados HOLOS", escapar(String(uso.resultados || 0))) +
        item("Última atividade", uso.ultima_atividade ? escapar(relativo(uso.ultima_atividade)) : "—") +
      "</dl></div>" +
      (eu ? '<div class="ad-col ad-col-larga"><p class="dash-vazio">Esta é a sua conta. Para mudar a sua senha ou os seus dados, use o Perfil.</p></div>' :
      '<div class="ad-col ad-col-larga"><h4>Liberação</h4><div class="ct-acoes">' +
        (c.status !== "ativo" ? '<button type="button" class="btn-verde" data-ad-status="ativo" data-id="' + id + '">Liberar acesso</button>' : "") +
        (c.status !== "recusado" ? '<button type="button" class="perf-tirar" data-ad-status="recusado" data-id="' + id + '">Recusar</button>' : "") +
        (c.status !== "pendente" ? '<button type="button" class="perf-botao" data-ad-status="pendente" data-id="' + id + '">Voltar para análise</button>' : "") +
        (whatsapp(c.telefone) ? '<a class="perf-botao" href="' + whatsapp(c.telefone) + '" target="_blank" rel="noopener">WhatsApp</a>' : "") +
      "</div>" +
      '<h4>Dados da conta</h4><form class="ad-form" data-ad-form-perfil="' + id + '">' +
        '<label>Nome <input type="text" name="nome" value="' + escapar(c.nome || "") + '" maxlength="120" required></label>' +
        '<label>Telefone <input type="tel" name="telefone" value="' + escapar(telefoneTexto(c.telefone) === "—" ? "" : telefoneTexto(c.telefone)) + '"></label>' +
        '<button type="submit" class="perf-botao">Salvar nome e telefone</button></form>' +
      "<h4>Acesso</h4>" +
      (mostrada ? '<div class="ad-senha" role="status"><p>Senha provisória (aparece só agora — anote ou envie):</p><code id="ad-senha-provisoria">' + escapar(mostrada) + "</code>" +
        '<div class="ct-acoes"><button type="button" class="perf-botao" data-ad-copiar="' + escapar(mostrada) + '">Copiar senha</button>' +
        (whatsapp(c.telefone) ? '<a class="perf-botao" href="' + whatsapp(c.telefone, msgWa) + '" target="_blank" rel="noopener">Enviar por WhatsApp</a>' : "") + "</div></div>" : "") +
      '<div class="ct-acoes">' +
        '<button type="button" class="perf-botao" data-ad-acesso="definir_senha" data-id="' + id + '">Definir senha provisória</button>' +
        '<button type="button" class="perf-botao" data-ad-acesso="enviar_link_senha" data-id="' + id + '">Enviar link de nova senha</button>' +
        '<button type="button" class="perf-botao" data-ad-acesso="trocar_email" data-id="' + id + '">Trocar e-mail</button>' +
        (c.bloqueado ? '<button type="button" class="btn-verde" data-ad-acesso="desbloquear" data-id="' + id + '">Desbloquear acesso</button>'
                     : '<button type="button" class="perf-tirar" data-ad-acesso="bloquear" data-id="' + id + '">Bloquear acesso</button>') +
      "</div><p class=\"dash-sub\">Bloquear impede a pessoa de entrar (os dados dela ficam guardados). A senha provisória obriga a criar uma senha nova no próximo acesso.</p></div>") +
      "</div>";
  }

  var FRASE = {
    liberar: "liberou o acesso de", recusar: "recusou o cadastro de", voltar_pendente: "voltou para análise a conta de",
    editar_perfil: "corrigiu os dados de", definir_senha: "definiu uma senha provisória para", enviar_link_senha: "enviou link de nova senha para",
    trocar_email: "trocou o e-mail de", bloquear: "bloqueou o acesso de", desbloquear: "desbloqueou o acesso de"
  };
  function detalheHistorico(h) {
    var d = h.detalhes || {}, partes = [];
    if (d.motivo) partes.push("motivo: " + d.motivo);
    if (h.acao === "trocar_email" && d.de) partes.push(d.de + " → " + d.para);
    if (h.acao === "editar_perfil") Object.keys(d).forEach(function (k) { if (d[k] && typeof d[k] === "object") partes.push(k + ": " + (d[k].de || "—") + " → " + (d[k].para || "—")); });
    return partes.length ? '<span class="ct-quando">' + escapar(partes.join(" · ")) + "</span>" : "";
  }
  function desenharHistorico() {
    if (!historico || !historico.length) return '<p class="dash-vazio">Nenhuma ação registrada ainda. Tudo que for feito aqui (liberar, recusar, senha, e-mail, bloqueio) fica registrado, sem poder ser apagado.</p>';
    return '<ul class="ct-lista ad-hist">' + historico.map(function (h) {
      return '<li class="ct-linha"><div class="ct-quem"><span class="ct-quando">' + escapar(dataHora(h.created_at)) + "</span>" +
        "<b>" + escapar(h.ator_nome || "Administração") + " " + escapar(FRASE[h.acao] || h.acao) + " " + escapar(h.alvo_nome || h.alvo_email || "conta removida") + "</b>" +
        detalheHistorico(h) + "</div></li>";
    }).join("") + "</ul>";
  }

  function desenhar() {
    var alvo = document.getElementById("contas-corpo");
    if (!alvo || !painel) return;
    var corpo = aba === "cadastros" ? desenharCadastros() : aba === "contas" ? desenharContas() : aba === "historico" ? desenharHistorico() : desenharGeral();
    var foco = document.activeElement && document.activeElement.id === "ad-busca" ? document.activeElement.selectionStart : null;
    alvo.innerHTML = abas() + '<div class="ad-corpo" data-ad-aba-atual="' + escapar(aba) + '">' + corpo + "</div>";
    if (foco !== null) { var b = document.getElementById("ad-busca"); if (b) { b.focus(); try { b.setSelectionRange(foco, foco); } catch (e) { /* nada */ } } }
  }

  /* modo antigo (SQL da administracao ainda nao aplicado) */
  function linhaAntiga(c, decidida) {
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
  function desenharAntigo() {
    var alvo = document.getElementById("contas-corpo");
    return Promise.all([sb().rpc("listar_contas", { p_status: "pendente" }), sb().rpc("listar_contas", { p_status: null })]).then(function (rs) {
      if (rs[0].error || rs[1].error) { alvo.innerHTML = '<p class="q-erro">Não foi possível ler os cadastros agora.</p>'; return; }
      var pend = rs[0].data || [];
      var decididas = (rs[1].data || []).filter(function (c) { return c.status !== "pendente" && c.aprovado_em; })
        .sort(function (a, b) { return String(b.aprovado_em).localeCompare(String(a.aprovado_em)); }).slice(0, 20);
      pendentes = pend.length; atualizarMenu();
      alvo.innerHTML =
        '<div class="dash-bloco"><h3 class="dash-titulo">Aguardando liberação (' + pend.length + ")</h3>" +
        (pend.length ? '<ul class="ct-lista">' + pend.map(function (c) { return linhaAntiga(c, false); }).join("") + "</ul>"
                     : '<p class="dash-vazio">Nenhum cadastro aguardando. O link para mandar às nutricionistas é <b>holohacking.com.br/cadastro</b>.</p>') + "</div>" +
        '<div class="dash-bloco"><h3 class="dash-titulo">Decididos recentemente</h3>' +
        (decididas.length ? '<ul class="ct-lista">' + decididas.map(function (c) { return linhaAntiga(c, true); }).join("") + "</ul>" : '<p class="dash-vazio">Nenhum ainda.</p>') + "</div>" +
        '<p class="dash-sub">Depois de liberar, avise a nutricionista (o botão WhatsApp abre a conversa). Ela entra com o e-mail e a senha que cadastrou.</p>';
    });
  }

  /* ---------- acoes ---------- */
  function conta(id) { return painel && painel.contas.filter(function (c) { return c.id === id; })[0]; }
  function confirmar(opts) {
    return window.abrirModalConfirmar ? window.abrirModalConfirmar(opts) : Promise.resolve(window.confirm(opts.titulo) ? "confirmar" : null);
  }
  function campoModal(nome) {
    var el = document.querySelector('#modal-confirmar-corpo [name="' + nome + '"]');
    return el ? el.value : "";
  }

  function definirStatus(id, status, motivo) {
    var chamada = completo
      ? sb().rpc("admin_definir_status", { p_user: id, p_status: status, p_motivo: motivo || null })
      : sb().rpc("decidir_conta", { p_user: id, p_aprovar: status === "ativo" });
    return Promise.resolve(chamada).then(function (r) {
      if (r && !r.error) avisar(status === "ativo" ? "Acesso liberado." : status === "recusado" ? "Cadastro recusado." : "Conta voltou para análise.");
      else avisar("Não foi possível registrar a decisão: " + ((r && r.error && r.error.message) || "erro"));
      return carregar();
    });
  }

  function pedirStatus(id, status) {
    if (status === "ativo") return definirStatus(id, "ativo");
    var recusar = status === "recusado";
    return confirmar({
      titulo: recusar ? "Recusar cadastro" : "Voltar para análise",
      corpo: (recusar ? "<p>Esta pessoa não vai conseguir usar o HoloHacking. Você pode liberar depois, se mudar de ideia.</p>"
                      : "<p>A conta volta a ficar aguardando liberação: a pessoa só edita o Perfil até você liberar de novo.</p>") +
        (completo ? '<label class="ad-modal-campo">Motivo (opcional, fica no histórico)<input type="text" name="motivo" maxlength="500"></label>' : ""),
      botaoConfirmar: recusar ? "Recusar" : "Voltar para análise"
    }).then(function (resp) { if (resp === "confirmar") return definirStatus(id, status, campoModal("motivo")); });
  }

  function salvarPerfil(form) {
    var id = form.getAttribute("data-ad-form-perfil");
    var nome = form.nome.value.trim(), tel = form.telefone.value.replace(/\D/g, "");
    if (nome.length < 2) { avisar("Informe o nome."); return; }
    if (tel && (tel.length < 10 || tel.length > 11)) { avisar("Telefone com DDD: 10 ou 11 números."); return; }
    Promise.resolve(sb().rpc("admin_editar_perfil", { p_user: id, p_nome: nome, p_telefone: tel })).then(function (r) {
      if (r && !r.error) { avisar(r.data && r.data.alterado === false ? "Nada mudou." : "Dados salvos."); carregar(); }
      else avisar("Não foi possível salvar: " + ((r && r.error && r.error.message) || "erro"));
    });
  }

  var MENSAGEM_ACESSO = {
    nao_autenticado: "Sua sessão expirou. Entre de novo.", apenas_administradores: "Só a administração pode fazer isso.",
    propria_conta: "Use o Perfil para mudar a sua própria conta.", alvo_administrador: "Contas da administração não são alteradas por aqui.",
    conta_nao_encontrada: "Conta não encontrada.", email_invalido: "E-mail inválido.", email_igual: "Esse já é o e-mail da conta.",
    email_em_uso: "Esse e-mail já pertence a outra conta.", limite_envio: "Muitos e-mails enviados agora. Tente de novo em alguns minutos.",
    acao_invalida: "Ação inválida.", nao_configurado: "A função de acesso está publicada mas sem configuração no Supabase.",
    falha_interna: "A função de acesso falhou. Tente de novo.", falha_auth: "O Supabase recusou a alteração."
  };
  function invocar(corpo) {
    if (!sb().functions || !sb().functions.invoke) return Promise.resolve({ ok: false, erro: "indisponivel" });
    return Promise.resolve(sb().functions.invoke("admin-usuarios", { body: corpo })).then(function (r) {
      if (r && !r.error && r.data) return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      /* resposta de erro da propria funcao (500 etc.): o corpo traz { ok:false, erro } */
      var ctx = r && r.error && r.error.context;
      if (ctx && typeof ctx.json === "function" && ctx.status && ctx.status !== 404) {
        return ctx.json().then(function (j) { return j && j.erro ? j : { ok: false, erro: "falha_interna" }; }, function () { return { ok: false, erro: "indisponivel" }; });
      }
      return { ok: false, erro: "indisponivel" };
    }, function () { return { ok: false, erro: "indisponivel" }; });
  }
  function resultadoAcesso(r, ok) {
    if (r && r.ok) { avisar(ok); return true; }
    var e = r && r.erro;
    avisar(e === "indisponivel" ? "A função de acesso (admin-usuarios) ainda não está publicada no Supabase."
                                : (MENSAGEM_ACESSO[e] || (r && r.mensagem) || "Não foi possível concluir."));
    return false;
  }

  function acesso(acao, id) {
    var c = conta(id); if (!c) return;
    var quem = "<b>" + escapar(c.nome || c.email) + "</b>";
    if (acao === "definir_senha") {
      return confirmar({ titulo: "Definir senha provisória", corpo: "<p>O sistema gera uma senha provisória para " + quem +
        ". A senha atual deixa de valer e, no próximo acesso, ela cria uma senha só dela. A senha provisória aparece uma única vez para você enviar.</p>",
        botaoConfirmar: "Gerar senha", classeConfirmar: "btn-verde" }).then(function (resp) {
        if (resp !== "confirmar") return;
        return invocar({ acao: "definir_senha", user_id: id }).then(function (r) {
          if (resultadoAcesso(r, "Senha provisória criada.")) { senhaMostrada = { id: id, senha: r.senha_provisoria }; aberta = id; return carregar(); }
        });
      });
    }
    if (acao === "enviar_link_senha") {
      return confirmar({ titulo: "Enviar link de nova senha", corpo: "<p>Vai um e-mail para <b>" + escapar(c.email) + "</b> com o link para criar uma senha nova. O envio de e-mails tem limite por hora; se a pessoa não receber, use a senha provisória.</p>",
        botaoConfirmar: "Enviar", classeConfirmar: "btn-verde" }).then(function (resp) {
        if (resp !== "confirmar") return;
        return invocar({ acao: "enviar_link_senha", user_id: id }).then(function (r) { if (resultadoAcesso(r, "Link enviado para " + c.email + ".")) return carregar(); });
      });
    }
    if (acao === "trocar_email") {
      return confirmar({ titulo: "Trocar e-mail", corpo: "<p>E-mail atual de " + quem + ": " + escapar(c.email) + "</p>" +
        '<label class="ad-modal-campo">Novo e-mail<input type="email" name="email" autocomplete="off"></label><p>A pessoa passa a entrar com o e-mail novo (a senha continua a mesma).</p>',
        botaoConfirmar: "Trocar e-mail", classeConfirmar: "btn-verde" }).then(function (resp) {
        if (resp !== "confirmar") return;
        var novo = campoModal("email").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo)) { avisar("E-mail inválido."); return; }
        return invocar({ acao: "trocar_email", user_id: id, email: novo }).then(function (r) { if (resultadoAcesso(r, "E-mail trocado.")) return carregar(); });
      });
    }
    if (acao === "bloquear") {
      return confirmar({ titulo: "Bloquear acesso", corpo: "<p>" + quem + " não vai conseguir entrar no HoloHacking até você desbloquear. Os dados dela ficam guardados.</p>" +
        '<label class="ad-modal-campo">Motivo (opcional, fica no histórico)<input type="text" name="motivo" maxlength="500"></label>', botaoConfirmar: "Bloquear" }).then(function (resp) {
        if (resp !== "confirmar") return;
        return invocar({ acao: "bloquear", user_id: id, motivo: campoModal("motivo") }).then(function (r) { if (resultadoAcesso(r, "Acesso bloqueado.")) return carregar(); });
      });
    }
    if (acao === "desbloquear") {
      return invocar({ acao: "desbloquear", user_id: id }).then(function (r) { if (resultadoAcesso(r, "Acesso desbloqueado.")) return carregar(); });
    }
  }

  function copiar(texto) {
    var feito = function () { avisar("Copiado."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(feito, function () { avisar(texto); });
    else avisar(texto);
  }

  document.addEventListener("click", function (ev) {
    var t = ev.target;
    var a = t.closest("[data-ct-aprovar]");
    if (a) { definirStatus(a.dataset.ctAprovar, "ativo"); return; }
    var r = t.closest("[data-ct-recusar]");
    if (r) { pedirStatus(r.dataset.ctRecusar, "recusado"); return; }
    var st = t.closest("[data-ad-status]");
    if (st) { pedirStatus(st.dataset.id, st.dataset.adStatus); return; }
    var ac = t.closest("[data-ad-acesso]");
    if (ac) { acesso(ac.dataset.adAcesso, ac.dataset.id); return; }
    var ab = t.closest("[data-ad-aba]");
    if (ab) { aba = ab.dataset.adAba; senhaMostrada = null; desenhar(); return; }
    var g = t.closest("[data-ad-gerenciar]");
    if (g) {
      var id = g.dataset.adGerenciar;
      if (aba !== "contas") { aba = "contas"; busca = ""; filtro = "todas"; aberta = id; }
      else aberta = aberta === id ? null : id;
      if (aberta !== (senhaMostrada && senhaMostrada.id)) senhaMostrada = null;
      desenhar();
      var d = document.getElementById("ad-detalhe");
      if (d && d.scrollIntoView) d.scrollIntoView({ block: "nearest" });
      return;
    }
    if (t.closest("[data-ad-atualizar]")) { carregar(); return; }
    var cp = t.closest("[data-ad-copiar]");
    if (cp) { copiar(cp.dataset.adCopiar); return; }
    var nav = t.closest('.nav-item[data-secao="contas"]');
    if (nav) carregar();
  });
  document.addEventListener("submit", function (ev) {
    var f = ev.target.closest && ev.target.closest("[data-ad-form-perfil]");
    if (f) { ev.preventDefault(); salvarPerfil(f); }
  });
  document.addEventListener("input", function (ev) {
    if (ev.target.id === "ad-busca") { busca = ev.target.value; desenhar(); }
  });
  document.addEventListener("change", function (ev) {
    if (ev.target.id === "ad-filtro") { filtro = ev.target.value; desenhar(); }
  });

  document.addEventListener("DOMContentLoaded", function () {
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
      window.HoloAuth.aoMudarEstado(function (estado) {
        if (estado === "autenticado") conferirAdmin();
        else {
          admin = false; pendentes = 0; avisou = false; painel = null; historico = null; aba = null; aberta = null; senhaMostrada = null; conhecidos = null;
          if (vigia) { clearInterval(vigia); vigia = null; }
          atualizarMenu();
        }
      });
    }
  });

  window.Contas = { desenhar: carregar, conferirAdmin: conferirAdmin, eAdmin: function () { return admin; } };
})();
