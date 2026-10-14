/**
 * Conteudo do PLAYBOOK DE ESTRATEGIAS (material para as nutricionistas): para cada sistema, por que ele aparece como area
 * prioritaria (os relatos do HOLOSCAN que ele organiza), o que entregar, e para cada estrategia (mesmos IDs do Playbook
 * PB-V1 do sistema): quando usar (relatos do HOLOSCAN que ela trabalha), a base, o que a nutricionista avalia e o que o
 * paciente ganha. Sem diagnostico, sem prescricao. Textos do HOLOSCAN: pacote HOLOS-V1 v7.
 */
export const SISTEMAS = {
  metabolico: {
    relatos: ['muito sono logo depois do almoço', 'fome de novo pouco tempo depois de comer', 'comer depois do jantar sem fome real',
      'irritação ou tremor quando atrasa uma refeição', 'acordar cansado mesmo dormindo as horas necessárias', 'dificuldade de perceber fome e saciedade', 'começar a comer sem nenhuma pausa'],
    porque: 'Quando este sistema aparece como área prioritária, o paciente marcou mais relatos ligados ao ritmo da alimentação: energia que oscila ao longo do dia, fome que volta cedo, beliscar à noite e pouca percepção de fome e saciedade. O caminho é organizar o ritmo (horários), treinar a percepção da fome e preparar os horários mais difíceis.',
    nutri: 'Leitura de que fome, energia e horários estão desorganizados na rotina real. No retorno, compare energia e fome entre as refeições antes e depois dos horários âncora.',
    paciente: 'Mais energia ao longo do dia, menos fome “fora de hora” e mais tranquilidade para escolher o que comer.'
  },
  fungico: {
    relatos: ['vontade forte de doce ou pão quase todo dia', 'barriga inchada ou gases depois das refeições', 'língua com camada esbranquiçada',
      'coceira na região íntima ou anal', 'cabeça pesada ou confusa depois de massa ou doce', 'caspa ou coceira no couro cabeludo', 'nariz entupido ou sinusite frequente', 'comida gordurosa que pesa ou faz mal'],
    porque: 'Quando este sistema aparece como área prioritária, o paciente marcou mais relatos digestivos e alimentares (vontade frequente de doce e pão, estufamento depois das refeições, peso depois de massa ou doce) e relatos de mucosas e couro cabeludo. O método organiza esses relatos juntos para olhar a relação entre o que se come, o ritmo das refeições e o conforto digestivo. Não é diagnóstico de fungos, candidíase ou infecção: é um eixo de observação.',
    nutri: 'Leitura de que doces/pães, ritmo das refeições e conforto digestivo merecem observação. No retorno, compare o diário do conforto digestivo e o mapa dos doces: em que situações a vontade e o desconforto aparecem.',
    paciente: 'Entender o que está por trás da vontade de doce e do desconforto depois de comer, e ter refeições mais tranquilas.'
  },
  acido_inflamatorio: {
    relatos: ['dor nas articulações mesmo sem esforço', 'acordar com o corpo travado', 'corpo dolorido sem causa clara', 'azia ou queimação no estômago',
      'dor de cabeça mais de uma vez por semana', 'gengiva que sangra ao escovar', 'piora com ultraprocessados ou açúcar', 'mãos ou dedos inchados ao acordar'],
    porque: 'Quando este sistema aparece como área prioritária, o paciente marcou mais relatos de dor, rigidez, desconforto e reatividade percebida (piora com ultraprocessados ou açúcar, azia, dor de cabeça frequente). O caminho é entender quando e em que situações os desconfortos aparecem e cuidar da recuperação (sono, movimento possível, pausas). O termo “ácido” é do método: o eixo não mede inflamação, pH ou “acidez do corpo”.',
    nutri: 'Leitura de que os desconfortos têm padrões de horário, de dia e de contexto a investigar. No retorno, compare o diário do desconforto (nota de 0 a 10) com sono, tensão e alimentação dos mesmos dias. Dor persistente ou intensa é para avaliação de quem acompanha a saúde do paciente.',
    paciente: 'Conhecer o padrão dos seus desconfortos e ganhar mais disposição com sono, movimento e pausas que cabem na sua rotina.'
  },
  detox_linfatico: {
    relatos: ['inchaço nas pernas ou nos pés no fim do dia', 'rosto inchado ao acordar', 'incômodo com cheiros fortes', 'passar um dia ou mais sem evacuar',
      'ressaca com pouca bebida', 'reação forte a medicamento ou café'],
    porque: 'Quando este sistema aparece como área prioritária, o paciente marcou mais relatos de retenção percebida (inchaço no fim do dia ou ao acordar), de ritmo intestinal (dias sem evacuar) e de sensibilidade relatada a substâncias (café, bebida, cheiros). O caminho é observar o funcionamento intestinal, distribuir água e movimento ao longo do dia e perceber o que piora ou melhora o inchaço. “Detox” é nome do método: o eixo não mede toxinas, fígado ou circulação linfática.',
    nutri: 'Leitura de que ritmo intestinal, hidratação, movimento e tempo parado merecem observação. No retorno, compare o registro do intestino e o diário do inchaço com a água e as pausas de movimento.',
    paciente: 'Um intestino com ritmo mais regular, menos sensação de inchaço e um dia com mais leveza.'
  },
  mental_emocional_espiritual: {
    relatos: ['demorar a dormir porque a cabeça não desliga', 'acordar de madrugada', 'comer para se acalmar quando ansioso ou triste', 'estar sempre em alerta',
      'comida como recompensa ou para preencher um vazio', 'culpa ou vergonha depois de comer', 'falar consigo de forma dura', '“perdi tudo” quando sai da linha', 'pouca clareza de direção ou de valores'],
    porque: 'Quando este sistema aparece como área prioritária, o paciente marcou mais relatos de sono, alerta e preocupação, de comer para regular emoções (acalmar, recompensar, preencher), de autocrítica e culpa, e de sentido e direção. O caminho é cuidar do descanso, reconhecer a emoção antes de comer e conectar o cuidado ao que dá sentido à vida do paciente. Não é diagnóstico de transtorno mental e não mede saúde espiritual; sofrimento intenso é para acompanhamento especializado.',
    nutri: 'Leitura de que sono, emoções e diálogo interno estão influenciando a alimentação. No retorno, compare as emoções registradas antes de comer, o sono e a frequência do “tudo ou nada”.',
    paciente: 'Dormir melhor, comer com menos culpa e reconhecer o que você sente antes de comer, com o cuidado ligado ao que importa para você.'
  },
  geral: {
    porque: 'Estratégias que servem para qualquer paciente, qualquer que seja a área prioritária: registro, atenção nas refeições, planejamento, sono, movimento, água, pausas e sentido. Use para completar o plano ou quando o HOLOSCAN não indicar uma área prioritária.',
    nutri: 'Ponto de partida comum: dão dados da rotina real para o próximo encontro.',
    paciente: 'Pequenos passos possíveis que preparam as próximas mudanças.'
  }
};

/* [quando usar (relatos que trabalha), base (fundamento), o que a nutricionista avalia no retorno, o que o paciente ganha] */
export const ESTRATEGIAS = {
  'ME-C1': ['Fome que volta cedo, irritação quando atrasa a refeição, sono depois do almoço.', 'Regularidade alimentar: horários previsíveis organizam fome e energia ao longo do dia.', 'Quantos dias os horários foram mantidos e como ficou a energia entre as refeições.', 'Energia mais estável e menos fome fora de hora.'],
  'ME-C2': ['Pouca percepção de fome e saciedade; começa a comer com fome muito alta.', 'Escala de fome e saciedade: treina a percepção dos sinais internos (interocepção).', 'Se as notas de início ficaram menos extremas e se percebe melhor o fim da refeição.', 'Reconhecer quando está com fome e quando já está satisfeito.'],
  'ME-C3': ['Sono ou queda de energia depois do almoço; acorda cansado.', 'Automonitoramento: ligar a refeição ao que se sente depois mostra padrões pessoais.', 'Em quais refeições a energia cai; o que essas refeições têm em comum.', 'Descobrir quais refeições te deixam com mais disposição.'],
  'ME-C4': ['Fome forte em um horário fixo (fim da tarde, chegada em casa).', 'Planejamento antecipado: decidir antes do pico de fome reduz escolhas por impulso.', 'Se chegou à refeição seguinte com menos fome e menos beliscos.', 'Passar pelo horário difícil sem chegar “morrendo de fome”.'],
  'ME-M1': ['Come fora de hora, belisca, come depois do jantar sem fome.', 'Diferenciar fome física de fome emocional: perguntar antes de comer cria uma pausa de escolha.', 'Quantas vezes era “outra coisa” e o que era (cansaço, tédio, ansiedade).', 'Comer quando é fome e cuidar do resto de outro jeito.'],
  'ME-M2': ['Come sem fome real com frequência.', 'Cadeia do comportamento (situação → pensamento → emoção → resposta): mostra o que vem antes.', 'Situações que se repetem e o primeiro elo da cadeia para trabalhar.', 'Entender o que puxa a vontade de comer sem fome.'],
  'ME-M3': ['Depois de exagerar, pula refeição para “compensar”.', 'O ciclo restrição → fome intensa → excesso se mantém com a compensação; quebrar o ciclo regulariza a fome.', 'Se a compensação apareceu e o que a pessoa sentiu.', 'Sair do ciclo de exagerar e compensar.'],
  'ME-M4': ['Gatilho que se repete (registrado no Gatilhos & Respostas).', 'Planos “se acontecer X, faço Y” (intenções de implementação) aumentam a chance de agir diferente.', 'Se a resposta combinada foi usada e o que mudou.', 'Ter um plano pronto para o momento mais difícil.'],
  'ME-E1': ['Pouca energia para o que importa; desânimo com a rotina.', 'Motivação ligada a valores sustenta mudanças por mais tempo do que regras.', 'Se ligar a alimentação à atividade escolhida ajudou a manter os horários.', 'Energia para fazer o que você gosta.'],
  'ME-E2': ['Piloto automático; começa a comer sem pausa.', 'Uma intenção simples no início do dia aumenta a atenção ao comportamento escolhido.', 'Em quantos dias a intenção foi lembrada e cumprida.', 'Começar o dia com um cuidado escolhido por você.'],
  'ME-E3': ['Come sozinho, rápido, sem pausa.', 'Comer acompanhado e com tempo favorece atenção e prazer na refeição.', 'Como foi a refeição com presença (ritmo, saciedade, prazer).', 'Uma refeição que nutre também o vínculo.'],
  'ME-E4': ['Refeições atropeladas por compromissos.', 'Proteger horários na agenda transforma intenção em rotina.', 'Se o horário protegido se manteve.', 'Seu horário de comer respeitado.'],
  'FU-C1': ['Barriga inchada ou gases depois das refeições; comida gordurosa que pesa.', 'Automonitoramento do conforto digestivo: liga refeições e contextos ao que se sente.', 'Em quais refeições o desconforto aparece e o que elas têm em comum.', 'Saber quais refeições te deixam mais confortável.'],
  'FU-C2': ['Estufamento, refeições rápidas, comer em pé ou com telas.', 'Comer com calma e mastigar bem favorece a digestão e a percepção de saciedade.', 'Diferença no conforto nas refeições feitas com calma.', 'Refeições mais leves e confortáveis.'],
  'FU-C3': ['Vontade forte de doce ou pão quase todo dia; cabeça pesada depois de massa ou doce.', 'Registrar horário e contexto mostra quando a vontade aparece (horário, cansaço, emoção).', 'Horários e situações que se repetem; ligação com o conforto e a energia.', 'Entender quando e por que a vontade de doce aparece.'],
  'FU-C4': ['Belisco frequente, principalmente de doces.', 'Uma pausa curta antes de agir reduz a resposta automática à vontade.', 'Quantas vezes a vontade mudou depois da pausa.', 'Escolher com calma em vez de agir no impulso.'],
  'FU-M1': ['Desconforto digestivo em dias tensos.', 'Emoções e estresse interferem no conforto digestivo; registrar os dois juntos mostra a relação.', 'Se dias tensos e desconforto andam juntos.', 'Perceber como o seu dia emocional aparece na digestão.'],
  'FU-M2': ['Vontade de doce como recompensa, consolo ou cansaço.', 'Nomear a necessidade por trás da vontade abre outras formas de atendê-la.', 'Qual necessidade aparece mais (cansaço, recompensa, tédio, fome).', 'Cuidar da necessidade real, não só da vontade.'],
  'FU-M3': ['Culpa depois de comer doce ou pão; ideias de “proibido”.', 'Crenças rígidas sobre comida alimentam o ciclo proibição → vontade → culpa.', 'Qual ideia apareceu e em que situações.', 'Comer com menos culpa.'],
  'FU-M4': ['Horário fixo em que a vontade de doce aparece.', 'Plano “se-então” para o horário crítico.', 'Se o plano foi seguido e como ficou a vontade.', 'Um plano pronto para o momento da vontade.'],
  'FU-E1': ['Relação apressada ou distante com a comida.', 'Preparar a própria refeição com atenção reforça o cuidado consigo.', 'Como a pessoa se sentiu ao cuidar de si.', 'A refeição como um gesto de cuidado com você.'],
  'FU-E2': ['Come no automático, sem pausa.', 'Respiração lenta antes de comer reduz a pressa e aumenta a atenção.', 'Se a refeição ficou mais tranquila.', 'Um momento de calma antes de comer.'],
  'FU-E3': ['Come em pé, com telas, em ambiente agitado.', 'O ambiente da refeição influencia o ritmo e a atenção ao comer.', 'Se mudar o ambiente mudou a forma de comer.', 'Um lugar agradável para as suas refeições.'],
  'FU-E4': ['Desânimo, foco só no que não deu certo.', 'Reconhecer pequenas conquistas sustenta a motivação.', 'Quais conquistas apareceram.', 'Enxergar o que já está mudando.'],
  'AI-C1': ['Dor, rigidez ou desconforto frequentes; dor de cabeça semanal.', 'Diário com nota de 0 a 10 mostra padrões de horário, de dia e de contexto.', 'Padrões de horário e de dia; relação com sono e alimentação.', 'Conhecer o padrão dos seus desconfortos.'],
  'AI-C2': ['Corpo travado ao acordar, rigidez, pouca disposição.', 'Movimento possível e regular, dentro do que é seguro, favorece mobilidade e disposição.', 'Como o corpo respondeu nas horas seguintes; frequência mantida.', 'Mais mobilidade e disposição no dia a dia.'],
  'AI-C3': ['Piora percebida com ultraprocessados ou açúcar.', 'Comparar dias bons e difíceis mostra relações entre alimentação, rotina e desconforto.', 'Diferenças entre os dias (alimentação, sono, tensão).', 'Descobrir o que está nos seus dias melhores.'],
  'AI-C4': ['Acorda travado, cansado, com dor.', 'Regularidade do sono favorece a recuperação do corpo.', 'Rigidez e disposição ao acordar nos dias de horário regular.', 'Acordar com o corpo mais leve.'],
  'AI-M1': ['Desconforto que piora em dias tensos.', 'Tensão e percepção de dor se influenciam; registrar as duas notas mostra a relação.', 'Se tensão e desconforto andam juntos.', 'Perceber o peso da tensão no seu corpo.'],
  'AI-M2': ['Tensão acumulada em ombros, pescoço e mandíbula; dor de cabeça.', 'Pausas de respiração e soltura reduzem a tensão muscular acumulada.', 'Se o desconforto mudou depois das pausas.', 'Soltar o corpo ao longo do dia.'],
  'AI-M3': ['Desânimo com a dor (“nunca vai melhorar”).', 'Observar o pensamento que acompanha o desconforto ajuda a não aumentá-lo.', 'Pensamentos que se repetem.', 'Lidar com o desconforto com mais calma.'],
  'AI-M4': ['Sobrecarga de rotina, dias sem pausa.', 'Reduzir a sobrecarga favorece a recuperação.', 'Se a proteção foi usada e o que mudou.', 'Mais espaço para se recuperar.'],
  'AI-E1': ['Abandonou atividades de que gostava por causa do desconforto.', 'Atividades prazerosas adaptadas mantêm a motivação e o movimento.', 'Como se sentiu depois da atividade.', 'Voltar a fazer o que te dá prazer, no seu ritmo.'],
  'AI-E2': ['Dificuldade de descansar; culpa por parar.', 'Descanso planejado faz parte da recuperação.', 'Se conseguiu descansar de verdade.', 'Descansar sem culpa.'],
  'AI-E3': ['Relação de briga com o próprio corpo.', 'Gratidão pelo que o corpo permite muda o foco da limitação para a capacidade.', 'Como mudou a relação com o corpo.', 'Olhar para o seu corpo com mais gentileza.'],
  'AI-E4': ['Pouca motivação para manter o cuidado.', 'Ligar o cuidado a algo que se quer continuar fazendo dá sentido à mudança.', 'Se esse sentido ajudou a manter o cuidado.', 'Cuidar do corpo para viver o que importa.'],
  'DL-C1': ['Passa um dia ou mais sem evacuar.', 'Registro diário mostra o ritmo intestinal e o que o influencia.', 'Ritmo e conforto; relação com água, movimento e rotina.', 'Conhecer e regular o seu ritmo intestinal.'],
  'DL-C2': ['Inchaço no fim do dia, pouca água ao longo do dia.', 'Ancorar a água em momentos fixos (empilhamento de hábitos) facilita lembrar sem esforço.', 'Se a sede e a sensação de inchaço mudaram.', 'Beber água sem precisar lembrar o tempo todo.'],
  'DL-C3': ['Inchaço nas pernas ou nos pés no fim do dia; muito tempo sentada.', 'Interromper longos períodos parado favorece a sensação de leveza.', 'Inchaço no fim do dia nos dias com pausas.', 'Pernas mais leves no fim do dia.'],
  'DL-C4': ['Inchaço ao acordar ou no fim do dia.', 'Diário mostra quando o inchaço aparece e o que veio antes.', 'Relação com alimentação, tempo sentada e sono.', 'Entender o que piora e o que melhora o seu inchaço.'],
  'DL-M1': ['Rotina corrida, intestino irregular.', 'Adiar a ida ao banheiro desregula o ritmo intestinal.', 'Quando a pressa interferiu.', 'Respeitar o ritmo do seu corpo.'],
  'DL-M2': ['Intestino que muda em dias tensos.', 'Estresse interfere no ritmo intestinal; registrar os dois mostra a relação.', 'Se tensão e intestino andam juntos.', 'Perceber como o seu dia afeta o intestino.'],
  'DL-M3': ['Busca de “limpezas”, restrições ou compensações.', 'Ideias rígidas de “limpar o corpo” levam a restrições que não se sustentam.', 'Quais ideias apareceram e como influenciaram as escolhas.', 'Cuidar sem precisar se privar.'],
  'DL-M4': ['Dias corridos que desorganizam tudo.', 'Definir o mínimo para os dias difíceis evita o “tudo ou nada”.', 'Se o mínimo foi mantido nos dias corridos.', 'Manter o essencial mesmo nos dias difíceis.'],
  'DL-E1': ['Manhãs apressadas, sem espaço para o corpo.', 'Começar o dia sem pressa favorece rotinas regulares, inclusive a intestinal.', 'Como passaram a começar os dias.', 'Começar o dia com mais calma.'],
  'DL-E2': ['Rotina fechada, pouco contato com o ar livre.', 'Tempo ao ar livre favorece disposição e humor.', 'Disposição e humor nos dias ao ar livre.', 'Respirar e renovar a energia.'],
  'DL-E3': ['Agenda cheia, dificuldade de dizer não.', 'Proteger o próprio ritmo reduz a sobrecarga.', 'Se conseguiu recusar e como se sentiu.', 'Mais espaço para o seu próprio ritmo.'],
  'DL-E4': ['Sobrecarga com a casa e a rotina.', 'Apoio concreto de quem está perto facilita manter o cuidado.', 'Se sobrou mais espaço para o cuidado.', 'Dividir o peso da rotina.'],
  'MEE-C1': ['Demora a dormir porque a cabeça não desliga.', 'Higiene do sono: rotina repetida e menos tela à noite preparam o corpo para dormir.', 'Tempo para pegar no sono e como acordou.', 'Pegar no sono com mais facilidade.'],
  'MEE-C2': ['Acorda cansado, horários de sono irregulares.', 'Horário regular de acordar ajusta o relógio biológico.', 'Disposição pela manhã.', 'Acordar com mais disposição.'],
  'MEE-C3': ['Sono agitado; come muito perto de dormir.', 'O intervalo entre a última refeição e o sono influencia a qualidade do sono.', 'Como dormiu em cada situação.', 'Noites mais tranquilas.'],
  'MEE-C4': ['Cansaço, desânimo, sono desregulado.', 'Luz natural pela manhã ajuda a regular o ritmo do dia (ritmo circadiano).', 'Disposição e humor nos dias com luz da manhã.', 'Mais energia e humor ao longo do dia.'],
  'MEE-M1': ['Come para se acalmar quando ansioso ou triste; come como recompensa.', 'Nomear a emoção antes de comer diferencia fome física de fome emocional.', 'Emoções que se repetem antes de comer.', 'Reconhecer o que você sente antes de comer.'],
  'MEE-M2': ['Sempre em alerta; come no impulso quando tenso.', 'Respiração lenta acalma a resposta de alerta e abre espaço para escolher.', 'Se a decisão mudou depois da pausa.', 'Decidir com calma, mesmo em dias tensos.'],
  'MEE-M3': ['Fala consigo de forma dura; culpa ou vergonha depois de comer.', 'Autocompaixão reduz o ciclo de culpa → desistência → excesso.', 'Como se sentiu com a nova frase; frequência da autocrítica.', 'Falar com você como falaria com quem você ama.'],
  'MEE-M4': ['Preocupação com o que ainda nem aconteceu; cabeça que não desliga.', 'Escrever as preocupações antes de dormir alivia a mente.', 'Se o sono ficou mais tranquilo.', 'Deitar com a cabeça mais leve.'],
  'MEE-E1': ['Pouca clareza de direção; rotina que afasta do que quer.', 'Ações pequenas ligadas a valores dão sentido e sustentam a mudança.', 'Como se sentiu ao agir de acordo com o que valoriza.', 'Viver um pouco mais perto do que importa.'],
  'MEE-E2': ['Afastamento das pessoas; dificuldade de aceitar cuidado.', 'Vínculos de apoio protegem o bem-estar e ajudam a manter mudanças.', 'Como se sentiu depois do contato.', 'Sentir-se acompanhado no processo.'],
  'MEE-E3': ['Sente falta de algo maior que sustente; quer um momento de pausa e gratidão.', 'Práticas de sentido (oração, meditação, contemplação) favorecem calma e pertencimento.', 'Como fica o dia com a prática.', 'Um momento seu de calma e conexão.'],
  'MEE-E4': ['Não se reconhece na própria vida; repete histórias antigas sobre si.', 'Refletir sobre o caminho reforça a identidade que se quer construir.', 'O que já está mudando na percepção de si.', 'Enxergar quem você está se tornando.'],
  'G01': ['Início do acompanhamento; rotina pouco conhecida.', 'Registro curto dá um retrato da rotina real sem sobrecarregar.', 'Horários, fome e energia dos 3 dias.', 'Enxergar a sua rotina como ela é.'],
  'G02': ['Come rápido, com telas, no automático.', 'Comer com atenção favorece saciedade e prazer.', 'Saciedade e calma nessa refeição.', 'Uma refeição por dia com mais prazer.'],
  'G03': ['Semana corrida, decisões de última hora.', 'Planejar com antecedência reduz decisões no impulso.', 'Se os dias ficaram mais fáceis.', 'Uma semana mais organizada.'],
  'G04': ['Sono irregular; cansaço.', 'Regularidade do sono sustenta energia e apetite mais estáveis.', 'Disposição nos dias regulares.', 'Dormir e acordar melhor.'],
  'G05': ['Pouco movimento; pouca disposição.', 'Movimento prazeroso tem mais chance de virar hábito.', 'Disposição e humor nos dias com movimento.', 'Mexer o corpo com prazer.'],
  'G06': ['Pouca água ao longo do dia.', 'Deixar a água à vista facilita o hábito (sinal no ambiente).', 'Sede e disposição.', 'Beber água sem esforço.'],
  'G07': ['Horário do dia em que tudo desanda.', 'Identificar o horário crítico e o que vem antes orienta onde agir primeiro.', 'O que se repete antes do horário difícil.', 'Saber onde está o seu momento mais difícil.'],
  'G08': ['Come fora do combinado no impulso.', 'Uma pausa curta interrompe a resposta automática.', 'Se a vontade mudou depois da pausa.', 'Escolher com mais calma.'],
  'G09': ['“Já que errei, chuto o balde”.', 'Abandonar o pensamento tudo ou nada evita que um deslize vire um dia inteiro.', 'Como lidou com o deslize.', 'Um deslize não apaga o seu dia.'],
  'G10': ['Desânimo; foco no que não deu certo.', 'Registrar avanços reforça a motivação.', 'Quais avanços apareceram.', 'Ver o seu progresso.'],
  'G11': ['Motivação que oscila.', 'Lembrar o propósito (Escada dos Porquês) sustenta a mudança nos dias difíceis.', 'Se lembrar ajudou nos momentos difíceis.', 'Lembrar por que você começou.'],
  'G12': ['Áreas da vida que pesam (Roda da Vida).', 'Pequenos gestos em uma área escolhida ampliam o bem-estar geral.', 'Como se sentiu com o gesto semanal.', 'Cuidar de uma área da vida que pede atenção.'],
  'G13': ['Sente-se sozinho no processo.', 'Apoio social favorece a adesão às mudanças.', 'Se se sentiu apoiado.', 'Ter alguém do seu lado nesta fase.'],
  'G14': ['Pressa e automatismo nas refeições.', 'Uma pausa de gratidão muda o ritmo e a atenção ao comer.', 'Como ficou a refeição.', 'Comer com mais presença e gratidão.'],
  'G15': ['Fez a Carta ao Futuro Eu.', 'Retomar a direção escrita pela própria pessoa fortalece a identidade desejada.', 'Se a frase ajudou.', 'Ter por perto a sua própria direção.']
};
