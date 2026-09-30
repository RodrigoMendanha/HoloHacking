/**
 * RODADA 08, ONDA 1 — HOLOSCAN: ausencia de dado e isolamento por paciente.
 *
 * Caso: HOLOSCAN parcial, 30 das 84 perguntas, todas do bloco BioRoot. O
 * motor devolve Triade mental/espiritual = 10 e o sistema
 * mental_emocional_espiritual = 10 (0 de 29 respondidas), com
 * avaliavel = false / triada_com_dado = false. O 10 e artefato da conta.
 *
 *   1  parcial 30/84 sem Mental/Espiritual: local guarda null, nao 10
 *   2  o banco recebe null (scores e Triade)
 *   3  a ficha mostra "—"
 *   4  a exportacao nao inventa 10
 *   5  o contexto da HOLOS AI nao inventa 10
 *   6  cobertura parcial visivel (x/y e "dados insuficientes")
 *   7  trocar de paciente limpa sinais, prioridades, Triade e Indice
 *   8  reaplicacao comeca vazia
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
srv.criarConta('r08@holo.test', 'senha-r08-123');

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1366, height: 900 });
const erros = []; p.on('pageerror', e => erros.push(e.message));
p.on('dialog', d => d.accept());
await ligarPagina(p, srv);
await p.evaluateOnNewDocument(() => {
  window.__exportado = null;
  const orig = URL.createObjectURL;
  URL.createObjectURL = function (b) { if (b && b.type === 'application/json') b.text().then(t => { window.__exportado = t; }); return orig.call(URL, b); };
  HTMLAnchorElement.prototype.click = function () { /* nao baixa */ };
});
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForSelector('#login-email', { visible: true });
await p.type('#login-email', 'r08@holo.test');
await p.type('#login-senha', 'senha-r08-123');
await p.click('#btn-entrar');
await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
  window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });

async function cadastrar(nome) {
  return p.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const a = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (a) return a.id;
    }
    return null;
  }, nome);
}
const A = await cadastrar('Paciente Parcial Ficticio');
const B = await cadastrar('Paciente Sem Holoscan Ficticio');
ok(!!A && !!B, 'dois pacientes ficticios cadastrados');

/* ------------------------------------------------------------------ */
titulo('1 — PARCIAL 30/84 (SO BIOROOT): LOCAL GUARDA NULL, NAO 10');
await p.evaluate((pid) => window.definirPacienteAtivo(pid), A);
const aplicado = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 200));
  const q = window.HOLOSCAN.questionario().filter(x => x.origem === 'sintoma').slice(0, 30);
  q.forEach(x => {
    const item = document.querySelector('.q-item[data-marcador="' + x.id + '"]');
    if (item) item.querySelectorAll('.q-btn')[2].click();
  });
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(r => setTimeout(r, 300));
  const ult = window.ultimaPontuacao();
  const cru = JSON.parse(localStorage.getItem('holohacking.pontuacao'))[window.pacienteAtivoId()].slice(-1)[0];
  return { ult, cru, dominantes: document.getElementById('holo-dominantes').innerText,
           prioridades: document.getElementById('holo-prioridades').innerText,
           triada: document.getElementById('holo-triada').innerText };
});
const mee = (r) => r.sistemas.find(s => s.sistema === 'mental_emocional_espiritual');
ok(aplicado.cru.triada.mental === null && aplicado.cru.triada.espiritual === null &&
   typeof aplicado.cru.triada.fisico === 'number',
   'caixa local: Triade ' + JSON.stringify(aplicado.cru.triada) + ' (mental/espiritual null)');
ok(mee(aplicado.cru).nota === null && mee(aplicado.cru).carga === null && mee(aplicado.cru).avaliavel === false,
   'caixa local: mental_emocional_espiritual sem nota (null), avaliavel false');
ok(!/10\.0/.test(aplicado.triada) && /—/.test(aplicado.triada), 'tela da Triade: "—" nos eixos sem resposta, nenhum 10.0');

titulo('6 — COBERTURA PARCIAL VISIVEL');
ok(/1 de 16 respondidas/.test(aplicado.prioridades) && /dados insuficientes/i.test(aplicado.prioridades),
   'prioridades: Detox "1 de 16 respondidas" e marcado "dados insuficientes"');
ok(/nenhuma pergunta respondida/.test(aplicado.prioridades), 'prioridades: MEE "nenhuma pergunta respondida"');
const ordemPrio = await p.evaluate(() => [...document.querySelectorAll('#holo-prioridades .prio-linha')].map(l => l.className));
ok(ordemPrio.length === 5 && /insuficiente/.test(ordemPrio[3]) && /sem-dado/.test(ordemPrio[4]),
   'o sistema parcial e o sem dado vao para o fim da ordem, nao disputam prioridade: ' + ordemPrio.join(' | '));
const conduta = await p.evaluate(() => document.getElementById('holo-leitura') ? document.getElementById('holo-leitura').innerText : '');
ok(!/Mental.Emocional/i.test(conduta.split('\n').slice(0, 6).join(' ')),
   'o sistema sem resposta nao e eleito "critico" na leitura do terreno');

/* ------------------------------------------------------------------ */
titulo('2 — O BANCO RECEBE NULL');
await p.evaluate(async () => {
  document.getElementById('btn-salvar-holoscan').click();
  await new Promise(r => setTimeout(r, 700));
});
const apps = srv.linhas('holoscan_applications').filter(a => a.patient_id === A);
const scores = srv.linhas('holoscan_system_scores').filter(s => apps[0] && s.application_id === apps[0].id);
const sMee = scores.find(s => s.sistema === 'mental_emocional_espiritual');
ok(apps.length === 1, 'o HOLOSCAN parcial foi salvo pela RPC');
ok(apps[0] && apps[0].triada.mental === null && apps[0].triada.espiritual === null,
   'holoscan_applications.triada: ' + JSON.stringify(apps[0] && apps[0].triada));
ok(sMee && sMee.nota === null && sMee.carga === null && sMee.faixa === null && sMee.avaliavel === false,
   'holoscan_system_scores MEE: nota/carga/faixa null, avaliavel false');
ok(scores.filter(s => s.avaliavel).every(s => typeof s.nota === 'number'), 'sistemas com resposta seguem com nota');

/* ------------------------------------------------------------------ */
titulo('3 — A FICHA MOSTRA "—"');
const ficha = await p.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 400));
  const tri = document.querySelector('.fic-triada');
  const barras = [...document.querySelectorAll('.fic-barra')].map(b => b.innerText.replace(/\s+/g, ' '));
  return { triada: tri ? tri.innerText.replace(/\s+/g, ' ') : '', barras };
}, A);
ok(/Mental\s*—/.test(ficha.triada) && /Espiritual\s*—/.test(ficha.triada) && !/10\.0/.test(ficha.triada),
   'ficha, Triade: ' + ficha.triada);
const barraMee = ficha.barras.find(b => /Mental/i.test(b)) || '';
ok(/—/.test(barraMee) && /sem dado/.test(barraMee) && !/10\.0/.test(barraMee), 'ficha, barra MEE: ' + barraMee);
const barraDetox = ficha.barras.find(b => /Detox/i.test(b)) || '';
ok(/dados insuficientes/.test(barraDetox) && /1\/16/.test(barraDetox), 'ficha, barra Detox: ' + barraDetox);

/* ------------------------------------------------------------------ */
titulo('4 — A EXPORTACAO NAO INVENTA 10');
const exp = await p.evaluate(async () => {
  window.__exportado = null;
  document.getElementById('btn-exportar-paciente').click();
  for (let i = 0; i < 30 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
  document.getElementById('modal-confirmar-ok').click();
  for (let i = 0; i < 60 && !window.__exportado; i++) await new Promise(r => setTimeout(r, 100));
  return window.__exportado;
});
let json = null; try { json = JSON.parse(exp); } catch (e) { /* null */ }
ok(json && json.pontuacao && json.pontuacao.triada.mental === null && json.pontuacao.triada.espiritual === null,
   'exportacao: Triade mental/espiritual null');
ok(json && json.pontuacao.sistemas.filter(s => s.avaliavel === false).every(s => s.nota === null),
   'exportacao: sistema sem resposta com nota null');
ok(json && (json.historico || []).every(h => h.triada.mental === null), 'exportacao: historico sem 10 inventado');

/* ------------------------------------------------------------------ */
titulo('5 — O CONTEXTO DA HOLOS AI NAO INVENTA 10');
const ctx = await p.evaluate(async () => {
  document.querySelector('[data-aba="holos-ai"]').click();
  await new Promise(r => setTimeout(r, 300));
  const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]');
  if (b) b.click();
  await new Promise(r => setTimeout(r, 300));
  const t = document.getElementById('ai-hub-texto');
  return t ? t.textContent : '';
});
ok(/Mental:\s*—/.test(ctx) && /Espiritual:\s*—/.test(ctx), 'contexto: Triade Mental/Espiritual "—"');
ok(/Mental-Emocional-Espiritual[^\n]*—[^\n]*sem dado/i.test(ctx) || /Mental[^\n]*: —[^\n]*sem dado/i.test(ctx),
   'contexto: sistema MEE "— (sem dado…)"');
ok(!/: 10\.0/.test(ctx), 'contexto: nenhum "10.0" inventado');

/* ------------------------------------------------------------------ */
titulo('8 — REAPLICACAO COMECA VAZIA');
const reap = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 300));
  const pid = window.pacienteAtivoId();
  return {
    marcadas: document.querySelectorAll('#q-lista .q-btn.marcado, #q-lista .q-btn.ativo, #q-lista .q-btn[aria-pressed="true"]').length,
    rascunho: Object.keys((JSON.parse(localStorage.getItem('holohacking.questionario')) || {})[pid] || {}).length,
    aplicadas: Object.keys(((JSON.parse(localStorage.getItem('holohacking.respostas_aplicadas')) || {})[pid] || {}).respostas || {}).length
  };
});
ok(reap.rascunho === 0 && reap.marcadas === 0, 'nova aplicacao: questionario vazio (0 marcadas, rascunho vazio)');
ok(reap.aplicadas === 30, 'as 30 respostas da aplicacao salva continuam guardadas para rever (' + reap.aplicadas + ')');

/* ------------------------------------------------------------------ */
titulo('7 — TROCAR DE PACIENTE LIMPA O QUE ERA DO ANTERIOR');
await p.evaluate(async () => {
  document.getElementById('btn-voltar-manual') && document.getElementById('btn-voltar-manual').click();
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 200));
});
const antesTroca = await p.evaluate(() => document.getElementById('holo-dominantes').innerText.length);
await p.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await new Promise(r => setTimeout(r, 400)); }, B);
const depois = await p.evaluate(() => ({
  dominantes: document.getElementById('holo-dominantes').innerText.trim(),
  domVisivel: !document.getElementById('holo-dominantes').classList.contains('hidden'),
  prioridades: document.getElementById('holo-prioridades').innerText.trim(),
  triada: document.getElementById('holo-triada').innerText.trim(),
  total: document.getElementById('holo-score-total').textContent.trim()
}));
ok(antesTroca > 0, 'paciente A tinha "sinais que mais pesaram" na tela');
ok(depois.dominantes === '' && !depois.domVisivel, 'paciente B (sem HOLOSCAN): nenhum sinal de A na tela');
ok(depois.prioridades === '' && depois.triada === '', 'paciente B: prioridades e Triade vazias');
ok(depois.total === '—', 'paciente B: Indice "—" (' + depois.total + ')');

ok(erros.length === 0, 'nenhum erro de JS' + (erros.length ? ': ' + erros[0] : ''));
await nav.close();
process.exit(falhou ? 1 : 0);
