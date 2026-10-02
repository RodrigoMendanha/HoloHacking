# DECISÃO 13 — COMPATIBILIDADE DE MÉTODO

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 13 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
