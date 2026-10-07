/* ===========================================================================
   AGENDA — o calendário do consultório
   ===========================================================================

   A primeira versão desta tela era uma lista de retornos calculados: última
   aplicação + 28 dias, e um campo de data para quem quisesse marcar outro dia.
   Resolvia a pergunta "quem sumiu" e não resolvia a que vem logo depois dela,
   que é "quando eu atendo essa pessoa" — porque uma data solta não tem hora,
   não tem duração, não convive com as outras do mesmo dia e não sabe que a
   terça à tarde está bloqueada.

   Agora são duas camadas sobre o mesmo calendário:

     CONSULTAS   o AGENDAMENTO: paciente, dia, hora, duração. É compromisso
                 administrativo — não é o atendimento clínico. O atendimento
                 (encounters, atendimento.js) só nasce por "Iniciar
                 atendimento", nunca por marcar, abrir ou pela hora chegar.
     BLOQUEIOS   o tempo que não está disponível — almoço, aula, viagem

   V1, Etapa 1: desmarcar NÃO apaga (cancelled_at + motivo; a grade esconde
   canceladas por padrão, "Ver canceladas" mostra) e reagendar preserva o
   original (RPC reagendar_consulta: novo agendamento com rescheduled_from_id,
   original cancelado com rescheduled_to_id).

   As duas são dado que alguém escreveu. A terceira camada que existiu aqui
   (SUGESTÕES: o retorno de 4 semanas calculado a partir da última aplicação)
   foi retirada na Etapa 0 da V1: o Documento Mestre (§29, §33) diz que o
   prazo de acompanhamento é definido pela profissional, sem retorno
   universal automático. O calendário mostra só o que alguém marcou.

   A data que a versão anterior guardava (holohacking.agenda) vira consulta na
   primeira carga — ver migrar(). Ninguém perde o que já tinha marcado.

   O que NÃO está aqui: "Conectar Google Calendar". Isso pede OAuth, um
   servidor para guardar o token e uma chave de API. Este app não tem nenhum
   dos três: roda inteiro no navegador. Um botão que abre e não conecta seria
   pior do que botão nenhum.
   =========================================================================== */

(function () {
  "use strict";

  var CAIXA_ANTIGA = "holohacking.agenda";

  /* A faixa de horas desenhada. Não é o horário de ninguém: é o intervalo em
     que a grade existe. */
  var HORA_INICIO = 7;
  var HORA_FIM = 21;
  var ALTURA_HORA = 52;          // px por hora, igual em Dia e Semana

  var TIPOS = ["Primeira consulta", "Retorno", "Reavaliação HOLOSCAN", "Online"];
  var DURACOES = [30, 45, 60, 90];

  var DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
               "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MESES_CURTO = ["jan", "fev", "mar", "abr", "mai", "jun",
                     "jul", "ago", "set", "out", "nov", "dez"];

  var alvo = null;
  var vista = "semana";          // dia | semana | mes
  var foco = hoje();             // a data que ancora o período mostrado
  var filtros = { consultas: true, bloqueios: true, canceladas: false };
  var consultas = [];
  var bloqueios = [];
  var editando = null;           // {tipo:"consulta"|"bloqueio", dado:{...}} ou null
  var ligado = false;

  /* ---------- datas, sem biblioteca -------------------------------------- */

  function hoje() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function iso(d) {
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }
  function deIso(s) {
    var p = String(s || "").split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  function somar(d, n) {
    var x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }
  function somarMes(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
  }
  /** Domingo da semana de d: o calendário brasileiro começa no domingo. */
  function inicioDaSemana(d) {
    return somar(d, -d.getDay());
  }
  function mesmoDia(a, b) { return iso(a) === iso(b); }
  var dataBR = window.dataBR;

  function minutos(hhmm) {
    var p = String(hhmm || "0:0").split(":");
    return Number(p[0]) * 60 + Number(p[1]);
  }
  function paraHora(min) {
    return String(Math.floor(min / 60)).padStart(2, "0") + ":" +
           String(min % 60).padStart(2, "0");
  }

  var escapar = window.escapar;

  /* ---------- ler e gravar ------------------------------------------------ */

  function banco() { return window.DadosRouter || window.DadosLocais || null; }

  function carregar() {
    var b = banco();
    if (!b) return Promise.resolve();
    return Promise.all([
      Promise.resolve(b.from("consultas").select("*").order("data", { ascending: true })),
      Promise.resolve(b.from("bloqueios").select("*").order("data", { ascending: true }))
    ]).then(function (r) {
      /* erro nao e vazio: se a leitura falhou, fica o que ja se tinha */
      if (!r[0] || !r[0].error) consultas = ((r[0] && r[0].data) || []).map(horasCurtas);
      if (!r[1] || !r[1].error) bloqueios = ((r[1] && r[1].data) || []).map(horasCurtas);
    });
  }

  /* O banco devolve a coluna time como "14:00:00"; a tela inteira (agenda,
     dashboard, ficha) fala "14:00". Normaliza uma vez, na leitura. */
  function horasCurtas(c) {
    if (!c) return c;
    ["hora", "inicio", "fim"].forEach(function (k) {
      if (typeof c[k] === "string" && /^\d{2}:\d{2}:\d{2}/.test(c[k])) c[k] = c[k].slice(0, 5);
    });
    return c;
  }

  /* A versão anterior guardava {pid: {data, nota}} numa caixa do localStorage:
     um retorno marcado sem hora nenhuma. Vira consulta às 9h — e a caixa some,
     para a migração não rodar de novo e duplicar tudo. */
  function migrar() {
    var cru;
    try { cru = JSON.parse(localStorage.getItem(CAIXA_ANTIGA) || "null"); }
    catch (e) { cru = null; }
    if (!cru || !Object.keys(cru).length) return Promise.resolve(false);

    var b = banco();
    if (!b) return Promise.resolve(false);

    var novas = Object.keys(cru).filter(function (pid) {
      return cru[pid] && cru[pid].data;
    }).map(function (pid) {
      return Promise.resolve(b.from("consultas").insert({
        paciente_id: pid, data: cru[pid].data, hora: "09:00",
        duracao: 60, tipo: "Retorno",
        nota: cru[pid].nota || "Retorno marcado na versão anterior da agenda."
      }).select().single());
    });

    return Promise.all(novas).then(function () {
      try { localStorage.removeItem(CAIXA_ANTIGA); } catch (e) { /* idem */ }
      return carregar();
    }).then(function () { return true; });
  }

  function gravarConsulta(d) {
    var b = banco();
    var campos = {
      paciente_id: d.paciente_id, data: d.data, hora: d.hora,
      duracao: Number(d.duracao) || 60, tipo: d.tipo, nota: d.nota || ""
    };
    return Promise.resolve(d.id
      ? b.from("consultas").update(campos).eq("id", d.id)
      : b.from("consultas").insert(campos).select().single());
  }

  function gravarBloqueio(d) {
    var b = banco();
    var campos = {
      data: d.data, inicio: d.inicio, fim: d.fim,
      dia_todo: !!d.dia_todo, motivo: d.motivo || ""
    };
    return Promise.resolve(d.id
      ? b.from("bloqueios").update(campos).eq("id", d.id)
      : b.from("bloqueios").insert(campos).select().single());
  }

  function apagar(tabela, id) {
    return Promise.resolve(banco().from(tabela).delete().eq("id", id));
  }

  /* ---------- quem é quem ------------------------------------------------- */

  function nomeDe(pid) {
    var todos = (window.pacientesTodos && window.pacientesTodos()) || [];
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === pid) return todos[i].nome;
    }
    return "paciente removido";
  }

  /* ---------- as três camadas de um dia ----------------------------------- */

  /** Agendamento vigente: nao cancelado (o reagendado tambem fica cancelado,
      com rescheduled_to_id apontando para o novo). */
  function vigente(c) { return !!c && !c.cancelled_at; }
  function vigentes() { return consultas.filter(vigente); }

  function consultasDe(dia) {
    if (!filtros.consultas) return [];
    return consultas.filter(function (c) { return c.data === dia && (vigente(c) || filtros.canceladas); })
      .sort(function (a, b) { return minutos(a.hora) - minutos(b.hora); });
  }

  function bloqueiosDe(dia) {
    if (!filtros.bloqueios) return [];
    return bloqueios.filter(function (b) { return b.data === dia; })
      .sort(function (a, b) { return minutos(a.inicio) - minutos(b.inicio); });
  }

  function vazioNoPeriodo(dias) {
    return dias.every(function (d) {
      return consultasDe(d).length === 0 && bloqueiosDe(d).length === 0;
    });
  }

  /* ---------- o período mostrado ------------------------------------------ */

  function diasDoPeriodo() {
    if (vista === "dia") return [iso(foco)];
    if (vista === "semana") {
      var d0 = inicioDaSemana(foco);
      return [0, 1, 2, 3, 4, 5, 6].map(function (i) { return iso(somar(d0, i)); });
    }
    // mes: da primeira celula da grade ate a ultima, seis semanas cheias
    var primeiro = new Date(foco.getFullYear(), foco.getMonth(), 1);
    var inicio = inicioDaSemana(primeiro);
    var saida = [];
    for (var i = 0; i < 42; i++) saida.push(iso(somar(inicio, i)));
    return saida;
  }

  function rotuloDoPeriodo() {
    if (vista === "dia") {
      return DIAS[foco.getDay()] + ", " + foco.getDate() + " de " + MESES[foco.getMonth()];
    }
    if (vista === "semana") {
      var a = inicioDaSemana(foco), b = somar(a, 6);
      return a.getDate() + " " + MESES_CURTO[a.getMonth()] + " – " +
             b.getDate() + " " + MESES_CURTO[b.getMonth()];
    }
    return MESES[foco.getMonth()] + " de " + foco.getFullYear();
  }

  function andar(passo) {
    if (vista === "dia") foco = somar(foco, passo);
    else if (vista === "semana") foco = somar(foco, passo * 7);
    else foco = somarMes(foco, passo);
    desenhar();
  }

  /* ---------- o cabeçalho -------------------------------------------------- */

  function ico(d, t) {
    return '<svg width="' + (t || 15) + '" height="' + (t || 15) + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + d + "</svg>";
  }

  function cabecalho() {
    return '<div class="secao-cabeca cal-cabeca">' +
        "<div>" +
          '<span class="eyebrow">Atendimento &mdash; calendário</span>' +
          "<h2>Sua <em>agenda</em></h2>" +
        "</div>" +
        '<div class="cal-acoes">' +
          '<button type="button" class="perf-botao" data-novo="bloqueio">' +
            ico('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M9 15l6-6"/>') +
            " Bloquear</button>" +
          '<button type="button" class="btn-verde" data-novo="consulta">+ Nova consulta</button>' +
        "</div>" +
      "</div>";
  }

  function navegacao() {
    var botoes = [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]];
    return '<div class="cal-barra">' +
      '<div class="cal-andar">' +
        '<button type="button" class="cal-seta" data-andar="-1" aria-label="Período anterior">&lsaquo;</button>' +
        '<b class="cal-rotulo">' + escapar(rotuloDoPeriodo()) + "</b>" +
        '<button type="button" class="cal-seta" data-andar="1" aria-label="Próximo período">&rsaquo;</button>' +
        '<button type="button" class="perf-botao cal-hoje" data-hoje="1">Hoje</button>' +
        '<input type="date" id="cal-data" value="' + iso(foco) + '" aria-label="Ir para a data">' +
      "</div>" +
      '<div class="cal-vistas" role="group" aria-label="Como ver o período">' +
        botoes.map(function (b) {
          return '<button type="button" class="cal-vista' + (vista === b[0] ? " ativa" : "") +
            '" data-vista="' + b[0] + '" aria-pressed="' + (vista === b[0]) + '">' +
            b[1] + "</button>";
        }).join("") +
      "</div></div>";
  }

  function chips() {
    var quais = [
      { id: "consultas", nome: "Consultas" },
      { id: "bloqueios", nome: "Bloqueios" },
      { id: "canceladas", nome: "Ver canceladas" }
    ];
    return '<div class="cal-chips" role="group" aria-label="O que mostrar">' +
      quais.map(function (q) {
        var on = filtros[q.id];
        return '<button type="button" class="cal-chip ' + q.id + (on ? " ativo" : "") +
          '" data-camada="' + q.id + '" aria-pressed="' + on + '">' +
          '<span class="cal-chip-marca" aria-hidden="true"></span>' +
          escapar(q.nome) + "</button>";
      }).join("") +
      '<span class="cal-chips-nota">Agendamento não é atendimento: o atendimento clínico ' +
      "só existe depois de \"Iniciar atendimento\".</span></div>";
  }

  /* ---------- a grade de horas (Dia e Semana) ----------------------------- */

  function faixaDeHoras() {
    var linhas = "";
    for (var h = HORA_INICIO; h <= HORA_FIM; h++) {
      linhas += '<span class="cal-hora">' + String(h).padStart(2, "0") + ":00</span>";
    }
    return '<div class="cal-horas">' + linhas + "</div>";
  }

  /** Onde o evento cai dentro da coluna, em px, a partir de HORA_INICIO. */
  function posicao(inicioMin, duracaoMin) {
    var topo = (inicioMin - HORA_INICIO * 60) / 60 * ALTURA_HORA;
    var alt = Math.max(duracaoMin / 60 * ALTURA_HORA, 22);
    return "top:" + topo + "px;height:" + alt + "px";
  }

  /* Correcao (auditoria Agenda): eventos simultaneos (consulta x bloqueio,
     consulta x consulta) eram desenhados um em cima do outro. Cada grupo de
     eventos que se tocam divide a largura da coluna em faixas. */
  function distribuir(itens) {
    itens.sort(function (a, b) { return a.ini - b.ini || b.fim - a.fim; });
    var grupo = [], fimGrupo = -1;
    function fechar() {
      var cols = [];
      grupo.forEach(function (it) {
        var k = 0;
        while (cols[k] !== undefined && cols[k] > it.ini) k++;
        cols[k] = it.fim; it.col = k;
      });
      grupo.forEach(function (it) { it.ncol = cols.length; });
      grupo = []; fimGrupo = -1;
    }
    itens.forEach(function (it) {
      if (grupo.length && it.ini >= fimGrupo) fechar();
      grupo.push(it); fimGrupo = Math.max(fimGrupo, it.fim);
    });
    if (grupo.length) fechar();
  }

  function faixaHorizontal(it) {
    if (!it || !(it.ncol > 1)) return "";
    return ";left:calc(" + (it.col * 100 / it.ncol) + "% + 2px);right:auto;width:calc(" + (100 / it.ncol) + "% - 4px)";
  }

  function eventosDoDia(dia) {
    var html = "";
    var pos = {};
    var itens = [];
    bloqueiosDe(dia).filter(function (b) { return !b.dia_todo; }).forEach(function (b) {
      var ini = minutos(b.inicio); itens.push(pos["b" + b.id] = { ini: ini, fim: ini + Math.max(minutos(b.fim) - ini, 30) });
    });
    consultasDe(dia).forEach(function (c) {
      var ini = minutos(c.hora); itens.push(pos["c" + c.id] = { ini: ini, fim: ini + (Number(c.duracao) || 60) });
    });
    distribuir(itens);

    bloqueiosDe(dia).filter(function (b) { return !b.dia_todo; }).forEach(function (b) {
      var dur = minutos(b.fim) - minutos(b.inicio);
      html += '<button type="button" class="cal-evento bloqueio" ' +
        'style="' + posicao(minutos(b.inicio), Math.max(dur, 30)) + faixaHorizontal(pos["b" + b.id]) + '" ' +
        'data-abrir="bloqueio" data-id="' + escapar(b.id) + '">' +
        "<b>" + escapar(b.motivo || "Bloqueado") + "</b>" +
        "<span>" + escapar(b.inicio + "–" + b.fim) + "</span>" +
        "</button>";
    });

    consultasDe(dia).forEach(function (c) {
      html += '<button type="button" class="cal-evento consulta' + (vigente(c) ? "" : " cancelada") + '" ' +
        'style="' + posicao(minutos(c.hora), Number(c.duracao) || 60) + faixaHorizontal(pos["c" + c.id]) + '" ' +
        'data-abrir="consulta" data-id="' + escapar(c.id) + '">' +
        "<b>" + escapar(nomeDe(c.paciente_id)) + "</b>" +
        "<span>" + escapar(c.hora) + " &middot; " + escapar(c.tipo || "Consulta") + "</span>" +
        "</button>";
    });

    return html;
  }

  /** O que não tem hora: bloqueio de dia inteiro e retorno sugerido. */
  function semHoraDe(dia) {
    var itens = bloqueiosDe(dia).filter(function (b) { return b.dia_todo; })
      .map(function (b) {
        return '<button type="button" class="cal-faixa-item bloqueio" ' +
          'data-abrir="bloqueio" data-id="' + escapar(b.id) + '">' +
          escapar(b.motivo || "Bloqueado") + "</button>";
      });

    return itens.join("");
  }

  function grade(dias) {
    var cabeca = dias.map(function (d) {
      var dt = deIso(d);
      return '<div class="cal-cabeca-dia' + (mesmoDia(dt, hoje()) ? " hoje" : "") + '">' +
        "<span>" + DIAS[dt.getDay()] + "</span><b>" + dt.getDate() + "</b></div>";
    }).join("");

    var colunas = dias.map(function (d) {
      var dt = deIso(d);
      return '<div class="cal-coluna' + (mesmoDia(dt, hoje()) ? " hoje" : "") +
        '" data-dia="' + d + '">' + eventosDoDia(d) + "</div>";
    }).join("");

    var semHora = dias.map(semHoraDe);
    var faixa = semHora.some(Boolean)
      ? '<div class="cal-faixa">' +
          '<span class="cal-faixa-rotulo">sem hora</span>' +
          '<div class="cal-faixa-dias">' + semHora.map(function (conteudo, i) {
            return '<div class="cal-faixa-dia" data-dia="' + dias[i] + '">' +
              conteudo + "</div>";
          }).join("") + "</div>" +
        "</div>"
      : "";

    var altura = (HORA_FIM - HORA_INICIO) * ALTURA_HORA;

    return '<div class="cal-grade ' + vista + '">' +
      '<div class="cal-grade-cabeca"><span class="cal-canto"></span>' +
        '<div class="cal-cabeca-dias">' + cabeca + "</div></div>" +
      faixa +
      '<div class="cal-grade-corpo" style="--alt-hora:' + ALTURA_HORA + 'px">' +
        faixaDeHoras() +
        '<div class="cal-colunas" style="height:' + altura + 'px">' + colunas + "</div>" +
      "</div></div>";
  }

  /* ---------- a grade do mês ---------------------------------------------- */

  function gradeDoMes(dias) {
    var mesAtual = foco.getMonth();
    var celulas = dias.map(function (d) {
      var dt = deIso(d);
      var cs = consultasDe(d), bs = bloqueiosDe(d);

      var itens = bs.map(function (b) {
        return '<button type="button" class="cal-pilula bloqueio" data-abrir="bloqueio" ' +
          'data-id="' + escapar(b.id) + '">' +
          escapar(b.dia_todo ? "dia todo" : b.inicio) + " " +
          escapar(b.motivo || "Bloqueado") + "</button>";
      }).concat(cs.map(function (c) {
        return '<button type="button" class="cal-pilula consulta' + (vigente(c) ? "" : " cancelada") + '" data-abrir="consulta" ' +
          'data-id="' + escapar(c.id) + '">' + escapar(c.hora) + " " +
          escapar(nomeDe(c.paciente_id)) + "</button>";
      }));

      return '<div class="cal-celula' + (dt.getMonth() !== mesAtual ? " fora" : "") +
        (mesmoDia(dt, hoje()) ? " hoje" : "") + '" data-dia="' + d + '">' +
        '<span class="cal-numero">' + dt.getDate() + "</span>" +
        itens.slice(0, 3).join("") +
        (itens.length > 3 ? '<span class="cal-mais">+' + (itens.length - 3) + "</span>" : "") +
        "</div>";
    }).join("");

    return '<div class="cal-mes">' +
      '<div class="cal-mes-cabeca">' + DIAS.map(function (d) {
        return "<span>" + d + "</span>";
      }).join("") + "</div>" +
      '<div class="cal-mes-corpo">' + celulas + "</div></div>";
  }

  /* ---------- hoje no topo (semana/mes) ----------------------------------- */

  function resumoHoje() {
    if (vista === "dia") return "";
    var hj = iso(hoje());
    var cs = consultasDe(hj);
    var bs = bloqueiosDe(hj).filter(function (b) { return !b.dia_todo; });
    if (cs.length === 0 && bs.length === 0) return "";

    var itens = cs.map(function (c) {
      /* era um span com cara de botao: agora abre a consulta */
      return '<button type="button" class="cal-hoje-item consulta" data-abrir="consulta" data-id="' + escapar(c.id) + '">' +
        '<b>' + escapar(c.hora) + '</b> ' + escapar(nomeDe(c.paciente_id)) +
        ' <i>' + escapar(c.tipo || "") + '</i></button>';
    });

    return '<div class="cal-hoje-resumo">' +
      '<span class="cal-hoje-titulo">' +
        ico('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', 14) +
        ' Hoje &mdash; ' + cs.length + (cs.length === 1 ? ' consulta' : ' consultas') +
      '</span>' +
      '<div class="cal-hoje-lista">' + itens.join("") + '</div>' +
      '</div>';
  }

  /* ---------- o vazio ------------------------------------------------------ */

  function vazio() {
    var quando = vista === "dia" ? "neste dia"
               : vista === "semana" ? "esta semana" : "neste mês";
    return '<div class="cal-vazio">' +
      '<span class="cal-vazio-ico">' +
        ico('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>', 26) +
      "</span>" +
      "<b>Nenhuma consulta " + quando + "</b>" +
      "<p>A agenda está livre neste período.</p>" +
      '<button type="button" class="btn-verde" data-novo="consulta">+ Criar consulta</button>' +
      "</div>";
  }

  /* ---------- o formulário -------------------------------------------------- */

  function formulario() {
    if (!editando) return "";
    return editando.tipo === "consulta" ? formConsulta() : formBloqueio();
  }

  function formConsulta() {
    var c = editando.dado;
    var pacientes = (window.pacientesTodos && window.pacientesTodos()) || [];

    if (!pacientes.length) {
      return '<div class="cal-form">' +
        '<div class="cal-form-topo"><h3>Nova consulta</h3>' +
          '<button type="button" class="perf-tirar" data-fechar="1">fechar</button></div>' +
        '<p class="dash-vazio">Não há paciente cadastrado. Consulta é com alguém — ' +
        "cadastre a pessoa primeiro.</p>" +
        '<div class="perf-foto-acoes">' +
          '<button type="button" class="perf-botao" data-ir-pacientes="1">Ir para Pacientes</button>' +
        "</div></div>";
    }

    var cancelada = !!c.cancelled_at;
    var atendimentoDe = c.id && window.AtendimentoAtual ? window.AtendimentoAtual.porAgendamento(c.id) : null;
    /* Correcao (auditoria Agenda): so pacientes ATIVOS; consulta nova comeca
       sem paciente escolhido (a nao ser que venha da ficha de alguem); na
       edicao o paciente fica travado (trocar de paciente e outra consulta). */
    var ativos = pacientes.filter(function (p) { return p.status !== "inativo"; });
    var atualP = c.paciente_id ? pacientes.filter(function (p) { return p.id === c.paciente_id; })[0] : null;
    if (atualP && ativos.indexOf(atualP) < 0) ativos = [atualP].concat(ativos);
    var opcoesPac = (c.id ? "" : '<option value=""' + (c.paciente_id ? "" : " selected") + ">Selecione o paciente</option>") +
      ativos.map(function (p) {
        return '<option value="' + escapar(p.id) + '"' + (p.id === c.paciente_id ? " selected" : "") + ">" +
          escapar(p.nome) + (p.status === "inativo" ? " (arquivado)" : "") + "</option>";
      }).join("");
    var avisoCancelada = cancelada
      ? '<p class="perf-ajuda cal-cancelada-aviso">Agendamento cancelado' +
        (c.cancellation_reason ? " &mdash; " + escapar(c.cancellation_reason) : "") +
        (c.rescheduled_to_id ? ' &middot; <button type="button" class="btn-fantasma" data-abrir="consulta" data-id="' +
          escapar(c.rescheduled_to_id) + '">ver o novo agendamento</button>' : "") +
        ". Fica no histórico; não é apagado.</p>"
      : "";
    var origem = c.rescheduled_from_id
      ? '<p class="perf-ajuda">Reagendado a partir de <button type="button" class="btn-fantasma" data-abrir="consulta" data-id="' +
        escapar(c.rescheduled_from_id) + '">um agendamento anterior</button>.</p>'
      : "";
    return '<div class="cal-form">' +
      '<div class="cal-form-topo">' +
        "<h3>" + (c.id ? (cancelada ? "Consulta cancelada" : "Editar consulta") : "Nova consulta") + "</h3>" +
        '<button type="button" class="perf-tirar" data-fechar="1">fechar</button>' +
      "</div>" + avisoCancelada + origem +
      (atendimentoDe && !cancelada ? '<p class="perf-ajuda">Esta consulta já tem um atendimento registrado: ' +
        "não pode ser desmarcada nem reagendada.</p>" : "") +
      '<div class="perf-grade">' +
        '<div class="perf-campo"><label for="cf-paciente">Paciente</label>' +
          '<select id="cf-paciente"' + (c.id ? " disabled" : "") + ">" + opcoesPac + "</select></div>" +
        '<div class="perf-campo"><label for="cf-tipo">Tipo</label>' +
          '<select id="cf-tipo">' + TIPOS.map(function (t) {
            return "<option" + (t === c.tipo ? " selected" : "") + ">" + t + "</option>";
          }).join("") + "</select></div>" +
        '<div class="perf-campo"><label for="cf-data">Dia</label>' +
          '<input type="date" id="cf-data" value="' + escapar(c.data) + '"></div>' +
        '<div class="perf-campo"><label for="cf-hora">Hora</label>' +
          '<input type="time" id="cf-hora" value="' + escapar(c.hora) + '" step="300"></div>' +
        '<div class="perf-campo"><label for="cf-duracao">Duração</label>' +
          '<select id="cf-duracao">' + DURACOES.map(function (d) {
            return '<option value="' + d + '"' +
              (Number(c.duracao) === d ? " selected" : "") + ">" + d + " minutos</option>";
          }).join("") + "</select></div>" +
      "</div>" +
      '<div class="perf-campo largo"><label for="cf-nota">Observação</label>' +
        '<input type="text" id="cf-nota" value="' + escapar(c.nota || "") +
        '" placeholder="O que precisa lembrar sobre este atendimento"></div>' +
      '<p class="perf-aviso" id="cal-aviso"></p>' +
      '<div class="cal-form-acoes">' +
        (c.id && !cancelada && !atendimentoDe ? '<button type="button" class="perf-tirar forte" data-cancelar="consulta">Desmarcar</button>' : "") +
        (c.id && !cancelada && !atendimentoDe ? '<button type="button" class="perf-botao" data-reagendar="consulta" disabled title="Mude o dia ou a hora para reagendar">Reagendar</button>' : "") +
        (c.id && !cancelada && c.paciente_id
          ? (atendimentoDe
              ? '<button type="button" class="btn-dourado" data-abrir-atendimento-id="' + escapar(atendimentoDe.id) + '">Abrir atendimento</button>'
              : '<button type="button" class="btn-dourado" data-iniciar-atendimento="' + escapar(c.id) + '">Iniciar atendimento</button>')
          : "") +
        (!cancelada ? '<button type="button" class="btn-verde" data-salvar="consulta">' +
          (c.id ? "Salvar" : "Marcar consulta") + "</button>" : "") +
      "</div></div>";
  }

  function formBloqueio() {
    var b = editando.dado;
    return '<div class="cal-form">' +
      '<div class="cal-form-topo">' +
        "<h3>" + (b.id ? "Editar bloqueio" : "Bloquear um horário") + "</h3>" +
        '<button type="button" class="perf-tirar" data-fechar="1">fechar</button>' +
      "</div>" +
      '<p class="perf-ajuda">Tempo que não está disponível para atender: almoço, aula, ' +
      "viagem. Não é consulta de ninguém &mdash; é o contrário disso.</p>" +
      '<div class="perf-grade">' +
        '<div class="perf-campo"><label for="bf-data">Dia</label>' +
          '<input type="date" id="bf-data" value="' + escapar(b.data) + '"></div>' +
        '<div class="perf-campo"><label for="bf-inicio">Das</label>' +
          '<input type="time" id="bf-inicio" value="' + escapar(b.inicio) +
          '" step="300"' + (b.dia_todo ? " disabled" : "") + "></div>" +
        '<div class="perf-campo"><label for="bf-fim">Até</label>' +
          '<input type="time" id="bf-fim" value="' + escapar(b.fim) +
          '" step="300"' + (b.dia_todo ? " disabled" : "") + "></div>" +
      "</div>" +
      '<label class="cal-dia-todo"><input type="checkbox" id="bf-dia-todo"' +
        (b.dia_todo ? " checked" : "") + "> Dia todo</label>" +
      '<div class="perf-campo largo"><label for="bf-motivo">Motivo</label>' +
        '<input type="text" id="bf-motivo" value="' + escapar(b.motivo || "") +
        '" placeholder="Almoço, aula, viagem..."></div>' +
      '<p class="perf-aviso" id="cal-aviso"></p>' +
      '<div class="cal-form-acoes">' +
        (b.id ? '<button type="button" class="perf-tirar forte" data-apagar="bloqueio">Remover</button>' : "") +
        '<button type="button" class="btn-verde" data-salvar="bloqueio">' +
          (b.id ? "Salvar" : "Bloquear") + "</button>" +
      "</div></div>";
  }

  /* ---------- desenhar ----------------------------------------------------- */

  function desenhar() {
    if (!alvo) return;
    var dias = diasDoPeriodo();

    var corpo;
    if (vista === "mes") corpo = gradeDoMes(dias);
    else if (vazioNoPeriodo(dias)) corpo = vazio();
    else corpo = grade(dias);

    alvo.innerHTML = cabecalho() + navegacao() + chips() + resumoHoje() + formulario() + corpo;

    marcarNoMenu();
    ligar();
    rolarParaOTrabalho();
  }

  /* A grade começa às 7h, mas quem abre quer ver o dia de trabalho. Sem isto,
     a primeira coisa na tela é a madrugada vazia. */
  function rolarParaOTrabalho() {
    var corpo = alvo.querySelector(".cal-grade-corpo");
    if (corpo) corpo.scrollTop = Math.max(0, (8 - HORA_INICIO) * ALTURA_HORA - 8);
  }

  /** O número ao lado de "Agenda" no menu: quantas consultas há HOJE. É o que
      a pessoa quer de relance, e não some quando o mês está cheio. */
  function marcarNoMenu() {
    var tag = document.getElementById("nav-agenda-venc");
    if (!tag) return;
    var n = vigentes().filter(function (c) { return c.data === iso(hoje()); }).length;
    tag.textContent = n;
    tag.classList.toggle("hidden", n === 0);
  }

  /* ---------- abrir os formulários ----------------------------------------- */

  /* Hora sugerida: 09:00, ou — se o dia e hoje e 09:00 ja passou — a
     proxima hora cheia (antes todo salvamento rapido caia em "no passado"). */
  function horaSugerida(dia) {
    if (dia !== iso(hoje())) return "09:00";
    var agora = new Date();
    var prox = Math.min(agora.getHours() + 1, 23);
    return prox * 60 > minutos("09:00") ? String(prox).padStart(2, "0") + ":00" : "09:00";
  }

  function novaConsulta(dia, hora, pid) {
    var ativo = pid && !(window.pacienteArquivado && window.pacienteArquivado(pid)) ? pid : "";
    var diaC = dia || (deIso(iso(foco)) < hoje() ? iso(hoje()) : iso(foco));
    /* depois das 23h nao ha "proxima hora cheia" hoje: sem dia escolhido, a
       sugestao vai para amanha 09:00 (antes sugeria 23:00, ja no passado) */
    if (!dia && !hora && diaC === iso(hoje()) && new Date().getHours() >= 23) {
      var am = hoje(); am.setDate(am.getDate() + 1); diaC = iso(am);
    }
    editando = { tipo: "consulta", dado: {
      paciente_id: ativo,
      data: diaC, hora: hora || horaSugerida(diaC),
      duracao: 60, tipo: pid ? "Reavaliação HOLOSCAN" : "Retorno", nota: ""
    } };
    desenhar();
  }

  function novoBloqueio(dia, hora) {
    editando = { tipo: "bloqueio", dado: {
      data: dia || iso(foco), inicio: hora || "12:00",
      fim: paraHora(minutos(hora || "12:00") + 60), dia_todo: false, motivo: ""
    } };
    desenhar();
  }

  function abrir(tipo, id) {
    var lista = tipo === "consulta" ? consultas : bloqueios;
    var achado = lista.filter(function (x) { return x.id === id; })[0];
    if (!achado) return;
    editando = { tipo: tipo, dado: Object.assign({}, achado) };
    desenhar();
  }

  function avisar(texto) {
    var el = document.getElementById("cal-aviso");
    if (el) { el.textContent = texto; el.className = "perf-aviso ruim"; }
    else if (window.avisar) window.avisar(texto);
  }

  /* ---------- salvar -------------------------------------------------------- */

  function salvarConsulta(ev) {
    var btnSalvar = ev && ev.target ? ev.target.closest("[data-salvar]") : null;
    if (btnSalvar && window.travarBotao && !window.travarBotao(btnSalvar, "Salvando…")) return;
    var d = editando.dado;
    var pid = document.getElementById("cf-paciente");
    if (!pid) { if (btnSalvar) window.destravarBotao(btnSalvar); return; }
    /* Correcao (auditoria Agenda): mudar dia/hora de uma consulta existente e
       REAGENDAR (o original fica no historico, ligado ao novo) — "Salvar"
       alterava no lugar, sem rastro. */
    if (d.id) {
      var nd = document.getElementById("cf-data").value, nh = document.getElementById("cf-hora").value;
      if (nd !== d.data || String(nh).slice(0, 5) !== String(d.hora).slice(0, 5)) {
        if (btnSalvar) window.destravarBotao(btnSalvar);
        reagendarAtual();
        return;
      }
    }
    if (!d.id) d.paciente_id = pid.value;
    if (!d.paciente_id) { avisar("Escolha o paciente da consulta."); if (btnSalvar) window.destravarBotao(btnSalvar); return; }
    if (window.pacienteArquivado && window.pacienteArquivado(d.paciente_id)) {
      avisar(window.MSG_ARQUIVADO);
      if (btnSalvar) window.destravarBotao(btnSalvar);
      return;
    }
    d.tipo = document.getElementById("cf-tipo").value;
    d.data = document.getElementById("cf-data").value;
    d.hora = document.getElementById("cf-hora").value;
    d.duracao = Number(document.getElementById("cf-duracao").value);
    d.nota = document.getElementById("cf-nota").value.trim();

    if (!d.data || !d.hora) { avisar("Informe o dia e a hora."); if (btnSalvar) window.destravarBotao(btnSalvar); return; }

    /* Rodada 08: o conflito de horario e a consulta no passado sao
       perguntados ANTES de gravar — antes, o aviso de choque vinha depois,
       com a consulta ja marcada. Continua sendo possivel marcar mesmo assim
       (as vezes e de proposito), mas agora e uma decisao, nao uma surpresa. */
    var a1 = minutos(d.hora), a2 = a1 + (d.duracao || 60);
    var choque = vigentes().filter(function (c) {
      if (c.id === d.id || c.data !== d.data) return false;
      var b1 = minutos(c.hora), b2 = b1 + (Number(c.duracao) || 60);
      return a1 < b2 && b1 < a2;
    })[0];
    var bloqueio = bloqueios.filter(function (b) {
      if (b.data !== d.data) return false;
      if (b.dia_todo) return true;
      if (!b.inicio || !b.fim) return false;
      return a1 < minutos(b.fim) && minutos(b.inicio) < a2;
    })[0];
    var agora = new Date();
    var passado = d.data < iso(hoje()) ||
      (d.data === iso(hoje()) && a1 < agora.getHours() * 60 + agora.getMinutes());
    var original = d.id ? consultas.filter(function (c) { return c.id === d.id; })[0] : null;
    var mudouQuando = !original || original.data !== d.data || original.hora !== d.hora;

    var perguntas = [];
    if (choque) perguntas.push("Já há consulta às " + String(choque.hora).slice(0, 5) +
      (choque.paciente_id ? " (" + nomeDe(choque.paciente_id) + ")" : "") + " neste dia — os horários se sobrepõem.");
    if (bloqueio) perguntas.push(bloqueio.dia_todo ? "Este dia está bloqueado na agenda" +
        (bloqueio.motivo ? " (" + bloqueio.motivo + ")" : "") + "."
      : "O horário cai num bloqueio da agenda (" + String(bloqueio.inicio).slice(0, 5) + "–" +
        String(bloqueio.fim).slice(0, 5) + ").");
    if (passado && mudouQuando) perguntas.push("A data e a hora ficam no passado (" + dataBR(d.data) +
      " às " + d.hora + ") — isto registra uma consulta que já aconteceu.");

    var decidir = !perguntas.length || !window.abrirModalConfirmar
      ? Promise.resolve("confirmar")
      : window.abrirModalConfirmar({
          titulo: choque || bloqueio ? "Conflito de horário" : "Consulta no passado",
          corpo: perguntas.map(function (p) { return "<p>" + escapar(p) + "</p>"; }).join("") +
                 "<p>Deseja salvar mesmo assim?</p>",
          botaoConfirmar: "Salvar mesmo assim",
          classeConfirmar: "btn-verde"
        });

    decidir.then(function (resp) {
      if (resp !== "confirmar") return null;
      return gravarConsulta(d).then(function (r) {
        if (r && r.error) {
          avisar(window.mensagemHumana ? window.mensagemHumana(r.error)
                                       : "Não foi possível salvar a consulta. Nada foi gravado; tente de novo.");
          return;
        }
        editando = null;
        foco = deIso(d.data);
        return carregar().then(function () {
          desenhar();
          if (window.avisar) window.avisar("Consulta marcada para " + dataBR(d.data) + " às " + d.hora + ".");
        });
      });
    }).finally(function () { if (btnSalvar) window.destravarBotao(btnSalvar); });
  }

  function salvarBloqueio(ev) {
    var btnSalvar = ev && ev.target ? ev.target.closest("[data-salvar]") : null;
    if (btnSalvar && window.travarBotao && !window.travarBotao(btnSalvar, "Salvando…")) return;
    var d = editando.dado;
    d.data = document.getElementById("bf-data").value;
    d.dia_todo = document.getElementById("bf-dia-todo").checked;
    d.inicio = document.getElementById("bf-inicio").value;
    d.fim = document.getElementById("bf-fim").value;
    d.motivo = document.getElementById("bf-motivo").value.trim();

    if (!d.data) { avisar("Informe o dia."); if (btnSalvar) window.destravarBotao(btnSalvar); return; }
    /* dia todo: sem horario — manda null, nunca a hora que sobrou no campo */
    if (d.dia_todo) { d.inicio = null; d.fim = null; }
    if (!d.dia_todo) {
      if (!d.inicio || !d.fim) { avisar("Informe o início e o fim."); if (btnSalvar) window.destravarBotao(btnSalvar); return; }
      if (minutos(d.fim) <= minutos(d.inicio)) {
        avisar("O fim tem que ser depois do início.");
        if (btnSalvar) window.destravarBotao(btnSalvar);
        return;
      }
    }

    /* Correcao (auditoria Agenda): a mesma checagem de conflito da consulta,
       ao contrario — bloqueio por cima de consulta marcada pergunta antes. */
    var bi = d.dia_todo ? 0 : minutos(d.inicio), bf = d.dia_todo ? 24 * 60 : minutos(d.fim);
    var afetadas = vigentes().filter(function (c) {
      if (c.data !== d.data) return false;
      var c1 = minutos(c.hora), c2 = c1 + (Number(c.duracao) || 60);
      return bi < c2 && c1 < bf;
    });
    var decidir = !afetadas.length || !window.abrirModalConfirmar
      ? Promise.resolve("confirmar")
      : window.abrirModalConfirmar({
          titulo: "Conflito de horário",
          corpo: "<p>O bloqueio cobre " + (afetadas.length === 1 ? "uma consulta marcada" : afetadas.length + " consultas marcadas") + ":</p>" +
                 afetadas.map(function (c) { return "<p>" + escapar(String(c.hora).slice(0, 5) + " — " + nomeDe(c.paciente_id)) + "</p>"; }).join("") +
                 "<p>As consultas não são desmarcadas. Deseja salvar o bloqueio mesmo assim?</p>",
          botaoConfirmar: "Salvar mesmo assim",
          classeConfirmar: "btn-verde"
        });

    decidir.then(function (resp) {
      if (resp !== "confirmar") return null;
      return gravarBloqueio(d);
    }).then(function (r) {
      if (r === null) return;
      if (r && r.error) {
        avisar(window.mensagemHumana ? window.mensagemHumana(r.error)
                                     : "Não foi possível salvar o bloqueio. Nada foi gravado; tente de novo.");
        return;
      }
      editando = null;
      foco = deIso(d.data);
      return carregar().then(desenhar);
    }).finally(function () { if (btnSalvar) window.destravarBotao(btnSalvar); });
  }

  /* V1, Etapa 1: desmarcar e CANCELAR, nunca apagar. O agendamento fica no
     historico com cancelled_at e o motivo; a grade o esconde por padrao. */
  function cancelarAtual() {
    var d = editando.dado;
    if (!d.id || d.cancelled_at) return;
    /* Correcao (auditoria Agenda): desmarcar uma consulta com atendimento
       registrado deixava o atendimento apontando para consulta cancelada. */
    if (window.AtendimentoAtual && window.AtendimentoAtual.porAgendamento(d.id)) {
      avisar("Esta consulta já tem um atendimento registrado e não pode ser desmarcada. Abra o atendimento para continuar.");
      return;
    }
    var pergunta = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({
          titulo: "Desmarcar consulta",
          corpo: "<p>" + escapar(nomeDe(d.paciente_id)) + " &mdash; " + escapar(dataBR(d.data) + " às " + String(d.hora).slice(0, 5)) + "</p>" +
                 '<div class="perf-campo largo"><label for="cal-motivo">Motivo (opcional)</label>' +
                 '<input type="text" id="cal-motivo" placeholder="Paciente pediu, imprevisto..."></div>' +
                 "<p>O agendamento fica no histórico como cancelado; nada é apagado.</p>",
          botaoConfirmar: "Desmarcar",
          classeConfirmar: "btn-perigo"
        })
      : Promise.resolve(confirm("Desmarcar esta consulta?") ? "confirmar" : null);
    pergunta.then(function (resp) {
      if (resp !== "confirmar") return;
      var motivoEl = document.getElementById("cal-motivo");
      var motivo = motivoEl && motivoEl.value.trim() ? motivoEl.value.trim() : null;
      return Promise.resolve(banco().from("consultas").update({
        cancelled_at: new Date().toISOString(), cancellation_reason: motivo
      }).eq("id", d.id)).then(function (r) {
        if (r && r.error) {
          avisar(window.mensagemHumana ? window.mensagemHumana(r.error)
                                       : "Não foi possível desmarcar agora. Nada mudou; tente de novo.");
          return;
        }
        editando = null;
        return carregar().then(function () {
          desenhar();
          if (window.avisar) window.avisar("Consulta desmarcada. O agendamento fica no histórico.");
        });
      });
    });
  }

  /* Reagendar: o original e preservado (cancelado, com rescheduled_to_id) e
     nasce um novo agendamento com rescheduled_from_id — numa so operacao no
     servidor (RPC). Sem sessao (desenvolvimento), as duas escritas locais. */
  function reagendarAtual() {
    var d = editando.dado;
    if (!d.id || d.cancelled_at) return;
    if (window.AtendimentoAtual && window.AtendimentoAtual.porAgendamento(d.id)) {
      avisar("Esta consulta já tem um atendimento registrado e não pode ser reagendada.");
      return;
    }
    var novaData = document.getElementById("cf-data").value;
    var novaHora = document.getElementById("cf-hora").value;
    var duracao = Number(document.getElementById("cf-duracao").value) || d.duracao;
    var tipo = document.getElementById("cf-tipo").value;
    var nota = document.getElementById("cf-nota").value.trim();
    if (!novaData || !novaHora) { avisar("Informe o novo dia e a nova hora."); return; }
    if (novaData === d.data && String(novaHora).slice(0, 5) === String(d.hora).slice(0, 5)) {
      avisar("Para reagendar, escolha um dia ou hora diferente. Para mudar só a observação, use Salvar.");
      return;
    }
    var pergunta = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({
          titulo: "Reagendar consulta",
          corpo: "<p>" + escapar(nomeDe(d.paciente_id)) + ": de <b>" + escapar(dataBR(d.data) + " às " + String(d.hora).slice(0, 5)) +
                 "</b> para <b>" + escapar(dataBR(novaData) + " às " + novaHora) + "</b>.</p>" +
                 '<div class="perf-campo largo"><label for="cal-motivo">Motivo (opcional)</label>' +
                 '<input type="text" id="cal-motivo" placeholder="Paciente pediu, imprevisto..."></div>' +
                 "<p>O agendamento original fica no histórico, ligado ao novo.</p>",
          botaoConfirmar: "Reagendar",
          classeConfirmar: "btn-verde"
        })
      : Promise.resolve("confirmar");
    pergunta.then(function (resp) {
      if (resp !== "confirmar") return;
      var motivoEl = document.getElementById("cal-motivo");
      var motivo = motivoEl && motivoEl.value.trim() ? motivoEl.value.trim() : null;
      var temSupa = window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
      var feito;
      if (temSupa) {
        var TIPO = { "Primeira consulta": "primeira_consulta", "Retorno": "retorno",
                     "Reavaliação HOLOSCAN": "reavaliacao_holoscan", "Online": "online" };
        feito = Promise.resolve(window.supabaseClient.rpc("reagendar_consulta", {
          p_consultation_id: d.id, p_data: novaData, p_hora: novaHora,
          p_duracao_min: duracao, p_tipo: TIPO[tipo] || tipo, p_nota: nota, p_motivo: motivo
        }));
      } else {
        var b = banco();
        feito = Promise.resolve(b.from("consultas").insert({
          paciente_id: d.paciente_id, data: novaData, hora: novaHora, duracao: duracao,
          tipo: tipo, nota: nota, rescheduled_from_id: d.id
        }).select().single()).then(function (r) {
          if (!r || r.error || !r.data) return r || { error: new Error("sem resposta") };
          return Promise.resolve(b.from("consultas").update({
            cancelled_at: new Date().toISOString(), cancellation_reason: motivo || "reagendada",
            rescheduled_to_id: r.data.id
          }).eq("id", d.id)).then(function (r2) { return r2 && r2.error ? r2 : { data: r.data.id, error: null }; });
        });
      }
      return feito.then(function (r) {
        if (!r || r.error) {
          avisar(window.mensagemHumana ? window.mensagemHumana(r && r.error)
                                       : "Não foi possível reagendar agora. Nada mudou; tente de novo.");
          return;
        }
        editando = null;
        foco = deIso(novaData);
        return carregar().then(function () {
          desenhar();
          if (window.avisar) window.avisar("Consulta reagendada para " + dataBR(novaData) + " às " + novaHora + ". O agendamento anterior ficou no histórico.");
        });
      });
    });
  }

  function apagarAtual(tipo) {
    var d = editando.dado;
    if (!d.id) return;
    if (tipo === "consulta") { cancelarAtual(); return; }
    /* modal do app no lugar do confirm() nativo (que travava a pagina) */
    var perguntar = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({ titulo: "Remover bloqueio", corpo: "<p>Remover este bloqueio da agenda? Esta ação não pode ser desfeita.</p>",
          botaoConfirmar: "Remover", classeConfirmar: "btn-perigo" })
      : Promise.resolve(confirm("Remover este bloqueio?") ? "confirmar" : null);
    perguntar.then(function (resp) { if (resp !== "confirmar") return null; return apagar("bloqueios", d.id); }).then(function (r) {
      if (r === null) return;
      if (r && r.error) {
        avisar(window.mensagemHumana ? window.mensagemHumana(r.error)
                                     : "Não foi possível remover agora. Nada mudou; tente de novo.");
        return;
      }
      editando = null;
      return carregar().then(desenhar);
    });
  }

  /* ---------- ligar --------------------------------------------------------- */

  function ligar() {
    if (ligado) return;
    ligado = true;

    /* Reagendar so fica ativo quando o dia ou a hora mudam */
    alvo.addEventListener("input", function (ev) {
      if (!ev.target || (ev.target.id !== "cf-data" && ev.target.id !== "cf-hora")) return;
      var r = alvo.querySelector("[data-reagendar]");
      if (!r || !editando || !editando.dado) return;
      var d = editando.dado;
      r.disabled = document.getElementById("cf-data").value === d.data &&
        String(document.getElementById("cf-hora").value).slice(0, 5) === String(d.hora).slice(0, 5);
    });

    alvo.addEventListener("click", function (ev) {
      var andarBtn = ev.target.closest("[data-andar]");
      if (andarBtn) { andar(Number(andarBtn.dataset.andar)); return; }

      if (ev.target.closest("[data-hoje]")) { foco = hoje(); desenhar(); return; }

      var v = ev.target.closest("[data-vista]");
      if (v) { vista = v.dataset.vista; desenhar(); return; }

      var camada = ev.target.closest("[data-camada]");
      if (camada) {
        filtros[camada.dataset.camada] = !filtros[camada.dataset.camada];
        desenhar();
        return;
      }

      var novo = ev.target.closest("[data-novo]");
      if (novo) {
        // Quem chega aqui do cabecalho da ficha ou da aba Consultas ja tem
        // um paciente ativo — o formulario nasce com ele, em vez de cair no
        // primeiro nome da lista e pedir para escolher de novo.
        if (novo.dataset.novo === "consulta") {
          /* dentro da Agenda a consulta nova comeca sem paciente escolhido;
             quem vem da ficha usa Agenda.novaConsultaPara(pid) */
          novaConsulta(null, null, null);
        } else novoBloqueio();
        return;
      }

      var abrirBtn = ev.target.closest("[data-abrir]");
      if (abrirBtn) { abrir(abrirBtn.dataset.abrir, abrirBtn.dataset.id); return; }

      if (ev.target.closest("[data-fechar]")) { editando = null; desenhar(); return; }

      var salvar = ev.target.closest("[data-salvar]");
      if (salvar) {
        if (salvar.dataset.salvar === "consulta") salvarConsulta(ev);
        else salvarBloqueio(ev);
        return;
      }

      var apagarBtn = ev.target.closest("[data-apagar]");
      if (apagarBtn) { apagarAtual(apagarBtn.dataset.apagar); return; }

      if (ev.target.closest("[data-cancelar]")) { cancelarAtual(); return; }
      if (ev.target.closest("[data-reagendar]")) { reagendarAtual(); return; }

      /* V1, Etapa 1: o atendimento clinico so nasce aqui, por gesto explicito,
         depois de confirmar paciente, agendamento de origem e data/hora. */
      var iniciar = ev.target.closest("[data-iniciar-atendimento]");
      if (iniciar) {
        var cons = consultas.filter(function (c) { return c.id === iniciar.dataset.iniciarAtendimento; })[0];
        if (!cons || !window.AtendimentoAtual) return;
        var jaExiste = window.AtendimentoAtual.porAgendamento(cons.id);
        if (jaExiste) {          // nunca duplicar em silencio
          window.AtendimentoAtual.selecionar(jaExiste);
          if (window.levarParaFicha) window.levarParaFicha("ficha", cons.paciente_id);
          return;
        }
        window.AtendimentoAtual.abrirDialogo({ patient_id: cons.paciente_id, consulta: cons }).then(function (e) {
          if (!e) return;
          editando = null;
          desenhar();
          if (window.levarParaFicha) window.levarParaFicha("ficha", cons.paciente_id);
        });
        return;
      }
      var abrirAtId = ev.target.closest("[data-abrir-atendimento-id]");
      if (abrirAtId) {
        if (window.AtendimentoAtual && window.AtendimentoAtual.selecionarPorId(abrirAtId.dataset.abrirAtendimentoId)) {
          var e2 = window.AtendimentoAtual.atual();
          if (e2 && window.levarParaFicha) window.levarParaFicha("ficha", e2.patient_id);
        }
        return;
      }

      if (ev.target.closest("[data-ir-pacientes]")) {
        if (window.irParaSecao) window.irParaSecao("pacientes");
        return;
      }

      var abrirAt = ev.target.closest("[data-abrir-atendimento]");
      if (abrirAt) {
        var pid = abrirAt.dataset.abrirAtendimento;
        if (pid && window.levarParaFicha) window.levarParaFicha("ficha", pid);
        return;
      }

      /* Clicar no vazio marca ali. Na grade a hora sai de onde o clique caiu;
         no mês não há hora nenhuma, então vale o padrão. */
      var celula = ev.target.closest(".cal-celula");
      if (celula) { novaConsulta(celula.dataset.dia); return; }

      var faixaDia = ev.target.closest(".cal-faixa-dia");
      if (faixaDia) { novaConsulta(faixaDia.dataset.dia); return; }

      var coluna = ev.target.closest(".cal-coluna");
      if (coluna) {
        var caixa = coluna.getBoundingClientRect();
        var min = HORA_INICIO * 60 +
                  Math.floor((ev.clientY - caixa.top) / ALTURA_HORA * 60);
        novaConsulta(coluna.dataset.dia, paraHora(Math.round(min / 30) * 30));
      }
    });

    alvo.addEventListener("change", function (ev) {
      if (ev.target.id === "cal-data") {
        foco = deIso(ev.target.value);
        desenhar();
        return;
      }
      if (ev.target.id === "bf-dia-todo" && editando) {
        editando.dado.dia_todo = ev.target.checked;
        /* rodada 08: redesenhar nao pode perder a data ja escolhida */
        var campoData = document.getElementById("bf-data");
        if (campoData && campoData.value) editando.dado.data = campoData.value;
        editando.dado.inicio = document.getElementById("bf-inicio").value;
        editando.dado.fim = document.getElementById("bf-fim").value;
        editando.dado.motivo = document.getElementById("bf-motivo").value;
        desenhar();
      }
    });
  }

  /* ---------- o que o resto do app pode perguntar --------------------------- */

  /* Teste real 07/10: "Proxima consulta" mostrava a de hoje as 10:00 depois
     de ela acontecer. Ainda vem = data futura, ou hoje com horario por vir, e
     sem atendimento ja iniciado a partir dela. */
  function aindaVem(c) {
    var deHoje = iso(hoje());
    if (c.data < deHoje) return false;
    if (window.AtendimentoAtual && window.AtendimentoAtual.porAgendamento && window.AtendimentoAtual.porAgendamento(c.id)) return false;
    if (c.data > deHoje) return true;
    var agora = new Date();
    return minutos(c.hora) > agora.getHours() * 60 + agora.getMinutes();
  }

  window.Agenda = {
    aindaVem: aindaVem,
    /** A próxima consulta de alguém, daqui para a frente. */
    proxima: function (pid) {
      return vigentes().filter(function (c) {
        return c.paciente_id === pid && aindaVem(c);
      }).sort(function (a, b) {
        return a.data.localeCompare(b.data) || minutos(a.hora) - minutos(b.hora);
      })[0] || null;
    },
    doDia: function (dia) {
      return vigentes().filter(function (c) { return c.data === dia; })
        .sort(function (a, b) { return minutos(a.hora) - minutos(b.hora); });
    },
    /** Os agendamentos VIGENTES de alguém, do mais recente para o mais antigo.
        opcoes.incluirCanceladas: true traz tambem os cancelados/reagendados
        (historico). */
    todas: function (pid, opcoes) {
      var comCanceladas = !!(opcoes && opcoes.incluirCanceladas);
      return consultas.filter(function (c) { return c.paciente_id === pid && (comCanceladas || vigente(c)); })
        .sort(function (a, b) {
          return b.data.localeCompare(a.data) || minutos(b.hora) - minutos(a.hora);
        });
    },
    /** Os agendamentos cancelados/reagendados de alguém (historico). */
    canceladas: function (pid) {
      return consultas.filter(function (c) { return c.paciente_id === pid && !vigente(c); })
        .sort(function (a, b) { return b.data.localeCompare(a.data) || minutos(b.hora) - minutos(a.hora); });
    },
    /** Um agendamento pelo id, cancelado ou nao. */
    porId: function (id) {
      var c = consultas.filter(function (x) { return x.id === id; })[0];
      return c ? Object.assign({}, c) : null;
    },
    /** Os agendamentos vigentes da carteira (copia), do mais antigo para o
        mais novo — a tela Atendimentos le daqui para o bloco da agenda. */
    daCarteira: function () {
      return vigentes().filter(function (c) { return c && typeof c.data === "string"; })
        .sort(function (a, b) {
          return a.data.localeCompare(b.data) || minutos(a.hora) - minutos(b.hora);
        }).map(function (c) { return Object.assign({}, c); });
    },
    recarregar: function () { return carregar().then(desenhar); },
    /** So os dados, sem desenhar: a sincronizacao (sincronizacao.js) chama
        isto depois do login. A primeira carga, no DOMContentLoaded, pode ter
        corrido antes de a sessao existir — e ai leu o navegador, nao o
        servidor. */
    carregarDados: function () { return carregar(); },
    /** Logout: a agenda da conta que saiu nao fica em memoria. */
    esquecer: function () { consultas = []; bloqueios = []; }
  };

  document.addEventListener("DOMContentLoaded", function () {
    alvo = document.getElementById("agenda-corpo");
    if (!alvo) return;

    carregar().then(migrar).then(function () {
      desenhar();
      var anterior = window.aoTrocarPaciente;
      window.aoTrocarPaciente = function () {
        if (typeof anterior === "function") anterior();
        desenhar();
      };
    });
  });

  /* Ao ABRIR a Agenda (pelo menu), o periodo volta para hoje: guardar a
     ultima data escolhida fazia a tela abrir noutra semana. */
  window.redesenharAgenda = function () {
    if (!alvo) return;
    if (!editando) foco = hoje();
    carregar().then(desenhar);
  };
  /** Abre UMA consulta na agenda (o "Ver" do Dashboard). */
  window.Agenda.abrirConsulta = function (id) {
    var c = consultas.filter(function (x) { return x.id === id; })[0];
    if (!c) return false;
    if (c.data) { var p = c.data.split("-"); foco = new Date(+p[0], +p[1] - 1, +p[2]); }
    abrir("consulta", id);
    return true;
  };
  /** Nova consulta ja com um paciente (ficha, lista de pacientes). */
  window.Agenda.novaConsultaPara = function (pid) { novaConsulta(null, null, pid || null); };
})();
