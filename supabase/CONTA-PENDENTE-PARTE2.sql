-- =====================================================================
-- CONTA PENDENTE = SOMENTE PERFIL (09/10) — PARTE 2 de 2 — rodar INTEIRA no SQL Editor (uma transacao).
-- Politicas: recusada nao edita perfil/imagens; Storage (documento de paciente exige conta ativa). Registra a migration.
-- Rode as partes NA ORDEM (1, 2). Se uma parte der erro, nada dela e aplicada: corrija e rode de novo a MESMA parte.
-- Pode rodar a mesma parte mais de uma vez sem problema (tudo e "create or replace" / "drop ... if exists").
-- NAO DESTRUTIVA: nenhuma tabela, coluna, linha ou arquivo e apagado ou alterado; status das contas intocado.
-- Conteudo identico a supabase/migrations/20261013100000_conta_pendente_somente_perfil.sql (dividido so para caber no editor).
-- A ULTIMA LINHA DESTE ARQUIVO (antes da conferencia) E "commit;". Se o editor cortar o texto, nao rode.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$
begin
  if to_regprocedure('public.exigir_conta_ativa()') is null or to_regprocedure('public.conta_pode_editar_perfil()') is null then
    raise exception 'rode a PARTE 1 antes (nada foi aplicado)';
  end if;
end $$;
-- 3. conta recusada nao edita o perfil nem as imagens
drop policy if exists profiles_recusada_nao_grava_ins on public.profiles;
create policy profiles_recusada_nao_grava_ins on public.profiles as restrictive for insert to authenticated
  with check ((select public.conta_pode_editar_perfil()));
drop policy if exists profiles_recusada_nao_grava_upd on public.profiles;
create policy profiles_recusada_nao_grava_upd on public.profiles as restrictive for update to authenticated
  using ((select public.conta_pode_editar_perfil())) with check ((select public.conta_pode_editar_perfil()));

drop policy if exists professional_assets_recusada_ins on public.professional_assets;
create policy professional_assets_recusada_ins on public.professional_assets as restrictive for insert to authenticated
  with check ((select public.conta_pode_editar_perfil()));
drop policy if exists professional_assets_recusada_upd on public.professional_assets;
create policy professional_assets_recusada_upd on public.professional_assets as restrictive for update to authenticated
  using ((select public.conta_pode_editar_perfil())) with check ((select public.conta_pode_editar_perfil()));
drop policy if exists professional_assets_recusada_del on public.professional_assets;
create policy professional_assets_recusada_del on public.professional_assets as restrictive for delete to authenticated
  using ((select public.conta_pode_editar_perfil()));

-- 4. Storage: documento de paciente exige conta ativa; imagem profissional recusa conta recusada
drop policy if exists storage_conta_liberada_ins on storage.objects;
create policy storage_conta_liberada_ins on storage.objects as restrictive for insert to authenticated
  with check ((bucket_id <> 'patient-documents' or (select public.conta_ativa()))
          and (bucket_id <> 'professional-assets' or (select public.conta_pode_editar_perfil())));
drop policy if exists storage_conta_liberada_upd on storage.objects;
create policy storage_conta_liberada_upd on storage.objects as restrictive for update to authenticated
  using ((bucket_id <> 'patient-documents' or (select public.conta_ativa()))
     and (bucket_id <> 'professional-assets' or (select public.conta_pode_editar_perfil())));
drop policy if exists storage_conta_liberada_del on storage.objects;
create policy storage_conta_liberada_del on storage.objects as restrictive for delete to authenticated
  using ((bucket_id <> 'patient-documents' or (select public.conta_ativa()))
     and (bucket_id <> 'professional-assets' or (select public.conta_pode_editar_perfil())));
insert into supabase_migrations.schema_migrations (version, name)
values ('20261013100000', 'conta_pendente_somente_perfil')
on conflict (version) do nothing;
commit;

select 'tabelas com a trava (gatilho exigir_conta_ativa)' as item, (select count(*)::text from pg_trigger where tgname = 'exigir_conta_ativa') as valor
union all select 'politicas novas (profiles, professional_assets, storage)', (select count(*)::text from pg_policies where policyname in ('profiles_recusada_nao_grava_ins', 'profiles_recusada_nao_grava_upd', 'professional_assets_recusada_ins', 'professional_assets_recusada_upd', 'professional_assets_recusada_del', 'storage_conta_liberada_ins', 'storage_conta_liberada_upd', 'storage_conta_liberada_del'))
union all select 'contas por status (nada mudou)', (select string_agg(status || '=' || n, ', ') from (select status, count(*) n from public.profiles group by status order by status) s)
union all select 'migration registrada', (select count(*)::text from supabase_migrations.schema_migrations where version = '20261013100000');
