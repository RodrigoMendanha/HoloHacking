# DECISÃO 16 — SUFICIÊNCIA MÍNIMA POR DOMÍNIO

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 16 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 01 (domínios), 02 (vínculos: D01 7 · D02 3 · D03 5 · D04 4 · D05 4 · D06 12 · D07 12 = 47 pares; contagem corrigida na Etapa 5.10 a partir da matriz), 04, 06, 09.

> **DECIDIDO — Etapa 5.8 (arquitetura) e 5.13 (parâmetros por domínio), Daniel, 02/10/2026.** Suficiência cross-source por domínio registrada abaixo (somente vínculos `directional`; sem percentual global; D05/D06/D07 `not_applicable`). **Ainda não é**: implementação, migration, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. O motor LI não está implementado.

## Pergunta (como no pacote)

**A partir de quantos resultados classificáveis (ou de qual fração dos exames vinculados) um domínio é avaliável?** Valor em branco.

## Estado atual

Regra `sufficiency` (`payload.min_results`, global ou por domínio): **0 linhas**; sem ela, `sem_regra_homologada`. Fração/percentual não existe no motor (extensão pequena). Trace: `sufficiency = { min_results, included }`. Com os vínculos da DECISÃO 02, o denominador potencial por domínio varia de 3 (D02) a 13 (D06).

## O que o material permite decidir (sem escolher)

- o que conta como **resultado utilizável** (classificável individualmente? elegível para a LI? só os dois?);
- **quantidade ou cobertura mínima** (absoluta, fração, ou conjunto específico);
- se a regra **varia por domínio**;
- como tratar resultado **não classificável** (DECISÃO 09: não conta para convergente/divergente, não invalida domínio);
- como tratar **ausência** (exame vinculado sem resultado na coleta);
- como tratar exames **vinculados mas não medidos**;
- como tratar **multi-domínio** (B12, Ácido fólico, Ferro, Ferritina, PTH contam em cada domínio?);
- se todos os exames têm o **mesmo peso** de suficiência;
- se existe **conjunto mínimo obrigatório**;
- se a suficiência depende apenas de **contagem** ou de **exames específicos**.

**Nenhum corte é sugerido** (nem 1 exame, 50%, 70%, 80%, 100%). O legado "um exame fora da referência basta" **não é regra oficial**.

## Arquiteturas (valores em branco)

| Arquitetura | Regra | Consequência matemática |
|---|---|---|
| (A) mínimo absoluto global | `min_results = ___` | igual para D02 (3 pares) e D06 (13); um mínimo alto inviabiliza domínios pequenos |
| (B) mínimo absoluto por domínio | `min(Dxx) = ___` ×7 | 7 valores a homologar |
| (C) fração dos vinculados | `___ %` por domínio | depende de como ausentes (bloco 18) entram no denominador; extensão do payload |
| (D) conjunto obrigatório + mínimo | bloco 17 + (A)/(B) | — |
| (E) utilizável = só classificável individualmente | define o numerador | não classificáveis (blocos 9, 14, 15) saem da contagem |

Em todas: N utilizáveis < mínimo → `sem_dados_suficientes`. Um domínio com 1 exame e `min = 1` reproduziria o legado — só por decisão explícita.


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 16 — suficiência por domínio): DECIDIDO.** Arquitetura da Etapa 5.8 mantida (regra própria, explícita e versionada por domínio; trace com encontrados/elegíveis/classificáveis/excluídos; sem corte universal; suficiência por domínio, nunca global).

**Princípio geral de suficiência (aprovado por Daniel):** a suficiência cross-source usa **somente** vínculos `cross_source_role = directional`. Vínculos `contextual` **não** aumentam artificialmente a cobertura cross-source, **não** substituem exame directional obrigatório, **não** tornam o domínio suficiente sozinhos, **não** criam direção laboratorial e **não** criam convergência/divergência. Continuam visíveis, classificáveis quando possível, rastreáveis, disponíveis para interpretação profissional e pertencendo normalmente ao domínio.

**Não existe percentual global:** a V1 **não** adota 50%, 60%, 70%, 80%, 100% ou qualquer percentual global como regra universal de suficiência laboratorial. Cada domínio possui regra própria.

**Modelo conceitual:** `cross_source_sufficiency_mode` ∈ {`rule_based`, `not_applicable`}. Quando `rule_based`, podem existir `min_classifiable_results`, `required_exam_codes`, `required_exam_groups`, `optional_directional_exam_codes`. Nomes conceituais; **não** são implementação nesta etapa.

**Duas coisas distintas:** (1) `lab_domain_availability` — o domínio possui resultados laboratoriais válidos e classificáveis; (2) `cross_source_sufficiency` — o domínio atende à regra para confronto com HOLOSCAN. Um domínio pode ter muitos resultados válidos e classificáveis e ainda assim `cross_source_sufficiency = not_applicable`, quando não possui confronto HOLOSCAN na V1 (D05/D06/D07).

### Parâmetros por domínio

| Domínio | holoscan_mapping_mode | cross_source_sufficiency_mode | directional | regra de suficiência | min_classifiable_results | required_exam_codes | required_exam_groups | optional_directional_exam_codes |
|---|---|---|---|---|---|---|---|---|
| LI-D01 | `acido_inflamatorio` | `rule_based` | LAB-016, LAB-018 | **LAB-016 PCR é OBRIGATÓRIA** | 1 | LAB-016 | — | LAB-018 |
| LI-D02 | `metabolico` | `rule_based` | LAB-002, LAB-003, LAB-004 | ≥ 2 directional classificáveis **e** pelo menos um deles LAB-002 ou LAB-004 | 2 | — | GLYCEMIC_ANCHOR = {LAB-002 OU LAB-004} | — |
| LI-D03 | `metabolico` | `rule_based` | LAB-005, LAB-009 | ambos obrigatórios e classificáveis | 2 | LAB-005, LAB-009 | — | — |
| LI-D04 | `detox_linfatico` | `rule_based` | LAB-013, LAB-015 | ambos obrigatórios e classificáveis | 2 | LAB-013, LAB-015 | — | — |
| LI-D05 | `none` | `not_applicable` | nenhum | sem confronto cross-source na V1 | null | [] | [] | — |
| LI-D06 | `none` | `not_applicable` | nenhum | sem confronto cross-source na V1 | null | [] | [] | — |
| LI-D07 | `none` | `not_applicable` | nenhum | sem confronto cross-source na V1 | null | [] | [] | — |

**D01 — consequências.** Se a PCR estiver presente, elegível, temporalmente compatível, com referência aplicável, unidade compatível e classificável, D01 satisfaz a suficiência mínima cross-source. Fibrinogênio complementa a direção se classificável; não é obrigatório; sua ausência não torna D01 insuficiente. Se a PCR não for classificável ou faltar: D01 = SEM DADOS SUFICIENTES, com reason code conforme a causa real (`missing_required_exam`, `missing_reference`, `ambiguous_reference`, `incompatible_unit`, `outside_time_window`, `missing_clinical_date` etc.). Não usar contextual para substituir a PCR.

**D02 — casos.** SUFICIENTE estruturalmente: LAB-002 + LAB-004; LAB-002 + LAB-003; LAB-004 + LAB-003; LAB-002 + LAB-003 + LAB-004. INSUFICIENTE: somente LAB-002; somente LAB-003; somente LAB-004; LAB-003 sem LAB-002/LAB-004. **Insulina nunca resolve D02 isoladamente.**

**D03.** Se apenas um de LAB-005/LAB-009 estiver disponível/classificável: SEM DADOS SUFICIENTES. Contextuais LAB-006, LAB-007, LAB-008 não substituem LAB-005 ou LAB-009.

**D04.** Se apenas um de LAB-013/LAB-015 estiver disponível/classificável: SEM DADOS SUFICIENTES. Contextuais LAB-012 AST e LAB-014 Bilirrubina total não substituem ALT ou GGT.

**D05 / D06 / D07.** `holoscan_mapping_mode = none`; `cross_source_sufficiency_mode = not_applicable`; `min_classifiable_results = null`; `required_exam_codes = []`; `required_exam_groups = []`. Não tratar como suficiente automaticamente, nem como insuficiente, nem como `missing_domain_holoscan_mapping`. Não existe confronto cross-source nesses domínios na V1; os resultados laboratoriais continuam normalmente disponíveis. Não marcar como insuficiente simplesmente pela ausência de mapeamento.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 16–21 e no Documento Mestre (um exame isolado não resolve; nenhum percentual global; nenhuma maioria/média/score; misto sem resolução determinística = sem dados suficientes). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
