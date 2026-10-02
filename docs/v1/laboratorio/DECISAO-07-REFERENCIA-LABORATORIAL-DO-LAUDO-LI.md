# DECISÃO 07 — REFERÊNCIA LABORATORIAL DO LAUDO

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 7 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

## Pergunta

**A referência impressa no laudo (digitada pela profissional por resultado) é elegível para classificar um resultado na Leitura Integrada, e em quais formas?**

Separar sempre: **referência laboratorial** (do laudo, por resultado, varia por laboratório) × **referência metodológica** (do pacote LI, por exame/variante/material/população, versionada — bloco 8).

## Estado atual

`lab_results.report_reference_text/min/max/operator/unit/population`, `reference_status informed|missing`, `reference_source = laudo`. Motor: limites inclusivos; operadores `range/<,≤,>,≥`; unidade da referência ≠ unidade do valor → `incompatible_unit`; ausência → `missing_reference`. Nenhum campo para sexo, idade, fase/ciclo (só `population` em texto livre). Um resultado guarda **uma** referência.

## Levantamento (sem decidir)

| Situação | O que existe | Opções | Consequência |
|---|---|---|---|
| referência do próprio laudo (min/max ou operador) | suportada | elegível como está / só com min e max / não elegível na LI | mais ou menos resultados classificáveis; comparabilidade entre laboratórios não garantida |
| intervalo por sexo | só texto livre em `population` | exigir campo estruturado / aceitar texto / ignorar | sem campo, a profissional escolhe o intervalo certo ao digitar; o sistema não confere |
| intervalo por idade | idem | idem | idem |
| intervalo por fase/ciclo (hormonais D07) | idem | campo estruturado por fase / texto / exigir que a profissional digite o intervalo da fase | hormônios de D07 têm referência por fase; sem registro da fase a classificação pode ser inválida |
| referência qualitativa ("Negativo", "Não reagente") | não suportada como referência | ver bloco 14; texto esperado por exame / não classificar | — |
| ausência de referência | `missing` | bloco 9 | — |
| múltiplas referências no mesmo laudo (ex.: por sexo e por fase) | um resultado = uma referência | exigir que a profissional escolha a aplicável ao registrar / guardar várias (extensão) | com várias, o motor precisaria de regra de escolha |

## O que fica bloqueado enquanto aberto

Classificação de todo resultado pela referência do laudo; blocos 9, 16–21.


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

**DECISÃO (Bloco 7 — referência laboratorial do laudo):**
1. A referência **primária** usada para classificar um resultado individual é a referência aplicável **declarada no próprio laudo**.
2. A referência pertence ao **resultado/coleta**; não é regra global.
3. **Preservar sempre** o conteúdo original do laudo. Contrato conceitual: `reference_raw_text` e, quando estruturável, `reference_lower`, `reference_upper`, `lower_inclusive`, `upper_inclusive`, `reference_unit`; condições de aplicabilidade **quando existirem no laudo** (sexo, idade, faixa etária, fase/ciclo, gestação, outras explicitamente declaradas). **Não inventar condição ausente.**
4. O sistema só seleciona deterministicamente uma referência do laudo quando consegue **provar** qual regra se aplica aos dados conhecidos.
5. Duas ou mais referências possivelmente aplicáveis sem informação suficiente para decidir: `classification_status = not_classifiable`, motivo `ambiguous_reference`.
6. O sistema **não escolhe silenciosamente** entre alternativas ambíguas.
7. Referências qualitativas são preservadas, mas **não geram classificação automática** sem regra qualitativa homologada (bloco 14).
8. Marcadores originais do laboratório (H, L, ↑, ↓ ou equivalentes) são preservados como dado original e **não** se transformam sozinhos em classificação oficial da LI sem contrato aplicável.
9. A referência original do laudo **nunca** é sobrescrita por referência metodológica.

Consequência técnica (implementação futura): o modelo atual guarda `report_reference_text/min/max/operator/unit/population`; faltam `lower/upper_inclusive`, condições estruturadas e marcadores H/L — extensões a declarar; o motor precisa do motivo `ambiguous_reference`.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
