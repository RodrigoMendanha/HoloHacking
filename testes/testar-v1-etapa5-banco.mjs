/**
 * V1 — ETAPA 5 — O BANCO LABORATORIAL (Supabase falso que espelha a migration 20261001220000;
 * a migration real foi provada em PostgreSQL local: supabase/tests/etapa5-harness.sql)
 *
 *  catalogo 45 exato e somente leitura · custom nao entra nos 45 · duas coletas no mesmo dia · edicao exige
 *  collection_id · operation_id idempotente · patient/professional/encounter crossing bloqueados · PCR-us e
 *  Mg eritrocitario distintos · additional_legacy preservado · valor original preservado · qualitativo nao vira
 *  numero · censurado nao vira numero exato · sem referencia != dentro · ideal legado nao oficial · referencia
 *  metodologica/conversao/derivado vazios e sem escrita · revisao preserva historico · consolidado sem hard-delete
 *  · Leitura Integrada: snapshot imutavel, revisao, barreira (convergente/divergente recusados), nao altera HOLOSCAN · RLS
 */
import './guarda-falhas.mjs';
import { criarServidor } from './supabase-falso.mjs';
import '../laboratorio-motor.js';
import '../leitura-integrada-motor.js';

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
const PA = insert(UA, 'patients', { nome: 'E5 Paciente A', status: 'ativo' }).data[0].id;
const PB = insert(UB, 'patients', { nome: 'E5 Paciente B', status: 'ativo' }).data[0].id;
const EN = rpc(UA, 'criar_atendimento', { payload: { patient_id: PA, occurred_at: '2026-03-10T10:00:00Z' } }).data;
const D = '2026-03-10';
const salvar = (uid, col, results) => rpc(uid, 'salvar_coleta_laboratorial', { payload: { collection: col, results } });
const R = (over) => Object.assign({ exam_code: 'LAB-002', value_original_text: '7,2', numeric_value: 7.2, qualifier: 'eq', unit_original: 'mg/dL' }, over || {});
const resultadosDe = (cid) => srv.linhas('lab_results').filter(r => r.collection_id === cid);

titulo('CATALOGO: 45 EXATOS, SOMENTE LEITURA; CUSTOM FORA DOS 45');
const catalogo = select(UA, 'lab_exam_catalog').data;
ok(catalogo.length === 45 && new Set(catalogo.map(c => c.code)).size === 45 && select(UB, 'lab_exam_catalog').data.length === 45, 'catalogo-base: 45 codigos unicos, legivel por qualquer profissional');
ok(insert(UA, 'lab_exam_catalog', { code: 'LAB-046', position: 46, canonical_name: 'HOMA-IR', category: 'x', catalog_version: 'v' }).error && update(UA, 'lab_exam_catalog', { canonical_name: 'y' }, eq('code', 'LAB-001')).error && catalogo.length === srv.linhas('lab_exam_catalog').length, 'nenhuma escrita no catalogo pela aplicacao');
const cust = insert(UA, 'lab_custom_exams', { name: 'Exame custom E5', notes: 'teste' }).data[0];
ok(cust && cust.nutritionist_id === UA && srv.linhas('lab_exam_catalog').length === 45 && select(UB, 'lab_custom_exams').data.length === 0, 'exame customizado: escopo da nutricionista, nao entra nos 45, invisivel para outra conta');
ok(insert(UA, 'lab_custom_exams', { name: ' exame CUSTOM e5 ' }).error, 'nome repetido (mesma profissional) recusado');

titulo('COLETAS: DUAS NO MESMO DIA, EDICAO POR ID, OPERATION_ID, ENCOUNTER EXPLICITO');
let r = salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo', laboratory_name: 'Lab A', operation_id: 'aaaaaaaa-1111-4111-8111-111111111111' }, [
  R(), R({ exam_code: 'LAB-016', variant: 'ultrassensivel', value_original_text: '< 0,10', numeric_value: null, qualifier: 'lt', censor_limit: 0.1, unit_original: 'mg/L' }),
  R({ exam_code: 'LAB-016', value_original_text: 'Negativo', numeric_value: null, qualifier: 'text', unit_original: null }),
  R({ exam_code: 'LAB-021', variant: 'eritrocitario', material: 'sangue total', value_original_text: '5,1', numeric_value: 5.1 }),
  R({ exam_code: null, custom_exam_id: cust.id, value_original_text: '12', numeric_value: 12, unit_original: 'u' }),
  R({ exam_code: 'LAB-001', value_original_text: 'ver componentes', numeric_value: null, qualifier: 'text', unit_original: null, components: [{ original_name: 'Hemoglobina', value_original_text: '13,2', numeric_value: 13.2, qualifier: 'eq', unit_original: 'g/dL', report_reference_text: '12 a 16' }] })]);
ok(!r.error && r.data.state === 'salvo' && r.data.results === 6, 'coleta 1 salva com 6 resultados' + (r.error ? ': ' + r.error.message : ''));
const C1 = r.data.id;
const r2 = salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo', laboratory_name: 'Lab B' }, [R({ value_original_text: '8', numeric_value: 8 })]);
const C2 = r2.data.id;
ok(!r2.error && C2 !== C1 && srv.linhas('lab_collections').filter(c => c.patient_id === PA && c.coletado_em === D).length === 2 && resultadosDe(C1).length === 6 && resultadosDe(C2).length === 1, 'duas coletas na MESMA data: ids independentes, nenhuma sobrescreve a outra');
const rep = salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo', operation_id: 'aaaaaaaa-1111-4111-8111-111111111111' }, [R()]);
ok(!rep.error && rep.data.id === C1 && rep.data.repetida === true && srv.linhas('lab_collections').filter(c => c.patient_id === PA).length === 2, 'retry da mesma operation_id devolve a mesma coleta, nao duplica');
ok(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo' }, []).error && /ao menos um resultado/.test(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo' }, []).error.message), 'salvar sem resultado: recusado');
ok(/data clinica/.test(salvar(UA, { patient_id: PA, state: 'salvo' }, [R()]).error.message), 'salvar sem data clinica: recusado');
const rasc = salvar(UA, { patient_id: PA, state: 'rascunho' }, []);
ok(!rasc.error && linha('lab_collections', rasc.data.id).state === 'rascunho' && linha('lab_collections', rasc.data.id).coletado_em === null, 'rascunho sem data e sem resultado e aceito (retomavel)');
const ed = salvar(UA, { id: rasc.data.id, patient_id: PA, clinical_date: D, state: 'salvo', encounter_id: EN }, [R({ exam_code: 'LAB-030', value_original_text: '2,1', numeric_value: 2.1, unit_original: 'uUI/mL' })]);
ok(!ed.error && ed.data.id === rasc.data.id && linha('lab_collections', rasc.data.id).state === 'salvo' && linha('lab_collections', rasc.data.id).encounter_id === EN, 'editar o rascunho pelo id: vira salvo, com atendimento EXPLICITO');
ok(linha('lab_collections', C1).encounter_id === null && linha('lab_collections', C2).encounter_id === null, 'coletas da mesma data do atendimento NAO ganham encounter_id por conta propria');
ok(/atendimento/.test(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo', encounter_id: 'ffffffff-1111-4111-8111-111111111111' }, [R()]).error.message), 'atendimento inexistente/alheio: recusado');
ok(/catalogo-base/.test(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo' }, [R({ exam_code: 'LAB-999' })]).error.message), 'exame fora do catalogo: recusado');
ok(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo' }, [R(), R()]).error, 'mesmo exame/variante/material duas vezes na mesma coleta: recusado');

titulo('RESULTADOS: ORIGINAL, NUMERICO, CENSURADO, QUALITATIVO, VARIANTE, MATERIAL, HEMOGRAMA');
const rs = resultadosDe(C1);
const gli = rs.find(x => x.exam_code === 'LAB-002'), pcrus = rs.find(x => x.exam_code === 'LAB-016' && x.variant === 'ultrassensivel'), pcr = rs.find(x => x.exam_code === 'LAB-016' && !x.variant), mg = rs.find(x => x.exam_code === 'LAB-021'), hemo = rs.find(x => x.exam_code === 'LAB-001');
ok(gli.value_original_text === '7,2' && gli.numeric_value === 7.2 && gli.qualifier === 'eq', 'valor original "7,2" preservado ao lado do numerico 7.2');
ok(pcrus && pcr && pcrus.id !== pcr.id && pcrus.variant === 'ultrassensivel' && pcr.variant === null, 'PCR e PCR ultrassensivel coexistem como identidades distintas (variante preservada)');
ok(pcrus.value_original_text === '< 0,10' && pcrus.numeric_value === null && pcrus.qualifier === 'lt' && pcrus.censor_limit === 0.1, 'censurado "< 0,10": numeric_value NULO, qualifier lt, limite 0,10');
ok(pcr.value_original_text === 'Negativo' && pcr.numeric_value === null && pcr.qualifier === 'text', 'qualitativo "Negativo" nao vira numero');
ok(mg.variant === 'eritrocitario' && mg.material === 'sangue total', 'magnesio eritrocitario: variante e material explicitos (nada inventado)');
ok(gli.reference_status === 'missing' && pcr.reference_status === 'missing', 'sem referencia do laudo = missing (ausencia NAO e "dentro")');
const comps = srv.linhas('lab_result_components').filter(k => k.result_id === hemo.id);
ok(comps.length === 1 && comps[0].original_name === 'Hemoglobina' && comps[0].value_original_text === '13,2' && comps[0].report_reference_text === '12 a 16' && srv.linhas('lab_exam_catalog').length === 45, 'hemograma = 1 exame-base com componente estruturado; catalogo continua 45');
ok(insert(UA, 'lab_result_components', { result_id: gli.id, original_name: 'x', value_original_text: '1' }).error, 'componente em exame nao composto: recusado');
ok(insert(UA, 'lab_results', { collection_id: C2, exam_code: 'LAB-003', value_original_text: '< 2', numeric_value: 2, qualifier: 'lt' }).error, 'numeric_value num valor censurado: recusado pelo banco');
ok(insert(UA, 'lab_results', { collection_id: C2, exam_code: 'LAB-003', value_original_text: '2', numeric_value: 2, qualifier: 'eq', reference_status: 'informed' }).error, 'reference_status informed sem referencia: recusado');
const refOk = salvar(UA, { patient_id: PA, clinical_date: '2026-04-01', state: 'salvo' }, [R({ report_reference_text: '70 a 99', report_reference_min: 70, report_reference_max: 99 })]);
const rr = resultadosDe(refOk.data.id)[0];
ok(rr.reference_status === 'informed' && rr.reference_source === 'laudo' && rr.report_reference_min === 70 && rr.report_reference_operator === 'range', 'referencia do laudo gravada como informed/laudo, separada de qualquer referencia metodologica');
const M = globalThis.LabMotor;
ok(M.classificar(rr, { source: 'laudo', min: rr.report_reference_min, max: rr.report_reference_max, unit: rr.unit_original }).classification === 'below' && M.classificar(gli, null).reason_codes[0] === 'missing_reference', 'motor: com referencia do laudo classifica (7,2 contra 70–99 = abaixo); sem referencia, not_classifiable');

titulo('LEGADO: PRESERVADO, IDEAL NAO OFICIAL, MAPEAMENTO DETERMINISTICO');
const leg = insert(UA, 'lab_collections', { patient_id: PA, coletado_em: D, data_coleta_desconhecida: false, source: 'legacy_panel', state: 'salvo' }).data[0];
const legR = insert(UA, 'lab_results', [
  { collection_id: leg.id, exame_id: 'EXA-002', valor: 0.5, unidade_no_momento: 'mg/L', ideal_min_no_momento: 0, ideal_max_no_momento: 1, nome_exame_no_momento: 'PCR ultrassensivel', sistema_no_momento: 'acido_inflamatorio', value_original_text: '0.5', numeric_value: 0.5, qualifier: 'eq', unit_original: 'mg/L', legacy_exame_id: 'EXA-002', legacy_ideal_min: 0, legacy_ideal_max: 1, legacy_sistema: 'acido_inflamatorio', origin: 'legacy_migrated', exam_code: 'LAB-016', variant: 'ultrassensivel' },
  { collection_id: leg.id, exame_id: 'EXA-007', valor: 1.9, unidade_no_momento: 'indice', ideal_min_no_momento: 0, ideal_max_no_momento: 1.8, nome_exame_no_momento: 'HOMA-IR', sistema_no_momento: 'metabolico', value_original_text: '1.9', numeric_value: 1.9, qualifier: 'eq', unit_original: 'indice', legacy_exame_id: 'EXA-007', legacy_ideal_min: 0, legacy_ideal_max: 1.8, legacy_sistema: 'metabolico', origin: 'additional_legacy' }]);
ok(!legR.error && legR.data[0].exam_code === 'LAB-016' && legR.data[0].variant === 'ultrassensivel' && legR.data[1].exam_code == null && legR.data[1].origin === 'additional_legacy', 'legado migrado: PCR-us -> LAB-016 + variante; HOMA-IR fica additional_legacy sem exame-base');
ok(legR.data.every(x => x.reference_status === 'missing' && x.legacy_ideal_max !== null), 'ideal legado so em legacy_*; nenhuma referencia oficial criada a partir dele');
ok(!update(UA, 'lab_results', { valor: 0.6, value_original_text: '0.6', numeric_value: 0.6 }, eq('id', legR.data[0].id)).error, 'coleta do painel legado (source legacy_panel) mantem o comportamento historico de edicao');

titulo('CONSOLIDADO: SEM SOBRESCRITA, SEM HARD-DELETE; REVISAO PRESERVA HISTORICO');
ok(/consolidada/.test(salvar(UA, { id: C1, patient_id: PA, clinical_date: D, state: 'salvo' }, [R()]).error.message), 'editar coleta consolidada em lugar: recusado');
ok(update(UA, 'lab_results', { value_original_text: '9' }, eq('id', gli.id)).error && linha('lab_results', gli.id).value_original_text === '7,2', 'resultado consolidado nao muda por escrita direta');
ok(del(UA, 'lab_collections', eq('id', C1)).error && linha('lab_collections', C1), 'coleta consolidada nao e apagada');
ok(del(UA, 'lab_results', eq('id', gli.id)).error && linha('lab_results', gli.id), 'resultado consolidado nao e apagado');
ok(update(UA, 'lab_collections', { laboratorio: 'outro' }, eq('id', C1)).error && update(UA, 'lab_collections', { state: 'rascunho' }, eq('id', C1)).error, 'coleta consolidada nao muda conteudo nem volta a rascunho');
const rev = rpc(UA, 'revisar_coleta_laboratorial', { payload: { collection_id: C1, reason: 'valor digitado errado', results: [R({ value_original_text: '7,8', numeric_value: 7.8 })] } });
ok(!rev.error && rev.data.revision === 2 && rev.data.supersedes_id === C1, 'revisao cria nova versao (2) apontando para a anterior');
const nova = linha('lab_collections', rev.data.id), antiga = linha('lab_collections', C1);
ok(nova.coletado_em === D && nova.revision_note === 'valor digitado errado' && nova.created_by === UA && antiga.superseded_at && resultadosDe(C1).length === 6 && resultadosDe(C1).find(x => x.exam_code === 'LAB-002').value_original_text === '7,2' && resultadosDe(nova.id)[0].value_original_text === '7,8', 'quem, quando, motivo, versao anterior (intacta, marcada) e versao atual preservados; clinical_date continua a da coleta real');
ok(rpc(UA, 'revisar_coleta_laboratorial', { payload: { collection_id: C1, reason: 'de novo', results: [R()] } }).error, 'versao ja substituida nao recebe outra revisao');
ok(rpc(UA, 'revisar_coleta_laboratorial', { payload: { collection_id: nova.id, reason: '  ', results: [R()] } }).error, 'revisao sem motivo: recusada');
const mr = rpc(UA, 'marcar_coleta_revisada', { p_collection_id: C2, p_responsible: 'Profissional X' });
ok(!mr.error && linha('lab_collections', C2).state === 'revisado' && linha('lab_collections', C2).reviewed_by === UA && rpc(UA, 'marcar_coleta_revisada', { p_collection_id: C2, p_responsible: '' }).error, 'salvo -> revisado com acao humana identificada; sem responsavel, recusado');

titulo('REFERENCIA METODOLOGICA, CONVERSOES, CALCULOS DERIVADOS: VAZIOS E SEM ESCRITA');
ok(select(UA, 'lab_method_references').data.length === 0 && select(UA, 'lab_unit_conversion_rules').data.length === 0 && select(UA, 'lab_derived_calculations').data.length === 0, 'nenhuma referencia metodologica, conversao ou calculo derivado real');
ok(insert(UA, 'lab_method_references', { exam_code: 'LAB-002', lower_bound: 70, upper_bound: 99, unit: 'mg/dL', source: 'x', justification: 'y' }).error && insert(UA, 'lab_unit_conversion_rules', { from_unit: 'a', to_unit: 'b', factor: 2, source: 'x', rule_version: '1' }).error && insert(UA, 'lab_derived_calculations', { code: 'HOMA', formula: 'x', formula_version: '1', inputs: [], required_units: {}, source: 'x' }).error, 'a aplicacao nao escreve nessas tabelas (gestao tecnica, sem botao de aprovacao)');
ok(M.classificar(gli, { source: 'metodologica', status: 'rascunho', min: 70, max: 99, unit: 'mg/dL' }).reason_codes[0] === 'reference_not_approved', 'referencia metodologica em rascunho nao e usada pelo motor');
ok(M.classificar(Object.assign({}, rr, { unit_original: 'mmol/L' }), { source: 'laudo', min: 70, max: 99, unit: 'mg/dL' }, { conversoes: select(UA, 'lab_unit_conversion_rules').data }).reason_codes[0] === 'incompatible_unit', 'sem conversao aprovada no banco, unidade diferente bloqueia');

titulo('RLS E CRUZAMENTOS');
ok(select(UB, 'lab_collections', eq('patient_id', PA)).data.length === 0 && select(UB, 'lab_results', eq('collection_id', C1)).data.length === 0 && select(UB, 'lab_result_components').data.length === 0, 'outra conta nao le coletas, resultados nem componentes alheios');
ok(/profissional/.test(salvar(UB, { patient_id: PA, clinical_date: D, state: 'salvo' }, [R()]).error.message), 'coleta em paciente de outro profissional: recusada');
ok(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo' }, [R({ exam_code: null, custom_exam_id: insert(UB, 'lab_custom_exams', { name: 'custom de B' }).data[0].id })]).error, 'exame customizado de outra conta: recusado');
ok(rpc(UB, 'revisar_coleta_laboratorial', { payload: { collection_id: nova.id, reason: 'x', results: [R()] } }).error && rpc(UB, 'marcar_coleta_revisada', { p_collection_id: nova.id, p_responsible: 'B' }).error, 'outra conta nao revisa nem marca coleta alheia');
const ENB = rpc(UB, 'criar_atendimento', { payload: { patient_id: PB, occurred_at: '2026-03-10T10:00:00Z' } }).data;
ok(/atendimento/.test(salvar(UA, { patient_id: PA, clinical_date: D, state: 'salvo', encounter_id: ENB }, [R()]).error.message), 'atendimento de outro profissional/paciente: recusado (encounter crossing)');
const arq = insert(UA, 'patients', { nome: 'E5 Arquivado', status: 'inativo' }).data[0].id;
ok(salvar(UA, { patient_id: arq, clinical_date: D, state: 'salvo' }, [R()]).error, 'paciente arquivado nao recebe coleta');

titulo('LEITURA INTEGRADA: BARREIRA, SNAPSHOT IMUTAVEL, REVISAO, NAO ALTERA HOLOSCAN');
// Etapa 6.0 (mudanca legitima de contrato, documentada em docs/v1/ETAPA6-LEITURA-INTEGRADA.md): LI-V1@1 segue em rascunho e vazio
// (historico); LI-V1@2 nasce em_revisao com o conteudo decidido (7 dominios, 47 vinculos). Este bloco continua provando a
// barreira sobre o pacote REAL sem regra (v1) e que a aplicacao nao cria dominio/vinculo.
const pk = select(UA, 'integrated_reading_rule_packages').data.find(x => x.code === 'LI-V1' && x.version === 1);
const pk2 = select(UA, 'integrated_reading_rule_packages').data.find(x => x.code === 'LI-V1' && x.version === 2);
const filhasDe = (t, id) => select(UA, t).data.filter(x => x.package_id === id);
ok(pk && pk.status === 'rascunho' && filhasDe('integrated_reading_domains', pk.id).length === 0 && filhasDe('integrated_reading_exam_domain_links', pk.id).length === 0 && filhasDe('integrated_reading_rules', pk.id).length === 0, 'pacote real LI-V1@1 (historico) em rascunho, sem dominio, vinculo ou regra');
ok(pk2 && pk2.status === 'em_revisao' && filhasDe('integrated_reading_domains', pk2.id).length === 7 && filhasDe('integrated_reading_exam_domain_links', pk2.id).length === 47 && srv.linhas('integrated_reading_package_approvals').length === 0, 'LI-V1@2 (Etapa 6) em_revisao com 7 dominios e 47 vinculos; 0 aprovacoes');
ok(insert(UA, 'integrated_reading_domains', { package_id: pk.id, code: 'X', name: 'x' }).error && insert(UA, 'integrated_reading_exam_domain_links', { package_id: pk.id, domain_id: pk.id, exam_code: 'LAB-002' }).error, 'a aplicacao nao cria dominio nem vinculo');
const hid = rpc(UA, 'salvar_holoscan_completo', { payload: { application: { patient_id: PA, quando: D, versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {} }, answers: [], scores: [{ sistema: 'metabolico', nome: 'M', nota: 5, carga: 5, faixa: 'medio', obtido: 1, maximo: 2, respondidos: 1, total_marcadores: 2, avaliavel: true }] } }).data;
const antesH = JSON.stringify([linha('holoscan_applications', hid), srv.linhas('holoscan_system_scores').filter(x => x.application_id === hid)]);
const L = globalThis.LeituraIntegradaMotor;
const calc = L.calcular({ rule_package: Object.assign({}, pk, { domains: [], links: [], rules: [] }), holoscan: { application: { id: hid, clinical_date: D, methodology_package: null }, system_results: {} }, collections: [{ id: C2, clinical_date: D }], results: resultadosDe(C2), classifications: {} });
ok(calc.estado_geral === 'sem_dados_suficientes' && Object.keys(calc.domains).length === 0, 'motor com o pacote real LI-V1@1 (sem dominio): sem dados suficientes');
const base = { patient_id: PA, responsible: 'Prof', rule_package_id: pk.id, engine_version: L.VERSAO, holoscan_application_id: hid, selected_collection_ids: [C2], selected_result_ids: resultadosDe(C2).map(x => x.id), reason_codes: calc.reason_codes, trace: calc.trace };
ok(/sem vinculo/.test(rpc(UA, 'salvar_leitura_integrada', { payload: Object.assign({}, base, { state: 'convergente' }) }).error.message) && rpc(UA, 'salvar_leitura_integrada', { payload: Object.assign({}, base, { state: 'divergente' }) }).error, 'convergente e divergente recusados pelo servidor: pacote sem vinculo aprovado');
const li = rpc(UA, 'salvar_leitura_integrada', { payload: Object.assign({}, base, { state: calc.estado_geral }) });
ok(!li.error && li.data.state === 'sem_dados_suficientes' && /^[0-9a-f]{64}$/.test(li.data.content_hash), 'leitura sem_dados_suficientes salva com hash');
const lr = linha('integrated_readings', li.data.id);
ok(lr.holoscan_application_id === hid && lr.selected_collection_ids[0] === C2 && lr.selected_result_ids.length === 1 && lr.rule_package_id === pk.id && lr.rule_version === 1 && lr.engine_version === L.VERSAO && lr.trace.engine_version && lr.responsible === 'Prof', 'leitura congela: HOLOSCAN, coletas, resultados, pacote/versao, motor, estado, motivos, trace, responsavel');
ok(update(UA, 'integrated_readings', { state: 'convergente' }, eq('id', li.data.id)).error && del(UA, 'integrated_readings', eq('id', li.data.id)).error && insert(UA, 'integrated_readings', { patient_id: PA, responsible: 'x', engine_version: 'x', state: 'convergente', content_hash: 'h' }).error, 'leitura salva e imutavel; escrita so pela RPC');
const C3 = salvar(UA, { patient_id: PA, clinical_date: '2026-05-01', state: 'salvo' }, [R({ value_original_text: '150', numeric_value: 150 })]).data.id;
ok(linha('integrated_readings', li.data.id).selected_collection_ids.length === 1 && !linha('integrated_readings', li.data.id).selected_collection_ids.includes(C3), 'nova coleta futura NAO altera a leitura salva');
const li2 = rpc(UA, 'salvar_leitura_integrada', { payload: Object.assign({}, base, { state: 'sem_dados_suficientes', supersedes_id: li.data.id, professional_note: 'revisao' }) });
ok(!li2.error && li2.data.revision === 2 && linha('integrated_readings', li.data.id).superseded_at && !linha('integrated_readings', li2.data.id).superseded_at, 'correcao da leitura = nova revisao; anterior preservada e marcada');
ok(rpc(UA, 'salvar_leitura_integrada', { payload: Object.assign({}, base, { state: 'sem_dados_suficientes', selected_collection_ids: ['ffffffff-1111-4111-8111-111111111111'] }) }).error && rpc(UB, 'salvar_leitura_integrada', { payload: Object.assign({}, base, { state: 'sem_dados_suficientes' }) }).error, 'leitura nao referencia coleta inexistente nem paciente de outra conta');
ok(JSON.stringify([linha('holoscan_applications', hid), srv.linhas('holoscan_system_scores').filter(x => x.application_id === hid)]) === antesH, 'calcular e salvar Leitura Integrada NAO altera holoscan_applications nem holoscan_system_scores');
ok(select(UB, 'integrated_readings').data.length === 0, 'outra conta nao le leituras alheias');

titulo('RELATORIO: SNAPSHOT COM VALOR ORIGINAL E REFERENCIA DO LAUDO; RASCUNHO FORA');
const rel = rpc(UA, 'emitir_relatorio', { payload: { patient_id: PA, title: 'E5', selected_sources: { lab_collection_ids: [refOk.data.id] } } });
const snap = rel.data && rel.data.conteudo ? rel.data.conteudo : (rel.data && linha('report_emissions', rel.data.id || rel.data) || {}).content_snapshot;
const exSnap = snap && snap.exames && snap.exames[0];
ok(exSnap && exSnap.resultados[0].valor === '7,2' && exSnap.resultados[0].referencia_laudo && exSnap.resultados[0].referencia_laudo.min === 70 && exSnap.resultados[0].nome === 'Glicemia de jejum' && !('classificacao' in exSnap.resultados[0]), 'snapshot do relatorio guarda valor original e referencia do laudo usados, sem classificacao' + (rel.error ? ' [' + rel.error.message + ']' : ''));
const rasc2 = salvar(UA, { patient_id: PA, state: 'rascunho' }, [R()]).data.id;
ok(rpc(UA, 'emitir_relatorio', { payload: { patient_id: PA, title: 'E5', selected_sources: { lab_collection_ids: [rasc2] } } }).error, 'coleta em rascunho nao entra em relatorio');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
