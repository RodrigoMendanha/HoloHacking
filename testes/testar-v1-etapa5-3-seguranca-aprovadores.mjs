/**
 * V1 — ETAPA 5.3: IDENTIDADE REAL NA DUPLA APROVACAO (migration 20261002110000; Supabase falso que a espelha;
 * provada em PostgreSQL local — supabase/tests/etapa5-3-harness.sql).
 *
 *  Antes: Aprovacao 1/2 validava so a string "Daniel"/"Rodrigo". Agora o usuario autenticado (auth.uid()) tem de
 *  ser o aprovador ativo daquele escopo (holoscan | integrated_reading) e etapa (1 | 2) em methodology_approvers,
 *  configurada so por gestao tecnica. O nome e display/auditoria; a aprovacao guarda approved_by (uid) + approver_id.
 *  Um usuario tem no maximo um papel por escopo (quatro olhos). Daniel -> Rodrigo, hash, invalidacao, historico e
 *  acao final continuam iguais. HOLOSCAN e LI preservam suas regras.
 *
 *  MUDANCA LEGITIMA DE CONTRATO (Etapa 6.3-B, migration 20261003100000; DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md):
 *  aprovador unico (Daniel). O papel de Rodrigo (etapa 2) existe so como historico DESATIVADO (data + motivo); etapa 2
 *  ativa e recusada no cadastro; a RPC recusa a etapa 2 (descontinuada). A assercao de "quatro olhos na RPC" deu lugar
 *  a "etapa 2 nao pode ser reativada". Identidade real (uid), anon, impostor e "um papel por escopo" seguem provados.
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from './supabase-falso.mjs';
import '../metodologia-motor.js';
import '../metodologia-decisoes-v1.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const DANIEL = srv.criarConta('daniel@holo.test', 'x');
const RODRIGO = srv.criarConta('rodrigo@holo.test', 'x');
const NINGUEM = srv.criarConta('ninguem@holo.test', 'x');
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const select = (uid, t) => q(uid, t, 'select', {});
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const G = srv.gestaoTecnica;
const P = globalThis.PacoteMetodologico, D = globalThis.MetodologiaDecisoesV1;

titulo('1. CADASTRO DE APROVADORES: SO GESTAO TECNICA; NASCE VAZIO; UM PAPEL POR ESCOPO');
ok(srv.linhas('methodology_approvers').length === 0, 'nenhum aprovador nasce da migration/servidor (os uids reais nao estao no repositorio)');
let r = insert(DANIEL, 'methodology_approvers', { user_id: DANIEL, scope: 'holoscan', approval_stage: 1, display_name: 'Daniel' });
ok(r.error && r.error.code === '42501' && srv.linhas('methodology_approvers').length === 0, 'a aplicacao nao cadastra aprovador (sem GRANT de escrita)');
const DESAT = { active: false, deactivated_at: '2026-10-03T00:00:00Z', deactivation_reason: 'etapa 2 descontinuada (aprovador unico)' };
ok(G('methodology_approvers', 'insert', { user_id: RODRIGO, scope: 'holoscan', approval_stage: 2, display_name: 'Rodrigo' }).error.code === '23514' && srv.linhas('methodology_approvers').length === 0, 'etapa 2 ATIVA e recusada no cadastro (approvers_somente_etapa1_ativa)');
ok(G('methodology_approvers', 'insert', Object.assign({ user_id: RODRIGO, scope: 'holoscan', approval_stage: 2, display_name: 'Rodrigo' }, DESAT, { deactivation_reason: ' ' })).error.code === '23514', 'desativacao sem motivo e recusada (approvers_desativacao_coerente)');
['holoscan', 'integrated_reading'].forEach(sc => { G('methodology_approvers', 'insert', { user_id: DANIEL, scope: sc, approval_stage: 1, display_name: 'Daniel' }); G('methodology_approvers', 'insert', Object.assign({ user_id: RODRIGO, scope: sc, approval_stage: 2, display_name: 'Rodrigo' }, DESAT)); });
ok(srv.linhas('methodology_approvers').length === 4 && srv.linhas('methodology_approvers').filter(a => a.active !== false).every(a => a.display_name === 'Daniel' && a.approval_stage === 1), 'gestao tecnica: Daniel (etapa 1, ativo) nos dois escopos; Rodrigo (etapa 2) so como historico desativado');
ok(G('methodology_approvers', 'insert', Object.assign({ user_id: DANIEL, scope: 'holoscan', approval_stage: 2, display_name: 'Rodrigo' }, DESAT)).error.code === '23505', 'o mesmo usuario nao pode ter dois papeis no mesmo escopo');
ok(G('methodology_approvers', 'insert', { user_id: NINGUEM, scope: 'holoscan', approval_stage: 1, display_name: 'Rodrigo' }).error.code === '23514', 'display_name tem de bater com a etapa (Daniel = 1, Rodrigo = 2)');
ok(select(DANIEL, 'methodology_approvers').data.length === 2 && select(DANIEL, 'methodology_approvers').data.every(a => a.user_id === DANIEL) && select(NINGUEM, 'methodology_approvers').data.length === 0, 'cada conta le so os proprios papeis (RLS)');
ok(rpc(DANIEL, 'meus_papeis_aprovacao', {}).data.length === 2 && rpc(RODRIGO, 'meus_papeis_aprovacao', {}).data.length === 0 && rpc(NINGUEM, 'meus_papeis_aprovacao', {}).data.length === 0, 'meus_papeis_aprovacao devolve os papeis ATIVOS da conta (Daniel: 2; Rodrigo desativado: vazio; sem papel: vazio)');
ok(rpc(null, 'meus_papeis_aprovacao', {}).error, 'anon nao consulta papeis');

titulo('2. LEITURA INTEGRADA: IDENTIDADE REAL');
const pk = G('integrated_reading_rule_packages', 'insert', { code: 'TEST_FIXTURE_ONLY-SEG', version: 1, status: 'em_revisao' }).data[0];
const h = rpc(DANIEL, 'li_hash_conteudo', { p_package_id: pk.id }).data;
const apLI = (uid, etapa, resp) => rpc(uid, 'registrar_aprovacao_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_etapa: etapa, p_responsavel: resp, p_justificativa: 'teste' });
const aprovsLI = () => srv.linhas('integrated_reading_package_approvals').filter(a => a.package_id === pk.id);
r = apLI(NINGUEM, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsLI().length === 0, 'outro usuario nao se passa por Daniel (LI)');
r = apLI(NINGUEM, 2, 'Rodrigo');
ok(r.error && /descontinuada/.test(r.error.message) && aprovsLI().length === 0, 'etapa 2 (Rodrigo) descontinuada: recusada (LI)');
r = apLI(RODRIGO, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message), 'Rodrigo (papel desativado) nao pode aprovar (nem digitando Daniel)');
r = apLI(null, 1, 'Daniel');
ok(r.error && /autenticado|permission denied/.test(r.error.message) && aprovsLI().length === 0, 'anon falha (sem sessao nao executa a RPC)');
r = apLI(DANIEL, 1, 'Daniel');
const a1 = aprovsLI()[0];
ok(!r.error && a1.approved_by === DANIEL && a1.approver_id && a1.responsible === 'Daniel' && r.data.approved_by === DANIEL, 'Daniel autorizado aprova a etapa 1; a aprovacao registra o user_id real, o approver_id e o nome (display) ');
r = apLI(DANIEL, 2, 'Rodrigo');
ok(r.error && /descontinuada/.test(r.error.message) && aprovsLI().length === 1, 'Daniel nao registra etapa 2 (nenhuma segunda revisao, nem simulada pelo proprio aprovador)');
r = apLI(RODRIGO, 2, 'Rodrigo');
ok(r.error && aprovsLI().length === 1 && aprovsLI().every(a => a.step === 1 && a.approved_by === DANIEL), 'Rodrigo nao registra etapa 2; historico com uma unica identidade (Daniel)');
r = rpc(NINGUEM, 'homologar_pacote_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_responsavel: 'Daniel' });
ok(r.error && /aprovador autorizado/.test(r.error.message), 'homologar e so do aprovador ativo da LI (impostor digitando Daniel recusado)');
r = rpc(RODRIGO, 'homologar_pacote_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_responsavel: 'Rodrigo' });
ok(r.error && /aprovador unico/.test(r.error.message), 'Rodrigo (papel desativado) nao homologa');
r = rpc(DANIEL, 'homologar_pacote_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_responsavel: 'Daniel' });
ok(r.error && /incompleta/.test(r.error.message), 'LI preserva a regra: o aprovador ativo ainda nao homologa pacote incompleto');
// etapa 2 nao volta: nem a gestao tecnica reativa o papel de Rodrigo sem nova decisao (nova migration)
r = G('methodology_approvers', 'update', { active: true, deactivated_at: null, deactivation_reason: null }, [{ op: 'eq', col: 'scope', val: 'integrated_reading' }, { op: 'eq', col: 'approval_stage', val: 2 }]);
ok(r.error && r.error.code === '23514' && srv.linhas('methodology_approvers').filter(a => a.approval_stage === 2 && a.active !== false).length === 0, 'reativar a etapa 2 e recusado (approvers_somente_etapa1_ativa); historico de desativacao preservado');
ok(G('methodology_approvers', 'delete', null, [{ op: 'eq', col: 'approval_stage', val: 2 }]).error && srv.linhas('methodology_approvers').length === 4, 'aprovador desativado nao e apagado (historico)');

titulo('3. HOLOSCAN: MESMA IDENTIDADE REAL; APROVADOR UNICO');
const inv = JSON.parse(readFileSync(new URL('../docs/v1/metodologia/inventario-metodologico-v1.json', import.meta.url), 'utf8'));
const c = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
const hp = insert(DANIEL, 'methodology_packages', { code: c.code, version: 2, status: 'em_revisao', origin: c.origin, justification: c.justification, notes: c.notes, lineage: c.lineage, content_hash: c.content_hash }).data[0];
const ed = insert(DANIEL, 'methodology_questionnaire_editions', Object.assign({}, c.edicao, { package_id: hp.id })).data[0];
const ins = (t, l) => { if (l.length) insert(DANIEL, t, l.map(x => Object.assign({}, x, { package_id: hp.id }))); };
ins('methodology_scales', c.escalas); ins('methodology_systems', c.sistemas); ins('methodology_questions', c.perguntas.map(x => Object.assign({}, x, { edition_id: ed.id })));
ins('methodology_associations', c.associacoes); ins('methodology_ranges', c.faixas); ins('methodology_rules', c.regras);
const hh = rpc(DANIEL, 'metodologia_hash_conteudo', { p_package_id: hp.id }).data;
const apH = (uid, etapa, resp) => rpc(uid, 'registrar_aprovacao_metodologica', { p_package_id: hp.id, p_etapa: etapa, p_responsavel: resp, p_justificativa: 'teste', p_content_hash: hh });
const aprovsH = () => srv.linhas('methodology_package_approvals').filter(a => a.package_id === hp.id);
ok(!select(RODRIGO, 'methodology_packages').data.some(x => x.id === hp.id) && !select(NINGUEM, 'methodology_packages').data.some(x => x.id === hp.id), 'Rodrigo (papel desativado) e conta sem papel nao leem o pacote em_revisao de outro profissional');
ok(rpc(RODRIGO, 'metodologia_hash_conteudo', { p_package_id: hp.id }).error, 'Rodrigo (papel desativado) nao consulta o hash do pacote alheio');
r = apH(NINGUEM, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsH().length === 0, 'outro usuario nao se passa por Daniel (HOLOSCAN)');
r = apH(RODRIGO, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message), 'HOLOSCAN: Rodrigo (papel desativado) nao aprova');
r = apH(DANIEL, 1, 'Daniel');
ok(!r.error && aprovsH()[0].approved_by === DANIEL && aprovsH()[0].approver_id && aprovsH()[0].nutritionist_id === DANIEL, 'HOLOSCAN: Daniel autorizado aprova a etapa 1 (uid real + approver_id)');
r = apH(DANIEL, 2, 'Rodrigo');
ok(r.error && /descontinuada/.test(r.error.message), 'HOLOSCAN: Daniel nao registra etapa 2 (descontinuada)');
r = apH(NINGUEM, 2, 'Rodrigo');
ok(r.error && /descontinuada/.test(r.error.message) && aprovsH().length === 1, 'HOLOSCAN: outro usuario nao registra etapa 2');
r = apH(RODRIGO, 2, 'Rodrigo');
ok(r.error && aprovsH().length === 1, 'HOLOSCAN: Rodrigo nao registra etapa 2');
r = rpc(RODRIGO, 'aprovar_pacote_metodologico', { p_package_id: hp.id, p_registro: {} });
ok(r.error && srv.linhas('methodology_packages').find(x => x.id === hp.id).status === 'em_revisao', 'HOLOSCAN: Rodrigo (desativado, nao dono) nao homologa');
r = rpc(DANIEL, 'aprovar_pacote_metodologico', { p_package_id: hp.id, p_registro: {} });
const hpf = srv.linhas('methodology_packages').find(x => x.id === hp.id);
ok(!r.error && hpf.status === 'aprovado' && /^Daniel/.test(hpf.responsible) && !/Rodrigo/.test(hpf.responsible) && hpf.governance_regime === 'aprovador_unico' && hpf.reviewed_by === null && hpf.reviewed_at === null, 'HOLOSCAN: acao final do dono que e o aprovador ativo (Daniel), regime aprovador_unico, reviewed_by/at nulos');
ok(aprovsH().every(a => a.approved_by && a.approver_id && a.responsible && a.step === 1) && new Set(aprovsH().map(a => a.approved_by)).size === 1, 'historico mantem display_name + user_id real; uma unica identidade (sem segunda revisao)');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
