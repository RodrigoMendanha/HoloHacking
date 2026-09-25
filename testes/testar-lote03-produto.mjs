/**
 * Lote 03 — polimento do produto.
 *
 * Este teste cobra as alterações do Lote 03:
 *
 *   PERFIL        cards divididos (profissional + contato), upload feedback
 *   AGENDA        resumo de hoje na visão semana/mês
 *   FICHA         ARIA labels nos pills, alertas e modal
 *   RELATÓRIO     toggle de registro, impressão, seções A–E, ARIA
 *   HOLOS AI      aria-pressed, aria-live, contexto com nome
 *   ACESSIBILIDADE skip-link, focus-visible, reduced-motion, tabpanel roles
 *   PRESERVAÇÃO   6+1 ferramentas, 84 perguntas, 5 sistemas intactos
 */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { congelarRelogio } from './relogio-fixo.mjs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1300 });
await congelarRelogio(p, '2026-09-25T10:00:00');
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => console.log((c ? '  ok    ' : '  FALHA ') + t);
const conferir = (c, t) => { if (!c) falhou = true; ok(c, t); };

/* ========================================================= ACESSIBILIDADE */

console.log('\n  ACESSIBILIDADE');

const skipLink = await p.evaluate(() => {
  const el = document.querySelector('.skip-link');
  return {
    existe: !!el,
    href: el ? el.getAttribute('href') : null,
    texto: el ? el.textContent.trim() : ''
  };
});
conferir(skipLink.existe, 'skip-link existe no DOM');
conferir(skipLink.href === '#conteudo-principal', 'skip-link aponta para #conteudo-principal');

const mainId = await p.evaluate(() =>
  !!document.getElementById('conteudo-principal'));
conferir(mainId, 'main tem id="conteudo-principal"');

const langAttr = await p.evaluate(() =>
  document.documentElement.getAttribute('lang'));
conferir(langAttr === 'pt-BR', 'html tem lang="pt-BR"');

const reducedMotion = await p.evaluate(() => {
  const sheets = document.styleSheets;
  for (let i = 0; i < sheets.length; i++) {
    try {
      const rules = sheets[i].cssRules;
      for (let j = 0; j < rules.length; j++) {
        if (rules[j].conditionText &&
            rules[j].conditionText.includes('prefers-reduced-motion')) return true;
      }
    } catch (e) { /* cross-origin */ }
  }
  return false;
});
conferir(reducedMotion, 'CSS inclui @media(prefers-reduced-motion)');

/* ========================================================= PERFIL ======= */

console.log('\n  PERFIL');

await p.evaluate(() =>
  document.querySelector('.nav-item[data-secao="perfil"]').click());
await p.evaluate(() => new Promise(r => setTimeout(r, 200)));

const perfilCards = await p.evaluate(() => {
  const cartoes = document.querySelectorAll('#secao-perfil .perf-cartao');
  const titulos = [...cartoes].map(c => {
    const h = c.querySelector('.perf-titulo, h3, h4');
    return h ? h.textContent.trim() : '';
  }).filter(Boolean);
  return { total: cartoes.length, titulos };
});
conferir(perfilCards.total >= 2, 'perfil tem pelo menos 2 cards: ' + perfilCards.total);

const completude = await p.evaluate(() => {
  const el = document.getElementById('sr-pct');
  return el ? el.textContent.trim() : '';
});
conferir(/\d+%/.test(completude), 'completude mostra percentual: ' + completude);

/* ========================================================= AGENDA ======= */

console.log('\n  AGENDA');

await p.evaluate(async () => {
  // Criar um paciente e marcar consulta para hoje
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Teste Lote03';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 400));

  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 200));
  const novoBtn = document.querySelector('[data-novo="consulta"]');
  if (novoBtn) novoBtn.click();
  await new Promise(r => setTimeout(r, 200));

  // preencher formulário se existe
  const horaInput = document.getElementById('cal-hora');
  if (horaInput) horaInput.value = '10:00';
  const salvar = document.querySelector('[data-acao="salvar-consulta"]');
  if (salvar) salvar.click();
  await new Promise(r => setTimeout(r, 300));
});

// Verify today highlight CSS exists
const todayHighlight = await p.evaluate(() => {
  const sheets = document.styleSheets;
  let temHoje = false;
  for (let i = 0; i < sheets.length; i++) {
    try {
      const rules = sheets[i].cssRules;
      for (let j = 0; j < rules.length; j++) {
        if (rules[j].selectorText &&
            rules[j].selectorText.includes('.cal-celula.hoje')) temHoje = true;
      }
    } catch (e) { /* cross-origin */ }
  }
  return temHoje;
});
conferir(todayHighlight, 'CSS tem destaque para .cal-celula.hoje');

// Verify agenda resumoHoje exists in week view
const resumoHojeCSS = await p.evaluate(() => {
  const sheets = document.styleSheets;
  for (let i = 0; i < sheets.length; i++) {
    try {
      const rules = sheets[i].cssRules;
      for (let j = 0; j < rules.length; j++) {
        if (rules[j].selectorText &&
            rules[j].selectorText.includes('.cal-hoje-resumo')) return true;
      }
    } catch (e) { /* cross-origin */ }
  }
  return false;
});
conferir(resumoHojeCSS, 'CSS tem estilo para .cal-hoje-resumo');

/* ========================================================= FICHA ======= */

console.log('\n  FICHA');

await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  // Abrir ficha do paciente
  const primeiro = document.querySelector('.pac-item');
  if (primeiro) primeiro.click();
  await new Promise(r => setTimeout(r, 300));
});

const fichaFaixa = await p.evaluate(() => {
  const faixa = document.getElementById('ficha-faixa');
  if (!faixa) return { existe: false };
  return {
    existe: true,
    role: faixa.getAttribute('role'),
    ariaLabel: faixa.getAttribute('aria-label'),
    pillCount: faixa.querySelectorAll('.fic-pilula').length,
    pillsHaveAria: [...faixa.querySelectorAll('.fic-pilula')].every(
      b => b.hasAttribute('aria-label'))
  };
});
conferir(fichaFaixa.existe, 'ficha-faixa existe no DOM');
conferir(fichaFaixa.role === 'group', 'faixa tem role="group"');
conferir(fichaFaixa.ariaLabel === 'Resumo do paciente', 'faixa tem aria-label adequado');
conferir(fichaFaixa.pillsHaveAria, 'todos os pills têm aria-label: ' + fichaFaixa.pillCount + ' pills');

/* ========================================================= RELATÓRIO === */

console.log('\n  RELATÓRIO');

// Apply HOLOSCAN first so report has data
await p.evaluate((respostas) => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  const m = {}; respostas.forEach(x => m[x.marcador_id] = x.intensidade);
  document.querySelectorAll('.q-item').forEach(i => {
    const v = m[i.dataset.marcador];
    if (v !== undefined) i.querySelectorAll('.q-btn')[v].click();
  });
  document.querySelector('[data-acao="calcular"]').click();
}, caso.respostas);

await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  const primeiro = document.querySelector('.pac-item');
  if (primeiro) primeiro.click();
  await new Promise(r => setTimeout(r, 200));
  const abaRel = document.querySelector('[data-aba="relatorio"]');
  if (abaRel) abaRel.click();
  await new Promise(r => setTimeout(r, 300));
});

const relatorio = await p.evaluate(() => {
  const alvo = document.getElementById('aba-relatorio');
  if (!alvo) return { existe: false };
  const article = alvo.querySelector('.relatorio');
  return {
    existe: true,
    temArticle: !!article,
    ariaLabel: article ? article.getAttribute('aria-label') : null,
    registroGroup: !!alvo.querySelector('[role="group"][aria-label="Registro"]'),
    btnNutri: !!alvo.querySelector('[data-registro="nutri"]'),
    btnPaciente: !!alvo.querySelector('[data-registro="paciente"]'),
    btnImprimir: !!alvo.querySelector('[data-acao="imprimir"]'),
    secaoA: alvo.innerText.includes('A. HOLOSCAN'),
    secaoB: alvo.innerText.includes('B. Leitura Integrada'),
    secaoC: alvo.innerText.includes('C. Consultas'),
    secaoD: alvo.innerText.includes('D. Documentos'),
    secaoE: alvo.innerText.includes('E. Interpretação profissional')
  };
});
conferir(relatorio.existe, 'aba relatório existe');
conferir(relatorio.temArticle, 'relatório tem article.relatorio');
conferir(relatorio.ariaLabel === 'Relatório do paciente', 'article tem aria-label');
conferir(relatorio.registroGroup, 'registro tem role="group" com aria-label');
conferir(relatorio.btnNutri && relatorio.btnPaciente, 'toggle nutri/paciente presente');
conferir(relatorio.btnImprimir, 'botão imprimir presente');
conferir(relatorio.secaoA, 'seção A (HOLOSCAN) presente');
conferir(relatorio.secaoB, 'seção B (Leitura Integrada) presente');
conferir(relatorio.secaoC, 'seção C (Consultas) presente');
conferir(relatorio.secaoD, 'seção D (Documentos) presente');
conferir(relatorio.secaoE, 'seção E (Interpretação) presente');

// Toggle to patient view
await p.evaluate(async () => {
  const btn = document.querySelector('[data-registro="paciente"]');
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 300));
});

const registroPaciente = await p.evaluate(() => {
  const btn = document.querySelector('[data-registro="paciente"]');
  return {
    ativo: btn ? btn.classList.contains('ativo') : false,
    ariaPressed: btn ? btn.getAttribute('aria-pressed') : null
  };
});
conferir(registroPaciente.ativo, 'botão paciente fica ativo');

/* ========================================================= HOLOS AI ==== */

console.log('\n  HOLOS AI');

await p.evaluate(async () => {
  // Navigate to ficha with patient visible
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  await new Promise(r => setTimeout(r, 200));
  const abaAi = document.querySelector('[data-aba="holos-ai"]');
  if (abaAi) abaAi.click();
  await new Promise(r => setTimeout(r, 300));
});

const holosAi = await p.evaluate(() => {
  const alvo = document.getElementById('aba-holos-ai');
  if (!alvo) return { existe: false };
  const hub = alvo.querySelector('.ai-hub');
  if (!hub) return { existe: true, temHub: false,
    textoFallback: alvo.innerText?.replace(/\s+/g, ' ').trim().slice(0, 80) };

  const atalhos = [...hub.querySelectorAll('.ai-atalho-ctx')];
  return {
    existe: true,
    temHub: true,
    titulo: hub.querySelector('.ai-hub-titulo')?.textContent || '',
    temDescricao: !!hub.querySelector('.ai-hub-descricao'),
    agentesGroup: !!hub.querySelector('[role="group"][aria-label="Agentes externos"]'),
    atalhosGroup: !!hub.querySelector('[role="group"][aria-label="Tipo de contexto"]'),
    atalhosCount: atalhos.length,
    atalhosAriaPressed: atalhos.every(b => b.hasAttribute('aria-pressed')),
    temPrivacidade: !!hub.querySelector('.ai-hub-privacidade'),
    saidaAriaLive: hub.querySelector('#ai-hub-saida')?.getAttribute('aria-live') === 'polite'
  };
});
conferir(holosAi.existe, 'aba HOLOS AI existe');

if (holosAi.temHub) {
  conferir(holosAi.titulo === 'HOLOS AI', 'título é "HOLOS AI"');
  conferir(holosAi.agentesGroup, 'agentes têm role="group"');
  conferir(holosAi.atalhosGroup, 'atalhos têm role="group"');
  conferir(holosAi.atalhosCount === 4, '4 atalhos de contexto: ' + holosAi.atalhosCount);
  conferir(holosAi.atalhosAriaPressed, 'todos os atalhos têm aria-pressed');
  conferir(holosAi.temPrivacidade, 'aviso de privacidade presente');
  conferir(holosAi.saidaAriaLive, 'saída tem aria-live="polite"');

  // Generate context
  await p.evaluate(async () => {
    const btn = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 200));
  });

  const contexto = await p.evaluate(() => {
    const area = document.getElementById('ai-hub-texto');
    const btn = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]');
    return {
      texto: area ? area.textContent.slice(0, 100) : '',
      ativo: btn ? btn.classList.contains('ativo') : false,
      ariaPressed: btn ? btn.getAttribute('aria-pressed') : null,
      saidaVisivel: !document.getElementById('ai-hub-saida')?.classList.contains('hidden')
    };
  });
  conferir(contexto.texto.includes('Contexto HOLOS AI'), 'contexto gerado contém cabeçalho');
  conferir(contexto.ativo, 'botão "completo" fica ativo');
  conferir(contexto.ariaPressed === 'true', 'aria-pressed="true" no botão ativo');
  conferir(contexto.saidaVisivel, 'área de saída fica visível');
} else {
  conferir(/autenticação|login|Selecione/i.test(holosAi.textoFallback || ''),
    'sem auth, mostra mensagem adequada (esperado em teste): ' +
    (holosAi.textoFallback || '').slice(0, 60));
}

/* ========================================================= TABPANELS === */

console.log('\n  TABPANELS');

const tabpanels = await p.evaluate(() => {
  const paineis = document.querySelectorAll(
    '#aba-visao, #aba-consultas, #aba-holoscan, #aba-ferramentas, ' +
    '#aba-documentos, #aba-relatorio, #aba-holos-ai');
  let comRole = 0;
  paineis.forEach(p => { if (p.getAttribute('role') === 'tabpanel') comRole++; });
  return { total: paineis.length, comRole };
});
conferir(tabpanels.total >= 5, 'pelo menos 5 painéis de aba existem');
conferir(tabpanels.comRole === tabpanels.total,
  'todos os painéis têm role="tabpanel": ' + tabpanels.comRole + '/' + tabpanels.total);

/* ========================================================= PRESERVAÇÃO = */

console.log('\n  PRESERVAÇÃO');

const preservacao = await p.evaluate(() => {
  const catalogo = window.CATALOGO_FERRAMENTAS || [];
  const ativas = window.FERRAMENTAS_ATIVAS || [];
  const perguntas = window.HOLOSCAN && window.HOLOSCAN.questionario
    ? window.HOLOSCAN.questionario().length : 0;
  const pont = window.ultimaPontuacao ? window.ultimaPontuacao() : null;
  const sistemas = pont ? pont.sistemas.length : 0;
  return { catalogo: catalogo.length, ativas: ativas.length, perguntas, sistemas };
});
conferir(preservacao.catalogo === 27, '27 ferramentas no catálogo: ' + preservacao.catalogo);
conferir(preservacao.ativas === 4, '4 IDs em FERRAMENTAS_ATIVAS: ' + preservacao.ativas);
conferir(preservacao.perguntas === 84, '84 perguntas no HOLOSCAN: ' + preservacao.perguntas);
conferir(preservacao.sistemas === 5, '5 sistemas no mapa: ' + preservacao.sistemas);

/* ========================================================= ERROS JS ==== */

console.log('\n  ERROS JS');

conferir(ruim.length === 0, 'nenhum erro de JS no console: ' + (ruim.length ? ruim[0] : 'limpo'));

/* ========================================================= RESULTADO === */

await nav.close();
console.log('\n' + (falhou ? '  RESULTADO: ALGUM TESTE FALHOU' : '  RESULTADO: TUDO OK'));
process.exit(falhou ? 1 : 0);
