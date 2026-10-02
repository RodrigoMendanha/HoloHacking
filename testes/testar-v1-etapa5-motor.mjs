/**
 * V1 — ETAPA 5 — CATALOGO (45), MOTOR LABORATORIAL e MOTOR DA LEITURA INTEGRADA (puros, sem navegador)
 *
 *  Catalogo: exatamente 45, codigos/nomes unicos, categorias, aliases (TGO↔AST, GGT, PTH, 25-OH), busca sem
 *  fuzzy (ambiguidade = escolha humana), nenhum HOMA-IR/VHS/cortisol/Candida; catalogo JS == seed da migration.
 *  Motor lab (TEST_FIXTURE_ONLY): below / within / above / missing reference / incompatible unit / incompatible
 *  variant / incompatible material / qualitative without rule / censored / conversao FICTICIA aprovada / comparacao
 *  compativel e incompativel; valor original nunca destruido; nenhum score.
 *  Leitura Integrada (TEST_FIXTURE_ONLY, contrato 2.0.0 da Etapa 6): A convergente, B divergente, C sem vinculo, D mistos ->
 *  indeterminate, D2 sem regra de mistos, E fora da janela, F unidade incompativel; pacote REAL LI-V1@1 => sem dados; snapshot.
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import '../laboratorio-catalogo.js';
import '../laboratorio-motor.js';
import '../leitura-integrada-motor.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url).pathname;
const C = globalThis.LabCatalogo, M = globalThis.LabMotor, L = globalThis.LeituraIntegradaMotor;

titulo('CATALOGO-BASE: 45, UNICOS, CATEGORIAS, ALIASES, SEM PAINEL');
ok(C.EXAMES.length === 45 && C.validar().length === 0, 'exatamente 45 exames-base, validador sem erros');
ok(new Set(C.EXAMES.map(e => e.code)).size === 45 && new Set(C.EXAMES.map(e => C.normalizar(e.canonical_name))).size === 45 && C.EXAMES.every((e, i) => e.code === 'LAB-' + String(i + 1).padStart(3, '0')), 'codigos LAB-001..045 e nomes canonicos unicos');
ok(C.CATEGORIAS.length === 18 && C.EXAMES.filter(e => e.category === 'Hormonal').length === 8 && C.porCodigo('LAB-001').category === 'Hematologia' && C.porCodigo('LAB-045').canonical_name === 'Cálcio ionizado sérico', '18 categorias; Hormonal com 8; LAB-001 Hemograma (Hematologia); LAB-045 Cálcio ionizado sérico');
ok(C.porNomeExato('AST').code === 'LAB-012' && C.porNomeExato('TGO').code === 'LAB-012' && C.porNomeExato('GGT').code === 'LAB-015' && C.porNomeExato('PTH').code === 'LAB-034' && C.porNomeExato('Vitamina D 25-OH').code === 'LAB-035', 'aliases: TGO↔AST, GGT, PTH, Vitamina D 25-OH localizam o exame');
ok(C.buscar('ldl').map(e => e.code).join(',') === 'LAB-007,LAB-008' && C.porNomeExato('LDL') === null, 'busca "ldl" devolve 2 candidatos (LDL colesterol, LDL oxidada) e a identidade exata e nula: a escolha e humana (sem fuzzy)');
ok(C.buscar('', 'Tireoide').length === 3 && C.buscar('xyz').length === 0, 'filtro por categoria (Tireoide = 3) e busca sem resultado = vazio');
ok(!C.EXAMES.some(e => /homa|vhs|cortisol|candida/i.test(e.canonical_name + e.aliases.join())) && C.LEGADO_FORA_DOS_45.length === 4, 'HOMA-IR, VHS, cortisol e Candida nao estao nos 45 (legado fora: 4)');
ok(C.porCodigo('LAB-001').composite === true && C.EXAMES.filter(e => e.composite).length === 1, 'so o Hemograma e composto');
const sql = readFileSync(RAIZ + 'supabase/migrations/20261001220000_etapa5_laboratorio.sql', 'utf8');
const seed = [...sql.matchAll(/\('(LAB-\d{3})', (\d+), '([^']+)', '([^']+)', '(\[[^\]]*\])', (true|false), 'catalogo-lab-v1\.0'\)/g)].map(m => ({ code: m[1], position: Number(m[2]), canonical_name: m[3], category: m[4], aliases: JSON.parse(m[5]), composite: m[6] === 'true' }));
ok(seed.length === 45 && JSON.stringify(seed) === JSON.stringify(C.linhasSeed()), 'o seed da migration e identico ao catalogo JS (45 linhas, nomes, categorias, aliases, composto)');
ok(/catalogo-base deve ter exatamente 45 exames/.test(sql) && /proteger_catalogo_laboratorial/.test(sql), 'a migration valida 45 e protege o catalogo contra escrita');
ok(Object.keys(C.MAPA_LEGADO).length === 20 && C.MAPA_LEGADO['EXA-002'].variant === 'ultrassensivel' && C.MAPA_LEGADO['EXA-022'].variant === 'eritrocitario' && C.MAPA_LEGADO['EXA-006'].requires_manual_mapping === true && !C.MAPA_LEGADO['EXA-007'], 'mapeamento legado: 20 inequivocos (PCR-us e Mg eritrocitario com variante), insulina marcada para mapeamento manual, HOMA-IR fora');

titulo('VALOR ORIGINAL: NUMERICO, CENSURADO, QUALITATIVO (nunca destruido)');
const v = (t) => M.interpretarValor(t);
ok(v('7,2').kind === 'numeric' && v('7,2').numeric_value === 7.2 && v('7,2').value_original_text === '7,2', '"7,2" -> numerico 7.2, original preservado');
ok(v('1.234,5').numeric_value === 1234.5 && v('12').numeric_value === 12 && v('-0.5').numeric_value === -0.5, 'formatos numericos pt-BR e ponto');
ok(v('< 0,10').kind === 'censored' && v('< 0,10').numeric_value === null && v('< 0,10').qualifier === 'lt' && v('< 0,10').censor_limit === 0.1, '"< 0,10" -> censurado lt 0,10, numeric_value NULO (nao vira 0.10, 0.099 nem 0)');
ok(v('> 2000').qualifier === 'gt' && v('>= 5').qualifier === 'gte' && v('≤ 3').qualifier === 'lte' && v('abaixo de 0,10').qualifier === 'lt' && v('abaixo de 0,10').censor_limit === 0.1, 'operadores >, >=, ≤ e "abaixo de" reconhecidos');
ok(v('acima do limite de quantificação').kind === 'censored' && v('acima do limite de quantificação').censor_limit === null, '"acima do limite de quantificacao" e censurado sem limite numerico');
ok(['Negativo', 'Reagente', 'Não detectado'].every(t => v(t).kind === 'qualitative' && v(t).numeric_value === null && v(t).qualifier === 'text' && v(t).value_original_text === t), 'qualitativos preservados textualmente; Negativo nao vira 0, Positivo nao vira 1');
ok(v('').kind === 'empty' && v(null).kind === 'empty', 'vazio e vazio');

titulo('CLASSIFICACAO (TEST_FIXTURE_ONLY) — below / within / above / not_classifiable');
const ref = { source: 'laudo', min: 70, max: 99, operator: 'range', unit: 'mg/dL' };
const cl = (r, rf, op) => M.classificar(Object.assign({ exam_code: 'LAB-002', unit_original: 'mg/dL' }, r), rf === undefined ? ref : rf, op);
ok(cl({ value_original_text: '65' }).classification === 'below' && cl({ value_original_text: '80' }).classification === 'within' && cl({ value_original_text: '115' }).classification === 'above', 'below / within / above contra a referencia do laudo');
ok(cl({ value_original_text: '70' }).classification === 'within' && cl({ value_original_text: '99' }).classification === 'within', 'limites inclusivos');
ok(cl({ value_original_text: '80' }, null).classification === 'not_classifiable' && cl({ value_original_text: '80' }, null).reason_codes[0] === 'missing_reference', 'sem referencia -> not_classifiable / missing_reference (ausencia nao e "dentro")');
ok(cl({ value_original_text: '80', unit_original: 'mmol/L' }).reason_codes[0] === 'incompatible_unit', 'unidade diferente sem conversao aprovada -> incompatible_unit');
ok(cl({ value_original_text: '80', variant: 'ultrassensivel' }, Object.assign({ variant: null }, ref)).reason_codes[0] === 'incompatible_variant', 'referencia sem variante x resultado PCR-us -> incompatible_variant');
ok(cl({ value_original_text: '5', material: 'sangue total' }, Object.assign({ material: 'soro' }, ref)).reason_codes[0] === 'incompatible_material', 'material diferente -> incompatible_material');
ok(cl({ value_original_text: 'Negativo' }).reason_codes[0] === 'qualitative_without_rule', 'qualitativo sem regra -> qualitative_without_rule');
ok(cl({ value_original_text: '< 0,10' }).classification === 'below' && cl({ value_original_text: '< 0,10' }).trace.value.numeric_value === null && cl({ value_original_text: '< 80' }).reason_codes[0] === 'censored_value_ambiguous', 'censurado (Etapa 6, DECISAO 15): "< 0,10" contra [70,99] prova below (numeric_value continua nulo); "< 80" nao prova um unico estado -> censored_value_ambiguous (antes: sempre censored_value)');
ok(cl({ value_original_text: '80' }, { source: 'metodologica', status: 'rascunho', min: 70, max: 99, unit: 'mg/dL' }).reason_codes[0] === 'reference_not_approved', 'referencia metodologica em rascunho nao e usada');
ok(cl({ value_original_text: '2' }, { source: 'laudo', operator: 'lt', max: 5, unit: 'mg/dL' }).classification === 'within' && cl({ value_original_text: '6' }, { source: 'laudo', operator: 'lt', max: 5, unit: 'mg/dL' }).classification === 'above', 'referencia "< 5": 2 within, 6 above');
const fakeConv = [{ id: 'fx', status: 'aprovado', exam_code: 'LAB-002', from_unit: 'mmol/L', to_unit: 'mg/dL', factor: 18, rule_version: 'TEST_FIXTURE_ONLY' }];
const conv = cl({ value_original_text: '5' , unit_original: 'mmol/L' }, ref, { conversoes: fakeConv });
ok(conv.classification === 'within' && conv.trace.steps[0].step === 'conversion' && conv.trace.steps[0].original_value === 5 && conv.trace.steps[0].converted_value === 90 && conv.trace.steps[0].rule_version === 'TEST_FIXTURE_ONLY', 'conversao FICTICIA aprovada: 5 mmol/L -> 90 mg/dL, com original, convertido e versao da regra no trace');
ok(cl({ value_original_text: '5', unit_original: 'mmol/L' }, ref, { conversoes: [Object.assign({}, fakeConv[0], { status: 'rascunho' })] }).reason_codes[0] === 'incompatible_unit', 'conversao em rascunho nao converte');
const tr = cl({ value_original_text: '115' });
ok(tr.trace.engine_version === M.VERSAO && tr.trace.value.value_original_text === '115' && tr.trace.reference.source === 'laudo' && tr.reference_source === 'laudo', 'trace: motor, valor original, referencia e fonte');
ok(!('score' in tr) && !('nota' in tr) && !Object.keys(M).some(k => /score|nota|indice/i.test(k)), 'nenhum score, nota ou indice laboratorial no motor');
ok(/abaixo|dentro|acima|não classificável/.test(Object.values(M.ROTULO).join()) && !/normal|alterado|melhor|pior/.test(Object.values(M.ROTULO).join() + Object.values(M.MOTIVO).join()), 'rotulos neutros (nunca normal/alterado/melhorou/piorou)');

titulo('COMPARACAO ENTRE RESULTADOS');
const a = { id: 'r1', exam_code: 'LAB-002', value_original_text: '90', unit_original: 'mg/dL', clinical_date: '2026-01-10', report_reference_text: '70 a 99' };
const b = { id: 'r2', exam_code: 'LAB-002', value_original_text: '99', unit_original: 'mg/dL', clinical_date: '2026-03-10', report_reference_text: '65 a 99' };
const c1 = M.comparar(a, b);
ok(c1.comparavel && c1.delta === 9 && c1.unidade === 'mg/dL' && c1.direcao === 'aumentou' && c1.anterior.date === '2026-01-10' && c1.atual.date === '2026-03-10', 'compativel: anterior, atual, delta +9 mg/dL, "aumentou", datas clinicas');
ok(c1.referencias_diferentes === true && c1.anterior.reference === '70 a 99' && c1.atual.reference === '65 a 99', 'referencias do laudo diferentes ficam visiveis (nao ocultas), delta do valor existe');
ok(M.comparar(b, a).direcao === 'reduziu' && M.comparar(a, a).direcao === 'permaneceu', '"reduziu" e "permaneceu"');
ok(!M.comparar(a, Object.assign({}, b, { unit_original: 'mmol/L' })).comparavel && M.comparar(a, Object.assign({}, b, { unit_original: 'mmol/L' })).motivos[0] === 'incompatible_unit', 'unidades diferentes sem conversao: lado a lado, sem delta');
ok(M.comparar(a, Object.assign({}, b, { variant: 'ultrassensivel' })).motivos[0] === 'incompatible_variant' && M.comparar(a, Object.assign({}, b, { exam_code: 'LAB-016' })).motivos[0] === 'different_exam' && M.comparar(a, Object.assign({}, b, { material: 'eritrocitario' })).motivos[0] === 'incompatible_material', 'variante, exame ou material diferentes: sem delta');
ok(M.comparar(a, Object.assign({}, b, { value_original_text: '< 5' })).motivos[0] === 'non_numeric_value' && M.comparar(a, null).motivos[0] === 'missing_result', 'censurado ou faltando: sem delta');
ok(!/melhor|pior|normaliz|agrav|respondeu/i.test(JSON.stringify([c1, M.comparar(b, a)])), 'nenhum "melhorou/piorou/normalizou/agravou/respondeu ao tratamento"');
ok(M.comparar(Object.assign({}, a, { unit_original: 'mmol/L', value_original_text: '5' }), b, { conversoes: fakeConv }).comparavel && M.comparar(Object.assign({}, a, { unit_original: 'mmol/L', value_original_text: '5' }), b, { conversoes: fakeConv }).delta === 9, 'conversao FICTICIA aprovada permite comparar (90 -> 99)');

titulo('LEITURA INTEGRADA — PACOTE REAL LI-V1@1 (sem regras) e FIXTURES (TEST_FIXTURE_ONLY) — contrato do motor 2.0.0 (Etapa 6)');
/* Etapa 6.0: mudanca legitima de contrato (docs/v1/ETAPA6-LEITURA-INTEGRADA.md). O motor 1.0.0 usava fixtures de
   infraestrutura (min_results, max_days, policy majority, holoscan_max_nota) que as DECISOES 16-21 proibiram. As mesmas
   situacoes A-G sao provadas aqui com o contrato decidido (unanimidade, LI-TEMP-01, faixa -> attention_*). As fixtures
   continuam TEST_FIXTURE_ONLY e nunca chegam a migration nem a UI. */
const REAL = { id: 'li-real', code: 'LI-V1', version: 1, status: 'rascunho', domains: [], links: [], rules: [] };
const HP = { code: 'HOLOS-V1', version: 2, status: 'aprovado' };
const holo = (faixa) => ({ application: { id: 'h1', clinical_date: '2026-03-01', methodology_package: HP }, system_results: { metabolico: faixa === null ? { avaliavel: false } : { avaliavel: true, nota: 2.5, faixa: faixa || 'baixa' } } });
const cols = [{ id: 'c1', clinical_date: '2026-03-05' }];
const res = [{ id: 'r1', collection_id: 'c1', exam_code: 'LAB-002', unit_original: 'mg/dL', value_original_text: '115' }, { id: 'r2', collection_id: 'c1', exam_code: 'LAB-005', unit_original: 'mg/dL', value_original_text: '200' }];
const cls = { r1: { classification: 'above', reason_codes: [] }, r2: { classification: 'above', reason_codes: [] } };
const real = L.calcular({ rule_package: REAL, holoscan: holo(), collections: cols, results: res, classifications: cls });
ok(real.estado_geral === 'sem_dados_suficientes' && Object.keys(real.domains).length === 0 && real.cross_source_enabled.length === 0, 'pacote REAL LI-V1@1 (sem dominio): sem dados suficientes mesmo com HOLOSCAN baixo e exames acima: "um exame fora" nao confirma nada');
ok(!L.pacoteTemRegraReal(REAL) && L.calcular({ rule_package: null }).estado_geral === 'sem_dados_suficientes', 'pacote sem vinculo nao tem regra real; sem pacote = sem dados suficientes');
const ACIMA = { above: 'attention_present', within: 'attention_not_detected', below: 'indeterminate' };
const FX = (over) => Object.assign({ id: 'TEST_FIXTURE_ONLY', code: 'TEST_FIXTURE_ONLY', version: 1, status: 'aprovado',
  domains: [{ id: 'd1', code: 'FX-DOM', name: 'fixture', holoscan_mapping_mode: 'mapped', holoscan_system: 'metabolico', status: 'aprovado' }],
  links: [{ id: 'l1', domain_id: 'd1', exam_code: 'LAB-002', direction: 'above', cross_source_role: 'directional', direction_rules: ACIMA, status: 'aprovado' }, { id: 'l2', domain_id: 'd1', exam_code: 'LAB-005', direction: 'above', cross_source_role: 'directional', direction_rules: ACIMA, status: 'aprovado' }],
  rules: [{ rule_type: 'sufficiency', target: 'FX-DOM', payload: { mode: 'rule_based', version: 1, min_classifiable_results: 2, required_exam_codes: ['LAB-002', 'LAB-005'], required_exam_groups: [], optional_directional_exam_codes: [] }, status: 'aprovado' },
    { rule_type: 'temporal', target: 'global', payload: { code: 'FX-TEMP', version: 1, max_days: 30, inclusive: true }, status: 'aprovado' },
    { rule_type: 'mixed', target: 'FX-DOM', payload: { mode: 'unanimity', version: 1, mixture_reason: 'mixed_results_indeterminate' }, status: 'aprovado' },
    { rule_type: 'holoscan_direction', target: 'global', payload: { version: 1, package_code: 'HOLOS-V1', min_package_version: 2, required_package_status: 'aprovado', faixa_map: { baixa: 'attention_present', intermediaria: 'indeterminate', alta: 'attention_not_detected' }, not_evaluable: 'indeterminate' }, status: 'aprovado' },
    { rule_type: 'convergence', target: 'global', payload: { version: 1, convergente: [['attention_present', 'attention_present'], ['attention_not_detected', 'attention_not_detected']], divergente: [['attention_present', 'attention_not_detected'], ['attention_not_detected', 'attention_present']] }, status: 'aprovado' },
    { rule_type: 'text', target: 'global', payload: { convergente: 'texto ficticio A', divergente: 'texto ficticio B', sem_dados_suficientes: 'texto ficticio C' }, status: 'aprovado' }] }, over || {});
const A = L.calcular({ rule_package: FX(), holoscan: holo(), collections: cols, results: res, classifications: cls });
ok(A.estado_geral === 'convergente' && A.domains['FX-DOM'].state === 'convergente' && A.domains['FX-DOM'].text.profissional === 'texto ficticio A' && A.domains['FX-DOM'].items.filter(i => i.included).length === 2, 'Fixture A: regras ficticias suficientes + HOLOSCAN baixa + exames acima -> convergente');
const B = L.calcular({ rule_package: FX(), holoscan: holo('alta'), collections: cols, results: res, classifications: cls });
ok(B.estado_geral === 'divergente' && B.domains['FX-DOM'].text.profissional === 'texto ficticio B', 'Fixture B: HOLOSCAN alta + exames acima -> divergente');
const Cc = L.calcular({ rule_package: FX({ links: [] }), holoscan: holo(), collections: cols, results: res, classifications: cls });
ok(Cc.estado_geral === 'sem_dados_suficientes' && Cc.domains['FX-DOM'].reason_codes.includes('missing_required_exam'), 'Fixture C: dominio sem vinculo -> sem dados suficientes (missing_required_exam / cobertura)');
const D = L.calcular({ rule_package: FX(), holoscan: holo(), collections: cols, results: res, classifications: { r1: { classification: 'above', reason_codes: [] }, r2: { classification: 'within', reason_codes: [] } } });
ok(D.estado_geral === 'sem_dados_suficientes' && D.domains['FX-DOM'].laboratory_direction === 'indeterminate' && D.domains['FX-DOM'].reason_codes.includes('mixed_results_indeterminate') && !D.domains['FX-DOM'].reason_codes.includes('mixed_without_rule'), 'Fixture D: um acima e um dentro -> direcao indeterminada -> sem dados suficientes (mixed_results_indeterminate; nunca divergente)');
const D2 = L.calcular({ rule_package: FX({ rules: FX().rules.filter(r => r.rule_type !== 'mixed') }), holoscan: holo(), collections: cols, results: res, classifications: { r1: { classification: 'above', reason_codes: [] }, r2: { classification: 'within', reason_codes: [] } } });
ok(D2.domains['FX-DOM'].reason_codes.includes('mixed_without_rule') && D2.estado_geral === 'sem_dados_suficientes', 'Fixture D2: SEM regra de mistos homologada -> mixed_without_rule (reservado a conjunto sem regra)');
const E = L.calcular({ rule_package: FX(), holoscan: holo(), collections: [{ id: 'c1', clinical_date: '2025-06-01' }], results: res, classifications: cls });
ok(E.estado_geral === 'sem_dados_suficientes' && E.domains['FX-DOM'].reason_codes.includes('outside_time_window') && E.domains['FX-DOM'].items.filter(i => !i.included).length === 2, 'Fixture E: coleta fora da janela de 30 dias -> sem dados suficientes (outside_time_window), itens excluidos no trace');
const F = L.calcular({ rule_package: FX(), holoscan: holo(), collections: cols, results: res, classifications: { r1: { classification: 'not_classifiable', reason_codes: ['incompatible_unit'] }, r2: { classification: 'not_classifiable', reason_codes: ['incompatible_unit'] } } });
ok(F.estado_geral === 'sem_dados_suficientes' && F.domains['FX-DOM'].reason_codes.includes('incompatible_unit'), 'Fixture F: unidades incompativeis -> sem dados suficientes (incompatible_unit)');
const G = L.calcular({ rule_package: FX(), holoscan: holo(null), collections: cols, results: res, classifications: cls });
ok(G.domains['FX-DOM'].reason_codes[0] === 'holoscan_not_evaluable' && L.calcular({ rule_package: FX(), holoscan: null, collections: cols, results: res, classifications: cls }).domains['FX-DOM'].reason_codes[0] === 'missing_holoscan_source', 'HOLOSCAN nao avaliavel / ausente -> motivo explicito');
const t = A.domains['FX-DOM'];
ok(['domain_code', 'holoscan_mapping_mode', 'cross_source_mode', 'lab_domain_availability', 'temporal', 'items', 'sufficiency', 'mixed', 'holoscan', 'laboratory_direction', 'holoscan_direction', 'state', 'reason_codes', 'snapshot', 'engine_version'].every(k => k in t) && t.engine_version === L.VERSAO, 'trace/snapshot completo por dominio');
ok(!/TEST_FIXTURE_ONLY|FX-DOM|texto ficticio/.test(sql) && !/FX-DOM|holoscan_max_nota|max_days:\s*\d/.test(readFileSync(RAIZ + 'laboratorio.js', 'utf8')), 'nenhuma fixture da Leitura Integrada chegou a migration nem a UI');
ok(!/confrontar|lerExames|limiteBaixo|<=\s*3/.test(readFileSync(RAIZ + 'leitura-integrada-motor.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), 'o motor da Leitura Integrada nao chama o confronto legado');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
