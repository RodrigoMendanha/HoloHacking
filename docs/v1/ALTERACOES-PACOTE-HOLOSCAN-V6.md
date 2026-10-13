# ALTERAÇÕES DO PACOTE HOLOSCAN — HOLOS-V1 v6 (fechamento das 61, 13/10/2026)

**Status:** implementado e testado. A publicação em produção está na seção 10.

**Origem:** tarefa "Fechamento do HOLOSCAN + Resultado HOLOS para entrega" (13/10/2026). Rodrigo pediu o fechamento das 61 perguntas em aberto pelos critérios A→D (A: investiga o domínio do sistema → MANTER; B: pertence a outro sistema → MOVER; C: útil, sem base para pontuar → CONTEXTUAL; D: inadequada, redundante ou diagnóstica → REMOVER). Decisão explícita de Rodrigo é autorização de implementação. Nenhuma das 61 precisou voltar para decisão.

**Base:** **HOLOS-V1 v5**, a versão no ar (hash do servidor `dc615afc…`, hash JS `6523b8e7…`).

**Versão nova:** **HOLOS-V1 v6**, hash JS `05b03b02412f00b161d72b873bad02d6f511593c773b2ac127f044b85d2a8d28`. O hash do servidor é calculado na publicação.

**Preservados sem alteração:** v2, v3, v4 e v5; aplicações, respostas, notas, snapshots, Resultados HOLOS, Próximos Passos, emissões e relatórios. Nada é recalculado.

Este documento não contém dado de paciente.

## 1. Decisões (61 perguntas)

Fonte única: `MetodologiaRevisaoV6` em `metodologia-revisao-v3.js` (id `HOLOS-V1-FECHAMENTO-61-2026-10-13`). A matriz completa, com a justificativa de cada uma, está em `docs/v1/MATRIZ-HOMOLOGACAO-84-PERGUNTAS-HOLOSCAN.md` (seção 0 e fichas).

| decisão | perguntas | por quê (resumo) |
|---|---|---|
| **REMOVER** (1) | SNT-110 | Redundante com SNT-406 (reação ao álcool já pontua no Detox); no Fúngico sugeriria causa microbiológica. |
| **MOVER** (3) | SNT-404 Detox → **Fúngico** | Desconforto com comida gordurosa é relato digestivo/alimentar; no Detox sugeriria função hepática. |
| | SNT-501 MEE → **Metabólico** | Acordar cansado mesmo dormindo o suficiente é relato de energia. O contextual antigo no Metabólico sai (redundante). |
| | SNT-507 MEE → **Metabólico** | Perceber fome e saciedade é o domínio do Metabólico (pergunta invertida, sem mudança). |
| **CONTEXTUAL** (10) | SNT-104, SNT-105, SNT-109 (Fúngico) | Condições nomeadas (candidíase, micose) e histórico de antibiótico: pontuar pareceria confirmar condição ou causa. |
| | SNT-206 (Ácido-Inflamatório) | Acne/eczema/psoríase são condições nomeadas. |
| | SNT-305, SNT-306, SNT-308 (Metabólico) | Distribuição de gordura, pele escurecida e dificuldade de perder peso insinuariam diagnóstico metabólico. |
| | SNT-408, SNT-409, SNT-410 (Detox) | Pele opaca/olheiras, odor do suor e celulite sugeririam toxinas ou alteração linfática. |
| **MANTER** (47) | as demais | O conteúdo investiga o domínio do sistema; a justificativa de cada uma está registrada. |

Pesos: nenhum peso novo; todas as primárias continuam com peso 1. Textos, escalas e orientações das perguntas não mudam.

**Regras metodológicas registradas na v6** (gravadas nas notas do pacote):
1. Uma relação holística, simbólica ou contextual entre emoção e corpo não basta para que uma resposta mental/emocional altere a nota de um sistema físico.
2. O bloco de origem da pergunta não define automaticamente o sistema; vale o conteúdo investigado.
3. Associação contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade.
4. Uma pergunta pode ser útil ao cuidado integral sem pontuar um sistema.
5. Sem justificativa suficiente para alterar matematicamente um sistema, preferir CONTEXTUAL.
6. O HOLOSCAN registra relato da paciente; não confirma condição, etiologia ou mecanismo.

## 2. Contagens

| | v5 | v6 |
|---|---|---|
| perguntas coletadas | 82 | **81** |
| pontuáveis | 80 | **69** |
| só contextuais | 2 | **12** |
| Fúngico | 11 | **8** |
| Ácido Inflamatório | 9 | **8** |
| Metabólico | 8 | **7** |
| Detox e Linfático | 10 | **6** |
| Mental Emocional Espiritual | 42 | **40** |
| Tríade Corpo / Mente / Espírito | 47 / 19 / 14 | **36 / 19 / 14** |

Removidas ao todo (das 84 do inventário): SNT-210, SNT-309 (v4) e SNT-110 (v6). Cobertura mínima de 80% por sistema e regra do Índice iguais às da v5, sobre os denominadores novos.

## 3. Comparativo v5 × v6 — cinco casos

`docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V5-V6.md` (gerado por `scripts/comparar-v5-v6.mjs`, conferido no teste). Mesmas respostas fictícias nas duas versões:

| caso | 1ª área (v5 → v6) | o que muda na v6 |
|---|---|---|
| A digestivo/alimentar | Fúngico → Fúngico | candidíase e antibiótico ficam só como contexto; dominantes: doce/pão, inchaço/gases, língua. |
| B dor/rigidez/reatividade | Ácido-Inflamatório → igual | acne/eczema/psoríase só contexto; dominantes: dor articular, corpo travado, corpo dolorido. |
| C fome/energia/refeição | Metabólico → igual | gordura na barriga e dificuldade de perder peso só contexto; acordar cansado e perceber fome/saciedade pontuam no Metabólico. |
| D eliminação/retenção | Detox → igual | pele, suor e celulite só contexto; dominantes: inchaço de pernas, rosto inchado, intestino. |
| E mental/emocional/propósito | MEE → igual | sistemas físicos sem carga; contato com a natureza só contexto. |

O PP-V1 escolheu as mesmas ferramentas nos cinco casos.

## 4. Resultado HOLOS (texto, sem mudar regra)

- **PP-V1:** o texto passou a ser "A ferramenta é sugerida pelo catálogo para aprofundar este sistema." Os rótulos ficaram "Ferramenta sugerida pelo catálogo" e "Por que esta ferramenta aparece aqui". As 30 regras não mudaram (sha256 `b9bbebe8…`).
- **Sinais × ferramenta:** no cartão de cada sistema (Resultado HOLOS), os sinais aparecem só em "O que mais contribuiu" e não se repetem dentro do bloco da ferramenta. Na seção HOLOSCAN o bloco se chama "Sinais que mais pontuaram neste sistema" e diz: "Não foram eles que escolheram a ferramenta: a ferramenta vem do catálogo, pelo sistema."
- **Sistema sem carga (P1 corrigido):** quando a 2ª área (ou a 1ª) tem nota 10,0 (nenhum item pontuou), ela só chega lá pela ordem oficial de desempate. Agora:
  - a profissional lê "sem carga nesta aplicação: nenhum item pontuou; aparece aqui só pela ordem oficial de desempate";
  - o cartão do sistema não leva o selo "2ª área para aprofundar" nem o texto "concentrou mais marcadores";
  - a paciente não lê que essa área "aparece para aprofundar".
  A ordem e a seleção do PP-V1 não mudam.
- **Profissional:** "Pontuou neste sistema" e "Contexto, sem pontuar" continuam separados em cada sistema (o snapshot já separava). **Paciente:** a visão da paciente não mostra o contexto, então ele não aparece como motivo da nota.

## 4A. Textos oficiais dos sistemas (correção final de coerência, antes do deploy)

Pedido de Rodrigo (13/10): o texto oficial não pode descrever como pontuável o que hoje é só contexto ou o que saiu do HOLOSCAN. Exames não participam do HOLOSCAN (SNT-210 e SNT-309 removidas); exame não altera sistema, nota, Índice, prioridade, sinais nem PP. Só o `public_text` dos sistemas muda (campo `textos_sistemas` da revisão). Perguntas, associações, notas, pesos, faixas e PP-V1 não mudam. A v5 e as anteriores ficam com o texto antigo.

| sistema | texto oficial na v6 |
|---|---|
| Metabólico | "O Sistema Metabólico organiza relatos relacionados a energia, fome, saciedade, comportamento alimentar, refeições, resposta percebida à alimentação e rotina. Esse eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas." (sai "composição corporal percebida e achados laboratoriais relatados") |
| Fúngico | "Eixo autoral do HOLOSCAN que organiza relatos digestivos e alimentares, de mucosas e de couro cabeludo agrupados pelo método. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença." (sai "pele") |
| Ácido Inflamatório | "Eixo autoral que organiza relatos de dor, rigidez, desconforto, mucosas e reatividade percebida presentes no questionário. O termo 'ácido' faz parte da nomenclatura autoral e não representa medição do pH corporal. O eixo não diagnostica inflamação nem substitui avaliação ou exames clínicos." (sai "pele") |
| Detox e Linfático | "Eixo autoral que organiza relatos de retenção percebida, hábito intestinal e sensibilidade relatada a substâncias presentes no questionário. 'Detox' é nomenclatura do método; a pontuação não mede toxinas, função hepática ou função linfática." (sai "pele") |
| Mental Emocional Espiritual | sem mudança (já descreve só o que pontua) |

O texto oficial aparece na visão profissional ("Mensagem do pacote"/texto do eixo), nos relatórios e no snapshot dos Resultados novos. Resultados já salvos ficam com o texto da versão com que foram feitos. As faixas e mensagens por faixa já não citavam exames (conferido).

## 5. Testes

- `testes/testar-pacote-v6.mjs` (novo):
  - textos oficiais sem exames/achados laboratoriais/pele/composição; só o texto muda; recusa de texto igual ou de sistema inexistente;
  - decisões e contagens;
  - contextual não pontua;
  - bordas: 100%; exatamente 80% (MEE 32/40); abaixo de 80%; Detox com 6 itens; Metabólico com 7; invertida (SNT-507); empate entre sistemas; empate na Tríade; respostas quase todas baixas e quase todas altas; contextuais respondidas e em branco;
  - cinco casos;
  - sistema sem carga;
  - histórico v2/v4/v5;
  - PP-V1;
  - recusas;
  - artefatos.
- `testes/testar-questionario-v6.mjs` (novo): estado de produção (v5 no ar, com aplicação, Resultado e emissão) → login do responsável → v6 publicada; 81 perguntas; denominadores 8/8/7/6/40; contextos no snapshot; histórico byte a byte.
- `testar-questionario-v3/v5`: simulam o front da época delas (bloqueiam a revisão V6).
- `testar-proximos-passos`, `testar-resultado-ux-paciente`: textos novos do PP-V1.
- **Postgres local** (`supabase/tests/pacote-v6-harness.sql`, PV6-00 a PV6-07): gravar, validar e publicar sobre a v5; contagens; HOLOSCAN 81; dominantes; contexto no snapshot; histórico idêntico.
  - O rascunho de teste do PV5-07 passou a ser desfeito numa subtransação.

## 6. Arquivos

- `metodologia-revisao-v3.js` (`MetodologiaRevisaoV6`), `metodologia-pacote.js` (`revisoesDoCodigo` inclui a V6)
- `scripts/pacote-v6.mjs` → `docs/v1/metodologia/pacote-metodologico-v6.json` e `supabase/tests/pacote-v6-doc.sql`
- `scripts/comparar-v5-v6.mjs` → `docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V5-V6.md`
- `proximos-passos.js`, `sistemas-fechamento.js`, `resultado-sintese.js`, `app.js` (textos da seção 4)
- `docs/v1/MATRIZ-HOMOLOGACAO-84-PERGUNTAS-HOLOSCAN.md/.csv` (matriz fechada), `docs/v1/DEFINICOES-OFICIAIS-SISTEMAS-HOLOSCAN-V6.md`
- `docs/v1/qa-v6/` (capturas e PDFs do QA visual, pacientes fictícias)

## 7. QA visual

Duas pacientes fictícias (casos C e E), pelo fluxo real com servidor falso: Resultado HOLOS profissional, visão da paciente, página Resultado com Conduta, PDF baixado (html2pdf) e PDF impresso.
- Os dois PDFs têm 5 páginas, sem página vazia, sem texto cortado e com contraste legível. O PDF baixado é imagem (html2pdf), como antes.
- Na visão da paciente, as palavras sensíveis só aparecem em frases de ressalva ("não é diagnóstico", "não significa doença, gravidade, risco").

## 8. Achados (P0–P3)

| nível | achado | situação |
|---|---|---|
| P0 | — | nenhum |
| P1 | 2ª área com nota 10,0 (sem carga) apresentada como "área para aprofundar" e "concentrou mais marcadores" (já existia na v5) | **corrigido** (seção 4) |
| P1 | PP-V1 com sinais dentro do bloco da ferramenta, dando a entender que a pergunta escolheu a ferramenta | **corrigido** (seção 4) |
| P2 | A ressalva homologada do Detox, que a paciente também lê, diz "não mede toxinas…" | **mantida**: é texto literal homologado em 13/10 e é uma negação. Para tirar a palavra da visão da paciente, Rodrigo decide o texto novo. |
| P2 | Os textos oficiais dos sistemas no pacote citavam temas que saíram da pontuação (Metabólico: "achados laboratoriais"; Detox e Ácido-Inflamatório: "pele") | **corrigido antes do deploy** (seção 4A) |
| P3 | Detox com 6 itens (o menor); nome "Fúngico" mantido | registrado na matriz (8.6) |

## 9. Ordem da publicação

Não há migration nova: o contrato "pergunta só contextual" já está em produção (`20261020100000`).

1. Impressões digitais (md5) só por leitura.
2. Deploy do front novo na VPS.
3. Login do responsável metodológico com todas as abas antigas fechadas: a v6 é montada da v5 do banco, gravada e publicada; a v5 é retirada.
4. Conferência: v6 no ar, contagens, histórico igual ao do passo 1.
5. Smoke test com paciente fictícia.

**Rollback**
- Front: o container anterior.
- Metodologia: publicar uma v7 com o conteúdo desejado. Pacote publicado não se edita.

## 10. Publicação em produção

_(preenchido na publicação)_
