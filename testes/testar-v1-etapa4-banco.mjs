/**
 * V1 — ETAPA 4 — O BANCO: Pacote Metodologico (Supabase falso, que espelha a
 * migration 20260930190000 e usa o MESMO validador do navegador; a cadeia foi
 * validada no banco real em BEGIN/ROLLBACK — docs/v1/ETAPA4-PACOTE-METODOLOGICO.md).
 *
 *    1  pacote aprovado e imutavel (pacote e filhas)
 *    2  pacote retirado permanece recuperavel (sem hard-delete; leitura continua)
 *    3  outro profissional nao altera homologacao (nem le rascunho alheio)
 *    4  pergunta duplicada detectada
 *    5  associacao orfa detectada
 *    6  escala inexistente detectada
 *    7  aprovacao incompleta recusada (validador; registro sem responsavel)
 *    8  pacote rascunho nao vira oficial (UPDATE direto de status recusado)
 *    9  pacote nao vigente nao vira oficial (barreira)
 *   10  registros historicos mantem versao (holoscan_applications.methodology_package_id)
 *   +   inventario importado nasce rascunho e nao e publicavel; registro de homologacao imutavel
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from './supabase-falso.mjs';
import '../metodologia-motor.js';
import '../metodologia.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x');
const UB = srv.criarConta('b@holo.test', 'x');
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const select = (uid, t, filtros) => q(uid, t, 'select', { filtros: filtros || [] });
const update = (uid, t, dados, filtros) => q(uid, t, 'update', { dados, filtros });
const del = (uid, t, filtros) => q(uid, t, 'delete', { filtros });
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const eq = (col, val) => [{ op: 'eq', col, val }];
const linha = (t, id) => srv.linhas(t).find(x => x.id === id);
const P = globalThis.PacoteMetodologico;

/** Grava um pacote completo (fixture TEST_FIXTURE_ONLY) com status em_revisao e elementos aprovados. */
function gravarFixture(uid, code, mut) {
  const pk = insert(uid, 'methodology_packages', { code, version: 1, status: 'em_revisao', origin: 'fixture de teste', justification: 'teste' }).data[0];
  const ed = insert(uid, 'methodology_questionnaire_editions', { package_id: pk.id, code: code + '-q', version: 1, status: 'aprovada', item_count: 3 }).data[0];
  const A = 'aprovado';
  insert(uid, 'methodology_scales', { package_id: pk.id, code: 'e03', min_value: 0, max_value: 3, labels: ['a', 'b', 'c', 'd'], status: A });
  insert(uid, 'methodology_systems', [{ package_id: pk.id, code: 'A', name: 'Sistema A', status: A }, { package_id: pk.id, code: 'B', name: 'Sistema B', status: A }]);
  insert(uid, 'methodology_questions', [{ package_id: pk.id, edition_id: ed.id, stable_id: 'Q1', statement: 'q1', block: 'fisico', scale_code: 'e03', orientation: 'direta', temporal_context: 'ultimos_30_dias', status: A },
    { package_id: pk.id, edition_id: ed.id, stable_id: 'Q2', statement: 'q2', block: 'fisico', scale_code: 'e03', orientation: 'invertida', temporal_context: 'ultimos_30_dias', status: A },
    { package_id: pk.id, edition_id: ed.id, stable_id: 'Q3', statement: 'q3', block: 'mental_emocional', scale_code: 'e03', orientation: 'direta', temporal_context: 'ultimos_30_dias', status: A }]);
  insert(uid, 'methodology_associations', [{ package_id: pk.id, question_stable_id: 'Q1', destination_type: 'system', destination_id: 'A', weight: 2, role: 'primaria', status: A },
    { package_id: pk.id, question_stable_id: 'Q2', destination_type: 'system', destination_id: 'A', weight: 1, role: 'primaria', status: A },
    { package_id: pk.id, question_stable_id: 'Q3', destination_type: 'system', destination_id: 'B', weight: 3, role: 'primaria', status: A },
    { package_id: pk.id, question_stable_id: 'Q1', destination_type: 'triad', destination_id: 'fisico', weight: 2, status: A },
    { package_id: pk.id, question_stable_id: 'Q2', destination_type: 'triad', destination_id: 'fisico', weight: 1, status: A },
    { package_id: pk.id, question_stable_id: 'Q3', destination_type: 'triad', destination_id: 'mental', weight: 3, status: A }]);
  for (const s of ['A', 'B']) insert(uid, 'methodology_ranges', [{ package_id: pk.id, destination_type: 'system', destination_id: s, lower_bound: 0, upper_bound: 5, lower_inclusive: true, upper_inclusive: true, label: 'baixo', status: A },
    { package_id: pk.id, destination_type: 'system', destination_id: s, lower_bound: 5, upper_bound: 10, lower_inclusive: false, upper_inclusive: true, label: 'alto', status: A }]);
  insert(uid, 'methodology_rules', [{ package_id: pk.id, rule_type: 'scoring', target: 'A', payload: { formula: 'fixture' }, status: A }, { package_id: pk.id, rule_type: 'scoring', target: 'B', payload: { formula: 'fixture' }, status: A },
    { package_id: pk.id, rule_type: 'absence', target: 'global', payload: { denominador: 'respondidos', cobertura_minima: 0.5, recusado: 'exclui', nao_aplicavel: 'exclui', minimos: {} }, status: A },
    { package_id: pk.id, rule_type: 'index', target: 'global', payload: { alphas: { A: 0.5, B: 0.5 }, elegibilidade: 'todos', indice_parcial: false }, status: A },
    ...['fisico', 'mental', 'espiritual'].map(e => ({ package_id: pk.id, rule_type: 'triad', target: e, payload: { contribuicao: 'por_id', escala: '0..10', elegibilidade: 'cobertura_minima', cobertura_minima: 0.8, agregacao: 'ponderada' }, status: A })),
    { package_id: pk.id, rule_type: 'example', target: 'ex1', payload: { entrada: { Q1: 3 }, esperado: { A: { nota: 0 } } }, status: A }]);
  if (mut) mut(pk);
  return pk;
}
const REG = { responsible: 'Responsável humano (teste)', justification: 'fixture aprovado para teste', decided_at: '2026-10-01' };

titulo('7-8. APROVACAO NAO E EDICAO ADMINISTRATIVA');
const fx = gravarFixture(UA, 'TEST_FIXTURE_ONLY');
let r = update(UA, 'methodology_packages', { status: 'aprovado' }, eq('id', fx.id));
ok(r.error && /aprovar_pacote_metodologico/.test(r.error.message) && linha('methodology_packages', fx.id).status === 'em_revisao', '8: UPDATE direto para "aprovado" e recusado: pacote continua em_revisao');
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: fx.id, p_registro: { responsible: '', justification: 'x' } });
ok(r.error && /responsavel humano/.test(r.error.message), '7: aprovacao sem responsavel humano e recusada');
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: fx.id, p_registro: null });
ok(r.error && /registro de homologacao/.test(r.error.message), '7: aprovacao sem registro e recusada');
const vazio = insert(UA, 'methodology_packages', { code: 'VAZIO', version: 1, status: 'em_revisao' }).data[0];
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: vazio.id, p_registro: REG });
ok(r.error && /publicacao bloqueada pelo validador/.test(r.error.message) && linha('methodology_packages', vazio.id).status === 'em_revisao', '7: pacote incompleto: validador bloqueia a aprovacao');
const v = rpc(UA, 'validar_pacote_metodologico', { p_package_id: vazio.id }).data;
ok(v && v.publicavel === false && v.erros.some(e => e.codigo === 'vazio') && v.erros.some(e => e.codigo === 'politica_parcialidade_ausente'), 'validador no servidor aponta os erros (nao corrige)');

titulo('4-6. VALIDADOR: DUPLICADA, ORFA, ESCALA INEXISTENTE');
const fx2 = gravarFixture(UA, 'FX2');
const ed2 = srv.linhas('methodology_questionnaire_editions').find(e => e.package_id === fx2.id);
r = insert(UA, 'methodology_questions', { package_id: fx2.id, edition_id: ed2.id, stable_id: 'Q1', statement: 'dup', block: 'fisico', scale_code: 'e03', orientation: 'direta', status: 'aprovado' });
ok(r.error && r.error.code === '23505', '4: pergunta duplicada na mesma edicao e recusada pelo unique');
const ed2b = insert(UA, 'methodology_questionnaire_editions', { package_id: fx2.id, code: 'FX2-q', version: 2, status: 'aprovada' }).data[0];
insert(UA, 'methodology_questions', { package_id: fx2.id, edition_id: ed2b.id, stable_id: 'Q1', statement: 'dup em outra edicao', block: 'fisico', scale_code: 'e03', orientation: 'direta', status: 'aprovado' });
let v2 = rpc(UA, 'validar_pacote_metodologico', { p_package_id: fx2.id }).data;
ok(v2.erros.some(e => e.codigo === 'id_duplicado' && e.onde === 'Q1'), '4: ID duplicado entre edicoes do pacote detectado pelo validador');
insert(UA, 'methodology_questions', { package_id: fx2.id, edition_id: ed2.id, stable_id: 'Q4', statement: 'orfa', block: 'espiritual', scale_code: 'e99', orientation: null, status: 'aprovado' });
v2 = rpc(UA, 'validar_pacote_metodologico', { p_package_id: fx2.id }).data;
ok(v2.erros.some(e => e.codigo === 'associacao_orfa' && e.onde === 'Q4'), '5: associacao orfa detectada');
ok(v2.erros.some(e => e.codigo === 'referencia_inexistente' && /e99/.test(e.mensagem)), '6: escala inexistente detectada');
ok(v2.erros.some(e => e.codigo === 'orientacao_ausente' && e.onde === 'Q4'), '+: orientacao ausente detectada (nunca "direta")');
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: fx2.id, p_registro: REG });
ok(r.error && /publicacao bloqueada/.test(r.error.message), '7: com esses erros a aprovacao e recusada');

titulo('1. PACOTE APROVADO E IMUTAVEL');
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: fx.id, p_registro: REG });
ok(!r.error && r.data.status === 'aprovado' && /^[0-9a-f]{64}$/.test(r.data.content_hash) && linha('methodology_packages', fx.id).status === 'aprovado', 'fixture completo aprovado pela RPC, com hash');
const reg = srv.linhas('methodology_homologation_records').filter(x => x.package_id === fx.id);
ok(reg.length === 1 && reg[0].responsible === REG.responsible && reg[0].decision === 'aprovado' && reg[0].created_by === UA, 'registro de homologacao gravado com o responsavel informado (nao inventado)');
r = update(UA, 'methodology_packages', { justification: 'mudar depois' }, eq('id', fx.id));
ok(r.error && /imutavel/.test(r.error.message), '1: pacote aprovado nao muda (justification)');
r = update(UA, 'methodology_packages', { status: 'rascunho' }, eq('id', fx.id));
ok(r.error && /imutavel/.test(r.error.message), '1: aprovado nao volta a rascunho');
const q1 = srv.linhas('methodology_questions').find(x => x.package_id === fx.id && x.stable_id === 'Q1');
r = update(UA, 'methodology_questions', { statement: 'outro enunciado' }, eq('id', q1.id));
ok(r.error && /imutavel/.test(r.error.message) && linha('methodology_questions', q1.id).statement === 'q1', '1: pergunta de pacote aprovado nao muda');
r = insert(UA, 'methodology_associations', { package_id: fx.id, question_stable_id: 'Q1', destination_type: 'system', destination_id: 'B', weight: 9, status: 'aprovado' });
ok(r.error && /imutavel/.test(r.error.message), '1: nenhuma associacao nova entra em pacote aprovado');
r = del(UA, 'methodology_associations', eq('package_id', fx.id));
ok(r.error && /imutavel/.test(r.error.message) && srv.linhas('methodology_associations').filter(x => x.package_id === fx.id).length === 6, '1: nada e apagado de pacote aprovado');
r = update(UA, 'methodology_homologation_records', { responsible: 'outro' }, eq('id', reg[0].id));
ok(!r.error && r.data.length === 0 && linha('methodology_homologation_records', reg[0].id).responsible === REG.responsible, '+: registro de homologacao nao muda (sem policy de UPDATE: 0 linhas; trigger recusa qualquer UPDATE)');
r = del(UA, 'methodology_packages', eq('id', fx.id));
ok(!r.error && linha('methodology_packages', fx.id), 'sem DELETE de pacote (0 linhas, sem erro)');

titulo('10. REGISTROS HISTORICOS MANTEM VERSAO');
const pa = insert(UA, 'patients', { nome: 'A', status: 'ativo' }).data[0].id;
const app = srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: { application: { patient_id: pa, quando: '2026-05-01', versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {} }, answers: [], scores: [] } } }).data;
r = update(UA, 'holoscan_applications', { methodology_package_id: fx.id }, eq('id', app));
ok(r.error && /imutaveis/.test(r.error.message) && !linha('holoscan_applications', app).methodology_package_id, '10: methodology_package_id faz parte do snapshot historico: nao muda depois de gravado');
r = insert(UA, 'holoscan_applications', { patient_id: pa, quando: '2026-06-01', versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {}, methodology_package_id: fx.id });
ok(!r.error && r.data[0].methodology_package_id === fx.id, '10: aplicacao gravada com a versao do pacote usada');
r = insert(UA, 'holoscan_applications', { patient_id: pa, quando: '2026-06-02', versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {}, methodology_package_id: '00000000-0000-4000-8000-000000000000' });
ok(r.error && r.error.code === '23503', '10: referencia a pacote inexistente e recusada');

titulo('2. PACOTE RETIRADO PERMANECE RECUPERAVEL');
r = rpc(UA, 'retirar_pacote_metodologico', { p_package_id: fx.id, p_motivo: 'substituido pela v2', p_responsible: 'Responsável humano (teste)' });
const ret = linha('methodology_packages', fx.id);
ok(!r.error && ret.status === 'retirado' && ret.retired_at && ret.content_hash && select(UA, 'methodology_questions', eq('package_id', fx.id)).data.length === 3, '2: retirado com motivo; conteudo e hash continuam legiveis');
r = update(UA, 'methodology_packages', { status: 'aprovado' }, eq('id', fx.id));
ok(r.error && /retirado e historico|aprovacao nao e edicao administrativa/.test(r.error.message) && linha('methodology_packages', fx.id).status === 'retirado', '2: retirado nao volta a aprovado nem muda');
ok(select(UA, 'holoscan_applications', eq('methodology_package_id', fx.id)).data.length === 1, '2: o registro historico continua apontando para a versao retirada');
const semPol = globalThis.Metodologia;
ok(!P.vigente(ret) && semPol.ehSaidaHomologacao({ mode: 'oficial', package_status: 'retirado' }), '9/2: pacote retirado nao e vigente; saida de pacote nao aprovado nao e oficial');

titulo('9. PACOTE NAO VIGENTE NAO VIRA OFICIAL');
const fut = gravarFixture(UA, 'FUTURO');
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: fut.id, p_registro: Object.assign({}, REG, { effective_from: '2099-01-01' }) });
ok(!r.error && linha('methodology_packages', fut.id).status === 'aprovado', 'pacote aprovado com vigencia futura');
const M = globalThis.MotorMetodologico;
let erroOf = null; try { M.calcular({ responses: { Q1: 1 }, methodology_package: Object.assign({}, linha('methodology_packages', fut.id), { perguntas: [], associacoes: [], escalas: [], sistemas: [], faixas: [], regras: [] }), mode: 'oficial' }); } catch (e) { erroOf = e; }
ok(erroOf && erroOf.codigo === 'oficial_bloqueado' && /nao vigente/.test(erroOf.message), '9: modo oficial recusa pacote aprovado nao vigente');

titulo('3. OUTRO PROFISSIONAL');
const rasc = insert(UA, 'methodology_packages', { code: 'RASC', version: 1, status: 'rascunho' }).data[0];
ok(select(UB, 'methodology_packages', eq('id', rasc.id)).data.length === 0, '3: B nao le rascunho de A');
ok(select(UB, 'methodology_packages', eq('id', fx.id)).data.length === 1 && select(UB, 'methodology_questions', eq('package_id', fx.id)).data.length === 3, '3: B le pacote aprovado/retirado de A (metodo compartilhado) e suas filhas');
r = update(UB, 'methodology_packages', { notes: 'hack' }, eq('id', fx.id));
ok((!r.error && r.data.length === 0) && linha('methodology_packages', fx.id).notes !== 'hack', '3: B nao altera pacote de A (0 linhas)');
r = rpc(UB, 'aprovar_pacote_metodologico', { p_package_id: rasc.id, p_registro: REG });
ok(r.error && /nao encontrado/.test(r.error.message), '3: B nao aprova pacote de A');
r = rpc(UB, 'retirar_pacote_metodologico', { p_package_id: fut.id, p_motivo: 'x', p_responsible: 'B' });
ok(r.error && /nao encontrado/.test(r.error.message), '3: B nao retira pacote de A');
r = insert(UB, 'methodology_homologation_records', { package_id: fx.id, topic: 'x', element: 'y', decision: 'aprovado', responsible: 'B', decided_at: '2026-10-01' });
ok(r.error, '3: B nao registra homologacao em pacote de A (' + r.error.message.slice(0, 40) + ')');

titulo('+ INVENTARIO IMPORTADO NASCE RASCUNHO E NAO E PUBLICAVEL');
const inv = JSON.parse(readFileSync(new URL('../docs/v1/metodologia/inventario-metodologico-v1.json', import.meta.url), 'utf8'));
const pInv = P.importarInventario(inv, 'HOLOS-V1', 1);
const pk = insert(UA, 'methodology_packages', { code: pInv.code, version: 1, status: 'rascunho', origin: pInv.origin, notes: pInv.notes }).data[0];
const edI = insert(UA, 'methodology_questionnaire_editions', Object.assign({}, pInv.edicao, { package_id: pk.id })).data[0];
const ins = (t, l) => insert(UA, t, l.map(x => Object.assign({}, x, { package_id: pk.id })));
ins('methodology_scales', pInv.escalas); ins('methodology_systems', pInv.sistemas); ins('methodology_questions', pInv.perguntas.map(x => Object.assign({}, x, { edition_id: edI.id })));
ins('methodology_associacoes' === 'x' ? '' : 'methodology_associations', pInv.associacoes); ins('methodology_ranges', pInv.faixas); ins('methodology_rules', pInv.regras);
ok(srv.linhas('methodology_questions').filter(x => x.package_id === pk.id).length === 84 && srv.linhas('methodology_associations').filter(x => x.package_id === pk.id).length === 179, 'inventario gravado: 84 perguntas, 179 associacoes');
ok(srv.linhas('methodology_questions').filter(x => x.package_id === pk.id).every(x => x.status === 'para_homologacao') && linha('methodology_packages', pk.id).status === 'rascunho', 'tudo para_homologacao; pacote rascunho');
const vi = rpc(UA, 'validar_pacote_metodologico', { p_package_id: pk.id }).data;
ok(vi.publicavel === false && vi.erros.some(e => e.codigo === 'snt_pendente') && vi.erros.some(e => e.codigo === 'politica_parcialidade_ausente') && vi.erros.some(e => e.codigo === 'indice_incompleto') && vi.erros.some(e => e.codigo === 'triada_incompleta') && vi.erros.some(e => e.codigo === 'elemento_nao_aprovado'), 'validador: SNT pendente, parcialidade ausente, Indice e Triada incompletos, elementos nao aprovados');
update(UA, 'methodology_packages', { status: 'em_revisao' }, eq('id', pk.id));
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: REG });
ok(r.error && /publicacao bloqueada/.test(r.error.message) && linha('methodology_packages', pk.id).status === 'em_revisao', 'o inventario V1 NAO pode ser aprovado hoje — nem com registro');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
