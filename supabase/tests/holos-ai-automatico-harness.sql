-- Harness HOLOS AI -> Resultado AUTOMATICO (migration 20261024100000): roda DENTRO da transacao do scripts/validar-cadeia-local.sh,
-- depois do harness da ponte (usa as tabelas temporarias _ha/_logha dele). Dados FICTICIOS; nada persiste.
-- ARQUIVO GERADO: edite scripts/holos-ai-automatico-harness.modelo.sql e rode python3 scripts/gerar-harness-holos-ai.py
--   HA15 aceite automatico: tudo confirmado de uma vez, valor da IA identico, so profissional nunca compartilhado,
--        estrategia "requer decisao profissional na Conduta" fica interna; aceite = automatico
--   HA16 idempotente; descartada nao e aceita; outra nutricionista nao aceita; anonimo nao executa; aceite imutavel
--   HA17 Resultado finalizado direto da importacao aceita (sem revisao item a item): foco confirmado vai; hipotese continua recusada
insert into _logha (passo) select 'HA15a ' || case when
    has_function_privilege('authenticated', 'public.aceitar_importacao_holos_ai(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.aceitar_importacao_holos_ai(uuid)', 'execute')
    and not has_function_privilege('authenticated', 'public.holos_ai_elegivel_paciente(text, jsonb)', 'execute')
  then 'ok' else 'FALHOU' end || ': aceitar_importacao_holos_ai so para authenticated; regra de elegibilidade interna';

select pg_temp.como_daniel();
set local role authenticated;
do $$
declare uid uuid := auth.uid(); p uuid := (select v::uuid from _ha where k = 'p'); h uuid := (select v::uuid from _ha where k = 'h');
  e2 uuid; j jsonb := (select v::jsonb from _ha where k = 'json'); r jsonb; i3 uuid; t text; n_sug int; n_total int;
  idir uuid; ihip uuid; base jsonb; d jsonb; ref_dir jsonb; snap jsonb; r2 uuid; sha_antes text;
begin
  insert into public.encounters (nutritionist_id, patient_id, occurred_at) values (uid, p, now()) returning id into e2;
  -- variante ficticia: a 2a estrategia "requer decisao profissional na Conduta"
  j := jsonb_set(j, '{estrategias,1,classificacao}', '"requer_decisao_profissional_na_conduta"');
  r := public.importar_holos_ai(e2, j::text);
  i3 := (r->>'id')::uuid;
  select texto_sha256 into sha_antes from public.holos_ai_imports where id = i3;
  n_total := (select count(*) from public.holos_ai_import_items where import_id = i3);
  r := public.aceitar_importacao_holos_ai(i3);
  n_sug := (select count(*) from public.holos_ai_import_items where import_id = i3 and estado <> 'confirmado');
  insert into _ha values ('i3', i3::text), ('e2', e2::text);
  insert into _logha (passo) select 'HA15b ' || case when r->>'status' = 'confirmado' and r->>'aceite' = 'automatico' and (r->>'aceitos')::int = n_total and n_sug = 0
      and (select status = 'confirmado' and aceite = 'automatico' and concluida_em is not null and texto_sha256 = sha_antes from public.holos_ai_imports where id = i3)
      and not exists (select 1 from public.holos_ai_import_items where import_id = i3 and (valor_profissional is not null or revisado_em is null))
    then 'ok' else 'FALHOU: ' || r::text end || ': aceite automatico: todos os itens confirmados de uma vez, valor da IA identico, JSON original identico';
  insert into _logha (passo) select 'HA15c ' || case when
      not exists (select 1 from public.holos_ai_import_items where import_id = i3 and so_profissional and compartilhar)
      and not exists (select 1 from public.holos_ai_import_items where import_id = i3 and not so_profissional and not compartilhar
                        and not (secao = 'estrategias' and valor_ia->>'classificacao' = 'requer_decisao_profissional_na_conduta'))
      and exists (select 1 from public.holos_ai_import_items where import_id = i3 and secao = 'estrategias' and chave = 'E2' and not compartilhar)
      and exists (select 1 from public.holos_ai_import_items where import_id = i3 and secao = 'estrategias' and chave = 'E1' and compartilhar)
      and (select count(*) from public.holos_ai_import_items where import_id = i3 and secao in ('alertas_profissionais', 'fontes_utilizadas', 'sintese_integrada', 'convergencias') and compartilhar) = 0
    then 'ok' else 'FALHOU' end || ': regra fixa: so profissional (hipotese, alerta, fonte, sintese, conflito) interno; estrategia que requer decisao na Conduta interna; o resto elegivel';

  -- HA16
  r := public.aceitar_importacao_holos_ai(i3);
  insert into _logha (passo) select 'HA16a ' || case when (r->>'repetida')::boolean and r->>'aceite' = 'automatico'
      and pg_temp.ha_tenta(format('select public.aceitar_importacao_holos_ai(%L::uuid)::text', (select v from _ha where k = 'i2'))) = 'holos_ai_revisao_encerrada'
      and pg_temp.ha_tenta(format('select public.revisar_item_holos_ai(%L::uuid, ''descartado'')::text',
            (select id from public.holos_ai_import_items where import_id = i3 limit 1))) = 'holos_ai_revisao_encerrada'
    then 'ok' else 'FALHOU: ' || r::text end || ': aceitar de novo nao muda nada; importacao descartada nao e aceita; depois do aceite nenhum item muda';

  -- HA17: Resultado finalizado direto (foco = 1o direcionamento, confirmado e para a paciente)
  select id into idir from public.holos_ai_import_items where import_id = i3 and secao = 'direcionamentos' order by ordem limit 1;
  select id into ihip from public.holos_ai_import_items where import_id = i3 and secao = 'pontos_para_aprofundar' order by ordem limit 1;
  ref_dir := jsonb_build_object('tipo', 'holos_ai', 'id', i3, 'campo', idir);
  base := jsonb_build_object('patient_id', p, 'encounter_id', e2, 'holoscan_application_id', h, 'tool_application_ids', '[]'::jsonb,
    'visao_paciente', jsonb_build_object('ferramentas', '{}'::jsonb, 'proximos_passos', false));
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira',
    'foco_atual', jsonb_build_object('texto', 'FOCO_AUTOMATICO', 'origem', 'holos_ai', 'ref', ref_dir, 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true),
    'direcionamentos', jsonb_build_array(jsonb_build_object('id', 'hai-d', 'texto', 'FOCO_AUTOMATICO', 'origem', 'holos_ai', 'ref', ref_dir, 'sugestao', true,
      'confirmado', true, 'mostrar_paciente', true, 'status', 'proposto')));
  t := pg_temp.ha_tenta(format('select public.salvar_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  if t like 'ACEITO:%' then
    r2 := substr(t, 8)::uuid;
    select content_snapshot into snap from public.holos_results where id = r2;
  end if;
  insert into _logha (passo) select 'HA17a ' || case when t like 'ACEITO:%' and snap#>>'{direcao_paciente,foco_atual,texto}' = 'FOCO_AUTOMATICO'
    then 'ok' else 'FALHOU: ' || t end || ': Resultado finalizado direto da importacao aceita (foco confirmado vai para a paciente)';
  d := jsonb_build_object('schema_version', 1, 'tipo', 'primeira', 'padroes', jsonb_build_array(jsonb_build_object('texto', 'HIPOTESE', 'origem', 'holos_ai', 'tipo', 'hipotese',
    'ref', jsonb_build_object('tipo', 'holos_ai', 'id', i3, 'campo', ihip), 'sugestao', true, 'confirmado', true, 'mostrar_paciente', true)));
  t := pg_temp.ha_tenta(format('select public.salvar_rascunho_resultado_holos(%L::jsonb)::text', (base || jsonb_build_object('direcao', d))::text));
  insert into _logha (passo) select 'HA17b ' || case when t = 'holos_ai_so_profissional' then 'ok' else 'FALHOU: ' || t end
    || ': mesmo com aceite automatico, item so profissional marcado para a paciente continua recusado';
end $$;
reset role;

-- HA16b: outra nutricionista / anonimo / aceite imutavel (dono do banco tambem nao troca)
select pg_temp.como_rodrigo();
set local role authenticated;
insert into _ha select 'rod', pg_temp.ha_tenta(format('select public.aceitar_importacao_holos_ai(%L::uuid)::text', (select v from _ha where k = 'i3')));
reset role;
select pg_temp.sem_usuario();
set local role anon;
insert into _ha select 'anon2', pg_temp.ha_tenta(format('select public.aceitar_importacao_holos_ai(%L::uuid)::text', (select v from _ha where k = 'i3')));
reset role;
insert into _ha select 'imut', pg_temp.ha_tenta(format('update public.holos_ai_imports set aceite = ''revisao'' where id = %L::uuid returning id::text', (select v from _ha where k = 'i3')));
insert into _logha (passo) select 'HA16b ' || case when (select v from _ha where k = 'rod') = 'referencia_cruzada'
    and (select v from _ha where k = 'anon2') like '42501:%' and (select v from _ha where k = 'imut') = 'holos_ai_imutavel'
  then 'ok' else 'FALHOU: ' || (select string_agg(k || '=' || v, ' ') from _ha where k in ('rod', 'anon2', 'imut')) end
  || ': outra nutricionista nao aceita; anonimo nao executa; aceite gravado nao muda';

select passo from _logha where passo like 'HA15%' or passo like 'HA16%' or passo like 'HA17%' order by n;
