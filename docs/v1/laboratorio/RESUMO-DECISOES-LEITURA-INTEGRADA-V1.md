# Leitura Integrada V1 — decisões humanas necessárias (resumo)

Etapa 5.1 · 02/10/2026 · resumo de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`. **Nenhuma decisão tomada; nenhuma opção recomendada; nenhum valor proposto.** "Hoje" = estado técnico da Etapa 5. "Legado" = confronto antigo (`nota ≤ 3` × um exame fora da faixa do CSV), **LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO**, visível só em `?homologacao=1`.

Enquanto os blocos 1–22 estiverem abertos, toda Leitura Integrada real é **sem dados suficientes**. O bloco 30 (governança) está fechado tecnicamente: quando houver conteúdo decidido, ele entra por migration, o pacote passa a `em_revisao` e segue Daniel → Rodrigo → Homologar.

Significados fixos: CONVERGENTE ≠ diagnóstico; DIVERGENTE não invalida relato nem exame; SEM DADOS SUFICIENTES é obrigatório quando falta fonte, regra, referência, compatibilidade, suficiência ou tratamento aprovado de mistos.

| # | Decisão | Hoje | Legado | Decidir |
|---|---|---|---|---|
| 1 | Domínios oficiais | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.4)**: arquitetura A, 7 domínios LI-D01…LI-D07, 11 regras; não registrado no banco, não homologado, não implementado | 5 sistemas HOLOSCAN usados como domínio (não herdados) | — (`DECISAO-01-DOMINIOS-LI.md`) |
| 2 | Exame/variante/material → domínio | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.5)**: 42 exames com domínio (47 pares), 3 sem, 5 multi; direções registradas; variantes PCR/Mg distintas; 0 herdados; não implementado, não homologado | `exames.csv.sistema` — NÃO HOMOLOGADO PARA VÍNCULO, não herdado | — (`DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md`); material/método por vínculo na implementação |
| 3 | Aplicação HOLOSCAN elegível (`DECISAO-03-ELEGIBILIDADE-HOLOSCAN-LI.md`, 9 opções) | seleção explícita; pacote HOLOS-V1@2 ainda não aprovado | pontuação local sem id | critérios (avaliável, pacote aprovado, cobertura) |
| 4 | Coletas e resultados elegíveis (`DECISAO-04-ELEGIBILIDADE-COLETAS-LI.md`) | salvo/revisado, não substituídas, qualquer `source` | valores atuais locais | restringir ou confirmar |
| 5 | Janela temporal (`DECISAO-05-JANELA-TEMPORAL-LI.md`, 6 arquiteturas) | sem regra (motor aceita tudo) | sem janela | `max_days` ___, escopo, simetria |
| 6 | Múltiplas coletas na janela (`DECISAO-06-MULTIPLAS-COLETAS-LI.md`, 7 opções) | cada resultado conta | última por `updated_at` | deduplicação por exame |
| 7 | Referência do laudo | única usada; limites inclusivos | não existia | elegibilidade e exigências |
| 8 | Referência metodológica | tabela vazia, sem botão | "ideal" do CSV sem fonte | existir ou não; prioridade |
| 9 | Sem referência | excluído, nunca "dentro" | ideal sempre presente | excluir, bloquear domínio, pedir complemento |
| 10 | Conversões de unidade | tabela vazia; unidade ≠ → incompatível | unidade fixa do CSV | lista aprovada ou nenhuma |
| 11 | Compatibilidade de variante | identidade distinta | PCR-us item próprio | distinta, qualquer, equivalências |
| 12 | Compatibilidade de material | parte da identidade; nulo só com nulo | inexistente | idem |
| 13 | Compatibilidade de método | só com `method_relevant` | inexistente | lista de exames sensíveis a método |
| 14 | Qualitativos | não classificáveis, excluídos | não registráveis | tabela por exame ou exclusão |
| 15 | Censurados | não classificáveis, excluídos | digitados como número | classificação por intervalo ou exclusão |
| 16 | Suficiência mínima | sem regra | 1 exame bastava | arquitetura (absoluto/por domínio/fração) + valor ___ |
| 17 | Conjunto mínimo | sem obrigatórios | inexistente | flag `required` ou nenhum |
| 18 | Exames ausentes | ignorados | ignorados | ignorar, listar, denominador |
| 19 | Resultados mistos | sem regra → sem dados | qualquer fora = alterado | `insufficient`, `majority`, fração, direção; empate |
| 20 | CONVERGENTE | sem regra; motor: lab alterado == HOLOSCAN alterado | `nota ≤ 3` ∧ ≥1 fora; "ambos ok" também | critério HOLOSCAN alterado; "ambos não alterados" |
| 21 | DIVERGENTE | estado único, dois sentidos | textos causais por sentido | único, sub-rótulo, dois estados |
| 22 | SEM DADOS SUFICIENTES | 8 motivos, único estado real | só `sem_exame` | confirmar lista/rótulos |
| 23 | Textos à profissional | nenhum aprovado | 4 textos fixos (neutros) + causais | textos neutros por estado/domínio |
| 24 | Textos ao paciente | nenhum | nenhum | aparece ou não; texto |
| 25 | Comparabilidade da LI | nenhuma comparação | nada era salvo | mesma versão, lado a lado, nunca melhorou/piorou |
| 26 | Cálculos derivados | tabela vazia | HOMA-IR digitado | nenhum ou aprovados com fórmula/versão |
| 27 | Customizados | fora da LI | inexistente | fora, promoção ao catálogo |
| 28 | Candida IgG, VHS, HOMA-IR, Cortisol | `additional_legacy` | vínculos a 4 sistemas | manter, catálogo, custom |
| 29 | Insulina de jejum ↔ basal | `exam_code` nulo, `requires_manual_mapping` | EXA-006 → metabolico | alias seguro, variante, pendente, custom — **não automático** |
| 30 | Homologação do pacote LI | **FECHADO TECNICAMENTE (Etapa 5.2)**: Daniel → Rodrigo, hash canônico, invalidação, `homologar_pacote_li` com completude, snapshot; 0 aprovações registradas | sem processo | — (conteúdo dos blocos 1–29 continua aberto) |

**Primeiro bloco que exige decisão humana:** 3 (aplicação HOLOSCAN elegível) — o 30 (governança) foi fechado tecnicamente na Etapa 5.2; os blocos 1 (domínios) e 2 (vínculos) foram decididos por Daniel nas Etapas 5.4 e 5.5; blocos 3–6 preparados; nenhuma aprovação real registrada.

**Contagens da Etapa 5 (Anexo A do pacote):** harness 114 → 116 = L42/L43 acrescentados em `8a3524c`; EXA: 24 = 19 mapeados + 1 manual (EXA-006) + 4 `additional_legacy`.
