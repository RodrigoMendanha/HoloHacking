#!/usr/bin/env python3
"""Gera supabase/ETAPA6-2-APLICACAO-REAL.sql: UMA transacao = guarda pre-flight + 14 migrations + 14 linhas de historico + verificacao pos-aplicacao + COMMIT.
Fonte: os arquivos de supabase/migrations em HEAD. Unica transformacao textual nas migrations: delimitador $function$ -> $$ (igual a V3 aprovada no dry-run real)."""
import re, hashlib, glob, sys
ORDEM = ['20260930130000','20260930140000','20260930150000','20260930160000','20260930170000','20260930180000','20260930190000','20261001200000','20261001210000','20261001220000','20261002100000','20261002110000','20261002120000','20261002130000']
HASH_LI = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9'
def normalizar(s):
    if 'AS $function$' in s:
        for body in re.findall(r'AS \$function\$(.*?)\$function\$;', s, re.S): assert '$$' not in body
        s = s.replace('AS $function$', 'AS $$').replace('$function$;', '$$;')
    return s
out = []
out.append("""-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.2 — APLICACAO REAL DAS 14 MIGRATIONS (20260930130000 .. 20261002130000)
-- Projeto alvo: Holohacking (sllhyymeeyoozokgbnuv). Executar INTEIRO, de uma vez, no SQL Editor (nada selecionado; Ctrl+End = COMMIT;).
-- UMA transacao: guarda do fingerprint aprovado (gate 6.1) -> 14 migrations na ordem -> 14 linhas em supabase_migrations.schema_migrations
-- -> verificacao pos-aplicacao -> COMMIT. Qualquer falha aborta tudo: nenhum objeto e nenhuma linha de historico persistem.
-- Antes: backup/snapshot do projeto e supabase/ETAPA6-2-PREFLIGHT.sql com pode_aplicar = true. Depois: supabase/ETAPA6-2-POSTFLIGHT.sql.
-- Nao cadastra aprovadores, nao aprova, nao homologa, nao faz backfill de proveniencia HOLOSCAN, nao toca as 16 linhas antigas do historico.
-- ============================================================================
BEGIN;
set local lock_timeout = '5s';
set local statement_timeout = '110s';
set local idle_in_transaction_session_timeout = '60s';

-- ---------------------------------------------------------------------------
-- GUARDA PRE-FLIGHT (dentro da transacao): o banco tem de estar EXATAMENTE no fingerprint aprovado no gate 6.1
-- ---------------------------------------------------------------------------
do $guarda$
declare f jsonb; esperado jsonb := '{"hist_n":16,"hist_ultima":"20260929192605","n_tabelas":14,"n_funcoes":7,"n_policies":49,"n_triggers":12,"n_constraints":64,"patients":5,"holoscan_applications":4,"holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"auth_users":3,"tabelas_novas":0,"versoes_novas_ja_registradas":0}'::jsonb; k text; dif text := '';
begin
  select jsonb_build_object(
    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'patients', (select count(*) from public.patients),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'auth_users', (select count(*) from auth.users),
    'tabelas_novas', (select count(*) from pg_tables where schemaname = 'public' and tablename in ('methodology_packages','methodology_approvers','integrated_reading_rule_packages','integrated_readings','lab_exam_catalog','encounters','anamneses','conducts','report_emissions')),
    'versoes_novas_ja_registradas', (select count(*) from supabase_migrations.schema_migrations where version in (""" + ",".join("'%s'" % v for v in ORDEM) + """))
  ) into f;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  if dif <> '' then raise exception 'ETAPA 6.2 ABORTADA NA GUARDA: fingerprint divergente do aprovado no gate 6.1 -> %', dif using errcode = 'P0001', hint = 'etapa6_2_guarda'; end if;
  raise notice 'ETAPA 6.2: guarda ok (fingerprint 16/14/7/49/12/64, dados 5/4/20/3/22/3)';
end $guarda$;
""")
arquivos = []
for v in ORDEM:
    fs = glob.glob(f'supabase/migrations/{v}_*.sql'); assert len(fs) == 1, v
    arquivos.append(fs[0])
for f in arquivos:
    s = open(f, encoding='utf-8').read()
    assert not re.search(r'^\s*(begin|commit|rollback)\s*;\s*$', s, re.I | re.M), f
    out.append(f"\n-- ---------------------------------------------------------------------------\n-- MIGRATION: {f.split('/')[-1]}\n-- ---------------------------------------------------------------------------")
    out.append(normalizar(s).rstrip('\n'))
out.append("""
-- ---------------------------------------------------------------------------
-- HISTORICO: 14 linhas novas em supabase_migrations.schema_migrations, no formato observado no banco real (2026-10-03):
-- version = timestamp do arquivo; name = sufixo do arquivo; statements = array de 1 elemento com o SQL do arquivo do repositorio;
-- idempotency_key e rollback = null (como nas 16 linhas existentes); created_by = null (ver docs/v1/ETAPA6-2-APLICACAO-REAL.md: o e-mail
-- das linhas antigas e gravado pelo mecanismo do Dashboard/MCP e nao e reproduzivel honestamente pelo SQL Editor; nao se falsifica metadado).
-- As 16 linhas antigas nao sao tocadas.
-- ---------------------------------------------------------------------------""")
for f in arquivos:
    s = open(f, encoding='utf-8').read()
    base = f.split('/')[-1][:-4]; v, nome = base.split('_', 1)
    tag = f'$hist_{v}$'; assert tag not in s
    out.append(f"insert into supabase_migrations.schema_migrations (version, name, statements) values ('{v}', '{nome}', array[{tag}{s}{tag}]);")
out.append("""
-- ---------------------------------------------------------------------------
-- VERIFICACAO POS-APLICACAO (dentro da transacao): qualquer divergencia -> RAISE -> nada persiste
-- ---------------------------------------------------------------------------
do $pos$
declare f jsonb; esperado jsonb := '{"hist_n":30,"hist_ultima":"20261002130000","versoes_novas":14,"n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":317,"catalogo":45,"li_pacotes":"LI-V1@1:rascunho,LI-V1@2:em_revisao","li_hash_v2":"%s","approvers":0,"li_aprovacoes":0,"met_aprovacoes":0,"leituras":0,"met_pacotes":0,"encounters":0,"holoscan_applications":4,"apps_com_proveniencia":0,"patients":5,"holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"auth_users":3,"identidade_violacoes":0,"identidade_validada":true,"lab_results_legado_preenchido":22,"nota_nullable":"YES","triggers_arquivado_ativos":"O,O"}'::jsonb; k text; dif text := '';
begin
  select jsonb_build_object(
    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'versoes_novas', (select count(*) from supabase_migrations.schema_migrations where version in (%s)),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'catalogo', (select count(*) from public.lab_exam_catalog),
    'li_pacotes', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
    'li_hash_v2', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
    'approvers', (select count(*) from public.methodology_approvers),
    'li_aprovacoes', (select count(*) from public.integrated_reading_package_approvals),
    'met_aprovacoes', (select count(*) from public.methodology_package_approvals),
    'leituras', (select count(*) from public.integrated_readings),
    'met_pacotes', (select count(*) from public.methodology_packages),
    'encounters', (select count(*) from public.encounters),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
    'patients', (select count(*) from public.patients),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'auth_users', (select count(*) from auth.users),
    'identidade_violacoes', (select count(*) from public.lab_results where not (exam_code is not null or custom_exam_id is not null or origin in ('additional_legacy','legacy_migrated') or requires_manual_mapping)),
    'identidade_validada', (select convalidated from pg_constraint where conname = 'lab_results_identidade'),
    'lab_results_legado_preenchido', (select count(*) from public.lab_results where legacy_exame_id is not null and value_original_text is not null),
    'nota_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'holoscan_system_scores' and column_name = 'nota'),
    'triggers_arquivado_ativos', (select string_agg(tgenabled::text, ',' order by tgname) from pg_trigger where tgname in ('lab_collections_paciente_arquivado','lab_results_paciente_arquivado'))
  ) into f;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  if dif <> '' then raise exception 'ETAPA 6.2 ABORTADA NA VERIFICACAO POS-APLICACAO: %%', dif using errcode = 'P0001', hint = 'etapa6_2_pos'; end if;
  raise notice 'ETAPA 6.2: verificacao pos-aplicacao ok (30 migrations, 44 tabelas, hash LI-V1@2 confirmado, 0 aprovadores/aprovacoes, 0 backfill)';
end $pos$;

-- ULTIMA INSTRUCAO: confirma tudo de uma vez. (Nao ha ROLLBACK no caminho de sucesso; toda falha acima ja aborta a transacao.)
COMMIT;""" % (HASH_LI, ",".join("'%s'" % v for v in ORDEM)))
txt = '\n'.join(out) + '\n'
dest = sys.argv[1] if len(sys.argv) > 1 else 'supabase/ETAPA6-2-APLICACAO-REAL.sql'
open(dest, 'w', encoding='utf-8').write(txt)
print(dest, len(txt.encode()), 'bytes', txt.count('\n'), 'linhas', 'sha256', hashlib.sha256(txt.encode()).hexdigest())
