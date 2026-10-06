/**
 * Correcao da tela do HOLOSCAN (auditoria de producao com Cowork, 06/10). Supabase falso, com conta:
 *   1  aplicacao calculada e nao salva nao conta nos numeros de Atendimentos
 *   2  a tela mostra a qual atendimento o HOLOSCAN vai ficar ligado, com troca
 *   3  questionario incompleto: salvar pede confirmacao; cancelar nao grava nada
 *   4  um "Limpar" so (o do questionario), com o modal do app, e a tela reflete o que foi apagado
 *   5  o aviso "Selecione um paciente" some com paciente escolhido
 *   6  o seletor nao lista arquivados (so se for o paciente em foco)
 *   7  textos: sem "Pontue cada sistema", secoes 1..6 em sequencia, nome inteiro na mensagem
 *  10  clicar de novo na resposta marcada desmarca
 *  12  botoes para seguir: Leitura Integrada e Conduta
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Nome Composto Ficticio' } }).data[0].id;
const PARQ = q('patients', 'insert', { dados: { nome: 'Paciente Arquivado Ficticio', status: 'inativo' } }).data[0].id;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 }).catch(() => {});
await A.evaluate(() => {
  window.__nativo = 0; window.confirm = () => { window.__nativo++; return true; };
  window.__toasts = [];
  const t = document.getElementById('toast');
  new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true });
});
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ----- 5, 6, 7: estado inicial da tela ----- */
const ini = await A.evaluate(async (ids) => {
  window.definirPacienteAtivo(ids.PA);
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 300));
  const sel = document.getElementById('sel-holoscan');
  const sec = document.getElementById('secao-holoscan');
  return {
    aviso: sec.querySelector('.barra-paciente .aviso').hidden,
    opcoes: [...sel.options].map(o => o.value),
    pontue: /Pontue cada sistema/.test(sec.innerText),
    eyebrows: [...sec.querySelectorAll('.eyebrow')].map(e => e.textContent.trim()).filter(t => /^\d/.test(t)).map(t => t[0]).join(''),
    limparResultado: !!document.getElementById('btn-limpar-holoscan'),
    seguir: [...sec.querySelectorAll('[data-ir-holo]')].map(b => b.dataset.irHolo).join(','),
    at: document.getElementById('holo-atendimento').innerText,
  };
}, { PA, PARQ });
ok(ini.aviso === true, 'com paciente escolhido, o aviso "Selecione um paciente" some');
ok(ini.opcoes.includes(PA) && !ini.opcoes.includes(PARQ), 'o seletor do HOLOSCAN não lista o paciente arquivado');
ok(!ini.pontue && ini.eyebrows === '123456', 'texto da seção 2 atualizado e seções numeradas em sequência: ' + ini.eyebrows);
ok(!ini.limparResultado && ini.seguir === 'confronto,conduta', 'um só "Limpar" (o do questionário) e botões para seguir: Leitura Integrada e Conduta');
ok(/nenhum selecionado/.test(ini.at), 'sem atendimento, a tela diz que o HOLOSCAN só é salvo ligado a um: ' + ini.at.replace(/\s+/g, ' ').slice(0, 90));

/* ----- 2: atendimento visivel e trocavel ----- */
const at = await A.evaluate(async (pid) => {
  const e1 = await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 2 * 86400000).toISOString() });
  const e2 = await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 3600000).toISOString() });
  await new Promise(r => setTimeout(r, 200));
  const antes = document.getElementById('holo-at-valor').textContent;
  const sel = document.getElementById('holo-at-sel');
  sel.value = e1.id; sel.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  return { e1: e1.id, e2: e2.id, antes, rot2: window.AtendimentoAtual.rotuloQuando(e2), rot1: window.AtendimentoAtual.rotuloQuando(e1),
    depois: document.getElementById('holo-at-valor').textContent, atual: window.AtendimentoAtual.atual().id };
}, PA);
ok(at.antes === at.rot2, 'a tela mostra o atendimento ao qual o HOLOSCAN ficará ligado: ' + at.antes);
ok(at.atual === at.e1 && at.depois === at.rot1, 'e permite trocar: ' + at.depois);

/* ----- 10 e 4: desmarcar resposta; Limpar com modal e tela atualizada ----- */
const q1 = await A.evaluate(async () => {
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 250));
  const itens = [...document.querySelectorAll('.q-item[data-marcador]')];
  itens.slice(0, 10).forEach(it => it.querySelectorAll('.q-btn')[2].click());
  const b = itens[0].querySelectorAll('.q-btn')[2];
  b.click();   // de novo: desmarca
  const marcadas = document.querySelectorAll('.q-btn.marcado').length;
  document.querySelector('[data-acao="limpar"]').click();
  await new Promise(r => setTimeout(r, 250));
  const modal = !document.getElementById('modal-confirmar-acao').classList.contains('hidden');
  const titulo = document.getElementById('modal-confirmar-titulo').textContent;
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 300));
  return { marcadas, modal, titulo, depois: document.querySelectorAll('.q-btn.marcado').length, nativo: window.__nativo };
});
ok(q1.marcadas === 9, 'clicar de novo na resposta marcada desmarca (10 → 9 marcadas)');
ok(q1.modal && q1.titulo === 'Limpar respostas' && q1.nativo === 0, '"Limpar" usa o modal do app (nenhum confirm() nativo)');
ok(q1.depois === 0, 'depois de limpar, a tela não mostra mais respostas marcadas');

/* ----- 3: incompleto pede confirmacao; cancelar nao grava ----- */
const n0 = srv.linhas('holoscan_applications').length;
const inc = await A.evaluate(async () => {
  [...document.querySelectorAll('.q-item[data-marcador]')].slice(0, 10).forEach(it => it.querySelectorAll('.q-btn')[1].click());
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(r => setTimeout(r, 500));
  document.getElementById('btn-salvar-holoscan').click();
  await new Promise(r => setTimeout(r, 300));
  const titulo = document.getElementById('modal-confirmar-titulo').textContent;
  const corpo = document.getElementById('modal-confirmar-corpo').innerText;
  document.getElementById('modal-confirmar-fechar').click();
  await new Promise(r => setTimeout(r, 300));
  return { titulo, corpo, nativo: window.__nativo };
});
ok(inc.titulo === 'Questionário incompleto' && /10 de 84/.test(inc.corpo) && inc.nativo === 0,
   'salvar com 10 de 84 respostas pede confirmação, mostrando a cobertura: ' + inc.corpo.replace(/\s+/g, ' ').slice(0, 80));
ok(srv.linhas('holoscan_applications').length === n0, 'cancelar não grava nada');

/* ----- 1: nao salva nao conta em Atendimentos ----- */
const cont = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  await new Promise(r => setTimeout(r, 300));
  const t = [...document.querySelectorAll('#consultas-corpo .dash-numeros .dash-tile')].map(x => x.innerText.replace(/\s+/g, ' '));
  const selo = !!document.querySelector('#consultas-corpo .selo-nao-salvo');
  return { t, selo };
});
ok(cont.selo && cont.t.some(x => /^0 aplica/.test(x)), 'aplicação não salva aparece com "não salvo no servidor" e não entra na contagem: ' + cont.t.join(' · '));

/* ----- 7: nome inteiro na mensagem de sucesso ----- */
const sal = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 300));
  window.__toasts.length = 0;
  document.getElementById('btn-salvar-holoscan').click();
  await new Promise(r => setTimeout(r, 300));
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 900));
  return window.__toasts.join(' | ');
});
ok(/Paciente Nome Composto Ficticio \(atendimento /.test(sal) && srv.linhas('holoscan_applications').length === n0 + 1,
   'salvo: a mensagem traz o nome inteiro e o atendimento: ' + sal.slice(0, 120));

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
