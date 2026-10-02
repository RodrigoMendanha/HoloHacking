# DECISÃO 22 — REGRA FORMAL DE SEM DADOS SUFICIENTES

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 22 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 03–19 (que já produzem motivos).

> **DECIDIDO — Etapa 5.9 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma tabela domínio → sistema, regra de direção, parâmetro ou texto específico por domínio foi criado.

## Pergunta (como no pacote)

**Confirmar a lista fechada de motivos que forçam `sem_dados_suficientes` e se algum motivo deve ser exibido de forma diferente.**

## Estado atual

Motivos do motor hoje: `sem_regra_homologada`, `sem_associacao_aprovada`, `sem_referencia_utilizavel`, `fonte_ausente`, `incompatibilidade_temporal`, `dados_mistos_sem_regra`, `holoscan_nao_avaliavel`, `unidade_incompativel`. **Único estado real** hoje. Servidor recusa salvar convergente/divergente sem vínculo aprovado em pacote aprovado.

Motivos já nomeados pelas DECISÕES 07–19 (vocabulário a unificar na implementação): `missing_exam`, `missing_reference` / `missing_applicable_reference`, `not_classifiable`, `not_eligible`, `outside_time_window`, `incompatible_unit`, `incompatible_variant`, `incompatible_material`, `incompatible_method`, `ambiguous_reference`, `qualitative_rule_missing`, `censored_value_ambiguous`, `mixed_without_rule`; e, do bloco 3, compatibilidade de versão HOLOSCAN não declarada; do bloco 6, `result_id` não selecionado em duplicidade.

## Invariantes já decididos que valem aqui

- Um exame fora da referência **não basta** automaticamente para convergência (Mestre; DECISÕES 02, 19).
- Divergência **não invalida** o HOLOSCAN nem o exame.
- Ausência de uma fonte (aplicação não avaliável, coleta inelegível, sem referência, fora da janela, suficiência não atingida, misto sem regra) → `sem_dados_suficientes`, **nunca** divergente.
- A relação domínio LI → sistema(s) HOLOSCAN só existe por **regra explicitamente homologada** (DECISÃO 01, regra 3); nenhuma relação é inferida pelo nome.
- Direção `above/below/any` do vínculo (DECISÃO 02) indica só o lado da referência que pode participar; não é gravidade nem estado.

## Opções (sem decidir)

| Opção | Consequência |
|---|---|
| (a) confirmar a lista unificada (motor + DECISÕES 07–19) como fechada, com rótulos neutros | vocabulário único para os três eixos; trace e tela coerentes |
| (b) acrescentar motivos específicos (ex.: `holoscan_version_incompatible`, `duplicate_result_unselected`, `required_exam_missing`, `coverage_below_rule`) | cobre blocos 3, 6, 16–17 explicitamente |
| (c) agrupar motivos em famílias na tela (fonte / regra / referência / compatibilidade / suficiência / mistos / temporal) | legibilidade sem perder o motivo técnico |
| (d) ordem de precedência explícita (qual motivo aparece primeiro quando há vários) | determinismo na exibição |

## Incompatíveis

Qualquer caminho em que a falta de peça produza convergente/divergente; "divergente por falta"; colapsar tudo em "faltando" (DECISÃO 18).


## Precedência obrigatória do motor LI (regra estrutural oficial, Etapa 5.9)

Antes de avaliar CONVERGENTE ou DIVERGENTE, o motor executa nesta ordem lógica: (1) validar aplicação HOLOSCAN; (2) validar pacote/versão compatível; (3) validar temporalidade; (4) validar vínculos metodológicos; (5) validar resultados laboratoriais; (6) validar referências/unidades/contexto; (7) validar suficiência do domínio; (8) resolver resultados mistos; (9) derivar direção do HOLOSCAN; (10) derivar direção laboratorial; (11) somente então determinar o estado da LI. **SEM DADOS SUFICIENTES tem precedência** quando qualquer requisito necessário não estiver atendido. **CONVERGENTE e DIVERGENTE nunca são fallback.**

## Direções internas conceituais (nomenclatura metodológica interna)

`attention_present` · `attention_not_detected` · `indeterminate`. **Não** são diagnóstico, score, prognóstico, "doente"/"saudável", nem são mostradas ao paciente como termos técnicos. Existem só para permitir comparação determinística entre fontes. Campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 22 — regra formal de SEM DADOS SUFICIENTES):** estado **oficial**, com **precedência** sempre que os requisitos para CONVERGENTE ou DIVERGENTE não forem atendidos. Não é erro técnico, não é resultado "negativo", não é ausência de doença, não é divergência.

**Motivos (lista explícita de `reason_codes`, nunca colapsados em "faltam dados"):** `missing_holoscan_source`, `holoscan_not_evaluable`, `incompatible_holoscan_version`; `missing_lab_source`, `insufficient_domain_coverage`, `missing_required_exam`; `missing_reference`, `ambiguous_reference`; `qualitative_rule_missing`, `censored_value_ambiguous`; `incompatible_unit`, `incompatible_variant`, `incompatible_material`, `incompatible_method`; `outside_time_window`, `missing_clinical_date`; `mixed_without_rule` (conjunto sem regra homologada — cenário futuro); `mixed_results_indeterminate` (Etapa 6.0: mistura real present + not_detected sob regra homologada); `directional_result_indeterminate` (Etapa 6.0.1: participante directional com direção indeterminada, sem exceção específica); `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`; `duplicate_result_unresolved`; e outros já aprovados que sejam semanticamente distintos (`missing_exam`, `not_classifiable`, `not_eligible`, `missing_applicable_reference`).

**Explicabilidade:** SEM DADOS SUFICIENTES sempre apresenta domínio; motivo(s); elemento(s) afetado(s); o que foi excluído; por que foi excluído; regra/versão aplicável quando existir.

Consequência técnica: unificação do vocabulário de motivos do motor (hoje 8 códigos em português) com a lista acima, na implementação em lote.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 20–25 e no Documento Mestre (um exame fora não basta; divergência não invalida fonte; ausência não é divergência; sem score; leitura salva congelada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
