/**
 * V1 — ETAPA 5.3: IDENTIDADE REAL NA DUPLA APROVACAO (migration 20261002110000; Supabase falso que a espelha;
 * provada em PostgreSQL local — supabase/tests/etapa5-3-harness.sql).
 *
 *  Antes: Aprovacao 1/2 validava so a string "Daniel"/"Rodrigo". Agora o usuario autenticado (auth.uid()) tem de
 *  ser o aprovador ativo daquele escopo (holoscan | integrated_reading) e etapa (1 | 2) em methodology_approvers,
 *  configurada so por gestao tecnica. O nome e display/auditoria; a aprovacao guarda approved_by (uid) + approver_id.
 *  Um usuario tem no maximo um papel por escopo (quatro olhos). Daniel -> Rodrigo, hash, invalidacao, historico e
 *  acao final continuam iguais. HOLOSCAN e LI preservam suas regras.
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
['holoscan', 'integrated_reading'].forEach(sc => { G('methodology_approvers', 'insert', { user_id: DANIEL, scope: sc, approval_stage: 1, display_name: 'Daniel' }); G('methodology_approvers', 'insert', { user_id: RODRIGO, scope: sc, approval_stage: 2, display_name: 'Rodrigo' }); });
ok(srv.linhas('methodology_approvers').length === 4, 'gestao tecnica cadastra Daniel (etapa 1) e Rodrigo (etapa 2) nos dois escopos');
ok(G('methodology_approvers', 'insert', { user_id: DANIEL, scope: 'holoscan', approval_stage: 2, display_name: 'Rodrigo' }).error.code === '23505', 'o mesmo usuario nao pode ter dois papeis no mesmo escopo (quatro olhos no cadastro)');
ok(G('methodology_approvers', 'insert', { user_id: NINGUEM, scope: 'holoscan', approval_stage: 1, display_name: 'Rodrigo' }).error.code === '23514', 'display_name tem de bater com a etapa (Daniel = 1, Rodrigo = 2)');
ok(select(DANIEL, 'methodology_approvers').data.length === 2 && select(DANIEL, 'methodology_approvers').data.every(a => a.user_id === DANIEL) && select(NINGUEM, 'methodology_approvers').data.length === 0, 'cada conta le so os proprios papeis (RLS)');
ok(rpc(DANIEL, 'meus_papeis_aprovacao', {}).data.length === 2 && rpc(RODRIGO, 'meus_papeis_aprovacao', {}).data.every(x => x.display_name === 'Rodrigo' && x.approval_stage === 2) && rpc(NINGUEM, 'meus_papeis_aprovacao', {}).data.length === 0, 'meus_papeis_aprovacao devolve os papeis da conta (vazio para quem nao tem)');
ok(rpc(null, 'meus_papeis_aprovacao', {}).error, 'anon nao consulta papeis');

titulo('2. LEITURA INTEGRADA: IDENTIDADE REAL');
const pk = G('integrated_reading_rule_packages', 'insert', { code: 'TEST_FIXTURE_ONLY-SEG', version: 1, status: 'em_revisao' }).data[0];
const h = rpc(DANIEL, 'li_hash_conteudo', { p_package_id: pk.id }).data;
const apLI = (uid, etapa, resp) => rpc(uid, 'registrar_aprovacao_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_etapa: etapa, p_responsavel: resp, p_justificativa: 'teste' });
const aprovsLI = () => srv.linhas('integrated_reading_package_approvals').filter(a => a.package_id === pk.id);
r = apLI(NINGUEM, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsLI().length === 0, 'outro usuario nao se passa por Daniel (LI)');
r = apLI(NINGUEM, 2, 'Rodrigo');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsLI().length === 0, 'outro usuario nao se passa por Rodrigo (LI)');
r = apLI(RODRIGO, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message), 'Rodrigo autorizado nao pode a etapa 1 (nem digitando Daniel)');
r = apLI(null, 1, 'Daniel');
ok(r.error && /autenticado|permission denied/.test(r.error.message) && aprovsLI().length === 0, 'anon falha (sem sessao nao executa a RPC)');
r = apLI(DANIEL, 1, 'Daniel');
const a1 = aprovsLI()[0];
ok(!r.error && a1.approved_by === DANIEL && a1.approver_id && a1.responsible === 'Daniel' && r.data.approved_by === DANIEL, 'Daniel autorizado aprova a etapa 1; a aprovacao registra o user_id real, o approver_id e o nome (display) ');
r = apLI(DANIEL, 2, 'Rodrigo');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsLI().length === 1, 'Daniel nao pode a etapa 2: mudar o campo textual responsible nao contorna auth.uid()');
r = apLI(RODRIGO, 2, 'Rodrigo');
const a2 = aprovsLI().find(a => a.step === 2);
ok(!r.error && a2.approved_by === RODRIGO && a2.approver_id && a2.approved_by !== a1.approved_by, 'Rodrigo autorizado aprova a etapa 2 depois de Daniel; duas identidades distintas no historico');
r = rpc(NINGUEM, 'homologar_pacote_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_responsavel: 'Rodrigo' });
ok(r.error && /aprovador autorizado/.test(r.error.message), 'homologar e so de aprovador autorizado da LI');
r = rpc(RODRIGO, 'homologar_pacote_li', { p_package_id: pk.id, p_version: 1, p_content_hash: h, p_responsavel: 'Rodrigo' });
ok(r.error && /incompleta/.test(r.error.message), 'LI preserva a regra: aprovador autorizado ainda nao homologa pacote incompleto');
// quatro olhos tambem na RPC: se (por erro de cadastro em outro escopo) a mesma pessoa tentasse as duas etapas
const ns = G('integrated_reading_rule_packages', 'insert', { code: 'TEST_FIXTURE_ONLY-SEG2', version: 1, status: 'em_revisao' }).data[0];
const hs = rpc(DANIEL, 'li_hash_conteudo', { p_package_id: ns.id }).data;
rpc(DANIEL, 'registrar_aprovacao_li', { p_package_id: ns.id, p_version: 1, p_content_hash: hs, p_etapa: 1, p_responsavel: 'Daniel', p_justificativa: 't' });
G('methodology_approvers', 'update', { user_id: DANIEL }, [{ op: 'eq', col: 'scope', val: 'integrated_reading' }, { op: 'eq', col: 'approval_stage', val: 2 }]);
r = rpc(DANIEL, 'registrar_aprovacao_li', { p_package_id: ns.id, p_version: 1, p_content_hash: hs, p_etapa: 2, p_responsavel: 'Rodrigo', p_justificativa: 't' });
ok(r.error && /quatro olhos/.test(r.error.message), 'mesmo que o cadastro desse os dois papeis a uma pessoa, a RPC recusa a Aprovacao 2 do mesmo uid da Aprovacao 1');
G('methodology_approvers', 'update', { user_id: RODRIGO }, [{ op: 'eq', col: 'scope', val: 'integrated_reading' }, { op: 'eq', col: 'approval_stage', val: 2 }]);

titulo('3. HOLOSCAN: MESMA IDENTIDADE REAL; DANIEL -> RODRIGO INTACTO');
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
ok(select(RODRIGO, 'methodology_packages').data.some(x => x.id === hp.id) && !select(NINGUEM, 'methodology_packages').data.some(x => x.id === hp.id), 'Rodrigo (aprovador) le o pacote em_revisao de outro profissional para conferir o hash; conta sem papel nao');
ok(rpc(RODRIGO, 'metodologia_hash_conteudo', { p_package_id: hp.id }).data === hh, 'o hash conferido por Rodrigo e o mesmo do servidor');
r = apH(NINGUEM, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsH().length === 0, 'outro usuario nao se passa por Daniel (HOLOSCAN)');
r = apH(RODRIGO, 1, 'Daniel');
ok(r.error && /aprovador autorizado/.test(r.error.message), 'HOLOSCAN: Rodrigo autorizado nao pode a etapa 1');
r = apH(DANIEL, 1, 'Daniel');
ok(!r.error && aprovsH()[0].approved_by === DANIEL && aprovsH()[0].approver_id && aprovsH()[0].nutritionist_id === DANIEL, 'HOLOSCAN: Daniel autorizado aprova a etapa 1 (uid real + approver_id)');
r = apH(DANIEL, 2, 'Rodrigo');
ok(r.error && /aprovador autorizado/.test(r.error.message), 'HOLOSCAN: Daniel nao pode a etapa 2 digitando Rodrigo');
r = apH(NINGUEM, 2, 'Rodrigo');
ok(r.error && /aprovador autorizado/.test(r.error.message) && aprovsH().length === 1, 'HOLOSCAN: outro usuario nao se passa por Rodrigo');
r = apH(RODRIGO, 2, 'Rodrigo');
ok(!r.error && aprovsH().find(a => a.step === 2).approved_by === RODRIGO, 'HOLOSCAN: Rodrigo autorizado aprova a etapa 2 depois de Daniel');
r = rpc(DANIEL, 'aprovar_pacote_metodologico', { p_package_id: hp.id, p_registro: {} });
ok(!r.error && srv.linhas('methodology_packages').find(x => x.id === hp.id).status === 'aprovado' && /Daniel.*Rodrigo/.test(srv.linhas('methodology_packages').find(x => x.id === hp.id).responsible), 'HOLOSCAN: acao final do dono depois das duas aprovacoes continua igual (Daniel -> Rodrigo, hash, registro)');
ok(aprovsH().every(a => a.approved_by && a.approver_id && a.responsible) && new Set(aprovsH().map(a => a.approved_by)).size === 2, 'historico mantem display_name + user_id real, com duas identidades');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
