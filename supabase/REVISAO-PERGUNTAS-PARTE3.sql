-- =====================================================================
-- REVISAO DAS PERGUNTAS — PARTE 3 de 3 — rodar INTEIRA no SQL Editor (uma transacao).
-- Abre a revisao das 84 perguntas do HOLOS-V1 v2 (prazo de 15 dias), registra a migration e confere tudo.
-- Rode NA ORDEM (1, 2, 3). Se uma parte der erro, nada dela e aplicado: rode de novo a MESMA parte.
-- Conteudo identico a supabase/migrations/20261010100000_revisao_perguntas.sql (dividido so para caber no editor).
-- Nao toca em paciente, HOLOSCAN, nem no pacote metodologico.
-- =====================================================================
begin;
set local lock_timeout = '10s';
set local statement_timeout = '60s';

do $$ begin
  if to_regprocedure('public.revisao_perguntas_concluir(text)') is null then raise exception 'rode a PARTE 2 antes'; end if;
end $$;
-- ABRIR uma revisao (so pelo dono do banco, no SQL Editor; sem acesso pela API):
-- copia as perguntas do pacote APROVADO, com o sistema principal e a escala de respostas.
create or replace function public.revisao_perguntas_abrir(p_code text, p_version integer, p_dias integer default 15)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_pk record; v_id uuid; v_n int;
begin
  select m.id, m.code, m.version into v_pk from public.methodology_packages m
   where m.code = p_code and m.version = p_version and m.status = 'aprovado';
  if not found then raise exception 'pacote % v% aprovado nao encontrado', p_code, p_version using errcode = 'P0001'; end if;
  if exists (select 1 from public.revisoes_perguntas where status = 'aberta') then
    raise exception 'ja existe uma revisao aberta (conclua ou cancele antes)' using errcode = 'P0001';
  end if;
  if p_dias is null or p_dias < 1 or p_dias > 60 then raise exception 'prazo entre 1 e 60 dias' using errcode = '22023'; end if;
  insert into public.revisoes_perguntas (package_id, package_code, package_version, titulo, expira_em)
  values (v_pk.id, v_pk.code, v_pk.version, 'Revisão das perguntas do HOLOSCAN (' || v_pk.code || ' v' || v_pk.version || ')', now() + make_interval(days => p_dias))
  returning id into v_id;
  insert into public.revisoes_perguntas_itens (revisao_id, stable_id, posicao, sistema_code, sistema_nome, sistema_ordem, texto_original, respostas)
  select v_id, q.stable_id, q.position, a.destination_id, s.name, s.position, q.statement, coalesce(q.response_labels, '[]'::jsonb)
    from public.methodology_questions q
    left join lateral (select x.destination_id from public.methodology_associations x
                        where x.package_id = q.package_id and x.question_stable_id = q.stable_id and x.role = 'primaria' and x.destination_type = 'system'
                        order by x.destination_id limit 1) a on true
    left join public.methodology_systems s on s.package_id = q.package_id and s.code = a.destination_id
   where q.package_id = v_pk.id;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'o pacote nao tem perguntas' using errcode = 'P0001'; end if;
  return v_id;
end;
$$;
revoke all on function public.revisao_perguntas_abrir(text, integer, integer) from public, anon, authenticated;


-- abre a revisao (so se ainda nao houver uma aberta)
do $$ begin
  if not exists (select 1 from public.revisoes_perguntas where status = 'aberta') then
    perform public.revisao_perguntas_abrir('HOLOS-V1', 2, 15);
  end if;
end $$;

insert into supabase_migrations.schema_migrations (version, name)
values ('20261010100000', 'revisao_perguntas') on conflict (version) do nothing;

do $$
declare n int;
begin
  if (select count(*) from pg_class where oid in ('public.revisoes_perguntas'::regclass, 'public.revisoes_perguntas_itens'::regclass, 'public.revisoes_perguntas_respostas'::regclass) and relrowsecurity) <> 3 then
    raise exception 'POS: RLS desligada em alguma tabela da revisao';
  end if;
  if has_table_privilege('anon', 'public.revisoes_perguntas_respostas', 'select') or has_table_privilege('anon', 'public.revisoes_perguntas', 'select')
     or has_table_privilege('authenticated', 'public.revisoes_perguntas_respostas', 'insert') then raise exception 'POS: tabela acessivel pela API'; end if;
  if has_function_privilege('anon', 'public.revisao_perguntas_abrir(text, integer, integer)', 'execute') then raise exception 'POS: abrir revisao acessivel pela API'; end if;
  select count(*) into n from public.revisoes_perguntas_itens i join public.revisoes_perguntas r on r.id = i.revisao_id where r.status = 'aberta';
  if n <> 84 then raise exception 'POS: esperadas 84 perguntas na revisao aberta, encontradas %', n; end if;
end $$;
commit;

select 'revisao aberta' as item, (select count(*)::text from public.revisoes_perguntas where status = 'aberta') as valor
union all select 'perguntas', (select count(*)::text from public.revisoes_perguntas_itens i join public.revisoes_perguntas r on r.id = i.revisao_id where r.status = 'aberta')
union all select 'prazo ate', (select to_char(expira_em at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') from public.revisoes_perguntas where status = 'aberta')
union all select 'decisoes registradas', (select count(*)::text from public.revisoes_perguntas_respostas)
union all select 'migration registrada', (select count(*)::text from supabase_migrations.schema_migrations where version = '20261010100000');
