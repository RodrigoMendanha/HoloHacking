-- =====================================================================
-- ADMINISTRACAO (10/10) — pagina so para administradores
--
-- Aditiva. Nao muda nenhuma tabela existente, nenhum dado clinico, nenhum
-- calculo. Reaproveita public.administradores, eh_administrador() e
-- profiles.status (pendente | ativo | recusado) de 20261008100000.
--
-- - admin_audit_log: registro IMUTAVEL de tudo que um administrador faz na
--   conta de outra pessoa (liberar, recusar, editar perfil, senha, e-mail,
--   bloqueio). Sem acesso direto pela API; so as funcoes abaixo leem/gravam.
--   Nunca guarda senha, token ou link.
-- - admin_painel(): numeros + todas as contas (cadastro, ultimo acesso,
--   e-mail confirmado, bloqueio, perfil completo, CONTAGENS de uso). Nenhum
--   dado de paciente sai daqui: so quantidades.
-- - admin_definir_status(): liberar / recusar / voltar para analise, com
--   motivo opcional e registro. Ninguem muda o proprio status.
-- - admin_editar_perfil(): corrige nome e telefone da conta.
-- - admin_historico(): o registro, mais recente primeiro.
-- - admin_registrar_acao_servico(): so a Edge Function admin-usuarios
--   (service_role) chama, depois de trocar senha/e-mail/bloqueio no Auth;
--   confere de novo que quem pediu e administrador.
-- Todas recusam quem nao e administrador (42501): esconder a tela nao e a
-- protecao.
-- =====================================================================

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

-- 2. painel: numeros + contas (so contagens de uso; nada de paciente)
create or replace function public.admin_painel()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_contas jsonb; v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if not public.eh_administrador() then
    raise exception 'apenas administradores' using errcode = '42501';
  end if;
  with us as (
    select u.id, u.email::text as email, u.created_at, coalesce(u.raw_user_meta_data, '{}'::jsonb) as meta,
           nullif(to_jsonb(u) ->> 'email_confirmed_at', '')::timestamptz as confirmado,
           nullif(to_jsonb(u) ->> 'last_sign_in_at', '')::timestamptz as ultimo,
           nullif(to_jsonb(u) ->> 'banned_until', '')::timestamptz as banido
      from auth.users u),
  pa as (select nutritionist_id n, count(*) c, max(created_at) m from public.patients group by 1),
  en as (select nutritionist_id n, count(*) c, max(created_at) m from public.encounters group by 1),
  hs as (select nutritionist_id n, count(*) c, max(created_at) m from public.holoscan_applications group by 1),
  rh as (select nutritionist_id n, count(*) filter (where superseded_at is null) c, max(created_at) m from public.holos_results group by 1),
  im as (select nutritionist_id n, array_agg(distinct tipo) t from public.professional_assets group by 1)
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', us.id, 'email', us.email, 'nome', p.nome, 'telefone', p.telefone,
           'status', coalesce(p.status, 'pendente'), 'criado_em', us.created_at,
           'aprovado_em', p.aprovado_em, 'aprovado_por', ap.nome,
           'email_confirmado_em', us.confirmado, 'ultimo_acesso', us.ultimo,
           'bloqueado', us.banido is not null and us.banido > now(), 'bloqueado_ate', us.banido,
           'precisa_trocar_senha', coalesce(us.meta ->> 'precisa_trocar_senha', '') = 'true',
           'admin', exists (select 1 from public.administradores a where a.user_id = us.id),
           'perfil', jsonb_build_object('profissao', p.profissao, 'registro', p.registro, 'especialidade', p.especialidade,
                     'cidade', p.cidade, 'instagram', p.instagram,
                     'foto', coalesce('foto' = any(im.t), false), 'logo', coalesce('logo' = any(im.t), false),
                     'assinatura', coalesce('assinatura' = any(im.t), false), 'carimbo', coalesce('carimbo' = any(im.t), false)),
           'completude', (case when nullif(trim(p.nome), '') is not null then 1 else 0 end
                        + case when nullif(trim(p.telefone), '') is not null then 1 else 0 end
                        + case when nullif(trim(p.profissao), '') is not null then 1 else 0 end
                        + case when nullif(trim(p.registro), '') is not null then 1 else 0 end
                        + case when nullif(trim(p.especialidade), '') is not null then 1 else 0 end
                        + case when nullif(trim(p.cidade), '') is not null then 1 else 0 end
                        + case when 'foto' = any(im.t) then 1 else 0 end + case when 'logo' = any(im.t) then 1 else 0 end
                        + case when 'assinatura' = any(im.t) then 1 else 0 end + case when 'carimbo' = any(im.t) then 1 else 0 end) * 10,
           'uso', jsonb_build_object('pacientes', coalesce(pa.c, 0), 'atendimentos', coalesce(en.c, 0),
                     'holoscans', coalesce(hs.c, 0), 'resultados', coalesce(rh.c, 0),
                     'ultima_atividade', nullif(greatest(coalesce(pa.m, '-infinity'), coalesce(en.m, '-infinity'),
                                                          coalesce(hs.m, '-infinity'), coalesce(rh.m, '-infinity')), '-infinity'::timestamptz))
         ) order by us.created_at desc), '[]'::jsonb)
    into v_contas
    from us
    left join public.profiles p on p.id = us.id
    left join public.profiles ap on ap.id = p.aprovado_por
    left join pa on pa.n = us.id left join en on en.n = us.id left join hs on hs.n = us.id
    left join rh on rh.n = us.id left join im on im.n = us.id;
  return jsonb_build_object(
    'gerado_em', now(),
    'resumo', (select jsonb_build_object(
        'total', count(*),
        'pendentes', count(*) filter (where c ->> 'status' = 'pendente'),
        'ativos', count(*) filter (where c ->> 'status' = 'ativo'),
        'recusados', count(*) filter (where c ->> 'status' = 'recusado'),
        'bloqueados', count(*) filter (where (c ->> 'bloqueado')::boolean),
        'cadastros_hoje', count(*) filter (where ((c ->> 'criado_em')::timestamptz at time zone 'America/Sao_Paulo')::date = v_hoje),
        'cadastros_7d', count(*) filter (where (c ->> 'criado_em')::timestamptz > now() - interval '7 days'),
        'cadastros_30d', count(*) filter (where (c ->> 'criado_em')::timestamptz > now() - interval '30 days'),
        'acessaram_7d', count(*) filter (where (c ->> 'ultimo_acesso')::timestamptz > now() - interval '7 days'),
        'nunca_acessaram', count(*) filter (where c ->> 'ultimo_acesso' is null),
        'pacientes', coalesce(sum((c -> 'uso' ->> 'pacientes')::int), 0),
        'atendimentos', coalesce(sum((c -> 'uso' ->> 'atendimentos')::int), 0),
        'holoscans', coalesce(sum((c -> 'uso' ->> 'holoscans')::int), 0),
        'resultados', coalesce(sum((c -> 'uso' ->> 'resultados')::int), 0))
      from jsonb_array_elements(v_contas) c),
    'contas', v_contas);
end;
$$;

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
