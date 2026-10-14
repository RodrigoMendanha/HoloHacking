/* ===========================================================================
   AJUDA CONTEXTUAL "?" DAS 10 FERRAMENTAS OFICIAIS (rodada UX 14/10)

   Cada ferramenta ganha um "?" discreto ao lado do titulo: O que e · Por que usar · Quando usar.
   Textos curtos, tirados do que o catalogo e o fechamento das ferramentas ja dizem (ferramentas.js,
   ferramentas-fechamento.js) — nenhum conceito novo. "Quando usar" NUNCA e regra de bloqueio: toda
   ferramenta pode ser usada a qualquer momento ("Pode ser especialmente útil quando...").

   Interacao: passar o mouse ou focar (teclado) mostra; tocar/clicar fixa aberto; Esc ou clique fora fecha.
   O balao fica dentro da janela (sem rolagem lateral) e nao some enquanto o ponteiro esta sobre ele.
   =========================================================================== */
(function () {
  "use strict";

  var TEXTOS = {
    oq3: {
      nome: "OQ³",
      oque: "Três perguntas que separam o que a pessoa quer, o que precisa de atenção e o que consegue sustentar agora.",
      porque: "Ajuda a planejar a etapa considerando ao mesmo tempo desejo, necessidade e capacidade atual.",
      quando: "Pode ser especialmente útil quando o acompanhamento está começando ou quando o objetivo e a realidade parecem não conversar."
    },
    linha_momentum: {
      nome: "Linha do Momentum",
      oque: "Leitura da capacidade atual da pessoa de mobilizar recursos físicos, mentais e práticos para sustentar mudança — não é força de vontade nem motivação.",
      porque: "Ajuda a calibrar a exigência e a quantidade de mudanças propostas nesta etapa.",
      quando: "Pode ser especialmente útil quando a conduta vai ser montada ou quando a vida muda de fase."
    },
    mapa_rotina_v1: {
      nome: "Mapa da Rotina",
      oque: "Registro de como o dia e a semana acontecem de verdade, e de onde uma mudança pode caber.",
      porque: "Ajuda a escolher mudanças que realmente caibam na rotina atual, em vez de um plano que não cabe no dia a dia.",
      quando: "Pode ser especialmente útil quando é a primeira consulta ou quando a rotina muda de forma relevante."
    },
    pqq: {
      nome: "PQQ — Escada dos Porquês",
      oque: "Três perguntas “pra que que” a partir do objetivo declarado, até a síntese do que ele representa para a pessoa.",
      porque: "Ajuda a compreender o que o objetivo representa para a paciente e a conectar a mudança a significados que façam sentido para ela.",
      quando: "Pode ser especialmente útil quando o objetivo parece distante do que move a pessoa, ou para dar sentido às mudanças."
    },
    mapa_crencas: {
      nome: "Mapa de Crenças Alimentares",
      oque: "Levantamento das ideias sobre comida e corpo que a pessoa traz, de onde vieram e qual mais atrapalha hoje.",
      porque: "Ajuda a tornar visíveis ideias que podem estar influenciando escolhas alimentares e a observá-las em situações reais.",
      quando: "Pode ser especialmente útil quando aparecem regras rígidas, culpa ou “proibições” em torno da comida."
    },
    gatilhos_respostas_v1: {
      nome: "Gatilhos & Respostas",
      oque: "Registro de episódios: gatilho, pensamento, emoção, resposta e consequência.",
      porque: "Ajuda a tornar observável o que acontece antes e depois de determinado comportamento.",
      quando: "Pode ser especialmente útil quando há um episódio concreto para registrar, como comer sem fome ou beliscar em certo horário."
    },
    mapa: {
      nome: "Mapa do Propósito",
      oque: "Reunião do que o OQ³ e o PQQ trouxeram — objetivo, alavancas e o “pra que” verdadeiro — numa visão só.",
      porque: "Ajuda a manter a direção do acompanhamento ligada ao que a própria pessoa disse que importa.",
      quando: "Pode ser especialmente útil quando o OQ³ e o PQQ já foram feitos, como aprofundamento opcional."
    },
    roda_vida: {
      nome: "Roda Holística da Vida",
      oque: "Visão panorâmica das áreas da vida, com a nota que a própria pessoa dá a cada uma.",
      porque: "Ajuda a escolher quais áreas merecem atenção neste momento.",
      quando: "Pode ser especialmente útil quando a queixa alimentar parece ligada a outras áreas da vida."
    },
    carta_futuro: {
      nome: "Carta ao Futuro Eu",
      oque: "Exercício reflexivo para conectar a pessoa com uma direção futura desejada.",
      porque: "Ajuda a tornar mais concreto o que ela quer construir, fortalecer a motivação e dar sentido às mudanças.",
      quando: "Pode ser especialmente útil quando fizer sentido aprofundar identidade, direção, compromisso com o cuidado ou visão de futuro."
    },
    conexao_pertencimento_v1: {
      nome: "Conexão & Pertencimento",
      oque: "Registro de quem e o que sustenta a pessoa na vida — pessoas, grupos, ambientes e comunidades —, como ela os descreve.",
      porque: "Ajuda a compreender quais recursos de apoio estão disponíveis durante o processo, sem classificar nenhum vínculo.",
      quando: "Pode ser especialmente útil quando fizer sentido conversar sobre apoio, solidão ou pertencimento."
    }
  };
  var seq = 0;

  /* "?" de CADA PERGUNTA dentro das ferramentas (14/10): O que preencher · Para que serve.
     Textos curtos, tirados do que cada campo ja diz (rotulo e dica). Nada aqui pontua, interpreta ou vira regra. */
  var CAMPOS = {
    oq3: {
      data: ["A data da consulta em que o OQ³ foi feito.", "Situa a resposta no tempo e permite comparar com aplicações futuras."],
      quer: ["O que a pessoa quer conquistar: sonhos, metas e a visão de futuro, nas palavras dela.", "Mostra o desejo que move o acompanhamento."],
      precisa: ["O que ela precisa resolver agora: dores, sintomas físicos e emocionais que relata.", "Mostra a necessidade que pede atenção nesta etapa."],
      consegue: ["Do que ela consegue dar conta hoje, considerando rotina, estilo de vida e disponibilidade.", "Ajuda a calibrar o tamanho do plano à capacidade atual."],
      alavancas: ["O que pode impulsionar a mudança: recursos, motivações e apoios que apareceram na conversa.", "Indica por onde a mudança tem mais chance de começar."]
    },
    pqq: {
      objetivo: ["O objetivo que a pessoa declarou, do jeito que ela falou.", "É o ponto de partida da escada dos porquês."],
      "1": ["A resposta à pergunta “Pra que que você quer isso?”.", "Primeiro degrau: começa a revelar o que está por trás do objetivo."],
      "2": ["A resposta à pergunta “Pra que que isso é importante para você?”.", "Segundo degrau: aproxima do valor pessoal envolvido."],
      "3": ["A resposta à pergunta “Pra que que isso faz diferença na sua vida?”.", "Terceiro degrau: conecta o objetivo à vida real da pessoa."],
      verdadeiro: ["Uma síntese do que o objetivo representa para a pessoa, a partir das três respostas.", "É o “pra que” que dá sentido às mudanças e alimenta o Mapa do Propósito."]
    },
    linha_momentum: {
      energia: ["De 0 a 10: quanta energia sobra no dia depois do que é obrigatório.", "Mostra quanto espaço existe para algo novo sem esgotar."],
      carga: ["De 0 a 10: o quanto a vida está pesada agora.", "Ajuda a não propor mais do que a pessoa consegue carregar."],
      controle: ["De 0 a 10: o quanto do próprio dia ela consegue decidir.", "Indica se as mudanças dependem só dela ou de outras pessoas e horários."],
      suporte: ["De 0 a 10: quem ajuda de verdade quando aperta.", "Mostra com que apoio a mudança pode contar."],
      espaco: ["De 0 a 10: se sobra cabeça para pensar em mudança.", "Ajuda a decidir entre poucas mudanças simples ou um plano mais amplo."],
      estabilidade: ["De 0 a 10: se o momento está estável ou em transição.", "Momentos de transição pedem metas mais leves e flexíveis."],
      sustenta: ["O que sustenta esta pessoa agora: pessoas, hábitos, recursos.", "Mostra em que a conduta pode se apoiar."],
      limita: ["O que limita a mudança neste momento.", "Evita propor algo que esbarra num limite real."],
      nao_pedir: ["O que não é hora de pedir a esta pessoa.", "Tão importante quanto o que pedir: protege o vínculo e a adesão."],
      estado_confirmado: ["O estado de Momentum que você lê nas seis dimensões juntas: Preservar, Reorganizar, Construir ou Expandir.", "Orienta a intensidade da etapa. O sistema não sugere: a leitura é sua."],
      justificativa_estado: ["Por que você escolheu este estado, citando o que viu nas dimensões.", "Deixa a leitura registrada e compreensível no retorno."]
    },
    mapa_rotina_v1: {
      acorda: ["O horário em que a pessoa costuma acordar.", "Junto com o horário de dormir, mostra a duração do sono e o começo do dia."],
      dorme: ["O horário em que a pessoa costuma dormir.", "Ajuda a ver a duração do sono e o fim do dia."],
      sono: ["Como a pessoa descreve a qualidade do sono, com as palavras dela.", "Dá contexto para energia, fome e disposição ao longo do dia."],
      trabalho: ["O trabalho e os horários de trabalho.", "Mostra onde as refeições e pausas precisam caber."],
      deslocamentos: ["Os deslocamentos do dia: trajetos, tempo e meio de transporte.", "Revela tempo disponível e momentos de refeição fora de casa."],
      familia: ["As responsabilidades com a família: filhos, pais, cuidado de alguém.", "Mostra compromissos que disputam tempo e energia."],
      domesticas: ["As responsabilidades da casa.", "Ajuda a entender quem cozinha e quanto tempo sobra."],
      estudos: ["Estudos em andamento, se houver.", "Mostra outra demanda de tempo e de energia mental."],
      compromissos: ["Compromissos que se repetem na semana.", "Indica dias e horários mais apertados ou mais livres."],
      dificuldade: ["Os momentos do dia em que fica mais difícil cuidar da alimentação.", "Aponta onde uma mudança pequena pode fazer diferença."],
      disponiveis: ["Os momentos em que há tempo ou energia disponível.", "Mostra onde uma mudança tem mais chance de caber."],
      espacos: ["Os espaços para mudança que você e a pessoa identificaram juntos.", "É um registro da conversa, não uma recomendação do sistema."],
      observacoes: ["Qualquer observação livre sobre a rotina.", "Guarda o que não coube nos outros campos."],
      inicio: ["Quando o evento começa.", "Coloca o evento na linha do dia."],
      fim: ["Quando o evento termina (opcional).", "Mostra a duração, quando importa."],
      categoria: ["O tipo de evento: refeição, trabalho, sono, deslocamento, exercício, etc.", "Organiza o dia por tipo de atividade."],
      titulo: ["Um nome curto para o evento (ex.: café da manhã, almoço no trabalho).", "Facilita ler o dia de relance."],
      descricao: ["O que acontece nesse momento, com detalhes que importam.", "Dá o contexto do evento."],
      percepcao: ["Como a pessoa percebe fome, energia ou estresse nesse momento.", "Mostra padrões ao longo do dia. Não é escore clínico."],
      dias: ["Os dias da semana em que o evento se repete.", "Separa o que é rotina do que é exceção."],
      observacao: ["Qualquer observação sobre o evento.", "Guarda detalhes que ajudam na conduta."]
    },
    mapa_crencas: {
      crencas: ["As ideias sobre comida e corpo que a pessoa traz, uma por linha (ex.: “carboidrato engorda”).", "Torna visíveis ideias que podem estar guiando as escolhas."],
      origem: ["De onde essas ideias vieram: família, dietas antigas, algo que alguém disse.", "Ajuda a pessoa a olhar a crença com mais distância."],
      mais_atrapalha: ["Qual dessas ideias mais atrapalha hoje.", "Mostra por onde começar."],
      alternativa: ["Uma ideia alternativa que a pessoa conseguiria acreditar (não necessariamente o oposto).", "Abre espaço para uma nova forma de ver, possível para ela."]
    },
    gatilhos_respostas_v1: {
      data: ["A data do episódio.", "Situa o episódio no tempo."],
      horario: ["O horário do episódio (opcional).", "Ajuda a perceber se se repete em certos horários."],
      contexto: ["Onde e em que situação aconteceu.", "Mostra o cenário em que o episódio costuma surgir."],
      gatilho: ["O que disparou o episódio: uma situação, uma sensação, uma pessoa.", "Torna observável o que vem antes do comportamento."],
      pensamento: ["O pensamento que a pessoa percebeu naquele momento.", "Ajuda a conectar o que se pensa com o que se faz."],
      emocao: ["A emoção que ela sentiu.", "Mostra o papel das emoções no episódio."],
      intensidade: ["De 0 a 10, a intensidade da emoção como a pessoa percebe (opcional).", "Ajuda a comparar episódios. Não é escore clínico."],
      resposta: ["O que a pessoa fez: o comportamento.", "É o ponto que se quer compreender e, se fizer sentido, mudar."],
      consequencia_imediata: ["O que aconteceu logo depois.", "Mostra o que o comportamento traz no curto prazo."],
      consequencia_posterior: ["O que aconteceu mais tarde.", "Mostra o efeito depois, que às vezes é diferente do imediato."],
      necessidade: ["A necessidade que parecia estar por trás do episódio.", "Ajuda a pensar em outras formas de atender essa necessidade."],
      observacao_nutri: ["Sua observação profissional sobre o episódio.", "Guarda a sua leitura para a conduta."],
      alternativa: ["Uma resposta alternativa possível, escrita por você ou pela pessoa (opcional).", "Abre uma possibilidade concreta. Não é prescrição do sistema."]
    },
    roda_vida: {
      saude: ["De 0 a 10: como a pessoa avalia a própria saúde hoje.", "Mostra como ela sente essa área da vida."],
      relacoes: ["De 0 a 10: como estão as relações (família, amizades, parceria).", "Ajuda a ver se as relações apoiam ou pesam."],
      trabalho: ["De 0 a 10: como está o trabalho.", "Indica se o trabalho é fonte de equilíbrio ou de desgaste."],
      financas: ["De 0 a 10: como estão as finanças.", "Ajuda a ajustar a conduta ao que é viável."],
      espiritualidade: ["De 0 a 10: como está a espiritualidade, no sentido que fizer para a pessoa.", "Mostra a conexão com valores e sentido."],
      lazer: ["De 0 a 10: quanto espaço há para lazer e descanso.", "Indica se existe tempo para recuperar energia."],
      desenvolvimento: ["De 0 a 10: como está o desenvolvimento pessoal.", "Mostra se a pessoa sente que está crescendo."],
      proposito: ["De 0 a 10: o quanto a pessoa sente propósito no dia a dia.", "Conecta o cuidado com o que dá sentido à vida dela."],
      puxa: ["A área que a pessoa sente que está puxando as outras para baixo.", "Ajuda a escolher onde a atenção pode render mais agora."]
    },
    carta_futuro: {
      para_quando: ["A data em que a pessoa vai reler a carta.", "Marca um reencontro com a direção que ela escolheu."],
      carta: ["A carta escrita pela pessoa, na primeira pessoa, para quem ela vai ser.", "Torna concreta a direção desejada e dá sentido às mudanças."]
    },
    /* leitura profissional: o fechamento comum a todas as ferramentas */
    _leitura: {
      texto: ["O que chamou a sua atenção nas respostas desta ferramenta, com as suas palavras.", "É a sua interpretação: é ela que fecha a aplicação. O sistema só mostra observações."],
      prioridade: ["A prioridade que você dá ao que observou.", "Ajuda a ordenar o que entra primeiro na conduta."],
      passo: ["O próximo passo: uma ação, uma investigação, um monitoramento ou um encaminhamento.", "Deixa claro o que acontece a partir desta leitura."]
    },
    conexao_pertencimento_v1: {
      contar: ["Com quem a pessoa pode contar.", "Mostra a rede de apoio disponível."],
      apoia_mudanca: ["Quem apoia a mudança.", "Indica quem pode ajudar no caminho."],
      dificulta_mudanca: ["Quem pode dificultar a mudança.", "Ajuda a se preparar para situações difíceis."],
      pertence: ["Onde a pessoa se sente pertencente.", "Mostra espaços que fortalecem."],
      sozinha: ["Onde ela se sente só.", "Ajuda a perceber lacunas de apoio."],
      fortalecem: ["As relações que fortalecem, como a pessoa descreve.", "Mostra apoios com que o cuidado pode contar."],
      dificultam: ["As relações que dificultam, como a pessoa descreve.", "Ajuda a entender obstáculos no dia a dia."],
      referencias: ["Pessoas de referência para ela.", "Mostra modelos e inspirações."],
      espacos_seguros: ["Os espaços em que ela se sente segura.", "Indica onde a mudança pode ser sustentada."],
      percepcao_apoio: ["Como a pessoa percebe o apoio que tem, nas palavras dela.", "Mostra se ela se sente acompanhada."],
      conexao_consigo: ["Como está a conexão dela consigo mesma.", "Dá contexto para o autocuidado."],
      espiritualidade: ["A espiritualidade, se fizer sentido para a pessoa.", "Pode ser fonte de apoio e sentido. É opcional."],
      comunidade_religiosa: ["Comunidade religiosa ou espiritual, se houver.", "Mostra outro possível espaço de pertencimento. É opcional."],
      pratica_espiritual: ["Prática espiritual, se houver.", "Pode apoiar rotina e bem-estar. É opcional."],
      algo_maior: ["A conexão com algo maior, se fizer sentido para a pessoa.", "Pode dar sentido à mudança. É opcional."],
      observacoes: ["Qualquer observação livre.", "Guarda o que não coube nos outros campos."],
      rotulo: ["Um nome ou apelido para o vínculo (ex.: irmã, grupo de corrida).", "Identifica o vínculo sem expor dados pessoais."],
      natureza: ["A natureza do vínculo.", "Organiza os vínculos por tipo de relação."],
      tipo: ["O tipo do vínculo.", "Ajuda a ler a rede de apoio de forma organizada."],
      relacao: ["Como é essa relação, em descrição livre.", "Dá o contexto do vínculo."],
      papel: ["O papel que a pessoa percebe que esse vínculo tem na mudança.", "Mostra quem ajuda e quem dificulta. O sistema não classifica."],
      proximidade: ["O quanto a pessoa se sente próxima desse vínculo (opcional).", "Ajuda a entender a força do vínculo."],
      momento: ["Como esse vínculo está no momento.", "Mostra se está ativo, distante ou em mudança."],
      contexto: ["Uma data ou contexto do vínculo.", "Situa o vínculo na história da pessoa."],
      observacao: ["Qualquer observação sobre o vínculo.", "Guarda detalhes importantes."]
    }
  };

  /* EXEMPLO em cinza (placeholder) de cada campo de texto: so para a nutricionista bater o olho. Ficticio e neutro;
     some quando o campo e preenchido e nunca e gravado. */
  var EXEMPLOS = {
    oq3: { quer: "Ex.: ter energia para brincar com os filhos e voltar a correr", precisa: "Ex.: acorda cansada; estufamento depois do almoço",
      consegue: "Ex.: consegue organizar o café da manhã; o jantar ainda não", alavancas: "Ex.: apoio do parceiro; gosta de cozinhar aos domingos" },
    pqq: { objetivo: "Ex.: emagrecer", "1": "Ex.: para me sentir bem nas minhas roupas", "2": "Ex.: porque quero me sentir confiante no trabalho",
      "3": "Ex.: vou participar mais da vida da minha família", verdadeiro: "Ex.: sentir que cuido de mim e tenho energia para quem amo" },
    linha_momentum: { sustenta: "Ex.: rotina de trabalho estável; apoio da irmã", limita: "Ex.: plantões noturnos; pouco sono",
      nao_pedir: "Ex.: cozinhar todas as refeições em casa", justificativa_estado: "Ex.: energia e espaço mental baixos, mas bom suporte" },
    mapa_rotina_v1: { sono: "Ex.: demora para pegar no sono e acorda cansada", trabalho: "Ex.: escritório, 8h às 17h, 1h de almoço",
      deslocamentos: "Ex.: 40 min de ônibus na ida e na volta", familia: "Ex.: leva os filhos na escola às 7h", domesticas: "Ex.: cozinha à noite para o dia seguinte",
      estudos: "Ex.: pós-graduação aos sábados", compromissos: "Ex.: academia terça e quinta, 19h", dificuldade: "Ex.: fim da tarde, quando chega com muita fome",
      disponiveis: "Ex.: domingo de manhã", espacos: "Ex.: levar um lanche para as 16h", observacoes: "Ex.: os fins de semana são bem diferentes",
      descricao: "Ex.: come em pé, enquanto arruma a cozinha", observacao: "Ex.: só quando trabalha em casa" },
    mapa_crencas: { crencas: "Ex.: carboidrato à noite engorda\nEx.: se comi doce, estraguei o dia", origem: "Ex.: a dieta que a mãe fazia",
      mais_atrapalha: "Ex.: se comi doce, estraguei o dia", alternativa: "Ex.: um doce pode fazer parte de uma alimentação equilibrada" },
    gatilhos_respostas_v1: { contexto: "Ex.: em casa, depois do trabalho, sozinha", gatilho: "Ex.: chegar cansada e com fome", pensamento: "Ex.: eu mereço, o dia foi difícil",
      emocao: "Ex.: cansaço, irritação", resposta: "Ex.: comeu biscoito direto do pacote", consequencia_imediata: "Ex.: alívio",
      consequencia_posterior: "Ex.: culpa e sem fome no jantar", necessidade: "Ex.: descanso e um momento só para ela",
      observacao_nutri: "Ex.: acontece nos dias de reunião longa", alternativa: "Ex.: lanche planejado às 16h e banho ao chegar" },
    roda_vida: { puxa: "Ex.: trabalho" },
    _leitura: { texto: "Ex.: o cansaço aparece no fim da tarde, junto com a fome intensa" },
    carta_futuro: { carta: "Ex.: Querida eu de daqui a seis meses, hoje decidi cuidar de mim porque…" },
    conexao_pertencimento_v1: { contar: "Ex.: a irmã e uma amiga do trabalho", apoia_mudanca: "Ex.: o parceiro, que topa cozinhar junto",
      dificulta_mudanca: "Ex.: almoços de domingo em família", pertence: "Ex.: grupo de corrida", sozinha: "Ex.: em casa, à noite",
      fortalecem: "Ex.: a amiga que caminha com ela", dificultam: "Ex.: colegas que pedem lanche todo dia", referencias: "Ex.: a avó, que sempre cozinhou",
      espacos_seguros: "Ex.: a casa da mãe", percepcao_apoio: "Ex.: sente que tem pouca ajuda em casa", conexao_consigo: "Ex.: quase não tem tempo para si",
      espiritualidade: "Ex.: oração pela manhã", comunidade_religiosa: "Ex.: grupo da comunidade que frequenta", pratica_espiritual: "Ex.: meditação aos domingos",
      algo_maior: "Ex.: a natureza", observacoes: "Ex.: mudou de cidade há pouco tempo", relacao: "Ex.: conversam todos os dias",
      contexto: "Ex.: desde a mudança de cidade", observacao: "Ex.: ficou mais próxima neste ano" }
  };
  function exemplo(ferr, campo) { return (EXEMPLOS[ferr] && EXEMPLOS[ferr][campo]) || ""; }

  /* o "?" ao lado do NOME de cada ferramenta na lista (o cartao e um botao: o "?" e um elemento com papel de botao,
     com foco e Enter/Espaco, e nao abre a ferramenta) */
  function montarCards() {
    document.querySelectorAll(".card-ferr").forEach(function (c) {
      var id = c.dataset.ferramenta || ({ "vista-oq3": "oq3", "vista-pqq": "pqq", "vista-mapa": "mapa" })[c.dataset.vista];
      var h = c.querySelector("h4");
      if (!id || !TEXTOS[id] || !h || h.querySelector(".ajuda-ferr")) return;
      h.insertAdjacentHTML("beforeend", " " + botao(id).replace('<button type="button" class="ajuda-ferr-btn"', '<span role="button" tabindex="0" class="ajuda-ferr-btn"').replace("?</button>", "?</span>"));
    });
  }

  /** HTML do "?" de uma pergunta (vazio se nao houver texto). rotulo = o texto da pergunta, para o leitor de tela. */
  function botaoCampo(ferr, campo, rotulo) {
    var t = CAMPOS[ferr] && CAMPOS[ferr][campo];
    if (!t) return "";
    var pid = "ajuda-campo-" + ferr + "-" + campo + "-" + (++seq);
    return '<span class="ajuda-ferr ajuda-campo" data-ajuda-campo="' + esc(ferr + "." + campo) + '">' +
      '<button type="button" class="ajuda-ferr-btn" aria-label="Ajuda: ' + esc(rotulo || campo) + '" aria-expanded="false" aria-controls="' + pid + '">?</button>' +
      '<span class="ajuda-ferr-pop" id="' + pid + '" role="tooltip" hidden>' +
        '<span class="ajuda-ferr-rot">O que preencher</span><span class="ajuda-ferr-txt">' + esc(t[0]) + "</span>" +
        '<span class="ajuda-ferr-rot">Para que serve</span><span class="ajuda-ferr-txt">' + esc(t[1]) + "</span>" +
      "</span></span>";
  }

  function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /** HTML do "?" + balao para a ferramenta (vazio se nao for uma das 10). */
  function botao(id) {
    var t = TEXTOS[id];
    if (!t) return "";
    var pid = "ajuda-ferr-" + id + "-" + (++seq);
    return '<span class="ajuda-ferr" data-ajuda-ferr="' + esc(id) + '">' +
      '<button type="button" class="ajuda-ferr-btn" aria-label="Sobre a ferramenta ' + esc(t.nome) + '" aria-expanded="false" aria-controls="' + pid + '">?</button>' +
      '<span class="ajuda-ferr-pop" id="' + pid + '" role="tooltip" hidden>' +
        '<b class="ajuda-ferr-tit">' + esc(t.nome) + "</b>" +
        '<span class="ajuda-ferr-rot">O que é</span><span class="ajuda-ferr-txt">' + esc(t.oque) + "</span>" +
        '<span class="ajuda-ferr-rot">Por que usar</span><span class="ajuda-ferr-txt">' + esc(t.porque) + "</span>" +
        '<span class="ajuda-ferr-rot">Quando usar</span><span class="ajuda-ferr-txt">' + esc(t.quando) + "</span>" +
      "</span></span>";
  }

  /* ---- abrir / fechar ---- */
  var fixo = null, timer = null;
  function pop(w) { return w && w.querySelector(".ajuda-ferr-pop"); }
  function posicionar(w) {
    var p = pop(w); if (!p) return;
    p.style.left = ""; p.style.right = ""; p.style.top = ""; p.classList.remove("acima");
    var r = p.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    if (r.right > vw - 8) { p.style.left = "auto"; p.style.right = "0"; r = p.getBoundingClientRect(); }
    if (r.left < 8) { p.style.left = (8 - w.getBoundingClientRect().left) + "px"; p.style.right = "auto"; }
    if (r.bottom > window.innerHeight - 8 && w.getBoundingClientRect().top > r.height + 16) p.classList.add("acima");
  }
  function abrir(w) {
    if (!w) return;
    document.querySelectorAll(".ajuda-ferr.aberta").forEach(function (o) { if (o !== w) fechar(o, true); });
    var p = pop(w), b = w.querySelector(".ajuda-ferr-btn");
    if (!p) return;
    p.hidden = false; w.classList.add("aberta"); if (b) b.setAttribute("aria-expanded", "true");
    posicionar(w);
  }
  function fechar(w, forca) {
    if (!w || (!forca && fixo === w)) return;
    var p = pop(w), b = w.querySelector(".ajuda-ferr-btn");
    if (p) p.hidden = true; w.classList.remove("aberta"); if (b) b.setAttribute("aria-expanded", "false");
    if (fixo === w) fixo = null;
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".ajuda-ferr-btn");
    if (b) {
      ev.preventDefault(); ev.stopPropagation();
      var w = b.closest(".ajuda-ferr");
      if (fixo === w) { fechar(w, true); } else { abrir(w); fixo = w; }
      return;
    }
    if (fixo && !(ev.target.closest && ev.target.closest(".ajuda-ferr"))) fechar(fixo, true);
  }, true);
  document.addEventListener("mouseover", function (ev) {
    var w = ev.target.closest && ev.target.closest(".ajuda-ferr");
    if (!w) return;
    clearTimeout(timer); abrir(w);
  });
  document.addEventListener("mouseout", function (ev) {
    var w = ev.target.closest && ev.target.closest(".ajuda-ferr");
    if (!w || (ev.relatedTarget && w.contains(ev.relatedTarget))) return;
    clearTimeout(timer); timer = setTimeout(function () { fechar(w); }, 250);   // tempo para chegar ao balao
  });
  document.addEventListener("focusin", function (ev) { if (ev.target.classList && ev.target.classList.contains("ajuda-ferr-btn")) abrir(ev.target.closest(".ajuda-ferr")); });
  document.addEventListener("focusout", function (ev) {
    var w = ev.target.closest && ev.target.closest(".ajuda-ferr");
    if (w && !(ev.relatedTarget && w.contains(ev.relatedTarget))) fechar(w);
  });
  document.addEventListener("keydown", function (ev) {
    var sb = ev.target && ev.target.classList && ev.target.classList.contains("ajuda-ferr-btn") && ev.target.tagName === "SPAN";
    if (sb && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); ev.stopPropagation(); ev.target.click(); return; }
    if (ev.key !== "Escape") return;
    var w = document.querySelector(".ajuda-ferr.aberta");
    if (w) { fechar(w, true); var b = w.querySelector(".ajuda-ferr-btn"); if (b) b.focus(); }
  });

  /* as tres telas escritas a mao (OQ³, PQQ, Mapa do Proposito): o "?" entra ao lado do titulo */
  function montarFixas() {
    [["vista-oq3", "oq3"], ["vista-pqq", "pqq"], ["vista-mapa", "mapa"]].forEach(function (par) {
      var v = document.getElementById(par[0]);
      var h = v && v.querySelector(".secao-cabeca h2, h2");
      if (!h || h.querySelector(".ajuda-ferr")) return;
      h.insertAdjacentHTML("beforeend", " " + botao(par[1]));
    });
  }
  /* OQ3 e PQQ: o "?" de cada pergunta entra no proprio rotulo */
  function montarCamposFixos() {
    [["oq3", { "oq3-data": "data", "oq3-quer": "quer", "oq3-precisa": "precisa", "oq3-consegue": "consegue", "oq3-alavancas": "alavancas" }],
     ["pqq", { "pqq-objetivo": "objetivo", "pqq-1": "1", "pqq-2": "2", "pqq-3": "3", "pqq-verdadeiro": "verdadeiro" }]].forEach(function (par) {
      Object.keys(par[1]).forEach(function (forId) {
        var l = document.querySelector('label[for="' + forId + '"]');
        if (!l || l.querySelector(".ajuda-campo")) return;
        l.insertAdjacentHTML("beforeend", " " + botaoCampo(par[0], par[1][forId], l.textContent.trim()));
        var inp = document.getElementById(forId), exm = exemplo(par[0], par[1][forId]);
        if (inp && exm && !inp.getAttribute("placeholder")) inp.setAttribute("placeholder", exm);
      });
    });
  }
  document.addEventListener("DOMContentLoaded", function () { montarFixas(); montarCamposFixos(); montarCards(); });

  window.AjudaFerramentas = { TEXTOS: TEXTOS, CAMPOS: CAMPOS, botao: botao, botaoCampo: botaoCampo, exemplo: exemplo, EXEMPLOS: EXEMPLOS, montarCards: montarCards, montarFixas: montarFixas, montarCamposFixos: montarCamposFixos };
})();
