/**
 * AUDITORIA DE UI (rodada UX 14/10): percorre as telas principais com uma paciente FICTICIA (fixture do template 5 +
 * analise HOLOS AI importada), nos temas claro e escuro, em 1440 e 390 px, e mede:
 *   - CONTRASTE de todo texto visivel (WCAG: 4,5:1; 3:1 para texto grande), contra o fundo efetivo (cores compostas);
 *   - ROLAGEM LATERAL indevida (scrollWidth > largura da janela);
 *   - ERROS de JavaScript na pagina.
 * AUDITAR=1 so relata (lista os piores casos por tela). Sem AUDITAR, falha se houver rolagem lateral, erro de JS ou
 * texto abaixo do limite nas telas auditadas. SHOT_DIR=<pasta> grava uma captura por tela/tema/largura.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';
import { readFileSync } from 'node:fs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SO_RELATA = !!process.env.AUDITAR;
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia 1', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA);
const { PA, E1 } = fx;
const EXEMPLO = readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1440, height: 1000 });
await P.emulateTimezone('America/Sao_Paulo');
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await P.addStyleTag({ content: '*{transition:none!important;animation:none!important;scroll-behavior:auto!important}' });
/* analise HOLOS AI importada e Resultado pronto (o mesmo caminho da tela) */
await P.evaluate(async (pid, eid, t) => {
  window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) { /* */ }
  const r = await window.supabaseClient.rpc('importar_holos_ai', { p_encounter_id: eid, p_texto: t });
  await window.supabaseClient.rpc('aceitar_importacao_holos_ai', { p_import_id: r.data.id });
  await window.HolosAIPonte.carregar(pid);
  const imp = window.HolosAIPonte.estado().cache.imports[0];
  await window.ResultadoHolos.gerarAutomatico(imp, window.HolosAIPonte.itensDe(imp.id));
}, PA, E1, EXEMPLO);

/* telas: [nome, como abrir] */
const secao = (s) => async () => { await P.evaluate((s, pid) => { window.definirPacienteAtivo(pid); window.irParaSecao(s); }, s, PA); await espera(900); };
const aba = (a) => async () => { await P.evaluate((a, pid) => { window.levarParaFicha('aba:' + a, pid); }, a, PA); await espera(1000); };
const TELAS = [
  ['dashboard', secao('dashboard')], ['pacientes', async () => { await P.evaluate(() => window.irParaSecao('pacientes')); await espera(700); }],
  ['ficha-visao', aba('visao')], ['ficha-atendimentos', aba('consultas')], ['ficha-mapeamento', aba('anamnese')], ['ficha-holoscan', aba('holoscan')],
  ['ficha-ferramentas', aba('ferramentas')], ['ficha-evolucao', aba('evolucao')], ['ficha-holos-ai', aba('holos-ai')], ['ficha-resultado-holos', aba('resultado-holos')],
  ['secao-holoscan', secao('holoscan')], ['secao-corpo', secao('corpo')], ['secao-mente', secao('mente')], ['secao-espirito', secao('espirito')],
  ['secao-resultado', secao('resultado')], ['agenda', secao('agenda')], ['perfil', secao('perfil')]
];

/* contraste por PIXEL: (1) lista os textos visiveis com a cor composta; (2) fotografa a tela com todo texto
   transparente; (3) o fundo de cada texto e a mediana dos pixels da caixa dele nessa foto. Pega degrade, imagem,
   pseudo-elemento e camada — o fundo que a pessoa ve de fato. So o que esta na janela (rola a pagina por partes). */
async function medir() {
  const larg = await P.evaluate(() => ({ larg: document.documentElement.scrollWidth, janela: window.innerWidth, alto: document.documentElement.scrollHeight, vh: window.innerHeight }));
  const ruins = new Map();
  for (let y = 0; y < Math.min(larg.alto, 6000); y += larg.vh) {
    await P.evaluate((y) => { document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo({ top: y, behavior: 'instant' }); }, y); await espera(150);
    const textos = await P.evaluate(() => {
      const parse = (c) => { const m = String(c).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
      const out = [];
      document.querySelectorAll('[data-aud-i]').forEach(e => e.removeAttribute('data-aud-i'));
      document.querySelectorAll('body *').forEach((el) => {
        if (['SCRIPT', 'STYLE', 'svg', 'SVG', 'path', 'OPTION', 'TEXTAREA', 'INPUT', 'SELECT'].includes(el.tagName)) return;
        const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
        if (!txt || txt.length < 2) return;
        const r0 = el.getBoundingClientRect();
        /* recorta pela area visivel dos ancestrais com overflow (faixa de abas/filtros com rolagem lateral) */
        let L = r0.left, T = r0.top, R = r0.right, B = r0.bottom;
        for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
          const sa = getComputedStyle(a); if (sa.overflowX === 'visible' && sa.overflowY === 'visible') continue;
          const ra = a.getBoundingClientRect(); L = Math.max(L, ra.left); T = Math.max(T, ra.top); R = Math.min(R, ra.right); B = Math.min(B, ra.bottom);
        }
        const r = { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T };
        if (r.width < 4 || r.height < 6 || r.bottom <= 0 || r.right <= 0 || r.top >= innerHeight || r.left >= innerWidth) return;
        /* encoberto (topo fixo, barra de abas grudada, modal): nao e o texto que a pessoa esta lendo agora */
        const topo = document.elementFromPoint(r.left + Math.min(r.width, innerWidth) / 2, r.top + r.height / 2);
        if (!topo || !(topo === el || el.contains(topo))) return;
        const s = getComputedStyle(el);
        if (s.visibility === 'hidden') return;
        if (el.closest('[aria-hidden="true"], .sr-only, .hai-sr, [disabled], [aria-disabled="true"], details:not([open]) > :not(summary)')) return;
        let op = 1; for (let e = el; e; e = e.parentElement) op *= Number(getComputedStyle(e).opacity);
        if (op < 0.05) return;
        const c = parse(s.color); if (!c) return;
        const tam = parseFloat(s.fontSize), negrito = Number(s.fontWeight) >= 700;
        const id = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
        el.setAttribute('data-aud-i', out.length);
        out.push({ id, txt: txt.slice(0, 40), cor: s.color, c: { ...c, a: c.a * op }, x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, innerWidth - Math.max(0, r.left)), h: Math.min(r.height, innerHeight - Math.max(0, r.top)), limite: tam >= 24 || (tam >= 18.66 && negrito) ? 3 : 4.5 });
      });
      return out;
    });
    if (!textos.length) continue;
    await P.addStyleTag({ content: '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important} #__aud{display:none}' }).then(h => h.evaluate(e => e.id = '__aud_estilo'));
    const foto = await P.screenshot({ encoding: 'base64', captureBeyondViewport: false });
    if (process.env.FOTO_SEM_TEXTO) (await import('node:fs')).writeFileSync(process.env.FOTO_SEM_TEXTO + '/' + Date.now() + '.png', Buffer.from(foto, 'base64'));
    await P.evaluate(() => { const e = document.getElementById('__aud_estilo'); if (e) e.remove(); });
    /* faixa com rolagem lateral (abas, filtros) pode se mover entre a medida e a foto: o texto que mudou de lugar
       nao tem o fundo certo na foto — fica de fora desta passada (nao e o que a pessoa ve) */
    const movidos = await P.evaluate((textos) => textos.map((t, i) => { const el = document.querySelector('[data-aud-i="' + i + '"]'); if (!el) return true;
      const r = el.getBoundingClientRect(); return Math.abs(Math.max(0, r.left) - t.x) > 2 || Math.abs(Math.max(0, r.top) - t.y) > 2; }), textos);
    for (let i = textos.length - 1; i >= 0; i--) if (movidos[i]) textos.splice(i, 1);
    const res = await P.evaluate(async (foto, textos) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + foto; await img.decode();
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
      const k = img.width / innerWidth;
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
      return textos.map(t => {
        const d = cx.getImageData(Math.round(t.x * k), Math.round(t.y * k), Math.max(1, Math.round(t.w * k)), Math.max(1, Math.round(t.h * k))).data;
        const px = []; for (let i = 0; i < d.length; i += 4 * 7) px.push([d[i], d[i + 1], d[i + 2]]);
        px.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
        const m = px[Math.floor(px.length / 2)] || [255, 255, 255];
        const f = { r: m[0], g: m[1], b: m[2] };
        const c = { r: t.c.r * t.c.a + f.r * (1 - t.c.a), g: t.c.g * t.c.a + f.g * (1 - t.c.a), b: t.c.b * t.c.a + f.b * (1 - t.c.a) };
        const l1 = lum(c), l2 = lum(f);
        return { ...t, razao: Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100, fundo: 'rgb(' + m.join(',') + ')' };
      });
    }, foto, textos);
    res.filter(r => r.razao + 0.01 < r.limite).forEach(r => { if (!ruins.has(r.id) || ruins.get(r.id).razao > r.razao) ruins.set(r.id, r); });
  }
  await P.evaluate(() => window.scrollTo(0, 0));
  return { ruins: [...ruins.values()].sort((a, b) => a.razao - b.razao), larg: larg.larg, janela: larg.janela };
}

const resumo = [];
for (const tema of ['claro', 'escuro']) {
  await P.evaluate((t) => window.definirAparencia(t), tema);
  for (const larg of [1440, 390]) {
    await P.setViewport({ width: larg, height: larg > 500 ? 1000 : 860 });
    for (const [nome, abrir] of TELAS) {
      if (process.env.TELAS && !new RegExp(process.env.TELAS).test(nome)) continue;   // so para depurar
      await abrir();
      const m = await medir();
      if (SHOT) await P.screenshot({ path: SHOT + '/' + nome + '-' + tema + '-' + larg + '.png', fullPage: false });
      resumo.push({ nome, tema, larg, ruins: m.ruins, lateral: m.larg > m.janela + 1 });
      if (SO_RELATA) {
        console.log('\n[' + tema + ' ' + larg + '] ' + nome + (m.larg > m.janela + 1 ? '  ROLAGEM LATERAL ' + m.larg + 'px' : '') + ' — ' + m.ruins.length + ' com contraste baixo');
        m.ruins.slice(0, 14).forEach(r => console.log('    ' + r.razao + ' (<' + r.limite + ')  ' + r.id + '  "' + r.txt + '"  ' + r.cor + ' sobre ' + r.fundo + (process.env.TELAS ? ' @' + [r.x, r.y, r.w, r.h].map(Math.round).join(',') : '')));
      }
    }
  }
}
const lateral = resumo.filter(r => r.lateral).map(r => r.nome + ' ' + r.tema + ' ' + r.larg);
const baixos = resumo.filter(r => r.ruins.length);
ok(!lateral.length, 'sem rolagem lateral em ' + resumo.length + ' telas (claro/escuro, 1440/390)' + (lateral.length ? ': ' + lateral.join(', ') : ''));
ok(!baixos.length, 'contraste WCAG (4,5:1; 3:1 texto grande) em todo texto visível' + (baixos.length ? ': ' + baixos.map(b => b.nome + ' ' + b.tema + ' ' + b.larg + ' (' + b.ruins.length + ': ' + b.ruins.slice(0, 3).map(r => r.id + ' ' + r.razao).join('; ') + ')').join(' | ') : ''));
ok(errosJS.length === 0, 'sem erro de JavaScript' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));
await nav.close();
if (SO_RELATA) process.exit(0);
console.log(falhou ? '\nFALHOU' : '\nOK: auditoria de UI');
process.exit(falhou ? 1 : 0);
