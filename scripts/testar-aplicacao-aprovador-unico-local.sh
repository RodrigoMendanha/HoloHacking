#!/bin/sh
# ETAPA 6.3-B — prova LOCAL do artefato EXATO supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql num PostgreSQL descartavel.
# Uso: PGHOST=/caminho/socket PGPORT=55432 sh scripts/testar-aplicacao-aprovador-unico-local.sh   (precisa do template base_fp da 6.2:
#      ver scripts/testar-aplicacao-real-local.sh). Monta o template base_63b = base_fp + ETAPA6-2-APLICACAO-REAL.sql +
#      supabase/tests/etapa6-3-b-estado-real-local.sql (estado real de 2026-10-03 com identidades ficticias) e roda:
#      T0 pre-flight; T1 aplicacao integral + post-flight + provas; T2 segunda execucao; T3 estado divergente; T4 falha injetada no meio;
#      T5 pos-verificacao falhando; T6 RPCs depois da aplicacao (Daniel homologa; Rodrigo nao; nenhuma segunda revisao).
set -u
# SEGURANCA: so PostgreSQL LOCAL (socket unix ou localhost). Nunca o banco real, mesmo que o ambiente traga PGHOST remoto.
case "${PGHOST:-}" in /*|localhost|127.0.0.1) ;; *) echo "RECUSADO: PGHOST nao e local (defina PGHOST=/caminho/do/socket)"; exit 2;; esac
cd "$(dirname "$0")/.."
A=supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql
P="psql -U postgres -X -At -v ON_ERROR_STOP=1"
O=${TMPDIR:-/tmp}/e63b; mkdir -p $O
FP="select (select count(*) from supabase_migrations.schema_migrations)||' mig, '||(select count(*) from pg_constraint k join pg_namespace n on n.oid=k.connamespace where n.nspname='public')||' constraints, papeis='||(select string_agg(scope||'/'||approval_stage||'/'||active, ',' order by scope, approval_stage) from methodology_approvers)||', aprovacoes='||(select count(*) from methodology_package_approvals)"
fresh() { psql -U postgres -d postgres -qc "drop database if exists $1" -c "create database $1 template base_63b" >/dev/null; }
psql -U postgres -d postgres -qc "drop database if exists base_63b" -c "create database base_63b template base_fp" >/dev/null
$P -d base_63b -q -f supabase/ETAPA6-2-APLICACAO-REAL.sql > $O/62.out 2>&1 || { echo "6.2 FALHOU"; tail -3 $O/62.out; exit 1; }
$P -d base_63b -q -f supabase/tests/etapa6-3-b-estado-real-local.sql > $O/est.out 2>&1 || { echo "ESTADO FALHOU"; tail -5 $O/est.out; exit 1; }
echo "T0 template (estado real reproduzido): $($P -d base_63b -c "$FP")"
echo "T0 PREFLIGHT: $($P -d base_63b -f supabase/ETAPA6-3-B-PREFLIGHT.sql | grep -E '"(pode_aplicar|divergencias)"' | tr -d ' ' | tr '\n' ' ')"
$P -d base_63b -f supabase/ETAPA6-3-B-PREFLIGHT.sql | sed -n '/"digitais"/,/}/p' | grep -v digitais | tr -d ' ,' | sort > $O/dig_antes
fresh t_ok; $P -d t_ok -f $A > $O/ok.out 2> $O/ok.err; r=$?
echo "T1 aplicacao integral: exit=$r guarda=$(grep -c 'ETAPA 6.3-B: guarda ok' $O/ok.err) pos=$(grep -c 'verificacao pos-aplicacao ok' $O/ok.err) ultimo=$(grep -E '^(BEGIN|COMMIT|ROLLBACK)$' $O/ok.out | tail -1); depois: $($P -d t_ok -c "$FP")"
echo "T1 POSTFLIGHT: $($P -d t_ok -f supabase/ETAPA6-3-B-POSTFLIGHT.sql | grep -E '"(aplicacao_ok|divergencias)"' | tr -d ' ' | tr '\n' ' ')"
$P -d t_ok -f supabase/ETAPA6-3-B-POSTFLIGHT.sql | sed -n '/"digitais"/,/}/p' | grep -v digitais | tr -d ' ,' | sort > $O/dig_depois
echo "T1 digitais pre-flight == post-flight (apps, scores, Aprovacao 1, pacote HOLOS, Daniel, Rodrigo, exames, LI): $(cmp -s $O/dig_antes $O/dig_depois && echo IGUAIS || echo DIFERENTES) ($(wc -l < $O/dig_antes) linhas)"
echo "T1 Aprovacao 1 preservada: $($P -d t_ok -c "select string_agg(step||':'||responsible||':'||role||':v'||package_version||':vigente='||(invalidated_at is null)||':hash='||left(content_hash,8), ',') from methodology_package_approvals")"
echo "T1 Rodrigo: $($P -d t_ok -c "select string_agg(scope||':active='||active||':data='||(deactivated_at is not null)||':motivo='||(length(deactivation_reason)>0), ',' order by scope) from methodology_approvers where approval_stage=2")"
echo "T1 historico: $($P -d t_ok -c "select version||' '||name||' created_by='||coalesce(created_by,'null')||' stmts='||array_length(statements,1) from supabase_migrations.schema_migrations where version='20261003100000'")"
$P -d t_ok -f $A > $O/2.out 2> $O/2.err; r=$?; echo "T2 segunda execucao: exit=$r (esperado <>0) msg=$(grep -o 'ABORTADA NA GUARDA[^.]*' $O/2.err | head -1 | cut -c1-90) depois: $($P -d t_ok -c "$FP")"
fresh t_div; $P -d t_div -qc "insert into public.integrated_reading_package_approvals (package_id, package_version, content_hash, step, role, responsible, justification, approved_by) select id, 2, li_hash_conteudo(id), 1, 'responsavel_primario', 'Daniel', 'x', (select user_id from methodology_approvers where approval_stage=1 limit 1) from integrated_reading_rule_packages where version=2"
$P -d t_div -f $A > $O/div.out 2> $O/div.err; r=$?; echo "T3 estado divergente (LI com 1 aprovacao): exit=$r (esperado <>0) msg=$(grep -o 'li_aprovacoes=[^;]*' $O/div.err | head -1) depois: $($P -d t_div -c "$FP")"
fresh t_mid; sed '0,/^-- 6\. HOLOSCAN: homologar/s//select 1\/0; -- FALHA INJETADA\n-- 6. HOLOSCAN: homologar/' $A > $O/mid.sql
grep -q 'FALHA INJETADA' $O/mid.sql || echo "  (injecao nao aplicada)"
$P -d t_mid -f $O/mid.sql > $O/mid.out 2> $O/mid.err; r=$?; echo "T4 falha injetada no meio da migration (depois de desativar Rodrigo): exit=$r (esperado <>0) erro=$(grep -o 'division by zero' $O/mid.err | head -1) depois: $($P -d t_mid -c "$FP")"
fresh t_pos; sed 's/"n_constraints":323/"n_constraints":324/' $A > $O/pos.sql; $P -d t_pos -f $O/pos.sql > $O/pos.out 2> $O/pos.err; r=$?; echo "T5 pos-verificacao falhando (324 esperado): exit=$r (esperado <>0) msg=$(grep -o 'ABORTADA NA VERIFICACAO POS-APLICACAO: [^;]*' $O/pos.err | head -1) depois: $($P -d t_pos -c "$FP")"
echo "T6 RPCs depois da aplicacao (transacao descartada):"
$P -d t_ok <<'SQL' 2>&1 | sed 's/^/   /'
begin;
create temp table _u (k text primary key, v uuid);
insert into _u select 'daniel', user_id from methodology_approvers where approval_stage = 1 limit 1;
insert into _u select 'rodrigo', user_id from methodology_approvers where approval_stage = 2 limit 1;
create function pg_temp.como(k text) returns void language sql as $f$ select set_config('request.jwt.claims', json_build_object('sub', (select v from _u where _u.k = $1), 'role', 'authenticated')::text, true) $f$;
create function pg_temp.tenta(sql text) returns text language plpgsql as $f$ begin execute sql; return 'ACEITO'; exception when others then return 'recusado: ' || left(sqlerrm, 70); end $f$;
select pg_temp.como('rodrigo');
select 'Rodrigo etapa 2 HOLOS: ' || pg_temp.tenta($q$select public.registrar_aprovacao_metodologica((select id from methodology_packages), 2, 'Rodrigo', 'x', public.metodologia_hash_conteudo((select id from methodology_packages)))$q$);
select 'Rodrigo homologar HOLOS: ' || pg_temp.tenta($q$select public.aprovar_pacote_metodologico((select id from methodology_packages), '{}')$q$);
select pg_temp.como('daniel');
select 'Daniel etapa 2 HOLOS: ' || pg_temp.tenta($q$select public.registrar_aprovacao_metodologica((select id from methodology_packages), 2, 'Rodrigo', 'x', public.metodologia_hash_conteudo((select id from methodology_packages)))$q$);
select 'Daniel homologar HOLOS (A1 existente): ' || pg_temp.tenta($q$select public.aprovar_pacote_metodologico((select id from methodology_packages), '{}')$q$);
select 'pacote: ' || status || ' regime=' || governance_regime || ' reviewed_by_nulo=' || (reviewed_by is null and reviewed_at is null) || ' approved_by=daniel:' || (approved_by = (select v from _u where k = 'daniel')) || ' hash=' || left(content_hash, 8) from methodology_packages;
select 'registro: ' || source || ' | ' || responsible from methodology_homologation_records;
select 'aprovacoes HOLOS: ' || count(*) || ' (etapa2=' || count(*) filter (where step = 2) || ')' from methodology_package_approvals;
select 'LI A1 Daniel: ' || pg_temp.tenta($q$select public.registrar_aprovacao_li((select id from integrated_reading_rule_packages where version = 2), 2, 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9', 1, 'Daniel', 'x')$q$);
select 'LI homologar Daniel: ' || pg_temp.tenta($q$select public.homologar_pacote_li((select id from integrated_reading_rule_packages where version = 2), 2, 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9', 'Daniel')$q$);
select 'snapshot LI: approval_2_nulo=' || (approval_2 is null) || ' regime=' || governance_regime || ' prov_regime=' || (select approval_provenance->>'regime' from integrated_reading_rule_packages where version = 2) || ' prov_tem_aprovacao_2=' || (select approval_provenance ? 'aprovacao_2' from integrated_reading_rule_packages where version = 2) from integrated_reading_package_snapshots;
rollback;
SQL
for d in t_ok t_div t_mid t_pos; do psql -U postgres -d postgres -qc "drop database if exists $d" >/dev/null; done
