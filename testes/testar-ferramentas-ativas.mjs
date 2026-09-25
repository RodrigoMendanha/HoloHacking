/**
 * Verifica que somente as 6 ferramentas ativas (+1 derivada) podem originar
 * nova aplicacao. Ferramentas legadas continuam legiveis no historico mas nao
 * podem ser abertas como nova aplicacao.
 */
import puppeteer from 'puppeteer-core';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1400 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

/* ================================ FERRAMENTAS_ATIVAS existe e esta certa */

const ativas = await p.evaluate(() => window.FERRAMENTAS_ATIVAS);
ok(Array.isArray(ativas), 'FERRAMENTAS_ATIVAS e um array');
ok(ativas.length === 4, '4 ferramentas de catalogo ativas: ' + ativas.length);

const esperadas = ['linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro'];
const temTodas = esperadas.every(id => ativas.indexOf(id) >= 0);
ok(temTodas, 'lista contem exatamente as 4 esperadas');

/* ======================== galeria so tem cards para ferramentas ativas */

const cards = await p.evaluate(() => {
  return [...document.querySelectorAll('[data-ferramenta]')]
    .map(el => el.dataset.ferramenta);
});
ok(cards.length === 4, 'galeria tem 4 cards data-ferramenta: ' + cards.length);
const todasNoCards = cards.every(id => esperadas.indexOf(id) >= 0);
ok(todasNoCards, 'todos os cards pertencem a lista de ativas: ' + cards.join(', '));

/* ======================== ancoras (data-vista) para OQ3, PQQ, Mapa */

const vistas = await p.evaluate(() => {
  return [...document.querySelectorAll('[data-vista]')]
    .map(el => el.dataset.vista);
});
const temOq3 = vistas.indexOf('vista-oq3') >= 0;
const temPqq = vistas.indexOf('vista-pqq') >= 0;
const temMapa = vistas.indexOf('vista-mapa') >= 0;
ok(temOq3 && temPqq && temMapa, 'ancoras OQ3, PQQ, Mapa do Proposito presentes');

/* ======================== abrirFerramentaPorId recusa legadas */

const recusaLegada = await p.evaluate(() => {
  const legadas = ['mapa_rotina', 'energia_vital', 'leitura_sinais',
    'diario_corporal', 'ritmo_sono', 'inventario_habitos',
    'hidratacao_movimento', 'check_comprometimento',
    'diario_emocoes', 'historia_alimentar', 'gatilhos_respostas',
    'roda_valores', 'reenquadramento', 'ancoras_motivacao',
    'autocompaixao', 'autoestima',
    'ritual_mesa', 'inventario_gratidao', 'conexao_pertencimento',
    'circulo_sentido', 'praticas_contemplativas', 'legado', 'alinhamento'];
  return legadas.every(id => window.abrirFerramentaPorId(id) === false);
});
ok(recusaLegada, 'abrirFerramentaPorId recusa todas as 23 ferramentas legadas');

/* ======================== abrirFerramentaPorId aceita ativas */

const aceitaAtivas = await p.evaluate(() => {
  return ['linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro']
    .every(id => {
      const r = window.abrirFerramentaPorId(id);
      return r === true;
    });
});
ok(aceitaAtivas, 'abrirFerramentaPorId aceita as 4 ferramentas ativas do catalogo');

/* ======================== ficha: texto nao diz "30 ferramentas" */

await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Teste Ativas';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 400));
});

const fichaTexto = await p.evaluate(async () => {
  const fichaBtn = document.querySelector('[data-atalho="ficha"]');
  if (fichaBtn) fichaBtn.click();
  await new Promise(r => setTimeout(r, 300));
  const abas = document.querySelectorAll('.fic-aba');
  for (const a of abas) {
    if (/ferramentas|formulários/i.test(a.textContent)) { a.click(); break; }
  }
  await new Promise(r => setTimeout(r, 300));
  const rodape = document.querySelector('.fic-forms-rodape');
  return rodape ? rodape.textContent : '';
});
ok(!/30 ferramentas/i.test(fichaTexto), 'ficha nao menciona "30 ferramentas"');
ok(!/de 30/i.test(fichaTexto), 'contador nao usa "de 30"');

/* ======================== catalogo continua intacto para compatibilidade */

const catalogoTamanho = await p.evaluate(() =>
  (window.CATALOGO_FERRAMENTAS || []).length
);
ok(catalogoTamanho === 27, 'CATALOGO_FERRAMENTAS preservado com 27 ferramentas: ' + catalogoTamanho);

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
