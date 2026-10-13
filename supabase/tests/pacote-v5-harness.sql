-- Harness HOLOS-V1 v5 (Lote 2B, 13/10) — PARTE 2, DEPOIS da migration 20261020100000 (pergunta so contextual).
--   PV5-02 validador SQL: v5 com 0 erros; a v4 no ar continua valida
--   PV5-03 publicacao direta: v5 aprovado hoje (hash do servidor), v4 retirada com auditoria
--   PV5-04 no banco: 80 pontuaveis 11/9/8/10/42; ESP-501/502 so contextuais e fora da Triade; ESP-303 no Metabolico; EMO-502/504 contextuais
--   PV5-05 HOLOSCAN novo na v5 (82 respostas, ESP-501/502 inclusive) aceito com os denominadores novos
--   PV5-06 MR-V1: ESP-501/502 nunca dominantes; as 5 ESP movidas so no MEE
--   PV5-07 contextual recusado com Triade (o contrato continua exigindo: sem primaria => sem Triade)
--   PV5-08 historico: aplicacoes, respostas e notas anteriores identicas
select pg_temp.como_daniel();
set local role authenticated;
do $$
declare v5 uuid := (select v::uuid from _pv5 where k = 'v5'); v4 uuid := (select v::uuid from _pv5 where k = 'v4'); val jsonb; val4 jsonb; d jsonb;
begin
  val := public.validar_pacote_metodologico(v5); val4 := public.validar_pacote_metodologico(v4);
  insert into _logv5 (passo) select 'PV5-02 ' || case when jsonb_array_length(val->'erros') = 0 and jsonb_array_length(val4->'erros') = 0
    then 'ok' else 'FALHOU: ' || left((val->'erros')::text, 300) end || ': validador SQL novo: v5 sem erros; a v4 no ar continua valida';
  d := public.publicar_pacote_metodologico(v5);
  insert into _logv5 (passo) select 'PV5-03 ' || case when (select status = 'aprovado' and governance_regime = 'publicacao_direta' and effective_from = current_date and content_hash = public.metodologia_hash_conteudo(v5) from public.methodology_packages where id = v5)
      and (select status from public.methodology_packages where id = v4) = 'retirado'
      and (select content_hash from public.methodology_packages where id = v4) = (select v from _pv5 where k = 'v4_hash')
      and exists (select 1 from public.methodology_homologation_records r where r.package_id = v4 and r.decision = 'retirado' and r.source = 'publicacao direta')
    then 'ok' else 'FALHOU' end || ': v5 publicada hoje (hash do servidor); v4 retirada com auditoria e com o mesmo hash';
end $$;

do $$
declare v5 uuid := (select v::uuid from _pv5 where k = 'v5'); por text; a501 text; a502 text; a303 text; e502 text; e504 text;
begin
  select string_agg(destination_id || ':' || n, ',' order by destination_id) into por from (select destination_id, count(*) n from public.methodology_associations
    where package_id = v5 and destination_type = 'system' and role = 'primaria' group by 1) x;
  select string_agg(destination_type || ':' || destination_id || ':' || role || ':' || coalesce(weight::text, 'null'), ' ' order by destination_type) into a501 from public.methodology_associations where package_id = v5 and question_stable_id = 'ESP-501';
  select string_agg(destination_type || ':' || destination_id || ':' || role || ':' || coalesce(weight::text, 'null'), ' ' order by destination_type) into a502 from public.methodology_associations where package_id = v5 and question_stable_id = 'ESP-502';
  select string_agg(destination_id || ':' || role, ' ' order by destination_type) into a303 from public.methodology_associations where package_id = v5 and question_stable_id = 'ESP-303';
  select string_agg(destination_id || ':' || role, ' ' order by destination_type, destination_id) into e502 from public.methodology_associations where package_id = v5 and question_stable_id = 'EMO-502' and destination_type = 'system';
  select string_agg(destination_id || ':' || role, ' ' order by destination_type, destination_id) into e504 from public.methodology_associations where package_id = v5 and question_stable_id = 'EMO-504' and destination_type = 'system';
  insert into _logv5 (passo) select 'PV5-04 ' || case when por = 'acido_inflamatorio:9,detox_linfatico:10,fungico:11,mental_emocional_espiritual:42,metabolico:8'
      and (select count(*) from public.methodology_questions where package_id = v5) = 82
      and a501 = 'system:fungico:secondary_contextual:null' and a502 = 'system:detox_linfatico:secondary_contextual:null'
      and a303 = 'metabolico:primaria espiritual:triade_por_bloco'
      and e502 = 'mental_emocional_espiritual:primaria metabolico:secondary_contextual' and e504 = 'mental_emocional_espiritual:primaria metabolico:secondary_contextual'
      and (select count(*) from public.methodology_associations a where a.package_id = v5 and a.role = 'primaria' and a.destination_id = 'mental_emocional_espiritual' and a.weight = 1
             and a.question_stable_id in ('ESP-101','ESP-103','ESP-203','ESP-404','ESP-405')) = 5
    then 'ok' else 'FALHOU (' || coalesce(por,'') || ' | ' || coalesce(a501,'') || ' | ' || coalesce(a502,'') || ')' end || ': no banco 82 perguntas, 80 pontuaveis 11/9/8/10/42; ESP-501/502 so contextuais sem Triade; ESP-303 no Metabolico; EMO-502/504 contextuais; 5 ESP no MEE (peso 1)';
end $$;

do $$
declare v5 uuid := (select v::uuid from _pv5 where k = 'v5'); p uuid; e uuid; h uuid; ok_n boolean;
begin
  insert into public.patients (nutritionist_id, nome) values (auth.uid(), 'PV5 TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (auth.uid(), p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(v5, p, e, current_date));
  insert into _pv5 values ('h5', h::text);
  select (select string_agg(sistema || ':' || total_marcadores, ',' order by sistema) from public.holoscan_system_scores where application_id = h)
       = 'acido_inflamatorio:9,detox_linfatico:10,fungico:11,mental_emocional_espiritual:42,metabolico:8'
     and (select count(*) from public.holoscan_answers where application_id = h and marcador_id in ('ESP-501','ESP-502')) = 2
     and (select count(*) from public.holoscan_answers where application_id = h) = 82 into ok_n;
  insert into _logv5 (passo) select 'PV5-05 ' || case when ok_n and (select methodology_package_id from public.holoscan_applications where id = h) = v5
    then 'ok' else 'FALHOU' end || ': HOLOSCAN novo na v5 aceito (82 respostas com ESP-501/502; denominadores 11/9/8/10/42)';
end $$;

reset role;
-- MR-V1 (funcao interna, chamada como dono). Todas as respostas = 1: na v4, ESP-501 (invertida, contribuicao 2) seria o 1o dominante do Fungico.
insert into _logv5 (passo) select 'PV5-06 ' || case when
    not exists (select 1 from (values ('fungico'), ('acido_inflamatorio'), ('metabolico'), ('detox_linfatico'), ('mental_emocional_espiritual')) s(sis),
      jsonb_array_elements(public.resultado_holos_dominantes((select v::uuid from _pv5 where k = 'h5'), (select v::uuid from _pv5 where k = 'v5'), s.sis)) d
      where d->>'question_id' in ('ESP-501', 'ESP-502')
         or (s.sis <> 'mental_emocional_espiritual' and d->>'question_id' in ('ESP-101','ESP-103','ESP-203','ESP-404','ESP-405')))
    and (select string_agg(d->>'question_id', ',') from jsonb_array_elements(public.resultado_holos_dominantes((select v::uuid from _pv5 where k = 'h5'), (select v::uuid from _pv5 where k = 'v5'), 'mental_emocional_espiritual')) d)
        = 'EMO-507,ESP-101,ESP-102'
    and (select string_agg(d->>'question_id', ',') from jsonb_array_elements(public.resultado_holos_dominantes((select v::uuid from _pv5 where k = 'h5'), (select v::uuid from _pv5 where k = 'v5'), 'fungico')) d) not like '%ESP%'
  then 'ok' else 'FALHOU' end || ': MR-V1 na v5: ESP-501/502 nunca dominantes; as 5 ESP movidas so no MEE (MEE: EMO-507, ESP-101, ESP-102)';

-- contrato: pergunta sem primaria com eixo da Triade continua recusada (copia em rascunho, so para validar)
select pg_temp.como_daniel();
set local role authenticated;
do $$
declare d jsonb := (select doc from _pacote_v5); x uuid; val jsonb;
begin
  d := jsonb_set(d, '{version}', to_jsonb((select max(version) + 1 from public.methodology_packages where code = 'HOLOS-V1' and nutritionist_id = auth.uid())));
  d := jsonb_set(d, '{associacoes}', (d->'associacoes') || jsonb_build_array(jsonb_build_object('question_stable_id', 'ESP-501', 'destination_type', 'triad', 'destination_id', 'espiritual', 'role', 'triade_por_bloco', 'weight', 1, 'status', 'aprovado', 'source', 'harness')));
  x := pg_temp.gravar_pacote(d);
  val := public.validar_pacote_metodologico(x);
  insert into _logv5 (passo) select 'PV5-07 ' || case when exists (select 1 from jsonb_array_elements(val->'erros') e where e->>'codigo' = 'primaria_ausente' and e->>'onde' = 'ESP-501')
    then 'ok' else 'FALHOU: ' || left(val::text, 200) end || ': pergunta sem primaria e com Triade continua recusada pelo validador SQL';
end $$;

reset role;
insert into _logv5 (passo) select 'PV5-08 ' || case when
    (select coalesce(md5(string_agg(a.id::text || a.methodology_package_id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a
      where a.id <> (select v::uuid from _pv5 where k = 'h5')) = (select v from _pv5 where k = 'apps')
    and (select coalesce(md5(string_agg(x.application_id::text || x.marcador_id || coalesce(x.valor::text, ''), ',' order by x.application_id, x.marcador_id)), '') from public.holoscan_answers x
      where x.application_id <> (select v::uuid from _pv5 where k = 'h5')) = (select v from _pv5 where k = 'respostas')
    and (select coalesce(md5(string_agg(x.application_id::text || x.sistema || coalesce(x.nota::text, '') || x.total_marcadores, ',' order by x.application_id, x.sistema)), '') from public.holoscan_system_scores x
      where x.application_id <> (select v::uuid from _pv5 where k = 'h5')) = (select v from _pv5 where k = 'notas')
  then 'ok' else 'FALHOU' end || ': historico (aplicacoes, respostas e notas de todas as contas) identico depois da migration e da v5';
select passo from _logv5 order by n;
