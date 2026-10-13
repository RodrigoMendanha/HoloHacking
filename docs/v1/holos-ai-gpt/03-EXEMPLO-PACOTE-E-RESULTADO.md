# HOLOS AI — Exemplo de referência (caso FICTÍCIO) · HOLOS-AI-GPT 1.2

Padrão de qualidade esperado. Caso fictício ("Paciente Teste T5 Fictícia"), igual ao Resultado HOLOS de teste exportado pelo HoloHacking. Use como modelo de profundidade, tom, rastreabilidade e limites; nunca copie conteúdo deste caso para outro atendimento.

O que torna esta resposta boa:
- **Saída canônica completa:** bloco legível HOLOS_AI_RESULT + JSON válido (`schema_version: 1`) com o mesmo conteúdo. O JSON deste exemplo é o arquivo `exemplo-resultado.json`.
- **Propositiva só com o que os dados sustentam:**
  - 3 ferramentas pela regra PP-V1 (com ID), pulando a já concluída e sem duplicata;
  - estratégias classificadas (observação, comportamental/metodológica, requer decisão profissional na Conduta);
  - Corpo com material; Mente com uma observação ligada a sinais reais; Espírito "Ainda não aprofundado nesta etapa." (nada inventado).
- **Primeira consulta:** a estratégia acordada fica "MANTER EM OBSERVAÇÃO — SUGERIDO", não "MANTER".
- **Segura:**
  - não diagnostica;
  - não afirma causa;
  - não prescreve (a composição do lanche fica com a Conduta);
  - não recalcula o HOLOSCAN.

## 1. Documento recebido (entrada)

### Identificação do documento
- Documento: Resultado HOLOS (exportado pelo HoloHacking)
- Paciente: Paciente Teste T5 Fictícia
- Data do encontro: 13/10/2026
- Evolução: Sem evolução registrada nesta etapa (ponto de partida)

### Foco atual
Organizar o fim da tarde.

### Direcionamento
- Direcionamento: Organizar o fim da tarde
- Território: Corpo
- Sistema ligado: Metabólico

### Estratégia acordada
- Estratégia: Lanche planejado antes da fome forte
- O que fará: Levar um lanche planejado e comer por volta das 16h
- Acordo: Preparar o lanche na noite anterior
- O que observar: Intensidade da fome e disposição entre 16h e 18h
- Prazo: Até o próximo encontro (cerca de 2 semanas)
- Status: Acordada

### Corpo · Mente · Espírito
- Corpo: Lanche planejado e observação de fome e disposição
- Mente: Ainda não aprofundado nesta etapa.
- Espírito: Ainda não aprofundado nesta etapa.

### HOLOSCAN (HOLOS-V1 v7)
- Índice HOLOS: 55,3 de 100
- Tríade: Corpo 5,6 · Mente 6,5 · Espírito 5,2
- Sistema Metabólico: 2,4 · primeira área para aprofundar
- Sistema Fúngico: 5,8 · segunda área para aprofundar
- Sistema Mental Emocional Espiritual: 6,1
- Sistema Ácido Inflamatório: 6,7
- Sistema Detox e Linfático: 6,7

### Sinais que mais pesaram (do HOLOSCAN)
- Metabólico: Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida
- Fúngico: Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; camada esbranquiçada na língua

### Ferramenta aplicada — Mapa da Rotina
- Sono: Dorme bem e acorda razoavelmente disposta
- Trabalho: Escritório, das 9h às 18h, com reuniões à tarde
- Momento de maior dificuldade: 16h–18h: fome forte e queda de disposição
- Espaço para mudança: Preparar o lanche na noite anterior

## 2. Resposta esperada no chat

### A. Bloco legível

```
=== HOLOS_AI_RESULT ===
TIPO: primeira_consulta
ENTRADA: pdf_resultado_holos (base principal: pdf_resultado_holos) — Só o PDF do Resultado HOLOS foi enviado (fallback temporário). Com o Pacote HOLOS AI, o Pacote prevalece.

SINTESE_INTEGRADA:
Primeira consulta, ponto de partida sem evolução registrada. O HOLOSCAN indica o Sistema Metabólico (2,4) e o Fúngico (5,8) como as primeiras áreas para aprofundar. O Mapa da Rotina localizou a dificuldade principal entre 16h e 18h (fome forte e queda de disposição) e um espaço real de mudança: preparar o lanche na noite anterior. Foco, direcionamento e estratégia acordada já conversam entre si. Ainda falta aprofundar o comportamento alimentar fora do fim da tarde (fome logo depois de comer, comer depois do jantar sem fome, vontade de doce ou pão) e os relatos digestivos. Mente e Espírito ainda não foram aprofundados nesta etapa.

O_QUE_APARECEU:
- Foco atual: organizar o fim da tarde. (Resultado HOLOS: foco)
- Sistema Metabólico 2,4 e Sistema Fúngico 5,8 como primeira e segunda áreas para aprofundar. (HOLOSCAN (HOLOS-V1 v7))
- Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida. (HOLOSCAN: sinais do Metabólico)
- Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua. (HOLOSCAN: sinais do Fúngico)
- Fome forte e queda de disposição entre 16h e 18h; reuniões à tarde; espaço para mudança: preparar o lanche na noite anterior. (Mapa da Rotina)
- Estratégia acordada: lanche planejado antes da fome forte, por volta das 16h. (Resultado HOLOS: estratégia acordada)

CONVERGENCIAS:
- Fome forte e queda de disposição no fim da tarde aparecem no Mapa da Rotina e conversam com os sinais do Metabólico (sono depois do almoço, fome pouco depois de comer).
- Vontade forte de doce ou pão e comer depois do jantar sem fome são comportamentos alimentares recorrentes que podem ser investigados em conjunto, sem relação de causa estabelecida.
- O espaço de mudança relatado (preparar o lanche na noite anterior) e a estratégia acordada são coerentes entre si.

PADROES_OBSERVADOS:
- As dificuldades se concentram em dois momentos do dia: depois do almoço / fim da tarde e depois do jantar.
- A rotina de trabalho tem reuniões à tarde, justamente no horário crítico.

PONTOS_PARA_APROFUNDAR:
- O que acontece antes de comer depois do jantar sem fome (situação, pensamento, emoção)?
- Em que momentos a vontade de doce ou pão aparece?
- Os gases e o inchaço aparecem depois de quais refeições?
- [HIPÓTESE · só profissional] As reuniões da tarde podem dificultar comer por volta das 16h. Conferir no retorno.
- [HIPÓTESE · só profissional] A fome do fim da tarde e o comer depois do jantar podem fazer parte de um mesmo padrão do dia. Investigar com episódios concretos.

SISTEMAS_PRIORITARIOS:
1. Sistema Metabólico (2,4 · primeira área para aprofundar)
   O que apareceu: Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida; fome forte e queda de disposição entre 16h e 18h (Mapa da Rotina).
   O que vale observar: Horários, intervalos entre refeições, fome, saciedade e energia ao longo do dia, com atenção a 16h–18h e ao período depois do jantar.
   Como cuidar deste eixo: Alimentação, horários, fome, energia e rotina merecem aprofundamento. O eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas.
2. Sistema Fúngico (5,8 · segunda área para aprofundar)
   O que apareceu: Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.
   O que vale observar: Em que situações a vontade de doce ou pão aparece; depois de quais refeições surgem gases e inchaço.
   Como cuidar deste eixo: Este eixo concentrou mais marcadores nesta aplicação e merece ser aprofundado no contexto da alimentação, rotina e sinais relatados. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença.

FERRAMENTAS_JA_APLICADAS:
- Mapa da Rotina (concluida): Localizou a dificuldade no fim da jornada (16h–18h), mostrou as reuniões da tarde e revelou um espaço viável de mudança: preparar o lanche na noite anterior.

FERRAMENTAS_RECOMENDADAS (até 3, PP-V1):
1. PRINCIPAL — Gatilhos & Respostas (REC-MET-02 · Mente · Sistema Metabólico)
   Por que: Ajuda a aprofundar comportamentos alimentares recorrentes dentro das situações em que acontecem. REC-MET-01 (Mapa da Rotina) já foi concluída neste atendimento.
   Como aplicar: Escolha episódios concretos e observe o que acontece antes, durante e depois do comportamento. Comece por um episódio de comer depois do jantar sem fome.
   O que procurar: Situação, pensamento, emoção e consequência percebida antes de comer sem fome; repetição do padrão em dias diferentes.
   Status: SUGERIDO
2. COMPLEMENTAR — Mapa de Crenças Alimentares (REC-FUN-03 · Mente · Sistema Fúngico)
   Por que: Permite investigar ideias e regras sobre alimentação que podem estar influenciando escolhas. REC-FUN-01 (Mapa da Rotina) já concluída; REC-FUN-02 (Gatilhos & Respostas) já escolhida como principal.
   Como aplicar: Identifique uma crença relevante, sua origem percebida, as situações em que aparece e seu impacto relatado.
   O que procurar: Ideias ligadas à vontade de doce ou pão (recompensa, cansaço, merecimento) e onde elas aparecem no dia.
   Status: SUGERIDO
3. COMPLEMENTAR — Linha do Momentum (REC-MET-04 · Corpo · Sistema Metabólico)
   Por que: Ajuda a avaliar a capacidade atual de sustentar mudanças antes de aumentar a exigência. REC-MET-03 (Mapa de Crenças Alimentares) já escolhida como complementar.
   Como aplicar: Avalie as seis dimensões do Momentum e registre o estado escolhido pela profissional.
   O que procurar: Quanto espaço existe para acrescentar uma segunda estratégia depois do lanche da tarde.
   Status: SUGERIDO

DIRECIONAMENTOS:
D1. Organizar o fim da tarde (existente)
   Território / sistema: Corpo / Sistema Metabólico
   Por que: O fim da tarde concentra fome forte e queda de disposição, e já existe uma ação viável identificada.
   Objetivo desta etapa: Chegar ao fim da jornada com fome mais administrável e mais disposição.
   Baseado em: Resultado HOLOS: foco e direcionamento registrados; HOLOSCAN: Metabólico como primeira área (2,4); Mapa da Rotina: 16h–18h
   Catálogo: CANDIDATO NÃO CATALOGADO — requer validação profissional
   Status: SUGERIDO
D2. Compreender os momentos de comer sem fome e de vontade de doce ou pão (nova)
   Território / sistema: Mente / Sistema Fúngico
   Por que: Comer depois do jantar sem fome e vontade forte de doce ou pão aparecem como comportamentos recorrentes ainda não aprofundados.
   Objetivo desta etapa: Identificar em quais situações esses comportamentos aparecem, antes de propor mudanças neles.
   Baseado em: HOLOSCAN: sinais do Metabólico e do Fúngico; Catálogo PP-V1: REC-MET-02 e REC-FUN-03
   Catálogo: CANDIDATO NÃO CATALOGADO — requer validação profissional
   Status: SUGERIDO

ESTRATEGIAS:
E1. [CORPO] Lanche planejado antes da fome forte (acordada)
   Direcionamento: D1
   Classificação: Comportamental/metodológica
   Decisão sugerida: MANTER EM OBSERVAÇÃO — SUGERIDO — Estratégia criada neste encontro; ainda não há dado de aplicação para avaliar resposta.
   O que fazer: Preparar o lanche na noite anterior e comer por volta das 16h.
   O que observar: Intensidade da fome e disposição entre 16h e 18h.
   Prazo: Até o retorno (cerca de 2 semanas)
   Critério de sucesso: Conseguir aplicar na maior parte dos dias de trabalho e perceber fome mais administrável às 18h.
   Baseado em: Resultado HOLOS: estratégia acordada; Mapa da Rotina: espaço de mudança na noite anterior
   Catálogo: CANDIDATA NÃO CATALOGADA — requer validação profissional
   Status: SUGERIDO
E2. [CORPO] Plano B para dias de reunião às 16h (nova)
   Direcionamento: D1
   Classificação: Comportamental/metodológica
   O que fazer: Combinar um horário alternativo (antes ou logo depois da reunião) para os dias em que 16h estiver ocupado.
   O que observar: Em quantos dias a reunião impediu o lanche e se o horário alternativo funcionou.
   Prazo: Até o retorno
   Critério de sucesso: A reunião deixar de ser o motivo de pular o lanche.
   Baseado em: Mapa da Rotina: reuniões à tarde
   Catálogo: CANDIDATA NÃO CATALOGADA — requer validação profissional
   Status: SUGERIDO
E3. [CORPO] Registro rápido de fome e disposição às 16h e às 18h (nova)
   Direcionamento: D1
   Classificação: Observação
   O que fazer: Anotar de 0 a 10 a fome e a disposição às 16h e às 18h e marcar se comeu o lanche.
   O que observar: Diferença entre dias com e sem o lanche.
   Prazo: Até o retorno
   Critério de sucesso: Ter registros suficientes para comparar no retorno.
   Baseado em: Resultado HOLOS: o que observar definido
   Catálogo: CANDIDATA NÃO CATALOGADA — requer validação profissional
   Status: SUGERIDO
E4. [CORPO] Composição do lanche da tarde (nova)
   Direcionamento: D1
   Classificação: Requer decisão profissional na Conduta
   O que fazer: Definir na Conduta o que compõe o lanche. A HOLOS AI não sugere alimentos, quantidades nem substituições.
   O que observar: Sem dado (depende da decisão profissional).
   Prazo: Na Conduta deste atendimento
   Critério de sucesso: Composição registrada pela nutricionista na Conduta.
   Baseado em: Resultado HOLOS: estratégia acordada sem composição definida
   Catálogo: CANDIDATA NÃO CATALOGADA — requer validação profissional
   Status: SUGERIDO
E5. [MENTE] Anotar um episódio por semana de comer depois do jantar sem fome (nova)
   Direcionamento: D2
   Classificação: Observação
   O que fazer: Quando acontecer, anotar o que estava fazendo, o que pensou ou sentiu antes e como ficou depois. Sem tentar mudar nada ainda.
   O que observar: Situações que se repetem antes do episódio.
   Prazo: Até o retorno
   Critério de sucesso: Trazer pelo menos um episódio descrito para aplicar o Gatilhos & Respostas na consulta.
   Baseado em: HOLOSCAN: comer depois do jantar sem fome; Catálogo PP-V1: REC-MET-02
   Catálogo: CANDIDATA NÃO CATALOGADA — requer validação profissional
   Status: SUGERIDO

CORPO:
Lanche planejado por volta das 16h, com plano B para dias de reunião e registro simples de fome e disposição. A composição do lanche fica com a Conduta. (E1, E2, E3, E4)

MENTE:
Ainda não aprofundado nesta etapa. Há relatos do HOLOSCAN para observar (comer depois do jantar sem fome, vontade de doce ou pão), que preparam o Gatilhos & Respostas. (E5)

ESPIRITO:
Ainda não aprofundado nesta etapa.

O_QUE_OBSERVAR:
- Fome e disposição entre 16h e 18h
- Dias em que a reunião impediu o lanche
- Episódios de comer depois do jantar sem fome
- Momentos de vontade de doce ou pão
- Gases ou inchaço e depois de quais refeições

PLANO_DE_ACOMPANHAMENTO:
- Registro de 0 a 10 de fome e disposição às 16h e às 18h, marcando se comeu o lanche
- Um episódio por semana de comer depois do jantar sem fome, descrito em poucas linhas
- Anotar quando a reunião atrapalhou o horário do lanche

ROTEIRO_DA_PROXIMA_CONSULTA:
- Ferramenta: Aplicar Gatilhos & Respostas (REC-MET-02) com um episódio trazido pela paciente; se houver tempo, Mapa de Crenças Alimentares (REC-FUN-03).
- Pergunta: Em quantos dias conseguiu fazer o lanche por volta das 16h?
- Pergunta: O que facilitou e o que dificultou (reuniões, preparo na noite anterior)?
- Pergunta: Como ficaram a fome e a disposição entre 16h e 18h nos dias com e sem lanche?
- Pergunta: O que aconteceu antes dos episódios de comer depois do jantar sem fome?
- Critério E1: MANTER: aplicou na maioria dos dias e percebeu melhora na fome ou na disposição.
- Critério E1: AJUSTAR: a ideia funciona, mas o horário ou o preparo não couberam (usar o plano B ou mudar o horário).
- Critério E1: SUBSTITUIR: não coube na rotina mesmo depois de ajustar as barreiras.
- Critério E1: CONCLUIR: o fim da tarde deixou de ser dificuldade e não precisa mais de ação ativa.
- Critério E1: ENCERRAR: decisão profissional de retirar a estratégia nesta etapa.

PROXIMA_ETAPA:
Retorno em cerca de 2 semanas: rever os registros, decidir sobre o lanche da tarde e aplicar o Gatilhos & Respostas.

RASCUNHO_PACIENTE (rascunho para revisão):
Nesta fase, nosso foco é organizar o fim da tarde. Até o nosso próximo encontro, a combinação é preparar o lanche na noite anterior e comer por volta das 16h. Nos dias de reunião, use o horário alternativo que combinamos. Anote, de 0 a 10, sua fome e sua disposição às 16h e às 18h. E, se acontecer de comer depois do jantar sem fome, escreva em poucas linhas o que estava acontecendo antes. Isso vai nos ajudar a dar o próximo passo.

ALERTAS_PROFISSIONAIS:
- [metodologico] Metabólico 2,4 e Fúngico 5,8 organizam respostas do HOLOSCAN; não são diagnóstico.
- [avaliacao_profissional] A língua esbranquiçada, os gases e o inchaço não foram interpretados; se persistirem ou incomodarem, requerem avaliação profissional.
- [conduta] A composição do lanche e qualquer mudança alimentar específica requerem decisão profissional na Conduta.
- [catalogo] Direcionamentos e estratégias ainda não têm catálogo homologado: validar antes de usar.
- [informacao_insuficiente] Sem evolução registrada: ainda não é possível avaliar a resposta à estratégia.
- [informacao_insuficiente] Mente e Espírito não foram aprofundados nesta etapa.

FONTES_UTILIZADAS:
- Resultado HOLOS da Paciente Teste T5 Fictícia (foco, direcionamento, estratégia, HOLOSCAN, Mapa da Rotina)
- 02-SISTEMAS-E-FERRAMENTAS: textos oficiais do Metabólico e do Fúngico (v7)
- 05-CATALOGO-FERRAMENTAS-PP-V1: REC-MET-02, REC-FUN-03, REC-MET-04
=== FIM_HOLOS_AI_RESULT ===
```

### B. JSON canônico

```json
{
  "schema_version": 1,
  "tipo": "primeira_consulta",
  "meta": {
    "agente": "HOLOS-AI-GPT 1.2",
    "kb_version": "HOLOS-KB 0.3 (sistemas HOLOS-V1 v7; ferramentas HOLOS-RECOMENDACOES-V1 / PP-V1; direcionamentos e estratégias sem catálogo homologado)",
    "identificador": "PACIENTE-TESTE-T5",
    "data_atendimento": "2026-10-13",
    "data_analise": "2026-10-13"
  },
  "entrada": {
    "documentos": [
      "pdf_resultado_holos"
    ],
    "base_principal": "pdf_resultado_holos",
    "observacao": "Só o PDF do Resultado HOLOS foi enviado (fallback temporário). Com o Pacote HOLOS AI, o Pacote prevalece."
  },
  "sintese_integrada": "Primeira consulta, ponto de partida sem evolução registrada. O HOLOSCAN indica o Sistema Metabólico (2,4) e o Fúngico (5,8) como as primeiras áreas para aprofundar. O Mapa da Rotina localizou a dificuldade principal entre 16h e 18h (fome forte e queda de disposição) e um espaço real de mudança: preparar o lanche na noite anterior. Foco, direcionamento e estratégia acordada já conversam entre si. Ainda falta aprofundar o comportamento alimentar fora do fim da tarde (fome logo depois de comer, comer depois do jantar sem fome, vontade de doce ou pão) e os relatos digestivos. Mente e Espírito ainda não foram aprofundados nesta etapa.",
  "o_que_apareceu": [
    {
      "texto": "Foco atual: organizar o fim da tarde.",
      "fonte": "Resultado HOLOS: foco"
    },
    {
      "texto": "Sistema Metabólico 2,4 e Sistema Fúngico 5,8 como primeira e segunda áreas para aprofundar.",
      "fonte": "HOLOSCAN (HOLOS-V1 v7)"
    },
    {
      "texto": "Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida.",
      "fonte": "HOLOSCAN: sinais do Metabólico"
    },
    {
      "texto": "Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.",
      "fonte": "HOLOSCAN: sinais do Fúngico"
    },
    {
      "texto": "Fome forte e queda de disposição entre 16h e 18h; reuniões à tarde; espaço para mudança: preparar o lanche na noite anterior.",
      "fonte": "Mapa da Rotina"
    },
    {
      "texto": "Estratégia acordada: lanche planejado antes da fome forte, por volta das 16h.",
      "fonte": "Resultado HOLOS: estratégia acordada"
    }
  ],
  "convergencias": [
    {
      "tipo": "convergencia",
      "texto": "Fome forte e queda de disposição no fim da tarde aparecem no Mapa da Rotina e conversam com os sinais do Metabólico (sono depois do almoço, fome pouco depois de comer).",
      "fontes": [
        "Mapa da Rotina",
        "HOLOSCAN: sinais do Metabólico"
      ]
    },
    {
      "tipo": "convergencia",
      "texto": "Vontade forte de doce ou pão e comer depois do jantar sem fome são comportamentos alimentares recorrentes que podem ser investigados em conjunto, sem relação de causa estabelecida.",
      "fontes": [
        "HOLOSCAN: sinais do Fúngico",
        "HOLOSCAN: sinais do Metabólico"
      ]
    },
    {
      "tipo": "convergencia",
      "texto": "O espaço de mudança relatado (preparar o lanche na noite anterior) e a estratégia acordada são coerentes entre si.",
      "fontes": [
        "Mapa da Rotina",
        "Resultado HOLOS: estratégia acordada"
      ]
    }
  ],
  "padroes_observados": [
    "As dificuldades se concentram em dois momentos do dia: depois do almoço / fim da tarde e depois do jantar.",
    "A rotina de trabalho tem reuniões à tarde, justamente no horário crítico."
  ],
  "pontos_para_aprofundar": [
    {
      "tipo": "questao",
      "texto": "O que acontece antes de comer depois do jantar sem fome (situação, pensamento, emoção)?",
      "so_profissional": false
    },
    {
      "tipo": "questao",
      "texto": "Em que momentos a vontade de doce ou pão aparece?",
      "so_profissional": false
    },
    {
      "tipo": "questao",
      "texto": "Os gases e o inchaço aparecem depois de quais refeições?",
      "so_profissional": false
    },
    {
      "tipo": "hipotese",
      "texto": "As reuniões da tarde podem dificultar comer por volta das 16h. Conferir no retorno.",
      "so_profissional": true
    },
    {
      "tipo": "hipotese",
      "texto": "A fome do fim da tarde e o comer depois do jantar podem fazer parte de um mesmo padrão do dia. Investigar com episódios concretos.",
      "so_profissional": true
    }
  ],
  "sistemas_prioritarios": [
    {
      "ordem": 1,
      "sistema": "Sistema Metabólico",
      "nota": "2,4",
      "posicao": "primeira área para aprofundar",
      "o_que_apareceu": "Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida; fome forte e queda de disposição entre 16h e 18h (Mapa da Rotina).",
      "o_que_observar": "Horários, intervalos entre refeições, fome, saciedade e energia ao longo do dia, com atenção a 16h–18h e ao período depois do jantar.",
      "como_cuidar": "Alimentação, horários, fome, energia e rotina merecem aprofundamento. O eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas."
    },
    {
      "ordem": 2,
      "sistema": "Sistema Fúngico",
      "nota": "5,8",
      "posicao": "segunda área para aprofundar",
      "o_que_apareceu": "Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.",
      "o_que_observar": "Em que situações a vontade de doce ou pão aparece; depois de quais refeições surgem gases e inchaço.",
      "como_cuidar": "Este eixo concentrou mais marcadores nesta aplicação e merece ser aprofundado no contexto da alimentação, rotina e sinais relatados. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença."
    }
  ],
  "ferramentas_ja_aplicadas": [
    {
      "ferramenta": "Mapa da Rotina",
      "situacao": "concluida",
      "o_que_esclareceu": "Localizou a dificuldade no fim da jornada (16h–18h), mostrou as reuniões da tarde e revelou um espaço viável de mudança: preparar o lanche na noite anterior."
    }
  ],
  "ferramentas_recomendadas": [
    {
      "ordem": 1,
      "papel": "principal",
      "regra_id": "REC-MET-02",
      "ferramenta": "Gatilhos & Respostas",
      "territorio": "Mente",
      "sistema": "Sistema Metabólico",
      "por_que": "Ajuda a aprofundar comportamentos alimentares recorrentes dentro das situações em que acontecem. REC-MET-01 (Mapa da Rotina) já foi concluída neste atendimento.",
      "como_aplicar": "Escolha episódios concretos e observe o que acontece antes, durante e depois do comportamento. Comece por um episódio de comer depois do jantar sem fome.",
      "o_que_procurar": "Situação, pensamento, emoção e consequência percebida antes de comer sem fome; repetição do padrão em dias diferentes.",
      "status": "SUGERIDO"
    },
    {
      "ordem": 2,
      "papel": "complementar",
      "regra_id": "REC-FUN-03",
      "ferramenta": "Mapa de Crenças Alimentares",
      "territorio": "Mente",
      "sistema": "Sistema Fúngico",
      "por_que": "Permite investigar ideias e regras sobre alimentação que podem estar influenciando escolhas. REC-FUN-01 (Mapa da Rotina) já concluída; REC-FUN-02 (Gatilhos & Respostas) já escolhida como principal.",
      "como_aplicar": "Identifique uma crença relevante, sua origem percebida, as situações em que aparece e seu impacto relatado.",
      "o_que_procurar": "Ideias ligadas à vontade de doce ou pão (recompensa, cansaço, merecimento) e onde elas aparecem no dia.",
      "status": "SUGERIDO"
    },
    {
      "ordem": 3,
      "papel": "complementar",
      "regra_id": "REC-MET-04",
      "ferramenta": "Linha do Momentum",
      "territorio": "Corpo",
      "sistema": "Sistema Metabólico",
      "por_que": "Ajuda a avaliar a capacidade atual de sustentar mudanças antes de aumentar a exigência. REC-MET-03 (Mapa de Crenças Alimentares) já escolhida como complementar.",
      "como_aplicar": "Avalie as seis dimensões do Momentum e registre o estado escolhido pela profissional.",
      "o_que_procurar": "Quanto espaço existe para acrescentar uma segunda estratégia depois do lanche da tarde.",
      "status": "SUGERIDO"
    }
  ],
  "direcionamentos": [
    {
      "id": "D1",
      "origem": "existente",
      "titulo": "Organizar o fim da tarde",
      "territorio": "Corpo",
      "sistema": "Sistema Metabólico",
      "por_que": "O fim da tarde concentra fome forte e queda de disposição, e já existe uma ação viável identificada.",
      "objetivo": "Chegar ao fim da jornada com fome mais administrável e mais disposição.",
      "baseado_em": [
        "Resultado HOLOS: foco e direcionamento registrados",
        "HOLOSCAN: Metabólico como primeira área (2,4)",
        "Mapa da Rotina: 16h–18h"
      ],
      "catalogo": "CANDIDATO NÃO CATALOGADO — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "D2",
      "origem": "nova",
      "titulo": "Compreender os momentos de comer sem fome e de vontade de doce ou pão",
      "territorio": "Mente",
      "sistema": "Sistema Fúngico",
      "por_que": "Comer depois do jantar sem fome e vontade forte de doce ou pão aparecem como comportamentos recorrentes ainda não aprofundados.",
      "objetivo": "Identificar em quais situações esses comportamentos aparecem, antes de propor mudanças neles.",
      "baseado_em": [
        "HOLOSCAN: sinais do Metabólico e do Fúngico",
        "Catálogo PP-V1: REC-MET-02 e REC-FUN-03"
      ],
      "catalogo": "CANDIDATO NÃO CATALOGADO — requer validação profissional",
      "status": "SUGERIDO"
    }
  ],
  "estrategias": [
    {
      "id": "E1",
      "origem": "acordada",
      "titulo": "Lanche planejado antes da fome forte",
      "territorio": "Corpo",
      "direcionamento_id": "D1",
      "classificacao": "comportamental_metodologica",
      "decisao_sugerida": "MANTER EM OBSERVAÇÃO — SUGERIDO",
      "motivo_decisao": "Estratégia criada neste encontro; ainda não há dado de aplicação para avaliar resposta.",
      "o_que_fazer": "Preparar o lanche na noite anterior e comer por volta das 16h.",
      "o_que_observar": "Intensidade da fome e disposição entre 16h e 18h.",
      "prazo": "Até o retorno (cerca de 2 semanas)",
      "criterio_sucesso": "Conseguir aplicar na maior parte dos dias de trabalho e perceber fome mais administrável às 18h.",
      "baseado_em": [
        "Resultado HOLOS: estratégia acordada",
        "Mapa da Rotina: espaço de mudança na noite anterior"
      ],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E2",
      "origem": "nova",
      "titulo": "Plano B para dias de reunião às 16h",
      "territorio": "Corpo",
      "direcionamento_id": "D1",
      "classificacao": "comportamental_metodologica",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Combinar um horário alternativo (antes ou logo depois da reunião) para os dias em que 16h estiver ocupado.",
      "o_que_observar": "Em quantos dias a reunião impediu o lanche e se o horário alternativo funcionou.",
      "prazo": "Até o retorno",
      "criterio_sucesso": "A reunião deixar de ser o motivo de pular o lanche.",
      "baseado_em": [
        "Mapa da Rotina: reuniões à tarde"
      ],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E3",
      "origem": "nova",
      "titulo": "Registro rápido de fome e disposição às 16h e às 18h",
      "territorio": "Corpo",
      "direcionamento_id": "D1",
      "classificacao": "observacao",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Anotar de 0 a 10 a fome e a disposição às 16h e às 18h e marcar se comeu o lanche.",
      "o_que_observar": "Diferença entre dias com e sem o lanche.",
      "prazo": "Até o retorno",
      "criterio_sucesso": "Ter registros suficientes para comparar no retorno.",
      "baseado_em": [
        "Resultado HOLOS: o que observar definido"
      ],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E4",
      "origem": "nova",
      "titulo": "Composição do lanche da tarde",
      "territorio": "Corpo",
      "direcionamento_id": "D1",
      "classificacao": "requer_decisao_profissional_na_conduta",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Definir na Conduta o que compõe o lanche. A HOLOS AI não sugere alimentos, quantidades nem substituições.",
      "o_que_observar": "Sem dado (depende da decisão profissional).",
      "prazo": "Na Conduta deste atendimento",
      "criterio_sucesso": "Composição registrada pela nutricionista na Conduta.",
      "baseado_em": [
        "Resultado HOLOS: estratégia acordada sem composição definida"
      ],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    },
    {
      "id": "E5",
      "origem": "nova",
      "titulo": "Anotar um episódio por semana de comer depois do jantar sem fome",
      "territorio": "Mente",
      "direcionamento_id": "D2",
      "classificacao": "observacao",
      "decisao_sugerida": null,
      "motivo_decisao": null,
      "o_que_fazer": "Quando acontecer, anotar o que estava fazendo, o que pensou ou sentiu antes e como ficou depois. Sem tentar mudar nada ainda.",
      "o_que_observar": "Situações que se repetem antes do episódio.",
      "prazo": "Até o retorno",
      "criterio_sucesso": "Trazer pelo menos um episódio descrito para aplicar o Gatilhos & Respostas na consulta.",
      "baseado_em": [
        "HOLOSCAN: comer depois do jantar sem fome",
        "Catálogo PP-V1: REC-MET-02"
      ],
      "catalogo": "CANDIDATA NÃO CATALOGADA — requer validação profissional",
      "status": "SUGERIDO"
    }
  ],
  "corpo": {
    "situacao": "com_material",
    "resumo": "Lanche planejado por volta das 16h, com plano B para dias de reunião e registro simples de fome e disposição. A composição do lanche fica com a Conduta.",
    "estrategias": [
      "E1",
      "E2",
      "E3",
      "E4"
    ]
  },
  "mente": {
    "situacao": "nao_aprofundado",
    "resumo": "Ainda não aprofundado nesta etapa. Há relatos do HOLOSCAN para observar (comer depois do jantar sem fome, vontade de doce ou pão), que preparam o Gatilhos & Respostas.",
    "estrategias": [
      "E5"
    ]
  },
  "espirito": {
    "situacao": "nao_aprofundado",
    "resumo": "Ainda não aprofundado nesta etapa.",
    "estrategias": []
  },
  "o_que_observar": [
    "Fome e disposição entre 16h e 18h",
    "Dias em que a reunião impediu o lanche",
    "Episódios de comer depois do jantar sem fome",
    "Momentos de vontade de doce ou pão",
    "Gases ou inchaço e depois de quais refeições"
  ],
  "plano_acompanhamento": [
    "Registro de 0 a 10 de fome e disposição às 16h e às 18h, marcando se comeu o lanche",
    "Um episódio por semana de comer depois do jantar sem fome, descrito em poucas linhas",
    "Anotar quando a reunião atrapalhou o horário do lanche"
  ],
  "roteiro_proxima_consulta": [
    {
      "tipo": "ferramenta",
      "texto": "Aplicar Gatilhos & Respostas (REC-MET-02) com um episódio trazido pela paciente; se houver tempo, Mapa de Crenças Alimentares (REC-FUN-03)."
    },
    {
      "tipo": "pergunta",
      "texto": "Em quantos dias conseguiu fazer o lanche por volta das 16h?"
    },
    {
      "tipo": "pergunta",
      "texto": "O que facilitou e o que dificultou (reuniões, preparo na noite anterior)?"
    },
    {
      "tipo": "pergunta",
      "texto": "Como ficaram a fome e a disposição entre 16h e 18h nos dias com e sem lanche?"
    },
    {
      "tipo": "pergunta",
      "texto": "O que aconteceu antes dos episódios de comer depois do jantar sem fome?"
    },
    {
      "tipo": "criterio_decisao",
      "estrategia_id": "E1",
      "texto": "MANTER: aplicou na maioria dos dias e percebeu melhora na fome ou na disposição."
    },
    {
      "tipo": "criterio_decisao",
      "estrategia_id": "E1",
      "texto": "AJUSTAR: a ideia funciona, mas o horário ou o preparo não couberam (usar o plano B ou mudar o horário)."
    },
    {
      "tipo": "criterio_decisao",
      "estrategia_id": "E1",
      "texto": "SUBSTITUIR: não coube na rotina mesmo depois de ajustar as barreiras."
    },
    {
      "tipo": "criterio_decisao",
      "estrategia_id": "E1",
      "texto": "CONCLUIR: o fim da tarde deixou de ser dificuldade e não precisa mais de ação ativa."
    },
    {
      "tipo": "criterio_decisao",
      "estrategia_id": "E1",
      "texto": "ENCERRAR: decisão profissional de retirar a estratégia nesta etapa."
    }
  ],
  "proxima_etapa": "Retorno em cerca de 2 semanas: rever os registros, decidir sobre o lanche da tarde e aplicar o Gatilhos & Respostas.",
  "rascunho_paciente": "Nesta fase, nosso foco é organizar o fim da tarde. Até o nosso próximo encontro, a combinação é preparar o lanche na noite anterior e comer por volta das 16h. Nos dias de reunião, use o horário alternativo que combinamos. Anote, de 0 a 10, sua fome e sua disposição às 16h e às 18h. E, se acontecer de comer depois do jantar sem fome, escreva em poucas linhas o que estava acontecendo antes. Isso vai nos ajudar a dar o próximo passo.",
  "alertas_profissionais": [
    {
      "tipo": "metodologico",
      "texto": "Metabólico 2,4 e Fúngico 5,8 organizam respostas do HOLOSCAN; não são diagnóstico."
    },
    {
      "tipo": "avaliacao_profissional",
      "texto": "A língua esbranquiçada, os gases e o inchaço não foram interpretados; se persistirem ou incomodarem, requerem avaliação profissional."
    },
    {
      "tipo": "conduta",
      "texto": "A composição do lanche e qualquer mudança alimentar específica requerem decisão profissional na Conduta."
    },
    {
      "tipo": "catalogo",
      "texto": "Direcionamentos e estratégias ainda não têm catálogo homologado: validar antes de usar."
    },
    {
      "tipo": "informacao_insuficiente",
      "texto": "Sem evolução registrada: ainda não é possível avaliar a resposta à estratégia."
    },
    {
      "tipo": "informacao_insuficiente",
      "texto": "Mente e Espírito não foram aprofundados nesta etapa."
    }
  ],
  "fontes_utilizadas": [
    "Resultado HOLOS da Paciente Teste T5 Fictícia (foco, direcionamento, estratégia, HOLOSCAN, Mapa da Rotina)",
    "02-SISTEMAS-E-FERRAMENTAS: textos oficiais do Metabólico e do Fúngico (v7)",
    "05-CATALOGO-FERRAMENTAS-PP-V1: REC-MET-02, REC-FUN-03, REC-MET-04"
  ]
}
```

Depois dos dois blocos vem a linha final: "Tudo acima é SUGERIDO. Confirme, edite ou descarte cada item no HoloHacking antes de usar no Resultado HOLOS."

O PDF de conferência só sai se a nutricionista pedir. Para este caso, a referência é `HOLOS-AI_PACIENTE-TESTE-T5_2026-10-13_conferencia.pdf` (11 páginas). Esse PDF não é o documento oficial.

## 3. Resposta RUIM (não fazer)

| Ruim | Por quê |
|---|---|
| Entregar só o texto, sem o bloco ```json``` (ou um JSON sem algumas chaves) | O HoloHacking não consegue importar. As duas partes são obrigatórias, com todas as chaves. |
| Na primeira consulta, "Decisão: MANTER" | Ainda não há resposta para avaliar. Use "MANTER EM OBSERVAÇÃO — SUGERIDO". |
| Inventar uma estratégia de Espírito só para preencher o território | Sem material: "Ainda não aprofundado nesta etapa." |
| Indicar 3 ferramentas forçando uma fora da regra, repetida ou já concluída no encontro | Até 3, só pela regra PP-V1; menos quando não houver mais. |
| Escolher ferramenta "porque o sinal X apareceu" | Sinais não escolhem ferramenta; não existe PP-V2. |
| Validar só a estratégia existente e parar | Não usa o método: faltam ferramentas, leitura, roteiro e plano. |
| Recusar a análise porque não conseguiu gerar o PDF, ou só descrever "como seria o PDF" | O PDF é opcional; texto + JSON sempre saem. |
| "A língua esbranquiçada indica candidíase" | Diagnóstico proibido; o eixo Fúngico não diagnostica. |
| "A fome da tarde é causada pelo almoço" | Causalidade proibida; use "podem ser investigados em conjunto". |
| "Lanche: iogurte com aveia e castanhas" | Prescrição; vira estratégia `requer_decisao_profissional_na_conduta` sem sugerir alimento. |
