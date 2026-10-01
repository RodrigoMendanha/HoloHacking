# PACOTE METODOLÓGICO V1 — DECISÕES FINAIS

Etapa 4.2 · 01/10/2026 · branch `claude/v1-etapa4-2-metodologia-final`

> ## DECISÕES METODOLÓGICAS V1 FECHADAS
> As 15 decisões abaixo foram tomadas pela liderança do método e estão encerradas. Elas foram registradas em dado (`metodologia-decisoes-v1.js`) e aplicadas numa **nova versão candidata** do pacote. Nenhuma foi reinterpretada; nenhuma alternativa foi recomendada.

> ## PUBLICAÇÃO TÉCNICA PENDENTE DE VALIDAÇÃO NO BANCO REAL
> O candidato **não** foi publicado nem aprovado. A cadeia de migrations, agora **130000→200000**, só foi validada num PostgreSQL 16 local (BEGIN/ROLLBACK). Enquanto ela não for validada no Supabase real, o pacote fica `em_revisao` e nenhuma saída do HOLOSCAN é oficial.

## 1. O pacote candidato

| | Pacote importado (histórico) | Candidato V1 |
|---|---|---|
| Código / versão | HOLOS-V1 @ 1 | HOLOS-V1 @ **2** |
| Status | `rascunho` | `em_revisao` (aprovação formal só pela RPC, com responsável nominal) |
| Hash do conteúdo (SHA-256) | `7e7e55dc40a4cb994275ff258008001c3bad2d44df311635c23278c3d4c213cc` | `3593d782f1cd3a35b05ecae36836ab71746064cc99960853705dd3e2ac3f24c4` |
| Validador | bloqueado: os 12 bloqueios da Etapa 4 continuam; com o contrato V1, 115 erros em 12 códigos | **0 erros** (JS e SQL) |
| Edição | 84 itens, sem contexto temporal | HOLOSCAN-V1 v1, 84 itens, `aprovada` |
| Elementos | `para_homologacao` | `aprovado` (decisões fechadas, 15 registros de decisão) |

- **Geração:** `node scripts/pacote-candidato-v1.mjs`. Ele lê o inventário, importa o HOLOS-V1@1 sem editá-lo e aplica `aplicarDecisoesV1`. Grava `docs/v1/metodologia/pacote-metodologico-v1-candidato.json` e `supabase/tests/etapa4-2-pacotes.sql`. Com `--check`, prova que os arquivos gravados são idênticos ao que o gerador produz agora (determinismo).
- **Linhagem:** o candidato guarda `lineage` = {código, versão, status e hash do pacote anterior, decisões aplicadas}.
- **Provenance:** pesos recuperados (`legacy.legacy_recovered_weight`), papéis e fontes antigas, textos de sistema e mensagens de faixa antigas ficam em `legacy`. Eles não entram no cálculo nem na exibição oficial.
- **Divergência é erro:** se as decisões não baterem com o pacote base, o construtor recusa e não ajusta nada. Isso vale para ID a mais ou a menos, escala desconhecida, contagem 73/11 diferente ou inversão diferente da recuperada.

## 2. As 15 decisões

| # | Tema | Decisão V1 |
|---|---|---|
| 1 | Questionário | 84 perguntas: 49 físico, 19 mental/emocional, 16 espiritual/propósito. EMO-506 fica fora da V1. SNT-101 e SNT-501 têm um único ID cada. SNT-302, SNT-310 e EMO-506 não são recriadas. Cada item tem **exatamente um** contexto temporal (tabela 3). |
| 2 | Escalas | 0–3. Frequência: 0 Nunca, 1 Às vezes, 2 Frequente, 3 Sempre. Intensidade: 0 Nada, 1 Um pouco, 2 Bastante, 3 Muito. Atribuição do Anexo A mantida (73 frequência, 11 intensidade). Escala desconhecida é **erro**. |
| 3 | Orientação | Invertidas: SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501. As outras 75 são diretas. Direta: z = resposta. Invertida: z = 3 − resposta. Orientação ausente é **erro**, nunca inferida pelo texto. |
| 4 | Associações | Exatamente **um** sistema primário pontuável por pergunta (84). As 9 secundárias recuperadas viram `secondary_contextual`: não pontuam, não duplicam a pergunta, não entram no denominador nem na cobertura, não afetam o Índice nem a Tríada. A provenance histórica fica preservada. |
| 5 | SNT-101 | "Você sente vontade forte de doce ou pão quase todo dia?" Primário: **Sistema Fúngico**, peso 1. Metabólico como `secondary_contextual`, sem contribuição (veio da linha histórica **SNT-302**, que não é recriada). Tríada: físico, peso 1. Contexto: `ultimos_30_dias`. |
| 6 | SNT-501 | "Você acorda cansado mesmo dormindo as horas necessárias?" Primário: **Sistema Mental Emocional Espiritual**, peso 1. Metabólico como `secondary_contextual`, sem contribuição (veio da linha histórica **SNT-310**, que não é recriada). Tríada: físico, peso 1. Contexto: `ultimos_30_dias`. |
| 7 | Pesos | Peso 1 nos 84 vínculos primários. A hierarquia 1/2/3 sai da fórmula e fica como `legacy_recovered_weight`. Secundárias contextuais não pontuam e não têm fator secundário. |
| 8 | Parcialidade | Cobertura global (informativa) = respostas numéricas válidas / 84. Cobertura por sistema = válidas dos itens primários / itens primários do sistema. Sistema avaliável se a cobertura for **≥ 0,80**. Em branco, recusada e não aplicável **não são zero**: não contam como resposta válida, reduzem a cobertura e não saem do denominador da cobertura. Nota pelos respondidos: A = Σz, D = Σ3, carga = 10·A/D, **nota = 10 − carga**. Sem denominador completo, sem 50%. A cobertura aparece junto da nota quando for menor que 100%. |
| 9 | Faixas | Escala 0–10, T1 = 10/3, T2 = 20/3. **Baixa** 0 ≤ nota < T1; **intermediária** T1 ≤ nota < T2; **alta** T2 ≤ nota ≤ 10. A classificação usa a fração exata, nunca o valor de tela. Exibição com 1 casa. Mensagens neutras (seção 5). As afirmações causais antigas ficam só como legado. |
| 10 | Índice HOLOS | Pesos 0,20 para cada um dos 5 sistemas. Só existe com **os cinco** sistemas avaliáveis. Sem renormalização, sem Índice parcial. Senão, `evaluable = false`, `value = null` e motivo explícito. Índice = 10 × Σ(nota × 0,20), escala 0–100, 1 casa, sem faixas qualitativas. |
| 11 | Tríada | Eixos físico/mental/espiritual pelo **bloco** da pergunta (49/19/16), peso 1, com a mesma orientação da pergunta. Eixo avaliável com cobertura ≥ 0,80; abaixo disso fica nulo. Mesma fórmula 0–10 pelos respondidos. Sem nota global, sem faixa, sem diagnóstico, sem interpretação automática. SNT-501 fica no eixo físico. |
| 12 | Comparabilidade | Delta só com: mesmo `patient_id`, mesma `questionnaire_edition`, mesma `methodology_package_version`, mesmo `engine_contract_version`, sistema avaliável nas duas aplicações e **mesmo conjunto de IDs pontuados**. Se faltar qualquer requisito, mostra lado a lado, sem delta. Quando comparável: anterior, atual e delta absoluto. Só "subiu", "desceu" ou "permaneceu", nunca "melhorou" ou "piorou". Sem janela mínima ou máxima, sem equivalência automática entre versões. |
| 13 | Nomenclatura | Sistema Fúngico, Sistema Ácido Inflamatório, Sistema Metabólico, Sistema Detox e Linfático, Sistema Mental Emocional Espiritual. Textos oficiais na seção 4. "Impacto espiritual" causal, "bloqueio no plexo solar", "queda de frequência", "dessintonização" e equivalentes saem do conteúdo oficial. IDs internos permanecem. |
| 14 | Casos de referência | REF-01, REF-02 e REF-03 no pacote (seção 6), com fixtures de 80% para cada sistema e eixo (seção 7). |
| 15 | CMB/REC/SEL | Nenhuma combinação ou sugestão automática é função oficial da V1. CMB-001..016, REC-001..023 e SEL-001 ficam como legado não oficial: arquivos preservados, regras não executadas. A biblioteca das 10 ferramentas continua para seleção manual. Mensagem: "Não há sugestão automática validada para esta edição." |

## 3. Contexto temporal (84 IDs, um cada)

| Contexto | Itens | IDs |
|---|---|---|
| `ultimos_30_dias` | 50 | SNT-101, 102, 103, 106, 107, 108, 201, 202, 203, 204, 205, 207, 208, 209, 301, 303, 304, 307, 401, 402, 404, 405, 409, 501–510; EMO-101, 102, 103, 201, 202, 301, 302, 303, 401, 501, 502, 504; ESP-201, 302, 303, 501, 502 |
| `ultimos_3_meses` | 5 | SNT-104, 105, 111, 206, 308 |
| `atualmente` | 14 | SNT-305, 306, 408, 410; EMO-505, 507; ESP-101, 102, 103, 202, 301, 401, 404, 405 |
| `habitualmente` | 12 | SNT-110, 403, 406, 407; EMO-203, 204, 402, 403, 503; ESP-203, 402, 403 |
| `ao_longo_da_vida` | 1 | SNT-109 |
| `sem_periodo_especifico` | 2 | SNT-210, 309 |
| `ultimos_7_dias` | 0 | nenhum item nesta edição |

## 4. Sistemas: nomes e textos oficiais

| Sistema | Itens primários | Texto oficial |
|---|---|---|
| Sistema Fúngico | 15 | Eixo autoral do HOLOSCAN que organiza respostas relacionadas a sinais digestivos, mucosas, pele e padrões de desejo alimentar agrupados pelo método. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença. |
| Sistema Ácido Inflamatório | 16 | Eixo autoral que organiza respostas relacionadas a dor, rigidez, pele, mucosas e reatividade presentes no questionário. O termo 'ácido' faz parte da nomenclatura autoral e não representa medição do pH corporal. O eixo não diagnostica inflamação nem substitui avaliação ou exames clínicos. |
| Sistema Metabólico | 14 | Eixo autoral que organiza respostas relacionadas a energia, fome, comportamento alimentar, composição corporal percebida e achados laboratoriais relatados no questionário. Não diagnostica resistência à insulina, diabetes ou outra condição metabólica. |
| Sistema Detox e Linfático | 15 | Eixo autoral que organiza respostas relacionadas a inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias presentes no questionário. 'Detox' é nomenclatura do método; a pontuação não mede toxinas, função hepática ou função linfática. |
| Sistema Mental Emocional Espiritual | 24 | Eixo autoral que organiza respostas relacionadas a sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal. Não diagnostica transtornos mentais e não mede saúde, valor ou qualidade espiritual. |

Total: 84 primários. Secundárias contextuais: 11, sendo as 9 recuperadas (EMO-101, 103, 201, 203, 301, 302, 402, 502, 504) mais SNT-101→Metabólico e SNT-501→Metabólico.

## 5. Mensagens de faixa (iguais para os cinco sistemas)

- **Profissional:** "A pontuação deste eixo ficou na faixa {baixa | intermediária | alta} nesta aplicação. Revise os itens respondidos e a cobertura antes da interpretação profissional."
- **Paciente:** a mesma frase, mais "Esta pontuação organiza respostas do HOLOSCAN e não representa, sozinha, um diagnóstico."

## 6. Casos de referência (no pacote, regra `example`)

| Caso | Entrada | Sistemas (interno / tela) | Índice | Tríada | Cobertura |
|---|---|---|---|---|---|
| REF-01 | diretas = 0, invertidas = 3 (todo z = 0) | 10 / 10.0 | 100 / 100.0 | 10.0 / 10.0 / 10.0 | 100% |
| REF-02 | diretas = 3, invertidas = 0 (todo z = 3) | 0 / 0.0 | 0 / 0.0 | 0.0 / 0.0 / 0.0 | 100% |
| REF-03 | diretas = 1, invertidas = 2 (todo z = 1) | 20/3 = 6,666… / 6.7 | 200/3 = 66,666… / 66.7 | 6.7 / 6.7 / 6.7 | 100% |

O validador JS (`PacoteMetodologico.validar`) roda o motor em cada caso e aponta `exemplo_divergente` se o resultado mudar. O validador SQL confere a presença do esperado; a conta é do motor.

## 7. Limite de 80% (fixtures de teste por sistema e eixo)

| Destino | Itens | Avalia (≥ 80%) | Não avalia (logo abaixo) |
|---|---|---|---|
| Sistema Fúngico | 15 | 12/15 = 80,0% | 11/15 = 73,3% |
| Sistema Ácido Inflamatório | 16 | 13/16 = 81,3% | 12/16 = 75,0% |
| Sistema Metabólico | 14 | 12/14 = 85,7% | 11/14 = 78,6% |
| Sistema Detox e Linfático | 15 | 12/15 = 80,0% | 11/15 = 73,3% |
| Sistema Mental Emocional Espiritual | 24 | 20/24 = 83,3% | 19/24 = 79,2% |
| Tríada física | 49 | 40/49 = 81,6% | 39/49 = 79,6% |
| Tríada mental | 19 | 16/19 = 84,2% | 15/19 = 78,9% |
| Tríada espiritual | 16 | 13/16 = 81,3% | 12/16 = 75,0% |

Os fixtures são de teste (`testes/testar-v1-etapa4-2-pacote-v1.mjs`) e não são conteúdo clínico.

## 8. Implementação

| Peça | O que faz |
|---|---|
| `metodologia-decisoes-v1.js` | As 15 decisões em dado (`window.MetodologiaDecisoesV1`), sem cálculo. |
| `metodologia-pacote.js` | `aplicarDecisoesV1` (nova versão, linhagem, legado), `hashConteudo` (SHA-256 canônico) e o validador com o contrato V1: contexto temporal, um primário por pergunta, Tríada pelo bloco, secundária sem peso, ausência ≠ zero, Índice sem parcial nem renormalização, cobertura mínima explícita, textos causais, sugestão automática e conferência dos REF. |
| `metodologia-motor.js` | Motor genérico 2.0.0, contrato `holoscan-motor-contrato-v1`. Aritmética racional exata (BigInt); só primárias pontuam; cobertura por sistema e eixo; Índice só com os 5; Tríada por eixo; `comparar()`; `conferirExemplo()`. Sem fallback para CSV, app.js, holoscan.js, peso ou faixa antigos, soma×2, renormalização ou CMB/REC/SEL. |
| `metodologia-homologacao.js` | Opção "Candidato V1 — decisões fechadas", status metodológico e técnico, linhagem, pesos legados, limites exatos, REF conferidos, política de sugestão. Botão "Gravar candidato V1 (em_revisao, sem aprovar)". |
| `questionario.js` | Escala desconhecida deixa de cair em frequência: o item aparece como erro, sem botões. |
| `supabase/migrations/20261001200000_etapa4_2_contrato_metodologico_v1.sql` | **Não aplicada.** Adiciona `lineage` e `legacy`, limites exatos de faixa, CHECK de contexto temporal (7 valores), papéis conhecidos, `secondary_contextual` sem peso, `rule_type` `suggestion` e o validador SQL com o contrato V1. |
| `scripts/pacote-candidato-v1.mjs` | Gera e confere (`--check`) o candidato e o SQL do harness. |
| `scripts/validar-cadeia-local.sh` + `supabase/tests/etapa4-2-harness.sql` | Cadeia 130000→200000 + harness Etapa 4 (33) + Etapa 4.2 (18) em PostgreSQL local, com BEGIN/ROLLBACK: **51/51 ok**. O validador SQL dá 0 erros no candidato e o importado continua bloqueado. |

## 9. O que falta para publicar (gate técnico, fora desta etapa)

1. Validar a cadeia 130000→200000 no Supabase real, por conexão direta autorizada, com BEGIN/ROLLBACK e ON_ERROR_STOP. **Pendente: não há conexão direta disponível neste ambiente.**
2. Aplicar as migrations em produção (decisão de quem administra o banco).
3. Gravar o candidato pela tela de homologação (`?homologacao=1`) como `em_revisao`.
4. Aprovar com `aprovar_pacote_metodologico`, informando o responsável nominal e a justificativa. A RPC roda o validador e calcula o hash no servidor.

Até lá, a barreira (`window.Metodologia`) continua em `em_homologacao` e nenhuma tela oficial recebe número do HOLOSCAN.
