-- ADMINISTRACAO (10/10) — PARTE 3 de 4: liberar/recusar/voltar para analise + corrigir nome e telefone
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA
-- (nao muda tabela existente nem dado clinico). Identico a supabase/migrations/20261016100000_administracao.sql.
-- A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if to_regprocedure('public.admin_painel()') is null then raise exception 'rode a PARTE 2 antes (nada foi aplicado)'; end if;
end $$;
-- 3. liberar / recusar / voltar para analise
create or replace function public.admin_definir_status(p_user uuid, p_status text, p_motivo text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_de text; v_email text; v_motivo text := nullif(left(trim(coalesce(p_motivo, '')), 500), '');
begin
  if not public.eh_administrador() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('ativo', 'recusado', 'pendente') then
    raise exception 'status invalido' using errcode = '22023', hint = 'status_invalido';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'ninguem altera o status da propria conta' using errcode = '42501', hint = 'propria_conta';
  end if;
  select p.status into v_de from public.profiles p where p.id = p_user for update;
  if v_de is null then raise exception 'conta nao encontrada' using errcode = 'P0002', hint = 'conta_nao_encontrada'; end if;
  if v_de = p_status then return jsonb_build_object('status', v_de, 'alterado', false); end if;
  update public.profiles
     set status = p_status,
         aprovado_em = case when p_status = 'pendente' then null else now() end,
         aprovado_por = case when p_status = 'pendente' then null else (select auth.uid()) end
   where id = p_user;
  select u.email::text into v_email from auth.users u where u.id = p_user;
  insert into public.admin_audit_log (actor_id, target_user, target_email, acao, detalhes)
  values ((select auth.uid()), p_user, v_email,
          case p_status when 'ativo' then 'liberar' when 'recusado' then 'recusar' else 'voltar_pendente' end,
          jsonb_strip_nulls(jsonb_build_object('de', v_de, 'para', p_status, 'motivo', v_motivo)));
  return jsonb_build_object('status', p_status, 'alterado', true);
end;
$$;

-- 4. corrigir nome e telefone de uma conta
create or replace function public.admin_editar_perfil(p_user uuid, p_nome text, p_telefone text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_nome text := trim(coalesce(p_nome, '')); v_tel text := regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
        o record; v_email text; v_mud jsonb := '{}'::jsonb;
begin
  if not public.eh_administrador() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  if length(v_nome) < 2 or length(v_nome) > 120 then
    raise exception 'nome invalido' using errcode = '22023', hint = 'nome_invalido';
  end if;
  if v_tel <> '' and length(v_tel) not between 10 and 11 then
    raise exception 'telefone invalido' using errcode = '22023', hint = 'telefone_invalido';
  end if;
  select p.nome, p.telefone into o from public.profiles p where p.id = p_user for update;
  if not found then raise exception 'conta nao encontrada' using errcode = 'P0002', hint = 'conta_nao_encontrada'; end if;
  if o.nome is distinct from v_nome then v_mud := v_mud || jsonb_build_object('nome', jsonb_build_object('de', o.nome, 'para', v_nome)); end if;
  if coalesce(o.telefone, '') <> v_tel then v_mud := v_mud || jsonb_build_object('telefone', jsonb_build_object('de', o.telefone, 'para', nullif(v_tel, ''))); end if;
  if v_mud = '{}'::jsonb then return jsonb_build_object('alterado', false); end if;
  update public.profiles set nome = v_nome, telefone = nullif(v_tel, '') where id = p_user;
  select u.email::text into v_email from auth.users u where u.id = p_user;
  insert into public.admin_audit_log (actor_id, target_user, target_email, acao, detalhes)
  values ((select auth.uid()), p_user, v_email, 'editar_perfil', v_mud);
  return jsonb_build_object('alterado', true);
end;
$$;
revoke all on function public.admin_definir_status(uuid, text, text), public.admin_editar_perfil(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_definir_status(uuid, text, text), public.admin_editar_perfil(uuid, text, text) to authenticated;
commit;
select 'admin_definir_status criada' as item, (to_regprocedure('public.admin_definir_status(uuid, text, text)') is not null)::text as valor
union all select 'admin_editar_perfil criada', (to_regprocedure('public.admin_editar_perfil(uuid, text, text)') is not null)::text;
