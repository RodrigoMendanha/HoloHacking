# HoloHacking V1 — Etapa 1 — Arquitetura: Agenda × Atendimento

Documento de arquitetura escrito ANTES da migration da Etapa 1, conforme a
ordem de autoridade da V1: Documento Mestre → `DECISOES-V1.md` →
`ETAPA0-RECONCILIACAO-FINAL.md` → AS-IS (fotografia) → código.

Branch: `claude/v1-etapa1-atendimentos`, criada a partir de
`b528c2bf547c4045ff27cca90e185c51b7d2b79a` (HEAD final da Etapa 0).

## 1. AS-IS (fotografia, antes desta etapa)

| Conceito | Onde mora | O que é de fato |
|---|---|---|
| "Consulta" | `consultations` (Supabase) / `consultas` (DadosLocais) | um **agendamento**: paciente, dia, hora, duração, tipo, nota |
| "Atendimento" | não existe persistido | a tela "Consultas" listava aplicações do HOLOSCAN como se fossem atendimentos; o dashboard chamava agendamentos futuros de "Próximos atendimentos" |
| Vínculo clínico ↔ consulta | `tool_applications.consultation_id` | preenchido por `consultaDeHoje()`: a **primeira consulta da agenda no dia de hoje** do paciente ativo (dedução por data) |
| HOLOSCAN ↔ consulta | nenhum | `holoscan_applications.quando` é só a data do cálculo |
| Coleta ↔ consulta | nenhum | identidade da coleta é o ID (Etapa 0) |
| Desmarcar | `DELETE` em `consultations` | o histórico some |
| Reagendar | editar dia/hora da mesma linha | o agendamento original é sobrescrito |

## 2. DESTINO (o que esta etapa entrega)

| Conceito | Tabela | Papel |
|---|---|---|
| **AGENDAMENTO** | `consultations` (mantida fisicamente, nome não muda) | fato administrativo: quando a pessoa foi marcada; pode ser cancelado ou reagendado, nunca apagado pela agenda |
| **ATENDIMENTO CLÍNICO** | `encounters` (nova) | fato clínico: aconteceu um atendimento, em `occurred_at`, com ou sem agendamento de origem |

Regras congeladas (DECISOES-V1 / pedido da Etapa 1):

* Agenda ≠ Atendimento. Agendamento sem atendimento é válido (faltou,
  cancelou, ainda não chegou). Atendimento sem agendamento é válido
  (encaixe, atendimento espontâneo).
* Nenhum registro clínico novo deduz o atendimento por data. **Nunca**
  "consulta de hoje", "primeira consulta desta data" nem "última consulta".
  O vínculo é sempre com o atendimento **escolhido explicitamente**.
* Criar/abrir agendamento, abrir a agenda, abrir a ficha ou a passagem do
  tempo **não** criam atendimento. Só a ação explícita "Iniciar atendimento"
  (a partir de um agendamento) ou "Novo atendimento" (sem agendamento).
* Dados históricos ficam como estão: `encounter_id` NULL. Nenhum backfill
  por data em `holoscan_applications`, `tool_applications`, `lab_collections`.

## 3. Entidade `encounters`

| Coluna | Tipo | Regra |
|---|---|---|
| `id` | uuid PK | identidade do atendimento |
| `nutritionist_id` | uuid NOT NULL → `auth.users` | dono (RLS) |
| `patient_id` | uuid NOT NULL | paciente; FK composta `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` |
| `consultation_id` | uuid NULL | agendamento de origem; FK composta `(consultation_id, patient_id, nutritionist_id)` → `consultations(id, patient_id, nutritionist_id)` — um atendimento do paciente A **não pode** apontar para agendamento do paciente B, nem de outro profissional |
| `occurred_at` | timestamptz NOT NULL | data/hora clínica, instante absoluto |
| `timezone` | text NULL | snapshot do fuso em que `occurred_at` foi escolhido (`profiles.fuso`) |
| `type` | text NULL | sem CHECK (estados não congelados) |
| `modality` | text NULL | sem CHECK |
| `status` | text NULL | sem CHECK; default funcional `'aberto'` só no app |
| `summary_text` | text NULL | texto livre; nenhuma regra de conclusão |
| `operation_id` | uuid NULL | idempotência: índice único parcial `(nutritionist_id, operation_id)` |
| `created_at`, `updated_at` | timestamptz | `updated_at` via `tocar_updated_at()`; usado no controle otimista |

Unique composta `(id, patient_id, nutritionist_id)` para as FKs de
`holoscan_applications`, `tool_applications` e `lab_collections` —
mesmo desenho que `consultations` já tem para `tool_applications`.

### Segurança

* RLS ligada; policies SELECT / INSERT / UPDATE para `authenticated`
  com `nutritionist_id = auth.uid()`. **Sem policy de DELETE**: atendimento
  não é apagado por esta etapa (a exclusão de paciente é assunto da
  Rodada 08 e fica registrada como pendência).
* `anon` não tem nada. Nenhum `service_role` no frontend.
* Trigger `encounters_paciente_arquivado` reusa
  `bloquear_escrita_paciente_arquivado()` (migration 150000): paciente
  inativo não recebe atendimento novo nem edição.

### Idempotência (`operation_id`)

RPC `criar_atendimento(payload jsonb)` (SECURITY INVOKER — a RLS continua
valendo): se `operation_id` já existe para o profissional, devolve o id
existente (e recusa se o atendimento existente for de outro paciente);
senão insere. Corrida entre duas chamadas iguais cai no índice único
parcial e a função devolve o registro que venceu. Não é debounce de tela:
é garantia no servidor.

## 4. `consultations` — cancelar e reagendar sem apagar

Colunas novas (todas NULL para o histórico):

* `cancelled_at timestamptz`, `cancellation_reason text` — cancelamento é
  um estado, não um DELETE. A agenda esconde canceladas por padrão;
  "Ver canceladas" mostra o histórico.
* `rescheduled_from_id uuid`, `rescheduled_to_id uuid` — proveniência.
  FKs compostas com `(patient_id, nutritionist_id)` para o reagendamento
  não cruzar paciente nem profissional.

RPC `reagendar_consulta(...)` (SECURITY INVOKER): numa única transação
cria o agendamento novo com `rescheduled_from_id = original` e marca o
original como cancelado (`cancellation_reason = 'reagendada'`,
`rescheduled_to_id = novo`). Nunca DELETE + INSERT. Um agendamento já
cancelado ou já reagendado não é reagendado de novo.

A policy de DELETE em `consultations` **permanece** (a exclusão completa
de paciente da Rodada 08 depende dela); a agenda apenas deixa de chamá-la.

## 5. Vínculos clínicos novos

| Tabela | Coluna nova | FK composta | Observação |
|---|---|---|---|
| `holoscan_applications` | `encounter_id uuid NULL` | `(encounter_id, patient_id, nutritionist_id)` → `encounters` | `salvar_holoscan_completo` passa a aceitar `application.encounter_id`; o app exige atendimento ativo para salvar aplicação oficial; rascunho local do questionário continua livre |
| `tool_applications` | `encounter_id uuid NULL` | idem | `consultation_id` continua existindo como **vínculo legado com o agendamento** (não apagado, não backfilled); aplicações novas gravam `encounter_id` do atendimento ativo e `consultation_id = NULL` |
| `lab_collections` | `encounter_id uuid NULL` | idem | vínculo **opcional e explícito** (caixa "Vincular ao atendimento ativo"); nunca por data |
| `documents` | — | — | sem remodelagem nesta etapa |

Snapshot do HOLOSCAN: o trigger `proteger_snapshot_holoscan` não lista
`encounter_id`, logo ele não é imutável por trigger — mas o app nunca o
altera depois de gravado. Registrado como pendência de endurecimento.

## 6. Contexto de atendimento ativo (frontend)

Módulo novo `atendimento.js` → `window.AtendimentoAtual`:

* estado `{ encounter_id, patient_id, consultation_id, occurred_at,
  timezone, carregando }` — em memória, por sessão de tela;
* `iniciar({ patient_id, consultation_id, occurred_at, timezone,
  operation_id })` grava via `criar_atendimento` (com sessão) ou em
  `DadosLocais` (`atendimentos`, só localhost) e seleciona;
* `selecionar(encounter)` troca explicitamente; `limpar()`;
* troca de paciente (`aoTrocarPaciente`) limpa o atendimento se o
  paciente não bate — nunca "paciente A + atendimento de B";
* `doPaciente(pid)` lista os atendimentos (ficha, tela Atendimentos);
* `atualizar(id, mudancas)` com controle otimista por `updated_at`.

DadosRouter: tabela lógica `atendimentos` → `encounters` (sem tradução
de campos). Sem sessão (localhost, desenvolvimento) cai em DadosLocais.

## 7. Datas e fuso

`occurred_at` é instante absoluto. O app monta a data/hora escolhida na
tela como "parede" no fuso de `profiles.fuso` (padrão
`America/Sao_Paulo`) e grava o `timezone` escolhido. A exibição converte
de volta para o mesmo fuso. Testes cobrem a ida e a volta.

## 8. O que esta etapa NÃO faz

* Não implementa Anamnese nem Conduta (V1, etapas seguintes). A
  arquitetura já permite: ambas nascerão com `encounter_id` NOT NULL e a
  mesma FK composta. Nenhuma tabela placeholder é criada.
* Não cria as três ferramentas ausentes. Não homologa metodologia. Não
  integra provedor na HOLOS AI. Não muda estados do paciente
  (ativo/inativo). Não congela CHECKs de estado de agendamento/atendimento.
* Não aplica migration em produção. Não faz backfill.
