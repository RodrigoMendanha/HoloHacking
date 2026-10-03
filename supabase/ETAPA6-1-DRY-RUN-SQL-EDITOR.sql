-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.1 — DRY-RUN DA CADEIA PENDENTE PARA O SQL EDITOR DO SUPABASE
-- ============================================================================
-- Projeto alvo: Holohacking (sllhyymeeyoozokgbnuv). Conferir o projeto no topo do SQL Editor ANTES de executar.
-- Este arquivo tem DOIS blocos. Execute o PRIMEIRO BLOCO inteiro (selecione tudo ate o ROLLBACK) numa unica
-- execucao: ele abre a transacao, aplica as 14 migrations pendentes (20260930130000 .. 20261002130000) em ordem,
-- roda as checagens da Etapa 6.1 e termina OBRIGATORIAMENTE com ROLLBACK. Nada persiste.
-- Resultado esperado do primeiro bloco: uma linha "relatorio" (JSON) com as checagens {k, ok, d}; todas com ok = true.
-- Se qualquer statement falhar, a transacao inteira e abortada e nada persiste (nao ha confirmacao em lugar nenhum).
-- Dados sinteticos (3 auth.users ficticios, 2 aprovadores TEST_FIXTURE_E61, 1 paciente "E61 SINTETICO", 1 pacote,
-- aplicacoes, coletas e leituras) existem SO dentro da transacao. Nenhum dado real e alterado; aplicacoes historicas
-- sao apenas CONTADAS; supabase_migrations.schema_migrations nao e tocada; nenhum backfill; nenhum aprovador real.
-- Depois do primeiro bloco, execute o SEGUNDO BLOCO (somente SELECTs) para provar que nada persistiu.
-- ============================================================================

-- ============================================================================
-- PRIMEIRO BLOCO — BEGIN ... ROLLBACK (executar de uma vez, do BEGIN ao ROLLBACK)
-- ============================================================================
BEGIN;
set local lock_timeout = '3s';
set local statement_timeout = '110s';
set local idle_in_transaction_session_timeout = '30s';

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930130000_holoscan_ausencia_null.sql
-- ---------------------------------------------------------------------------
-- Rodada 08, onda 1 — HOLOSCAN: ausencia de dado e null, nunca 10.
--
-- O motor devolve, para sistema sem nenhuma resposta, nota 10 com
-- avaliavel = false, e, para eixo da Triada sem resposta, 10 com
-- triada_com_dado[eixo] = false. O 10 e artefato da conta (10 - carga 0),
-- nao sinal de saude. Gravado assim, qualquer leitor que olhe so o numero
-- (ficha, exportacao, contexto da HOLOS AI, relatorio SQL) le "equilibrio"
-- onde nao houve resposta.
--
-- O que muda:
-- 1. holoscan_system_scores: nota, carga e faixa aceitam NULL, e um CHECK
--    exige coerencia com avaliavel (sem dado = NULL; com dado = preenchido).
--    O CHECK entra NOT VALID: linhas ja gravadas nao sao reescritas nem
--    recusadas (rastreabilidade); so as novas precisam obedecer. Em 30-set a
--    tabela estava vazia.
-- 2. salvar_holoscan_completo normaliza no servidor, qualquer que seja o
--    cliente: score com avaliavel = false grava nota/carga/faixa NULL, e o
--    eixo da Triada com triada_com_dado = false grava null. Por isso esta
--    migration e compativel com o front antigo (que manda 10) e com o novo
--    (que ja manda null).
--
-- Nao muda: motor, pesos, calculo, Indice, RLS, grants, assinatura da RPC.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

ALTER TABLE public.holoscan_system_scores
  ALTER COLUMN nota  DROP NOT NULL,
  ALTER COLUMN carga DROP NOT NULL,
  ALTER COLUMN faixa DROP NOT NULL;

ALTER TABLE public.holoscan_system_scores
  ADD CONSTRAINT holoscan_system_scores_sem_dado_coerente CHECK (
    (avaliavel AND nota IS NOT NULL AND carga IS NOT NULL AND faixa IS NOT NULL)
    OR (NOT avaliavel AND nota IS NULL AND carga IS NULL AND faixa IS NULL)
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record;
  triada_norm jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
  -- Eixo da Triada sem resposta (triada_com_dado = false) grava null, nao 10.
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid, (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    COALESCE(app_data->'combinacoes','[]'::jsonb),
    COALESCE(app_data->'aprofundamentos','[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END
  ) RETURNING id INTO app_id;
  FOR r IN SELECT * FROM jsonb_array_elements(ans_data) AS elem LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.value->>'marcador_id', (r.value->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(sc_data) AS elem LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.value->>'sistema', r.value->>'nome',
      -- sistema sem nenhuma resposta: sem nota, sem carga, sem faixa
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'nota')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'carga')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN r.value->>'faixa' END,
      (r.value->>'obtido')::numeric, (r.value->>'maximo')::numeric,
      (r.value->>'respondidos')::integer, (r.value->>'total_marcadores')::integer,
      (r.value->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930140000_exames_identidade_coleta.sql
-- ---------------------------------------------------------------------------
-- Rodada 08, onda 2 — reescrita na Etapa 0 da V1 (reconciliacao com o
-- Documento Mestre). NAO APLICADA em producao ate esta data.
--
-- EXAMES: identidade da coleta e o ID, nunca (paciente + data).
--
-- Documento Mestre, secoes 22, 34.2 e 43.2: "Duas coletas na mesma data tem
-- IDs independentes"; "Coletas nao usam apenas paciente mais data como
-- identidade"; "Editar uma coleta e diferente de criar outra".
--
-- A RPC salvar_coleta_exames em producao (fase6 + fix_rpc_record_value)
-- faz UPSERT por (nutritionist_id, patient_id, coletado_em): uma segunda
-- coleta na mesma data substitui a primeira e APAGA os resultados dela. A
-- versao anterior desta migration (Rodada 08) trocava isso por uma RECUSA
-- ("coleta ja existe nesta data") no modo "nova" — tambem contraria ao
-- Mestre, porque continuava tratando a data como identidade.
--
-- O que esta versao faz:
--   * collection.id presente  -> EDITAR aquela coleta (tem de ser do
--                                 nutricionista autenticado; senao RAISE);
--                                 atualiza data/laboratorio/observacao e
--                                 TROCA os resultados dela;
--   * collection.id ausente   -> INSERIR uma coleta nova, sempre, mesmo que
--                                 ja exista outra na mesma data.
--   * collection.modo e aceito e ignorado (compatibilidade com o front da
--     Rodada 08); a identidade vem so do id.
--   * nenhuma busca por data; nenhuma recusa por data.
--
-- O que NAO esta aqui (de proposito): a regra "data da coleta nao pode ser
-- futura" da Rodada 08. Ela nao e contrato do Mestre e foi separada em
-- supabase/migrations-pendentes/PENDENTE_lab_collections_data_nao_futura.sql,
-- pendente de decisao de produto/clinica.
--
-- Nao muda: tabelas, colunas, RLS, grants, assinatura da RPC.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

CREATE OR REPLACE FUNCTION public.salvar_coleta_exames(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  col_id    uuid;
  col_data  jsonb := payload->'collection';
  res_data  jsonb := payload->'results';
  uid       uuid  := auth.uid();
  pid       uuid;
  dt        date;
  desconhecida boolean;
  r         record;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;

  if col_data is null or res_data is null then
    raise exception 'payload incompleto: collection e results sao obrigatorios';
  end if;

  pid := (col_data->>'patient_id')::uuid;
  desconhecida := coalesce((col_data->>'data_coleta_desconhecida')::boolean, false);

  if desconhecida then
    dt := null;
  else
    dt := (col_data->>'coletado_em')::date;
    if dt is null then
      raise exception 'coleta com data: informe coletado_em, ou marque data_coleta_desconhecida';
    end if;
  end if;

  -- Etapa 0: identidade da coleta e o id. Com id, EDITA aquela coleta; sem
  -- id, INSERE uma nova. Nunca procura coleta por (paciente, data).
  if col_data->>'id' is not null then
    col_id := (col_data->>'id')::uuid;

    -- a coleta tem de existir e ser do nutricionista autenticado
    perform 1 from public.lab_collections c
      where c.id = col_id and c.nutritionist_id = uid and c.patient_id = pid;
    if not found then
      raise exception 'coleta % nao encontrada para este paciente', col_id using errcode = 'P0002';
    end if;

    update public.lab_collections
       set coletado_em = dt,
           data_coleta_desconhecida = desconhecida,
           laboratorio = col_data->>'laboratorio',
           observacao  = col_data->>'observacao'
     where id = col_id;

    -- editar = trocar os resultados DESTA coleta
    delete from public.lab_results where collection_id = col_id;
  else
    insert into public.lab_collections (
      nutritionist_id, patient_id, coletado_em,
      data_coleta_desconhecida, laboratorio, observacao
    )
    values (
      uid, pid, dt, desconhecida,
      col_data->>'laboratorio', col_data->>'observacao'
    )
    returning id into col_id;
  end if;

  for r in select * from jsonb_array_elements(res_data) as elem
  loop
    insert into public.lab_results (
      collection_id, exame_id, valor,
      unidade_no_momento, ideal_min_no_momento, ideal_max_no_momento,
      nome_exame_no_momento, sistema_no_momento
    )
    values (
      col_id,
      r.value->>'exame_id',
      (r.value->>'valor')::numeric,
      r.value->>'unidade_no_momento',
      (r.value->>'ideal_min_no_momento')::numeric,
      (r.value->>'ideal_max_no_momento')::numeric,
      r.value->>'nome_exame_no_momento',
      r.value->>'sistema_no_momento'
    );
  end loop;

  return col_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930150000_paciente_arquivado_bloqueia_escrita.sql
-- ---------------------------------------------------------------------------
-- Rodada 08, onda 4 — PACIENTE ARQUIVADO: o servidor recusa escrita clinica.
--
-- Arquivado (patients.status = 'inativo') pode ser lido, exportado e
-- reativado. Nao recebe: consulta nova ou editada, HOLOSCAN (nem
-- interpretacao), coleta de exames, resultado de exame, aplicacao de
-- ferramenta, documento. O front ja barra; isto e a mesma regra no banco,
-- valendo para qualquer cliente.
--
-- Como: um trigger BEFORE INSERT OR UPDATE nas tabelas clinicas. As RPCs
-- salvar_holoscan_completo, salvar_holoscope_completo e salvar_coleta_exames
-- gravam nessas tabelas, entao RAISE tambem por elas — sem redefinir as
-- RPCs. A escrita direta (tool_applications, documents, consultations, a
-- coleta sem data em lab_collections/lab_results) cai no mesmo trigger.
--
-- Nao muda: RLS, policies, grants, colunas, RPCs. DELETE nao e barrado (a
-- exclusao do paciente e dos registros dele segue as regras dela). Reativar
-- (UPDATE em patients) nao passa por aqui.
--
-- A funcao e SECURITY DEFINER so para LER o status do paciente; o search_path
-- e vazio e todo nome e qualificado. Ninguem a executa direto (revoke).

create or replace function public.bloquear_escrita_paciente_arquivado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pid uuid;
  v_status text;
begin
  if tg_table_name = 'lab_results' then
    select c.patient_id into v_pid from public.lab_collections c where c.id = new.collection_id;
  else
    v_pid := new.patient_id;
  end if;
  if v_pid is null then
    return new;
  end if;
  select p.status into v_status from public.patients p where p.id = v_pid;
  if v_status = 'inativo' then
    raise exception 'paciente arquivado: reative antes de registrar novas informacoes'
      using errcode = 'P0001', hint = 'paciente_arquivado';
  end if;
  return new;
end;
$$;

revoke all on function public.bloquear_escrita_paciente_arquivado() from public, anon, authenticated;

drop trigger if exists consultations_paciente_arquivado on public.consultations;
create trigger consultations_paciente_arquivado
  before insert or update on public.consultations
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists holoscan_applications_paciente_arquivado on public.holoscan_applications;
create trigger holoscan_applications_paciente_arquivado
  before insert or update on public.holoscan_applications
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists lab_collections_paciente_arquivado on public.lab_collections;
create trigger lab_collections_paciente_arquivado
  before insert or update on public.lab_collections
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists lab_results_paciente_arquivado on public.lab_results;
create trigger lab_results_paciente_arquivado
  before insert or update on public.lab_results
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists tool_applications_paciente_arquivado on public.tool_applications;
create trigger tool_applications_paciente_arquivado
  before insert or update on public.tool_applications
  for each row execute function public.bloquear_escrita_paciente_arquivado();

drop trigger if exists documents_paciente_arquivado on public.documents;
create trigger documents_paciente_arquivado
  before insert or update on public.documents
  for each row execute function public.bloquear_escrita_paciente_arquivado();

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930160000_etapa1_atendimentos.sql
-- ---------------------------------------------------------------------------
-- V1, Etapa 1 — FUNDACAO DE DADOS: AGENDA (agendamento) x ATENDIMENTO clinico.
-- NAO APLICADA em producao ate esta data. Entra DEPOIS das pendentes da
-- Etapa 0 (20260930130000, 20260930140000, 20260930150000), que nao sao
-- reescritas aqui.
--
-- O que muda (ver docs/v1/ETAPA1-ARQUITETURA-ATENDIMENTOS.md):
--   1. consultations continua sendo o AGENDAMENTO. Ganha cancelamento sem
--      DELETE (cancelled_at, cancellation_reason) e proveniencia de
--      reagendamento (rescheduled_from_id, rescheduled_to_id).
--   2. encounters e a entidade nova do ATENDIMENTO CLINICO: paciente,
--      profissional, data/hora clinica (occurred_at + timezone), agendamento
--      de origem OPCIONAL e operation_id para idempotencia.
--   3. holoscan_applications, tool_applications e lab_collections ganham
--      encounter_id (NULL para o historico; nenhum backfill por data), com
--      FK composta: registro do paciente A nunca aponta para atendimento
--      do paciente B nem de outro profissional.
--   4. RPCs criar_atendimento (idempotente por operation_id) e
--      reagendar_consulta (atomica, preserva o original). Ambas SECURITY
--      INVOKER: a RLS continua decidindo o que cada profissional ve.
--   5. salvar_holoscan_completo passa a aceitar application.encounter_id
--      (mantendo a normalizacao de ausencia da migration 130000).
--   6. proteger_snapshot_holoscan passa a tratar encounter_id como imutavel:
--      aplicacao consolidada nao e reassociada a outro atendimento.
--
-- Nao muda: RLS e policies existentes, estados do paciente, CHECKs de tipo
-- de consulta, snapshot do HOLOSCAN, identidade da coleta. Nenhum DELETE,
-- nenhum UPDATE em dado existente.

-- ============================================================================
-- 1. CONSULTATIONS — cancelar e reagendar sem apagar
-- ============================================================================

alter table public.consultations
  add column if not exists cancelled_at        timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists rescheduled_from_id uuid,
  add column if not exists rescheduled_to_id   uuid;

alter table public.consultations
  add constraint consultations_rescheduled_from_fk
    foreign key (rescheduled_from_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (rescheduled_from_id);

alter table public.consultations
  add constraint consultations_rescheduled_to_fk
    foreign key (rescheduled_to_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (rescheduled_to_id);

create index if not exists consultations_cancelled_idx
  on public.consultations (nutritionist_id, cancelled_at)
  where cancelled_at is not null;

-- ============================================================================
-- 2. ENCOUNTERS — o atendimento clinico
-- ============================================================================

create table public.encounters (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid()
                     references auth.users(id),
  patient_id       uuid not null,
  consultation_id  uuid,
  occurred_at      timestamptz not null,
  timezone         text,
  type             text,
  modality         text,
  status           text,
  summary_text     text,
  operation_id     uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint encounters_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict,

  -- atendimento do paciente A nunca aponta para agendamento do paciente B
  -- (nem de outro profissional): a FK e composta.
  constraint encounters_consultation_fk
    foreign key (consultation_id, patient_id, nutritionist_id)
    references public.consultations (id, patient_id, nutritionist_id)
    on delete set null (consultation_id),

  -- alvo das FKs compostas das tabelas clinicas
  constraint encounters_id_patient_nutritionist_unique
    unique (id, patient_id, nutritionist_id)
);

create index encounters_nutritionist_occurred_idx
  on public.encounters (nutritionist_id, occurred_at desc);
create index encounters_patient_idx
  on public.encounters (patient_id, occurred_at desc);
create index encounters_consultation_idx
  on public.encounters (consultation_id)
  where consultation_id is not null;

-- idempotencia: a mesma operacao, repetida, nao vira dois atendimentos
create unique index encounters_operation_unique
  on public.encounters (nutritionist_id, operation_id)
  where operation_id is not null;

drop trigger if exists encounters_tocar_updated_at on public.encounters;
create trigger encounters_tocar_updated_at
  before update on public.encounters
  for each row execute function public.tocar_updated_at();

-- paciente arquivado nao recebe atendimento (mesma funcao da migration 150000)
drop trigger if exists encounters_paciente_arquivado on public.encounters;
create trigger encounters_paciente_arquivado
  before insert or update on public.encounters
  for each row execute function public.bloquear_escrita_paciente_arquivado();

alter table public.encounters enable row level security;

create policy encounters_select_proprios
  on public.encounters for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy encounters_insert_proprios
  on public.encounters for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy encounters_update_proprios
  on public.encounters for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

-- sem policy de DELETE: atendimento nao e apagado nesta etapa.

revoke all on table public.encounters from public, anon;
grant select, insert, update on table public.encounters to authenticated;

-- ============================================================================
-- 3. VINCULO CLINICO NOVO: encounter_id nas tabelas clinicas
-- ============================================================================
-- NULL para tudo o que ja existe. Nenhum backfill: deduzir por data seria
-- afirmar um atendimento que ninguem registrou.

alter table public.holoscan_applications
  add column if not exists encounter_id uuid;
alter table public.holoscan_applications
  add constraint holoscan_applications_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id)
    on delete restrict;
create index if not exists holoscan_applications_encounter_idx
  on public.holoscan_applications (encounter_id) where encounter_id is not null;

alter table public.tool_applications
  add column if not exists encounter_id uuid;
alter table public.tool_applications
  add constraint tool_applications_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id)
    on delete restrict;
create index if not exists tool_applications_encounter_idx
  on public.tool_applications (encounter_id) where encounter_id is not null;
-- consultation_id continua: vinculo LEGADO com o agendamento (nao apagado,
-- nao backfilled). encounter_id e o vinculo clinico da V1.

alter table public.lab_collections
  add column if not exists encounter_id uuid;
alter table public.lab_collections
  add constraint lab_collections_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id)
    on delete restrict;
create index if not exists lab_collections_encounter_idx
  on public.lab_collections (encounter_id) where encounter_id is not null;

-- ============================================================================
-- 4. RPC criar_atendimento — idempotente por operation_id
-- ============================================================================
-- SECURITY INVOKER: insere como o proprio profissional autenticado; a RLS
-- e as FKs compostas continuam valendo. payload:
--   { patient_id, consultation_id?, occurred_at, timezone?, type?,
--     modality?, status?, summary_text?, operation_id? }
-- Devolve o id. Com operation_id repetido devolve o atendimento ja criado
-- (e recusa se ele for de outro paciente).

create or replace function public.criar_atendimento(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid     uuid := auth.uid();
  v_pid   uuid;
  v_op    uuid;
  v_id    uuid;
  v_outro uuid;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;
  if payload is null or payload->>'patient_id' is null or payload->>'occurred_at' is null then
    raise exception 'payload incompleto: patient_id e occurred_at sao obrigatorios';
  end if;
  v_pid := (payload->>'patient_id')::uuid;
  v_op  := nullif(payload->>'operation_id', '')::uuid;

  if v_op is not null then
    select e.id, e.patient_id into v_id, v_outro
      from public.encounters e
     where e.nutritionist_id = uid and e.operation_id = v_op;
    if v_id is not null then
      if v_outro <> v_pid then
        raise exception 'operation_id ja usado em atendimento de outro paciente'
          using errcode = 'P0001', hint = 'operation_id_conflito';
      end if;
      return v_id;
    end if;
  end if;

  begin
    insert into public.encounters (
      nutritionist_id, patient_id, consultation_id, occurred_at, timezone,
      type, modality, status, summary_text, operation_id
    ) values (
      uid, v_pid,
      nullif(payload->>'consultation_id', '')::uuid,
      (payload->>'occurred_at')::timestamptz,
      nullif(payload->>'timezone', ''),
      nullif(payload->>'type', ''),
      nullif(payload->>'modality', ''),
      nullif(payload->>'status', ''),
      nullif(payload->>'summary_text', ''),
      v_op
    ) returning id into v_id;
  exception when unique_violation then
    -- a mesma operacao chegou duas vezes ao mesmo tempo: fica a que venceu
    if v_op is null then raise; end if;
    select e.id into v_id from public.encounters e
     where e.nutritionist_id = uid and e.operation_id = v_op;
    if v_id is null then raise; end if;
  end;
  return v_id;
end;
$$;

revoke all on function public.criar_atendimento(jsonb) from public, anon;
grant execute on function public.criar_atendimento(jsonb) to authenticated;

-- ============================================================================
-- 5. RPC reagendar_consulta — atomica, preserva o original
-- ============================================================================
-- Cria o agendamento novo (rescheduled_from_id = original) e marca o original
-- como cancelado com rescheduled_to_id = novo. Nunca DELETE + INSERT.
-- Um agendamento ja cancelado ou ja reagendado nao e reagendado de novo.

create or replace function public.reagendar_consulta(
  p_consultation_id uuid,
  p_data date,
  p_hora time,
  p_duracao_min integer default null,
  p_tipo text default null,
  p_nota text default null,
  p_motivo text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid  uuid := auth.uid();
  orig public.consultations%rowtype;
  novo uuid;
begin
  if uid is null then
    raise exception 'nao autenticado';
  end if;
  if p_data is null or p_hora is null then
    raise exception 'informe a nova data e a nova hora';
  end if;
  select * into orig from public.consultations c
   where c.id = p_consultation_id and c.nutritionist_id = uid
   for update;
  if not found then
    raise exception 'consulta % nao encontrada', p_consultation_id using errcode = 'P0002';
  end if;
  if orig.cancelled_at is not null or orig.rescheduled_to_id is not null then
    raise exception 'consulta ja cancelada ou reagendada; reagende a consulta vigente'
      using errcode = 'P0001', hint = 'consulta_encerrada';
  end if;

  insert into public.consultations (
    nutritionist_id, patient_id, data, hora, duracao_min, tipo, nota, rescheduled_from_id
  ) values (
    uid, orig.patient_id, p_data, p_hora,
    coalesce(p_duracao_min, orig.duracao_min),
    coalesce(nullif(p_tipo, ''), orig.tipo),
    coalesce(p_nota, orig.nota),
    orig.id
  ) returning id into novo;

  update public.consultations
     set cancelled_at = now(),
         cancellation_reason = coalesce(nullif(p_motivo, ''), 'reagendada'),
         rescheduled_to_id = novo
   where id = orig.id;

  return novo;
end;
$$;

revoke all on function public.reagendar_consulta(uuid, date, time, integer, text, text, text) from public, anon;
grant execute on function public.reagendar_consulta(uuid, date, time, integer, text, text, text) to authenticated;

-- ============================================================================
-- 6. salvar_holoscan_completo aceita application.encounter_id
-- ============================================================================
-- Mesmo corpo da migration 20260930130000 (ausencia -> null) mais a coluna
-- encounter_id (NULL quando o payload nao a traz: compatibilidade com o
-- front antigo). A FK composta recusa atendimento de outro paciente.
-- CREATE OR REPLACE preserva dono, SECURITY DEFINER e privilegios.

CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record;
  triada_norm jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid,
    NULLIF(app_data->>'encounter_id', '')::uuid,
    (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    COALESCE(app_data->'combinacoes','[]'::jsonb),
    COALESCE(app_data->'aprofundamentos','[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END
  ) RETURNING id INTO app_id;
  FOR r IN SELECT * FROM jsonb_array_elements(ans_data) AS elem LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.value->>'marcador_id', (r.value->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(sc_data) AS elem LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.value->>'sistema', r.value->>'nome',
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'nota')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'carga')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN r.value->>'faixa' END,
      (r.value->>'obtido')::numeric, (r.value->>'maximo')::numeric,
      (r.value->>'respondidos')::integer, (r.value->>'total_marcadores')::integer,
      (r.value->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;

-- ============================================================================
-- 7. encounter_id do HOLOSCAN e imutavel depois de consolidado
-- ============================================================================
-- A FK composta impede vincular a atendimento de OUTRO paciente; isto impede
-- tambem reassociar, depois de gravado, a outro atendimento do MESMO paciente
-- (ou apagar/colocar o vinculo). Mesmo corpo da funcao da migration
-- 20260923200000 mais a linha de encounter_id. Interpretacao profissional
-- (interpretacao_texto/_em/_versao) continua editavel. Linhas historicas com
-- encounter_id NULL nao sao tocadas: so UPDATE que tente mudar o valor e
-- recusado.

CREATE OR REPLACE FUNCTION public.proteger_snapshot_holoscan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.nutritionist_id       IS DISTINCT FROM old.nutritionist_id
  OR new.patient_id            IS DISTINCT FROM old.patient_id
  OR new.encounter_id          IS DISTINCT FROM old.encounter_id
  OR new.quando                IS DISTINCT FROM old.quando
  OR new.versao_estrutura      IS DISTINCT FROM old.versao_estrutura
  OR new.versao_bancos         IS DISTINCT FROM old.versao_bancos
  OR new.indice                IS DISTINCT FROM old.indice
  OR new.indice_maximo         IS DISTINCT FROM old.indice_maximo
  OR new.avaliavel             IS DISTINCT FROM old.avaliavel
  OR new.nota_media            IS DISTINCT FROM old.nota_media
  OR new.triada                IS DISTINCT FROM old.triada
  OR new.triada_com_dado       IS DISTINCT FROM old.triada_com_dado
  OR new.cobertura             IS DISTINCT FROM old.cobertura
  OR new.combinacoes           IS DISTINCT FROM old.combinacoes
  OR new.aprofundamentos       IS DISTINCT FROM old.aprofundamentos
  THEN
    RAISE EXCEPTION 'campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id); '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  END IF;
  RETURN new;
END;
$$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930170000_etapa2_anamnese_conduta.sql
-- ---------------------------------------------------------------------------
-- V1, Etapa 2 — ANAMNESE ESTRUTURADA e CONDUTA (com acordos), ligadas ao
-- ATENDIMENTO (encounters, Etapa 1). NAO APLICADA em producao. Entra depois de
-- 130000, 140000, 150000 e 160000, que nao sao reescritas.
--
-- Ver docs/v1/ETAPA2-ARQUITETURA-ANAMNESE-CONDUTA.md. Em resumo:
--   * anamneses e conducts: encounter_id NOT NULL, FK composta
--     (encounter_id, patient_id, nutritionist_id) -> encounters; cada REVISAO
--     e uma linha ((encounter_id, revision_number) unico); rascunho e editavel,
--     salvo/revisado e imutavel (corrigir = nova revisao, a anterior fica);
--   * agreements: acordos de cada revisao da conduta, FK composta -> conducts;
--     estados funcionais (proposto ... encerrado), nunca adesao;
--   * conteudo da anamnese em JSONB versionado, validado no servidor (estado e
--     origem obrigatorios em cada item; vazio != negado; medida com unidade);
--   * copia explicita da anamnese anterior (itens marcados como previos);
--   * referencias da conduta validadas contra o mesmo paciente/profissional;
--   * RLS so do dono, anon revogado, sem DELETE (exceto acordo de rascunho),
--     trigger de paciente arquivado, idempotencia por operation_id,
--     RPCs SECURITY INVOKER.
-- Nada metodologico: nenhum peso, faixa, limiar, alerta ou diagnostico.

-- ============================================================================
-- 1. VALIDACAO DO CONTEUDO DA ANAMNESE
-- ============================================================================

create or replace function public.validar_conteudo_anamnese(c jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  dom record; it jsonb; m jsonb;
  dominios text[] := array['motivo_objetivo','historia_alimentar','rotina_acesso','sono',
    'atividade_fisica','sintomas_relatados','condicoes_diagnosticos_informados','medicamentos',
    'suplementos','alergias_informadas','intolerancias_informadas','antecedentes',
    'contexto_familiar','contexto_social','avaliacoes','medidas','emocional','sentido_pessoal'];
  estados text[] := array['informado','negado_explicitamente','desconhecido','nao_investigado','nao_aplicavel','recusado'];
  origens text[] := array['relato_paciente','observacao_profissional','documento_externo','dado_medido'];
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if c->'dominios' is null then return true; end if;              -- anamnese vazia e valida (nada afirmado)
  if jsonb_typeof(c->'dominios') <> 'object' then return false; end if;
  for dom in select key, value from jsonb_each(c->'dominios') loop
    if not (coalesce(dom.key,'') = any(dominios)) then return false; end if;
    if jsonb_typeof(dom.value) <> 'object' or jsonb_typeof(dom.value->'itens') <> 'array' then return false; end if;
    for it in select * from jsonb_array_elements(dom.value->'itens') loop
      if jsonb_typeof(it) <> 'object' then return false; end if;
      -- coalesce: item SEM a chave (NULL) tambem e recusado — NULL = any(...) seria NULL, nao false
      if not (coalesce(it->>'estado','') = any(estados)) then return false; end if;    -- estado OBRIGATORIO: vazio nunca vira "nao"
      if not (coalesce(it->>'origem','') = any(origens)) then return false; end if;    -- origem OBRIGATORIA
      m := it->'medida';
      if m is not null and jsonb_typeof(m) <> 'null' then
        if jsonb_typeof(m) <> 'object' then return false; end if;
        if m->>'valor' is not null and coalesce(m->>'unidade','') = '' then return false; end if;  -- sem unidade padrao
      end if;
    end loop;
  end loop;
  return true;
end;
$$;

-- ============================================================================
-- 2. ANAMNESES
-- ============================================================================

create table public.anamneses (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  encounter_id          uuid not null,
  revision_number       integer not null default 1,
  status                text not null default 'rascunho',
  content_version       integer not null default 1,
  content               jsonb not null default '{}'::jsonb,
  source_anamnesis_id   uuid,
  copied_from_previous  boolean not null default false,
  supersedes_id         uuid,
  superseded_at         timestamptz,
  revision_note         text,
  reviewed_at           timestamptz,
  reviewed_by           uuid references auth.users(id),
  operation_id          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint anamneses_status_valido check (status in ('rascunho','salvo','revisado')),
  constraint anamneses_conteudo_valido check (public.validar_conteudo_anamnese(content)),
  constraint anamneses_revisao_positiva check (revision_number >= 1),
  constraint anamneses_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint anamneses_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id) on delete restrict,
  constraint anamneses_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint anamneses_encounter_revision_unique unique (encounter_id, revision_number),
  constraint anamneses_source_fk
    foreign key (source_anamnesis_id, patient_id, nutritionist_id)
    references public.anamneses (id, patient_id, nutritionist_id) on delete restrict,
  constraint anamneses_supersedes_fk
    foreign key (supersedes_id, patient_id, nutritionist_id)
    references public.anamneses (id, patient_id, nutritionist_id) on delete restrict
);

create index anamneses_encounter_idx on public.anamneses (encounter_id, revision_number desc);
create index anamneses_patient_idx on public.anamneses (patient_id, created_at desc);
create unique index anamneses_um_rascunho_por_atendimento on public.anamneses (encounter_id) where status = 'rascunho';
create unique index anamneses_operation_unique on public.anamneses (nutritionist_id, operation_id) where operation_id is not null;

-- ============================================================================
-- 3. CONDUCTS
-- ============================================================================

create table public.conducts (
  id                      uuid primary key default gen_random_uuid(),
  nutritionist_id         uuid not null default auth.uid() references auth.users(id),
  patient_id              uuid not null,
  encounter_id            uuid not null,
  revision_number         integer not null default 1,
  status                  text not null default 'rascunho',
  priorities              jsonb not null default '[]'::jsonb,
  objective               text,
  nutrition_strategy      text,
  actions                 text,
  resources               text,
  related_tools           jsonb not null default '[]'::jsonb,
  requested_exams         text,
  referrals               text,
  monitoring              text,
  return_plan             text,
  observations            text,
  nutrition_diagnosis     text,
  dietary_prescription    text,
  professional_guidance   text,
  "references"            jsonb not null default '{}'::jsonb,
  previous_conduct_id     uuid,
  previous_decision       text,
  previous_decision_note  text,
  supersedes_id           uuid,
  superseded_at           timestamptz,
  revision_note           text,
  reviewed_at             timestamptz,
  reviewed_by             uuid references auth.users(id),
  operation_id            uuid,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint conducts_status_valido check (status in ('rascunho','salvo','revisado')),
  constraint conducts_decisao_valida check (previous_decision is null or previous_decision in ('continuar','substituir','encerrar')),
  constraint conducts_revisao_positiva check (revision_number >= 1),
  constraint conducts_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint conducts_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id) on delete restrict,
  constraint conducts_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint conducts_encounter_revision_unique unique (encounter_id, revision_number),
  constraint conducts_previous_fk
    foreign key (previous_conduct_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict,
  constraint conducts_supersedes_fk
    foreign key (supersedes_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict
);

create index conducts_encounter_idx on public.conducts (encounter_id, revision_number desc);
create index conducts_patient_idx on public.conducts (patient_id, created_at desc);
create unique index conducts_um_rascunho_por_atendimento on public.conducts (encounter_id) where status = 'rascunho';
create unique index conducts_operation_unique on public.conducts (nutritionist_id, operation_id) where operation_id is not null;

-- ============================================================================
-- 4. AGREEMENTS
-- ============================================================================

create table public.agreements (
  id                   uuid primary key default gen_random_uuid(),
  nutritionist_id      uuid not null default auth.uid() references auth.users(id),
  patient_id           uuid not null,
  conduct_id           uuid not null,
  description          text not null,
  responsible          text,
  due_text             text,
  follow_up            text,
  status               text not null default 'proposto',
  status_note          text,
  status_changed_at    timestamptz,
  position             integer not null default 0,
  origin_agreement_id  uuid,
  operation_id         uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint agreements_descricao_nao_vazia check (length(btrim(description)) > 0),
  constraint agreements_status_valido check (status in ('proposto','acordado','em_acompanhamento','concluido','revisto','encerrado')),
  constraint agreements_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint agreements_conduct_fk
    foreign key (conduct_id, patient_id, nutritionist_id)
    references public.conducts (id, patient_id, nutritionist_id) on delete restrict,
  constraint agreements_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint agreements_origin_fk
    foreign key (origin_agreement_id, patient_id, nutritionist_id)
    references public.agreements (id, patient_id, nutritionist_id) on delete restrict
);

create index agreements_conduct_idx on public.agreements (conduct_id, position);
create unique index agreements_operation_unique on public.agreements (nutritionist_id, operation_id) where operation_id is not null;

-- ============================================================================
-- 5. TRIGGERS: updated_at, paciente arquivado, imutabilidade, referencias
-- ============================================================================

create trigger anamneses_tocar_updated_at before update on public.anamneses
  for each row execute function public.tocar_updated_at();
create trigger conducts_tocar_updated_at before update on public.conducts
  for each row execute function public.tocar_updated_at();
create trigger agreements_tocar_updated_at before update on public.agreements
  for each row execute function public.tocar_updated_at();

create trigger anamneses_paciente_arquivado before insert or update on public.anamneses
  for each row execute function public.bloquear_escrita_paciente_arquivado();
create trigger conducts_paciente_arquivado before insert or update on public.conducts
  for each row execute function public.bloquear_escrita_paciente_arquivado();
create trigger agreements_paciente_arquivado before insert or update on public.agreements
  for each row execute function public.bloquear_escrita_paciente_arquivado();

-- Revisao consolidada (salvo/revisado) e imutavel: so pode (a) passar de salvo
-- para revisado, recebendo reviewed_at/reviewed_by, e (b) receber superseded_at
-- quando uma revisao nova a substitui. Corrigir = nova linha (RPC).
create or replace function public.proteger_revisao_consolidada()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  antes jsonb; depois jsonb; chaves_livres text[] := array['updated_at','superseded_at','status','reviewed_at','reviewed_by'];
begin
  if old.status = 'rascunho' then return new; end if;
  antes  := to_jsonb(old) - chaves_livres;
  depois := to_jsonb(new) - chaves_livres;
  if antes <> depois then
    raise exception 'revisao consolidada e imutavel: corrija criando uma nova revisao'
      using errcode = 'P0001', hint = 'revisao_imutavel';
  end if;
  if new.status <> old.status and not (old.status = 'salvo' and new.status = 'revisado') then
    raise exception 'revisao consolidada so pode passar de salvo para revisado'
      using errcode = 'P0001', hint = 'revisao_imutavel';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then
    raise exception 'superseded_at nao pode ser alterado depois de definido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger anamneses_proteger_revisao before update on public.anamneses
  for each row execute function public.proteger_revisao_consolidada();
create trigger conducts_proteger_revisao before update on public.conducts
  for each row execute function public.proteger_revisao_consolidada();

-- status -> revisado carimba quem conferiu (identidade do servidor, nao do payload)
create or replace function public.carimbar_revisao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'revisado' and (tg_op = 'INSERT' or old.status <> 'revisado') then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := auth.uid();
  end if;
  if new.status <> 'revisado' then
    new.reviewed_at := null; new.reviewed_by := null;
  end if;
  return new;
end;
$$;
create trigger anamneses_carimbar_revisao before insert or update on public.anamneses
  for each row execute function public.carimbar_revisao();
create trigger conducts_carimbar_revisao before insert or update on public.conducts
  for each row execute function public.carimbar_revisao();

-- Acordo: identidade imutavel; mudanca de situacao e carimbada; nenhuma
-- mudanca de situacao acontece sozinha (so por UPDATE explicito).
create or replace function public.proteger_acordo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.conduct_id <> old.conduct_id or new.patient_id <> old.patient_id or new.nutritionist_id <> old.nutritionist_id then
    raise exception 'acordo nao muda de conduta, paciente ou profissional' using errcode = 'P0001';
  end if;
  if new.status <> old.status then new.status_changed_at := now(); end if;
  return new;
end;
$$;
create trigger agreements_proteger before update on public.agreements
  for each row execute function public.proteger_acordo();

-- Referencias da conduta: cada id citado tem de ser do MESMO paciente e do
-- MESMO profissional. Referencia, nao copia.
create or replace function public.validar_referencias_conduta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare r jsonb := coalesce(new."references", '{}'::jsonb); x text; n int;
begin
  if jsonb_typeof(r) <> 'object' then raise exception 'references deve ser objeto'; end if;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'holoscan_application_ids','[]'::jsonb)) loop
    select count(*) into n from public.holoscan_applications h where h.id = x::uuid and h.patient_id = new.patient_id and h.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a HOLOSCAN de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'tool_application_ids','[]'::jsonb)) loop
    select count(*) into n from public.tool_applications t where t.id = x::uuid and t.patient_id = new.patient_id and t.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a ferramenta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'lab_collection_ids','[]'::jsonb)) loop
    select count(*) into n from public.lab_collections c where c.id = x::uuid and c.patient_id = new.patient_id and c.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a coleta de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'document_ids','[]'::jsonb)) loop
    select count(*) into n from public.documents d where d.id = x::uuid and d.patient_id = new.patient_id and d.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a documento de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  for x in select value::text from jsonb_array_elements_text(coalesce(r->'previous_encounter_ids','[]'::jsonb)) loop
    select count(*) into n from public.encounters e where e.id = x::uuid and e.patient_id = new.patient_id and e.nutritionist_id = new.nutritionist_id;
    if n = 0 then raise exception 'referencia a atendimento de outro paciente ou inexistente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.validar_referencias_conduta() from public, anon, authenticated;
create trigger conducts_validar_referencias before insert or update on public.conducts
  for each row execute function public.validar_referencias_conduta();

-- ============================================================================
-- 6. RLS E GRANTS
-- ============================================================================

alter table public.anamneses enable row level security;
alter table public.conducts enable row level security;
alter table public.agreements enable row level security;

create policy anamneses_select_proprios on public.anamneses for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy anamneses_insert_proprios on public.anamneses for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy anamneses_update_proprios on public.anamneses for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));

create policy conducts_select_proprios on public.conducts for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy conducts_insert_proprios on public.conducts for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy conducts_update_proprios on public.conducts for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));

create policy agreements_select_proprios on public.agreements for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy agreements_insert_proprios on public.agreements for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy agreements_update_proprios on public.agreements for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));
-- o unico DELETE: acordo de conduta ainda em RASCUNHO (nunca de revisao consolidada)
create policy agreements_delete_rascunho on public.agreements for delete to authenticated
  using (nutritionist_id = (select auth.uid()) and exists (
    select 1 from public.conducts c where c.id = agreements.conduct_id and c.nutritionist_id = (select auth.uid()) and c.status = 'rascunho'));

revoke all on table public.anamneses, public.conducts, public.agreements from public, anon;
grant select, insert, update on table public.anamneses, public.conducts to authenticated;
grant select, insert, update, delete on table public.agreements to authenticated;

-- ============================================================================
-- 7. RPC salvar_anamnese — rascunho editavel, consolidado vira nova revisao
-- ============================================================================
-- payload: { id?, encounter_id, content, status (rascunho|salvo|revisado),
--            operation_id?, expected_updated_at?, revision_note?,
--            source_anamnesis_id?, copied_from_previous? }
-- Devolve o id da linha gravada (a mesma, se rascunho; nova, se revisao).

create or replace function public.salvar_anamnese(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_enc uuid; v_pid uuid; v_status text;
  atual public.anamneses%rowtype; n int; novo uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_status := coalesce(nullif(payload->>'status',''), 'rascunho');
  if v_status not in ('rascunho','salvo','revisado') then raise exception 'status invalido'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select a.id into v_id from public.anamneses a where a.nutritionist_id = uid and a.operation_id = v_op;
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.anamneses a where a.id = v_id and a.nutritionist_id = uid for update;
    if not found then raise exception 'anamnese % nao encontrada', v_id using errcode = 'P0002'; end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'a anamnese foi alterada em outro lugar; recarregue antes de salvar' using errcode = 'P0001', hint = 'conflito';
    end if;
    -- "marcar como revisada": so o status muda, na MESMA linha
    if atual.status = 'salvo' and v_status = 'revisado'
       and (payload - 'id' - 'status' - 'operation_id' - 'expected_updated_at') = '{}'::jsonb then
      update public.anamneses set status = 'revisado' where id = v_id;
      return v_id;
    end if;
    if atual.status = 'rascunho' then
      update public.anamneses set
        content = coalesce(payload->'content', content),
        status = v_status,
        revision_note = coalesce(payload->>'revision_note', revision_note),
        operation_id = coalesce(operation_id, v_op)
      where id = v_id;
      -- rascunho de correcao consolidado: so agora a revisao anterior e substituida
      if v_status <> 'rascunho' and atual.supersedes_id is not null then
        update public.anamneses set superseded_at = now() where id = atual.supersedes_id and superseded_at is null;
      end if;
      return v_id;
    end if;
    -- consolidada: nova revisao, a anterior fica intacta
    select coalesce(max(revision_number),0)+1 into n from public.anamneses where encounter_id = atual.encounter_id;
    insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content_version, content,
      source_anamnesis_id, copied_from_previous, supersedes_id, revision_note, operation_id)
    values (uid, atual.patient_id, atual.encounter_id, n, v_status, atual.content_version,
      coalesce(payload->'content', atual.content), atual.source_anamnesis_id, atual.copied_from_previous,
      atual.id, payload->>'revision_note', v_op)
    returning id into novo;
    -- um rascunho de correcao NAO substitui a vigente; so quando consolidado
    if v_status <> 'rascunho' then
      update public.anamneses set superseded_at = now() where id = atual.id;
    end if;
    return novo;
  end if;
  -- nova anamnese para o atendimento
  v_enc := (payload->>'encounter_id')::uuid;
  if v_enc is null then raise exception 'encounter_id e obrigatorio'; end if;
  select e.patient_id into v_pid from public.encounters e where e.id = v_enc and e.nutritionist_id = uid;
  if v_pid is null then raise exception 'atendimento % nao encontrado', v_enc using errcode = 'P0002'; end if;
  select a.id into v_id from public.anamneses a where a.encounter_id = v_enc and a.status = 'rascunho';
  if v_id is not null then
    -- ja ha rascunho deste atendimento: e ele que recebe (idempotente por natureza)
    return public.salvar_anamnese(payload || jsonb_build_object('id', v_id));
  end if;
  select coalesce(max(revision_number),0)+1 into n from public.anamneses where encounter_id = v_enc;
  insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content,
    source_anamnesis_id, copied_from_previous, revision_note, operation_id)
  values (uid, v_pid, v_enc, n, v_status, coalesce(payload->'content','{}'::jsonb),
    nullif(payload->>'source_anamnesis_id','')::uuid, coalesce((payload->>'copied_from_previous')::boolean, false),
    payload->>'revision_note', v_op)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.salvar_anamnese(jsonb) from public, anon;
grant execute on function public.salvar_anamnese(jsonb) to authenticated;

-- ============================================================================
-- 8. RPC criar_anamnese_a_partir_de — copia EXPLICITA, itens marcados previos
-- ============================================================================

create or replace function public.criar_anamnese_a_partir_de(p_encounter_id uuid, p_source_id uuid, p_operation_id uuid default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); fonte public.anamneses%rowtype; v_pid uuid; v_id uuid; n int;
  novo_conteudo jsonb := '{}'::jsonb; dom record; itens jsonb; it jsonb;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_operation_id is not null then
    select a.id into v_id from public.anamneses a where a.nutritionist_id = uid and a.operation_id = p_operation_id;
    if v_id is not null then return v_id; end if;
  end if;
  select e.patient_id into v_pid from public.encounters e where e.id = p_encounter_id and e.nutritionist_id = uid;
  if v_pid is null then raise exception 'atendimento nao encontrado' using errcode = 'P0002'; end if;
  select * into fonte from public.anamneses a where a.id = p_source_id and a.nutritionist_id = uid;
  if not found then raise exception 'anamnese de origem nao encontrada' using errcode = 'P0002'; end if;
  if fonte.patient_id <> v_pid then raise exception 'anamnese de origem e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if fonte.status = 'rascunho' then raise exception 'so uma anamnese salva ou revisada pode ser copiada' using errcode = 'P0001'; end if;
  if exists (select 1 from public.anamneses a where a.encounter_id = p_encounter_id and a.status = 'rascunho') then
    raise exception 'este atendimento ja tem um rascunho de anamnese' using errcode = 'P0001', hint = 'rascunho_existente';
  end if;
  -- cada item vira informacao PREVIA, a revisar; a origem original fica no item
  -- (jsonb_set so cria o ULTIMO nivel do caminho: 'dominios' precisa existir antes)
  if fonte.content->'dominios' is not null then
    novo_conteudo := '{"dominios":{}}'::jsonb;
    for dom in select key, value from jsonb_each(fonte.content->'dominios') loop
      itens := '[]'::jsonb;
      for it in select * from jsonb_array_elements(coalesce(dom.value->'itens','[]'::jsonb)) loop
        itens := itens || jsonb_build_array(it || jsonb_build_object('previo', true, 'fonte_anamnese_id', fonte.id));
      end loop;
      novo_conteudo := jsonb_set(novo_conteudo, array['dominios', dom.key], jsonb_build_object('itens', itens), true);
    end loop;
  end if;
  select coalesce(max(revision_number),0)+1 into n from public.anamneses where encounter_id = p_encounter_id;
  insert into public.anamneses (nutritionist_id, patient_id, encounter_id, revision_number, status, content_version, content,
    source_anamnesis_id, copied_from_previous, operation_id)
  values (uid, v_pid, p_encounter_id, n, 'rascunho', fonte.content_version, novo_conteudo, fonte.id, true, p_operation_id)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.criar_anamnese_a_partir_de(uuid, uuid, uuid) from public, anon;
grant execute on function public.criar_anamnese_a_partir_de(uuid, uuid, uuid) to authenticated;

-- ============================================================================
-- 9. RPC salvar_conduta — mesma regra de revisao; acordos junto
-- ============================================================================
-- payload: { id?, encounter_id, status, campos..., references, previous_conduct_id,
--            previous_decision, previous_decision_note, revision_note,
--            operation_id?, expected_updated_at?,
--            agreements: [ { id?, description, responsible, due_text, follow_up,
--                            status, status_note, position, origin_agreement_id, operation_id? } ] }
-- Rascunho: acordos sao sincronizados (os que sairam da lista sao apagados —
-- unico DELETE permitido, e so em rascunho). Revisao nova: os acordos da
-- anterior ficam; os enviados nascem na revisao nova (origin_agreement_id
-- preserva de onde vieram).

create or replace function public.salvar_conduta(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_enc uuid; v_pid uuid; v_status text;
  atual public.conducts%rowtype; n int; alvo uuid; ag jsonb; ag_id uuid; ag_op uuid; mantidos uuid[] := '{}';
  promover boolean := false;   -- rascunho que vira salvo/revisado DEPOIS de sincronizar os acordos
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_status := coalesce(nullif(payload->>'status',''), 'rascunho');
  if v_status not in ('rascunho','salvo','revisado') then raise exception 'status invalido'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select c.id into v_id from public.conducts c where c.nutritionist_id = uid and c.operation_id = v_op;
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.conducts c where c.id = v_id and c.nutritionist_id = uid for update;
    if not found then raise exception 'conduta % nao encontrada', v_id using errcode = 'P0002'; end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'a conduta foi alterada em outro lugar; recarregue antes de salvar' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_pid := atual.patient_id; v_enc := atual.encounter_id;
    -- "marcar como revisada": so o status muda, na MESMA linha
    if atual.status = 'salvo' and v_status = 'revisado'
       and (payload - 'id' - 'status' - 'operation_id' - 'expected_updated_at') = '{}'::jsonb then
      update public.conducts set status = 'revisado' where id = v_id;
      return v_id;
    end if;
    if atual.status = 'rascunho' then
      alvo := v_id; promover := true;
      update public.conducts set
        priorities = coalesce(payload->'priorities', priorities),
        objective = payload->>'objective', nutrition_strategy = payload->>'nutrition_strategy',
        actions = payload->>'actions', resources = payload->>'resources',
        related_tools = coalesce(payload->'related_tools', related_tools),
        requested_exams = payload->>'requested_exams', referrals = payload->>'referrals',
        monitoring = payload->>'monitoring', return_plan = payload->>'return_plan',
        observations = payload->>'observations', nutrition_diagnosis = payload->>'nutrition_diagnosis',
        dietary_prescription = payload->>'dietary_prescription', professional_guidance = payload->>'professional_guidance',
        "references" = coalesce(payload->'references', "references"),
        previous_conduct_id = coalesce(nullif(payload->>'previous_conduct_id','')::uuid, previous_conduct_id),
        previous_decision = coalesce(nullif(payload->>'previous_decision',''), previous_decision),
        previous_decision_note = coalesce(payload->>'previous_decision_note', previous_decision_note),
        revision_note = coalesce(payload->>'revision_note', revision_note),
        operation_id = coalesce(operation_id, v_op)
      where id = v_id;
    else
      select coalesce(max(revision_number),0)+1 into n from public.conducts where encounter_id = v_enc;
      insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, priorities, objective,
        nutrition_strategy, actions, resources, related_tools, requested_exams, referrals, monitoring, return_plan,
        observations, nutrition_diagnosis, dietary_prescription, professional_guidance, "references",
        previous_conduct_id, previous_decision, previous_decision_note, supersedes_id, revision_note, operation_id)
      values (uid, v_pid, v_enc, n, v_status, coalesce(payload->'priorities', atual.priorities),
        coalesce(payload->>'objective', atual.objective), coalesce(payload->>'nutrition_strategy', atual.nutrition_strategy),
        coalesce(payload->>'actions', atual.actions), coalesce(payload->>'resources', atual.resources),
        coalesce(payload->'related_tools', atual.related_tools), coalesce(payload->>'requested_exams', atual.requested_exams),
        coalesce(payload->>'referrals', atual.referrals), coalesce(payload->>'monitoring', atual.monitoring),
        coalesce(payload->>'return_plan', atual.return_plan), coalesce(payload->>'observations', atual.observations),
        coalesce(payload->>'nutrition_diagnosis', atual.nutrition_diagnosis),
        coalesce(payload->>'dietary_prescription', atual.dietary_prescription),
        coalesce(payload->>'professional_guidance', atual.professional_guidance),
        coalesce(payload->'references', atual."references"),
        atual.previous_conduct_id, atual.previous_decision, atual.previous_decision_note,
        atual.id, payload->>'revision_note', v_op)
      returning id into alvo;
      -- um rascunho de correcao NAO substitui a vigente; so quando consolidado
      if v_status <> 'rascunho' then
        update public.conducts set superseded_at = now() where id = atual.id;
      end if;
    end if;
  else
    v_enc := (payload->>'encounter_id')::uuid;
    if v_enc is null then raise exception 'encounter_id e obrigatorio'; end if;
    select e.patient_id into v_pid from public.encounters e where e.id = v_enc and e.nutritionist_id = uid;
    if v_pid is null then raise exception 'atendimento % nao encontrado', v_enc using errcode = 'P0002'; end if;
    select c.id into alvo from public.conducts c where c.encounter_id = v_enc and c.status = 'rascunho';
    if alvo is not null then
      return public.salvar_conduta(payload || jsonb_build_object('id', alvo));
    end if;
    select coalesce(max(revision_number),0)+1 into n from public.conducts where encounter_id = v_enc;
    promover := true;
    insert into public.conducts (nutritionist_id, patient_id, encounter_id, revision_number, status, priorities, objective,
      nutrition_strategy, actions, resources, related_tools, requested_exams, referrals, monitoring, return_plan,
      observations, nutrition_diagnosis, dietary_prescription, professional_guidance, "references",
      previous_conduct_id, previous_decision, previous_decision_note, revision_note, operation_id)
    values (uid, v_pid, v_enc, n, 'rascunho', coalesce(payload->'priorities','[]'::jsonb), payload->>'objective',
      payload->>'nutrition_strategy', payload->>'actions', payload->>'resources', coalesce(payload->'related_tools','[]'::jsonb),
      payload->>'requested_exams', payload->>'referrals', payload->>'monitoring', payload->>'return_plan',
      payload->>'observations', payload->>'nutrition_diagnosis', payload->>'dietary_prescription',
      payload->>'professional_guidance', coalesce(payload->'references','{}'::jsonb),
      nullif(payload->>'previous_conduct_id','')::uuid, nullif(payload->>'previous_decision',''),
      payload->>'previous_decision_note', payload->>'revision_note', v_op)
    returning id into alvo;
  end if;

  -- acordos desta revisao
  if payload->'agreements' is not null and jsonb_typeof(payload->'agreements') = 'array' then
    for ag in select * from jsonb_array_elements(payload->'agreements') loop
      ag_op := nullif(ag->>'operation_id','')::uuid;
      ag_id := null;
      if ag_op is not null then
        select g.id into ag_id from public.agreements g where g.nutritionist_id = uid and g.operation_id = ag_op;
      end if;
      if ag_id is null and nullif(ag->>'id','') is not null then
        select g.id into ag_id from public.agreements g where g.id = (ag->>'id')::uuid and g.conduct_id = alvo and g.nutritionist_id = uid;
      end if;
      if ag_id is not null then
        update public.agreements set description = coalesce(ag->>'description', description), responsible = ag->>'responsible',
          due_text = ag->>'due_text', follow_up = ag->>'follow_up', status = coalesce(nullif(ag->>'status',''), status),
          status_note = ag->>'status_note', position = coalesce((ag->>'position')::int, position)
        where id = ag_id;
      else
        insert into public.agreements (nutritionist_id, patient_id, conduct_id, description, responsible, due_text, follow_up,
          status, status_note, position, origin_agreement_id, operation_id)
        values (uid, v_pid, alvo, ag->>'description', ag->>'responsible', ag->>'due_text', ag->>'follow_up',
          coalesce(nullif(ag->>'status',''), 'proposto'), ag->>'status_note', coalesce((ag->>'position')::int, 0),
          nullif(ag->>'origin_agreement_id','')::uuid, ag_op)
        returning id into ag_id;
      end if;
      mantidos := mantidos || ag_id;
    end loop;
    -- em RASCUNHO, o que saiu da lista sai da conduta (unico DELETE permitido)
    if promover then
      delete from public.agreements g where g.conduct_id = alvo and not (g.id = any(mantidos));
    end if;
  end if;
  -- so agora o rascunho e consolidado (os acordos ja estao sincronizados)
  if promover and v_status <> 'rascunho' then
    update public.conducts set status = v_status where id = alvo;
    -- rascunho de correcao consolidado: a revisao anterior passa a substituida
    update public.conducts c set superseded_at = now()
      where c.id = (select supersedes_id from public.conducts where id = alvo) and c.superseded_at is null;
  end if;
  return alvo;
end;
$$;
revoke all on function public.salvar_conduta(jsonb) from public, anon;
grant execute on function public.salvar_conduta(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930180000_etapa3_relatorios.sql
-- ---------------------------------------------------------------------------
-- V1, Etapa 3 — PROVENIENCIA (fechamento da Etapa 2) e RELATORIOS CLINICOS
-- versionados (report_emissions). NAO APLICADA em producao. Entra depois de
-- 130000..170000, que nao sao reescritas.
--
-- Ver docs/v1/ETAPA3-ARQUITETURA-EVOLUCAO-RELATORIOS.md.
--   1. Triggers de proveniencia: source_anamnesis_id (fonte consolidada, de
--      outro atendimento, nunca a propria linha) e origin_agreement_id (acordo
--      de OUTRA conduta do mesmo paciente). As FKs compostas ja impedem cruzar
--      paciente/profissional; isto fecha a linhagem. Nenhuma linha reescrita.
--   2. report_emissions: rascunho editavel; emissao = snapshot IMUTAVEL, com
--      source_snapshot (ids/revisoes) e content_snapshot montados PELO SERVIDOR
--      a partir das fontes selecionadas e validadas; content_hash tecnico
--      (sha256, nao e assinatura); retificacao = nova emissao ligada.
--   3. RLS so do dono, anon revogado, sem DELETE, paciente arquivado bloqueado,
--      idempotencia por operation_id, concorrencia por expected_updated_at.
-- Nada metodologico: nenhum delta, nota, faixa, Indice ou Triada no snapshot.

-- ============================================================================
-- 1. PROVENIENCIA
-- ============================================================================

create or replace function public.validar_proveniencia_anamnese()
returns trigger
language plpgsql
set search_path = ''
as $$
declare fonte record;
begin
  if new.source_anamnesis_id is null then return new; end if;
  if new.source_anamnesis_id = new.id then
    raise exception 'anamnese nao pode ter a si mesma como fonte' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  select a.status, a.encounter_id into fonte from public.anamneses a where a.id = new.source_anamnesis_id;
  if fonte.status is null then return new; end if;   -- a FK composta ja recusa o que nao existe/nao e do paciente
  if fonte.status = 'rascunho' then
    raise exception 'fonte da copia precisa ser anamnese salva ou revisada' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  if fonte.encounter_id = new.encounter_id then
    raise exception 'fonte da copia precisa ser de outro atendimento' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  return new;
end;
$$;
create trigger anamneses_validar_proveniencia before insert or update on public.anamneses
  for each row execute function public.validar_proveniencia_anamnese();

create or replace function public.validar_lineage_acordo()
returns trigger
language plpgsql
set search_path = ''
as $$
declare origem record;
begin
  if new.origin_agreement_id is null then return new; end if;
  if new.origin_agreement_id = new.id then
    raise exception 'acordo nao pode ter a si mesmo como origem' using errcode = 'P0001', hint = 'proveniencia';
  end if;
  select g.conduct_id, g.patient_id into origem from public.agreements g where g.id = new.origin_agreement_id;
  if origem.conduct_id is null then return new; end if;   -- FK composta cuida do inexistente/outro paciente
  if origem.conduct_id = new.conduct_id then
    raise exception 'acordo de origem precisa pertencer a outra conduta (revisao ou atendimento anterior)'
      using errcode = 'P0001', hint = 'proveniencia';
  end if;
  return new;
end;
$$;
create trigger agreements_validar_lineage before insert or update on public.agreements
  for each row execute function public.validar_lineage_acordo();

-- ============================================================================
-- 2. REPORT_EMISSIONS
-- ============================================================================

create table public.report_emissions (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid() references auth.users(id),
  patient_id            uuid not null,
  encounter_id          uuid,
  report_type           text not null default 'relatorio_clinico',
  revision_number       integer not null default 1,
  status                text not null default 'rascunho',
  title                 text,
  period_start          date,
  period_end            date,
  selected_sources      jsonb not null default '{}'::jsonb,
  professional_text     text,
  source_snapshot       jsonb,
  content_snapshot      jsonb,
  content_hash          text,
  template_version      integer not null default 1,
  issued_at             timestamptz,
  created_by            uuid references auth.users(id),
  supersedes_report_id  uuid,
  superseded_at         timestamptz,
  operation_id          uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint report_emissions_status_valido check (status in ('rascunho','emitido')),
  constraint report_emissions_tipo_valido check (report_type in ('relatorio_clinico')),
  constraint report_emissions_revisao_positiva check (revision_number >= 1),
  constraint report_emissions_emitido_completo check (
    status = 'rascunho' or (source_snapshot is not null and content_snapshot is not null and content_hash is not null and issued_at is not null)),
  constraint report_emissions_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint report_emissions_encounter_fk
    foreign key (encounter_id, patient_id, nutritionist_id)
    references public.encounters (id, patient_id, nutritionist_id) on delete restrict,
  constraint report_emissions_id_patient_nutritionist_unique unique (id, patient_id, nutritionist_id),
  constraint report_emissions_supersedes_fk
    foreign key (supersedes_report_id, patient_id, nutritionist_id)
    references public.report_emissions (id, patient_id, nutritionist_id) on delete restrict
);

create index report_emissions_patient_idx on public.report_emissions (patient_id, created_at desc);
create unique index report_emissions_operation_unique on public.report_emissions (nutritionist_id, operation_id) where operation_id is not null;

create trigger report_emissions_tocar_updated_at before update on public.report_emissions
  for each row execute function public.tocar_updated_at();
create trigger report_emissions_paciente_arquivado before insert or update on public.report_emissions
  for each row execute function public.bloquear_escrita_paciente_arquivado();

-- Emissao e imutavel: depois de 'emitido' so superseded_at (retificacao) muda.
create or replace function public.proteger_emissao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'rascunho' then return new; end if;
  if (to_jsonb(old) - 'updated_at' - 'superseded_at') <> (to_jsonb(new) - 'updated_at' - 'superseded_at') then
    raise exception 'relatorio emitido e imutavel: retifique criando uma nova emissao'
      using errcode = 'P0001', hint = 'emissao_imutavel';
  end if;
  if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then
    raise exception 'superseded_at nao pode ser alterado depois de definido' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger report_emissions_proteger before update on public.report_emissions
  for each row execute function public.proteger_emissao();

alter table public.report_emissions enable row level security;
create policy report_emissions_select_proprios on public.report_emissions for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy report_emissions_insert_proprios on public.report_emissions for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy report_emissions_update_proprios on public.report_emissions for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));
revoke all on table public.report_emissions from public, anon;
grant select, insert, update on table public.report_emissions to authenticated;

-- ============================================================================
-- 3. RPC salvar_rascunho_relatorio — rascunho editavel, com controle otimista
-- ============================================================================
-- payload: { id?, patient_id, encounter_id?, title, period_start, period_end,
--            selected_sources, professional_text, supersedes_report_id?,
--            operation_id?, expected_updated_at? }

create or replace function public.salvar_rascunho_relatorio(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); v_id uuid; v_op uuid; atual public.report_emissions%rowtype; v_pid uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select r.id into v_id from public.report_emissions r where r.nutritionist_id = uid and r.operation_id = v_op;
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.report_emissions r where r.id = v_id and r.nutritionist_id = uid for update;
    if not found then raise exception 'relatorio % nao encontrado', v_id using errcode = 'P0002'; end if;
    if atual.status <> 'rascunho' then raise exception 'relatorio emitido e imutavel: retifique criando uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel'; end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho do relatorio foi alterado em outro lugar; recarregue antes de salvar' using errcode = 'P0001', hint = 'conflito';
    end if;
    update public.report_emissions set
      title = payload->>'title', period_start = nullif(payload->>'period_start','')::date, period_end = nullif(payload->>'period_end','')::date,
      encounter_id = nullif(payload->>'encounter_id','')::uuid,
      selected_sources = coalesce(payload->'selected_sources', selected_sources),
      professional_text = payload->>'professional_text',
      supersedes_report_id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, supersedes_report_id),
      operation_id = coalesce(operation_id, v_op)
    where id = v_id;
    return v_id;
  end if;
  v_pid := (payload->>'patient_id')::uuid;
  if v_pid is null then raise exception 'patient_id e obrigatorio'; end if;
  insert into public.report_emissions (nutritionist_id, patient_id, encounter_id, status, title, period_start, period_end,
    selected_sources, professional_text, supersedes_report_id, created_by, operation_id)
  values (uid, v_pid, nullif(payload->>'encounter_id','')::uuid, 'rascunho', payload->>'title',
    nullif(payload->>'period_start','')::date, nullif(payload->>'period_end','')::date,
    coalesce(payload->'selected_sources','{}'::jsonb), payload->>'professional_text',
    nullif(payload->>'supersedes_report_id','')::uuid, uid, v_op)
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.salvar_rascunho_relatorio(jsonb) from public, anon;
grant execute on function public.salvar_rascunho_relatorio(jsonb) to authenticated;

-- ============================================================================
-- 4. RPC emitir_relatorio — valida cada fonte e monta o snapshot NO SERVIDOR
-- ============================================================================
-- payload: igual ao rascunho (id opcional = rascunho a consolidar). Com
-- supersedes_report_id, e uma retificacao: revision_number + 1 e a original
-- recebe superseded_at. selected_sources:
--   { encounter_ids: [], anamnesis_ids: [], holoscan_application_ids: [],
--     lab_collection_ids: [], tool_application_ids: [], conduct_ids: [],
--     agreement_ids: [], document_ids: [],
--     incluir_interpretacao: bool, incluir_intimo: bool }
-- Tipos de conteudo no snapshot: RELATO_DO_PACIENTE, OBSERVACAO_PROFISSIONAL,
-- DADO_MEDIDO, DADO_DOCUMENTAL, INDICADOR_CALCULADO, TEXTO_ASSISTIDO (vazio).

create or replace function public.emitir_relatorio(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_pid uuid; v_enc uuid; sel jsonb; atual public.report_emissions%rowtype;
  sup public.report_emissions%rowtype; rev int := 1; intimo boolean; interp boolean;
  pac record; prof record; x text; r record; r2 record;
  fontes jsonb := '{}'::jsonb; conteudo jsonb; secao jsonb; itens jsonb; dom record; it jsonb; tipo text;
  dominios_intimos text[] := array['emocional','sentido_pessoal'];
  hash text; agora timestamptz := now();
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select r0.id into v_id from public.report_emissions r0 where r0.nutritionist_id = uid and r0.operation_id = v_op and r0.status = 'emitido';
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.report_emissions r0 where r0.id = v_id and r0.nutritionist_id = uid for update;
    if not found then raise exception 'relatorio % nao encontrado', v_id using errcode = 'P0002'; end if;
    if atual.status = 'emitido' then
      if v_op is not null and atual.operation_id = v_op then return v_id; end if;
      raise exception 'relatorio ja emitido; retifique criando uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel';
    end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho do relatorio foi alterado em outro lugar; recarregue antes de emitir' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_pid := atual.patient_id;
  else
    v_pid := (payload->>'patient_id')::uuid;
  end if;
  if v_pid is null then raise exception 'patient_id e obrigatorio'; end if;
  v_enc := nullif(payload->>'encounter_id','')::uuid;
  sel := coalesce(payload->'selected_sources', atual.selected_sources, '{}'::jsonb);
  intimo := coalesce((sel->>'incluir_intimo')::boolean, false);
  interp := coalesce((sel->>'incluir_interpretacao')::boolean, true);

  -- retificacao: a emissao substituida tem de ser do mesmo paciente e estar emitida
  if nullif(payload->>'supersedes_report_id','') is not null or atual.supersedes_report_id is not null then
    select * into sup from public.report_emissions r0
      where r0.id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, atual.supersedes_report_id) and r0.nutritionist_id = uid for update;
    if not found then raise exception 'emissao a retificar nao encontrada' using errcode = 'P0002'; end if;
    if sup.patient_id <> v_pid then raise exception 'emissao a retificar e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if sup.status <> 'emitido' then raise exception 'so uma emissao pode ser retificada' using errcode = 'P0001'; end if;
    rev := sup.revision_number + 1;
  end if;

  -- identificacao proporcional + profissional (do servidor, nao do payload)
  select p.nome, p.nascimento, p.sexo into pac from public.patients p where p.id = v_pid and p.nutritionist_id = uid;
  if pac.nome is null then raise exception 'paciente nao encontrado' using errcode = 'P0002'; end if;
  select pr.nome, pr.profissao, pr.registro into prof from public.profiles pr where pr.id = uid;

  conteudo := jsonb_build_object(
    'template_version', 1,
    'tipos_de_conteudo', jsonb_build_array('RELATO_DO_PACIENTE','OBSERVACAO_PROFISSIONAL','DADO_MEDIDO','DADO_DOCUMENTAL','INDICADOR_CALCULADO','TEXTO_ASSISTIDO'),
    'paciente', jsonb_build_object('nome', pac.nome, 'nascimento', pac.nascimento, 'sexo', pac.sexo),
    'profissional', jsonb_build_object('nome', prof.nome, 'profissao', prof.profissao, 'registro', prof.registro),
    'periodo', jsonb_build_object('inicio', nullif(payload->>'period_start',''), 'fim', nullif(payload->>'period_end','')),
    'titulo', payload->>'title',
    'metodologia', 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada, Leitura Integrada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
    'texto_assistido', '[]'::jsonb
  );

  -- atendimentos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'encounter_ids','[]'::jsonb)) loop
    select * into r from public.encounters e where e.id = x::uuid and e.patient_id = v_pid and e.nutritionist_id = uid;
    if not found then raise exception 'atendimento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'occurred_at', r.occurred_at, 'timezone', r.timezone, 'type', r.type, 'modality', r.modality, 'com_agendamento', r.consultation_id is not null);
    fontes := jsonb_set(fontes, '{encounters}', coalesce(fontes->'encounters','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('atendimentos', itens);

  -- anamneses (so consolidadas); itens intimos so com incluir_intimo
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'anamnesis_ids','[]'::jsonb)) loop
    select * into r from public.anamneses a where a.id = x::uuid and a.patient_id = v_pid and a.nutritionist_id = uid;
    if not found then raise exception 'anamnese % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'anamnese % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    secao := '[]'::jsonb;
    if r.content->'dominios' is not null then
      for dom in select key, value from jsonb_each(r.content->'dominios') loop
        if not intimo and dom.key = any(dominios_intimos) then continue; end if;
        for it in select * from jsonb_array_elements(coalesce(dom.value->'itens','[]'::jsonb)) loop
          tipo := case it->>'origem' when 'relato_paciente' then 'RELATO_DO_PACIENTE' when 'observacao_profissional' then 'OBSERVACAO_PROFISSIONAL'
                                      when 'documento_externo' then 'DADO_DOCUMENTAL' when 'dado_medido' then 'DADO_MEDIDO' else 'RELATO_DO_PACIENTE' end;
          secao := secao || (jsonb_build_object('dominio', dom.key, 'tipo_conteudo', tipo) || (it - 'fonte_anamnese_id'));
        end loop;
      end loop;
    end if;
    itens := itens || jsonb_build_object('id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number, 'status', r.status,
      'reviewed_at', r.reviewed_at, 'itens', secao, 'intimo_incluido', intimo);
    fontes := jsonb_set(fontes, '{anamneses}', coalesce(fontes->'anamneses','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('anamneses', itens);

  -- HOLOSCAN: identificacao, data, versao, cobertura, interpretacao profissional — nada de nota/indice/triada/faixa
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'holoscan_application_ids','[]'::jsonb)) loop
    select * into r from public.holoscan_applications h where h.id = x::uuid and h.patient_id = v_pid and h.nutritionist_id = uid;
    if not found then raise exception 'HOLOSCAN % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'INDICADOR_CALCULADO', 'id', r.id, 'encounter_id', r.encounter_id, 'quando', r.quando,
      'versao_estrutura', r.versao_estrutura, 'versao_bancos', r.versao_bancos, 'cobertura', r.cobertura,
      'resultados_oficiais', false, 'interpretacao_profissional', case when interp then r.interpretacao_texto else null end,
      'interpretacao_tipo', 'OBSERVACAO_PROFISSIONAL');
    fontes := jsonb_set(fontes, '{holoscan_applications}', coalesce(fontes->'holoscan_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('holoscan', itens);

  -- exames (coletas + resultados), DADO_MEDIDO; sem faixa de referencia (catalogo nao fechado)
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'lab_collection_ids','[]'::jsonb)) loop
    select * into r from public.lab_collections c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
    if not found then raise exception 'coleta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('exame_id', lr.exame_id, 'nome', lr.nome_exame_no_momento, 'valor', lr.valor, 'unidade', lr.unidade_no_momento) order by lr.exame_id), '[]'::jsonb)
      into secao from public.lab_results lr where lr.collection_id = r.id;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_MEDIDO', 'id', r.id, 'encounter_id', r.encounter_id, 'coletado_em', r.coletado_em,
      'data_coleta_desconhecida', r.data_coleta_desconhecida, 'laboratorio', r.laboratorio, 'resultados', secao);
    fontes := jsonb_set(fontes, '{lab_collections}', coalesce(fontes->'lab_collections','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('exames', itens);

  -- ferramentas consolidadas; respostas (conteudo intimo) so com incluir_intimo
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'tool_application_ids','[]'::jsonb)) loop
    select * into r from public.tool_applications t where t.id = x::uuid and t.patient_id = v_pid and t.nutritionist_id = uid;
    if not found then raise exception 'ferramenta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'ferramenta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'RELATO_DO_PACIENTE', 'id', r.id, 'encounter_id', r.encounter_id, 'ferramenta_id', r.ferramenta_id,
      'versao_ferramenta', r.versao_ferramenta, 'concluida_em', r.concluida_em, 'status', r.status,
      'respostas', case when intimo then r.respostas else null end, 'respostas_incluidas', intimo,
      'leitura_profissional', case when interp then r.leitura else null end, 'leitura_tipo', 'OBSERVACAO_PROFISSIONAL',
      'prioridade', r.prioridade, 'proximo_passo', r.proximo_passo);
    fontes := jsonb_set(fontes, '{tool_applications}', coalesce(fontes->'tool_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('ferramentas', itens);

  -- condutas consolidadas + acordos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'conduct_ids','[]'::jsonb)) loop
    select * into r from public.conducts c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
    if not found then raise exception 'conduta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'conduta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'description', g.description, 'responsible', g.responsible, 'due_text', g.due_text,
        'follow_up', g.follow_up, 'status', g.status, 'status_note', g.status_note) order by g.position, g.created_at), '[]'::jsonb)
      into secao from public.agreements g where g.conduct_id = r.id
        and (sel->'agreement_ids' is null or jsonb_array_length(coalesce(sel->'agreement_ids','[]'::jsonb)) = 0 or (sel->'agreement_ids') ? g.id::text);
    itens := itens || jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number,
      'status', r.status, 'priorities', r.priorities, 'objective', r.objective, 'nutrition_strategy', r.nutrition_strategy, 'actions', r.actions,
      'resources', r.resources, 'requested_exams', r.requested_exams, 'referrals', r.referrals, 'monitoring', r.monitoring, 'return_plan', r.return_plan,
      'observations', r.observations, 'nutrition_diagnosis', r.nutrition_diagnosis, 'dietary_prescription', r.dietary_prescription,
      'professional_guidance', r.professional_guidance, 'previous_decision', r.previous_decision, 'previous_decision_note', r.previous_decision_note,
      'acordos', secao);
    fontes := jsonb_set(fontes, '{conducts}', coalesce(fontes->'conducts','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('condutas', itens);

  -- documentos anexados: so metadados (DADO_DOCUMENTAL)
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'document_ids','[]'::jsonb)) loop
    select * into r from public.documents d where d.id = x::uuid and d.patient_id = v_pid and d.nutritionist_id = uid;
    if not found then raise exception 'documento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'nome', r.nome, 'tipo', r.tipo, 'data_documento', r.data_documento);
    fontes := jsonb_set(fontes, '{documents}', coalesce(fontes->'documents','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('documentos', itens);

  -- interpretacao profissional escrita para este relatorio
  conteudo := conteudo || jsonb_build_object('interpretacao_profissional',
    case when interp and nullif(payload->>'professional_text','') is not null
         then jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'texto', payload->>'professional_text') else null end);

  hash := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');   -- sha256() nativo do PostgreSQL (>= 11): hash tecnico, nao assinatura

  if v_id is not null then
    update public.report_emissions set
      status = 'emitido', encounter_id = coalesce(v_enc, encounter_id), title = coalesce(payload->>'title', title),
      period_start = coalesce(nullif(payload->>'period_start','')::date, period_start), period_end = coalesce(nullif(payload->>'period_end','')::date, period_end),
      selected_sources = sel, professional_text = coalesce(payload->>'professional_text', professional_text),
      source_snapshot = fontes, content_snapshot = conteudo, content_hash = hash, template_version = 1,
      issued_at = agora, created_by = uid, revision_number = rev,
      supersedes_report_id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, supersedes_report_id),
      operation_id = coalesce(operation_id, v_op)
    where id = v_id;
  else
    insert into public.report_emissions (nutritionist_id, patient_id, encounter_id, status, title, period_start, period_end, selected_sources,
      professional_text, source_snapshot, content_snapshot, content_hash, template_version, issued_at, created_by, revision_number,
      supersedes_report_id, operation_id)
    values (uid, v_pid, v_enc, 'emitido', payload->>'title', nullif(payload->>'period_start','')::date, nullif(payload->>'period_end','')::date, sel,
      payload->>'professional_text', fontes, conteudo, hash, 1, agora, uid, rev, nullif(payload->>'supersedes_report_id','')::uuid, v_op)
    returning id into v_id;
  end if;
  if sup.id is not null then
    update public.report_emissions set superseded_at = agora where id = sup.id and superseded_at is null;
  end if;
  return v_id;
end;
$$;
revoke all on function public.emitir_relatorio(jsonb) from public, anon;
grant execute on function public.emitir_relatorio(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20260930190000_etapa4_pacote_metodologico.sql
-- ---------------------------------------------------------------------------
-- V1, Etapa 4 — INFRAESTRUTURA DO PACOTE METODOLOGICO (Mestre §13, §35, §42).
-- NAO APLICADA em producao. Entra depois de 130000..180000.
--
-- O que isto E: persistencia versionada, rastreavel e homologavel de um pacote
-- metodologico (perguntas, escalas, sistemas, associacoes, pesos, faixas,
-- regras de ausencia/Indice/Triada, registro de homologacao).
-- O que isto NAO E: homologacao de conteudo. Nenhuma linha nasce aprovada;
-- nenhum valor atual e declarado correto; nenhum peso, faixa ou vinculo novo.
--
--   1. methodology_packages: id, code, version, status (rascunho | em_revisao |
--      aprovado | retirado), origin, justification, responsible, reviewed_by,
--      reviewed_at, effective_from, effective_to, content_hash, created_at.
--   2. Filhas por pacote: questionnaire_editions, questions, scales, systems,
--      associations (question -> system | triad, weight, role, conflito
--      preservado), ranges (limites + inclusividade), rules (scoring, absence,
--      index, triad, coverage, comparability, example — payload jsonb),
--      homologation_records (tema, elemento, versao, decisao, responsavel,
--      data, fonte, justificativa, evidencia).
--   3. Protecoes server-side: pacote aprovado/retirado e IMUTAVEL (ele e as
--      filhas); aprovado so passa a retirado (recuperavel, sem hard-delete);
--      "aprovado" so pela RPC aprovar_pacote_metodologico, que roda o
--      validador de publicacao (que APONTA, nao corrige) e exige registro de
--      homologacao com responsavel humano. Sem DELETE de pacote nem de registro.
--   4. RLS: dono le/escreve o proprio; qualquer autenticado LE pacote aprovado
--      ou retirado (o metodo e compartilhado); anon revogado.
--   5. holoscan_applications.methodology_package_id (nulo): registro
--      historico guarda a versao do pacote usada, quando houver.

-- ============================================================================
-- 1. PACOTES
-- ============================================================================
create table public.methodology_packages (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  code            text not null,
  version         integer not null default 1,
  status          text not null default 'rascunho',
  origin          text,
  justification   text,
  responsible     text,
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  effective_from  date,
  effective_to    date,
  content_hash    text,
  approved_at     timestamptz,
  approved_by     uuid references auth.users(id),
  retired_at      timestamptz,
  retired_reason  text,
  notes           text,
  created_by      uuid default auth.uid() references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_packages_status_valido check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint methodology_packages_versao_positiva check (version >= 1),
  constraint methodology_packages_code_nao_vazio check (length(btrim(code)) > 0),
  constraint methodology_packages_vigencia_coerente check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint methodology_packages_aprovado_completo check (
    status not in ('aprovado','retirado') or (content_hash is not null and responsible is not null and reviewed_by is not null
      and reviewed_at is not null and effective_from is not null and approved_at is not null and approved_by is not null)),
  constraint methodology_packages_retirado_completo check (status <> 'retirado' or retired_at is not null),
  constraint methodology_packages_code_version_unique unique (nutritionist_id, code, version),
  constraint methodology_packages_id_nutritionist_unique unique (id, nutritionist_id)
);
create index methodology_packages_status_idx on public.methodology_packages (status, effective_from);

-- ============================================================================
-- 2. FILHAS
-- ============================================================================
create table public.methodology_questionnaire_editions (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  code            text not null,
  version         integer not null default 1,
  status          text not null default 'rascunho',
  item_count      integer,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_editions_status_valido check (status in ('rascunho','para_homologacao','aprovada','retirada')),
  constraint methodology_editions_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_editions_code_version_unique unique (package_id, code, version),
  constraint methodology_editions_id_nutritionist_unique unique (id, nutritionist_id)
);

create table public.methodology_scales (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  code            text not null,
  min_value       integer not null,
  max_value       integer not null,
  labels          jsonb,
  kind            text,
  status          text not null default 'rascunho',
  source          text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_scales_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_scales_intervalo check (max_value > min_value),
  constraint methodology_scales_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_scales_code_unique unique (package_id, code)
);

create table public.methodology_systems (
  id                uuid primary key default gen_random_uuid(),
  nutritionist_id   uuid not null default auth.uid() references auth.users(id),
  package_id        uuid not null,
  code              text not null,
  name              text not null,
  public_text       text,
  definition        text,
  emotional_pattern text,
  spiritual_impact  text,
  color             text,
  position          integer not null default 0,
  status            text not null default 'rascunho',
  source            text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint methodology_systems_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_systems_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_systems_code_unique unique (package_id, code)
);

create table public.methodology_questions (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  package_id       uuid not null,
  edition_id       uuid not null,
  stable_id        text not null,
  statement        text not null,
  block            text not null,
  scale_code       text,
  response_labels  jsonb,
  orientation      text,
  temporal_context text,
  status           text not null default 'rascunho',
  source           text,
  notes            text,
  version          integer not null default 1,
  position         integer,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint methodology_questions_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_questions_orientacao_valida check (orientation is null or orientation in ('direta','invertida')),
  constraint methodology_questions_bloco_valido check (block in ('fisico','mental_emocional','espiritual')),
  constraint methodology_questions_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_questions_edition_fk foreign key (edition_id, nutritionist_id) references public.methodology_questionnaire_editions (id, nutritionist_id) on delete restrict,
  constraint methodology_questions_stable_id_unique unique (edition_id, stable_id)
);

create table public.methodology_associations (
  id                uuid primary key default gen_random_uuid(),
  nutritionist_id   uuid not null default auth.uid() references auth.users(id),
  package_id        uuid not null,
  question_stable_id text not null,
  destination_type  text not null,
  destination_id    text not null,
  weight            numeric,
  role              text,
  status            text not null default 'rascunho',
  source            text,
  conflict          boolean not null default false,
  conflict_note     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint methodology_associations_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_associations_tipo_valido check (destination_type in ('system','triad')),
  constraint methodology_associations_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);
create index methodology_associations_question_idx on public.methodology_associations (package_id, question_stable_id);

create table public.methodology_ranges (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  package_id       uuid not null,
  destination_type text not null,
  destination_id   text not null,
  lower_bound      numeric not null,
  upper_bound      numeric not null,
  lower_inclusive  boolean not null default true,
  upper_inclusive  boolean not null default true,
  label            text not null,
  message_nutri    text,
  message_paciente text,
  status           text not null default 'rascunho',
  source           text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint methodology_ranges_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_ranges_tipo_valido check (destination_type in ('system','index','triad')),
  constraint methodology_ranges_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);

create table public.methodology_rules (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  rule_type       text not null,
  target          text not null default 'global',
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'rascunho',
  source          text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint methodology_rules_status_valido check (status in ('rascunho','para_homologacao','aprovado','retirado')),
  constraint methodology_rules_tipo_valido check (rule_type in ('scoring','absence','index','triad','coverage','comparability','example')),
  constraint methodology_rules_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict,
  constraint methodology_rules_tipo_alvo_unique unique (package_id, rule_type, target)
);

create table public.methodology_homologation_records (
  id              uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null default auth.uid() references auth.users(id),
  package_id      uuid not null,
  topic           text not null,
  element         text not null,
  version         text,
  decision        text not null,
  responsible     text not null,
  decided_at      date not null,
  source          text,
  justification   text,
  evidence        text,
  created_by      uuid default auth.uid() references auth.users(id),
  created_at      timestamptz not null default now(),
  constraint methodology_records_responsavel_nao_vazio check (length(btrim(responsible)) > 0),
  constraint methodology_records_decisao_nao_vazia check (length(btrim(decision)) > 0),
  constraint methodology_records_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);
create index methodology_records_package_idx on public.methodology_homologation_records (package_id, decided_at desc);

-- registro historico: qual pacote (versao) foi usado; nulo para tudo o que existe hoje.
-- Faz parte do snapshot imutavel (proteger_snapshot_holoscan passa a cobri-lo).
alter table public.holoscan_applications add column if not exists methodology_package_id uuid references public.methodology_packages(id) on delete restrict;
create index if not exists holoscan_applications_methodology_package_idx on public.holoscan_applications (methodology_package_id) where methodology_package_id is not null;
CREATE OR REPLACE FUNCTION public.proteger_snapshot_holoscan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.nutritionist_id       IS DISTINCT FROM old.nutritionist_id
  OR new.patient_id            IS DISTINCT FROM old.patient_id
  OR new.encounter_id          IS DISTINCT FROM old.encounter_id
  OR new.methodology_package_id IS DISTINCT FROM old.methodology_package_id
  OR new.quando                IS DISTINCT FROM old.quando
  OR new.versao_estrutura      IS DISTINCT FROM old.versao_estrutura
  OR new.versao_bancos         IS DISTINCT FROM old.versao_bancos
  OR new.indice                IS DISTINCT FROM old.indice
  OR new.indice_maximo         IS DISTINCT FROM old.indice_maximo
  OR new.avaliavel             IS DISTINCT FROM old.avaliavel
  OR new.nota_media            IS DISTINCT FROM old.nota_media
  OR new.triada                IS DISTINCT FROM old.triada
  OR new.triada_com_dado       IS DISTINCT FROM old.triada_com_dado
  OR new.cobertura             IS DISTINCT FROM old.cobertura
  OR new.combinacoes           IS DISTINCT FROM old.combinacoes
  OR new.aprofundamentos       IS DISTINCT FROM old.aprofundamentos
  THEN
    RAISE EXCEPTION 'campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id, e o pacote metodologico); '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  END IF;
  RETURN new;
END;
$$;

-- updated_at
create trigger methodology_packages_tocar_updated_at before update on public.methodology_packages for each row execute function public.tocar_updated_at();
create trigger methodology_editions_tocar_updated_at before update on public.methodology_questionnaire_editions for each row execute function public.tocar_updated_at();
create trigger methodology_scales_tocar_updated_at before update on public.methodology_scales for each row execute function public.tocar_updated_at();
create trigger methodology_systems_tocar_updated_at before update on public.methodology_systems for each row execute function public.tocar_updated_at();
create trigger methodology_questions_tocar_updated_at before update on public.methodology_questions for each row execute function public.tocar_updated_at();
create trigger methodology_associations_tocar_updated_at before update on public.methodology_associations for each row execute function public.tocar_updated_at();
create trigger methodology_ranges_tocar_updated_at before update on public.methodology_ranges for each row execute function public.tocar_updated_at();
create trigger methodology_rules_tocar_updated_at before update on public.methodology_rules for each row execute function public.tocar_updated_at();

-- ============================================================================
-- 3. PROTECOES
-- ============================================================================
-- Pacote aprovado/retirado e imutavel. A unica transicao permitida depois de
-- aprovado e aprovado -> retirado (retired_at, retired_reason, effective_to).
-- Passar a 'aprovado' so pela RPC (sinal de sessao holohacking.aprovacao_rpc).
create or replace function public.proteger_pacote_metodologico()
returns trigger
language plpgsql
set search_path = ''
as $$
declare livres text[] := array['updated_at'];
begin
  if new.status = 'aprovado' and old.status <> 'aprovado' then
    if coalesce(current_setting('holohacking.aprovacao_rpc', true), '') <> new.id::text then
      raise exception 'aprovacao nao e edicao administrativa: use aprovar_pacote_metodologico (validador + registro de homologacao)'
        using errcode = 'P0001', hint = 'aprovacao_sem_registro';
    end if;
    return new;
  end if;
  if old.status = 'aprovado' then
    if new.status = 'retirado' then
      livres := livres || array['status','retired_at','retired_reason','effective_to'];
      if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
        raise exception 'pacote aprovado e imutavel: retirar so muda status, retired_at, retired_reason e effective_to' using errcode = 'P0001', hint = 'pacote_imutavel';
      end if;
      return new;
    end if;
    if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
      raise exception 'pacote aprovado e imutavel: alteracao exige NOVA VERSAO' using errcode = 'P0001', hint = 'pacote_imutavel';
    end if;
    return new;
  end if;
  if old.status = 'retirado' then
    if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
      raise exception 'pacote retirado e historico: permanece recuperavel e nao muda' using errcode = 'P0001', hint = 'pacote_imutavel';
    end if;
    return new;
  end if;
  if new.status = 'retirado' then
    raise exception 'so um pacote aprovado pode ser retirado' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger methodology_packages_proteger before update on public.methodology_packages
  for each row execute function public.proteger_pacote_metodologico();

-- filhas: nenhuma escrita quando o pacote esta aprovado ou retirado
create or replace function public.proteger_filha_pacote_metodologico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_pid uuid; v_status text;
begin
  v_pid := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  select p.status into v_status from public.methodology_packages p where p.id = v_pid;
  if v_status in ('aprovado','retirado') and coalesce(current_setting('holohacking.aprovacao_rpc', true), '') <> v_pid::text then
    raise exception 'conteudo de pacote % e imutavel: crie uma nova versao do pacote', v_status using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  if tg_op = 'UPDATE' and (new.package_id <> old.package_id or new.nutritionist_id <> old.nutritionist_id) then
    raise exception 'elemento nao muda de pacote nem de profissional' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.proteger_filha_pacote_metodologico() from public, anon, authenticated;
create trigger methodology_editions_proteger before insert or update or delete on public.methodology_questionnaire_editions for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_scales_proteger before insert or update or delete on public.methodology_scales for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_systems_proteger before insert or update or delete on public.methodology_systems for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_questions_proteger before insert or update or delete on public.methodology_questions for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_associations_proteger before insert or update or delete on public.methodology_associations for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_ranges_proteger before insert or update or delete on public.methodology_ranges for each row execute function public.proteger_filha_pacote_metodologico();
create trigger methodology_rules_proteger before insert or update or delete on public.methodology_rules for each row execute function public.proteger_filha_pacote_metodologico();

-- registro de homologacao nunca muda (so insert); nutritionist_id nao e trocado
create or replace function public.proteger_registro_homologacao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'registro de homologacao e imutavel: acrescente um novo registro' using errcode = 'P0001', hint = 'registro_imutavel';
end;
$$;
create trigger methodology_records_proteger before update on public.methodology_homologation_records
  for each row execute function public.proteger_registro_homologacao();

-- ============================================================================
-- 4. RLS
-- ============================================================================
alter table public.methodology_packages enable row level security;
alter table public.methodology_questionnaire_editions enable row level security;
alter table public.methodology_scales enable row level security;
alter table public.methodology_systems enable row level security;
alter table public.methodology_questions enable row level security;
alter table public.methodology_associations enable row level security;
alter table public.methodology_ranges enable row level security;
alter table public.methodology_rules enable row level security;
alter table public.methodology_homologation_records enable row level security;

-- pacote: dono le e escreve; qualquer autenticado le aprovado/retirado
create policy methodology_packages_select on public.methodology_packages for select to authenticated
  using (nutritionist_id = (select auth.uid()) or status in ('aprovado','retirado'));
create policy methodology_packages_insert on public.methodology_packages for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy methodology_packages_update on public.methodology_packages for update to authenticated
  using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));

-- filhas: leitura segue a do pacote; escrita so do dono; DELETE so com pacote rascunho/em_revisao
do $$
declare t text;
begin
  foreach t in array array['methodology_questionnaire_editions','methodology_scales','methodology_systems','methodology_questions','methodology_associations','methodology_ranges','methodology_rules'] loop
    execute format('create policy %I_select on public.%I for select to authenticated using (nutritionist_id = (select auth.uid()) or exists (select 1 from public.methodology_packages p where p.id = %I.package_id and p.status in (''aprovado'',''retirado'')))', t, t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (nutritionist_id = (select auth.uid()))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()))', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (nutritionist_id = (select auth.uid()) and exists (select 1 from public.methodology_packages p where p.id = %I.package_id and p.nutritionist_id = (select auth.uid()) and p.status in (''rascunho'',''em_revisao'')))', t, t, t);
    execute format('revoke all on table public.%I from public, anon', t);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
  end loop;
end $$;
create policy methodology_records_select on public.methodology_homologation_records for select to authenticated
  using (nutritionist_id = (select auth.uid()) or exists (select 1 from public.methodology_packages p where p.id = methodology_homologation_records.package_id and p.status in ('aprovado','retirado')));
create policy methodology_records_insert on public.methodology_homologation_records for insert to authenticated with check (nutritionist_id = (select auth.uid()));
revoke all on table public.methodology_packages, public.methodology_homologation_records from public, anon;
grant select, insert, update on table public.methodology_packages to authenticated;
grant select, insert on table public.methodology_homologation_records to authenticated;

-- ============================================================================
-- 5. VALIDADOR DE PUBLICACAO — aponta, nao corrige
-- ============================================================================
-- Devolve {"erros":[{codigo, onde, mensagem}], "avisos":[...], "publicavel": bool}.
create or replace function public.validar_pacote_metodologico(p_package_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  erros jsonb := '[]'::jsonb; avisos jsonb := '[]'::jsonb; r record; r2 record; n int; soma numeric; ant record; sist text[]; eixos text[] := array['fisico','mental','espiritual'];
  idx jsonb;
begin
  perform 1 from public.methodology_packages p where p.id = p_package_id;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  select coalesce(array_agg(s.code), '{}') into sist from public.methodology_systems s where s.package_id = p_package_id;

  -- IDs duplicados (mesmo stable_id em mais de uma edicao / linha)
  for r in select q.stable_id, count(*) c from public.methodology_questions q where q.package_id = p_package_id group by q.stable_id having count(*) > 1 loop
    erros := erros || jsonb_build_object('codigo','id_duplicado','onde',r.stable_id,'mensagem','stable_id em '||r.c||' linhas do pacote');
  end loop;
  -- escala ausente / inexistente
  for r in select q.stable_id, q.scale_code from public.methodology_questions q where q.package_id = p_package_id loop
    if r.scale_code is null then erros := erros || jsonb_build_object('codigo','escala_ausente','onde',r.stable_id,'mensagem','pergunta sem escala');
    elsif not exists (select 1 from public.methodology_scales s where s.package_id = p_package_id and s.code = r.scale_code) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.stable_id,'mensagem','escala "'||r.scale_code||'" nao existe no pacote'); end if;
  end loop;
  -- orientacao ausente (nunca inferida)
  for r in select q.stable_id from public.methodology_questions q where q.package_id = p_package_id and q.orientation is null loop
    erros := erros || jsonb_build_object('codigo','orientacao_ausente','onde',r.stable_id,'mensagem','orientacao nao definida (ausente nao e direta)');
  end loop;
  -- associacoes: referencia inexistente, peso ausente, conflito nao resolvido
  for r in select a.* from public.methodology_associations a where a.package_id = p_package_id loop
    if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id and q.stable_id = r.question_stable_id) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id,'mensagem','associacao aponta para pergunta que nao existe no pacote'); end if;
    if r.destination_type = 'system' and not (r.destination_id = any(sist)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','sistema de destino nao existe no pacote'); end if;
    if r.destination_type = 'triad' and not (r.destination_id = any(eixos)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','eixo da Triada desconhecido'); end if;
    if r.weight is null then erros := erros || jsonb_build_object('codigo','peso_ausente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','peso obrigatorio ausente'); end if;
    if r.conflict then erros := erros || jsonb_build_object('codigo','conflito_pendente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem',coalesce(r.conflict_note,'associacao em conflito nao resolvido')); end if;
  end loop;
  -- associacao orfa: pergunta sem nenhum destino de sistema
  for r in select q.stable_id from public.methodology_questions q where q.package_id = p_package_id
      and not exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = q.stable_id and a.destination_type = 'system') loop
    erros := erros || jsonb_build_object('codigo','associacao_orfa','onde',r.stable_id,'mensagem','pergunta sem associacao a sistema');
  end loop;
  -- SNT pendente: perguntas marcadas pendentes de homologacao de vinculo (conflito em associacao primaria)
  if exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.conflict and a.question_stable_id in ('SNT-101','SNT-501')) then
    erros := erros || jsonb_build_object('codigo','snt_pendente','onde','SNT-101/SNT-501','mensagem','vinculos de SNT-101/SNT-501 pendentes de homologacao');
  end if;
  -- faixas: ordem, lacuna, sobreposicao, cobertura do dominio 0..10 por destino
  for r in select distinct a.destination_type, a.destination_id from public.methodology_ranges a where a.package_id = p_package_id loop
    ant := null; n := 0;
    for r2 in select * from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = r.destination_type and f.destination_id = r.destination_id order by f.lower_bound, f.upper_bound loop
      n := n + 1;
      if r2.lower_bound >= r2.upper_bound then erros := erros || jsonb_build_object('codigo','faixa_ordem_invalida','onde',r.destination_id||'/'||r2.label,'mensagem','limite inferior >= superior'); end if;
      if n > 1 then
        if r2.lower_bound < ant.upper_bound or (r2.lower_bound = ant.upper_bound and r2.lower_inclusive and ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_sobreposta','onde',r.destination_id||'/'||r2.label,'mensagem','sobrepoe "'||ant.label||'"');
        elsif r2.lower_bound > ant.upper_bound or (r2.lower_bound = ant.upper_bound and not r2.lower_inclusive and not ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','lacuna entre "'||ant.label||'" e "'||r2.label||'"');
        end if;
      elsif r2.lower_bound > 0 or not r2.lower_inclusive then
        erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','dominio nao comeca em 0 inclusivo');
      end if;
      ant := r2;
    end loop;
    if n > 0 and r.destination_type <> 'index' and (ant.upper_bound < 10 or not ant.upper_inclusive) then
      erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||ant.label,'mensagem','dominio nao termina em 10 inclusivo');
    end if;
  end loop;
  -- sistema sem faixa
  for r in select unnest(sist) as code loop
    if not exists (select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = 'system' and f.destination_id = r.code) then
      erros := erros || jsonb_build_object('codigo','faixa_ausente','onde',r.code,'mensagem','sistema sem faixas'); end if;
  end loop;
  -- regras obrigatorias
  if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'absence'
      and x.payload ? 'denominador' and x.payload ? 'cobertura_minima' and x.payload ? 'recusado' and x.payload ? 'nao_aplicavel' and x.payload ? 'minimos'
      and jsonb_typeof(x.payload->'denominador') <> 'null' and jsonb_typeof(x.payload->'cobertura_minima') <> 'null') then
    erros := erros || jsonb_build_object('codigo','politica_parcialidade_ausente','onde','absence','mensagem','politica de ausencia/parcialidade incompleta (denominador, cobertura_minima, recusado, nao_aplicavel, minimos)');
  end if;
  select x.payload into idx from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'index' and x.target = 'global';
  if idx is null or not (idx ? 'alphas') or not (idx ? 'elegibilidade') or not (idx ? 'indice_parcial') then
    erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','configuracao do Indice incompleta (alphas, elegibilidade, indice_parcial)');
  else
    soma := 0;
    for r2 in select key, value from jsonb_each(idx->'alphas') loop
      if not (r2.key = any(sist)) then erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde','index/'||r2.key,'mensagem','alpha para sistema inexistente'); end if;
      if jsonb_typeof(r2.value) <> 'number' then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.key,'mensagem','alpha ausente'); else soma := soma + (r2.value)::numeric; end if;
    end loop;
    for r2 in select unnest(sist) as code loop
      if not (idx->'alphas' ? r2.code) then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.code,'mensagem','sistema sem alpha'); end if;
    end loop;
    if abs(soma - 1) > 0.0001 then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','alphas somam '||soma||', esperado 1'); end if;
  end if;
  for r in select unnest(eixos) as eixo loop
    if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'triad' and x.target = r.eixo
        and x.payload ? 'contribuicao' and x.payload ? 'escala' and x.payload ? 'elegibilidade' and x.payload ? 'agregacao') then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','configuracao do eixo incompleta (contribuicao, escala, elegibilidade, agregacao)');
    end if;
  end loop;
  for r in select unnest(sist) as code loop
    if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'scoring' and x.target = r.code and x.payload ? 'formula') then
      erros := erros || jsonb_build_object('codigo','regra_incompleta','onde','scoring/'||r.code,'mensagem','sistema sem regra de pontuacao'); end if;
  end loop;
  -- exemplo deterministico com resultado esperado
  if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'example' and x.payload ? 'entrada' and x.payload ? 'esperado' and jsonb_typeof(x.payload->'esperado') <> 'null') then
    erros := erros || jsonb_build_object('codigo','exemplo_sem_resultado','onde','example','mensagem','nenhum exemplo deterministico com resultado esperado');
  end if;
  -- elementos nao aprovados individualmente
  select count(*) into n from (
    select 1 from public.methodology_questions q where q.package_id = p_package_id and q.status <> 'aprovado'
    union all select 1 from public.methodology_associations a where a.package_id = p_package_id and a.status <> 'aprovado'
    union all select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.status <> 'aprovado'
    union all select 1 from public.methodology_systems s where s.package_id = p_package_id and s.status <> 'aprovado'
    union all select 1 from public.methodology_scales e where e.package_id = p_package_id and e.status <> 'aprovado'
    union all select 1 from public.methodology_rules x where x.package_id = p_package_id and x.status <> 'aprovado') z;
  if n > 0 then erros := erros || jsonb_build_object('codigo','elemento_nao_aprovado','onde','pacote','mensagem',n||' elemento(s) com status diferente de aprovado'); end if;
  if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id) then
    erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem perguntas'); end if;
  if coalesce(array_length(sist,1),0) = 0 then erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem sistemas'); end if;
  return jsonb_build_object('erros', erros, 'avisos', avisos, 'publicavel', jsonb_array_length(erros) = 0, 'total_erros', jsonb_array_length(erros));
end;
$$;
revoke all on function public.validar_pacote_metodologico(uuid) from public, anon;
grant execute on function public.validar_pacote_metodologico(uuid) to authenticated;

-- ============================================================================
-- 6. RPCs: aprovar (com validador + registro humano) e retirar
-- ============================================================================
-- p_registro: { responsible, decided_at?, justification, source?, evidence?, effective_from? }
create or replace function public.aprovar_pacote_metodologico(p_package_id uuid, p_registro jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; v jsonb; h text; conteudo jsonb;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser aprovado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if p_registro is null or length(btrim(coalesce(p_registro->>'responsible',''))) = 0 or length(btrim(coalesce(p_registro->>'justification',''))) = 0 then
    raise exception 'aprovacao exige registro de homologacao com responsavel humano e justificativa' using errcode = 'P0001', hint = 'registro_incompleto';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left((v->'erros')::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  -- hash do conteudo (ordem canonica por chave natural)
  select jsonb_build_object(
    'questions', (select coalesce(jsonb_agg(to_jsonb(q) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' - 'edition_id' order by q.stable_id) ,'[]') from public.methodology_questions q where q.package_id = p_package_id),
    'associations', (select coalesce(jsonb_agg(to_jsonb(a) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by a.question_stable_id, a.destination_type, a.destination_id, a.role),'[]') from public.methodology_associations a where a.package_id = p_package_id),
    'ranges', (select coalesce(jsonb_agg(to_jsonb(f) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by f.destination_type, f.destination_id, f.lower_bound),'[]') from public.methodology_ranges f where f.package_id = p_package_id),
    'systems', (select coalesce(jsonb_agg(to_jsonb(s) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by s.code),'[]') from public.methodology_systems s where s.package_id = p_package_id),
    'scales', (select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by e.code),'[]') from public.methodology_scales e where e.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(to_jsonb(x) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by x.rule_type, x.target),'[]') from public.methodology_rules x where x.package_id = p_package_id)
  ) into conteudo;
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', p_registro->>'responsible', coalesce((p_registro->>'decided_at')::date, current_date),
    p_registro->>'source', p_registro->>'justification', coalesce(p_registro->>'evidence', 'validar_pacote_metodologico: 0 erros'));
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', approved_at = now(), approved_by = uid, reviewed_by = uid, reviewed_at = now(),
    responsible = p_registro->>'responsible', justification = coalesce(p_registro->>'justification', justification),
    effective_from = coalesce((p_registro->>'effective_from')::date, effective_from, current_date), content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'validacao', v);
end;
$$;
revoke all on function public.aprovar_pacote_metodologico(uuid, jsonb) from public, anon;
grant execute on function public.aprovar_pacote_metodologico(uuid, jsonb) to authenticated;

create or replace function public.retirar_pacote_metodologico(p_package_id uuid, p_motivo text, p_responsible text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'aprovado' then raise exception 'so um pacote aprovado pode ser retirado' using errcode = 'P0001'; end if;
  if length(btrim(coalesce(p_responsible,''))) = 0 then raise exception 'retirada exige responsavel' using errcode = 'P0001'; end if;
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, justification)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'retirado', p_responsible, current_date, p_motivo);
  update public.methodology_packages set status = 'retirado', retired_at = now(), retired_reason = p_motivo, effective_to = least(coalesce(effective_to, current_date), current_date) where id = p_package_id;
  return p_package_id;
end;
$$;
revoke all on function public.retirar_pacote_metodologico(uuid, text, text) from public, anon;
grant execute on function public.retirar_pacote_metodologico(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261001200000_etapa4_2_contrato_metodologico_v1.sql
-- ---------------------------------------------------------------------------
-- V1, Etapa 4.2 — CONTRATO METODOLOGICO V1 NO BANCO (decisoes humanas fechadas).
-- NAO APLICADA em producao. Entra depois de 130000..190000 (cadeia ainda nao
-- validada no banco real: o pacote candidato NAO e publicado ate esse gate).
--
-- O que isto faz (estrutura e validador; nenhum dado metodologico e gravado):
--   1. Linhagem e provenance: methodology_packages.lineage (pacote anterior,
--      versao, status e hash); legacy jsonb em associacoes, sistemas e faixas
--      (peso recuperado = legacy_recovered_weight, textos e mensagens antigos),
--      preservados sem entrar no calculo nem na exibicao oficial.
--   2. Limites exatos de faixa: lower_bound_exact / upper_bound_exact ("10/3").
--   3. Contexto temporal com valores permitidos (7) e papeis de associacao
--      conhecidos; secondary_contextual nunca tem peso (nao pontua).
--   4. rule_type 'suggestion' (politica de sugestao: automatica = false na V1).
--   5. validar_pacote_metodologico com o contrato V1: contexto temporal,
--      exatamente um primario pontuavel por pergunta, Triada pelo bloco,
--      secundaria sem peso, ausencia nunca zero, Indice sem parcial e sem
--      renormalizacao, cobertura minima explicita, textos causais fora do
--      conteudo oficial, sugestao automatica proibida. O validador APONTA.

alter table public.methodology_packages add column if not exists lineage jsonb;
alter table public.methodology_associations add column if not exists legacy jsonb;
alter table public.methodology_systems add column if not exists legacy jsonb;
alter table public.methodology_ranges add column if not exists legacy jsonb;
alter table public.methodology_ranges add column if not exists lower_bound_exact text;
alter table public.methodology_ranges add column if not exists upper_bound_exact text;

alter table public.methodology_ranges add constraint methodology_ranges_limite_exato_formato check (
  (lower_bound_exact is null or lower_bound_exact ~ '^-?[0-9]+(\.[0-9]+)?(/[1-9][0-9]*)?$')
  and (upper_bound_exact is null or upper_bound_exact ~ '^-?[0-9]+(\.[0-9]+)?(/[1-9][0-9]*)?$'));
alter table public.methodology_questions add constraint methodology_questions_contexto_temporal_valido check (
  temporal_context is null or temporal_context in ('ultimos_7_dias','ultimos_30_dias','ultimos_3_meses','atualmente','habitualmente','ao_longo_da_vida','sem_periodo_especifico'));
-- 'secundaria' e 'derivada' continuam aceitos: o pacote importado (historico) permanece reproduzivel.
alter table public.methodology_associations add constraint methodology_associations_papel_conhecido check (
  role is null or role in ('primaria','secondary_contextual','triade_por_bloco','secundaria','derivada'));
alter table public.methodology_associations add constraint methodology_associations_contextual_sem_peso check (
  role is distinct from 'secondary_contextual' or weight is null);
alter table public.methodology_rules drop constraint methodology_rules_tipo_valido;
alter table public.methodology_rules add constraint methodology_rules_tipo_valido check (
  rule_type in ('scoring','absence','index','triad','coverage','comparability','example','suggestion'));

-- Valor de um limite exato ("10/3", "0", "2.5") como numeric; null se ausente.
create or replace function public.metodologia_valor_exato(t text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when t is null then null
              when position('/' in t) > 0 then split_part(t, '/', 1)::numeric / nullif(split_part(t, '/', 2)::numeric, 0)
              else t::numeric end
$$;
revoke all on function public.metodologia_valor_exato(text) from public, anon;
grant execute on function public.metodologia_valor_exato(text) to authenticated;

create or replace function public.validar_pacote_metodologico(p_package_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  erros jsonb := '[]'::jsonb; avisos jsonb := '[]'::jsonb; r record; r2 record; n int; soma numeric; ant record; sist text[]; eixos text[] := array['fisico','mental','espiritual'];
  idx jsonb; aus jsonb; tri jsonb; x numeric; termo text;
  contextos text[] := array['ultimos_7_dias','ultimos_30_dias','ultimos_3_meses','atualmente','habitualmente','ao_longo_da_vida','sem_periodo_especifico'];
  causais text[] := array['impacto espiritual','plexo solar','queda de frequência','queda de frequencia','dessintoniza','bloqueio energético','bloqueio energetico'];
begin
  perform 1 from public.methodology_packages p where p.id = p_package_id;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  select coalesce(array_agg(s.code), '{}') into sist from public.methodology_systems s where s.package_id = p_package_id;

  -- IDs duplicados (mesmo stable_id em mais de uma edicao / linha)
  for r in select q.stable_id, count(*) c from public.methodology_questions q where q.package_id = p_package_id group by q.stable_id having count(*) > 1 loop
    erros := erros || jsonb_build_object('codigo','id_duplicado','onde',r.stable_id,'mensagem','stable_id em '||r.c||' linhas do pacote');
  end loop;
  -- escala ausente / inexistente (escala desconhecida nunca vira frequencia)
  for r in select q.stable_id, q.scale_code from public.methodology_questions q where q.package_id = p_package_id loop
    if r.scale_code is null then erros := erros || jsonb_build_object('codigo','escala_ausente','onde',r.stable_id,'mensagem','pergunta sem escala');
    elsif not exists (select 1 from public.methodology_scales s where s.package_id = p_package_id and s.code = r.scale_code) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.stable_id,'mensagem','escala "'||r.scale_code||'" nao existe no pacote'); end if;
  end loop;
  -- orientacao ausente (nunca inferida) e contexto temporal
  for r in select q.stable_id, q.orientation, q.temporal_context, q.block from public.methodology_questions q where q.package_id = p_package_id loop
    if r.orientation is null then erros := erros || jsonb_build_object('codigo','orientacao_ausente','onde',r.stable_id,'mensagem','orientacao nao definida (ausente nao e direta)'); end if;
    if r.temporal_context is null then erros := erros || jsonb_build_object('codigo','contexto_temporal_ausente','onde',r.stable_id,'mensagem','pergunta sem contexto temporal');
    elsif not (r.temporal_context = any(contextos)) then erros := erros || jsonb_build_object('codigo','contexto_temporal_invalido','onde',r.stable_id,'mensagem','contexto temporal desconhecido: '||r.temporal_context); end if;
    -- sistema primario: exatamente um
    select count(*) filter (where a.destination_type = 'system'), count(*) filter (where a.destination_type = 'system' and a.role = 'primaria') into n, soma
      from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = r.stable_id;
    if n = 0 then erros := erros || jsonb_build_object('codigo','associacao_orfa','onde',r.stable_id,'mensagem','pergunta sem associacao a sistema');
    elsif soma = 0 then erros := erros || jsonb_build_object('codigo','primaria_ausente','onde',r.stable_id,'mensagem','pergunta sem sistema primario pontuavel');
    elsif soma > 1 then erros := erros || jsonb_build_object('codigo','primaria_multipla','onde',r.stable_id,'mensagem',soma||' sistemas primarios pontuaveis (o contrato exige exatamente um)'); end if;
    -- Triada: exatamente um eixo, o do bloco
    select count(*) into n from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = r.stable_id and a.destination_type = 'triad';
    if n = 0 then erros := erros || jsonb_build_object('codigo','triade_ausente','onde',r.stable_id,'mensagem','pergunta sem eixo da Triada');
    elsif n > 1 then erros := erros || jsonb_build_object('codigo','triade_multipla','onde',r.stable_id,'mensagem',n||' vinculos de Triada (o contrato exige exatamente um)');
    elsif exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.question_stable_id = r.stable_id and a.destination_type = 'triad'
        and a.destination_id <> case r.block when 'fisico' then 'fisico' when 'mental_emocional' then 'mental' else 'espiritual' end) then
      erros := erros || jsonb_build_object('codigo','triade_eixo_divergente','onde',r.stable_id,'mensagem','bloco '||r.block||' exige o eixo do proprio bloco'); end if;
  end loop;
  -- associacoes: referencia inexistente, papel, peso, conflito nao resolvido
  for r in select a.* from public.methodology_associations a where a.package_id = p_package_id loop
    if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id and q.stable_id = r.question_stable_id) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id,'mensagem','associacao aponta para pergunta que nao existe no pacote'); end if;
    if r.destination_type = 'system' and not (r.destination_id = any(sist)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','sistema de destino nao existe no pacote'); end if;
    if r.destination_type = 'triad' and not (r.destination_id = any(eixos)) then
      erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','eixo da Triada desconhecido'); end if;
    if r.destination_type = 'system' and (r.role is null or r.role not in ('primaria','secondary_contextual')) then
      erros := erros || jsonb_build_object('codigo','papel_invalido','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','papel de associacao desconhecido: '||coalesce(r.role,'AUSENTE')||' (permitidos: primaria, secondary_contextual)'); end if;
    if r.destination_type = 'system' and r.role = 'secondary_contextual' then
      if r.weight is not null then erros := erros || jsonb_build_object('codigo','secundaria_pontuavel','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','associacao secondary_contextual nao pontua: peso deve ser nulo'); end if;
    elsif r.weight is null then erros := erros || jsonb_build_object('codigo','peso_ausente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','peso obrigatorio ausente');
    elsif r.weight <= 0 then erros := erros || jsonb_build_object('codigo','peso_invalido','onde',r.question_stable_id||'→'||r.destination_id,'mensagem','peso deve ser positivo'); end if;
    if r.conflict then erros := erros || jsonb_build_object('codigo','conflito_pendente','onde',r.question_stable_id||'→'||r.destination_id,'mensagem',coalesce(r.conflict_note,'associacao em conflito nao resolvido')); end if;
  end loop;
  -- SNT pendente: perguntas marcadas pendentes de homologacao de vinculo (conflito em associacao primaria)
  if exists (select 1 from public.methodology_associations a where a.package_id = p_package_id and a.conflict and a.question_stable_id in ('SNT-101','SNT-501')) then
    erros := erros || jsonb_build_object('codigo','snt_pendente','onde','SNT-101/SNT-501','mensagem','vinculos de SNT-101/SNT-501 pendentes de homologacao');
  end if;
  -- faixas: limites exatos coerentes, textos sem termo causal
  for r in select * from public.methodology_ranges f where f.package_id = p_package_id loop
    if r.lower_bound_exact is not null and abs(public.metodologia_valor_exato(r.lower_bound_exact) - r.lower_bound) > 0.000000001 then
      erros := erros || jsonb_build_object('codigo','faixa_limite_inconsistente','onde',r.destination_id||'/'||r.label,'mensagem','lower_bound_exact "'||r.lower_bound_exact||'" nao corresponde a lower_bound'); end if;
    if r.upper_bound_exact is not null and abs(public.metodologia_valor_exato(r.upper_bound_exact) - r.upper_bound) > 0.000000001 then
      erros := erros || jsonb_build_object('codigo','faixa_limite_inconsistente','onde',r.destination_id||'/'||r.label,'mensagem','upper_bound_exact "'||r.upper_bound_exact||'" nao corresponde a upper_bound'); end if;
    foreach termo in array causais loop
      if lower(coalesce(r.message_nutri,'') || ' ' || coalesce(r.message_paciente,'') || ' ' || coalesce(r.label,'')) like '%' || termo || '%' then
        erros := erros || jsonb_build_object('codigo','texto_causal','onde',r.destination_id||'/'||r.label,'mensagem','mensagem contem termo causal proibido: '||termo); end if;
    end loop;
  end loop;
  -- faixas: ordem, lacuna, sobreposicao, cobertura do dominio 0..10 por destino
  for r in select distinct a.destination_type, a.destination_id from public.methodology_ranges a where a.package_id = p_package_id loop
    ant := null; n := 0;
    for r2 in select * from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = r.destination_type and f.destination_id = r.destination_id order by f.lower_bound, f.upper_bound loop
      n := n + 1;
      if r2.lower_bound >= r2.upper_bound then erros := erros || jsonb_build_object('codigo','faixa_ordem_invalida','onde',r.destination_id||'/'||r2.label,'mensagem','limite inferior >= superior'); end if;
      if n > 1 then
        if r2.lower_bound < ant.upper_bound or (r2.lower_bound = ant.upper_bound and r2.lower_inclusive and ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_sobreposta','onde',r.destination_id||'/'||r2.label,'mensagem','sobrepoe "'||ant.label||'"');
        elsif r2.lower_bound > ant.upper_bound or (r2.lower_bound = ant.upper_bound and not r2.lower_inclusive and not ant.upper_inclusive) then
          erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','lacuna entre "'||ant.label||'" e "'||r2.label||'"');
        end if;
      elsif r2.lower_bound > 0 or not r2.lower_inclusive then
        erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||r2.label,'mensagem','dominio nao comeca em 0 inclusivo');
      end if;
      ant := r2;
    end loop;
    if n > 0 and r.destination_type <> 'index' and (ant.upper_bound < 10 or not ant.upper_inclusive) then
      erros := erros || jsonb_build_object('codigo','faixa_lacuna','onde',r.destination_id||'/'||ant.label,'mensagem','dominio nao termina em 10 inclusivo');
    end if;
  end loop;
  -- sistema sem faixa; textos de sistema
  for r in select s.* from public.methodology_systems s where s.package_id = p_package_id loop
    if not exists (select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.destination_type = 'system' and f.destination_id = r.code) then
      erros := erros || jsonb_build_object('codigo','faixa_ausente','onde',r.code,'mensagem','sistema sem faixas'); end if;
    foreach termo in array causais loop
      if lower(coalesce(r.name,'') || ' ' || coalesce(r.public_text,'') || ' ' || coalesce(r.definition,'') || ' ' || coalesce(r.emotional_pattern,'') || ' ' || coalesce(r.spiritual_impact,'')) like '%' || termo || '%' then
        erros := erros || jsonb_build_object('codigo','texto_causal','onde',r.code,'mensagem','texto do sistema contem termo causal proibido: '||termo); end if;
    end loop;
    if r.emotional_pattern is not null or r.spiritual_impact is not null then
      erros := erros || jsonb_build_object('codigo','texto_causal_legado','onde',r.code,'mensagem','padrao emocional / impacto espiritual recuperados nao entram em conteudo oficial (preservar em legacy)'); end if;
  end loop;
  -- regras obrigatorias: ausencia (nunca zero; so denominador dos respondidos; cobertura minima explicita)
  select x.payload into aus from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'absence' limit 1;
  if aus is null or not (aus ? 'denominador' and aus ? 'cobertura_minima' and aus ? 'recusado' and aus ? 'nao_aplicavel' and aus ? 'minimos')
      or jsonb_typeof(aus->'denominador') = 'null' or jsonb_typeof(aus->'cobertura_minima') = 'null' then
    erros := erros || jsonb_build_object('codigo','politica_parcialidade_ausente','onde','absence','mensagem','politica de ausencia/parcialidade incompleta (denominador, cobertura_minima, recusado, nao_aplicavel, minimos)');
  else
    if aus->>'denominador' <> 'respondidos' then
      erros := erros || jsonb_build_object('codigo','politica_parcialidade_invalida','onde','absence','mensagem','denominador "'||(aus->>'denominador')||'" nao suportado (contrato: respondidos)'); end if;
    if jsonb_typeof(aus->'cobertura_minima') <> 'number' or (aus->>'cobertura_minima')::numeric <= 0 or (aus->>'cobertura_minima')::numeric > 1 then
      erros := erros || jsonb_build_object('codigo','politica_parcialidade_invalida','onde','absence','mensagem','cobertura_minima deve ser numero em (0, 1]'); end if;
    if aus->>'em_branco' in ('zero','0') or aus->>'recusado' in ('zero','0') or aus->>'nao_aplicavel' in ('zero','0') or aus->>'conta_como_zero' = 'true' then
      erros := erros || jsonb_build_object('codigo','politica_parcialidade_invalida','onde','absence','mensagem','ausencia nao e zero'); end if;
  end if;
  select x.payload into idx from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'index' and x.target = 'global';
  if idx is null or not (idx ? 'alphas') or not (idx ? 'elegibilidade') or not (idx ? 'indice_parcial') then
    erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','configuracao do Indice incompleta (alphas, elegibilidade, indice_parcial)');
  else
    soma := 0;
    for r2 in select key, value from jsonb_each(idx->'alphas') loop
      if not (r2.key = any(sist)) then erros := erros || jsonb_build_object('codigo','referencia_inexistente','onde','index/'||r2.key,'mensagem','alpha para sistema inexistente'); end if;
      if jsonb_typeof(r2.value) <> 'number' then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.key,'mensagem','alpha ausente'); else soma := soma + (r2.value)::numeric; end if;
    end loop;
    for r2 in select unnest(sist) as code loop
      if not (idx->'alphas' ? r2.code) then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index/'||r2.code,'mensagem','sistema sem alpha'); end if;
    end loop;
    if abs(soma - 1) > 0.0001 then erros := erros || jsonb_build_object('codigo','indice_incompleto','onde','index','mensagem','alphas somam '||soma||', esperado 1'); end if;
    if idx->'indice_parcial' is distinct from 'false'::jsonb then erros := erros || jsonb_build_object('codigo','indice_parcial_proibido','onde','index','mensagem','Indice parcial nao existe no contrato (indice_parcial deve ser false)'); end if;
    if idx->'renormalizacao' = 'true'::jsonb then erros := erros || jsonb_build_object('codigo','indice_parcial_proibido','onde','index','mensagem','renormalizacao do Indice proibida'); end if;
  end if;
  for r in select unnest(eixos) as eixo loop
    select x.payload into tri from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'triad' and x.target = r.eixo;
    if tri is null or not (tri ? 'contribuicao' and tri ? 'escala' and tri ? 'elegibilidade' and tri ? 'agregacao') then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','configuracao do eixo incompleta (contribuicao, escala, elegibilidade, agregacao)');
    elsif jsonb_typeof(tri->'cobertura_minima') is distinct from 'number' or (tri->>'cobertura_minima')::numeric <= 0 or (tri->>'cobertura_minima')::numeric > 1 then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','cobertura_minima do eixo deve ser numero em (0, 1]');
    elsif tri->'nota_global' = 'true'::jsonb then
      erros := erros || jsonb_build_object('codigo','triada_incompleta','onde','triad/'||r.eixo,'mensagem','nota global da Triada nao existe no contrato');
    end if;
  end loop;
  for r in select unnest(sist) as code loop
    if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'scoring' and x.target = r.code and x.payload ? 'formula') then
      erros := erros || jsonb_build_object('codigo','regra_incompleta','onde','scoring/'||r.code,'mensagem','sistema sem regra de pontuacao'); end if;
  end loop;
  -- sugestao automatica: nenhuma oficial
  for r in select x.target, x.payload from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'suggestion' loop
    if r.payload->'automatica' is distinct from 'false'::jsonb then
      erros := erros || jsonb_build_object('codigo','sugestao_automatica_proibida','onde','suggestion/'||r.target,'mensagem','nenhuma combinacao ou sugestao automatica e oficial (automatica deve ser false)'); end if;
  end loop;
  -- exemplo deterministico com resultado esperado (a conferencia numerica e do motor: PacoteMetodologico.validar / testes)
  if not exists (select 1 from public.methodology_rules x where x.package_id = p_package_id and x.rule_type = 'example' and x.payload ? 'entrada' and x.payload ? 'esperado' and jsonb_typeof(x.payload->'esperado') <> 'null') then
    erros := erros || jsonb_build_object('codigo','exemplo_sem_resultado','onde','example','mensagem','nenhum exemplo deterministico com resultado esperado');
  end if;
  -- elementos nao aprovados individualmente
  select count(*) into n from (
    select 1 from public.methodology_questions q where q.package_id = p_package_id and q.status <> 'aprovado'
    union all select 1 from public.methodology_associations a where a.package_id = p_package_id and a.status <> 'aprovado'
    union all select 1 from public.methodology_ranges f where f.package_id = p_package_id and f.status <> 'aprovado'
    union all select 1 from public.methodology_systems s where s.package_id = p_package_id and s.status <> 'aprovado'
    union all select 1 from public.methodology_scales e where e.package_id = p_package_id and e.status <> 'aprovado'
    union all select 1 from public.methodology_rules x where x.package_id = p_package_id and x.status <> 'aprovado') z;
  if n > 0 then erros := erros || jsonb_build_object('codigo','elemento_nao_aprovado','onde','pacote','mensagem',n||' elemento(s) com status diferente de aprovado'); end if;
  if not exists (select 1 from public.methodology_questions q where q.package_id = p_package_id) then
    erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem perguntas'); end if;
  if coalesce(array_length(sist,1),0) = 0 then erros := erros || jsonb_build_object('codigo','vazio','onde','pacote','mensagem','pacote sem sistemas'); end if;
  return jsonb_build_object('erros', erros, 'avisos', avisos, 'publicavel', jsonb_array_length(erros) = 0, 'total_erros', jsonb_array_length(erros));
end;
$$;
revoke all on function public.validar_pacote_metodologico(uuid) from public, anon;
grant execute on function public.validar_pacote_metodologico(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261001210000_dupla_aprovacao_metodologica.sql
-- ---------------------------------------------------------------------------
-- V1 — HOMOLOGACAO METODOLOGICA COM DUPLA APROVACAO (ordem obrigatoria).
-- NAO APLICADA em producao. Entra depois de 130000..200000.
--
--   Aprovacao 1: responsavel = Daniel  · papel = responsavel primario pela homologacao
--   Aprovacao 2: responsavel = Rodrigo · papel = segundo responsavel / revisao final
--
-- Regras:
--   1. Cada aprovacao e um ATO HUMANO registrado pela RPC registrar_aprovacao_metodologica,
--      sobre um package_id, uma version e um content_hash (calculado no servidor e
--      CONFERIDO contra o hash que a pessoa viu). Nada cria aprovacao automaticamente.
--   2. Aprovacao 2 so existe sobre uma Aprovacao 1 valida do MESMO package_id, version e
--      content_hash.
--   3. Se o pacote mudar (qualquer filha inserida/alterada/apagada, ou code/version do
--      pacote), as aprovacoes vigentes daquela versao sao INVALIDADAS (ficam como historico,
--      com motivo): o ciclo recomeca pela Aprovacao 1.
--   4. aprovar_pacote_metodologico so passa o pacote a 'aprovado' com as duas aprovacoes
--      validas sobre o conteudo atual. O registro de homologacao nomeia Daniel e Rodrigo.
--   5. Nenhuma aprovacao (nem registro de homologacao) pode ser atribuida a
--      "Liderança do método HOLOSCAN".

-- ============================================================================
-- 1. HASH DO CONTEUDO (o mesmo da aprovacao final; agora reutilizavel)
-- ============================================================================
create or replace function public.metodologia_hash_conteudo(p_package_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select encode(sha256(convert_to(jsonb_build_object(
    'questions', (select coalesce(jsonb_agg(to_jsonb(q) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' - 'edition_id' order by q.stable_id), '[]') from public.methodology_questions q where q.package_id = p_package_id),
    'associations', (select coalesce(jsonb_agg(to_jsonb(a) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by a.question_stable_id, a.destination_type, a.destination_id, a.role), '[]') from public.methodology_associations a where a.package_id = p_package_id),
    'ranges', (select coalesce(jsonb_agg(to_jsonb(f) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by f.destination_type, f.destination_id, f.lower_bound), '[]') from public.methodology_ranges f where f.package_id = p_package_id),
    'systems', (select coalesce(jsonb_agg(to_jsonb(s) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by s.code), '[]') from public.methodology_systems s where s.package_id = p_package_id),
    'scales', (select coalesce(jsonb_agg(to_jsonb(e) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by e.code), '[]') from public.methodology_scales e where e.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(to_jsonb(x) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by x.rule_type, x.target), '[]') from public.methodology_rules x where x.package_id = p_package_id),
    'editions', (select coalesce(jsonb_agg(to_jsonb(d) - 'id' - 'created_at' - 'updated_at' - 'nutritionist_id' - 'package_id' order by d.code, d.version), '[]') from public.methodology_questionnaire_editions d where d.package_id = p_package_id)
  )::text, 'UTF8')), 'hex')
$$;
revoke all on function public.metodologia_hash_conteudo(uuid) from public, anon;
grant execute on function public.metodologia_hash_conteudo(uuid) to authenticated;

-- ============================================================================
-- 2. APROVACOES
-- ============================================================================
create table public.methodology_package_approvals (
  id                 uuid primary key default gen_random_uuid(),
  nutritionist_id    uuid not null default auth.uid() references auth.users(id),
  package_id         uuid not null,
  package_version    integer not null,
  content_hash       text not null,
  step               smallint not null,
  role               text not null,
  responsible        text not null,
  justification      text not null,
  approved_by        uuid not null default auth.uid() references auth.users(id),
  approved_at        timestamptz not null default now(),
  invalidated_at     timestamptz,
  invalidated_reason text,
  created_at         timestamptz not null default now(),
  constraint methodology_approvals_ordem check (
    (step = 1 and role = 'responsavel_primario' and responsible = 'Daniel')
    or (step = 2 and role = 'revisao_final' and responsible = 'Rodrigo')),
  constraint methodology_approvals_sem_lideranca check (responsible !~* 'lideran'),
  constraint methodology_approvals_justificativa check (length(btrim(justification)) > 0),
  constraint methodology_approvals_hash check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint methodology_approvals_invalidacao check ((invalidated_at is null) = (invalidated_reason is null)),
  constraint methodology_approvals_package_fk foreign key (package_id, nutritionist_id) references public.methodology_packages (id, nutritionist_id) on delete restrict
);
-- no maximo UMA aprovacao vigente por etapa e pacote
create unique index methodology_approvals_uma_vigente on public.methodology_package_approvals (package_id, step) where invalidated_at is null;
create index methodology_approvals_pacote_idx on public.methodology_package_approvals (package_id, approved_at);

-- registro de homologacao tambem nunca e da "Liderança"
alter table public.methodology_homologation_records add constraint methodology_records_sem_lideranca check (responsible !~* 'lideran');

-- aprovacao nao muda (so pode ser invalidada uma vez) e nunca e apagada
create or replace function public.proteger_aprovacao_metodologica()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'aprovacao metodologica e historico: nao e apagada' using errcode = 'P0001', hint = 'aprovacao_imutavel';
  end if;
  if old.invalidated_at is not null or new.invalidated_at is null
     or (to_jsonb(old) - 'invalidated_at' - 'invalidated_reason') <> (to_jsonb(new) - 'invalidated_at' - 'invalidated_reason') then
    raise exception 'aprovacao metodologica e imutavel: so pode ser invalidada (uma vez)' using errcode = 'P0001', hint = 'aprovacao_imutavel';
  end if;
  return new;
end;
$$;
create trigger methodology_approvals_proteger before update or delete on public.methodology_package_approvals
  for each row execute function public.proteger_aprovacao_metodologica();

-- Pacote mudou -> aprovacoes vigentes daquela versao deixam de valer
create or replace function public.metodologia_invalidar_aprovacoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_pid uuid;
begin
  if tg_table_name = 'methodology_packages' then
    if new.version is not distinct from old.version and new.code is not distinct from old.code then return new; end if;
    v_pid := new.id;
  else
    v_pid := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
  end if;
  update public.methodology_package_approvals
     set invalidated_at = now(), invalidated_reason = 'pacote alterado depois da aprovacao (' || tg_table_name || ' ' || lower(tg_op) || ')'
   where package_id = v_pid and invalidated_at is null;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.metodologia_invalidar_aprovacoes() from public, anon, authenticated;
create trigger methodology_packages_invalida_aprovacoes after update on public.methodology_packages for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_editions_invalida_aprovacoes after insert or update or delete on public.methodology_questionnaire_editions for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_scales_invalida_aprovacoes after insert or update or delete on public.methodology_scales for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_systems_invalida_aprovacoes after insert or update or delete on public.methodology_systems for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_questions_invalida_aprovacoes after insert or update or delete on public.methodology_questions for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_associations_invalida_aprovacoes after insert or update or delete on public.methodology_associations for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_ranges_invalida_aprovacoes after insert or update or delete on public.methodology_ranges for each row execute function public.metodologia_invalidar_aprovacoes();
create trigger methodology_rules_invalida_aprovacoes after insert or update or delete on public.methodology_rules for each row execute function public.metodologia_invalidar_aprovacoes();

-- RLS: leitura do dono (e de pacote aprovado/retirado); escrita SO pela RPC
alter table public.methodology_package_approvals enable row level security;
create policy methodology_approvals_select on public.methodology_package_approvals for select to authenticated
  using (nutritionist_id = (select auth.uid()) or exists (select 1 from public.methodology_packages p where p.id = methodology_package_approvals.package_id and p.status in ('aprovado','retirado')));
revoke all on table public.methodology_package_approvals from public, anon, authenticated;
grant select on table public.methodology_package_approvals to authenticated;

-- ============================================================================
-- 3. REGISTRAR UMA APROVACAO (ato humano, uma etapa por chamada)
-- ============================================================================
-- p_content_hash: o hash que a pessoa conferiu na tela; tem de ser o do conteudo atual.
create or replace function public.registrar_aprovacao_metodologica(p_package_id uuid, p_etapa integer, p_responsavel text, p_justificativa text, p_content_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; h text; v jsonb; resp text := btrim(coalesce(p_responsavel, '')); a1 public.methodology_package_approvals%rowtype; novo uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario pela homologacao (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e do segundo responsavel / revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'aprovacao bloqueada pelo validador: % erro(s)', v->>'total_erros' using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  -- aprovacoes vigentes de outra versao ou outro conteudo nao valem mais
  update public.methodology_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if p_etapa = 1 then
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (uid, p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid) returning id into novo;
  else
    select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) valida sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (uid, p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', case when p_etapa = 1 then 'Daniel' else 'Rodrigo' end, 'status_pacote', pk.status);
end;
$$;
revoke all on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) from public, anon;
grant execute on function public.registrar_aprovacao_metodologica(uuid, integer, text, text, text) to authenticated;

-- ============================================================================
-- 4. APROVAR (homologar) — so com as duas aprovacoes sobre o conteudo atual
-- ============================================================================
-- p_registro (opcional): { effective_from? }. O responsavel NAO vem do chamador: vem das aprovacoes.
create or replace function public.aprovar_pacote_metodologico(p_package_id uuid, p_registro jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; v jsonb; h text; a1 public.methodology_package_approvals%rowtype; a2 public.methodology_package_approvals%rowtype; resp text;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id and p.nutritionist_id = uid for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser aprovado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'publicacao bloqueada pelo validador: % erro(s) — %', v->>'total_erros', left((v->'erros')::text, 400) using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  select * into a2 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null;
  if a1.id is null or a2.id is null or a1.package_version <> pk.version or a2.package_version <> pk.version or a1.content_hash <> h or a2.content_hash <> h or a2.approved_at < a1.approved_at then
    raise exception 'homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) validas sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  resp := 'Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)';
  insert into public.methodology_homologation_records (nutritionist_id, package_id, topic, element, version, decision, responsible, decided_at, source, justification, evidence)
  values (uid, p_package_id, 'pacote', pk.code, pk.version::text, 'aprovado', resp, current_date, 'dupla aprovacao',
    'Aprovação 1: ' || a1.justification || ' | Aprovação 2: ' || a2.justification,
    'aprovacoes ' || a1.id || ' e ' || a2.id || '; content_hash ' || h || '; validar_pacote_metodologico: 0 erros');
  perform set_config('holohacking.aprovacao_rpc', p_package_id::text, true);
  update public.methodology_packages set status = 'aprovado', approved_at = now(), approved_by = a2.approved_by, reviewed_by = a2.approved_by, reviewed_at = a2.approved_at,
    responsible = resp, justification = coalesce(justification, 'dupla aprovacao'),
    effective_from = coalesce((p_registro->>'effective_from')::date, effective_from, current_date), content_hash = h
    where id = p_package_id;
  perform set_config('holohacking.aprovacao_rpc', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'aprovacao_1', a1.id, 'aprovacao_2', a2.id, 'validacao', v);
end;
$$;
revoke all on function public.aprovar_pacote_metodologico(uuid, jsonb) from public, anon;
grant execute on function public.aprovar_pacote_metodologico(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261001220000_etapa5_laboratorio.sql
-- ---------------------------------------------------------------------------
-- V1, Etapa 5 — LABORATORIO: CATALOGO-BASE (45), COLETAS, RESULTADOS, COMPONENTES,
-- REFERENCIAS, CONVERSOES, CALCULOS DERIVADOS E INFRAESTRUTURA DA LEITURA INTEGRADA.
-- NAO APLICADA em producao. Entra depois de 130000..210000.
--
-- Autoridade: Documento Mestre (§21–§24, §34.2, §43.2). O AS-IS (exames.csv,
-- confrontar(), ideal_min/max, sistema_no_momento) e preservado como HISTORICO
-- e sai da saida oficial. Nada aqui inventa referencia, faixa, conversao,
-- vinculo exame→sistema, vinculo exame→dominio, regra de convergencia, score,
-- painel obrigatorio, interpretacao ou calculo derivado.
--
--   1. lab_exam_catalog              45 exames-base, configuracao GLOBAL, somente leitura
--   2. lab_custom_exams              exame customizado da nutricionista (nao conta nos 45)
--   3. lab_collections (evolui)      identidade = id; estado rascunho|salvo|revisado; revisao;
--                                    operation_id idempotente; encounter_id explicito; documento
--   4. lab_results (evolui)          valor ORIGINAL preservado; numerico | censurado | qualitativo;
--                                    variante/metodo/material; referencia DO LAUDO; legado em legacy_*
--   5. lab_result_components         componentes de exame composto (Hemograma)
--   6. lab_method_references         referencia METODOLOGICA versionada — VAZIA
--   7. lab_unit_conversion_rules     conversoes validadas — VAZIA
--   8. lab_derived_calculations      calculos derivados versionados — VAZIA
--   9. integrated_reading_*          pacote de regras LI-V1 (rascunho, SEM dominios/vinculos/regras),
--                                    leituras salvas congeladas (snapshot + revisao)
--  10. protecoes, RLS, RPCs (salvar_coleta_laboratorial, revisar_coleta_laboratorial,
--      marcar_coleta_revisada, salvar_leitura_integrada) e migracao deterministica do legado.

-- ============================================================================
-- 1. CATALOGO-BASE (45) — global, somente leitura
-- ============================================================================
create table public.lab_exam_catalog (
  code             text primary key,
  position         integer not null unique,
  canonical_name   text not null,
  category         text not null,
  aliases          jsonb not null default '[]'::jsonb,
  composite        boolean not null default false,
  status           text not null default 'ativo',
  catalog_version  text not null,
  created_at       timestamptz not null default now(),
  constraint lab_exam_catalog_code_formato check (code ~ '^LAB-0(0[1-9]|[1-3][0-9]|4[0-5])$'),
  constraint lab_exam_catalog_nome_unico unique (canonical_name),
  constraint lab_exam_catalog_status check (status in ('ativo','retirado'))
);
insert into public.lab_exam_catalog (code, position, canonical_name, category, aliases, composite, catalog_version) values
  ('LAB-001', 1, 'Hemograma completo', 'Hematologia', '[]', true, 'catalogo-lab-v1.0'),
  ('LAB-002', 2, 'Glicemia de jejum', 'Glicêmico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-003', 3, 'Insulina basal', 'Glicêmico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-004', 4, 'Hemoglobina glicada', 'Glicêmico', '["HbA1c"]', false, 'catalogo-lab-v1.0'),
  ('LAB-005', 5, 'Triglicerídeos', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-006', 6, 'Colesterol total', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-007', 7, 'LDL colesterol', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-008', 8, 'LDL oxidada', 'Lipídico especializado', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-009', 9, 'HDL colesterol', 'Lipídico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-010', 10, 'Creatinina', 'Renal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-011', 11, 'Ureia', 'Renal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-012', 12, 'TGO ou AST', 'Hepático', '["TGO","AST"]', false, 'catalogo-lab-v1.0'),
  ('LAB-013', 13, 'TGP ou ALT', 'Hepático', '["TGP","ALT"]', false, 'catalogo-lab-v1.0'),
  ('LAB-014', 14, 'Bilirrubina total', 'Hepático', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-015', 15, 'Gama GT ou GGT', 'Hepático', '["Gama GT","GGT"]', false, 'catalogo-lab-v1.0'),
  ('LAB-016', 16, 'PCR', 'Inflamação', '["Proteína C reativa"]', false, 'catalogo-lab-v1.0'),
  ('LAB-017', 17, 'Homocisteína', 'Investigação contextual', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-018', 18, 'Fibrinogênio', 'Investigação contextual', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-019', 19, 'Sódio', 'Eletrólitos', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-020', 20, 'Potássio', 'Eletrólitos', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-021', 21, 'Magnésio', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-022', 22, 'Zinco', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-023', 23, 'Selênio', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-024', 24, 'Fósforo', 'Minerais', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-025', 25, 'Vitamina B12', 'Vitaminas', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-026', 26, 'Ácido fólico', 'Vitaminas', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-027', 27, 'Alumínio', 'Elementos especializados', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-028', 28, 'Ferro sérico', 'Ferro', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-029', 29, 'Ferritina', 'Ferro', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-030', 30, 'TSH', 'Tireoide', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-031', 31, 'T4 livre', 'Tireoide', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-032', 32, 'T3 livre', 'Tireoide', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-033', 33, 'Ácido úrico', 'Metabólico', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-034', 34, 'Paratormônio ou PTH', 'Metabolismo mineral', '["Paratormônio","PTH"]', false, 'catalogo-lab-v1.0'),
  ('LAB-035', 35, '25 OH vitamina D', 'Vitaminas', '["Vitamina D 25-OH","25-hidroxivitamina D"]', false, 'catalogo-lab-v1.0'),
  ('LAB-036', 36, 'DHT', 'Hormonal', '["Di-hidrotestosterona"]', false, 'catalogo-lab-v1.0'),
  ('LAB-037', 37, 'Testosterona livre', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-038', 38, 'Testosterona total', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-039', 39, 'SHBG', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-040', 40, 'Progesterona', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-041', 41, 'Estradiol', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-042', 42, 'LH', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-043', 43, 'FSH', 'Hormonal', '[]', false, 'catalogo-lab-v1.0'),
  ('LAB-044', 44, 'CK', 'Muscular', '["Creatina quinase","Creatinoquinase"]', false, 'catalogo-lab-v1.0'),
  ('LAB-045', 45, 'Cálcio ionizado sérico', 'Metabolismo mineral', '["Cálcio iônico"]', false, 'catalogo-lab-v1.0');
do $$ begin
  if (select count(*) from public.lab_exam_catalog) <> 45 then raise exception 'catalogo-base deve ter exatamente 45 exames'; end if;
end $$;
alter table public.lab_exam_catalog enable row level security;
create policy lab_exam_catalog_select on public.lab_exam_catalog for select to authenticated using (true);
revoke all on table public.lab_exam_catalog from public, anon, authenticated;
grant select on table public.lab_exam_catalog to authenticated;
-- catalogo-base muda SO por migration: nenhuma escrita pela aplicacao
create or replace function public.proteger_catalogo_laboratorial()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'catalogo-base laboratorial e configuracao global: muda so por migration versionada' using errcode = 'P0001', hint = 'catalogo_imutavel'; end; $$;
create trigger lab_exam_catalog_proteger before insert or update or delete on public.lab_exam_catalog for each row execute function public.proteger_catalogo_laboratorial();

-- ============================================================================
-- 2. EXAME CUSTOMIZADO (escopo da nutricionista; nao entra nos 45)
-- ============================================================================
create table public.lab_custom_exams (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid() references auth.users(id),
  name             text not null,
  aliases          jsonb not null default '[]'::jsonb,
  notes            text,
  status           text not null default 'ativo',
  created_by       uuid default auth.uid() references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint lab_custom_exams_nome_nao_vazio check (length(btrim(name)) > 0),
  constraint lab_custom_exams_status check (status in ('ativo','inativo')),
  constraint lab_custom_exams_id_nutritionist_unique unique (id, nutritionist_id)
);
create unique index lab_custom_exams_nome_unico on public.lab_custom_exams (nutritionist_id, lower(btrim(name)));
create trigger lab_custom_exams_tocar_updated_at before update on public.lab_custom_exams for each row execute function public.tocar_updated_at();
alter table public.lab_custom_exams enable row level security;
create policy lab_custom_exams_select on public.lab_custom_exams for select to authenticated using (nutritionist_id = (select auth.uid()));
create policy lab_custom_exams_insert on public.lab_custom_exams for insert to authenticated with check (nutritionist_id = (select auth.uid()));
create policy lab_custom_exams_update on public.lab_custom_exams for update to authenticated using (nutritionist_id = (select auth.uid())) with check (nutritionist_id = (select auth.uid()));
revoke all on table public.lab_custom_exams from public, anon;
grant select, insert, update on table public.lab_custom_exams to authenticated;

-- ============================================================================
-- 3. COLETAS — identidade e o id; estado; revisao; idempotencia; documento
-- ============================================================================
-- coletado_em E a clinical_date (data clinica da coleta); created_at/updated_at sao registro.
alter table public.documents add constraint documents_id_nutritionist_unique unique (id, nutritionist_id);
alter table public.lab_collections
  add column if not exists clinical_time   time,
  add column if not exists state           text not null default 'salvo',
  add column if not exists source          text not null default 'legacy_panel',   -- escrita direta / RPC legada = painel legado; as RPCs V1 gravam source explicito
  add column if not exists operation_id    uuid,
  add column if not exists revision        integer not null default 1,
  add column if not exists created_by      uuid references auth.users(id),
  add column if not exists reviewed_at     timestamptz,
  add column if not exists reviewed_by     uuid references auth.users(id),
  add column if not exists revision_note   text,
  add column if not exists supersedes_id   uuid references public.lab_collections(id) on delete restrict,
  add column if not exists superseded_at   timestamptz,
  add column if not exists document_id     uuid;
alter table public.lab_collections add constraint lab_collections_state check (state in ('rascunho','salvo','revisado'));
alter table public.lab_collections add constraint lab_collections_source check (source in ('manual','legacy_panel','legacy_migrated','extracted_draft','revision'));
alter table public.lab_collections add constraint lab_collections_revision_positiva check (revision >= 1);
alter table public.lab_collections add constraint lab_collections_revisado_completo check (state <> 'revisado' or (reviewed_at is not null and reviewed_by is not null));
alter table public.lab_collections add constraint lab_collections_document_fk foreign key (document_id, nutritionist_id) references public.documents (id, nutritionist_id) on delete set null;
alter table public.lab_collections add constraint lab_collections_id_nutritionist_unique unique (id, nutritionist_id);
create unique index lab_collections_operation_unica on public.lab_collections (nutritionist_id, operation_id) where operation_id is not null;
create index lab_collections_supersedes_idx on public.lab_collections (supersedes_id) where supersedes_id is not null;
-- coletas que ja existem vieram do painel legado (valores locais): preservadas como tal (o default acima ja as marca; o state fica 'salvo')
update public.lab_collections set source = 'legacy_panel', state = 'salvo' where source <> 'legacy_panel' or state <> 'salvo';

-- ============================================================================
-- 4. RESULTADOS — valor original, variante, metodo, material, referencia do laudo
-- ============================================================================
alter table public.lab_results
  alter column valor drop not null,
  alter column unidade_no_momento drop not null,
  alter column ideal_min_no_momento drop not null,
  alter column ideal_max_no_momento drop not null,
  alter column nome_exame_no_momento drop not null,
  alter column sistema_no_momento drop not null,
  alter column exame_id drop not null;
alter table public.lab_results drop constraint lab_results_faixa_coerente;
alter table public.lab_results add constraint lab_results_faixa_coerente check (ideal_min_no_momento is null or ideal_max_no_momento is null or ideal_min_no_momento <= ideal_max_no_momento);
alter table public.lab_results drop constraint lab_results_sistema_valido;
alter table public.lab_results add constraint lab_results_sistema_valido check (sistema_no_momento is null or sistema_no_momento in ('fungico','acido_inflamatorio','metabolico','detox_linfatico','mental_emocional_espiritual'));
alter table public.lab_results
  add column if not exists exam_code                   text references public.lab_exam_catalog(code),
  add column if not exists custom_exam_id              uuid references public.lab_custom_exams(id) on delete restrict,
  add column if not exists variant                     text,
  add column if not exists value_original_text         text,
  add column if not exists numeric_value               numeric,
  add column if not exists qualifier                   text,
  add column if not exists censor_limit                numeric,
  add column if not exists unit_original               text,
  add column if not exists method                      text,
  add column if not exists material                    text,
  add column if not exists report_reference_text       text,
  add column if not exists report_reference_min        numeric,
  add column if not exists report_reference_max        numeric,
  add column if not exists report_reference_operator   text,
  add column if not exists report_reference_unit       text,
  add column if not exists report_reference_population text,
  add column if not exists reference_status            text not null default 'missing',
  add column if not exists reference_source            text not null default 'laudo',
  add column if not exists origin                      text not null default 'manual',
  add column if not exists notes                       text,
  add column if not exists result_date                 date,
  add column if not exists legacy_exame_id             text,
  add column if not exists legacy_ideal_min            numeric,
  add column if not exists legacy_ideal_max            numeric,
  add column if not exists legacy_sistema              text,
  add column if not exists requires_manual_mapping     boolean not null default false,
  add column if not exists mapping_note                text,
  add column if not exists position                    integer,
  add column if not exists updated_at                  timestamptz not null default now();
alter table public.lab_results add constraint lab_results_qualifier check (qualifier is null or qualifier in ('eq','lt','lte','gt','gte','text'));
alter table public.lab_results add constraint lab_results_numerico_so_exato check (numeric_value is null or qualifier = 'eq');
alter table public.lab_results add constraint lab_results_censurado_sem_numero check (qualifier not in ('lt','lte','gt','gte') or numeric_value is null);
alter table public.lab_results add constraint lab_results_operator check (report_reference_operator is null or report_reference_operator in ('range','lt','lte','gt','gte'));
alter table public.lab_results add constraint lab_results_reference_status check (reference_status in ('informed','missing'));
alter table public.lab_results add constraint lab_results_reference_source check (reference_source in ('laudo','metodologica'));
alter table public.lab_results add constraint lab_results_origin check (origin in ('manual','legacy_migrated','additional_legacy','extracted_draft'));
alter table public.lab_results add constraint lab_results_um_exame check (num_nonnulls(exam_code, custom_exam_id) <= 1);
alter table public.lab_results add constraint lab_results_identidade check (exam_code is not null or custom_exam_id is not null or origin in ('additional_legacy','legacy_migrated') or requires_manual_mapping);
alter table public.lab_results add constraint lab_results_referencia_coerente check (report_reference_min is null or report_reference_max is null or report_reference_min <= report_reference_max);
-- referencia informada = ao menos texto ou limite; ausente = nada (e NAO significa "dentro")
alter table public.lab_results add constraint lab_results_referencia_informada check (
  (reference_status = 'informed' and (report_reference_text is not null or report_reference_min is not null or report_reference_max is not null))
  or (reference_status = 'missing' and report_reference_text is null and report_reference_min is null and report_reference_max is null));
-- um resultado por identidade (exame + variante + material) na mesma coleta; legado continua pela unique (collection_id, exame_id)
create unique index lab_results_identidade_catalogo on public.lab_results (collection_id, exam_code, coalesce(variant,''), coalesce(material,'')) where exam_code is not null;
create unique index lab_results_identidade_custom on public.lab_results (collection_id, custom_exam_id, coalesce(variant,''), coalesce(material,'')) where custom_exam_id is not null;
create trigger lab_results_tocar_updated_at before update on public.lab_results for each row execute function public.tocar_updated_at();

-- migracao DETERMINISTICA do legado (so onde a identidade e inequivoca; variante preservada; o resto fica marcado).
-- A mesma tabela de mapeamento vale para a migracao e para o painel legado que ainda grava exame_id/valor
-- (sincronizacao.js, salvar_coleta_exames): um unico lugar, sem adivinhar.
create or replace function public.lab_mapear_legado(p_exame_id text,
  out exam_code text, out variant text, out origin text, out requires_manual_mapping boolean, out mapping_note text)
language sql immutable set search_path = '' as $$
  with mapa(exame_id, exam_code, variant, manual, nota) as (values
    ('EXA-002','LAB-016','ultrassensivel',false,null), ('EXA-004','LAB-033',null,false,null), ('EXA-005','LAB-002',null,false,null),
    ('EXA-006',null,null,true,'Insulina de jejum × Insulina basal (LAB-003): confirmar identidade'),
    ('EXA-008','LAB-004',null,false,null), ('EXA-009','LAB-005',null,false,null), ('EXA-010','LAB-009',null,false,null), ('EXA-011','LAB-030',null,false,null),
    ('EXA-012','LAB-031',null,false,null), ('EXA-013','LAB-012',null,false,null), ('EXA-014','LAB-013',null,false,null), ('EXA-015','LAB-015',null,false,null),
    ('EXA-016','LAB-014',null,false,null), ('EXA-017','LAB-011',null,false,null), ('EXA-018','LAB-010',null,false,null), ('EXA-019','LAB-035',null,false,null),
    ('EXA-020','LAB-025',null,false,null), ('EXA-021','LAB-029',null,false,null), ('EXA-022','LAB-021','eritrocitario',false,null), ('EXA-023','LAB-017',null,false,null))
  select m.exam_code, m.variant,
    case when p_exame_id in ('EXA-001','EXA-003','EXA-007','EXA-024') then 'additional_legacy' else 'legacy_migrated' end,
    coalesce(m.manual, p_exame_id not in ('EXA-001','EXA-003','EXA-007','EXA-024')),
    coalesce(m.nota, case when m.exame_id is null and p_exame_id not in ('EXA-001','EXA-003','EXA-007','EXA-024') then 'exame legado sem mapeamento provado' end)
  from (select null::text, null::text, null::text, null::boolean, null::text) z
  left join mapa m on m.exame_id = p_exame_id
$$;
revoke all on function public.lab_mapear_legado(text) from public;
grant execute on function public.lab_mapear_legado(text) to authenticated;

-- trigger: toda linha legado (exame_id + valor, sem valor original) ganha os campos V1 pela mesma regra,
-- na migracao e em qualquer gravacao futura do painel legado. Nunca inventa referencia (missing) nem material.
create or replace function public.lab_preencher_legado() returns trigger
language plpgsql set search_path = '' as $$
declare m record;
begin
  if new.exame_id is null then return new; end if;
  if tg_op = 'UPDATE' and new.value_original_text is not null
     and not (new.valor is distinct from old.valor and new.value_original_text is not distinct from old.value_original_text) then
    return new;   -- edicao V1 explicita ou nada de legado mudou
  end if;
  if new.valor is null and new.value_original_text is null then return new; end if;   -- deixa o NOT NULL recusar
  select * into m from public.lab_mapear_legado(new.exame_id);
  new.value_original_text := new.valor::text;
  new.numeric_value := new.valor; new.qualifier := 'eq';
  new.unit_original := coalesce(new.unit_original, new.unidade_no_momento);
  new.legacy_exame_id := new.exame_id; new.legacy_ideal_min := new.ideal_min_no_momento; new.legacy_ideal_max := new.ideal_max_no_momento; new.legacy_sistema := new.sistema_no_momento;
  new.reference_status := 'missing'; new.report_reference_text := null; new.report_reference_min := null; new.report_reference_max := null;
  new.origin := m.origin; new.exam_code := m.exam_code; new.variant := m.variant;
  new.requires_manual_mapping := m.requires_manual_mapping; new.mapping_note := m.mapping_note;
  return new;
end $$;
create trigger lab_results_preencher_legado before insert or update on public.lab_results for each row execute function public.lab_preencher_legado();

update public.lab_results set valor = valor where exame_id is not null and value_original_text is null;   -- dispara o preenchimento deterministico
alter table public.lab_results alter column value_original_text set not null;
alter table public.lab_results add constraint lab_results_valor_original_nao_vazio check (length(btrim(value_original_text)) > 0);

-- ============================================================================
-- 5. COMPONENTES DE EXAME COMPOSTO (Hemograma): pertencem ao resultado
-- ============================================================================
create table public.lab_result_components (
  id                       uuid primary key default gen_random_uuid(),
  result_id                uuid not null references public.lab_results(id) on delete cascade,
  position                 integer not null default 0,
  original_name            text not null,
  canonical_component_key  text,
  value_original_text      text not null,
  numeric_value            numeric,
  qualifier                text,
  censor_limit             numeric,
  unit_original            text,
  report_reference_text    text,
  report_reference_min     numeric,
  report_reference_max     numeric,
  report_reference_operator text,
  notes                    text,
  created_at               timestamptz not null default now(),
  constraint lab_components_nome check (length(btrim(original_name)) > 0),
  constraint lab_components_valor check (length(btrim(value_original_text)) > 0),
  constraint lab_components_qualifier check (qualifier is null or qualifier in ('eq','lt','lte','gt','gte','text')),
  constraint lab_components_numerico_so_exato check (numeric_value is null or qualifier = 'eq'),
  constraint lab_components_operator check (report_reference_operator is null or report_reference_operator in ('range','lt','lte','gt','gte'))
);
create index lab_result_components_result_idx on public.lab_result_components (result_id, position);
-- componente so em resultado de exame composto do catalogo (Hemograma completo)
create or replace function public.proteger_componente_laboratorial()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_code text; v_comp boolean;
begin
  select r.exam_code into v_code from public.lab_results r where r.id = new.result_id;
  select c.composite into v_comp from public.lab_exam_catalog c where c.code = v_code;
  if not coalesce(v_comp, false) then raise exception 'componentes so existem em resultado de exame composto do catalogo (Hemograma completo)' using errcode = 'P0001', hint = 'componente_invalido'; end if;
  return new;
end; $$;
revoke all on function public.proteger_componente_laboratorial() from public, anon, authenticated;
create trigger lab_result_components_proteger before insert or update on public.lab_result_components for each row execute function public.proteger_componente_laboratorial();

-- ============================================================================
-- 6/7/8. REFERENCIA METODOLOGICA, CONVERSOES, CALCULOS DERIVADOS — infraestrutura VAZIA
-- ============================================================================
create table public.lab_method_references (
  id              uuid primary key default gen_random_uuid(),
  exam_code       text not null references public.lab_exam_catalog(code),
  variant         text, material text, method text,
  population      text, sex text, age_min integer, age_max integer, context text,
  lower_bound     numeric, upper_bound numeric, operator text not null default 'range',
  unit            text not null,
  source          text not null, source_version text, justification text not null,
  effective_from  date, effective_to date,
  status          text not null default 'rascunho',
  responsible     text, approval_provenance jsonb,
  content_hash    text, version integer not null default 1,
  created_at      timestamptz not null default now(),
  constraint lab_method_references_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint lab_method_references_operator check (operator in ('range','lt','lte','gt','gte')),
  constraint lab_method_references_limites check (lower_bound is not null or upper_bound is not null),
  constraint lab_method_references_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null and content_hash is not null and effective_from is not null))
);
create table public.lab_unit_conversion_rules (
  id            uuid primary key default gen_random_uuid(),
  exam_code     text references public.lab_exam_catalog(code),
  from_unit     text not null, to_unit text not null, factor numeric not null,
  source        text not null, rule_version text not null,
  status        text not null default 'rascunho',
  responsible   text, approval_provenance jsonb,
  created_at    timestamptz not null default now(),
  constraint lab_unit_conversion_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint lab_unit_conversion_fator_positivo check (factor > 0),
  constraint lab_unit_conversion_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null))
);
create table public.lab_derived_calculations (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  formula         text not null, formula_version text not null,
  inputs          jsonb not null, required_units jsonb not null, criteria jsonb,
  source          text not null,
  status          text not null default 'rascunho',
  responsible     text, approval_provenance jsonb,
  created_at      timestamptz not null default now(),
  constraint lab_derived_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint lab_derived_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null))
);
-- gerenciamento tecnico/interno: a aplicacao SO LE; sem botao de aprovacao; sem autoridade administrativa nova
alter table public.lab_method_references enable row level security;
alter table public.lab_unit_conversion_rules enable row level security;
alter table public.lab_derived_calculations enable row level security;
create policy lab_method_references_select on public.lab_method_references for select to authenticated using (true);
create policy lab_unit_conversion_rules_select on public.lab_unit_conversion_rules for select to authenticated using (true);
create policy lab_derived_calculations_select on public.lab_derived_calculations for select to authenticated using (true);
revoke all on table public.lab_method_references, public.lab_unit_conversion_rules, public.lab_derived_calculations from public, anon, authenticated;
grant select on table public.lab_method_references, public.lab_unit_conversion_rules, public.lab_derived_calculations to authenticated;

-- ============================================================================
-- 9. LEITURA INTEGRADA — infraestrutura versionada (pacote real SEM regras)
-- ============================================================================
create table public.integrated_reading_rule_packages (
  id            uuid primary key default gen_random_uuid(),
  code          text not null, version integer not null default 1,
  status        text not null default 'rascunho',
  notes         text, content_hash text,
  responsible   text, approval_provenance jsonb,
  created_at    timestamptz not null default now(),
  constraint irp_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irp_code_version unique (code, version),
  constraint irp_aprovado_completo check (status <> 'aprovado' or (responsible is not null and approval_provenance is not null and content_hash is not null))
);
create table public.integrated_reading_domains (
  id               uuid primary key default gen_random_uuid(),
  package_id       uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  code             text not null, name text not null,
  holoscan_system  text,
  status           text not null default 'rascunho',
  created_at       timestamptz not null default now(),
  constraint ird_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint ird_code unique (package_id, code),
  constraint ird_system check (holoscan_system is null or holoscan_system in ('fungico','acido_inflamatorio','metabolico','detox_linfatico','mental_emocional_espiritual'))
);
create table public.integrated_reading_exam_domain_links (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  domain_id     uuid not null references public.integrated_reading_domains(id) on delete restrict,
  exam_code     text not null references public.lab_exam_catalog(code),
  variant       text, material text,
  direction     text not null default 'any',
  reference_id  uuid references public.lab_method_references(id),
  status        text not null default 'rascunho',
  created_at    timestamptz not null default now(),
  constraint irl_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irl_direction check (direction in ('any','above','below'))
);
create table public.integrated_reading_rules (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  rule_type     text not null, target text not null default 'global',
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'rascunho',
  created_at    timestamptz not null default now(),
  constraint irr_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irr_type check (rule_type in ('sufficiency','temporal','mixed','convergence','text')),
  constraint irr_unique unique (package_id, rule_type, target)
);
-- pacote REAL da V1: existe, em rascunho, SEM dominio, SEM vinculo, SEM regra
insert into public.integrated_reading_rule_packages (code, version, status, notes)
  values ('LI-V1', 1, 'rascunho', 'Infraestrutura da Etapa 5. Nenhum dominio, vinculo exame→dominio, suficiencia, janela temporal, regra de resultados mistos ou texto aprovados: toda leitura real e sem_dados_suficientes (docs/v1/laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md).');
alter table public.integrated_reading_rule_packages enable row level security;
alter table public.integrated_reading_domains enable row level security;
alter table public.integrated_reading_exam_domain_links enable row level security;
alter table public.integrated_reading_rules enable row level security;
create policy irp_select on public.integrated_reading_rule_packages for select to authenticated using (true);
create policy ird_select on public.integrated_reading_domains for select to authenticated using (true);
create policy irl_select on public.integrated_reading_exam_domain_links for select to authenticated using (true);
create policy irr_select on public.integrated_reading_rules for select to authenticated using (true);
revoke all on table public.integrated_reading_rule_packages, public.integrated_reading_domains, public.integrated_reading_exam_domain_links, public.integrated_reading_rules from public, anon, authenticated;
grant select on table public.integrated_reading_rule_packages, public.integrated_reading_domains, public.integrated_reading_exam_domain_links, public.integrated_reading_rules to authenticated;

-- leitura SALVA: congela fontes, referencias, pacote/versao, motor, estado, trace
create table public.integrated_readings (
  id                            uuid primary key default gen_random_uuid(),
  nutritionist_id               uuid not null default auth.uid() references auth.users(id),
  patient_id                    uuid not null,
  encounter_id                  uuid,
  responsible                   text not null,
  clinical_context              text,
  holoscan_application_id       uuid references public.holoscan_applications(id) on delete restrict,
  selected_collection_ids       uuid[] not null default '{}',
  selected_result_ids           uuid[] not null default '{}',
  references_snapshot           jsonb not null default '[]'::jsonb,
  sources_snapshot              jsonb not null default '{}'::jsonb,
  rule_package_id               uuid references public.integrated_reading_rule_packages(id) on delete restrict,
  rule_version                  integer,
  engine_version                text not null,
  state                         text not null,
  reason_codes                  jsonb not null default '[]'::jsonb,
  trace                         jsonb not null default '{}'::jsonb,
  professional_note             text,
  revision                      integer not null default 1,
  supersedes_id                 uuid references public.integrated_readings(id) on delete restrict,
  superseded_at                 timestamptz,
  content_hash                  text not null,
  created_by                    uuid default auth.uid() references auth.users(id),
  created_at                    timestamptz not null default now(),
  constraint ir_state check (state in ('convergente','divergente','sem_dados_suficientes')),
  constraint ir_responsavel check (length(btrim(responsible)) > 0),
  constraint ir_patient_fk foreign key (patient_id, nutritionist_id) references public.patients (id, nutritionist_id) on delete restrict,
  constraint ir_encounter_fk foreign key (encounter_id, patient_id, nutritionist_id) references public.encounters (id, patient_id, nutritionist_id) on delete restrict
);
create index integrated_readings_patient_idx on public.integrated_readings (patient_id, created_at desc);
alter table public.integrated_readings enable row level security;
create policy integrated_readings_select on public.integrated_readings for select to authenticated using (nutritionist_id = (select auth.uid()));
revoke all on table public.integrated_readings from public, anon, authenticated;
grant select on table public.integrated_readings to authenticated;   -- escrita SO pela RPC
create trigger integrated_readings_paciente_arquivado before insert or update on public.integrated_readings for each row execute function public.bloquear_escrita_paciente_arquivado();
-- leitura salva e imutavel: so superseded_at (uma vez)
create or replace function public.proteger_leitura_integrada()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'leitura integrada salva e historico: nao e apagada' using errcode = 'P0001', hint = 'leitura_imutavel'; end if;
  if old.superseded_at is not null or new.superseded_at is null or (to_jsonb(old) - 'superseded_at') <> (to_jsonb(new) - 'superseded_at') then
    raise exception 'leitura integrada salva e imutavel: corrija com uma nova revisao' using errcode = 'P0001', hint = 'leitura_imutavel'; end if;
  return new;
end; $$;
create trigger integrated_readings_proteger before update or delete on public.integrated_readings for each row execute function public.proteger_leitura_integrada();

-- ============================================================================
-- 10. PROTECOES: coleta/resultado consolidado nao e sobrescrito nem apagado
-- ============================================================================
-- Coletas V1 (source <> legacy_panel) em salvo/revisado: so superseded_at, state (salvo→revisado),
-- reviewed_*, revision_note e updated_at mudam; o conteudo exige revisao (nova linha).
-- O painel legado (source = legacy_panel) mantem o comportamento historico ate ser desligado.
create or replace function public.proteger_coleta_consolidada()
returns trigger language plpgsql set search_path = '' as $$
declare livres text[] := array['updated_at','superseded_at','state','reviewed_at','reviewed_by','revision_note'];
begin
  if tg_op = 'DELETE' then
    if old.source <> 'legacy_panel' and old.state in ('salvo','revisado') then
      raise exception 'coleta consolidada nao e apagada: corrija com uma revisao' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    return old;
  end if;
  if old.source = 'legacy_panel' then return new; end if;
  if old.state in ('salvo','revisado') then
    if (to_jsonb(old) - livres) <> (to_jsonb(new) - livres) then
      raise exception 'coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    if new.state = 'rascunho' then raise exception 'coleta consolidada nao volta a rascunho' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    if old.state = 'revisado' and new.state <> 'revisado' then raise exception 'coleta revisada nao muda de estado' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    if old.superseded_at is not null and new.superseded_at is distinct from old.superseded_at then raise exception 'superseded_at nao muda depois de definido' using errcode = 'P0001'; end if;
  end if;
  if new.patient_id <> old.patient_id or new.nutritionist_id <> old.nutritionist_id then raise exception 'coleta nao muda de paciente nem de profissional' using errcode = 'P0001'; end if;
  return new;
end; $$;
create trigger lab_collections_proteger before update or delete on public.lab_collections for each row execute function public.proteger_coleta_consolidada();

create or replace function public.proteger_resultado_consolidado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_state text; v_source text; v_cid uuid;
begin
  v_cid := case when tg_op = 'DELETE' then old.collection_id else new.collection_id end;
  select c.state, c.source into v_state, v_source from public.lab_collections c where c.id = v_cid;
  if v_source is distinct from 'legacy_panel' and v_state in ('salvo','revisado') and coalesce(current_setting('holohacking.lab_rpc', true), '') <> v_cid::text then
    raise exception 'resultado de coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
  if tg_op = 'UPDATE' and new.collection_id <> old.collection_id then raise exception 'resultado nao muda de coleta' using errcode = 'P0001'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.proteger_resultado_consolidado() from public, anon, authenticated;
create trigger lab_results_proteger before insert or update or delete on public.lab_results for each row execute function public.proteger_resultado_consolidado();
create or replace function public.proteger_componente_consolidado()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_state text; v_source text; v_cid uuid;
begin
  select c.id, c.state, c.source into v_cid, v_state, v_source from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = case when tg_op = 'DELETE' then old.result_id else new.result_id end;
  if v_source is distinct from 'legacy_panel' and v_state in ('salvo','revisado') and coalesce(current_setting('holohacking.lab_rpc', true), '') <> v_cid::text then
    raise exception 'componente de coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.proteger_componente_consolidado() from public, anon, authenticated;
create trigger lab_result_components_proteger_consolidado before insert or update or delete on public.lab_result_components for each row execute function public.proteger_componente_consolidado();

-- RLS dos componentes: via resultado → coleta
alter table public.lab_result_components enable row level security;
create policy lab_result_components_select on public.lab_result_components for select to authenticated
  using (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
create policy lab_result_components_insert on public.lab_result_components for insert to authenticated
  with check (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
create policy lab_result_components_update on public.lab_result_components for update to authenticated
  using (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
create policy lab_result_components_delete on public.lab_result_components for delete to authenticated
  using (exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = lab_result_components.result_id and c.nutritionist_id = (select auth.uid())));
revoke all on table public.lab_result_components from public, anon;
grant select, insert, update, delete on table public.lab_result_components to authenticated;

-- ============================================================================
-- 11. RPCs
-- ============================================================================
-- Grava resultados numa coleta (substitui os existentes). Uso interno das RPCs abaixo.
create or replace function public.lab_gravar_resultados(p_cid uuid, p_uid uuid, p_results jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; comp jsonb; rid uuid; n integer := 0; pos integer := 0; v_code text; v_cust uuid; v_q text; v_nv numeric; v_refst text;
begin
  perform set_config('holohacking.lab_rpc', p_cid::text, true);
  delete from public.lab_result_components x using public.lab_results y where x.result_id = y.id and y.collection_id = p_cid and y.exame_id is null;
  delete from public.lab_results where collection_id = p_cid and exame_id is null;
  for r in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    pos := pos + 1;
    v_code := nullif(btrim(coalesce(r->>'exam_code','')), ''); v_cust := nullif(r->>'custom_exam_id','')::uuid;
    if v_code is null and v_cust is null then raise exception 'resultado % sem exame (exam_code ou custom_exam_id)', pos using errcode = 'P0001', hint = 'resultado_sem_exame'; end if;
    if v_code is not null and v_cust is not null then raise exception 'resultado % com exame do catalogo E customizado', pos using errcode = 'P0001'; end if;
    if v_code is not null and not exists (select 1 from public.lab_exam_catalog c where c.code = v_code and c.status = 'ativo') then raise exception 'exame % nao existe no catalogo-base', v_code using errcode = 'P0001', hint = 'exame_desconhecido'; end if;
    if v_cust is not null and not exists (select 1 from public.lab_custom_exams c where c.id = v_cust and c.nutritionist_id = p_uid) then raise exception 'exame customizado nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if length(btrim(coalesce(r->>'value_original_text',''))) = 0 then raise exception 'resultado % sem valor original', pos using errcode = 'P0001', hint = 'valor_ausente'; end if;
    v_q := coalesce(r->>'qualifier', 'text'); v_nv := case when v_q = 'eq' then (r->>'numeric_value')::numeric else null end;
    v_refst := case when r->>'report_reference_text' is not null or r->>'report_reference_min' is not null or r->>'report_reference_max' is not null then 'informed' else 'missing' end;
    insert into public.lab_results (collection_id, exam_code, custom_exam_id, variant, value_original_text, numeric_value, qualifier, censor_limit, unit_original, method, material,
        report_reference_text, report_reference_min, report_reference_max, report_reference_operator, report_reference_unit, report_reference_population, reference_status, reference_source, origin, notes, result_date, position)
      values (p_cid, v_code, v_cust, nullif(btrim(coalesce(r->>'variant','')), ''), btrim(r->>'value_original_text'), v_nv, v_q, (r->>'censor_limit')::numeric, nullif(btrim(coalesce(r->>'unit_original','')), ''), nullif(btrim(coalesce(r->>'method','')), ''), nullif(btrim(coalesce(r->>'material','')), ''),
        r->>'report_reference_text', (r->>'report_reference_min')::numeric, (r->>'report_reference_max')::numeric, coalesce(r->>'report_reference_operator', case when v_refst = 'informed' then 'range' end), r->>'report_reference_unit', r->>'report_reference_population', v_refst, 'laudo',
        coalesce(r->>'origin', 'manual'), r->>'notes', (r->>'result_date')::date, pos)
      returning id into rid;
    n := n + 1;
    for comp in select value from jsonb_array_elements(coalesce(r->'components', '[]'::jsonb)) loop
      insert into public.lab_result_components (result_id, position, original_name, canonical_component_key, value_original_text, numeric_value, qualifier, censor_limit, unit_original, report_reference_text, report_reference_min, report_reference_max, report_reference_operator, notes)
        values (rid, coalesce((comp->>'position')::int, 0), comp->>'original_name', comp->>'canonical_component_key', comp->>'value_original_text',
          case when coalesce(comp->>'qualifier','text') = 'eq' then (comp->>'numeric_value')::numeric end, coalesce(comp->>'qualifier','text'), (comp->>'censor_limit')::numeric, comp->>'unit_original',
          comp->>'report_reference_text', (comp->>'report_reference_min')::numeric, (comp->>'report_reference_max')::numeric, comp->>'report_reference_operator', comp->>'notes');
    end loop;
  end loop;
  perform set_config('holohacking.lab_rpc', '', true);
  return n;
end; $$;
revoke all on function public.lab_gravar_resultados(uuid, uuid, jsonb) from public, anon, authenticated;

-- salvar_coleta_laboratorial(payload): collection { id?, patient_id, clinical_date, clinical_time?, laboratory_name?, encounter_id? (so se explicitamente informado),
--   notes?, state ('rascunho'|'salvo'), document_id?, operation_id? }, results [...]
--   * id ausente  → NOVA coleta, sempre (mesmo que ja exista outra na mesma data); operation_id repetido devolve a mesma
--   * id presente → edita AQUELA coleta, so se ainda rascunho; consolidada exige revisar_coleta_laboratorial
--   * nunca procura coleta por data; nunca escolhe atendimento pela data
create or replace function public.salvar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c jsonb := payload->'collection'; cid uuid; pid uuid; eid uuid; st text; n int; op uuid; existente public.lab_collections%rowtype; dt date;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if c is null then raise exception 'payload incompleto: collection e obrigatoria' using errcode = 'P0001'; end if;
  pid := (c->>'patient_id')::uuid;
  if not exists (select 1 from public.patients p where p.id = pid and p.nutritionist_id = uid) then raise exception 'paciente nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  st := coalesce(c->>'state', 'rascunho');
  if st not in ('rascunho','salvo') then raise exception 'estado invalido para salvar: % (revisado exige marcar_coleta_revisada)', st using errcode = 'P0001'; end if;
  dt := (c->>'clinical_date')::date;
  if dt is null and st = 'salvo' then raise exception 'coleta salva exige a data clinica (clinical_date)' using errcode = 'P0001', hint = 'data_ausente'; end if;
  if c ? 'encounter_id' and c->>'encounter_id' is not null then
    eid := (c->>'encounter_id')::uuid;
    if not exists (select 1 from public.encounters e where e.id = eid and e.patient_id = pid and e.nutritionist_id = uid) then raise exception 'atendimento nao e deste paciente/profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  end if;
  op := nullif(c->>'operation_id','')::uuid;
  if c->>'id' is null and op is not null then
    select * into existente from public.lab_collections x where x.nutritionist_id = uid and x.operation_id = op;
    if found then
      if existente.patient_id <> pid then raise exception 'operation_id ja usado em coleta de outro paciente' using errcode = 'P0001'; end if;
      return jsonb_build_object('id', existente.id, 'state', existente.state, 'repetida', true);
    end if;
  end if;
  if c->>'id' is not null then
    cid := (c->>'id')::uuid;
    select * into existente from public.lab_collections x where x.id = cid and x.nutritionist_id = uid and x.patient_id = pid for update;
    if not found then raise exception 'coleta % nao encontrada para este paciente', cid using errcode = 'P0002'; end if;
    if existente.source <> 'legacy_panel' and existente.state in ('salvo','revisado') then raise exception 'coleta consolidada: use revisar_coleta_laboratorial' using errcode = 'P0001', hint = 'coleta_consolidada'; end if;
    update public.lab_collections set coletado_em = dt, data_coleta_desconhecida = (dt is null), clinical_time = (c->>'clinical_time')::time, laboratorio = c->>'laboratory_name', observacao = c->>'notes',
      encounter_id = case when c ? 'encounter_id' then eid else encounter_id end, document_id = case when c ? 'document_id' then nullif(c->>'document_id','')::uuid else document_id end,
      state = st, source = 'manual', operation_id = coalesce(op, operation_id)
      where id = cid;
  else
    insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, clinical_time, laboratorio, observacao, encounter_id, document_id, state, source, operation_id, created_by)
      values (uid, pid, dt, dt is null, (c->>'clinical_time')::time, c->>'laboratory_name', c->>'notes', eid, nullif(c->>'document_id','')::uuid, st, coalesce(c->>'source','manual'), op, uid)
      returning id into cid;
  end if;
  n := public.lab_gravar_resultados(cid, uid, payload->'results');
  if st = 'salvo' and n = 0 then raise exception 'coleta salva exige ao menos um resultado' using errcode = 'P0001', hint = 'sem_resultados'; end if;
  return jsonb_build_object('id', cid, 'state', st, 'results', n, 'repetida', false);
end; $$;
revoke all on function public.salvar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.salvar_coleta_laboratorial(jsonb) to authenticated;

-- revisar_coleta_laboratorial(payload): { collection_id, reason, collection{...}, results[...] }
--   correcao de coleta consolidada = NOVA REVISAO (nova linha, supersedes_id), nunca sobrescrita.
--   clinical_date continua a data da coleta real (salvo correcao explicita no payload); created_at e registro.
create or replace function public.revisar_coleta_laboratorial(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); old public.lab_collections%rowtype; c jsonb := coalesce(payload->'collection', '{}'::jsonb); novo uuid; n int; dt date; eid uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into old from public.lab_collections x where x.id = (payload->>'collection_id')::uuid and x.nutritionist_id = uid for update;
  if not found then raise exception 'coleta nao encontrada' using errcode = 'P0002'; end if;
  if old.state = 'rascunho' then raise exception 'coleta em rascunho se edita com salvar_coleta_laboratorial' using errcode = 'P0001'; end if;
  if old.superseded_at is not null then raise exception 'esta coleta ja foi substituida por uma revisao' using errcode = 'P0001', hint = 'ja_revisada'; end if;
  if length(btrim(coalesce(payload->>'reason',''))) = 0 then raise exception 'revisao exige motivo' using errcode = 'P0001', hint = 'motivo_ausente'; end if;
  dt := coalesce((c->>'clinical_date')::date, old.coletado_em);
  if dt is null then raise exception 'revisao de coleta consolidada exige a data clinica' using errcode = 'P0001', hint = 'data_ausente'; end if;
  eid := case when c ? 'encounter_id' then nullif(c->>'encounter_id','')::uuid else old.encounter_id end;
  if eid is not null and not exists (select 1 from public.encounters e where e.id = eid and e.patient_id = old.patient_id and e.nutritionist_id = uid) then raise exception 'atendimento nao e deste paciente/profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, clinical_time, laboratorio, observacao, encounter_id, document_id, state, source, revision, supersedes_id, revision_note, created_by)
    values (uid, old.patient_id, dt, false, coalesce((c->>'clinical_time')::time, old.clinical_time), coalesce(c->>'laboratory_name', old.laboratorio), coalesce(c->>'notes', old.observacao), eid,
      case when c ? 'document_id' then nullif(c->>'document_id','')::uuid else old.document_id end, 'salvo', 'revision', old.revision + 1, old.id, btrim(payload->>'reason'), uid)
    returning id into novo;
  n := public.lab_gravar_resultados(novo, uid, payload->'results');
  if n = 0 then raise exception 'revisao exige ao menos um resultado' using errcode = 'P0001', hint = 'sem_resultados'; end if;
  update public.lab_collections set superseded_at = now() where id = old.id;
  return jsonb_build_object('id', novo, 'supersedes_id', old.id, 'revision', old.revision + 1, 'results', n);
end; $$;
revoke all on function public.revisar_coleta_laboratorial(jsonb) from public, anon;
grant execute on function public.revisar_coleta_laboratorial(jsonb) to authenticated;

-- marcar_coleta_revisada: salvo → revisado, acao humana identificada
create or replace function public.marcar_coleta_revisada(p_collection_id uuid, p_responsible text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); st text;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if length(btrim(coalesce(p_responsible,''))) = 0 then raise exception 'revisao exige responsavel identificado' using errcode = 'P0001'; end if;
  select state into st from public.lab_collections where id = p_collection_id and nutritionist_id = uid;
  if st is null then raise exception 'coleta nao encontrada' using errcode = 'P0002'; end if;
  if st <> 'salvo' then raise exception 'so coleta salva passa a revisada (estado atual: %)', st using errcode = 'P0001'; end if;
  update public.lab_collections set state = 'revisado', reviewed_at = now(), reviewed_by = uid, revision_note = coalesce(revision_note, '') || case when revision_note is null then '' else ' | ' end || 'revisado por ' || btrim(p_responsible) where id = p_collection_id;
  return jsonb_build_object('id', p_collection_id, 'state', 'revisado');
end; $$;
revoke all on function public.marcar_coleta_revisada(uuid, text) from public, anon;
grant execute on function public.marcar_coleta_revisada(uuid, text) to authenticated;

-- salvar_leitura_integrada(payload): congela fontes e resultado do motor. BARREIRA: enquanto o pacote nao tiver
-- vinculo exame→dominio aprovado, so 'sem_dados_suficientes' e aceito. Correcao = nova revisao (supersedes_id).
create or replace function public.salvar_leitura_integrada(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; hid uuid; pkg public.integrated_reading_rule_packages%rowtype; x text; cids uuid[] := '{}'; rids uuid[] := '{}'; novo uuid; sup uuid; rev int := 1; h text; conteudo jsonb; eid uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  pid := (payload->>'patient_id')::uuid;
  if not exists (select 1 from public.patients p where p.id = pid and p.nutritionist_id = uid) then raise exception 'paciente nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if length(btrim(coalesce(payload->>'responsible',''))) = 0 then raise exception 'leitura exige responsavel identificado' using errcode = 'P0001'; end if;
  if payload->>'state' not in ('convergente','divergente','sem_dados_suficientes') then raise exception 'estado invalido' using errcode = 'P0001'; end if;
  select * into pkg from public.integrated_reading_rule_packages k where k.id = (payload->>'rule_package_id')::uuid;
  if not found then raise exception 'pacote de regras nao encontrado' using errcode = 'P0002'; end if;
  if payload->>'state' <> 'sem_dados_suficientes' and not exists (select 1 from public.integrated_reading_exam_domain_links l join public.integrated_reading_domains d on d.id = l.domain_id
      where l.package_id = pkg.id and l.status = 'aprovado' and d.status = 'aprovado') then
    raise exception 'pacote % sem vinculo exame→dominio aprovado: a unica leitura possivel e sem_dados_suficientes', pkg.code using errcode = 'P0001', hint = 'sem_regra_homologada';
  end if;
  if payload->>'state' <> 'sem_dados_suficientes' and pkg.status <> 'aprovado' then raise exception 'pacote % nao aprovado: nenhuma leitura convergente/divergente e oficial', pkg.code using errcode = 'P0001', hint = 'sem_regra_homologada'; end if;
  hid := nullif(payload->>'holoscan_application_id','')::uuid;
  if hid is not null and not exists (select 1 from public.holoscan_applications a where a.id = hid and a.patient_id = pid and a.nutritionist_id = uid) then raise exception 'aplicacao HOLOSCAN nao e deste paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  for x in select value from jsonb_array_elements_text(coalesce(payload->'selected_collection_ids','[]'::jsonb)) loop
    if not exists (select 1 from public.lab_collections c where c.id = x::uuid and c.patient_id = pid and c.nutritionist_id = uid) then raise exception 'coleta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    cids := cids || x::uuid;
  end loop;
  for x in select value from jsonb_array_elements_text(coalesce(payload->'selected_result_ids','[]'::jsonb)) loop
    if not exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = x::uuid and c.patient_id = pid and c.nutritionist_id = uid) then raise exception 'resultado % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    rids := rids || x::uuid;
  end loop;
  eid := nullif(payload->>'encounter_id','')::uuid;
  sup := nullif(payload->>'supersedes_id','')::uuid;
  if sup is not null then
    select revision + 1 into rev from public.integrated_readings i where i.id = sup and i.nutritionist_id = uid and i.patient_id = pid and i.superseded_at is null;
    if rev is null then raise exception 'leitura anterior nao encontrada ou ja revisada' using errcode = 'P0001'; end if;
  end if;
  conteudo := jsonb_build_object('patient_id', pid, 'holoscan_application_id', hid, 'collections', to_jsonb(cids), 'results', to_jsonb(rids), 'references', coalesce(payload->'references_snapshot','[]'::jsonb),
    'sources', coalesce(payload->'sources_snapshot','{}'::jsonb), 'rule_package', pkg.code || '@' || pkg.version, 'engine', payload->>'engine_version', 'state', payload->>'state', 'reason_codes', coalesce(payload->'reason_codes','[]'::jsonb), 'trace', coalesce(payload->'trace','{}'::jsonb), 'note', payload->>'professional_note');
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  insert into public.integrated_readings (nutritionist_id, patient_id, encounter_id, responsible, clinical_context, holoscan_application_id, selected_collection_ids, selected_result_ids, references_snapshot, sources_snapshot, rule_package_id, rule_version, engine_version, state, reason_codes, trace, professional_note, revision, supersedes_id, content_hash, created_by)
    values (uid, pid, eid, btrim(payload->>'responsible'), payload->>'clinical_context', hid, cids, rids, coalesce(payload->'references_snapshot','[]'::jsonb), coalesce(payload->'sources_snapshot','{}'::jsonb), pkg.id, pkg.version, coalesce(payload->>'engine_version','?'), payload->>'state', coalesce(payload->'reason_codes','[]'::jsonb), coalesce(payload->'trace','{}'::jsonb), payload->>'professional_note', rev, sup, h, uid)
    returning id into novo;
  if sup is not null then update public.integrated_readings set superseded_at = now() where id = sup; end if;
  return jsonb_build_object('id', novo, 'state', payload->>'state', 'revision', rev, 'content_hash', h);
end; $$;
revoke all on function public.salvar_leitura_integrada(jsonb) from public, anon;
grant execute on function public.salvar_leitura_integrada(jsonb) to authenticated;

-- ============================================================================
-- 12. RELATORIO (Etapa 3): snapshot de exames com valor original e referencia do laudo
-- ============================================================================
-- Mesma funcao da migration 20260930180000, com o bloco de exames adaptado ao resultado V1
-- (rascunho nao entra; nenhuma classificacao, faixa ideal ou leitura e gravada).
create or replace function public.emitir_relatorio(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid(); v_id uuid; v_op uuid; v_pid uuid; v_enc uuid; sel jsonb; atual public.report_emissions%rowtype;
  sup public.report_emissions%rowtype; rev int := 1; intimo boolean; interp boolean;
  pac record; prof record; x text; r record; r2 record;
  fontes jsonb := '{}'::jsonb; conteudo jsonb; secao jsonb; itens jsonb; dom record; it jsonb; tipo text;
  dominios_intimos text[] := array['emocional','sentido_pessoal'];
  hash text; agora timestamptz := now();
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if payload is null then raise exception 'payload vazio'; end if;
  v_op := nullif(payload->>'operation_id','')::uuid;
  if v_op is not null then
    select r0.id into v_id from public.report_emissions r0 where r0.nutritionist_id = uid and r0.operation_id = v_op and r0.status = 'emitido';
    if v_id is not null then return v_id; end if;
  end if;
  v_id := nullif(payload->>'id','')::uuid;
  if v_id is not null then
    select * into atual from public.report_emissions r0 where r0.id = v_id and r0.nutritionist_id = uid for update;
    if not found then raise exception 'relatorio % nao encontrado', v_id using errcode = 'P0002'; end if;
    if atual.status = 'emitido' then
      if v_op is not null and atual.operation_id = v_op then return v_id; end if;
      raise exception 'relatorio ja emitido; retifique criando uma nova emissao' using errcode = 'P0001', hint = 'emissao_imutavel';
    end if;
    if payload->>'expected_updated_at' is not null and atual.updated_at <> (payload->>'expected_updated_at')::timestamptz then
      raise exception 'o rascunho do relatorio foi alterado em outro lugar; recarregue antes de emitir' using errcode = 'P0001', hint = 'conflito';
    end if;
    v_pid := atual.patient_id;
  else
    v_pid := (payload->>'patient_id')::uuid;
  end if;
  if v_pid is null then raise exception 'patient_id e obrigatorio'; end if;
  v_enc := nullif(payload->>'encounter_id','')::uuid;
  sel := coalesce(payload->'selected_sources', atual.selected_sources, '{}'::jsonb);
  intimo := coalesce((sel->>'incluir_intimo')::boolean, false);
  interp := coalesce((sel->>'incluir_interpretacao')::boolean, true);

  -- retificacao: a emissao substituida tem de ser do mesmo paciente e estar emitida
  if nullif(payload->>'supersedes_report_id','') is not null or atual.supersedes_report_id is not null then
    select * into sup from public.report_emissions r0
      where r0.id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, atual.supersedes_report_id) and r0.nutritionist_id = uid for update;
    if not found then raise exception 'emissao a retificar nao encontrada' using errcode = 'P0002'; end if;
    if sup.patient_id <> v_pid then raise exception 'emissao a retificar e de outro paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if sup.status <> 'emitido' then raise exception 'so uma emissao pode ser retificada' using errcode = 'P0001'; end if;
    rev := sup.revision_number + 1;
  end if;

  -- identificacao proporcional + profissional (do servidor, nao do payload)
  select p.nome, p.nascimento, p.sexo into pac from public.patients p where p.id = v_pid and p.nutritionist_id = uid;
  if pac.nome is null then raise exception 'paciente nao encontrado' using errcode = 'P0002'; end if;
  select pr.nome, pr.profissao, pr.registro into prof from public.profiles pr where pr.id = uid;

  conteudo := jsonb_build_object(
    'template_version', 1,
    'tipos_de_conteudo', jsonb_build_array('RELATO_DO_PACIENTE','OBSERVACAO_PROFISSIONAL','DADO_MEDIDO','DADO_DOCUMENTAL','INDICADOR_CALCULADO','TEXTO_ASSISTIDO'),
    'paciente', jsonb_build_object('nome', pac.nome, 'nascimento', pac.nascimento, 'sexo', pac.sexo),
    'profissional', jsonb_build_object('nome', prof.nome, 'profissao', prof.profissao, 'registro', prof.registro),
    'periodo', jsonb_build_object('inicio', nullif(payload->>'period_start',''), 'fim', nullif(payload->>'period_end','')),
    'titulo', payload->>'title',
    'metodologia', 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada, Leitura Integrada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
    'texto_assistido', '[]'::jsonb
  );

  -- atendimentos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'encounter_ids','[]'::jsonb)) loop
    select * into r from public.encounters e where e.id = x::uuid and e.patient_id = v_pid and e.nutritionist_id = uid;
    if not found then raise exception 'atendimento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'occurred_at', r.occurred_at, 'timezone', r.timezone, 'type', r.type, 'modality', r.modality, 'com_agendamento', r.consultation_id is not null);
    fontes := jsonb_set(fontes, '{encounters}', coalesce(fontes->'encounters','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('atendimentos', itens);

  -- anamneses (so consolidadas); itens intimos so com incluir_intimo
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'anamnesis_ids','[]'::jsonb)) loop
    select * into r from public.anamneses a where a.id = x::uuid and a.patient_id = v_pid and a.nutritionist_id = uid;
    if not found then raise exception 'anamnese % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'anamnese % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    secao := '[]'::jsonb;
    if r.content->'dominios' is not null then
      for dom in select key, value from jsonb_each(r.content->'dominios') loop
        if not intimo and dom.key = any(dominios_intimos) then continue; end if;
        for it in select * from jsonb_array_elements(coalesce(dom.value->'itens','[]'::jsonb)) loop
          tipo := case it->>'origem' when 'relato_paciente' then 'RELATO_DO_PACIENTE' when 'observacao_profissional' then 'OBSERVACAO_PROFISSIONAL'
                                      when 'documento_externo' then 'DADO_DOCUMENTAL' when 'dado_medido' then 'DADO_MEDIDO' else 'RELATO_DO_PACIENTE' end;
          secao := secao || (jsonb_build_object('dominio', dom.key, 'tipo_conteudo', tipo) || (it - 'fonte_anamnese_id'));
        end loop;
      end loop;
    end if;
    itens := itens || jsonb_build_object('id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number, 'status', r.status,
      'reviewed_at', r.reviewed_at, 'itens', secao, 'intimo_incluido', intimo);
    fontes := jsonb_set(fontes, '{anamneses}', coalesce(fontes->'anamneses','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('anamneses', itens);

  -- HOLOSCAN: identificacao, data, versao, cobertura, interpretacao profissional — nada de nota/indice/triada/faixa
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'holoscan_application_ids','[]'::jsonb)) loop
    select * into r from public.holoscan_applications h where h.id = x::uuid and h.patient_id = v_pid and h.nutritionist_id = uid;
    if not found then raise exception 'HOLOSCAN % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'INDICADOR_CALCULADO', 'id', r.id, 'encounter_id', r.encounter_id, 'quando', r.quando,
      'versao_estrutura', r.versao_estrutura, 'versao_bancos', r.versao_bancos, 'cobertura', r.cobertura,
      'resultados_oficiais', false, 'interpretacao_profissional', case when interp then r.interpretacao_texto else null end,
      'interpretacao_tipo', 'OBSERVACAO_PROFISSIONAL');
    fontes := jsonb_set(fontes, '{holoscan_applications}', coalesce(fontes->'holoscan_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('holoscan', itens);

  -- exames (coletas + resultados), DADO_MEDIDO; sem faixa de referencia (catalogo nao fechado)
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'lab_collection_ids','[]'::jsonb)) loop
    select * into r from public.lab_collections c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
    if not found then raise exception 'coleta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.state = 'rascunho' then raise exception 'coleta % e rascunho: nao entra em relatorio', x using errcode = 'P0001'; end if;
    -- Etapa 5: snapshot do valor ORIGINAL e da referencia DO LAUDO usados (resultado V1); legado mantem as colunas antigas
    select coalesce(jsonb_agg(case when lr.exam_code is not null or lr.custom_exam_id is not null or lr.value_original_text is not null
        then jsonb_build_object('exame_id', lr.exam_code, 'custom_exam_id', lr.custom_exam_id, 'nome', (select c.canonical_name from public.lab_exam_catalog c where c.code = lr.exam_code), 'variante', lr.variant, 'material', lr.material, 'metodo', lr.method,
          'valor', lr.value_original_text, 'unidade', lr.unit_original,
          'referencia_laudo', case when lr.reference_status = 'informed' then jsonb_build_object('texto', lr.report_reference_text, 'min', lr.report_reference_min, 'max', lr.report_reference_max, 'unidade', lr.report_reference_unit) else null end)
        else jsonb_build_object('exame_id', lr.exame_id, 'nome', lr.nome_exame_no_momento, 'valor', lr.valor, 'unidade', lr.unidade_no_momento) end
        order by coalesce(lr.position, 0), coalesce(lr.exam_code, lr.exame_id)), '[]'::jsonb)
      into secao from public.lab_results lr where lr.collection_id = r.id;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_MEDIDO', 'id', r.id, 'encounter_id', r.encounter_id, 'coletado_em', r.coletado_em,
      'data_coleta_desconhecida', r.data_coleta_desconhecida, 'laboratorio', r.laboratorio, 'state', r.state, 'revision', r.revision, 'resultados', secao);
    fontes := jsonb_set(fontes, '{lab_collections}', coalesce(fontes->'lab_collections','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('exames', itens);

  -- ferramentas consolidadas; respostas (conteudo intimo) so com incluir_intimo
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'tool_application_ids','[]'::jsonb)) loop
    select * into r from public.tool_applications t where t.id = x::uuid and t.patient_id = v_pid and t.nutritionist_id = uid;
    if not found then raise exception 'ferramenta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'ferramenta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'RELATO_DO_PACIENTE', 'id', r.id, 'encounter_id', r.encounter_id, 'ferramenta_id', r.ferramenta_id,
      'versao_ferramenta', r.versao_ferramenta, 'concluida_em', r.concluida_em, 'status', r.status,
      'respostas', case when intimo then r.respostas else null end, 'respostas_incluidas', intimo,
      'leitura_profissional', case when interp then r.leitura else null end, 'leitura_tipo', 'OBSERVACAO_PROFISSIONAL',
      'prioridade', r.prioridade, 'proximo_passo', r.proximo_passo);
    fontes := jsonb_set(fontes, '{tool_applications}', coalesce(fontes->'tool_applications','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('ferramentas', itens);

  -- condutas consolidadas + acordos
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'conduct_ids','[]'::jsonb)) loop
    select * into r from public.conducts c where c.id = x::uuid and c.patient_id = v_pid and c.nutritionist_id = uid;
    if not found then raise exception 'conduta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if r.status = 'rascunho' then raise exception 'conduta % e rascunho: nao entra em relatorio', x using errcode = 'P0001', hint = 'fonte_nao_consolidada'; end if;
    select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'description', g.description, 'responsible', g.responsible, 'due_text', g.due_text,
        'follow_up', g.follow_up, 'status', g.status, 'status_note', g.status_note) order by g.position, g.created_at), '[]'::jsonb)
      into secao from public.agreements g where g.conduct_id = r.id
        and (sel->'agreement_ids' is null or jsonb_array_length(coalesce(sel->'agreement_ids','[]'::jsonb)) = 0 or (sel->'agreement_ids') ? g.id::text);
    itens := itens || jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'id', r.id, 'encounter_id', r.encounter_id, 'revision_number', r.revision_number,
      'status', r.status, 'priorities', r.priorities, 'objective', r.objective, 'nutrition_strategy', r.nutrition_strategy, 'actions', r.actions,
      'resources', r.resources, 'requested_exams', r.requested_exams, 'referrals', r.referrals, 'monitoring', r.monitoring, 'return_plan', r.return_plan,
      'observations', r.observations, 'nutrition_diagnosis', r.nutrition_diagnosis, 'dietary_prescription', r.dietary_prescription,
      'professional_guidance', r.professional_guidance, 'previous_decision', r.previous_decision, 'previous_decision_note', r.previous_decision_note,
      'acordos', secao);
    fontes := jsonb_set(fontes, '{conducts}', coalesce(fontes->'conducts','[]'::jsonb) || jsonb_build_object('id', r.id, 'revision_number', r.revision_number, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('condutas', itens);

  -- documentos anexados: so metadados (DADO_DOCUMENTAL)
  itens := '[]'::jsonb;
  for x in select value from jsonb_array_elements_text(coalesce(sel->'document_ids','[]'::jsonb)) loop
    select * into r from public.documents d where d.id = x::uuid and d.patient_id = v_pid and d.nutritionist_id = uid;
    if not found then raise exception 'documento % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    itens := itens || jsonb_build_object('tipo_conteudo', 'DADO_DOCUMENTAL', 'id', r.id, 'nome', r.nome, 'tipo', r.tipo, 'data_documento', r.data_documento);
    fontes := jsonb_set(fontes, '{documents}', coalesce(fontes->'documents','[]'::jsonb) || jsonb_build_object('id', r.id, 'updated_at', r.updated_at), true);
  end loop;
  conteudo := conteudo || jsonb_build_object('documentos', itens);

  -- interpretacao profissional escrita para este relatorio
  conteudo := conteudo || jsonb_build_object('interpretacao_profissional',
    case when interp and nullif(payload->>'professional_text','') is not null
         then jsonb_build_object('tipo_conteudo', 'OBSERVACAO_PROFISSIONAL', 'texto', payload->>'professional_text') else null end);

  hash := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');   -- sha256() nativo do PostgreSQL (>= 11): hash tecnico, nao assinatura

  if v_id is not null then
    update public.report_emissions set
      status = 'emitido', encounter_id = coalesce(v_enc, encounter_id), title = coalesce(payload->>'title', title),
      period_start = coalesce(nullif(payload->>'period_start','')::date, period_start), period_end = coalesce(nullif(payload->>'period_end','')::date, period_end),
      selected_sources = sel, professional_text = coalesce(payload->>'professional_text', professional_text),
      source_snapshot = fontes, content_snapshot = conteudo, content_hash = hash, template_version = 1,
      issued_at = agora, created_by = uid, revision_number = rev,
      supersedes_report_id = coalesce(nullif(payload->>'supersedes_report_id','')::uuid, supersedes_report_id),
      operation_id = coalesce(operation_id, v_op)
    where id = v_id;
  else
    insert into public.report_emissions (nutritionist_id, patient_id, encounter_id, status, title, period_start, period_end, selected_sources,
      professional_text, source_snapshot, content_snapshot, content_hash, template_version, issued_at, created_by, revision_number,
      supersedes_report_id, operation_id)
    values (uid, v_pid, v_enc, 'emitido', payload->>'title', nullif(payload->>'period_start','')::date, nullif(payload->>'period_end','')::date, sel,
      payload->>'professional_text', fontes, conteudo, hash, 1, agora, uid, rev, nullif(payload->>'supersedes_report_id','')::uuid, v_op)
    returning id into v_id;
  end if;
  if sup.id is not null then
    update public.report_emissions set superseded_at = agora where id = sup.id and superseded_at is null;
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261002100000_governanca_leitura_integrada.sql
-- ---------------------------------------------------------------------------
-- V1 — ETAPA 5.2: GOVERNANCA E DUPLA APROVACAO DA LEITURA INTEGRADA.
-- NAO APLICADA em producao. Entra depois de 130000..220000.
--
-- Mesma governanca humana do Pacote Metodologico HOLOSCAN (migration 20261001210000):
--   Aprovacao 1: responsavel = Daniel  · papel = responsavel primario
--   Aprovacao 2: responsavel = Rodrigo · papel = revisao final
--   ordem obrigatoria Daniel -> Rodrigo; as duas sobre o MESMO package_id, version e content_hash.
--
-- Por que estruturas PROPRIAS (opcao B) e nao a generalizacao da tabela da 4.2:
--   methodology_package_approvals tem FK composta (package_id, nutritionist_id) para methodology_packages
--   (pacote do profissional). O pacote da Leitura Integrada e GLOBAL (sem nutritionist_id) e seu hash cobre
--   entidades que o HOLOSCAN nao tem (referencias metodologicas, conversoes, calculos derivados). Generalizar
--   exigiria alterar a tabela e as funcoes ja aprovadas do HOLOSCAN; espelhar o contrato nao toca nelas.
--   Contrato identico: ordem, pessoas, hash conferido, invalidacao append-only, acao final explicita.
--
-- Regras:
--   1. Nenhuma aprovacao e automatica: so registrar_aprovacao_li escreve; a tabela nao tem GRANT de escrita.
--   2. Aprovacao 2 so existe sobre uma Aprovacao 1 VIGENTE do mesmo package_id, version e content_hash.
--   3. Qualquer mudanca metodologica (pacote: code/version; dominio, vinculo, regra, dependencia;
--      referencia/conversao/derivado REFERENCIADOS) invalida as aprovacoes vigentes (historico mantido,
--      com motivo). Voltar o conteudo ao hash antigo NAO reativa aprovacao invalidada.
--   4. As duas aprovacoes NAO homologam: homologar_pacote_li e o ato final explicito, que exige completude
--      metodologica (li_validar_completude sem bloqueio), hash atual e as duas aprovacoes vigentes.
--   5. status 'aprovado' so por homologar_pacote_li (trigger recusa UPDATE direto); pacote aprovado e
--      imutavel (so pode ser retirado); grava snapshot imutavel do conteudo homologado.
--   6. Nada atribuido a "Liderança do método HOLOSCAN".
--   7. O pacote real LI-V1@1 continua em rascunho, sem dominio, vinculo, regra ou aprovacao.

-- ============================================================================
-- 1. DEPENDENCIAS DO PACOTE (referencias / conversoes / derivados que o pacote USA)
-- ============================================================================
-- Uma referencia, conversao ou calculo derivado so e elegivel para um pacote oficial se estiver
-- referenciado aqui (ou em links.reference_id) — e portanto dentro do hash/snapshot homologado.
create table public.integrated_reading_package_dependencies (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  kind        text not null,
  ref_id      uuid not null,
  status      text not null default 'rascunho',
  created_at  timestamptz not null default now(),
  constraint irpd_kind check (kind in ('reference','conversion','derived')),
  constraint irpd_status check (status in ('rascunho','em_revisao','aprovado','retirado')),
  constraint irpd_unique unique (package_id, kind, ref_id)
);
alter table public.integrated_reading_package_dependencies enable row level security;
create policy irpd_select on public.integrated_reading_package_dependencies for select to authenticated using (true);
revoke all on table public.integrated_reading_package_dependencies from public, anon, authenticated;
grant select on table public.integrated_reading_package_dependencies to authenticated;

-- ============================================================================
-- 2. CONTEUDO CANONICO E HASH
-- ============================================================================
-- Entra tudo o que pode mudar uma saida oficial: identificacao e versao do pacote; dominios; vinculos
-- (exame, variante, material, direcao, referencia resolvida); TODAS as regras (temporal, suficiencia,
-- mistos, convergencia/divergencia, textos e qualquer tipo futuro, com payload integral); dependencias
-- resolvidas (conteudo + versao de referencias, conversoes e derivados). Ordenacao canonica por chaves de
-- negocio; jsonb normaliza a ordem das chaves. Fora: ids, created_at/updated_at, aprovacoes, notes.
create or replace function public.li_conteudo_canonico(p_package_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'package', (select jsonb_build_object('code', p.code, 'version', p.version) from public.integrated_reading_rule_packages p where p.id = p_package_id),
    'domains', (select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name, 'holoscan_system', d.holoscan_system, 'status', d.status) order by d.code), '[]')
                  from public.integrated_reading_domains d where d.package_id = p_package_id),
    'links', (select coalesce(jsonb_agg(jsonb_build_object('domain', d.code, 'exam_code', l.exam_code, 'variant', l.variant, 'material', l.material, 'direction', l.direction, 'status', l.status,
                  'reference', (select to_jsonb(r) - 'id' - 'created_at' - 'updated_at' from public.lab_method_references r where r.id = l.reference_id))
                  order by d.code, l.exam_code, coalesce(l.variant, ''), coalesce(l.material, ''), l.direction), '[]')
                from public.integrated_reading_exam_domain_links l join public.integrated_reading_domains d on d.id = l.domain_id where l.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(jsonb_build_object('rule_type', x.rule_type, 'target', x.target, 'payload', x.payload, 'status', x.status) order by x.rule_type, x.target), '[]')
                from public.integrated_reading_rules x where x.package_id = p_package_id),
    'dependencies', (select coalesce(jsonb_agg(jsonb_build_object('kind', k.kind, 'status', k.status, 'content',
                  case k.kind
                    when 'reference'  then (select to_jsonb(r) - 'id' - 'created_at' - 'updated_at' from public.lab_method_references r where r.id = k.ref_id)
                    when 'conversion' then (select to_jsonb(c) - 'id' - 'created_at' - 'updated_at' from public.lab_unit_conversion_rules c where c.id = k.ref_id)
                    when 'derived'    then (select to_jsonb(e) - 'id' - 'created_at' - 'updated_at' from public.lab_derived_calculations e where e.id = k.ref_id)
                  end) order by k.kind, k.ref_id), '[]')
                from public.integrated_reading_package_dependencies k where k.package_id = p_package_id)
  )
$$;
create or replace function public.li_hash_conteudo(p_package_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select encode(sha256(convert_to(public.li_conteudo_canonico(p_package_id)::text, 'UTF8')), 'hex')
$$;
revoke all on function public.li_conteudo_canonico(uuid), public.li_hash_conteudo(uuid) from public, anon;
grant execute on function public.li_conteudo_canonico(uuid), public.li_hash_conteudo(uuid) to authenticated;

-- ============================================================================
-- 3. VALIDADOR DE COMPLETUDE (tecnico — nao inventa conteudo)
-- ============================================================================
-- Devolve { publicavel, total_bloqueios, bloqueios: [codigo...] }. Um pacote so e homologavel sem bloqueios.
create or replace function public.li_validar_completude(p_package_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare b text[] := '{}'; d record; n int;
begin
  if not exists (select 1 from public.integrated_reading_rule_packages where id = p_package_id) then
    return jsonb_build_object('publicavel', false, 'total_bloqueios', 1, 'bloqueios', jsonb_build_array('pacote_inexistente'));
  end if;
  if not exists (select 1 from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado') then b := array_append(b, 'sem_dominio_aprovado'); end if;
  for d in select * from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado' order by code loop
    if not exists (select 1 from public.integrated_reading_exam_domain_links l where l.domain_id = d.id and l.status = 'aprovado') then b := array_append(b, ('dominio_sem_vinculo_aprovado:' || d.code)); end if;
    if not exists (select 1 from public.integrated_reading_rules r where r.package_id = p_package_id and r.rule_type = 'convergence' and r.status = 'aprovado' and r.target in ('global', d.id::text, d.code)) then b := array_append(b, ('dominio_sem_regra_convergencia:' || d.code)); end if;
  end loop;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'temporal' and status = 'aprovado') then b := array_append(b, 'sem_regra_temporal'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'sufficiency' and status = 'aprovado') then b := array_append(b, 'sem_regra_suficiencia'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'mixed' and status = 'aprovado') then b := array_append(b, 'sem_regra_resultados_mistos'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'convergence' and status = 'aprovado') then b := array_append(b, 'sem_regra_convergencia_divergencia'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'text' and status = 'aprovado'
                   and payload ? 'convergente' and payload ? 'divergente' and payload ? 'sem_dados_suficientes') then b := array_append(b, 'sem_texto_oficial_dos_tres_estados'); end if;
  select count(*) into n from (
    select 1 from public.integrated_reading_domains where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_exam_domain_links where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_rules where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_package_dependencies where package_id = p_package_id and status in ('rascunho','em_revisao')) z;
  if n > 0 then b := array_append(b, ('elementos_nao_aprovados:' || n)); end if;
  select count(*) into n from public.integrated_reading_exam_domain_links l join public.lab_method_references r on r.id = l.reference_id
    where l.package_id = p_package_id and r.status <> 'aprovado';
  if n > 0 then b := array_append(b, ('vinculo_com_referencia_nao_aprovada:' || n)); end if;
  select count(*) into n from public.integrated_reading_package_dependencies k
    where k.package_id = p_package_id and not (
      (k.kind = 'reference'  and exists (select 1 from public.lab_method_references r where r.id = k.ref_id and r.status = 'aprovado')) or
      (k.kind = 'conversion' and exists (select 1 from public.lab_unit_conversion_rules c where c.id = k.ref_id and c.status = 'aprovado')) or
      (k.kind = 'derived'    and exists (select 1 from public.lab_derived_calculations e where e.id = k.ref_id and e.status = 'aprovado')));
  if n > 0 then b := array_append(b, ('dependencia_nao_aprovada_ou_inexistente:' || n)); end if;
  return jsonb_build_object('publicavel', coalesce(array_length(b, 1), 0) = 0, 'total_bloqueios', coalesce(array_length(b, 1), 0), 'bloqueios', to_jsonb(b));
end;
$$;
revoke all on function public.li_validar_completude(uuid) from public, anon;
grant execute on function public.li_validar_completude(uuid) to authenticated;

-- ============================================================================
-- 4. APROVACOES (append-only) E SNAPSHOT
-- ============================================================================
create table public.integrated_reading_package_approvals (
  id                 uuid primary key default gen_random_uuid(),
  package_id         uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  package_version    integer not null,
  content_hash       text not null,
  step               smallint not null,
  role               text not null,
  responsible        text not null,
  justification      text not null,
  approved_by        uuid not null default auth.uid() references auth.users(id),
  approved_at        timestamptz not null default now(),
  invalidated_at     timestamptz,
  invalidated_reason text,
  created_at         timestamptz not null default now(),
  constraint li_approvals_ordem check (
    (step = 1 and role = 'responsavel_primario' and responsible = 'Daniel')
    or (step = 2 and role = 'revisao_final' and responsible = 'Rodrigo')),
  constraint li_approvals_sem_lideranca check (responsible !~* 'lideran'),
  constraint li_approvals_justificativa check (length(btrim(justification)) > 0),
  constraint li_approvals_hash check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint li_approvals_invalidacao check ((invalidated_at is null) = (invalidated_reason is null))
);
create unique index li_approvals_uma_vigente on public.integrated_reading_package_approvals (package_id, step) where invalidated_at is null;
create index li_approvals_pacote_idx on public.integrated_reading_package_approvals (package_id, approved_at);

create or replace function public.proteger_aprovacao_li()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'aprovacao da leitura integrada e historico: nao e apagada' using errcode = 'P0001', hint = 'aprovacao_imutavel'; end if;
  if old.invalidated_at is not null or new.invalidated_at is null
     or (to_jsonb(old) - 'invalidated_at' - 'invalidated_reason') <> (to_jsonb(new) - 'invalidated_at' - 'invalidated_reason') then
    raise exception 'aprovacao da leitura integrada e imutavel: so pode ser invalidada (uma vez)' using errcode = 'P0001', hint = 'aprovacao_imutavel';
  end if;
  return new;
end $$;
create trigger li_approvals_proteger before update or delete on public.integrated_reading_package_approvals for each row execute function public.proteger_aprovacao_li();

alter table public.integrated_reading_package_approvals enable row level security;
create policy li_approvals_select on public.integrated_reading_package_approvals for select to authenticated using (true);
revoke all on table public.integrated_reading_package_approvals from public, anon, authenticated;
grant select on table public.integrated_reading_package_approvals to authenticated;

create table public.integrated_reading_package_snapshots (
  id               uuid primary key default gen_random_uuid(),
  package_id       uuid not null references public.integrated_reading_rule_packages(id) on delete restrict,
  package_version  integer not null,
  content_hash     text not null,
  snapshot         jsonb not null,
  approval_1       uuid not null references public.integrated_reading_package_approvals(id),
  approval_2       uuid not null references public.integrated_reading_package_approvals(id),
  homologated_by   uuid not null default auth.uid() references auth.users(id),
  homologated_at   timestamptz not null default now(),
  constraint li_snapshots_unique unique (package_id, package_version)
);
create or replace function public.proteger_snapshot_li()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'snapshot homologado da leitura integrada e imutavel' using errcode = 'P0001', hint = 'snapshot_imutavel'; end $$;
create trigger li_snapshots_proteger before update or delete on public.integrated_reading_package_snapshots for each row execute function public.proteger_snapshot_li();
alter table public.integrated_reading_package_snapshots enable row level security;
create policy li_snapshots_select on public.integrated_reading_package_snapshots for select to authenticated using (true);
revoke all on table public.integrated_reading_package_snapshots from public, anon, authenticated;
grant select on table public.integrated_reading_package_snapshots to authenticated;

-- ============================================================================
-- 5. INVALIDACAO (pacote e filhas; referencias/conversoes/derivados referenciados)
-- ============================================================================
create or replace function public.li_invalidar_aprovacoes(p_package_id uuid, p_motivo text)
returns void language sql security definer set search_path = '' as $$
  update public.integrated_reading_package_approvals
     set invalidated_at = now(), invalidated_reason = p_motivo
   where package_id = p_package_id and invalidated_at is null;
$$;
revoke all on function public.li_invalidar_aprovacoes(uuid, text) from public, anon, authenticated;

create or replace function public.li_invalidar_trigger()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_pid uuid; v_motivo text := 'conteudo metodologico alterado depois da aprovacao (' || tg_table_name || ' ' || lower(tg_op) || ')';
begin
  if tg_table_name = 'integrated_reading_rule_packages' then
    if new.version is not distinct from old.version and new.code is not distinct from old.code then return new; end if;
    perform public.li_invalidar_aprovacoes(new.id, 'pacote alterado depois da aprovacao (code/version)');
    return new;
  end if;
  if tg_table_name in ('integrated_reading_domains', 'integrated_reading_exam_domain_links', 'integrated_reading_rules', 'integrated_reading_package_dependencies') then
    v_pid := case when tg_op = 'DELETE' then old.package_id else new.package_id end;
    perform public.li_invalidar_aprovacoes(v_pid, v_motivo);
    if tg_op = 'DELETE' then return old; end if; return new;
  end if;
  -- entidade referenciada mudou: invalida TODOS os pacotes que a referenciam (dependencia ou vinculo)
  for v_pid in
    select distinct k.package_id from public.integrated_reading_package_dependencies k
      where k.ref_id = coalesce(new.id, old.id)
        and k.kind = case tg_table_name when 'lab_method_references' then 'reference' when 'lab_unit_conversion_rules' then 'conversion' else 'derived' end
    union
    select distinct l.package_id from public.integrated_reading_exam_domain_links l
      where tg_table_name = 'lab_method_references' and l.reference_id = coalesce(new.id, old.id)
  loop
    perform public.li_invalidar_aprovacoes(v_pid, 'entidade referenciada alterada depois da aprovacao (' || tg_table_name || ' ' || lower(tg_op) || ')');
  end loop;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
revoke all on function public.li_invalidar_trigger() from public, anon, authenticated;
create trigger irp_invalida_aprovacoes  after update on public.integrated_reading_rule_packages for each row execute function public.li_invalidar_trigger();
create trigger ird_invalida_aprovacoes  after insert or update or delete on public.integrated_reading_domains for each row execute function public.li_invalidar_trigger();
create trigger irl_invalida_aprovacoes  after insert or update or delete on public.integrated_reading_exam_domain_links for each row execute function public.li_invalidar_trigger();
create trigger irr_invalida_aprovacoes  after insert or update or delete on public.integrated_reading_rules for each row execute function public.li_invalidar_trigger();
create trigger irpd_invalida_aprovacoes after insert or update or delete on public.integrated_reading_package_dependencies for each row execute function public.li_invalidar_trigger();
create trigger lmr_invalida_aprovacoes_li after update or delete on public.lab_method_references for each row execute function public.li_invalidar_trigger();
create trigger lucr_invalida_aprovacoes_li after update or delete on public.lab_unit_conversion_rules for each row execute function public.li_invalidar_trigger();
create trigger ldc_invalida_aprovacoes_li after update or delete on public.lab_derived_calculations for each row execute function public.li_invalidar_trigger();

-- ============================================================================
-- 6. 'aprovado' SO PELA RPC FINAL; aprovado/retirado imutaveis
-- ============================================================================
create or replace function public.proteger_pacote_li()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'aprovado' and old.status <> 'aprovado' and coalesce(current_setting('holohacking.li_homologar', true), '') <> old.id::text then
    raise exception 'aprovacao nao e edicao administrativa: use homologar_pacote_li (completude + Aprovacao 1 e 2 vigentes)' using errcode = 'P0001', hint = 'aprovacao_direta';
  end if;
  if old.status = 'aprovado' and coalesce(current_setting('holohacking.li_homologar', true), '') <> old.id::text then
    if new.status = 'retirado' and (to_jsonb(old) - 'status') = (to_jsonb(new) - 'status') then return new; end if;
    raise exception 'pacote da leitura integrada aprovado e imutavel: alteracao exige NOVA VERSAO (so pode ser retirado)' using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  if old.status = 'retirado' and to_jsonb(old) <> to_jsonb(new) then
    raise exception 'pacote retirado e historico: nao muda' using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  return new;
end $$;
create trigger irp_proteger before update on public.integrated_reading_rule_packages for each row execute function public.proteger_pacote_li();

create or replace function public.proteger_filha_pacote_li()
returns trigger language plpgsql set search_path = '' as $$
declare v_pid uuid := case when tg_op = 'DELETE' then old.package_id else new.package_id end; v_status text;
begin
  select status into v_status from public.integrated_reading_rule_packages where id = v_pid;
  if v_status in ('aprovado', 'retirado') and coalesce(current_setting('holohacking.li_homologar', true), '') <> v_pid::text then
    raise exception 'conteudo de pacote % da leitura integrada e imutavel: crie uma nova versao', v_status using errcode = 'P0001', hint = 'pacote_imutavel';
  end if;
  if tg_op = 'DELETE' then return old; end if; return new;
end $$;
create trigger ird_proteger  before insert or update or delete on public.integrated_reading_domains for each row execute function public.proteger_filha_pacote_li();
create trigger irl_proteger  before insert or update or delete on public.integrated_reading_exam_domain_links for each row execute function public.proteger_filha_pacote_li();
create trigger irr_proteger  before insert or update or delete on public.integrated_reading_rules for each row execute function public.proteger_filha_pacote_li();
create trigger irpd_proteger before insert or update or delete on public.integrated_reading_package_dependencies for each row execute function public.proteger_filha_pacote_li();

-- ============================================================================
-- 7. REGISTRAR UMA APROVACAO (ato humano; uma etapa por chamada)
-- ============================================================================
-- p_content_hash: o hash que a pessoa conferiu na tela; tem de ser o do conteudo atual. p_version idem.
-- A completude NAO e exigida aqui (e exigida na homologacao): a resposta traz os bloqueios atuais.
create or replace function public.registrar_aprovacao_li(p_package_id uuid, p_version integer, p_content_hash text, p_etapa integer, p_responsavel text, p_justificativa text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; h text; resp text := btrim(coalesce(p_responsavel, '')); a1 public.integrated_reading_package_approvals%rowtype; novo uuid;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e da revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual do pacote (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  -- aprovacoes vigentes de outra versao ou outro conteudo nao valem mais (historico mantido)
  update public.integrated_reading_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if p_etapa = 1 then
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid) returning id into novo;
  else
    select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by)
      values (p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', case when p_etapa = 1 then 'Daniel' else 'Rodrigo' end, 'status_pacote', pk.status, 'completude', public.li_validar_completude(p_package_id));
end;
$$;
revoke all on function public.registrar_aprovacao_li(uuid, integer, text, integer, text, text) from public, anon;
grant execute on function public.registrar_aprovacao_li(uuid, integer, text, integer, text, text) to authenticated;

-- ============================================================================
-- 8. HOMOLOGAR (acao final explicita) — completude + hash atual + Aprovacoes 1 e 2 vigentes
-- ============================================================================
-- p_responsavel: quem executa o ato final (Daniel ou Rodrigo; nunca a "Liderança"); fica no provenance.
create or replace function public.homologar_pacote_li(p_package_id uuid, p_version integer, p_content_hash text, p_responsavel text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; v jsonb; h text; a1 public.integrated_reading_package_approvals%rowtype; a2 public.integrated_reading_package_approvals%rowtype;
        resp text := btrim(coalesce(p_responsavel, '')); snap jsonb; sid uuid; prov jsonb;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser homologado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if resp ~* 'lideran' or resp not in ('Daniel', 'Rodrigo') then raise exception 'homologacao e ato de Daniel ou Rodrigo (nunca da "Liderança do método HOLOSCAN")' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  v := public.li_validar_completude(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'metodologia da leitura integrada incompleta: % bloqueio(s) — %', v->>'total_bloqueios', left((v->'bloqueios')::text, 400) using errcode = 'P0001', hint = 'metodologia_incompleta';
  end if;
  select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  select * into a2 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null;
  if a1.id is null or a2.id is null or a1.package_version <> pk.version or a2.package_version <> pk.version or a1.content_hash <> h or a2.content_hash <> h or a2.approved_at < a1.approved_at then
    raise exception 'homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) vigentes sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  snap := public.li_conteudo_canonico(p_package_id);
  prov := jsonb_build_object('aprovacao_1', jsonb_build_object('id', a1.id, 'responsavel', a1.responsible, 'papel', a1.role, 'em', a1.approved_at, 'justificativa', a1.justification),
                             'aprovacao_2', jsonb_build_object('id', a2.id, 'responsavel', a2.responsible, 'papel', a2.role, 'em', a2.approved_at, 'justificativa', a2.justification),
                             'homologado_por', resp, 'homologado_em', now(), 'content_hash', h, 'completude', v);
  perform set_config('holohacking.li_homologar', p_package_id::text, true);
  insert into public.integrated_reading_package_snapshots (package_id, package_version, content_hash, snapshot, approval_1, approval_2, homologated_by)
    values (p_package_id, pk.version, h, snap, a1.id, a2.id, uid) returning id into sid;
  update public.integrated_reading_rule_packages set status = 'aprovado', content_hash = h,
    responsible = 'Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)', approval_provenance = prov
    where id = p_package_id;
  perform set_config('holohacking.li_homologar', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'aprovacao_1', a1.id, 'aprovacao_2', a2.id, 'snapshot_id', sid, 'completude', v);
end;
$$;
revoke all on function public.homologar_pacote_li(uuid, integer, text, text) from public, anon;
grant execute on function public.homologar_pacote_li(uuid, integer, text, text) to authenticated;

-- ============================================================================
-- 9. ESTADO DO PACOTE REAL: inalterado (rascunho, sem dominio/vinculo/regra, SEM aprovacao)
-- ============================================================================
do $$
begin
  if (select count(*) from public.integrated_reading_package_approvals) <> 0 then raise exception 'governanca LI: nenhuma aprovacao pode nascer da migration'; end if;
  if (select status from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1) <> 'rascunho' then raise exception 'governanca LI: LI-V1@1 tem de continuar em rascunho'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261002110000_aprovadores_metodologicos.sql
-- ---------------------------------------------------------------------------
-- V1 — ETAPA 5.3: IDENTIDADE REAL NA DUPLA APROVACAO (HOLOSCAN e Leitura Integrada).
-- NAO APLICADA em producao. Entra depois de 130000..20261002100000.
--
-- Auditoria (Etapa 5.3): nas migrations 210000 (HOLOSCAN) e 20261002100000 (LI), a Aprovacao 1/2 validava
-- apenas a STRING p_responsavel ('Daniel' / 'Rodrigo') e gravava approved_by = auth.uid() sem conferir se
-- aquele uid estava autorizado para o papel: qualquer usuario autenticado conseguia informar "Daniel".
-- Correcao, compativel com Daniel -> Rodrigo, hash conferido, invalidacao, historico e acao final:
--   1. methodology_approvers: quem (auth user) e aprovador de qual escopo (holoscan | integrated_reading) e
--      etapa (1 | 2). Configurada SO por gestao tecnica (migration/SQL com os uids reais, que NAO estao no
--      repositorio). A aplicacao so le os proprios papeis. Nasce VAZIA: ate ser configurada, ninguem aprova.
--   2. Um usuario tem no maximo UM papel por escopo (unique (scope, user_id)): quatro olhos de verdade.
--   3. registrar_aprovacao_metodologica / registrar_aprovacao_li: o chamador (auth.uid()) tem de ser o aprovador
--      ativo daquele escopo+etapa; o nome continua sendo conferido (display/auditoria) e tem de bater com o papel.
--      approver_id e approved_by ficam na aprovacao (historico: nome + uid real).
--   4. homologar_pacote_li: so por aprovador ativo da LI (p_responsavel = seu display_name).
--      aprovar_pacote_metodologico (HOLOSCAN) continua sendo o ato do dono do pacote, depois das duas aprovacoes.
--   5. Aprovadores (Daniel/Rodrigo) podem LER o pacote HOLOSCAN em_revisao de outro profissional (e suas filhas,
--      aprovacoes e registros) para conferir o hash: antes, so o dono via o pacote — e por isso o dono digitava
--      os dois nomes. Nenhuma escrita nova e concedida.

-- ============================================================================
-- 1. APROVADORES AUTORIZADOS (gestao tecnica; vazia)
-- ============================================================================
create table public.methodology_approvers (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete restrict,
  scope           text not null,
  approval_stage  smallint not null,
  display_name    text not null,
  active          boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id),
  constraint approvers_scope check (scope in ('holoscan','integrated_reading')),
  constraint approvers_stage check (approval_stage in (1, 2)),
  constraint approvers_nome_por_etapa check ((approval_stage = 1 and display_name = 'Daniel') or (approval_stage = 2 and display_name = 'Rodrigo')),
  constraint approvers_sem_lideranca check (display_name !~* 'lideran'),
  constraint approvers_um_papel_por_escopo unique (scope, user_id)
);
create index approvers_lookup on public.methodology_approvers (scope, approval_stage) where active;
alter table public.methodology_approvers enable row level security;
create policy approvers_select_proprio on public.methodology_approvers for select to authenticated using (user_id = (select auth.uid()));
revoke all on table public.methodology_approvers from public, anon, authenticated;
grant select on table public.methodology_approvers to authenticated;

-- aprovador ativo do chamador para (escopo, etapa); null se nao autorizado
create or replace function public.aprovador_autorizado(p_scope text, p_stage integer)
returns public.methodology_approvers
language sql stable security definer set search_path = '' as $$
  select a.* from public.methodology_approvers a
   where a.user_id = auth.uid() and a.scope = p_scope and a.approval_stage = p_stage and a.active
   limit 1
$$;
create or replace function public.eh_aprovador(p_scope text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.methodology_approvers a where a.user_id = auth.uid() and a.scope = p_scope and a.active)
$$;
-- a tela so precisa saber os PROPRIOS papeis
create or replace function public.meus_papeis_aprovacao()
returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('scope', a.scope, 'approval_stage', a.approval_stage, 'display_name', a.display_name) order by a.scope, a.approval_stage), '[]'::jsonb)
    from public.methodology_approvers a where a.user_id = auth.uid() and a.active
$$;
revoke all on function public.aprovador_autorizado(text, integer), public.eh_aprovador(text), public.meus_papeis_aprovacao() from public, anon;
grant execute on function public.aprovador_autorizado(text, integer), public.eh_aprovador(text), public.meus_papeis_aprovacao() to authenticated;

-- ============================================================================
-- 2. APROVACOES GUARDAM O APROVADOR REAL (nome + uid ja estavam; agora tambem o papel autorizado)
-- ============================================================================
alter table public.methodology_package_approvals add column approver_id uuid references public.methodology_approvers(id);
alter table public.integrated_reading_package_approvals add column approver_id uuid references public.methodology_approvers(id);

-- ============================================================================
-- 3. APROVADOR LE O PACOTE HOLOSCAN em_revisao de outro profissional (para conferir o hash); nenhuma escrita
-- ============================================================================
create policy methodology_packages_aprovador_select on public.methodology_packages for select to authenticated
  using (status = 'em_revisao' and public.eh_aprovador('holoscan'));
do $$
declare t text;
begin
  foreach t in array array['methodology_questionnaire_editions','methodology_scales','methodology_systems','methodology_questions','methodology_associations','methodology_ranges','methodology_rules','methodology_homologation_records','methodology_package_approvals'] loop
    execute format('create policy %I_aprovador_select on public.%I for select to authenticated using (public.eh_aprovador(''holoscan'') and exists (select 1 from public.methodology_packages p where p.id = %I.package_id and p.status = ''em_revisao''))', t, t, t);
  end loop;
end $$;

-- ============================================================================
-- 4. HOLOSCAN: registrar aprovacao exige o aprovador autenticado do papel
-- ============================================================================
create or replace function public.registrar_aprovacao_metodologica(p_package_id uuid, p_etapa integer, p_responsavel text, p_justificativa text, p_content_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.methodology_packages%rowtype; h text; v jsonb; resp text := btrim(coalesce(p_responsavel, '')); a1 public.methodology_package_approvals%rowtype; novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario pela homologacao (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e do segundo responsavel / revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  -- identidade real: o usuario autenticado tem de ser o aprovador ativo deste escopo e etapa
  ap := public.aprovador_autorizado('holoscan', p_etapa);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado para a Aprovacao % do HOLOSCAN (%)', p_etapa, resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.methodology_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  h := public.metodologia_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  v := public.validar_pacote_metodologico(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'aprovacao bloqueada pelo validador: % erro(s)', v->>'total_erros' using errcode = 'P0001', hint = 'publicacao_bloqueada';
  end if;
  update public.methodology_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if p_etapa = 1 then
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (pk.nutritionist_id, p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  else
    select * into a1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) valida sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if a1.approved_by = uid then
      raise exception 'Aprovacao 2 tem de ser de outra pessoa (quatro olhos): o mesmo usuario registrou a Aprovacao 1' using errcode = 'P0001', hint = 'aprovador_nao_autorizado'; end if;
    if exists (select 1 from public.methodology_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.methodology_package_approvals (nutritionist_id, package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (pk.nutritionist_id, p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid, ap.id) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status);
end;
$$;

-- ============================================================================
-- 5. LEITURA INTEGRADA: registrar aprovacao e homologar exigem o aprovador autenticado
-- ============================================================================
create or replace function public.registrar_aprovacao_li(p_package_id uuid, p_version integer, p_content_hash text, p_etapa integer, p_responsavel text, p_justificativa text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; h text; resp text := btrim(coalesce(p_responsavel, '')); a1 public.integrated_reading_package_approvals%rowtype; novo uuid; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if p_etapa is null or p_etapa not in (1, 2) then raise exception 'etapa de aprovacao invalida: %', p_etapa using errcode = 'P0001', hint = 'etapa_invalida'; end if;
  if resp ~* 'lideran' then raise exception 'aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 1 and resp <> 'Daniel' then raise exception 'Aprovacao 1 e do responsavel primario (Daniel)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  if p_etapa = 2 and resp <> 'Rodrigo' then raise exception 'Aprovacao 2 e da revisao final (Rodrigo)' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  ap := public.aprovador_autorizado('integrated_reading', p_etapa);
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e o aprovador autorizado para a Aprovacao % da Leitura Integrada (%)', p_etapa, resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao recebe aprovacao (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if length(btrim(coalesce(p_justificativa, ''))) = 0 then raise exception 'aprovacao exige justificativa' using errcode = 'P0001', hint = 'registro_incompleto'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual do pacote (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then
    raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente';
  end if;
  update public.integrated_reading_package_approvals set invalidated_at = now(), invalidated_reason = 'versao ou conteudo diferentes do atual'
   where package_id = p_package_id and invalidated_at is null and (package_version <> pk.version or content_hash <> h);
  if p_etapa = 1 then
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null) then
      raise exception 'Aprovacao 1 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (p_package_id, pk.version, h, 1, 'responsavel_primario', 'Daniel', btrim(p_justificativa), uid, ap.id) returning id into novo;
  else
    select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
    if not found or a1.package_version <> pk.version or a1.content_hash <> h then
      raise exception 'Aprovacao 2 exige uma Aprovacao 1 (Daniel) vigente sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'ordem_invalida'; end if;
    if a1.approved_by = uid then
      raise exception 'Aprovacao 2 tem de ser de outra pessoa (quatro olhos): o mesmo usuario registrou a Aprovacao 1' using errcode = 'P0001', hint = 'aprovador_nao_autorizado'; end if;
    if exists (select 1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null) then
      raise exception 'Aprovacao 2 ja registrada para este conteudo' using errcode = 'P0001', hint = 'aprovacao_repetida'; end if;
    insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by, approver_id)
      values (p_package_id, pk.version, h, 2, 'revisao_final', 'Rodrigo', btrim(p_justificativa), uid, ap.id) returning id into novo;
  end if;
  return jsonb_build_object('id', novo, 'package_id', p_package_id, 'package_version', pk.version, 'content_hash', h, 'etapa', p_etapa,
    'responsavel', ap.display_name, 'approved_by', uid, 'approver_id', ap.id, 'status_pacote', pk.status, 'completude', public.li_validar_completude(p_package_id));
end;
$$;

create or replace function public.homologar_pacote_li(p_package_id uuid, p_version integer, p_content_hash text, p_responsavel text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare uid uuid := auth.uid(); pk public.integrated_reading_rule_packages%rowtype; v jsonb; h text; a1 public.integrated_reading_package_approvals%rowtype; a2 public.integrated_reading_package_approvals%rowtype;
        resp text := btrim(coalesce(p_responsavel, '')); snap jsonb; sid uuid; prov jsonb; ap public.methodology_approvers;
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  if resp ~* 'lideran' or resp not in ('Daniel', 'Rodrigo') then raise exception 'homologacao e ato de Daniel ou Rodrigo (nunca da "Liderança do método HOLOSCAN")' using errcode = 'P0001', hint = 'responsavel_invalido'; end if;
  select a.* into ap from public.methodology_approvers a where a.user_id = uid and a.scope = 'integrated_reading' and a.active limit 1;
  if ap.id is null or ap.display_name <> resp then
    raise exception 'o usuario autenticado nao e aprovador autorizado da Leitura Integrada (%)', resp using errcode = 'P0001', hint = 'aprovador_nao_autorizado';
  end if;
  select * into pk from public.integrated_reading_rule_packages p where p.id = p_package_id for update;
  if not found then raise exception 'pacote % nao encontrado', p_package_id using errcode = 'P0002'; end if;
  if pk.status <> 'em_revisao' then raise exception 'so um pacote em_revisao pode ser homologado (status atual: %)', pk.status using errcode = 'P0001', hint = 'status_invalido'; end if;
  if p_version is distinct from pk.version then raise exception 'a versao conferida (%) nao e a versao atual (%)', p_version, pk.version using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  h := public.li_hash_conteudo(p_package_id);
  if p_content_hash is distinct from h then raise exception 'o pacote mudou: o hash conferido (%) nao e o do conteudo atual (%)', coalesce(left(p_content_hash, 12), 'nenhum'), left(h, 12) using errcode = 'P0001', hint = 'conteudo_divergente'; end if;
  v := public.li_validar_completude(p_package_id);
  if not (v->>'publicavel')::boolean then
    raise exception 'metodologia da leitura integrada incompleta: % bloqueio(s) — %', v->>'total_bloqueios', left((v->'bloqueios')::text, 400) using errcode = 'P0001', hint = 'metodologia_incompleta';
  end if;
  select * into a1 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 1 and x.invalidated_at is null;
  select * into a2 from public.integrated_reading_package_approvals x where x.package_id = p_package_id and x.step = 2 and x.invalidated_at is null;
  if a1.id is null or a2.id is null or a1.package_version <> pk.version or a2.package_version <> pk.version or a1.content_hash <> h or a2.content_hash <> h or a2.approved_at < a1.approved_at then
    raise exception 'homologacao exige Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) vigentes sobre o mesmo package_id, version e content_hash' using errcode = 'P0001', hint = 'aprovacoes_incompletas';
  end if;
  snap := public.li_conteudo_canonico(p_package_id);
  prov := jsonb_build_object('aprovacao_1', jsonb_build_object('id', a1.id, 'responsavel', a1.responsible, 'papel', a1.role, 'em', a1.approved_at, 'justificativa', a1.justification, 'approved_by', a1.approved_by),
                             'aprovacao_2', jsonb_build_object('id', a2.id, 'responsavel', a2.responsible, 'papel', a2.role, 'em', a2.approved_at, 'justificativa', a2.justification, 'approved_by', a2.approved_by),
                             'homologado_por', resp, 'homologado_por_uid', uid, 'homologado_em', now(), 'content_hash', h, 'completude', v);
  perform set_config('holohacking.li_homologar', p_package_id::text, true);
  insert into public.integrated_reading_package_snapshots (package_id, package_version, content_hash, snapshot, approval_1, approval_2, homologated_by)
    values (p_package_id, pk.version, h, snap, a1.id, a2.id, uid) returning id into sid;
  update public.integrated_reading_rule_packages set status = 'aprovado', content_hash = h,
    responsible = 'Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)', approval_provenance = prov
    where id = p_package_id;
  perform set_config('holohacking.li_homologar', '', true);
  return jsonb_build_object('id', p_package_id, 'status', 'aprovado', 'content_hash', h, 'aprovacao_1', a1.id, 'aprovacao_2', a2.id, 'snapshot_id', sid, 'completude', v);
end;
$$;

-- ============================================================================
-- 6. NADA MUDA NOS DADOS: tabela de aprovadores vazia; nenhuma aprovacao criada
-- ============================================================================
do $$
begin
  if (select count(*) from public.methodology_approvers) <> 0 then raise exception 'aprovadores: a migration nao cadastra ninguem (gestao tecnica com os uids reais)'; end if;
  if (select count(*) from public.integrated_reading_package_approvals) <> 0 then raise exception 'aprovadores: nenhuma aprovacao LI pode nascer da migration'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261002120000_etapa6_leitura_integrada_v1.sql
-- ---------------------------------------------------------------------------
-- V1 — ETAPA 6.0: LEITURA INTEGRADA V1 EXECUTAVEL (LI-V1 @ 2, em_revisao).
-- NAO APLICADA em producao. Entra depois de 130000..20261002110000. Validada so em PostgreSQL local (BEGIN/ROLLBACK).
--
-- Materializa o contrato metodologico decidido nas Etapas 5.4-5.13 (docs/v1/laboratorio/DECISAO-*.md,
-- DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md, PACOTE-FINAL-PENDENCIAS-EXECUTAVEIS-LI-V1.md):
--   1. extensao minima do schema da Etapa 5/5.2 (nada e dropado): dominio ganha definicao, modo de mapeamento
--      HOLOSCAN (mapped | none) e posicao; vinculo ganha cross_source_role (directional | contextual),
--      direction_rules (classificacao -> attention_*), variants_declared, versao, fonte e justificativa;
--      regras ganham os tipos holoscan_direction e reason_semantics; leitura salva ganha dominio, direcoes
--      e snapshot integral.
--   2. li_conteudo_canonico / li_hash_conteudo passam a cobrir os campos novos (hash do pacote).
--   3. li_validar_completude passa a exigir a regra de direcao HOLOSCAN e a coerencia mapped/none.
--   4. salvar_leitura_integrada congela dominio, direcoes, snapshot e os inclui no hash; recusa leitura
--      cross-source em dominio sem confronto (holoscan_mapping_mode = none) e estado incoerente com as direcoes.
--   5. SEED: LI-V1 versao 2, status em_revisao, com 7 dominios, 47 vinculos (9 directional + 38 contextual),
--      LI-TEMP-01 v1, mapeamento dominio -> sistema, suficiencia e mistos por dominio, convergencia, textos e
--      semantica de motivos — IDENTICO a leitura-integrada-pacote-v1.js (mesmo texto canonico, mesmo hash).
--      LI-V1 @ 1 (rascunho, infraestrutura) permanece como historico. 0 aprovacoes. Nada homologado.
--
-- Correcao semantica (Etapa 6.0): os mistos dos dominios D01-D04 TEM regra homologada (unanimidade); a mistura
-- present/not_detected gera laboratory_direction = indeterminate com reason code mixed_results_indeterminate.
-- mixed_without_rule fica reservado a conjunto futuro sem regra homologada. Estado oficial continua
-- sem_dados_suficientes (nenhum estado novo). Etapa 6.0.1: participante directional com direcao indeterminate
-- (sem excecao especifica) -> laboratory_direction indeterminate com directional_result_indeterminate;
-- mixed_results_indeterminate so quando ha mistura real present + not_detected; excecao D01 (fibrinogenio opcional).

-- ============================================================================
-- 1. SCHEMA (extensao minima)
-- ============================================================================
alter table public.integrated_reading_domains
  add column if not exists definition text,
  add column if not exists holoscan_mapping_mode text not null default 'none',
  add column if not exists position integer;
alter table public.integrated_reading_domains drop constraint if exists ird_mapping_mode;
alter table public.integrated_reading_domains add constraint ird_mapping_mode check (holoscan_mapping_mode in ('mapped','none'));
alter table public.integrated_reading_domains drop constraint if exists ird_mapping_coerente;
alter table public.integrated_reading_domains add constraint ird_mapping_coerente check (
  (holoscan_mapping_mode = 'mapped' and holoscan_system is not null) or (holoscan_mapping_mode = 'none' and holoscan_system is null));

alter table public.integrated_reading_exam_domain_links
  add column if not exists cross_source_role text not null default 'contextual',
  add column if not exists direction_rules jsonb,
  add column if not exists variants_declared text[],
  add column if not exists version integer not null default 1,
  add column if not exists source text,
  add column if not exists justification text;
alter table public.integrated_reading_exam_domain_links drop constraint if exists irl_role;
alter table public.integrated_reading_exam_domain_links add constraint irl_role check (cross_source_role in ('directional','contextual'));
alter table public.integrated_reading_exam_domain_links drop constraint if exists irl_directional_rules;
alter table public.integrated_reading_exam_domain_links add constraint irl_directional_rules check (
  (cross_source_role = 'directional' and direction_rules is not null) or (cross_source_role = 'contextual' and direction_rules is null));
alter table public.integrated_reading_exam_domain_links drop constraint if exists irl_unico;
alter table public.integrated_reading_exam_domain_links add constraint irl_unico unique (package_id, domain_id, exam_code, variant, material);

alter table public.integrated_reading_rules drop constraint if exists irr_type;
alter table public.integrated_reading_rules add constraint irr_type check (rule_type in ('sufficiency','temporal','mixed','convergence','text','holoscan_direction','reason_semantics'));

alter table public.integrated_readings
  add column if not exists domain_code text,
  add column if not exists holoscan_direction text,
  add column if not exists laboratory_direction text,
  add column if not exists snapshot jsonb not null default '{}'::jsonb;
alter table public.integrated_readings drop constraint if exists ir_direcoes;
alter table public.integrated_readings add constraint ir_direcoes check (
  (holoscan_direction is null or holoscan_direction in ('attention_present','attention_not_detected','indeterminate')) and
  (laboratory_direction is null or laboratory_direction in ('attention_present','attention_not_detected','indeterminate')));

-- ============================================================================
-- 2. CONTEUDO CANONICO (cobre os campos novos) — mesmo texto que leitura-integrada-pacote-v1.js
-- ============================================================================
create or replace function public.li_conteudo_canonico(p_package_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'package', (select jsonb_build_object('code', p.code, 'version', p.version) from public.integrated_reading_rule_packages p where p.id = p_package_id),
    'domains', (select coalesce(jsonb_agg(jsonb_build_object('code', d.code, 'name', d.name, 'definition', d.definition, 'holoscan_mapping_mode', d.holoscan_mapping_mode, 'holoscan_system', d.holoscan_system, 'status', d.status) order by d.code), '[]')
                  from public.integrated_reading_domains d where d.package_id = p_package_id),
    'links', (select coalesce(jsonb_agg(jsonb_build_object('domain', d.code, 'exam_code', l.exam_code, 'variant', l.variant, 'material', l.material, 'direction', l.direction, 'status', l.status,
                  'cross_source_role', l.cross_source_role, 'direction_rules', l.direction_rules, 'variants_declared', to_jsonb(l.variants_declared), 'version', l.version, 'source', l.source, 'justification', l.justification,
                  'reference', (select to_jsonb(r) - 'id' - 'created_at' - 'updated_at' from public.lab_method_references r where r.id = l.reference_id))
                  order by d.code, l.exam_code, coalesce(l.variant, ''), coalesce(l.material, ''), l.direction), '[]')
                from public.integrated_reading_exam_domain_links l join public.integrated_reading_domains d on d.id = l.domain_id where l.package_id = p_package_id),
    'rules', (select coalesce(jsonb_agg(jsonb_build_object('rule_type', x.rule_type, 'target', x.target, 'payload', x.payload, 'status', x.status) order by x.rule_type, x.target), '[]')
                from public.integrated_reading_rules x where x.package_id = p_package_id),
    'dependencies', (select coalesce(jsonb_agg(jsonb_build_object('kind', k.kind, 'status', k.status, 'content',
                  case k.kind
                    when 'reference'  then (select to_jsonb(r) - 'id' - 'created_at' - 'updated_at' from public.lab_method_references r where r.id = k.ref_id)
                    when 'conversion' then (select to_jsonb(c) - 'id' - 'created_at' - 'updated_at' from public.lab_unit_conversion_rules c where c.id = k.ref_id)
                    when 'derived'    then (select to_jsonb(e) - 'id' - 'created_at' - 'updated_at' from public.lab_derived_calculations e where e.id = k.ref_id)
                  end) order by k.kind, k.ref_id), '[]')
                from public.integrated_reading_package_dependencies k where k.package_id = p_package_id)
  )
$$;

-- ============================================================================
-- 3. COMPLETUDE: + regra de direcao HOLOSCAN; dominio mapped exige directional, suficiencia e mistos proprios;
--    dominio none nao tem directional. (Continua tecnico: nao inventa conteudo.)
-- ============================================================================
create or replace function public.li_validar_completude(p_package_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare b text[] := '{}'; d record; n int;
begin
  if not exists (select 1 from public.integrated_reading_rule_packages where id = p_package_id) then
    return jsonb_build_object('publicavel', false, 'total_bloqueios', 1, 'bloqueios', jsonb_build_array('pacote_inexistente'));
  end if;
  if not exists (select 1 from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado') then b := array_append(b, 'sem_dominio_aprovado'); end if;
  for d in select * from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado' order by code loop
    if not exists (select 1 from public.integrated_reading_exam_domain_links l where l.domain_id = d.id and l.status = 'aprovado') then b := array_append(b, ('dominio_sem_vinculo_aprovado:' || d.code)); end if;
    if not exists (select 1 from public.integrated_reading_rules r where r.package_id = p_package_id and r.rule_type = 'convergence' and r.status = 'aprovado' and r.target in ('global', d.id::text, d.code)) then b := array_append(b, ('dominio_sem_regra_convergencia:' || d.code)); end if;
    if d.holoscan_mapping_mode = 'mapped' then
      if not exists (select 1 from public.integrated_reading_exam_domain_links l where l.domain_id = d.id and l.status = 'aprovado' and l.cross_source_role = 'directional') then b := array_append(b, ('dominio_mapeado_sem_vinculo_directional:' || d.code)); end if;
      if not exists (select 1 from public.integrated_reading_rules r where r.package_id = p_package_id and r.rule_type = 'sufficiency' and r.status = 'aprovado' and r.target in (d.id::text, d.code)) then b := array_append(b, ('dominio_mapeado_sem_regra_suficiencia:' || d.code)); end if;
      if not exists (select 1 from public.integrated_reading_rules r where r.package_id = p_package_id and r.rule_type = 'mixed' and r.status = 'aprovado' and r.target in (d.id::text, d.code)) then b := array_append(b, ('dominio_mapeado_sem_regra_mistos:' || d.code)); end if;
    elsif exists (select 1 from public.integrated_reading_exam_domain_links l where l.domain_id = d.id and l.cross_source_role = 'directional') then
      b := array_append(b, ('dominio_sem_confronto_com_vinculo_directional:' || d.code));
    end if;
  end loop;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'temporal' and status = 'aprovado') then b := array_append(b, 'sem_regra_temporal'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'sufficiency' and status = 'aprovado') then b := array_append(b, 'sem_regra_suficiencia'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'mixed' and status = 'aprovado') then b := array_append(b, 'sem_regra_resultados_mistos'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'convergence' and status = 'aprovado') then b := array_append(b, 'sem_regra_convergencia_divergencia'); end if;
  if exists (select 1 from public.integrated_reading_domains where package_id = p_package_id and status = 'aprovado' and holoscan_mapping_mode = 'mapped')
     and not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'holoscan_direction' and status = 'aprovado') then b := array_append(b, 'sem_regra_direcao_holoscan'); end if;
  if not exists (select 1 from public.integrated_reading_rules where package_id = p_package_id and rule_type = 'text' and status = 'aprovado'
                   and payload ? 'convergente' and payload ? 'divergente' and payload ? 'sem_dados_suficientes') then b := array_append(b, 'sem_texto_oficial_dos_tres_estados'); end if;
  select count(*) into n from (
    select 1 from public.integrated_reading_domains where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_exam_domain_links where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_rules where package_id = p_package_id and status in ('rascunho','em_revisao')
    union all select 1 from public.integrated_reading_package_dependencies where package_id = p_package_id and status in ('rascunho','em_revisao')) z;
  if n > 0 then b := array_append(b, ('elementos_nao_aprovados:' || n)); end if;
  select count(*) into n from public.integrated_reading_exam_domain_links l join public.lab_method_references r on r.id = l.reference_id
    where l.package_id = p_package_id and r.status <> 'aprovado';
  if n > 0 then b := array_append(b, ('vinculo_com_referencia_nao_aprovada:' || n)); end if;
  select count(*) into n from public.integrated_reading_package_dependencies k
    where k.package_id = p_package_id and not (
      (k.kind = 'reference'  and exists (select 1 from public.lab_method_references r where r.id = k.ref_id and r.status = 'aprovado')) or
      (k.kind = 'conversion' and exists (select 1 from public.lab_unit_conversion_rules c where c.id = k.ref_id and c.status = 'aprovado')) or
      (k.kind = 'derived'    and exists (select 1 from public.lab_derived_calculations e where e.id = k.ref_id and e.status = 'aprovado')));
  if n > 0 then b := array_append(b, ('dependencia_nao_aprovada_ou_inexistente:' || n)); end if;
  return jsonb_build_object('publicavel', coalesce(array_length(b, 1), 0) = 0, 'total_bloqueios', coalesce(array_length(b, 1), 0), 'bloqueios', to_jsonb(b));
end;
$$;

-- ============================================================================
-- 4. LEITURA SALVA: dominio + direcoes + snapshot integral congelados e no hash
-- ============================================================================
create or replace function public.salvar_leitura_integrada(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); pid uuid; hid uuid; pkg public.integrated_reading_rule_packages%rowtype; dom public.integrated_reading_domains%rowtype; x text; cids uuid[] := '{}'; rids uuid[] := '{}'; novo uuid; sup uuid; rev int := 1; h text; conteudo jsonb; eid uuid;
        st text := payload->>'state'; dcode text := nullif(payload->>'domain_code',''); hd text := nullif(payload->>'holoscan_direction',''); ld text := nullif(payload->>'laboratory_direction','');
begin
  if uid is null then raise exception 'nao autenticado'; end if;
  pid := (payload->>'patient_id')::uuid;
  if not exists (select 1 from public.patients p where p.id = pid and p.nutritionist_id = uid) then raise exception 'paciente nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  if length(btrim(coalesce(payload->>'responsible',''))) = 0 then raise exception 'leitura exige responsavel identificado' using errcode = 'P0001'; end if;
  if st not in ('convergente','divergente','sem_dados_suficientes') then raise exception 'estado invalido' using errcode = 'P0001'; end if;
  if hd is not null and hd not in ('attention_present','attention_not_detected','indeterminate') then raise exception 'direcao HOLOSCAN invalida' using errcode = 'P0001'; end if;
  if ld is not null and ld not in ('attention_present','attention_not_detected','indeterminate') then raise exception 'direcao laboratorial invalida' using errcode = 'P0001'; end if;
  select * into pkg from public.integrated_reading_rule_packages k where k.id = (payload->>'rule_package_id')::uuid;
  if not found then raise exception 'pacote de regras nao encontrado' using errcode = 'P0002'; end if;
  if st <> 'sem_dados_suficientes' then
    if not exists (select 1 from public.integrated_reading_exam_domain_links l join public.integrated_reading_domains d on d.id = l.domain_id
        where l.package_id = pkg.id and l.status = 'aprovado' and d.status = 'aprovado') then
      raise exception 'pacote % sem vinculo exame→dominio aprovado: a unica leitura possivel e sem_dados_suficientes', pkg.code using errcode = 'P0001', hint = 'sem_regra_homologada';
    end if;
    if pkg.status <> 'aprovado' then raise exception 'pacote % nao aprovado: nenhuma leitura convergente/divergente e oficial', pkg.code using errcode = 'P0001', hint = 'sem_regra_homologada'; end if;
  end if;
  if dcode is not null then
    select * into dom from public.integrated_reading_domains d where d.package_id = pkg.id and d.code = dcode;
    if not found then raise exception 'dominio % nao pertence ao pacote %', dcode, pkg.code using errcode = 'P0002'; end if;
    if dom.holoscan_mapping_mode = 'none' then raise exception 'dominio % nao possui confronto HOLOSCAN na V1: nao ha leitura cross-source a salvar (informacao laboratorial apenas)', dcode using errcode = 'P0001', hint = 'dominio_sem_confronto'; end if;
  end if;
  if st <> 'sem_dados_suficientes' then
    if dcode is null then raise exception 'leitura convergente/divergente e por dominio: informe domain_code' using errcode = 'P0001'; end if;
    if hd is null or ld is null or hd = 'indeterminate' or ld = 'indeterminate' then raise exception 'convergente/divergente exigem direcao HOLOSCAN e laboratorial deterministicas' using errcode = 'P0001', hint = 'direcao_indeterminada'; end if;
    if (st = 'convergente' and hd <> ld) or (st = 'divergente' and hd = ld) then raise exception 'estado % incoerente com as direcoes % x %', st, hd, ld using errcode = 'P0001', hint = 'estado_incoerente'; end if;
  end if;
  hid := nullif(payload->>'holoscan_application_id','')::uuid;
  if hid is not null and not exists (select 1 from public.holoscan_applications a where a.id = hid and a.patient_id = pid and a.nutritionist_id = uid) then raise exception 'aplicacao HOLOSCAN nao e deste paciente' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
  for x in select value from jsonb_array_elements_text(coalesce(payload->'selected_collection_ids','[]'::jsonb)) loop
    if not exists (select 1 from public.lab_collections c where c.id = x::uuid and c.patient_id = pid and c.nutritionist_id = uid) then raise exception 'coleta % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    cids := cids || x::uuid;
  end loop;
  for x in select value from jsonb_array_elements_text(coalesce(payload->'selected_result_ids','[]'::jsonb)) loop
    if not exists (select 1 from public.lab_results r join public.lab_collections c on c.id = r.collection_id where r.id = x::uuid and c.patient_id = pid and c.nutritionist_id = uid) then raise exception 'resultado % nao e deste paciente', x using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    rids := rids || x::uuid;
  end loop;
  eid := nullif(payload->>'encounter_id','')::uuid;
  sup := nullif(payload->>'supersedes_id','')::uuid;
  if sup is not null then
    select revision + 1 into rev from public.integrated_readings i where i.id = sup and i.nutritionist_id = uid and i.patient_id = pid and i.superseded_at is null;
    if rev is null then raise exception 'leitura anterior nao encontrada ou ja revisada' using errcode = 'P0001'; end if;
  end if;
  conteudo := jsonb_build_object('patient_id', pid, 'domain_code', dcode, 'holoscan_application_id', hid, 'collections', to_jsonb(cids), 'results', to_jsonb(rids), 'references', coalesce(payload->'references_snapshot','[]'::jsonb),
    'sources', coalesce(payload->'sources_snapshot','{}'::jsonb), 'rule_package', pkg.code || '@' || pkg.version, 'engine', payload->>'engine_version', 'state', st, 'holoscan_direction', hd, 'laboratory_direction', ld,
    'reason_codes', coalesce(payload->'reason_codes','[]'::jsonb), 'trace', coalesce(payload->'trace','{}'::jsonb), 'snapshot', coalesce(payload->'snapshot','{}'::jsonb), 'note', payload->>'professional_note');
  h := encode(sha256(convert_to(conteudo::text, 'UTF8')), 'hex');
  insert into public.integrated_readings (nutritionist_id, patient_id, encounter_id, responsible, clinical_context, holoscan_application_id, selected_collection_ids, selected_result_ids, references_snapshot, sources_snapshot, rule_package_id, rule_version, engine_version, state, reason_codes, trace, professional_note, revision, supersedes_id, content_hash, created_by, domain_code, holoscan_direction, laboratory_direction, snapshot)
    values (uid, pid, eid, btrim(payload->>'responsible'), payload->>'clinical_context', hid, cids, rids, coalesce(payload->'references_snapshot','[]'::jsonb), coalesce(payload->'sources_snapshot','{}'::jsonb), pkg.id, pkg.version, coalesce(payload->>'engine_version','?'), st, coalesce(payload->'reason_codes','[]'::jsonb), coalesce(payload->'trace','{}'::jsonb), payload->>'professional_note', rev, sup, h, uid, dcode, hd, ld, coalesce(payload->'snapshot','{}'::jsonb))
    returning id into novo;
  if sup is not null then update public.integrated_readings set superseded_at = now() where id = sup; end if;
  return jsonb_build_object('id', novo, 'state', st, 'domain_code', dcode, 'revision', rev, 'content_hash', h);
end; $$;
revoke all on function public.salvar_leitura_integrada(jsonb) from public, anon;
grant execute on function public.salvar_leitura_integrada(jsonb) to authenticated;

-- ============================================================================
-- 5. SEED — LI-V1 @ 2 (em_revisao): conteudo decidido; identico a leitura-integrada-pacote-v1.js
-- ============================================================================
do $$
declare pk uuid;
begin
  if exists (select 1 from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2) then raise exception 'LI-V1@2 ja existe'; end if;
  insert into public.integrated_reading_rule_packages (code, version, status, notes) values ('LI-V1', 2, 'em_revisao', 'Etapa 6.0: conteudo metodologico decidido nas Etapas 5.4-5.13 (docs/v1/laboratorio). Candidato em revisao: 0 aprovacoes, nao homologado. Identico a leitura-integrada-pacote-v1.js.') returning id into pk;
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D01', 'Hematológico e Inflamatório', 'Organiza dados laboratoriais relacionados ao perfil hematológico e a marcadores laboratoriais utilizados na avaliação de processos inflamatórios. Não representa diagnóstico de inflamação ou doença hematológica.', 'mapped', 'acido_inflamatorio', 1, 'aprovado');
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D02', 'Glicêmico e Metabólico', 'Organiza dados relacionados ao metabolismo da glicose, resposta insulínica e outros marcadores metabólicos pertinentes. Não diagnostica diabetes, resistência à insulina ou síndrome metabólica.', 'mapped', 'metabolico', 2, 'aprovado');
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D03', 'Lipídico', 'Organiza dados relacionados ao perfil lipídico e suas variantes laboratoriais. Não transforma alterações isoladas em avaliação automática de risco cardiovascular.', 'mapped', 'metabolico', 3, 'aprovado');
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D04', 'Hepático', 'Organiza resultados laboratoriais relacionados à avaliação bioquímica hepática. Não diagnostica doença hepática nem presume função hepática global a partir de marcador isolado.', 'mapped', 'detox_linfatico', 4, 'aprovado');
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D05', 'Renal e Hidroeletrolítico', 'Organiza dados relacionados à avaliação renal e ao equilíbrio de eletrólitos medidos laboratorialmente. Não infere função renal ou estado de hidratação sem regra e contexto aprovados.', 'none', null, 5, 'aprovado');
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D06', 'Micronutrientes e Metabolismo Mineral', 'Organiza vitaminas, minerais, elementos e marcadores de metabolismo mineral contemplados pelo catálogo. Não transforma faixa laboratorial em "nível ideal" autoral.', 'none', null, 6, 'aprovado');
  insert into public.integrated_reading_domains (package_id, code, name, definition, holoscan_mapping_mode, holoscan_system, position, status) values (pk, 'LI-D07', 'Endócrino e Hormonal', 'Organiza marcadores relacionados aos eixos tireoidiano e hormonal presentes no catálogo. Não diagnostica distúrbios endócrinos e não presume significado clínico fora de contexto.', 'none', null, 7, 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-001', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-016', null, null, 'above', 'directional', '{"above":"attention_present","within":"attention_not_detected","below":"indeterminate"}'::jsonb, array['ultrassensivel']::text[], 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-018', null, null, 'any', 'directional', '{"above":"attention_present","within":"attention_not_detected","below":"indeterminate"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-025', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-026', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-028', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D01'), 'LAB-029', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D02'), 'LAB-002', null, null, 'any', 'directional', '{"above":"attention_present","below":"attention_present","within":"attention_not_detected"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D02'), 'LAB-003', null, null, 'any', 'directional', '{"above":"attention_present","below":"attention_present","within":"attention_not_detected"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21): participa conforme referência aplicável, nunca resolve D02 isoladamente (suficiência: mínimo 2 + GLYCEMIC_ANCHOR)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D02'), 'LAB-004', null, null, 'above', 'directional', '{"above":"attention_present","within":"attention_not_detected","below":"indeterminate"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D03'), 'LAB-005', null, null, 'above', 'directional', '{"above":"attention_present","within":"attention_not_detected","below":"indeterminate"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D03'), 'LAB-006', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D03'), 'LAB-007', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D03'), 'LAB-008', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D03'), 'LAB-009', null, null, 'below', 'directional', '{"below":"attention_present","within":"attention_not_detected","above":"indeterminate"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D04'), 'LAB-012', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D04'), 'LAB-013', null, null, 'above', 'directional', '{"above":"attention_present","within":"attention_not_detected","below":"indeterminate"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D04'), 'LAB-014', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D04'), 'LAB-015', null, null, 'above', 'directional', '{"above":"attention_present","within":"attention_not_detected","below":"indeterminate"}'::jsonb, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo directional aprovado (DECISÕES 02, 20-21)', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D05'), 'LAB-010', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D05'), 'LAB-011', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D05'), 'LAB-019', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D05'), 'LAB-020', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-017', null, null, 'above', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-021', null, null, 'any', 'contextual', null, array['eritrocitario']::text[], 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-022', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-023', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-024', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-025', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-026', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-028', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-029', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-034', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-035', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D06'), 'LAB-045', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-030', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-031', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-032', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-034', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-036', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-037', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-038', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-039', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-040', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-041', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-042', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_exam_domain_links (package_id, domain_id, exam_code, variant, material, direction, cross_source_role, direction_rules, variants_declared, version, source, justification, status) values (pk, (select id from public.integrated_reading_domains where package_id = pk and code = 'LI-D07'), 'LAB-043', null, null, 'any', 'contextual', null, null, 1, 'Documento Mestre + decisao autoral V1 (Daniel, 02/10/2026); FONTE BIBLIOGRAFICA FORMAL A CONSOLIDAR', 'vínculo contextual aprovado (DECISÕES 02, 20-21): não produz sozinho direção laboratorial', 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'temporal', 'global', '{"code":"LI-TEMP-01","version":1,"max_days":30,"inclusive":true,"symmetric":true,"scope":"global","exceptions":[],"anchors":{"holoscan":"application_clinical_date","laboratory":"collection.clinical_date"},"forbidden_anchors":["created_at","updated_at","saved_at","reviewed_at","last_modified","upload_date","edit_date"],"outside_window":"outside_time_window","missing_date":"missing_clinical_date","delta":"temporal_delta_days = collection.clinical_date - application_clinical_date (com sinal; so rastreabilidade/ordenacao/explicabilidade)","nature":"regra operacional autoral e versionada da V1; nao e validade fisiologica universal"}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'holoscan_direction', 'global', '{"version":1,"package_code":"HOLOS-V1","min_package_version":2,"required_package_status":"aprovado","faixa_map":{"baixa":"attention_present","intermediaria":"indeterminate","alta":"attention_not_detected"},"not_evaluable":"indeterminate","not_evaluable_reason":"holoscan_not_evaluable","incompatible_reason":"incompatible_holoscan_version","missing_reason":"missing_holoscan_source","note":"faixas oficiais do HOLOS-V1@2 (10/3 e 20/3); nenhum corte novo; exames nunca alteram nota, faixa, Índice ou Tríada"}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D01', '{"mode":"rule_based","version":1,"min_classifiable_results":1,"required_exam_codes":["LAB-016"],"required_exam_groups":[],"optional_directional_exam_codes":["LAB-018"],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D02', '{"mode":"rule_based","version":1,"min_classifiable_results":2,"required_exam_codes":[],"required_exam_groups":[{"code":"GLYCEMIC_ANCHOR","any_of":["LAB-002","LAB-004"],"min":1}],"optional_directional_exam_codes":[],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D03', '{"mode":"rule_based","version":1,"min_classifiable_results":2,"required_exam_codes":["LAB-005","LAB-009"],"required_exam_groups":[],"optional_directional_exam_codes":[],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D04', '{"mode":"rule_based","version":1,"min_classifiable_results":2,"required_exam_codes":["LAB-013","LAB-015"],"required_exam_groups":[],"optional_directional_exam_codes":[],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D05', '{"mode":"not_applicable","version":1,"min_classifiable_results":null,"required_exam_codes":[],"required_exam_groups":[],"optional_directional_exam_codes":[],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true,"note":"domínio laboratorial oficial sem confronto HOLOSCAN na V1 (holoscan_mapping_mode = none): não é suficiente, não é insuficiente, não é missing_domain_holoscan_mapping"}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D06', '{"mode":"not_applicable","version":1,"min_classifiable_results":null,"required_exam_codes":[],"required_exam_groups":[],"optional_directional_exam_codes":[],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true,"note":"domínio laboratorial oficial sem confronto HOLOSCAN na V1 (holoscan_mapping_mode = none): não é suficiente, não é insuficiente, não é missing_domain_holoscan_mapping"}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'sufficiency', 'LI-D07', '{"mode":"not_applicable","version":1,"min_classifiable_results":null,"required_exam_codes":[],"required_exam_groups":[],"optional_directional_exam_codes":[],"counts_only":"directional","contextual_counts":false,"no_global_percentage":true,"note":"domínio laboratorial oficial sem confronto HOLOSCAN na V1 (holoscan_mapping_mode = none): não é suficiente, não é insuficiente, não é missing_domain_holoscan_mapping"}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D01', '{"mode":"unanimity","version":2,"all_present":"attention_present","all_not_detected":"attention_not_detected","mixture":"indeterminate","mixture_reason":"mixed_results_indeterminate","indeterminate_optional_ignored":true,"indeterminate_participant_blocks":true,"indeterminate_participant_reason":"directional_result_indeterminate","forbidden":["majority","mean","weight","lab_score","one_altered_wins","one_normal_wins","altered_count","altered_percentage"]}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D02', '{"mode":"unanimity","version":2,"all_present":"attention_present","all_not_detected":"attention_not_detected","mixture":"indeterminate","mixture_reason":"mixed_results_indeterminate","indeterminate_optional_ignored":true,"indeterminate_participant_blocks":true,"indeterminate_participant_reason":"directional_result_indeterminate","forbidden":["majority","mean","weight","lab_score","one_altered_wins","one_normal_wins","altered_count","altered_percentage"]}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D03', '{"mode":"unanimity","version":2,"all_present":"attention_present","all_not_detected":"attention_not_detected","mixture":"indeterminate","mixture_reason":"mixed_results_indeterminate","indeterminate_optional_ignored":true,"indeterminate_participant_blocks":true,"indeterminate_participant_reason":"directional_result_indeterminate","forbidden":["majority","mean","weight","lab_score","one_altered_wins","one_normal_wins","altered_count","altered_percentage"]}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D04', '{"mode":"unanimity","version":2,"all_present":"attention_present","all_not_detected":"attention_not_detected","mixture":"indeterminate","mixture_reason":"mixed_results_indeterminate","indeterminate_optional_ignored":true,"indeterminate_participant_blocks":true,"indeterminate_participant_reason":"directional_result_indeterminate","forbidden":["majority","mean","weight","lab_score","one_altered_wins","one_normal_wins","altered_count","altered_percentage"]}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D05', '{"mode":"not_applicable","version":1}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D06', '{"mode":"not_applicable","version":1}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'mixed', 'LI-D07', '{"mode":"not_applicable","version":1}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'convergence', 'global', '{"version":1,"convergente":[["attention_present","attention_present"],["attention_not_detected","attention_not_detected"]],"divergente":[["attention_present","attention_not_detected"],["attention_not_detected","attention_present"]],"indeterminate_never_converges":true,"indeterminate_never_diverges":true,"order":["holoscan_source","package_version","temporal","links","selected_results","reference_unit_context","sufficiency","mixed","laboratory_direction","holoscan_direction","official_state"],"states":["convergente","divergente","sem_dados_suficientes"],"note":"mistura entre exames laboratoriais nao e divergencia HOLOSCAN x laboratorio"}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'text', 'global', '{"convergente":"As fontes elegíveis deste domínio apontaram para uma direção semelhante segundo a regra metodológica indicada.","divergente":"As fontes elegíveis deste domínio apontaram para direções diferentes. A divergência não invalida nenhuma das fontes e deve ser considerada na avaliação profissional.","sem_dados_suficientes":"Não foi possível classificar este domínio com a regra atual. Consulte os dados ausentes, incompatíveis, excluídos ou não classificáveis indicados abaixo.","paciente":{"convergente":"As informações do seu relato e os exames considerados apresentaram um padrão semelhante neste domínio. Esse resultado não representa diagnóstico e deve ser interpretado junto com sua nutricionista.","convergente_sem_sinal":"Nas fontes analisadas, não foram identificados sinais de atenção coincidentes neste domínio. Isso não significa ausência de doença ou garantia de saúde.","divergente":"Seu relato e os exames considerados apresentaram informações diferentes neste domínio. Isso pode ajudar a profissional a aprofundar a avaliação e não significa que uma das fontes esteja errada.","sem_dados_suficientes":"Ainda não há informações suficientes para uma leitura integrada deste domínio. Sua nutricionista poderá verificar quais dados precisam ser complementados ou revisados."},"sem_confronto_holoscan":"Este domínio é apresentado como informação laboratorial na V1 e não possui confronto automático com um sistema HOLOSCAN."}'::jsonb, 'aprovado');
  insert into public.integrated_reading_rules (package_id, rule_type, target, payload, status) values (pk, 'reason_semantics', 'global', '{"version":1,"codes":{"missing_holoscan_source":"Nenhuma aplicação HOLOSCAN elegível foi selecionada para esta leitura.","holoscan_not_evaluable":"O sistema HOLOSCAN relacionado não é avaliável nesta aplicação (cobertura abaixo do mínimo).","incompatible_holoscan_version":"A aplicação HOLOSCAN não foi calculada com o pacote metodológico homologado compatível com esta leitura.","missing_lab_source":"Nenhuma coleta laboratorial elegível foi selecionada para esta leitura.","insufficient_domain_coverage":"A quantidade mínima de resultados classificáveis exigida pela regra do domínio não foi atingida.","missing_required_exam":"Um exame obrigatório para a leitura deste domínio está ausente, não elegível ou não classificável.","missing_reference":"O resultado não tem referência do laudo aplicável.","ambiguous_reference":"A referência do laudo é ambígua e impede a classificação.","qualitative_rule_missing":"Resultado qualitativo sem regra homologada de interpretação.","censored_value_ambiguous":"Valor censurado (limite do método) cujo intervalo não prova um único estado.","incompatible_unit":"Unidade do resultado incompatível com a referência, sem conversão homologada.","incompatible_variant":"O tipo do exame disponível não é compatível com a regra utilizada para esta leitura.","incompatible_material":"O material do exame não é compatível com a referência aplicável.","incompatible_method":"O método do exame não é compatível com a regra aplicável.","outside_time_window":"A coleta está fora da janela temporal da leitura (LI-TEMP-01: ±30 dias corridos da aplicação HOLOSCAN).","missing_clinical_date":"Falta a data clínica necessária (coleta ou aplicação HOLOSCAN); nenhuma data técnica substitui a data clínica.","mixed_without_rule":"Este conjunto de resultados não possui regra metodológica homologada de agregação (cenário futuro; não ocorre nos domínios D01–D04 da V1).","mixed_results_indeterminate":"Há regra homologada para o conjunto, mas os resultados directional apontam direções diferentes (presente e não detectado): a direção laboratorial é indeterminada.","directional_result_indeterminate":"Após a suficiência estrutural, um resultado directional participante ficou com direção indeterminada (sem exceção específica): a direção laboratorial é indeterminada.","missing_domain_sufficiency_rule":"O domínio não possui regra de suficiência homologada.","missing_temporal_rule":"O pacote não possui regra temporal homologada.","duplicate_result_unresolved":"Há mais de um resultado do mesmo exame nas coletas selecionadas e nenhum foi escolhido explicitamente.","not_classifiable":"Resultado não classificável com a referência disponível.","not_eligible":"Resultado não elegível para a Leitura Integrada."},"official_state_for_all":"sem_dados_suficientes","note":"mixed_results_indeterminate NAO e novo estado oficial; o estado continua SEM DADOS SUFICIENTES"}'::jsonb, 'aprovado');
end $$;

-- ============================================================================
-- 6. PROVAS NA PROPRIA MIGRATION (contagens invariantes, governanca intocada)
-- ============================================================================
do $$
declare pk uuid := (select id from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2); v jsonb; r record;
begin
  if (select count(*) from public.integrated_reading_domains where package_id = pk) <> 7 then raise exception 'LI-V1@2: esperados 7 dominios'; end if;
  if (select count(*) from public.integrated_reading_exam_domain_links where package_id = pk) <> 47 then raise exception 'LI-V1@2: esperados 47 vinculos'; end if;
  if (select count(distinct exam_code) from public.integrated_reading_exam_domain_links where package_id = pk) <> 42 then raise exception 'LI-V1@2: esperados 42 exames vinculados'; end if;
  if (select count(*) from public.lab_exam_catalog c where not exists (select 1 from public.integrated_reading_exam_domain_links l where l.package_id = pk and l.exam_code = c.code)) <> 3 then raise exception 'LI-V1@2: esperados 3 exames sem dominio'; end if;
  if (select count(*) from (select exam_code from public.integrated_reading_exam_domain_links where package_id = pk group by exam_code having count(*) > 1) z) <> 5 then raise exception 'LI-V1@2: esperados 5 exames multi-dominio'; end if;
  if (select count(*) from public.integrated_reading_exam_domain_links where package_id = pk and cross_source_role = 'directional') <> 9 then raise exception 'LI-V1@2: esperados 9 vinculos directional'; end if;
  if (select count(*) from public.integrated_reading_exam_domain_links where package_id = pk and cross_source_role = 'contextual') <> 38 then raise exception 'LI-V1@2: esperados 38 vinculos contextual'; end if;
  for r in select d.code, count(l.id) n from public.integrated_reading_domains d left join public.integrated_reading_exam_domain_links l on l.domain_id = d.id where d.package_id = pk group by d.code loop
    if (r.code, r.n) not in (('LI-D01', 7), ('LI-D02', 3), ('LI-D03', 5), ('LI-D04', 4), ('LI-D05', 4), ('LI-D06', 12), ('LI-D07', 12)) then raise exception 'LI-V1@2: contagem por dominio divergente em % (%)', r.code, r.n; end if;
  end loop;
  if (select count(*) from public.integrated_reading_domains d where d.package_id = pk and d.holoscan_mapping_mode = 'none' and exists (select 1 from public.integrated_reading_exam_domain_links l where l.domain_id = d.id and l.cross_source_role = 'directional')) <> 0 then raise exception 'LI-V1@2: dominio sem confronto com vinculo directional'; end if;
  v := public.li_validar_completude(pk);
  if not (v->>'publicavel')::boolean then raise exception 'LI-V1@2: completude com bloqueios: %', v->'bloqueios'; end if;
  if (select status from public.integrated_reading_rule_packages where id = pk) <> 'em_revisao' then raise exception 'LI-V1@2 tem de nascer em_revisao'; end if;
  if (select status from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1) <> 'rascunho' then raise exception 'LI-V1@1 (historico) tem de continuar em rascunho'; end if;
  if (select count(*) from public.integrated_reading_package_approvals) <> 0 then raise exception 'nenhuma aprovacao pode nascer da migration'; end if;
  if (select count(*) from public.integrated_reading_package_snapshots) <> 0 then raise exception 'nenhum snapshot pode nascer da migration'; end if;
  if (select count(*) from public.methodology_approvers) <> 0 then raise exception 'nenhum aprovador real nasce da migration'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- MIGRATION (dry-run): 20261002130000_etapa6_0_1_fechamento_pre_gate.sql
-- ---------------------------------------------------------------------------
-- V1 — ETAPA 6.0.1: FECHAMENTO PRE-GATE REAL. NAO APLICADA em producao. Entra depois de 20261002120000.
--
--   1. Referencia do laudo AMBIGUA preservada de ponta a ponta (DECISAO 07 / reason code ambiguous_reference):
--      lab_results.reference_status aceita 'ambiguous' (texto/limites originais preservados; nenhuma classificacao
--      fabricada); lab_gravar_resultados grava 'ambiguous' quando o payload traz reference_ambiguous = true e
--      existe referencia informada. A leitura integrada congela no snapshot o resultado afetado, o reason code,
--      a exclusao e a referencia original (migration 20261002120000 + motor 2.0.1).
--   2. Proveniencia metodologica das aplicacoes HOLOSCAN: toda NOVA aplicacao salva por salvar_holoscan_completo
--      pode receber methodology_package_id + methodology_package_version (validados: pacote existente e versao
--      coerente). Aplicacao historica sem proveniencia PERMANECE sem vinculo: os dois campos sao imutaveis depois
--      do insert (nenhum backfill, nenhuma inferencia por data, faixa, respostas ou estrutura parecida —
--      docs/v1/laboratorio/POLITICA-COMPATIBILIDADE-APLICACOES-HISTORICAS-HOLOSCAN-LI.md). A LI devolve
--      incompatible_holoscan_version quando nao consegue provar compatibilidade.

-- ============================================================================
-- 1. REFERENCIA AMBIGUA
-- ============================================================================
alter table public.lab_results drop constraint if exists lab_results_reference_status;
alter table public.lab_results add constraint lab_results_reference_status check (reference_status in ('informed','missing','ambiguous'));
alter table public.lab_results drop constraint if exists lab_results_referencia_informada;
alter table public.lab_results add constraint lab_results_referencia_informada check (
  (reference_status in ('informed','ambiguous') and (report_reference_text is not null or report_reference_min is not null or report_reference_max is not null))
  or (reference_status = 'missing' and report_reference_text is null and report_reference_min is null and report_reference_max is null));

create or replace function public.lab_gravar_resultados(p_cid uuid, p_uid uuid, p_results jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare r jsonb; comp jsonb; rid uuid; n integer := 0; pos integer := 0; v_code text; v_cust uuid; v_q text; v_nv numeric; v_refst text;
begin
  perform set_config('holohacking.lab_rpc', p_cid::text, true);
  delete from public.lab_result_components x using public.lab_results y where x.result_id = y.id and y.collection_id = p_cid and y.exame_id is null;
  delete from public.lab_results where collection_id = p_cid and exame_id is null;
  for r in select value from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    pos := pos + 1;
    v_code := nullif(btrim(coalesce(r->>'exam_code','')), ''); v_cust := nullif(r->>'custom_exam_id','')::uuid;
    if v_code is null and v_cust is null then raise exception 'resultado % sem exame (exam_code ou custom_exam_id)', pos using errcode = 'P0001', hint = 'resultado_sem_exame'; end if;
    if v_code is not null and v_cust is not null then raise exception 'resultado % com exame do catalogo E customizado', pos using errcode = 'P0001'; end if;
    if v_code is not null and not exists (select 1 from public.lab_exam_catalog c where c.code = v_code and c.status = 'ativo') then raise exception 'exame % nao existe no catalogo-base', v_code using errcode = 'P0001', hint = 'exame_desconhecido'; end if;
    if v_cust is not null and not exists (select 1 from public.lab_custom_exams c where c.id = v_cust and c.nutritionist_id = p_uid) then raise exception 'exame customizado nao e deste profissional' using errcode = 'P0001', hint = 'referencia_cruzada'; end if;
    if length(btrim(coalesce(r->>'value_original_text',''))) = 0 then raise exception 'resultado % sem valor original', pos using errcode = 'P0001', hint = 'valor_ausente'; end if;
    v_q := coalesce(r->>'qualifier', 'text'); v_nv := case when v_q = 'eq' then (r->>'numeric_value')::numeric else null end;
    v_refst := case when r->>'report_reference_text' is not null or r->>'report_reference_min' is not null or r->>'report_reference_max' is not null
                    then case when coalesce((r->>'reference_ambiguous')::boolean, false) then 'ambiguous' else 'informed' end
                    else 'missing' end;
    insert into public.lab_results (collection_id, exam_code, custom_exam_id, variant, value_original_text, numeric_value, qualifier, censor_limit, unit_original, method, material,
        report_reference_text, report_reference_min, report_reference_max, report_reference_operator, report_reference_unit, report_reference_population, reference_status, reference_source, origin, notes, result_date, position)
      values (p_cid, v_code, v_cust, nullif(btrim(coalesce(r->>'variant','')), ''), btrim(r->>'value_original_text'), v_nv, v_q, (r->>'censor_limit')::numeric, nullif(btrim(coalesce(r->>'unit_original','')), ''), nullif(btrim(coalesce(r->>'method','')), ''), nullif(btrim(coalesce(r->>'material','')), ''),
        r->>'report_reference_text', (r->>'report_reference_min')::numeric, (r->>'report_reference_max')::numeric, coalesce(r->>'report_reference_operator', case when v_refst in ('informed','ambiguous') then 'range' end), r->>'report_reference_unit', r->>'report_reference_population', v_refst, 'laudo',
        coalesce(r->>'origin', 'manual'), r->>'notes', (r->>'result_date')::date, pos)
      returning id into rid;
    n := n + 1;
    for comp in select value from jsonb_array_elements(coalesce(r->'components', '[]'::jsonb)) loop
      insert into public.lab_result_components (result_id, position, original_name, canonical_component_key, value_original_text, numeric_value, qualifier, censor_limit, unit_original, report_reference_text, report_reference_min, report_reference_max, report_reference_operator, notes)
        values (rid, coalesce((comp->>'position')::int, 0), comp->>'original_name', comp->>'canonical_component_key', comp->>'value_original_text',
          case when coalesce(comp->>'qualifier','text') = 'eq' then (comp->>'numeric_value')::numeric end, coalesce(comp->>'qualifier','text'), (comp->>'censor_limit')::numeric, comp->>'unit_original',
          comp->>'report_reference_text', (comp->>'report_reference_min')::numeric, (comp->>'report_reference_max')::numeric, comp->>'report_reference_operator', comp->>'notes');
    end loop;
  end loop;
  perform set_config('holohacking.lab_rpc', '', true);
  return n;
end; $$;

-- ============================================================================
-- 2. PROVENIENCIA METODOLOGICA DA APLICACAO HOLOSCAN (sem backfill)
-- ============================================================================
alter table public.holoscan_applications add column if not exists methodology_package_version integer;
alter table public.holoscan_applications drop constraint if exists holoscan_applications_pacote_coerente;
-- versao so existe com pacote; o pacote sem versao e tolerado para linhas anteriores a esta migration (a RPC exige os dois para aplicacao NOVA)
alter table public.holoscan_applications add constraint holoscan_applications_pacote_coerente check (methodology_package_version is null or methodology_package_id is not null);

-- proveniencia imutavel: nao se preenche depois (nenhum backfill silencioso), nao se troca, nao se apaga
create or replace function public.proteger_proveniencia_holoscan()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.methodology_package_id is distinct from old.methodology_package_id or new.methodology_package_version is distinct from old.methodology_package_version then
    raise exception 'proveniencia metodologica da aplicacao HOLOSCAN e imutavel: ausencia de proveniencia nao pode ser preenchida silenciosamente (sem backfill)' using errcode = 'P0001', hint = 'proveniencia_imutavel';
  end if;
  return new;
end $$;
drop trigger if exists holoscan_applications_proveniencia on public.holoscan_applications;
create trigger holoscan_applications_proveniencia before update on public.holoscan_applications for each row execute function public.proteger_proveniencia_holoscan();

CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record;
  triada_norm jsonb; mp_id uuid; mp_ver integer; mp_real integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;
  -- proveniencia metodologica: so o que o cliente DECLAROU, validado; nunca inferido
  mp_id := NULLIF(app_data->>'methodology_package_id', '')::uuid;
  mp_ver := NULLIF(app_data->>'methodology_package_version', '')::integer;
  IF (mp_id IS NULL) <> (mp_ver IS NULL) THEN RAISE EXCEPTION 'proveniencia metodologica incompleta: informe methodology_package_id E methodology_package_version, ou nenhum' USING errcode = 'P0001', hint = 'proveniencia_incompleta'; END IF;
  IF mp_id IS NOT NULL THEN
    SELECT version INTO mp_real FROM public.methodology_packages WHERE id = mp_id;
    IF mp_real IS NULL THEN RAISE EXCEPTION 'pacote metodologico % nao existe', mp_id USING errcode = 'P0002'; END IF;
    IF mp_real <> mp_ver THEN RAISE EXCEPTION 'versao declarada (%) nao e a versao do pacote (%)', mp_ver, mp_real USING errcode = 'P0001', hint = 'proveniencia_incoerente'; END IF;
  END IF;
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao, methodology_package_id, methodology_package_version
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid,
    NULLIF(app_data->>'encounter_id', '')::uuid,
    (app_data->>'quando')::date,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    COALESCE(app_data->'combinacoes','[]'::jsonb),
    COALESCE(app_data->'aprofundamentos','[]'::jsonb),
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END,
    mp_id, mp_ver
  ) RETURNING id INTO app_id;
  FOR r IN SELECT * FROM jsonb_array_elements(ans_data) AS elem LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.value->>'marcador_id', (r.value->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT * FROM jsonb_array_elements(sc_data) AS elem LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.value->>'sistema', r.value->>'nome',
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'nota')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN (r.value->>'carga')::numeric END,
      CASE WHEN (r.value->>'avaliavel')::boolean THEN r.value->>'faixa' END,
      (r.value->>'obtido')::numeric, (r.value->>'maximo')::numeric,
      (r.value->>'respondidos')::integer, (r.value->>'total_marcadores')::integer,
      (r.value->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) FROM anon;

do $$
begin
  if (select count(*) from public.holoscan_applications where methodology_package_id is not null) <> 0 then raise exception 'nenhum backfill de proveniencia pode nascer da migration'; end if;
  if (select count(*) from public.lab_results where reference_status = 'ambiguous') <> 0 then raise exception 'nenhuma referencia e marcada ambigua pela migration'; end if;
end $$;

-- ---------------------------------------------------------------------------
-- CHECAGENS DA ETAPA 6.1 (supabase/tests/etapa6-1-checks-real.sql)
-- ---------------------------------------------------------------------------
-- ETAPA 6.1 — checagens do dry-run no banco REAL (rodam DENTRO de BEGIN ... ROLLBACK, depois das 14 migrations pendentes).
-- Dados sinteticos (auth.users/approvers/paciente/pacote/coleta/leitura) existem SO dentro da transacao e desaparecem no ROLLBACK.
-- Nenhum dado real e alterado; aplicacoes historicas so sao CONTADAS. Nunca executar fora de scripts/validar-cadeia-real-dry-run.sh.
create temp table _r(k text, ok boolean, d text);
create temp table _v(k text primary key, v text);
grant select, insert on _r to authenticated; grant select on _v to authenticated;
create or replace function pg_temp.como(p uuid) returns void language sql as $$ select set_config('request.jwt.claims', json_build_object('sub', p, 'role', 'authenticated')::text, true) $$;
grant execute on all functions in schema pg_temp to authenticated;
do $e61$
declare pk uuid; h text; v jsonb; r record; n int; n2 int; ua uuid := gen_random_uuid(); ub uuid := gen_random_uuid(); uc uuid := gen_random_uuid();
  pid uuid; mp uuid; app uuid; app2 uuid; cid uuid; rid uuid; rid2 uuid; j jsonb; txt text; falta text := '';
  esperado text := 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9';
begin
  -- A. schema pos-migrations
  for txt in select unnest(array['methodology_packages','methodology_approvers','methodology_package_approvals','integrated_reading_rule_packages','integrated_reading_domains','integrated_reading_exam_domain_links','integrated_reading_rules','integrated_readings','integrated_reading_package_approvals','lab_exam_catalog','consultations']) loop
    if to_regclass('public.' || txt) is null then falta := falta || txt || ' '; end if;
  end loop;
  select count(*) into n from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r';
  select count(*) into n2 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public';
  insert into _r values ('A1 tabelas/funcoes esperadas existem', falta = '', 'tabelas=' || n || ' funcoes=' || n2 || case when falta <> '' then ' FALTAM: ' || falta else '' end);
  select string_agg(c.relname, ',') into txt from pg_class c join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  insert into _r values ('A2 RLS ativo em todas as tabelas public', txt is null, coalesce('SEM RLS: ' || txt, 'todas com RLS'));
  select count(*) into n from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public';
  select count(*) into n2 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace s on s.oid = c.relnamespace where s.nspname = 'public' and not t.tgisinternal;
  insert into _r values ('A3 policies/triggers', n > 49 and n2 > 12, 'policies=' || n || ' triggers=' || n2);
  falta := '';
  for txt in select unnest(array['salvar_holoscan_completo','salvar_coleta_laboratorial','revisar_coleta_laboratorial','lab_gravar_resultados','salvar_leitura_integrada','registrar_aprovacao_li','homologar_pacote_li','li_hash_conteudo','li_conteudo_canonico','li_validar_completude','li_invalidar_aprovacoes','aprovador_autorizado','registrar_aprovacao_metodologica','proteger_proveniencia_holoscan']) loop
    if not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = txt) then falta := falta || txt || ' '; end if;
  end loop;
  insert into _r values ('A4 RPCs/funcoes esperadas existem', falta = '', coalesce(nullif('FALTAM: ' || falta, 'FALTAM: '), 'todas'));
  falta := '';
  for txt in select unnest(array['salvar_holoscan_completo(jsonb)','salvar_coleta_laboratorial(jsonb)','salvar_leitura_integrada(jsonb)','registrar_aprovacao_li(uuid,integer,text,integer,text,text)','homologar_pacote_li(uuid,integer,text,text)','registrar_aprovacao_metodologica(uuid,integer,text,text,text)']) loop
    if has_function_privilege('anon', 'public.' || txt, 'execute') then falta := falta || txt || ' '; end if;
  end loop;
  insert into _r values ('A5 anon sem EXECUTE nas RPCs mutaveis', falta = '', coalesce(nullif('ANON EXECUTA: ' || falta, 'ANON EXECUTA: '), 'anon sem execute'));
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    execute 'select count(*) from supabase_migrations.schema_migrations' into n;
    insert into _r values ('A6 historico de migrations nao alterado pelo dry-run', n = 16, 'registros=' || n);
  else insert into _r values ('A6 historico de migrations nao alterado pelo dry-run', true, 'sem tabela de historico (ambiente local)'); end if;
  -- B. pacote LI-V1@2
  select id into pk from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2;
  h := public.li_hash_conteudo(pk);
  insert into _r values ('B1 LI-V1@2 existe em_revisao', pk is not null and (select status from public.integrated_reading_rule_packages where id = pk) = 'em_revisao', coalesce((select status from public.integrated_reading_rule_packages where id = pk), 'ausente'));
  insert into _r values ('B2 content_hash SQL real == esperado', h = esperado, 'sql=' || coalesce(h, 'null'));
  v := public.li_validar_completude(pk);
  insert into _r values ('B3 completude publicavel', (v->>'publicavel')::boolean, 'bloqueios=' || (v->>'total_bloqueios'));
  insert into _r values ('B4 LI-V1@1 historico rascunho', (select status from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 1) = 'rascunho', '');
  -- C. contagens
  select count(*) into n from public.integrated_reading_domains where package_id = pk; insert into _r values ('C1 dominios = 7', n = 7, n::text);
  select count(*) into n from public.lab_exam_catalog; insert into _r values ('C2 exames base = 45', n = 45, n::text);
  select count(distinct exam_code) into n from public.integrated_reading_exam_domain_links where package_id = pk; insert into _r values ('C3 exames com dominio = 42', n = 42, n::text);
  select count(*) into n from public.lab_exam_catalog c where not exists (select 1 from public.integrated_reading_exam_domain_links l where l.package_id = pk and l.exam_code = c.code); insert into _r values ('C4 exames sem dominio = 3', n = 3, n::text);
  select count(*) into n from public.integrated_reading_exam_domain_links where package_id = pk; insert into _r values ('C5 pares exame->dominio = 47', n = 47, n::text);
  select count(*) into n from (select exam_code from public.integrated_reading_exam_domain_links where package_id = pk group by exam_code having count(*) > 1) z; insert into _r values ('C6 exames multidominio = 5', n = 5, n::text);
  select count(*) filter (where cross_source_role = 'directional'), count(*) filter (where cross_source_role = 'contextual') into n, n2 from public.integrated_reading_exam_domain_links where package_id = pk;
  insert into _r values ('C7 directional = 9 / contextual = 38', n = 9 and n2 = 38, n || '/' || n2);
  select string_agg(d.code || '=' || x.n, ' ' order by d.code) into txt from public.integrated_reading_domains d join lateral (select count(*) n from public.integrated_reading_exam_domain_links l where l.domain_id = d.id) x on true where d.package_id = pk;
  insert into _r values ('C8 D01..D07 = 7/3/5/4/4/12/12', txt = 'LI-D01=7 LI-D02=3 LI-D03=5 LI-D04=4 LI-D05=4 LI-D06=12 LI-D07=12', txt);
  -- D. regras
  select payload into j from public.integrated_reading_rules where package_id = pk and rule_type = 'temporal' and target = 'global';
  insert into _r values ('D1 LI-TEMP-01 v1 +-30 dias inclusivos', j->>'code' = 'LI-TEMP-01' and (j->>'version')::int = 1 and (j->>'max_days')::int = 30 and (j->>'inclusive')::boolean and (j->>'symmetric')::boolean, coalesce(j->>'code','?') || ' v' || coalesce(j->>'version','?') || ' max_days=' || coalesce(j->>'max_days','?'));
  select count(*) into n from public.integrated_reading_rules where package_id = pk and rule_type = 'mixed' and target in ('LI-D01','LI-D02','LI-D03','LI-D04') and (payload->>'version')::int = 2 and payload->>'indeterminate_participant_reason' = 'directional_result_indeterminate' and payload->>'mixture_reason' = 'mixed_results_indeterminate' and payload->>'indeterminate_participant_reason' <> payload->>'mixture_reason' and (payload->>'indeterminate_optional_ignored')::boolean;
  insert into _r values ('D2 mixed v2 D01-D04: directional_result_indeterminate <> mixed_results_indeterminate', n = 4, 'dominios_ok=' || n);
  select payload into j from public.integrated_reading_rules where package_id = pk and rule_type = 'reason_semantics';
  insert into _r values ('D3 reason_semantics tem ambos os codigos', (j->'codes') ? 'directional_result_indeterminate' and (j->'codes') ? 'mixed_results_indeterminate' and (j->'codes') ? 'ambiguous_reference', '');
  select payload into j from public.integrated_reading_rules where package_id = pk and rule_type = 'holoscan_direction';
  insert into _r values ('D4 holoscan_direction: HOLOS-V1>=2 aprovado, incompatible_holoscan_version', j->>'package_code' = 'HOLOS-V1' and (j->>'min_package_version')::int = 2 and j->>'incompatible_reason' = 'incompatible_holoscan_version' and j->'faixa_map'->>'baixa' = 'attention_present', '');
  -- E. proveniencia HOLOSCAN (schema + historico, somente contagens)
  insert into _r values ('E1 colunas/constraint/trigger de proveniencia', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_package_id','methodology_package_version')) = 2 and exists (select 1 from pg_constraint where conname = 'holoscan_applications_pacote_coerente') and exists (select 1 from pg_trigger where tgname = 'holoscan_applications_proveniencia'), '');
  select count(*), count(*) filter (where methodology_package_id is not null) into n, n2 from public.holoscan_applications;
  insert into _r values ('E2 aplicacoes historicas: com/sem proveniencia (somente leitura)', n2 = 0, 'total=' || n || ' com=' || n2 || ' sem=' || (n - n2));
  insert into _r values ('E3 lab_results.reference_status informed/missing/ambiguous', exists (select 1 from pg_constraint k where k.conrelid = 'public.lab_results'::regclass and pg_get_constraintdef(k.oid) like '%ambiguous%') and exists (select 1 from pg_constraint k where k.conrelid = 'public.lab_results'::regclass and k.conname like '%referencia_informada%'), '');
  select count(*) into n from public.methodology_approvers; insert into _r values ('E4 methodology_approvers vazia antes dos sinteticos', n = 0, 'registros=' || n);
  -- F. identidades e dados SINTETICOS (so nesta transacao)
  insert into auth.users (id, email) values (ua, 'e61-a@teste.invalid'), (ub, 'e61-b@teste.invalid'), (uc, 'e61-c@teste.invalid');
  insert into public.methodology_approvers (user_id, scope, approval_stage, display_name, notes) values (ua, 'integrated_reading', 1, 'Daniel', 'TEST_FIXTURE_E61'), (ub, 'integrated_reading', 2, 'Rodrigo', 'TEST_FIXTURE_E61');
  insert into public.patients (nutritionist_id, nome, status) values (ua, 'E61 SINTETICO', 'ativo') returning id into pid;
  insert into public.methodology_packages (nutritionist_id, code, version, status) values (ua, 'HOLOS-V1', 2, 'rascunho') returning id into mp;
  insert into _v values ('ua', ua::text), ('ub', ub::text), ('uc', uc::text), ('pid', pid::text), ('pk', pk::text), ('mp', mp::text), ('h', h);
  perform pg_temp.como(ua); execute 'set local role authenticated';
  -- G. HOLOSCAN: nova aplicacao com proveniencia; incoerente recusada; historica sintetica sem backfill
  app := public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pid, 'quando', '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb, 'methodology_package_id', mp, 'methodology_package_version', 2), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
  insert into _r values ('G1 nova aplicacao recebe methodology_package_id/version', (select methodology_package_id = mp and methodology_package_version = 2 from public.holoscan_applications where id = app), '');
  begin
    perform public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pid, 'quando', '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb, 'methodology_package_id', mp, 'methodology_package_version', 1), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
    insert into _r values ('G2 versao incoerente recusada', false, 'ACEITA');
  exception when others then insert into _r values ('G2 versao incoerente recusada', true, left(sqlerrm, 50)); end;
  app2 := public.salvar_holoscan_completo(jsonb_build_object('application', jsonb_build_object('patient_id', pid, 'quando', '2026-03-10', 'versao_estrutura', 2, 'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb), 'answers', '[]'::jsonb, 'scores', '[]'::jsonb));
  execute 'reset role';
  begin
    update public.holoscan_applications set methodology_package_id = mp, methodology_package_version = 2 where id = app2;
    insert into _r values ('G3 backfill em aplicacao sem proveniencia recusado (trigger)', false, 'ACEITO');
  exception when others then insert into _r values ('G3 backfill em aplicacao sem proveniencia recusado (trigger)', true, left(sqlerrm, 50)); end;
  insert into _r values ('G4 aplicacao sem proveniencia continua nula', (select methodology_package_id is null from public.holoscan_applications where id = app2), '');
  -- H. laboratorio: referencia ambigua persistida; ambigua sem referencia recusada
  perform pg_temp.como(ua); execute 'set local role authenticated';
  j := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pid, 'clinical_date', '2026-03-12', 'state', 'salvo'), 'results', jsonb_build_array(
    jsonb_build_object('exam_code', 'LAB-016', 'value_original_text', '30', 'numeric_value', 30, 'qualifier', 'eq', 'unit_original', 'mg/L', 'report_reference_text', '10 a 20', 'report_reference_min', 10, 'report_reference_max', 20),
    jsonb_build_object('exam_code', 'LAB-018', 'value_original_text', '300', 'numeric_value', 300, 'qualifier', 'eq', 'unit_original', 'mg/dL', 'report_reference_text', '200 a 400 ou 150 a 350', 'report_reference_min', 200, 'report_reference_max', 400, 'reference_ambiguous', true))));
  cid := (j->>'id')::uuid;
  select id into rid from public.lab_results where collection_id = cid and exam_code = 'LAB-018';
  select id into rid2 from public.lab_results where collection_id = cid and exam_code = 'LAB-016';
  insert into _r values ('H1 referencia ambigua persistida com texto/limites originais', (select reference_status = 'ambiguous' and report_reference_text = '200 a 400 ou 150 a 350' and report_reference_min = 200 from public.lab_results where id = rid) and (select reference_status = 'informed' from public.lab_results where id = rid2), '');
  j := public.salvar_coleta_laboratorial(jsonb_build_object('collection', jsonb_build_object('patient_id', pid, 'clinical_date', '2026-03-13', 'state', 'salvo'), 'results', jsonb_build_array(jsonb_build_object('exam_code', 'LAB-016', 'value_original_text', '30', 'numeric_value', 30, 'qualifier', 'eq', 'unit_original', 'mg/L', 'reference_ambiguous', true))));
  insert into _r values ('H2 flag ambigua SEM referencia nao fabrica status: fica missing', (select reference_status = 'missing' from public.lab_results where collection_id = (j->>'id')::uuid), coalesce((select reference_status from public.lab_results where collection_id = (j->>'id')::uuid), '?'));
  execute 'reset role';
  begin update public.lab_results set reference_status = 'ambiguous', report_reference_text = null, report_reference_min = null, report_reference_max = null where id = rid2; insert into _r values ('H3 escrita direta de ambiguous sem referencia recusada', false, 'ACEITO');
  exception when others then insert into _r values ('H3 escrita direta de ambiguous sem referencia recusada', true, left(sqlerrm, 50)); end;
  perform pg_temp.como(ua); execute 'set local role authenticated';
  -- I. governanca LI sintetica: 4 olhos, hash, invalidacao, homologacao
  begin perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'E61 sintetico'); insert into _r values ('I1 aprovacao 1 (aprovador estagio 1)', true, '');
  exception when others then insert into _r values ('I1 aprovacao 1 (aprovador estagio 1)', false, left(sqlerrm, 60)); end;
  begin perform public.registrar_aprovacao_li(pk, 2, h, 2, 'Rodrigo', 'E61 sintetico'); insert into _r values ('I2 mesmo usuario na aprovacao 2 recusado', false, 'ACEITO');
  exception when others then insert into _r values ('I2 mesmo usuario na aprovacao 2 recusado', true, left(sqlerrm, 50)); end;
  perform pg_temp.como(uc);
  begin perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'E61 sintetico'); insert into _r values ('I3 usuario sem papel recusado', false, 'ACEITO');
  exception when others then insert into _r values ('I3 usuario sem papel recusado', true, left(sqlerrm, 50)); end;
  perform pg_temp.como(ub);
  begin perform public.registrar_aprovacao_li(pk, 2, repeat('0', 64), 2, 'Rodrigo', 'E61 sintetico'); insert into _r values ('I4 hash divergente recusado', false, 'ACEITO');
  exception when others then insert into _r values ('I4 hash divergente recusado', true, left(sqlerrm, 50)); end;
  execute 'reset role';
  update public.integrated_reading_rules set payload = payload || '{"e61":true}'::jsonb where package_id = pk and rule_type = 'text';
  select count(*) into n from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null;
  insert into _r values ('I5 mudanca de conteudo invalida aprovacao', n = 0 and public.li_hash_conteudo(pk) <> h, 'ativas=' || n);
  update public.integrated_reading_rules set payload = payload - 'e61' where package_id = pk and rule_type = 'text';
  insert into _r values ('I6 conteudo restaurado volta ao hash esperado', public.li_hash_conteudo(pk) = esperado, left(public.li_hash_conteudo(pk), 12));
  perform pg_temp.como(ua); execute 'set local role authenticated';
  perform public.registrar_aprovacao_li(pk, 2, h, 1, 'Daniel', 'E61 sintetico');
  perform pg_temp.como(ub);
  perform public.registrar_aprovacao_li(pk, 2, h, 2, 'Rodrigo', 'E61 sintetico');
  select count(*) into n from public.integrated_reading_package_approvals where package_id = pk and invalidated_at is null;
  insert into _r values ('I7 dupla aprovacao ativa (2 uids distintos)', n = 2, 'ativas=' || n);
  begin perform public.homologar_pacote_li(pk, 2, h, 'Rodrigo'); insert into _r values ('I8 homologacao explicita', (select status from public.integrated_reading_rule_packages where id = pk) = 'aprovado', '');
  exception when others then insert into _r values ('I8 homologacao explicita', false, left(sqlerrm, 60)); end;
  execute 'reset role';
  begin update public.integrated_reading_rules set payload = payload || '{"e61":true}'::jsonb where package_id = pk and rule_type = 'text'; insert into _r values ('I9 conteudo homologado imutavel', false, 'ACEITO');
  exception when others then insert into _r values ('I9 conteudo homologado imutavel', true, left(sqlerrm, 50)); end;
  -- J. leitura integrada: snapshot preserva ambiguous_reference; coerencia
  perform pg_temp.como(ua); execute 'set local role authenticated';
  j := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'sem_dados_suficientes', 'domain_code', 'LI-D01', 'rule_package_id', pk, 'holoscan_application_id', app, 'selected_collection_ids', jsonb_build_array(cid), 'selected_result_ids', jsonb_build_array(rid, rid2), 'reason_codes', jsonb_build_array('directional_result_indeterminate'), 'engine_version', 'motor-leitura-integrada-2.0.1',
    'snapshot', jsonb_build_object('excluded', jsonb_build_array(jsonb_build_object('result_id', rid, 'exam_code', 'LAB-018', 'reason', 'ambiguous_reference', 'reference_status', 'ambiguous', 'reference_text', '200 a 400 ou 150 a 350')), 'selected_result_ids', jsonb_build_array(rid, rid2))));
  insert into _r values ('J1 leitura salva; snapshot preserva ambiguous_reference e referencia original', (select snapshot->'excluded'->0->>'reason' = 'ambiguous_reference' and snapshot->'excluded'->0->>'reference_text' = '200 a 400 ou 150 a 350' and reason_codes ? 'directional_result_indeterminate' and state = 'sem_dados_suficientes' and domain_code = 'LI-D01' and rule_version = 2 from public.integrated_readings where id = (j->>'id')::uuid), '');
  j := public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'convergente', 'domain_code', 'LI-D01', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'rule_package_id', pk, 'holoscan_application_id', app, 'selected_collection_ids', jsonb_build_array(cid), 'selected_result_ids', jsonb_build_array(rid2), 'engine_version', 'motor-leitura-integrada-2.0.1'));
  insert into _r values ('J2 leitura convergente aceita com pacote homologado', (j->>'state') = 'convergente', '');
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'divergente', 'domain_code', 'LI-D01', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'rule_package_id', pk, 'engine_version', 'x'));
    insert into _r values ('J3 estado incoerente recusado', false, 'ACEITO');
  exception when others then insert into _r values ('J3 estado incoerente recusado', true, left(sqlerrm, 50)); end;
  begin perform public.salvar_leitura_integrada(jsonb_build_object('patient_id', pid, 'responsible', 'E61', 'state', 'convergente', 'domain_code', 'LI-D05', 'holoscan_direction', 'attention_present', 'laboratory_direction', 'attention_present', 'rule_package_id', pk, 'engine_version', 'x'));
    insert into _r values ('J4 D05 sem confronto recusado', false, 'ACEITO');
  exception when others then insert into _r values ('J4 D05 sem confronto recusado', true, left(sqlerrm, 50)); end;
  -- K. RLS: usuario comum sem papel
  perform pg_temp.como(uc);
  select count(*) into n from public.patients; select count(*) into n2 from public.integrated_readings;
  insert into _r values ('K1 usuario comum nao ve pacientes/leituras de outros', n = 0 and n2 = 0, 'patients=' || n || ' leituras=' || n2);
  begin insert into public.methodology_approvers (user_id, scope, approval_stage, display_name) values (uc, 'integrated_reading', 1, 'Daniel'); insert into _r values ('K2 usuario comum nao grava methodology_approvers', false, 'ACEITO');
  exception when others then insert into _r values ('K2 usuario comum nao grava methodology_approvers', true, left(sqlerrm, 50)); end;
  begin select count(*) into n from public.methodology_approvers; insert into _r values ('K3 usuario comum nao le aprovadores', n = 0, 'linhas=' || n);
  exception when others then insert into _r values ('K3 usuario comum nao le aprovadores', true, left(sqlerrm, 40)); end;
  begin update public.integrated_reading_rule_packages set status = 'em_revisao' where id = pk; get diagnostics n = row_count; insert into _r values ('K4 usuario comum nao altera pacote LI', n = 0, 'linhas=' || n);
  exception when others then insert into _r values ('K4 usuario comum nao altera pacote LI', true, left(sqlerrm, 40)); end;
  execute 'reset role';
end $e61$;
select json_agg(json_build_object('k', k, 'ok', ok, 'd', d) order by k) as relatorio from _r;

-- FIM DO PRIMEIRO BLOCO: desfaz TUDO. Obrigatorio.
ROLLBACK;

-- ============================================================================
-- SEGUNDO BLOCO — EXECUTAR SOMENTE DEPOIS DO PRIMEIRO BLOCO TERMINAR
-- Somente leitura: prova que nenhuma alteracao persistiu. Esperado (estado de 2026-10-02):
--   hist_n = 16, hist_ultima = 20260929192605, n_tabelas = 14, n_funcoes = 7, n_policies = 49, n_triggers = 12,
--   n_constraints = 64, tabelas_novas_existem = 0, encounters_existe = false, coluna_proveniencia = 0,
--   reference_status = 0, usuarios_sinteticos = 0, pacientes_sinteticos = 0, nota_nullable = 'NO',
--   constraint_scores_existe = false, sessoes_em_transacao = 0, aprovadores/aprovacoes/leituras = 'tabela ausente'.
-- ============================================================================
select json_build_object(
  'hist_n', (select count(*) from supabase_migrations.schema_migrations),
  'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
  'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
  'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
  'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
  'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
  'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
  'tabelas_novas_existem', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('methodology_packages','methodology_approvers','methodology_package_approvals','integrated_reading_rule_packages','integrated_reading_domains','integrated_reading_exam_domain_links','integrated_reading_rules','integrated_readings','lab_exam_catalog','encounters')),
  'encounters_existe', to_regclass('public.encounters') is not null,
  'coluna_proveniencia', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_package_id','methodology_package_version')),
  'reference_status', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'lab_results' and column_name = 'reference_status'),
  'nota_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_system_scores' and column_name = 'nota'),
  'constraint_scores_existe', exists (select 1 from pg_constraint where conname = 'holoscan_system_scores_sem_dado_coerente'),
  'usuarios_sinteticos', (select count(*) from auth.users where email like 'e61-%@teste.invalid'),
  'pacientes_sinteticos', (select count(*) from public.patients where nome = 'E61 SINTETICO'),
  'aprovadores', case when to_regclass('public.methodology_approvers') is null then 'tabela ausente' else 'TABELA EXISTE: investigar' end,
  'aprovacoes', case when to_regclass('public.integrated_reading_package_approvals') is null then 'tabela ausente' else 'TABELA EXISTE: investigar' end,
  'leituras', case when to_regclass('public.integrated_readings') is null then 'tabela ausente' else 'TABELA EXISTE: investigar' end,
  'contagens', json_build_object('patients', (select count(*) from public.patients), 'holoscan_applications', (select count(*) from public.holoscan_applications), 'holoscan_system_scores', (select count(*) from public.holoscan_system_scores), 'lab_collections', (select count(*) from public.lab_collections), 'lab_results', (select count(*) from public.lab_results), 'auth_users', (select count(*) from auth.users)),
  'sessoes_em_transacao', (select count(*) from pg_stat_activity where state like 'idle in transaction%')
) as estado_persistente_pos_rollback;
