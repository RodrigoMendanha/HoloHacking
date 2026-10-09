/**
 * V1 — ETAPA 5 (reescrita 09/10) — UI DE EXAMES E LEITURA INTEGRADA RETIRADAS (Supabase falso, app real, puppeteer)
 *
 *  A Etapa 5 provava na tela: catalogo 45, busca, aliases, nova coleta, editar, estado de salvamento, exame custom,
 *  variantes, hemograma, qualitativo, censurado, revisao, comparacao, timeline, relatorio snapshot, Leitura
 *  Integrada. Decisao de produto 09/10: NADA disso existe mais na tela. O que fica: a biblioteca de arquivos; o
 *  historico laboratorial so no banco.
 *   1  nenhum modulo de laboratorio/LI carregado (window.Laboratorio, LabCatalogo, LabMotor, LeituraIntegradaMotor,
 *      LeituraIntegradaPacoteV1) e nenhum <script> deles no index.html servido
 *   2  menu e ficha (todas as abas) sem: Lancar valores, Nova coleta, Leitura Integrada, Convergente/Divergente,
 *      catalogo, exame custom, "usar estrutura", comparacao laboratorial
 *   3  com coleta historica + LI historica no servidor: Evolucao, relatorio, Visao geral, linha do tempo, HOLOS AI,
 *      Resultado e aba HOLOSCAN nao mostram valor nem conclusao laboratorial
 *   4  HOLOSCAN oficial: Indice/notas/faixas/Triada identicos com e sem historico laboratorial; nenhum score
 *      laboratorial; CMB/REC/SEL continuam desligados (nenhuma regra apresentavel)
 *   5  celular (390 px): aba Documentos sem rolagem lateral
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UID_A, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UID_A, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UID_A, nome, args });
const agora = () => new Date().toISOString();
const PA = q('patients', 'insert', { dados: { nome: 'Paciente E5 UI Ficticia' } }).data[0].id;
const EA = q('encounters', 'insert', { dados: { patient_id: PA, occurred_at: agora(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' } }).data[0].id;
const HID = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: agora().slice(0, 10) }) }).data;
ok(!!HID, 'fixture: HOLOSCAN oficial salvo');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
async function entrar() {
  await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  if (!(await A.evaluate(() => window.HoloAuth && window.HoloAuth.sessaoAtiva()))) {   /* a sessao da conta persiste no contexto: so entra uma vez */
    await A.waitForSelector('#login-email', { visible: true });
    await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
  }
  await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await A.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await window.Sincronizacao.aguardar(); }, PA);
}
await entrar();
const foto = () => A.evaluate((pid) => { const u = window.ultimaPontuacao(pid); return JSON.stringify({ i: u.indice, s: u.sistemas.map(x => [x.sistema, x.nota, x.faixa, x.nota_exata]), t: u.triada }); }, PA);
const semHistorico = await foto();

titulo('1. NENHUM MODULO DE LABORATORIO OU LI CARREGADO');
const mod = await A.evaluate(async () => {
  const html = await (await fetch('/index.html', { cache: 'no-store' })).text();
  const scripts = [...html.matchAll(/<script[^>]+src="\/?([^"]+)"/g)].map(m => m[1]);
  return { globais: ['Laboratorio', 'LabCatalogo', 'LabMotor', 'LeituraIntegradaMotor', 'LeituraIntegradaPacoteV1'].filter(n => !!window[n]),
    scripts: scripts.filter(s => /laboratorio|leitura-integrada/.test(s)), total: scripts.length };
});
ok(mod.globais.length === 0, 'nenhum global de laboratorio/LI: ' + (mod.globais.join(',') || 'limpo'));
ok(mod.scripts.length === 0 && mod.total > 40, 'o index.html servido nao carrega laboratorio-*.js nem leitura-integrada-*.js (' + mod.total + ' scripts)');

titulo('2. MENU E FICHA SEM A UI DE EXAMES/LI');
const PROIBIDO = /Lançar valores|Nova coleta|Editar coleta|Leitura Integrada|Convergente|Divergente|exame customizado|Exame custom|usar estrutura|Comparação laboratorial|Catálogo de exames|Calcular leitura|Salvar leitura/i;
const ui = await A.evaluate(async (pid) => {
  const out = { menu: [...document.querySelectorAll('.nav-item')].map(b => b.dataset.secao), abas: {} };
  for (const aba of ['visao', 'atendimentos', 'anamnese', 'holoscan', 'ferramentas', 'resultado-holos', 'documentos', 'conduta', 'evolucao', 'relatorio', 'holos-ai']) {
    window.levarParaFicha('aba:' + aba, pid); await new Promise(r => setTimeout(r, 500));
    out.abas[aba] = (document.getElementById('aba-' + aba) || {}).innerText || '';
  }
  out.botoes = document.querySelectorAll('[data-lab-acao], [data-lancar], #lab-corpo, #ex-corpo, #li-corpo, [data-li-acao]').length;
  return out;
}, PA);
ok(!ui.menu.includes('confronto') && ui.menu.includes('resultado') && ui.menu.includes('documentos'), 'menu: sem Leitura Integrada; com Resultado e Documentos');
const vazou = Object.entries(ui.abas).filter(([, t]) => PROIBIDO.test(t)).map(([k]) => k);
ok(vazou.length === 0 && ui.botoes === 0, 'nenhuma aba da ficha oferece lancar/coleta/LI/catalogo/comparacao laboratorial' + (vazou.length ? ': ' + vazou.join(',') : ''));

titulo('3. COM HISTORICO LABORATORIAL E LI NO SERVIDOR: NADA EM TELA');
const CID = globalThis.crypto.randomUUID();
srv.tabelas.lab_collections.push({ id: CID, nutritionist_id: UID_A, patient_id: PA, encounter_id: EA, coletado_em: '2026-03-10', data_coleta_desconhecida: false, laboratorio: 'Laboratorio Historico', observacao: 'obs historica', state: 'salvo', source: 'manual', revision: 1, created_by: UID_A, created_at: agora(), updated_at: agora() });
srv.tabelas.lab_results.push({ id: globalThis.crypto.randomUUID(), collection_id: CID, exam_code: 'LAB-027', exame_id: 'EXA-009', valor: 5432, value_original_text: '5432', numeric_value: 5432, qualifier: 'eq', unit_original: 'mg/dL', unidade_no_momento: 'mg/dL', nome_exame_no_momento: 'Exame Historico', report_reference_text: '10 a 20', created_at: agora() });
srv.tabelas.integrated_readings.push({ id: globalThis.crypto.randomUUID(), nutritionist_id: UID_A, patient_id: PA, holoscan_application_id: HID, responsible: 'Nutri Teste', state: 'divergente', domain_code: 'LI-D01', professional_note: 'NOTA_LI_HISTORICA', revision: 1, reason_codes: [], created_at: agora() });
await entrar();
const VAZA = /5432|Exame Historico|Laboratorio Historico|obs historica|NOTA_LI_HISTORICA|Convergente|Divergente|LI-D01|Coleta de exames/;
const telas = await A.evaluate(async (pid) => {
  const out = {};
  for (const aba of ['visao', 'holoscan', 'evolucao', 'relatorio']) { window.levarParaFicha('aba:' + aba, pid); await new Promise(r => setTimeout(r, 700)); out[aba] = (document.getElementById('aba-' + aba) || {}).innerText || ''; }
  out.timeline = (document.getElementById('fic-visao-timeline') || {}).innerText || '';
  window.levarParaFicha('aba:holos-ai', pid); await new Promise(r => setTimeout(r, 400));
  const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 300));
  out.ia = (document.getElementById('ai-hub-texto') || {}).textContent || '';
  document.querySelector('.nav-item[data-secao="resultado"]').click(); await new Promise(r => setTimeout(r, 900));
  out.resultado = document.getElementById('secao-resultado').innerText;
  out.lidas = (window.Sincronizacao.coletas(pid) || []).length;
  return out;
}, PA);
ok(telas.lidas === 1, 'a coleta historica foi lida do servidor (preservada, so leitura)');
const vazou3 = Object.entries(telas).filter(([k, t]) => k !== 'lidas' && VAZA.test(t)).map(([k]) => k);
ok(vazou3.length === 0, 'Visao geral, aba HOLOSCAN, Evolucao, relatorio, linha do tempo, HOLOS AI e Resultado: nenhum valor, nome, laboratorio, nota de LI ou conclusao' + (vazou3.length ? ' — vazou em ' + vazou3.join(',') : ''));

titulo('4. HOLOSCAN IDENTICO; NENHUM SCORE LABORATORIAL; CMB/REC/SEL DESLIGADOS');
const comHistorico = await foto();
ok(comHistorico === semHistorico, 'Indice, notas exatas, faixas e Triada identicos com e sem historico laboratorial');
const regras = await A.evaluate(() => ({ apresentaveis: window.regrasApresentaveis ? window.regrasApresentaveis().length : 0, scoreLab: Object.keys(window.ultimaPontuacao() || {}).filter(k => /lab|exame/i.test(k)).length }));
ok(regras.apresentaveis === 0 && regras.scoreLab === 0, 'nenhuma regra CMB/REC/SEL apresentavel e nenhum campo laboratorial no resultado do HOLOSCAN');

titulo('5. CELULAR');
await A.setViewport({ width: 390, height: 800 });
await A.evaluate(async (pid) => { window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 600)); }, PA);
ok(await A.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), 'aba Documentos a 390 px: sem rolagem lateral');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
