-- Harness RESULTADO HOLOS (migration 20261009100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration (e de resultado-holos-pre.sql, antes dela). Dados ficticios; nada persiste.
-- Usa o pacote HOLOS-V1 aprovado e vigente que a cadeia de testes deixa (o mesmo do holoscan-oficial-harness).
reset role;
insert into _logrh values ('R00 ' || case when (select v from _rh where k = 'pre') = pg_temp.rh_digitais()::text then 'ok' else 'FALHOU' end
  || ': a migration nao tocou HOLOSCAN, notas, respostas, ferramentas, Leitura Integrada, exames nem pacotes');

create or replace function pg_temp.rh_tenta(fn text, p jsonb) returns text language plpgsql as $$
declare h text; m text; id uuid;
begin
  execute format('select public.%I($1)', fn) into id using p;
  return 'ACEITO:' || id;
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text;
  return coalesce(nullif(h, ''), m);
end $$;
create or replace function pg_temp.rh_sql(sql text) returns text language plpgsql as $$
declare h text; m text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text;
  return coalesce(nullif(h, ''), m);
end $$;
grant execute on all functions in schema pg_temp to authenticated;

-- fixtures: HOLOSCAN oficial (salvar_holoscan_completo) para A e B (Daniel) e para C (Rodrigo)
set local role authenticated;
select pg_temp.como_rodrigo();
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); pc uuid; ec uuid; hc uuid;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'RH TESTE FICTICIO C') returning id into pc;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pc, now()) returning id into ec;
  hc := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, pc, ec, current_date));
  insert into _rh values ('pc', pc::text), ('ec', ec::text), ('hc', hc::text);
end $$;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); mp uuid := (select v::uuid from _ho where k = 'mp'); pa uuid; pb uuid; ea uuid; eb uuid; ha uuid; hb uuid;
  t_oq3 uuid; t_rot uuid; t_gat uuid; t_con uuid; t_ras uuid; t_oq3b uuid; t_b uuid;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'RH TESTE FICTICIO A') returning id into pa;
  insert into public.patients (nutritionist_id, nome) values (uid, 'RH TESTE FICTICIO B') returning id into pb;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pa, now()) returning id into ea;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pb, now()) returning id into eb;
  ha := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, pa, ea, current_date));
  hb := public.salvar_holoscan_completo(pg_temp.ho_payload(mp, pb, eb, current_date));
  insert into public.tool_applications (patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, ea, 'oq3', '1', 'concluida', '{"quer":"ter energia","precisa":"dormir melhor","consegue":"caminhar 10 min"}') returning id into t_oq3;
  insert into public.tool_applications (patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, ea, 'oq3', '1', 'concluida', '{"quer":"outra versao"}') returning id into t_oq3b;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, 'mapa_rotina_v1', '1', 'concluida', '{"acorda":"06:30","dorme":"23:00","eventos":[{"inicio":"07:00","categoria":"refeição","titulo":"café"}]}') returning id into t_rot;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, 'gatilhos_respostas_v1', '1', 'concluida', '{"gatilho":"discussão","pensamento":"não aguento","emocao":"raiva","resposta":"come doce"}') returning id into t_gat;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, 'conexao_pertencimento_v1', '1', 'concluida', '{"contar":"irmã","vinculos":[{"rotulo":"Irmã","natureza":"pessoa","papel":"apoia"}]}') returning id into t_con;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, 'mapa_crencas', '1', 'rascunho', '{"crencas":"rascunho"}') returning id into t_ras;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pb, 'mapa_crencas', '1', 'concluida', '{"crencas":"de B"}') returning id into t_b;
  insert into _rh values ('pa', pa::text), ('pb', pb::text), ('ea', ea::text), ('eb', eb::text), ('ha', ha::text), ('hb', hb::text),
    ('t_oq3', t_oq3::text), ('t_oq3b', t_oq3b::text), ('t_rot', t_rot::text), ('t_gat', t_gat::text), ('t_con', t_con::text), ('t_ras', t_ras::text), ('t_b', t_b::text);
end $$;
-- HOLOSCAN historico (sem pacote): so pode existir de antes da correcao P0; o fixture desliga os gatilhos SO para cria-lo
reset role;
set local session_replication_role = replica;
do $$
declare hh uuid;
begin
  insert into public.holoscan_applications (nutritionist_id, patient_id, quando, versao_estrutura, cobertura, indice_maximo, avaliavel, indice, nota_media, triada, triada_com_dado, combinacoes, aprofundamentos)
    values ((select v::uuid from _aprov where k = 'daniel'), (select v::uuid from _rh where k = 'pa'), current_date - 30, 2, '{"respondidos":84,"total":84}'::jsonb, 100, true, 50, 5, '{}'::jsonb, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb)
    returning id into hh;
  insert into _rh values ('hh', hh::text);
end $$;
set local session_replication_role = origin;
insert into _rh values ('d1', pg_temp.rh_digitais()::text);

set local role authenticated;
select pg_temp.como_daniel();
do $$
declare
  g text; op uuid;
  pa uuid := (select v::uuid from _rh where k = 'pa'); pb uuid := (select v::uuid from _rh where k = 'pb');
  ea uuid := (select v::uuid from _rh where k = 'ea'); eb uuid := (select v::uuid from _rh where k = 'eb');
  ha uuid := (select v::uuid from _rh where k = 'ha'); hb uuid := (select v::uuid from _rh where k = 'hb');
  hc uuid := (select v::uuid from _rh where k = 'hc'); hh uuid := (select v::uuid from _rh where k = 'hh');
  t_oq3 uuid := (select v::uuid from _rh where k = 't_oq3'); t_oq3b uuid := (select v::uuid from _rh where k = 't_oq3b');
  t_rot uuid := (select v::uuid from _rh where k = 't_rot'); t_gat uuid := (select v::uuid from _rh where k = 't_gat');
  t_con uuid := (select v::uuid from _rh where k = 't_con'); t_ras uuid := (select v::uuid from _rh where k = 't_ras'); t_b uuid := (select v::uuid from _rh where k = 't_b');
  base jsonb; t text; r1 uuid; r2 uuid; x record; y record; snap jsonb; h text; n int;
begin
  base := jsonb_build_object('patient_id', pa, 'encounter_id', ea, 'holoscan_application_id', ha,
    'tool_application_ids', jsonb_build_array(t_oq3, t_rot, t_gat, t_con),
    'visao_paciente', jsonb_build_object('ferramentas', jsonb_build_object(t_oq3::text, jsonb_build_object('mostrar', true), t_gat::text, jsonb_build_object('mostrar', false))),
    'leitura_profissional', 'leitura <script>alert(1)</script>', 'pontos_acompanhar', 'sono', 'questoes_aprofundar', 'rotina da noite');

  insert into _logrh values ('R01 ' || case when pg_temp.rh_tenta('salvar_resultado_holos', base - 'holoscan_application_id') = 'holoscan_obrigatorio'
    and pg_temp.rh_tenta('salvar_rascunho_resultado_holos', base - 'holoscan_application_id') = 'holoscan_obrigatorio' then 'ok' else 'FALHOU' end || ': sem HOLOSCAN recusado (rascunho e salvar)');
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('holoscan_application_id', hh));
  insert into _logrh values ('R02 ' || case when t = 'holoscan_nao_oficial' then 'ok' else 'FALHOU' end || ': HOLOSCAN historico sem pacote recusado (' || t || ')');
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('holoscan_application_id', hb));
  insert into _logrh values ('R03 ' || case when t = 'referencia_cruzada' then 'ok' else 'FALHOU' end || ': HOLOSCAN de outro paciente recusado (' || t || ')');
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('holoscan_application_id', hc));
  insert into _logrh values ('R04 ' || case when t = 'referencia_cruzada' then 'ok' else 'FALHOU' end || ': HOLOSCAN de outra nutricionista recusado (' || t || ')');
  t := pg_temp.rh_tenta('salvar_resultado_holos', base - 'encounter_id');
  insert into _logrh values ('R05 ' || case when t = 'atendimento_obrigatorio' then 'ok' else 'FALHOU' end || ': sem atendimento recusado (' || t || ')');
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('encounter_id', eb));
  insert into _logrh values ('R06 ' || case when t = 'referencia_cruzada' then 'ok' else 'FALHOU' end || ': atendimento de outro paciente recusado (' || t || ')');
  insert into _logrh values ('R06b ' || case when pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('tool_application_ids', jsonb_build_array(t_b))) = 'referencia_cruzada'
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('tool_application_ids', jsonb_build_array(t_ras))) = 'fonte_nao_consolidada'
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('tool_application_ids', jsonb_build_array(t_oq3, t_oq3b))) = 'fonte_repetida'
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('tool_application_ids', jsonb_build_array(t_oq3, t_oq3))) = 'fonte_repetida'
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('tool_application_ids', jsonb_build_array(gen_random_uuid()))) = 'referencia_cruzada'
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('patient_id', gen_random_uuid())) = 'referencia_cruzada'
    then 'ok' else 'FALHOU' end || ': ferramenta de outro paciente, em rascunho, repetida (mesma ferramenta ou mesmo id) e ids inexistentes recusados');

  -- rascunho: grava, edita; nada congelado
  t := pg_temp.rh_tenta('salvar_rascunho_resultado_holos', base);
  r1 := case when t like 'ACEITO:%' then substr(t, 8)::uuid end;
  select * into x from public.holos_results where id = r1;
  t := pg_temp.rh_tenta('salvar_rascunho_resultado_holos', base || jsonb_build_object('id', r1, 'leitura_profissional', 'leitura editada no rascunho'));
  select * into y from public.holos_results where id = r1;
  insert into _logrh values ('R07a ' || case when x.status = 'rascunho' and x.content_snapshot is null and x.content_hash is null and x.revision_number = 1
    and y.leitura_profissional = 'leitura editada no rascunho' and t = 'ACEITO:' || r1 then 'ok' else 'FALHOU' end || ': rascunho grava e edita (sem snapshot nem hash)');

  -- salvar: snapshot do servidor + hash
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('id', r1, 'leitura_profissional', 'leitura <script>alert(1)</script>',
       'conteudo_forjado', jsonb_build_object('holoscan', jsonb_build_object('indice', 99)), 'content_snapshot', jsonb_build_object('falso', true)));
  select * into x from public.holos_results where id = r1;
  snap := x.content_snapshot;
  insert into _logrh values ('R07 ' || case when t = 'ACEITO:' || r1 and x.status = 'salvo'
    and (select bool_and(f->>'mostrar_paciente' = case when (f->>'id')::uuid = t_oq3 then 'true' else 'false' end) from jsonb_array_elements(snap->'ferramentas') f)
    and jsonb_array_length(snap->'ferramentas') = 4 then 'ok' else 'FALHOU' end || ': salvo; "mostrar ao paciente" so onde a nutri ligou (OQ3 true; Gatilhos false explicito; Rotina e Conexao false por padrao)');
  insert into _logrh values ('R08 ' || case when (snap#>>'{holoscan,indice}')::numeric = (select indice from public.holoscan_applications where id = ha)
    and not (snap ? 'conteudo_forjado') and not (snap ? 'falso') and jsonb_array_length(snap#>'{holoscan,sistemas}') = 5
    and (select bool_and(jsonb_array_length(s->'pontuou') > 0) from jsonb_array_elements(snap#>'{holoscan,sistemas}') s)
    and (select sum(jsonb_array_length(s->'contexto')) from jsonb_array_elements(snap#>'{holoscan,sistemas}') s) = 11
    and (select sum(jsonb_array_length(s->'pontuou')) from jsonb_array_elements(snap#>'{holoscan,sistemas}') s) = 84
    and snap#>>'{holoscan,pacote,id}' = (select methodology_package_id::text from public.holoscan_applications where id = ha)
    and snap#>>'{observacoes,leitura_profissional}' = 'leitura <script>alert(1)</script>'
    and x.methodology_package_id = (select methodology_package_id from public.holoscan_applications where id = ha)
    then 'ok' else 'FALHOU' end || ': snapshot montado pelo servidor (Indice da aplicacao salva; conteudo forjado ignorado; 5 sistemas; 84 respostas que pontuaram e 11 de contexto; pacote; texto guardado cru, escapado so na tela)');
  h := encode(sha256(convert_to(snap::text, 'UTF8')), 'hex');
  insert into _logrh values ('R12 ' || case when x.content_hash = h and x.saved_at is not null and x.source_snapshot#>>'{holoscan,id}' = ha::text
    and jsonb_array_length(x.source_snapshot->'ferramentas') = 4 then 'ok' else 'FALHOU' end || ': hash = sha256 do snapshot (' || left(h, 12) || '...); fontes com id e updated_at');

  -- imutavel: observacao, fontes, visibilidade; por RPC, por UPDATE direto e como dono da tabela
  insert into _logrh values ('R10 ' || case when pg_temp.rh_tenta('salvar_rascunho_resultado_holos', base || jsonb_build_object('id', r1, 'leitura_profissional', 'mudou')) = 'revisao_imutavel'
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('id', r1, 'tool_application_ids', '[]'::jsonb)) = 'revisao_imutavel'
    and pg_temp.rh_sql(format('update public.holos_results set leitura_profissional = %L where id = %L', 'mudou', r1)) like '%permission denied%'
    and pg_temp.rh_sql(format('delete from public.holos_results where id = %L', r1)) like '%permission denied%'
    and pg_temp.rh_sql(format('select public.descartar_rascunho_resultado_holos(%L)', r1)) = 'revisao_imutavel'
    then 'ok' else 'FALHOU' end || ': depois de salvo: observacao, fontes e visibilidade recusadas (RPC e UPDATE/DELETE direto)');

  -- revisar
  t := pg_temp.rh_sql(format('select public.revisar_resultado_holos(%L)', r1));
  select * into y from public.holos_results where id = r1;
  insert into _logrh values ('R10b ' || case when t = 'ACEITO' and y.status = 'revisado' and y.reviewed_by = auth.uid() and y.reviewed_at is not null
    and y.content_hash = x.content_hash and y.content_snapshot = x.content_snapshot
    and pg_temp.rh_sql(format('select public.revisar_resultado_holos(%L)', r1)) = 'revisao_imutavel' then 'ok' else 'FALHOU' end
    || ': salvo -> revisado (carimbo do servidor), snapshot e hash iguais; revisar de novo recusado');

  -- nova versao a partir da anterior
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('supersedes_id', r1, 'leitura_profissional', 'versao 2'));
  r2 := case when t like 'ACEITO:%' then substr(t, 8)::uuid end;
  select * into y from public.holos_results where id = r2;
  insert into _logrh values ('R11 ' || case when r2 is not null and y.revision_number = 2 and y.supersedes_id = r1 and y.status = 'salvo'
    and (select superseded_at is not null and content_hash = x.content_hash and content_snapshot = x.content_snapshot and leitura_profissional = 'leitura <script>alert(1)</script>' from public.holos_results where id = r1)
    and pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('supersedes_id', r1)) = 'conflito'
    and y.content_snapshot#>>'{resultado,revision_number}' = '2' then 'ok' else 'FALHOU' end
    || ': nova versao: revision 2 ligada a anterior; anterior intacta e marcada substituida; segunda versao da mesma anterior recusada');

  -- idempotencia do salvar
  op := gen_random_uuid();
  t := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('operation_id', op));
  g := pg_temp.rh_tenta('salvar_resultado_holos', base || jsonb_build_object('operation_id', op));
  insert into _logrh values ('R13b ' || case when t = g and t like 'ACEITO:%' and (select count(*) from public.holos_results where operation_id = op) = 1 then 'ok' else 'FALHOU' end
    || ': salvar repetido com o mesmo operation_id devolve o mesmo resultado (sem duplicar)');

  -- descartar rascunho
  t := pg_temp.rh_tenta('salvar_rascunho_resultado_holos', base);
  g := pg_temp.rh_sql(format('select public.descartar_rascunho_resultado_holos(%L)', substr(t, 8)));
  insert into _logrh values ('R13c ' || case when g = 'ACEITO' and not exists (select 1 from public.holos_results where id = substr(t, 8)::uuid) then 'ok' else 'FALHOU' end
    || ': rascunho pode ser descartado');
  insert into _rh values ('r1', r1::text), ('h1', x.content_hash), ('s1', x.content_snapshot::text);
end $$;

-- RLS: outra nutricionista nao ve nem altera
select pg_temp.como_rodrigo();
do $$
declare r1 uuid := (select v::uuid from _rh where k = 'r1');
begin
  insert into _logrh values ('R12b ' || case when (select count(*) from public.holos_results) = 0
    and pg_temp.rh_sql(format('select public.revisar_resultado_holos(%L)', r1)) = 'referencia_cruzada'
    and pg_temp.rh_tenta('salvar_resultado_holos', jsonb_build_object('supersedes_id', r1, 'patient_id', (select v from _rh where k = 'pc'),
        'encounter_id', (select v from _rh where k = 'ec'), 'holoscan_application_id', (select v from _rh where k = 'hc'))) = 'referencia_cruzada'
    and pg_temp.rh_tenta('salvar_resultado_holos', jsonb_build_object('patient_id', (select v from _rh where k = 'pa'),
        'encounter_id', (select v from _rh where k = 'ea'), 'holoscan_application_id', (select v from _rh where k = 'ha'))) = 'referencia_cruzada'
    then 'ok' else 'FALHOU' end || ': outra nutricionista nao le, nao revisa, nao versiona e nao cria resultado para paciente alheio');
end $$;
-- conta nao liberada nao grava
reset role;
update public.profiles set status = 'pendente' where id = (select v::uuid from _aprov where k = 'ninguem');
set local role authenticated;
select pg_temp.como_ninguem();
insert into _logrh values ('R12c ' || case when pg_temp.rh_tenta('salvar_resultado_holos', jsonb_build_object('patient_id', gen_random_uuid())) = 'conta_inativa'
  then 'ok' else 'FALHOU' end || ': conta sem liberacao nao grava');

-- nao interferencia: as fontes ficam byte a byte iguais depois de rascunho, salvar, revisar, nova versao e descarte
reset role;
insert into _logrh values ('R13 ' || case when (select v from _rh where k = 'd1') = pg_temp.rh_digitais()::text then 'ok' else 'FALHOU' end
  || ': nenhuma mudanca em HOLOSCAN, notas, Indice, Triade, respostas, ferramentas, Leitura Integrada, exames e pacotes');
insert into _logrh values ('R10c ' || case when pg_temp.rh_sql(format('update public.holos_results set pontos_acompanhar = %L where id = %L', 'x', (select v from _rh where k = 'r1'))) = 'revisao_imutavel'
  then 'ok' else 'FALHOU' end || ': nem o dono da tabela altera um resultado salvo (gatilho)');

-- alterar a ferramenta DEPOIS de salvar: o resultado antigo nao muda
set local role authenticated;
select pg_temp.como_daniel();
update public.tool_applications set respostas = '{"quer":"mudou depois"}' where id = (select v::uuid from _rh where k = 't_oq3');
insert into _logrh select 'R09 ' || case when (select respostas->>'quer' from public.tool_applications where id = (select v::uuid from _rh where k = 't_oq3')) = 'mudou depois'
  and h.content_hash = (select v from _rh where k = 'h1') and h.content_snapshot::text = (select v from _rh where k = 's1')
  and (select f#>>'{respostas,quer}' from jsonb_array_elements(h.content_snapshot->'ferramentas') f where f->>'ferramenta_id' = 'oq3') = 'ter energia'
  and encode(sha256(convert_to(h.content_snapshot::text, 'UTF8')), 'hex') = h.content_hash
  then 'ok' else 'FALHOU' end || ': OQ3 editado depois de salvar; o Resultado HOLOS guarda o OQ3 de antes, hash igual e reconferido'
  from public.holos_results h where h.id = (select v::uuid from _rh where k = 'r1');

-- paciente arquivado nao recebe novo Resultado HOLOS
update public.patients set status = 'inativo' where id = (select v::uuid from _rh where k = 'pb');
insert into _logrh values ('R14 ' || case when pg_temp.rh_tenta('salvar_resultado_holos', jsonb_build_object('patient_id', (select v from _rh where k = 'pb'),
  'encounter_id', (select v from _rh where k = 'eb'), 'holoscan_application_id', (select v from _rh where k = 'hb'))) = 'paciente_arquivado' then 'ok' else 'FALHOU' end
  || ': paciente arquivado recusado');
reset role;

select string_agg(passo, ' | ' order by passo) from _logrh;
