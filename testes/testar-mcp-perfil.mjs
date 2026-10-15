/**
 * MCP — aba "Assistente de IA" do Perfil (conexao-ia.js), no navegador com o Supabase falso. Dados ficticios.
 *   T1 a aba existe no Perfil e explica a conexao (Claude/ChatGPT, so os seus pacientes, nada vai ao paciente)
 *   T2 gerar: a URL de conexao aparece UMA vez (…/functions/v1/holohacking-mcp/hh_mcp_…), com Copiar e o aviso
 *   T3 a lista mostra nome, inicio da chave, data; nunca a chave inteira nem o hash; sair do Perfil esquece a URL
 *   T4 revogar (com confirmacao) -> "Revogada"; uso recente aparece
 *   T5 limite de 5 conexoes ativas; conta pendente nao gera (mensagem clara)
 *   T6 celular (390 px) sem rolagem lateral; sem erro de JavaScript
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('ia@holo.test', 'senha-ia-123');
const UP = srv.criarConta('pend@holo.test', 'senha-pend-1');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia IA', registro: 'CRN-0 0000', status: 'ativo', created_at: agora, updated_at: agora });
srv.tabelas.profiles.push({ id: UP, nome: 'Nutri Pendente', status: 'pendente', created_at: agora, updated_at: agora });
srv.tabelas.mcp_usage_log.push({ id: 1, nutritionist_id: UA, key_id: null, ferramenta: 'gerar_resultado', patient_id: null, ok: true, erro: null, created_at: agora });

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const erros = [];
async function abrir(email, senha, largura = 1366) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: largura, height: 1000 });
  P.on('pageerror', e => erros.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  return P;
}
const espera = ms => new Promise(r => setTimeout(r, ms));
const irAba = async (P) => { await P.evaluate(() => { document.querySelector('.nav-item[data-secao="perfil"]').click(); }); await espera(300); await P.evaluate(() => document.querySelector('[data-aba-perfil="ia"]').click()); await espera(500); };
const txt = (P) => P.evaluate(() => document.getElementById('painel-ia').innerText);

const P = await abrir('ia@holo.test', 'senha-ia-123');
await irAba(P);
/* T1 */
const t1 = await txt(P);
ok(await P.evaluate(() => !document.getElementById('painel-ia').classList.contains('hidden') && document.getElementById('painel-perfil').classList.contains('hidden')), 'T1 aba "Assistente de IA" abre o proprio painel');
ok(/Gere o Resultado HOLOS conversando com a sua IA/.test(t1) && /Claude/.test(t1) && /apenas os seus pacientes/.test(t1) && /Nada vai para o paciente sem você/.test(t1), 'T1 explica a conexao e as garantias');
ok(/Nenhuma conexão ainda/.test(t1) && /Gerar Resultado \(análise\)/.test(t1), 'T1 sem conexoes ainda; uso recente com nome amigavel da ferramenta');

/* T2 */
await P.type('#ia-nome', 'Claude do consultório');
await P.click('[data-ia-acao="gerar"]'); await espera(500);
const url = await P.evaluate(() => (document.getElementById('ia-url') || {}).value || '');
ok(/^https:\/\/[a-z0-9]+\.supabase\.co\/functions\/v1\/holohacking-mcp\/hh_mcp_[A-Za-z0-9_-]{43}$/.test(url), 'T2 URL de conexao gerada: ' + url.replace(/hh_mcp_.*/, 'hh_mcp_…'));
const t2 = await txt(P);
ok(/copie agora/i.test(t2) && /não aparece de novo/.test(t2) && !!(await P.$('[data-ia-acao="copiar"]')), 'T2 aviso de que aparece uma vez, com Copiar');
await P.click('[data-ia-acao="copiar"]'); await espera(200);
ok(/URL copiada/.test(await P.evaluate(() => document.getElementById('ia-msg').textContent)), 'T2 Copiar confirma');
const chave = url.split('/').pop();
const k = srv.tabelas.mcp_keys.find(x => x.nutritionist_id === UA);
ok(k && k.nome === 'Claude do consultório' && !JSON.stringify(srv.tabelas.mcp_keys).includes(chave), 'T2 o banco guarda so o hash (nunca a chave)');

/* T3 */
const linha = await P.evaluate(() => document.querySelector('[data-ia-chave]').innerText);
ok(/Claude do consultório/.test(linha) && linha.includes(chave.slice(0, 12) + '…') && !linha.includes(chave), 'T3 a lista mostra nome e o inicio da chave, nunca a chave inteira');
await P.evaluate(() => document.querySelector('.nav-item[data-secao="dashboard"]').click()); await espera(200);
await irAba(P);
ok(!(await P.$('#ia-url')) && !(await txt(P)).includes(chave), 'T3 saiu do Perfil e voltou: a URL nao aparece mais');

/* T4 */
await P.click('[data-ia-acao="revogar"]'); await espera(300);
await P.evaluate(() => document.getElementById('modal-confirmar-ok').click()); await espera(500);
ok(/Revogada/.test(await txt(P)) && !!srv.tabelas.mcp_keys.find(x => x.id === k.id).revoked_at, 'T4 revogar com confirmacao: "Revogada" (no servidor tambem)');

/* T5 */
for (let i = 0; i < 5; i++) { await P.click('[data-ia-acao="gerar"]'); await espera(350); }
ok(await P.evaluate(() => document.querySelector('[data-ia-acao="gerar"]').disabled) && srv.tabelas.mcp_keys.filter(x => !x.revoked_at).length === 5, 'T5 no maximo 5 conexoes ativas (botao desabilitado)');
const Pp = await abrir('pend@holo.test', 'senha-pend-1');
await irAba(Pp);
ok(/quando a equipe HoloHacking liberar a sua conta/.test(await txt(Pp)) && !(await Pp.$('[data-ia-acao="gerar"]')), 'T5 conta pendente: sem gerar, com explicacao');

/* T6 */
const Pc = await abrir('ia@holo.test', 'senha-ia-123', 390);
await irAba(Pc);
ok(await Pc.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'T6 celular 390 px sem rolagem lateral');
ok(!erros.length, 'T6 sem erro de JavaScript' + (erros.length ? ': ' + erros.slice(0, 3).join(' | ') : ''));

await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
