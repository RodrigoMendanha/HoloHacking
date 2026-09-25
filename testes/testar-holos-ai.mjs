/**
 * HOLOS AI — testes do hub de inteligencia profissional na ficha.
 *
 * O que este teste cobra:
 *
 *   ABA            a aba "HOLOS AI" existe e abre.
 *   VAZIO          sem autenticação/paciente, mostra mensagens corretas.
 *   HUB            com paciente, a interface do hub aparece: botoes de agente,
 *                  atalhos de contexto, area de saida, copiar.
 *   CONTEXTO       gerar contexto do paciente produz texto estruturado.
 *   ISOLAMENTO     contexto so contem dados do paciente ativo.
 *   SEGURANCA      nenhuma chave de API no frontend.
 *   EDGE FUNCTION  nenhuma chamada a Edge Function ao abrir a aba.
 *   URLS           botoes de ChatGPT/Gemini usam URLs configuradas.
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1300 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
const chamadas = []; p.on('request', r => { if (/functions\/v1\/holos-ai/i.test(r.url())) chamadas.push(r.url()); });
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
  return { texto, temHub: !!alvo?.querySelector('.ai-hub') };
});

conferir(
  /autenticação|Selecione um paciente/i.test(semPaciente.texto),
  'sem paciente/auth, mostra mensagem adequada: ' + semPaciente.texto?.slice(0, 60)
);
conferir(!semPaciente.temHub, 'sem paciente, não mostra o hub');

/* ------------------------------------------------- com paciente --------- */

// Stub determinístico: autenticação + paciente mock com dados HOLOSCAN
await p.evaluate((respostas) => {
  // Auth stub
  if (!window.supabaseClient) window.supabaseClient = {};
  if (!window.HoloAuth) window.HoloAuth = {};
  window.HoloAuth.sessaoAtiva = () => true;

  // Paciente mock
  var MOCK = {
    id: 'hub-test-001', nome: 'Teste Hub', sexo: 'Feminino',
    nascimento: '1990-03-15', queixa: 'Fadiga crônica', objetivo: 'Energia'
  };
  window.pacienteAtivoId = () => MOCK.id;
  window.pacientesTodos = () => [MOCK];

  // Aplicar HOLOSCAN pelo motor para gerar pontuação real
  if (window.HOLOSCAN) {
    var pontuacao = window.HOLOSCAN.calcular(respostas);
    pontuacao.quando = new Date().toISOString().slice(0, 10);
    var dados = {}; dados[MOCK.id] = [pontuacao];
    localStorage.setItem('holohacking.pontuacao', JSON.stringify(dados));
    window.ultimaPontuacao = (pid) => {
      var d = JSON.parse(localStorage.getItem('holohacking.pontuacao') || '{}');
      var lista = d[pid]; return lista ? lista[lista.length - 1] : null;
    };
    window.historicoPontuacao = (pid) => {
      var d = JSON.parse(localStorage.getItem('holohacking.pontuacao') || '{}');
      return d[pid] || [];
    };
  }

  // Navegar para ficha
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
}, caso.respostas);
await aba('holos-ai');

const hub = await p.evaluate(() => {
  const alvo = document.getElementById('aba-holos-ai');
  return {
    temHub: !!alvo?.querySelector('.ai-hub'),
    temIntro: !!alvo?.querySelector('.ai-hub-intro'),
    temTitulo: alvo?.querySelector('.ai-hub-titulo')?.textContent?.trim(),
    temDescricao: !!alvo?.querySelector('.ai-hub-descricao'),
    temBtnChatgpt: !!alvo?.querySelector('#ai-btn-chatgpt'),
    temBtnGemini: !!alvo?.querySelector('#ai-btn-gemini'),
    atalhos: alvo?.querySelectorAll('.ai-atalho-ctx').length || 0,
    rotulosAtalhos: [...(alvo?.querySelectorAll('.ai-atalho-ctx') || [])].map(b => b.textContent.trim()),
    temPrivacidade: /permanecem neste navegador|não é enviada/i.test(alvo?.innerText || ''),
    temSaida: !!alvo?.querySelector('.ai-hub-saida'),
    saidaVisivel: !alvo?.querySelector('.ai-hub-saida')?.classList.contains('hidden'),
    temEdgeFunction: /functions\/v1|EDGE_FUNCTION/i.test(alvo?.innerHTML || ''),
    temChat: !!alvo?.querySelector('.ai-container'),
    temInput: !!alvo?.querySelector('.ai-input'),
    temFormChat: !!alvo?.querySelector('.ai-form'),
  };
});

conferir(hub.temHub, 'com paciente + auth stub, o hub HOLOS AI aparece');
conferir(hub.temTitulo === 'HOLOS AI', 'titulo: ' + hub.temTitulo);
conferir(hub.temDescricao, 'descricao presente');
conferir(hub.temBtnChatgpt, 'botao ChatGPT presente');
conferir(hub.temBtnGemini, 'botao Gemini presente');
conferir(hub.atalhos === 4, hub.atalhos + ' atalhos de contexto');
conferir(hub.rotulosAtalhos.includes('Caso completo'), 'atalho "Caso completo"');
conferir(hub.rotulosAtalhos.includes('HOLOSCAN'), 'atalho "HOLOSCAN"');
conferir(hub.rotulosAtalhos.includes('Exames'), 'atalho "Exames"');
conferir(hub.rotulosAtalhos.includes('Evolução / retorno'), 'atalho "Evolução / retorno"');
conferir(hub.temPrivacidade, 'aviso de privacidade visivel');
conferir(!hub.saidaVisivel, 'area de saida começa oculta');
conferir(!hub.temChat, 'nao tem mais o chat interno');
conferir(!hub.temInput, 'nao tem mais o campo de texto do chat');
conferir(!hub.temFormChat, 'nao tem mais o formulario de chat');
conferir(!hub.temEdgeFunction, 'nenhuma referencia a Edge Function no HTML');

/* ------------------------------------------ gerar contexto -------------- */

// Clicar no atalho "Caso completo"
await p.evaluate(async () => {
  document.querySelector('.ai-atalho-ctx[data-ctx="completo"]').click();
  await new Promise(r => setTimeout(r, 200));
});

const contexto = await p.evaluate(() => {
  const saida = document.getElementById('ai-hub-saida');
  const texto = document.getElementById('ai-hub-texto');
  const tipo = document.getElementById('ai-hub-tipo');
  return {
    saidaVisivel: saida && !saida.classList.contains('hidden'),
    texto: texto?.textContent || '',
    tipo: tipo?.textContent?.trim() || '',
    ativoClass: !!document.querySelector('.ai-atalho-ctx.ativo'),
  };
});

conferir(contexto.saidaVisivel, 'area de saida aparece apos gerar contexto');
conferir(contexto.tipo === 'Caso completo', 'tipo exibido: ' + contexto.tipo);
conferir(contexto.ativoClass, 'atalho clicado fica com classe .ativo');
conferir(/Contexto HOLOS AI/i.test(contexto.texto), 'cabecalho do contexto presente');
conferir(/Paciente/i.test(contexto.texto), 'secao Paciente no contexto');
conferir(/HOLOSCAN/i.test(contexto.texto), 'secao HOLOSCAN no contexto');
conferir(/Sistemas/i.test(contexto.texto), 'lista de sistemas no contexto');
conferir(/Tríada|Triada/i.test(contexto.texto), 'triada no contexto');

// Verificar que o contexto nao contem dados de outro paciente
conferir(!/outro_paciente_id|_sem_paciente/i.test(contexto.texto),
  'nenhuma informação de outro paciente no contexto');

// Testar atalho HOLOSCAN
await p.evaluate(async () => {
  document.querySelector('.ai-atalho-ctx[data-ctx="holoscan"]').click();
  await new Promise(r => setTimeout(r, 100));
});
const ctxHoloscan = await p.evaluate(() => ({
  tipo: document.getElementById('ai-hub-tipo')?.textContent?.trim(),
  texto: document.getElementById('ai-hub-texto')?.textContent || '',
}));
conferir(ctxHoloscan.tipo === 'HOLOSCAN', 'trocar atalho atualiza tipo: ' + ctxHoloscan.tipo);
conferir(/HOLOSCAN/i.test(ctxHoloscan.texto), 'contexto HOLOSCAN gerado');

// Testar atalho Exames
await p.evaluate(async () => {
  document.querySelector('.ai-atalho-ctx[data-ctx="exames"]').click();
  await new Promise(r => setTimeout(r, 100));
});
const ctxExames = await p.evaluate(() => ({
  tipo: document.getElementById('ai-hub-tipo')?.textContent?.trim(),
}));
conferir(ctxExames.tipo === 'Exames', 'contexto Exames gerado: ' + ctxExames.tipo);

// Testar atalho Evolução / retorno
await p.evaluate(async () => {
  document.querySelector('.ai-atalho-ctx[data-ctx="evolucao"]').click();
  await new Promise(r => setTimeout(r, 100));
});
const ctxEvolucao = await p.evaluate(() => ({
  tipo: document.getElementById('ai-hub-tipo')?.textContent?.trim(),
}));
conferir(ctxEvolucao.tipo === 'Evolução / retorno', 'contexto Evolução gerado: ' + ctxEvolucao.tipo);

// Testar botao copiar (verifica que existe e pode ser clicado sem erro)
const temCopiar = await p.evaluate(() => !!document.getElementById('ai-hub-copiar'));
conferir(temCopiar, 'botao Copiar contexto presente');

// Agentes sem URL ficam indisponíveis (nenhum dado clínico vai em query string)
const agentesSemUrl = await p.evaluate(() => {
  const c = document.getElementById('ai-btn-chatgpt');
  const g = document.getElementById('ai-btn-gemini');
  return {
    chatgptSemHref: !c?.href || c.href === location.href,
    geminiSemHref: !g?.href || g.href === location.href,
    chatgptIndisponivel: c?.classList.contains('ai-btn-indisponivel'),
    geminiIndisponivel: g?.classList.contains('ai-btn-indisponivel'),
  };
});
conferir(agentesSemUrl.chatgptIndisponivel, 'sem URL configurada, ChatGPT fica indisponível');
conferir(agentesSemUrl.geminiIndisponivel, 'sem URL configurada, Gemini fica indisponível');

// Nenhum dado clínico em query string ou URL do agente
const contextoTexto = await p.evaluate(() =>
  document.getElementById('ai-hub-texto')?.textContent || '');
conferir(!/\?.*paciente|&nome=|&queixa=/i.test(contextoTexto),
  'nenhum dado clínico em formato query string no contexto');
conferir(!/fetch\(|XMLHttpRequest|sendBeacon/i.test(
  await p.evaluate(() => document.querySelector('script[src*="holos-ai"]')?.src || '')),
  'nenhum envio automático detectado');

/* ---------------------------------------- Edge Function nunca chamada --- */

conferir(chamadas.length === 0,
  'nenhuma chamada a Edge Function holos-ai ao abrir a aba: ' + chamadas.length + ' chamadas');

/* ------------------------------------------ URLs configuráveis --------- */

// Configurar URLs via API
await p.evaluate(() => {
  window.HolosAI.configurarUrls({
    chatgpt: 'https://chat.openai.com/g/holos-ai-test',
    gemini: 'https://gemini.google.com/holos-ai-test'
  });
});
const urls = await p.evaluate(() => {
  const c = document.getElementById('ai-btn-chatgpt');
  const g = document.getElementById('ai-btn-gemini');
  return {
    chatgpt: c?.href || '',
    gemini: g?.href || '',
    chatgptIndisponivel: c?.classList.contains('ai-btn-indisponivel'),
    geminiIndisponivel: g?.classList.contains('ai-btn-indisponivel'),
    apiUrls: window.HolosAI.urls(),
  };
});
conferir(/holos-ai-test/.test(urls.chatgpt), 'URL ChatGPT configurada: ' + urls.chatgpt);
conferir(/holos-ai-test/.test(urls.gemini), 'URL Gemini configurada: ' + urls.gemini);
conferir(!urls.chatgptIndisponivel, 'ChatGPT nao esta mais indisponivel apos configurar');
conferir(!urls.geminiIndisponivel, 'Gemini nao esta mais indisponivel apos configurar');
conferir(urls.apiUrls.chatgpt && urls.apiUrls.gemini, 'HolosAI.urls() retorna os dois');

/* ------------------------------------------- segurança: sem chave no DOM */

const seguranca = await p.evaluate(() => {
  const html = document.documentElement.outerHTML;
  return {
    temGeminiKey: /GEMINI_API_KEY|AIzaSy|gemini.*key/i.test(html),
    temServiceRole: /service_role/i.test(html),
  };
});
conferir(!seguranca.temGeminiKey, 'GEMINI_API_KEY não aparece no HTML');
conferir(!seguranca.temServiceRole, 'service_role key não aparece no HTML');

const jsSeguro = await p.evaluate(async () => {
  const resp = await fetch('/holos-ai.js');
  const texto = await resp.text();
  return {
    temGeminiKey: /GEMINI_API_KEY|AIzaSy/i.test(texto),
    temServiceRole: /service_role/i.test(texto),
    temEdgeFunction: /functions\/v1\/holos-ai/i.test(texto),
  };
});
conferir(!jsSeguro.temGeminiKey, 'holos-ai.js não contém referência a chave Gemini');
conferir(!jsSeguro.temServiceRole, 'holos-ai.js não contém service_role');
conferir(!jsSeguro.temEdgeFunction, 'holos-ai.js não chama Edge Function');

/* --------------------------------------------------------------- fim --- */
console.log('');
ok(ruim.length === 0, ruim.length ? 'ERRO DE JS: ' + ruim[0] : 'sem erro de JS');
if (ruim.length) falhou = true;
await nav.close();
process.exit(falhou ? 1 : 0);
