/**
 * V1 — ETAPA 1 — O BANCO: agendamento x atendimento (encounters)
 *
 * Sem navegador: fala direto com o Supabase falso (testes/supabase-falso.mjs),
 * que espelha a migration 20260930160000. A mesma cadeia foi validada no
 * banco real em BEGIN/ROLLBACK (docs/v1/ETAPA1-FUNDACAO-ATENDIMENTOS.md,
 * secao "Supabase rollback"); aqui fica o contrato, suite a suite:
 *
 *    1  encounter do paciente A nao aponta para agendamento do paciente B
 *    2  encounter do profissional A nao e visto nem escrito pelo profissional B
 *    3  encounter existe sem consultation_id
 *    4  agendamento existe sem encounter
 *    5  cancelar nao apaga o agendamento
 *    6  cancelar nao cria encounter
 *    7  reagendar preserva o original (cancelado, com rescheduled_to_id)
 *    8  reagendar cria registro novo ligado ao anterior
 *    9  o mesmo operation_id nao duplica o atendimento
 *   10  paciente inativo nao recebe encounter
 *   11  holoscan do paciente A nao aceita encounter do paciente B
 *   12  tool_application do paciente A nao aceita encounter do paciente B
 *   13  lab_collection do paciente A nao aceita encounter do paciente B
 *   +   DELETE em encounters nao apaga (sem policy); FK de reagendamento
 *       nao cruza paciente; operation_id de outro paciente e recusado
 */
import './guarda-falhas.mjs';
import { criarServidor } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');

const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x');
const UB = srv.criarConta('b@holo.test', 'x');

const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign(
  { tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, tabela, dados) => q(uid, tabela, 'insert', { dados });
const select = (uid, tabela, filtros) => q(uid, tabela, 'select', { filtros: filtros || [] });
const update = (uid, tabela, dados, filtros) => q(uid, tabela, 'update', { dados, filtros });
const del = (uid, tabela, filtros) => q(uid, tabela, 'delete', { filtros });
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const eq = (col, val) => [{ op: 'eq', col, val }];
const hoje = new Date().toISOString().slice(0, 10);

const pa = insert(UA, 'patients', { nome: 'A', status: 'ativo' }).data[0].id;
const pb = insert(UA, 'patients', { nome: 'B', status: 'ativo' }).data[0].id;
const ca = insert(UA, 'consultations', { patient_id: pa, data: hoje, hora: '09:00', tipo: 'retorno', duracao_min: 60 }).data[0].id;
const cb = insert(UA, 'consultations', { patient_id: pb, data: hoje, hora: '10:00', tipo: 'retorno', duracao_min: 60 }).data[0].id;

titulo('1-4. INTEGRIDADE E INDEPENDENCIA');
let r = insert(UA, 'encounters', { patient_id: pa, consultation_id: cb, occurred_at: new Date().toISOString() });
ok(r.error && r.error.code === '23503', '1: encounter de A apontando para agendamento de B e recusado pela FK composta');
r = insert(UA, 'encounters', { patient_id: pa, consultation_id: null, occurred_at: new Date().toISOString(), timezone: 'America/Sao_Paulo' });
ok(!r.error && r.data[0].id && r.data[0].consultation_id === null, '3: encounter sem consultation_id e aceito');
const ea = r.data[0].id;
ok(select(UA, 'encounters', eq('consultation_id', ca)).data.length === 0, '4: agendamento existe sem encounter');

titulo('2. OUTRO PROFISSIONAL');
ok(select(UB, 'encounters').data.length === 0, '2: o profissional B nao ve o encounter de A (RLS)');
r = update(UB, 'encounters', { summary_text: 'invasao' }, eq('id', ea));
ok(!r.error && r.data.length === 0 && srv.linhas('encounters')[0].summary_text !== 'invasao', '2: nem altera (0 linhas)');
r = insert(UB, 'encounters', { nutritionist_id: UA, patient_id: pa, occurred_at: new Date().toISOString() });
ok(r.error && r.error.code === '42501', '2: B nao insere encounter em nome de A (RLS WITH CHECK)');
r = insert(UB, 'encounters', { patient_id: pa, occurred_at: new Date().toISOString() });
ok(r.error && r.error.code === '23503', '2: B nao insere encounter para paciente de A (FK composta com patients)');

titulo('5-6. CANCELAR');
r = update(UA, 'consultations', { cancelled_at: new Date().toISOString(), cancellation_reason: 'paciente pediu' }, eq('id', ca));
ok(!r.error && srv.linhas('consultations').some(c => c.id === ca && c.cancelled_at), '5: cancelar e UPDATE; o agendamento continua no banco');
ok(select(UA, 'encounters', eq('consultation_id', ca)).data.length === 0, '6: cancelar nao cria encounter');

titulo('7-8. REAGENDAR');
const ca2 = insert(UA, 'consultations', { patient_id: pa, data: hoje, hora: '11:00', tipo: 'retorno', duracao_min: 60 }).data[0].id;
r = rpc(UA, 'reagendar_consulta', { p_consultation_id: ca2, p_data: '2030-01-10', p_hora: '14:00', p_motivo: 'imprevisto' });
ok(!r.error && r.data, 'reagendar_consulta devolve o id do novo agendamento');
const novo = r.data;
const orig = srv.linhas('consultations').find(c => c.id === ca2);
const nova = srv.linhas('consultations').find(c => c.id === novo);
ok(orig && orig.cancelled_at && orig.rescheduled_to_id === novo && orig.cancellation_reason === 'imprevisto' && orig.data === hoje,
   '7: o original fica, cancelado, com rescheduled_to_id e a data original');
ok(nova && nova.rescheduled_from_id === ca2 && nova.data === '2030-01-10' && nova.hora === '14:00' && nova.patient_id === pa && !nova.cancelled_at,
   '8: o novo nasce ligado ao anterior, com a data nova, do mesmo paciente');
r = rpc(UA, 'reagendar_consulta', { p_consultation_id: ca2, p_data: '2030-02-01', p_hora: '15:00' });
ok(r.error, 'reagendar o ja reagendado e recusado');
r = insert(UA, 'consultations', { patient_id: pb, data: hoje, hora: '12:00', tipo: 'retorno', duracao_min: 60, rescheduled_from_id: ca2 });
ok(r.error && r.error.code === '23503', 'a proveniencia nao cruza paciente (FK composta)');
ok(srv.linhas('consultations').length === 4, 'nenhum agendamento foi apagado em nenhum passo: ' + srv.linhas('consultations').length);

titulo('9. IDEMPOTENCIA');
const op = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const carga = { patient_id: pa, consultation_id: novo, occurred_at: new Date().toISOString(), timezone: 'America/Sao_Paulo', operation_id: op };
const e1 = rpc(UA, 'criar_atendimento', { payload: carga });
const e2 = rpc(UA, 'criar_atendimento', { payload: carga });
ok(!e1.error && !e2.error && e1.data === e2.data && srv.linhas('encounters').filter(e => e.operation_id === op).length === 1,
   '9: a mesma operation_id devolve o mesmo atendimento; uma linha so');
r = rpc(UA, 'criar_atendimento', { payload: { patient_id: pb, occurred_at: new Date().toISOString(), operation_id: op } });
ok(r.error, 'operation_id ja usada em atendimento de outro paciente e recusada');
r = insert(UA, 'encounters', { patient_id: pa, occurred_at: new Date().toISOString(), operation_id: op });
ok(r.error && r.error.code === '23505', 'o indice unico parcial tambem barra a insercao direta');

titulo('10. PACIENTE INATIVO');
update(UA, 'patients', { status: 'inativo' }, eq('id', pb));
r = rpc(UA, 'criar_atendimento', { payload: { patient_id: pb, occurred_at: new Date().toISOString() } });
ok(r.error && /arquivado/.test(r.error.message), '10: paciente inativo nao recebe atendimento (trigger central)');
update(UA, 'patients', { status: 'ativo' }, eq('id', pb));

titulo('11-13. REGISTROS CLINICOS DE B NAO ACEITAM ENCOUNTER DE A');
r = srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: { application: {
  patient_id: pb, encounter_id: ea, quando: hoje, versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true,
  nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {} }, answers: [], scores: [] } } });
ok(r.error && r.error.code === '23503', '11: holoscan de B com encounter de A e recusado');
r = insert(UA, 'tool_applications', { patient_id: pb, encounter_id: ea, ferramenta_id: 'oq3', versao_ferramenta: '1', status: 'rascunho' });
ok(r.error && r.error.code === '23503', '12: tool_application de B com encounter de A e recusada');
r = insert(UA, 'lab_collections', { patient_id: pb, encounter_id: ea, coletado_em: null, data_coleta_desconhecida: true });
ok(r.error && r.error.code === '23503', '13: lab_collection de B com encounter de A e recusada');
r = srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: { application: {
  patient_id: pa, encounter_id: ea, quando: hoje, versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true,
  nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {} }, answers: [], scores: [] } } });
const ta = insert(UA, 'tool_applications', { patient_id: pa, encounter_id: ea, ferramenta_id: 'oq3', versao_ferramenta: '1', status: 'rascunho' });
const la = insert(UA, 'lab_collections', { patient_id: pa, encounter_id: ea, coletado_em: null, data_coleta_desconhecida: true });
ok(!r.error && srv.linhas('holoscan_applications').find(a => a.id === r.data).encounter_id === ea && !ta.error && !la.error,
   'os mesmos registros, do paciente certo, aceitam o encounter dele (holoscan grava encounter_id)');

titulo('AJUSTE FINAL. encounter_id DO HOLOSCAN E IMUTAVEL');
const eb = insert(UA, 'encounters', { patient_id: pa, occurred_at: new Date().toISOString() }).data[0].id;
r = srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: { application: {
  patient_id: pa, encounter_id: ea, quando: hoje, versao_estrutura: 2, indice: 40, indice_maximo: 100, avaliavel: true,
  nota_media: 4, triada: {}, triada_com_dado: {}, cobertura: {} }, answers: [], scores: [] } } });
const hidA = r.data;
ok(!r.error && srv.linhas('holoscan_applications').find(a => a.id === hidA).encounter_id === ea, 'HOLOSCAN salvo ligado ao atendimento A (paciente com A e B)');
r = update(UA, 'holoscan_applications', { encounter_id: eb }, eq('id', hidA));
ok(r.error && /imutaveis/.test(r.error.message) && srv.linhas('holoscan_applications').find(a => a.id === hidA).encounter_id === ea,
   'trocar encounter_id para o atendimento B do MESMO paciente e recusado; o vinculo continua A');
r = update(UA, 'holoscan_applications', { encounter_id: null }, eq('id', hidA));
ok(r.error && srv.linhas('holoscan_applications').find(a => a.id === hidA).encounter_id === ea, 'nem anular o vinculo depois de consolidado');
r = update(UA, 'holoscan_applications', { interpretacao_texto: 'leitura da profissional', interpretacao_versao: 1 }, eq('id', hidA));
ok(!r.error && srv.linhas('holoscan_applications').find(a => a.id === hidA).interpretacao_texto === 'leitura da profissional',
   'a interpretacao profissional continua editavel');

titulo('EXTRA. NADA APAGA ATENDIMENTO');
r = del(UA, 'encounters', eq('id', ea));
ok(!r.error && srv.linhas('encounters').some(e => e.id === ea), 'DELETE em encounters nao apaga nada (sem policy)');

console.log('');
process.exit(falhou ? 1 : 0);
