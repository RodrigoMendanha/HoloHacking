# DECISÃO 22 — REGRA FORMAL DE SEM DADOS SUFICIENTES

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 22 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 03–19 (que já produzem motivos).

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhuma regra clínica deduzida do legado; nenhuma relação domínio LI → sistema HOLOSCAN criada; nenhum score, peso, corte ou bibliografia. Campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
