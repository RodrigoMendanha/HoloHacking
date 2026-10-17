-- ADMINISTRACAO (10/10) — PARTE 4 de 4: historico + registro da Edge Function + permissoes + registro da migration
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA
-- (nao muda tabela existente nem dado clinico). Identico a supabase/migrations/20261016100000_administracao.sql.
-- A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if to_regprocedure('public.admin_editar_perfil(uuid, text, text)') is null then raise exception 'rode a PARTE 3 antes (nada foi aplicado)'; end if;
end $$;
-- 5. historico das acoes
create or replace function public.admin_historico(p_limite int default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.eh_administrador() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(x order by x.created_at desc) from (
      select l.id, l.created_at, l.acao, l.detalhes, l.target_user as alvo_id,
             coalesce(pa.nome, l.target_email) as alvo_nome, l.target_email as alvo_email, pr.nome as ator_nome
        from public.admin_audit_log l
        left join public.profiles pa on pa.id = l.target_user
        left join public.profiles pr on pr.id = l.actor_id
       order by l.created_at desc
       limit greatest(1, least(coalesce(p_limite, 100), 500))) x), '[]'::jsonb);
end;
$$;

-- 6. registro das acoes feitas no Auth pela Edge Function admin-usuarios (so service_role)
create or replace function public.admin_registrar_acao_servico(p_actor uuid, p_target uuid, p_acao text, p_detalhes jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_email text;
begin
  if not exists (select 1 from public.administradores a where a.user_id = p_actor) then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  if p_acao not in ('definir_senha', 'enviar_link_senha', 'trocar_email', 'bloquear', 'desbloquear') then
    raise exception 'acao invalida' using errcode = '22023', hint = 'acao_invalida';
  end if;
  select u.email::text into v_email from auth.users u where u.id = p_target;
  insert into public.admin_audit_log (actor_id, target_user, target_email, acao, detalhes)
  values (p_actor, p_target, v_email, p_acao, coalesce(p_detalhes, '{}'::jsonb) - 'senha' - 'password' - 'token' - 'link')
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.admin_painel(), public.admin_definir_status(uuid, text, text),
  public.admin_editar_perfil(uuid, text, text), public.admin_historico(int),
  public.admin_registrar_acao_servico(uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_painel(), public.admin_definir_status(uuid, text, text),
  public.admin_editar_perfil(uuid, text, text), public.admin_historico(int) to authenticated;
grant execute on function public.admin_registrar_acao_servico(uuid, uuid, text, jsonb) to service_role;
insert into supabase_migrations.schema_migrations (version, name)
values ('20261016100000', 'administracao')
on conflict (version) do nothing;
commit;
select 'migration registrada' as item, (select count(*)::text from supabase_migrations.schema_migrations where version = '20261016100000') as valor
union all select 'administradores', (select count(*)::text from public.administradores)
union all select 'acoes registradas (0 no inicio)', (select count(*)::text from public.admin_audit_log)
union all select 'anon executa admin_* (deve ser false)', (has_function_privilege('anon', 'public.admin_painel()', 'execute') or has_function_privilege('anon', 'public.admin_historico(integer)', 'execute'))::text
union all select 'logado executa funcao de servico (deve ser false)', has_function_privilege('authenticated', 'public.admin_registrar_acao_servico(uuid, uuid, text, jsonb)', 'execute')::text
union all select 'contas no total', (select count(*)::text from auth.users);
