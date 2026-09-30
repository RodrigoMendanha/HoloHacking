/**
 * RODADA 08 — ONDA 7: CONCORRENCIA E SESSAO
 *
 * Supabase falso, app real.
 *
 *   1  duas abas editam o mesmo cadastro: a segunda NAO desfaz a primeira
 *      (so os campos que mudaram + updated_at); reabrindo, grava
 *   2  logout: nenhum nome nem texto clinico fica no HTML da pagina
 *   3  logout: fora do stash da propria conta, o localStorage nao guarda
 *      dado clinico; o stash e isolado por uid
 *   4  outra conta no mesmo navegador nao ve nada da anterior
 *   5  nome parecido avisa "Já existe paciente com nome semelhante."
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
const UID_B = srv.criarConta('b@holo.test', 'senha-b-123');
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();

async function pagina() {
  const p = await ctx.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  p.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(p, srv);
  await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  return p;
}
async function pronto(p) {
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await p.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(250);
}
async function entrar(p, email, senha) {
  await p.waitForSelector('#login-email', { visible: true });
  await p.evaluate(() => { document.getElementById('login-email').value = ''; document.getElementById('login-senha').value = ''; });
  await p.type('#login-email', email);
  await p.type('#login-senha', senha);
  await p.click('#btn-entrar');
  await pronto(p);
}
async function cadastrar(p, nome, resposta) {
  return p.evaluate(async (nome, resposta) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    await new Promise(r => setTimeout(r, 300));
    const m = document.getElementById('modal-confirmar-acao');
    const aviso = !m.classList.contains('hidden') ? document.getElementById('modal-confirmar-titulo').textContent : '';
    if (aviso) {
      if (resposta === 'ok') document.getElementById('modal-confirmar-ok').click();
      else document.querySelector('#modal-confirmar-rodape .btn-cancelar').click();
    }
    await new Promise(r => setTimeout(r, 600));
    return aviso;
  }, nome, resposta);
}

const T1 = await pagina();
await entrar(T1, 'a@holo.test', 'senha-a-123');
await cadastrar(T1, 'Paciente Sigilo');
const P = srv.linhas('patients').find(x => x.nome === 'Paciente Sigilo').id;

/* ==================================================================== */
titulo('1. DUAS ABAS, MESMO CADASTRO');
/* ==================================================================== */

const T2 = await pagina();
await pronto(T2);
async function editar(p, campo, valor) {
  return p.evaluate(async (pid, campo, valor) => {
    const t = document.getElementById('toast');
    const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('btn-editar-paciente').click();
    await new Promise(r => setTimeout(r, 150));
    document.getElementById(campo).value = valor;
    document.getElementById('btn-salvar-paciente').click();
    await new Promise(r => setTimeout(r, 700));
    obs.disconnect();
    return vistos.join(' | ');
  }, P, campo, valor);
}
// as duas abas carregaram a mesma versao; T1 salva primeiro
await T2.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 150)); }, P);
let t = await editar(T1, 'np-telefone', '11 99999-0000');
ok(srv.linhas('patients').find(x => x.id === P).telefone === '11 99999-0000', 'aba 1 salvou o telefone');
t = await editar(T2, 'np-queixa', 'queixa da aba 2');
const depois = srv.linhas('patients').find(x => x.id === P);
ok(depois.telefone === '11 99999-0000' && !depois.queixa && /alterado em outra aba/.test(t),
   'aba 2 (versao velha) NAO grava e nao desfaz o telefone: "' + t.slice(0, 60) + '..."');
await T2.reload({ waitUntil: 'networkidle2' });
await pronto(T2);
await editar(T2, 'np-queixa', 'queixa da aba 2');
const final = srv.linhas('patients').find(x => x.id === P);
ok(final.telefone === '11 99999-0000' && final.queixa === 'queixa da aba 2',
   'reaberta, a aba 2 grava SO a queixa — o telefone da aba 1 continua');
await T2.close();

/* ==================================================================== */
titulo('2-3. LOGOUT');
/* ==================================================================== */

await T1.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('.nav-item[data-secao="mente"]').click();
  document.querySelector('[data-vista="vista-oq3"]').click();
  await new Promise(r => setTimeout(r, 300));
  const q = document.getElementById('oq3-quer');
  q.value = 'texto sigiloso do oq3';
  document.getElementById('btn-salvar-oq3').click();
  await new Promise(r => setTimeout(r, 600));
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 300));
}, P);
ok(await T1.evaluate(() => document.getElementById('app').innerHTML.includes('Paciente Sigilo')),
   '(antes do logout o nome esta na tela — o teste enxerga)');
await T1.evaluate(() => window.HoloAuth.sair());
await T1.waitForSelector('#login-email', { visible: true });
await esperar(300);
const pagina1 = await T1.evaluate(() => {
  const html = document.getElementById('app').innerHTML;
  const valores = [...document.querySelectorAll('#app input, #app textarea')].map(e => e.value).join(' ');
  const onde = [];
  document.querySelectorAll('#app *').forEach(el => {
    if (el.children.length === 0 && /Paciente Sigilo|texto sigiloso/.test(el.outerHTML)) {
      onde.push((el.id ? '#' + el.id : el.tagName + '.' + el.className) + ' < ' +
        (el.closest('[id]') ? el.closest('[id]').id : ''));
    }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && /Paciente Sigilo|texto sigiloso/.test(el.value)) onde.push('valor #' + el.id);
  });
  return { onde: onde.slice(0, 12), nome: html.includes('Paciente Sigilo') || valores.includes('Paciente Sigilo'),
           texto: html.includes('texto sigiloso') || valores.includes('texto sigiloso') };
});
ok(!pagina1.nome && !pagina1.texto, 'depois do logout, nem o nome nem o texto clinico ficam no HTML' +
   (pagina1.onde.length ? ': ' + pagina1.onde.join(' ; ') : ''));

const disco = await T1.evaluate(() => {
  const soltas = [], stashes = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i), v = localStorage.getItem(k) || '';
    if (!/Paciente Sigilo|texto sigiloso/.test(v)) continue;
    if (k.indexOf('holohacking._stash.') === 0) stashes.push(k); else soltas.push(k);
  }
  return { soltas, stashes };
});
ok(disco.soltas.length === 0, 'fora do stash, nenhuma chave guarda dado clinico: ' + (disco.soltas.join(', ') || 'nenhuma'));
ok(disco.stashes.every(k => k.indexOf('holohacking._stash.' + UID_A + '.') === 0),
   'o que ficou esta no stash DA CONTA A (isolado por uid): ' + disco.stashes.length + ' chave(s)');

/* ==================================================================== */
titulo('4. OUTRA CONTA NO MESMO NAVEGADOR');
/* ==================================================================== */

await entrar(T1, 'b@holo.test', 'senha-b-123');
const b = await T1.evaluate(() => ({
  pacientes: (window.pacientesTodos() || []).map(x => x.nome),
  html: document.getElementById('app').innerHTML.includes('Paciente Sigilo')
}));
ok(b.pacientes.length === 0 && !b.html, 'a conta B nao ve nada da A: ' + JSON.stringify(b.pacientes));
await T1.evaluate(() => window.HoloAuth.sair());
await T1.waitForSelector('#login-email', { visible: true });
await entrar(T1, 'a@holo.test', 'senha-a-123');
ok((await T1.evaluate(() => (window.pacientesTodos() || []).map(x => x.nome))).includes('Paciente Sigilo'),
   'e a conta A, de volta, encontra a carteira dela');

/* ==================================================================== */
titulo('5. NOME SEMELHANTE');
/* ==================================================================== */

let aviso = await cadastrar(T1, 'paciente  SIGILO', 'cancelar');
ok(aviso === 'Já existe paciente com nome semelhante.' &&
   srv.linhas('patients').filter(x => x.nutritionist_id === UID_A).length === 1,
   'avisa ("' + aviso + '") e Cancelar nao cadastra');
aviso = await cadastrar(T1, 'Pacíente Sigilo', 'ok');
ok(aviso && srv.linhas('patients').filter(x => x.nutritionist_id === UID_A).length === 2,
   'acento nao engana o aviso; "Cadastrar mesmo assim" cadastra (homonimos existem)');
aviso = await cadastrar(T1, 'Outra Pessoa', 'ok');
ok(aviso === '', 'nome diferente: sem aviso');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
