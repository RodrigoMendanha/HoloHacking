/**
 * PDF do Playbook HOLOS (PB-V1): focos e estrategias de cada um dos cinco sistemas + as gerais.
 * Gerado direto de playbook-holos.js (o mesmo conteudo do sistema: o PDF nunca fica diferente do app).
 * Uso: node scripts/gerar-pdf-playbook.mjs [saida.pdf]   (padrao: docs/v1/PLAYBOOK-HOLOS-PB-V1.pdf)
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

await import('../resultado-direcao.js');
await import('../playbook-holos.js');
const PB = globalThis.PlaybookHolos, RD = globalThis.ResultadoDirecao;
const SAIDA = process.argv[2] || new URL('../docs/v1/PLAYBOOK-HOLOS-PB-V1.pdf', import.meta.url).pathname;
const e = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const EIXOS = RD.CUIDADO_EIXOS;
const TERR = [['corpo', 'Corpo', 'O que vamos colocar em prática'], ['mente', 'Mente', 'O que queremos compreender nos padrões'], ['espirito', 'Espírito', 'Que direção queremos fortalecer']];
const ferr = (l) => l.length ? l.map(f => PB.NOME_FERR[f]).join(', ') : '—';

const tabela = (lista) => TERR.map(([t, nome, perg]) => {
  const l = lista.filter(x => x.territorio === t);
  if (!l.length) return '';
  return `<h4 class="terr terr-${t}">${nome} <small>${perg}</small></h4>
  <table><thead><tr><th class="c-id">ID</th><th class="c-est">Estratégia — o que fazer</th><th>Quando / frequência</th><th>O que observar</th><th class="c-f">Combina com</th></tr></thead><tbody>
  ${l.map(x => `<tr><td class="c-id">${e(x.id)}</td><td><b>${e(x.titulo)}</b><br>${e(x.acao)}</td><td>${e(x.contexto)}</td><td>${e(x.observar)}</td><td class="c-f">${e(ferr(x.ferramentas))}</td></tr>`).join('')}
  </tbody></table>`;
}).join('');

const sistema = ([cod, nome], i) => {
  const eixo = EIXOS[cod] || {};
  const focos = PB.FOCOS.filter(f => f.sistema === cod);
  const est = PB.ESTRATEGIAS.filter(x => x.sistema === cod);
  return `<section class="sis">
  <p class="eyebrow">Sistema ${i + 1} de 5</p><h2>${e(nome)}</h2>
  <p class="eixo">${e(eixo.cuidar || '')}</p><p class="limite">${e(eixo.limite || '')}</p>
  <h3>Focos desta fase <small>a nutricionista escolhe 1</small></h3>
  <div class="focos">${focos.map(f => `<div class="foco"><p class="fid">${e(f.id)}</p><p class="ftit">${e(f.texto)}</p><p class="fpq">${e(f.porque)}</p>
    <p class="rot">O que vamos trabalhar</p><ul>${f.direcionamentos.map(d => `<li><b>${e(d.titulo)}</b> <span class="tag">${e(PB.NOME_TERR[d.territorio])}</span><br>${e(d.objetivo)}</li>`).join('')}</ul>
    <p class="rot">Até o próximo encontro, observe</p><ul>${f.observar.map(o => `<li>${e(o)}</li>`).join('')}</ul>
    <p class="rot">Próxima etapa</p><p>${e(f.proxima_etapa)}</p></div>`).join('')}</div>
  <h3>Estratégias <small>4 de Corpo · 4 de Mente · 4 de Espírito</small></h3>
  ${tabela(est)}
  </section>`;
};

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Playbook HOLOS PB-V1</title><style>
@page{size:A4;margin:16mm 14mm 18mm}
@page :first{margin:0}
*{box-sizing:border-box}
body{font-family:"Helvetica Neue",Arial,sans-serif;color:#22312a;font-size:9.6pt;line-height:1.42;margin:0}
h1,h2,h3{font-family:Georgia,"Times New Roman",serif;color:#163a2b;font-weight:600}
.capa{height:296mm;display:flex;flex-direction:column;justify-content:center;page-break-after:always;background:linear-gradient(160deg,#10281e 0%,#173b2c 100%);color:#efe8d6;margin:0;padding:0 24mm}
.capa h1{color:#e9d9a8;font-size:34pt;margin:0 0 4mm}
.capa .sub{font-size:13pt;color:#e7e0cc;margin:0 0 14mm}
.capa .nota{font-size:10pt;color:#cfc6ae;max-width:150mm}
.capa .ver{margin-top:20mm;font-size:9pt;letter-spacing:.14em;text-transform:uppercase;color:#c9a959}
.como{page-break-after:always}
.como h2{font-size:18pt}
.como ol li{margin-bottom:2.2mm}
.sis{page-break-before:always}
.eyebrow{font-size:8pt;letter-spacing:.16em;text-transform:uppercase;color:#9a7a2e;margin:0}
h2{font-size:21pt;margin:1mm 0 2mm}
h3{font-size:13pt;margin:6mm 0 2.5mm;border-bottom:1px solid #d8ccab;padding-bottom:1mm}
h3 small{font-family:"Helvetica Neue",Arial,sans-serif;font-size:8.5pt;color:#7a8a80;font-weight:400;margin-left:2mm}
.eixo{margin:0 0 1mm}
.limite{margin:0;font-size:8.6pt;color:#6b7a71;font-style:italic}
.focos{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
.foco{border:1px solid #d8ccab;border-radius:3mm;padding:3mm;background:#fbf8f0;break-inside:avoid}
.fid{margin:0;font-size:7.5pt;color:#9a7a2e;font-weight:700;letter-spacing:.06em}
.ftit{margin:.5mm 0 1mm;font-family:Georgia,serif;font-size:10.5pt;color:#163a2b;font-weight:600;line-height:1.25}
.fpq{margin:0 0 1.5mm;color:#4f5f56;font-size:8.6pt}
.foco ul{margin:0 0 1.5mm;padding-left:4mm}.foco li{margin-bottom:.8mm;font-size:8.6pt}
.foco p{font-size:8.6pt}
.rot{margin:1.5mm 0 .5mm;font-size:7.4pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7a6224}
.tag{font-size:7pt;background:#efe6cc;color:#6a5420;border-radius:2mm;padding:0 1.2mm}
h4.terr{font-family:Georgia,serif;font-size:11pt;color:#163a2b;margin:4mm 0 1.5mm;break-after:avoid;page-break-after:avoid}
h4.terr small{font-family:"Helvetica Neue",Arial,sans-serif;font-size:8pt;color:#7a8a80;font-weight:400;margin-left:1.5mm}
table{width:100%;border-collapse:collapse;font-size:8.4pt;break-inside:auto}
th{background:#163a2b;color:#efe8d6;text-align:left;font-weight:600;padding:1.6mm 2mm;font-size:7.8pt}
td{border-bottom:1px solid #e3dac2;padding:1.6mm 2mm;vertical-align:top}
tr{break-inside:avoid}
.c-id{width:13mm;color:#9a7a2e;font-weight:700;white-space:nowrap}
.c-est{width:62mm}.c-f{width:30mm}td.c-f{color:#4f5f56}
.rodape{margin-top:6mm;font-size:8pt;color:#6b7a71;border-top:1px solid #d8ccab;padding-top:2mm}
</style></head><body>
<section class="capa"><p class="ver">HoloHacking · Nutrição Holística</p><h1>Playbook HOLOS</h1><p class="sub">Focos e estratégias de cada um dos cinco sistemas</p>
<p class="nota">Versão ${e(PB.VERSAO)} · ${PB.FOCOS.length} focos · ${PB.ESTRATEGIAS.filter(x => x.sistema !== 'geral').length / 5} estratégias por sistema (${PB.ESTRATEGIAS.filter(x => x.sistema !== 'geral').length} no total) · ${PB.ESTRATEGIAS.filter(x => x.sistema === 'geral').length} estratégias gerais.<br>Material da nutricionista. Sem diagnóstico, sem prescrição: hábitos, observação e rotina.</p></section>
<section class="como"><h2>Como usar no sistema</h2>
<ol>
<li><b>Aplique o HOLOSCAN e salve.</b> Ele define as 2 áreas prioritárias ("Por onde investigar").</li>
<li><b>Aplique as ferramentas</b> indicadas nos Próximos Passos. Elas não mudam o HOLOSCAN: aproximam as estratégias da vida real do paciente.</li>
<li>Na ficha, aba <b>Resultado HOLOS</b>, clique em <b>Montar com o Playbook</b>.</li>
<li><b>Passo 1 — Leitura:</b> confira as áreas, as ferramentas e marque o que o paciente contou (Mapeamento) e o que apareceu nas ferramentas.</li>
<li><b>Passo 2 — Foco:</b> escolha 1 dos 3 focos de cada área prioritária (ou escreva outro). Ele traz os direcionamentos, o "observe" e a próxima etapa.</li>
<li><b>Passo 3 — Estratégias:</b> marque de 1 a 6. Primeiro aparecem as do sistema do foco e, entre elas, as que <b>combinam com as ferramentas aplicadas</b>. A Linha do Momentum orienta a quantidade: Preservar 2–3 · Reorganizar 3–4 · Construir 4–5 · Expandir 5–6.</li>
<li><b>Passo 4 — Prévia e Gerar Resultado.</b> O PDF e o WhatsApp saem do Resultado, como sempre.</li>
<li><b>No retorno:</b> para cada estratégia anterior, registre se conseguiu aplicar e a decisão (manter, ajustar, substituir, concluir). Manter e ajustar levam a estratégia para o novo plano.</li>
</ol>
<p class="rodape">Os sistemas são eixos autorais que organizam relatos do HOLOSCAN; não são doenças. Toda estratégia pode ser ajustada pela nutricionista antes de gerar o Resultado. Cada item gerado guarda o ID deste playbook (por exemplo, ME-C1).</p></section>
${PB.SISTEMAS.map(sistema).join('')}
<section class="sis"><p class="eyebrow">Para qualquer paciente</p><h2>Estratégias gerais</h2>
<p class="eixo">Ficam recolhidas no assistente ("Ver estratégias gerais") e servem para qualquer foco.</p>
${tabela(PB.ESTRATEGIAS.filter(x => x.sistema === 'geral'))}
<p class="rodape">Playbook HOLOS ${e(PB.VERSAO)} · gerado a partir do conteúdo do sistema (playbook-holos.js). Sem diagnóstico, sem prescrição.</p></section>
</body></html>`;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await nav.newPage();
await p.setContent(html, { waitUntil: 'load' });
const pdf = await p.pdf({ format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:7pt;color:#7a8a80;width:100%;text-align:center;font-family:Arial">Playbook HOLOS ' + PB.VERSAO + ' · página <span class="pageNumber"></span> de <span class="totalPages"></span></div>' });
writeFileSync(SAIDA, pdf);
await nav.close();
console.log('PDF: ' + SAIDA + ' (' + Math.round(pdf.length / 1024) + ' KB)');
