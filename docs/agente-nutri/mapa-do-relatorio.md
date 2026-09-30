# Mapa do relatório — o que a tela "Relatório" mostra, de onde vem cada número

Para o agente **"Nutrição Holística — Nutri"** (hub Codeless), que conversa com o
**nutricionista** sobre o relatório do paciente.

- Tela: ficha do paciente → aba **Relatório**. Quem monta: `desenharRelatorio()`
  em `arquivos.js:1158-1391`.
- Referência de linha: commit `40ea4ce` da branch `claude/admiring-mccarthy-jke2pf`
  (Rodada 08). **Produção hoje roda a `main` (6bf10f5)**, onde a mesma função está
  em `arquivos.js:835` — as diferenças estão no fim deste documento.
- O relatório é sempre da **última aplicação do HOLOSCAN** do paciente
  (`window.ultimaPontuacao`, `app.js:3025`). Sem nenhuma aplicação, a tela mostra
  só "Relatório ainda sem dados suficientes" (`arquivos.js:1163-1166`).

## Fontes, em uma linha

| Sigla | Fonte | O que é |
|---|---|---|
| **Q84** | Questionário do HOLOSCAN | 84 perguntas (49 sintomas, 19 emoções, 16 espirituais), resposta 0–3: 0 nunca · 1 às vezes · 2 frequente · 3 sempre (`motor/bancos/config.csv:2`). Cada pergunta é um marcador de `motor/bancos/sintomas.csv`, `emocoes.csv`, `espiritual.csv`. |
| **HOLOSCAN** | Motor de pontuação | `motor/src/motor.ts` (empacotado em `holoscan.js`), roda sobre as respostas do Q84 e gera notas, faixas, Tríade, Índice, cobertura e sinais dominantes. |
| **Exames** | Coletas de exames | Valores lançados na ficha → aba Documentos (`arquivos.js`, painel de exames). 24 exames, faixas em `motor/bancos/exames.csv`. |
| **Ficha** | Cadastro e agenda | Nome do paciente, consultas da agenda (`agenda.js`), documentos (`arquivo-store.js`). |
| **Perfil** | Perfil do profissional | Nome, especialidade, cidade, registro, contato, logo, assinatura, carimbo (`perfil.js`). |
| **Profissional** | Texto digitado | A interpretação escrita pela nutricionista. |

**O relatório NÃO mostra**: ferramentas (OQ3, PQQ, Linha do Momentum, Mapa de
Crenças, Roda da Vida, Carta ao Futuro etc.), evolução entre aplicações, dados
clínicos da ficha além do nome (idade, queixa), conduta/"Por onde começar",
aprofundamentos nem "Direção terapêutica" — esses aparecem em outras telas
(HOLOSCAN, Ferramentas, Evolução) e no contexto da aba HOLOS AI.

---

## 0. Barra de ações (não sai na impressão)

| Campo | Valores | Fonte | Arquivo:linha |
|---|---|---|---|
| Registro | "Para a nutricionista" / "Para o paciente" (muda só a seção E: editável × só leitura) | — | `arquivos.js:1182-1190`, troca em `arquivos.js:1465` |
| Botão | "Imprimir ou salvar em PDF" (`window.print()`) | — | `arquivos.js:1191-1192`, ação em `arquivos.js:1466` |

## 1. Cabeçalho

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Logo do profissional | imagem | Perfil | `arquivos.js:1199`, pintada em `arquivos.js:1418-1429` |
| Nome do profissional (ou "HoloHacking") | texto | Perfil | `arquivos.js:1201` |
| Especialidade · cidade | texto | Perfil | `arquivos.js:1179`, `arquivos.js:1202` |
| Título "Mapa HOLOS · <nome do paciente>" | texto | Ficha | `arquivos.js:1205` |
| Data | dd/mm/aaaa — **data em que o relatório foi gerado** (hoje), não a da aplicação | — | `arquivos.js:1209` (`hoje()`) |
| "cobertura NN%" | % de perguntas respondidas do Q84 = respondidas ÷ 84 × 100, sem casas | HOLOSCAN (Q84) | `arquivos.js:1210-1211`; cálculo `motor/src/motor.ts:446-450` |
| Frase de fronteira | texto fixo | — | `arquivos.js:1212-1214` |

## 2. Seção A — "HOLOSCAN — o que o paciente relatou"

Abre em `arquivos.js:1222-1227`.

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| "Aplicado em dd/mm/aaaa" | data da aplicação do HOLOSCAN | HOLOSCAN | `arquivos.js:1227` |

### A.1 Mapa de prioridades — `arquivos.js:1229-1247`

Uma linha por sistema (5), ordenadas por `HoloAusencia.porLeitura`
(`utils.js`): primeiro os que têm nota com cobertura suficiente, da **menor nota
para a maior**; depois "dados insuficientes"; por último "sem dado".

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Nome do sistema | Fúngico, Ácido-Inflamatório, Metabólico, Detox + Linfático, Mental-Emocional-Espiritual | HOLOSCAN (`motor/bancos/sistemas.csv`) | `arquivos.js:1242` |
| Nota | 0,0–10,0 (1 casa); **10 = sem carga (muito bom), 0 = carga máxima**. "—" quando não há resposta | HOLOSCAN sobre Q84: carga = pontos obtidos ÷ máximo possível × 10; nota = 10 − carga | `arquivos.js:1243`; cálculo `motor/src/motor.ts:194-196` |
| "N de M respondidas" | perguntas do sistema respondidas / total do sistema (15, 16, 19, 16, 29 — emoções contam no sistema primário e no secundário) | Q84 | `arquivos.js:1236-1238` |
| "nenhuma pergunta respondida" | quando o sistema não tem resposta | Q84 | `arquivos.js:1238` |
| "dados insuficientes" | quando menos de 50% das perguntas do sistema foram respondidas (limiar de apresentação, Rodada 08) | Q84 | `arquivos.js:1239`; limiar `utils.js:39` |
| "faixa baixo / médio / alto" | nota ≤ 3 → baixo (maior desequilíbrio); ≤ 6 → médio; > 6 → alto (equilíbrio) | HOLOSCAN (`motor/bancos/regras.csv`) | `arquivos.js:1240`; `motor/src/motor.ts:117-121` |

### A.2 Sinais dominantes — `arquivos.js:1249-1258`

Só aparece se algum sistema tiver sinais dominantes.

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Sistema — lista de sinais | até **5 marcadores** por sistema, os que mais pontuaram (peso × carga da resposta), do maior para o menor | HOLOSCAN sobre Q84 | `arquivos.js:1252-1255`; `motor/src/motor.ts:213` |

### A.3 Tríada — `arquivos.js:1260-1265`

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Físico | 0,0–10,0; "—" sem resposta | Q84, só perguntas de **sintoma** | `arquivos.js:1262`; `motor/src/motor.ts:236-257` (origem → eixo em `motor/src/motor.ts:22-26`) |
| Mental | 0,0–10,0; "—" sem resposta | Q84, só perguntas de **emoção** | `arquivos.js:1263` |
| Espiritual | 0,0–10,0; "—" sem resposta | Q84, só perguntas **espirituais** | `arquivos.js:1264` |

Mesma direção das notas: 10 = sem carga.

### A.4 Leitura combinada — `arquivos.js:1267-1277`

Hoje **nunca aparece**: `cmbParaExibir()` devolve lista vazia de propósito
(`app.js:2668-2670`) — as 16 combinações (`motor/bancos/combinacoes.csv`)
saíram da tela e do relatório até revisão do Rodrigo.

### A.5 Os cinco sistemas — `arquivos.js:1279-1293`

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Nome do sistema | — | HOLOSCAN | `arquivos.js:1285` |
| Nota | 0,0–10,0; "—" | HOLOSCAN (Q84) | `arquivos.js:1286` |
| Faixa | baixo / médio / alto; "sem dado"; "dados insuficientes" | HOLOSCAN | `arquivos.js:1287-1288` |
| Frase fixa | "Área do mapa. Investigar com mais profundidade na consulta." (igual para todos) | — | `arquivos.js:1289` |
| Fronteira | "Os cinco sistemas são categorias de organização do mapa, não categorias de doença." | — | `arquivos.js:1292-1293` |

### A.6 Índice HOLOS (informação secundária) — `arquivos.js:1295-1298`

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Índice | 0–100, sem casas: média ponderada das notas (peso 0,20 cada) × 10; sistema sem resposta sai da conta e os pesos são renormalizados | HOLOSCAN (Q84) | `arquivos.js:1296`; `motor/src/motor.ts:219-233`; pesos `motor/bancos/regras.csv` |
| "de 100" | teto | `motor/bancos/config.csv:3` | `arquivos.js:1296` |
| Fronteira | "…não representa percentual de saúde." | — | `arquivos.js:1297-1298` |

## 3. Seção B — "Leitura Integrada (Holoscan) — o que os exames acrescentam"

`arquivos.js:1302-1315`. Aparece sempre, com ou sem exame.

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Nome do sistema | 5 linhas, ordem fixa (Fúngico, Ácido-Inflamatório, Metabólico, Detox + Linfático, Mental–Emocional–Espiritual) | — | `arquivos.js:1311` |
| Rótulo | Convergente / Divergente / Dados insuficientes | Exames × nota do HOLOSCAN | `arquivos.js:1312`; regra `arquivos.js:96-118` |
| Texto | uma de 4 frases fixas (ver abaixo) | idem | `arquivos.js:90-95` |
| Fronteira | "…Não realiza diagnóstico." | — | `arquivos.js:1314-1315` |

Como o estado sai (motor `motor/src/exames.ts:113-172`, tela `arquivos.js:104-112`):
- cada exame é comparado com a faixa cadastrada (abaixo / na faixa / acima) —
  `motor/src/exames.ts:81-100`; exame fora da faixa = "alterado";
- "relato comprometido" = nota do sistema ≤ 3 (`HOLOSCAN_LIMITE_BAIXO`,
  `arquivos.js:102`);
- sem exame do sistema, ou sem nota → **Dados insuficientes**;
- relato comprometido **e** exame alterado → **Convergente** ("Existe convergência…");
- relato não comprometido **e** nenhum exame alterado → **Convergente**
  ("Relato e dados laboratoriais disponíveis estão convergentes…");
- um sem o outro → **Divergente**.

O relatório **não lista os valores dos exames** — só o estado por sistema. Os
valores, unidades e faixas aparecem na aba Documentos e na tela Leitura Integrada.
Exames por sistema: Fúngico 1, Ácido-Inflamatório 3, Metabólico 8, Detox +
Linfático 6, Mental-Emocional-Espiritual 6 (`motor/bancos/exames.csv`).

## 4. Seção C — "Consultas e acompanhamento"

`arquivos.js:1317-1334`.

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| "N consulta(s) registrada(s)." ou "Nenhuma consulta registrada até o momento." | contagem | Ficha (agenda) | `arquivos.js:1324-1328` |
| Uma linha por consulta: data · hora · tipo | dd/mm/aaaa · hh:mm · Primeira consulta / Retorno / Reavaliação HOLOSCAN / Online | Ficha (`Agenda.todas`, `agenda.js:904`), da mais recente para a mais antiga | `arquivos.js:1329-1332` |

## 5. Seção D — "Documentos e materiais"

`arquivos.js:1336-1344`; preenchida depois por `preencherDocumentosRelatorio()`
(`arquivos.js:1398-1414`).

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| "N documento(s) registrado(s)." ou "Nenhum documento registrado até o momento." | contagem | Ficha (documentos) | `arquivos.js:1403-1408` |
| Uma linha por documento: nome · tipo · data | texto · tipo escolhido no envio · dd/mm/aaaa | Ficha (`ArquivoStore.listar`) | `arquivos.js:1409-1411` |

## 6. Seção E — "Interpretação profissional" (selo "escrito pela nutricionista")

`arquivos.js:1346-1367`; selo via CSS `style.css:1556-1557`.

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Texto da interpretação | texto livre | Profissional — gravado junto da aplicação do HOLOSCAN (`window.interpretacaoDe`, `app.js:3018-3024`) | registro "nutricionista": campo editável + "Salvar interpretação" (`arquivos.js:1355-1361`); registro "paciente": só leitura ou "Sem interpretação registrada." (`arquivos.js:1362-1366`) |

## 7. Rodapé

`arquivos.js:1369-1386`.

| Campo | Escala / unidade | Fonte | Arquivo:linha |
|---|---|---|---|
| Assinatura e carimbo | imagens | Perfil | `arquivos.js:1376-1381`, pintadas em `arquivos.js:1418-1429` |
| Nome · registro profissional | texto | Perfil | `arquivos.js:1372`, `arquivos.js:1382` |
| Telefone · Instagram | texto | Perfil | `arquivos.js:1373`, `arquivos.js:1383` |
| Frase final | "Documento gerado pelo HoloHacking. Os marcadores e as faixas ainda estão em revisão pelo autor do método. Queixa que sugira doença deve ser encaminhada ao médico." | — | `arquivos.js:1384-1386` |

---

## Diferenças em produção (main, 6bf10f5) até a Rodada 08 ser publicada

| Onde | Produção hoje | Branch da Rodada 08 |
|---|---|---|
| A.1 / A.5 sistema sem resposta | nota "—" e "nenhuma pergunta respondida", mas a faixa aparece **"alto"** (calculada sobre a nota 10 que o motor devolve) e não existe o estado "dados insuficientes" | nota "—", faixa "sem dado"; "dados insuficientes" abaixo de 50% de cobertura do sistema |
| Tríada sem resposta num eixo | aparece **10** | aparece "—" |
| Faixa | "medio" (sem acento) | "médio" |
| Linhas de código | `desenharRelatorio` em `arquivos.js:835` (A em 900, B 983, C 997, D 1017, E 1028, rodapé 1058) | `arquivos.js:1158` |
