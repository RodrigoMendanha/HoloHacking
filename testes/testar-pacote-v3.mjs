/**
 * HOLOS-V1 v3 — REVISAO DAS PERGUNTAS (12/10, DECISOES-V1 item 183)
 *
 * Prova, sobre o v3 montado por PacoteMetodologico.aplicarRevisao(v2, MetodologiaRevisaoV3):
 *  - v3 = v2 + EXATAMENTE as decisoes: textos novos (mesmo ID, versao da pergunta +1), 3 trocas com ID novo,
 *    2 removidas, ESP-404 no Sistema Mental Emocional Espiritual; tudo o mais identico ao v2
 *  - 82 perguntas (48/19/15), 7 invertidas, 73 frequencia / 9 intensidade; pesos, faixas, Indice e Triade iguais
 *  - validador limpo (inclui os casos de referencia REF-01/02/03 conferidos pelo motor); determinístico
 *  - o mesmo HOLOSCAN de referencia da as mesmas notas no v2 e no v3
 *  - revisao que nao bate com o pacote base e recusada (nada ajustado em silencio)
 *  - o v2 nao e alterado
 */
import './guarda-falhas.mjs';
import '../metodologia-pacote.js';
import '../metodologia-motor.js';
import '../metodologia-revisao-v3.js';
import { candidatoV1 } from './holos-aprovado.mjs';
import { execFileSync } from 'node:child_process';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, R = globalThis.MetodologiaRevisaoV3;
const v2 = candidatoV1(); v2.status = 'aprovado';
const copiaV2 = JSON.stringify(v2);
const v3 = P.aplicarRevisao(v2, R);
const q2 = (id) => v2.perguntas.find(x => x.stable_id === id), q3 = (id) => v3.perguntas.find(x => x.stable_id === id);
const prim = (p, id) => p.associacoes.filter(a => a.question_stable_id === id && a.destination_type === 'system' && a.role === 'primaria').map(a => a.destination_id + ':' + a.weight).join(',');
const tri = (p, id) => p.associacoes.filter(a => a.question_stable_id === id && a.destination_type === 'triad').map(a => a.destination_id + ':' + a.weight).join(',');

console.log('\n  1. identidade e numeros\n');
ok(v3.code === 'HOLOS-V1' && v3.version === 3 && v3.status === 'em_revisao' && v3.lineage.parent_version === 2 && v3.lineage.revisao === R.id,
  'HOLOS-V1 v3 em_revisao, com linhagem do v2 e da revisao (nada aprovado aqui)');
const bloco = {}; v3.perguntas.forEach(x => { bloco[x.block] = (bloco[x.block] || 0) + 1; });
ok(v3.perguntas.length === 82 && bloco.fisico === 48 && bloco.mental_emocional === 19 && bloco.espiritual === 15 && v3.edicao.item_count === 82,
  '82 perguntas: 48 Corpo / 19 Mente / 15 Espírito');
const inv = v3.perguntas.filter(x => x.orientation === 'invertida').map(x => x.stable_id).sort();
ok(inv.join(',') === 'EMO-507,ESP-101,ESP-201,ESP-202,ESP-301,ESP-302,ESP-501', '7 invertidas (saem ESP-102, removida, e SNT-507, trocada por uma pergunta direta)');
const esc = {}; v3.perguntas.forEach(x => { esc[x.scale_code] = (esc[x.scale_code] || 0) + 1; });
ok(esc.frequencia === 73 && esc.intensidade === 9, '73 frequência / 9 intensidade (gosto metálico pede frequência)');
const porSist = {}; v3.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria').forEach(a => { porSist[a.destination_id] = (porSist[a.destination_id] || 0) + 1; });
ok(Object.entries({ fungico: 15, acido_inflamatorio: 14, metabolico: 14, detox_linfatico: 15, mental_emocional_espiritual: 24 }).every(([k, n]) => porSist[k] === n),
  'perguntas por sistema: Fúngico 15, Ácido Inflamatório 14, Metabólico 14, Detox 15, Mental 24 (' + JSON.stringify(porSist) + ')');
ok(v3.perguntas.every((x, i) => x.position === i + 1), 'posições renumeradas 1..82, na ordem do v2');

console.log('\n  2. cada decisao aplicada, e so ela\n');
const textos = Object.keys(R.textos);
ok(textos.every(id => q3(id) && q3(id).statement === R.textos[id] && q3(id).version === (q2(id).version || 1) + 1 && /texto revisado/.test(q3(id).notes)),
  textos.length + ' textos novos com o mesmo ID; a versão da pergunta sobe e o texto anterior fica na nota');
ok(textos.every(id => q3(id).scale_code === q2(id).scale_code && q3(id).orientation === q2(id).orientation && q3(id).temporal_context === q2(id).temporal_context && prim(v3, id) === prim(v2, id) && tri(v3, id) === tri(v2, id)),
  'texto novo não muda escala, orientação, período, sistema, peso nem Tríade');
const trocas = Object.entries(R.trocar);
ok(trocas.every(([velho, t]) => !q3(velho) && q3(t.novo_id) && q3(t.novo_id).statement === t.texto && q3(t.novo_id).block === q2(velho).block
  && prim(v3, t.novo_id) === prim(v2, velho) && tri(v3, t.novo_id) === tri(v2, velho)),
  'SNT-106 → SNT-112, SNT-410 → SNT-411, SNT-507 → SNT-511: ID novo, mesmo bloco, mesmo sistema e mesma Tríade; o ID antigo sai');
ok(q3('SNT-511').orientation === 'direta' && q2('SNT-507').orientation === 'invertida', 'SNT-511 (tristeza com a saúde) é direta; a SNT-507 era invertida');
ok(q3('SNT-411').scale_code === 'frequencia' && q3('SNT-411').temporal_context === 'ultimos_30_dias' && q3('SNT-411').response_labels.join('/') === 'Nunca/Às vezes/Frequente/Sempre',
  'SNT-411 (gosto metálico) em frequência, últimos 30 dias, com os rótulos da escala');
ok(!q3('SNT-209') && !q3('ESP-102') && !v3.associacoes.some(a => a.question_stable_id === 'SNT-209' || a.question_stable_id === 'ESP-102'), 'SNT-209 e ESP-102 removidas, sem associação órfã');
ok(prim(v2, 'ESP-404') === 'acido_inflamatorio:1' && prim(v3, 'ESP-404') === 'mental_emocional_espiritual:1' && tri(v3, 'ESP-404') === 'espiritual:1' && q3('ESP-404').statement === q2('ESP-404').statement,
  'ESP-404: mesmo texto e peso, agora no Sistema Mental Emocional Espiritual (Tríade Espírito)');
const tocados = new Set([...textos, ...Object.keys(R.trocar), ...Object.keys(R.remover), ...Object.keys(R.mover)]);
const intocados = v2.perguntas.filter(x => !tocados.has(x.stable_id));
const igual = (a, b) => JSON.stringify(Object.assign({}, a, { position: 0 })) === JSON.stringify(Object.assign({}, b, { position: 0 }));
ok(intocados.length === 84 - tocados.size && intocados.every(x => igual(x, q3(x.stable_id)) && prim(v2, x.stable_id) === prim(v3, x.stable_id) && tri(v2, x.stable_id) === tri(v3, x.stable_id)),
  intocados.length + ' perguntas sem decisão: idênticas ao v2 (texto, escala, orientação, sistema, peso, Tríade)');
const ctx = (p) => p.associacoes.filter(a => a.destination_type === 'system' && a.role === 'secondary_contextual').map(a => a.question_stable_id + '>' + a.destination_id).sort().join(',');
ok(ctx(v3) === ctx(v2), 'vínculos contextuais (não pontuam) iguais aos do v2');
const sem = (lista) => JSON.stringify(lista.map(x => { const c = Object.assign({}, x); delete c.legacy; return c; }));
ok(sem(v3.faixas) === sem(v2.faixas) && sem(v3.escalas) === sem(v2.escalas) && sem(v3.sistemas) === sem(v2.sistemas), 'faixas, escalas e sistemas idênticos ao v2');
const regra = (p, t, a) => p.regras.find(r => r.rule_type === t && r.target === a);
ok(JSON.stringify(regra(v3, 'index', 'global').payload) === JSON.stringify(regra(v2, 'index', 'global').payload) && JSON.stringify(regra(v3, 'absence', 'global').payload) === JSON.stringify(regra(v2, 'absence', 'global').payload),
  'Índice e política de ausência (cobertura mínima 80%) idênticos');
ok(regra(v3, 'triad', 'fisico').payload.itens === 48 && regra(v3, 'triad', 'mental').payload.itens === 19 && regra(v3, 'triad', 'espiritual').payload.itens === 15 && /\/ 82$/.test(regra(v3, 'coverage', 'global').payload.global),
  'contagens das regras atualizadas: Tríade 48/19/15; cobertura global sobre 82');

console.log('\n  3. validador, referencias e determinismo\n');
const val = P.validar(v3);
ok(val.publicavel && val.total_erros === 0, 'validador de publicação: 0 erros (inclui REF-01/02/03 conferidos pelo motor)' + (val.total_erros ? ': ' + JSON.stringify(val.erros.slice(0, 3)) : ''));
ok(v3.regras.filter(r => r.rule_type === 'example').every(r => Object.keys(r.payload.entrada.responses).length === 82), 'casos de referência remontados para as 82 perguntas');
ok(P.aplicarRevisao(JSON.parse(copiaV2), R).content_hash === v3.content_hash && v3.content_hash === P.hashConteudo(v3), 'determinístico: mesmo v2 + mesma revisão = mesmo hash');
ok(JSON.stringify(v2) === copiaV2, 'o v2 não é alterado');
const calc = (p, z) => { const r = {}; p.perguntas.forEach(x => { r[x.stable_id] = x.orientation === 'invertida' ? 3 - z : z; });
  return M.calcular({ responses: r, methodology_package: p, mode: 'homologacao', engine_version: 'teste-v3', questionnaire_edition: { code: p.edicao.code, version: p.edicao.version } }); };
ok([0, 1, 2, 3].every(z => { const a = calc(v2, z), b = calc(v3, z); return a.index_result.valor === b.index_result.valor && Object.keys(a.system_results).every(k => a.system_results[k].nota === b.system_results[k].nota); }),
  'respostas uniformes dão as mesmas notas e o mesmo Índice no v2 e no v3 (a escala de nota não muda)');
const r3 = calc(v3, 2);
ok(r3.system_results.acido_inflamatorio.total === 14 && r3.system_results.mental_emocional_espiritual.total === 24 && r3.coverage.total === 82, 'motor no v3: Ácido Inflamatório sobre 14 itens, Mental sobre 24, cobertura sobre 82');
let e1 = null; try { M.calcular({ responses: { 'SNT-209': 2 }, methodology_package: v3, mode: 'homologacao', engine_version: 't', questionnaire_edition: { code: v3.edicao.code, version: v3.edicao.version } }); } catch (e) { e1 = e; }
ok(e1 && /desconhecid/.test(e1.message + (e1.codigo || '')), 'resposta para pergunta removida (SNT-209) é recusada pelo motor no v3');

console.log('\n  4. revisao que nao bate e recusada\n');
const recusa = (mod, re) => { const R2 = JSON.parse(JSON.stringify(R)); mod(R2); try { P.aplicarRevisao(JSON.parse(copiaV2), R2); return false; } catch (e) { return re.test(e.message); } };
ok(recusa(r => { r.base.version = 1; }, /revisao e do HOLOS-V1 v1/), 'revisão feita para outra versão: recusada');
ok(recusa(r => { r.textos['XXX-999'] = 'x'; }, /XXX-999 nao existe/), 'pergunta inexistente: recusada');
ok(recusa(r => { r.trocar['SNT-106'].novo_id = 'SNT-107'; }, /ja usado/), 'ID novo já usado: recusado');
ok(recusa(r => { r.mover['ESP-404'].de = 'fungico'; }, /primario atual nao e fungico/), 'mudança de sistema que não confere com o atual: recusada');
ok(recusa(r => { r.esperado.total = 83; }, /total 82 \(esperado 83\)/), 'número final diferente do esperado: recusado');
ok(recusa(r => { r.textos['SNT-201'] = q2('SNT-201').statement; }, /igual ao atual/), 'texto "novo" igual ao atual: recusado');

console.log('\n  5. artefatos gerados\n');
let emDia = false; try { emDia = /em dia/.test(execFileSync('node', [new URL('../scripts/pacote-v3.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' })); } catch (e) { emDia = false; }
ok(emDia, 'docs/v1/metodologia/pacote-metodologico-v3.json e supabase/tests/pacote-v3-doc.sql em dia com a revisão (scripts/pacote-v3.mjs --check)');

console.log(falhou ? '\nFALHOU' : '\npacote v3: tudo ok');
process.exit(falhou ? 1 : 0);
