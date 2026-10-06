#!/bin/sh
# ETAPA 6.5 — prova LOCAL do artefato UNICO supabase/ETAPA6-5-APLICACAO-P0-E-REGISTROS.sql (A: P0 HOLOSCAN oficial; B: registros clinicos) num PostgreSQL descartavel.
# Uso: PGHOST=/caminho/socket PGPORT=55432 sh scripts/testar-aplicacao-holoscan-oficial-local.sh
#      Precisa do template t_ref (= base_63b + ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql: estado real pos-6.3-B com identidades
#      ficticias; ver scripts/testar-aplicacao-aprovador-unico-local.sh). Monta base_65 = t_ref + o que o banco real recebeu depois
#      (6.3-C Daniel homologa HOLOS-V1@2; 6.3-D/E Aprovacao e homologacao da LI-V1@2 por Daniel) e roda:
#      T0 pre-flight; T1 aplicacao integral + post-flight + digitais; T2 segunda execucao; T3 estado divergente (aplicacao nova);
#      T4 falha injetada no meio; T5 pos-verificacao falhando; T6 RPC depois da aplicacao (oficial aceita; legado recusado);
#      T7 registros clinicos depois da aplicacao (validos aceitos; formato/resultado recusados; concluido imutavel; ferramentas antigas iguais).
# Os dados locais sao ficticios: a impressao digital das historicas e a data de vigencia do HOLOS sao as LOCAIS (substituidas so na
# COPIA de teste do artefato; o arquivo versionado continua com os valores reais 205812d8... e 2026-10-03).
set -u
case "${PGHOST:-}" in /*|localhost|127.0.0.1) ;; *) echo "RECUSADO: PGHOST nao e local (defina PGHOST=/caminho/do/socket)"; exit 2;; esac
cd "$(dirname "$0")/.."
A=supabase/ETAPA6-5-APLICACAO-P0-E-REGISTROS.sql
P="psql -U postgres -X -At -v ON_ERROR_STOP=1"
O=${TMPDIR:-/tmp}/e65; mkdir -p $O
FP="select (select count(*) from supabase_migrations.schema_migrations)||' mig, '||(select count(*) from pg_constraint k join pg_namespace n on n.oid=k.connamespace where n.nspname='public')||' constraints, '||(select count(*) from pg_policy where polrelid='public.holoscan_applications'::regclass and polcmd='a')||' policy insert apps, apps='||(select count(*) from holoscan_applications)"
fresh() { psql -U postgres -d postgres -qc "drop database if exists $1" -c "create database $1 template base_65" >/dev/null; }
psql -U postgres -d postgres -qc "drop database if exists base_65" -c "create database base_65 template t_ref" >/dev/null || exit 1
$P -d base_65 > $O/est.out 2>&1 <<'SQL' || { echo "ESTADO FALHOU"; tail -5 $O/est.out; exit 1; }
begin;
create temp table _u (k text primary key, v uuid);
insert into _u select 'daniel', user_id from methodology_approvers where approval_stage = 1 limit 1;
select set_config('request.jwt.claims', json_build_object('sub', (select v from _u where k = 'daniel'), 'role', 'authenticated')::text, true);
select public.aprovar_pacote_metodologico((select id from methodology_packages where code = 'HOLOS-V1' and version = 2), '{}');
select public.registrar_aprovacao_li((select id from integrated_reading_rule_packages where version = 2), 2, 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9', 1, 'Daniel', 'conferido (estado local)');
select public.homologar_pacote_li((select id from integrated_reading_rule_packages where version = 2), 2, 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9', 'Daniel');
reset role;
select set_config('request.jwt.claims', '', true);
-- as aplicacoes ficticias foram criadas hoje; no banco real elas sao anteriores a 2026-10-03 (historicas)
update holoscan_applications set created_at = timestamptz '2026-09-30 12:00:00+00';
-- como no banco real: 12 aplicacoes das 6 ferramentas antigas (ficticias), em varios estados; a digital "ferramentas" prova que nada muda
insert into tool_applications (nutritionist_id, patient_id, ferramenta_id, versao_ferramenta, status, respostas, resultado, leitura)
select p.nutritionist_id, p.id, f, '1', case when g % 4 = 0 then 'revisada' when g % 4 = 1 then 'rascunho' else 'concluida' end,
       jsonb_build_object('campo_ficticio', 'texto ' || g), case when f = 'linha_momentum' then '{"x":1}'::jsonb end, case when g % 4 = 0 then 'leitura ficticia' end
  from generate_series(1, 12) g, lateral (select (array['oq3','pqq','linha_momentum','mapa_crencas','roda_vida','carta_futuro'])[1 + g % 6] f) x,
       lateral (select id, nutritionist_id from patients where status <> 'inativo' order by id limit 1) p;
commit;
SQL
FPL=$($P -d base_65 -c "select md5(coalesce(string_agg(id::text || '|' || quando || '|' || indice || '|' || nota_media || '|' || avaliavel || '|' || coalesce(methodology_package_id::text, '-') || '|' || coalesce(encounter_id::text, '-') || '|' || updated_at, ';' order by id), '')) from public.holoscan_applications where created_at < '2026-10-03'")
VIG=$($P -d base_65 -c "select effective_from from methodology_packages where code='HOLOS-V1'")
NAPP=$($P -d base_65 -c "select count(*) from holoscan_applications")
NSC=$($P -d base_65 -c "select count(*) from holoscan_system_scores")
loc() { sed -e "s/205812d8e238e293fe8b58205ffa5631/$FPL/g" -e "s/\"holos_vigencia\":\"2026-10-03..\"/\"holos_vigencia\":\"$VIG..\"/g" -e "s/\"holoscan_applications\":4,/\"holoscan_applications\":$NAPP,/g" -e "s/\"holoscan_system_scores\":20,/\"holoscan_system_scores\":$NSC,/g" "$1"; }
loc $A > $O/a.sql; loc supabase/ETAPA6-5-PREFLIGHT.sql > $O/pre.sql; loc supabase/ETAPA6-5-POSTFLIGHT.sql > $O/posf.sql
echo "T0 template (estado real reproduzido: HOLOS e LI aprovados; $NAPP aplicacoes historicas, $NSC scores): $($P -d base_65 -c "$FP"); holos=$($P -d base_65 -c "select status||':'||governance_regime from methodology_packages") li=$($P -d base_65 -c "select string_agg(version||':'||status, ',' order by version) from integrated_reading_rule_packages")"
echo "T0 PREFLIGHT: $($P -d base_65 -f $O/pre.sql | grep -E '"(pode_aplicar|divergencias)"' | tr -d ' ' | tr '\n' ' ')"
$P -d base_65 -f $O/pre.sql | sed -n '/"digitais"/,/}/p' | grep -v digitais | tr -d ' ,' | sort > $O/dig_antes
fresh t65_ok; $P -d t65_ok -f $O/a.sql > $O/ok.out 2> $O/ok.err; r=$?
echo "T1 aplicacao integral: exit=$r guarda=$(grep -c 'ETAPA 6.5: guarda ok' $O/ok.err) pos=$(grep -c 'verificacao pos-aplicacao ok' $O/ok.err) ultimo=$(grep -E '^(BEGIN|COMMIT|ROLLBACK)$' $O/ok.out | tail -1); depois: $($P -d t65_ok -c "$FP")"
echo "T1 POSTFLIGHT: $($P -d t65_ok -f $O/posf.sql | grep -E '"(aplicacao_ok|divergencias)"' | tr -d ' ' | tr '\n' ' ')"
$P -d t65_ok -f $O/posf.sql | sed -n '/"digitais"/,/}/p' | grep -v digitais | tr -d ' ,' | sort > $O/dig_depois
echo "T1 digitais pre-flight == post-flight (aplicacoes, scores, respostas, pacotes, aprovacoes, registro, LI, exames, ferramentas): $(cmp -s $O/dig_antes $O/dig_depois && echo IGUAIS || echo DIFERENTES) ($(wc -l < $O/dig_antes) linhas)"
echo "T1 historico: $($P -d t65_ok -c "select version||' '||name||' created_by='||coalesce(created_by,'null')||' stmts='||array_length(statements,1) from supabase_migrations.schema_migrations where version in ('20261005100000','20261005110000')" | tr '\n' ';')"
echo "T1 historicas: $($P -d t65_ok -c "select count(*)||' aplicacoes, sem proveniencia='||count(*) filter (where methodology_package_id is null)||', colunas novas preenchidas='||count(*) filter (where calculation_mode is not null or methodology_content_hash is not null) from holoscan_applications")"
$P -d t65_ok -f $O/a.sql > $O/2.out 2> $O/2.err; r=$?; echo "T2 segunda execucao: exit=$r (esperado <>0) msg=$(grep -o 'ABORTADA NA GUARDA[^.]*' $O/2.err | head -1 | cut -c1-90) depois: $($P -d t65_ok -c "$FP")"
fresh t65_div; $P -d t65_div -qc "update holoscan_applications set created_at = now() where id = (select id from holoscan_applications order by id limit 1)" >/dev/null 2>&1
$P -d t65_div -f $O/a.sql > $O/div.out 2> $O/div.err; r=$?; echo "T3 estado divergente (uma aplicacao 'nova' sem proveniencia): exit=$r (esperado <>0) msg=$(grep -o 'apps_novas=[^;]*' $O/div.err | head -1) depois: $($P -d t65_div -c "$FP")"
fresh t65_mid; sed '0,/^-- 3\. toda aplicacao NOVA e oficial/s//select 1\/0; -- FALHA INJETADA\n-- 3. toda aplicacao NOVA e oficial/' $O/a.sql > $O/mid.sql
grep -q 'FALHA INJETADA' $O/mid.sql || echo "  (injecao nao aplicada)"
$P -d t65_mid -f $O/mid.sql > $O/mid.out 2> $O/mid.err; r=$?; echo "T4 falha injetada no meio da migration (depois de criar colunas e afrouxar NOT NULL): exit=$r (esperado <>0) erro=$(grep -o 'division by zero' $O/mid.err | head -1) depois: $($P -d t65_mid -c "$FP"); colunas novas=$($P -d t65_mid -c "select count(*) from information_schema.columns where table_name='holoscan_applications' and column_name='calculation_mode'")"
fresh t65_pos; sed 's/"n_constraints":326/"n_constraints":327/' $O/a.sql > $O/pos.sql; $P -d t65_pos -f $O/pos.sql > $O/pos.out 2> $O/pos.err; r=$?; echo "T5 pos-verificacao falhando (327 esperado): exit=$r (esperado <>0) msg=$(grep -o 'ABORTADA NA VERIFICACAO POS-APLICACAO: [^;]*' $O/pos.err | head -1) depois: $($P -d t65_pos -c "$FP")"
echo "T6 RPC depois da aplicacao (transacao descartada):"
$P -d t65_ok <<'SQL' 2>&1 | sed 's/^/   /'
begin;
create temp table _u (k text primary key, v uuid);
insert into _u select 'daniel', user_id from methodology_approvers where approval_stage = 1 limit 1;
select set_config('request.jwt.claims', json_build_object('sub', (select v from _u where k = 'daniel'), 'role', 'authenticated')::text, true) is not null as como_daniel;
create function pg_temp.tenta(p jsonb) returns text language plpgsql as $f$ declare h text; begin perform public.salvar_holoscan_completo(p); return 'ACEITO'; exception when others then get stacked diagnostics h = pg_exception_hint; return 'recusado: ' || coalesce(nullif(h, ''), left(sqlerrm, 60)); end $f$;
create temp table _p as select (select id from methodology_packages where code = 'HOLOS-V1' and version = 2) mp, (select id from patients where nutritionist_id = (select v from _u where k = 'daniel') limit 1) pa;
insert into encounters (nutritionist_id, patient_id, occurred_at) select (select v from _u where k = 'daniel'), pa, now() from _p;
create temp table _ok as select jsonb_build_object('application', jsonb_build_object('patient_id', pa, 'encounter_id', (select id from encounters where patient_id = pa order by created_at desc limit 1), 'quando', current_date, 'versao_estrutura', 3,
    'indice', 50, 'indice_maximo', 100, 'avaliavel', true, 'nota_media', 5, 'triada', '{}'::jsonb, 'triada_com_dado', '{}'::jsonb, 'cobertura', jsonb_build_object('respondidos', 84, 'total', 84),
    'combinacoes', '[]'::jsonb, 'aprofundamentos', '[]'::jsonb, 'methodology_package_id', mp, 'methodology_package_version', 2, 'methodology_content_hash', (select content_hash from methodology_packages where id = mp),
    'engine_version', 'motor-generico-2.0.0', 'engine_contract_version', 'holoscan-motor-contrato-v1', 'calculation_mode', 'oficial'),
  'answers', (select jsonb_agg(jsonb_build_object('marcador_id', stable_id, 'valor', 1)) from methodology_questions where package_id = mp),
  'scores', (select jsonb_agg(jsonb_build_object('sistema', y.code, 'nome', y.name, 'nota', 5, 'carga', 5, 'faixa', 'intermediaria', 'obtido', 1, 'maximo', 2,
      'respondidos', (select count(*) from methodology_associations x where x.package_id = mp and x.role = 'primaria' and x.destination_type = 'system' and x.destination_id = y.code),
      'total_marcadores', (select count(*) from methodology_associations x where x.package_id = mp and x.role = 'primaria' and x.destination_type = 'system' and x.destination_id = y.code), 'avaliavel', true)) from methodology_systems y where y.package_id = mp)) p from _p;
grant select on _ok, _u, _p to authenticated;
set local role authenticated;
select 'aplicacao oficial: ' || pg_temp.tenta((select p from _ok));
select 'payload do front antigo (sem proveniencia): ' || pg_temp.tenta((select jsonb_set(p, '{application}', (p->'application') - 'methodology_package_id' - 'methodology_package_version' - 'calculation_mode') from _ok));
select 'resultado legado com carimbo V1@2 (sem modo oficial): ' || pg_temp.tenta((select jsonb_set(p, '{application}', (p->'application') - 'calculation_mode') from _ok));
select 'secundarias contadas no metabolico: ' || pg_temp.tenta((select jsonb_set(p, '{scores}', (select jsonb_agg(case when e->>'sistema' = 'metabolico' then e || '{"respondidos":19,"total_marcadores":19}' else e end) from jsonb_array_elements(p->'scores') e)) from _ok));
reset role;
select 'aplicacoes oficiais gravadas: ' || count(*) from holoscan_applications where calculation_mode = 'oficial';
rollback;
SQL
echo "T7 registros clinicos depois da aplicacao (transacao descartada):"
$P -d t65_ok <<'SQL' 2>&1 | sed 's/^/   /'
begin;
create temp table _u (k text primary key, v uuid);
insert into _u select 'daniel', user_id from methodology_approvers where approval_stage = 1 limit 1;
create temp table _antes as select md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) d, count(*) n from tool_applications t;
create function pg_temp.tenta(q text) returns text language plpgsql as $f$ declare h text; begin execute q; return 'ACEITO'; exception when others then get stacked diagnostics h = pg_exception_hint; return 'recusado: ' || coalesce(nullif(h, ''), left(sqlerrm, 60)); end $f$;
create temp table _p as select (select id from patients where nutritionist_id = (select v from _u where k = 'daniel') and status <> 'inativo' limit 1) pa;
grant select on _u, _p to authenticated;
select set_config('request.jwt.claims', json_build_object('sub', (select v from _u where k = 'daniel'), 'role', 'authenticated')::text, true) is not null as como_daniel;
set local role authenticated;
select 'mapa_rotina_v1 valido: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, status, respostas) values (%L, %L, %L, %L, %L)', (select pa from _p), 'mapa_rotina_v1', '1', 'concluida', '{"acorda":"06:30","eventos":[{"inicio":"07:00","categoria":"refeição","dias":["seg"]}]}'));
select 'gatilhos valido: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'gatilhos_respostas_v1', '1', '{"gatilho":"x","intensidade":"7"}'));
select 'conexao valido: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'conexao_pertencimento_v1', '1', '{"vinculos":[{"rotulo":"Irmã","papel":"apoia"}]}'));
select 'chave estranha: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'mapa_rotina_v1', '1', '{"escore":3}'));
select 'classificacao de vinculo: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'conexao_pertencimento_v1', '1', '{"vinculos":[{"rotulo":"x","papel":"tóxica"}]}'));
select 'resultado automatico: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas, resultado) values (%L, %L, %L, %L, %L)', (select pa from _p), 'gatilhos_respostas_v1', '1', '{}', '{"nivel":"alto"}'));
select 'ID antigo mapa_rotina com payload parcial: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'mapa_rotina', '1', '{"eventos":[{"inicio":"07:00","titulo":"café"}]}'));
select 'ID antigo conexao_pertencimento {pertence}: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'conexao_pertencimento', '1', '{"pertence":"igreja"}'));
select 'ID novo com versao 0: ' || pg_temp.tenta(format('insert into tool_applications (patient_id, ferramenta_id, versao_ferramenta, respostas) values (%L, %L, %L, %L)', (select pa from _p), 'gatilhos_respostas_v1', '0', '{}'));
select 'reescrever concluido: ' || pg_temp.tenta(format('update tool_applications set respostas = %L where ferramenta_id = %L', '{}', 'mapa_rotina_v1'));
reset role;
select 'ferramentas antigas: ' || case when (select md5(coalesce(string_agg(to_jsonb(t)::text, ';' order by t.id), '')) from tool_applications t where ferramenta_id not in ('mapa_rotina_v1','gatilhos_respostas_v1','conexao_pertencimento_v1')) = (select d from _antes) then 'identicas (' || (select n from _antes) || ' linhas)' else 'MUDARAM' end;
rollback;
SQL
for d in t65_ok t65_div t65_mid t65_pos; do psql -U postgres -d postgres -qc "drop database if exists $d" >/dev/null; done
