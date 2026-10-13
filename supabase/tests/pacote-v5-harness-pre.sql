-- Harness HOLOS-V1 v5 (Lote 2B, 13/10) — PARTE 1, ANTES da migration 20261020100000 (pergunta so contextual).
-- Roda DENTRO da transacao do scripts/validar-cadeia-local.sh, depois do publicacao-direta-harness.sql.
--   PV5-00 a versao no ar fica com o conteudo da v4 (o "pulo" do harness anterior e publicado: espelha a producao)
--   PV5-01 a v5 e gravada em_revisao; o validador ANTIGO recusa so ESP-501 e ESP-502 (primaria_ausente, triade_ausente) — a migration e necessaria
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _pv5 (k text primary key, v text) on commit drop;
create temp table _logv5 (n serial, passo text) on commit drop;
grant select, insert, update on _pv5, _logv5 to authenticated;
grant usage on sequence _logv5_n_seq to authenticated;
insert into _pv5 values ('apps', (select coalesce(md5(string_agg(a.id::text || a.methodology_package_id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a)),
  ('respostas', (select coalesce(md5(string_agg(x.application_id::text || x.marcador_id || coalesce(x.valor::text, ''), ',' order by x.application_id, x.marcador_id)), '') from public.holoscan_answers x)),
  ('notas', (select coalesce(md5(string_agg(x.application_id::text || x.sistema || coalesce(x.nota::text, '') || x.total_marcadores, ',' order by x.application_id, x.sistema)), '') from public.holoscan_system_scores x));
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare v4 uuid := (select v::uuid from _pd where k = 'pulo'); v5 uuid; val jsonb; cods text;
begin
  perform public.publicar_pacote_metodologico(v4);
  insert into _pv5 values ('v4', v4::text), ('v4_hash', (select content_hash from public.methodology_packages where id = v4));
  insert into _logv5 (passo) select 'PV5-00 ' || case when (select status from public.methodology_packages where id = v4) = 'aprovado'
      and (select count(*) from public.methodology_associations a where a.package_id = v4 and a.destination_type = 'system' and a.role = 'primaria' and a.destination_id = 'mental_emocional_espiritual') = 37
    then 'ok' else 'FALHOU' end || ': versao no ar com o conteudo da v4 (MEE 37), como em producao';
  v5 := pg_temp.gravar_pacote(jsonb_set((select doc from _pacote_v5), '{version}', to_jsonb((select version + 1 from public.methodology_packages where id = v4))));
  insert into _pv5 values ('v5', v5::text);
  val := public.validar_pacote_metodologico(v5);
  select string_agg(e->>'codigo' || ':' || (e->>'onde'), ',' order by e->>'onde') into cods from jsonb_array_elements(val->'erros') e;
  insert into _logv5 (passo) select 'PV5-01 ' || case when cods = 'primaria_ausente:ESP-501,triade_ausente:ESP-501,primaria_ausente:ESP-502,triade_ausente:ESP-502'
    then 'ok' else 'FALHOU: ' || coalesce(cods, 'sem erros') end || ': v5 gravada em_revisao; o validador antigo recusa so ESP-501/502, sem primaria e sem Triade (a migration da pergunta so contextual e necessaria)';
end $$;
reset role;
