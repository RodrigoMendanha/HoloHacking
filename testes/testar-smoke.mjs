/**
 * SMOKE — verificacao rapida de que o app carrega sem erro.
 *
 * Nao testa funcionalidade clinica. Testa:
 *   A  Pagina carrega sem erro de JS
 *   B  Tela de login aparece
 *   C  Elementos essenciais existem no DOM
 *   D  CSS carregou (login-cartao tem estilos)
 *   E  Scripts carregaram (window.HoloAuth, LoginView, DadosRouter)
 *   F  Nenhum 404 em recurso critico
 */
import puppeteer from 'puppeteer-core';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1366, height: 900 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
const falhas404 = [];
p.on('response', r => { if (r.status() === 404 && !r.url().includes('favicon')) falhas404.push(r.url()); });
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

/* ==================================================================== */
console.log('\n  A — PAGINA CARREGA SEM ERRO DE JS\n');
/* ==================================================================== */

ok(ruim.length === 0, 'nenhum erro de JS no carregamento' +
   (ruim.length ? ': ' + ruim[0] : ''));

/* ==================================================================== */
console.log('\n  B — TELA DE LOGIN APARECE\n');
/* ==================================================================== */

const login = await p.evaluate(() => {
  const tela = document.getElementById('tela-login');
  const visivel = tela && getComputedStyle(tela).display !== 'none';
  const cartao = document.querySelector('.login-cartao');
  return { visivel, temCartao: !!cartao };
});

ok(login.visivel, 'tela de login esta visivel');
ok(login.temCartao, 'login-cartao existe no DOM');

/* ==================================================================== */
console.log('\n  C — ELEMENTOS ESSENCIAIS EXISTEM\n');
/* ==================================================================== */

const elementos = await p.evaluate(() => {
  const ids = [
    'form-login', 'login-email', 'login-senha', 'btn-entrar',
    'link-esqueci', 'tela-recuperar', 'tela-nova-senha',
    'app', 'conteudo-principal'
  ];
  const faltando = ids.filter(id => !document.getElementById(id));
  return { faltando };
});

ok(elementos.faltando.length === 0, 'todos os elementos essenciais existem' +
   (elementos.faltando.length ? ': faltam ' + elementos.faltando.join(', ') : ''));

/* ==================================================================== */
console.log('\n  D — CSS CARREGOU\n');
/* ==================================================================== */

const css = await p.evaluate(() => {
  const cartao = document.querySelector('.login-cartao');
  if (!cartao) return { ok: false };
  const s = getComputedStyle(cartao);
  return {
    ok: true,
    temMaxWidth: s.maxWidth !== 'none',
    temBg: s.backgroundColor !== 'rgba(0, 0, 0, 0)'
  };
});

ok(css.ok && css.temMaxWidth, 'login-cartao tem max-width definido');
ok(css.ok && css.temBg, 'login-cartao tem background definido');

/* ==================================================================== */
console.log('\n  E — SCRIPTS CARREGARAM\n');
/* ==================================================================== */

const scripts = await p.evaluate(() => {
  return {
    HoloAuth: !!window.HoloAuth,
    LoginView: !!window.LoginView,
    DadosRouter: !!window.DadosRouter,
    AuthService: !!window.AuthService,
    DadosLocais: !!window.DadosLocais,
  };
});

ok(scripts.HoloAuth, 'window.HoloAuth existe');
ok(scripts.LoginView, 'window.LoginView existe');
ok(scripts.DadosRouter, 'window.DadosRouter existe');
ok(scripts.AuthService, 'window.AuthService existe');
ok(scripts.DadosLocais, 'window.DadosLocais existe');

/* ==================================================================== */
console.log('\n  F — NENHUM 404 EM RECURSO CRITICO\n');
/* ==================================================================== */

ok(falhas404.length === 0, 'nenhum recurso retornou 404' +
   (falhas404.length ? ': ' + falhas404.join(', ') : ''));

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
