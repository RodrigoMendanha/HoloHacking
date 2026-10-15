/**
 * VIDEO INSTAGRAM HOLOHACKING (60 s, vertical 1080x1920, 30 fps) — texto em tela + trilha original (trilha.py), sem locucao.
 * Telas REAIS do sistema com paciente/nutricionista FICTICIAS (capturadores: scripts/video-holohacking-comercial/capturar.mjs
 * com VIDEO_LARGURA=celular, e scripts/apresentacao-comercial/capturar.mjs).
 *   python3 scripts/video-instagram-60s/trilha.py scripts/video-instagram-60s/saida/trilha.wav
 *   node scripts/video-instagram-60s/compor.mjs [saida.mp4] [--quadros=3,12,30]
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
const AQUI = new URL('./', import.meta.url).pathname;
const R = new URL('../../', import.meta.url).pathname;
const puppeteer = (await import(R + 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).default;
const SAIDA = AQUI + 'saida/'; mkdirSync(SAIDA, { recursive: true });
const arq = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : SAIDA + 'holohacking-instagram-60s.mp4';
const soQuadros = (process.argv.find(x => x.startsWith('--quadros=')) || '').slice(10).split(',').filter(Boolean).map(Number);
const W = 1080, H = 1920, FPS = 30, DUR = 60;

/* recortes das telas (px das capturas) */
const CEL = R + 'scripts/video-holohacking-comercial/telas-celular/', APR = R + 'scripts/apresentacao-comercial/telas/', T = AQUI + 'telas/';
mkdirSync(T, { recursive: true });
const CORTES = {
  mapeamento: [CEL + 'a03b-mapeamento-conteudo.png', [0, 1640, 855, 3000]],
  holoscan: [CEL + 'a05-holoscan-pagina.png', [0, 1330, 980, 3420]],
  corpo: [CEL + 'a04-secao-corpo.png', [0, 0, 1080, 2250]],
  playbook: [APR + 'playbook-3-estrategias.png', [0, 270, 620, 2050]],
  documento: [CEL + 'p1-paciente-documento.png', [0, 0, 980, 3000]],
  ficha: [CEL + 'a02-ficha-visao.png', [0, 0, 1080, 2250]]
};
for (const [, [f]] of Object.entries(CORTES)) if (!existsSync(f)) throw new Error('falta ' + f + ' (rode os capturadores)');
execFileSync('python3', ['-I', '-c', `
import sys, json
from PIL import Image
c = json.loads(sys.argv[1]); out = sys.argv[2]
for n, (f, box) in c.items():
    im = Image.open(f).convert('RGB').crop(tuple(box))
    im = im.resize((900, int(im.height * 900 / im.width)), Image.LANCZOS)
    im.save(out + n + '.jpg', quality=90)
`, JSON.stringify(CORTES), T]);
const img = (n) => 'file://' + T + n + '.jpg';
const LOGO = 'file://' + R + 'logo-holohacking.png';

/* ---------------- cenas (tempos em segundos) ----------------
   data-in / data-out: janela do elemento; data-a: tipo de entrada (sobe | fade | zoom | esq); data-kb: "y0,y1" pan da imagem */
const flash = (i, t0, rot, sub, im, kb) => `
<div class="flash" data-in="${t0}" data-out="${t0 + 2.67}" data-a="fade">
  <p class="fl-num">${String(i).padStart(2, '0')}</p><p class="fl-rot">${rot}</p><p class="fl-sub">${sub}</p>
  <div class="fl-card"><img src="${img(im)}" data-kb="${kb}" data-kb-in="${t0}" data-kb-out="${t0 + 2.67}"></div>
</div>`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root{--verde:#0a2e22;--ouro:#c9a35a;--ouro2:#e3c88e;--creme:#f4ecdc}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#071f17}
.bg{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,#184a37 0%,#0c3326 45%,#071f17 100%)}
.bg2{position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 100%,rgba(201,163,90,.14),transparent 70%)}
.frio{position:absolute;inset:0;background:linear-gradient(180deg,#e9edf0,#d5dbe0)}
[data-in]{position:absolute;opacity:0;will-change:opacity,transform}
.serif{font-family:'Cormorant Garamond',serif;font-weight:500}
.sans{font-family:'Jost',sans-serif}
.t{left:80px;right:80px;text-align:center;color:var(--creme);text-shadow:0 2px 20px rgba(0,0,0,.35)}
.t1{font-size:96px;line-height:1.05}
.t2{font-size:74px;line-height:1.1}
.t3{font-size:58px;line-height:1.18}
em{font-style:italic;color:var(--ouro2)}
.escuro{color:#22302a;text-shadow:none}.escuro em{color:#9a7a2e}
/* planilha */
.planilha{left:90px;right:90px;top:620px;background:#fff;border-radius:22px;box-shadow:0 30px 60px rgba(0,0,0,.12);padding:34px 40px;font-family:'Jost',sans-serif;color:#5d6770}
.planilha table{width:100%;border-collapse:collapse;font-size:34px}
.planilha th{text-align:left;font-size:24px;letter-spacing:3px;text-transform:uppercase;color:#98a2ab;padding:10px 6px;border-bottom:2px solid #e1e5e8}
.planilha td{padding:16px 6px;border-bottom:1px solid #eef0f2}.planilha td.n{text-align:right;font-variant-numeric:tabular-nums}
/* celular */
.cel{left:190px;width:700px;top:640px;height:1060px;background:#0f1512;border-radius:70px;padding:22px;box-shadow:0 40px 90px rgba(0,0,0,.55)}
.cel-tela{width:100%;height:100%;border-radius:52px;background:#ece5da;overflow:hidden;position:relative}
.cel-topo{height:130px;background:#1f3b30;display:flex;align-items:flex-end;padding:0 34px 24px;gap:20px;color:#fff;font-family:'Jost',sans-serif;font-size:34px}
.cel-topo i{width:62px;height:62px;border-radius:50%;background:#c9a35a;display:block}
.balao{left:30px;max-width:540px;background:#fff;border-radius:8px 30px 30px 30px;padding:24px 30px;font-family:'Jost',sans-serif;font-size:36px;line-height:1.3;color:#1d2a24;box-shadow:0 3px 8px rgba(0,0,0,.08)}
.balao small{display:block;text-align:right;font-size:22px;color:#8a948f;margin-top:6px}
/* palavras */
.palavra{left:0;right:0;text-align:center;font-size:84px;color:var(--ouro2)}
/* logo e triade */
.logo{left:50%;margin-left:-110px;width:220px}
.pill{font-family:'Jost',sans-serif;font-size:34px;letter-spacing:9px;text-transform:uppercase;color:var(--ouro2);border:2px solid var(--ouro);border-radius:60px;padding:16px 0;width:300px;text-align:center}
/* flashes */
.flash{inset:0}
.fl-num{position:absolute;top:210px;left:0;right:0;text-align:center;font-family:'Jost',sans-serif;font-size:28px;letter-spacing:10px;color:var(--ouro)}
.fl-rot{position:absolute;top:260px;left:60px;right:60px;text-align:center;font-family:'Cormorant Garamond',serif;font-weight:500;font-size:84px;line-height:1.05;color:var(--creme)}
.fl-sub{position:absolute;top:470px;left:80px;right:80px;text-align:center;font-family:'Jost',sans-serif;font-weight:300;font-size:38px;color:#d9d1bc}
.fl-card{position:absolute;top:620px;left:90px;width:900px;height:1080px;border-radius:34px;overflow:hidden;background:#f6f0e4;box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 2px rgba(201,163,90,.6)}
.fl-card img{position:absolute;left:0;top:0;width:900px}
.topo-fixo{top:110px;left:0;right:0;text-align:center;font-family:'Jost',sans-serif;font-size:26px;letter-spacing:8px;text-transform:uppercase;color:#8fa197}
.whats{left:150px;right:150px;top:1580px;background:#1f3b30;border-radius:26px;padding:22px 30px;display:flex;align-items:center;gap:22px;font-family:'Jost',sans-serif;color:#fff;font-size:32px;box-shadow:0 20px 50px rgba(0,0,0,.45)}
.whats b{display:inline-block;background:#c9a35a;color:#0a2e22;border-radius:12px;padding:8px 14px;font-size:24px;letter-spacing:2px}
/* beneficio */
.doc{left:140px;width:800px;top:760px;height:1000px;border-radius:30px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.6)}
.doc img{width:800px;position:absolute;left:0;top:0}
.veu{inset:0;background:linear-gradient(180deg,rgba(7,31,23,.92) 0%,rgba(7,31,23,.55) 50%,rgba(7,31,23,.92) 100%)}
.ouro{color:var(--ouro2)}
.cta{left:220px;right:220px;text-align:center;font-family:'Jost',sans-serif;font-size:40px;letter-spacing:4px;text-transform:uppercase;color:#0a2e22;background:linear-gradient(90deg,#c9a35a,#e3c88e);border-radius:80px;padding:30px 0;font-weight:600}
.linha{left:440px;width:200px;height:2px;background:var(--ouro)}
</style></head><body>
<div class="bg"></div><div class="bg2"></div>

<!-- 1 · 0-4 planilha -->
<div class="frio" data-in="0" data-out="4.2" data-a="fade" data-fi="0"></div>
<div class="planilha" data-in="0" data-out="4.2" data-a="fade" data-fi="0" data-zoom="1,1.08">
<table><tr><th>Refeição</th><th style="text-align:right">kcal</th><th style="text-align:right">Prot.</th></tr>
<tr><td>Café da manhã</td><td class="n">320</td><td class="n">18 g</td></tr><tr><td>Lanche</td><td class="n">150</td><td class="n">6 g</td></tr>
<tr><td>Almoço</td><td class="n">540</td><td class="n">32 g</td></tr><tr><td>Lanche</td><td class="n">180</td><td class="n">9 g</td></tr>
<tr><td>Jantar</td><td class="n">430</td><td class="n">27 g</td></tr><tr><td><b>Total</b></td><td class="n"><b>1.620</b></td><td class="n"><b>92 g</b></td></tr></table></div>
<p class="t serif t2 escuro" style="top:300px" data-in="0.4" data-out="4.2" data-a="sobe">Seu paciente</p>
<p class="t serif t1 escuro" style="top:400px" data-in="1.3" data-out="4.2" data-a="sobe"><em>não é uma planilha.</em></p>

<!-- 2 · 4-10 desistiu -->
<p class="t serif t2" style="top:260px" data-in="4.4" data-out="10" data-a="sobe">A dieta estava certa.</p>
<p class="t serif t2" style="top:380px" data-in="6.9" data-out="10" data-a="sobe"><em>Então por que ele desistiu?</em></p>
<div class="cel" data-in="4.6" data-out="10" data-a="sobe"><div class="cel-tela"><div class="cel-topo"><i></i>Paciente</div>
<div class="balao" style="top:180px;opacity:1;position:absolute" data-in="5.4" data-out="10" data-a="fade">Fiz tudo certinho na primeira semana…<small>21:47</small></div>
<div class="balao" style="top:380px;position:absolute" data-in="6.3" data-out="10" data-a="fade">mas não consegui seguir 😔<small>21:48</small></div>
<div class="balao" style="top:540px;position:absolute" data-in="7.6" data-out="10" data-a="fade">acho que vou parar por um tempo<small>21:48</small></div>
</div></div>

<!-- 3 · 10-17 o ser humano -->
<p class="t serif t3" style="top:360px" data-in="10.3" data-out="17" data-a="sobe">Porque ninguém olhou para</p>
<p class="t serif t2" style="top:450px" data-in="10.9" data-out="17" data-a="sobe"><em>o ser humano por trás do prato.</em></p>
<p class="palavra serif" style="top:860px" data-in="12.2" data-out="17" data-a="zoom">a rotina</p>
<p class="palavra serif" style="top:1010px" data-in="13.3" data-out="17" data-a="zoom">as emoções</p>
<p class="palavra serif" style="top:1160px" data-in="14.4" data-out="17" data-a="zoom">o que dá sentido</p>
<p class="palavra serif" style="top:1260px" data-in="14.4" data-out="17" data-a="zoom">à vida dele</p>

<!-- 4 · 17-24 posicionamento -->
<p class="t serif t2" style="top:560px" data-in="17.3" data-out="19.9" data-a="sobe">Muitos softwares<br><em>calculam dietas.</em></p>
<img class="logo" src="${LOGO}" style="top:420px" data-in="19.9" data-out="24" data-a="zoom">
<p class="t serif t2" style="top:720px" data-in="20.3" data-out="24" data-a="sobe">Só o HoloHacking cuida do<br><em>ser humano inteiro.</em></p>
<div style="left:390px;top:1100px" class="pill" data-in="21.6" data-out="24" data-a="sobe">Corpo</div>
<div style="left:390px;top:1220px" class="pill" data-in="22.1" data-out="24" data-a="sobe">Mente</div>
<div style="left:390px;top:1340px" class="pill" data-in="22.6" data-out="24" data-a="sobe">Espírito</div>

<!-- 5 · 24-40 o que tem (flashes) -->
<p class="topo-fixo" data-in="24" data-out="40" data-a="fade">Tudo em um só lugar</p>
${flash(1, 24.0, 'Mapeamento Holístico', 'O paciente responde antes da consulta', 'mapeamento', '0,-260')}
${flash(2, 26.67, 'HOLOSCAN', 'Descubra por onde começar', 'holoscan', '0,-560')}
${flash(3, 29.34, 'Corpo · Mente · Espírito', 'Ferramentas que vão além do prato', 'corpo', '0,-500')}
${flash(4, 32.01, 'Plano pronto em minutos', 'Foco e estratégias com o Playbook', 'playbook', '0,-900')}
${flash(5, 34.68, 'Com a sua marca', 'Direto no WhatsApp do paciente', 'documento', '0,-700')}
<div class="whats" data-in="35.4" data-out="37.3" data-a="sobe"><b>PDF</b><span>Resultado HOLOS enviado ✓✓</span></div>
${flash(6, 37.35, 'Agenda e ficha completa', 'Seu consultório organizado', 'ficha', '0,-640')}

<!-- 6 · 40-52 beneficio -->
<div class="doc" data-in="40" data-out="47.5" data-a="fade"><img src="${img('documento')}" data-kb="0,-700" data-kb-in="40" data-kb-out="47.5"></div>
<div class="veu" data-in="40" data-out="47.5" data-a="fade"></div>
<p class="t serif t2" style="top:330px" data-in="40.5" data-out="44" data-a="sobe">Paciente que entende,</p>
<p class="t serif t1" style="top:440px" data-in="41.3" data-out="44" data-a="sobe"><em>se engaja.</em></p>
<p class="t serif t2" style="top:330px" data-in="44.2" data-out="47.4" data-a="sobe">Paciente que se engaja,</p>
<p class="t serif t1" style="top:440px" data-in="45" data-out="47.4" data-a="sobe"><em>volta.</em></p>
<p class="t serif t1" style="top:640px" data-in="47.7" data-out="52" data-a="zoom">Mais <em>adesão.</em></p>
<p class="t serif t1" style="top:790px" data-in="48.6" data-out="52" data-a="zoom">Mais <em>fidelização.</em></p>
<p class="t sans" style="top:1010px;font-size:38px;font-weight:300;color:#d9d1bc" data-in="49.6" data-out="52" data-a="fade">Um atendimento que nenhuma<br>calculadora de dieta entrega.</p>

<!-- 7 · 52-60 final -->
<img class="logo" src="${LOGO}" style="top:420px" data-in="52.3" data-out="61" data-a="zoom">
<p class="t serif" style="top:690px;font-size:110px" data-in="52.8" data-out="61" data-a="sobe">HoloHacking</p>
<div class="linha" style="top:860px" data-in="53.4" data-out="61" data-a="fade"></div>
<p class="t serif t3" style="top:910px" data-in="53.6" data-out="61" data-a="sobe">Nutrição que cuida do<br><em>ser humano inteiro.</em></p>
<p class="t sans" style="top:1130px;font-size:30px;letter-spacing:10px;color:#c9a35a" data-in="54.6" data-out="61" data-a="fade">CORPO · MENTE · ESPÍRITO</p>
<div class="cta" style="top:1330px" data-in="55.6" data-out="61" data-a="sobe">Chame no direct</div>

<script>
const ease = x => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
const els = [...document.querySelectorAll('[data-in]')];
const kbs = [...document.querySelectorAll('[data-kb]')];
window.render = (t) => {
  for (const el of els) {
    const a = +el.dataset.in, b = +el.dataset.out, fi = el.dataset.fi !== undefined ? +el.dataset.fi : 0.7;
    const ein = fi === 0 ? 1 : ease((t - a) / fi), eout = ease((b - t) / 0.45);
    const v = t < a || t > b ? 0 : Math.min(ein, eout);
    el.style.opacity = v;
    const k = el.dataset.a; let tr = '';
    if (k === 'sobe') tr = 'translateY(' + (1 - ein) * 40 + 'px)';
    if (k === 'zoom') tr = 'scale(' + (0.94 + 0.06 * ein) + ')';
    if (el.dataset.zoom) { const [z0, z1] = el.dataset.zoom.split(',').map(Number); tr += ' scale(' + (z0 + (z1 - z0) * Math.min(1, Math.max(0, (t - a) / (b - a)))) + ')'; }
    el.style.transform = tr;
  }
  for (const im of kbs) {
    const [y0, y1] = im.dataset.kb.split(',').map(Number), a = +im.dataset.kbIn, b = +im.dataset.kbOut;
    const p = Math.min(1, Math.max(0, (t - a) / (b - a))), s = p * p * (3 - 2 * p);
    im.style.transform = 'translateY(' + (y0 + (y1 - y0) * s) + 'px)';
  }
};
</script></body></html>`;
writeFileSync(SAIDA + 'video.html', html);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const P = await nav.newPage();
await P.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await P.goto('file://' + SAIDA + 'video.html', { waitUntil: 'networkidle0' });
await P.evaluateHandle('document.fonts.ready');

if (soQuadros.length) {
  mkdirSync(SAIDA + 'quadros', { recursive: true });
  for (const t of soQuadros) { await P.evaluate(t => window.render(t), t); await P.screenshot({ path: SAIDA + 'quadros/q-' + t + '.png' }); }
  await nav.close(); console.log('quadros em', SAIDA + 'quadros'); process.exit(0);
}
const trilha = SAIDA + 'trilha.wav';
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
  ...(existsSync(trilha) ? ['-i', trilha, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', arq], { stdio: ['pipe', 'inherit', 'inherit'] });
const total = DUR * FPS;
for (let f = 0; f < total; f++) {
  await P.evaluate(t => window.render(t), f / FPS);
  const buf = await P.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (f % 300 === 0) console.log('quadro', f, '/', total);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await nav.close();
console.log('video:', arq);
