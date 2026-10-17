-- =====================================================================
-- PRONTUARIO (09/10): exames e documentos sao SO arquivos — PARTE 4 de 4 — rodar INTEIRA no SQL Editor (uma transacao).
-- Conferencia final (POS) e registro da migration em supabase_migrations. Nao muda dado nenhum.
-- Rode as partes NA ORDEM (1, 2, 3, 4). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema (tudo e "if not exists" / "create or replace").
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado; metodologia, HOLOSCAN e Resultado HOLOS intocados.
-- Conteudo identico a supabase/migrations/20261011100000_prontuario_documentos.sql (dividido so para caber no editor).
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if position('exames_incluidos' in pg_get_functiondef('public.emitir_relatorio(jsonb)'::regprocedure)) = 0 then raise exception 'rode a PARTE 3 antes (emitir_relatorio ainda e a versao antiga)'; end if;
end $$;
-- POS: confere tudo e so entao registra a migration
do $$
declare n int; f text;
begin
  perform 1 from information_schema.columns where table_schema = 'public' and table_name = 'documents' and column_name in ('titulo', 'observacao', 'arquivado_em', 'arquivado_por');
  select count(*) into n from information_schema.columns where table_schema = 'public' and table_name = 'documents' and column_name in ('titulo', 'observacao', 'arquivado_em', 'arquivado_por');
  if n <> 4 then raise exception 'POS: esperadas 4 colunas novas em documents, encontradas %', n; end if;
  select count(*) into n from pg_trigger where tgrelid = 'public.documents'::regclass and not tgisinternal and tgname in ('documents_nao_apaga', 'documents_proteger', 'documents_nasce_ativo');
  if n <> 3 then raise exception 'POS: esperados 3 gatilhos em documents, encontrados %', n; end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.conducts'::regclass and tgname = 'conducts_sem_prescricao') then raise exception 'POS: gatilho conducts_sem_prescricao ausente'; end if;
  foreach f in array array['salvar_coleta_laboratorial', 'salvar_coleta_exames', 'revisar_coleta_laboratorial', 'marcar_coleta_revisada'] loop
    if not exists (select 1 from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = f and position('laboratorio_desativado' in pg_get_functiondef(p.oid)) > 0)
      then raise exception 'POS: % nao recusa', f; end if;
  end loop;
  if position('li_desativada' in pg_get_functiondef('public.salvar_leitura_integrada(jsonb)'::regprocedure)) = 0 then raise exception 'POS: salvar_leitura_integrada nao recusa'; end if;
  if position('exames_incluidos' in pg_get_functiondef('public.emitir_relatorio(jsonb)'::regprocedure)) = 0 then raise exception 'POS: emitir_relatorio e a versao antiga'; end if;
  if has_table_privilege('authenticated', 'public.documents', 'delete') then raise exception 'POS: authenticated ainda apaga documents'; end if;
  foreach f in array array['lab_collections', 'lab_results', 'lab_result_components', 'lab_custom_exams'] loop
    if has_table_privilege('authenticated', 'public.' || f, 'insert') or has_table_privilege('authenticated', 'public.' || f, 'update') or has_table_privilege('authenticated', 'public.' || f, 'delete') then raise exception 'POS: authenticated ainda escreve em %', f; end if;
    if not has_table_privilege('authenticated', 'public.' || f, 'select') then raise exception 'POS: authenticated perdeu a leitura de %', f; end if;
  end loop;
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_patient_docs_update') then raise exception 'POS: politica de UPDATE do bucket ainda existe'; end if;
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'storage_patient_docs_delete' and qual like '%documents%') then raise exception 'POS: politica de DELETE do bucket nao protege o documento registrado'; end if;
end $$;

insert into supabase_migrations.schema_migrations (version, name)
values ('20261011100000', 'prontuario_documentos')
on conflict (version) do nothing;
commit;

select 'colunas novas em documents' as item, (select count(*)::text from information_schema.columns where table_schema = 'public' and table_name = 'documents' and column_name in ('titulo', 'observacao', 'arquivado_em', 'arquivado_por')) as valor
union all select 'gatilhos em documents', (select count(*)::text from pg_trigger where tgrelid = 'public.documents'::regclass and not tgisinternal)
union all select 'documentos (total / arquivados)', (select count(*)::text || ' / ' || count(*) filter (where arquivado_em is not null)::text from public.documents)
union all select 'coletas historicas preservadas', (select count(*)::text from public.lab_collections)
union all select 'resultados historicos preservados', (select count(*)::text from public.lab_results)
union all select 'leituras integradas historicas preservadas', (select count(*)::text from public.integrated_readings)
union all select 'relatorios emitidos preservados', (select count(*)::text from public.report_emissions)
union all select 'authenticated escreve em lab_collections', has_table_privilege('authenticated', 'public.lab_collections', 'insert')::text
union all select 'authenticated apaga documents', has_table_privilege('authenticated', 'public.documents', 'delete')::text
union all select 'migration registrada', (select count(*)::text from supabase_migrations.schema_migrations where version = '20261011100000');
