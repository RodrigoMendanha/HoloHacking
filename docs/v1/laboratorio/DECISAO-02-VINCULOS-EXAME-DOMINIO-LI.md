# DECISÃO 02 — VÍNCULOS EXAME → DOMÍNIO DA LEITURA INTEGRADA

Etapa 5.4 · 02/10/2026 · matriz de decisão para **Daniel** (responsável primário) · detalha o bloco 2 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende da DECISÃO 01 (7 domínios LI-D01…LI-D07, `DECISAO-01-DOMINIOS-LI.md`).

> **NADA DECIDIDO.** A coluna "domínio candidato" está vazia em todas as 45 linhas e **não** foi preenchida a partir do nome do exame, da categoria do catálogo, do `legacy_sistema`, de conhecimento geral ou de coincidência de nome. Categoria e legado aparecem **só como contexto** e estão marcados **NÃO HOMOLOGADO PARA VÍNCULO**. Nenhum vínculo foi inserido na migration, no banco, no servidor falso, no motor ou na UI.

## O que precisa ser decidido

Para cada um dos 45 exames-base: a quais domínios (0, 1 ou N) ele pertence; para quais **variantes** (ex.: `LAB-016` sem variante vs `variant = ultrassensivel`; `LAB-021` sem variante vs `variant = eritrocitario`) e **materiais** o vínculo vale; se o **método** é relevante; a **direção** relevante (`above`, `below`, `any`); a **fonte** metodológica (`source`, `justification`, `version`) de cada vínculo.

## Regras que valem para a matriz (DECISÃO 01, regras 4–9)

- Um exame pode pertencer a zero, um ou vários domínios. **Não pressupor exclusividade.**
- Cada vínculo é decidido e versionado individualmente; vínculo sem fonte não entra.
- Exame sem vínculo aprovado continua no prontuário e **não** participa da Leitura Integrada.
- Não existe domínio "Outros"; categoria do catálogo não é domínio; os vínculos do legado (`exames.csv.sistema`) não são herdados.
- Vínculo comporta variante/material: `exam_code = LAB-021, variant = eritrocitario` é um vínculo distinto de `exam_code = LAB-021, variant = null`, quando a decisão exigir.
- Cada vínculo oficial futuro terá `source`, `justification`, `version`. Nesta matriz: **SEM FONTE AINDA**.

## Domínios disponíveis (DECISÃO 01)

LI-D01 Hematológico e Inflamatório · LI-D02 Glicêmico e Metabólico · LI-D03 Lipídico · LI-D04 Hepático · LI-D05 Renal e Hidroeletrolítico · LI-D06 Micronutrientes e Metabolismo Mineral · LI-D07 Endócrino e Hormonal.

## Matriz (45 linhas; uma por exame-base)

Legenda: "legado EXA" = item do `exames.csv` mapeado deterministicamente para este LAB na migração (`MAPA_LEGADO`); "legacy_sistema" = sistema HOLOSCAN que o confronto antigo usava — **NÃO HOMOLOGADO PARA VÍNCULO**. "variante/material/método relevante" = o que a decisão precisa declarar (não decidido). **SENSÍVEL** = vínculo não é simples; não resolver automaticamente.

| Código | Exame canônico | Categoria do catálogo (navegação — NÃO HOMOLOGADO PARA VÍNCULO) | Aliases | Variante relevante | Material relevante | Método relevante | Legado EXA correspondente | legacy_sistema (NÃO HOMOLOGADO PARA VÍNCULO) | Domínio candidato | Múltiplos domínios | Justificativa | Fonte metodológica | Status | Observações | DECISÃO HUMANA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LAB-001 | Hemograma completo (composto) | Hematologia | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Hemograma: item composto (componentes); vínculo por componente não existe no modelo atual | ______ |
| LAB-002 | Glicemia de jejum | Glicêmico | — | a declarar se existir | a declarar | a declarar | EXA-005 Glicemia de jejum | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-003 | Insulina basal | Glicêmico | — | a declarar se existir | a declarar | a declarar | EXA-006 Insulina de jejum (requires_manual_mapping — identidade NÃO provada) | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Insulina basal × legado "Insulina de jejum" (EXA-006): identidade NÃO decidida; sugestão do MAPA_LEGADO não é alias oficial | ______ |
| LAB-004 | Hemoglobina glicada | Glicêmico | HbA1c | a declarar se existir | a declarar | a declarar | EXA-008 Hemoglobina glicada | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-005 | Triglicerídeos | Lipídico | — | a declarar se existir | a declarar | a declarar | EXA-009 Triglicerideos | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-006 | Colesterol total | Lipídico | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-007 | LDL colesterol | Lipídico | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-008 | LDL oxidada | Lipídico especializado | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: LDL oxidada: marcador especializado, não é LDL colesterol | ______ |
| LAB-009 | HDL colesterol | Lipídico | — | a declarar se existir | a declarar | a declarar | EXA-010 HDL | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-010 | Creatinina | Renal | — | a declarar se existir | a declarar | a declarar | EXA-018 Creatinina | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-011 | Ureia | Renal | — | a declarar se existir | a declarar | a declarar | EXA-017 Ureia | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-012 | TGO ou AST | Hepático | TGO, AST | a declarar se existir | a declarar | a declarar | EXA-013 TGO (AST) | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-013 | TGP ou ALT | Hepático | TGP, ALT | a declarar se existir | a declarar | a declarar | EXA-014 TGP (ALT) | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-014 | Bilirrubina total | Hepático | — | a declarar se existir | a declarar | a declarar | EXA-016 Bilirrubina total | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-015 | Gama GT ou GGT | Hepático | Gama GT, GGT | a declarar se existir | a declarar | a declarar | EXA-015 GGT | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-016 | PCR | Inflamação | Proteína C reativa | ultrassensivel (PCR-us) vs nenhuma | a declarar | a declarar | EXA-002 PCR ultrassensivel (variante ultrassensivel) | acido_inflamatorio — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: PCR vs PCR ultrassensível (variante); referência e método distintos | ______ |
| LAB-017 | Homocisteína | Investigação contextual | — | a declarar se existir | a declarar | a declarar | EXA-023 Homocisteina | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Homocisteína: pode ser lida em mais de um domínio; decisão de multiplicidade | ______ |
| LAB-018 | Fibrinogênio | Investigação contextual | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Fibrinogênio: pode ser lido como hematológico e inflamatório; decisão de multiplicidade | ______ |
| LAB-019 | Sódio | Eletrólitos | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-020 | Potássio | Eletrólitos | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-021 | Magnésio | Minerais | — | eritrocitario vs nenhuma | a declarar | a declarar | EXA-022 Magnesio eritrocitario (variante eritrocitario) | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Magnésio sérico vs eritrocitário (variante; material não inventado no legado) | ______ |
| LAB-022 | Zinco | Minerais | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-023 | Selênio | Minerais | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-024 | Fósforo | Minerais | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-025 | Vitamina B12 | Vitaminas | — | a declarar se existir | a declarar | a declarar | EXA-020 Vitamina B12 | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-026 | Ácido fólico | Vitaminas | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-027 | Alumínio | Elementos especializados | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Alumínio: elemento especializado; material/método decisivos | ______ |
| LAB-028 | Ferro sérico | Ferro | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-029 | Ferritina | Ferro | — | a declarar se existir | a declarar | a declarar | EXA-021 Ferritina | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-030 | TSH | Tireoide | — | a declarar se existir | a declarar | a declarar | EXA-011 TSH | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-031 | T4 livre | Tireoide | — | a declarar se existir | a declarar | a declarar | EXA-012 T4 livre | metabolico — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-032 | T3 livre | Tireoide | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-033 | Ácido úrico | Metabólico | — | a declarar se existir | a declarar | a declarar | EXA-004 Acido urico | acido_inflamatorio — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Ácido úrico: legado em acido_inflamatorio, catálogo em Metabólico — exemplo de que categoria e legado divergem | ______ |
| LAB-034 | Paratormônio ou PTH | Metabolismo mineral | Paratormônio, PTH | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-035 | 25 OH vitamina D | Vitaminas | Vitamina D 25-OH, 25-hidroxivitamina D | a declarar se existir | a declarar | a declarar | EXA-019 Vitamina D (25-OH) | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-036 | DHT | Hormonal | Di-hidrotestosterona | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: DHT: hormonal específico; método relevante | ______ |
| LAB-037 | Testosterona livre | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-038 | Testosterona total | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-039 | SHBG | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-040 | Progesterona | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-041 | Estradiol | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-042 | LH | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-043 | FSH | Hormonal | — | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | — | ______ |
| LAB-044 | CK | Muscular | Creatina quinase, Creatinoquinase | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: CK: marcador muscular; contexto de coleta (exercício) decisivo | ______ |
| LAB-045 | Cálcio ionizado sérico | Metabolismo mineral | Cálcio iônico | a declarar se existir | a declarar | a declarar | — | — | — (a decidir) | permitida (0, 1 ou N) | — | SEM FONTE AINDA | PENDENTE | **SENSÍVEL**: Cálcio ionizado: material/método decisivos; não é cálcio total | ______ |

## Exames especialmente sensíveis (destacados na matriz)

| Exame | Por que não é simples |
|---|---|
| LAB-016 PCR | PCR e PCR ultrassensível são variantes distintas (identidade, referência e método); o legado só tinha PCR-us (EXA-002). Decidir se o vínculo é por variante e para quais domínios. |
| LAB-021 Magnésio | Magnésio sérico e eritrocitário são variantes/materiais distintos; o legado só tinha o eritrocitário (EXA-022), com material não informado (não inventado). |
| LAB-008 LDL oxidada | Marcador especializado; não é LDL colesterol (LAB-007); pode não pertencer ao mesmo domínio ou a nenhum. |
| LAB-027 Alumínio | Elemento especializado; material e método decisivos; pode não ter domínio na V1. |
| LAB-036 DHT | Hormonal específico; método relevante. |
| LAB-044 CK | Marcador muscular; contexto de coleta (exercício) decisivo; nenhum dos 7 domínios o nomeia. |
| LAB-045 Cálcio ionizado sérico | Material/método decisivos; não é cálcio total. |
| LAB-017 Homocisteína | Candidata a multiplicidade de domínios; decisão explícita de 0/1/N. |
| LAB-018 Fibrinogênio | Pode ser lido como hematológico e como inflamatório; decisão de multiplicidade. |
| LAB-003 Insulina basal | **Insulina basal × legado "Insulina de jejum" (EXA-006)**: identidade não decidida (bloco 29); a sugestão `LAB-003` do `MAPA_LEGADO` **não é alias oficial**; linhas legado estão com `requires_manual_mapping`. |
| LAB-001 Hemograma completo | Item composto (componentes em `lab_result_components`); o modelo atual vincula o exame, não o componente — decidir se isso basta. |
| LAB-033 Ácido úrico | Legado em `acido_inflamatorio`, catálogo em "Metabólico": exemplo de que categoria e legado divergem e nenhum dos dois decide. |

## Dependências futuras

Decididos os vínculos: blocos 16–19 (suficiência, conjunto mínimo, ausentes, mistos) passam a ter denominadores; bloco 20 (convergência) precisa da relação domínio → sistema(s) HOLOSCAN (regra explícita, DECISÃO 01 regra 3); blocos 7–13 (referências, conversões, compatibilidades) definem o que torna cada resultado classificável. Implementação em lote (migration versionada: domínios + vínculos + regras; pacote → `em_revisao`; Daniel → Rodrigo → Homologar com identidade real).

## Resumo do Bloco 2

| | |
|---|---|
| exames-base | 45 |
| decididos | 0 |
| pendentes | 45 |
| sem domínio | 0 até decisão humana (pendência **não** é ausência de vínculo definitiva) |
| multi-domínio | 0 até decisão humana |
| vínculos herdados do legado | 0 |
| categorias convertidas automaticamente em domínio | 0 |

DECISÃO (por linha, na coluna "DECISÃO HUMANA"): ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______
