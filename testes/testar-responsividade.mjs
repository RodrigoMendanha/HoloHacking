/**
 * Responsividade: quatro larguras de tela (375, 768, 1366, 1920) e nenhuma
 * delas pode estourar o viewport, esconder elementos-chave ou deixar o modal
 * de confirmacao sair da area visivel.
 *
 * Roda no Puppeteer contra o servidor local e segue o padrao ok()/falhou dos
 * outros testes do projeto.
 */
import puppeteer from 'puppeteer-core';

const VIEWPORTS = [375, 768, 1366, 1920];

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars'],
});
const p = await nav.newPage();
const ruim = []; p.on('pageerror', e => ruim.push(e.message));

// --- carregar o app e desbloquear a tela de login --------------------------
await p.setViewport({ width: 1200, height: 900 });
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());

// Liberar o app (login.js expoe LoginView.abrirApp em ambiente local)
await p.evaluate(() => {
  if (window.LoginView && window.LoginView.abrirApp) window.LoginView.abrirApp();
});

// --- semear um paciente para que cards e tiles existam ---------------------
await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Teste Responsivo';
  document.getElementById('np-telefone').value = '11999990000';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 400));
  // voltar ao dashboard para que os dash-tiles apareçam
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  if (window.redesenharDashboard) window.redesenharDashboard();
  await new Promise(r => setTimeout(r, 300));
});

// --- ok / falhou -----------------------------------------------------------
let falhou = false;
const ok = (c, t) => {
  if (!c) falhou = true;
  console.log((c ? '  ok    ' : '  FALHA ') + t);
};

// --- funcao auxiliar: garantir secao ativa ----------------------------------
const irPara = async (secao) => {
  await p.evaluate((s) => {
    document.querySelector('.nav-item[data-secao="' + s + '"]').click();
  }, secao);
  await new Promise(r => setTimeout(r, 200));
};

// --- testar cada viewport --------------------------------------------------
for (const largura of VIEWPORTS) {
  await p.setViewport({ width: largura, height: 900 });
  await new Promise(r => setTimeout(r, 250));

  // --- dashboard: nav-items + dash-tiles -----------------------------------
  await irPara('dashboard');

  const resDash = await p.evaluate((vw) => {
    const out = {};

    // 1. Scroll horizontal
    out.scrollWidth = document.documentElement.scrollWidth;
    out.semScrollH = document.documentElement.scrollWidth <= vw;

    // 2. nav-items
    const navItems = document.querySelectorAll('.nav-item');
    out.navItemCount = navItems.length;
    out.navItemsVisiveis = [...navItems].some(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    // 3. dash-tiles
    const tiles = document.querySelectorAll('.dash-tile');
    out.dashTileCount = tiles.length;
    out.tilesVisiveis = tiles.length > 0 && [...tiles].some(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    // 4. Texto cortado (excluindo ellipsis intencional)
    const suspeitos = document.querySelectorAll(
      '.nav-item, .dash-tile b, .bpctx-nome, .topo h2'
    );
    let cortados = 0;
    for (const el of suspeitos) {
      const cs = getComputedStyle(el);
      if (cs.textOverflow === 'ellipsis') continue;
      if (el.scrollWidth > el.clientWidth + 2) cortados++;
    }
    out.textoCortado = cortados;

    return out;
  }, largura);

  const tag = largura + 'px';
  ok(resDash.semScrollH,
    tag + ': sem barra de rolagem horizontal (scrollWidth=' + resDash.scrollWidth + ')');
  ok(resDash.navItemsVisiveis,
    tag + ': .nav-item visivel (' + resDash.navItemCount + ' encontrados)');
  ok(resDash.tilesVisiveis,
    tag + ': .dash-tile visivel (' + resDash.dashTileCount + ' encontrados)');
  ok(resDash.textoCortado === 0,
    tag + ': nenhum texto cortado sem ellipsis (' + resDash.textoCortado + ' cortados)');

  // --- lista de pacientes: card-paciente -----------------------------------
  await irPara('pacientes');

  const resCards = await p.evaluate(() => {
    const cards = document.querySelectorAll('.card-paciente');
    const algumVisivel = [...cards].some(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    return { count: cards.length, visivel: algumVisivel };
  });
  ok(resCards.count > 0 && resCards.visivel,
    tag + ': .card-paciente visivel (' + resCards.count + ' encontrados)');

  // --- modal dentro da ficha -----------------------------------------------
  // A ficha abre ao clicar num paciente; o modal vive dentro de secao-ficha
  // (position:fixed, mas so renderiza se a secao tiver display:block).
  await p.evaluate(async () => {
    const card = document.querySelector('.card-paciente');
    if (card) card.click();
    await new Promise(r => setTimeout(r, 300));
  });

  const resModal = await p.evaluate((vw) => {
    const modal = document.getElementById('modal-confirmar-acao');
    if (!modal) return { cabe: true, largura: 0 };

    const estavaSumido = modal.classList.contains('hidden');
    modal.classList.remove('hidden');

    const caixa = modal.querySelector('.fic-janela-caixa');
    const rc = caixa ? caixa.getBoundingClientRect() : null;
    const cabe = rc
      ? (rc.left >= -1 && rc.right <= vw + 1 && rc.top >= -1 && rc.bottom <= window.innerHeight + 1)
      : false;
    const largura = rc ? Math.round(rc.width) : 0;

    if (estavaSumido) modal.classList.add('hidden');
    return { cabe, largura };
  }, largura);

  ok(resModal.cabe,
    tag + ': modal de confirmacao cabe no viewport (largura=' + resModal.largura + 'px)');
}

await nav.close();
console.log(ruim.length ? '\n  ERRO JS: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
