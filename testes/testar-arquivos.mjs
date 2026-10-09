/**
 * Documentos e relatorio dentro do app (decisao de produto 09/10: exame e
 * documento sao so arquivos do prontuario; nada de valor, confronto ou
 * Leitura Integrada).
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1200 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

// --- a secao existe e abre -------------------------------------------------
const base = await p.evaluate(() => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  document.querySelector('[data-aba="documentos"]').click();
  return {
    visivel: !document.getElementById('ficha-arquivos').classList.contains('hidden'),
    abas: [...document.querySelectorAll('#ficha-arquivos .aba')].map(b => b.textContent.trim()),
    painelExames: document.querySelectorAll('#ex-corpo, #lab-corpo, .ex-linha, [data-lancar]').length,
    cartoes: [...document.querySelectorAll('#aba-documentos .arq-titulo')].map(h => h.textContent),
    texto: document.getElementById('aba-documentos').innerText,
  };
});
ok(base.visivel, 'a secao Arquivos abre');
ok(base.abas.join(',') === 'Visão geral,Atendimentos,Anamnese,HOLOSCAN,Ferramentas,Resultado HOLOS,Documentos,Conduta,Evolução,Relatório,HOLOS AI',
   'as abas (Anamnese e Conduta na Etapa 2; Resultado HOLOS em 09/10, entre Ferramentas e Conduta): ' + base.abas.join(' · '));
ok(base.cartoes.join(' / ') === 'Adicionar arquivo / Documentos e exames', 'a aba e a biblioteca do prontuario: ' + base.cartoes.join(' · '));
ok(base.painelExames === 0, 'nenhum painel de valores de exame (nem V1 nem legado)');
ok(/não lê nem interpreta/.test(base.texto) && !/Leitura Integrada|Lançar valores|Painel legado/.test(base.texto), 'a tela diz que o sistema nao le nem interpreta os arquivos');

// --- aplica o questionario (modo local) ------------------------------------
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

// --- documentos ------------------------------------------------------------
const doc = await p.evaluate(() => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  document.querySelector('[data-aba="documentos"]').click();
  const t = document.getElementById('aba-documentos').textContent;
  return {
    solta: !!document.getElementById('doc-solta'),
    aceita: document.getElementById('doc-arquivo')?.getAttribute('accept') || '',
    avisaOnde: /neste navegador/i.test(t),
    campos: ['doc-tipo', 'doc-titulo', 'doc-data', 'doc-observacao'].every(id => !!document.getElementById(id)),
  };
});
ok(doc.solta, 'a area de arrastar arquivo existe');
ok(/pdf/.test(doc.aceita) && /jpg|jpeg/.test(doc.aceita), 'aceita PDF e foto: ' + doc.aceita);
ok(doc.avisaOnde, 'a tela diz onde o arquivo fica guardado');
ok(doc.campos, 'tipo, titulo, data e observacao estao no formulario');

// --- relatorio -------------------------------------------------------------
const rel = await p.evaluate(() => {
  document.querySelector('[data-aba="relatorio"]').click();
  const r = document.getElementById('relatorio');
  return {
    existe: !!r,
    indice: r?.querySelector('.rel-indice b')?.textContent,
    sistemas: r?.querySelectorAll('.rel-sistema').length,
    primeiro: r?.querySelector('.rel-sistema b')?.textContent,
    combinada: r?.querySelector('.rel-combinada')?.textContent.trim(),
    temTriada: !!r?.querySelector('.rel-triada'),
    semLI: !/Leitura Integrada|Convergente|Divergente/.test(r?.textContent || ''),
    partes: [...r?.querySelectorAll('.rel-parte') || []].map(s => s.dataset.origem),
    titulos: [...r?.querySelectorAll('.rel-parte h3') || []].map(h => h.textContent),
  };
});
ok(rel.existe, 'o relatorio e montado');
ok(rel.indice === '43', 'indice no relatorio: ' + rel.indice);
ok(rel.sistemas === 5, rel.sistemas + ' sistemas, do pior para o melhor');
const maisBaixo = await p.evaluate((respostas) =>
  [...HOLOSCAN.calcular(respostas).sistemas].sort((a, b) => a.nota - b.nota)[0].nome,
  caso.respostas);
ok(rel.primeiro === maisBaixo, 'comeca pelo mais baixo: ' + rel.primeiro);
ok(rel.temTriada && rel.semLI, 'traz Triada e nao traz Leitura Integrada nem conclusao laboratorial');
ok(!rel.combinada, 'nao traz leitura combinada: ' + rel.combinada);
ok(rel.partes.join(',') === 'automatico,automatico,automatico,profissional',
   'relatorio separa A/B/C automatico de D profissional: ' + rel.titulos.join(' | '));

/* Os cinco sistemas mostram a mesma linha neutra nos dois registros; a
   interpretacao profissional continua mudando por registro. */
const dois = await p.evaluate(() => {
  const antes = document.querySelector('.rel-sistema p').textContent;
  const eraTextarea = !!document.getElementById('rel-interpretacao');
  document.querySelector('[data-registro="paciente"]').click();
  return {
    antes: antes.slice(0, 50),
    depois: document.querySelector('.rel-sistema p').textContent.slice(0, 50),
    eraTextarea,
    viraSoLeitura: !document.getElementById('rel-interpretacao'),
  };
});
ok(dois.antes === dois.depois, 'os cinco sistemas mostram o mesmo texto objetivo nos dois registros: "' + dois.antes + '"');
ok(dois.eraTextarea && dois.viraSoLeitura, 'mas a interpretação continua mudando por registro: "nutri" edita, "paciente" só lê');

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
