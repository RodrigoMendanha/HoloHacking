# COMPARATIVO HOLOSCAN — HOLOS-V1 v5 × v6 (cinco casos contrastantes)

Gerado por `scripts/comparar-v5-v6.mjs` (determinístico; `--check` no teste). A v6 fecha as 61 perguntas que estavam em aberto na matriz (13/10/2026):
- removida: SNT-110;
- mudam de sistema: SNT-404 (Detox → Fúngico), SNT-501 e SNT-507 (MEE → Metabólico);
- passam a ser só contextuais: SNT-104, SNT-105, SNT-109 (Fúngico), SNT-206 (Ácido-Inflamatório), SNT-305, SNT-306, SNT-308 (Metabólico), SNT-408, SNT-409, SNT-410 (Detox);
- as outras ficam como estavam.

Cada caso tem carga máxima nos itens do tema e carga 0 no resto (respostas fictícias). Notas, Índice e Tríade vêm do `MotorMetodologico.calcular`. Os sinais dominantes seguem `resultado_holos_dominantes` (MR-V1). As ferramentas vêm de `ProximosPassos.selecionar` sobre as 30 regras do PP-V1. As contextuais respondidas aparecem à parte e não contribuem para nada.

## Caso A — digestivo / alimentar

**Leitura humana esperada:** Relatos digestivos e de vontade de doce/pão. Espera-se Fúngico em 1º (digestivo/alimentar) e Ácido-Inflamatório em 2º (azia, piora com ultraprocessado). Candidíase (SNT-104) e antibiótico (SNT-109) só aparecem como contexto.

| | v5 | v6 |
|---|---|---|
| Fúngico (nota · itens) | 4,5 · 11 | 3,8 · 8 |
| Ácido Inflamatório (nota · itens) | 7,8 · 9 | 7,5 · 8 |
| Metabólico (nota · itens) | 10,0 · 8 | 10,0 · 7 |
| Detox e Linfático (nota · itens) | 9,0 · 10 | 10,0 · 6 |
| Mental Emocional Espiritual (nota · itens) | 10,0 · 42 | 10,0 · 40 |
| **Índice** | 82,6 | 82,5 |
| Tríade Corpo / Mente / Espírito | 8,1 / 10,0 / 10,0 | 8,1 / 10,0 / 10,0 |
| 1ª / 2ª área | Fúngico / Ácido Inflamatório | Fúngico / Ácido Inflamatório |
| PP-V1 (principal · complementares) | Mapa da Rotina · Linha do Momentum · Gatilhos & Respostas | Mapa da Rotina · Linha do Momentum · Gatilhos & Respostas |

**v6 — pontuou (sinais dominantes das duas primeiras áreas):**

- 1ª Fúngico: SNT-101 “Você sente vontade forte de doce ou pão quase todo dia?”; SNT-102 “Sua barriga incha ou dá gases depois das refeições?”; SNT-103 “Sua língua costuma ter uma camada esbranquiçada?”
- 2ª Ácido Inflamatório: SNT-204 “Você sente azia ou queimação no estômago?”; SNT-208 “Você percebe que piora quando come ultraprocessado ou açúcar?”

**v6 — contexto, sem pontuar (contextuais com carga > 0):** SNT-101 → Metabólico; SNT-104 → Fúngico; SNT-109 → Fúngico

## Caso B — dor / rigidez / reatividade

**Leitura humana esperada:** Dor, rigidez e reatividade a cheiros, café e medicamento. Espera-se Ácido-Inflamatório em 1º e Detox (reatividade) em 2º. Acne/eczema/psoríase (SNT-206) é só contexto.

| | v5 | v6 |
|---|---|---|
| Fúngico (nota · itens) | 10,0 · 11 | 10,0 · 8 |
| Ácido Inflamatório (nota · itens) | 3,3 · 9 | 3,8 · 8 |
| Metabólico (nota · itens) | 10,0 · 8 | 10,0 · 7 |
| Detox e Linfático (nota · itens) | 8,0 · 10 | 6,7 · 6 |
| Mental Emocional Espiritual (nota · itens) | 10,0 · 42 | 10,0 · 40 |
| **Índice** | 82,7 | 80,8 |
| Tríade Corpo / Mente / Espírito | 8,3 / 10,0 / 10,0 | 8,1 / 10,0 / 10,0 |
| 1ª / 2ª área | Ácido Inflamatório / Detox e Linfático | Ácido Inflamatório / Detox e Linfático |
| PP-V1 (principal · complementares) | Mapa da Rotina · Linha do Momentum · Gatilhos & Respostas | Mapa da Rotina · Linha do Momentum · Gatilhos & Respostas |

**v6 — pontuou (sinais dominantes das duas primeiras áreas):**

- 1ª Ácido Inflamatório: SNT-201 “Você sente dor nas articulações mesmo sem ter feito esforço?”; SNT-202 “Você acorda com o corpo travado que leva um tempo para soltar?”; SNT-203 “Você sente o corpo dolorido sem causa clara?”
- 2ª Detox e Linfático: SNT-403 “Cheiros fortes te incomodam mais do que incomodam as outras pessoas?”; SNT-407 “Você reage muito forte a medicamento ou a café?”

**v6 — contexto, sem pontuar (contextuais com carga > 0):** SNT-206 → Ácido Inflamatório

## Caso C — fome / energia / refeição

**Leitura humana esperada:** Fome, saciedade, sono depois do almoço, cansaço ao acordar e comer sem pausa. Espera-se Metabólico em 1º. Gordura na barriga (SNT-305) e dificuldade de perder peso (SNT-308) são só contexto; culpa depois de comer (EMO-504) pontua no MEE e é contexto no Metabólico.

| | v5 | v6 |
|---|---|---|
| Fúngico (nota · itens) | 10,0 · 11 | 10,0 · 8 |
| Ácido Inflamatório (nota · itens) | 10,0 · 9 | 10,0 · 8 |
| Metabólico (nota · itens) | 1,3 · 8 | 0,0 · 7 |
| Detox e Linfático (nota · itens) | 10,0 · 10 | 10,0 · 6 |
| Mental Emocional Espiritual (nota · itens) | 9,3 · 42 | 9,8 · 40 |
| **Índice** | 81,1 | 79,5 |
| Tríade Corpo / Mente / Espírito | 8,3 / 9,5 / 9,3 | 8,3 / 9,5 / 9,3 |
| 1ª / 2ª área | Metabólico / Mental Emocional Espiritual | Metabólico / Mental Emocional Espiritual |
| PP-V1 (principal · complementares) | Mapa da Rotina · PQQ · Gatilhos & Respostas | Mapa da Rotina · PQQ · Gatilhos & Respostas |

**v6 — pontuou (sinais dominantes das duas primeiras áreas):**

- 1ª Metabólico: ESP-303 “Você começa a comer sem fazer nenhuma pausa antes?”; SNT-301 “Você fica com muito sono logo depois do almoço?”; SNT-303 “Você sente fome de novo pouco tempo depois de ter comido?”
- 2ª Mental Emocional Espiritual: EMO-504 “Você sente culpa ou vergonha depois de comer?”

**v6 — contexto, sem pontuar (contextuais com carga > 0):** EMO-504 → Metabólico; SNT-305 → Metabólico; SNT-308 → Metabólico

## Caso D — eliminação / retenção / intestinal

**Leitura humana esperada:** Inchaço de pernas e rosto, intestino preso, ressaca com pouco álcool. Espera-se Detox e Linfático em 1º. Pele opaca, suor e celulite (SNT-408/409/410) e refeições com pressa (ESP-502) são só contexto.

| | v5 | v6 |
|---|---|---|
| Fúngico (nota · itens) | 10,0 · 11 | 10,0 · 8 |
| Ácido Inflamatório (nota · itens) | 10,0 · 9 | 10,0 · 8 |
| Metabólico (nota · itens) | 10,0 · 8 | 10,0 · 7 |
| Detox e Linfático (nota · itens) | 3,0 · 10 | 3,3 · 6 |
| Mental Emocional Espiritual (nota · itens) | 10,0 · 42 | 10,0 · 40 |
| **Índice** | 86,0 | 86,7 |
| Tríade Corpo / Mente / Espírito | 8,5 / 10,0 / 10,0 | 8,9 / 10,0 / 10,0 |
| 1ª / 2ª área | Detox e Linfático / Fúngico | Detox e Linfático / Fúngico |
| PP-V1 (principal · complementares) | Mapa da Rotina · Gatilhos & Respostas · Linha do Momentum | Mapa da Rotina · Gatilhos & Respostas · Linha do Momentum |

**v6 — pontuou (sinais dominantes das duas primeiras áreas):**

- 1ª Detox e Linfático: SNT-401 “Você percebe inchaço nas pernas ou nos pés no fim do dia?”; SNT-402 “Seu rosto amanhece inchado?”; SNT-405 “Você passa um dia ou mais sem evacuar?”
- 2ª Fúngico: nenhum sinal pontuou

**v6 — contexto, sem pontuar (contextuais com carga > 0):** ESP-502 → Detox e Linfático; SNT-408 → Detox e Linfático; SNT-409 → Detox e Linfático; SNT-410 → Detox e Linfático

## Caso E — mental / emocional / propósito

**Leitura humana esperada:** Cabeça que não desliga, preocupação, autocrítica, falta de direção. Espera-se o MEE em 1º; os sistemas físicos ficam sem carga. Contato com a natureza (ESP-501) é só contexto.

| | v5 | v6 |
|---|---|---|
| Fúngico (nota · itens) | 10,0 · 11 | 10,0 · 8 |
| Ácido Inflamatório (nota · itens) | 10,0 · 9 | 10,0 · 8 |
| Metabólico (nota · itens) | 10,0 · 8 | 10,0 · 7 |
| Detox e Linfático (nota · itens) | 10,0 · 10 | 10,0 · 6 |
| Mental Emocional Espiritual (nota · itens) | 6,2 · 42 | 6,0 · 40 |
| **Índice** | 92,4 | 92,0 |
| Tríade Corpo / Mente / Espírito | 9,1 / 6,3 / 6,4 | 8,9 / 6,3 / 6,4 |
| 1ª / 2ª área | Mental Emocional Espiritual / Fúngico | Mental Emocional Espiritual / Fúngico |
| PP-V1 (principal · complementares) | PQQ · Mapa da Rotina · Mapa de Crenças Alimentares | PQQ · Mapa da Rotina · Mapa de Crenças Alimentares |

**v6 — pontuou (sinais dominantes das duas primeiras áreas):**

- 1ª Mental Emocional Espiritual: EMO-102 “Você sente que sua vida está desorganizada e não consegue pôr ordem?”; EMO-103 “Você sente um peso para sair do lugar mesmo querendo mudar?”; EMO-401 “Você se pega remoendo uma mágoa antiga?”
- 2ª Fúngico: nenhum sinal pontuou

**v6 — contexto, sem pontuar (contextuais com carga > 0):** ESP-501 → Fúngico

