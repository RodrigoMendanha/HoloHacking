#!/usr/bin/env python3
"""Gera supabase/ETAPA6-5-APLICACAO-HOLOSCAN-OFICIAL.sql (+ PREFLIGHT e POSTFLIGHT): UMA transacao = guarda do estado real atual
(pos 6.3-E: HOLOS-V1@2 e LI-V1@2 aprovados, 4 aplicacoes historicas sem proveniencia, 0 aplicacoes novas) + migration 20261005100000
(correcao P0: aplicacao HOLOSCAN so oficial) + 1 linha de historico + verificacao pos-aplicacao (aplicacoes historicas, scores,
respostas, pacotes e aprovacoes identicos ao que a guarda capturou) + COMMIT.
Fonte: supabase/migrations/20261005100000_holoscan_oficial_v1.sql em HEAD, sem nenhuma transformacao textual."""
import re, hashlib, glob, sys
V = '20261005100000'
HASH_HOLOS = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402'
HASH_LI = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9'
FP_HIST = '205812d8e238e293fe8b58205ffa5631'
fs = glob.glob(f'supabase/migrations/{V}_*.sql'); assert len(fs) == 1
MIG = fs[0]; mig = open(MIG, encoding='utf-8').read()
assert not re.search(r'^\s*(begin|commit|rollback)\s*;\s*$', mig, re.I | re.M)
nome = MIG.split('/')[-1][:-4].split('_', 1)[1]

# medidas da guarda/verificacao (nenhuma devolve uid, e-mail ou dado clinico; pacientes NAO entram: o uso real os muda)
MEDIDAS = """    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
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
    'leituras', (select count(*) from public.integrated_readings)"""

# impressoes digitais (md5 de linhas inteiras / colunas explicitas). As aplicacoes usam a LISTA de colunas anterior a migration:
# to_jsonb(a) mudaria so porque as colunas novas (nulas) aparecem, sem nenhum dado alterado.
COLS_APP = ("a.id, a.nutritionist_id, a.patient_id, a.encounter_id, a.quando, a.versao_estrutura, a.versao_bancos, a.indice, a.indice_maximo, a.avaliavel, a.nota_media, "
            "a.triada, a.triada_com_dado, a.cobertura, a.combinacoes, a.aprofundamentos, a.interpretacao_texto, a.interpretacao_em, a.interpretacao_versao, "
            "a.methodology_package_id, a.methodology_package_version, a.created_at, a.updated_at")
DIGITAIS = """    ('apps', (select md5(coalesce(string_agg(concat_ws('|', %s), ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('respostas', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.holoscan_answers r)),
    ('holos_pacote', (select md5(coalesce(string_agg(to_jsonb(p)::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('holos_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_registro', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_homologation_records x)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r)),
    ('li_aprovacao', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_approvals x)),
    ('li_snapshot', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.integrated_reading_package_snapshots x)),
    ('exames', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r))""" % COLS_APP
N_DIG = DIGITAIS.count("    ('")

ESP_GUARDA = ('{"hist_n":31,"hist_ultima":"20261003100000","n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":323,'
  '"holos":"HOLOS-V1@2:aprovado:aprovador_unico","holos_hash":"%(H)s","holos_content_hash_homologado":"%(H)s","holos_vigencia":"2026-10-03..",'
  '"li":"LI-V1@1:rascunho,LI-V1@2:aprovado","li_hash":"%(L)s","holoscan_applications":4,"apps_com_proveniencia":0,"apps_novas":0,'
  '"historicas_fingerprint":"%(F)s","holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"leituras":0}') % {'H': HASH_HOLOS, 'L': HASH_LI, 'F': FP_HIST}
ESP_POS = (ESP_GUARDA.replace('"hist_n":31,"hist_ultima":"20261003100000"', '"hist_n":32,"hist_ultima":"%s"' % V)
  .replace('"n_funcoes":62', '"n_funcoes":63').replace('"n_policies":129', '"n_policies":126')
  .replace('"n_triggers":89', '"n_triggers":90').replace('"n_constraints":323', '"n_constraints":326'))
assert ESP_POS != ESP_GUARDA

EXTRA_POS = """,
    'colunas_novas', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_content_hash', 'engine_version', 'engine_contract_version', 'calculation_mode')),
    'colunas_novas_preenchidas', (select count(*) from public.holoscan_applications where methodology_content_hash is not null or engine_version is not null or engine_contract_version is not null or calculation_mode is not null),
    'indice_aceita_nulo', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name = 'indice'),
    'policies_insert_holoscan', (select count(*) from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a'),
    'trigger_exigir_oficial', (select count(*) from pg_trigger where tgrelid = 'public.holoscan_applications'::regclass and tgname = 'holoscan_applications_exigir_oficial'),
    'rpc_exige_oficial', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'salvar_holoscan_completo'
       and p.prosrc like '%%proveniencia_obrigatoria%%' and p.prosrc like '%%contagem_divergente%%' and p.prosrc like '%%faixa_fora_do_pacote%%' and p.prosrc like '%%metodologia_hash_conteudo%%'),
    'rpc_sem_anon', (select not has_function_privilege('anon', 'public.salvar_holoscan_completo(jsonb)', 'execute')),
    'rpc_authenticated', (select has_function_privilege('authenticated', 'public.salvar_holoscan_completo(jsonb)', 'execute')),
    'faixa_aceita_v1', (select pg_get_constraintdef(oid) like '%%intermediaria%%' and pg_get_constraintdef(oid) like '%%medio%%' from pg_constraint where conname = 'holoscan_system_scores_faixa_valida')"""
ESP_EXTRA_POS = '{"colunas_novas":4,"colunas_novas_preenchidas":0,"indice_aceita_nulo":"YES","policies_insert_holoscan":0,"trigger_exigir_oficial":1,"rpc_exige_oficial":1,"rpc_sem_anon":true,"rpc_authenticated":true,"faixa_aceita_v1":true}'
EXTRA_PRE = """,
    'versao_ja_registrada', (select count(*) from supabase_migrations.schema_migrations where version = '%s'),
    'colunas_novas', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name in ('methodology_content_hash', 'engine_version', 'engine_contract_version', 'calculation_mode')),
    'policies_insert_holoscan', (select count(*) from pg_policy where polrelid in ('public.holoscan_applications'::regclass, 'public.holoscan_system_scores'::regclass, 'public.holoscan_answers'::regclass) and polcmd = 'a')""" % V
ESP_EXTRA_PRE = '{"versao_ja_registrada":0,"colunas_novas":0,"policies_insert_holoscan":3}'

out = []
out.append("""-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.5 — CORRECAO P0: APLICACAO HOLOSCAN SO OFICIAL (migration %(V)s)
-- Projeto alvo: Holohacking (sllhyymeeyoozokgbnuv). Executar INTEIRO, de uma vez, no SQL Editor (nada selecionado; Ctrl+End = COMMIT;).
-- Achado: o front calculava pelo motor LEGADO e gravava com o carimbo HOLOS-V1@2. A partir daqui o servidor so aceita aplicacao
-- OFICIAL (pacote aprovado e vigente, hash homologado, motor/contrato, contagens pelos vinculos primarios, sem combinacoes).
-- UMA transacao: guarda do estado real atual -> migration %(V)s -> 1 linha em supabase_migrations.schema_migrations
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
declare f jsonb; esperado jsonb := '%(EG)s'::jsonb; k text; dif text := '';
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '%(V)s') then
    raise exception 'ETAPA 6.5 ABORTADA NA GUARDA: a versao %(V)s ja esta registrada (segunda execucao?)' using errcode = 'P0001', hint = 'etapa6_5_guarda';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_applications' and column_name = 'calculation_mode') then
    raise exception 'ETAPA 6.5 ABORTADA NA GUARDA: holoscan_applications.calculation_mode ja existe' using errcode = 'P0001', hint = 'etapa6_5_guarda';
  end if;
  select jsonb_build_object(
%(M)s
  ) into f;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  if dif <> '' then raise exception 'ETAPA 6.5 ABORTADA NA GUARDA: estado divergente do conferido -> %%', dif using errcode = 'P0001', hint = 'etapa6_5_guarda'; end if;
  insert into _etapa65_digitais (k, antes) values
%(D)s;
  raise notice 'ETAPA 6.5: guarda ok (31 migrations; HOLOS-V1@2 e LI-V1@2 aprovados; 4 aplicacoes historicas sem proveniencia; 0 aplicacoes novas)';
end $guarda$;

-- ---------------------------------------------------------------------------
-- MIGRATION: %(F)s
-- ---------------------------------------------------------------------------""" % {'V': V, 'EG': ESP_GUARDA, 'M': MEDIDAS, 'D': DIGITAIS, 'F': MIG.split('/')[-1]})
out.append(mig.rstrip('\n'))
tag = '$hist_%s$' % V; assert tag not in mig
out.append("""
-- ---------------------------------------------------------------------------
-- HISTORICO: 1 linha nova em supabase_migrations.schema_migrations, no mesmo formato das anteriores
-- (statements = array de 1 elemento com o SQL do arquivo; created_by, idempotency_key e rollback = null). As 31 linhas existentes nao sao tocadas.
-- ---------------------------------------------------------------------------""")
out.append("insert into supabase_migrations.schema_migrations (version, name, statements) values ('%s', '%s', array[%s%s%s]);" % (V, nome, tag, mig, tag))
out.append("""
-- ---------------------------------------------------------------------------
-- VERIFICACAO POS-APLICACAO (dentro da transacao): qualquer divergencia -> RAISE -> nada persiste
-- ---------------------------------------------------------------------------
do $pos$
declare f jsonb; esperado jsonb := '%(EP)s'::jsonb; k text; dif text := ''; dg record;
begin
  select jsonb_build_object(
%(M)s%(X)s
  ) into f;
  esperado := esperado || '%(EX)s'::jsonb;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  -- impressoes digitais: aplicacoes (colunas anteriores), scores, respostas, pacotes, aprovacoes, registro, snapshot LI e exames identicos ao capturado
  for dg in select g.k, g.antes, d.depois from _etapa65_digitais g join (values
%(D)s) as d(k, depois) on d.k = g.k loop
    if dg.antes is distinct from dg.depois then dif := dif || 'digital ' || dg.k || ' mudou; '; end if;
  end loop;
  if (select count(*) from _etapa65_digitais) <> %(N)d then dif := dif || 'digitais incompletas; '; end if;
  if dif <> '' then raise exception 'ETAPA 6.5 ABORTADA NA VERIFICACAO POS-APLICACAO: %%', dif using errcode = 'P0001', hint = 'etapa6_5_pos'; end if;
  raise notice 'ETAPA 6.5: verificacao pos-aplicacao ok (32 migrations; RPC exige aplicacao oficial; sem insert direto; 4 aplicacoes historicas intactas)';
end $pos$;

-- ULTIMA INSTRUCAO: confirma tudo de uma vez. (Nao ha ROLLBACK no caminho de sucesso; toda falha acima ja aborta a transacao.)
COMMIT;""" % {'EP': ESP_POS, 'M': MEDIDAS, 'X': EXTRA_POS, 'EX': ESP_EXTRA_POS, 'D': DIGITAIS, 'N': N_DIG})
txt = '\n'.join(out) + '\n'
dest = sys.argv[1] if len(sys.argv) > 1 else 'supabase/ETAPA6-5-APLICACAO-HOLOSCAN-OFICIAL.sql'
open(dest, 'w', encoding='utf-8').write(txt)
print(dest, len(txt.encode()), 'bytes', txt.count('\n'), 'linhas', 'sha256', hashlib.sha256(txt.encode()).hexdigest())

def flight(titulo, esperado, extra, chave):
    return """-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.5 — %s (SOMENTE LEITURA; nao mostra uid, e-mail nem dado clinico)
-- Gerado por scripts/gerar-aplicacao-holoscan-oficial.py. "%s" = true so quando TODAS as medidas batem com o esperado.
-- Guarde tambem "digitais": o POST-FLIGHT tem de devolver os MESMOS valores (aplicacoes, scores, respostas, pacotes, aprovacoes, LI, exames).
-- ============================================================================
with m as (select jsonb_build_object(
%s%s
  ) as f),
e as (select '%s'::jsonb as e),
d as (select jsonb_object_agg(k, antes) as dig from (values
%s) as x(k, antes))
select jsonb_pretty(jsonb_build_object(
  '%s', (select bool_and((m.f->>k) is not distinct from (e.e->>k)) from m, e, jsonb_object_keys(e.e) k),
  'divergencias', (select coalesce(jsonb_object_agg(k, jsonb_build_object('atual', m.f->k, 'esperado', e.e->k)), '{}'::jsonb) from m, e, jsonb_object_keys(e.e) k where (m.f->>k) is distinct from (e.e->>k)),
  'medidas', (select f from m),
  'digitais', (select dig from d))) as resultado;
""" % (titulo, chave, MEDIDAS, extra, esperado, DIGITAIS, chave)
ESP_PRE = ESP_GUARDA[:-1] + ',' + ESP_EXTRA_PRE[1:]
ESP_POSF = ESP_POS[:-1] + ',' + ESP_EXTRA_POS[1:]
if len(sys.argv) <= 1:
    for nomearq, t in (('supabase/ETAPA6-5-PREFLIGHT.sql', flight('PRE-FLIGHT (rodar ANTES da aplicacao)', ESP_PRE, EXTRA_PRE, 'pode_aplicar')),
                       ('supabase/ETAPA6-5-POSTFLIGHT.sql', flight('POST-FLIGHT (rodar DEPOIS do COMMIT)', ESP_POSF, EXTRA_POS.replace('%%', '%'), 'aplicacao_ok'))):
        open(nomearq, 'w', encoding='utf-8').write(t)
        print(nomearq, 'sha256', hashlib.sha256(t.encode()).hexdigest())
