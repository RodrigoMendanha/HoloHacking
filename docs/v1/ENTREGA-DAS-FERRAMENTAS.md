# O que cada ferramenta entrega hoje (07/10)

Levantamento para decidir a próxima rodada. Nada aqui muda regra do método: o que depende de
decisão metodológica está marcado. As decisões que hoje impedem síntese automática são os itens 3,
27, 36, 61, 65, 156 e 158 de `DECISOES-V1.md`.

| Ferramenta | Entrada | O que entrega hoje | Lacunas |
|---|---|---|---|
| **HOLOSCAN** | 84 perguntas | **Resultado desta aplicação** (item 167): sistemas do mais baixo ao mais alto com nota e faixa, Tríade, cobertura, **Por onde investigar** (2 sistemas mais baixos e seus sinais) e **Sua interpretação**. Também: radar, cartões com nota e faixa, sinais dominantes, Índice (secundário), definição oficial de cada sistema e frase da faixa. | **Método:** sem texto de conclusão por sistema × faixa e sem ferramenta sugerida por sistema (exige HOLOS-V1@3). A frase da faixa é a mesma para todos os sistemas. |
| **Leitura Integrada** | 1 HOLOSCAN e as coletas salvas | Por domínio (7): convergente, divergente ou sem dados suficientes. Snapshot congelado, responsável e observação. Sem coleta, guia para lançar o exame (item 168). | Precisa de exame **lançado**, não só do PDF enviado. Muitos domínios dão "sem dados" quando faltam exames mínimos ou a coleta passa de ±30 dias do HOLOSCAN. **Método:** faixa intermediária e regra de unanimidade (item 160 e seguintes). |
| **Exames (coleta)** | Valores digitados a partir do laudo | Coleta com referência do próprio laudo e classificação pelo LabMotor. Laudo aberto ao lado (fase 1). | Leitura automática por IA = fase 2 (`laboratorio/IMPORTACAO-EXAMES-IA.md`). |
| **OQ3** (Corpo) | Quer, precisa, consegue, alavancas | Guarda as respostas e o histórico. | Sem campo de leitura profissional e sem síntese. |
| **Linha do Momentum** (Corpo) | 6 dimensões e textos | Barras das dimensões. Estado escolhido pela profissional, com o resumo e a conduta daquele estado. Leitura profissional. | É a única com algo derivado; o estado nunca é sugerido. |
| **Mapa da Rotina** (Corpo) | Eventos do dia | Linha do tempo desenhada e leitura profissional. | Sem síntese (item 156). Fora da HOLOS AI e do Panorama. |
| **PQQ** (Mente) | 5 camadas de "pra quê" | Guarda as respostas. | Sem campo de leitura profissional. |
| **Mapa de Crenças** (Mente) | 4 campos | Respostas e leitura profissional. | Sem síntese. |
| **Gatilhos & Respostas** (Mente) | Um episódio | Fluxo desenhado e leitura profissional. | Sem síntese. Fora da HOLOS AI. |
| **Mapa do Propósito** (Espírito) | Lê OQ3 e PQQ | Junta os textos para imprimir. | É só cópia: sem síntese e sem leitura. |
| **Roda da Vida** (Espírito) | 8 notas | Respostas e leitura profissional. | **A roda não é desenhada.** |
| **Carta ao Futuro** (Espírito) | Data e carta | Respostas e leitura profissional. | Nada derivado. |
| **Conexão & Pertencimento** (Espírito) | Vínculos | Rede desenhada e leitura profissional. | Sem síntese. Fora da HOLOS AI. |
| **Conduta** | Campos livres e acordos | Revisões imutáveis; continuidade no retorno. | Nada vem pré-preenchido do HOLOSCAN nem da Leitura Integrada (item 27). |
| **Relatórios** | Fontes escolhidas e interpretação | Snapshot imutável e impressão. | Ainda não leva as **notas e faixas oficiais** do HOLOSCAN (`resultados_oficiais: false`), o que ficou desatualizado depois do item 158. Há dois relatórios paralelos. |
| **HOLOS AI** | Atalhos de contexto | Texto para copiar e colar. | Não envia o HOLOSCAN oficial no contexto (desatualizado). Botões ChatGPT/Gemini desligados. Nenhuma resposta é gerada no app. |

## Candidatos para a próxima rodada

1. **Produto, sem decisão de método:**
   - Desenhar a Roda da Vida.
   - Leitura profissional no OQ3 e no PQQ.
   - Levar as notas e faixas oficiais ao relatório e à HOLOS AI.
   - Unificar os dois relatórios.
2. **Método (Daniel e Rodrigo):**
   - Textos de conclusão por sistema × faixa.
   - Ferramentas sugeridas por sistema.
   - Faixa intermediária e regra de unanimidade da Leitura Integrada.
3. **Infraestrutura e privacidade:** importação de exames por IA (fase 2).
