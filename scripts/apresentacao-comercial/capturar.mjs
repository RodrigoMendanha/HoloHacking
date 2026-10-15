/**
 * APRESENTACAO COMERCIAL — telas do "Montar com o Playbook" e do HOLOSCAN com a paciente FICTICIA "Marina Alves" e a
 * nutricionista FICTICIA "Ana Ribeiro" (fixture dos testes, Supabase FALSO em memoria). Nenhum dado real.
 * As demais telas vem do capturador do video (scripts/video-holohacking-comercial/capturar.mjs).
 *   node scripts/apresentacao-comercial/capturar.mjs   -> scripts/apresentacao-comercial/telas/
 */
import { mkdirSync } from 'node:fs';
const R = new URL('../../', import.meta.url).pathname;
const puppeteer = (await import(R + 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).default;
const { criarServidor, ligarPagina } = await import(R + 'testes/supabase-falso.mjs');
const { montarFixture } = await import(R + 'testes/fixture-direcao.mjs');
const { servir } = await import(R + 'scripts/video-holohacking-comercial/servidor.mjs');
const servidor = await servir();
const out = new URL('./telas', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const srv = criarServidor();
const UA = srv.criarConta('nutri@holo.test', 'senha-nutri-1');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Ana Ribeiro', registro: 'CRN-0 00000', profissao: 'Nutricionista', especialidade: 'Nutrição Holística', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA, { nome: 'Marina Alves' });
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const P = await (await nav.createBrowserContext()).newPage();
const erros = []; P.on('pageerror', e => erros.push(e.message));
await P.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await P.emulateTimezone('America/Sao_Paulo');
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
const espera = ms => new Promise(r => setTimeout(r, ms));
const clicar = (sel) => P.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);
const marcar = (sel) => P.evaluate(s => { const el = document.querySelector(s); if (el && !el.checked) el.click(); }, sel);
const el = async (sel, nome) => { await espera(500); const e = await P.$(sel); if (!e) { console.log('SEM', sel); return; } await e.screenshot({ path: out + '/' + nome + '.png' }); console.log('ok', nome); };

await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'nutri@holo.test'); await P.type('#login-senha', 'senha-nutri-1'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await P.addStyleTag({ content: '*{transition:none!important;animation:none!important} .topo,.barra-contexto,#toast,.abas-ficha-caixa{position:static!important}' });

/* HOLOSCAN: resultado da aplicacao */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="holoscan"]').click(); }, fx.PA); await espera(1200);
await el('#holo-resumo', 'holoscan-resultado');

/* Montar com o Playbook */
await P.evaluate((pid, eid) => { window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid); window.levarParaFicha('aba:resultado-holos', pid); }, fx.PA, fx.E1);
await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'), { timeout: 15000 });
await clicar('#aba-resultado-holos [data-rh-acao="playbook"]');
await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos .pb-wiz [data-pb-passo="2"]'), { timeout: 15000 });
await el('[data-pb-passo="1"]', 'playbook-1-leitura');
await clicar('[data-pb-acao="foco"][data-pb-id="ME-F1"]'); await espera(400);
await el('[data-pb-passo="2"]', 'playbook-2-foco');
for (const id of ['ME-C1', 'ME-C4', 'ME-M1']) { await marcar('[data-pb-est="' + id + '"]'); await espera(200); }
await el('[data-pb-passo="3"]', 'playbook-3-estrategias');
await clicar('[data-pb-acao="previa"]'); await espera(800);
await el('#aba-resultado-holos .pb-wiz', 'playbook-4-previa');
console.log('erros JS:', erros.length ? erros : 'nenhum');
await nav.close(); if (servidor) servidor.close();
