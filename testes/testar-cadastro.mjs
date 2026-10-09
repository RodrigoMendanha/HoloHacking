/**
 * Cadastro de nutricionistas com aprovacao (08/10). Supabase falso:
 *   1  /cadastro abre a tela de cadastro; "Criar conta" no login tambem
 *   2  validacoes: nome e sobrenome, e-mail, telefone com DDD (mascara), senha >= 8, confirmacao
 *   3  cadastrar cria a conta com nome/telefone/e-mail e status PENDENTE; o app abre SO com o Perfil (09/10)
 *   4  conta pendente nao cria paciente (trava do servidor) nem muda o proprio status
 *   5  e-mail repetido: mensagem clara
 *   6  administradora ve o menu Contas com o numero de pendentes, libera; "Verificar acesso novamente" abre o app completo
 *   7  recusada ve "Acesso nao liberado"; conta antiga (sem perfil novo) continua entrando direto
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const ADM = srv.criarConta('equipe@holo.test', 'senha-adm-123');
srv.tornarAdmin(ADM);
srv.criarConta('antiga@holo.test', 'senha-antiga-1');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1280, height: 900 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  /* as janelas de boas-vindas sao testadas em testar-boas-vindas.mjs; aqui a pessoa as fecha */
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto(url, { waitUntil: 'networkidle2' });
  return P;
}
const visivel = (P, sel) => P.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && e.offsetParent !== null; }, sel);

/* ----- 1 ----- */
const C = await pagina('http://127.0.0.1:5500/cadastro');
await espera(400);
ok(await visivel(C, '#tela-cadastro') && !(await visivel(C, '#form-login')), '/cadastro abre direto a tela de cadastro');
const L = await pagina('http://127.0.0.1:5500/');
await espera(300);
await L.click('#link-criar-conta'); await espera(200);
ok(await visivel(L, '#tela-cadastro'), '"Criar conta" no login abre o cadastro');
await L.click('#link-cadastro-voltar'); await espera(150);
ok(await visivel(L, '#form-login'), '"Já tenho conta" volta para o login');

/* ----- 2 ----- */
const preencher = (P, v) => P.evaluate((v) => {
  for (const k of Object.keys(v)) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); }
}, v);
const erros = (P) => P.evaluate(() => [...document.querySelectorAll('#form-cadastro .login-erro')].filter(e => !e.hidden).map(e => e.id + ':' + e.textContent));
await preencher(C, { 'cad-nome': 'Ana', 'cad-email': 'x', 'cad-telefone': '1199', 'cad-senha': '123', 'cad-senha2': '321' });
await C.click('#btn-cadastrar'); await espera(200);
const e1 = await erros(C);
ok(e1.length === 5 && srv.linhas('profiles').length === 0, 'campos inválidos são recusados, um aviso por campo, e nada vai ao servidor: ' + e1.map(x => x.split(':')[0]).join(','));
await preencher(C, { 'cad-telefone': '11988887777' });
const mask = await C.evaluate(() => document.getElementById('cad-telefone').value);
ok(mask === '(11) 98888-7777', 'telefone com máscara: ' + mask);

/* ----- 3 ----- */
await preencher(C, { 'cad-nome': 'Ana Nutricionista Teste', 'cad-email': 'ana@holo.test', 'cad-senha': 'senha-boa-1', 'cad-senha2': 'senha-boa-1' });
await C.click('#btn-cadastrar');
await C.waitForFunction(() => document.body.classList.contains('conta-pendente') && document.getElementById('tela-login').hidden, { timeout: 8000 }).catch(() => {});
const perfil = srv.linhas('profiles').find(p => p.email_contato === 'ana@holo.test');
ok(!!perfil && perfil.nome === 'Ana Nutricionista Teste' && perfil.telefone === '11988887777' && perfil.status === 'pendente', 'a conta nasce com nome, telefone, e-mail e status PENDENTE');
const st = await C.evaluate(() => ({ perfil: document.getElementById('secao-perfil').classList.contains('ativa'), aviso: document.getElementById('perfil-aviso-conta').innerText,
  menu: [...document.querySelectorAll('.nav-item')].filter(b => b.offsetParent !== null).map(b => b.dataset.secao), url: location.pathname }));
ok(st.perfil && /sendo preparado/.test(st.aviso) && st.menu.join() === 'perfil', 'depois do cadastro o app abre SÓ com o Perfil e o aviso de cadastro em preparação (menu: ' + st.menu.join() + ')');
ok(st.url === '/', 'o endereço volta para / depois do cadastro');

/* ----- 4 ----- */
const trava = await C.evaluate(async () => {
  const a = await window.supabaseClient.from('patients').insert({ nome: 'Paciente Ficticio' }).select();
  const b = await window.supabaseClient.from('profiles').update({ status: 'ativo' }).eq('id', window.HoloAuth.usuarioAtual().id).select();
  return { pac: !!a.error, st: !!b.error };
});
ok(trava.pac && srv.linhas('patients').length === 0, 'conta pendente não consegue criar paciente (trava do servidor)');
ok(trava.st && srv.statusConta(perfil.id) === 'pendente', 'e não consegue se liberar sozinha');
/* a janela de boas-vindas do primeiro acesso (testada em testar-boas-vindas.mjs) pode abrir agora: espera ela fechar antes do clique real */
await C.waitForFunction(() => !document.querySelector('dialog.bv-janela[open]'), { timeout: 5000 }).catch(() => {}); await espera(300);
await C.click('#btn-verificar-acesso'); await espera(400);
ok(/Ainda aguardando/.test(await C.evaluate(() => document.getElementById('pac-msg').textContent)), '"Verificar acesso novamente" diz que ainda aguarda liberação');

/* ----- 5 ----- */
const D = await pagina('http://127.0.0.1:5500/cadastro');
await espera(300);
await preencher(D, { 'cad-nome': 'Outra Pessoa', 'cad-email': 'ana@holo.test', 'cad-telefone': '11977776666', 'cad-senha': 'outra-senha-1', 'cad-senha2': 'outra-senha-1' });
await D.click('#btn-cadastrar'); await espera(600);
ok(/Já existe uma conta com este e-mail/.test(await D.evaluate(() => document.getElementById('cadastro-mensagem').textContent)), 'e-mail repetido: mensagem clara, sem criar outra conta');

/* ----- 6 ----- */
const A = await pagina('http://127.0.0.1:5500/');
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'equipe@holo.test'); await A.type('#login-senha', 'senha-adm-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => document.getElementById('tela-login').hidden, { timeout: 10000 });
await A.waitForFunction(() => { const n = document.getElementById('nav-contas'); return n && !n.classList.contains('hidden'); }, { timeout: 8000 }).catch(() => {});
const menu = await A.evaluate(() => ({ visivel: !document.getElementById('nav-contas').classList.contains('hidden'), num: document.getElementById('nav-contas-num').textContent }));
ok(menu.visivel && menu.num === '1', 'a administradora vê o menu Contas com 1 pendente');
await A.evaluate(() => document.querySelector('.nav-item[data-secao="contas"]').click());
await A.waitForFunction(() => document.querySelector('[data-ct-aprovar]'), { timeout: 8000 }).catch(() => {});
const lista = await A.evaluate(() => document.getElementById('contas-corpo').innerText);
ok(/Ana Nutricionista Teste/.test(lista) && /ana@holo\.test/.test(lista) && /\(11\) 98888-7777/.test(lista), 'a lista mostra nome, e-mail e telefone do cadastro');
if (process.env.SHOT_DIR) await A.screenshot({ path: process.env.SHOT_DIR + '/contas.png' });
await A.evaluate(() => document.querySelector('[data-ct-aprovar]').click());
await espera(700);
ok(srv.statusConta(perfil.id) === 'ativo', 'Liberar acesso deixa a conta ativa');
await C.waitForFunction(() => !document.querySelector('dialog.bv-janela[open]'), { timeout: 5000 }).catch(() => {});
await C.click('#btn-verificar-acesso');
await C.waitForFunction(() => document.getElementById('tela-login').hidden && !document.body.classList.contains('conta-pendente') && window.ContaAcesso && window.ContaAcesso.status() === 'ativo', { timeout: 8000 }).catch(() => {});
ok(await C.evaluate(() => document.getElementById('tela-login').hidden && !document.body.classList.contains('conta-pendente')), 'a nutri liberada entra no app completo ("Verificar acesso novamente" recarrega)');
const criou = await C.evaluate(async () => { const r = await window.supabaseClient.from('patients').insert({ nome: 'Paciente Ficticio' }).select(); return !r.error; });
ok(criou, 'e agora consegue cadastrar paciente');

/* ----- 7 ----- */
const outra = await pagina('http://127.0.0.1:5500/cadastro');
await espera(300);
await preencher(outra, { 'cad-nome': 'Bruna Recusada Teste', 'cad-email': 'bruna@holo.test', 'cad-telefone': '21977776666', 'cad-senha': 'senha-bruna-1', 'cad-senha2': 'senha-bruna-1' });
await outra.click('#btn-cadastrar'); await espera(800);
const idB = srv.linhas('profiles').find(p => p.email_contato === 'bruna@holo.test').id;
await A.evaluate(() => window.Contas.desenhar()); await espera(500);
await A.evaluate((id) => document.querySelector('[data-ct-recusar="' + id + '"]').click(), idB); await espera(300);
await A.evaluate(() => document.getElementById('modal-confirmar-ok').click()); await espera(600);
ok(srv.statusConta(idB) === 'recusado', 'Recusar (com confirmação) marca a conta como recusada');
await outra.waitForSelector('#btn-verificar-acesso', { visible: true, timeout: 6000 }).catch(() => {});
await outra.waitForFunction(() => !document.querySelector('dialog.bv-janela[open]'), { timeout: 5000 }).catch(() => {});
await outra.click('#btn-verificar-acesso');
await outra.waitForFunction(() => { const t = document.getElementById('tela-status-conta'); return t && !t.hidden; }, { timeout: 8000 }).catch(() => {});
ok(/Acesso não liberado/.test(await outra.evaluate(() => document.getElementById('status-conta-titulo').textContent)), 'a recusada vê "Acesso não liberado"');
const V = await pagina('http://127.0.0.1:5500/');
await V.waitForSelector('#login-email', { visible: true });
await V.type('#login-email', 'antiga@holo.test'); await V.type('#login-senha', 'senha-antiga-1'); await V.click('#btn-entrar');
await V.waitForFunction(() => document.getElementById('tela-login').hidden, { timeout: 8000 }).catch(() => {});
ok(await V.evaluate(() => document.getElementById('tela-login').hidden && document.getElementById('nav-contas').classList.contains('hidden')), 'conta antiga continua entrando direto, e quem não é administradora não vê Contas');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
