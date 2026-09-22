-- ============================================================================
-- FASE 2E — DOCUMENTS + STORAGE BUCKETS + PROFESSIONAL_ASSETS
-- ============================================================================
--
-- Escopo desta migration, e so isto:
--   1. documents          — metadados de cada arquivo de paciente
--   2. professional_assets — metadados das imagens do perfil profissional
--   3. Buckets de Storage  — patient-documents e professional-assets
--   4. Policies de Storage — acesso restrito ao dono (nutritionist)
--
-- O ArquivoStore (IndexedDB) guarda blob + metadados juntos. Aqui os
-- metadados vao para tabelas, e os blobs vao para Supabase Storage.
-- A integracao frontend (Etapa 8/9) substituira ArquivoStore por chamadas
-- ao Storage + tabelas, mantendo a mesma API publica.
--
-- Tipo de documento e texto livre: o app nao restringe — o usuario digita
-- "Exame laboratorial", "Laudo", "Receita", "Outro", etc. Nao ha CHECK.
--
-- Imagens do perfil (foto, logo, assinatura, carimbo) ficam sob
-- professional_assets com UNIQUE(nutritionist_id, tipo). Cada tipo tem
-- no maximo uma imagem ativa.
--
-- NAO cria: reports, timeline, holoscan_results.
-- NAO altera frontend.
--
-- Projeto: sllhyymeeyoozokgbnuv
-- ============================================================================


-- ============================================================================
-- 1. DOCUMENTS — metadados de cada arquivo de paciente
-- ============================================================================
--
-- Cada upload de arquivo para um paciente cria uma linha aqui.
-- O blob vai para o bucket patient-documents no Storage.
-- storage_path guarda o caminho completo dentro do bucket.
--
-- Quando ArquivoStore.salvar() for substituido, o fluxo sera:
--   1. Upload do blob para Storage (bucket patient-documents)
--   2. INSERT nesta tabela com storage_path apontando para o blob
--
-- O campo origem_local e a chave de idempotencia da migracao futura:
--   "idb:<id-do-indexeddb>" identifica o registro local que gerou este.
--   Nullable: somente documentos migrados a possuem.
--
-- mime_type e tamanho_bytes preservam o tipo e tamanho do arquivo original,
-- evitando HEAD requests ao Storage para informacoes basicas.

create table public.documents (
  id                uuid primary key default gen_random_uuid(),
  nutritionist_id   uuid not null default auth.uid()
                      references auth.users(id),
  patient_id        uuid not null,
  nome              text not null,
  tipo              text not null default 'Outro',
  data_documento    date,
  mime_type         text not null default 'application/octet-stream',
  tamanho_bytes     bigint,
  storage_path      text not null,
  origem_local      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint documents_patient_nutritionist_fk
    foreign key (patient_id, nutritionist_id)
    references public.patients (id, nutritionist_id)
    on delete restrict,

  constraint documents_storage_path_unique
    unique (storage_path)
);

create index documents_nutritionist_id_idx
  on public.documents (nutritionist_id);

create index documents_patient_created_idx
  on public.documents (patient_id, created_at desc);

drop trigger if exists documents_tocar_updated_at on public.documents;
create trigger documents_tocar_updated_at
  before update on public.documents
  for each row execute function public.tocar_updated_at();

alter table public.documents enable row level security;

create policy documents_select_proprios
  on public.documents for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy documents_insert_proprios
  on public.documents for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy documents_update_proprios
  on public.documents for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy documents_delete_proprios
  on public.documents for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));


-- ============================================================================
-- 2. PROFESSIONAL_ASSETS — imagens do perfil profissional
-- ============================================================================
--
-- Cada nutricionista tem no maximo uma imagem por tipo.
-- UNIQUE(nutritionist_id, tipo) garante isso no banco.
--
-- Tipos validos: foto, logo, assinatura, carimbo.
-- Correspondem aos campos foto_id, logo_id, assinatura_id, carimbo_id
-- do perfil no localStorage/DadosLocais.
--
-- Quando o perfil for integrado ao Supabase, os campos *_id do perfil
-- apontarao para o id desta tabela em vez de ids do IndexedDB.

create table public.professional_assets (
  id                uuid primary key default gen_random_uuid(),
  nutritionist_id   uuid not null default auth.uid()
                      references auth.users(id),
  tipo              text not null,
  nome              text not null,
  mime_type         text not null default 'image/png',
  tamanho_bytes     bigint,
  storage_path      text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint professional_assets_nutritionist_tipo_unique
    unique (nutritionist_id, tipo),

  constraint professional_assets_tipo_valido
    check (tipo in ('foto', 'logo', 'assinatura', 'carimbo')),

  constraint professional_assets_storage_path_unique
    unique (storage_path)
);

drop trigger if exists professional_assets_tocar_updated_at on public.professional_assets;
create trigger professional_assets_tocar_updated_at
  before update on public.professional_assets
  for each row execute function public.tocar_updated_at();

alter table public.professional_assets enable row level security;

create policy professional_assets_select_proprios
  on public.professional_assets for select
  to authenticated
  using (nutritionist_id = (select auth.uid()));

create policy professional_assets_insert_proprios
  on public.professional_assets for insert
  to authenticated
  with check (nutritionist_id = (select auth.uid()));

create policy professional_assets_update_proprios
  on public.professional_assets for update
  to authenticated
  using (nutritionist_id = (select auth.uid()))
  with check (nutritionist_id = (select auth.uid()));

create policy professional_assets_delete_proprios
  on public.professional_assets for delete
  to authenticated
  using (nutritionist_id = (select auth.uid()));


-- ============================================================================
-- 3. STORAGE BUCKETS
-- ============================================================================
--
-- Dois buckets privados. Nenhuma leitura publica.
-- As policies abaixo garantem que cada nutricionista so acessa seus
-- proprios arquivos, usando o prefixo do user id no path.
--
-- Convencao de path:
--   patient-documents:   {nutritionist_uid}/{patient_id}/{filename}
--   professional-assets: {nutritionist_uid}/{tipo}/{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('patient-documents', 'patient-documents', false, 10485760, null),
  ('professional-assets', 'professional-assets', false, 5242880,
    array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do nothing;


-- ============================================================================
-- 4. STORAGE POLICIES — patient-documents
-- ============================================================================
--
-- Cada nutricionista opera somente dentro do seu prefixo:
--   {auth.uid()}/...
--
-- O cast (storage.foldername(name))[1] retorna o primeiro segmento do
-- path, que e o uid do dono. Comparar com auth.uid() garante isolamento.

create policy storage_patient_docs_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_patient_docs_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_patient_docs_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_patient_docs_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================================
-- 5. STORAGE POLICIES — professional-assets
-- ============================================================================

create policy storage_prof_assets_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'professional-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_prof_assets_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'professional-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_prof_assets_update
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'professional-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy storage_prof_assets_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'professional-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================================
-- NOTA: MIGRACAO DOS DADOS LEGADOS
-- ============================================================================
--
-- Duas origens de dados legados:
--
-- 1. IndexedDB "holohacking" / "arquivos" (ArquivoStore)
--    Documentos de pacientes. Cada registro tem:
--      id, paciente, nome, tipo, data, mime, tamanho, arquivo (Blob)
--    Registros com paciente = "_perfil" sao imagens do perfil profissional.
--    Estrategia:
--      a. Listar todos via ArquivoStore.listarTudoEstrito()
--      b. Para cada registro:
--         - Se paciente = "_perfil": upload para professional-assets bucket,
--           INSERT em professional_assets com tipo derivado do nome/contexto
--         - Senao: upload para patient-documents bucket,
--           INSERT em documents com origem_local = "idb:<id>"
--      c. Manter IndexedDB intacto ate confirmacao de sucesso
--
-- 2. Campos *_id do perfil (localStorage "holohacking.dados.perfil")
--    foto_id, logo_id, assinatura_id, carimbo_id apontam para ids
--    no IndexedDB. Apos migracao das imagens para professional_assets,
--    estes campos passam a apontar para os novos ids UUID.
--
-- Nao migrar dados nesta rodada.
-- Nao alterar frontend.
