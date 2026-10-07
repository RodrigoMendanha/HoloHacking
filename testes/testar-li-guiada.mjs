/**
 * Leitura Integrada guiada e laudo -> coleta (testes reais 06/10). Supabase falso, com conta:
 *   1  sem coleta, a Leitura Integrada explica e oferece "Lancar exame" (e o laudo ja enviado)
 *   2  "Lancar valores deste exame" na lista de documentos abre a coleta ligada ao documento,
 *      com a data do documento e o laudo ao lado
 *   3  coleta em rascunho nao entra na lista da Leitura Integrada; coleta salva entra e libera "Calcular"
 *   4  depois de lancada, o documento mostra "valores lancados"
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Laudo Ficticio' } }).data[0].id;
// um laudo (imagem PNG de 1x1) ja enviado, sem coleta
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const path = UA + '/' + PA + '/1_laudo.png';
srv.tratar({ op: 'storage', uid: UA, bucket: 'patient-documents', acaoStorage: 'upload', path, b64: PNG, tipo: 'image/png' });
const DOC = q('documents', 'insert', { dados: { patient_id: PA, nome: 'laudo.png', tipo: 'Exame laboratorial', data_documento: '2026-10-01', mime_type: 'image/png', tamanho_bytes: 68, storage_path: path } }).data[0].id;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1400, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ----- 1: Leitura Integrada sem coleta ----- */
const li = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  for (let i = 0; i < 40 && !document.querySelector('#holo-confronto .li-guia'); i++) await new Promise(r => setTimeout(r, 100));
  const g = document.querySelector('#holo-confronto .li-guia');
  return { guia: g ? g.innerText : '', botoes: g ? [...g.querySelectorAll('[data-li-lancar]')].map(b => b.dataset.liLancar) : [] };
}, PA);
if (process.env.SHOT_DIR) await (await A.$('#holo-confronto')).screenshot({ path: process.env.SHOT_DIR + '/li-guia.png' });
ok(/ainda não tem exame lançado/.test(li.guia), 'sem coleta, a Leitura Integrada explica por que não calcula');
ok(li.botoes.includes('') && li.botoes.includes(DOC), 'e oferece "Lançar exame" e "Lançar valores de laudo.png"');

/* ----- 2: lancar a partir do laudo ----- */
await A.evaluate((doc) => document.querySelector('#holo-confronto [data-li-lancar="' + doc + '"]').click(), DOC);
await A.waitForFunction(() => document.getElementById('lab-editor'), { timeout: 10000 });
await A.waitForFunction(() => document.querySelector('#lab-visor img, #lab-visor iframe'), { timeout: 10000 }).catch(() => {});
const ed = await A.evaluate(() => ({
  ficha: !!document.querySelector('#lab-corpo') && document.querySelector('#lab-corpo').offsetParent !== null,
  doc: document.getElementById('lab-documento').value, data: document.getElementById('lab-data').value,
  visor: !!document.querySelector('#lab-visor img'), corpoVisor: document.body.classList.contains('com-visor-laudo')
}));
ok(ed.ficha && ed.doc === DOC && ed.data === '2026-10-01', 'abre a ficha (Documentos) com a coleta nova ligada ao laudo e com a data dele');
ok(ed.visor && ed.corpoVisor, 'o laudo aparece ao lado do formulário');
if (process.env.SHOT_DIR) { await espera(1200); await A.screenshot({ path: process.env.SHOT_DIR + '/lancar-laudo.png' }); }

/* ----- 3: rascunho nao entra; salva entra ----- */
await A.evaluate(async () => {
  document.querySelector('[data-lab-add="LAB-016"]').click();
  await new Promise(r => setTimeout(r, 100));
  const v = document.querySelector('[data-lab-campo="value_original_text"]'); v.value = '2,1';
  const u = document.querySelector('[data-lab-campo="unit_original"]'); if (u) u.value = 'mg/L';
  document.querySelector('[data-lab-acao="salvar-rascunho"]').click();
});
await espera(900);
const rasc = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  for (let i = 0; i < 40 && !document.querySelector('#holo-confronto .li-coletas'); i++) await new Promise(r => setTimeout(r, 100));
  await new Promise(r => setTimeout(r, 400));
  const c = document.querySelector('#holo-confronto .li-coletas');
  return { caixas: c.querySelectorAll('[data-li-coleta]').length, txt: c.innerText };
});
ok(rasc.caixas === 0 && /rascunho não aparece aqui/.test(rasc.txt), 'coleta em rascunho não entra na lista da Leitura Integrada (e a tela diz por quê)');
ok(srv.linhas('lab_collections').length === 1 && srv.linhas('lab_collections')[0].document_id === DOC, 'a coleta ficou ligada ao documento no servidor');

await A.evaluate(async (pid) => { window.Laboratorio.lancarExame('', pid); });
await espera(600);
await A.evaluate(async () => {
  // reabre o rascunho e salva
  const b = [...document.querySelectorAll('[data-lab-acao="editar"]')][0]; if (b) b.click();
  await new Promise(r => setTimeout(r, 300));
  if (document.querySelector('[data-lab-acao="fechar"]') && !document.querySelector('[data-lab-campo="value_original_text"]')) return;
  document.querySelector('[data-lab-acao="salvar"]').click();
});
await espera(900);
const salva = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  for (let i = 0; i < 40 && !document.querySelector('#holo-confronto [data-li-coleta]'); i++) await new Promise(r => setTimeout(r, 100));
  return { caixas: document.querySelectorAll('#holo-confronto [data-li-coleta]').length, guia: !!document.querySelector('#holo-confronto .li-guia') };
});
ok(salva.caixas === 1 && !salva.guia, 'coleta salva aparece para a Leitura Integrada (e o guia some): ' + JSON.stringify(salva));

/* ----- 4: selo no documento ----- */
const selo = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid);
  for (let i = 0; i < 50 && !document.querySelector('#doc-lista .doc-lancado'); i++) await new Promise(r => setTimeout(r, 100));
  return { lancado: !!document.querySelector('#doc-lista .doc-lancado'), botao: (document.querySelector('#doc-lista [data-lancar]') || {}).textContent };
}, PA);
ok(selo.lancado, 'o documento mostra "valores lançados" depois da coleta: ' + selo.botao);

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
