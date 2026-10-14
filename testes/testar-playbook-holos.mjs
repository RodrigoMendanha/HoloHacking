/**
 * PLAYBOOK HOLOS (PB-V1) — conteudo e selecao, sem navegador.
 *   P1  conteudo: 3 focos por sistema, 12 estrategias por sistema (4 Corpo, 4 Mente, 4 Espirito), 15 gerais, ids unicos
 *   P2  nenhum texto do playbook usa termo fora do metodo (a mesma lista do Resultado) nem quantidade (g, ml, kcal)
 *   P3  etiquetas so das 10 ferramentas oficiais
 *   P4  opcoes: focos dos 2 sistemas prioritarios; estrategias do sistema do foco primeiro, depois as que combinam com
 *       ferramentas aplicadas; nenhum sistema nao prioritario; gerais disponiveis
 *   P5  montarDirecao: itens da nutricionista, confirmados e compartilhados; no maximo 6 estrategias; ligacao ao
 *       direcionamento; a projecao da paciente traz foco, direcionamentos, plano, C/M/E, observe e proxima etapa
 *   P6  rastreabilidade: o id do item devolve o id do playbook; resumo com versao
 *   P7  Linha do Momentum so orienta a quantidade
 */
import './guarda-falhas.mjs';
await import('../resultado-direcao.js');
await import('../playbook-holos.js');
const PB = globalThis.PlaybookHolos;
const RD = globalThis.ResultadoDirecao;

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

/* P1 */
const sis = PB.SISTEMAS.map(s => s[0]);
ok(PB.FOCOS.length === 15 && sis.every(s => PB.FOCOS.filter(f => f.sistema === s).length === 3), 'P1 15 focos, 3 por sistema');
ok(sis.every(s => ['corpo', 'mente', 'espirito'].every(t => PB.ESTRATEGIAS.filter(e => e.sistema === s && e.territorio === t).length === 4)),
  'P1 12 estratégias por sistema: 4 Corpo, 4 Mente, 4 Espírito');
ok(PB.ESTRATEGIAS.filter(e => e.sistema === 'geral').length === 15, 'P1 15 estratégias gerais');
const ids = PB.FOCOS.map(f => f.id).concat(PB.ESTRATEGIAS.map(e => e.id));
ok(new Set(ids).size === ids.length && ids.length === 90, 'P1 90 ids únicos');
ok(PB.FOCOS.every(f => f.direcionamentos.length === 2 && f.observar.length === 3 && f.porque && f.proxima_etapa), 'P1 cada foco traz 2 direcionamentos, 3 itens de observe, por quê e próxima etapa');
ok(PB.ESTRATEGIAS.every(e => e.titulo && e.acao && e.contexto && e.observar), 'P1 cada estratégia tem o que fazer, quando e o que observar');

/* P2 */
const fora = PB.textos().map(t => ({ t, p: RD.termosFora(t) })).filter(x => x.p.length);
ok(fora.length === 0, 'P2 nenhum termo fora do método nos textos do playbook' + (fora.length ? ': ' + fora.slice(0, 3).map(x => x.p.join('/') + ' em "' + x.t + '"').join(' | ') : ''));
const qtd = PB.textos().filter(t => /\b\d+\s?(g|mg|ml|l|kg|kcal|litros?|gramas?)\b/i.test(t));
ok(qtd.length === 0, 'P2 sem quantidades de alimento ou de água' + (qtd.length ? ': ' + qtd[0] : ''));

/* P3 */
const oficiais = Object.keys(PB.NOME_FERR);
ok(oficiais.length === 10 && PB.ESTRATEGIAS.every(e => e.ferramentas.every(f => oficiais.includes(f))), 'P3 etiquetas só das 10 ferramentas oficiais');

/* P4 */
const op = PB.opcoes({ prioritarios: ['metabolico', 'mental_emocional_espiritual'], ferramentas: ['gatilhos_respostas_v1'], foco: 'ME-F1' });
ok(op.focos.length === 2 && op.focos[0].sistema === 'metabolico' && op.focos[0].focos.length === 3 && op.focos[1].sistema === 'mental_emocional_espiritual',
  'P4 focos dos 2 sistemas prioritários, na ordem do HOLOSCAN');
ok(op.focosOutros.length === 3, 'P4 os outros 3 sistemas ficam disponíveis à parte');
const grupos = op.estrategias.map(e => e.grupo);
ok(grupos.indexOf('prioritario') > grupos.lastIndexOf('foco') && grupos.indexOf('geral') > grupos.lastIndexOf('prioritario'), 'P4 ordem: sistema do foco → outro prioritário → gerais');
const doFoco = op.estrategias.filter(e => e.grupo === 'foco');
const primeiraSem = doFoco.findIndex(e => !e.combina.length);
ok(doFoco.length === 12 && doFoco.slice(0, primeiraSem).every(e => e.combina.includes('Gatilhos & Respostas')) && doFoco.slice(primeiraSem).every(e => !e.combina.length),
  'P4 dentro do sistema do foco, primeiro as que combinam com as ferramentas aplicadas');
ok(!op.estrategias.some(e => ['fungico', 'acido_inflamatorio', 'detox_linfatico'].includes(e.sistema)), 'P4 nenhum sistema não prioritário entra nas estratégias');
ok(op.estrategias.length === 12 + 12 + 15, 'P4 39 opções (12 + 12 + 15 gerais)');
const op2 = PB.opcoes({ prioritarios: ['metabolico', 'mental_emocional_espiritual'], ferramentas: [], foco: 'MEE-F1' });
ok(op2.sistemaFoco === 'mental_emocional_espiritual' && op2.estrategias[0].sistema === 'mental_emocional_espiritual', 'P4 trocar o foco muda o sistema que vem primeiro');

/* P5 */
const escolha = { foco: { id: 'ME-F1' }, estrategias: [{ id: 'ME-C1' }, { id: 'ME-C4', acao: 'Levar uma fruta para o fim da tarde.' }, { id: 'ME-M1' }, { id: 'MEE-C1' }, { id: 'G10' }, { id: 'G11' }, { id: 'G12' }] };
const m = PB.montarDirecao(escolha);
const todosItens = [m.foco_atual, m.proxima_etapa].concat(m.direcionamentos, m.estrategias, m.corpo, m.mente, m.espirito, m.observar);
ok(todosItens.every(it => it.origem === 'nutricionista' && it.confirmado === true && it.mostrar_paciente === true && it.sugestao === false && it.ref === null && it.id.length <= 64),
  'P5 itens escritos como escolha da nutricionista, confirmados e compartilhados');
ok(m.estrategias.length === 6, 'P5 no máximo 6 estratégias (a 7ª fica de fora)');
ok(m.estrategias[1].acao === 'Levar uma fruta para o fim da tarde.' && m.estrategias[0].prazo === PB.PRAZO_PADRAO, 'P5 a edição da nutricionista vale; prazo padrão "até o próximo encontro"');
ok(m.estrategias.every(e => m.direcionamentos.some(d => d.id === e.direcionamento_id)), 'P5 cada estratégia ligada a um direcionamento do foco');
ok(m.estrategias.every(e => e.status === 'proposta'), 'P5 estratégias novas com status "proposta" (não duplicam "Nesta fase, combinamos")');
const d = RD.normalizar(null, 'primeira');
d.foco_atual = m.foco_atual; d.proxima_etapa = m.proxima_etapa;
d.direcionamentos = m.direcionamentos; d.estrategias = m.estrategias; d.observar = m.observar;
d.corpo.itens = m.corpo; d.mente.itens = m.mente; d.espirito.itens = m.espirito;
ok(RD.focoConfirmado(d), 'P5 foco confirmado (o Resultado não fica "em construção")');
const dp = RD.projecaoPaciente(d);
ok(dp.foco_atual && /Organizar os horários/.test(dp.foco_atual.texto) && dp.direcionamentos.length === 2 && dp.estrategias.length === 6 && dp.observar.length === 3 && dp.proxima_etapa,
  'P5 projeção da paciente: foco, 2 direcionamentos, 6 estratégias, observe e próxima etapa');
ok(dp.corpo.itens.length >= 2 && dp.mente.itens.length >= 1 && dp.espirito.itens.length >= 1, 'P5 Corpo · Mente · Espírito preenchidos pelas estratégias escolhidas');
ok(RD.avisos(d).length === 0, 'P5 sem aviso de termo fora do método');
const html = RD.htmlPaciente(dp, [], {});
ok(/Foco desta fase/.test(html) && /Horários âncora/.test(html) && /Até o próximo encontro, observe/.test(html) && !/RESULTADO EM CONSTRUÇÃO/.test(html), 'P5 documento da paciente montado');
const livre = PB.montarDirecao({ foco: { livre: 'Foco escrito pela nutricionista' }, direcionamentos: [], estrategias: [{ id: 'G01' }] });
ok(livre.foco_atual.texto === 'Foco escrito pela nutricionista' && livre.direcionamentos.length === 0 && livre.estrategias[0].direcionamento_id === '', 'P5 foco livre (escrito pela nutricionista) funciona sem direcionamento do playbook');

/* P6 */
ok(PB.origemPlaybook(m.estrategias[0].id) === 'ME-C1' && PB.origemPlaybook(m.direcionamentos[0].id) === 'ME-F1' && PB.origemPlaybook(m.foco_atual.id) === 'ME-F1' &&
  PB.origemPlaybook(m.corpo[0].id) === 'ME-C1' && PB.origemPlaybook('abc') === null, 'P6 o id do item devolve o id do playbook');
ok(PB.resumo(escolha) === 'Montado com o Playbook HOLOS PB-V1 · Foco ME-F1 · Estratégias ME-C1, ME-C4, ME-M1, MEE-C1, G10, G11, G12.', 'P6 resumo com versão e ids');

/* P7 */
ok(PB.orientacaoMomentum('Reorganizar').max === 4 && PB.orientacaoMomentum('preservar').min === 2 && PB.orientacaoMomentum('') === null, 'P7 Momentum orienta a quantidade');

console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
