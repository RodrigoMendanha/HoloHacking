/* ===========================================================================
   ARQUIVOS — exames, documentos e relatorio
   ===========================================================================

   EXAMES
   Opcionais por construcao: na primeira consulta o paciente normalmente ainda
   nao tem nenhum. E — a regra que governa tudo — exame NUNCA mexe no Indice
   HOLOS. Se mexesse, um paciente que chega sem exame e volta com exame teria
   dois numeros que nao sao a mesma medida, e a comparacao de 4, 8 e 12 semanas
   morreria. O exame confronta o relato com o sangue; a divergencia entre os
   dois e o achado que uma anamnese sozinha nao pega.

   DOCUMENTOS
   Recebem o arquivo de verdade — PDF do exame, foto do laudo — guardado no
   IndexedDB do navegador (~10 GB, contra ~5 MB do localStorage, que um unico
   exame estouraria). Ver arquivo-store.js. Vive so nesta maquina: trocar de
   computador nao leva junto. Para dado de saude isso e mais seguro do que o
   Supabase esta hoje, que grava com chave publica e sem login.

   RELATORIO
   Montado dos bancos, sem IA: as mensagens de mensagens.csv em dois registros,
   nutri e paciente. Quando a chave da API entrar, o Holos AI escreve por cima
   disto — nao no lugar.
   =========================================================================== */

(function () {
  "use strict";

  var CHAVE_EX = "holohacking.exames";
  var CHAVE_PONT = "holohacking.pontuacao";
  var SEM_PACIENTE = "_sem_paciente";

  var NOME_SISTEMA = {
    fungico: "Sistema Fúngico",
    acido_inflamatorio: "Sistema Ácido-Inflamatório",
    metabolico: "Sistema Metabólico",
    detox_linfatico: "Sistema Detox + Linfático",
    mental_emocional_espiritual: "Sistema Mental–Emocional–Espiritual"
  };

  function motor() { return window.HOLOSCAN || null; }
  function paciente() {
    try { return (window.pacienteAtivoId && window.pacienteAtivoId()) || SEM_PACIENTE; }
    catch (e) { return SEM_PACIENTE; }
  }
  function nomePaciente() {
    try { return (window.pacienteAtivoNome && window.pacienteAtivoNome()) || null; }
    catch (e) { return null; }
  }
  function ler(chave) {
    try { return (JSON.parse(localStorage.getItem(chave)) || {})[paciente()] || {}; }
    catch (e) { return {}; }
  }
  function gravar(chave, dados) {
    var t;
    try { t = JSON.parse(localStorage.getItem(chave)) || {}; } catch (e) { t = {}; }
    t[paciente()] = dados;
    localStorage.setItem(chave, JSON.stringify(t));
    if (window.Concorrencia) window.Concorrencia.avancarRevisao("caixa:" + chave);
  }
  var escapar = window.escapar;
  function hoje() {
    var d = new Date();
    return String(d.getDate()).padStart(2, "0") + "/" +
           String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  }

  /* ============================================================ HOLOSCAN ===
     Camada de apresentacao sobre o confronto relato x laboratorio que o
     motor ja calcula (motor/src/exames.ts, confrontar()). O contrato do
     motor NAO muda nesta rodada — continua devolvendo
     concordancia: 'confirma'|'diverge'|'sem_exame', usado por
     testes/testar-exames.mjs, por panorama.js e pelo CSS existente (.conf-
     item.confirma/.diverge). O que muda e so como a TELA le esse resultado:
     tres estados, com texto fixo, nunca a frase `leitura` que o motor gera
     (tem tom causal — "e o que a anamnese nao pega" — e nao deve chegar a
     interface clinica nem ao relatorio do paciente).

     Regra de seguranca: qualquer caso que este mapeamento nao reconheca cai
     em DADOS_INSUFICIENTES — nunca inventa uma conclusao.

     O caso (relato sem alteracao + laboratorio sem alteracao) e CONVERGENTE
     tecnicamente (preserva o comportamento atual de concordancia), mas usa
     um texto proprio que nao conclui "saudavel"/"normal"/"sem prioridade" —
     decisao 4, redacao final PENDENTE RODRIGO. Para distinguir esse caso do
     de "relato baixo + exame alterado", usamos a MESMA nota-corte que o
     motor ja aplica por padrao dentro de confrontar() (limiteBaixo=3,
     motor/src/exames.ts) — nao e um corte novo, e o mesmo que decide
     'confirma' la dentro. */
  var HOLOSCAN_TEXTO = {
    CONVERGENTE: "Existe convergência entre o relato do paciente e os dados laboratoriais nesta dimensão.",
    CONVERGENTE_SEM_ALTERACAO: "Relato e dados laboratoriais disponíveis estão convergentes nesta dimensão.",
    DIVERGENTE: "O relato e os dados laboratoriais não estão caminhando na mesma direção neste momento.",
    DADOS_INSUFICIENTES: "Ainda não há dados laboratoriais suficientes para realizar a leitura integrada desta dimensão."
  };
  var HOLOSCAN_ROTULO = {
    CONVERGENTE: "Convergente",
    CONVERGENTE_SEM_ALTERACAO: "Convergente",
    DIVERGENTE: "Divergente",
    DADOS_INSUFICIENTES: "Dados insuficientes"
  };
  var HOLOSCAN_LIMITE_BAIXO = 3;

  function holoscanEstado(c) {
    if (!c || c.concordancia === "sem_exame") return "DADOS_INSUFICIENTES";
    if (c.concordancia === "diverge") return "DIVERGENTE";
    if (c.concordancia === "confirma") {
      return (c.nota !== null && c.nota !== undefined && c.nota <= HOLOSCAN_LIMITE_BAIXO)
        ? "CONVERGENTE" : "CONVERGENTE_SEM_ALTERACAO";
    }
    return "DADOS_INSUFICIENTES";
  }

  window.Holoscan = {
    estado: holoscanEstado,
    rotulo: function (c) { return HOLOSCAN_ROTULO[holoscanEstado(c)]; },
    texto: function (c) { return HOLOSCAN_TEXTO[holoscanEstado(c)]; }
  };

  /* Leitura do Holoscan na sua propria secao (#secao-confronto), logo abaixo
     do HOLOSCAN no menu — saiu de dentro de #secao-holoscan, onde era o
     item 8 e sugeria que o mapa se corrigia com exame.
     O lancamento dos valores continua na aba Documentos da ficha (nao move
     #ex-corpo nem os listeners de ligarPainel()) — este bloco e so leitura,
     por sistema: exames disponiveis, valor lancado, unidade, faixa cadastrada,
     estado do exame e o resultado do confronto (Holoscan). Chamado por
     irPara("confronto") e por desenharPontuacao(), ambos em app.js. */
  function modoHomologacao() { return !!(window.Metodologia && window.Metodologia.modoHomologacao && window.Metodologia.modoHomologacao()); }
  window.desenharHoloscan = function (alvoId) {
    var alvo = document.getElementById(alvoId || "holo-confronto");
    if (!alvo) return;
    /* Etapa 5 da V1: a Leitura Integrada oficial e a do pacote LI-V1 (sem regra
       homologada => sem dados suficientes, com motivo). O confronto legado
       (nota <= 3 + um exame fora da faixa cadastrada) so aparece em modo de
       homologacao, rotulado como legado — nunca como saida oficial. */
    if (window.Laboratorio && !modoHomologacao()) { window.Laboratorio.desenharLeituraIntegrada(alvo.id); return; }
    var g = motor();
    if (!g || !g.listaDeExames) { alvo.innerHTML = ""; return; }

    var lista = g.listaDeExames();
    var valores = ler(CHAVE_EX);
    var r = g.lerExames(valores, notasDoPaciente());
    var avaliadoPorId = {};
    r.exames.forEach(function (a) { avaliadoPorId[a.id] = a; });
    var confrontoPorSistema = {};
    r.confronto.forEach(function (c) { confrontoPorSistema[c.sistema] = c; });

    var porSistema = {};
    lista.forEach(function (e) { (porSistema[e.sistema] = porSistema[e.sistema] || []).push(e); });

    /* Sem cabeca propria: quando este bloco era o item 8 do HOLOSCAN ele
       precisava se apresentar no meio da pagina. Agora #secao-confronto ja
       tem titulo e subtitulo, e repetir "o que os exames acrescentam" duas
       vezes na mesma tela so empurrava o conteudo para baixo. O aviso de
       onde se lancam os valores foi para o cabecalho da secao. */
    var html = "";

    Object.keys(porSistema).forEach(function (sis) {
      var c = confrontoPorSistema[sis] || null;
      var estado = window.Holoscan.estado(c);
      html += '<div class="holo-dominante-sistema"><h5>' + NOME_SISTEMA[sis] +
        ' <span class="conf-selo ' + estado.toLowerCase() + '">' +
        escapar(window.Holoscan.rotulo(c)) + "</span></h5>";
      html += '<ul class="holo-dominante-lista">';
      porSistema[sis].forEach(function (e) {
        var v = valores[e.id];
        var a = avaliadoPorId[e.id];
        html += "<li>" + escapar(window.rotuloExibivel(e.exame)) + ": " +
          (v === undefined
            ? "sem valor lançado"
            : escapar(v) + " " + escapar(e.unidade) +
              " · faixa cadastrada " + escapar(e.faixa) +
              (a ? " · " + (a.situacao === "ok" ? "na faixa" : a.situacao === "baixo" ? "abaixo" : "acima") : "")
          ) + "</li>";
      });
      html += "</ul><p class=\"terr-conta\">" + escapar(window.Holoscan.texto(c)) + "</p></div>";
    });

    html += '<p class="arq-nota holo-fronteira">A Leitura Integrada organiza informações laboratoriais ' +
      "para apoiar a interpretação profissional. Não realiza diagnóstico.</p>";

    /* Etapa 0 da V1: a regra desta leitura (nota <= 3 x um exame fora da
       faixa cadastrada) ainda nao tem vinculo exame-dominio aprovado,
       suficiencia, temporalidade nem versao (Mestre §24). Ela fica, com o
       selo, para homologacao — nao como Leitura Integrada V1. */
    alvo.innerHTML = (window.Metodologia ? window.Metodologia.avisoHtml() : "") +
      '<p class="q-erro">LEGADO (modo de homologação): confronto antigo "nota ≤ 3 × um exame fora da faixa cadastrada". Não é a Leitura Integrada V1 e não é saída oficial.</p>' + html;
  };

  var dataBR = window.dataBR;

  /* ========================================== ABA HOLOSCAN (na ficha) =====
     Resumo compacto do mesmo confronto que window.desenharHoloscan() e
     #ex-confronto ja calculam — nao reimplementa nada, so mostra menos:
     a contagem por estado e a leitura por sistema, sem a grade de exame a
     exame que a secao HOLOSCAN completa (#secao-confronto) ja tem.

     HISTORICO DE COLETAS: holohacking.exames guarda so {examId: valor},
     sem data nenhuma — nao ha "coleta" persistida, so o ultimo valor
     lancado (proxima aplicacao sobrescreve). Por isso nao ha historico
     real para mostrar aqui; ver o aviso fixo no bloco correspondente e
     testes/testar-ficha-holoscan.mjs, onde isso fica registrado. Historico
     de coletas por data e trabalho para quando o Supabase entrar. */
  window.desenharHoloscanLaboratorial = desenharHoloscanAba;

  function desenharHoloscanAba() {
    var alvo = document.getElementById("aba-holoscan-laboratorial") || document.getElementById("aba-confronto");
    if (!alvo) return;
    if (window.Laboratorio && !modoHomologacao()) {
      /* Etapa 5 da V1: Leitura Integrada oficial (pacote LI-V1) na aba HOLOSCAN da ficha. */
      alvo.innerHTML = '<div class="fic-consultas-topo">' +
        '<button type="button" class="btn-verde" data-ir="aba:documentos">Registrar exames</button>' + "</div>" +
        '<div class="dash-bloco dash-bloco-compacto"><h3 class="dash-titulo">Leitura Integrada (V1)</h3><div id="aba-holoscan-laboratorial-li"></div>' +
        '<button type="button" class="fic-ir-min" data-ir="confronto">Abrir a Leitura Integrada completa</button></div>' +
        '<div class="fic-continuidade"><span class="fic-rot">HOLOSCAN &rarr; mapa de investigação</span>' +
        '<span class="fic-rot">Leitura Integrada &rarr; confronto por domínio com os exames (pacote LI-V1)</span></div>';
      window.Laboratorio.desenharLeituraIntegrada("aba-holoscan-laboratorial-li");
      ligarHoloscanAba();
      return;
    }
    var g = motor();
    if (!g || !g.listaDeExames || !window.Holoscan) { alvo.innerHTML = ""; return; }

    var valores = ler(CHAVE_EX);
    var quantidade = Object.keys(valores).length;
    var p = pontuacaoGuardada();
    var temMapa = Object.keys(notasDoPaciente()).length > 0;

    var topo = '<div class="fic-consultas-topo">' +
      '<button type="button" class="btn-verde" data-ir="aba:documentos">Registrar exames</button>' +
      (window.Metodologia ? window.Metodologia.selo("Leitura Integrada") : "") +
    "</div>" +
      /* Etapa 5: este caminho so roda em ?homologacao=1 (ou sem o modulo V1) — rotulado como legado */
      '<p class="q-erro">LEGADO (modo de homologação): confronto antigo "nota ≤ 3 × um exame fora da faixa cadastrada". Não é a Leitura Integrada V1 e não é saída oficial.</p>';

    // Secao 3: nao bloqueia o registro sem HOLOSCAN, so avisa que o
    // confronto depende de um mapa disponivel — a mesma frase que
    // #ex-confronto ja usa quando nao ha mapa (desenharConfronto()).
    var avisoSemMapa = !temMapa
      ? '<p class="dash-vazio">Sem HOLOSCAN aplicado, o confronto ainda não tem com o que comparar — ' +
        "toda dimensão aparece como dados insuficientes até existir um mapa.</p>"
      : "";

    if (quantidade === 0) {
      var falhouLeitura = window.Sincronizacao && window.Sincronizacao.falhou("exames");
      alvo.innerHTML = topo +
        (falhouLeitura
          ? '<div class="lista-vazia"><strong>Não foi possível carregar os exames do servidor</strong>' +
            "<span>Verifique a conexão e abra o app de novo. Nenhum exame foi apagado.</span></div>"
          : '<div class="lista-vazia"><strong>Nenhum exame registrado</strong>' +
            "<span>Registre exames para confrontar os dados laboratoriais com o mapa do HOLOSCAN.</span></div>") +
        avisoSemMapa;
      ligarHoloscanAba();
      return;
    }

    var r;
    try { r = g.lerExames(valores, notasDoPaciente()); }
    catch (e) { r = { confronto: [] }; }
    var confronto = r.confronto || [];

    // Secao 4: so os tres rotulos que window.Holoscan ja expoe — nunca uma
    // contagem calculada por fora dele.
    var contagem = { Convergente: 0, Divergente: 0, "Dados insuficientes": 0 };
    confronto.forEach(function (c) {
      var rot = window.Holoscan.rotulo(c);
      contagem[rot] = (contagem[rot] || 0) + 1;
    });

    var html = topo + avisoSemMapa;

    html += '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Última coleta</h3>' +
      '<p class="dash-sub">' + quantidade + (quantidade === 1 ? " exame registrado" : " exames registrados") +
        (temMapa && p ? " &middot; confrontado com o mapa de " + escapar(dataBR(p.quando)) : "") + "</p>" +
      '<div class="fic-piores-caixa"><div class="fic-piores">' +
        '<span class="fic-sis">Convergentes <b>' + contagem.Convergente + "</b></span>" +
        '<span class="fic-sis">Divergentes <b>' + contagem.Divergente + "</b></span>" +
        '<span class="fic-sis">Dados insuficientes <b>' + contagem["Dados insuficientes"] + "</b></span>" +
      "</div></div>" +
      '<button type="button" class="fic-ir-min" data-ir="confronto">Ver Leitura Integrada completa</button>' +
    "</div>";

    // Secao 5: nome + estado, com o mesmo .conf-item que #ex-confronto ja
    // usa — inclusive o mesmo window.Holoscan.texto(c) fixo, NUNCA a
    // `leitura` causal que o motor gera internamente.
    html += '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Leitura por sistema</h3>' +
      '<div class="conf-lista">' + confronto.map(function (c) {
        var estado = window.Holoscan.estado(c);
        return '<div class="conf-item ' + estado.toLowerCase() + '">' +
          '<span class="conf-selo">' + escapar(window.Holoscan.rotulo(c)) + "</span>" +
          "<b>" + NOME_SISTEMA[c.sistema] + "</b>" +
          '<span class="conf-nota">nota ' + (c.nota === null || c.nota === undefined ? "—" : c.nota.toFixed(1)) + "</span>" +
          '<span class="conf-leitura">' + escapar(window.Holoscan.texto(c)) + "</span></div>";
      }).join("") + "</div>" +
    "</div>";

    // Secao 6: com sessao, as coletas vem do servidor (sincronizacao.js),
    // da mais nova para a mais antiga. Sem leitura remota, o honesto e dizer
    // que so ha o estado atual — nao fingir um historico que nao existe.
    html += '<div class="dash-bloco dash-bloco-compacto">' +
      '<h3 class="dash-titulo">Histórico de coletas</h3>' + blocoColetas() + "</div>";

    // Secao 7: a relacao entre as duas camadas, sem linguagem de correcao.
    html += '<div class="fic-continuidade">' +
      '<span class="fic-rot">HOLOSCAN &rarr; mapa de investigação</span>' +
      '<span class="fic-rot">Leitura Integrada &rarr; integração com exames</span>' +
    "</div>";

    alvo.innerHTML = html;
    ligarHoloscanAba();
  }

  function blocoColetas() {
    var coletas = window.Sincronizacao ? window.Sincronizacao.coletas(paciente()) : null;
    if (!coletas) {
      var falhou = window.Sincronizacao && window.Sincronizacao.falhou("exames");
      return '<p class="dash-vazio">' + (falhou
        ? "Não foi possível ler o histórico de coletas do servidor agora. " +
          "Os valores acima são os salvos neste dispositivo."
        : "O HOLOSCAN mostra sempre o estado atual dos exames lançados — " +
          "não há coleta por data persistida neste dispositivo. O histórico por " +
          "coleta aparece quando você está conectado à sua conta.") + "</p>";
    }
    if (!coletas.length) return '<p class="dash-vazio">Nenhuma coleta registrada no servidor.</p>';
    return '<ul class="dash-pendentes">' + coletas.slice().reverse().map(function (c) {
      var n = (c.resultados || []).length;
      var quando = c.data_coleta_desconhecida || !c.coletado_em
        ? "Data da coleta não informada" : dataBR(c.coletado_em);
      return '<li class="dash-pendente">' +
        '<span class="pac-avatar">' + escapar(c.data_coleta_desconhecida || !c.coletado_em
          ? "?" : String(c.coletado_em).slice(8, 10)) + "</span>" +
        '<span class="dash-quem"><b>' + escapar(quando) + "</b>" +
          '<span class="dash-porque">' + n + (n === 1 ? " exame" : " exames") +
          (c.laboratorio ? " &middot; " + escapar(c.laboratorio) : "") + "</span></span>" +
      "</li>";
    }).join("") + "</ul>";
  }

  var holoscanAbaLigada = false;
  function ligarHoloscanAba() {
    if (holoscanAbaLigada) return;
    holoscanAbaLigada = true;
    var alvo = document.getElementById("aba-holoscan-laboratorial") || document.getElementById("aba-holoscan");
    if (!alvo) return;
    alvo.addEventListener("click", function (ev) {
      var ir = ev.target.closest("[data-ir]");
      if (!ir) return;
      // "aba:x" abre uma aba da mesma ficha; o resto e secao do menu — o
      // mesmo contrato que ficha.js (ligar()) e app.js ja seguem.
      if (ir.dataset.ir.indexOf("aba:") === 0) {
        var aba = document.querySelector('[data-aba="' + ir.dataset.ir.slice(4) + '"]');
        if (aba) aba.click();
        return;
      }
      var b = document.querySelector('.nav-item[data-secao="' + ir.dataset.ir + '"]');
      if (b) b.click();
    });
  }

  /* ================================================================ EXAMES */

  function notasDoPaciente() {
    var p = window.ultimaPontuacao ? window.ultimaPontuacao() : null;
    if (!p || !p.sistemas) return {};
    // so quem tem nota: sistema sem resposta nao entra no confronto como 10
    return window.HoloAusencia.notas(p);
  }

  function pontuacaoGuardada() {
    return window.ultimaPontuacao ? window.ultimaPontuacao() : null;
  }

  /* IDENTIDADE DA COLETA (rodada 08).

     O painel trabalha em um de dois modos, sempre visivel no topo:
       "nova"    Nova coleta — formulario VAZIO. Nunca herda os valores da
                 coleta anterior: um valor herdado seria gravado com a data
                 da coleta nova, e o sangue de marco passaria a ser de junho.
                 A excecao e o rascunho desta mesma coleta nova, ainda nao
                 salvo (digitado aqui e guardado para nao se perder).
       "editar"  Editar coleta existente — carrega os valores DAQUELA coleta,
                 com a data dela travada. Salvar troca os valores dela.
     Sem sessao nao ha coleta no servidor: o painel continua sendo o valor
     atual guardado neste navegador (legado local).

     O estado do salvamento aparece ao lado: Não salvo / Salvando... /
     Salvo / Não sincronizado (com "Tentar de novo"). "Salvo" so aparece
     depois que o servidor confirmou. */
  var modoColeta = { pid: null, tipo: "nova", coleta: null };
  var estadoSalvo = "";

  function coletasRemotas(pid) {
    /* Etapa 5: o painel legado so ve as coletas do proprio painel; as coletas V1 ficam em #lab-corpo */
    return window.Sincronizacao ? (window.Sincronizacao.coletasLegado ? window.Sincronizacao.coletasLegado(pid) : window.Sincronizacao.coletas(pid)) : null;
  }

  function rotuloColeta(c) {
    return (c.data_coleta_desconhecida || !c.coletado_em ? "sem data informada" : dataBR(c.coletado_em)) +
      (c.encounter_id ? " · vinculada a atendimento" : "");
  }

  /* V1, Etapa 1: o vinculo da coleta com o ATENDIMENTO e opcional e explicito
     (uma caixa marcada por quem atende). So aparece quando ha atendimento
     ativo deste paciente; nunca e deduzido pela data. */
  function atendimentoAtivoDaFicha() {
    var A = window.AtendimentoAtual;
    var pid = paciente();
    var e = A && A.atual ? A.atual() : null;
    return e && e.patient_id === pid ? e : null;
  }
  function blocoVinculoAtendimento(editando) {
    var e = atendimentoAtivoDaFicha();
    var jaVinculada = editando && modoColeta.coleta && modoColeta.coleta.encounter_id;
    if (!e && !jaVinculada) return "";
    if (!e && jaVinculada) {
      return '<span class="ex-vinculo" id="ex-vinculo">Vinculada a um atendimento</span>';
    }
    var marcada = jaVinculada ? modoColeta.coleta.encounter_id === e.id : false;
    return '<label class="ex-vinculo" id="ex-vinculo"><input type="checkbox" id="ex-vincular-atendimento"' +
      (marcada ? " checked" : "") + "> Vincular ao atendimento ativo (" +
      escapar(window.AtendimentoAtual.rotuloQuando(e)) + ")</label>";
  }
  /** O que mandar como encounter_id: undefined = nao mexer; null = desvincular; id = vincular. */
  function vinculoEscolhido(editando) {
    var cb = document.getElementById("ex-vincular-atendimento");
    var e = atendimentoAtivoDaFicha();
    if (!cb || !e) return undefined;
    if (cb.checked) return e.id;
    if (editando && modoColeta.coleta && modoColeta.coleta.encounter_id === e.id) return null;   // desmarcou
    return editando ? undefined : null;
  }

  var TEXTO_ESTADO = {
    nao_salvo: "Não salvo",
    salvando: "Salvando...",
    salvo: "Salvo",
    nao_sincronizado: "Não sincronizado",
    local: "Salvo neste dispositivo"
  };

  function mostrarEstadoSalvo(novo) {
    estadoSalvo = novo || "";
    var el = document.getElementById("ex-salvo");
    if (!el) return;
    el.className = "ex-salvo" + (estadoSalvo ? " " + estadoSalvo : "");
    el.innerHTML = estadoSalvo ? escapar(TEXTO_ESTADO[estadoSalvo] || "") +
      (estadoSalvo === "nao_sincronizado"
        ? ' <button type="button" class="btn-fantasma" data-acao="reenviar-ex">Tentar de novo</button>' : "")
      : "";
  }

  function estadoInicial(pid) {
    if (!temSupa() || !window.Sincronizacao) return "";
    var reg = window.Sincronizacao.estadoExames(pid);
    if (!reg) return "";
    if (reg.estado === "rascunho") return "nao_salvo";
    if (reg.estado === "pendente") return "nao_sincronizado";
    return "";
  }

  function desenharExames(opcoes) {
    opcoes = opcoes || {};
    var alvo = document.getElementById("ex-corpo");
    if (!alvo) return;
    var g = motor();
    if (!g || !g.listaDeExames) {
      alvo.innerHTML = '<p class="q-erro">O motor não carregou — sem ele não há banco de exames.</p>';
      return;
    }

    var pid = paciente();
    var coletas = coletasRemotas(pid);
    if (opcoes.editar && coletas) {
      var alvoCol = coletas.filter(function (c) { return c.id === opcoes.editar; })[0];
      if (alvoCol) modoColeta = { pid: pid, tipo: "editar", coleta: alvoCol };
    } else if (!opcoes.manter || modoColeta.pid !== pid) {
      modoColeta = { pid: pid, tipo: "nova", coleta: null };
    }
    var editando = modoColeta.tipo === "editar" && modoColeta.coleta;

    var lista = g.listaDeExames();
    var valores, dataInicial = "";
    var reg = temSupa() && window.Sincronizacao ? window.Sincronizacao.estadoExames(pid) : null;
    if (editando) {
      valores = window.Sincronizacao.valoresDaColeta(modoColeta.coleta);
      dataInicial = modoColeta.coleta.data_coleta_desconhecida ? "" : (modoColeta.coleta.coletado_em || "");
    } else if (coletas && !(reg && (reg.estado === "rascunho" || reg.estado === "pendente"))) {
      valores = {};                             // nova coleta: nada herdado
    } else {
      valores = ler(CHAVE_EX);                  // rascunho desta coleta nova, ou legado local
      /* so o PENDENTE carrega a data com que foi registrado; o rascunho
         herda do registro anterior a data da coleta passada */
      if (reg && reg.estado === "pendente" && reg.coletado_em) dataInicial = reg.coletado_em;
    }
    var porSistema = {};
    lista.forEach(function (e) {
      (porSistema[e.sistema] = porSistema[e.sistema] || []).push(e);
    });

    var cabecalho = '<div class="ex-modo" id="ex-modo">' +
      (editando
        ? '<b>Editar coleta existente</b> &middot; coleta de ' + escapar(rotuloColeta(modoColeta.coleta)) +
          ' <button type="button" class="btn-fantasma" data-acao="nova-coleta">Nova coleta</button>'
        : "<b>Nova coleta</b>" + (coletas ? " &middot; o formulário começa vazio; para mudar uma coleta já registrada, use Editar na lista abaixo" : "")) +
      "</div>";

    var html = cabecalho +
      '<div class="ex-acoes">' +
      '<label class="ex-data" for="ex-data-coleta">Data da coleta ' +
        '<input type="date" id="ex-data-coleta" required max="' + hojeISO() + '"' +
        (dataInicial ? ' value="' + escapar(dataInicial) + '"' : "") +
        (editando ? " disabled" : "") + "></label>" +
      blocoVinculoAtendimento(editando) +
      '<button type="button" class="btn-verde" data-acao="conferir">' +
        (editando ? "Salvar alterações" : "Conferir com o mapa") + "</button>" +
      '<button type="button" class="btn-fantasma" data-acao="limpar-ex">Limpar</button>' +
      (reg && reg.estado === "rascunho" && coletas && !editando
        ? '<button type="button" class="btn-fantasma" data-acao="descartar-ex">Descartar rascunho</button>' : "") +
      '<span class="ex-conta"></span>' +
      '<span class="ex-salvo" id="ex-salvo" role="status" aria-live="polite"></span>' +
      '<span class="ex-data-erro" id="ex-data-erro" role="alert"></span></div>' +
      '<div id="ex-confronto"></div>';

    Object.keys(porSistema).forEach(function (sis) {
      html += '<div class="ex-bloco"><h4>' + NOME_SISTEMA[sis] + "</h4>";
      porSistema[sis].forEach(function (e) {
        var v = valores[e.id];
        html += '<div class="ex-linha" data-exame="' + e.id + '">' +
          '<span class="ex-nome">' + escapar(window.rotuloExibivel(e.exame)) + "</span>" +
          '<span class="ex-faixa">faixa cadastrada ' + e.faixa + " " + escapar(e.unidade) + "</span>" +
          '<input type="number" step="any" inputmode="decimal" value="' +
            (v === undefined ? "" : escapar(v)) + '" placeholder="—">' +
          '<span class="ex-situacao"></span></div>';
      });
      html += "</div>";
    });

    html += '<p class="arq-nota">As faixas são as da literatura funcional, mais estreitas ' +
      'que as do laboratório de propósito: laboratório marca doença, aqui se olha terreno. ' +
      '<b>São rascunho, não homologadas clinicamente, e esperam a revisão do Rodrigo.</b></p>';

    html += blocoColetasDoPainel(coletas);
    if (window.limpaSuja) window.limpaSuja("exames");

    alvo.innerHTML = html;
    ligarPainel();
    conferir(false, true);
    mostrarEstadoSalvo(editando ? "" : estadoInicial(pid));
  }

  /** A lista de coletas do servidor dentro do painel, com Editar e Excluir. */
  function blocoColetasDoPainel(coletas) {
    if (!coletas) return "";
    if (!coletas.length) return '<div class="ex-coletas"><h4>Coletas registradas</h4>' +
      '<p class="dash-vazio">Nenhuma coleta registrada no servidor.</p></div>';
    return '<div class="ex-coletas"><h4>Coletas registradas</h4><ul class="ex-coletas-lista">' +
      coletas.slice().reverse().map(function (c) {
        var n = (c.resultados || []).length;
        var atual = modoColeta.tipo === "editar" && modoColeta.coleta && modoColeta.coleta.id === c.id;
        return '<li class="ex-coleta' + (atual ? " atual" : "") + '" data-coleta="' + escapar(c.id) + '">' +
          "<b>" + escapar(rotuloColeta(c)) + "</b> &middot; " + n + (n === 1 ? " exame" : " exames") +
          ' <button type="button" class="btn-fantasma" data-acao="editar-coleta" data-coleta="' + escapar(c.id) + '">Editar</button>' +
          ' <button type="button" class="btn-fantasma btn-perigo-leve" data-acao="excluir-coleta" data-coleta="' + escapar(c.id) + '">Excluir coleta</button>' +
          "</li>";
      }).join("") + "</ul></div>";
  }

  function excluirColetaComConfirmacao(coletaId) {
    var pid = paciente();
    if (window.bloqueioArquivado && window.bloqueioArquivado(pid)) return Promise.resolve(false);
    var coletas = coletasRemotas(pid) || [];
    var c = coletas.filter(function (x) { return x.id === coletaId; })[0];
    if (!c || !window.Sincronizacao) return Promise.resolve(false);
    var n = (c.resultados || []).length;
    var perguntar = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({
          titulo: "Excluir coleta",
          subtitulo: "Coleta de " + rotuloColeta(c),
          corpo: "<p>Esta coleta e os " + n + (n === 1 ? " resultado" : " resultados") +
                 " dela serão removidos do servidor. As outras coletas não mudam.</p>" +
                 "<p>Esta ação não pode ser desfeita.</p>",
          botaoConfirmar: "Excluir coleta"
        })
      : Promise.resolve(window.confirm("Excluir a coleta de " + rotuloColeta(c) + "?") ? "confirmar" : null);
    return perguntar.then(function (r) {
      if (r !== "confirmar") return false;
      return window.Sincronizacao.excluirColeta(pid, coletaId).then(function (res) {
        if (!res.ok) {
          if (window.avisar) window.avisar(res.motivo === "offline"
            ? "Sem conexão com a sua conta — a coleta não foi excluída."
            : "Não foi possível excluir a coleta no servidor. Nada foi apagado; tente de novo.");
          return false;
        }
        if (pid !== paciente()) return true;
        if (window.avisar) window.avisar("Coleta excluída.");
        var manter = !(modoColeta.tipo === "editar" && modoColeta.coleta && modoColeta.coleta.id === coletaId);
        desenharExames({ manter: manter });
        desenharHoloscanAba();
        return true;
      });
    });
  }

  function colherExames() {
    var v = {};
    document.querySelectorAll("#ex-corpo .ex-linha").forEach(function (l) {
      var txt = l.querySelector("input").value.trim();
      if (txt !== "") v[l.dataset.exame] = Number(txt.replace(",", "."));
    });
    return v;
  }

  function temSupa() {
    return window.supabaseClient && window.HoloAuth && window.HoloAuth.sessaoAtiva();
  }

  /* A data da COLETA: o campo "Data da coleta" do painel. E obrigatoria
     para registrar e nunca pode ser futura. Vai para o servidor como
     coletado_em (a data CLINICA), nunca "hoje" por conta propria: o momento
     do registro continua no created_at/updated_at da linha, dado tecnico.
     Coletas antigas sem data continuam "Data da coleta não informada". */
  function hojeISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0");
  }

  /** "" se a data serve; senao, a frase que a tela mostra. */
  function problemaDataColeta(v) {
    v = String(v || "").trim();
    if (!v) return "Informe a data da coleta para registrar os exames.";
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    var d = m && new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!d || d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 ||
        d.getDate() !== Number(m[3])) return "Data da coleta inválida.";
    /* Etapa 0 da V1: a recusa de data futura (Rodada 08) saiu daqui. Nao e
       contrato do Documento Mestre; esta PENDENTE de decisao de produto/
       clinica (supabase/migrations-pendentes/). So o formato e conferido. */
    return "";
  }

  function dataDaColeta() {
    var c = document.getElementById("ex-data-coleta");
    return c ? String(c.value || "").trim() : "";
  }

  /** Registrar = conferir E salvar. Sem data valida, confere na tela mas
      nao salva no servidor, e diz por que. Em "Nova coleta" a data NAO e
      identidade: duas coletas na mesma data sao duas coletas, cada uma com
      o seu id (Etapa 0 da V1, Mestre §22). Para mudar os valores de uma
      coleta existente, o caminho e "Editar", pelo id dela. */
  function registrar() {
    if (window.bloqueioArquivado && window.bloqueioArquivado(paciente())) return Promise.resolve(false);
    var editando = modoColeta.tipo === "editar" && modoColeta.coleta;
    var alvo = document.getElementById("ex-data-erro");
    var erro = editando ? "" : problemaDataColeta(dataDaColeta());
    if (alvo) alvo.textContent = erro;
    if (erro) {
      conferir();                 // o digitado ja ficou como rascunho (input)
      if (window.avisar) window.avisar(erro);
      var c = document.getElementById("ex-data-coleta");
      if (c && !editando) c.focus();
      return Promise.resolve(false);
    }
    return conferir(true);
  }

  var MSG_FALHA_COLETA = "Exames salvos só neste dispositivo — não foi possível enviar ao servidor. " +
                         "Eles serão reenviados na próxima vez que o app abrir com conexão.";

  /** Salva no servidor e AVISA se nao conseguiu. Em "Nova coleta" o valor
      local ja foi gravado antes (conferir) e continua, marcado como
      pendente: a proxima carga tenta de novo com a data em que foi
      registrado. Devolve Promise<boolean> (true = o servidor confirmou). */
  function salvarColetaSupa(valores) {
    if (!temSupa() || !window.Sincronizacao) {
      mostrarEstadoSalvo("local");
      return Promise.resolve(false);
    }
    var pid = paciente();
    if (!pid || pid === SEM_PACIENTE) return Promise.resolve(false);
    if (Object.keys(valores).length === 0) {
      mostrarEstadoSalvo("");
      if (window.avisar) window.avisar("Preencha ao menos um exame para registrar a coleta.");
      return Promise.resolve(false);
    }
    var editando = modoColeta.tipo === "editar" && modoColeta.coleta ? modoColeta.coleta : null;
    var data = editando ? (editando.data_coleta_desconhecida ? null : editando.coletado_em) : dataDaColeta();
    /* Etapa 0 da V1: identidade pelo id. Editar = o id da coleta escolhida;
       nova = sem id (sincronizacao.js gera um novo), mesmo que ja exista
       coleta nessa data. */
    var opcoes = editando ? { coletaId: editando.id, modo: "editar" } : { modo: "nova" };
    var vinculo = vinculoEscolhido(!!editando);
    if (vinculo !== undefined) opcoes.encounterId = vinculo;
    mostrarEstadoSalvo("salvando");
    var botao = document.querySelector('#ex-corpo [data-acao="conferir"]');
    if (botao) botao.disabled = true;
    return window.Sincronizacao.salvarColeta(pid, valores, data, opcoes).then(function (r) {
      if (botao) botao.disabled = false;
      if (r.ok) {
        return window.Sincronizacao.atualizarColetas(pid).then(function () {
          if (pid !== paciente()) return true;
          /* o que ficou salvo vira o valor atual deste aparelho; e o painel
             passa a EDITAR a coleta que acabou de ser gravada (salvar de
             novo nao cria uma segunda) */
          gravar(CHAVE_EX, valores);
          var col = (coletasRemotas(pid) || []).filter(function (c) { return c.id === r.coleta; })[0];
          if (col) desenharExames({ editar: col.id });
          mostrarEstadoSalvo("salvo");
          desenharHoloscanAba();
          return true;
        });
      }
      if (pid !== paciente()) return false;
      if (r.motivo === "vazio" || r.motivo === "offline") { mostrarEstadoSalvo("local"); return false; }
      if (window.erroDeArquivado && window.erroDeArquivado(r.erro)) {
        mostrarEstadoSalvo("nao_salvo");
        if (window.avisar) window.avisar(window.MSG_ARQUIVADO);
        return false;
      }
      mostrarEstadoSalvo(editando ? "nao_salvo" : "nao_sincronizado");
      if (window.avisar) window.avisar(editando
        ? "Não foi possível salvar as alterações da coleta no servidor. Nada mudou lá; tente de novo."
        : MSG_FALHA_COLETA);
      return false;
    });
  }

  /** "Tentar de novo" de um envio pendente: reenvia O MESMO registro (mesma
      data, mesma coleta), sem o modo "nova" — se o primeiro envio chegou e
      so a resposta se perdeu, ele cai na mesma coleta. */
  function reenviarColeta() {
    var pid = paciente();
    var reg = window.Sincronizacao && window.Sincronizacao.estadoExames(pid);
    if (!reg || reg.estado !== "pendente") return registrar();
    mostrarEstadoSalvo("salvando");
    return window.Sincronizacao.salvarColeta(pid, ler(CHAVE_EX), reg.coletado_em || null,
        reg.coletaPropria && reg.coleta ? { coletaId: reg.coleta } : {})
      .then(function (r) {
        if (pid !== paciente()) return r.ok;
        if (!r.ok) {
          mostrarEstadoSalvo("nao_sincronizado");
          if (window.avisar) window.avisar(MSG_FALHA_COLETA);
          return false;
        }
        return window.Sincronizacao.atualizarColetas(pid).then(function () {
          if (pid !== paciente()) return true;
          desenharExames({ editar: r.coleta });
          mostrarEstadoSalvo("salvo");
          desenharHoloscanAba();
          return true;
        });
      });
  }

  /** conferir(salvarNoSupa, soDesenho): refaz a leitura na tela.
        soDesenho  so desenha (abrir o painel nao e editar: nao grava nada)
      Em "Editar coleta existente" o digitado fica so no formulario ate
      salvar — o valor atual deste aparelho continua o da coleta atual. */
  function conferir(salvarNoSupa, soDesenho) {
    var g = motor();
    if (!g) return Promise.resolve(false);
    var valores = colherExames();
    var editando = modoColeta.tipo === "editar" && modoColeta.coleta;
    if (!soDesenho && !editando) {
      var antes = JSON.stringify(ler(CHAVE_EX));
      gravar(CHAVE_EX, valores);
      /* digitado e ainda nao conferido: a sincronizacao nao pode trocar isto
         pelo valor do servidor na proxima carga */
      if (!salvarNoSupa && JSON.stringify(valores) !== antes && window.Sincronizacao) {
        window.Sincronizacao.marcarRascunhoExames(paciente());
      }
    }
    if (!soDesenho && !salvarNoSupa) mostrarEstadoSalvo(temSupa() ? "nao_salvo" : "");
    /* editar coleta existente: o digitado so existe no formulario — sair sem
       salvar pergunta. (Na coleta nova o rascunho ja fica guardado.) */
    if (!soDesenho && !salvarNoSupa && editando && window.marcaSuja) window.marcaSuja("exames");

    var conta = document.querySelector("#ex-corpo .ex-conta");
    var n = Object.keys(valores).length;
    if (conta) conta.textContent = n === 0 ? "nenhum valor preenchido"
                                           : n + " exame(s) preenchido(s)";

    var r = g.lerExames(valores, notasDoPaciente());

    // marca cada linha
    document.querySelectorAll("#ex-corpo .ex-linha").forEach(function (l) {
      var a = r.exames.filter(function (x) { return x.id === l.dataset.exame; })[0];
      var s = l.querySelector(".ex-situacao");
      l.classList.remove("alterado");
      if (!a) { s.textContent = ""; return; }
      if (a.situacao === "ok") { s.textContent = "na faixa"; s.className = "ex-situacao ok"; return; }
      s.textContent = a.situacao === "baixo" ? "abaixo" : "acima";
      s.className = "ex-situacao fora";
      l.classList.add("alterado");
      // Revisao clinica do HOLOSCAN: o tooltip deixou de mostrar o texto
      // cru de exames.csv (leitura_baixo/leitura_alto) — frases como
      // "Resistência à insulina instalada" ou "Sobrecarga hepática" vazando
      // direto no DOM. O CSV continua intacto para revisao futura; a tela
      // so descreve o numero, nao a interpretacao.
      l.title = "Valor " + a.valor + " " + a.unidade + " · faixa cadastrada " + a.faixa +
        " · " + (a.situacao === "baixo" ? "abaixo" : "acima") + " da faixa cadastrada. " +
        "Faixa em revisão — não homologada clinicamente.";
    });

    desenharConfronto(r, n);
    // #holo-confronto (em #secao-confronto) le os MESMOS exames — sem
    // isso, editar um exame aqui na aba Documentos deixava aquele bloco
    // parado na leitura de antes ate o proximo "Salvar HOLOSCAN".
    if (window.desenharHoloscan) window.desenharHoloscan("holo-confronto");

    if (salvarNoSupa) return salvarColetaSupa(valores);
    return Promise.resolve(false);
  }

  function desenharConfronto(r, quantos) {
    var alvo = document.getElementById("ex-confronto");
    if (!alvo) return;

    // Revisao clinica do HOLOSCAN (Confronto Clínico): nao esconde mais o bloco so
    // porque nenhum exame foi lancado ainda — sem exame e DADOS
    // INSUFICIENTES, um estado que a tela precisa mostrar, nao omitir.

    var temMapa = Object.keys(notasDoPaciente()).length > 0;
    if (!temMapa) {
      alvo.innerHTML = '<p class="arq-nota">Aplique o questionário do HOLOSCAN ' +
        'para este paciente e o exame passa a ser confrontado com o mapa.</p>';
      return;
    }

    // Revisao clinica do HOLOSCAN (Confronto Clínico): os tres estados aparecem
    // sempre, incluindo DADOS INSUFICIENTES — antes a linha simplesmente
    // sumia quando nao havia exame do sistema, e a ausencia de dado nao
    // pode virar ausencia de linha na tela. O texto e sempre o do Holoscan,
    // nunca a `leitura` que o motor gera internamente (ver window.Holoscan).
    var html = '<h4 class="leitura-titulo">Relato e laboratório (Leitura Integrada)</h4>' +
               '<div class="conf-lista">';
    r.confronto.forEach(function (c) {
      var estado = window.Holoscan.estado(c);
      html += '<div class="conf-item ' + estado.toLowerCase() + '">' +
        '<span class="conf-selo">' + escapar(window.Holoscan.rotulo(c)) + "</span>" +
        "<b>" + NOME_SISTEMA[c.sistema] + "</b>" +
        '<span class="conf-nota">nota ' + (c.nota === null ? "—" : c.nota.toFixed(1)) + "</span>" +
        '<span class="conf-leitura">' + escapar(window.Holoscan.texto(c)) + "</span></div>";
    });
    html += "</div>";
    var divergem = r.confronto.filter(function (c) { return window.Holoscan.estado(c) === "DIVERGENTE"; }).length;
    if (divergem > 0) {
      html += '<p class="arq-nota conf-alerta">' + divergem +
        ' dimensão(ões) com divergência — aprofundar na consulta.</p>';
    }
    html += '<p class="arq-nota holo-fronteira">A Leitura Integrada organiza informações ' +
      'laboratoriais para apoiar a interpretação profissional. Não realiza diagnóstico.</p>';
    alvo.innerHTML = html;
  }

  if (window.registrarSujeira) {
    window.registrarSujeira("exames", {
      salvar: function () { return registrar(); },
      descartar: function () { desenharExames({ manter: true }); }
    });
  }

  var painelLigado = false;

  /** O que é delegado no container: prende uma vez, para a vida da página. */
  function ligarPainel() {
    if (painelLigado) return;
    painelLigado = true;
    var painel = document.getElementById("aba-documentos");
    if (!painel) return;

    painel.addEventListener("input", function (ev) {
      if (ev.target.matches(".ex-linha input")) conferir();
      if (ev.target.id === "ex-data-coleta") {
        var erro = document.getElementById("ex-data-erro");
        if (erro) erro.textContent = "";
      }
    });

    painel.addEventListener("click", function (ev) {
      var a = ev.target.closest("[data-acao]");
      if (a) {
        if (a.dataset.acao === "conferir") registrar();
        if (a.dataset.acao === "limpar-ex") {
          document.querySelectorAll("#ex-corpo .ex-linha input").forEach(function (i) { i.value = ""; });
          conferir();
        }
        if (a.dataset.acao === "nova-coleta") desenharExames();
        if (a.dataset.acao === "editar-coleta") desenharExames({ editar: a.dataset.coleta });
        if (a.dataset.acao === "excluir-coleta") excluirColetaComConfirmacao(a.dataset.coleta);
        if (a.dataset.acao === "reenviar-ex") reenviarColeta();
        if (a.dataset.acao === "descartar-ex" && window.Sincronizacao) {
          window.Sincronizacao.descartarRascunhoExames(paciente());
          desenharExames();
          desenharHoloscanAba();
        }
        // O botao do topo e o do estado vazio so abrem o MESMO seletor de
        // arquivo que a zona de arrastar ja usa — nao e um fluxo novo.
        if (a.dataset.acao === "adicionar-documento") {
          var campoArq = document.getElementById("doc-arquivo");
          if (campoArq) campoArq.click();
        }
        return;
      }
      var lancar = ev.target.closest("[data-lancar]");
      if (lancar) {
        if (window.Laboratorio && window.Laboratorio.lancarExame) window.Laboratorio.lancarExame(lancar.dataset.lancar, paciente());
        return;
      }
      var abrir = ev.target.closest("[data-abrir]");
      if (abrir) {
        window.ArquivoStore.pegar(abrir.dataset.abrir).then(function (r) {
          if (!r || !r.arquivo) {
            if (window.avisar) window.avisar("Arquivo indisponível. Pode ter sido removido.");
            return;
          }
          var url = URL.createObjectURL(r.arquivo);
          window.open(url, "_blank");
          setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        }).catch(function () {
          if (window.avisar) window.avisar("Erro ao abrir o arquivo.");
        });
        return;
      }
      var tirar = ev.target.closest("[data-tirar]");
      if (tirar) {
        window.excluirDocumento(tirar.dataset.tirar, tirar.dataset.nome, paciente())
          .then(function (saiu) { if (saiu) listarDocumentos(); });
      }
    });
  }

  /* EXCLUIR DOCUMENTO (rodada 08) — um caminho so, para a aba da ficha e a
     tela Documentos: confirma no modal global, exclui a linha e o arquivo,
     e diz o que aconteceu de verdade (inclusive se so o arquivo ficou para
     tras). Paciente arquivado nao tem documento excluido. Resolve true se
     o documento saiu. */
  window.excluirDocumento = function (id, nome, pid) {
    if (pid && window.bloqueioArquivado && window.bloqueioArquivado(pid)) return Promise.resolve(false);
    var perguntar = window.abrirModalConfirmar
      ? window.abrirModalConfirmar({
          titulo: "Excluir documento",
          subtitulo: nome || "",
          corpo: "<p>O documento e o arquivo guardado dele serão removidos. " +
                 "Esta ação não pode ser desfeita.</p>",
          botaoConfirmar: "Excluir documento"
        })
      : Promise.resolve(confirm("Excluir este documento? Esta ação não pode ser desfeita.") ? "confirmar" : null);
    return perguntar.then(function (r) {
      if (r !== "confirmar") return false;
      return window.ArquivoStore.remover(id).then(function (res) {
        if (window.avisar) {
          window.avisar(res && res.armazenamento === "falhou"
            ? "Documento excluído da ficha, mas o arquivo não pôde ser removido do armazenamento " +
              "agora. Ele não aparece para ninguém; avise o suporte."
            : "Documento excluído.");
        }
        return true;
      }, function (err) {
        console.error("[documentos] excluir:", err && err.message ? err.message : err);
        if (window.avisar) window.avisar("Não foi possível excluir o documento — ele continua na ficha. " +
                                         "Tente de novo.");
        return false;
      });
    });
  };

  /* =========================================================== DOCUMENTOS */

  function desenharDocumentos() {
    var alvo = document.getElementById("aba-documentos");
    if (!window.ArquivoStore) {
      alvo.innerHTML = '<p class="q-erro">O guardador de arquivos nao carregou.</p>';
      return;
    }

    alvo.innerHTML =
      '<div class="fic-consultas-topo">' +
        '<button type="button" class="btn-verde" data-acao="adicionar-documento">Adicionar documento</button>' +
      "</div>" +

      '<p class="arq-intro">O papel que o paciente traz e os números que saem dele. ' +
      "São a mesma coisa em dois passos: primeiro o arquivo fica guardado, depois " +
      "você lê o que ele diz e lança aqui embaixo. " +
      (temSupa()
        ? "<b>O arquivo vai para o armazenamento privado da sua conta</b> e fica em cópia neste navegador.</p>"
        : "<b>O arquivo fica guardado neste navegador</b> e não vai para lugar nenhum.</p>") +

      '<section class="arq-cartao" aria-label="Documentos do paciente">' +
        '<h4 class="arq-titulo">O que o paciente trouxe</h4>' +
        '<p class="arq-sub">PDF do exame, foto do laudo, receita de outro ' +
        "profissional, termo de consentimento.</p>" +
        '<div class="doc-solta" id="doc-solta">' +
          '<input type="file" id="doc-arquivo" multiple ' +
          'accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.csv">' +
          '<div class="doc-solta-texto"><b>Arraste o arquivo aqui</b>' +
          "<span>ou clique para escolher &middot; PDF, foto ou texto</span></div>" +
        "</div>" +
        '<div class="doc-meta">' +
          '<input type="text" id="doc-nome" placeholder="Nome (opcional — usa o do arquivo)" aria-label="Nome do documento">' +
          '<select id="doc-tipo" aria-label="Tipo do documento">' +
          ["Exame laboratorial", "Laudo", "Receita", "Termo de consentimento", "Foto", "Outro"]
            .map(function (x) { return "<option>" + x + "</option>"; }).join("") +
          '</select><input type="date" id="doc-data" aria-label="Data do documento" title="Data do documento (para exame: data da coleta ou do laudo)"></div>' +
        '<div id="doc-pendente" class="doc-pendente hidden"></div>' +
        '<div id="doc-aviso"></div>' +
        '<p class="dash-sub" id="doc-total"></p>' +
        '<div id="doc-lista"></div>' +
        '<p class="arq-nota" id="doc-espaco"></p>' +
      "</section>" +

      '<section class="arq-cartao" aria-label="Exames laboratoriais (V1)">' +
        '<h4 class="arq-titulo">Exames laboratoriais</h4>' +
        '<div id="lab-corpo"></div>' +
      "</section>" +

      /* Etapa 5 da V1: o painel abaixo e LEGADO (24 itens de exames.csv, faixa
         "ideal" nao homologada, confronto antigo). Fica isolado, rotulado e
         fora da saida oficial ate ser desligado; a entrada oficial e #lab-corpo. */
      /* auditoria Leitura Integrada: o painel legado ficava aberto ao lado do novo, e era facil
         lancar exame no painel errado (que nao alimenta a Leitura Integrada). Fica recolhido. */
      '<details class="arq-legado-det"><summary>Painel legado de exames (valores locais) — fora da saída oficial; use "Exames laboratoriais" acima</summary>' +
      '<section class="arq-cartao arq-legado" aria-label="Painel legado de exames">' +
        '<h4 class="arq-titulo">Painel legado (valores locais) — fora da saída oficial</h4>' +
        '<p class="arq-sub"><b>Legado.</b> Lista fixa de 24 itens com "faixa cadastrada" de rascunho, sem fonte homologada. ' +
        "Não alimenta Leitura Integrada, Evolução oficial, relatórios nem HOLOS AI. Use o painel acima para registrar coletas.</p>" +
        '<p class="fluxo-clinico">História &rarr; HOLOSCAN &rarr; <b>Leitura Integrada</b> &rarr; Aprofundamento &rarr; Interpretação &rarr; Conduta &rarr; Evolução</p>' +
        '<p class="arq-sub">Opcional. Na primeira consulta o paciente costuma não ter ' +
        "exame nenhum, e o mapa não depende disto. O exame <b>não altera o Índice</b> " +
        "&mdash; ele confronta o que o paciente relatou com o que o sangue mostra.</p>" +
        '<div id="ex-atalhos"></div>' +
        '<div id="ex-corpo"></div>' +
      "</section></details>" +

      '<div class="fic-continuidade">' +
        '<span class="fic-rot">Consulta &rarr; HOLOSCAN &rarr; Leitura Integrada &rarr; Documentos</span>' +
      "</div>";

    ligarDocumentos();
    listarDocumentos();
    desenharExames();
    if (window.Laboratorio) window.Laboratorio.desenhar();
  }

  /* Os exames guardados viram botão: abrir o PDF ao lado enquanto se digita é
     o gesto todo desta tela. Só aparece quando existe documento de exame —
     um botão que não abre nada seria pior do que nenhum. */
  function desenharAtalhosDeExame(itens) {
    var alvo = document.getElementById("ex-atalhos");
    if (!alvo) return;
    var deExame = itens.filter(function (d) {
      return /exame|laudo/i.test(d.tipo || "");
    });
    if (!deExame.length) { alvo.innerHTML = ""; return; }
    alvo.innerHTML = '<div class="ex-atalhos">' +
      '<span class="ex-atalhos-rot">Abrir ao lado</span>' +
      deExame.map(function (d) {
        return '<button type="button" class="ex-atalho" data-abrir="' + escapar(d.id) + '">' +
          escapar(d.nome) + "</button>";
      }).join("") + "</div>";
  }

  /* Laudo de exame (PDF ou imagem salvo no servidor): o arquivo sozinho nao
     alimenta a Leitura Integrada — os valores entram numa coleta. O botao abre
     a coleta ja ligada a este documento, com o laudo ao lado (testes reais 06/10). */
  function seloLancamento(d) {
    if (!d._supa_id || !/pdf|image/i.test(d.mime || "") || !window.Laboratorio) return "";
    var cs = window.Laboratorio.coletasDoDocumento ? window.Laboratorio.coletasDoDocumento(d._supa_id, paciente()) : null;
    var selo = cs === null ? "" : cs.length
      ? '<span class="doc-lancado" title="Valores lançados numa coleta">valores lançados</span>'
      : '<span class="doc-nao-lancado" title="O arquivo está guardado, mas os valores ainda não foram lançados numa coleta">sem valores lançados</span>';
    return selo + '<button type="button" class="doc-lancar" data-lancar="' + escapar(d._supa_id) + '">' + (cs && cs.length ? "lançar outra coleta" : "Lançar valores deste exame") + "</button>";
  }

  document.addEventListener("laboratorio:carregado", function (ev) {
    if (ev.detail && ev.detail.pid === paciente() && document.getElementById("doc-lista")) listarDocumentos();
  });

  function listarDocumentos() {
    var alvo = document.getElementById("doc-lista");
    if (!alvo) return;
    window.ArquivoStore.listar(paciente()).then(function (itens) {
      var total = document.getElementById("doc-total");
      // ArquivoStore.listar() ja devolve em ordem decrescente de data (e sem
      // data, por ultimo) — e a mesma lista que ja serve de "documentos
      // recentes": nao ha por que destacar um segundo bloco so com os
      // primeiros itens dela.
      if (itens.length === 0) {
        if (total) total.textContent = "";
        // Rodada de consistencia: o CTA do topo (.fic-consultas-topo) ja
        // cobre o "Adicionar documento" — um segundo botao igual dentro do
        // card vazio so duplicava (era a unica aba assim; Consultas/
        // HOLOSCAN/Confronto ja usavam um so).
        alvo.innerHTML = itens.falhaServidor
          ? '<div class="lista-vazia"><strong>Não foi possível carregar os documentos do servidor</strong>' +
            "<span>Verifique a conexão e abra a aba de novo. Nenhum documento foi apagado.</span></div>"
          : '<div class="lista-vazia"><strong>Nenhum documento adicionado</strong>' +
            "<span>Adicione arquivos e materiais relacionados à jornada deste paciente.</span></div>";
        desenharAtalhosDeExame(itens);
      } else {
        if (total) total.textContent = itens.length + (itens.length === 1 ? " documento" : " documentos");
        desenharAtalhosDeExame(itens);
        alvo.innerHTML = '<div class="doc-lista-itens">' + itens.map(function (d) {
          return '<div class="doc-item">' +
            '<span class="doc-tipo">' + escapar(d.tipo) + "</span>" +
            '<b>' + escapar(d.nome) + "</b>" +
            '<span class="doc-tam">' + window.ArquivoStore.tamanhoLegivel(d.tamanho) + "</span>" +
            '<span class="doc-data">' +
              (d.data ? escapar(d.data.split("-").reverse().join("/")) : "sem data") + "</span>" +
            (d.so_local ? '<span class="doc-tipo" title="O envio ao servidor falhou: este arquivo não aparece em outro computador.">só neste dispositivo</span>' : "") +
            '<button type="button" class="doc-abrir" data-abrir="' + escapar(d.id) + '">abrir</button>' +
            seloLancamento(d) +
            '<button type="button" class="doc-tirar" data-tirar="' + escapar(d.id) + '" data-nome="' + escapar(d.nome || "") + '" ' +
            'aria-label="Remover">&times;</button></div>';
        }).join("") + "</div>";
      }
      mostrarEspaco();
    });
  }

  function mostrarEspaco() {
    var el = document.getElementById("doc-espaco");
    if (!el) return;
    window.ArquivoStore.espaco().then(function (e) {
      if (!e) { el.textContent = ""; return; }
      el.innerHTML = (temSupa()
        ? "Os arquivos ficam no armazenamento privado da sua conta, com cópia neste navegador. "
        : "Os arquivos ficam <b>neste navegador</b>, não no servidor: " +
          "trocar de computador não os leva junto. Exame e laudo são dado de saúde, " +
          "e sem login eles não sobem para lugar nenhum. ") +
        "Espaço usado: " + window.ArquivoStore.tamanhoLegivel(e.usado) + " de " +
        window.ArquivoStore.tamanhoLegivel(e.total) + ".";
    });
  }

  /* Rodada 08 — tipos aceitos para documento de paciente. Confere o tipo que
     o navegador informa e a extensao (alguns navegadores mandam HEIC/CSV sem
     tipo); o resto e recusado antes de sair do aparelho. */
  var TIPOS_DOC = {
    "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"],
    "image/webp": ["webp"], "image/heic": ["heic"], "image/heif": ["heic", "heif"],
    "text/plain": ["txt"], "text/csv": ["csv"]
  };
  var EXT_SEM_TIPO = ["heic", "heif", "csv", "txt"];
  function tipoAceito(a) {
    var ext = String(a.name || "").toLowerCase().split(".").pop();
    var t = String(a.type || "").toLowerCase();
    if (!t) return EXT_SEM_TIPO.indexOf(ext) >= 0;
    return !!TIPOS_DOC[t] && TIPOS_DOC[t].indexOf(ext) >= 0;
  }

  function receberArquivos(lista) {
    if (!lista || lista.length === 0) return;
    var recusados = Array.prototype.filter.call(lista, function (a) { return !tipoAceito(a); });
    if (recusados.length) {
      var avisoTipo = document.getElementById("doc-aviso");
      var msg = "Tipo de arquivo não aceito: " + recusados.map(function (a) { return a.name; }).join(", ") +
        ". Envie PDF, imagem (PNG, JPG, WEBP, HEIC), TXT ou CSV.";
      if (avisoTipo) avisoTipo.innerHTML = '<p class="q-erro">' + escapar(msg) + "</p>";
      else if (window.avisar) window.avisar(msg);
      lista = Array.prototype.filter.call(lista, tipoAceito);
      if (!lista.length) return;
    }
    if (window.pacienteArquivado && window.pacienteArquivado()) {
      if (window.avisar) window.avisar(window.MSG_ARQUIVADO);
      return;
    }
    /* Simulacao 08/10: o arquivo subia no instante em que era escolhido, antes de
       nome, tipo e data — o laudo ficou "sem data". Agora escolher so PREPARA;
       o envio acontece em "Guardar documento". */
    escolhidos = Array.prototype.slice.call(lista);
    desenharEscolhidos(false);
  }

  var escolhidos = [];
  function desenharEscolhidos(pedirData) {
    var caixa = document.getElementById("doc-pendente");
    if (!caixa) return;
    if (!escolhidos.length) { caixa.innerHTML = ""; caixa.classList.add("hidden"); return; }
    var campoNome = document.getElementById("doc-nome");
    caixa.classList.remove("hidden");
    caixa.innerHTML = '<p><b>' + (escolhidos.length === 1 ? "Arquivo escolhido: " : escolhidos.length + " arquivos escolhidos: ") + "</b>" +
      escolhidos.map(function (a) { return escapar(a.name); }).join(", ") + "</p>" +
      '<p class="dash-sub">Confira o nome, o tipo e a data do documento (para exame, a data da coleta ou do laudo) e clique em Guardar. Nada foi enviado ainda.</p>' +
      (pedirData ? '<p class="q-erro" id="doc-sem-data">Este documento está sem data. Informe a data acima ou clique em "Guardar sem data".</p>' : "") +
      '<div class="acoes-form"><button type="button" class="btn-verde" id="doc-guardar"' + (pedirData ? ' data-sem-data="1"' : "") + ">" +
      (pedirData ? "Guardar sem data" : "Guardar documento") + "</button>" +
      '<button type="button" class="btn-fantasma" id="doc-cancelar">Cancelar</button></div>';
    document.getElementById("doc-guardar").addEventListener("click", function (ev) { guardarEscolhidos(!!ev.currentTarget.dataset.semData); });
    document.getElementById("doc-cancelar").addEventListener("click", function () {
      escolhidos = []; if (campoNome) campoNome.value = ""; desenharEscolhidos(false);
    });
    var campoData = document.getElementById("doc-data");
    if (pedirData && campoData) { campoData.focus(); campoData.addEventListener("change", function () { if (campoData.value) desenharEscolhidos(false); }, { once: true }); }
  }

  function guardarEscolhidos(semDataConfirmado) {
    var lista = escolhidos;
    if (!lista.length) return;
    var tipoEscolhido = document.getElementById("doc-tipo").value;
    if (!document.getElementById("doc-data").value && !semDataConfirmado && /Exame|Laudo/.test(tipoEscolhido)) { desenharEscolhidos(true); return; }
    escolhidos = [];
    desenharEscolhidos(false);
    var aviso = document.getElementById("doc-aviso");
    var nome = document.getElementById("doc-nome").value.trim();
    var meta = {
      tipo: document.getElementById("doc-tipo").value,
      data: document.getElementById("doc-data").value
    };
    var pendentes = Array.prototype.slice.call(lista);
    var erros = [];
    var soLocal = [];

    Promise.all(pendentes.map(function (a, i) {
      return window.ArquivoStore.salvar(paciente(), a, {
        nome: pendentes.length === 1 && nome ? nome : a.name,
        tipo: meta.tipo, data: meta.data
      }).then(function (reg) {
        // guardado aqui, mas o envio ao servidor falhou: dizer isso, nao "ok"
        if (reg && reg.sincronizado === false) soLocal.push(a.name);
      }).catch(function (e) { erros.push(a.name + ": " + e.message); });
    })).then(function () {
      document.getElementById("doc-nome").value = "";
      var html = "";
      if (erros.length) html += '<p class="q-erro">' + erros.map(escapar).join("<br>") + "</p>";
      if (soLocal.length) {
        html += '<p class="q-erro">' + soLocal.length +
          (soLocal.length === 1 ? " arquivo ficou" : " arquivos ficaram") +
          " salvo(s) <b>somente neste dispositivo</b> — o envio ao servidor falhou e " +
          (soLocal.length === 1 ? "ele não aparece" : "eles não aparecem") +
          " em outro computador. Tente adicionar de novo com conexão: " +
          soLocal.map(escapar).join(", ") + "</p>";
      }
      var certos = pendentes.length - erros.length - soLocal.length;
      if (certos > 0) html += '<p class="doc-ok">' + certos + " arquivo(s) guardado(s)" +
        (temSupa() ? " e sincronizado(s)." : ".") + "</p>";
      aviso.innerHTML = html;
      if (!erros.length && !soLocal.length) setTimeout(function () { aviso.innerHTML = ""; }, 3500);
      document.getElementById("doc-data").value = "";
      listarDocumentos();
      /* o laudo novo precisa aparecer na lista de laudos que podem ser ligados a uma coleta */
      if (window.Laboratorio && window.Laboratorio.carregar && temSupa()) window.Laboratorio.carregar(paciente());
    });
  }

  /** O que é do elemento recriado: a zona de arrastar nasce de novo a cada
      desenho, então é religada a cada desenho. */
  function ligarDocumentos() {
    ligarPainel();
    var solta = document.getElementById("doc-solta");
    var campo = document.getElementById("doc-arquivo");
    if (!solta || !campo) return;

    campo.addEventListener("change", function () { receberArquivos(campo.files); campo.value = ""; });
    solta.addEventListener("click", function (ev) {
      if (ev.target !== campo) campo.click();
    });
    ["dragenter", "dragover"].forEach(function (e) {
      solta.addEventListener(e, function (ev) {
        ev.preventDefault(); solta.classList.add("sobre");
      });
    });
    ["dragleave", "drop"].forEach(function (e) {
      solta.addEventListener(e, function (ev) {
        ev.preventDefault(); solta.classList.remove("sobre");
      });
    });
    solta.addEventListener("drop", function (ev) {
      receberArquivos(ev.dataTransfer.files);
    });
  }

  /* ============================================================ RELATORIO */

  var registroAtual = "nutri";

  function desenharRelatorio() {
    /* V1 Etapa 3: as emissoes versionadas ficam em #relatorios-emissoes
       (relatorios.js); o checklist da rodada 08 continua abaixo. */
    if (window.Relatorios) window.Relatorios.desenhar();
    var alvo = document.getElementById("relatorio-checklist") || document.getElementById("aba-relatorio");
    var p = pontuacaoGuardada();
    var g = motor();

    if (!p || !g) {
      alvo.innerHTML = '<div class="lista-vazia"><strong>Relatório ainda sem dados suficientes</strong>' +
        "<span>Conclua etapas da jornada clínica para gerar uma consolidação mais completa.</span></div>";
      return;
    }

    var nome = nomePaciente();
    var eu = window.PerfilProfissional
      ? window.PerfilProfissional.dados()
      : { nome: "", cor_primaria: "", cor_secundaria: "" };

    /* Quem imprime aparece no topo. Sem nome preenchido continua valendo a
       marca do app: melhor a marca do que um cabecalho vazio. */
    function juntar(pedacos) {
      return pedacos.filter(Boolean).map(escapar).join(" &middot; ");
    }
    var assina = juntar([eu.especialidade, eu.cidade]);

    var html =
      '<div class="rel-acoes">' +
      '<div class="rel-registro" role="group" aria-label="Registro">' +
      '<button type="button" class="rel-btn' + (registroAtual === "nutri" ? " ativo" : "") +
        '" data-registro="nutri" aria-pressed="' + (registroAtual === "nutri") + '">' +
        'Para a nutricionista</button>' +
      '<button type="button" class="rel-btn' + (registroAtual === "paciente" ? " ativo" : "") +
        '" data-registro="paciente" aria-pressed="' + (registroAtual === "paciente") + '">' +
        'Para o paciente</button>' +
      "</div>" +
      '<button type="button" class="btn-verde" data-acao="imprimir">' +
        '<span aria-hidden="true">&#128438; </span>Imprimir ou salvar em PDF</button>' +
      "</div>" +
      '<article class="relatorio" id="relatorio" aria-label="Relatório do paciente"' +
        (eu.cor_primaria ? ' style="--rel-p:' + escapar(eu.cor_primaria) +
          ";--rel-s:" + escapar(eu.cor_secundaria) + '"' : "") + ">" +
      '<header class="rel-topo">' +
      '<div class="rel-emissor">' +
        '<span class="rel-logo" id="rel-logo"></span>' +
        '<span class="rel-quem">' +
          "<b>" + escapar(eu.nome || "HoloHacking") + "</b>" +
          (assina ? "<i>" + assina + "</i>" : "") +
        "</span>" +
      "</div>" +
      "<h3>Mapa HOLOS" + (nome ? " &middot; " + escapar(nome) : "") + "</h3>" +
      /* Mesma defesa de app.js: snapshot antigo pode nao ter `cobertura`, e o
         relatorio nao pode quebrar por causa disso. Sem o dado, o segmento
         simplesmente nao aparece — a data continua. */
      '<p class="rel-meta">' + hoje() +
        (p.cobertura && typeof p.cobertura.percentual === "number"
          ? " &middot; cobertura " + p.cobertura.percentual + "%" : "") + "</p>" +
      '<p class="rel-fronteira">Avaliação nutricional integral construída a partir ' +
        "do que o paciente relata. Não é exame, não é diagnóstico médico e não " +
        "substitui avaliação clínica.</p>" +
      "</header>";

    /* ====================================================================
       A. HOLOSCAN — autorrelato, prioridades, sistemas, triade, cobertura.
       O Indice entra no FIM desta secao, como informacao secundaria — nao
       no cabecalho — e as CMB/textos interpretativos nao confirmados nao
       aparecem (ver decisoes 1 e 2 da revisao clinica do HOLOSCAN). */
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>A. HOLOSCAN — o que o paciente relatou</h3>" +
      // Secao 3 da Etapa 6: a data da APLICACAO, nao a de hoje (.rel-meta do
      // cabecalho ja mostra quando o relatorio foi gerado — sao datas
      // diferentes, e a antiga faltava aqui).
      (p.quando ? '<p class="rel-meta">Aplicado em ' + escapar(dataBR(p.quando)) + "</p>" : "") +
      // Correcao P0: o aviso diz a proveniencia desta aplicacao (oficial V1 / historica sem pacote V1)
      (window.Metodologia ? window.Metodologia.avisoAplicacaoHtml(p) : "");

    var A = window.HoloAusencia;
    var ordenados = p.sistemas.slice().sort(A.porLeitura);
    html += '<div class="rel-bloco"><h4>Mapa de prioridades</h4>';
    ordenados.forEach(function (s) {
      var semDado = A.semNota(s), insuf = !semDado && !A.suficiente(s);
      // respondidos/total_marcadores podem faltar num snapshot bem antigo —
      // nao inventa numero quando o campo nao existe.
      var temContagem = typeof s.respondidos === "number" && typeof s.total_marcadores === "number";
      var partes = [
        semDado ? (temContagem && s.respondidos > 0 ? s.respondidos + " de " + s.total_marcadores + " respondidas · abaixo da cobertura mínima do pacote: sem nota" : "nenhuma pergunta respondida")
          : (temContagem ? s.respondidos + " de " + s.total_marcadores + " respondidas" : ""),
        insuf ? "dados insuficientes" : "",
        s.faixa && !insuf ? "faixa " + escapar(window.rotuloExibivel(s.faixa)) : ""
      ].filter(Boolean);
      html += '<p class="rel-prioridade"><b>' + escapar(s.nome) + "</b> — " +
        A.notaTexto(s) +
        (partes.length ? " &middot; " + partes.join(" &middot; ") : "") +
        "</p>";
    });
    html += "</div>";

    var comDominantes = p.sistemas.filter(function (s) { return s.dominantes && s.dominantes.length; });
    if (comDominantes.length > 0) {
      html += '<div class="rel-bloco"><h4>Sinais dominantes</h4>';
      comDominantes.forEach(function (s) {
        html += "<p><b>" + escapar(s.nome) + "</b> — " +
          s.dominantes.map(function (d) { return escapar(d.rotulo || d.marcador_id); }).join(", ") +
          "</p>";
      });
      html += "</div>";
    }

    if (p.triada) {
      html += '<div class="rel-bloco"><h4>Tríada</h4><p class="rel-triada">' +
        "Físico <b>" + A.fmt(p.triada.fisico) + "</b> &middot; " +
        "Mental <b>" + A.fmt(p.triada.mental) + "</b> &middot; " +
        "Espiritual <b>" + A.fmt(p.triada.espiritual) + "</b></p></div>";
    }

    // Revisao clinica do HOLOSCAN: nenhuma CMB aparece no relatorio nesta
    // rodada (ver app.js, cmbParaExibir()) — inclusive a CMB-001, e nos dois
    // registros ("nutricionista" e "paciente"). Bloco so nasce se houver algo.
    var combinacoesParaExibir = window.cmbParaExibir ? window.cmbParaExibir(p.combinacoes) : [];
    if (combinacoesParaExibir.length > 0) {
      html += '<div class="rel-bloco"><h4>Leitura combinada</h4>';
      combinacoesParaExibir.forEach(function (c) {
        html += '<p class="rel-combinada">&ldquo;' + escapar(c.leitura) + "&rdquo;</p>";
      });
      html += "</div>";
    }

    // Revisao clinica do HOLOSCAN (decisao 2): o paragrafo interpretativo de
    // mensagens.csv (status=rascunho nas 30 linhas) sai da saida clinica; a
    // secao "Os cinco sistemas" continua, so com dado objetivo/calculado.
    html += '<div class="rel-bloco"><h4>Os cinco sistemas</h4>';
    ordenados.forEach(function (s) {
      html += '<div class="rel-sistema"><div class="rel-sistema-topo">' +
        "<b>" + escapar(s.nome) + "</b>" +
        '<span class="rel-nota">' + A.notaTexto(s) + "</span>" +
        '<span class="rel-faixa">' + escapar(A.semNota(s) ? "sem dado"
          : !A.suficiente(s) ? "dados insuficientes" : (window.rotuloExibivel(s.faixa) || "")) + "</span></div>" +
        '<p class="rel-passos">Área do mapa. Investigar com mais profundidade na consulta.</p>' +
        "</div>";
    });
    html += '<p class="rel-fronteira">Os cinco sistemas são categorias de organização do mapa, ' +
      "não categorias de doença.</p></div>";

    html += '<div class="rel-bloco rel-indice"><h4>Índice HOLOS (informação secundária)</h4>' +
      "<p><b>" + escapar(window.HoloAusencia.indiceTexto(p)) + "</b> de " + p.indice_maximo + "</p>" +
      '<p class="rel-fronteira">O Índice HOLOS resume as respostas deste mapa e não ' +
      "representa percentual de saúde.</p></div>";

    html += "</section>";

    /* ====================================================================
       B. HOLOSCAN — exames disponiveis e confronto por area. Aparece
       sempre, mesmo sem nenhum exame lancado (dados insuficientes e um
       estado a mostrar, nao motivo para a secao sumir). */
    /* Simulacao 08/10: a secao B lia o confronto LEGADO (exames locais) e dizia
       "Dados insuficientes" em tudo, mesmo com leituras V1 salvas. Agora mostra as
       LEITURAS INTEGRADAS SALVAS (a mais recente de cada dominio, nao substituida),
       com o texto do pacote LI-V1: profissional no registro "nutri", o texto
       decidido para o paciente (DECISAO-24) no registro "paciente". Nada e calculado aqui. */
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>B. Leitura Integrada — o que os exames acrescentam</h3>" +
      '<div class="rel-bloco" id="rel-li-corpo"><p class="rel-vazio">Carregando…</p></div>' +
      '<div class="rel-bloco"><p class="rel-fronteira">A Leitura Integrada organiza informações laboratoriais para ' +
      "apoiar a interpretação profissional. Não realiza diagnóstico.</p></div></section>";

    /* ====================================================================
       C. CONSULTAS E ACOMPANHAMENTO — window.Agenda.todas() ja e a mesma
       lista, em ordem decrescente, que a aba Consultas da ficha usa. Aparece
       sempre, como a B: "nenhuma consulta" tambem e informacao da jornada. */
    var consultas = (window.Agenda && window.Agenda.todas) ? window.Agenda.todas(paciente()) : [];
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>C. Consultas e acompanhamento</h3><div class=\"rel-bloco\">";
    if (consultas.length === 0) {
      html += '<p class="rel-vazio">Nenhuma consulta registrada até o momento.</p>';
    } else {
      html += "<p>" + consultas.length +
        (consultas.length === 1 ? " consulta registrada." : " consultas registradas.") + "</p>";
      consultas.forEach(function (c) {
        html += '<p class="rel-prioridade"><b>' + escapar(dataBR(c.data)) + "</b> &middot; " +
          escapar(c.hora) + " &middot; " + escapar(c.tipo || "Consulta") + "</p>";
      });
    }
    html += "</div></section>";

    /* ====================================================================
       D. DOCUMENTOS E MATERIAIS — mesmo ArquivoStore.listar() que a aba
       Documentos ja usa, ja em ordem decrescente de data. IndexedDB e
       assincrono: a secao nasce com "carregando" e preencherDocumentosRelatorio()
       troca pelo conteudo real quando a promessa resolve, sem travar o
       resto do relatorio (que e todo sincrono) esperando por isto. */
    html += '<section class="rel-parte" data-origem="automatico">' +
      "<h3>D. Documentos e materiais</h3>" +
      '<div class="rel-bloco" id="rel-documentos-corpo"><p class="rel-vazio">Carregando…</p></div></section>';

    /* ====================================================================
       E. INTERPRETACAO PROFISSIONAL — texto que a nutricionista escreveu,
       nunca gerado automaticamente. Nunca misturado com A/B/C/D sem etiqueta.
       Editavel so no registro "nutri"; no registro "paciente" e so leitura,
       exatamente com o que foi escrito — sem gerar nada em cima. */
    var interpretacao = window.interpretacaoDe ? window.interpretacaoDe() : null;
    var textoInterpretacao = (interpretacao && interpretacao.texto) || "";
    html += '<section class="rel-parte" data-origem="profissional">' +
      "<h3>E. Interpretação profissional</h3><div class=\"rel-bloco\">";
    if (registroAtual === "nutri") {
      html += '<textarea id="rel-interpretacao" class="rel-interpretacao-campo" ' +
        'placeholder="Registre aqui a leitura profissional deste mapa.">' +
        escapar(textoInterpretacao) + "</textarea>" +
        '<div class="acoes-form"><button type="button" class="btn-verde" ' +
        'data-acao="salvar-interpretacao">Salvar interpretação</button>' +
        '<span class="rel-interpretacao-aviso" id="rel-interpretacao-aviso"></span></div>';
    } else {
      html += (textoInterpretacao
        ? "<p>" + escapar(textoInterpretacao).replace(/\n/g, "<br>") + "</p>"
        : '<p class="rel-vazio">Sem interpretação registrada.</p>');
    }
    html += "</div></section>";

    /* A assinatura e o carimbo vem antes da identificacao, como no papel:
       a imagem, e embaixo dela quem assinou e sob qual registro. */
    var temImagem = eu.assinatura_id || eu.carimbo_id;
    var identidade = juntar([eu.nome, eu.registro]);
    var contato = juntar([eu.telefone, eu.instagram]);

    html += '<footer class="rel-rodape">';
    if (temImagem) {
      html += '<div class="rel-assinaturas">' +
        (eu.assinatura_id ? '<span class="rel-imagem" id="rel-assinatura"></span>' : "") +
        (eu.carimbo_id ? '<span class="rel-imagem" id="rel-carimbo"></span>' : "") +
        "</div>";
    }
    if (identidade) html += '<p class="rel-emitiu">' + identidade + "</p>";
    if (contato) html += '<p class="rel-contato">' + contato + "</p>";
    html += "<p>Documento gerado pelo HoloHacking. " +
      "Notas e faixas seguem o pacote metodológico indicado na aplicação do HOLOSCAN. " +
      "Queixa que sugira doença deve ser encaminhada ao médico.</p></footer></article>";

    alvo.innerHTML = html;
    pintarImagensDoPerfil(eu);
    preencherDocumentosRelatorio(paciente());
    preencherLeituraRelatorio(paciente());
  }

  /* o pacote LI que gravou a leitura (servidor, via Laboratorio); sem ele, o que estiver em vigor */
  function pacoteDaLeitura(x) {
    var L = window.Laboratorio, d = L ? L.dados() : null;
    var pk = d && (d.pacotesLI || []).filter(function (p) { return p.id === x.rule_package_id; })[0];
    return pk || (L && L.pacoteReal ? L.pacoteReal() : { domains: [], rules: [] });
  }
  function textosLI(pk) {
    var r = (pk.rules || []).filter(function (x) { return x.rule_type === "text"; })[0];
    return r && r.payload ? r.payload : {};
  }
  function htmlLeiturasRelatorio(leituras) {
    var rot = { convergente: "Convergente", divergente: "Divergente", sem_dados_suficientes: "Sem dados suficientes" };
    var ultima = {};
    leituras.filter(function (x) { return !x.superseded_at && x.domain_code; }).forEach(function (x) {
      if (!ultima[x.domain_code] || String(x.created_at) > String(ultima[x.domain_code].created_at)) ultima[x.domain_code] = x;
    });
    var cods = Object.keys(ultima).sort(function (a, b) { return a.localeCompare(b); });
    if (!cods.length) return '<p class="rel-vazio">Nenhuma leitura integrada salva para este paciente.' +
      (registroAtual === "nutri" ? " Calcule e salve as leituras em HOLOSCAN → Leitura Integrada." : "") + "</p>";
    return cods.map(function (c) {
      var x = ultima[c], pk = pacoteDaLeitura(x), T = textosLI(pk);
      var d = (pk.domains || []).filter(function (k) { return k.code === c || k.domain_code === c; })[0], nome = d ? (d.name || d.domain_name || c) : c;
      if (registroAtual === "paciente") {
        var tp = T.paciente || {};
        var texto = x.state === "convergente" && x.holoscan_direction === "attention_not_detected" && tp.convergente_sem_sinal ? tp.convergente_sem_sinal : tp[x.state];
        return '<p class="rel-prioridade"><b>' + escapar(nome) + "</b> — " + escapar(texto || "Converse com sua nutricionista sobre este domínio.") + "</p>";
      }
      return '<p class="rel-prioridade"><b>' + escapar(nome) + "</b> — " + escapar(rot[x.state] || x.state) + ". " + escapar(T[x.state] || "") +
        ' <span class="rel-meta">(leitura de ' + escapar(dataBR(String(x.created_at || "").slice(0, 10))) + ")</span>" +
        (x.professional_note ? "<br><i>Observação profissional:</i> " + escapar(x.professional_note) : "") + "</p>";
    }).join("");
  }
  /* mesma ideia de preencherDocumentosRelatorio: as leituras vem do servidor (Laboratorio) */
  function preencherLeituraRelatorio(pid) {
    var L = window.Laboratorio;
    var pintar = function () {
      var alvo = document.getElementById("rel-li-corpo");
      if (!alvo) return;
      var d = L ? L.dados() : null;
      if (!d || d.pid !== pid) { alvo.innerHTML = '<p class="rel-vazio">Leituras integradas indisponíveis sem conexão com o servidor.</p>'; return; }
      alvo.innerHTML = htmlLeiturasRelatorio(d.leituras || []);
    };
    if (!L) { pintar(); return; }
    var d0 = L.dados();
    if (d0 && d0.pid === pid && !d0.erro) { pintar(); return; }
    Promise.resolve(L.carregar(pid)).then(pintar, pintar);
  }

  /* Mesmo padrao de pintarImagensDoPerfil(): o HTML sincrono ja foi escrito
     com um "carregando", e o real entra no buraco quando a promessa do
     ArquivoStore resolve. Confere se a secao ainda existe — trocar de aba
     ou de paciente antes da promise resolver nao pode escrever por cima da
     tela errada. */
  function preencherDocumentosRelatorio(pid) {
    if (!window.ArquivoStore) return;
    window.ArquivoStore.listar(pid).then(function (itens) {
      var alvo = document.getElementById("rel-documentos-corpo");
      if (!alvo) return;
      if (!itens.length) {
        alvo.innerHTML = itens.falhaServidor
          ? '<p class="rel-vazio">Não foi possível carregar os documentos do servidor agora. Abra o relatório de novo em instantes.</p>'
          : '<p class="rel-vazio">Nenhum documento registrado até o momento.</p>';
        return;
      }
      alvo.innerHTML = "<p>" + itens.length +
        (itens.length === 1 ? " documento registrado." : " documentos registrados.") + "</p>" +
        itens.map(function (d) {
          return '<p class="rel-prioridade"><b>' + escapar(d.nome) + "</b> &middot; " + escapar(d.tipo) +
            (d.data ? " &middot; " + escapar(dataBR(d.data)) : "") + "</p>";
        }).join("");
    });
  }

  /* As imagens do perfil vivem no IndexedDB e chegam por promessa; o HTML ja
     foi escrito, entao elas entram nos buracos deixados para elas. */
  function pintarImagensDoPerfil(eu) {
    if (!window.PerfilProfissional) return;
    var por = [["logo_id", "rel-logo"], ["assinatura_id", "rel-assinatura"],
               ["carimbo_id", "rel-carimbo"]];
    por.forEach(function (par) {
      if (!eu[par[0]]) return;
      window.PerfilProfissional.imagem(eu[par[0]]).then(function (url) {
        var el = document.getElementById(par[1]);
        if (el && url) el.innerHTML = '<img src="' + url + '" alt="">';
      });
    });
  }

  /* ================================================================= abas */

  function trocarAba(nome) {
    // compatibilidade: nomes antigos redirecionam para os novos
    if (nome === "exames") nome = "documentos";
    if (nome === "formularios") nome = "ferramentas";
    if (nome === "confronto") nome = "holoscan";
    if (nome === "linha") nome = "visao";
    document.querySelectorAll("#ficha-arquivos .aba[data-aba]").forEach(function (b) {
      var ativa = b.dataset.aba === nome;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
      b.setAttribute("tabindex", ativa ? "0" : "-1");
    });
    /* V1 Etapa 2/3: anamnese, conduta e evolucao tambem sao paineis da ficha
       (antes ficavam fora desta lista e nunca eram mostrados/escondidos). */
    ["visao", "consultas", "anamnese", "conduta", "evolucao", "holoscan", "ferramentas", "resultado-holos", "documentos", "relatorio", "holos-ai"]
      .forEach(function (n) {
        var painel = document.getElementById("aba-" + n);
        if (painel) {
          var visivel = n === nome;
          painel.classList.toggle("hidden", !visivel);
          painel.setAttribute("role", "tabpanel");
          painel.setAttribute("aria-hidden", visivel ? "false" : "true");
        }
      });
    if (nome === "documentos") desenharDocumentos();
    if (nome === "relatorio") desenharRelatorio();
    if (window.desenharAbaDaFicha) window.desenharAbaDaFicha(nome);
  }

  function ligarRelatorio() {
    var alvo = document.getElementById("aba-relatorio");
    if (!alvo) return;
    alvo.addEventListener("click", function (ev) {
      var r = ev.target.closest("[data-registro]");
      if (r) { registroAtual = r.dataset.registro; desenharRelatorio(); return; }
      if (ev.target.closest('[data-acao="imprimir"]')) { window.print(); return; }
      if (ev.target.closest('[data-acao="salvar-interpretacao"]')) {
        var campo = document.getElementById("rel-interpretacao");
        var aviso = document.getElementById("rel-interpretacao-aviso");
        if (!campo) return;
        if (window.bloqueioArquivado && window.bloqueioArquivado(paciente())) {
          if (aviso) aviso.textContent = window.MSG_ARQUIVADO;
          return;
        }
        var salvou = window.guardarInterpretacao && window.guardarInterpretacao(campo.value);
        if (!salvou) {
          if (aviso) aviso.textContent = "Aplique o HOLOSCAN hoje antes de registrar a interpretação.";
          return;
        }
        /* so diz "Salvo." quando o servidor confirmou (ou quando nao ha
           servidor nenhum envolvido) — nunca antes de saber */
        if (aviso) aviso.textContent = "Salvando…";
        Promise.resolve(salvou.remoto).then(function (destino) {
          if (!aviso) return;
          if (destino === "sincronizado" || destino === "local") {
            aviso.textContent = "Salvo.";
          } else if (destino === "pendente") {
            aviso.textContent = "Salvo neste dispositivo. O HOLOSCAN deste dia ainda não foi " +
              "sincronizado — salve o HOLOSCAN para enviar também a interpretação.";
          } else {
            aviso.textContent = window.MSG_NAO_SINCRONIZADO ||
              "Salvo neste dispositivo, mas não foi possível sincronizar.";
            if (window.avisar) window.avisar(aviso.textContent);
          }
        });
        return;
      }
    });
  }

  function atualizarAviso() {
    // a ficha inteira ja diz de quem e; nao precisa repetir aqui
  }

  document.addEventListener("DOMContentLoaded", function () {
    var secao = document.getElementById("ficha-arquivos");
    if (!secao) return;
    var abas = [].slice.call(secao.querySelectorAll(".aba[data-aba]"));
    abas.forEach(function (b, i) {
      b.addEventListener("click", function () { trocarAba(b.dataset.aba); });
      b.setAttribute("tabindex", i === 0 ? "0" : "-1");
    });
    var tablist = secao.querySelector('[role="tablist"]');
    if (tablist) tablist.addEventListener("keydown", function (ev) {
      var cur = abas.indexOf(document.activeElement);
      if (cur < 0) return;
      var prox = -1;
      if (ev.key === "ArrowRight" || ev.key === "ArrowDown") prox = (cur + 1) % abas.length;
      else if (ev.key === "ArrowLeft" || ev.key === "ArrowUp") prox = (cur - 1 + abas.length) % abas.length;
      else if (ev.key === "Home") prox = 0;
      else if (ev.key === "End") prox = abas.length - 1;
      if (prox < 0) return;
      ev.preventDefault();
      abas[cur].setAttribute("tabindex", "-1");
      abas[prox].setAttribute("tabindex", "0");
      abas[prox].focus();
      trocarAba(abas[prox].dataset.aba);
    });
    atualizarAviso();
    ligarRelatorio();
    trocarAba("visao");

    /* O perfil muda em outra tela. Quando muda, o cabecalho e o rodape do
       relatorio mudam junto — senao a pessoa salva o CRN e imprime sem ele. */
    window.redesenharRelatorio = function () {
      var aba = document.getElementById("aba-relatorio");
      if (aba && !aba.classList.contains("hidden")) desenharRelatorio();
    };

    var anterior = window.aoTrocarPaciente;
    window.aoTrocarPaciente = function () {
      if (typeof anterior === "function") anterior();
      atualizarAviso();
      var ativa = secao.querySelector(".aba.ativa");
      if (ativa) trocarAba(ativa.dataset.aba);
    };
  });
})();
