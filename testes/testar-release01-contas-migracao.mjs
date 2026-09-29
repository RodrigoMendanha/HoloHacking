/**
 * RELEASE 01 — CONTAS NO MESMO NAVEGADOR E MIGRACAO LOCAL → SERVIDOR POR UID
 *
 * Supabase falso (supabase-falso.mjs), app real.
 *
 *   1  Dados criados SEM sessao (HOLOSCAN, exames, ferramenta) sobem na
 *      primeira entrada da conta A; a marca e por uid
 *   2  Idempotencia: rodar a migracao de novo nao duplica nada
 *   3  Conta B no MESMO navegador migra os proprios dados (a marca de A nao
 *      bloqueia), nao ve nada de A, e A continua inteira quando volta
 *   4  Sessao que terminou sem logout: B entra depois e NAO herda as caixas
 *      de A (nem para a tela, nem para a migracao)
 *   5  Marca global antiga (holohacking.migrado_supa_v1): nao bloqueia a conta
 *      nova, mas pacientes de dono desconhecido nao sobem — ficam locais
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

const srv = criarServidor();
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
const UID_B = srv.criarConta('b@holo.test', 'senha-b-123');
const UID_C = srv.criarConta('c@holo.test', 'senha-c-123');

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });

const errosJS = [];
async function navegador(nome) {
  const ctx = await nav.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  p.on('pageerror', e => errosJS.push(nome + ': ' + e.message));
  p.on('dialog', d => d.accept());
  await ligarPagina(p, srv);
  await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  return { ctx, p };
}

async function semSessao(p) {
  await p.waitForSelector('#saida-dev', { visible: true });
  await p.click('#saida-dev');
  await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
  await esperar(300);
}

async function entrar(p, email, senha) {
  await p.waitForSelector('#login-email', { visible: true });
  await p.evaluate(() => { document.getElementById('login-email').value = ''; document.getElementById('login-senha').value = ''; });
  await p.type('#login-email', email);
  await p.type('#login-senha', senha);
  await p.click('#btn-entrar');
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await p.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(200);
  await p.evaluate(() => window.Sincronizacao.aguardar());
}

async function sair(p) {
  await p.evaluate(() => window.HoloAuth.sair());
  await p.waitForSelector('#login-email', { visible: true });
  await esperar(200);
}

async function recarregar(p) {
  await p.reload({ waitUntil: 'networkidle2' });
}

async function cadastrar(p, nome) {
  return p.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const achou = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
    }
    return null;
  }, nome);
}

/** Tudo pela tela/APIs do app, sem sessao: questionario calculado e salvo,
    exames conferidos, Roda da Vida concluida. */
async function registrarSemSessao(p) {
  return p.evaluate(async (respostas) => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(r => setTimeout(r, 200));
    const mapa = {};
    respostas.forEach(r => { mapa[r.marcador_id] = r.intensidade; });
    document.querySelectorAll('.q-item').forEach(item => {
      const v = mapa[item.dataset.marcador];
      if (v !== undefined) item.querySelectorAll('.q-btn')[v].click();
    });
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('btn-salvar-holoscan').click();
    await new Promise(r => setTimeout(r, 300));

    const pid = window.pacienteAtivoId();
    const eid = window.HOLOSCAN.listaDeExames()[0].id;
    const t = JSON.parse(localStorage.getItem('holohacking.exames') || '{}');
    t[pid] = { [eid]: 95 };
    localStorage.setItem('holohacking.exames', JSON.stringify(t));

    const a = await window.Aplicacoes.nova({ id: 'carta_futuro' });
    await window.Aplicacoes.concluir(a, { carta: 'daqui a um ano' }, null);
    return { pid, eid, app: a.id };
  }, caso.respostas);
}

const contar = (pid) => ({
  pacientes: srv.linhas('patients').filter(x => x.id === pid).length,
  holoscan: srv.linhas('holoscan_applications').filter(x => x.patient_id === pid).length,
  respostas: srv.linhas('holoscan_answers').filter(a =>
    srv.linhas('holoscan_applications').some(x => x.id === a.application_id && x.patient_id === pid)).length,
  coletas: srv.linhas('lab_collections').filter(x => x.patient_id === pid).length,
  ferramentas: srv.linhas('tool_applications').filter(x => x.patient_id === pid).length
});

/* ==================================================================== */
titulo('1. DADOS SEM SESSAO SOBEM NA PRIMEIRA ENTRADA DA CONTA A');
/* ==================================================================== */

const M = await navegador('M');
await semSessao(M.p);
const PA = await cadastrar(M.p, 'Offline de A');
const regA = await registrarSemSessao(M.p);
ok(!!PA && regA.pid === PA, 'paciente e registros criados sem sessao, so no navegador');
ok(srv.linhas('patients').length === 0, 'o servidor ainda nao sabe de nada');

await recarregar(M.p);
await entrar(M.p, 'a@holo.test', 'senha-a-123');
let n = contar(PA);
ok(n.pacientes === 1 && srv.linhas('patients').find(x => x.id === PA).nutritionist_id === UID_A,
   'o paciente subiu, sob a conta A');
ok(n.holoscan === 1 && n.respostas === 84, 'o HOLOSCAN subiu com as 84 respostas');
ok(n.coletas === 1 && srv.linhas('lab_collections').find(x => x.patient_id === PA).data_coleta_desconhecida === true,
   'os exames subiram como coleta de DATA DESCONHECIDA (nunca "hoje")');
ok(n.ferramentas === 1 && srv.linhas('tool_applications').some(t => t.id === regA.app),
   'a ferramenta aplicada offline subiu com o mesmo id (item 21)');
const marcas = await M.p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('holohacking.migrado_supa') === 0));
ok(marcas.includes('holohacking.migrado_supa.' + UID_A) && !marcas.includes('holohacking.migrado_supa_v1'),
   'a marca e por uid, e a global antiga nao e mais gravada: ' + marcas.join(', '));
const aposMigrar = await M.p.evaluate((pid) => {
  const h = (JSON.parse(localStorage.getItem('holohacking.pontuacao')) || {})[pid] || [];
  return { n: h.length, comId: h.filter(e => e._supa_id).length };
}, PA);
ok(aposMigrar.n === 1 && aposMigrar.comId === 1, 'a entrada local ganhou o id remoto e nao duplicou na hidratacao');

/* ==================================================================== */
titulo('2. IDEMPOTENCIA');
/* ==================================================================== */

const antes = contar(PA);
for (let i = 0; i < 2; i++) {
  await M.p.evaluate((uid) => localStorage.removeItem('holohacking.migrado_supa.' + uid), UID_A);
  await M.p.evaluate(() => window.migrarParaSupabase());
}
await M.p.evaluate((uid) => localStorage.removeItem('holohacking.migrado_supa.' + uid), UID_A);
await recarregar(M.p);
await M.p.waitForFunction(() => window.HoloAuth.sessaoAtiva() && window.pacientesCarregados(), { timeout: 15000 });
await M.p.evaluate(() => window.Sincronizacao.aguardar());
const depois = contar(PA);
ok(JSON.stringify(antes) === JSON.stringify(depois),
   'tres rodadas a mais: nada duplicou — ' + JSON.stringify(depois));

/* ==================================================================== */
titulo('3. CONTA B NO MESMO NAVEGADOR');
/* ==================================================================== */

await sair(M.p);
const semA = await M.p.evaluate(() => ({
  pont: localStorage.getItem('holohacking.pontuacao'),
  dono: localStorage.getItem('holohacking.dono_local')
}));
ok(semA.pont === null && semA.dono === null, 'logout de A: caixas clinicas e dono saem do disco (vao para o stash)');
await semSessao(M.p);
const PB = await cadastrar(M.p, 'Offline de B');
const regB = await registrarSemSessao(M.p);
await recarregar(M.p);
await entrar(M.p, 'b@holo.test', 'senha-b-123');

n = contar(PB);
ok(n.pacientes === 1 && srv.linhas('patients').find(x => x.id === PB).nutritionist_id === UID_B,
   'B migrou os proprios dados: a marca de A nao bloqueou');
ok(n.holoscan === 1 && n.ferramentas === 1 && n.coletas === 1, 'HOLOSCAN, ferramenta e exames de B subiram');
ok(srv.linhas('patients').filter(x => x.nutritionist_id === UID_B).length === 1,
   'nada de A foi parar na conta B');
const vistoB = await M.p.evaluate((pa) => ({
  lista: window.pacientesTodos().map(p => p.nome),
  pont: Object.keys(JSON.parse(localStorage.getItem('holohacking.pontuacao') || '{}')),
  ex: Object.keys(JSON.parse(localStorage.getItem('holohacking.exames') || '{}')),
  apps: window.Aplicacoes.doPaciente(pa).length,
  coletas: window.Sincronizacao.coletas(pa)
}), PA);
ok(vistoB.lista.length === 1 && vistoB.lista[0] === 'Offline de B', 'B so ve o proprio paciente');
ok(!vistoB.pont.includes(PA) && !vistoB.ex.includes(PA) && vistoB.apps === 0 && !vistoB.coletas,
   'B nao ve HOLOSCAN, exames, ferramentas nem coletas de A');
const docsB = await M.p.evaluate(async (pa) => (await window.ArquivoStore.listar(pa)).length, PA);
ok(docsB === 0, 'B nao ve documentos de A');
const marcas2 = await M.p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('holohacking.migrado_supa.') === 0));
ok(marcas2.length === 2, 'uma marca por conta: ' + marcas2.length);

await sair(M.p);
await entrar(M.p, 'a@holo.test', 'senha-a-123');
const vistoA = await M.p.evaluate((pa, pb) => ({
  lista: window.pacientesTodos().map(p => p.id),
  hist: ((JSON.parse(localStorage.getItem('holohacking.pontuacao')) || {})[pa] || []).length,
  ex: (JSON.parse(localStorage.getItem('holohacking.exames')) || {})[pa] || null,
  apps: window.Aplicacoes.doPaciente(pa).length,
  vePB: !!(JSON.parse(localStorage.getItem('holohacking.pontuacao')) || {})[pb]
}), PA, PB);
ok(vistoA.lista.length === 1 && vistoA.lista[0] === PA, 'A volta e ve o proprio paciente, so ele');
ok(vistoA.hist === 1 && vistoA.ex && vistoA.apps === 1, 'com HOLOSCAN, exames e ferramenta intactos');
ok(!vistoA.vePB, 'e sem nada de B');

/* ==================================================================== */
titulo('4. SESSAO QUE TERMINOU SEM LOGOUT');
/* ==================================================================== */

// A esta logada com as caixas no disco; a sessao "expira" sem SIGNED_OUT
await M.p.evaluate(() => localStorage.removeItem('sb-falso-auth-token'));
await recarregar(M.p);
const orfas = await M.p.evaluate((pa) => ({
  pont: !!(JSON.parse(localStorage.getItem('holohacking.pontuacao') || '{}'))[pa],
  dono: localStorage.getItem('holohacking.dono_local')
}), PA);
ok(orfas.pont && orfas.dono === UID_A, 'cenario montado: caixas de A no disco, dono = A, sem sessao');
await entrar(M.p, 'b@holo.test', 'senha-b-123');
const herdou = await M.p.evaluate((pa) => ({
  pont: !!(JSON.parse(localStorage.getItem('holohacking.pontuacao') || '{}'))[pa],
  ex: !!(JSON.parse(localStorage.getItem('holohacking.exames') || '{}'))[pa],
  dono: localStorage.getItem('holohacking.dono_local')
}), PA);
const stashA = await M.p.evaluate((uid) =>
  !!localStorage.getItem('holohacking._stash.' + uid + '.holohacking.pontuacao'), UID_A);
ok(!herdou.pont && !herdou.ex, 'B nao herda as caixas de A');
ok(stashA && herdou.dono === UID_B, 'as caixas de A foram para o stash de A; o dono agora e B');
ok(srv.linhas('patients').filter(x => x.nutritionist_id === UID_B).length === 1,
   'e a migracao de B nao enviou nada de A');

/* ==================================================================== */
titulo('5. MARCA GLOBAL ANTIGA (LEGADO)');
/* ==================================================================== */

const L = await navegador('L');
await semSessao(L.p);
const PC = await cadastrar(L.p, 'Dono Desconhecido');
await L.p.evaluate(() => localStorage.setItem('holohacking.migrado_supa_v1', '2026-09-01T00:00:00.000Z'));
await recarregar(L.p);
await entrar(L.p, 'c@holo.test', 'senha-c-123');
ok(!srv.linhas('patients').some(x => x.id === PC),
   'com a marca global antiga, paciente de dono desconhecido NAO sobe para a conta nova');
const local = await L.p.evaluate((pc) =>
  (JSON.parse(localStorage.getItem('holohacking.dados.pacientes') || '[]')).some(p => p.id === pc), PC);
ok(local, 'e continua no navegador — nada foi apagado');
const marcaC = await L.p.evaluate((uid) => !!localStorage.getItem('holohacking.migrado_supa.' + uid), UID_C);
ok(marcaC, 'a conta C ganhou a propria marca: a global nao a impediu de rodar');

/* ==================================================================== */
console.log('');
ok(errosJS.length === 0, 'sem erro de JS: ' + (errosJS[0] || 'limpo'));
await nav.close();
process.exit(falhou ? 1 : 0);
