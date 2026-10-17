/**
 * V1 — ETAPA 6.0 (reescrita 09/10) — LEITURA INTEGRADA RETIRADA DO FLUXO; HISTORICO E PACOTE PRESERVADOS
 * (Supabase falso que espelha as migrations 20261002120000 + 20261011100000; a migration 20261011100000 foi
 * provada em PostgreSQL local — supabase/tests/prontuario-harness.sql)
 *
 *  - os pacotes LI-V1 (v1 infraestrutura, v2 candidato em revisao) continuam no servidor, globais e somente
 *    leitura: a aplicacao nao cria vinculo, nao muda dominio, nao aprova nem apaga pacote
 *  - a leitura HISTORICA (salva antes de 09/10) continua: o dono le; outra conta nao; ninguem altera
 *  - salvar_leitura_integrada recusa SEMPRE (li_desativada): com pacote candidato, com pacote aprovado por fixture,
 *    com e sem coleta; nenhuma leitura nova nasce; revisao de leitura historica tambem nao
 *  - exames nunca alteram HOLOSCAN (notas/faixas/Indice antes == depois de todas as tentativas)
 */
import './guarda-falhas.mjs';
import { createHash } from 'node:crypto';
import { criarServidor } from './supabase-falso.mjs';
import { semearHistorica, semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x'), UB = srv.criarConta('b@holo.test', 'x');
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const select = (uid, t, filtros) => q(uid, t, 'select', { filtros: filtros || [] });
const update = (uid, t, dados, filtros) => q(uid, t, 'update', { dados, filtros });
const del = (uid, t, filtros) => q(uid, t, 'delete', { filtros });
const eq = (col, val) => [{ op: 'eq', col, val }];
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const agora = () => new Date().toISOString();
const PA = insert(UA, 'patients', { nome: 'Paciente LI Ficticia' }).data[0].id;
const D = '2026-03-10';

titulo('1. PACOTES LI-V1: GLOBAIS, SOMENTE LEITURA');
const pks = select(UA, 'integrated_reading_rule_packages').data.filter(p => p.code === 'LI-V1').sort((a, b) => a.version - b.version);
ok(pks.length === 2 && pks[0].status === 'rascunho' && pks[1].status === 'em_revisao', 'LI-V1 v1 (rascunho de infraestrutura) e v2 (candidato em revisao) continuam no servidor');
const v2 = pks[1];
const doms = select(UA, 'integrated_reading_domains', eq('package_id', v2.id)).data;
ok(doms.length === 7 && select(UB, 'integrated_reading_rule_packages').data.length === pks.length, '7 dominios do v2; o pacote e visivel a qualquer conta');
ok(insert(UA, 'integrated_reading_exam_domain_links', { package_id: v2.id, domain_id: doms[0].id, exam_code: 'LAB-027' }).error
   && update(UA, 'integrated_reading_domains', { holoscan_system: 'fungico' }, eq('id', doms[0].id)).error
   && update(UA, 'integrated_reading_rule_packages', { status: 'aprovado' }, eq('id', v2.id)).error
   && del(UA, 'integrated_reading_rule_packages', eq('id', v2.id)).error, 'a aplicacao nao cria vinculo, nao muda dominio, nao aprova nem apaga pacote');

titulo('2. LEITURA HISTORICA: FICA, SO PARA O DONO, SEM ALTERACAO');
const LID = globalThis.crypto.randomUUID();
srv.tabelas.integrated_readings.push({ id: LID, nutritionist_id: UA, patient_id: PA, responsible: 'Nutri Teste', state: 'divergente', domain_code: 'LI-D01', rule_package_id: v2.id, rule_version: 2,
  professional_note: 'leitura anterior a 09/10', revision: 1, reason_codes: [], trace: {}, created_at: agora() });
const hid = semearHistorica(srv, UA, { application: { patient_id: PA, quando: D }, scores: [{ sistema: 'acido_inflamatorio', nome: 'A', nota: 5, carga: 5, faixa: 'medio', obtido: 1, maximo: 2, respondidos: 1, total_marcadores: 2, avaliavel: true }] });
ok(select(UA, 'integrated_readings').data.length === 1 && select(UA, 'integrated_readings').data[0].professional_note === 'leitura anterior a 09/10', 'o dono le a leitura historica');
ok(select(UB, 'integrated_readings').data.length === 0, 'outra conta nao');
ok(update(UA, 'integrated_readings', { state: 'convergente' }, eq('id', LID)).error.code === '42501' && del(UA, 'integrated_readings', eq('id', LID)).error.code === '42501', 'nem o dono altera ou apaga pela tabela (42501)');
const digital = () => createHash('sha256').update(JSON.stringify(['integrated_readings', 'integrated_reading_rule_packages', 'integrated_reading_domains', 'integrated_reading_exam_domain_links', 'integrated_reading_rules', 'holoscan_applications', 'holoscan_system_scores', 'lab_collections', 'lab_results'].map(t => srv.linhas(t)))).digest('hex');

titulo('3. salvar_leitura_integrada RECUSA SEMPRE');
const tenta = (rotulo, payload) => { const r = rpc(UA, 'salvar_leitura_integrada', { payload }); ok(r.error && r.error.hint === 'li_desativada' && r.data === null, rotulo + ': recusada (li_desativada) — ' + (r.error ? r.error.message : 'GRAVOU')); };
tenta('sem coleta, estado sem_dados_suficientes', { patient_id: PA, holoscan_application_id: hid, responsible: 'x', state: 'sem_dados_suficientes', rule_package_id: v2.id });
tenta('com pacote candidato (em revisao)', { patient_id: PA, holoscan_application_id: hid, responsible: 'x', state: 'convergente', domain_code: 'LI-D01', rule_package_id: v2.id, selected_collection_ids: [] });
const pkA = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const EA = insert(UA, 'encounters', { patient_id: PA, occurred_at: agora(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).data[0].id;
const HO = rpc(UA, 'salvar_holoscan_completo', { payload: payloadOficial(srv, pkA.id, { patient_id: PA, encounter_id: EA, quando: agora().slice(0, 10) }) }).data;
ok(!!HO, 'fixture: HOLOSCAN oficial salvo');
const scoresAntes = JSON.stringify(srv.linhas('holoscan_system_scores').filter(s => s.application_id === HO));
const antes = digital();   /* a partir daqui nada pode mudar */
srv.tabelas.integrated_reading_rule_packages.find(p => p.id === v2.id).status = 'aprovado';   // fixture: nem aprovado o pacote reabre o fluxo
tenta('com pacote LI aprovado (fixture) e HOLOSCAN oficial', { patient_id: PA, holoscan_application_id: HO, responsible: 'x', state: 'convergente', domain_code: 'LI-D01', rule_package_id: v2.id });
srv.tabelas.integrated_reading_rule_packages.find(p => p.id === v2.id).status = 'em_revisao';
tenta('revisao da leitura historica', { patient_id: PA, holoscan_application_id: hid, responsible: 'x', state: 'convergente', domain_code: 'LI-D01', rule_package_id: v2.id, supersedes_id: LID, reason: 'teste' });
ok(srv.linhas('integrated_readings').length === 1 && !srv.linhas('integrated_readings')[0].superseded_at, 'nenhuma leitura nova nasceu; a historica nao foi substituida');

titulo('4. HOLOSCAN INTOCADO');
ok(JSON.stringify(srv.linhas('holoscan_system_scores').filter(s => s.application_id === HO)) === scoresAntes, 'as notas da aplicacao oficial sao as mesmas depois de todas as tentativas');
ok(digital() === antes, 'impressao digital de leituras, pacotes LI, dominios, vinculos, regras, HOLOSCAN historico e coletas: intacta');

console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
