/* ===========================================================================
   RESULTADO — a pagina final para a paciente (secao #secao-resultado)
   ===========================================================================

   Decisao de produto 09/10. Esta tela APRESENTA e ENVIA o resultado: ela nao
   calcula, nao escolhe fonte e nao escreve nada no servidor. Tudo o que
   mostra vem de registros ja finalizados:

     - o Resultado HOLOS SALVO mais recente do paciente (holos_results, status
       salvo/revisado, nao substituido), na VISAO DA PACIENTE que a
       nutricionista preparou e finalizou na aba "Resultado HOLOS" da ficha —
       HOLOSCAN oficial, cinco sistemas, Indice, Triade, ferramentas de Corpo,
       Mente e Espirito marcadas "mostrar a paciente" e os textos da
       nutricionista (ResultadoHolos.documentoHtml, sem recalculo);
     - a CONDUTA VIGENTE do paciente (consolidada), nos campos escritos pela
       nutricionista: objetivo, estrategia, acoes, recursos, orientacoes,
       retorno e os acordos combinados;
     - a IDENTIDADE PROFISSIONAL do Perfil: nome, registro, especialidade,
       logo, assinatura e carimbo.

   NAO entra: exame, documento, valor laboratorial, Leitura Integrada, dieta,
   calorias, prescricao, diagnostico, encaminhamento, IA. O sistema nao gera
   recomendacao: "o que fazer" sao as ferramentas do metodo e o que a
   nutricionista escreveu. Um aviso SO NA TELA (nunca no PDF) alerta a
   nutricionista se o texto dela trouxer termos fora do metodo.

   PDF: gerado no navegador (html2pdf.js, versao fixa, carregado so no clique);
   nenhum link publico, nada sobe para lugar nenhum. WhatsApp: no celular,
   compartilha o PDF pelo menu nativo; no computador, baixa o PDF e abre a
   conversa da paciente (numero do cadastro) com a mensagem pronta.
   =========================================================================== */

(function () {
  "use strict";

  var escapar = window.escapar;
  var dataBR = window.dataBR;
  var HTML2PDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
  /* termos fora do metodo: so AVISA a nutricionista na tela; nao bloqueia, nao edita, nao entra no PDF */
  var TERMOS_FORA = /\b(dieta|d[eé]ficit|cal[oó]ric|kcal|calorias?|card[aá]pio|prescri[cç]|diagn[oó]stic|encaminh)/i;
  var CAMPOS_CONDUTA = [
    ["objective", "Objetivo desta etapa"], ["nutrition_strategy", "Estratégia"], ["actions", "Ações combinadas"],
    ["resources", "Recursos e apoios"], ["professional_guidance", "Orientações da nutricionista"], ["return_plan", "Retorno"]
  ];

  function temSupa() { return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva()); }
  function alvo() { return document.getElementById("resultado-pagina-corpo"); }
  function pacienteId() { return window.pacienteAtivoId ? window.pacienteAtivoId() : null; }
  function pacienteObj(pid) { return ((window.pacientesTodos && window.pacientesTodos()) || []).filter(function (p) { return p.id === pid; })[0] || null; }
  function perfil() { return window.PerfilProfissional ? window.PerfilProfissional.dados() : {}; }
  function toast(m) { if (window.avisar) window.avisar(m); }
  function tem(v) { return v !== null && v !== undefined && String(v).trim() !== ""; }
  function quebras(t) { return escapar(t).replace(/\n/g, "<br>"); }
  function dataHora(iso) {
    if (!iso) return "";
    var d = new Date(iso); if (isNaN(d)) return String(iso);
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() + " " +
      String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function primeiroNome(nome) { return String(nome || "").trim().split(/\s+/)[0] || ""; }

  /* ---------- fontes (so leitura) ------------------------------------------ */

  /** O Resultado HOLOS a apresentar: o mais recente finalizado (salvo/revisado) e nao substituido. */
  function resultadoFinal(pid) {
    var R = window.ResultadoHolos; if (!R) return null;
    var l = R.doPaciente(pid).filter(function (r) { return r.status !== "rascunho" && !r.superseded_at && r.content_snapshot; })
      .sort(function (a, b) { return String(b.saved_at || b.created_at).localeCompare(String(a.saved_at || a.created_at)); });
    return l[0] || null;
  }
  function condutaVigente(pid) {
    var Cd = window.Conduta; if (!Cd || !Cd.vigenteDoPaciente) return null;
    var v = Cd.vigenteDoPaciente(pid);
    if (!v) return null;
    var acordos = Cd.acordosDe ? Cd.acordosDe(v.conduta.id) : [];
    return { conduta: v.conduta, atendimento: v.atendimento, acordos: acordos };
  }
  function termosFora(textos) {
    var achados = {};
    textos.forEach(function (t) { var m = String(t || "").match(new RegExp(TERMOS_FORA.source, "gi")); (m || []).forEach(function (x) { achados[x.toLowerCase()] = true; }); });
    return Object.keys(achados);
  }

  /* ---------- HTML ------------------------------------------------------------ */

  function cabecalhoProfissional(eu) {
    var linha2 = [eu.profissao, eu.registro].filter(Boolean).map(escapar).join(" &middot; ");
    var linha3 = [eu.especialidade, eu.cidade].filter(Boolean).map(escapar).join(" &middot; ");
    return '<header class="rp-cab">' +
      '<span class="rp-logo" id="rp-logo" aria-hidden="true"></span>' +
      '<div class="rp-quem"><b>' + escapar(eu.nome || "HoloHacking") + "</b>" +
        (linha2 ? "<span>" + linha2 + "</span>" : "") + (linha3 ? "<span>" + linha3 + "</span>" : "") + "</div>" +
      '<div class="rp-marca"><span class="eyebrow">HoloHacking &middot; HOLOSCAN</span></div>' +
    "</header>";
  }

  function blocoConduta(cv) {
    if (!cv) return "";
    var c = cv.conduta;
    var campos = CAMPOS_CONDUTA.filter(function (f) { return tem(c[f[0]]); });
    var acordos = (cv.acordos || []).filter(function (g) { return tem(g.description); });
    if (!campos.length && !acordos.length) return "";
    return '<section class="rh-secao rp-conduta" aria-labelledby="rp-t-cond"><h3 id="rp-t-cond">Próximos passos combinados</h3>' +
      '<p class="rh-intro">O que foi combinado com a sua nutricionista nesta etapa. Não é dieta nem prescrição: são passos do método, escritos por ela para você.</p>' +
      campos.map(function (f) { return '<div class="rp-campo"><h4>' + escapar(f[1]) + "</h4><p>" + quebras(c[f[0]]) + "</p></div>"; }).join("") +
      (acordos.length ? '<div class="rp-campo"><h4>Combinados</h4><ul class="rp-acordos">' + acordos.map(function (g) {
        return "<li>" + escapar(g.description) + (tem(g.due_text) ? ' <small>(' + escapar(g.due_text) + ")</small>" : "") + "</li>";
      }).join("") + "</ul></div>" : "") +
    "</section>";
  }

  function rodapeProfissional(eu) {
    var identidade = [eu.nome, eu.registro].filter(Boolean).map(escapar).join(" &middot; ");
    var contato = [eu.telefone, eu.instagram].filter(Boolean).map(escapar).join(" &middot; ");
    return '<footer class="rp-rodape">' +
      ((eu.assinatura_id || eu.carimbo_id)
        ? '<div class="rp-assinaturas">' + (eu.assinatura_id ? '<span class="rp-imagem" id="rp-assinatura"></span>' : "") + (eu.carimbo_id ? '<span class="rp-imagem" id="rp-carimbo"></span>' : "") + "</div>"
        : "") +
      (identidade ? '<p class="rp-emitiu">' + identidade + "</p>" : "") +
      (contato ? '<p class="rp-contato">' + contato + "</p>" : "") +
      '<p class="rp-fronteira">Este material organiza o que foi registrado na sua avaliação com a sua nutricionista. Não é exame, não é diagnóstico e não é prescrição. Os próximos passos são combinados em consulta.</p>' +
    "</footer>";
  }

  function documentoHtml(pid, r, cv, eu) {
    var snap = r.content_snapshot;
    var meta = { status: r.status, hash: r.content_hash };
    var corpo = window.ResultadoHolos.documentoHtml(snap, "paciente", meta);
    return '<article class="rp-doc" id="rp-doc" aria-label="Resultado para a paciente">' +
      cabecalhoProfissional(eu) +
      '<div class="rp-corpo">' + corpo + blocoConduta(cv) + "</div>" +
      rodapeProfissional(eu) +
    "</article>";
  }

  function avisoTermos(r, cv) {
    var obs = (r.content_snapshot && r.content_snapshot.observacoes) || {};
    var textos = [obs.leitura_profissional, obs.pontos_acompanhar];
    if (cv) { CAMPOS_CONDUTA.forEach(function (f) { textos.push(cv.conduta[f[0]]); }); (cv.acordos || []).forEach(function (g) { textos.push(g.description); }); }
    var achados = termosFora(textos);
    if (!achados.length) return "";
    return '<p class="rp-aviso rp-so-tela" id="rp-aviso-termos" role="status">Atenção: o seu texto contém termos fora do método (' + achados.map(escapar).join(", ") +
      "). O HoloHacking não entrega dieta, calorias, prescrição, diagnóstico nem encaminhamento. Revise na Conduta ou no Resultado HOLOS antes de enviar. Este aviso não vai no PDF.</p>";
  }

  function barraAcoes(pid, r, p) {
    var tel = p && numeroWhatsApp(p.telefone);
    return '<div class="rp-acoes rp-so-tela" id="rp-acoes">' +
      '<div class="rp-estado"><span class="rh-tag">Resultado HOLOS nº ' + escapar(r.revision_number || 1) + "</span>" +
        "<span>Finalizado em " + escapar(dataHora(r.saved_at || r.created_at)) + " &middot; versão para a paciente</span>" +
        (tel ? "" : '<span class="rp-sem-tel">Sem telefone no cadastro: o WhatsApp abre sem a conversa da paciente.</span>') + "</div>" +
      '<div class="rp-botoes">' +
        '<button type="button" class="btn-verde" data-rp-acao="pdf">Baixar PDF</button>' +
        '<button type="button" class="btn-verde" data-rp-acao="whatsapp">Enviar pelo WhatsApp</button>' +
        '<button type="button" class="btn-fantasma" data-rp-acao="imprimir">Imprimir</button>' +
        '<button type="button" class="btn-fantasma" data-rp-acao="ficha">Abrir na ficha</button>' +
      "</div></div>";
  }

  /* ---------- desenhar ----------------------------------------------------------- */

  var desenhoAtual = 0;
  function desenhar() {
    var a = alvo(); if (!a) return;
    var pid = pacienteId();
    var vez = ++desenhoAtual;
    if (!pid) { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">Escolha uma paciente para ver o resultado dela.</div>'; return; }
    if (!temSupa()) { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">Entre na sua conta para ver o Resultado: ele é montado a partir do Resultado HOLOS finalizado no servidor.</div>'; return; }
    var p = pacienteObj(pid);
    if (p && p.status === "inativo") { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">Paciente arquivado. Reative na ficha para apresentar o resultado.</div>'; return; }
    a.innerHTML = '<div class="dash-vazio" id="rp-carregando">Carregando o resultado…</div>';
    var R = window.ResultadoHolos;
    if (!R) { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">O módulo do Resultado HOLOS não carregou.</div>'; return; }
    R.carregar(pid).then(function () {
      if (vez !== desenhoAtual || pacienteId() !== pid) return;
      var r = resultadoFinal(pid);
      if (!r) {
        a.innerHTML = '<div class="lista-vazia" id="rp-vazio"><strong>Nenhum Resultado HOLOS finalizado para ' + escapar(p ? primeiroNome(p.nome) : "esta paciente") + "</strong>" +
          "<span>Prepare e finalize o Resultado HOLOS na ficha (aba Resultado HOLOS). Rascunho não aparece para a paciente.</span>" +
          '<button type="button" class="btn-verde" data-rp-acao="ficha">Abrir Resultado HOLOS na ficha</button></div>';
        return;
      }
      var cv = condutaVigente(pid), eu = perfil();
      a.innerHTML = barraAcoes(pid, r, p) + avisoTermos(r, cv) + documentoHtml(pid, r, cv, eu);
      pintarImagens(eu);
    }, function (err) {
      if (vez !== desenhoAtual) return;
      a.innerHTML = '<div class="lista-vazia" id="rp-vazio"><strong>Não foi possível carregar o resultado</strong><span>' + escapar((err && err.message) || "Tente de novo.") + "</span></div>";
    });
  }

  function pintarImagens(eu) {
    if (!window.PerfilProfissional) return;
    [["logo_id", "rp-logo"], ["assinatura_id", "rp-assinatura"], ["carimbo_id", "rp-carimbo"]].forEach(function (par) {
      if (!eu[par[0]]) return;
      window.PerfilProfissional.imagem(eu[par[0]]).then(function (url) {
        var el = document.getElementById(par[1]);
        if (el && url) el.innerHTML = '<img src="' + url + '" alt="">';
      });
    });
  }

  /* ---------- PDF ------------------------------------------------------------------ */

  function carregarHtml2pdf() {
    if (typeof window.html2pdf === "function") return Promise.resolve(window.html2pdf);
    return new Promise(function (ok, falhou) {
      var sc = document.createElement("script");
      sc.src = HTML2PDF_URL;
      sc.async = true;
      sc.onload = function () { typeof window.html2pdf === "function" ? ok(window.html2pdf) : falhou(new Error("gerador de PDF indisponível")); };
      sc.onerror = function () { falhou(new Error("não foi possível carregar o gerador de PDF")); };
      document.head.appendChild(sc);
    });
  }
  function nomeArquivo(p) {
    var base = "Resultado-HOLOS-" + String(p && p.nome || "paciente").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    return base + ".pdf";
  }
  /** Gera o PDF do documento na tela. Resolve com { blob, nome }. */
  function gerarPdf() {
    var doc = document.getElementById("rp-doc");
    if (!doc) return Promise.reject(new Error("Nenhum resultado na tela."));
    var p = pacienteObj(pacienteId());
    var nome = nomeArquivo(p);
    return carregarHtml2pdf().then(function (h2p) {
      document.body.classList.add("rp-gerando");
      var fechados = [].slice.call(doc.querySelectorAll("details:not([open])"));
      fechados.forEach(function (d) { d.open = true; });
      var limpar = function () { document.body.classList.remove("rp-gerando"); fechados.forEach(function (d) { d.open = false; }); };
      return Promise.resolve(h2p().set({
        margin: [12, 12, 14, 12], filename: nome,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: [".rh-sis", ".rh-ferr", ".rp-campo", ".rh-num", ".rp-rodape"] }
      }).from(doc).outputPdf("blob")).then(function (blob) { limpar(); return { blob: blob, nome: nome }; }, function (e) { limpar(); throw e; });
    });
  }
  function baixar(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nome; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  function imprimir() {
    var doc = document.getElementById("rp-doc"); if (!doc) return;
    document.body.classList.add("rp-imprimindo");
    var fechados = [].slice.call(doc.querySelectorAll("details:not([open])"));
    fechados.forEach(function (d) { d.open = true; });
    var limpar = function () { document.body.classList.remove("rp-imprimindo"); fechados.forEach(function (d) { d.open = false; }); fechados = []; window.removeEventListener("afterprint", limpar); };
    window.addEventListener("afterprint", limpar);
    window.print();
    setTimeout(limpar, 1500);
  }

  /* ---------- WhatsApp ----------------------------------------------------------- */

  /** Numero para wa.me a partir do telefone do cadastro (texto livre). "" quando nao da para usar.
      10-11 digitos: numero do Brasil sem DDI -> 55 na frente. 12-13 comecando por 55: ja tem DDI.
      Zeros de operadora/internacional a esquerda saem. Outro tamanho: devolve os digitos como estao
      (numero internacional), nunca prefixa 55 por cima de outro DDI. */
  function numeroWhatsApp(telefone) {
    var d = String(telefone || "").replace(/\D/g, "").replace(/^0+/, "");
    if (!d) return "";
    if (d.length === 10 || d.length === 11) return "55" + d;
    if ((d.length === 12 || d.length === 13) && d.indexOf("55") === 0) return d;
    if (d.length >= 8) return d;
    return "";
  }
  function mensagemWhatsApp(p, r, eu) {
    var quando = r ? dataBR(String(r.saved_at || r.created_at || "").slice(0, 10)) : "";
    return "Olá" + (p && p.nome ? ", " + primeiroNome(p.nome) : "") + "! Segue o seu Resultado HOLOS" + (quando ? " (" + quando + ")" : "") +
      ". Ele organiza o que registramos na sua avaliação e os próximos passos que combinamos. Qualquer dúvida, é só me chamar." +
      (eu && eu.nome ? " — " + eu.nome : "");
  }
  function linkWhatsApp(telefone, mensagem) {
    var n = numeroWhatsApp(telefone);
    return "https://wa.me/" + (n || "") + "?text=" + encodeURIComponent(mensagem || "");
  }
  function abrirLink(url) {
    var w = window.open(url, "_blank", "noopener");
    if (!w) toast("O navegador bloqueou a janela do WhatsApp. Permita pop-ups para este site.");
  }
  function enviarWhatsApp() {
    var pid = pacienteId(), p = pacienteObj(pid), r = resultadoFinal(pid), eu = perfil();
    var msg = mensagemWhatsApp(p, r, eu);
    var ocupado = travar(true);
    return gerarPdf().then(function (res) {
      var file = null;
      try { file = new File([res.blob], res.nome, { type: "application/pdf" }); } catch (e) { file = null; }
      /* celular: menu nativo de compartilhar, com o PDF anexado — a nutricionista escolhe o WhatsApp e a conversa */
      if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: res.nome, text: msg }).then(function () { return { modo: "compartilhar" }; }, function (e) {
          if (e && e.name === "AbortError") return { modo: "cancelado" };
          baixar(res.blob, res.nome); abrirLink(linkWhatsApp(p && p.telefone, msg)); return { modo: "conversa" };
        });
      }
      /* computador: baixa o PDF e abre a conversa da paciente com a mensagem pronta; ela anexa o arquivo */
      baixar(res.blob, res.nome);
      abrirLink(linkWhatsApp(p && p.telefone, msg));
      toast(p && numeroWhatsApp(p.telefone) ? "PDF baixado. Na conversa que abriu, anexe o arquivo " + res.nome + "." : "PDF baixado. Cadastre o telefone da paciente para abrir a conversa dela direto.");
      return { modo: "conversa" };
    }).catch(function (e) {
      toast("Não foi possível gerar o PDF agora (" + ((e && e.message) || "erro") + "). Use Imprimir → Salvar como PDF.");
      return { modo: "falhou", erro: e };
    }).then(function (x) { ocupado(); return x; });
  }
  function travar(sim) {
    var bs = [].slice.call(document.querySelectorAll("#rp-acoes button"));
    bs.forEach(function (b) { b.disabled = !!sim; });
    return function () { bs.forEach(function (b) { b.disabled = false; }); };
  }

  /* ---------- eventos ---------------------------------------------------------- */
  document.addEventListener("click", function (ev) {
    var a = alvo(); if (!a || !a.contains(ev.target)) return;
    var b = ev.target.closest("[data-rp-acao]"); if (!b) return;
    ev.preventDefault();
    var acao = b.dataset.rpAcao, pid = pacienteId();
    if (acao === "ficha") { if (window.levarParaFicha && pid) window.levarParaFicha("aba:resultado-holos", pid); return; }
    if (acao === "imprimir") { imprimir(); return; }
    if (acao === "pdf") {
      var solta = travar(true);
      gerarPdf().then(function (res) { baixar(res.blob, res.nome); toast("PDF gerado: " + res.nome); }, function (e) {
        toast("Não foi possível gerar o PDF agora (" + ((e && e.message) || "erro") + "). Use Imprimir → Salvar como PDF.");
      }).then(solta);
      return;
    }
    if (acao === "whatsapp") enviarWhatsApp();
  });
  document.addEventListener("DOMContentLoaded", function () {
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      var sec = document.getElementById("secao-resultado");
      if (sec && sec.classList.contains("ativa")) desenhar();
    };
  });

  window.ResultadoPagina = {
    desenhar: desenhar, gerarPdf: gerarPdf, enviarWhatsApp: enviarWhatsApp, imprimir: imprimir,
    resultadoFinal: resultadoFinal, condutaVigente: condutaVigente,
    numeroWhatsApp: numeroWhatsApp, linkWhatsApp: linkWhatsApp, mensagemWhatsApp: mensagemWhatsApp, termosFora: termosFora,
    CAMPOS_CONDUTA: CAMPOS_CONDUTA, HTML2PDF_URL: HTML2PDF_URL
  };
})();
