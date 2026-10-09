-- Harness ANAMNESE PRE-CONSULTA (migration 20261014100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh
-- (BEGIN ... ROLLBACK), DEPOIS da migration. Dados ficticios; nada persiste.
reset role;
select set_config('request.jwt.claims', '{}', true);
create temp table _ap (k text primary key, v text) on commit drop;
create temp table _logap (passo text) on commit drop;
grant select, insert, update on _ap, _logap to authenticated, anon;
create or replace function pg_temp.ap_tenta(sql text) returns text language plpgsql as $$
declare h text; m text; c text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text, c = returned_sqlstate;
  return coalesce(nullif(h, ''), c || ':' || m);
end $$;
create or replace function pg_temp.ap_val(sql text) returns text language plpgsql as $$
declare r text;
begin
  execute sql into r;
  return r;
exception when others then
  return 'ERRO:' || sqlerrm;
end $$;
grant execute on all functions in schema pg_temp to authenticated, anon;

-- fixtures: paciente e atendimento da daniel (ativa)
do $$
declare d uuid := (select v::uuid from _aprov where k = 'daniel'); p uuid; e uuid;
begin
  insert into public.patients (nutritionist_id, nome, telefone) values (d, 'Maria Ficticia Teste', '62999990000') returning id into p;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (d, p, now() + interval '2 days') returning id into e;
  insert into _ap values ('d', d::text), ('p', p::text), ('e', e::text), ('r', (select v from _aprov where k = 'rodrigo'));
end $$;

-- AP00 — estrutura: RLS, sem acesso direto do anon, hash sem token puro, gatilhos
insert into _logap select 'AP00 ' || case when (select relrowsecurity from pg_class where oid = 'public.anamnesis_invites'::regclass)
  and not has_table_privilege('anon', 'public.anamnesis_invites', 'select') and not has_table_privilege('anon', 'public.anamnesis_invites', 'insert')
  and not has_table_privilege('authenticated', 'public.anamnesis_invites', 'insert') and not has_table_privilege('authenticated', 'public.anamnesis_invites', 'update')
  and not has_column_privilege('authenticated', 'public.anamnesis_invites', 'token_hash', 'select')
  and exists (select 1 from pg_trigger where tgrelid = 'public.anamnesis_invites'::regclass and tgname = 'exigir_conta_ativa')
  and not has_function_privilege('anon', 'public.criar_convite_anamnese(uuid, uuid, integer, text, text)', 'execute')
  and has_function_privilege('anon', 'public.anamnese_publica_enviar(text, jsonb)', 'execute')
  then 'ok' else 'FALHOU' end || ': RLS ligada; anon sem acesso a tabela; ninguem grava direto; hash fora do alcance da API; trava de conta ativa; anon so nas 3 RPCs publicas';

-- ===================== NUTRICIONISTA cria o convite =====================
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare r jsonb;
begin
  r := public.criar_convite_anamnese((select v::uuid from _ap where k = 'p'), (select v::uuid from _ap where k = 'e'), 7, 'primeira', 'data:image/png;base64,iVBORw0KGgo=');
  insert into _ap values ('tok', r->>'token'), ('id', r->>'id');
end $$;
insert into _logap select 'AP01 ' || case when length((select v from _ap where k = 'tok')) = 43 and (select v from _ap where k = 'tok') ~ '^[A-Za-z0-9_-]+$'
  and (select count(*) from public.anamnesis_invites) = 1 and (select status from public.anamnesis_invites) = 'enviado'
  and (select professional_snapshot->>'logo' from public.anamnesis_invites) like 'data:image/png;base64,%'
  then 'ok' else 'FALHOU' end || ': convite criado: token de 43 caracteres (32 bytes, base64url) devolvido uma vez; status enviado; identidade copiada no convite';
reset role;
insert into _logap select 'AP02 ' || case when (select token_hash from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id'))
    = encode(extensions.digest(convert_to((select v from _ap where k = 'tok'), 'UTF8'), 'sha256'), 'hex')
  and not exists (select 1 from public.anamnesis_invites i where i::text like '%' || (select v from _ap where k = 'tok') || '%')
  then 'ok' else 'FALHOU' end || ': o banco guarda so o sha256 do token; o token puro nao aparece em nenhuma coluna';

-- ===================== OUTRA CONTA =====================
set local role authenticated;
select pg_temp.como_rodrigo();
insert into _logap select 'AP03 ' || case when (select count(*) from public.anamnesis_invites) = 0
  and pg_temp.ap_tenta(format('select public.criar_convite_anamnese(%L::uuid)', (select v from _ap where k = 'p'))) = 'paciente_invalido'
  and pg_temp.ap_tenta(format('select public.revogar_convite_anamnese(%L::uuid)', (select v from _ap where k = 'id'))) = 'convite_invalido'
  then 'ok' else 'FALHOU' end || ': outra nutricionista nao ve, nao cria convite para paciente alheio e nao revoga convite alheio';

-- ===================== PACIENTE (anon) =====================
reset role;
select pg_temp.sem_usuario();
set local role anon;
insert into _ap select 'abrir', public.anamnese_publica_abrir((select v from _ap where k = 'tok'))::text;
insert into _logap select 'AP04 ' || case when ((select v from _ap where k = 'abrir')::jsonb ->> 'estado') = 'aberto'
  and ((select v from _ap where k = 'abrir')::jsonb #>> '{paciente,primeiro_nome}') = 'Maria'
  and ((select v from _ap where k = 'abrir')::jsonb #>> '{profissional,logo}') like 'data:image/png;base64,%'
  and (select v from _ap where k = 'abrir') !~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
  and position('telefone' in (select v from _ap where k = 'abrir')) = 0 and position('Ficticia' in (select v from _ap where k = 'abrir')) = 0
  then 'ok' else 'FALHOU' end || ': link valido abre sem conta: primeiro nome da paciente e identidade da nutricionista; nenhum UUID, sobrenome ou telefone na resposta';
insert into _logap select 'AP05 ' || case when (public.anamnese_publica_abrir('x') ->> 'estado') = 'invalido'
  and (public.anamnese_publica_abrir(repeat('A', 43)) ->> 'estado') = 'invalido'
  and (public.anamnese_publica_abrir(null) ->> 'estado') = 'invalido'
  and (public.anamnese_publica_abrir('''; drop table x; --' || repeat('a', 40)) ->> 'estado') = 'invalido'
  and pg_temp.ap_tenta(format('select public.anamnese_publica_salvar(%L, ''{"formulario":{}}''::jsonb)', repeat('B', 43))) = 'link_invalido'
  then 'ok' else 'FALHOU' end || ': token errado, inventado, nulo ou com injecao: "invalido" (sem dizer se existe outro convite)';
insert into _logap select 'AP06 ' || case when pg_temp.ap_tenta('select count(*) from public.anamnesis_invites') like '42501:%'
  and pg_temp.ap_tenta('select count(*) from public.patients') like '42501:%'
  and pg_temp.ap_tenta('select count(*) from public.anamneses') like '42501:%'
  and pg_temp.ap_tenta('select public.criar_convite_anamnese(gen_random_uuid())') like '42501:%'
  then 'ok' else 'FALHOU' end || ': anonimo nao le convites, pacientes nem anamneses, nem cria convite';
-- rascunho (autosave)
insert into _ap select 'salvo1', pg_temp.ap_tenta(format('select public.anamnese_publica_salvar(%L, %L::jsonb)', (select v from _ap where k = 'tok'),
  '{"formulario":{"motivo":{"motivo":"Cansaco a tarde","objetivo":"<script>alert(1)</script>"},"objetiva":{"peso":"70","peso_unidade":"kg","circunferencias":[{"nome":"cintura","valor":"80"}],"exames":"x"},"hackeado":{"a":1}},"meta":{"motivo.motivo":{"origem":"dado_medido"}},"dominios":{"x":1}}'));
reset role;
insert into _logap select 'AP07 ' || case when (select v from _ap where k = 'salvo1') = 'ACEITO'
  and (select status from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = 'iniciado'
  and (select started_at is not null and last_saved_at is not null from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id'))
  and (select draft_content #>> '{formulario,motivo,motivo}' from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = 'Cansaco a tarde'
  and (select draft_content -> 'formulario' ? 'hackeado' from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = false
  and (select draft_content ? 'meta' or draft_content ? 'dominios' from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = false
  and (select (draft_content #> '{formulario,objetiva}') = '{"peso":"70","peso_unidade":"kg"}'::jsonb from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id'))
  then 'ok' else 'FALHOU' end || ': autosave no servidor: status iniciado; bloco desconhecido, meta, dominios e campos da profissional (circunferencias, exames) descartados; texto guardado como texto';
set local role anon;
insert into _ap select 'reabrir', public.anamnese_publica_abrir((select v from _ap where k = 'tok'))::text;
insert into _logap select 'AP08 ' || case when ((select v from _ap where k = 'reabrir')::jsonb #>> '{rascunho,formulario,motivo,motivo}') = 'Cansaco a tarde'
  and ((select v from _ap where k = 'reabrir')::jsonb ->> 'status') = 'iniciado'
  then 'ok' else 'FALHOU' end || ': fechar e reabrir (outro aparelho): o rascunho volta do servidor';
insert into _logap select 'AP09 ' || case when pg_temp.ap_tenta(format('select public.anamnese_publica_enviar(%L, ''{"formulario":{}}''::jsonb)', (select v from _ap where k = 'tok'))) = 'vazio'
  and pg_temp.ap_tenta(format('select public.anamnese_publica_salvar(%L, ''[1,2]''::jsonb)', (select v from _ap where k = 'tok'))) = 'conteudo_invalido'
  and pg_temp.ap_tenta(format('select public.anamnese_publica_salvar(%L, %L::jsonb)', (select v from _ap where k = 'tok'),
        jsonb_build_object('formulario', jsonb_build_object('motivo', jsonb_build_object('motivo', repeat('x', 80000))))::text)) = 'grande_demais'
  then 'ok' else 'FALHOU' end || ': envio vazio, formato errado e conteudo gigante recusados';
-- envio
insert into _ap select 'enviar', pg_temp.ap_tenta(format('select public.anamnese_publica_enviar(%L, %L::jsonb)', (select v from _ap where k = 'tok'),
  '{"formulario":{"motivo":{"motivo":"Cansaco a tarde","objetivo":"Mais energia"},"contexto":{"emocional":""}}}'));
insert into _ap select 'enviar2', pg_temp.ap_tenta(format('select public.anamnese_publica_enviar(%L, %L::jsonb)', (select v from _ap where k = 'tok'),
  '{"formulario":{"motivo":{"motivo":"OUTRA COISA"}}}'));
insert into _ap select 'salvar2', pg_temp.ap_tenta(format('select public.anamnese_publica_salvar(%L, %L::jsonb)', (select v from _ap where k = 'tok'),
  '{"formulario":{"motivo":{"motivo":"OUTRA COISA"}}}'));
insert into _ap select 'abrir3', public.anamnese_publica_abrir((select v from _ap where k = 'tok'))::text;
reset role;
insert into _logap select 'AP10 ' || case when (select v from _ap where k = 'enviar') = 'ACEITO'
  and (select status from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = 'concluido'
  and (select submitted_content #>> '{formulario,motivo,objetivo}' from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = 'Mais energia'
  and (select draft_content is null from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id'))
  and (select v from _ap where k = 'enviar2') = 'ja_enviada' and (select v from _ap where k = 'salvar2') = 'ja_enviada'
  and ((select v from _ap where k = 'abrir3')::jsonb ->> 'estado') = 'concluido' and position('Mais energia' in (select v from _ap where k = 'abrir3')) = 0
  then 'ok' else 'FALHOU' end || ': enviar congela a resposta (concluido); reenviar, salvar de novo ou reabrir o link nao altera nem mostra a resposta';
insert into _logap select 'AP11 ' || case when pg_temp.ap_tenta(format('update public.anamnesis_invites set submitted_content = ''{}''::jsonb where id = %L', (select v from _ap where k = 'id'))) = 'convite_concluido'
  and pg_temp.ap_tenta(format('delete from public.anamnesis_invites where id = %L', (select v from _ap where k = 'id'))) = 'convite_imutavel'
  then 'ok' else 'FALHOU' end || ': nem o administrador do banco altera ou apaga a resposta enviada (gatilho)';

-- ===================== NUTRICIONISTA ve a resposta, leva para a anamnese =====================
set local role authenticated;
select pg_temp.como_daniel();
insert into _logap select 'AP12 ' || case when (select submitted_content #>> '{formulario,motivo,motivo}' from public.anamnesis_invites) = 'Cansaco a tarde'
  and pg_temp.ap_tenta(format('select public.revogar_convite_anamnese(%L::uuid)', (select v from _ap where k = 'id'))) = 'convite_concluido'
  then 'ok' else 'FALHOU' end || ': a nutricionista le a resposta enviada; convite respondido nao e revogado';
do $$
declare a uuid;
begin
  a := public.salvar_anamnese(jsonb_build_object('encounter_id', (select v from _ap where k = 'e'), 'status', 'rascunho',
        'content', jsonb_build_object('formulario_versao', 2, 'tipo', 'primeira', 'formulario', (select submitted_content -> 'formulario' from public.anamnesis_invites limit 1),
          'dominios', jsonb_build_object('motivo_objetivo', jsonb_build_object('itens', jsonb_build_array(
             jsonb_build_object('campo', 'Motivo da consulta', 'valor', 'Cansaco a tarde', 'estado', 'informado', 'origem', 'relato_paciente', 'medida', null)))))));
  insert into _ap values ('anam', a::text);
end $$;
insert into _ap select 'marcar', pg_temp.ap_tenta(format('select public.marcar_convite_anamnese_usado(%L::uuid, %L::uuid)', (select v from _ap where k = 'id'), (select v from _ap where k = 'anam')));
insert into _logap select 'AP13 ' || case when (select v from _ap where k = 'marcar') = 'ACEITO'
  and (select imported_anamnesis_id::text from public.anamnesis_invites) = (select v from _ap where k = 'anam')
  and (select submitted_content #>> '{formulario,motivo,motivo}' from public.anamnesis_invites) = 'Cansaco a tarde'
  and (select status from public.anamneses where id = (select v::uuid from _ap where k = 'anam')) = 'rascunho'
  then 'ok' else 'FALHOU' end || ': levar para a anamnese do atendimento cria um RASCUNHO (a nutricionista revisa); o relato original continua intacto no convite';

-- ===================== revogar, expirar, novo link =====================
do $$
declare r jsonb; r2 jsonb;
begin
  r := public.criar_convite_anamnese((select v::uuid from _ap where k = 'p'));
  r2 := public.criar_convite_anamnese((select v::uuid from _ap where k = 'p'));
  insert into _ap values ('tok_a', r->>'token'), ('id_a', r->>'id'), ('tok_b', r2->>'token'), ('id_b', r2->>'id');
end $$;
insert into _logap select 'AP14 ' || case when (select status from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id_a')) = 'revogado'
  and (select status from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id_b')) = 'enviado'
  and (select status from public.anamnesis_invites where id = (select v::uuid from _ap where k = 'id')) = 'concluido'
  then 'ok' else 'FALHOU' end || ': gerar novo link revoga o anterior ainda nao respondido (um link valido por paciente); o respondido fica';
select public.revogar_convite_anamnese((select v::uuid from _ap where k = 'id_b'));
reset role;
select pg_temp.sem_usuario();
update public.anamnesis_invites set expires_at = now() - interval '1 minute' where id = (select v::uuid from _ap where k = 'id_a');
do $$
declare r jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', (select v from _ap where k = 'd'), 'role', 'authenticated')::text, true);
  r := public.criar_convite_anamnese((select v::uuid from _ap where k = 'p'), null, 1);
  perform set_config('request.jwt.claims', '{}', true);
  update public.anamnesis_invites set expires_at = now() - interval '1 minute' where id = (r->>'id')::uuid;
  insert into _ap values ('tok_c', r->>'token');
end $$;
set local role anon;
insert into _logap select 'AP15 ' || case when (public.anamnese_publica_abrir((select v from _ap where k = 'tok_a')) ->> 'estado') = 'revogado'
  and (public.anamnese_publica_abrir((select v from _ap where k = 'tok_b')) ->> 'estado') = 'revogado'
  and (public.anamnese_publica_abrir((select v from _ap where k = 'tok_c')) ->> 'estado') = 'expirado'
  and pg_temp.ap_tenta(format('select public.anamnese_publica_salvar(%L, ''{"formulario":{"motivo":{"motivo":"x"}}}''::jsonb)', (select v from _ap where k = 'tok_c'))) = 'link_expirado'
  and pg_temp.ap_tenta(format('select public.anamnese_publica_enviar(%L, ''{"formulario":{"motivo":{"motivo":"x"}}}''::jsonb)', (select v from _ap where k = 'tok_b'))) = 'link_revogado'
  then 'ok' else 'FALHOU' end || ': link revogado e link vencido abrem so o aviso e nao gravam nada';

-- ===================== conta pendente e paciente arquivado =====================
reset role;
select pg_temp.sem_usuario();
do $$
declare q uuid := gen_random_uuid(); pq uuid;
begin
  insert into auth.users (id, email) values (q, 'pend-ap@local.invalid');
  update public.profiles set status = 'ativo' where id = q;
  insert into public.patients (nutritionist_id, nome) values (q, 'AP PACIENTE FICTICIO Q') returning id into pq;
  update public.profiles set status = 'pendente' where id = q;
  update public.patients set status = 'inativo' where id = (select v::uuid from _ap where k = 'p');
  insert into _ap values ('q', q::text), ('pq', pq::text);
end $$;
set local role authenticated;
select pg_temp.como((select v::uuid from _ap where k = 'q'));
insert into _ap select 'pend', pg_temp.ap_tenta(format('select public.criar_convite_anamnese(%L::uuid)', (select v from _ap where k = 'pq')));
select pg_temp.como_daniel();
insert into _ap select 'arq', pg_temp.ap_tenta(format('select public.criar_convite_anamnese(%L::uuid)', (select v from _ap where k = 'p')));
insert into _logap select 'AP16 ' || case when (select v from _ap where k = 'pend') = 'conta_nao_liberada' and (select v from _ap where k = 'arq') = 'paciente_arquivado'
  then 'ok' else 'FALHOU: ' || (select v from _ap where k = 'pend') || ' / ' || (select v from _ap where k = 'arq') end
  || ': conta pendente nao gera link (trava de conta ativa); paciente arquivado nao recebe link';

-- AP17 — nada clinico mudou: HOLOSCAN, ferramentas, Resultado HOLOS e metodologia nao foram tocados por estas funcoes
reset role;
insert into _logap select 'AP17 ' || case when position('holoscan' in lower(pg_get_functiondef('public.anamnese_publica_enviar(text, jsonb)'::regprocedure))) = 0
  and position('tool_applications' in pg_get_functiondef('public.anamnese_publica_enviar(text, jsonb)'::regprocedure)) = 0
  and position('holos_results' in pg_get_functiondef('public.anamnese_publica_enviar(text, jsonb)'::regprocedure)) = 0
  and position('anamneses' in pg_get_functiondef('public.anamnese_publica_enviar(text, jsonb)'::regprocedure)) = 0
  and position('methodology' in pg_get_functiondef('public.criar_convite_anamnese(uuid, uuid, integer, text, text)'::regprocedure)) = 0
  then 'ok' else 'FALHOU' end || ': as funcoes publicas nao tocam HOLOSCAN, ferramentas, Resultado HOLOS, anamneses nem metodologia';

select string_agg(passo, ' | ' order by passo) from _logap;
