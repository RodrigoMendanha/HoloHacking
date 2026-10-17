/* ===========================================================================
   PLAYBOOK HOLOS (PB-V1) — Resultado HOLOS sem depender da IA
   ===========================================================================

   Biblioteca curta de FOCOS e ESTRATEGIAS organizada pelos cinco sistemas do
   HOLOSCAN e por Corpo · Mente · Espirito (plano: docs/v1/PLANO-PLAYBOOK-HOLOS.md).

   O que este modulo FAZ:
     * guarda o conteudo PB-V1 (3 focos por sistema, 12 estrategias por sistema
       e 15 gerais), escrito sem diagnostico, sem prescricao e sem quantidades;
     * escolhe e ORDENA as opcoes para um paciente: focos dos 2 sistemas
       prioritarios do HOLOSCAN; estrategias do sistema do foco primeiro, depois
       as que combinam com as ferramentas aplicadas (as etiquetas so ordenam,
       nunca escondem nada);
     * monta os itens da direcao (template 5) a partir do que a NUTRICIONISTA
       escolheu: origem "nutricionista", confirmados e compartilhados. A
       rastreabilidade fica no id de cada item ("pb1-<ID do playbook>-...").

   O que NAO faz: nao le score, nao muda HOLOSCAN, PP-V1, Indice ou Triade, nao
   escolhe nada sozinho e nao inventa texto (so copia o texto aprovado, que a
   nutricionista pode editar). Funciona tambem no Node (testes).
   =========================================================================== */
(function (raiz) {
  "use strict";

  var VERSAO = "PB-V2";
  var PREFIXO = "pb1-";   /* o prefixo dos ids continua "pb1-": Resultados antigos seguem rastreaveis */
  var SISTEMAS = [
    ["metabolico", "Metabólico"], ["fungico", "Fúngico"], ["acido_inflamatorio", "Ácido Inflamatório"],
    ["detox_linfatico", "Detox e Linfático"], ["mental_emocional_espiritual", "Mental Emocional Espiritual"]
  ];
  var NOME_SISTEMA = {}; SISTEMAS.forEach(function (s) { NOME_SISTEMA[s[0]] = s[1]; });
  var TERR = { C: "corpo", M: "mente", E: "espirito", I: "integrado" };
  var NOME_TERR = { corpo: "Corpo", mente: "Mente", espirito: "Espírito", integrado: "Integrado" };
  /* etiquetas das ferramentas (ids oficiais das 10 ferramentas) */
  var FERR = { OQ3: "oq3", MOM: "linha_momentum", ROT: "mapa_rotina_v1", PQQ: "pqq", CRE: "mapa_crencas", GAT: "gatilhos_respostas_v1",
    PRO: "mapa", RODA: "roda_vida", CARTA: "carta_futuro", CON: "conexao_pertencimento_v1" };
  var NOME_FERR = { oq3: "OQ³", linha_momentum: "Linha do Momentum", mapa_rotina_v1: "Mapa da Rotina", pqq: "Escada dos Porquês",
    mapa_crencas: "Mapa de Crenças", gatilhos_respostas_v1: "Gatilhos & Respostas", mapa: "Mapa do Propósito", roda_vida: "Roda Holística da Vida",
    carta_futuro: "Carta ao Futuro Eu", conexao_pertencimento_v1: "Conexão & Pertencimento" };
  var PRAZO_PADRAO = "Até o próximo encontro.";
  var MAX_ESTRATEGIAS = 6;
  /* PB-V2: o padrao e 2 a 4 estrategias por fase (5 ou mais so com motivo concreto); nao e obrigatorio preencher Corpo, Mente e Espirito */
  var RECOMENDADO = { min: 2, max: 4 };
  /* pagina de cada ferramenta no PDF oficial (docs/v1/PLAYBOOK-ESTRATEGIAS-HOLOS.pdf, capitulo Ferramentas) */
  /* paginas-pdf:inicio (gerado por scripts/gerar-pdf-playbook-estrategias.mjs) */ var PAGINAS_PDF = {"oq3":28,"linha_momentum":28,"mapa_rotina_v1":29,"pqq":29,"mapa_crencas":29,"gatilhos_respostas_v1":30,"mapa":30,"roda_vida":30,"carta_futuro":31}; /* paginas-pdf:fim */

  /* ---------- conteudo ------------------------------------------------------ */
  function F(id, sistema, texto, porque, dirs, observar, proxima) {
    return { id: id, sistema: sistema, texto: texto, porque: porque,
      direcionamentos: dirs.map(function (d) { return { territorio: TERR[d[0]], titulo: d[1], objetivo: d[2] }; }),
      observar: observar, proxima_etapa: proxima };
  }
  function E(id, sistema, t, titulo, acao, contexto, observar, ferr, meta) {
    meta = meta || {};
    return { id: id, sistema: sistema, territorio: TERR[t], titulo: titulo, acao: acao, contexto: contexto, observar: observar,
      ferramentas: (ferr || []).map(function (k) { return FERR[k]; }), tipo: meta.tipo || "acao", nivel: meta.nivel || "N2",
      cuidado: meta.cuidado || "", requer: meta.requer || "" };
  }
  var TIPO = { acao: "Ação", observacao: "Observação", reflexao: "Reflexão" };
  var NIVEL = { N1: "Prática bem estabelecida", N2: "Estratégia comportamental com suporte de literatura", N3: "Experimento individual (hipótese a testar)", N4: "Prática de sentido, autoral ou simbólica" };

  var FOCOS = [
    /* METABOLICO */
    F("ME-F1", "metabolico", "Organizar os horários das refeições para ter mais energia ao longo do dia",
      "Seus relatos mostram fome, energia e horários pedindo mais organização.",
      [["C", "Dar ritmo às refeições", "Ter horários de refeição mais previsíveis no dia a dia."],
       ["M", "Perceber a fome antes que ela fique forte demais", "Reconhecer os sinais de fome mais cedo."]],
      ["Sua energia ao longo do dia.", "A fome entre as refeições.", "Os horários que funcionaram."],
      "Revisar os horários que funcionaram e ajustar os que não couberam na rotina."),
    F("ME-F2", "metabolico", "Entender a sua fome e a sua saciedade",
      "Reconhecer os sinais de fome e de satisfação ajuda a escolher com mais tranquilidade.",
      [["M", "Diferenciar a fome do corpo de outras vontades", "Perceber o que está por trás da vontade de comer."],
       ["C", "Comer com atenção para perceber a saciedade", "Notar quando a refeição já foi suficiente."]],
      ["Suas notas de fome e de saciedade.", "Os momentos em que comeu sem fome.", "Como você termina as refeições."],
      "Olhar juntos os registros de fome e saciedade e escolher o próximo ajuste."),
    F("ME-F3", "metabolico", "Construir uma rotina alimentar que caiba no seu dia real",
      "Mudanças que cabem na rotina são as que se sustentam.",
      [["C", "Encontrar espaço na rotina para as refeições", "Proteger os horários das refeições nos dias comuns."],
       ["E", "Ligar o cuidado com a alimentação ao que importa para você", "Dar sentido às mudanças desta fase."]],
      ["Onde a rotina quebra.", "O que facilitou.", "O que você conseguiu manter."],
      "Revisar o que coube na rotina e o que precisa de outra solução."),
    /* FUNGICO */
    F("FU-F1", "fungico", "Perceber como a alimentação conversa com o seu conforto digestivo",
      "Entender em que refeições e situações o desconforto aparece ajuda a escolher melhor.",
      [["C", "Observar o conforto digestivo depois das refeições", "Identificar as refeições mais e menos confortáveis."],
       ["M", "Notar como a pressa e as emoções aparecem nas refeições", "Perceber o estado em que você come."]],
      ["As refeições com mais e com menos desconforto.", "O ritmo das refeições.", "Os dias mais tranquilos."],
      "Olhar os registros e escolher um ajuste para as refeições mais desconfortáveis."),
    F("FU-F2", "fungico", "Dar mais regularidade e atenção à rotina alimentar",
      "Uma rotina mais regular ajuda a perceber melhor os sinais que você relatou.",
      [["C", "Organizar o ritmo das refeições", "Ter refeições em horários mais parecidos."],
       ["E", "Transformar a refeição num momento de cuidado", "Comer com mais presença."]],
      ["Os horários das refeições.", "As refeições feitas com calma.", "Como você se sentiu."],
      "Revisar o que ficou mais regular e o que ainda falta."),
    F("FU-F3", "fungico", "Observar a relação entre doces, beliscos e os sinais que você relatou",
      "Perceber quando e por que os doces e beliscos aparecem abre espaço para escolhas novas.",
      [["M", "Entender o que vem antes da vontade de doce", "Reconhecer as situações que puxam a vontade."],
       ["C", "Testar uma pausa antes do belisco", "Experimentar decidir com mais calma."]],
      ["Os momentos de vontade de doce.", "O que estava acontecendo.", "Como você se sentiu depois."],
      "Conversar sobre o que apareceu nos registros e escolher a próxima troca."),
    /* ACIDO INFLAMATORIO */
    F("AI-F1", "acido_inflamatorio", "Entender quando e em que situações os desconfortos aparecem",
      "Conhecer o padrão dos desconfortos ajuda a escolher o que ajustar primeiro.",
      [["C", "Registrar os desconfortos e o momento em que aparecem", "Encontrar padrões de horário e de dia."],
       ["M", "Perceber a relação entre a tensão do dia e o desconforto", "Notar se tensão e desconforto andam juntos."]],
      ["A intensidade do desconforto.", "Os horários e os dias.", "O que veio antes."],
      "Olhar juntos o padrão dos desconfortos e escolher um ajuste."),
    F("AI-F2", "acido_inflamatorio", "Cuidar da recuperação: sono, movimento e pausas",
      "Descanso e movimento possível fazem parte do cuidado com o desconforto.",
      [["C", "Dar mais regularidade ao sono e ao movimento possível", "Ter uma rotina de recuperação mais estável."],
       ["E", "Reservar tempo de descanso como cuidado", "Descansar sem culpa."]],
      ["A qualidade do sono.", "A rigidez ao acordar.", "Como o corpo responde ao movimento."],
      "Revisar o que ajudou na recuperação e manter o que funcionou."),
    F("AI-F3", "acido_inflamatorio", "Perceber como a alimentação e a rotina se relacionam com o seu desconforto",
      "Observar a rotina real mostra o que pode estar pesando.",
      [["C", "Comparar dias de mais e de menos desconforto", "Encontrar diferenças entre esses dias."],
       ["M", "Notar a sobrecarga na rotina", "Reconhecer o que pesa no dia a dia."]],
      ["A alimentação nos dias de mais e de menos desconforto.", "A sobrecarga.", "O sono."],
      "Conversar sobre o que os registros mostraram."),
    /* DETOX E LINFATICO */
    F("DL-F1", "detox_linfatico", "Observar o funcionamento do seu intestino no dia a dia",
      "Acompanhar o seu ritmo intestinal ajuda a perceber o que favorece o seu bem-estar.",
      [["C", "Registrar o funcionamento intestinal", "Conhecer o seu ritmo."],
       ["M", "Perceber como a pressa e a rotina interferem", "Notar o que atrapalha o seu ritmo."]],
      ["A frequência e o conforto.", "O que mudou na rotina.", "Os dias mais tranquilos."],
      "Olhar os registros e escolher um ajuste na rotina."),
    F("DL-F2", "detox_linfatico", "Hidratação e movimento ao longo do dia",
      "Água e movimento distribuídos no dia fazem parte do cuidado com o inchaço percebido.",
      [["C", "Distribuir a hidratação ao longo do dia", "Lembrar da água em momentos fixos."],
       ["C", "Quebrar os longos períodos parada", "Incluir pausas de movimento."]],
      ["A sede.", "O inchaço percebido.", "As pausas de movimento."],
      "Revisar o que coube no dia e o que precisa de lembrete."),
    F("DL-F3", "detox_linfatico", "Perceber o que piora ou melhora o inchaço que você sente",
      "Entender os momentos de inchaço ajuda a escolher o que ajustar.",
      [["C", "Registrar quando o inchaço aparece", "Encontrar os momentos e o que veio antes."],
       ["E", "Criar espaço para o seu ritmo", "Ter momentos sem pressa no dia."]],
      ["Os horários do inchaço.", "O que veio antes.", "O sono e o tempo sentada."],
      "Conversar sobre o que os registros mostraram."),
    /* MENTAL EMOCIONAL ESPIRITUAL */
    F("MEE-F1", "mental_emocional_espiritual", "Cuidar do sono e do descanso",
      "O descanso faz parte do cuidado com a alimentação e com a energia.",
      [["C", "Criar um ritual para desacelerar à noite", "Preparar o corpo para o descanso."],
       ["M", "Esvaziar a mente antes de dormir", "Deitar com a cabeça mais leve."]],
      ["O horário de deitar e de acordar.", "Como você acorda.", "As telas à noite."],
      "Revisar o que ajudou o descanso e manter."),
    F("MEE-F2", "mental_emocional_espiritual", "Perceber como as emoções aparecem na alimentação",
      "Reconhecer a emoção antes de comer abre espaço para outras respostas.",
      [["M", "Nomear a emoção antes de comer fora do combinado", "Reconhecer o que você está sentindo."],
       ["M", "Testar uma pausa antes de decidir", "Ganhar alguns minutos para escolher."]],
      ["As emoções mais frequentes.", "As situações.", "As respostas que funcionaram."],
      "Conversar sobre o que apareceu e escolher a próxima resposta."),
    F("MEE-F3", "mental_emocional_espiritual", "Fortalecer o sentido e a direção do seu cuidado",
      "Quando o cuidado se conecta ao que importa, ele fica mais leve de manter.",
      [["E", "Lembrar o seu “pra quê”", "Manter a mudança ligada ao que importa para você."],
       ["E", "Fortalecer o apoio e o pertencimento", "Contar com quem está perto."]],
      ["Os momentos em que o propósito ajudou.", "O apoio que você recebeu.", "Como você se sentiu."],
      "Revisar o que trouxe mais sentido e dar o próximo passo.")
  ];

  /* PB-V2 (revisao metodologica de 14/10): cada estrategia tem TIPO (acao: o paciente faz; observacao: o paciente acompanha;
     reflexao: algo para perceber e trazer ao retorno), NIVEL de sustentacao (N1 pratica/fisiologia bem estabelecida; N2
     estrategia comportamental com suporte de literatura; N3 experimento individual / hipotese a testar; N4 pratica autoral,
     simbolica ou de sentido), CUIDADO (quando nao usar automaticamente) e REQUER (ferramenta que precisa ter sido aplicada). */
  var A = "acao", O = "observacao", R = "reflexao";
  var ESTRATEGIAS = [
    /* METABOLICO */
    E("ME-C1", "metabolico", "C", "Horários âncora", "Combinar 2 ou 3 horários de refeição e tentar mantê-los.", "Todos os dias.", "Sua energia e sua fome entre as refeições.", ["ROT", "OQ3"], { tipo: A, nivel: "N2" }),
    E("ME-C2", "metabolico", "C", "Fome de 0 a 10", "Antes de comer, dar uma nota para a fome; ao terminar, uma nota para a saciedade.", "Em pelo menos 1 refeição por dia.", "Se você começa a comer com a fome muito alta.", ["GAT"], { tipo: O, nivel: "N2",
      cuidado: "Evitar uso rígido ou controlador; adaptar ou não usar com histórico ou suspeita de transtorno alimentar, ou quando monitorar aumenta o sofrimento." }),
    E("ME-C3", "metabolico", "C", "Energia depois de comer", "Anotar como está a sua energia 1 a 2 horas depois das refeições principais.", "3 dias na semana.", "Em quais refeições a energia cai ou se mantém.", ["ROT"], { tipo: O, nivel: "N3" }),
    E("ME-C4", "metabolico", "C", "Preparar o horário difícil", "Deixar planejado o que fazer no horário em que a fome mais aperta.", "Nos dias úteis.", "Se você chega com menos fome à refeição seguinte.", ["ROT", "GAT"], { tipo: A, nivel: "N2" }),
    E("ME-M1", "metabolico", "M", "O que está pedindo comida agora?", "Antes de comer fora do habitual, observar: há fome física? Vontade de algo específico? Cansaço? Emoção? Hábito? Mais de uma dessas coisas?", "Sempre que acontecer.", "O que apareceu com mais frequência.", ["GAT"], { tipo: R, nivel: "N2" }),
    E("ME-M2", "metabolico", "M", "Comer sem fome: o que veio antes", "Registrar a situação, o pensamento percebido e a emoção quando comer sem fome.", "Sempre que acontecer.", "As situações que se repetem.", ["GAT"], { tipo: O, nivel: "N2",
      cuidado: "A nutricionista mapeia a situação; não aprofunda conteúdo emocional. Sofrimento intenso: acompanhamento especializado." }),
    E("ME-M3", "metabolico", "M", "Sem compensação", "Notar se, depois de comer mais, aparece a vontade de pular a refeição seguinte, e trazer isso para a próxima conversa.", "Durante a semana.", "Quando isso aparece e como você se sente.", ["CRE"], { tipo: R, nivel: "N2",
      cuidado: "Restrição e compensação frequentes podem sinalizar transtorno alimentar: avaliar e encaminhar quando houver suspeita." }),
    E("ME-M4", "metabolico", "M", "Resposta combinada", "Usar a resposta alternativa que combinamos para o gatilho mais frequente.", "Sempre que o gatilho aparecer.", "Se você conseguiu usar a resposta e o que mudou.", ["GAT"], { tipo: A, nivel: "N2" }),
    E("ME-E1", "metabolico", "E", "Energia para o que importa", "Escolher uma atividade para a qual você quer ter mais energia e observar como a alimentação aparece nesses dias.", "Durante a semana.", "Sua energia nos dias dessa atividade.", ["PQQ", "RODA"], { tipo: R, nivel: "N4" }),
    E("ME-E2", "metabolico", "E", "Intenção do dia", "Ao acordar, escolher uma intenção simples para o dia (por exemplo: comer com calma no almoço).", "Todas as manhãs.", "Em quantos dias você lembrou da intenção.", ["PRO"], { tipo: A, nivel: "N2" }),
    E("ME-E3", "metabolico", "E", "Refeição com presença", "Fazer uma refeição na semana com tempo e atenção, sozinha ou acompanhada.", "1 vez na semana.", "Como você se sentiu nessa refeição.", [], { tipo: A, nivel: "N2" }),
    E("ME-E4", "metabolico", "E", "Ritmo que respeita você", "Identificar um compromisso que atropela as refeições e pensar numa forma de proteger esse horário.", "Durante a semana.", "Se você conseguiu proteger o horário.", ["ROT", "RODA"], { tipo: A, nivel: "N2" }),
    /* FUNGICO */
    E("FU-C1", "fungico", "C", "Diário do conforto digestivo", "Anotar como você se sentiu depois das refeições principais (estufamento, desconforto ou bem-estar).", "No almoço e no jantar.", "Em quais refeições o desconforto aparece.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Sintomas digestivos importantes, persistentes ou com sinais de alarme pedem avaliação clínica adequada." }),
    E("FU-C2", "fungico", "C", "Mastigar com calma", "Em uma refeição do dia, comer sentada e mastigar com calma, sem pressa.", "1 refeição por dia.", "Se o conforto muda depois dessa refeição.", ["ROT"], { tipo: A, nivel: "N2" }),
    E("FU-C3", "fungico", "C", "Mapa dos doces e beliscos", "Anotar quando come doce ou belisca e o que estava acontecendo.", "Sempre que acontecer.", "Os horários e as situações que se repetem.", ["GAT", "ROT"], { tipo: O, nivel: "N3" }),
    E("FU-C4", "fungico", "C", "Pausa antes do belisco", "Quando vier a vontade de beliscar fora de hora, fazer uma pequena pausa, respirar e observar a vontade antes de decidir.", "Sempre que acontecer.", "Se a vontade muda depois da pausa.", ["GAT"], { tipo: A, nivel: "N2" }),
    E("FU-M1", "fungico", "M", "Emoção e digestão", "Nos dias de mais desconforto, anotar também como estava o seu dia emocionalmente.", "Nos dias de desconforto.", "Se dias tensos e desconforto variam juntos.", ["GAT"], { tipo: O, nivel: "N3" }),
    E("FU-M2", "fungico", "M", "O que a vontade de doce está pedindo", "Perguntar a si mesma se é cansaço, recompensa, tédio, fome ou outra coisa.", "Sempre que aparecer.", "O que aparece com mais frequência.", ["GAT"], { tipo: R, nivel: "N2",
      cuidado: "A resposta é da paciente: a nutricionista não interpreta por ela." }),
    E("FU-M3", "fungico", "M", "Comida sem culpa", "Escolher uma ideia sobre comida que traz culpa e trazer para a próxima conversa.", "Durante a semana.", "Quando essa ideia aparece.", ["CRE"], { tipo: R, nivel: "N2" }),
    E("FU-M4", "fungico", "M", "Plano para o momento difícil", "Usar o que combinamos para o horário em que a vontade de doce mais aparece.", "No horário combinado.", "Se você conseguiu seguir o plano.", ["GAT", "ROT"], { tipo: A, nivel: "N2" }),
    E("FU-E1", "fungico", "E", "Refeição como cuidado", "Preparar ou montar uma refeição na semana com atenção e carinho por você.", "1 vez na semana.", "Como você se sentiu ao cuidar de si.", ["PRO"], { tipo: A, nivel: "N4" }),
    E("FU-E2", "fungico", "E", "Um momento antes de comer", "Fazer uma pausa de três respirações antes da refeição principal.", "1 vez por dia.", "Se a refeição fica mais tranquila.", [], { tipo: A, nivel: "N2" }),
    E("FU-E3", "fungico", "E", "Cuidar do ambiente da refeição", "Deixar o lugar da refeição mais agradável (mesa arrumada, sem telas).", "Quando possível.", "Se isso muda a forma de comer.", ["RODA"], { tipo: A, nivel: "N2" }),
    E("FU-E4", "fungico", "E", "Gentileza com o processo", "Anotar uma pequena conquista do cuidado com a alimentação na semana.", "1 vez na semana.", "O que já está mudando.", ["CARTA"], { tipo: R, nivel: "N2" }),
    /* ACIDO INFLAMATORIO */
    E("AI-C1", "acido_inflamatorio", "C", "Diário do desconforto", "Dar uma nota de 0 a 10 para o desconforto e anotar o momento do dia.", "1 vez por dia.", "Os padrões de horário e de dia.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Dor persistente, intensa ou que piora pede avaliação de quem acompanha a saúde do paciente." }),
    E("AI-C2", "acido_inflamatorio", "C", "Movimento possível", "Retomar ou manter um movimento já considerado seguro para você (caminhar, alongar).", "Na frequência combinada no atendimento.", "Como o corpo responde nas horas seguintes.", ["MOM", "OQ3"], { tipo: A, nivel: "N1",
      cuidado: "Não é prescrição de exercício: com dor, limitação ou condição clínica, respeitar a orientação do profissional responsável." }),
    E("AI-C3", "acido_inflamatorio", "C", "Dias bons e dias difíceis", "Anotar o que comeu e como foi o dia em 2 dias de mais e 2 dias de menos desconforto.", "4 dias na semana.", "As diferenças entre esses dias.", ["ROT"], { tipo: O, nivel: "N3" }),
    E("AI-C4", "acido_inflamatorio", "C", "Hora regular para deitar", "Escolher um horário para deitar e tentar mantê-lo.", "Todas as noites.", "A rigidez e a disposição ao acordar.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("AI-M1", "acido_inflamatorio", "M", "Tensão e desconforto", "Anotar o nível de tensão do dia (0 a 10) ao lado da nota do desconforto.", "1 vez por dia.", "Se tensão e desconforto variam juntos.", ["GAT"], { tipo: O, nivel: "N3" }),
    E("AI-M2", "acido_inflamatorio", "M", "Pausa breve de respiração e percepção corporal", "Fazer pausas curtas para respirar e perceber o corpo.", "3 vezes por dia.", "Se algo muda depois das pausas.", [], { tipo: A, nivel: "N2" }),
    E("AI-M3", "acido_inflamatorio", "M", "Como o desconforto muda o seu cuidado?", "Quando o desconforto aparecer, anotar o que muda na sua alimentação, no descanso ou na rotina.", "Quando acontecer.", "O que muda no cuidado nos dias de desconforto.", ["ROT"], { tipo: R, nivel: "N3" }),
    E("AI-M4", "acido_inflamatorio", "M", "Proteger uma pausa de cuidado", "Identificar uma parte da rotina que está impedindo alimentação, descanso ou autocuidado e testar uma proteção possível.", "Durante a semana.", "Se você conseguiu proteger essa pausa.", ["ROT"], { tipo: A, nivel: "N2" }),
    E("AI-E1", "acido_inflamatorio", "E", "Prazer que cabe no corpo de hoje", "Escolher uma atividade prazerosa que respeite o seu ritmo atual.", "1 vez na semana.", "Como você se sentiu depois.", ["RODA"], { tipo: A, nivel: "N4",
      cuidado: "Se a atividade envolver esforço físico e houver dor, respeitar a orientação do profissional responsável." }),
    E("AI-E2", "acido_inflamatorio", "E", "Reservar espaço para descanso", "Reservar um momento da semana para descansar.", "1 vez na semana.", "Se foi possível descansar.", ["MOM"], { tipo: A, nivel: "N1" }),
    E("AI-E3", "acido_inflamatorio", "E", "Reconhecer o que o corpo permitiu hoje", "Anotar uma coisa que o seu corpo permitiu fazer no dia, sem obrigação de sentir gratidão.", "3 vezes na semana.", "O que você percebeu ao anotar.", ["CARTA"], { tipo: R, nivel: "N4",
      cuidado: "Opcional: com relação difícil com o corpo, pode soar artificial. Use só se fizer sentido para a pessoa." }),
    E("AI-E4", "acido_inflamatorio", "E", "Ritmo com sentido", "Ligar o cuidado com o corpo a algo que você quer continuar fazendo.", "Durante a semana.", "Se isso ajuda a manter o cuidado.", ["PQQ", "PRO"], { tipo: R, nivel: "N4" }),
    /* DETOX E LINFATICO */
    E("DL-C1", "detox_linfatico", "C", "Registro do intestino", "Anotar como foi o funcionamento intestinal (frequência e conforto).", "Todos os dias.", "O que muda nos dias diferentes.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Mudança importante do hábito intestinal, dor, sangue ou outros sinais de alarme pedem avaliação clínica." }),
    E("DL-C2", "detox_linfatico", "C", "Água em momentos fixos", "Ligar a água a momentos do dia: ao acordar, nas pausas e nas refeições.", "Todos os dias.", "A facilidade de lembrar da água, a sede e a rotina.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("DL-C3", "detox_linfatico", "C", "Pausas de movimento", "Levantar e se movimentar alguns minutos nos períodos longos sentada.", "Várias vezes ao dia.", "Como você se sente no fim do dia.", ["ROT", "MOM"], { tipo: A, nivel: "N1" }),
    E("DL-C4", "detox_linfatico", "C", "Diário do inchaço", "Anotar em que momento o inchaço aparece e o que veio antes.", "Quando acontecer.", "A relação com alimentação, tempo sentada e sono.", ["ROT"], { tipo: O, nivel: "N3",
      cuidado: "Inchaço novo, importante, de um lado só, doloroso ou persistente precisa de avaliação clínica." }),
    E("DL-M1", "detox_linfatico", "M", "Sem adiar", "Notar se a rotina corrida faz você adiar a ida ao banheiro.", "Durante a semana.", "Quando isso acontece.", ["ROT"], { tipo: O, nivel: "N2" }),
    E("DL-M2", "detox_linfatico", "M", "Tensão e intestino", "Anotar os dias de mais tensão ao lado do registro do intestino.", "Todos os dias.", "Se tensão e intestino variam juntos.", ["GAT"], { tipo: O, nivel: "N3" }),
    E("DL-M3", "detox_linfatico", "M", "Ideias sobre “limpar o corpo”", "Observar ideias que levam a restrições ou a “compensar” e trazer para a próxima conversa.", "Durante a semana.", "Quando essas ideias aparecem.", ["CRE"], { tipo: R, nivel: "N2" }),
    E("DL-M4", "detox_linfatico", "M", "Plano para os dias corridos", "Usar o mínimo que combinamos para os dias mais corridos.", "Nos dias corridos.", "Se você conseguiu manter o mínimo.", ["GAT", "ROT"], { tipo: A, nivel: "N2" }),
    E("DL-E1", "detox_linfatico", "E", "Manhã sem pressa", "Criar alguns minutos tranquilos no começo do dia.", "Todas as manhãs.", "Como o seu dia começa.", ["ROT"], { tipo: A, nivel: "N2" }),
    E("DL-E2", "detox_linfatico", "E", "Tempo ao ar livre", "Ter um momento ao ar livre, com calma.", "1 a 2 vezes na semana.", "Sua disposição e seu humor.", ["RODA"], { tipo: A, nivel: "N2" }),
    E("DL-E3", "detox_linfatico", "E", "Proteger um horário de cuidado", "Escolher um horário de refeição, pausa ou cuidado que costuma ser tomado por outras demandas e testar protegê-lo nesta semana.", "Durante a semana.", "Se você conseguiu proteger o horário.", ["ROT", "RODA"], { tipo: A, nivel: "N2" }),
    E("DL-E4", "detox_linfatico", "E", "Ajuda na rotina", "Combinar com alguém da casa uma ajuda concreta (por exemplo, dividir uma tarefa).", "Durante a semana.", "Se sobrou mais espaço para o seu cuidado.", [], { tipo: A, nivel: "N2" }),
    /* MENTAL EMOCIONAL ESPIRITUAL */
    E("MEE-C1", "mental_emocional_espiritual", "C", "Ritual de desacelerar", "Nos 30 minutos antes de dormir, ficar sem telas e repetir a mesma sequência (por exemplo: banho, luz baixa, leitura).", "Todas as noites.", "O tempo para pegar no sono e como você acorda.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("MEE-C2", "mental_emocional_espiritual", "C", "Hora de acordar regular", "Manter um horário parecido para acordar, inclusive no fim de semana.", "Todos os dias.", "Sua disposição pela manhã.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("MEE-C3", "mental_emocional_espiritual", "C", "Última refeição e sono", "Observar o horário, o volume e o contexto da última refeição e como foi o sono.", "Todas as noites.", "Se há diferença no sono conforme a última refeição.", ["ROT"], { tipo: O, nivel: "N3" }),
    E("MEE-C4", "mental_emocional_espiritual", "C", "Luz da manhã", "Ter alguns minutos de luz natural ou de caminhada pela manhã.", "Quando possível.", "Sua disposição e seu humor no dia.", ["ROT", "MOM"], { tipo: A, nivel: "N1" }),
    E("MEE-M1", "mental_emocional_espiritual", "M", "Nomear a emoção", "Antes de comer fora do combinado, dar nome ao que está sentindo e ao que o corpo está sinalizando.", "Sempre que acontecer.", "As emoções e os sinais que se repetem.", ["GAT"], { tipo: R, nivel: "N2" }),
    E("MEE-M2", "mental_emocional_espiritual", "M", "Três respirações", "Fazer três respirações lentas antes de decidir o que comer quando estiver tensa.", "Sempre que acontecer.", "Se a decisão muda depois da pausa.", ["GAT"], { tipo: A, nivel: "N2",
      cuidado: "É uma pausa de decisão, não tratamento de ansiedade. Sofrimento intenso: acompanhamento especializado." }),
    E("MEE-M3", "mental_emocional_espiritual", "M", "Trocar a frase dura", "Quando surgir uma frase dura sobre a alimentação (“comi fora do planejado, estraguei tudo”), anotar e reescrever de forma mais gentil (“uma escolha não define o meu dia”).", "Quando acontecer.", "Como você se sente com a nova frase.", ["CRE"], { tipo: R, nivel: "N2",
      cuidado: "Só frases ligadas à alimentação e ao autocuidado. Não trabalhar crenças centrais, traumas ou autoestima global." }),
    E("MEE-M4", "mental_emocional_espiritual", "M", "Tirar as pendências da cabeça", "Antes de dormir, anotar pendências ou coisas que não quer esquecer e deixá-las para o dia seguinte.", "Nas noites agitadas.", "Se o sono fica mais tranquilo.", [], { tipo: A, nivel: "N2" }),
    E("MEE-E1", "mental_emocional_espiritual", "E", "Um passo alinhado ao propósito", "Escolher uma ação da semana ligada ao que dá sentido à sua vida.", "1 vez na semana.", "Como você se sentiu.", ["PRO", "PQQ"], { tipo: A, nivel: "N4" }),
    E("MEE-E2", "mental_emocional_espiritual", "E", "Contato que nutre", "Ter um contato significativo com alguém de apoio.", "1 vez na semana.", "Como você se sentiu depois.", [], { tipo: A, nivel: "N2" }),
    E("MEE-E3", "mental_emocional_espiritual", "E", "Prática de sentido", "Se já fizer parte da sua vida, reservar um tempo para a sua prática (oração, meditação, contemplação).", "No ritmo combinado com você.", "Como fica o seu dia.", [], { tipo: A, nivel: "N4",
      cuidado: "Somente quando espiritualidade, oração ou meditação já fizerem sentido para o paciente. A nutricionista não indica crença nem prática religiosa." }),
    E("MEE-E4", "mental_emocional_espiritual", "E", "Olhar para o caminho", "No fim da semana, anotar o que te aproximou do cuidado que você deseja manter.", "1 vez na semana.", "O que já está mudando.", ["CARTA"], { tipo: R, nivel: "N4" }),
    /* GERAIS */
    E("G01", "geral", "C", "Registro de 3 dias", "Anotar o que comeu, o horário e como se sentiu.", "3 dias (2 dias úteis e 1 de fim de semana).", "Os horários, a fome e a energia.", ["ROT"], { tipo: O, nivel: "N2",
      cuidado: "Evitar quando registrar aumenta obsessão, culpa ou sofrimento." }),
    E("G02", "geral", "C", "Uma refeição com atenção", "Fazer uma refeição por dia sentada e sem telas.", "Todos os dias.", "O sabor, a saciedade e a calma.", [], { tipo: A, nivel: "N2" }),
    E("G03", "geral", "C", "Planejar a semana", "Reservar um tempo curto para pensar nas refeições da semana.", "1 vez na semana.", "Se os dias ficaram mais fáceis.", ["ROT", "OQ3"], { tipo: A, nivel: "N2" }),
    E("G04", "geral", "C", "Sono regular", "Manter horários parecidos para deitar e acordar.", "Todos os dias.", "Sua disposição.", ["ROT"], { tipo: A, nivel: "N1" }),
    E("G05", "geral", "C", "Movimento de que você gosta", "Escolher um movimento prazeroso, dentro do que é seguro para você.", "Na frequência combinada no atendimento.", "Sua disposição e seu humor.", ["MOM"], { tipo: A, nivel: "N1",
      cuidado: "Incentivo geral, não prescrição de exercício. Com dor ou limitação, respeitar o profissional responsável." }),
    E("G06", "geral", "C", "Água à vista", "Deixar água por perto e beber ao longo do dia.", "Todos os dias.", "A sede e a facilidade de lembrar.", [], { tipo: A, nivel: "N1" }),
    E("G07", "geral", "M", "O momento mais difícil do dia", "Identificar o horário mais difícil e o que acontece antes dele.", "Durante a semana.", "O que se repete.", ["ROT", "GAT"], { tipo: O, nivel: "N3" }),
    E("G08", "geral", "M", "Pausa antes de decidir", "Antes de comer fora do combinado, esperar alguns minutos.", "Sempre que acontecer.", "Se a vontade muda.", ["GAT"], { tipo: A, nivel: "N2" }),
    E("G09", "geral", "M", "Sem tudo ou nada", "Quando algo sair do plano, seguir na próxima refeição como combinado, sem “chutar o balde”.", "Sempre que acontecer.", "Como você lidou com o deslize.", ["CRE"], { tipo: A, nivel: "N2" }),
    E("G10", "geral", "M", "Um avanço por semana", "Anotar uma coisa que deu certo.", "1 vez na semana.", "O que está mudando.", [], { tipo: R, nivel: "N2" }),
    E("G11", "geral", "E", "Lembrar o seu “pra quê”", "Reler a síntese da Escada dos Porquês ou o seu motivo principal.", "2 vezes na semana.", "Se isso ajuda nos momentos difíceis.", ["PQQ", "PRO"], { tipo: R, nivel: "N4" }),
    E("G12", "geral", "E", "Uma área da vida com cuidado", "Escolher uma área da Roda da Vida e um pequeno gesto semanal para ela.", "1 vez na semana.", "Como você se sentiu.", ["RODA"], { tipo: A, nivel: "N4", requer: "roda_vida" }),
    E("G13", "geral", "E", "Pessoa de apoio", "Combinar com alguém de confiança como essa pessoa pode te apoiar nesta fase.", "Durante a semana.", "Se você se sentiu apoiada.", [], { tipo: A, nivel: "N2" }),
    E("G14", "geral", "E", "Pausa de presença", "Antes de uma refeição, fazer uma pequena pausa para chegar àquele momento. Se gratidão fizer sentido para você, ela pode fazer parte da pausa.", "1 vez por dia.", "Como fica a refeição.", [], { tipo: A, nivel: "N2" }),
    E("G15", "geral", "E", "Frase da Carta", "Escolher uma frase da Carta ao Futuro Eu para lembrar durante a semana.", "Todos os dias.", "Se a frase ajudou.", ["CARTA"], { tipo: R, nivel: "N4", requer: "carta_futuro" })
  ];

  var POR_ID = {};
  FOCOS.forEach(function (f) { POR_ID[f.id] = f; });
  ESTRATEGIAS.forEach(function (e) { POR_ID[e.id] = e; });

  /* Linha do Momentum: orientacao de QUANTIDADE (decisao D2 do plano; so orienta, nunca trava) */
  var MOMENTUM = {
    preservar: { min: 1, max: 2, rotulo: "Preservar" }, reorganizar: { min: 2, max: 3, rotulo: "Reorganizar" },
    construir: { min: 3, max: 4, rotulo: "Construir" }, expandir: { min: 4, max: 5, rotulo: "Expandir" }
  };
  function chaveMomentum(v) {
    var s = String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return Object.keys(MOMENTUM).filter(function (k) { return s.indexOf(k) >= 0; })[0] || null;
  }
  function orientacaoMomentum(v) { var k = chaveMomentum(v); return k ? Object.assign({ chave: k }, MOMENTUM[k]) : null; }

  /* ---------- selecao das opcoes --------------------------------------------- */
  /* ctx = { prioritarios: [codigos dos sistemas, na ordem do HOLOSCAN], ferramentas: [ferramenta_id aplicadas], foco: id do foco escolhido } */
  function opcoes(ctx) {
    ctx = ctx || {};
    var prio = (ctx.prioritarios || []).filter(function (s) { return NOME_SISTEMA[s]; }).slice(0, 2);
    var aplicadas = ctx.ferramentas || [];
    var outros = SISTEMAS.map(function (s) { return s[0]; }).filter(function (s) { return prio.indexOf(s) < 0; });
    var focos = prio.map(function (s) { return { sistema: s, nome: NOME_SISTEMA[s], prioridade: prio.indexOf(s) + 1, focos: FOCOS.filter(function (f) { return f.sistema === s; }) }; });
    var focosOutros = outros.map(function (s) { return { sistema: s, nome: NOME_SISTEMA[s], prioridade: null, focos: FOCOS.filter(function (f) { return f.sistema === s; }) }; });
    var foco = ctx.foco ? POR_ID[ctx.foco] : null;
    var sisFoco = foco && foco.sistema ? foco.sistema : prio[0] || null;
    var ordemSis = [sisFoco].concat(prio.filter(function (s) { return s !== sisFoco; })).filter(Boolean);
    var combina = function (e) { return e.ferramentas.filter(function (f) { return aplicadas.indexOf(f) >= 0; }).map(function (f) { return NOME_FERR[f]; }); };
    var grupo = function (e) { return e.sistema === sisFoco ? "foco" : ordemSis.indexOf(e.sistema) >= 0 ? "prioritario" : e.sistema === "geral" ? "geral" : "outro"; };
    var peso = { foco: 0, prioritario: 1, geral: 2, outro: 3 };
    var est = ESTRATEGIAS.map(function (e, i) { return { e: e, i: i, g: grupo(e), c: combina(e) }; })
      .filter(function (o) { return o.g !== "outro" && (!o.e.requer || aplicadas.indexOf(o.e.requer) >= 0); })   /* PB-V2: "requer" = so quando a ferramenta foi aplicada */
      .sort(function (a, b) { return peso[a.g] - peso[b.g] || (b.c.length ? 1 : 0) - (a.c.length ? 1 : 0) || a.i - b.i; })
      .map(function (o) { return Object.assign({}, o.e, { grupo: o.g, combina: o.c }); });
    return { versao: VERSAO, focos: focos, focosOutros: focosOutros, sistemaFoco: sisFoco, estrategias: est,
      momentum: orientacaoMomentum(ctx.momentum) };
  }

  /* ---------- itens da direcao ------------------------------------------------ */
  function sufixo() { return Math.random().toString(36).slice(2, 8); }
  function idDe(base) { return (PREFIXO + base + "-" + sufixo()).slice(0, 64); }
  /* id do playbook a partir do id de um item gerado (para a rastreabilidade na visao profissional) */
  function origemPlaybook(itemId) {
    var s = String(itemId || "");
    if (s.indexOf(PREFIXO) !== 0) return null;
    var p = s.slice(PREFIXO.length).split("-");
    while (p.length) { if (POR_ID[p.join("-")]) return p.join("-"); p.pop(); }
    return null;
  }
  function item(base, texto, extra) {
    return Object.assign({ id: idDe(base), texto: String(texto).slice(0, 1000), texto_sugerido: String(texto).slice(0, 1000), origem: "nutricionista", ref: null,
      sugestao: false, confirmado: true, mostrar_paciente: true, descartado: false }, extra || {});
  }
  /* escolha = { foco: { id, texto?, porque? } | { livre: texto }, direcionamentos: [{ titulo, territorio, objetivo, porque? }] (opcional: padrao = os do foco),
     estrategias: [{ id, titulo?, acao?, contexto?, observar?, prazo? }], observar: [texto] (opcional), proxima_etapa: texto (opcional) } */
  function montarDirecao(escolha) {
    escolha = escolha || {};
    var fx = escolha.foco || {}, def = fx.id ? POR_ID[fx.id] : null;
    var focoTxt = (fx.texto || (def && def.texto) || fx.livre || "").trim();
    var porque = (fx.porque !== undefined ? fx.porque : def ? def.porque : "") || "";
    var base = def ? def.id : "LIVRE";
    var out = { foco_atual: focoTxt ? item(base, focoTxt) : null, direcionamentos: [], estrategias: [], corpo: [], mente: [], espirito: [], observar: [], proxima_etapa: null };
    var dirs = escolha.direcionamentos || (def ? def.direcionamentos : []);
    dirs.filter(function (d) { return d && String(d.titulo || "").trim(); }).forEach(function (d, i) {
      out.direcionamentos.push(item(base + "-d" + (i + 1), d.titulo.trim(), { territorio: d.territorio || "integrado", porque: (d.porque !== undefined ? d.porque : porque) || "",
        objetivo: d.objetivo || "", status: "ativo", sistemas: def && def.sistema ? [def.sistema] : [] }));
    });
    var dirPorTerr = function (t) { var d = out.direcionamentos.filter(function (x) { return x.territorio === t; })[0] || out.direcionamentos[0]; return d ? d.id : ""; };
    (escolha.estrategias || []).slice(0, MAX_ESTRATEGIAS).forEach(function (s) {
      var e = POR_ID[s.id] || {};
      var titulo = String(s.titulo || e.titulo || "").trim();
      if (!titulo) return;
      var terr = e.territorio || s.territorio || "corpo";
      var it = item(e.id || "LIVRE-E", titulo, { direcionamento_id: dirPorTerr(terr), finalidade: "", acao: s.acao !== undefined ? s.acao : e.acao || "",
        observar: s.observar !== undefined ? s.observar : e.observar || "", contexto: s.contexto !== undefined ? s.contexto : e.contexto || "",
        prazo: s.prazo !== undefined ? s.prazo : PRAZO_PADRAO, responsavel: "Nutricionista (Playbook HOLOS)", status: "proposta" });
      out.estrategias.push(it);
      if (out[terr]) out[terr].push(item((e.id || "LIVRE-E") + "-t", titulo));
    });
    (escolha.observar || (def ? def.observar : [])).filter(function (x) { return String(x || "").trim(); }).forEach(function (x, i) { out.observar.push(item(base + "-o" + (i + 1), String(x).trim())); });
    var prox = escolha.proxima_etapa !== undefined ? escolha.proxima_etapa : def ? def.proxima_etapa : "";
    if (String(prox || "").trim()) out.proxima_etapa = item(base + "-p", String(prox).trim());
    return out;
  }
  /* resumo para a leitura profissional (rastreabilidade: versao do playbook e ids escolhidos) */
  function resumo(escolha) {
    var f = escolha && escolha.foco || {};
    var ids = (escolha && escolha.estrategias || []).map(function (s) { return s.id; }).filter(function (id) { return POR_ID[id]; });
    return "Montado com o Playbook HOLOS " + VERSAO + " · Foco " + (f.id && POR_ID[f.id] ? f.id : "escrito pela nutricionista") +
      (ids.length ? " · Estratégias " + ids.join(", ") : "") + ".";
  }

  /* todos os textos (para o teste de termos fora do metodo) */
  function textos() {
    var t = [];
    FOCOS.forEach(function (f) { t.push(f.texto, f.porque, f.proxima_etapa); f.observar.forEach(function (x) { t.push(x); }); f.direcionamentos.forEach(function (d) { t.push(d.titulo, d.objetivo); }); });
    ESTRATEGIAS.forEach(function (e) { t.push(e.titulo, e.acao, e.contexto, e.observar); });
    return t;
  }

  var api = { VERSAO: VERSAO, PREFIXO: PREFIXO, SISTEMAS: SISTEMAS, NOME_SISTEMA: NOME_SISTEMA, NOME_TERR: NOME_TERR, NOME_FERR: NOME_FERR,
    FOCOS: FOCOS, ESTRATEGIAS: ESTRATEGIAS, porId: function (id) { return POR_ID[id] || null; }, MAX_ESTRATEGIAS: MAX_ESTRATEGIAS, RECOMENDADO: RECOMENDADO, PAGINAS_PDF: PAGINAS_PDF, paginaPdf: function (f) { return PAGINAS_PDF[f] || null; }, TIPO: TIPO, NIVEL: NIVEL, PRAZO_PADRAO: PRAZO_PADRAO,
    opcoes: opcoes, montarDirecao: montarDirecao, resumo: resumo, textos: textos, origemPlaybook: origemPlaybook, orientacaoMomentum: orientacaoMomentum };
  raiz.PlaybookHolos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
