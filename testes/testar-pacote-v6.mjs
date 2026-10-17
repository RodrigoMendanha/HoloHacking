/**
 * HOLOS-V1 v6 — FECHAMENTO DAS 61 (13/10/2026), base HOLOS-V1 v5.
 * Prova, sobre o v6 montado por PacoteMetodologico.aplicarRevisao(v5, MetodologiaRevisaoV6):
 *  - as 84 do inventario estao todas decididas (81 coletadas: 69 pontuaveis + 12 so contextuais; 3 removidas ao todo);
 *  - SNT-110 removida; SNT-404 -> Fungico; SNT-501/507 -> Metabolico; 10 so contextuais; as outras iguais a v5;
 *  - contextual nao altera nota, Indice, Triade, dominante, prioridade nem ferramenta;
 *  - bordas: 100%, exatamente 80%, abaixo de 80%, contextuais respondidas/ausentes, empate entre sistemas, empate na
 *    Triade, sistema com poucos itens, resposta invertida, respostas quase todas baixas / quase todas altas;
 *  - 5 casos contrastantes (A-E) com a 1a area esperada; sistema sem carga nao vira "area para aprofundar" no texto;
 *  - v5, v4 e v2 identicos; PP-V1 com as mesmas 30 regras; artefatos e comparativo em dia.
 */
import './guarda-falhas.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { construir } from '../scripts/pacote-v6.mjs';
import { construir as construirV5 } from '../scripts/pacote-v5.mjs';
import { calcular } from '../scripts/comparar-v2-v3.mjs';
import { CASOS, respostas } from '../scripts/comparar-v5-v6.mjs';
import { REGRAS } from './proximos-passos-catalogo-v1.mjs';
const RAIZ = new URL('..', import.meta.url).pathname;
await import(RAIZ + 'sistemas-fechamento.js');
await import(RAIZ + 'resultado-sintese.js');

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const P = globalThis.PacoteMetodologico, R = globalThis.MetodologiaRevisaoV6, SF = globalThis.SistemasFechamento, RS = globalThis.ResultadoSintese;
const MEE = 'mental_emocional_espiritual', SIS = ['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', MEE];
const { v2, v4, v5, v6 } = construir();
const copias = { v2: JSON.stringify(v2), v4: JSON.stringify(v4), v5: JSON.stringify(v5) };
const assoc = (p, id) => p.associacoes.filter(a => a.question_stable_id === id);
const sis = (p, id, papel) => assoc(p, id).filter(a => a.destination_type === 'system' && a.role === papel).map(a => a.destination_id + ':' + a.weight).join(',');
const tri = (p, id) => assoc(p, id).filter(a => a.destination_type === 'triad').map(a => a.destination_id).join(',');
const v6a = Object.assign(JSON.parse(JSON.stringify(v6)), { status: 'aprovado' });
const carga = (p, id, z) => p.perguntas.find(q => q.stable_id === id).orientation === 'invertida' ? 3 - z : z;
const uniforme = (p, z, mod) => { const r = {}; p.perguntas.forEach(x => { r[x.stable_id] = carga(p, x.stable_id, z); }); if (mod) mod(r); return r; };
const roda = (resp) => calcular(v6a, resp);
const prim = (s) => v6a.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === s).map(a => a.question_stable_id);
const CTX = ['SNT-104', 'SNT-105', 'SNT-109', 'SNT-206', 'SNT-305', 'SNT-306', 'SNT-308', 'SNT-408', 'SNT-409', 'SNT-410'];

console.log('\n  identidade e contagens\n');
ok(v6.code === 'HOLOS-V1' && v6.version === 6 && v6.status === 'em_revisao' && v6.lineage.parent_version === 5 && v6.lineage.revisao === 'HOLOS-V1-FECHAMENTO-61-2026-10-13',
  'HOLOS-V1 v6 em_revisao, linhagem da v5 e do fechamento das 61');
const porSist = {}; v6.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria').forEach(a => { porSist[a.destination_id] = (porSist[a.destination_id] || 0) + 1; });
ok(v6.perguntas.length === 81 && Object.values(porSist).reduce((a, b) => a + b, 0) === 69 && porSist.fungico === 8 && porSist.acido_inflamatorio === 8 && porSist.metabolico === 7 && porSist.detox_linfatico === 6 && porSist[MEE] === 40,
  '81 coletadas, 69 pontuáveis: Fúngico 8, Ácido Inflamatório 8, Metabólico 7, Detox 6, MEE 40 (' + JSON.stringify(porSist) + ')');
const soCtx = v6.perguntas.filter(q => sis(v6, q.stable_id, 'primaria') === '').map(q => q.stable_id).sort();
ok(soCtx.join(',') === [...CTX, 'ESP-501', 'ESP-502'].sort().join(','), '12 só contextuais: ' + soCtx.join(', '));
const regra = (p, t, a) => p.regras.find(r => r.rule_type === t && r.target === a);
ok(regra(v6, 'triad', 'fisico').payload.itens === 36 && regra(v6, 'triad', 'mental').payload.itens === 19 && regra(v6, 'triad', 'espiritual').payload.itens === 14, 'Tríade 36 / 19 / 14');
ok(JSON.stringify(regra(v6, 'absence', 'global').payload) === JSON.stringify(regra(v5, 'absence', 'global').payload) && JSON.stringify(regra(v6, 'index', 'global').payload) === JSON.stringify(regra(v5, 'index', 'global').payload),
  'cobertura mínima (80%) e regra do Índice iguais às da v5');
ok(v6.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria').every(a => a.weight === 1), 'nenhum peso novo: todas as primárias com peso 1');
const decididas = new Set([...Object.keys(R.remover), ...Object.keys(R.mover), ...Object.keys(R.contextualizar), ...Object.keys(R.manter)]);
ok(decididas.size === 61 && [...decididas].every(id => v5.perguntas.some(q => q.stable_id === id)), 'as 61 abertas têm uma decisão registrada (1 REMOVER, 3 MOVER, 10 CONTEXTUAL, 47 MANTER)');
ok(Object.keys(R.remover).length === 1 && Object.keys(R.mover).length === 3 && Object.keys(R.contextualizar).length === 10 && Object.keys(R.manter).length === 47, 'contagem das decisões: 1 / 3 / 10 / 47');

console.log('\n  as decisoes\n');
ok(!v6.perguntas.some(q => q.stable_id === 'SNT-110') && assoc(v6, 'SNT-110').length === 0 && v5.perguntas.some(q => q.stable_id === 'SNT-110'), 'SNT-110 removida da v6 (continua na v5, no histórico)');
[['SNT-404', 'detox_linfatico', 'fungico'], ['SNT-501', MEE, 'metabolico'], ['SNT-507', MEE, 'metabolico']].forEach(([id, de, para]) => {
  const a = assoc(v6, id).find(x => x.destination_type === 'system' && x.role === 'primaria');
  ok(sis(v5, id, 'primaria') === de + ':1' && sis(v6, id, 'primaria') === para + ':1' && sis(v6, id, 'secondary_contextual') === '' && tri(v6, id) === 'fisico' && a.conflict_note.endsWith(R.mover[id].motivo),
    id + ': ' + de + ' → ' + para + ', peso 1, Tríade Corpo, sem contextual redundante, justificativa registrada');
});
CTX.forEach(id => {
  const de = R.contextualizar[id].de, c = assoc(v6, id).find(x => x.role === 'secondary_contextual');
  ok(sis(v5, id, 'primaria') === de + ':1' && sis(v6, id, 'primaria') === '' && sis(v6, id, 'secondary_contextual') === de + ':null' && tri(v6, id) === '' && c.conflict_note.endsWith(R.contextualizar[id].motivo),
    id + ': coletada, só contexto em ' + de + ' (sem peso, fora da Tríade)');
});
const tocadas = new Set(['SNT-110', 'SNT-404', 'SNT-501', 'SNT-507', ...CTX]);
const sem = (p, id) => JSON.stringify(assoc(p, id).map(a => [a.destination_type, a.destination_id, a.role, a.weight]));
ok(v6.perguntas.filter(q => !tocadas.has(q.stable_id)).every(q => sem(v5, q.stable_id) === sem(v6, q.stable_id)), 'as outras 67 perguntas: associações idênticas às da v5 (MANTER)');
ok(v6.perguntas.every(q => JSON.stringify(Object.assign({}, q, { notes: 0, position: 0 })) === JSON.stringify(Object.assign({}, v5.perguntas.find(x => x.stable_id === q.stable_id), { notes: 0, position: 0 }))),
  'textos, escalas e orientações iguais aos da v5');
ok(['SNT-101', 'EMO-502', 'EMO-504', 'ESP-303', 'ESP-501', 'ESP-502'].every(id => sem(v5, id) === sem(v6, id)), 'decisões anteriores preservadas (SNT-101, EMO-502/504, ESP-303, ESP-501/502)');

console.log('\n  textos oficiais dos sistemas (correcao final de coerencia)\n');
const pt = (p, c) => p.sistemas.find(x => x.code === c).public_text;
ok(!/laborat|exame|marcador/i.test(pt(v6, 'metabolico')) && /laborat/i.test(pt(v5, 'metabolico'))
  && pt(v6, 'metabolico') === 'O Sistema Metabólico organiza relatos relacionados a energia, fome, saciedade, comportamento alimentar, refeições, resposta percebida à alimentação e rotina. Esse eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas.',
  'Metabólico: texto oficial sem exames/achados laboratoriais (a v5 continua com o texto antigo)');
ok(['fungico', 'acido_inflamatorio', 'detox_linfatico', MEE].every(c => !/\bpele\b|composi|laborat/i.test(pt(v6, c))), 'Fúngico, Ácido, Detox e MEE: o texto oficial não descreve como pontuável o que hoje é só contexto (pele, composição corporal, exames)');
ok(JSON.stringify(v6.sistemas.map(x => Object.assign({}, x, { public_text: 0, source: 0 }))) === JSON.stringify(v5.sistemas.map(x => Object.assign({}, x, { public_text: 0, source: 0 }))) && pt(v6, MEE) === pt(v5, MEE),
  'só o texto oficial muda nos sistemas (nome, cor, posição iguais); MEE sem mudança');
ok(JSON.stringify(v6.faixas) === JSON.stringify(v5.faixas), 'faixas e mensagens por faixa iguais às da v5');

console.log('\n  contextual nao pontua\n');
const baixo = roda(uniforme(v6a, 1, r => CTX.forEach(id => { r[id] = carga(v6a, id, 0); }))), alto = roda(uniforme(v6a, 1, r => CTX.forEach(id => { r[id] = carga(v6a, id, 3); })));
ok(SIS.every(s => baixo.r.system_results[s].nota === alto.r.system_results[s].nota) && baixo.r.index_result.valor === alto.r.index_result.valor && ['fisico', 'mental', 'espiritual'].every(k => baixo.r.triad_result[k].nota === alto.r.triad_result[k].nota),
  'as 10 novas contextuais (0 ou 3): nenhuma nota, Índice ou Tríade muda');
ok(SIS.every(s => !alto.dominantes[s].some(d => CTX.includes(d.id))) && JSON.stringify(baixo.ordem) === JSON.stringify(alto.ordem) && JSON.stringify(baixo.pp) === JSON.stringify(alto.pp), 'nunca são dominantes; prioridade e PP-V1 iguais');
const ausentes = roda(uniforme(v6a, 1, r => [...CTX, 'ESP-501', 'ESP-502'].forEach(id => { delete r[id]; })));
ok(SIS.every(s => ausentes.r.system_results[s].nota === baixo.r.system_results[s].nota && ausentes.r.system_results[s].avaliavel) && ausentes.r.index_result.avaliavel, 'contextuais em branco: nenhuma cobertura cai, notas iguais');
const ctx2 = roda(uniforme(v6a, 2)).r.contextual_associations.map(c => c.question_id).sort();
ok(ctx2.length === 15 && CTX.every(id => ctx2.includes(id)) && !ctx2.includes('SNT-501'), 'o motor devolve as 15 associações contextuais à parte (SNT-501 já não é contextual): ' + ctx2.join(','));

console.log('\n  bordas\n');
const cheio = roda(uniforme(v6a, 2));
ok(SIS.every(s => cheio.r.system_results[s].avaliavel && cheio.r.system_results[s].respondidos === cheio.r.system_results[s].total) && cheio.r.index_result.avaliavel, '100% respondido: os cinco avaliáveis, com Índice');
const tiraMEE = (n) => roda(uniforme(v6a, 2, r => prim(MEE).slice(0, n).forEach(id => { delete r[id]; })));
ok(tiraMEE(8).r.system_results[MEE].avaliavel && tiraMEE(8).r.index_result.avaliavel && !tiraMEE(9).r.system_results[MEE].avaliavel && !tiraMEE(9).r.index_result.avaliavel,
  'MEE 32/40 (exatamente 80%) avaliável; 31/40 (77,5%) sem nota e sem Índice');
const tiraDTX = (n) => roda(uniforme(v6a, 2, r => prim('detox_linfatico').slice(0, n).forEach(id => { delete r[id]; })));
ok(tiraDTX(1).r.system_results.detox_linfatico.avaliavel && !tiraDTX(2).r.system_results.detox_linfatico.avaliavel && tiraDTX(2).ordem.indexOf('detox_linfatico') < 0,
  'Detox (6 itens, o menor): 5/6 (83%) avaliável; 4/6 (67%) sem nota e fora da ordem');
const tiraMET = (n) => roda(uniforme(v6a, 2, r => prim('metabolico').slice(0, n).forEach(id => { delete r[id]; })));
ok(tiraMET(1).r.system_results.metabolico.avaliavel && !tiraMET(2).r.system_results.metabolico.avaliavel, 'Metabólico (7 itens): 6/7 avaliável; 5/7 não');
const inv0 = roda(uniforme(v6a, 0, r => { r['SNT-507'] = 0; })), inv3 = roda(uniforme(v6a, 0, r => { r['SNT-507'] = 3; }));
ok(v6a.perguntas.find(q => q.stable_id === 'SNT-507').orientation === 'invertida' && inv0.r.system_results.metabolico.nota < 10 && inv3.r.system_results.metabolico.nota === 10 && inv0.dominantes.metabolico[0].id === 'SNT-507',
  'invertida (SNT-507 no Metabólico): "nunca percebe fome/saciedade" pontua; "sempre percebe" não; vira dominante');
const emp = roda(uniforme(v6a, 2));
ok(SIS.every(s => emp.r.system_results[s].nota === emp.r.system_results.fungico.nota) && emp.ordem.join(',') === SIS.join(',') && JSON.stringify(roda(uniforme(v6a, 2)).pp) === JSON.stringify(emp.pp),
  'empate entre os 5 sistemas: ordem oficial do pacote, PP-V1 determinístico (' + emp.pp.join(' · ') + ')');
ok(['fisico', 'mental', 'espiritual'].every(k => emp.r.triad_result[k].nota === emp.r.triad_result.fisico.nota), 'empate na Tríade com carga uniforme');
const quaseBaixo = roda(uniforme(v6a, 0, r => { r['SNT-102'] = 1; })), quaseAlto = roda(uniforme(v6a, 3, r => { r['SNT-102'] = carga(v6a, 'SNT-102', 2); }));
ok(quaseBaixo.ordem[0] === 'fungico' && quaseBaixo.r.system_results.fungico.nota > 9 && SIS.filter(s => s !== 'fungico').every(s => quaseBaixo.r.system_results[s].nota === 10), 'quase tudo baixo: só o Fúngico com carga (1ª área), os outros 10,0');
ok(SIS.every(s => quaseAlto.r.system_results[s].nota <= 0.5) && quaseAlto.r.index_result.valor < 5, 'quase tudo alto: todas as notas perto de 0 e Índice perto de 0');

console.log('\n  5 casos (faz sentido humano?)\n');
const ESPERADO = { A: 'fungico', B: 'acido_inflamatorio', C: 'metabolico', D: 'detox_linfatico', E: MEE };
CASOS.forEach(c => {
  const r = roda(respostas(v6a, c.tema));
  const naoPontuam = c.tema.filter(id => sis(v6a, id, 'primaria') === '');
  ok(r.ordem[0] === ESPERADO[c.id] && SIS.every(s => !r.dominantes[s].some(d => naoPontuam.includes(d.id))),
    'caso ' + c.id + ' (' + c.nome + '): 1ª área ' + r.ordem[0] + '; contextuais do tema (' + (naoPontuam.join(', ') || 'nenhuma') + ') não pontuam');
});

console.log('\n  sistema sem carga nao vira "area para aprofundar"\n');
const rE = roda(respostas(v6a, CASOS[4].tema));
const snap = { template_version: 4, holoscan: { quando: '2026-10-13', sistemas: rE.sistemas.map(s => ({ sistema: s.sistema, nome: s.nome, nota: s.nota, avaliavel: s.avaliavel, faixa: s.nota < 4 ? 'baixa' : s.nota < 7 ? 'intermediaria' : 'alta',
  respondidos: s.respondidos, total_marcadores: s.total_marcadores, dominantes: s.dominantes.map(d => ({ question_id: d.marcador_id, enunciado: d.marcador_id })) })) } };
const f = RS.fatos(snap);
const fp = RS.frasesPaciente(f).join(' '), fr = RS.frases(f).map(x => x.texto).join(' ');
ok(f.investigar[1].sem_carga && !/Fúngico/.test(fp) && /Mental Emocional Espiritual/.test(fp), 'paciente (caso E): só o MEE aparece para aprofundar; o Fúngico (10,0, nenhum item) não');
ok(/2ª área \(Fúngico, nota 10\): sem carga nesta aplicação/.test(fr), 'profissional: a 2ª área é dita "sem carga", só pela ordem de desempate');
const cards = SF.deResultado(snap);
ok(cards.find(x => x.sistema === MEE).resultado.prioridade === '1ª área para aprofundar' && cards.find(x => x.sistema === 'fungico').resultado.prioridade === null && cards.find(x => x.sistema === 'fungico').aprofundamento === SF.NAO_PRIORITARIO,
  'cartão do Fúngico sem selo de prioridade e sem "concentrou mais marcadores"');

console.log('\n  historico e PP-V1\n');
const b = construir(), b5 = construirV5();
ok(JSON.stringify(b.v2) === copias.v2 && v2.content_hash === '3593d782f1cd3a35b05ecae36836ab71746064cc99960853705dd3e2ac3f24c4', 'v2 intacto (hash 3593d782…)');
ok(JSON.stringify(b.v4) === copias.v4 && v4.content_hash === '7e7d02e8813d71e95309e41f2b7b1c588e673a0c298e3d865b60ee92ee5ab98a', 'v4 intacta (hash 7e7d02e8…)');
ok(JSON.stringify(b.v5) === copias.v5 && v5.content_hash === b5.v5.content_hash && v5.content_hash === '6523b8e7e914d70a5869bf52744b47d7f14ceb7fbc62e494623de87c3498e425', 'v5 intacta e reproduzível (hash JS 6523b8e7…)');
ok(REGRAS.length === 30 && createHash('sha256').update(JSON.stringify(REGRAS)).digest('hex') === 'b9bbebe8af43b5498714b1e33c7485af83a90e42c0b700f1f921a0af1fe28216', 'PP-V1 com as mesmas 30 regras (sha256 b9bbebe8…)');
ok(SF.PP_POR_QUE === 'A ferramenta é sugerida pelo catálogo para aprofundar este sistema.', 'texto do PP-V1: "A ferramenta é sugerida pelo catálogo para aprofundar este sistema."');

console.log('\n  validador e recusas\n');
const val = P.validar(v6);
ok(val.publicavel && val.total_erros === 0, 'validador: 0 erros' + (val.total_erros ? ': ' + JSON.stringify(val.erros.slice(0, 3)) : ''));
ok(P.aplicarRevisao(JSON.parse(copias.v5), R).content_hash === v6.content_hash, 'determinístico: mesma v5 + mesmas decisões = mesmo hash (' + v6.content_hash.slice(0, 8) + '…)');
const recusa = (mod, re) => { const R2 = JSON.parse(JSON.stringify(R)); mod(R2); try { P.aplicarRevisao(JSON.parse(copias.v5), R2); return false; } catch (e) { return re.test(e.message); } };
ok(recusa(r => { r.base.version = 4; }, /revisao e do HOLOS-V1 v4/), 'revisão para outra versão: recusada');
ok(recusa(r => { r.esperado.por_sistema.detox_linfatico = 7; }, /detox_linfatico: 6 \(esperado 7\)/), 'contagem por sistema diferente do esperado: recusada');
ok(recusa(r => { delete r.remover_contextuais; }, /.+/), 'mover SNT-501 sem tirar o contextual redundante: recusado');
ok(recusa(r => { r.textos_sistemas.metabolico = pt(v5, 'metabolico'); }, /metabolico: texto oficial novo vazio ou igual/) && recusa(r => { r.textos_sistemas.inexistente = 'x'; }, /sistema inexistente nao existe/), 'texto oficial de sistema igual ao atual ou de sistema inexistente: recusado');

console.log('\n  artefatos\n');
const chk = (s) => { try { return execFileSync('node', [RAIZ + 'scripts/' + s, '--check'], { encoding: 'utf8' }); } catch (e) { return ''; } };
ok(/em dia/.test(chk('pacote-v6.mjs')), 'pacote-metodologico-v6.json e supabase/tests/pacote-v6-doc.sql em dia');
ok(/em dia/.test(chk('comparar-v5-v6.mjs')), 'COMPARATIVO-HOLOSCAN-V5-V6.md em dia');
ok(/em dia/.test(chk('pacote-v5.mjs')) && /em dia/.test(chk('comparar-v4-v5.mjs')) && /em dia/.test(chk('pacote-v3.mjs')), 'artefatos da v5 e da v4 inalterados');

console.log(falhou ? '\nFALHOU' : '\npacote v6: tudo ok');
process.exit(falhou ? 1 : 0);
