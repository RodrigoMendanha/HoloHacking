/**
 * V1 — ETAPA 2 — O BANCO: anamnese, conduta e acordos (Supabase falso, que
 * espelha a migration 20260930170000; a mesma cadeia foi validada no banco
 * real em BEGIN/ROLLBACK — docs/v1/ETAPA2-ANAMNESE-CONDUTA.md).
 *
 *    1  anamnese de A nao aponta para encounter de B
 *    2  conduta de A nao aponta para encounter de B
 *    3  acordo nao aponta para conduta de outro paciente
 *    4  profissional B nao le anamnese de A
 *    5  profissional B nao le conduta de A
 *    6  paciente inativo nao recebe anamnese nova
 *    7  paciente inativo nao recebe conduta nova
 *    8  revisao preserva a versao anterior (anamnese e conduta)
 *    9  retry nao duplica anamnese
 *   10  retry nao duplica conduta (nem acordo)
 *   11  vazio != negado (estado obrigatorio; so negado_explicitamente nega)
 *   12  copia anterior mantem source_anamnesis_id e marca itens previos
 *   13  copia nao altera o HOLOSCAN
 *   14  conduta nao depende de score (salva sem HOLOSCAN, sem ferramenta)
 *   15  historico do paciente considera anamnese/conduta (contagem)
 *   +   consolidada e imutavel; revisado carimba reviewed_by; referencias
 *       cruzadas recusadas; medida sem unidade recusada; DELETE so de
 *       acordo em rascunho; estados de acordo validos
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
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const select = (uid, t, filtros) => q(uid, t, 'select', { filtros: filtros || [] });
const update = (uid, t, dados, filtros) => q(uid, t, 'update', { dados, filtros });
const del = (uid, t, filtros) => q(uid, t, 'delete', { filtros });
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const eq = (col, val) => [{ op: 'eq', col, val }];
const hoje = new Date().toISOString().slice(0, 10);
const linha = (t, id) => srv.linhas(t).find(x => x.id === id);

const pa = insert(UA, 'patients', { nome: 'A', status: 'ativo' }).data[0].id;
const pb = insert(UA, 'patients', { nome: 'B', status: 'ativo' }).data[0].id;
const ea = rpc(UA, 'criar_atendimento', { payload: { patient_id: pa, occurred_at: '2026-05-01T12:00:00.000Z' } }).data;
const ea2 = rpc(UA, 'criar_atendimento', { payload: { patient_id: pa, occurred_at: '2026-06-01T12:00:00.000Z' } }).data;
const eb = rpc(UA, 'criar_atendimento', { payload: { patient_id: pb, occurred_at: '2026-05-02T12:00:00.000Z' } }).data;
const ITEM = (campo, valor, extra) => Object.assign({ campo, valor, estado: 'informado', origem: 'relato_paciente' }, extra || {});
const CONTEUDO = { dominios: { motivo_objetivo: { itens: [ITEM('Motivo', 'cansaço')] },
  condicoes_diagnosticos_informados: { itens: [ITEM('Hipotireoidismo', 'informado pela paciente')] },
  alergias_informadas: { itens: [] } } };

titulo('1-3. INTEGRIDADE ENTRE PACIENTES');
let r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: eb, content: CONTEUDO });
ok(r.error && r.error.code === '23503', '1: anamnese de A apontando para encounter de B e recusada (FK composta)');
r = insert(UA, 'conducts', { patient_id: pa, encounter_id: eb });
ok(r.error && r.error.code === '23503', '2: conduta de A apontando para encounter de B e recusada');
const cB = insert(UA, 'conducts', { patient_id: pb, encounter_id: eb }).data[0].id;
r = insert(UA, 'agreements', { patient_id: pa, conduct_id: cB, description: 'x' });
ok(r.error && r.error.code === '23503', '3: acordo de A apontando para conduta de B e recusado');

titulo('6-7. PACIENTE INATIVO');
update(UA, 'patients', { status: 'inativo' }, eq('id', pb));
r = rpc(UA, 'salvar_anamnese', { payload: { encounter_id: eb, content: CONTEUDO, status: 'rascunho' } });
ok(r.error && /arquivado/.test(r.error.message), '6: paciente inativo nao recebe anamnese nova');
r = rpc(UA, 'salvar_conduta', { payload: { encounter_id: eb, objective: 'x' } });
ok(r.error && /arquivado/.test(r.error.message), '7: paciente inativo nao recebe conduta nova');
update(UA, 'patients', { status: 'ativo' }, eq('id', pb));

titulo('11. VAZIO != NEGADO; MEDIDA COM UNIDADE');
r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, content: { dominios: { sono: { itens: [{ campo: 'Horas', valor: '' }] } } } });
ok(r.error && r.error.code === '23514', '11: item sem estado/origem e recusado (nada e inferido de campo vazio)');
r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, content: { dominios: { sono: { itens: [{ campo: 'Horas', valor: '', estado: 'nao', origem: 'relato_paciente' }] } } } });
ok(r.error && r.error.code === '23514', '11: estado fora da lista e recusado');
r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, content: { dominios: { medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 70 } })] } } } });
ok(r.error && r.error.code === '23514', 'medida com valor e sem unidade e recusada (nenhuma unidade padrao)');
r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, content: {} });
ok(!r.error && r.data[0].status === 'rascunho', 'anamnese vazia e valida: nada afirmado, nada negado');
del(UA, 'anamneses', eq('id', r.data[0].id));
ok(linha('anamneses', r.data[0].id), 'DELETE em anamneses nao apaga (sem policy)');
const vazia = r.data[0];
r = rpc(UA, 'salvar_anamnese', { payload: { id: vazia.id, content: { dominios: { alergias_informadas: { itens: [ITEM('Amendoim', '', { estado: 'negado_explicitamente' }), ITEM('Frutos do mar', '', { estado: 'desconhecido' })] } } }, status: 'salvo' } });
const salva = linha('anamneses', r.data);
ok(!r.error && salva.status === 'salvo' && salva.content.dominios.alergias_informadas.itens[0].estado === 'negado_explicitamente' && salva.content.dominios.alergias_informadas.itens[1].estado === 'desconhecido',
   '11: negado_explicitamente e desconhecido sao estados distintos, gravados como tal');

titulo('8. REVISAO PRESERVA A ANTERIOR; CONSOLIDADA E IMUTAVEL');
r = update(UA, 'anamneses', { content: { dominios: {} } }, eq('id', salva.id));
ok(r.error && /imutavel/.test(r.error.message), 'UPDATE do conteudo de anamnese salva e recusado');
r = rpc(UA, 'salvar_anamnese', { payload: { id: salva.id, content: CONTEUDO, status: 'salvo', revision_note: 'corrigido o motivo' } });
const rev2 = linha('anamneses', r.data), rev1 = linha('anamneses', salva.id);
ok(!r.error && rev2.id !== salva.id && rev2.revision_number === 2 && rev2.supersedes_id === salva.id && rev2.revision_note === 'corrigido o motivo',
   '8: corrigir cria revisao 2 ligada a 1');
ok(rev1.status === 'salvo' && rev1.superseded_at && JSON.stringify(rev1.content) === JSON.stringify(salva.content) && rev1.created_at === salva.created_at,
   '8: a revisao 1 continua la, intacta, marcada como substituida');
r = rpc(UA, 'salvar_anamnese', { payload: { id: rev2.id, status: 'revisado' } });
const rev2r = linha('anamneses', rev2.id);
ok(!r.error && r.data === rev2.id && rev2r.status === 'revisado' && rev2r.reviewed_by === UA && rev2r.reviewed_at, 'salvo -> revisado na mesma linha, com reviewed_by do servidor');
r = update(UA, 'anamneses', { status: 'rascunho' }, eq('id', rev2.id));
ok(r.error, 'revisado nao volta a rascunho');

titulo('9-10. IDEMPOTENCIA');
const op = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const a1 = rpc(UA, 'salvar_anamnese', { payload: { encounter_id: ea2, content: CONTEUDO, status: 'rascunho', operation_id: op } });
const a2 = rpc(UA, 'salvar_anamnese', { payload: { encounter_id: ea2, content: CONTEUDO, status: 'rascunho', operation_id: op } });
ok(!a1.error && a1.data === a2.data && srv.linhas('anamneses').filter(a => a.encounter_id === ea2).length === 1, '9: retry com a mesma operation_id nao duplica a anamnese');
const opc = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', opg = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const c1 = rpc(UA, 'salvar_conduta', { payload: { encounter_id: ea, objective: 'dormir melhor', status: 'rascunho', operation_id: opc, agreements: [{ description: 'jantar até 20h', status: 'proposto', operation_id: opg }] } });
const c2 = rpc(UA, 'salvar_conduta', { payload: { encounter_id: ea, objective: 'dormir melhor', status: 'rascunho', operation_id: opc, agreements: [{ description: 'jantar até 20h', status: 'proposto', operation_id: opg }] } });
ok(!c1.error && c1.data === c2.data && srv.linhas('conducts').filter(c => c.encounter_id === ea).length === 1 && srv.linhas('agreements').filter(g => g.conduct_id === c1.data).length === 1,
   '10: retry nao duplica conduta nem acordo');

titulo('14. CONDUTA NAO DEPENDE DE SCORE');
ok(srv.linhas('holoscan_applications').filter(h => h.patient_id === pa).length === 0 && srv.linhas('tool_applications').filter(t => t.patient_id === pa).length === 0, 'cenario: paciente A sem HOLOSCAN e sem ferramenta');
const agC1 = srv.linhas('agreements').find(g => g.conduct_id === c1.data);
r = rpc(UA, 'salvar_conduta', { payload: { id: c1.data, status: 'salvo', objective: 'dormir melhor', return_plan: 'em 3 semanas', agreements: [{ id: agC1.id, description: 'jantar até 20h', status: 'acordado' }] } });
const cS = linha('conducts', c1.data);
ok(!r.error && cS.status === 'salvo' && cS.return_plan === 'em 3 semanas' && linha('agreements', agC1.id).status === 'acordado',
   '14: conduta salva sem HOLOSCAN, sem ferramenta, sem nota — com acordo acordado');
r = update(UA, 'conducts', { objective: 'outro' }, eq('id', cS.id));
ok(r.error && /imutavel/.test(r.error.message), 'conduta salva e imutavel');
const ag0 = srv.linhas('agreements').find(g => g.conduct_id === cS.id);
del(UA, 'agreements', eq('id', ag0.id));
ok(linha('agreements', ag0.id), 'acordo de conduta consolidada nao e apagado');
r = update(UA, 'agreements', { status: 'concluido', status_note: 'relatado no retorno' }, eq('id', ag0.id));
ok(!r.error && linha('agreements', ag0.id).status === 'concluido' && linha('agreements', ag0.id).status_changed_at, 'situacao do acordo muda so por UPDATE explicito, com carimbo');
r = update(UA, 'agreements', { status: 'cumprido' }, eq('id', ag0.id));
ok(r.error && r.error.code === '23514', 'estado de acordo fora da lista e recusado (nada de "cumprido"/adesao)');
r = rpc(UA, 'salvar_conduta', { payload: { id: cS.id, status: 'salvo', objective: 'dormir melhor e caminhar', revision_note: 'mantido o jantar; acrescentada caminhada', agreements: [{ origin_agreement_id: ag0.id, description: 'jantar até 20h', status: 'em_acompanhamento' }, { description: 'caminhar 3x', status: 'proposto' }] } });
const cR2 = linha('conducts', r.data);
ok(!r.error && cR2.revision_number === 2 && cR2.supersedes_id === cS.id && linha('conducts', cS.id).superseded_at && linha('conducts', cS.id).objective === 'dormir melhor',
   '8: revisao da conduta preserva a anterior (rev. 1 intacta, rev. 2 ligada)');
const agR2 = srv.linhas('agreements').filter(g => g.conduct_id === cR2.id);
ok(agR2.length === 2 && agR2.some(g => g.origin_agreement_id === ag0.id) && linha('agreements', ag0.id).status === 'concluido',
   'acordos da rev. 2 nascem com origem; os da rev. 1 ficam como estavam');
r = insert(UA, 'conducts', { patient_id: pa, encounter_id: ea2, references: { holoscan_application_ids: ['00000000-0000-4000-8000-000000000000'] } });
ok(r.error, 'referencia a registro inexistente/de outro paciente e recusada');

titulo('12-13. COPIA EXPLICITA DA ANAMNESE ANTERIOR');
const holosAntes = JSON.stringify(srv.linhas('holoscan_applications')) + JSON.stringify(srv.linhas('holoscan_answers'));
r = rpc(UA, 'criar_anamnese_a_partir_de', { p_encounter_id: eb, p_source_id: rev2.id });
ok(r.error && /outro paciente/.test(r.error.message), '12: copiar anamnese de A para atendimento de B e recusado');
rpc(UA, 'salvar_anamnese', { payload: { id: a1.data, status: 'salvo' } });   // fecha o rascunho de ea2
const e3 = rpc(UA, 'criar_atendimento', { payload: { patient_id: pa, occurred_at: '2026-07-01T12:00:00.000Z' } }).data;
r = rpc(UA, 'criar_anamnese_a_partir_de', { p_encounter_id: e3, p_source_id: rev2.id });
const copia = linha('anamneses', r.data);
ok(!r.error && copia.status === 'rascunho' && copia.source_anamnesis_id === rev2.id && copia.copied_from_previous === true, '12: copia mantem source_anamnesis_id e copied_from_previous');
const itens = Object.values(copia.content.dominios).flatMap(d => d.itens);
ok(itens.length === 2 && itens.every(it => it.previo === true && it.fonte_anamnese_id === rev2.id) && itens.every(it => it.origem === 'relato_paciente'),
   '12: cada item vem marcado como previo, com a fonte, e a origem original visivel');
ok(JSON.stringify(srv.linhas('holoscan_applications')) + JSON.stringify(srv.linhas('holoscan_answers')) === holosAntes, '13: a copia nao tocou o HOLOSCAN');
r = rpc(UA, 'criar_anamnese_a_partir_de', { p_encounter_id: e3, p_source_id: rev2.id });
ok(r.error && /rascunho/.test(r.error.message), 'segunda copia no mesmo atendimento e recusada (ja ha rascunho)');

titulo('4-5. OUTRO PROFISSIONAL');
ok(select(UB, 'anamneses').data.length === 0, '4: B nao le anamnese de A');
ok(select(UB, 'conducts').data.length === 0 && select(UB, 'agreements').data.length === 0, '5: B nao le conduta nem acordos de A');
r = update(UB, 'anamneses', { status: 'revisado' }, eq('id', rev2.id));
ok(!r.error && r.data.length === 0, 'nem altera (0 linhas)');
r = insert(UB, 'anamneses', { nutritionist_id: UA, patient_id: pa, encounter_id: ea, content: {} });
ok(r.error && r.error.code === '42501', 'B nao insere em nome de A (RLS)');

titulo('15. HISTORICO DO PACIENTE');
const pc = insert(UA, 'patients', { nome: 'C', status: 'ativo' }).data[0].id;
const ec = rpc(UA, 'criar_atendimento', { payload: { patient_id: pc, occurred_at: '2026-05-03T12:00:00.000Z' } }).data;
rpc(UA, 'salvar_anamnese', { payload: { encounter_id: ec, content: {}, status: 'rascunho' } });
ok(srv.linhas('anamneses').filter(a => a.patient_id === pc).length === 1 && srv.linhas('conducts').filter(c => c.patient_id === pc).length === 0,
   '15: paciente C tem 1 anamnese (rascunho) e nada mais — o app conta isso como historico (teste de tela em testar-v1-etapa2)');

console.log('');
process.exit(falhou ? 1 : 0);
