/**
 * RELEASE 01 — AS REGRAS DE SINCRONIZACAO, UMA A UMA
 *
 * As funcoes puras de sincronizacao.js (expostas com prefixo _ so para
 * teste): mesclar o historico do HOLOSCAN, decidir o destino das respostas
 * do questionario e dos valores de exame. Sem servidor, sem sessao — cada
 * caso e uma linha da tabela de decisao do RELEASE-STATE.md.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox'] });
const p = await nav.newPage();
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });

const r = await p.evaluate(() => {
  const S = window.Sincronizacao;
  const rem = (id, quando, criado, indice) => ({ _supa_id: id, _supa_criado_em: criado, quando, indice, sistemas: [] });

  const m1 = S._mesclarHistorico(
    [ { quando: '2026-09-01', indice: 10, _supa_id: 'a' },                 // versao velha de 'a'
      { quando: '2026-09-02', indice: 11, _supa_id: 'sumiu' },             // o servidor nao tem mais
      { quando: '2026-09-03', indice: 12 },                                 // legado sem carimbo, dia com remoto
      { quando: '2026-09-04', indice: 13, calculado_em: '2026-09-04T12:00:00Z' },  // pendente mais novo que o remoto
      { quando: '2026-09-05', indice: 14, calculado_em: '2026-09-05T08:00:00Z' },  // pendente mais velho que o remoto
      { quando: '2026-08-01', indice: 15 } ],                               // so local, sem remoto no dia
    [ rem('a', '2026-09-01', '2026-09-01T10:00:00Z', 40),
      rem('b', '2026-09-03', '2026-09-03T10:00:00Z', 41),
      rem('c', '2026-09-04', '2026-09-04T10:00:00Z', 42),
      rem('d', '2026-09-05', '2026-09-05T10:00:00Z', 43),
      rem('e', '2026-09-05', '2026-09-05T11:00:00Z', 44) ]);

  const m2 = S._mesclarHistorico(
    [ { quando: '2026-09-01', _supa_id: 'a', interpretacao: { texto: 'local' } } ],
    [ rem('a', '2026-09-01', 'x', 1) ]);
  const m3 = S._mesclarHistorico(
    [ { quando: '2026-09-01', _supa_id: 'a', interpretacao: { texto: 'local' } } ],
    [ Object.assign(rem('a', '2026-09-01', 'x', 1), { interpretacao: { texto: 'servidor' } }) ]);

  const Q = S._decidirQuestionario;
  const rq = { m1: 1, m2: 2 };
  const reg = (app, obj) => ({ app, assinatura: S._assinatura(obj) });
  const q = {
    semRemoto: Q({ m1: 3 }, null, 'x', {}),
    localVazio: Q({}, null, 'x', rq),
    limpoDePropósito: Q({}, reg('x', rq), 'x', rq),
    limpoMasHaNova: Q({}, reg('velha', rq), 'x', rq),
    iguais: Q({ m1: 1, m2: 2 }, null, 'x', rq),
    copiaVelha: Q({ m1: 0 }, reg('velha', { m1: 0 }), 'x', rq),
    rascunho: Q({ m1: 0, m2: 3 }, reg('velha', { m1: 0 }), 'x', rq),
    semRegistro: Q({ m1: 0 }, null, 'x', rq)
  };

  const E = S._decidirExames;
  const col = (id, data, vals, desc) => ({ id, coletado_em: data, data_coleta_desconhecida: !!desc,
    resultados: Object.keys(vals).map(k => ({ exame_id: k, valor: vals[k] })) });
  const e = {
    servidorVence: E({ x: 1 }, null, [col('c1', '2026-09-01', { x: 2 })]),
    rascunho: E({ x: 9 }, { estado: 'rascunho' }, [col('c1', '2026-09-01', { x: 2 })]),
    pendente: E({ x: 9 }, { estado: 'pendente' }, [col('c1', '2026-09-01', { x: 2 })]),
    apagadaLa: E({ x: 1 }, { estado: 'sincronizado', coleta: 'c1' }, []),
    legado: E({ x: 1 }, null, []),
    ultima: E({}, null, [col('c1', '2026-08-01', { x: 1 }), col('c2', '2026-09-01', { x: 2 })])
  };

  return { m1, m2, m3, q, e };
});

console.log('\n  1. HISTORICO DO HOLOSCAN\n');
const ids = r.m1.map(x => x._supa_id || ('local:' + x.indice));
ok(r.m1.find(x => x._supa_id === 'a').indice === 40, 'entrada com _supa_id: a versao do servidor substitui a local');
ok(!ids.includes('sumiu'), 'entrada com _supa_id que o servidor nao tem: sai');
ok(!ids.includes('local:12'), 'legado sem carimbo num dia que o servidor ja tem: sai (e a copia dele)');
ok(ids.includes('local:13'), 'calculo local MAIS NOVO que o remoto do dia: fica (ainda nao salvo)');
ok(!ids.includes('local:14'), 'calculo local mais velho que o remoto do dia: sai');
ok(ids.includes('local:15'), 'so local, sem nada do servidor no dia: fica');
ok(ids.includes('d') && ids.includes('e'), 'dois HOLOSCAN do servidor no mesmo dia: os dois ficam');
ok(ids.join(',') === 'local:15,a,b,c,local:13,d,e', 'ordem: por dia e, no dia, por instante — ' + ids.join(','));
ok(r.m2[0].interpretacao && r.m2[0].interpretacao.texto === 'local',
   'interpretacao que so existe aqui (gravacao remota falhou) sobrevive');
ok(r.m3[0].interpretacao.texto === 'servidor', 'se o servidor tem interpretacao, ela manda');

console.log('\n  2. RESPOSTAS DO QUESTIONARIO\n');
ok(r.q.semRemoto === 'manter', 'servidor sem respostas: mantem');
ok(r.q.localVazio === 'substituir', 'navegador limpo: traz as do servidor');
ok(r.q.limpoDePropósito === 'manter', 'limpo de proposito depois de sincronizar: nao ressuscita respostas');
ok(r.q.limpoMasHaNova === 'substituir', 'limpo, mas ha aplicacao nova no servidor: traz a nova');
ok(r.q.iguais === 'manter', 'iguais: nada a fazer');
ok(r.q.copiaVelha === 'substituir', 'intocadas desde a ultima sincronizacao: sao copia velha, servidor vence');
ok(r.q.rascunho === 'manter', 'editadas aqui depois de sincronizar: rascunho, fica');
ok(r.q.semRegistro === 'ambiguo', 'sem registro (legado): ambiguo — decide contra todas as aplicacoes do servidor');

console.log('\n  3. VALORES DE EXAME\n');
ok(r.e.servidorVence.valores.x === 2 && r.e.servidorVence.registro.estado === 'sincronizado',
   'sem rascunho: valores = coleta mais recente do servidor');
ok(r.e.rascunho.valores.x === 9, 'rascunho digitado aqui: fica');
ok(r.e.pendente.valores.x === 9, 'pendente de envio: fica');
ok(r.e.apagadaLa.valores === null, 'era copia de coleta que o servidor nao tem mais: sai');
ok(r.e.legado.valores.x === 1, 'legado local sem nada no servidor: fica (a migracao decide)');
ok(r.e.ultima.valores.x === 2 && r.e.ultima.registro.coleta === 'c2', 'entre duas coletas, a de data maior');

console.log('');
ok(ruim.length === 0, 'sem erro de JS' + (ruim[0] ? ': ' + ruim[0] : ''));
await nav.close();
process.exit(falhou ? 1 : 0);
