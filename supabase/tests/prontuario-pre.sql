-- Harness PRONTUARIO (migration 20261011100000 — exames e documentos so como arquivos), parte PRE: roda DENTRO da transacao
-- do scripts/validar-cadeia-local.sh, ANTES da migration. Guarda:
--   * as digitais de TUDO que a migration nao pode tocar (historico laboratorial, Leituras Integradas, relatorios,
--     documentos, condutas, HOLOSCAN, ferramentas, Resultado HOLOS e metodologia);
--   * o resultado de referencia de um HOLOSCAN gravado e de uma previa do Resultado HOLOS, para provar depois que a
--     mesma entrada da exatamente o mesmo resultado.
reset role;
create temp table _pt (k text primary key, v text) on commit drop;
grant insert, select, update on _pt to authenticated;
create temp table _logpt (passo text) on commit drop;
grant insert, select on _logpt to authenticated;

create or replace function pg_temp.pt_md5(sql text) returns text language plpgsql as $$
declare r text;
begin
  execute 'select md5(coalesce(string_agg(x::text, '';'' order by x::text), '''')) from (' || sql || ') q(x)' into r;
  return r;
end $$;
-- documents: so as colunas que existiam antes (a migration ACRESCENTA colunas; as antigas nao podem mudar)
create or replace function pg_temp.pt_digitais() returns jsonb language sql as $$
  select jsonb_build_object(
    'lab_collections', pg_temp.pt_md5('select to_jsonb(t) from public.lab_collections t'),
    'lab_results', pg_temp.pt_md5('select to_jsonb(t) from public.lab_results t'),
    'lab_result_components', pg_temp.pt_md5('select to_jsonb(t) from public.lab_result_components t'),
    'lab_custom_exams', pg_temp.pt_md5('select to_jsonb(t) from public.lab_custom_exams t'),
    'lab_exam_catalog', pg_temp.pt_md5('select to_jsonb(t) from public.lab_exam_catalog t'),
    'integrated_readings', pg_temp.pt_md5('select to_jsonb(t) from public.integrated_readings t'),
    'li_pacotes', pg_temp.pt_md5('select to_jsonb(t) from public.integrated_reading_rule_packages t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.integrated_reading_domains t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.integrated_reading_exam_domain_links t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.integrated_reading_rules t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.integrated_reading_package_approvals t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.integrated_reading_package_snapshots t'),
    'report_emissions', pg_temp.pt_md5('select to_jsonb(t) from public.report_emissions t'),
    'documents', pg_temp.pt_md5('select jsonb_build_object(''id'', id, ''nutritionist_id'', nutritionist_id, ''patient_id'', patient_id, ''nome'', nome, ''tipo'', tipo,
        ''data_documento'', data_documento, ''mime_type'', mime_type, ''tamanho_bytes'', tamanho_bytes, ''storage_path'', storage_path,
        ''origem_local'', origem_local, ''created_at'', created_at, ''updated_at'', updated_at) from public.documents'),
    'storage', pg_temp.pt_md5('select to_jsonb(t) from storage.objects t'),
    'conducts', pg_temp.pt_md5('select to_jsonb(t) from public.conducts t'),
    'agreements', pg_temp.pt_md5('select to_jsonb(t) from public.agreements t'),
    'anamneses', pg_temp.pt_md5('select to_jsonb(t) from public.anamneses t'),
    'holoscan', pg_temp.pt_md5('select to_jsonb(t) from public.holoscan_applications t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.holoscan_system_scores t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.holoscan_answers t'),
    'ferramentas', pg_temp.pt_md5('select to_jsonb(t) from public.tool_applications t'),
    'holos_results', pg_temp.pt_md5('select to_jsonb(t) from public.holos_results t'),
    'metodologia', pg_temp.pt_md5('select to_jsonb(t) from public.methodology_packages t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_questions t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_associations t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_systems t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_ranges t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_scales t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_rules t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_package_approvals t')
      || pg_temp.pt_md5('select to_jsonb(t) from public.methodology_homologation_records t'));
$$;
-- o que um HOLOSCAN gravado "e", sem ids nem datas de gravacao: notas por sistema, Indice, Triada, cobertura e respostas
create or replace function pg_temp.pt_holoscan(app uuid) returns jsonb language sql as $$
  select jsonb_build_object(
    'app', (select to_jsonb(a) - array['id','patient_id','encounter_id','nutritionist_id','created_at','updated_at','operation_id','interpretacao_atualizada_em']
            from public.holoscan_applications a where a.id = app),
    'scores', (select jsonb_agg(to_jsonb(s) - array['id','application_id','nutritionist_id','created_at','updated_at'] order by s.sistema)
               from public.holoscan_system_scores s where s.application_id = app),
    'answers', (select jsonb_agg(to_jsonb(r) - array['id','application_id','nutritionist_id','created_at','updated_at'] order by r.marcador_id)
                from public.holoscan_answers r where r.application_id = app));
$$;
grant execute on all functions in schema pg_temp to authenticated;

-- referencia: um HOLOSCAN novo (mesmo payload que sera repetido depois) e a previa do Resultado HOLOS do paciente A
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); p uuid; e uuid; h uuid; prev jsonb;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'PT TESTE FICTICIO 1') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, p, e, current_date));
  insert into _pt values ('hs_ref', pg_temp.pt_holoscan(h)::text);
  prev := public.previa_resultado_holos(jsonb_build_object('patient_id', (select v from _rh where k = 'pa'), 'encounter_id', (select v from _rh where k = 'ea'),
    'holoscan_application_id', (select v from _rh where k = 'ha'),
    'tool_application_ids', jsonb_build_array((select v from _rh where k = 't_rot'), (select v from _rh where k = 't_gat'), (select v from _rh where k = 't_con')),
    'leitura_profissional', 'texto da nutri', 'pontos_acompanhar', 'sono'));
  insert into _pt values ('rh_ref', prev::text);
end $$;
reset role;
-- digitais tiradas por ULTIMO (depois das referencias acima), imediatamente antes da migration
insert into _pt values ('pre', pg_temp.pt_digitais()::text);
