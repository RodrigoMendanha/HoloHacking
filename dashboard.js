/* ===========================================================================
   DASHBOARD — o que tenho hoje e em que etapa esta cada paciente
   ===========================================================================

   A primeira tela que a nutricionista ve ao abrir o app (redesenho 12/10):

     topo claro    saudacao, frase-resumo e 4 cards: Pacientes ativos,
                   Atendimentos hoje, Proxima consulta, Em acompanhamento
     Agenda de Hoje            consultas marcadas para hoje e atendimentos
                               de hoje sem agendamento
     Acompanhamento dos        a etapa de cada paciente, derivada SO de
     pacientes                 registros que ja existem (ver etapaDe)
     registros em aberto       HOLOSCAN nao salvo no servidor (aviso
                               tecnico), rascunhos, atendimentos sem conduta
     depois                    proximas consultas, pacientes recentes,
                               jornada clinica, primeiros passos

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

  function nomeDe(pid) { var p = pacientePorId(pid); return p ? p.nome : "Paciente"; }

  /* "14:00:00" (como vem do banco) vira "14:00". */
  function horaCurta(h) { return h ? String(h).slice(0, 5) : ""; }

  /* V1, Etapa 2: registro OPERACIONAL objetivo — atendimento registrado sem
     conduta consolidada (rascunho nao conta), so de pacientes ativos. Nao e
     julgamento clinico nem etapa da jornada. */
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
    aguardando_anamnese:   { rotulo: "Aguardando anamnese",   tom: "aguardando", ordem: 1 },
    anamnese_recebida:     { rotulo: "Anamnese recebida",     tom: "pronto",     ordem: 2 },
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
    if (jornada.carregando || (!forcar && Date.now() - jornada.carregadoEm < 20000)) return;
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
      return { chave: "aguardando_anamnese", sub: conv.status === "iniciado" ? "A paciente começou a responder" : "Anamnese pré-consulta enviada", data: conv.created_at, destino: "aba:anamnese" };
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

  /* Folhagem discreta no canto do topo claro (desenho proprio, sem imagem externa). */
  var FOLHAS = '<svg class="dash-hero-folhas" viewBox="0 0 320 260" aria-hidden="true" focusable="false">' +
    '<g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">' +
    '<path d="M300 250C250 190 236 120 262 20"/><path d="M262 20c-40 26-56 70-40 112 34-12 50-56 40-112z"/>' +
    '<path d="M250 120c-52 4-86 34-92 80 46 2 80-28 92-80z"/><path d="M270 150c40-20 52-60 38-104-34 18-48 58-38 104z"/>' +
    '<path d="M282 210c-46-10-84 6-104 44 42 12 82-6 104-44z"/></g>' +
    '<g fill="currentColor" opacity=".35"><path d="M262 20c-40 26-56 70-40 112 34-12 50-56 40-112z"/><path d="M270 150c40-20 52-60 38-104-34 18-48 58-38 104z"/></g></svg>';

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

    return '<div class="dash-hero">' + FOLHAS +
      '<div class="secao-cabeca dash-cabeca">' +
        '<span class="eyebrow">Plataforma clínica</span>' +
        "<h2>" + saudacao() + ", <em>" + escapar(nome) + "</em></h2>" +
        "<p>" + frase + "</p>" +
      "</div>" +
      '<div class="dash-numeros dash-resumo">' +
        tile("pessoa", nPac, "Pacientes ativos", "pacientes") +
        tile("documento", h.total, "Atendimentos hoje", "consultas", h.semAgenda.length ? h.consultas.length + " agendado" + (h.consultas.length === 1 ? "" : "s") + " · " + h.semAgenda.length + " sem agendamento" : "") +
        tile("calendario", proxLabel, "Próxima consulta", "agenda") +
        tile("pessoas", nAcomp, "Em acompanhamento", "acompanhamento") +
      "</div>" +
      '<div class="dash-acoes-rapidas">' +
        '<button type="button" class="dash-acao" data-destino="novo">Novo paciente</button>' +
        '<button type="button" class="dash-acao" data-destino="holoscan">Abrir HOLOSCAN</button>' +
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
        "<p>Aqui aparecem as anamneses enviadas e recebidas, o HOLOSCAN em andamento,<br>os Resultados prontos ou apresentados e os retornos marcados.</p></div>";
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

  /* Atendimentos sem conduta salva (id dash-sem-conduta): registro em aberto,
     nao etapa da jornada. "Abrir" leva ao atendimento, na aba Conduta. */
  function listaSemConduta() {
    var A = window.AtendimentoAtual, Cd = window.Conduta;
    var pend = semConduta();
    if (!pend.length) return "";
    return '<div class="dash-bloco dash-bloco-compacto" id="dash-sem-conduta">' +
      '<h3 class="dash-titulo">Atendimentos sem conduta salva <em>' + pend.length + "</em></h3>" +
      '<p class="dash-sub">Atendimentos registrados cuja conduta ainda não foi salva.</p>' +
      '<ul class="dash-pendentes">' + pend.slice(0, 5).map(function (e) {
        return '<li class="dash-pendente"><span class="pac-avatar">' + escapar(inicial(nomeDe(e.patient_id))) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(nomeDe(e.patient_id)) + "</b><span class=\"dash-porque\">" + escapar(A.rotuloQuando(e)) +
          (Cd.rascunhoDe(e.id) ? " · conduta em rascunho" : " · sem conduta") + "</span></span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(e.patient_id) + '" data-atendimento="' + escapar(e.id) +
          '" data-destino="atendimento-conduta">Abrir conduta <span aria-hidden="true">&rarr;</span></button></li>';
      }).join("") + "</ul></div>";
  }

  /* V1, Etapa 3: registros OPERACIONAIS em aberto — rascunhos de anamnese/conduta nao
     consolidados e relatorios em rascunho. Contagens, nao julgamentos; nada
     de Indice medio ou metodologia nao homologada. */
  function blocoRascunhos() {
    var An = window.Anamnese, Cd = window.Conduta, R = window.Relatorios;
    var ativos = todos().filter(ativo);
    var nAn = An ? An.doPaciente ? ativos.reduce(function (n, p) { return n + An.doPaciente(p.id).filter(function (a) { return a.status === "rascunho"; }).length; }, 0) : 0 : 0;
    var nCd = Cd ? ativos.reduce(function (n, p) { return n + Cd.doPaciente(p.id).filter(function (c) { return c.status === "rascunho"; }).length; }, 0) : 0;
    var rel = (R && R.todosRascunhos ? R.todosRascunhos() : []).filter(function (r) { return ativo(pacientePorId(r.patient_id)); });
    if (!nAn && !nCd && !rel.length) return "";
    return '<div class="dash-bloco dash-bloco-compacto" id="dash-rascunhos">' +
      '<h3 class="dash-titulo">Rascunhos em aberto <em>' + (nAn + nCd + rel.length) + "</em></h3>" +
      '<p class="dash-sub">' + [nAn ? nAn + (nAn === 1 ? " anamnese em rascunho" : " anamneses em rascunho") : "",
        nCd ? nCd + (nCd === 1 ? " conduta em rascunho" : " condutas em rascunho") : "",
        rel.length ? rel.length + (rel.length === 1 ? " relatório em rascunho" : " relatórios em rascunho") : ""].filter(Boolean).join(" · ") + ". Nada disso entra na timeline, na Evolução nem na HOLOS AI.</p>" +
      (rel.length ? '<ul class="dash-pendentes" id="dash-relatorios-rascunho">' + rel.slice(0, 5).map(function (r) {
        return '<li class="dash-pendente"><span class="pac-avatar">' + escapar(inicial(nomeDe(r.patient_id))) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(nomeDe(r.patient_id)) + "</b><span class=\"dash-porque\">relatório em rascunho · " + escapar(r.title || "Relatório clínico") + "</span></span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(r.patient_id) + '" data-destino="aba:relatorio">Abrir <span aria-hidden="true">&rarr;</span></button></li>';
      }).join("") + "</ul>" : "") + "</div>";
  }

  /* 12/10: "Precisa de voce" saiu (o fluxo nao e lista de tarefas atrasadas).
     Fica so o aviso TECNICO de HOLOSCAN calculado e nao salvo no servidor
     (panorama.js, peso 0): e risco de perder dado, nao etapa clinica. */
  function blocoNaoSalvos(c) {
    var linhas = c ? c.linhas.filter(function (l) { return ativo(l.paciente) && l.alertas.some(function (a) { return a.peso === 0; }); }) : [];
    if (!linhas.length) return "";
    return '<div class="dash-bloco dash-bloco-compacto dash-aviso-tecnico" id="dash-nao-salvos">' +
      '<h3 class="dash-titulo">HOLOSCAN não salvo no servidor <em>' + linhas.length + "</em></h3>" +
      '<p class="dash-sub">O mapa foi calculado neste aparelho e ainda não está guardado na sua conta.</p>' +
      '<ul class="dash-pendentes">' + linhas.map(function (l) {
        var a = l.alertas.filter(function (x) { return x.peso === 0; })[0];
        return '<li class="dash-pendente"><span class="pac-avatar">' + escapar(inicial(l.paciente.nome)) + "</span>" +
          '<span class="dash-quem"><b>' + escapar(l.paciente.nome) + '</b><span class="dash-porque">' + escapar(a.curto) + "</span></span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(l.paciente.id) + '" data-destino="' + escapar(a.acao) + '">' + escapar(a.botao) + ' <span aria-hidden="true">&rarr;</span></button></li>';
      }).join("") + "</ul></div>";
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

    carregarJornada();
    var acomp = emAcompanhamento(futuras);
    var metodo = document.getElementById("dash-metodo");

    if (c.total === 0) {
      if (metodo) metodo.classList.remove("hidden");
      alvo.innerHTML = blocoCabecalho(c, futuras, acomp) +
        blocoOnboarding(c) +
        blocoProximosAtendimentos(futuras) +
        blocoPacientesRecentes() +
        blocoJornadaClinica();
      ligar();
      return;
    }

    if (metodo) metodo.classList.add("hidden");

    /* Ordem: o resumo (topo claro); o dia e a jornada de cada paciente lado a
       lado; os registros em aberto; o que vem depois, quem chegou, a jornada
       clinica. "Primeiros passos" vai para o fim. */
    alvo.innerHTML = blocoCabecalho(c, futuras, acomp) +
      '<div class="dash-colunas">' + blocoAgendaHoje(futuras) + blocoAcompanhamento(acomp) + "</div>" +
      blocoNaoSalvos(c) +
      '<div class="dash-grade-baixo">' + blocoRascunhos() + listaSemConduta() + blocoProximosAtendimentos(futuras) + blocoPacientesRecentes() + "</div>" +
      blocoJornadaClinica() +
      blocoOnboarding(c);

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
