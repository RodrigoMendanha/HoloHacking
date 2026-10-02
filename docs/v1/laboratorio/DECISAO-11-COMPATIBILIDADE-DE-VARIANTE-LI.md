# DECISÃO 11 — COMPATIBILIDADE DE VARIANTE

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 11 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta

**Quando duas variantes do mesmo exame são a mesma identidade para fins de vínculo, referência, classificação e comparação longitudinal — e quando não?**

**Não inferir equivalência.**

## Estado atual

`variant` explícita por resultado; identidade única por (exame, variante, material); referência que declara variante diferente → `incompatible_variant`; vínculo pode fixar variante ou aceitar qualquer (`variant = null`). DECISÃO 02: PCR e PCR-us são vínculos **distintos** em D01; Magnésio e Magnésio eritrocitário são vínculos **distintos** em D06 (referências/materiais/métodos não se fundem).

## Casos obrigatórios (levantamento, sem decidir)

| Caso | Situação no catálogo | O que decidir |
|---|---|---|
| PCR vs PCR ultrassensível (LAB-016) | mesmo `exam_code`, `variant = ultrassensivel` | já decidido como vínculos distintos (DECISÃO 02); falta: comparação longitudinal entre as duas? referência própria por variante? |
| Magnésio sem variante vs eritrocitário (LAB-021) | mesmo `exam_code`, `variant = eritrocitario` | idem |
| T4 livre (LAB-031) | item próprio no catálogo (não há "T4 total" nos 45) | se um laudo trouxer T4 total, é outro exame (fora do catálogo) ou variante? |
| T3 livre (LAB-032) | idem | idem para T3 total |
| Testosterona livre (LAB-037) vs total (LAB-038) | **dois itens distintos** no catálogo | confirmar que nunca se fundem nem se comparam entre si |
| 25-OH vitamina D (LAB-035) | item próprio | 1,25-(OH)2 vitamina D é outro analito (fora dos 45): não é variante |
| outras variantes que surjam no laudo | texto livre em `variant` | vocabulário controlado? lista de variantes aceitas por exame? |

## Opções (sem decidir)

(a) variantes sempre identidades distintas (como hoje); (b) vínculo aceita qualquer variante (`null`) mas comparação longitudinal continua por variante; (c) tabela de equivalências aprovadas (extensão, com fonte); (d) vocabulário controlado de variantes por exame (extensão).

## O que fica bloqueado enquanto aberto

Nada tecnicamente (default = (a)).

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
