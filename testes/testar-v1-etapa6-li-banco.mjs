/**
 * V1 — ETAPA 6.0 — LEITURA INTEGRADA NO SERVIDOR (Supabase falso que espelha a migration 20261002120000;
 * a migration foi provada em PostgreSQL local — supabase/tests/etapa6-harness.sql)
 *
 *  - LI-V1@2 em_revisao com 7 dominios / 47 vinculos; hash do servidor == hash do pacote JS == hash do SQL local
 *  - completude publicavel; governanca intocada (0 aprovacoes; Daniel -> Rodrigo so por RPC com identidade real)
 *  - leitura POR DOMINIO: convergente/divergente so com pacote aprovado e direcoes deterministicas coerentes
 *  - D05/D06/D07 nao recebem leitura cross-source (nao e erro de mapeamento)
 *  - snapshot imutavel: nova coleta e mudanca do pacote candidato nao alteram a leitura salva
 *  - duplicidade: duas coletas mesma data, mesmo exame -> duplicate_result_unresolved; escolha explicita resolve
 *  - exames nunca alteram HOLOSCAN (nota/faixa/Indice/Triada antes == depois)
 */
import './guarda-falhas.mjs';
import { criarServidor } from './supabase-falso.mjs';
import '../laboratorio-motor.js';
import '../leitura-integrada-motor.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x'), UB = srv.criarConta('b@holo.test', 'x');
srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: UA, scope: 'integrated_reading', approval_stage: 1, display_name: 'Daniel' });
srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: UB, scope: 'integrated_reading', approval_stage: 2, display_name: 'Rodrigo' });
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const select = (uid, t) => q(uid, t, 'select');
const update = (uid, t, dados, filtros) => q(uid, t, 'update', { dados, filtros });
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const eq = (col, val) => [{ op: 'eq', col, val }];
const G = srv.gestaoTecnica;
const PK = globalThis.LeituraIntegradaPacoteV1, L = globalThis.LeituraIntegradaMotor, M = globalThis.LabMotor;
const P = 'attention_present', N = 'attention_not_detected', I = 'indeterminate';
const D = '2026-03-10';

titulo('PACOTE LI-V1@2 NO SERVIDOR: CONTEUDO, HASH, COMPLETUDE, GOVERNANCA INTOCADA');
const pks = select(UA, 'integrated_reading_rule_packages').data.filter(p => p.code === 'LI-V1').sort((a, b) => a.version - b.version);
const v1 = pks[0], v2 = pks[1];
ok(pks.length === 2 && v1.status === 'rascunho' && v2.status === 'em_revisao', 'LI-V1@1 rascunho (historico) e LI-V1@2 em_revisao (candidato)');
const doms = select(UA, 'integrated_reading_domains').data.filter(d => d.package_id === v2.id), links = select(UA, 'integrated_reading_exam_domain_links').data.filter(l => l.package_id === v2.id), rules = select(UA, 'integrated_reading_rules').data.filter(r => r.package_id === v2.id);
ok(doms.length === 7 && links.length === 47 && links.filter(l => l.cross_source_role === 'directional').length === 9 && links.filter(l => l.cross_source_role === 'contextual').length === 38 && rules.length === PK.REGRAS.length, '7 dominios, 47 vinculos (9 directional + 38 contextual), ' + PK.REGRAS.length + ' regras');
const porDom = Object.fromEntries(doms.map(d => [d.code, links.filter(l => l.domain_id === d.id).length]));
ok(JSON.stringify(porDom) === JSON.stringify({ 'LI-D01': 7, 'LI-D02': 3, 'LI-D03': 5, 'LI-D04': 4, 'LI-D05': 4, 'LI-D06': 12, 'LI-D07': 12 }) && new Set(links.map(l => l.exam_code)).size === 42, 'por dominio 7/3/5/4/4/12/12; 42 exames vinculados');
const h = rpc(UA, 'li_hash_conteudo', { p_package_id: v2.id }).data;
ok(h === PK.hashConteudo() && /^[0-9a-f]{64}$/.test(h), 'hash do servidor falso == hash do pacote JS (' + h.slice(0, 12) + ') — o mesmo provado no PostgreSQL local');
ok(rpc(UA, 'li_validar_completude', { p_package_id: v2.id }).data.publicavel === true && rpc(UA, 'li_validar_completude', { p_package_id: v1.id }).data.publicavel === false, 'LI-V1@2 completo (publicavel); LI-V1@1 continua incompleto');
ok(srv.linhas('integrated_reading_package_approvals').length === 0 && srv.linhas('integrated_reading_package_snapshots').length === 0, '0 aprovacoes e 0 snapshots: nada homologado pelo codigo');
ok(insert(UA, 'integrated_reading_exam_domain_links', { package_id: v2.id, domain_id: doms[0].id, exam_code: 'LAB-027' }).error && update(UA, 'integrated_reading_domains', { holoscan_system: 'fungico' }, eq('id', doms[4].id)).error && update(UA, 'integrated_reading_rule_packages', { status: 'aprovado' }, eq('id', v2.id)).error, 'a aplicacao nao cria vinculo, nao muda dominio e nao aprova pacote');
ok(G('integrated_reading_domains', 'insert', { package_id: v2.id, code: 'X', name: 'x', holoscan_mapping_mode: 'mapped', holoscan_system: null }).error && G('integrated_reading_exam_domain_links', 'insert', { package_id: v2.id, domain_id: doms[0].id, exam_code: 'LAB-027', cross_source_role: 'directional' }).error, 'constraints novas espelhadas: mapped exige sistema; directional exige direction_rules');

titulo('PACIENTE, HOLOSCAN (fonte congelada) E COLETAS (TEST_FIXTURE_ONLY)');
const PA = insert(UA, 'patients', { nome: 'Paciente E6' }).data[0].id;
const hid = rpc(UA, 'salvar_holoscan_completo', { payload: { application: { patient_id: PA, quando: D, versao_estrutura: 2, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {} }, answers: [], scores: [{ sistema: 'acido_inflamatorio', nome: 'A', nota: 5, carga: 5, faixa: 'medio', obtido: 1, maximo: 2, respondidos: 1, total_marcadores: 2, avaliavel: true }] } }).data;
const antesH = JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === hid), srv.linhas('holoscan_system_scores').filter(x => x.application_id === hid)]);
const R = (code, valor, extra) => Object.assign({ exam_code: code, value_original_text: String(valor), numeric_value: Number(valor), qualifier: 'eq', unit_original: 'mg/L', report_reference_text: '10 a 20', report_reference_min: 10, report_reference_max: 20 }, extra || {});
const coleta = (data, results) => rpc(UA, 'salvar_coleta_laboratorial', { payload: { collection: { patient_id: PA, clinical_date: data, state: 'salvo' }, results } }).data.id;
const C1 = coleta(D, [R('LAB-016', 30), R('LAB-018', 30), R('LAB-010', 30)]);
const resultadosDe = (...cids) => srv.linhas('lab_results').filter(r => cids.includes(r.collection_id));
const pacoteServidor = (pkRow) => ({ id: pkRow.id, code: pkRow.code, version: pkRow.version, status: pkRow.status, domains: select(UA, 'integrated_reading_domains').data.filter(d => d.package_id === pkRow.id), links: select(UA, 'integrated_reading_exam_domain_links').data.filter(l => l.package_id === pkRow.id), rules: select(UA, 'integrated_reading_rules').data.filter(r => r.package_id === pkRow.id) });
const classificar = (rs) => Object.fromEntries(rs.map(r => [r.id, M.classificar(r, r.reference_status === 'informed' ? { source: 'laudo', min: r.report_reference_min, max: r.report_reference_max, operator: r.report_reference_operator || 'range', unit: r.report_reference_unit || r.unit_original } : null, { conversoes: [] })]));
const holo = (faixa) => ({ application: { id: hid, clinical_date: D, methodology_package: { code: 'HOLOS-V1', version: 2, status: 'aprovado' } }, system_results: { acido_inflamatorio: { avaliavel: true, faixa, nota: 1 } } });
const calc = (pk, cids, h2, sel) => { const rs = resultadosDe(...cids); return L.calcular({ rule_package: pk, patient_id: PA, holoscan: h2, collections: cids.map(c => ({ id: c, clinical_date: srv.linhas('lab_collections').find(x => x.id === c).coletado_em })), results: rs, classifications: classificar(rs), selected_result_ids: sel || [] }); };
const salvar = (uid, dom, extra) => rpc(uid, 'salvar_leitura_integrada', { payload: Object.assign({ patient_id: PA, responsible: 'Prof', rule_package_id: v2.id, engine_version: L.VERSAO, domain_code: dom.domain_code, state: dom.state, holoscan_direction: dom.holoscan_direction, laboratory_direction: dom.laboratory_direction, reason_codes: dom.reason_codes, trace: dom.snapshot, snapshot: dom.snapshot, holoscan_application_id: hid, selected_collection_ids: dom.snapshot.selected_collection_ids, selected_result_ids: dom.snapshot.selected_result_ids }, extra || {}) });

titulo('LEITURA POR DOMINIO COM O PACOTE DO SERVIDOR (em_revisao): SO SEM DADOS E GRAVADO');
const r1 = calc(pacoteServidor(v2), [C1], holo('baixa'));
ok(r1.domains['LI-D01'].state === 'convergente' && r1.domains['LI-D01'].laboratory_direction === P && r1.domains['LI-D05'].cross_source_mode === 'not_applicable' && r1.domains['LI-D05'].lab_domain_availability.classifiable === 1, 'motor com as linhas do servidor: D01 convergente (PCR+fibrinogenio acima x HOLOSCAN baixa); D05 informacao laboratorial (creatinina classificavel, sem confronto)');
let r = salvar(UA, r1.domains['LI-D01']);
ok(r.error && /nao aprovado/.test(r.error.message) && srv.linhas('integrated_readings').length === 0, 'convergente recusado: pacote LI-V1@2 ainda em_revisao (nada oficial antes da homologacao)');
r = salvar(UA, Object.assign({}, r1.domains['LI-D05'], { state: 'sem_dados_suficientes' }));
ok(r.error && /nao possui confronto HOLOSCAN/.test(r.error.message), 'D05 nao recebe leitura cross-source (ausencia intencional, nao erro de mapeamento)');
const semDados = calc(pacoteServidor(v2), [C1], holo('intermediaria')).domains['LI-D01'];
r = salvar(UA, semDados, { professional_note: 'observacao separada' });
ok(!r.error && r.data.state === 'sem_dados_suficientes' && r.data.domain_code === 'LI-D01' && /^[0-9a-f]{64}$/.test(r.data.content_hash), 'sem dados suficientes (HOLOSCAN intermediaria -> indeterminate) gravado por dominio com hash');
const lr = srv.linhas('integrated_readings').find(x => x.id === r.data.id);
ok(lr.domain_code === 'LI-D01' && lr.holoscan_direction === I && lr.laboratory_direction === P && lr.snapshot.temporal_rule_code === 'LI-TEMP-01' && lr.snapshot.items.length === 2 && lr.snapshot.items.every(i => i.value_original_text === '30' && i.unit_original === 'mg/L') && lr.professional_note === 'observacao separada' && !('professional_note' in lr.snapshot) && lr.rule_version === 2, 'linha congela dominio, direcoes, snapshot (LI-TEMP-01, itens com valor/unidade originais), nota profissional separada, pacote v2');
ok(update(UA, 'integrated_readings', { snapshot: {} }, eq('id', lr.id)).error && update(UA, 'integrated_readings', { laboratory_direction: N }, eq('id', lr.id)).error, 'snapshot e direcoes imutaveis');

titulo('HOMOLOGACAO LOCAL DO CANDIDATO (fixture de teste: NAO e aprovacao real) -> CONVERGENTE/DIVERGENTE OFICIAIS');
const hv2 = rpc(UA, 'li_hash_conteudo', { p_package_id: v2.id }).data;
ok(!rpc(UA, 'registrar_aprovacao_li', { p_package_id: v2.id, p_version: 2, p_content_hash: hv2, p_etapa: 1, p_responsavel: 'Daniel', p_justificativa: 'teste local' }).error, 'Aprovacao 1 (conta de teste no papel de Daniel) sobre o hash atual');
ok(rpc(UA, 'registrar_aprovacao_li', { p_package_id: v2.id, p_version: 2, p_content_hash: hv2, p_etapa: 2, p_responsavel: 'Rodrigo', p_justificativa: 'teste local' }).error, 'a mesma conta nao faz a Aprovacao 2 (quatro olhos)');
ok(!rpc(UB, 'registrar_aprovacao_li', { p_package_id: v2.id, p_version: 2, p_content_hash: hv2, p_etapa: 2, p_responsavel: 'Rodrigo', p_justificativa: 'teste local' }).error, 'Aprovacao 2 (conta de teste no papel de Rodrigo)');
const hom = rpc(UB, 'homologar_pacote_li', { p_package_id: v2.id, p_version: 2, p_content_hash: hv2, p_responsavel: 'Rodrigo' });
ok(!hom.error && hom.data.status === 'aprovado' && srv.linhas('integrated_reading_package_snapshots').length === 1, 'homologacao explicita com as duas aprovacoes (fixture local): LI-V1@2 aprovado + snapshot');
const v2a = select(UA, 'integrated_reading_rule_packages').data.find(p => p.id === v2.id);
const conv = calc(pacoteServidor(v2a), [C1], holo('baixa')).domains['LI-D01'];
r = salvar(UA, conv);
ok(!r.error && r.data.state === 'convergente' && srv.linhas('integrated_readings').find(x => x.id === r.data.id).holoscan_direction === P, 'convergente gravado (D01: present x present) com pacote aprovado');
const div = calc(pacoteServidor(v2a), [C1], holo('alta')).domains['LI-D01'];
r = salvar(UA, div);
ok(!r.error && r.data.state === 'divergente' && srv.linhas('integrated_readings').find(x => x.id === r.data.id).holoscan_direction === N, 'divergente gravado (D01: not_detected x present)');
ok(/incoerente/.test(salvar(UA, Object.assign({}, conv, { state: 'divergente' })).error.message) && /deterministicas/.test(salvar(UA, Object.assign({}, conv, { state: 'convergente', holoscan_direction: I })).error.message) && /domain_code/.test(salvar(UA, Object.assign({}, conv, { domain_code: null })).error.message), 'servidor recusa estado incoerente com as direcoes, direcao indeterminada em convergente, e convergente sem dominio');
const C1b = coleta(D, [R('LAB-016', 15), R('LAB-018', 30)]);   // mesma data: PCR dentro + fibrinogenio acima -> mistura
const mist = calc(pacoteServidor(v2a), [C1b], holo('baixa')).domains['LI-D01'];
ok(mist.laboratory_direction === I && mist.state === 'sem_dados_suficientes' && mist.reason_codes.includes('mixed_results_indeterminate') && !salvar(UA, mist).error, 'mistura PCR dentro + fibrinogenio acima -> indeterminate -> sem dados (mixed_results_indeterminate), gravavel; nunca divergente');

titulo('DUPLICIDADE: DUAS COLETAS NA MESMA DATA, MESMO EXAME, IDS INDEPENDENTES');
const dup = calc(pacoteServidor(v2a), [C1, C1b], holo('baixa')).domains['LI-D01'];
ok(C1 !== C1b && dup.state === 'sem_dados_suficientes' && dup.reason_codes.includes('duplicate_result_unresolved') && dup.duplicates_unresolved.length === 2, 'PCR e fibrinogenio em duas coletas da mesma data: duplicate_result_unresolved (nenhuma escolha silenciosa por id/created_at)');
const escolhidos = resultadosDe(C1).map(x => x.id);
const esc = calc(pacoteServidor(v2a), [C1, C1b], holo('baixa'), escolhidos).domains['LI-D01'];
ok(esc.state === 'convergente' && esc.snapshot.selected_result_ids.every(id => escolhidos.includes(id)) && esc.items.filter(i => i.exclusion_reason === 'not_selected_duplicate').length === 2, 'escolha explicita dos result_ids da coleta 1 resolve; os da coleta 2 ficam registrados como nao escolhidos');

titulo('SNAPSHOT IMUTAVEL: NOVA COLETA E NOVA VERSAO DO PACOTE NAO MUDAM A LEITURA SALVA');
const salva = srv.linhas('integrated_readings').find(x => x.state === 'convergente');
const antesSnap = JSON.stringify(salva);
coleta('2026-03-20', [R('LAB-016', 1), R('LAB-018', 1)]);
ok(JSON.stringify(srv.linhas('integrated_readings').find(x => x.id === salva.id)) === antesSnap && srv.linhas('lab_collections').filter(c => c.patient_id === PA).length === 3, 'nova coleta (PCR abaixo) nao altera a leitura convergente salva');
const v3 = G('integrated_reading_rule_packages', 'insert', { code: 'LI-V1', version: 3, status: 'rascunho', notes: 'TEST_FIXTURE_ONLY: nova versao candidata' }).data[0];
G('integrated_reading_domains', 'insert', { package_id: v3.id, code: 'LI-D01', name: 'x', holoscan_mapping_mode: 'none', holoscan_system: null, status: 'rascunho' });
ok(JSON.stringify(srv.linhas('integrated_readings').find(x => x.id === salva.id)) === antesSnap && srv.linhas('integrated_readings').find(x => x.id === salva.id).rule_version === 2, 'nova versao do pacote (v3 rascunho) nao recalcula nem reescreve a leitura salva (continua v2)');
ok(G('integrated_reading_rules', 'update', { payload: {} }, eq('package_id', v2.id)).error && /imutavel/.test(G('integrated_reading_rules', 'update', { payload: {} }, eq('package_id', v2.id)).error.message), 'conteudo do pacote aprovado e imutavel (nova versao e o caminho)');

titulo('NAO INTERFERENCIA E ISOLAMENTO');
ok(JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === hid), srv.linhas('holoscan_system_scores').filter(x => x.application_id === hid)]) === antesH, 'calcular e salvar leituras nao alterou holoscan_applications nem holoscan_system_scores (nota/faixa/Indice/Triada identicos)');
ok(select(UB, 'integrated_readings').data.length === 0 && select(UB, 'integrated_reading_rule_packages').data.length === pks.length + 1, 'outra conta nao le leituras alheias; o pacote global e visivel a todos (somente leitura)');
ok(srv.linhas('integrated_reading_package_approvals').length === 2 && srv.linhas('integrated_reading_package_approvals').every(a => a.approver_id), 'as duas aprovacoes do fixture tem identidade real (approver_id) — nenhuma por string de nome');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
