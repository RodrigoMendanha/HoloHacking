# DECISÃO 24 — TEXTOS EXIBIDOS AO PACIENTE

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 24 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende do bloco 23.

> **ESTRUTURA + TEXTOS-BASE DECIDIDOS — Etapa 5.9 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma tabela domínio → sistema, regra de direção, parâmetro ou texto específico por domínio foi criado.

## Pergunta (como no pacote)

**Se a Leitura Integrada aparece em algum material voltado ao paciente (relatório entregue, resumo) e, se sim, com qual texto — ou se é restrita à profissional na V1.**

## Estado atual

Nenhuma superfície voltada ao paciente mostra a LI; o relatório clínico (Etapa 3) é da profissional e inclui a LI só se salva e selecionada (hoje só `sem_dados_suficientes`). Nenhum texto ao paciente existe nem é escrito aqui.

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
| (a) LI não aparece ao paciente na V1 | nenhum texto a homologar; zero risco de leitura diagnóstica |
| (b) aparece só o estado, com texto aprovado específico para paciente | texto adicional a homologar; precisa explicar o que convergente/divergente **não** significa |
| (c) aparece com explicação dos limites (não diagnóstico, não culpa, não conduta) | mais texto; mais clareza |
| (d) aparece só a lista factual (exames, datas, referências do laudo), sem estado da LI | fato, não leitura |

## Incompatíveis

Texto que o paciente leia como diagnóstico, culpa ("você relata mas o exame não mostra") ou conduta.


## Precedência obrigatória do motor LI (regra estrutural oficial, Etapa 5.9)

Antes de avaliar CONVERGENTE ou DIVERGENTE, o motor executa nesta ordem lógica: (1) validar aplicação HOLOSCAN; (2) validar pacote/versão compatível; (3) validar temporalidade; (4) validar vínculos metodológicos; (5) validar resultados laboratoriais; (6) validar referências/unidades/contexto; (7) validar suficiência do domínio; (8) resolver resultados mistos; (9) derivar direção do HOLOSCAN; (10) derivar direção laboratorial; (11) somente então determinar o estado da LI. **SEM DADOS SUFICIENTES tem precedência** quando qualquer requisito necessário não estiver atendido. **CONVERGENTE e DIVERGENTE nunca são fallback.**

## Direções internas conceituais (nomenclatura metodológica interna)

`attention_present` · `attention_not_detected` · `indeterminate`. **Não** são diagnóstico, score, prognóstico, "doente"/"saudável", nem são mostradas ao paciente como termos técnicos. Existem só para permitir comparação determinística entre fontes. Campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 24 — textos ao paciente):** linguagem simples, não diagnóstica, não alarmista, explicável, **sem reason_codes crus**, sem esconder limitações.

*CONVERGENTE:* "As informações do seu relato e os exames considerados apresentaram um padrão semelhante neste domínio. Esse resultado não representa diagnóstico e deve ser interpretado junto com sua nutricionista."

*Convergência sem sinais de atenção (texto específico permitido):* "Nas fontes analisadas, não foram identificados sinais de atenção coincidentes neste domínio. Isso não significa ausência de doença ou garantia de saúde."

*DIVERGENTE:* "Seu relato e os exames considerados apresentaram informações diferentes neste domínio. Isso pode ajudar a profissional a aprofundar a avaliação e não significa que uma das fontes esteja errada."

*SEM DADOS:* "Ainda não há informações suficientes para uma leitura integrada deste domínio. Sua nutricionista poderá verificar quais dados precisam ser complementados ou revisados."

*Tradução de motivos:* reason_codes técnicos não aparecem crus; exemplo: `incompatible_variant` → "O tipo do exame disponível não é compatível com a regra utilizada para esta leitura." A tabela completa de traduções **não** foi criada nesta etapa (decisão posterior).

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 20–25 e no Documento Mestre (um exame fora não basta; divergência não invalida fonte; ausência não é divergência; sem score; leitura salva congelada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ESTRUTURA + TEXTOS-BASE DECIDIDOS — não implementado, não registrado no banco, não homologado.
