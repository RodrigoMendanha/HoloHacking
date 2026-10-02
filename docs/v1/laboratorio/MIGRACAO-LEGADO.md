# MIGRAÇÃO DETERMINÍSTICA DO LEGADO LABORATORIAL

Etapa 5 · migration `20261001220000` (NÃO aplicada) · mapeamento em `laboratorio-catalogo.js` (`MAPA_LEGADO`) e no SQL (CTE `mapa`). Provado em PostgreSQL local (`supabase/tests/etapa5-harness.sql`, L24–L27) e no servidor falso.

## Regras

1. **Nenhum resultado antigo é perdido.** As colunas legado (`exame_id`, `valor`, `unidade_no_momento`, `ideal_*_no_momento`, `nome_exame_no_momento`, `sistema_no_momento`) ficam na linha e são copiadas para `legacy_exame_id`, `legacy_ideal_min/max`, `legacy_sistema`.
2. `value_original_text = valor::text`, `numeric_value = valor`, `qualifier = eq`, `unit_original = unidade_no_momento`, `reference_status = missing` (o legado **nunca** guardou referência do laudo; o ideal não é referência).
3. Mapeamento para o catálogo-base **só onde a identidade é inequívoca**; variante preservada; material nunca inventado.
4. O que não puder ser provado: preservar original + `requires_manual_mapping = true` + `mapping_note`. Não adivinhar.
5. Coletas antigas: `source = legacy_panel`, `state = salvo` (foram confirmadas pelo servidor na época). O painel legado continua editando só essas.

## Tabela de mapeamento (24 EXA-*)

| EXA (legado) | Nome legado | Destino V1 | Variante | Observação |
|---|---|---|---|---|
| EXA-001 | Candida albicans IgG | **additional_legacy** (fora dos 45) | — | sem regra, sem faixa, visível no histórico |
| EXA-002 | PCR ultrassensivel | LAB-016 PCR | `ultrassensivel` | **não** vira PCR simples; comparação com PCR sem variante não é automática |
| EXA-003 | VHS | **additional_legacy** | — | — |
| EXA-004 | Acido urico | LAB-033 | — | — |
| EXA-005 | Glicemia de jejum | LAB-002 | — | — |
| EXA-006 | Insulina de jejum | **requires_manual_mapping** (sugestão: LAB-003 Insulina basal) | — | identidade não provada: confirmar humanamente |
| EXA-007 | HOMA-IR | **additional_legacy** | — | cálculo derivado: só com `lab_derived_calculations` aprovada |
| EXA-008 | Hemoglobina glicada | LAB-004 | — | — |
| EXA-009 | Triglicerideos | LAB-005 | — | — |
| EXA-010 | HDL | LAB-009 | — | — |
| EXA-011 | TSH | LAB-030 | — | — |
| EXA-012 | T4 livre | LAB-031 | — | — |
| EXA-013 | TGO (AST) | LAB-012 | — | alias |
| EXA-014 | TGP (ALT) | LAB-013 | — | alias |
| EXA-015 | GGT | LAB-015 | — | alias |
| EXA-016 | Bilirrubina total | LAB-014 | — | — |
| EXA-017 | Ureia | LAB-011 | — | — |
| EXA-018 | Creatinina | LAB-010 | — | — |
| EXA-019 | Vitamina D (25-OH) | LAB-035 | — | alias |
| EXA-020 | Vitamina B12 | LAB-025 | — | — |
| EXA-021 | Ferritina | LAB-029 | — | — |
| EXA-022 | Magnesio eritrocitario | LAB-021 Magnésio | `eritrocitario` | material **não** inventado (fica nulo); comparação com Mg sem variante não é automática |
| EXA-023 | Homocisteina | LAB-017 | — | — |
| EXA-024 | Cortisol matinal | **additional_legacy** | — | — |

Qualquer `exame_id` fora desta tabela: preservado, `legacy_migrated`, `requires_manual_mapping`, nota "exame legado sem mapeamento provado".

## O que NÃO acontece

- Nenhum `ideal_*` vira referência oficial.
- Nenhum `sistema_no_momento` vira domínio da Leitura Integrada ou vínculo exame → sistema.
- PCR ultrassensível não vira PCR; Magnésio eritrocitário não vira Magnésio genérico.
- Os 4 fora dos 45 não entram no catálogo-base, não ganham associação, faixa, leitura, score nem interpretação.

## Banco real

A migração só rodou em PostgreSQL local (BEGIN/ROLLBACK) e no servidor falso. **Validação real pendente** (sem conexão direta autorizada). Antes de aplicar em produção: validar a cadeia 130000→220000 no Supabase, em BEGIN/ROLLBACK, e conferir a contagem de linhas de `lab_results` antes/depois (nenhuma perdida; `value_original_text` preenchido em 100%; `requires_manual_mapping` listado).
