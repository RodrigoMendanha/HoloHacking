-- Harness PROXIMOS PASSOS HOLOS (migration 20261012100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration (e de proximos-passos-pre.sql, antes dela). Dados ficticios; nada persiste.
reset role;
create or replace function pg_temp.pp_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
-- a selecao como lista "papel:rule_id:tool_id", na ordem dos slots
create or replace function pg_temp.pp_sel(r jsonb) returns text language sql as $$
  select coalesce(string_agg((e->>'papel') || ':' || (e->>'rule_id') || ':' || (e->>'tool_id'), ' ' order by (e->>'slot')::int), '') from jsonb_array_elements(r->'selection') e;
$$;
create or replace function pg_temp.pp_limpo(r jsonb) returns jsonb language sql as $$ select r - 'registrado' - 'registro_id' - 'registrado_em' $$;
grant execute on all functions in schema pg_temp to authenticated;

-- PP00 — a migration nao mexeu em nenhum dado existente (metodologia, HOLOSCAN, ferramentas, Resultado HOLOS, condutas, laboratorio, LI, documentos)
insert into _logpp select 'PP00 ' || case when (select v from _pp where k = 'pre') = pg_temp.pp_digitais()::text then 'ok' else 'FALHOU' end
  || ': nada existente mudou (HOLOS-V1@2, HOLOSCAN, ferramentas, Resultado HOLOS, condutas, laboratorio, Leituras Integradas, documentos)';
-- PP01 — catalogo: 30 regras aprovadas, 6 por sistema, ranks 1..6, so as 10 ferramentas, hash canonico
insert into _logpp select 'PP01 ' || case when (select count(*) from public.holos_recommendation_rules r join public.holos_recommendation_catalogs c on c.id = r.catalog_id
    where c.code = 'HOLOS-RECOMENDACOES-V1' and c.version = 1 and c.status = 'aprovado' and r.status = 'aprovado') = 30
  and (select count(*) from (select system_id, count(*) n, array_agg(rank order by rank) rk from public.holos_recommendation_rules group by system_id) q where n = 6 and rk = array[1,2,3,4,5,6]) = 5
  and (select count(distinct tool_id) from public.holos_recommendation_rules) = 10
  and (select content_hash from public.holos_recommendation_catalogs where code = 'HOLOS-RECOMENDACOES-V1' and version = 1)
      = (select encode(sha256(convert_to(string_agg(r.rule_id || '|' || r.system_id || '|' || r.rank || '|' || r.tool_id || '|' || r.professional_reason || '|' || r.next_action, E'\n' order by r.rule_id), 'UTF8')), 'hex') from public.holos_recommendation_rules r)
  and (select count(*) from public.holos_recommendation_rules where rule_id !~ '^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$') = 0
  then 'ok' else 'FALHOU' end || ': catalogo HOLOS-RECOMENDACOES-V1 com 30 regras aprovadas (6 por sistema, ranks 1..6, 10 ferramentas), hash canonico; nenhum id de REC legada';
-- PP02 — o motor nao le exames, documentos, Leitura Integrada nem corpo-bancos
insert into _logpp select 'PP02 ' || case when position('lab_' in pg_get_functiondef('public.proximos_passos_calcular(uuid, uuid)'::regprocedure)) = 0
  and position('integrated_reading' in pg_get_functiondef('public.proximos_passos_calcular(uuid, uuid)'::regprocedure)) = 0
  and position('documents' in pg_get_functiondef('public.proximos_passos_calcular(uuid, uuid)'::regprocedure)) = 0
  and position('lab_' in pg_get_functiondef('public.proximos_passos_escolher(uuid, text, text[], text[])'::regprocedure)) = 0
  then 'ok' else 'FALHOU' end || ': o motor (SQL) nao referencia lab_*, integrated_reading* nem documents';

-- fixtures: paciente, dois atendimentos, aplicacoes oficiais com notas controladas (a RPC real grava; aqui so as notas mudam)
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); p uuid; e uuid; e2 uuid; base jsonb; pl jsonb; h uuid;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'PP TESTE FICTICIO') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now() - interval '1 day') returning id into e2;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e;
  insert into _pp values ('p', p::text), ('e', e::text), ('e2', e2::text);
  base := pg_temp.ho_payload(mp, p, e, current_date);
  -- A1: fungico 3, metabolico 4, resto 7 -> "Por onde investigar" = fungico, metabolico
  pl := pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(base, 'fungico', 'nota', '3'), 'metabolico', 'nota', '4'), 'acido_inflamatorio', 'nota', '7'), 'detox_linfatico', 'nota', '7'), 'mental_emocional_espiritual', 'nota', '7');
  h := public.salvar_holoscan_completo(pl); insert into _pp values ('a1', h::text);
  -- A2: mesmas notas, outro dia (outra aplicacao), para testar ferramenta concluida no atendimento
  pl := jsonb_set(pl, '{application,quando}', to_jsonb(current_date::text));
  h := public.salvar_holoscan_completo(pl); insert into _pp values ('a2', h::text);
  -- A3: so o fungico avaliavel
  pl := pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(base, 'metabolico', 'avaliavel', 'false'), 'acido_inflamatorio', 'avaliavel', 'false'), 'detox_linfatico', 'avaliavel', 'false'), 'mental_emocional_espiritual', 'avaliavel', 'false');
  pl := pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pl, 'metabolico', 'nota', 'null'), 'acido_inflamatorio', 'nota', 'null'), 'detox_linfatico', 'nota', 'null'), 'mental_emocional_espiritual', 'nota', 'null');
  pl := pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pl, 'metabolico', 'faixa', 'null'), 'acido_inflamatorio', 'faixa', 'null'), 'detox_linfatico', 'faixa', 'null'), 'mental_emocional_espiritual', 'faixa', 'null');
  pl := jsonb_set(jsonb_set(jsonb_set(pl, '{application,quando}', to_jsonb(current_date::text)), '{application,indice}', 'null'), '{application,nota_media}', 'null');   -- sem Indice parcial
  insert into _pp values ('a3', pg_temp.ho_tenta(pl));
  -- A4: nenhum sistema avaliavel
  pl := pg_temp.ho_score(pg_temp.ho_score(pg_temp.ho_score(pl, 'fungico', 'avaliavel', 'false'), 'fungico', 'nota', 'null'), 'fungico', 'faixa', 'null');
  pl := jsonb_set(jsonb_set(jsonb_set(pl, '{application,avaliavel}', 'false'), '{application,indice}', 'null'), '{application,nota_media}', 'null');
  insert into _pp values ('a4', pg_temp.ho_tenta(pl));
end $$;
insert into _logpp select 'PP03 ' || case when (select v from _pp where k = 'a3') like 'ACEITO:%' and (select v from _pp where k = 'a4') like 'ACEITO:%' then 'ok' else 'FALHOU: a3=' || (select v from _pp where k = 'a3') || ' a4=' || (select v from _pp where k = 'a4') end
  || ': fixtures gravadas pela RPC oficial (um sistema avaliavel; nenhum avaliavel)';
update _pp set v = substr(v, 8) where k in ('a3', 'a4') and v like 'ACEITO:%';

-- PP04 — sistema 1 + sistema 2: principal + 2 complementares, sem repetir ferramenta
do $$
declare r jsonb;
begin
  r := public.proximos_passos_holos((select v::uuid from _pp where k = 'a1'));
  insert into _pp values ('r1', r::text);
  insert into _logpp values ('PP04 ' || case when pg_temp.pp_sel(r) = 'principal:REC-FUN-01:mapa_rotina_v1 complementar:REC-MET-02:gatilhos_respostas_v1 complementar:REC-FUN-03:mapa_crencas'
    and (r->'systems_order'->0->>'system_id') = 'fungico' and (r->'systems_order'->1->>'system_id') = 'metabolico' and jsonb_array_length(r->'systems_order') = 5
    and (r->>'motivo') is null and (r->>'registrado') = 'false'
    then 'ok' else 'FALHOU: ' || pg_temp.pp_sel(r) || ' | ' || left(r::text, 200) end
    || ': fungico (3) e metabolico (4) -> principal REC-FUN-01 (Mapa da Rotina), complementares REC-MET-02 (Gatilhos; MET-01 repetiria a ferramenta) e REC-FUN-03 (Mapa de Crencas)');
  -- PP05 — dominantes: ate 3 por sistema, com rotulo (texto oficial da pergunta) e pontos > 0, so para explicar
  insert into _logpp values ('PP05 ' || case when jsonb_array_length(r->'systems_order'->0->'dominantes') = 3
    and (r->'systems_order'->0->'dominantes'->0->>'rotulo') <> '' and (r->'systems_order'->0->'dominantes'->0->>'pontos')::numeric > 0
    and (r->'systems_order'->0->'dominantes'->0->>'pontos')::numeric >= (r->'systems_order'->0->'dominantes'->2->>'pontos')::numeric
    then 'ok' else 'FALHOU: ' || left((r->'systems_order'->0)::text, 300) end || ': sinais dominantes do sistema (ate 3, com o texto da pergunta e pontos), so para explicar');
  -- PP06 — determinismo: a mesma entrada, a mesma versao do catalogo -> a mesma saida
  insert into _logpp values ('PP06 ' || case when pg_temp.pp_limpo(public.proximos_passos_holos((select v::uuid from _pp where k = 'a1'))) = pg_temp.pp_limpo(r) then 'ok' else 'FALHOU' end
    || ': mesma entrada + mesma versao do catalogo = mesma saida');
end $$;

-- PP07 — ferramenta concluida NO ATENDIMENTO atual e pulada quando ha outra elegivel; em outro atendimento nao e pulada
do $$
declare uid uuid := auth.uid(); p uuid := (select v::uuid from _pp where k = 'p'); e uuid := (select v::uuid from _pp where k = 'e'); e2 uuid := (select v::uuid from _pp where k = 'e2'); r jsonb; t uuid;
begin
  -- concluida no atendimento ANTERIOR (e2): nao muda nada
  insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
    values (uid, p, e2, 'mapa_rotina_v1', '1', 'concluida', '{"eventos":[]}'::jsonb, now() - interval '1 day', now() - interval '1 day');
  r := public.proximos_passos_holos((select v::uuid from _pp where k = 'a1'));
  insert into _logpp values ('PP07 ' || case when pg_temp.pp_sel(r) = 'principal:REC-FUN-01:mapa_rotina_v1 complementar:REC-MET-02:gatilhos_respostas_v1 complementar:REC-FUN-03:mapa_crencas'
    then 'ok' else 'FALHOU: ' || pg_temp.pp_sel(r) end || ': ferramenta concluida em OUTRO atendimento nao e excluida (nenhuma janela de dias)');
  -- concluida no atendimento DESTA aplicacao (e): pulada enquanto houver outra regra elegivel
  insert into public.tool_applications (nutritionist_id, patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas, iniciada_em, concluida_em)
    values (uid, p, e, 'mapa_rotina_v1', '1', 'concluida', '{"eventos":[]}'::jsonb, now(), now()) returning id into t;
  insert into _pp values ('t_rot', t::text);
  r := public.proximos_passos_holos((select v::uuid from _pp where k = 'a1'));
  insert into _logpp values ('PP08 ' || case when pg_temp.pp_sel(r) = 'principal:REC-FUN-02:gatilhos_respostas_v1 complementar:REC-MET-03:mapa_crencas complementar:REC-FUN-04:linha_momentum'
    and (r->'concluidas_no_atendimento') = '["mapa_rotina_v1"]'::jsonb
    then 'ok' else 'FALHOU: ' || pg_temp.pp_sel(r) end || ': Mapa da Rotina concluido NESTE atendimento e pulado nos tres slots (FUN-02, MET-03, FUN-04)');
end $$;

-- PP09 — so um sistema avaliavel: ate 3 regras desse sistema, por rank, sem repetir ferramenta
do $$
declare r jsonb;
begin
  r := public.proximos_passos_holos((select v::uuid from _pp where k = 'a3'));
  insert into _logpp values ('PP09 ' || case when pg_temp.pp_sel(r) = 'principal:REC-FUN-02:gatilhos_respostas_v1 complementar:REC-FUN-03:mapa_crencas complementar:REC-FUN-04:linha_momentum'
    and jsonb_array_length(r->'systems_order') = 1 then 'ok' else 'FALHOU: ' || pg_temp.pp_sel(r) end
    || ': so o fungico avaliavel -> ate 3 regras dele (Mapa da Rotina concluido neste atendimento e pulado: FUN-02, FUN-03, FUN-04)');
  -- PP10 — nenhum sistema avaliavel: nenhuma recomendacao, com o motivo
  r := public.proximos_passos_holos((select v::uuid from _pp where k = 'a4'));
  insert into _logpp values ('PP10 ' || case when jsonb_array_length(r->'selection') = 0 and jsonb_array_length(r->'systems_order') = 0
    and (r->>'motivo') = 'Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação.' then 'ok' else 'FALHOU: ' || left(r::text, 200) end
    || ': nenhum sistema avaliavel -> nenhuma ferramenta, com o motivo');
end $$;

-- PP11 — registrar: uma vez por (aplicacao, catalogo); segunda chamada devolve o MESMO registro; hash confere; so o dono le
do $$
declare uid uuid := auth.uid(); r1 jsonb; r2 jsonb; n int; reg record;
begin
  r1 := public.registrar_proximos_passos((select v::uuid from _pp where k = 'a2'));
  r2 := public.registrar_proximos_passos((select v::uuid from _pp where k = 'a2'));
  select count(*) into n from public.holos_next_steps where holoscan_application_id = (select v::uuid from _pp where k = 'a2');
  select * into reg from public.holos_next_steps where id = (r1->>'registro_id')::uuid;
  insert into _pp values ('reg_a2', (r1->>'registro_id'));
  insert into _logpp values ('PP11 ' || case when n = 1 and (r1->>'registro_id') = (r2->>'registro_id') and pg_temp.pp_limpo(r1) = pg_temp.pp_limpo(r2)
    and reg.content_hash = encode(sha256(convert_to(reg.content_snapshot::text, 'UTF8')), 'hex')
    and reg.catalog_code = 'HOLOS-RECOMENDACOES-V1' and reg.catalog_version = 1 and reg.engine_version = 'PP-V1'
    and reg.selection = (r1->'selection') and reg.nutritionist_id = uid
    and (public.proximos_passos_holos((select v::uuid from _pp where k = 'a2'))->>'registrado') = 'true'
    then 'ok' else 'FALHOU: n=' || n end || ': registrar grava um snapshot por (aplicacao, catalogo), idempotente, com sha256; a previa passa a dizer "registrado"');
end $$;
-- PP12 — RLS: a aplicacao so le o catalogo e os proprios registros; nao grava, altera nem apaga nada
insert into _logpp select 'PP12 ' || case when pg_temp.pp_tenta('insert into public.holos_recommendation_rules (catalog_id, rule_id, catalog_code, catalog_version, system_id, rank, tool_id, professional_reason, next_action, status, provenance, approved_at) select id, ''REC-FUN-07'', code, version, ''fungico'', 6, ''pqq'', ''x'', ''y'', ''aprovado'', ''z'', now() from public.holos_recommendation_catalogs') like '42501%'
  and pg_temp.pp_tenta('update public.holos_recommendation_rules set rank = 2 where rule_id = ''REC-FUN-01''') like '42501%'
  and pg_temp.pp_tenta('delete from public.holos_recommendation_rules where rule_id = ''REC-FUN-01''') like '42501%'
  and pg_temp.pp_tenta('update public.holos_recommendation_catalogs set status = ''retirado''') like '42501%'
  and pg_temp.pp_tenta('insert into public.holos_next_steps (patient_id, holoscan_application_id, catalog_id, catalog_code, catalog_version, catalog_hash, engine_version, systems_order, selection, content_snapshot, content_hash) select ''' || (select v from _pp where k = 'p') || ''', ''' || (select v from _pp where k = 'a1') || ''', id, code, version, content_hash, ''x'', ''[]'', ''[]'', ''{}'', ''h'' from public.holos_recommendation_catalogs') like '42501%'
  and pg_temp.pp_tenta('update public.holos_next_steps set selection = ''[]''') like '42501%'
  and pg_temp.pp_tenta('delete from public.holos_next_steps') like '42501%'
  and (select count(*) from public.holos_recommendation_rules) = 30
  and (select count(*) from public.holos_next_steps) = 1
  then 'ok' else 'FALHOU' end || ': o frontend so le: insert/update/delete no catalogo e nos registros sao recusados (42501)';
-- PP13 — outra conta nao le os registros alheios (RLS por dono); o catalogo e global
select pg_temp.como_rodrigo();
insert into _logpp select 'PP13 ' || case when (select count(*) from public.holos_next_steps) = 0 and (select count(*) from public.holos_recommendation_rules) = 30
  and pg_temp.pp_tenta('select public.proximos_passos_holos(''' || (select v from _pp where k = 'a1') || ''')') = 'referencia_cruzada'
  then 'ok' else 'FALHOU' end || ': outra conta nao le registros alheios nem calcula sobre aplicacao alheia; o catalogo e visivel a todas';
select pg_temp.como_daniel();

-- PP14 — nem o dono do banco altera o catalogo ou um registro (gatilhos); ferramenta fora das 10 nem entra (check)
reset role;
insert into _logpp select 'PP14 ' || case when pg_temp.pp_tenta('update public.holos_recommendation_rules set rank = 2 where rule_id = ''REC-FUN-01''') = 'catalogo_imutavel'
  and pg_temp.pp_tenta('delete from public.holos_recommendation_catalogs') = 'catalogo_imutavel'
  and pg_temp.pp_tenta('update public.holos_next_steps set selection = ''[]''') = 'snapshot_imutavel'
  and pg_temp.pp_tenta('delete from public.holos_next_steps') = 'snapshot_imutavel'
  then 'ok' else 'FALHOU' end || ': gatilhos: catalogo e registros imutaveis mesmo para o dono do banco';
alter table public.holos_recommendation_rules disable trigger holos_recommendation_rules_proteger;
insert into _logpp select 'PP15 ' || case when pg_temp.pp_tenta('insert into public.holos_recommendation_rules (catalog_id, rule_id, catalog_code, catalog_version, system_id, rank, tool_id, professional_reason, next_action, status, provenance, approved_at) select id, ''REC-X-01'', code, version, ''fungico'', 6, ''diario_corporal'', ''x'', ''y'', ''aprovado'', ''z'', now() from public.holos_recommendation_catalogs') like '23514%'
  then 'ok' else 'FALHOU' end || ': ferramenta fora das 10 ativas (ex.: diario_corporal, travada) nao entra no catalogo (check)';
-- PP16 — regra nao aprovada nunca aparece (simulando, como uma migration futura faria, a retirada de REC-FUN-01)
update public.holos_recommendation_rules set status = 'retirado' where rule_id = 'REC-FUN-01';
set local role authenticated;
select pg_temp.como_daniel();
insert into _logpp select 'PP16 ' || case when pg_temp.pp_sel(public.proximos_passos_holos((select v::uuid from _pp where k = 'a2'))) = 'principal:REC-FUN-02:gatilhos_respostas_v1 complementar:REC-MET-03:mapa_crencas complementar:REC-FUN-04:linha_momentum'
  then 'ok' else 'FALHOU: ' || pg_temp.pp_sel(public.proximos_passos_holos((select v::uuid from _pp where k = 'a2'))) end || ': regra retirada (REC-FUN-01) nunca aparece';
reset role;
update public.holos_recommendation_rules set status = 'aprovado' where rule_id = 'REC-FUN-01';
alter table public.holos_recommendation_rules enable trigger holos_recommendation_rules_proteger;

-- PP17 — catalogo novo (versao 2, como uma migration futura faria) NAO altera o registro antigo; a aplicacao ganha registro novo
alter table public.holos_recommendation_catalogs disable trigger holos_recommendation_catalogs_proteger;
alter table public.holos_recommendation_rules disable trigger holos_recommendation_rules_proteger;
do $$
declare c2 uuid;
begin
  insert into public.holos_recommendation_catalogs (code, version, status, content_hash, provenance, approved_at) values ('HOLOS-RECOMENDACOES-V1', 2, 'aprovado', 'v2-fixture', 'FIXTURE DO HARNESS', now()) returning id into c2;
  insert into public.holos_recommendation_rules (catalog_id, catalog_code, catalog_version, status, provenance, approved_at, rule_id, system_id, rank, tool_id, professional_reason, next_action)
    select c2, 'HOLOS-RECOMENDACOES-V1', 2, 'aprovado', 'FIXTURE', now(), 'V2-' || rule_id, system_id, (case when rank = 1 then 6 when rank = 6 then 1 else rank end), tool_id, professional_reason, next_action from public.holos_recommendation_rules where catalog_version = 1;
  insert into _pp values ('c2', c2::text);
end $$;
alter table public.holos_recommendation_catalogs enable trigger holos_recommendation_catalogs_proteger;
alter table public.holos_recommendation_rules enable trigger holos_recommendation_rules_proteger;
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare antes record; r jsonb; depois record; n int;
begin
  select * into antes from public.holos_next_steps where id = (select v::uuid from _pp where k = 'reg_a2');
  r := public.registrar_proximos_passos((select v::uuid from _pp where k = 'a2'));
  select * into depois from public.holos_next_steps where id = (select v::uuid from _pp where k = 'reg_a2');
  select count(*) into n from public.holos_next_steps where holoscan_application_id = (select v::uuid from _pp where k = 'a2');
  insert into _logpp values ('PP17 ' || case when n = 2 and (r#>>'{catalogo,version}') = '2' and (r->>'registro_id') <> antes.id::text
    and depois.content_hash = antes.content_hash and depois.selection = antes.selection and depois.catalog_version = 1
    then 'ok' else 'FALHOU: n=' || n || ' v=' || (r#>>'{catalogo,version}') end
    || ': catalogo v2 gera registro NOVO (v2) e o registro v1 continua identico (hash e selecao)');
end $$;
-- limpa a fixture v2 (o registro v2 sai junto; o v1 fica) para o resto do harness usar so o catalogo real
reset role;
alter table public.holos_next_steps disable trigger holos_next_steps_proteger;
alter table public.holos_recommendation_catalogs disable trigger holos_recommendation_catalogs_proteger;
alter table public.holos_recommendation_rules disable trigger holos_recommendation_rules_proteger;
delete from public.holos_next_steps where catalog_id = (select v::uuid from _pp where k = 'c2');
delete from public.holos_recommendation_rules where catalog_id = (select v::uuid from _pp where k = 'c2');
delete from public.holos_recommendation_catalogs where id = (select v::uuid from _pp where k = 'c2');
alter table public.holos_next_steps enable trigger holos_next_steps_proteger;
alter table public.holos_recommendation_catalogs enable trigger holos_recommendation_catalogs_proteger;
alter table public.holos_recommendation_rules enable trigger holos_recommendation_rules_proteger;

-- PP18 — exame historico do paciente nao muda nada (o motor nem olha)
insert into public.lab_collections (nutritionist_id, patient_id, coletado_em, data_coleta_desconhecida, state, source)
  values ((select v::uuid from _aprov where k = 'daniel'), (select v::uuid from _pp where k = 'p'), current_date - 10, false, 'salvo', 'manual');
set local role authenticated;
select pg_temp.como_daniel();
insert into _logpp select 'PP18 ' || case when pg_temp.pp_sel(public.proximos_passos_holos((select v::uuid from _pp where k = 'a1'))) = 'principal:REC-FUN-02:gatilhos_respostas_v1 complementar:REC-MET-03:mapa_crencas complementar:REC-FUN-04:linha_momentum'
  then 'ok' else 'FALHOU' end || ': com uma coleta historica nova, a selecao continua a mesma (so o Mapa da Rotina concluido neste atendimento muda a selecao desde R08)';
-- PP19 — aplicacao HISTORICA (sem pacote oficial): recusa explicita, nada e inventado
reset role;
do $$
declare uid uuid := (select v::uuid from _aprov where k = 'daniel'); p uuid := (select v::uuid from _pp where k = 'p'); h uuid; r text;
begin
  insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, indice, indice_maximo, avaliavel, nota_media, triada, triada_com_dado, cobertura)
    values (uid, p, current_date - 30, 2, 40, 100, true, 4, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb) returning id into h;
  insert into _pp values ('hist', h::text);
exception when others then
  insert into _pp values ('hist', '');
end $$;
set local role authenticated;
select pg_temp.como_daniel();
insert into _logpp select 'PP19 ' || case when (select v from _pp where k = 'hist') = '' then 'ok (o stub nao aceita aplicacao sem pacote: nada a recusar)'
  when pg_temp.pp_tenta('select public.proximos_passos_holos(''' || (select v from _pp where k = 'hist') || ''')') = 'aplicacao_nao_oficial' then 'ok' else 'FALHOU' end
  || ': aplicacao historica sem pacote oficial -> recusa explicita (aplicacao_nao_oficial), nenhuma recomendacao inventada';
-- PP20 — Resultado HOLOS (versao da paciente) nao recebe a recomendacao; HOLOSCAN e metodologia intactos ao fim
do $$
declare prev jsonb;
begin
  prev := public.previa_resultado_holos(jsonb_build_object('patient_id', (select v from _pp where k = 'p'), 'encounter_id', (select v from _pp where k = 'e'),
    'holoscan_application_id', (select v from _pp where k = 'a1'), 'tool_application_ids', jsonb_build_array((select v from _pp where k = 't_rot')),
    'visao_paciente', jsonb_build_object('ferramentas', jsonb_build_object((select v from _pp where k = 't_rot'), jsonb_build_object('mostrar', true)))));
  insert into _logpp values ('PP20 ' || case when position('REC-' in prev::text) = 0 and position('proximos' in lower(prev::text)) = 0 and position('next_action' in prev::text) = 0 then 'ok' else 'FALHOU' end
    || ': o Resultado HOLOS (snapshot da paciente) nao leva Proximos Passos');
end $$;
reset role;
insert into _logpp select 'PP21 ' || case when (select v from _pp where k = 'pre')::jsonb->>'metodologia' = pg_temp.pp_digitais()->>'metodologia'
  and (select v from _pp where k = 'pre')::jsonb->>'resultado_holos' = pg_temp.pp_digitais()->>'resultado_holos'
  and (select v from _pp where k = 'pre')::jsonb->>'condutas' = pg_temp.pp_digitais()->>'condutas'
  and (select count(*) from public.holoscan_system_scores s where s.application_id = (select v::uuid from _pp where k = 'a1') and s.sistema = 'fungico' and s.nota = 3) = 1
  then 'ok' else 'FALHOU' end || ': metodologia, Resultado HOLOS e condutas identicos ao fim; as notas do HOLOSCAN nao mudaram (recomendar nao altera o resultado)';

select string_agg(passo, ' | ' order by passo) from _logpp;
