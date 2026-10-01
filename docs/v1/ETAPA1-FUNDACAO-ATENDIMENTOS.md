# HoloHacking V1 — Etapa 1 — Fundação de dados + Agenda × Atendimento

# Resumo executivo

A Etapa 1 separa, no banco e na tela, o **AGENDAMENTO** (agenda, `consultations`)
do **ATENDIMENTO clínico** (`encounters`, entidade nova). Todo registro clínico
novo (HOLOSCAN oficial, aplicação de ferramenta, coleta de exames quando a
profissional quiser) liga-se ao atendimento **explicitamente escolhido**; nenhum
vínculo é deduzido pela data. A agenda deixa de apagar: desmarcar cancela
(`cancelled_at`) e reagendar preserva o original ligado ao novo. Nada foi aplicado
em produção; a cadeia de migrations foi validada em BEGIN/ROLLBACK no banco real.

Entregas: migration `20260930160000_etapa1_atendimentos.sql`; módulo
`atendimento.js` (contexto de atendimento ativo); agenda com cancelamento,
reagendamento e "Iniciar atendimento"; ficha com cabeçalho "Atendimento ativo" e
aba "Atendimentos"; tela global "Atendimentos"; HOLOSCAN, ferramentas e coletas
com `encounter_id`; exportação e contexto da HOLOS AI distinguindo agendamento de
atendimento; duas suítes novas; documentação (`ETAPA1-ARQUITETURA-ATENDIMENTOS.md`,
`DECISOES-V1.md` itens 16–22, este relatório).

# Baseline

| Item | Valor |
|---|---|
| Branch inicial | `claude/v1-etapa0-reconciliacao-mestre` |
| HEAD inicial | `b528c2bf547c4045ff27cca90e185c51b7d2b79a` |
| origin/main | `6bf10f5228ff2ab21b01498892e62cbdf9401827` (produção, intocada) |
| Suíte inicial | 81 suítes · 2440 asserções · 0 falhas (`scratchpad/baseline-etapa1.log`) |
| Branch de trabalho | `claude/v1-etapa1-atendimentos` |

# Arquitetura adotada

Ver `docs/v1/ETAPA1-ARQUITETURA-ATENDIMENTOS.md` (escrito antes da migration).
Em uma linha: `consultations` continua fisicamente e é **agendamento**;
`encounters` é **atendimento**; FKs compostas `(…, patient_id, nutritionist_id)`
impedem cruzar paciente ou profissional; `encounter_id` nullable em
`holoscan_applications`, `tool_applications`, `lab_collections`; nenhum backfill.
Nome `encounters` mantido (nenhum motivo técnico contra).

# Agenda

* `consultations` = agendamento: paciente, data, hora, duração, tipo, nota; bloqueios
  em `schedule_blocks`. Textos revisados ("agendamento não é atendimento").
* Marcar, abrir a agenda, clicar num agendamento, a hora chegar: **não** criam
  atendimento (testes 2, 3, 4 da suíte de comportamento).
* Ação **Iniciar atendimento** no agendamento vigente: diálogo com paciente,
  agendamento de origem e data/hora efetiva (pré-preenchida com o agendamento, no
  fuso do perfil); confirma → cria `encounter` com `consultation_id`, seleciona e
  abre a ficha. Se já existe atendimento ligado ao agendamento → **Abrir
  atendimento** (nunca duplica em silêncio).
* `Agenda.todas/proxima/doDia/daCarteira` devolvem só os vigentes;
  `Agenda.canceladas(pid)`, `Agenda.todas(pid, {incluirCanceladas: true})` e
  `Agenda.porId(id)` dão o histórico; chip "Ver canceladas" na grade.

# Atendimento

`encounters`: `id`, `nutritionist_id`, `patient_id`, `consultation_id` (NULL =
sem agendamento), `occurred_at` TIMESTAMPTZ, `timezone` (snapshot de
`profiles.fuso`), `type`, `modality`, `status` (texto livre, "aberto" por padrão
no app, sem CHECK), `summary_text` (sem regra de conclusão), `operation_id`,
`created_at`, `updated_at`. Criado só pela RPC `criar_atendimento` (com sessão) ou
em memória (localhost, desenvolvimento). Frontend: `window.AtendimentoAtual`
(`atendimento.js`).

# Banco

Migration `supabase/migrations/20260930160000_etapa1_atendimentos.sql`
(posterior às pendentes 130000/140000/150000, que não foram reescritas):

1. `consultations`: `cancelled_at`, `cancellation_reason`, `rescheduled_from_id`,
   `rescheduled_to_id` (FKs compostas para o mesmo paciente/profissional, `ON
   DELETE SET NULL (coluna)`), índice parcial de canceladas.
2. `encounters` (acima) + unique `(id, patient_id, nutritionist_id)` + índice único
   parcial `(nutritionist_id, operation_id)` + `tocar_updated_at` +
   `bloquear_escrita_paciente_arquivado`.
3. `encounter_id` + FK composta `ON DELETE RESTRICT` + índice parcial em
   `holoscan_applications`, `tool_applications`, `lab_collections`.
4. RPC `criar_atendimento(payload jsonb)` — SECURITY INVOKER, idempotente por
   `operation_id`, recusa reaproveitar `operation_id` para outro paciente, trata
   a corrida pela `unique_violation`.
5. RPC `reagendar_consulta(...)` — SECURITY INVOKER, atômica, recusa reagendar o
   já cancelado/reagendado.
6. `salvar_holoscan_completo` recriada com `encounter_id` (mantém a normalização
   de ausência da 130000).
7. `proteger_snapshot_holoscan` recriada com `encounter_id` entre os campos
   imutáveis (ajuste final).

# RLS e segurança

`encounters`: RLS ligada; SELECT/INSERT/UPDATE para `authenticated` com
`nutritionist_id = auth.uid()`; **sem DELETE**; `revoke all … from public, anon`.
RPCs novas: `revoke … from public, anon`, `grant execute … to authenticated`,
SECURITY INVOKER (a RLS do chamador vale dentro). Policies existentes não foram
alteradas. Paciente inativo: trigger central reaproveitado (sem lógica duplicada no
front além da já existente `pacienteArquivado`). Nenhum `service_role`, nenhuma
chave nova no frontend.

# Cancelamento

"Desmarcar" na agenda → modal com motivo opcional → `UPDATE consultations SET
cancelled_at, cancellation_reason`. Nenhum DELETE no fluxo da agenda. A grade
esconde canceladas por padrão; "Ver canceladas" mostra (riscadas); a ficha lista o
histórico "Consultas canceladas ou reagendadas". A policy de DELETE em
`consultations` **permanece** porque a exclusão completa de paciente (Rodada 08)
depende dela — registrado em pendências.

# Reagendamento

"Reagendar" na agenda (dia/hora novos) → modal → RPC `reagendar_consulta`: novo
agendamento com `rescheduled_from_id = original`; original recebe `cancelled_at`,
`cancellation_reason` (motivo ou "reagendada") e `rescheduled_to_id = novo`. Nunca
DELETE + INSERT. Sem sessão (desenvolvimento) as duas escritas são feitas localmente
na mesma ordem. O formulário do agendamento mostra os elos ("ver o novo
agendamento" / "reagendado a partir de…").

# Atendimento ativo

`window.AtendimentoAtual` guarda `{ encounter_id, patient_id, consultation_id,
occurred_at, timezone, … }` e `carregando()`. `iniciar()`, `abrirDialogo()`,
`selecionar()/selecionarPorId()`, `limpar()`, `atualizar()` (controle otimista por
`updated_at`), `doPaciente()`, `todos()`, `porAgendamento()`, `paraInstante()`,
`paraParede()`, `fuso()`. A troca de paciente (`aoTrocarPaciente`) solta um
atendimento que não é do paciente ativo; selecionar um atendimento de outra pessoa
troca o paciente ativo explicitamente. `atual()` nunca devolve atendimento de outro
paciente. Logout (`login.js`) chama `esquecer()`; login (`sincronizacao.js`) recarrega.

# Ficha

* Cabeçalho: bloco **Atendimento ativo** (`#ficha-atendimento`) com data/hora no
  fuso, tipo e origem (com/sem agendamento) ou "Nenhum atendimento selecionado";
  ações **Selecionar atendimento** (abre a aba), **Iniciar novo atendimento**,
  **Soltar**.
* Aba "Consultas" → **Atendimentos** (id técnico `consultas` mantido): lista os
  atendimentos do paciente (abrir = selecionar como contexto; não cria), botões
  "Novo atendimento" e "Marcar consulta (agenda)", e os blocos da agenda com nome
  de agenda ("Próxima consulta marcada (agenda)", "Consultas anteriores (agenda)",
  "Consultas canceladas ou reagendadas (histórico)").
* Botão do cabeçalho "Nova consulta" → "Marcar consulta".

# Holoscan

`holoscan_applications.encounter_id` (FK composta). O botão Salvar com sessão exige
atendimento ativo **deste** paciente; sem ele mostra "Selecione ou inicie um
atendimento para salvar." e não chama a RPC. O rascunho local do questionário
(`holohacking.questionario`) continua intacto. `salvar_holoscan_completo` grava o
`encounter_id`. Histórico: NULL, sem backfill. Hidratação (`COLS_APP`) e exportação
levam `encounter_id`. **Ajuste final:** `proteger_snapshot_holoscan` (recriada na
seção 7 da migration 160000) trata `encounter_id` como imutável — depois de
consolidada, a aplicação não é reassociada a outro atendimento do mesmo paciente
nem tem o vínculo anulado; a interpretação profissional continua editável; linhas
históricas com `encounter_id` NULL não são tocadas.

# Ferramentas

`consultaDeHoje()` **removido** de `aplicacoes.js`. Aplicação nova nasce com
`consulta_id = null` e, na primeira gravação, `encounter_id = AtendimentoAtual
.idPara(paciente)` (ou null). `consultation_id` = vínculo legado com o agendamento
(preservado, não apagado, não backfilled); `encounter_id` = vínculo clínico V1
(documentado no cabeçalho de `aplicacoes.js` e em `DECISOES-V1` item 22).

# Exames

`lab_collections.encounter_id` opcional. No painel de exames aparece a caixa
"Vincular ao atendimento ativo (…)" só quando há atendimento ativo do paciente;
marcada → a coleta sai com `encounter_id`; desmarcada → sem vínculo (ou desvincula
ao editar). Nunca por data. Identidade por ID, duas coletas na mesma data e nova
coleta vazia continuam como na Etapa 0.

# Exclusão de paciente (ajuste final)

`contarRegistros` passa a contar `encounters` (servidor: `count` por `patient_id`;
local: `AtendimentoAtual.doPaciente`) e `temHistorico` considera qualquer
atendimento como histórico clínico. Paciente com 1 atendimento e nenhum outro
registro **não** é tratado como vazio: o modal "Não é possível excluir …" oferece
só Arquivar, explicando "1 atendimento". Nenhuma policy de DELETE foi adicionada a
`encounters`; a contagem local inclui agendamentos cancelados. Teste em
`testar-v1-etapa1.mjs` (seção "Ajuste final").

# Exportação

`reunirDadosPaciente` passa a emitir `atendimentos` (encounters, com `origem`
com/sem agendamento) e `agendamentos` (antes `consultas`; agora com os
cancelados/reagendados e seus campos), além de `encounter_id` em
`holoscanAplicacoes`, `aplicacoesFerramentas` e `coletasExames`. Nenhum segredo.

# HOLOS AI

Sem provedor. O contexto bruto ganha a seção "Atendimentos registrados" (quando,
tipo, com/sem agendamento, qual está SELECIONADO) e a agenda vai como "Agenda
(agendamentos)", nunca "Realizada". Nada da Etapa 0 foi reintroduzido (teste 20).

# Dados históricos

Nenhum UPDATE em dado existente. `encounter_id` NULL em todo o histórico de
`holoscan_applications`, `tool_applications` e `lab_collections`;
`consultations` existentes seguem vigentes (`cancelled_at` NULL).

# Migrations

| Migration | Estado |
|---|---|
| 20260930130000 | pendente (Etapa 0), não reescrita, validada na cadeia |
| 20260930140000 (reescrita Etapa 0) | pendente, não reescrita, validada na cadeia |
| 20260930150000 | pendente, não reescrita, validada na cadeia |
| **20260930160000_etapa1_atendimentos** | nova, pendente, validada na cadeia |

Nenhuma aplicada em produção.

# Testes

| Medida | Baseline (Etapa 0) | Final (Etapa 1) |
|---|---|---|
| Suítes | 81 | **83** (+2) |
| Asserções | 2440 | **2523** (+83; inclui o ajuste final) |
| Falhas | 0 | **0** |

Suítes novas (em `testes/suites.mjs`):

* `testar-v1-etapa1-banco.mjs` — 24 asserções, sem navegador, contra o Supabase
  falso (que espelha a migration 160000): os 13 contratos da Onda 31 mais extras
  (DELETE sem efeito em `encounters`, proveniência não cruza paciente,
  `operation_id` de outro paciente recusado, índice único parcial).
* `testar-v1-etapa1.mjs` — 48 asserções, app real com conta: os 20 comportamentos
  da Onda 32, cancelar/reagendar pela agenda, fuso (ida e volta, SP e Manaus,
  virada de dia), idempotência por `operation_id`, controle otimista.

Suítes ajustadas ao contrato novo (sem reduzir cobertura): `testar-calendario`
(desmarcar = cancelar, chip "Ver canceladas"; +2), `testar-ficha-consultas`
(textos/títulos da aba Atendimentos), `testar-atendimento` (tile "aplicações do
HOLOSCAN"), `testar-arquivos` e `testar-ficha-abas` (rótulos), `testar-rodada08-
holoscan`, `testar-v1-etapa0`, `testar-release01-multidispositivo` (+1) e
`testar-release01-falhas-remotas` (iniciam/selecionam atendimento antes de salvar o
HOLOSCAN), `testar-storage-manifest` (38 scripts). Supabase falso: tabela
`encounters`, colunas `encounter_id` e de cancelamento, FKs compostas, RPCs
`criar_atendimento` e `reagendar_consulta`, `salvar_holoscan_completo` com
`encounter_id`. Logs: `scratchpad/baseline-etapa1.log`, `scratchpad/final2-etapa1.log`.

# Supabase rollback

Projeto `sllhyymeeyoozokgbnuv`, uma única transação: `BEGIN` → 130000 → 140000
→ 150000 → 160000 → testes como `authenticated` (claims de um profissional real) →
`ROLLBACK`. Resultado dos 13 itens da Onda 31 (mais extras): T1 ok, T2 ok (42501),
T3 ok, T4 ok, T5 ok, T6 ok, T7 ok, T8 ok, T8b ok, T9 ok, T9b ok, T10 ok (trigger de
arquivado), T11 ok, T12 ok, T13 ok, T14 ok, T15 ok (`salvar_holoscan_completo`
grava `encounter_id`). O único "FALHOU" foi uma checagem extra `updated_at >
created_at`, impossível dentro de uma transação (`now()` é fixo) — artefato do
teste, não defeito. **Ajuste final:** cadeia revalidada em BEGIN/ROLLBACK com a
seção 7: atendimentos A e B do mesmo paciente, HOLOSCAN ligado a A, `UPDATE
encounter_id = B` recusado, anular recusado, vínculo permanece A, interpretação
editável; checagem posterior: nada persistiu (`proteger_snapshot_holoscan` em
produção segue sem `encounter_id`). Checagem posterior: tabela `encounters` 0, colunas
`encounter_id` 0, colunas de cancelamento 0, funções novas 0, triggers de arquivado
0, pacientes de teste 0, CHECK da 130000 0, `salvar_holoscan_completo` sem
`encounter_id`. **Nada persistiu.**

# Docker

Procedimento (igual à Etapa 0): `docker build --build-arg COMMIT=$(git rev-parse
HEAD) --build-arg VERSAO=0.2.0 -t holohacking:etapa1 .`; container local em
`127.0.0.1:18080`; `curl` de `/`, `app.js`, `ficha.js`, `agenda.js`,
`consultas.js`, `aplicacoes.js`, `arquivos.js`, `holos-ai.js`, `metodologia.js`,
`atendimento.js` (novo) e `version.json`; `version.json.commit` tem de ser igual a
`git rev-parse HEAD`; `sh scripts/conferir-producao.sh http://127.0.0.1:18080`
contra os 40 hashes do `docs/deploy.md §3.5` (regenerados nesta etapa; `testar-
conferir-producao` verde). O build é feito no HEAD final da branch, depois deste
documento ser commitado; o resultado (HTTP 200 em todos, `commit` igual ao HEAD,
`OK: 40 de 40`) está registrado na resposta final da etapa. Nenhum deploy.

# Pendências

1. Estados definitivos de agendamento e atendimento (enum/CHECK) — produto.
2. Vinculação humana de registros históricos a atendimentos — função não criada.
3. Exclusão de atendimento (sem policy de DELETE) × exclusão completa de paciente
   da Rodada 08 — decidir; a policy de DELETE de `consultations` permanece por isso.
   (Ajuste final: paciente com atendimento já conta como "com histórico" e só
   arquiva; pendente é só o destino dos atendimentos numa exclusão completa futura.)
4. ~~`proteger_snapshot_holoscan` não protege `encounter_id`~~ — resolvido no ajuste
   final (campo imutável; testado no banco real e no falso).
5. `encounters.status`/`type`/`modality` sem vocabulário — texto livre por ora.
6. Modo local (sem sessão): atendimentos só em memória; não entram no manifesto de
   armazenamento nem no backup (decisão desta etapa para não ampliar o modo local).
7. Documentos × atendimento — adiado para Relatórios/Emissões.
8. Anamnese e Conduta — não implementadas; nascerão com `encounter_id` NOT NULL.
9. Quatro estados do paciente — não migrados; `ativo/inativo` mantido.
10. ~~Timeline da visão geral com filtro "Consultas"~~ — resolvido no ajuste final:
    filtro "Agendamentos"; eventos "Agendamento" / "Consulta marcada (agendamento)".
11. Pendências herdadas da Etapa 0 (ver `ETAPA0-RECONCILIACAO-FINAL.md`).

# Prontidão para Etapa 2

A espinha dorsal existe: `encounters` com integridade forte, contexto ativo na
tela, vínculo explícito dos registros clínicos. Anamnese e Conduta podem nascer
como tabelas filhas de `encounters` (`encounter_id NOT NULL` + FK composta), com o
mesmo padrão de RLS e trigger de arquivado. Bloqueadores: nenhum técnico; a
aplicação das quatro migrations pendentes em produção depende de revisão humana.
