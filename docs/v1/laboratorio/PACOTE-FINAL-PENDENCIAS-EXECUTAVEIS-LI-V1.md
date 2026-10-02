# Pacote final — pendências executáveis da Leitura Integrada V1

Etapa 5.10 (reclassificado na 5.10.1; Bloco 5 fechado na 5.11; 20/21 mapeados na 5.12; 16/17/19 fechados na 5.13) · 02/10/2026 · consolidação **sem preenchimento** das pendências executáveis da Leitura Integrada V1 · fonte dos números: matriz aprovada de `DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md` (reconferida programaticamente nesta etapa) · autoridade de nomes e blocos: `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA PREENCHIDO.** Todo campo marcado PENDENTE está vazio por decisão: nenhum valor, sistema, regra, corte, mínimo ou janela foi sugerido. Preencher é ato humano de Daniel (Aprovação 1) e Rodrigo (Aprovação 2). Este documento **não** implementa nada: migration, banco, servidor falso, motor, UI e pacote LI real permanecem intocados; LI-V1@1 segue rascunho com 0 aprovações.

## 1. Pendências classificadas (Etapa 5.10.1)

Três grupos. Só o grupo **A** significa "regra metodológica ainda indefinida". O grupo **B** é operacional. O grupo **C** não bloqueia: a decisão atual permite zero.

### A — Bloqueadores metodológicos para o motor LI oficial

**Nenhum (0) após a Etapa 5.13.** Histórico: Bloco 5 fechado na 5.11 (LI-TEMP-01 v1); Blocos 20/21 mapeados na 5.12 (`DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md`); Blocos 16, 17 e 19 fechados na 5.13 (`DECISAO-16`, `DECISAO-17`, `DECISAO-19`). A metodologia da LI V1 está completamente decidida no nível documental.

| # | Bloco | Pendência | Status |
|---|---|---|---|
| A1 | 5 | regra temporal | DECIDIDO (5.11) |
| A2 | 16 | suficiência D01–D07 | DECIDIDO (5.13) |
| A3 | 17 | mínimos/conjuntos/grupos D01–D07 | DECIDIDO (5.13) |
| A4 | 19 | resultados mistos D01–D07 | DECIDIDO (5.13) |
| A5 | 20/21 | domínio → HOLOSCAN + direção | DECIDIDO (5.12) |

**Isso não elimina os gates operacionais/técnicos do grupo B.** Enquanto o pacote LI com este conteúdo não for implementado, migrado, validado no banco real, aprovado por Daniel e Rodrigo e homologado, toda Leitura Integrada real continua `sem_dados_suficientes` (estado técnico atual), e o motor LI **não** está implementado.

### B — Gates operacionais / homologação / produção

Não são metodologia indefinida. Podem impedir a publicação ou a homologação real, mas a regra que dependem já está decidida ou é ato técnico.

| # | Gate | Estado |
|---|---|---|
| B1 | aplicar as migrations 20261002100000, 20261002110000 e **20261002120000** (Etapa 6.0: conteúdo LI-V1@2) após gate técnico | escritas e validadas só em PostgreSQL local (BEGIN/ROLLBACK); **não aplicadas** |
| B2 | validar a cadeia real do banco | VALIDAÇÃO REAL PENDENTE (sem conexão autorizada) |
| B3 | cadastrar o `auth.uid` real de Daniel em `methodology_approvers` (scope `integrated_reading`, etapa 1) | tabela vazia |
| B4 | cadastrar o `auth.uid` real de Rodrigo (etapa 2) | tabela vazia |
| B5 | Aprovação 1 (Daniel) sobre LI-V1@2, versão 2 e `content_hash` `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9` | 0 aprovações |
| B6 | Aprovação 2 (Rodrigo), identidade distinta (quatro olhos) | 0 aprovações |
| B7 | Homologar (`homologar_pacote_li`) com completude válida e snapshot | não homologado (completude de LI-V1@2: publicável, 0 bloqueios) |
| B8 | `content_hash` final conferido | **candidato determinístico**: `fa99ec80…7be9` (SQL local == pacote JS == servidor falso) |
| B9 | deploy | não feito |

**Estado após a Etapa 6.0.1:** a metodologia foi **implementada localmente** (hash recalculado na 6.0.1 após a regra `directional_result_indeterminate`) (`docs/v1/ETAPA6-LEITURA-INTEGRADA.md`): migration, pacote executável, motor 2.0.0, persistência por domínio com snapshot, servidor falso, UI mínima e testes. Banco real não validado; nada homologado; nada deployado.

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
12. **Sistemas HOLOSCAN relacionados:** `acido_inflamatorio` (1 sistema) — DECIDIDO na Etapa 5.12; cross_source_role: directional = LAB-016, LAB-018; contextual = LAB-001, LAB-025, LAB-026, LAB-028, LAB-029
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** Regra 20/21-A: baixa → present, intermediária → indeterminate, alta → not_detected, não avaliável → indeterminate (DECIDIDO na Etapa 5.12)
14. **min_classifiable_results:** 1 (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** LAB-016 (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** — (opcional: LAB-018) (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** rule_based: PCR obrigatória, elegível e classificável (só directional) (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** PCR sozinha decide; PCR + fibrinogênio por unanimidade; mistura → indeterminate; fibrinogênio indeterminate não bloqueia a PCR (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** metodologia completa (5.11–5.13); CONVERGENTE/DIVERGENTE só após implementação, migration e homologação do pacote LI; até lá, estado técnico `sem_dados_suficientes`; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

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
12. **Sistemas HOLOSCAN relacionados:** `metabolico` (1 sistema) — DECIDIDO na Etapa 5.12; cross_source_role: directional = LAB-002, LAB-003, LAB-004; contextual = 
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** Regra 20/21-A: baixa → present, intermediária → indeterminate, alta → not_detected, não avaliável → indeterminate (DECIDIDO na Etapa 5.12)
14. **min_classifiable_results:** 2 (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** — (grupo) (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** GLYCEMIC_ANCHOR = {LAB-002 OU LAB-004} (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** rule_based: ≥ 2 directional classificáveis e pelo menos um de LAB-002/LAB-004; insulina nunca sozinha (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** unanimidade dos directional classificáveis participantes; mistura → indeterminate (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** metodologia completa (5.11–5.13); CONVERGENTE/DIVERGENTE só após implementação, migration e homologação do pacote LI; até lá, estado técnico `sem_dados_suficientes`; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

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
12. **Sistemas HOLOSCAN relacionados:** `metabolico` (1 sistema) — DECIDIDO na Etapa 5.12; cross_source_role: directional = LAB-005, LAB-009; contextual = LAB-006, LAB-007, LAB-008
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** Regra 20/21-A: baixa → present, intermediária → indeterminate, alta → not_detected, não avaliável → indeterminate (DECIDIDO na Etapa 5.12)
14. **min_classifiable_results:** 2 (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** LAB-005, LAB-009 (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** — (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** rule_based: ambos obrigatórios e classificáveis; contextuais não substituem (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** unanimidade dos 2; mistura → indeterminate (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** metodologia completa (5.11–5.13); CONVERGENTE/DIVERGENTE só após implementação, migration e homologação do pacote LI; até lá, estado técnico `sem_dados_suficientes`; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

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
12. **Sistemas HOLOSCAN relacionados:** `detox_linfatico` (1 sistema) — DECIDIDO na Etapa 5.12; cross_source_role: directional = LAB-013, LAB-015; contextual = LAB-012, LAB-014
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** Regra 20/21-A: baixa → present, intermediária → indeterminate, alta → not_detected, não avaliável → indeterminate (DECIDIDO na Etapa 5.12)
14. **min_classifiable_results:** 2 (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** LAB-013, LAB-015 (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** — (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** rule_based: ambos obrigatórios e classificáveis; contextuais não substituem (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** unanimidade dos 2; mistura → indeterminate (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** metodologia completa (5.11–5.13); CONVERGENTE/DIVERGENTE só após implementação, migration e homologação do pacote LI; até lá, estado técnico `sem_dados_suficientes`; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

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
12. **Sistemas HOLOSCAN relacionados:** nenhum na V1 (`holoscan_mapping_mode = none`; sem Convergente/Divergente; não é SEM DADOS) — DECIDIDO na Etapa 5.12; cross_source_role: directional = nenhum; contextual = LAB-010, LAB-011, LAB-019, LAB-020
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** não se aplica (sem sistema na V1)
14. **min_classifiable_results:** null (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** [] (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** [] (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** not_applicable (sem confronto HOLOSCAN na V1; não é insuficiência) (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** not_applicable (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** domínio sem confronto HOLOSCAN na V1 por decisão explícita: nunca CONVERGENTE/DIVERGENTE, **não** é SEM DADOS nem `missing_domain_holoscan_mapping`; 14–18 = not_applicable (5.13): sem suficiência cross-source nem direção laboratorial para confronto; leitura laboratorial própria continua disponível; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

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
12. **Sistemas HOLOSCAN relacionados:** nenhum na V1 (`holoscan_mapping_mode = none`; sem Convergente/Divergente; não é SEM DADOS) — DECIDIDO na Etapa 5.12; cross_source_role: directional = nenhum; contextual = LAB-017, LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** não se aplica (sem sistema na V1)
14. **min_classifiable_results:** null (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** [] (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** [] (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** not_applicable (sem confronto HOLOSCAN na V1; não é insuficiência) (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** not_applicable (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** domínio sem confronto HOLOSCAN na V1 por decisão explícita: nunca CONVERGENTE/DIVERGENTE, **não** é SEM DADOS nem `missing_domain_holoscan_mapping`; 14–18 = not_applicable (5.13): sem suficiência cross-source nem direção laboratorial para confronto; leitura laboratorial própria continua disponível; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

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
12. **Sistemas HOLOSCAN relacionados:** nenhum na V1 (`holoscan_mapping_mode = none`; sem Convergente/Divergente; não é SEM DADOS) — DECIDIDO na Etapa 5.12; cross_source_role: directional = nenhum; contextual = LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043
13. **Regra HOLOSCAN → attention_present / attention_not_detected / indeterminate:** não se aplica (sem sistema na V1)
14. **min_classifiable_results:** null (DECIDIDO na Etapa 5.13)
15. **required_exam_codes:** [] (DECIDIDO na Etapa 5.13)
16. **required_exam_groups:** [] (DECIDIDO na Etapa 5.13)
17. **Regra de cobertura (coverage_rule):** not_applicable (sem confronto HOLOSCAN na V1; não é insuficiência) (DECIDIDO na Etapa 5.13)
18. **Regra de resultados mistos (mixed_results_rule):** not_applicable (DECIDIDO na Etapa 5.13)
19. **Janela temporal:** LI-TEMP-01 v1 — ±30 dias corridos, inclusivos, global, simétrica, 0 exceções (DECIDIDO na Etapa 5.11; §4)
20. **Impacto em convergente/divergente:** domínio sem confronto HOLOSCAN na V1 por decisão explícita: nunca CONVERGENTE/DIVERGENTE, **não** é SEM DADOS nem `missing_domain_holoscan_mapping`; 14–18 = not_applicable (5.13): sem suficiência cross-source nem direção laboratorial para confronto; leitura laboratorial própria continua disponível; convergente/divergente nunca por fallback (precedência do motor, Etapa 5.9)

## 3. Matriz final por domínio

| domain_code | domain_name | linked_exam_count | linked_exam_codes | special_variants | holoscan_systems | holoscan_direction_rule | min_classifiable_results | required_exam_codes | required_exam_groups | coverage_rule | mixed_results_rule | temporal_rule | status | decision | justification | responsible | date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LI-D01 | Hematológico e Inflamatório | 7 | LAB-001, LAB-016, LAB-018, LAB-025, LAB-026, LAB-028, LAB-029 | LAB-016 ultrassensivel | `acido_inflamatorio` | Regra 20/21-A | 1 | LAB-016 | — (opcional: LAB-018) | rule_based: PCR obrigatória, elegível e classificável (só directional) | PCR sozinha decide; PCR + fibrinogênio por unanimidade; mistura → indeterminate; fibrinogênio indeterminate não bloqueia a PCR | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |
| LI-D02 | Glicêmico e Metabólico | 3 | LAB-002, LAB-003, LAB-004 | — | `metabolico` | Regra 20/21-A | 2 | — (grupo) | GLYCEMIC_ANCHOR = {LAB-002 OU LAB-004} | rule_based: ≥ 2 directional classificáveis e pelo menos um de LAB-002/LAB-004; insulina nunca sozinha | unanimidade dos directional classificáveis participantes; mistura → indeterminate | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |
| LI-D03 | Lipídico | 5 | LAB-005, LAB-006, LAB-007, LAB-008, LAB-009 | — | `metabolico` | Regra 20/21-A | 2 | LAB-005, LAB-009 | — | rule_based: ambos obrigatórios e classificáveis; contextuais não substituem | unanimidade dos 2; mistura → indeterminate | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |
| LI-D04 | Hepático | 4 | LAB-012, LAB-013, LAB-014, LAB-015 | — | `detox_linfatico` | Regra 20/21-A | 2 | LAB-013, LAB-015 | — | rule_based: ambos obrigatórios e classificáveis; contextuais não substituem | unanimidade dos 2; mistura → indeterminate | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |
| LI-D05 | Renal e Hidroeletrolítico | 4 | LAB-010, LAB-011, LAB-019, LAB-020 | — | nenhum (mode = none) | não se aplica | null | [] | [] | not_applicable (sem confronto HOLOSCAN na V1; não é insuficiência) | not_applicable | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |
| LI-D06 | Micronutrientes e Metabolismo Mineral | 12 | LAB-017, LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045 | LAB-021 eritrocitario | nenhum (mode = none) | não se aplica | null | [] | [] | not_applicable (sem confronto HOLOSCAN na V1; não é insuficiência) | not_applicable | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |
| LI-D07 | Endócrino e Hormonal | 12 | LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043 | — | nenhum (mode = none) | não se aplica | null | [] | [] | not_applicable (sem confronto HOLOSCAN na V1; não é insuficiência) | not_applicable | LI-TEMP-01 v1 (±30 dias) | DECIDIDO (metodologia completa; não implementado) | ver DECISAO-16/17/19 e 20-21 | decisão autoral V1 | Daniel | 02/10/2026 |

Colunas `decision`, `justification`, `responsible`, `date` preenchidas pelas decisões de Daniel nas Etapas 5.11–5.13.

## 4. DECISÃO FINAL DA JANELA TEMPORAL (Bloco 5) — DECIDIDO (Etapa 5.11)

| Campo | Valor |
|---|---|
| código / versão | **LI-TEMP-01 v1** |
| formato | GLOBAL · SIMÉTRICA |
| dias (coleta antes da aplicação) | 30 (inclusivo) |
| dias (coleta depois da aplicação) | 30 (inclusivo) |
| regra | `abs(collection.clinical_date − application_clinical_date) <= 30` |
| por domínio / exame / variante? | não (0 exceções na V1 inicial) |
| exceção com revisão humana? | não na V1 inicial; futura só explícita, versionada, aprovada, com novo content_hash |
| natureza | regra operacional autoral e versionada da V1 — **não** validade fisiológica universal |
| fora da janela | `outside_time_window`; nada apagado nem invalidado; domínio → SEM DADOS SUFICIENTES quando a fonte for necessária |
| data ausente | `missing_clinical_date`; sem fallback técnico |
| snapshot | application_id, application_clinical_date, collection_ids, collection_clinical_dates, result_ids, temporal_delta_days (com sinal), temporal_status, temporal_rule_code, temporal_rule_version |

DECISÃO: LI-TEMP-01 v1 (acima). JUSTIFICATIVA: determinismo, proximidade, contexto "últimos 30 dias" do HOLOSCAN aprovado, explicabilidade, versionamento. FONTE: Documento Mestre + pacote HOLOSCAN-V1 + decisão autoral V1. RESPONSÁVEL: Daniel. DATA: 02/10/2026. Detalhe completo em `DECISAO-05-JANELA-TEMPORAL-LI.md`.

## 5. MATRIZ DOMÍNIO LI → HOLOSCAN (Blocos 20/21) — DECIDIDA (Etapa 5.12)

Decisão completa em `DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md`. Nenhuma herança por categoria, nome ou legado. Todos os domínios com sistema têm exatamente 1 (sem agregação na V1).

| domain_code | holoscan_system_1 | holoscan_system_2 | holoscan_system_3 | aggregation_rule | direction_rule (faixa → attention_*) | directional | contextual | source | justification | status |
|---|---|---|---|---|---|---|---|---|---|---|
| LI-D01 | `acido_inflamatorio` | — | — | não se aplica (1) | Regra 20/21-A | LAB-016, LAB-018 | LAB-001, LAB-025, LAB-026, LAB-028, LAB-029 | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |
| LI-D02 | `metabolico` | — | — | não se aplica (1) | Regra 20/21-A | LAB-002, LAB-003, LAB-004 |  | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |
| LI-D03 | `metabolico` | — | — | não se aplica (1) | Regra 20/21-A | LAB-005, LAB-009 | LAB-006, LAB-007, LAB-008 | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |
| LI-D04 | `detox_linfatico` | — | — | não se aplica (1) | Regra 20/21-A | LAB-013, LAB-015 | LAB-012, LAB-014 | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |
| LI-D05 | nenhum (`holoscan_mapping_mode = none`) | — | — | não se aplica | não se aplica | nenhum | LAB-010, LAB-011, LAB-019, LAB-020 | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |
| LI-D06 | nenhum (`holoscan_mapping_mode = none`) | — | — | não se aplica | não se aplica | nenhum | LAB-017, LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045 | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |
| LI-D07 | nenhum (`holoscan_mapping_mode = none`) | — | — | não se aplica | não se aplica | nenhum | LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043 | Mestre + HOLOS-V1@2 + decisão autoral V1 | autoral, comparativa, versionada, não diagnóstica | DECIDIDO |

`aggregation_rule` fica reservado para versão futura com N > 1 (exige nova decisão e novo content_hash). Ausência intencional de sistema (D05–D07) **não** gera `missing_domain_holoscan_mapping`.

## 6. SUFICIÊNCIA POR DOMÍNIO (Blocos 16/17) — DECIDIDA (Etapa 5.13)

Só vínculos `directional` contam; contextual não conta, não substitui obrigatório e não torna suficiente. Nenhum percentual global. `lab_domain_availability` ≠ `cross_source_sufficiency`. Decisão completa em `DECISAO-16-…` e `DECISAO-17-…`.

| domain_code | linked_exam_count | directional | cross_source_sufficiency_mode | min_classifiable_results | required_exam_codes | required_exam_groups | optional_directional | status |
|---|---|---|---|---|---|---|---|---|
| LI-D01 | 7 | LAB-016, LAB-018 | rule_based | 1 | LAB-016 | — | LAB-018 | DECIDIDO |
| LI-D02 | 3 | LAB-002, LAB-003, LAB-004 | rule_based | 2 | — | GLYCEMIC_ANCHOR = {LAB-002 OU LAB-004} | — | DECIDIDO |
| LI-D03 | 5 | LAB-005, LAB-009 | rule_based | 2 | LAB-005, LAB-009 | — | — | DECIDIDO |
| LI-D04 | 4 | LAB-013, LAB-015 | rule_based | 2 | LAB-013, LAB-015 | — | — | DECIDIDO |
| LI-D05 | 4 | nenhum | not_applicable | null | [] | [] | — | DECIDIDO |
| LI-D06 | 12 | nenhum | not_applicable | null | [] | [] | — | DECIDIDO |
| LI-D07 | 12 | nenhum | not_applicable | null | [] | [] | — | DECIDIDO |

## 7. REGRA DE RESULTADOS MISTOS POR DOMÍNIO (Bloco 19) — DECIDIDA (Etapa 5.13)

Regra geral: só directional elegíveis/classificáveis/suficientes/temporalmente compatíveis; **unanimidade** → `attention_present` ou `attention_not_detected`; **mistura** present/not_detected → `indeterminate`; `indeterminate` nunca produz CONVERGENTE/DIVERGENTE → SEM DADOS SUFICIENTES (`mixed_results_indeterminate`; `mixed_without_rule` reservado a conjunto futuro sem regra homologada — correção semântica da Etapa 6.0). Sem maioria, média, score, peso, "um vence", contagem ou percentual de alterados. Alternativas da Etapa 5.10 ficam registradas no histórico do git como não adotadas.

| Combinação (directional considerados) | Resultado |
|---|---|
| todos `attention_present` | `laboratory_direction = attention_present` |
| todos `attention_not_detected` | `laboratory_direction = attention_not_detected` |
| mistura present / not_detected | `indeterminate` → SEM DADOS SUFICIENTES |
| `indeterminate` em exame **opcional** (D01 fibrinogênio) com obrigatório determinístico | não invalida a suficiência; nunca conta como present/not_detected |
| `indeterminate` em exame **obrigatório** | suficiência não satisfeita → SEM DADOS SUFICIENTES (reason code da causa) |

| domain_code | mixed_results_rule | status |
|---|---|---|
| LI-D01 | PCR obrigatória; só PCR → direção da PCR; PCR + fibrinogênio: unanimidade, mistura → indeterminate; fibrinogênio indeterminate não bloqueia a PCR | DECIDIDO |
| LI-D02 | após suficiência (min 2 + GLYCEMIC_ANCHOR): unanimidade dos directional classificáveis participantes; mistura → indeterminate; insulina nunca sozinha | DECIDIDO |
| LI-D03 | LAB-005 + LAB-009: unanimidade; mistura → indeterminate | DECIDIDO |
| LI-D04 | LAB-013 + LAB-015: unanimidade; mistura → indeterminate | DECIDIDO |
| LI-D05 | not_applicable | DECIDIDO |
| LI-D06 | not_applicable | DECIDIDO |
| LI-D07 | not_applicable | DECIDIDO |

**Ordem conceitual de avaliação:** 1 fonte HOLOSCAN → 2 versão → 3 temporalidade → 4 vínculos → 5 resultados selecionados → 6 referência/unidade/contexto → 7 suficiência → 8 mistos → 9 `laboratory_direction` → 10 `holoscan_direction` → 11 CONVERGENTE/DIVERGENTE.

## 8. CHECKLIST — LI PRONTA PARA IMPLEMENTAÇÃO

Nenhum item marcado. Marcar é ato humano após decisão registrada. (A→decidido) = bloqueador metodológico já decidido documentalmente (0 restantes) · (B) = gate operacional · (C) = opcional/acabamento.

- [ ] 1. (A→decidido) Janela temporal: formato e valor decididos documentalmente na Etapa 5.11 (LI-TEMP-01 v1, ±30 dias); marcar é ato humano após registro no pacote LI
- [ ] 2. (A→decidido) LI-D01: suficiência, mínimos, obrigatórios, mistos (5.13), sistema HOLOSCAN e direção (5.12) decididos documentalmente; marcar é ato humano após registro no pacote LI
- [ ] 3. (A→decidido) LI-D02: idem
- [ ] 4. (A→decidido) LI-D03: idem
- [ ] 5. (A→decidido) LI-D04: idem
- [ ] 6. (A→decidido) LI-D05: idem
- [ ] 7. (A→decidido) LI-D06: idem (not_applicable na V1; vínculo distinto Magnésio eritrocitário preservado)
- [ ] 8. (A→decidido) LI-D07: idem
- [ ] 9. (A→decidido) Regra de agregação: N ≤ 1 declarado para todos os domínios na Etapa 5.12 (nenhum domínio com N > 1); marcar é ato humano após registro no pacote LI
- [ ] 10. (B) Vocabulário de reason_codes do motor unificado com a lista da DECISÃO 22 (sem colapsar motivos)
- [ ] 11. (C) Tabela de tradução reason_code → texto ao paciente (Bloco 24) decidida
- [ ] 12. (C) Fontes formais consolidadas onde o campo diz FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR (ou declaração explícita de decisão autoral sem bibliografia)
- [ ] 13. (B→feito localmente, Etapa 6.0) Migration em lote escrita (`20261002120000`: 7 domínios, 47 vínculos com variantes declaradas, regras por domínio, LI-TEMP-01, matriz HOLOSCAN) e validada na cadeia local (BEGIN…ROLLBACK, 207 checks); marcar é ato humano
- [ ] 14. (B→feito localmente, Etapa 6.0) Servidor falso e motor LI 2.0.0 espelhando o conteúdo decidido; suítes etapa6-li-motor/banco/ui e regressões A–G passando; marcar é ato humano
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
