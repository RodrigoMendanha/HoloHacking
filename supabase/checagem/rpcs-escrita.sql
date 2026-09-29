-- Checagem das RPCs de escrita contra o banco REAL, numa transacao desfeita.
--
-- Os testes (npm run teste) usam testes/supabase-falso.mjs, que reimplementa
-- as RPCs em JS e nunca executa o SQL do Postgres. Foi assim que o 42703
-- (record "r" has no field "elem") chegou a producao. Este arquivo roda o SQL
-- de verdade.
--
-- Como: supabase/checagem/checar-rpcs.sh (ver RELEASE-STATE.md). Tudo roda
-- entre BEGIN e ROLLBACK: nada fica gravado. Qualquer erro aborta a transacao
-- e o psql sai com codigo diferente de zero (ON_ERROR_STOP).
--
-- Chama cada RPC como uma nutricionista de verdade (papel authenticated +
-- claims com o uid dela), usando o primeiro paciente que existir no banco.

\set ON_ERROR_STOP on

begin;

-- alvo: um paciente e a nutricionista dona dele (so ids)
create temp table _checagem_alvo on commit drop as
  select nutritionist_id as uid, id as pid
  from public.patients
  order by created_at
  limit 1;
grant select on _checagem_alvo to authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object('sub', uid, 'role', 'authenticated')::text,
  true)
from _checagem_alvo;

set local role authenticated;

do $$
declare
  v_uid uuid;
  v_pid uuid;
  v_app uuid;
  v_app2 uuid;
  v_col uuid;
  v_col2 uuid;
  n int;
  app_payload jsonb;
  score jsonb := jsonb_build_object(
    'sistema','fungico','nome','Fungico','nota',1,'carga',1,'faixa','baixo',
    'obtido',2,'maximo',3,'respondidos',1,'total_marcadores',1,'avaliavel',true);
  resultado jsonb := jsonb_build_object(
    'exame_id','checagem_exame','valor',90,'unidade_no_momento','mg/dL',
    'ideal_min_no_momento',70,'ideal_max_no_momento',99,
    'nome_exame_no_momento','Checagem','sistema_no_momento','metabolico');
begin
  select uid, pid into v_uid, v_pid from _checagem_alvo;
  if v_pid is null then
    raise exception 'CHECAGEM: nenhum paciente no banco para servir de alvo';
  end if;
  if auth.uid() is distinct from v_uid then
    raise exception 'CHECAGEM: claims nao aplicadas (auth.uid() vazio)';
  end if;

  app_payload := jsonb_build_object(
    'patient_id', v_pid, 'quando', '1900-01-01', 'versao_estrutura', 1,
    'versao_bancos', 'checagem', 'indice', 1, 'indice_maximo', 10,
    'avaliavel', true, 'nota_media', 1,
    'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', '{}'::jsonb);

  -- 1. salvar_holoscan_completo
  v_app := public.salvar_holoscan_completo(jsonb_build_object(
    'application', app_payload,
    'answers', jsonb_build_array(jsonb_build_object('marcador_id','checagem_m1','valor',2)),
    'scores', jsonb_build_array(score)));
  select count(*) into n from public.holoscan_answers where application_id = v_app;
  if n <> 1 then raise exception 'CHECAGEM salvar_holoscan_completo: % respostas (esperado 1)', n; end if;
  select count(*) into n from public.holoscan_system_scores where application_id = v_app;
  if n <> 1 then raise exception 'CHECAGEM salvar_holoscan_completo: % scores (esperado 1)', n; end if;
  raise notice 'ok salvar_holoscan_completo';

  -- 2. salvar_holoscope_completo (nome antigo, delega para a de cima)
  v_app2 := public.salvar_holoscope_completo(jsonb_build_object(
    'application', app_payload,
    'answers', jsonb_build_array(jsonb_build_object('marcador_id','checagem_m1','valor',1)),
    'scores', jsonb_build_array(score)));
  select count(*) into n from public.holoscan_answers where application_id = v_app2;
  if n <> 1 then raise exception 'CHECAGEM salvar_holoscope_completo: % respostas (esperado 1)', n; end if;
  raise notice 'ok salvar_holoscope_completo';

  -- 3. salvar_coleta_exames, coleta com data
  v_col := public.salvar_coleta_exames(jsonb_build_object(
    'collection', jsonb_build_object('patient_id', v_pid, 'coletado_em', '1900-01-01',
                                     'data_coleta_desconhecida', false, 'laboratorio', 'checagem'),
    'results', jsonb_build_array(resultado)));
  select count(*) into n from public.lab_results where collection_id = v_col;
  if n <> 1 then raise exception 'CHECAGEM salvar_coleta_exames (com data): % resultados (esperado 1)', n; end if;
  raise notice 'ok salvar_coleta_exames com data';

  -- 4. salvar_coleta_exames, data desconhecida
  v_col2 := public.salvar_coleta_exames(jsonb_build_object(
    'collection', jsonb_build_object('patient_id', v_pid, 'data_coleta_desconhecida', true,
                                     'laboratorio', 'checagem'),
    'results', jsonb_build_array(resultado)));
  select count(*) into n from public.lab_results where collection_id = v_col2;
  if n <> 1 then raise exception 'CHECAGEM salvar_coleta_exames (sem data): % resultados (esperado 1)', n; end if;
  raise notice 'ok salvar_coleta_exames sem data';
end
$$;

select 'CHECAGEM OK: 4 chamadas de RPC gravaram o esperado (sera desfeito)' as resultado;

rollback;
