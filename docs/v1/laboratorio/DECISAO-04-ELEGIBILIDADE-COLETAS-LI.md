# DECISÃO 04 — ELEGIBILIDADE DAS COLETAS E DOS RESULTADOS NA LEITURA INTEGRADA

Etapa 5.5 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 4 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende das DECISÕES 01 (7 domínios) e 02 (vínculos).

> **DECIDIDO — Etapa 5.6 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, Aprovação 1 no banco, Aprovação 2, homologação ou deploy. Nada alterado em motor, UI, servidor falso, banco ou pacote LI real.

## Pergunta

**QUAIS COLETAS LABORATORIAIS (E QUAIS RESULTADOS) SÃO ELEGÍVEIS?**

Separar duas coisas: **elegibilidade da coleta** (a coleta pode ser selecionada) e **elegibilidade do resultado** (o resultado dentro da coleta pode contar para um domínio).

## Estado atual

- Coleta: `state ∈ rascunho | salvo | revisado`; `source ∈ manual | revision | legacy_panel | legacy_migrated | extracted_draft`; `coletado_em` (data clínica) pode ser nula com `data_coleta_desconhecida`; `laboratorio`, `document_id`, `encounter_id` opcionais; `superseded_at` quando substituída por revisão.
- UI da LI: lista coletas **não substituídas**, de qualquer `source`, exceto `rascunho`; seleção explícita.
- Resultado: `exam_code` ou `custom_exam_id` (ou nenhum, no legado `additional_legacy`/`requires_manual_mapping`); `reference_status informed|missing`; `qualifier`; `variant/material/method`.
- Motor: resultado sem vínculo aprovado → excluído (`sem_associacao_aprovada`); sem referência utilizável → excluído; coleta sem `clinical_date` → excluído na janela.

## Opções — elegibilidade da COLETA (sem recomendação)

| Situação | Opções | Consequência |
|---|---|---|
| `salvo` | elegível / não | base principal; "salvo" = confirmado pelo servidor, sem ato humano de revisão |
| `revisado` | elegível (sempre) / única elegível | exigir só `revisado` impõe um ato humano por coleta antes de qualquer LI |
| `rascunho` | **nunca** (Mestre §36.1; já é o comportamento) | — |
| coleta substituída (`superseded_at`) | nunca / só a versão vigente | já é o comportamento; aceitar substituída duplicaria resultados |
| coleta sem data clínica (`data_coleta_desconhecida`) | não elegível / elegível só se não houver janela | sem data não há temporalidade (bloco 5); o motor já exclui na janela |
| coleta com data parcial (só mês/ano) | **não existe** no modelo (data é `date`); decidir se deve existir | extensão de schema se aceita |
| coleta sem laboratório informado | elegível / não | laboratório não entra na classificação; só rastreabilidade |
| coleta sem nenhuma referência de laudo | elegível (resultados excluídos um a um) / não elegível | ver bloco 9; coleta inteira sem referência não produz classificação |
| coleta vinculada ou não a atendimento (`encounter_id`) | indiferente / exigir vínculo | vínculo é explícito e opcional (Etapa 5); exigir reduz base |
| `source = legacy_panel` / `legacy_migrated` | elegível / excluída | resultados legados não têm referência do laudo → não classificáveis de todo modo; excluir só limpa a seleção |
| `extracted_draft` | nunca (sempre rascunho até revisão humana) | reservado |

## Opções — elegibilidade do RESULTADO (sem recomendação)

| Situação | Opções | Consequência |
|---|---|---|
| exame do catálogo com vínculo aprovado (DECISÃO 02) | elegível | base da LI |
| exame sem vínculo (LAB-027, 033, 044 e qualquer custom) | **não participa** (DECISÃO 01 regra 6) | fica no prontuário |
| resultado customizado (`custom_exam_id`) | não participa (sem vínculo possível) / promoção ao catálogo por migration (bloco 27) | — |
| `additional_legacy` (Candida, VHS, HOMA-IR, Cortisol) | não participa (bloco 28) | — |
| `requires_manual_mapping` (Insulina de jejum) | não participa até o bloco 29 | — |
| variante sem vínculo próprio (ex.: PCR-us se só PCR sem variante estivesse vinculada) | não participa / vínculo por variante (DECISÃO 02 já prevê vínculos distintos) | implementação declara por variante |
| sem referência utilizável | excluído (bloco 9) | — |
| qualitativo / censurado | excluído (blocos 14–15) | — |
| resultado de coleta `salvo` vs `revisado` | herda a elegibilidade da coleta / exigir revisão para contar | — |

## Incompatíveis

Rascunho; coleta substituída; seleção por `updated_at`; inventar data; tratar ausência de referência como "dentro".

## O que fica bloqueado enquanto aberto

Base factual da leitura; blocos 5, 6, 16–19.


## Fundamento no Documento Mestre (registro, sem alterar o sentido)

- a profissional seleciona, ou aceita uma seleção explicável;
- aplicação e coletas entram com IDs e datas clínicas visíveis;
- a janela temporal é versionada;
- não há escolha silenciosa da "última modificada";
- a leitura salva congela fontes e resultado;
- nova coleta não reescreve leitura já emitida;
- o histórico laboratorial usa a data da coleta, não a data de atualização;
- somente registros consolidados entram em histórico, comparações e relatórios oficiais.

## Campo DECISÃO

**DECISÃO (Bloco 4):**

*Elegibilidade da COLETA:*
1. mesma paciente;
2. coleta consolidada/salva oficialmente;
3. data clínica conhecida;
4. rascunho não entra;
5. coleta substituída (`superseded`) não entra em novas Leituras Integradas;
6. laboratório informado **não** é obrigatório;
7. `encounter_id` **não** é obrigatório;
8. atendimento relacionado continua opcional;
9. duas coletas na mesma data continuam independentes pelos seus IDs.

*Elegibilidade do RESULTADO:*
10. elegibilidade da coleta **não** significa automaticamente elegibilidade de todos os resultados;
11. resultado sem referência aplicável permanece na coleta, mas pode ficar não classificável;
12. unidade incompatível bloqueia a classificação **daquele resultado**, não invalida a coleta inteira;
13. variante/material/método incompatível afeta **aquele resultado/vínculo**;
14. conteúdo copiado de coleta anterior só pode participar depois de **conferência humana**;
15. extração assistida de laudo precisa de **revisão humana** antes de participar;
16. exame customizado **não** participa automaticamente;
17. `additional_legacy` **não** participa automaticamente;
18. qualquer item fora do catálogo-base precisa de vínculo metodológico **explícito e homologado** antes de entrar na LI.

Consequência técnica: o modelo atual já distingue `rascunho/salvo/revisado`, `superseded_at`, `data_coleta_desconhecida`, `extracted_draft`; "conteúdo copiado conferido" exige marca por resultado (extensão pequena a declarar na implementação).
**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 3–6 e no Documento Mestre (fundamento acima). Não atribuída ao legado.

**FONTE:** Documento Mestre (princípios acima) + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
