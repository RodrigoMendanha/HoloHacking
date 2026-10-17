/* SONDA de UI (ferramenta de desenvolvimento, fora da suite): sobe a paciente ficticia do template 5 e roda um roteiro
   passado em ROTEIRO=<arquivo .mjs> que exporta default async ({ P, srv, fx, espera, foto }) => {...}. FOTOS=<pasta>. */
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia 1', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA);
const nav = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1440, height: 1000 });
const erros = []; P.on('pageerror', e => erros.push(e.message));
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
const espera = ms => new Promise(r => setTimeout(r, ms));
const foto = async (nome, sel, full) => { const d = process.env.FOTOS; if (!d) return; if (sel) { const e = await P.$(sel); if (e) return e.screenshot({ path: d + '/' + nome + '.png' }); } return P.screenshot({ path: d + '/' + nome + '.png', fullPage: !!full }); };
const rot = (await import(process.env.ROTEIRO)).default;
try { await rot({ P, srv, fx, espera, foto }); } catch (e) { console.log('ERRO ROTEIRO', e.message); }
console.log('erros JS:', JSON.stringify(erros));
await nav.close();
