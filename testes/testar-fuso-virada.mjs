/**
 * FUSO E VIRADA DO DIA UTC (13/10, fechamento do MR-V1).
 * As suites de agenda/atendimento falhavam entre 21h e 24h de Brasilia: a data UTC ja era o dia seguinte. A causa era
 * o teste (relogio UTC do container), nao o app. Aqui o comportamento do app e provado em instantes fixos:
 *   - 20:59 de Brasilia (UTC ainda no mesmo dia), 21:00 (UTC vira), 21:30, 23:59 (fim da janela) e 00:30 (Brasilia vira)
 *   - "hoje" da agenda (hojeISO) e o dia/hora sugerido para o atendimento = o dia de PAREDE em Brasilia
 *   - occurred_at e instante absoluto: 21:30 de Brasilia vira 00:30Z do dia seguinte e e lido de volta como 21:30 do dia certo
 *   - a interpretacao do atendimento usa o fuso do perfil (America/Sao_Paulo) mesmo com o navegador em UTC
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { fixarRelogio, instanteDeParede, parede, diaNoFuso } from './relogio.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
const sonda = async (inicio, fusoNavegador) => {
  const pg = await (await nav.createBrowserContext()).newPage();
  pg.on('pageerror', e => errosJS.push(e.message));
  if (fusoNavegador === 'America/Sao_Paulo') await fixarRelogio(pg, inicio);
  else { await pg.emulateTimezone(fusoNavegador); await pg.evaluateOnNewDocument((base) => { const R = Date, t0 = R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(base + (R.now() - t0)); } static now() { return base + (R.now() - t0); } } window.Date = D; }, inicio); }
  await pg.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await pg.waitForFunction(() => window.AtendimentoAtual && window.hojeISO, { timeout: 15000 });
  const r = await pg.evaluate(() => {
    const A = window.AtendimentoAtual, agoraIso = new Date().toISOString();
    const parede = A.paraParede(agoraIso, 'America/Sao_Paulo');
    const inst = A.paraInstante(parede.data, parede.hora, 'America/Sao_Paulo');
    return { hoje: window.hojeISO(), utc: agoraIso.slice(0, 10), parede, volta: A.paraParede(inst, 'America/Sao_Paulo'), inst, fuso: A.fuso ? A.fuso() : null };
  });
  await pg.close();
  return r;
};
const casos = [['20:59', 'UTC ainda no mesmo dia'], ['21:00', 'UTC acabou de virar'], ['21:30', 'janela 21h-24h'], ['23:59', 'fim da janela'], ['00:30', 'Brasília também virou']];
for (const [hhmm, rotulo] of casos) {
  const inicio = instanteDeParede(1, hhmm), esperado = parede(inicio);
  const r = await sonda(inicio, 'America/Sao_Paulo');
  const virouUtc = r.utc !== esperado.data;
  ok(r.hoje === esperado.data && r.parede.data === esperado.data && r.parede.hora === esperado.hora,
    hhmm + ' de Brasília (' + rotulo + '): "hoje" da agenda e data/hora sugerida = ' + esperado.data + ' ' + esperado.hora + ' (UTC: ' + r.utc + ')');
  ok(r.volta.data === r.parede.data && r.volta.hora === r.parede.hora && new Date(r.inst).getTime() <= inicio + 120000,
    hhmm + ': occurred_at como instante absoluto (' + r.inst + ') lido de volta como a mesma data/hora local');
  if (['21:00', '21:30', '23:59'].includes(hhmm)) ok(virouUtc && r.inst.slice(0, 10) === diaNoFuso(inicio, 1) && r.parede.data === diaNoFuso(inicio, 0),
    hhmm + ': a data UTC já é o dia seguinte, e o atendimento continua no dia local certo');
}
/* navegador em UTC (computador mal configurado) com o perfil em Brasilia: o ATENDIMENTO continua no dia local da clinica */
const inicio = instanteDeParede(1, '22:30');
const u = await sonda(inicio, 'UTC');
ok(u.parede.data === diaNoFuso(inicio, 0) && u.parede.hora === '22:30' && u.utc === diaNoFuso(inicio, 1) && u.fuso === 'America/Sao_Paulo',
  'navegador em UTC: a data/hora do atendimento segue o fuso do perfil (America/Sao_Paulo), não o do navegador — ' + u.parede.data + ' ' + u.parede.hora);
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nfuso e virada do dia: tudo ok');
process.exit(falhou ? 1 : 0);
