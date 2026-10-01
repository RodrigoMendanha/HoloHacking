/**
 * V1 — ETAPA 3 — O BANCO: proveniencia e relatorios versionados (Supabase
 * falso, que espelha a migration 20260930180000; a mesma cadeia foi validada
 * no banco real em BEGIN/ROLLBACK — docs/v1/ETAPA3-EVOLUCAO-RELATORIOS.md).
 *
 *    1  fonte de outro paciente em relatorio e bloqueada
 *    2  RLS: outro profissional nao le, nao altera, nao emite
 *    3  emissao e imutavel (titulo, snapshot, re-emitir)
 *    4  retificacao preserva a original (hash igual, superseded_at)
 *    5  retry com operation_id nao duplica
 *    6  paciente com relatorio emitido conta como historico (DELETE nao apaga)
 *    7  rascunho nao e emissao (sem snapshot/issued_at); conflito otimista
 *    8  emissao usa so fontes consolidadas (anamnese/conduta/ferramenta rascunho recusadas)
 *    9  source_anamnesis_id nao cruza paciente, nem mesmo atendimento, nem rascunho, nem a si mesma
 *   10  origin_agreement_id nao cruza paciente, nem a mesma conduta, nem a si mesmo
 *   11  snapshot nao muda depois de revisar a fonte (nem ao renomear o paciente)
 *   12  IDs de fonte validados no servidor (inexistente recusado)
 *   +   conteudo intimo fora por padrao; HOLOSCAN sem Indice no snapshot;
 *       tipos de conteudo rotulados; paciente arquivado bloqueado
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
const rpc = (uid, nome, payload) => srv.tratar({ op: 'rpc', uid, nome, args: { payload } });
const eq = (col, val) => [{ op: 'eq', col, val }];
const linha = (t, id) => srv.linhas(t).find(x => x.id === id);
const ITEM = (campo, valor, extra) => Object.assign({ campo, valor, estado: 'informado', origem: 'relato_paciente' }, extra || {});
const CONTEUDO = { dominios: { medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 80, unidade: 'kg' } })] },
  emocional: { itens: [ITEM('Humor', 'SEGREDO_INTIMO')] } } };

const pa = insert(UA, 'patients', { nome: 'A', status: 'ativo' }).data[0].id;
const pb = insert(UA, 'patients', { nome: 'B', status: 'ativo' }).data[0].id;
const ea = rpc(UA, 'criar_atendimento', { patient_id: pa, occurred_at: '2026-05-01T12:00:00.000Z' }).data;
const ea2 = rpc(UA, 'criar_atendimento', { patient_id: pa, occurred_at: '2026-06-01T12:00:00.000Z' }).data;
const eb = rpc(UA, 'criar_atendimento', { patient_id: pb, occurred_at: '2026-05-02T12:00:00.000Z' }).data;
const an1 = rpc(UA, 'salvar_anamnese', { encounter_id: ea, content: CONTEUDO, status: 'salvo' }).data;
const anb = rpc(UA, 'salvar_anamnese', { encounter_id: eb, content: CONTEUDO, status: 'salvo' }).data;
const anRasc = rpc(UA, 'salvar_anamnese', { encounter_id: ea2, content: CONTEUDO, status: 'rascunho' }).data;
const cd1 = rpc(UA, 'salvar_conduta', { encounter_id: ea, objective: 'Dormir melhor', status: 'salvo', agreements: [{ description: 'Jantar cedo', status: 'acordado' }] }).data;
const g1 = srv.linhas('agreements').find(g => g.conduct_id === cd1).id;
const cdRasc = rpc(UA, 'salvar_conduta', { encounter_id: ea2, objective: 'retorno', status: 'rascunho' }).data;
const hid = srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: { application: { patient_id: pa, encounter_id: ea, quando: '2026-05-01', versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: { respondidos: 10, total: 60 } }, answers: [], scores: [] } } }).data;
const tool1 = insert(UA, 'tool_applications', { patient_id: pa, encounter_id: ea, ferramenta_id: 'oq3', versao_ferramenta: 1, status: 'concluida', respostas: { quer: 'RESPOSTA_INTIMA' }, concluida_em: '2026-05-01T13:00:00.000Z', leitura: 'leitura profissional' }).data[0].id;
const toolRasc = insert(UA, 'tool_applications', { patient_id: pa, encounter_id: ea2, ferramenta_id: 'pqq', versao_ferramenta: 1, status: 'rascunho', respostas: {} }).data[0].id;
ok(an1 && anb && cd1 && g1 && hid && tool1, 'cenario: A com 2 atendimentos, anamnese salva + rascunho, conduta + acordo, HOLOSCAN, ferramenta; B com anamnese');

titulo('9-10. PROVENIENCIA (fechamento da Etapa 2)');
let r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, revision_number: 7, status: 'salvo', content: {}, source_anamnesis_id: anb });
ok(r.error && r.error.code === '23503', '9: source_anamnesis_id de outro paciente recusado (FK composta)');
r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, revision_number: 7, status: 'salvo', content: {}, source_anamnesis_id: an1 });
ok(r.error && /outro atendimento/.test(r.error.message), '9: fonte do MESMO atendimento recusada (trigger)');
r = insert(UA, 'anamneses', { patient_id: pa, encounter_id: ea, revision_number: 7, status: 'salvo', content: {}, source_anamnesis_id: anRasc });
ok(r.error && /salva ou revisada/.test(r.error.message), '9: fonte em rascunho recusada');
r = update(UA, 'anamneses', { source_anamnesis_id: anRasc }, eq('id', anRasc));
ok(r.error && /si mesma/.test(r.error.message), '9: anamnese fonte de si mesma recusada');
const cdB = rpc(UA, 'salvar_conduta', { encounter_id: eb, objective: 'B', status: 'rascunho' }).data;
r = insert(UA, 'agreements', { patient_id: pb, conduct_id: cdB, description: 'x', origin_agreement_id: g1 });
ok(r.error && r.error.code === '23503', '10: origin_agreement_id de outro paciente recusado (FK composta)');
r = insert(UA, 'agreements', { patient_id: pa, conduct_id: cd1, description: 'y', origin_agreement_id: g1 });
ok(r.error && /outra conduta/.test(r.error.message), '10: origem na MESMA conduta recusada (trigger)');
r = insert(UA, 'agreements', { patient_id: pa, conduct_id: cdRasc, description: 'Jantar cedo', origin_agreement_id: g1 });
ok(!r.error, '10: origem em outra conduta do mesmo paciente aceita (linhagem legitima)');
const g2 = r.data[0].id;
r = update(UA, 'agreements', { origin_agreement_id: g2 }, eq('id', g2));
ok(r.error && /si mesmo/.test(r.error.message), '10: acordo origem de si mesmo recusado');

titulo('1, 8, 12. FONTES: SO DESTE PACIENTE, SO CONSOLIDADAS, SO EXISTENTES');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { encounter_ids: [eb] } });
ok(r.error && /nao e deste paciente/.test(r.error.message), '1: atendimento de B em relatorio de A recusado');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { anamnesis_ids: [anb] } });
ok(r.error && /nao e deste paciente/.test(r.error.message), '1: anamnese de B recusada');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { anamnesis_ids: [anRasc] } });
ok(r.error && /rascunho/.test(r.error.message), '8: anamnese em rascunho nao entra em relatorio');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { conduct_ids: [cdRasc] } });
ok(r.error && /rascunho/.test(r.error.message), '8: conduta em rascunho nao entra');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { tool_application_ids: [toolRasc] } });
ok(r.error && /rascunho/.test(r.error.message), '8: ferramenta em rascunho nao entra');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { holoscan_application_ids: ['00000000-0000-4000-8000-000000000000'] } });
ok(r.error && /nao e deste paciente/.test(r.error.message), '12: id inexistente recusado no servidor');
ok(srv.linhas('report_emissions').length === 0, 'nenhuma emissao foi criada pelas tentativas recusadas');

titulo('7. RASCUNHO NAO E EMISSAO; CONFLITO OTIMISTA');
const rasc = rpc(UA, 'salvar_rascunho_relatorio', { patient_id: pa, title: 'Rascunho', selected_sources: { encounter_ids: [ea] } }).data;
let row = linha('report_emissions', rasc);
ok(row && row.status === 'rascunho' && !row.issued_at && !row.content_snapshot && !row.content_hash, '7: rascunho sem issued_at, snapshot ou hash');
r = rpc(UA, 'salvar_rascunho_relatorio', { id: rasc, title: 'Outro', expected_updated_at: '2000-01-01T00:00:00.000Z' });
ok(r.error && /alterado em outro lugar/.test(r.error.message) && linha('report_emissions', rasc).title === 'Rascunho', '7: expected_updated_at antigo => conflito, nada sobrescrito');
r = update(UA, 'report_emissions', { status: 'emitido' }, eq('id', rasc));
ok(r.error && r.error.code === '23514', '7: rascunho nao vira "emitido" sem snapshot (check)');
r = rpc(UA, 'salvar_rascunho_relatorio', { id: rasc, title: 'Rascunho 2', expected_updated_at: row.updated_at, selected_sources: { encounter_ids: [ea] } });
ok(!r.error && linha('report_emissions', rasc).title === 'Rascunho 2', '7: com expected_updated_at atual o rascunho e atualizado');

titulo('EMISSAO: SNAPSHOT NO SERVIDOR, SEM CONTEUDO INTIMO, SEM METODOLOGIA OFICIAL');
const OP = '11111111-1111-4111-8111-111111111111';
const em1 = rpc(UA, 'emitir_relatorio', { id: rasc, operation_id: OP, title: 'Relatorio E3', professional_text: 'texto da profissional',
  selected_sources: { encounter_ids: [ea], anamnesis_ids: [an1], holoscan_application_ids: [hid], tool_application_ids: [tool1], conduct_ids: [cd1] } }).data;
row = linha('report_emissions', em1);
ok(em1 === rasc && row.status === 'emitido' && row.issued_at && row.content_snapshot && /^[0-9a-f]{64}$/.test(row.content_hash), 'rascunho emitido na mesma linha, com snapshot e hash sha256');
const snapTxt = JSON.stringify(row.content_snapshot);
ok(!/SEGREDO_INTIMO|RESPOSTA_INTIMA/.test(snapTxt), '17: conteudo intimo (campos emocionais, respostas da ferramenta) NAO entra por padrao');
ok(row.content_snapshot.holoscan[0].resultados_oficiais === false && !('indice' in row.content_snapshot.holoscan[0]) && row.content_snapshot.holoscan[0].cobertura.total === 60, '18: HOLOSCAN no snapshot: id, data, versao, cobertura; sem Indice, nota ou faixa');
ok(row.content_snapshot.anamneses[0].itens[0].tipo_conteudo === 'DADO_MEDIDO' && row.content_snapshot.condutas[0].tipo_conteudo === 'OBSERVACAO_PROFISSIONAL' && row.content_snapshot.ferramentas[0].tipo_conteudo === 'RELATO_DO_PACIENTE' && row.content_snapshot.interpretacao_profissional.texto === 'texto da profissional', '19: tipos de conteudo rotulados');
ok(row.source_snapshot.anamneses[0].id === an1 && row.source_snapshot.anamneses[0].revision_number === 1 && row.source_snapshot.conducts[0].id === cd1, 'source_snapshot guarda ids e revisoes das fontes');
ok(row.content_snapshot.condutas[0].acordos.length === 1 && row.content_snapshot.condutas[0].acordos[0].status === 'acordado', 'acordos da conduta entram com o estado registrado');
const emIntimo = rpc(UA, 'emitir_relatorio', { patient_id: pa, selected_sources: { anamnesis_ids: [an1], tool_application_ids: [tool1], incluir_intimo: true } }).data;
ok(/SEGREDO_INTIMO/.test(JSON.stringify(linha('report_emissions', emIntimo).content_snapshot)) && /RESPOSTA_INTIMA/.test(JSON.stringify(linha('report_emissions', emIntimo).content_snapshot)), '17: com incluir_intimo explicito o conteudo intimo entra');

titulo('5. IDEMPOTENCIA');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, operation_id: OP, selected_sources: {} });
ok(r.data === em1 && srv.linhas('report_emissions').filter(x => x.patient_id === pa).length === 2, '5: retry com o mesmo operation_id devolve a mesma emissao, sem duplicar');
srv.falhar.push({ tabela: 'rpc:emitir_relatorio', acao: 'rpc' });
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, operation_id: '22222222-2222-4222-8222-222222222222', selected_sources: {} });
ok(r.error && srv.linhas('report_emissions').filter(x => x.patient_id === pa).length === 2, '5: falha do servidor nao cria emissao');
srv.falhar.length = 0;

titulo('3. IMUTABILIDADE');
r = update(UA, 'report_emissions', { title: 'alterado' }, eq('id', em1));
ok(r.error && /imutavel/.test(r.error.message) && linha('report_emissions', em1).title === 'Relatorio E3', '3: titulo de emissao nao muda');
r = update(UA, 'report_emissions', { content_snapshot: {} }, eq('id', em1));
ok(r.error && /imutavel/.test(r.error.message), '3: snapshot nao muda');
r = rpc(UA, 'emitir_relatorio', { id: em1, title: 'de novo' });
ok(r.error && /ja emitido/.test(r.error.message), '3: re-emitir a mesma linha e recusado');
r = rpc(UA, 'salvar_rascunho_relatorio', { id: em1, title: 'de novo' });
ok(r.error && /imutavel/.test(r.error.message), '3: emissao nao volta a rascunho');

titulo('11. SNAPSHOT CONGELADO DEPOIS DE REVISAR A FONTE');
const h1 = linha('report_emissions', em1).content_hash;
const an2 = rpc(UA, 'salvar_anamnese', { id: an1, status: 'salvo', content: { dominios: { medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 78, unidade: 'kg' } })] } } }, revision_note: 'correcao' }).data;
row = linha('report_emissions', em1);
ok(an2 !== an1 && linha('anamneses', an2).revision_number === 2 && row.content_snapshot.anamneses[0].itens[0].medida.valor === 80 && row.content_hash === h1, '11: anamnese rev. 2 criada; a emissao continua com 80 kg e o mesmo hash');
update(UA, 'patients', { nome: 'A RENOMEADA' }, eq('id', pa));
rpc(UA, 'salvar_conduta', { id: cd1, status: 'salvo', objective: 'Outro objetivo' });
row = linha('report_emissions', em1);
ok(row.content_snapshot.paciente.nome === 'A' && row.content_snapshot.condutas[0].objective === 'Dormir melhor', '11: renomear paciente e revisar conduta nao alteram o snapshot');

titulo('4. RETIFICACAO');
const em2 = rpc(UA, 'emitir_relatorio', { patient_id: pa, supersedes_report_id: em1, title: 'Relatorio E3 (retificado)', selected_sources: { anamnesis_ids: [an2] } }).data;
const orig = linha('report_emissions', em1), ret = linha('report_emissions', em2);
ok(ret && ret.revision_number === 2 && ret.supersedes_report_id === em1 && ret.status === 'emitido', '4: retificacao e a emissao nº 2 ligada a original');
ok(orig.status === 'emitido' && orig.content_hash === h1 && orig.superseded_at && orig.content_snapshot.anamneses[0].itens[0].medida.valor === 80, '4: original preservada (hash e conteudo), marcada superseded_at');
r = rpc(UA, 'emitir_relatorio', { patient_id: pb, supersedes_report_id: em1, selected_sources: {} });
ok(r.error && /outro paciente/.test(r.error.message), '4: retificar emissao de outro paciente recusado');
r = rpc(UA, 'emitir_relatorio', { patient_id: pa, supersedes_report_id: rpc(UA, 'salvar_rascunho_relatorio', { patient_id: pa, title: 'r' }).data, selected_sources: {} });
ok(r.error && /so uma emissao/.test(r.error.message), '4: so uma emissao pode ser retificada');

titulo('6. HISTORICO E DELETE');
const antes = srv.linhas('report_emissions').length;
r = del(UA, 'report_emissions', eq('id', em1));
ok(!r.error && srv.linhas('report_emissions').length === antes, '6: DELETE de emissao nao apaga nada (sem policy)');
r = del(UA, 'patients', eq('id', pa));
ok(r.error && r.error.code === '23503', '6: paciente com relatorio nao e apagado (FK restrict)');
r = select(UA, 'report_emissions', eq('patient_id', pa));
ok(r.data.filter(x => x.status === 'emitido').length === 3, '6: contagem server-side de emissoes do paciente: 3');

titulo('2. RLS ENTRE PROFISSIONAIS');
ok(select(UB, 'report_emissions', []).data.length === 0, '2: B nao le emissoes de A');
r = update(UB, 'report_emissions', { superseded_at: '2026-01-01T00:00:00.000Z' }, eq('id', em2));
ok((!r.error && r.data.length === 0) && !linha('report_emissions', em2).superseded_at, '2: B nao altera (0 linhas)');
r = rpc(UB, 'emitir_relatorio', { patient_id: pa, selected_sources: {} });
ok(r.error && /nao encontrado/.test(r.error.message), '2: B nao emite para paciente de A');
r = rpc(UB, 'emitir_relatorio', { patient_id: pa, supersedes_report_id: em2, selected_sources: {} });
ok(r.error, '2: B nao retifica emissao de A');

titulo('PACIENTE ARQUIVADO');
update(UA, 'patients', { status: 'inativo' }, eq('id', pb));
r = rpc(UA, 'salvar_rascunho_relatorio', { patient_id: pb, title: 'x' });
ok(r.error && /arquivado/.test(r.error.message), 'paciente arquivado nao recebe rascunho de relatorio');
r = rpc(UA, 'emitir_relatorio', { patient_id: pb, selected_sources: {} });
ok(r.error && /arquivado/.test(r.error.message), 'paciente arquivado nao recebe emissao');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
