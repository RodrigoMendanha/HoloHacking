-- MCP do HoloHacking (27/10): chave pessoal de conexao + registro de uso. ADITIVA: nao muda nenhuma tabela existente.
-- A chave (hh_mcp_...) e mostrada UMA vez a nutricionista; o banco guarda so o SHA-256. O servidor MCP (Edge Function
-- holohacking-mcp) chama mcp_identificar(hash) com o papel do servidor e depois executa tudo COMO a nutricionista
-- (role authenticated + request.jwt.claims), com o mesmo RLS e as mesmas RPCs do app. Conta pendente/recusada nao usa.
begin;

create table if not exists public.mcp_keys (
  id uuid primary key default gen_random_uuid(),
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  prefixo text not null check (char_length(prefixo) between 8 and 20),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index if not exists mcp_keys_nutri on public.mcp_keys (nutritionist_id);
alter table public.mcp_keys enable row level security;
drop policy if exists mcp_keys_ler_proprias on public.mcp_keys;
create policy mcp_keys_ler_proprias on public.mcp_keys for select to authenticated using (nutritionist_id = (select auth.uid()));
-- so leitura das proprias chaves, e nunca do hash; criar/revogar so pelas RPCs
revoke all on public.mcp_keys from public, anon, authenticated;
grant select (id, nutritionist_id, nome, prefixo, created_at, last_used_at, revoked_at) on public.mcp_keys to authenticated;

create table if not exists public.mcp_usage_log (
  id bigint generated always as identity primary key,
  nutritionist_id uuid not null references auth.users(id) on delete cascade,
  key_id uuid references public.mcp_keys(id) on delete set null,
  ferramenta text not null check (char_length(ferramenta) between 1 and 60),
  patient_id uuid,
  ok boolean not null,
  erro text check (erro is null or char_length(erro) <= 80),
  created_at timestamptz not null default now()
);
create index if not exists mcp_usage_log_nutri on public.mcp_usage_log (nutritionist_id, created_at desc);
alter table public.mcp_usage_log enable row level security;
drop policy if exists mcp_usage_log_ler_proprio on public.mcp_usage_log;
create policy mcp_usage_log_ler_proprio on public.mcp_usage_log for select to authenticated using (nutritionist_id = (select auth.uid()));
revoke all on public.mcp_usage_log from public, anon, authenticated;
grant select on public.mcp_usage_log to authenticated;

create or replace function public.mcp_hash_chave(p_chave text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(coalesce(p_chave, ''), 'UTF8'), 'sha256'), 'hex');
$$;
revoke all on function public.mcp_hash_chave(text) from public, anon, authenticated;

-- cria uma chave (no maximo 5 ativas); devolve a chave em claro UMA vez
create or replace function public.criar_chave_mcp(p_nome text default 'Assistente')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); tok text; kid uuid; nm text := btrim(coalesce(p_nome, ''));
begin
  if uid is null then raise exception 'sem sessao' using errcode = '42501', hint = 'sem_sessao'; end if;
  if not public.conta_ativa() then
    raise exception 'conta ainda nao liberada' using errcode = '42501', hint = 'conta_nao_liberada';
  end if;
  if nm = '' then nm := 'Assistente'; end if;
  if char_length(nm) > 60 then nm := left(nm, 60); end if;
  if (select count(*) from public.mcp_keys where nutritionist_id = uid and revoked_at is null) >= 5 then
    raise exception 'limite de chaves ativas' using errcode = 'P0001', hint = 'mcp_limite_chaves';
  end if;
  tok := 'hh_mcp_' || rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.mcp_keys (nutritionist_id, nome, key_hash, prefixo)
    values (uid, nm, public.mcp_hash_chave(tok), left(tok, 12)) returning id into kid;
  return jsonb_build_object('id', kid, 'nome', nm, 'prefixo', left(tok, 12), 'chave', tok);
end $$;
revoke all on function public.criar_chave_mcp(text) from public, anon;
grant execute on function public.criar_chave_mcp(text) to authenticated;

create or replace function public.revogar_chave_mcp(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := (select auth.uid()); r public.mcp_keys;
begin
  if uid is null then raise exception 'sem sessao' using errcode = '42501', hint = 'sem_sessao'; end if;
  select * into r from public.mcp_keys where id = p_id and nutritionist_id = uid;
  if not found then raise exception 'chave nao encontrada' using errcode = 'P0002', hint = 'mcp_chave_nao_encontrada'; end if;
  if r.revoked_at is null then update public.mcp_keys set revoked_at = now() where id = p_id; end if;
  return jsonb_build_object('id', p_id, 'revogada', true);
end $$;
revoke all on function public.revogar_chave_mcp(uuid) from public, anon;
grant execute on function public.revogar_chave_mcp(uuid) to authenticated;

-- SO O SERVIDOR MCP: resolve a chave -> nutricionista (chave nao revogada e conta ativa); marca o uso
create or replace function public.mcp_identificar(p_chave text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.mcp_keys;
begin
  if p_chave is null or p_chave !~ '^hh_mcp_[A-Za-z0-9_-]{40,60}$' then return null; end if;
  select * into r from public.mcp_keys where key_hash = public.mcp_hash_chave(p_chave) and revoked_at is null;
  if not found then return null; end if;
  if not exists (select 1 from public.profiles p where p.id = r.nutritionist_id and p.status = 'ativo') then return null; end if;
  if r.last_used_at is null or r.last_used_at < now() - interval '1 minute' then
    update public.mcp_keys set last_used_at = now() where id = r.id;
  end if;
  return jsonb_build_object('nutritionist_id', r.nutritionist_id, 'key_id', r.id);
end $$;
revoke all on function public.mcp_identificar(text) from public, anon, authenticated;
grant execute on function public.mcp_identificar(text) to service_role;

create or replace function public.mcp_registrar_uso(p_nutri uuid, p_key uuid, p_ferramenta text, p_patient uuid, p_ok boolean, p_erro text default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.mcp_usage_log (nutritionist_id, key_id, ferramenta, patient_id, ok, erro)
  values (p_nutri, p_key, left(p_ferramenta, 60), p_patient, p_ok, left(p_erro, 80));
$$;
revoke all on function public.mcp_registrar_uso(uuid, uuid, text, uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.mcp_registrar_uso(uuid, uuid, text, uuid, boolean, text) to service_role;

commit;
