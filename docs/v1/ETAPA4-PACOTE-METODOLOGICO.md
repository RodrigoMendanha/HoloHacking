# HOLOHACKING V1 — ETAPA 4 CONCLUÍDA

Infraestrutura do Pacote Metodológico + inventário de homologação. 01/10/2026.

**Nada foi homologado.** Todo o conteúdo atual entrou como RASCUNHO / PARA HOMOLOGAÇÃO.
As decisões humanas estão em `docs/v1/metodologia/HOMOLOGACAO-PENDENTE.md`.

## BASELINE
- branch: `claude/v1-etapa3-evolucao-relatorios`
- HEAD: `1e4e5465b8083f37821aea44c83e7fc38729fdcd`
- testes: 87 suítes, 2720 asserções, 0 falhas

## GIT
- branch final: `claude/v1-etapa4-pacote-metodologico`
- commits (a partir de 1e4e546):
  - `027052d` docs(v1): inventaria fontes metodologicas
  - `3c4a445` feat(methodology): cria estrutura versionada de pacotes (inclui validadores SQL e JS)
  - `f4b89c5` feat(methodology): importa inventario atual como rascunho
  - `0fe3a46` feat(methodology): cria motor generico em modo homologacao
  - `74052d4` feat(methodology): centraliza barreira de saida oficial
  - `44c861c` test(v1): cobre pacote e homologacao
  - `f0ef2dc` fix(methodology): corrige validador SQL e cobre cadeia em Postgres local
  - `f8281d3` docs(v1): gera matriz de homologacao
  - commit deste relatório: docs(v1): fecha etapa 4

## INVENTÁRIO
- IDs únicos: 84 (51+19+16 = 86 linhas de banco; SNT-101 e SNT-501 aparecem em 2 linhas cada)
- físico: 49 · mental/emocional: 19 · espiritual/propósito: 16
- SNT-101: identificado, 2 linhas primárias (Fúngico peso 2 / Metabólico peso 3), PENDENTE
- SNT-501: identificado, 2 linhas primárias (Metabólico peso 2 / Mental Emocional Espiritual peso 3), PENDENTE
- fontes inventariadas: 27 (`metodologia/INVENTARIO-FONTES.md`)
- verdade executável: `metodologia/inventario-metodologico-v1.json` + `.csv` (84 perguntas,
  179 associações, 2 escalas, 15 faixas, Índice, Tríada, ausência, 8 conflitos)

## PACOTE
- persistência: migration `20260930190000_etapa4_pacote_metodologico.sql` (9 tabelas + RLS)
- versionamento: `(nutritionist_id, code, version)` único; mudança após aprovação = nova versão
- status: rascunho, em_revisao, aprovado, retirado
- imutabilidade aprovado: trigger no pacote e em todas as tabelas filhas
- retirada preserva histórico: sim; sem DELETE; snapshot do HOLOSCAN guarda `methodology_package_id` imutável
- aprovação automática: NÃO (só `aprovar_pacote_metodologico` com responsável humano, justificativa e validador com 0 erros)

## PERGUNTAS
- edição: `methodology_questionnaire_editions` + `methodology_questions` (stable_id, statement,
  block, scale_code, response_labels, orientation, temporal_context, status, source, notes, version)
- escalas: 2 recuperadas (frequência em 73 itens, intensidade em 11), ESTRUTURA RECUPERADA
- inversões: 9 (SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501), todas PENDENTES; orientação ausente ≠ direta (testado)
- associações: 179 explícitas (95 sistema + 84 Tríada derivada), conflitos marcados, nenhum vencedor escolhido
- pesos: inventariados sem normalizar nem preencher
- conteúdo homologado automaticamente: NÃO

## PARCIALIDADE
- política oficial criada: NÃO (estrutura `rule_type='absence'` com campos nulos)
- corte mínimo inventado: NÃO
- cobertura bruta preservada: sim, como COBERTURA DE PREENCHIMENTO (respondidos ÷ 84), só informativa

## ÍNDICE
- pesos atuais inventariados: 0,20 × 5, renormalização entre avaliáveis
- oficializado: NÃO

## TRÍADE
- estrutura inventariada: eixos, contribuição por ID, pesos, escala, elegibilidade, agregação
- oficializada: NÃO

## FAIXAS
- inventariadas: 15 (3 por sistema, ≤3 / 3–6 / >6, com mensagens)
- oficializadas: NÃO
- gaps/overlaps detectados: nenhum nas 15 recuperadas; o validador detecta lacuna, sobreposição e ordem inválida (provado com fixture)

## MOTOR
- contrato genérico: `metodologia-motor.js` (entrada: responses, response_states, edição, pacote, contexto, engine_version; saída: coverage, item_contributions, system_results, index_result, triad_result, non_evaluable_reasons, trace)
- determinismo fixture: sim (mesma entrada + versões = mesmo resultado e mesmo hash)
- trilha: question_id, raw_response, oriented_value, destination, weight, contribution
- pacote real V1 executado oficialmente: NÃO

## BARREIRA
- `window.Metodologia` única (obterPacoteAtivo, podeCalcularOficial, podeExibirOficial, motivosBloqueio, modoHomologacao)
- pacote rascunho bloqueado do Dashboard: sim
- Evolução: sim (sem delta oficial)
- Relatórios: sim (`resultados_oficiais = false`)
- HOLOS AI: sim (nenhuma saída de pacote rascunho)
- saída oficial: bloqueada; sem fallback para rascunho nem para o motor legado

## HOMOLOGAÇÃO
- matriz criada: `metodologia/MATRIZ-HOMOLOGACAO-V1.md`
- inventário JSON/CSV: sim, e exportação JSON/CSV na tela interna (sem dados de paciente)
- decisões humanas pendentes: 14 blocos em `metodologia/HOMOLOGACAO-PENDENTE.md`; o validador aponta 12 bloqueios no rascunho
- botão aprovar tudo: NÃO

## MIGRATIONS
- novas: `20260930190000_etapa4_pacote_metodologico.sql`
- produção: NÃO aplicada

## SUPABASE / BANCO
- Cadeia 130000 → 190000 + 33 checagens validada em **PostgreSQL 16 local descartável**
  (migrations anteriores do repositório + stub mínimo de `auth`/`storage`/grants), dentro de
  BEGIN ... ROLLBACK: **33/33 ok**; após o ROLLBACK, 0 tabelas/funções das Etapas 1–4.
  Reproduzível com `scripts/validar-cadeia-local.sh`.
- A validação no banco real **não pôde ser executada nesta sessão**: o conector SQL passou a
  recusar requisições grandes (consultas pequenas funcionam; a cadeia de 46–135 KB expirava antes
  de chegar ao Postgres). Verificado no banco real: nenhuma tabela `methodology_*`, nenhuma
  função da Etapa 4, nenhum paciente de teste, nenhuma sessão pendurada.
- A validação local encontrou e corrigiu 2 erros reais da migration (cast em
  `aprovar_pacote_metodologico`; checagem de faixas com `record IS NOT NULL`).
- persistência: NÃO

## TESTES
- suítes: 91 (87 da base + 4 da Etapa 4)
- asserções: 2862 (base 2720; nenhuma removida)
- falhas: 0

## DOCKER
- build no HEAD final; checks de `/`, app.js, metodologia.js, holoscan.js, ficha.js,
  evolucao.js, relatorios.js, holos-ai.js, version.json e dos 4 novos módulos; resultado e
  SHA na resposta final da etapa (o build é feito depois deste commit para que
  `version.json.commit` seja o próprio HEAD).

## DEPLOY
- executado: NÃO

## RESULTADO
- infraestrutura metodológica pronta: sim
- metodologia V1 homologada: NÃO
- bloqueadores para homologação: decisões humanas de `HOMOLOGACAO-PENDENTE.md`
  (SNT-101/501, secundárias, parcialidade, Índice, Tríada, caso de referência) e validação
  da cadeia no banco real
- próximo passo: liderança do método decide e registra; validar a cadeia no banco real antes de
  qualquer aplicação

Não iniciado: catálogo laboratorial, Leitura Integrada final, aprovação de metodologia.

---

# ETAPA 4.1 — PACOTE DE DECISÃO HUMANA (01/10/2026)

`docs/v1/metodologia/PACOTE-DECISAO-HUMANA-V1.md` (15 decisões, sem recomendação) e
`RESUMO-DECISOES-HUMANAS.md`. Banco real: VALIDAÇÃO REAL PENDENTE — CONEXÃO DIRETA NÃO DISPONÍVEL.

# ETAPA 4.2 — CONSOLIDAÇÃO DO PACOTE METODOLÓGICO V1 (01/10/2026)

**DECISÕES METODOLÓGICAS V1 FECHADAS** — `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`.

**PUBLICAÇÃO TÉCNICA PENDENTE DE VALIDAÇÃO NO BANCO REAL.**

- branch: `claude/v1-etapa4-2-metodologia-final` (a partir de `433de68`; a branch da Etapa 4.1 fica preservada)
- candidato: HOLOS-V1@2, `em_revisao`, hash `3593d782…f24c4`; linhagem para HOLOS-V1@1 (rascunho, hash `7e7e55dc…213cc`, preservado)
- validador: 0 bloqueios metodológicos no candidato (JS e SQL); o importado continua bloqueado
- motor: `motor-generico-2.0.0`, contrato `holoscan-motor-contrato-v1`, aritmética racional exata, sem fallback
- migration nova: `20261001200000_etapa4_2_contrato_metodologico_v1.sql` — **NÃO aplicada**
- cadeia 130000→200000 + harness Etapa 4 (33) + Etapa 4.2 (18) em PostgreSQL 16 local, BEGIN/ROLLBACK: **51/51 ok**; nada persistiu
- banco real: não tocado; sem conexão direta autorizada neste ambiente
- testes: 92 suítes, 2950 asserções, 0 falhas (nenhuma asserção removida; +1 suíte `testar-v1-etapa4-2-pacote-v1.mjs`, 82 asserções)
- deploy: NÃO
