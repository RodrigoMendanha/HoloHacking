# DECISÃO 17 — NÚMERO/CONJUNTO MÍNIMO DE EXAMES

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 17 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02 e do bloco 16.

> **DECIDIDO — Etapa 5.8 (arquitetura) e 5.13 (valores por domínio), Daniel, 02/10/2026.** Mínimos, exames obrigatórios e grupos obrigatórios registrados abaixo. **Ainda não é**: implementação, migration, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. O motor LI não está implementado.

## Pergunta (como no pacote)

**Além da contagem (bloco 16), há exames obrigatórios por domínio (sem os quais o domínio não é avaliável) e qual é esse conjunto?**

## Estado atual

Não existe "obrigatório" no vínculo (extensão pequena: flag `required`). O catálogo **não é painel obrigatório** (decisão 68). Nenhum conjunto mínimo existe.

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

## Opções

| Opção | Consequência |
|---|---|
| (a) nenhum obrigatório | só a contagem do bloco 16 decide |
| (b) obrigatórios por domínio (flag `required` no vínculo) | domínio sem o obrigatório → `sem_dados_suficientes` mesmo com N alto; precisa de fonte por obrigatório |
| (c) grupos alternativos ("um de A ou um de B") | extensão maior; mais explicação |
| (d) pesos de suficiência diferentes por exame | **não inventar pesos**; se existirem, cada peso é decisão com fonte |

## Conflitos / incompatíveis

Tratar ausência de obrigatório como alteração; gerar solicitação de exame (Conduta não gera pedido); listas herdadas do legado.


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 17 — mínimos, conjuntos e grupos obrigatórios): DECIDIDO.** Regras de contagem da Etapa 5.8 mantidas (hemograma = 1 posição; componentes não inflam; repetido = 1 posição; multi-domínio conta 1× por domínio; não classificável não conta; pesos não assumidos). Contam para os mínimos **somente** resultados de vínculos `directional` elegíveis e classificáveis; `contextual` **não** conta para a suficiência cross-source na V1 (poderá contar apenas se uma regra futura e versionada do domínio o determinar).

| Domínio | min_classifiable_results | required_exam_codes (obrigatórios) | required_exam_groups | optional_directional_exam_codes |
|---|---|---|---|---|
| LI-D01 | 1 | LAB-016 | — | LAB-018 |
| LI-D02 | 2 | — | GLYCEMIC_ANCHOR = {LAB-002 OU LAB-004} (pelo menos um) | — |
| LI-D03 | 2 | LAB-005, LAB-009 | — | — |
| LI-D04 | 2 | LAB-013, LAB-015 | — | — |
| LI-D05 | null | [] | [] | — |
| LI-D06 | null | [] | [] | — |
| LI-D07 | null | [] | [] | — |

**Grupo GLYCEMIC_ANCHOR (D02):** obrigatório possuir pelo menos 2 resultados directional classificáveis **e** pelo menos um deles ser LAB-002 ou LAB-004. LAB-003 Insulina basal nunca resolve D02 isoladamente.

**Exame obrigatório ausente ou não classificável:** SEM DADOS SUFICIENTES com reason code conforme a causa real (`missing_required_exam`, `missing_reference`, `ambiguous_reference`, `incompatible_unit`, `outside_time_window`, `missing_clinical_date`, `duplicate_result_unresolved` etc.). Nenhum contextual substitui exame obrigatório.

**D05/D06/D07:** `cross_source_sufficiency_mode = not_applicable`; valores nulos/vazios não significam insuficiência nem `missing_domain_holoscan_mapping`.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 16–21 e no Documento Mestre (um exame isolado não resolve; nenhum percentual global; nenhuma maioria/média/score; misto sem resolução determinística = sem dados suficientes). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
