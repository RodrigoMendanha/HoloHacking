-- ============================================================================
-- FASE 2C — LAB_COLLECTIONS + LAB_RESULTS (exames laboratoriais)
-- ============================================================================
--
-- Escopo desta migration, e so isto:
--   1. lab_collections — cada coleta agrupa resultados de um paciente
--   2. lab_results     — um resultado por exame dentro de uma coleta
--
-- HOLOSCAN NAO e tabela: o confronto entre HOLOSCOPE e exames continua
-- derivado em tempo de execucao a partir de:
--   - aplicacao HOLOSCOPE escolhida
--   - coleta laboratorial escolhida
--   - banco de regras vigente
-- Nenhuma tabela de confronto/convergencia/divergencia e criada aqui.
--
-- Nao existe FK obrigatoria de lab_collections para holoscope_applications.
-- Exames podem existir antes de qualquer HOLOSCOPE.
-- O relacionamento e uma operacao posterior, a definir em fase futura.
--
-- NAO cria: holoscan_results, tool_applications, documents, storage.
-- NAO altera frontend.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================


-- ============================================================================
-- 1. LAB_COLLECTIONS — cada coleta de exames
-- ============================================================================
--
-- Uma coleta agrupa um conjunto de resultados laboratoriais de um paciente
-- em uma data especifica. Cada nova coleta cria uma nova linha — nunca
-- sobrescreve coleta anterior.
--
-- Isso corrige a lacuna atual do localStorage (holohacking.exames) que
-- guarda somente o ultimo valor por exame/paciente, sem data de coleta
-- e sem historico.

create table public.lab_collections (
  id               uuid primary key default gen_random_uuid(),
  nutritionist_id  uuid not null default auth.uid()
                     references auth.users(id),
  patient_id       uuid not null,
  coletado_em      date not null,
  laboratorio      text,
  observacao        text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint lab_collections_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict
);

create index lab_collections_nutritionist_id_idx
  on public.lab_collections (nutritionist_id);

create index lab_collections_patient_coletado_idx
  on public.lab_collections (patient_id, coletado_em desc);

drop trigger if exists lab_collections_tocar_updated_at on public.lab_collections;
create trigger lab_collections_tocar_updated_at
  before update on public.lab_collections
  for each row execute function public.tocar_updated_at();

alter table public.lab_collections enable row level security;

create policy lab_collections_select_proprios
  on public.lab_collections for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy lab_collections_insert_proprios
  on public.lab_collections for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy lab_collections_update_proprios
  on public.lab_collections for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy lab_collections_delete_proprios
  on public.lab_collections for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));


-- ============================================================================
-- 2. LAB_RESULTS — um resultado por exame dentro de uma coleta
-- ============================================================================
--
-- Auditoria confirmou: TODOS os 24 exames (EXA-001 a EXA-024) sao
-- estritamente numericos. Nao existem exames qualitativos (positivo/negativo,
-- reagente/nao-reagente). Nao existem faixas por sexo, idade ou gestacao.
-- Todos possuem ideal_min e ideal_max preenchidos.
--
-- Snapshot da faixa: ideal_min_no_momento e ideal_max_no_momento preservam
-- a referencia vigente quando o resultado foi lancado. Se exames.csv mudar
-- no futuro, resultados antigos nao sao afetados.
--
-- nome_exame_no_momento e sistema_no_momento tambem sao snapshot: protegem
-- contra renomeacao ou reclassificacao futura de exames no CSV.
--
-- Filha de lab_collections com ON DELETE CASCADE.
--
-- Imutabilidade: decisao de produto PENDENTE.
-- O app atual nao possui conceito de "coleta concluida". Nao existe
-- confirmacao, lock ou status de consolidacao. Valores sao lancados
-- e corrigidos livremente. Por isso, UPDATE e DELETE estao permitidos
-- nesta rodada. Quando existir conceito de "coleta concluida" no produto,
-- um trigger de protecao pode ser adicionado (similar ao HOLOSCOPE).
-- Nao assumir imutabilidade sem decisao explicita.

create table public.lab_results (
  id                      uuid primary key default gen_random_uuid(),
  collection_id           uuid not null
                            references public.lab_collections(id)
                            on delete cascade,
  exame_id                text not null,
  valor                   numeric not null,
  unidade                 text not null,
  ideal_min_no_momento    numeric not null,
  ideal_max_no_momento    numeric not null,
  nome_exame_no_momento   text not null,
  sistema_no_momento      text not null,
  created_at              timestamptz not null default now(),

  constraint lab_results_collection_exame_unique
    unique (collection_id, exame_id),

  constraint lab_results_faixa_coerente
    check (ideal_min_no_momento <= ideal_max_no_momento),

  constraint lab_results_sistema_valido
    check (sistema_no_momento in (
      'fungico',
      'acido_inflamatorio',
      'metabolico',
      'detox_linfatico',
      'mental_emocional_espiritual'
    ))
);

alter table public.lab_results enable row level security;

create policy lab_results_select_proprios
  on public.lab_results for select
  to authenticated
  using (exists (
    select 1 from public.lab_collections c
    where c.id = lab_results.collection_id
      and c.nutritionist_id = (select auth.uid())
  ));

create policy lab_results_insert_proprios
  on public.lab_results for insert
  to authenticated
  with check (exists (
    select 1 from public.lab_collections c
    where c.id = lab_results.collection_id
      and c.nutritionist_id = (select auth.uid())
  ));

create policy lab_results_update_proprios
  on public.lab_results for update
  to authenticated
  using (exists (
    select 1 from public.lab_collections c
    where c.id = lab_results.collection_id
      and c.nutritionist_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.lab_collections c
    where c.id = lab_results.collection_id
      and c.nutritionist_id = (select auth.uid())
  ));

create policy lab_results_delete_proprios
  on public.lab_results for delete
  to authenticated
  using (exists (
    select 1 from public.lab_collections c
    where c.id = lab_results.collection_id
      and c.nutritionist_id = (select auth.uid())
  ));


-- ============================================================================
-- NOTA: MIGRACAO DO ESTADO LEGADO
-- ============================================================================
--
-- holohacking.exames guarda somente o ultimo valor por exame/paciente,
-- sem data de coleta e sem historico. Estrutura:
--   { "pacienteId": { "EXA-005": 108, "EXA-009": 168 } }
--
-- Estrategia futura possivel:
--   1. Ler todos os valores do localStorage no momento da migracao.
--   2. Criar uma lab_collection com coletado_em = data da migracao
--      (a data real e desconhecida — documentar como "importado").
--   3. Inserir cada valor como lab_result com snapshot da faixa vigente.
--   4. Nao inventar datas historicas.
--   5. Avisar o usuario que resultados importados nao possuem data real.
--
-- Nao migrar dados nesta rodada.
-- Nao alterar frontend.


-- ============================================================================
-- NOTA: HOLOSCAN COMO CALCULO DERIVADO
-- ============================================================================
--
-- HOLOSCAN responde: "O que os exames acrescentam ao mapa do HOLOSCOPE?"
--
-- Estados possiveis (calculados em runtime, nao persistidos):
--   - CONVERGENTE: relato do paciente e exames apontam mesma direcao
--   - CONVERGENTE_SEM_ALTERACAO: ambos indicam normalidade
--   - DIVERGENTE: relato e exames divergem (achado clinico relevante)
--   - DADOS_INSUFICIENTES: sem exames suficientes para confronto
--
-- O confronto e derivado a partir de:
--   - Uma aplicacao HOLOSCOPE (holoscope_applications) escolhida
--   - Uma coleta laboratorial (lab_collections + lab_results) escolhida
--   - O banco de regras vigente (motor/src/exames.ts confrontar())
--
-- HOLOSCAN nunca altera: score, indice, triada ou qualquer campo do
-- snapshot HOLOSCOPE. Ele opera como camada de leitura sobre dados
-- ja existentes.
--
-- Quando a estrategia de versionamento dos bancos estiver definida,
-- avaliar se o confronto deve usar a versao do banco do momento da
-- coleta ou a versao vigente. Decisao pendente.
