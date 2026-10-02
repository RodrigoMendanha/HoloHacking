# DECISÃO 23 — TEXTOS EXIBIDOS À PROFISSIONAL

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 23 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende dos blocos 20–22 (estados e motivos) e da DECISÃO 01 (nomes dos domínios).

> **ESTRUTURA + TEXTOS-BASE DECIDIDOS / TEXTOS ESPECÍFICOS POR DOMÍNIO PENDENTES SOMENTE SE NECESSÁRIOS — Etapa 5.9 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma tabela domínio → sistema, regra de direção, parâmetro ou texto específico por domínio foi criado.

## Pergunta (como no pacote)

**Texto oficial, por estado (e por domínio, se for o caso), mostrado na ficha, no Confronto e no relatório clínico.** Este bloco **é** o que decide esses textos; **nenhum texto oficial é escrito aqui** — só requisitos e opções.

## Estado atual

Regra `text` (`payload.{convergente, divergente, sem_dados_suficientes}`, global ou por domínio): **0 linhas**. Sem texto aprovado, a UI mostra só estado, motivos e trace. Barreira de Conduta ativa.

## Requisitos já fixados para qualquer texto oficial

- texto **neutro**, linguagem **não diagnóstica**;
- explicação das **fontes usadas** (aplicação, coletas, resultados, referências, pacote/versão);
- **motivos de exclusão** visíveis;
- **versão/regra** aplicada visível;
- **observação profissional separada** do texto do sistema;
- **proibido** "exame confirma diagnóstico", "exame comprova/desmente o relato";
- **proibido** "saudável", "normal", "sem prioridade" por ausência de alterações (convergente sem alteração não é atestado de saúde);
- **proibido** conduta ("recomenda", "prescreve", "solicite", "encaminhe", "suplementar");
- textos do legado (`HOLOSCAN_TEXTO`, `leitura_*` causais) **não** entram sem decisão.

## Opções (sem decidir)

| Opção | Consequência |
|---|---|
| (a) um texto global por estado (3 textos) | mínimo a homologar; genérico |
| (b) texto por domínio (7 × 3) | específico; 21 textos a homologar |
| (c) textos distintos por sentido da divergência e por "convergente com/sem alteração" (depende dos blocos 20–21) | mais estados textuais |
| (d) texto = estado + motivos + fontes gerados por template neutro aprovado (sem frase clínica) | explicabilidade máxima com um só template |

## Incompatíveis

Texto causal; conclusão de diagnóstico, normalidade ou prioridade; conduta; herdar os 4 textos fixos do legado sem decisão.


## Precedência obrigatória do motor LI (regra estrutural oficial, Etapa 5.9)

Antes de avaliar CONVERGENTE ou DIVERGENTE, o motor executa nesta ordem lógica: (1) validar aplicação HOLOSCAN; (2) validar pacote/versão compatível; (3) validar temporalidade; (4) validar vínculos metodológicos; (5) validar resultados laboratoriais; (6) validar referências/unidades/contexto; (7) validar suficiência do domínio; (8) resolver resultados mistos; (9) derivar direção do HOLOSCAN; (10) derivar direção laboratorial; (11) somente então determinar o estado da LI. **SEM DADOS SUFICIENTES tem precedência** quando qualquer requisito necessário não estiver atendido. **CONVERGENTE e DIVERGENTE nunca são fallback.**

## Direções internas conceituais (nomenclatura metodológica interna)

`attention_present` · `attention_not_detected` · `indeterminate`. **Não** são diagnóstico, score, prognóstico, "doente"/"saudável", nem são mostradas ao paciente como termos técnicos. Existem só para permitir comparação determinística entre fontes. Campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 23 — textos à profissional):**

*Estrutura exibida, quando disponível:* domínio; estado oficial; aplicação HOLOSCAN utilizada (`application_id`, data clínica); `collection_ids` e datas clínicas; `result_ids`, exames e variantes; direção HOLOSCAN; direção laboratorial; referências utilizadas e origem; resultados excluídos e motivo; suficiência/cobertura; regra LI e versão do pacote; observação profissional **separada**.

*Texto-base CONVERGENTE:* "As fontes elegíveis deste domínio apontaram para uma direção semelhante segundo a regra metodológica indicada."

*Texto-base DIVERGENTE:* "As fontes elegíveis deste domínio apontaram para direções diferentes. A divergência não invalida nenhuma das fontes e deve ser considerada na avaliação profissional."

*Texto-base SEM DADOS:* "Não foi possível classificar este domínio com a regra atual. Consulte os dados ausentes, incompatíveis, excluídos ou não classificáveis indicados abaixo."

*Linguagem proibida (automática):* "confirma diagnóstico", "confirma doença", "prova", "paciente saudável", "normal global", "cura", "melhora clínica", "piora clínica".

**Pendência (não ocultável):** textos específicos por domínio, somente se necessários.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 20–25 e no Documento Mestre (um exame fora não basta; divergência não invalida fonte; ausência não é divergência; sem score; leitura salva congelada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ESTRUTURA + TEXTOS-BASE DECIDIDOS / TEXTOS ESPECÍFICOS POR DOMÍNIO PENDENTES SOMENTE SE NECESSÁRIOS — não implementado, não registrado no banco, não homologado.
