/**
 * A aba HOLOSCAN, dentro da ficha do paciente (decisao de produto 09/10:
 * exame nao participa do HOLOSCAN; a Leitura Integrada saiu da aba).
 *
 * O que este teste cobra:
 *
 *   VAZIO        sem aplicacao, o convite certo e NENHUM bloco de laboratorio.
 *   CONTINUIDADE depois do mapa: Resultado HOLOS -> Resultado para a paciente.
 *   NAVEGACAO    "Resultado para a paciente" leva para a secao Resultado com a
 *                pessoa certa selecionada, sem zerar a tela.
 *   COM MAPA     ultima aplicacao e historico; valor de exame guardado
 *                localmente nao produz Convergente/Divergente em lugar nenhum.
 *   HOMOLOGACAO  ?homologacao=1 tambem nao tem confronto legado.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1300 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const conferir = ok;

const aba = (x) => p.evaluate(async (n) => { document.querySelector('[data-aba="' + n + '"]').click(); await new Promise(r => setTimeout(r, 250)); }, x);
const abrirFichaDe = (id) => p.evaluate(async (pid) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.querySelector('[data-ficha="' + pid + '"]').click();
  await new Promise(r => setTimeout(r, 300));
}, id);

const pid = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Marina Alves';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(x => setTimeout(x, 300));
  return window.pacienteAtivoId();
});

/* ------------------------------------------------------------- vazio ----- */
await abrirFichaDe(pid);
await aba('holoscan');
const vazio = await p.evaluate(() => {
  const v = document.querySelector('#aba-holoscan .lista-vazia');
  return {
    titulo: v?.querySelector('strong')?.textContent,
    botao: document.querySelector('#aba-holoscan .fic-consultas-topo button')?.textContent,
    blocoLab: !!document.getElementById('aba-holoscan-laboratorial'),
    texto: document.getElementById('aba-holoscan').innerText,
    chips: [...document.querySelectorAll('#aba-holoscan .fic-chip')].map(b => b.textContent),
  };
});
conferir(vazio.titulo === 'Nenhuma aplicação HOLOSCAN', 'título do estado vazio: ' + vazio.titulo);
conferir(vazio.botao === 'Iniciar HOLOSCAN', 'o CTA é "Iniciar HOLOSCAN": ' + vazio.botao);
conferir(!vazio.blocoLab && !/Leitura Integrada|Registrar exames|coleta/i.test(vazio.texto), 'nenhum bloco de laboratório ou Leitura Integrada na aba');
conferir(vazio.chips.join(',') === 'Resultado HOLOS,Resultado para a paciente', 'depois do mapa: Resultado HOLOS → Resultado para a paciente: ' + vazio.chips.join(' · '));

/* ----------------------------------------- navegacao para o Resultado ---- */
const irResultado = await p.evaluate(async () => {
  document.querySelector('#aba-holoscan [data-ir="resultado"]').click();
  await new Promise(r => setTimeout(r, 300));
  return {
    secaoAtiva: document.querySelector('.secao.ativa')?.id,
    algumaAtiva: document.querySelectorAll('.secao.ativa').length,
    paciente: document.getElementById('sel-resultado')?.selectedOptions[0]?.textContent,
  };
});
conferir(irResultado.secaoAtiva === 'secao-resultado' && irResultado.algumaAtiva === 1, '"Resultado para a paciente" leva para a seção Resultado, sem zerar a tela: ' + irResultado.secaoAtiva);
conferir(irResultado.paciente === 'Marina Alves', 'e chega lá com a pessoa certa selecionada: ' + irResultado.paciente);

/* ---------------------------------------------- HOLOSCAN + valor legado -- */
await p.evaluate(async (respostas) => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  window.aplicarPontuacao(HOLOSCAN.calcular(respostas));
  const id = window.pacienteAtivoId();
  localStorage.setItem('holohacking.exames', JSON.stringify({ [id]: { 'EXA-005': 115, 'EXA-015': 78 } }));
}, caso.respostas);
await p.reload({ waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
await abrirFichaDe(pid);
await aba('holoscan');
const cheio = await p.evaluate(() => {
  const titulos = [...document.querySelectorAll('#aba-holoscan .dash-titulo')].map(t => t.textContent);
  return { titulos, texto: document.getElementById('aba-holoscan').innerText, sis: document.querySelectorAll('#aba-holoscan .fic-sis').length,
    conf: document.querySelectorAll('#aba-holoscan .conf-item, #aba-holoscan .conf-selo').length };
});
conferir(cheio.titulos.includes('Mapa HOLOS — última aplicação') && cheio.titulos.includes('Histórico de aplicações') && cheio.sis === 5, 'com HOLOSCAN: última aplicação com os 5 sistemas e o histórico');
conferir(cheio.conf === 0 && !/Convergente|Divergente|Leitura Integrada|confront/i.test(cheio.texto), 'com valores de exame guardados, NENHUM Convergente/Divergente aparece (exame não participa)');

/* ------------------------------------------------ ?homologacao=1 ---------- */
await p.goto('http://127.0.0.1:5500/?homologacao=1', { waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
await abrirFichaDe(pid);
await aba('holoscan');
const homolog = await p.evaluate(() => ({ blocoLab: !!document.getElementById('aba-holoscan-laboratorial'), legado: /LEGADO|Convergente|Divergente/.test(document.getElementById('aba-holoscan').innerText) }));
conferir(!homolog.blocoLab && !homolog.legado, 'em ?homologacao=1 o confronto legado também saiu da aba');

console.log('');
ok(ruim.length === 0, ruim.length ? 'ERRO DE JS: ' + ruim[0] : 'sem erro de JS');
await nav.close();
process.exit(falhou ? 1 : 0);
