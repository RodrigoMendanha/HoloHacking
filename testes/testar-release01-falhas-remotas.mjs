/**
 * RELEASE 01 — FALHA REMOTA NAO VIRA SUCESSO, E DATA DE COLETA NAO E INVENTADA
 *
 * Supabase falso (supabase-falso.mjs), app real, "Salvar HOLOSCAN" clicado.
 *
 *   A  local + RPC ok            → sucesso normal
 *   B  local ok + RPC falha      → local fica, aviso de nao sincronizado,
 *                                  nenhum "salvo" falso — nem depois de recarregar
 *   C  salvar de novo, RPC volta → sincroniza, sem duplicar
 *   D  interpretacao: servidor falha → feedback, texto nao se perde, nem na
 *                                  proxima hidratacao
 *   E  (09/10) exame e so arquivo: nenhum caminho grava coleta; a historica e
 *      lida como esta, com a mesma data em qualquer fuso
 *   F  duas coletas HISTORICAS sem data: navegador B limpo le, sem evento na
 *      linha do tempo, exportacao preserva
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';
/** Correcao P0: o Indice oficial e guardado exato e exibido com 1 casa (meia unidade para cima). */
const umaCasa = (v) => (Math.floor(Math.abs(Number(v)) * 10 + 0.5 + 1e-9) / 10).toFixed(1);

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));
const MSG = 'Os dados foram salvos neste dispositivo, mas não foi possível sincronizá-los. ' +
            'Tente salvar novamente quando estiver conectado.';

const srv = criarServidor();
const UID = srv.criarConta('a@holo.test', 'senha-a-123');
/* Correcao P0 (pos-deploy 6.4): o HOLOSCAN so e calculado pelo motor OFICIAL, sobre o pacote aprovado e vigente —
   como em producao, o servidor tem o HOLOS-V1 aprovado (fixture pelo caminho real: aprovacao + homologacao de Daniel). */
semearHolosAprovado(srv, UID);

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];

async function navegador(nome, fuso) {
  const ctx = await nav.createBrowserContext();
  const p = await ctx.newPage();
  if (fuso) await p.emulateTimezone(fuso);
  await p.setViewport({ width: 1366, height: 900 });
  p.on('pageerror', e => errosJS.push(nome + ': ' + e.message));
  await ligarPagina(p, srv);
  /* ?homologacao=1: a secao A exercita as reguas manuais (LEGADO / EM
     REVISAO), que desde a Etapa 0 da V1 so aparecem nesse modo. */
  await p.goto('http://127.0.0.1:5500/?homologacao=1', { waitUntil: 'networkidle2' });
  return p;
}
async function pronto(p) {
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await p.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(150);
  await p.evaluate(() => window.Sincronizacao.aguardar());
}
async function entrar(p) {
  await p.waitForSelector('#login-email', { visible: true });
  await p.type('#login-email', 'a@holo.test');
  await p.type('#login-senha', 'senha-a-123');
  await p.click('#btn-entrar');
  await pronto(p);
}
async function recarregar(p) { await p.reload({ waitUntil: 'networkidle2' }); await pronto(p); }

async function cadastrar(p, nome) {
  return p.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const achou = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
    }
    return null;
  }, nome);
}

/** calcula pelo questionario (delta muda as respostas) */
async function calcular(p, delta) {
  return p.evaluate(async (respostas, delta) => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(r => setTimeout(r, 200));
    const mapa = {};
    respostas.forEach(r => { mapa[r.marcador_id] = (r.intensidade + delta) % 4; });
    document.querySelectorAll('.q-item').forEach(item => {
      const v = mapa[item.dataset.marcador];
      if (v !== undefined) item.querySelectorAll('.q-btn')[v].click();
    });
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(r => setTimeout(r, 200));
    return document.getElementById('holo-score-total').textContent;
  }, caso.respostas, delta);
}

/** clica Salvar e devolve todo toast que apareceu depois do clique */
async function salvar(p) {
  return p.evaluate(async () => {
    const t = document.getElementById('toast');
    const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    t.textContent = '';
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    /* V1 Etapa 1: a aplicacao oficial pertence a um atendimento escolhido.
       Depois de recarregar, o atendimento ja existe no servidor: seleciona-o;
       so cria um novo se nao houver nenhum (e, com a rede caida, nem isso). */
    if (!window.AtendimentoAtual.atual()) {
      const pid = window.pacienteAtivoId();
      try { await window.AtendimentoAtual.carregar(); } catch (e) {}
      const ja = window.AtendimentoAtual.doPaciente(pid)[0];
      if (ja) window.AtendimentoAtual.selecionarPorId(ja.id);
      else { try { await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); } catch (e) {} }
    }
    document.getElementById('btn-salvar-holoscan').click();
    await new Promise(r => setTimeout(r, 700));
    obs.disconnect();
    return vistos.join(' | ');
  });
}

const historico = (p, pid) => p.evaluate((pid) =>
  ((JSON.parse(localStorage.getItem('holohacking.pontuacao')) || {})[pid] || [])
    .map(e => ({ quando: e.quando, indice: e.indice, id: e._supa_id || null,
                 interp: e.interpretacao || null })), pid);
const remotas = (pid) => srv.linhas('holoscan_applications').filter(a => a.patient_id === pid);

const A = await navegador('A');
await entrar(A);
const P = await cadastrar(A, 'Paciente Falhas');

/* ==================================================================== */
titulo('A. LOCAL + SERVIDOR OK → SUCESSO NORMAL');
/* ==================================================================== */

const i1 = await calcular(A, 0);
const t1 = await salvar(A);
ok(/HOLOSCAN salvo na ficha/.test(t1) && t1.indexOf(MSG) < 0, 'mensagem de sucesso: ' + t1);
ok(remotas(P).length === 1, 'uma aplicacao no servidor');
let h = await historico(A, P);
ok(h.length === 1 && h[0].id === remotas(P)[0].id, 'a entrada local ganhou o id remoto');
const t1b = await salvar(A);
ok(remotas(P).length === 1 && /já está salvo e sincronizado/.test(t1b),
   'clicar Salvar de novo nao cria segunda aplicacao remota: ' + t1b);

/* os dois caminhos do "Salvar HOLOSCAN", uma mensagem para cada */
const MSG_SO_AQUI = 'Salvo só neste aparelho. Pra salvar na sua conta e ver em outro aparelho, use o questionário.';
ok(t1.indexOf(MSG_SO_AQUI) < 0, 'questionario: a mensagem e a de salvo na ficha, nao a de so neste aparelho');
const remotasAntesRegua = remotas(P).length;
await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  const b = document.getElementById('btn-repontuar');
  if (b) b.click();
  await new Promise(r => setTimeout(r, 100));
  const regua = document.getElementById('holo-fungico');
  regua.disabled = false;
  regua.value = '6';
  regua.dispatchEvent(new Event('input', { bubbles: true }));
});
const tRegua = await salvar(A);
ok(tRegua === MSG_SO_AQUI, 'controles deslizantes: "' + tRegua + '"');
ok(!/salvo na ficha/.test(tRegua) && remotas(P).length === remotasAntesRegua,
   'controles deslizantes: nao diz que salvou na ficha, e nada vai ao servidor');
await calcular(A, 0);

/* ==================================================================== */
titulo('B. LOCAL OK + SERVIDOR FALHA → NENHUM SUCESSO FALSO');
/* ==================================================================== */

const i2 = await calcular(A, 1);
srv.falhar.push({ tabela: 'rpc:salvar_holoscan_completo', acao: 'rpc' });
const t2 = await salvar(A);
ok(t2.indexOf(MSG) >= 0, 'aviso claro de nao sincronizado: ' + t2);
ok(!/HOLOSCAN salvo/.test(t2), 'e nenhuma mensagem de sucesso');
ok(remotas(P).length === 1, 'o servidor continua com uma so aplicacao');
h = await historico(A, P);
ok(h.length === 2 && h.some(e => e.id === null && umaCasa(e.indice) === i2),
   'o calculo novo continua neste navegador, sem id remoto (Indice ' + i2 + ')');

await recarregar(A);
h = await historico(A, P);
ok(h.length === 2 && h.some(e => e.id === null && umaCasa(e.indice) === i2),
   'recarregar (com hidratacao do servidor) nao apaga o calculo nao sincronizado');
const telaAposFalha = await A.evaluate(() => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  return document.getElementById('holo-score-total').textContent;
});
ok(telaAposFalha === i2, 'a tela do HOLOSCAN mostra o calculo nao sincronizado: ' + telaAposFalha);

/* rede caida (excecao, nao erro devolvido) tambem nao vira sucesso */
await A.evaluate(() => {
  window.__rpcOriginal = window.supabaseClient.rpc;
  window.supabaseClient.rpc = function () { return Promise.reject(new TypeError('Failed to fetch')); };
});
const t2b = await salvar(A);
await A.evaluate(() => { window.supabaseClient.rpc = window.__rpcOriginal; });
ok(t2b.indexOf(MSG) >= 0 && !/HOLOSCAN salvo/.test(t2b), 'rede caida: mesmo aviso, sem sucesso — ' + t2b);

/* ==================================================================== */
titulo('C. SALVAR DE NOVO COM O SERVIDOR DE VOLTA → SINCRONIZA');
/* ==================================================================== */

srv.falhar.length = 0;
const t3 = await salvar(A);
ok(/HOLOSCAN salvo na ficha/.test(t3) && t3.indexOf(MSG) < 0, 'agora sim, sucesso: ' + t3);
ok(remotas(P).length === 2 && remotas(P).some(a => umaCasa(a.indice) === i2),
   'o servidor recebeu o calculo que tinha falhado');
h = await historico(A, P);
ok(h.length === 2 && h.every(e => !!e.id), 'as duas entradas locais tem id remoto — sem duplicar');
await recarregar(A);
h = await historico(A, P);
ok(h.length === 2 && h.every(e => !!e.id), 'e continuam duas depois da hidratacao');

/* ==================================================================== */
titulo('D. INTERPRETACAO: O SERVIDOR FALHA');
/* ==================================================================== */

async function interpretar(texto) {
  return A.evaluate(async (pid, texto) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-aba="relatorio"]').click();
    await new Promise(r => setTimeout(r, 300));
    document.getElementById('rel-interpretacao').value = texto;
    document.querySelector('[data-acao="salvar-interpretacao"]').click();
    const aviso = document.getElementById('rel-interpretacao-aviso');
    const logo = aviso.textContent;
    await new Promise(r => setTimeout(r, 500));
    return { logo, depois: aviso.textContent };
  }, P, texto);
}

const ok1 = await interpretar('Primeira leitura.');
ok(ok1.logo !== 'Salvo.' && ok1.depois === 'Salvo.',
   'com o servidor ok: so diz "Salvo." depois da confirmacao (' + ok1.logo + ' → ' + ok1.depois + ')');
const ultimaRemota = () => remotas(P).slice().sort((a, b) => a.created_at.localeCompare(b.created_at)).pop();
ok(ultimaRemota().interpretacao_texto === 'Primeira leitura.', 'e o servidor tem o texto');

srv.falhar.push({ tabela: 'holoscan_applications', acao: 'update' });
const falha = await interpretar('Leitura revisada, que o servidor recusou.');
ok(falha.depois.indexOf(MSG) >= 0 && falha.depois !== 'Salvo.',
   'servidor recusou: aviso de nao sincronizado, sem "Salvo.": ' + falha.depois);
ok(ultimaRemota().interpretacao_texto === 'Primeira leitura.', 'o servidor continua com a versao anterior');
h = await historico(A, P);
ok(h[h.length - 1].interp && h[h.length - 1].interp.texto === 'Leitura revisada, que o servidor recusou.' &&
   h[h.length - 1].interp.pendente === true,
   'o texto novo ficou neste navegador, marcado como pendente');
srv.falhar.length = 0;
await recarregar(A);
h = await historico(A, P);
ok(h[h.length - 1].interp && h[h.length - 1].interp.texto === 'Leitura revisada, que o servidor recusou.',
   'a hidratacao NAO troca o texto pendente pela versao antiga do servidor');
const denovo = await interpretar('Leitura revisada, que o servidor recusou.');
ok(denovo.depois === 'Salvo.' && ultimaRemota().interpretacao_texto === 'Leitura revisada, que o servidor recusou.',
   'salvar de novo com o servidor de volta: sincroniza');
h = await historico(A, P);
ok(!h[h.length - 1].interp.pendente, 'e a marca de pendente sai');

/* ==================================================================== */
titulo('E. EXAME E SO ARQUIVO (09/10): O SERVIDOR RECUSA, NADA E INVENTADO');
/* ==================================================================== */
/* Antes: data de coleta nunca inventada, reenvio com a data original, fuso nao muda o dia. Decisao de
   produto 09/10: coleta estruturada nao e mais gravada por caminho nenhum; a historica (ja no servidor)
   e lida como esta — com a MESMA data em qualquer fuso. */
const coletas = () => srv.linhas('lab_collections').filter(c => c.patient_id === P);
function semearColetaHistorica(pid, data, resultados) {
  const id = globalThis.crypto.randomUUID(), agora = new Date().toISOString();
  srv.tabelas.lab_collections.push({ id, nutritionist_id: UID, patient_id: pid, encounter_id: null, coletado_em: data, data_coleta_desconhecida: !data, laboratorio: null, observacao: null,
    state: 'salvo', source: 'manual', revision: 1, created_by: UID, created_at: agora, updated_at: agora });
  Object.keys(resultados).forEach(eid => srv.tabelas.lab_results.push({ id: globalThis.crypto.randomUUID(), collection_id: id, exame_id: eid, valor: resultados[eid], unidade_no_momento: 'un', nome_exame_no_momento: eid, created_at: agora }));
  return id;
}
semearColetaHistorica(P, '2026-03-15', { 'EXA-002': 70 });
semearColetaHistorica(P, null, { 'EXA-001': 85 });
const tent = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="documentos"]').click(); await new Promise(r => setTimeout(r, 300));
  const painel = document.querySelectorAll('#ex-corpo, #ex-data-coleta, [data-acao="conferir"], [data-lab-acao], [data-lancar]').length;
  const antes = localStorage.getItem('holohacking.exames');
  const s1 = await window.Sincronizacao.salvarColeta(pid, { 'EXA-001': 90 }, null);
  const s2 = await window.Sincronizacao.salvarColeta(pid, { 'EXA-001': 90 }, '2026-03-20');
  const rpc = await window.supabaseClient.rpc('salvar_coleta_exames', { payload: { collection: { patient_id: pid, coletado_em: '2026-03-20', data_coleta_desconhecida: false }, results: [{ exame_id: 'EXA-001', valor: 90 }] } });
  const up = await window.supabaseClient.from('lab_collections').upsert([{ patient_id: pid, coletado_em: null, data_coleta_desconhecida: true }]);
  await window.Sincronizacao.atualizarColetas(pid);
  return { painel, s1: s1.motivo, s2: s2.motivo, rpc: rpc.error && rpc.error.hint, up: up.error && up.error.code, local: localStorage.getItem('holohacking.exames') === antes,
    lidas: (window.Sincronizacao.coletas(pid) || []).map(c => c.coletado_em) };
}, P);
ok(tent.painel === 0, 'a ficha nao tem mais painel de valores de exame');
ok(tent.s1 === 'laboratorio_desativado' && tent.s2 === 'laboratorio_desativado', 'a sincronizacao recusa coleta sem data e com data — nenhuma data e inventada porque nada e gravado');
ok(tent.rpc === 'laboratorio_desativado' && tent.up === '42501' && coletas().length === 2, 'RPC e tabela recusam; so as duas coletas historicas continuam no servidor');
ok(tent.local, 'nada do que estava neste aparelho foi mexido');
ok(tent.lidas.length === 2 && tent.lidas.includes('2026-03-15') && tent.lidas.includes(null), 'as coletas historicas sao lidas como estao (uma com data, uma sem), so leitura');

// fuso: a mesma data clinica, lida em dois fusos extremos, e o mesmo dia
async function lerNoFuso(fuso) {
  const p = await navegador('fuso ' + fuso, fuso);
  await entrar(p);
  const r = await p.evaluate(async (pid) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-aba="holoscan"]').click();
    await new Promise(r => setTimeout(r, 300));
    return { lab: !!document.getElementById('aba-holoscan-laboratorial'), coletas: (window.Sincronizacao.coletas(pid) || []).map(c => c.coletado_em) };
  }, P);
  await p.browserContext().close();
  return r;
}
const sp = await lerNoFuso('America/Sao_Paulo');
const ki = await lerNoFuso('Pacific/Kiritimati');
const la = await lerNoFuso('Pacific/Pago_Pago');
ok([sp, ki, la].every(r => !r.lab), 'nenhum bloco laboratorial na aba HOLOSCAN, em nenhum fuso');
ok([sp, ki, la].every(r => r.coletas.includes('2026-03-15') && r.coletas.includes(null)),
   'UTC-3, UTC+14 e UTC-11 leem a mesma string de data (2026-03-15) e a mesma coleta sem data — o fuso nao muda o dia');

/* ==================================================================== */
titulo('F. DUAS COLETAS HISTORICAS SEM DATA, NAVEGADOR B LIMPO');
/* ==================================================================== */

const Q = await cadastrar(A, 'Paciente Duas Coletas');
semearColetaHistorica(Q, null, { 'EXA-001': 80, 'EXA-002': 4.9 });
semearColetaHistorica(Q, null, { 'EXA-001': 110, 'EXA-002': 6.3 });
const colQ = srv.linhas('lab_collections').filter(c => c.patient_id === Q);
ok(colQ.length === 2 && colQ.every(c => c.data_coleta_desconhecida && c.coletado_em === null) &&
   colQ[0].id !== colQ[1].id, 'duas coletas historicas sem data, ids diferentes (como o banco real as tem)');

const B = await navegador('B');
await B.evaluate(() => {
  window.__exportado = null;
  const orig = URL.createObjectURL;
  URL.createObjectURL = function (b) { if (b && b.type === 'application/json') b.text().then(t => { window.__exportado = t; }); return orig.call(URL, b); };
  HTMLAnchorElement.prototype.click = function () {};
});
await entrar(B);
const vistoB = await B.evaluate(async (pid) => {
  const cs = window.Sincronizacao.coletas(pid) || [];
  window.definirPacienteAtivo(pid);
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="visao"]').click();
  await new Promise(r => setTimeout(r, 400));
  const linha = (document.getElementById('fic-visao-timeline') || {}).textContent || '';
  document.getElementById('btn-exportar-paciente').click();
  for (let i = 0; i < 30 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
  document.getElementById('modal-confirmar-ok').click();
  for (let i = 0; i < 60 && !window.__exportado; i++) await new Promise(r => setTimeout(r, 100));
  return {
    coletas: cs.map(c => ({ id: c.id, sem: c.data_coleta_desconhecida,
      r: c.resultados.map(x => x.exame_id + '=' + Number(x.valor)).sort().join(',') })),
    eventos: (linha.match(/Coleta de exames/g) || []).length,
    exportado: window.__exportado
  };
}, Q);
ok(vistoB.coletas.length === 2 && vistoB.coletas.every(c => c.sem) && vistoB.coletas[0].id !== vistoB.coletas[1].id,
   'B limpo: le as duas coletas historicas sem data, separadas (so leitura)');
ok(vistoB.coletas.some(c => c.r === 'EXA-001=80,EXA-002=4.9') && vistoB.coletas.some(c => c.r === 'EXA-001=110,EXA-002=6.3'),
   'cada uma com os proprios resultados');
ok(vistoB.eventos === 0, 'linha do tempo em B: nenhum evento de coleta (09/10: exame e so arquivo)');
let expQ = null; try { expQ = JSON.parse(vistoB.exportado); } catch (e) { /* null */ }
ok(expQ && Array.isArray(expQ.coletasExames) && expQ.coletasExames.length === 2 &&
   expQ.coletasExames.every(c => c.data_coleta_desconhecida === true && c.coletado_em === null) &&
   expQ.coletasExames[0].id !== expQ.coletasExames[1].id,
   'exportacao em B: as duas coletas historicas, sem data, sem duplicar (historico preservado)');
await B.browserContext().close();

/* ==================================================================== */
console.log('');
ok(errosJS.length === 0, 'sem erro de JS: ' + (errosJS[0] || 'limpo'));
await nav.close();
process.exit(falhou ? 1 : 0);
