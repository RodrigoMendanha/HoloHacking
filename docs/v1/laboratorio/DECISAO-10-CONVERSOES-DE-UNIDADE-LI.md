# DECISÃO 10 — CONVERSÕES DE UNIDADE

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 10 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO QUANTO À ARQUITETURA — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

## Pergunta

**Quais conversões de unidade (se alguma) a V1 aprova, com que contrato, e o que acontece sem conversão?**

Hoje: **0 conversões aprovadas**. Nenhuma é criada aqui.

## Estado atual

`lab_unit_conversion_rules`: `exam_code` (analito, opcional), `from_unit`, `to_unit`, `factor`, `source`, `rule_version`, `status`, `responsible`, `approval_provenance`. Motor converte só com `status = aprovado` e registra no trace (valor/unidade original e convertido, versão); sem regra → `incompatible_unit` (DECISÃO 04 regra 12: bloqueia só aquele resultado). Entra no hash do pacote via dependência.

## Contrato (levantamento)

| Campo | Observação |
|---|---|
| analito + variante | o fator pode depender do analito (massa ↔ molar) e, para algumas variantes, não ser transferível; `variant` **não existe** na tabela hoje (extensão se exigido) |
| unidade origem / destino | texto exato; variações ortográficas ("mg/dl" vs "mg/dL") não são conversão |
| fator / fórmula | multiplicativo hoje (`factor`); fórmula não linear exigiria extensão |
| versão, fonte, aprovação | existem |

## Opções (sem decidir)

(a) nenhuma conversão na V1 (igualdade textual de unidade exigida); (b) lista fechada por analito/variante, por migration, com fonte; (c) normalização apenas ortográfica de unidade (não é conversão; decisão própria); (d) (b)+(c).

## O que fica bloqueado enquanto aberto

Classificação e comparação entre unidades diferentes.


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

**DECISÃO (Bloco 10 — conversões de unidade, arquitetura):**
- Conversão só existe com **regra homologada**. Contrato conceitual: `exam_code`; `variant` quando pertinente; `material` quando pertinente; `unit_from`; `unit_to`; `factor` **ou** `formula`; `conditions`; `source`; `version`; `approval`.
- Sempre preservar `original_value` e `original_unit`; quando uma conversão homologada for executada, registrar `converted_value`, `converted_unit`, `conversion_rule_id/version`. **Nunca substituir silenciosamente o valor original.**
- Hoje: **0 conversões aprovadas**. Nesta versão documental, unidade incompatível sem conversão homologada → classificação/comparação **bloqueada** para aquele resultado, conforme o contrato aplicável.
- **Não criar fatores nesta etapa. Não inferir conversão** porque duas unidades parecem matematicamente conversíveis.

Consequência técnica: `lab_unit_conversion_rules` não tem `variant`, `material`, `formula` nem `conditions` — extensões a declarar na implementação; o trace do motor já guarda original/convertido/versão.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO QUANTO À ARQUITETURA — não implementado, não registrado no banco, não homologado.
