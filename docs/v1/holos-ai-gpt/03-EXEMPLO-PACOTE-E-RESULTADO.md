# HOLOS AI — Exemplo de referência (caso FICTÍCIO) · HOLOS-AI-GPT 1.2

Padrão de qualidade esperado. Caso fictício ("Paciente Teste T5 Fictícia"), igual ao Resultado HOLOS de teste exportado pelo HoloHacking. Use como modelo de profundidade, tom, rastreabilidade e limites; nunca copie conteúdo deste caso para outro atendimento.

O que torna esta resposta boa:
- **Saída canônica completa:** bloco legível HOLOS_AI_RESULT + JSON válido (`schema_version: 1`) com o mesmo conteúdo. O JSON deste exemplo é o arquivo `exemplo-resultado.json`.
- **Propositiva só com o que os dados sustentam:**
  - 3 ferramentas pela regra PP-V1 (com ID), pulando a já concluída e sem duplicata;
  - estratégias para a paciente só de observação ou comportamentais/metodológicas; a composição do lanche (tarefa técnica da nutricionista) fica em ALERTAS_PROFISSIONAIS, tipo "conduta", e não vira estratégia;
  - Corpo com material; Mente e Espírito "Ainda não aprofundado nesta etapa.", sem estratégia: os relatos de comer depois do jantar sem fome e de vontade de doce ou pão vão para pontos para aprofundar, o que observar, plano de acompanhamento e preparação do Gatilhos & Respostas.
- **Hipótese → observação → confirmação → possível estratégia:** "as reuniões da tarde podem dificultar o lanche" fica como hipótese (só profissional), ponto de observação, item do plano e pergunta do roteiro. Não existe "Plano B para dias de reunião": só depois de confirmado no retorno a nutricionista decide se ajusta.
- **Primeira consulta:** a estratégia acordada fica "MANTER EM OBSERVAÇÃO — SUGERIDO", não "MANTER"; a estratégia nova tem `decisao_sugerida: null`.
- **Sem corte inventado:** o critério é "aplicar com frequência suficiente para permitir avaliação no retorno"; nenhum "maior parte dos dias".
- **Nota do HOLOSCAN:** nota maior = menos marcadores; nota menor = mais marcadores. O Fúngico aparece como "segunda área para aprofundar", sem "concentrou mais marcadores".
- **Rascunho para a paciente:** só o que já foi acordado (foco, lanche preparado na noite anterior, o que observar). Nenhuma sugestão nova aparece como combinada.
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
Primeira consulta, ponto de partida sem evolução registrada. O HOLOSCAN indica o Sistema Metabólico (2,4) e o Fúngico (5,8) como a primeira e a segunda áreas para aprofundar. O Mapa da Rotina localizou a dificuldade principal entre 16h e 18h (fome forte e queda de disposição) e um espaço real de mudança: preparar o lanche na noite anterior. Foco, direcionamento e estratégia acordada já conversam entre si. As reuniões da tarde ficam como ponto de observação, ainda sem dado de que atrapalhem o lanche. Ainda falta aprofundar o comportamento alimentar fora do fim da tarde (fome logo depois de comer, comer depois do jantar sem fome, vontade de doce ou pão) e os relatos digestivos. Mente e Espírito ainda não foram aprofundados nesta etapa.

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
- [HIPÓTESE · só profissional] As reuniões da tarde podem dificultar comer por volta das 16h. É um ponto de observação: confirmar no retorno antes de pensar em qualquer estratégia.
- [HIPÓTESE · só profissional] A fome do fim da tarde e o comer depois do jantar podem fazer parte de um mesmo padrão do dia. Investigar com episódios concretos.

SISTEMAS_PRIORITARIOS:
1. Sistema Metabólico (2,4 · primeira área para aprofundar)
   O que apareceu: Muito sono logo depois do almoço; fome novamente pouco tempo depois de comer; comer depois do jantar mesmo sem fome percebida; fome forte e queda de disposição entre 16h e 18h (Mapa da Rotina).
   O que vale observar: Horários, intervalos entre refeições, fome, saciedade e energia ao longo do dia, com atenção a 16h–18h e ao período depois do jantar.
   Como cuidar deste eixo: Alimentação, horários, fome, energia e rotina merecem aprofundamento. O eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas.
2. Sistema Fúngico (5,8 · segunda área para aprofundar)
   O que apareceu: Vontade forte de doce ou pão quase todos os dias; barriga inchada ou gases depois das refeições; relato de camada esbranquiçada na língua.
   O que vale observar: Em que situações a vontade de doce ou pão aparece; depois de quais refeições surgem gases e inchaço.
   Como cuidar deste eixo: Este eixo aparece como a segunda área para aprofundar nesta aplicação e merece ser observado no contexto da alimentação, rotina e sinais relatados. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença.

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

DIRECIONAMENTOS (SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL):
D1. Organizar o fim da tarde (existente)
   Território / sistema: Corpo / Sistema Metabólico
   Por que: O fim da tarde concentra fome forte e queda de disposição, e já existe uma ação viável identificada.
   Objetivo desta etapa: Chegar ao fim da jornada com fome mais administrável e mais disposição.
   Baseado em: Resultado HOLOS: foco e direcionamento registrados; HOLOSCAN: Metabólico como primeira área (2,4); Mapa da Rotina: 16h–18h
D2. Compreender os momentos de comer sem fome e de vontade de doce ou pão (nova)
   Território / sistema: sem território / sem vínculo
   Por que: Comer depois do jantar sem fome (sinal do Metabólico) e vontade forte de doce ou pão (sinal do Fúngico) aparecem como comportamentos recorrentes ainda não aprofundados.
   Objetivo desta etapa: Identificar em quais situações esses comportamentos aparecem, antes de propor qualquer mudança neles.
   Baseado em: HOLOSCAN: sinais do Metabólico e do Fúngico; Catálogo PP-V1: REC-MET-02 e REC-FUN-03

ESTRATEGIAS (SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL):
E1. [CORPO] Lanche planejado antes da fome forte (acordada)
   Direcionamento: D1
   Classificação: Comportamental/metodológica
   Decisão sugerida: MANTER EM OBSERVAÇÃO — SUGERIDO — Estratégia criada neste encontro; ainda não há dado de aplicação para avaliar resposta.
   O que fazer: Preparar o lanche na noite anterior e comer por volta das 16h.
   O que observar: Intensidade da fome e disposição entre 16h e 18h.
   Prazo: Até o retorno (cerca de 2 semanas)
   Critério de sucesso: Aplicar com frequência suficiente para permitir avaliação no retorno e perceber como ficam a fome e a disposição às 18h.
   Baseado em: Resultado HOLOS: estratégia acordada; Mapa da Rotina: espaço de mudança na noite anterior
E2. [CORPO] Registro rápido de fome e disposição às 16h e às 18h (nova)
   Direcionamento: D1
   Classificação: Observação
   O que fazer: Anotar de 0 a 10 a fome e a disposição às 16h e às 18h e marcar se comeu o lanche.
   O que observar: Diferença entre dias com e sem o lanche.
   Prazo: Até o retorno
   Critério de sucesso: Ter registros suficientes para comparar, no retorno, os dias com e sem o lanche.
   Baseado em: Resultado HOLOS: o que observar acordado (fome e disposição entre 16h e 18h)

CORPO:
Lanche planejado por volta das 16h, preparado na noite anterior, e observação de fome e disposição entre 16h e 18h. (E1, E2)

MENTE:
Ainda não aprofundado nesta etapa.

ESPIRITO:
Ainda não aprofundado nesta etapa.

O_QUE_OBSERVAR:
- Fome e disposição entre 16h e 18h, nos dias com e sem o lanche
- Se as reuniões da tarde atrapalham o horário do lanche
- Episódios de comer depois do jantar sem fome
- Momentos de vontade de doce ou pão
- Gases ou inchaço e depois de quais refeições

PLANO_DE_ACOMPANHAMENTO:
- Conferir no retorno como foram o preparo na noite anterior e o lanche por volta das 16h
- Comparar fome e disposição entre 16h e 18h nos dias com e sem o lanche
- Perguntar se as reuniões da tarde atrapalharam o lanche antes de propor qualquer ajuste
- Levar os episódios de comer depois do jantar sem fome e de vontade de doce ou pão para o Gatilhos & Respostas

ROTEIRO_DA_PROXIMA_CONSULTA:
- Ferramenta: Aplicar Gatilhos & Respostas (REC-MET-02) com um episódio relatado pela paciente; se houver tempo, Mapa de Crenças Alimentares (REC-FUN-03).
- Pergunta: Com que frequência conseguiu fazer o lanche por volta das 16h?
- Pergunta: O que facilitou e o que dificultou (preparo na noite anterior, horário)?
- Pergunta: As reuniões da tarde atrapalharam o lanche? Em que dias e de que forma?
- Pergunta: Como ficaram a fome e a disposição entre 16h e 18h nos dias com e sem lanche?
- Pergunta: O que aconteceu antes dos episódios de comer depois do jantar sem fome?
- Critério E1: MANTER: aplicou com frequência suficiente para avaliar e percebeu fome mais administrável ou mais disposição no fim da tarde.
- Critério E1: AJUSTAR: a ideia funciona, mas o horário ou o preparo não couberam na rotina. Se as reuniões da tarde se confirmarem como barreira, a nutricionista decide o ajuste.
- Critério E1: SUBSTITUIR: não coube na rotina mesmo depois de ajustar as barreiras.
- Critério E1: CONCLUIR: o fim da tarde deixou de ser dificuldade e não precisa mais de ação ativa.
- Critério E1: ENCERRAR: decisão profissional de retirar a estratégia nesta etapa.

PROXIMA_ETAPA:
Retorno em cerca de 2 semanas: rever como foi o lanche da tarde, confirmar se as reuniões atrapalham, decidir sobre a estratégia e aplicar o Gatilhos & Respostas.

RASCUNHO_PACIENTE (rascunho para revisão):
Nesta fase, nosso foco é organizar o fim da tarde. Até o nosso próximo encontro, a combinação é preparar o lanche na noite anterior e comer por volta das 16h. Observe como ficam sua fome e sua disposição entre 16h e 18h. No próximo encontro, conversamos sobre como foi.

ALERTAS_PROFISSIONAIS:
- [metodologico] No HOLOSCAN, nota maior = menos marcadores; nota menor = mais marcadores. Metabólico 2,4 e Fúngico 5,8 indicam onde aprofundar primeiro; a nota não é diagnóstico nem medida de saúde, equilíbrio, normalidade, gravidade ou risco.
- [avaliacao_profissional] A língua esbranquiçada, os gases e o inchaço não foram interpretados; se persistirem ou incomodarem, requerem avaliação profissional.
- [conduta] A composição do lanche da tarde (alimentos, quantidades, substituições) requer decisão profissional na Conduta. Não foi sugerida como estratégia para a paciente.
- [catalogo] Direcionamentos e estratégias são sugestões da HOLOS AI sem catálogo homologado: requerem revisão profissional antes de usar.
- [informacao_insuficiente] Sem evolução registrada: ainda não é possível avaliar a resposta à estratégia acordada.
- [informacao_insuficiente] As reuniões da tarde aparecem no Mapa da Rotina, mas não há dado de que impeçam o lanche: ficam como ponto de observação, sem estratégia.
- [informacao_insuficiente] Mente e Espírito não foram aprofundados nesta etapa. Os relatos de comer depois do jantar sem fome e de vontade de doce ou pão ficam para observação e para o Gatilhos & Respostas.

FONTES_UTILIZADAS:
- Resultado HOLOS da Paciente Teste T5 Fictícia (foco, direcionamento, estratégia acordada, o que observar, HOLOSCAN, Mapa da Rotina)
- 02-SISTEMAS-E-FERRAMENTAS: textos oficiais do Metabólico e do Fúngico (v7) e frase da HOLOS AI para a segunda área
- 05-CATALOGO-FERRAMENTAS-PP-V1: REC-MET-02, REC-FUN-03, REC-MET-04
=== FIM_HOLOS_AI_RESULT ===
```

### B. JSON canônico

Logo depois do bloco legível vem um único bloco ```json``` com o conteúdo **inteiro e idêntico** ao do arquivo `exemplo-resultado.json` (mesmas chaves, mesmos valores). Não está repetido aqui para não duplicar o conhecimento: abra `exemplo-resultado.json` para ver o JSON completo deste caso.

Pontos que o JSON deste caso mostra:
- `"tipo": "primeira_consulta"`, `meta`, `entrada` (`{"documentos": ["pdf_resultado_holos"], "base_principal": "pdf_resultado_holos"}`), `ferramentas_ja_aplicadas` e `plano_acompanhamento` presentes (são obrigatórios; vazios quando não houver material).
- `estrategias[0]` (E1, `origem: "acordada"`) com `"decisao_sugerida": "MANTER EM OBSERVAÇÃO — SUGERIDO"`; E2 (`origem: "nova"`, `classificacao: "observacao"`) com `"decisao_sugerida": null`.
- `"catalogo": "not_catalogued"` em direcionamentos e estratégias (status técnico; na tela aparece só "SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL").
- `"mente"` e `"espirito"`: `{"situacao": "nao_aprofundado", "resumo": "Ainda não aprofundado nesta etapa.", "estrategias": []}`.
- `ferramentas_recomendadas` com 3 itens (REC-MET-02 principal, REC-FUN-03 e REC-MET-04), sem o Mapa da Rotina concluído e sem duplicata.
- hipóteses com `"so_profissional": true`; a das reuniões não gera estratégia.
- `alertas_profissionais` com o tipo `"conduta"` para a composição do lanche.

Depois dos dois blocos vem a linha final: "Tudo acima é SUGERIDO. Confirme, edite ou descarte cada item no HoloHacking antes de usar no Resultado HOLOS."

O PDF de conferência só sai se a nutricionista pedir. Para este caso, a referência é `HOLOS-AI_PACIENTE-TESTE-T5_2026-10-13_conferencia.pdf` (10 páginas). Esse PDF não é o documento oficial.

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
| "Lanche: iogurte com aveia e castanhas" ou uma estratégia "Composição do lanche da tarde" | Prescrição / tarefa da Conduta. Vai para ALERTAS_PROFISSIONAIS (tipo "conduta"), sem sugerir alimento, e nunca como estratégia da paciente. |
| "Plano B para dias de reunião" a partir de "as reuniões podem dificultar o lanche" | Hipótese não vira estratégia direto: primeiro observação e confirmação no retorno. |
| Estratégia de Mente com Mente "nao_aprofundado" | Território não aprofundado não tem estratégia ativa; os relatos vão para pontos para aprofundar e o que observar. |
| "Aplicar na maior parte dos dias" | Corte inventado. Use "aplicar com frequência suficiente para permitir avaliação no retorno", salvo número vindo da Conduta, de regra oficial ou de decisão profissional registrada. |
| Rascunho "Nos dias de reunião, use o horário alternativo que combinamos" | Apresenta sugestão nova como combinada. O rascunho só traz o que foi acordado. |
| "Nota maior = mais equilíbrio" / "Este eixo concentrou mais marcadores" para o 2º sistema | Nota maior = menos marcadores; a nota não é saúde, equilíbrio, normalidade, gravidade nem risco. Para o 2º sistema: "aparece como a segunda área para aprofundar". |
