# IMPLEMENTAÇÃO — PRÓXIMOS PASSOS HOLOS V1 (motor oficial de recomendação de ferramentas)

Implementado localmente em 09/10/2026 sobre a branch `claude/v1-etapa6-1-validacao-banco-real`.
**Não aplicado no banco real e sem deploy.** HOLOS-V1@2 intocado. Exames totalmente fora.

Fluxo entregue: **HOLOSCAN → Resultado → sistemas prioritários ("Por onde investigar") → PRÓXIMOS PASSOS HOLOS →
ferramenta recomendada + explicação + "Iniciar ferramenta"**. A nutricionista não preenche nada; seguir, abrir outra
ferramenta ou ignorar não altera o Resultado HOLOSCAN.

## A. Arquitetura escolhida
- **Catálogo metodológico separado e versionado** no banco: `holos_recommendation_catalogs` (código, versão, status,
  `content_hash`, proveniência, `approved_at`, `approved_by` nulo) + `holos_recommendation_rules` (30 regras). Global,
  **somente leitura** para a aplicação (RLS `select` a `authenticated`; `insert/update/delete` revogados), **imutável por
  gatilho** mesmo para o dono do banco. Nova versão = nova migration (recria o gatilho) e nova linha de catálogo.
  Padrão já usado pelo catálogo laboratorial (`lab_exam_catalog`).
- **Motor no servidor** (`proximos_passos_calcular`, `proximos_passos_escolher`, SECURITY DEFINER, sem `execute` para a
  aplicação) + **o mesmo algoritmo em JS** (`proximos-passos.js`) para a prévia do resultado ainda não salvo e para o
  servidor falso dos testes. Determinístico; provado idêntico nos dois lados (harness SQL × testes JS, mesmas fixtures).
- **Snapshot separado** (`holos_next_steps`): um por (aplicação HOLOSCAN, catálogo), imutável, com `catalog_code/version/
  hash`, `engine_version`, `systems_order`, `selection`, `content_snapshot` e `content_hash` (sha256). Não mistura
  recomendação com score: a aplicação HOLOSCAN não é tocada.
- **RPCs** para a aplicação: `proximos_passos_holos(p_application_id)` (prévia, não grava; diz se já há registro) e
  `registrar_proximos_passos(p_application_id)` (idempotente: devolve o registrado, nunca reescreve).
- **UI**: bloco profissional no quadro "Resultado desta aplicação", logo depois de "Por onde investigar"; para
  aplicação sem sistema avaliável (quadro não desenhado) a explicação entra em `#holo-proximos-passos-vazio`.

## B. Arquivos alterados
Novos: `proximos-passos.js`, `supabase/migrations/20261012100000_proximos_passos_holos.sql`,
`supabase/tests/proximos-passos-pre.sql`, `supabase/tests/proximos-passos-harness.sql`,
`supabase/PROXIMOS-PASSOS-PARTE1..8.sql`, `testes/proximos-passos-catalogo-v1.mjs`, `testes/proximos-passos-falso.mjs`,
`testes/testar-proximos-passos-motor.mjs`, `testes/testar-proximos-passos.mjs`, este documento.
Alterados: `app.js` (container do bloco + chamada em `desenharResumo`; redesenho após "Salvar HOLOSCAN"; explicação
no caso sem quadro), `index.html` (script + container vazio), `style.css` (`.pp-*`), `testes/supabase-falso.mjs`
(3 tabelas, semente do catálogo, RPCs, RLS), `testes/suites.mjs`, `testes/testar-storage-manifest.mjs` (54 scripts),
`testes/testar-v1-etapa5-ui.mjs` (menu sem Documentos), `scripts/validar-cadeia-local.sh`, `scripts/deploy-etapa6-5b.sh`,
`docs/deploy.md` (hashes, 64 arquivos), `docs/v1/DECISOES-V1.md` (item 176), `RELEASE-STATE.md`.

## C. Migrations
`20261012100000_proximos_passos_holos.sql` — não destrutiva (`begin/commit`): cria 3 tabelas, semeia o catálogo (dois
blocos, para caber no SQL Editor), gatilhos, RLS/grants, 4 funções. Não toca `methodology_*`, `holoscan_*`,
`tool_applications`, `conducts`, `holos_results`. Para o SQL Editor: `supabase/PROXIMOS-PASSOS-PARTE1..8.sql`
(todas < 9,3 KB; idempotentes; a PARTE 8 confere e registra a migration). As 8 partes foram provadas na cadeia local no
lugar da migration (mesmo resultado PP00–PP21 + POS; hash do catálogo `0d35b513547f…` igual ao do JS).

## D. Tabela/catálogo
`holos_recommendation_rules`: `id, catalog_id, rule_id (único), catalog_code, catalog_version, system_id (5 sistemas,
check), rank (1..6, único por sistema), tool_id (check nas 10 ferramentas; único por sistema), professional_reason,
next_action (≤ 400 chars), status (aprovado|retirado), provenance, approved_at, approved_by (nulo), created_at`.
`holos_recommendation_catalogs`: `code, version (único), status, content_hash (sha256 canônico das regras), provenance,
approved_at, approved_by, created_at`. **approved_by ficou NULO**: não há UUID inequívoco do aprovador; a aprovação
expressa (09/10/2026, chat) está em `provenance` e em DECISOES-V1 item 176. O mecanismo de aprovador único
(`methodology_approvers`) é do pacote metodológico e não foi reaproveitado para não inventar identidade.

## E. As 30 regras inseridas
Exatamente as do pedido (ids, sistemas, ranks, ferramentas, `professional_reason`, `next_action`), status `aprovado`,
`approved_at = 2026-10-09`. Fonte única: a migration; `testes/proximos-passos-catalogo-v1.mjs` é a fixture conferida
**byte a byte** contra o SQL pelo teste `testar-proximos-passos-motor.mjs`.
REC-FUN-01..06 (mapa_rotina_v1, gatilhos_respostas_v1, mapa_crencas, linha_momentum, oq3, conexao_pertencimento_v1) ·
REC-AIN-01..06 (mapa_rotina_v1, linha_momentum, gatilhos_respostas_v1, roda_vida, conexao_pertencimento_v1, oq3) ·
REC-MET-01..06 (mapa_rotina_v1, gatilhos_respostas_v1, mapa_crencas, linha_momentum, oq3, carta_futuro) ·
REC-DTL-01..06 (mapa_rotina_v1, linha_momentum, oq3, roda_vida, conexao_pertencimento_v1, gatilhos_respostas_v1) ·
REC-MEE-01..06 (pqq, mapa_crencas, gatilhos_respostas_v1, mapa, carta_futuro, conexao_pertencimento_v1).

## F. Algoritmo executado (V1)
Entrada: aplicação oficial (pacote HOLOS-V1), `holoscan_system_scores` avaliáveis na ordem de "Por onde investigar"
(nota crescente; empate pela ordem do motor — a mesma de `HoloAusencia.porLeitura`), catálogo aprovado mais recente,
ferramentas concluídas/revisadas **no atendimento da aplicação**.
1. Sistema 1 → primeira regra aprovada (rank) com ferramenta válida → **principal**.
2. Sistema 2 → primeira regra aprovada cuja ferramenta não repita → **complementar 1**.
3. Sistema 1 → próxima regra aprovada sem repetir ferramenta já exibida → **complementar 2**.
4. Um só sistema avaliável → até 3 regras dele, por rank, sem repetir. Nenhum → nenhuma ferramenta e
   "Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação."
5. Ferramenta já concluída/revisada no atendimento atual é **pulada quando há outra elegível** (se só sobrar concluída,
   ela entra: nada é inventado nem escondido). Aplicação em outro atendimento não exclui. Nenhuma janela de dias.
6. Sinais dominantes (até 3 por sistema; contribuição = peso × valor orientado, a mesma conta do motor; recalculados no
   servidor a partir de `holoscan_answers` × associações primárias do pacote) **só explicam**; não escolhem.
Nenhum score novo, nenhum corte, nenhum vínculo pergunta → ferramenta.

## G. Integração com o Resultado HOLOSCAN
`app.js` `desenharResumo`: `<div id="holo-proximos-passos">` logo depois de "Por onde investigar"; `ProximosPassos.desenhar(r)`.
Fontes, nesta ordem: **registro já feito** (nunca recalculado) → **registro automático** para aplicação salva depois do
catálogo → **ação explícita** ("Ver Próximos Passos segundo o catálogo atual") para aplicação salva **antes** do catálogo →
**prévia local** para resultado ainda não salvo (registrado ao clicar "Salvar HOLOSCAN"). Card principal: "Próximo passo
recomendado", ferramenta, `professional_reason`, "Por que esta ferramenta?" (sistema + até 3 sinais + frase sem
causalidade), "O que fazer agora" (`next_action`), botão. Complementares (máx. 2) em "Outras possibilidades de
aprofundamento". Linguagem sem tratamento/prescrição/diagnóstico/cura/protocolo/conduta obrigatória (testado).

## H. Roteamento das ferramentas
Botão "Iniciar ferramenta" → garante o paciente da aplicação ativo (`definirPacienteAtivo`) → `window.abrirFerramentaPorId(tool_id)`.
Só os 10 ids ativos passam (lista fechada no módulo, no check da tabela e na função SQL).

## I. Persistência/versionamento
`holos_next_steps` guarda catálogo (id, código, versão, hash), motor (`PP-V1`), ordem dos sistemas (com dominantes),
seleção (regras, ferramentas, sistemas de origem, se pulou concluída), snapshot completo e sha256. Único por
(aplicação, catálogo); imutável (gatilho); catálogo novo gera registro novo sem tocar o antigo (provado: harness PP17 e
teste 16). Aplicação anterior ao catálogo: nada automático; só por ação explícita (decisão conservadora, item 20).
Aplicação histórica sem pacote oficial: recusa explícita (`aplicacao_nao_oficial`), nada inventado.

## J. Testes
- SQL (cadeia local, `scripts/validar-cadeia-local.sh`): **PP00–PP21** — nada existente mudou; catálogo íntegro (30, 6×5,
  hash); motor sem `lab_*`/LI/documents; principal + 2 complementares; dedup; concluída no atendimento pulada; em outro
  atendimento não; um sistema; nenhum sistema; dominantes; determinismo; registrar idempotente com sha256; RLS (42501);
  outra conta; gatilhos; ferramenta fora das 10 (check 23514); regra retirada; catálogo v2 não altera o v1; exame não
  muda nada; Resultado HOLOS da paciente sem recomendação; HOLOSCAN/metodologia/condutas idênticos ao fim.
- `testar-proximos-passos-motor.mjs` (Node): fixture ≡ migration; algoritmo; não aprovada/fora das 10/REC legada nunca;
  fronteira de código (sem exames, documentos, LI, Conduta, HOLOS AI; sem escrita); linguagem.
- `testar-proximos-passos.mjs` (navegador + servidor falso): os 20 testes obrigatórios + prévia → registro ao salvar +
  aplicação anterior ao catálogo.
- Suíte completa: ver seção N.

## K. Riscos
- Dois motores (SQL e JS) precisam continuar idênticos: cobertos por fixtures iguais nos dois lados; qualquer mudança
  de algoritmo exige mudar os dois e os testes.
- Sinais dominantes no servidor são recalculados das respostas; para aplicação oficial são os mesmos que a tela mostra
  (mesma fórmula). Se um dia a política de cobertura mínima deixar de ser nula, a ordem "Por onde investigar" (grau de
  cobertura) precisa ser espelhada no SQL.
- A aprovação do catálogo está em texto (`provenance`), sem `approved_by`: aceitável hoje, a formalizar quando houver
  identidade do aprovador no sistema.
- O bloco aparece para a nutricionista; a decisão do que vai à paciente fica para outra tarefa (não entra em Resultado,
  PDF, WhatsApp).

## L. O que deliberadamente não foi alterado
HOLOS-V1@2 (84 perguntas, pesos, associações, sistemas, Tríade, Índice, faixas, mensagens, cálculo, cobertura);
`methodology_rules`; REC-001…023 e SEL-001 (ficam desligadas em `corpo-bancos.js`, fora do motor novo); exames,
documentos, Leitura Integrada; Conduta; página Resultado da paciente, PDF e WhatsApp; `holos-ai.js`; Resultado HOLOS
salvo; aplicações antigas (nenhum recálculo silencioso).

## M. git diff --stat
```
RELEASE-STATE.md                                   |   1 +
 app.js                                             |  16 +-
 docs/deploy.md                                     |  11 +-
 docs/v1/DECISOES-V1.md                             |  16 +-
 docs/v1/IMPLEMENTACAO-PROXIMOS-PASSOS-HOLOS-V1.md  | 139 ++++++++
 index.html                                         |   3 +
 proximos-passos.js                                 | 280 ++++++++++++++++
 scripts/deploy-etapa6-5b.sh                        |  12 +-
 scripts/validar-cadeia-local.sh                    |   9 +-
 style.css                                          |  22 ++
 supabase/PROXIMOS-PASSOS-PARTE1.sql                |  70 ++++
 supabase/PROXIMOS-PASSOS-PARTE2.sql                |  47 +++
 supabase/PROXIMOS-PASSOS-PARTE3.sql                |  51 +++
 supabase/PROXIMOS-PASSOS-PARTE4.sql                |  35 ++
 supabase/PROXIMOS-PASSOS-PARTE5.sql                |  54 ++++
 supabase/PROXIMOS-PASSOS-PARTE6.sql                | 139 ++++++++
 supabase/PROXIMOS-PASSOS-PARTE7.sql                |  65 ++++
 supabase/PROXIMOS-PASSOS-PARTE8.sql                |  53 +++
 .../20261012100000_proximos_passos_holos.sql       | 360 +++++++++++++++++++++
 supabase/tests/proximos-passos-harness.sql         | 260 +++++++++++++++
 supabase/tests/proximos-passos-pre.sql             |  37 +++
 testes/proximos-passos-catalogo-v1.mjs             |  53 +++
 testes/proximos-passos-falso.mjs                   |  79 +++++
 testes/suites.mjs                                  |   1 +
 testes/supabase-falso.mjs                          |  26 +-
 testes/testar-proximos-passos-motor.mjs            |  67 ++++
 testes/testar-proximos-passos.mjs                  | 236 ++++++++++++++
 testes/testar-storage-manifest.mjs                 |   4 +-
 testes/testar-v1-etapa5-ui.mjs                     |   2 +-
 29 files changed, 2126 insertions(+), 22 deletions(-)
```

## N. Commit final
`732081c` — "Proximos Passos HOLOS: motor oficial V1 de recomendacao de ferramentas" (implementação completa). O commit seguinte
só atualiza o roteiro de deploy (`scripts/deploy-etapa6-5b.sh`) e esta seção. Suíte completa: ver o relatório final da sessão (rodada sobre este commit).

## Plano de aplicação real (depois da revisão)
1. SQL Editor: `supabase/PROXIMOS-PASSOS-PARTE1` → … → `PARTE8` (na ordem; a 8 confere e registra). Depois, só leitura:
   30 regras, hash `0d35b513547f…`, privilégios `false`.
2. Deploy do front (`scripts/deploy-etapa6-5b.sh`, `OK: 64 de 64`).
3. No ar: aplicar um HOLOSCAN de teste (paciente fictício) e conferir o bloco, o botão e o registro; abrir uma aplicação
   antiga e conferir que só o botão "Ver Próximos Passos segundo o catálogo atual" aparece.
