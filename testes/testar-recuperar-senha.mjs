/**
 * "Esqueci minha senha" de ponta a ponta (08/10). Supabase falso:
 *   1  pedir a recuperacao: mensagem neutra (nao diz se a conta existe); limite de envio aparece claro
 *   2  chegar pelo link do e-mail (#...type=recovery): a tela de NOVA SENHA vem primeiro e o app NAO abre sozinho,
 *      mesmo com o evento PASSWORD_RECOVERY chegando depois da sessao inicial
 *   3  senha curta (< 8) e confirmacao diferente sao recusadas
 *   4  salvar a senha nova abre o app e limpa o endereco; a senha nova entra no login, a antiga nao
 *   5  link expirado: volta ao login com aviso
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('nutri@holo.test', 'senha-antiga-1');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1280, height: 900 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto(url, { waitUntil: 'networkidle2' });
  return P;
}
const visivel = (P, sel) => P.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);

/* ----- 1 ----- */
const R = await pagina('http://127.0.0.1:5500/');
await R.click('#link-esqueci'); await espera(150);
await R.type('#recuperar-email', 'nutri@holo.test'); await R.click('#btn-recuperar'); await espera(500);
const m1 = await R.evaluate(() => document.getElementById('recuperar-mensagem').textContent);
ok(/Se houver uma conta associada/.test(m1) && srv.pedidosRecuperacao === 1, 'pedir a recuperação: mensagem neutra e o pedido vai ao servidor');
srv.limiteRecuperacao = true;
await R.click('#btn-recuperar'); await espera(500);
const m2 = await R.evaluate(() => document.getElementById('recuperar-mensagem').textContent);
ok(/Muitos pedidos/.test(m2), 'limite de envio do servidor de e-mail aparece claro (antes dizia "enviaremos"): ' + m2);
srv.limiteRecuperacao = false;

/* ----- 2 ----- */
const L = await pagina('http://127.0.0.1:5500/#access_token=falso-' + UA + '&expires_in=3600&refresh_token=x&token_type=bearer&type=recovery');
await espera(1500);   // o evento PASSWORD_RECOVERY chega 400 ms depois da sessao inicial
ok(await visivel(L, '#tela-nova-senha'), 'pelo link do e-mail, a tela "Criar nova senha" aparece');
ok(await L.evaluate(() => !document.getElementById('tela-login').hidden), 'e o app NÃO abre sozinho antes da senha nova');

/* ----- 3 ----- */
const tentar = async (a, b) => {
  await L.evaluate((a, b) => { document.getElementById('nova-senha').value = a; document.getElementById('confirmar-senha').value = b; document.getElementById('btn-nova-senha').click(); }, a, b);
  await espera(300);
  return L.evaluate(() => [...document.querySelectorAll('#form-nova-senha .login-erro')].filter(e => !e.hidden).map(e => e.textContent).join(' | '));
};
ok(/8 caracteres/.test(await tentar('curta1', 'curta1')), 'senha com menos de 8 caracteres é recusada');
ok(/não coincidem/.test(await tentar('senha-nova-1', 'senha-nova-2')), 'confirmação diferente é recusada');

/* ----- 4 ----- */
await tentar('senha-nova-123', 'senha-nova-123');
await L.waitForFunction(() => document.getElementById('tela-login').hidden, { timeout: 6000 }).catch(() => {});
const depois = await L.evaluate(() => ({ app: document.getElementById('tela-login').hidden, hash: location.hash }));
ok(depois.app && !/type=recovery/.test(depois.hash), 'salvar a senha nova abre o app e limpa o endereço');
const V = await pagina('http://127.0.0.1:5500/');
const entrar = async (senha) => {
  await V.evaluate(() => { document.getElementById('login-email').value = ''; document.getElementById('login-senha').value = ''; });
  await V.type('#login-email', 'nutri@holo.test'); await V.type('#login-senha', senha); await V.click('#btn-entrar'); await espera(800);
  return V.evaluate(() => ({ app: document.getElementById('tela-login').hidden, msg: document.getElementById('login-mensagem').textContent }));
};
ok(/incorretos/.test((await entrar('senha-antiga-1')).msg), 'a senha antiga não entra mais');
ok((await entrar('senha-nova-123')).app, 'a senha nova entra');

/* ----- 5 ----- */
const X = await pagina('http://127.0.0.1:5500/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
await espera(500);
ok(/expirou ou já foi usado/.test(await X.evaluate(() => document.getElementById('login-mensagem').textContent)) && await visivel(X, '#form-login'), 'link expirado: volta ao login com aviso para pedir outro');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
