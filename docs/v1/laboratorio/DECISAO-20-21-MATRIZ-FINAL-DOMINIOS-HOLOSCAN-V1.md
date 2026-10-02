# DECISÃO 20/21 — Matriz final domínios LI → HOLOSCAN e papel cross_source_role (V1)

Etapa 5.12 · 02/10/2026 · decisão humana de **Daniel** (responsável primário) · fecha o nível **mapeamento domínio → HOLOSCAN** dos Blocos 20 (CONVERGENTE) e 21 (DIVERGENTE) do `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`. Preparação em `MATRIZ-DECISAO-DOMINIOS-LI-HOLOSCAN-V1.md` (Etapa 5.11).

> **ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS — Etapa 5.12 (Daniel, 02/10/2026).** O estado final CONVERGENTE/DIVERGENTE **ainda depende** dos Blocos 16 (suficiência), 17 (mínimos/conjuntos/grupos) e 19 (resultados mistos). **O motor LI não está completo.** Nada implementado, nenhuma migration, nenhuma aprovação, nada homologado. Nenhum vínculo da DECISÃO 02 alterado; nenhum corte novo criado.

## 1. Regra transversal 20/21-A — direção HOLOSCAN (aprovada por Daniel)

Aplicável aos cinco sistemas HOLOSCAN, sempre com as faixas oficiais já aprovadas no pacote HOLOS-V1@2 (baixa [0, 10/3) · intermediária [10/3, 20/3) · alta [20/3, 10]).

| Resultado HOLOSCAN do sistema | Direção interna LI |
|---|---|
| faixa **baixa** | `attention_present` |
| faixa **intermediária** | `indeterminate` |
| faixa **alta** | `attention_not_detected` |
| sistema **não avaliável** (cobertura < 0,80) | `indeterminate` |

**Não criar novos cortes**: usar exatamente os limites oficiais congelados no pacote HOLOSCAN. **Não interpretar**: `attention_present` ≠ doença; `attention_not_detected` ≠ saúde; `indeterminate` ≠ ausência de dado clínico. São apenas direções internas da LI.

## 2. Regra transversal 20/21-B — cross_source_role (aprovada por Daniel)

Cada vínculo exame → domínio possui `cross_source_role = directional` **ou** `cross_source_role = contextual`.

**directional** — o resultado daquele exame pode participar, quando elegível, classificável e suficiente, da formação da direção laboratorial comparada à direção HOLOSCAN. **Não significa**: diagnóstico; peso maior; voto automático; que um exame isolado resolve o domínio; que resultado alterado gera convergência sozinho.

**contextual** — o exame continua pertencendo ao domínio; visível; classificável quando possível; rastreável; disponível para interpretação profissional; podendo participar da suficiência caso a futura regra do domínio (Bloco 16/17) determine. **Mas não produz sozinho direção laboratorial** para convergência/divergência com HOLOSCAN.

**Invariante de contagem:** adicionar `cross_source_role` **não altera** os 45 exames, os 42 vinculados, os 3 sem domínio, os 47 pares exame → domínio nem os 5 multi-domínio. É propriedade metodológica adicional do vínculo já aprovado na DECISÃO 02.

## 3. Matriz final 20/21

| domain_code | domain_name | holoscan_systems | qtde | directional | contextual | regra de direção HOLOSCAN |
|---|---|---|---|---|---|---|
| LI-D01 | Hematológico e Inflamatório | `acido_inflamatorio` | 1 | LAB-016, LAB-018 | LAB-001, LAB-025, LAB-026, LAB-028, LAB-029 | faixa baixa → attention_present · faixa intermediária → indeterminate · faixa alta → attention_not_detected · sistema não avaliável → indeterminate (Regra 20/21-A) |
| LI-D02 | Glicêmico e Metabólico | `metabolico` | 1 | LAB-002, LAB-003, LAB-004 |  | faixa baixa → attention_present · faixa intermediária → indeterminate · faixa alta → attention_not_detected · sistema não avaliável → indeterminate (Regra 20/21-A) |
| LI-D03 | Lipídico | `metabolico` | 1 | LAB-005, LAB-009 | LAB-006, LAB-007, LAB-008 | faixa baixa → attention_present · faixa intermediária → indeterminate · faixa alta → attention_not_detected · sistema não avaliável → indeterminate (Regra 20/21-A) |
| LI-D04 | Hepático | `detox_linfatico` | 1 | LAB-013, LAB-015 | LAB-012, LAB-014 | faixa baixa → attention_present · faixa intermediária → indeterminate · faixa alta → attention_not_detected · sistema não avaliável → indeterminate (Regra 20/21-A) |
| LI-D05 | Renal e Hidroeletrolítico | **nenhum na V1** (`[]`) | 0 | nenhum | LAB-010, LAB-011, LAB-019, LAB-020 | não se aplica (sem confronto HOLOSCAN na V1) |
| LI-D06 | Micronutrientes e Metabolismo Mineral | **nenhum na V1** (`[]`) | 0 | nenhum | LAB-017, LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045 | não se aplica (sem confronto HOLOSCAN na V1) |
| LI-D07 | Endócrino e Hormonal | **nenhum na V1** (`[]`) | 0 | nenhum | LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043 | não se aplica (sem confronto HOLOSCAN na V1) |

Todos os domínios com sistema têm **exatamente 1** sistema: as questões de múltiplos sistemas (AND/OR/unanimidade/prioridade) **não se aplicam na V1** e ficam registradas apenas como arquitetura para versão futura.

## 4. Decisões por domínio

### LI-D01 — Hematológico e Inflamatório → `acido_inflamatorio`

- **DIRECTIONAL:** LAB-016 PCR, LAB-018 Fibrinogênio.
- **CONTEXTUAL:** LAB-001 Hemograma completo (composto), LAB-025 Vitamina B12, LAB-026 Ácido fólico, LAB-028 Ferro sérico, LAB-029 Ferritina.
- **Direções conceituais já aprovadas:** LAB-016 PCR: `above` → candidato `attention_present`; `within` → candidato `attention_not_detected`; demais situações → conforme classificabilidade/regra futura. LAB-018 Fibrinogênio: `above` → candidato `attention_present`; `within` → candidato `attention_not_detected`; `below` → `indeterminate` para o confronto inflamatório.
- **Limites:** não afirmar que PCR confirma o Sistema Ácido Inflamatório; que fibrinogênio confirma inflamação; que o score HOLOSCAN mede inflamação sistêmica. A relação é **autoral, comparativa, versionada, não diagnóstica**.
- Regra de mistos: **PENDENTE no Bloco 19**.

### LI-D02 — Glicêmico e Metabólico → `metabolico`

- **DIRECTIONAL:** LAB-002 Glicemia de jejum, LAB-003 Insulina basal, LAB-004 Hemoglobina glicada.
- **CONTEXTUAL:** nenhum.
- **Proteção:** LAB-003 Insulina basal participa da direção, **mas não pode decidir o domínio isoladamente**. Não transformar glicemia, insulina ou HbA1c em diagnóstico automático de diabetes, resistência à insulina ou síndrome metabólica.
- **Direções conceituais:** LAB-002 Glicemia de jejum: `above`/`below` fora da referência aplicável → candidato `attention_present`; `within` → candidato `attention_not_detected`. LAB-003 Insulina basal: participa conforme referência aplicável, nunca resolve D02 isoladamente. LAB-004 HbA1c: `above` → candidato `attention_present`; `within` → candidato `attention_not_detected`; `below` → `indeterminate` para esta relação.
- Regra de combinação: **PENDENTE no Bloco 19**.

### LI-D03 — Lipídico → `metabolico`

- **DIRECTIONAL:** LAB-005 Triglicerídeos, LAB-009 HDL colesterol.
- **CONTEXTUAL:** LAB-006 Colesterol total, LAB-007 LDL colesterol, LAB-008 LDL oxidada.
- **Direções conceituais:** LAB-005 Triglicerídeos: `above` → candidato `attention_present`; `within` → candidato `attention_not_detected`; `below` → `indeterminate`. LAB-009 HDL: `below` → candidato `attention_present`; `within` → candidato `attention_not_detected`; `above` → `indeterminate`. LAB-006 / LAB-007 / LAB-008 não produzem sozinhos direção HOLOSCAN.
- **Limites:** não transformar D03 em cálculo de risco cardiovascular, diagnóstico ou score lipídico global.
- Regra TG + HDL quando discordantes: **PENDENTE no Bloco 19**.

### LI-D04 — Hepático → `detox_linfatico`

- **DIRECTIONAL:** LAB-013 TGP ou ALT, LAB-015 Gama GT ou GGT.
- **CONTEXTUAL:** LAB-012 TGO ou AST, LAB-014 Bilirrubina total.
- **Direções conceituais:** LAB-013 ALT/TGP: `above` → candidato `attention_present`; `within` → candidato `attention_not_detected`; `below` → `indeterminate`. LAB-015 GGT: idem.
- **Limites:** nenhum marcador isolado valida, confirma ou prova o Sistema Detox + Linfático. **Dados hepáticos são dados clínicos próprios e não prova de score autoral.** A relação D04 → `detox_linfatico` é autoral, comparativa e não diagnóstica.
- Regra ALT + GGT quando discordantes: **PENDENTE no Bloco 19**.

### LI-D05 — Renal e Hidroeletrolítico → nenhum na V1 (`holoscan_systems = []`)

- **DIRECTIONAL:** nenhum. **CONTEXTUAL:** LAB-010 Creatinina, LAB-011 Ureia, LAB-019 Sódio, LAB-020 Potássio.
- D05 permanece domínio laboratorial oficial da LI. Na V1: não produz direção HOLOSCAN; não produz Convergente; não produz Divergente; não altera nenhum score HOLOSCAN, Índice ou Tríada. Dados permanecem visíveis, classificáveis, rastreáveis e interpretáveis pela profissional.
- **Não relacionar automaticamente com `detox_linfatico`.**

### LI-D06 — Micronutrientes e Metabolismo Mineral → nenhum na V1 (`holoscan_systems = []`)

- **DIRECTIONAL:** nenhum. **CONTEXTUAL:** LAB-017 Homocisteína, LAB-021 Magnésio, LAB-022 Zinco, LAB-023 Selênio, LAB-024 Fósforo, LAB-025 Vitamina B12, LAB-026 Ácido fólico, LAB-028 Ferro sérico, LAB-029 Ferritina, LAB-034 Paratormônio ou PTH, LAB-035 25 OH vitamina D, LAB-045 Cálcio ionizado sérico.
- D06 permanece domínio laboratorial oficial. Na V1: sem correspondência HOLOSCAN; não gera Convergente nem Divergente; nenhuma deficiência/excesso altera HOLOSCAN.
- **Não herdar** relações legadas com Mental-Emocional-Espiritual. **Não criar equivalência por plausibilidade.**

### LI-D07 — Endócrino e Hormonal → nenhum na V1 (`holoscan_systems = []`)

- **DIRECTIONAL:** nenhum. **CONTEXTUAL:** LAB-030 TSH, LAB-031 T4 livre, LAB-032 T3 livre, LAB-034 Paratormônio ou PTH, LAB-036 DHT, LAB-037 Testosterona livre, LAB-038 Testosterona total, LAB-039 SHBG, LAB-040 Progesterona, LAB-041 Estradiol, LAB-042 LH, LAB-043 FSH.
- D07 permanece domínio laboratorial oficial. Na V1: sem correspondência HOLOSCAN; não gera Convergente nem Divergente; exames tireoidianos **não** confirmam o Sistema Metabólico; hormônios sexuais **não** confirmam Mental-Emocional-Espiritual.
- **Não herdar** TSH/T4 legado → `metabolico`.

## 5. Multidomínio

Vínculos já aprovados preservados. LAB-034 PTH continua em D06 **e** D07 (ambos contextuais); LAB-025, 026, 028, 029 continuam em D01 (contextuais) **e** D06 (contextuais). O mesmo resultado **não** é duplicado fisicamente, **não** cria dois votos artificiais e **não** altera a contagem dos 45. Cada vínculo possui contexto próprio (`cross_source_role` por vínculo, não por exame).

## 6. Domínios sem sistema HOLOSCAN — distinção obrigatória

A ausência de sistema em D05/D06/D07 **não é erro técnico**: é decisão metodológica explícita da V1. Quando o pacote LI declarar explicitamente `holoscan_mapping_mode = none` (ou equivalente técnico futuro) para o domínio, **não usar** `missing_domain_holoscan_mapping`. Ausência **intencional e homologada** ≠ mapeamento **faltando**.

| Situação | Exemplo | O que é | O que não é |
|---|---|---|---|
| 1. domínio com confronto cross-source habilitado | D01–D04 | pode chegar a CONVERGENTE / DIVERGENTE / SEM DADOS SUFICIENTES conforme 16/17/19 | — |
| 2. domínio laboratorial sem confronto HOLOSCAN na V1 | D05, D06, D07 (`holoscan_mapping_mode = none`) | leitura laboratorial própria, visível e rastreável; propriedade metodológica intencional | **não** é "Sem dados suficientes"; **não** é `missing_domain_holoscan_mapping`; **não** é erro |
| 3. domínio com confronto habilitado mas dados insuficientes | D01–D04 sem aplicação elegível, fora da janela, cobertura < 0,80, suficiência não atingida, mistos sem regra | SEM DADOS SUFICIENTES com reason_codes explícitos (DECISÃO 22) | — |

**Não foi inventado novo estado oficial.** A forma final de apresentação na UI da situação 2 será decidida posteriormente; nenhuma informação enganosa pode ser exibida até então.

## 7. Status dos Blocos 20/21 após esta etapa

| Bloco | Status |
|---|---|
| 20 — CONVERGENTE | **ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS** |
| 21 — DIVERGENTE | **ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS** |

O estado final CONVERGENTE/DIVERGENTE ainda depende dos Blocos **16, 17 e 19**. **Não declarar o motor LI completo.** 20/21 não são executáveis sem 16/17/19.

## 8. Campo DECISÃO

**DECISÃO:** regras transversais 20/21-A e 20/21-B e matriz da seção 3, com os papéis directional/contextual, direções conceituais, limites e distinção de domínios sem sistema registrados nas seções 4–6.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026; relação domínio → sistema **autoral, comparativa, versionada e não diagnóstica**; nenhuma herança de `legacy_sistema`, nomes, categorias ou `confrontar()`; nenhum corte novo além das faixas homologadas do HOLOS-V1@2.

**FONTE:** Documento Mestre + pacote HOLOSCAN-V1@2 (faixas e sistemas) + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS — estado final depende de 16/17/19; não implementado, não registrado no banco, não homologado.
