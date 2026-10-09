/**
 * RELEASE 01 — PERSISTENCIA AUTORITATIVA E MULTI-DISPOSITIVO
 *
 * Tudo contra o Supabase falso (supabase-falso.mjs): um banco em memoria com
 * RLS, FKs, RPCs e esquema estrito, compartilhado por contextos de navegador
 * realmente separados (localStorage e IndexedDB proprios). O app roda de
 * verdade: login pela tela, questionario clicado, "Salvar HOLOSCAN" clicado,
 * coleta historica semeada (09/10: exame e so arquivo), exportacao pelo botao.
 *
 *   1  Dispositivo A registra: paciente, HOLOSCAN (84 respostas), ferramenta,
 *      consulta, documento, paciente arquivado; coleta HISTORICA so leitura
 *   2  Dispositivo B, navegador limpo, mesma conta: tudo aparece
 *   3  Exportacao num terceiro navegador limpo, sem abrir aba nenhuma antes
 *   4  Cache velho: o servidor muda em A, B recarrega → servidor vence;
 *      dois HOLOSCAN no mesmo dia continuam dois
 *   5  Erro remoto nao e vazio
 *   6  Documento: upload falha → local preservado, feedback, nada inventado
 *   7  Exclusao em lote interrompida no meio fica consistente
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';
/** Correcao P0: o Indice oficial e guardado exato (ex.: 56.047...) e exibido com 1 casa, meia unidade para cima. */
const umaCasa = (v) => (Math.floor(Math.abs(Number(v)) * 10 + 0.5 + 1e-9) / 10).toFixed(1);

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

function diaLocal(deslocamentoDias) {
  const d = new Date(Date.now() + deslocamentoDias * 86400000);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
const HOJE = diaLocal(0);
const dataBR = (iso) => iso.split('-').reverse().join('/');

const srv = criarServidor();
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
/* Correcao P0 (pos-deploy 6.4): o HOLOSCAN so e calculado pelo motor OFICIAL, sobre o pacote aprovado e vigente —
   como em producao, o servidor tem o HOLOS-V1 aprovado (fixture pelo caminho real: aprovacao + homologacao de Daniel). */
semearHolosAprovado(srv, UID_A);

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });

const errosJS = [];
async function dispositivo(nome) {
  const ctx = await nav.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  p.on('pageerror', e => errosJS.push(nome + ': ' + e.message));
  p.on('dialog', d => d.accept());
  await ligarPagina(p, srv);
  await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return { ctx, p };
}

async function entrar(p, email, senha) {
  await p.waitForSelector('#login-email', { visible: true });
  await p.evaluate(() => { document.getElementById('login-email').value = ''; document.getElementById('login-senha').value = ''; });
  await p.type('#login-email', email);
  await p.type('#login-senha', senha);
  await p.click('#btn-entrar');
  await pronto(p);
}

async function pronto(p) {
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await p.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(150);
  await p.evaluate(() => window.Sincronizacao.aguardar());
}

async function recarregar(p) {
  await p.reload({ waitUntil: 'networkidle2' });
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await pronto(p);
}

async function cadastrar(p, nome) {
  return p.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const todos = (window.pacientesTodos && window.pacientesTodos()) || [];
      const achou = todos.find(x => x.nome === nome);
      if (achou) return achou.id;
    }
    return null;
  }, nome);
}

async function ativar(p, pid) {
  await p.evaluate((pid) => {
    const sel = document.querySelector('#paciente-ativo, select[id*="paciente"]');
    if (window.definirPacienteAtivo) window.definirPacienteAtivo(pid);
    else if (sel) { sel.value = pid; sel.dispatchEvent(new Event('change', { bubbles: true })); }
  }, pid);
  await esperar(150);
  return p.evaluate(() => window.pacienteAtivoId());
}

/** Responde as 84 perguntas (deslocando o valor de cada uma em `delta`,
    mod 4, para gerar um mapa diferente), calcula e clica em Salvar. */
async function aplicarHoloscan(p, delta) {
  const r = await p.evaluate(async (respostas, delta) => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(r => setTimeout(r, 200));
    const mapa = {};
    respostas.forEach(r => { mapa[r.marcador_id] = (r.intensidade + delta) % 4; });
    document.querySelectorAll('.q-item').forEach(item => {
      const v = mapa[item.dataset.marcador];
      if (v === undefined) return;
      item.querySelectorAll('.q-btn')[v].click();
    });
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(r => setTimeout(r, 200));
    const indice = document.getElementById('holo-score-total').textContent;
    /* V1 Etapa 1: a aplicacao oficial pertence a um atendimento escolhido */
    if (!window.AtendimentoAtual.atual()) await window.AtendimentoAtual.iniciar({ patient_id: window.pacienteAtivoId(), occurred_at: new Date().toISOString() });
    document.getElementById('btn-salvar-holoscan').click();
    await new Promise(r => setTimeout(r, 600));
    return { indice, respostas: mapa };
  }, caso.respostas, delta);
  return r;
}

/* 09/10: exame e so arquivo. A coleta HISTORICA (anterior a decisao) entra direto no servidor falso,
   como o banco real a tem; nenhum caminho novo grava coleta. */
function semearColetaHistorica(pid, data, resultados, extra) {
  const id = globalThis.crypto.randomUUID(), agora = new Date().toISOString();
  srv.tabelas.lab_collections.push(Object.assign({ id, nutritionist_id: UID_A, patient_id: pid, encounter_id: null, coletado_em: data, data_coleta_desconhecida: !data, laboratorio: null, observacao: null,
    state: 'salvo', source: 'manual', revision: 1, created_by: UID_A, created_at: agora, updated_at: agora }, extra || {}));
  Object.keys(resultados).forEach(eid => srv.tabelas.lab_results.push({ id: globalThis.crypto.randomUUID(), collection_id: id, exame_id: eid, valor: resultados[eid], unidade_no_momento: 'un', nome_exame_no_momento: eid, created_at: agora }));
  return id;
}

const estadoLocal = (p, pid) => p.evaluate((pid) => {
  const L = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {}; } catch (e) { return {}; } };
  return {
    historico: (L('holohacking.pontuacao')[pid]) || [],
    questionario: L('holohacking.questionario')[pid] || {},
    aplicadas: (L('holohacking.respostas_aplicadas')[pid] || {}).respostas || {},
    exames: L('holohacking.exames')[pid] || null,
    coletas: window.Sincronizacao.coletas(pid),
    aplicacoes: window.Aplicacoes.doPaciente(pid).map(a => ({ id: a.id, f: a.ferramenta_id, s: a.status })),
    consultas: (window.Agenda.todas(pid) || []).map(c => ({ id: c.id, data: c.data })),
    paciente: ((window.pacientesTodos && window.pacientesTodos()) || []).find(x => x.id === pid) || null,
    estado: window.Sincronizacao.estado()
  };
}, pid);

/* ==================================================================== */
titulo('1. DISPOSITIVO A REGISTRA');
/* ==================================================================== */

const A = await dispositivo('A');
await entrar(A.p, 'a@holo.test', 'senha-a-123');
const P = await cadastrar(A.p, 'Marina Release');
const Q = await cadastrar(A.p, 'Quitéria Arquivada');
ok(!!P && !!Q, 'dois pacientes cadastrados em A');
ok(srv.linhas('patients').filter(x => x.nutritionist_id === UID_A).length === 2,
   'e eles estao no servidor, sob a conta A');

await ativar(A.p, P);
const holo1 = await aplicarHoloscan(A.p, 0);
const apps1 = srv.linhas('holoscan_applications').filter(x => x.patient_id === P);
ok(apps1.length === 1, 'HOLOSCAN salvo no servidor: ' + apps1.length + ' aplicacao');
ok(srv.linhas('holoscan_answers').filter(a => a.application_id === (apps1[0] || {}).id).length === 84,
   'com as 84 respostas');
ok(srv.linhas('holoscan_system_scores').filter(a => a.application_id === (apps1[0] || {}).id).length === 5,
   'e os 5 scores de sistema');
const histA = (await estadoLocal(A.p, P)).historico;
ok(histA.length === 1 && histA[0]._supa_id === (apps1[0] || {}).id,
   'a entrada local de A ganhou a identidade remota (_supa_id)');

const exames = await A.p.evaluate(() => window.HOLOSCAN.listaDeExames().slice(0, 3).map(e => e.id));
const antiga = diaLocal(-60);
semearColetaHistorica(P, antiga, { [exames[2]]: 77 });
const DATA1 = diaLocal(-3);
const recusas = await A.p.evaluate(async (pid, eid, d) => {
  const s = await window.Sincronizacao.salvarColeta(pid, { [eid]: 91 }, d);
  const r = await window.supabaseClient.rpc('salvar_coleta_exames', { payload: { collection: { patient_id: pid, coletado_em: d, data_coleta_desconhecida: false }, results: [{ exame_id: eid, valor: 91 }] } });
  const t = await window.supabaseClient.from('lab_collections').insert([{ patient_id: pid, coletado_em: d, data_coleta_desconhecida: false }]);
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="documentos"]').click(); await new Promise(r => setTimeout(r, 300));
  return { sinc: s.motivo, rpc: r.error && r.error.hint, tabela: t.error && t.error.code, painel: document.querySelectorAll('#ex-corpo, .ex-linha, #ex-data-coleta, [data-lab-acao], [data-lancar]').length };
}, P, exames[0], DATA1);
const colsA = srv.linhas('lab_collections').filter(c => c.patient_id === P);
ok(recusas.sinc === 'laboratorio_desativado' && recusas.rpc === 'laboratorio_desativado' && recusas.tabela === '42501' && recusas.painel === 0,
   '09/10: nenhuma coleta nova por caminho nenhum (sincronizacao, RPC, tabela) e nenhum painel de valores na ficha');
ok(colsA.length === 1 && colsA[0].coletado_em === antiga && colsA[0].data_coleta_desconhecida === false,
   'a coleta historica (' + antiga + ') continua no servidor, com a data dela');

const app = await A.p.evaluate(async () => {
  const a = await window.Aplicacoes.nova({ id: 'roda_vida' });
  await window.Aplicacoes.concluir(a, { saude: 7, trabalho: 5 }, null);
  return a.id || null;
});
ok(srv.linhas('tool_applications').filter(t => t.patient_id === P && t.status === 'concluida').length === 1,
   'Roda da Vida concluida esta no servidor (tool_applications)');
await A.p.evaluate(async () => {
  const o = await window.Aplicacoes.nova({ id: 'oq3' });
  await window.Aplicacoes.concluir(o, { quer: 'dormir bem', precisa: 'rotina', consegue: 'caminhar', alavancas: 'familia' }, null);
  const q = await window.Aplicacoes.nova({ id: 'pqq' });
  await window.Aplicacoes.concluir(q, { objetivo: 'energia', r1: 'a', r2: 'b', r3: '', r4: '', r5: '', verdadeiro: 'cuidar da familia' }, null);
});
ok(['oq3', 'pqq'].every(f => srv.linhas('tool_applications').some(t => t.patient_id === P && t.ferramenta_id === f)),
   'OQ³ e PQQ concluidos estao no servidor');

const DIA_CONSULTA = diaLocal(-10);
const cons = await A.p.evaluate(async (pid, dia) => {
  const r = await window.DadosRouter.from('consultas').insert({
    paciente_id: pid, data: dia, hora: '10:00', duracao: 60, tipo: 'Retorno' }).select().single();
  return r.error ? r.error.message : r.data.id;
}, P, DIA_CONSULTA);
ok(srv.linhas('consultations').filter(c => c.patient_id === P).length === 1, 'consulta no servidor: ' + cons);

const doc = await A.p.evaluate(async (pid) => {
  const b = new Blob(['laudo de teste — conteúdo 🙂'], { type: 'text/plain' });
  b.name = 'laudo.txt';
  const r = await window.ArquivoStore.salvar(pid, b, { nome: 'Laudo glicemia', tipo: 'Laudo', data: '2026-09-01' });
  return { sincronizado: r.sincronizado, supa: r._supa_id || null };
}, P);
ok(doc.sincronizado === true && !!doc.supa, 'documento: salvar so resolve depois do servidor, e diz que sincronizou');
ok(srv.linhas('documents').filter(d => d.patient_id === P).length === 1 &&
   Object.keys(srv.storage['patient-documents']).some(k => k.startsWith(UID_A + '/' + P + '/')),
   'linha em documents + objeto no bucket privado, sob o prefixo do uid');

const arq = await A.p.evaluate(async (q) => {
  const r = await window.DadosRouter.from('pacientes').update({ status: 'inativo' }).eq('id', q);
  return r.error ? r.error.message : 'ok';
}, Q);
ok(srv.linhas('patients').find(x => x.id === Q).status === 'inativo', 'paciente Q arquivado no servidor: ' + arq);

/* ==================================================================== */
titulo('2. DISPOSITIVO B — NAVEGADOR LIMPO, MESMA CONTA');
/* ==================================================================== */

const B = await dispositivo('B');
const logAntesB = srv.log.length;
/* so as marcas de migracao de ferramenta legada (aplicacoes.js roda sem
   sessao ao abrir) podem existir antes do login: nenhum dado clinico */
const limpo = await B.p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('holohacking') &&
  !/\.(oq3|pqq)\.migrado$/.test(k)));
ok(limpo.length === 0, 'B comeca sem nenhum dado clinico no localStorage' + (limpo.length ? ': ' + limpo : ''));
await entrar(B.p, 'a@holo.test', 'senha-a-123');
let eb = await estadoLocal(B.p, P);
{
  const doB = srv.log.slice(logAntesB).filter(l => l.op === 'query' && l.acao === 'select');
  const por = (t) => doB.filter(l => l.tabela === t).length;
  ok(por('holoscan_applications') === 1 && por('holoscan_system_scores') === 1 && por('holoscan_answers') === 1,
     'HOLOSCAN de toda a carteira em 3 leituras (aplicacoes, scores, respostas em lote): ' +
     [por('holoscan_applications'), por('holoscan_system_scores'), por('holoscan_answers')].join('/'));
  ok(por('lab_collections') === 1 && por('lab_results') === 1,
     'exames de toda a carteira em 2 leituras (coletas + resultados em lote)');
}

ok(eb.estado.holoscan === 'ok' && eb.estado.exames === 'ok', 'leitura remota ok: ' + JSON.stringify(eb.estado));
ok(eb.historico.length === 1 && eb.historico[0]._supa_id === apps1[0].id,
   'HOLOSCAN de A aparece em B, com o ID remoto');
ok(umaCasa(eb.historico[0].indice) === holo1.indice,   // Correcao P0: Indice oficial exato no dado, 1 casa na tela ("40.0")
   'mesmo Indice HOLOS: ' + eb.historico[0].indice + ' (A calculou ' + holo1.indice + ')');
ok((eb.historico[0].sistemas || []).length === 5 &&
   eb.historico[0].sistemas.map(s => s.sistema).join(',') ===
   'fungico,acido_inflamatorio,metabolico,detox_linfatico,mental_emocional_espiritual',
   'os 5 scores, na ordem do motor');
ok(Object.keys(eb.aplicadas).length === 84 &&
   Object.keys(holo1.respostas).every(k => eb.aplicadas[k] === holo1.respostas[k]),
   'as 84 respostas da aplicacao chegaram a B (respostas aplicadas), identicas');
ok(Object.keys(eb.questionario).length === 0,
   'rodada 08: o questionario de B comeca VAZIO — reaplicar nao copia a aplicacao anterior');
ok(Array.isArray(eb.coletas) && eb.coletas.length === 1 && eb.coletas[0].coletado_em === antiga && eb.coletas[0].data_coleta_desconhecida === false,
   'B le a coleta historica (so leitura), com a data da coleta: ' + antiga);
ok(eb.aplicacoes.length === 3 && eb.aplicacoes.every(a => a.s === 'concluida') &&
   ['roda_vida', 'oq3', 'pqq'].every(f => eb.aplicacoes.some(a => a.f === f)),
   'as ferramentas aplicadas em A (Roda, OQ³, PQQ) aparecem em B');
const mapaB = await B.p.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  document.querySelector('.nav-item[data-secao="espirito"]').click();
  await new Promise(r => setTimeout(r, 200));
  window.abrirFerramenta('vista-mapa');
  await new Promise(r => setTimeout(r, 300));
  return { proposito: document.getElementById('mapa-proposito').textContent,
           quer: document.getElementById('mapa-quer').textContent };
}, P);
ok(/cuidar da familia/.test(mapaB.proposito) && /dormir bem/.test(mapaB.quer),
   'Mapa do Propósito em B, derivado do PQQ (e do OQ³) que veio do servidor');
ok(eb.consultas.length === 1 && eb.consultas[0].data === DIA_CONSULTA, 'a consulta aparece em B');
const eq = await estadoLocal(B.p, Q);
ok(eq.paciente && eq.paciente.status === 'inativo', 'o paciente arquivado em A aparece arquivado em B');

const docsB = await B.p.evaluate(async (pid) => {
  const l = await window.ArquivoStore.listar(pid);
  const r = l.length ? await window.ArquivoStore.pegar(l[0].id) : null;
  return { n: l.length, id: l[0] && l[0].id, so_local: l[0] && l[0].so_local,
           texto: r && r.arquivo ? await r.arquivo.text() : null };
}, P);
ok(docsB.n === 1 && /^supa:/.test(docsB.id) && !docsB.so_local, 'documento listado em B, vindo do servidor');
ok(docsB.texto === 'laudo de teste — conteúdo 🙂', 'e abre em B pelo download autenticado do Storage');
const docsGlobal = await B.p.evaluate(async () => (await window.ArquivoStore.listarTudoHibrido()).length);
ok(docsGlobal === 1, 'a tela Documentos (todos os pacientes) tambem lista o documento remoto em B');

/* a tela: ficha, HOLOSCAN, linha do tempo, desde a ultima consulta */
await ativar(B.p, P);
const tela = await B.p.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 400));
  const visao = document.querySelector('[data-aba="visao"]'); if (visao) visao.click();
  await new Promise(r => setTimeout(r, 400));
  const linha = document.getElementById('fic-visao-timeline');
  const texto = linha ? linha.textContent : '';
  const retorno = document.querySelector('.fic-retorno');
  const holoAba = document.querySelector('[data-aba="holoscan"]'); if (holoAba) holoAba.click();
  await new Promise(r => setTimeout(r, 300));
  const abaHolo = document.getElementById('aba-holoscan');
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 200));
  return {
    linha: texto,
    coletasNaLinha: (texto.match(/Coleta de exames/g) || []).length,
    eventosExame: Array.from(linha ? linha.querySelectorAll('.fic-evento.exame') : [])
      .map(e => e.textContent),
    holoNaLinha: (texto.match(/aplicação do HOLOSCAN/g) || []).length,
    retorno: retorno ? retorno.textContent : '',
    abaHolo: abaHolo ? abaHolo.textContent : '',
    indiceTela: document.getElementById('holo-score-total').textContent
  };
}, P);
ok(tela.holoNaLinha === 1, 'linha do tempo: 1 HOLOSCAN (sem duplicar remoto + cache)');
ok(tela.coletasNaLinha === 0 && tela.eventosExame.length === 0, 'linha do tempo: nenhum evento de coleta (09/10: exame e so arquivo)');
ok(!/data não informada/.test(tela.linha), 'e nenhuma coleta com data virou "data não informada"');
ok(/Roda/.test(tela.linha) && /Agendamento/.test(tela.linha) && /Laudo glicemia/.test(tela.linha),
   'linha do tempo: ferramenta, agendamento e documento tambem');
ok(/Mapa HOLOS/.test(tela.abaHolo), 'aba HOLOSCAN da ficha mostra o Mapa HOLOS vindo do servidor');
ok(tela.indiceTela === holo1.indice, 'a secao HOLOSCAN desenha o mapa de A em B: Indice ' + tela.indiceTela);
ok(/1 aplicação HOLOSCAN/.test(tela.retorno) && /3 ferramentas aplicadas/.test(tela.retorno) &&
   !/coleta de exames/.test(tela.retorno),
   '"Desde a última consulta" conta o que veio do servidor: ' + tela.retorno.replace(/\s+/g, ' ').slice(0, 160));

/* ==================================================================== */
titulo('3. EXPORTACAO NUM NAVEGADOR LIMPO, SEM ABRIR ABA NENHUMA');
/* ==================================================================== */

const C = await dispositivo('C');
await C.p.evaluate(() => {
  window.__exportado = null;
  const orig = URL.createObjectURL;
  URL.createObjectURL = function (b) { if (b && b.type === 'application/json') b.text().then(t => { window.__exportado = t; }); return orig.call(URL, b); };
  HTMLAnchorElement.prototype.click = function () { /* nao baixa de verdade */ };
});
await C.p.waitForSelector('#login-email', { visible: true });
await C.p.type('#login-email', 'a@holo.test');
await C.p.type('#login-senha', 'senha-a-123');
await C.p.click('#btn-entrar');
await C.p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados() &&
  window.HoloAuth.sessaoAtiva(), { timeout: 15000 });
// exporta IMEDIATAMENTE: a exportacao espera a leitura remota sozinha
const exp = await C.p.evaluate(async (pid) => {
  if (window.definirPacienteAtivo) window.definirPacienteAtivo(pid);
  document.getElementById('btn-exportar-paciente').click();
  for (let i = 0; i < 30 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
  document.getElementById('modal-confirmar-ok').click();
  for (let i = 0; i < 60 && !window.__exportado; i++) await new Promise(r => setTimeout(r, 100));
  return window.__exportado;
}, P);
let json = null; try { json = JSON.parse(exp); } catch (e) { /* fica null */ }
ok(!!json, 'o JSON foi gerado');
if (json) {
  ok(json.paciente && json.paciente.nome === 'Marina Release', 'do paciente certo');
  ok(Array.isArray(json.historico) && json.historico.length === 1 && json.pontuacao,
     'com o HOLOSCAN (historico + ultima pontuacao)');
  ok(json.respostasHoloscan && Object.keys(json.respostasHoloscan).length === 84, 'com as 84 respostas');
  ok(Array.isArray(json.coletasExames) && json.coletasExames.length === 1 && json.coletasExames[0].coletado_em === antiga,
     'com a coleta historica preservada (so leitura), com a data dela');
  ok(Array.isArray(json.aplicacoesFerramentas) && json.aplicacoesFerramentas.length === 3, 'com as ferramentas');
  /* V1 Etapa 1: a agenda exporta como "agendamentos" (nao "consultas"), separada de "atendimentos" */
  ok(Array.isArray(json.agendamentos) && json.agendamentos.length === 1 && !('consultas' in json),
     'com o agendamento (exportado como agendamento, nao como atendimento)');
  ok(Array.isArray(json.atendimentos) && json.atendimentos.length === 1 && json.atendimentos[0].origem === 'sem_agendamento',
     'com o atendimento que o HOLOSCAN exigiu, distinto do agendamento');
  ok(Array.isArray(json.documentos) && json.documentos.length === 1 && json.documentos[0].no_servidor === true,
     'com os metadados do documento');
  ok(!/access_token|refresh_token|service_role|signedUrl|storage_path|senha|password|"b64"/.test(exp),
     'sem token, senha, caminho de storage, URL assinada ou binario');
}

/* ==================================================================== */
titulo('4. CACHE VELHO — O SERVIDOR VENCE');
/* ==================================================================== */

// B ganha lixo local: uma entrada com _supa_id que o servidor nao tem, e uma
// entrada local pendente de outro dia (calculada e nunca salva)
await B.p.evaluate((pid) => {
  const t = JSON.parse(localStorage.getItem('holohacking.pontuacao'));
  t[pid].push({ quando: '2026-01-15', indice: 99, indice_maximo: 100, sistemas: [], _supa_id: '00000000-0000-4000-8000-000000000000' });
  t[pid].push({ quando: '2026-01-10', indice: 12, indice_maximo: 100, sistemas: [], calculado_em: '2026-01-10T10:00:00.000Z' });
  localStorage.setItem('holohacking.pontuacao', JSON.stringify(t));
}, P);

// A: segundo HOLOSCAN no MESMO dia, com outras respostas
const holo2 = await aplicarHoloscan(A.p, 1);
const apps2 = srv.linhas('holoscan_applications').filter(x => x.patient_id === P);
ok(apps2.length === 2 && apps2[0].quando === apps2[1].quando,
   'servidor: dois HOLOSCAN do mesmo dia (' + apps2.map(a => a.quando).join(', ') + ')');
const histA2 = (await estadoLocal(A.p, P)).historico;
ok(histA2.length === 2 && histA2.every(e => !!e._supa_id) && histA2[0]._supa_id !== histA2[1]._supa_id,
   'A: o calculo novo do mesmo dia virou entrada NOVA, sem sobrescrever a ja salva');

await recarregar(B.p);
eb = await estadoLocal(B.p, P);
const idsB = eb.historico.map(e => e._supa_id).filter(Boolean);
ok(idsB.length === 2 && apps2.every(a => idsB.includes(a.id)),
   'B: os dois HOLOSCAN do mesmo dia, cada um com o seu ID remoto');
ok(!eb.historico.some(e => e._supa_id === '00000000-0000-4000-8000-000000000000'),
   'B: entrada local com ID que o servidor nao tem foi descartada');
ok(eb.historico.some(e => e.quando === '2026-01-10' && !e._supa_id),
   'B: entrada so-local (nunca salva) de outro dia foi preservada');
ok(umaCasa(eb.historico[eb.historico.length - 1].indice) === holo2.indice,
   'B: a ultima e a aplicacao mais nova de A (Indice ' + holo2.indice + ')');
ok(Object.keys(holo2.respostas).every(k => eb.aplicadas[k] === holo2.respostas[k]) &&
   Object.keys(eb.questionario).length === 0,
   'B: respostas aplicadas = as da aplicacao nova; a copia velha saiu do rascunho');
ok(eb.coletas.length === 1 && eb.coletas[0].coletado_em === antiga, 'B: a coleta historica continua a unica, com a data dela');
await ativar(B.p, P);

/* ==================================================================== */
titulo('5. ERRO REMOTO NAO E VAZIO');
/* ==================================================================== */

const antesErro = await B.p.evaluate(() => ({
  p: localStorage.getItem('holohacking.pontuacao'),
  q: localStorage.getItem('holohacking.questionario'),
  e: localStorage.getItem('holohacking.exames')
}));
srv.falhar.push({ tabela: 'holoscan_applications', acao: 'select' }, { tabela: 'lab_collections', acao: 'select' });
await recarregar(B.p);
const depoisErro = await B.p.evaluate(() => ({
  p: localStorage.getItem('holohacking.pontuacao'),
  q: localStorage.getItem('holohacking.questionario'),
  e: localStorage.getItem('holohacking.exames'),
  estado: window.Sincronizacao.estado()
}));
ok(depoisErro.estado.holoscan === 'erro' && depoisErro.estado.exames === 'erro',
   'estado reconhece o erro: ' + JSON.stringify(depoisErro.estado));
ok(depoisErro.p === antesErro.p && depoisErro.q === antesErro.q && depoisErro.e === antesErro.e,
   'e nenhuma caixa local foi tocada (HOLOSCAN, respostas, exames)');

const D = await dispositivo('D');
await entrar(D.p, 'a@holo.test', 'senha-a-123');
await ativar(D.p, P);
const telaErro = await D.p.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="holoscan"]').click();
  await new Promise(r => setTimeout(r, 300));
  return document.getElementById('aba-holoscan').textContent;
}, P);
ok(/Não foi possível carregar o HOLOSCAN/.test(telaErro) && !/Nenhuma aplicação HOLOSCAN/.test(telaErro),
   'navegador limpo + erro: a tela diz que nao conseguiu ler, nao que nao ha HOLOSCAN');
srv.falhar.length = 0;
await D.ctx.close();

/* ==================================================================== */
titulo('6. DOCUMENTO: UPLOAD FALHA');
/* ==================================================================== */

await ativar(A.p, P);
srv.falhar.push({ tabela: 'patient-documents', acao: 'upload' });
const dir = mkdtempSync(join(tmpdir(), 'holo-doc-'));
const arquivo = join(dir, 'receita-offline.txt');
writeFileSync(arquivo, 'receita que nao subiu');
const aviso = await A.p.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 300));
  return true;
}, P);
const input = await A.p.$('#doc-arquivo');
await input.uploadFile(arquivo);
// simulacao 08/10: escolher o arquivo so prepara; o envio e no botao Guardar (sem data: confirma)
await A.p.evaluate(async () => { for (let i = 0; i < 2; i++) { const b = document.getElementById('doc-guardar'); if (!b) break; b.click(); await new Promise(r => setTimeout(r, 80)); } });
await A.p.waitForFunction(() => /arquivo/.test((document.getElementById('doc-aviso') || {}).textContent || ''), { timeout: 8000 });
const avisoTxt = await A.p.evaluate(() => document.getElementById('doc-aviso').textContent);
ok(/somente neste dispositivo/.test(avisoTxt) && !/sincronizado\(s\)\./.test(avisoTxt),
   'feedback claro: ficou so neste dispositivo, sem dizer "sincronizado": ' + avisoTxt.slice(0, 90));
srv.falhar.length = 0;
ok(!srv.linhas('documents').some(d => d.nome === 'receita-offline.txt'),
   'o servidor nao ganhou linha de um arquivo que nao subiu');

await recarregar(A.p);
const docsA = await A.p.evaluate(async (pid) => (await window.ArquivoStore.listar(pid))
  .map(d => ({ nome: d.nome, so_local: !!d.so_local })), P);
ok(docsA.some(d => d.nome === 'receita-offline.txt' && d.so_local),
   'recarregar A: o arquivo local continua, marcado "só neste dispositivo"');
ok(docsA.filter(d => d.nome === 'Laudo glicemia').length === 1,
   'e o documento sincronizado aparece UMA vez (copia local + remoto deduplicados por identidade)');
await recarregar(B.p);
const docsB2 = await B.p.evaluate(async (pid) => (await window.ArquivoStore.listar(pid)).map(d => d.nome), P);
ok(!docsB2.includes('receita-offline.txt'), 'B nao inventa que o arquivo existe no servidor');

// linha salva no bucket mas o insert em documents falha → objeto nao fica orfao
srv.falhar.push({ tabela: 'documents', acao: 'insert' });
const r2 = await A.p.evaluate(async (pid) => {
  const b = new Blob(['x'], { type: 'text/plain' }); b.name = 'orfao.txt';
  const r = await window.ArquivoStore.salvar(pid, b, { nome: 'orfao.txt', tipo: 'Outro', data: '' });
  return r.sincronizado;
}, P);
srv.falhar.length = 0;
ok(r2 === false && !Object.keys(srv.storage['patient-documents']).some(k => /orfao/.test(k)),
   'upload ok + linha falhou: reporta nao sincronizado e remove o objeto orfao do bucket');

// 09/10: documento do prontuario nao se exclui — se ARQUIVA; sai da lista nos dois lados, a linha e o arquivo ficam
const arquivamento = await A.p.evaluate(async (pid) => {
  const l = await window.ArquivoStore.listar(pid);
  const alvo = l.find(d => d.nome === 'Laudo glicemia');
  let remover = 'nao recusou';
  try { await window.ArquivoStore.remover(alvo.id); } catch (e) { remover = e.message; }
  await window.ArquivoStore.arquivar(alvo.id, true);
  const ativos = (await window.ArquivoStore.listar(pid)).filter(d => d.nome === 'Laudo glicemia').length;
  const arquivados = (await window.ArquivoStore.listar(pid, { arquivados: true })).filter(d => d.nome === 'Laudo glicemia').length;
  return { remover, ativos, arquivados };
}, P);
const linhaLaudo = srv.linhas('documents').find(d => d.nome === 'Laudo glicemia');
ok(/Arquivar/.test(arquivamento.remover) && arquivamento.ativos === 0 && arquivamento.arquivados === 1 && linhaLaudo && linhaLaudo.arquivado_em && !!srv.storage['patient-documents'][linhaLaudo.storage_path],
   'remover e recusado; arquivar tira da lista (e aparece em arquivados), a linha e o arquivo continuam no servidor');
await recarregar(B.p);
ok((await B.p.evaluate(async (pid) => (await window.ArquivoStore.listar(pid)).filter(d => d.nome === 'Laudo glicemia').length, P)) === 0, 'em B o documento arquivado tambem saiu da lista (nao "volta")');

/* ==================================================================== */
titulo('7. EXCLUSAO EM LOTE INTERROMPIDA NO MEIO');
/* ==================================================================== */

const X1 = await cadastrar(A.p, 'Lote Um');
const X2 = await cadastrar(A.p, 'Lote Dois');
const X3 = await cadastrar(A.p, 'Lote Tres');
await A.p.evaluate((ids) => {
  const t = JSON.parse(localStorage.getItem('holohacking.exames') || '{}');
  ids.forEach(id => { t[id] = { cache: 1 }; });
  localStorage.setItem('holohacking.exames', JSON.stringify(t));
}, [X1, X2, X3]);
await A.p.evaluate(async (ids) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  ids.forEach(id => { const c = document.querySelector('[data-sel="' + id + '"]'); c.click(); });
  await new Promise(r => setTimeout(r, 100));
  document.querySelector('[data-lote="remover"]').click();
  for (let i = 0; i < 40 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
}, [X1, X2, X3]);
// entre a contagem e a confirmacao, OUTRO dispositivo registra consulta de X2
srv.tratar({ op: 'query', uid: UID_A, q: { tabela: 'consultations', acao: 'insert', filtros: [], ordem: [],
  dados: { patient_id: X2, data: HOJE, hora: '09:00', duracao_min: 60, tipo: 'retorno' } } });
await A.p.evaluate(async () => {
  const orig = window.Armazenamento.excluirPaciente;
  window.__res = [];
  window.Armazenamento.excluirPaciente = function () { return orig.apply(this, arguments).then(r => { window.__res.push(r); return r; }); };
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 1200));
});
const lote = await A.p.evaluate((ids) => {
  const lista = (window.pacientesTodos() || []).map(p => p.id);
  const ex = JSON.parse(localStorage.getItem('holohacking.exames') || '{}');
  return ids.map(id => ({ naLista: lista.includes(id), cache: !!ex[id] }));
}, [X1, X2, X3]);
const noServidor = [X1, X2, X3].map(id => srv.linhas('patients').some(p => p.id === id));
const resLocal = await A.p.evaluate(() => (window.__res || []).map(r => r.aplicado));
ok(resLocal.length === 1 && resLocal[0] === true,
   'a limpeza local do paciente excluido no servidor foi aplicada (raizRemota)');
ok(!noServidor[0] && !lote[0].naLista && !lote[0].cache, 'Lote Um: saiu do servidor E do navegador');
ok(noServidor[1] && lote[1].naLista && lote[1].cache, 'Lote Dois (historico surgiu no meio): ficou nos dois');
ok(noServidor[2] && lote[2].naLista && lote[2].cache, 'Lote Tres (depois da falha): ficou nos dois');
ok([0, 1, 2].every(i => noServidor[i] === lote[i].naLista && noServidor[i] === lote[i].cache),
   'nenhum paciente ficou divergente entre servidor e navegador');

/* ==================================================================== */
titulo('8. DADO DO SERVIDOR E TAO NAO-CONFIAVEL QUANTO O LOCAL (XSS)');
/* ==================================================================== */

const MAU = '<img src=x onerror="window.__xss=1">';
const R = srv.tratar({ op: 'query', uid: UID_A, q: { tabela: 'patients', acao: 'insert', filtros: [], ordem: [],
  retornar: true, colunas: 'id', dados: { nome: 'Rita ' + MAU, queixa: MAU } } }).data[0].id;
semearColetaHistorica(R, HOJE, { [exames[0]]: 90 }, { laboratorio: 'Lab ' + MAU });   // historico com texto malicioso, como o banco real poderia ter
srv.tabelas.lab_results.filter(r => r.collection_id === srv.tabelas.lab_collections.find(c => c.patient_id === R).id).forEach(r => { r.nome_exame_no_momento = MAU; r.unidade_no_momento = MAU; });
srv.tratar({ op: 'query', uid: UID_A, q: { tabela: 'documents', acao: 'insert', filtros: [], ordem: [],
  dados: { patient_id: R, nome: 'doc ' + MAU, tipo: MAU, mime_type: 'text/plain', tamanho_bytes: 1,
           storage_path: UID_A + '/' + R + '/x' } } });
srv.tratar({ op: 'query', uid: UID_A, q: { tabela: 'tool_applications', acao: 'insert', filtros: [], ordem: [],
  dados: { patient_id: R, ferramenta_id: 'roda_vida', versao_ferramenta: '1', status: 'concluida',
           concluida_em: new Date().toISOString(), leitura: MAU } } });
await recarregar(B.p);
const xss = await B.p.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 400));
  for (const aba of ['visao', 'holoscan', 'documentos']) {
    const b = document.querySelector('[data-aba="' + aba + '"]'); if (b) b.click();
    await new Promise(r => setTimeout(r, 400));
  }
  document.querySelector('.nav-item[data-secao="documentos"]').click();
  await new Promise(r => setTimeout(r, 600));
  return { disparou: !!window.__xss, imgs: document.querySelectorAll('img[src="x"]').length };
}, R);
ok(!xss.disparou && xss.imgs === 0,
   'nome, laboratorio, documento e leitura vindos do servidor sao escapados na ficha, linha do tempo e Documentos');

/* ==================================================================== */
console.log('');
ok(errosJS.length === 0, 'sem erro de JS: ' + (errosJS[0] || 'limpo'));
await nav.close();
rmSync(dir, { recursive: true, force: true });
process.exit(falhou ? 1 : 0);
