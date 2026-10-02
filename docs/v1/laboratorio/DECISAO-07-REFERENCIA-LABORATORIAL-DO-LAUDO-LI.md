# DECISÃO 07 — REFERÊNCIA LABORATORIAL DO LAUDO

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 7 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
