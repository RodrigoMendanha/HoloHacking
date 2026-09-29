/**
 * METANUTRI — a porta (edge function holos-ai) e a tela, contra um HUB FALSO.
 *
 * O hub falso e um servidor HTTP de verdade em 127.0.0.1 que responde como o
 * contrato do hub (POST /api/agente-site): {texto} ou {motivo, frase}. A
 * funcao roda o MESMO handler que vai para o Supabase (metanutri.ts), com o
 * fetch real do Node. A chave de teste e gerada aqui, a cada execucao.
 *
 *   S1  sem login: 401, hub nao e chamado (sem token, token invalido, anonimo)
 *   S2  logada sem secret: sem_chave, hub nao e chamado
 *   S3  texto: 200 so com {texto}; o hub recebe a chave e so {mensagem, historico}
 *   S3b o historico no formato do hub (role/content mapeado) e o corte em 20
 *   S4  cada motivo do hub: {motivo, frase} com a frase do hub
 *   S5  tempo esgotado (cabecalho lento e corpo lento), hub fora, resposta lixo
 *   S6  a chave nao aparece em resposta nenhuma nem no log, nem se o hub ecoar
 *   S7  usuarioPeloAuth: 200 = usuaria; 401 e anonima = ninguem
 *   T1  a entrada so aparece logada; linha fixa; sem chave mostra a frase
 *   T2  carregando, resposta, historico so em memoria, sem dado de paciente
 *   T3  erro com a frase do hub e "Tentar de novo"; tempo esgotado na tela
 *   T4  pergunta com nome de paciente nao sai da tela; sair apaga a conversa
 *   T5  375 e desktop: sem estouro, alvos de 44 px, texto de 13 px ou mais
 *   B   a chave nao aparece no bundle servido nem nas respostas vistas pela pagina
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { tratar, usuarioPeloAuth, FRASES } from '../supabase/functions/holos-ai/metanutri.ts';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const CHAVE = 'ags_teste_' + randomBytes(16).toString('hex');
const MOTIVOS = { chave_invalida: 401, limite_do_dia: 429, devagar: 429, sem_chave: 500,
  ia_falhou: 502, mensagem: 400, banco: 500 };

/* ------------------------------------------------------------ hub falso -- */
const hub = { modo: 'texto', chamadas: [], atraso: 0 };
const servidorHub = createServer((req, res) => {
  let corpo = '';
  req.on('data', d => { corpo += d; });
  req.on('end', async () => {
    hub.chamadas.push({ auth: req.headers.authorization || '', corpo, url: req.url, metodo: req.method });
    const m = hub.modo;
    const responder = (status, obj) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(typeof obj === 'string' ? obj : JSON.stringify(obj));
    };
    if (m === 'lento') { await esperar(hub.atraso || 2000); return responder(200, { texto: 'tarde demais' }); }
    if (m === 'corpo-lento') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.write('{"texto":"com');
      await esperar(hub.atraso || 2000);
      return res.end('eco"}');
    }
    if (m === 'lixo') return responder(200, '<html>erro</html>');
    if (m === 'vazio') return responder(200, { texto: '   ' });
    if (m === 'eco') return responder(401, { motivo: 'chave_invalida', frase: 'Chave recusada: ' + CHAVE });
    if (m === 'eco-texto') return responder(200, { texto: 'sua chave e ' + CHAVE + ' ok', chave: CHAVE });
    if (MOTIVOS[m]) return responder(MOTIVOS[m], { motivo: m, frase: 'Frase do hub para ' + m + '.', detalhe: 'interno' });
    if (hub.atraso) await esperar(hub.atraso);
    let pergunta = '';
    try { pergunta = JSON.parse(corpo).mensagem; } catch (e) { /* */ }
    return responder(200, { texto: 'Resposta do MetaNutri para: ' + pergunta, uso: { tokens: 12 } });
  });
});
await new Promise(r => servidorHub.listen(0, '127.0.0.1', r));
const HUB_URL = `http://127.0.0.1:${servidorHub.address().port}/api/agente-site`;
const PORTA_FECHADA = await new Promise(r => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

/* ------------------------------------------------------- a funcao (S) -- */
const USUARIA = { id: '11111111-1111-4111-8111-111111111111' };
const logs = [];
const respostas = [];     // tudo que a funcao devolveu, para a varredura da chave
function dep(extra) {
  return {
    chave: CHAVE, hubUrl: HUB_URL, tetoMs: 400,
    usuario: async (t) => (t === 'token-bom' ? USUARIA : null),
    fetch, log: (l) => logs.push(l), ...extra
  };
}
async function chamar(corpo, opcoes = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (opcoes.token !== null) headers.Authorization = 'Bearer ' + (opcoes.token || 'token-bom');
  const req = new Request('https://x.supabase.co/functions/v1/holos-ai', {
    method: opcoes.metodo || 'POST', headers,
    body: (opcoes.metodo || 'POST') === 'POST' ? (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) : undefined
  });
  const r = await tratar(req, dep(opcoes.dep));
  const texto = await r.text();
  const cab = JSON.stringify(Object.fromEntries(r.headers));
  respostas.push(texto, cab);
  let json = null; try { json = JSON.parse(texto); } catch (e) { /* */ }
  return { status: r.status, json, texto, cab };
}
const chaves = (o) => Object.keys(o || {}).sort().join(',');

titulo('S1 — SEM LOGIN: 401, E O HUB NAO E CHAMADO');
hub.chamadas = []; hub.modo = 'texto';
for (const [nome, token] of [['sem Authorization', null], ['token invalido', 'token-ruim'], ['Bearer vazio', ' ']]) {
  const r = await chamar({ mensagem: 'oi' }, { token });
  ok(r.status === 401 && r.json && r.json.motivo === 'sem_login' && r.json.frase === FRASES.sem_login,
     nome + ': 401 {motivo: sem_login} com frase humana (' + r.status + ')');
}
{
  const r = await chamar({ mensagem: 'oi' }, { dep: { usuario: async () => { throw new Error('auth caiu'); } } });
  ok(r.status === 401, 'Auth fora do ar conta como sem login, nao como 500 (' + r.status + ')');
}
ok(hub.chamadas.length === 0, 'nenhum pedido sem login chegou ao hub');

titulo('S2 — LOGADA SEM SECRET: sem_chave, NADA QUEBRA');
for (const [nome, c] of [['secret ausente', undefined], ['secret vazio', ''], ['secret so espacos', '   ']]) {
  const r = await chamar({ mensagem: 'oi' }, { dep: { chave: c } });
  ok(r.status === 503 && r.json.motivo === 'sem_chave' && r.json.frase === FRASES.sem_chave && chaves(r.json) === 'frase,motivo',
     nome + ': 503 {motivo: sem_chave, frase}');
}
ok(hub.chamadas.length === 0, 'sem secret, o hub nao e chamado');

titulo('S3 — TEXTO: SO {texto} VOLTA; SO {mensagem, historico} VAI');
{
  const historico = [];
  for (let i = 0; i < 30; i++) historico.push({ autor: i % 2 ? 'agente' : 'visitante', texto: 'fala ' + i, extra: 'x' });
  historico.push({ autor: 'sistema', texto: 'ignorar' }, { autor: 'agente', texto: 42 }, null, { autor: 'visitante', texto: '   ' });
  const r = await chamar({ mensagem: '  Como precificar?  ', historico, paciente: 'nao pode ir', nutritionist_id: 'x' });
  ok(r.status === 200 && chaves(r.json) === 'texto' && r.json.texto === 'Resposta do MetaNutri para: Como precificar?',
     'resposta 200 so com {texto}: ' + r.texto);
  const c = hub.chamadas[hub.chamadas.length - 1];
  const enviado = JSON.parse(c.corpo);
  ok(c.metodo === 'POST' && c.auth === 'Bearer ' + CHAVE, 'o hub recebe POST com Authorization: Bearer <chave do secret>');
  ok(chaves(enviado) === 'historico,mensagem', 'o hub recebe so {mensagem, historico}: ' + chaves(enviado));
  ok(enviado.mensagem === 'Como precificar?', 'a mensagem vai aparada');
  ok(enviado.historico.length === 20 && enviado.historico.every(f => chaves(f) === 'autor,texto' &&
     (f.autor === 'visitante' || f.autor === 'agente')) && enviado.historico[19].texto === 'fala 29',
     'historico: as 20 ultimas falas validas, so {autor, texto}');
}
{
  const n = hub.chamadas.length;
  const longa = await chamar({ mensagem: 'x'.repeat(2001) });
  const vazia = await chamar({ mensagem: '   ' });
  const lixo = await chamar('isto nao e json');
  const semCampo = await chamar({ pergunta: 'oi' });
  ok([longa, vazia, lixo, semCampo].every(r => r.status === 400 && r.json.motivo === 'mensagem'),
     'mensagem acima de 2000, vazia, corpo nao-JSON ou sem o campo: 400 {motivo: mensagem}');
  ok(hub.chamadas.length === n, 'pedido invalido nao chega ao hub');
  const exata = await chamar({ mensagem: 'y'.repeat(2000) });
  ok(exata.status === 200, 'mensagem de exatamente 2000 caracteres passa');
}
{
  const r = await chamar(null, { metodo: 'GET' });
  ok(r.status === 405 && r.json.motivo === 'metodo', 'GET: 405 {motivo: metodo}');
}

titulo('S3b — O HISTORICO CHEGA AO HUB NO FORMATO DELE: {autor, texto}');
/* O hub descarta CALADO item fora de {autor: visitante|agente, texto} e o
   agente responde sem memoria (o que aconteceu com o app do Uromann). */
{
  hub.modo = 'texto';
  await chamar({ mensagem: 'E para o retorno?', historico: [
    { role: 'user', content: 'Quanto cobrar na primeira consulta?' },
    { role: 'assistant', content: 'Depende do seu posicionamento.' },
    { autor: 'visitante', texto: 'Sou de consultorio pequeno.' },
    { autor: 'agente', texto: 'Entao comece pelo custo da hora.' },
    { role: 'system', content: 'instrucao que nao pode passar' }
  ] });
  const recebido = hub.chamadas.at(-1).corpo;
  const esperado = JSON.stringify({ mensagem: 'E para o retorno?', historico: [
    { autor: 'visitante', texto: 'Quanto cobrar na primeira consulta?' },
    { autor: 'agente', texto: 'Depende do seu posicionamento.' },
    { autor: 'visitante', texto: 'Sou de consultorio pequeno.' },
    { autor: 'agente', texto: 'Entao comece pelo custo da hora.' }
  ] });
  ok(recebido === esperado, 'o JSON que chega ao hub e exatamente {mensagem, historico:[{autor, texto}]}: ' + recebido);
  ok(!/"role"|"content"/.test(recebido), 'nenhum role nem content chega ao hub');
  ok(!recebido.includes('instrucao que nao pode passar'), 'item de autor desconhecido (role system) nao passa');
}
{
  const historico = [];
  for (let i = 1; i <= 25; i++) {
    historico.push(i % 2 ? { role: 'user', content: 'pergunta ' + i + ' ' + 'p'.repeat(2500) }
                         : { role: 'assistant', content: 'resposta ' + i });
  }
  await chamar({ mensagem: 'ultima', historico });
  const h = JSON.parse(hub.chamadas.at(-1).corpo).historico;
  ok(h.length === 20 && h[0].texto.startsWith('resposta 6') && h[19].texto.startsWith('pergunta 25'),
     'de 25 falas, vao as 20 ultimas (da 6a a 25a): ' + h.length + ', primeira "' + h[0].texto.slice(0, 12) + '"');
  ok(h.every(f => f.texto.length <= 2000) && h[19].texto.length === 2000,
     'cada fala vai com no maximo 2000 caracteres (a de 2500+ foi cortada em ' + h[19].texto.length + ')');
  ok(h.every(f => Object.keys(f).join(',') === 'autor,texto' && (f.autor === 'visitante' || f.autor === 'agente')),
     'as 20 falas estao todas em {autor, texto}');
}

titulo('S4 — CADA MOTIVO DO HUB CHEGA COMO {motivo, frase}');
const STATUS_ESPERADO = { chave_invalida: 503, limite_do_dia: 429, devagar: 429, sem_chave: 503,
  ia_falhou: 502, mensagem: 400, banco: 502 };
for (const motivo of Object.keys(MOTIVOS)) {
  hub.modo = motivo;
  const r = await chamar({ mensagem: 'oi' });
  ok(r.json && r.json.motivo === motivo && r.json.frase === 'Frase do hub para ' + motivo + '.' &&
     chaves(r.json) === 'frase,motivo' && r.status === STATUS_ESPERADO[motivo],
     motivo + ': ' + r.status + ' {motivo, frase do hub}, nada alem');
}
hub.modo = 'texto';
{
  hub.modo = 'vazio';
  const r = await chamar({ mensagem: 'oi' });
  ok(r.status === 502 && r.json.motivo === 'hub_fora', 'hub com texto vazio: 502 hub_fora, nao bolha vazia');
}

titulo('S5 — TEMPO ESGOTADO, HUB FORA, RESPOSTA LIXO');
{
  hub.modo = 'lento'; hub.atraso = 2000;
  let t0 = Date.now();
  let r = await chamar({ mensagem: 'oi' });
  let ms = Date.now() - t0;
  ok(r.status === 504 && r.json.motivo === 'tempo_esgotado' && r.json.frase === FRASES.tempo_esgotado && ms < 1500,
     'hub sem responder: 504 tempo_esgotado no teto (' + ms + ' ms, teto 400)');
  hub.modo = 'corpo-lento';
  t0 = Date.now();
  r = await chamar({ mensagem: 'oi' });
  ms = Date.now() - t0;
  ok(r.status === 504 && r.json.motivo === 'tempo_esgotado' && ms < 1500,
     'hub que manda o cabecalho e trava o corpo: o teto tambem corta (' + ms + ' ms)');
  hub.atraso = 0;
  hub.modo = 'lixo';
  r = await chamar({ mensagem: 'oi' });
  ok(r.status === 502 && r.json.motivo === 'hub_fora' && r.json.frase === FRASES.hub_fora,
     'hub devolve HTML: 502 hub_fora com frase humana');
  r = await chamar({ mensagem: 'oi' }, { dep: { hubUrl: `http://127.0.0.1:${PORTA_FECHADA}/` } });
  ok(r.status === 502 && r.json.motivo === 'hub_fora', 'hub fora do ar (porta fechada): 502 hub_fora');
  const src = readFileSync(new URL('../supabase/functions/holos-ai/index.ts', import.meta.url), 'utf8');
  ok(/TETO_MS\s*=\s*60_000/.test(src) && /tetoMs:\s*TETO_MS/.test(src), 'em producao o teto e 60 s (index.ts)');
  ok(/Deno\.env\.get\("METANUTRI_AGENTE_KEY"\)/.test(src) && !/ags_[A-Za-z0-9]/.test(src),
     'index.ts le a chave so do secret METANUTRI_AGENTE_KEY, sem valor no codigo');
  hub.modo = 'texto';
}

titulo('S6 — A CHAVE NAO SAI: NEM EM RESPOSTA, NEM NO LOG, NEM EM ECO DO HUB');
{
  hub.modo = 'eco';
  const r1 = await chamar({ mensagem: 'oi' });
  hub.modo = 'eco-texto';
  const r2 = await chamar({ mensagem: 'oi' });
  hub.modo = 'texto';
  ok(r1.json.motivo === 'chave_invalida' && !r1.texto.includes(CHAVE), 'hub que ecoa a chave na frase: a chave e cortada');
  ok(chaves(r2.json) === 'texto' && !r2.texto.includes(CHAVE), 'hub que ecoa a chave no texto e num campo extra: nada passa');
  ok(respostas.length > 30 && respostas.every(t => !t.includes(CHAVE)),
     'nenhuma das ' + respostas.length / 2 + ' respostas (corpo e cabecalhos) contem a chave');
  ok(logs.length > 20 && logs.every(l => !l.includes(CHAVE) && /^metanutri status=\d+ motivo=[a-z_]+ ms=\d+$/.test(l)),
     'o log e uma linha por pedido (status, motivo, ms), sem chave e sem conteudo: "' + logs[0] + '"');
  ok(logs.every(l => !/precificar|fala \d/.test(l)), 'nenhuma pergunta ou historico no log');
}

titulo('S7 — usuarioPeloAuth CONFERE O JWT NO AUTH DO PROJETO');
{
  const pedidos = [];
  const auth = createServer((req, res) => {
    pedidos.push({ url: req.url, apikey: req.headers.apikey, auth: req.headers.authorization });
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    res.writeHead(t === 'jwt-bom' || t === 'jwt-anonimo' ? 200 : 401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(t === 'jwt-bom' ? { id: 'u-1', email: 'x' } :
      t === 'jwt-anonimo' ? { id: 'u-2', is_anonymous: true } : { msg: 'invalid JWT' }));
  });
  await new Promise(r => auth.listen(0, '127.0.0.1', r));
  const u = usuarioPeloAuth(`http://127.0.0.1:${auth.address().port}/`, 'chave-publica', fetch);
  const bom = await u('jwt-bom'), ruim = await u('jwt-ruim'), anonimo = await u('jwt-anonimo');
  ok(bom && bom.id === 'u-1', 'token valido: devolve a usuaria');
  ok(ruim === null && anonimo === null, 'token invalido e sessao anonima: ninguem');
  ok(pedidos[0].url === '/auth/v1/user' && pedidos[0].apikey === 'chave-publica' && pedidos[0].auth === 'Bearer jwt-bom',
     'confere em GET /auth/v1/user com apikey e o Bearer da nutricionista');
  const semUrl = await usuarioPeloAuth('', 'k', fetch)('jwt-bom');
  ok(semUrl === null, 'sem SUPABASE_URL: ninguem (401), nao excecao');
  auth.close();
}

/* ------------------------------------------------------------- tela (T) -- */
const srv = criarServidor();
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
const tela = { chave: '', tetoMs: 3000 };
srv.funcoes = {
  'holos-ai': (req) => tratar(req, {
    chave: tela.chave, hubUrl: HUB_URL, tetoMs: tela.tetoMs,
    usuario: async (t) => (t === 'falso-' + UID_A ? { id: UID_A } : null), fetch
  })
};
const chamadasFuncao = () => srv.log.filter(l => l.op === 'funcao');

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1366, height: 900 });
const errosJS = []; p.on('pageerror', e => errosJS.push(e.message));
const vistasPelaPagina = [];
p.on('response', async (r) => { try { vistasPelaPagina.push(await r.text()); } catch (e) { /* */ } });
await ligarPagina(p, srv);
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });

titulo('T1 — ENTRADA SO LOGADA, LINHA FIXA, SEM CHAVE MOSTRA A FRASE');
ok(await p.$eval('#nav-metanutri', e => e.hidden && getComputedStyle(e).display === 'none'),
   'antes do login a entrada MetaNutri nao aparece');
await p.waitForSelector('#login-email', { visible: true });
await p.type('#login-email', 'a@holo.test');
await p.type('#login-senha', 'senha-a-123');
await p.click('#btn-entrar');
await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
  window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await p.waitForFunction(() => !document.getElementById('nav-metanutri').hidden, { timeout: 5000 });
ok(await p.$eval('#nav-metanutri', e => getComputedStyle(e).display !== 'none' && e.textContent.trim() === 'MetaNutri'),
   'logada, a entrada "MetaNutri" aparece no menu');

/* um paciente na conta, para provar que nada dele vai no corpo */
const NOME_PACIENTE = 'Fulana Sigilosa de Teste';
await p.evaluate(async (nome) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = nome;
  document.getElementById('np-queixa') && (document.getElementById('np-queixa').value = 'queixa sigilosa');
  document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40 && !(window.pacientesTodos() || []).some(x => x.nome === nome); i++) await new Promise(r => setTimeout(r, 100));
}, NOME_PACIENTE);

await p.click('#nav-metanutri');
ok(await p.$eval('#secao-metanutri', e => e.classList.contains('ativa')), 'a tela MetaNutri abre pelo menu');
ok(await p.$eval('#mn-aviso', e => e.textContent.trim() === 'Mentor de negócio. Não responde sobre pacientes.' &&
   getComputedStyle(e).display !== 'none'), 'linha fixa: "Mentor de negócio. Não responde sobre pacientes."');

async function perguntar(texto) {
  await p.$eval('#mn-mensagem', (e) => { e.value = ''; });
  await p.type('#mn-mensagem', texto);
  await p.click('#mn-enviar');
}
const esperarFim = () => p.waitForFunction(() => !document.querySelector('.mn-carregando'), { timeout: 8000 });

await perguntar('Como precificar minha consulta?');
await esperarFim();
ok(await p.$eval('.mn-erro .mn-erro-frase', e => e.textContent) === FRASES.sem_chave,
   'sem chave: a tela mostra a frase de sem_chave: "' + FRASES.sem_chave + '"');
ok(await p.$('#mn-tentar') !== null, 'e oferece "Tentar de novo"');

titulo('T2 — CARREGANDO, RESPOSTA, HISTORICO SO EM MEMORIA, SEM PACIENTE');
tela.chave = CHAVE; hub.modo = 'texto'; hub.atraso = 600;
await p.click('#mn-tentar');
await p.waitForSelector('.mn-carregando', { timeout: 2000 });
ok(await p.$eval('.mn-carregando', e => /pensando/.test(e.textContent)) &&
   await p.$eval('#mn-enviar', e => e.disabled), 'enquanto espera: "MetaNutri está pensando…" e Enviar travado');
await esperarFim();
hub.atraso = 0;
let falas = await p.$$eval('#mn-conversa .mn-fala', l => l.map(e => e.className.replace('mn-fala ', '') + '|' + e.textContent));
ok(falas.length === 2 && falas[0] === 'mn-visitante|Como precificar minha consulta?' &&
   falas[1] === 'mn-agente|Resposta do MetaNutri para: Como precificar minha consulta?',
   '"Tentar de novo" nao repete a bolha da pergunta; a resposta aparece: ' + falas.join(' / '));

await perguntar('E para captar pacientes novos?');
await esperarFim();
const ultima = chamadasFuncao().at(-1);
const corpo = JSON.parse(ultima.corpo);
ok(chaves(corpo) === 'historico,mensagem', 'o corpo que sai da tela e so {mensagem, historico}');
ok(corpo.historico.length === 2 && corpo.historico[0].autor === 'visitante' && corpo.historico[1].autor === 'agente',
   'o historico vai com as falas anteriores (visitante, agente)');
const tudoQueSaiu = chamadasFuncao().map(c => c.corpo).join('\n');
ok(!tudoQueSaiu.includes('Fulana') && !tudoQueSaiu.includes('Sigilosa') && !tudoQueSaiu.includes('queixa sigilosa') &&
   !/patient|paciente_id|pacienteId/.test(tudoQueSaiu), 'nenhum dado de paciente em nenhum corpo enviado');
ok(/^Bearer falso-/.test(ultima.headers.authorization || '') && !/ags_/.test(JSON.stringify(ultima.headers)),
   'a tela manda o JWT da sessao, e nenhuma chave do hub');
const armazenado = await p.evaluate(async () => {
  const ls = JSON.stringify({ ...localStorage }), ss = JSON.stringify({ ...sessionStorage });
  const bancos = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : [];
  return { ls, ss, bancos };
});
ok(!armazenado.ls.includes('captar pacientes') && !armazenado.ss.includes('captar pacientes') &&
   !armazenado.bancos.some(n => /metanutri/i.test(n || '')), 'a conversa nao vai para localStorage, sessionStorage nem IndexedDB');
const tabelasIA = srv.linhas('ai_threads').length + srv.linhas('ai_messages').length;
ok(tabelasIA === 0 && !srv.log.some(l => l.op === 'query' && /ai_/.test(JSON.stringify(l))), 'nada gravado no banco (ai_threads/ai_messages vazias)');

titulo('T3 — ERRO COM A FRASE DO HUB, "TENTAR DE NOVO", TEMPO ESGOTADO');
hub.modo = 'limite_do_dia';
await perguntar('Quanto cobrar no retorno?');
await esperarFim();
ok(await p.$eval('.mn-erro .mn-erro-frase', e => e.textContent) === 'Frase do hub para limite_do_dia.',
   'recusa do hub: a FRASE do hub vai para a tela');
hub.modo = 'texto';
await p.click('#mn-tentar');
await esperarFim();
falas = await p.$$eval('#mn-conversa .mn-fala', l => l.map(e => e.textContent));
ok(falas.filter(f => f === 'Quanto cobrar no retorno?').length === 1 && falas.at(-1) === 'Resposta do MetaNutri para: Quanto cobrar no retorno?' &&
   !(await p.$('.mn-erro')), 'depois do erro, "Tentar de novo" responde e o erro some');
tela.tetoMs = 300; hub.modo = 'lento'; hub.atraso = 1500;
await perguntar('Pergunta que vai demorar');
await esperarFim();
ok(await p.$eval('.mn-erro .mn-erro-frase', e => e.textContent) === FRASES.tempo_esgotado,
   'tempo esgotado: frase humana na tela');
tela.tetoMs = 3000; hub.modo = 'texto'; hub.atraso = 0;
await esperar(1400);

titulo('T4 — NOME DE PACIENTE NAO SAI; SAIR APAGA A CONVERSA');
const antes = chamadasFuncao().length;
await perguntar('Como falar com a ' + NOME_PACIENTE.toLowerCase() + ' sobre o preço?');
await esperar(300);
ok(chamadasFuncao().length === antes && /Tire o nome do paciente/.test(await p.$eval('.mn-erro', e => e.textContent)) &&
   !(await p.$('#mn-tentar')), 'pergunta com o nome completo de um paciente da conta nao e enviada e nao oferece repetir');

/* T5 antes de sair: medidas com a conversa cheia */
titulo('T5 — 375 E DESKTOP: SEM ESTOURO, ALVOS DE 44 PX, TEXTO DE 13 PX OU MAIS');
await perguntar('Pergunta para medir a tela');
await esperarFim();
hub.modo = 'devagar';
await perguntar('Mais uma para ter erro na tela');
await esperarFim();
hub.modo = 'texto';
for (const largura of [375, 1366]) {
  await p.setViewport({ width: largura, height: 860 });
  await esperar(200);
  const m = await p.evaluate(() => {
    const secao = document.getElementById('secao-metanutri');
    const alvos = [...secao.querySelectorAll('button, textarea'), document.getElementById('nav-metanutri')]
      .filter(e => e.offsetParent !== null)
      .map(e => ({ id: e.id || e.className, h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }));
    const textos = [...secao.querySelectorAll('.mn-chat *'), document.getElementById('nav-metanutri')]
      .filter(e => e.offsetParent !== null && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
      .map(e => ({ el: e.id || e.className || e.tagName, px: parseFloat(getComputedStyle(e).fontSize) }));
    const ph = parseFloat(getComputedStyle(document.getElementById('mn-mensagem')).fontSize);
    return { estouro: document.documentElement.scrollWidth - window.innerWidth,
      chat: Math.round(document.querySelector('.mn-chat').getBoundingClientRect().right), alvos, textos, ph };
  });
  const pequenos = m.alvos.filter(a => a.h < 44 || a.w < 44);
  const miudos = m.textos.filter(t => t.px < 13);
  ok(m.estouro <= 0 && m.chat <= largura, largura + ' px: nada estoura na horizontal (scroll ' + m.estouro + ', chat ate ' + m.chat + ')');
  ok(pequenos.length === 0, largura + ' px: todo alvo tem 44 px ou mais' + (pequenos.length ? ' | ' + JSON.stringify(pequenos) : ' (' + m.alvos.length + ' alvos)'));
  ok(miudos.length === 0 && m.ph >= 13, largura + ' px: todo texto tem 13 px ou mais' + (miudos.length ? ' | ' + JSON.stringify(miudos) : ' (' + m.textos.length + ' elementos)'));
}

await p.evaluate(() => window.HoloAuth.sair());
await p.waitForFunction(() => !window.HoloAuth.sessaoAtiva(), { timeout: 5000 });
await esperar(200);
const depoisDeSair = await p.evaluate(() => ({
  falas: document.querySelectorAll('#mn-conversa .mn-fala').length,
  historico: window.MetaNutri.historico().length,
  entrada: document.getElementById('nav-metanutri').hidden
}));
ok(depoisDeSair.falas === 0 && depoisDeSair.historico === 0 && depoisDeSair.entrada,
   'sair da conta apaga a conversa da tela e da memoria, e esconde a entrada');

titulo('B — A CHAVE NAO ESTA NO BUNDLE NEM NAS RESPOSTAS VISTAS PELA PAGINA');
{
  const raiz = new URL('..', import.meta.url);
  const servidos = ['index.html', 'style.css', 'favicon.svg', ...readdirSync(raiz).filter(f => f.endsWith('.js'))];
  const dockerfile = readFileSync(new URL('Dockerfile', raiz), 'utf8');
  ok(/COPY index\.html style\.css favicon\.svg \*\.js /.test(dockerfile), 'a lista servida e a do Dockerfile (index.html, style.css, favicon.svg, *.js)');
  const comChave = servidos.filter(f => {
    const t = readFileSync(new URL(f, raiz), 'utf8');
    return t.includes(CHAVE) || /ags_[A-Za-z0-9]{6,}/.test(t) || /METANUTRI_AGENTE_KEY/.test(t);
  });
  ok(comChave.length === 0, 'nenhum dos ' + servidos.length + ' arquivos servidos tem chave ags_ nem o nome do secret' +
     (comChave.length ? ': ' + comChave.join(', ') : ''));
  ok(!servidos.some(f => /\.ts$/.test(f)) && !dockerfile.includes('supabase'), 'o codigo da funcao nao e servido pelo nginx');
  ok(vistasPelaPagina.length > 5 && vistasPelaPagina.every(t => !t.includes(CHAVE)),
     'nenhuma das ' + vistasPelaPagina.length + ' respostas vistas pela pagina contem a chave');
  const js = await p.evaluate(() => JSON.stringify(Object.keys(window.supabaseProjeto || {})) + JSON.stringify(window.MetaNutri ? Object.keys(window.MetaNutri) : []));
  ok(!js.includes('ags_'), 'o que a tela expoe em window e so url/chave publica e a API do chat');
}

ok(errosJS.length === 0, 'nenhum erro de JS na pagina' + (errosJS.length ? ': ' + errosJS[0] : ''));
await nav.close();
servidorHub.close();
process.exit(falhou ? 1 : 0);
