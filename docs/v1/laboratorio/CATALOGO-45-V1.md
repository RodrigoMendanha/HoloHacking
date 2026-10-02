# CATÁLOGO-BASE LABORATORIAL V1 — 45 EXAMES

Etapa 5 · versão `catalogo-lab-v1.0` · fonte executável: `laboratorio-catalogo.js` (= seed de `public.lab_exam_catalog`, migration `20261001220000`; o teste `testar-v1-etapa5-motor.mjs` prova que as duas cópias são idênticas).

**O catálogo não é painel obrigatório.** A existência dos 45 não significa que todos devem ser solicitados, preenchidos, que formam painel universal, que ausência é alteração, que são obrigatórios em primeira consulta ou retorno, nem que um sistema HOLOSCAN precisa deles. A profissional seleciona os pertinentes. Não existe "checklist dos 45".

**Nenhum exame tem**: referência ideal, faixa funcional, unidade oficial, conversão, vínculo com sistema HOLOSCAN, domínio da Leitura Integrada, score ou interpretação. Tudo isso é decisão metodológica futura (`HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`).

**Catálogo global, somente leitura**: o frontend não edita; mudar o catálogo-base exige migration versionada (trigger `proteger_catalogo_laboratorial`).

| Código | Nome canônico | Categoria | Aliases (só localização/identidade) |
|---|---|---|---|
| LAB-001 | Hemograma completo (composto: componentes em `lab_result_components`) | Hematologia | — |
| LAB-002 | Glicemia de jejum | Glicêmico | — |
| LAB-003 | Insulina basal | Glicêmico | — |
| LAB-004 | Hemoglobina glicada | Glicêmico | HbA1c |
| LAB-005 | Triglicerídeos | Lipídico | — |
| LAB-006 | Colesterol total | Lipídico | — |
| LAB-007 | LDL colesterol | Lipídico | — |
| LAB-008 | LDL oxidada | Lipídico especializado | — |
| LAB-009 | HDL colesterol | Lipídico | — |
| LAB-010 | Creatinina | Renal | — |
| LAB-011 | Ureia | Renal | — |
| LAB-012 | TGO ou AST | Hepático | TGO, AST |
| LAB-013 | TGP ou ALT | Hepático | TGP, ALT |
| LAB-014 | Bilirrubina total | Hepático | — |
| LAB-015 | Gama GT ou GGT | Hepático | Gama GT, GGT |
| LAB-016 | PCR | Inflamação | Proteína C reativa |
| LAB-017 | Homocisteína | Investigação contextual | — |
| LAB-018 | Fibrinogênio | Investigação contextual | — |
| LAB-019 | Sódio | Eletrólitos | — |
| LAB-020 | Potássio | Eletrólitos | — |
| LAB-021 | Magnésio | Minerais | — |
| LAB-022 | Zinco | Minerais | — |
| LAB-023 | Selênio | Minerais | — |
| LAB-024 | Fósforo | Minerais | — |
| LAB-025 | Vitamina B12 | Vitaminas | — |
| LAB-026 | Ácido fólico | Vitaminas | — |
| LAB-027 | Alumínio | Elementos especializados | — |
| LAB-028 | Ferro sérico | Ferro | — |
| LAB-029 | Ferritina | Ferro | — |
| LAB-030 | TSH | Tireoide | — |
| LAB-031 | T4 livre | Tireoide | — |
| LAB-032 | T3 livre | Tireoide | — |
| LAB-033 | Ácido úrico | Metabólico | — |
| LAB-034 | Paratormônio ou PTH | Metabolismo mineral | Paratormônio, PTH |
| LAB-035 | 25 OH vitamina D | Vitaminas | Vitamina D 25-OH, 25-hidroxivitamina D |
| LAB-036 | DHT | Hormonal | Di-hidrotestosterona |
| LAB-037 | Testosterona livre | Hormonal | — |
| LAB-038 | Testosterona total | Hormonal | — |
| LAB-039 | SHBG | Hormonal | — |
| LAB-040 | Progesterona | Hormonal | — |
| LAB-041 | Estradiol | Hormonal | — |
| LAB-042 | LH | Hormonal | — |
| LAB-043 | FSH | Hormonal | — |
| LAB-044 | CK | Muscular | Creatina quinase, Creatinoquinase |
| LAB-045 | Cálcio ionizado sérico | Metabolismo mineral | Cálcio iônico |

Validação automática: `base_catalog_count = 45`, códigos únicos = 45, nomes canônicos únicos = 45 (JS, SQL e teste).

## Aliases

Alias serve só para localizar/identificar. Nunca altera variante, método, material, referência ou unidade. A busca é por inclusão textual simples; havendo mais de um candidato (ex.: "LDL" → LDL colesterol, LDL oxidada), a escolha é humana. Não existe fuzzy matching clínico.

## Variantes que o catálogo NÃO achata

- **PCR ≠ PCR ultrassensível**: `exam = LAB-016`, `variant = ultrassensivel`. Comparação entre PCR sem variante e PCR-us não é automática (`incompatible_variant`).
- **Magnésio ≠ Magnésio eritrocitário**: `exam = LAB-021`, `variant = eritrocitario`; material fica explícito quando conhecido (nunca inventado). Comparação entre os dois não é automática.

## Fora dos 45 (legado preservado, sem regra)

Candida albicans IgG, VHS, HOMA-IR e Cortisol matinal (EXA-001, EXA-003, EXA-007, EXA-024 do legado): ficam como `additional_legacy` nos resultados antigos, visíveis no histórico, sem associação, faixa, Leitura Integrada, score ou interpretação. HOMA-IR, LDL calculado e outras fórmulas: só com cálculo derivado aprovado (`lab_derived_calculations`, vazia).

## Exame customizado

Fora dos 45, por nutricionista (`lab_custom_exams`: id, nutritionist_id, nome, aliases, observação, status, created_at/by). Não vira item global, não ganha regra, referência automática nem vínculo com HOLOSCAN. Não conta nos 45.
