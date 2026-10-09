/**
 * APROVACOES (aprovacoes.html) — revisao publica das perguntas do HOLOSCAN, SEM login (Supabase falso):
 *   1  abre sem login: as perguntas do pacote aprovado, agrupadas pelos 5 sistemas, progresso 0 de N
 *   2  Aprovar grava na hora; Negar grava e abre o motivo (opcional); Editar abre o campo para escrever
 *   3  editar vazio e recusado na tela; texto salvo aparece como "Texto sugerido"; Desfazer volta a pendente
 *   4  "Aprovar as pendentes deste sistema" (com confirmacao na propria pagina)
 *   5  recarregar mantem tudo; filtro "So pendentes"
 *   6  Concluir so com tudo decidido; depois fica so leitura (botoes desabilitados, "Obrigado")
 *   7  prazo vencido: so leitura; texto com HTML nao executa; celular sem rolagem lateral; nada clinico e lido
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const rev = srv.revisaoPerguntas.abrir(pk.code, pk.version, 15);
const N = rev.itens.length;
const ultima = (sid) => { const l = rev.respostas.filter(x => x.stable_id === sid); return l[l.length - 1] || null; };
const tabelasLidas = [];
const tratar = srv.tratar.bind(srv);
srv.tratar = (m) => { if (m.op === 'query') tabelasLidas.push(m.q.tabela); return tratar(m); };

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
async function abrir(largura) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: largura || 1280, height: 900 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto('http://127.0.0.1:5500/aprovacoes.html', { waitUntil: 'networkidle2' });
  await P.waitForFunction(() => document.querySelectorAll('.cartao').length > 0 || document.querySelector('.aviso'), { timeout: 15000 });
  return P;
}
const clicar = (P, sel) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const txt = (P, sel) => P.evaluate((s) => (document.querySelector(s) || {}).innerText || '', sel);
const q = rev.itens.slice().sort((a, b) => a.posicao - b.posicao);
const [Q1, Q2, Q3] = [q[0].stable_id, q[1].stable_id, q[2].stable_id];

const A = await abrir();
/* 1 */
const t1 = await A.evaluate(() => ({ cartoes: document.querySelectorAll('.cartao').length, sistemas: [...document.querySelectorAll('.sistema h2')].map(h => h.textContent),
  prog: document.getElementById('prog-txt').innerText, login: !!document.querySelector('#login-email'), sub: document.getElementById('sub').textContent }));
ok(t1.cartoes === N && t1.sistemas.length === 5 && /^0 de 84/.test(t1.prog) && !t1.login, '1. abre sem login: ' + t1.cartoes + ' perguntas em 5 sistemas (' + t1.sistemas.join(', ') + '), progresso "' + t1.prog.split('·')[0].trim() + '"');
ok(/HOLOS-V1 v2/.test(t1.sub) && /aberta até/.test(t1.sub), '1. cabeçalho mostra o pacote e o prazo: ' + t1.sub);

/* 2 */
await clicar(A, `#p-${Q1} [data-d="aprovar"]`); await espera(400);
ok(ultima(Q1) && ultima(Q1).decisao === 'aprovar' && await A.evaluate((id) => document.getElementById('p-' + id).classList.contains('aprovar') && /Salvo às/.test(document.getElementById('p-' + id).innerText), Q1),
  '2. Aprovar grava na hora no servidor e mostra "Salvo às …"');
await clicar(A, `#p-${Q2} [data-d="negar"]`); await espera(400);
const negAberto = await A.evaluate((id) => !!document.getElementById('mot-' + id), Q2);
await A.evaluate((id) => { document.getElementById('mot-' + id).value = 'pergunta ambígua'; }, Q2);
await A.evaluate((id) => [...document.querySelectorAll('#p-' + id + ' button')].find(b => /Salvar motivo/.test(b.textContent)).click(), Q2); await espera(400);
ok(negAberto && ultima(Q2).decisao === 'negar' && ultima(Q2).comentario === 'pergunta ambígua' && /Motivo: pergunta ambígua/.test(await txt(A, '#p-' + Q2)),
  '2. Negar grava e abre o motivo (opcional); o motivo salvo aparece no cartão');
await clicar(A, `#p-${Q3} [data-d="editar"]`); await espera(300);
const ed = await A.evaluate((id) => { const t = document.getElementById('ed-' + id); return t ? { valor: t.value, foco: document.activeElement === t } : null; }, Q3);
ok(ed && ed.valor === q[2].texto_original && ed.foco && !ultima(Q3), '2. Editar abre o campo com o texto atual, já com o cursor nele (nada gravado ainda)');

/* 3 */
await A.evaluate((id) => { document.getElementById('ed-' + id).value = '   '; [...document.querySelectorAll('#p-' + id + ' button')].find(b => /Salvar edição/.test(b.textContent)).click(); }, Q3); await espera(300);
ok(!ultima(Q3) && /Escreva como a pergunta deveria ficar/.test(await txt(A, '#p-' + Q3)), '3. salvar edição vazia é recusado na tela (nada vai ao servidor)');
const XSS = 'Você <img src=x onerror="window.__xss=1"> sente fome à noite?';
await A.evaluate((id, x) => { document.getElementById('ed-' + id).value = x; document.getElementById('com-' + id).value = 'mais direta';
  [...document.querySelectorAll('#p-' + id + ' button')].find(b => /Salvar edição/.test(b.textContent)).click(); }, Q3, XSS); await espera(400);
const c3 = await A.evaluate((id) => ({ t: document.getElementById('p-' + id).innerText, xss: window.__xss === 1, img: document.querySelectorAll('#p-' + id + ' img').length }), Q3);
ok(ultima(Q3).decisao === 'editar' && ultima(Q3).texto_sugerido === XSS && ultima(Q3).comentario === 'mais direta' && c3.t.includes('Texto sugerido: ' + XSS) && !c3.xss && c3.img === 0,
  '3. edição salva com comentário; aparece como "Texto sugerido" (HTML mostrado como texto, não executado)');
await A.evaluate((id) => [...document.querySelectorAll('#p-' + id + ' button')].find(b => /Desfazer/.test(b.textContent)).click(), Q1); await espera(400);
ok(ultima(Q1).decisao === 'limpar' && await A.evaluate((id) => !document.getElementById('p-' + id).classList.contains('aprovar'), Q1) && rev.respostas.filter(x => x.stable_id === Q1).length === 2,
  '3. Desfazer volta a pendente (novo registro no histórico; nada apagado)');

/* 4 */
const sis1 = q.find(i => i.sistema_code).sistema_nome;
const pend1 = rev.itens.filter(i => i.sistema_nome === sis1 && !(ultima(i.stable_id) && ultima(i.stable_id).decisao !== 'limpar')).length;
await A.evaluate((n) => { const s = [...document.querySelectorAll('.sistema')].find(x => x.querySelector('h2').textContent === n); s.querySelector('.btn-lote').click(); }, sis1); await espera(200);
const conf = await A.evaluate((n) => [...document.querySelectorAll('.sistema')].find(x => x.querySelector('h2').textContent === n).innerText, sis1);
await A.evaluate((n) => [...[...document.querySelectorAll('.sistema')].find(x => x.querySelector('h2').textContent === n).querySelectorAll('button')].find(b => /Sim, aprovar/.test(b.textContent)).click(), sis1);
await A.waitForFunction((n) => !document.querySelector('.btn-lote') || ![...document.querySelectorAll('.sistema')].find(x => x.querySelector('h2').textContent === n).querySelector('.btn-lote'), { timeout: 20000 }, sis1);
const restam = rev.itens.filter(i => i.sistema_nome === sis1 && !(ultima(i.stable_id) && ultima(i.stable_id).decisao !== 'limpar')).length;
ok(new RegExp('Aprovar as ' + pend1 + ' pendentes').test(conf) && restam === 0, '4. "Aprovar as ' + pend1 + ' pendentes deste sistema" pede confirmação na página e aprova todas do ' + sis1);

/* 5 */
await A.reload({ waitUntil: 'networkidle2' }); await A.waitForFunction(() => document.querySelectorAll('.cartao').length > 0);
const r5 = await A.evaluate((q2, q3) => ({ q2: document.getElementById('p-' + q2).className, q3: document.getElementById('p-' + q3).innerText, prog: document.getElementById('prog-txt').innerText }), Q2, Q3);
ok(/negar/.test(r5.q2) && r5.q3.includes('Texto sugerido') && new RegExp('^' + (rev.itens.filter(i => { const u = ultima(i.stable_id); return u && u.decisao !== 'limpar'; }).length) + ' de 84').test(r5.prog),
  '5. recarregar mantém decisões, motivo e edição (o servidor é a fonte): ' + r5.prog.split('·')[0].trim());
await A.select('#filtro', 'pendentes'); await espera(200);
const nPend = await A.evaluate(() => document.querySelectorAll('.cartao').length);
ok(nPend === rev.itens.filter(i => { const u = ultima(i.stable_id); return !u || u.decisao === 'limpar'; }).length && nPend > 0, '5. filtro "Só pendentes" mostra só as ' + nPend + ' sem decisão');

/* 6 */
ok(await A.evaluate(() => document.getElementById('btn-concluir').disabled), '6. "Concluir revisão" fica desabilitado enquanto há pendentes');
for (;;) {
  const id = await A.evaluate(() => { const b = document.querySelector('.cartao [data-d="aprovar"]:not([aria-pressed="true"])'); return b ? b.closest('.cartao').id : null; });
  if (!id) break;
  await clicar(A, '#' + id + ' [data-d="aprovar"]'); await espera(60);
}
await espera(400);
await A.select('#filtro', 'todas'); await espera(200);
const resumo = await txt(A, '#final');
await A.evaluate(() => { const n = document.getElementById('nome-revisor'); n.value = 'Rodrigo'; n.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('btn-concluir').click(); }); await espera(200);
const aviso = await txt(A, '#final');
await A.evaluate(() => [...document.querySelectorAll('#final button')].find(b => /Sim, concluir/.test(b.textContent)).click()); await espera(800);
const fim = await A.evaluate(() => ({ t: document.body.innerText, desab: [...document.querySelectorAll('.acoes button')].every(b => b.disabled), final: !!document.getElementById('final') }));
ok(/Negar a pergunta 2/.test(resumo) && /Editar a pergunta 3/.test(resumo) && /não aceita mais mudanças/.test(aviso), '6. antes de concluir: resumo do que foi negado e editado e confirmação na própria página');
ok(rev.status === 'concluida' && rev.concluida_por_nome === 'Rodrigo' && /Revisão concluída\. Obrigado!/.test(fim.t) && fim.desab && !fim.final, '6. concluída: registrada no servidor com o nome, página de agradecimento e tudo só para leitura');
const depois = srv.tratar({ op: 'rpc', uid: null, nome: 'revisao_perguntas_registrar', args: { p_stable_id: Q1, p_decisao: 'negar' } });
ok(depois.error && depois.error.hint === 'revisao_fechada', '6. depois de concluída o servidor não aceita mais nada');

/* 7 */
const rev2 = srv.revisaoPerguntas.abrir(pk.code, pk.version, 15);
rev2.expira_em = new Date(Date.now() - 60000).toISOString();
const B = await abrir(390);
const exp = await B.evaluate(() => ({ t: document.body.innerText, desab: [...document.querySelectorAll('.acoes button')].every(b => b.disabled), larg: document.documentElement.scrollWidth }));
ok(/O prazo desta revisão terminou/.test(exp.t) && exp.desab, '7. prazo vencido: aviso e só leitura');
ok(exp.larg <= 390, '7. celular (390 px): sem rolagem lateral (largura ' + exp.larg + ')');
ok(tabelasLidas.length === 0, '7. a página não lê nenhuma tabela (nem dado clínico): só as 3 funções da revisão' + (tabelasLidas.length ? ' — leu: ' + [...new Set(tabelasLidas)].join(',') : ''));
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
if (falhou) process.exitCode = 1;
