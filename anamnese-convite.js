/* ===========================================================================
   MAPEAMENTO HOLISTICO DA SAUDE — o lado da nutricionista (09/10; fluxo 13/10)
   ===========================================================================

   Na aba "Mapeamento Holistico" da ficha, antes do registro do atendimento. Os
   nomes tecnicos (tabela anamnesis_invites, RPCs, arquivos) continuam os mesmos.

   LEITURA (correcao 12/10): o banco da SELECT em anamnesis_invites COLUNA a
   COLUNA, sem token_hash. "select *" vira, no PostgREST, a lista de TODAS as
   colunas (inclusive token_hash) e o banco recusa a leitura inteira (42501).
   Por isso a leitura usa COLUNAS (explicita) e, se ainda assim falhar, o convite
   recem-criado (devolvido pela RPC) continua na tela com o link.

   ETAPAS (Plano mestre, Fase 1, 13/10) — uma regra so, usada aqui, na Visao
   geral e no Dashboard:

     NAO ENVIADO -> LINK GERADO -> LINK ENVIADO -> MAPEAMENTO RECEBIDO -> REVISADO
     (fora do caminho: LINK EXPIRADO, LINK REVOGADO)

     Link gerado          convite aberto, a nutricionista ainda nao copiou nem mandou
     Link enviado         copiou o link ou abriu o WhatsApp (sent_at, migration
                          20261022100000); "o paciente comecou a responder" se ja ha rascunho
     Mapeamento recebido  o paciente enviou (status concluido; a resposta ja fica salva no
                          servidor no envio, sem acao da nutricionista)
     Revisado             a resposta foi levada para o atendimento e a anamnese desse
                          atendimento foi concluida (salva/revisada)

   ATUALIZACAO SOZINHA: o paciente responde em outro aparelho. Enquanto a ficha
   do paciente estiver aberta com um link aberto, a tela confere o estado no
   servidor a cada POLL_MS (leitura leve, so colunas de estado) e ao voltar para
   a aba do navegador; quando a resposta chega, redesenha a aba e a Visao geral
   e avisa. Nada disso grava: so le.

   Gerar link -> o servidor devolve o token UMA vez (o banco guarda so o hash).
   O link fica disponivel para copiar / mandar pelo WhatsApp enquanto esta tela
   estiver aberta; depois disso, "Gerar novo link" (o anterior e revogado).

   Depois de recebido, a aba mostra o RESUMO (as palavras do paciente, sem
   interpretacao), "Abrir Mapeamento completo" e o historico de envios.
   "Levar para o atendimento" cria um rascunho V2 (origem relato_paciente) que a
   nutricionista revisa e salva. A resposta enviada nunca muda. Nada vira
   diagnostico, conduta, sistema ou score.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar || function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var cache = { pid: null, linhas: [], carregado: false, erro: null, lidoEm: 0 };
  var links = {};          // invite id -> link completo (so nesta sessao: o banco nao guarda o token)
  var vendoResposta = {};  // invite id -> true (resposta completa aberta)
  var enviadoLocal = {};   // invite id -> { at, via } quando o banco ainda nao tem a coluna sent_at
  var ocupado = false;

  var ROTULO = { nao_enviada: "Não enviado", enviado: "Enviado", iniciado: "Iniciado", concluido: "Concluído", expirado: "Expirado", revogado: "Revogado" };
  var ETAPA = {
    nao_enviado: "Não enviado", link_gerado: "Link gerado", link_enviado: "Link enviado",
    recebido: "Mapeamento recebido", revisado: "Revisado", expirado: "Link expirado", revogado: "Link revogado"
  };
  var CAMINHO = ["nao_enviado", "link_gerado", "link_enviado", "recebido", "revisado"];
  var TITULO = "Mapeamento Holístico da Saúde";
  var DIAS = 7;
  /* so o que a ficha usa; NUNCA token_hash (sem grant) nem "*" */
  var BASE = "id,patient_id,encounter_id,status,form_version,form_tipo,expires_at,submitted_content,imported_anamnesis_id,imported_at,created_at,started_at,last_saved_at,submitted_at,revoked_at";
  var ESTADO = "id,status,expires_at,started_at,last_saved_at,submitted_at,revoked_at,imported_at,imported_anamnesis_id";
  var semEnvioNoBanco = false;   // banco sem a migration 20261022100000 (sent_at / sent_via)
  var semRevisaoNoBanco = false; // banco sem a migration 20261025100000 (reviewed_at)
  var revisadoLocal = {};
  function colunas(estado) { return (estado ? ESTADO : BASE) + (semEnvioNoBanco ? "" : ",sent_at,sent_via") + (semRevisaoNoBanco ? "" : ",reviewed_at"); }
  function faltaColunaRevisao(e) { var t = String((e && e.message) || "") + " " + String((e && e.code) || ""); return /reviewed_at/.test(t); }
  function faltaColunaEnvio(e) { var t = String((e && e.message) || "") + " " + String((e && e.code) || ""); return /42703|sent_at|sent_via/.test(t); }
  function faltaRpc(e) { var t = String((e && e.message) || "") + " " + String((e && e.code) || ""); return /PGRST202|42883|could not find the function|does not exist/i.test(t); }

  function sb() { return window.supabaseClient; }
  function temSupa() { return !!(sb() && window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva()); }
  function pid() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function paciente() { var id = pid(); return (window.pacientesTodos ? window.pacientesTodos() : []).filter(function (p) { return p.id === id; })[0] || null; }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function dataHora(iso) { if (!iso) return "—"; try { return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", ""); } catch (e) { return String(iso); } }
  function estadoDe(c) {
    if (!c) return "nao_enviada";
    if ((c.status === "enviado" || c.status === "iniciado") && Date.parse(c.expires_at) < Date.now()) return "expirado";
    return c.status;
  }
  function envioDe(c) {
    if (!c) return null;
    if (c.sent_at) return { at: c.sent_at, via: c.sent_via };
    return enviadoLocal[c.id] || null;
  }
  /* a anamnese do atendimento para onde a resposta foi levada ja foi concluida? */
  function revisadoEm(c) {
    /* 14/10: a nutricionista pode marcar como revisado direto na aba */
    if (c && c.reviewed_at) return c.reviewed_at;
    if (c && revisadoLocal[c.id]) return revisadoLocal[c.id];
    if (!c || !c.imported_anamnesis_id) return null;
    var An = window.Anamnese;
    var lista = An && An.doPaciente ? An.doPaciente(c.patient_id) : [];
    var lev = lista.filter(function (a) { return a.id === c.imported_anamnesis_id; })[0];
    if (!lev) return null;
    var feitas = lista.filter(function (a) { return a.encounter_id === lev.encounter_id && (a.status === "salvo" || a.status === "revisado"); })
      .sort(function (a, b) { return String(a.updated_at || a.created_at).localeCompare(String(b.updated_at || b.created_at)); });
    return feitas.length ? (feitas[0].reviewed_at || feitas[0].updated_at || feitas[0].created_at || c.imported_at) : null;
  }
  /** A etapa do Mapeamento deste convite (o mais recente do paciente). Uma regra so para a aba, a Visao e o Dashboard. */
  function etapa(c) {
    var st = estadoDe(c);
    if (st === "nao_enviada") return { chave: "nao_enviado", rotulo: ETAPA.nao_enviado, quando: null, detalhe: "" };
    if (st === "expirado") return { chave: "expirado", rotulo: ETAPA.expirado, quando: c.expires_at, detalhe: "" };
    if (st === "revogado") return { chave: "revogado", rotulo: ETAPA.revogado, quando: c.revoked_at, detalhe: "" };
    if (st === "concluido") {
      var rev = revisadoEm(c);
      if (rev) return { chave: "revisado", rotulo: ETAPA.revisado, quando: rev, detalhe: (c.reviewed_at || revisadoLocal[c.id]) && !c.imported_anamnesis_id ? "Revisado pela nutricionista" : "Levado para o atendimento e concluído" };
      return { chave: "recebido", rotulo: ETAPA.recebido, quando: c.submitted_at,
        detalhe: c.imported_anamnesis_id ? "Levado para o atendimento: em revisão" : "Respondido pelo paciente" };
    }
    var env = envioDe(c);
    var comecou = st === "iniciado" ? "O paciente começou a responder" : "";
    if (env) return { chave: "link_enviado", rotulo: ETAPA.link_enviado, quando: st === "iniciado" ? (c.last_saved_at || c.started_at) : env.at,
      detalhe: comecou || (env.via === "whatsapp" ? "Enviado pelo WhatsApp" : "Link copiado para enviar") };
    return { chave: "link_gerado", rotulo: ETAPA.link_gerado, quando: st === "iniciado" ? (c.last_saved_at || c.started_at) : c.created_at,
      detalhe: comecou || "Ainda não enviado ao paciente" };
  }
  function atual() { return cache.linhas[0] || null; }
  function mensagemErro(err) {
    var h = err && err.hint;
    var M = { paciente_arquivado: "Paciente arquivado: reative para enviar o Mapeamento Holístico.", conta_nao_liberada: "Sua conta ainda não foi liberada para enviar o Mapeamento Holístico.",
      convite_concluido: "A paciente já respondeu este link.", logo_invalido: "Não foi possível usar o logo do seu perfil." };
    return M[h] || (window.mensagemHumana ? window.mensagemHumana(err) : (err && err.message) || "Não foi possível concluir.");
  }

  function indisponivel(e) {
    var t = String((e && (e.message || "")) + " " + (e && e.code || ""));
    return /PGRST205|PGRST202|42P01|42883|could not find the (table|function)|schema cache|does not exist/i.test(t) && !faltaColunaEnvio(e);
  }

  function ler(id, estado) {
    var tenta = function () { return Promise.resolve(sb().from("anamnesis_invites").select(colunas(estado)).eq("patient_id", id).order("created_at", { ascending: false })); };
    return tenta().then(function (r) {
      /* banco ainda sem a migration do "Link enviado": le sem as colunas novas (a tela continua funcionando) */
      if (r && r.error && !semRevisaoNoBanco && faltaColunaRevisao(r.error)) { semRevisaoNoBanco = true; return ler(id, estado); }
      if (r && r.error && !semEnvioNoBanco && faltaColunaEnvio(r.error)) { semEnvioNoBanco = true; return tenta(); }
      return r;
    });
  }
  function carregar(id) {
    if (!temSupa() || !id) { cache = { pid: id, linhas: [], carregado: true, erro: null, lidoEm: Date.now() }; return Promise.resolve(); }
    var anteriores = cache.pid === id ? cache.linhas : [];
    return ler(id, false).then(function (r) {
      var erro = r && r.error ? r.error : null;
      /* leitura falhou: nao apaga o que ja estava na tela (inclusive o convite recem-criado) */
      cache = { pid: id, linhas: !erro && r && Array.isArray(r.data) ? r.data : anteriores, carregado: true, erro: erro, lidoEm: Date.now() };
    }, function (e) { cache = { pid: id, linhas: anteriores, carregado: true, erro: e, lidoEm: Date.now() }; });
  }

  /* ---------- atualizacao sozinha ---------- */
  var POLL_MS = 20000;
  function assinatura(lista) {
    return (lista || []).map(function (c) { return [c.id, c.status, c.started_at, c.last_saved_at, c.submitted_at, c.revoked_at, c.imported_at, c.sent_at].join("~"); }).join("|");
  }
  var conferindo = false;
  var ouvintes = [];
  function avisarOuvintes() { ouvintes.forEach(function (fn) { try { fn(); } catch (e) { /* nada */ } }); }
  function redesenharTudo() {
    desenhar();   /* so o cartao do Mapeamento: o registro do atendimento (que pode estar sendo digitado) nao e tocado */
    if (window.JornadaPaciente && window.JornadaPaciente.recarregar) window.JornadaPaciente.recarregar();
    avisarOuvintes();
  }
  /** Le so o ESTADO dos convites do paciente aberto; se algo mudou no servidor (o paciente comecou, enviou...),
      rele tudo e redesenha. Devolve true quando mudou. */
  function conferir() {
    var id = pid();
    if (!temSupa() || !id || conferindo || cache.pid !== id || !cache.carregado) return Promise.resolve(false);
    conferindo = true;
    var antes = assinatura(cache.linhas), estavaAberto = /^(enviado|iniciado)$/.test(estadoDe(atual()));
    return ler(id, true).then(function (r) {
      if (!r || r.error || !Array.isArray(r.data) || pid() !== id) return false;
      if (assinatura(r.data) === antes) { cache.lidoEm = Date.now(); return false; }
      return carregar(id).then(function () {
        if (pid() !== id) return false;
        if (estavaAberto && estadoDe(atual()) === "concluido") {
          var p = paciente();
          toast("Mapeamento recebido" + (p && p.nome ? " de " + String(p.nome).trim().split(/\s+/)[0] : "") + ". A resposta já está na ficha.");
        }
        redesenharTudo();
        return true;
      });
    }).then(function (m) { conferindo = false; return m; }, function () { conferindo = false; return false; });
  }
  function fichaAberta() {
    var v = document.getElementById("vista-ficha");
    return !!(v && v.offsetParent !== null);
  }
  function precisaVigiar() {
    var c = atual();
    return /^(enviado|iniciado)$/.test(estadoDe(c));
  }
  var timer = null;
  function vigiar() {
    if (timer) clearTimeout(timer);
    var ms = window.__MH_POLL_MS || POLL_MS;
    timer = setTimeout(function () {
      timer = null;
      var visivel = typeof document.visibilityState === "undefined" || document.visibilityState === "visible";
      var p = visivel && fichaAberta() && precisaVigiar() ? conferir() : Promise.resolve(false);
      p.then(vigiar, vigiar);
    }, ms);
  }
  function aoVoltar() { if (fichaAberta() && cache.carregado && cache.pid === pid()) conferir(); }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") aoVoltar(); });
  window.addEventListener("focus", aoVoltar);
  vigiar();

  /* o logo do Perfil vira uma miniatura (data URL) que vai junto no convite: a pagina publica nao le o Storage */
  function miniaturaLogo() {
    var P = window.PerfilProfissional;
    var id = P && P.dados ? P.dados().logo_id : null;
    if (!id || !P.imagem) return Promise.resolve(null);
    return Promise.resolve(P.imagem(id)).then(function (url) {
      if (!url) return null;
      return new Promise(function (ok) {
        var img = new Image();
        img.onload = function () {
          try {
            var lado = 160, k = Math.min(1, lado / Math.max(img.width, img.height));
            var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            var d = cv.toDataURL("image/png");
            if (d.length > 88000) d = cv.toDataURL("image/jpeg", 0.8);
            ok(d.length <= 88000 ? d : null);
          } catch (e) { ok(null); }
        };
        img.onerror = function () { ok(null); };
        img.src = url;
      });
    }).catch(function () { return null; });
  }

  function linkDe(token) { return window.location.origin + "/anamnese.html#t=" + token; }
  function primeiroNome(n) { return String(n || "").trim().split(/\s+/)[0] || ""; }
  /* so um link do Mapeamento com token no formato do servidor (43 caracteres base64url) e valido para copiar/enviar */
  function linkValido(link) { return typeof link === "string" && /\/anamnese\.html#t=[A-Za-z0-9_-]{40,64}$/.test(link); }
  function mensagemWhats(link) {
    var p = paciente();
    return "Olá" + (p && p.nome ? ", " + primeiroNome(p.nome) : "") + ".\n\nAntes da nossa consulta, peço que preencha o seu Mapeamento Holístico da Saúde pelo link abaixo:\n\n" + link +
      "\n\nAs informações serão utilizadas para preparar seu atendimento.";
  }
  /* telefone -> numero do wa.me: so digitos, com 55 uma vez so (mesma regra do Resultado) */
  function numeroWhats(tel) {
    var R = window.ResultadoPagina;
    if (R && R.numeroWhatsApp) return R.numeroWhatsApp(tel);
    var d = String(tel || "").replace(/\D/g, "").replace(/^0+/, "");
    if (!d) return "";
    if (d.length === 10 || d.length === 11) return "55" + d;
    return d;
  }
  /* o link saiu (copiado ou WhatsApp): registra o 1o envio no servidor; a tela muda na hora */
  function marcarEnviado(c, via) {
    if (!c || envioDe(c)) return Promise.resolve();
    var agora = new Date().toISOString();
    enviadoLocal[c.id] = { at: agora, via: via };
    desenhar(); avisarOuvintes();
    if (semEnvioNoBanco || !temSupa()) return Promise.resolve();
    return Promise.resolve(sb().rpc("marcar_convite_anamnese_enviado", { p_id: c.id, p_via: via })).then(function (r) {
      if (r && r.error) { if (faltaRpc(r.error) || faltaColunaEnvio(r.error)) semEnvioNoBanco = true; return; }
      var d = (r && r.data) || {};
      cache.linhas = cache.linhas.map(function (x) { return x.id === c.id ? Object.assign({}, x, { sent_at: d.sent_at || agora, sent_via: d.sent_via || via }) : x; });
      if (window.JornadaPaciente && window.JornadaPaciente.recarregar) window.JornadaPaciente.recarregar();
    }, function () { /* sem rede: fica o registro desta sessao */ });
  }
  /* 14/10: a nutricionista confirma que leu o Mapeamento recebido (registro no servidor; a tela muda na hora) */
  function marcarRevisado(c) {
    if (!c || estadoDe(c) !== "concluido" || revisadoEm(c)) return Promise.resolve();
    var agora = new Date().toISOString();
    revisadoLocal[c.id] = agora;
    desenhar(); avisarOuvintes(); toast("Mapeamento marcado como revisado.");
    if (semRevisaoNoBanco || !temSupa()) return Promise.resolve();
    return Promise.resolve(sb().rpc("marcar_convite_anamnese_revisado", { p_id: c.id })).then(function (r) {
      if (r && r.error) { if (faltaRpc(r.error) || faltaColunaRevisao(r.error)) semRevisaoNoBanco = true; return; }
      var d = (r && r.data) || {};
      cache.linhas = cache.linhas.map(function (x) { return x.id === c.id ? Object.assign({}, x, { reviewed_at: d.reviewed_at || agora }) : x; });
      if (window.JornadaPaciente && window.JornadaPaciente.recarregar) window.JornadaPaciente.recarregar();
    }, function () { /* sem rede: fica o registro desta sessao */ });
  }
  function whatsapp(link, c) {
    if (!linkValido(link)) { toast("Link indisponível. Gere um novo link."); return; }
    var p = paciente();
    var url = "https://wa.me/" + numeroWhats(p && p.telefone) + "?text=" + encodeURIComponent(mensagemWhats(link));
    try { window.open(url, "_blank", "noopener"); } catch (e) { /* bloqueado: o link continua visivel no cartao */ }
    if (!(p && p.telefone)) toast("Telefone do paciente não cadastrado: escolha o contato na conversa que abriu.");
    marcarEnviado(c, "whatsapp");
  }
  function copiarSemApi(link) {
    try {
      var ta = document.createElement("textarea");
      ta.value = link; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }
  function copiar(link, c) {
    if (!linkValido(link)) { toast("Link indisponível. Gere um novo link."); return Promise.resolve(false); }
    var feito = function () { toast("Link copiado."); marcarEnviado(c, "copiado"); return true; };
    var reserva = function () {
      if (copiarSemApi(link)) return feito();
      try { window.prompt("Copie o link:", link); } catch (e) { /* sem prompt: o link continua visivel no cartao */ }
      return false;
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(link).then(feito, reserva);
    return Promise.resolve(reserva());
  }

  /* ---------- tela ---------- */
  /* A resposta ENVIADA, completa, nas etapas e com as perguntas que o paciente viu (mapeamento-holistico.js).
     So leitura: a resposta original nunca muda. */
  function htmlResposta(c) {
    var MH = window.MapeamentoHolistico;
    var corpo = MH ? MH.respostaHtml(c.submitted_content || {}, escapar) : '<p class="dash-vazio">Sem conteúdo para mostrar.</p>';
    return '<div class="pc-resposta"><p class="pc-origem">Respostas do paciente, enviadas em ' + escapar(dataHora(c.submitted_at)) +
      '. Como o paciente respondeu — nada aqui é diagnóstico nem conclusão.</p>' + corpo + "</div>";
  }
  /* o essencial da resposta, nas palavras do paciente */
  function htmlResumo(c) {
    var MH = window.MapeamentoHolistico;
    var itens = MH && MH.resumo ? MH.resumo(c.submitted_content || {}) : [];
    var tipo = c.form_tipo === "retorno" ? "Retorno" : "Primeira consulta";
    return '<section class="pc-resumo" aria-labelledby="pc-resumo-tit"><h4 id="pc-resumo-tit" class="pc-sub-tit">Resumo do que o paciente trouxe <span class="pc-resumo-tipo">' + tipo + "</span></h4>" +
      (itens.length ? '<dl class="pc-resumo-lista">' + itens.map(function (i) {
        return '<div class="pc-resumo-item"><dt>' + escapar(i.rotulo) + "</dt><dd>" + escapar(i.texto).replace(/\n/g, "<br>") + "</dd></div>";
      }).join("") + "</dl>" : '<p class="pc-sub">O paciente não respondeu às perguntas principais. Abra o Mapeamento completo.</p>') +
      '<p class="pc-nota">Palavras do paciente, sem interpretação. Não altera HOLOSCAN, notas nem sistemas.</p></section>';
  }
  /* a linha do caminho: os 5 passos, com o que ja aconteceu marcado */
  function htmlCaminho(c, et) {
    var idx = CAMINHO.indexOf(et.chave);
    var env = envioDe(c), rev = c ? revisadoEm(c) : null;
    var datas = { nao_enviado: null, link_gerado: c && c.created_at, link_enviado: env && env.at, recebido: c && c.submitted_at, revisado: rev };
    var fora = idx < 0;
    return '<ol class="pc-caminho' + (fora ? " pc-caminho-fora" : "") + '" aria-label="Etapas do Mapeamento">' + CAMINHO.slice(1).map(function (k, i) {
      var n = i + 1, feito = !fora && idx >= n, agora = !fora && idx === n;
      return '<li class="pc-passo' + (feito ? " feito" : "") + (agora ? " atual" : "") + '"' + (agora ? ' aria-current="step"' : "") + ">" +
        '<span class="pc-passo-n" aria-hidden="true">' + (feito && !agora ? "✓" : n) + "</span>" +
        '<span class="pc-passo-txt">' + escapar(ETAPA[k]) + (feito && datas[k] ? "<small>" + escapar(dataHora(datas[k])) + "</small>" : "") + "</span></li>";
    }).join("") + "</ol>";
  }
  /* historico de todos os envios deste paciente (o atual incluido), mais recente primeiro */
  function htmlHistorico(atualId) {
    if (cache.linhas.length < 2) return "";
    var A = window.AtendimentoAtual;
    return '<section class="pc-cartao pc-historico" aria-labelledby="pc-hist-tit"><h4 id="pc-hist-tit" class="pc-sub-tit">Histórico do Mapeamento (' + cache.linhas.length + ")</h4><ul class=\"pc-hist-lista\">" +
      cache.linhas.map(function (x) {
        var et = etapa(x), env = envioDe(x);
        var e = x.encounter_id && A && A.porId ? A.porId(x.encounter_id) : null;
        var partes = ["Link gerado em " + dataHora(x.created_at)];
        if (env) partes.push((env.via === "whatsapp" ? "enviado pelo WhatsApp em " : "copiado em ") + dataHora(env.at));
        if (x.submitted_at) partes.push("recebido em " + dataHora(x.submitted_at));
        if (x.imported_at) partes.push("levado para o atendimento em " + dataHora(x.imported_at));
        if (et.chave === "revogado") partes.push("revogado em " + dataHora(x.revoked_at));
        if (et.chave === "expirado") partes.push("expirou em " + dataHora(x.expires_at));
        var cab = '<span class="pc-hist-etapa pc-et-' + et.chave + '">' + escapar(et.rotulo) + "</span> " +
          escapar((x.form_tipo === "retorno" ? "Retorno" : "Primeira consulta") + (e && A.rotuloQuando ? " · atendimento de " + A.rotuloQuando(e) : "")) +
          (x.id === atualId ? ' <span class="pc-hist-atual">atual</span>' : "") + '<br><small>' + escapar(partes.join(" · ")) + "</small>";
        if (x.status === "concluido" && x.id !== atualId) return '<li><details class="mh-anterior"><summary>' + cab + "</summary>" + htmlResumo(x) + htmlResposta(x) + "</details></li>";
        return "<li>" + cab + "</li>";
      }).join("") + "</ul></section>";
  }

  function desenhar() {
    var alvo = document.getElementById("an-preconsulta");
    if (!alvo) return;
    var id = pid();
    if (!id) { alvo.innerHTML = ""; return; }
    if (!temSupa()) { alvo.innerHTML = ""; return; }
    if (cache.pid !== id || !cache.carregado) {
      alvo.innerHTML = '<section class="pc-cartao"><p class="dash-vazio">Carregando o Mapeamento Holístico…</p></section>';
      carregar(id).then(function () { if (pid() === id) { desenhar(); avisarOuvintes(); } });
      return;
    }
    /* aba aberta de novo: confere no servidor se algo mudou (sem esperar o proximo ciclo) */
    if (Date.now() - (cache.lidoEm || 0) > 5000) setTimeout(conferir, 0);
    /* banco ainda sem a pre-anamnese (SQL ANAMNESE-PRE-CONSULTA nao aplicado): o cartao nao aparece */
    if (cache.erro && indisponivel(cache.erro)) { alvo.innerHTML = ""; return; }
    var c = atual(), st = estadoDe(c), et = etapa(c), link = c && links[c.id], env = envioDe(c);
    var arq = window.pacienteArquivado && window.pacienteArquivado(id);
    var aberto = st === "enviado" || st === "iniciado";
    var recebido = st === "concluido";
    var validade = c && c.created_at && c.expires_at ? Math.round((Date.parse(c.expires_at) - Date.parse(c.created_at)) / 86400000) : null;
    var linhaData = function (rot, v) { return "<div><dt>" + rot + "</dt><dd>" + escapar(v) + "</dd></div>"; };
    var dl = c ? '<dl class="pc-datas">' +
      (recebido ? linhaData("Recebido em", dataHora(c.submitted_at)) : "") +
      linhaData("Link gerado em", dataHora(c.created_at)) +
      (env ? linhaData(env.via === "whatsapp" ? "Enviado pelo WhatsApp em" : "Link copiado em", dataHora(env.at)) : "") +
      (aberto && validade ? linhaData("Validade", validade + (validade === 1 ? " dia" : " dias")) : "") +
      (aberto ? linhaData("Expira em", dataHora(c.expires_at)) : "") +
      (c.started_at && !recebido ? linhaData("Paciente começou em", dataHora(c.started_at)) : "") +
      (c.last_saved_at && st === "iniciado" ? linhaData("Última resposta salva", dataHora(c.last_saved_at)) : "") +
      (c.imported_at ? linhaData("Levado ao atendimento em", dataHora(c.imported_at)) : "") +
      (st === "expirado" ? linhaData("Expirou em", dataHora(c.expires_at)) : "") +
      (st === "revogado" ? linhaData("Revogado em", dataHora(c.revoked_at)) : "") +
      "</dl>" : "";
    var bt = function (acao, txt, cls) { return '<button type="button" class="' + (cls || "perf-botao") + '" data-pc-acao="' + acao + '"' + (arq || ocupado ? " disabled" : "") + ">" + txt + "</button>"; };
    var acoes = "", secundarias = "";
    if (st === "nao_enviada" || st === "revogado" || st === "expirado") acoes = bt("gerar", ocupado ? "Gerando link…" : "Enviar Mapeamento Holístico", "btn-verde");
    else if (aberto) {
      acoes = (link ? bt("copiar", "Copiar link") + bt("whatsapp", "Enviar pelo WhatsApp", "btn-verde") : bt("novo", "Gerar novo link")) +
        bt("revogar", "Revogar link", "perf-tirar");
    } else if (recebido) {
      /* depois da resposta, a tela e sobre o que o paciente trouxe: resumo, resposta completa e levar ao atendimento.
         Enviar outro Mapeamento fica como acao secundaria. */
      acoes = bt("ver", vendoResposta[c.id] ? "Fechar Mapeamento completo" : "Abrir Mapeamento completo") +
        (et.chave !== "revisado" ? bt("revisado", "Marcar como revisado") : "") +
        (!c.imported_anamnesis_id ? bt("usar", "Levar para o atendimento", "btn-verde") : "");
      secundarias = bt("novo", "Enviar novo Mapeamento", "btn-fantasma pc-novo");
    }
    var sub = recebido ? "Resposta salva automaticamente quando o paciente enviou." + (c.imported_anamnesis_id ? "" : " Leia o resumo e leve para o atendimento.")
      : aberto ? "O paciente preenche pelo link, no celular ou no computador, sem criar conta. Quando ele enviar, a resposta aparece aqui sozinha."
      : "Você envia um link e o paciente preenche no celular ou no computador, sem criar conta. A resposta aparece aqui antes da consulta.";
    alvo.innerHTML = '<section class="pc-cartao pc-et-' + et.chave + '" aria-labelledby="pc-titulo">' +
      '<div class="pc-topo"><h3 id="pc-titulo" class="pc-titulo">' + TITULO + "</h3>" +
      '<span class="pc-status pc-' + escapar(st) + '"><span class="pc-sr">Status: </span>' + escapar(et.rotulo) + "</span></div>" +
      '<p class="pc-sub">' + sub + "</p>" +
      htmlCaminho(c, et) +
      (cache.erro && !link ? '<p class="q-erro">Não foi possível ler o Mapeamento Holístico: ' + escapar(mensagemErro(cache.erro)) + "</p>" : "") +
      (recebido ? '<p class="pc-recebido" role="status">' + escapar(et.rotulo === ETAPA.revisado ? "Mapeamento revisado" : "Mapeamento recebido") + " · " + escapar(dataHora(c.submitted_at)) + "</p>" : "") +
      ((aberto || (et.chave === "recebido" && c.imported_anamnesis_id)) && et.detalhe ? '<p class="pc-detalhe" role="status">' + escapar(et.detalhe) + "</p>" : "") +
      (link && aberto && !env ? '<p class="pc-sucesso" role="status">Link gerado com sucesso. Copie ou envie pelo WhatsApp.</p>' : "") +
      (recebido ? htmlResumo(c) : "") +
      dl +
      (link && aberto ? '<p class="pc-link"><span>Link:</span> <code>' + escapar(link) + "</code></p>" : "") +
      (aberto && !link ? '<p class="pc-sub">Por segurança o link só aparece no momento em que é gerado. Para enviar de novo, use "Gerar novo link" (o anterior deixa de valer).</p>' : "") +
      (c && c.imported_anamnesis_id ? '<p class="pc-sub">Levado para o atendimento em ' + escapar(dataHora(c.imported_at)) + (et.chave === "revisado" ? ". Anamnese do atendimento concluída." : ". O rascunho profissional está logo abaixo.") + "</p>" : "") +
      (arq ? '<p class="pc-sub">Paciente arquivado: reative para enviar o Mapeamento Holístico.</p>' : "") +
      '<div class="pc-acoes">' + acoes + "</div>" +
      (recebido && vendoResposta[c.id] ? htmlResposta(c) : "") +
      (secundarias ? '<div class="pc-acoes pc-acoes-sec">' + secundarias + "</div>" : "") +
      "</section>" + htmlHistorico(c ? c.id : null);
  }

  function gerar(revogarAntes) {
    var p = paciente(); if (!p || ocupado) return;
    ocupado = true; desenhar();
    var A = window.AtendimentoAtual, e = A && A.atual ? A.atual() : null;
    /* primeira consulta x retorno: retorno se o paciente ja tem anamnese profissional salva (regra mantida) */
    var tipo = window.Anamnese && window.Anamnese.doPaciente && window.Anamnese.doPaciente(p.id).some(function (a) { return a.status !== "rascunho"; }) ? "retorno" : "primeira";
    return miniaturaLogo().then(function (logo) {
      return Promise.resolve(sb().rpc("criar_convite_anamnese", { p_patient_id: p.id, p_encounter_id: e && e.patient_id === p.id ? e.id : null, p_dias: DIAS, p_tipo: tipo, p_logo: logo }));
    }).then(function (r) {
      ocupado = false;
      if (!r || r.error) throw (r && r.error) || new Error("sem resposta");
      var d = r.data || {};
      if (!d.id || typeof d.token !== "string" || !/^[A-Za-z0-9_-]{40,64}$/.test(d.token)) throw new Error("O servidor não devolveu o link. Tente de novo.");
      links[d.id] = linkDe(d.token);
      /* o convite novo entra na tela JA com o que a RPC devolveu: se a releitura falhar, o link nao some */
      var novo = { id: d.id, patient_id: p.id, status: d.status || "enviado", form_tipo: d.form_tipo || tipo, expires_at: d.expires_at,
        created_at: new Date().toISOString(), started_at: null, submitted_at: null, revoked_at: null, imported_anamnesis_id: null, imported_at: null, sent_at: null, sent_via: null };
      var resto = (cache.pid === p.id ? cache.linhas : []).filter(function (x) { return x.id !== d.id; })
        .map(function (x) { return (x.status === "enviado" || x.status === "iniciado") ? Object.assign({}, x, { status: "revogado", revoked_at: x.revoked_at || novo.created_at }) : x; });
      cache = { pid: p.id, linhas: [novo].concat(resto), carregado: true, erro: null, lidoEm: Date.now() };
      toast(revogarAntes ? "Novo link gerado. O anterior deixou de valer." : "Link gerado com sucesso. Envie para o paciente.");
      desenhar();
      return carregar(p.id);
    }).then(function () { desenhar(); avisarOuvintes(); if (window.JornadaPaciente && window.JornadaPaciente.recarregar) window.JornadaPaciente.recarregar(); })
      .catch(function (err) { ocupado = false; toast(err && err.message && !err.hint && !err.code ? err.message : mensagemErro(err)); desenhar(); });
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-pc-acao]"); var caixa = document.getElementById("an-preconsulta");
    if (!b || !caixa || !caixa.contains(b)) return;
    var c = atual(), acao = b.dataset.pcAcao;
    if (acao === "gerar") return gerar(false);
    if (acao === "novo") {
      var conf = window.abrirModalConfirmar ? window.abrirModalConfirmar({ titulo: "Gerar novo link", corpo: "<p>O link anterior deixa de funcionar" + (c && estadoDe(c) === "iniciado" ? " (o que o paciente já preencheu nele fica guardado aqui, mas recomeça no novo link)" : "") + ".</p>", botaoConfirmar: "Gerar novo link", classeConfirmar: "btn-verde" })
        : Promise.resolve(confirm("Gerar novo link? O anterior deixa de funcionar.") ? "confirmar" : null);
      return conf.then(function (r) { if (r === "confirmar") gerar(true); });
    }
    if (!c) return;
    if (acao === "copiar" && links[c.id]) return copiar(links[c.id], c);
    if (acao === "whatsapp" && links[c.id]) return whatsapp(links[c.id], c);
    if (acao === "ver") { vendoResposta[c.id] = !vendoResposta[c.id]; return desenhar(); }
    if (acao === "revisado") return marcarRevisado(c);
    if (acao === "revogar") {
      var cr = window.abrirModalConfirmar ? window.abrirModalConfirmar({ titulo: "Revogar link", corpo: "<p>O paciente não vai mais conseguir abrir nem enviar por este link.</p>", botaoConfirmar: "Revogar link" })
        : Promise.resolve(confirm("Revogar o link?") ? "confirmar" : null);
      return cr.then(function (r) {
        if (r !== "confirmar") return;
        Promise.resolve(sb().rpc("revogar_convite_anamnese", { p_id: c.id })).then(function (x) {
          if (x && x.error) throw x.error;
          delete links[c.id];
          /* a tela ja mostra "Revogado" mesmo se a releitura falhar */
          cache.linhas = cache.linhas.map(function (x) { return x.id === c.id ? Object.assign({}, x, { status: "revogado", revoked_at: (x && x.revoked_at) || new Date().toISOString() }) : x; });
          toast("Link revogado."); desenhar(); return carregar(c.patient_id);
        }).then(function () { desenhar(); avisarOuvintes(); }).catch(function (err) { toast(mensagemErro(err)); });
      });
    }
    if (acao === "usar") {
      if (!window.Anamnese || !window.Anamnese.usarPreConsulta) return;
      ocupado = true; desenhar();
      window.Anamnese.usarPreConsulta(c).then(function (linha) {
        return Promise.resolve(sb().rpc("marcar_convite_anamnese_usado", { p_id: c.id, p_anamnesis_id: linha.id }));
      }).then(function () {
        ocupado = false; toast("O Mapeamento virou o rascunho da anamnese deste atendimento. Revise e salve.");
        return carregar(c.patient_id);
      }).then(function () { desenhar(); avisarOuvintes(); }).catch(function (err) { ocupado = false; toast(err && err.message && !err.hint ? err.message : mensagemErro(err)); desenhar(); });
    }
  });

  /* a anamnese do atendimento foi concluida: a etapa pode virar "Revisado" */
  window.addEventListener("load", function () {
    if (window.Anamnese && window.Anamnese.aoMudar) window.Anamnese.aoMudar(function () {
      if (cache.carregado && cache.pid === pid() && atual() && atual().imported_anamnesis_id) { desenhar(); avisarOuvintes(); }
    });
  });

  if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
    window.HoloAuth.aoMudarEstado(function (estado) { if (estado !== "autenticado") { cache = { pid: null, linhas: [], carregado: false, erro: null, lidoEm: 0 }; links = {}; vendoResposta = {}; enviadoLocal = {}; revisadoLocal = {}; } });
  }

  window.PreConsulta = {
    desenhar: desenhar, carregar: carregar, estadoDe: estadoDe, etapa: etapa, conferir: conferir,
    ETAPA: ETAPA, CAMINHO: CAMINHO,
    /** colunas que o Dashboard pode ler (com ou sem a migration do "Link enviado") */
    colunasEstado: function () { return "id,patient_id,status,expires_at,created_at,started_at,last_saved_at,submitted_at,imported_at,imported_anamnesis_id,revoked_at" + (semEnvioNoBanco ? "" : ",sent_at,sent_via"); },
    semColunaEnvio: function (e) { if (faltaColunaEnvio(e)) { semEnvioNoBanco = true; return true; } return false; },
    aoMudar: function (fn) { if (typeof fn === "function" && ouvintes.indexOf(fn) < 0) ouvintes.push(fn); },
    /** situacao do Mapeamento deste paciente (so do que ja foi lido; null = ainda nao lido) */
    situacao: function (id) {
      if (cache.pid !== id || !cache.carregado) return null;
      var c = atual(), st = estadoDe(c), et = etapa(c);
      return { estado: st, etapa: et.chave, rotulo: et.rotulo, detalhe: et.detalhe, quando: et.quando };
    },
    esquecer: function () { cache = { pid: null, linhas: [], carregado: false, erro: null, lidoEm: 0 }; links = {}; vendoResposta = {}; enviadoLocal = {}; revisadoLocal = {}; }
  };
})();
