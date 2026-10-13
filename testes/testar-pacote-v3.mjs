/**
 * HOLOS-V1 v3 — DECISOES METODOLOGICAS DE 13/10/2026 (base: HOLOS-V1 v2 ativo)
 *
 * Prova, sobre o v3 montado por PacoteMetodologico.aplicarRevisao(v2, MetodologiaRevisaoV3):
 *  - so as decisoes de 13/10: SNT-210 e SNT-309 removidas; 13 EMO com o primario no Sistema Mental Emocional
 *    Espiritual; contextuais antigas retiradas; NADA do rascunho de 12/10 (textos, trocas, ESP-404...)
 *  - testes obrigatorios 1-23 da tarefa (24 e 25 ficam em testar-questionario-v3.mjs, pela tela e servidor falso)
 *  - validador limpo, deterministico, revisao que nao bate e recusada, artefatos e comparativo em dia
 */
import './guarda-falhas.mjs';
import '../metodologia-pacote.js';
import '../metodologia-motor.js';
import '../metodologia-revisao-v3.js';
import { candidatoV1 } from './holos-aprovado.mjs';
import { REGRAS } from './proximos-passos-catalogo-v1.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

globalThis.window = globalThis;
await import('../utils.js');
await import('../proximos-passos.js');

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, R = globalThis.MetodologiaRevisaoV3, PP = globalThis.ProximosPassos;
const MEE = 'mental_emocional_espiritual', FISICOS = ['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico'];
const MOVIDAS = ['EMO-101', 'EMO-102', 'EMO-103', 'EMO-201', 'EMO-202', 'EMO-203', 'EMO-204', 'EMO-301', 'EMO-302', 'EMO-303', 'EMO-401', 'EMO-402', 'EMO-403'];
const DE = { 'EMO-1': 'fungico', 'EMO-2': 'acido_inflamatorio', 'EMO-3': 'metabolico', 'EMO-4': 'detox_linfatico' };
const JUST = {
  'EMO-101': 'Procrastinação, prontidão e autorregulação comportamental.', 'EMO-102': 'Organização pessoal e comportamento.',
  'EMO-103': 'Prontidão, dificuldade percebida para iniciar mudança e autorregulação.', 'EMO-201': 'Irritabilidade e regulação emocional.',
  'EMO-202': 'Intensidade e duração percebida da raiva.', 'EMO-203': 'Limites, comportamento interpessoal e evitação de conflito.',
  'EMO-204': 'Expressão emocional e comportamento interpessoal.', 'EMO-301': 'Relação entre estado emocional e alimentação.',
  'EMO-302': 'Consciência, atenção ao comportamento e funcionamento em piloto automático.',
  'EMO-303': 'Uso da comida como recompensa e comportamento alimentar associado ao estado emocional.', 'EMO-401': 'Ruminação emocional.',
  'EMO-402': 'Expressão e regulação emocional.', 'EMO-403': 'Apoio, vínculo e capacidade de receber cuidado.'
};

const v2 = candidatoV1(); v2.status = 'aprovado';
const copiaV2 = JSON.stringify(v2);
const v3 = P.aplicarRevisao(v2, R);
const q2 = (id) => v2.perguntas.find(x => x.stable_id === id), q3 = (id) => v3.perguntas.find(x => x.stable_id === id);
const assoc = (p, id) => p.associacoes.filter(a => a.question_stable_id === id);
const prim = (p, id) => assoc(p, id).filter(a => a.destination_type === 'system' && a.role === 'primaria').map(a => a.destination_id + ':' + a.weight).join(',');
const tri = (p, id) => assoc(p, id).filter(a => a.destination_type === 'triad').map(a => a.destination_id + ':' + a.weight).join(',');
const ctx = (p, id) => assoc(p, id).filter(a => a.destination_type === 'system' && a.role === 'secondary_contextual').map(a => a.destination_id).sort().join(',');
const calc = (p, responses) => M.calcular({ responses, methodology_package: p, mode: 'homologacao', engine_version: 'teste-v3', questionnaire_edition: { code: p.edicao.code, version: p.edicao.version } });
const uniforme = (p, z, mod) => { const r = {}; p.perguntas.forEach(x => { r[x.stable_id] = x.orientation === 'invertida' ? 3 - z : z; }); if (mod) mod(r); return r; };
/* sinais dominantes: mesma regra da SQL resultado_holos_dominantes (MR-V1) */
const dominantes = (p, resp, sis) => {
  const q = Object.fromEntries(p.perguntas.map(x => [x.stable_id, x])), esc = Object.fromEntries(p.escalas.map(e => [e.code, e]));
  return p.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === sis && a.weight != null && resp[a.question_stable_id] != null)
    .map(a => { const x = q[a.question_stable_id], e = esc[x.scale_code], v = resp[a.question_stable_id]; return { id: a.question_stable_id, pontos: a.weight * (x.orientation === 'invertida' ? e.max_value - v : v - e.min_value) }; })
    .filter(d => d.pontos > 0).sort((a, b) => b.pontos - a.pontos || (a.id < b.id ? -1 : 1)).slice(0, 3).map(d => d.id);
};

console.log('\n  identidade (so as decisoes de 13/10)\n');
ok(v3.code === 'HOLOS-V1' && v3.version === 3 && v3.status === 'em_revisao' && v3.lineage.parent_version === 2 && v3.lineage.revisao === 'HOLOS-V1-DECISOES-2026-10-13',
  'HOLOS-V1 v3 em_revisao, linhagem do v2 ativo e das decisões de 13/10');
ok(Object.keys(R.textos).length === 0 && Object.keys(R.trocar).length === 0 && Object.keys(R.remover).join(',') === 'SNT-210,SNT-309' && Object.keys(R.mover).join(',') === MOVIDAS.join(','),
  'a revisão tem só as decisões de 13/10: 2 removidas e 13 com sistema novo; nenhum texto novo nem troca');
ok(['SNT-209', 'ESP-102', 'SNT-106', 'SNT-410', 'SNT-507', 'ESP-404'].every(id => q3(id) && JSON.stringify(q3(id)) === JSON.stringify(Object.assign({}, q2(id), { position: q3(id).position }))) && !q3('SNT-112') && !q3('SNT-411') && !q3('SNT-511') && prim(v3, 'ESP-404') === prim(v2, 'ESP-404'),
  'nada do rascunho de 12/10 entrou (SNT-209, ESP-102, SNT-106/410/507 e ESP-404 iguais ao v2; SNT-112/411/511 não existem)');
ok(R.regra_metodologica.length === 2 && /não é suficiente, por si só/.test(R.regra_metodologica[0]) && /justificativa metodológica específica, documentada e aprovada/.test(R.regra_metodologica[1]) && /Regra metodologica:/.test(v3.notes),
  'regra metodológica ativa registrada na revisão e nas notas do pacote');

console.log('\n  1-5. total e as duas removidas\n');
const bloco = {}; v3.perguntas.forEach(x => { bloco[x.block] = (bloco[x.block] || 0) + 1; });
ok(v3.perguntas.length === 82 && v3.edicao.item_count === 82 && bloco.fisico === 47 && bloco.mental_emocional === 19 && bloco.espiritual === 16 && v3.perguntas.every((x, i) => x.position === i + 1),
  '1. total 82 (47 Corpo / 19 Mente / 16 Espírito), posições 1..82');
ok(!q3('SNT-210') && !assoc(v3, 'SNT-210').length, '2. SNT-210 não existe no v3 (nem pergunta, nem associação pontuável, contextual ou de Tríade)');
ok(!q3('SNT-309') && !assoc(v3, 'SNT-309').length, '3. SNT-309 não existe no v3 (idem)');
let recusada = null; try { calc(v3, uniforme(v3, 1, r => { r['SNT-210'] = 3; r['SNT-309'] = 3; })); } catch (e) { recusada = e; }
const semExame = calc(v3, uniforme(v3, 1)), baseV2 = calc(v2, uniforme(v2, 1, r => { r['SNT-210'] = 3; r['SNT-309'] = 3; }));
ok(recusada && /desconhecid/.test(recusada.message + (recusada.codigo || '')) && !Object.values(semExame.system_results).some(s => (s.itens_pontuados || []).some(i => i === 'SNT-210' || i === 'SNT-309'))
  && baseV2.system_results.acido_inflamatorio.itens_pontuados.includes('SNT-210'),
  '4. nenhuma das duas pontua: o motor do v3 recusa resposta para elas e nenhum sistema as conta (no v2 a SNT-210 pontuava)');
const respExame = uniforme(v2, 0, r => { r['SNT-210'] = 3; r['SNT-309'] = 3; });
const resp3 = Object.fromEntries(Object.entries(respExame).filter(([id]) => q3(id)));
ok(dominantes(v2, respExame, 'acido_inflamatorio').includes('SNT-210') && dominantes(v2, respExame, 'metabolico').includes('SNT-309')
  && [...FISICOS, MEE].every(s => !dominantes(v3, resp3, s).some(id => id === 'SNT-210' || id === 'SNT-309')),
  '5. nenhuma aparece como sinal dominante no v3 (com as mesmas respostas, no v2 elas eram dominantes)');

console.log('\n  6-18. as 13 perguntas EMO no Sistema Mental Emocional Espiritual\n');
MOVIDAS.forEach((id, i) => {
  const a = assoc(v3, id).find(x => x.destination_type === 'system' && x.role === 'primaria');
  ok(prim(v2, id) === DE[id.slice(0, 5)] + ':1' && prim(v3, id) === MEE + ':1' && tri(v3, id) === tri(v2, id) && tri(v3, id) === 'mental:1'
    && R.mover[id].motivo === JUST[id] && a.conflict_note.endsWith(JUST[id]) && JSON.stringify(Object.assign({}, q3(id), { position: 0 })) === JSON.stringify(Object.assign({}, q2(id), { notes: q3(id).notes, position: 0 })),
    (6 + i) + '. ' + id + ' → MEE (antes ' + DE[id.slice(0, 5)] + '), peso 1, Tríade Mente, mesmo texto/escala/orientação; justificativa: "' + JUST[id] + '"');
});

console.log('\n  19. nenhuma das 13 altera sistema fisico\n');
ok(MOVIDAS.every(id => !assoc(v3, id).some(a => a.destination_type === 'system' && FISICOS.includes(a.destination_id))),
  '19a. nenhuma das 13 tem associação (primária ou contextual) com sistema físico no v3');
ok(ctx(v2, 'EMO-101') === 'metabolico' && ctx(v2, 'EMO-203') === 'detox_linfatico' && MOVIDAS.every(id => ctx(v3, id) === ''),
  '19b. a relação antiga não ficou como contextual (EMO-101→Metabólico e EMO-203→Detox retiradas; contextuais MEE redundantes retiradas)');
const baixo = calc(v3, uniforme(v3, 0)), alto13 = calc(v3, uniforme(v3, 0, r => MOVIDAS.forEach(id => { r[id] = 3; })));
ok(FISICOS.every(s => baixo.system_results[s].nota === alto13.system_results[s].nota) && alto13.system_results[MEE].nota < baixo.system_results[MEE].nota,
  '19c. as 13 no máximo: as notas dos 4 sistemas físicos não mudam; só a do MEE cai (' + baixo.system_results[MEE].nota + ' → ' + Math.round(alto13.system_results[MEE].nota * 100) / 100 + ')');
const ctxFora = (p) => p.associacoes.filter(a => a.destination_type === 'system' && a.role === 'secondary_contextual' && !MOVIDAS.includes(a.question_stable_id) && !['SNT-210', 'SNT-309'].includes(a.question_stable_id)).map(a => a.question_stable_id + '>' + a.destination_id).sort().join(',');
ok(ctxFora(v3) === ctxFora(v2), 'as outras associações contextuais ficaram como no v2');

console.log('\n  20-21. cobertura e Indice\n');
const porSist = {}; v3.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria').forEach(a => { porSist[a.destination_id] = (porSist[a.destination_id] || 0) + 1; });
ok(JSON.stringify(porSist) === JSON.stringify(Object.assign({}, R.esperado.por_sistema, {})) || Object.entries(R.esperado.por_sistema).every(([k, n]) => porSist[k] === n),
  '20a. denominadores por sistema: Fúngico 12, Ácido Inflamatório 11, Metabólico 10, Detox 12, MEE 37 (' + JSON.stringify(porSist) + ')');
const regra = (p, t, a) => p.regras.find(r => r.rule_type === t && r.target === a);
ok(regra(v3, 'triad', 'fisico').payload.itens === 47 && regra(v3, 'triad', 'mental').payload.itens === 19 && regra(v3, 'triad', 'espiritual').payload.itens === 16 && /\/ 82$/.test(regra(v3, 'coverage', 'global').payload.global),
  '20b. Tríade 47/19/16 e cobertura global sobre 82');
ok(JSON.stringify(regra(v3, 'absence', 'global').payload) === JSON.stringify(regra(v2, 'absence', 'global').payload) && JSON.stringify(regra(v3, 'index', 'global').payload) === JSON.stringify(regra(v2, 'index', 'global').payload),
  '20c. cobertura mínima (80%) e regra do Índice iguais às do v2');
const fun = v3.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === 'fungico').map(a => a.question_stable_id);
const sem = (n) => calc(v3, uniforme(v3, 2, r => fun.slice(0, n).forEach(id => { delete r[id]; })));
const s2 = sem(2), s3 = sem(3);
ok(s2.system_results.fungico.total === 12 && s2.system_results.fungico.respondidos === 10 && s2.system_results.fungico.avaliavel && s3.system_results.fungico.respondidos === 9 && !s3.system_results.fungico.avaliavel && s3.coverage.total === 82,
  '20d. motor usa o denominador novo: Fúngico 10/12 (83%) avaliável, 9/12 (75%) não avaliável; cobertura global sobre 82');
const mee = v3.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === MEE).map(a => a.question_stable_id);
const m7 = calc(v3, uniforme(v3, 2, r => mee.slice(0, 7).forEach(id => { delete r[id]; }))), m8 = calc(v3, uniforme(v3, 2, r => mee.slice(0, 8).forEach(id => { delete r[id]; })));
ok(m7.system_results[MEE].total === 37 && m7.system_results[MEE].avaliavel && !m8.system_results[MEE].avaliavel, '20e. MEE sobre 37: 30/37 avaliável, 29/37 não');
ok(s2.index_result.avaliavel && s2.index_result.valor !== null && !s3.index_result.avaliavel && s3.index_result.valor === null && /fungico/.test(s3.index_result.motivo),
  '21. Índice só com os 5 sistemas avaliáveis: com o Fúngico abaixo de 80% não há Índice (sem Índice parcial)');

console.log('\n  22-23. historico v2 e PP-V1\n');
ok(JSON.stringify(v2) === copiaV2 && v2.content_hash === '3593d782f1cd3a35b05ecae36836ab71746064cc99960853705dd3e2ac3f24c4' && P.hashConteudo(v2) === v2.content_hash && v2.perguntas.length === 84,
  '22. o v2 não é alterado: 84 perguntas, mesmo hash do pacote em produção (3593d782…); aplicações antigas continuam apontando para ele');
const r2antes = JSON.stringify(calc(JSON.parse(copiaV2), uniforme(v2, 2)).system_results);
ok(JSON.stringify(calc(v2, uniforme(v2, 2)).system_results) === r2antes, '22b. recalcular no v2 dá o mesmo resultado de antes (nada do v3 vaza para o v2)');
const porS = {}; REGRAS.forEach(g => { porS[g.system_id] = (porS[g.system_id] || 0) + 1; });
ok(REGRAS.length === 30 && [...FISICOS, MEE].every(s => porS[s] === 6) && createHash('sha256').update(JSON.stringify(REGRAS)).digest('hex') === 'b9bbebe8af43b5498714b1e33c7485af83a90e42c0b700f1f921a0af1fe28216',
  '23. PP-V1 com as mesmas 30 regras (6 por sistema), catálogo idêntico (sha256 b9bbebe8…)');
const sistemasPP = [...FISICOS, MEE].map(s => { const x = alto13.system_results[s]; return { sistema: s, nota: x.nota, avaliavel: x.avaliavel, respondidos: x.respondidos, total_marcadores: x.total, cobertura: x.cobertura }; });
const sel = PP.selecionar({ sistemas: PP.ordenarSistemas({ sistemas: sistemasPP }), regras: REGRAS.map(g => Object.assign({ status: 'aprovado' }, g)), concluidas: [] });
ok(sel.selection.length > 0 && sel.selection.every(x => REGRAS.some(g => g.tool_id === x.tool_id)) && PP.ordenarSistemas({ sistemas: sistemasPP })[0].system_id === MEE,
  '23b. PP-V1 roda sobre o v3 (SISTEMA → CATÁLOGO → FERRAMENTA): com as 13 no máximo, a 1ª área é o MEE');

console.log('\n  validador, determinismo e recusas\n');
const val = P.validar(v3);
ok(val.publicavel && val.total_erros === 0, 'validador de publicação: 0 erros (inclui REF-01/02/03 conferidos pelo motor)' + (val.total_erros ? ': ' + JSON.stringify(val.erros.slice(0, 3)) : ''));
ok(v3.regras.filter(r => r.rule_type === 'example').every(r => Object.keys(r.payload.entrada.responses).length === 82), 'casos de referência remontados para as 82 perguntas');
ok(P.aplicarRevisao(JSON.parse(copiaV2), R).content_hash === v3.content_hash && v3.content_hash === P.hashConteudo(v3), 'determinístico: mesmo v2 + mesmas decisões = mesmo hash (' + v3.content_hash.slice(0, 8) + '…)');
const sem2 = (lista) => JSON.stringify(lista.map(x => { const c = Object.assign({}, x); delete c.legacy; return c; }));
ok(sem2(v3.faixas) === sem2(v2.faixas) && sem2(v3.escalas) === sem2(v2.escalas) && sem2(v3.sistemas) === sem2(v2.sistemas), 'faixas, escalas e sistemas idênticos ao v2 (nenhum peso inventado)');
const tocadas = new Set([...MOVIDAS, 'SNT-210', 'SNT-309']);
ok(v2.perguntas.filter(x => !tocadas.has(x.stable_id)).every(x => JSON.stringify(Object.assign({}, x, { position: 0 })) === JSON.stringify(Object.assign({}, q3(x.stable_id), { position: 0 })) && prim(v2, x.stable_id) === prim(v3, x.stable_id) && tri(v2, x.stable_id) === tri(v3, x.stable_id)),
  'as 69 perguntas sem decisão: idênticas ao v2 (texto, escala, orientação, sistema, peso, Tríade)');
const recusa = (mod, re) => { const R2 = JSON.parse(JSON.stringify(R)); mod(R2); try { P.aplicarRevisao(JSON.parse(copiaV2), R2); return false; } catch (e) { return re.test(e.message); } };
ok(recusa(r => { r.base.version = 1; }, /revisao e do HOLOS-V1 v1/), 'revisão feita para outra versão: recusada');
ok(recusa(r => { r.remover['XXX-999'] = 'x'; }, /XXX-999 nao existe/), 'pergunta inexistente: recusada');
ok(recusa(r => { r.mover['EMO-101'].de = 'metabolico'; }, /primario atual nao e metabolico/), 'mudança de sistema que não confere com o atual: recusada');
ok(recusa(r => { delete r.remover_contextuais['EMO-201']; }, /EMO-201: contextual igual ao sistema novo/), 'contextual MEE redundante não listada: recusada (nada fica em silêncio)');
ok(recusa(r => { r.remover_contextuais['EMO-102'] = ['metabolico']; }, /EMO-102: contextual metabolico nao existe/), 'contextual inexistente listada para sair: recusada');
ok(recusa(r => { r.esperado.total = 84; }, /total 82 \(esperado 84\)/), 'número final diferente do esperado: recusado');
ok(recusa(r => { r.esperado.por_sistema.metabolico = 14; }, /sistema metabolico: 10 \(esperado 14\)/), 'contagem por sistema diferente do esperado: recusada');

console.log('\n  artefatos gerados\n');
const roda = (s) => { try { return execFileSync('node', [new URL('../scripts/' + s, import.meta.url).pathname, '--check'], { encoding: 'utf8' }); } catch (e) { return ''; } };
ok(/em dia/.test(roda('pacote-v3.mjs')), 'pacote-metodologico-v3.json e supabase/tests/pacote-v3-doc.sql em dia (scripts/pacote-v3.mjs --check)');
ok(/em dia/.test(roda('comparar-v2-v3.mjs')), 'docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V2-V3.md em dia (scripts/comparar-v2-v3.mjs --check)');

console.log(falhou ? '\nFALHOU' : '\npacote v3: tudo ok');
process.exit(falhou ? 1 : 0);
