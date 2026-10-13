/**
 * RODADA FINAL DE UX E CONTEUDO DO RESULTADO DA PACIENTE (13/10, antes do deploy).
 * So apresentacao, linguagem e PDF: calculo, notas, faixas, Indice, Triade, sinais dominantes, PP-V1, catalogo,
 * ferramentas e Conduta nao mudam. O snapshot ficticio (testes/golden/rf1-fixture.json) e desenhado pelo Resultado
 * HOLOS atual nas duas visoes:
 *   1. frase das notas baixas; 2. aviso antes dos sinais dominantes; 3. Triade fora do resumo; 4. "Possiveis proximos
 *   aprofundamentos" (Principal / Outra possibilidade); 5. "Por que usamos esta ferramenta" so com texto homologado;
 *   6. linguagem da paciente; 7. cartoes completos so nas areas prioritarias; 8. impressao sem sobreposicao e sem
 *   secao indivisivel, PDF baixado sem espacador dentro de grade, documento da tela intocado.
 * A visao profissional continua com o texto tecnico.
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const NOTAS = 'Notas mais baixas indicam maior carga dos marcadores considerados neste eixo nesta aplicação. Isso ajuda a mostrar onde pode valer a pena aprofundar a conversa e não representa doença, gravidade ou diagnóstico.';
const ROTINA = 'Para entender onde as dificuldades e as possibilidades de mudança aparecem na rotina real, antes de combinar mudanças que talvez não caibam no dia a dia.';
const PQQ = 'Para compreender o que o objetivo desejado representa para a paciente e conectar a mudança a significados que façam sentido para ela.';

const fx = JSON.parse(readFileSync(new URL('./golden/rf1-fixture.json', import.meta.url), 'utf8'));
const snap = fx.resultado.content_snapshot;
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const P = await nav.newPage();
const errosJS = [];
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, criarServidor());
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.ResultadoHolos && window.SistemasFechamento && window.FerramentasFechamento && window.ResultadoPagina, { timeout: 15000 });

const d = await P.evaluate((snap) => {
  const div = document.createElement('div'); document.body.appendChild(div);
  const ler = (visao) => {
    div.innerHTML = window.ResultadoHolos.documentoHtml(snap, visao, {});
    const porque = [...div.querySelectorAll('.rf-porque')].map(b => {
      const caixa = b.closest('.rf-caixa') || b.parentNode, txt = caixa.innerText;
      return { ferr: (b.closest('[data-rh-ferr-snap]') || {}).dataset ? b.closest('[data-rh-ferr-snap]').dataset.rhFerrSnap : '', antes: txt.search(/Por que usamos esta ferramenta/i) < txt.search(/O que apareceu/i) };
    });
    return {
      txt: div.innerText, html: div.innerHTML, porque,
      areasCompletos: div.querySelectorAll('.rh-areas .rh-sis:not(.sf-compacto)').length,
      compactos: div.querySelectorAll('.rh-detalhes .sf-compacto').length,
      completosTotal: div.querySelectorAll('.rh-sis:not(.sf-compacto)').length,
      triade: [...div.querySelectorAll('.rh-detalhes .rh-num span')].map(s => s.textContent.trim()),
      resumo: (div.querySelector('.rh-sintese') || {}).innerText || '',
      pp: [...div.querySelectorAll('.sf-g-pac')].map(g => ({ principal: !!g.querySelector('.sf-pp-principal'), outra: g.querySelectorAll('.sf-pp-outra').length, txt: g.innerText }))
    };
  };
  const pac = ler('paciente'), prof = ler('profissional');
  div.remove();
  const SF = window.SistemasFechamento;
  return { pac, prof, INTRO: SF.INTRO_SINAIS_PACIENTE, TIT: SF.PP_PACIENTE_TITULO, ESC: SF.PP_PACIENTE_ESCOLHA, POR: window.FerramentasFechamento.POR_QUE_USAMOS };
}, snap);
const { pac, prof } = d;

/* 1 */
ok(pac.txt.includes(NOTAS) && !/Nota mais baixa quer dizer|mais itens apareceram nas suas respostas/i.test(pac.txt),
  'item 1: a frase das notas baixas é a homologada (carga dos marcadores; não é doença, gravidade nem diagnóstico)');
/* 2 */
ok(d.INTRO === 'Os itens abaixo são alguns dos que mais contribuíram matematicamente para este eixo dentro da organização autoral do HOLOSCAN. Essa associação ajuda a orientar a investigação e não significa que um desses fatores cause os outros.'
  && pac.txt.includes(d.INTRO) && !prof.txt.includes(d.INTRO) && /Alguns dos sinais que mais contribuíram para este eixo nesta aplicação/.test(prof.txt),
  'item 2: antes dos sinais dominantes, a paciente lê o aviso de associação sem causalidade; a visão profissional não muda');
/* 3 */
ok(!/dimensão com a menor nota|Espírito foi|Tríade/i.test(pac.resumo) && ['Corpo', 'Mente', 'Espírito'].every(x => pac.triade.includes(x)),
  'item 3: a Tríade saiu de "O que entendemos nesta etapa" e continua em "Detalhes do mapa" — ' + pac.triade.join(', '));
/* 4 (o snapshot ficticio ja tem todas as ferramentas feitas: o proximo passo e montado aqui com a forma do PP-V1) */
const pp = await P.evaluate(() => {
  const SF = window.SistemasFechamento;
  const base = { sinais: [], sinais_intro: '', por_que: 'POR_QUE_TECNICO', investiga: 'INVESTIGA_TECNICO' };
  const mk = (lista) => ({ sistema: 'detox_linfatico', nome: 'Sistema Ficticio', organiza: 'Categoria autoral que organiza relatos ficticios.', significado: '', nao_significa: '', aprofundamento: '',
    contribuiu: { sinais: [] }, pendencias: [], resultado: { avaliavel: true, nota: 4.7, faixa: 'intermediaria', prioridade: '1ª área para aprofundar' }, proximo_passo: lista });
  const dois = [Object.assign({ tool_id: 'oq3', nome: 'OQ³', papel: 'complementar' }, base), Object.assign({ tool_id: 'linha_momentum', nome: 'Linha do Momentum', papel: 'principal' }, base)];
  const um = [Object.assign({ tool_id: 'gatilhos_respostas_v1', nome: 'Gatilhos & Respostas', papel: 'principal' }, base)];
  const div = document.createElement('div');
  const ler = (html) => { div.innerHTML = html; return { txt: div.textContent, lead: (div.querySelector('.sf-pp-lead') || {}).textContent || '' }; };
  document.body.appendChild(div);
  const r = { dois: ler(SF.htmlSistema(mk(dois), 'paciente', { mostrarPP: true })), um: ler(SF.htmlSistema(mk(um), 'paciente', { mostrarPP: true })),
    off: ler(SF.htmlSistema(mk(dois), 'paciente', {})), prof: ler(SF.htmlSistema(mk(dois), 'profissional', {})) };
  div.remove(); return r;
});
ok(pp.dois.txt.includes(d.TIT) && pp.dois.txt.includes(d.ESC) && !/Próximo passo pelo catálogo|Próximo aprofundamento sugerido|POR_QUE_TECNICO/.test(pp.dois.txt) && !pp.off.txt.includes(d.TIT),
  'item 4: paciente vê "Possíveis próximos aprofundamentos" + "A escolha do que aplicar…" (sem justificativa técnica), só quando compartilhado');
/* pos-teste MR-V1 13/10: dentro do sistema nao ha "Principal" (o papel e do motor global PP-V1): so a frase neutra, na ordem do catalogo */
ok(pp.dois.lead.trim() === 'Ferramentas que podem ajudar a aprofundar este eixo: OQ³ e Linha do Momentum' && pp.um.lead.trim() === 'Ferramenta que pode ajudar a aprofundar este eixo: Gatilhos & Respostas'
  && !/Principal:|Outra possibilidade/.test(pp.dois.txt + pp.um.txt),
  'item 7: no cartão do sistema, "Ferramenta(s) que pode(m) ajudar a aprofundar este eixo:" sem "Principal" — ' + pp.dois.lead.trim());
const resumoPP = await P.evaluate(() => {
  const RS = window.ResultadoSintese;
  const f = { investigar: [], fechamentos: [], compartilhar_pp: true, todas_realizadas: false,
    sugeridas: [{ nome: 'OQ³', papel: 'complementar' }, { nome: 'Gatilhos & Respostas', papel: 'principal' }, { nome: 'Linha do Momentum', papel: 'complementar' }] };
  return RS.frasesPaciente(f);
});
ok(resumoPP.includes('Próximo aprofundamento sugerido: Gatilhos & Respostas.') && resumoPP.includes('Outras possibilidades: OQ³ e Linha do Momentum. Nenhuma é obrigatória; a escolha e o momento são combinados com a sua nutricionista.'),
  'item 7: no resumo, "Próximo aprofundamento sugerido" = a principal do PP-V1 e "Outras possibilidades" = as complementares — ' + resumoPP.join(' | '));
ok(/Próximo passo pelo catálogo/.test(pp.prof.txt) && /Ferramenta recomendada \(principal\)/.test(pp.prof.txt) && /POR_QUE_TECNICO/.test(pp.prof.txt) && /Categoria autoral que organiza/.test(pp.prof.txt),
  'item 4: a visão profissional mantém o catálogo/rank e o texto técnico');
/* 5 */
const porque = Object.fromEntries(pac.porque.map(p => [p.ferr, p.antes]));
ok(Object.keys(d.POR).sort().join(',') === 'mapa_rotina_v1,pqq' && d.POR.mapa_rotina_v1 === ROTINA && d.POR.pqq === PQQ,
  'item 5: só Mapa da Rotina e PQQ têm texto homologado de "Por que usamos esta ferramenta"');
ok(pac.txt.includes(ROTINA) && pac.txt.includes(PQQ) && pac.porque.length === 2 && porque.mapa_rotina_v1 === true && porque.pqq === true,
  'item 5: "Por que usamos esta ferramenta" aparece antes de "O que apareceu" e só nessas duas (as outras 7 ferramentas ficam sem o bloco)');
/* 6 */
ok(/Este eixo reúne/.test(pac.txt) && !/Categoria autoral que organiza|Não possui significado clínico independente/.test(pac.txt) && /Essa nota, sozinha, não indica uma condição de saúde\./.test(pac.txt)
  && /Categoria autoral que organiza|O que este eixo organiza/.test(prof.txt),
  'item 6: linguagem da paciente ("Este eixo reúne…", "Essa nota, sozinha, não indica…"); a profissional mantém o texto técnico');
/* 7 */
ok(pac.areasCompletos === 2 && pac.completosTotal === 2 && pac.compactos === 5,
  'item 7: cartão completo só nas 2 áreas prioritárias; "Detalhes do mapa" com os 5 sistemas compactos — ' + [pac.areasCompletos, pac.completosTotal, pac.compactos].join('/'));
ok(prof.html.includes('rh-sis') && !prof.html.includes('sf-compacto'), 'item 7: a visão profissional continua com os cartões completos');
/* 11: o que a paciente nao pode concluir */
ok(!/causou|provoca|é causad|por causa d/i.test(pac.txt) && !/você precisa fazer|obrigatóri[ao] fazer|faça todas/i.test(pac.txt) && !/problema espiritual/i.test(pac.txt),
  'item 11: sem causalidade emoção → corpo, sem obrigação de fazer todas as ferramentas, sem "problema espiritual"');

/* 8: impressao e PDF */
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../resultado-pagina.js', import.meta.url), 'utf8');
ok(/body\.rp-imprimindo > \*:not\(#rp-impressao\)\{display:none!important\}/.test(css) && !/body\.rp-imprimindo \.rp-doc\{[^}]*position:absolute/.test(css) && !/visibility:hidden/.test(css.slice(css.indexOf('#rp-impressao'))),
  'item 8: a impressão usa a cópia em #rp-impressao (o resto do app sai com display:none; sem position:absolute por cima — o rodapé não cai sobre o último cartão)');
ok(/\.rp-doc \.rh-secao,\.rp-doc \.rh-sis,\.rp-doc \.rh-ferr,\.rp-doc \.rf-caixa\{break-inside:auto\}/.test(css) && /\.rp-doc h3,\.rp-doc h4,\.rp-doc \.rh-sub,\.rp-doc \.rh-intro\{break-after:avoid\}/.test(css),
  'item 8: cartões grandes podem quebrar entre blocos; título fica com o primeiro bloco');
ok(/onclone: svgComEstiloProprio/.test(js) && /scrollY: 0/.test(js) && /paginar\(this\.prop\.container, this\.prop\.pageSize\.inner\.px\.height\)/.test(js) && /pagebreak: \{ mode: \[\] \}/.test(js) && /"\.rh-sistemas-compactos"/.test(js),
  'item 8: PDF baixado — radar desenhado na cópia (onclone), página rolada não sai em branco, espaçador do html2pdf nunca dentro de grade');

/* impressao real do documento da paciente pela pagina Resultado */
const imp = await P.evaluate(async (snap) => {
  const sec = document.createElement('div'); sec.innerHTML = '<article class="rp-doc" id="rp-doc">' + window.ResultadoHolos.documentoHtml(snap, 'paciente', { semRodape: true }) +
    '<footer class="rp-rodape"><p class="rp-emitiu">Nutri Ficticia</p></footer></article>'; document.body.appendChild(sec);
  const antes = document.getElementById('rp-doc').outerHTML;
  window.print = () => {}; window.ResultadoPagina.imprimir();
  const copia = document.getElementById('rp-impressao');
  const r = { copia: !!copia, semIds: copia ? copia.querySelectorAll('[id]').length === 0 : false, filhoDoBody: copia ? copia.parentNode === document.body : false, classe: document.body.classList.contains('rp-imprimindo'), igual: document.getElementById('rp-doc').outerHTML === antes };
  return r;
}, snap);
ok(imp.copia && imp.semIds && imp.filhoDoBody && imp.classe && imp.igual, 'item 8: Imprimir copia o documento para #rp-impressao (filho do body, sem ids duplicados) e não altera o documento da tela');
await P.emulateMediaType('print');
const pdf = await P.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '14mm', left: '12mm', right: '12mm' } });
await P.emulateMediaType('screen');
const paginas = (Buffer.from(pdf).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
ok(paginas >= 3 && paginas <= 12, 'item 8: a impressão gera um PDF com o documento inteiro (' + paginas + ' páginas para o snapshot com 9 ferramentas)');
/* teste em producao 13/10: com o app no tema ESCURO, os rotulos do documento da paciente (papel creme) sumiam no PDF */
const contraste = await P.evaluate((snap) => {
  document.body.classList.add('escuro');
  const sec = document.createElement('div'); sec.innerHTML = '<article class="rp-doc">' + window.ResultadoHolos.documentoHtml(snap, 'paciente', { semRodape: true }) + '</article>'; document.body.appendChild(sec);
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const a = m.length > 3 ? m[3] : 1; const f = (v) => { v = (v * a + 251 * (1 - a)) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const fundo = lum('rgb(251,248,240)');
  const r = {};
  ['.sf-rot', '.sf-nota', '.sf-def-curta', '.rh-intro', '.rh-sis-faixa', '.rh-num span'].forEach(sel => { const el = sec.querySelector(sel); if (!el) return; const l = lum(getComputedStyle(el).color); r[sel] = Math.round((Math.max(l, fundo) + 0.05) / (Math.min(l, fundo) + 0.05) * 10) / 10; });
  sec.remove(); document.body.classList.remove('escuro'); return r;
}, snap);
ok(Object.keys(contraste).length >= 5 && Object.values(contraste).every(c => c >= 4.5),
  'tema escuro: rótulos e textos do documento da paciente legíveis no papel creme (contraste ≥ 4,5) — ' + JSON.stringify(contraste));
/* pos-teste MR-V1 13/10: paginacao propria do PDF baixado, rodada no documento real na largura util do A4 (186 mm) */
const pg = await P.evaluate((snap) => {
  document.body.classList.add('rp-gerando');
  const caixa = document.createElement('div'); caixa.style.cssText = 'width:703px;position:absolute;left:0;top:0;background:#fff';
  caixa.innerHTML = '<article class="rp-doc">' + window.ResultadoHolos.documentoHtml(snap, 'paciente', { semRodape: true }) +
    '<footer class="rp-rodape"><p class="rp-emitiu">Nutri Ficticia</p><p class="rp-fronteira">Rodapé fictício.</p></footer></article>';
  document.body.appendChild(caixa);
  const H = 1024;   // 271 mm de area util (297 - 12 - 14) a 96 dpi
  window.ResultadoPagina.paginar(caixa, H);
  const top0 = caixa.getBoundingClientRect().top, T = (el) => el.getBoundingClientRect().top - top0, B = (el) => el.getBoundingClientRect().bottom - top0;
  const todos = [...caixa.querySelectorAll(window.ResultadoPagina.ATOMOS)];
  const atomos = todos.filter(el => !todos.some(o => o !== el && o.contains(el)) && el.getBoundingClientRect().height > 0);
  const cruzam = atomos.filter(el => B(el) - T(el) < H * 0.9 && Math.floor((T(el) + 1) / H) !== Math.floor((B(el) - 1) / H)).map(el => el.className || el.tagName);
  /* titulo sozinho: o ultimo atomo de uma pagina e um titulo/rotulo e o seguinte comeca na pagina seguinte */
  const orfaos = [];
  for (let i = 0; i < atomos.length - 1; i++) {
    const a = atomos[i], b = atomos[i + 1];
    if (a.matches('h3,h4,.rh-intro,.sf-rot') && Math.floor(T(a) / H) < Math.floor(T(b) / H)) orfaos.push(a.textContent.trim().slice(0, 40));
  }
  const paginas = Math.ceil(caixa.scrollHeight / H), espacadores = caixa.querySelectorAll('.rp-quebra').length;
  caixa.remove(); document.body.classList.remove('rp-gerando');
  return { cruzam, orfaos, paginas, espacadores };
}, snap);
ok(pg.cruzam.length === 0 && pg.orfaos.length === 0 && pg.espacadores > 0,
  'PDF baixado: nenhum bloco cruza o fim da página e nenhum título fica sozinho (' + pg.paginas + ' páginas, ' + pg.espacadores + ' quebras) ' + JSON.stringify({ cruzam: pg.cruzam, orfaos: pg.orfaos }));
const idx = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
ok(!/Seu corpo está contando uma história/.test(idx) && idx.includes('HOLOSCAN concluído. Revise as áreas prioritárias e os próximos aprofundamentos sugeridos antes de seguir para as ferramentas.'),
  'pós-teste 13/10: frase pós-HOLOSCAN profissional (a frase causal/mística saiu)');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nresultado da paciente (UX final): tudo ok');
process.exit(falhou ? 1 : 0);
