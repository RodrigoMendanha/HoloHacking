# HoloHacking V1 — Etapa 2 — Atendimento clínico + Anamnese estruturada + Conduta

# Resumo executivo

A Etapa 2 torna o atendimento (`encounters`, Etapa 1) utilizável clinicamente:
nasce a **Anamnese estruturada** (`anamneses`) e a **Conduta** com **acordos**
(`conducts`, `agreements`), ambas pertencentes a um atendimento, em revisões
imutáveis depois de consolidadas, com os estados clínicos do Mestre (§38.1):
rascunho, salvo, revisado. Nenhuma regra metodológica foi criada: a anamnese não
interpreta nem preenche o HOLOSCAN; a conduta não depende de nota, faixa, Índice,
HOLOSCAN completo ou ferramenta; nenhum alerta, limiar, diagnóstico ou adesão é
inventado. Nada foi aplicado em produção; a cadeia completa de migrations foi
validada em BEGIN/ROLLBACK no banco real (26 checagens), e a validação apanhou dois
defeitos da migration que foram corrigidos antes do fechamento.

# Baseline

| Item | Valor |
|---|---|
| Branch inicial | `claude/v1-etapa1-atendimentos` |
| HEAD inicial | `bef728ae951804edb668ce11765b5d9aa3a0c0f0` |
| Suíte inicial | 83 suítes · 2523 asserções · 0 falhas (`scratchpad/baseline-etapa2.log`) |
| Branch de trabalho | `claude/v1-etapa2-anamnese-conduta` |

# Arquitetura

`docs/v1/ETAPA2-ARQUITETURA-ANAMNESE-CONDUTA.md` (escrito antes da migration):
encounter → anamneses (revisões) · encounter → conducts (revisões) → agreements.
Identidade por UUID; `(encounter_id, revision_number)` único; autoria =
`nutritionist_id` (dono/RLS) + `reviewed_by` (quem conferiu, `auth.uid()` no
servidor); data clínica = `encounters.occurred_at`; `created_at/updated_at` são
de registro; **vigente** = maior revisão `salvo`/`revisado` (rascunho nunca).

# Anamnese

* Tabela `anamneses`: `encounter_id NOT NULL`, FK composta
  `(encounter_id, patient_id, nutritionist_id) → encounters`; `revision_number`,
  `status` (CHECK rascunho|salvo|revisado), `content_version`, `content JSONB`
  (CHECK `validar_conteudo_anamnese`), `source_anamnesis_id` (FK composta,
  mesmo paciente), `copied_from_previous`, `supersedes_id`, `superseded_at`,
  `revision_note`, `reviewed_at`, `reviewed_by`, `operation_id`.
* Domínios do Mestre §9 (18, sem questionário fechado): motivo e objetivo,
  história alimentar, rotina e acesso, sono, atividade física, sintomas relatados,
  condições e diagnósticos informados, medicamentos, suplementos, alergias
  informadas, intolerâncias informadas, antecedentes, contexto familiar, contexto
  social, avaliações, medidas, emocional (opcional), sentido pessoal (opcional).
* Cada item: `estado` ∈ {informado, negado_explicitamente, desconhecido,
  nao_investigado, nao_aplicavel, recusado} e `origem` ∈ {relato_paciente,
  observacao_profissional, documento_externo, dado_medido} — **obrigatórios no
  servidor** (item sem estado/origem é recusado; item ausente/valor vazio não é
  negação). Diagnóstico informado leva o selo "informado, não confirmado" e sai
  assim no contexto. Nenhum valor padrão para peso, altura, alergia, intolerância,
  diagnóstico ou condição.
* Medidas: `{valor, unidade, data, metodo, responsavel}`; valor sem unidade é
  recusado (tela e servidor); nenhuma conversão.
* Estados: rascunho (editável, retomável, uma linha), salvo (aceito pelo servidor;
  só então a tela diz "Salvo"; falha de rede → "Não foi possível salvar", registro
  continua rascunho), revisado (salvo + `reviewed_by` carimbado pelo servidor).
* Cópia da anterior: ação explícita "Criar a partir da anamnese anterior" →
  RPC `criar_anamnese_a_partir_de`: itens marcados `previo: true` com
  `fonte_anamnese_id`; origem original visível; `source_anamnesis_id`;
  nunca para outro paciente; nunca toca `holoscan_*` (testado).
* Revisões: corrigir uma salva/revisada cria linha nova (`revision_number + 1`,
  `supersedes_id`); a anterior fica intacta e recebe `superseded_at` **só quando a
  correção é consolidada** (um rascunho de correção não substitui a vigente).
  Trigger `proteger_revisao_consolidada` recusa qualquer outro UPDATE.
* UI (`anamnese.js`, aba "Anamnese", antes de HOLOSCAN): exige atendimento ativo
  ("Selecione ou inicie um atendimento para registrar a anamnese."); mostra
  paciente, atendimento, estado do salvamento, revisão vigente e histórico de
  revisões; domínios recolhíveis; itens com estado, origem e medida; "Iniciar
  anamnese", "Criar a partir da anterior", "Salvar rascunho", "Salvar", "Corrigir
  (nova revisão)", "Marcar como revisada".

# Conduta

* Tabela `conducts`: `encounter_id NOT NULL` + FK composta; `revision_number`,
  `status`; `priorities JSONB`, `objective`, `nutrition_strategy`, `actions`,
  `resources`, `related_tools JSONB`, `requested_exams`, `referrals`,
  `monitoring`, `return_plan`, `observations`, `nutrition_diagnosis`,
  `dietary_prescription`, `professional_guidance`, `references JSONB`,
  `previous_conduct_id` (FK composta), `previous_decision` (CHECK
  continuar|substituir|encerrar), `previous_decision_note`, `supersedes_id`,
  `superseded_at`, `revision_note`, `reviewed_at`, `reviewed_by`, `operation_id`.
  Nenhum campo obrigatório; nenhuma exigência de score, HOLOSCAN ou ferramenta
  (testado: conduta salva com zero HOLOSCAN e zero ferramentas).
* Referências por ID (`holoscan_application_ids`, `tool_application_ids`,
  `lab_collection_ids`, `document_ids`, `previous_encounter_ids`) validadas pelo
  trigger `validar_referencias_conduta` contra o mesmo paciente/profissional.
* Revisão: mesma regra da anamnese; `revision_note` registra o que foi mantido,
  alterado ou encerrado; acordos da revisão anterior ficam como estavam.
* UI (`conduta.js`, aba "Conduta", depois de Ferramentas/Documentos): exige
  atendimento ativo; campos opcionais; ferramentas relacionadas (catálogo);
  referências por checkbox; acordos; rascunho/salvo/revisado; revisões.

# Acordos

`agreements`: `conduct_id NOT NULL` + FK composta `(conduct_id, patient_id,
nutritionist_id) → conducts`; `description` (obrigatória, não vazia),
`responsible`, `due_text` (prazo ou ocasião), `follow_up`, `status` (CHECK
proposto|acordado|em_acompanhamento|concluido|revisto|encerrado), `status_note`,
`status_changed_at` (carimbado pelo trigger quando o estado muda), `position`,
`origin_agreement_id` (FK composta), `operation_id`. Estado muda **só por ação
explícita** (botão + confirmação + nota); nenhum score de adesão; nada muda com o
tempo. DELETE só de acordo de conduta em rascunho (policy); em conduta
consolidada nada se apaga.

# Retorno

Ao abrir um atendimento com conduta vigente num atendimento anterior do paciente,
a aba Conduta mostra "Conduta anterior (retorno)": objetivo, retorno planejado,
observações e acordos com estados (mutáveis por ação explícita). Na nova conduta
a profissional decide **continuar / substituir / encerrar** com justificativa
(`previous_decision`, `previous_decision_note`, `previous_conduct_id`); "Levar
acordos para esta conduta" copia como `proposto` com `origin_agreement_id`. Nada é
transportado automaticamente; nenhum acordo é marcado cumprido.

# Atendimento ativo, Visão geral, Timeline, Dashboard

* `anamnese.js` e `conduta.js` lêem `AtendimentoAtual.atual()`; `aoMudar`
  recarrega o atendimento correto; troca de paciente limpa o contexto (testado).
* Visão geral: bloco "Atendimento clínico" — último atendimento, anamnese (estado
  da vigente ou "rascunho (não consolidada)"), conduta vigente (nunca rascunho),
  retorno previsto, acordos, próxima consulta marcada; atalhos Anamnese → HOLOSCAN →
  Conduta.
* Timeline: "Anamnese salva", "Conduta salva"; revisões como "Revisão da … (rev. n)"
  (correção documental, não evento clínico novo); acordo com mudança de estado;
  data clínica = do atendimento, data de registro no detalhe; filtros "Anamnese" e
  "Conduta"; rascunho não entra.
* Dashboard: bloco operacional "Atendimentos sem conduta salva" (rascunho conta
  como sem conduta); nenhum número alimentado por rascunho/prévia.

# HOLOS AI

Sem provedor. Contexto bruto ganha "Anamnese (salva/revisada, texto da
profissional)" e "Conduta e acordos (salvos/revisados)" do atendimento
selecionado (ou do último com registro): só revisão vigente, com estado e origem
de cada item, "informado, não confirmado" nos diagnósticos relatados. Rascunho
não entra (testado); não existe texto assistido; nenhuma metodologia não
homologada (testado).

# Exportação

`anamneses` e `condutas` (com `acordos`) por revisão: IDs, `revision_number`,
`status`, `registro_oficial` (false para rascunho) e `rotulo` ("RASCUNHO — não
consolidado"), `content`/campos, `supersedes_id`, `superseded_at`, `source_anamnesis_id`,
`previous_decision`, `reviewed_at/by`, `created_at/updated_at`. Sem segredos.

# Integridade e segurança

RLS SELECT/INSERT/UPDATE só `nutritionist_id = auth.uid()`; `anon` revogado;
RPCs `salvar_anamnese`, `criar_anamnese_a_partir_de`, `salvar_conduta`
SECURITY INVOKER; FKs compostas em todas as relações (paciente A nunca recebe
registro de encounter/conduta de B — testado nas três tabelas); trigger
`bloquear_escrita_paciente_arquivado` nas três (inativo não recebe anamnese nem
conduta — testado); exclusão de paciente: `contarRegistros`/`temHistorico` contam
anamneses e condutas (paciente só com anamnese em rascunho não é "vazio" —
testado). Idempotência por `operation_id` (anamnese, conduta e acordo; retry não
duplica — testado). Concorrência: `expected_updated_at` nas RPCs e `updated_at` no
UPDATE de acordo (conflito → recusa, tela mostra "Alterada em outro lugar").

# Migrations

| Migration | Estado |
|---|---|
| 20260930130000 / 140000 / 150000 / 160000 | pendentes (Etapas 0 e 1), não reescritas |
| **20260930170000_etapa2_anamnese_conduta** | nova, pendente |

Nenhuma aplicada em produção.

# Supabase rollback

Projeto `sllhyymeeyoozokgbnuv`, uma transação: `BEGIN` → 130000 → 140000 → 150000 →
160000 → 170000 → testes como `authenticated` → `ROLLBACK`. Primeira rodada: 24 de 26
checagens ok; **T11** (item sem estado aceito — `NULL = any()` não é falso) e
**T12** (cópia sem itens — `jsonb_set` não cria o nível intermediário) falharam,
foram corrigidas na migration e no commit `fix(db)`; rodada final com a migration
definitiva: **26 de 26 ok** (T1–T17 da Onda 30 mais extras: imutabilidade,
`reviewed_by` do servidor, rascunho de correção não substitui a vigente, estado de
acordo inválido recusado, DELETE sem efeito, referência cruzada recusada, leitura
de outro profissional vazia). Checagem posterior: tabelas novas 0, colunas novas
0, funções novas 0, triggers novos 0, pacientes de teste 0, CHECK da 130000 0,
`salvar_holoscan_completo` sem `encounter_id`. **Nada persistiu.**

# Testes

| Medida | Baseline | Final |
|---|---|---|
| Suítes | 83 | **85** (+2) |
| Asserções | 2523 | **2605** (+82) |
| Falhas | 0 | **0** |

Novas: `testar-v1-etapa2-banco.mjs` (37 asserções; os 15 itens da Onda 30 mais
extras, contra o Supabase falso que espelha a migration) e `testar-v1-etapa2.mjs`
(45 asserções; os 16 comportamentos da Onda 31: sem atendimento não salva; troca
de paciente/atendimento; salvar só após servidor; cópia explícita como prévia;
HOLOSCAN intocado; vazio ≠ negado; diagnóstico informado rotulado; conduta
anterior no retorno; acordo não muda sozinho; revisão preserva anterior; rascunho
fora do dashboard e da HOLOS AI; exportação distingue revisões; exclusão). Ajustes
em suítes existentes: 40 scripts (`testar-storage-manifest`), nove abas
(`testar-arquivos`). Logs: `scratchpad/baseline-etapa2.log`,
`scratchpad/final-etapa2.log`.

# Docker

Build no HEAD final (`--build-arg COMMIT=$(git rev-parse HEAD)`), container local,
HTTP 200 em `/`, app.js, ficha.js, atendimento.js, anamnese.js, conduta.js,
holos-ai.js, version.json e demais; `version.json.commit == HEAD`;
`conferir-producao.sh` contra os 42 hashes do `docs/deploy.md §3.5`. Resultado
registrado na resposta final da etapa. Nenhum deploy.

# Pendências

1. Texto assistido (IA) — não existe; quando existir, entra como proposta
   identificada e só vira prontuário após confirmação.
2. Vocabulário fechado de `type`/`modality` do atendimento e eventuais campos
   fechados da anamnese — texto livre por ora (sem questionário fechado).
3. Exclusão completa de paciente × anamneses/condutas/acordos (sem DELETE) —
   decisão herdada da Etapa 1.
4. Modo local (sem sessão): anamneses/condutas só em memória, fora do manifesto e
   do backup (desenvolvimento).
5. Evolução completa, relatórios/emissões, Pacote Metodológico, 45 exames,
   Leitura Integrada final, ferramentas ausentes, estados do paciente — fora.
6. Pendências herdadas das Etapas 0 e 1.

# Prontidão para Etapa 3

Com atendimento, anamnese, conduta e acordos persistidos e revisionados, a
Evolução (Mestre §31) pode ler fontes lado a lado por atendimento; relatórios
podem citar revisões emitidas. Bloqueadores técnicos: nenhum. A aplicação das cinco
migrations pendentes em produção aguarda revisão humana.
