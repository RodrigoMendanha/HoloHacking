/**
 * VIDEO COMERCIAL HOLOHACKING — passo 2: composicao quadro a quadro (Chromium desenha, ffmpeg codifica).
 *   node scripts/video-holohacking-comercial/compor.mjs <vertical|quadrado|horizontal> [saida.mp4] [--sem-trilha] [--quadros=a,b,c]
 * Le telas/ (capturar.mjs) e roteiro.mjs; trilha opcional em saida/trilha.wav (trilha.py). Sem narracao.
 * --quadros=12.5,30 grava so esses instantes (s) como PNG em saida/quadros/ (revisao), sem video.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { CENAS as cenas, DURACAO, FPS, PASSOS } from './roteiro.mjs';
const AQUI = new URL('./', import.meta.url).pathname;
const R = new URL('../../', import.meta.url).pathname;
const puppeteer = (await import(R + 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).default;

const FORMATOS = {
  vertical:   { W: 1080, H: 1920, card: { x: 70, y: 660, w: 940, hMax: 900, hMin: 420, yCentro: 1110 }, titulo: { x: 80, y: 250, w: 920, h: 340, fs: 66, al: 'center' },
                rotulo: { y: 1612 }, marca: true, passos: { y: 1700 } },
  quadrado:   { W: 1080, H: 1080, card: { x: 100, y: 300, w: 880, hMax: 600, hMin: 300, yCentro: 610 }, titulo: { x: 80, y: 60, w: 920, h: 210, fs: 50, al: 'center' },
                rotulo: { y: 935 }, marca: false, passos: { y: 1000 } },
  horizontal: { W: 1920, H: 1080, card: { x: 840, y: 90, w: 980, hMax: 860, hMin: 420, yCentro: 520 }, titulo: { x: 120, y: 300, w: 640, h: 460, fs: 64, al: 'left' },
                rotulo: { y: 975, x: 840 }, marca: true, passos: { y: 1000, x: 840, w: 980 } }
};
const fmtNome = process.argv[2] || 'vertical';
const F = FORMATOS[fmtNome]; if (!F) throw new Error('formato: vertical | quadrado | horizontal');
const SAIDA = AQUI + 'saida'; mkdirSync(SAIDA, { recursive: true });
const arqVideo = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : SAIDA + '/holohacking-comercial-' + fmtNome + '.mp4';
const semTrilha = process.argv.includes('--sem-trilha');
const soQuadros = (process.argv.find(x => x.startsWith('--quadros=')) || '').slice(10).split(',').filter(Boolean).map(Number);

/* vertical e quadrado: telas na largura de celular (texto grande e linhas inteiras); horizontal: telas de computador */
const DESKTOP = fmtNome === 'horizontal';
const TELAS = AQUI + (DESKTOP ? 'telas' : 'telas-celular');
const meta = JSON.parse(readFileSync(TELAS + '/telas.json', 'utf8'));
const ANC = meta.ancoras || {};
const tamPng = (f) => { const b = readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const imgs = {};
cenas.forEach(c => { if (c.img && !imgs[c.img]) imgs[c.img] = Object.assign({ src: 'file://' + TELAS + '/' + c.img + '.png', anc: ANC[c.img] || {} }, tamPng(TELAS + '/' + c.img + '.png')); });

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root { --verde:#0a2e22; --verde2:#123f2f; --ouro:#c9a35a; --ouro2:#e3c88e; --creme:#f4ecdc; --papel:#f6f0e4; }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:${F.W}px; height:${F.H}px; overflow:hidden; background:var(--verde); }
#bg { position:absolute; inset:0; background: radial-gradient(120% 70% at 50% 0%, #184a37 0%, #0c3326 45%, #071f17 100%); }
#bg::after { content:''; position:absolute; inset:0; background: radial-gradient(60% 40% at 50% 100%, rgba(201,163,90,.10), transparent 70%); }
.card { position:absolute; left:${F.card.x}px; width:${F.card.w}px; border-radius:28px; overflow:hidden; background:var(--papel);
  box-shadow: 0 40px 90px rgba(0,0,0,.55), 0 0 0 2px rgba(201,163,90,.55), 0 0 60px rgba(201,163,90,.10); }
.card img { position:absolute; left:0; top:0; transform-origin:0 0; image-rendering:auto; }
.titulo { position:absolute; left:${F.titulo.x}px; top:${F.titulo.y}px; width:${F.titulo.w}px; height:${F.titulo.h}px; display:flex; align-items:center;
  justify-content:${F.titulo.al === 'center' ? 'center' : 'flex-start'}; text-align:${F.titulo.al}; font-family:'Cormorant Garamond', serif; font-weight:500;
  font-size:${F.titulo.fs}px; line-height:1.12; color:var(--creme); letter-spacing:.2px; text-shadow:0 2px 18px rgba(0,0,0,.35); }
em { font-style:italic; color:var(--ouro2); }
.rotulo { position:absolute; left:${F.rotulo.x || 0}px; width:${F.rotulo.x ? F.card.w : F.W}px; top:${F.rotulo.y}px; text-align:center; font-family:'Jost', sans-serif; font-weight:500;
  font-size:${fmtNome === 'quadrado' ? 22 : 27}px; letter-spacing:6px; text-transform:uppercase; color:var(--ouro); }
.rotulo::before, .rotulo::after { content:''; display:inline-block; width:46px; height:1px; background:rgba(201,163,90,.6); vertical-align:middle; margin:0 18px; }
.centro { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:0 ${fmtNome === 'horizontal' ? 260 : 90}px; }
.logo { width:${fmtNome === 'quadrado' ? 150 : 200}px; height:auto; filter: drop-shadow(0 6px 24px rgba(201,163,90,.25)); }
.marcaNome { font-family:'Cormorant Garamond', serif; font-weight:500; font-size:${fmtNome === 'quadrado' ? 70 : 92}px; color:var(--creme); margin-top:26px; letter-spacing:1px; }
.marcaSub { font-family:'Jost', sans-serif; font-weight:400; font-size:${fmtNome === 'quadrado' ? 20 : 24}px; letter-spacing:7px; text-transform:uppercase; color:var(--ouro); margin-top:14px; }
.frase { font-family:'Cormorant Garamond', serif; font-weight:500; font-size:${fmtNome === 'quadrado' ? 52 : 70}px; line-height:1.15; color:var(--creme); }
.frase2 { margin-top:34px; }
.fecho { font-family:'Cormorant Garamond', serif; font-weight:500; font-size:${fmtNome === 'quadrado' ? 40 : 52}px; line-height:1.2; color:var(--creme); margin-top:54px; }
.marcaRodape { position:absolute; left:0; width:100%; bottom:${fmtNome === 'horizontal' ? 40 : 70}px; text-align:center; font-family:'Jost', sans-serif; font-size:20px; letter-spacing:9px; color:rgba(201,163,90,.55); }
.passos { position:absolute; display:flex; justify-content:center; gap:${fmtNome === 'quadrado' ? 14 : 18}px; left:${F.passos.x || 0}px; width:${F.passos.w || F.W}px; top:${F.passos.y}px; }
.passo { font-family:'Jost', sans-serif; font-size:${fmtNome === 'quadrado' ? 14 : 17}px; letter-spacing:2px; text-transform:uppercase; color:rgba(244,236,220,.38); display:flex; align-items:center; gap:8px; }
.passo i { width:9px; height:9px; border-radius:50%; background:rgba(244,236,220,.25); display:inline-block; }
.passo.on { color:var(--ouro2); } .passo.on i { background:var(--ouro); box-shadow:0 0 12px rgba(201,163,90,.8); }
.passo.feito { color:rgba(227,200,142,.7); } .passo.feito i { background:rgba(201,163,90,.7); }
</style></head><body>
<div id="bg"></div>
<div id="cardA" class="card"><img id="imgA"></div>
<div id="cardB" class="card"><img id="imgB"></div>
<div id="titulo" class="titulo"></div><div id="titulo2" class="titulo"></div>
<div id="rotulo" class="rotulo"></div>
<div id="passos" class="passos">${PASSOS.map(p => '<span class="passo"><i></i>' + p + '</span>').join('')}</div>
<div id="centro" class="centro"></div>
${F.marca ? '<div id="marcaRodape" class="marcaRodape">HOLOHACKING</div>' : ''}
<script>
const CENAS = ${JSON.stringify(cenas)}, IMGS = ${JSON.stringify(imgs)}, F = ${JSON.stringify(F)}, DUR = ${DURACAO}, DESKTOP = ${DESKTOP};
const LOGO = 'file://${R}logo-holohacking.png';
const ease = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, p) => a + (b - a) * p;
/* quadro-chave relativo -> camera em px da imagem: { s (escala), cx, cy } para um cartao de altura h */
function kfAbs(c, k, h) {
  const im = IMGS[c.img], z = DESKTOP && k.zd ? k.zd : (k.z || 1), s = F.card.w * z / im.w, viewH = h / s;
  const ancora = k.a && im.anc[k.a];
  const cy = ancora ? ancora.y + viewH * (0.5 - (k.f || 0)) : (k.y == null ? 0.5 : k.y) * im.h;
  const cx = im.w / 2 + (DESKTOP && k.xd ? k.xd : (k.x || 0)) * im.w;
  return { s, cx, cy };
}
function camEm(c, u, h) {
  const k = c.cam.map(x => Object.assign({ t: x.t }, kfAbs(c, x, h)));
  if (u <= k[0].t) return k[0]; if (u >= k[k.length - 1].t) return k[k.length - 1];
  for (let i = 0; i < k.length - 1; i++) if (u >= k[i].t && u <= k[i + 1].t) { const p = ease((u - k[i].t) / (k[i + 1].t - k[i].t));
    return { s: lerp(k[i].s, k[i + 1].s, p), cx: lerp(k[i].cx, k[i + 1].cx, p), cy: lerp(k[i].cy, k[i + 1].cy, p) }; }
}
/* altura do cartao: a imagem inteira cabe (telas curtas) ou o maximo (telas longas) */
function altCard(c) { const im = IMGS[c.img]; const zMin = Math.min(...c.cam.map(k => DESKTOP && k.zd ? k.zd : (k.z || 1))); return clamp(im.h * F.card.w * zMin / im.w, F.card.hMin, F.card.hMax); }
function desenhaCard(el, img, c, u, op) {
  if (!c || !c.img) { el.style.opacity = 0; return; }
  const im = IMGS[c.img]; if (img.dataset.src !== im.src) { img.src = im.src; img.dataset.src = im.src; img.style.width = im.w + 'px'; img.style.height = im.h + 'px'; }
  const h = altCard(c), cam = camEm(c, u, h), s = cam.s;
  /* nunca mostrar vazio fora da imagem: a janela fica dentro dela (ou centrada, se a imagem for menor) */
  let cy = cam.cy; const meia = h / 2 / s; cy = im.h * s >= h ? clamp(cy, meia, im.h - meia) : im.h / 2;
  let cx = cam.cx; const meiaW = F.card.w / 2 / s; cx = im.w * s >= F.card.w ? clamp(cx, meiaW, im.w - meiaW) : im.w / 2;
  el.style.top = (F.card.yCentro - h / 2) + 'px'; el.style.height = h + 'px';
  img.style.transform = 'translate(' + (F.card.w / 2 - cx * s) + 'px,' + (h / 2 - cy * s) + 'px) scale(' + s + ')';
  el.style.opacity = op;
}
function cenaEm(t) { for (let i = CENAS.length - 1; i >= 0; i--) if (t >= CENAS[i].ini) return i; return 0; }
function render(t) {
  const i = cenaEm(t), c = CENAS[i], u = clamp((t - c.ini) / (c.fim - c.ini), 0, 1), prev = CENAS[i - 1];
  const XF = c.corte ? 0.28 : 0.6, px = clamp((t - c.ini) / XF, 0, 1);
  const cardA = document.getElementById('cardA'), cardB = document.getElementById('cardB');
  // card atual (A) entra; o anterior (B) sai
  if (c.img) {
    desenhaCard(cardA, document.getElementById('imgA'), c, u, prev && prev.img ? ease(px) : ease(clamp((t - c.ini) / 0.7, 0, 1)));
    if (prev && prev.img && px < 1) desenhaCard(cardB, document.getElementById('imgB'), prev, 1, 1 - ease(px)); else cardB.style.opacity = 0;
    cardA.style.zIndex = 2; cardB.style.zIndex = 1;
  } else {
    // cena de texto: o cartao anterior sai
    cardA.style.opacity = 0;
    if (prev && prev.img && px < 1) desenhaCard(cardB, document.getElementById('imgB'), prev, 1, 1 - ease(px)); else cardB.style.opacity = 0;
  }
  // fim do video: o cartao sai antes da cena final
  // titulo (troca com fade quando muda)
  const t1 = document.getElementById('titulo'), t2 = document.getElementById('titulo2');
  const tit = c.titulo || '', titPrev = prev && prev.titulo || '';
  const fimCena = c.img ? clamp((c.fim - t) / 0.45, 0, 1) : 1;
  const proxMantem = c.tituloContinua;
  const opSai = proxMantem ? 1 : fimCena;
  if (tit) {
    t1.innerHTML = '<div>' + tit + '</div>';
    const pt = tit === titPrev ? 1 : ease(clamp((t - c.ini - 0.15) / 0.55, 0, 1));
    t1.style.opacity = pt * (c.titulo && !proxMantem ? (CENAS[i + 1] && CENAS[i + 1].titulo === tit ? 1 : opSai) : 1);
    t1.style.transform = 'translateY(' + ((1 - pt) * 18) + 'px)';
  } else t1.style.opacity = 0;
  t2.style.opacity = 0;
  // rotulo
  const ro = document.getElementById('rotulo');
  if (c.rotulo) { ro.textContent = c.rotulo; ro.style.opacity = ease(clamp((t - c.ini - 0.1) / 0.4, 0, 1)) * (c.corte || CENAS[i + 1] && CENAS[i + 1].corte ? 1 : clamp((c.fim - t) / 0.4, 0, 1)); }
  else ro.style.opacity = 0;
  // passos da jornada
  const ps = document.getElementById('passos'); const emPasso = typeof c.passo === 'number';
  ps.style.opacity = emPasso ? 1 : 0;
  [...ps.children].forEach((e, k) => { e.className = 'passo' + (emPasso && k === c.passo ? ' on' : emPasso && k < c.passo ? ' feito' : ''); });
  ro.style.display = emPasso && F.passos.y === F.rotulo.y ? 'none' : '';
  // cenas de texto
  const ce = document.getElementById('centro'); let html = '', op = 0;
  const fadeIn = (a, d) => ease(clamp((t - c.ini - a) / (d || 0.8), 0, 1));
  const fadeOut = (d) => ease(clamp((c.fim - t) / (d || 0.5), 0, 1));
  if (c.tipo === 'abertura') {
    html = '<img class="logo" src="' + LOGO + '" style="opacity:' + fadeIn(0.1, 0.9) + '"><div class="marcaNome" style="opacity:' + fadeIn(0.4, 0.9) + '">HoloHacking</div>' +
      '<div class="marcaSub" style="opacity:' + fadeIn(0.7, 0.8) + '">Plataforma clínica de nutrição holística</div>' +
      '<div class="frase frase2" style="margin-top:70px;opacity:' + fadeIn(1.5, 0.9) + ';font-size:' + (F.W === 1080 && F.H === 1080 ? 40 : 54) + 'px">' + c.frase + '</div>';
    op = fadeOut(0.5);
  } else if (c.tipo === 'mensagem') {
    html = '<div class="frase" style="opacity:' + fadeIn(0.15, 0.7) + '">' + c.linhas[0] + '</div><div class="frase frase2" style="opacity:' + fadeIn(1.3, 0.9) + '">' + c.linhas[1] + '</div>';
    op = fadeOut(0.45);
  } else if (c.tipo === 'final') {
    html = '<img class="logo" src="' + LOGO + '" style="opacity:' + fadeIn(0.4, 1) + '"><div class="marcaNome" style="opacity:' + fadeIn(0.7, 1) + '">HoloHacking</div>' +
      '<div class="frase" style="margin-top:34px;font-size:' + (F.W === 1080 && F.H === 1080 ? 36 : 46) + 'px;opacity:' + fadeIn(1.3, 0.9) + '"><em>' + c.assinatura + '</em></div>' +
      '<div class="fecho" style="opacity:' + fadeIn(2.8, 1) + '">' + c.fecho + '</div>';
    op = clamp((DUR - t) / 0.9, 0, 1);
  }
  ce.innerHTML = html; ce.style.opacity = op;
  const mr = document.getElementById('marcaRodape'); if (mr) mr.style.opacity = c.tipo ? 0 : 0.9;
}
window.render = render;
</script></body></html>`;
const pag = SAIDA + '/compor-' + fmtNome + '.html';
writeFileSync(pag, html);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new',
  args: ['--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files', '--force-color-profile=srgb'] });
const P = await nav.newPage();
await P.setViewport({ width: F.W, height: F.H, deviceScaleFactor: 1 });
await P.goto('file://' + pag, { waitUntil: 'load' });
await P.evaluate(async (imgs) => { await document.fonts.load('500 40px "Cormorant Garamond"'); await document.fonts.load('italic 500 40px "Cormorant Garamond"'); await document.fonts.load('500 20px Jost');
  await Promise.all(Object.values(imgs).map(i => new Promise(ok => { const im = new Image(); im.onload = ok; im.onerror = ok; im.src = i.src; }))); }, imgs);
const desenhar = async (t) => { await P.evaluate((t) => window.render(t), t); await P.evaluate(() => Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(ok => { i.onload = ok; i.onerror = ok; })))); };

if (soQuadros.length) {
  mkdirSync(SAIDA + '/quadros', { recursive: true });
  for (const t of soQuadros) { await desenhar(t); await P.screenshot({ path: SAIDA + '/quadros/' + fmtNome + '-' + String(t).replace('.', '_') + 's.png' }); }
  await nav.close(); console.log('quadros:', soQuadros.join(', ')); process.exit(0);
}

const DIR = SAIDA + '/frames-' + fmtNome; rmSync(DIR, { recursive: true, force: true }); mkdirSync(DIR, { recursive: true });
const N = Math.round(DURACAO * FPS);
for (let f = 0; f < N; f++) {
  await desenhar(f / FPS);
  await P.screenshot({ path: DIR + '/' + String(f).padStart(5, '0') + '.jpg', type: 'jpeg', quality: 93 });
  if (f % 150 === 0) console.log(fmtNome, 'quadro', f, '/', N);
}
await nav.close();
const trilha = SAIDA + '/trilha.wav';
const args = ['-y', '-v', 'error', '-framerate', String(FPS), '-i', DIR + '/%05d.jpg'];
if (!semTrilha && existsSync(trilha)) args.push('-i', trilha, '-af', 'afade=t=out:st=' + (DURACAO - 2.5) + ':d=2.5', '-c:a', 'aac', '-b:a', '192k', '-shortest');
args.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-r', String(FPS), arqVideo);
execFileSync('ffmpeg', args, { stdio: 'inherit' });
rmSync(DIR, { recursive: true, force: true });
console.log('video:', arqVideo);
