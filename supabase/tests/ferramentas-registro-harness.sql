-- Harness ETAPA 6.5 (B) — registros clinicos estruturados (migration 20261005110000): roda DENTRO da transacao do
-- scripts/validar-cadeia-local.sh (BEGIN ... ROLLBACK), DEPOIS da migration (e de ferramentas-registro-pre.sql, antes dela).
-- Dados ficticios; nada persiste.
reset role;

-- tenta um comando; devolve 'ACEITO' ou o hint do erro (ou a mensagem)
create or replace function pg_temp.fr_tenta(sql text) returns text language plpgsql as $$
declare h text; m text;
begin
  execute sql;
  return 'ACEITO';
exception when others then
  get stacked diagnostics h = pg_exception_hint, m = message_text;
  return coalesce(nullif(h, ''), m);
end $$;
grant execute on all functions in schema pg_temp to authenticated;
grant execute on function pg_temp.fr_tenta(text) to anon;
grant insert on _logfr to anon;

set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); pa uuid; pb uuid; en uuid; t text; a1 uuid; a2 uuid; a3 uuid; n int; x record;
  rotina jsonb := '{"acorda":"06:30","dorme":"23:00","sono":"acorda cansada","eventos":[{"inicio":"07:00","fim":"07:20","categoria":"refeição","titulo":"café","percepcao":"baixa","dias":["seg","ter"]},{"inicio":"12:00","categoria":"trabalho","titulo":"almoço na mesa","dias":null}],"espacos":"pausa antes do almoço","observacoes":null}';
  episodio jsonb := '{"data":"2026-10-01","horario":"21:30","contexto":"em casa","gatilho":"discussão","pensamento":"não aguento","emocao":"raiva","intensidade":"7","resposta":"come doce","consequencia_imediata":"alívio","consequencia_posterior":"culpa","necessidade":"descanso","observacao_nutri":"recorrente à noite","alternativa":"ligar para a irmã"}';
  rede jsonb := '{"contar":"irmã","espiritualidade":null,"vinculos":[{"rotulo":"Irmã","natureza":"pessoa","tipo":"família","papel":"apoia","proximidade":"próxima","momento":"presente no momento"},{"rotulo":"Grupo de corrida","natureza":"grupo","tipo":"comunidade","papel":"variável","proximidade":"distante","momento":"não presente no momento"}]}';
  ins text := 'insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas, resultado) values (%L, %L, ''1'', %L, %L::jsonb, %s)';
begin
  insert into public.patients (nutritionist_id, nome) values (uid, 'FR TESTE FICTICIO A') returning id into pa;
  insert into public.patients (nutritionist_id, nome) values (uid, 'FR TESTE FICTICIO B') returning id into pb;
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, pa, now()) returning id into en;
  insert into _fr values ('pa', pa::text), ('pb', pb::text);

  -- F01..F03 as tres, validas, aceitas; resultado nulo
  insert into public.tool_applications (patient_id, encounter_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, en, 'mapa_rotina_v1', '1', 'rascunho', rotina) returning id into a1;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, 'gatilhos_respostas_v1', '1', 'rascunho', episodio) returning id into a2;
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas)
    values (pa, 'conexao_pertencimento_v1', '1', 'rascunho', rede) returning id into a3;
  insert into _fr values ('a1', a1::text), ('a2', a2::text), ('a3', a3::text);
  select count(*) into n from public.tool_applications where id in (a1, a2, a3) and resultado is null and nutritionist_id = uid;
  insert into _logfr values ('F01 ' || case when n = 3 then 'ok' else 'FALHOU' end || ': Mapa da Rotina, Gatilhos & Respostas e Conexao & Pertencimento validos aceitos, sem resultado');
  insert into _logfr values ('F02 ' || case when (select respostas from public.tool_applications where id = a1) = rotina
    and (select respostas from public.tool_applications where id = a2) = episodio and (select respostas from public.tool_applications where id = a3) = rede
    then 'ok' else 'FALHOU' end || ': respostas gravadas exatamente como enviadas (eventos, dias, vinculos)');

  -- F03 cada recusa de formato
  t := concat_ws(',',
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"escore":3}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"eventos":[{"categoria":"jejum"}]}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"acorda":"25:00"}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"eventos":[{"dias":["seg","seg"]}]}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"eventos":[{"dias":["segunda"]}]}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"eventos":[{"nivel":"alto"}]}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"eventos":["texto"]}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"eventos":{"a":1}}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', '{"intensidade":"11"}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', '{"intensidade":"7.5"}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', '{"data":"2026-02-31"}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', '{"gatilho":{"x":1}}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', '{"classificacao":"compulsao"}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'conexao_pertencimento_v1', 'rascunho', '{"vinculos":[{"rotulo":"x","papel":"tóxica"}]}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'conexao_pertencimento_v1', 'rascunho', '{"rede":"fraca"}', 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'conexao_pertencimento_v1', 'rascunho', '{}', '''{"isolamento":true}''::jsonb')));
  insert into _logfr values ('F03 ' || case when t = 'registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_formato,registro_resultado'
    then 'ok' else 'FALHOU' end || ': chave desconhecida, opcao fora da lista, horario, dia repetido/invalido, item estranho, intensidade fora de 0-10, data impossivel, objeto no lugar de texto, classificacao e resultado automatico recusados (' || t || ')');

  -- F04 limites: 101 itens e texto acima de 8000 recusados; 100 itens aceitos
  t := concat_ws(',',
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', jsonb_build_object('eventos', (select jsonb_agg(jsonb_build_object('titulo', 'e' || g)) from generate_series(1, 101) g))::text, 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', jsonb_build_object('contexto', repeat('a', 8001))::text, 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', jsonb_build_object('eventos', (select jsonb_agg(jsonb_build_object('titulo', 'e' || g)) from generate_series(1, 100) g))::text, 'null')));
  insert into _logfr values ('F04 ' || case when t = 'registro_formato,registro_formato,ACEITO' then 'ok' else 'FALHOU' end || ': 101 itens e texto acima do limite recusados; 100 itens aceitos (' || t || ')');

  -- F05 texto com marcacao e guardado como texto (escapar e trabalho da tela)
  t := pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', '{"gatilho":"<img src=x onerror=alert(1)>"}', 'null'));
  insert into _logfr values ('F05 ' || case when t = 'ACEITO' and exists (select 1 from public.tool_applications where patient_id = pa and respostas->>'gatilho' = '<img src=x onerror=alert(1)>') then 'ok' else 'FALHOU' end
    || ': texto com marcacao guardado literalmente, sem interpretacao (' || t || ')');

  -- F06 concluir; depois disso respostas/resultado/concluida_em/encounter nao mudam e nao volta a rascunho
  update public.tool_applications set status = 'concluida', concluida_em = now() where id in (a1, a2, a3);
  t := concat_ws(',',
    pg_temp.fr_tenta(format('update public.tool_applications set respostas = %L::jsonb where id = %L', '{"acorda":"07:00"}', a1)),
    pg_temp.fr_tenta(format('update public.tool_applications set respostas = respostas || %L::jsonb where id = %L', '{"emocao":"medo"}', a2)),
    pg_temp.fr_tenta(format('update public.tool_applications set status = ''rascunho'' where id = %L', a3)),
    pg_temp.fr_tenta(format('update public.tool_applications set concluida_em = now() - interval ''1 day'' where id = %L', a1)),
    pg_temp.fr_tenta(format('update public.tool_applications set encounter_id = null where id = %L', a1)));
  insert into _logfr values ('F06 ' || case when t = 'registro_concluido,registro_concluido,registro_concluido,registro_concluido,registro_concluido'
    and (select respostas from public.tool_applications where id = a1) = rotina then 'ok' else 'FALHOU' end
    || ': concluido nao e reescrito (respostas, status, data, atendimento) (' || t || ')');

  -- F07 leitura profissional continua: vira revisada
  update public.tool_applications set leitura = 'nota da profissional', prioridade = 'alta', proximo_passo = 'retomar', status = 'revisada' where id = a2;
  select * into x from public.tool_applications where id = a2;
  insert into _logfr values ('F07 ' || case when x.status = 'revisada' and x.leitura = 'nota da profissional' and x.respostas = episodio then 'ok' else 'FALHOU' end
    || ': leitura, prioridade e proximo passo registrados (revisada), respostas intactas');

  -- F08 nova a partir desta: origem_id da mesma ferramenta e paciente aceito; de outro paciente ou inexistente recusado
  t := concat_ws(',',
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', (rotina || jsonb_build_object('origem_id', a1))::text, 'null')),
    pg_temp.fr_tenta(format(ins, pb, 'mapa_rotina_v1', 'rascunho', jsonb_build_object('origem_id', a1)::text, 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', 'rascunho', jsonb_build_object('origem_id', a1)::text, 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', jsonb_build_object('origem_id', gen_random_uuid())::text, 'null')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', 'rascunho', '{"origem_id":"nao-e-uuid"}', 'null')));
  insert into _logfr values ('F08 ' || case when t = 'ACEITO,registro_formato,registro_formato,registro_formato,registro_formato'
    and (select respostas from public.tool_applications where id = a1) = rotina then 'ok' else 'FALHOU' end
    || ': copia guarda a origem; origem de outro paciente/ferramenta/inexistente recusada; original intacta (' || t || ')');

  -- F09 rascunho continua editavel
  t := pg_temp.fr_tenta(format('update public.tool_applications set respostas = %L::jsonb where patient_id = %L and ferramenta_id = ''gatilhos_respostas_v1'' and status = ''rascunho''', '{"gatilho":"fila do mercado"}', pa));
  insert into _logfr values ('F09 ' || case when t = 'ACEITO' then 'ok' else 'FALHOU' end || ': rascunho continua editavel (' || t || ')');

  -- F10 paciente arquivado: nada novo
  update public.patients set status = 'inativo' where id = pb;
  t := pg_temp.fr_tenta(format(ins, pb, 'conexao_pertencimento_v1', 'rascunho', '{}', 'null'));
  insert into _logfr values ('F10 ' || case when t = 'paciente_arquivado' then 'ok' else 'FALHOU' end || ': paciente arquivado recusa registro novo (' || t || ')');

  -- F11 id desconhecido continua recusado
  t := pg_temp.fr_tenta(format(ins, pa, 'diario_corporal', 'rascunho', '{}', 'null'));
  insert into _logfr values ('F11 ' || case when t like '%ferramenta_valida%' then 'ok' else 'FALHOU' end || ': ferramenta fora da lista continua recusada');
end $$;

-- F12 outra nutricionista nao ve nem altera
select pg_temp.como_rodrigo();
do $$
declare n int; a1 uuid := (select v::uuid from _fr where k = 'a1'); pa uuid := (select v::uuid from _fr where k = 'pa'); t text;
begin
  select count(*) into n from public.tool_applications where id = a1;
  update public.tool_applications set leitura = 'invasao' where id = a1;
  t := pg_temp.fr_tenta(format('insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, ''mapa_rotina_v1'', ''1'', ''{}'')', pa));
  insert into _logfr values ('F12 ' || case when n = 0 and t <> 'ACEITO' then 'ok' else 'FALHOU' end || ': outra nutricionista nao ve, nao altera e nao cria no paciente alheio (' || left(t, 40) || ')');
end $$;
reset role;
insert into _logfr select 'F12b ' || case when (select leitura from public.tool_applications where id = (select v::uuid from _fr where k = 'a1')) is null then 'ok' else 'FALHOU' end || ': leitura do registro alheio intacta';

-- F13 anon: sem acesso
set local role anon;
do $$
declare t text;
begin
  t := pg_temp.fr_tenta('select count(*) from public.tool_applications');
  insert into _logfr values ('F13 ' || case when t <> 'ACEITO' then 'ok' else 'FALHOU' end || ': anon sem acesso a tool_applications (' || left(t, 40) || ')');
end $$;
reset role;

-- F14 nao interferencia: tudo o que existia antes da migration esta identico
do $$
declare ids text := (select v from _fr where k = 'n_tools');
begin
  insert into _logfr values ('F14 ' || case when
    (select md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) from public.tool_applications t
       where t.ferramenta_id not in ('mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1')) = (select v from _fr where k = 'tools')
    and (select count(*)::text from public.tool_applications where ferramenta_id not in ('mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1')) = ids
    and (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a) = (select v from _fr where k = 'holoscan')
    and (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s) = (select v from _fr where k = 'scores')
    and (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r) = (select v from _fr where k = 'answers')
    and (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p) = (select v from _fr where k = 'pacotes')
    and (select md5(coalesce(string_agg(to_jsonb(l)::text, ';' order by l.id), '')) from public.integrated_reading_rule_packages l) = (select v from _fr where k = 'li')
    and (select md5(coalesce(string_agg(to_jsonb(i)::text, ';' order by i.id), '')) from public.integrated_readings i) = (select v from _fr where k = 'readings')
    then 'ok' else 'FALHOU' end || ': aplicacoes das outras ferramentas (' || ids || '), HOLOSCAN (aplicacoes, scores, respostas), pacotes e Leitura Integrada identicos');
end $$;

-- F15 as outras ferramentas nao ganharam regra nova: oq3 concluido continua editavel e aceita resultado
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare uid uuid := auth.uid(); pa uuid := (select v::uuid from _fr where k = 'pa'); a uuid; t text;
begin
  insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas, resultado, concluida_em)
    values (pa, 'oq3', '1', 'concluida', '{"qualquer":"coisa"}', '{"x":1}', now()) returning id into a;
  t := pg_temp.fr_tenta(format('update public.tool_applications set respostas = %L::jsonb where id = %L', '{"outra":"chave"}', a));
  insert into _logfr values ('F15 ' || case when t = 'ACEITO' then 'ok' else 'FALHOU' end || ': OQ3 (e as outras 5) sem mudanca de comportamento (' || t || ')');
end $$;
reset role;

-- F17 IDs ANTIGOS (schema antigo) continuam proibidos, com payload antigo completo OU parcial; F18 versao_ferramenta = 1
set local role authenticated;
select pg_temp.como_daniel();
do $$
declare pa uuid := (select v::uuid from _fr where k = 'pa'); t text;
  ins text := 'insert into public.tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas) values (%L, %L, %L, ''concluida'', %L::jsonb)';
begin
  t := concat_ws(',',
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina', '0', '{"eventos":[{"inicio":"07:00","tipo":"Refeição","fome":"6"}],"barreira":"x"}')),
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina', '1', '{"eventos":[{"inicio":"07:00","titulo":"café"}]}')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas', '0', '{"gatilho1":"briga","resposta1":"doce"}')),
    pg_temp.fr_tenta(format(ins, pa, 'conexao_pertencimento', '0', '{"sustentam":"irmã","pertence":"igreja"}')),
    pg_temp.fr_tenta(format(ins, pa, 'conexao_pertencimento', '1', '{"pertence":"igreja"}')));
  insert into _logfr values ('F17 ' || case when t !~ 'ACEITO' and (select count(*) from regexp_matches(t, 'ferramenta_valida', 'g')) = 5 then 'ok' else 'FALHOU' end
    || ': IDs antigos (mapa_rotina, gatilhos_respostas, conexao_pertencimento) recusados pela constraint, com payload antigo completo e parcial');
  t := concat_ws(',',
    pg_temp.fr_tenta(format(ins, pa, 'mapa_rotina_v1', '0', '{}')),
    pg_temp.fr_tenta(format(ins, pa, 'gatilhos_respostas_v1', '2', '{}')),
    pg_temp.fr_tenta(format(ins, pa, 'conexao_pertencimento_v1', '1', '{}')));
  insert into _logfr values ('F18 ' || case when t = 'registro_versao,registro_versao,ACEITO' then 'ok' else 'FALHOU' end || ': IDs novos so com versao_ferramenta = 1 (' || t || ')');
end $$;
reset role;

-- F16 as opcoes do servidor (registro_clinico_opcoes) — comparadas com ferramentas.js pelo teste JS
insert into _logfr select 'F16 ' || case when jsonb_typeof(public.registro_clinico_opcoes()) = 'object'
  and (select count(*) from jsonb_object_keys(public.registro_clinico_opcoes())) = 8 then 'ok' else 'FALHOU' end || ': 8 listas de opcoes descritivas no servidor';

select string_agg(passo, ' | ' order by passo) from _logfr;
