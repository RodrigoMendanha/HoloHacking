/**
 * FECHAMENTO DOS CINCO SISTEMAS (motor de resultados V1, 12/10, itens 5-14; testes 5, 7-13 do item 41).
 * So o modulo (Node, sem navegador): sistemas-fechamento.js sobre snapshots ficticios.
 *   - A..G de cada sistema com os textos aprovados; nota/faixa/ordem nunca mudam
 *   - "1a/2a area para aprofundar" (nunca gravidade/risco), significado comum das notas
 *   - sinais = os dominantes reais do snapshot (ate 3), com a ressalva de contribuicao (nunca "causou")
 *   - Proximo passo SO do catalogo congelado; trocar os sinais nao troca a ferramenta
 *   - linguagem proibida por sistema; Detox prioritario sem texto aprovado = PENDENCIA (so profissional)
 */
import './guarda-falhas.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require('../resultado-sintese.js');
require('../sistemas-fechamento.js');
const SF = globalThis.SistemasFechamento;

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const IDS = ['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual'];
const NOMES = { fungico: 'Fúngico', acido_inflamatorio: 'Ácido-Inflamatório', metabolico: 'Metabólico', detox_linfatico: 'Detox + Linfático', mental_emocional_espiritual: 'Mental-Emocional-Espiritual' };
const faixa = n => n < 10 / 3 ? 'baixa' : n < 20 / 3 ? 'intermediaria' : 'alta';
const dom = (sis, k) => Array.from({ length: k }, (_, i) => ({ question_id: sis.slice(0, 3).toUpperCase() + '-0' + (i + 1), enunciado: 'Enunciado aprovado ' + sis + ' ' + (i + 1), pontos: 3 - i }));
function snapCom(notas, opts = {}) {
  const sistemas = IDS.map(id => ({ sistema: id, nome: NOMES[id], nota: notas[id], faixa: notas[id] === null ? null : faixa(notas[id]), avaliavel: notas[id] !== null,
    respondidos: 10, total_marcadores: 12, dominantes: opts.semDominantes ? undefined : dom(id, 3) }));
  const ord = sistemas.filter(s => s.avaliavel).sort((a, b) => a.nota - b.nota);
  const s1 = ord[0] && ord[0].sistema, s2 = ord[1] && ord[1].sistema;
  return { template_version: opts.template || 4, holoscan: { sistemas, triada: {}, triada_com_dado: {} },
    proximos_passos: { registrado: true, catalogo: { code: 'HOLOS-RECOMENDACOES-V1', version: 1 },
      systems_order: ord.slice(0, 2).map(s => ({ system_id: s.sistema, nome: s.nome, dominantes: dom(s.sistema, 2).map(d => ({ question_id: d.question_id, rotulo: d.enunciado + ' (PP)' })) })),
      selection: [
        { tool_id: 'mapa_rotina_v1', system_id: s1, papel: 'principal', rank: 1, rule_id: 'REC-X-01', professional_reason: 'Razão aprovada do catálogo 1.', next_action: 'Ação aprovada do catálogo 1.' },
        { tool_id: 'gatilhos_respostas_v1', system_id: s1, papel: 'complementar', rank: 2, rule_id: 'REC-X-02', professional_reason: 'Razão aprovada do catálogo 2.', next_action: 'Ação aprovada do catálogo 2.' },
        { tool_id: 'oq3', system_id: s2, papel: 'complementar', rank: 1, rule_id: 'REC-Y-01', professional_reason: 'Razão aprovada do catálogo 3.', next_action: 'Ação aprovada do catálogo 3.' }] } };
}
const htmlDe = (fs, visao) => fs.map(f => SF.htmlSistema(f, visao, { faixaPaciente: x => ({ baixa: 'Mais marcadores neste eixo', intermediaria: 'Alguns marcadores neste eixo', alta: 'Menos marcadores neste eixo' })[x] })).join('');
const texto = html => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const semBlocoE = html => html.replace(/<div class="sf-bloco sf-e">[\s\S]*?<\/div>/g, '');

/* 1. o caso ficticio Carla (notas reais do caso de teste): MEE 5,4 · MET 5,5 · FUN 6,9 · DTL 6,9 · AIN 7,5 */
const carla = snapCom({ fungico: 6.9, acido_inflamatorio: 7.5, metabolico: 5.5, detox_linfatico: 6.9, mental_emocional_espiritual: 5.4 });
const antes = JSON.stringify(carla.holoscan);
const fs = SF.deResultado(carla);
const por = id => fs.find(f => f.sistema === id);
ok(JSON.stringify(carla.holoscan) === antes && fs.every((f, i) => f.resultado.nota === carla.holoscan.sistemas[i].nota && f.resultado.faixa === carla.holoscan.sistemas[i].faixa),
  'o fechamento não muda nota, faixa nem o snapshot (só lê)');
ok(fs.map(f => f.sistema).join() === IDS.join(), 'os cinco sistemas, na ordem do pacote');
ok(por('mental_emocional_espiritual').resultado.posicao === 1 && por('metabolico').resultado.posicao === 2 && por('acido_inflamatorio').resultado.posicao === 5,
  'posição = a ordem "Por onde investigar" (menor nota primeiro)');
const ordSintese = window.ResultadoSintese.fatos(carla).ordem.map(s => s.sistema);
ok(fs.slice().sort((a, b) => a.resultado.posicao - b.resultado.posicao).map(f => f.sistema).join() === ordSintese.join(),
  'teste 5: a ordem do fechamento é idêntica à da Síntese HOLOS (mesmo ordenador)');
ok(por('mental_emocional_espiritual').resultado.prioridade === '1ª área para aprofundar' && por('metabolico').resultado.prioridade === '2ª área para aprofundar'
  && por('fungico').resultado.prioridade === null, 'item 13: "1ª área para aprofundar" / "2ª área para aprofundar"; as demais sem rótulo de prioridade');
ok(IDS.every(id => por(id).organiza === SF.SISTEMAS[id].definicao) && por('fungico').organiza.startsWith('Categoria autoral que organiza determinados relatos digestivos'),
  'A: definição segura aprovada de cada sistema (itens 7-11, literal)');
ok(por('metabolico').aprofundamento === SF.SISTEMAS.metabolico.prioritario && por('mental_emocional_espiritual').aprofundamento === SF.SISTEMAS.mental_emocional_espiritual.prioritario
  && por('fungico').aprofundamento === SF.NAO_PRIORITARIO && por('acido_inflamatorio').aprofundamento === SF.NAO_PRIORITARIO,
  'F: texto "se prioritário" nas duas primeiras áreas; "relativamente menos marcadores" nas demais');
ok(por('acido_inflamatorio').significado === SF.SIGNIFICADO.alta && por('metabolico').significado === SF.SIGNIFICADO.intermediaria && /Não significa ausência de doença/.test(por('acido_inflamatorio').nao_significa),
  'D/E: significado comum das notas pela faixa salva (item 6), com o que NÃO significa');

/* 8. os sinais sao os reais (ate 3, texto aprovado) e nunca "causa" */
const mee = por('mental_emocional_espiritual');
ok(mee.contribuiu.sinais.length === 3 && mee.contribuiu.sinais.every((s, i) => s.texto === 'Enunciado aprovado mental_emocional_espiritual ' + (i + 1)) && mee.contribuiu.origem === 'resultado',
  'teste 8: explicação usa os sinais dominantes reais do snapshot (até 3, texto aprovado da pergunta)');
const prof = htmlDe(fs, 'profissional'), pac = htmlDe(fs, 'paciente');
ok(prof.includes(SF.INTRO_SINAIS) && prof.includes(SF.RESSALVA_SINAIS) && !/causou|causa da nota|por causa/i.test(texto(prof + pac)),
  'item 12: "Alguns dos sinais que mais contribuíram…" + "estes foram alguns dos itens…"; nunca "isso causou"');

/* 7. os sinais nao escolhem a ferramenta */
const outro = JSON.parse(JSON.stringify(carla));
outro.holoscan.sistemas.forEach(s => { s.dominantes = s.dominantes.slice().reverse().map(d => Object.assign({}, d, { question_id: 'TROCADO-' + d.question_id })); });
const pp1 = SF.deResultado(carla).map(f => f.proximo_passo.map(p => p.tool_id).join('+')).join('|');
const pp2 = SF.deResultado(outro).map(f => f.proximo_passo.map(p => p.tool_id).join('+')).join('|');
ok(pp1 === pp2 && pp1 === '||oq3||mapa_rotina_v1+gatilhos_respostas_v1', 'teste 7: trocar os sinais dominantes não muda nenhuma ferramenta (as do catálogo seguem o SISTEMA)');
const sel = carla.proximos_passos.selection;
const fsSel = SF.deResultado(snapCom({ fungico: 2, acido_inflamatorio: 7.5, metabolico: 3, detox_linfatico: 6.9, mental_emocional_espiritual: 8 }));
const fung = fsSel.find(f => f.sistema === 'fungico');
ok(fung.proximo_passo.map(p => p.tool_id).join() === 'mapa_rotina_v1,gatilhos_respostas_v1' && fung.proximo_passo[0].investiga === 'Razão aprovada do catálogo 1.'
  && fung.proximo_passo[0].fazer_agora === 'Ação aprovada do catálogo 1.' && fung.proximo_passo[0].por_que === SF.PP_POR_QUE && fung.proximo_passo[0].sinais_intro === SF.PP_SINAIS,
  'G (item 14): ferramenta do catálogo congelado, com "por que" (texto seguro), "o que investiga" (razão aprovada), "o que fazer agora" (ação aprovada) e os sinais');
ok(fsSel.filter(f => !f.resultado.prioridade).every(f => f.proximo_passo.length === 0), 'G só nas áreas prioritárias; nenhuma ferramenta inventada para as outras');
ok(sel.length === 3, 'teste 6: a seleção do catálogo congelada não é alterada pelo fechamento');

/* 9-13. linguagem proibida (fora do bloco E, onde os termos de "todos" aparecem só negados) */
const casos = [carla, snapCom({ fungico: 1, acido_inflamatorio: 1.5, metabolico: 2, detox_linfatico: 2.5, mental_emocional_espiritual: 9 }),
  snapCom({ fungico: 9, acido_inflamatorio: 9, metabolico: 9, detox_linfatico: 1, mental_emocional_espiritual: 2 })];
const todoHtml = casos.map(c => { const f = SF.deResultado(c); return htmlDe(f, 'profissional') + htmlDe(f, 'paciente'); }).join('');
const baixo = texto(todoHtml).toLowerCase(), baixoSemE = texto(semBlocoE(todoHtml)).toLowerCase();
const nomeTeste = { fungico: 'teste 9: Fúngico nunca diz candidíase/fungos/infecção', acido_inflamatorio: 'teste 10: Ácido-Inflamatório nunca afirma inflamação sistêmica/acidose/pH',
  metabolico: 'teste 11: Metabólico nunca diz diabetes/resistência à insulina/tireoide', detox_linfatico: 'teste 12: Detox nunca afirma toxinas/detoxificação/falha linfática',
  mental_emocional_espiritual: 'teste 13: MEE nunca diz transtorno/doença psicológica/trauma' };
IDS.forEach(id => {
  const achados = SF.PROIBIDOS[id].filter(t => id === 'acido_inflamatorio' && t === 'pH' ? /\bph\b/i.test(baixo) : baixo.includes(t.toLowerCase()));
  ok(!achados.length, nomeTeste[id] + (achados.length ? ' [achou: ' + achados.join(', ') + ']' : ''));
});
const geral = SF.PROIBIDOS.todos.filter(t => baixoSemE.includes(t));
ok(!geral.length, 'item 13: nunca "mais grave", "pior sistema", "prioridade clínica", "risco" (fora da negação do item 6)' + (geral.length ? ' [' + geral.join(', ') + ']' : ''));

/* Detox prioritario: sem texto aprovado -> PENDENCIA, so na visao profissional */
const fd = SF.deResultado(casos[2]).find(f => f.sistema === 'detox_linfatico');
ok(fd.resultado.posicao === 1 && fd.aprofundamento === null && fd.pendencias[0] === SF.PENDENCIA_PRIORITARIO,
  'Detox + Linfático prioritário: sem texto aprovado de aprofundamento → PENDÊNCIA METODOLÓGICA (nada inventado)');
const fdProf = SF.htmlSistema(fd, 'profissional'), fdPac = SF.htmlSistema(fd, 'paciente');
ok(fdProf.includes(SF.SELO_PENDENCIA) && !fdPac.includes('PENDÊNCIA') && !/REC-|rule|respondidas/.test(fdPac),
  'a pendência aparece só para a nutricionista; a paciente não vê pendência, regra nem cobertura');

/* paciente: faixa em linguagem de comunicacao; proximo passo so quando compartilhado */
ok(!/faixa (baixa|intermediaria|intermediária|alta)/i.test(pac) && /(Mais|Alguns|Menos) marcadores neste eixo/.test(pac), 'paciente: "Mais/Alguns/Menos marcadores neste eixo", nunca "faixa baixa"');
ok(!pac.includes('sf-pp') && SF.htmlSistema(por('mental_emocional_espiritual'), 'paciente', { mostrarPP: true }).includes('Próximo aprofundamento sugerido'),
  'paciente: próximo aprofundamento só quando a nutricionista compartilhou os Próximos Passos');

/* sem nota / sem dominantes (resultado antigo) */
const semNota = SF.deResultado(snapCom({ fungico: null, acido_inflamatorio: 7.5, metabolico: 5.5, detox_linfatico: 6.9, mental_emocional_espiritual: 5.4 })).find(f => f.sistema === 'fungico');
ok(semNota.resultado.posicao === null && semNota.contribuiu.sinais.length === 0 && semNota.aprofundamento === null && /Sem nota/.test(semNota.significado),
  'sistema sem nota: sem posição, sem sinais, sem aprofundamento — só o fato');
const antigo = snapCom({ fungico: 6.9, acido_inflamatorio: 7.5, metabolico: 5.5, detox_linfatico: 6.9, mental_emocional_espiritual: 5.4 }, { semDominantes: true, template: 3 });
const fa = SF.deResultado(antigo);
ok(fa.find(f => f.sistema === 'mental_emocional_espiritual').contribuiu.origem === 'proximos_passos' && fa.find(f => f.sistema === 'fungico').contribuiu.sinais.length === 0 && SF.historico(antigo) && !SF.historico(carla),
  'resultado antigo (template < 4): sinais só dos Próximos Passos congelados (nada recalculado) e marcado como histórico');
ok(SF.ROTULO_HISTORICO === 'Gerado com o motor de resultados atual a partir do registro histórico.', 'item 40: rótulo literal do registro histórico');

console.log(falhou ? '\nFALHOU' : '\nfechamento dos cinco sistemas: tudo ok');
process.exit(falhou ? 1 : 0);
