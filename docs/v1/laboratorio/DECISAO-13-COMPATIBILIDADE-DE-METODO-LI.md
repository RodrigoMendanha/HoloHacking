# DECISÃO 13 — COMPATIBILIDADE DE MÉTODO

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 13 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

## Pergunta

**Para quais exames o método analítico é relevante, e como isso se traduz em compatibilidade de referência e de comparação?**

## Estado atual

`method` texto livre por resultado; referência metodológica pode marcar `method_relevant = true` → método diferente → `incompatible_method`; sem marca, método é ignorado. Nenhuma lista de métodos. DECISÃO 04 regra 13: incompatibilidade afeta aquele resultado/vínculo.

## Situações a decidir (levantamento)

| Situação | Opção técnica | Consequência |
|---|---|---|
| método irrelevante para o exame | ignorar (como hoje) | comparações livres |
| método muda a referência | referência metodológica por método (`method_relevant`) ou laudo já traz a referência do método | classificação só com referência do mesmo método |
| método impede comparação longitudinal | flag por vínculo/exame (extensão) | Evolução mostra lado a lado sem delta |
| método exige coincidência exata | igualdade textual (frágil) ou vocabulário controlado (extensão) | — |

## Casos sensíveis (destacar; não decidir)

| Exame | Por quê |
|---|---|
| LAB-036 DHT | hormonal específico; métodos imunométricos vs espectrometria podem divergir |
| hormônios D07 (LAB-030…043) | referências dependem do método/plataforma e, para alguns, da fase |
| LAB-008 LDL oxidada | marcador especializado, método decisivo |
| LAB-027 Alumínio | fora da LI V1, mas o método/material continua relevante no prontuário |
| LAB-045 Cálcio ionizado | método (eletrodo íon-seletivo) e material decisivos |
| LAB-003 Insulina basal, LAB-016 PCR-us, LAB-029 Ferritina, LAB-035 25-OH vitamina D | métodos distintos entre laboratórios podem mudar referência |

## Opções (sem decidir)

(a) método ignorado salvo `method_relevant` na referência metodológica (como hoje); (b) lista de exames com método relevante mesmo com referência do laudo (flag por vínculo — extensão); (c) vocabulário controlado de métodos (extensão); (d) método nunca bloqueia, só é exibido.

## O que fica bloqueado enquanto aberto

Nada tecnicamente (default = (a)).


## Regra transversal (princípio oficial da LI V1, Etapa 5.7)

**Um resultado possui três eixos de estado independentes:**
1. **Classificação individual** — pode ou não ser classificado contra uma referência aplicável (`classification_status`).
2. **Elegibilidade para Leitura Integrada** — pode ou não participar de uma LI, considerando domínio, vínculo, temporalidade, versão, suficiência e demais regras (`li_eligibility_status`).
3. **Comparabilidade longitudinal** — pode ou não ser comparado diretamente a outro resultado histórico (`longitudinal_comparability_status`).

Um resultado pode ser válido e classificável individualmente e, ao mesmo tempo, não ser elegível para a LI nem comparável longitudinalmente. **Nunca transformar problema de comparabilidade em "resultado inválido".** Os motivos são registrados separadamente por eixo. A nomenclatura acima é **conceitual**: os campos **não** foram implementados nesta etapa.

## Casos de regressão conceitual (obrigatórios para a implementação futura)

| Caso | Situação | Resultado esperado |
|---|---|---|
| A | referência válida do próprio laudo; método não informado; a referência não exige método | **individualmente classificável** |
| B | dois resultados do mesmo `exam_code` com métodos diferentes, cada um com referência válida própria | ambos classificáveis individualmente; **comparação numérica não automaticamente permitida** |
| C | resultado sem referência aplicável | guardado, visível, **não classificável** (`missing_applicable_reference`); nunca "normal" |
| D | PCR (`variant = null`) e PCR-us (`variant = ultrassensivel`) | **não** silenciosamente equivalentes |
| E | Magnésio (`variant = null`) e Magnésio eritrocitário (`variant = eritrocitario`) | **não** silenciosamente equivalentes |
| F | Testosterona livre (LAB-037) e total (LAB-038) | `exam_code`s distintos; **não** recriar como variante artificial |

## Campo DECISÃO

**DECISÃO (Bloco 13 — compatibilidade de método):** separar **classificação individual** de **comparação longitudinal**.

*Classificação individual:* um resultado pode ser classificável pela referência aplicável do próprio laudo mesmo sem método informado, **desde que** a referência seja claramente aplicável àquele resultado e nenhuma regra usada exija método conhecido. **Método ausente não bloqueia universalmente.**

*Regra metodológica:* se a referência/regra metodológica depender de método específico, método conhecido e compatível é necessário; ausente/incompatível bloqueia **aquela regra**.

*Comparação longitudinal:* dois resultados podem ser classificáveis individualmente **mas não comparáveis numericamente**. A comparação considera `exam_code`, `variant`, `material`, `unit`, `method` e contexto de referência; métodos diferentes podem bloquear a comparação numérica direta. **Não declarar equivalência entre métodos sem regra homologada. Não chamar incompatibilidade metodológica de piora/melhora.**

Consequência técnica: o motor já ignora método salvo `method_relevant`; a comparação longitudinal passa a considerar método e contexto de referência (extensão); os três eixos (classificação / elegibilidade / comparabilidade) ganham motivos separados.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
