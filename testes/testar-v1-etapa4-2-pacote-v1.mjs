/**
 * V1 — ETAPA 4.2 — PACOTE METODOLOGICO V1 CANDIDATO (decisoes humanas fechadas)
 *
 * Prova, sobre o pacote REAL gerado (inventario importado + metodologia-decisoes-v1.js):
 *  - questionario: 84 IDs, 84 contextos temporais (7 valores), 73 frequencia / 11 intensidade, 9 invertidas
 *  - associacoes: exatamente 84 primarias pontuaveis, todas peso 1; secundarias contextuais nao pontuam
 *  - SNT-101 primario Fungico; SNT-501 primario Mental Emocional Espiritual (Triada fisico)
 *  - parcialidade: cobertura >= 80% avalia; 79,x% (e logo abaixo de 80%) bloqueia; ausente != zero
 *  - faixas com precisao interna (10/3 e intermediaria mesmo com tela 3.3); textos neutros
 *  - Indice: exige os cinco sistemas; nunca renormaliza; sem Indice parcial
 *  - Triada pelo bloco; comparabilidade exige mesmo conjunto pontuado; nunca melhorou/piorou
 *  - REF-01, REF-02, REF-03 (exato e tela); fixtures de 80% para CADA sistema e eixo
 *  - nenhuma CMB/REC/SEL oficial; nenhum texto causal antigo na saida oficial
 *  - pacote antigo continua reproduzivel como historico; candidato deterministico
 *  - o motor nao tem fallback para legado
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import '../metodologia-pacote.js';
import '../metodologia-motor.js';
import '../metodologia-decisoes-v1.js';
import '../metodologia.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url).pathname;
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, D = globalThis.MetodologiaDecisoesV1, B = globalThis.Metodologia;
const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
const base = P.importarInventario(inv, 'HOLOS-V1', 1);
const C = P.aplicarDecisoesV1(base, D);
const SIST = ['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual'];
const EIXOS = ['fisico', 'mental', 'espiritual'];
const erro = (f) => { try { f(); return null; } catch (e) { return e; } };
const calc = (resp, extra) => M.calcular(Object.assign({ responses: resp, methodology_package: C, mode: 'homologacao', engine_version: 'teste-4.2', questionnaire_edition: { code: C.edicao.code, version: C.edicao.version } }, extra || {}));
const q = (id) => C.perguntas.find(x => x.stable_id === id);
/** respostas com todo z = valor (direta = z, invertida = 3 - z) para os IDs dados */
const comZ = (ids, z) => { const r = {}; ids.forEach(id => { r[id] = q(id).orientation === 'invertida' ? 3 - z : z; }); return r; };
const TODOS = C.perguntas.map(x => x.stable_id);
const primarios = (s) => C.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === s).map(a => a.question_stable_id);
const doEixo = (e) => C.associacoes.filter(a => a.destination_type === 'triad' && a.destination_id === e).map(a => a.question_stable_id);

titulo('QUESTIONARIO: 84 IDS, CONTEXTO TEMPORAL, ESCALAS, ORIENTACAO');
ok(C.perguntas.length === 84 && new Set(TODOS).size === 84 && C.edicao.item_count === 84 && C.edicao.code === 'HOLOSCAN-V1', '84 IDs unicos na edicao HOLOSCAN-V1');
const porBloco = {}; C.perguntas.forEach(x => { porBloco[x.block] = (porBloco[x.block] || 0) + 1; });
ok(porBloco.fisico === 49 && porBloco.mental_emocional === 19 && porBloco.espiritual === 16, '49 fisico / 19 mental-emocional / 16 espiritual');
ok(!TODOS.includes('EMO-506') && !TODOS.includes('SNT-302') && !TODOS.includes('SNT-310'), 'EMO-506 fora da V1; SNT-302 e SNT-310 nao recriadas');
ok(C.perguntas.every(x => P.CONTEXTOS_TEMPORAIS.includes(x.temporal_context)) && TODOS.every(id => D.contexto_temporal[id] === q(id).temporal_context) && Object.keys(D.contexto_temporal).length === 84, '84 contextos temporais: cada ID exatamente um, dentre os 7 permitidos, igual ao mapeamento oficial');
const ctx = {}; C.perguntas.forEach(x => { ctx[x.temporal_context] = (ctx[x.temporal_context] || 0) + 1; });
ok(ctx.ultimos_30_dias === 50 && ctx.ultimos_3_meses === 5 && ctx.atualmente === 14 && ctx.habitualmente === 12 && ctx.ao_longo_da_vida === 1 && ctx.sem_periodo_especifico === 2 && !ctx.ultimos_7_dias, 'distribuicao 50/5/14/12/1/2 e nenhum item em ultimos_7_dias');
ok(C.perguntas.filter(x => x.scale_code === 'frequencia').length === 73 && C.perguntas.filter(x => x.scale_code === 'intensidade').length === 11, '73 frequencia / 11 intensidade (Anexo A mantido)');
const esc = (c) => C.escalas.find(e => e.code === c);
ok(esc('frequencia').labels.join('/') === 'Nunca/Às vezes/Frequente/Sempre' && esc('intensidade').labels.join('/') === 'Nada/Um pouco/Bastante/Muito' && C.escalas.every(e => e.min_value === 0 && e.max_value === 3), 'escalas 0..3 com os rotulos decididos');
const inv9 = C.perguntas.filter(x => x.orientation === 'invertida').map(x => x.stable_id).sort();
ok(inv9.join(',') === 'EMO-507,ESP-101,ESP-102,ESP-201,ESP-202,ESP-301,ESP-302,ESP-501,SNT-507' && C.perguntas.filter(x => x.orientation === 'direta').length === 75, '9 invertidas oficiais; 75 diretas');
const semEscala = JSON.parse(JSON.stringify(C)); semEscala.perguntas[0].scale_code = 'desconhecida';
ok(erro(() => M.calcular({ responses: { [semEscala.perguntas[0].stable_id]: 1 }, methodology_package: semEscala, mode: 'homologacao' })).codigo === 'escala_ausente' && P.validar(semEscala).erros.some(e => e.codigo === 'referencia_inexistente'), 'escala desconhecida = erro no motor e no validador (nunca cai em frequencia)');
const semOri = JSON.parse(JSON.stringify(C)); semOri.perguntas[0].orientation = null;
ok(erro(() => M.calcular({ responses: { [semOri.perguntas[0].stable_id]: 1 }, methodology_package: semOri, mode: 'homologacao' })).codigo === 'orientacao_ausente' && P.validar(semOri).erros.some(e => e.codigo === 'orientacao_ausente'), 'orientacao ausente = erro no motor e no validador (nunca inferida)');
const dInv = Object.assign({}, D, { contexto_temporal: Object.assign({}, D.contexto_temporal, { 'EMO-506': 'atualmente' }) });
ok(/EMO-506/.test((erro(() => P.aplicarDecisoesV1(base, dInv)) || {}).message || ''), 'decisao que nao bate com o pacote base (ID fora da edicao) e ERRO, nao ajuste silencioso');

titulo('ASSOCIACOES E PESOS');
const prim = C.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria');
const ctxs = C.associacoes.filter(a => a.destination_type === 'system' && a.role === 'secondary_contextual');
ok(prim.length === 84 && new Set(prim.map(a => a.question_stable_id)).size === 84, 'exatamente 84 associacoes primarias pontuaveis, uma por pergunta');
ok(prim.every(a => a.weight === 1) && C.associacoes.filter(a => a.destination_type === 'triad').every(a => a.weight === 1), 'todos os pesos oficiais = 1 (primarias e Triada)');
ok(ctxs.length === 11 && ctxs.every(a => a.weight === null && a.legacy && typeof a.legacy.legacy_recovered_weight === 'number'), '11 secondary_contextual (9 recuperadas + SNT-101/SNT-501 metabolico) sem peso; peso antigo em legacy_recovered_weight');
ok(C.associacoes.filter(a => a.legacy && a.legacy.legacy_recovered_weight !== undefined).length === 179 && C.associacoes.some(a => a.legacy.legacy_recovered_weight === 3) && C.associacoes.some(a => a.legacy.legacy_recovered_weight === 2), 'provenance preservada: os 179 vinculos guardam o peso recuperado (1/2/3), fora da formula');
ok(C.associacoes.every(a => !a.conflict) && C.associacoes.length === 179, '179 associacoes (84 primarias + 11 contextuais + 84 Triada), nenhum conflito pendente');
const a101 = C.associacoes.filter(a => a.question_stable_id === 'SNT-101');
ok(a101.find(a => a.role === 'primaria').destination_id === 'fungico' && a101.find(a => a.role === 'secondary_contextual').destination_id === 'metabolico' && a101.find(a => a.role === 'secondary_contextual').legacy.historic_id === 'SNT-302' && a101.find(a => a.destination_type === 'triad').destination_id === 'fisico', 'SNT-101: primario Sistema Fungico peso 1; Metabolico contextual (linha historica SNT-302); Triada fisico peso 1');
const a501 = C.associacoes.filter(a => a.question_stable_id === 'SNT-501');
ok(a501.find(a => a.role === 'primaria').destination_id === 'mental_emocional_espiritual' && a501.find(a => a.role === 'secondary_contextual').destination_id === 'metabolico' && a501.find(a => a.role === 'secondary_contextual').legacy.historic_id === 'SNT-310' && a501.find(a => a.destination_type === 'triad').destination_id === 'fisico', 'SNT-501: primario Sistema Mental Emocional Espiritual peso 1; Metabolico contextual (SNT-310); Triada fisico');
ok(q('SNT-101').temporal_context === 'ultimos_30_dias' && q('SNT-501').temporal_context === 'ultimos_30_dias', 'SNT-101 e SNT-501 em ultimos_30_dias');
const semCtx = JSON.parse(JSON.stringify(C)); semCtx.associacoes = semCtx.associacoes.filter(a => a.role !== 'secondary_contextual');
const rc = calc(comZ(TODOS, 2)), rsc = M.calcular({ responses: comZ(TODOS, 2), methodology_package: semCtx, mode: 'homologacao', engine_version: 'teste-4.2', questionnaire_edition: { code: C.edicao.code, version: C.edicao.version } });
ok(JSON.stringify(rc.system_results) === JSON.stringify(rsc.system_results) && JSON.stringify(rc.index_result) === JSON.stringify(rsc.index_result) && JSON.stringify(rc.triad_result) === JSON.stringify(rsc.triad_result) && rc.contextual_associations.length === 11 && rc.contextual_associations.every(c => c.contribution === null), 'secundarias nao pontuam: tirar as 11 contextuais nao muda nota, denominador, cobertura, Indice nem Triada');
ok(rc.system_results.metabolico.total === 14 && !rc.system_results.metabolico.itens_pontuados.includes('SNT-101') && !rc.system_results.metabolico.itens_pontuados.includes('SNT-501') && rc.system_results.fungico.itens_pontuados.includes('SNT-101') && rc.system_results.mental_emocional_espiritual.itens_pontuados.includes('SNT-501'), 'Metabolico nao pontua SNT-101/SNT-501; Fungico pontua SNT-101; MEE pontua SNT-501');

titulo('CASOS DE REFERENCIA REF-01, REF-02, REF-03');
const ref = (id) => C.regras.find(r => r.rule_type === 'example' && r.target === id).payload;
const r1 = calc(ref('REF-01').entrada.responses), r2 = calc(ref('REF-02').entrada.responses), r3 = calc(ref('REF-03').entrada.responses);
ok(SIST.every(s => r1.system_results[s].nota_exata === '10' && r1.system_results[s].nota_exibicao === '10.0') && r1.index_result.valor_exato === '100' && r1.index_result.valor_exibicao === '100.0' && EIXOS.every(e => r1.triad_result[e].nota_exibicao === '10.0') && r1.coverage.fracao === '1', 'REF-01 (diretas 0, invertidas 3): 5 sistemas 10.0, Indice 100.0, Triada 10.0/10.0/10.0, cobertura 100%');
ok(SIST.every(s => r2.system_results[s].nota_exata === '0' && r2.system_results[s].nota_exibicao === '0.0') && r2.index_result.valor_exato === '0' && r2.index_result.valor_exibicao === '0.0' && EIXOS.every(e => r2.triad_result[e].nota_exibicao === '0.0') && r2.coverage.percentual === 100, 'REF-02 (diretas 3, invertidas 0): 5 sistemas 0.0, Indice 0.0, Triada 0.0/0.0/0.0, cobertura 100%');
ok(SIST.every(s => r3.system_results[s].nota_exata === '20/3' && Math.abs(r3.system_results[s].nota - 6.666666) < 1e-6) && r3.index_result.valor_exato === '200/3' && EIXOS.every(e => r3.triad_result[e].nota_exata === '20/3'), 'REF-03 (todo z = 1): interno 20/3 = 6,666..., Indice 200/3 = 66,666..., Triada 20/3 em cada eixo');
ok(SIST.every(s => r3.system_results[s].nota_exibicao === '6.7') && r3.index_result.valor_exibicao === '66.7' && EIXOS.map(e => r3.triad_result[e].nota_exibicao).join(' / ') === '6.7 / 6.7 / 6.7', 'REF-03 na tela: 6.7, 66.7, 6.7 / 6.7 / 6.7');
ok(['REF-01', 'REF-02', 'REF-03'].every(id => M.conferirExemplo(C, ref(id)).length === 0), 'os tres casos estao no pacote com resultado esperado e conferem com o motor (conferirExemplo)');

titulo('PARCIALIDADE: 80% POR SISTEMA E POR EIXO; AUSENTE != ZERO');
const minimoQueAvalia = (n) => Math.ceil(n * 0.8 - 1e-9);
for (const s of SIST) {
  const ids = primarios(s), k = minimoQueAvalia(ids.length);
  const sim = calc(comZ(ids.slice(0, k), 1)).system_results[s], nao = calc(comZ(ids.slice(0, k - 1), 1)).system_results[s];
  ok(sim.avaliavel && sim.nota_exata === '20/3' && sim.respondidos === k && sim.mostrar_cobertura === (k < ids.length) && !nao.avaliavel && nao.nota === null && /abaixo do minimo aprovado 0.8/.test(nao.motivo), s + ': ' + k + '/' + ids.length + ' (' + sim.cobertura_exibicao + ') avalia; ' + (k - 1) + '/' + ids.length + ' (' + nao.cobertura_exibicao + ') nao avalia');
}
for (const e of EIXOS) {
  const ids = doEixo(e), k = minimoQueAvalia(ids.length);
  const sim = calc(comZ(ids.slice(0, k), 1)).triad_result[e], nao = calc(comZ(ids.slice(0, k - 1), 1)).triad_result[e];
  ok(sim.avaliavel && sim.nota_exata === '20/3' && !nao.avaliavel && nao.nota === null && /abaixo do minimo aprovado 0.8/.test(nao.motivo), 'Triada ' + e + ': ' + k + '/' + ids.length + ' (' + sim.cobertura_exibicao + ') avalia; ' + (k - 1) + '/' + ids.length + ' (' + nao.cobertura_exibicao + ') nao avalia');
}
const fung = primarios('fungico');
const ex80 = calc(comZ(fung.slice(0, 12), 0)).system_results.fungico;
ok(fung.length === 15 && ex80.cobertura === 0.8 && ex80.cobertura_exibicao === '80.0%' && ex80.avaliavel && ex80.mostrar_cobertura === true, 'exatamente 80% (12/15) e avaliavel e a cobertura acompanha a nota (< 100%)');
const fis = doEixo('fisico'), t79 = calc(comZ(fis.slice(0, 39), 0)).triad_result.fisico;
ok(fis.length === 49 && t79.cobertura_exibicao === '79.6%' && !t79.avaliavel && t79.nota === null, '79,x% bloqueia: 39/49 = 79,6% no eixo fisico -> nao avaliavel');
const comBranco = calc(Object.assign(comZ(fung.slice(0, 12), 0), {}), { response_states: { [fung[12]]: 'em_branco', [fung[13]]: 'recusado', [fung[14]]: 'nao_aplicavel' } }).system_results.fungico;
const comZero = calc(comZ(fung, 0)).system_results.fungico;
ok(comBranco.nota_exata === '10' && comBranco.respondidos === 12 && comBranco.total === 15 && comZero.respondidos === 15 && comZero.cobertura === 1, 'em branco, recusada e nao aplicavel nao viram zero: reduzem a cobertura (12/15) e ficam fora da conta; o denominador de cobertura continua 15');
const mistura = calc(Object.assign(comZ(fung.slice(0, 12), 3), comZ(fung.slice(12), 0))).system_results.fungico, soResp = calc(comZ(fung.slice(0, 12), 3)).system_results.fungico;
ok(soResp.nota_exata === '0' && mistura.nota_exata === '2' && soResp.nota_exata !== mistura.nota_exata, 'ausente != zero: 12 itens com z=3 e 3 ausentes -> nota 0 (so respondidos); os mesmos 3 respondidos com 0 -> nota 2');
const comValorRecusado = calc(Object.assign(comZ(fung, 3)), { response_states: { [fung[0]]: 'recusado' } });
ok(comValorRecusado.system_results.fungico.respondidos === 14 && !comValorRecusado.item_contributions.some(c => c.question_id === fung[0]), 'estado recusado prevalece sobre um valor enviado: nao e resposta numerica valida');
ok(erro(() => calc({ [fung[0]]: 1 }, { response_states: { [fung[0]]: 'talvez' } })).codigo === 'estado_invalido', 'estado de resposta desconhecido = erro');
ok(calc(comZ(TODOS.slice(0, 42), 1)).coverage.fracao === '1/2' && calc(comZ(TODOS.slice(0, 42), 1)).coverage.percentual_exibicao === '50.0%', 'cobertura global informativa = respostas validas / 84');

titulo('FAIXAS COM PRECISAO INTERNA E TEXTOS NEUTROS');
const fx = C.faixas.filter(f => f.destination_id === 'fungico').sort((a, b) => a.lower_bound - b.lower_bound);
ok(C.faixas.length === 15 && fx.map(f => f.label + (f.lower_inclusive ? '[' : '(') + f.lower_bound_exact + ',' + f.upper_bound_exact + (f.upper_inclusive ? ']' : ')')).join(' ') === 'baixa[0,10/3) intermediaria[10/3,20/3) alta[20/3,10]', 'faixas por sistema: [0, 10/3) baixa; [10/3, 20/3) intermediaria; [20/3, 10] alta');
const t1 = calc(comZ(fung, 2)).system_results.fungico;
ok(t1.nota_exata === '10/3' && t1.nota_exibicao === '3.3' && t1.faixa === 'intermediaria', 'nota exatamente 10/3: tela 3.3, mas a faixa e INTERMEDIARIA (classificacao pela fracao, nunca pela tela)');
const quase = calc(Object.assign(comZ(fung.slice(0, 14), 2), comZ([fung[14]], 3))).system_results.fungico;
ok(quase.nota_exata === '28/9' && quase.nota_exibicao === '3.1' && quase.faixa === 'baixa', 'logo abaixo de 10/3 (14 itens z=2 + 1 item z=3 -> 28/9): baixa');
ok(r3.system_results.fungico.faixa === 'alta' && r1.system_results.fungico.faixa === 'alta' && r2.system_results.fungico.faixa === 'baixa', '20/3 e 10 sao alta; 0 e baixa');
ok(C.faixas.every(f => /^A pontuação deste eixo ficou na faixa (baixa|intermediária|alta) nesta aplicação\. Revise os itens respondidos e a cobertura antes da interpretação profissional\.$/.test(f.message_nutri) && f.message_paciente === f.message_nutri + ' Esta pontuação organiza respostas do HOLOSCAN e não representa, sozinha, um diagnóstico.'), 'mensagens oficiais neutras; paciente com o aviso de que nao e diagnostico');
const legadas = base.faixas.flatMap(f => [f.message_nutri, f.message_paciente]).filter(Boolean);
const saida = JSON.stringify([r1, r2, r3, rc].map(r => ({ s: r.system_results, i: r.index_result, t: r.triad_result })));
ok(legadas.length === 30 && legadas.every(m => !saida.includes(m)) && !P.TERMOS_CAUSAIS.some(t => saida.toLowerCase().includes(t)), 'nenhuma mensagem antiga nem termo causal na saida oficial do motor');
ok(C.faixas.every(f => f.legacy && f.legacy.mensagem_nutri) && legadas.every(m => C.faixas.some(f => f.legacy.mensagem_nutri === m || f.legacy.mensagem_paciente === m)), 'mensagens antigas preservadas so como legado/provenance');

titulo('INDICE HOLOS');
const idx = C.regras.find(r => r.rule_type === 'index').payload;
ok(SIST.every(s => idx.alphas[s] === 0.2) && idx.indice_parcial === false && idx.renormalizacao === false && idx.casas === 1 && idx.faixas === false && !C.faixas.some(f => f.destination_type === 'index'), 'Indice: 0,20 x 5, sem parcial, sem renormalizacao, 1 casa, sem faixas');
const quatro = calc(comZ(TODOS, 1), { response_states: Object.fromEntries(primarios('metabolico').slice(0, 3).map(id => [id, 'em_branco'])) });
ok(SIST.filter(s => quatro.system_results[s].avaliavel).length === 4 && !quatro.system_results.metabolico.avaliavel && quatro.index_result.valor === null && quatro.index_result.avaliavel === false && /nao avaliavel\(is\): metabolico/.test(quatro.index_result.motivo), 'Indice exige os cinco sistemas: 4 avaliaveis + metabolico a 11/14 -> Indice nulo com motivo explicito');
const renorm = JSON.parse(JSON.stringify(C)); renorm.regras.find(r => r.rule_type === 'index').payload.indice_parcial = true;
const rr = M.calcular({ responses: comZ(TODOS, 1), methodology_package: renorm, mode: 'homologacao' });
ok(rr.index_result.valor === null && /parcial/.test(rr.index_result.motivo) && P.validar(renorm).erros.some(e => e.codigo === 'indice_parcial_proibido'), 'Indice nunca renormaliza: pacote que pede Indice parcial nao gera Indice e o validador aponta');
const diverso = calc(Object.assign(comZ(primarios('fungico'), 0), comZ(primarios('acido_inflamatorio'), 1), comZ(primarios('metabolico'), 2), comZ(primarios('detox_linfatico'), 3), comZ(primarios('mental_emocional_espiritual'), 1)));
ok(diverso.index_result.valor_exato === '160/3' && diverso.index_result.valor_exibicao === '53.3', 'Indice = 10 x Σ(nota x 0,20): notas 10, 20/3, 10/3, 0, 20/3 -> 160/3 (tela 53.3)');

titulo('TRIADA PELO BLOCO');
ok(EIXOS.every(e => C.regras.find(r => r.rule_type === 'triad' && r.target === e).payload.cobertura_minima === 0.8) && doEixo('fisico').length === 49 && doEixo('mental').length === 19 && doEixo('espiritual').length === 16, 'Triada: 49/19/16 itens, peso 1, cobertura minima 0,8 por eixo');
ok(C.perguntas.every(x => C.associacoes.find(a => a.question_stable_id === x.stable_id && a.destination_type === 'triad').destination_id === P.EIXO_DO_BLOCO[x.block]), 'cada item no eixo do proprio bloco (SNT-501 fisico, mesmo com primario MEE)');
const soMental = calc(comZ(doEixo('mental'), 1));
ok(soMental.triad_result.mental.avaliavel && !soMental.triad_result.fisico.avaliavel && !('global' in soMental.triad_result) && !('nota_global' in soMental) && soMental.triad_result.mental.faixa === null, 'sem nota global da Triada e sem faixa automatica por eixo');
const triInv = calc(comZ(doEixo('espiritual'), 0)).triad_result.espiritual;
ok(triInv.nota_exata === '10' && doEixo('espiritual').filter(id => q(id).orientation === 'invertida').length === 7, 'Triada usa a mesma orientacao da pergunta (7 invertidas no eixo espiritual)');

titulo('COMPARABILIDADE');
const app = (resp, extra) => calc(resp, Object.assign({ application_context: { patient_id: 'p-teste-1' } }, extra || {}));
const a1 = app(comZ(fung, 1)), a2 = app(comZ(fung, 0)), a3 = app(comZ(fung.slice(0, 12), 0));
const cmp1 = M.comparar(a1, a2, 'fungico', C);
ok(cmp1.comparavel && cmp1.anterior === '6.7' && cmp1.atual === '10.0' && cmp1.delta_exato === '10/3' && cmp1.delta_exibicao === '+3.3' && cmp1.direcao === 'subiu', 'mesmos requisitos: anterior 6.7, atual 10.0, delta absoluto +3.3, "subiu"');
ok(M.comparar(a2, a1, 'fungico', C).direcao === 'desceu' && M.comparar(a1, a1, 'fungico', C).direcao === 'permaneceu' && M.comparar(a1, a1, 'fungico', C).delta_exibicao === '0.0', '"desceu" e "permaneceu"');
const cmp2 = M.comparar(a1, a3, 'fungico', C);
ok(!cmp2.comparavel && cmp2.delta === null && cmp2.apresentacao === 'lado_a_lado' && cmp2.anterior === '6.7' && cmp2.atual === '10.0' && cmp2.motivos.some(m => /conjuntos de itens pontuados diferentes/.test(m)), 'conjunto pontuado diferente (15 x 12 itens): lado a lado, sem delta');
const outroPac = app(comZ(fung, 0)); outroPac.package_version = 3;
ok(M.comparar(a1, outroPac, 'fungico', C).motivos.some(m => /versoes do pacote/.test(m)) && M.comparar(a1, app(comZ(fung, 0), { application_context: { patient_id: 'outro' } }), 'fungico', C).motivos.some(m => /pacientes diferentes/.test(m)), 'pacote ou paciente diferente: sem delta');
const outraEd = app(comZ(fung, 0), { questionnaire_edition: { code: 'HOLOSCAN-V1', version: 2 } }), outroContrato = app(comZ(fung, 0)); outroContrato.engine_contract_version = 'outro';
ok(M.comparar(a1, outraEd, 'fungico', C).motivos.some(m => /edicoes/.test(m)) && M.comparar(a1, outroContrato, 'fungico', C).motivos.some(m => /contratos do motor/.test(m)) && M.comparar(a1, app(comZ(fung.slice(0, 5), 0)), 'fungico', C).motivos.some(m => /nao avaliavel/.test(m)), 'edicao, contrato do motor ou sistema nao avaliavel: sem delta');
const textoComp = JSON.stringify([cmp1, cmp2, M.comparar(a2, a1, 'fungico', C)]);
ok(!/melhor|pior|funcionou|agrav/i.test(textoComp) && C.regras.find(r => r.rule_type === 'comparability').payload.janela_minima === null && C.regras.find(r => r.rule_type === 'comparability').payload.equivalencia_entre_versoes === false, 'nunca "melhorou/piorou/funcionou/agravou"; sem janela minima; sem equivalencia automatica entre versoes');

titulo('SISTEMAS, TEXTOS E CMB/REC/SEL');
ok(C.sistemas.map(s => s.name).join(' | ') === 'Sistema Fúngico | Sistema Ácido Inflamatório | Sistema Metabólico | Sistema Detox e Linfático | Sistema Mental Emocional Espiritual', 'nomes oficiais dos cinco sistemas');
ok(C.sistemas.every(s => s.public_text === D.sistemas[s.code].texto && s.emotional_pattern === null && s.spiritual_impact === null && s.definition === null && s.legacy && s.legacy.impacto_espiritual), 'textos oficiais seguros; impacto espiritual e padrao emocional so em legacy');
const oficial = JSON.stringify(C.sistemas.map(s => [s.name, s.public_text, s.definition, s.emotional_pattern, s.spiritual_impact]).concat(C.faixas.map(f => [f.label, f.message_nutri, f.message_paciente])));
ok(!P.TERMOS_CAUSAIS.some(t => oficial.toLowerCase().includes(t)) && !/impacto espiritual|plexo solar|queda de frequ|dessintoniza/i.test(oficial), 'nenhum "impacto espiritual" causal, "plexo solar", "queda de frequencia" ou "dessintonizacao" no conteudo oficial');
const sug = C.regras.find(r => r.rule_type === 'suggestion');
ok(sug && sug.payload.automatica === false && sug.payload.executar_regras === false && sug.payload.mensagem === 'Não há sugestão automática validada para esta edição.', 'politica de sugestao: nenhuma automatica; mensagem oficial');
ok(!C.regras.some(r => /CMB-|REC-|SEL-/.test(r.target)) && !/"CMB-0|"REC-0|"SEL-0/.test(JSON.stringify(C.regras.filter(r => r.rule_type !== 'suggestion'))) && !/CMB-|REC-|SEL-/.test(saida), 'nenhuma CMB/REC/SEL como regra oficial nem na saida do motor (so citadas como legado na politica)');
ok(B.regraDisponivel('CMB-001') === false && B.regraDisponivel('REC-001') === false && B.regraDisponivel('SEL-001') === false, 'barreira: CMB-001, REC-001, SEL-001 indisponiveis');

titulo('VALIDADOR, HISTORICO E DETERMINISMO');
const v = P.validar(C);
ok(v.publicavel && v.total_erros === 0, 'validador no candidato: nenhum bloqueio metodologico (0 erros)');
ok(C.status === 'em_revisao' && C.version === 2 && C.code === 'HOLOS-V1' && !B.podeCalcularOficial() && erro(() => M.calcular({ responses: {}, methodology_package: C, mode: 'oficial' })).codigo === 'oficial_bloqueado', 'candidato HOLOS-V1@2 em_revisao: modo oficial recusa (gate tecnico pendente), barreira continua em homologacao');
ok(C.registros.length === 0 && !('responsavel' in D) && D.resumo.length === 15 && !/lideran/i.test(JSON.stringify(C)), 'nenhum registro de homologacao nem aprovacao criado pelo codigo (15 decisoes so como texto; nada atribuido a "Liderança")');
const base2 = P.importarInventario(inv, 'HOLOS-V1', 1);
ok(P.hashConteudo(base2) === P.hashConteudo(base) && C.lineage.parent_content_hash === P.hashConteudo(base) && C.lineage.parent_status === 'rascunho' && C.lineage.parent_version === 1, 'pacote antigo reproduzivel: mesmo hash ao reimportar; linhagem guarda versao, status e hash anteriores');
const vb = P.validar(base2), cods = new Set(vb.erros.map(e => e.codigo));
ok(!vb.publicavel && ['conflito_pendente', 'snt_pendente', 'politica_parcialidade_ausente', 'indice_incompleto', 'triada_incompleta', 'exemplo_sem_resultado', 'elemento_nao_aprovado'].every(c => cods.has(c)) && base2.associacoes.filter(a => a.question_stable_id === 'SNT-101' && a.destination_type === 'system').length === 2, 'o importado continua historico: os 12 bloqueios originais seguem apontados, SNT-101 com as duas linhas');
ok(base.perguntas.every(x => x.temporal_context === null) && base.associacoes.some(a => a.weight === 3), 'o pacote importado nao foi editado (sem contexto temporal, pesos 1/2/3 intactos)');
const C2 = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
ok(JSON.stringify(C2) === JSON.stringify(C) && C2.content_hash === C.content_hash && /^[0-9a-f]{64}$/.test(C.content_hash) && C.content_hash !== C.lineage.parent_content_hash, 'candidato deterministico: mesma entrada -> mesmo pacote e mesmo hash SHA-256 (diferente do anterior)');
ok(JSON.stringify(calc(ref('REF-03').entrada.responses)) === JSON.stringify(r3) && calc(ref('REF-03').entrada.responses).trace.hash_entrada === r3.trace.hash_entrada, 'motor deterministico: mesmo input + mesmas versoes = mesmo resultado e mesma trilha');
let check = ''; try { check = execFileSync('node', [RAIZ + 'scripts/pacote-candidato-v1.mjs', '--check'], { encoding: 'utf8' }); } catch (e) { check = String(e.stdout) + String(e.stderr); }
const art = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/pacote-metodologico-v1-candidato.json', 'utf8'));
ok(/pacote candidato em dia/.test(check) && art.candidato.content_hash === C.content_hash && art.candidato.erros_validador === 0 && art.candidato.referencias.every(r => r.divergencias.length === 0), 'artefato gravado (JSON + SQL do harness) em dia com o gerador; hash e REFs conferem');
const fonteMotor = readFileSync(RAIZ + 'metodologia-motor.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok(!/HOLOSCAN|indiceDoMotor|combinacoesDoMotor|\.csv|CorpoBancos|MetodologiaInventario|CMB-|REC-|SEL-|soma\s*\*\s*2/.test(fonteMotor), 'motor sem fallback: nao le CSV, app.js, holoscan.js, inventario nem CMB/REC/SEL');
const cod = (mut) => { const p = JSON.parse(JSON.stringify(C)); mut(p); return P.validar(p).erros.map(e => e.codigo); };
ok(cod(p => { p.perguntas[0].temporal_context = 'ontem'; }).includes('contexto_temporal_invalido') && cod(p => { p.perguntas[0].temporal_context = null; }).includes('contexto_temporal_ausente'), 'validador: contexto temporal invalido / ausente');
ok(cod(p => { const a = p.associacoes.find(x => x.question_stable_id === 'SNT-101' && x.role === 'secondary_contextual'); a.role = 'primaria'; a.weight = 1; }).includes('primaria_multipla') && cod(p => { p.associacoes.find(x => x.role === 'secondary_contextual').weight = 3; }).includes('secundaria_pontuavel'), 'validador: dois primarios / secundaria com peso');
ok(cod(p => { p.associacoes.find(x => x.question_stable_id === 'ESP-501' && x.destination_type === 'triad').destination_id = 'mental'; }).includes('triade_eixo_divergente') && cod(p => { p.sistemas[0].spiritual_impact = 'x'; }).includes('texto_causal_legado') && cod(p => { p.faixas[0].message_nutri += ' bloqueio no plexo solar'; }).includes('texto_causal'), 'validador: eixo fora do bloco / texto causal legado / termo causal em mensagem');
ok(cod(p => { p.regras.find(r => r.rule_type === 'suggestion').payload.automatica = true; }).includes('sugestao_automatica_proibida') && cod(p => { p.regras.find(r => r.rule_type === 'absence').payload.denominador = 'completo'; }).includes('politica_parcialidade_invalida') && cod(p => { p.regras.find(r => r.target === 'REF-03').payload.esperado.indice = '60'; }).includes('exemplo_divergente'), 'validador: sugestao automatica / denominador completo / exemplo divergente do motor');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
