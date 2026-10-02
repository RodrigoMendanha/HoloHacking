# DECISÃO 28 — Legado fora dos 45: Candida IgG, VHS, HOMA-IR, Cortisol matinal

Etapa 5.9 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 28 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). **Dependências:** DECISÃO 01 (regras 6 e 9: sem vínculo, fora da LI; legado não herdado), 04 (regra 17: `additional_legacy` não participa automaticamente), bloco 26 (HOMA-IR é derivado), bloco 27 (via custom).

> **DECIDIDO — Etapa 5.10 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma fórmula, alias, vínculo, migration ou mapeamento foi criado.

## Pergunta (como no pacote)

**Destino dos 4 itens legados fora dos 45 (EXA-001 Candida albicans IgG, EXA-003 VHS, EXA-007 HOMA-IR, EXA-024 Cortisol matinal): permanecem `additional_legacy` (histórico visível, sem leitura), entram no catálogo-base por migration (passaria a 46–49), ou viram custom exams da profissional.**

## Por que

São resultados reais já registrados; precisam de destino explícito para não ficarem em limbo nem entrarem na LI por herança.

## Estado atual

Resultados antigos preservados com `origin = additional_legacy`, `exam_code` nulo, `legacy_exame_id`/`legacy_ideal_*`/`legacy_sistema` preenchidos; visíveis no histórico, HOLOS AI (fato), Evolução (comparação legado × legado). Nenhum vínculo possível (sem `exam_code`). Catálogo = 45 fixo (decisão 68). DECISÃO 04 regra 17: não participam automaticamente.

## Documento Mestre

§21: a lista dos 45 **não** os inclui. Nenhum trecho os menciona como oficiais.

## Legado (evidência, não proposta)

Vínculos legados **não homologados**: Candida IgG → `fungico`; VHS → `acido_inflamatorio`; HOMA-IR → `metabolico`; Cortisol matinal → `mental_emocional_espiritual` (`exames.csv.sistema`). **Não herdados** (DECISÃO 01 regra 9).

## Conflitos

- Entrar no catálogo reabre a decisão 68 (45 fixo) e o hash do pacote LI.
- HOMA-IR é cálculo derivado (bloco 26): como item digitado não tem fórmula verificável.
- Virar custom remove o caráter global e cria dado por profissional (bloco 27).
- Manter `additional_legacy` deixa esses resultados fora de qualquer domínio da DECISÃO 01 (nenhum dos 7 os nomeia).

## Opções

| Opção | Consequência |
|---|---|
| (a) manter `additional_legacy` (histórico, sem LI) | nada muda; coerente com DECISÕES 01/04 |
| (b) inclusão no catálogo-base por migration (LAB-046…049) + decisão de vínculo (bloco 2) para cada um | reabre decisão 68; cada item exige fonte e domínio; HOMA-IR ainda depende do bloco 26 |
| (c) migração para custom exam de quem registrou | perde caráter global; identidade preservada; fora da LI (bloco 27) |
| (d) destino diferente por item (ex.: um para (b), outros para (a)) | decisão item a item, cada uma com fonte |

## Incompatíveis

Entrar na LI sem estar no catálogo aprovado; herdar o vínculo legado; tratar HOMA-IR digitado como calculado.

## Campo DECISÃO

> Texto conferido contra o contrato canônico ditado por Daniel na Etapa 5.10.1 (02/10/2026); auditoria em `AUDITORIA-FIDELIDADE-BLOCOS-26-29.md`.

**DECISÃO (Bloco 28 — legado fora dos 45):** EXA-001 Candida albicans IgG, EXA-003 VHS, EXA-007 HOMA-IR e EXA-024 Cortisol matinal **permanecem `additional_legacy`** na V1.

**Regras (8):**
1. Permanecem visíveis no histórico.
2. Preservam os dados originais disponíveis.
3. Não são apagados.
4. Não são convertidos automaticamente em LAB-xxx.
5. Não participam automaticamente da LI.
6. Não herdam como regra oficial: `legacy_sistema`; faixa ideal antiga; texto clínico antigo; interpretação antiga.
7. Não entram na contagem dos 45.
8. Futuramente podem ser: exame adicional homologado; cálculo derivado homologado; item de catálogo de versão futura — **somente mediante nova decisão metodológica**.

**HOMA-IR histórico:** preservar; não recalcular automaticamente; não converter silenciosamente em cálculo oficial (Bloco 26).

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
