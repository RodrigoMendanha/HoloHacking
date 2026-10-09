-- Harness CONTA PENDENTE = SOMENTE PERFIL (migration 20261013100000): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), DEPOIS da migration. Dados ficticios; nada persiste.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _cp (k text primary key, v text) on commit drop;
create temp table _logcp (passo text) on commit drop;
grant select, insert on _cp, _logcp to authenticated;
create or replace function pg_temp.cp_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
create or replace function pg_temp.sem_usuario() returns void language sql as $$ select set_config('request.jwt.claims', '{}', true) $$;
grant execute on all functions in schema pg_temp to authenticated;

-- as tabelas travadas: todas com nutritionist_id (menos professional_assets) + as filhas
create temp table _cp_tabs on commit drop as
  select c.table_name::text t from information_schema.columns c
    join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
   where c.table_schema = 'public' and c.column_name = 'nutritionist_id' and c.table_name <> 'professional_assets'
  union select u from unnest(array['ai_messages', 'holoscan_answers', 'holoscan_system_scores', 'lab_results', 'lab_result_components']) u
   where to_regclass('public.' || u) is not null;
grant select on _cp_tabs to authenticated;

-- CP00 — a trava esta em todas as tabelas de dado da nutricionista, e NAO no Perfil
insert into _logcp select 'CP00 ' || case when (select count(*) from _cp_tabs) >= 30
  and not exists (select 1 from _cp_tabs t where not exists (select 1 from pg_trigger g where g.tgrelid = ('public.' || t.t)::regclass and g.tgname = 'exigir_conta_ativa'))
  and not exists (select 1 from pg_trigger g where g.tgname = 'exigir_conta_ativa' and g.tgrelid in ('public.profiles'::regclass, 'public.professional_assets'::regclass))
  then 'ok' else 'FALHOU' end || ': gatilho exigir_conta_ativa em ' || (select count(*) from _cp_tabs) || ' tabelas (todas com nutritionist_id + filhas); profiles e professional_assets livres';

-- fixtures: P (cadastro novo, pendente), B (foi ativa, tem paciente, voltou a pendente), R (recusada), daniel (ativo, administrador)
do $$
declare p uuid := gen_random_uuid(); b uuid := gen_random_uuid(); r uuid := gen_random_uuid(); d uuid := (select v::uuid from _aprov where k = 'daniel');
        pb uuid; eb uuid;
begin
  insert into auth.users (id, email, raw_user_meta_data) values
    (p, 'pendente-teste@local.invalid', '{"nome":"Pendente Teste Ficticia","telefone":"(62) 99999-0000"}'),
    (b, 'voltou-teste@local.invalid', '{"nome":"Voltou Teste Ficticia"}'),
    (r, 'recusada-teste@local.invalid', '{"nome":"Recusada Teste Ficticia"}');
  update public.profiles set status = 'ativo' where id = b;
  insert into public.patients (nutritionist_id, nome) values (b, 'CP PACIENTE FICTICIO B') returning id into pb;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (b, pb, now()) returning id into eb;
  update public.profiles set status = 'pendente' where id = b;
  update public.profiles set status = 'recusado' where id = r;
  insert into public.administradores (user_id) values (d) on conflict do nothing;
  insert into public.professional_assets (nutritionist_id, tipo, nome, mime_type, tamanho_bytes, storage_path) values (d, 'logo', 'logo.png', 'image/png', 10, d || '/logo/1.png')
    on conflict (nutritionist_id, tipo) do nothing;
  insert into storage.objects (bucket_id, name, owner) values ('professional-assets', d || '/logo/1.png', d);
  insert into _cp values ('p', p::text), ('b', b::text), ('r', r::text), ('d', d::text), ('pb', pb::text), ('eb', eb::text);
end $$;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;

-- ===================== PENDENTE (P) =====================
set local role authenticated;
select pg_temp.como((select v::uuid from _cp where k = 'p'));
insert into _logcp select 'CP01 ' || case when (select count(*) from public.profiles) = 1
  and (select status from public.profiles) = 'pendente' and public.minha_conta_status() = 'pendente'
  and (select telefone from public.profiles) = '62999990000'
  then 'ok' else 'FALHOU' end || ': pendente le o PROPRIO perfil (e so ele), nascido do cadastro com status pendente';
-- (cada gravacao em instrucao propria: a consulta de conferencia nao enxerga o que a MESMA instrucao gravou)
insert into _cp select 'cp02', pg_temp.cp_tenta('update public.profiles set registro = ''CRN-1 0001'', cidade = ''Goiania/GO'', cor_primaria = ''#123456'' where id = auth.uid()');
insert into _logcp select 'CP02 ' || case when (select v from _cp where k = 'cp02') = 'ACEITO'
  and (select registro from public.profiles) = 'CRN-1 0001' and (select cor_primaria from public.profiles) = '#123456'
  then 'ok' else 'FALHOU' end || ': pendente edita o proprio perfil (CRN, cidade, cores)';
insert into _logcp select 'CP03 ' || case when pg_temp.cp_tenta('update public.profiles set status = ''ativo'' where id = auth.uid()') like '42501:%'
  and pg_temp.cp_tenta('update public.profiles set aprovado_em = now() where id = auth.uid()') like '42501:%'
  and (select status from public.profiles) = 'pendente'
  then 'ok' else 'FALHOU' end || ': pendente NAO muda o proprio status nem a aprovacao';
insert into _logcp select 'CP04 ' || case when pg_temp.cp_tenta(format('insert into public.professional_assets (nutritionist_id, tipo, nome, mime_type, tamanho_bytes, storage_path) values (auth.uid(), ''foto'', ''f.png'', ''image/png'', 10, %L)', (select v from _cp where k = 'p') || '/foto/1.png')) = 'ACEITO'
  and pg_temp.cp_tenta('update public.professional_assets set nome = ''f2.png'' where tipo = ''foto''') = 'ACEITO'
  and pg_temp.cp_tenta(format('insert into storage.objects (bucket_id, name, owner) values (''professional-assets'', %L, auth.uid())', (select v from _cp where k = 'p') || '/foto/1.png')) = 'ACEITO'
  and pg_temp.cp_tenta(format('insert into storage.objects (bucket_id, name, owner) values (''professional-assets'', %L, auth.uid())', (select v from _cp where k = 'd') || '/foto/x.png')) like '42501:%'
  and pg_temp.cp_tenta(format('insert into public.professional_assets (nutritionist_id, tipo, nome, mime_type, tamanho_bytes, storage_path) values (%L, ''carimbo'', ''c.png'', ''image/png'', 10, ''x/c.png'')', (select v from _cp where k = 'd'))) like '42501:%'
  then 'ok' else 'FALHOU' end || ': pendente envia as proprias imagens (registro + arquivo na propria pasta); nao grava na pasta nem no nome de outra';
insert into _logcp select 'CP05 ' || case when (select count(*) from public.profiles where id = (select v::uuid from _cp where k = 'd')) = 0
  and (select count(*) from public.professional_assets where nutritionist_id = (select v::uuid from _cp where k = 'd')) = 0
  and (select count(*) from storage.objects where name like (select v from _cp where k = 'd') || '/%') = 0
  then 'ok' else 'FALHOU' end || ': pendente nao ve o perfil, as imagens nem os arquivos de outra nutricionista';
insert into _logcp select 'CP06 ' || case when pg_temp.cp_tenta('insert into public.patients (nutritionist_id, nome) values (auth.uid(), ''X'')') = 'conta_nao_liberada'
  and pg_temp.cp_tenta('insert into public.schedule_blocks (nutritionist_id, data, dia_todo, motivo) values (auth.uid(), current_date, true, ''x'')') = 'conta_nao_liberada'
  and pg_temp.cp_tenta(format('insert into storage.objects (bucket_id, name, owner) values (''patient-documents'', %L, auth.uid())', (select v from _cp where k = 'p') || '/x/1.pdf')) like '42501:%'
  then 'ok' else 'FALHOU' end || ': pendente nao cria paciente, nao grava agenda (bloqueio) e nao envia documento de paciente';
-- CP07 — TODAS as tabelas travadas recusam insert/update/delete da pendente (o gatilho de comando dispara mesmo sem linha)
create temp table _cp_res on commit drop as select t, ''::text i, ''::text u, ''::text d from _cp_tabs;
grant select, update on _cp_res to authenticated;
do $$
declare x record;
begin
  for x in select t from _cp_tabs loop
    update _cp_res set u = pg_temp.cp_tenta(format('update public.%I set %I = %I where false', x.t,
                         (select column_name from information_schema.columns where table_schema = 'public' and table_name = x.t and is_generated = 'NEVER' order by ordinal_position limit 1),
                         (select column_name from information_schema.columns where table_schema = 'public' and table_name = x.t and is_generated = 'NEVER' order by ordinal_position limit 1))),
                       d = pg_temp.cp_tenta(format('delete from public.%I where false', x.t)),
                       i = pg_temp.cp_tenta(format('insert into public.%I select * from public.%I where false', x.t, x.t))
     where t = x.t;
  end loop;
end $$;
-- recusado = a trava nova (conta_nao_liberada) OU a tabela nem e gravavel pela API (permission denied: so RPC grava, e a RPC cai na trava)
create or replace function pg_temp.cp_recusou(x text) returns boolean language sql as $$ select x = 'conta_nao_liberada' or x like '42501:permission denied%' $$;
insert into _logcp select 'CP07 ' || case when not exists (select 1 from _cp_res where not (pg_temp.cp_recusou(i) and pg_temp.cp_recusou(u) and pg_temp.cp_recusou(d)))
  and (select count(*) from _cp_res where i = 'conta_nao_liberada') >= 20
  then 'ok' else 'FALHOU: ' || coalesce((select string_agg(t || '[' || i || '|' || u || '|' || d || ']', ', ') from _cp_res where not (pg_temp.cp_recusou(i) and pg_temp.cp_recusou(u) and pg_temp.cp_recusou(d))), '') end
  || ': insert, update e delete recusados em todas as ' || (select count(*) from _cp_res) || ' tabelas (' || (select count(*) from _cp_res where i = 'conta_nao_liberada') || ' pela trava nova; as demais ja nem aceitam escrita pela API): pacientes, agenda, atendimentos, anamnese, HOLOSCAN, ferramentas, Resultado HOLOS, Proximos Passos, conduta, acordos, documentos, relatorios, HOLOS AI, laboratorio, metodologia';

-- ===================== VOLTOU A PENDENTE (B): tem paciente, RPCs clinicas recusam =====================
select pg_temp.como((select v::uuid from _cp where k = 'b'));
insert into _logcp select 'CP08 ' || case when (select count(*) from public.patients) = 1
  and pg_temp.cp_tenta(format('select public.salvar_holoscan_completo(%L::jsonb)', pg_temp.ho_payload((select v::uuid from _ho where k = 'mp'), (select v::uuid from _cp where k = 'pb'), (select v::uuid from _cp where k = 'eb'), current_date)::text)) = 'conta_nao_liberada'
  and pg_temp.cp_tenta(format('insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (auth.uid(), %L, now())', (select v from _cp where k = 'pb'))) = 'conta_nao_liberada'
  and pg_temp.cp_tenta(format('insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas) values (%L, ''oq3'', ''1'', ''rascunho'', ''{}''::jsonb)', (select v from _cp where k = 'pb'))) = 'conta_nao_liberada'
  and pg_temp.cp_tenta(format('update public.patients set nome = ''Y'' where id = %L', (select v from _cp where k = 'pb'))) = 'conta_nao_liberada'
  then 'ok' else 'FALHOU' end || ': conta que voltou a pendente LE o proprio paciente, mas RPC clinica (salvar_holoscan_completo), atendimento, ferramenta e edicao do paciente recusam';

-- ===================== RECUSADA (R) =====================
select pg_temp.como((select v::uuid from _cp where k = 'r'));
insert into _cp select 'cp09', pg_temp.cp_tenta('update public.profiles set nome = ''Outro'' where id = auth.uid()');
insert into _logcp select 'CP09 ' || case when (select count(*) from public.profiles) = 1 and public.minha_conta_status() = 'recusado'
  and (select nome from public.profiles) = 'Recusada Teste Ficticia'   -- a RLS de UPDATE filtra a linha: 0 linhas alteradas
  and pg_temp.cp_tenta(format('insert into public.professional_assets (nutritionist_id, tipo, nome, mime_type, tamanho_bytes, storage_path) values (auth.uid(), ''logo'', ''l.png'', ''image/png'', 10, %L)', (select v from _cp where k = 'r') || '/logo/1.png')) like '42501:%'
  and pg_temp.cp_tenta(format('insert into storage.objects (bucket_id, name, owner) values (''professional-assets'', %L, auth.uid())', (select v from _cp where k = 'r') || '/logo/1.png')) like '42501:%'
  and pg_temp.cp_tenta('insert into public.schedule_blocks (nutritionist_id, data, dia_todo) values (auth.uid(), current_date, true)') = 'conta_nao_liberada'
  then 'ok' else 'FALHOU' end || ': recusada le o proprio perfil, mas nao edita perfil, nao envia imagem e nao grava nada clinico';

-- ===================== ATIVA (daniel): nada muda =====================
select pg_temp.como((select v::uuid from _cp where k = 'd'));
do $$
declare uid uuid := auth.uid(); p uuid; e uuid; h uuid;
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'CP PACIENTE FICTICIO D') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e;
  h := public.salvar_holoscan_completo(pg_temp.ho_payload((select v::uuid from _ho where k = 'mp'), p, e, current_date));
  insert into public.schedule_blocks (nutritionist_id, data, dia_todo, motivo) values (uid, current_date + 1, true, 'cp');
  insert into storage.objects (bucket_id, name, owner) values ('patient-documents', uid || '/' || p || '/cp.pdf', uid);
  insert into _cp values ('dh', h::text);
end $$;
insert into _cp select 'cp10', pg_temp.cp_tenta('update public.profiles set cidade = ''Anapolis/GO'' where id = auth.uid()');
insert into _logcp select 'CP10 ' || case when (select v from _cp where k = 'dh') is not null
  and (select cidade from public.profiles) = 'Anapolis/GO'
  then 'ok' else 'FALHOU' end || ': conta ativa continua gravando tudo (paciente, atendimento, HOLOSCAN pela RPC, agenda, documento, perfil)';

-- ===================== LIBERACAO: administradora aprova P =====================
insert into _logcp select 'CP11 ' || case when public.decidir_conta((select v::uuid from _cp where k = 'p'), true) = 'ativo' then 'ok' else 'FALHOU' end
  || ': a administradora libera a conta pendente (decidir_conta)';
select pg_temp.como((select v::uuid from _cp where k = 'p'));
insert into _logcp select 'CP12 ' || case when public.minha_conta_status() = 'ativo'
  and pg_temp.cp_tenta('insert into public.patients (nutritionist_id, nome) values (auth.uid(), ''CP PACIENTE FICTICIO P'')') = 'ACEITO'
  and (select registro from public.profiles) = 'CRN-1 0001' and (select count(*) from public.professional_assets) = 1
  then 'ok' else 'FALHOU' end || ': liberada, a mesma conta passa a gravar paciente; o perfil e a imagem feitos como pendente continuam la';

-- CP13 — sem usuario logado (migration, painel, service_role) a trava nao se aplica
reset role;
select pg_temp.sem_usuario();
insert into _logcp select 'CP13 ' || case when pg_temp.cp_tenta('update public.schedule_blocks set motivo = motivo where false') = 'ACEITO'
  then 'ok' else 'FALHOU' end || ': sem auth.uid() (migration/painel/service_role) a trava nao se aplica';

select string_agg(passo, ' | ' order by passo) from _logcp;
