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
 *   E  exames: sem data informada → data de coleta desconhecida; data
 *      historica preservada; reenvio mantem a data original; fuso nao muda o dia;
 *      cada registro sem data e uma coleta propria; retry completa a mesma
 *   F  duas coletas sem data: navegador B limpo, linha do tempo, exportacao
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
titulo('E. DATA DA COLETA DE EXAMES');
/* ==================================================================== */

const exames = await A.evaluate(() => window.HOLOSCAN.listaDeExames().slice(0, 3).map(e => e.id));
/* o painel: "Conferir com o mapa" com o campo "Data da coleta" (data = '' deixa vazio).
   Devolve a mensagem que a tela mostrou ao lado do campo. */
async function conferirPeloPainel(valores, data) {
  return A.evaluate(async (pid, valores, data) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-aba="documentos"]').click();
    await new Promise(r => setTimeout(r, 300));
    Object.keys(valores).forEach(id => {
      const inp = document.querySelector('#ex-corpo .ex-linha[data-exame="' + id + '"] input');
      inp.value = String(valores[id]); inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    document.getElementById('ex-data-coleta').value = data || '';
    document.querySelector('#ex-corpo [data-acao="conferir"]').click();
    await new Promise(r => setTimeout(r, 600));
    return document.getElementById('ex-data-erro').textContent;
  }, P, valores, data);
}
/* registro SEM data de coleta: o legado (migracao, reenvio de pendente antigo).
   O painel nao grava mais assim; o caminho continua na sincronizacao. */
async function registrarSemData(pid, valores) {
  return A.evaluate(async (pid, valores) => {
    const t = JSON.parse(localStorage.getItem('holohacking.exames') || '{}');
    t[pid] = valores;
    localStorage.setItem('holohacking.exames', JSON.stringify(t));
    const r = await window.Sincronizacao.salvarColeta(pid, valores, null);
    if (r.ok) await window.Sincronizacao.atualizarColetas(pid);
    return r;
  }, pid, valores);
}
const coletas = () => srv.linhas('lab_collections').filter(c => c.patient_id === P);
function diaLocal(deslocamentoDias) {
  const d = new Date(Date.now() + deslocamentoDias * 86400000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

let msgData = await conferirPeloPainel({ [exames[0]]: 90 }, '');
ok(coletas().length === 0 && /Informe a data da coleta/.test(msgData),
   'sem data da coleta: nao salva no servidor, e a tela diz "' + msgData + '"');
const localSemData = await A.evaluate((pid) =>
  (JSON.parse(localStorage.getItem('holohacking.exames') || '{}')[pid] || {}), P);
ok(localSemData[exames[0]] === 90, 'o valor digitado continua no aparelho (nao se perde)');
/* Etapa 0 da V1: a recusa de data futura (Rodada 08) nao e contrato do
   Mestre e esta PENDENTE de decisao de produto/clinica — o app nao a
   aplica por conta propria. A data e gravada como veio. */
const futura = diaLocal(1);
msgData = await conferirPeloPainel({ [exames[0]]: 90 }, futura);
ok(msgData === '' && coletas().some(c => c.coletado_em === futura),
   'data futura (' + futura + '): aceita e gravada como veio — regra de data futura pendente de decisao');
await A.evaluate(() => { const b = document.querySelector('#ex-corpo [data-acao="nova-coleta"]'); if (b) b.click(); });
msgData = await conferirPeloPainel({ [exames[0]]: 90 }, '2026-03-20');
const c0320 = coletas().find(c => c.coletado_em === '2026-03-20');
ok(msgData === '' && c0320 && c0320.data_coleta_desconhecida === false,
   'com a data da coleta: grava com a data escolhida (2026-03-20), identidade pelo id');
ok(!!c0320.created_at, 'o momento do registro fica em created_at/updated_at (dado tecnico)');

await registrarSemData(P, { [exames[0]]: 85 });
ok(coletas().some(c => c.data_coleta_desconhecida === true && c.coletado_em === null),
   'registro legado sem data: data da coleta DESCONHECIDA, nunca "hoje"');

const hist = await A.evaluate((pid, eid) => window.Sincronizacao.salvarColeta(pid, { [eid]: 70 }, '2026-03-15'),
  P, exames[1]);
ok(hist.ok && coletas().some(c => c.coletado_em === '2026-03-15' && c.data_coleta_desconhecida === false),
   'data historica valida informada: gravada como veio (2026-03-15)');
await registrarSemData(P, { [exames[0]]: 95 });
const resultadosDe = (cid) => srv.linhas('lab_results').filter(r => r.collection_id === cid)
  .map(r => r.exame_id + '=' + r.valor).sort().join(',');
{
  const sd = coletas().filter(c => c.data_coleta_desconhecida)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  ok(coletas().length === 5 && sd.length === 2 && sd[0].id !== sd[1].id,
     'segundo registro sem data = coleta NOVA, com id proprio (nao atualiza a primeira)');
  ok(resultadosDe(sd[0].id) === exames[0] + '=85' && resultadosDe(sd[1].id) === exames[0] + '=95',
     'cada coleta sem data mantem os proprios resultados: ' + resultadosDe(sd[0].id) + ' | ' + resultadosDe(sd[1].id));
  ok(coletas().some(c => c.coletado_em === '2026-03-15'), 'e a coleta historica nao foi tocada');
}
const antesDuplo = coletas().length;
await registrarSemData(P, { [exames[0]]: 95 });
ok(coletas().length === antesDuplo, 'conferir de novo os MESMOS valores nao cria coleta repetida');

// reenvio: a coleta pendente de uma data historica volta com a MESMA data
// (Etapa 0 da V1: a coleta vai direto na tabela, por id — a falha simulada
// e na escrita de lab_collections)
srv.falhar.push({ tabela: 'lab_collections', acao: 'upsert' });
const pend = await A.evaluate((pid, eid) => window.Sincronizacao.salvarColeta(pid, { [eid]: 66 }, '2026-02-10'),
  P, exames[2]);
ok(!pend.ok && !coletas().some(c => c.coletado_em === '2026-02-10'), 'envio falhou: nada novo no servidor');
await A.evaluate((pid, eid) => {
  const t = JSON.parse(localStorage.getItem('holohacking.exames') || '{}');
  t[pid] = Object.assign({}, t[pid], { [eid]: 66 });
  localStorage.setItem('holohacking.exames', JSON.stringify(t));
}, P, exames[2]);
srv.falhar.length = 0;
await recarregar(A);
ok(coletas().some(c => c.coletado_em === '2026-02-10'),
   'reenvio na proxima carga usa a data original (2026-02-10), nao a de hoje');
ok(!coletas().some(c => c.coletado_em && !['2026-03-20', '2026-03-15', '2026-02-10', futura].includes(c.coletado_em)),
   'nenhuma coleta ganhou a data do reenvio');

// registro sem data que falha NO MEIO (coleta gravada, resultados nao):
// Etapa 0 da V1 — a coleta vazia e DESFEITA (protocolo de consolidacao,
// Mestre §34.2) e o registro fica pendente com o id; o reenvio refaz a
// MESMA coleta, sem criar outra
const semDataAntes = coletas().filter(c => c.data_coleta_desconhecida).map(c => c.id);
srv.falhar.push({ tabela: 'lab_results', acao: 'upsert' });
await registrarSemData(P, { [exames[0]]: 101 });
srv.falhar.length = 0;
const registrado = await A.evaluate((pid) =>
  Object.entries(JSON.parse(localStorage.getItem('holohacking.exames') || '{}')[pid] || {})
    .map(([k, v]) => k + '=' + v).sort().join(','), P);
const pendente = await A.evaluate((pid) =>
  (JSON.parse(localStorage.getItem('holohacking.sincronizacao')) || {}).exames[pid], P);
const novaMeia = coletas().filter(c => c.data_coleta_desconhecida && !semDataAntes.includes(c.id));
ok(pendente && pendente.estado === 'pendente' && novaMeia.length === 0,
   'falha no meio: nenhuma coleta vazia fica no servidor; registro pendente com o id reservado');
await recarregar(A);
const semData = coletas().filter(c => c.data_coleta_desconhecida && !semDataAntes.includes(c.id));
ok(semData.length === 1 && semData[0].id === pendente.coleta && semData[0].coletado_em === null,
   'retry: a MESMA coleta (mesmo id), sem duplicar, e continua sem data');
ok(resultadosDe(semData[0].id) === registrado && /=101/.test(registrado),
   'e agora com exatamente os resultados do registro: ' + registrado);
const reg = await A.evaluate((pid) =>
  (JSON.parse(localStorage.getItem('holohacking.sincronizacao')) || {}).exames[pid], P);
ok(reg && reg.estado === 'sincronizado', 'e o registro deixa de estar pendente');

// fuso: a mesma data clinica, lida em dois fusos extremos, e o mesmo dia
async function lerNoFuso(fuso) {
  const p = await navegador('fuso ' + fuso, fuso);
  await entrar(p);
  const r = await p.evaluate(async (pid) => {
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-aba="holoscan"]').click();
    await new Promise(r => setTimeout(r, 300));
    const txt = (document.getElementById('aba-holoscan-laboratorial') || {}).textContent || '';
    return { txt, coletas: window.Sincronizacao.coletas(pid).map(c => c.coletado_em) };
  }, P);
  await p.browserContext().close();
  return r;
}
const sp = await lerNoFuso('America/Sao_Paulo');
const ki = await lerNoFuso('Pacific/Kiritimati');
const la = await lerNoFuso('Pacific/Pago_Pago');
ok([sp, ki, la].every(r => /20\/03\/2026/.test(r.txt) && /15\/03\/2026/.test(r.txt) && /10\/02\/2026/.test(r.txt)),
   'UTC-3, UTC+14 e UTC-11 mostram 20/03, 15/03 e 10/02/2026 — o fuso nao muda o dia');
ok([sp, ki, la].every(r => r.coletas.includes('2026-03-15') && r.coletas.includes('2026-02-10')),
   'e a data guardada e a mesma string nos tres');
ok([sp, ki, la].every(r => /Data da coleta não informada/.test(r.txt)),
   'a coleta sem data aparece como "Data da coleta não informada" nos tres fusos');

/* ==================================================================== */
titulo('F. DUAS COLETAS SEM DATA (LEGADO), NAVEGADOR B LIMPO');
/* ==================================================================== */

const Q = await cadastrar(A, 'Paciente Duas Coletas');
const conferirQ = (valores) => registrarSemData(Q, valores);
await conferirQ({ [exames[0]]: 80, [exames[1]]: 4.9 });
await conferirQ({ [exames[0]]: 110, [exames[1]]: 6.3 });
const colQ = srv.linhas('lab_collections').filter(c => c.patient_id === Q);
ok(colQ.length === 2 && colQ.every(c => c.data_coleta_desconhecida && c.coletado_em === null) &&
   colQ[0].id !== colQ[1].id, 'A: duas coletas sem data, ids diferentes');

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
  const ex = JSON.parse(localStorage.getItem('holohacking.exames') || '{}')[pid] || {};
  return {
    coletas: cs.map(c => ({ id: c.id, sem: c.data_coleta_desconhecida,
      r: c.resultados.map(x => x.exame_id + '=' + Number(x.valor)).sort().join(',') })),
    eventos: (linha.match(/Coleta de exames \(data não informada\)/g) || []).length,
    exportado: window.__exportado,
    atuais: ex
  };
}, Q);
ok(vistoB.coletas.length === 2 && vistoB.coletas.every(c => c.sem) && vistoB.coletas[0].id !== vistoB.coletas[1].id,
   'B limpo: ve as duas coletas sem data, separadas');
ok(vistoB.coletas.some(c => c.r === [exames[0] + '=80', exames[1] + '=4.9'].sort().join(',')) &&
   vistoB.coletas.some(c => c.r === [exames[0] + '=110', exames[1] + '=6.3'].sort().join(',')),
   'cada uma com os proprios resultados');
ok(vistoB.atuais[exames[0]] === 110, 'valores atuais em B = os do registro mais recente');
ok(vistoB.eventos === 2, 'linha do tempo em B: dois eventos de coleta sem data');
let expQ = null; try { expQ = JSON.parse(vistoB.exportado); } catch (e) { /* null */ }
ok(expQ && Array.isArray(expQ.coletasExames) && expQ.coletasExames.length === 2 &&
   expQ.coletasExames.every(c => c.data_coleta_desconhecida === true && c.coletado_em === null) &&
   expQ.coletasExames[0].id !== expQ.coletasExames[1].id,
   'exportacao em B: as duas coletas, sem data, sem duplicar');
await B.browserContext().close();

/* ==================================================================== */
console.log('');
ok(errosJS.length === 0, 'sem erro de JS: ' + (errosJS[0] || 'limpo'));
await nav.close();
process.exit(falhou ? 1 : 0);
