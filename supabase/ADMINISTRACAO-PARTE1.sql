-- ADMINISTRACAO (10/10) — PARTE 1 de 4: registro imutavel das acoes da administracao (admin_audit_log)
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA
-- (nao muda tabela existente nem dado clinico). Identico a supabase/migrations/20261016100000_administracao.sql.
-- A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$
declare f text[] := '{}';
begin
  if not exists (select 1 from supabase_migrations.schema_migrations where version = '20261013100000') then f := f || 'migration 20261013100000'; end if;
  if to_regprocedure('public.eh_administrador()') is null then f := f || 'eh_administrador()'; end if;
  if to_regclass('public.administradores') is null then f := f || 'administradores'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'status') then f := f || 'profiles.status'; end if;
  if (select count(*) from public.administradores) < 1 then f := f || 'nenhum administrador cadastrado'; end if;
  if array_length(f, 1) > 0 then raise exception 'banco fora do estado esperado (nada foi aplicado): %', array_to_string(f, ', '); end if;
end $$;
-- 1. registro das acoes (sem FK: apagar uma conta nao reescreve o historico)
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  target_user uuid,
  target_email text,
  acao text not null check (acao in ('liberar', 'recusar', 'voltar_pendente', 'editar_perfil', 'definir_senha',
                                     'enviar_link_senha', 'trocar_email', 'bloquear', 'desbloquear')),
  detalhes jsonb not null default '{}'::jsonb check (jsonb_typeof(detalhes) = 'object'),
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists admin_audit_log_quando on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;

create or replace function public.proteger_admin_audit_log()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'o registro da administracao e imutavel' using errcode = '42501', hint = 'registro_imutavel';
end;
$$;
drop trigger if exists admin_audit_log_imutavel on public.admin_audit_log;
create trigger admin_audit_log_imutavel before update or delete on public.admin_audit_log
  for each row execute function public.proteger_admin_audit_log();
revoke all on function public.proteger_admin_audit_log() from public, anon, authenticated;
commit;
select 'admin_audit_log criada' as item, (to_regclass('public.admin_audit_log') is not null)::text as valor
union all select 'acesso direto pela API (deve ser false)', has_table_privilege('authenticated', 'public.admin_audit_log', 'select')::text;
