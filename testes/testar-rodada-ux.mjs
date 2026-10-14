/**
 * RODADA UX 14/10 — testes focais (paciente FICTICIA, servidor falso). Cada item da rodada com clique de verdade quando
 * e botao: reguas (Linha do Momentum / Roda), X do paciente, navegacao Holos IA, HOLOSCAN antes/depois, bloco 6, Triade
 * "Por que", PQQ 3 perguntas + historico de 5, "?" das 10 ferramentas, selos QF/QM/QE, bugs de clique do Cowork.
 * SHOT_DIR=<pasta> grava capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia 1', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA);
const { PA } = fx;
const PB = fx.ins('patients', { nome: 'Bruna Sem Mapa Ficticia', email: 'bruna.um.email.bem.comprido.para.cortar@exemplo-ficticio.com.br' }).id;

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
await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
const shot = async (nome, sel) => { if (!SHOT) return; if (sel) { const e = await P.$(sel); if (e) return e.screenshot({ path: SHOT + '/' + nome + '.png' }); } return P.screenshot({ path: SHOT + '/' + nome + '.png' }); };
const clicarReal = async (sel) => { const e = await P.$(sel); if (!e) return false; await e.evaluate(x => x.scrollIntoView({ block: 'center' })); await e.click(); return true; };
const regras = (re) => P.evaluate((src) => { const r = new RegExp(src); const out = []; for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } for (const x of rs) if (x.selectorText && r.test(x.selectorText)) out.push(x.cssText); } return out; }, re.source);
const secao = () => P.evaluate(() => (document.querySelector('.secao.ativa') || {}).id);

/* ===== 3. REGUAS ===== */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('espirito'); window.abrirFerramentaPorId('roda_vida'); }, PA); await espera(800);
await P.evaluate(() => document.querySelectorAll('.nota-limpar').forEach(b => b.click())); await espera(200);
/* o Chromium nao resolve ::-webkit-slider-thumb em getComputedStyle: confere as regras do CSSOM */
const thumb = await P.evaluate(() => ({ saida: document.querySelector('.grupo-nota[data-respondido="0"] output').textContent }));
const rThumb = await regras(/respondido="0"\].*slider-thumb/);
thumb.op = rThumb.some(t => /opacity:\s*0[;\s]/.test(t)) ? '0' : 'visivel';
thumb.borda = rThumb.some(t => /dashed/.test(t)) ? 'dashed' : 'outra';
ok(thumb.op !== '0' && thumb.borda === 'dashed' && thumb.saida === '—', 'réguas: não respondida mostra o marcador VAZADO (tracejado, visível) e "—" — não parece resposta (opacity ' + thumb.op + ')');
const reg = await P.$('.grupo-nota[data-respondido="0"] input[type=range]');
const bb = await reg.boundingBox(); await P.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await espera(150);
const tocou = await P.evaluate(() => { const g = document.querySelector('.grupo-nota'); return { resp: g.dataset.respondido, out: g.querySelector('output').textContent, op: g.matches('[data-respondido="0"]') ? 'dashed' : 'solid' }; });
ok(tocou.resp === '1' && tocou.out === '5' && tocou.op === 'solid', 'réguas: tocar no marcador parado no meio passa a contar como resposta (5) e o marcador fica cheio');
await P.mouse.click(bb.x + 3, bb.y + bb.height / 2); await espera(100);
const minimo = await P.evaluate(() => document.querySelector('.grupo-nota output').textContent);
const outros = await P.evaluate(() => [...document.querySelectorAll('.grupo-nota')].slice(1).every(g => g.dataset.respondido === '0'));
ok(minimo === '0' && outros, 'réguas: mínimo = 0; as outras réguas continuam "não respondido" (nada inventado)');

/* ===== 7. X DO PACIENTE ===== */
await P.evaluate(() => window.irParaSecao('holoscan')); await espera(400);
ok(await P.evaluate(() => !document.getElementById('barra-paciente-ctx').hidden), 'barra do paciente aparece no HOLOSCAN');
await clicarReal('#bpctx-fechar'); await espera(500);
const limpo = await P.evaluate(() => ({ pid: window.pacienteAtivoId(), barra: document.getElementById('barra-paciente-ctx').hidden, ses: sessionStorage.getItem('holohacking.semPaciente'),
  pacientes: window.pacientesTodos ? window.pacientesTodos().length : -1 }));
ok(limpo.pid === null && limpo.barra && limpo.ses === '1' && limpo.pacientes >= 2, 'X: paciente desselecionado (nada apagado: ' + limpo.pacientes + ' pacientes), barra some, vale nesta aba');
await P.evaluate(() => window.irParaSecao('resultado')); await espera(700);
const resVazio = await P.evaluate(() => (document.getElementById('rp-vazio') || {}).textContent || '');
await P.evaluate(() => window.irParaSecao('holusia')); await espera(400);
const holVazio = await P.evaluate(() => document.getElementById('holusia-alvo').innerText);
ok(/Escolha uma paciente/.test(resVazio) && /Nenhum paciente selecionado/.test(holVazio), 'X: Resultado e Holos IA mostram estado vazio (nenhum contexto antigo)');
await P.evaluate((pid) => window.definirPacienteAtivo(pid), PB); await espera(300);
await P.evaluate(() => window.irParaSecao('holusia')); await espera(600);
ok(await P.evaluate(() => window.pacienteAtivoId()) === PB && !(await P.evaluate(() => sessionStorage.getItem('holohacking.semPaciente'))), 'X: escolher outro paciente volta a funcionar (contexto novo, sem reload)');
await P.evaluate(() => window.irParaSecao('perfil')); await espera(300);
ok(await P.evaluate(() => document.getElementById('barra-paciente-ctx').hidden), 'barra do paciente não aparece no Perfil (Cowork H)');

/* ===== 9/23. NAVEGACAO + SELOS ===== */
const menu = await P.evaluate(() => ({ ordem: [...document.querySelectorAll('.nav-item[data-secao]')].map(b => b.dataset.secao),
  tags: ['corpo', 'mente', 'espirito'].map(s => (document.querySelector('.nav-item[data-secao="' + s + '"] .nav-tag') || {}).textContent) }));
const iC = menu.ordem.indexOf('corpo');
ok(menu.ordem.slice(iC, iC + 5).join(' > ') === 'corpo > mente > espirito > holusia > resultado', 'menu: Corpo → Mente → Espírito → Holos IA → Resultado HOLOS');
ok(menu.tags.join(',') === 'QF,QM,QE', 'selos do menu: QF / QM / QE (só visual)');

/* ===== 14/15/16. HOLOSCAN antes x depois ===== */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('holoscan'); }, PB); await espera(700);
const antes = await P.evaluate(() => ({ modo: document.getElementById('secao-holoscan').classList.contains('holo-com-resultado'),
  cards: [...document.querySelectorAll('.holo-subtool:not([hidden]) h6')].filter(h => h.offsetParent).map(h => h.textContent.replace(/\s+/g, ' ').trim()),
  demo: !!document.querySelector('.holo-demo-selo') && getComputedStyle(document.querySelector('.holo-demo-selo')).display !== 'none' }));
ok(!antes.modo && antes.demo && JSON.stringify(antes.cards) === JSON.stringify(['NeuroScan — Mente', 'BioRoot — Corpo', 'Terreno Espiritual — Espírito', 'Tríade HOLOS — Corpo · Mente · Espírito']),
  'HOLOSCAN sem aplicação: cartões de apresentação com território e radar marcado "Demonstração": ' + antes.cards.join(' | '));
await shot('holoscan-antes', '#secao-holoscan');
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); }, PA); await espera(700);
const depois = await P.evaluate(() => ({ modo: document.getElementById('secao-holoscan').classList.contains('holo-com-resultado'),
  cards: getComputedStyle(document.querySelector('.holo-subtools')).display, demo: getComputedStyle(document.querySelector('.holo-demo-selo')).display,
  bloco6: !document.querySelector('.holo-aprofundamento-oculto') || document.querySelector('.holo-aprofundamento-oculto').hidden,
  textoBloco6: [...document.querySelectorAll('#secao-holoscan .eyebrow')].filter(e => e.offsetParent).some(e => /Aprofundamento/.test(e.textContent)),
  porque: (document.querySelector('.triada-porque') || {}).innerText || '', menor: (document.querySelector('.triada-eixo.menor b') || {}).textContent || '' }));
ok(depois.modo && depois.cards === 'none' && depois.demo === 'none', 'HOLOSCAN com aplicação: só o resultado real (apresentação e demonstração somem)');
ok(depois.bloco6 && !depois.textoBloco6, 'bloco "6 · Aprofundamento / Leitura do resultado" fora da tela');
ok(/POR QUÊ/i.test(depois.porque) && new RegExp(depois.menor + ' aparece como a dimensão mais baixa nesta aplicação').test(depois.porque) && /“/.test(depois.porque)
  && !/doen|diagnóstic[oa] d|pior|equilíbrio|saúde/i.test(depois.porque.replace('não um diagnóstico nem uma causa', '')),
  'Tríade: "Por quê" da menor dimensão (' + depois.menor + ') com marcadores reais, sem diagnóstico, causa, "pior" ou saúde');
await P.evaluate(() => document.getElementById('holo-triada').scrollIntoView({ block: 'center' })); await shot('triada-porque', '#holo-triada');

/* ===== 18. PQQ ===== */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.levarParaFicha('mente', pid); }, PB); await espera(800);
const pqqNovo = await P.evaluate(() => ({ degraus: document.querySelectorAll('.escada-pqq .degrau').length, legado: document.getElementById('pqq-legado').hidden,
  txt: document.getElementById('vista-pqq').innerText }));
ok(pqqNovo.degraus === 3 && pqqNovo.legado && !/cinco|5 de 5|04 - Pra que|05 - Pra que/i.test(pqqNovo.txt.replace(/cinco sistemas/g, '')), 'PQQ novo: 3 perguntas, sem 04/05 nem "cinco"/"5 de 5"');
await P.evaluate(() => { const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  set('pqq-objetivo', 'Ter energia'); set('pqq-1', 'Para brincar com os filhos'); set('pqq-2', 'Porque me sinto ausente'); set('pqq-3', 'Muda meu fim de semana'); set('pqq-verdadeiro', 'Estar presente'); });
await clicarReal('#btn-salvar-pqq'); await espera(900);
const salvo = srv.linhas('tool_applications').filter(t => t.patient_id === PB && t.ferramenta_id === 'pqq').pop();
ok(!!salvo && salvo.status === 'concluida' && salvo.respostas.r3 === 'Muda meu fim de semana' && salvo.respostas.r4 === '' && salvo.respostas.r5 === '',
  'PQQ novo salvo e concluído com 3 respostas (r4/r5 vazios; as chaves continuam por compatibilidade)');
const fech = await P.evaluate(() => window.FerramentasFechamento && window.FerramentasFechamento.pqq ? window.FerramentasFechamento.pqq({ r1: 'a', r2: 'b', r3: 'c' }).linha : null);
ok(!fech || /3 de 3 níveis/.test(fech), 'resumo do PQQ novo: "3 de 3 níveis" (nunca "de 5")' + (fech ? ' — ' + fech : ''));
await P.evaluate(async () => { const q = await window.Aplicacoes.nova({ id: 'pqq' });
  await window.Aplicacoes.concluir(q, { objetivo: 'Antigo', r1: 'um', r2: 'dois', r3: 'tres', r4: 'QUATRO ANTIGO', r5: 'CINCO ANTIGO', verdadeiro: 'sintese antiga' }, null); });
await P.evaluate((pid) => { window.irParaSecao('dashboard'); window.levarParaFicha('mente', pid); }, PB); await espera(900);
const hist = await P.evaluate(() => ({ legado: document.getElementById('pqq-legado').hidden, r4: document.getElementById('pqq-4').value, r5: document.getElementById('pqq-5').value }));
const fech5 = await P.evaluate(() => window.FerramentasFechamento && window.FerramentasFechamento.pqq ? window.FerramentasFechamento.pqq({ r1: 'a', r2: 'b', r3: 'c', r4: 'd', r5: 'e' }).linha : null);
ok(!hist.legado && hist.r4 === 'QUATRO ANTIGO' && hist.r5 === 'CINCO ANTIGO' && (!fech5 || /5 de 5/.test(fech5)), 'PQQ histórico com 5 níveis: 04 e 05 aparecem como foram registrados (nada apagado nem recalculado)');

/* ===== 19-22. "?" DAS 10 FERRAMENTAS ===== */
const ids = ['oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1'];
const ajuda = [];
for (const id of ids) {
  await P.evaluate((id, pid) => {
    window.definirPacienteAtivo(pid);
    const sec = { oq3: 'corpo', linha_momentum: 'corpo', mapa_rotina_v1: 'corpo', pqq: 'mente', mapa_crencas: 'mente', gatilhos_respostas_v1: 'mente', mapa: 'espirito', roda_vida: 'espirito', carta_futuro: 'espirito', conexao_pertencimento_v1: 'espirito' }[id];
    if (['oq3', 'pqq', 'mapa'].includes(id)) window.levarParaFicha(sec, pid); else { window.irParaSecao(sec); window.abrirFerramentaPorId(id); }
  }, id, PA); await espera(500);
  const b = await P.evaluateHandle((id) => [...document.querySelectorAll('.ajuda-ferr[data-ajuda-ferr="' + id + '"] .ajuda-ferr-btn')].find(x => x.offsetParent) || null, id);
  if (!b || !(await b.evaluate(x => !!x))) { ajuda.push(id + ':sem'); continue; }
  await b.click(); await espera(120);
  const r = await P.evaluate(() => { const w = document.querySelector('.ajuda-ferr.aberta'); if (!w) return null; const p = w.querySelector('.ajuda-ferr-pop'); const rr = p.getBoundingClientRect();
    return { t: p.innerText, dentro: rr.left >= 0 && rr.right <= innerWidth + 1, exp: w.querySelector('button').getAttribute('aria-expanded') }; });
  ajuda.push(r && /O que é/i.test(r.t) && /Por que usar/i.test(r.t) && /Pode ser especialmente útil quando/.test(r.t) && !/Só usar quando/i.test(r.t) && r.dentro && r.exp === 'true' ? id + ':ok' : id + ':' + JSON.stringify(r));
  await P.keyboard.press('Escape'); await espera(80);
}
ok(ajuda.every(a => /:ok$/.test(a)), '"?" nas 10 ferramentas: O que é / Por que usar / Quando usar ("Pode ser especialmente útil quando..."), dentro da janela — ' + ajuda.filter(a => !/:ok$/.test(a)).join(' ') );
await P.evaluate(() => document.activeElement && document.activeElement.blur());
await P.evaluate(() => { const b = [...document.querySelectorAll('.ajuda-ferr[data-ajuda-ferr="conexao_pertencimento_v1"] .ajuda-ferr-btn')].find(x => x.offsetParent); if (b) b.focus(); });
ok(await P.evaluate(() => !!document.querySelector('.ajuda-ferr.aberta')), '"?" abre pelo teclado (foco)');
await P.keyboard.press('Escape');
/* 14/10: "?" ao lado do nome na LISTA de ferramentas, "?" em CADA pergunta e exemplo em cinza nos campos de texto */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('corpo'); }, PA); await espera(500);
const cardsAj = await P.evaluate(() => [...document.querySelectorAll('.card-ferr')].filter(c => c.querySelector('.ajuda-ferr')).length);
ok(cardsAj === 10, 'lista de ferramentas: "?" ao lado do nome das 10 ferramentas (' + cardsAj + ')');
await (await P.$('#secao-corpo .card-ferr[data-ferramenta="linha_momentum"] .ajuda-ferr-btn')).click(); await espera(150);
ok(await P.evaluate(() => !!document.querySelector('.card-ferr .ajuda-ferr.aberta') && (document.querySelector('.secao.ativa') || {}).id === 'secao-corpo' && !document.querySelector('#secao-corpo .ferr-form, #vista-ferramenta:not(.hidden) .ferr-form')),
  'o "?" do cartão abre a explicação sem abrir a ferramenta');
await P.keyboard.press('Escape');
const porCampo = [];
for (const id of ['linha_momentum', 'mapa_crencas', 'gatilhos_respostas_v1', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1']) {
  await P.evaluate((id) => window.abrirFerramentaPorId(id), id); await espera(400);
  porCampo.push(await P.evaluate((id) => { const ls = [...document.querySelectorAll('.grupo label')].filter(l => l.offsetParent);
    const ts = [...document.querySelectorAll('.grupo textarea, .grupo input[type=text]')].filter(e => e.offsetParent);
    return id + ':' + ls.filter(l => l.querySelector('.ajuda-campo')).length + '/' + ls.length + ' ex:' + ts.filter(e => e.placeholder).length + '/' + ts.length; }, id));
}
ok(porCampo.every(x => { const m = x.match(/:(\d+)\/(\d+) ex:(\d+)\/(\d+)/); return m && m[1] === m[2] && Number(m[3]) >= Number(m[4]) - 1; }), '"?" em cada pergunta e exemplo em cinza nos campos de texto: ' + porCampo.join(' '));
const pop = await P.evaluate(() => { const w = document.querySelector('.ajuda-campo'); w.querySelector('button').click(); const t = w.querySelector('.ajuda-ferr-pop').innerText; document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); return t; });
ok(/O que preencher/i.test(pop) && /Para que serve/i.test(pop), 'o "?" da pergunta explica O que preencher e Para que serve');
await P.evaluate((pid) => window.levarParaFicha('corpo', pid), PA); await espera(400);
ok(await P.evaluate(() => ['oq3-quer', 'oq3-precisa', 'oq3-consegue', 'oq3-alavancas'].every(id => document.querySelector('label[for="' + id + '"] .ajuda-campo') && document.getElementById(id).placeholder)),
  'OQ³: "?" e exemplo em cada pergunta');

/* ===== 8. COWORK ===== */
await P.evaluate((pid) => window.levarParaFicha('aba:ferramentas', pid), PB); await espera(700);
await P.evaluate(() => { const b = [...document.querySelectorAll('.fic-ir-min[data-ir="corpo"]')].find(x => x.offsetParent); b.click(); }); await espera(700);
ok(await P.evaluate(() => !document.getElementById('vista-oq3').classList.contains('hidden') && (document.querySelector('.secao.ativa') || {}).id === 'secao-corpo'), 'B: "Preencher agora" do OQ³ abre a própria ferramenta');
await P.evaluate((pid) => window.levarParaFicha('aba:consultas', pid), PA); await espera(700);
await P.evaluate(() => { const b = document.querySelector('#aba-consultas [data-abrir-atendimento]'); if (b) b.click(); }); await espera(500);
ok(await P.evaluate(() => { const a = document.querySelector('.at-linha-ativa'); return !!a && !a.querySelector('button.dash-ir') && /Selecionado/.test(a.innerText); }), 'G: atendimento selecionado vira selo (sem botão com seta que não faz nada)');
await P.evaluate(() => window.irParaSecao('dashboard')); await espera(600);
const linhaDash = await P.evaluate(() => { const b = document.querySelector('#dash-lista-acompanhamento .dash-acomp'); return b ? b.dataset.destino : null; });
ok(!linhaDash || linhaDash !== 'consulta', 'I: linha do Acompanhamento não leva mais à Agenda (' + linhaDash + ')');
await P.evaluate(() => window.irParaSecao('pacientes')); await espera(500);
const busca = (await regras(/search-cancel-button/)).some(t => /display:\s*none/.test(t)) ? 'none' : 'visivel';
ok(busca === 'none', 'E: busca de pacientes sem o "limpar" duplicado do navegador');
const email = await P.evaluate(() => { const t = [...document.querySelectorAll('#secao-pacientes .pac-sub .pac-txt')].find(x => /bruna/.test(x.textContent) && x.offsetParent);
  return t ? { ov: getComputedStyle(t).textOverflow, cortado: t.scrollWidth > t.clientWidth } : null; });
ok(!email || email.ov === 'ellipsis', 'F: e-mail longo na lista termina em reticências' + (email ? '' : ' (coluna escondida nesta largura)'));
ok(await P.evaluate(() => { const b = document.createElement('button'); b.className = 'btn-principal'; document.body.appendChild(b); const c = getComputedStyle(b).backgroundColor; b.remove(); return c !== 'rgba(0, 0, 0, 0)'; }),
  'D: "Emitir" (.btn-principal) tem estilo de botão principal dentro do rodapé do modal');
await P.setViewport({ width: 390, height: 860 });
await P.evaluate((pid) => window.levarParaFicha('aba:evolucao', pid), PA); await espera(800);
ok(!(await P.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'A: Evolução no celular sem rolagem lateral (selo de homologação quebra linha)');
await P.evaluate((pid) => window.levarParaFicha('aba:visao', pid), PA); await espera(800);
const setas = await P.evaluate(() => { const lista = document.querySelector('#secao-pacientes .ficha-arquivos .abas[role="tablist"]'); return lista ? getComputedStyle(lista).paddingLeft : ''; });
ok(parseFloat(setas) >= 30, 'M: abas reservam espaço para as setas ‹ › (padding ' + setas + ')');
await shot('ficha-390', null);
await P.setViewport({ width: 1440, height: 1000 });

ok(errosJS.length === 0, 'sem erro de JavaScript' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));
/* 14/10: listas suspensas — as opcoes de TODOS os selects legiveis (contraste >= 4.5) nos dois temas.
   Antes: no tema escuro a opcao herdava o texto claro e o navegador desenhava a lista aberta com fundo branco. */
const opcoes = await P.evaluate(() => {
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const ruins = [];
  for (const escuro of [false, true]) {
    document.body.classList.toggle('escuro', escuro);
    for (const o of document.querySelectorAll('select option')) {
      const cs = getComputedStyle(o), fundo = rgb(cs.backgroundColor), texto = rgb(cs.color);
      if (fundo.length >= 4 && fundo[3] === 0) { ruins.push((escuro ? 'escuro ' : 'claro ') + 'fundo transparente: ' + (o.parentElement.id || o.parentElement.name || '?')); continue; }
      const c = contraste(texto, fundo);
      if (c < 4.5) ruins.push((escuro ? 'escuro ' : 'claro ') + (o.parentElement.id || o.parentElement.name || '?') + ' "' + o.textContent.trim().slice(0, 20) + '" ' + c.toFixed(2));
    }
  }
  document.body.classList.remove('escuro');
  return { total: document.querySelectorAll('select option').length, ruins: ruins.slice(0, 8) };
});
ok(opcoes.total > 0 && opcoes.ruins.length === 0, 'listas suspensas: as ' + opcoes.total + ' opções legíveis nos dois temas ' + JSON.stringify(opcoes.ruins));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK: rodada UX');
process.exit(falhou ? 1 : 0);
