/**
 * V1 — ETAPA 6.0 — UI MINIMA DA LEITURA INTEGRADA (Supabase falso, app real, puppeteer)
 *
 *  7 dominios na tela; D01-D04 com estado/direcoes/regras; D05-D07 com texto neutro (sem Convergente/Divergente/Sem
 *  dados por falta de HOLOSCAN); exames usados, contextuais e excluidos com motivo humano; duplicidade exige escolha
 *  explicita na tela; salvar por dominio; textos sem conclusao diagnostica; confronto legado fora da saida oficial.
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
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const PA = srv.tratar({ op: 'query', uid: UA, q: { tabela: 'patients', acao: 'insert', dados: { nome: 'Paciente E6 UI' }, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } }).data[0].id;
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const D = '2026-03-10';
/* Correcao P0 (pos-deploy 6.4): aplicacao HISTORICA (pre-existente, sem pacote V1) — a RPC so grava aplicacao oficial. */
semearHistorica(srv, UA, { application: { patient_id: PA, quando: D, cobertura: { respondidos: 84, total: 84 } } });
const R = (code, valor, extra) => Object.assign({ exam_code: code, value_original_text: String(valor), numeric_value: Number(valor), qualifier: 'eq', unit_original: 'mg/L', report_reference_text: '10 a 20', report_reference_min: 10, report_reference_max: 20 }, extra || {});
const coleta = (data, results) => rpc('salvar_coleta_laboratorial', { payload: { collection: { patient_id: PA, clinical_date: data, state: 'salvo' }, results } }).data.id;
coleta(D, [R('LAB-016', 30), R('LAB-018', 30), R('LAB-010', 30), R('LAB-030', 30), R('LAB-002', 'Negativo', { numeric_value: null, qualifier: 'text' })]);
coleta(D, [R('LAB-016', 15)]);   // mesma data, mesma PCR -> duplicidade

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();
const A = await ctx.newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);
await A.evaluate(() => { window.confirm = () => true; });

titulo('SECAO LEITURA INTEGRADA: 7 DOMINIOS, D05-D07 NEUTROS, MOTIVOS HUMANOS, DUPLICIDADE EXPLICITA');
const tela = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('.nav-item[data-secao="confronto"]').click();
  for (let i = 0; i < 50 && !document.querySelector('#holo-confronto #li-app'); i++) await new Promise(r => setTimeout(r, 100));
  const r = document.getElementById('holo-confronto');
  const sel = r.querySelector('#li-app'); sel.value = sel.options[sel.options.length - 1].value; sel.dispatchEvent(new Event('change')); await new Promise(x => setTimeout(x, 300));
  r.querySelectorAll('[data-li-coleta]').forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change')); });
  r.querySelector('[data-li-acao="calcular"]').click();
  for (let i = 0; i < 50 && !r.querySelector('#li-resultado'); i++) await new Promise(x => setTimeout(x, 100));
  return { texto: r.innerText, doms: [...r.querySelectorAll('[data-li-dominio]')].map(d => d.dataset.liDominio), estados: r.querySelectorAll('.li-estado').length, neutros: r.querySelectorAll('.li-dominio-sem-confronto').length, dup: r.querySelectorAll('[data-li-result]').length, salvar: [...r.querySelectorAll('[data-li-salvar]')].map(b => b.dataset.liSalvar), coletas: r.querySelectorAll('[data-li-coleta]').length };
}, PA);
ok(tela.doms.join(',') === 'LI-D01,LI-D02,LI-D03,LI-D04,LI-D05,LI-D06,LI-D07' && tela.estados === 4 && tela.neutros === 3 && tela.coletas === 2, '7 dominios na tela: 4 com estado (D01-D04), 3 neutros (D05-D07); 2 coletas da mesma data selecionaveis');
ok(/LI-V1 v2 · em_revisao/.test(tela.texto) && /ainda não homologado/.test(tela.texto), 'cabecalho: pacote LI-V1 v2 em_revisao, ainda nao homologado');
ok(/não possui confronto automático com um sistema HOLOSCAN/.test(tela.texto) && !/missing_domain_holoscan_mapping/.test(tela.texto), 'D05-D07: texto neutro de interface; nunca missing_domain_holoscan_mapping');
ok(tela.dup === 2 && /Resultados duplicados nas coletas selecionadas/.test(tela.texto) && /duplicate_result_unresolved/.test(tela.texto), 'duplicidade (PCR em duas coletas da mesma data): a tela pede escolha explicita (2 opcoes); nada escolhido por data de edicao');
ok(/Há mais de um resultado do mesmo exame/.test(tela.texto) && /não foi calculada com o pacote metodológico homologado/.test(tela.texto) && /Resultado qualitativo sem regra homologada/.test(tela.texto), 'reason codes traduzidos para humano (duplicidade, versao HOLOSCAN, qualitativo sem regra)');
ok(/Exames contextuais \(não formam direção\)/.test(tela.texto) && /Excluídos e motivo/.test(tela.texto) && /Direção HOLOSCAN/.test(tela.texto) && /Direção laboratorial/.test(tela.texto) && /suficiência rule_based/.test(tela.texto) && /temporal LI-TEMP-01 v1/.test(tela.texto), 'cada dominio mostra exames usados, contextuais, excluidos com motivo, direcoes, regra/versionamento');
ok(tela.salvar.join(',') === 'LI-D01,LI-D02,LI-D03,LI-D04', 'salvar por dominio so nos dominios com confronto (D01-D04)');
const semNegacoes = tela.texto.replace(/Nenhum exame fora da referência confirma ou contradiz o HOLOSCAN/g, '').replace(/não representa diagnóstico/g, '');
ok(!/\bconfirma\b|\bprova\b|diagnostica|normal global|saudável|\bdoente\b|\bcura\b|melhora|piora/i.test(semNegacoes), 'nenhuma conclusao diagnostica automatica na tela (fora das negacoes explicitas)');
ok(!/faixa cadastrada|LEGADO|\.conf-item/.test(tela.texto) && (await A.evaluate(() => document.querySelectorAll('#holo-confronto .conf-item').length)) === 0, 'confronto legado fora da saida oficial');

titulo('ESCOLHA EXPLICITA DO DUPLICADO E SALVAR POR DOMINIO');
const depois = await A.evaluate(async () => {
  const r = document.getElementById('holo-confronto');
  const cb = r.querySelector('[data-li-result]'); cb.checked = true; cb.dispatchEvent(new Event('change'));
  r.querySelector('[data-li-acao="calcular"]').click(); await new Promise(x => setTimeout(x, 500));
  const txt = r.innerText;
  r.querySelector('#li-responsavel').value = 'Profissional X'; r.querySelector('[data-li-salvar="LI-D01"]').click();
  for (let i = 0; i < 40 && !r.querySelector('.dash-pendentes'); i++) await new Promise(x => setTimeout(x, 100));
  return { txt, salvas: (r.querySelector('.dash-pendentes') || {}).innerText || '' };
});
ok(!/duplicate_result_unresolved/.test(depois.txt) && /resultado duplicado não escolhido/.test(depois.txt), 'depois da escolha: duplicidade resolvida; o outro resultado aparece como nao escolhido');
const lr = srv.linhas('integrated_readings');
ok(lr.length === 1 && lr[0].domain_code === 'LI-D01' && lr[0].state === 'sem_dados_suficientes' && lr[0].rule_version === 2 && lr[0].snapshot.selected_result_ids.length === 2 && /LI-D01 · Sem dados suficientes/.test(depois.salvas), 'leitura de D01 salva (sem dados: HOLOSCAN sem pacote V1) com snapshot dos 2 resultados escolhidos; listada na tela');
ok(errosJS.length === 0, 'nenhum erro JS na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));

await nav.close();
console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
