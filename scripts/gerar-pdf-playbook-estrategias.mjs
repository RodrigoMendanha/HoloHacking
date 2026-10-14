/**
 * PDF "Playbook de Estratégias HOLOS" — material da nutricionista: por sistema, por que ele aparece como área prioritária
 * (os relatos do HOLOSCAN), o que entregar, os focos possíveis e as estratégias de Corpo, Mente e Espírito com quando usar,
 * como fazer, o que observar, a base, o que a nutricionista avalia e o que o paciente ganha.
 * Uso: node scripts/gerar-pdf-playbook-estrategias.mjs [saida.pdf]   (padrao: docs/v1/PLAYBOOK-ESTRATEGIAS-HOLOS.pdf)
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
import { SISTEMAS as SIS, ESTRATEGIAS as EXTRA } from './playbook-estrategias-conteudo.mjs';

await import('../resultado-direcao.js');
await import('../playbook-holos.js');
const PB = globalThis.PlaybookHolos;
const SAIDA = process.argv[2] || new URL('../docs/v1/PLAYBOOK-ESTRATEGIAS-HOLOS.pdf', import.meta.url).pathname;
const e = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TERR = [['corpo', 'Corpo', 'o que colocar em prática'], ['mente', 'Mente', 'o que compreender nos padrões'], ['espirito', 'Espírito', 'que direção fortalecer']];
const faltam = PB.ESTRATEGIAS.filter(x => !EXTRA[x.id]).map(x => x.id);
if (faltam.length) throw new Error('sem conteúdo: ' + faltam.join(', '));

const cartao = (x) => {
  const [quando, base, nutri, paciente] = EXTRA[x.id];
  const ferr = x.ferramentas.map(f => PB.NOME_FERR[f]).join(', ');
  return `<div class="est"><div class="est-cab"><span class="eid">${e(x.id)}</span><b>${e(x.titulo)}</b></div>
  <dl>
    <dt>Quando usar</dt><dd>${e(quando)}</dd>
    <dt>Como fazer</dt><dd>${e(x.acao)} <span class="freq">${e(x.contexto)}</span></dd>
    <dt>O que observar</dt><dd>${e(x.observar)}</dd>
    <dt>Por que funciona</dt><dd>${e(base)}</dd>
    <dt>Nutricionista avalia</dt><dd>${e(nutri)}</dd>
    <dt>Paciente ganha</dt><dd class="ganho">${e(paciente)}</dd>
    ${ferr ? `<dt>Combina com</dt><dd class="ferr">${e(ferr)}</dd>` : ''}
  </dl></div>`;
};
const blocoTerr = (lista) => TERR.map(([t, nome, perg]) => {
  const l = lista.filter(x => x.territorio === t);
  return l.length ? `<h3 class="terr terr-${t}">${nome} <small>${perg}</small></h3><div class="grade">${l.map(cartao).join('')}</div>` : '';
}).join('');

const secao = ([cod, nome], i) => {
  const s = SIS[cod];
  const focos = PB.FOCOS.filter(f => f.sistema === cod);
  return `<section class="sis">
  <p class="eyebrow">Sistema ${i + 1} de 5</p><h2>${e(nome)}</h2>
  <div class="porque"><p class="rot">Por que este sistema aparece como área prioritária</p><p>${e(s.porque)}</p>
  <p class="rot">Relatos do HOLOSCAN que ele organiza</p><ul class="relatos">${s.relatos.map(r => `<li>${e(r)}</li>`).join('')}</ul></div>
  <div class="entrega"><div><p class="rot">O que a nutricionista entrega</p><p>${e(s.nutri)}</p></div><div><p class="rot">O que o paciente recebe</p><p>${e(s.paciente)}</p></div></div>
  <p class="rot">Focos possíveis para esta fase (escolha 1)</p><ol class="focos">${focos.map(f => `<li><b>${e(f.texto)}</b> — ${e(f.porque)}</li>`).join('')}</ol>
  ${blocoTerr(PB.ESTRATEGIAS.filter(x => x.sistema === cod))}
  </section>`;
};

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Playbook de Estratégias HOLOS</title><style>
@page{size:A4;margin:15mm 13mm 17mm}
@page :first{margin:0}
*{box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;color:#22312a;font-size:9.2pt;line-height:1.4;margin:0}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif;color:#163a2b;font-weight:600}
.capa{height:296mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always;background:linear-gradient(160deg,#10281e 0%,#173b2c 100%);color:#efe8d6;padding:0 24mm}
.capa h1{color:#e9d9a8;font-size:32pt;margin:0 0 4mm;line-height:1.1}
.capa .sub{font-size:13pt;color:#e7e0cc;margin:0 0 12mm}
.capa .nota{font-size:10pt;color:#cfc6ae;max-width:150mm}
.capa .ver{font-size:9pt;letter-spacing:.14em;text-transform:uppercase;color:#c9a959;margin:0 0 4mm}
.intro{page-break-after:always}
.intro h2{font-size:18pt}
.passos{counter-reset:p;list-style:none;padding:0}
.passos li{position:relative;padding:0 0 3mm 11mm}
.passos li::before{counter-increment:p;content:counter(p);position:absolute;left:0;top:0;width:7mm;height:7mm;border-radius:50%;background:#163a2b;color:#e9d9a8;font-weight:700;font-size:9pt;display:flex;align-items:center;justify-content:center}
.tabela-sis{width:100%;border-collapse:collapse;margin-top:3mm;font-size:8.8pt}
.tabela-sis th{background:#163a2b;color:#efe8d6;text-align:left;padding:1.8mm 2mm}
.tabela-sis td{border-bottom:1px solid #e3dac2;padding:1.8mm 2mm;vertical-align:top}
.sis{page-break-before:always}
.eyebrow{font-size:8pt;letter-spacing:.16em;text-transform:uppercase;color:#9a7a2e;margin:0}
h2{font-size:21pt;margin:1mm 0 3mm}
.rot{margin:2mm 0 .8mm;font-size:7.6pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7a6224}
.porque{background:#fbf8f0;border:1px solid #e3d6b0;border-radius:3mm;padding:3mm 4mm}
.porque p{margin:0 0 1.5mm}
.relatos{columns:2;margin:0;padding-left:4mm;font-size:8.6pt}.relatos li{margin-bottom:.6mm}
.entrega{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:3mm 0}
.entrega>div{border-left:3px solid #c9a959;padding:1mm 3mm}
.entrega p{margin:0}
.focos{margin:0 0 2mm;padding-left:5mm}.focos li{margin-bottom:1mm}
h3.terr{font-size:12.5pt;margin:5mm 0 2mm;border-bottom:1px solid #d8ccab;padding-bottom:1mm;break-after:avoid;page-break-after:avoid}
h3.terr small{font-family:"Helvetica Neue",Arial,sans-serif;font-size:8.4pt;color:#7a8a80;font-weight:400;margin-left:2mm}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.est{border:1px solid #ddd2b4;border-radius:3mm;padding:2.6mm 3mm;break-inside:avoid;background:#fff}
.est-cab{display:flex;gap:2mm;align-items:baseline;margin-bottom:1.2mm;font-family:Georgia,serif;font-size:10.5pt;color:#163a2b}
.eid{font-family:"Helvetica Neue",Arial,sans-serif;font-size:7.4pt;font-weight:700;color:#9a7a2e;letter-spacing:.04em}
dl{margin:0;display:grid;grid-template-columns:24mm 1fr;gap:.8mm 2mm;font-size:8.4pt}
dt{font-size:7.2pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#7a6224;padding-top:.3mm}
dd{margin:0}
.freq{color:#4f5f56;font-style:italic}
.ganho{color:#163a2b;font-weight:600}
.ferr{color:#4f5f56}
.nota-fim{margin-top:5mm;font-size:8pt;color:#6b7a71;border-top:1px solid #d8ccab;padding-top:2mm}
</style></head><body>
<section class="capa"><p class="ver">HoloHacking · Nutrição Holística</p><h1>Playbook de Estratégias HOLOS</h1>
<p class="sub">Corpo · Mente · Espírito para cada um dos cinco sistemas</p>
<p class="nota">Material da nutricionista para transformar o resultado do HOLOSCAN e das ferramentas em estratégias práticas para o paciente: o que fazer, quando, o que observar e o que esperar.<br><br>${PB.ESTRATEGIAS.filter(x => x.sistema !== 'geral').length} estratégias dos sistemas (12 por sistema) · ${PB.ESTRATEGIAS.filter(x => x.sistema === 'geral').length} estratégias gerais · versão ${e(PB.VERSAO)}</p></section>

<section class="intro"><h2>Como usar este playbook</h2>
<ol class="passos">
<li><b>No atendimento</b>, aplique o HOLOSCAN e as ferramentas com o paciente.</li>
<li><b>Olhe as 2 áreas prioritárias</b> do HOLOSCAN: são os sistemas com mais relatos marcados. Cada capítulo deste playbook explica por que o sistema aparece e quais relatos ele organiza.</li>
<li><b>Escolha 1 foco</b> do sistema prioritário para esta fase.</li>
<li><b>Escolha de 3 a 6 estratégias</b>, de preferência combinando Corpo, Mente e Espírito. Use o campo <b>“Quando usar”</b>: ele liga cada estratégia aos relatos do HOLOSCAN. Prefira as que <b>combinam com as ferramentas</b> aplicadas.</li>
<li><b>Quantidade conforme a Linha do Momentum:</b> Preservar 2–3 · Reorganizar 3–4 · Construir 4–5 · Expandir 5–6.</li>
<li><b>No retorno</b>, use o campo <b>“Nutricionista avalia”</b> para decidir: manter, ajustar, substituir ou concluir cada estratégia.</li>
</ol>
<table class="tabela-sis"><thead><tr><th>Sistema</th><th>Quando aparece como prioritário, o paciente relatou mais…</th></tr></thead><tbody>
${PB.SISTEMAS.map(([c, n]) => `<tr><td><b>${e(n)}</b></td><td>${e(SIS[c].relatos.slice(0, 4).join('; '))}…</td></tr>`).join('')}
</tbody></table>
<p class="nota-fim">Os cinco sistemas são eixos do método que organizam relatos do HOLOSCAN; não são doenças nem diagnósticos. As estratégias são de hábito, observação e rotina, sem prescrição, e podem ser ajustadas pela nutricionista para a realidade de cada paciente.</p></section>

${PB.SISTEMAS.map(secao).join('')}
<section class="sis"><p class="eyebrow">Para qualquer paciente</p><h2>Estratégias gerais</h2>
<div class="porque"><p>${e(SIS.geral.porque)}</p></div>
<div class="entrega"><div><p class="rot">O que a nutricionista entrega</p><p>${e(SIS.geral.nutri)}</p></div><div><p class="rot">O que o paciente recebe</p><p>${e(SIS.geral.paciente)}</p></div></div>
${blocoTerr(PB.ESTRATEGIAS.filter(x => x.sistema === 'geral'))}
</section>
</body></html>`;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await nav.newPage();
await p.setContent(html, { waitUntil: 'load' });
const pdf = await p.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:7pt;color:#7a8a80;width:100%;text-align:center;font-family:Arial">Playbook de Estratégias HOLOS · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>' });
writeFileSync(SAIDA, pdf);
await nav.close();
console.log('PDF: ' + SAIDA + ' (' + Math.round(pdf.length / 1024) + ' KB)');
