/**
 * RELEASE 01 — FALHA REMOTA NAO VIRA SUCESSO, E DATA DE COLETA NAO E INVENTADA
 *
 * Supabase falso (supabase-falso.mjs), app real, "Salvar HOLOSCAN" clicado.
 *
 *   A  local + RPC ok            → sucesso normal
 *   B  local ok + RPC falha      → local fica, aviso de nao sincronizado,
 *                                  nenhum "salvo" falso — nem depois de recarregar
 *   C  salvar de novo, RPC volta → sincroniza, sem duplicar
 *   D  interpretacao: servidor falha → feedback, texto nao se perde, nem na
 *                                  proxima hidratacao
 *   E  exames: sem data informada → data de coleta desconhecida; data
 *      historica preservada; reenvio mantem a data original; fuso nao muda o dia
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
const MSG = 'Os dados foram salvos neste dispositivo, mas não foi possível sincronizá-los. ' +
            'Tente salvar novamente quando estiver conectado.';

const srv = criarServidor();
const UID = srv.criarConta('a@holo.test', 'senha-a-123');

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];

async function navegador(nome, fuso) {
  const ctx = await nav.createBrowserContext();
  const p = await ctx.newPage();
  if (fuso) await p.emulateTimezone(fuso);
  await p.setViewport({ width: 1366, height: 900 });
  p.on('pageerror', e => errosJS.push(nome + ': ' + e.message));
  await ligarPagina(p, srv);
  await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  return p;
}
async function pronto(p) {
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await p.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(150);
  await p.evaluate(() => window.Sincronizacao.aguardar());
}
async function entrar(p) {
  await p.waitForSelector('#login-email', { visible: true });
  await p.type('#login-email', 'a@holo.test');
  await p.type('#login-senha', 'senha-a-123');
  await p.click('#btn-entrar');
  await pronto(p);
}
async function recarregar(p) { await p.reload({ waitUntil: 'networkidle2' }); await pronto(p); }

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

/** calcula pelo questionario (delta muda as respostas) */
async function calcular(p, delta) {
  return p.evaluate(async (respostas, delta) => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(r => setTimeout(r, 200));
    const mapa = {};
    respostas.forEach(r => { mapa[r.marcador_id] = (r.intensidade + delta) % 4; });
    document.querySelectorAll('.q-item').forEach(item => {
      const v = mapa[item.dataset.marcador];
      if (v !== undefined) item.querySelectorAll('.q-btn')[v].click();
    });
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(r => setTimeout(r, 200));
    return document.getElementById('holo-score-total').textContent;
  }, caso.respostas, delta);
}

/** clica Salvar e devolve todo toast que apareceu depois do clique */
async function salvar(p) {
  return p.evaluate(async () => {
    const t = document.getElementById('toast');
    const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    t.textContent = '';
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-salvar-holoscan').click();
    await new Promise(r => setTimeout(r, 700));
    obs.disconnect();
    return vistos.join(' | ');
  });
}

const historico = (p, pid) => p.evaluate((pid) =>
  ((JSON.parse(localStorage.getItem('holohacking.pontuacao')) || {})[pid] || [])
    .map(e => ({ quando: e.quando, indice: e.indice, id: e._supa_id || null,
                 interp: e.interpretacao || null })), pid);
const remotas = (pid) => srv.linhas('holoscan_applications').filter(a => a.patient_id === pid);

const A = await navegador('A');
await entrar(A);
const P = await cadastrar(A, 'Paciente Falhas');

/* ==================================================================== */
titulo('A. LOCAL + SERVIDOR OK → SUCESSO NORMAL');
/* ==================================================================== */

const i1 = await calcular(A, 0);
const t1 = await salvar(A);
ok(/HOLOSCAN salvo na ficha/.test(t1) && t1.indexOf(MSG) < 0, 'mensagem de sucesso: ' + t1);
ok(remotas(P).length === 1, 'uma aplicacao no servidor');
let h = await historico(A, P);
ok(h.length === 1 && h[0].id === remotas(P)[0].id, 'a entrada local ganhou o id remoto');
const t1b = await salvar(A);
ok(remotas(P).length === 1 && /já está salvo e sincronizado/.test(t1b),
   'clicar Salvar de novo nao cria segunda aplicacao remota: ' + t1b);

/* ==================================================================== */
titulo('B. LOCAL OK + SERVIDOR FALHA → NENHUM SUCESSO FALSO');
/* ==================================================================== */

const i2 = await calcular(A, 1);
srv.falhar.push({ tabela: 'rpc:salvar_holoscan_completo', acao: 'rpc' });
const t2 = await salvar(A);
ok(t2.indexOf(MSG) >= 0, 'aviso claro de nao sincronizado: ' + t2);
ok(!/HOLOSCAN salvo/.test(t2), 'e nenhuma mensagem de sucesso');
ok(remotas(P).length === 1, 'o servidor continua com uma so aplicacao');
h = await historico(A, P);
ok(h.length === 2 && h.some(e => e.id === null && String(e.indice) === i2),
   'o calculo novo continua neste navegador, sem id remoto (Indice ' + i2 + ')');

await recarregar(A);
h = await historico(A, P);
ok(h.length === 2 && h.some(e => e.id === null && String(e.indice) === i2),
   'recarregar (com hidratacao do servidor) nao apaga o calculo nao sincronizado');
const telaAposFalha = await A.evaluate(() => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  return document.getElementById('holo-score-total').textContent;
});
ok(telaAposFalha === i2, 'a tela do HOLOSCAN mostra o calculo nao sincronizado: ' + telaAposFalha);

/* rede caida (excecao, nao erro devolvido) tambem nao vira sucesso */
await A.evaluate(() => {
  window.__rpcOriginal = window.supabaseClient.rpc;
  window.supabaseClient.rpc = function () { return Promise.reject(new TypeError('Failed to fetch')); };
});
const t2b = await salvar(A);
await A.evaluate(() => { window.supabaseClient.rpc = window.__rpcOriginal; });
ok(t2b.indexOf(MSG) >= 0 && !/HOLOSCAN salvo/.test(t2b), 'rede caida: mesmo aviso, sem sucesso — ' + t2b);

/* ==================================================================== */
titulo('C. SALVAR DE NOVO COM O SERVIDOR DE VOLTA → SINCRONIZA');
/* ==================================================================== */

srv.falhar.length = 0;
const t3 = await salvar(A);
ok(/HOLOSCAN salvo na ficha/.test(t3) && t3.indexOf(MSG) < 0, 'agora sim, sucesso: ' + t3);
ok(remotas(P).length === 2 && remotas(P).some(a => String(a.indice) === i2),
   'o servidor recebeu o calculo que tinha falhado');
h = await historico(A, P);
ok(h.length === 2 && h.every(e => !!e.id), 'as duas entradas locais tem id remoto — sem duplicar');
await recarregar(A);
h = await historico(A, P);
ok(h.length === 2 && h.every(e => !!e.id), 'e continuam duas depois da hidratacao');

/* ==================================================================== */
titulo('D. INTERPRETACAO: O SERVIDOR FALHA');
/* ==================================================================== */

async function interpretar(texto) {
  return A.evaluate(async (pid, texto) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-aba="relatorio"]').click();
    await new Promise(r => setTimeout(r, 300));
    document.getElementById('rel-interpretacao').value = texto;
    document.querySelector('[data-acao="salvar-interpretacao"]').click();
    const aviso = document.getElementById('rel-interpretacao-aviso');
    const logo = aviso.textContent;
    await new Promise(r => setTimeout(r, 500));
    return { logo, depois: aviso.textContent };
  }, P, texto);
}

const ok1 = await interpretar('Primeira leitura.');
ok(ok1.logo !== 'Salvo.' && ok1.depois === 'Salvo.',
   'com o servidor ok: so diz "Salvo." depois da confirmacao (' + ok1.logo + ' → ' + ok1.depois + ')');
const ultimaRemota = () => remotas(P).slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
ok(ultimaRemota().interpretacao_texto === 'Primeira leitura.', 'e o servidor tem o texto');

srv.falhar.push({ tabela: 'holoscan_applications', acao: 'update' });
const falha = await interpretar('Leitura revisada, que o servidor recusou.');
ok(falha.depois.indexOf(MSG) >= 0 && falha.depois !== 'Salvo.',
   'servidor recusou: aviso de nao sincronizado, sem "Salvo.": ' + falha.depois);
ok(ultimaRemota().interpretacao_texto === 'Primeira leitura.', 'o servidor continua com a versao anterior');
h = await historico(A, P);
ok(h[h.length - 1].interp && h[h.length - 1].interp.texto === 'Leitura revisada, que o servidor recusou.' &&
   h[h.length - 1].interp.pendente === true,
   'o texto novo ficou neste navegador, marcado como pendente');
srv.falhar.length = 0;
await recarregar(A);
h = await historico(A, P);
ok(h[h.length - 1].interp && h[h.length - 1].interp.texto === 'Leitura revisada, que o servidor recusou.',
   'a hidratacao NAO troca o texto pendente pela versao antiga do servidor');
const denovo = await interpretar('Leitura revisada, que o servidor recusou.');
ok(denovo.depois === 'Salvo.' && ultimaRemota().interpretacao_texto === 'Leitura revisada, que o servidor recusou.',
   'salvar de novo com o servidor de volta: sincroniza');
h = await historico(A, P);
ok(!h[h.length - 1].interp.pendente, 'e a marca de pendente sai');

/* ==================================================================== */
titulo('E. DATA DA COLETA DE EXAMES');
/* ==================================================================== */

const exames = await A.evaluate(() => window.HOLOSCAN.listaDeExames().slice(0, 3).map(e => e.id));
async function conferirPeloPainel(valores) {
  return A.evaluate(async (pid, valores) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-aba="documentos"]').click();
    await new Promise(r => setTimeout(r, 300));
    Object.keys(valores).forEach(id => {
      const inp = document.querySelector('#ex-corpo .ex-linha[data-exame="' + id + '"] input');
      inp.value = String(valores[id]); inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.querySelector('#ex-corpo [data-acao="conferir"]').click();
    await new Promise(r => setTimeout(r, 600));
  }, P, valores);
}
const coletas = () => srv.linhas('lab_collections').filter(c => c.patient_id === P);

await conferirPeloPainel({ [exames[0]]: 90 });
ok(coletas().length === 1 && coletas()[0].data_coleta_desconhecida === true && coletas()[0].coletado_em === null,
   'sem data informada (o painel nao tem o campo): data da coleta DESCONHECIDA');
ok(!!coletas()[0].created_at, 'o momento do registro fica em created_at/updated_at (dado tecnico)');

const hist = await A.evaluate((pid, eid) => window.Sincronizacao.salvarColeta(pid, { [eid]: 70 }, '2026-03-15'),
  P, exames[1]);
ok(hist.ok && coletas().some(c => c.coletado_em === '2026-03-15' && c.data_coleta_desconhecida === false),
   'data historica valida informada: gravada como veio (2026-03-15)');
await conferirPeloPainel({ [exames[0]]: 95 });
ok(coletas().some(c => c.coletado_em === '2026-03-15') && coletas().length === 2,
   'registrar de novo pelo painel nao toca a coleta historica');

// reenvio: a coleta pendente de uma data historica volta com a MESMA data
srv.falhar.push({ tabela: 'rpc:salvar_coleta_exames', acao: 'rpc' });
const pend = await A.evaluate((pid, eid) => window.Sincronizacao.salvarColeta(pid, { [eid]: 66 }, '2026-02-10'),
  P, exames[2]);
ok(!pend.ok && !coletas().some(c => c.coletado_em === '2026-02-10'), 'envio falhou: nada novo no servidor');
await A.evaluate((pid, eid) => {
  const t = JSON.parse(localStorage.getItem('holohacking.exames') || '{}');
  t[pid] = Object.assign({}, t[pid], { [eid]: 66 });
  localStorage.setItem('holohacking.exames', JSON.stringify(t));
}, P, exames[2]);
srv.falhar.length = 0;
await recarregar(A);
ok(coletas().some(c => c.coletado_em === '2026-02-10'),
   'reenvio na proxima carga usa a data original (2026-02-10), nao a de hoje');
ok(!coletas().some(c => c.coletado_em && c.coletado_em !== '2026-03-15' && c.coletado_em !== '2026-02-10'),
   'nenhuma coleta ganhou a data do reenvio');

// pendente SEM data continua sem data no reenvio
srv.falhar.push({ tabela: 'rpc:salvar_coleta_exames', acao: 'rpc' });
await conferirPeloPainel({ [exames[0]]: 101 });
srv.falhar.length = 0;
await recarregar(A);
const semData = coletas().filter(c => c.data_coleta_desconhecida);
ok(semData.length === 1 && semData[0].coletado_em === null,
   'reenvio de registro sem data continua sem data (e na mesma coleta desconhecida)');

// fuso: a mesma data clinica, lida em dois fusos extremos, e o mesmo dia
async function lerNoFuso(fuso) {
  const p = await navegador('fuso ' + fuso, fuso);
  await entrar(p);
  const r = await p.evaluate(async (pid) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-aba="holoscan"]').click();
    await new Promise(r => setTimeout(r, 300));
    const txt = (document.getElementById('aba-holoscan-laboratorial') || {}).textContent || '';
    return { txt, coletas: window.Sincronizacao.coletas(pid).map(c => c.coletado_em) };
  }, P);
  await p.browserContext().close();
  return r;
}
const sp = await lerNoFuso('America/Sao_Paulo');
const ki = await lerNoFuso('Pacific/Kiritimati');
const la = await lerNoFuso('Pacific/Pago_Pago');
ok([sp, ki, la].every(r => /15\/03\/2026/.test(r.txt) && /10\/02\/2026/.test(r.txt)),
   'UTC-3, UTC+14 e UTC-11 mostram 15/03/2026 e 10/02/2026 — o fuso nao muda o dia');
ok([sp, ki, la].every(r => r.coletas.includes('2026-03-15') && r.coletas.includes('2026-02-10')),
   'e a data guardada e a mesma string nos tres');
ok([sp, ki, la].every(r => /Data da coleta não informada/.test(r.txt)),
   'a coleta sem data aparece como "Data da coleta não informada" nos tres fusos');

/* ==================================================================== */
console.log('');
ok(errosJS.length === 0, 'sem erro de JS: ' + (errosJS[0] || 'limpo'));
await nav.close();
process.exit(falhou ? 1 : 0);
