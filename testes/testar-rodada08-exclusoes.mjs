/**
 * RODADA 08 — ONDA 5: EXCLUSOES SEGURAS
 *
 * Supabase falso, app real, com conta.
 *
 *   1  Perfil: sem "Apagar tudo", sem "Exportar backup completo", sem os
 *      textos falsos ("Não há servidor no meio")
 *   2  exclusao em lote mista: sai quem esta vazio, fica quem tem historico,
 *      e o modal nomeia um e outro (singular/plural)
 *   3  paciente unico com historico: so arquivar
 *   4  excluir o paciente com a ficha aberta tira a ficha da tela
 *   5  documento: linha e arquivo saem; falha do servidor nao vira sucesso;
 *      falha so do armazenamento e dita
 *   6  o modal e global: visivel de dentro da ficha
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
  await esperar(200);
}
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await pronto();

async function cadastrar(nome) {
  return A.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const achou = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (achou) return achou.id;
    }
    return null;
  }, nome);
}
const modal = () => A.evaluate(() => {
  const m = document.getElementById('modal-confirmar-acao');
  const st = getComputedStyle(m);
  return {
    aberto: !m.classList.contains('hidden'),
    visivel: !m.classList.contains('hidden') && st.display !== 'none' && m.getBoundingClientRect().width > 0,
    titulo: document.getElementById('modal-confirmar-titulo').textContent,
    corpo: document.getElementById('modal-confirmar-corpo').textContent,
    excluir: !!document.getElementById('modal-confirmar-ok'),
    arquivar: !!document.querySelector('#modal-confirmar-rodape .btn-arquivar')
  };
});
const vivos = () => srv.linhas('patients').map(p => p.id);

/* ==================================================================== */
titulo('1. PERFIL SEM DESTRUICAO GLOBAL');
/* ==================================================================== */

const conta = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="perfil"]').click();
  await new Promise(r => setTimeout(r, 200));
  const aba = [...document.querySelectorAll('#secao-perfil [data-aba], #secao-perfil .aba')]
    .find(b => /conta/i.test(b.textContent));
  if (aba) aba.click();
  await new Promise(r => setTimeout(r, 200));
  const t = (document.getElementById('painel-conta') || document.body).textContent;
  return {
    apagarTudo: !!document.getElementById('btn-apagar-tudo'),
    exportar: !!document.getElementById('btn-exportar'),
    semServidor: /Não há servidor no meio/.test(t),
    tudoAqui: /Tudo o que você registrou está/.test(t),
    naConta: /na sua conta/.test(t)
  };
});
ok(!conta.apagarTudo, 'nao ha botao "Apagar todos os dados"');
ok(!conta.exportar, 'com conta, nao ha "Exportar backup completo" (a exportacao e por paciente, na ficha)');
ok(!conta.semServidor && !conta.tudoAqui && conta.naConta,
   'o texto diz que o dado fica na conta — nada de "Não há servidor no meio"');

/* ==================================================================== */
titulo('2. LOTE MISTO');
/* ==================================================================== */

const V1 = await cadastrar('Vazio Um');
const H1 = await cadastrar('Com Historico');
const V2 = await cadastrar('Vazio Dois');
await A.evaluate(async (pid) => {
  await window.supabaseClient.from('consultations').insert([{ patient_id: pid, data: '2026-03-20', hora: '09:00', tipo: 'retorno' }]);
}, H1);

await A.evaluate(async (ids) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  ids.forEach(id => {
    const c = document.querySelector('[data-sel="' + id + '"]');
    if (c && !c.checked) { c.click(); }
  });
  await new Promise(r => setTimeout(r, 100));
  document.querySelector('[data-lote="remover"]').click();
  await new Promise(r => setTimeout(r, 600));
}, [V1, H1, V2]);
let m = await modal();
ok(m.visivel && m.titulo === 'Excluir 2 pacientes?', 'titulo no plural, contando so quem sai: "' + m.titulo + '"');
ok(/Vazio Um/.test(m.corpo) && /Vazio Dois/.test(m.corpo), 'o modal nomeia quem sera excluido');
ok(/Não será excluído/.test(m.corpo) && /Com Historico — 1 consulta/.test(m.corpo),
   'e nomeia quem fica, e por que: "Com Historico — 1 consulta"');
await A.evaluate(async () => {
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 900));
});
ok(!vivos().includes(V1) && !vivos().includes(V2) && vivos().includes(H1),
   'sairam os dois vazios; o com historico ficou no servidor');

/* ==================================================================== */
titulo('3. UNICO COM HISTORICO');
/* ==================================================================== */

await A.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  document.querySelector('#menu-' + id + ' [data-item="remover"]').click();
  await new Promise(r => setTimeout(r, 600));
}, H1);
m = await modal();
ok(m.titulo === 'Não é possível excluir Com Historico' && !m.excluir && m.arquivar,
   'singular: "' + m.titulo + '", sem botao de excluir, com Arquivar');
await A.evaluate(() => document.getElementById('modal-confirmar-fechar').click());

/* ==================================================================== */
titulo('4. EXCLUIR COM A FICHA ABERTA');
/* ==================================================================== */

const V3 = await cadastrar('Vazio Tres');
const ficha = await A.evaluate(async (id) => {
  window.abrirFichaDe(id);
  await new Promise(r => setTimeout(r, 300));
  const antes = !document.getElementById('vista-ficha').classList.contains('hidden');
  document.querySelector('[data-menu="' + id + '"]') && null;
  return antes;
}, V3);
await A.evaluate(async (id) => {
  // o menu do paciente fica na lista; a ficha continua aberta por cima
  const lista = document.getElementById('vista-lista-pacientes');
  lista.classList.remove('hidden');
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  document.querySelector('#menu-' + id + ' [data-item="remover"]').click();
  await new Promise(r => setTimeout(r, 600));
  lista.classList.add('hidden');
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 900));
}, V3);
const depois = await A.evaluate(() => ({
  ficha: !document.getElementById('vista-ficha').classList.contains('hidden'),
  lista: !document.getElementById('vista-lista-pacientes').classList.contains('hidden')
}));
ok(ficha && !vivos().includes(V3) && !depois.ficha && depois.lista,
   'a ficha do excluido saiu da tela e a lista voltou');

/* ==================================================================== */
titulo('5-6. DOCUMENTO');
/* ==================================================================== */

async function subir(nome) {
  return A.evaluate(async (pid, nome) => {
    const f = new File(['%PDF-1.4 teste ' + nome], nome, { type: 'application/pdf' });
    const r = await window.ArquivoStore.salvar(pid, f, { nome, tipo: 'Exame', data: '2026-03-20' });
    return r && r.sincronizado;
  }, H1, nome);
}
async function excluirPelaFicha(nome) {
  return A.evaluate(async (pid, nome) => {
    const t = document.getElementById('toast');
    const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    t.textContent = '';
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-aba="documentos"]').click();
    await new Promise(r => setTimeout(r, 600));
    const b = document.querySelector('#aba-documentos [data-tirar][data-nome="' + nome + '"]');
    if (!b) { obs.disconnect(); return { achou: false }; }
    b.click();
    await new Promise(r => setTimeout(r, 150));
    const m = document.getElementById('modal-confirmar-acao');
    const visivel = !m.classList.contains('hidden') && m.getBoundingClientRect().width > 0;
    document.getElementById('modal-confirmar-ok').click();
    await new Promise(r => setTimeout(r, 900));
    obs.disconnect();
    return { achou: true, visivel, toasts: vistos.join(' | ') };
  }, H1, nome);
}
const docs = () => srv.linhas('documents').filter(d => d.patient_id === H1);
const objetos = () => Object.keys(srv.storage['patient-documents'] || {});

ok(await subir('laudo-a.pdf') === true && docs().length === 1 && objetos().length === 1, 'documento enviado (linha + arquivo)');
let r = await excluirPelaFicha('laudo-a.pdf');
ok(r.achou && r.visivel, 'o modal de confirmacao aparece DE DENTRO da ficha (e global)');
ok(docs().length === 0 && objetos().length === 0 && /Documento excluído/.test(r.toasts),
   'linha e arquivo sairam, e so entao "Documento excluído"');

await subir('laudo-b.pdf');
srv.falhar.push({ tabela: 'documents', acao: 'delete', vezes: 1 });
r = await excluirPelaFicha('laudo-b.pdf');
ok(docs().length === 1 && objetos().length === 1 && /Não foi possível excluir o documento/.test(r.toasts) &&
   !/Documento excluído/.test(r.toasts), 'servidor recusou: nada saiu, e a tela diz: ' + r.toasts);

srv.falhar.push({ tabela: 'patient-documents', acao: 'remove', vezes: 1 });
r = await excluirPelaFicha('laudo-b.pdf');
ok(docs().length === 0 && /arquivo não pôde ser removido/.test(r.toasts),
   'so o armazenamento falhou: a linha saiu e a tela DIZ que o arquivo ficou');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
