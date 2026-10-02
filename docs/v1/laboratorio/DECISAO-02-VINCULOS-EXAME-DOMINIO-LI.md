# DECISÃO 02 — VÍNCULOS EXAME → DOMÍNIO DA LEITURA INTEGRADA

Etapa 5.4 (matriz) · **Etapa 5.5 (decisão registrada)** · bloco 2 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende da DECISÃO 01 (7 domínios LI-D01…LI-D07, `DECISAO-01-DOMINIOS-LI.md`).

> **DECIDIDO — 02/10/2026, Daniel.** Decisão metodológica humana aprovada e registrada abaixo (matriz completa). **Ainda não é**: implementação, migration clínica, Aprovação 1 no banco, Aprovação 2, homologação ou deploy. Os 7 domínios, os 47 vínculos (42 exames), as direções e os 3 casos sem domínio **não foram inseridos** em migration, banco, servidor falso, motor, UI nem no pacote LI real; a implementação será em lote, depois das demais decisões metodológicas necessárias.

## O que foi decidido

Para cada um dos 45 exames-base: a quais domínios (0, 1 ou N) pertence e a **direção** relevante. Variante, material e método **por vínculo** ficam para a implementação, respeitando as regras abaixo (PCR e Magnésio têm variantes distintas que não se fundem).

## Significado de "direção" (registro expresso)

`above`, `below`, `any` nesta decisão significa **apenas**: "qual lado de uma referência laboratorial aplicável poderá futuramente participar da regra da LI". **Não** significa diagnóstico, gravidade, melhora, piora, causalidade nem convergência automática. **A direção sozinha não produz estado de Leitura Integrada**: sem referência elegível (blocos 7–9), suficiência (16–18), tratamento de mistos (19) e regras de convergência/divergência (20–21) homologados, todo domínio continua `sem_dados_suficientes`.

## Regras que valem para a matriz (DECISÃO 01, regras 4–9)

- Um exame pode pertencer a zero, um ou vários domínios; cada vínculo é decidido e versionado individualmente.
- Exame sem vínculo aprovado continua no prontuário e **não** participa da Leitura Integrada.
- Não existe domínio "Outros"; categoria do catálogo não é domínio; vínculos do legado (`exames.csv.sistema`) **não** foram herdados (a coluna aparece só como contexto, NÃO HOMOLOGADO PARA VÍNCULO).
- Vínculo comporta variante/material: `LAB-016` sem variante e `LAB-016 variant = ultrassensivel` são vínculos distintos (ambos em D01); `LAB-021` sem variante e `LAB-021 variant = eritrocitario` são vínculos distintos (ambos em D06). Referências, materiais e métodos não se fundem entre variantes.
- Cada vínculo oficial futuro terá `source`, `justification`, `version` na migration.

## Fonte

Decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental realizada para o Bloco 2. **Não atribuída ao legado.** As fontes externas consultadas nessa revisão **não estão registradas formalmente no repositório**: a coluna "Fonte metodológica" traz **FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR** em todas as linhas; nenhuma citação, DOI ou diretriz foi fabricada.

## Domínios (DECISÃO 01)

D01 = LI-D01 Hematológico e Inflamatório · D02 = LI-D02 Glicêmico e Metabólico · D03 = LI-D03 Lipídico · D04 = LI-D04 Hepático · D05 = LI-D05 Renal e Hidroeletrolítico · D06 = LI-D06 Micronutrientes e Metabolismo Mineral · D07 = LI-D07 Endócrino e Hormonal.

## Matriz decidida (45 linhas)

Legenda: "legado EXA" = item do `exames.csv` mapeado deterministicamente para este LAB (`MAPA_LEGADO`); "legacy_sistema" = sistema HOLOSCAN do confronto antigo — **NÃO HOMOLOGADO PARA VÍNCULO, não herdado**. Material e método relevantes: **não decididos** aqui (declarados na implementação, por vínculo).

| Código | Exame canônico | Categoria do catálogo (navegação — NÃO HOMOLOGADO PARA VÍNCULO) | Aliases | Variante relevante | Material relevante | Método relevante | Legado EXA correspondente | legacy_sistema | Domínio(s) decidido(s) | Múltiplos domínios | Direção | Justificativa | Fonte metodológica | Status | Observações | DECISÃO HUMANA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LAB-001 | Hemograma completo (composto) | Hematologia | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D01** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | vínculo no exame composto; componentes não recebem domínio próprio nesta decisão | LI-D01 / any |
| LAB-002 | Glicemia de jejum | Glicêmico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-005 Glicemia de jejum | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D02** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D02 / any |
| LAB-003 | Insulina basal | Glicêmico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-006 Insulina de jejum (requires_manual_mapping — identidade NÃO provada) | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D02** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | NÃO resolver automaticamente a identidade legado "Insulina de jejum" (EXA-006); permanece requires_manual_mapping (bloco 29) | LI-D02 / any |
| LAB-004 | Hemoglobina glicada | Glicêmico | HbA1c | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-008 Hemoglobina glicada | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D02** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D02 / above |
| LAB-005 | Triglicerídeos | Lipídico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-009 Triglicerideos | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D03** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D03 / above |
| LAB-006 | Colesterol total | Lipídico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D03** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D03 / above |
| LAB-007 | LDL colesterol | Lipídico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D03** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D03 / above |
| LAB-008 | LDL oxidada | Lipídico especializado | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D03** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | marcador especializado; não confundir com LDL colesterol | LI-D03 / above |
| LAB-009 | HDL colesterol | Lipídico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-010 HDL | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D03** | não (1) | **below** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D03 / below |
| LAB-010 | Creatinina | Renal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-018 Creatinina | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D05** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D05 / above |
| LAB-011 | Ureia | Renal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-017 Ureia | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D05** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D05 / above |
| LAB-012 | TGO ou AST | Hepático | TGO, AST | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-013 TGO (AST) | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D04** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | contexto continua obrigatório; AST não é marcador exclusivamente hepático | LI-D04 / above |
| LAB-013 | TGP ou ALT | Hepático | TGP, ALT | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-014 TGP (ALT) | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D04** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D04 / above |
| LAB-014 | Bilirrubina total | Hepático | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-016 Bilirrubina total | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D04** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D04 / above |
| LAB-015 | Gama GT ou GGT | Hepático | Gama GT, GGT | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-015 GGT | detox_linfatico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D04** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D04 / above |
| LAB-016 | PCR | Inflamação | Proteína C reativa | sem variante e ultrassensivel: vínculos distintos (D01) | não decidido (declarar na implementação) | não decidido | EXA-002 PCR ultrassensivel (variante ultrassensivel) | acido_inflamatorio — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D01** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | VARIANTES: PCR sem variante e PCR ultrassensível podem compartilhar D01, mas constituem vínculos DISTINTOS; não fundir referências, métodos ou variantes | LI-D01 / above |
| LAB-017 | Homocisteína | Investigação contextual | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-023 Homocisteina | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D06** | não (1) | **above** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | marcador contextual; não tratar como específico de deficiência isolada | LI-D06 / above |
| LAB-018 | Fibrinogênio | Investigação contextual | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D01** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D01 / any |
| LAB-019 | Sódio | Eletrólitos | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D05** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D05 / any |
| LAB-020 | Potássio | Eletrólitos | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D05** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D05 / any |
| LAB-021 | Magnésio | Minerais | — | sem variante e eritrocitario: vínculos distintos (D06) | não decidido (declarar na implementação) | não decidido | EXA-022 Magnesio eritrocitario (variante eritrocitario) | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D06** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | VARIANTES: sem variante e eritrocitário permanecem distintas; não fundir referência/material/método | LI-D06 / any |
| LAB-022 | Zinco | Minerais | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D06** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D06 / any |
| LAB-023 | Selênio | Minerais | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D06** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D06 / any |
| LAB-024 | Fósforo | Minerais | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D06** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D06 / any |
| LAB-025 | Vitamina B12 | Vitaminas | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-020 Vitamina B12 | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D01 + D06** | SIM (2) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D01 + LI-D06 / any |
| LAB-026 | Ácido fólico | Vitaminas | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D01 + D06** | SIM (2) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D01 + LI-D06 / any |
| LAB-027 | Alumínio | Elementos especializados | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **NENHUM DOMÍNIO NA V1** | — | **nenhuma** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | permanece disponível no prontuário; não participa da Leitura Integrada V1 | nenhum domínio na V1 |
| LAB-028 | Ferro sérico | Ferro | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D01 + D06** | SIM (2) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D01 + LI-D06 / any |
| LAB-029 | Ferritina | Ferro | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-021 Ferritina | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D01 + D06** | SIM (2) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D01 + LI-D06 / any |
| LAB-030 | TSH | Tireoide | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-011 TSH | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-031 | T4 livre | Tireoide | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-012 T4 livre | metabolico — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-032 | T3 livre | Tireoide | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-033 | Ácido úrico | Metabólico | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-004 Acido urico | acido_inflamatorio — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **NENHUM DOMÍNIO NA V1** | — | **nenhuma** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | permanece disponível no prontuário; não participa da Leitura Integrada V1 | nenhum domínio na V1 |
| LAB-034 | Paratormônio ou PTH | Metabolismo mineral | Paratormônio, PTH | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D06 + D07** | SIM (2) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D06 + LI-D07 / any |
| LAB-035 | 25 OH vitamina D | Vitaminas | Vitamina D 25-OH, 25-hidroxivitamina D | nenhuma declarada | não decidido (declarar na implementação) | não decidido | EXA-019 Vitamina D (25-OH) | mental_emocional_espiritual — NÃO HOMOLOGADO PARA VÍNCULO; não herdado | **D06** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | não confundir com 1,25-(OH)2 vitamina D | LI-D06 / any |
| LAB-036 | DHT | Hormonal | Di-hidrotestosterona | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-037 | Testosterona livre | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-038 | Testosterona total | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-039 | SHBG | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-040 | Progesterona | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-041 | Estradiol | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-042 | LH | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-043 | FSH | Hormonal | — | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D07** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | — | LI-D07 / any |
| LAB-044 | CK | Muscular | Creatina quinase, Creatinoquinase | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **NENHUM DOMÍNIO NA V1** | — | **nenhuma** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | permanece disponível no prontuário; não participa da Leitura Integrada V1 | nenhum domínio na V1 |
| LAB-045 | Cálcio ionizado sérico | Metabolismo mineral | Cálcio iônico | nenhuma declarada | não decidido (declarar na implementação) | não decidido | — | — | **D06** | não (1) | **any** | decisão autoral V1 (Daniel) | FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR | **DECIDIDO** | não confundir com cálcio total | LI-D06 / any |

## Casos sensíveis — como ficaram

| Exame | Decisão | Registro |
|---|---|---|
| LAB-016 PCR | D01 / above | PCR sem variante e PCR ultrassensível: **vínculos distintos** no mesmo domínio; não fundir referências, métodos ou variantes |
| LAB-021 Magnésio | D06 / any | sem variante e eritrocitário: **vínculos distintos**; não fundir referência/material/método |
| LAB-008 LDL oxidada | D03 / above | marcador especializado; não confundir com LDL colesterol (LAB-007) |
| LAB-027 Alumínio | **nenhum domínio na V1** | permanece no prontuário; fora da LI V1 |
| LAB-033 Ácido úrico | **nenhum domínio na V1** | idem (categoria "Metabólico" e legado `acido_inflamatorio` não decidiram nada) |
| LAB-044 CK | **nenhum domínio na V1** | idem |
| LAB-036 DHT | D07 / any | — |
| LAB-045 Cálcio ionizado sérico | D06 / any | não confundir com cálcio total |
| LAB-017 Homocisteína | D06 / above | marcador contextual; não específico de deficiência isolada |
| LAB-018 Fibrinogênio | D01 / any | — |
| LAB-003 Insulina basal | D02 / any | identidade legado "Insulina de jejum" (EXA-006) **continua pendente** (bloco 29); `requires_manual_mapping` mantido; sugestão do `MAPA_LEGADO` não é alias oficial |
| LAB-001 Hemograma completo | D01 / any | vínculo no exame composto; componentes não recebem domínio próprio nesta decisão |
| LAB-012 TGO/AST | D04 / above | contexto obrigatório; AST não é exclusivamente hepático |
| LAB-035 25 OH vitamina D | D06 / any | não confundir com 1,25-(OH)2 vitamina D |

## Contagem (validada a partir do catálogo)

| | |
|---|---|
| exames-base | **45** |
| com pelo menos um domínio | **42** |
| sem domínio na V1 | **3** — LAB-027 Alumínio, LAB-033 Ácido úrico, LAB-044 CK |
| multi-domínio | **5** — LAB-025 B12 (D01+D06), LAB-026 Ácido fólico (D01+D06), LAB-028 Ferro sérico (D01+D06), LAB-029 Ferritina (D01+D06), LAB-034 PTH (D06+D07) |
| pares exame → domínio | 47 (antes de desdobrar variantes de PCR e Magnésio na implementação) |
| por domínio | D01: 8 (LAB-001, 016, 018, 025, 026, 028, 029 — PCR conta 1 par) · D02: 3 · D03: 5 · D04: 4 · D05: 4 · D06: 13 · D07: 10 |
| vínculos herdados do legado | **0** |
| categorias usadas automaticamente | **0** |
| decididos / pendentes | **45 / 0** |

## Dependências futuras

Blocos 3–6 (elegibilidade da aplicação HOLOSCAN e das coletas, janela temporal, múltiplas coletas) abertos na Etapa 5.5 (`DECISAO-03…06`). Blocos 7–13 (referências, conversões, compatibilidades), 16–19 (suficiência, mistos), 20–21 (convergência/divergência, incluindo a relação domínio → sistema(s) HOLOSCAN por regra explícita) e 23 (textos) continuam pendentes. Implementação em lote: migration versionada com domínios + vínculos (com variante/material/método, `source`, `justification`, `version`) + regras; pacote → `em_revisao`; Daniel → Rodrigo → Homologar com identidade real.

## Registro

**DECISÃO:** a matriz acima (42 exames vinculados, 47 pares, 3 sem domínio, 5 multi-domínio, direções `above`/`below`/`any` conforme a coluna).
**JUSTIFICATIVA:** organização dos exames-base nos 7 domínios próprios da LI (DECISÃO 01), com direção declarada por exame, sem herança do legado e sem uso automático das categorias; exames sem relação clara com os domínios da V1 ficam fora da LI mas disponíveis no prontuário.
**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.
**DATA:** 02/10/2026.
**Status:** DECISÃO METODOLÓGICA HUMANA APROVADA POR DANIEL — não implementada, não registrada no banco, não homologada.
