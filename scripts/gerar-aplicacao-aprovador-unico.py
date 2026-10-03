#!/usr/bin/env python3
"""Gera supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql: UMA transacao = guarda do estado real atual (pos 6.3-A + Aprovacao 1 de Daniel no
HOLOS-V1@2) + migration 20261003100000 + 1 linha de historico + verificacao pos-aplicacao (inclusive: aprovacao existente, pacote HOLOS,
aplicacoes historicas e scores identicos byte a byte ao que a guarda capturou) + COMMIT.
Fonte: supabase/migrations/20261003100000_governanca_aprovador_unico.sql em HEAD, sem nenhuma transformacao textual."""
import re, hashlib, glob, sys
V = '20261003100000'
HASH_HOLOS = '7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402'
HASH_LI = 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9'
fs = glob.glob(f'supabase/migrations/{V}_*.sql'); assert len(fs) == 1
MIG = fs[0]; mig = open(MIG, encoding='utf-8').read()
assert not re.search(r'^\s*(begin|commit|rollback)\s*;\s*$', mig, re.I | re.M)
assert '$function$' not in mig
nome = MIG.split('/')[-1][:-4].split('_', 1)[1]

# medidas comuns a guarda e a verificacao (nenhuma devolve uid, e-mail ou dado clinico)
MEDIDAS = """    'hist_n', (select count(*) from supabase_migrations.schema_migrations),
    'hist_ultima', (select max(version) from supabase_migrations.schema_migrations),
    'n_tabelas', (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'),
    'n_funcoes', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'),
    'n_policies', (select count(*) from pg_policy p join pg_class c on c.oid = p.polrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'),
    'n_triggers', (select count(*) from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and not t.tgisinternal),
    'n_constraints', (select count(*) from pg_constraint k join pg_namespace n on n.oid = k.connamespace where n.nspname = 'public'),
    'papeis', (select string_agg(scope || '/' || approval_stage || '/' || display_name || '/' || active, ',' order by scope, approval_stage) from public.methodology_approvers),
    'aprovadores_uids', (select count(distinct user_id) from public.methodology_approvers),
    'daniel_mesmo_uid_2_escopos', (select count(distinct user_id) = 1 and count(*) = 2 from public.methodology_approvers where approval_stage = 1 and display_name = 'Daniel'),
    'met_pacotes', (select count(*) from public.methodology_packages),
    'holos', (select string_agg(code || '@' || version || ':' || status, ',') from public.methodology_packages),
    'holos_hash', (select public.metodologia_hash_conteudo(id) from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'holos_dono_e_daniel', (select p.nutritionist_id = d.user_id from public.methodology_packages p, public.methodology_approvers d where p.code = 'HOLOS-V1' and p.version = 2 and d.scope = 'holoscan' and d.approval_stage = 1 and d.display_name = 'Daniel'),
    'holos_reviewed_by_nulo', (select reviewed_by is null and reviewed_at is null from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'met_aprovacoes', (select string_agg(a.step || ':' || a.responsible || ':' || a.role || ':v' || a.package_version || ':vigente=' || (a.invalidated_at is null) || ':hash_ok=' || (a.content_hash = '%(HH)s') || ':uid_daniel=' || (a.approved_by = d.user_id) || ':papel_daniel=' || (a.approver_id = d.id), ',' order by a.approved_at) from public.methodology_package_approvals a left join public.methodology_approvers d on d.scope = 'holoscan' and d.approval_stage = 1 and d.display_name = 'Daniel'),
    'met_aprovacoes_n', (select count(*) from public.methodology_package_approvals),
    'met_registros', (select count(*) from public.methodology_homologation_records),
    'li', (select string_agg(code || '@' || version || ':' || status, ',' order by version) from public.integrated_reading_rule_packages),
    'li_hash', (select public.li_hash_conteudo(id) from public.integrated_reading_rule_packages where code = 'LI-V1' and version = 2),
    'li_aprovacoes', (select count(*) from public.integrated_reading_package_approvals),
    'li_snapshots', (select count(*) from public.integrated_reading_package_snapshots),
    'holoscan_applications', (select count(*) from public.holoscan_applications),
    'apps_com_proveniencia', (select count(*) from public.holoscan_applications where methodology_package_id is not null),
    'patients', (select count(*) from public.patients),
    'holoscan_system_scores', (select count(*) from public.holoscan_system_scores),
    'lab_collections', (select count(*) from public.lab_collections),
    'lab_results', (select count(*) from public.lab_results),
    'auth_users', (select count(*) from auth.users),
    'leituras', (select count(*) from public.integrated_readings)""" % {'HH': HASH_HOLOS}

# impressoes digitais (md5 de linhas inteiras), capturadas na guarda e comparadas no fim
DIGITAIS = """    ('apps', (select md5(coalesce(string_agg(to_jsonb(a)::text, ';' order by a.id), '')) from public.holoscan_applications a)),
    ('scores', (select md5(coalesce(string_agg(to_jsonb(s)::text, ';' order by s.id), '')) from public.holoscan_system_scores s)),
    ('met_aprovacoes', (select md5(coalesce(string_agg(to_jsonb(x)::text, ';' order by x.id), '')) from public.methodology_package_approvals x)),
    ('holos_pacote', (select md5(coalesce(string_agg((to_jsonb(p) - 'governance_regime')::text, ';' order by p.id), '')) from public.methodology_packages p)),
    ('daniel', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, active, notes, created_at, created_by from public.methodology_approvers where approval_stage = 1) r)),
    ('rodrigo_identidade', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from (select id, user_id, scope, approval_stage, display_name, notes, created_at, created_by from public.methodology_approvers where approval_stage = 2) r)),
    ('lab_results', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.lab_results r)),
    ('li_pacotes', (select md5(coalesce(string_agg(to_jsonb(r)::text, ';' order by r.id), '')) from public.integrated_reading_rule_packages r))"""

ESP_GUARDA = ('{"hist_n":30,"hist_ultima":"20261002130000","n_tabelas":44,"n_funcoes":62,"n_policies":129,"n_triggers":89,"n_constraints":317,'
  '"papeis":"holoscan/1/Daniel/true,holoscan/2/Rodrigo/true,integrated_reading/1/Daniel/true,integrated_reading/2/Rodrigo/true","aprovadores_uids":2,"daniel_mesmo_uid_2_escopos":true,'
  '"met_pacotes":1,"holos":"HOLOS-V1@2:em_revisao","holos_hash":"%s","holos_dono_e_daniel":true,"holos_reviewed_by_nulo":true,'
  '"met_aprovacoes":"1:Daniel:responsavel_primario:v2:vigente=true:hash_ok=true:uid_daniel=true:papel_daniel=true","met_aprovacoes_n":1,"met_registros":0,'
  '"li":"LI-V1@1:rascunho,LI-V1@2:em_revisao","li_hash":"%s","li_aprovacoes":0,"li_snapshots":0,"holoscan_applications":4,"apps_com_proveniencia":0,'
  '"patients":5,"holoscan_system_scores":20,"lab_collections":3,"lab_results":22,"auth_users":3,"leituras":0}') % (HASH_HOLOS, HASH_LI)
ESP_POS = (ESP_GUARDA.replace('"hist_n":30,"hist_ultima":"20261002130000"', '"hist_n":31,"hist_ultima":"%s"' % V)
  .replace('"n_constraints":317', '"n_constraints":323')
  .replace('holoscan/2/Rodrigo/true', 'holoscan/2/Rodrigo/false').replace('integrated_reading/2/Rodrigo/true', 'integrated_reading/2/Rodrigo/false'))
assert ESP_POS != ESP_GUARDA

out = []
out.append("""-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3-B — GOVERNANCA DE APROVADOR UNICO (Daniel): migration %(V)s
-- Projeto alvo: Holohacking (sllhyymeeyoozokgbnuv). Executar INTEIRO, de uma vez, no SQL Editor (nada selecionado; Ctrl+End = COMMIT;).
-- Decisao: docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md (perda consciente dos quatro olhos; nenhuma segunda revisao simulada).
-- UMA transacao: guarda do estado real atual -> migration %(V)s -> 1 linha em supabase_migrations.schema_migrations
-- -> verificacao pos-aplicacao -> COMMIT. Qualquer falha aborta tudo: nada persiste.
-- Antes: backup/snapshot e supabase/ETAPA6-3-B-PREFLIGHT.sql com pode_aplicar = true. Depois: supabase/ETAPA6-3-B-POSTFLIGHT.sql.
-- NAO cria aprovacao, NAO homologa, NAO preenche reviewed_by, NAO apaga aprovador, NAO toca aplicacoes HOLOSCAN, scores, exames,
-- LI, nem a Aprovacao 1 ja registrada por Daniel no HOLOS-V1@2. Nenhum uid ou e-mail e impresso.
-- ============================================================================
BEGIN;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
set local idle_in_transaction_session_timeout = '60s';

-- ---------------------------------------------------------------------------
-- GUARDA (dentro da transacao): o banco tem de estar EXATAMENTE no estado real conferido em 2026-10-03
-- ---------------------------------------------------------------------------
create temp table _etapa63b_digitais (k text primary key, antes text not null) on commit drop;
do $guarda$
declare f jsonb; esperado jsonb := '%(EG)s'::jsonb; k text; dif text := '';
begin
  if exists (select 1 from supabase_migrations.schema_migrations where version = '%(V)s') then
    raise exception 'ETAPA 6.3-B ABORTADA NA GUARDA: a versao %(V)s ja esta registrada (segunda execucao?)' using errcode = 'P0001', hint = 'etapa6_3_b_guarda';
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'methodology_approvers' and column_name = 'deactivated_at') then
    raise exception 'ETAPA 6.3-B ABORTADA NA GUARDA: methodology_approvers.deactivated_at ja existe' using errcode = 'P0001', hint = 'etapa6_3_b_guarda';
  end if;
  select jsonb_build_object(
%(M)s
  ) into f;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  if dif <> '' then raise exception 'ETAPA 6.3-B ABORTADA NA GUARDA: estado divergente do conferido -> %%', dif using errcode = 'P0001', hint = 'etapa6_3_b_guarda'; end if;
  insert into _etapa63b_digitais (k, antes) values
%(D)s;
  raise notice 'ETAPA 6.3-B: guarda ok (30 migrations; 4 papeis ativos; HOLOS-V1@2 em_revisao 7af1dae6 com 1 aprovacao de Daniel; LI 0 aprovacoes; 4 aplicacoes sem proveniencia)';
end $guarda$;

-- ---------------------------------------------------------------------------
-- MIGRATION: %(F)s
-- ---------------------------------------------------------------------------""" % {'V': V, 'EG': ESP_GUARDA, 'M': MEDIDAS, 'D': DIGITAIS, 'F': MIG.split('/')[-1]})
out.append(mig.rstrip('\n'))
tag = '$hist_%s$' % V; assert tag not in mig
out.append("""
-- ---------------------------------------------------------------------------
-- HISTORICO: 1 linha nova em supabase_migrations.schema_migrations, no mesmo formato das 14 linhas da Etapa 6.2
-- (statements = array de 1 elemento com o SQL do arquivo; created_by, idempotency_key e rollback = null). As 30 linhas existentes nao sao tocadas.
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
%(M)s,
    'etapa2_ativos', (select count(*) from public.methodology_approvers where approval_stage = 2 and active),
    'rodrigo_desativados_com_data_e_motivo', (select count(*) from public.methodology_approvers where approval_stage = 2 and display_name = 'Rodrigo' and not active and deactivated_at is not null and length(btrim(deactivation_reason)) > 0),
    'aprovadores_total', (select count(*) from public.methodology_approvers),
    'aprovacoes_etapa2', (select (select count(*) from public.methodology_package_approvals where step <> 1) + (select count(*) from public.integrated_reading_package_approvals where step <> 1)),
    'holos_regime', (select coalesce(governance_regime, 'nulo') from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'snapshot_approval_2_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'integrated_reading_package_snapshots' and column_name = 'approval_2'),
    'rpcs_aprovador_unico', (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public'
       and ((p.proname in ('registrar_aprovacao_metodologica', 'registrar_aprovacao_li') and p.prosrc like '%%etapa_descontinuada%%')
         or (p.proname in ('aprovar_pacote_metodologico', 'homologar_pacote_li') and p.prosrc like '%%aprovador_unico%%' and p.prosrc not like '%%a2.%%')))
  ) into f;
  esperado := esperado || '{"etapa2_ativos":0,"rodrigo_desativados_com_data_e_motivo":2,"aprovadores_total":4,"aprovacoes_etapa2":0,"holos_regime":"nulo","snapshot_approval_2_nullable":"YES","rpcs_aprovador_unico":4}'::jsonb;
  for k in select jsonb_object_keys(esperado) loop
    if f->>k is distinct from esperado->>k then dif := dif || k || '=' || coalesce(f->>k, 'null') || ' (esperado ' || (esperado->>k) || '); '; end if;
  end loop;
  -- impressoes digitais: aplicacoes, scores, Aprovacao 1, pacote HOLOS, Daniel, identidade de Rodrigo, exames e pacotes LI identicos ao capturado na guarda
  for dg in select g.k, g.antes, d.depois from _etapa63b_digitais g join (values
%(D)s) as d(k, depois) on d.k = g.k loop
    if dg.antes is distinct from dg.depois then dif := dif || 'digital ' || dg.k || ' mudou; '; end if;
  end loop;
  if (select count(*) from _etapa63b_digitais) <> 8 then dif := dif || 'digitais incompletas; '; end if;
  if dif <> '' then raise exception 'ETAPA 6.3-B ABORTADA NA VERIFICACAO POS-APLICACAO: %%', dif using errcode = 'P0001', hint = 'etapa6_3_b_pos'; end if;
  raise notice 'ETAPA 6.3-B: verificacao pos-aplicacao ok (31 migrations; Rodrigo desativado x2 com data e motivo; Aprovacao 1 de Daniel intacta; 0 aprovacoes de etapa 2; 4 aplicacoes intactas)';
end $pos$;

-- ULTIMA INSTRUCAO: confirma tudo de uma vez. (Nao ha ROLLBACK no caminho de sucesso; toda falha acima ja aborta a transacao.)
COMMIT;""" % {'EP': ESP_POS, 'M': MEDIDAS, 'D': DIGITAIS.replace("    ('", "    ('")})
txt = '\n'.join(out) + '\n'
dest = sys.argv[1] if len(sys.argv) > 1 else 'supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql'
open(dest, 'w', encoding='utf-8').write(txt)
print(dest, len(txt.encode()), 'bytes', txt.count('\n'), 'linhas', 'sha256', hashlib.sha256(txt.encode()).hexdigest())

# PRE-FLIGHT e POST-FLIGHT (somente leitura; mesmas medidas da guarda e da verificacao)
def flight(titulo, esperado, extra, chave):
    return """-- ============================================================================
-- HOLOHACKING V1 — ETAPA 6.3-B — %s (SOMENTE LEITURA; nao mostra uid, e-mail nem dado clinico)
-- Gerado por scripts/gerar-aplicacao-aprovador-unico.py. "%s" = true so quando TODAS as medidas batem com o esperado.
-- Guarde tambem "digitais": o POST-FLIGHT tem de devolver os MESMOS valores (aplicacoes, scores, Aprovacao 1, pacote HOLOS, exames, LI).
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
EXTRA_PRE = """,
    'versao_ja_registrada', (select count(*) from supabase_migrations.schema_migrations where version = '%s'),
    'coluna_desativacao_existe', (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'methodology_approvers' and column_name = 'deactivated_at')""" % V
EXTRA_POS = """,
    'etapa2_ativos', (select count(*) from public.methodology_approvers where approval_stage = 2 and active),
    'rodrigo_desativados_com_data_e_motivo', (select count(*) from public.methodology_approvers where approval_stage = 2 and display_name = 'Rodrigo' and not active and deactivated_at is not null and length(btrim(deactivation_reason)) > 0),
    'aprovadores_total', (select count(*) from public.methodology_approvers),
    'aprovacoes_etapa2', (select (select count(*) from public.methodology_package_approvals where step <> 1) + (select count(*) from public.integrated_reading_package_approvals where step <> 1)),
    'holos_regime', (select coalesce(governance_regime, 'nulo') from public.methodology_packages where code = 'HOLOS-V1' and version = 2),
    'snapshot_approval_2_nullable', (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'integrated_reading_package_snapshots' and column_name = 'approval_2')"""
ESP_PRE = ESP_GUARDA[:-1] + ',"versao_ja_registrada":0,"coluna_desativacao_existe":0}'
ESP_POSF = ESP_POS[:-1] + ',"etapa2_ativos":0,"rodrigo_desativados_com_data_e_motivo":2,"aprovadores_total":4,"aprovacoes_etapa2":0,"holos_regime":"nulo","snapshot_approval_2_nullable":"YES"}'
if len(sys.argv) <= 1:
    for nomearq, t in (('supabase/ETAPA6-3-B-PREFLIGHT.sql', flight('PRE-FLIGHT (rodar ANTES da aplicacao)', ESP_PRE, EXTRA_PRE, 'pode_aplicar')),
                       ('supabase/ETAPA6-3-B-POSTFLIGHT.sql', flight('POST-FLIGHT (rodar DEPOIS do COMMIT)', ESP_POSF, EXTRA_POS, 'aplicacao_ok'))):
        open(nomearq, 'w', encoding='utf-8').write(t)
        print(nomearq, 'sha256', hashlib.sha256(t.encode()).hexdigest())
