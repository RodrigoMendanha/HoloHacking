# DECISÃO 29 — Insulina de jejum (EXA-006) ↔ Insulina basal (LAB-003)

Etapa 5.9 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 29 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). **Dependências:** DECISÃO 02 (LAB-003 → D02, `any`, com observação de não resolver a identidade), 11 (variantes incompatíveis até declaração explícita; alias não cria equivalência), 04 (`requires_manual_mapping` não participa), 13 (método). **IDENTIDADE NÃO HOMOLOGADA.**

> **DECIDIDO — Etapa 5.10 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma fórmula, alias, vínculo, migration ou mapeamento foi criado.

## Pergunta (como no pacote)

**Se "Insulina de jejum" (legado EXA-006) e "Insulina basal" (LAB-003) são a mesma identidade (alias seguro → mapear por migration, sem variante), identidades distintas (variante de LAB-003 ou custom exam), ou se permanece pendente.**

## Por que

Linhas legado de EXA-006 existem com valor preservado e `exam_code` nulo; sem decisão, nunca entram na LI (D02) nem se comparam com LAB-003.

## Estado atual (exato, sem decidir)

- `motor/bancos/exames.csv`: EXA-006 "Insulina de jejum", sistema `metabolico`, unidade `uUI/mL`.
- Catálogo-base: LAB-003 "Insulina basal" (Glicêmico), **sem** alias "Insulina de jejum".
- `laboratorio-catalogo.js` `MAPA_LEGADO["EXA-006"] = { code: "LAB-003", requires_manual_mapping: true, nota: "Insulina de jejum × Insulina basal: confirmar identidade" }` — `code` é **sugestão ao revisor**, não mapeamento.
- `lab_mapear_legado('EXA-006')` (SQL) devolve `exam_code = null`, `origin = legacy_migrated`, `requires_manual_mapping = true`, `mapping_note`; servidor falso idem.
- Toda linha legado de EXA-006 (migrada ou gravada pelo painel legado) fica com `exam_code` nulo, marcada para mapeamento manual; **não** entra em vínculo, classificação ou comparação com LAB-003. Lacuna de teste registrada (Etapa 5.1): nenhum check SQL prova a linha migrada de EXA-006.
- DECISÃO 02: LAB-003 → D02 (`any`) **sem** resolver a identidade legado. DECISÃO 11: alias não cria equivalência; variante distinta até declaração explícita.

## Documento Mestre

§21 lista "Insulina basal" entre os 45; não menciona "Insulina de jejum". Nenhum trecho afirma ou nega a identidade.

## Legado (evidência, não proposta)

EXA-006 → `metabolico` (não homologado, não herdado).

## Por que não é alias automático

Alias no catálogo é só nome alternativo do **mesmo** exame; "basal" e "de jejum" podem ou não designar a mesma condição de coleta conforme o laboratório/método. Nenhuma fonte no repositório prova a identidade. **A sugestão do `MAPA_LEGADO` não é alias oficial.**

## Conflitos

- Alias seguro remapeia linhas antigas para LAB-003 e as faz entrar em D02 (`any`) — exige fonte e considerar unidade (`uUI/mL`) e método (DECISÃO 13).
- Variante (`variant = jejum`) cria vínculo distinto (DECISÃO 11) e comparação separada.
- Pendente indefinidamente: as linhas antigas nunca contam.
- Custom: perde caráter global.

## Opções

| Opção | Consequência |
|---|---|
| (a) alias seguro: migration adiciona alias "Insulina de jejum" a LAB-003 e remapeia as linhas marcadas (`requires_manual_mapping → false`, `exam_code = LAB-003`) | EXA-006 passa a contar onde LAB-003 contar (D02); exige fonte; unidade/método conferidos |
| (b) variante: `exam_code = LAB-003`, `variant = jejum` | só onde houver vínculo da variante (hoje nenhum); comparação com "basal" sem variante não automática |
| (c) manter pendente (como hoje) | nunca conta; preservado |
| (d) custom exam | fora da LI (bloco 27) |

## Incompatíveis

Remapear sem fonte; apagar `legacy_exame_id`; transformar a sugestão do `MAPA_LEGADO` em alias; inferir pela semelhança de nome.

## Campo DECISÃO

**DECISÃO (Bloco 29 — Insulina de jejum (EXA-006) ↔ Insulina basal (LAB-003)):** EXA-006 **não é alias automático** de LAB-003. **IDENTIDADE NÃO HOMOLOGADA** continua sendo o estado oficial do histórico.

**Regras:**
1. **Registros novos** usam o exame-base **LAB-003 Insulina basal** (catálogo, com vínculo D02 / `any` já decidido no Bloco 2). Não existe entrada nova "Insulina de jejum".
2. **Registros históricos** de EXA-006 permanecem **legado** (`exam_code` nulo, `requires_manual_mapping = true`, `legacy_exame_id = 'EXA-006'`, valor original preservado) até **mapeamento manual explícito**.
3. O mapeamento manual, quando ocorrer, é um ato registrado por linha ou por lote revisado, preservando obrigatoriamente: `source_legacy_id` (EXA-006 e o id da linha legada), `target_exam_code` (LAB-003), responsável, data, motivo, proveniência (laudo/laboratório/método/unidade conferidos) e versão do mapeamento. Sem esses campos, não há mapeamento.
4. **Nenhum alias textual global** "Insulina de jejum" é adicionado a LAB-003: alias de catálogo é nome alternativo do mesmo exame e a identidade aqui não foi provada; a sugestão em `MAPA_LEGADO` continua sendo orientação ao revisor, não mapeamento.
5. Enquanto não mapeada, a linha EXA-006 não entra em vínculo, classificação, cobertura, suficiência, mistos, convergência, divergência nem comparação longitudinal com LAB-003 (`not_eligible`, motivo `requires_manual_mapping`).
6. `legacy_exame_id` nunca é apagado, inclusive após mapeamento.
7. Opções descartadas: alias seguro global (a); variante `jejum` automática (b); custom exam (d).

*Lacuna de teste registrada na Etapa 5.9 (check SQL para a linha migrada de EXA-006) permanece aberta; esta etapa é documental.*

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
