/* ===========================================================================
   QUESTIONARIO DO HOLOSCAN — as 84 perguntas
   ===========================================================================

   As perguntas NAO estao escritas aqui. Vem de HOLOSCAN.questionario(), que
   as le do banco de marcadores. Quando o Rodrigo corrigir uma pergunta no CSV,
   ela muda na tela sem ninguem tocar em codigo.

   Tres blocos, que sao as tres subferramentas do material:
     BioRoot             sintomas do corpo      49
     NeuroScan           emocoes e padroes      19
     Terreno Espiritual  proposito, valor, fe   16

   Eram 87. Tres perguntas saiam repetidas — a mesma frase em dois marcadores,
   respondida duas vezes e contada duas vezes. Ver o relatorio de revisao.

   Quatro botoes, e os rotulos deles vem do marcador:

     frequencia    Nunca / As vezes / Frequente / Sempre
     intensidade   Nada / Um pouco / Bastante / Muito

   Porque "sua gordura se concentra na barriga?" nao tem frequencia: responder
   "as vezes" ali nao quer dizer nada. Nao e campo de digitar — consulta de 15
   minutos nao comporta escrever 84 vezes.

   O SENTIDO da pergunta (se o 3 e a pior ou a melhor resposta) tambem vem do
   banco, e quem aplica e o motor. Esta tela nao converte nada: ela mostra o
   que a pessoa marcou.

   As respostas sao guardadas a cada toque, por paciente. Fechar no meio e
   voltar depois nao perde nada — 15 minutos de consulta nao podem ir embora
   por um clique errado.

   Ao calcular, quem pontua e o motor OFICIAL (MotorMetodologico, modo
   oficial, pacote HOLOS-V1 aprovado e vigente) via HoloscanOficial. Esta tela
   nao decide nada e nao tem fallback para o motor legado.
   =========================================================================== */

(function () {
  "use strict";

  var CHAVE = "holohacking.questionario";
  var SEM_PACIENTE = "_sem_paciente";

  var ESCALAS = {
    frequencia:  ["Nunca", "Às vezes", "Frequente", "Sempre"],
    intensidade: ["Nada", "Um pouco", "Bastante", "Muito"]
  };

  var BLOCOS = [
    { origem: "sintoma",    sigla: "BioRoot",   titulo: "Raízes físicas",
      sub: "inflamação, metabolismo, detox, microbiota" },
    { origem: "emocao",     sigla: "NeuroScan", titulo: "Padrões emocionais",
      sub: "ansiedade, sabotadores, gatilhos" },
    { origem: "espiritual", sigla: "Terreno Espiritual", titulo: "Propósito, valores e fé",
      sub: "alinhamento, pertencimento, bloqueios" }
  ];

  var perguntas = null;      // as 84, carregadas do motor uma vez
  var caixa = null;
  var ligado = false;        // o ouvinte de clique e um so, para sempre

  function motorPronto() {
    return !!(window.HOLOSCAN && window.HOLOSCAN.questionario);
  }

  /* ---------- de quem sao estas respostas -------------------------------- */

  /* A lista de pacientes vem do banco por uma chamada assincrona. Enquanto ela
     nao chega, pacienteAtivoId() e null — e foi assim que as respostas se
     perdiam: as primeiras iam para "_sem_paciente" e, quando a lista chegava,
     passavam a ser procuradas debaixo do id do paciente. Ninguem apagou nada;
     elas foram gravadas com uma chave e lidas com outra.

     Por isso a tela so desenha depois que a lista chegou. */
  function pacientesProntos() {
    try {
      return typeof window.pacientesCarregados !== "function" ||
             window.pacientesCarregados();
    } catch (e) { return true; }
  }

  function pacienteAtual() {
    try {
      return (window.pacienteAtivoId && window.pacienteAtivoId()) || SEM_PACIENTE;
    } catch (e) { return SEM_PACIENTE; }
  }

  /* ---------- guardar (hoje no navegador; depois no Supabase) ------------ */

  function tudo() {
    try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; }
    catch (e) { return {}; }
  }
  function respostasDoPaciente() {
    return tudo()[pacienteAtual()] || {};
  }
  /* O mapa inteiro e RELIDO aqui, imediatamente antes de gravar, e tudo isto
     acontece num turno sincrono so: outra aba nao consegue se enfiar entre a
     leitura e a escrita. Entao a resposta que a outra aba acabou de dar nao se
     perde. O que se acrescenta e o aviso: depois de gravar, a revisao avanca,
     e as outras abas descobrem que o que elas tem na tela envelheceu. */
  function gravar(marcadorId, valor) {
    if (window.pacienteArquivado && window.pacienteArquivado()) {
      if (window.avisar) window.avisar(window.MSG_ARQUIVADO);
      return;
    }
    var t = tudo(), p = pacienteAtual();
    if (!t[p]) t[p] = {};
    t[p][marcadorId] = valor;
    localStorage.setItem(CHAVE, JSON.stringify(t));
    if (window.Concorrencia) window.Concorrencia.avancarRevisao("questionario");
  }
  function limpar() {
    var t = tudo();
    delete t[pacienteAtual()];
    localStorage.setItem(CHAVE, JSON.stringify(t));
    if (window.Concorrencia) window.Concorrencia.avancarRevisao("questionario");
  }

  /* Respostas que ainda existem no banco de hoje. Marcador removido numa
     revisao deixa resposta orfa guardada; ela nao pode contar no progresso
     nem ir para o motor, que a recusaria. */
  function respostasValidas() {
    var dadas = respostasDoPaciente();
    var validas = {};
    if (!perguntas) return validas;
    for (var i = 0; i < perguntas.length; i++) {
      var id = perguntas[i].id;
      if (dadas[id] !== undefined) validas[id] = dadas[id];
    }
    return validas;
  }

  /* ---------- desenhar --------------------------------------------------- */

  var escapar = window.escapar;

  /** Rotulos da escala do item. Escala desconhecida NAO cai em frequencia
      (decisao V1, Etapa 4.2): devolve null e o item aparece como erro, sem botoes. */
  function rotulos(q) {
    return Object.prototype.hasOwnProperty.call(ESCALAS, q.escala) ? ESCALAS[q.escala] : null;
  }

  function desenhar() {
    if (!motorPronto()) {
      caixa.innerHTML = '<p class="q-erro">O motor não carregou. ' +
        "Sem ele não há perguntas — confira se holoscan.js está sendo servido.</p>";
      return;
    }
    if (!pacientesProntos()) {
      caixa.innerHTML = '<p class="q-aviso">Carregando o paciente…</p>';
      return;
    }
    if (!perguntas) perguntas = window.HOLOSCAN.questionario();

    var dadas = respostasValidas();
    var html = "";

    if (pacienteAtual() === SEM_PACIENTE) {
      html += '<p class="q-aviso">Nenhum paciente selecionado. As respostas ficam ' +
        "guardadas neste navegador, mas não entram na ficha de ninguém — " +
        "escolha um paciente antes de aplicar o questionário.</p>";
    }

    html += '<div class="q-topo">' +
      '<div class="q-progresso"><i></i></div>' +
      '<div class="q-linha"><span class="q-conta"></span>' +
      '<span class="q-acoes">' +
      '<button type="button" class="btn-fantasma" data-acao="limpar">Limpar</button>' +
      '<button type="button" class="btn-verde" data-acao="calcular">Gerar o mapa</button>' +
      "</span></div></div>";

    for (var b = 0; b < BLOCOS.length; b++) {
      var bloco = BLOCOS[b];
      var doBloco = perguntas.filter(function (p) { return p.origem === bloco.origem; });
      var respondidas = 0;
      for (var r = 0; r < doBloco.length; r++) {
        if (dadas[doBloco[r].id] !== undefined) respondidas++;
      }
      html += '<div class="q-bloco" data-bloco="' + bloco.origem + '"><div class="q-bloco-cabeca">' +
        "<b>" + bloco.sigla + "</b><span>" + bloco.titulo + " &middot; " + bloco.sub + "</span>" +
        '<em class="q-bloco-conta" data-bloco-conta="' + bloco.origem + '">' +
        respondidas + " de " + doBloco.length + "</em></div>";

      for (var i = 0; i < doBloco.length; i++) {
        var q = doBloco[i];
        var v = dadas[q.id];
        var escala = rotulos(q);
        if (!escala) {
          html += '<div class="q-item q-item-erro" data-marcador="' + escapar(q.id) + '">' +
            '<p class="q-pergunta">' + escapar(q.pergunta) + "</p>" +
            '<p class="q-erro">Escala desconhecida (' + escapar(String(q.escala)) + '): item sem resposta possível até a correção do banco.</p></div>';
          continue;
        }
        html += '<div class="q-item" data-marcador="' + q.id + '">' +
          '<p class="q-pergunta">' + escapar(q.pergunta) + "</p>" +
          '<div class="q-botoes">';
        for (var k = 0; k < 4; k++) {
          var sel = String(v) === String(k);
          html += '<button type="button" class="q-btn' +
            (sel ? " marcado" : "") +
            '" data-valor="' + k + '" aria-pressed="' + sel + '"><b>' + k + "</b>" + escala[k] + "</button>";
        }
        html += "</div></div>";
      }
      html += "</div>";
    }

    html += '<div class="q-resultado" id="q-resultado"></div>';
    caixa.innerHTML = html;
    ligar();
    atualizarProgresso();
  }

  function atualizarProgresso() {
    if (!perguntas) return;
    var dadas = respostasValidas();
    var n = Object.keys(dadas).length;
    var pc = Math.round(n / perguntas.length * 100);
    var barra = caixa.querySelector(".q-progresso i");
    if (barra) barra.style.width = pc + "%";
    var conta = caixa.querySelector(".q-conta");
    if (conta) {
      conta.innerHTML = "<b>" + n + "</b> de " + perguntas.length + " respondidas" +
        (n === perguntas.length ? " &middot; completo" : "");
    }
    for (var b = 0; b < BLOCOS.length; b++) {
      var bloco = BLOCOS[b];
      var doBloco = perguntas.filter(function (p) { return p.origem === bloco.origem; });
      var resp = 0;
      for (var i = 0; i < doBloco.length; i++) {
        if (dadas[doBloco[i].id] !== undefined) resp++;
      }
      var el = caixa.querySelector('[data-bloco-conta="' + bloco.origem + '"]');
      if (el) {
        el.textContent = resp + " de " + doBloco.length;
        if (resp === doBloco.length) el.classList.add("q-bloco-completo");
        else el.classList.remove("q-bloco-completo");
      }
    }
  }

  /* Um ouvinte so, no container, para a vida inteira da pagina. Ele estava
     sendo pendurado a cada desenho: trocar de paciente tres vezes fazia o
     mesmo clique gravar tres vezes. */
  function ligar() {
    if (ligado) return;
    ligado = true;
    caixa.addEventListener("click", function (ev) {
      var b = ev.target.closest(".q-btn");
      if (b) {
        var item = b.closest(".q-item");
        item.querySelectorAll(".q-btn").forEach(function (x) {
          x.classList.remove("marcado");
          x.setAttribute("aria-pressed", "false");
        });
        b.classList.add("marcado");
        b.setAttribute("aria-pressed", "true");
        gravar(item.dataset.marcador, Number(b.dataset.valor));
        atualizarProgresso();
        return;
      }
      var acao = ev.target.closest("[data-acao]");
      if (!acao) return;
      if (acao.dataset.acao === "limpar") {
        var total = Object.keys(respostasValidas()).length;
        if (total === 0 || confirm("Limpar todas as " + total + " respostas deste paciente?")) {
          limpar();
          desenhar();
        }
      } else if (acao.dataset.acao === "calcular") {
        calcular();
      } else if (acao.dataset.acao === "tentar-novamente") {
        tentarNovamente();
      }
    });
  }

  /* ---------- calcular: daqui em diante quem manda e o motor OFICIAL ------

     Correcao P0 (pos-deploy 6.4): o mapa sai do MotorMetodologico em modo
     oficial sobre o HOLOS-V1@2 aprovado e vigente (HoloscanOficial), nunca do
     motor legado. Exames, ferramentas e Panorama nao entram no calculo. Sem
     pacote oficial carregado nao ha mapa: aparece o motivo e o botao "Tentar
     novamente" (recarrega o pacote; as respostas continuam guardadas). O
     motor legado so responde no modo de homologacao (?homologacao=1), com
     selo, e esse resultado nunca e salvo. */
  function modoHomologacao() {
    return !!(window.Metodologia && window.Metodologia.modoHomologacao && window.Metodologia.modoHomologacao());
  }
  /* Sem cliente Supabase (modo local de desenvolvimento: a biblioteca nao carregou, nao ha conta nem servidor)
     nao existe pacote aprovado para carregar NEM aplicacao oficial para gravar: o motor legado responde, com
     o selo de homologacao, e nada disso vai para o servidor. Em producao (com Supabase) so o motor oficial. */
  function semServidor() { return !window.supabaseClient; }

  function calcular() {
    var dadas = respostasValidas();
    var ids = Object.keys(dadas);
    if (ids.length === 0) {
      mostrarAviso("Responda ao menos uma pergunta para gerar o mapa.");
      return;
    }
    if (perguntas && ids.length < perguntas.length) {
      var faltam = perguntas.length - ids.length;
      if (!confirm("Faltam " + faltam + " de " + perguntas.length +
          " perguntas. Gerar o mapa mesmo assim?")) return;
    }

    var O = window.HoloscanOficial;
    var r;
    if (O && O.disponivel()) {
      try {
        r = O.calcular(dadas, { patient_id: pacienteAtual() === SEM_PACIENTE ? null : pacienteAtual() });
      } catch (e) {
        if (e && e.codigo === "sem_pacote_oficial") { mostrarSemPacote(e); return; }
        mostrarAviso("O motor oficial recusou as respostas: " + (e && e.message ? e.message : e));
        return;
      }
    } else if ((modoHomologacao() || semServidor()) && window.HOLOSCAN && window.HOLOSCAN.calcular) {
      /* so revisao tecnica (?homologacao=1) ou modo local sem servidor: motor legado, sem contexto,
         marcado como homologacao (nunca salvo como aplicacao oficial) */
      try {
        r = window.HOLOSCAN.calcular(ids.map(function (id) { return { marcador_id: id, intensidade: dadas[id] }; }), {});
      } catch (e) {
        mostrarAviso("O motor recusou as respostas: " + e.message);
        return;
      }
      r.homologacao_legado = true;
      r.combinacoes = [];
    } else {
      mostrarSemPacote(O ? { motivos: O.motivos() } : null);
      return;
    }

    if (typeof window.aplicarPontuacao !== "function") {
      mostrarAviso("A tela do mapa não esta pronta para receber o resultado.");
      return;
    }
    // aplicarPontuacao desenha o mapa e fecha o questionario
    window.aplicarPontuacao(r);
    var radar = document.querySelector("#secao-holoscan #radar-svg");
    if (radar) radar.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function mostrarSemPacote(e) {
    var alvo = document.getElementById("q-resultado");
    if (!alvo) return;
    var msg = window.HoloscanOficial ? window.HoloscanOficial.MSG_SEM_PACOTE
      : "Não foi possível carregar o pacote metodológico oficial vigente. O mapa não pode ser gerado nem salvo.";
    var motivos = e && e.motivos && e.motivos.length ? e.motivos : [];
    alvo.innerHTML = '<div class="q-erro q-sem-pacote" id="q-sem-pacote"><p>' + escapar(msg) + "</p>" +
      (motivos.length ? '<p class="q-motivos">' + motivos.map(escapar).join("; ") + "</p>" : "") +
      "<p>Suas respostas continuam guardadas neste aparelho. Verifique a conexão e tente novamente.</p>" +
      '<button type="button" class="btn-verde" data-acao="tentar-novamente">Tentar novamente</button></div>';
  }

  function tentarNovamente() {
    var O = window.HoloscanOficial;
    var alvo = document.getElementById("q-resultado");
    if (alvo) alvo.innerHTML = '<p class="q-aviso">Carregando o pacote metodológico oficial…</p>';
    if (!O) { mostrarSemPacote(null); return Promise.resolve(false); }
    return O.recarregar().then(function (ok) {
      if (ok) { if (alvo) alvo.innerHTML = ""; calcular(); }
      else mostrarSemPacote({ motivos: O.motivos() });
      return ok;
    });
  }

  /* O aviso ficava num ponto da tela que podia estar fora de vista: com 0
     respostas, "Gerar o mapa" parecia nao fazer nada. Agora tambem vira
     toast e a tela rola ate ele. */
  function mostrarAviso(txt) {
    var alvo = document.getElementById("q-resultado");
    if (alvo) {
      alvo.innerHTML = '<p class="q-erro">' + escapar(txt) + "</p>";
      if (alvo.scrollIntoView) alvo.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (window.avisar) window.avisar(txt);
  }

  /* ---------- abrir e fechar --------------------------------------------- */

  function aberto() {
    var tela = document.getElementById("holoscan-questionario");
    return tela && !tela.classList.contains("hidden");
  }

  function abrir() {
    document.getElementById("holoscan-manual").classList.add("hidden");
    document.getElementById("holoscan-questionario").classList.remove("hidden");
    desenhar();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function fechar() {
    document.getElementById("holoscan-questionario").classList.add("hidden");
    document.getElementById("holoscan-manual").classList.remove("hidden");
  }

  /* O botao anunciava "87 perguntas" escrito na mao no HTML, e continuou
     anunciando 87 depois que passaram a ser 84. Quem sabe quantas sao e o
     motor. */
  function rotularBotao(botao) {
    if (!botao || !motorPronto()) return;
    if (!perguntas) perguntas = window.HOLOSCAN.questionario();
    botao.innerHTML = "Aplicar question\u00e1rio &mdash; " + perguntas.length + " perguntas";
  }

  /* ---------- encerrar uma aplicacao (rodada 08) -------------------------

     A caixa holohacking.questionario[pid] e o RASCUNHO da aplicacao em
     andamento. Salvo o HOLOSCAN, aquelas respostas passam a ser da aplicacao
     salva: vao para holohacking.respostas_aplicadas[pid] (so para rever o que
     foi respondido) e o rascunho fica vazio. Assim a proxima aplicacao comeca
     do zero: reaplicar nao e copiar a anterior em silencio. */
  var CHAVE_APLICADAS = "holohacking.respostas_aplicadas";

  function encerrarAplicacao(pid, appId, quando) {
    if (!pid) return;
    var t = tudo();
    var respostas = t[pid] || {};
    var ap;
    try { ap = JSON.parse(localStorage.getItem(CHAVE_APLICADAS)) || {}; } catch (e) { ap = {}; }
    if (Object.keys(respostas).length) {
      ap[pid] = { app: appId || null, quando: quando || null, respostas: respostas };
      localStorage.setItem(CHAVE_APLICADAS, JSON.stringify(ap));
    }
    delete t[pid];
    localStorage.setItem(CHAVE, JSON.stringify(t));
    if (window.Concorrencia) window.Concorrencia.avancarRevisao("questionario");
    if (aberto() && pacienteAtual() === pid) desenhar();
  }

  /** As respostas da ultima aplicacao salva deste paciente (so leitura). */
  function respostasAplicadas(pid) {
    try {
      var ap = JSON.parse(localStorage.getItem(CHAVE_APLICADAS)) || {};
      return (ap[pid] && ap[pid].respostas) || {};
    } catch (e) { return {}; }
  }

  window.QuestionarioHolo = {
    encerrarAplicacao: encerrarAplicacao,
    respostasAplicadas: respostasAplicadas,
    CHAVE_APLICADAS: CHAVE_APLICADAS
  };

  document.addEventListener("DOMContentLoaded", function () {
    caixa = document.getElementById("q-lista");
    if (!caixa) return;
    var abrirBtn = document.getElementById("btn-abrir-questionario");
    if (abrirBtn) abrirBtn.addEventListener("click", abrir);
    rotularBotao(abrirBtn);
    var voltar = document.getElementById("btn-voltar-manual");
    if (voltar) voltar.addEventListener("click", fechar);

    // trocar de paciente troca o questionario inteiro — e a chegada da lista
    // de pacientes conta como troca, porque ate ali nao se sabia de quem era
    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      if (aberto()) desenhar();
    };
  });
})();
