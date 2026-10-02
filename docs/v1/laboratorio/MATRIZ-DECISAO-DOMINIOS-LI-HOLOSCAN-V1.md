# Matriz de decisão — domínios LI → sistema(s) HOLOSCAN → regra de direção (V1)

Etapa 5.11 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · fecha os Blocos **20/21** quando preenchida · fontes lidas: `DECISAO-01-DOMINIOS-LI.md`, `DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md`, `DECISAO-20-…`, `DECISAO-21-…`, `PACOTE-FINAL-PENDENCIAS-EXECUTAVEIS-LI-V1.md`, pacote HOLOSCAN aprovado da Etapa 4.2 (`docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`, `pacote-metodologico-v1-candidato.json` HOLOS-V1@2) e Documento Mestre.

> **NADA DECIDIDO.** Todos os campos decisórios estão **PENDENTE**. Nenhum sistema foi atribuído a nenhum domínio. Nenhuma correspondência faixa → direção foi escolhida. **Não herdado:** `legacy_sistema` do `exames.csv`, nomes parecidos (ex.: LI-D02 "Glicêmico e Metabólico" **não** é automaticamente o Sistema Metabólico), categorias laboratoriais, relações do antigo `confrontar()`, conhecimento geral, "parece fazer sentido". Nenhuma alteração em migration, banco, servidor falso, motor, UI ou pacote LI real.

## 1. Invariantes já decididos que esta matriz deve respeitar

- **DECISÃO 20/21 (arquitetura):** CONVERGENTE = `present+present` ou `not_detected+not_detected`; DIVERGENTE = `present×not_detected` em qualquer ordem; `indeterminate` em qualquer fonte nunca produz convergente/divergente → SEM DADOS SUFICIENTES; um exame isolado não converge; divergência não é erro nem invalida fonte.
- **Precedência do motor (Etapa 5.9):** validar aplicação → pacote/versão → elegibilidade → janela (LI-TEMP-01 v1) → referências/compatibilidades → suficiência → mistos → direção HOLOSCAN → direção laboratorial → estado; SEM DADOS tem precedência; nunca fallback.
- **DECISÃO 03:** 1 aplicação HOLOSCAN, consolidada, pacote homologado, compatibilidade de versão declarada pelo pacote LI; sistema não avaliável → `holoscan_not_evaluable`.
- **Domínio sem relação HOLOSCAN decidida:** `missing_domain_holoscan_mapping` → SEM DADOS SUFICIENTES.
- **DECISÃO 25:** mudança da relação domínio → sistema quebra a comparabilidade entre versões do pacote LI.

## 2. Universo de escolha — os 5 sistemas do pacote HOLOSCAN aprovado (HOLOS-V1@2, Etapa 4.2)

Apenas contexto. **Não inferir relação com domínio LI.** Códigos oficiais do pacote entre crases.

| Código | Nome oficial | Itens primários | Secundárias contextuais (não pontuam) |
|---|---|---|---|
| `fungico` | Sistema Fúngico | 15 | 0 |
| `acido_inflamatorio` | Sistema Ácido Inflamatório | 16 | 0 |
| `metabolico` | Sistema Metabólico | 14 | 5 |
| `detox_linfatico` | Sistema Detox e Linfático | 15 | 1 |
| `mental_emocional_espiritual` | Sistema Mental Emocional Espiritual | 24 | 5 |

### 2.1 Regras comuns aos 5 sistemas (Decisões 2, 3, 7, 8, 9 da Etapa 4.2)

- **Escala de resposta:** 0–3 (frequência: Nunca/Às vezes/Frequente/Sempre; intensidade: Nada/Um pouco/Bastante/Muito). Direta: z = resposta; invertida: z = 3 − resposta.
- **Pontuação do sistema:** só itens primários respondidos, peso 1; carga = 10·Σz/Σ3; **nota = 10 − carga**, escala 0–10, fração exata. Nota 10 = nenhum item primário respondido com z > 0 (REF-01); nota 0 = todos com z = 3 (REF-02). Portanto **nota mais alta = menor carga de respostas no eixo**; o significado clínico disso **não** está decidido para a LI.
- **Avaliabilidade:** cobertura por sistema = válidas dos primários / primários ≥ **0,80**; abaixo → sistema não avaliável (em branco, recusada e não aplicável não são zero). Secundárias contextuais não entram no denominador nem na cobertura.
- **Faixas oficiais (iguais para os 5):** **baixa** 0 ≤ nota < 10/3 · **intermediária** 10/3 ≤ nota < 20/3 · **alta** 20/3 ≤ nota ≤ 10. Classificação pela fração exata; exibição com 1 casa.
- **O que a faixa significa oficialmente:** "A pontuação deste eixo ficou na faixa {baixa | intermediária | alta} nesta aplicação. Revise os itens respondidos e a cobertura antes da interpretação profissional." (paciente: + "Esta pontuação organiza respostas do HOLOSCAN e não representa, sozinha, um diagnóstico."). As afirmações causais antigas são legado não oficial.
- **Limites metodológicos:** nenhum sistema diagnostica; nenhum mede pH, toxinas, função hepática, função linfática, saúde mental ou espiritual; Índice HOLOS e Tríada **não** são sistemas e não entram nesta matriz; nenhuma sugestão automática (CMB/REC/SEL) é oficial.

### 2.2 Contexto por sistema (sem recomendação)

#### `fungico` — Sistema Fúngico

- **Definição operacional aprovada:** Eixo autoral do HOLOSCAN que organiza respostas relacionadas a sinais digestivos, mucosas, pele e padrões de desejo alimentar agrupados pelo método. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença.
- **IDs primários (15):** EMO-101, EMO-102, EMO-103, ESP-501, SNT-101, SNT-102, SNT-103, SNT-104, SNT-105, SNT-106, SNT-107, SNT-108, SNT-109, SNT-110, SNT-111
- **IDs contextuais secundários (0):** — (não pontuam, não contam cobertura)
- **Regra de avaliabilidade:** cobertura ≥ 0,80 dos 15 primários (fixture de teste: avalia com 12/15); abaixo → não avaliável
- **Escala de resultado:** nota 0–10 (fração exata) + faixa baixa / intermediária / alta + cobertura
- **Faixas oficiais:** baixa [0, 10/3) · intermediária [10/3, 20/3) · alta [20/3, 10]
- **O que a nota/faixa significa:** organiza as respostas do eixo nesta aplicação; não é diagnóstico; não mede o que o nome sugere
- **Relação com domínios LI:** **PENDENTE** — nenhuma

#### `acido_inflamatorio` — Sistema Ácido Inflamatório

- **Definição operacional aprovada:** Eixo autoral que organiza respostas relacionadas a dor, rigidez, pele, mucosas e reatividade presentes no questionário. O termo 'ácido' faz parte da nomenclatura autoral e não representa medição do pH corporal. O eixo não diagnostica inflamação nem substitui avaliação ou exames clínicos.
- **IDs primários (16):** EMO-201, EMO-202, EMO-203, EMO-204, ESP-203, ESP-404, SNT-201, SNT-202, SNT-203, SNT-204, SNT-205, SNT-206, SNT-207, SNT-208, SNT-209, SNT-210
- **IDs contextuais secundários (0):** — (não pontuam, não contam cobertura)
- **Regra de avaliabilidade:** cobertura ≥ 0,80 dos 16 primários (fixture de teste: avalia com 13/16); abaixo → não avaliável
- **Escala de resultado:** nota 0–10 (fração exata) + faixa baixa / intermediária / alta + cobertura
- **Faixas oficiais:** baixa [0, 10/3) · intermediária [10/3, 20/3) · alta [20/3, 10]
- **O que a nota/faixa significa:** organiza as respostas do eixo nesta aplicação; não é diagnóstico; não mede o que o nome sugere
- **Relação com domínios LI:** **PENDENTE** — nenhuma

#### `metabolico` — Sistema Metabólico

- **Definição operacional aprovada:** Eixo autoral que organiza respostas relacionadas a energia, fome, comportamento alimentar, composição corporal percebida e achados laboratoriais relatados no questionário. Não diagnostica resistência à insulina, diabetes ou outra condição metabólica.
- **IDs primários (14):** EMO-301, EMO-302, EMO-303, ESP-101, ESP-103, ESP-303, SNT-301, SNT-303, SNT-304, SNT-305, SNT-306, SNT-307, SNT-308, SNT-309
- **IDs contextuais secundários (5):** EMO-101, EMO-502, EMO-504, SNT-101, SNT-501 (não pontuam, não contam cobertura)
- **Regra de avaliabilidade:** cobertura ≥ 0,80 dos 14 primários (fixture de teste: avalia com 12/14); abaixo → não avaliável
- **Escala de resultado:** nota 0–10 (fração exata) + faixa baixa / intermediária / alta + cobertura
- **Faixas oficiais:** baixa [0, 10/3) · intermediária [10/3, 20/3) · alta [20/3, 10]
- **O que a nota/faixa significa:** organiza as respostas do eixo nesta aplicação; não é diagnóstico; não mede o que o nome sugere
- **Relação com domínios LI:** **PENDENTE** — nenhuma

#### `detox_linfatico` — Sistema Detox e Linfático

- **Definição operacional aprovada:** Eixo autoral que organiza respostas relacionadas a inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias presentes no questionário. 'Detox' é nomenclatura do método; a pontuação não mede toxinas, função hepática ou função linfática.
- **IDs primários (15):** EMO-401, EMO-402, EMO-403, ESP-405, ESP-502, SNT-401, SNT-402, SNT-403, SNT-404, SNT-405, SNT-406, SNT-407, SNT-408, SNT-409, SNT-410
- **IDs contextuais secundários (1):** EMO-203 (não pontuam, não contam cobertura)
- **Regra de avaliabilidade:** cobertura ≥ 0,80 dos 15 primários (fixture de teste: avalia com 12/15); abaixo → não avaliável
- **Escala de resultado:** nota 0–10 (fração exata) + faixa baixa / intermediária / alta + cobertura
- **Faixas oficiais:** baixa [0, 10/3) · intermediária [10/3, 20/3) · alta [20/3, 10]
- **O que a nota/faixa significa:** organiza as respostas do eixo nesta aplicação; não é diagnóstico; não mede o que o nome sugere
- **Relação com domínios LI:** **PENDENTE** — nenhuma

#### `mental_emocional_espiritual` — Sistema Mental Emocional Espiritual

- **Definição operacional aprovada:** Eixo autoral que organiza respostas relacionadas a sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal. Não diagnostica transtornos mentais e não mede saúde, valor ou qualidade espiritual.
- **IDs primários (24):** EMO-501, EMO-502, EMO-503, EMO-504, EMO-505, EMO-507, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-401, ESP-402, ESP-403, SNT-501, SNT-502, SNT-503, SNT-504, SNT-505, SNT-506, SNT-507, SNT-508, SNT-509, SNT-510
- **IDs contextuais secundários (5):** EMO-103, EMO-201, EMO-301, EMO-302, EMO-402 (não pontuam, não contam cobertura)
- **Regra de avaliabilidade:** cobertura ≥ 0,80 dos 24 primários (fixture de teste: avalia com 20/24); abaixo → não avaliável
- **Escala de resultado:** nota 0–10 (fração exata) + faixa baixa / intermediária / alta + cobertura
- **Faixas oficiais:** baixa [0, 10/3) · intermediária [10/3, 20/3) · alta [20/3, 10]
- **O que a nota/faixa significa:** organiza as respostas do eixo nesta aplicação; não é diagnóstico; não mede o que o nome sugere
- **Relação com domínios LI:** **PENDENTE** — nenhuma

## 3. Matriz de decisão (todos os campos decisórios PENDENTE)

| domain_code | domain_name | domain_definition | linked_exam_codes | linked_exam_count | candidate_holoscan_system_1 | candidate_holoscan_system_2 | candidate_holoscan_system_3 | aggregation_rule | holoscan_input_required | holoscan_evaluability_rule | attention_present_rule | attention_not_detected_rule | indeterminate_rule | missing_system_rule | multiple_system_rule | source | justification | status | decision | responsible | date |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LI-D01 | Hematológico e Inflamatório | Organiza dados laboratoriais relacionados ao perfil hematológico e a marcadores laboratoriais utilizados na avaliação de processos inflamatórios. | LAB-001, LAB-016, LAB-018, LAB-025, LAB-026, LAB-028, LAB-029 | 7 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D02 | Glicêmico e Metabólico | Organiza dados relacionados ao metabolismo da glicose, resposta insulínica e outros marcadores metabólicos pertinentes. | LAB-002, LAB-003, LAB-004 | 3 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D03 | Lipídico | Organiza dados relacionados ao perfil lipídico e suas variantes laboratoriais. | LAB-005, LAB-006, LAB-007, LAB-008, LAB-009 | 5 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D04 | Hepático | Organiza resultados laboratoriais relacionados à avaliação bioquímica hepática. | LAB-012, LAB-013, LAB-014, LAB-015 | 4 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D05 | Renal e Hidroeletrolítico | Organiza dados relacionados à avaliação renal e ao equilíbrio de eletrólitos medidos laboratorialmente. | LAB-010, LAB-011, LAB-019, LAB-020 | 4 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D06 | Micronutrientes e Metabolismo Mineral | Organiza vitaminas, minerais, elementos e marcadores de metabolismo mineral contemplados pelo catálogo. | LAB-017, LAB-021, LAB-022, LAB-023, LAB-024, LAB-025, LAB-026, LAB-028, LAB-029, LAB-034, LAB-035, LAB-045 | 12 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |
| LI-D07 | Endócrino e Hormonal | Organiza marcadores relacionados aos eixos tireoidiano e hormonal presentes no catálogo. | LAB-030, LAB-031, LAB-032, LAB-034, LAB-036, LAB-037, LAB-038, LAB-039, LAB-040, LAB-041, LAB-042, LAB-043 | 12 | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE | PENDENTE |

Significado das colunas decisórias: `candidate_holoscan_system_n` = código oficial do sistema (ou "nenhum"); `aggregation_rule` = como N sistemas viram uma direção; `holoscan_input_required` = se o domínio exige fonte HOLOSCAN para produzir leitura; `holoscan_evaluability_rule` = o que fazer quando o sistema não é avaliável (cobertura < 0,80); `attention_present_rule` / `attention_not_detected_rule` / `indeterminate_rule` = quais faixas (ou combinações) produzem cada direção; `missing_system_rule` = tratamento de sistema sem nota; `multiple_system_rule` = AND / OR / unanimidade / prioridade / principal + contexto.

## 4. Arquiteturas possíveis por domínio (sem selecionar vencedora)

| Arquitetura | Descrição | Consequências |
|---|---|---|
| A | um sistema único | direção HOLOSCAN do domínio = direção daquele sistema; sistema não avaliável → `holoscan_not_evaluable` → SEM DADOS |
| B | múltiplos sistemas — todos precisam apontar na mesma direção (unanimidade) | discordância → `indeterminate` → SEM DADOS; exige todos avaliáveis (ou regra para ausentes) |
| C | múltiplos sistemas — qualquer um suficiente (OR) | um `present` basta para `present`; definir o que ocorre com `not_detected` + sistema não avaliável |
| D | múltiplos sistemas — subconjunto obrigatório (principal + contexto / prioridade) | sistema principal decide; contextuais só confirmam, só desempatam ou só registram; exige declarar o papel de cada um |
| E | sem relação HOLOSCAN | o domínio **nunca** produz convergente/divergente na V1; leitura sempre SEM DADOS SUFICIENTES (`missing_domain_holoscan_mapping`) ou leitura laboratorial isolada sem confronto |

## 5. Regras de direção a decidir — como faixa vira attention_*

Usar **somente** as faixas homologadas (baixa / intermediária / alta). Nenhum corte novo. **Não assumir** baixo = atenção, alto = atenção, médio = indeterminado ou qualquer outra correspondência sem decisão explícita. Lembrete do pacote real: nota alta = menor carga de respostas; nota baixa = maior carga de respostas; o significado operacional para a LI é decisão humana.

| Opção conceitual | attention_present | attention_not_detected | indeterminate | Observação |
|---|---|---|---|---|
| M1 | baixa | alta | intermediária | três faixas, três direções |
| M2 | baixa + intermediária | alta | — (só por não avaliável) | intermediária tratada como atenção |
| M3 | baixa | intermediária + alta | — (só por não avaliável) | intermediária tratada como sem atenção |
| M4 | alta | baixa | intermediária | inversão de M1 — listada apenas para explicitar que a correspondência não é óbvia e exige decisão |
| M5 | definida por domínio (M1–M4 podem variar entre domínios) | idem | idem | exige justificativa por domínio e afeta comparabilidade |

**DECISÃO por domínio:** vazia (coluna `attention_present_rule` etc. da matriz §3). Sistema não avaliável (cobertura < 0,80) → `holoscan_not_evaluable` → SEM DADOS SUFICIENTES (DECISÕES 03 e 22) — já decidido, não é opção desta matriz.

## 6. Múltiplos sistemas — decisões necessárias quando N > 1

| Questão | Opções (sem decidir) |
|---|---|
| combinação | AND (todos) · OR (qualquer) · unanimidade · prioridade ordenada · sistema principal + contexto |
| sistema não avaliável entre N | invalida o domínio (indeterminate) · ignorado se os demais bastam · bloqueia só quando é o principal |
| direções discordantes | indeterminate · prevalece o principal · prevalece present · prevalece not_detected (cada uma com consequências em convergência/divergência) |
| número mínimo de sistemas avaliáveis | 1 · todos · k de N |

DECISÃO: ______ (por domínio).

## 7. Casos de regressão abstratos (EXPECTED = PENDENTE)

| Caso | Sistemas | Direções HOLOSCAN | EXPECTED (direção HOLOSCAN do domínio) | Depende de |
|---|---|---|---|---|
| A | 1 | attention_present | PENDENTE | arquitetura A |
| B | 1 | attention_not_detected | PENDENTE | arquitetura A |
| C | 1 | indeterminate | PENDENTE (invariante: nunca convergente/divergente) | arquitetura A |
| D | 2 | present + present | PENDENTE | §6 combinação |
| E | 2 | not_detected + not_detected | PENDENTE | §6 combinação |
| F | 2 | present + not_detected | PENDENTE | §6 discordância |
| G | 2 | present + indeterminate | PENDENTE | §6 não avaliável |
| H | 1 | sem dados (sistema não avaliável ou aplicação ausente) | PENDENTE (invariante: SEM DADOS SUFICIENTES — `holoscan_not_evaluable` / `missing_holoscan_source`) | DECISÃO 03/22 |

Nenhum resultado oficial esperado ainda. Os invariantes citados vêm das DECISÕES 03, 20, 21 e 22 e não são resultados desta matriz.

## 8. Contagem preservada

| D01 | D02 | D03 | D04 | D05 | D06 | D07 | pares |
|---|---|---|---|---|---|---|---|
| 7 | 3 | 5 | 4 | 4 | 12 | 12 | 47 |

Nenhum vínculo alterado.

## 9. Campo DECISÃO (por domínio)

**LI-D01 — Hematológico e Inflamatório**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______

**LI-D02 — Glicêmico e Metabólico**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______

**LI-D03 — Lipídico**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______

**LI-D04 — Hepático**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______

**LI-D05 — Renal e Hidroeletrolítico**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______

**LI-D06 — Micronutrientes e Metabolismo Mineral**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______

**LI-D07 — Endócrino e Hormonal**  
SISTEMA(S): ______ · AGREGAÇÃO: ______ · REGRA present: ______ · REGRA not_detected: ______ · REGRA indeterminate: ______ · SISTEMA AUSENTE: ______ · FONTE: ______ · JUSTIFICATIVA: ______ · RESPONSÁVEL: ______ · DATA: ______
