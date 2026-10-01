/**
 * V1 — ETAPA 4 — O INVENTARIO METODOLOGICO (verdade executavel)
 *
 *  - exatamente 84 IDs unicos recuperados: 49 fisico / 19 mental-emocional / 16 espiritual
 *  - 86 linhas nos bancos; SNT-101 e SNT-501 identificados com as duas linhas preservadas
 *  - nenhuma pergunta criada artificialmente, nenhuma removida em silencio (IDs = IDs dos CSV)
 *  - orientacao recuperada do valor escrito; ausente nunca vira "direta"
 *  - pesos, faixas, Indice (0,20), Triada e ausencia inventariados como NAO oficiais
 *  - todo elemento com status_homologacao = pendente_homologacao; nada aprovado
 *  - JSON, CSV, markdown e metodologia-inventario.js em dia com os CSV (--check)
 *  - o inventario nao contem dado de paciente
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { lerCSV } from '../motor/src/csv.ts';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url).pathname;
const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
const csv = (f) => lerCSV(readFileSync(RAIZ + 'motor/bancos/' + f, 'utf8'), f);
const sint = csv('sintomas.csv'), emo = csv('emocoes.csv'), esp = csv('espiritual.csv');
const idsCsv = new Set([...sint, ...emo, ...esp].map(l => l.id));

titulo('84 IDS, 49/19/16, 86 LINHAS');
ok(inv.contagem.ids_unicos === 84 && inv.perguntas.length === 84, '84 IDs unicos (' + inv.perguntas.length + ')');
ok(inv.contagem.fisico === 49 && inv.contagem.mental_emocional === 19 && inv.contagem.espiritual === 16, '49 fisico / 19 mental-emocional / 16 espiritual');
ok(inv.contagem.linhas_nos_bancos === 86 && sint.length + emo.length + esp.length === 86, '86 linhas nos bancos (nao sao 86 perguntas)');
ok(new Set(inv.perguntas.map(p => p.stable_id)).size === 84, 'stable_id unico por pergunta');
ok([...idsCsv].every(id => inv.perguntas.some(p => p.stable_id === id)) && inv.perguntas.every(p => idsCsv.has(p.stable_id)), 'nenhuma pergunta criada artificialmente nem removida em silencio: IDs do inventario = IDs dos CSV');
ok(inv.perguntas.every(p => p.enunciado && p.enunciado === [...sint, ...emo, ...esp].find(l => l.id === p.stable_id).pergunta), 'cada enunciado e o do CSV, sem reescrita');

titulo('SNT-101 E SNT-501');
const snt101 = inv.perguntas.find(p => p.stable_id === 'SNT-101'), snt501 = inv.perguntas.find(p => p.stable_id === 'SNT-501');
ok(snt101 && snt101.linhas.length === 2 && snt101.conflito && snt101.linhas.map(l => l.sistema + ':' + l.peso).sort().join(',') === 'fungico:2,metabolico:3', 'SNT-101 identificado: 2 linhas (fungico 2 / metabolico 3), conflito marcado, nenhuma apagada');
ok(snt501 && snt501.linhas.length === 2 && snt501.conflito && snt501.linhas.map(l => l.sistema + ':' + l.peso).sort().join(',') === 'mental_emocional_espiritual:3,metabolico:2', 'SNT-501 identificado: 2 linhas (metabolico 2 / MEE 3), conflito marcado');
ok(inv.contagem.ids_com_conflito.join(',') === 'SNT-101,SNT-501', 'so esses dois IDs estao em conflito de linha primaria');
const p101 = inv.pendencias_snt['SNT-101'], p501 = inv.pendencias_snt['SNT-501'];
ok(p101.status_homologacao === 'pendente_homologacao' && p501.status_homologacao === 'pendente_homologacao' && p101.copia_anterior.some(c => c.id === 'SNT-302') && p501.copia_anterior.some(c => c.id === 'SNT-310'), 'pendencia registrada (nao corrigida) com a copia anterior (SNT-302 / SNT-310)');
ok(inv.associacoes.filter(a => a.question_id === 'SNT-101' && a.destination_type === 'system').length === 2 && inv.associacoes.filter(a => a.question_id === 'SNT-101' && a.conflito).length === 2, 'as duas associacoes de SNT-101 sao preservadas e marcadas; nenhum vencedor escolhido');

titulo('ESCALAS, ORIENTACAO, ASSOCIACOES, PESOS');
ok(inv.escalas.length === 2 && inv.escalas.every(e => e.minimo === 0 && e.maximo === 3 && e.status_recuperado === 'estrutura_recuperada' && e.status_homologacao === 'pendente_homologacao'), 'escalas 0..3 (frequencia, intensidade) como ESTRUTURA RECUPERADA');
ok(inv.perguntas.every(p => p.orientacao_bruta === [...sint, ...emo, ...esp].find(l => l.id === p.stable_id).sentido), 'orientacao = valor escrito na coluna sentido (sem inferencia pelo texto)');
ok(inv.perguntas.every(p => (p.orientacao_ausente && p.orientacao_recuperada === null) || (!p.orientacao_ausente && ['direta', 'invertida'].includes(p.orientacao_recuperada))), 'orientacao ausente fica null — nunca "direta"');
ok(inv.contagem.invertidas_recuperadas.length === 9 && inv.perguntas.every(p => p.orientacao_status === 'pendente_homologacao'), '9 invertidas recuperadas, todas pendentes de homologacao');
ok(inv.contagem.associacoes_sistema === 95 && inv.associacoes.filter(a => a.destination_type === 'system' && a.role === 'secundaria').length === 9, '95 associacoes pergunta->sistema (86 primarias + 9 secundarias)');
ok(inv.contagem.associacoes_triada === 84 && inv.associacoes.filter(a => a.destination_type === 'triad').every(a => a.role === 'derivada' && /derivacao/.test(a.conflito_nota)), 'Triada: 84 vinculos DERIVADOS da origem, marcados como derivacao (nao decisao)');
ok(inv.associacoes.every(a => a.status === 'pendente_homologacao') && inv.pesos.status_homologacao === 'pendente_homologacao' && inv.pesos.normalizados === false && inv.pesos.defaults_oficiais === false, 'pesos inventariados sem normalizar, sem default oficial');
ok(inv.pesos.distribuicao[1] + inv.pesos.distribuicao[2] + inv.pesos.distribuicao[3] === 95, 'todos os pesos recuperados estao em 1..3 (' + JSON.stringify(inv.pesos.distribuicao) + ')');

titulo('FAIXAS, INDICE, TRIADA, AUSENCIA, COBERTURA, COMPARABILIDADE');
ok(inv.faixas.length === 15 && inv.faixas.every(f => f.status_homologacao === 'pendente_homologacao'), '15 faixas (5 sistemas x 3) PARA HOMOLOGACAO');
const porDest = {}; inv.faixas.forEach(f => (porDest[f.destination_id] = porDest[f.destination_id] || []).push(f));
ok(Object.values(porDest).every(fs => { fs.sort((a, b) => a.limite_inferior - b.limite_inferior); return fs[0].limite_inferior === 0 && fs[fs.length - 1].limite_superior === 10 && fs.every((f, i) => i === 0 || f.limite_inferior === fs[i - 1].limite_superior); }), 'faixas recuperadas cobrem 0..10 sem lacuna nem sobreposicao (estrutura; conteudo nao homologado)');
ok(inv.faixas_historicas.length === 1 && inv.faixas_historicas[0].status_homologacao === 'inexistente', 'faixas do Indice: inexistentes (as 4 antigas removidas, sem fonte)');
ok(Object.values(inv.indice.pesos_atuais).every(v => v === 0.2) && inv.indice.oficial === false && inv.indice.status_homologacao === 'pendente_homologacao', 'Indice: pesos 0,20 inventariados como NAO oficiais');
ok(inv.triada.oficial === false && /por ID/.test(inv.triada.contribuicao_atual), 'Triada: contribuicao por ID (derivada) inventariada como NAO oficial');
ok(inv.ausencia.politica_oficial_aprovada === false && inv.ausencia.cobertura_minima_atual === null && inv.ausencia.exclusoes_atuais === null && inv.ausencia.minimos_atuais === null, 'ausencia: SEM POLITICA OFICIAL; cobertura minima, exclusoes e minimos continuam ausentes (nao preenchidos)');
ok(inv.cobertura.denominador === 84 && inv.cobertura.decide_avaliabilidade === false && inv.cobertura.corte_minimo === null, 'cobertura de preenchimento = respondidos/84; nao decide avaliabilidade; sem corte');
ok(inv.comparabilidade.implementada === false && inv.comparabilidade.regra_recuperada === null, 'comparabilidade: nenhuma regra inventada');

titulo('REGRAS RELACIONADAS E STATUS GLOBAL');
ok(inv.regras.combinacoes.length === 16 && inv.regras.recomendacoes.length === 23 && inv.regras.selecao.id === 'SEL-001' && inv.regras.escopo.length === 11 && inv.regras.exames_relacionados.length === 24, '16 CMB, 23 REC, SEL-001, 11 ESC, 24 EXA inventariados');
ok(inv.regras.combinacoes.every(c => c.status_homologacao === 'pendente_homologacao' && c.exibida_na_interface === false) && inv.regras.recomendacoes.every(r => r.apresentavel_hoje === false), 'CMB/REC: pendentes, nenhuma apresentavel');
const texto = JSON.stringify(inv);
ok(!/aprovado"/.test(texto.replace(/status_homologacao":"pendente_homologacao"/g, '')) || !/"status_homologacao":"aprovado"/.test(texto), 'nenhum elemento com status_homologacao aprovado');
ok(inv.sistemas.length === 5 && inv.sistemas.every(s => s.validado_clinicamente === false && s.status_homologacao === 'pendente_homologacao'), '5 sistemas como conteudo revisavel, nao validado clinicamente');
ok(!/patient|paciente_id|nascimento|telefone/.test(texto.replace(/"paciente"/g, '')), 'o inventario nao contem dado de paciente');
ok(inv.legado_fora_da_barreira.length >= 5 && inv.legado_fora_da_barreira.every(l => l.saida_oficial === false), 'calculo legado identificado, nenhum como saida oficial');

titulo('ARTEFATOS EM DIA');
let check = '';
try { check = execFileSync('node', [RAIZ + 'scripts/inventario-metodologico.mjs', '--check'], { encoding: 'utf8' }); } catch (e) { check = String(e.stdout) + String(e.stderr); }
ok(/inventario em dia/.test(check), 'JSON, CSV, markdown e metodologia-inventario.js batem com os CSV (--check): ' + check.trim().split('\n').pop());
const js = readFileSync(RAIZ + 'metodologia-inventario.js', 'utf8');
ok(js.startsWith('/* GERADO') && JSON.stringify(JSON.parse(js.slice(js.indexOf('= ') + 2, js.lastIndexOf(';')))) === JSON.stringify(inv), 'metodologia-inventario.js carrega exatamente o JSON');
const csvTexto = readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.csv', 'utf8');
ok(csvTexto.split('\n').filter(l => l.startsWith('pergunta,')).length === 84 && csvTexto.split('\n').filter(l => l.startsWith('associacao,')).length === 179, 'CSV de revisao: 84 perguntas e 179 associacoes');
const matriz = readFileSync(RAIZ + 'docs/v1/metodologia/MATRIZ-HOMOLOGACAO-V1.md', 'utf8');
ok((matriz.match(/^\| Pergunta \|/gm) || []).length === 84 && /\| SNT-101 \|/.test(matriz) && /\| SNT-501 \|/.test(matriz) && /Parcialidade/.test(matriz) && /Comparabilidade/.test(matriz) && !/\| APROVADO \|/.test(matriz), 'matriz: 84 perguntas + sistemas, escalas, inversoes, associacoes, pesos, SNT, parcialidade, cobertura, faixas, Indice, Triada, comparabilidade; nenhuma linha aprovada');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
