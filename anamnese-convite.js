/* ===========================================================================
   ANAMNESE PRE-CONSULTA — o lado da nutricionista (09/10)
   ===========================================================================

   Na aba Anamnese da ficha, antes do registro do atendimento: o status da
   pre-anamnese da paciente e as acoes. Na interface (12/10) chama-se
   MAPEAMENTO HOLISTICO DA SAUDE; os nomes tecnicos (tabela anamnesis_invites,
   RPCs, arquivos) continuam os mesmos.

   LEITURA (correcao 12/10): o banco da SELECT em anamnesis_invites COLUNA a
   COLUNA, sem token_hash. "select *" vira, no PostgREST, a lista de TODAS as
   colunas (inclusive token_hash) e o banco recusa a leitura inteira (42501).
   Era isso que quebrava o "Gerar link": o convite era criado, mas a releitura
   falhava, a lista ficava vazia e a tela voltava para "Nao enviado". Por isso a
   leitura usa COLUNAS (explicita) e, se ainda assim falhar, o convite recem-criado
   (devolvido pela RPC) continua na tela com o link.

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

  var ROTULO = { nao_enviada: "Não enviado", enviado: "Enviado", iniciado: "Iniciado", concluido: "Concluído", expirado: "Expirado", revogado: "Revogado" };
  var TITULO = "Mapeamento Holístico da Saúde";
  var DIAS = 7;
  /* so o que a ficha usa; NUNCA token_hash (sem grant) nem "*" */
  var COLUNAS = "id,patient_id,encounter_id,status,form_version,form_tipo,expires_at,submitted_content,imported_anamnesis_id,imported_at,created_at,started_at,last_saved_at,submitted_at,revoked_at";

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
    var M = { paciente_arquivado: "Paciente arquivado: reative para enviar o Mapeamento Holístico.", conta_nao_liberada: "Sua conta ainda não foi liberada para enviar o Mapeamento Holístico.",
      convite_concluido: "A paciente já respondeu este link.", logo_invalido: "Não foi possível usar o logo do seu perfil." };
    return M[h] || (window.mensagemHumana ? window.mensagemHumana(err) : (err && err.message) || "Não foi possível concluir.");
  }

  function indisponivel(e) {
    var t = String((e && (e.message || "")) + " " + (e && e.code || ""));
    return /PGRST205|PGRST202|42P01|42883|could not find the (table|function)|schema cache|does not exist/i.test(t);
  }

  function carregar(id) {
    if (!temSupa() || !id) { cache = { pid: id, linhas: [], carregado: true, erro: null }; return Promise.resolve(); }
    var anteriores = cache.pid === id ? cache.linhas : [];
    return Promise.resolve(sb().from("anamnesis_invites").select(COLUNAS).eq("patient_id", id).order("created_at", { ascending: false }))
      .then(function (r) {
        var erro = r && r.error ? r.error : null;
        /* leitura falhou: nao apaga o que ja estava na tela (inclusive o convite recem-criado) */
        cache = { pid: id, linhas: !erro && r && Array.isArray(r.data) ? r.data : anteriores, carregado: true, erro: erro };
      }, function (e) { cache = { pid: id, linhas: anteriores, carregado: true, erro: e }; });
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
  function whatsapp(link) {
    if (!linkValido(link)) { toast("Link indisponível. Gere um novo link."); return; }
    var p = paciente();
    var url = "https://wa.me/" + numeroWhats(p && p.telefone) + "?text=" + encodeURIComponent(mensagemWhats(link));
    var w = null;
    try { w = window.open(url, "_blank", "noopener"); } catch (e) { w = null; }
    if (!(p && p.telefone)) toast("Telefone do paciente não cadastrado: escolha o contato na conversa que abriu.");
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
  function copiar(link) {
    if (!linkValido(link)) { toast("Link indisponível. Gere um novo link."); return Promise.resolve(false); }
    var feito = function () { toast("Link copiado."); return true; };
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
  /* Mapeamentos recebidos antes do atual: recolhidos, para rever */
  function htmlAnteriores(atualId) {
    var antigos = cache.linhas.filter(function (x) { return x.id !== atualId && x.status === "concluido"; });
    if (!antigos.length) return "";
    return '<div class="mh-anteriores"><h4 class="pc-sub-tit">Mapeamentos anteriores</h4>' + antigos.map(function (x) {
      return '<details class="mh-anterior"><summary>Recebido em ' + escapar(dataHora(x.submitted_at)) + (x.form_tipo === "retorno" ? " · retorno" : " · primeira consulta") + "</summary>" + htmlResposta(x) + "</details>";
    }).join("") + "</div>";
  }

  function desenhar() {
    var alvo = document.getElementById("an-preconsulta");
    if (!alvo) return;
    var id = pid();
    if (!id) { alvo.innerHTML = ""; return; }
    if (!temSupa()) { alvo.innerHTML = ""; return; }
    if (cache.pid !== id || !cache.carregado) {
      alvo.innerHTML = '<section class="pc-cartao"><p class="dash-vazio">Carregando o Mapeamento Holístico…</p></section>';
      carregar(id).then(function () { if (pid() === id) desenhar(); });
      return;
    }
    /* banco ainda sem a pre-anamnese (SQL ANAMNESE-PRE-CONSULTA nao aplicado): o cartao nao aparece */
    if (cache.erro && indisponivel(cache.erro)) { alvo.innerHTML = ""; return; }
    var c = atual(), st = estadoDe(c), link = c && links[c.id];
    var arq = window.pacienteArquivado && window.pacienteArquivado(id);
    var aberto = st === "enviado" || st === "iniciado";
    var validade = c && c.created_at && c.expires_at ? Math.round((Date.parse(c.expires_at) - Date.parse(c.created_at)) / 86400000) : null;
    var linhaData = function (rot, v) { return "<div><dt>" + rot + "</dt><dd>" + escapar(v) + "</dd></div>"; };
    var dl = c ? '<dl class="pc-datas">' +
      linhaData("Criado em", dataHora(c.created_at)) +
      (aberto && validade ? linhaData("Validade", validade + (validade === 1 ? " dia" : " dias")) : "") +
      (aberto ? linhaData("Expira em", dataHora(c.expires_at)) : "") +
      (c.started_at ? linhaData("Iniciado em", dataHora(c.started_at)) : "") +
      (c.submitted_at ? linhaData("Recebido em", dataHora(c.submitted_at)) : "") +
      (st === "expirado" ? linhaData("Expirou em", dataHora(c.expires_at)) : "") +
      (st === "revogado" ? linhaData("Revogado em", dataHora(c.revoked_at)) : "") +
      "</dl>" : "";
    var bt = function (acao, txt, cls) { return '<button type="button" class="' + (cls || "perf-botao") + '" data-pc-acao="' + acao + '"' + (arq || ocupado ? " disabled" : "") + ">" + txt + "</button>"; };
    var acoes = "";
    if (st === "nao_enviada" || st === "revogado" || st === "expirado") acoes = bt("gerar", ocupado ? "Gerando link…" : "Enviar Mapeamento Holístico", "btn-verde");
    else if (aberto) {
      acoes = (link ? bt("copiar", "Copiar link") + bt("whatsapp", "Enviar pelo WhatsApp", "btn-verde") : bt("novo", "Gerar novo link")) +
        bt("revogar", "Revogar link", "perf-tirar");
    } else if (st === "concluido") {
      /* 12/10: a resposta aparece aberta; "Levar para o atendimento" saiu (o Mapeamento e so o do paciente) */
      acoes = bt("ver", vendoResposta[c.id] === false ? "Ver respostas" : "Recolher respostas") + bt("novo", "Enviar novo Mapeamento");
    }
    alvo.innerHTML = '<section class="pc-cartao" aria-labelledby="pc-titulo">' +
      '<div class="pc-topo"><h3 id="pc-titulo" class="pc-titulo">' + TITULO + "</h3>" +
      '<span class="pc-status pc-' + escapar(st) + '"><span class="pc-sr">Status: </span>' + escapar(ROTULO[st] || st) + "</span></div>" +
      '<p class="pc-sub">O paciente preenche pelo celular, sem criar conta, e a resposta aparece aqui antes da consulta.</p>' +
      (cache.erro && !link ? '<p class="q-erro">Não foi possível ler o Mapeamento Holístico: ' + escapar(mensagemErro(cache.erro)) + "</p>" : "") +
      (st === "concluido" ? '<p class="pc-recebido" role="status">Mapeamento recebido</p>' : "") +
      (link && aberto ? '<p class="pc-sucesso" role="status">Link gerado com sucesso</p>' : "") +
      dl +
      (link && aberto ? '<p class="pc-link"><span>Link:</span> <code>' + escapar(link) + "</code></p>" : "") +
      (aberto && !link ? '<p class="pc-sub">Por segurança o link só aparece no momento em que é gerado. Para enviar de novo, use "Gerar novo link" (o anterior deixa de valer).</p>' : "") +

      (arq ? '<p class="pc-sub">Paciente arquivado: reative para enviar o Mapeamento Holístico.</p>' : "") +
      '<div class="pc-acoes">' + acoes + "</div>" +
      (st === "concluido" && vendoResposta[c.id] !== false ? htmlResposta(c) : "") +
      "</section>" + htmlAnteriores(c ? c.id : null);
  }

  function gerar(revogarAntes) {
    var p = paciente(); if (!p || ocupado) return;
    ocupado = true; desenhar();
    var A = window.AtendimentoAtual, e = A && A.atual ? A.atual() : null;
    /* retorno se o paciente ja tem Mapeamento recebido (ou um registro antigo da nutricionista); senao, primeira consulta */
    var jaRecebeu = cache.pid === p.id && cache.linhas.some(function (x) { return x.status === "concluido"; });
    var registroAntigo = window.Anamnese && window.Anamnese.doPaciente && window.Anamnese.doPaciente(p.id).some(function (a) { return a.status !== "rascunho"; });
    var tipo = jaRecebeu || registroAntigo ? "retorno" : "primeira";
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
        created_at: new Date().toISOString(), started_at: null, submitted_at: null, revoked_at: null, imported_anamnesis_id: null, imported_at: null };
      var resto = (cache.pid === p.id ? cache.linhas : []).filter(function (x) { return x.id !== d.id; })
        .map(function (x) { return (x.status === "enviado" || x.status === "iniciado") ? Object.assign({}, x, { status: "revogado", revoked_at: x.revoked_at || novo.created_at }) : x; });
      cache = { pid: p.id, linhas: [novo].concat(resto), carregado: true, erro: null };
      toast(revogarAntes ? "Novo link gerado. O anterior deixou de valer." : "Link gerado com sucesso. Envie para o paciente.");
      desenhar();
      return carregar(p.id);
    }).then(desenhar).catch(function (err) { ocupado = false; toast(err && err.message && !err.hint && !err.code ? err.message : mensagemErro(err)); desenhar(); });
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("[data-pc-acao]"); if (!b || !document.getElementById("an-preconsulta").contains(b)) return;
    var c = atual(), acao = b.dataset.pcAcao;
    if (acao === "gerar") return gerar(false);
    if (acao === "novo") {
      var conf = window.abrirModalConfirmar ? window.abrirModalConfirmar({ titulo: "Gerar novo link", corpo: "<p>O link anterior deixa de funcionar" + (c && estadoDe(c) === "iniciado" ? " (o que o paciente já preencheu nele fica guardado aqui, mas recomeça no novo link)" : "") + ".</p>", botaoConfirmar: "Gerar novo link", classeConfirmar: "btn-verde" })
        : Promise.resolve(confirm("Gerar novo link? O anterior deixa de funcionar.") ? "confirmar" : null);
      return conf.then(function (r) { if (r === "confirmar") gerar(true); });
    }
    if (!c) return;
    if (acao === "copiar" && links[c.id]) return copiar(links[c.id]);
    if (acao === "whatsapp" && links[c.id]) return whatsapp(links[c.id]);
    if (acao === "ver") { vendoResposta[c.id] = vendoResposta[c.id] === false; return desenhar(); }
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
        }).then(desenhar).catch(function (err) { toast(mensagemErro(err)); });
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
      }).then(desenhar).catch(function (err) { ocupado = false; toast(err && err.message && !err.hint ? err.message : mensagemErro(err)); desenhar(); });
    }
  });

  if (window.HoloAuth && window.HoloAuth.aoMudarEstado) {
    window.HoloAuth.aoMudarEstado(function (estado) { if (estado !== "autenticado") { cache = { pid: null, linhas: [], carregado: false, erro: null }; links = {}; vendoResposta = {}; } });
  }

  window.PreConsulta = {
    desenhar: desenhar, carregar: carregar, estadoDe: estadoDe,
    /** situacao do Mapeamento deste paciente (so do que ja foi lido; null = ainda nao lido) */
    situacao: function (id) {
      if (cache.pid !== id || !cache.carregado) return null;
      var c = atual(), st = estadoDe(c);
      var quando = st === "concluido" ? c.submitted_at : st === "iniciado" ? c.started_at : c ? c.created_at : null;
      return { estado: st, rotulo: st === "concluido" ? "Mapeamento recebido" : (ROTULO[st] || st), quando: quando };
    },
    esquecer: function () { cache = { pid: null, linhas: [], carregado: false, erro: null }; links = {}; vendoResposta = {}; }
  };
})();
