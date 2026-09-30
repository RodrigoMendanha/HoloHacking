/**
 * RODADA 08 — ONDA 6: NAVEGACAO, EDICAO E AGENDA
 *
 * Supabase falso, app real, com conta.
 *
 *   1  Ficha → Editar mostra o formulario (visivel), Cancelar volta a ficha,
 *      Salvar grava e volta a ficha com o nome novo
 *   2  "Pacientes" no menu lateral mostra a LISTA mesmo com ficha aberta
 *   3  a tela Consultas mostra as consultas da agenda (consultations)
 *   4  bloqueio "dia todo" grava inicio/fim null e mantem a data
 *   5  conflito de horario e perguntado ANTES de gravar; Cancelar nao grava
 *   6  consulta no passado pede confirmacao
 *   7  erro do servidor vira frase humana, nao texto do Postgres
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
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
  window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);

const P = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Jornada';
  document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100));
    const achou = (window.pacientesTodos() || []).find(x => x.nome === 'Paciente Jornada');
    if (achou) return achou.id;
  }
  return null;
});
await esperar(300);
const visivel = (sel) => A.evaluate((sel) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
}, sel);
const diaISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* ==================================================================== */
titulo('1. FICHA → EDITAR');
/* ==================================================================== */

await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300)); }, P);
ok(await visivel('#vista-ficha'), 'a ficha esta aberta');
await A.evaluate(() => document.getElementById('btn-editar-paciente').click());
await esperar(200);
ok(await visivel('#painel-novo') && await visivel('#np-nome') &&
   await A.evaluate(() => document.getElementById('np-nome').value) === 'Paciente Jornada',
   'Editar mostra o formulario VISIVEL, com o nome preenchido');
await A.evaluate(() => document.getElementById('btn-cancelar-paciente').click());
await esperar(200);
ok(await visivel('#vista-ficha') && !(await visivel('#painel-novo')), 'Cancelar volta para a ficha');

await A.evaluate(async () => {
  document.getElementById('btn-editar-paciente').click();
  await new Promise(r => setTimeout(r, 150));
  document.getElementById('np-nome').value = 'Paciente Jornada Editada';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 700));
});
ok(srv.linhas('patients').find(x => x.id === P).nome === 'Paciente Jornada Editada' &&
   await visivel('#vista-ficha') &&
   await A.evaluate(() => document.getElementById('ficha-nome').textContent) === 'Paciente Jornada Editada',
   'Salvar grava no servidor e volta para a ficha com o nome novo');

/* ==================================================================== */
titulo('2. MENU "PACIENTES" MOSTRA A LISTA');
/* ==================================================================== */

await A.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);
ok(await visivel('#vista-lista-pacientes') && !(await visivel('#vista-ficha')),
   'com a ficha aberta, clicar em Pacientes mostra a lista');

/* ==================================================================== */
titulo('3. TELA CONSULTAS');
/* ==================================================================== */

await A.evaluate(async (pid, dia) => {
  await window.supabaseClient.from('consultations').insert([{ patient_id: pid, data: dia, hora: '10:00', tipo: 'retorno', duracao_min: 60 }]);
  await window.Agenda.carregarDados();
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  await new Promise(r => setTimeout(r, 300));
}, P, diaISO(3));
const cons = await A.evaluate(() => [...document.querySelectorAll('#consultas-corpo .cons-linha')].map(l => l.textContent));
ok(cons.length === 1 && /Paciente Jornada Editada/.test(cons[0]) && /10:00/.test(cons[0]),
   'a consulta marcada aparece em Consultas: ' + (cons[0] || '(nenhuma)').replace(/\s+/g, ' ').slice(0, 70));

/* ==================================================================== */
titulo('4. BLOQUEIO DIA TODO');
/* ==================================================================== */

await A.evaluate(async (dia) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-novo="bloqueio"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('bf-data').value = dia;
  document.getElementById('bf-inicio').value = '09:00';
  document.getElementById('bf-fim').value = '10:00';
  const c = document.getElementById('bf-dia-todo');
  c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('[data-salvar="bloqueio"]').click();
  await new Promise(r => setTimeout(r, 600));
}, diaISO(5));
const bl = srv.linhas('schedule_blocks');
ok(bl.length === 1 && bl[0].dia_todo === true && bl[0].inicio === null && bl[0].fim === null && bl[0].data === diaISO(5),
   'dia todo: inicio e fim null, a data mantida: ' + JSON.stringify(bl.map(b => [b.data, b.inicio, b.fim, b.dia_todo])));

/* ==================================================================== */
titulo('5-6. CONFLITO E PASSADO — PERGUNTADOS ANTES');
/* ==================================================================== */

async function novaConsulta(dia, hora, resposta) {
  return A.evaluate(async (pid, dia, hora, resposta) => {
    document.querySelector('.nav-item[data-secao="agenda"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-novo="consulta"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('cf-paciente').value = pid;
    document.getElementById('cf-data').value = dia;
    document.getElementById('cf-hora').value = hora;
    document.querySelector('[data-salvar="consulta"]').click();
    await new Promise(r => setTimeout(r, 250));
    const m = document.getElementById('modal-confirmar-acao');
    const aberto = !m.classList.contains('hidden');
    const t = document.getElementById('modal-confirmar-titulo').textContent;
    const corpo = document.getElementById('modal-confirmar-corpo').textContent;
    if (aberto) {
      if (resposta === 'ok') document.getElementById('modal-confirmar-ok').click();
      else document.querySelector('#modal-confirmar-rodape .btn-cancelar').click();
    }
    await new Promise(r => setTimeout(r, 600));
    return { aberto, titulo: t, corpo };
  }, P, dia, hora, resposta);
}
const nCons = () => srv.linhas('consultations').length;

let n0 = nCons();
let r = await novaConsulta(diaISO(3), '10:30', 'cancelar');
ok(r.aberto && r.titulo === 'Conflito de horário' && /10:00/.test(r.corpo) && nCons() === n0,
   'sobreposicao: pergunta ANTES ("' + r.titulo + '") e Cancelar nao grava');
r = await novaConsulta(diaISO(3), '10:30', 'ok');
ok(nCons() === n0 + 1, 'Salvar mesmo assim grava');

n0 = nCons();
r = await novaConsulta(diaISO(-2), '09:00', 'cancelar');
ok(r.aberto && r.titulo === 'Consulta no passado' && nCons() === n0,
   'data passada: pede confirmacao ("' + r.titulo + '") e Cancelar nao grava');
r = await novaConsulta(diaISO(-2), '09:00', 'ok');
ok(nCons() === n0 + 1, 'confirmada, a consulta passada e registrada');

r = await novaConsulta(diaISO(10), '09:00', 'ok');
ok(!r.aberto, 'sem conflito e no futuro: grava direto, sem pergunta');

/* ==================================================================== */
titulo('7. ERRO HUMANO');
/* ==================================================================== */

srv.falhar.push({ tabela: 'schedule_blocks', acao: 'insert', vezes: 1 });
const toast = await A.evaluate(async (dia) => {
  const t = document.getElementById('toast');
  const vistos = [];
  const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
  obs.observe(t, { childList: true, characterData: true, subtree: true });
  document.querySelector('[data-novo="bloqueio"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('bf-data').value = dia;
  const c = document.getElementById('bf-dia-todo');
  c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('[data-salvar="bloqueio"]').click();
  await new Promise(r => setTimeout(r, 600));
  obs.disconnect();
  const aviso = document.getElementById('cal-aviso');
  return [aviso ? aviso.textContent : ''].concat(vistos).join(' | ');
}, diaISO(6));
ok(/Não foi possível concluir agora/.test(toast) && !/simulada|SIMULADA|violates|42/.test(toast),
   'falha do servidor vira frase humana: "' + toast + '"');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
