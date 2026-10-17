-- =====================================================================
-- PRONTUARIO (09/10): exames e documentos sao SO arquivos — PARTE 1 de 4 — rodar INTEIRA no SQL Editor (uma transacao).
-- Documentos: titulo, observacao, arquivamento; gatilhos (nao apaga, imutavel, nasce ativo); privilegios; politicas do Storage.
-- Rode as partes NA ORDEM (1, 2, 3, 4). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema (tudo e "if not exists" / "create or replace").
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado; metodologia, HOLOSCAN e Resultado HOLOS intocados.
-- Conteudo identico a supabase/migrations/20261011100000_prontuario_documentos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
declare faltando text[] := '{}';
begin
  if to_regclass('public.documents') is null then faltando := faltando || 'tabela documents'; end if;
  if to_regprocedure('public.salvar_coleta_laboratorial(jsonb)') is null then faltando := faltando || 'salvar_coleta_laboratorial(jsonb)'; end if;
  if to_regprocedure('public.salvar_leitura_integrada(jsonb)') is null then faltando := faltando || 'salvar_leitura_integrada(jsonb)'; end if;
  if to_regprocedure('public.emitir_relatorio(jsonb)') is null then faltando := faltando || 'emitir_relatorio(jsonb)'; end if;
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261010100000') then faltando := faltando || 'migration 20261010100000 (revisao das perguntas)'; end if;
  if array_length(faltando, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(faltando, ', '); end if;
end $$;
-- ----------------------------------------------------------------------------
-- 1. DOCUMENTOS: titulo, observacao e arquivamento
-- ----------------------------------------------------------------------------
alter table public.documents add column if not exists titulo text;
alter table public.documents add column if not exists observacao text;
alter table public.documents add column if not exists arquivado_em timestamptz;
alter table public.documents add column if not exists arquivado_por uuid references auth.users(id);
alter table public.documents drop constraint if exists documents_titulo_tamanho;
alter table public.documents add constraint documents_titulo_tamanho check (titulo is null or char_length(titulo) <= 200);
alter table public.documents drop constraint if exists documents_observacao_tamanho;
alter table public.documents add constraint documents_observacao_tamanho check (observacao is null or char_length(observacao) <= 2000);
create index if not exists documents_paciente_ativos on public.documents (patient_id, created_at desc) where arquivado_em is null;

comment on column public.documents.titulo is 'Titulo dado pela nutricionista (biblioteca do prontuario). Sem titulo, a tela usa o nome do arquivo.';
comment on column public.documents.observacao is 'Observacao opcional da nutricionista. Texto livre; o sistema nao le o arquivo.';
comment on column public.documents.arquivado_em is 'Documento arquivado: sai da lista, mas o registro e o arquivo continuam guardados. Documento nao e apagado.';

-- Documento nao e apagado (nem pela API nem por engano no SQL Editor). Arquivar e um UPDATE de arquivado_em.
create or replace function public.documento_nao_apaga()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'documento do prontuario nao e apagado: arquive o documento'
    using errcode = 'P0001', hint = 'documento_nao_apaga';
end $$;
revoke all on function public.documento_nao_apaga() from public, anon, authenticated;
drop trigger if exists documents_nao_apaga on public.documents;
create trigger documents_nao_apaga before delete on public.documents
  for each row execute function public.documento_nao_apaga();

-- O que identifica o arquivo nunca muda; so os metadados da biblioteca e o arquivamento.
create or replace function public.documento_proteger()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.patient_id is distinct from old.patient_id or new.nutritionist_id is distinct from old.nutritionist_id
     or new.storage_path is distinct from old.storage_path or new.mime_type is distinct from old.mime_type
     or new.tamanho_bytes is distinct from old.tamanho_bytes or new.origem_local is distinct from old.origem_local
     or new.created_at is distinct from old.created_at then
    raise exception 'o arquivo do documento nao muda: so titulo, tipo, data, observacao e arquivamento'
      using errcode = 'P0001', hint = 'documento_imutavel';
  end if;
  -- quem arquivou e quando: do servidor, nunca do payload
  if new.arquivado_em is not null and old.arquivado_em is null then
    new.arquivado_em := now();
    new.arquivado_por := auth.uid();
  elsif new.arquivado_em is null then
    new.arquivado_por := null;
  else
    new.arquivado_em := old.arquivado_em;
    new.arquivado_por := old.arquivado_por;
  end if;
  return new;
end $$;
revoke all on function public.documento_proteger() from public, anon, authenticated;
drop trigger if exists documents_proteger on public.documents;
create trigger documents_proteger before update on public.documents
  for each row execute function public.documento_proteger();

-- documento nasce ativo: arquivado_em/arquivado_por nao vem do payload
create or replace function public.documento_nasce_ativo()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.arquivado_em := null;
  new.arquivado_por := null;
  return new;
end $$;
revoke all on function public.documento_nasce_ativo() from public, anon, authenticated;
drop trigger if exists documents_nasce_ativo on public.documents;
create trigger documents_nasce_ativo before insert on public.documents
  for each row execute function public.documento_nasce_ativo();

-- a API perde o DELETE de documents (a politica fica, o grant sai; o gatilho acima cobre o resto)
revoke delete on table public.documents from authenticated;

-- Storage: o arquivo de um documento registrado nao pode ser apagado nem sobrescrito. Continua podendo apagar SO o
-- objeto orfao (upload cuja linha em documents nao chegou a ser gravada), que e o que o app limpa quando o insert falha.
drop policy if exists storage_patient_docs_update on storage.objects;
drop policy if exists storage_patient_docs_delete on storage.objects;
create policy storage_patient_docs_delete
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not exists (select 1 from public.documents d where d.storage_path = objects.name)
  );

commit;
