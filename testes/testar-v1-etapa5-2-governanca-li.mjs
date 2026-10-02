/**
 * V1 — ETAPA 5.2: GOVERNANCA E DUPLA APROVACAO DA LEITURA INTEGRADA (migration 20261002100000; Supabase falso
 * que espelha a migration; a migration foi provada em PostgreSQL local — supabase/tests/etapa5-2-harness.sql)
 *
 *  - Aprovacao 1 = Daniel (responsavel primario); Aprovacao 2 = Rodrigo (revisao final); ordem obrigatoria
 *  - as duas sobre o MESMO package_id, version e content_hash (hash conferido = hash do servidor)
 *  - mudanca em dominio / vinculo / regra / referencia / conversao / derivado / version invalida (historico mantido);
 *    voltar ao hash antigo NAO ressuscita
 *  - as duas aprovacoes NAO homologam: homologar_pacote_li e a acao final, que exige completude
 *  - tabela de aprovacoes sem escrita direta; nenhuma aprovacao automatica; nada da "Liderança"
 *  - HOLOSCAN (methodology_package_approvals) intocado; LI nunca altera HOLOSCAN
 *  - pacotes/dominios/regras daqui sao TEST_FIXTURE_ONLY: nenhuma regra clinica
 */
import './guarda-falhas.mjs';
import { criarServidor } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x');
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const update = (uid, t, dados, filtros) => q(uid, t, 'update', { dados, filtros });
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const eq = (col, val) => [{ op: 'eq', col, val }];
const G = srv.gestaoTecnica;
const hash = (id) => rpc(UA, 'li_hash_conteudo', { p_package_id: id }).data;
const completude = (id) => rpc(UA, 'li_validar_completude', { p_package_id: id }).data;
const aprovar = (id, version, h, etapa, resp, just) => rpc(UA, 'registrar_aprovacao_li', { p_package_id: id, p_version: version, p_content_hash: h, p_etapa: etapa, p_responsavel: resp, p_justificativa: just === undefined ? 'conferido (teste)' : just });
const homologar = (id, version, h, resp) => rpc(UA, 'homologar_pacote_li', { p_package_id: id, p_version: version, p_content_hash: h, p_responsavel: resp || 'Rodrigo' });
const aprovs = (id) => srv.linhas('integrated_reading_package_approvals').filter(a => a.package_id === id);
const vigentes = (id) => aprovs(id).filter(a => !a.invalidated_at);
const status = (id) => srv.linhas('integrated_reading_rule_packages').find(x => x.id === id).status;
const holoAntes = srv.linhas('methodology_package_approvals').length;

titulo('1. LI-V1 REAL: SEM APROVACAO, EM RASCUNHO, INCOMPLETO');
const liv1 = srv.linhas('integrated_reading_rule_packages').find(p => p.code === 'LI-V1');
ok(liv1 && liv1.status === 'rascunho' && aprovs(liv1.id).length === 0, 'o candidato real LI-V1@1 comeca em rascunho e sem aprovacao alguma');
const c0 = completude(liv1.id);
ok(c0.publicavel === false && ['sem_dominio_aprovado', 'sem_regra_temporal', 'sem_regra_suficiencia', 'sem_regra_resultados_mistos', 'sem_regra_convergencia_divergencia', 'sem_texto_oficial_dos_tres_estados'].every(b => c0.bloqueios.includes(b)), 'validador de completude aponta os bloqueios do LI-V1 (' + c0.total_bloqueios + '): ' + c0.bloqueios.join(', '));
let r = aprovar(liv1.id, 1, hash(liv1.id), 1, 'Daniel');
ok(r.error && /em_revisao/.test(r.error.message) && aprovs(liv1.id).length === 0, 'LI-V1 em rascunho nao recebe aprovacao (so pacote em_revisao)');

titulo('2. FIXTURE INCOMPLETA (em_revisao): ORDEM, PESSOAS, HASH, VERSAO');
const pk = G('integrated_reading_rule_packages', 'insert', { code: 'TEST_FIXTURE_ONLY-A', version: 1, status: 'em_revisao', notes: 'fixture' }).data[0];
const h = hash(pk.id);
ok(/^[0-9a-f]{64}$/.test(h) && hash(pk.id) === h && h !== hash(liv1.id), 'hash canonico do servidor: 64 hex, estavel, distinto por conteudo');
r = aprovar(pk.id, 1, h, 2, 'Rodrigo');
ok(r.error && /Aprovacao 1/.test(r.error.message) && aprovs(pk.id).length === 0, 'Rodrigo primeiro falha (exige Aprovacao 1 vigente de Daniel)');
r = aprovar(pk.id, 1, repeat0(), 1, 'Daniel');
function repeat0() { return '0'.repeat(64); }
ok(r.error && /hash conferido/.test(r.error.message) && aprovs(pk.id).length === 0, 'Daniel com hash errado falha');
r = aprovar(pk.id, 2, h, 1, 'Daniel');
ok(r.error && /versao conferida/.test(r.error.message), 'Daniel com versao errada falha');
r = aprovar(pk.id, 1, h, 1, 'Rodrigo');
ok(r.error && /Daniel/.test(r.error.message), 'Aprovacao 1 por outra pessoa falha');
r = aprovar(pk.id, 1, h, 1, 'Liderança do método HOLOSCAN');
ok(r.error && /Liderança/.test(r.error.message) && aprovs(pk.id).length === 0, '"Liderança do método HOLOSCAN" recusada');
r = aprovar(pk.id, 1, h, 1, 'Daniel', '   ');
ok(r.error && /justificativa/.test(r.error.message), 'justificativa vazia recusada');
r = insert(UA, 'integrated_reading_package_approvals', { package_id: pk.id, package_version: 1, content_hash: h, step: 1, role: 'responsavel_primario', responsible: 'Daniel', justification: 'direto' });
ok(r.error && r.error.code === '42501' && aprovs(pk.id).length === 0, 'escrita direta na tabela de aprovacoes proibida (so a RPC)');
r = update(UA, 'integrated_reading_rule_packages', { status: 'aprovado' }, eq('id', pk.id));
ok(r.error && r.error.code === '42501' && status(pk.id) === 'em_revisao', 'frontend nao altera status do pacote (tabela global so leitura)');
r = aprovar(pk.id, 1, h, 1, 'Daniel');
ok(!r.error && r.data.content_hash === h && r.data.completude.publicavel === false && status(pk.id) === 'em_revisao', 'Daniel valido passa; pacote continua em_revisao; resposta traz os bloqueios');
r = aprovar(pk.id, 1, h, 1, 'Daniel');
ok(r.error && /ja registrada/.test(r.error.message), 'Aprovacao 1 repetida recusada');
r = aprovar(pk.id, 1, h, 2, 'Daniel');
ok(r.error && /Rodrigo/.test(r.error.message), 'Rodrigo errado (outra pessoa na Aprovacao 2) falha');
r = homologar(pk.id, 1, h);
ok(r.error && vigentes(pk.id).length === 1, 'so com a Aprovacao 1 nao homologa');
r = aprovar(pk.id, 1, h, 2, 'Rodrigo');
ok(!r.error && vigentes(pk.id).length === 2 && status(pk.id) === 'em_revisao', 'Rodrigo correto passa depois de Daniel; as duas aprovacoes NAO homologam sozinhas');
r = homologar(pk.id, 1, h);
ok(r.error && /incompleta/.test(r.error.message) && /sem_dominio_aprovado/.test(r.error.message) && status(pk.id) === 'em_revisao', 'pacote incompleto continua sem poder homologar mesmo com as duas aprovacoes');
r = G('integrated_reading_rule_packages', 'update', { status: 'aprovado' }, eq('id', pk.id));
ok(r.error && /homologar_pacote_li/.test(r.error.message) && status(pk.id) === 'em_revisao', 'nem a gestao tecnica poe aprovado por UPDATE: so a RPC final');

titulo('3. INVALIDACAO: DOMINIO, VINCULO, REGRA, VERSION; VOLTAR AO HASH ANTIGO NAO RESSUSCITA');
const d = G('integrated_reading_domains', 'insert', { package_id: pk.id, code: 'TEST_FIXTURE_ONLY_D', name: 'fixture', status: 'rascunho' }).data[0];
ok(hash(pk.id) !== h && vigentes(pk.id).length === 0 && aprovs(pk.id).length === 2 && aprovs(pk.id).every(a => /integrated_reading_domains insert/.test(a.invalidated_reason)), 'mudanca de dominio: hash muda, Aprovacoes 1 e 2 invalidadas com motivo, historico mantido');
G('integrated_reading_domains', 'delete', null, eq('id', d.id));
ok(hash(pk.id) === h && vigentes(pk.id).length === 0 && aprovs(pk.id).length === 2, 'voltar ao hash antigo NAO ressuscita aprovacao invalidada');
aprovar(pk.id, 1, h, 1, 'Daniel'); aprovar(pk.id, 1, h, 2, 'Rodrigo');
ok(vigentes(pk.id).length === 2 && aprovs(pk.id).length === 4, 'novo ciclo (Daniel -> Rodrigo) sobre o mesmo hash: duas novas aprovacoes, as antigas ficam no historico');
G('integrated_reading_rule_packages', 'update', { version: 2 }, eq('id', pk.id));
ok(vigentes(pk.id).length === 0 && aprovs(pk.id).filter(a => /code\/version/.test(a.invalidated_reason)).length === 2, 'mudanca de version invalida');
r = aprovar(pk.id, 1, hash(pk.id), 1, 'Daniel');
ok(r.error && /versao conferida/.test(r.error.message), 'aprovacao sobre a versao antiga e recusada');

titulo('4. FIXTURE COMPLETA: REFERENCIA, CONVERSAO, DERIVADO E REGRA VINCULADOS INVALIDAM; HOMOLOGACAO EXPLICITA');
const rf = G('lab_method_references', 'insert', { exam_code: 'LAB-002', lower_bound: 1, upper_bound: 2, unit: 'u', source: 'TEST_FIXTURE_ONLY', justification: 'fixture', effective_from: '2026-01-01', status: 'aprovado', responsible: 'fixture', approval_provenance: {}, content_hash: 'fixture', version: 1 }).data[0];
const cv = G('lab_unit_conversion_rules', 'insert', { exam_code: 'LAB-002', from_unit: 'u', to_unit: 'w', factor: 2, source: 'TEST_FIXTURE_ONLY', rule_version: '1', status: 'aprovado', responsible: 'fixture', approval_provenance: {} }).data[0];
const dv = G('lab_derived_calculations', 'insert', { code: 'TEST_FIXTURE_ONLY_DERIV', formula: 'a*b', formula_version: '1', inputs: [], required_units: {}, source: 'TEST_FIXTURE_ONLY', status: 'aprovado', responsible: 'fixture', approval_provenance: {} }).data[0];
const pc = G('integrated_reading_rule_packages', 'insert', { code: 'TEST_FIXTURE_ONLY-C', version: 1, status: 'em_revisao' }).data[0];
const d1 = G('integrated_reading_domains', 'insert', { package_id: pc.id, code: 'TEST_FIXTURE_ONLY_D1', name: 'fixture', status: 'aprovado' }).data[0];
G('integrated_reading_exam_domain_links', 'insert', { package_id: pc.id, domain_id: d1.id, exam_code: 'LAB-002', direction: 'any', reference_id: rf.id, status: 'aprovado' });
[['temporal', { max_days: 1 }], ['sufficiency', { min_results: 1 }], ['mixed', { policy: 'insufficient' }], ['convergence', { holoscan_max_nota: 1 }], ['text', { convergente: 'f', divergente: 'f', sem_dados_suficientes: 'f' }]]
  .forEach(([t, p]) => G('integrated_reading_rules', 'insert', { package_id: pc.id, rule_type: t, target: 'global', payload: p, status: 'aprovado' }));
[['reference', rf.id], ['conversion', cv.id], ['derived', dv.id]].forEach(([k, id]) => G('integrated_reading_package_dependencies', 'insert', { package_id: pc.id, kind: k, ref_id: id, status: 'aprovado' }));
ok(completude(pc.id).publicavel === true, 'fixture completa passa no validador (TEST_FIXTURE_ONLY — nenhuma regra clinica real)');
let hc = hash(pc.id);
const ciclo = () => { hc = hash(pc.id); aprovar(pc.id, 1, hc, 1, 'Daniel'); aprovar(pc.id, 1, hc, 2, 'Rodrigo'); return vigentes(pc.id).length === 2; };
ok(ciclo(), 'ciclo Daniel -> Rodrigo sobre a fixture completa');
G('lab_method_references', 'update', { justification: 'fixture 2' }, eq('id', rf.id));
ok(vigentes(pc.id).length === 0 && hash(pc.id) !== hc && aprovs(pc.id).some(a => /lab_method_references update/.test(a.invalidated_reason)), 'mudanca de referencia vinculada invalida e muda o hash');
ok(ciclo(), 're-aprovado'); G('lab_unit_conversion_rules', 'update', { factor: 3 }, eq('id', cv.id));
ok(vigentes(pc.id).length === 0 && hash(pc.id) !== hc, 'mudanca de conversao vinculada invalida e muda o hash');
ok(ciclo(), 're-aprovado'); G('lab_derived_calculations', 'update', { formula_version: '2' }, eq('id', dv.id));
ok(vigentes(pc.id).length === 0 && hash(pc.id) !== hc, 'mudanca de calculo derivado vinculado invalida e muda o hash');
ok(ciclo(), 're-aprovado'); G('integrated_reading_rules', 'update', { payload: { max_days: 2 } }, [{ op: 'eq', col: 'package_id', val: pc.id }, { op: 'eq', col: 'rule_type', val: 'temporal' }]);
ok(vigentes(pc.id).length === 0 && hash(pc.id) !== hc, 'mudanca de regra (temporal) invalida e muda o hash');
ok(ciclo(), 're-aprovado'); G('integrated_reading_exam_domain_links', 'update', { direction: 'above' }, eq('package_id', pc.id));
ok(vigentes(pc.id).length === 0 && hash(pc.id) !== hc, 'mudanca de vinculo invalida e muda o hash');
ok(ciclo(), 're-aprovado');
r = homologar(pc.id, 1, hc, 'Liderança do método HOLOSCAN');
ok(r.error && /Liderança/.test(r.error.message) && status(pc.id) === 'em_revisao', 'homologacao pela "Liderança" recusada');
r = homologar(pc.id, 1, 'a'.repeat(64));
ok(r.error && /hash conferido/.test(r.error.message), 'homologacao com hash divergente recusada');
r = homologar(pc.id, 2, hc);
ok(r.error && /versao conferida/.test(r.error.message), 'homologacao com versao divergente recusada');
r = homologar(pc.id, 1, hc, 'Rodrigo');
const pcf = srv.linhas('integrated_reading_rule_packages').find(x => x.id === pc.id);
const snap = srv.linhas('integrated_reading_package_snapshots').filter(x => x.package_id === pc.id);
ok(!r.error && pcf.status === 'aprovado' && pcf.content_hash === hc && snap.length === 1 && snap[0].content_hash === hc && pcf.approval_provenance.homologado_por === 'Rodrigo' && /Daniel.*Rodrigo/.test(pcf.responsible), 'acao final explicita: aprovado + snapshot imutavel + provenance nomeia Daniel e Rodrigo');
r = G('integrated_reading_rules', 'insert', { package_id: pc.id, rule_type: 'text', target: 'x', payload: {}, status: 'rascunho' });
ok(r.error && /imutavel/.test(r.error.message), 'pacote aprovado e imutavel (filhas)');
r = G('integrated_reading_rule_packages', 'update', { notes: 'x' }, eq('id', pc.id));
ok(r.error && /imutavel/.test(r.error.message) && status(pc.id) === 'aprovado', 'pacote aprovado so pode ser retirado');
r = G('integrated_reading_package_approvals', 'delete', null, eq('package_id', pc.id));
ok(r.error && aprovs(pc.id).length >= 12 && aprovs(pc.id).filter(a => a.invalidated_at).every(a => a.invalidated_reason), 'historico preservado: aprovacoes append-only, toda invalidacao com motivo (' + aprovs(pc.id).length + ' linhas)');

titulo('5. BARREIRAS: LI-V1 INTOCADO; HOLOSCAN INTACTO; NADA AUTOMATICO');
ok(status(liv1.id) === 'rascunho' && aprovs(liv1.id).length === 0 && srv.linhas('integrated_reading_domains').filter(x => x.package_id === liv1.id).length === 0, 'LI-V1@1 continua rascunho, 0 dominios, 0 aprovacoes: nenhum pacote real aprovado automaticamente');
ok(srv.linhas('methodology_package_approvals').length === holoAntes && srv.linhas('methodology_packages').length === 0, 'governanca LI nao cria nem altera aprovacao do HOLOSCAN (dupla aprovacao do HOLOSCAN intacta: testar-v1-dupla-aprovacao.mjs)');
ok(srv.linhas('holoscan_applications').length === 0 && srv.linhas('holoscan_system_scores').length === 0, 'LI (hash, aprovacao, homologacao) nunca toca holoscan_applications/holoscan_system_scores');
ok(srv.linhas('integrated_reading_rule_packages').filter(p => p.status === 'aprovado').every(p => p.code.startsWith('TEST_FIXTURE_ONLY')), 'o unico pacote aprovado neste teste e fixture; nenhum pacote real aprovado');

console.log('');
process.exit(falhou ? 1 : 0);
