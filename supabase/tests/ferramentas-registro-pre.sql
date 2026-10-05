-- Harness ETAPA 6.5 (B) — registros clinicos estruturados (migration 20261005110000), parte PRE: roda DENTRO da transacao
-- do scripts/validar-cadeia-local.sh, ANTES da migration. Guarda as digitais do que a migration NAO pode tocar: as aplicacoes
-- de ferramenta que ja existem, as aplicacoes HOLOSCAN (com scores e respostas), os pacotes metodologicos e a Leitura Integrada.
reset role;
create temp table _fr (k text primary key, v text) on commit drop;
grant insert, select, update on _fr to authenticated;
create temp table _logfr (passo text) on commit drop;
grant insert, select on _logfr to authenticated;
insert into _fr
select 'tools', md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) from public.tool_applications t
union all select 'n_tools', count(*)::text from public.tool_applications
union all select 'holoscan', md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a
union all select 'scores', md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s
union all select 'answers', md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r
union all select 'pacotes', md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p
union all select 'li', md5(coalesce(string_agg(to_jsonb(l)::text, ';' order by l.id), '')) from public.integrated_reading_rule_packages l
union all select 'readings', md5(coalesce(string_agg(to_jsonb(i)::text, ';' order by i.id), '')) from public.integrated_readings i;
