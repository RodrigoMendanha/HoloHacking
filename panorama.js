/* ===========================================================================
   PANORAMA — o estado clinico de um paciente, e o da carteira inteira
   ===========================================================================

   As regras de "o que falta neste paciente" viviam dentro de ficha.js, presas
   ao paciente ativo. O dashboard precisa das mesmas regras para TODOS os
   pacientes — e regra clinica copiada em dois lugares diverge, e sempre
   diverge do jeito que ninguem percebe.

   Entao elas moraram para ca, parametrizadas por paciente. A ficha continua
   mostrando o mesmo que mostrava; o dashboard passa a mostrar quem precisa de
   atencao antes de a nutricionista abrir ficha por ficha.

   Nao decide nada de clinico por conta propria: as notas vem do motor.
   Exame nao entra em nada daqui (decisao de produto 09/10).
   =========================================================================== */

(function () {
  "use strict";

  var SEM_PACIENTE = "_sem_paciente";

  /* Etapa 0 da V1: a "reavaliacao de 4 semanas" (DIAS_REAVALIACAO = 28) que
     vivia aqui foi NEUTRALIZADA. O Documento Mestre (secoes 29 e 33) diz que
     prazos de acompanhamento sao definidos pela profissional, sem retorno
     universal automatico e sem cronograma inventado. Nao ha numero
     substituto: nenhum alerta de "reavaliacao vencida", nenhuma data de
     retorno derivada. A agenda mostra so o que alguem marcou. */

  /** Uma aplicacao do HOLOSCAN consolidada e a que o servidor aceitou
      (_supa_id). Sem sessao (modo local de desenvolvimento, so em
      localhost) a caixa local e a propria persistencia. Mapa gerado e nao
      salvo e previa: nao conta em indicador nenhum (Mestre §20, §33, §38.1). */
  function consolidada(p) {
    if (!p) return false;
    var comSessao = window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva();
    return comSessao ? !!p._supa_id : true;
  }

  var NOME_SISTEMA = {
    fungico: "Fúngico",
    acido_inflamatorio: "Ácido-Inflamatório",
    metabolico: "Metabólico",
    detox_linfatico: "Detox + Linfático",
    mental_emocional_espiritual: "Mental–Emocional–Espiritual"
  };

  function caixa(chave, pid) {
    try { return (JSON.parse(localStorage.getItem(chave)) || {})[pid] || null; }
    catch (e) { return null; }
  }

  function diasDesde(iso) {
    if (!iso) return null;
    var s = String(iso).slice(0, 10);
    var d = new Date(s + "T00:00:00");
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  /** As perguntas que existem hoje. Resposta orfa de marcador retirado numa
      revisao nao pode contar — senao aparece "86 de 84". */
  function perguntasDeHoje() {
    try {
      if (window.HOLOSCAN && window.HOLOSCAN.questionario) {
        var mapa = {};
        window.HOLOSCAN.questionario().forEach(function (q) { mapa[q.id] = true; });
        return mapa;
      }
    } catch (e) { /* sem motor, conta tudo */ }
    return null;
  }

  function totalDePerguntas() {
    try {
      if (window.HOLOSCAN && window.HOLOSCAN.questionario) {
        return window.HOLOSCAN.questionario().length;
      }
    } catch (e) { /* idem */ }
    return 84;
  }

  /* ---------- o estado de um paciente ------------------------------------ */

  function doPaciente(pid) {
    var id = pid || SEM_PACIENTE;
    var pont = window.ultimaPontuacao ? window.ultimaPontuacao(id) : null;
    var historico = window.historicoPontuacao ? window.historicoPontuacao(id) : [];
    var quest = caixa("holohacking.questionario", id) || {};

    var preenchidas = window.Aplicacoes
      ? window.Aplicacoes.preenchidas(id)
      : [];

    var conhecidas = perguntasDeHoje();
    var respondidas = Object.keys(quest).filter(function (mid) {
      return !conhecidas || conhecidas[mid];
    }).length;

    /* Decisao de produto 09/10: exame e so arquivo do prontuario. O panorama nao conta mais valores de
       exame (nem do painel legado nem das coletas antigas): documento aparece pelo ArquivoStore. */
    var Cd = window.Conduta;
    var temConduta = !!(Cd && Cd.doPaciente && Cd.doPaciente(id).some(function (c) { return Cd.consolidada(c); }));

    return {
      id: id,
      pontuacao: pont,
      historico: historico,
      respondidas: respondidas,
      totalPerguntas: totalDePerguntas(),
      ferramentas: preenchidas,
      temConduta: temConduta
    };
  }

  /* ---------- o que precisa de atencao -----------------------------------

     `grau` ordena: quanto menor, mais cedo aparece na lista do dashboard.   */

  /* Correcao (auditoria Pacientes/Atendimentos): um HOLOSCAN oficial
     calculado e guardado neste navegador, mas que nunca foi ao servidor
     (salvar exige um atendimento selecionado), aparecia como "oficial" sem
     nenhum aviso. Com sessao ativa, ele e marcado e vira pendencia. */
  var MSG_NAO_SALVO = "HOLOSCAN calculado, mas ainda não salvo no servidor: está só neste navegador. " +
    "Abra o HOLOSCAN do paciente, selecione o atendimento e clique em Salvar.";

  function comSessao() {
    return !!(window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva && window.HoloAuth.sessaoAtiva());
  }

  function naoSalva(pont) {
    return !!pont && comSessao() && !pont.homologacao_legado &&
      (pont.oficial === true || !!pont.methodology_package_id) && !pont._supa_id;
  }

  function alertas(d) {
    var saida = [];

    if ((d.historico || []).some(naoSalva)) {
      saida.push({ peso: 0, grau: "aviso", curto: "HOLOSCAN não salvo no servidor",
                   texto: MSG_NAO_SALVO, acao: "holoscan", botao: "Salvar HOLOSCAN" });
    }

    if (!d.pontuacao && d.respondidas === 0) {
      saida.push({ peso: 3, grau: "abrir", curto: "sem HOLOSCAN",
                   texto: "Sem HOLOSCAN aplicado.",
                   acao: "holoscan", botao: "Aplicar agora" });
    } else if (!d.pontuacao && d.respondidas > 0) {
      saida.push({ peso: 1, grau: "aviso",
                   curto: "questionário parado em " + d.respondidas + " de " + d.totalPerguntas,
                   texto: "Questionário parado em " + d.respondidas + " de " +
                          d.totalPerguntas + " — o mapa não foi gerado.",
                   acao: "holoscan", botao: "Continuar" });
    }

    // o achado que ninguem via: mapeado e nunca conduzido
    /* "mapa sem conduta" so quando nao ha NEM ferramenta NEM conduta registrada */
    if (d.pontuacao && d.ferramentas.length === 0 && !d.temConduta) {
      saida.push({ peso: 1, grau: "aviso", curto: "mapa sem conduta",
                   texto: "O mapa foi feito e nenhuma ferramenta foi aplicada. " +
                          "Sem conduta, a avaliação não vira jornada.",
                   acao: "aba:conduta", botao: "Abrir conduta" });
    }

    /* Etapa 0 da V1 — dois alertas sairam daqui, de proposito:
         - "reavaliacao vencida ha N dias" (28 dias): retorno universal
           automatico nao existe na V1 (Mestre §33);
         - "relato e exames divergem no <sistema>": a Leitura Integrada
           atual usa regra ainda nao homologada (nota <= 3 x um exame fora da
           faixa); regra em homologacao nao alimenta pendencia nem indicador
           (Mestre §24, §33, §38.1). A leitura continua na propria tela, com
           o selo "em homologacao". */

    return saida;
  }

  /* ---------- a carteira inteira ----------------------------------------- */

  function carteira() {
    var pacientes = (window.pacientesTodos && window.pacientesTodos()) || [];

    var linhas = pacientes.map(function (p) {
      var d = doPaciente(p.id);
      var av = alertas(d);
      av.sort(function (a, b) { return a.peso - b.peso; });
      return { paciente: p, dados: d, alertas: av };
    });

    /* "Com HOLOSCAN" conta so aplicacoes consolidadas (Mestre §33:
       "Contagens de mapas consideram aplicacoes efetivamente consolidadas"). */
    var comMapa = linhas.filter(function (l) { return consolidada(l.dados.pontuacao); });
    var pendentes = linhas.filter(function (l) { return l.alertas.length > 0; });
    pendentes.sort(function (a, b) {
      return a.alertas[0].peso - b.alertas[0].peso ||
             a.paciente.nome.localeCompare(b.paciente.nome);
    });

    /* Etapa 0 da V1: "o terreno da carteira" (quantas vezes cada sistema
       aparece entre os dois mais baixos) e o "Indice HOLOS medio" foram
       DESLIGADOS. Os dois somavam notas calculadas com bancos em rascunho e
       incluiam mapas nao consolidados; o Mestre (§33) exige elegibilidade e
       versoes comparaveis para qualquer media entre pacientes e diz que
       rascunho/previa nao melhora estatistica. Sem substituto: o dashboard
       mostra o estado "em homologacao" (window.Metodologia). */
    var terreno = [];
    var media = null;

    return {
      total: pacientes.length,
      comMapa: comMapa.length,
      semMapa: pacientes.length - comMapa.length,
      indiceMedio: media,
      pendentes: pendentes,
      terreno: terreno,
      indicadoresEmHomologacao: true,
      linhas: linhas
    };
  }

  /* ---------- o contexto que as combinacoes podem ler -------------------

     Exame e ferramenta nao entram em nota nenhuma — o Indice continua saindo
     so do questionario. Eles existem aqui para uma combinacao poder dizer
     "exame.EXA-005 >= 100 E marcador.SNT-304 >= 2", que e a leitura que o
     material promete e que cinco notas sozinhas nao conseguem expressar.

     So numero entra: campo de texto de ferramenta fica de fora. */
  function contexto(pid) {
    var id = pid || (window.pacienteAtivoId && window.pacienteAtivoId()) || SEM_PACIENTE;

    /* Decisao de produto 09/10: exame NAO entra em contexto de calculo nenhum (nem em combinacao). */
    var exames = {};

    var ferramentas = {};
    if (window.Aplicacoes) {
      window.Aplicacoes.preenchidas(id).forEach(function (fid) {
        /* Etapa 6.5 (B): registro clinico estruturado (Mapa da Rotina, Gatilhos & Respostas, Conexao &
           Pertencimento) nao alimenta contexto de calculo nenhum — nem a intensidade percebida. */
        var cat = (window.CATALOGO_FERRAMENTAS || []).filter(function (f) { return f.id === fid; })[0];
        if (cat && cat.registro) return;
        var app = window.Aplicacoes.ultima(fid, id);
        if (!app || !app.respostas) return;
        var numericos = {};
        Object.keys(app.respostas).forEach(function (c) {
          var v = app.respostas[c];
          // lista de itens nao entra: uma condicao le um valor, nao um array
          if (v === "" || v == null || Array.isArray(v) || typeof v === "object") return;
          var n = Number(v);
          if (isFinite(n)) numericos[c] = n;
        });
        if (Object.keys(numericos).length) ferramentas[fid] = numericos;
      });
    }

    return { exames: exames, ferramentas: ferramentas };
  }

  /* ---------- a situacao de cada paciente na lista -----------------------

     Os filtros da lista de pacientes precisam de uma leitura por pessoa que
     nao existia: ha quanto tempo ela nao aparece, se a ficha esta vazia, se
     ela e nova, se foi marcada como inativa. Fica aqui pelo mesmo motivo que
     o resto: sao regras sobre o estado clinico, e a lista nao pode discordar
     da ficha nem do dashboard sobre a mesma pessoa.                          */

  var DIAS_SEM_CONTATO = 90;   // o silencio que ja e longo demais
  var DIAS_NOVO = 30;          // o primeiro mes, em que a ficha ainda enche

  /** Uma caixa de formulario (oq3, pqq) tem conteudo de verdade? */
  function temConteudo(obj) {
    if (!obj) return false;
    return Object.keys(obj).some(function (k) {
      return k !== "id" && k !== "paciente_id" && k !== "created_at" &&
             k !== "score_holos" && obj[k];
    });
  }

  function situacao(p) {
    var d = doPaciente(p.id);
    /* Correcao (auditoria): "ultimo contato" olhava so a data do ultimo
       HOLOSCAN. Agora e o mais recente entre os ATENDIMENTOS registrados
       (data clinica, no fuso de quem atende) e as aplicacoes do HOLOSCAN.
       Consulta marcada nao e contato: so o atendimento registrado conta. */
    var ultimo = d.pontuacao && d.pontuacao.quando ? d.pontuacao.quando : null;
    var A = window.AtendimentoAtual;
    if (A && A.doPaciente && A.paraParede) {
      var hojeD = window.hojeISO ? window.hojeISO() : null;
      A.doPaciente(p.id).forEach(function (e) {
        var w = A.paraParede(e.occurred_at, e.timezone || (A.fuso ? A.fuso() : undefined));
        var dia = w && w.data;
        if (dia && (!hojeD || dia <= hojeD) && (!ultimo || dia > ultimo)) ultimo = dia;
      });
    }
    var cadastro = (p.created_at || "").slice(0, 10);

    /* O silencio conta do ultimo atendimento; quem nunca teve conta do
       cadastro. Cadastrar alguem e nunca ver e justamente o caso que nao
       pode escapar da lista — e sem esta linha ele escapava, porque nao
       havia data nenhuma de onde contar. */
    var dias = diasDesde(ultimo || cadastro);
    var desdeCadastro = diasDesde(cadastro);

    /* "Alguma coisa" e qualquer sinal de que a ficha comecou a existir: uma
       resposta, uma ferramenta, um OQ3. Sem nenhum deles, o cadastro e so um
       nome. (Exame guardado e arquivo do prontuario, nao conta aqui.) */
    var comecou = d.respondidas > 0 || d.ferramentas.length > 0 ||
                  temConteudo(p.oq3) || temConteudo(p.pqq);

    return {
      ultimoContato: ultimo,
      diasDeSilencio: dias,
      nuncaAtendido: !ultimo,
      novo: desdeCadastro !== null && desdeCadastro <= DIAS_NOVO,
      semContato: dias !== null && dias >= DIAS_SEM_CONTATO,
      vazia: !d.pontuacao && !comecou,
      inativo: p.status === "inativo",
      /* Respondeu alguma coisa e ainda nao virou mapa: e o unico "esperando
         por voce" que o app conhecia so como uma linha de alerta solta. */
      aguardandoMapa: !d.pontuacao && comecou,
      dados: d
    };
  }

  /* ---------- as consultas: o que ja aconteceu ---------------------------

     Cada aplicacao do HOLOSCAN e um atendimento, e o app ja guardava todas,
     por paciente, para poder comparar 4, 8 e 12 semanas. O que faltava era
     poder olhar isso de FORA do paciente: o que foi atendido, em ordem de
     tempo, na carteira inteira.

     Nao inventa atendimento: sem aplicacao nao ha consulta aqui. E ferramenta
     preenchida nao guarda data — entao nao da para dizer que ela pertence a
     este dia, e por isso ela nao entra na linha.                            */

  function consultas() {
    var pacientes = (window.pacientesTodos && window.pacientesTodos()) || [];
    var saida = [];

    pacientes.forEach(function (p) {
      var h = (window.historicoPontuacao && window.historicoPontuacao(p.id)) || [];
      h.forEach(function (pont, i) {
        var maisBaixos = (pont.sistemas || [])
          .filter(window.HoloAusencia.suficiente)
          .slice()
          .sort(window.HoloAusencia.porNota)
          .slice(0, 2)
          .map(function (s) {
            return { sistema: s.sistema, nome: NOME_SISTEMA[s.sistema] || s.sistema,
                     nota: s.nota, nota_exibicao: s.nota_exibicao || null };
          });

        saida.push({
          paciente: p,
          quando: pont.quando,
          numero: i + 1,
          total: h.length,
          indice: pont.indice,
          indice_exibicao: pont.indice_exibicao || null,
          oficial: !!(pont.oficial === true || pont.methodology_package_id),
          methodology_package_id: pont.methodology_package_id || null,
          methodology_package_code: pont.methodology_package_code || null,
          methodology_package_version: pont.methodology_package_version,
          _supa_id: pont._supa_id || null,
          // so ha variacao a partir da segunda: a primeira nao tem com o que comparar
          variacao: i > 0 && typeof pont.indice === "number" && typeof h[i - 1].indice === "number"
            ? pont.indice - h[i - 1].indice : null,
          maisBaixos: maisBaixos
        });
      });
    });

    /* Mais recente primeiro, tambem dentro do mesmo dia (a 2a antes da 1a),
       como o resto da tela. */
    saida.sort(function (a, b) {
      return (b.quando || "").localeCompare(a.quando || "") ||
             a.paciente.nome.localeCompare(b.paciente.nome) ||
             b.numero - a.numero;
    });
    return saida;
  }

  /* ---------- a agenda: quando cada um precisa voltar --------------------

     O metodo promete reavaliacao em 4 semanas. Ate aqui isso so existia como
     alerta DEPOIS de vencido. A data derivada — ultima aplicacao + 28 dias —
     diz antes, que e quando ainda da para fazer alguma coisa a respeito.

     E quem atende marca o dia de verdade, que nem sempre e o derivado: a
     paciente viaja, a agenda enche. Por isso a data marcada, quando existe,
     manda sobre a derivada. A tela mostra as duas, para ninguem confundir o
     que o sistema calculou com o que uma pessoa combinou.                   */

  /* A caixa antiga guardava {pid: {data}} — um retorno sem hora. Ela virou a
     tabela de consultas, e agenda.js migra o que houver na primeira carga.
     Aqui so se le o que ja virou consulta, pela porta que agenda.js abre. */
  function marcado(pid) {
    if (!window.Agenda || !window.Agenda.proxima) return null;
    var c = window.Agenda.proxima(pid);
    return c ? { data: c.data, hora: c.hora, nota: c.nota || "" } : null;
  }

  /* somarDias(iso, dias) ficou sem uso na Etapa 0 (era o "+28"); mantido
     por ser utilitario puro, sem regra. */
  function somarDias(iso, dias) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + dias);
    return d.getFullYear() + "-" +
           String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  /** Dias daqui ate a data. Negativo quer dizer que ja passou. */
  function faltam(iso) {
    var d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return null;
    var hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - hoje.getTime()) / 86400000);
  }

  function agenda() {
    var pacientes = (window.pacientesTodos && window.pacientesTodos()) || [];

    var linhas = pacientes.map(function (p) {
      var d = doPaciente(p.id);
      var ultima = d.pontuacao && d.pontuacao.quando ? d.pontuacao.quando : null;
      /* Etapa 0 da V1: sem data de retorno derivada (era ultima + 28 dias).
         O campo continua existindo, sempre null, para quem o le. */
      var derivada = null;
      var consulta = marcado(p.id);
      var quando = (consulta && consulta.data) || derivada;
      var dias = quando ? faltam(quando) : null;

      return {
        paciente: p,
        ultima: ultima,
        derivada: derivada,
        marcada: consulta ? consulta.data : null,
        hora: consulta ? consulta.hora : null,
        nota: consulta ? consulta.nota : "",
        quando: quando,
        faltam: dias,
        grupo: quando === null ? "sem"
             : dias < 0 ? "vencida"
             : dias <= 7 ? "semana"
             : "depois"
      };
    });

    linhas.sort(function (a, b) {
      if (!a.quando && !b.quando) return a.paciente.nome.localeCompare(b.paciente.nome);
      if (!a.quando) return 1;
      if (!b.quando) return -1;
      return a.quando.localeCompare(b.quando) ||
             a.paciente.nome.localeCompare(b.paciente.nome);
    });

    function doGrupo(g) {
      return linhas.filter(function (l) { return l.grupo === g; });
    }

    return {
      linhas: linhas,
      vencidas: doGrupo("vencida"),
      semana: doGrupo("semana"),
      depois: doGrupo("depois"),
      sem: doGrupo("sem")
    };
  }

  window.Panorama = {
    doPaciente: doPaciente,
    contexto: contexto,
    alertas: alertas,
    naoSalva: naoSalva,
    MSG_NAO_SALVO: MSG_NAO_SALVO,
    carteira: carteira,
    consultas: consultas,
    agenda: agenda,
    situacao: situacao,
    temConteudo: temConteudo,
    DIAS_SEM_CONTATO: DIAS_SEM_CONTATO,
    DIAS_NOVO: DIAS_NOVO,
    NOME_SISTEMA: NOME_SISTEMA,
    consolidada: consolidada,
    /* Etapa 0 da V1: nao existe prazo universal de reavaliacao. */
    DIAS_REAVALIACAO: null
  };
})();
