-- Harness RESULTADO HOLOS (migration 20261009100000), parte PRE: roda DENTRO da transacao do scripts/validar-cadeia-local.sh,
-- ANTES da migration. Guarda as digitais do que o Resultado HOLOS NAO pode tocar: HOLOSCAN (aplicacoes, notas, respostas),
-- ferramentas, Leitura Integrada, exames e pacotes metodologicos.
reset role;
create temp table _rh (k text primary key, v text) on commit drop;
grant insert, select, update on _rh to authenticated;
create temp table _logrh (passo text) on commit drop;
grant insert, select on _logrh to authenticated;
create or replace function pg_temp.rh_digitais() returns jsonb language sql as $$
  select jsonb_build_object(
    'holoscan', (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a),
    'scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s),
    'respostas', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r),
    'ferramentas', (select md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) from public.tool_applications t),
    'li', (select md5(coalesce(string_agg(to_jsonb(l)::text, ';' order by l.id), '')) from public.integrated_readings l),
    'exames', (select md5(coalesce(string_agg(to_jsonb(c)::text, ';' order by c.id), '')) from public.lab_collections c)
      || (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r),
    'pacotes', (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p)
      || (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_associations x)
      || (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_ranges x)
      || (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_rule_packages x));
$$;
grant execute on all functions in schema pg_temp to authenticated;
insert into _rh values ('pre', pg_temp.rh_digitais()::text);
