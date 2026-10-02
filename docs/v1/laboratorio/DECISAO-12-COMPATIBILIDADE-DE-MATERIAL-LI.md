# DECISÃO 12 — COMPATIBILIDADE DE MATERIAL

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 12 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

## Pergunta

**Quando materiais diferentes do mesmo exame são compatíveis para vínculo, referência, classificação e comparação — e como tratar material ausente?**

**Não inventar material ausente.** O legado nunca registrou material; na migração ele ficou nulo (inclusive para Mg eritrocitário).

## Estado atual

`material` texto livre, explícito, nunca inventado; faz parte da identidade (exame, variante, material); referência que declara material diferente → `incompatible_material`; chave presente com valor nulo exige material nulo no resultado. DECISÃO 04 regra 13: incompatibilidade afeta aquele resultado/vínculo.

## Materiais a considerar (somente se realmente registrados no resultado)

soro · plasma · sangue total · eritrocitário · outros declarados no laudo. Nenhuma lista fixa existe no sistema; nenhuma é criada aqui.

## Opções (sem decidir)

| Opção | Consequência |
|---|---|
| (a) material faz parte da identidade; nulo só casa com nulo (como hoje) | legado só se compara com legado; máximo rigor |
| (b) nulo compatível com qualquer material informado | mais comparações; risco de comparar compartimentos distintos |
| (c) lista de equivalências aprovadas (ex.: soro ≈ plasma para exames listados), com fonte | extensão de tabela; decisão por exame |
| (d) vocabulário controlado de materiais | extensão; reduz falsos incompatíveis por grafia |

## O que fica bloqueado enquanto aberto

Nada tecnicamente (default = (a)).


## Regra transversal (princípio oficial da LI V1, Etapa 5.7)

**Um resultado possui três eixos de estado independentes:**
1. **Classificação individual** — pode ou não ser classificado contra uma referência aplicável (`classification_status`).
2. **Elegibilidade para Leitura Integrada** — pode ou não participar de uma LI, considerando domínio, vínculo, temporalidade, versão, suficiência e demais regras (`li_eligibility_status`).
3. **Comparabilidade longitudinal** — pode ou não ser comparado diretamente a outro resultado histórico (`longitudinal_comparability_status`).

Um resultado pode ser válido e classificável individualmente e, ao mesmo tempo, não ser elegível para a LI nem comparável longitudinalmente. **Nunca transformar problema de comparabilidade em "resultado inválido".** Os motivos são registrados separadamente por eixo. A nomenclatura acima é **conceitual**: os campos **não** foram implementados nesta etapa.

## Casos de regressão conceitual (obrigatórios para a implementação futura)

| Caso | Situação | Resultado esperado |
|---|---|---|
| A | referência válida do próprio laudo; método não informado; a referência não exige método | **individualmente classificável** |
| B | dois resultados do mesmo `exam_code` com métodos diferentes, cada um com referência válida própria | ambos classificáveis individualmente; **comparação numérica não automaticamente permitida** |
| C | resultado sem referência aplicável | guardado, visível, **não classificável** (`missing_applicable_reference`); nunca "normal" |
| D | PCR (`variant = null`) e PCR-us (`variant = ultrassensivel`) | **não** silenciosamente equivalentes |
| E | Magnésio (`variant = null`) e Magnésio eritrocitário (`variant = eritrocitario`) | **não** silenciosamente equivalentes |
| F | Testosterona livre (LAB-037) e total (LAB-038) | `exam_code`s distintos; **não** recriar como variante artificial |

## Campo DECISÃO

**DECISÃO (Bloco 12 — compatibilidade de material):**
- Material **não é exigência universal**. Torna-se bloqueante somente quando o vínculo, a referência, a conversão, a regra metodológica ou a comparação **exigir** material específico.
- Quando material for requisito: compatível → segue; explicitamente homologado como compatível → segue; diferente/incompatível → bloquear **a operação que depende dele**; ausente → bloquear **somente quando aquela operação exige material conhecido**.
- Quando a regra **não** depende do material, ausência de material **não bloqueia** automaticamente.
- **Nunca inventar** soro, plasma, sangue total, eritrocitário ou qualquer material ausente.

Consequência técnica: ajuste do motor na implementação — hoje a referência que declara material exige igualdade (inclusive nulo = nulo); a regra "só bloqueia quando a operação exige" passa a ser declarada por vínculo/referência/conversão.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
