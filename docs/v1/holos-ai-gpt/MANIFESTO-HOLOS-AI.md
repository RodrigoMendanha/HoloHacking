# HOLOS AI — Manifesto da base (HOLOS-AI-GPT 1.2, fechamento 14/10/2026 + contrato JSON nas Instruções)

Versões e hashes de todos os arquivos do GPT HOLOS AI. Serve para conferir se o agente (ChatGPT ou Codda) está com exatamente o conteúdo do repositório.

- **Agente:** HOLOS-AI-GPT 1.2 (fechamento 14/10/2026).
- **Saída:** HOLOS-AI-SAIDA 1.2 (texto HOLOS_AI_RESULT + JSON).
- **Schema:** HOLOS_AI_RESULT `schema_version: 1` (24 chaves obrigatórias; `meta`, `entrada`, `ferramentas_ja_aplicadas` e `plano_acompanhamento` obrigatórios desde o fechamento).
- **Sistemas:** HOLOS-V1 v7. **Ferramentas:** HOLOS-RECOMENDACOES-V1 / PP-V1 (catálogo sem mudança). **Direcionamentos e estratégias:** `not_catalogued`.
- **Contrato JSON nas Instruções (00):** as 24 chaves e os valores permitidos do 06 ficam no texto sempre ativo do agente; o 06 continua sendo a referência completa. Sem 06 nem contrato: "SCHEMA 06 INDISPONÍVEL — NÃO É SEGURO GERAR JSON IMPORTÁVEL".
- **Validador:** `validar_resultado` em `holos_ai_pdf.py` (o T5 devolve `[]`). Confere: chaves obrigatórias e nenhuma chave fora do schema; `tipo` só primeira_consulta/retorno; linguagem da nota ("mais equilíbrio", nota como saúde, normalidade, gravidade ou risco); "concentrou mais marcadores" fora da 1ª área; território "nao_aprofundado" com estratégia; tarefa da Conduta como estratégia; corte inventado; hipótese virando estratégia; sugestão nova "combinada" no rascunho. No HoloHacking (holos-ai-contrato.js + holos_ai_problemas), as regras estruturais são erro e as de linguagem são aviso.

| Arquivo | sha256 (arquivo inteiro) | Codda (origem_id) |
|---|---|---|
| `00-INSTRUCOES-GPT.md` | `df58d947a576f13ddf8e71c272c449a9bf569c8333e842648f1a0a79762b2763` | `sha256:7e00b59054a9c699fe450d9efadfe2bc` |
| `01-REGRAS-E-FORMATO.md` | `2acf7cb690b86a428d2b201a1ed907658ebbfb67af5acde04610a061820179b9` | `sha256:dd94cc65148632081092fb84ea72a4e3` |
| `02-SISTEMAS-E-FERRAMENTAS.md` | `e28b29834556eab5f98a603188651988670924739b205b4834612d2f74bb88c4` | `sha256:6d330cbda8bca1be4ee5a115884a0995` |
| `03-EXEMPLO-PACOTE-E-RESULTADO.md` | `27e08b69cb8c2d0e06aa0369c24f47a3095c14b47a0c0ab57298c7625f03bfe6` | `sha256:cd2d33ffc617f13ca611be62b4f9dbdc` |
| `04-ESPECIFICACAO-HOLOS-AI.md` | `63db017db37ff51d45e13e4fc38513e8c62041058186b1816080d97f10428759` | `sha256:f80daeee139c9373a6a507fb2b906523` |
| `05-CATALOGO-FERRAMENTAS-PP-V1.md` | `baf2e8ea98e7ae1c8532fe8ab8c3815acc7e214d45801efcf1a72c71dff883c7` | `sha256:0c5dc4d65ab4e72d932cc990802b662b` |
| `06-SCHEMA-HOLOS-AI-RESULT.json` | `9ccfbe1e1b6c07d6238d106e101ef595d2c08483af05fe42a8d698ac74ab967d` | `sha256:adaec80cb8a6cd3ffab7c79effb52076` |
| `exemplo-resultado.json` | `ec2a2c45da6d76280a6830c1bb4131a376727d5af1c66227af0554e0156102e9` | `sha256:d2a8acf398d36fdfd73ed3914b81f6c9` |
| `exemplo-entrada-transcrita.json` | `82fd093d3b66ca5b73d46e3c54a1941f20e804068430ae2f45e10326a75d9aca` | não enviado (só para o PDF de conferência) |
| `holos_ai_pdf.py` | `fa7642ccb2b65c00039d45f7bbb1e6c7140d5e617f16b54ffa5ae648fbeb6d2c` | não enviado (o Codda perde a indentação do Python; vale o arquivo do repositório) |
| `LEIA-ME-CONFIGURAR-GPT.md` | `d72baea7c087d5f29c8c83f0d5b91e84ec1a38768738410befecdb3ddbec8c7f` | `sha256:b54c90a38f629683933a1024e9893656` |
| `HOLOS-AI_PACIENTE-TESTE-T5_2026-10-13_conferencia.pdf` | `67040d9cc1b2458fa7729b08aa65935a0f72b1d448a2beff5818f3105029acac` | não enviado (binário de conferência) |

**Campos sempre ativos do agente no Codda:** "função" (saída, método e inegociáveis) e "regras" (o CONTRATO JSON com as 24 chaves e a regra SCHEMA 06 INDISPONÍVEL), atualizados em 14/10/2026. Os documentos do cérebro são consultados por trechos; o contrato nos campos sempre ativos não depende dessa busca.

O origem_id do Codda é `sha256:` + os 32 primeiros dígitos do sha256 do texto sem espaços nas pontas.

Gerado a partir do repositório (branch `claude/admiring-mccarthy-jke2pf`). Este manifesto não lista a si mesmo.
