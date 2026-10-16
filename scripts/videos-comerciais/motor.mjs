/**
 * MOTOR dos videos comerciais (vertical 1080x1920, 30 fps): cenas em HTML animadas quadro a quadro no Chromium
 * (deterministico: window.render(t)), trilha original (trilhas.py) e ffmpeg. Telas REAIS do sistema com dados FICTICIOS.
 *
 * Cada roteiro (roteiros/vN.mjs) exporta { id, titulo, dur, estilo, energia, marcas, tema, corpo(h) }.
 * Elementos: data-in / data-out (janela, s), data-a (entrada), data-sai (saida), data-fi / data-fo (duracao das transicoes).
 *   entradas: sobe desce fade zoom pop esq dir mascara desfoque digita
 *   extras:   data-kb="y0,y1" (pan vertical de imagem) · data-zoom="z0,z1" (escala continua) · data-conta="a,b"
 *             data-barra="p0,p1" (largura %) · data-pulso (respira devagar)
 */
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
export const AQUI = new URL('./', import.meta.url).pathname;
export const R = new URL('../../', import.meta.url).pathname;
export const W = 1080, H = 1920, FPS = 30;
const TELAS = AQUI + 'telas/';
const CEL = R + 'scripts/video-holohacking-comercial/telas-celular/', APR = R + 'scripts/apresentacao-comercial/telas/';

/* recortes das capturas reais: nome -> [arquivo, caixa x0,y0,x1,y1, largura final] */
export const RECORTES = {
  dashboard: [CEL + 'a01-dashboard.png', [0, 0, 1080, 2250], 900],
  ficha: [CEL + 'a02-ficha-visao.png', [0, 0, 1080, 2250], 900],
  mapeamento: [CEL + 'a03-mapeamento.png', [0, 0, 1080, 2250], 900],
  mapeamentoEnvio: [CEL + 'a03b-mapeamento-conteudo.png', [0, 0, 855, 1900], 900],
  mapeamentoResp: [CEL + 'a03b-mapeamento-conteudo.png', [0, 1640, 855, 3000], 900],
  questionario: [CEL + 'a06-holoscan-questionario.png', [0, 0, 1080, 2250], 900],
  holoscan: [CEL + 'a05-holoscan-pagina.png', [0, 1330, 980, 3420], 900],
  corpo: [CEL + 'a04-secao-corpo.png', [0, 0, 1080, 2250], 900],
  mente: [CEL + 'a04-secao-mente.png', [0, 0, 1080, 2250], 900],
  espirito: [CEL + 'a04-secao-espirito.png', [0, 0, 1080, 2250], 900],
  sistema: [CEL + 'p1-sistema-metabolico-prioritario.png', [0, 0, 885, 2163], 900],
  cme: [CEL + 'p1-sec-cme.png', [0, 0, 885, 1313], 900],
  playbookFoco: [APR + 'playbook-2-foco.png', [0, 0, 1808, 1096], 1400],
  playbook: [APR + 'playbook-3-estrategias.png', [0, 270, 620, 2050], 900],
  estrategias: [CEL + 'p1-pilar-estrategias.png', [0, 0, 885, 2400], 900],
  documento: [CEL + 'p1-paciente-documento.png', [0, 0, 980, 3000], 900],
  previa: [CEL + 'p05-previa-paciente.png', [0, 0, 855, 2400], 900],
  antesAgora: [CEL + 'r1-sec-antes-agora.png', [0, 0, 885, 1245], 900],
  avancos: [CEL + 'r1-sec-avancos.png', [0, 0, 885, 1043], 900],
  retorno: [CEL + 'r1-paciente-documento.png', [0, 0, 980, 3200], 900]
};
export function prepararTelas() {
  mkdirSync(TELAS, { recursive: true });
  const faltam = Object.entries(RECORTES).filter(([n]) => !existsSync(TELAS + n + '.jpg'));
  if (!faltam.length) return;
  for (const [, [f]] of faltam) if (!existsSync(f)) throw new Error('falta ' + f + ' (rode os capturadores)');
  execFileSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
c = json.loads(sys.argv[1]); out = sys.argv[2]
for n, (f, box, w) in c.items():
    im = Image.open(f).convert('RGB').crop(tuple(box))
    im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    im.save(out + n + '.jpg', quality=90)
`, JSON.stringify(Object.fromEntries(faltam)), TELAS]);
}
export const img = (n) => 'file://' + TELAS + n + '.jpg';
export const LOGO = 'file://' + R + 'logo-holohacking.png';

/* ---------------------------------------------------------------- ajudantes de cena */
const at = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => ` data-${k}="${v}"`).join('');
const est = (o) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => `${k}:${typeof v === 'number' ? v + 'px' : v}`).join(';');
export const h = {
  /* texto centralizado: h.t(0, 4, 'Olá <em>mundo</em>', { top: 400, size: 80 }) */
  t(a, b, html, o = {}) {
    const s = est({ top: o.top, left: o.left ?? 80, right: o.right ?? 80, 'font-size': o.size ?? 74, 'text-align': o.align, color: o.cor, 'letter-spacing': o.ls, 'line-height': o.lh });
    return `<p class="t ${o.cls ?? 'serif'}" style="${s};${o.css ?? ''}"${at({ in: a, out: b, a: o.a ?? 'sobe', sai: o.sai, fi: o.fi, fo: o.fo, pulso: o.pulso })}>${html}</p>`;
  },
  /* bloco livre */
  d(a, b, cls, html, o = {}) {
    return `<div class="${cls}" style="${est(o.s ?? {})};${o.css ?? ''}"${at({ in: a, out: b, a: o.a ?? 'fade', sai: o.sai, fi: o.fi, fo: o.fo, zoom: o.zoom, barra: o.barra, conta: o.conta, pulso: o.pulso })}>${html}</div>`;
  },
  /* captura num cartao com pan: h.card(0, 4, 'holoscan', { top: 600, kb: '0,-500' }) */
  card(a, b, nome, o = {}) {
    const w = o.w ?? 900, hh = o.h ?? 1080, left = o.left ?? (W - w) / 2;
    return `<div class="card ${o.cls ?? ''}" style="${est({ top: o.top ?? 620, left, width: w, height: hh })};${o.css ?? ''}"${at({ in: a, out: b, a: o.a ?? 'sobe', sai: o.sai, fi: o.fi, fo: o.fo, zoom: o.zoom })}>` +
      `<img src="${img(nome)}" style="width:${o.iw ?? w}px"${at({ kb: o.kb ?? '0,0', 'kb-in': a, 'kb-out': b })}></div>`;
  },
  /* celular com a captura rolando dentro */
  cel(a, b, nome, o = {}) {
    const esc = o.esc ?? 1, w = 640 * esc, hh = 1240 * esc, left = o.left ?? (W - w) / 2;
    return `<div class="cel" style="${est({ top: o.top ?? 560, left, width: w, height: hh, 'border-radius': 78 * esc, padding: 20 * esc })};${o.css ?? ''}"${at({ in: a, out: b, a: o.a ?? 'sobe', sai: o.sai, fi: o.fi, fo: o.fo, zoom: o.zoom })}>` +
      `<div class="cel-tela" style="border-radius:${60 * esc}px;background:${o.fundo ?? '#f4ecdc'}"><img src="${img(nome)}" style="width:${w - 40 * esc}px"${at({ kb: o.kb ?? '0,0', 'kb-in': o.kbIn ?? a, 'kb-out': o.kbOut ?? b })}></div><i class="cel-ilha"></i></div>`;
  },
  /* conversa de WhatsApp (baloes) */
  zap(a, b, nome, msgs, o = {}) {
    return `<div class="zap" style="${est({ top: o.top ?? 620 })}"${at({ in: a, out: b, a: o.a ?? 'sobe' })}><div class="zap-topo"><i></i><span>${nome}<small>online</small></span></div><div class="zap-corpo">` +
      msgs.map(([t, txt, hora, eu]) => `<div class="balao${eu ? ' eu' : ''}"${at({ in: t, out: b, a: 'pop', fi: .35 })}>${txt}<small>${hora}${eu ? ' ✓✓' : ''}</small></div>`).join('') + '</div></div>';
  }
};

/* ---------------------------------------------------------------- CSS base */
const CSS_BASE = `
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--fundo)}
[data-in]{position:absolute;opacity:0;will-change:opacity,transform}
.serif{font-family:'Cormorant Garamond',serif;font-weight:500}
.sans{font-family:'Jost',sans-serif}
.t{line-height:1.1;text-align:center}
em{font-style:italic;color:var(--destaque)}
b{font-weight:600}
.card{border-radius:34px;overflow:hidden;background:#f6f0e4;box-shadow:0 40px 90px rgba(0,0,0,.45),0 0 0 2px var(--moldura)}
.card img,.cel-tela img{position:absolute;left:0;top:0}
.cel{background:#0e1411;box-shadow:0 50px 100px rgba(0,0,0,.5),inset 0 0 0 3px #2b322e}
.cel-tela{position:relative;width:100%;height:100%;overflow:hidden;background:#f4ecdc}
.cel-ilha{position:absolute;top:34px;left:50%;width:150px;height:40px;margin-left:-75px;border-radius:30px;background:#0e1411}
.zap{left:150px;width:780px;height:900px;border-radius:44px;overflow:hidden;background:#e9e1d4;box-shadow:0 40px 90px rgba(0,0,0,.4)}
.zap-topo{height:120px;background:#1f3b30;display:flex;align-items:center;gap:22px;padding:0 34px;color:#fff;font-family:'Jost',sans-serif;font-size:34px}
.zap-topo i{width:66px;height:66px;border-radius:50%;background:linear-gradient(135deg,#c9a35a,#e3c88e)}
.zap-topo small{display:block;font-size:22px;opacity:.7}
.zap-corpo{position:relative;padding:30px}
.zap .balao{position:relative;opacity:0;margin:0 0 22px;max-width:560px;background:#fff;border-radius:8px 30px 30px 30px;padding:22px 28px;font-family:'Jost',sans-serif;font-size:34px;line-height:1.3;color:#1d2a24;box-shadow:0 3px 8px rgba(0,0,0,.08)}
.zap .balao.eu{margin-left:auto;background:#d8f0c8;border-radius:30px 8px 30px 30px}
.zap .balao small{display:block;text-align:right;font-size:21px;color:#7d8a83;margin-top:4px}
.logo{left:50%;margin-left:-110px;width:220px}
.pill{font-family:'Jost',sans-serif;font-size:32px;letter-spacing:8px;text-transform:uppercase;color:var(--destaque);border:2px solid var(--moldura);border-radius:60px;padding:16px 0;text-align:center}
.cta{left:200px;right:200px;text-align:center;font-family:'Jost',sans-serif;font-size:40px;letter-spacing:4px;text-transform:uppercase;color:#0a2e22;background:linear-gradient(90deg,#c9a35a,#e3c88e);border-radius:80px;padding:30px 0;font-weight:600;box-shadow:0 20px 50px rgba(201,163,90,.35)}
.linha{height:3px;background:var(--moldura)}
.selo{font-family:'Jost',sans-serif;font-size:26px;letter-spacing:9px;text-transform:uppercase;color:var(--moldura);text-align:center;left:0;right:0}
.whats{left:150px;right:150px;background:#1f3b30;border-radius:26px;padding:22px 30px;display:flex;align-items:center;gap:22px;font-family:'Jost',sans-serif;color:#fff;font-size:32px;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.whats b{display:inline-block;background:#c9a35a;color:#0a2e22;border-radius:12px;padding:8px 14px;font-size:24px;letter-spacing:2px}
.chip{font-family:'Jost',sans-serif;font-size:32px;font-weight:500;color:#0a2e22;background:#fff;border-radius:60px;padding:18px 34px;box-shadow:0 14px 34px rgba(10,46,34,.18);white-space:nowrap}
.chip:before{content:'✓ ';color:#b08a3e;font-weight:700}
.nota{font-family:'Jost',sans-serif;font-size:22px;letter-spacing:2px;color:rgba(255,255,255,.55);left:0;right:0;text-align:center}
`;

/* ---------------------------------------------------------------- animacao (roda no navegador) */
const RENDER_JS = `
const ease = x => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.pow(1 - x, 3);
const back = x => { if (x <= 0) return 0; if (x >= 1) return 1; const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const els = [...document.querySelectorAll('[data-in]')];
const kbs = [...document.querySelectorAll('[data-kb]')];
for (const el of els) if (el.dataset.a === 'digita') { el.dataset.txt = el.innerHTML; }
window.render = (t) => {
  for (const el of els) {
    const a = +el.dataset.in, b = +el.dataset.out;
    if (t < a - .01 || t > b + .01) { if (el.style.opacity !== '0') el.style.opacity = 0; continue; }
    const k = el.dataset.a, fi = el.dataset.fi !== undefined ? +el.dataset.fi : (k === 'digita' ? 0.01 : 0.7), fo = el.dataset.fo !== undefined ? +el.dataset.fo : 0.45;
    const pin = fi <= 0.01 ? 1 : Math.min(1, Math.max(0, (t - a) / fi)), ein = ease(pin), pout = fo <= 0.01 ? 1 : Math.min(1, Math.max(0, (b - t) / fo)), eout = ease(pout);
    let op = Math.min(k === 'mascara' || k === 'digita' ? 1 : ein, eout), tr = '', filtro = '', clip = '';
    if (k === 'sobe') tr = 'translateY(' + (1 - ein) * 50 + 'px)';
    else if (k === 'desce') tr = 'translateY(' + (ein - 1) * 50 + 'px)';
    else if (k === 'zoom') tr = 'scale(' + (0.92 + 0.08 * ein) + ')';
    else if (k === 'pop') tr = 'scale(' + (0.6 + 0.4 * back(pin)) + ')';
    else if (k === 'esq') tr = 'translateX(' + (1 - ein) * -140 + 'px)';
    else if (k === 'dir') tr = 'translateX(' + (1 - ein) * 140 + 'px)';
    else if (k === 'desfoque') { filtro = 'blur(' + (1 - ein) * 18 + 'px)'; tr = 'scale(' + (1.06 - .06 * ein) + ')'; }
    else if (k === 'mascara') clip = 'inset(0 ' + (100 - 100 * ein) + '% 0 0)';
    else if (k === 'digita') { const s = el.dataset.txt, n = Math.floor(Math.min(1, Math.max(0, (t - a) / (s.length * 0.045))) * s.length); el.innerHTML = s.slice(0, n) + (n < s.length && Math.floor(t * 3) % 2 ? '|' : '&nbsp;'); }
    const sai = el.dataset.sai;
    if (sai && b - t < fo) { const q = 1 - eout; if (sai === 'sobe') tr += ' translateY(' + (-q * 60) + 'px)'; if (sai === 'zoom') tr += ' scale(' + (1 + q * .12) + ')'; if (sai === 'esq') tr += ' translateX(' + (-q * 160) + 'px)'; if (sai === 'desfoque') filtro += ' blur(' + q * 16 + 'px)'; }
    if (el.dataset.zoom) { const [z0, z1] = el.dataset.zoom.split(',').map(Number); tr += ' scale(' + (z0 + (z1 - z0) * Math.min(1, Math.max(0, (t - a) / (b - a)))) + ')'; }
    if (el.dataset.pulso !== undefined) tr += ' scale(' + (1 + .025 * Math.sin((t - a) * 2.2)) + ')';
    if (el.dataset.barra) { const [p0, p1] = el.dataset.barra.split(',').map(Number); el.style.width = (p0 + (p1 - p0) * ease(Math.min(1, Math.max(0, (t - a - .3) / 1.6)))) + '%'; }
    if (el.dataset.conta) { const [c0, c1, dec] = el.dataset.conta.split(',').map(Number); const v = c0 + (c1 - c0) * ease(Math.min(1, Math.max(0, (t - a) / 1.5))); el.textContent = v.toFixed(dec || 0).replace('.', ','); }
    el.style.opacity = op; el.style.transform = tr; el.style.filter = filtro; el.style.clipPath = clip;
  }
  for (const im of kbs) {
    const kb = im.dataset.kb, a = +im.dataset.kbIn, b = +im.dataset.kbOut;
    let y0, y1;
    if (kb.startsWith('auto')) { const fr = kb.includes(':') ? +kb.split(':')[1] : 1, max = Math.max(0, im.offsetHeight - im.parentElement.clientHeight); y0 = 0; y1 = -max * fr; }   /* auto: rola ate o fim (ou fracao) */
    else [y0, y1] = kb.split(',').map(Number);
    const p = Math.min(1, Math.max(0, (t - a) / (b - a))), s = p * p * (3 - 2 * p);
    im.style.transform = 'translateY(' + (y0 + (y1 - y0) * s) + 'px)';
  }
};`;

export function montarHtml(v) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS_BASE}${v.tema}</style></head><body>${v.corpo(h)}<script>${RENDER_JS}</script></body></html>`;
}

/* ---------------------------------------------------------------- render */
export async function renderizar(v, { saida, quadros = [] } = {}) {
  prepararTelas();
  const dir = AQUI + 'saida/' + v.id + '/'; mkdirSync(dir, { recursive: true });
  writeFileSync(dir + 'video.html', montarHtml(v));
  const puppeteer = (await import(R + 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).default;
  const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const P = await nav.newPage();
  await P.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const erros = []; P.on('pageerror', e => erros.push(e.message));
  await P.goto('file://' + dir + 'video.html', { waitUntil: 'networkidle0' });
  await P.evaluateHandle('document.fonts.ready');
  if (erros.length) throw new Error(v.id + ': ' + erros.join(' | '));
  if (quadros.length) {
    mkdirSync(dir + 'quadros', { recursive: true });
    for (const t of quadros) { await P.evaluate(t => window.render(t), t); await P.screenshot({ path: dir + 'quadros/q-' + t.toFixed(1).padStart(6, '0') + '.jpg', type: 'jpeg', quality: 80 }); }
    await nav.close(); return dir + 'quadros/';
  }
  const trilha = dir + 'trilha.wav';
  execFileSync('python3', [AQUI + 'trilhas.py', JSON.stringify({ estilo: v.estilo, dur: v.dur, energia: v.energia, marcas: v.marcas }), trilha], { stdio: 'inherit' });
  const arq = saida || dir + v.id + '.mp4';
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', trilha,
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', arq], { stdio: ['pipe', 'inherit', 'inherit'] });
  const total = Math.round(v.dur * FPS);
  for (let f = 0; f < total; f++) {
    await P.evaluate(t => window.render(t), f / FPS);
    const buf = await P.screenshot({ type: 'jpeg', quality: 90 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 600 === 0) console.log(v.id, 'quadro', f, '/', total);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await nav.close();
  return arq;
}
