-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.5 — CORRECAO P0: APLICACAO HOLOSCAN SO OFICIAL (migration 20261005100000)
-- Projeto alvo: Holohacking (sllhyymeeyoozokgbnuv). Executar INTEIRO, de uma vez, no SQL Editor (nada selecionado; Ctrl+End = COMMIT;).
-- Achado: o front calculava pelo motor LEGADO e gravava com o carimbo HOLOS-V1@2. A partir daqui o servidor so aceita aplicacao
-- OFICIAL (pacote aprovado e vigente, hash homologado, motor/contrato, contagens pelos vinculos primarios, sem combinacoes).
-- UMA transacao: guarda do estado real atual -> migration 20261005100000 -> 1 linha em supabase_migrations.schema_migrations
-- -> verificacao pos-aplicacao -> COMMIT. Qualquer falha aborta tudo: nada persiste.
-- Antes: backup/snapshot e supabase/ETAPA6-5-PREFLIGHT.sql com pode_aplicar = true. Depois: supabase/ETAPA6-5-POSTFLIGHT.sql.
-- NAO toca as 4 aplicacoes historicas (sem backfill), seus scores e respostas, HOLOS-V1@2, LI-V1@2, aprovacoes, snapshots, exames.
-- Nenhum uid, e-mail ou dado clinico e impresso.
-- ============================================================================
BEGIN;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local idle_in_transaction_session_timeout = '60s';

-- ---------------------------------------------------------------------------
-- GUARDA (dentro da transacao): o banco tem de estar EXATAMENTE no estado real conferido (pos 6.3-E, deploy 6.4)
-- ---------------------------------------------------------------------------
create temp table _etapa65_digitais (k text primary key, antes text not null) on commit drop;
do $guarda$
declare f jsonb; esperado jsonb := '{"hist_n":31,"hist_ultima":"20261003100000","n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":323,"holos":"HOLOS-V1@2:aprovado:aprovador_unico","holos_hash":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_content_hash_homologado":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_vigencia":"2026-10-03..","li":"LI-V1@1:rascunho,LI-V1@2:aprovado","li_hash":"fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9","holoscan_applications":4,"apps_com_proveniencia":0,"apps_novas":0,"historicas_fingerprint":"205812d8e238e293fe8b58205ffa5631","holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"leituras":0}'::jsonb; k text; dif text := '';
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '20261005100000') then
    raise exception 'ETAPA 6.5 ABORTADA NA GUARDA: a versao 20261005100000 ja esta registrada (segunda execucao?)' using errcode = 'P0001', hint = 'etapa6_5_guarda';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name = 'calculation_mode') then
    raise exception 'ETAPA 6.5 ABORTADA NA GUARDA: holoscan_applications.calculation_mode ja existe' using errcode = 'P0001', hint = 'etapa6_5_guarda';
  end if;
  select jsonb_build_object(
    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'holos', (select string_agg(code || '@' || version || ':' || status || ':' || coalesce(governance_regime, '-'), ',') from public.methodology_packages),
    'holos_hash', (select public.metodologia_hash_conteudo(id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_content_hash_homologado', (select content_hash from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_vigencia', (select effective_from::text || '..' || coalesce(effective_to::text, '') from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'li', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
    'li_hash', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
    'apps_novas', (select count(*) from public.holoscan_applications where created_at >= '2026-10-03'),
    'historicas_fingerprint', (select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from public.holoscan_applications where created_at < '2026-10-03'),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'leituras', (select count(*) from public.integrated_readings)
  ) into f;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  if dif <> '' then raise exception 'ETAPA 6.5 ABORTADA NA GUARDA: estado divergente do conferido -> %', dif using errcode = 'P0001', hint = 'etapa6_5_guarda'; end if;
  insert into _etapa65_digitais (k, antes) values
    ('apps', (select md5(coalesce(string_agg(concat_ws('|', a.id, a.nutritionist_id, a.patient_id, a.encounter_id, a.quando, a.versao_estrutura, a.versao_bancos, a.indice, a.indice_maximo, a.avaliavel, a.nota_media, a.triada, a.triada_com_dado, a.cobertura, a.combinacoes, a.aprofundamentos, a.interpretacao_texto, a.interpretacao_em, a.interpretacao_versao, a.methodology_package_id, a.methodology_package_version, a.created_at, a.updated_at), ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('respostas', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r)),
    ('holos_pacote', (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('holos_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_registro', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_homologation_records x)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r)),
    ('li_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_approvals x)),
    ('li_snapshot', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_snapshots x)),
    ('exames', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r));
  raise notice 'ETAPA 6.5: guarda ok (31 migrations; HOLOS-V1@2 e LI-V1@2 aprovados; 4 aplicacoes historicas sem proveniencia; 0 aplicacoes novas)';
end $guarda$;

-- ---------------------------------------------------------------------------
-- MIGRATION: 20261005100000_holoscan_oficial_v1.sql
-- ---------------------------------------------------------------------------
-- ============================================================================
-- HOLOHACKING V1 — CORRECAO P0 (pos-deploy 6.4): APLICACAO HOLOSCAN SO OFICIAL
-- ============================================================================
-- Achado: o front calculava o mapa pelo motor LEGADO e gravava a aplicacao com
-- methodology_package_id do HOLOS-V1@2 (resultado legado + carimbo V1@2). O
-- front passa a calcular pelo MotorMetodologico (modo oficial); esta migration
-- faz o SERVIDOR recusar qualquer aplicacao nova que nao seja oficial.
--
-- O que muda:
--   1. holoscan_applications ganha a proveniencia do CALCULO (anulaveis; as
--      historicas ficam nulas — sem backfill): methodology_content_hash,
--      engine_version, engine_contract_version, calculation_mode ('oficial').
--   2. indice e nota_media passam a aceitar NULL — so para aplicacao oficial
--      (Indice V1 nao existe sem os cinco sistemas avaliaveis; sem Indice
--      parcial). Linha sem pacote continua exigindo indice e nota_media.
--   3. BEFORE INSERT: toda aplicacao nova exige pacote aprovado, vigente na data
--      clinica, versao e hash do pacote, modo oficial e contrato do motor.
--   4. salvar_holoscan_completo (mesma assinatura): nivel 1 (proveniencia,
--      inclusive recalculo do hash do conteudo) + nivel 2 (conferencia
--      estrutural, so contagem: respostas dentro do pacote e da escala, uma
--      nota por sistema do pacote, respondidos/total pelos vinculos PRIMARIOS
--      — secondary_contextual nao conta —, cobertura, Indice so com todos os
--      sistemas avaliaveis, combinacoes/aprofundamentos vazios). Nenhuma regra
--      clinica e recalculada em SQL (nota, faixa, Indice, Triada ficam com o
--      motor JS: refaze-los aqui seria um segundo motor).
--   5. Escrita direta (PostgREST) em holoscan_applications/answers/scores deixa
--      de existir: o unico caminho de gravacao e a RPC. Nenhum cliente fazia
--      insert direto nessas tabelas.
--   6. Os campos novos entram no snapshot imutavel.
--
-- O que NAO muda: as 4 aplicacoes historicas, seus 20 scores e respostas (as
-- linhas nao sao tocadas), HOLOS-V1@2, LI-V1@2, aprovacoes, snapshots.
-- ============================================================================

-- 1. proveniencia do calculo ---------------------------------------------------
alter table public.holoscan_applications add column if not exists methodology_content_hash text;
alter table public.holoscan_applications add column if not exists engine_version text;
alter table public.holoscan_applications add column if not exists engine_contract_version text;
alter table public.holoscan_applications add column if not exists calculation_mode text;

alter table public.holoscan_applications drop constraint if exists holoscan_applications_modo_valido;
alter table public.holoscan_applications add constraint holoscan_applications_modo_valido
  check (calculation_mode is null or calculation_mode = 'oficial');
alter table public.holoscan_applications drop constraint if exists holoscan_applications_oficial_coerente;
alter table public.holoscan_applications add constraint holoscan_applications_oficial_coerente
  check (calculation_mode is null or (methodology_package_id is not null and methodology_package_version is not null
         and methodology_content_hash is not null and engine_version is not null and engine_contract_version is not null));

-- 2. ausencia explicita do Indice (so aplicacao oficial) -----------------------
alter table public.holoscan_applications alter column indice drop not null;
alter table public.holoscan_applications alter column nota_media drop not null;
alter table public.holoscan_applications drop constraint if exists holoscan_applications_indice_presente;
alter table public.holoscan_applications add constraint holoscan_applications_indice_presente
  check (coalesce(calculation_mode, '') = 'oficial' or (indice is not null and nota_media is not null));

-- 2b. faixas do pacote oficial ----------------------------------------------
-- holoscan_system_scores_faixa_valida so aceitava os rotulos do motor legado (baixo/medio/alto): uma aplicacao
-- oficial (faixas do HOLOS-V1: baixa/intermediaria/alta) seria recusada. Os rotulos legados continuam aceitos
-- (scores historicos intactos); a RPC confere que a faixa de cada sistema e um rotulo das faixas do PACOTE.
alter table public.holoscan_system_scores drop constraint if exists holoscan_system_scores_faixa_valida;
alter table public.holoscan_system_scores add constraint holoscan_system_scores_faixa_valida
  check (faixa in ('baixo', 'medio', 'alto', 'baixa', 'intermediaria', 'alta'));

-- 3. toda aplicacao NOVA e oficial ---------------------------------------------
create or replace function public.exigir_aplicacao_holoscan_oficial()
returns trigger language plpgsql set search_path = '' as $$
declare pk record;
begin
  if new.methodology_package_id is null or new.methodology_package_version is null then
    raise exception 'proveniencia metodologica obrigatoria: aplicacao HOLOSCAN nova exige o pacote metodologico oficial (sem proveniencia nao se grava)'
      using errcode = 'P0001', hint = 'proveniencia_obrigatoria';
  end if;
  if new.calculation_mode is distinct from 'oficial' then
    raise exception 'resultado oficial obrigatorio: a aplicacao HOLOSCAN nova tem de vir do motor oficial (calculation_mode = oficial)'
      using errcode = 'P0001', hint = 'modo_nao_oficial';
  end if;
  select p.version, p.status, p.effective_from, p.effective_to, p.content_hash into pk
    from public.methodology_packages p where p.id = new.methodology_package_id;
  if not found then
    raise exception 'pacote metodologico % nao existe', new.methodology_package_id using errcode = 'P0002', hint = 'pacote_inexistente';
  end if;
  if pk.version <> new.methodology_package_version then
    raise exception 'versao declarada (%) nao e a versao do pacote (%)', new.methodology_package_version, pk.version
      using errcode = 'P0001', hint = 'proveniencia_incoerente';
  end if;
  if pk.status <> 'aprovado' then
    raise exception 'pacote metodologico nao aprovado (status %): nao produz aplicacao oficial', pk.status
      using errcode = 'P0001', hint = 'pacote_nao_aprovado';
  end if;
  if new.quando is null or pk.effective_from is null or pk.effective_from > new.quando
     or (pk.effective_to is not null and pk.effective_to < new.quando) then
    raise exception 'pacote metodologico nao vigente em %', new.quando using errcode = 'P0001', hint = 'pacote_nao_vigente';
  end if;
  if new.methodology_content_hash is null or pk.content_hash is null or new.methodology_content_hash <> pk.content_hash then
    raise exception 'hash do pacote metodologico divergente do homologado' using errcode = 'P0001', hint = 'hash_divergente';
  end if;
  return new;
end $$;
drop trigger if exists holoscan_applications_exigir_oficial on public.holoscan_applications;
create trigger holoscan_applications_exigir_oficial before insert on public.holoscan_applications
  for each row execute function public.exigir_aplicacao_holoscan_oficial();

-- 6. snapshot imutavel cobre os campos novos -----------------------------------
CREATE OR REPLACE FUNCTION public.proteger_snapshot_holoscan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.nutritionist_id       IS DISTINCT FROM old.nutritionist_id
  OR new.patient_id            IS DISTINCT FROM old.patient_id
  OR new.encounter_id          IS DISTINCT FROM old.encounter_id
  OR new.methodology_package_id IS DISTINCT FROM old.methodology_package_id
  OR new.methodology_package_version IS DISTINCT FROM old.methodology_package_version
  OR new.methodology_content_hash IS DISTINCT FROM old.methodology_content_hash
  OR new.engine_version        IS DISTINCT FROM old.engine_version
  OR new.engine_contract_version IS DISTINCT FROM old.engine_contract_version
  OR new.calculation_mode      IS DISTINCT FROM old.calculation_mode
  OR new.quando                IS DISTINCT FROM old.quando
  OR new.versao_estrutura      IS DISTINCT FROM old.versao_estrutura
  OR new.versao_bancos         IS DISTINCT FROM old.versao_bancos
  OR new.indice                IS DISTINCT FROM old.indice
  OR new.indice_maximo         IS DISTINCT FROM old.indice_maximo
  OR new.avaliavel             IS DISTINCT FROM old.avaliavel
  OR new.nota_media            IS DISTINCT FROM old.nota_media
  OR new.triada                IS DISTINCT FROM old.triada
  OR new.triada_com_dado       IS DISTINCT FROM old.triada_com_dado
  OR new.cobertura             IS DISTINCT FROM old.cobertura
  OR new.combinacoes           IS DISTINCT FROM old.combinacoes
  OR new.aprofundamentos       IS DISTINCT FROM old.aprofundamentos
  THEN
    RAISE EXCEPTION 'campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id, o pacote metodologico e a proveniencia do calculo); '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  END IF;
  RETURN new;
END;
$$;

-- 5. o unico caminho de gravacao e a RPC ---------------------------------------
drop policy if exists holoscan_applications_insert_proprios on public.holoscan_applications;
drop policy if exists holoscan_system_scores_insert_proprios on public.holoscan_system_scores;
drop policy if exists holoscan_answers_insert_proprios on public.holoscan_answers;

-- 4. a RPC ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record; triada_norm jsonb;
  mp_id uuid; mp_ver integer; pk record; v_quando date; v_hash text;
  n_resp integer; n_perg integer; n_sist integer; v_resp integer; v_tot integer; v_todos boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL
     OR jsonb_typeof(ans_data) <> 'array' OR jsonb_typeof(sc_data) <> 'array' THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;

  -- ---- nivel 1: proveniencia (declarada pelo cliente, conferida aqui; nunca inferida) ----
  mp_id := NULLIF(app_data->>'methodology_package_id', '')::uuid;
  mp_ver := NULLIF(app_data->>'methodology_package_version', '')::integer;
  v_hash := NULLIF(app_data->>'methodology_content_hash', '');
  v_quando := NULLIF(app_data->>'quando', '')::date;
  IF mp_id IS NULL OR mp_ver IS NULL THEN
    RAISE EXCEPTION 'proveniencia metodologica obrigatoria: aplicacao HOLOSCAN nova exige o pacote metodologico oficial (id e versao)' USING errcode = 'P0001', hint = 'proveniencia_obrigatoria';
  END IF;
  IF app_data->>'calculation_mode' IS DISTINCT FROM 'oficial' THEN
    RAISE EXCEPTION 'resultado oficial obrigatorio: calculation_mode deve ser oficial (resultado do motor legado ou de homologacao nao e gravado)' USING errcode = 'P0001', hint = 'modo_nao_oficial';
  END IF;
  IF app_data->>'engine_contract_version' IS DISTINCT FROM 'holoscan-motor-contrato-v1' OR NULLIF(app_data->>'engine_version', '') IS NULL THEN
    RAISE EXCEPTION 'resultado oficial obrigatorio: motor ou contrato do motor desconhecido' USING errcode = 'P0001', hint = 'motor_desconhecido';
  END IF;
  IF NULLIF(app_data->>'encounter_id', '') IS NULL THEN
    RAISE EXCEPTION 'aplicacao oficial exige atendimento (encounter_id)' USING errcode = 'P0001', hint = 'sem_atendimento';
  END IF;
  SELECT p.version, p.status, p.effective_from, p.effective_to, p.content_hash INTO pk FROM public.methodology_packages p WHERE p.id = mp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pacote metodologico % nao existe', mp_id USING errcode = 'P0002', hint = 'pacote_inexistente'; END IF;
  IF pk.version <> mp_ver THEN RAISE EXCEPTION 'versao declarada (%) nao e a versao do pacote (%)', mp_ver, pk.version USING errcode = 'P0001', hint = 'proveniencia_incoerente'; END IF;
  IF pk.status <> 'aprovado' THEN RAISE EXCEPTION 'pacote metodologico nao aprovado (status %): nao produz aplicacao oficial', pk.status USING errcode = 'P0001', hint = 'pacote_nao_aprovado'; END IF;
  IF v_quando IS NULL OR pk.effective_from IS NULL OR pk.effective_from > v_quando OR (pk.effective_to IS NOT NULL AND pk.effective_to < v_quando) THEN
    RAISE EXCEPTION 'pacote metodologico nao vigente em %', v_quando USING errcode = 'P0001', hint = 'pacote_nao_vigente';
  END IF;
  IF v_hash IS NULL OR pk.content_hash IS NULL OR v_hash <> pk.content_hash THEN
    RAISE EXCEPTION 'hash do pacote metodologico divergente do homologado' USING errcode = 'P0001', hint = 'hash_divergente';
  END IF;
  IF public.metodologia_hash_conteudo(mp_id) IS DISTINCT FROM pk.content_hash THEN
    RAISE EXCEPTION 'conteudo do pacote metodologico difere do hash homologado' USING errcode = 'P0001', hint = 'hash_divergente';
  END IF;

  -- ---- nivel 2: conferencia estrutural (so contagem; nenhuma regra clinica refeita aqui) ----
  n_resp := jsonb_array_length(ans_data);
  IF n_resp = 0 THEN RAISE EXCEPTION 'resultado oficial sem respostas' USING errcode = 'P0001', hint = 'sem_respostas'; END IF;
  IF (SELECT count(DISTINCT e.value->>'marcador_id') FROM jsonb_array_elements(ans_data) AS e(value)) <> n_resp THEN
    RAISE EXCEPTION 'resposta duplicada para a mesma pergunta' USING errcode = 'P0001', hint = 'resposta_duplicada';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(ans_data) AS e(value)
        JOIN public.methodology_questions q ON q.package_id = mp_id AND q.stable_id = e.value->>'marcador_id'
        JOIN public.methodology_scales s ON s.package_id = mp_id AND s.code = q.scale_code
       WHERE jsonb_typeof(e.value->'valor') = 'number'
         AND (e.value->>'valor')::numeric = trunc((e.value->>'valor')::numeric)
         AND (e.value->>'valor')::numeric BETWEEN s.min_value AND s.max_value) <> n_resp THEN
    RAISE EXCEPTION 'resposta fora do pacote metodologico ou fora da escala do item' USING errcode = 'P0001', hint = 'resposta_invalida';
  END IF;
  SELECT count(*) INTO n_perg FROM public.methodology_questions q WHERE q.package_id = mp_id;
  IF (app_data->'cobertura'->>'respondidos') IS DISTINCT FROM n_resp::text OR (app_data->'cobertura'->>'total') IS DISTINCT FROM n_perg::text THEN
    RAISE EXCEPTION 'contagem de cobertura divergente das respostas enviadas' USING errcode = 'P0001', hint = 'contagem_divergente';
  END IF;
  SELECT count(*) INTO n_sist FROM public.methodology_systems y WHERE y.package_id = mp_id;
  IF jsonb_array_length(sc_data) <> n_sist
     OR (SELECT count(DISTINCT e.value->>'sistema') FROM jsonb_array_elements(sc_data) AS e(value)
          WHERE EXISTS (SELECT 1 FROM public.methodology_systems y WHERE y.package_id = mp_id AND y.code = e.value->>'sistema')) <> n_sist THEN
    RAISE EXCEPTION 'as notas devem cobrir exatamente os sistemas do pacote metodologico' USING errcode = 'P0001', hint = 'sistemas_divergentes';
  END IF;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(sc_data) AS e(value) LOOP
    SELECT count(*) INTO v_tot FROM public.methodology_associations x
     WHERE x.package_id = mp_id AND x.destination_type = 'system' AND x.role = 'primaria' AND x.destination_id = r.v->>'sistema';
    SELECT count(*) INTO v_resp FROM jsonb_array_elements(ans_data) AS e(value)
      JOIN public.methodology_associations x ON x.package_id = mp_id AND x.destination_type = 'system' AND x.role = 'primaria'
       AND x.destination_id = r.v->>'sistema' AND x.question_stable_id = e.value->>'marcador_id';
    IF (r.v->>'respondidos') IS DISTINCT FROM v_resp::text OR (r.v->>'total_marcadores') IS DISTINCT FROM v_tot::text THEN
      RAISE EXCEPTION 'contagem do sistema % divergente dos vinculos primarios do pacote (vinculo secundario nao pontua)', r.v->>'sistema' USING errcode = 'P0001', hint = 'contagem_divergente';
    END IF;
    IF jsonb_typeof(r.v->'avaliavel') <> 'boolean' THEN
      RAISE EXCEPTION 'sistema % sem indicacao de avaliabilidade', r.v->>'sistema' USING errcode = 'P0001', hint = 'nota_incoerente';
    END IF;
    IF (r.v->>'avaliavel')::boolean THEN
      IF (r.v->>'nota') IS NULL OR (r.v->>'nota')::numeric < 0 OR (r.v->>'nota')::numeric > 10 OR (r.v->>'faixa') IS NULL THEN
        RAISE EXCEPTION 'sistema % avaliavel sem nota 0..10 ou sem faixa', r.v->>'sistema' USING errcode = 'P0001', hint = 'nota_incoerente';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.methodology_ranges f WHERE f.package_id = mp_id AND f.destination_type = 'system'
                      AND f.destination_id = r.v->>'sistema' AND f.label = r.v->>'faixa') THEN
        RAISE EXCEPTION 'faixa % do sistema % nao e uma faixa do pacote metodologico', r.v->>'faixa', r.v->>'sistema' USING errcode = 'P0001', hint = 'faixa_fora_do_pacote';
      END IF;
    ELSIF (r.v->>'nota') IS NOT NULL OR (r.v->>'faixa') IS NOT NULL THEN
      RAISE EXCEPTION 'sistema % nao avaliavel nao tem nota nem faixa (ausencia nao e zero)', r.v->>'sistema' USING errcode = 'P0001', hint = 'nota_incoerente';
    END IF;
  END LOOP;
  v_todos := NOT EXISTS (SELECT 1 FROM jsonb_array_elements(sc_data) AS e(value) WHERE NOT (e.value->>'avaliavel')::boolean);
  IF (app_data->>'indice' IS NULL) = v_todos THEN
    RAISE EXCEPTION 'o Indice HOLOS existe se, e somente se, os sistemas forem todos avaliaveis (sem Indice parcial)' USING errcode = 'P0001', hint = 'indice_incoerente';
  END IF;
  IF (app_data->>'indice' IS NULL) <> (app_data->>'nota_media' IS NULL) THEN
    RAISE EXCEPTION 'nota_media acompanha o Indice (nula quando o Indice e nulo)' USING errcode = 'P0001', hint = 'indice_incoerente';
  END IF;
  IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(app_data->'combinacoes') = 'array' THEN app_data->'combinacoes' END), 0) <> 0
     OR COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(app_data->'aprofundamentos') = 'array' THEN app_data->'aprofundamentos' END), 0) <> 0 THEN
    RAISE EXCEPTION 'combinacoes e aprofundamentos nao fazem parte do pacote homologado: a aplicacao oficial os grava vazios' USING errcode = 'P0001', hint = 'saida_nao_homologada';
  END IF;

  -- ---- gravacao (o trigger exigir_aplicacao_holoscan_oficial confere de novo o nivel 1) ----
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao, methodology_package_id, methodology_package_version,
    methodology_content_hash, engine_version, engine_contract_version, calculation_mode
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid,
    NULLIF(app_data->>'encounter_id', '')::uuid,
    v_quando,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    '[]'::jsonb, '[]'::jsonb,
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END,
    mp_id, mp_ver, v_hash, app_data->>'engine_version', app_data->>'engine_contract_version', 'oficial'
  ) RETURNING id INTO app_id;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(ans_data) AS e(value) LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.v->>'marcador_id', (r.v->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(sc_data) AS e(value) LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.v->>'sistema', r.v->>'nome',
      CASE WHEN (r.v->>'avaliavel')::boolean THEN (r.v->>'nota')::numeric END,
      CASE WHEN (r.v->>'avaliavel')::boolean THEN (r.v->>'carga')::numeric END,
      CASE WHEN (r.v->>'avaliavel')::boolean THEN r.v->>'faixa' END,
      (r.v->>'obtido')::numeric, (r.v->>'maximo')::numeric,
      (r.v->>'respondidos')::integer, (r.v->>'total_marcadores')::integer,
      (r.v->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exigir_aplicacao_holoscan_oficial() FROM public, anon, authenticated;

-- verificacoes finais (sem backfill; nada historico tocado) ---------------------
do $$
begin
  if exists (select 1 from public.holoscan_applications where calculation_mode is not null) then
    raise exception 'nenhuma aplicacao existente pode ganhar proveniencia de calculo pela migration (sem backfill)';
  end if;
  if exists (select 1 from public.holoscan_applications where methodology_content_hash is not null or engine_version is not null or engine_contract_version is not null) then
    raise exception 'colunas novas tem de nascer nulas nas linhas existentes';
  end if;
  if exists (select 1 from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a') then
    raise exception 'ainda ha policy de INSERT direto nas tabelas HOLOSCAN';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- HISTORICO: 1 linha nova em supabase_migrations.schema_migrations, no mesmo formato das anteriores
-- (statements = array de 1 elemento com o SQL do arquivo; created_by, idempotency_key e rollback = null). As 31 linhas existentes nao sao tocadas.
-- ---------------------------------------------------------------------------
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261005100000', 'holoscan_oficial_v1', array[$hist_20261005100000$-- ============================================================================
-- HOLOHACKING V1 — CORRECAO P0 (pos-deploy 6.4): APLICACAO HOLOSCAN SO OFICIAL
-- ============================================================================
-- Achado: o front calculava o mapa pelo motor LEGADO e gravava a aplicacao com
-- methodology_package_id do HOLOS-V1@2 (resultado legado + carimbo V1@2). O
-- front passa a calcular pelo MotorMetodologico (modo oficial); esta migration
-- faz o SERVIDOR recusar qualquer aplicacao nova que nao seja oficial.
--
-- O que muda:
--   1. holoscan_applications ganha a proveniencia do CALCULO (anulaveis; as
--      historicas ficam nulas — sem backfill): methodology_content_hash,
--      engine_version, engine_contract_version, calculation_mode ('oficial').
--   2. indice e nota_media passam a aceitar NULL — so para aplicacao oficial
--      (Indice V1 nao existe sem os cinco sistemas avaliaveis; sem Indice
--      parcial). Linha sem pacote continua exigindo indice e nota_media.
--   3. BEFORE INSERT: toda aplicacao nova exige pacote aprovado, vigente na data
--      clinica, versao e hash do pacote, modo oficial e contrato do motor.
--   4. salvar_holoscan_completo (mesma assinatura): nivel 1 (proveniencia,
--      inclusive recalculo do hash do conteudo) + nivel 2 (conferencia
--      estrutural, so contagem: respostas dentro do pacote e da escala, uma
--      nota por sistema do pacote, respondidos/total pelos vinculos PRIMARIOS
--      — secondary_contextual nao conta —, cobertura, Indice so com todos os
--      sistemas avaliaveis, combinacoes/aprofundamentos vazios). Nenhuma regra
--      clinica e recalculada em SQL (nota, faixa, Indice, Triada ficam com o
--      motor JS: refaze-los aqui seria um segundo motor).
--   5. Escrita direta (PostgREST) em holoscan_applications/answers/scores deixa
--      de existir: o unico caminho de gravacao e a RPC. Nenhum cliente fazia
--      insert direto nessas tabelas.
--   6. Os campos novos entram no snapshot imutavel.
--
-- O que NAO muda: as 4 aplicacoes historicas, seus 20 scores e respostas (as
-- linhas nao sao tocadas), HOLOS-V1@2, LI-V1@2, aprovacoes, snapshots.
-- ============================================================================

-- 1. proveniencia do calculo ---------------------------------------------------
alter table public.holoscan_applications add column if not exists methodology_content_hash text;
alter table public.holoscan_applications add column if not exists engine_version text;
alter table public.holoscan_applications add column if not exists engine_contract_version text;
alter table public.holoscan_applications add column if not exists calculation_mode text;

alter table public.holoscan_applications drop constraint if exists holoscan_applications_modo_valido;
alter table public.holoscan_applications add constraint holoscan_applications_modo_valido
  check (calculation_mode is null or calculation_mode = 'oficial');
alter table public.holoscan_applications drop constraint if exists holoscan_applications_oficial_coerente;
alter table public.holoscan_applications add constraint holoscan_applications_oficial_coerente
  check (calculation_mode is null or (methodology_package_id is not null and methodology_package_version is not null
         and methodology_content_hash is not null and engine_version is not null and engine_contract_version is not null));

-- 2. ausencia explicita do Indice (so aplicacao oficial) -----------------------
alter table public.holoscan_applications alter column indice drop not null;
alter table public.holoscan_applications alter column nota_media drop not null;
alter table public.holoscan_applications drop constraint if exists holoscan_applications_indice_presente;
alter table public.holoscan_applications add constraint holoscan_applications_indice_presente
  check (coalesce(calculation_mode, '') = 'oficial' or (indice is not null and nota_media is not null));

-- 2b. faixas do pacote oficial ----------------------------------------------
-- holoscan_system_scores_faixa_valida so aceitava os rotulos do motor legado (baixo/medio/alto): uma aplicacao
-- oficial (faixas do HOLOS-V1: baixa/intermediaria/alta) seria recusada. Os rotulos legados continuam aceitos
-- (scores historicos intactos); a RPC confere que a faixa de cada sistema e um rotulo das faixas do PACOTE.
alter table public.holoscan_system_scores drop constraint if exists holoscan_system_scores_faixa_valida;
alter table public.holoscan_system_scores add constraint holoscan_system_scores_faixa_valida
  check (faixa in ('baixo', 'medio', 'alto', 'baixa', 'intermediaria', 'alta'));

-- 3. toda aplicacao NOVA e oficial ---------------------------------------------
create or replace function public.exigir_aplicacao_holoscan_oficial()
returns trigger language plpgsql set search_path = '' as $$
declare pk record;
begin
  if new.methodology_package_id is null or new.methodology_package_version is null then
    raise exception 'proveniencia metodologica obrigatoria: aplicacao HOLOSCAN nova exige o pacote metodologico oficial (sem proveniencia nao se grava)'
      using errcode = 'P0001', hint = 'proveniencia_obrigatoria';
  end if;
  if new.calculation_mode is distinct from 'oficial' then
    raise exception 'resultado oficial obrigatorio: a aplicacao HOLOSCAN nova tem de vir do motor oficial (calculation_mode = oficial)'
      using errcode = 'P0001', hint = 'modo_nao_oficial';
  end if;
  select p.version, p.status, p.effective_from, p.effective_to, p.content_hash into pk
    from public.methodology_packages p where p.id = new.methodology_package_id;
  if not found then
    raise exception 'pacote metodologico % nao existe', new.methodology_package_id using errcode = 'P0002', hint = 'pacote_inexistente';
  end if;
  if pk.version <> new.methodology_package_version then
    raise exception 'versao declarada (%) nao e a versao do pacote (%)', new.methodology_package_version, pk.version
      using errcode = 'P0001', hint = 'proveniencia_incoerente';
  end if;
  if pk.status <> 'aprovado' then
    raise exception 'pacote metodologico nao aprovado (status %): nao produz aplicacao oficial', pk.status
      using errcode = 'P0001', hint = 'pacote_nao_aprovado';
  end if;
  if new.quando is null or pk.effective_from is null or pk.effective_from > new.quando
     or (pk.effective_to is not null and pk.effective_to < new.quando) then
    raise exception 'pacote metodologico nao vigente em %', new.quando using errcode = 'P0001', hint = 'pacote_nao_vigente';
  end if;
  if new.methodology_content_hash is null or pk.content_hash is null or new.methodology_content_hash <> pk.content_hash then
    raise exception 'hash do pacote metodologico divergente do homologado' using errcode = 'P0001', hint = 'hash_divergente';
  end if;
  return new;
end $$;
drop trigger if exists holoscan_applications_exigir_oficial on public.holoscan_applications;
create trigger holoscan_applications_exigir_oficial before insert on public.holoscan_applications
  for each row execute function public.exigir_aplicacao_holoscan_oficial();

-- 6. snapshot imutavel cobre os campos novos -----------------------------------
CREATE OR REPLACE FUNCTION public.proteger_snapshot_holoscan()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF new.nutritionist_id       IS DISTINCT FROM old.nutritionist_id
  OR new.patient_id            IS DISTINCT FROM old.patient_id
  OR new.encounter_id          IS DISTINCT FROM old.encounter_id
  OR new.methodology_package_id IS DISTINCT FROM old.methodology_package_id
  OR new.methodology_package_version IS DISTINCT FROM old.methodology_package_version
  OR new.methodology_content_hash IS DISTINCT FROM old.methodology_content_hash
  OR new.engine_version        IS DISTINCT FROM old.engine_version
  OR new.engine_contract_version IS DISTINCT FROM old.engine_contract_version
  OR new.calculation_mode      IS DISTINCT FROM old.calculation_mode
  OR new.quando                IS DISTINCT FROM old.quando
  OR new.versao_estrutura      IS DISTINCT FROM old.versao_estrutura
  OR new.versao_bancos         IS DISTINCT FROM old.versao_bancos
  OR new.indice                IS DISTINCT FROM old.indice
  OR new.indice_maximo         IS DISTINCT FROM old.indice_maximo
  OR new.avaliavel             IS DISTINCT FROM old.avaliavel
  OR new.nota_media            IS DISTINCT FROM old.nota_media
  OR new.triada                IS DISTINCT FROM old.triada
  OR new.triada_com_dado       IS DISTINCT FROM old.triada_com_dado
  OR new.cobertura             IS DISTINCT FROM old.cobertura
  OR new.combinacoes           IS DISTINCT FROM old.combinacoes
  OR new.aprofundamentos       IS DISTINCT FROM old.aprofundamentos
  THEN
    RAISE EXCEPTION 'campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id, o pacote metodologico e a proveniencia do calculo); '
      'somente interpretacao_texto, interpretacao_em e interpretacao_versao '
      'podem ser alterados';
  END IF;
  RETURN new;
END;
$$;

-- 5. o unico caminho de gravacao e a RPC ---------------------------------------
drop policy if exists holoscan_applications_insert_proprios on public.holoscan_applications;
drop policy if exists holoscan_system_scores_insert_proprios on public.holoscan_system_scores;
drop policy if exists holoscan_answers_insert_proprios on public.holoscan_answers;

-- 4. a RPC ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.salvar_holoscan_completo(payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_id uuid; app_data jsonb := payload->'application';
  ans_data jsonb := payload->'answers'; sc_data jsonb := payload->'scores';
  uid uuid := auth.uid(); r record; triada_norm jsonb;
  mp_id uuid; mp_ver integer; pk record; v_quando date; v_hash text;
  n_resp integer; n_perg integer; n_sist integer; v_resp integer; v_tot integer; v_todos boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'nao autenticado'; END IF;
  IF app_data IS NULL OR ans_data IS NULL OR sc_data IS NULL
     OR jsonb_typeof(ans_data) <> 'array' OR jsonb_typeof(sc_data) <> 'array' THEN
    RAISE EXCEPTION 'payload incompleto';
  END IF;

  -- ---- nivel 1: proveniencia (declarada pelo cliente, conferida aqui; nunca inferida) ----
  mp_id := NULLIF(app_data->>'methodology_package_id', '')::uuid;
  mp_ver := NULLIF(app_data->>'methodology_package_version', '')::integer;
  v_hash := NULLIF(app_data->>'methodology_content_hash', '');
  v_quando := NULLIF(app_data->>'quando', '')::date;
  IF mp_id IS NULL OR mp_ver IS NULL THEN
    RAISE EXCEPTION 'proveniencia metodologica obrigatoria: aplicacao HOLOSCAN nova exige o pacote metodologico oficial (id e versao)' USING errcode = 'P0001', hint = 'proveniencia_obrigatoria';
  END IF;
  IF app_data->>'calculation_mode' IS DISTINCT FROM 'oficial' THEN
    RAISE EXCEPTION 'resultado oficial obrigatorio: calculation_mode deve ser oficial (resultado do motor legado ou de homologacao nao e gravado)' USING errcode = 'P0001', hint = 'modo_nao_oficial';
  END IF;
  IF app_data->>'engine_contract_version' IS DISTINCT FROM 'holoscan-motor-contrato-v1' OR NULLIF(app_data->>'engine_version', '') IS NULL THEN
    RAISE EXCEPTION 'resultado oficial obrigatorio: motor ou contrato do motor desconhecido' USING errcode = 'P0001', hint = 'motor_desconhecido';
  END IF;
  IF NULLIF(app_data->>'encounter_id', '') IS NULL THEN
    RAISE EXCEPTION 'aplicacao oficial exige atendimento (encounter_id)' USING errcode = 'P0001', hint = 'sem_atendimento';
  END IF;
  SELECT p.version, p.status, p.effective_from, p.effective_to, p.content_hash INTO pk FROM public.methodology_packages p WHERE p.id = mp_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'pacote metodologico % nao existe', mp_id USING errcode = 'P0002', hint = 'pacote_inexistente'; END IF;
  IF pk.version <> mp_ver THEN RAISE EXCEPTION 'versao declarada (%) nao e a versao do pacote (%)', mp_ver, pk.version USING errcode = 'P0001', hint = 'proveniencia_incoerente'; END IF;
  IF pk.status <> 'aprovado' THEN RAISE EXCEPTION 'pacote metodologico nao aprovado (status %): nao produz aplicacao oficial', pk.status USING errcode = 'P0001', hint = 'pacote_nao_aprovado'; END IF;
  IF v_quando IS NULL OR pk.effective_from IS NULL OR pk.effective_from > v_quando OR (pk.effective_to IS NOT NULL AND pk.effective_to < v_quando) THEN
    RAISE EXCEPTION 'pacote metodologico nao vigente em %', v_quando USING errcode = 'P0001', hint = 'pacote_nao_vigente';
  END IF;
  IF v_hash IS NULL OR pk.content_hash IS NULL OR v_hash <> pk.content_hash THEN
    RAISE EXCEPTION 'hash do pacote metodologico divergente do homologado' USING errcode = 'P0001', hint = 'hash_divergente';
  END IF;
  IF public.metodologia_hash_conteudo(mp_id) IS DISTINCT FROM pk.content_hash THEN
    RAISE EXCEPTION 'conteudo do pacote metodologico difere do hash homologado' USING errcode = 'P0001', hint = 'hash_divergente';
  END IF;

  -- ---- nivel 2: conferencia estrutural (so contagem; nenhuma regra clinica refeita aqui) ----
  n_resp := jsonb_array_length(ans_data);
  IF n_resp = 0 THEN RAISE EXCEPTION 'resultado oficial sem respostas' USING errcode = 'P0001', hint = 'sem_respostas'; END IF;
  IF (SELECT count(DISTINCT e.value->>'marcador_id') FROM jsonb_array_elements(ans_data) AS e(value)) <> n_resp THEN
    RAISE EXCEPTION 'resposta duplicada para a mesma pergunta' USING errcode = 'P0001', hint = 'resposta_duplicada';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(ans_data) AS e(value)
        JOIN public.methodology_questions q ON q.package_id = mp_id AND q.stable_id = e.value->>'marcador_id'
        JOIN public.methodology_scales s ON s.package_id = mp_id AND s.code = q.scale_code
       WHERE jsonb_typeof(e.value->'valor') = 'number'
         AND (e.value->>'valor')::numeric = trunc((e.value->>'valor')::numeric)
         AND (e.value->>'valor')::numeric BETWEEN s.min_value AND s.max_value) <> n_resp THEN
    RAISE EXCEPTION 'resposta fora do pacote metodologico ou fora da escala do item' USING errcode = 'P0001', hint = 'resposta_invalida';
  END IF;
  SELECT count(*) INTO n_perg FROM public.methodology_questions q WHERE q.package_id = mp_id;
  IF (app_data->'cobertura'->>'respondidos') IS DISTINCT FROM n_resp::text OR (app_data->'cobertura'->>'total') IS DISTINCT FROM n_perg::text THEN
    RAISE EXCEPTION 'contagem de cobertura divergente das respostas enviadas' USING errcode = 'P0001', hint = 'contagem_divergente';
  END IF;
  SELECT count(*) INTO n_sist FROM public.methodology_systems y WHERE y.package_id = mp_id;
  IF jsonb_array_length(sc_data) <> n_sist
     OR (SELECT count(DISTINCT e.value->>'sistema') FROM jsonb_array_elements(sc_data) AS e(value)
          WHERE EXISTS (SELECT 1 FROM public.methodology_systems y WHERE y.package_id = mp_id AND y.code = e.value->>'sistema')) <> n_sist THEN
    RAISE EXCEPTION 'as notas devem cobrir exatamente os sistemas do pacote metodologico' USING errcode = 'P0001', hint = 'sistemas_divergentes';
  END IF;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(sc_data) AS e(value) LOOP
    SELECT count(*) INTO v_tot FROM public.methodology_associations x
     WHERE x.package_id = mp_id AND x.destination_type = 'system' AND x.role = 'primaria' AND x.destination_id = r.v->>'sistema';
    SELECT count(*) INTO v_resp FROM jsonb_array_elements(ans_data) AS e(value)
      JOIN public.methodology_associations x ON x.package_id = mp_id AND x.destination_type = 'system' AND x.role = 'primaria'
       AND x.destination_id = r.v->>'sistema' AND x.question_stable_id = e.value->>'marcador_id';
    IF (r.v->>'respondidos') IS DISTINCT FROM v_resp::text OR (r.v->>'total_marcadores') IS DISTINCT FROM v_tot::text THEN
      RAISE EXCEPTION 'contagem do sistema % divergente dos vinculos primarios do pacote (vinculo secundario nao pontua)', r.v->>'sistema' USING errcode = 'P0001', hint = 'contagem_divergente';
    END IF;
    IF jsonb_typeof(r.v->'avaliavel') <> 'boolean' THEN
      RAISE EXCEPTION 'sistema % sem indicacao de avaliabilidade', r.v->>'sistema' USING errcode = 'P0001', hint = 'nota_incoerente';
    END IF;
    IF (r.v->>'avaliavel')::boolean THEN
      IF (r.v->>'nota') IS NULL OR (r.v->>'nota')::numeric < 0 OR (r.v->>'nota')::numeric > 10 OR (r.v->>'faixa') IS NULL THEN
        RAISE EXCEPTION 'sistema % avaliavel sem nota 0..10 ou sem faixa', r.v->>'sistema' USING errcode = 'P0001', hint = 'nota_incoerente';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.methodology_ranges f WHERE f.package_id = mp_id AND f.destination_type = 'system'
                      AND f.destination_id = r.v->>'sistema' AND f.label = r.v->>'faixa') THEN
        RAISE EXCEPTION 'faixa % do sistema % nao e uma faixa do pacote metodologico', r.v->>'faixa', r.v->>'sistema' USING errcode = 'P0001', hint = 'faixa_fora_do_pacote';
      END IF;
    ELSIF (r.v->>'nota') IS NOT NULL OR (r.v->>'faixa') IS NOT NULL THEN
      RAISE EXCEPTION 'sistema % nao avaliavel nao tem nota nem faixa (ausencia nao e zero)', r.v->>'sistema' USING errcode = 'P0001', hint = 'nota_incoerente';
    END IF;
  END LOOP;
  v_todos := NOT EXISTS (SELECT 1 FROM jsonb_array_elements(sc_data) AS e(value) WHERE NOT (e.value->>'avaliavel')::boolean);
  IF (app_data->>'indice' IS NULL) = v_todos THEN
    RAISE EXCEPTION 'o Indice HOLOS existe se, e somente se, os sistemas forem todos avaliaveis (sem Indice parcial)' USING errcode = 'P0001', hint = 'indice_incoerente';
  END IF;
  IF (app_data->>'indice' IS NULL) <> (app_data->>'nota_media' IS NULL) THEN
    RAISE EXCEPTION 'nota_media acompanha o Indice (nula quando o Indice e nulo)' USING errcode = 'P0001', hint = 'indice_incoerente';
  END IF;
  IF COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(app_data->'combinacoes') = 'array' THEN app_data->'combinacoes' END), 0) <> 0
     OR COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(app_data->'aprofundamentos') = 'array' THEN app_data->'aprofundamentos' END), 0) <> 0 THEN
    RAISE EXCEPTION 'combinacoes e aprofundamentos nao fazem parte do pacote homologado: a aplicacao oficial os grava vazios' USING errcode = 'P0001', hint = 'saida_nao_homologada';
  END IF;

  -- ---- gravacao (o trigger exigir_aplicacao_holoscan_oficial confere de novo o nivel 1) ----
  SELECT COALESCE(jsonb_object_agg(t.k,
           CASE WHEN (app_data->'triada_com_dado'->>t.k) = 'false' THEN 'null'::jsonb ELSE t.v END),
         '{}'::jsonb)
    INTO triada_norm
    FROM jsonb_each(COALESCE(app_data->'triada', '{}'::jsonb)) AS t(k, v);
  INSERT INTO public.holoscan_applications (
    nutritionist_id, patient_id, encounter_id, quando, versao_estrutura, versao_bancos,
    indice, indice_maximo, avaliavel, nota_media,
    triada, triada_com_dado, cobertura, combinacoes, aprofundamentos,
    interpretacao_texto, interpretacao_em, interpretacao_versao, methodology_package_id, methodology_package_version,
    methodology_content_hash, engine_version, engine_contract_version, calculation_mode
  ) VALUES (
    uid, (app_data->>'patient_id')::uuid,
    NULLIF(app_data->>'encounter_id', '')::uuid,
    v_quando,
    (app_data->>'versao_estrutura')::integer, app_data->>'versao_bancos',
    (app_data->>'indice')::numeric, (app_data->>'indice_maximo')::numeric,
    (app_data->>'avaliavel')::boolean, (app_data->>'nota_media')::numeric,
    triada_norm, app_data->'triada_com_dado', app_data->'cobertura',
    '[]'::jsonb, '[]'::jsonb,
    app_data->>'interpretacao_texto',
    CASE WHEN app_data->>'interpretacao_em' IS NOT NULL THEN (app_data->>'interpretacao_em')::timestamptz ELSE NULL END,
    CASE WHEN app_data->>'interpretacao_versao' IS NOT NULL THEN (app_data->>'interpretacao_versao')::integer ELSE NULL END,
    mp_id, mp_ver, v_hash, app_data->>'engine_version', app_data->>'engine_contract_version', 'oficial'
  ) RETURNING id INTO app_id;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(ans_data) AS e(value) LOOP
    INSERT INTO public.holoscan_answers (application_id, marcador_id, valor)
    VALUES (app_id, r.v->>'marcador_id', (r.v->>'valor')::smallint);
  END LOOP;
  FOR r IN SELECT e.value AS v FROM jsonb_array_elements(sc_data) AS e(value) LOOP
    INSERT INTO public.holoscan_system_scores (
      application_id, sistema, nome, nota, carga, faixa,
      obtido, maximo, respondidos, total_marcadores, avaliavel
    ) VALUES (
      app_id, r.v->>'sistema', r.v->>'nome',
      CASE WHEN (r.v->>'avaliavel')::boolean THEN (r.v->>'nota')::numeric END,
      CASE WHEN (r.v->>'avaliavel')::boolean THEN (r.v->>'carga')::numeric END,
      CASE WHEN (r.v->>'avaliavel')::boolean THEN r.v->>'faixa' END,
      (r.v->>'obtido')::numeric, (r.v->>'maximo')::numeric,
      (r.v->>'respondidos')::integer, (r.v->>'total_marcadores')::integer,
      (r.v->>'avaliavel')::boolean
    );
  END LOOP;
  RETURN app_id;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.salvar_holoscan_completo(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exigir_aplicacao_holoscan_oficial() FROM public, anon, authenticated;

-- verificacoes finais (sem backfill; nada historico tocado) ---------------------
do $$
begin
  if exists (select 1 from public.holoscan_applications where calculation_mode is not null) then
    raise exception 'nenhuma aplicacao existente pode ganhar proveniencia de calculo pela migration (sem backfill)';
  end if;
  if exists (select 1 from public.holoscan_applications where methodology_content_hash is not null or engine_version is not null or engine_contract_version is not null) then
    raise exception 'colunas novas tem de nascer nulas nas linhas existentes';
  end if;
  if exists (select 1 from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a') then
    raise exception 'ainda ha policy de INSERT direto nas tabelas HOLOSCAN';
  end if;
end $$;
$hist_20261005100000$]);

-- ---------------------------------------------------------------------------
-- VERIFICACAO POS-APLICACAO (dentro da transacao): qualquer divergencia -> RAISE -> nada persiste
-- ---------------------------------------------------------------------------
do $pos$
declare f jsonb; esperado jsonb := '{"hist_n":32,"hist_ultima":"20261005100000","n_tabelas":44,"n_funcoes":63,"n_policies":126,"n_triggers":90,"n_constraints":326,"holos":"HOLOS-V1@2:aprovado:aprovador_unico","holos_hash":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_content_hash_homologado":"7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402","holos_vigencia":"2026-10-03..","li":"LI-V1@1:rascunho,LI-V1@2:aprovado","li_hash":"fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9","holoscan_applications":4,"apps_com_proveniencia":0,"apps_novas":0,"historicas_fingerprint":"205812d8e238e293fe8b58205ffa5631","holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"leituras":0}'::jsonb; k text; dif text := ''; dg record;
begin
  select jsonb_build_object(
    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'holos', (select string_agg(code || '@' || version || ':' || status || ':' || coalesce(governance_regime, '-'), ',') from public.methodology_packages),
    'holos_hash', (select public.metodologia_hash_conteudo(id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_content_hash_homologado', (select content_hash from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_vigencia', (select effective_from::text || '..' || coalesce(effective_to::text, '') from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'li', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
    'li_hash', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
    'apps_novas', (select count(*) from public.holoscan_applications where created_at >= '2026-10-03'),
    'historicas_fingerprint', (select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from public.holoscan_applications where created_at < '2026-10-03'),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'leituras', (select count(*) from public.integrated_readings),
    'colunas_novas', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_content_hash', 'engine_version', 'engine_contract_version', 'calculation_mode')),
    'colunas_novas_preenchidas', (select count(*) from public.holoscan_applications where methodology_content_hash is not null or engine_version is not null or engine_contract_version is not null or calculation_mode is not null),
    'indice_aceita_nulo', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name = 'indice'),
    'policies_insert_holoscan', (select count(*) from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a'),
    'trigger_exigir_oficial', (select count(*) from pg_trigger where tgrelid = 'public.holoscan_applications'::regclass and tgname = 'holoscan_applications_exigir_oficial'),
    'rpc_exige_oficial', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'salvar_holoscan_completo'
       and p.prosrc like '%%proveniencia_obrigatoria%%' and p.prosrc like '%%contagem_divergente%%' and p.prosrc like '%%faixa_fora_do_pacote%%' and p.prosrc like '%%metodologia_hash_conteudo%%'),
    'rpc_sem_anon', (select not has_function_privilege('anon', 'public.salvar_holoscan_completo(jsonb)', 'execute')),
    'rpc_authenticated', (select has_function_privilege('authenticated', 'public.salvar_holoscan_completo(jsonb)', 'execute')),
    'faixa_aceita_v1', (select pg_get_constraintdef(oid) like '%%intermediaria%%' and pg_get_constraintdef(oid) like '%%medio%%' from pg_constraint where conname = 'holoscan_system_scores_faixa_valida')
  ) into f;
  esperado := esperado || '{"colunas_novas":4,"colunas_novas_preenchidas":0,"indice_aceita_nulo":"YES","policies_insert_holoscan":0,"trigger_exigir_oficial":1,"rpc_exige_oficial":1,"rpc_sem_anon":true,"rpc_authenticated":true,"faixa_aceita_v1":true}'::jsonb;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  -- impressoes digitais: aplicacoes (colunas anteriores), scores, respostas, pacotes, aprovacoes, registro, snapshot LI e exames identicos ao capturado
  for dg in select g.k, g.antes, d.depois from _etapa65_digitais g join (values
    ('apps', (select md5(coalesce(string_agg(concat_ws('|', a.id, a.nutritionist_id, a.patient_id, a.encounter_id, a.quando, a.versao_estrutura, a.versao_bancos, a.indice, a.indice_maximo, a.avaliavel, a.nota_media, a.triada, a.triada_com_dado, a.cobertura, a.combinacoes, a.aprofundamentos, a.interpretacao_texto, a.interpretacao_em, a.interpretacao_versao, a.methodology_package_id, a.methodology_package_version, a.created_at, a.updated_at), ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('respostas', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r)),
    ('holos_pacote', (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('holos_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_registro', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_homologation_records x)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r)),
    ('li_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_approvals x)),
    ('li_snapshot', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_snapshots x)),
    ('exames', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r))) as d(k, depois) on d.k = g.k loop
    if dg.antes is distinct from dg.depois then dif := dif || 'digital ' || dg.k || ' mudou; '; end if;
  end loop;
  if (select count(*) from _etapa65_digitais) <> 10 then dif := dif || 'digitais incompletas; '; end if;
  if dif <> '' then raise exception 'ETAPA 6.5 ABORTADA NA VERIFICACAO POS-APLICACAO: %', dif using errcode = 'P0001', hint = 'etapa6_5_pos'; end if;
  raise notice 'ETAPA 6.5: verificacao pos-aplicacao ok (32 migrations; RPC exige aplicacao oficial; sem insert direto; 4 aplicacoes historicas intactas)';
end $pos$;

-- ULTIMA INSTRUCAO: confirma tudo de uma vez. (Nao ha ROLLBACK no caminho de sucesso; toda falha acima ja aborta a transacao.)
COMMIT;
