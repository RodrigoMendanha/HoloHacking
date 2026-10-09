/* ===========================================================================
   DASHBOARD — o que tenho hoje?
   ===========================================================================

   A primeira tela que a nutricionista ve ao abrir o app. Responde a tres
   perguntas, na ordem em que elas aparecem na cabeca de quem vai atender:

     1. O que tenho hoje?     consultas marcadas do dia, proximas marcadas
                              (agendamentos — atendimento realizado e outra
                              coisa e mora em atendimento.js/encounters)
     2. Quem precisa de mim?  pendencias da carteira, da mais urgente
     3. O que se repete?      o terreno que mais aparece entre pacientes

   Conta nova (0 pacientes): mostra o metodo junto com orientacao contextual
   que detecta o estado real da conta (perfil, primeiro paciente, HOLOSCAN).

   Nada aqui calcula regra clinica: quem decide o que e pendencia e
   panorama.js, que e o mesmo codigo que a ficha usa.
   =========================================================================== */

(function () {
  "use strict";

  var alvo = null;

  var escapar = window.escapar;

  function inicial(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
  }

  function primeiroNome(nome) {
    return (nome || "").split(" ")[0];
  }

  var dataBR = window.dataBR;

  function saudacao() {
    var h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }

  function nomeProfissional() {
    if (window.Perfil && window.Perfil.atual) {
      var p = window.Perfil.atual();
      if (p && p.nome) return primeiroNome(p.nome);
    }
    return "Nutricionista";
  }

  /* ---------- quem conta ---------------------------------------------------
     Paciente ARQUIVADO (status "inativo") nao e pendencia, nao e "recente" e
     nao entra em "sem conduta": nao se registra nada novo para ele. Todas as
     secoes leem a mesma lista de ativos, para os numeros baterem entre si.
     Consultas marcadas continuam aparecendo (sao compromissos reais), com a
     etiqueta "arquivado" quando for o caso. */

  function ativo(p) { return !!p && p.status !== "inativo"; }

  function todos() { return (window.pacientesTodos && window.pacientesTodos()) || []; }

  function pacientePorId(pid) { return todos().filter(function (x) { return x.id === pid; })[0] || null; }

  function nomeDe(pid) { var p = pacientePorId(pid); return p ? p.nome : "Paciente"; }

  /* "14:00:00" (como vem do banco) vira "14:00". */
  function horaCurta(h) { return h ? String(h).slice(0, 5) : ""; }

  function pendentesAtivos(c) {
    return c ? c.pendentes.filter(function (l) { return ativo(l.paciente); }) : [];
  }

  /* V1, Etapa 2: pendencia OPERACIONAL objetiva — atendimento registrado sem
     conduta consolidada (rascunho nao conta), so de pacientes ativos. Nao e
     julgamento clinico. */
  function semConduta() {
    var A = window.AtendimentoAtual, Cd = window.Conduta;
    if (!A || !Cd) return [];
    return A.todos().filter(function (e) { return !Cd.vigente(e.id) && ativo(pacientePorId(e.patient_id)); })
      .sort(function (a, b) { return String(b.occurred_at).localeCompare(String(a.occurred_at)); });
  }

  /* As consultas vigentes de hoje em diante, todas (nao so a proxima de cada
     paciente), por data e hora — Agenda.daCarteira() ja vem nessa ordem. */
  function consultasFuturas() {
    var Ag = window.Agenda;
    if (!Ag || !Ag.daCarteira) return [];
    var hj = hojeISO();
    return Ag.daCarteira().filter(function (x) { return x.data >= hj; }).map(function (x) {
      return { id: x.id, data: x.data, hora: x.hora, tipo: x.tipo, paciente: pacientePorId(x.paciente_id) };
    }).filter(function (l) { return !!l.paciente; });
  }

  function etiquetaArquivado(p) { return ativo(p) ? "" : " &middot; arquivado"; }

  /* ---------- os blocos --------------------------------------------------- */

  function blocoCabecalho(c, futuras) {
    var nPac = c ? c.linhas.filter(function (l) { return ativo(l.paciente); }).length : 0;
    /* Pendencias = o que aparece em "Precisa de voce": pacientes ativos com
       alerta + atendimentos sem conduta salva. O mesmo numero nos dois lugares. */
    var nPend = pendentesAtivos(c).length + semConduta().length;

    var hj = hojeISO();
    var consultasHoje = futuras.filter(function (l) { return l.data === hj; }).length;
    var Ag = window.Agenda;
    var proxima = futuras.filter(function (l) { return !Ag || !Ag.aindaVem || Ag.aindaVem(l); })[0];
    var proxLabel = proxima ? escapar(dataBR(proxima.data)) : "&mdash;";

    var nome = nomeProfissional();

    return '<div class="secao-cabeca dash-cabeca">' +
        '<span class="eyebrow">Plataforma clínica</span>' +
        "<h2>" + saudacao() + ", <em>" + escapar(nome) + "</em></h2>" +
        (nPac > 0
          ? "<p>Você tem <b>" + consultasHoje + (consultasHoje === 1 ? " consulta" : " consultas") +
            "</b> hoje e <b>" + nPend + (nPend === 1 ? " pendência" : " pendências") + "</b> na carteira.</p>"
          : "<p>Comece cadastrando seu primeiro paciente para usar a plataforma.</p>") +
      "</div>" +
      '<div class="dash-numeros dash-resumo">' +
        '<div class="dash-tile"><b>' + nPac + '</b><span>Pacientes ativos</span></div>' +
        '<div class="dash-tile"><b>' + consultasHoje + '</b><span>Consultas hoje</span></div>' +
        '<div class="dash-tile"><b>' + proxLabel + '</b><span>Próxima consulta</span></div>' +
        '<div class="dash-tile"><b>' + nPend + '</b><span>Pendências</span></div>' +
      "</div>" +
      '<div class="dash-acoes-rapidas">' +
        '<button type="button" class="perf-botao" data-destino="novo">Novo paciente</button>' +
        '<button type="button" class="perf-botao" data-destino="nova-consulta">Nova consulta</button>' +
        '<button type="button" class="perf-botao" data-destino="holoscan">Abrir HOLOSCAN</button>' +
        '<button type="button" class="perf-botao" data-destino="agenda">Abrir agenda</button>' +
      "</div>";
  }

  function linhaConsulta(l, quando) {
    return '<li class="dash-pendente">' +
      '<span class="pac-avatar">' + escapar(inicial(l.paciente.nome)) + "</span>" +
      '<span class="dash-quem">' +
        "<b>" + escapar(l.paciente.nome) + "</b>" +
        '<span class="dash-porque">' + escapar(quando) + (l.tipo ? " &middot; " + escapar(l.tipo) : "") +
          etiquetaArquivado(l.paciente) + "</span>" +
      "</span>" +
      '<button type="button" class="dash-ir" data-paciente="' + escapar(l.paciente.id) +
        '" data-consulta="' + escapar(l.id) + '" data-destino="consulta">Ver <span aria-hidden="true">&rarr;</span></button>' +
      "</li>";
  }

  function blocoConsultasHoje(futuras) {
    var hj = hojeISO();
    var hoje = futuras.filter(function (l) { return l.data === hj; });
    if (hoje.length === 0) return "";

    var corpo = '<ul class="dash-pendentes" id="dash-lista-hoje">' + hoje.map(function (l) {
      return linhaConsulta(l, horaCurta(l.hora) || "sem horário");
    }).join("") + "</ul>";

    return '<div class="dash-bloco dash-bloco-compacto dash-bloco-hoje">' +
      '<h3 class="dash-titulo">Hoje <em>' + hoje.length + "</em></h3>" + corpo + "</div>";
  }

  function blocoProximosAtendimentos(futuras) {
    var hj = hojeISO();
    var proximas = futuras.filter(function (l) { return l.data > hj; }).slice(0, 5);

    var corpo;
    if (proximas.length === 0) {
      corpo = '<p class="dash-vazio">Nenhuma consulta agendada nos próximos dias.</p>' +
        '<button type="button" class="perf-botao" data-destino="nova-consulta">Agendar consulta</button>';
    } else {
      corpo = '<ul class="dash-pendentes" id="dash-lista-atendimentos">' + proximas.map(function (l) {
        return linhaConsulta(l, dataBR(l.data) + (l.hora ? " às " + horaCurta(l.hora) : ""));
      }).join("") + "</ul>";
    }

    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Próximas consultas marcadas</h3>' + corpo + "</div>";
  }

  function blocoPacientesRecentes() {
    var recentes = todos().filter(ativo)
      .sort(function (a, b) { return (b.created_at || "").localeCompare(a.created_at || ""); })
      .slice(0, 3);

    var corpo;
    if (recentes.length === 0) {
      corpo = '<p class="dash-vazio">Nenhum paciente cadastrado ainda.</p>' +
        '<button type="button" class="btn-verde" data-destino="novo">Cadastrar primeiro paciente</button>';
    } else {
      corpo = '<ul class="dash-pendentes" id="dash-lista-recentes">' + recentes.map(function (p) {
        return '<li class="dash-pendente">' +
          '<span class="pac-avatar">' + escapar(inicial(p.nome)) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(p.nome) + "</b></span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(p.id) +
            '" data-destino="ficha">Abrir <span aria-hidden="true">&rarr;</span></button>' +
          "</li>";
      }).join("") + "</ul>";
    }

    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Pacientes recentes</h3>' + corpo + "</div>";
  }

  /* A jornada age sobre o paciente em foco — e diz qual e. Sem paciente em
     foco (ou com um arquivado), os botoes pedem para escolher antes.
     INTEGRAR leva as Ferramentas do paciente (aba da ficha), nao ao Corpo. */
  function blocoJornadaClinica() {
    var etapas = [
      { mov: "MAPEAR",      nome: "HOLOSCAN",          texto: "Mapear prioridades de investigação.",                destino: "holoscan" },
      { mov: "INTEGRAR",    nome: "Ferramentas",       texto: "Integrar ferramentas e condutas ao caso.",           destino: "aba:ferramentas" },
      { mov: "APRESENTAR",  nome: "Resultado",         texto: "Apresentar e enviar o resultado à paciente.",        destino: "resultado" },
      { mov: "ACOMPANHAR",  nome: "Evolução",          texto: "Acompanhar mudanças entre aplicações.",              destino: "evolucao" }
    ];

    var pid = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
    var foco = pid ? pacientePorId(pid) : null;
    var linhaFoco = !foco
      ? "Nenhum paciente em foco: escolha um paciente para seguir a jornada."
      : !ativo(foco)
        ? "Paciente em foco: <b>" + escapar(foco.nome) + "</b> &middot; arquivado. Escolha um paciente ativo para seguir a jornada."
        : "Paciente em foco: <b>" + escapar(foco.nome) + "</b>";

    var passos = etapas.map(function (e, i) {
      var seta = i > 0 ? '<div class="dash-jornada-seta" aria-hidden="true">&darr;</div>' : "";
      return seta + '<div class="dash-jornada-passo">' +
        '<span class="dash-mov">' + escapar(e.mov) + "</span>" +
        '<span class="dash-quem"><b>' + escapar(e.nome) + "</b>" +
          '<span class="dash-porque">' + escapar(e.texto) + "</span></span>" +
        '<button type="button" class="dash-ir" data-jornada="1" data-destino="' + e.destino + '">Abrir <span aria-hidden="true">&rarr;</span></button>' +
      "</div>";
    }).join("");

    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Jornada clínica</h3>' +
      '<p class="dash-sub" id="dash-jornada-foco">' + linhaFoco + "</p>" +
      '<div class="dash-jornada">' + passos + "</div></div>";
  }

  /* Os atendimentos sem conduta salva entram em "Precisa de voce" (lista
     propria, id dash-sem-conduta). "Abrir" leva ao atendimento, na aba
     Conduta — nao so a ficha. */
  function listaSemConduta() {
    var A = window.AtendimentoAtual, Cd = window.Conduta;
    var pend = semConduta();
    if (!pend.length) return "";
    return '<div id="dash-sem-conduta">' +
      '<h4 class="dash-subtitulo">Atendimentos sem conduta salva <em>' + pend.length + "</em></h4>" +
      '<ul class="dash-pendentes">' + pend.slice(0, 5).map(function (e) {
        return '<li class="dash-pendente"><span class="pac-avatar">' + escapar(inicial(nomeDe(e.patient_id))) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(nomeDe(e.patient_id)) + "</b><span class=\"dash-porque\">" + escapar(A.rotuloQuando(e)) +
          (Cd.rascunhoDe(e.id) ? " · conduta em rascunho" : " · sem conduta") + "</span></span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(e.patient_id) + '" data-atendimento="' + escapar(e.id) +
          '" data-destino="atendimento-conduta">Abrir conduta <span aria-hidden="true">&rarr;</span></button></li>';
      }).join("") + "</ul></div>";
  }

  /* V1, Etapa 3: pendencias OPERACIONAIS — rascunhos de anamnese/conduta nao
     consolidados e relatorios em rascunho. Contagens, nao julgamentos; nada
     de Indice medio ou metodologia nao homologada. */
  function blocoRascunhosPendentes() {
    var An = window.Anamnese, Cd = window.Conduta, R = window.Relatorios;
    var ativos = todos().filter(ativo);
    var nAn = An ? An.doPaciente ? ativos.reduce(function (n, p) { return n + An.doPaciente(p.id).filter(function (a) { return a.status === "rascunho"; }).length; }, 0) : 0 : 0;
    var nCd = Cd ? ativos.reduce(function (n, p) { return n + Cd.doPaciente(p.id).filter(function (c) { return c.status === "rascunho"; }).length; }, 0) : 0;
    var rel = (R && R.todosRascunhos ? R.todosRascunhos() : []).filter(function (r) { return ativo(pacientePorId(r.patient_id)); });
    if (!nAn && !nCd && !rel.length) return "";
    return '<div class="dash-bloco dash-bloco-compacto" id="dash-rascunhos">' +
      '<h3 class="dash-titulo">Rascunhos pendentes <em>' + (nAn + nCd + rel.length) + "</em></h3>" +
      '<p class="dash-sub">' + [nAn ? nAn + (nAn === 1 ? " anamnese em rascunho" : " anamneses em rascunho") : "",
        nCd ? nCd + (nCd === 1 ? " conduta em rascunho" : " condutas em rascunho") : "",
        rel.length ? rel.length + (rel.length === 1 ? " relatório em rascunho" : " relatórios em rascunho") : ""].filter(Boolean).join(" · ") + ". Nada disso entra na timeline, na Evolução nem na HOLOS AI.</p>" +
      (rel.length ? '<ul class="dash-pendentes" id="dash-relatorios-rascunho">' + rel.slice(0, 5).map(function (r) {
        return '<li class="dash-pendente"><span class="pac-avatar">' + escapar(inicial(nomeDe(r.patient_id))) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(nomeDe(r.patient_id)) + "</b><span class=\"dash-porque\">relatório em rascunho · " + escapar(r.title || "Relatório clínico") + "</span></span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(r.patient_id) + '" data-destino="aba:relatorio">Abrir <span aria-hidden="true">&rarr;</span></button></li>';
      }).join("") + "</ul>" : "") + "</div>";
  }

  /* "Precisa de voce": pacientes ATIVOS com alerta (panorama.js) e os
     atendimentos sem conduta salva. Arquivado nao entra: a ficha dele nao
     aceita registro novo, entao nao ha o que fazer por ele aqui. */
  function blocoPendencias(c) {
    var pend = pendentesAtivos(c);
    var semC = listaSemConduta();
    var total = pend.length + semConduta().length;
    if (total === 0) {
      return '<div class="dash-bloco">' +
        '<h3 class="dash-titulo">Precisa de você</h3>' +
        '<p class="dash-vazio">Nada pendente. Todas as fichas estão em dia.</p>' +
        "</div>";
    }

    var html = '<div class="dash-bloco" id="dash-precisa">' +
      '<h3 class="dash-titulo">Precisa de você <em>' + total + "</em></h3>";

    if (pend.length) {
      html += '<ul class="dash-pendentes" id="dash-lista-pendentes">';
      pend.forEach(function (l) {
        var primeiro = l.alertas[0];
        var restantes = l.alertas.slice(1).map(function (a) { return a.curto; });
        html += '<li class="dash-pendente ' + primeiro.grau + '">' +
          '<span class="pac-avatar">' + escapar(inicial(l.paciente.nome)) + "</span>" +
          '<span class="dash-quem">' +
            "<b>" + escapar(l.paciente.nome) + "</b>" +
            '<span class="dash-porque">' + escapar(primeiro.curto) +
              (restantes.length ? " &middot; " + escapar(restantes.join(" · ")) : "") +
            "</span>" +
          "</span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(l.paciente.id) +
            '" data-destino="' + escapar(primeiro.acao) + '">' +
            escapar(primeiro.botao) + ' <span aria-hidden="true">&rarr;</span></button>' +
          "</li>";
      });
      html += "</ul>";
    }

    return html + semC + "</div>";
  }

  /* Etapa 0 da V1: os tiles "reavaliacoes vencidas" e "Indice HOLOS medio"
     sairam. Correcao do dashboard (pos-6.5): o bloco "N pacientes / N com
     HOLOSCAN" tambem saiu — repetia o cabecalho com outro numero (contava os
     arquivados). "O terreno da sua carteira" so ocupava espaco com o aviso
     de recurso desligado: fica escondido ate existir regra homologada de
     agregacao no Pacote Metodologico. */

  /* ---------- onboarding contextual --------------------------------------- */

  function blocoOnboarding(c) {
    var perfilPct = 0;
    if (window.Perfil && window.Perfil.completude) {
      perfilPct = window.Perfil.completude().pct;
    }

    var passos = [];

    if (perfilPct < 100) {
      passos.push({
        feito: false,
        rotulo: "Complete seu perfil profissional",
        sub: "Nome, registro e assinatura aparecem nos documentos que você imprime.",
        destino: "perfil",
        acao: "Completar perfil"
      });
    } else {
      passos.push({ feito: true, rotulo: "Perfil profissional completo", sub: "", destino: "", acao: "" });
    }

    if (c.total === 0) {
      passos.push({
        feito: false,
        rotulo: "Cadastre seu primeiro paciente",
        sub: "Tudo começa com uma pessoa. Cadastre e aplique o HOLOSCAN.",
        destino: "novo",
        acao: "Cadastrar paciente"
      });
    } else {
      passos.push({ feito: true, rotulo: "Primeiro paciente cadastrado", sub: "", destino: "", acao: "" });
    }

    if (c.comMapa === 0) {
      passos.push({
        feito: false,
        rotulo: "Aplique o primeiro HOLOSCAN",
        sub: "O mapa integral revela o que o paciente relata sobre corpo, mente e espírito.",
        destino: "holoscan",
        acao: "Abrir HOLOSCAN"
      });
    } else {
      passos.push({ feito: true, rotulo: "HOLOSCAN aplicado", sub: "", destino: "", acao: "" });
    }

    var todosProntos = passos.every(function (p) { return p.feito; });
    if (todosProntos) return "";

    var html = '<div class="dash-bloco dash-onboarding">' +
      '<h3 class="dash-titulo">Primeiros passos</h3>' +
      '<ul class="dash-passos">';

    passos.forEach(function (p) {
      html += '<li class="dash-passo' + (p.feito ? " feito" : "") + '">' +
        '<span class="dash-passo-marca" aria-hidden="true">' + (p.feito ? "&#10003;" : "") + "</span>" +
        '<span class="dash-passo-info"><b>' + escapar(p.rotulo) + "</b>" +
          (p.sub ? '<span>' + escapar(p.sub) + "</span>" : "") + "</span>" +
        (p.feito ? "" : '<button type="button" class="dash-ir" data-destino="' +
          escapar(p.destino) + '">' + escapar(p.acao) +
          ' <span aria-hidden="true">&rarr;</span></button>') +
        "</li>";
    });

    return html + "</ul></div>";
  }

  /* ---------- desenhar ---------------------------------------------------- */

  function desenhar() {
    if (!alvo || !window.Panorama) return;

    var c;
    try { c = window.Panorama.carteira(); }
    catch (e) { alvo.innerHTML = ""; return; }

    var futuras = [];
    try { futuras = consultasFuturas(); }
    catch (e) { futuras = []; }

    var metodo = document.getElementById("dash-metodo");

    if (c.total === 0) {
      if (metodo) metodo.classList.remove("hidden");
      alvo.innerHTML = blocoCabecalho(c, futuras) +
        blocoOnboarding(c) +
        blocoProximosAtendimentos(futuras) +
        blocoPacientesRecentes() +
        blocoJornadaClinica();
      ligar();
      return;
    }

    if (metodo) metodo.classList.add("hidden");

    /* Ordem: o que tenho hoje, quem precisa de mim, o que vem depois, quem
       chegou, e a jornada. "Primeiros passos" vai para o fim: com carteira
       ja em uso, ele nao pode empurrar as pendencias para baixo. */
    alvo.innerHTML = blocoCabecalho(c, futuras) +
      blocoConsultasHoje(futuras) +
      blocoPendencias(c) +
      blocoRascunhosPendentes() +
      blocoProximosAtendimentos(futuras) +
      blocoPacientesRecentes() +
      blocoJornadaClinica() +
      blocoOnboarding(c);

    ligar();
  }

  function ligar() {
    alvo.querySelectorAll("[data-destino]").forEach(function (b) {
      b.addEventListener("click", function () {
        var destino = b.dataset.destino;
        var pid = b.dataset.paciente;

        if (destino === "novo") {
          if (window.irParaSecao) window.irParaSecao("pacientes");
          var abrir = document.getElementById("btn-abrir-novo");
          if (abrir) abrir.click();
          return;
        }

        if (destino === "nova-consulta") {
          if (window.irParaSecao) window.irParaSecao("agenda");
          var novaConsulta = document.querySelector('[data-novo="consulta"]');
          if (novaConsulta) novaConsulta.click();
          return;
        }

        /* Jornada: precisa de um paciente ativo em foco para os destinos que
           dependem dele (a ficha). Arquivado nao segue a jornada. */
        if (b.dataset.jornada) {
          var foco = window.pacienteAtivoId ? window.pacienteAtivoId() : null;
          if (foco && !ativo(pacientePorId(foco))) {
            if (window.avisar) window.avisar("O paciente em foco está arquivado. Escolha um paciente ativo para seguir a jornada.");
            if (window.irParaSecao) window.irParaSecao("pacientes");
            return;
          }
          if (destino.indexOf("aba:") === 0) {
            if (!foco) {
              if (window.avisar) window.avisar("Escolha um paciente para abrir as ferramentas dele.");
              if (window.irParaSecao) window.irParaSecao("pacientes");
              return;
            }
            pid = foco;
          }
        }

        /* Rodada 08: "Evolução → Abrir" leva ao comparativo de verdade (antes x
           agora, Indice, sistemas, Triade, aplicacoes e datas), que mora no
           HOLOSCAN — e so existe a partir da segunda aplicacao. */
        if (destino === "evolucao") {
          var hist = window.historicoPontuacao ? window.historicoPontuacao() : [];
          if (!window.pacienteAtivoId || !window.pacienteAtivoId()) {
            if (window.avisar) window.avisar("Escolha um paciente para ver a evolução dele.");
            if (window.irParaSecao) window.irParaSecao("pacientes");
            return;
          }
          if (hist.length < 2) {
            if (window.avisar) window.avisar("A evolução aparece a partir da segunda aplicação do HOLOSCAN deste paciente.");
            if (window.irParaSecao) window.irParaSecao("holoscan");
            return;
          }
          if (window.irParaSecao) window.irParaSecao("holoscan");
          if (window.redesenharEvolucao) window.redesenharEvolucao();
          var evo = document.getElementById("holo-evolucao");
          if (evo && evo.scrollIntoView) evo.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }

        /* "Abrir conduta" de um atendimento: a ficha do paciente, com ESSE
           atendimento selecionado, na aba Conduta. */
        if (destino === "atendimento-conduta") {
          if (window.irParaSecao) window.irParaSecao("pacientes");
          if (pid && window.abrirFichaDe) window.abrirFichaDe(pid);
          if (window.AtendimentoAtual && b.dataset.atendimento) window.AtendimentoAtual.selecionarPorId(b.dataset.atendimento);
          var abaC = document.querySelector('[data-aba="conduta"]');
          if (abaC) abaC.click();
          return;
        }

        /* teste real 07/10: o "Ver" de uma consulta abria a ficha; abre a consulta */
        if (destino === "consulta") {
          if (window.irParaSecao) window.irParaSecao("agenda");
          if (!(window.Agenda && window.Agenda.abrirConsulta && window.Agenda.abrirConsulta(b.dataset.consulta)) && pid && window.abrirFichaDe) {
            if (window.irParaSecao) window.irParaSecao("pacientes");
            window.abrirFichaDe(pid);
          }
          return;
        }

        if (destino === "ficha") {
          if (window.irParaSecao) window.irParaSecao("pacientes");
          if (pid && window.abrirFichaDe) window.abrirFichaDe(pid);
          return;
        }

        if (pid && window.definirPacienteAtivo) window.definirPacienteAtivo(pid);

        if (destino.indexOf("aba:") === 0) {
          if (window.irParaSecao) window.irParaSecao("pacientes");
          if (window.abrirFichaDe) window.abrirFichaDe(pid);
          var aba = document.querySelector('[data-aba="' + destino.slice(4) + '"]');
          if (aba) aba.click();
          return;
        }
        if (window.irParaSecao) window.irParaSecao(destino);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    alvo = document.getElementById("dash-trabalho");
    if (!alvo) return;

    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      desenhar();
    };
    desenhar();
  });

  window.redesenharDashboard = desenhar;
})();
