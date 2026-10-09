-- Harness PROXIMOS PASSOS HOLOS (migration 20261012100000), parte PRE: roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh, ANTES da migration. Guarda as digitais de tudo que a migration e o motor nao podem
-- tocar: metodologia (HOLOS-V1@2 inteiro), HOLOSCAN (aplicacoes, scores, respostas), ferramentas, Resultado HOLOS,
-- condutas, laboratorio historico, Leituras Integradas e documentos.
reset role;
create temp table _pp (k text primary key, v text) on commit drop;
grant insert, select, update on _pp to authenticated;
create temp table _logpp (passo text) on commit drop;
grant insert, select on _logpp to authenticated;
create or replace function pg_temp.pp_md5(sql text) returns text language plpgsql as $$
declare r text;
begin
  execute 'select md5(coalesce(string_agg(x::text, '';'' order by x::text), '''')) from (' || sql || ') q(x)' into r;
  return r;
end $$;
create or replace function pg_temp.pp_digitais() returns jsonb language sql as $$
  select jsonb_build_object(
    'metodologia', pg_temp.pp_md5('select to_jsonb(t) from public.methodology_packages t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_questions t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_associations t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_systems t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_ranges t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_scales t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_rules t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.methodology_package_approvals t'),
    'holoscan', pg_temp.pp_md5('select to_jsonb(t) from public.holoscan_applications t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.holoscan_system_scores t')
      || pg_temp.pp_md5('select to_jsonb(t) from public.holoscan_answers t'),
    'ferramentas', pg_temp.pp_md5('select to_jsonb(t) from public.tool_applications t'),
    'resultado_holos', pg_temp.pp_md5('select to_jsonb(t) from public.holos_results t'),
    'condutas', pg_temp.pp_md5('select to_jsonb(t) from public.conducts t'),
    'laboratorio', pg_temp.pp_md5('select to_jsonb(t) from public.lab_collections t') || pg_temp.pp_md5('select to_jsonb(t) from public.lab_results t'),
    'li', pg_temp.pp_md5('select to_jsonb(t) from public.integrated_readings t'),
    'documentos', pg_temp.pp_md5('select to_jsonb(t) from public.documents t'));
$$;
grant execute on all functions in schema pg_temp to authenticated;
insert into _pp values ('pre', pg_temp.pp_digitais()::text);
