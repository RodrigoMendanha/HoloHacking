/**
 * EMISSAO IMUTAVEL (motor de resultados V1, 12/10, item 4.7 / teste 33):
 *   uma emissao RF-1 ja feita continua com o MESMO HTML depois do motor de resultados novo.
 *   O golden (testes/golden/rf1-paciente.html) foi gerado com o codigo anterior (commit 4680dbb) a partir de
 *   testes/golden/rf1-fixture.json. Aqui a MESMA entrada passa por ResultadoPagina.documentoEmissao (o caminho da
 *   pagina Resultado: PDF, WhatsApp, Imprimir) e pelo desenho congelado ResultadoLegadoR3 — os dois tem de sair identicos.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const fixture = JSON.parse(readFileSync(new URL('./golden/rf1-fixture.json', import.meta.url), 'utf8'));
const golden = readFileSync(new URL('./golden/rf1-paciente.html', import.meta.url), 'utf8');
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const P = await nav.newPage();
const errosJS = [];
P.on('pageerror', e => errosJS.push(e.message));
await P.emulateTimezone('America/Sao_Paulo');
await ligarPagina(P, criarServidor());
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.ResultadoPagina && window.ResultadoLegadoR3 && window.CATALOGO_FERRAMENTAS, { timeout: 15000 });
const r = await P.evaluate((fx) => ({
  legado: window.ResultadoLegadoR3.documentoEmissao(fx.emissao, fx.resultado),
  pagina: window.ResultadoPagina.documentoEmissao(fx.emissao, fx.resultado)
}), fixture);
const primeiraDif = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i >= a.length && a.length === b.length ? -1 : i; };
const d1 = primeiraDif(r.legado, golden), d2 = primeiraDif(r.pagina, golden);
ok(fixture.emissao.template_version === 'RF-1' && golden.length > 5000, 'golden RF-1 presente (gerado com o código anterior ao motor de resultados)');
ok(d1 === -1, 'desenho congelado (ResultadoLegadoR3) = HTML emitido antes, byte a byte' + (d1 >= 0 ? ' [difere em ' + d1 + ': …' + r.legado.slice(d1, d1 + 80) + ']' : ''));
ok(d2 === -1, 'página Resultado (PDF/WhatsApp/Imprimir) desenha a emissão RF-1 antiga idêntica' + (d2 >= 0 ? ' [difere em ' + d2 + ': …' + r.pagina.slice(d2, d2 + 80) + ']' : ''));
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nemissao imutavel: tudo ok');
process.exit(falhou ? 1 : 0);
