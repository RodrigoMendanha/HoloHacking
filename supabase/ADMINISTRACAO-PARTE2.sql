-- ADMINISTRACAO (10/10) — PARTE 2 de 4: painel (numeros + contas, so contagens de uso)
-- Rodar INTEIRA e NA ORDEM. Erro = nada aplicado; rode a MESMA parte de novo. Pode repetir sem problema. SOMENTE ADITIVA
-- (nao muda tabela existente nem dado clinico). Identico a supabase/migrations/20261016100000_administracao.sql.
-- A ultima linha antes da conferencia e "commit;".
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';
do $$ begin
  if to_regclass('public.admin_audit_log') is null then raise exception 'rode a PARTE 1 antes (nada foi aplicado)'; end if;
end $$;
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
revoke all on function public.admin_painel() from public, anon, authenticated;
grant execute on function public.admin_painel() to authenticated;
commit;
select 'admin_painel criada' as item, (to_regprocedure('public.admin_painel()') is not null)::text as valor
union all select 'anon pode executar (deve ser false)', has_function_privilege('anon', 'public.admin_painel()', 'execute')::text;
