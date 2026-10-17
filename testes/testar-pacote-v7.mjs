/**
 * HOLOS-V1 v7 — SO TEXTO (13/10/2026), base HOLOS-V1 v6 (no ar).
 * Decisao definitiva: exames NAO participam do HOLOSCAN. A v7 troca so o texto oficial do Sistema Acido Inflamatorio
 * (a v6 terminava com "nem substitui avaliacao ou exames clinicos"). Prova:
 *  - perguntas, IDs, ordem, escalas, faixas, associacoes (pesos, papeis, contextuais, Triade), regras e edicao identicos ao v6;
 *  - so o texto do Acido muda; os outros quatro textos identicos; nenhum texto oficial cita exame/laboratorio/composicao corporal;
 *  - mesmas respostas -> mesmas notas, Indice, Triade, prioridades, sinais dominantes, PP-V1, cobertura e contextuais (12 casos);
 *  - a publicacao direta sabe montar a v7 sobre a v6 (revisao na cadeia, depois da v6); artefatos e comparativo em dia.
 */
import './guarda-falhas.mjs';
import { execFileSync } from 'node:child_process';
import { construir } from '../scripts/pacote-v7.mjs';
import { calcular } from '../scripts/comparar-v2-v3.mjs';
import { casos, chave } from '../scripts/comparar-v6-v7.mjs';
const RAIZ = new URL('..', import.meta.url).pathname;
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const P = globalThis.PacoteMetodologico, R = globalThis.MetodologiaRevisaoV7;
const { v6, v7 } = construir();
const v7a = Object.assign(JSON.parse(JSON.stringify(v7)), { status: 'aprovado' });
const PROIBIDO = /exame|laborat|composi[cç][aã]o corporal|marcadores? laborat/i;

console.log('\n  identidade\n');
ok(v7.code === 'HOLOS-V1' && v7.version === 7 && v7.status === 'em_revisao' && v7.lineage.parent_version === 6 && v7.lineage.revisao === R.id,
  'v7 em revisão, linhagem: HOLOS-V1 v6 + ' + R.id);
ok(P.validar(v7).total_erros === 0, 'validador: 0 erros');
ok(R.base.version === 6 && R.versao_nova === 7 && Object.keys(R.textos_sistemas).join() === 'acido_inflamatorio'
  && ['textos', 'trocar', 'remover', 'mover', 'contextualizar'].every(k => Object.keys(R[k] || {}).length === 0) && !R.remover_contextuais,
  'a revisão é SÓ TEXTO de sistema (nenhuma pergunta trocada, removida, movida ou contextualizada)');

console.log('\n  nada muda além do texto\n');
const sem = (pk, campos) => JSON.stringify(pk[campos]);
['perguntas', 'escalas', 'faixas', 'associacoes', 'regras'].forEach(c => ok(sem(v6, c) === sem(v7, c), c + ': idêntico ao v6'));
ok(v7.edicao.code === v6.edicao.code && v7.edicao.item_count === v6.edicao.item_count && v7.edicao.status === v6.edicao.status && v7.edicao.version === v6.edicao.version + 1,
  'edição do questionário: mesmo código e os mesmos ' + v7.edicao.item_count + ' itens; só o número da edição avança (metadado de toda versão nova)');
const semTexto = (pk) => JSON.stringify(pk.sistemas.map(s => Object.assign({}, s, { public_text: null, source: null })));
ok(semTexto(v6) === semTexto(v7), 'sistemas: só public_text/fonte podem mudar (códigos, nomes, cores, posição idênticos)');
const txt = (pk) => Object.fromEntries(pk.sistemas.map(s => [s.code, s.public_text]));
const t6 = txt(v6), t7 = txt(v7);
ok(Object.keys(t6).filter(k => t6[k] !== t7[k]).join() === 'acido_inflamatorio', 'só o texto do Ácido Inflamatório muda; Fúngico, Metabólico, Detox e MEE idênticos');
ok(/exames clínicos/.test(t6.acido_inflamatorio) && !PROIBIDO.test(t7.acido_inflamatorio) && /não mede inflamação sistêmica, pH ou 'acidez corporal'/.test(t7.acido_inflamatorio),
  'Ácido: v6 citava "exames clínicos"; v7 traz o limite aprovado (não mede inflamação sistêmica, pH ou "acidez corporal")');
ok(Object.values(t7).every(t => !PROIBIDO.test(t)), 'nenhum texto oficial da v7 cita exame, laboratório, achados/marcadores laboratoriais ou composição corporal');
ok(/^O Sistema Metabólico organiza relatos relacionados a energia, fome, saciedade, comportamento alimentar, refeições, resposta percebida à alimentação e rotina\. Esse eixo não diagnostica resistência à insulina, diabetes, alterações da tireoide ou outras condições metabólicas\.$/.test(t7.metabolico),
  'Metabólico: exatamente o texto aprovado');
ok(!v7.perguntas.some(q => q.stable_id === 'SNT-210' || q.stable_id === 'SNT-309'), 'SNT-210 e SNT-309 continuam fora');
ok(v7.perguntas.every(q => !PROIBIDO.test(q.statement)) && (v7.faixas || []).every(f => !PROIBIDO.test((f.message_paciente || '') + ' ' + (f.message_nutri || ''))),
  'nenhuma pergunta nem mensagem de faixa da v7 cita exame/laboratório');

console.log('\n  mesmas respostas, mesmo resultado (12 casos)\n');
casos(v6).forEach(c => {
  const a = chave(calcular(v6, c.respostas)), b = chave(calcular(v7a, c.respostas));
  const dif = Object.keys(a).filter(k => a[k] !== b[k]);
  ok(dif.length === 0, c.id + ' ' + c.nome + ': notas, Índice, Tríade, prioridades, dominantes, PP-V1, cobertura e contextuais idênticos' + (dif.length ? ' — DIFERE: ' + dif.join(', ') : ''));
});

console.log('\n  publicação direta\n');
const cad = Object.keys(globalThis).filter(k => /^MetodologiaRevisaoV\d$/.test(k));
const fonte = (await import('node:fs')).readFileSync(RAIZ + 'metodologia-pacote.js', 'utf8');
ok(/MetodologiaRevisaoV6, raiz\.MetodologiaRevisaoV7\]/.test(fonte) && cad.includes('MetodologiaRevisaoV7'), 'a v7 entra na cadeia de publicação direta DEPOIS da v6 (o responsável metodológico publica no login)');
const montadaDoServidor = P.aplicarRevisao(Object.assign(JSON.parse(JSON.stringify(v6)), { status: 'aprovado' }), R);
ok(montadaDoServidor.content_hash === v7.content_hash, 'montar a v7 a partir da v6 aprovada dá sempre o mesmo pacote (hash ' + v7.content_hash.slice(0, 12) + '…)');
let erroBase = null; try { P.aplicarRevisao(Object.assign(JSON.parse(JSON.stringify(v7)), { status: 'aprovado', version: 6, sistemas: v7.sistemas }), R); } catch (e) { erroBase = e.message; }
ok(!!erroBase && /igual ao atual/.test(erroBase), 'aplicada sobre um pacote que já tem o texto novo, a revisão é recusada (nada é publicado em dobro)');

console.log('\n  artefatos\n');
for (const s of ['pacote-v7.mjs', 'comparar-v6-v7.mjs']) {
  let saida = ''; try { saida = execFileSync('node', [RAIZ + 'scripts/' + s, '--check'], { encoding: 'utf8' }); } catch (e) { saida = String(e.stdout || '') + String(e.stderr || ''); }
  ok(/em dia/.test(saida), s + ' --check: ' + saida.trim());
}
console.log(falhou ? '\nFALHOU' : '\npacote v7: tudo ok');
if (falhou) process.exit(1);
