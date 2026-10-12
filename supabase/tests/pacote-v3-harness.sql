-- Harness HOLOS-V1 v3 (revisao das perguntas, 12/10): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), depois de supabase/tests/pacote-v3-doc.sql (o v3 gerado por scripts/pacote-v3.mjs em _pacote_v3).
-- Prova, com as regras REAIS do banco (RLS, gatilhos de imutabilidade, validador SQL, RPCs de aprovacao e de gravacao):
--   PV01 a dona do pacote grava o v3 em_revisao (82 perguntas) pela API, como a tela de Homologacao faz
--   PV02 validador SQL sem erros; hash do servidor calculado
--   PV03 Aprovacao (Daniel) + aprovar: v3 aprovado e vigente; o v2 continua intacto (hash)
--   PV04 HOLOSCAN novo no v3: aceito; Acido Inflamatorio sobre 14, Mental sobre 24; Proximos Passos registrados
--   PV05 resposta para pergunta que saiu (SNT-209) e recusada no v3
--   PV06 v2 retirado pela dona: HOLOSCAN novo no v2 recusado
--   PV07 v3 aprovado e imutavel (texto nao muda sem versao nova)
--   PV08 aplicacoes antigas do v2, de todas as contas, identicas
-- Nada persiste.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _pv (k text primary key, v text) on commit drop;
create temp table _logpv (n serial, passo text) on commit drop;
grant select, insert, update on _pv, _logpv to authenticated;
grant usage on sequence _logpv_n_seq to authenticated;
insert into _pv values
  -- a versao vigente ANTES (no banco real, o v2; neste banco local de teste pode haver fixtures com outros numeros)
  ('v2', (select id::text from public.methodology_packages where code = 'HOLOS-V1' and status = 'aprovado' and effective_from <= current_date order by version desc limit 1)),
  ('v2_hash', (select content_hash from public.methodology_packages where code = 'HOLOS-V1' and status = 'aprovado' and effective_from <= current_date order by version desc limit 1)),
  ('apps_v2', (select coalesce(md5(string_agg(a.id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '') from public.holoscan_applications a
     where a.methodology_package_id = (select id from public.methodology_packages where code = 'HOLOS-V1' and status = 'aprovado' and effective_from <= current_date order by version desc limit 1)));
grant execute on all functions in schema pg_temp to authenticated;

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare v3 uuid; n int;
begin
  -- no banco real o numero e 3 (so existe o v2); aqui usa o proximo livre da dona (fixtures de outros harnesses)
  v3 := pg_temp.gravar_pacote(jsonb_set((select doc from _pacote_v3), '{version}', to_jsonb(coalesce((select max(version) from public.methodology_packages where code = 'HOLOS-V1' and nutritionist_id = auth.uid()), 2) + 1)));
  insert into _pv values ('v3', v3::text);
  select count(*) into n from public.methodology_questions where package_id = v3;
  insert into _logpv (passo) select 'PV01 ' || case when (select status from public.methodology_packages where id = v3) = 'em_revisao' and n = 82
      and (select count(*) from public.methodology_associations where package_id = v3 and destination_type = 'system' and role = 'primaria') = 82
      and exists (select 1 from public.methodology_associations where package_id = v3 and question_stable_id = 'ESP-404' and role = 'primaria' and destination_id = 'mental_emocional_espiritual')
      and not exists (select 1 from public.methodology_questions where package_id = v3 and stable_id in ('SNT-209', 'ESP-102', 'SNT-106', 'SNT-410', 'SNT-507'))
    then 'ok' else 'FALHOU (' || n || ')' end || ': a dona grava o v3 em_revisao pela API (82 perguntas, ESP-404 no Mental, removidas e trocadas fora)';
end $$;

do $$
declare v3 uuid := (select v::uuid from _pv where k = 'v3'); val jsonb; h text;
begin
  val := public.validar_pacote_metodologico(v3);
  h := public.metodologia_hash_conteudo(v3);
  insert into _pv values ('v3_hash', h);
  insert into _logpv (passo) select 'PV02 ' || case when coalesce(jsonb_array_length(val->'erros'), 0) = 0 and h is not null
    then 'ok' else 'FALHOU: ' || left(val::text, 300) end || ': validador SQL sem erros; hash do servidor calculado';
end $$;

do $$
declare v3 uuid := (select v::uuid from _pv where k = 'v3');
begin
  perform public.registrar_aprovacao_metodologica(v3, 1, 'Daniel', 'revisao das perguntas conferida (harness)', (select v from _pv where k = 'v3_hash'));
  perform public.aprovar_pacote_metodologico(v3, jsonb_build_object('effective_from', current_date));
  insert into _logpv (passo) select 'PV03 ' || case when (select status = 'aprovado' and effective_from = current_date and content_hash = public.metodologia_hash_conteudo(v3) from public.methodology_packages where id = v3)
      and (select content_hash from public.methodology_packages where id = (select v::uuid from _pv where k = 'v2')) = (select v from _pv where k = 'v2_hash')
    then 'ok' else 'FALHOU' end || ': Aprovacao de Daniel + aprovar: v3 aprovado e vigente hoje; o v2 continua com o mesmo hash';
end $$;

do $$
declare v3 uuid := (select v::uuid from _pv where k = 'v3'); p uuid; e uuid; h uuid; reg jsonb; ok_n boolean;
begin
  insert into public.patients (nutritionist_id, nome) values (auth.uid(), 'PV TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (auth.uid(), p, now()) returning id into e;
  insert into _pv values ('p', p::text), ('e', e::text);
  h := public.salvar_holoscan_completo(pg_temp.ho_payload(v3, p, e, current_date));
  reg := public.registrar_proximos_passos(h);
  select (select total_marcadores from public.holoscan_system_scores where application_id = h and sistema = 'acido_inflamatorio') = 14
     and (select total_marcadores from public.holoscan_system_scores where application_id = h and sistema = 'mental_emocional_espiritual') = 24
     and (select count(*) from public.holoscan_answers where application_id = h) = 82 into ok_n;
  insert into _logpv (passo) select 'PV04 ' || case when h is not null and ok_n and (select methodology_package_id from public.holoscan_applications where id = h) = v3
      and jsonb_array_length(reg->'selection') between 1 and 3
    then 'ok' else 'FALHOU' end || ': HOLOSCAN novo no v3 aceito (82 respostas; Acido Inflamatorio sobre 14, Mental sobre 24); Proximos Passos registrados';
end $$;

do $$
declare v3 uuid := (select v::uuid from _pv where k = 'v3'); r text;
begin
  r := pg_temp.ho_tenta(jsonb_set(pg_temp.ho_payload(v3, (select v::uuid from _pv where k = 'p'), (select v::uuid from _pv where k = 'e'), current_date), '{answers,0,marcador_id}', '"SNT-209"'));
  insert into _logpv (passo) select 'PV05 ' || case when r = 'resposta_invalida' then 'ok' else 'FALHOU: ' || r end || ': resposta para pergunta que saiu (SNT-209) recusada no v3';
end $$;

do $$
declare v2 uuid := (select v::uuid from _pv where k = 'v2'); r text;
begin
  perform public.retirar_pacote_metodologico(v2, 'substituido pelo HOLOS-V1 v3 (revisao das perguntas)', 'Daniel');
  r := pg_temp.ho_tenta(pg_temp.ho_payload(v2, (select v::uuid from _pv where k = 'p'), (select v::uuid from _pv where k = 'e'), current_date));
  insert into _logpv (passo) select 'PV06 ' || case when (select status from public.methodology_packages where id = v2) = 'retirado' and r not like 'ACEITO:%'
    then 'ok' else 'FALHOU: ' || r end || ': v2 retirado pela dona; HOLOSCAN novo no v2 recusado (' || r || ')';
end $$;

do $$
declare v3 uuid := (select v::uuid from _pv where k = 'v3'); bloqueado boolean := false;
begin
  begin
    update public.methodology_questions set statement = 'texto alterado' where package_id = v3 and stable_id = 'SNT-101';
  exception when others then bloqueado := true;
  end;
  insert into _logpv (passo) select 'PV07 ' || case when bloqueado and (select statement from public.methodology_questions where package_id = v3 and stable_id = 'SNT-101') <> 'texto alterado'
    then 'ok' else 'FALHOU' end || ': v3 aprovado e imutavel (mudar texto exige versao nova)';
end $$;

reset role;
-- conferido como dono do banco (sem RLS), como a foto do inicio: todas as aplicacoes do v2, de todas as contas
insert into _logpv (passo) select 'PV08 ' || case when (select coalesce(md5(string_agg(a.id::text || a.methodology_content_hash || coalesce(a.indice::text, ''), ',' order by a.id)), '')
    from public.holoscan_applications a where a.methodology_package_id = (select v::uuid from _pv where k = 'v2')) = (select v from _pv where k = 'apps_v2')
  then 'ok' else 'FALHOU' end || ': aplicacoes antigas do v2 (todas as contas) identicas depois do v3 e da retirada';
select passo from _logpv order by n;
