/**
 * HOLOSCAN × EXAMES — decisao de produto 09/10: exame NAO participa do HOLOSCAN.
 *
 * O que este teste trava (pela tela, sem conta):
 *
 *   E      a Leitura Integrada saiu do menu; no lugar dela esta "Resultado"
 *          (a pagina final para a paciente), que sem conta so avisa.
 *   B/C/D  valor de exame guardado localmente (legado) nao muda nota de
 *          sistema nenhuma, nem o Indice, nem a Triade — e nao ha mais
 *          painel para digitar valor na ficha.
 *   F      nenhuma palavra de conclusao laboratorial (convergente,
 *          divergente, abaixo/acima da referencia) em nenhuma tela — nem em
 *          ?homologacao=1, onde o confronto legado tambem saiu.
 *   G      nenhuma frase da lista de frases banidas em nenhuma superficie.
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
console.log('\n  E — A LEITURA INTEGRADA SAIU; NO LUGAR, "RESULTADO"\n');
/* ==================================================================== */

const menu = await p.evaluate(async () => {
  const r = { confronto: !!document.querySelector('.nav-item[data-secao="confronto"]'), secaoConfronto: !!document.getElementById('secao-confronto'),
    resultado: !!document.querySelector('.nav-item[data-secao="resultado"]'), botaoResumo: document.querySelector('[data-res-ir="resultado"]')?.textContent || '' };
  document.querySelector('.nav-item[data-secao="resultado"]').click();
  await new Promise(x => setTimeout(x, 300));
  r.ativa = document.querySelector('.secao.ativa')?.id;
  r.corpo = document.getElementById('resultado-pagina-corpo')?.innerText || '';
  return r;
});
ok(!menu.confronto && !menu.secaoConfronto && menu.resultado, 'o menu nao tem mais Leitura Integrada; tem Resultado');
ok(menu.ativa === 'secao-resultado' && /Entre na sua conta/.test(menu.corpo), 'a pagina Resultado abre e, sem conta, explica que o resultado vem do servidor');
ok(/Resultado para a paciente/.test(menu.botaoResumo), 'o quadro do resultado leva para "Resultado para a paciente": ' + menu.botaoResumo);

/* ==================================================================== */
console.log('\n  B/C/D — EXAMES NÃO ALTERAM NOTA, ÍNDICE NEM TRÍADE\n');
/* ==================================================================== */

const antes = await p.evaluate(() => {
  const r = window.ultimaPontuacao();
  return { indice: r.indice, notas: r.sistemas.map(s => [s.sistema, s.nota]), triada: r.triada };
});

const TODOS_EXAMES = {
  'EXA-001': 0.5, 'EXA-002': 0.5, 'EXA-003': 8, 'EXA-004': 4, 'EXA-005': 115, 'EXA-006': 4, 'EXA-007': 1, 'EXA-008': 5,
  'EXA-009': 70, 'EXA-010': 60, 'EXA-011': 1.2, 'EXA-012': 1.2, 'EXA-013': 18, 'EXA-014': 18, 'EXA-015': 78, 'EXA-016': 0.6,
  'EXA-017': 25, 'EXA-018': 0.8, 'EXA-019': 50, 'EXA-020': 600, 'EXA-021': 100, 'EXA-022': 5, 'EXA-023': 5, 'EXA-024': 14,
};

const painel = await p.evaluate(async (valores) => {
  const id = window.pacienteAtivoId();
  localStorage.setItem('holohacking.exames', JSON.stringify({ [id]: valores }));   // valor legado, como um aparelho antigo deixaria
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 300));
  return document.querySelectorAll('#ex-corpo .ex-linha, #lab-corpo, [data-lancar], .ex-atalho').length;
}, TODOS_EXAMES);
ok(painel === 0, 'nao existe mais painel para lancar valores de exame na ficha');

await p.reload({ waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
const depois = await p.evaluate(() => {
  const r = window.ultimaPontuacao();
  return { indice: r.indice, notas: r.sistemas.map(s => [s.sistema, s.nota]), triada: r.triada, exames: window.Panorama.contexto().exames };
});
ok(JSON.stringify(antes.indice) === JSON.stringify(depois.indice), 'Índice idêntico com 24 valores de exame guardados: ' + antes.indice + ' = ' + depois.indice);
ok(JSON.stringify(antes.notas) === JSON.stringify(depois.notas), 'as cinco notas de sistema continuam idênticas');
ok(JSON.stringify(antes.triada) === JSON.stringify(depois.triada), 'a Tríade continua idêntica');
ok(Object.keys(depois.exames).length === 0, 'e nenhum valor de exame chega ao contexto do motor');

/* ==================================================================== */
console.log('\n  F — NENHUMA CONCLUSÃO LABORATORIAL EM TELA NENHUMA (NEM EM ?homologacao=1)\n');
/* ==================================================================== */

const CONCLUSAO = /\b(convergente|divergente|abaixo da refer|acima da refer|dentro da refer)/i;
const telas = await p.evaluate(async () => {
  const out = {};
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 200));
  out.holoscan = document.getElementById('secao-holoscan').innerText;
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  document.querySelector('[data-aba="holoscan"]').click(); await new Promise(r => setTimeout(r, 300));
  out.abaHoloscan = document.getElementById('aba-holoscan').innerText;
  out.blocoLab = !!document.getElementById('aba-holoscan-laboratorial');
  document.querySelector('[data-aba="relatorio"]').click(); await new Promise(r => setTimeout(r, 400));
  out.relatorio = document.getElementById('relatorio')?.innerText || '';
  out.indice = document.getElementById('holo-score-total').textContent;
  return out;
});
ok(!CONCLUSAO.test(telas.holoscan) && !CONCLUSAO.test(telas.abaHoloscan) && !CONCLUSAO.test(telas.relatorio), 'HOLOSCAN, aba HOLOSCAN e relatório: nenhuma conclusão laboratorial');
ok(!telas.blocoLab && !/Leitura Integrada/.test(telas.abaHoloscan) && !/Leitura Integrada/.test(telas.relatorio), 'o bloco da Leitura Integrada saiu da aba HOLOSCAN e do relatório');
ok(telas.indice === String(depois.indice), 'o Índice na tela continua o do motor: ' + telas.indice);

const p2 = await nav.newPage();
await p2.setViewport({ width: 1500, height: 1400 });
p2.on('pageerror', e => ruim.push(e.message));
await p2.goto('http://127.0.0.1:5500/?homologacao=1', { waitUntil: 'networkidle2' });
await p2.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
const homolog = await p2.evaluate(() => ({ confronto: !!document.querySelector('.nav-item[data-secao="confronto"]') || !!document.getElementById('holo-confronto'),
  lab: !!window.Laboratorio || !!window.LeituraIntegradaMotor || !!window.LabMotor }));
await p2.close();
ok(!homolog.confronto && !homolog.lab, 'em ?homologacao=1 tambem nao ha confronto legado nem modulos de laboratorio carregados');

/* ==================================================================== */
console.log('\n  G — NENHUMA FRASE BANIDA EM NENHUMA SUPERFÍCIE\n');
/* ==================================================================== */

const PROIBIDO = [
  /resist[êe]ncia (a|à)?\s?insulina/i, /inflama[çc][ãa]o silenciosa/i, /processo inflamat[óo]rio ativo/i, /carga [áa]cida elevada/i,
  /metila[çc][ãa]o comprometida/i, /hiperalerta sustentado/i, /sobrecarga hep[áa]tica/i, /tireoide pedindo/i, /problema de tireoide/i,
];
const varrer = (nome, texto) => {
  const achados = PROIBIDO.filter(re => re.test(texto));
  ok(achados.length === 0, nome + ' livre de frases banidas' + (achados.length ? ': ' + achados.map(r => r.source).join(', ') : ''));
};
varrer('#secao-holoscan', telas.holoscan);
varrer('aba HOLOSCAN da ficha', telas.abaHoloscan);
varrer('relatório', telas.relatorio);

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
