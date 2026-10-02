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

**DECISÃO (Bloco 28 — legado fora dos 45):** EXA-001 (Candida IgG), EXA-003 (VHS), EXA-007 (HOMA-IR) e EXA-024 (Cortisol matinal) **permanecem `additional_legacy`**: histórico preservado e visível, sem leitura integrada.

**Regras (8):**
1. `origin = additional_legacy`, `exam_code` nulo e `legacy_*` preservados; nada é apagado, remapeado ou convertido.
2. Nenhum dos 4 recebe vínculo a domínio LI (não têm `exam_code`; vínculo exige exame-base do catálogo).
3. Nenhum herda o sistema legado do CSV (Candida → fungico; VHS → acido_inflamatorio; HOMA-IR → metabolico; Cortisol → mental_emocional_espiritual): **LEGADO, não homologado, não herdado**.
4. Nenhum entra em cobertura, suficiência, mistos, convergência ou divergência; para a LI são `not_eligible` com motivo explícito (código a unificar com a lista da DECISÃO 22 na implementação).
5. Continuam visíveis no histórico, HOLOS AI (como fato legado, formato legado) e Evolução (comparação legado × legado pela mesma identidade `legacy_exame_id`).
6. Inclusão futura no catálogo-base (46–49) é decisão de catálogo por migration (reabre a decisão 68), item a item, com fonte, e com novo vínculo decidido no Bloco 2 — não decorre deste bloco.
7. Migração para custom exam **não** é feita: perderia o caráter de registro global histórico sem ganho para a LI.
8. **HOMA-IR legado não é recalculado** nem reinterpretado como derivado (Bloco 26, regra 4); o valor digitado permanece valor digitado.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
