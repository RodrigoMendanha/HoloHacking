/**
 * APRESENTACAO COMERCIAL HOLOHACKING — PDF 16:9 (13 paginas) para a venda a nutricionistas autonomas.
 * Telas REAIS do sistema com paciente e nutricionista FICTICIAS (Marina Alves / Ana Ribeiro, Supabase falso).
 *   1. node scripts/video-holohacking-comercial/capturar.mjs     (telas gerais)
 *   2. node scripts/apresentacao-comercial/capturar.mjs          (HOLOSCAN e Playbook)
 *   3. node scripts/apresentacao-comercial/gerar-pdf.mjs [saida.pdf]   (padrao: docs/comercial/APRESENTACAO-HOLOHACKING.pdf)
 * Sem preco, sem depoimentos e sem numeros inventados. Contato da ultima pagina: preencher em CONTATO (abaixo).
 */
import puppeteer from 'puppeteer-core';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const R = new URL('../../', import.meta.url).pathname;
const SAIDA = process.argv[2] || R + 'docs/comercial/APRESENTACAO-HOLOHACKING.pdf';
mkdirSync(SAIDA.replace(/\/[^/]+$/, ''), { recursive: true });
const CONTATO = null;   // ex.: { whatsapp: '...', instagram: '...', site: '...' } — enquanto null, a pagina mostra o espaco reservado
const V = R + 'scripts/video-holohacking-comercial/telas/', A = R + 'scripts/apresentacao-comercial/telas/', REC = A + 'recortes/';
mkdirSync(REC, { recursive: true });

/* recortes (px das capturas 2x) -> JPEG */
const CORTES = {
  dashboard: [V + 'a01-dashboard.png', null],
  ficha: [V + 'a02-ficha-visao.png', null],
  mapeamento: [V + 'a03-mapeamento.png', null],
  corpo: [V + 'a04-secao-corpo.png', [600, 660, 2880, 1040]],
  questionario: [V + 'a06-holoscan-questionario.png', null],
  holoscan: [A + 'holoscan-resultado.png', [0, 0, 1836, 1060]],
  foco: [A + 'playbook-2-foco.png', null],
  estrategias: [A + 'playbook-3-estrategias.png', [0, 0, 1808, 2060]],
  docTopo: [V + 'p1-paciente-documento.png', [0, 0, 2000, 1610]],
  docPlano: [V + 'p1-paciente-documento.png', [0, 1840, 2000, 2330]],
  docMapa: [V + 'p1-paciente-documento.png', [0, 3570, 2000, 4490]],
  retorno: [V + 'r1-paciente-documento.png', [0, 0, 2000, 1830]]
};
for (const [n, [f]] of Object.entries(CORTES)) if (!existsSync(f)) throw new Error('falta a captura ' + f + ' — rode os capturadores (ver cabecalho)');
execFileSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
c = json.loads(sys.argv[1]); out = sys.argv[2]
for n, (f, box) in c.items():
    im = Image.open(f).convert('RGB')
    if box: im = im.crop(tuple(box))
    im.save(out + n + '.jpg', quality=88, optimize=True)
`, JSON.stringify(CORTES), REC]);
const img = (n) => 'data:image/jpeg;base64,' + readFileSync(REC + n + '.jpg').toString('base64');
const LOGO = 'data:image/png;base64,' + readFileSync(R + 'logo-holohacking.png').toString('base64');

const marca = `<div class="marca"><img src="${LOGO}" alt=""><span>HoloHacking</span></div>`;
const rod = (n) => `<div class="rod"><span>HoloHacking · Nutrição Holística</span><span>${String(n).padStart(2, '0')} / 13</span></div>`;
const tela = (n, cls = '') => `<div class="tela ${cls}"><div class="tela-barra"><i></i><i></i><i></i></div><img src="${img(n)}" alt=""></div>`;
const S = [];
const slide = (cls, corpo) => S.push(`<section class="s ${cls}">${corpo}${rod(S.length + 1)}</section>`);

/* 1 — capa */
S.push(`<section class="s capa"><div class="capa-txt"><img class="capa-logo" src="${LOGO}" alt=""><p class="sobre">Plataforma clínica da Nutrição Holística</p>
<h1>Seu atendimento<br>vai muito além de<br><em>coletar informações.</em></h1>
<p class="capa-sub">HoloHacking organiza Corpo, Mente e Espírito e transforma a sua consulta num plano claro, que o paciente entende e consegue viver.</p>
<div class="pills"><span>Corpo</span><span>Mente</span><span>Espírito</span></div></div>
<div class="capa-img">${tela('dashboard')}</div></section>`);

/* 2 — dor */
slide('claro', `${marca}<p class="eyebrow">A rotina de quem atende</p><h2>Você sabe muito sobre o seu paciente.<br><em>Mas e depois da consulta?</em></h2>
<div class="dores">
<div><b>01</b><h3>Informação espalhada</h3><p>Anotações, conversas e respostas soltas, difíceis de juntar numa leitura só.</p></div>
<div><b>02</b><h3>Plano que se perde</h3><p>O paciente sai motivado e, poucos dias depois, já não lembra o que combinou.</p></div>
<div><b>03</b><h3>Retorno sem fio condutor</h3><p>Cada consulta recomeça do zero, sem enxergar o que funcionou e o que precisa mudar.</p></div>
<div><b>04</b><h3>Valor pouco visível</h3><p>Todo o cuidado da sua escuta não vira um material que o paciente leve para casa.</p></div>
</div>`);

/* 3 — a virada */
slide('escuro centro', `${marca}<p class="eyebrow">A virada</p><h2 class="grande">Não basta descobrir.<br><em>É preciso saber o que fazer<br>com o que você descobriu.</em></h2>
<p class="lead-c">O HoloHacking leva você do relato do paciente a uma direção clara, com método, estrutura e continuidade.</p>`);

/* 4 — jornada */
const J = [['Mapeamento', 'O paciente responde antes da consulta'], ['HOLOSCAN', 'Os 5 sistemas e as áreas prioritárias'], ['Ferramentas', 'Corpo, Mente e Espírito na prática'],
  ['Resultado HOLOS', 'Foco e estratégias com o Playbook'], ['PDF e WhatsApp', 'Com a sua marca, na mão do paciente'], ['Retorno', 'Manter, ajustar e evoluir']];
slide('claro', `${marca}<p class="eyebrow">Como funciona</p><h2>Uma jornada organizada,<br><em>do primeiro atendimento à evolução.</em></h2>
<ol class="jornada">${J.map(([t, d], i) => `<li><span class="num">${i + 1}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
<p class="nota-c">Tudo no mesmo lugar: a ficha do paciente guarda cada etapa, cada versão e cada retorno.</p>`);

/* 5..11 — telas */
const lado = (cls, eyebrow, titulo, itens, telaHtml) => slide('claro lado ' + cls, `${marca}<div class="col-txt"><p class="eyebrow">${eyebrow}</p><h2>${titulo}</h2>
<ul class="itens">${itens.map(x => `<li>${x}</li>`).join('')}</ul></div><div class="col-img">${telaHtml}</div>`);

lado('', '1 · Antes da consulta', 'Você chega à consulta<br><em>já sabendo o que importa.</em>', [
  'Envie o <b>Mapeamento Holístico</b> por link ou WhatsApp: o paciente responde pelo celular, no tempo dele.',
  'Motivo, objetivo, rotina alimentar, sono e o que mais incomoda chegam organizados na ficha.',
  'Com um clique, as respostas viram o ponto de partida do atendimento.'], tela('mapeamento'));

lado('', '2 · HOLOSCAN', 'Descubra <em>por onde começar.</em>', [
  'Questionário do método que organiza os relatos em <b>5 sistemas</b>: Metabólico, Fúngico, Ácido Inflamatório, Detox e Linfático e Mental Emocional Espiritual.',
  'Mostra as <b>2 áreas que merecem mais atenção</b> nesta fase e a Tríade Corpo · Mente · Espírito.',
  'Sugere as ferramentas certas para aprofundar cada área.'], tela('holoscan'));

slide('claro', `${marca}<p class="eyebrow">3 · Ferramentas</p><h2>9 ferramentas prontas para<br><em>aprofundar na própria consulta.</em></h2>
<div class="cme">
<div><h3>Corpo</h3><p class="perg">O que colocar em prática</p><ul><li>OQ³ — Quero, Preciso, Consigo</li><li>Linha do Momentum</li><li>Mapa da Rotina</li></ul></div>
<div><h3>Mente</h3><p class="perg">O que compreender nos padrões</p><ul><li>Escada dos Porquês</li><li>Mapa de Crenças Alimentares</li><li>Gatilhos &amp; Respostas</li></ul></div>
<div><h3>Espírito</h3><p class="perg">Que direção fortalecer</p><ul><li>Mapa do Propósito</li><li>Roda Holística da Vida</li><li>Carta ao Futuro Eu</li></ul></div>
</div>
<div class="faixa-img">${tela('corpo')}</div>`);

lado('inverte', '4 · Resultado HOLOS', 'O Playbook monta o plano <em>com você, em minutos.</em>', [
  'O sistema já traz <b>3 focos</b> para cada área prioritária do HOLOSCAN. Você escolhe um.',
  'Estratégias prontas de <b>Corpo, Mente e Espírito</b>, com o que fazer, quando e o que observar.',
  'Primeiro aparecem as que combinam com as ferramentas aplicadas. Você ajusta tudo com as suas palavras.',
  'Sem depender de inteligência artificial: <b>você decide, o sistema organiza.</b>'], `<div class="pilha">${tela('foco', 'p1')}${tela('estrategias', 'p2')}</div>`);

slide('escuro lado', `${marca}<div class="col-txt"><p class="eyebrow">5 · O que o paciente recebe</p><h2>Um documento com a sua marca,<br><em>que ele entende e guarda.</em></h2>
<ul class="itens"><li>Seu momento agora, o foco desta fase e o plano até a próxima consulta, em linguagem simples.</li>
<li>O mapa HOLOS e as áreas que merecem atenção.</li><li>Seu nome, CRN e assinatura em cada página.</li>
<li><b>PDF pronto e envio pelo WhatsApp</b> direto do sistema.</li></ul></div>
<div class="col-img docs"><div class="doc d1"><img src="${img('docTopo')}" alt=""></div><div class="doc d2"><img src="${img('docPlano')}" alt=""></div><div class="doc d3"><img src="${img('docMapa')}" alt=""></div></div>`);

lado('', '6 · Retorno', 'Acompanhe o que funcionou.<br><em>Ajuste o que precisa mudar.</em>', [
  'Cada estratégia volta para a conversa: o que aconteceu, o que ajudou, o que dificultou.',
  'Você decide: <b>manter, ajustar, substituir, concluir ou encerrar</b>.',
  'O paciente recebe o novo documento mostrando o caminho que já percorreu.'], `<div class="doc-unico"><img src="${img('retorno')}" alt=""></div>`);

lado('inverte', '7 · Seu consultório', 'Tudo do seu atendimento<br><em>em um só lugar.</em>', [
  '<b>Painel</b> com a agenda do dia e a etapa de cada paciente.',
  '<b>Ficha completa</b>: atendimentos, Mapeamento, HOLOSCAN, ferramentas, resultados e documentos.',
  '<b>Agenda</b>, histórico e evolução de cada paciente.',
  'Funciona no computador e no celular.'], tela('ficha'));

/* 12 — seguranca e etica */
slide('claro', `${marca}<p class="eyebrow">Segurança e ética</p><h2>Feito para a prática clínica,<br><em>com responsabilidade.</em></h2>
<div class="selos">
<div><h3>Seus dados protegidos</h3><p>Acesso por login. Cada nutricionista vê somente os próprios pacientes, com proteção aplicada no banco de dados.</p></div>
<div><h3>Documento confiável</h3><p>O Resultado emitido fica congelado, com data, nome e CRN. O histórico de versões é preservado.</p></div>
<div><h3>Dentro da sua atuação</h3><p>Sem diagnóstico e sem prescrição: hábito, observação e rotina. Os sistemas são eixos do método, não doenças.</p></div>
<div><h3>Você no comando</h3><p>O sistema sugere e organiza. Todo texto que vai ao paciente passa pela sua decisão.</p></div>
</div>`);

/* 13 — proximo passo */
const contato = CONTATO ? Object.entries(CONTATO).map(([k, v]) => `<p><b>${k}</b> ${v}</p>`).join('') : '<p class="reserva">[ contato — WhatsApp · Instagram · site ]</p>';
S.push(`<section class="s capa fim"><div class="capa-txt"><img class="capa-logo" src="${LOGO}" alt=""><p class="sobre">Próximo passo</p>
<h1>Mais clareza para você.<br><em>Mais direção para o seu paciente.</em></h1>
<p class="capa-sub">Vamos mostrar o HoloHacking funcionando com um caso da sua rotina.</p>
<div class="contato">${contato}</div></div>
<div class="capa-img">${tela('questionario')}</div>${rod(13)}</section>`);

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>HoloHacking — Apresentação</title><style>
@page{size:1920px 1080px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
:root{--verde:#10281e;--verde2:#1b4433;--ouro:#c9a959;--ouro2:#e9d9a8;--creme:#f7f2e6;--tinta:#1c2e25;--suave:#5c6b62}
body{font-family:"Jost",Arial,sans-serif;color:var(--tinta)}
h1,h2,h3{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600}
em{font-style:italic;color:var(--ouro)}
.s{width:1920px;height:1080px;position:relative;overflow:hidden;page-break-after:always;padding:110px 120px 100px}
.claro{background:var(--creme)}
.claro h2 em{color:#9a7a2e}
.escuro,.capa{background:radial-gradient(ellipse at 30% 30%,#1d4a37 0%,#12301f 55%,#0b1d14 100%);color:#efe8d6}
.escuro h2,.capa h1{color:#f3ead2}
.marca{position:absolute;top:44px;left:120px;display:flex;align-items:center;gap:14px;font-family:"Cormorant Garamond",serif;font-size:28px;font-weight:600;color:#163a2b}
.marca img{width:40px;height:40px}
.escuro .marca{color:var(--ouro2)}
.rod{position:absolute;bottom:40px;left:120px;right:120px;display:flex;justify-content:space-between;font-size:18px;letter-spacing:.14em;text-transform:uppercase;color:#8a958e}
.escuro .rod,.capa .rod{color:#8fa197}
.eyebrow{font-size:22px;letter-spacing:.22em;text-transform:uppercase;color:#9a7a2e;font-weight:600;margin:0 0 22px}
.escuro .eyebrow,.capa .sobre{color:var(--ouro)}
h2{font-size:78px;line-height:1.05;color:#163a2b;margin-bottom:56px}
/* capa */
.capa{display:flex;align-items:center;gap:80px;padding:0 0 0 130px}
.capa-txt{flex:0 0 780px}
.capa-logo{width:120px;height:120px;margin-bottom:34px}
.sobre{font-size:22px;letter-spacing:.3em;text-transform:uppercase;font-weight:500;margin-bottom:26px}
.capa h1{font-size:88px;line-height:1.04;margin-bottom:34px}
.fim h1{font-size:76px}
.capa-sub{font-size:30px;line-height:1.45;color:#d9d1bc;font-weight:300;max-width:720px}
.pills{display:flex;gap:16px;margin-top:44px}
.pills span{border:1.5px solid var(--ouro);color:var(--ouro2);border-radius:60px;padding:12px 34px;font-size:22px;letter-spacing:.16em;text-transform:uppercase}
.capa-img{flex:1;height:100%;display:flex;align-items:center;position:relative}
.capa-img .tela{width:1180px;transform:perspective(2200px) rotateY(-14deg) rotateX(4deg);transform-origin:left center;box-shadow:-40px 50px 120px rgba(0,0,0,.55)}
.contato{margin-top:46px;font-size:30px;color:var(--ouro2)}
.contato .reserva{border:1.5px dashed var(--ouro);display:inline-block;padding:18px 34px;border-radius:14px;color:var(--ouro)}
/* tela com moldura */
.tela{background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(16,40,30,.28);border:1px solid rgba(0,0,0,.08)}
.tela-barra{height:34px;background:#e9e4d6;display:flex;gap:10px;align-items:center;padding:0 16px}
.tela-barra i{width:13px;height:13px;border-radius:50%;background:#c9c1ad;display:block}
.tela img{display:block;width:100%}
/* dores */
.dores{display:grid;grid-template-columns:repeat(4,1fr);gap:34px}
.dores>div{background:#fff;border:1px solid #e6dcc3;border-radius:22px;padding:44px 38px;min-height:380px}
.dores b{font-family:"Cormorant Garamond",serif;font-size:56px;color:var(--ouro);display:block;margin-bottom:18px}
.dores h3{font-size:40px;color:#163a2b;margin-bottom:16px;line-height:1.1}
.dores p{font-size:25px;line-height:1.5;color:var(--suave)}
/* centro */
.centro{display:flex;flex-direction:column;justify-content:center;padding-left:200px;padding-right:200px}
.grande{font-size:96px;color:#f3ead2;margin-bottom:50px}
.lead-c{font-size:34px;line-height:1.5;color:#d9d1bc;font-weight:300;max-width:1300px}
/* jornada */
.jornada{list-style:none;display:grid;grid-template-columns:repeat(6,1fr);gap:22px;position:relative;margin-top:20px}
.jornada:before{content:"";position:absolute;top:44px;left:6%;right:6%;height:2px;background:linear-gradient(90deg,var(--ouro),#163a2b)}
.jornada li{position:relative;text-align:center;padding:0 8px}
.jornada .num{width:88px;height:88px;border-radius:50%;background:#163a2b;color:var(--ouro2);font-family:"Cormorant Garamond",serif;font-size:44px;font-weight:600;display:flex;align-items:center;justify-content:center;margin:0 auto 30px;border:4px solid var(--creme);box-shadow:0 0 0 2px var(--ouro)}
.jornada h3{font-size:36px;color:#163a2b;margin-bottom:12px;line-height:1.1}
.jornada p{font-size:23px;line-height:1.45;color:var(--suave)}
.nota-c{margin-top:80px;font-size:28px;color:#163a2b;background:#efe6cc;border-radius:16px;padding:26px 40px;display:inline-block}
/* lado a lado */
.lado{display:flex;align-items:center;gap:80px}
.lado.inverte{flex-direction:row-reverse}
.col-txt{flex:0 0 720px}
.col-txt h2{font-size:62px;margin-bottom:44px}
.itens{list-style:none}
.itens li{font-size:27px;line-height:1.5;color:#33463c;padding:0 0 22px 44px;position:relative}
.itens li:before{content:"";position:absolute;left:0;top:14px;width:20px;height:20px;border-radius:50%;background:var(--ouro);box-shadow:0 0 0 5px rgba(201,169,89,.22)}
.escuro .itens li{color:#e1d9c4}
.escuro .col-txt h2{color:#f3ead2}
.col-img{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;height:100%}
.col-img .tela{width:100%}
.col-img .tela.alta{max-height:860px;width:auto}
.col-img .tela.alta img{height:780px;width:auto}
.pilha{position:relative;width:100%;height:860px}
.pilha .tela{position:absolute}
.pilha .p1{width:78%;top:0;left:0;z-index:2}
.pilha .p2{width:56%;right:0;top:250px;z-index:1}
.pilha .p2 img{height:560px;object-fit:cover;object-position:top}
/* ferramentas */
.cme{display:grid;grid-template-columns:repeat(3,1fr);gap:34px}
.cme>div{background:#fff;border:1px solid #e6dcc3;border-top:6px solid var(--ouro);border-radius:20px;padding:26px 40px}
.cme h3{font-size:46px;color:#163a2b}
.cme .perg{font-size:22px;color:#9a7a2e;letter-spacing:.06em;margin:4px 0 18px;text-transform:uppercase;font-weight:600}
.cme li{font-size:25px;line-height:1.5;color:#33463c;list-style:none}
.faixa-img{margin-top:36px;width:1180px}
/* documentos do paciente */
.docs{position:relative}
.doc{position:absolute;background:#fbf8f0;border-radius:14px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.45)}
.doc img{display:block;width:100%}
.d1{width:560px;top:40px;left:0;transform:rotate(-3deg)}
.d2{width:540px;top:110px;left:350px;z-index:2;transform:rotate(2deg)}
.d3{width:540px;top:500px;left:170px;z-index:3;transform:rotate(-1deg)}
.doc-unico{width:760px;height:860px;overflow:hidden;border-radius:18px;box-shadow:0 30px 80px rgba(16,40,30,.28);background:#fbf8f0}
.doc-unico img{width:100%;display:block}
/* selos */
.selos{display:grid;grid-template-columns:repeat(2,1fr);gap:30px 40px}
.selos>div{background:#fff;border:1px solid #e6dcc3;border-left:8px solid #163a2b;border-radius:18px;padding:34px 44px}
.selos h3{font-size:42px;color:#163a2b;margin-bottom:10px}
.selos p{font-size:26px;line-height:1.5;color:var(--suave)}
</style></head><body>${S.join('')}</body></html>`;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const p = await nav.newPage();
await p.setContent(html, { waitUntil: 'load' });
await p.evaluateHandle('document.fonts.ready');
await p.pdf({ path: SAIDA, width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
await nav.close();
console.log('PDF: ' + SAIDA);
