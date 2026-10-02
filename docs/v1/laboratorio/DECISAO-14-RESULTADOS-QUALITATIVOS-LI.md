# DECISÃO 14 — RESULTADOS QUALITATIVOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 14 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 07 (regra 7: qualitativo preservado, sem classificação automática) e 09.

> **DECIDIDO — Etapa 5.8 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração de banco, aprovação formal, homologação ou deploy. Nenhuma regra concreta, corte, peso ou lista foi criado.

## Pergunta (como no pacote)

**Se e como resultados textuais ("Negativo", "Reagente", "Não detectado", "Positivo", títulos "1/80") entram na Leitura Integrada: excluídos, mapeados para um estado por tabela aprovada por exame, ou só exibidos.**

## Estado atual

`qualifier = text`, valor original preservado; motor: `not_classifiable / qualitative_without_rule`; excluído da LI; nunca `Negativo = 0`. DECISÃO 07 regra 7: referência qualitativa do laudo preservada, sem classificação automática sem regra homologada. Nenhum dos 45 exames tem regra qualitativa.

## Opções

| Opção | Efeito |
|---|---|
| (a) excluídos da LI (como hoje) | resultados qualitativos nunca contam para suficiência nem estado |
| (b) tabela aprovada de mapeamento por exame (texto esperado → estado), com fonte e versão | exige vocabulário por laboratório; cada linha é decisão metodológica |
| (c) exibidos ao lado da leitura, sem contar | transparência sem efeito no estado |
| (d) (b) só para exames listados; (a)/(c) para os demais | — |

## Consequências e dependências

(b) interage com o bloco 16 (conta como "resultado utilizável"?), 19 (como entra em mistos) e 7 (referência qualitativa do laudo). Vocabulário varia por laboratório ("Reagente" pode ser esperado ou não conforme o exame).

## Conflitos / incompatíveis

Conversão implícita para número; regra sem fonte; marcador H/L do laudo virando estado (DECISÃO 07 regra 8).


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 14 — resultados qualitativos):**
1. Resultado qualitativo é preservado **textualmente** como valor original.
2. **Nunca** converter automaticamente: Negativo → 0, Positivo → 1, Traços → número, Detectado → número, Não detectado → número.
3. Só recebe classificação se existir **regra qualitativa específica, versionada e homologada** para `exam_code`, `variant`/`material`/`method` quando pertinentes.
4. A regra declara explicitamente **quais valores/termos aceita** e **qual classificação produz**.
5. Sem regra homologada: `classification_status = not_classifiable`, `reason_code = qualitative_rule_missing`.
6. Não classificável: continua salvo, visível, texto original preservado, não descartado.
7. Não contribui automaticamente para convergente/divergente.
8. **Nenhuma regra qualitativa concreta criada nesta etapa.**

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 14–19 e no Documento Mestre (dado bruto preservado; misto sem regra = sem dados suficientes; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
