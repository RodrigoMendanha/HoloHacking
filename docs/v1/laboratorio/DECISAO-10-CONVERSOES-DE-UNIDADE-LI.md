# DECISÃO 10 — CONVERSÕES DE UNIDADE

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 10 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
