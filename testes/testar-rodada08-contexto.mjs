/**
 * RODADA 08 — ONDA 8: EXPORTACAO, EVOLUCAO, LINHA DO TEMPO, CONTEXTO
 *
 * Supabase falso, app real, com conta.
 *
 *   1  exportar le o HOLOSCAN do SERVIDOR, aplicacao por aplicacao (com
 *      respostas e notas por sistema); sem storage_path, sem nutritionist_id,
 *      sem token; leitura que falha cancela a exportacao
 *   2  "Evolução → Abrir" leva ao comparativo (antes x agora, Tríade,
 *      aplicacoes com data e Indice)
 *   3  linha do tempo: no mesmo dia, o carimbo real decide a ordem
 *   4  contexto da HOLOS AI traz exames (nome, resultado, unidade, data,
 *      faixa), consultas, OQ³, PQQ, Mapa do Propósito, Linha do Momentum,
 *      Mapa de Crenças, Roda da Vida, Carta ao Futuro
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHistorica } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();
const A = await ctx.newPage();
await A.setViewport({ width: 1366, height: 900 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
async function pronto() {
  await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await A.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(250);
}
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await pronto();

const P = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Contexto';
  document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100));
    const achou = (window.pacientesTodos() || []).find(x => x.nome === 'Paciente Contexto');
    if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
  }
  return null;
});
await esperar(300);
const hoje = await A.evaluate(() => window.hojeISO());

/* Correcao P0 (pos-deploy 6.4): a RPC so grava aplicacao OFICIAL (pacote aprovado, 84 respostas, 5 sistemas). Estas duas
   aplicacoes (2 respostas, 1 sistema, motor legado) sao HISTORICAS: ja estao no servidor, como o banco real as tem. */
const appH = (quando, indice, fisico) => ({
  application: { patient_id: P, quando, versao_estrutura: 1, versao_bancos: 'v', indice, indice_maximo: 100, avaliavel: true, nota_media: 5,
                 triada: { fisico, mental: 6, espiritual: 7 }, triada_com_dado: { fisico: true, mental: true, espiritual: true }, cobertura: {} },
  answers: [{ marcador_id: 'M1', valor: 2 }, { marcador_id: 'M2', valor: 1 }],
  scores: [{ sistema: 'fungico', nome: 'Sistema Fúngico', nota: indice / 10, carga: 1, faixa: 'baixo', obtido: 1, maximo: 3, respondidos: 2, total_marcadores: 2, avaliavel: true }]
});
semearHistorica(srv, UID_A, appH('2026-06-01', 40, 3));
semearHistorica(srv, UID_A, appH('2026-09-01', 60, 5));
/* coleta HISTORICA (anterior a 09/10): ja esta no servidor, como o banco real a tem; nada novo pode entrar (ver abaixo) */
{
  const agora = new Date().toISOString();
  const cid = globalThis.crypto.randomUUID();
  srv.tabelas.lab_collections.push({ id: cid, nutritionist_id: UID_A, patient_id: P, encounter_id: null, coletado_em: '2026-08-20', data_coleta_desconhecida: false, laboratorio: null, observacao: null,
    state: 'salvo', source: 'manual', revision: 1, created_by: UID_A, created_at: agora, updated_at: agora });
  srv.tabelas.lab_results.push({ id: globalThis.crypto.randomUUID(), collection_id: cid, exame_id: 'EXA-001', valor: 95, unidade_no_momento: 'mg/dL', nome_exame_no_momento: 'Glicose de jejum', sistema_no_momento: 'metabolico', created_at: agora });
}
/* dados no SERVIDOR, gravados pelos caminhos reais (RPC e tabelas sob RLS) */
const coletaRecusada = await A.evaluate(async (pid, hoje) => {
  const sb = window.supabaseClient;
  const app = (quando, indice, fisico) => ({
    application: { patient_id: pid, quando, versao_estrutura: 1, versao_bancos: 'v', indice, indice_maximo: 100,
                   avaliavel: true, nota_media: 5, triada: { fisico, mental: 6, espiritual: 7 },
                   triada_com_dado: { fisico: true, mental: true, espiritual: true }, cobertura: {} },
    answers: [{ marcador_id: 'M1', valor: 2 }, { marcador_id: 'M2', valor: 1 }],
    scores: [{ sistema: 'fungico', nome: 'Sistema Fúngico', nota: indice / 10, carga: 1, faixa: 'baixo', obtido: 1,
               maximo: 3, respondidos: 2, total_marcadores: 2, avaliavel: true }]
  });
  void app;   // as 2 aplicacoes HOLOSCAN (historicas) ja estao no servidor: semeadas antes (ver abaixo do comentario P0)
  /* 09/10: a RPC de coleta recusa (laboratorio_desativado); a coleta HISTORICA entra direto no servidor falso (abaixo, fora do navegador) */
  window.__coletaRecusada = (await sb.rpc('salvar_coleta_exames', { payload: {
    collection: { patient_id: pid, coletado_em: '2026-08-20', data_coleta_desconhecida: false },
    results: [{ exame_id: 'EXA-001', valor: 95, unidade_no_momento: 'mg/dL', nome_exame_no_momento: 'Glicose de jejum', sistema_no_momento: 'metabolico' }] } })).error;
  await sb.from('consultations').insert([{ patient_id: pid, data: hoje, hora: '09:00', tipo: 'retorno', duracao_min: 60, nota: 'retorno de rotina' }]);
  const concluida = (fid, respostas, quando) => ({ patient_id: pid, ferramenta_id: fid, versao_ferramenta: '1',
    status: 'concluida', respostas, iniciada_em: quando, concluida_em: quando, atualizada_em: quando });
  await sb.from('tool_applications').insert([
    concluida('oq3', { quer: 'quer dormir bem', precisa: 'precisa de rotina', consegue: 'consegue caminhar', alavancas: 'a filha' }, hoje + 'T15:00:00.000Z'),
    concluida('pqq', { objetivo: 'ter energia', r1: 'para brincar', verdadeiro: 'estar presente' }, hoje + 'T15:05:00.000Z'),
    concluida('mapa_crencas', { crencas: 'carboidrato engorda' }, hoje + 'T15:10:00.000Z'),
    concluida('roda_vida', { saude: '4', puxa: 'trabalho' }, hoje + 'T15:15:00.000Z'),
    concluida('carta_futuro', { carta: 'querida eu do futuro' }, hoje + 'T15:20:00.000Z'),
    concluida('linha_momentum', { energia: '2', sustenta: 'a familia' }, hoje + 'T15:25:00.000Z')
  ]);
  await window.Sincronizacao.hidratar(window.pacientesTodos());
  await window.Sincronizacao.aguardar();
  await window.Aplicacoes.carregar();
  return window.__coletaRecusada;
  await window.Agenda.carregarDados();
}, P, hoje);
await esperar(300);

/* ==================================================================== */
titulo('1. EXPORTAR DO SERVIDOR');
/* ==================================================================== */

async function exportar() {
  return A.evaluate(async (pid) => {
    window.__blobs = [];
    const orig = URL.createObjectURL;
    URL.createObjectURL = (b) => { window.__blobs.push(b); return 'blob:teste'; };
    const t = document.getElementById('toast');
    const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('btn-exportar-paciente').click();
    await new Promise(r => setTimeout(r, 150));
    document.getElementById('modal-confirmar-ok').click();
    await new Promise(r => setTimeout(r, 900));
    obs.disconnect();
    URL.createObjectURL = orig;
    const texto = window.__blobs.length ? await window.__blobs[0].text() : null;
    return { texto, toasts: vistos.join(' | ') };
  }, P);
}
let r = await exportar();
const pacote = r.texto ? JSON.parse(r.texto) : {};
const apps = pacote.holoscanAplicacoes || [];
ok(pacote.fonte === 'servidor' && apps.length === 2 && apps[0].quando === '2026-06-01' && apps[1].quando === '2026-09-01',
   'o arquivo traz as 2 aplicacoes DO SERVIDOR, em ordem: ' + apps.map(a => a.quando).join(', '));
ok(apps.every(a => a.respostas.length === 2 && a.sistemas.length === 1 && a.triada && typeof a.indice === 'number'),
   'cada aplicacao com respostas, notas por sistema, Tríade e Índice');
ok(!/storage_path|nutritionist_id|access_token|refresh_token|service_role|sb-[a-z]+-auth/i.test(r.texto || ''),
   'sem storage_path, nutritionist_id nem token no arquivo');

srv.falhar.push({ tabela: 'holoscan_applications', acao: 'select', vezes: 1 });
r = await exportar();
ok(r.texto === null && /não foi possível ler o HOLOSCAN do servidor/.test(r.toasts),
   'leitura do servidor falhou: nada exportado, e a tela diz: ' + r.toasts.slice(0, 80));

/* ==================================================================== */
titulo('2. EVOLUCAO → ABRIR');
/* ==================================================================== */

const evo = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  await new Promise(r => setTimeout(r, 300));
  const b = [...document.querySelectorAll('#dash-trabalho [data-destino="evolucao"]')][0];
  if (!b) return { achou: false };
  b.click();
  await new Promise(r => setTimeout(r, 400));
  const e = document.getElementById('holo-evolucao');
  const secao = document.querySelector('.secao.ativa');
  return { achou: true, secao: secao && secao.id, visivel: e && !e.classList.contains('hidden'),
           texto: e ? e.textContent : '' };
});
ok(evo.achou && evo.secao === 'secao-holoscan' && evo.visivel,
   '"Evolução → Abrir" leva ao comparativo no HOLOSCAN (' + evo.secao + ')');
ok(/Tríade/.test(evo.texto) && /Físico/.test(evo.texto) && /1ª/.test(evo.texto) && /2ª/.test(evo.texto) &&
   /Índice 40/.test(evo.texto) && /Índice 60/.test(evo.texto),
   'com antes x agora, Tríade e a lista das aplicacoes com data e Índice');

/* ==================================================================== */
titulo('3. LINHA DO TEMPO');
/* ==================================================================== */

const linha = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 500));
  return [...document.querySelectorAll('#fic-visao-timeline .fic-evento')].map(e =>
    e.querySelector('.fic-evento-topo b').textContent);
}, P);
const iConsulta = linha.findIndex(t => /Agendamento/.test(t));
const iCarta = linha.findIndex(t => /Carta/.test(t));
const iOq3 = linha.findIndex(t => /OQ3|OQ³/.test(t));
ok(iCarta >= 0 && iConsulta >= 0 && iCarta < iOq3 && iOq3 < iConsulta,
   'no mesmo dia: 15h25 > 15h20 > 15h00 > consulta das 9h — ' + linha.slice(0, 8).join(' / '));

/* ==================================================================== */
titulo('4. CONTEXTO DA HOLOS AI');
/* ==================================================================== */

const contexto = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-aba="holos-ai"]').click();
  await new Promise(r => setTimeout(r, 300));
  const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]');
  if (b) b.click();
  await new Promise(r => setTimeout(r, 200));
  return (document.getElementById('ai-hub-texto') || {}).textContent || '';
}, P);
const tem = (re, nome) => ok(re.test(contexto), 'o contexto traz ' + nome);
// 09/10: exame e so arquivo — nem a coleta historica (semeada direto no servidor) nem valor algum entram no contexto da IA
ok(!/Glicose de jejum|95 mg\/dL|faixa 70–90|## Exames|EXA-001/.test(contexto) && /Exames e documentos do prontuário .* NÃO estão incluídos/.test(contexto),
   'o contexto NAO traz exames (nem a coleta historica, nem faixa) e diz isso na fronteira: exame nao participa');
ok(coletaRecusada && coletaRecusada.hint === 'laboratorio_desativado' && srv.linhas('lab_collections').length === 1, 'a RPC de coleta recusou (laboratorio_desativado) e a coleta historica semeada ficou intacta');
tem(/Marcada|Realizada/, 'as consultas');
tem(/retorno de rotina/, 'a observacao da consulta');
tem(/### OQ³[\s\S]*quer dormir bem/, 'o OQ³');
tem(/### PQQ[\s\S]*ter energia/, 'o PQQ');
tem(/### Mapa do Propósito[\s\S]*Propósito: “estar presente”/, 'o Mapa do Propósito');
tem(/Linha do Momentum[\s\S]*a familia/, 'a Linha do Momentum');
tem(/Mapa de Crenças[\s\S]*carboidrato engorda/, 'o Mapa de Crenças');
tem(/Roda Holística da Vida[\s\S]*Saúde: 4[\s\S]*trabalho/, 'a Roda da Vida (Roda Holística da Vida)');
tem(/Carta ao Futuro[\s\S]*querida eu do futuro/, 'a Carta ao Futuro');

/* onda 9: sem URL configurada, o agente nao e um botao morto */
const agentes = await A.evaluate(() => ['ai-btn-chatgpt', 'ai-btn-gemini'].map(id => {
  const el = document.getElementById(id);
  return { dev: /Em desenvolvimento/.test(el.textContent), desabilitado: el.getAttribute('aria-disabled') === 'true',
           semHref: !el.getAttribute('href') };
}));
ok(agentes.every(a => a.dev && a.desabilitado && a.semHref),
   'ChatGPT e Gemini sem URL: marcados "Em desenvolvimento", aria-disabled, sem link');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
