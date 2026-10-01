/**
 * V1 — ETAPA 4 — MOTOR METODOLOGICO GENERICO, com PACOTES FICTICIOS DE TESTE
 * (TEST_FIXTURE_ONLY — nao representam o HoloHacking; nunca copiados ao V1).
 *
 *  - contrato de entrada/saida; mode/package_status/package_version na saida
 *  - determinismo: mesma entrada + mesmas versoes = mesmo resultado; trilha por contribuicao
 *  - direta e invertida; primaria pontua, secondary_contextual so contexto (Etapa 4.2)
 *  - ausencia != 0; 0 valido = respondido; recusado/nao aplicavel nao sao resposta valida (reduzem a cobertura)
 *  - orientacao ausente = erro (nunca vira direta)
 *  - aritmetica racional exata: nota_exata, exibicao com 1 casa, faixa pela fracao
 *  - ID desconhecido, valor fora da escala, opcao inexistente = erro (nunca zero silencioso)
 *  - faixas (inclusividade), Indice (alphas, sem indice parcial), Triada por ID
 *  - modo OFICIAL recusa pacote rascunho / nao vigente / nao publicavel; sem fallback
 *  - cobertura minima aprovada no fixture bloqueia nota; cobertura bruta preservada
 *  - validador: duplicado, orfa, escala/orientacao/peso ausentes, faixa com lacuna/sobreposicao, SNT pendente
 */
import './guarda-falhas.mjs';
import '../metodologia-pacote.js';
import '../metodologia-motor.js';
import '../metodologia.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, B = globalThis.Metodologia;

function fixture(extra) {
  const p = P.novo('TEST_FIXTURE_ONLY', 1, Object.assign({ status: 'aprovado', effective_from: '2026-01-01', content_hash: 'fixture', responsible: 'fixture (teste)', reviewed_by: 'f', reviewed_at: 'x', approved_at: 'x', approved_by: 'f' }, extra || {}));
  p.escalas = [{ code: 'e03', min_value: 0, max_value: 3, labels: ['Nunca', 'Às vezes', 'Frequente', 'Sempre'], status: 'aprovado' }];
  p.sistemas = [{ code: 'A', name: 'Sistema A', status: 'aprovado' }, { code: 'B', name: 'Sistema B', status: 'aprovado' }];
  p.perguntas = [
    { stable_id: 'Q1', statement: 'q1', block: 'fisico', scale_code: 'e03', orientation: 'direta', temporal_context: 'ultimos_30_dias', status: 'aprovado' },
    { stable_id: 'Q2', statement: 'q2', block: 'fisico', scale_code: 'e03', orientation: 'invertida', temporal_context: 'atualmente', status: 'aprovado' },
    { stable_id: 'Q3', statement: 'q3', block: 'mental_emocional', scale_code: 'e03', orientation: 'direta', temporal_context: 'habitualmente', status: 'aprovado' },
    { stable_id: 'Q4', statement: 'q4', block: 'espiritual', scale_code: 'e03', orientation: 'direta', temporal_context: 'sem_periodo_especifico', status: 'aprovado' }];
  p.associacoes = [
    { question_stable_id: 'Q1', destination_type: 'system', destination_id: 'A', weight: 2, role: 'primaria', status: 'aprovado' },
    { question_stable_id: 'Q1', destination_type: 'system', destination_id: 'B', weight: null, role: 'secondary_contextual', status: 'aprovado' },
    { question_stable_id: 'Q2', destination_type: 'system', destination_id: 'A', weight: 1, role: 'primaria', status: 'aprovado' },
    { question_stable_id: 'Q3', destination_type: 'system', destination_id: 'B', weight: 3, role: 'primaria', status: 'aprovado' },
    { question_stable_id: 'Q4', destination_type: 'system', destination_id: 'B', weight: 1, role: 'primaria', status: 'aprovado' },
    { question_stable_id: 'Q1', destination_type: 'triad', destination_id: 'fisico', weight: 2, status: 'aprovado' },
    { question_stable_id: 'Q2', destination_type: 'triad', destination_id: 'fisico', weight: 1, status: 'aprovado' },
    { question_stable_id: 'Q3', destination_type: 'triad', destination_id: 'mental', weight: 3, status: 'aprovado' },
    { question_stable_id: 'Q4', destination_type: 'triad', destination_id: 'espiritual', weight: 1, status: 'aprovado' }];
  for (const s of ['A', 'B']) p.faixas.push(
    { destination_type: 'system', destination_id: s, lower_bound: 0, upper_bound: 5, lower_inclusive: true, upper_inclusive: true, label: 'baixo', status: 'aprovado' },
    { destination_type: 'system', destination_id: s, lower_bound: 5, upper_bound: 10, lower_inclusive: false, upper_inclusive: true, label: 'alto', status: 'aprovado' });
  p.faixas.push({ destination_type: 'index', destination_id: 'global', lower_bound: 0, upper_bound: 50, lower_inclusive: true, upper_inclusive: false, label: 'metade-baixa', status: 'aprovado' }, { destination_type: 'index', destination_id: 'global', lower_bound: 50, upper_bound: 100, lower_inclusive: true, upper_inclusive: true, label: 'metade-alta', status: 'aprovado' });
  p.regras = [
    { rule_type: 'scoring', target: 'A', payload: { formula: 'fixture' }, status: 'aprovado' }, { rule_type: 'scoring', target: 'B', payload: { formula: 'fixture' }, status: 'aprovado' },
    { rule_type: 'absence', target: 'global', payload: { denominador: 'respondidos', cobertura_minima: 0.5, recusado: 'exclui', nao_aplicavel: 'exclui', minimos: {} }, status: 'aprovado' },
    { rule_type: 'index', target: 'global', payload: { alphas: { A: 0.5, B: 0.5 }, elegibilidade: 'todos', indice_parcial: false }, status: 'aprovado' },
    ...['fisico', 'mental', 'espiritual'].map(e => ({ rule_type: 'triad', target: e, payload: { contribuicao: 'por_id', escala: '0..10', elegibilidade: 'cobertura_minima', cobertura_minima: 0.5, agregacao: 'ponderada' }, status: 'aprovado' })),
    { rule_type: 'example', target: 'ex1', payload: { entrada: { Q1: 3, Q2: 0 }, esperado: { A: { nota: 0 } } }, status: 'aprovado' }];
  return p;
}
const calc = (resp, extra) => M.calcular(Object.assign({ responses: resp, methodology_package: fixture(), mode: 'oficial', engine_version: 'teste-1', questionnaire_edition: { code: 'fx-q', version: 1 } }, extra || {}));

titulo('CONTRATO, DETERMINISMO, TRILHA');
const r = calc({ Q1: 3, Q2: 0, Q3: 1, Q4: 2 });
ok(['mode', 'package_status', 'package_version', 'package_code', 'package_content_hash', 'engine_version', 'engine_contract_version', 'edition', 'coverage', 'item_contributions', 'contextual_associations', 'system_results', 'index_result', 'triad_result', 'non_evaluable_reasons', 'trace'].every(k => k in r), 'saida carrega todos os campos do contrato (inclusive contrato do motor e associacoes contextuais)');
ok(r.mode === 'oficial' && r.package_status === 'aprovado' && r.package_version === 1 && r.engine_version === 'teste-1' && r.edition.code === 'fx-q', 'mode, package_status, package_version, engine_version e edicao na saida');
const r2 = calc({ Q4: 2, Q3: 1, Q2: 0, Q1: 3 });
ok(JSON.stringify(r) === JSON.stringify(r2), 'determinismo: mesma entrada (em outra ordem) + mesmas versoes = mesmo resultado');
ok(r.trace.hash_entrada === r2.trace.hash_entrada && r.trace.hash_entrada !== calc({ Q1: 2, Q2: 0, Q3: 1, Q4: 2 }).trace.hash_entrada, 'hash da entrada estavel e sensivel a resposta diferente');
const c1 = r.item_contributions.find(c => c.question_id === 'Q1' && c.destination === 'A');
ok(c1 && c1.raw_response === 3 && c1.oriented_value === 3 && c1.weight === 2 && c1.contribution === 6 && c1.max === 6, 'trilha: question_id, raw_response, oriented_value, destination, weight, contribution');
ok(r.item_contributions.length === 8 && r.contextual_associations.length === 1 && r.trace.passos.length === 2 + 1 + 3, 'uma contribuicao por associacao pontuavel respondida (4 primarias + 4 Triada); a secondary_contextual fica a parte; passos de sistema, indice e triada');

titulo('DIRETA, INVERTIDA, MULTIPLAS ASSOCIACOES, FAIXAS');
const c2 = r.item_contributions.find(c => c.question_id === 'Q2' && c.destination === 'A');
ok(c2.raw_response === 0 && c2.oriented_value === 3 && c2.contribution === 3, 'invertida: resposta 0 vira valor orientado 3 (max - resposta)');
ok(r.system_results.A.carga === 10 && r.system_results.A.nota === 0 && r.system_results.A.faixa === 'baixo', 'sistema A: (6+3)/(6+3) = carga 10, nota 0, faixa baixo');
ok(r.system_results.B.respondidos === 2 && r.system_results.B.total === 2 && r.system_results.B.nota_exata === '35/6' && r.system_results.B.nota_exibicao === '5.8' && r.system_results.B.faixa === 'alto' && r.contextual_associations[0].question_id === 'Q1' && r.contextual_associations[0].contribution === null && !r.item_contributions.some(c => c.question_id === 'Q1' && c.destination === 'B'), 'sistema B so com as primarias Q3 + Q4 (nota 35/6 = 5,8): Q1 secondary_contextual nao soma, nao entra no denominador nem na cobertura');
ok(calc({ Q1: 0, Q2: 3, Q3: 0, Q4: 0 }).system_results.A.nota === 10 && calc({ Q1: 0, Q2: 3, Q3: 0, Q4: 0 }).system_results.A.faixa === 'alto', 'resposta 0 em direta e 3 em invertida = nota 10, faixa alto (limite 5 exclusivo abaixo)');
ok(calc({ Q1: 3, Q2: 1, Q3: 0, Q4: 0 }).system_results.A.nota_exata === '10/9' && calc({ Q1: 3, Q2: 1, Q3: 0, Q4: 0 }).system_results.A.nota_exibicao === '1.1' && calc({ Q1: 3, Q2: 1, Q3: 0, Q4: 0 }).system_results.A.faixa === 'baixo', 'faixa le a nota exata (6+2)/9 -> nota 10/9 (tela 1.1), nao arredondada');
const limite = calc({ Q1: 1, Q2: 2, Q3: 0, Q4: 0 }); // A: (2 + 1)/(6+3) -> carga 3.3333 nota 6.6667
ok(limite.system_results.A.nota_exata === '20/3' && limite.system_results.A.nota_exibicao === '6.7' && limite.system_results.A.faixa === 'alto', 'inclusividade respeitada: nota 20/3 (tela 6.7) cai em (5, 10]');

titulo('AUSENCIA != 0; 0 VALIDO = RESPONDIDO; RECUSA E NAO APLICAVEL');
const aus = calc({ Q1: 0, Q2: null, Q3: 1, Q4: 0 });
ok(aus.coverage.respondidos === 3 && aus.coverage.pendentes === 1 && aus.coverage.em_branco === 1 && aus.coverage.fracao === '3/4' && aus.coverage.rotulo === 'cobertura de preenchimento' && aus.coverage.total === 4, 'ausencia (null) nao conta como respondida; 0 conta — cobertura de preenchimento 3/4');
ok(aus.system_results.A.respondidos === 1 && aus.system_results.A.nota === 10 && !aus.item_contributions.some(c => c.question_id === 'Q2'), 'Q2 ausente: nenhuma contribuicao, nenhum zero inventado; A so com Q1 (0 => nota 10 do que foi respondido)');
const zero = calc({ Q1: 0, Q2: 3, Q3: 0, Q4: 0 });
ok(zero.item_contributions.filter(c => c.question_id === 'Q1').length === 2 && zero.item_contributions.find(c => c.question_id === 'Q1').contribution === 0 && zero.coverage.respondidos === 4, '0 valido e respondido: entra na trilha (sistema primario + Triada) com contribuicao 0 e no denominador');
const rec = calc({ Q1: 3, Q2: 0, Q3: 2, Q4: 2 }, { response_states: { Q3: 'recusado', Q4: 'nao_aplicavel' } });
ok(rec.coverage.recusados === 1 && rec.coverage.nao_aplicaveis === 1 && rec.coverage.respondidos === 2 && !rec.item_contributions.some(c => c.question_id === 'Q3' || c.question_id === 'Q4'), 'recusado e nao aplicavel contados a parte: nao sao resposta valida, nao viram zero');
ok(rec.system_results.B.avaliavel === false && /nenhum item primario respondido/.test(rec.system_results.B.motivo) && rec.system_results.B.nota === null && rec.system_results.B.cobertura === 0, 'B sem nenhuma resposta valida (recusado + nao aplicavel): cobertura 0, sem nota, com motivo; nada e inventado');
const erroOri = (() => { const semOri = fixture(); semOri.perguntas[0].orientation = null; try { M.calcular({ responses: { Q1: 3, Q2: 0, Q3: 1, Q4: 1 }, methodology_package: semOri, mode: 'homologacao' }); return null; } catch (e) { return e; } })();
ok(erroOri && erroOri.codigo === 'orientacao_ausente' && /nunca inferida/.test(erroOri.message), 'orientacao ausente num item respondido = ERRO (nunca tratada como direta)');

titulo('VALORES INVALIDOS = ERRO DE VALIDACAO');
const erro = (f) => { try { f(); return null; } catch (e) { return e; } };
ok(erro(() => calc({ Q9: 1 })).codigo === 'id_desconhecido', 'ID desconhecido: erro id_desconhecido');
ok(erro(() => calc({ Q1: 4 })).codigo === 'valor_fora_da_escala' && erro(() => calc({ Q1: -1 })).codigo === 'valor_fora_da_escala' && erro(() => calc({ Q1: 1.5 })).codigo === 'valor_fora_da_escala', 'valor fora da escala (4, -1, 1.5): erro, nunca zero');
ok(erro(() => calc({ Q1: 1 }, { response_states: { Q7: 'recusado' } })).codigo === 'id_desconhecido', 'estado para ID desconhecido: erro');
ok(erro(() => M.calcular({ responses: { Q1: 1 }, mode: 'oficial' })).codigo === 'pacote_ausente', 'sem pacote: configuracao metodologica indisponivel (erro)');

titulo('INDICE E TRIADA');
ok(r.index_result.avaliavel && r.index_result.valor_exato === '175/6' && r.index_result.valor_exibicao === '29.2' && r.index_result.faixa === 'metade-baixa', 'Indice = 10 x (0,5 x 0 + 0,5 x 35/6) = 175/6 (tela 29.2); faixa do Indice do fixture');
const parcial = calc({ Q3: 2, Q4: 1 });
ok(parcial.system_results.A.avaliavel === false && parcial.index_result.avaliavel === false && /sistema\(s\) nao avaliavel\(is\): A/.test(parcial.index_result.motivo) && parcial.index_result.valor === null, 'sistema A sem resposta: sem Indice (sem Indice parcial), motivo registrado, nada renormalizado');
ok(r.triad_result.fisico.nota_exata === '0' && r.triad_result.mental.nota_exata === '20/3' && r.triad_result.espiritual.nota_exata === '10/3', 'Triada por ID: fisico (Q1,Q2), mental (Q3), espiritual (Q4), em fracao exata');
ok(parcial.triad_result.fisico.avaliavel === false && parcial.triad_result.fisico.nota === null && /sem dados suficientes/.test(parcial.triad_result.fisico.motivo), 'eixo sem dados: nulo com motivo (nunca 10)');

titulo('MODO OFICIAL x MODO HOMOLOGACAO');
const rasc = fixture({ status: 'rascunho' });
const eo = erro(() => M.calcular({ responses: { Q1: 1 }, methodology_package: rasc, mode: 'oficial' }));
ok(eo && eo.codigo === 'oficial_bloqueado' && /rascunho/.test(eo.message), 'modo oficial recusa pacote rascunho (sem fallback)');
const naoVig = fixture({ effective_from: '2099-01-01' });
ok(erro(() => M.calcular({ responses: { Q1: 1 }, methodology_package: naoVig, mode: 'oficial' })).codigo === 'oficial_bloqueado', 'modo oficial recusa pacote aprovado nao vigente');
const naoPub = fixture(); naoPub.regras = naoPub.regras.filter(x => x.rule_type !== 'absence');
ok(erro(() => M.calcular({ responses: { Q1: 1 }, methodology_package: naoPub, mode: 'oficial' })).codigo === 'oficial_bloqueado', 'modo oficial recusa pacote aprovado que o validador reprova');
const h = M.calcular({ responses: { Q1: 1, Q2: 1, Q3: 1, Q4: 1 }, methodology_package: rasc, mode: 'homologacao' });
ok(h.mode === 'homologacao' && h.package_status === 'rascunho' && h.package_version === 1 && h.oficial === false && h.system_results.A.nota !== null, 'modo homologacao executa o rascunho e marca mode/package_status/package_version');
ok(B.ehSaidaHomologacao(h) === true && B.ehSaidaHomologacao(r) === false && erro(() => B.aceitarSaida(h)) !== null && B.aceitarSaida(r) === r, 'barreira: Metodologia.ehSaidaHomologacao reconhece a saida de homologacao e aceitarSaida a recusa');
const semPol = fixture(); semPol.regras.find(x => x.rule_type === 'absence').payload.denominador = null;
const sp = M.calcular({ responses: { Q1: 1, Q2: 1 }, methodology_package: semPol, mode: 'homologacao' });
ok(sp.system_results.A.nota === null && /sem politica de denominador aprovada/.test(sp.system_results.A.motivo) && sp.coverage.respondidos === 2 && sp.item_contributions.length > 0, 'sem politica de denominador: dados, trilha e cobertura preservados; nota bloqueada com motivo');

titulo('VALIDADOR DE PUBLICACAO (aponta, nao corrige)');
const v0 = P.validar(fixture());
ok(v0.publicavel && v0.total_erros === 0, 'fixture completo e publicavel');
const cod = (mut) => { const p = fixture(); mut(p); return P.validar(p).erros.map(e => e.codigo); };
ok(cod(p => p.perguntas.push({ stable_id: 'Q1', statement: 'dup', block: 'fisico', scale_code: 'e03', orientation: 'direta', status: 'aprovado' })).includes('id_duplicado'), 'ID duplicado detectado');
ok(cod(p => p.associacoes.push({ question_stable_id: 'Q99', destination_type: 'system', destination_id: 'A', weight: 1, status: 'aprovado' })).includes('referencia_inexistente'), 'associacao para pergunta inexistente detectada');
ok(cod(p => p.perguntas.push({ stable_id: 'Q5', statement: 'x', block: 'fisico', scale_code: 'e03', orientation: 'direta', status: 'aprovado' })).includes('associacao_orfa'), 'associacao orfa (pergunta sem sistema) detectada');
ok(cod(p => { p.perguntas[0].scale_code = 'e99'; }).includes('referencia_inexistente') && cod(p => { p.perguntas[0].scale_code = null; }).includes('escala_ausente'), 'escala inexistente / ausente detectada');
ok(cod(p => { p.perguntas[0].orientation = null; }).includes('orientacao_ausente'), 'orientacao ausente detectada (nao preenchida)');
ok(cod(p => { p.associacoes[0].weight = null; }).includes('peso_ausente'), 'peso obrigatorio ausente detectado');
ok(cod(p => { p.faixas[1].lower_bound = 6; }).includes('faixa_lacuna') && cod(p => { p.faixas[1].lower_inclusive = true; }).includes('faixa_sobreposta') && cod(p => { p.faixas[0].upper_bound = -1; }).includes('faixa_ordem_invalida'), 'lacuna, sobreposicao e ordem invalida de faixas detectadas');
ok(cod(p => { p.associacoes[0].conflict = true; p.associacoes[0].question_stable_id = 'SNT-101'; p.perguntas[0].stable_id = 'SNT-101'; p.associacoes[5].question_stable_id = 'SNT-101'; }).includes('snt_pendente'), 'SNT pendente detectado');
ok(cod(p => { p.regras = p.regras.filter(x => x.rule_type !== 'index'); }).includes('indice_incompleto') && cod(p => { p.regras.find(x => x.rule_type === 'index').payload.alphas.A = 0.7; }).includes('indice_incompleto'), 'configuracao do Indice incompleta / alphas nao somam 1');
ok(cod(p => { p.regras = p.regras.filter(x => x.target !== 'mental'); }).includes('triada_incompleta') && cod(p => { p.regras = p.regras.filter(x => x.rule_type !== 'example'); }).includes('exemplo_sem_resultado') && cod(p => { p.perguntas[0].status = 'rascunho'; }).includes('elemento_nao_aprovado'), 'Triada incompleta, exemplo sem resultado e elemento nao aprovado detectados');

titulo('O FIXTURE NAO E O HOLOHACKING');
const inv = (await import('node:fs')).readFileSync(new URL('../docs/v1/metodologia/inventario-metodologico-v1.json', import.meta.url), 'utf8');
ok(!/TEST_FIXTURE_ONLY|"Q1"|Sistema A/.test(inv), 'nenhum valor do fixture aparece no inventario V1');
ok(fixture().code === P.TEST_FIXTURE, 'fixture identificado como TEST_FIXTURE_ONLY');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
