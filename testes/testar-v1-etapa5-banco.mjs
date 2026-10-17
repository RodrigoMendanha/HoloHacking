/**
 * V1 — ETAPA 5 (reescrita 09/10) — O BANCO LABORATORIAL VIROU HISTORICO
 * (Supabase falso que espelha a migration 20261011100000; a migration real foi provada em PostgreSQL
 * local: supabase/tests/prontuario-harness.sql)
 *
 * Decisao de produto 09/10: exame e SO arquivo do prontuario. O que este teste trava, no servidor:
 *   1  coleta/resultado HISTORICOS (anteriores a 09/10) continuam no banco, legiveis so pelo dono
 *   2  as 4 RPCs de laboratorio recusam com hint laboratorio_desativado — nenhuma linha nasce ou muda
 *   3  insert/update/delete direto em lab_collections, lab_results, lab_result_components e lab_custom_exams: 42501
 *   4  o catalogo laboratorial global continua somente leitura
 *   5  Leitura Integrada: salvar_leitura_integrada recusa (li_desativada); a leitura HISTORICA fica, so para o dono
 *   6  HOLOSCAN oficial identico antes e depois de todas as tentativas; impressao digital do historico intacta
 *   7  documento do prontuario: nasce ativo; DELETE recusado (42501); arquivo/paciente imutaveis (documento_imutavel);
 *      arquivar/restaurar so por arquivado_em (quem/quando vem do servidor); objeto registrado nao sai do Storage
 */
import './guarda-falhas.mjs';
import { createHash } from 'node:crypto';
import { criarServidor } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

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
const eq = (col, val) => [{ op: 'eq', col, val }];
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const agora = () => new Date().toISOString();
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const PA = insert(UA, 'patients', { nome: 'Paciente Banco Ficticia' }).data[0].id;
const PB = insert(UB, 'patients', { nome: 'Paciente Outra Conta Ficticia' }).data[0].id;
const hoje = agora().slice(0, 10);

/* ----- historico: como o banco real ja o tem (anterior a 09/10) ----- */
const CID = globalThis.crypto.randomUUID(), RID = globalThis.crypto.randomUUID(), LID = globalThis.crypto.randomUUID();
srv.tabelas.lab_collections.push({ id: CID, nutritionist_id: UA, patient_id: PA, encounter_id: null, coletado_em: '2026-05-05', data_coleta_desconhecida: false, laboratorio: 'Lab', observacao: null,
  state: 'salvo', source: 'manual', revision: 1, created_by: UA, created_at: agora(), updated_at: agora() });
srv.tabelas.lab_results.push({ id: RID, collection_id: CID, exam_code: 'LAB-002', value_original_text: '95', numeric_value: 95, qualifier: 'eq', unit_original: 'mg/dL', report_reference_text: '70 a 99', created_at: agora() });
srv.tabelas.lab_result_components.push({ id: globalThis.crypto.randomUUID(), result_id: RID, position: 1, original_name: 'x', value_original_text: '1', created_at: agora() });
srv.tabelas.integrated_readings.push({ id: LID, nutritionist_id: UA, patient_id: PA, responsible: 'Nutri Teste', state: 'convergente', domain_code: 'LI-D03', professional_note: 'historica', revision: 1, reason_codes: [], created_at: agora() });
const EA = insert(UA, 'encounters', { patient_id: PA, occurred_at: agora(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).data[0].id;
const HID = rpc(UA, 'salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: hoje }) }).data;
const HIST = ['lab_collections', 'lab_results', 'lab_result_components', 'lab_custom_exams', 'integrated_readings', 'holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'methodology_packages', 'lab_exam_catalog', 'integrated_reading_rule_packages'];
const digital = () => createHash('sha256').update(JSON.stringify(HIST.map(t => srv.linhas(t)))).digest('hex');
const antes = digital();
const scoresAntes = JSON.stringify(srv.linhas('holoscan_system_scores').filter(s => s.application_id === HID));

titulo('1. HISTORICO LEGIVEL, SO PELO DONO');
ok(HID && select(UA, 'lab_collections').data.length === 1 && select(UA, 'lab_results').data.length === 1 && select(UA, 'integrated_readings').data.length === 1, 'o dono le a coleta, o resultado e a leitura integrada historicos');
ok(select(UB, 'lab_collections').data.length === 0 && select(UB, 'lab_results').data.length === 0 && select(UB, 'integrated_readings').data.length === 0, 'outra conta nao le nada disso (RLS por dono)');

titulo('2. AS 4 RPCs DE LABORATORIO RECUSAM');
const R = (code, valor) => ({ exam_code: code, value_original_text: String(valor), numeric_value: Number(valor), qualifier: 'eq', unit_original: 'mg/dL' });
const r1 = rpc(UA, 'salvar_coleta_laboratorial', { payload: { collection: { patient_id: PA, clinical_date: hoje, state: 'salvo' }, results: [R('LAB-002', 90)] } });
const r2 = rpc(UA, 'salvar_coleta_exames', { payload: { collection: { patient_id: PA, coletado_em: hoje, data_coleta_desconhecida: false }, results: [{ exame_id: 'EXA-001', valor: 90, unidade_no_momento: 'mg/dL', nome_exame_no_momento: 'Glicose' }] } });
const r3 = rpc(UA, 'revisar_coleta_laboratorial', { payload: { collection_id: CID, reason: 'teste', collection: { clinical_date: '2026-05-05' }, results: [R('LAB-002', 91)] } });
const r4 = rpc(UA, 'marcar_coleta_revisada', { payload: { collection_id: CID } });
[['salvar_coleta_laboratorial', r1], ['salvar_coleta_exames', r2], ['revisar_coleta_laboratorial', r3], ['marcar_coleta_revisada', r4]].forEach(([n, r]) =>
  ok(r.error && r.error.hint === 'laboratorio_desativado' && r.data === null, n + ': recusada com hint laboratorio_desativado — ' + (r.error ? r.error.message : 'GRAVOU')));
ok(srv.linhas('lab_collections').length === 1 && srv.linhas('lab_results').length === 1, 'nenhuma coleta ou resultado nasceu ou mudou');

titulo('3. ESCRITA DIRETA NAS TABELAS: SEM PERMISSAO');
const tentativas = [
  ['lab_collections insert', insert(UA, 'lab_collections', { patient_id: PA, coletado_em: hoje, data_coleta_desconhecida: false })],
  ['lab_collections update', update(UA, 'lab_collections', { observacao: 'x' }, eq('id', CID))],
  ['lab_collections delete', del(UA, 'lab_collections', eq('id', CID))],
  ['lab_results insert', insert(UA, 'lab_results', { collection_id: CID, exam_code: 'LAB-003', value_original_text: '1' })],
  ['lab_results update', update(UA, 'lab_results', { numeric_value: 1 }, eq('id', RID))],
  ['lab_results delete', del(UA, 'lab_results', eq('id', RID))],
  ['lab_result_components insert', insert(UA, 'lab_result_components', { result_id: RID, position: 2, original_name: 'y' })],
  ['lab_result_components delete', del(UA, 'lab_result_components', eq('result_id', RID))],
  ['lab_custom_exams insert', insert(UA, 'lab_custom_exams', { name: 'Exame proprio' })],
];
tentativas.forEach(([n, r]) => ok(r.error && r.error.code === '42501', n + ': 42501 — ' + (r.error ? r.error.message : 'GRAVOU')));

titulo('4. CATALOGO GLOBAL CONTINUA SOMENTE LEITURA');
ok(select(UA, 'lab_exam_catalog').data.length === 45 && select(UB, 'lab_exam_catalog').data.length === 45, 'o catalogo de 45 exames continua legivel por qualquer conta');
ok(insert(UA, 'lab_exam_catalog', { code: 'LAB-999', canonical_name: 'x' }).error && update(UA, 'lab_exam_catalog', { status: 'x' }, eq('code', 'LAB-002')).error, 'e ninguem escreve nele');

titulo('5. LEITURA INTEGRADA: RETIRADA DO FLUXO, HISTORICO FICA');
const li = rpc(UA, 'salvar_leitura_integrada', { payload: { patient_id: PA, holoscan_application_id: HID, responsible: 'x', state: 'sem_dados_suficientes', selected_collection_ids: [CID] } });
ok(li.error && li.error.hint === 'li_desativada' && li.data === null, 'salvar_leitura_integrada: recusada com hint li_desativada — ' + (li.error ? li.error.message : 'GRAVOU'));
ok(insert(UA, 'integrated_readings', { patient_id: PA, responsible: 'x', state: 'sem_dados_suficientes' }).error.code === '42501' && update(UA, 'integrated_readings', { professional_note: 'x' }, eq('id', LID)).error.code === '42501' && del(UA, 'integrated_readings', eq('id', LID)).error.code === '42501',
  'integrated_readings: insert/update/delete direto sem permissao (42501)');
ok(srv.linhas('integrated_readings').length === 1 && srv.linhas('integrated_readings')[0].professional_note === 'historica', 'a leitura historica continua exatamente como estava');

titulo('6. HOLOSCAN INTOCADO; IMPRESSAO DIGITAL DO HISTORICO');
ok(JSON.stringify(srv.linhas('holoscan_system_scores').filter(s => s.application_id === HID)) === scoresAntes, 'as 5 notas da aplicacao oficial sao as mesmas');
ok(digital() === antes, 'nenhuma linha historica (coletas, resultados, componentes, leituras, HOLOSCAN, pacotes, catalogo) mudou');

titulo('7. DOCUMENTO DO PRONTUARIO: ARQUIVA, NAO APAGA');
const path = UA + '/' + PA + '/1_laudo.pdf';
srv.tratar({ op: 'storage', uid: UA, bucket: 'patient-documents', acaoStorage: 'upload', path, b64: Buffer.from('%PDF-1.4 teste').toString('base64'), tipo: 'application/pdf' });
const doc = insert(UA, 'documents', { patient_id: PA, nome: 'laudo.pdf', titulo: 'Laudo de maio', tipo: 'Exame', data_documento: '2026-05-05', observacao: 'obs', mime_type: 'application/pdf', tamanho_bytes: 14, storage_path: path, arquivado_em: '2020-01-01T00:00:00Z', arquivado_por: UB }).data[0];
ok(doc && doc.arquivado_em === null && doc.arquivado_por === null && doc.titulo === 'Laudo de maio', 'documento nasce ATIVO, mesmo que o cliente mande arquivado_em/por');
ok(del(UA, 'documents', eq('id', doc.id)).error.code === '42501' && srv.linhas('documents').length === 1, 'DELETE em documents: sem permissao (42501); a linha fica');
const imut = [
  update(UA, 'documents', { storage_path: UA + '/' + PA + '/outro.pdf' }, eq('id', doc.id)),
  update(UA, 'documents', { patient_id: PB }, eq('id', doc.id)),
  update(UA, 'documents', { mime_type: 'image/png' }, eq('id', doc.id)),
];
ok(imut.every(r => r.error && r.error.hint === 'documento_imutavel'), 'arquivo, paciente e tipo MIME do documento nao mudam (documento_imutavel)');
const edit = update(UA, 'documents', { titulo: 'Laudo de maio (corrigido)', observacao: 'obs 2', data_documento: '2026-05-06', tipo: 'Laudo' }, eq('id', doc.id));
ok(!edit.error && edit.data[0].titulo === 'Laudo de maio (corrigido)' && edit.data[0].tipo === 'Laudo', 'titulo, tipo, data e observacao podem ser corrigidos');
const arq = update(UA, 'documents', { arquivado_em: '1999-01-01T00:00:00Z', arquivado_por: UB }, eq('id', doc.id)).data[0];
ok(arq.arquivado_em && arq.arquivado_em !== '1999-01-01T00:00:00Z' && arq.arquivado_por === UA, 'arquivar: quem e quando vem do servidor (nao do cliente)');
const rest = update(UA, 'documents', { arquivado_em: null }, eq('id', doc.id)).data[0];
ok(rest.arquivado_em === null && rest.arquivado_por === null, 'restaurar: arquivado_em e arquivado_por voltam a nulo');
srv.tratar({ op: 'storage', uid: UA, bucket: 'patient-documents', acaoStorage: 'remove', paths: [path] });
ok(!!srv.storage['patient-documents'][path], 'o objeto de um documento registrado nao sai do Storage (policy de delete)');
ok(select(UB, 'documents').data.length === 0 && update(UB, 'documents', { titulo: 'x' }, eq('id', doc.id)).data.length === 0, 'outra conta nao le nem edita o documento');

console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
