/* ===========================================================================
   DASHBOARD — o que tenho hoje?
   ===========================================================================

   A primeira tela que a nutricionista ve ao abrir o app. Responde a tres
   perguntas, na ordem em que elas aparecem na cabeca de quem vai atender:

     1. O que tenho hoje?     consultas do dia, proximos atendimentos
     2. Quem precisa de mim?  pendencias da carteira, da mais urgente
     3. O que se repete?      o terreno que mais aparece entre pacientes

   Conta nova (0 pacientes): mostra o metodo junto com orientacao contextual
   que detecta o estado real da conta (perfil, primeiro paciente, HOLOSCAN).

   Nada aqui calcula regra clinica: quem decide o que e pendencia e
   panorama.js, que e o mesmo codigo que a ficha usa.
   =========================================================================== */

(function () {
  "use strict";

  var MINIMO_PARA_TERRENO = 3;

  var alvo = null;

  function escapar(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function inicial(nome) {
    return (nome || "?").trim().charAt(0).toUpperCase();
  }

  function primeiroNome(nome) {
    return (nome || "").split(" ")[0];
  }

  function dataBR(iso) {
    return iso ? String(iso).split("-").reverse().join("/") : "";
  }

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

  /* ---------- os blocos --------------------------------------------------- */

  function blocoCabecalho(c, agenda) {
    var nPac = c ? c.total : 0;
    var nPend = c ? c.pendentes.length : 0;

    var consultasHoje = 0;
    var proxLabel = "&mdash;";
    if (agenda && agenda.linhas) {
      var hj = new Date().toISOString().slice(0, 10);
      consultasHoje = agenda.linhas.filter(function (l) {
        return l.marcada === hj;
      }).length;
      var proximas = agenda.linhas.filter(function (l) {
        return l.marcada && l.faltam !== null && l.faltam >= 0;
      });
      if (proximas.length > 0) {
        proxLabel = escapar(dataBR(proximas[0].marcada));
      }
    }

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

  function blocoConsultasHoje(agenda) {
    var hj = new Date().toISOString().slice(0, 10);
    var hoje = ((agenda && agenda.linhas) || []).filter(function (l) {
      return l.marcada === hj;
    });

    if (hoje.length === 0) return "";

    hoje.sort(function (a, b) {
      return (a.hora || "").localeCompare(b.hora || "");
    });

    var corpo = '<ul class="dash-pendentes" id="dash-lista-hoje">' + hoje.map(function (l) {
      var quando = l.hora || "sem horário";
      var tipo = l.tipo ? " &middot; " + escapar(l.tipo) : "";
      return '<li class="dash-pendente">' +
        '<span class="pac-avatar">' + escapar(inicial(l.paciente.nome)) + "</span>" +
        '<span class="dash-quem">' +
          "<b>" + escapar(l.paciente.nome) + "</b>" +
          '<span class="dash-porque">' + escapar(quando) + tipo + "</span>" +
        "</span>" +
        '<button type="button" class="dash-ir" data-paciente="' + escapar(l.paciente.id) +
          '" data-destino="ficha">Ver <span aria-hidden="true">&rarr;</span></button>' +
        "</li>";
    }).join("") + "</ul>";

    return '<div class="dash-bloco dash-bloco-compacto dash-bloco-hoje">' +
      '<h3 class="dash-titulo">Hoje <em>' + hoje.length + "</em></h3>" + corpo + "</div>";
  }

  function blocoProximosAtendimentos(agenda) {
    var hj = new Date().toISOString().slice(0, 10);
    var proximas = ((agenda && agenda.linhas) || []).filter(function (l) {
      return l.marcada && l.marcada > hj && l.faltam !== null && l.faltam >= 0;
    }).slice(0, 3);

    var corpo;
    if (proximas.length === 0) {
      corpo = '<p class="dash-vazio">Nenhuma consulta agendada nos próximos dias.</p>' +
        '<button type="button" class="perf-botao" data-destino="nova-consulta">Agendar consulta</button>';
    } else {
      corpo = '<ul class="dash-pendentes" id="dash-lista-atendimentos">' + proximas.map(function (l) {
        var quando = dataBR(l.marcada) + (l.hora ? " às " + l.hora : "");
        return '<li class="dash-pendente">' +
          '<span class="pac-avatar">' + escapar(inicial(l.paciente.nome)) + "</span>" +
          '<span class="dash-quem">' +
            "<b>" + escapar(l.paciente.nome) + "</b>" +
            '<span class="dash-porque">' + escapar(quando) + "</span>" +
          "</span>" +
          '<button type="button" class="dash-ir" data-paciente="' + escapar(l.paciente.id) +
            '" data-destino="ficha">Ver <span aria-hidden="true">&rarr;</span></button>' +
          "</li>";
      }).join("") + "</ul>";
    }

    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Próximos atendimentos</h3>' + corpo + "</div>";
  }

  function blocoPacientesRecentes() {
    var recentes = ((window.pacientesTodos && window.pacientesTodos()) || [])
      .slice()
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

  function blocoJornadaClinica() {
    var etapas = [
      { mov: "MAPEAR",      nome: "HOLOSCAN",          texto: "Mapear prioridades de investigação.",                destino: "holoscan" },
      { mov: "CONFRONTAR",  nome: "Leitura Integrada", texto: "Confrontar o mapa com dados laboratoriais.",         destino: "confronto" },
      { mov: "INTEGRAR",    nome: "Ferramentas",       texto: "Integrar ferramentas e condutas ao caso.",           destino: "corpo" },
      { mov: "ACOMPANHAR",  nome: "Evolução",          texto: "Acompanhar mudanças entre aplicações.",              destino: "pacientes" }
    ];

    var passos = etapas.map(function (e, i) {
      var seta = i > 0 ? '<div class="dash-jornada-seta" aria-hidden="true">&darr;</div>' : "";
      return seta + '<div class="dash-jornada-passo">' +
        '<span class="dash-mov">' + escapar(e.mov) + "</span>" +
        '<span class="dash-quem"><b>' + escapar(e.nome) + "</b>" +
          '<span class="dash-porque">' + escapar(e.texto) + "</span></span>" +
        '<button type="button" class="dash-ir" data-destino="' + e.destino + '">Abrir <span aria-hidden="true">&rarr;</span></button>' +
      "</div>";
    }).join("");

    return '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Jornada clínica</h3>' +
      '<div class="dash-jornada">' + passos + "</div></div>";
  }

  function blocoPendencias(c) {
    if (c.pendentes.length === 0) {
      return '<div class="dash-bloco">' +
        '<h3 class="dash-titulo">Precisa de você</h3>' +
        '<p class="dash-vazio">Nada pendente. Todas as fichas estão em dia.</p>' +
        "</div>";
    }

    var html = '<div class="dash-bloco">' +
      '<h3 class="dash-titulo">Precisa de você <em>' + c.pendentes.length + "</em></h3>" +
      '<ul class="dash-pendentes" id="dash-lista-pendentes">';

    c.pendentes.forEach(function (l) {
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

    return html + "</ul></div>";
  }

  function blocoNumeros(c) {
    var vencidas = c.linhas.filter(function (l) {
      return l.alertas.some(function (a) { return /reavalia/.test(a.curto); });
    }).length;

    var tiles = [
      { n: c.total, r: c.total === 1 ? "paciente" : "pacientes" },
      { n: c.comMapa, r: "com HOLOSCAN" },
      { n: vencidas, r: vencidas === 1 ? "reavaliação vencida" : "reavaliações vencidas" },
      { n: c.indiceMedio === null ? "—" : c.indiceMedio, r: "Índice HOLOS médio" }
    ];

    return '<div class="dash-numeros">' + tiles.map(function (t) {
      return '<div class="dash-tile"><b>' + escapar(t.n) + "</b><span>" +
        escapar(t.r) + "</span></div>";
    }).join("") + "</div>";
  }

  function blocoTerreno(c) {
    if (c.comMapa < MINIMO_PARA_TERRENO) {
      if (c.comMapa === 0) return "";
      return '<div class="dash-bloco">' +
        '<h3 class="dash-titulo">O terreno da sua carteira</h3>' +
        '<p class="dash-vazio">Com ' + c.comMapa +
        (c.comMapa === 1 ? " paciente mapeado" : " pacientes mapeados") +
        " ainda não há padrão para ler — a partir de " + MINIMO_PARA_TERRENO +
        " o que se repete começa a aparecer aqui.</p></div>";
    }

    var maior = c.terreno[0].vezes;
    var linhas = c.terreno.map(function (t) {
      var largura = Math.round(t.vezes / maior * 100);
      var frase = t.vezes + " de " + c.comMapa + " pacientes mapeados";
      return '<li class="dash-barra" title="' + escapar(t.nome + ": " + frase) + '">' +
        '<span class="dash-barra-nome">' + escapar(t.nome) + "</span>" +
        '<span class="dash-barra-trilho"><i style="width:' + largura + '%"></i></span>' +
        '<span class="dash-barra-n">' + t.vezes + "</span>" +
        "</li>";
    }).join("");

    return '<div class="dash-bloco">' +
      '<h3 class="dash-titulo">O terreno da sua carteira</h3>' +
      '<p class="dash-sub">Quantas vezes cada sistema aparece entre os dois mais baixos ' +
      "dos seus " + c.comMapa + " pacientes mapeados.</p>" +
      '<ul class="dash-terreno">' + linhas + "</ul></div>";
  }

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

    var agenda = null;
    try { if (window.Panorama.agenda) agenda = window.Panorama.agenda(); }
    catch (e) { agenda = null; }

    var metodo = document.getElementById("dash-metodo");

    if (c.total === 0) {
      if (metodo) metodo.classList.remove("hidden");
      alvo.innerHTML = blocoCabecalho(c, agenda) +
        blocoProximosAtendimentos(agenda) +
        blocoOnboarding(c) +
        blocoPacientesRecentes() +
        blocoJornadaClinica();
      ligar();
      return;
    }

    if (metodo) metodo.classList.add("hidden");

    var hojeBloco = blocoConsultasHoje(agenda);

    alvo.innerHTML = blocoCabecalho(c, agenda) +
      hojeBloco +
      (hojeBloco ? "" : blocoProximosAtendimentos(agenda)) +
      blocoOnboarding(c) +
      blocoPendencias(c) +
      blocoPacientesRecentes() +
      blocoNumeros(c) +
      blocoTerreno(c) +
      blocoJornadaClinica();

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

        if (destino === "ficha") {
          if (window.irParaSecao) window.irParaSecao("pacientes");
          if (pid && window.abrirFichaDe) window.abrirFichaDe(pid);
          return;
        }

        if (pid && window.definirPacienteAtivo) window.definirPacienteAtivo(pid);

        if (destino.indexOf("aba:") === 0) {
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
