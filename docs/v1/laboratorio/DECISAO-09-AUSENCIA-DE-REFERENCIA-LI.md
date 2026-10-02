# DECISÃO 09 — AUSÊNCIA DE REFERÊNCIA

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 9 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

## Pergunta

**O QUE ACONTECE QUANDO NÃO EXISTE REFERÊNCIA APLICÁVEL (nem do laudo, nem metodológica aprovada) para um resultado?**

## Estado atual

Motor: `not_classifiable / missing_reference`; a LI exclui o resultado (`sem_referencia_utilizavel`) e segue com os demais; `excluded_items` no trace. **Ausência nunca é "dentro"** (Etapa 5, decisão 77). DECISÃO 04 regra 11: o resultado permanece na coleta, podendo ficar não classificável.

## Opções (sem decidir)

| Opção | Efeito no resultado | Efeito no domínio |
|---|---|---|
| (a) resultado não classificável, excluído da contagem (como hoje) | fica na coleta, aparece no trace como excluído | suficiência conta só classificáveis |
| (b) participa apenas como dado bruto (visível ao lado da leitura, sem contar) | idem + exibição | nenhum efeito na suficiência |
| (c) bloqueia o domínio | — | domínio = `sem_dados_suficientes` se qualquer vinculado estiver sem referência |
| (d) o domínio segue se houver suficiência sem ele | igual a (a) | depende do bloco 16 |
| (e) aviso à profissional antes do cálculo para completar a referência | — | mais digitação, mais classificáveis |

## Incompatíveis

Assumir "dentro"; usar `legacy_ideal_*` como fallback; inventar referência.

## O que fica bloqueado enquanto aberto

Nada tecnicamente (comportamento atual = (a)/(d)); a decisão confirma ou muda.


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

**DECISÃO (Bloco 9 — ausência de referência):**
- Resultado sem referência aplicável: continua salvo, visível, preserva valor original, unidade, método/material/variante conhecidos e origem; mas `classification_status = not_classifiable`, motivo `missing_applicable_reference`.
- **Nunca** interpretar ausência de referência como normal, dentro, alterado, fora, favorável ou desfavorável.
- Resultado não classificável por falta de referência **não contribui diretamente** para convergente/divergente.
- Ele **não invalida automaticamente** a coleta inteira, os demais resultados nem o domínio inteiro.
- O domínio poderá continuar avaliável se a **futura regra de suficiência** (blocos 16–18) determinar que existem dados classificáveis suficientes; sem suficiência, domínio = `sem_dados_suficientes`.

Consequência técnica: comportamento atual do motor (exclusão com motivo, sem bloquear o domínio) já é compatível; o nome do motivo passa a `missing_applicable_reference`.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
