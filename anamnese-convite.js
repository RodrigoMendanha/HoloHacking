/* ===========================================================================
   ANAMNESE PRE-CONSULTA — o lado da nutricionista (09/10)
   ===========================================================================

   Na aba Anamnese da ficha, antes do registro do atendimento: o status da
   pre-anamnese da paciente e as acoes.

     Nao enviada | Enviada | Iniciada | Concluida | Expirada | Revogada

   Gerar link -> o servidor devolve o token UMA vez (o banco guarda so o hash).
   O link fica disponivel para copiar / mandar pelo WhatsApp enquanto esta tela
   estiver aberta; depois disso, "Gerar novo link" (o anterior e revogado).

   A resposta da paciente aparece aqui como RELATO DA PACIENTE, organizada pelo
   mesmo resumo da Anamnese V2. "Levar para a anamnese do atendimento" cria um
   rascunho V2 (origem relato_paciente) que a nutricionista revisa e salva. A
   resposta enviada nunca muda. Nada vira diagnostico, conduta, sistema ou score.
   =========================================================================== */
(function () {
  "use strict";
  var escapar = window.escapar || function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  var cache = { pid: null, linhas: [], carregado: false, erro: null };
  var links = {};          // invite id -> link completo (so nesta sessao: o banco nao guarda o token)
  var vendoResposta = {};  // invite id -> true
  var ocupado = false;

  var ROTULO = { nao_enviada: "Não enviada", enviado: "Enviada", iniciado: "Iniciada", concluido: "Concluída", expirado: "Expirada", revogado: "Revogada" };

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
  function atual() { return cache.linhas[0] || null; }
  function mensagemErro(err) {
    var h = err && err.hint;
    var M = { paciente_arquivado: "Paciente arquivado: reative para enviar a anamnese.", conta_nao_liberada: "Sua conta ainda não foi liberada para enviar anamneses.",
      convite_concluido: "A paciente já respondeu este link.", logo_invalido: "Não foi possível usar o logo do seu perfil." };
    return M[h] || (window.mensagemHumana ? window.mensagemHumana(err) : (err && err.message) || "Não foi possível concluir.");
  }

  function indisponivel(e) {
    var t = String((e && (e.message || "")) + " " + (e && e.code || ""));
    return /PGRST205|PGRST202|42P01|42883|could not find the (table|function)|schema cache|does not exist/i.test(t);
  }

  function carregar(id) {
    if (!temSupa() || !id) { cache = { pid: id, linhas: [], carregado: true, erro: null }; return Promise.resolve(); }
    return Promise.resolve(sb().from("anamnesis_invites").select("*").eq("patient_id", id).order("created_at", { ascending: false }))
      .then(function (r) {
        cache = { pid: id, linhas: r && !r.error && Array.isArray(r.data) ? r.data : [], carregado: true, erro: r && r.error ? r.error : null };
      }, function (e) { cache = { pid: id, linhas: [], carregado: true, erro: e }; });
  }

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
  function mensagemWhats(link) {
    var p = paciente();
    return "Olá" + (p && p.nome ? ", " + primeiroNome(p.nome) : "") + ".\nAntes da nossa consulta, peço que preencha sua anamnese pelo link abaixo:\n\n" + link +
      "\n\nAs informações serão usadas para preparar seu atendimento.";
  }
  function whatsapp(link) {
    var p = paciente(), R = window.ResultadoPagina;
    var msg = mensagemWhats(link);
    var url = R && R.linkWhatsApp ? R.linkWhatsApp(p && p.telefone, msg)
      : "https://wa.me/" + (p && p.telefone ? "55" + String(p.telefone).replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "") : "") + "?text=" + encodeURIComponent(msg);
    try { window.open(url, "_blank", "noopener"); } catch (e) { location.href = url; }
    if (!(p && p.telefone)) toast("Telefone da paciente não cadastrado: escolha o contato na conversa que abriu.");
  }
  function copiar(link) {
    var feito = function () { toast("Link copiado."); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(link).then(feito, function () { prompt("Copie o link:", link); });
    prompt("Copie o link:", link);
  }

  /* ---------- tela ---------- */
  function htmlResposta(c) {
    var V2 = window.AnamneseV2;
    var env = c.submitted_content || {};
    var content = V2 && V2.montarContent ? V2.montarContent(env.tipo || "primeira", env.formulario || {}, {}) : null;
    var resumo = V2 && content ? V2.resumoHtml(content) : "";
    var recusados = [];
    Object.keys(env.formulario || {}).forEach(function (b) { Object.keys(env.formulario[b] || {}).forEach(function (k) { if (/_prefiro_nao$/.test(k) && env.formulario[b][k] === true) recusados.push(k.replace(/_prefiro_nao$/, "")); }); });
    return '<div class="pc-resposta"><p class="pc-origem">Relato da paciente, enviado em ' + escapar(dataHora(c.submitted_at)) +
      '. Organizado como foi respondido — nada aqui é diagnóstico nem conclusão.</p>' +
      (resumo || '<p class="dash-vazio">Sem conteúdo para mostrar.</p>') +
      (recusados.length ? '<p class="pc-origem">A paciente marcou "Prefiro não responder" em: ' + escapar(recusados.map(function (k) { return k === "emocional" ? "como tem se sentido" : k === "sentido" ? "sentido pessoal" : k; }).join(", ")) + ".</p>" : "") +
      "</div>";
  }

  function desenhar() {
    var alvo = document.getElementById("an-preconsulta");
    if (!alvo) return;
    var id = pid();
    if (!id) { alvo.innerHTML = ""; return; }
    if (!temSupa()) { alvo.innerHTML = ""; return; }
    if (cache.pid !== id || !cache.carregado) {
      alvo.innerHTML = '<section class="pc-cartao"><p class="dash-vazio">Carregando a pré-anamnese…</p></section>';
      carregar(id).then(function () { if (pid() === id) desenhar(); });
      return;
    }
    /* banco ainda sem a pre-anamnese (SQL ANAMNESE-PRE-CONSULTA nao aplicado): o cartao nao aparece */
    if (cache.erro && indisponivel(cache.erro)) { alvo.innerHTML = ""; return; }
    var c = atual(), st = estadoDe(c), link = c && links[c.id];
    var arq = window.pacienteArquivado && window.pacienteArquivado(id);
    var dl = c ? '<dl class="pc-datas">' +
      "<div><dt>Enviada</dt><dd>" + escapar(dataHora(c.created_at)) + "</dd></div>" +
      "<div><dt>Iniciada</dt><dd>" + escapar(dataHora(c.started_at)) + "</dd></div>" +
      "<div><dt>Concluída</dt><dd>" + escapar(dataHora(c.submitted_at)) + "</dd></div>" +
      (st === "enviado" || st === "iniciado" ? "<div><dt>Vale até</dt><dd>" + escapar(dataHora(c.expires_at)) + "</dd></div>" : "") +
      (st === "revogado" ? "<div><dt>Revogada</dt><dd>" + escapar(dataHora(c.revoked_at)) + "</dd></div>" : "") +
      "</dl>" : "";
    var bt = function (acao, txt, cls) { return '<button type="button" class="' + (cls || "perf-botao") + '" data-pc-acao="' + acao + '"' + (arq || ocupado ? " disabled" : "") + ">" + txt + "</button>"; };
    var acoes = "";
    if (st === "nao_enviada" || st === "revogado" || st === "expirado") acoes = bt("gerar", "Gerar link", "btn-verde");
    else if (st === "enviado" || st === "iniciado") {
      acoes = (link ? bt("copiar", "Copiar link") + bt("whatsapp", "Enviar pelo WhatsApp", "btn-verde") : "") +
        bt("novo", "Gerar novo link") + bt("revogar", "Revogar", "perf-tirar");
    } else if (st === "concluido") {
      acoes = bt("ver", vendoResposta[c.id] ? "Esconder resposta" : "Ver resposta", "btn-verde") +
        (!c.imported_anamnesis_id ? bt("usar", "Levar para a anamnese do atendimento") : "") + bt("novo", "Gerar novo link");
    }
    alvo.innerHTML = '<section class="pc-cartao" aria-labelledby="pc-titulo">' +
      '<div class="pc-topo"><h3 id="pc-titulo" class="pc-titulo">Anamnese pré-consulta</h3>' +
      '<span class="pc-status pc-' + escapar(st) + '">' + escapar(ROTULO[st] || st) + "</span></div>" +
      '<p class="pc-sub">A paciente preenche pelo celular, sem criar conta, e a resposta aparece aqui antes da consulta.</p>' +
      (cache.erro ? '<p class="q-erro">Não foi possível ler a pré-anamnese: ' + escapar(mensagemErro(cache.erro)) + "</p>" : "") +
      dl +
      (link && (st === "enviado" || st === "iniciado") ? '<p class="pc-link"><span>Link:</span> <code>' + escapar(link) + "</code></p>" : "") +
      ((st === "enviado" || st === "iniciado") && !link ? '<p class="pc-sub">Por segurança o link só aparece quando é gerado. Para enviar de novo, use "Gerar novo link" (o anterior deixa de valer).</p>' : "") +
      (c && c.imported_anamnesis_id ? '<p class="pc-sub">Levada para a anamnese do atendimento em ' + escapar(dataHora(c.imported_at)) + ".</p>" : "") +
      (arq ? '<p class="pc-sub">Paciente arquivado: reative para enviar a anamnese.</p>' : "") +
      '<div class="pc-acoes">' + acoes + "</div>" +
      (st === "concluido" && vendoResposta[c.id] ? htmlResposta(c) : "") +
      "</section>";
  }

  function gerar(revogarAntes) {
    var p = paciente(); if (!p) return;
    ocupado = true; desenhar();
    var A = window.AtendimentoAtual, e = A && A.atual ? A.atual() : null;
    var tipo = window.Anamnese && window.Anamnese.doPaciente && window.Anamnese.doPaciente(p.id).some(function (a) { return a.status !== "rascunho"; }) ? "retorno" : "primeira";
    return miniaturaLogo().then(function (logo) {
      return Promise.resolve(sb().rpc("criar_convite_anamnese", { p_patient_id: p.id, p_encounter_id: e && e.patient_id === p.id ? e.id : null, p_dias: 7, p_tipo: tipo, p_logo: logo }));
    }).then(function (r) {
      ocupado = false;
      if (!r || r.error) throw (r && r.error) || new Error("sem resposta");
      links[r.data.id] = linkDe(r.data.token);
      toast(revogarAntes ? "Novo link gerado. O anterior deixou de valer." : "Link gerado. Envie para a paciente.");
      return carregar(p.id);
    }).then(desenhar).catch(function (err) { ocupado = false; toast(mensagemErro(err)); desenhar(); });
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-pc-acao]"); if (!b || !document.getElementById("an-preconsulta").contains(b)) return;
    var c = atual(), acao = b.dataset.pcAcao;
    if (acao === "gerar") return gerar(false);
    if (acao === "novo") {
      var conf = window.abrirModalConfirmar ? window.abrirModalConfirmar({ titulo: "Gerar novo link", corpo: "<p>O link anterior deixa de funcionar" + (c && estadoDe(c) === "iniciado" ? " (o que a paciente já preencheu nele fica guardado aqui, mas ela recomeça no novo link)" : "") + ".</p>", botaoConfirmar: "Gerar novo link", classeConfirmar: "btn-verde" })
        : Promise.resolve(confirm("Gerar novo link? O anterior deixa de funcionar.") ? "confirmar" : null);
      return conf.then(function (r) { if (r === "confirmar") gerar(true); });
    }
    if (!c) return;
    if (acao === "copiar" && links[c.id]) return copiar(links[c.id]);
    if (acao === "whatsapp" && links[c.id]) return whatsapp(links[c.id]);
    if (acao === "ver") { vendoResposta[c.id] = !vendoResposta[c.id]; return desenhar(); }
    if (acao === "revogar") {
      var cr = window.abrirModalConfirmar ? window.abrirModalConfirmar({ titulo: "Revogar link", corpo: "<p>A paciente não vai mais conseguir abrir nem enviar por este link.</p>", botaoConfirmar: "Revogar" })
        : Promise.resolve(confirm("Revogar o link?") ? "confirmar" : null);
      return cr.then(function (r) {
        if (r !== "confirmar") return;
        Promise.resolve(sb().rpc("revogar_convite_anamnese", { p_id: c.id })).then(function (x) {
          if (x && x.error) throw x.error;
          delete links[c.id]; toast("Link revogado."); return carregar(c.patient_id);
        }).then(desenhar).catch(function (err) { toast(mensagemErro(err)); });
      });
    }
    if (acao === "usar") {
      if (!window.Anamnese || !window.Anamnese.usarPreConsulta) return;
      ocupado = true; desenhar();
      window.Anamnese.usarPreConsulta(c).then(function (linha) {
        return Promise.resolve(sb().rpc("marcar_convite_anamnese_usado", { p_id: c.id, p_anamnesis_id: linha.id }));
      }).then(function () {
        ocupado = false; toast("A pré-anamnese virou o rascunho da anamnese deste atendimento. Revise e salve.");
        return carregar(c.patient_id);
      }).then(desenhar).catch(function (err) { ocupado = false; toast(err && err.message && !err.hint ? err.message : mensagemErro(err)); desenhar(); });
    }
  });

  if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
    window.HoloAuth.aoMudarEstado(function (estado) { if (estado !== "autenticado") { cache = { pid: null, linhas: [], carregado: false, erro: null }; links = {}; vendoResposta = {}; } });
  }

  window.PreConsulta = {
    desenhar: desenhar, carregar: carregar, estadoDe: estadoDe,
    esquecer: function () { cache = { pid: null, linhas: [], carregado: false, erro: null }; links = {}; vendoResposta = {}; }
  };
})();
