# DECISÃO 06 — MÚLTIPLAS COLETAS ELEGÍVEIS NA JANELA

Etapa 5.5 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 6 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende das DECISÕES 01 (7 domínios) e 02 (vínculos).

> **DECIDIDO — Etapa 5.6 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, Aprovação 1 no banco, Aprovação 2, homologação ou deploy. Nada alterado em motor, UI, servidor falso, banco ou pacote LI real.

## Pergunta

**SE EXISTIREM MÚLTIPLAS COLETAS ELEGÍVEIS (COM O MESMO EXAME) DENTRO DA JANELA, QUAL O SISTEMA DEVE USAR?**

## Por que

A contagem de suficiência (bloco 16) e de "fora/dentro" (bloco 19) muda conforme um exame repetido conte uma ou várias vezes, e conforme qual valor é usado.

## Estado atual

- Motor conta **cada resultado** incluído: o mesmo exame em duas coletas selecionadas conta duas vezes.
- UI permite marcar N coletas; nenhuma deduplicação.
- A data relevante é **`coletado_em` (clinical_date / data da coleta)**. **PROIBIDO**: "última modificada por `updated_at`" (o painel legado escolhia "valores atuais" por `updated_at` — LEGADO, incompatível).

## Opções (sem recomendação)

| Opção | Regra | Consequências |
|---|---|---|
| (a) Seleção manual | a profissional escolhe uma coleta por exame (UI por exame) | nenhuma decisão automática; mais cliques; rastreável |
| (b) Mais próxima da aplicação | menor `|coletado_em − quando|` | simétrica; empate precisa de regra; extensão pequena do motor |
| (c) Última antes da aplicação | maior `coletado_em ≤ quando` | privilegia o estado laboratorial que precede o relato; ignora coletas posteriores |
| (d) Primeira depois da aplicação | menor `coletado_em ≥ quando` | privilegia o exame feito a partir do relato; ignora anteriores |
| (e) Todas dentro da janela | cada resultado conta (como hoje) | infla suficiência; um mesmo exame pode estar "fora" e "dentro" ao mesmo tempo (vira caso de mistos, bloco 19) |
| (f) Regra por domínio/exame | (b)/(c)/(d) escolhidas por domínio ou por vínculo | precisão, mais regras a homologar e explicar |
| (g) Combinação manual | o sistema propõe por (b)/(c)/(d) e a profissional confirma ou troca | automação explicável + confirmação humana; extensão de UI |

Empate (duas coletas na mesma data clínica): precisa de regra explícita em qualquer opção automática (ex.: exigir escolha manual); **nunca** `created_at`/`updated_at`.

## Consequência matemática

(a)–(d),(f),(g): suficiência = nº de exames distintos; (e): suficiência = nº de resultados. A escolha interage com o bloco 5 (quantas coletas cabem na janela) e com o bloco 25 (comparabilidade de leituras).

## Incompatíveis

Qualquer escolha por `updated_at`/`created_at`; escolha implícita não registrada no trace.

## O que fica bloqueado enquanto aberto

Denominadores dos blocos 16–19.


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

**DECISÃO (Bloco 6 — múltiplas coletas):**
1. A profissional pode selecionar explicitamente **1..N coletas temporalmente elegíveis**.
2. O sistema pode **sugerir** coletas por proximidade da **data clínica**.
3. O sistema **não escolhe silenciosamente**.
4. `updated_at` **nunca** participa da escolha.
5. Empate de proximidade temporal: **não existe desempate automático**.
6. As coletas empatadas são apresentadas para decisão profissional.
7. A Leitura Integrada salva congela `application_id`, `collection_ids` **e** `result_ids` efetivamente utilizados.
8. Não basta congelar apenas `collection_ids`.
9. Se o mesmo exame/variante aparecer em mais de uma coleta selecionada: enquanto não existir regra homologada para múltiplos resultados daquele exame, o sistema **exige seleção humana do `result_id` aplicável**.
10. Se a seleção necessária não for feita: aquele elemento/domínio fica `sem_dados_suficientes`.
11. Futuramente uma regra homologada pode permitir múltiplos resultados, seleção determinística ou comparação temporal — **não inferido agora**.
12. Uma leitura já salva **não é reescrita** por nova coleta futura.

Consequência técnica: `integrated_readings` já congela `holoscan_application_id`, `selected_collection_ids` e `selected_result_ids` e é imutável; a UI precisa de sugestão por proximidade e de seleção de `result_id` por exame quando houver duplicidade (extensão na implementação em lote); o motor passa a excluir, com motivo, o exame duplicado sem `result_id` escolhido.
**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 3–6 e no Documento Mestre (fundamento acima). Não atribuída ao legado.

**FONTE:** Documento Mestre (princípios acima) + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
