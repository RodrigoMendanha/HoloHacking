# REFERÊNCIAS, UNIDADES, CÁLCULOS DERIVADOS E MOTOR LABORATORIAL — V1

Etapa 5 · `laboratorio-motor.js` (`motor-lab-1.0.0`) · migration `20261001220000`.

## 1. Referência do laudo (a única usada na V1)

É **a referência informada pelo laboratório/laudo**, digitada pela profissional no resultado: texto original, mínimo, máximo, operador (`range`, `<`, `≤`, `>`, `≥`), unidade, população quando o laudo diz. `reference_source = laudo`.

- Não preenchida → `reference_status = missing`. **Ausência de referência não significa "dentro"**: o motor devolve `not_classifiable / missing_reference`.
- A referência do laudo de uma coleta não se aplica a outra coleta. Dois resultados com referências diferentes mostram as duas (Evolução), sem assumir comparabilidade clínica plena.

## 2. Referência metodológica — infraestrutura SEPARADA e VAZIA

`lab_method_references`: `exam_code`, `variant`, `material`, `method`, `population`, `sex`, `age_min/max`, `context`, `lower/upper_bound`, `operator`, `unit`, `source`, `source_version`, `justification`, `effective_from/to`, `status` (`rascunho | em_revisao | aprovado | retirado`), `responsible`, `approval_provenance`, `content_hash`, `version`. CHECK: aprovado exige responsável, provenance, hash e vigência.

- **Nenhuma linha real.** Nenhum número foi inventado.
- A aplicação só lê (sem GRANT de escrita; sem botão de aprovação). Gestão técnica/interna por migration — nenhuma autoridade administrativa nova foi criada.
- O motor só usa referência metodológica com `status = aprovado` (`reference_not_approved` caso contrário).

## 3. "Ideal" legado

`ideal_min/ideal_max` de `exames.csv` e `lab_results.ideal_*_no_momento` (rascunho, "literatura funcional — revisar", sem fonte homologada): **removidos da saída oficial**. Preservados em `legacy_ideal_min/max` (provenance). Não aparecem como referência, não alimentam motor, Leitura Integrada, HOLOS AI nem relatório. O painel legado que ainda os mostra está rotulado "fora da saída oficial".

## 4. Unidades e conversões

`lab_unit_conversion_rules`: `exam_code` (opcional), `from_unit`, `to_unit`, `factor`, `source`, `rule_version`, `status`, `responsible`, `approval_provenance`. **Tabela real vazia** — nenhuma conversão foi inventada.

Motor: mesma unidade → compara; unidades diferentes sem regra **aprovada** → `not_classifiable / incompatible_unit` e comparação `lado_a_lado`. Com regra aprovada (provado só por `TEST_FIXTURE_ONLY`), o trace guarda `original_value`, `original_unit`, `converted_value`, `converted_unit`, `rule_version`.

## 5. Cálculos derivados

`lab_derived_calculations`: `code`, `formula`, `formula_version`, `inputs`, `required_units`, `criteria`, `source`, `status`, `responsible`, `approval_provenance`. **Vazia.** HOMA-IR, LDL calculado, razões, índices e scores **não** são ativados porque os componentes estão presentes.

## 6. Motor laboratorial — contrato

Entrada: resultado (`exam_code/custom`, `variant`, `material`, `method`, `value_original_text`, `unit_original`), referência aplicável (ou nula), opções (`conversoes` aprovadas). Saída: `classification` ∈ {`below`, `within`, `above`, `not_classifiable`}, `reason_codes`, `reference_source`, `trace` (motor, valor interpretado, referência, passos de conversão/comparação).

| Situação | Saída |
|---|---|
| valor numérico + referência compatível na mesma unidade | `below` / `within` / `above` (limites inclusivos; operadores `<`, `≤`, `>`, `≥` respeitados) |
| sem referência | `not_classifiable` · `missing_reference` |
| unidade diferente sem conversão aprovada | `not_classifiable` · `incompatible_unit` |
| referência declara variante/material diferentes | `not_classifiable` · `incompatible_variant` / `incompatible_material` |
| método relevante incompatível (`method_relevant`) | `not_classifiable` · `incompatible_method` |
| qualitativo sem regra | `not_classifiable` · `qualitative_without_rule` |
| censurado ("< 0,10") sem regra | `not_classifiable` · `censored_value` |
| referência metodológica não aprovada | `not_classifiable` · `reference_not_approved` |

Rótulos de tela: "abaixo/dentro/acima da referência informada", "não classificável — motivo". Nunca "normal", "alterado", "melhorou", "piorou".

**Proibido** (não existe no código): score de exames, nota laboratorial, índice laboratorial, "saúde 0–100", percentual de exames bons, agregação de exames heterogêneos.

## 7. Comparação entre resultados (Evolução)

Só com: mesmo exame (`exam_code`/custom), mesma variante, material compatível, método compatível quando relevante, unidade igual ou conversão aprovada, valores numéricos. Mostra anterior, atual, delta numérico, unidade e "aumentou/reduziu/permaneceu". Incompatível → lado a lado + motivo. Referências do laudo diferentes ficam visíveis. Nunca "melhorou/piorou/normalizou/agravou/respondeu ao tratamento". A seleção dos dois pontos é da profissional (filtro técnico mais antigo/mais recente/datas, fonte sempre visível); nunca por `updated_at`.
