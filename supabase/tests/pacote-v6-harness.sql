-- Harness HOLOS-V1 v6 (fechamento das 61, 13/10). Sem migration nova. Roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh, depois do pacote-v5-harness.sql (v5 no ar).
--   PV6-00 v5 no ar, sem rascunho pendente (o do PV5-07 e desfeito la); impressao digital do historico
--   PV6-01 v6 gravada em_revisao sobre a v5; validador SQL: 0 erros
--   PV6-02 publicacao direta: v6 aprovado hoje (hash do servidor), v5 retirada com auditoria e mesmo hash
--   PV6-03 no banco: 81 perguntas, 69 pontuaveis 8/8/7/6/40, SNT-110 fora, 12 so contextuais sem Triade, Triade 36/19/14
--   PV6-04 HOLOSCAN novo na v6 (81 respostas) aceito com os denominadores novos
--   PV6-05 MR-V1: contextual nunca dominante; SNT-507 (invertida) dominante do Metabolico; SNT-404 no Fungico
--   PV6-06 snapshot: SNT-104/105/109 em "contexto" do Fungico e nao em "pontuou"
--   PV6-07 historico: aplicacoes, respostas e notas anteriores identicas (inclui a aplicacao da v5)
reset role;
create temp table _pv6 (k text primary key, v text) on commit drop;
create temp table _logv6 (n serial, passo text) on commit drop;
grant select, insert, update on _pv6, _logv6 to authenticated;
grant usage on sequence _logv6_n_seq to authenticated;
insert into _pv6 values ('apps', (select coalesce(md5(string_agg(a.id::text || a.methodology_package_id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a)),
  ('respostas', (select coalesce(md5(string_agg(x.application_id::text || x.marcador_id || coalesce(x.valor::text, ''), ',' order by x.application_id, x.marcador_id)), '') from public.holoscan_answers x)),
  ('notas', (select coalesce(md5(string_agg(x.application_id::text || x.sistema || coalesce(x.nota::text, '') || x.total_marcadores, ',' order by x.application_id, x.sistema)), '') from public.holoscan_system_scores x)),
  ('v5', (select v from _pv5 where k = 'v5')),
  ('v5_hash', (select content_hash from public.methodology_packages where id = (select v::uuid from _pv5 where k = 'v5')));
insert into _logv6 (passo) select 'PV6-00 ' || case when not exists (select 1 from public.methodology_packages p where p.code = 'HOLOS-V1' and p.status = 'em_revisao'
      and p.nutritionist_id = (select nutritionist_id from public.methodology_packages where id = (select v::uuid from _pv6 where k = 'v5'))
      and p.version > (select version from public.methodology_packages where id = (select v::uuid from _pv6 where k = 'v5')))
    and (select status from public.methodology_packages where id = (select v::uuid from _pv6 where k = 'v5')) = 'aprovado'
  then 'ok' else 'FALHOU: ' || (select string_agg(version || ':' || status || ':' || left(nutritionist_id::text, 4), ',') from public.methodology_packages where code = 'HOLOS-V1') end || ': v5 no ar, sem rascunho de versao posterior pendente (o do PV5-07 foi desfeito); impressao digital do historico registrada';

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare v5 uuid := (select v::uuid from _pv6 where k = 'v5'); v6 uuid; val jsonb; d jsonb;
begin
  v6 := pg_temp.gravar_pacote(jsonb_set((select doc from _pacote_v6), '{version}', to_jsonb((select version + 1 from public.methodology_packages where id = v5))));
  insert into _pv6 values ('v6', v6::text);
  val := public.validar_pacote_metodologico(v6);
  insert into _logv6 (passo) select 'PV6-01 ' || case when jsonb_array_length(val->'erros') = 0 and (select status from public.methodology_packages where id = v6) = 'em_revisao'
    then 'ok' else 'FALHOU: ' || left((val->'erros')::text, 300) end || ': v6 gravada em_revisao sobre a v5; validador SQL sem erros';
  d := public.publicar_pacote_metodologico(v6);
  insert into _logv6 (passo) select 'PV6-02 ' || case when (select status = 'aprovado' and governance_regime = 'publicacao_direta' and effective_from = current_date and content_hash = public.metodologia_hash_conteudo(v6) from public.methodology_packages where id = v6)
      and (select status from public.methodology_packages where id = v5) = 'retirado'
      and (select content_hash from public.methodology_packages where id = v5) = (select v from _pv6 where k = 'v5_hash')
      and exists (select 1 from public.methodology_homologation_records r where r.package_id = v5 and r.decision = 'retirado' and r.source = 'publicacao direta')
    then 'ok' else 'FALHOU' end || ': v6 publicada hoje (hash do servidor); v5 retirada com auditoria e com o mesmo hash';
end $$;

do $$
declare v6 uuid := (select v::uuid from _pv6 where k = 'v6'); por text; tri text; ctx text; a404 text; a501 text;
begin
  select string_agg(destination_id || ':' || n, ',' order by destination_id) into por from (select destination_id, count(*) n from public.methodology_associations
    where package_id = v6 and destination_type = 'system' and role = 'primaria' group by 1) x;
  select string_agg(destination_id || ':' || n, ',' order by destination_id) into tri from (select destination_id, count(*) n from public.methodology_associations
    where package_id = v6 and destination_type = 'triad' group by 1) x;
  select string_agg(q.stable_id, ',' order by q.stable_id) into ctx from public.methodology_questions q where q.package_id = v6
    and not exists (select 1 from public.methodology_associations a where a.package_id = v6 and a.question_stable_id = q.stable_id and (a.role = 'primaria' or a.destination_type = 'triad'));
  select string_agg(destination_id || ':' || role, ' ' order by destination_type) into a404 from public.methodology_associations where package_id = v6 and question_stable_id = 'SNT-404';
  select string_agg(destination_id || ':' || role, ' ' order by destination_type) into a501 from public.methodology_associations where package_id = v6 and question_stable_id = 'SNT-501';
  insert into _logv6 (passo) select 'PV6-03 ' || case when por = 'acido_inflamatorio:8,detox_linfatico:6,fungico:8,mental_emocional_espiritual:40,metabolico:7'
      and tri = 'espiritual:14,fisico:36,mental:19'
      and (select count(*) from public.methodology_questions where package_id = v6) = 81
      and not exists (select 1 from public.methodology_questions where package_id = v6 and stable_id = 'SNT-110')
      and ctx = 'ESP-501,ESP-502,SNT-104,SNT-105,SNT-109,SNT-206,SNT-305,SNT-306,SNT-308,SNT-408,SNT-409,SNT-410'
      and a404 = 'fungico:primaria fisico:triade_por_bloco' and a501 = 'metabolico:primaria fisico:triade_por_bloco'
      and (select public_text from public.methodology_systems where package_id = v6 and code = 'metabolico') not ilike '%laborat%'
      and (select count(*) from public.methodology_systems where package_id = v6 and public_text ~* '(laborat|composi|\mpele\M)') = 0
    then 'ok' else 'FALHOU (' || coalesce(por,'') || ' | ' || coalesce(tri,'') || ' | ' || coalesce(ctx,'') || ')' end || ': no banco 81 perguntas, 69 pontuaveis 8/8/7/6/40, Triade 36/19/14, SNT-110 fora, 12 so contextuais, SNT-404 no Fungico, SNT-501 no Metabolico; textos oficiais sem exames/pele/composicao';
end $$;

do $$
declare v6 uuid := (select v::uuid from _pv6 where k = 'v6'); p uuid; e uuid; h uuid; ok_n boolean;
begin
  insert into public.patients (nutritionist_id, nome) values (auth.uid(), 'PV6 TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (auth.uid(), p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(v6, p, e, current_date));
  insert into _pv6 values ('h6', h::text);
  select (select string_agg(sistema || ':' || total_marcadores, ',' order by sistema) from public.holoscan_system_scores where application_id = h)
       = 'acido_inflamatorio:8,detox_linfatico:6,fungico:8,mental_emocional_espiritual:40,metabolico:7'
     and (select count(*) from public.holoscan_answers where application_id = h) = 81 into ok_n;
  insert into _logv6 (passo) select 'PV6-04 ' || case when ok_n and (select methodology_package_id from public.holoscan_applications where id = h) = v6
    then 'ok' else 'FALHOU' end || ': HOLOSCAN novo na v6 aceito (81 respostas; denominadores 8/8/7/6/40)';
end $$;

reset role;
-- MR-V1 (funcoes internas, chamadas como dono). Todas as respostas = 1 (ho_payload): as invertidas contribuem 2.
insert into _logv6 (passo) select 'PV6-05 ' || case when
    not exists (select 1 from (values ('fungico'), ('acido_inflamatorio'), ('metabolico'), ('detox_linfatico'), ('mental_emocional_espiritual')) s(sis),
      jsonb_array_elements(public.resultado_holos_dominantes((select v::uuid from _pv6 where k = 'h6'), (select v::uuid from _pv6 where k = 'v6'), s.sis)) d
      where d->>'question_id' in ('SNT-104','SNT-105','SNT-109','SNT-206','SNT-305','SNT-306','SNT-308','SNT-408','SNT-409','SNT-410','ESP-501','ESP-502','SNT-110'))
    and (select d->>'question_id' from jsonb_array_elements(public.resultado_holos_dominantes((select v::uuid from _pv6 where k = 'h6'), (select v::uuid from _pv6 where k = 'v6'), 'metabolico')) d limit 1) = 'SNT-507'
    and (select count(*) from jsonb_array_elements(public.resultado_holos_sistemas((select v::uuid from _pv6 where k = 'h6'), (select v::uuid from _pv6 where k = 'v6'))) s, jsonb_array_elements(s->'pontuou') x
         where s->>'sistema' = 'fungico' and x->>'question_id' = 'SNT-404') = 1
  then 'ok' else 'FALHOU' end || ': MR-V1 na v6: nenhuma contextual dominante; SNT-507 (invertida) 1o dominante do Metabolico; SNT-404 pontua no Fungico';

insert into _logv6 (passo) select 'PV6-06 ' || case when
    (select string_agg(x->>'question_id', ',' order by x->>'question_id') from jsonb_array_elements(public.resultado_holos_sistemas((select v::uuid from _pv6 where k = 'h6'), (select v::uuid from _pv6 where k = 'v6'))) s, jsonb_array_elements(s->'contexto') x
      where s->>'sistema' = 'fungico') = 'ESP-501,SNT-104,SNT-105,SNT-109'
    and not exists (select 1 from jsonb_array_elements(public.resultado_holos_sistemas((select v::uuid from _pv6 where k = 'h6'), (select v::uuid from _pv6 where k = 'v6'))) s, jsonb_array_elements(s->'pontuou') x
      where x->>'question_id' in ('SNT-104','SNT-105','SNT-109','SNT-206','SNT-305','SNT-306','SNT-308','SNT-408','SNT-409','SNT-410'))
  then 'ok' else 'FALHOU' end || ': snapshot: SNT-104/105/109 e ESP-501 em "contexto, sem pontuar" do Fungico; nenhuma contextual em "pontuou"';

insert into _logv6 (passo) select 'PV6-07 ' || case when
    (select coalesce(md5(string_agg(a.id::text || a.methodology_package_id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a
      where a.id <> (select v::uuid from _pv6 where k = 'h6')) = (select v from _pv6 where k = 'apps')
    and (select coalesce(md5(string_agg(x.application_id::text || x.marcador_id || coalesce(x.valor::text, ''), ',' order by x.application_id, x.marcador_id)), '') from public.holoscan_answers x
      where x.application_id <> (select v::uuid from _pv6 where k = 'h6')) = (select v from _pv6 where k = 'respostas')
    and (select coalesce(md5(string_agg(x.application_id::text || x.sistema || coalesce(x.nota::text, '') || x.total_marcadores, ',' order by x.application_id, x.sistema)), '') from public.holoscan_system_scores x
      where x.application_id <> (select v::uuid from _pv6 where k = 'h6')) = (select v from _pv6 where k = 'notas')
  then 'ok' else 'FALHOU' end || ': historico (aplicacoes, respostas e notas, inclusive a da v5) identico depois da v6';
select passo from _logv6 order by n;
