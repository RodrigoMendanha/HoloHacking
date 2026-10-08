/* ===========================================================================
   A FICHA DO PACIENTE
   ===========================================================================

   Tudo o que o app sabe sobre uma pessoa já estava guardado — o mapa, as
   ferramentas preenchidas, os exames, os documentos — mas espalhado. Esta tela
   reúne, e ACUSA o que ninguém via: respondeu e nunca teve conduta, parou o
   questionário no meio, exame alterado onde ele não se queixa, reavaliação
   vencida.

   A ficha tem quatro partes, nesta ordem, porque é a ordem das perguntas que
   se faz antes de atender:

     FAIXA          quando foi a última, quando é a próxima, o que está aberto
     VISÃO CLÍNICA  o mapa mais recente e o que ele diz
     LINHA DO TEMPO o que aconteceu com esta pessoa, em ordem
     FORMULÁRIOS    o que foi respondido — e o que dá para reler

   Sobre Formulários: no método, o HOLOSCAN É um formulário — 84 perguntas
   respondidas numa escala de 0 a 3. O OQ³, o PQQ e o Mapa do Propósito também
   são. O que faltava era poder RELER o que a pessoa respondeu: o app calculava
   a nota e jogava as respostas numa caixa que nenhuma tela abria. A janela de
   respostas abre essa caixa, agrupada por sistema, com o peso de cada uma.

   Nada aqui calcula: lê o que o motor e as telas já gravaram.
   =========================================================================== */

(function () {
  "use strict";

  var SEM_PACIENTE = "_sem_paciente";
  var CAIXA_Q = "holohacking.questionario";

  var ESCALAS = {
    frequencia:  ["Nunca", "Às vezes", "Frequente", "Sempre"],
    intensidade: ["Nada", "Um pouco", "Bastante", "Muito"]
  };

  var NOME_ORIGEM = {
    sintoma: "Raízes físicas",
    emocao: "Padrões emocionais",
    espiritual: "Terreno Espiritual"
  };

  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
               "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  var abaAtual = "visao";

  function paciente() {
    try { return (window.pacienteAtivoId && window.pacienteAtivoId()) || SEM_PACIENTE; }
    catch (e) { return SEM_PACIENTE; }
  }
  function pacienteObj() {
    var todos = (window.pacientesTodos && window.pacientesTodos()) || [];
    var id = paciente();
    for (var i = 0; i < todos.length; i++) if (todos[i].id === id) return todos[i];
    return null;
  }
  var escapar = window.escapar;
  var dataBR  = window.dataBR;

  /** O dia do calendário de um instante, no fuso de quem está olhando. */
  function diaLocal(iso) {
    if (!iso) return "";
    if (iso.length <= 10) return iso;          // já é uma data, não um instante
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function diasDesde(iso) {
    if (!iso) return null;
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return null;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return Math.round((hoje - d) / 86400000);
  }
  function haQuantoTempo(dias) {
    if (dias === null) return "";
    if (dias <= 0) return "hoje";
    if (dias === 1) return "ontem";
    if (dias < 30) return "há " + dias + " dias";
    var m = Math.round(dias / 30);
    if (m < 12) return "há " + m + (m === 1 ? " mês" : " meses");
    var a = Math.floor(dias / 365);
    return "há " + a + (a === 1 ? " ano" : " anos");
  }
  function emQuantoTempo(dias) {
    if (dias === null) return "";
    if (dias === 0) return "hoje";
    if (dias === 1) return "amanhã";
    return dias < 0 ? haQuantoTempo(-dias) : "em " + dias + " dias";
  }

  function reunir() { return window.Panorama.doPaciente(paciente()); }
  function alertas(d) { return window.Panorama.alertas(d); }

  function nomeFerramenta(id) {
    var fixos = { oq3: "OQ³", pqq: "PQQ", mapa: "Mapa do Propósito" };
    if (fixos[id]) return fixos[id];
    var lista = window.CATALOGO_FERRAMENTAS || [];
    for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i].titulo;
    return id;
  }

  /* ======================================================= A FAIXA ======== */

  /* As quatro perguntas que se faz antes de abrir qualquer aba. Cada uma tem
     resposta em algum lugar do app — o problema era ter que ir aos quatro. */
  function desenharFaixa() {
    var alvo = document.getElementById("ficha-faixa");
    if (!alvo) return;
    var d = reunir();
    var pid = paciente();

    var ultima = d.pontuacao && d.pontuacao.quando
      ? dataBR(d.pontuacao.quando) + " &middot; " + haQuantoTempo(diasDesde(d.pontuacao.quando))
      : null;

    var prox = window.Agenda && window.Agenda.proxima ? window.Agenda.proxima(pid) : null;
    var proxTexto = prox
      ? dataBR(prox.data) + " às " + prox.hora + " &middot; " + emQuantoTempo(-diasDesde(prox.data))
      : null;

    var abertas = alertas(d).length;

    var itens = [
      { rot: "Última aplicação", valor: ultima, vazio: "nenhuma", acao: "holoscan" },
      { rot: "Próxima consulta", valor: proxTexto, vazio: "não agendada", acao: "agenda" },
      { rot: "Em aberto",
        valor: abertas === 0 ? "tudo em dia" : abertas + (abertas === 1 ? " pendência" : " pendências"),
        alerta: abertas > 0, acao: "aba:visao" },
      { rot: "Exames", valor: d.exames > 0 ? d.exames + " preenchidos" : null,
        vazio: "nenhum valor", acao: "aba:documentos" },
      { rot: "Documentos", valor: null, vazio: "carregando…", id: "fic-faixa-docs",
        acao: "aba:documentos" }
    ];

    alvo.setAttribute("role", "group");
    alvo.setAttribute("aria-label", "Resumo do paciente");
    alvo.innerHTML = itens.map(function (i) {
      return '<button type="button" class="fic-pilula' +
        (i.valor ? "" : " vazia") + (i.alerta ? " alerta" : "") + '"' +
        (i.id ? ' id="' + i.id + '"' : "") +
        ' data-ir="' + i.acao + '"' +
        ' aria-label="' + escapar(i.rot) + ': ' + escapar(i.valor || i.vazio) + '">' +
        '<span class="fic-pilula-rot">' + i.rot + "</span>" +
        '<b>' + (i.valor || i.vazio) + "</b></button>";
    }).join("");

    if (window.ArquivoStore) {
      window.ArquivoStore.listar(pid).then(function (itens) {
        var el = document.getElementById("fic-faixa-docs");
        if (!el) return;
        el.classList.toggle("vazia", itens.length === 0);
        el.querySelector("b").textContent = itens.length === 0
          ? "nenhum" : itens.length + (itens.length === 1 ? " arquivo" : " arquivos");
      });
    }
  }

  /* V1, Etapa 2: o bloco clinico do atendimento — ultimo atendimento, estado
     da anamnese e conduta VIGENTES (consolidadas; rascunho nunca e vigente) e
     o retorno planejado. Nada aqui interpreta. */
  function blocoAtendimentoClinico(pid) {
    var A = window.AtendimentoAtual, An = window.Anamnese, Cd = window.Conduta;
    if (!A || !An || !Cd) return "";
    var lista = A.doPaciente(pid).sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
    var ultimo = lista[0] || null;
    var ativo = A.atual();
    var foco = (ativo && ativo.patient_id === pid) ? ativo : ultimo;
    var linhas = [];
    linhas.push(["Último atendimento", ultimo ? A.rotuloQuando(ultimo) + (ultimo.consultation_id ? " · com agendamento" : " · sem agendamento") : "nenhum registrado"]);
    if (foco) {
      var an = An.vigente(foco.id), anR = An.rascunhoDe(foco.id);
      linhas.push(["Anamnese" + (foco === ativo ? " (atendimento ativo)" : ""), an ? "rev. " + an.revision_number + " · " + an.status + " · " + An.contarItens(an.content) + " itens" : (anR ? "rascunho (não consolidada)" : "não registrada")]);
      var cd = Cd.vigente(foco.id), cdR = Cd.rascunhoDe(foco.id);
      /* teste real 07/10: a conduta vigente e a mais recente DA PESSOA; o
         atendimento ativo pode ser um antigo, sem conduta propria */
      var cdOutro = !cd && Cd.vigenteDoPaciente ? Cd.vigenteDoPaciente(pid, foco.id) : null;
      if (!cd && cdOutro) cd = cdOutro.conduta;
      linhas.push(["Conduta vigente", cd ? "rev. " + cd.revision_number + " · " + cd.status + (cd.objective ? " · " + cd.objective : "") + (cdOutro ? " · atendimento de " + A.rotuloQuando(cdOutro.atendimento) : "") : (cdR ? "rascunho (não é conduta vigente)" : "não registrada")]);
      if (cd && cd.return_plan) linhas.push(["Retorno previsto", cd.return_plan]);
      if (cd) {
        var ag = Cd.acordosDe(cd.id);
        if (ag.length) linhas.push(["Acordos", ag.map(function (g) { return g.description + " [" + Cd.rotulo(g.status) + "]"; }).join(" · ")]);
      }
    }
    var prox = window.Agenda && window.Agenda.proxima ? window.Agenda.proxima(pid) : null;
    if (prox) linhas.push(["Próxima consulta marcada (agenda)", dataBR(prox.data) + " às " + String(prox.hora).slice(0, 5)]);
    /* V1, Etapa 3: a Evolucao disponivel (so por atendimento, nunca "primeira x
       ultima" automatica) e o ultimo relatorio EMITIDO (rascunho nao conta). */
    linhas.push(["Última evolução disponível", lista.length >= 2
      ? "atendimento anterior × atual (" + lista.length + " atendimentos registrados)"
      : lista.length === 1 ? "só 1 atendimento: sem comparação" : "sem atendimentos: sem comparação"]);
    if (window.Relatorios && window.Relatorios.ultimoEmitido) {
      var rel = window.Relatorios.ultimoEmitido(pid);
      linhas.push(["Último relatório emitido", rel
        ? (rel.title || "Relatório clínico") + " · emissão nº " + rel.revision_number + " · " + dataBR(String(rel.issued_at).slice(0, 10)) + (rel.superseded_at ? " · substituído por retificação" : "")
        : "nenhum emitido" + (window.Relatorios.rascunhos(pid).length ? " (há rascunho não emitido)" : "")]);
    }
    /* Anamnese V2: o resumo (so organizacao do registrado) da anamnese vigente do atendimento em foco */
    var anResumo = "";
    if (foco && An.resumoHtml) {
      var anV = An.vigente(foco.id);
      if (!anV) { var antes = An.anteriorDe ? An.anteriorDe(pid, foco.id) : null; anV = antes; }
      var rh = anV ? An.resumoHtml(anV) : "";
      if (rh) anResumo = '<details class="fic-an-resumo" id="fic-an-resumo"><summary>Resumo da anamnese (rev. ' + anV.revision_number + ")</summary>" + rh + "</details>";
    }
    return '<div class="dash-bloco dash-bloco-compacto" id="fic-atendimento-clinico">' +
      '<h3 class="dash-titulo">Atendimento clínico</h3>' +
      linhas.map(function (l) { return '<div class="fic-det"><span>' + escapar(l[0]) + "</span><b>" + escapar(l[1]) + "</b></div>"; }).join("") +
      '<div class="fic-continuidade"><button type="button" class="fic-chip" data-ir="aba:anamnese">Anamnese</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span><button type="button" class="fic-chip" data-ir="holoscan">HOLOSCAN</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span><button type="button" class="fic-chip" data-ir="aba:ferramentas">Ferramentas</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span><button type="button" class="fic-chip" data-ir="aba:resultado-holos">Resultado HOLOS</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span><button type="button" class="fic-chip" data-ir="aba:conduta">Conduta</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span><button type="button" class="fic-chip" data-ir="aba:evolucao">Evolução</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span><button type="button" class="fic-chip" data-ir="aba:relatorio">Relatório</button></div>' +
      anResumo +
    "</div>";
  }

  /* ================================================= ABA: VISÃO CLÍNICA === */

  /* Exames: resumo compacto, nao duplica o HOLOSCAN — so diz quantos valores
     ja foram lancados (mesmo d.exames que a faixa e o panorama ja contam) e
     manda para onde eles moram ou para o confronto em si. */
  function blocoExames(d) {
    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Exames</h3>' +
      (d.exames > 0
        ? '<p class="dash-sub">' + d.exames +
          (d.exames === 1 ? " valor registrado." : " valores registrados.") + "</p>" +
          '<button type="button" class="dash-ir" data-ir="confronto">Ver Leitura Integrada ' +
          '<span aria-hidden="true">&rarr;</span></button>'
        : '<p class="dash-vazio">Nenhum exame registrado.</p>' +
          '<button type="button" class="dash-ir" data-ir="aba:documentos">Registrar exames ' +
          '<span aria-hidden="true">&rarr;</span></button>') +
      "</div>";
  }

  function blocoDocumentosPlaceholder() {
    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Documentos recentes</h3>' +
      '<div id="fic-visao-docs"><p class="dash-vazio">Carregando…</p></div>' +
      "</div>";
  }

  /* Os 3 mais recentes — mesmo ArquivoStore que a faixa e a aba Documentos ja
     usam, nao e fonte de dado nova. Confere se #fic-visao-docs ainda existe
     antes de escrever: a promise pode resolver depois de trocar de aba ou
     de paciente. */
  function preencherDocumentosRecentes(pid) {
    if (!window.ArquivoStore) return;
    window.ArquivoStore.listar(pid).then(function (itens) {
      var alvo = document.getElementById("fic-visao-docs");
      if (!alvo) return;
      if (!itens.length) {
        alvo.innerHTML = (itens.falhaServidor ? '<p class="dash-vazio">Não foi possível carregar os documentos do servidor agora.</p>' : '<p class="dash-vazio">Nenhum documento.</p>') +
          '<button type="button" class="dash-ir" data-ir="aba:documentos">Adicionar documento ' +
          '<span aria-hidden="true">&rarr;</span></button>';
        return;
      }
      var recentes = itens.slice()
        .sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); })
        .slice(0, 3);
      alvo.innerHTML = '<ul class="dash-pendentes" id="fic-lista-docs">' +
        recentes.map(function (a) {
          // .dash-pendente e grade de 3 colunas (avatar/conteudo/botao); sem
          // o avatar o botao caia na coluna do meio e esticava.
          return '<li class="dash-pendente">' +
            '<span class="pac-avatar">' + escapar((a.tipo || "Documento").charAt(0).toUpperCase()) + "</span>" +
            '<span class="dash-quem"><b>' + escapar(a.nome) + "</b>" +
              '<span class="dash-porque">' + escapar(a.tipo || "Documento") +
                (a.data ? " &middot; " + escapar(dataBR(a.data)) : "") + "</span></span>" +
            '<button type="button" class="dash-ir" data-ir="aba:documentos">Ver ' +
              '<span aria-hidden="true">&rarr;</span></button>' +
          "</li>";
        }).join("") + "</ul>";
    });
  }

  function desenharVisao() {
    var alvo = document.getElementById("aba-visao");
    if (!alvo) return;
    var d = reunir();
    var pid = paciente();
    var html = "";

    var av = alertas(d);
    if (av.length > 0) {
      html += '<div class="fic-alertas" role="alert" aria-label="' +
        av.length + (av.length === 1 ? ' pendência' : ' pendências') + '">';
      av.forEach(function (a) {
        html += '<div class="fic-alerta ' + a.grau + '">' +
          "<span>" + escapar(a.texto) + "</span>" +
          '<button type="button" class="fic-ir" data-ir="' + a.acao + '">' +
          escapar(a.botao) + "</button></div>";
      });
      html += "</div>";
    }

    html += blocoAtendimentoClinico(pid);

    if (!d.pontuacao) {
      html += '<div class="dash-vazio">Sem HOLOSCAN aplicado. O mapa é o que ' +
        "transforma o que ela conta em leitura — e é dele que sai tudo o que " +
        "aparece nesta aba.</div>";
      html += blocoDocumentosPlaceholder() + blocoExames(d);
      html += '<div class="dash-bloco dash-bloco-compacto" id="fic-visao-timeline-bloco">' +
        '<h3 class="dash-titulo">Linha do tempo</h3>' +
        '<div id="fic-visao-timeline"></div></div>';
      alvo.innerHTML = html;
      ligar(alvo);
      preencherDocumentosRecentes(pid);
      desenharLinha();
      return;
    }

    var p = d.pontuacao;
    html += '<div class="fic-mapa"><span class="fic-rot fic-rot-mapa">Mapa HOLOS</span>' +
      (window.Metodologia ? window.Metodologia.avisoAplicacaoHtml(p) : "") +
      '<div class="fic-indice">' +
      '<span class="fic-rot">Índice HOLOS</span>' +
      "<b>" + escapar(window.HoloAusencia.indiceTexto(p)) + '</b><span class="fic-de">de ' + p.indice_maximo + "</span>" +
      (p.quando ? '<span class="fic-quando">' + escapar(dataBR(p.quando)) + "</span>" : "") +
      "</div>";

    var A = window.HoloAusencia;
    if (p.triada) {
      html += '<div class="fic-triada">' +
        ["fisico", "mental", "espiritual"].map(function (e) {
          return "<span><i>" + e[0].toUpperCase() + e.slice(1) + "</i>" +
                 A.fmt(p.triada[e]) + "</span>";
        }).join("") + "</div>";
    }

    /* "Mais baixos" so entre quem tem nota com cobertura suficiente: sistema
       sem resposta ou quase sem resposta nao e "o mais baixo" de nada. */
    var piores = p.sistemas.filter(A.suficiente).sort(A.porNota).slice(0, 2);
    html += '<div class="fic-piores"><span class="fic-rot">Mais baixos</span>' +
      (piores.length ? piores.map(function (s) {
        return '<span class="fic-sis">' + escapar(s.nome) + " <b>" + A.notaTexto(s) + "</b></span>";
      }).join("") : '<span class="fic-sis">dados insuficientes</span>') + "</div></div>";

    /* Os cinco sistemas, do mais carregado ao mais equilibrado. Antes só os
       dois piores apareciam aqui, e quem quisesse o resto ia para o relatório. */
    html += '<div class="fic-sistemas"><span class="fic-rot">Os cinco sistemas</span>' +
      p.sistemas.slice().sort(A.porLeitura)
        .map(function (s) {
          var sem = A.semNota(s), insuf = !sem && !A.suficiente(s);
          var largura = sem ? 0 : Math.round(s.nota / 10 * 100);
          var cob = typeof s.respondidos === "number" && typeof s.total_marcadores === "number"
            ? s.respondidos + "/" + s.total_marcadores : "";
          return '<div class="fic-barra' + (sem ? " sem-dado" : insuf ? " insuficiente" : "") + '">' +
            '<span class="fic-barra-nome">' + escapar(s.nome) + "</span>" +
            '<span class="fic-barra-trilho"><i style="width:' + largura + '%"></i></span>' +
            '<span class="fic-barra-n">' + A.notaTexto(s) + "</span>" +
            '<span class="fic-barra-faixa">' +
              escapar(sem ? "sem dado" : insuf ? "dados insuficientes" : (window.rotuloExibivel(s.faixa) || "")) +
              (cob ? " · " + cob : "") + "</span></div>";
        }).join("") + "</div>";

    // Revisao clinica do HOLOSCAN: nenhuma CMB aparece na interface clinica
    // nesta rodada (ver app.js, cmbParaExibir()) — inclusive a CMB-001.
    var combinacoesParaExibir = window.cmbParaExibir ? window.cmbParaExibir(p.combinacoes) : [];
    if (combinacoesParaExibir.length > 0) {
      html += '<div class="fic-leituras"><span class="fic-rot">Leitura combinada</span>' +
        combinacoesParaExibir.map(function (c) {
          return '<p class="fic-combinada">&ldquo;' + escapar(c.leitura) + "&rdquo;</p>";
        }).join("") + "</div>";
    }

    // Espelho somente-leitura da Interpretacao profissional (escrita na aba
    // Relatorio) — nunca editada aqui, e nunca gerada automaticamente.
    var interpretacao = window.interpretacaoDe ? window.interpretacaoDe() : null;
    if (interpretacao && interpretacao.texto) {
      html += '<div class="fic-leituras"><span class="fic-rot">Interpretação profissional</span>' +
        "<p class=\"fic-combinada\">" + escapar(interpretacao.texto).replace(/\n/g, "<br>") + "</p></div>";
    }

    html += blocoRetorno(d, pid);

    html += blocoDocumentosPlaceholder() + blocoExames(d);

    html += '<div class="dash-bloco dash-bloco-compacto" id="fic-visao-timeline-bloco">' +
      '<h3 class="dash-titulo">Linha do tempo</h3>' +
      '<div id="fic-visao-timeline"></div></div>';

    alvo.innerHTML = html;
    ligar(alvo);
    preencherDocumentosRecentes(pid);
    desenharLinha();
  }

  function blocoRetorno(d, pid) {
    var todas = window.Agenda && window.Agenda.todas ? window.Agenda.todas(pid) : [];
    var hj = hojeISO();
    var passadas = todas.filter(function (c) { return c.data < hj; });
    if (passadas.length === 0) return "";
    var ultima = passadas[0];
    var desde = ultima.data;
    var diasAtras = diasDesde(desde);

    var itens = [];

    var apps = d.historico.filter(function (h) { return h.quando >= desde; });
    if (apps.length > 0)
      itens.push(apps.length + (apps.length === 1 ? " aplicação HOLOSCAN" : " aplicações HOLOSCAN"));

    if (apps.length >= 2) {
      /* Correcao P0: so ha "subiu/caiu" entre duas aplicacoes historicas (o
         comportamento anterior). Com aplicacao oficial V1 na conta, ou Indice
         ausente, nao ha regra de comparabilidade aplicada aqui: sem delta. */
      var ia = apps[0], ib = apps[apps.length - 1], Mt = window.Metodologia;
      var historicas = Mt && Mt.naturezaAplicacao(ia) === "historica_sem_pacote" && Mt.naturezaAplicacao(ib) === "historica_sem_pacote";
      if (historicas && typeof ia.indice === "number" && typeof ib.indice === "number") {
        var delta = ib.indice - ia.indice;
        itens.push("Índice HOLOS " + (delta > 0 ? "subiu " + delta : delta < 0 ? "caiu " + Math.abs(delta) : "sem mudança"));
      } else {
        itens.push("Índice HOLOS sem comparação automática entre estas aplicações");
      }
    }

    /* d.ferramentas e a lista de IDS de ferramenta preenchida (Panorama), sem
       data — o filtro por f.quando nunca achava nada. As aplicacoes datadas
       estao em window.Aplicacoes, a mesma fonte da linha do tempo. */
    var ferr = window.Aplicacoes
      ? window.Aplicacoes.doPaciente(pid).filter(function (a) {
          return a.status !== "rascunho" && diaLocal(a.concluida_em || a.iniciada_em) >= desde;
        })
      : [];
    if (ferr.length > 0)
      itens.push(ferr.length + (ferr.length === 1 ? " ferramenta aplicada" : " ferramentas aplicadas"));

    var coletasRet = window.Sincronizacao ? window.Sincronizacao.coletas(pid) : null;
    if (coletasRet) {
      /* "registrada desde": com data de coleta, a data da coleta; sem ela, o
         dia em que o registro foi feito (updated_at) — e o texto diz
         "registrada", nao "coletada" */
      var novas = coletasRet.filter(function (c) {
        if (!c.data_coleta_desconhecida && c.coletado_em) return c.coletado_em >= desde;
        return diaLocal(c.updated_at || c.created_at) >= desde;
      });
      if (novas.length > 0)
        itens.push(novas.length + (novas.length === 1 ? " coleta de exames registrada" : " coletas de exames registradas"));
    } else if (d.exames > 0) {
      itens.push(d.exames + (d.exames === 1 ? " valor de exame registrado" : " valores de exame registrados"));
    }

    return '<div class="dash-bloco dash-bloco-compacto fic-retorno">' +
      '<h3 class="dash-titulo">Desde a última consulta</h3>' +
      '<p class="dash-sub">Última consulta em ' + escapar(dataBR(desde)) +
        " (" + escapar(ultima.tipo || "Consulta") + ")" +
        (diasAtras !== null ? " &middot; " + haQuantoTempo(diasAtras) : "") + "</p>" +
      (itens.length > 0
        ? '<ul class="fic-retorno-lista">' + itens.map(function (t) {
            return "<li>" + escapar(t) + "</li>";
          }).join("") + "</ul>"
        : '<p class="dash-vazio">Nenhuma atividade registrada desde então.</p>') +
      "</div>";
  }

  /* ==================================================== ABA: CONSULTAS === */

  /* Continuidade discreta: o mesmo encadeamento do bloco Jornada clinica (ja
     visivel acima das abas), so que como uma linha fina — nao repete o
     bloco inteiro, so lembra o proximo passo depois da consulta. */
  function blocoContinuidade() {
    return '<div class="fic-continuidade">' +
      '<span class="fic-rot">Depois da consulta</span>' +
      '<button type="button" class="fic-chip" data-ir="holoscan">HOLOSCAN</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span>' +
      '<button type="button" class="fic-chip" data-ir="confronto">Leitura Integrada</button>' +
      '<span class="fic-continuidade-seta" aria-hidden="true">&rarr;</span>' +
      '<button type="button" class="fic-chip" data-ir="aba:documentos">Documentos</button>' +
    "</div>";
  }

  function linhaConsulta(c, destaque) {
    // .dash-pendente e grade de 3 colunas (avatar/conteudo/botao); sem o
    // avatar o botao caia na coluna do meio e esticava. Aqui o "avatar" e
    // o dia do mes — a mesma ideia de uma folhinha de calendario.
    return '<li class="dash-pendente' + (destaque ? " abrir" : "") + '">' +
      '<span class="pac-avatar">' + escapar((c.data || "").slice(8, 10) || "?") + "</span>" +
      '<span class="dash-quem"><b>' + escapar(dataBR(c.data)) + " às " + escapar(c.hora) + "</b>" +
        '<span class="dash-porque">' + escapar(c.tipo || "Consulta") +
          (c.nota ? " &middot; " + escapar(c.nota) : "") + "</span></span>" +
      '<button type="button" class="dash-ir" data-ir="agenda">Ver na agenda ' +
        '<span aria-hidden="true">&rarr;</span></button>' +
    "</li>";
  }

  /* ================================================ ABA: ATENDIMENTOS ==== */

  /* V1, Etapa 1. A aba (id tecnico "consultas") lista os ATENDIMENTOS
     clinicos do paciente (encounters) — cada um abre como contexto ativo —
     e, abaixo, com o nome certo, os AGENDAMENTOS da agenda. Abrir a aba ou
     um atendimento antigo nao cria nada; so "Novo atendimento" cria. */
  function linhaAtendimento(e, ativo) {
    var A = window.AtendimentoAtual;
    var w = A.paraParede(e.occurred_at, e.timezone || A.fuso());
    return '<li class="dash-pendente fic-at-linha' + (ativo ? " at-linha-ativa" : "") + '" data-atendimento="' + escapar(e.id) + '">' +
      '<span class="pac-avatar">' + escapar((w.data || "").slice(8, 10) || "?") + "</span>" +
      '<span class="dash-quem"><b>' + escapar(dataBR(w.data)) + " às " + escapar(w.hora) + "</b>" +
        '<span class="dash-porque">' + (e.type ? escapar(e.type) + " &middot; " : "") +
          (e.consultation_id ? "com agendamento de origem" : "sem agendamento") +
          (e.status ? " &middot; " + escapar(e.status) : "") +
          (ativo ? " &middot; <b>ativo</b>" : "") + "</span></span>" +
      '<button type="button" class="dash-ir" data-abrir-atendimento="' + escapar(e.id) + '">' +
        (ativo ? "Selecionado" : "Abrir") + ' <span aria-hidden="true">&rarr;</span></button>' +
    "</li>";
  }

  function desenharConsultas() {
    var alvo = document.getElementById("aba-consultas");
    if (!alvo) return;
    var pid = paciente();
    var A = window.AtendimentoAtual;
    var arquivado = window.pacienteArquivado && window.pacienteArquivado(pid);

    var atendimentos = A && A.doPaciente ? A.doPaciente(pid) : [];
    var ativo = A && A.atual ? A.atual() : null;
    var ativoId = ativo && ativo.patient_id === pid ? ativo.id : null;

    var todas = window.Agenda && window.Agenda.todas ? window.Agenda.todas(pid) : [];
    var canceladas = window.Agenda && window.Agenda.canceladas ? window.Agenda.canceladas(pid) : [];
    var proximas = todas.filter(function (c) { return diasDesde(c.data) <= 0; })
      .sort(function (a, b) { return a.data.localeCompare(b.data); });
    var anteriores = todas.filter(function (c) { return diasDesde(c.data) > 0; });

    var topo = '<div class="fic-consultas-topo">' +
      (arquivado ? "" : '<button type="button" class="btn-verde" data-novo-atendimento="1">Novo atendimento</button>') +
      '<button type="button" class="perf-botao" data-ir="nova-consulta">Marcar consulta (agenda)</button>' +
    "</div>";

    if (!atendimentos.length && !todas.length && !canceladas.length) {
      alvo.innerHTML = topo +
        '<div class="lista-vazia"><strong>Nenhum atendimento registrado</strong>' +
        "<span>Inicie um atendimento para registrar o que acontece na consulta. Marcar na agenda não cria atendimento.</span></div>" +
        blocoContinuidade();
      ligar(alvo);
      return;
    }

    var html = topo;

    html += '<div class="dash-bloco dash-bloco-compacto" id="fic-atendimentos">' +
      '<h3 class="dash-titulo">Atendimentos</h3>' +
      (atendimentos.length === 0
        ? '<p class="dash-vazio">Nenhum atendimento registrado. Marcar na agenda não cria atendimento.</p>'
        : '<ul class="dash-pendentes">' + atendimentos.map(function (e) {
            return linhaAtendimento(e, e.id === ativoId);
          }).join("") + "</ul>") +
      "</div>";

    if (proximas.length > 0) {
      html += '<div class="dash-bloco dash-bloco-compacto dash-bloco-hoje">' +
        '<h3 class="dash-titulo">' + (proximas.length === 1 ? "Próxima consulta marcada (agenda)" : "Próximas consultas marcadas (agenda)") + '</h3>' +
        '<ul class="dash-pendentes">' + proximas.map(function (c, i) {
          return linhaConsulta(c, i === 0);
        }).join("") + "</ul></div>";
    }

    html += '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Consultas anteriores (agenda)</h3>' +
      (anteriores.length === 0
        ? '<p class="dash-vazio">Nenhuma consulta anterior marcada. Agendamento com data passada não é atendimento.</p>'
        : '<ul class="dash-pendentes">' + anteriores.map(function (c) {
            return linhaConsulta(c, false);
          }).join("") + "</ul>") +
      "</div>";

    if (canceladas.length) {
      html += '<div class="dash-bloco dash-bloco-compacto" id="fic-canceladas">' +
        '<h3 class="dash-titulo">Consultas canceladas ou reagendadas (histórico)</h3>' +
        '<ul class="dash-pendentes">' + canceladas.map(function (c) {
          return '<li class="dash-pendente cancelada">' +
            '<span class="pac-avatar">' + escapar((c.data || "").slice(8, 10) || "?") + "</span>" +
            '<span class="dash-quem"><b>' + escapar(dataBR(c.data)) + " às " + escapar(String(c.hora).slice(0, 5)) + "</b>" +
              '<span class="dash-porque">' + (c.rescheduled_to_id ? "reagendada" : "cancelada") +
                (c.cancellation_reason ? " &middot; " + escapar(c.cancellation_reason) : "") + "</span></span>" +
          "</li>";
        }).join("") + "</ul></div>";
    }

    html += blocoContinuidade();

    alvo.innerHTML = html;
    ligar(alvo);
  }

  /* ==================================================== ABA: HOLOSCAN ==== */

  /* HOLOSCAN e mapa de investigacao e prioridade, nao diagnostico — o
     mesmo texto que ja existe no rodape da aba Visao Geral (holo-fronteira,
     index.html). Nada aqui calcula, reordena sistema ou toca na Triade:
     so le d.pontuacao/d.historico, que Panorama.doPaciente() ja monta a
     partir do que o motor e a tela do HOLOSCAN ja gravaram. */
  function blocoContinuidadeHoloscan() {
    return '<div class="fic-continuidade">' +
      '<span class="fic-rot">Depois do mapa</span>' +
      '<button type="button" class="fic-chip" data-ir="confronto">Ver Leitura Integrada</button>' +
    "</div>";
  }

  function linhaHoloscan(p, destaque, acaoExtra) {
    return '<li class="dash-pendente' + (destaque ? " abrir" : "") + '">' +
      '<span class="pac-avatar">' + escapar((p.quando || "").slice(8, 10) || "?") + "</span>" +
      '<span class="dash-quem"><b>' + escapar(dataBR(p.quando)) + "</b>" +
        '<span class="dash-porque">Índice ' + escapar(window.HoloAusencia.indiceTexto(p)) + " de " + escapar(p.indice_maximo) +
          (acaoExtra ? " &middot; " + escapar(acaoExtra) : "") + "</span></span>" +
      (destaque
        // so a ultima tem detalhe guardado (respostas) para reabrir de verdade
        ? '<button type="button" class="dash-ir" data-ver="holoscan">Abrir resultado ' +
          '<span aria-hidden="true">&rarr;</span></button>'
        : '<button type="button" class="dash-ir" data-ir="holoscan">Ver HOLOSCAN ' +
          '<span aria-hidden="true">&rarr;</span></button>') +
    "</li>";
  }

  function desenharHolo() {
    var alvo = document.getElementById("aba-holoscan");
    if (!alvo) return;
    var d = reunir(); // d.pontuacao = mais recente; d.historico = tudo, do mais antigo ao mais novo

    var topo = '<div class="fic-consultas-topo">' +
      '<button type="button" class="btn-verde" data-ir="holoscan">' +
        (d.pontuacao ? "Reaplicação integral" : "Iniciar HOLOSCAN") +
      "</button>" +
      (d.pontuacao ? '<span class="fic-topo-nota">Cada reaplicação refaz todas as 84 perguntas para gerar um novo Mapa HOLOS comparável.</span>' : "") +
      "</div>";

    if (!d.historico.length) {
      /* erro de leitura nao e "nenhum HOLOSCAN": o servidor pode ter
         aplicacoes que este navegador nao conseguiu ler agora */
      var falhouLeitura = window.Sincronizacao && window.Sincronizacao.falhou("holoscan");
      alvo.innerHTML = topo +
        (falhouLeitura
          ? '<div class="lista-vazia"><strong>Não foi possível carregar o HOLOSCAN do servidor</strong>' +
            "<span>Verifique a conexão e abra o app de novo. Nenhuma aplicação foi apagada.</span></div>"
          : '<div class="lista-vazia"><strong>Nenhuma aplicação HOLOSCAN</strong>' +
            "<span>Faça a primeira aplicação para mapear prioridades de investigação.</span></div>") +
        '<div id="aba-holoscan-laboratorial"></div>' +
        blocoContinuidadeHoloscan();
      if (window.desenharHoloscanLaboratorial) window.desenharHoloscanLaboratorial();
      ligar(alvo);
      return;
    }

    var html = topo;

    if (d.pontuacao) {
      /* A cobertura e a da aplicacao mostrada (o rascunho de uma aplicacao
         nova, se houver, vem a parte). */
      var cob = d.pontuacao.cobertura;
      var estado = cob && typeof cob.respondidos === "number" && typeof cob.total === "number"
        ? cob.respondidos + " de " + cob.total + " respondidas"
        : (d.respondidas === 0 ? "não iniciado" : d.respondidas + " de " + d.totalPerguntas + " respondidas");
      if (cob && d.respondidas > 0) estado += " · nova aplicação em andamento: " + d.respondidas + " respondidas";
      var sistemas = d.pontuacao.sistemas.map(function (s) {
        return '<span class="fic-sis">' + escapar(s.nome) + " <b>" + window.HoloAusencia.notaTexto(s) + "</b></span>";
      }).join("");
      html += '<div class="dash-bloco dash-bloco-compacto">' +
        '<h3 class="dash-titulo">Mapa HOLOS — última aplicação</h3>' +
        '<ul class="dash-pendentes">' + linhaHoloscan(d.pontuacao, true, estado) + "</ul>" +
        '<div class="fic-piores-caixa"><div class="fic-piores">' + sistemas + "</div></div>" +
      "</div>";
    }

    // historico e ascendente; tira a ultima (ja mostrada acima) e inverte
    var anteriores = d.historico.slice(0, -1).reverse();
    html += '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Histórico de aplicações</h3>' +
      (anteriores.length === 0
        ? '<p class="dash-vazio">Nenhuma aplicação anterior.</p>'
        : '<ul class="dash-pendentes">' + anteriores.map(function (p) {
            return linhaHoloscan(p, false, null);
          }).join("") + "</ul>") +
    "</div>";

    html += '<div id="aba-holoscan-laboratorial"></div>';

    html += blocoContinuidadeHoloscan();

    alvo.innerHTML = html;
    if (window.desenharHoloscanLaboratorial) window.desenharHoloscanLaboratorial();
    ligar(alvo);
  }

  /* ================================================ ABA: LINHA DO TEMPO === */

  var filtroLinha = "tudo";

  function desenharLinha() {
    var alvo = document.getElementById("fic-visao-timeline") || document.getElementById("aba-linha");
    if (!alvo) return;
    var pid = paciente();
    var d = reunir();

    /* V1, Etapa 3: a unica fonte de eventos e o modulo Timeline (timeline.js):
       so o CONSOLIDADO entra (rascunho, previa e cache nao sincronizado ficam
       fora); cada evento tem data clinica (ordena) e data de registro
       (consultavel); revisao aparece ligada ao original, nao como novo evento
       clinico. O agendamento entra como evento administrativo. */
    var pintar = function (arquivos) {
      var eventos = window.Timeline
        ? window.Timeline.eventos(pid, { documentos: arquivos, examesLocais: d.exames })
        : [];

      if (!eventos.length) {
        alvo.innerHTML = '<div class="dash-vazio">Nada aconteceu ainda. ' +
          "A linha do tempo se enche sozinha conforme você registra atendimentos, aplica o mapa, " +
          "marca consultas e guarda documentos.</div>";
        return;
      }

      var FILTROS_LINHA = (window.Timeline ? window.Timeline.TIPOS : []).map(function (t) { return { id: t[0], nome: t[1] }; });

      var visiveis = filtroLinha === "tudo"
        ? eventos
        : eventos.filter(function (e) { return e.tipo === filtroLinha; });

      var html = '<div class="fic-filtros-linha" role="group" aria-label="Filtrar linha do tempo">' +
        FILTROS_LINHA.map(function (f) {
          return '<button type="button" class="fic-filtro-btn' +
            (filtroLinha === f.id ? " ativo" : "") +
            '" data-filtro-linha="' + f.id + '" aria-pressed="' +
            (filtroLinha === f.id) + '">' + f.nome + "</button>";
        }).join("") + "</div>";

      html += '<p class="dash-sub">' + visiveis.length +
        (visiveis.length === 1 ? " registro" : " registros") +
        (filtroLinha !== "tudo" ? " (" + eventos.length + " no total)" : "") +
        ", do mais recente para o mais antigo. Só o que foi efetivamente registrado; data clínica primeiro, data de registro quando difere.</p>";

      if (visiveis.length === 0) {
        var vazioMsg = filtroLinha === "exame"
          ? "Nenhum exame registrado neste período."
          : "Nenhum registro deste tipo.";
        html += '<div class="dash-vazio">' + vazioMsg + '</div>';
      } else {
        html += '<div class="fic-tempo">';
        var mesCorrente = null;
        visiveis.forEach(function (e) {
          var mes = (e.quando || "").slice(0, 7);
          if (mes !== mesCorrente) {
            mesCorrente = mes;
            var p = (e.quando || "").split("-");
            html += '<div class="fic-tempo-mes">' +
              (p.length === 3 ? MESES[Number(p[1]) - 1] + " de " + p[0] : "sem data") +
              "</div>";
          }
          var futuro = !!e.quando && diasDesde(e.quando) < 0;
          /* data de registro: consultavel (title e data-registrado-em), sem
             se confundir com a data clinica no corpo do evento */
          var regDia = e.registrado_em ? diaLocal(e.registrado_em) : "";
          var reg = regDia && !e.administrativo && regDia !== e.quando ? "registrado em " + dataBR(regDia) : "";
          html += '<button type="button" class="fic-evento ' + e.tipo +
            (futuro ? " futuro" : "") + (e.revisao ? " revisao" : "") + (e.administrativo ? " administrativo" : "") +
            '" data-ir="' + escapar(e.acao || "aba:visao") + '" data-tl-ref="' + escapar((e.ref && e.ref.id) || "") +
            '" data-registrado-em="' + escapar(regDia) + '"' + (reg ? ' title="' + escapar(reg) + '"' : "") + ">" +
            '<span class="fic-evento-marca" aria-hidden="true"></span>' +
            '<span class="fic-evento-corpo">' +
              '<span class="fic-evento-topo"><b>' + e.titulo + "</b>" +
                '<span class="fic-selo">' + escapar(e.selo) + "</span></span>" +
              '<span class="fic-evento-quando">' + dataBR(e.quando) +
                (e.quando ? " &middot; " + (futuro ? emQuantoTempo(-diasDesde(e.quando))
                                                  : haQuantoTempo(diasDesde(e.quando))) : "") +
                (e.detalhe ? " &middot; " + e.detalhe : "") + "</span>" +
            "</span></button>";
        });
        html += "</div>";
      }

      alvo.innerHTML = html;
      ligar(alvo);

      alvo.querySelectorAll("[data-filtro-linha]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          filtroLinha = btn.dataset.filtroLinha;
          desenharLinha();
        });
      });
    };

    if (window.ArquivoStore) window.ArquivoStore.listar(pid).then(pintar);
    else pintar([]);
  }

  /* ================================================== ABA: FORMULÁRIOS ==== */

  /* O rascunho em andamento, se houver; senao, as respostas da ultima
     aplicacao salva (rodada 08: salvar esvazia o rascunho). */
  function respostasGuardadas() {
    var rascunho = {};
    try { rascunho = (JSON.parse(localStorage.getItem(CAIXA_Q)) || {})[paciente()] || {}; }
    catch (e) { rascunho = {}; }
    if (Object.keys(rascunho).length) return rascunho;
    return window.QuestionarioHolo ? window.QuestionarioHolo.respostasAplicadas(paciente()) : {};
  }

  function perguntasDoMotor() {
    try {
      return (window.HOLOSCAN && window.HOLOSCAN.questionario)
        ? window.HOLOSCAN.questionario() : [];
    } catch (e) { return []; }
  }

  function temConteudo(o) {
    return window.Panorama.temConteudo(o);
  }

  /* Os quatro formulários do método, mais as 30 ferramentas. Cada um diz o que
     é, o que já foi respondido, e o que dá para fazer com ele agora.

     SOBRE O CAMPO `extra`: ele é uma string MISTA — texto autoral com entidades
     de propósito (o separador "&middot;", o "&reg;" do nome) somado a respostas
     guardadas do paciente. Por isso o escape fica aqui, em cada pedaço que vem
     do dado, e NÃO num `escapar(f.extra)` lá embaixo na montagem do HTML:
     escapar a string inteira transformaria os separadores em texto literal.

     O valor persistido não muda — nada é removido da resposta. Só a SAÍDA é
     escapada, que é o mesmo que o histórico do OQ³/PQQ em app.js faz. */
  function desenharFormularios() {
    var alvo = document.getElementById("aba-ferramentas") || document.getElementById("aba-formularios");
    if (!alvo) return;
    var d = reunir();
    var p = pacienteObj() || {};

    var fichas = [
      {
        id: "holoscan",
        nome: "HOLOSCAN &mdash; questionário integral",
        sub: "84 perguntas em três blocos: raízes físicas, padrões emocionais e " +
             "Terreno Espiritual. É dele que sai o Índice e os cinco sistemas.",
        /* teste real 07/10: depois de salvo, o rascunho do questionario e
           esvaziado (reaplicar comeca vazio) — o estado lia "nao iniciado"
           logo acima de "Mapa gerado". Com mapa, o estado e o do mapa. */
        estado: d.respondidas > 0
          ? d.respondidas + " de " + d.totalPerguntas + " respondidas"
          : d.pontuacao ? "aplicado em " + dataBR(d.pontuacao.quando) : "não iniciado",
        pronto: d.respondidas >= d.totalPerguntas || (!!d.pontuacao && d.respondidas === 0),
        comeco: d.respondidas > 0 || !!d.pontuacao,
        extra: d.pontuacao
          ? "Mapa gerado em " + escapar(dataBR(d.pontuacao.quando)) +
            " &middot; Índice " + escapar(window.HoloAusencia.indiceTexto(d.pontuacao))
          : (d.respondidas > 0 ? "Respondido e ainda sem mapa gerado." : ""),
        ver: d.respondidas > 0 ? "questionario" : null,
        abrir: "holoscan"
      },
      {
        id: "oq3", nome: "OQ³ &mdash; O Que Quer, Precisa, Consegue",
        sub: "Clareza clínica entre desejo, necessidade e capacidade prática.",
        estado: temConteudo(p.oq3) ? "preenchido" : "não aplicado",
        pronto: temConteudo(p.oq3), comeco: temConteudo(p.oq3),
        extra: temConteudo(p.oq3)
          ? [p.oq3.quer && "Quer: " + escapar(p.oq3.quer),
             p.oq3.precisa && "Precisa: " + escapar(p.oq3.precisa),
             p.oq3.consegue && "Consegue: " + escapar(p.oq3.consegue)]
              .filter(Boolean).join(" &middot; ")
          : "",
        abrir: "corpo"
      },
      {
        id: "pqq", nome: "PQQ &mdash; Pra Que Que?",
        sub: "A chave dos porquês profundos: o propósito por trás do objetivo.",
        estado: temConteudo(p.pqq) ? "preenchido" : "não aplicado",
        pronto: temConteudo(p.pqq), comeco: temConteudo(p.pqq),
        extra: temConteudo(p.pqq)
          ? [p.pqq.objetivo && "Objetivo: " + escapar(p.pqq.objetivo),
             p.pqq.verdadeiro && "Pra que: " + escapar(p.pqq.verdadeiro)]
              .filter(Boolean).join(" &middot; ")
          : "",
        abrir: "mente"
      },
      /* O Mapa do Propósito NAO e uma ferramenta do catalogo: e uma tela que
         compoe OQ³ e PQQ e nao guarda nada. O card procurava uma aplicacao com
         ferramenta_id "mapa", que nenhuma parte do sistema cria — entao ele
         ficava "nao aplicado" para sempre, inclusive com as duas metades
         prontas.

         CRITERIO TECNICO: o estado do card e derivado do que ja existe, sem
         inventar dado nenhum —

           nenhuma das duas metades  ->  "não aplicado"
           so o OQ³                  ->  "falta o PQQ"
           so o PQQ                  ->  "falta o OQ³"
           as duas                   ->  "pronto para montar"

         "pronto" e "comeco" seguem a mesma leitura: da para montar o Mapa
         quando as duas metades existem; da para comecar quando existe uma.

         Nao foi criada aplicacao, persistencia nem historico do Mapa: isso e
         decisao metodologica em aberto. */
      (function () {
        var temOQ3 = temConteudo(p.oq3);
        var temPQQ = temConteudo(p.pqq);
        /* simulacao 08/10: com as duas metades o Mapa JA esta montado (ele e derivado,
           nao se salva a parte) — "pronto para montar" fazia parecer que faltava um passo */
        var estado = temOQ3 && temPQQ ? "montado"
                   : temOQ3 ? "falta o PQQ"
                   : temPQQ ? "falta o OQ³"
                   : "não aplicado";
        return {
          id: "mapa", nome: "Mapa do Propósito",
          sub: "Síntese do OQ³ e do PQQ: direção e um plano que pode ser vivido.",
          estado: estado,
          pronto: temOQ3 && temPQQ,
          comeco: temOQ3 || temPQQ,
          extra: temOQ3 && temPQQ
            ? "Montado a partir do OQ³ e do PQQ salvos: muda sozinho quando um deles muda."
            : (temOQ3 || temPQQ ? "O Mapa se monta com o OQ³ e o PQQ juntos." : ""),
          abrir: "espirito"
        };
      })()
    ];

    var html = '<p class="dash-sub">No método, o HOLOSCAN é um formulário: 84 ' +
      "respostas numa escala de 0 a 3. Aqui estão os quatro do método e o que " +
      "já foi respondido em cada um.</p>";

    html += '<div class="fic-forms">' + fichas.map(function (f) {
      return '<div class="fic-form' + (f.pronto ? " pronto" : f.comeco ? " comecado" : "") + '">' +
        '<div class="fic-form-topo">' +
          '<span class="fic-form-quem"><b>' + f.nome + "</b>" +
            "<span>" + f.sub + "</span></span>" +
          '<span class="fic-form-estado">' + escapar(f.estado) + "</span>" +
        "</div>" +
        (f.extra ? '<p class="fic-form-extra">' + f.extra + "</p>" : "") +
        '<div class="fic-form-acoes">' +
          (f.ver ? '<button type="button" class="perf-botao" data-ver="' + f.ver +
            '">Ver respostas</button>' : "") +
          '<button type="button" class="fic-ir-min" data-ir="' + f.abrir + '">' +
            (f.comeco ? "Abrir" : "Preencher agora") + "</button>" +
        "</div></div>";
    }).join("") + "</div>";

    var ativas = (window.FERRAMENTAS_ATIVAS || []).concat(["oq3", "pqq", "mapa"]);
    var aplicadasAtivas = d.ferramentas.filter(function (id) {
      return ativas.indexOf(id) >= 0;
    });
    /* o Mapa do Propósito nao tem aplicacao propria: conta como aplicado quando OQ³ e PQQ existem */
    if (aplicadasAtivas.indexOf("mapa") < 0 && temConteudo(p.oq3) && temConteudo(p.pqq)) aplicadasAtivas.push("mapa");

    html += '<div class="fic-forms-rodape">' +
      '<div class="fic-form-topo"><span class="fic-form-quem">' +
        "<b>Ferramentas do método</b><span>Ferramentas ativas de Corpo, Mente e " +
        "Espírito. Não são formulário do paciente: são conduta.</span></span>" +
        '<span class="fic-form-estado">' +
          (aplicadasAtivas.length === 0 ? "nenhuma aplicada"
            : aplicadasAtivas.length + " de " + ativas.length + " aplicadas") + "</span></div>" +
      (d.ferramentas.length > 0
        ? '<div class="fic-ferramentas">' + d.ferramentas.map(function (id) {
            var legada = ativas.indexOf(id) < 0;
            return '<button type="button" class="fic-chip' +
              (legada ? " fic-chip-legado" : "") + '"' +
              (legada ? "" : ' data-ferr="' + escapar(id) + '"') + ">" +
              escapar(nomeFerramenta(id)) + "</button>";
          }).join("") + "</div>"
        : "") +
      "</div>";

    alvo.innerHTML = html;
    ligar(alvo);
  }

  /* ============================================ A JANELA DE RESPOSTAS ===== */

  /* O app calculava a nota e guardava as 84 respostas numa caixa que nenhuma
     tela abria. Isso quer dizer que, depois de aplicar, ninguém conseguia
     reler o que a pessoa tinha respondido — nem para conferir, nem para
     explicar de onde a nota saiu. Esta janela abre a caixa. */
  function abrirRespostas() {
    var perguntas = perguntasDoMotor();
    var dadas = respostasGuardadas();
    var d = reunir();
    var p = pacienteObj();

    var respondidas = perguntas.filter(function (q) {
      return dadas[q.id] !== undefined && dadas[q.id] !== null;
    });

    document.getElementById("fic-janela-titulo").innerHTML =
      "HOLOSCAN &mdash; respostas de " + escapar(p ? p.nome : "paciente");
    document.getElementById("fic-janela-sub").textContent =
      respondidas.length + " de " + perguntas.length + " perguntas respondidas. " +
      "O número ao lado de cada uma é o que ela vale na escala, de 0 a 3.";

    var html = "";

    /* O resultado vem primeiro, como no papel: a conta, e depois as respostas
       que a produziram. Sem mapa gerado, diz isso em vez de mostrar nada. */
    if (d.pontuacao) {
      html += '<div class="fic-res"><div class="fic-res-topo">' +
        "<b>Índice HOLOS " + escapar(window.HoloAusencia.indiceTexto(d.pontuacao)) + "</b>" +
        "<span>de " + d.pontuacao.indice_maximo + " &middot; mapa de " +
        dataBR(d.pontuacao.quando) + "</span></div>" +
        '<div class="fic-res-grade">' + d.pontuacao.sistemas.map(function (s) {
          return '<div class="fic-res-sis"><span>' + escapar(s.nome) + "</span><b>" +
            window.HoloAusencia.notaTexto(s) + "</b></div>";
        }).join("") + "</div></div>";
    } else if (respondidas.length > 0) {
      html += '<div class="dash-vazio">Respondido, e o mapa ainda não foi gerado. ' +
        "As respostas estão aqui; a leitura sai quando você calcular.</div>";
    }

    // agrupado por bloco, que e como a pessoa respondeu
    var porOrigem = {};
    respondidas.forEach(function (q) {
      var o = q.origem || "sintoma";
      (porOrigem[o] = porOrigem[o] || []).push(q);
    });

    ["sintoma", "emocao", "espiritual"].forEach(function (origem) {
      var lista = porOrigem[origem];
      if (!lista || !lista.length) return;
      html += '<h4 class="fic-bloco-titulo">' + (NOME_ORIGEM[origem] || origem) +
        ' <span>' + lista.length + "</span></h4>";
      html += '<div class="fic-respostas">' + lista.map(function (q) {
        var valor = dadas[q.id];
        var escala = ESCALAS[q.escala] || ESCALAS.frequencia;
        /* Sentido invertido quer dizer que a resposta alta é a boa. Mostrar a
           carga sem dizer isso faria "Sempre = 3" parecer ruim onde é ótimo. */
        var invertido = q.sentido === "invertido";
        return '<div class="fic-resposta">' +
          '<span class="fic-pergunta">' + escapar(q.pergunta) +
            (invertido ? '<i title="Nesta pergunta, responder alto é sinal bom">sentido invertido</i>' : "") +
          "</span>" +
          '<span class="fic-valor-resposta"><b>' + valor + "</b>" +
          "<span>" + escapar(escala[valor] || "") + "</span></span>" +
          "</div>";
      }).join("") + "</div>";
    });

    if (!respondidas.length) {
      html = '<div class="dash-vazio">Nenhuma resposta guardada para esta pessoa.</div>';
    } else {
      html += '<div class="fic-janela-acoes">' +
        '<button type="button" class="perf-botao" data-ir="holoscan">' +
        "Abrir o questionário para corrigir</button></div>";
    }

    document.getElementById("fic-janela-corpo").innerHTML = html;
    var janela = document.getElementById("fic-janela");
    janela._gatilho = document.activeElement;
    janela.setAttribute("role", "dialog");
    janela.setAttribute("aria-modal", "true");
    janela.setAttribute("aria-labelledby", "fic-janela-titulo");
    janela.classList.remove("hidden");
    document.getElementById("fic-janela-fechar").focus();
  }

  function fecharJanela() {
    var j = document.getElementById("fic-janela");
    if (!j) return;
    var gatilho = j._gatilho;
    j.classList.add("hidden");
    if (gatilho && gatilho.focus) gatilho.focus();
  }

  /* ---------- ligar --------------------------------------------------------- */

  var ligados = [];

  function ligar(alvo) {
    if (ligados.indexOf(alvo) >= 0) return;
    ligados.push(alvo);

    alvo.addEventListener("click", function (ev) {
      var ver = ev.target.closest("[data-ver]");
      if (ver) { abrirRespostas(); return; }

      /* V1, Etapa 1: atendimentos. Abrir um antigo so SELECIONA; criar e
         gesto proprio, com confirmacao de data/hora. */
      var abrirAt = ev.target.closest("[data-abrir-atendimento]");
      if (abrirAt && window.AtendimentoAtual) {
        window.AtendimentoAtual.selecionarPorId(abrirAt.dataset.abrirAtendimento);
        return;
      }
      if (ev.target.closest("[data-novo-atendimento]") && window.AtendimentoAtual) {
        window.AtendimentoAtual.abrirDialogo({ patient_id: paciente() });
        return;
      }

      var ir = ev.target.closest("[data-ir]");
      if (ir) {
        fecharJanela();
        // "aba:x" abre uma aba aqui mesmo; o resto e secao do menu
        if (ir.dataset.ir.indexOf("aba:") === 0) {
          var aba = document.querySelector('[data-aba="' + ir.dataset.ir.slice(4) + '"]');
          if (aba) { aba.click(); aba.scrollIntoView({ block: "center" }); }
          return;
        }
        // Mesmo atalho do cabecalho (data-atalho="agenda"): ir para a agenda
        // e abrir o formulario, ja com esta pessoa (agenda.js le pacienteAtivoId()).
        if (ir.dataset.ir === "nova-consulta") {
          var secaoAgenda = document.querySelector('.nav-item[data-secao="agenda"]');
          if (secaoAgenda) secaoAgenda.click();
          if (window.Agenda && window.Agenda.novaConsultaPara) window.Agenda.novaConsultaPara(window.pacienteAtivoId ? window.pacienteAtivoId() : null);
          return;
        }
        var b = document.querySelector('.nav-item[data-secao="' + ir.dataset.ir + '"]');
        if (b) b.click();
        return;
      }

      var f = ev.target.closest("[data-ferr]");
      if (f && window.abrirFerramentaPorId) window.abrirFerramentaPorId(f.dataset.ferr);
    });
  }

  /* ---------- desenhar o que está à vista ---------------------------------- */

  var DESENHOS = {
    visao: desenharVisao,
    consultas: desenharConsultas,
    anamnese: function () { if (window.Anamnese) window.Anamnese.desenhar(); },
    conduta: function () { if (window.Conduta) window.Conduta.desenhar(); },
    evolucao: function () { if (window.Evolucao) window.Evolucao.desenhar(); },
    holoscan: desenharHolo,
    ferramentas: desenharFormularios,
    "resultado-holos": function () { if (window.ResultadoHolos) window.ResultadoHolos.desenhar(); },
    linha: desenharLinha,
    formularios: desenharFormularios
  };

  /** Chamada por arquivos.js quando a aba muda: só a aba aberta é desenhada. */
  window.desenharAbaDaFicha = function (nome) {
    abaAtual = nome;
    if (DESENHOS[nome]) DESENHOS[nome]();
  };

  function desenhar() {
    if (!document.getElementById("ficha-faixa")) return;
    desenharFaixa();
    if (DESENHOS[abaAtual]) DESENHOS[abaAtual]();
  }

  window.redesenharFicha = desenhar;

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("ficha-faixa")) return;

    ligar(document.getElementById("ficha-faixa"));
    ligar(document.getElementById("fic-janela-corpo"));

    document.getElementById("fic-janela-fechar")
      .addEventListener("click", fecharJanela);
    // clicar fora da caixa fecha; dentro, não
    document.getElementById("fic-janela").addEventListener("click", function (ev) {
      if (ev.target.id === "fic-janela") fecharJanela();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") fecharJanela();
    });

    desenhar();

    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      desenhar();
    };
  });
})();
