-- PRE da migration 20261015100000 (Resultado Final HOLOS): roda ANTES da migration, dentro da transacao do
-- scripts/validar-cadeia-local.sh. Guarda as digitais de tudo que a migration NAO pode mudar.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _rf (k text primary key, v text) on commit drop;
grant select, insert, update on _rf to authenticated, anon;
create or replace function pg_temp.rf_digitais() returns jsonb language sql as $$
  select jsonb_build_object(
    'holoscan', (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a),
    'scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s),
    'respostas', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r),
    'ferramentas', (select md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) from public.tool_applications t),
    'pacotes', (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p),
    'perguntas', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_questions x),
    'pesos', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_associations x),
    'faixas', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_ranges x),
    'sistemas', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_systems x),
    'escalas', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_scales x),
    'regras', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_rules x),
    'catalogo', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.holos_recommendation_catalogs x)
      || (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.holos_recommendation_rules x),
    'proximos_passos', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.holos_next_steps x),
    'condutas', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.conducts x));
$$;
-- resultados ja existentes: id -> (status, hash, snapshot) — nenhum pode mudar
create or replace function pg_temp.rf_resultados(p_ids uuid[]) returns text language sql as $$
  select md5(coalesce(string_agg(r.id || '|' || r.status || '|' || coalesce(r.content_hash, '') || '|' || coalesce(r.content_snapshot::text, '') || '|' || r.template_version, ';' order by r.id), ''))
  from public.holos_results r where r.id = any(p_ids);
$$;
grant execute on all functions in schema pg_temp to authenticated;
insert into _rf values ('pre', pg_temp.rf_digitais()::text);
insert into _rf values ('ids', (select coalesce(array_agg(id), '{}')::text from public.holos_results));
insert into _rf values ('res', pg_temp.rf_resultados((select coalesce(array_agg(id), '{}') from public.holos_results)));
