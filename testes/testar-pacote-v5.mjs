/**
 * HOLOS-V1 v5 — LOTE 2B (13/10/2026), base HOLOS-V1 v4.
 * Prova, sobre o v5 montado por PacoteMetodologico.aplicarRevisao(v4, MetodologiaRevisaoV5):
 *  - ESP-101/103/203/404/405 so pontuam o MEE; ESP-303 continua no Metabolico;
 *  - ESP-501 e ESP-502 so contextuais (coletadas; sem score, sem denominador, sem Triade, sem dominante, sem ferramenta);
 *  - EMO-502 e EMO-504 continuam so contextuais no Metabolico;
 *  - contextual nao altera score, nao entra em dominantes, nao escolhe ferramenta;
 *  - v4 e v2 historicos identicos; PP-V1 com as mesmas 30 regras; validador e contrato "pergunta so contextual";
 *  - artefatos e comparativo em dia.
 */
import './guarda-falhas.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { construir } from '../scripts/pacote-v5.mjs';
import { calcular } from '../scripts/comparar-v2-v3.mjs';
import { REGRAS } from './proximos-passos-catalogo-v1.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, R = globalThis.MetodologiaRevisaoV5;
const MEE = 'mental_emocional_espiritual', FISICOS = ['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico'], SIS = [...FISICOS, MEE];
const MOVIDAS = { 'ESP-101': 'metabolico', 'ESP-103': 'metabolico', 'ESP-203': 'acido_inflamatorio', 'ESP-404': 'acido_inflamatorio', 'ESP-405': 'detox_linfatico' };
const { v2, v4, v5 } = construir();
const copiaV2 = JSON.stringify(v2), copiaV4 = JSON.stringify(v4);
const assoc = (p, id) => p.associacoes.filter(a => a.question_stable_id === id);
const sis = (p, id, papel) => assoc(p, id).filter(a => a.destination_type === 'system' && a.role === papel).map(a => a.destination_id + ':' + a.weight).join(',');
const tri = (p, id) => assoc(p, id).filter(a => a.destination_type === 'triad').map(a => a.destination_id).join(',');
const uniforme = (p, z, mod) => { const r = {}; p.perguntas.forEach(x => { r[x.stable_id] = x.orientation === 'invertida' ? 3 - z : z; }); if (mod) mod(r); return r; };
const inv = (p, id, z) => p.perguntas.find(q => q.stable_id === id).orientation === 'invertida' ? 3 - z : z;   // valor que produz carga z
const v5a = Object.assign(JSON.parse(JSON.stringify(v5)), { status: 'aprovado' });
const roda = (p, resp) => calcular(p, resp);

console.log('\n  identidade e contagens\n');
ok(v5.code === 'HOLOS-V1' && v5.version === 5 && v5.status === 'em_revisao' && v5.lineage.parent_version === 4 && v5.lineage.revisao === 'HOLOS-V1-LOTE-2B-2026-10-13',
  'HOLOS-V1 v5 em_revisao, linhagem da v4 e do Lote 2B');
const porSist = {}; v5.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria').forEach(a => { porSist[a.destination_id] = (porSist[a.destination_id] || 0) + 1; });
ok(v5.perguntas.length === 82 && Object.values(porSist).reduce((a, b) => a + b, 0) === 80 && porSist.fungico === 11 && porSist.acido_inflamatorio === 9 && porSist.metabolico === 8 && porSist.detox_linfatico === 10 && porSist[MEE] === 42,
  '82 perguntas coletadas, 80 pontuáveis: Fúngico 11, Ácido Inflamatório 9, Metabólico 8, Detox 10, MEE 42 (' + JSON.stringify(porSist) + ')');
const regra = (p, t, a) => p.regras.find(r => r.rule_type === t && r.target === a);
ok(regra(v5, 'triad', 'fisico').payload.itens === 47 && regra(v5, 'triad', 'mental').payload.itens === 19 && regra(v5, 'triad', 'espiritual').payload.itens === 14,
  'Tríade 47 / 19 / 14 (ESP-501 e ESP-502 saem do Espírito)');
ok(JSON.stringify(regra(v5, 'absence', 'global').payload) === JSON.stringify(regra(v4, 'absence', 'global').payload) && JSON.stringify(regra(v5, 'index', 'global').payload) === JSON.stringify(regra(v4, 'index', 'global').payload),
  'cobertura mínima (80%) e regra do Índice iguais às da v4');
ok(R.regra_metodologica.some(t => /bloco de origem da pergunta não define automaticamente o sistema/.test(t)) && R.regra_metodologica.some(t => /contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade/.test(t)) && /Regra metodologica:/.test(v5.notes),
  'regras registradas: conteúdo da pergunta > bloco de origem; contextual não pontua e não implica causalidade');

console.log('\n  as 8 decisoes\n');
Object.entries(MOVIDAS).forEach(([id, de]) => {
  const a = assoc(v5, id).find(x => x.destination_type === 'system' && x.role === 'primaria');
  ok(sis(v4, id, 'primaria') === de + ':1' && sis(v5, id, 'primaria') === MEE + ':1' && sis(v5, id, 'secondary_contextual') === '' && tri(v5, id) === 'espiritual' && a.conflict_note.endsWith(R.mover[id].motivo),
    id + ' só pontua o MEE (antes ' + de + '); peso 1 preservado; sem contexto físico; justificativa registrada');
});
ok(sis(v5, 'ESP-303', 'primaria') === 'metabolico:1' && sis(v5, 'ESP-303', 'primaria') === sis(v4, 'ESP-303', 'primaria') && tri(v5, 'ESP-303') === 'espiritual', 'ESP-303 continua pontuando o Metabólico (conteúdo alimentar), peso 1');
[['ESP-501', 'fungico'], ['ESP-502', 'detox_linfatico']].forEach(([id, de]) => {
  const c = assoc(v5, id).find(x => x.role === 'secondary_contextual');
  ok(v5.perguntas.some(q => q.stable_id === id) && sis(v5, id, 'primaria') === '' && sis(v5, id, 'secondary_contextual') === de + ':null' && tri(v5, id) === '' && c.conflict_note.endsWith(R.contextualizar[id].motivo),
    id + ': continua coletada, sem primária (não pontua ' + de + '), só contextual sem peso, fora da Tríade, sem outro sistema pontuável');
});
['EMO-502', 'EMO-504'].forEach(id => ok(sis(v5, id, 'secondary_contextual') === 'metabolico:null' && sis(v5, id, 'primaria') === MEE + ':1' && JSON.stringify(assoc(v5, id).map(a => a.destination_id + a.role)) === JSON.stringify(assoc(v4, id).map(a => a.destination_id + a.role)),
  id + ': continua só contextual no Metabólico (sem pontuação metabólica), igual à v4'));
const tocadas = new Set([...Object.keys(MOVIDAS), 'ESP-501', 'ESP-502']);
const sem = (p, id) => JSON.stringify(assoc(p, id).map(a => [a.destination_type, a.destination_id, a.role, a.weight]));
ok(v4.perguntas.filter(q => !tocadas.has(q.stable_id)).every(q => sem(v4, q.stable_id) === sem(v5, q.stable_id)), 'as outras 74 perguntas: associações idênticas às da v4');
ok(v4.perguntas.every(q => JSON.stringify(Object.assign({}, q, { notes: 0, position: 0 })) === JSON.stringify(Object.assign({}, v5.perguntas.find(x => x.stable_id === q.stable_id), { notes: 0, position: 0 }))),
  'textos, escalas e orientações das 82 perguntas iguais aos da v4');

console.log('\n  contextual nao altera score, dominante nem ferramenta\n');
[['ESP-501', 'fungico'], ['ESP-502', 'detox_linfatico']].forEach(([id]) => {
  const baixo = roda(v5a, uniforme(v5a, 1, r => { r[id] = inv(v5a, id, 0); })), alto = roda(v5a, uniforme(v5a, 1, r => { r[id] = inv(v5a, id, 3); }));
  const igual = SIS.every(s => baixo.r.system_results[s].nota === alto.r.system_results[s].nota) && baixo.r.index_result.valor === alto.r.index_result.valor
    && ['fisico', 'mental', 'espiritual'].every(k => baixo.r.triad_result[k].nota === alto.r.triad_result[k].nota);
  ok(igual, id + ' (0 ou 3): nenhuma nota, Índice ou Tríade muda');
  ok(SIS.every(s => !alto.dominantes[s].some(d => d.id === id)) && JSON.stringify(baixo.ordem) === JSON.stringify(alto.ordem) && JSON.stringify(baixo.pp) === JSON.stringify(alto.pp),
    id + ': nunca é sinal dominante; prioridade e ferramentas do PP-V1 iguais');
  ok(SIS.every(s => alto.r.system_results[s].total === v5a.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === s).length) && !Object.values(alto.r.system_results).some(x => (x.itens_pontuados || []).includes(id)),
    id + ': não entra em nenhum denominador nem em itens pontuados');
});
['EMO-502', 'EMO-504'].forEach(id => {
  const a = roda(v5a, uniforme(v5a, 0, r => { r[id] = 0; })), b = roda(v5a, uniforme(v5a, 0, r => { r[id] = 3; }));
  ok(a.r.system_results.metabolico.nota === b.r.system_results.metabolico.nota && !b.dominantes.metabolico.some(d => d.id === id) && b.r.system_results[MEE].nota < a.r.system_results[MEE].nota,
    id + ': resposta máxima não mexe no Metabólico (só no MEE, onde é primária) e não é dominante do Metabólico');
});
const ctx = roda(v5a, uniforme(v5a, 2)).r.contextual_associations.map(c => c.question_id + '>' + c.destination).sort().join(',');
ok(ctx === 'EMO-502>metabolico,EMO-504>metabolico,ESP-501>fungico,ESP-502>detox_linfatico,SNT-101>metabolico,SNT-501>metabolico', 'o motor devolve as 6 contextuais à parte, sem contribuição (' + ctx + ')');

console.log('\n  movidas so mexem no MEE\n');
const base1 = roda(v5a, uniforme(v5a, 1)), alto5 = roda(v5a, uniforme(v5a, 1, r => Object.keys(MOVIDAS).forEach(id => { r[id] = inv(v5a, id, 3); })));
ok(FISICOS.every(s => base1.r.system_results[s].nota === alto5.r.system_results[s].nota) && alto5.r.system_results[MEE].nota < base1.r.system_results[MEE].nota,
  'as 5 ESP movidas no máximo: os 4 sistemas físicos não mudam; só o MEE cai');
ok(FISICOS.every(s => !alto5.dominantes[s].some(d => d.id in MOVIDAS)) && alto5.dominantes[MEE].every(d => d.id in MOVIDAS), 'dominantes: as movidas aparecem só no MEE');

console.log('\n  cobertura e Indice com os denominadores novos\n');
const fun = v5a.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === 'fungico').map(a => a.question_stable_id);
const tira = (n) => roda(v5a, uniforme(v5a, 2, r => fun.slice(0, n).forEach(id => { delete r[id]; })));
const t2 = tira(2), t3 = tira(3);
ok(t2.r.system_results.fungico.total === 11 && t2.r.system_results.fungico.avaliavel && !t3.r.system_results.fungico.avaliavel && t2.r.index_result.avaliavel && !t3.r.index_result.avaliavel,
  'Fúngico sobre 11: 9/11 (82%) avaliável e com Índice; 8/11 (73%) sem Índice');
const semCtx = roda(v5a, uniforme(v5a, 2, r => { delete r['ESP-501']; delete r['ESP-502']; }));
ok(SIS.every(s => semCtx.r.system_results[s].avaliavel) && semCtx.r.index_result.avaliavel, 'deixar ESP-501 e ESP-502 em branco não tira cobertura de nenhum sistema');

console.log('\n  historico e PP-V1\n');
const { v2: v2b, v4: v4b } = construir();
ok(JSON.stringify(v2b) === copiaV2 && v2.content_hash === '3593d782f1cd3a35b05ecae36836ab71746064cc99960853705dd3e2ac3f24c4', 'v2 intacto (hash 3593d782…)');
ok(JSON.stringify(v4b) === copiaV4 && v4.content_hash === '7e7d02e8813d71e95309e41f2b7b1c588e673a0c298e3d865b60ee92ee5ab98a' && JSON.stringify(v4) === copiaV4, 'v4 byte a byte igual (hash JS 7e7d02e8…) — montar a v5 não toca na v4');
ok(REGRAS.length === 30 && createHash('sha256').update(JSON.stringify(REGRAS)).digest('hex') === 'b9bbebe8af43b5498714b1e33c7485af83a90e42c0b700f1f921a0af1fe28216', 'PP-V1 com as mesmas 30 regras (sha256 b9bbebe8…)');

console.log('\n  contrato "pergunta so contextual" e recusas\n');
const val = P.validar(v5);
ok(val.publicavel && val.total_erros === 0, 'validador: 0 erros (REF-01/02/03 conferidos pelo motor)' + (val.total_erros ? ': ' + JSON.stringify(val.erros.slice(0, 3)) : ''));
const comTri = JSON.parse(JSON.stringify(v5)); comTri.associacoes.push({ question_stable_id: 'ESP-501', destination_type: 'triad', destination_id: 'espiritual', role: 'triade_por_bloco', weight: 1, status: 'aprovado' });
ok(P.validar(comTri).erros.some(e => e.codigo === 'primaria_ausente' && e.onde === 'ESP-501'), 'pergunta sem primária mas com Tríade: recusada (só contextual não pontua na Tríade)');
const orfa = JSON.parse(JSON.stringify(v5)); orfa.associacoes = orfa.associacoes.filter(a => a.question_stable_id !== 'ESP-502' || a.destination_type !== 'system');
ok(P.validar(orfa).erros.some(e => e.codigo === 'associacao_orfa' && e.onde === 'ESP-502'), 'pergunta sem nenhuma associação a sistema: continua recusada');
ok(P.validar(v4).total_erros === 0 && P.validar(v2).total_erros === 0, 'v4 e v2 continuam válidas no contrato novo');
ok(P.aplicarRevisao(JSON.parse(copiaV4), R).content_hash === v5.content_hash, 'determinístico: mesma v4 + mesmas decisões = mesmo hash (' + v5.content_hash.slice(0, 8) + '…)');
const recusa = (mod, re) => { const R2 = JSON.parse(JSON.stringify(R)); mod(R2); try { P.aplicarRevisao(JSON.parse(copiaV4), R2); return false; } catch (e) { return re.test(e.message); } };
ok(recusa(r => { r.base.version = 3; }, /revisao e do HOLOS-V1 v3/), 'revisão para outra versão: recusada');
ok(recusa(r => { r.contextualizar['ESP-501'].de = 'metabolico'; }, /ESP-501: primario atual nao e metabolico/), 'contextualização com sistema de origem errado: recusada');
ok(recusa(r => { delete r.contextualizar['ESP-502'].motivo; }, /contextualizacao sem justificativa/), 'contextualização sem justificativa: recusada');
ok(recusa(r => { r.esperado.triade.espiritual = 16; }, /triade espiritual: 14 \(esperado 16\)/), 'Tríade diferente do esperado: recusada');
ok(recusa(r => { r.esperado.so_contextuais = ['ESP-501']; }, /so contextuais ESP-501,ESP-502/), 'lista de só contextuais diferente do esperado: recusada');

console.log('\n  artefatos\n');
const chk = (s) => { try { return execFileSync('node', [new URL('../scripts/' + s, import.meta.url).pathname, '--check'], { encoding: 'utf8' }); } catch (e) { return ''; } };
ok(/em dia/.test(chk('pacote-v5.mjs')), 'pacote-metodologico-v5.json e supabase/tests/pacote-v5-doc.sql em dia');
ok(/em dia/.test(chk('comparar-v4-v5.mjs')), 'COMPARATIVO-HOLOSCAN-V4-V5.md em dia');
ok(/em dia/.test(chk('pacote-v3.mjs')) && /em dia/.test(chk('comparar-v2-v3.mjs')), 'artefatos da v4 inalterados');

console.log(falhou ? '\nFALHOU' : '\npacote v5: tudo ok');
process.exit(falhou ? 1 : 0);
