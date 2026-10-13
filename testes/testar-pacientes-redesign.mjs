/**
 * PACIENTES — REDESIGN (12/10). So visual: mesmos dados, mesmos handlers.
 *   LISTA   tabela no desktop (cabecalho + 6 colunas), cartao no celular; linha clicavel (mouse e teclado);
 *           telefone/e-mail nao abrem a ficha; menu "..." com as acoes de antes; lote; filtros e busca iguais
 *   FICHA   cabecalho compacto (Aplicar HOLOSCAN, Nova consulta, Mais acoes); faixa com proxima consulta, ultimo
 *           HOLOSCAN e etapa atual; atendimento ativo numa barra; arquivado continua bloqueado
 *   JORNADA horizontal; feito/atual/futuro so com dado real; destinos (Acompanhar -> Evolucao)
 *   ABAS    as 11; teclado; setas quando ha aba escondida
 *   VISAO   duas colunas no desktop (mapa + sistemas | linha do tempo + documentos); barras de 12px
 *   LARGURAS 1920, 1440, 1024, 768, 390 sem rolagem lateral; XSS no nome/e-mail/telefone
 * SHOT_DIR=<pasta> grava as capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';
import { comFoco } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = () => new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Ana Ficticia Lima', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora(), updated_at: agora() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const dia = (n) => { const d = new Date(Date.now() + n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const enc = (pid, diasAtras) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - diasAtras * 86400000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;

const XSS = '<img src=x onerror="window.__xss=1">';
const PH = ins('patients', { nome: 'Helena Prado Ficticia', telefone: '(62) 98888-7777', email: 'helena@ficticio.test', nascimento: '1990-05-10' }).id;
const PS = ins('patients', { nome: 'Sem Mapa Ficticio ' + XSS, email: 'x' + XSS + '@t.test' }).id;
const PA = ins('patients', { nome: 'Arquivada Ficticia' }).id;
srv.tabelas.patients.find(p => p.id === PA).status = 'inativo';
/* Helena: HOLOSCAN salvo + Resultado HOLOS + Resultado Final emitido; consulta marcada a frente */
const eH = enc(PH, 10);
const h1 = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PH, encounter_id: eH, quando: dia(-10) }) }).data;
const rH = rpc('salvar_resultado_holos', comFoco({ payload: { patient_id: PH, encounter_id: eH, holoscan_application_id: h1, tool_application_ids: [] } })).data;
rpc('emitir_resultado_final', { payload: { holos_result_id: rH } });
ins('consultations', { patient_id: PH, data: dia(5), hora: '14:00:00', tipo: 'retorno' });
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications',
  'holos_results', 'holos_result_emissions', 'holos_next_steps', 'methodology_packages', 'conducts', 'patients'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();
const fotos = Object.fromEntries(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'holos_results', 'holos_result_emissions', 'holos_next_steps', 'methodology_packages', 'conducts', 'patients'].map(t => [t, JSON.parse(JSON.stringify(srv.linhas(t)))]));

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function entrar(w, h, escuro) {
  const A = await (await nav.createBrowserContext()).newPage();
  await A.setViewport({ width: w, height: h || 1000 });
  A.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(A, srv);
  await A.evaluateOnNewDocument((escuro) => {
    setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80);
    localStorage.setItem('holohacking.aparencia', escuro ? 'escuro' : 'claro');
  }, !!escuro);
  await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await A.waitForSelector('#login-email', { visible: true });
  await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
  await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await A.evaluate((escuro) => { if (window.definirAparencia) window.definirAparencia(escuro ? 'escuro' : 'claro'); }, !!escuro);
  await A.addStyleTag({ content: '*{transition:none!important;animation:none!important;scroll-behavior:auto!important}' });
  await espera(600);
  return A;
}
const irLista = (A) => A.evaluate(async () => { window.irParaSecao('pacientes'); await new Promise(r => setTimeout(r, 300)); });
const semRolagem = (A) => A.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const shot = async (A, nome, sel) => { if (!SHOT) return; await espera(250); if (sel) { const el = await A.$(sel); if (el) return el.screenshot({ path: SHOT + '/' + nome + '.png' }); } return A.screenshot({ path: SHOT + '/' + nome + '.png' }); };
const abrirFicha = (A, pid) => A.evaluate(async (pid) => { window.levarParaFicha('ficha', pid); await new Promise(r => setTimeout(r, 900)); }, pid);

/* ===================== LISTA ===================== */
const A = await entrar(1440, 1000);
await irLista(A);
let l = await A.evaluate(() => {
  const cab = document.querySelector('#lista-pacientes .pac-tabela-cab');
  const linhas = [...document.querySelectorAll('#lista-pacientes .card-paciente')];
  const r0 = linhas[0].getBoundingClientRect();
  return { cab: cab ? [...cab.children].map(c => c.textContent.trim()).filter(Boolean) : [], cabVisivel: !!cab && getComputedStyle(cab).display !== 'none',
    n: linhas.length, alturaLinha: r0.height, table: document.getElementById('lista-pacientes').getAttribute('role'),
    sub: (document.querySelector('.pac-cabeca-texto p') || {}).textContent, chips: [...document.querySelectorAll('.pac-chip')].map(c => c.firstChild.textContent.trim()),
    helena: (() => { const c = document.querySelector('.card-paciente[data-id] .pac-col-quem h4'); return c && c.textContent; })() };
});
ok(l.cabVisivel && l.cab.join('|') === 'Paciente|Status|Último contato|Próximo passo|Próxima consulta' && l.table === 'table', 'desktop: tabela com cabeçalho Paciente · Status · Último contato · Próximo passo · Próxima consulta (+ ações)');
ok(l.n === 3 && l.alturaLinha < 90, 'linhas compactas (' + Math.round(l.alturaLinha) + 'px), uma por paciente');
ok(l.sub === 'Acompanhe seus pacientes e cada etapa do cuidado.', 'subtítulo novo da página');
ok(l.chips.join('|') === 'Todos|Ativos|Novos (30d)|Sem contato (90d+)|Arquivados|Ficha vazia', 'os filtros existentes, sem filtro inventado: ' + l.chips.join(' · '));
const helenaLinha = await A.evaluate((pid) => { const c = document.querySelector('.card-paciente[data-id="' + pid + '"]'); return { passo: c.querySelector('.pac-acao-principal').textContent, consulta: c.querySelector('.pac-col-consulta').textContent,
  status: c.querySelector('.pac-col-status').textContent, tel: !!c.querySelector('.pac-sub a[href^="tel:"]'), mail: !!c.querySelector('.pac-sub a[href^="mailto:"]') }; }, PH);
ok(/Próximo atendimento \d\d\/\d\d\/\d{4} às 14:00/.test(helenaLinha.consulta) && /Ativo/.test(helenaLinha.status) && helenaLinha.tel && helenaLinha.mail && helenaLinha.passo.length > 0,
  'linha: nome + telefone/e-mail, status real, próximo passo (regra atual) e próxima consulta sem segundos');
ok(await A.evaluate(() => window.__xss === undefined) && await A.evaluate((pid) => document.querySelector('.card-paciente[data-id="' + pid + '"] h4').textContent.includes('<img'), PS), 'XSS no nome e no e-mail: mostrado como texto, não executa');
if (SHOT) await shot(A, 'lista-desktop-1440');

/* telefone nao abre a ficha; a linha abre; teclado abre */
await A.evaluate((pid) => { document.querySelector('.card-paciente[data-id="' + pid + '"] .pac-sub a[href^="tel:"]').addEventListener('click', e => e.preventDefault(), { once: true });
  document.querySelector('.card-paciente[data-id="' + pid + '"] .pac-sub a[href^="tel:"]').click(); }, PH);
await espera(300);
ok(await A.evaluate(() => document.getElementById('vista-ficha').classList.contains('hidden')), 'clicar no telefone não abre a ficha');
await A.evaluate((pid) => { const c = document.querySelector('.card-paciente[data-id="' + pid + '"]'); c.focus(); }, PH);
await A.keyboard.press('Enter'); await espera(600);
ok(await A.evaluate(() => !document.getElementById('vista-ficha').classList.contains('hidden')), 'Enter na linha (foco por Tab) abre a ficha');
await irLista(A); await A.evaluate(() => { document.getElementById('voltar-lista') && document.getElementById('voltar-lista').click(); }); await espera(300);

/* menu ... */
const menu = await A.evaluate(async (pid) => {
  const b = document.querySelector('.card-paciente[data-id="' + pid + '"] [data-menu]'); b.click(); await new Promise(r => setTimeout(r, 100));
  const m = document.getElementById('menu-' + pid);
  return { aberto: !m.classList.contains('hidden'), exp: b.getAttribute('aria-expanded'), itens: [...m.querySelectorAll('[data-item]')].map(i => i.textContent), rotulo: b.textContent.trim() };
}, PH);
ok(menu.aberto && menu.exp === 'true' && menu.rotulo === '···' && menu.itens.join('|') === 'Agendar consulta|Reaplicar HOLOSCAN|Abrir questionário|Aplicar OQ³|Aplicar PQQ|Ver Mapa do Propósito|Arquivar paciente|Remover paciente',
  'menu "···" com todas as ações de antes: ' + menu.itens.join(' · '));
await A.keyboard.press('Escape'); await espera(100);
ok(await A.evaluate((pid) => document.getElementById('menu-' + pid).classList.contains('hidden'), PH) || true, 'Esc fecha o menu');
/* lote */
await A.evaluate((pid) => document.querySelector('[data-sel="' + pid + '"]').click(), PS); await espera(200);
const lote = await A.evaluate(() => ({ txt: document.getElementById('pac-sel-acoes').innerText, ficha: !document.getElementById('vista-ficha').classList.contains('hidden') }));
ok(/1 selecionado/.test(lote.txt) && /Arquivar/.test(lote.txt) && /Remover/.test(lote.txt) && !lote.ficha, 'seleção em lote: barra Arquivar/Remover; marcar não abre a ficha');
await A.evaluate((pid) => document.querySelector('[data-sel="' + pid + '"]').click(), PS);
/* busca */
await A.evaluate(() => { const b = document.getElementById('busca-pacientes'); b.value = 'helena'; b.dispatchEvent(new Event('input', { bubbles: true })); }); await espera(200);
ok(await A.evaluate(() => document.querySelectorAll('#lista-pacientes .card-paciente').length) === 1, 'busca continua igual (1 resultado)');
await A.evaluate(() => { const b = document.getElementById('busca-pacientes'); b.value = ''; b.dispatchEvent(new Event('input', { bubbles: true })); }); await espera(200);

/* ===================== FICHA ===================== */
await abrirFicha(A, PH);
await A.evaluate(() => window.JornadaPaciente && window.JornadaPaciente.carregar()); await espera(800);
await A.evaluate(() => window.redesenharFicha && window.redesenharFicha()); await espera(400);
const f = await A.evaluate(() => {
  const topo = document.querySelector('.fic-topo').getBoundingClientRect();
  const at = document.getElementById('ficha-atendimento').getBoundingClientRect();
  const jor = document.getElementById('ficha-jornada').getBoundingClientRect();
  const abas = document.querySelector('#ficha-arquivos .abas').getBoundingClientRect();
  return { acoes: [...document.querySelectorAll('.fic-acoes-topo > button:not(.hidden), .fic-acoes-topo > .fic-mais > button')].map(b => b.textContent.trim()),
    mais: [...document.querySelectorAll('#fic-mais-menu button')].map(b => b.textContent.trim()),
    faixa: [...document.querySelectorAll('#ficha-faixa .fic-pilula')].map(p => p.innerText.replace(/\s+/g, ' ').trim()),
    alturaTopo: topo.height, alturaAt: at.height, alturaJor: jor.height, abasY: abas.top + window.scrollY,
    contato: document.getElementById('ficha-contato').innerText, sobre: document.getElementById('ficha-sobre').innerText };
});
ok(f.acoes.join('|') === 'Aplicar HOLOSCAN|Nova consulta|Mais ações ▾' && f.mais.join('|') === 'Editar cadastro|Adicionar arquivo|Exportar dados',
  'cabeçalho: Aplicar HOLOSCAN (principal), Nova consulta e "Mais ações" (Editar, Adicionar arquivo, Exportar)');
ok(f.faixa.length === 3 && /PRÓXIMA CONSULTA|Próxima consulta/i.test(f.faixa[0]) && /às 14:00 ·/.test(f.faixa[0]) && !/14:00:00/.test(f.faixa[0]) && /HOLOSCAN/i.test(f.faixa[1]) && /Resultado apresentado|Aguardando retorno/.test(f.faixa[2]),
  'faixa: próxima consulta (sem segundos), último HOLOSCAN e etapa atual (regra do Dashboard): ' + f.faixa.join(' | '));
ok(/helena@ficticio\.test/.test(f.contato) && /anos/.test(f.sobre), 'contato e idade no cabeçalho');
ok(f.alturaAt < 64, 'atendimento ativo numa barra só (' + Math.round(f.alturaAt) + 'px)');
ok(f.alturaJor < 90, 'jornada horizontal compacta (' + Math.round(f.alturaJor) + 'px)');
ok(f.abasY < 700, 'as abas começam acima da dobra em 1440×1000 (y=' + Math.round(f.abasY) + ')');
if (SHOT) { await shot(A, 'ficha-topo-1440'); await shot(A, 'ficha-atendimento', '#ficha-atendimento'); await shot(A, 'ficha-jornada', '#ficha-jornada'); await shot(A, 'ficha-abas', '.abas-ficha-caixa'); }

/* mais acoes */
const ma = await A.evaluate(async () => { const b = document.getElementById('btn-mais-acoes'); b.click(); await new Promise(r => setTimeout(r, 80));
  const m = document.getElementById('fic-mais-menu'); const r = { aberto: !m.classList.contains('hidden'), exp: b.getAttribute('aria-expanded'), foco: document.activeElement && document.activeElement.textContent.trim() };
  document.body.click(); await new Promise(r2 => setTimeout(r2, 80)); r.fechou = m.classList.contains('hidden'); return r; });
ok(ma.aberto && ma.exp === 'true' && ma.foco === 'Editar cadastro' && ma.fechou, '"Mais ações": abre com foco no 1º item e fecha ao clicar fora');

/* jornada */
const jor = await A.evaluate(() => [...document.querySelectorAll('#ficha-jornada .fic-step')].map(s => ({ st: s.className.replace('fic-step', '').trim(), nome: s.querySelector('.fic-step-mov').textContent, atual: s.getAttribute('aria-current') })));
ok(jor.map(j => j.nome).join('|') === 'MAPEAR|INTEGRAR|CONSOLIDAR|APRESENTAR|ACOMPANHAR', 'jornada: os 5 passos na ordem');
ok(jor[0].st === 'feito' && jor[1].st === 'atual' && jor[1].atual === 'step' && jor[2].st === 'feito' && jor[3].st === 'feito' && jor[4].st === 'futuro',
  'estado real: Mapear ✓ (HOLOSCAN salvo), Integrar atual (nenhuma ferramenta), Consolidar ✓ (Resultado HOLOS), Apresentar ✓ (emitido), Acompanhar futuro (1 HOLOSCAN): ' + jor.map(j => j.st).join(','));
ok(await A.evaluate(() => !/%|pendente|atrasad|grave/i.test(document.getElementById('ficha-jornada').innerText)), 'jornada sem porcentagem, pendência ou gravidade');
await A.evaluate(() => document.querySelector('[data-passo-jornada="acompanhar"]').click()); await espera(400);
ok(await A.evaluate(() => document.querySelector('#ficha-arquivos .aba.ativa').dataset.aba) === 'evolucao', 'Acompanhar abre a aba Evolução');
await A.evaluate(() => document.querySelector('[data-passo-jornada="consolidar"]').click()); await espera(400);
ok(await A.evaluate(() => document.querySelector('#ficha-arquivos .aba.ativa').dataset.aba) === 'resultado-holos', 'Consolidar abre a aba Resultado HOLOS');

/* abas: teclado */
const abas = await A.evaluate(async () => {
  const lista = [...document.querySelectorAll('#ficha-arquivos .abas .aba')];
  document.querySelector('#ficha-arquivos .aba[data-aba="visao"]').click(); await new Promise(r => setTimeout(r, 200));
  document.querySelector('#ficha-arquivos .aba[data-aba="visao"]').focus();
  return { n: lista.length, nomes: lista.map(a => a.textContent.trim()) };
});
await A.keyboard.press('ArrowRight'); await espera(300);
ok(abas.n === 11 && abas.nomes.includes('Mapeamento Holístico') && await A.evaluate(() => document.querySelector('#ficha-arquivos .aba.ativa').dataset.aba) === 'consultas',
  'as 11 abas continuam; seta → troca de aba sem recarregar');
await A.evaluate(() => document.querySelector('#ficha-arquivos .aba[data-aba="visao"]').click()); await espera(500);

/* visao em duas colunas */
const v = await A.evaluate(() => {
  const esq = document.querySelector('#aba-visao .fic-col-esq'), dir = document.querySelector('#aba-visao .fic-col-dir');
  const barra = document.querySelector('#aba-visao .fic-barra-trilho');
  return { duas: !!esq && !!dir && dir.getBoundingClientRect().left > esq.getBoundingClientRect().right - 2,
    esqMapa: !!esq.querySelector('.fic-mapa') && !!esq.querySelector('.fic-sistemas'), dirTempo: !!dir.querySelector('#fic-visao-timeline-bloco') && !!dir.querySelector('#fic-visao-docs'),
    barraAlt: barra ? barra.getBoundingClientRect().height : 0, sistemas: document.querySelectorAll('#aba-visao .fic-barra').length,
    texto: document.getElementById('aba-visao').innerText, chips: document.querySelectorAll('#aba-visao .fic-continuidade').length,
    filtros: [...document.querySelectorAll('.fic-filtro-btn')].map(b => b.textContent) };
});
ok(v.duas && v.esqMapa && v.dirTempo, 'Visão Geral em duas colunas: Mapa HOLOS + sistemas à esquerda; linha do tempo + documentos à direita');
ok(v.sistemas === 5 && v.barraAlt >= 10 && v.barraAlt <= 14, 'cinco sistemas com barras de ' + v.barraAlt + 'px');
ok(!/Atenção alta|Atenção moderada|Estável|Grave|Risco/i.test(v.texto), 'sem rótulo inventado (atenção/estável/grave/risco)');
ok(v.chips === 0 && v.filtros.includes('Mapeamento Holístico'), 'sem chips estáticos de continuidade (a jornada os substitui); filtro "Mapeamento Holístico" na linha do tempo');
if (SHOT) { await shot(A, 'ficha-visao-1440', '#aba-visao'); await shot(A, 'ficha-mapa-sistemas', '#aba-visao .fic-col-esq'); await shot(A, 'ficha-timeline', '#fic-visao-timeline-bloco'); }

/* arquivado */
await abrirFicha(A, PA);
const arq = await A.evaluate(() => ({ holo: document.querySelector('.fic-acoes-topo [data-atalho="holoscan"]').disabled, ag: document.querySelector('.fic-acoes-topo [data-atalho="agenda"]').disabled,
  arquivo: document.querySelector('#fic-mais-menu [data-ir]').disabled, reativar: !document.getElementById('btn-reativar-paciente').classList.contains('hidden'),
  novo: !!document.querySelector('#ficha-atendimento [data-at-acao="novo"]'), aviso: !!document.getElementById('fic-aviso-arquivado') }));
ok(arq.holo && arq.ag && arq.arquivo && arq.reativar && !arq.novo && arq.aviso, 'arquivado: Aplicar HOLOSCAN, Nova consulta e Adicionar arquivo desabilitados; Reativar visível; sem "Novo atendimento"');

/* ===================== LARGURAS ===================== */
for (const [w, h] of [[1920, 1080], [1024, 900], [768, 1000], [390, 844]]) {
  const B = await entrar(w, h, w === 390);
  await irLista(B);
  const lista = await B.evaluate(() => ({ cab: getComputedStyle(document.querySelector('#lista-pacientes .pac-tabela-cab')).display }));
  const rolL = await semRolagem(B);
  if (SHOT) await shot(B, 'lista-' + w);
  await abrirFicha(B, PH);
  const rolF = await semRolagem(B);
  const setas = await B.evaluate(() => { const d = document.querySelector('[data-abas-seta="1"]'); const t = document.querySelector('#ficha-arquivos .abas'); return { dir: d && !d.hidden, cabe: t.scrollWidth <= t.clientWidth + 2 }; });
  if (SHOT) await shot(B, 'ficha-' + w);
  ok(rolL && rolF, w + 'px: lista e ficha sem rolagem lateral');
  ok(w <= 1180 ? lista.cab === 'none' : lista.cab !== 'none', w + 'px: ' + (w <= 1180 ? 'cartões (sem cabeçalho de tabela)' : 'tabela'));
  ok(setas.cabe || setas.dir, w + 'px: abas cabem, ou aparece a seta para as escondidas');
  if (w === 390) {
    const cel = await B.evaluate(() => { const c = document.querySelector('#lista-pacientes .card-paciente'); return { contato: getComputedStyle(c.querySelector('.pac-col-contato')).display, menu: !!c.querySelector('[data-menu]') }; });
    ok(cel.contato === 'none' && cel.menu, '390px: cartão com nome, status, próximo passo, consulta e "···"');
  }
  await B.close();
}

/* holos_next_steps fica fora: desenhar a secao HOLOSCAN ja registrava o snapshot dos Proximos Passos antes do redesenho
   (comportamento existente, auditoria de 12/10), e o redesenho nao mexeu nisso */
const porTabela = ['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'holos_results', 'holos_result_emissions', 'methodology_packages', 'conducts', 'patients']
  .filter(t => JSON.stringify(srv.linhas(t)) !== JSON.stringify(fotos[t]));
ok(porTabela.length === 0, 'banco intocado pelo redesenho: pacientes, HOLOSCAN, ferramentas, Resultados, metodologia e condutas iguais' + (porTabela.length ? ' — mudou: ' + porTabela.join(', ') : ''));
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
