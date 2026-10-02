/**
 * HOLOSCAN — a camada de confronto relato x laboratorio, revisao clinica do
 * HOLOSCAN.
 *
 * O que este teste trava (itens B a G do mandato da revisao):
 *
 *   B/C/D  lancar os 24 exames nao muda nota de sistema nenhuma, nem o
 *          Indice, nem a Triade — o motor ja garantia isso (testar-exames.mjs);
 *          aqui a prova e de ponta a ponta, pela tela.
 *   E      sem nenhum exame lancado, os cinco sistemas aparecem como DADOS
 *          INSUFICIENTES no Holoscan — nao ha bloco vazio nem sistema que
 *          simplesmente some.
 *   F      um caso divergente nao altera a nota exibida do sistema.
 *   G      nenhuma frase da lista de frases banidas (resistencia a insulina,
 *          inflamacao silenciosa, sobrecarga hepatica etc.) aparece em
 *          nenhuma das superficies do Holoscan — nem tela, nem tooltip, nem
 *          relatorio.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1400 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Holoscan';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 400));
});

await p.evaluate(async (respostas) => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  const m = {}; respostas.forEach(x => m[x.marcador_id] = x.intensidade);
  document.querySelectorAll('.q-item').forEach(i => {
    const v = m[i.dataset.marcador];
    if (v !== undefined) i.querySelectorAll('.q-btn')[v].click();
  });
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(r => setTimeout(r, 400));
  document.getElementById('btn-salvar-holoscan').click();
  await new Promise(r => setTimeout(r, 400));
}, caso.respostas);

/* ==================================================================== */
console.log('\n  E — SEM NENHUM EXAME, SEM DADOS SUFICIENTES (Leitura Integrada V1)\n');
/* ==================================================================== */

/* Etapa 5 da V1: #holo-confronto e a Leitura Integrada do pacote LI-V1 (sem
   regra homologada => "sem dados suficientes", com motivo). O confronto
   legado por sistema (.conf-selo) so existe em ?homologacao=1 (secao F2). */
const semExame = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  await new Promise(r => setTimeout(r, 400));
  const caixa = document.getElementById('holo-confronto');
  return {
    texto: caixa ? caixa.innerText.replace(/\s+/g, ' ') : '',
    selos: [...(caixa ? caixa.querySelectorAll('.conf-selo') : [])].map(e => e.textContent),
    pacote: caixa?.querySelector('#li-status')?.textContent || '',
  };
});
ok(semExame.selos.length === 0 && /sem dados suficientes/i.test(semExame.pacote) && /LI-V1/.test(semExame.pacote),
   'sem regra homologada, a Leitura Integrada so pode ser "sem dados suficientes" (nenhum selo por sistema): ' + semExame.pacote.slice(0, 60));
ok(!/convergente|divergente/i.test(semExame.texto.replace(/sem dados suficientes/gi, '')),
   'nenhuma palavra de conclusão aparece sem exame nenhum lançado');

/* ==================================================================== */
console.log('\n  B/C/D — EXAMES NÃO ALTERAM NOTA, ÍNDICE NEM TRÍADE\n');
/* ==================================================================== */

const antes = await p.evaluate(() => {
  const r = window.ultimaPontuacao();
  return { indice: r.indice, notas: r.sistemas.map(s => [s.sistema, s.nota]), triada: r.triada };
});

const TODOS_EXAMES = {
  'EXA-001': 0.5, 'EXA-002': 0.5, 'EXA-003': 8, 'EXA-004': 4,
  'EXA-005': 115, 'EXA-006': 4, 'EXA-007': 1, 'EXA-008': 5,
  'EXA-009': 70, 'EXA-010': 60, 'EXA-011': 1.2, 'EXA-012': 1.2,
  'EXA-013': 18, 'EXA-014': 18, 'EXA-015': 78, 'EXA-016': 0.6,
  'EXA-017': 25, 'EXA-018': 0.8, 'EXA-019': 50, 'EXA-020': 600,
  'EXA-021': 100, 'EXA-022': 5, 'EXA-023': 5, 'EXA-024': 14,
};

await p.evaluate(async (valores) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 300));
  Object.keys(valores).forEach(id => {
    const l = [...document.querySelectorAll('#ex-corpo .ex-linha')].find(x => x.dataset.exame === id);
    if (!l) return;
    const input = l.querySelector('input');
    input.value = String(valores[id]);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 300));
}, TODOS_EXAMES);

const depois = await p.evaluate(() => {
  const r = window.ultimaPontuacao();
  return { indice: r.indice, notas: r.sistemas.map(s => [s.sistema, s.nota]), triada: r.triada };
});

ok(JSON.stringify(antes.indice) === JSON.stringify(depois.indice),
   'Índice idêntico antes/depois de lançar os 24 exames: ' + antes.indice + ' = ' + depois.indice);
ok(JSON.stringify(antes.notas) === JSON.stringify(depois.notas),
   'as cinco notas de sistema continuam idênticas');
ok(JSON.stringify(antes.triada) === JSON.stringify(depois.triada),
   'a Tríade continua idêntica');

/* ==================================================================== */
console.log('\n  F — EXAMES FORA DA FAIXA NAO VIRAM "DIVERGENTE" NA SAIDA OFICIAL, NEM CORRIGEM A NOTA\n');
/* ==================================================================== */

/* Etapa 5 da V1: "um exame fora da faixa" nao basta para convergir/divergir.
   Na saida oficial, com os 24 exames lancados, a Leitura Integrada continua
   "sem dados suficientes" e o Indice e o do motor. */
const divergencia = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  await new Promise(r => setTimeout(r, 400));
  const caixa = document.getElementById('holo-confronto');
  return {
    texto: caixa.innerText.replace(/\s+/g, ' '),
    selos: caixa.querySelectorAll('.conf-selo, .conf-item').length,
    notaNaTela: document.getElementById('holo-score-total').textContent,
  };
});
ok(divergencia.selos === 0 && !/divergente|convergente/i.test(divergencia.texto) && /sem dados suficientes/i.test(divergencia.texto),
   'com 24 exames lançados, a saída oficial segue "sem dados suficientes" — exame fora da faixa não vira Divergente');
ok(divergencia.notaNaTela === String(depois.indice),
   'o Índice na tela continua o do motor, exame nenhum o corrige: ' + divergencia.notaNaTela);

/* ==================================================================== */
console.log('\n  F2 — O CONFRONTO LEGADO SO EXISTE EM ?homologacao=1, ROTULADO LEGADO\n');
/* ==================================================================== */

const p2 = await nav.newPage();
await p2.setViewport({ width: 1500, height: 1400 });
p2.on('pageerror', e => ruim.push(e.message));
await p2.goto('http://127.0.0.1:5500/?homologacao=1', { waitUntil: 'networkidle2' });
await p2.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
const legado = await p2.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  await new Promise(r => setTimeout(r, 400));
  const caixa = document.getElementById('holo-confronto');
  const bloco = [...caixa.querySelectorAll('.holo-dominante-sistema')]
    .find(b => /Detox/.test(b.querySelector('h5').textContent));
  return {
    banner: caixa.querySelector('.q-erro')?.textContent || '',
    selo: bloco?.querySelector('.conf-selo')?.textContent || '',
    notaNaTela: document.getElementById('holo-score-total').textContent,
  };
});
await p2.close();
ok(/LEGADO \(modo de homologação\)/.test(legado.banner) && /não é saída oficial/.test(legado.banner),
   'em ?homologacao=1 o confronto antigo aparece rotulado LEGADO e "não é saída oficial"');
ok(/Divergente/i.test(legado.selo),
   'ali o Detox (relato ok, GGT alterado) ainda aparece como Divergente — comportamento legado preservado para revisão: ' + legado.selo);
ok(legado.notaNaTela === String(depois.indice),
   'e mesmo lá o Índice na tela continua o do motor: ' + legado.notaNaTela);

/* ==================================================================== */
console.log('\n  G — NENHUMA FRASE BANIDA EM NENHUMA SUPERFÍCIE DO HOLOSCAN\n');
/* ==================================================================== */

const PROIBIDO = [
  /resist[êe]ncia (a|à)?\s?insulina/i,
  /inflama[çc][ãa]o silenciosa/i,
  /processo inflamat[óo]rio ativo/i,
  /carga [áa]cida elevada/i,
  /metila[çc][ãa]o comprometida/i,
  /hiperalerta sustentado/i,
  /sobrecarga hep[áa]tica/i,
  /tireoide pedindo/i,
  /problema de tireoide/i,
];

const superficies = await p.evaluate(() => {
  document.querySelector('[data-aba="relatorio"]').click();
  const rel = document.getElementById('relatorio');
  const tooltips = [...document.querySelectorAll('#ex-corpo .ex-linha[title]')].map(l => l.title);
  return {
    holoscan: document.getElementById('holo-confronto')?.innerText || '',
    exConfronto: document.getElementById('ex-confronto')?.innerText || '',
    relatorio: rel ? rel.innerText : '',
    tooltips,
  };
});

const varrer = (nome, texto) => {
  const achados = PROIBIDO.filter(re => re.test(texto));
  ok(achados.length === 0,
     nome + ' livre de frases banidas' + (achados.length ? ': ' + achados.map(r => r.source).join(', ') : ''));
};
varrer('#holo-confronto', superficies.holoscan);
varrer('#ex-confronto', superficies.exConfronto);
varrer('relatório (seção B)', superficies.relatorio);
varrer('tooltips de exame', superficies.tooltips.join(' | '));
ok(superficies.tooltips.length > 0 && superficies.tooltips.every(t => /faixa cadastrada/i.test(t)),
   'os tooltips descrevem valor/faixa, nunca a leitura clínica do CSV: "' +
   (superficies.tooltips[0] || '').slice(0, 90) + '"');

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
