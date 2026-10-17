/**
 * V1 — ETAPA 6.0 — LEITURA INTEGRADA EXECUTAVEL: PACOTE LI-V1@2 + MOTOR 2.0.0 (puro, sem navegador)
 *
 *  Pacote: 7 dominios, 47 vinculos (9 directional + 38 contextual), contagens invariantes 45/42/3/47/5 e
 *  7/3/5/4/4/12/12; hash deterministico; SQL da migration == pacote JS; completude.
 *  Temporal LI-TEMP-01: 0, +30, -30 compatible; +31, -31 incompatible; data ausente; delta com sinal.
 *  HOLOSCAN: baixa -> present, intermediaria -> indeterminate, alta -> not_detected; nao avaliavel; ausente; versao.
 *  D01..D04: suficiencia e mistos exatamente como decidido (5.13); D05..D07 not_applicable (nunca SEM DADOS por
 *  falta de confronto; nunca missing_domain_holoscan_mapping). Classificacao (LabMotor): missing/ambiguous reference,
 *  unidade, qualitativo, censurado deterministico/ambiguo, variante/material/metodo. Duplicidade sem escolha silenciosa.
 *  Nao interferencia: a LI nao altera nota, faixa, Indice nem Triada. Nenhum confronto legado.
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import '../laboratorio-catalogo.js';
import '../laboratorio-motor.js';
import '../leitura-integrada-pacote-v1.js';
import '../leitura-integrada-motor.js';
import '../metodologia-pacote.js';
import '../metodologia-motor.js';
import '../metodologia-decisoes-v1.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url).pathname;
const C = globalThis.LabCatalogo, M = globalThis.LabMotor, PK = globalThis.LeituraIntegradaPacoteV1, L = globalThis.LeituraIntegradaMotor;
const P = 'attention_present', N = 'attention_not_detected', I = 'indeterminate';

titulo('PACOTE LI-V1@2: CONTAGENS INVARIANTES, PAPEIS, HASH, MIGRATION');
const cnt = PK.contagens();
ok(cnt.exames_base === 45 && cnt.vinculados === 42 && cnt.sem_dominio.join(',') === 'LAB-027,LAB-033,LAB-044' && cnt.pares === 47 && cnt.multi_dominio.join(',') === 'LAB-025,LAB-026,LAB-028,LAB-029,LAB-034', '45 exames-base, 42 vinculados, 3 sem dominio (027/033/044), 47 pares, 5 multi-dominio');
ok(JSON.stringify(cnt.por_dominio) === JSON.stringify({ 'LI-D01': 7, 'LI-D02': 3, 'LI-D03': 5, 'LI-D04': 4, 'LI-D05': 4, 'LI-D06': 12, 'LI-D07': 12 }), 'por dominio: 7/3/5/4/4/12/12');
ok(cnt.directional + cnt.contextual === 47 && cnt.directional === 9 && PK.VINCULOS.every(l => ['directional', 'contextual'].includes(l.cross_source_role)), 'cross_source_role cobre os 47 vinculos: 9 directional + 38 contextual, sem faltantes');
const dir = (d) => PK.VINCULOS.filter(l => l.domain === d && l.cross_source_role === 'directional').map(l => l.exam_code).join(',');
ok(dir('LI-D01') === 'LAB-016,LAB-018' && dir('LI-D02') === 'LAB-002,LAB-003,LAB-004' && dir('LI-D03') === 'LAB-005,LAB-009' && dir('LI-D04') === 'LAB-013,LAB-015' && dir('LI-D05') === '' && dir('LI-D06') === '' && dir('LI-D07') === '', 'directional por dominio exatamente como a DECISAO 20-21');
const mapa = Object.fromEntries(PK.DOMINIOS.map(d => [d.code, d.holoscan_mapping_mode + ':' + d.holoscan_system]));
ok(mapa['LI-D01'] === 'mapped:acido_inflamatorio' && mapa['LI-D02'] === 'mapped:metabolico' && mapa['LI-D03'] === 'mapped:metabolico' && mapa['LI-D04'] === 'mapped:detox_linfatico' && mapa['LI-D05'] === 'none:null' && mapa['LI-D06'] === 'none:null' && mapa['LI-D07'] === 'none:null', 'mapeamento HOLOSCAN: D01 acido_inflamatorio, D02/D03 metabolico, D04 detox_linfatico, D05-D07 none (nao "missing")');
ok(PK.VINCULOS.every(l => (l.cross_source_role === 'directional') === !!l.direction_rules) && PK.VINCULOS.every(l => C.porCodigo(l.exam_code)), 'direction_rules so nos directional; todo vinculo aponta para exame do catalogo');
const h1 = PK.hashConteudo(), h2 = createHash('sha256').update(PK.textoCanonico(), 'utf8').digest('hex');
ok(/^[0-9a-f]{64}$/.test(h1) && h1 === h2 && PK.hashConteudo() === h1, 'content_hash deterministico (sha256 do texto canonico jsonb): ' + h1.slice(0, 12));
const mig = readFileSync(RAIZ + 'supabase/migrations/20261002120000_etapa6_leitura_integrada_v1.sql', 'utf8');
ok(mig.includes(PK.sqlInserts().split('\n')[0].trim()) && PK.sqlInserts().split('\n').every(l => mig.includes(l.trim())), 'a migration contem exatamente os inserts gerados pelo pacote JS (seed identico)');
ok((mig.match(/insert into public.integrated_reading_exam_domain_links/g) || []).length === 47 && (mig.match(/insert into public.integrated_reading_domains/g) || []).length === 7 && /'em_revisao'/.test(mig) && !/integrated_reading_package_approvals \(/.test(mig.replace(/count\(\*\) from public.integrated_reading_package_approvals/g, '')), 'migration: 47 vinculos, 7 dominios, LI-V1@2 em_revisao, nenhuma aprovacao inserida');
ok(/mixed_results_indeterminate/.test(mig) && /mixed_without_rule/.test(mig) && /holoscan_mapping_mode/.test(mig) && /cross_source_role/.test(mig) && /LI-TEMP-01/.test(mig), 'migration materializa mixed_results_indeterminate, holoscan_mapping_mode, cross_source_role e LI-TEMP-01');
const regra = (t, alvo) => PK.REGRAS.find(r => r.rule_type === t && r.target === alvo);
ok(regra('temporal', 'global').payload.max_days === 30 && regra('temporal', 'global').payload.inclusive === true && regra('temporal', 'global').payload.symmetric === true && regra('temporal', 'global').payload.exceptions.length === 0, 'LI-TEMP-01 v1: ±30 dias, inclusivo, simetrico, 0 excecoes');
ok(JSON.stringify(regra('holoscan_direction', 'global').payload.faixa_map) === JSON.stringify({ baixa: P, intermediaria: I, alta: N }) && regra('holoscan_direction', 'global').payload.not_evaluable === I, 'direcao HOLOSCAN: baixa -> present, intermediaria -> indeterminate, alta -> not_detected, nao avaliavel -> indeterminate');
const suf = (d) => regra('sufficiency', d).payload;
ok(suf('LI-D01').min_classifiable_results === 1 && suf('LI-D01').required_exam_codes.join() === 'LAB-016' && suf('LI-D01').optional_directional_exam_codes.join() === 'LAB-018', 'suficiencia D01: min 1, PCR obrigatoria, fibrinogenio opcional');
ok(suf('LI-D02').min_classifiable_results === 2 && suf('LI-D02').required_exam_codes.length === 0 && suf('LI-D02').required_exam_groups[0].code === 'GLYCEMIC_ANCHOR' && suf('LI-D02').required_exam_groups[0].any_of.join() === 'LAB-002,LAB-004', 'suficiencia D02: min 2 + GLYCEMIC_ANCHOR (LAB-002 OU LAB-004)');
ok(suf('LI-D03').required_exam_codes.join() === 'LAB-005,LAB-009' && suf('LI-D04').required_exam_codes.join() === 'LAB-013,LAB-015' && suf('LI-D03').min_classifiable_results === 2 && suf('LI-D04').min_classifiable_results === 2, 'suficiencia D03 (TG+HDL) e D04 (ALT+GGT): ambos obrigatorios, min 2');
ok(['LI-D05', 'LI-D06', 'LI-D07'].every(d => suf(d).mode === 'not_applicable' && suf(d).min_classifiable_results === null && suf(d).required_exam_codes.length === 0 && regra('mixed', d).payload.mode === 'not_applicable'), 'D05/D06/D07: cross_source_sufficiency_mode e mixed not_applicable (min null, nao 0)');
ok(['LI-D01', 'LI-D02', 'LI-D03', 'LI-D04'].every(d => regra('mixed', d).payload.mode === 'unanimity' && regra('mixed', d).payload.mixture === I && regra('mixed', d).payload.mixture_reason === 'mixed_results_indeterminate'), 'mistos D01-D04: unanimidade; mistura -> indeterminate com mixed_results_indeterminate (nunca mixed_without_rule)');
ok(regra('reason_semantics', 'global').payload.codes.mixed_results_indeterminate && regra('reason_semantics', 'global').payload.codes.mixed_without_rule && regra('reason_semantics', 'global').payload.codes.directional_result_indeterminate && regra('reason_semantics', 'global').payload.official_state_for_all === 'sem_dados_suficientes', 'semantica: mixed_results_indeterminate, directional_result_indeterminate e mixed_without_rule distintos; estado oficial continua sem_dados_suficientes');
ok(['LI-D01', 'LI-D02', 'LI-D03', 'LI-D04'].every(d => regra('mixed', d).payload.version === 2 && regra('mixed', d).payload.indeterminate_participant_reason === 'directional_result_indeterminate' && regra('mixed', d).payload.indeterminate_optional_ignored === true), 'regra de mistos v2 (6.0.1): participante indeterminate -> directional_result_indeterminate; opcional ignorado');
ok(h1 === 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9', 'content_hash candidato recalculado apos a mudanca do conteudo canonico: ' + h1.slice(0, 12) + '… (o anterior 7c6d93a0… nao e reutilizado)');
const txt = regra('text', 'global').payload;
ok(!/confirma|prova|diagnostica|saudável|doente|cura|melhora|piora/i.test(JSON.stringify(txt)) && /não possui confronto automático/.test(txt.sem_confronto_holoscan), 'textos oficiais sem linguagem diagnostica; texto neutro para dominio sem confronto');

titulo('FIXTURE DE ENTRADA (TEST_FIXTURE_ONLY: paciente ficticio, valores ficticios)');
const pacote = () => Object.assign(PK.pacote(), { id: 'pk2', status: 'aprovado' });   // 'aprovado' SO no fixture em memoria: o pacote real segue em_revisao
const HPK = { id: 'hp', code: 'HOLOS-V1', version: 2, status: 'aprovado' };
const holo = (faixaPorSistema, over) => ({ application: Object.assign({ id: 'app1', clinical_date: '2026-03-10', methodology_package: HPK }, over || {}), system_results: Object.fromEntries(Object.keys(faixaPorSistema).map(k => [k, faixaPorSistema[k] === null ? { avaliavel: false } : { avaliavel: true, faixa: faixaPorSistema[k], nota: 1 }])) });
let seq = 0;
const R = (code, valor, ref, extra) => Object.assign({ id: 'r' + (++seq), collection_id: 'c1', exam_code: code, variant: null, material: null, method: null, value_original_text: String(valor), unit_original: 'u', reference_status: ref ? 'informed' : 'missing', report_reference_min: ref ? ref[0] : null, report_reference_max: ref ? ref[1] : null, report_reference_operator: ref && ref[2] ? ref[2] : 'range', report_reference_unit: 'u' }, extra || {});
const classificar = (rs) => Object.fromEntries(rs.map(r => [r.id, M.classificar(r, r.reference_status === 'informed' ? { source: 'laudo', min: r.report_reference_min, max: r.report_reference_max, operator: r.report_reference_operator, unit: r.report_reference_unit, ambiguous: r.ambiguous === true } : null, { conversoes: [] })]));
const calc = (rs, h, over) => L.calcular(Object.assign({ rule_package: pacote(), holoscan: h, collections: [{ id: 'c1', clinical_date: '2026-03-10' }], results: rs, classifications: classificar(rs), patient_id: 'pf' }, over || {}));
// within = dentro [10,20]; above = 30; below = 1
const W = [10, 20], within = (code, extra) => R(code, 15, W, extra), above = (code, extra) => R(code, 30, W, extra), below = (code, extra) => R(code, 1, W, extra);

titulo('TEMPORAL LI-TEMP-01: 0, +30, -30 COMPATIVEL; +31, -31 INCOMPATIVEL; DATA AUSENTE; DELTA COM SINAL');
const temporal = (dataColeta) => calc([above('LAB-016', { collection_id: 'cX' })], holo({ acido_inflamatorio: 'baixa' }), { collections: [{ id: 'cX', clinical_date: dataColeta }] }).domains['LI-D01'];
ok(temporal('2026-03-10').temporal.collections[0].temporal_delta_days === 0 && temporal('2026-03-10').state === 'convergente', 'delta 0 -> compatible (convergente com PCR acima + HOLOSCAN baixa)');
ok(temporal('2026-04-09').temporal.collections[0].temporal_delta_days === 30 && temporal('2026-04-09').temporal.collections[0].temporal_status === 'compatible' && temporal('2026-04-09').state === 'convergente', '+30 -> compatible (inclusivo)');
ok(temporal('2026-02-08').temporal.collections[0].temporal_delta_days === -30 && temporal('2026-02-08').state === 'convergente', '-30 -> compatible (inclusivo, simetrico)');
const t31 = temporal('2026-04-10');
ok(t31.temporal.collections[0].temporal_delta_days === 31 && t31.temporal.collections[0].temporal_status === 'incompatible' && t31.state === 'sem_dados_suficientes' && t31.reason_codes.includes('outside_time_window') && t31.reason_codes.includes('missing_required_exam') && t31.items[0].exclusion_reason === 'outside_time_window', '+31 -> incompatible: outside_time_window; PCR excluida; SEM DADOS (nada apagado: item segue no trace)');
ok(temporal('2026-02-07').temporal.collections[0].temporal_delta_days === -31 && temporal('2026-02-07').state === 'sem_dados_suficientes' && temporal('2026-02-07').reason_codes.includes('outside_time_window'), '-31 -> incompatible');
/* simulacao 08/10: coleta antiga (fora da janela) + coleta recente com o MESMO exame: o resultado antigo
   excluido nao poluiu os motivos do dominio (antes "fora da janela" aparecia em todos os dominios) */
const duasColetas = calc([above('LAB-005', { collection_id: 'cOld' }), above('LAB-005', { collection_id: 'cNew' })], holo({ metabolico: 'baixa' }),
  { collections: [{ id: 'cOld', clinical_date: '2025-12-10' }, { id: 'cNew', clinical_date: '2026-03-10' }] }).domains['LI-D03'];
ok(duasColetas.state === 'sem_dados_suficientes' && !duasColetas.reason_codes.includes('outside_time_window') && duasColetas.reason_codes.includes('missing_required_exam') && duasColetas.items.some(i => i.exclusion_reason === 'outside_time_window'),
   'exame com resultado recente incluido: o resultado antigo fora da janela segue no trace, mas nao vira motivo do dominio: ' + duasColetas.reason_codes.join(','));
const soAntiga = calc([above('LAB-005', { collection_id: 'cOld' })], holo({ metabolico: 'baixa' }), { collections: [{ id: 'cOld', clinical_date: '2025-12-10' }] }).domains['LI-D03'];
ok(soAntiga.reason_codes.includes('outside_time_window'), 'exame so na coleta antiga: "fora da janela" continua sendo motivo');
const tnull = temporal(null);
ok(tnull.temporal.collections[0].temporal_delta_days === null && tnull.temporal.collections[0].temporal_status === 'missing_clinical_date' && tnull.reason_codes.includes('missing_clinical_date') && tnull.state === 'sem_dados_suficientes', 'coleta sem data clinica -> missing_clinical_date (sem fallback para created_at/updated_at)');
const semDataApp = calc([above('LAB-016')], holo({ acido_inflamatorio: 'baixa' }, { clinical_date: null })).domains['LI-D01'];
ok(semDataApp.reason_codes.includes('missing_clinical_date') && semDataApp.state === 'sem_dados_suficientes', 'aplicacao sem data clinica -> missing_clinical_date');
ok(L.deltaDias('2026-09-20', '2026-10-02') === -12 && L.deltaDias('2026-10-02', '2026-09-20') === 12, 'delta com sinal: coleta 20/09 x aplicacao 02/10 = -12 (so rastreabilidade/ordenacao)');
ok(!/created_at|updated_at|saved_at|reviewed_at|last_modified/.test(readFileSync(RAIZ + 'leitura-integrada-motor.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'o motor nao le created_at/updated_at/saved_at/reviewed_at/last_modified');

titulo('DIRECAO HOLOSCAN: BAIXA -> PRESENT, INTERMEDIARIA -> INDETERMINATE, ALTA -> NOT_DETECTED, NAO AVALIAVEL, AUSENTE, VERSAO');
const d01 = (rs, h) => calc(rs, h).domains['LI-D01'];
ok(d01([above('LAB-016')], holo({ acido_inflamatorio: 'baixa' })).holoscan_direction === P, 'faixa baixa -> attention_present');
const inter = d01([above('LAB-016')], holo({ acido_inflamatorio: 'intermediaria' }));
ok(inter.holoscan_direction === I && inter.state === 'sem_dados_suficientes' && inter.laboratory_direction === P, 'faixa intermediaria -> indeterminate -> SEM DADOS (laboratorio present nao vira divergente)');
ok(d01([above('LAB-016')], holo({ acido_inflamatorio: 'alta' })).holoscan_direction === N && d01([above('LAB-016')], holo({ acido_inflamatorio: 'alta' })).state === 'divergente', 'faixa alta -> attention_not_detected; com PCR acima -> DIVERGENTE');
const nav = d01([above('LAB-016')], holo({ acido_inflamatorio: null }));
ok(nav.holoscan_direction === I && nav.reason_codes[0] === 'holoscan_not_evaluable' && nav.state === 'sem_dados_suficientes', 'sistema nao avaliavel -> indeterminate, holoscan_not_evaluable');
const semApp = d01([above('LAB-016')], null);
ok(semApp.reason_codes[0] === 'missing_holoscan_source' && semApp.state === 'sem_dados_suficientes' && semApp.items[0].temporal_status === 'missing_holoscan_source' && !semApp.reason_codes.includes('missing_clinical_date'), 'sem aplicacao -> missing_holoscan_source (sem ancora temporal; nao vira missing_clinical_date)');
ok(d01([above('LAB-016')], holo({ acido_inflamatorio: 'baixa' }, { methodology_package: null })).reason_codes[0] === 'incompatible_holoscan_version' && d01([above('LAB-016')], holo({ acido_inflamatorio: 'baixa' }, { methodology_package: { code: 'HOLOS-V1', version: 1, status: 'aprovado' } })).reason_codes[0] === 'incompatible_holoscan_version' && d01([above('LAB-016')], holo({ acido_inflamatorio: 'baixa' }, { methodology_package: { code: 'HOLOS-V1', version: 2, status: 'em_revisao' } })).reason_codes[0] === 'incompatible_holoscan_version', 'aplicacao sem pacote, pacote v1, ou pacote nao aprovado -> incompatible_holoscan_version');
ok(!/'baixo'|"baixo"|'medio'|"medio"|<=\s*3|<=\s*6/.test(readFileSync(RAIZ + 'leitura-integrada-motor.js', 'utf8') + readFileSync(RAIZ + 'leitura-integrada-pacote-v1.js', 'utf8')), 'nenhum limite legado (3/6, baixo/medio/alto) no motor nem no pacote');

titulo('D01 — HEMATOLOGICO E INFLAMATORIO (PCR obrigatoria; fibrinogenio opcional)');
const HB = holo({ acido_inflamatorio: 'baixa' });
ok(d01([above('LAB-016')], HB).state === 'convergente' && d01([above('LAB-016')], HB).laboratory_direction === P && d01([above('LAB-016')], HB).sufficiency.satisfied, 'PCR present (acima) sozinha: suficiencia satisfeita, direcao present, convergente com HOLOSCAN baixa');
ok(d01([within('LAB-016')], HB).laboratory_direction === N && d01([within('LAB-016')], HB).state === 'divergente', 'PCR not_detected (dentro) sozinha: direcao not_detected -> divergente com HOLOSCAN baixa');
ok(d01([above('LAB-016'), above('LAB-018')], HB).laboratory_direction === P, 'PCR + fibrinogenio present/present -> present');
ok(d01([within('LAB-016'), within('LAB-018')], HB).laboratory_direction === N, 'PCR + fibrinogenio not/not -> not_detected');
const m1 = d01([above('LAB-016'), within('LAB-018')], HB), m2 = d01([within('LAB-016'), above('LAB-018')], HB);
ok(m1.laboratory_direction === I && m1.state === 'sem_dados_suficientes' && m1.reason_codes.includes('mixed_results_indeterminate') && !m1.reason_codes.includes('mixed_without_rule') && m2.laboratory_direction === I && m2.state === 'sem_dados_suficientes', 'present/not e not/present -> indeterminate -> SEM DADOS com mixed_results_indeterminate (nunca divergente, nunca mixed_without_rule)');
const fibInd = d01([above('LAB-016'), below('LAB-018')], HB);
ok(fibInd.laboratory_direction === P && fibInd.state === 'convergente' && fibInd.sufficiency.satisfied && fibInd.mixed.considered.find(x => x.exam_code === 'LAB-018').direction === I && !fibInd.reason_codes.includes('directional_result_indeterminate'), 'excecao D01 preservada (6.0.1): PCR deterministica + fibrinogenio opcional indeterminate -> direcao da PCR valida; sem directional_result_indeterminate');
const pcrInd = d01([below('LAB-016'), above('LAB-018')], HB);
ok(pcrInd.laboratory_direction === I && pcrInd.reason_codes.includes('directional_result_indeterminate') && pcrInd.state === 'sem_dados_suficientes', 'PCR (obrigatoria) below -> indeterminate participante -> directional_result_indeterminate mesmo com fibrinogenio present');
const semPCR = d01([above('LAB-018')], HB);
ok(semPCR.state === 'sem_dados_suficientes' && semPCR.reason_codes.includes('missing_required_exam') && !semPCR.sufficiency.satisfied && semPCR.sufficiency.required_missing.join() === 'LAB-016', 'PCR ausente -> SEM DADOS (missing_required_exam); fibrinogenio sozinho nao basta');
const pcrSemRef = d01([R('LAB-016', 30, null), above('LAB-018')], HB);
ok(pcrSemRef.state === 'sem_dados_suficientes' && pcrSemRef.reason_codes.includes('missing_reference') && pcrSemRef.reason_codes.includes('missing_required_exam'), 'PCR sem referencia -> nao classificavel -> missing_reference + missing_required_exam (causa real)');
const ctxNaoConta = d01([above('LAB-001'), above('LAB-025'), above('LAB-029')], HB);
ok(ctxNaoConta.state === 'sem_dados_suficientes' && ctxNaoConta.lab_domain_availability.contextual_classifiable === 3 && ctxNaoConta.sufficiency.classifiable_directional_count === 0, 'contextuais (hemograma, B12, ferritina) classificaveis NAO contam para a suficiencia nem substituem a PCR');
const pcrUs = d01([above('LAB-016', { variant: 'ultrassensivel' })], HB), pcrOutra = d01([above('LAB-016', { variant: 'cromatografica' })], HB);
ok(pcrUs.state === 'convergente' && pcrOutra.items[0].exclusion_reason === 'incompatible_variant' && pcrOutra.state === 'sem_dados_suficientes', 'variante declarada (PCR-us) participa; variante nao declarada -> incompatible_variant');

titulo('D02 — GLICEMICO E METABOLICO (min 2 + GLYCEMIC_ANCHOR; insulina nunca sozinha)');
const HM = holo({ metabolico: 'baixa' }), d02 = (rs) => calc(rs, HM).domains['LI-D02'];
ok(d02([above('LAB-002'), above('LAB-004')]).sufficiency.satisfied && d02([above('LAB-002'), above('LAB-003')]).sufficiency.satisfied && d02([above('LAB-004'), above('LAB-003')]).sufficiency.satisfied && d02([above('LAB-002'), above('LAB-003'), above('LAB-004')]).sufficiency.satisfied, 'suficientes: 002+004, 002+003, 004+003, 002+003+004');
ok(!d02([above('LAB-002')]).sufficiency.satisfied && !d02([above('LAB-003')]).sufficiency.satisfied && !d02([above('LAB-004')]).sufficiency.satisfied && d02([above('LAB-002')]).reason_codes.includes('insufficient_domain_coverage'), 'insuficientes: 002 sozinho, 003 sozinho, 004 sozinho (insufficient_domain_coverage)');
const soIns = d02([above('LAB-003'), above('LAB-003', { collection_id: 'c1', variant: null, id: 'rX' })]);
ok(soIns.state === 'sem_dados_suficientes' && soIns.sufficiency.groups_unmet.join() === 'GLYCEMIC_ANCHOR', 'insulina sem glicemia/HbA1c: grupo GLYCEMIC_ANCHOR nao atendido -> SEM DADOS');
ok(d02([above('LAB-002'), above('LAB-003'), above('LAB-004')]).laboratory_direction === P && d02([above('LAB-002'), above('LAB-003'), above('LAB-004')]).state === 'convergente', 'todos present -> present (convergente com metabolico baixa)');
ok(d02([within('LAB-002'), within('LAB-003'), within('LAB-004')]).laboratory_direction === N && d02([within('LAB-002'), within('LAB-004')]).state === 'divergente', 'todos not_detected -> not_detected (divergente com metabolico baixa)');
const mistD02 = d02([above('LAB-002'), within('LAB-004')]);
ok(mistD02.laboratory_direction === I && mistD02.state === 'sem_dados_suficientes' && mistD02.reason_codes.includes('mixed_results_indeterminate'), 'mistura present/not em D02 -> indeterminate -> SEM DADOS (mixed_results_indeterminate)');
const hbInd = d02([above('LAB-002'), below('LAB-004')]);
ok(d02([below('LAB-002'), above('LAB-003')]).laboratory_direction === P && hbInd.laboratory_direction === I && hbInd.state === 'sem_dados_suficientes' && hbInd.reason_codes.includes('directional_result_indeterminate') && !hbInd.reason_codes.includes('mixed_results_indeterminate'), 'Etapa 6.0.1 — D02: glicemia below (any) -> present; HbA1c below -> participante indeterminate -> direcao indeterminada com directional_result_indeterminate (nao e mistura)');

titulo('D03 — LIPIDICO (TG + HDL obrigatorios)');
const d03 = (rs) => calc(rs, HM).domains['LI-D03'];
ok(d03([above('LAB-005'), below('LAB-009')]).laboratory_direction === P && d03([above('LAB-005'), below('LAB-009')]).state === 'convergente', 'TG acima + HDL abaixo -> present/present -> present');
ok(d03([within('LAB-005'), within('LAB-009')]).laboratory_direction === N && d03([within('LAB-005'), within('LAB-009')]).state === 'divergente', 'TG dentro + HDL dentro -> not/not -> not_detected');
ok(d03([above('LAB-005'), within('LAB-009')]).laboratory_direction === I && d03([within('LAB-005'), below('LAB-009')]).laboratory_direction === I && d03([above('LAB-005'), within('LAB-009')]).state === 'sem_dados_suficientes', 'TG present + HDL not (e vice-versa) -> indeterminate -> SEM DADOS, nunca divergente');
ok(d03([below('LAB-009')]).reason_codes.includes('missing_required_exam') && d03([above('LAB-005')]).reason_codes.includes('missing_required_exam') && !d03([above('LAB-005')]).sufficiency.satisfied, 'ausencia de TG ou de HDL -> missing_required_exam');
ok(d03([above('LAB-005'), above('LAB-006'), above('LAB-007'), above('LAB-008')]).state === 'sem_dados_suficientes' && d03([above('LAB-005'), above('LAB-006'), above('LAB-007'), above('LAB-008')]).lab_domain_availability.contextual_classifiable === 3, 'colesterol total/LDL/LDL-ox (contextuais) nao substituem o HDL');
const hdlInd = d03([above('LAB-009'), above('LAB-005')]);
ok(hdlInd.laboratory_direction === I && hdlInd.reason_codes.includes('directional_result_indeterminate') && !hdlInd.reason_codes.includes('mixed_results_indeterminate') && hdlInd.state === 'sem_dados_suficientes', 'Etapa 6.0.1 — D03: HDL acima (contrario ao vinculo below) + TG acima -> directional_result_indeterminate (sem mistura present/not)');

titulo('D04 — HEPATICO (ALT + GGT obrigatorios)');
const HD = holo({ detox_linfatico: 'baixa' }), d04 = (rs) => calc(rs, HD).domains['LI-D04'];
ok(d04([above('LAB-013'), above('LAB-015')]).laboratory_direction === P && d04([above('LAB-013'), above('LAB-015')]).state === 'convergente', 'ALT + GGT present/present -> present');
ok(d04([within('LAB-013'), within('LAB-015')]).laboratory_direction === N && d04([within('LAB-013'), within('LAB-015')]).state === 'divergente', 'ALT + GGT not/not -> not_detected');
ok(d04([above('LAB-013'), within('LAB-015')]).laboratory_direction === I && d04([within('LAB-013'), above('LAB-015')]).laboratory_direction === I && d04([above('LAB-013'), within('LAB-015')]).reason_codes.includes('mixed_results_indeterminate'), 'present/not e not/present -> indeterminate');
ok(d04([above('LAB-015')]).reason_codes.includes('missing_required_exam') && d04([above('LAB-013')]).reason_codes.includes('missing_required_exam'), 'ausencia de ALT ou de GGT -> missing_required_exam');
const ggtInd = d04([above('LAB-013'), below('LAB-015')]);
ok(ggtInd.laboratory_direction === I && ggtInd.reason_codes.includes('directional_result_indeterminate') && !ggtInd.reason_codes.includes('mixed_results_indeterminate') && ggtInd.state === 'sem_dados_suficientes', 'Etapa 6.0.1 — D04: ALT acima + GGT abaixo (indeterminate) -> directional_result_indeterminate; nunca convergente/divergente');
const ggtMist = d04([above('LAB-013'), within('LAB-015')]);
ok(ggtMist.reason_codes.includes('mixed_results_indeterminate') && !ggtMist.reason_codes.includes('directional_result_indeterminate'), 'mistura real (present + not_detected) continua mixed_results_indeterminate');
ok(d04([above('LAB-012'), above('LAB-014'), above('LAB-013')]).state === 'sem_dados_suficientes', 'AST e bilirrubina (contextuais) nao substituem GGT');

titulo('D05 / D06 / D07 — SEM CONFRONTO HOLOSCAN NA V1 (informacao laboratorial; nunca SEM DADOS por falta de mapeamento)');
const todos = calc([above('LAB-010'), above('LAB-011'), above('LAB-019'), above('LAB-020'), above('LAB-021'), above('LAB-035'), above('LAB-030'), above('LAB-031'), above('LAB-034')], holo({ acido_inflamatorio: 'baixa', metabolico: 'baixa', detox_linfatico: 'baixa', fungico: 'baixa', mental_emocional_espiritual: 'baixa' }));
['LI-D05', 'LI-D06', 'LI-D07'].forEach(k => {
  const d = todos.domains[k];
  ok(d.cross_source_mode === 'not_applicable' && d.state === null && d.laboratory_direction === null && d.holoscan_direction === null && d.reason_codes.length === 0 && d.sufficiency.mode === 'not_applicable' && d.mixed.mode === 'not_applicable', k + ': not_applicable; estado nulo; sem direcoes; 0 reason codes');
});
ok(todos.domains['LI-D05'].lab_domain_availability.classifiable === 4 && todos.domains['LI-D06'].lab_domain_availability.classifiable === 3 && todos.domains['LI-D07'].lab_domain_availability.classifiable === 3 && todos.domains['LI-D06'].items.some(i => i.exam_code === 'LAB-034') && todos.domains['LI-D07'].items.some(i => i.exam_code === 'LAB-034'), 'lab_domain_availability distinta da suficiencia: D05 4, D06 3, D07 3 classificaveis; PTH aparece em D06 e D07 (1 resultado, 2 vinculos, nenhum voto)');
ok(!JSON.stringify(todos).includes('missing_domain_holoscan_mapping') && todos.not_applicable.join() === 'LI-D05,LI-D06,LI-D07' && todos.cross_source_enabled.join() === 'LI-D01,LI-D02,LI-D03,LI-D04', 'nenhum falso missing_domain_holoscan_mapping; D05-D07 listados como not_applicable');
ok(todos.domains['LI-D05'].text.profissional.includes('não possui confronto automático'), 'texto neutro de interface para dominio sem confronto (nao e estado oficial)');

titulo('CLASSIFICACAO (LabMotor) ENTRA NA LI: REFERENCIA, UNIDADE, QUALITATIVO, CENSURADO, VARIANTE/MATERIAL/METODO');
const motivo = (r, extraRef) => { const rs = [r]; const cls = classificar(rs); if (extraRef) Object.assign(cls[r.id] = M.classificar(r, extraRef, { conversoes: [] })); return L.calcular({ rule_package: pacote(), holoscan: HB, collections: [{ id: 'c1', clinical_date: '2026-03-10' }], results: rs, classifications: cls }).domains['LI-D01']; };
ok(motivo(R('LAB-016', 30, null)).items[0].exclusion_reason === 'missing_reference', 'missing reference');
const amb = motivo(R('LAB-016', 30, W, { reference_status: 'ambiguous', report_reference_text: '10 a 20 ou 5 a 15 (laudo ambiguo)' }), { source: 'laudo', min: 10, max: 20, operator: 'range', unit: 'u', ambiguous: true });
ok(amb.items[0].exclusion_reason === 'ambiguous_reference' && amb.items[0].classification === 'not_classifiable' && amb.snapshot.items[0].exclusion_reason === 'ambiguous_reference' && amb.snapshot.items[0].reference_status === 'ambiguous' && amb.snapshot.items[0].reference_text === '10 a 20 ou 5 a 15 (laudo ambiguo)' && amb.snapshot.excluded[0].reason === 'ambiguous_reference' && amb.reason_codes.includes('ambiguous_reference'), 'ambiguous reference: nao classificavel, reason code, exclusao e referencia original preservados no snapshot (nenhuma classificacao fabricada)');
ok(motivo(R('LAB-016', 30, W, { unit_original: 'mg/L', report_reference_unit: 'mg/dL' })).items[0].exclusion_reason === 'incompatible_unit', 'incompatible unit (sem conversao homologada)');
ok(motivo(R('LAB-016', 'Negativo', W)).items[0].exclusion_reason === 'qualitative_rule_missing', 'qualitativo sem regra -> qualitative_rule_missing');
const cDet = motivo(R('LAB-016', '< 5', W)), cAmb = motivo(R('LAB-016', '< 15', W)), cAlto = motivo(R('LAB-016', '> 25', W));
ok(cDet.items[0].classification === 'below' && cDet.items[0].direction === I && cAlto.items[0].classification === 'above' && cAlto.items[0].direction === P && cAlto.state === 'convergente', 'censurado deterministico: "< 5" com ref [10,20] -> below; "> 25" -> above (direcao present)');
ok(cAmb.items[0].exclusion_reason === 'censored_value_ambiguous' && M.classificar(R('LAB-016', '< 15', W), { source: 'laudo', min: 10, max: 20, operator: 'range', unit: 'u' }).trace.value.numeric_value === null, 'censurado ambiguo "< 15" -> censored_value_ambiguous; numeric_value continua nulo');
ok(motivo(R('LAB-016', 30, W), { source: 'laudo', min: 10, max: 20, operator: 'range', unit: 'u', variant: 'ultrassensivel' }).items[0].exclusion_reason === 'incompatible_variant', 'variant incompatibility (referencia de outra variante)');
ok(motivo(R('LAB-016', 30, W), { source: 'laudo', min: 10, max: 20, operator: 'range', unit: 'u', material: 'plasma' }).items[0].exclusion_reason === 'incompatible_material', 'material incompatibility');
ok(motivo(R('LAB-016', 30, W, { method: 'nefelometria' }), { source: 'laudo', min: 10, max: 20, operator: 'range', unit: 'u', method: 'turbidimetria', method_relevant: true }).items[0].exclusion_reason === 'incompatible_method', 'method incompatibility');

titulo('DUPLICIDADE: DUAS COLETAS, MESMO EXAME, NENHUMA ESCOLHA SILENCIOSA');
const dupRs = [above('LAB-016', { id: 'd1', collection_id: 'c1' }), within('LAB-016', { id: 'd2', collection_id: 'c2' })];
const dupCols = [{ id: 'c1', clinical_date: '2026-03-10' }, { id: 'c2', clinical_date: '2026-03-10' }];
const dup = L.calcular({ rule_package: pacote(), holoscan: HB, collections: dupCols, results: dupRs, classifications: classificar(dupRs) }).domains['LI-D01'];
ok(dup.state === 'sem_dados_suficientes' && dup.reason_codes.includes('duplicate_result_unresolved') && dup.items.every(i => i.exclusion_reason === 'duplicate_result_unresolved') && dup.duplicates_unresolved.length === 1, 'duas coletas na mesma data com PCR: duplicate_result_unresolved; nenhuma escolhida por id/data de edicao');
const esc = L.calcular({ rule_package: pacote(), holoscan: HB, collections: dupCols, results: dupRs, classifications: classificar(dupRs), selected_result_ids: ['d2'] }).domains['LI-D01'];
ok(esc.state === 'divergente' && esc.laboratory_direction === N && esc.items.find(i => i.result_id === 'd1').exclusion_reason === 'not_selected_duplicate' && esc.snapshot.selected_result_ids.join() === 'd2', 'escolha explicita do result_id d2 resolve: direcao da PCR escolhida; o outro fica registrado como nao escolhido');
const amb2 = L.calcular({ rule_package: pacote(), holoscan: HB, collections: dupCols, results: dupRs, classifications: classificar(dupRs), selected_result_ids: ['d1', 'd2'] }).domains['LI-D01'];
ok(amb2.reason_codes.includes('duplicate_result_unresolved'), 'escolher os dois nao resolve (continua duplicate_result_unresolved)');

titulo('ESTADOS OFICIAIS, ORDEM, SNAPSHOT, NAO INTERFERENCIA, LEGADO');
const conv = calc([above('LAB-016')], HB);
ok(L.ESTADOS.join() === 'convergente,divergente,sem_dados_suficientes' && L.DIRECOES.join() === [P, N, I].join() && conv.estado_geral === 'convergente', 'apenas tres estados oficiais e tres direcoes internas');
const semSinal = d01([within('LAB-016')], holo({ acido_inflamatorio: 'alta' }));
ok(semSinal.state === 'convergente' && semSinal.holoscan_direction === N && /não foram identificados sinais de atenção coincidentes/.test(semSinal.text.paciente) && !/saud/i.test(semSinal.text.paciente), 'convergencia sem sinal (not/not): texto proprio ao paciente, sem afirmar saude');
const snap = conv.domains['LI-D01'].snapshot;
ok(['patient_id', 'domain_code', 'application_id', 'application_clinical_date', 'selected_collection_ids', 'collection_clinical_dates', 'selected_result_ids', 'items', 'references', 'excluded', 'temporal_rule_code', 'temporal_rule_version', 'holoscan_package', 'li_package', 'sufficiency_rule', 'mixed_rule', 'holoscan_direction', 'laboratory_direction', 'official_state', 'reason_codes'].every(k => k in snap) && snap.temporal_rule_code === 'LI-TEMP-01' && snap.temporal_rule_version === 1 && snap.items[0].value_original_text === '30' && snap.items[0].unit_original === 'u' && snap.collection_clinical_dates[0].temporal_delta_days === 0 && !('professional_note' in snap), 'snapshot congela paciente, dominio, aplicacao, coletas/datas/deltas, resultados, valores e unidades originais, classificacoes, referencias, excluidos, regras/versoes, direcoes, estado, motivos; observacao profissional fica fora');
ok(JSON.stringify(regra('convergence', 'global').payload.order) === JSON.stringify(['holoscan_source', 'package_version', 'temporal', 'links', 'selected_results', 'reference_unit_context', 'sufficiency', 'mixed', 'laboratory_direction', 'holoscan_direction', 'official_state']), 'ordem dos 11 passos declarada no pacote');
// nao interferencia: o resultado HOLOSCAN entra congelado e sai identico
const MM = globalThis.MotorMetodologico, PM = globalThis.PacoteMetodologico, DV = globalThis.MetodologiaDecisoesV1;
const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
const HC = PM.aplicarDecisoesV1(PM.importarInventario(inv, 'HOLOS-V1', 1), DV);
const resp = {}; HC.perguntas.forEach(q => { resp[q.stable_id] = 1; });
const antes = MM.calcular({ responses: resp, methodology_package: HC, mode: 'homologacao', engine_version: 't', questionnaire_edition: { code: HC.edicao.code, version: HC.edicao.version } });
const antesTxt = JSON.stringify({ s: antes.system_results, i: antes.index_result, t: antes.triad_result });
const liReal = L.calcular({ rule_package: pacote(), holoscan: { application: { id: 'a', clinical_date: '2026-03-10', methodology_package: { code: 'HOLOS-V1', version: 2, status: 'aprovado' } }, system_results: antes.system_results }, collections: [{ id: 'c1', clinical_date: '2026-03-10' }], results: [above('LAB-016'), above('LAB-002'), above('LAB-004'), above('LAB-005'), below('LAB-009'), above('LAB-013'), above('LAB-015')], classifications: classificar([above('LAB-016')]) });
const depois = MM.calcular({ responses: resp, methodology_package: HC, mode: 'homologacao', engine_version: 't', questionnaire_edition: { code: HC.edicao.code, version: HC.edicao.version } });
ok(JSON.stringify({ s: depois.system_results, i: depois.index_result, t: depois.triad_result }) === antesTxt && JSON.stringify(antes.system_results) === JSON.stringify(liReal.domains['LI-D01'].holoscan && antes.system_results), 'nao interferencia: nota, faixa, Indice e Triada identicos antes e depois da LI (fonte congelada)');
ok(liReal.domains['LI-D01'].holoscan.faixa === antes.system_results.acido_inflamatorio.faixa && liReal.domains['LI-D01'].holoscan_direction === (antes.system_results.acido_inflamatorio.faixa === 'baixa' ? P : antes.system_results.acido_inflamatorio.faixa === 'alta' ? N : I), 'faixa oficial do HOLOS-V1@2 (REF-03: todo z=1 -> 20/3 -> alta) vira a direcao pela regra 20/21-A');
const src = readFileSync(RAIZ + 'leitura-integrada-motor.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
ok(!/confrontar|lerExames|limiteBaixo|legacy_sistema|majority|maioria\(/.test(src) && !/holoscan_max_nota|max_days:\s*\d/.test(readFileSync(RAIZ + 'laboratorio.js', 'utf8')), 'nenhum confrontar() legado, legacy_sistema ou maioria no motor; nenhuma fixture/limite na UI');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
