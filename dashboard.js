/* ===========================================================================
   DASHBOARD — o que tenho hoje e em que etapa esta cada paciente
   ===========================================================================

   A primeira tela que a nutricionista ve ao abrir o app (redesenho 12/10,
   igual a referencia aprovada):

     topo claro    "Plataforma clinica", saudacao, frase-resumo e 4 cards:
                   Pacientes ativos, Atendimentos hoje, Proxima consulta,
                   Em acompanhamento; a pinha da marca ao fundo
     Primeiros passos          so enquanto houver passo a fazer
     Agenda de Hoje            consultas marcadas para hoje e atendimentos
                               de hoje sem agendamento
     Acompanhamento dos        a etapa de cada paciente, derivada SO de
     pacientes                 registros que ja existem (ver etapaDe)

   Nada mais fica no Dashboard: proximas consultas, pacientes recentes,
   jornada clinica, rascunhos e atendimentos sem conduta continuam na Agenda,
   em Pacientes/Atendimentos e na ficha.

   "Pendencias" nao e mais o eixo da tela: o fluxo nao trabalha com tarefas
   atrasadas, e ferramenta nao aplicada nao e pendencia. Nada aqui calcula
   regra clinica, prioridade ou gravidade.

   Conta nova (0 pacientes): mostra o metodo junto com orientacao contextual
   que detecta o estado real da conta (perfil, primeiro paciente, HOLOSCAN).
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


  /* "14:00:00" (como vem do banco) vira "14:00". */
  function horaCurta(h) { return h ? String(h).slice(0, 5) : ""; }

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

  /* ---------- etapas da jornada (12/10) ------------------------------------
     "Acompanhamento dos pacientes" substitui "Pendencias": o sistema mostra EM
     QUE ETAPA cada paciente esta, a partir de registros que JA existem. Nada
     aqui e tarefa atrasada, prioridade ou gravidade, e ferramenta nao aplicada
     nao e etapa. Cada etapa sai de um dado real:
       Aguardando anamnese    convite de anamnese pre-consulta enviado/iniciado, nao vencido (anamnesis_invites)
       Anamnese recebida      convite concluido pela paciente e ainda nao usado num atendimento (imported_at vazio)
       HOLOSCAN em andamento  questionario com respostas guardadas e ainda nao salvo (rascunho deste aparelho)
       Resultado pronto       Resultado HOLOS salvo/revisado vigente, ainda sem Resultado Final emitido
       Aguardando retorno     consulta marcada a frente para quem ja teve atendimento (Agenda + encounters)
       Resultado apresentado  Resultado Final emitido do Resultado HOLOS vigente (holos_result_emissions)
     Uma etapa por paciente, nesta ordem de checagem. Paciente sem nenhuma
     delas nao esta "em acompanhamento" (nao entra na lista nem no numero).
     "Pronto para consulta" NAO e usado: o sistema nao registra "anamnese
     revisada" separado do atendimento (ver DECISOES-V1 item 184). */
  var ETAPAS = {
    aguardando_anamnese:   { rotulo: "Aguardando Mapeamento", tom: "aguardando", ordem: 1 },
    anamnese_recebida:     { rotulo: "Mapeamento recebido",   tom: "pronto",     ordem: 2 },
    holoscan_andamento:    { rotulo: "HOLOSCAN em andamento", tom: "andamento",  ordem: 3 },
    resultado_pronto:      { rotulo: "Resultado pronto",      tom: "pronto",     ordem: 4 },
    resultado_apresentado: { rotulo: "Resultado apresentado", tom: "neutro",     ordem: 5 },
    aguardando_retorno:    { rotulo: "Aguardando retorno",    tom: "aguardando", ordem: 6 }
  };
  var LIMITE_LISTA = 6;
  var verTodos = false;

  /* convites, Resultados HOLOS e emissoes de TODA a carteira (o resto ja vem
     carregado pela sincronizacao). So leitura; colunas de estado, nunca o
     conteudo das respostas. */
  var jornada = { convites: [], resultados: [], emissoes: [], carregadoEm: 0, carregando: false };
  function sb() { return window.supabaseClient; }
  function temSupa() { return !!(sb() && window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva()); }
  function carregarJornada(forcar) {
    if (!temSupa()) { jornada = { convites: [], resultados: [], emissoes: [], carregadoEm: 0, carregando: false }; return; }
    /* releitura a cada abertura do Dashboard (no maximo uma a cada 5 s): convite enviado, Resultado salvo ou
       emitido em outra tela aparecem ao voltar, sem dado velho */
    if (jornada.carregando || (!forcar && Date.now() - jornada.carregadoEm < 5000)) return;
    jornada.carregando = true;
    var ler = function (t, cols) {
      return Promise.resolve(sb().from(t).select(cols)).then(function (r) { return r && !r.error && Array.isArray(r.data) ? r.data : []; }, function () { return []; });
    };
    Promise.all([
      ler("anamnesis_invites", "id,patient_id,status,expires_at,created_at,submitted_at,imported_at,revoked_at"),
      ler("holos_results", "id,patient_id,status,superseded_at,saved_at,created_at"),
      ler("holos_result_emissions", "id,patient_id,holos_result_id,emission_number,created_at")
    ]).then(function (rs) {
      jornada = { convites: rs[0], resultados: rs[1], emissoes: rs[2], carregadoEm: Date.now(), carregando: false };
      var sec = document.getElementById("secao-dashboard");
      if (sec && sec.classList.contains("ativa")) desenhar();
    });
  }

  function diaLocal(iso) {
    if (!iso) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso);
    var d = new Date(iso); if (isNaN(d)) return null;
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function maisRecente(lista, campo) {
    return lista.slice().sort(function (a, b) { return String(b[campo] || "").localeCompare(String(a[campo] || "")); })[0] || null;
  }

  function etapaDe(p, futuras) {
    var pid = p.id;
    var P = window.Panorama;
    var d = P && P.doPaciente ? P.doPaciente(pid) : null;
    if (d && d.respondidas > 0) {
      return { chave: "holoscan_andamento", sub: "Questionário: " + d.respondidas + " de " + d.totalPerguntas + " respondidas", data: null, destino: "holoscan" };
    }
    var conv = maisRecente(jornada.convites.filter(function (c) { return c.patient_id === pid && c.status !== "revogado"; }), "created_at");
    if (conv && (conv.status === "enviado" || conv.status === "iniciado") && !(Date.parse(conv.expires_at) < Date.now())) {
      return { chave: "aguardando_anamnese", sub: conv.status === "iniciado" ? "O paciente começou a responder" : "Mapeamento Holístico enviado", data: conv.created_at, destino: "aba:anamnese" };
    }
    if (conv && conv.status === "concluido" && !conv.imported_at) {
      return { chave: "anamnese_recebida", sub: "Respondida pela paciente", data: conv.submitted_at, destino: "aba:anamnese" };
    }
    var res = maisRecente(jornada.resultados.filter(function (r) { return r.patient_id === pid && !r.superseded_at && (r.status === "salvo" || r.status === "revisado"); }), "saved_at");
    var emis = res ? maisRecente(jornada.emissoes.filter(function (e) { return e.holos_result_id === res.id; }), "created_at") : null;
    if (res && !emis) {
      return { chave: "resultado_pronto", sub: "Resultado HOLOS salvo", data: res.saved_at || res.created_at, destino: "resultado" };
    }
    var Ag = window.Agenda, AT = window.AtendimentoAtual;
    var prox = futuras.filter(function (l) { return l.paciente.id === pid && (!Ag || !Ag.aindaVem || Ag.aindaVem(l)); })[0];
    var jaAtendido = AT && AT.doPaciente ? AT.doPaciente(pid).length > 0 : false;
    if (prox && jaAtendido) {
      return { chave: "aguardando_retorno", sub: "Retorno marcado" + (prox.hora ? " às " + horaCurta(prox.hora) : ""), data: prox.data, destino: "consulta", consulta: prox.id };
    }
    if (res && emis) {
      return { chave: "resultado_apresentado", sub: "Resultado Final emitido", data: emis.created_at, destino: "resultado" };
    }
    return null;
  }

  function emAcompanhamento(futuras) {
    return todos().filter(ativo).map(function (p) {
      var e = null;
      try { e = etapaDe(p, futuras); } catch (err) { e = null; }
      return e ? Object.assign({ paciente: p }, e) : null;
    }).filter(Boolean).sort(function (a, b) {
      return ETAPAS[a.chave].ordem - ETAPAS[b.chave].ordem || String(b.data || "").localeCompare(String(a.data || "")) || a.paciente.nome.localeCompare(b.paciente.nome);
    });
  }

  function hojeTotais(futuras) {
    var hj = hojeISO();
    var consultas = futuras.filter(function (l) { return l.data === hj; });
    /* 12/10 (bug 10e): atendimento feito hoje sem agendamento tambem conta no dia */
    var AT = window.AtendimentoAtual;
    var semAgenda = AT && AT.todos ? AT.todos().filter(function (e) { return !e.consultation_id && diaLocal(e.occurred_at) === hj; }) : [];
    return { consultas: consultas, semAgenda: semAgenda, total: consultas.length + semAgenda.length };
  }

  /* ---------- icones (traco fino, cor do texto) ---------------------------- */
  var ICONES = {
    pessoa: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    pessoas: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M15.5 14.2A5.5 5.5 0 0 1 21.5 20"/>',
    documento: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
    check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.5 12.2 2.4 2.4 4.6-5"/>',
    barras: '<path d="M6 19v-5M10 19V9M14 19v-7M18 19V5"/>',
    retorno: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
    seta: '<path d="m9 6 6 6-6 6"/>'
  };
  function icone(nome, tam) {
    var t = tam || 20;
    return '<svg width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONES[nome] + "</svg>";
  }
  var ICONE_ETAPA = { aguardando_anamnese: "relogio", anamnese_recebida: "documento", holoscan_andamento: "barras", resultado_pronto: "check", resultado_apresentado: "barras", aguardando_retorno: "retorno" };

  /* ---------- os blocos --------------------------------------------------- */

  /* A pinha da marca como fundo do topo claro (marca d'agua, sem texto), e a citacao da referencia aprovada. */
  var MARCA = '<span class="dash-hero-pinha" aria-hidden="true"></span>' +
    '<blockquote class="dash-hero-citacao"><p>\u201cSa\u00fade integral<br>para uma vida extraordin\u00e1ria.\u201d</p></blockquote>';

  function tile(icn, numero, rotulo, destino, sub) {
    return '<button type="button" class="dash-tile" data-destino="' + destino + '">' +
      '<i class="dash-tile-icone">' + icone(icn, 22) + "</i>" +
      "<b" + (/\//.test(String(numero)) ? ' class="dash-tile-data"' : "") + ">" + numero + "</b><span>" + rotulo + "</span>" +
      (sub ? '<small class="dash-tile-sub">' + sub + "</small>" : "") +
      '<i class="dash-tile-seta">' + icone("seta", 16) + "</i></button>";
  }

  function blocoCabecalho(c, futuras, acomp) {
    var nPac = c ? c.linhas.filter(function (l) { return ativo(l.paciente); }).length : 0;
    var nAcomp = acomp.length;
    var h = hojeTotais(futuras);
    var Ag = window.Agenda;
    var proxima = futuras.filter(function (l) { return !Ag || !Ag.aindaVem || Ag.aindaVem(l); })[0];
    var proxLabel = proxima ? escapar(dataBR(proxima.data)) : "&mdash;";
    var nome = nomeProfissional();
    var frase;
    if (nPac === 0) frase = "Comece cadastrando seu primeiro paciente para usar a plataforma.";
    else if (nAcomp > 0) frase = "Você tem <b>" + nAcomp + (nAcomp === 1 ? " paciente" : " pacientes") + " em acompanhamento</b> na sua carteira" +
      (h.total ? " e <b>" + h.total + (h.total === 1 ? " atendimento" : " atendimentos") + "</b> hoje." : ".");
    else frase = "Você tem <b>" + nPac + (nPac === 1 ? " paciente ativo" : " pacientes ativos") + "</b> na sua carteira" +
      (h.total ? " e <b>" + h.total + (h.total === 1 ? " atendimento" : " atendimentos") + "</b> hoje." : ".");

    return '<div class="dash-hero">' + MARCA +
      '<div class="secao-cabeca dash-cabeca">' +
        '<span class="eyebrow">Plataforma clínica</span>' +
        "<h2>" + saudacao() + ", <em>" + escapar(nome) + "</em></h2>" +
        "<p>" + frase + "</p>" +
        (nPac === 0 ? '<button type="button" class="dash-botao-dourado dash-hero-cta" data-destino="novo">Cadastrar primeiro paciente <span aria-hidden="true">&rarr;</span></button>' : "") +
      "</div>" +
      '<div class="dash-numeros dash-resumo">' +
        tile("pessoa", nPac, "Pacientes ativos", "pacientes") +
        tile("documento", h.total, "Atendimentos hoje", "consultas", h.semAgenda.length ? h.consultas.length + " agendado" + (h.consultas.length === 1 ? "" : "s") + " · " + h.semAgenda.length + " sem agendamento" : "") +
        tile("calendario", proxLabel, "Próxima consulta", "agenda") +
        tile("pessoas", nAcomp, "Em acompanhamento", "acompanhamento") +
      "</div>" +
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

  function blocoAgendaHoje(futuras) {
    var h = hojeTotais(futuras);
    var topo = '<div class="dash-bloco-topo">' +
      '<span class="dash-bloco-icone">' + icone("calendario", 26) + "</span>" +
      '<div class="dash-bloco-titulos"><h3 class="dash-titulo">Agenda de Hoje</h3><p class="dash-sub">Suas consultas e atendimentos do dia</p></div>' +
      '<button type="button" class="dash-botao-contorno" data-destino="agenda">Abrir agenda <span aria-hidden="true">&rarr;</span></button></div>';
    var corpo;
    if (!h.total) {
      corpo = '<div class="dash-vazio-elegante">' +
        '<span class="dash-vazio-icone">' + icone("calendario", 28) + "</span>" +
        "<h4>Nenhuma consulta hoje</h4>" +
        "<p>Que tal aproveitar para revisar seus pacientes<br>ou adiantar seus atendimentos?</p>" +
        '<button type="button" class="dash-botao-dourado" data-destino="nova-consulta">Nova consulta <span aria-hidden="true">&rarr;</span></button></div>';
    } else {
      var AT = window.AtendimentoAtual;
      corpo = '<ul class="dash-pendentes" id="dash-lista-hoje">' +
        h.consultas.map(function (l) { return linhaConsulta(l, horaCurta(l.hora) || "sem horário"); }).join("") +
        h.semAgenda.map(function (e) {
          var p = pacientePorId(e.patient_id); if (!p) return "";
          return '<li class="dash-pendente"><span class="pac-avatar">' + escapar(inicial(p.nome)) + "</span>" +
            '<span class="dash-quem"><b>' + escapar(p.nome) + '</b><span class="dash-porque">' + escapar(AT && AT.rotuloQuando ? AT.rotuloQuando(e) : "hoje") + " &middot; atendimento sem agendamento" + etiquetaArquivado(p) + "</span></span>" +
            '<button type="button" class="dash-ir" data-paciente="' + escapar(p.id) + '" data-destino="ficha">Abrir <span aria-hidden="true">&rarr;</span></button></li>';
        }).join("") + "</ul>";
    }
    return '<div class="dash-bloco dash-painel dash-agenda-hoje" id="dash-agenda-hoje">' + topo + corpo + "</div>";
  }

  function blocoAcompanhamento(acomp) {
    var n = acomp.length;
    var lista = verTodos ? acomp : acomp.slice(0, LIMITE_LISTA);
    var topo = '<div class="dash-bloco-topo">' +
      '<span class="dash-bloco-icone">' + icone("pessoas", 26) + "</span>" +
      '<div class="dash-bloco-titulos"><h3 class="dash-titulo">Acompanhamento dos pacientes</h3><p class="dash-sub">Acompanhe o progresso dos seus pacientes em cada etapa da jornada.</p></div>' +
      (n > LIMITE_LISTA ? '<button type="button" class="dash-botao-contorno" data-acao="ver-todos" aria-expanded="' + verTodos + '">' + (verTodos ? "Mostrar menos" : "Ver todos (" + n + ")") + ' <span aria-hidden="true">&rarr;</span></button>' : "") +
      "</div>";
    var corpo;
    if (!n) {
      corpo = '<div class="dash-vazio-elegante dash-vazio-baixo">' +
        '<span class="dash-vazio-icone">' + icone("pessoas", 28) + "</span>" +
        "<h4>Nenhum paciente com etapa em andamento</h4>" +
        "<p>Aqui aparecem os Mapeamentos Holísticos enviados e recebidos, o HOLOSCAN em andamento,<br>os Resultados prontos ou apresentados e os retornos marcados.</p></div>";
    } else {
      corpo = '<ul class="dash-acomp-lista" id="dash-lista-acompanhamento">' + lista.map(function (a) {
        var E = ETAPAS[a.chave];
        var dt = diaLocal(a.data);
        return '<li><button type="button" class="dash-acomp" data-etapa="' + a.chave + '" data-paciente="' + escapar(a.paciente.id) + '" data-destino="' + escapar(a.destino) + '"' +
            (a.consulta ? ' data-consulta="' + escapar(a.consulta) + '"' : "") + ' aria-label="' + escapar(a.paciente.nome + ": " + E.rotulo) + '">' +
          '<span class="pac-avatar">' + escapar(inicial(a.paciente.nome)) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(a.paciente.nome) + '</b><span class="dash-porque">' + escapar(a.sub) + "</span></span>" +
          '<span class="dash-acomp-data">' + (dt ? escapar(dataBR(dt)) : "") + "</span>" +
          '<span class="dash-status tom-' + E.tom + '">' + icone(ICONE_ETAPA[a.chave], 14) + escapar(E.rotulo) + "</span>" +
          '<i class="dash-acomp-seta">' + icone("seta", 16) + "</i></button></li>";
      }).join("") + "</ul>";
    }
    return '<div class="dash-bloco dash-painel dash-acompanhamento" id="dash-acompanhamento">' + topo + corpo + "</div>";
  }

  /* Etapa 0 da V1: os tiles "reavaliacoes vencidas" e "Indice HOLOS medio"
     sairam. Correcao do dashboard (pos-6.5): o bloco "N pacientes / N com
     HOLOSCAN" tambem saiu — repetia o cabecalho com outro numero (contava os
     arquivados). "O terreno da sua carteira" so ocupava espaco com o aviso
     de recurso desligado: fica escondido ate existir regra homologada de
     agregacao no Pacote Metodologico. */

  /* ---------- desenhar ---------------------------------------------------- */

  function desenhar() {
    if (!alvo || !window.Panorama) return;

    var c;
    try { c = window.Panorama.carteira(); }
    catch (e) { alvo.innerHTML = ""; return; }

    var futuras = [];
    try { futuras = consultasFuturas(); }
    catch (e) { futuras = []; }

    carregarJornada();
    var acomp = emAcompanhamento(futuras);
    var metodo = document.getElementById("dash-metodo");

    /* 12/10 (pedido da usuaria): o Dashboard e so o topo (Plataforma clinica) e os dois blocos — Agenda de Hoje e
       Acompanhamento dos pacientes, igual a referencia aprovada. Proximas consultas, pacientes recentes, jornada
       clinica, rascunhos e atendimentos sem conduta sairam desta tela (continuam na Agenda, em Pacientes/
       Atendimentos e na ficha). "Primeiros passos" tambem saiu: vai virar janela dos primeiros acessos.
       Conta nova (0 pacientes) mostra tambem a apresentacao do metodo. */
    if (metodo) metodo.classList.toggle("hidden", c.total !== 0);
    alvo.innerHTML = blocoCabecalho(c, futuras, acomp) +
      '<div class="dash-colunas">' + blocoAgendaHoje(futuras) + blocoAcompanhamento(acomp) + "</div>";
    ligar();
  }

  function ligar() {
    var vt = alvo.querySelector('[data-acao="ver-todos"]');
    if (vt) vt.addEventListener("click", function () { verTodos = !verTodos; desenhar(); var bl = document.getElementById("dash-acompanhamento"); if (bl && bl.scrollIntoView) bl.scrollIntoView({ block: "nearest" }); });
    alvo.querySelectorAll("[data-destino]").forEach(function (b) {
      b.addEventListener("click", function () {
        var destino = b.dataset.destino;
        var pid = b.dataset.paciente;

        if (destino === "acompanhamento") {
          var bloco = document.getElementById("dash-acompanhamento");
          if (bloco && bloco.scrollIntoView) bloco.scrollIntoView({ behavior: "smooth", block: "start" });
          var primeiro = bloco && bloco.querySelector(".dash-acomp, [data-acao]");
          if (primeiro && primeiro.focus) primeiro.focus({ preventScroll: true });
          return;
        }

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
    /* troca de conta (ou saida): o que foi lido da conta anterior nao pode aparecer nem por um instante */
    if (window.HoloAuth && window.HoloAuth.aoMudarEstado) window.HoloAuth.aoMudarEstado(function () {
      jornada = { convites: [], resultados: [], emissoes: [], carregadoEm: 0, carregando: false };
      verTodos = false;
    });

    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      desenhar();
    };
    desenhar();
  });

  window.redesenharDashboard = desenhar;
})();
