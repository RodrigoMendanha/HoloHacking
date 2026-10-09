-- =====================================================================
-- CONTA PENDENTE = SOMENTE PERFIL (09/10)
--
-- Reaproveita profiles.status (pendente | ativo | recusado) e o fluxo de
-- aprovacao de 20261008100000. Nenhum status novo.
--
--   ativo     grava tudo, como antes.
--   pendente  grava SO o proprio perfil (profiles) e as proprias imagens
--             profissionais (professional_assets + bucket professional-assets).
--             Nada clinico: paciente, atendimento, agenda, HOLOSCAN, ferramentas,
--             Resultado HOLOS, conduta, documentos, relatorios, HOLOS AI,
--             metodologia — nem direto pela API nem por RPC.
--   recusado  nao grava nada (nem perfil, nem imagens). Le o que ja e dela.
--
-- COMO: um gatilho de COMANDO (for each statement, before insert/update/delete)
-- em todas as tabelas de dado da nutricionista. Gatilho dispara tambem dentro
-- das RPCs SECURITY DEFINER (que passam por cima da RLS), entao uma trava so
-- cobre a API e as RPCs. Vale quando ha usuario logado (auth.uid()); migrations,
-- painel e service_role (sem auth.uid()) nao sao afetados.
-- Storage: politicas RESTRICTIVE (patient-documents exige conta ativa;
-- professional-assets recusa conta recusada).
--
-- Nao destrutivo: nao apaga nem altera dado; leitura continua igual.
-- =====================================================================

-- 1. pode editar o proprio perfil? (pendente ou ativo; conta sem linha conta como pendente)
create or replace function public.conta_pode_editar_perfil()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.status from public.profiles p where p.id = (select auth.uid())), 'pendente') <> 'recusado';
$$;
revoke all on function public.conta_pode_editar_perfil() from public, anon;
grant execute on function public.conta_pode_editar_perfil() to authenticated;

-- 2. a trava: conta logada e nao ativa nao grava dado clinico
create or replace function public.exigir_conta_ativa()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not public.conta_ativa() then
    raise exception 'conta ainda nao liberada: so o Perfil pode ser editado ate a equipe HoloHacking liberar o acesso (%)', tg_table_name
      using errcode = '42501', hint = 'conta_nao_liberada';
  end if;
  return null;
end;
$$;
revoke all on function public.exigir_conta_ativa() from public, anon, authenticated;

-- todas as tabelas com nutritionist_id (menos professional_assets, que e do Perfil)
-- + as tabelas-filhas gravadas junto com elas
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
      join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and c.column_name = 'nutritionist_id' and c.table_name <> 'professional_assets'
    union
    select u from unnest(array['ai_messages', 'holoscan_answers', 'holoscan_system_scores', 'lab_results', 'lab_result_components']) u
     where to_regclass('public.' || u) is not null
  loop
    execute format('drop trigger if exists exigir_conta_ativa on public.%I', t);
    execute format('create trigger exigir_conta_ativa before insert or update or delete on public.%I for each statement execute function public.exigir_conta_ativa()', t);
  end loop;
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
