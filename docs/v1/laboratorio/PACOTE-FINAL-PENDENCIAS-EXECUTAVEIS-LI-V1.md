# Pacote final — pendências executáveis da Leitura Integrada V1

Etapa 5.10 (reclassificado na 5.10.1) · 02/10/2026 · consolidação **sem preenchimento** das pendências executáveis da Leitura Integrada V1 · fonte dos números: matriz aprovada de `DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md` (reconferida programaticamente nesta etapa) · autoridade de nomes e blocos: `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA PREENCHIDO.** Todo campo marcado PENDENTE está vazio por decisão: nenhum valor, sistema, regra, corte, mínimo ou janela foi sugerido. Preencher é ato humano de Daniel (Aprovação 1) e Rodrigo (Aprovação 2). Este documento **não** implementa nada: migration, banco, servidor falso, motor, UI e pacote LI real permanecem intocados; LI-V1@1 segue rascunho com 0 aprovações.

## 1. Pendências classificadas (Etapa 5.10.1)

Três grupos. Só o grupo **A** significa "regra metodológica ainda indefinida". O grupo **B** é operacional. O grupo **C** não bloqueia: a decisão atual permite zero.

### A — Bloqueadores metodológicos para o motor LI oficial

| # | Bloco | Pendência | O que precisa ser entregue |
|---|---|---|---|
| A1 | 5 | Regra temporal exata | formato (global simétrica / anterior ≠ posterior / por domínio / por exame / exceção com revisão humana) e valor em dias; versionada no pacote LI |
| A2 | 16 | Suficiência D01–D07 | para cada domínio: `coverage_rule`, critério de suficiência e versão |
| A3 | 17 | Mínimos/conjuntos/grupos D01–D07 | para cada domínio: `min_classifiable_results`, `required_exam_codes`, `required_exam_groups` |
| A4 | 19 | Resultados mistos D01–D07 | para cada domínio: regra determinística para cada combinação de posições (§7) |
| A5 | 20/21 | Domínio LI → sistema(s) HOLOSCAN; regra HOLOSCAN → attention_*; múltiplos sistemas | para cada domínio: 0..N sistemas, regra de agregação quando N > 1, regra nota/faixa → `attention_present` / `attention_not_detected` / `indeterminate`, fonte |

Enquanto A1–A5 estiverem abertos, toda Leitura Integrada real é `sem_dados_suficientes` por regra ausente. **Esses são os bloqueadores centrais; nenhum outro bloco bloqueia o motor.**

### B — Gates operacionais / homologação / produção

Não são metodologia indefinida. Podem impedir a publicação ou a homologação real, mas a regra que dependem já está decidida ou é ato técnico.

| # | Gate | Estado |
|---|---|---|
| B1 | aplicar as migrations 20261002100000 e 20261002110000 (e a futura migration em lote da LI) após gate técnico | não aplicadas |
| B2 | validar a cadeia real do banco | VALIDAÇÃO REAL PENDENTE (sem conexão autorizada) |
| B3 | cadastrar o `auth.uid` real de Daniel em `methodology_approvers` (scope `integrated_reading`, etapa 1) | tabela vazia |
| B4 | cadastrar o `auth.uid` real de Rodrigo (etapa 2) | tabela vazia |
| B5 | Aprovação 1 (Daniel) sobre pacote, versão e `content_hash` | 0 aprovações |
| B6 | Aprovação 2 (Rodrigo), identidade distinta (quatro olhos) | 0 aprovações |
| B7 | Homologar (`homologar_pacote_li`) com completude válida e snapshot | não homologado |
| B8 | `content_hash` final conferido após a migration em lote | inexistente (pacote rascunho) |
| B9 | deploy | não feito |

**Bloco 30 — o que representa.** A governança técnica de dupla aprovação da LI **já foi estruturada** (Etapa 5.2: dependências, hash canônico, completude, aprovações append-only, invalidação, `homologar_pacote_li`, snapshots; Etapa 5.3: identidade real via `methodology_approvers`). O que permanece é **operacional** (B1–B9): migration não aplicada; tabela de aprovadores vazia; `auth.uid` reais não cadastrados. **Não é decisão metodológica dos Blocos 1–29** e não aparece no grupo A.

### C — Zero declarado / opcional / futuro (não bloqueia)

| # | Bloco | Decisão atual | Consequência enquanto zero |
|---|---|---|---|
| C1 | 8 | 0 referências metodológicas aprovadas é estado válido | a LI usa a referência aplicável do laudo (DECISÕES 07/09); sem referência → `not_classifiable` com motivo |
| C2 | 10 | 0 conversões aprovadas é estado válido | unidade incompatível → não classificável (`incompatible_unit`) |
| C3 | 14 | 0 regras qualitativas concretas é estado válido | qualitativo sem regra → não classificável (`qualitative_rule_missing`) |
| C4 | 26 | 0 cálculos derivados oficiais | nada calculado; nenhum derivado na LI |
| C5 | 27/28 | custom e `additional_legacy` ficam fora da LI automática | nada a decidir para implementar a V1 |
| C6 | 29 | mapeamento histórico de EXA-006 é caso a caso, com confirmação da profissional | **não** é preciso mapear todos os EXA-006 para implementar a V1 |
| C7 | 24 | traduções completas de reason_codes → texto ao paciente | pendência de acabamento/UI, desde que nenhuma informação enganosa seja exibida; não bloqueia o motor |
| C8 | 23 | textos por domínio | só se necessários; textos-base já decididos |

Nenhuma outra pendência metodológica real foi encontrada nos blocos 1–29.

## 2. Fichas por domínio

### LI-D01 — Hematológico e Inflamatório

1. **Código:** LI-D01
2. **Nome:** Hematológico e Inflamatório
3. **Definição (DECISÃO 01):** Organiza dados laboratoriais relacionados ao perfil hematológico e a marcadores laboratoriais utilizados na avaliação de processos inflamatórios.
4. **Exames vinculados (DECISÃO 02):** LAB-001 Hemograma completo (composto); LAB-016 PCR; LAB-018 Fibrinogênio; LAB-025 Vitamina B12; LAB-026 Ácido fólico; LAB-028 Ferro sérico; LAB-029 Ferritina
5. **Quantidade de exam_codes vinculados:** 7
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 8 (7 exam_codes + 1 variante(s) distinta(s))
7. **Variantes especiais:** LAB-016 PCR sem variante e `variant = ultrassensivel`: vínculos distintos no mesmo domínio (DECISÕES 02/11)
8. **Direções declaradas:** `above`: LAB-016 · `any`: LAB-001, LAB-018, LAB-025, LAB-026, LAB-028, LAB-029
9. **Exames sensíveis / observações:** LAB-001 Hemograma completo (composto): conta como 1 posição; componentes não inflam (DECISÃO 17); LAB-016 PCR: variante ultrassensível é vínculo distinto (DECISÃO 11)
10. **Exames multi-domínio neste domínio:** LAB-025 (LI-D01 + LI-D06), LAB-026 (LI-D01 + LI-D06), LAB-028 (LI-D01 + LI-D06), LAB-029 (LI-D01 + LI-D06) — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027 Alumínio, LAB-033 Ácido úrico, LAB-044 CK (sem domínio); EXA-003 VHS legado (`additional_legacy`, DECISÃO 28); PCR ultrassensível só pelo vínculo próprio da variante; custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

### LI-D02 — Glicêmico e Metabólico

1. **Código:** LI-D02
2. **Nome:** Glicêmico e Metabólico
3. **Definição (DECISÃO 01):** Organiza dados relacionados ao metabolismo da glicose, resposta insulínica e outros marcadores metabólicos pertinentes.
4. **Exames vinculados (DECISÃO 02):** LAB-002 Glicemia de jejum; LAB-003 Insulina basal; LAB-004 Hemoglobina glicada
5. **Quantidade de exam_codes vinculados:** 3
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 3 (3 exam_codes)
7. **Variantes especiais:** nenhuma declarada
8. **Direções declaradas:** `above`: LAB-004 · `any`: LAB-002, LAB-003
9. **Exames sensíveis / observações:** LAB-003 Insulina basal: histórico EXA-006 não mapeado (DECISÃO 29)
10. **Exames multi-domínio neste domínio:** nenhum — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027/033/044 (sem domínio); EXA-006 Insulina de jejum histórica (legado, DECISÃO 29); EXA-007 HOMA-IR legado (DECISÃO 28); nenhum derivado (DECISÃO 26); custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

### LI-D03 — Lipídico

1. **Código:** LI-D03
2. **Nome:** Lipídico
3. **Definição (DECISÃO 01):** Organiza dados relacionados ao perfil lipídico e suas variantes laboratoriais.
4. **Exames vinculados (DECISÃO 02):** LAB-005 Triglicerídeos; LAB-006 Colesterol total; LAB-007 LDL colesterol; LAB-008 LDL oxidada; LAB-009 HDL colesterol
5. **Quantidade de exam_codes vinculados:** 5
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 5 (5 exam_codes)
7. **Variantes especiais:** nenhuma declarada
8. **Direções declaradas:** `above`: LAB-005, LAB-006, LAB-007, LAB-008 · `below`: LAB-009
9. **Exames sensíveis / observações:** LAB-009 HDL: direção `below` (única `below` do catálogo) — resultado acima na direção contrária depende da regra de mistos (DECISÃO 19, pendente)
10. **Exames multi-domínio neste domínio:** nenhum — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027/033/044 (sem domínio); LDL calculado ou qualquer razão/índice (DECISÃO 26: 0 derivados); custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

### LI-D04 — Hepático

1. **Código:** LI-D04
2. **Nome:** Hepático
3. **Definição (DECISÃO 01):** Organiza resultados laboratoriais relacionados à avaliação bioquímica hepática.
4. **Exames vinculados (DECISÃO 02):** LAB-012 TGO ou AST; LAB-013 TGP ou ALT; LAB-014 Bilirrubina total; LAB-015 Gama GT ou GGT
5. **Quantidade de exam_codes vinculados:** 4
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 4 (4 exam_codes)
7. **Variantes especiais:** nenhuma declarada
8. **Direções declaradas:** `above`: LAB-012, LAB-013, LAB-014, LAB-015
9. **Exames sensíveis / observações:** nenhuma registrada
10. **Exames multi-domínio neste domínio:** nenhum — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027/033/044 (sem domínio); nenhum outro exame do catálogo; custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

### LI-D05 — Renal e Hidroeletrolítico

1. **Código:** LI-D05
2. **Nome:** Renal e Hidroeletrolítico
3. **Definição (DECISÃO 01):** Organiza dados relacionados à avaliação renal e ao equilíbrio de eletrólitos medidos laboratorialmente.
4. **Exames vinculados (DECISÃO 02):** LAB-010 Creatinina; LAB-011 Ureia; LAB-019 Sódio; LAB-020 Potássio
5. **Quantidade de exam_codes vinculados:** 4
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 4 (4 exam_codes)
7. **Variantes especiais:** nenhuma declarada
8. **Direções declaradas:** `above`: LAB-010, LAB-011 · `any`: LAB-019, LAB-020
9. **Exames sensíveis / observações:** nenhuma registrada
10. **Exames multi-domínio neste domínio:** nenhum — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027 Alumínio, LAB-033 Ácido úrico, LAB-044 CK (sem domínio, por decisão); nenhum derivado; custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

### LI-D06 — Micronutrientes e Metabolismo Mineral

1. **Código:** LI-D06
2. **Nome:** Micronutrientes e Metabolismo Mineral
3. **Definição (DECISÃO 01):** Organiza vitaminas, minerais, elementos e marcadores de metabolismo mineral contemplados pelo catálogo.
4. **Exames vinculados (DECISÃO 02):** LAB-017 Homocisteína; LAB-021 Magnésio; LAB-022 Zinco; LAB-023 Selênio; LAB-024 Fósforo; LAB-025 Vitamina B12; LAB-026 Ácido fólico; LAB-028 Ferro sérico; LAB-029 Ferritina; LAB-034 Paratormônio ou PTH; LAB-035 25 OH vitamina D; LAB-045 Cálcio ionizado sérico
5. **Quantidade de exam_codes vinculados:** 12
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 13 (12 exam_codes + 1 variante(s) distinta(s))
7. **Variantes especiais:** LAB-021 Magnésio sem variante e `variant = eritrocitario`: vínculos distintos no mesmo domínio (DECISÕES 02/11)
8. **Direções declaradas:** `above`: LAB-017 · `any`: LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045
9. **Exames sensíveis / observações:** LAB-021 Magnésio: variante eritrocitária é vínculo distinto (DECISÃO 11)
10. **Exames multi-domínio neste domínio:** LAB-025 (LI-D01 + LI-D06), LAB-026 (LI-D01 + LI-D06), LAB-028 (LI-D01 + LI-D06), LAB-029 (LI-D01 + LI-D06), LAB-034 (LI-D06 + LI-D07) — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027 Alumínio (sem domínio, por decisão); LAB-033/044; Magnésio eritrocitário só pelo vínculo próprio da variante; 1,25-(OH)2 vitamina D não é LAB-035; custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

### LI-D07 — Endócrino e Hormonal

1. **Código:** LI-D07
2. **Nome:** Endócrino e Hormonal
3. **Definição (DECISÃO 01):** Organiza marcadores relacionados aos eixos tireoidiano e hormonal presentes no catálogo.
4. **Exames vinculados (DECISÃO 02):** LAB-030 TSH; LAB-031 T4 livre; LAB-032 T3 livre; LAB-034 Paratormônio ou PTH; LAB-036 DHT; LAB-037 Testosterona livre; LAB-038 Testosterona total; LAB-039 SHBG; LAB-040 Progesterona; LAB-041 Estradiol; LAB-042 LH; LAB-043 FSH
5. **Quantidade de exam_codes vinculados:** 12
6. **Quantidade de vínculos efetivos (com variantes desdobradas):** 12 (12 exam_codes)
7. **Variantes especiais:** nenhuma declarada
8. **Direções declaradas:** `any`: LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043
9. **Exames sensíveis / observações:** nenhuma registrada
10. **Exames multi-domínio neste domínio:** LAB-034 (LI-D06 + LI-D07) — contam 1× por domínio (DECISÃO 17)
11. **O que NÃO entra:** LAB-027/033/044 (sem domínio); EXA-024 Cortisol matinal legado (`additional_legacy`, DECISÃO 28); custom exams (DECISÃO 27); derivados (DECISÃO 26)
12. **Sistemas HOLOSCAN relacionados:** PENDENTE (Bloco 20/21) — 0..N, só por regra homologada; nenhum sugerido
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** PENDENTE (Bloco 20/21)
14. **min_classifiable_results:** PENDENTE (Bloco 17)
15. **required_exam_codes:** PENDENTE (Bloco 17)
16. **required_exam_groups:** PENDENTE (Bloco 17)
17. **Regra de cobertura (coverage_rule):** PENDENTE (Bloco 16)
18. **Regra de resultados mistos (mixed_results_rule):** PENDENTE (Bloco 19)
19. **Janela temporal:** → Bloco 5 (PENDENTE; ver §4)
20. **Impacto em convergente/divergente:** enquanto 12–19 estiverem PENDENTES, toda leitura deste domínio é `sem_dados_suficientes` (motivos `missing_domain_holoscan_mapping`, `missing_domain_sufficiency_rule`, `missing_temporal_rule`, `mixed_without_rule` conforme o caso); convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

## 3. Matriz final por domínio

| domain_code | domain_name | linked_exam_count | linked_exam_codes | special_variants | holoscan_systems | holoscan_direction_rule | min_classifiable_results | required_exam_codes | required_exam_groups | coverage_rule | mixed_results_rule | temporal_rule | status | decision | justification | responsible | date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LI-D01 | Hematológico e Inflamatório | 7 | LAB-001, LAB-016, LAB-018, LAB-025, LAB-026, LAB-028, LAB-029 | LAB-016 ultrassensivel | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |
| LI-D02 | Glicêmico e Metabólico | 3 | LAB-002, LAB-003, LAB-004 | — | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |
| LI-D03 | Lipídico | 5 | LAB-005, LAB-006, LAB-007, LAB-008, LAB-009 | — | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |
| LI-D04 | Hepático | 4 | LAB-012, LAB-013, LAB-014, LAB-015 | — | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |
| LI-D05 | Renal e Hidroeletrolítico | 4 | LAB-010, LAB-011, LAB-019, LAB-020 | — | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |
| LI-D06 | Micronutrientes e Metabolismo Mineral | 12 | LAB-017, LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045 | LAB-021 eritrocitario | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |
| LI-D07 | Endócrino e Hormonal | 12 | LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043 | — | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE (Bloco 5) | PARÂMETROS PENDENTES | | | | |

Colunas `decision`, `justification`, `responsible`, `date` vazias por decisão: serão preenchidas por Daniel no ato de decisão, nunca por este documento.

## 4. DECISÃO FINAL DA JANELA TEMPORAL (Bloco 5)

**Já decidido (Etapa 5.6):** compatibilidade temporal obrigatória; datas clínicas (`holoscan_applications.quando`, `lab_collections.coletado_em`); nunca `updated_at`/`created_at`; janela explícita, versionada, parte do pacote LI e rastreável no trace; ausência de data ou fora da janela = `sem_dados_suficientes`; arquitetura "sem janela" excluída.

**Pendente:** formato (A global simétrica · B anterior ≠ posterior · C por domínio · D por exame · E exceção com revisão humana) e valor em dias. Não assumir 7, 30, 60 ou 90. Nenhum valor sugerido.

| Campo | Valor |
|---|---|
| formato | PENDENTE |
| dias (coleta antes da aplicação) | PENDENTE |
| dias (coleta depois da aplicação) | PENDENTE |
| por domínio? | PENDENTE |
| exceção com revisão humana? | PENDENTE |
| versão da regra | PENDENTE |

DECISÃO: ______
JUSTIFICATIVA: ______
FONTE: ______
RESPONSÁVEL: ______
DATA: ______

## 5. MATRIZ DOMÍNIO LI → HOLOSCAN (Blocos 20/21)

Relação 0..N por domínio, só por regra homologada (tabela própria com `domain_id`, `holoscan_system`, `role`, `status`, versão — extensão de schema na implementação). Os 5 sistemas HOLOSCAN existentes **não** são herdados por categoria, nome ou legado. Nenhuma linha sugerida.

| domain_code | holoscan_system_1 | holoscan_system_2 | holoscan_system_3 | aggregation_rule | direction_rule (nota/faixa → attention_*) | source | justification | status |
|---|---|---|---|---|---|---|---|---|
| LI-D01 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D02 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D03 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D04 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D05 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D06 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D07 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |

`aggregation_rule`: como N sistemas produzem uma única direção HOLOSCAN para o domínio (quando N > 1). `direction_rule`: como a nota/faixa do HOLOS-V1@2 vira `attention_present`, `attention_not_detected` ou `indeterminate`. Ambas exigem fonte; sem elas: `missing_domain_holoscan_mapping`.

## 6. SUFICIÊNCIA POR DOMÍNIO (Blocos 16/17)

Regras já decididas (arquitetura): regra própria e versionada por domínio; sem corte universal; hemograma = 1 posição; componentes não inflam; exame repetido = 1 posição; multi-domínio conta 1× por domínio; `not_classifiable` não conta; pesos não assumidos iguais; exame obrigatório ausente → `missing_required_exam`.

| domain_code | linked_exam_count | min_classifiable_results | required_exam_codes | required_exam_groups | coverage_rule | critério de suficiência | versão | status |
|---|---|---|---|---|---|---|---|---|
| LI-D01 | 7 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D02 | 3 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D03 | 5 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D04 | 4 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D05 | 4 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D06 | 12 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D07 | 12 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |

## 7. REGRA DE RESULTADOS MISTOS POR DOMÍNIO (Bloco 19)

Proibido (já decidido): maioria simples automática; média de exames heterogêneos; score laboratorial global; "um alterado vence"; "a maioria normal vence"; normalizar `not_classifiable` como `within`. Um exame fora não converge sozinho (DECISÃO 20). Direção do vínculo (`above`/`below`/`any`) define o que é "fora na direção relevante". A regra final é **por domínio** e deve ser determinística e explicável.

| Combinação de posições no domínio | Opções possíveis (sem recomendação) | Consequência de cada opção | Regra final por domínio |
|---|---|---|---|
| within + within (todos dentro) | (i) `attention_not_detected`; (ii) exige cobertura mínima antes de afirmar | (i) pode convergir com HOLOSCAN `not_detected`; (ii) abaixo da cobertura → sem dados | PENDENTE |
| above + within | (i) `attention_present` se `above` é a direção do vínculo; (ii) exige ≥ k fora; (iii) exige exame obrigatório fora | (i) um exame decide o domínio (conflita com "um exame isolado não converge" se k = 1); (ii)/(iii) dependem do Bloco 17 | PENDENTE |
| below + within | (i) `attention_present` se `below` é a direção do vínculo (ex.: HDL); (ii) `within` para o domínio se a direção do vínculo é `above`; (iii) estado próprio "fora em direção contrária" | (ii) ignora alteração; (iii) exige novo estado e texto | PENDENTE |
| above + below (fora em direções opostas) | (i) `indeterminate`; (ii) `attention_present` por qualquer fora na direção relevante; (iii) sem dados (`mixed_without_rule`) | (i) nunca converge/diverge; (ii) pode produzir divergência sem leitura clínica; (iii) conservador | PENDENTE |
| above + above | (i) `attention_present`; (ii) exige cobertura/obrigatórios além da contagem | (i) direto; (ii) depende do Bloco 17 | PENDENTE |
| below + below | (i) `attention_present` se `below` é a direção relevante; (ii) `indeterminate` se a direção é `above`; (iii) estado próprio | análogo a below + within | PENDENTE |
| not_classifiable misturado (com within/above/below) | (i) excluir do conjunto e aplicar a regra ao restante (se cobertura suficiente); (ii) `indeterminate` para o domínio; (iii) sem dados quando o não classificável é obrigatório | (i) depende da cobertura restante; (ii) mais conservador; (iii) depende do Bloco 17 | PENDENTE |

| domain_code | mixed_results_rule | versão | status |
|---|---|---|---|
| LI-D01 | PENDENTE | PENDENTE | PENDENTE |
| LI-D02 | PENDENTE | PENDENTE | PENDENTE |
| LI-D03 | PENDENTE | PENDENTE | PENDENTE |
| LI-D04 | PENDENTE | PENDENTE | PENDENTE |
| LI-D05 | PENDENTE | PENDENTE | PENDENTE |
| LI-D06 | PENDENTE | PENDENTE | PENDENTE |
| LI-D07 | PENDENTE | PENDENTE | PENDENTE |

## 8. CHECKLIST — LI PRONTA PARA IMPLEMENTAÇÃO

Nenhum item marcado. Marcar é ato humano após decisão registrada. (A) = bloqueador metodológico · (B) = gate operacional · (C) = opcional/acabamento.

- [ ] 1. (A) Janela temporal: formato e valor em dias decididos e versionados (Bloco 5)
- [ ] 2. (A) LI-D01: suficiência, mínimos, obrigatórios, mistos, sistemas HOLOSCAN e direção decididos
- [ ] 3. (A) LI-D02: idem
- [ ] 4. (A) LI-D03: idem
- [ ] 5. (A) LI-D04: idem
- [ ] 6. (A) LI-D05: idem
- [ ] 7. (A) LI-D06: idem (incluindo tratamento do vínculo distinto Magnésio eritrocitário)
- [ ] 8. (A) LI-D07: idem
- [ ] 9. (A) Regra de agregação entre sistemas HOLOSCAN definida para todo domínio com N > 1 sistemas (ou N ≤ 1 declarado)
- [ ] 10. (B) Vocabulário de reason_codes do motor unificado com a lista da DECISÃO 22 (sem colapsar motivos)
- [ ] 11. (C) Tabela de tradução reason_code → texto ao paciente (Bloco 24) decidida
- [ ] 12. (C) Fontes formais consolidadas onde o campo diz FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR (ou declaração explícita de decisão autoral sem bibliografia)
- [ ] 13. (B) Migration em lote escrita (domínios, 47 vínculos + 2 variantes distintas, regras por domínio, janela, matriz HOLOSCAN) e validada na cadeia local (BEGIN…ROLLBACK)
- [ ] 14. (B) Servidor falso e motor LI espelhando o conteúdo decidido; testes de regressão A–F (Etapa 5.7) e precedência (Etapa 5.9) passando
- [ ] 15. (B) Cadeia validada no banco real (VALIDAÇÃO REAL PENDENTE) sem alterar produção
- [ ] 16. (B) Pacote LI em `em_revisao` com hash conferido; Aprovação 1 (Daniel) e Aprovação 2 (Rodrigo) registradas com identidade real
- [ ] 17. (B) Homologação explícita do pacote LI (`homologar_pacote_li`) e snapshot gerado; só então a LI deixa de ser `sem_dados_suficientes` por regra ausente

## 9. Contagem validada (Etapa 5.10)

| Métrica | Valor |
|---|---|
| exames-base | 45 |
| vinculados | 42 |
| sem domínio | 3 (LAB-027, LAB-033, LAB-044) |
| pares exame → domínio | 47 |
| multi-domínio | 5 (LAB-025, 026, 028, 029 em D01+D06; LAB-034 em D06+D07) |
| LI-D01 | 7 |
| LI-D02 | 3 |
| LI-D03 | 5 |
| LI-D04 | 4 |
| LI-D05 | 4 |
| LI-D06 | 12 |
| LI-D07 | 12 |

A distribuição por domínio escrita na Etapa 5.5 (D01 8 · D06 13 · D07 10) era erro de digitação; a matriz aprovada nunca mudou. Correção autorizada por Daniel em 02/10/2026 e registrada em `DECISAO-02` e `DECISOES-V1.md` (item 127).
