# Auditoria de fidelidade — Blocos 26–29 (Etapa 5.10.1)

02/10/2026 · docs-only · compara os "Campo DECISÃO" registrados na Etapa 5.10 (commit `2b1e9db`) com o contrato canônico ditado por Daniel na Etapa 5.10.1. Situações: **idêntico** · **equivalente** · **ausente** · **divergente** · **acréscimo não aprovado**. Só `ausente`, `divergente` e `acréscimo não aprovado` foram corrigidos; nada foi reinterpretado. Nenhum vínculo da DECISÃO 02 mudou.

## Bloco 26 — Cálculos derivados

| Campo / regra | Canônico | Documento 5.10 | Situação | Correção |
|---|---|---|---|---|
| status | DECIDIDO; arquitetura admitida; 0 cálculos oficiais | "não tem cálculo derivado oficial"; tabela com 0 linhas | equivalente (arquitetura admitida implícita) | explicitado "admite a arquitetura" |
| calculation_code | exigido | `code` próprio e estável | equivalente | renomeado `calculation_code` |
| nome; fórmula explícita; exam_codes de entrada; unidades de entrada; fonte; justificativa; versão | exigidos | `name`, `formula`, `inputs`, `required_units`, `source`, `justification`, `formula_version` | equivalente | — |
| variantes e materiais aplicáveis | exigidos quando pertinentes | "com variante/material quando relevantes" | equivalente | — |
| métodos aplicáveis | exigidos quando pertinentes | — | **ausente** | incluído |
| conversões permitidas | campo do contrato | só "conversão por regra homologada" dentro de unidades | **ausente** (como campo) | incluído |
| critérios de elegibilidade | exigidos | `criteria` de validade (mesma coleta, não censurado, sem qualitativo, status avaliável) | equivalente no campo; detalhes internos (sem qualitativo, status avaliável) são **acréscimo não aprovado** | reduzido ao campo canônico |
| tratamento de ausências; precisão; arredondamento; responsável | exigidos | — | **ausente** | incluídos |
| aprovação metodológica | segue a governança geral do pacote; não é atributo do cálculo | "aprovação em pacote LI (Daniel → Rodrigo → Homologar; entra no hash)" e regra 5 "aprovação dupla" | **divergente** (aprovação dupla como atributo do cálculo) | reescrito: "aprovação metodológica (segue a governança geral — Bloco 30)" |
| referência do derivado declarada | — | bullet próprio | **acréscimo não aprovado** | removido |
| vínculo só pelo Bloco 2 "com definição prévia nos blocos 16/17/19/20/21" | regra 4/5: sem domínio automático; sem LI sem vínculo próprio homologado | bullet com condições extras | **acréscimo não aprovado** (condições) | reduzido às regras 4 e 5 |
| regra 1 preservar valores originais de entrada | exigida | — | **ausente** | incluída |
| regra 2 derivado não substitui exame original | exigida | — | **ausente** | incluída |
| regra 3 não entra automaticamente nos 45 | exigida | "code fora da numeração LAB-001…045" | equivalente parcial | incluída literalmente |
| regra 4 não recebe domínio automaticamente | exigida | dentro do contrato | equivalente | incluída literalmente |
| regra 5 não participa da LI sem vínculo próprio homologado | exigida | regra 6 antiga | equivalente | mantida como regra 5 |
| regra 6 HOMA-IR ou outro não ativado só por existir no legado | exigida | regra 4 antiga (só HOMA-IR) | equivalente parcial | incluída literalmente |
| "não ativado por presença de componentes" (regra 2 antiga) | — | presente | **acréscimo não aprovado** (vinha do material da 5.9) | removido |
| "derivado digitado ≠ calculado; reabre decisão 68" (regra 3 antiga) | — | presente | **acréscimo não aprovado** | removido |
| proibições da regra 5 antiga (fórmula sem fonte, unidade não verificada, cruzar coletas) | — | presente | **acréscimo não aprovado** | removido |
| HOMA-IR legado: histórico; não recalculado automaticamente; não convertido silenciosamente em cálculo oficial | exigido | "nunca recalculado, nunca tratado como calculado" | equivalente; "não convertido silenciosamente" ausente | completado |

**Omissões encontradas:** métodos aplicáveis; conversões permitidas (campo); tratamento de ausências; precisão; arredondamento; responsável; regras 1 e 2; "não convertido silenciosamente". **Divergências:** aprovação dupla como atributo do cálculo. **Acréscimos removidos:** referência do derivado; condições extras no vínculo; ativação por componentes; digitado ≠ calculado; lista de proibições.

## Bloco 27 — Exames adicionais/customizados

| Campo / regra | Canônico | Documento 5.10 | Situação | Correção |
|---|---|---|---|---|
| status; cadastro fora dos 45 permitido | DECIDIDO | "permitidos como registro factual" | equivalente | — |
| registro pode preservar: nome, valor original, unidade, referência do laudo, variante, material, método, origem, observações, documento relacionado | lista | — | **ausente** | incluída |
| pode aparecer: na coleta; no histórico | lista | "histórico, Evolução por identidade própria, HOLOS AI como fato" | equivalente parcial; Evolução/HOLOS AI são **acréscimo não aprovado** | reduzido a coleta e histórico |
| por padrão NÃO recebe: código LAB, domínio, direção, interpretação automática, referência metodológica, conversão, cálculo derivado, convergência/divergência, participação automática | lista de 9 | domínio, referência metodológica, direção, cobertura/suficiência/mistos/convergência/divergência | **ausente** parcial (código LAB, interpretação automática, conversão, cálculo derivado) | lista completa incluída |
| participação futura: contrato metodológico explícito, versionado e homologado | exigido | "promoção ao catálogo por migration + novo vínculo no Bloco 2" | **divergente** (mecanismo diferente e mais restrito) | reescrito conforme canônico |
| nunca altera silenciosamente o catálogo-base | exigido | regra 2 | equivalente | mantido |
| equivalência não inferida por nome | exigido | regra 1 ("nunca promovido por nome, categoria, semelhança, uso") e regra 3 | equivalente; regra 3 ("recurso de busca/Evolução") é **acréscimo não aprovado** | reescrito literalmente; acréscimo removido |
| "regra por profissional não existe" (regra 4 antiga); `not_eligible` com motivo (regra 5 antiga) | — | presentes | **acréscimo não aprovado** | removidos |

**Omissões:** campos preserváveis; coleta como local de exibição; 4 itens da lista "não recebe". **Divergências:** mecanismo de participação futura. **Acréscimos removidos:** Evolução/HOLOS AI; equivalência como recurso de busca; regra por profissional; `not_eligible`.

## Bloco 28 — Legado fora dos 45

| Campo / regra | Canônico | Documento 5.10 | Situação | Correção |
|---|---|---|---|---|
| itens EXA-001/003/007/024 permanecem `additional_legacy` | DECIDIDO | idem | idêntico | — |
| 1 visíveis no histórico | exigido | regra 5 (histórico, HOLOS AI, Evolução) | equivalente; HOLOS AI/Evolução são **acréscimo não aprovado** | reduzido a histórico |
| 2 preservam dados originais; 3 não apagados | exigidos | regra 1 | equivalente | mantidos como regras 2 e 3 |
| 4 não convertidos automaticamente em LAB-xxx | exigido | "nada é remapeado ou convertido" | equivalente | literal |
| 5 não participam automaticamente da LI | exigido | regras 2 e 4 | equivalente; `not_eligible` com código é **acréscimo não aprovado** | literal; acréscimo removido |
| 6 não herdam legacy_sistema, faixa ideal antiga, texto clínico antigo, interpretação antiga | exigido | só `legacy_sistema` (regra 3) | **ausente** parcial | completado |
| 7 não entram na contagem dos 45 | exigido | — | **ausente** | incluído |
| 8 futuramente: exame adicional homologado; cálculo derivado homologado; item de catálogo futuro; só por nova decisão | exigido | regra 6 (só catálogo 46–49 por migration) | **divergente** (restringe a 1 das 3 vias) | reescrito conforme canônico |
| regra 7 antiga "migração para custom não é feita" | — | presente | **divergente** com a via "exame adicional homologado" | removida |
| HOMA-IR histórico: preservar; não recalcular automaticamente; não converter silenciosamente em oficial | exigido | regra 8 (não recalculado, não reinterpretado como derivado) | equivalente; "não converter silenciosamente" ausente | completado |

**Omissões:** heranças proibidas (faixa ideal, texto, interpretação); contagem dos 45; vias futuras. **Divergências:** via futura restrita ao catálogo; proibição de custom. **Acréscimos removidos:** HOLOS AI/Evolução; `not_eligible` com código.

## Bloco 29 — EXA-006 × LAB-003

| Campo / regra | Canônico | Documento 5.10 | Situação | Correção |
|---|---|---|---|---|
| não é alias automático | exigido | idem | idêntico | — |
| novos registros usam LAB-003 | exigido | regra 1 | equivalente (menção ao vínculo D02/any é fato da DECISÃO 02) | simplificado |
| históricos permanecem legado até revisão explícita | exigido | regra 2 ("até mapeamento manual explícito") | equivalente | literal |
| mapeamento só quando a profissional confirmar mesmo exame e condições de coleta | exigido | — (dizia "por linha ou por lote revisado") | **ausente** (condição e quem confirma); "lote" é **acréscimo não aprovado** | incluído; "lote" removido |
| preservar source_legacy_id = EXA-006, target_exam_code = LAB-003, responsável, data, motivo, proveniência, versão da decisão | exigido | regra 3 (com detalhes de proveniência) | equivalente; detalhes de proveniência são acréscimo | lista literal |
| sem confirmação permanece legado e fora da LI | exigido | regra 5 | equivalente | literal |
| não criar alias textual global | exigido | regra 4 | equivalente | literal |
| não migrar automaticamente pelo nome | exigido | implícito em regra 4 | **ausente** (literal) | incluído |
| IDENTIDADE NÃO HOMOLOGADA = sem equivalência GLOBAL; não impede mapeamento individual | exigido | "continua sendo o estado oficial do histórico" | **divergente** (sugeria bloqueio do histórico inteiro) | reescrito conforme canônico |
| `legacy_exame_id` nunca apagado (regra 6 antiga); opções descartadas (regra 7 antiga) | — | presentes | **acréscimo não aprovado** | removidos |

**Omissões:** condição de confirmação pela profissional; "não migrar pelo nome". **Divergências:** sentido de IDENTIDADE NÃO HOMOLOGADA. **Acréscimos removidos:** lote; detalhes de proveniência; `legacy_exame_id`; opções descartadas.

## Propagação

Cabeçalhos dos blocos 26–29 em `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`, linhas 26–29 de `RESUMO-DECISOES-LEITURA-INTEGRADA-V1.md` e itens 123–126 de `DECISOES-V1.md` ajustados ao texto corrigido. Contagem oficial preservada: 45 / 42 / 3 / 47 / 5; D01 7 · D02 3 · D03 5 · D04 4 · D05 4 · D06 12 · D07 12.
