/**
 * PDF "Playbook de Estratégias HOLOS" (PB-V2) — material da nutricionista: por sistema, por que ele aparece como área
 * prioritária (os relatos do HOLOSCAN), as ferramentas indicadas (com a página do capítulo Ferramentas), os focos e as
 * estratégias de Corpo, Mente e Espírito com tipo, nível de sustentação, quando usar, como fazer, o que observar, por que
 * pode ajudar, o que a nutricionista investiga, o que buscamos facilitar e o cuidado.
 * Duas passagens: a 1a descobre em que página cai cada ferramenta; a 2a imprime os números. As páginas também são gravadas
 * em playbook-holos.js (PAGINAS_PDF), para o sistema indicar "Playbook p. N" ao lado de cada ferramenta.
 * Uso: node scripts/gerar-pdf-playbook-estrategias.mjs [saida.pdf]   (padrao: docs/v1/PLAYBOOK-ESTRATEGIAS-HOLOS.pdf)
 */
import puppeteer from 'puppeteer-core';
import { writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SISTEMAS as SIS, ESTRATEGIAS as EXTRA, FERRAMENTAS, ENCAMINHAR } from './playbook-estrategias-conteudo.mjs';
import { REGRAS } from '../testes/proximos-passos-catalogo-v1.mjs';

await import('../resultado-direcao.js');
await import('../playbook-holos.js');
const PB = globalThis.PlaybookHolos;
const SAIDA = process.argv[2] || new URL('../docs/v1/PLAYBOOK-ESTRATEGIAS-HOLOS.pdf', import.meta.url).pathname;
const LOGO = 'data:image/png;base64,' + readFileSync(new URL('../logo-holohacking.png', import.meta.url)).toString('base64');
const DATA = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const e = (x) => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TERR = [['corpo', 'Corpo', 'o que colocar em prática'], ['mente', 'Mente', 'o que compreender nos padrões'], ['espirito', 'Espírito', 'que direção fortalecer']];
const faltam = PB.ESTRATEGIAS.filter(x => !EXTRA[x.id]).map(x => x.id);
if (faltam.length) throw new Error('sem conteúdo: ' + faltam.join(', '));

const FERR_USO = FERRAMENTAS.map(f => f.id);
const faltamF = Object.keys(PB.NOME_FERR).filter(f => f !== 'conexao_pertencimento_v1' && !FERR_USO.includes(f));
if (faltamF.length) throw new Error('ferramenta sem capítulo: ' + faltamF.join(', '));
const ferrDoSistema = (cod) => REGRAS.filter(r => r.system_id === cod && FERR_USO.includes(r.tool_id)).sort((a, b) => a.rank - b.rank);
let PAG = {};   // id da ferramenta -> página final (preenchido na 2a passagem)
const pg = (id) => PAG[id] ? 'p. ' + PAG[id] : 'p. 00';
const nomeF = (id) => (FERRAMENTAS.find(f => f.id === id) || {}).nome || PB.NOME_FERR[id];
const ROT_TIPO = { acao: 'Ação', observacao: 'Observação', reflexao: 'Reflexão' };

const cartao = (x) => {
  const [quando, porque, investiga, facilitar] = EXTRA[x.id];
  const ferr = x.ferramentas.filter(f => FERR_USO.includes(f)).map(f => `${e(PB.NOME_FERR[f])} <span class="pref">(${pg(f)})</span>`).join(', ');
  return `<div class="est"><div class="est-cab"><span class="eid">${e(x.id)}</span><b>${e(x.titulo)}</b></div>
  <div class="chips"><span class="chip tipo-${x.tipo}">${e(ROT_TIPO[x.tipo])}</span><span class="chip nivel">${e(x.nivel)} · ${e(PB.NIVEL[x.nivel])}</span>${x.requer ? `<span class="chip req">Só com ${e(PB.NOME_FERR[x.requer])}</span>` : ''}</div>
  <dl>
    <dt>Quando usar</dt><dd>${e(quando)}</dd>
    <dt>Como fazer</dt><dd>${e(x.acao)} <span class="freq">${e(x.contexto)}</span></dd>
    <dt>O que observar</dt><dd>${e(x.observar)}</dd>
    <dt>Por que pode ajudar</dt><dd>${e(porque)}</dd>
    <dt>A nutri investiga</dt><dd>${e(investiga)}</dd>
    <dt>Buscamos facilitar</dt><dd class="ganho">${e(facilitar)}</dd>
    ${ferr ? `<dt>Combina com</dt><dd class="ferr">${ferr}</dd>` : ''}
  </dl>${x.cuidado ? `<p class="cuidado"><b>Cuidado · não usar automaticamente:</b> ${e(x.cuidado)}</p>` : ''}</div>`;
};
const blocoTerr = (lista) => TERR.map(([t, nome, perg]) => {
  const l = lista.filter(x => x.territorio === t);
  return l.length ? `<h3 class="terr terr-${t}">${nome} <small>${perg}</small></h3><div class="grade">${l.map(cartao).join('')}</div>` : '';
}).join('');

const ferrIndicadas = (cod) => `<div class="indicadas"><p class="rot">Ferramentas indicadas para este sistema <small>na ordem sugerida · abra a página, leia e aplique</small></p>
  <table class="tab-ferr"><tbody>${ferrDoSistema(cod).map((r, i) => `<tr><td class="n">${i + 1}</td><td class="fn"><b>${e(nomeF(r.tool_id))}</b></td><td>${e(r.professional_reason)}</td><td class="pg">${pg(r.tool_id)}</td></tr>`).join('')}</tbody></table></div>`;

const secao = ([cod, nome], i) => {
  const s = SIS[cod];
  const focos = PB.FOCOS.filter(f => f.sistema === cod);
  return `<section class="sis">
  <div class="abre"><div><p class="eyebrow">Sistema ${i + 1} de 5</p><h2>${e(nome)}</h2></div><img src="${LOGO}" alt=""></div>
  <div class="porque"><p class="rot">Por que este sistema aparece como área prioritária</p><p>${e(s.porque)}</p>
  <p class="rot">Relatos do HOLOSCAN que ele organiza</p><ul class="relatos">${s.relatos.map(r => `<li>${e(r)}</li>`).join('')}</ul></div>
  <div class="entrega"><div><p class="rot">O que a nutricionista investiga</p><p>${e(s.investiga)}</p></div><div><p class="rot">O que buscamos facilitar</p><p>${e(s.facilitar)}</p></div></div>
  ${ferrIndicadas(cod)}
  <p class="rot">Focos possíveis para esta fase (escolha 1)</p><ol class="focos">${focos.map(f => `<li><b>${e(f.texto)}</b> — ${e(f.porque)}</li>`).join('')}</ol>
  <p class="lembra">Escolha de 2 a 4 estratégias; não é obrigatório usar Corpo, Mente e Espírito. Antes de aplicar, confira “Quando não usar automaticamente / encaminhar” (página de uso).</p>
  ${blocoTerr(PB.ESTRATEGIAS.filter(x => x.sistema === cod))}
  </section>`;
};

const SIS_POR_FERR = (id) => PB.SISTEMAS.filter(([c]) => ferrDoSistema(c).some(r => r.tool_id === id)).map(([c, n]) => `${n} (${ferrDoSistema(c).findIndex(r => r.tool_id === id) + 1}ª)`);
const capFerr = (f) => `<div class="ferra"><span class="marca-ref">FERRREF-${f.id}-FIM</span>
  <div class="ferra-cab"><h3>${e(f.nome)}</h3><span class="chip">${e(f.territorio)}</span><span class="chip nivel">cerca de ${e(f.minutos)} min</span></div>
  <dl>
    <dt>O que é</dt><dd>${e(f.oque)}</dd>
    <dt>Por que pode ajudar</dt><dd>${e(f.porque)}</dd>
    <dt>Quando usar</dt><dd>${e(f.quando)}</dd>
    <dt>Indicada em</dt><dd>${e(SIS_POR_FERR(f.id).join(' · ') || 'qualquer sistema, quando fizer sentido')}</dd>
    <dt>Como aplicar</dt><dd><ol class="como">${f.como.map(c => `<li>${e(c)}</li>`).join('')}</ol></dd>
    <dt>Leva ao Resultado</dt><dd class="ganho">${e(f.resultado)}</dd>
  </dl></div>`;

const montarHtml = () => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Playbook de Estratégias HOLOS</title><style>
@page{size:A4;margin:22mm 13mm 18mm}
*{box-sizing:border-box}
body{font-family:"Jost","Helvetica Neue",Arial,sans-serif;color:#22312a;font-size:9.2pt;line-height:1.42;margin:0;font-weight:400}
h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;color:#163a2b;font-weight:600}
b,strong{font-weight:600}
.intro h2{font-size:18pt;margin-top:0}
.passos{counter-reset:p;list-style:none;padding:0;margin:2mm 0}
.passos li{position:relative;padding:0 0 2.4mm 10mm}
.passos li::before{counter-increment:p;content:counter(p);position:absolute;left:0;top:0;width:6.4mm;height:6.4mm;border-radius:50%;background:#163a2b;color:#e9d9a8;font-weight:700;font-size:8.6pt;display:flex;align-items:center;justify-content:center}
.decisoes{display:flex;gap:1.5mm;flex-wrap:wrap;margin:1mm 0 0}
.decisoes span{background:#163a2b;color:#e9d9a8;border-radius:10mm;padding:.8mm 3mm;font-size:7.8pt;letter-spacing:.06em;font-weight:600}
.tabela-sis{width:100%;border-collapse:collapse;margin-top:2mm;font-size:8.6pt}
.tabela-sis th{background:#163a2b;color:#efe8d6;text-align:left;padding:1.6mm 2mm}
.tabela-sis td{border-bottom:1px solid #e3dac2;padding:1.6mm 2mm;vertical-align:top}
.sis,.cap{page-break-before:always}
.abre{background:linear-gradient(135deg,#10281e,#1b4433);color:#efe8d6;border-radius:3mm;padding:5mm 6mm 4mm;margin-bottom:4mm;display:flex;justify-content:space-between;align-items:center}
.abre h2{color:#e9d9a8;margin:.5mm 0 0;font-size:24pt}
.abre .eyebrow{color:#c9a959}
.abre img{width:15mm;height:15mm;opacity:.95}
.inst h2{font-size:20pt;margin-top:0}
.inst .lead{font-size:10.5pt;color:#33463c}
.trilha{display:flex;gap:1.5mm;flex-wrap:wrap;margin:3mm 0 4mm}
.trilha span{background:#f4ecd6;color:#5c4a1e;border-radius:10mm;padding:1.2mm 3.4mm;font-size:8.6pt;font-weight:500}
.trilha i{color:#c9a959;font-style:normal;align-self:center}
.col3{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin:2mm 0 4mm}
.col3>div{border:1px solid #e3d6b0;border-radius:3mm;padding:3mm;background:#fbf8f0}
.col3 h4{font-family:"Cormorant Garamond",Georgia,serif;font-size:13pt;margin:0 0 1mm;color:#163a2b}
.col3 p{margin:0;font-size:8.6pt}
.principios{columns:2;padding-left:4mm;margin:1mm 0}
.principios li{margin-bottom:1mm}
.eyebrow{font-size:8pt;letter-spacing:.16em;text-transform:uppercase;color:#9a7a2e;margin:0}
h2{font-size:21pt;margin:1mm 0 3mm}
.rot{margin:2mm 0 .8mm;font-size:7.6pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7a6224}
.rot small{text-transform:none;letter-spacing:0;font-weight:400;color:#7a8a80;font-size:7.6pt;margin-left:1.5mm}
.porque{background:#fbf8f0;border:1px solid #e3d6b0;border-radius:3mm;padding:3mm 4mm}
.porque p{margin:0 0 1.5mm}
.relatos{columns:2;margin:0;padding-left:4mm;font-size:8.6pt}.relatos li{margin-bottom:.6mm}
.entrega{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:3mm 0}
.entrega>div{border-left:3px solid #c9a959;padding:1mm 3mm}
.entrega p{margin:0}
.indicadas{border:1px solid #c9a959;border-radius:3mm;padding:2mm 3mm 2.4mm;margin:0 0 3mm;background:#fffdf7;break-inside:avoid}
.indicadas .rot{margin-top:0}
.tab-ferr{width:100%;border-collapse:collapse;font-size:8.4pt}
.tab-ferr td{border-top:1px solid #efe6cc;padding:1mm 1.6mm;vertical-align:top}
.tab-ferr tr:first-child td{border-top:0}
.tab-ferr .n{width:5mm;color:#9a7a2e;font-weight:700}
.tab-ferr .fn{width:40mm}
.tab-ferr .pg{width:13mm;text-align:right;font-weight:700;color:#163a2b;white-space:nowrap}
.focos{margin:0 0 2mm;padding-left:5mm}.focos li{margin-bottom:1mm}
.lembra{font-size:8.2pt;color:#5c4a1e;background:#f4ecd6;border-radius:2mm;padding:1.6mm 3mm;margin:2mm 0 0}
h3.terr{font-size:12.5pt;margin:5mm 0 2mm;border-bottom:1px solid #d8ccab;padding-bottom:1mm;break-after:avoid;page-break-after:avoid}
h3.terr small{font-family:"Jost",Arial,sans-serif;font-size:8.4pt;color:#7a8a80;font-weight:400;margin-left:2mm}
.grade{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.est{border:1px solid #ddd2b4;border-radius:3mm;padding:2.6mm 3mm;break-inside:avoid;background:#fff}
.est-cab{display:flex;gap:2mm;align-items:baseline;margin-bottom:1mm;font-family:"Cormorant Garamond",Georgia,serif;font-size:12pt;font-weight:600;color:#163a2b}
.eid{font-family:"Jost",Arial,sans-serif;font-size:7.4pt;font-weight:700;color:#9a7a2e;letter-spacing:.04em}
.chips{display:flex;gap:1.2mm;flex-wrap:wrap;margin:0 0 1.4mm}
.chip{font-size:6.8pt;font-weight:600;letter-spacing:.04em;border-radius:10mm;padding:.3mm 2.2mm;background:#efe6cc;color:#5c4a1e}
.chip.tipo-acao{background:#163a2b;color:#e9d9a8}.chip.tipo-observacao{background:#dfeae3;color:#1d4a37}.chip.tipo-reflexao{background:#efe1f0;color:#5a3060}
.chip.nivel{background:#f6f2e6;color:#6b7a71;font-weight:500}
.chip.req{background:#fbe9d6;color:#7a4a12}
dl{margin:0;display:grid;grid-template-columns:24mm 1fr;gap:.8mm 2mm;font-size:8.4pt}
dt{font-size:7.1pt;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#7a6224;padding-top:.3mm}
dd{margin:0}
.freq{color:#4f5f56;font-style:italic}
.ganho{color:#163a2b;font-weight:600}
.ferr{color:#4f5f56}.pref{color:#9a7a2e;font-weight:600;white-space:nowrap}
.cuidado{margin:1.6mm 0 0;font-size:7.9pt;color:#7a3b12;background:#fdf1e6;border-left:3px solid #d08a3c;padding:1.2mm 2.4mm;border-radius:0 2mm 2mm 0}
.encaminhar{border:1.5px solid #c0703a;background:#fdf6ef;border-radius:3mm;padding:2.6mm 4mm;margin:3mm 0;break-inside:avoid}
.encaminhar .rot{color:#8a3f12;margin-top:0}
.encaminhar ul{margin:0;padding-left:4.5mm;columns:2;column-gap:9mm;font-size:8.6pt}.encaminhar li{margin-bottom:.6mm}
.encaminhar p{margin:1.4mm 0 0;font-size:8.2pt}
.legenda{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin:2mm 0}
.legenda>div{border:1px solid #e3d6b0;border-radius:3mm;padding:2mm 3mm;background:#fbf8f0;font-size:8.4pt}
.legenda p{margin:.6mm 0}
.ferra{border:1px solid #ddd2b4;border-radius:3mm;padding:3mm 4mm;margin:0 0 3.4mm;break-inside:avoid;position:relative}
.ferra-cab{display:flex;gap:2mm;align-items:center;margin-bottom:1.6mm}
.ferra-cab h3{margin:0;font-size:15pt}
.ferra dl{grid-template-columns:27mm 1fr;font-size:8.7pt}
.como{margin:0;padding-left:4.5mm}.como li{margin-bottom:.5mm}
.marca-ref{position:absolute;left:1mm;top:.5mm;font-size:1pt;color:#fff}
.nota-fim{margin-top:4mm;font-size:8pt;color:#6b7a71;border-top:1px solid #d8ccab;padding-top:2mm}
</style></head><body>
<section class="inst">
<p class="eyebrow">Documento oficial · HoloHacking</p><h2>Sobre o HoloHacking</h2>
<p class="lead">O HoloHacking é a plataforma clínica da Nutrição Holística. Ela organiza o acompanhamento do paciente em <b>Corpo, Mente e Espírito</b> (a Tríade do Ser) e transforma o que foi observado no atendimento em um plano claro, que o paciente entende e consegue colocar em prática.</p>
<p class="rot">A jornada do paciente no HoloHacking</p>
<div class="trilha"><span>Mapeamento Holístico</span><i>→</i><span>HOLOSCAN</span><i>→</i><span>Ferramentas</span><i>→</i><span>Resultado HOLOS (Playbook)</span><i>→</i><span>PDF e WhatsApp</span><i>→</i><span>Retornos e Evolução</span></div>
<div class="col3">
<div><h4>HOLOSCAN</h4><p>Questionário do método que organiza os relatos do paciente em cinco sistemas: Fúngico, Ácido Inflamatório, Metabólico, Detox e Linfático e Mental Emocional Espiritual. Indica as 2 áreas prioritárias da fase.</p></div>
<div><h4>Ferramentas</h4><p><b>Corpo:</b> OQ³, Linha do Momentum, Mapa da Rotina. <b>Mente:</b> Escada dos Porquês, Mapa de Crenças, Gatilhos &amp; Respostas. <b>Espírito:</b> Mapa do Propósito, Roda Holística da Vida, Carta ao Futuro Eu. Cada uma tem a sua página no capítulo <b>Ferramentas</b>.</p></div>
<div><h4>Resultado HOLOS</h4><p>O documento do paciente: o momento, o foco desta fase, o plano de estratégias, o que observar e a próxima etapa, junto com o mapa do HOLOSCAN e as ferramentas utilizadas.</p></div>
</div>
<p class="rot">Princípios do método</p>
<ul class="principios"><li>A nutricionista decide; o sistema organiza.</li><li>Sem diagnóstico e sem prescrição: hábito, observação e rotina.</li><li>Os sistemas são eixos do método, não doenças.</li><li>Poucas mudanças por vez (2 a 4), que caibam na vida real.</li><li>O paciente participa: as palavras dele entram no plano.</li><li>Cada encontro revisa o plano: manter, ajustar, substituir, concluir ou encerrar.</li></ul>
<p class="rot">Este documento</p>
<p>O <b>Playbook de Estratégias HOLOS (${e(PB.VERSAO)})</b> é a fonte oficial do botão <b>“Montar com o Playbook”</b>, na aba Resultado HOLOS da ficha: as mesmas estratégias, com os mesmos IDs, aparecem no sistema — primeiro as do sistema prioritário e as que combinam com as ferramentas aplicadas.</p>
</section>

<section class="intro" style="page-break-before:always"><h2>Como usar este playbook</h2>
<ol class="passos">
<li><b>Aplique o HOLOSCAN</b> e veja as 2 áreas prioritárias (os sistemas com mais relatos marcados).</li>
<li><b>Abra o capítulo do sistema mais prioritário.</b> Em “Ferramentas indicadas” estão as ferramentas, na ordem sugerida, com a página de cada uma no capítulo Ferramentas: abra, leia e aplique.</li>
<li><b>Escolha 1 foco</b> para esta fase.</li>
<li><b>Escolha de 2 a 4 estratégias</b> (5 ou mais só com um motivo concreto). Não é obrigatório usar Corpo, Mente e Espírito: escolha o que faz sentido para este paciente agora. Use o “Quando usar” para ligar a estratégia aos relatos e prefira as que combinam com as ferramentas aplicadas.</li>
<li><b>Calibre pela Linha do Momentum:</b> Preservar 1–2 · Reorganizar 2–3 · Construir 3–4 · Expandir 4–5.</li>
<li><b>Leia o “Cuidado”</b> das estratégias marcadas e confira a caixa abaixo antes de aplicar.</li>
<li><b>No retorno</b>, use “O que a nutricionista investiga” para decidir cada estratégia:<div class="decisoes"><span>MANTER</span><span>AJUSTAR</span><span>SUBSTITUIR</span><span>CONCLUIR</span><span>ENCERRAR</span></div></li>
</ol>
<div class="encaminhar"><p class="rot">Quando não usar automaticamente / encaminhar</p><ul>${ENCAMINHAR.map(x => `<li>${e(x)}</li>`).join('')}</ul>
<p>Nesses casos o Playbook não substitui avaliação clínica: oriente a busca de avaliação médica ou de acompanhamento especializado e registre no atendimento.</p></div>
<div class="legenda"><div><p class="rot">Tipo da estratégia</p><p><span class="chip tipo-acao">Ação</span> o paciente faz algo concreto.</p><p><span class="chip tipo-observacao">Observação</span> o paciente acompanha e anota.</p><p><span class="chip tipo-reflexao">Reflexão</span> algo para perceber e trazer ao retorno.</p></div>
<div><p class="rot">Nível de sustentação</p>${Object.entries(PB.NIVEL).map(([k, v]) => `<p><b>${k}</b> · ${e(v)}</p>`).join('')}</div></div>
<table class="tabela-sis"><thead><tr><th>Sistema</th><th>Ferramentas indicadas (ordem sugerida · página)</th></tr></thead><tbody>
${PB.SISTEMAS.map(([c, n]) => `<tr><td><b>${e(n)}</b></td><td>${ferrDoSistema(c).map(r => `${e(nomeF(r.tool_id))} <span class="pref">${pg(r.tool_id)}</span>`).join(' · ')}</td></tr>`).join('')}
</tbody></table>
<p class="nota-fim">Os cinco sistemas são eixos do método que organizam relatos do HOLOSCAN; não são doenças nem diagnósticos. As estratégias são de hábito, observação e rotina, sem prescrição, e podem ser ajustadas pela nutricionista para a realidade de cada paciente.</p></section>

${PB.SISTEMAS.map(secao).join('')}
<section class="sis"><div class="abre"><div><p class="eyebrow">Para qualquer paciente</p><h2>Estratégias gerais</h2></div><img src="${LOGO}" alt=""></div>
<div class="porque"><p>${e(SIS.geral.porque)}</p></div>
<div class="entrega"><div><p class="rot">O que a nutricionista investiga</p><p>${e(SIS.geral.investiga)}</p></div><div><p class="rot">O que buscamos facilitar</p><p>${e(SIS.geral.facilitar)}</p></div></div>
${blocoTerr(PB.ESTRATEGIAS.filter(x => x.sistema === 'geral'))}
</section>
<section class="cap"><div class="abre"><div><p class="eyebrow">Abra, leia e aplique</p><h2>Ferramentas</h2></div><img src="${LOGO}" alt=""></div>
<p>As ferramentas não mudam o HOLOSCAN: aproximam as estratégias da vida real do paciente. Cada uma é aplicada e salva na ficha (Corpo, Mente ou Espírito) e o que ela traz aparece no passo “Leitura” do Montar com o Playbook.</p>
${FERRAMENTAS.map(capFerr).join('')}
</section>
</body></html>`;

const CAPA = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}body{margin:0;font-family:"Jost",Arial,sans-serif}
.pg{height:297mm;width:210mm;box-sizing:border-box;background:radial-gradient(ellipse at 50% 30%,#1d4a37 0%,#12301f 55%,#0c2016 100%);color:#efe8d6;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:26mm 22mm 20mm;text-align:center}
.marca img{width:46mm;height:46mm}
.marca .nome{font-family:"Cormorant Garamond",serif;font-size:30pt;color:#e9d9a8;letter-spacing:.04em;margin:3mm 0 0;font-weight:600}
.marca .tag{font-size:8.5pt;letter-spacing:.32em;text-transform:uppercase;color:#c9a959;margin:1.5mm 0 0}
.linha{width:30mm;height:1px;background:#c9a959;margin:9mm auto}
h1{font-family:"Cormorant Garamond",serif;font-size:40pt;color:#f3ead2;margin:0;line-height:1.05;font-weight:600}
.sub{font-size:13pt;color:#e7e0cc;margin:4mm 0 0;font-weight:300}
.pills{display:flex;gap:3mm;justify-content:center;margin-top:9mm}
.pills span{border:1px solid #c9a959;color:#e9d9a8;border-radius:10mm;padding:1.6mm 5mm;font-size:9pt;letter-spacing:.08em}
.rod{font-size:8.6pt;color:#cfc6ae;line-height:1.6}
.rod b{color:#e9d9a8;font-weight:500}
</style></head><body><div class="pg">
<div class="marca"><img src="${LOGO}" alt="HoloHacking"><p class="nome">HoloHacking</p><p class="tag">Plataforma clínica da Nutrição Holística</p></div>
<div><div class="linha"></div><h1>Playbook de<br>Estratégias HOLOS</h1><p class="sub">Corpo · Mente · Espírito para cada um dos cinco sistemas</p>
<div class="pills"><span>CORPO</span><span>MENTE</span><span>ESPÍRITO</span></div></div>
<div class="rod"><b>Documento oficial HoloHacking</b> · uso profissional junto com o sistema<br>${PB.ESTRATEGIAS.filter(x => x.sistema !== 'geral').length} estratégias dos sistemas · ${PB.ESTRATEGIAS.filter(x => x.sistema === 'geral').length} estratégias gerais · versão ${e(PB.VERSAO)} · ${e(DATA)}</div>
</div></body></html>`;
const CONTRA = `<!doctype html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:0}body{margin:0;font-family:"Jost",Arial,sans-serif}
.pg{height:297mm;width:210mm;box-sizing:border-box;background:#10281e;color:#cfc6ae;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 30mm}
img{width:26mm;height:26mm}.nome{font-family:"Cormorant Garamond",serif;font-size:22pt;color:#e9d9a8;margin:3mm 0 1mm;font-weight:600}
.tag{font-size:8pt;letter-spacing:.3em;text-transform:uppercase;color:#c9a959;margin:0 0 12mm}
p.txt{font-size:9pt;line-height:1.7;max-width:130mm}
</style></head><body><div class="pg"><img src="${LOGO}" alt=""><p class="nome">HoloHacking</p><p class="tag">Plataforma clínica da Nutrição Holística</p>
<p class="txt">Material de uso profissional das nutricionistas que utilizam o HoloHacking. As estratégias são de hábito, observação e rotina; não substituem avaliação clínica, não são diagnóstico nem prescrição e devem ser ajustadas à realidade de cada paciente.</p>
<p class="txt">Playbook de Estratégias HOLOS · versão ${e(PB.VERSAO)} · ${e(DATA)}</p></div></body></html>`;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const render = async (doc, opts) => { const p = await nav.newPage(); await p.setContent(doc, { waitUntil: 'load' }); await p.evaluateHandle('document.fonts.ready'); const b = await p.pdf(Object.assign({ format: 'A4', printBackground: true }, opts || {})); await p.close(); return b; };
const cab = `<div style="width:100%;margin:0 13mm;display:flex;align-items:center;justify-content:space-between;border-bottom:0.5px solid #d8ccab;padding-bottom:2mm;font-family:Jost,Arial,sans-serif">
  <div style="display:flex;align-items:center;gap:2.5mm"><img src="${LOGO}" style="width:7mm;height:7mm"><span style="font-family:'Cormorant Garamond',serif;font-size:11pt;color:#163a2b;font-weight:600">HoloHacking</span><span style="font-size:6.5pt;letter-spacing:.2em;color:#9a7a2e;text-transform:uppercase">Nutrição Holística</span></div>
  <span style="font-size:7pt;color:#7a8a80;letter-spacing:.06em">PLAYBOOK DE ESTRATÉGIAS HOLOS</span></div>`;
const rod = `<div style="width:100%;margin:0 13mm;display:flex;justify-content:space-between;font-size:6.8pt;color:#7a8a80;font-family:Jost,Arial,sans-serif"><span>Documento oficial HoloHacking · uso profissional</span><span>Versão ${e(PB.VERSAO)} · ${e(DATA)}</span></div>`;
/* 1a passagem: em que página do miolo cai cada ferramenta (marca invisível FERRREF-<id>-FIM); página final = índice + 2 (capa) */
const acharPaginas = (pdf) => {
  const tmpP = SAIDA + '.pass1.pdf'; writeFileSync(tmpP, pdf);
  const out = execFileSync('python3', ['-W', 'ignore', '-c', `
import sys, json, re, pymupdf
d = pymupdf.open(sys.argv[1]); r = {}
for i, p in enumerate(d):
    for m in re.findall(r"FERRREF-([a-z0-9_]+)-FIM", p.get_text()): r.setdefault(m, i + 2)
print(json.dumps(r))
`, tmpP]).toString();
  unlinkSync(tmpP); return JSON.parse(out);
};
const optsCorpo = { displayHeaderFooter: true, headerTemplate: cab, footerTemplate: rod };
PAG = acharPaginas(await render(montarHtml(), optsCorpo));
let corpo = await render(montarHtml(), optsCorpo);
const PAG2 = acharPaginas(corpo);
if (JSON.stringify(PAG2) !== JSON.stringify(PAG)) { PAG = PAG2; corpo = await render(montarHtml(), optsCorpo); }
const semPag = FERR_USO.filter(f => !PAG[f]);
if (semPag.length) throw new Error('sem página: ' + semPag.join(', '));
const capa = await render(CAPA), contra = await render(CONTRA);
await nav.close();
const tmp = SAIDA + '.partes';
writeFileSync(tmp + '-capa.pdf', capa); writeFileSync(tmp + '-corpo.pdf', corpo); writeFileSync(tmp + '-contra.pdf', contra);
/* junta capa + miolo + contracapa e numera as paginas do miolo (python + PyMuPDF) */
execFileSync('python3', ['-W', 'ignore', '-c', `
import sys, pymupdf
saida, a, b, c = sys.argv[1:5]
out = pymupdf.open()
for f in (a, b, c): out.insert_pdf(pymupdf.open(f))
n = out.page_count
for i in range(1, n - 1):
    pg = out[i]; r = pg.rect
    pg.insert_text((r.width / 2 - 8, r.height - 22), f"{i + 1} / {n}", fontsize=7, color=(0.48, 0.54, 0.5))
out.save(saida, deflate=True)
print(n)
`, SAIDA, tmp + '-capa.pdf', tmp + '-corpo.pdf', tmp + '-contra.pdf'], { stdio: 'inherit' });
for (const f of ['-capa.pdf', '-corpo.pdf', '-contra.pdf']) unlinkSync(tmp + f);
/* grava as páginas no sistema (só no PDF oficial) */
if (!process.argv[2]) {
  const arq = new URL('../playbook-holos.js', import.meta.url).pathname;
  const src = readFileSync(arq, 'utf8');
  const bloco = '/* paginas-pdf:inicio (gerado por scripts/gerar-pdf-playbook-estrategias.mjs) */ var PAGINAS_PDF = ' + JSON.stringify(Object.fromEntries(FERR_USO.map(f => [f, PAG[f]]))) + '; /* paginas-pdf:fim */';
  const novo = src.replace(/\/\* paginas-pdf:inicio[\s\S]*?\/\* paginas-pdf:fim \*\//, bloco);
  if (novo === src && !src.includes(bloco)) throw new Error('marcador paginas-pdf não encontrado em playbook-holos.js');
  if (novo !== src) { writeFileSync(arq, novo); console.log('playbook-holos.js: PAGINAS_PDF atualizado'); }
}
console.log('PDF: ' + SAIDA + ' · páginas das ferramentas: ' + JSON.stringify(PAG));
