#!/usr/bin/env node
/* HTML A4 -> PDF (Chromium). Os números de página são acrescentados depois (paginar.py), sem número na capa.
   node scripts/doc-jornada/pdf.mjs */
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
const RAIZ = new URL('../../', import.meta.url).pathname;
const HTML = RAIZ + 'docs/jornada/JORNADA-DA-NUTRICIONISTA-HOLOHACKING.html';
const PDF = RAIZ + 'docs/jornada/JORNADA-DA-NUTRICIONISTA-HOLOHACKING.pdf';
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await nav.newPage();
await p.goto(pathToFileURL(HTML).href, { waitUntil: 'networkidle0' });
await p.evaluate(() => document.fonts.ready);
await p.emulateMediaType('print');
await p.pdf({ path: PDF, format: 'A4', printBackground: true, preferCSSPageSize: true });
await nav.close();
console.log('pdf', PDF);
