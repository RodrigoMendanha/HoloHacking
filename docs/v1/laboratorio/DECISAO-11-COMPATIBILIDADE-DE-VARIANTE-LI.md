# DECISÃO 11 — COMPATIBILIDADE DE VARIANTE

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 11 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

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

**DECISÃO (Bloco 11 — compatibilidade de variante):**
- Regra conservadora: **variantes diferentes são incompatíveis até existir declaração explícita de compatibilidade.**
- Nenhuma equivalência é inferida por nome parecido, alias, unidade, legado ou categoria.
- Casos explícitos: `LAB-016 PCR variant = null` ≠ `LAB-016 PCR variant = ultrassensivel`; `LAB-021 Magnésio variant = null` ≠ `LAB-021 Magnésio variant = eritrocitario`.
- **Não modelar como "variante"** informações que já fazem parte do exame canônico: LAB-031 T4 livre, LAB-032 T3 livre, LAB-037 Testosterona livre, LAB-038 Testosterona total já distinguem as entidades por `exam_code`. **Não recriar** "Testosterona total + variant=livre" ou estruturas semanticamente duplicadas.
- Hierarquia conceitual: `exam_code` → `variant` opcional → `material` opcional → `method` opcional.
- 25-OH vitamina D (LAB-035) permanece distinta de outras formas de vitamina D (que não são variantes dela).

Consequência técnica: comportamento atual (`incompatible_variant`; identidade por exame+variante+material) já é compatível; uma futura tabela de equivalências só por migration aprovada.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
