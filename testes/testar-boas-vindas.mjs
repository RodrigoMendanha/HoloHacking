/**
 * Janelas de boas-vindas (09/10), servidor falso:
 *   1  /cadastro e "Criar conta": "Seja bem-vindo(a), nutricionista, ao HoloHacking" com a logo e o passo a passo;
 *      "Fazer meu registro" leva ao formulario (foco no Nome); Esc, X e clique fora fecham; "Ja tenho conta"
 *      volta ao login; aparece TODA VEZ que /cadastro abre; nao aparece no login comum
 *   2  primeira entrada da conta PENDENTE: "o proximo passo e completar o perfil" com o que falta;
 *      "Completar meu perfil" leva ao primeiro item; SO NO PRIMEIRO ACESSO, inclusive em outro aparelho
 *   3  primeira entrada depois de LIBERADA: "Seja bem-vindo(a), nutri HoloHacking"; atalho de paciente;
 *      so no primeiro acesso; contas antigas (sem data de liberacao ou liberadas ha mais de 30 dias) nao veem
 *   +  celular 390px sem rolagem lateral; nenhum erro de JavaScript
 * SHOT_DIR=<pasta> grava as capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const SHOT = process.env.SHOT_DIR || null;
const agora = new Date().toISOString();
/* conta antiga (sem data de liberacao) e conta liberada ha 40 dias: nenhuma ve a janela 3 */
const ANTIGA = srv.criarConta('antiga@holo.test', 'senha-antiga-1');
srv.tabelas.profiles.push({ id: ANTIGA, nome: 'Antiga Ficticia', status: 'ativo', aprovado_em: null, created_at: agora, updated_at: agora });
const VELHA = srv.criarConta('velha@holo.test', 'senha-velha-1');
srv.tabelas.profiles.push({ id: VELHA, nome: 'Velha Ficticia', status: 'ativo', aprovado_em: new Date(Date.now() - 40 * 86400000).toISOString(), created_at: agora, updated_at: agora });

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url, w = 1280, h = 900) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: w, height: h });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto(url, { waitUntil: 'networkidle2' });
  await espera(500);
  return P;
}
const janela = (P) => P.evaluate(() => {
  const d = document.querySelector('dialog.bv-janela[open]');
  return d ? { id: d.id, txt: d.innerText, logo: !!d.querySelector('img.bv-logo[src="/logo-holohacking.png"]'),
    atual: (d.querySelector('.bv-passos li.bv-atual') || {}).innerText || '', feitos: d.querySelectorAll('.bv-passos li.bv-feito').length,
    modal: d.matches(':modal'), foco: document.activeElement && document.activeElement.className } : null;
});
const acao = (P, a) => P.evaluate(a => document.querySelector('dialog.bv-janela[open] [data-bv-acao="' + a + '"]').click(), a);
const foto = async (P, nome) => { if (SHOT) { await espera(450); await P.screenshot({ path: SHOT + '/' + nome }); } };
async function entrar(P, email, senha) {
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => document.getElementById('tela-login').hidden, { timeout: 8000 }).catch(() => {});
  await espera(900);
}

/* ===== 1 ===== */
const C = await pagina('http://127.0.0.1:5500/cadastro');
let j = await janela(C);
ok(j && j.id === 'bv-cadastro' && j.modal && j.logo && /Seja bem-vindo\(a\), nutricionista, ao\s+HoloHacking/i.test(j.txt),
  '/cadastro: janela "Seja bem-vindo(a), nutricionista, ao HoloHacking" com a logo, por cima da tela');
ok(/Faça seu registro/.test(j.atual) && /Complete seu perfil/i.test(j.txt) && /libera seu acesso/i.test(j.txt) && /Fazer meu registro/i.test(j.txt) && /bv-principal/.test(j.foco),
  'passo a passo com "Faça seu registro" em destaque e o botão "Fazer meu registro →" já com o foco');
await foto(C, 'bv-cadastro-desktop.png');
await acao(C, 'registrar'); await espera(200);
ok(!(await janela(C)) && await C.evaluate(() => document.activeElement && document.activeElement.id === 'cad-nome' && !document.getElementById('tela-cadastro').hidden),
  '"Fazer meu registro" fecha a janela e leva ao formulário, com o cursor no Nome');
await C.reload({ waitUntil: 'networkidle2' }); await espera(500);
ok((await janela(C) || {}).id === 'bv-cadastro', 'aparece de novo toda vez que /cadastro abre');
await C.keyboard.press('Escape'); await espera(200);
ok(!(await janela(C)), 'Esc fecha');
await C.reload({ waitUntil: 'networkidle2' }); await espera(500);
await C.mouse.click(8, 8); await espera(200);
ok(!(await janela(C)) && await C.evaluate(() => !document.getElementById('tela-cadastro').hidden), 'clique fora fecha e deixa o formulário de cadastro');
await C.reload({ waitUntil: 'networkidle2' }); await espera(500);
await acao(C, 'entrar'); await espera(250);
ok(!(await janela(C)) && await C.evaluate(() => !document.getElementById('form-login').hidden && location.pathname === '/'), '"Já tenho conta: entrar" fecha e volta para o login');
const L = await pagina('http://127.0.0.1:5500/');
ok(!(await janela(L)), 'o login comum não abre janela');
await L.click('#link-criar-conta'); await espera(250);
ok((await janela(L) || {}).id === 'bv-cadastro', '"Criar conta" no login também abre as boas-vindas');
await acao(L, 'fechar'); await espera(150);
ok(!(await janela(L)), 'o X fecha');
const M = await pagina('http://127.0.0.1:5500/cadastro', 390, 844);
const larg = await M.evaluate(() => ({ doc: document.documentElement.scrollWidth, d: (r => ({ left: r.left, right: r.right }))(document.querySelector('dialog.bv-janela[open]').getBoundingClientRect()) }));
ok(larg.doc <= 390 && larg.d.left >= 0 && larg.d.right <= 390, 'celular 390px: a janela cabe na tela, sem rolagem lateral');
await foto(M, 'bv-cadastro-mobile.png');

/* ===== 2 ===== */
await C.goto('http://127.0.0.1:5500/cadastro', { waitUntil: 'networkidle2' }); await espera(500);
await acao(C, 'registrar'); await espera(150);
await C.evaluate(() => {
  const v = { 'cad-nome': 'Ana Nutri Ficticia', 'cad-email': 'ana@holo.test', 'cad-telefone': '11988887777', 'cad-senha': 'senha-boa-1', 'cad-senha2': 'senha-boa-1' };
  for (const k of Object.keys(v)) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); }
});
await C.click('#btn-cadastrar');
await C.waitForFunction(() => document.body.classList.contains('conta-pendente') && document.getElementById('tela-login').hidden, { timeout: 8000 }).catch(() => {});
await espera(900);
j = await janela(C);
ok(j && j.id === 'bv-perfil' && /Olá, Ana!/.test(j.txt) && /próximo passo é\s+completar o seu perfil profissional/i.test(j.txt) && j.logo,
  'primeira entrada da pendente: "Olá, Ana!" e "o próximo passo é completar o seu perfil profissional"');
ok(j && j.feitos === 1 && /Complete seu perfil/.test(j.atual) && /Foto/.test(j.txt) && /CRN/.test(j.txt) && /Logo/.test(j.txt) && /Assinatura/.test(j.txt) && /Carimbo/.test(j.txt),
  'registro marcado como feito, "Complete seu perfil" em destaque e a lista do que falta (Foto, CRN, Logo, Assinatura, Carimbo)');
await foto(C, 'bv-perfil-desktop.png');
await acao(C, 'completar'); await espera(500);
const alvo = await C.evaluate(() => ({ foco: document.activeElement && document.activeElement.getAttribute('data-enviar'), perfil: document.getElementById('secao-perfil').classList.contains('ativa') }));
ok(!(await janela(C)) && alvo.perfil && alvo.foco === 'foto_id', '"Completar meu perfil" fecha e leva ao primeiro item que falta (Foto), com foco');
const ana = srv.contas['ana@holo.test'];
ok(ana.meta && ana.meta.holohacking_boasvindas_perfil === true, 'o "já vi" fica guardado na conta (vale em qualquer aparelho)');
await C.reload({ waitUntil: 'networkidle2' }); await espera(1200);
ok(!(await janela(C)), 'segundo acesso no mesmo aparelho: não aparece de novo');
const C2 = await pagina('http://127.0.0.1:5500/', 390, 844);
await entrar(C2, 'ana@holo.test', 'senha-boa-1');
ok(await C2.evaluate(() => document.body.classList.contains('conta-pendente')) && !(await janela(C2)), 'outro aparelho (celular): não aparece de novo');

/* ===== 3 ===== */
const pAna = srv.tabelas.profiles.find(p => p.id === ana.id);
pAna.status = 'ativo'; pAna.aprovado_em = new Date().toISOString();
const A = await pagina('http://127.0.0.1:5500/');
await entrar(A, 'ana@holo.test', 'senha-boa-1');
await espera(400);
j = await janela(A);
ok(j && j.id === 'bv-liberada' && /Olá, Ana!/.test(j.txt) && /Seja bem-vindo\(a\), nutri\s+HoloHacking/i.test(j.txt) && /acesso foi liberado/i.test(j.txt) && j.feitos === 3,
  'primeira entrada depois de liberada: "Olá, Ana! Seja bem-vindo(a), nutri HoloHacking" e os 3 passos feitos');
await foto(A, 'bv-liberada-desktop.png');
await acao(A, 'pacientes'); await espera(700);
ok(!(await janela(A)) && await A.evaluate(() => document.getElementById('secao-pacientes').classList.contains('ativa')),
  '"Cadastrar a primeira paciente" fecha e leva a Pacientes');
ok(ana.meta.holohacking_boasvindas_liberada === true, 'o "já vi" da liberação também fica na conta');
const A2 = await pagina('http://127.0.0.1:5500/');
await entrar(A2, 'ana@holo.test', 'senha-boa-1'); await espera(400);
ok(!(await janela(A2)), 'próximo acesso (outro aparelho): não aparece de novo');
const V1 = await pagina('http://127.0.0.1:5500/');
await entrar(V1, 'antiga@holo.test', 'senha-antiga-1'); await espera(400);
const V2 = await pagina('http://127.0.0.1:5500/');
await entrar(V2, 'velha@holo.test', 'senha-velha-1'); await espera(400);
ok(!(await janela(V1)) && !(await janela(V2)), 'contas antigas (sem data de liberação ou liberadas há 40 dias) não veem a janela');
const AM = await pagina('http://127.0.0.1:5500/', 390, 844);
await AM.evaluate(() => localStorage.clear());
pAna.aprovado_em = new Date().toISOString(); delete ana.meta.holohacking_boasvindas_liberada;
await entrar(AM, 'ana@holo.test', 'senha-boa-1'); await espera(400);
const lm = await AM.evaluate(() => ({ doc: document.documentElement.scrollWidth, d: (r => ({ left: r.left, right: r.right }))((document.querySelector('dialog.bv-janela[open]') || document.body).getBoundingClientRect()) }));
ok((await janela(AM) || {}).id === 'bv-liberada' && lm.doc <= 390 && lm.d.right <= 390, 'celular 390px: janela da liberação cabe na tela');
await foto(AM, 'bv-liberada-mobile.png');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
process.exit(falhou ? 1 : 0);
