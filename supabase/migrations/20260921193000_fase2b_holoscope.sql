-- ============================================================================
-- FASE 2B — HOLOSCOPE (applications, answers, system_scores)
-- ============================================================================
--
-- Escopo desta migration, e so isto:
--   1. holoscope_applications — snapshot completo de cada aplicacao HOLOSCOPE
--   2. holoscope_answers      — respostas brutas (84 marcadores, valor 0..3)
--   3. holoscope_system_scores — nota por sistema por aplicacao
--
-- Principio de historico: cada aplicacao e um snapshot imutavel do momento.
-- Respostas brutas, resultado calculado, triada, combinacoes e interpretacao
-- profissional sao preservados. Nada e recalculado retroativamente.
--
-- Snapshot persistido: indice, sistemas, triada, cobertura, combinacoes,
--   aprofundamentos, interpretacao profissional.
-- Resposta bruta persistida: valor 0..3 de cada marcador respondido.
-- NAO persistido: HOLOSCAN, sugestao de retorno, timeline, calculos
--   puramente de apresentacao.
--
-- NAO cria: HOLOSCAN, lab, tool_applications, documents, storage, reports.
-- NAO altera frontend.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================


-- ============================================================================
-- 1. HOLOSCOPE_APPLICATIONS — snapshot de cada aplicacao
-- ============================================================================
--
-- Cada linha e UM calculo HOLOSCOPE para UM paciente em UMA data.
-- NAO existe UNIQUE(patient_id, quando): o app atual substitui a aplicacao
-- do mesmo dia, mas essa regra pertence ao frontend, nao ao banco.
-- Cada aplicacao tem UUID proprio.
--
-- versao_bancos e nullable: so sera preenchida quando existir estrategia
-- real de versionamento dos bancos CSV. Nao gerar hash automaticamente.

create table public.holoscope_applications (
  id                    uuid primary key default gen_random_uuid(),
  nutritionist_id       uuid not null default auth.uid()
                          references auth.users(id),
  patient_id            uuid not null,
  quando                date not null,
  versao_estrutura      integer not null,
  versao_bancos         text,
  indice                numeric not null,
  indice_maximo         numeric not null,
  avaliavel             boolean not null,
  nota_media            numeric not null,
  triada                jsonb not null,
  triada_com_dado       jsonb not null,
  cobertura             jsonb not null,
  combinacoes           jsonb not null default '[]'::jsonb,
  aprofundamentos       jsonb not null default '[]'::jsonb,
  interpretacao_texto   text,
  interpretacao_em      timestamptz,
  interpretacao_versao  integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  constraint holoscope_applications_versao_positiva
    check (versao_estrutura > 0),

  constraint holoscope_applications_indice_maximo_positivo
    check (indice_maximo > 0),

  constraint holoscope_applications_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict
);

create index holoscope_applications_nutritionist_id_idx
  on public.holoscope_applications (nutritionist_id);

create index holoscope_applications_patient_quando_idx
  on public.holoscope_applications (patient_id, quando desc);

drop trigger if exists holoscope_applications_tocar_updated_at
  on public.holoscope_applications;
create trigger holoscope_applications_tocar_updated_at
  before update on public.holoscope_applications
  for each row execute function public.tocar_updated_at();

-- Protecao de imutabilidade: somente interpretacao pode ser alterada.
-- Campos historicos/calculados sao congelados apos INSERT.
create or replace function public.proteger_snapshot_holoscope()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.nutritionist_id       is distinct from old.nutritionist_id
  or new.patient_id            is distinct from old.patient_id
  or new.quando                is distinct from old.quando
  or new.versao_estrutura      is distinct from old.versao_estrutura
  or new.versao_bancos         is distinct from old.versao_bancos
  or new.indice                is distinct from old.indice
  or new.indice_maximo         is distinct from old.indice_maximo
  or new.avaliavel             is distinct from old.avaliavel
  or new.nota_media            is distinct from old.nota_media
  or new.triada                is distinct from old.triada
  or new.triada_com_dado       is distinct from old.triada_com_dado
  or new.cobertura             is distinct from old.cobertura
  or new.combinacoes           is distinct from old.combinacoes
  or new.aprofundamentos       is distinct from old.aprofundamentos
  then
    raise exception 'campos historicos do snapshot HOLOSCOPE sao imutaveis; '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  end if;
  return new;
end;
$$;

drop trigger if exists holoscope_applications_proteger_snapshot
  on public.holoscope_applications;
create trigger holoscope_applications_proteger_snapshot
  before update on public.holoscope_applications
  for each row execute function public.proteger_snapshot_holoscope();

alter table public.holoscope_applications enable row level security;

create policy holoscope_applications_select_proprios
  on public.holoscope_applications for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy holoscope_applications_insert_proprios
  on public.holoscope_applications for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy holoscope_applications_update_proprios
  on public.holoscope_applications for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy holoscope_applications_delete_proprios
  on public.holoscope_applications for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));


-- ============================================================================
-- 2. HOLOSCOPE_ANSWERS — respostas brutas de cada aplicacao
-- ============================================================================
--
-- Auditoria confirmou: TODOS os 84 marcadores usam escala 0..3.
--   - 73 itens com rotulo "frequencia" (Nunca/As vezes/Frequente/Sempre)
--   - 11 itens com rotulo "intensidade" (Nada/Um pouco/Bastante/Muito)
--   - 9 itens com sentido "invertido" (motor inverte: carga = 3 - resposta)
-- Nenhum campo composto, texto livre ou escala variavel.
-- O valor armazenado e sempre a resposta BRUTA do paciente (0..3),
-- antes de qualquer conversao de direcao — essa e responsabilidade do motor.
--
-- Filha de holoscope_applications com ON DELETE CASCADE:
-- apagar a aplicacao apaga suas respostas.
--
-- Imutabilidade: answers sao dados historicos. Depois de inseridas, nao
-- devem ser alteradas nem apagadas diretamente. Apenas SELECT e INSERT
-- possuem policy RLS. A exclusao acontece somente via CASCADE ao apagar
-- a aplicacao pai.
--
-- Semantica: ausencia de linha para um marcador = marcador nao respondido
-- naquela aplicacao. O motor so conta marcadores presentes no calculo.

create table public.holoscope_answers (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null
                      references public.holoscope_applications(id)
                      on delete cascade,
  marcador_id       text not null,
  valor             smallint not null,
  created_at        timestamptz not null default now(),

  constraint holoscope_answers_valor_valido
    check (valor between 0 and 3),

  constraint holoscope_answers_application_marcador_unique
    unique (application_id, marcador_id)
);

alter table public.holoscope_answers enable row level security;

create policy holoscope_answers_select_proprios
  on public.holoscope_answers for select
  to authenticated
  using (exists (
    select 1 from public.holoscope_applications a
    where a.id = holoscope_answers.application_id
      and a.nutritionist_id = (select auth.uid())
  ));

create policy holoscope_answers_insert_proprios
  on public.holoscope_answers for insert
  to authenticated
  with check (exists (
    select 1 from public.holoscope_applications a
    where a.id = holoscope_answers.application_id
      and a.nutritionist_id = (select auth.uid())
  ));

-- Sem policy de UPDATE: respostas brutas sao imutaveis apos INSERT.
-- Sem policy de DELETE: exclusao somente via CASCADE da aplicacao pai.


-- ============================================================================
-- 3. HOLOSCOPE_SYSTEM_SCORES — nota por sistema por aplicacao
-- ============================================================================
--
-- 5 sistemas com peso igual (0.20 cada):
--   fungico, acido_inflamatorio, metabolico,
--   detox_linfatico, mental_emocional_espiritual
--
-- Faixas: nota <= 3 = baixo, <= 6 = medio, > 6 = alto (escala 0-10).
-- nota = 10 - carga (nota e saude, carga e sobrecarga).
-- obtido/maximo sao pontos brutos ponderados do motor.
--
-- nome preserva o rotulo do banco no momento da aplicacao (snapshot).
--
-- Filha de holoscope_applications com ON DELETE CASCADE.
--
-- Imutabilidade: scores sao dados historicos. Depois de inseridos, nao
-- devem ser alterados nem apagados diretamente. Apenas SELECT e INSERT
-- possuem policy RLS. A exclusao acontece somente via CASCADE ao apagar
-- a aplicacao pai.

create table public.holoscope_system_scores (
  id                uuid primary key default gen_random_uuid(),
  application_id    uuid not null
                      references public.holoscope_applications(id)
                      on delete cascade,
  sistema           text not null,
  nome              text not null,
  nota              numeric not null,
  carga             numeric not null,
  faixa             text not null,
  obtido            numeric not null,
  maximo            numeric not null,
  respondidos       integer not null,
  total_marcadores  integer not null,
  avaliavel         boolean not null,
  created_at        timestamptz not null default now(),

  constraint holoscope_system_scores_application_sistema_unique
    unique (application_id, sistema),

  constraint holoscope_system_scores_sistema_valido
    check (sistema in (
      'fungico',
      'acido_inflamatorio',
      'metabolico',
      'detox_linfatico',
      'mental_emocional_espiritual'
    )),

  constraint holoscope_system_scores_faixa_valida
    check (faixa in ('baixo', 'medio', 'alto')),

  constraint holoscope_system_scores_respondidos_valido
    check (respondidos >= 0),

  constraint holoscope_system_scores_total_marcadores_valido
    check (total_marcadores > 0),

  constraint holoscope_system_scores_respondidos_coerente
    check (respondidos <= total_marcadores)
);

alter table public.holoscope_system_scores enable row level security;

create policy holoscope_system_scores_select_proprios
  on public.holoscope_system_scores for select
  to authenticated
  using (exists (
    select 1 from public.holoscope_applications a
    where a.id = holoscope_system_scores.application_id
      and a.nutritionist_id = (select auth.uid())
  ));

create policy holoscope_system_scores_insert_proprios
  on public.holoscope_system_scores for insert
  to authenticated
  with check (exists (
    select 1 from public.holoscope_applications a
    where a.id = holoscope_system_scores.application_id
      and a.nutritionist_id = (select auth.uid())
  ));

-- Sem policy de UPDATE: scores sao imutaveis apos INSERT.
-- Sem policy de DELETE: exclusao somente via CASCADE da aplicacao pai.


-- ============================================================================
-- NOTA: TRANSACAO ATOMICA FUTURA
-- ============================================================================
--
-- Uma aplicacao HOLOSCOPE concluida precisara ser salva de forma atomica:
--   INSERT holoscope_applications  (1 linha)
--   INSERT holoscope_answers       (ate 84 linhas)
--   INSERT holoscope_system_scores (5 linhas)
--
-- Isso sera implementado no frontend (ou via RPC/Edge Function) numa fase
-- futura. Esta migration cria apenas o schema — nao cria funcoes RPC nem
-- altera o frontend.
