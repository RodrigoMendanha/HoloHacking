-- =====================================================================
-- CADASTRO DE NUTRICIONISTAS — rodar INTEIRO no SQL Editor do Supabase.
-- Conteudo identico a supabase/migrations/20261008100000_cadastro_aprovacao.sql,
-- numa transacao, mais: (a) voce como administradora, (b) registro no
-- historico de migrations e (c) conferencia no fim.
--
-- ANTES DE RODAR: troque SEU_EMAIL_DE_LOGIN pelo e-mail com que voce entra no
-- HoloHacking (linha marcada com >>>). Ele nao vai para o repositorio.
-- Pode rodar de novo sem estragar nada (tudo e "if not exists"/"or replace").
-- =====================================================================
begin;


-- 1. status da conta
-- as contas que ja existem quando a coluna nasce (anteriores ao cadastro pelo
-- app) recebem 'ativo'; dai em diante o padrao e 'pendente'. Rodar de novo nao
-- mexe em ninguem (a coluna ja existe).
do $$ begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'status') then
    alter table public.profiles add column status text not null default 'ativo';
    alter table public.profiles alter column status set default 'pendente';
  end if;
end $$;
alter table public.profiles
  add column if not exists aprovado_em timestamptz,
  add column if not exists aprovado_por uuid references auth.users(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_status_valido') then
    alter table public.profiles add constraint profiles_status_valido check (status in ('pendente','ativo','recusado'));
  end if;
end $$;

-- 2. administradores
create table if not exists public.administradores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

create or replace function public.eh_administrador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.administradores a where a.user_id = (select auth.uid()));
$$;

create or replace function public.conta_ativa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'ativo');
$$;

-- 3. novo usuario: nome, telefone e e-mail de contato vem do cadastro
create or replace function public.lidar_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome, telefone, email_contato, status)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), new.email),
          nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'telefone', ''), '[^0-9]', '', 'g'), ''),
          new.email,
          'pendente')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. a nutri nao decide o proprio status
create or replace function public.proteger_status_conta()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.status := 'pendente'; new.aprovado_em := null; new.aprovado_por := null;
    elsif new.status is distinct from old.status or new.aprovado_em is distinct from old.aprovado_em
       or new.aprovado_por is distinct from old.aprovado_por then
      raise exception 'o status da conta so e alterado pela equipe HoloHacking' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_proteger_status on public.profiles;
create trigger profiles_proteger_status before insert or update on public.profiles
  for each row execute function public.proteger_status_conta();

-- 5. trava real: conta nao ativa nao cria nem altera paciente
drop policy if exists patients_exige_conta_ativa_ins on public.patients;
create policy patients_exige_conta_ativa_ins on public.patients as restrictive for insert to authenticated
  with check ((select public.conta_ativa()));
drop policy if exists patients_exige_conta_ativa_upd on public.patients;
create policy patients_exige_conta_ativa_upd on public.patients as restrictive for update to authenticated
  using ((select public.conta_ativa())) with check ((select public.conta_ativa()));

-- 6. funcoes do app
create or replace function public.minha_conta_status()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.status from public.profiles p where p.id = (select auth.uid())), 'pendente');
$$;

create or replace function public.listar_contas(p_status text default 'pendente')
returns table (id uuid, nome text, telefone text, email text, status text, criado_em timestamptz, aprovado_em timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.eh_administrador() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  return query
    select p.id, p.nome, p.telefone, u.email::text, p.status, p.created_at, p.aprovado_em
      from public.profiles p join auth.users u on u.id = p.id
     where p_status is null or p.status = p_status
     order by p.created_at desc;
end;
$$;

create or replace function public.decidir_conta(p_user uuid, p_aprovar boolean)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.eh_administrador() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  update public.profiles
     set status = case when p_aprovar then 'ativo' else 'recusado' end,
         aprovado_em = now(), aprovado_por = (select auth.uid())
   where id = p_user
  returning status into v;
  if v is null then raise exception 'conta nao encontrada' using errcode = 'P0002'; end if;
  return v;
end;
$$;

revoke all on function public.eh_administrador(), public.conta_ativa(), public.minha_conta_status(),
  public.listar_contas(text), public.decidir_conta(uuid, boolean) from public, anon;
grant execute on function public.eh_administrador(), public.conta_ativa(), public.minha_conta_status(),
  public.listar_contas(text), public.decidir_conta(uuid, boolean) to authenticated;
revoke all on function public.lidar_novo_usuario(), public.proteger_status_conta() from public, anon, authenticated;

-- >>> (a) administradora: troque o e-mail abaixo
insert into public.administradores (user_id)
select id from auth.users where lower(email) = lower('SEU_EMAIL_DE_LOGIN')
on conflict do nothing;

-- (b) historico de migrations
insert into supabase_migrations.schema_migrations (version, name)
values ('20261008100000', 'cadastro_aprovacao') on conflict (version) do nothing;

do $$ begin
  if (select count(*) from public.administradores) = 0 then
    raise exception 'nenhuma administradora cadastrada: confira o e-mail na linha marcada com >>> (nada foi aplicado)';
  end if;
end $$;

commit;

-- (c) conferencia: contas por status, administradoras e travas
select 'contas ativas' as item, count(*)::text as valor from public.profiles where status = 'ativo'
union all select 'contas pendentes', count(*)::text from public.profiles where status = 'pendente'
union all select 'administradoras', count(*)::text from public.administradores
union all select 'trava em pacientes', count(*)::text from pg_policy where polrelid = 'public.patients'::regclass and polname like 'patients_exige_conta_ativa%'
union all select 'protecao do status', count(*)::text from pg_trigger where tgname = 'profiles_proteger_status';
