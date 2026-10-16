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
       Mente e Espirito marcadas "mostrar o paciente" e os textos da
       nutricionista (ResultadoHolos.documentoHtml, sem recalculo);
     - a CONDUTA do ATENDIMENTO DO RESULTADO (consolidada; motor de resultados
       V1, 12/10 — antes era a vigente do paciente, de qualquer atendimento),
       nos campos escritos pela nutricionista: objetivo, estrategia, acoes, recursos, orientacoes,
       retorno e os acordos combinados;
     - a IDENTIDADE PROFISSIONAL do Perfil: nome, registro, especialidade,
       logo, assinatura e carimbo.

   NAO entra: exame, documento, valor laboratorial, Leitura Integrada, dieta,
   calorias, prescricao, diagnostico, encaminhamento, IA. O sistema nao gera
   recomendacao: "o que fazer" sao as ferramentas do metodo e o que a
   nutricionista escreveu. Um aviso SO NA TELA (nunca no PDF) alerta a
   nutricionista se o texto dela trouxer termos fora do metodo.

   EMISSAO IMUTAVEL (10/10, DECISOES-V1 item 180): o documento enviado a
   paciente e uma EMISSAO (holos_result_emissions, RPC emitir_resultado_final)
   que congela o Resultado HOLOS usado (id + hash), a Conduta destinada a
   paciente, a identidade profissional (nome, CRN, logo, assinatura, carimbo),
   o template (RF-1) e a data. PDF, WhatsApp e Imprimir saem SO de uma emissao
   e a desenham SO com o que ela congelou: mudar Perfil, Conduta, logo ou
   assinatura depois nao altera uma emissao antiga. Sem emissao, a tela mostra
   uma PREVIA (dados atuais) e o botao "Gerar Resultado Final".

   TEMPLATE 5 (13/10, migration 20261021100000): o documento da paciente e a
   DIRECAO do acompanhamento (direcionamento, estrategias, acompanhamento da
   evolucao), lido SO da projecao montada pelo servidor; HOLOSCAN no fim. A
   emissao RF-3 congela essa projecao. SEM FOCO ATUAL CONFIRMADO NAO HA
   EMISSAO, PDF NEM WHATSAPP ("RESULTADO EM CONSTRUCAO"). Resultados de
   templates 1-4 (historicos) seguem a regra da epoca: emitem (RF-2) sem foco
   e sem direcao, com PDF, WhatsApp e Imprimir como antes; emissoes RF-1/RF-2
   ja feitas continuam abrindo, iguais.

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
  function RD() { return window.ResultadoDirecao; }
  /* foco atual confirmado no Resultado salvo (template 5) — exigido para emitir */
  function ehT5(r) { var s = r && r.content_snapshot; return Number((s && s.template_version) || (r && r.template_version) || 1) >= 5; }
  function ehRF3(em) { return !!em && ((em.template_version || (em.content_snapshot || {}).template) === "RF-3"); }
  function focoDoResultado(r) {
    var s = r && r.content_snapshot;
    if (!s || Number(s.template_version || r.template_version || 1) < 5) return null;
    return ((s.direcao_paciente || {}).foco_atual || {}).texto || null;
  }
  /* foco congelado numa emissao RF-3 — exigido para PDF e WhatsApp */
  function focoDaEmissao(em) {
    var s = em && em.content_snapshot;
    if (!s || (em.template_version || s.template) !== "RF-3") return null;
    return ((s.direcao_paciente || {}).foco_atual || {}).texto || null;
  }
  var emAtual = null;   // emissao na tela (PDF/WhatsApp so dela)

  /* ---------- fontes (so leitura) ------------------------------------------ */

  /** O Resultado HOLOS a apresentar: o mais recente finalizado (salvo/revisado) e nao substituido. */
  /* 16/10: numeracao visivel por paciente (ResultadoHolos.rotuloNumero); revision_number fica como esta */
  function numeroRH(r) { var R = window.ResultadoHolos; return R && R.rotuloNumero ? R.rotuloNumero(r) : "nº " + (r.revision_number || 1); }
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
  /* Motor de resultados V1 (12/10, item 4.6): a Conduta que acompanha o Resultado e a do ATENDIMENTO DO RESULTADO
     (a mesma regra da emissao RF-2 no servidor) — nunca a mais recente de outro atendimento. */
  function condutaDoResultado(r) {
    var Cd = window.Conduta; if (!Cd || !Cd.vigente || !r || !r.encounter_id) return null;
    var c = Cd.vigente(r.encounter_id);
    if (!c) return null;
    return { conduta: c, atendimento: window.AtendimentoAtual && window.AtendimentoAtual.porId ? window.AtendimentoAtual.porId(r.encounter_id) : null, acordos: Cd.acordosDe ? Cd.acordosDe(c.id) : [] };
  }
  function termosFora(textos) {
    var achados = {};
    textos.forEach(function (t) { var m = String(t || "").match(new RegExp(TERMOS_FORA.source, "gi")); (m || []).forEach(function (x) { achados[x.toLowerCase()] = true; }); });
    return Object.keys(achados);
  }

  /* ---------- HTML ------------------------------------------------------------ */

  function imgCongelada(src) {
    return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(String(src || "")) ? '<img src="' + escapar(src) + '" alt="">' : "";
  }
  /* 14/10: documento com a identidade do HoloHacking (logo e nome da marca), os dados completos da nutricionista
     e um bloco de assinatura formal (imagem da assinatura sobre a linha, ou a linha para assinar). So muda o
     desenho: o conteudo continua vindo do que a emissao congelou. */
  var LOGO_MARCA = "/logo-holohacking.png";
  function cabecalhoProfissional(eu, imagens) {
    var linha2 = [eu.profissao, eu.registro].filter(Boolean).map(escapar).join(" &middot; ");
    var linha3 = [eu.especialidade, eu.cidade].filter(Boolean).map(escapar).join(" &middot; ");
    var contato = [eu.telefone, eu.instagram, eu.email].filter(Boolean).map(escapar).join(" &middot; ");
    return '<header class="rp-cab">' +
      '<span class="rp-logo" id="rp-logo" aria-hidden="true">' + (imagens ? imgCongelada(imagens.logo) : "") + "</span>" +
      '<div class="rp-quem"><b>' + escapar(eu.nome || "HoloHacking") + "</b>" +
        (linha2 ? "<span>" + linha2 + "</span>" : "") + (linha3 ? "<span>" + linha3 + "</span>" : "") +
        (contato ? '<span class="rp-quem-contato">' + contato + "</span>" : "") + "</div>" +
      '<div class="rp-marca"><img class="rp-marca-logo" src="' + LOGO_MARCA + '" alt="" aria-hidden="true">' +
        '<span class="rp-marca-txt"><b>HoloHacking</b><span class="eyebrow">Nutrição Holística &middot; HOLOSCAN</span></span></div>' +
    "</header>";
  }

  function rodapeProfissional(eu, imagens) {
    var contato = [eu.telefone, eu.instagram, eu.email].filter(Boolean).map(escapar).join(" &middot; ");
    var linhaReg = [eu.profissao, eu.registro].filter(Boolean).map(escapar).join(" &middot; ");
    var assinatura = eu.assinatura_id && imagens ? imgCongelada(imagens.assinatura) : "";
    var carimbo = eu.carimbo_id && imagens ? imgCongelada(imagens.carimbo) : "";
    return '<footer class="rp-rodape">' +
      '<div class="rp-assinatura-bloco">' +
        '<div class="rp-assina">' +
          '<span class="rp-imagem" id="rp-assinatura">' + assinatura + "</span>" +
          '<span class="rp-assina-linha" aria-hidden="true"></span>' +
          (eu.nome ? '<p class="rp-emitiu">' + escapar(eu.nome) + "</p>" : "") +
          (linhaReg ? '<p class="rp-registro">' + linhaReg + "</p>" : "") +
        "</div>" +
        (eu.carimbo_id ? '<span class="rp-imagem rp-carimbo" id="rp-carimbo">' + carimbo + "</span>" : "") +
        '<div class="rp-emissao">' + (eu.emitido_em ? "<span>Emitido em</span><b>" + escapar(dataHora(eu.emitido_em)) + "</b>" : "<span>Prévia</span><b>ainda não emitido</b>") +
          (contato ? '<p class="rp-contato">' + contato + "</p>" : "") + "</div>" +
      "</div>" +
      '<p class="rp-fronteira">Este material organiza o que foi registrado na sua avaliação com a sua nutricionista. Não é exame, não é diagnóstico e não é prescrição. Os próximos passos são combinados em consulta.</p>' +
      '<p class="rp-gerado"><img src="' + LOGO_MARCA + '" alt="" aria-hidden="true"> Documento gerado no HoloHacking</p>' +
    "</footer>";
  }

  /* motor de resultados V1 (12/10, item 31): a Conduta entra DENTRO do documento da paciente, nos blocos
     5 (nosso foco agora: objetivo, estrategia), 6 (o que ficou combinado: acoes, recursos, orientacoes, combinados)
     e 7 (o que observar: retorno). Um so rodape, no fim (item 34). */
  function campoConduta(c, f) { return tem(c[f]) ? '<div class="rp-campo"><h4>' + escapar((CAMPOS_CONDUTA.filter(function (x) { return x[0] === f; })[0] || [f, f])[1]) + "</h4><p>" + quebras(c[f]) + "</p></div>" : ""; }
  function blocosConduta(cv) {
    if (!cv) return {};
    var c = cv.conduta || {};
    var acordos = (cv.acordos || []).filter(function (g) { return tem(g.description); });
    var combinado = ["actions", "resources", "professional_guidance"].map(function (f) { return campoConduta(c, f); }).join("") +
      (acordos.length ? '<div class="rp-campo"><h4>Combinados</h4><ul class="rp-acordos">' + acordos.map(function (g) {
        return "<li>" + escapar(g.description) + (tem(g.due_text) ? ' <small>(' + escapar(g.due_text) + ")</small>" : "") + "</li>";
      }).join("") + "</ul></div>" : "");
    return { foco: ["objective", "nutrition_strategy"].map(function (f) { return campoConduta(c, f); }).join("") || null,
      combinado: combinado || null, observar: campoConduta(c, "return_plan") || null };
  }
  function documentoHtml(pid, r, cv, eu, imagens, extra) {
    var snap = r.content_snapshot;
    var meta = Object.assign({ status: r.status, hash: r.content_hash, blocos: blocosConduta(cv), semRodape: true }, extra || {});
    var corpo = window.ResultadoHolos.documentoHtml(snap, "paciente", meta);
    return '<article class="rp-doc" id="rp-doc" aria-label="Resultado para o paciente">' +
      cabecalhoProfissional(eu, imagens) +
      '<div class="rp-corpo">' + corpo + "</div>" +
      rodapeProfissional(eu, imagens) +
    "</article>";
  }

  /* Documento de uma EMISSAO (template RF-1): SO o que ela congelou + o snapshot imutavel do Resultado HOLOS
     (conferido pelo hash). Mesma entrada -> mesmo HTML, sempre. */
  function documentoEmissao(em, r) {
    var s = em.content_snapshot || {};
    /* motor de resultados V1 (12/10, item 4.7): emissao RF-1 ja feita e desenhada pelo desenho CONGELADO da epoca
       (resultado-legado-r3.js) — o codigo novo nunca muda um documento ja emitido. RF-2 em diante: desenho atual. */
    if ((em.template_version || s.template) === "RF-1" && window.ResultadoLegadoR3) return window.ResultadoLegadoR3.documentoEmissao(em, r);
    var c = s.conduta;
    var cv = c ? { conduta: Object.assign({}, c.campos || {}), acordos: (c.acordos || []).map(function (a) { return { description: a.description, due_text: a.due_text }; }) } : null;
    var eu = Object.assign({}, s.profissional || {});
    var im = s.imagens || {};
    eu.assinatura_id = im.assinatura ? "congelada" : null; eu.carimbo_id = im.carimbo ? "congelada" : null;
    eu.emitido_em = em.created_at || null;
    /* RF-3: o documento da paciente sai da projecao CONGELADA na emissao (snapshot publico), nunca da direcao completa */
    var extra = (em.template_version || s.template) === "RF-3" ? { direcaoPaciente: s.direcao_paciente || null, caminho: s.caminho || [] } : null;
    return documentoHtml(null, r, cv, eu, im, extra);
  }

  function avisoTermos(r, cv) {
    var obs = (r.content_snapshot && r.content_snapshot.observacoes) || {};
    var t5 = Number((r.content_snapshot || {}).template_version || 1) >= 5;
    var textos = t5 ? [] : [obs.leitura_profissional, obs.pontos_acompanhar];
    if (t5 && RD()) RD().todos(RD().normalizar(r.content_snapshot.direcao_paciente)).forEach(function (it) { textos.push(it.texto); });
    if (cv) { CAMPOS_CONDUTA.forEach(function (f) { textos.push(cv.conduta[f[0]]); }); (cv.acordos || []).forEach(function (g) { textos.push(g.description); }); }
    var achados = termosFora(textos);
    if (!achados.length) return "";
    return '<p class="rp-aviso rp-so-tela" id="rp-aviso-termos" role="status">Atenção: o seu texto contém termos fora do método (' + achados.map(escapar).join(", ") +
      "). O HoloHacking não entrega dieta, calorias, prescrição, diagnóstico nem encaminhamento. Revise no Resultado HOLOS antes de enviar. Este aviso não vai no PDF.</p>";
  }

  function barraAcoes(pid, r, p, em) {
    var tel = p && numeroWhatsApp(p.telefone);
    if (!em && emissoes.indisponivel) {
      return '<div class="rp-acoes rp-so-tela" id="rp-acoes">' +
        '<div class="rp-estado"><span class="rh-tag">Resultado HOLOS ' + escapar(numeroRH(r)) + "</span>" +
          "<span>Finalizado em " + escapar(dataHora(r.saved_at || r.created_at)) + " &middot; versão para o paciente</span></div>" +
        '<div class="rp-botoes">' +
          '<button type="button" class="btn-verde" data-rp-acao="pdf">Baixar PDF</button>' +
          '<button type="button" class="btn-verde" data-rp-acao="whatsapp">Enviar pelo WhatsApp</button>' +
          '<button type="button" class="btn-fantasma" data-rp-acao="imprimir">Imprimir</button>' +
          '<button type="button" class="btn-fantasma" data-rp-acao="ficha">Abrir na ficha</button>' +
        "</div></div>";
    }
    if (!em && ehT5(r) && !focoDoResultado(r)) {
      var t5 = true;
      return '<div class="rp-acoes rp-so-tela" id="rp-acoes">' +
        '<div class="rp-estado"><span class="rh-tag rd-construcao">RESULTADO EM CONSTRUÇÃO</span>' +
          '<span class="rp-previa">' + (t5 ? "Este Resultado HOLOS não tem Foco atual confirmado." : "Este Resultado HOLOS é de um formato anterior, sem Foco atual.") +
          " Sem foco não há Resultado Final, PDF nem WhatsApp: crie uma nova versão na ficha e confirme o foco.</span></div>" +
        '<div class="rp-botoes"><button type="button" class="btn-verde" data-rp-acao="ficha">Abrir Resultado HOLOS na ficha</button></div></div>';
    }
    if (!em) {
      return '<div class="rp-acoes rp-so-tela" id="rp-acoes">' +
        '<div class="rp-estado"><span class="rh-tag">Resultado HOLOS ' + escapar(numeroRH(r)) + "</span>" +
          '<span class="rp-previa">PRÉVIA — ainda não emitido. Gere o Resultado Final para congelar o documento (Resultado, Conduta, nome, CRN, logo, assinatura e carimbo) e então baixar o PDF ou enviar.</span></div>' +
        '<div class="rp-botoes">' +
          '<button type="button" class="btn-verde" data-rp-acao="emitir">Gerar Resultado Final</button>' +
          '<button type="button" class="btn-fantasma" data-rp-acao="ficha">Abrir na ficha</button>' +
        "</div></div>";
    }
    if (ehRF3(em) && !focoDaEmissao(em)) {
      return '<div class="rp-acoes rp-so-tela" id="rp-acoes">' +
        '<div class="rp-estado"><span class="rh-tag">Resultado Final nº ' + escapar(em.emission_number) + " · registro histórico</span>" +
          "<span>Emitido em " + escapar(dataHora(em.created_at)) + " &middot; formato anterior, sem Foco atual. Fica aqui como foi emitido; para enviar de novo, gere um Resultado com foco.</span></div>" +
        '<div class="rp-botoes"><button type="button" class="btn-fantasma" data-rp-acao="imprimir">Imprimir registro</button>' +
          '<button type="button" class="btn-fantasma" data-rp-acao="ficha">Abrir na ficha</button></div></div>';
    }
    return '<div class="rp-acoes rp-so-tela" id="rp-acoes">' +
      '<div class="rp-estado"><span class="rh-tag">Resultado Final nº ' + escapar(em.emission_number) + "</span>" +
        "<span>Emitido em " + escapar(dataHora(em.created_at)) + " &middot; Resultado HOLOS " + escapar(numeroRH(r)) + " &middot; conteúdo congelado</span>" +
        (tel ? "" : '<span class="rp-sem-tel">Sem telefone no cadastro: o WhatsApp abre sem a conversa do paciente.</span>') + "</div>" +
      '<div class="rp-botoes">' +
        '<button type="button" class="btn-verde" data-rp-acao="pdf">Baixar PDF</button>' +
        '<button type="button" class="btn-verde" data-rp-acao="whatsapp">Enviar pelo WhatsApp</button>' +
        '<button type="button" class="btn-fantasma" data-rp-acao="imprimir">Imprimir</button>' +
        '<button type="button" class="btn-fantasma" data-rp-acao="ficha">Abrir na ficha</button>' +
        '<button type="button" class="btn-borda-ouro" data-rp-acao="emitir" data-rp-nova="1">Gerar nova emissão</button>' +
      "</div>" +
      /* 14/10: o botao do WhatsApp manda o PDF: no celular (e no computador que permite) vai anexado; senao baixa e abre a conversa */
      '<p class="rp-dica-whats">Enviar pelo WhatsApp manda o PDF: no celular ele vai anexado direto (escolha o WhatsApp e a conversa). ' +
        "No computador, o PDF é baixado e a conversa do paciente abre com a mensagem pronta: é só arrastar o arquivo para ela (o WhatsApp não aceita anexo automático pelo navegador do computador).</p>" +
      "</div>";
  }
  function listaEmissoes(lista, atual) {
    if (lista.length < 2) return "";
    return '<details class="rp-emissoes rp-so-tela"><summary>Emissões deste paciente (' + lista.length + ")</summary><ul>" + lista.map(function (x) {
      return '<li><button type="button" class="btn-fantasma" data-rp-acao="ver-emissao" data-rp-em="' + escapar(x.id) + '"' + (atual && atual.id === x.id ? ' aria-current="true"' : "") + ">" +
        "nº " + escapar(x.emission_number) + " · " + escapar(dataHora(x.created_at)) + (atual && atual.id === x.id ? " (aberta)" : "") + "</button></li>";
    }).join("") + "</ul></details>";
  }

  /* ---------- emissoes (so leitura + RPC) ------------------------------------- */
  var emissoes = { pid: null, linhas: [] };
  var emissaoAberta = null;   // id escolhido na lista; senao a mais recente do resultado atual
  function carregarEmissoes(pid) {
    return Promise.resolve(window.supabaseClient.from("holos_result_emissions").select("*").eq("patient_id", pid).order("created_at", { ascending: false }))
      .then(function (r) {
        var e = r && r.error, txt = e ? String((e.message || "") + " " + (e.code || "")) : "";
        /* banco ainda sem a migration 20261015100000: a tela segue como antes (sem emissao) ate o SQL ser aplicado */
        emissoes = { pid: pid, linhas: (r && !r.error && Array.isArray(r.data)) ? r.data : [], indisponivel: !!e && /PGRST205|42P01|schema cache|does not exist/i.test(txt) };
        return emissoes.linhas;
      }, function () { emissoes = { pid: pid, linhas: [] }; return []; });
  }
  /* imagem do Perfil -> data URL (ate 600 px; PNG, ou JPEG se ficar grande), para congelar na emissao */
  function dataUrlDe(id) {
    if (!id || !window.PerfilProfissional) return Promise.resolve(null);
    return Promise.resolve(window.PerfilProfissional.imagem(id)).then(function (url) {
      if (!url) return null;
      return new Promise(function (ok) {
        var img = new Image();
        img.onload = function () {
          try {
            var k = Math.min(1, 600 / Math.max(img.width, img.height));
            var cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(img.width * k)); cv.height = Math.max(1, Math.round(img.height * k));
            cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
            var d = cv.toDataURL("image/png");
            if (d.length > 650000) d = cv.toDataURL("image/jpeg", 0.85);
            ok(d.length <= 690000 ? d : null);
          } catch (e) { ok(null); }
        };
        img.onerror = function () { ok(null); };
        img.src = url;
      });
    }, function () { return null; });
  }
  function emitir(pid, r) {
    var eu = perfil();
    return Promise.all([dataUrlDe(eu.logo_id), dataUrlDe(eu.assinatura_id), dataUrlDe(eu.carimbo_id)]).then(function (im) {
      var faltou = [[eu.logo_id, im[0], "logo"], [eu.assinatura_id, im[1], "assinatura"], [eu.carimbo_id, im[2], "carimbo"]].filter(function (x) { return x[0] && !x[1]; }).map(function (x) { return x[2]; });
      var op = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : null;
      return Promise.resolve(window.supabaseClient.rpc("emitir_resultado_final", { payload: { holos_result_id: r.id, operation_id: op,
        imagens: { logo: im[0], assinatura: im[1], carimbo: im[2] } } })).then(function (res) {
        if (res && res.error) throw res.error;
        emissaoAberta = res && res.data ? res.data.id : null;
        if (faltou.length) toast("Resultado Final emitido. Não foi possível congelar: " + faltou.join(", ") + ".");
        else toast("Resultado Final emitido e congelado.");
        /* 16/10: a ficha (jornada, etapa, botao principal) e o Dashboard veem a emissao sem F5 */
        try { if (window.JornadaPaciente && window.JornadaPaciente.recarregar) window.JornadaPaciente.recarregar(); } catch (e) { /* nada */ }
        return res && res.data;
      });
    });
  }
  var MSG_EMISSAO = { foco_obrigatorio: "Sem Foco atual confirmado não há Resultado Final: crie uma nova versão na ficha e confirme o foco.", resultado_substituido: "Este Resultado HOLOS foi substituído: emita a versão atual.", resultado_nao_finalizado: "Só Resultado HOLOS salvo pode ser emitido.",
    paciente_arquivado: "Paciente arquivado: reative antes de emitir.", conta_inativa: "Sua conta ainda aguarda liberação.", imagem_invalida: "Uma imagem do Perfil não pôde ser usada." };

  /* ---------- desenhar ----------------------------------------------------------- */

  var desenhoAtual = 0;
  function desenhar() {
    var a = alvo(); if (!a) return;
    var pid = pacienteId();
    var vez = ++desenhoAtual;
    /* 14/10 (auditoria Cowork, P0): nada da paciente anterior sobrevive ao redesenho — emissao, documento, PDF, WhatsApp */
    emAtual = null; delete a.dataset.rpPid;
    if (emissoes.pid !== pid) { emissoes = { pid: null, linhas: [] }; emissaoAberta = null; }
    if (!pid) { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">Escolha um paciente para ver o resultado dele.</div>'; return; }
    if (!temSupa()) { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">Entre na sua conta para ver o Resultado: ele é montado a partir do Resultado HOLOS finalizado no servidor.</div>'; return; }
    var p = pacienteObj(pid);
    if (p && p.status === "inativo") { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">Paciente arquivado. Reative na ficha para apresentar o resultado.</div>'; return; }
    a.innerHTML = '<div class="dash-vazio" id="rp-carregando">Carregando o resultado…</div>';
    var R = window.ResultadoHolos;
    if (!R) { a.innerHTML = '<div class="dash-vazio" id="rp-vazio">O módulo do Resultado HOLOS não carregou.</div>'; return; }
    return Promise.all([R.carregar(pid), carregarEmissoes(pid)]).then(function () {
      if (vez !== desenhoAtual || pacienteId() !== pid || emissoes.pid !== pid) return;
      var r = resultadoFinal(pid);
      if (!r) {
        a.innerHTML = '<div class="lista-vazia" id="rp-vazio"><strong>Nenhum Resultado HOLOS finalizado para ' + escapar(p ? primeiroNome(p.nome) : "este paciente") + "</strong>" +
          "<span>Prepare e finalize o Resultado HOLOS na ficha (aba Resultado HOLOS). Rascunho não aparece para o paciente.</span>" +
          '<button type="button" class="btn-verde" data-rp-acao="ficha">Abrir Resultado HOLOS na ficha</button></div>';
        return;
      }
      /* a emissao a mostrar: a escolhida na lista, ou a mais recente DESTE resultado */
      var daPac = emissoes.linhas.filter(function (x) { return !x.patient_id || x.patient_id === pid; });
      var em = daPac.filter(function (x) { return x.id === emissaoAberta; })[0] ||
        daPac.filter(function (x) { return x.holos_result_id === r.id; })[0] || null;
      var rEm = em ? (R.porId(em.holos_result_id) || null) : null;
      if (em && (!rEm || !rEm.content_snapshot || rEm.content_hash !== em.result_content_hash)) {
        a.innerHTML = '<div class="lista-vazia" id="rp-vazio"><strong>A emissão nº ' + escapar(em.emission_number) + " não confere com o Resultado HOLOS salvo.</strong><span>Nada foi mostrado.</span></div>";
        return;
      }
      emAtual = em;
      a.dataset.rpPid = pid;
      if (em) {
        a.innerHTML = barraAcoes(pid, rEm, p, em) + listaEmissoes(daPac, em) + documentoEmissao(em, rEm);
        return;
      }
      var cv = condutaDoResultado(r), eu = perfil();
      a.innerHTML = barraAcoes(pid, r, p, null) + avisoTermos(r, cv) + listaEmissoes(daPac, null) +
        (emissoes.indisponivel ? "" : '<p class="rp-previa-selo rp-so-tela" role="status">PRÉVIA com os dados atuais. Ela ainda não foi emitida.</p>') + documentoHtml(pid, r, cv, eu);
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
    if (!documentoEDaPaciente()) return Promise.reject(new Error("O resultado na tela não é do paciente selecionado. Abra o Resultado de novo."));
    /* template 5: PDF da paciente so de emissao com Foco atual confirmado */
    if (ehRF3(emAtual) && !focoDaEmissao(emAtual)) return Promise.reject(new Error("Sem Foco atual confirmado não há PDF para o paciente"));
    var rTela = resultadoFinal(pacienteId());
    if (!emAtual && rTela && ehT5(rTela)) return Promise.reject(new Error("Gere o Resultado Final (com o foco confirmado) antes do PDF"));
    var p = pacienteObj(pacienteId());
    var nome = nomeArquivo(p);
    return carregarHtml2pdf().then(function (h2p) {
      document.body.classList.add("rp-gerando");
      var fechados = [].slice.call(doc.querySelectorAll("details:not([open])"));
      fechados.forEach(function (d) { d.open = true; });
      var limpar = function () { document.body.classList.remove("rp-gerando"); fechados.forEach(function (d) { d.open = false; }); };
      var w = h2p().set({
        margin: [12, 12, 14, 12], filename: nome,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false, scrollX: 0, scrollY: 0, onclone: svgComEstiloProprio },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        /* pos-teste MR-V1 13/10: a quebra de pagina e feita por paginar() na copia do html2pdf (a regra automatica dele
           deixava titulo sozinho, moldura de cartao vazia e pagina quase vazia) */
        pagebreak: { mode: [] }
      }).from(doc).toContainer().then(function () {
        /* 14/10: o html2pdf centraliza a copia (margin:auto); a "foto" mede o centro de outro jeito e saia deslocada
           ~10px para a direita, cortando a borda direita (marca, data da emissao, cartoes). A copia fica presa a esquerda. */
        var c = this.prop.container;
        c.style.margin = "0"; c.style.left = "0"; c.style.right = "auto";
        paginar(c, this.prop.pageSize.inner.px.height);
      });
      /* 16/10: numero de pagina discreto ("1 / 3") no rodape de cada folha, depois de montar o PDF */
      if (typeof w.toPdf === "function" && typeof w.get === "function") w = w.toPdf().get("pdf").then(numerarPaginas);
      return Promise.resolve(w.outputPdf("blob")).then(function (blob) { limpar(); return { blob: blob, nome: nome }; }, function (e) { limpar(); throw e; });
    });
  }
  function numerarPaginas(pdf) {
    try {
      var n = pdf.internal.getNumberOfPages(), L = pdf.internal.pageSize.getWidth(), A = pdf.internal.pageSize.getHeight();
      for (var i = 1; i <= n; i++) {
        pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(130, 140, 135);
        pdf.text(i + " / " + n, L - 12, A - 5, { align: "right" });
      }
    } catch (e) { /* sem numeracao: o PDF sai igual */ }
  }
  /* Paginacao do PDF baixado (pos-teste MR-V1 13/10), na COPIA que o html2pdf monta (o documento da tela nao muda).
     Blocos "atomicos" nunca quebram; quando um bloco cruzaria o fim da pagina, um espacador o leva para a proxima.
     Regras: (1) titulo/intro/rotulo nunca ficam sozinhos no fim — vao junto com o bloco seguinte; (2) se o bloco e o
     comeco de um cartao, vai o cartao inteiro (sem moldura vazia no fim da pagina); (3) cartao grande quebra entre blocos;
     (4) bloco maior que a pagina nao e mexido. */
  var ATOMOS = [".rp-cab", ".rh-doc-cab", ".rh-resumo-lista > li", ".rh-intro", "h3", "h4", "h5", ".rh-sis > header",
    ".sf-bloco:not(.sf-c)", ".sf-c > .sf-rot", ".sf-c > .sf-nota", ".sf-c li", ".rh-ferr-topo", ".rf-caixa > .rh-tag", ".rf-bloco",
    ".rh-obs-item", ".rp-campo", ".rp-acordos > li", ".rh-geral-grade", ".rh-sistemas-compactos", ".rp-rodape", ".rh-mapa-grade", ".rh-visual",
    ".pf-cab", ".pf-tit", ".pf-intro", ".pf-grupo", ".pf-lista > li", ".pf-foco", ".pf-dir", ".pf-card", ".pf-terr", ".pf-proxima-bloco", ".pf-ferr", ".pf-areas", ".pf-rot", ".rd-pilar-cab", ".rd-secao:not(.rd-grande)", ".rd-grande > header", ".rd-dir", ".rd-est-dir", ".rd-est", ".rd-sis > header", ".rd-sis-bloco", ".rd-sis-def", ".rd-sis-nota", ".rd-sis-limite", ".rd-h4", ".rd-texto-p", ".rd-lista > li", ".rd-territorio", ".rd-foco-txt", ".rd-caminho > li", ".rd-antes", ".rd-agora", ".rd-proxima", ".rd-vazio", ".rd-construcao"].join(",");
  var TITULOS = ".pf-tit,.pf-rot,.pf-intro,h3,h4,h5,.rh-intro,.sf-rot,.rh-tag,.rh-sis > header,.rh-ferr-topo,.rh-junto,.rd-pilar-cab,.rd-secao > header,.rd-sis > header,.rd-est-dir,.rd-h4";
  var CARTOES = ".pf-bloco,.pf-card,.pf-terr,.rh-sis,.rh-ferr,.rf-caixa,.rp-conduta,.rh-eixo,.rh-junto,.rh-obs-item,.rp-campo,.rd-secao,.rd-territorio,.rd-sis,.rd-dir,.rd-est";
  function paginar(caixa, alturaPagina) {
    if (!caixa || !alturaPagina) return;
    var topo = function (el) { return el.getBoundingClientRect().top - caixa.getBoundingClientRect().top; };
    var base = function (el) { return el.getBoundingClientRect().bottom - caixa.getBoundingClientRect().top; };
    var todos = [].slice.call(caixa.querySelectorAll(ATOMOS));
    var atomos = todos.filter(function (el) { return !todos.some(function (o) { return o !== el && o.contains(el); }) && el.getBoundingClientRect().height > 0; });
    var primeiroDoPai = function (el) {   /* el e o primeiro conteudo visivel do pai? */
      var a = el.previousElementSibling;
      while (a && (a.offsetHeight === 0 || a.classList.contains("rp-quebra"))) a = a.previousElementSibling;
      return !a;
    };
    for (var i = 0, guarda = 0; i < atomos.length && guarda < 400; i++, guarda++) {
      var el = atomos[i], t = topo(el), b = base(el);
      var fim = Math.ceil((t + 1) / alturaPagina) * alturaPagina;
      if (b <= fim + 1 || b - t > alturaPagina * 0.9) continue;
      var ancora = el;
      /* (1) puxa titulos/rotulos imediatamente anteriores que estao na mesma pagina */
      for (var k = i - 1; k >= 0; k--) {
        var ant = atomos[k];
        if (!ant.matches(TITULOS) || topo(ant) < fim - alturaPagina) break;
        ancora = ant;
      }
      /* (2) se e o comeco de um cartao, sobe para o cartao (o mais externo que ainda comeca nesta pagina) */
      var sobe = ancora;
      while (sobe.parentElement && sobe.parentElement !== caixa && primeiroDoPai(sobe)) {
        sobe = sobe.parentElement;
        if (sobe.matches(CARTOES) && topo(sobe) >= fim - alturaPagina) ancora = sobe;
      }
      /* 16/10 (estabilizacao): cartao importante que cabe inteiro numa pagina (ate 70% dela) nao se parte — vai todo
         para a proxima (ex.: "Seu plano até a próxima consulta"). Cartao maior continua quebrando entre blocos. */
      var cartao = ancora.closest ? ancora.closest(CARTOES) : null, externo = null;
      while (cartao && caixa.contains(cartao) && cartao !== caixa) { externo = cartao; cartao = cartao.parentElement ? cartao.parentElement.closest(CARTOES) : null; }
      if (externo && externo !== ancora && topo(externo) >= fim - alturaPagina && topo(externo) < fim && (base(externo) - topo(externo)) <= alturaPagina * 0.7) ancora = externo;
      var falta = fim - topo(ancora);
      if (falta <= 0 || falta >= alturaPagina) continue;
      var esp = document.createElement("div");
      esp.className = "rp-quebra"; esp.style.height = falta + "px"; esp.setAttribute("aria-hidden", "true");
      ancora.parentNode.insertBefore(esp, ancora);
      var ajuste = fim - topo(ancora);   /* gap de grade/flex: corrige para o topo cair exatamente no inicio da pagina */
      if (ajuste !== 0) esp.style.height = Math.max(0, falta + ajuste) + "px";
      /* recomeca a partir do bloco movido */
      i = Math.max(-1, atomos.indexOf(ancora.matches(ATOMOS) ? ancora : el) - 1);
      var dentro = atomos.filter(function (a) { return ancora.contains(a); });
      if (dentro.length) i = atomos.indexOf(dentro[0]) - 1;
    }
  }
  /* html2canvas desenha o SVG como imagem isolada: sem o CSS da pagina (classes) e sem tamanho ele sai em branco.
     Na COPIA que o html2canvas monta (onclone) cada SVG recebe largura/altura e as cores calculadas em estilo proprio;
     o documento da tela (e o HTML da emissao) nao muda. */
  function svgComEstiloProprio(copia) {
    var janela = copia.defaultView || window;
    var PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "font-size", "font-weight", "font-family"];
    [].slice.call(copia.querySelectorAll(".rp-doc svg")).forEach(function (svg) {
      var r = svg.getBoundingClientRect(); if (!r.width) return;
      [].slice.call(svg.querySelectorAll("*")).forEach(function (el) {
        var cs = janela.getComputedStyle(el), st = [];
        PROPS.forEach(function (k) { var v = cs.getPropertyValue(k); if (v) st.push(k + ":" + v); });
        el.setAttribute("style", (el.getAttribute("style") ? el.getAttribute("style") + ";" : "") + st.join(";"));
      });
      svg.setAttribute("width", String(r.width)); svg.setAttribute("height", String(r.height));
    });
  }
  function baixar(blob, nome) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = nome; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  /* rodada de UX 13/10: o documento e COPIADO para #rp-impressao (filho direto do body) e so ele imprime — sem
     position:absolute por cima do app (que fazia o rodape cair sobre o ultimo cartao). Os ids da copia saem. */
  function imprimir() {
    var doc = document.getElementById("rp-doc"); if (!doc) return;
    if (!documentoEDaPaciente()) { toast("O resultado na tela não é do paciente selecionado. Abra o Resultado de novo."); return; }
    var antigo = document.getElementById("rp-impressao"); if (antigo) antigo.remove();
    var caixa = document.createElement("div"); caixa.id = "rp-impressao";
    var copia = doc.cloneNode(true); copia.removeAttribute("id");
    [].slice.call(copia.querySelectorAll("[id]")).forEach(function (el) { el.removeAttribute("id"); });
    [].slice.call(copia.querySelectorAll("details")).forEach(function (d) { d.open = true; });
    caixa.appendChild(copia); document.body.appendChild(caixa);
    document.body.classList.add("rp-imprimindo");
    var limpar = function () { document.body.classList.remove("rp-imprimindo"); var c = document.getElementById("rp-impressao"); if (c) c.remove(); window.removeEventListener("afterprint", limpar); };
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
    return !!w;
  }
  /* 16/10: "Enviar direto no WhatsApp". O navegador so deixa abrir o compartilhar (com o PDF anexado) ou uma janela nova
     logo depois de um clique; se a emissao + o PDF demoraram e ele recusou, aparece uma faixa com UM botao: um clique e
     o PDF vai (celular: compartilhar com o anexo; computador: a conversa da paciente com a mensagem pronta). */
  var envioPronto = null;
  function oferecerEnvio(pronto) {
    envioPronto = pronto;
    var a = alvo(); if (!a) return;
    var velho = document.getElementById("rp-envio-pronto"); if (velho) velho.remove();
    var div = document.createElement("div");
    div.id = "rp-envio-pronto"; div.className = "rp-envio-pronto rp-so-tela"; div.setAttribute("role", "status");
    div.innerHTML = '<span><b>PDF pronto.</b> ' + (pronto.file ? "Toque para enviar no WhatsApp com o PDF anexado." :
      "Ele foi baixado: abra a conversa e anexe o arquivo " + escapar(pronto.nome) + ".") + "</span>" +
      (pronto.file ? '<button type="button" class="btn-verde" data-rp-acao="enviar-pronto">Enviar no WhatsApp</button>'
        : '<a class="btn-verde" data-rp-acao="abrir-conversa" href="' + escapar(pronto.link) + '" target="_blank" rel="noopener">Abrir conversa no WhatsApp</a>') +
      '<button type="button" class="btn-fantasma" data-rp-acao="fechar-envio" aria-label="Fechar">Fechar</button>';
    a.insertBefore(div, a.firstChild);
    if (div.scrollIntoView) div.scrollIntoView({ block: "nearest" });
  }
  function fecharEnvio() { envioPronto = null; var b = document.getElementById("rp-envio-pronto"); if (b) b.remove(); }
  function enviarPronto() {
    var pr = envioPronto; if (!pr || !pr.file) return Promise.resolve({ modo: "nada" });
    return navigator.share({ files: [pr.file], title: pr.nome, text: pr.msg }).then(function () { fecharEnvio(); return { modo: "compartilhar" }; }, function (e) {
      if (e && e.name === "AbortError") return { modo: "cancelado" };
      baixar(pr.blob, pr.nome);
      oferecerEnvio({ nome: pr.nome, link: pr.link });
      return { modo: "conversa" };
    });
  }
  /* template 5: a mensagem cita o FOCO congelado na emissao (nunca hipotese nem outro texto profissional) */
  function mensagemWhatsAppEmissao(p, em) {
    var foco = focoDaEmissao(em); if (!foco || !RD()) return null;
    var s = em.content_snapshot || {};
    var quando = dataBR(String((s.resultado && s.resultado.salvo_em) || em.created_at || "").slice(0, 10));
    var dir = (((s.direcao_paciente || {}).direcionamentos || [])[0] || {}).texto || null;
    return RD().mensagemWhatsApp((p && p.nome) || (s.paciente && s.paciente.nome), quando, foco, dir);
  }
  /* o documento na tela (e a emissao em memoria) pertencem a paciente selecionada agora? */
  function documentoEDaPaciente() {
    var a = alvo(), pid = pacienteId();
    if (!a || !pid || a.dataset.rpPid !== pid) return false;
    if (emAtual && emAtual.patient_id && emAtual.patient_id !== pid) return false;
    return true;
  }
  function enviarWhatsApp() {
    var pid = pacienteId(), p = pacienteObj(pid);
    if (!documentoEDaPaciente()) { toast("O resultado na tela não é do paciente selecionado. Abra o Resultado de novo."); return Promise.resolve({ modo: "bloqueado" }); }
    /* RF-3: mensagem com direcionamento/foco congelados; RF-1/RF-2 (historicas): a mensagem de sempre */
    var msg = ehRF3(emAtual) ? mensagemWhatsAppEmissao(p, emAtual) : mensagemWhatsApp(p, resultadoFinal(pid), perfil());
    if (!msg) { toast("Sem Foco atual confirmado não há envio pelo WhatsApp. Crie uma nova versão do Resultado HOLOS com o foco."); return Promise.resolve({ modo: "bloqueado" }); }
    var ocupado = travar(true);
    return gerarPdf().then(function (res) {
      var file = null;
      try { file = new File([res.blob], res.nome, { type: "application/pdf" }); } catch (e) { file = null; }
      /* celular: menu nativo de compartilhar, com o PDF anexado — a nutricionista escolhe o WhatsApp e a conversa */
      var link = linkWhatsApp(p && p.telefone, msg);
      if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: res.nome, text: msg }).then(function () { return { modo: "compartilhar" }; }, function (e) {
          if (e && e.name === "AbortError") return { modo: "cancelado" };
          /* o clique "expirou" enquanto o PDF era gerado: um toque na faixa envia */
          if (e && e.name === "NotAllowedError") { oferecerEnvio({ file: file, blob: res.blob, nome: res.nome, msg: msg, link: link }); return { modo: "faixa" }; }
          baixar(res.blob, res.nome);
          if (!abrirLink(link)) oferecerEnvio({ nome: res.nome, link: link });
          return { modo: "conversa" };
        });
      }
      /* computador: baixa o PDF e abre a conversa da paciente com a mensagem pronta; ela anexa o arquivo */
      baixar(res.blob, res.nome);
      if (!abrirLink(link)) { oferecerEnvio({ nome: res.nome, link: link }); return { modo: "faixa" }; }
      toast(p && numeroWhatsApp(p.telefone) ? "PDF baixado. Na conversa que abriu, anexe o arquivo " + res.nome + "." : "PDF baixado. Cadastre o telefone do paciente para abrir a conversa direto.");
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
    if (b.dataset.rpAcao === "abrir-conversa") { setTimeout(fecharEnvio, 0); return; }   /* o link abre a conversa sozinho */
    ev.preventDefault();
    var acao = b.dataset.rpAcao, pid = pacienteId();
    if (acao === "ficha") { if (window.levarParaFicha && pid) window.levarParaFicha("aba:resultado-holos", pid); return; }
    if (acao === "ver-emissao") { emissaoAberta = b.dataset.rpEm || null; desenhar(); return; }
    if (acao === "emitir") {
      var r0 = resultadoFinal(pid); if (!r0) return;
      var faz = function () {
        var libera = travar(true);
        emitir(pid, r0).then(function () { desenhar(); }, function (e) {
          toast((e && e.hint && MSG_EMISSAO[e.hint]) || "Não foi possível emitir agora: " + ((e && e.message) || "erro"));
        }).then(libera);
      };
      /* 16/10 (estabilizacao): uma NOVA emissao (ja existe outra) pede confirmacao; a anterior continua preservada */
      if (b.dataset.rpNova === "1" && window.abrirModalConfirmar) {
        window.abrirModalConfirmar({ titulo: "Gerar nova emissão",
          corpo: "<p>Gerar uma nova emissão deste Resultado?</p><p>A emissão anterior continua preservada, exatamente como foi emitida.</p>",
          botaoConfirmar: "Gerar nova emissão", classeConfirmar: "btn-verde" }).then(function (r) { if (r === "confirmar") faz(); });
        return;
      }
      faz();
      return;
    }
    if (acao === "imprimir") { imprimir(); return; }
    if (acao === "pdf") {
      var solta = travar(true);
      gerarPdf().then(function (res) { baixar(res.blob, res.nome); toast("PDF gerado: " + res.nome); }, function (e) {
        toast("Não foi possível gerar o PDF agora (" + ((e && e.message) || "erro") + "). Use Imprimir → Salvar como PDF.");
      }).then(solta);
      return;
    }
    if (acao === "whatsapp") enviarWhatsApp();
    if (acao === "enviar-pronto") enviarPronto();
    if (acao === "fechar-envio") fecharEnvio();
  });
  document.addEventListener("DOMContentLoaded", function () {
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      emissaoAberta = null; emAtual = null; emissoes = { pid: null, linhas: [] };
      desenhoAtual++;   // um carregamento ainda em curso da paciente anterior nao desenha mais
      var sec = document.getElementById("secao-resultado"), a = alvo();
      if (sec && sec.classList.contains("ativa")) desenhar();
      else if (a) { a.innerHTML = ""; delete a.dataset.rpPid; }
    };
  });

  /* SIMPLIFICACAO 14/10 (aba HOLOS AI → "Gerar PDF"): abre a pagina Resultado, emite o Resultado Final do Resultado HOLOS
     vigente se ele ainda nao tem emissao (a emissao e o registro imutavel do que a paciente recebeu) e baixa o PDF dela.
     Nada novo e calculado: e o mesmo emitir + PDF dos botoes da pagina. */
  function emitirSePreciso() {
    var pid = pacienteId();
    if (!pid) return Promise.reject(new Error("Escolha um paciente."));
    emissaoAberta = null;
    if (window.irParaSecao) window.irParaSecao("resultado");
    return Promise.resolve(desenhar()).then(function () {
      var r = resultadoFinal(pid);
      if (!r) throw new Error("Nenhum Resultado HOLOS finalizado");
      if (emAtual && emAtual.holos_result_id === r.id) return null;
      return emitir(pid, r).then(function () { return desenhar(); });
    });
  }
  /* 16/10: o mesmo, terminando no envio pelo WhatsApp (botao "Enviar no WhatsApp" da ficha) */
  function emitirEEnviar() {
    return emitirSePreciso().then(function () { return enviarWhatsApp(); }, function (e) {
      var m = (e && e.hint && MSG_EMISSAO[e.hint]) || (e && e.message) || "erro";
      toast("Não foi possível preparar o envio agora (" + m + ")."); throw e;
    });
  }
  function emitirEPdf() {
    return emitirSePreciso().then(function () { return gerarPdf(); }).then(function (res) {
      baixar(res.blob, res.nome); toast("PDF gerado: " + res.nome); return res;
    }, function (e) {
      var m = (e && e.hint && MSG_EMISSAO[e.hint]) || (e && e.message) || "erro";
      toast("Não foi possível gerar o PDF agora (" + m + ")."); throw e;
    });
  }

  window.ResultadoPagina = {
    desenhar: desenhar, emitirEPdf: emitirEPdf, emitirEEnviar: emitirEEnviar, enviarPronto: enviarPronto, gerarPdf: gerarPdf, paginar: paginar, ATOMOS: ATOMOS, enviarWhatsApp: enviarWhatsApp, imprimir: imprimir,
    resultadoFinal: resultadoFinal, condutaVigente: condutaVigente, condutaDoResultado: condutaDoResultado, blocosConduta: blocosConduta, documentoEmissao: documentoEmissao, emissoes: function () { return emissoes.linhas.slice(); },
    numeroWhatsApp: numeroWhatsApp, linkWhatsApp: linkWhatsApp, mensagemWhatsApp: mensagemWhatsApp, mensagemWhatsAppEmissao: mensagemWhatsAppEmissao, termosFora: termosFora,
    focoDoResultado: focoDoResultado, focoDaEmissao: focoDaEmissao, emissaoAtual: function () { return emAtual; }, documentoEDaPaciente: documentoEDaPaciente,
    CAMPOS_CONDUTA: CAMPOS_CONDUTA, HTML2PDF_URL: HTML2PDF_URL
  };
})();
