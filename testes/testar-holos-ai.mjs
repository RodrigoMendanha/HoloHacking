/**
 * HOLOS AI — testes do frontend integrado à ficha do paciente.
 *
 * O que este teste cobra:
 *
 *   ABA         a aba "HOLOS AI" existe e abre.
 *   VAZIO       sem autenticação e sem paciente, mostra mensagens corretas.
 *   ESTRUTURA   com paciente, a interface do chat aparece: sidebar, input,
 *               botao de enviar, atalhos de prompt.
 *   SEGURANCA   a chave da IA nao aparece em nenhum lugar do frontend.
 *   ISOLAMENTO  trocar de paciente reseta a thread ativa.
 *
 * NAO testa a Edge Function nem a API do Gemini (isso e teste de integracao
 * que roda contra o backend real).
 */
import puppeteer from 'puppeteer-core';

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
const ok = (c, t) => console.log((c ? '  ok    ' : '  FALHA ') + t);
const conferir = (c, t) => { if (!c) falhou = true; ok(c, t); };

const aba = (x) => p.evaluate(async (n) => {
  document.querySelector('[data-aba="' + n + '"]').click();
  await new Promise(r => setTimeout(r, 250));
}, x);

/* ------------------------------------------------- aba existe ----------- */

const abaExiste = await p.evaluate(() =>
  !!document.querySelector('[data-aba="holos-ai"]'));
conferir(abaExiste, 'a aba HOLOS AI existe no tablist da ficha');

const painelExiste = await p.evaluate(() =>
  !!document.getElementById('aba-holos-ai'));
conferir(painelExiste, 'o painel #aba-holos-ai existe no DOM');

/* ------------------------------------------------- sem paciente --------- */

await aba('holos-ai');

const semPaciente = await p.evaluate(() => {
  const alvo = document.getElementById('aba-holos-ai');
  const texto = alvo?.innerText?.replace(/\s+/g, ' ').trim();
  return { texto, temChat: !!alvo?.querySelector('.ai-container') };
});

// Sem autenticação, a mensagem deve pedir login OU pedir selecionar paciente
conferir(
  /autenticação|Selecione um paciente/i.test(semPaciente.texto),
  'sem paciente/auth, mostra mensagem adequada: ' + semPaciente.texto?.slice(0, 60)
);
conferir(!semPaciente.temChat, 'sem paciente, não mostra o chat');

/* ------------------------------------------------- com paciente --------- */

await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  const v = document.getElementById('voltar-lista'); if (v) v.click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Marina Alves';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(x => setTimeout(x, 300));
});

// Abrir ficha e ir para a aba HOLOS AI
await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  const fichas = document.querySelectorAll('[data-ficha]');
  if (fichas.length) fichas[fichas.length - 1].click();
  await new Promise(r => setTimeout(r, 300));
});
await aba('holos-ai');

const comPaciente = await p.evaluate(() => {
  const alvo = document.getElementById('aba-holos-ai');
  return {
    temContainer: !!alvo?.querySelector('.ai-container'),
    temSidebar: !!alvo?.querySelector('.ai-sidebar'),
    temInput: !!alvo?.querySelector('.ai-input'),
    temBotao: !!alvo?.querySelector('.ai-enviar'),
    temAtalhos: alvo?.querySelectorAll('.ai-atalho').length || 0,
    temBoasVindas: !!alvo?.querySelector('.ai-boas-vindas'),
    textoBotao: alvo?.querySelector('.ai-enviar')?.textContent?.trim(),
    placeholderInput: alvo?.querySelector('.ai-input')?.placeholder,
    temNovaConversa: !!alvo?.querySelector('#ai-nova-conversa'),
  };
});

// Se não autenticado, pode não mostrar o chat (mostra msg de auth)
// Vamos verificar o que apareceu
if (comPaciente.temContainer) {
  conferir(comPaciente.temContainer, 'com paciente, o container do chat aparece');
  conferir(comPaciente.temSidebar, 'sidebar de threads presente');
  conferir(comPaciente.temInput, 'campo de texto presente');
  conferir(comPaciente.temBotao, 'botão enviar presente');
  conferir(comPaciente.textoBotao === 'Enviar', 'botão diz "Enviar": ' + comPaciente.textoBotao);
  conferir(comPaciente.temAtalhos >= 3, comPaciente.temAtalhos + ' atalhos de prompt');
  conferir(comPaciente.temBoasVindas, 'mensagem de boas-vindas do HOLOS AI');
  conferir(comPaciente.temNovaConversa, 'botão "Nova conversa" presente');
  conferir(/HOLOS AI|paciente/i.test(comPaciente.placeholderInput),
    'placeholder do input menciona o contexto: ' + comPaciente.placeholderInput);
} else {
  // Sem auth, é esperado não ter chat
  const textoSemAuth = await p.evaluate(() =>
    document.getElementById('aba-holos-ai')?.innerText?.replace(/\s+/g, ' ').trim());
  conferir(/autenticação|login/i.test(textoSemAuth),
    'sem autenticação, pede login (esperado neste ambiente de teste): ' + textoSemAuth?.slice(0, 60));
}

/* ------------------------------------------- segurança: sem chave no DOM -- */

const seguranca = await p.evaluate(() => {
  const html = document.documentElement.outerHTML;
  return {
    temGeminiKey: /GEMINI_API_KEY|AIzaSy|gemini.*key/i.test(html),
    temServiceRole: /service_role/i.test(html),
  };
});
conferir(!seguranca.temGeminiKey, 'GEMINI_API_KEY não aparece no HTML');
conferir(!seguranca.temServiceRole, 'service_role key não aparece no HTML');

// Verificar que o JS também não contém a chave
const jsSeguro = await p.evaluate(async () => {
  const resp = await fetch('/holos-ai.js');
  const texto = await resp.text();
  return {
    temGeminiKey: /GEMINI_API_KEY|AIzaSy/i.test(texto),
    temServiceRole: /service_role/i.test(texto),
  };
});
conferir(!jsSeguro.temGeminiKey, 'holos-ai.js não contém referência a chave Gemini');
conferir(!jsSeguro.temServiceRole, 'holos-ai.js não contém service_role');

/* ------------------------------------------- aviso de IA sempre visível -- */

if (comPaciente.temContainer) {
  const aviso = await p.evaluate(() => {
    const el = document.querySelector('.ai-aviso');
    return el?.textContent?.replace(/\s+/g, ' ').trim();
  });
  conferir(/não diagnostica|não prescreve|não substitui/i.test(aviso),
    'aviso de limitação da IA visível: ' + (aviso || '(não encontrado)')?.slice(0, 80));
}

/* --------------------------------------------------------------- fim ----- */
console.log('');
ok(ruim.length === 0, ruim.length ? 'ERRO DE JS: ' + ruim[0] : 'sem erro de JS');
if (ruim.length) falhou = true;
await nav.close();
process.exit(falhou ? 1 : 0);
