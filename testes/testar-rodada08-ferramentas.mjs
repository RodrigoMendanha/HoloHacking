/**
 * RODADA 08 — ONDA 3: REGRA UNIVERSAL DE SALVAMENTO NAS FERRAMENTAS
 *
 * Supabase falso (supabase-falso.mjs), app real.
 *
 *   1  abrir uma ferramenta NAO cria linha (sem rascunho fantasma)
 *   2  Mapa de Crenças vazio nao conclui
 *   3  gravacao que falha: nada de "Aplicação concluída", as respostas ficam
 *      na tela e nenhuma linha aparece
 *   4  tentar de novo grava, e so entao diz "Aplicação concluída"
 *   5  navegar com edicao nao salva: Cancelar fica, Descartar sai sem gravar,
 *      Salvar grava e sai
 *   6  OQ3: falha nao vira "OQ3 salvo"; vazio nao salva
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
srv.criarConta('a@holo.test', 'senha-a-123');

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();
const A = await ctx.newPage();
await A.setViewport({ width: 1366, height: 900 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });

async function pronto() {
  await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await A.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(150);
}
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await pronto();

const P = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Ferramentas';
  document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100));
    const achou = (window.pacientesTodos() || []).find(x => x.nome === 'Paciente Ferramentas');
    if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
  }
  return null;
});
await esperar(300);

const linhas = () => srv.linhas('tool_applications').filter(a => a.patient_id === P && a.ferramenta_id === 'mapa_crencas');
const VISTA = '#vista-gen-mente';

async function abrirMapa() {
  await A.evaluate(async () => {
    window.abrirFerramentaPorId('mapa_crencas');
    await new Promise(r => setTimeout(r, 500));
  });
}
async function digitar(id, texto) {
  await A.evaluate((sel, texto) => {
    const el = document.querySelector(sel);
    el.value = texto; el.dispatchEvent(new Event('input', { bubbles: true }));
  }, VISTA + ' #campo-' + id, texto);
}
async function clicarAcao(acao) {
  return A.evaluate(async (sel, acao) => {
    const vistos = [];
    const velho = document.querySelector(sel + ' [data-papel="aviso"]');
    if (velho) velho.textContent = '';
    const obs = new MutationObserver(() => {
      const a = document.querySelector(sel + ' [data-papel="aviso"]');
      if (a && a.textContent) vistos.push(a.textContent);
    });
    obs.observe(document.querySelector(sel), { childList: true, characterData: true, subtree: true });
    document.querySelector(sel + ' [data-acao="' + acao + '"]').click();
    await new Promise(r => setTimeout(r, 700));
    obs.disconnect();
    const agora = document.querySelector(sel + ' [data-papel="aviso"]');
    return { vistos, agora: agora ? agora.textContent : '' };
  }, VISTA, acao);
}

/* ==================================================================== */
titulo('1. ABRIR NAO CRIA LINHA');
/* ==================================================================== */

const antes = srv.linhas('tool_applications').length;
await abrirMapa();
ok(await A.evaluate((s) => !!document.querySelector(s + ' #campo-crencas'), VISTA), 'o Mapa de Crenças abriu');
ok(srv.linhas('tool_applications').length === antes && linhas().length === 0,
   'abrir a ferramenta nao gravou nada no servidor (sem rascunho fantasma)');

/* ==================================================================== */
titulo('2. VAZIO NAO CONCLUI');
/* ==================================================================== */

let r = await clicarAcao('concluir');
ok(linhas().length === 0 && /Preencha ao menos um campo/.test(r.agora) && !r.vistos.some(v => /concluída/.test(v)),
   'Concluir vazio e recusado: "' + r.agora + '"');

/* ==================================================================== */
titulo('3-4. FALHA NAO VIRA SUCESSO; TENTAR DE NOVO GRAVA');
/* ==================================================================== */

await digitar('crencas', 'crenca de teste');
srv.falhar.push({ tabela: 'tool_applications', acao: 'insert', vezes: 1 });
r = await clicarAcao('concluir');
const naTela = await A.evaluate((s) => document.querySelector(s + ' #campo-crencas').value, VISTA);
ok(linhas().length === 0 && !r.vistos.some(v => /concluída|salvo/i.test(v)) && /Não foi possível salvar/.test(r.agora),
   'insert falhou: nenhum "concluída", a tela diz "' + r.agora.slice(0, 50) + '..."');
ok(naTela === 'crenca de teste', 'e o que foi digitado continua no formulario');

r = await clicarAcao('concluir');
ok(linhas().length === 1 && linhas()[0].status === 'concluida' &&
   linhas()[0].respostas.crencas === 'crenca de teste' && r.vistos.some(v => /Aplicação concluída/.test(v)),
   'de novo: 1 linha concluida no servidor, e so entao "Aplicação concluída"');

srv.falhar.push({ tabela: 'tool_applications', acao: 'update', vezes: 1 });
await digitar('origem', 'origem x');
r = await clicarAcao('concluir');
ok(!linhas()[0].respostas.origem && !r.vistos.some(v => /concluída/.test(v)) && /Não foi possível salvar/.test(r.agora),
   'update que falha tambem nao vira sucesso: ' + JSON.stringify({ origem: linhas()[0].respostas.origem, vistos: r.vistos, agora: r.agora }));

/* ==================================================================== */
titulo('5. NAVEGAR COM EDICAO NAO SALVA');
/* ==================================================================== */

const modalAberto = () => A.evaluate(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden') &&
  document.getElementById('modal-confirmar-titulo').textContent);
const secaoAtiva = () => A.evaluate(() => (document.querySelector('.nav-item.ativo') || {}).dataset?.secao || '');

await digitar('mais_atrapalha', 'editado sem salvar');
await A.evaluate(() => document.querySelector('.nav-item[data-secao="agenda"]').click());
await esperar(150);
ok(/Alterações não salvas/.test(await modalAberto() || ''), 'sair pelo menu pergunta: Alterações não salvas');
await A.evaluate(() => document.querySelector('#modal-confirmar-rodape .btn-cancelar').click());
await esperar(100);
ok((await secaoAtiva()) !== 'agenda' && await A.evaluate((s) => document.querySelector(s + ' #campo-mais_atrapalha').value, VISTA) === 'editado sem salvar',
   'Cancelar: continua na ferramenta, com o que digitou');

await A.evaluate(() => document.querySelector('.nav-item[data-secao="agenda"]').click());
await esperar(150);
await A.evaluate(() => document.querySelector('#modal-confirmar-rodape .btn-arquivar').click());
await esperar(300);
ok((await secaoAtiva()) === 'agenda' && !linhas()[0].respostas.mais_atrapalha,
   'Descartar: sai sem gravar');

await abrirMapa();
await digitar('alternativa', 'salvo pela guarda');
await A.evaluate(() => document.querySelector('.nav-item[data-secao="agenda"]').click());
await esperar(150);
await A.evaluate(() => document.getElementById('modal-confirmar-ok').click());
await esperar(800);
ok((await secaoAtiva()) === 'agenda' && linhas().length === 1 && linhas()[0].respostas.alternativa === 'salvo pela guarda',
   'Salvar: grava na mesma aplicacao e so entao sai');

await abrirMapa();
await digitar('alternativa', 'falha na guarda');
srv.falhar.push({ tabela: 'tool_applications', acao: 'update', vezes: 1 });
await A.evaluate(() => document.querySelector('.nav-item[data-secao="agenda"]').click());
await esperar(150);
await A.evaluate(() => document.getElementById('modal-confirmar-ok').click());
await esperar(800);
ok((await secaoAtiva()) !== 'agenda' && linhas()[0].respostas.alternativa === 'salvo pela guarda',
   'Salvar que falha: fica na tela, nada mudou no servidor');
await A.evaluate(() => window.Sujeira.limparTudo());

/* ==================================================================== */
titulo('6. OQ3');
/* ==================================================================== */

const toasts = async (fn) => A.evaluate(async (fn) => {
  const t = document.getElementById('toast');
  const vistos = [];
  const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
  obs.observe(t, { childList: true, characterData: true, subtree: true });
  t.textContent = '';
  await new Function('return (async () => {' + fn + '})()')();
  await new Promise(r => setTimeout(r, 700));
  obs.disconnect();
  return vistos.join(' | ');
}, fn);
const oq3 = () => srv.linhas('tool_applications').filter(a => a.patient_id === P && a.ferramenta_id === 'oq3');
const abrirOQ3 = `document.querySelector('.nav-item[data-secao="mente"]').click();
  const a = document.querySelector('[data-vista="vista-oq3"]'); if (a) a.click();
  await new Promise(r => setTimeout(r, 400));`;

let t = await toasts(abrirOQ3 + `document.getElementById('btn-salvar-oq3').click();`);
ok(oq3().length === 0 && /Preencha ao menos um campo do OQ3/.test(t), 'OQ3 vazio nao salva: ' + t);
srv.falhar.push({ tabela: 'tool_applications', acao: 'insert', vezes: 1 });
t = await toasts(`const q = document.getElementById('oq3-quer'); q.value = 'quer x';
  q.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('btn-salvar-oq3').click();`);
ok(oq3().length === 0 && !/OQ3 salvo/.test(t) && /Não foi possível salvar o OQ3/.test(t),
   'OQ3 com falha: nada de "OQ3 salvo": ' + t);
t = await toasts(`document.getElementById('btn-salvar-oq3').click();`);
ok(oq3().length === 1 && /OQ3 salvo/.test(t), 'de novo: gravou e so entao "OQ3 salvo"');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
