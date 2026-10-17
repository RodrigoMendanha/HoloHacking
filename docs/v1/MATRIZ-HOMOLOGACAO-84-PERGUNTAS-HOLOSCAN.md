# MATRIZ DE HOMOLOGAÇÃO — 84 PERGUNTAS DO HOLOSCAN (FECHADA no HOLOS-V1 v6)

Preparação da homologação metodológica, 13/10/2026. Esta matriz é para **Rodrigo e Daniel** decidirem as 84 perguntas antes de qualquer nova versão do HOLOSCAN.

> **MATRIZ FECHADA em 13/10/2026: as 84 perguntas têm decisão; 0 EM ABERTO.** HOLOS-V1 v4: 15 decisões (SNT-210 e SNT-309 REMOVER; 13 EMO MOVER para o MEE). HOLOS-V1 v5 (Lote 2B): 8 decisões (ESP-101, 103, 203, 404, 405 MOVER para o MEE; ESP-303 MANTER no Metabólico; ESP-501 e ESP-502 CONTEXTUAL) e EMO-502/504 CONTEXTUAL MANTIDO. **HOLOS-V1 v6 (fechamento das 61): SNT-110 REMOVER; SNT-404 MOVER para o Fúngico; SNT-501 e SNT-507 MOVER para o Metabólico; SNT-104, 105, 109, 206, 305, 306, 308, 408, 409, 410 CONTEXTUAL; 47 MANTER com justificativa** (`MetodologiaRevisaoV6` em `metodologia-revisao-v3.js`; detalhes em `docs/v1/ALTERACOES-PACOTE-HOLOSCAN-V6.md`; definições oficiais em `docs/v1/DEFINICOES-OFICIAIS-SISTEMAS-HOLOSCAN-V6.md`). As colunas "sistema atual", "peso" e "contextual" descrevem o **v2** (base da decisão); o resultado final está na seção 0. O v2 e todas as versões anteriores não mudam.

**Fontes**
- `docs/v1/AUDITORIA-ASSOCIACOES-HOLOSCAN-V2.md`: classificação A/B/C/D, justificativas e fontes, linha a linha.
- Pacote oficial HOLOS-V1 v2: gerado por `scripts/pacote-candidato-v1.mjs` a partir de `docs/v1/metodologia/inventario-metodologico-v1.json` + `metodologia-decisoes-v1.js`, com as mesmas funções da auditoria. Hash de servidor em produção: `7af1dae6…`.
- `docs/v1/DECISOES-V1.md`, `docs/v1/RESULTADO-FINAL-DECISOES-APROVADAS.md`, `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`.
- `metodologia-revisao-v3.js`: as decisões de 13/10 que formam o HOLOS-V1 v4. O rascunho de 12/10 ficou arquivado em `docs/v1/metodologia/historico/` e não é fonte da v4 (foi publicado por engano como v3 em 13/10 e é retirado pela v4); é citado só quando já tratava o item.

A matriz foi gerada por script a partir desses dados; nenhuma linha foi digitada. O CSV com os mesmos campos é `docs/v1/MATRIZ-HOMOLOGACAO-84-PERGUNTAS-HOLOSCAN.csv`.

## 0. Resultado final (HOLOS-V1 v6)

| | total |
|---|---|
| **TOTAL coletadas** | **81** (das 84 do inventário) |
| **PONTUÁVEIS** | **69** |
| **CONTEXTUAIS** (só contexto, sem pontuar) | **12** |
| **REMOVIDAS** | **3** (SNT-210 e SNT-309 na v4; SNT-110 na v6) |

Tríade (pontuáveis por eixo): Corpo 36 · Mente 19 · Espírito 14. Pesos: todos 1 (nenhum peso novo).

| sistema | itens | IDs |
|---|---|---|
| Fúngico | 8 | SNT-101, SNT-102, SNT-103, SNT-106, SNT-107, SNT-108, SNT-111, SNT-404 |
| Ácido Inflamatório | 8 | SNT-201, SNT-202, SNT-203, SNT-204, SNT-205, SNT-207, SNT-208, SNT-209 |
| Metabólico | 7 | SNT-301, SNT-303, SNT-304, SNT-307, SNT-501, SNT-507, ESP-303 |
| Detox e Linfático | 6 | SNT-401, SNT-402, SNT-403, SNT-405, SNT-406, SNT-407 |
| Mental Emocional Espiritual | 40 | SNT-502, SNT-503, SNT-504, SNT-505, SNT-506, SNT-508, SNT-509, SNT-510, EMO-101, EMO-102, EMO-103, EMO-201, EMO-202, EMO-203, EMO-204, EMO-301, EMO-302, EMO-303, EMO-401, EMO-402, EMO-403, EMO-501, EMO-502, EMO-503, EMO-504, EMO-505, EMO-507, ESP-101, ESP-102, ESP-103, ESP-201, ESP-202, ESP-203, ESP-301, ESP-302, ESP-401, ESP-402, ESP-403, ESP-404, ESP-405 |

| contextuais (sem pontuar) | contexto de |
|---|---|
| SNT-104 — Você tem candidíase ou sapinho com frequência? | Fúngico |
| SNT-105 — Você tem micose de pele ou unha que volta sempre? | Fúngico |
| SNT-109 — Você precisou tomar antibiótico ao longo da vida? | Fúngico |
| SNT-206 — Sua pele tem crises de acne inflamada, eczema ou psoríase? | Ácido Inflamatório |
| SNT-305 — Sua gordura se concentra na barriga? | Metabólico |
| SNT-306 — A pele do seu pescoço ou axila está mais escura e aveludada? | Metabólico |
| SNT-308 — Você tem dificuldade de perder peso mesmo comendo pouco? | Metabólico |
| SNT-408 — Sua pele está opaca ou com olheiras marcadas? | Detox e Linfático |
| SNT-409 — Seu suor tem odor forte? | Detox e Linfático |
| SNT-410 — Você tem celulite acentuada? | Detox e Linfático |
| ESP-501 — Você passa algum tempo em contato com a natureza? | Fúngico |
| ESP-502 — Você faz suas refeições sozinho e com pressa? | Detox e Linfático |

## 1. Como usar

1. Comecem pelo **Grupo 1** (conflito direto) e pelo **Grupo 2** (revisão prioritária).
2. Para cada pergunta, marquem uma opção e preencham a linha "decisão registrada": opção, sistema de destino (se MOVER), responsável e data.
3. Os Grupos 3 e 4 podem ser homologados em bloco ("MANTER") se for essa a decisão; a matriz deixa isso explícito, sem presumir.
4. Nenhuma decisão vale para o v2. **Toda decisão vira um pacote novo, com versão e hash novos.**

## 2. O que cada decisão muda

| DECISÃO | O QUE MUDA |
|---|---|
| **MANTER** | A pergunta e a pontuação permanecem como estão (sistema, peso, orientação). Se a pergunta tinha justificativa não documentada, a homologação passa a ser a justificativa registrada. |
| **MOVER** | Muda o sistema que a pergunta pontua. **Exige nova versão do pacote**: hash novo, aprovação/publicação nova, contagens e limites de cobertura recalculados nos dois sistemas e regra `example` regenerada. A seleção do PP-V1 pode mudar porque depende da ordem dos sistemas; o catálogo não muda. |
| **CONTEXTUAL** | A pergunta pode continuar no questionário para leitura (`secondary_contextual`, sem peso), mas **não entra na nota**. Sai do denominador do sistema e deixa de aparecer como sinal dominante. Exige nova versão do pacote. |
| **REMOVER** | A pergunta sai das **novas aplicações**. O sistema e a Tríade perdem um item. O **histórico permanece**: aplicações, respostas, notas, snapshots e emissões já salvos no v2 não mudam. Exige nova versão do pacote. |

Efeitos comuns a MOVER, CONTEXTUAL e REMOVER (fonte: `AUDITORIA-ASSOCIACOES-HOLOSCAN-V2.md` §7.6):
- **Comparabilidade:** "mesma `methodology_package_version` e mesmo conjunto de IDs pontuados" (Decisão 12). Entre versões, a Evolução mostra lado a lado, sem delta.
- **Cobertura de 80%:** o mínimo do sistema é recalculado.
- **Testes e fixtures** que fixam contagens por sistema precisam ser atualizados na nova versão.

## 3. Regra de versão

- O **HOLOS-V1 v2 não é alterado.** Qualquer decisão desta matriz entra num **novo pacote versionado** (como foi feito com a v4: um objeto de revisão separado, sem editar as decisões V1).
- **Resultados históricos nunca são recalculados silenciosamente.** Aplicações, respostas, notas, Resultados HOLOS, Próximos Passos e emissões (RF-1/RF-2) já salvos continuam com o pacote com que foram calculados ("HOLOSCANs, Resultados HOLOS e emissões já salvos continuam no v2, congelados" — `docs/v1/REVISAO-PERGUNTAS-V3.md`).
- Qualquer mudança no pacote "**invalida** as aprovações vigentes daquela versão" (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`, seção 10). Por isso a nova versão é aprovada e publicada por inteiro.
- **O HOLOS-V1 v4 (82 perguntas) contém só as 15 decisões de 13/10.** A v3 de produção é o rascunho de 12/10, publicado por engano em 13/10 (0 aplicações) e retirado pela v4. O rascunho não foi importado na v4. As decisões que ainda forem tomadas nesta matriz entram numa versão seguinte (v5), a partir da versão ativa.

## 3A. Registro de decisões — DECISÕES APLICADAS (HOLOS-V1 v4, v5 e v6)

| lote | pergunta | decisão | justificativa oficial | status |
|---|---|---|---|---|
| 1 | SNT-210 — Seus exames costumam mostrar PCR ou VHS acima do normal? | **REMOVER** | Exames e documentos não participam do Resultado HOLOS. PCR/VHS não deve alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos. | **DECISÃO APLICADA** (v4) |
| 1 | SNT-309 — Seus exames costumam mostrar triglicerídeos altos ou HDL baixo? | **REMOVER** | Exames e documentos não participam do Resultado HOLOS. Triglicerídeos/HDL não devem alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-101 — Você adia começar coisas mesmo sabendo que precisa fazer? | **MOVER → Mental Emocional Espiritual (antes: Fúngico)** | Procrastinação, prontidão e autorregulação comportamental. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-102 — Você sente que sua vida está desorganizada e não consegue pôr ordem? | **MOVER → Mental Emocional Espiritual (antes: Fúngico)** | Organização pessoal e comportamento. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-103 — Você sente um peso para sair do lugar mesmo querendo mudar? | **MOVER → Mental Emocional Espiritual (antes: Fúngico)** | Prontidão, dificuldade percebida para iniciar mudança e autorregulação. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-201 — Você se irrita com facilidade por coisas pequenas? | **MOVER → Mental Emocional Espiritual (antes: Ácido Inflamatório)** | Irritabilidade e regulação emocional. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-202 — Sua raiva sobe rápido e demora a passar? | **MOVER → Mental Emocional Espiritual (antes: Ácido Inflamatório)** | Intensidade e duração percebida da raiva. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-203 — Você costuma aceitar o que não quer para evitar conflito? | **MOVER → Mental Emocional Espiritual (antes: Ácido Inflamatório)** | Limites, comportamento interpessoal e evitação de conflito. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-204 — Você engole o que gostaria de dizer para não criar problema? | **MOVER → Mental Emocional Espiritual (antes: Ácido Inflamatório)** | Expressão emocional e comportamento interpessoal. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-301 — Você sente um vazio que a comida parece tentar preencher? | **MOVER → Mental Emocional Espiritual (antes: Metabólico)** | Relação entre estado emocional e alimentação. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-302 — Você passa os dias no piloto automático sem perceber o que está fazendo? | **MOVER → Mental Emocional Espiritual (antes: Metabólico)** | Consciência, atenção ao comportamento e funcionamento em piloto automático. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-303 — Você usa comida como recompensa depois de um dia difícil? | **MOVER → Mental Emocional Espiritual (antes: Metabólico)** | Uso da comida como recompensa e comportamento alimentar associado ao estado emocional. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-401 — Você se pega remoendo uma mágoa antiga? | **MOVER → Mental Emocional Espiritual (antes: Detox e Linfático)** | Ruminação emocional. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-402 — Você costuma guardar o que sente em vez de falar? | **MOVER → Mental Emocional Espiritual (antes: Detox e Linfático)** | Expressão e regulação emocional. | **DECISÃO APLICADA** (v4) |
| 2 | EMO-403 — Você tem dificuldade de aceitar ajuda ou cuidado das pessoas? | **MOVER → Mental Emocional Espiritual (antes: Detox e Linfático)** | Apoio, vínculo e capacidade de receber cuidado. | **DECISÃO APLICADA** (v4) |
| 2B | ESP-101 — Você sente que sua vida tem uma direção clara? | **MOVER → Mental Emocional Espiritual (antes: Metabólico)** | Direção, propósito e sentido pertencem diretamente ao eixo Mental-Emocional-Espiritual. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-103 — Sua rotina de hoje te afasta do que você quer para a sua vida? | **MOVER → Mental Emocional Espiritual (antes: Metabólico)** | Investiga alinhamento entre rotina, escolhas e direção de vida. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-203 — Você abre mão do que é inegociável para você só para agradar alguém? | **MOVER → Mental Emocional Espiritual (antes: Ácido Inflamatório)** | Investiga valores, limites e comportamento interpessoal. Não deve pontuar um sistema físico por associação simbólica. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-404 — Você acredita que para ter saúde precisa sofrer ou se privar? | **MOVER → Mental Emocional Espiritual (antes: Ácido Inflamatório)** | Investiga crença sobre saúde, sofrimento e privação. Não deve pontuar um sistema físico. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-405 — Você carrega o peso de não ter conseguido perdoar alguém? | **MOVER → Mental Emocional Espiritual (antes: Detox e Linfático)** | Investiga conteúdo emocional/simbólico relacionado a perdão. Não deve sugerir relação automática entre mágoa, detoxificação ou fluxo linfático. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-303 — Você começa a comer sem fazer nenhuma pausa antes? | **MANTER (Metabólico)** | Apesar de estar no bloco espiritual, o conteúdo da pergunta investiga diretamente comportamento alimentar e contexto da refeição. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-501 — Você passa algum tempo em contato com a natureza? | **CONTEXTUAL (sem pontuação) (antes: Fúngico)** | É informação holística potencialmente útil, mas não há justificativa metodológica suficiente para alterar matematicamente a nota do Sistema Fúngico ou de outro sistema. | **DECISÃO APLICADA** (v5) |
| 2B | ESP-502 — Você faz suas refeições sozinho e com pressa? | **CONTEXTUAL (sem pontuação) (antes: Detox e Linfático)** | Investiga contexto da refeição, ritmo, rotina e pertencimento, mas não há justificativa suficiente para alterar diretamente a nota do Sistema Detox + Linfático ou outro sistema físico. | **DECISÃO APLICADA** (v5) |
| 2B | EMO-502 — Quando você sai da linha um dia você sente que perdeu tudo e abandona? | **CONTEXTUAL MANTIDO (Metabólico)** | Associação contextual com o Sistema Metabólico mantida, sem pontuação metabólica. | **CONTEXTUAL MANTIDO** (v5) |
| 2B | EMO-504 — Você sente culpa ou vergonha depois de comer? | **CONTEXTUAL MANTIDO (Metabólico)** | Associação contextual com o Sistema Metabólico mantida, sem pontuação metabólica. | **CONTEXTUAL MANTIDO** (v5) |
| 61 | SNT-110 — Você passa mal com pouca bebida alcoólica? | **REMOVER** | Redundante com SNT-406 (reação ao álcool já pontua no Detox + Linfático) e, dentro do Fúngico, sugeriria causa microbiológica que o HOLOSCAN não demonstra. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-404 — Comida gordurosa te faz passar mal ou pesa muito? | **MOVER → Fúngico (antes: Detox e Linfático)** | Desconforto digestivo depois de comida gordurosa é relato digestivo/alimentar (domínio do Fúngico); no Detox sugeriria função hepática, que o HOLOSCAN não mede. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-501 — Você acorda cansado mesmo dormindo as horas necessárias? | **MOVER → Metabólico (antes: Mental Emocional Espiritual)** | Acordar cansado mesmo dormindo o suficiente é relato de energia (domínio do Metabólico); sono/alerta no MEE fica com as perguntas de pensamento acelerado e despertar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-507 — Você consegue perceber quando está com fome e quando já está satisfeito? | **MOVER → Metabólico (antes: Mental Emocional Espiritual)** | Perceber fome e saciedade investiga diretamente fome/saciedade, domínio do Metabólico. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-104 — Você tem candidíase ou sapinho com frequência? | **CONTEXTUAL (sem pontuação) (antes: Fúngico)** | Condição nomeada (candidíase/sapinho): dentro do Fúngico a pontuação pareceria confirmar a condição e sua causa. Fica como relato informado pela paciente, sem pontuar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-105 — Você tem micose de pele ou unha que volta sempre? | **CONTEXTUAL (sem pontuação) (antes: Fúngico)** | Condição nomeada (micose): dentro do Fúngico a pontuação pareceria confirmar a condição e sua causa. Fica como relato, sem pontuar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-109 — Você precisou tomar antibiótico ao longo da vida? | **CONTEXTUAL (sem pontuação) (antes: Fúngico)** | Histórico de uso de antibiótico é informação de contexto (exposição ao longo da vida), não sinal atual; pontuar sugeriria mecanismo microbiológico. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-206 — Sua pele tem crises de acne inflamada, eczema ou psoríase? | **CONTEXTUAL (sem pontuação) (antes: Ácido Inflamatório)** | Condições nomeadas (acne inflamada, eczema, psoríase): pontuar no Ácido-Inflamatório pareceria confirmar doença inflamatória. Fica como relato, sem pontuar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-305 — Sua gordura se concentra na barriga? | **CONTEXTUAL (sem pontuação) (antes: Metabólico)** | Distribuição de gordura é observação corporal que insinuaria diagnóstico metabólico; não é relato de energia, fome, saciedade ou comportamento alimentar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-306 — A pele do seu pescoço ou axila está mais escura e aveludada? | **CONTEXTUAL (sem pontuação) (antes: Metabólico)** | Pele escurecida e aveludada é sinal clínico que pede avaliação específica; pontuar insinuaria resistência à insulina. Fica como contexto para a profissional. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-308 — Você tem dificuldade de perder peso mesmo comendo pouco? | **CONTEXTUAL (sem pontuação) (antes: Metabólico)** | Dificuldade percebida de perder peso não é relato direto de energia, fome, saciedade ou comportamento alimentar e insinuaria diagnóstico; fica como contexto. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-408 — Sua pele está opaca ou com olheiras marcadas? | **CONTEXTUAL (sem pontuação) (antes: Detox e Linfático)** | Pele opaca e olheiras têm muitas explicações (sono, rotina); no Detox sugeririam toxinas. Fica como contexto. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-409 — Seu suor tem odor forte? | **CONTEXTUAL (sem pontuação) (antes: Detox e Linfático)** | Odor do suor no Detox sugeriria eliminação de toxinas, que o HOLOSCAN não mede. Fica como contexto. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-410 — Você tem celulite acentuada? | **CONTEXTUAL (sem pontuação) (antes: Detox e Linfático)** | Celulite no Detox sugeriria alteração linfática, que o HOLOSCAN não mede. Fica como contexto. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-101 — Você sente vontade forte de doce ou pão quase todo dia? | **MANTER (Fúngico)** | vontade frequente de doce/pão é relato alimentar (hábito e preferência); contextual no Metabólico mantido, sem pontuar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-102 — Sua barriga incha ou dá gases depois das refeições? | **MANTER (Fúngico)** | inchaço e gases depois das refeições são relato digestivo. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-103 — Sua língua costuma ter uma camada esbranquiçada? | **MANTER (Fúngico)** | camada esbranquiçada na língua é relato de mucosa; não confirma fungo. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-106 — Você sente coceira na região íntima ou anal? | **MANTER (Fúngico)** | coceira íntima ou anal é relato de pele/mucosa; não confirma condição. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-107 — Sua cabeça fica pesada ou confusa depois de comer massa ou doce? | **MANTER (Fúngico)** | cabeça pesada depois de massa ou doce é relato alimentar/vitalidade ligado à refeição. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-108 — Você tem caspa ou coceira no couro cabeludo com frequência? | **MANTER (Fúngico)** | caspa ou coceira no couro cabeludo é relato de pele. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-111 — Você vive com nariz entupido ou sinusite? | **MANTER (Fúngico)** | nariz entupido é relato de mucosa; a palavra sinusite é o termo comum da paciente e não é confirmada. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-201 — Você sente dor nas articulações mesmo sem ter feito esforço? | **MANTER (Ácido-Inflamatório)** | dor articular sem esforço é relato de dor. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-202 — Você acorda com o corpo travado que leva um tempo para soltar? | **MANTER (Ácido-Inflamatório)** | rigidez ao acordar é relato de rigidez. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-203 — Você sente o corpo dolorido sem causa clara? | **MANTER (Ácido-Inflamatório)** | corpo dolorido sem causa clara é relato de dor/desconforto. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-204 — Você sente azia ou queimação no estômago? | **MANTER (Ácido-Inflamatório)** | azia ou queimação é relato de desconforto/irritação; não mede acidez corporal. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-205 — Você tem dor de cabeça mais de uma vez por semana? | **MANTER (Ácido-Inflamatório)** | dor de cabeça frequente é relato de dor. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-207 — Sua gengiva sangra ao escovar? | **MANTER (Ácido-Inflamatório)** | gengiva que sangra é relato de irritação de mucosa. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-208 — Você percebe que piora quando come ultraprocessado ou açúcar? | **MANTER (Ácido-Inflamatório)** | piora percebida com ultraprocessados/açúcar é relato de reatividade percebida, não prova de inflamação. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-209 — Suas mãos ou dedos amanhecem inchados? | **MANTER (Ácido-Inflamatório)** | mãos que amanhecem inchadas é relato de rigidez/desconforto matinal. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-301 — Você fica com muito sono logo depois do almoço? | **MANTER (Metabólico)** | sono depois do almoço é resposta percebida à refeição. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-303 — Você sente fome de novo pouco tempo depois de ter comido? | **MANTER (Metabólico)** | fome pouco depois de comer é relato de fome/saciedade. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-304 — Você come depois do jantar mesmo sem fome real? | **MANTER (Metabólico)** | comer depois do jantar sem fome é comportamento alimentar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-307 — Você fica irritado ou trêmulo se atrasa uma refeição? | **MANTER (Metabólico)** | irritação ou tremor ao atrasar refeição é resposta percebida à rotina alimentar. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-401 — Você percebe inchaço nas pernas ou nos pés no fim do dia? | **MANTER (Detox + Linfático)** | inchaço nas pernas no fim do dia é retenção percebida. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-402 — Seu rosto amanhece inchado? | **MANTER (Detox + Linfático)** | rosto inchado ao acordar é retenção percebida. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-403 — Cheiros fortes te incomodam mais do que incomodam as outras pessoas? | **MANTER (Detox + Linfático)** | incômodo com cheiros fortes é sensibilidade relatada. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-405 — Você passa um dia ou mais sem evacuar? | **MANTER (Detox + Linfático)** | ficar um dia ou mais sem evacuar é relato de eliminação/funcionamento intestinal. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-406 — Uma taça já te dá ressaca no dia seguinte? | **MANTER (Detox + Linfático)** | ressaca com pouca bebida é reação relatada ao álcool; não mede função hepática. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-407 — Você reage muito forte a medicamento ou a café? | **MANTER (Detox + Linfático)** | reação forte a medicamento ou café é sensibilidade relatada. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-502 — Você demora a dormir porque a cabeça não desliga? | **MANTER (Mental-Emocional-Espiritual)** | demora a dormir porque a cabeça não desliga (pensamento acelerado). | **DECISÃO APLICADA** (v6) |
| 61 | SNT-503 — Você acorda de madrugada e custa a voltar a dormir? | **MANTER (Mental-Emocional-Espiritual)** | despertar de madrugada com dificuldade de voltar a dormir (sono/alerta previsto no MEE). | **DECISÃO APLICADA** (v6) |
| 61 | SNT-504 — Você se preocupa muito com coisas que ainda nem aconteceram? | **MANTER (Mental-Emocional-Espiritual)** | preocupação antecipatória. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-505 — Você come para se acalmar quando fica ansioso ou triste? | **MANTER (Mental-Emocional-Espiritual)** | comer para se acalmar é comportamento alimentar ligado ao estado emocional (mesma lógica de EMO-301/303). | **DECISÃO APLICADA** (v6) |
| 61 | SNT-506 — Você sente que está sempre em alerta esperando algo dar errado? | **MANTER (Mental-Emocional-Espiritual)** | estado de alerta constante. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-508 — Você tem dificuldade de manter o foco em uma tarefa? | **MANTER (Mental-Emocional-Espiritual)** | dificuldade de foco. | **DECISÃO APLICADA** (v6) |
| 61 | SNT-509 — Você perde a paciência com facilidade? | **MANTER (Mental-Emocional-Espiritual)** | perda de paciência (regulação emocional). | **DECISÃO APLICADA** (v6) |
| 61 | SNT-510 — Você tem se afastado das pessoas? | **MANTER (Mental-Emocional-Espiritual)** | afastamento das pessoas (conexão/pertencimento). | **DECISÃO APLICADA** (v6) |
| 61 | EMO-501 — Você fala consigo mesmo de um jeito que não falaria com um amigo? | **MANTER (Mental-Emocional-Espiritual)** | diálogo interno autocrítico. | **DECISÃO APLICADA** (v6) |
| 61 | EMO-503 — Você se descreve com frases como sempre fui assim ou não tenho força de vontade? | **MANTER (Mental-Emocional-Espiritual)** | crenças fixas sobre si. | **DECISÃO APLICADA** (v6) |
| 61 | EMO-505 — Você sente que seu corpo trabalha contra você? | **MANTER (Mental-Emocional-Espiritual)** | percepção de conflito com o próprio corpo. | **DECISÃO APLICADA** (v6) |
| 61 | EMO-507 — Você olha para sua vida hoje e se reconhece nela? | **MANTER (Mental-Emocional-Espiritual)** | reconhecer-se na própria vida (identidade). | **DECISÃO APLICADA** (v6) |
| 61 | ESP-102 — Você sabe dizer o que veio fazer nesta vida? | **MANTER (Mental-Emocional-Espiritual)** | sentido e propósito. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-201 — Suas escolhas alimentares combinam com aquilo que você diz valorizar? | **MANTER (Mental-Emocional-Espiritual)** | coerência entre escolhas e valores. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-202 — Você tem clareza sobre o que é inegociável para você? | **MANTER (Mental-Emocional-Espiritual)** | clareza de valores e limites. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-301 — Você sente que existe algo maior te sustentando? | **MANTER (Mental-Emocional-Espiritual)** | sensação de sustentação/sentido. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-302 — Você reserva um momento do dia para agradecer alguma coisa? | **MANTER (Mental-Emocional-Espiritual)** | prática de gratidão. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-401 — Você sente que não merece as coisas boas que conquista? | **MANTER (Mental-Emocional-Espiritual)** | merecimento. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-402 — Quando as coisas começam a dar certo você acaba boicotando? | **MANTER (Mental-Emocional-Espiritual)** | autossabotagem. | **DECISÃO APLICADA** (v6) |
| 61 | ESP-403 — Você repete sobre si mesmo histórias que ouviu na família e nunca questionou? | **MANTER (Mental-Emocional-Espiritual)** | narrativas familiares sobre si. | **DECISÃO APLICADA** (v6) |

**Lote 2B (13/10/2026) → HOLOS-V1 v5, montado a partir da v4.** Regras registradas:
- "O bloco de origem da pergunta não define automaticamente o sistema. A associação deve ser sustentada pelo conteúdo investigado." — conteúdo da pergunta > bloco de origem para definição do sistema;
- "Associação contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade." — contextual não pontua e não implica causalidade.

Contagens da v5: 82 perguntas coletadas, 80 pontuáveis; Fúngico 12 → 11, Ácido Inflamatório 11 → 9, Metabólico 10 → 8, Detox e Linfático 12 → 10, Mental Emocional Espiritual 37 → 42; Tríade 47 / 19 / 14 (ESP-501 e ESP-502 saem da Tríade Espírito). Pesos preservados (todos 1). Detalhes: `docs/v1/ALTERACOES-PACOTE-HOLOSCAN-V5.md`.

Decisões explícitas de Rodrigo em 13/10/2026 (regra operacional: decisão explícita de Rodrigo = autorização para implementar). Aplicadas no **HOLOS-V1 v4**, montado a partir do **HOLOS-V1 v2 ativo** com só estas decisões.

**Regra metodológica ativa (13/10/2026):**
- "Uma relação holística, simbólica ou contextual entre emoção e corpo não é suficiente, por si só, para justificar que uma resposta mental/emocional altere matematicamente a nota de um sistema físico."
- "Perguntas mentais/emocionais devem pontuar sistema físico somente quando existir justificativa metodológica específica, documentada e aprovada para aquela associação."

**Como foi aplicada:**
- **REMOVER (SNT-210, SNT-309):** fora do v4 — não pontuam, não são contextuais, não estão em outro sistema, sem item substituto. O motor do v4 recusa resposta para elas; não contam na cobertura, no Índice, na Tríade Corpo, nos sinais dominantes nem na prioridade do PP-V1.
- **MOVER (13 EMO):** a associação primária passou para o Mental Emocional Espiritual. Peso preservado (1, escala 0–3, orientação direta, igual a todos os itens primários do MEE; nenhum peso inventado). Tríade Mente, texto e escala iguais. A relação antiga com sistema físico **não** ficou como contextual: saíram as contextuais EMO-101 → Metabólico e EMO-203 → Detox e Linfático, e as contextuais MEE de EMO-103, 201, 301, 302 e 402 (redundantes, porque o MEE virou o primário).
- **HOLOS-V1 v2 imutável; nenhum histórico recalculado:** aplicações, respostas, notas, sinais dominantes, Resultados HOLOS, Próximos Passos e emissões (PDF) já salvos continuam no v2.
- **Contagens do v4 (recalculadas):** total 84 → 82; Corpo 49 → 47, Mente 19, Espírito 16; Fúngico 15 → 12, Ácido Inflamatório 16 → 11, Metabólico 14 → 10, Detox e Linfático 15 → 12, Mental Emocional Espiritual 24 → 37. Cobertura mínima (80%) igual, sobre os denominadores novos.

## 4. GRUPO 1 — CONFLITO DIRETO (SNT-210, SNT-309)

**DECISÃO APLICADA (Lote 1, 13/10/2026): REMOVER as duas perguntas — fora do HOLOS-V1 v4.** Ver o registro na seção 3A. O HOLOS-V1 v2 continua imutável (os dois itens continuam pontuando nas aplicações já feitas no v2). O texto abaixo descreve o conflito no v2.

**Por que é conflito.** A decisão vigente é que **exames não participam do Resultado HOLOS**:
- "Continuam fora de qualquer resultado: os exames" — `RESULTADO-FINAL-DECISOES-APROVADAS.md`;
- `DECISOES-V1.md`, itens 173, 175 e 176.

Mesmo assim, as duas perguntas são relatos de exame laboratorial e pontuam sistemas no v2. A pendência está aberta como **PM-15**.

| | SNT-210 | SNT-309 |
|---|---|---|
| texto | Seus exames costumam mostrar PCR ou VHS acima do normal? | Seus exames costumam mostrar triglicerídeos altos ou HDL baixo? |
| sistema afetado | Ácido Inflamatório (16 itens) | Metabólico (14 itens) |
| peso · orientação · escala | 1 · direta · frequência 0–3 | 1 · direta · frequência 0–3 |
| impacto máximo na nota do sistema (0–10) | até 0,625 (todos respondidos) / 0,769 (cobertura mínima) | até 0,714 / 0,833 |
| Índice afetado (0–100) | até 1,25 / 1,54 | até 1,43 / 1,67 |
| Tríade | Corpo: até 0,20–0,25 | Corpo: até 0,20–0,25 |
| os dois juntos | Índice até 2,68 pontos; Tríade Corpo até 0,41 | |
| faixa / prioridade | uma única resposta pode mudar a faixa (alta → intermediária, conferido no motor real), a ordem de "Por onde investigar" e a 1ª/2ª área | idem |

Valores e conferência no motor real: `AUDITORIA-ASSOCIACOES-HOLOSCAN-V2.md` §7.3.

**Impacto em sinais dominantes.** Hoje podem aparecer entre os 3 sinais dominantes do sistema, com o texto da pergunta ("PCR", "triglicerídeos/HDL"):
- no Resultado HOLOS, nas visões profissional e da paciente;
- nos Próximos Passos;
- no Relatório.

Conferido com snapshot sintético (§7.5). Retirados da pontuação, deixam de poder aparecer como dominantes nas **novas** aplicações.

**Impacto nos testes.** Citam os IDs:
- `testes/caso.json`;
- `testes/golden/rf1-fixture.json`;
- `testes/testar-raciocinio.mjs` (legado);
- `testes/testar-resultado-sintese.mjs` (PM-15);
- `supabase/tests/etapa4-2-pacotes.sql`;
- `supabase/tests/pacote-v3-doc.sql`.

Contagens por sistema fixadas em testes:
- `testar-v1-etapa4-2-pacote-v1.mjs`;
- `testar-pacote-v3.mjs`;
- `testar-questionario-v3.mjs`.

Numa nova versão, esses arquivos seriam atualizados junto com o pacote.

**Impacto no histórico.** **Nenhum** (regra da decisão). Aplicações, respostas, notas, snapshots do Resultado HOLOS (com os dominantes) e dos Próximos Passos, e emissões RF-1/RF-2 já salvos ficam como estão, no v2. **Resultados HOLOS-V1 v2 históricos devem permanecer imutáveis**; nenhuma nota antiga é recalculada.

**Impacto no PP-V1.** O catálogo sistema → ferramenta (30 regras) **não muda**: ele não cita perguntas. A **seleção** de uma nova aplicação pode mudar, porque depende dos dois sistemas de menor nota. Snapshots de Próximos Passos já registrados ficam congelados.

**Outros pontos a decidir junto**
- O texto oficial do Metabólico (D13) cita "achados laboratoriais relatados no questionário".
- A tela não oferece "não se aplica" para quem não fez exame, embora o motor aceite esse estado.
- O rascunho de 12/10 (a v3 publicada por engano) também não resolvia os dois itens: estavam listados como "pendências do v3 para revisão metodológica separada" (`PUBLICACAO-DIRETA-HOLOSCAN.md`).

#### SNT-210 — Seus exames costumam mostrar PCR ou VHS acima do normal?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:22)») |
| fonte da justificativa | — |
| classificação da auditoria | D — CONFLITO COM DECISÃO ATUAL: pergunta sobre resultado de exame laboratorial (PCR/VHS) pontua o Ácido Inflamatório; decisão vigente: exames não entram em nenhum resultado (ver §7). Pendência PM-15 aberta |
| decisão metodológica | **DECISÃO APLICADA: REMOVER** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☐ MOVER  ☐ CONTEXTUAL  ☒ **REMOVER** |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | ALTO — dado laboratorial relatado pontua o Resultado HOLOS (conflito com a decisão de que exames não participam do resultado) |
| observações | — |
| justificativa da decisão | Exames e documentos não participam do Resultado HOLOS. PCR/VHS não deve alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos. |
| regras da decisão | Aplicada no HOLOS-V1 v4; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado; sem item substituto; não é pontuável, nem contextual, nem movida para outro sistema. |
| decisão registrada | REMOVER · sem sistema de destino · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### SNT-309 — Seus exames costumam mostrar triglicerídeos altos ou HDL baixo?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:31)») |
| fonte da justificativa | — |
| classificação da auditoria | D — CONFLITO COM DECISÃO ATUAL: pergunta sobre resultado de exame laboratorial (triglicerídeos/HDL) pontua o Metabólico; decisão vigente: exames não entram em nenhum resultado (ver §7). Pendência PM-15 aberta. Nota: o texto oficial D13 do Metabólico cita «achados laboratoriais relatados no questionário» |
| decisão metodológica | **DECISÃO APLICADA: REMOVER** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☐ MOVER  ☐ CONTEXTUAL  ☒ **REMOVER** |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | ALTO — dado laboratorial relatado pontua o Resultado HOLOS (conflito com a decisão de que exames não participam do resultado) |
| observações | — |
| justificativa da decisão | Exames e documentos não participam do Resultado HOLOS. Triglicerídeos/HDL não devem alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos. |
| regras da decisão | Aplicada no HOLOS-V1 v4; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado; sem item substituto; não é pontuável, nem contextual, nem movida para outro sistema. |
| decisão registrada | REMOVER · sem sistema de destino · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

## 4A. LOTE 2 — ASSOCIAÇÕES MENTAIS/EMOCIONAIS/ESPIRITUAIS → SISTEMAS FÍSICOS (21 perguntas)

**21 DECISÕES APLICADAS:** as 13 perguntas EMO (MOVER para o Mental Emocional Espiritual, HOLOS-V1 v4) e as 8 perguntas ESP (Lote 2B, HOLOS-V1 v5: 5 MOVER para o MEE, ESP-303 MANTER, ESP-501 e ESP-502 CONTEXTUAL). São as perguntas dos blocos Mental/Emocional e Espiritual que no v2 pontuam um sistema físico (todas C na auditoria). As colunas "sistema atual" e "peso" descrevem o v2. As fichas completas estão na seção 5.

| ID | texto | bloco | sistema atual | peso | justificativa documentada | risco interpretativo | MANTER | MOVER | CONTEXTUAL | REMOVER | decisão |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EMO-101 | Você adia começar coisas mesmo sabendo que precisa fazer? | Mental/Emocional | Fúngico | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Fúngico: estagnação e desordem) (motor/bancos/emocoes.csv:2)») | conteúdo comportamental (adiar tarefas) pontua um sistema de nome fisiológico (Fúngico); o texto oficial D13 do Fúngico cita «sinais digestivos, mucosas, pele e padrões de desejo alimentar» e não cita comportamento ou emoção; o vínculo vem do padrão emocional legado «estagnação e desordem» (rascunho) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Procrastinação, prontidão e autorregulação comportamental. |
| EMO-102 | Você sente que sua vida está desorganizada e não consegue pôr ordem? | Mental/Emocional | Fúngico | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Fúngico: estagnação e desordem) (motor/bancos/emocoes.csv:3)») | conteúdo comportamental/emocional (vida desorganizada) pontua o Fúngico; mesma situação de EMO-101 (padrão legado «estagnação e desordem», não coberto pelo texto oficial D13) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Organização pessoal e comportamento. |
| EMO-103 | Você sente um peso para sair do lugar mesmo querendo mudar? | Mental/Emocional | Fúngico | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Fúngico) (motor/bancos/emocoes.csv:4)») | conteúdo emocional («peso para sair do lugar») pontua o Fúngico; a associação pode sugerir ao leitor uma relação entre estado emocional e um eixo de nome fúngico; vínculo vem do padrão legado do Fúngico (rascunho). Já tem MEE como contextual (não pontua) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Prontidão, dificuldade percebida para iniciar mudança e autorregulação. |
| EMO-201 | Você se irrita com facilidade por coisas pequenas? | Mental/Emocional | Ácido Inflamatório | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Ácido-Inflamatório: irritação e reatividade) (motor/bancos/emocoes.csv:5)») | conteúdo emocional (irritação) pontua o Ácido Inflamatório; o texto oficial D13 cita «reatividade» sem dizer se é emocional; vínculo vem do padrão legado «irritação e reatividade». Já tem MEE como contextual (não pontua) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Irritabilidade e regulação emocional. |
| EMO-202 | Sua raiva sobe rápido e demora a passar? | Mental/Emocional | Ácido Inflamatório | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Ácido-Inflamatório) (motor/bancos/emocoes.csv:6)») | conteúdo emocional (raiva) pontua o Ácido Inflamatório; mesma situação de EMO-201 | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Intensidade e duração percebida da raiva. |
| EMO-203 | Você costuma aceitar o que não quer para evitar conflito? | Mental/Emocional | Ácido Inflamatório | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (impacto espiritual: bloqueio no plexo solar) (motor/bancos/emocoes.csv:7)») | conteúdo emocional/relacional pontua o Ácido Inflamatório; a proveniência registrada é «impacto espiritual: bloqueio no plexo solar», expressão que a Decisão 13 retirou do conteúdo oficial como termo causal («"bloqueio no plexo solar" … saem do conteúdo oficial»); a associação continua | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Limites, comportamento interpessoal e evitação de conflito. |
| EMO-204 | Você engole o que gostaria de dizer para não criar problema? | Mental/Emocional | Ácido Inflamatório | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (impacto espiritual: bloqueio no plexo solar) (motor/bancos/emocoes.csv:8)») | conteúdo emocional/relacional pontua o Ácido Inflamatório; proveniência «impacto espiritual: bloqueio no plexo solar» (termo retirado do conteúdo oficial pela Decisão 13); a associação continua | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Expressão emocional e comportamento interpessoal. |
| EMO-301 | Você sente um vazio que a comida parece tentar preencher? | Mental/Emocional | Metabólico | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Metabólico: vazio e falta de propósito) (motor/bancos/emocoes.csv:9)») | conteúdo emocional (vazio) pontua o Metabólico; o texto oficial D13 do Metabólico cita «comportamento alimentar», mas não emoção; vínculo vem do padrão legado «vazio e falta de propósito». Já tem MEE como contextual (não pontua) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Relação entre estado emocional e alimentação. |
| EMO-302 | Você passa os dias no piloto automático sem perceber o que está fazendo? | Mental/Emocional | Metabólico | 1 | Justificativa não documentada (proveniência histórica: «livro p. 56 (Propósito de Vida e Nutrição) (motor/bancos/emocoes.csv:10)») | conteúdo de atenção/comportamento (piloto automático) pontua o Metabólico; no v2 o enunciado não menciona alimentação (o v3 acrescenta «em relação à alimentação»); MEE como contextual (não pontua) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Consciência, atenção ao comportamento e funcionamento em piloto automático. |
| EMO-303 | Você usa comida como recompensa depois de um dia difícil? | Mental/Emocional | Metabólico | 1 | Justificativa não documentada (proveniência histórica: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/emocoes.csv:11)») | comportamento alimentar emocional (comida como recompensa) do bloco Mente pontua o Metabólico; o texto oficial D13 do Metabólico inclui «comportamento alimentar», o que dá cobertura temática, mas não há justificativa do item | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Uso da comida como recompensa e comportamento alimentar associado ao estado emocional. |
| EMO-401 | Você se pega remoendo uma mágoa antiga? | Mental/Emocional | Detox e Linfático | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox: acúmulo de mágoas) (motor/bancos/emocoes.csv:12)») | conteúdo emocional (mágoa) pontua o Detox e Linfático; texto oficial D13 do Detox cita «inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias»; vínculo vem do padrão legado «acúmulo de mágoas» (rascunho); pode sugerir leitura causal emoção→eliminação | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Ruminação emocional. |
| EMO-402 | Você costuma guardar o que sente em vez de falar? | Mental/Emocional | Detox e Linfático | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox: emoções não processadas) (motor/bancos/emocoes.csv:13)») | conteúdo emocional (guardar o que sente) pontua o Detox e Linfático; padrão legado «emoções não processadas»; texto oficial D13 não cobre o tema. MEE como contextual (não pontua) | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Expressão e regulação emocional. |
| EMO-403 | Você tem dificuldade de aceitar ajuda ou cuidado das pessoas? | Mental/Emocional | Detox e Linfático | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox) (motor/bancos/emocoes.csv:14)») | conteúdo relacional (aceitar ajuda) pontua o Detox e Linfático; texto oficial D13 não cobre o tema | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v4): MOVER → Mental Emocional Espiritual — Apoio, vínculo e capacidade de receber cuidado. |
| ESP-101 | Você sente que sua vida tem uma direção clara? | Espiritual | Metabólico | 1 | Justificativa não documentada (proveniência histórica: «livro p. 56 (Propósito de Vida e Nutrição) (motor/bancos/espiritual.csv:2)») | conteúdo de propósito (direção de vida, invertida) pontua o Metabólico; proveniência «Propósito de Vida e Nutrição» não menciona o sistema; texto oficial D13 não cobre o tema | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v5): MOVER → Mental Emocional Espiritual — Direção, propósito e sentido pertencem diretamente ao eixo Mental-Emocional-Espiritual. |
| ESP-103 | Sua rotina de hoje te afasta do que você quer para a sua vida? | Espiritual | Metabólico | 1 | Justificativa não documentada (proveniência histórica: «livro p. 57 (Avaliação de Alinhamento) (motor/bancos/espiritual.csv:4)») | conteúdo de propósito/rotina pontua o Metabólico; proveniência «Avaliação de Alinhamento» não menciona o sistema; texto oficial D13 não cobre o tema | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v5): MOVER → Mental Emocional Espiritual — Investiga alinhamento entre rotina, escolhas e direção de vida. |
| ESP-203 | Você abre mão do que é inegociável para você só para agradar alguém? | Espiritual | Ácido Inflamatório | 1 | Justificativa não documentada (proveniência histórica: «livro p. 46 (princípios inegociáveis) (motor/bancos/espiritual.csv:7)») | conteúdo de valores/relacional (abrir mão do inegociável) pontua o Ácido Inflamatório; a proveniência registrada («princípios inegociáveis») não menciona o sistema; texto oficial D13 não cobre o tema | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v5): MOVER → Mental Emocional Espiritual — Investiga valores, limites e comportamento interpessoal. Não deve pontuar um sistema físico por associação simbólica. |
| ESP-303 | Você começa a comer sem fazer nenhuma pausa antes? | Espiritual | Metabólico | 1 | Justificativa não documentada (proveniência histórica: «livro p. 62 (Pausa Consciente) (motor/bancos/espiritual.csv:10)») | comportamento alimentar (pausa antes de comer) do bloco Espírito pontua o Metabólico; o texto oficial D13 inclui «comportamento alimentar» (cobertura temática), mas não há justificativa do item; proveniência «Pausa Consciente» | ☒ | ☐ | ☐ | ☐ | **DECISÃO APLICADA** (v5): MANTER (Metabólico) — Apesar de estar no bloco espiritual, o conteúdo da pergunta investiga diretamente comportamento alimentar e contexto da refeição. |
| ESP-404 | Você acredita que para ter saúde precisa sofrer ou se privar? | Espiritual | Ácido Inflamatório | 1 | Justificativa não documentada (proveniência histórica: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/espiritual.csv:14)») | crença («para ter saúde precisa sofrer») pontua o Ácido Inflamatório; redação + eixo podem sugerir causalidade; a revisão pública negou o item «por estar no Sistema Ácido Inflamatório» e a decisão de 12/10 (DECISOES-V1 item 183) o move para o MEE no v3 (não publicado); no v2 o vínculo continua | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v5): MOVER → Mental Emocional Espiritual — Investiga crença sobre saúde, sofrimento e privação. Não deve pontuar um sistema físico. |
| ESP-405 | Você carrega o peso de não ter conseguido perdoar alguém? | Espiritual | Detox e Linfático | 1 | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox: acúmulo de mágoas) (motor/bancos/espiritual.csv:15)») | conteúdo espiritual/relacional (perdão) pontua o Detox e Linfático; padrão legado «acúmulo de mágoas»; texto oficial D13 não cobre o tema; pode sugerir leitura causal | ☐ | ☒ | ☐ | ☐ | **DECISÃO APLICADA** (v5): MOVER → Mental Emocional Espiritual — Investiga conteúdo emocional/simbólico relacionado a perdão. Não deve sugerir relação automática entre mágoa, detoxificação ou fluxo linfático. |
| ESP-501 | Você passa algum tempo em contato com a natureza? | Espiritual | Fúngico | 1 | Justificativa não documentada (proveniência histórica: «livro p. 39 (alimentação como ato sagrado) (motor/bancos/espiritual.csv:16)») | hábito ambiental/espiritual (contato com a natureza, invertida) pontua o Fúngico; a proveniência registrada («alimentação como ato sagrado») não menciona o Fúngico; o texto oficial D13 do Fúngico não cobre o tema; a associação pode sugerir causalidade («pouco contato com a natureza» elevando um eixo fúngico) | ☐ | ☐ | ☒ | ☐ | **DECISÃO APLICADA** (v5): CONTEXTUAL (sem pontuação) — É informação holística potencialmente útil, mas não há justificativa metodológica suficiente para alterar matematicamente a nota do Sistema Fúngico ou de outro sistema. |
| ESP-502 | Você faz suas refeições sozinho e com pressa? | Espiritual | Detox e Linfático | 1 | Justificativa não documentada (proveniência histórica: «livro p. 63 (Comunhão Consciente) (motor/bancos/espiritual.csv:17)») | contexto social/comportamental da refeição (sozinho e com pressa) pontua o Detox e Linfático; proveniência «Comunhão Consciente» não menciona o sistema; texto oficial D13 não cobre o tema | ☐ | ☐ | ☒ | ☐ | **DECISÃO APLICADA** (v5): CONTEXTUAL (sem pontuação) — Investiga contexto da refeição, ritmo, rotina e pertencimento, mas não há justificativa suficiente para alterar diretamente a nota do Sistema Detox + Linfático ou outro sistema físico. |

**EMO-502 e EMO-504:** CONTEXTUAL MANTIDO — a associação contextual com o Sistema Metabólico continua, sem pontuação metabólica (HOLOS-V1 v5).
- Perguntas 2 a 5 da seção 9 da auditoria.

## 5. GRUPO 2 — REVISÃO PRIORITÁRIA (26 perguntas classificadas C)

| subgrupo | perguntas |
|---|---|
| Físico → físico | 4 — SNT-104, SNT-105, SNT-206, SNT-209 |
| Mental/emocional → sistema físico | 13 — EMO-101, EMO-102, EMO-103, EMO-201, EMO-202, EMO-203, EMO-204, EMO-301, EMO-302, EMO-303, EMO-401, EMO-402, EMO-403 |
| Espiritual → sistema físico | 8 — ESP-101, ESP-103, ESP-203, ESP-303, ESP-404, ESP-405, ESP-501, ESP-502 |
| Físico → MEE | 1 — SNT-507 |
| Outras associações cruzadas | 0 — — |

### Físico → físico (4)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-104 | Você tem candidíase ou sapinho com frequência? | Físico | Fúngico | C |
| SNT-105 | Você tem micose de pele ou unha que volta sempre? | Físico | Fúngico | C |
| SNT-206 | Sua pele tem crises de acne inflamada, eczema ou psoríase? | Físico | Ácido Inflamatório | C |
| SNT-209 | Suas mãos ou dedos amanhecem inchados? | Físico | Ácido Inflamatório | C |

#### SNT-104 — Você tem candidíase ou sapinho com frequência?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:5)») |
| fonte da justificativa | — |
| classificação da auditoria | C — enunciado nomeia uma condição («candidíase») que o texto oficial do próprio sistema diz não diagnosticar («Não diagnostica candidíase, infecção fúngica…», D13); o termo «candid» está na lista de linguagem proibida do Fúngico em `sistemas-fechamento.js`, mas o enunciado pode aparecer literal como sinal dominante (§6.4 e §7.5) |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — enunciado nomeia uma condição («candidíase») que o texto oficial do próprio sistema diz não diagnosticar («Não diagnostica candidíase, infecção fúngica…», D13); o termo «candid» está na lista de linguagem proibida do Fúngico em `sistemas-fechamento.js`, mas o enunciado pode aparecer literal como sinal dominante (§6.4 e §7.5) |
| observações | v3 (não publicado) reescreve o texto: «Você tem candidíase com frequência (íntima ou na boca, o "sapinho")?»; o enunciado contém termo da lista de linguagem proibida do Fúngico em `sistemas-fechamento.js` e pode aparecer literal como sinal dominante |
| justificativa da decisão | Condição nomeada (candidíase/sapinho): dentro do Fúngico a pontuação pareceria confirmar a condição e sua causa. Fica como relato informado pela paciente, sem pontuar. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Fúngico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-105 — Você tem micose de pele ou unha que volta sempre?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:6)») |
| fonte da justificativa | — |
| classificação da auditoria | C — enunciado nomeia micose (infecção fúngica de pele/unha) num eixo cujo texto oficial diz «Não diagnostica … infecção fúngica» (D13); leitura diagnóstica possível |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — enunciado nomeia micose (infecção fúngica de pele/unha) num eixo cujo texto oficial diz «Não diagnostica … infecção fúngica» (D13); leitura diagnóstica possível |
| observações | v3 (não publicado) reescreve o texto: «Você tem micose de pele ou unha que sempre volta?» |
| justificativa da decisão | Condição nomeada (micose): dentro do Fúngico a pontuação pareceria confirmar a condição e sua causa. Fica como relato, sem pontuar. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Fúngico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-206 — Sua pele tem crises de acne inflamada, eczema ou psoríase?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:18)») |
| fonte da justificativa | — |
| classificação da auditoria | C — enunciado nomeia diagnósticos dermatológicos («acne inflamada, eczema ou psoríase») num eixo cujo texto oficial diz «O eixo não diagnostica inflamação» (D13); leitura diagnóstica possível |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — enunciado nomeia diagnósticos dermatológicos («acne inflamada, eczema ou psoríase») num eixo cujo texto oficial diz «O eixo não diagnostica inflamação» (D13); leitura diagnóstica possível |
| observações | — |
| justificativa da decisão | Condições nomeadas (acne inflamada, eczema, psoríase): pontuar no Ácido-Inflamatório pareceria confirmar doença inflamatória. Fica como relato, sem pontuar. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Ácido Inflamatório) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-209 — Suas mãos ou dedos amanhecem inchados?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:21)») |
| fonte da justificativa | — |
| classificação da auditoria | C — a revisão pública do v2 negou o item com o motivo «sem relação causal direta com o Sistema Ácido Inflamatório» (`docs/v1/REVISAO-PERGUNTAS-V3.md`); removido no v3 (item 183), que não está publicado; no v2 em produção o vínculo continua |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — a revisão pública do v2 negou o item com o motivo «sem relação causal direta com o Sistema Ácido Inflamatório» (`docs/v1/REVISAO-PERGUNTAS-V3.md`); removido no v3 (item 183), que não está publicado; no v2 em produção o vínculo continua |
| observações | v3 (não publicado) remove: «negada na revisão: sem relação causal direta com o Sistema Ácido Inflamatório» |
| justificativa da decisão | mãos que amanhecem inchadas é relato de rigidez/desconforto matinal. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

### Mental/emocional → sistema físico (13)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| EMO-101 | Você adia começar coisas mesmo sabendo que precisa fazer? | Mental/Emocional | Fúngico | C |
| EMO-102 | Você sente que sua vida está desorganizada e não consegue pôr ordem? | Mental/Emocional | Fúngico | C |
| EMO-103 | Você sente um peso para sair do lugar mesmo querendo mudar? | Mental/Emocional | Fúngico | C |
| EMO-201 | Você se irrita com facilidade por coisas pequenas? | Mental/Emocional | Ácido Inflamatório | C |
| EMO-202 | Sua raiva sobe rápido e demora a passar? | Mental/Emocional | Ácido Inflamatório | C |
| EMO-203 | Você costuma aceitar o que não quer para evitar conflito? | Mental/Emocional | Ácido Inflamatório | C |
| EMO-204 | Você engole o que gostaria de dizer para não criar problema? | Mental/Emocional | Ácido Inflamatório | C |
| EMO-301 | Você sente um vazio que a comida parece tentar preencher? | Mental/Emocional | Metabólico | C |
| EMO-302 | Você passa os dias no piloto automático sem perceber o que está fazendo? | Mental/Emocional | Metabólico | C |
| EMO-303 | Você usa comida como recompensa depois de um dia difícil? | Mental/Emocional | Metabólico | C |
| EMO-401 | Você se pega remoendo uma mágoa antiga? | Mental/Emocional | Detox e Linfático | C |
| EMO-402 | Você costuma guardar o que sente em vez de falar? | Mental/Emocional | Detox e Linfático | C |
| EMO-403 | Você tem dificuldade de aceitar ajuda ou cuidado das pessoas? | Mental/Emocional | Detox e Linfático | C |

#### EMO-101 — Você adia começar coisas mesmo sabendo que precisa fazer?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Fúngico: estagnação e desordem) (motor/bancos/emocoes.csv:2)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo comportamental (adiar tarefas) pontua um sistema de nome fisiológico (Fúngico); o texto oficial D13 do Fúngico cita «sinais digestivos, mucosas, pele e padrões de desejo alimentar» e não cita comportamento ou emoção; o vínculo vem do padrão emocional legado «estagnação e desordem» (rascunho) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Metabólico — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo comportamental (adiar tarefas) pontua um sistema de nome fisiológico (Fúngico); o texto oficial D13 do Fúngico cita «sinais digestivos, mucosas, pele e padrões de desejo alimentar» e não cita comportamento ou emoção; o vínculo vem do padrão emocional legado «estagnação e desordem» (rascunho) |
| observações | — |
| justificativa da decisão | Procrastinação, prontidão e autorregulação comportamental. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Fúngico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-102 — Você sente que sua vida está desorganizada e não consegue pôr ordem?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Fúngico: estagnação e desordem) (motor/bancos/emocoes.csv:3)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo comportamental/emocional (vida desorganizada) pontua o Fúngico; mesma situação de EMO-101 (padrão legado «estagnação e desordem», não coberto pelo texto oficial D13) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo comportamental/emocional (vida desorganizada) pontua o Fúngico; mesma situação de EMO-101 (padrão legado «estagnação e desordem», não coberto pelo texto oficial D13) |
| observações | — |
| justificativa da decisão | Organização pessoal e comportamento. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Fúngico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-103 — Você sente um peso para sair do lugar mesmo querendo mudar?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Fúngico) (motor/bancos/emocoes.csv:4)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional («peso para sair do lugar») pontua o Fúngico; a associação pode sugerir ao leitor uma relação entre estado emocional e um eixo de nome fúngico; vínculo vem do padrão legado do Fúngico (rascunho). Já tem MEE como contextual (não pontua) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Mental Emocional Espiritual — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional («peso para sair do lugar») pontua o Fúngico; a associação pode sugerir ao leitor uma relação entre estado emocional e um eixo de nome fúngico; vínculo vem do padrão legado do Fúngico (rascunho). Já tem MEE como contextual (não pontua) |
| observações | — |
| justificativa da decisão | Prontidão, dificuldade percebida para iniciar mudança e autorregulação. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Fúngico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-201 — Você se irrita com facilidade por coisas pequenas?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Ácido-Inflamatório: irritação e reatividade) (motor/bancos/emocoes.csv:5)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional (irritação) pontua o Ácido Inflamatório; o texto oficial D13 cita «reatividade» sem dizer se é emocional; vínculo vem do padrão legado «irritação e reatividade». Já tem MEE como contextual (não pontua) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Mental Emocional Espiritual — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional (irritação) pontua o Ácido Inflamatório; o texto oficial D13 cita «reatividade» sem dizer se é emocional; vínculo vem do padrão legado «irritação e reatividade». Já tem MEE como contextual (não pontua) |
| observações | — |
| justificativa da decisão | Irritabilidade e regulação emocional. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Ácido Inflamatório para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-202 — Sua raiva sobe rápido e demora a passar?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Ácido-Inflamatório) (motor/bancos/emocoes.csv:6)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional (raiva) pontua o Ácido Inflamatório; mesma situação de EMO-201 |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional (raiva) pontua o Ácido Inflamatório; mesma situação de EMO-201 |
| observações | — |
| justificativa da decisão | Intensidade e duração percebida da raiva. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Ácido Inflamatório para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-203 — Você costuma aceitar o que não quer para evitar conflito?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | Detox e Linfático — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (impacto espiritual: bloqueio no plexo solar) (motor/bancos/emocoes.csv:7)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional/relacional pontua o Ácido Inflamatório; a proveniência registrada é «impacto espiritual: bloqueio no plexo solar», expressão que a Decisão 13 retirou do conteúdo oficial como termo causal («"bloqueio no plexo solar" … saem do conteúdo oficial»); a associação continua |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Detox e Linfático — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional/relacional pontua o Ácido Inflamatório; a proveniência registrada é «impacto espiritual: bloqueio no plexo solar», expressão que a Decisão 13 retirou do conteúdo oficial como termo causal («"bloqueio no plexo solar" … saem do conteúdo oficial»); a associação continua |
| observações | — |
| justificativa da decisão | Limites, comportamento interpessoal e evitação de conflito. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Ácido Inflamatório para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-204 — Você engole o que gostaria de dizer para não criar problema?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (impacto espiritual: bloqueio no plexo solar) (motor/bancos/emocoes.csv:8)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional/relacional pontua o Ácido Inflamatório; proveniência «impacto espiritual: bloqueio no plexo solar» (termo retirado do conteúdo oficial pela Decisão 13); a associação continua |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional/relacional pontua o Ácido Inflamatório; proveniência «impacto espiritual: bloqueio no plexo solar» (termo retirado do conteúdo oficial pela Decisão 13); a associação continua |
| observações | — |
| justificativa da decisão | Expressão emocional e comportamento interpessoal. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Ácido Inflamatório para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-301 — Você sente um vazio que a comida parece tentar preencher?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Metabólico: vazio e falta de propósito) (motor/bancos/emocoes.csv:9)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional (vazio) pontua o Metabólico; o texto oficial D13 do Metabólico cita «comportamento alimentar», mas não emoção; vínculo vem do padrão legado «vazio e falta de propósito». Já tem MEE como contextual (não pontua) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Mental Emocional Espiritual — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional (vazio) pontua o Metabólico; o texto oficial D13 do Metabólico cita «comportamento alimentar», mas não emoção; vínculo vem do padrão legado «vazio e falta de propósito». Já tem MEE como contextual (não pontua) |
| observações | — |
| justificativa da decisão | Relação entre estado emocional e alimentação. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Metabólico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-302 — Você passa os dias no piloto automático sem perceber o que está fazendo?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 56 (Propósito de Vida e Nutrição) (motor/bancos/emocoes.csv:10)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo de atenção/comportamento (piloto automático) pontua o Metabólico; no v2 o enunciado não menciona alimentação (o v3 acrescenta «em relação à alimentação»); MEE como contextual (não pontua) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Mental Emocional Espiritual — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo de atenção/comportamento (piloto automático) pontua o Metabólico; no v2 o enunciado não menciona alimentação (o v3 acrescenta «em relação à alimentação»); MEE como contextual (não pontua) |
| observações | v3 (não publicado) reescreve o texto: «Você passa os dias no piloto automático sem perceber o que está fazendo em relação à alimentação?» |
| justificativa da decisão | Consciência, atenção ao comportamento e funcionamento em piloto automático. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Metabólico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-303 — Você usa comida como recompensa depois de um dia difícil?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/emocoes.csv:11)») |
| fonte da justificativa | — |
| classificação da auditoria | C — comportamento alimentar emocional (comida como recompensa) do bloco Mente pontua o Metabólico; o texto oficial D13 do Metabólico inclui «comportamento alimentar», o que dá cobertura temática, mas não há justificativa do item |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — comportamento alimentar emocional (comida como recompensa) do bloco Mente pontua o Metabólico; o texto oficial D13 do Metabólico inclui «comportamento alimentar», o que dá cobertura temática, mas não há justificativa do item |
| observações | — |
| justificativa da decisão | Uso da comida como recompensa e comportamento alimentar associado ao estado emocional. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Metabólico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-401 — Você se pega remoendo uma mágoa antiga?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox: acúmulo de mágoas) (motor/bancos/emocoes.csv:12)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional (mágoa) pontua o Detox e Linfático; texto oficial D13 do Detox cita «inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias»; vínculo vem do padrão legado «acúmulo de mágoas» (rascunho); pode sugerir leitura causal emoção→eliminação |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional (mágoa) pontua o Detox e Linfático; texto oficial D13 do Detox cita «inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias»; vínculo vem do padrão legado «acúmulo de mágoas» (rascunho); pode sugerir leitura causal emoção→eliminação |
| observações | v3 (não publicado) reescreve o texto: «Você se pega remoendo uma raiva ou mágoa antiga?» |
| justificativa da decisão | Ruminação emocional. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Detox e Linfático para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-402 — Você costuma guardar o que sente em vez de falar?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox: emoções não processadas) (motor/bancos/emocoes.csv:13)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo emocional (guardar o que sente) pontua o Detox e Linfático; padrão legado «emoções não processadas»; texto oficial D13 não cobre o tema. MEE como contextual (não pontua) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Mental Emocional Espiritual — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo emocional (guardar o que sente) pontua o Detox e Linfático; padrão legado «emoções não processadas»; texto oficial D13 não cobre o tema. MEE como contextual (não pontua) |
| observações | — |
| justificativa da decisão | Expressão e regulação emocional. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Detox e Linfático para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

#### EMO-403 — Você tem dificuldade de aceitar ajuda ou cuidado das pessoas?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox) (motor/bancos/emocoes.csv:14)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo relacional (aceitar ajuda) pontua o Detox e Linfático; texto oficial D13 não cobre o tema |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v4) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo relacional (aceitar ajuda) pontua o Detox e Linfático; texto oficial D13 não cobre o tema |
| observações | — |
| justificativa da decisão | Apoio, vínculo e capacidade de receber cuidado. |
| regras da decisão | Aplicada no HOLOS-V1 v4; associação primária no Mental Emocional Espiritual (peso 1, Tríade Mente, texto e escala iguais); a associação física antiga foi retirada e não ficou como contextual; HOLOS-V1 v2 permanece imutável; nenhum histórico é recalculado. |
| decisão registrada | MOVER · de Detox e Linfático para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v4 (versões anteriores imutáveis) |

### Espiritual → sistema físico (8)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| ESP-101 | Você sente que sua vida tem uma direção clara? | Espiritual | Metabólico | C |
| ESP-103 | Sua rotina de hoje te afasta do que você quer para a sua vida? | Espiritual | Metabólico | C |
| ESP-203 | Você abre mão do que é inegociável para você só para agradar alguém? | Espiritual | Ácido Inflamatório | C |
| ESP-303 | Você começa a comer sem fazer nenhuma pausa antes? | Espiritual | Metabólico | C |
| ESP-404 | Você acredita que para ter saúde precisa sofrer ou se privar? | Espiritual | Ácido Inflamatório | C |
| ESP-405 | Você carrega o peso de não ter conseguido perdoar alguém? | Espiritual | Detox e Linfático | C |
| ESP-501 | Você passa algum tempo em contato com a natureza? | Espiritual | Fúngico | C |
| ESP-502 | Você faz suas refeições sozinho e com pressa? | Espiritual | Detox e Linfático | C |

#### ESP-101 — Você sente que sua vida tem uma direção clara?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | intensidade 0–3 |
| orientação | invertida |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 56 (Propósito de Vida e Nutrição) (motor/bancos/espiritual.csv:2)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo de propósito (direção de vida, invertida) pontua o Metabólico; proveniência «Propósito de Vida e Nutrição» não menciona o sistema; texto oficial D13 não cobre o tema |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo de propósito (direção de vida, invertida) pontua o Metabólico; proveniência «Propósito de Vida e Nutrição» não menciona o sistema; texto oficial D13 não cobre o tema |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | Direção, propósito e sentido pertencem diretamente ao eixo Mental-Emocional-Espiritual. |
| regras da decisão | Aplicada no HOLOS-V1 v5 (a partir da v4); primária no Mental Emocional Espiritual (peso 1 preservado, Tríade Espírito); o sistema físico anterior não ficou como contexto; v2, v3 e v4 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Metabólico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-103 — Sua rotina de hoje te afasta do que você quer para a sua vida?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 57 (Avaliação de Alinhamento) (motor/bancos/espiritual.csv:4)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo de propósito/rotina pontua o Metabólico; proveniência «Avaliação de Alinhamento» não menciona o sistema; texto oficial D13 não cobre o tema |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo de propósito/rotina pontua o Metabólico; proveniência «Avaliação de Alinhamento» não menciona o sistema; texto oficial D13 não cobre o tema |
| observações | — |
| justificativa da decisão | Investiga alinhamento entre rotina, escolhas e direção de vida. |
| regras da decisão | Aplicada no HOLOS-V1 v5 (a partir da v4); primária no Mental Emocional Espiritual (peso 1 preservado, Tríade Espírito); o sistema físico anterior não ficou como contexto; v2, v3 e v4 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Metabólico para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-203 — Você abre mão do que é inegociável para você só para agradar alguém?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 46 (princípios inegociáveis) (motor/bancos/espiritual.csv:7)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo de valores/relacional (abrir mão do inegociável) pontua o Ácido Inflamatório; a proveniência registrada («princípios inegociáveis») não menciona o sistema; texto oficial D13 não cobre o tema |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo de valores/relacional (abrir mão do inegociável) pontua o Ácido Inflamatório; a proveniência registrada («princípios inegociáveis») não menciona o sistema; texto oficial D13 não cobre o tema |
| observações | — |
| justificativa da decisão | Investiga valores, limites e comportamento interpessoal. Não deve pontuar um sistema físico por associação simbólica. |
| regras da decisão | Aplicada no HOLOS-V1 v5 (a partir da v4); primária no Mental Emocional Espiritual (peso 1 preservado, Tríade Espírito); o sistema físico anterior não ficou como contexto; v2, v3 e v4 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Ácido Inflamatório para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-303 — Você começa a comer sem fazer nenhuma pausa antes?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 62 (Pausa Consciente) (motor/bancos/espiritual.csv:10)») |
| fonte da justificativa | — |
| classificação da auditoria | C — comportamento alimentar (pausa antes de comer) do bloco Espírito pontua o Metabólico; o texto oficial D13 inclui «comportamento alimentar» (cobertura temática), mas não há justificativa do item; proveniência «Pausa Consciente» |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Metabólico)** (HOLOS-V1 v5) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — comportamento alimentar (pausa antes de comer) do bloco Espírito pontua o Metabólico; o texto oficial D13 inclui «comportamento alimentar» (cobertura temática), mas não há justificativa do item; proveniência «Pausa Consciente» |
| observações | — |
| justificativa da decisão | Apesar de estar no bloco espiritual, o conteúdo da pergunta investiga diretamente comportamento alimentar e contexto da refeição. |
| regras da decisão | Registrada no HOLOS-V1 v5; nada muda na associação (primária Metabólico, peso 1). Conteúdo da pergunta > bloco de origem. |
| decisão registrada | MANTER · Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-404 — Você acredita que para ter saúde precisa sofrer ou se privar?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/espiritual.csv:14)») |
| fonte da justificativa | — |
| classificação da auditoria | C — crença («para ter saúde precisa sofrer») pontua o Ácido Inflamatório; redação + eixo podem sugerir causalidade; a revisão pública negou o item «por estar no Sistema Ácido Inflamatório» e a decisão de 12/10 (DECISOES-V1 item 183) o move para o MEE no v3 (não publicado); no v2 o vínculo continua |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Mental Emocional Espiritual — decisão de 12/10 para o v3 NÃO publicado (`metodologia-revisao-v3.js`): «negada na revisão por estar no Sistema Ácido Inflamatório; decisão de 12/10: a pergunta fica, no Sistema Mental Emocional Espiritual» |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — crença («para ter saúde precisa sofrer») pontua o Ácido Inflamatório; redação + eixo podem sugerir causalidade; a revisão pública negou o item «por estar no Sistema Ácido Inflamatório» e a decisão de 12/10 (DECISOES-V1 item 183) o move para o MEE no v3 (não publicado); no v2 o vínculo continua |
| observações | — |
| justificativa da decisão | Investiga crença sobre saúde, sofrimento e privação. Não deve pontuar um sistema físico. |
| regras da decisão | Aplicada no HOLOS-V1 v5 (a partir da v4); primária no Mental Emocional Espiritual (peso 1 preservado, Tríade Espírito); o sistema físico anterior não ficou como contexto; v2, v3 e v4 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Ácido Inflamatório para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-405 — Você carrega o peso de não ter conseguido perdoar alguém?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Detox: acúmulo de mágoas) (motor/bancos/espiritual.csv:15)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo espiritual/relacional (perdão) pontua o Detox e Linfático; padrão legado «acúmulo de mágoas»; texto oficial D13 não cobre o tema; pode sugerir leitura causal |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Mental Emocional Espiritual** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo espiritual/relacional (perdão) pontua o Detox e Linfático; padrão legado «acúmulo de mágoas»; texto oficial D13 não cobre o tema; pode sugerir leitura causal |
| observações | — |
| justificativa da decisão | Investiga conteúdo emocional/simbólico relacionado a perdão. Não deve sugerir relação automática entre mágoa, detoxificação ou fluxo linfático. |
| regras da decisão | Aplicada no HOLOS-V1 v5 (a partir da v4); primária no Mental Emocional Espiritual (peso 1 preservado, Tríade Espírito); o sistema físico anterior não ficou como contexto; v2, v3 e v4 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Detox e Linfático para Mental Emocional Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-501 — Você passa algum tempo em contato com a natureza?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | invertida |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 39 (alimentação como ato sagrado) (motor/bancos/espiritual.csv:16)») |
| fonte da justificativa | — |
| classificação da auditoria | C — hábito ambiental/espiritual (contato com a natureza, invertida) pontua o Fúngico; a proveniência registrada («alimentação como ato sagrado») não menciona o Fúngico; o texto oficial D13 do Fúngico não cobre o tema; a associação pode sugerir causalidade («pouco contato com a natureza» elevando um eixo fúngico) |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — hábito ambiental/espiritual (contato com a natureza, invertida) pontua o Fúngico; a proveniência registrada («alimentação como ato sagrado») não menciona o Fúngico; o texto oficial D13 do Fúngico não cobre o tema; a associação pode sugerir causalidade («pouco contato com a natureza» elevando um eixo fúngico) |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | É informação holística potencialmente útil, mas não há justificativa metodológica suficiente para alterar matematicamente a nota do Sistema Fúngico ou de outro sistema. |
| regras da decisão | Aplicada no HOLOS-V1 v5: continua coletada; a associação com o sistema físico virou contextual (sem peso) e saiu da Tríade; não entra em denominador, score, Índice, Tríade, dominantes nem Próximos Passos; não vai para outro sistema pontuável. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Fúngico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### ESP-502 — Você faz suas refeições sozinho e com pressa?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 63 (Comunhão Consciente) (motor/bancos/espiritual.csv:17)») |
| fonte da justificativa | — |
| classificação da auditoria | C — contexto social/comportamental da refeição (sozinho e com pressa) pontua o Detox e Linfático; proveniência «Comunhão Consciente» não menciona o sistema; texto oficial D13 não cobre o tema |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v5) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — contexto social/comportamental da refeição (sozinho e com pressa) pontua o Detox e Linfático; proveniência «Comunhão Consciente» não menciona o sistema; texto oficial D13 não cobre o tema |
| observações | — |
| justificativa da decisão | Investiga contexto da refeição, ritmo, rotina e pertencimento, mas não há justificativa suficiente para alterar diretamente a nota do Sistema Detox + Linfático ou outro sistema físico. |
| regras da decisão | Aplicada no HOLOS-V1 v5: continua coletada; a associação com o sistema físico virou contextual (sem peso) e saiu da Tríade; não entra em denominador, score, Índice, Tríade, dominantes nem Próximos Passos; não vai para outro sistema pontuável. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Detox e Linfático) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v5 (versões anteriores imutáveis) |

### Físico → MEE (1)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-507 | Você consegue perceber quando está com fome e quando já está satisfeito? | Físico | Mental Emocional Espiritual | C |

#### SNT-507 — Você consegue perceber quando está com fome e quando já está satisfeito?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 91 (Trava da Desconexão Corpo-Mente) (motor/bancos/sintomas.csv:49)») |
| fonte da justificativa | — |
| classificação da auditoria | C — conteúdo corporal/interoceptivo (perceber fome e saciedade, bloco Físico) pontua o MEE; o texto oficial do MEE (D13) lista «sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal» e não cita sinais de fome/saciedade. Substituído no v3 por SNT-511 (não publicado) |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Metabólico** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Revisão prioritária — conteúdo corporal/interoceptivo (perceber fome e saciedade, bloco Físico) pontua o MEE; o texto oficial do MEE (D13) lista «sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal» e não cita sinais de fome/saciedade. Substituído no v3 por SNT-511 (não publicado) |
| observações | v3 (não publicado) substitui por SNT-511: «Você tem se sentido triste e insatisfeito com sua saúde como um todo?»; pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | Perceber fome e saciedade investiga diretamente fome/saciedade, domínio do Metabólico. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5); primária no sistema de destino, peso 1 preservado, Tríade Corpo; o sistema anterior não ficou como contexto; v2–v5 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Mental Emocional Espiritual para Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

### Outras associações cruzadas (0)

_Nenhuma pergunta C neste subgrupo._

## 6. GRUPO 3 — JUSTIFICATIVA AUSENTE (54 perguntas classificadas B)

Associações vigentes aprovadas **em bloco** (Decisões 4 e 7), sem justificativa escrita item a item. A auditoria não apontou risco específico para elas; **decisão fechada no HOLOS-V1 v6**: cada uma tem a decisão e a justificativa registradas na ficha (MANTER, MOVER, CONTEXTUAL ou REMOVER). Ficam agrupadas por sistema.

### Fúngico (8)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-102 | Sua barriga incha ou dá gases depois das refeições? | Físico | Fúngico | B |
| SNT-103 | Sua língua costuma ter uma camada esbranquiçada? | Físico | Fúngico | B |
| SNT-106 | Você sente coceira na região íntima ou anal? | Físico | Fúngico | B |
| SNT-107 | Sua cabeça fica pesada ou confusa depois de comer massa ou doce? | Físico | Fúngico | B |
| SNT-108 | Você tem caspa ou coceira no couro cabeludo com frequência? | Físico | Fúngico | B |
| SNT-109 | Você precisou tomar antibiótico ao longo da vida? | Físico | Fúngico | B |
| SNT-110 | Você passa mal com pouca bebida alcoólica? | Físico | Fúngico | B |
| SNT-111 | Você vive com nariz entupido ou sinusite? | Físico | Fúngico | B |

#### SNT-102 — Sua barriga incha ou dá gases depois das refeições?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:3)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Sua barriga incha/estufa ou fica com gases depois das refeições?» |
| justificativa da decisão | inchaço e gases depois das refeições são relato digestivo. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-103 — Sua língua costuma ter uma camada esbranquiçada?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:4)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Sua língua costuma ter uma camada esbranquiçada no dia a dia?» |
| justificativa da decisão | camada esbranquiçada na língua é relato de mucosa; não confirma fungo. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-106 — Você sente coceira na região íntima ou anal?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:7)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; substituído no v3 por SNT-112 (não publicado) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) substitui por SNT-112: «Você sente coceira no corpo sem motivo aparente?» |
| justificativa da decisão | coceira íntima ou anal é relato de pele/mucosa; não confirma condição. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-107 — Sua cabeça fica pesada ou confusa depois de comer massa ou doce?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:8)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | cabeça pesada depois de massa ou doce é relato alimentar/vitalidade ligado à refeição. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-108 — Você tem caspa ou coceira no couro cabeludo com frequência?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:9)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | caspa ou coceira no couro cabeludo é relato de pele. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-109 — Você precisou tomar antibiótico ao longo da vida?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:10)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; item de histórico de exposição («ao longo da vida») em escala de frequência |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Você precisou tomar antibióticos muitas vezes ao longo da vida?» |
| justificativa da decisão | Histórico de uso de antibiótico é informação de contexto (exposição ao longo da vida), não sinal atual; pontuar sugeriria mecanismo microbiológico. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Fúngico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-110 — Você passa mal com pouca bebida alcoólica?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:11)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sinal próximo de SNT-406 (álcool), que pontua outro sistema (Detox) |
| decisão metodológica | **DECISÃO APLICADA: REMOVER** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☐ CONTEXTUAL  ☒ **REMOVER** |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | Redundante com SNT-406 (reação ao álcool já pontua no Detox + Linfático) e, dentro do Fúngico, sugeriria causa microbiológica que o HOLOSCAN não demonstra. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5); fora das novas aplicações; v2–v5 imutáveis; nenhum histórico recalculado; sem item substituto. |
| decisão registrada | REMOVER · sem sistema de destino · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-111 — Você vive com nariz entupido ou sinusite?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:12)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | nariz entupido é relato de mucosa; a palavra sinusite é o termo comum da paciente e não é confirmada. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

### Ácido Inflamatório (7)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-201 | Você sente dor nas articulações mesmo sem ter feito esforço? | Físico | Ácido Inflamatório | B |
| SNT-202 | Você acorda com o corpo travado que leva um tempo para soltar? | Físico | Ácido Inflamatório | B |
| SNT-203 | Você sente o corpo dolorido sem causa clara? | Físico | Ácido Inflamatório | B |
| SNT-204 | Você sente azia ou queimação no estômago? | Físico | Ácido Inflamatório | B |
| SNT-205 | Você tem dor de cabeça mais de uma vez por semana? | Físico | Ácido Inflamatório | B |
| SNT-207 | Sua gengiva sangra ao escovar? | Físico | Ácido Inflamatório | B |
| SNT-208 | Você percebe que piora quando come ultraprocessado ou açúcar? | Físico | Ácido Inflamatório | B |

#### SNT-201 — Você sente dor nas articulações mesmo sem ter feito esforço?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:13)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | dor articular sem esforço é relato de dor. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-202 — Você acorda com o corpo travado que leva um tempo para soltar?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:14)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | rigidez ao acordar é relato de rigidez. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-203 — Você sente o corpo dolorido sem causa clara?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:15)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | corpo dolorido sem causa clara é relato de dor/desconforto. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-204 — Você sente azia ou queimação no estômago?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:16)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | azia ou queimação é relato de desconforto/irritação; não mede acidez corporal. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-205 — Você tem dor de cabeça mais de uma vez por semana?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:17)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; tema «dor» coberto pelo texto oficial D13 do Ácido Inflamatório |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | dor de cabeça frequente é relato de dor. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-207 — Sua gengiva sangra ao escovar?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:19)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Sua gengiva sangra ao escovar os dentes?» |
| justificativa da decisão | gengiva que sangra é relato de irritação de mucosa. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-208 — Você percebe que piora quando come ultraprocessado ou açúcar?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Ácido Inflamatório |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:20)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; redação revisada no v3 («as dores no corpo ou de cabeça pioram…») |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Ácido-Inflamatório)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Ácido Inflamatório: 16 → 15 itens pontuados; hoje o item move a nota do sistema em até 0,625 (0–10) com todos respondidos e o Índice em até 1,25 (0–100); cobertura mínima passaria de 13/16 para 12/15; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Ácido Inflamatório, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Ácido Inflamatório for 1ª/2ª área, na da paciente. |
| risco de interpretação | A auditoria (§6.3) anota que o enunciado pede ao paciente uma relação causal percebida («piora quando come…»); ficou B por ser relato do paciente; o v3 (não publicado) revisou a redação |
| observações | v3 (não publicado) reescreve o texto: «Você percebe que as dores no corpo ou de cabeça pioram quando come alimentos ultraprocessados ou açúcar?» |
| justificativa da decisão | piora percebida com ultraprocessados/açúcar é relato de reatividade percebida, não prova de inflamação. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Ácido-Inflamatório · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

### Metabólico (7)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-301 | Você fica com muito sono logo depois do almoço? | Físico | Metabólico | B |
| SNT-303 | Você sente fome de novo pouco tempo depois de ter comido? | Físico | Metabólico | B |
| SNT-304 | Você come depois do jantar mesmo sem fome real? | Físico | Metabólico | B |
| SNT-305 | Sua gordura se concentra na barriga? | Físico | Metabólico | B |
| SNT-306 | A pele do seu pescoço ou axila está mais escura e aveludada? | Físico | Metabólico | B |
| SNT-307 | Você fica irritado ou trêmulo se atrasa uma refeição? | Físico | Metabólico | B |
| SNT-308 | Você tem dificuldade de perder peso mesmo comendo pouco? | Físico | Metabólico | B |

#### SNT-301 — Você fica com muito sono logo depois do almoço?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:23)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Metabólico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Você sente muito sono logo depois do almoço?» |
| justificativa da decisão | sono depois do almoço é resposta percebida à refeição. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-303 — Você sente fome de novo pouco tempo depois de ter comido?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:25)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Metabólico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Você fica com fome de novo pouco tempo depois de ter comido?» |
| justificativa da decisão | fome pouco depois de comer é relato de fome/saciedade. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-304 — Você come depois do jantar mesmo sem fome real?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:26)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Metabólico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | comer depois do jantar sem fome é comportamento alimentar. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-305 — Sua gordura se concentra na barriga?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:27)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «O principal local em que a gordura se concentra no seu corpo é a região da barriga?» |
| justificativa da decisão | Distribuição de gordura é observação corporal que insinuaria diagnóstico metabólico; não é relato de energia, fome, saciedade ou comportamento alimentar. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Metabólico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-306 — A pele do seu pescoço ou axila está mais escura e aveludada?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:28)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «A pele do seu pescoço ou axila está mais escura e com textura mais grossa ou aveludada?» |
| justificativa da decisão | Pele escurecida e aveludada é sinal clínico que pede avaliação específica; pontuar insinuaria resistência à insulina. Fica como contexto para a profissional. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Metabólico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-307 — Você fica irritado ou trêmulo se atrasa uma refeição?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:29)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Metabólico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Você fica irritado, nervoso ou trêmulo se atrasa uma refeição?» |
| justificativa da decisão | irritação ou tremor ao atrasar refeição é resposta percebida à rotina alimentar. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-308 — Você tem dificuldade de perder peso mesmo comendo pouco?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Metabólico |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:30)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Metabólico: 14 → 13 itens pontuados; hoje o item move a nota do sistema em até 0,714 (0–10) com todos respondidos e o Índice em até 1,429 (0–100); cobertura mínima passaria de 12/14 para 11/13; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Metabólico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Metabólico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | Dificuldade percebida de perder peso não é relato direto de energia, fome, saciedade ou comportamento alimentar e insinuaria diagnóstico; fica como contexto. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Metabólico) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

### Detox e Linfático (10)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-401 | Você percebe inchaço nas pernas ou nos pés no fim do dia? | Físico | Detox e Linfático | B |
| SNT-402 | Seu rosto amanhece inchado? | Físico | Detox e Linfático | B |
| SNT-403 | Cheiros fortes te incomodam mais do que incomodam as outras pessoas? | Físico | Detox e Linfático | B |
| SNT-404 | Comida gordurosa te faz passar mal ou pesa muito? | Físico | Detox e Linfático | B |
| SNT-405 | Você passa um dia ou mais sem evacuar? | Físico | Detox e Linfático | B |
| SNT-406 | Uma taça já te dá ressaca no dia seguinte? | Físico | Detox e Linfático | B |
| SNT-407 | Você reage muito forte a medicamento ou a café? | Físico | Detox e Linfático | B |
| SNT-408 | Sua pele está opaca ou com olheiras marcadas? | Físico | Detox e Linfático | B |
| SNT-409 | Seu suor tem odor forte? | Físico | Detox e Linfático | B |
| SNT-410 | Você tem celulite acentuada? | Físico | Detox e Linfático | B |

#### SNT-401 — Você percebe inchaço nas pernas ou nos pés no fim do dia?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:33)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Detox + Linfático)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | inchaço nas pernas no fim do dia é retenção percebida. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Detox + Linfático · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-402 — Seu rosto amanhece inchado?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:34)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Detox + Linfático)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Seu rosto amanhece muito inchado logo ao acordar?» |
| justificativa da decisão | rosto inchado ao acordar é retenção percebida. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Detox + Linfático · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-403 — Cheiros fortes te incomodam mais do que incomodam as outras pessoas?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:35)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Detox + Linfático)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Cheiros fortes te incomodam mais do que geralmente incomodam as outras pessoas?» |
| justificativa da decisão | incômodo com cheiros fortes é sensibilidade relatada. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Detox + Linfático · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-404 — Comida gordurosa te faz passar mal ou pesa muito?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:36)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Fúngico** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Comida gordurosa te faz passar mal ou ter uma sensação de enjoo?» |
| justificativa da decisão | Desconforto digestivo depois de comida gordurosa é relato digestivo/alimentar (domínio do Fúngico); no Detox sugeriria função hepática, que o HOLOSCAN não mede. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5); primária no sistema de destino, peso 1 preservado, Tríade Corpo; o sistema anterior não ficou como contexto; v2–v5 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Detox e Linfático para Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-405 — Você passa um dia ou mais sem evacuar?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:37)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Detox + Linfático)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | ficar um dia ou mais sem evacuar é relato de eliminação/funcionamento intestinal. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Detox + Linfático · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-406 — Uma taça já te dá ressaca no dia seguinte?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:38)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sinal próximo de SNT-110 (álcool), que pontua outro sistema (Fúngico) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Detox + Linfático)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Uma quantidade pequena de bebida alcoólica (ex.: 1 a 2 taças de vinho ou cerveja) já te dá ressaca no dia seguinte?» |
| justificativa da decisão | ressaca com pouca bebida é reação relatada ao álcool; não mede função hepática. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Detox + Linfático · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-407 — Você reage muito forte a medicamento ou a café?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:39)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Detox + Linfático)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Você tem fortes reações a medicamentos ou a café?» |
| justificativa da decisão | reação forte a medicamento ou café é sensibilidade relatada. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Detox + Linfático · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-408 — Sua pele está opaca ou com olheiras marcadas?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:40)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | Pele opaca e olheiras têm muitas explicações (sono, rotina); no Detox sugeririam toxinas. Fica como contexto. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Detox e Linfático) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-409 — Seu suor tem odor forte?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:41)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Seu suor tem um odor forte?» |
| justificativa da decisão | Odor do suor no Detox sugeriria eliminação de toxinas, que o HOLOSCAN não mede. Fica como contexto. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Detox e Linfático) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-410 — Você tem celulite acentuada?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | intensidade 0–3 |
| orientação | direta |
| sistema primário atual | Detox e Linfático |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:42)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; substituído no v3 por SNT-411 (não publicado) |
| decisão metodológica | **DECISÃO APLICADA: CONTEXTUAL (sem pontuação)** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☐ MOVER  ☒ **CONTEXTUAL**  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Detox e Linfático: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Detox e Linfático, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Detox e Linfático for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) substitui por SNT-411: «Você costuma sentir gosto metálico na boca?» |
| justificativa da decisão | Celulite no Detox sugeriria alteração linfática, que o HOLOSCAN não mede. Fica como contexto. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5): continua coletada; a associação virou contextual (sem peso) e saiu da Tríade; não entra em denominador, nota, Índice, Tríade, dominantes, prioridade nem Próximos Passos; relato da paciente, sem confirmar condição. |
| decisão registrada | CONTEXTUAL · sem pontuação (era primária de Detox e Linfático) · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

### Mental Emocional Espiritual (22)

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-502 | Você demora a dormir porque a cabeça não desliga? | Físico | Mental Emocional Espiritual | B |
| SNT-503 | Você acorda de madrugada e custa a voltar a dormir? | Físico | Mental Emocional Espiritual | B |
| SNT-504 | Você se preocupa muito com coisas que ainda nem aconteceram? | Físico | Mental Emocional Espiritual | B |
| SNT-505 | Você come para se acalmar quando fica ansioso ou triste? | Físico | Mental Emocional Espiritual | B |
| SNT-506 | Você sente que está sempre em alerta esperando algo dar errado? | Físico | Mental Emocional Espiritual | B |
| SNT-508 | Você tem dificuldade de manter o foco em uma tarefa? | Físico | Mental Emocional Espiritual | B |
| SNT-509 | Você perde a paciência com facilidade? | Físico | Mental Emocional Espiritual | B |
| SNT-510 | Você tem se afastado das pessoas? | Físico | Mental Emocional Espiritual | B |
| EMO-501 | Você fala consigo mesmo de um jeito que não falaria com um amigo? | Mental/Emocional | Mental Emocional Espiritual | B |
| EMO-502 | Quando você sai da linha um dia você sente que perdeu tudo e abandona? | Mental/Emocional | Mental Emocional Espiritual | B |
| EMO-503 | Você se descreve com frases como sempre fui assim ou não tenho força de vontade? | Mental/Emocional | Mental Emocional Espiritual | B |
| EMO-504 | Você sente culpa ou vergonha depois de comer? | Mental/Emocional | Mental Emocional Espiritual | B |
| EMO-505 | Você sente que seu corpo trabalha contra você? | Mental/Emocional | Mental Emocional Espiritual | B |
| EMO-507 | Você olha para sua vida hoje e se reconhece nela? | Mental/Emocional | Mental Emocional Espiritual | B |
| ESP-102 | Você sabe dizer o que veio fazer nesta vida? | Espiritual | Mental Emocional Espiritual | B |
| ESP-201 | Suas escolhas alimentares combinam com aquilo que você diz valorizar? | Espiritual | Mental Emocional Espiritual | B |
| ESP-202 | Você tem clareza sobre o que é inegociável para você? | Espiritual | Mental Emocional Espiritual | B |
| ESP-301 | Você sente que existe algo maior te sustentando? | Espiritual | Mental Emocional Espiritual | B |
| ESP-302 | Você reserva um momento do dia para agradecer alguma coisa? | Espiritual | Mental Emocional Espiritual | B |
| ESP-401 | Você sente que não merece as coisas boas que conquista? | Espiritual | Mental Emocional Espiritual | B |
| ESP-402 | Quando as coisas começam a dar certo você acaba boicotando? | Espiritual | Mental Emocional Espiritual | B |
| ESP-403 | Você repete sobre si mesmo histórias que ouviu na família e nunca questionou? | Espiritual | Mental Emocional Espiritual | B |

#### SNT-502 — Você demora a dormir porque a cabeça não desliga?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:44)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sono: tema citado no texto oficial D13 do MEE; bloco Físico (Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | demora a dormir porque a cabeça não desliga (pensamento acelerado). |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-503 — Você acorda de madrugada e custa a voltar a dormir?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:45)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sono: tema citado no texto oficial D13 do MEE; bloco Físico (Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | v3 (não publicado) reescreve o texto: «Você acorda de madrugada e tem dificuldade de voltar a dormir?» |
| justificativa da decisão | despertar de madrugada com dificuldade de voltar a dormir (sono/alerta previsto no MEE). |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-504 — Você se preocupa muito com coisas que ainda nem aconteceram?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:46)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo mental no bloco Físico (conta na Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | preocupação antecipatória. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-505 — Você come para se acalmar quando fica ansioso ou triste?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 90 (Trava do Trauma Alimentar) (motor/bancos/sintomas.csv:47)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo emocional no bloco Físico (conta na Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | comer para se acalmar é comportamento alimentar ligado ao estado emocional (mesma lógica de EMO-301/303). |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-506 — Você sente que está sempre em alerta esperando algo dar errado?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:48)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo mental no bloco Físico (conta na Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | estado de alerta constante. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-508 — Você tem dificuldade de manter o foco em uma tarefa?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:50)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo mental no bloco Físico (conta na Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | dificuldade de foco. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-509 — Você perde a paciência com facilidade?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:51)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo emocional no bloco Físico (conta na Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | perda de paciência (regulação emocional). |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-510 — Você tem se afastado das pessoas?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:52)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo relacional no bloco Físico (conta na Tríade Corpo) |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status B). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | afastamento das pessoas (conexão/pertencimento). |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### EMO-501 — Você fala consigo mesmo de um jeito que não falaria com um amigo?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 92 (Reparentalização Nutricional) (motor/bancos/emocoes.csv:15)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | diálogo interno autocrítico. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### EMO-502 — Quando você sai da linha um dia você sente que perdeu tudo e abandona?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 89 (Trava da Perfeição) (motor/bancos/emocoes.csv:16)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **CONTEXTUAL MANTIDO (Metabólico)** (HOLOS-V1 v5) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Metabólico — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Quando você “sai da linha” na alimentação programada em um dia, sente que perdeu tudo e abandona?» |
| justificativa da decisão | Associação contextual com o Sistema Metabólico mantida, sem pontuação metabólica. |
| regras da decisão | Registrada no HOLOS-V1 v5; continua secondary_contextual sem peso. Contextual não pontua e não implica causalidade. |
| decisão registrada | CONTEXTUAL MANTIDO · Metabólico, sem pontuação · Rodrigo · decidida em 13/10/2026 · **CONTEXTUAL MANTIDO** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### EMO-503 — Você se descreve com frases como sempre fui assim ou não tenho força de vontade?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 89 (Trava da Identidade Limitante) (motor/bancos/emocoes.csv:17)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | crenças fixas sobre si. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### EMO-504 — Você sente culpa ou vergonha depois de comer?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 4) |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 90 (Trava do Trauma Alimentar) (motor/bancos/emocoes.csv:18)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **CONTEXTUAL MANTIDO (Metabólico)** (HOLOS-V1 v5) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Metabólico — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 4 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | Associação contextual com o Sistema Metabólico mantida, sem pontuação metabólica. |
| regras da decisão | Registrada no HOLOS-V1 v5; continua secondary_contextual sem peso. Contextual não pontua e não implica causalidade. |
| decisão registrada | CONTEXTUAL MANTIDO · Metabólico, sem pontuação · Rodrigo · decidida em 13/10/2026 · **CONTEXTUAL MANTIDO** no HOLOS-V1 v5 (versões anteriores imutáveis) |

#### EMO-505 — Você sente que seu corpo trabalha contra você?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 91 (Trava da Desconexão Corpo-Mente) (motor/bancos/emocoes.csv:19)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | percepção de conflito com o próprio corpo. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### EMO-507 — Você olha para sua vida hoje e se reconhece nela?

| campo | conteúdo |
|---|---|
| bloco | Mental/Emocional |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «material 11/08 (padrão do Mental-Emocional: desconexão de si) (motor/bancos/emocoes.csv:20)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Mente: 19 → 18 itens (hoje o item move essa Tríade em até 0,526). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | reconhecer-se na própria vida (identidade). |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-102 — Você sabe dizer o que veio fazer nesta vida?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | intensidade 0–3 |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 57 (Reconexão com o Propósito) (motor/bancos/espiritual.csv:3)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; removido no v3 (revisão: «muito ampla, ambígua para interpretação»); a negação é de redação, não de vínculo |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) remove: «negada na revisão: muito ampla, ambígua para interpretação»; pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | sentido e propósito. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-201 — Suas escolhas alimentares combinam com aquilo que você diz valorizar?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 54 (A Nutrição como Expressão de Propósito e Valores) (motor/bancos/espiritual.csv:5)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | coerência entre escolhas e valores. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-202 — Você tem clareza sobre o que é inegociável para você?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | intensidade 0–3 |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 57 (Clarificação de Valores) (motor/bancos/espiritual.csv:6)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | clareza de valores e limites. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-301 — Você sente que existe algo maior te sustentando?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | intensidade 0–3 |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 38 (O Pilar Espiritual) (motor/bancos/espiritual.csv:8)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | sensação de sustentação/sentido. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-302 — Você reserva um momento do dia para agradecer alguma coisa?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | invertida |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 60 (Gratidão Consciente) (motor/bancos/espiritual.csv:9)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (invertida: resposta ≤ 2) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | pergunta invertida (resposta baixa = carga) |
| justificativa da decisão | prática de gratidão. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-401 — Você sente que não merece as coisas boas que conquista?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 86 (Investigação de Crenças Limitantes) (motor/bancos/espiritual.csv:11)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | merecimento. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-402 — Quando as coisas começam a dar certo você acaba boicotando?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 89 (travas mentais e emocionais) (motor/bancos/espiritual.csv:12)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | v3 (não publicado) reescreve o texto: «Quando as coisas começam a dar certo, você acaba se autossabotando ou boicotando?» |
| justificativa da decisão | autossabotagem. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### ESP-403 — Você repete sobre si mesmo histórias que ouviu na família e nunca questionou?

| campo | conteúdo |
|---|---|
| bloco | Espiritual |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | — |
| justificativa metodológica documentada | Justificativa não documentada (proveniência histórica: «livro p. 91 (Biografia Consciente) (motor/bancos/espiritual.csv:13)») |
| fonte da justificativa | — |
| classificação da auditoria | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Mental-Emocional-Espiritual)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | a decidir |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Espírito: 16 → 15 itens (hoje o item move essa Tríade em até 0,625). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria (associação sem justificativa escrita) |
| observações | — |
| justificativa da decisão | narrativas familiares sobre si. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Mental-Emocional-Espiritual · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

## 7. GRUPO 4 — JÁ SUSTENTADAS (2 perguntas classificadas A)

Associação decidida nominalmente pelas Decisões 5 e 6. Mesmo assim, o campo "Justificativa" da decisão diz só "Decisão metodológica V1 encerrada pela liderança do método", sem fundamento clínico escrito. Decisão fechada no HOLOS-V1 v6 (ver a ficha).

| id | texto | bloco | sistema atual | status |
|---|---|---|---|---|
| SNT-101 | Você sente vontade forte de doce ou pão quase todo dia? | Físico | Fúngico | A |
| SNT-501 | Você acorda cansado mesmo dormindo as horas necessárias? | Físico | Mental Emocional Espiritual | A |

#### SNT-101 — Você sente vontade forte de doce ou pão quase todo dia?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Fúngico |
| peso atual | 1 |
| associação contextual atual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 5) |
| justificativa metodológica documentada | Decisão explícita do item: «"Você sente vontade forte de doce ou pão quase todo dia?" Primário: **Sistema Fúngico**, peso 1. Metabólico como `secondary_contextual`, sem contribuição» — `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md` (Decisão 5). Campo Justificativa da decisão: «Decisão metodológica V1 encerrada pela liderança do método» — `docs/v1/metodologia/PACOTE-DECISAO-HUMANA-V1.md` (sem fundamento clínico escrito) |
| fonte da justificativa | docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md; docs/v1/metodologia/PACOTE-DECISAO-HUMANA-V1.md; Decisão 5 |
| classificação da auditoria | A — decisão nominal do vínculo deste item |
| decisão metodológica | **DECISÃO APLICADA: MANTER (Fúngico)** (HOLOS-V1 v6) |
| opções | ☒ **MANTER**  ☐ MOVER  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Metabólico — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 5 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Fúngico: 15 → 14 itens pontuados; hoje o item move a nota do sistema em até 0,667 (0–10) com todos respondidos e o Índice em até 1,333 (0–100); cobertura mínima passaria de 12/15 para 12/14; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Fúngico, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Fúngico for 1ª/2ª área, na da paciente. |
| risco de interpretação | Sem risco específico apontado na auditoria |
| observações | v3 (não publicado) reescreve o texto: «Você sente uma forte vontade de ingerir doces ou pães quase todo dia?» |
| justificativa da decisão | vontade frequente de doce/pão é relato alimentar (hábito e preferência); contextual no Metabólico mantido, sem pontuar. |
| regras da decisão | Registrada no HOLOS-V1 v6; nada muda na associação (peso 1). O conteúdo da pergunta investiga o domínio do sistema. |
| decisão registrada | MANTER · Fúngico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

#### SNT-501 — Você acorda cansado mesmo dormindo as horas necessárias?

| campo | conteúdo |
|---|---|
| bloco | Físico |
| escala | frequência 0–3 (Nunca/Às vezes/Frequente/Sempre) |
| orientação | direta |
| sistema primário atual | Mental Emocional Espiritual |
| peso atual | 1 |
| associação contextual atual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 6) |
| justificativa metodológica documentada | Decisão explícita do item: «"Você acorda cansado mesmo dormindo as horas necessárias?" Primário: **Sistema Mental Emocional Espiritual**, peso 1. Metabólico como `secondary_contextual`, sem contribuição» — `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md` (Decisão 6). Campo Justificativa: «Decisão metodológica V1 encerrada pela liderança do método» — `PACOTE-DECISAO-HUMANA-V1.md` (sem fundamento clínico escrito) |
| fonte da justificativa | docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md; PACOTE-DECISAO-HUMANA-V1.md; Decisão 6 |
| classificação da auditoria | A — decisão nominal do vínculo deste item |
| decisão metodológica | **DECISÃO APLICADA: MOVER → Metabólico** (HOLOS-V1 v6) |
| opções | ☐ MANTER  ☒ **MOVER**  ☐ CONTEXTUAL  ☐ REMOVER |
| sistema alternativo possível | Metabólico — já consta como associação contextual vigente, sem pontuação (pacote v2: Etapa 4.2 — Decisão 6 (decisao metodologica V1 fechada)) |
| impacto se deixar de pontuar | Mental Emocional Espiritual: 24 → 23 itens pontuados; hoje o item move a nota do sistema em até 0,417 (0–10) com todos respondidos e o Índice em até 0,833 (0–100); cobertura mínima passaria de 20/24 para 19/23; Tríade Corpo: 49 → 48 itens (hoje o item move essa Tríade em até 0,204). Resultados v2 já salvos não mudam. |
| pode aparecer como sinal dominante hoje? | Sim — em Mental Emocional Espiritual, quando contribui > 0 (resposta ≥ 1) e está entre as 3 maiores contribuições do sistema; texto da pergunta aparece na visão profissional e, se Mental Emocional Espiritual for 1ª/2ª área, na da paciente. |
| risco de interpretação | Pergunta do bloco Físico (conta na Tríade Corpo) pontuando o Mental Emocional Espiritual; a auditoria não apontou risco causal específico (status A). Ver pergunta 8 da auditoria (Tríade por bloco). |
| observações | — |
| justificativa da decisão | Acordar cansado mesmo dormindo o suficiente é relato de energia (domínio do Metabólico); sono/alerta no MEE fica com as perguntas de pensamento acelerado e despertar. |
| regras da decisão | Aplicada no HOLOS-V1 v6 (a partir da v5); primária no sistema de destino, peso 1 preservado, Tríade Corpo; o sistema anterior não ficou como contexto; v2–v5 imutáveis; nenhum histórico recalculado. |
| decisão registrada | MOVER · de Mental Emocional Espiritual para Metabólico · Rodrigo · decidida em 13/10/2026 · **DECISÃO APLICADA** no HOLOS-V1 v6 (versões anteriores imutáveis) |

## 8. Resumo para a homologação

### 8.1 Contagem A/B/C/D

| status | perguntas |
|---|---|
| A | 2 |
| B | 54 |
| C | 26 |
| D | 2 |
| **total** | **84** |

### 8.2 Contagem por sistema primário

| sistema | total | A | B | C | D |
|---|---|---|---|---|---|
| Fúngico | 15 | 1 | 8 | 6 | 0 |
| Ácido Inflamatório | 16 | 0 | 7 | 8 | 1 |
| Metabólico | 14 | 0 | 7 | 6 | 1 |
| Detox e Linfático | 15 | 0 | 10 | 5 | 0 |
| Mental Emocional Espiritual | 24 | 1 | 22 | 1 | 0 |

### 8.3 Associações cruzadas (bloco × sistema)

**31 perguntas** pontuam um sistema de natureza diferente do seu bloco:

| tipo | quantidade | perguntas | status |
|---|---|---|---|
| Mental/Emocional ou Espiritual → sistema físico | 21 | EMO-101, EMO-102, EMO-103, EMO-201, EMO-202, EMO-203, EMO-204, EMO-301, EMO-302, EMO-303, EMO-401, EMO-402, EMO-403, ESP-101, ESP-103, ESP-203, ESP-303, ESP-404, ESP-405, ESP-501, ESP-502 | todas C |
| Físico (Tríade Corpo) → Mental Emocional Espiritual | 10 | SNT-501, SNT-502, SNT-503, SNT-504, SNT-505, SNT-506, SNT-507, SNT-508, SNT-509, SNT-510 | SNT-501 A, SNT-502 B, SNT-503 B, SNT-504 B, SNT-505 B, SNT-506 B, SNT-507 C, SNT-508 B, SNT-509 B, SNT-510 B |

Além disso, **11 perguntas** têm uma associação `secondary_contextual` vigente, sem pontuação: SNT-101, SNT-501, EMO-101, EMO-103, EMO-201, EMO-203, EMO-301, EMO-302, EMO-402, EMO-502, EMO-504.

### 8.4 Perguntas com maior risco interpretativo

São os conflitos diretos (D) e os itens que a auditoria marcou como capazes de induzir leitura causal ou diagnóstica (§6.3):

| id | texto | sistema | status | risco |
|---|---|---|---|---|
| SNT-210 | Seus exames costumam mostrar PCR ou VHS acima do normal? | Ácido Inflamatório | D | ALTO — dado laboratorial relatado pontua o Resultado HOLOS (conflito com a decisão de que exames não participam do resultado) |
| SNT-309 | Seus exames costumam mostrar triglicerídeos altos ou HDL baixo? | Metabólico | D | ALTO — dado laboratorial relatado pontua o Resultado HOLOS (conflito com a decisão de que exames não participam do resultado) |
| EMO-103 | Você sente um peso para sair do lugar mesmo querendo mudar? | Fúngico | C | Revisão prioritária — conteúdo emocional («peso para sair do lugar») pontua o Fúngico; a associação pode sugerir ao leitor uma relação entre estado emocional e um eixo de nome fúngico; vínculo vem do padrão legado do Fúngico (rascunho). Já tem MEE como contextual (não pontua) |
| ESP-501 | Você passa algum tempo em contato com a natureza? | Fúngico | C | Revisão prioritária — hábito ambiental/espiritual (contato com a natureza, invertida) pontua o Fúngico; a proveniência registrada («alimentação como ato sagrado») não menciona o Fúngico; o texto oficial D13 do Fúngico não cobre o tema; a associação pode sugerir causalidade («pouco contato com a natureza» elevando um eixo fúngico) |
| ESP-404 | Você acredita que para ter saúde precisa sofrer ou se privar? | Ácido Inflamatório | C | Revisão prioritária — crença («para ter saúde precisa sofrer») pontua o Ácido Inflamatório; redação + eixo podem sugerir causalidade; a revisão pública negou o item «por estar no Sistema Ácido Inflamatório» e a decisão de 12/10 (DECISOES-V1 item 183) o move para o MEE no v3 (não publicado); no v2 o vínculo continua |
| EMO-203 | Você costuma aceitar o que não quer para evitar conflito? | Ácido Inflamatório | C | Revisão prioritária — conteúdo emocional/relacional pontua o Ácido Inflamatório; a proveniência registrada é «impacto espiritual: bloqueio no plexo solar», expressão que a Decisão 13 retirou do conteúdo oficial como termo causal («"bloqueio no plexo solar" … saem do conteúdo oficial»); a associação continua |
| EMO-204 | Você engole o que gostaria de dizer para não criar problema? | Ácido Inflamatório | C | Revisão prioritária — conteúdo emocional/relacional pontua o Ácido Inflamatório; proveniência «impacto espiritual: bloqueio no plexo solar» (termo retirado do conteúdo oficial pela Decisão 13); a associação continua |
| EMO-401 | Você se pega remoendo uma mágoa antiga? | Detox e Linfático | C | Revisão prioritária — conteúdo emocional (mágoa) pontua o Detox e Linfático; texto oficial D13 do Detox cita «inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias»; vínculo vem do padrão legado «acúmulo de mágoas» (rascunho); pode sugerir leitura causal emoção→eliminação |
| ESP-405 | Você carrega o peso de não ter conseguido perdoar alguém? | Detox e Linfático | C | Revisão prioritária — conteúdo espiritual/relacional (perdão) pontua o Detox e Linfático; padrão legado «acúmulo de mágoas»; texto oficial D13 não cobre o tema; pode sugerir leitura causal |
| SNT-104 | Você tem candidíase ou sapinho com frequência? | Fúngico | C | Revisão prioritária — enunciado nomeia uma condição («candidíase») que o texto oficial do próprio sistema diz não diagnosticar («Não diagnostica candidíase, infecção fúngica…», D13); o termo «candid» está na lista de linguagem proibida do Fúngico em `sistemas-fechamento.js`, mas o enunciado pode aparecer literal como sinal dominante (§6.4 e §7.5) |
| SNT-105 | Você tem micose de pele ou unha que volta sempre? | Fúngico | C | Revisão prioritária — enunciado nomeia micose (infecção fúngica de pele/unha) num eixo cujo texto oficial diz «Não diagnostica … infecção fúngica» (D13); leitura diagnóstica possível |
| SNT-206 | Sua pele tem crises de acne inflamada, eczema ou psoríase? | Ácido Inflamatório | C | Revisão prioritária — enunciado nomeia diagnósticos dermatológicos («acne inflamada, eczema ou psoríase») num eixo cujo texto oficial diz «O eixo não diagnostica inflamação» (D13); leitura diagnóstica possível |
| SNT-208 | Você percebe que piora quando come ultraprocessado ou açúcar? | Ácido Inflamatório | B | A auditoria (§6.3) anota que o enunciado pede ao paciente uma relação causal percebida («piora quando come…»); ficou B por ser relato do paciente; o v3 (não publicado) revisou a redação |

### 8.5 Perguntas clínicas / laboratoriais

O enunciado menciona exame laboratorial, condição nomeada ou uso de medicamento:

| id | texto | sistema | status | o que o enunciado menciona |
|---|---|---|---|---|
| SNT-210 | Seus exames costumam mostrar PCR ou VHS acima do normal? | Ácido Inflamatório | D | exame laboratorial relatado (PCR/VHS) |
| SNT-309 | Seus exames costumam mostrar triglicerídeos altos ou HDL baixo? | Metabólico | D | exame laboratorial relatado (triglicerídeos/HDL) |
| SNT-104 | Você tem candidíase ou sapinho com frequência? | Fúngico | C | condição nomeada (candidíase) |
| SNT-105 | Você tem micose de pele ou unha que volta sempre? | Fúngico | C | condição nomeada (micose) |
| SNT-206 | Sua pele tem crises de acne inflamada, eczema ou psoríase? | Ácido Inflamatório | C | condições nomeadas (acne inflamada, eczema, psoríase) |
| SNT-111 | Você vive com nariz entupido ou sinusite? | Fúngico | B | condição nomeada (sinusite) |
| SNT-109 | Você precisou tomar antibiótico ao longo da vida? | Fúngico | B | histórico de medicamento (antibiótico) |

### 8.6 Situação final

**Matriz fechada: as 84 perguntas têm decisão (0 EM ABERTO).**

| versão | decisões |
|---|---|
| HOLOS-V1 v4 | SNT-210 e SNT-309 REMOVER; 13 EMO MOVER para o MEE |
| HOLOS-V1 v5 (Lote 2B) | ESP-101, 103, 203, 404, 405 MOVER para o MEE; ESP-303 MANTER; ESP-501, ESP-502 CONTEXTUAL; EMO-502, EMO-504 CONTEXTUAL MANTIDO |
| HOLOS-V1 v6 (fechamento das 61) | SNT-110 REMOVER; SNT-404 MOVER para o Fúngico; SNT-501 e SNT-507 MOVER para o Metabólico; SNT-104, 105, 109, 206, 305, 306, 308, 408, 409, 410 CONTEXTUAL; 47 MANTER |

**Regras metodológicas registradas na v6:**
- "Uma relação holística, simbólica ou contextual entre emoção e corpo não é suficiente, por si só, para justificar que uma resposta mental/emocional altere matematicamente a nota de um sistema físico."
- "O bloco de origem da pergunta não define automaticamente o sistema. A associação precisa ser sustentada pelo conteúdo investigado."
- "Associação contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade."
- "Pergunta pode ser útil ao cuidado integral sem necessariamente pontuar um sistema."
- "Quando uma informação for relevante, mas não houver justificativa suficiente para alterar matematicamente um sistema, preferir CONTEXTUAL a inventar uma associação pontuável."
- "O HOLOSCAN pode registrar relato informado pela paciente, mas não pode confirmar condição, etiologia ou mecanismo."

**Pontos que ficam como observação (não bloqueiam a v6):**
- O Detox e Linfático fica com 6 itens pontuáveis (o menor sistema): 5/6 respondidos (83%) mantém a nota; 4/6 não. Se quiserem mais itens, eles entram numa versão seguinte, com perguntas novas.
- O nome "Fúngico" continua (nomenclatura autoral do método); a definição oficial diz o que ele organiza e o que não mede.
- Os textos oficiais dos sistemas no pacote v6 foram alinhados ao que pontua (o Metabólico não cita mais exames nem achados laboratoriais; Fúngico, Ácido Inflamatório e Detox não citam mais pele): `docs/v1/ALTERACOES-PACOTE-HOLOSCAN-V6.md` §4A.
- O PP-V2 não foi iniciado. O PP-V1 (30 regras) não mudou.
