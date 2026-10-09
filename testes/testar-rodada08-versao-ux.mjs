/**
 * RODADA 08 — ONDA 10: BUILD AUDITAVEL E UX
 *
 * Supabase falso, app real, com conta.
 *
 *   1  Perfil → Conta mostra a versao (ou diz que e build local sem
 *      version.json); o Dockerfile gera /version.json com version/commit/builtAt
 *   2  pedidos repetidos: abrir o app e a ficha pede a lista de documentos
 *      uma vez, e nunca com "_sem_paciente"
 *   3  375 px: nenhuma tela empurra a pagina para o lado; as abas do Perfil
 *      aparecem todas; o menu nao ocupa a tela inteira
 *   4  textos: "Voltar às ferramentas", "Tríade HOLOS", "médio", exames com
 *      acento; sem "§" nem "essa regra ainda não foi escrita" na tela
 *   5  upload recusa tipo nao aceito
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
srv.criarConta('a@holo.test', 'senha-a-123');
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();
const A = await ctx.newPage();
await A.setViewport({ width: 375, height: 800, isMobile: true, hasTouch: true });
A.on('pageerror', e => errosJS.push(e.message));
const urlsSemPaciente = [];
A.on('request', r => { if (/_sem_paciente/.test(r.url())) urlsSemPaciente.push(r.url()); });
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
  window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(800);
const docsSelects = () => srv.log.filter(l => l.op === 'query' && l.tabela === 'documents' && l.acao === 'select').length;

/* ==================================================================== */
titulo('1. VERSAO');
/* ==================================================================== */

const docker = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
ok(/version\.json/.test(docker) && /"version":"%s","commit":"%s","builtAt":"%s"/.test(docker) && /ARG COMMIT/.test(docker),
   'o Dockerfile gera /version.json com version, commit e builtAt (commit por --build-arg)');
const versao = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="perfil"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('tab-conta').click();
  await new Promise(r => setTimeout(r, 600));
  return (document.getElementById('conta-versao') || {}).textContent || '';
});
ok(/Versão local de desenvolvimento|Versão \d/.test(versao), 'Perfil → Conta mostra a versão: "' + versao + '"');

/* ==================================================================== */
titulo('2. PEDIDOS REPETIDOS');
/* ==================================================================== */

const naCarga = docsSelects();
ok(naCarga <= 1, 'abrir o app pediu a lista de documentos ' + naCarga + ' vez(es) (antes: 12)');
const P = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Com Um Nome Bem Comprido Para Testar';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 900));
  return window.pacienteAtivoId();
});
srv.log.length = 0;
await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 900)); }, P);
ok(docsSelects() <= 1, 'abrir a ficha pediu a lista ' + docsSelects() + ' vez(es) (antes: 9)');
ok(urlsSemPaciente.length === 0, 'nenhum pedido com "_sem_paciente" (daria 400 no servidor)');

/* ==================================================================== */
titulo('3. 375 PX');
/* ==================================================================== */

await A.evaluate(() => {
  window.aplicarPontuacao(HOLOSCAN.calcular(HOLOSCAN.questionario().map(q => ({ marcador_id: q.id, intensidade: 2 }))));
  window.avisar('Uma mensagem bem comprida de propósito, para ver se o aviso cabe na tela do telefone sem empurrar a página');
});
const telas = [
  ['Dashboard', "document.querySelector('.nav-item[data-secao=\"dashboard\"]').click();"],
  ['HOLOSCAN', "document.querySelector('.nav-item[data-secao=\"holoscan\"]').click();"],
  ['Resultado', "document.querySelector('.nav-item[data-secao=\"resultado\"]').click();"],   /* 09/10: no lugar da Leitura Integrada */
  ['Ficha', "window.abrirFichaDe(window.pacienteAtivoId());"],
  ['Ficha / Documentos', "document.querySelector('[data-aba=\"documentos\"]').click();"],
  ['Perfil', "document.querySelector('.nav-item[data-secao=\"perfil\"]').click();"]
];
for (const [nome, acao] of telas) {
  const r = await A.evaluate(async (acao) => {
    await new Function('return (async () => {' + acao + '})()')();
    await new Promise(r => setTimeout(r, 400));
    return { scroll: document.documentElement.scrollWidth, w: document.documentElement.clientWidth };
  }, acao);
  ok(r.scroll <= r.w, nome + ': a página não passa da largura da tela (' + r.scroll + ' de ' + r.w + ' px)');
}
const abas = await A.evaluate(() => [...document.querySelectorAll('.abas-perfil .aba')].map(b => {
  const r = b.getBoundingClientRect(); return r.right <= document.documentElement.clientWidth + 1 && r.width > 0;
}));
ok(abas.length === 4 && abas.every(Boolean), 'as 4 abas do Perfil aparecem inteiras (Conta inclusive)');
const menu = await A.evaluate(() => Math.round(document.querySelector('.sidebar').getBoundingClientRect().height));
ok(menu < 200, 'o menu ocupa ' + menu + ' px de altura (antes: ~490)');

/* ==================================================================== */
titulo('4. TEXTOS');
/* ==================================================================== */

const textos = await A.evaluate(async () => {
  const html = document.body.innerHTML;
  document.querySelector('.nav-item[data-secao="corpo"]').click();
  window.abrirFerramentaPorId('linha_momentum');
  await new Promise(r => setTimeout(r, 500));
  const momentum = document.getElementById('vista-gen-corpo').textContent;
  window.abrirFichaDe(window.pacienteAtivoId());
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 400));
  const painelExames = document.querySelectorAll('#ex-corpo .ex-nome, [data-lancar]').length;   /* 09/10: nao existe mais painel de valores */
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 300));
  return { html, momentum, painelExames, prio: document.getElementById('holo-prioridades').textContent };
});
ok(/Voltar às ferramentas/.test(textos.html) && !/Voltar as ferramentas/.test(textos.html), '"Voltar às ferramentas"');
ok(/Tríade HOLOS/.test(textos.html) && !/Triada HOLOS/.test(textos.html), '"Tríade HOLOS"');
ok(textos.painelExames === 0, 'a aba Documentos nao tem painel de valores de exame (09/10: exame e so arquivo)');
ok(!/faixa medio\b/.test(textos.prio), 'faixa "médio", nunca "medio": ' + (textos.prio.match(/faixa \S+/g) || []).slice(0, 3).join(', '));
ok(!/§/.test(textos.momentum) && !/essa regra ainda não foi escrita/.test(textos.momentum) && /mudança/.test(textos.html + textos.momentum),
   'a tela da Linha do Momentum nao mostra "§" nem "essa regra ainda não foi escrita"');

/* ==================================================================== */
titulo('5. TIPO DE ARQUIVO');
/* ==================================================================== */

const up = await A.evaluate(async () => {
  window.abrirFichaDe(window.pacienteAtivoId());
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 400));
  const campo = document.getElementById('doc-arquivo');
  const dt = new DataTransfer();
  dt.items.add(new File(['MZ'], 'programa.exe', { type: 'application/x-msdownload' }));
  dt.items.add(new File(['<svg/>'], 'desenho.svg', { type: 'image/svg+xml' }));
  campo.files = dt.files;
  campo.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  return { aviso: document.getElementById('doc-aviso').textContent,
           locais: (await window.ArquivoStore.listarTudo()).length };
});
ok(/Tipo de arquivo não aceito: programa.exe, desenho.svg/.test(up.aviso) && up.locais === 0 &&
   srv.linhas('documents').length === 0, 'EXE e SVG recusados antes de sair do aparelho: "' + up.aviso.slice(0, 70) + '"');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
