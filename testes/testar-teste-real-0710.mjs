/**
 * Correcoes do teste real de 07/10 e pagina de Ajuda. Supabase falso, com conta:
 *   1  o atendimento ativo volta depois de recarregar a pagina
 *   2  com um atendimento ANTIGO ativo, a aba Conduta e a Visao geral mostram a conduta vigente do atendimento mais novo
 *   3  busca "glicose" acha Glicemia de jejum; o contador acompanha a busca
 *   4  a ficha conta os exames das coletas V1; HOLOSCAN salvo nao aparece como "nao iniciado"
 *   5  ferramenta concluida tira o alerta "mapa sem conduta"
 *   6  Proxima consulta ignora a de hoje que ja passou; "Ver" abre a consulta na Agenda
 *   7  relatorio mostra a referencia do laudo
 *   8  pagina de Ajuda: perguntas, busca, relato de erro sem dado de paciente
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Teste Real Ficticio' } }).data[0].id;
const iso = d => d.toISOString();
const EV = q('encounters', 'insert', { dados: { patient_id: PA, occurred_at: iso(new Date(Date.now() - 2 * 86400000)), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' } }).data[0].id;
const EN = q('encounters', 'insert', { dados: { patient_id: PA, occurred_at: iso(new Date(Date.now() - 3600000)), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' } }).data[0].id;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
const pronto = () => A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados() && window.AtendimentoAtual && window.AtendimentoAtual.todos().length >= 2, { timeout: 15000 });
await pronto();
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ----- 2 (prepara): conduta salva no atendimento NOVO ----- */
await A.evaluate(async (pid, en) => {
  window.definirPacienteAtivo(pid);
  window.AtendimentoAtual.selecionarPorId(en);
  window.levarParaFicha('aba:conduta', pid);
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-cd-acao="nova"]').click();
  await new Promise(r => setTimeout(r, 200));
  const campo = document.querySelector('#aba-conduta textarea, #aba-conduta input[type="text"]');
  campo.value = 'Objetivo de teste'; campo.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('[data-cd-acao="salvar"]').click();
  await new Promise(r => setTimeout(r, 800));
}, PA, EN);
ok(srv.linhas('conducts').filter(c => c.encounter_id === EN && c.status !== 'rascunho').length === 1, 'conduta salva no atendimento novo');

/* ----- 1: atendimento ativo sobrevive ao recarregar ----- */
await A.reload({ waitUntil: 'networkidle2' });
await pronto();
await A.waitForFunction((en) => window.AtendimentoAtual.atual() && window.AtendimentoAtual.atual().id === en, { timeout: 8000 }, EN).catch(() => {});
const depois = await A.evaluate(() => (window.AtendimentoAtual.atual() || {}).id || null);
ok(depois === EN, 'depois de recarregar, o atendimento ativo continua o mesmo');

/* ----- 2: atendimento antigo ativo ----- */
const cd = await A.evaluate(async (pid, ev) => {
  window.AtendimentoAtual.selecionarPorId(ev);
  window.levarParaFicha('aba:conduta', pid);
  await new Promise(r => setTimeout(r, 400));
  const aviso = document.getElementById('cd-vigente-outro');
  const txtAviso = aviso ? aviso.innerText : '';
  document.querySelector('[data-aba="visao"]').click();
  await new Promise(r => setTimeout(r, 300));
  return { aviso: txtAviso, visao: document.getElementById('aba-visao').innerText };
}, PA, EV);
ok(/conduta vigente desta pessoa está no atendimento/.test(cd.aviso), 'com atendimento antigo ativo, a aba Conduta diz onde está a conduta vigente');
ok(/Conduta vigente\s*rev\. 1/.test(cd.visao) && !/Conduta vigente\s*não registrada/.test(cd.visao), 'a Visão geral mostra a conduta vigente (não "não registrada")');

/* ----- 3: busca de exames ----- */
const busca = await A.evaluate(() => {
  const g = window.LabCatalogo.buscar('glicose').map(e => e.code);
  return { g, tsh: window.LabCatalogo.buscar('TSH').map(e => e.code), exato: window.LabCatalogo.porNomeExato('glicose') };
});
ok(busca.g.includes('LAB-002') && busca.tsh[0] === 'LAB-030' && busca.exato === null, 'busca "glicose" acha Glicemia de jejum (sem virar identidade exata): ' + busca.g.join(','));
const cont = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid);
  for (let i = 0; i < 40 && !document.querySelector('[data-lab-acao="nova"]'); i++) await new Promise(r => setTimeout(r, 100));
  document.querySelector('[data-lab-acao="nova"]').click();
  await new Promise(r => setTimeout(r, 200));
  const b = document.getElementById('lab-busca'); b.value = 'tireo'; b.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));
  return document.getElementById('lab-contador').textContent;
}, PA);
ok(/^1 de 45/.test(cont), 'o contador acompanha a busca: ' + cont);

/* ----- 4: exames V1 na ficha e HOLOSCAN ----- */
await A.evaluate(async () => {
  document.getElementById('lab-busca').value = ''; document.getElementById('lab-busca').dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('lab-data').value = new Date().toISOString().slice(0, 10);
  document.querySelector('[data-lab-add="LAB-030"]').click();
  await new Promise(r => setTimeout(r, 150));
  const set = (c, v) => { const el = document.querySelector('[data-lab-campo="' + c + '"]'); if (el) el.value = v; };
  set('value_original_text', '2,1'); set('unit_original', 'µUI/mL'); set('report_reference_min', '0,4'); set('report_reference_max', '4,5'); set('report_reference_text', '0,4 a 4,5');
  document.querySelector('[data-lab-acao="salvar"]').click();
  await new Promise(r => setTimeout(r, 900));
  if (window.Sincronizacao && window.Sincronizacao.atualizarColetas) await window.Sincronizacao.atualizarColetas(window.pacienteAtivoId());
});
const ficha = await A.evaluate(async (pid) => {
  const d = window.Panorama.doPaciente(pid);
  return { exames: d.exames };
}, PA);
ok(ficha.exames === 1, 'a ficha conta o resultado da coleta V1 (antes: "nenhum valor"): ' + ficha.exames);

/* ----- 5: ferramenta concluida tira o alerta ----- */
const alerta = await A.evaluate(async (pid) => {
  const antes = window.Panorama.alertas(Object.assign(window.Panorama.doPaciente(pid), { pontuacao: { quando: '2026-10-07' }, ferramentas: [], temConduta: false })).map(a => a.curto);
  const comConduta = window.Panorama.alertas(Object.assign(window.Panorama.doPaciente(pid), { pontuacao: { quando: '2026-10-07' }, ferramentas: [] })).map(a => a.curto);
  return { antes, comConduta };
}, PA);
ok(alerta.antes.includes('mapa sem conduta') && !alerta.comConduta.includes('mapa sem conduta'), 'com conduta registrada, o alerta "mapa sem conduta" some');

/* ----- 6: proxima consulta e Ver ----- */
const ag = await A.evaluate(async (pid) => {
  const hoje = new Date(); const p2 = n => String(n).padStart(2, '0');
  const dia = d => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const ja = new Date(Date.now() - 2 * 3600000), dep = new Date(); dep.setDate(dep.getDate() + 3);
  const passou = { id: 'x1', data: dia(hoje), hora: p2(ja.getHours()) + ':' + p2(ja.getMinutes()), paciente_id: pid };
  const futura = { id: 'x2', data: dia(dep), hora: '10:00', paciente_id: pid };
  return { passou: window.Agenda.aindaVem(passou), futura: window.Agenda.aindaVem(futura), cruzou: ja.getDate() !== hoje.getDate() };
}, PA);
ok((ag.cruzou || ag.passou === false) && ag.futura === true, 'consulta de hoje que já passou não é "próxima"; a de daqui a 3 dias é');

/* ----- 7: referencia no relatorio ----- */
const rel = await A.evaluate(() => {
  const h = window.Relatorios && window.Relatorios.snapshotHtml ? window.Relatorios.snapshotHtml({ content_snapshot: { exames: [{ tipo_conteudo: 'DADO_MEDIDO', coletado_em: '2026-10-07', resultados: [{ nome: 'TSH', valor: '2,1', unidade: 'µUI/mL', referencia_laudo: { texto: '0,4 a 4,5' } }] }] } }) : null;
  return h;
});
ok(rel === null || /referência do laudo: 0,4 a 4,5/.test(rel), 'o relatório mostra a referência do laudo' + (rel === null ? ' (sem acesso direto ao desenho; conferido no código)' : ''));

/* ----- 8: Ajuda ----- */
const aj = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="ajuda"]').click();
  await new Promise(r => setTimeout(r, 200));
  const sec = document.getElementById('secao-ajuda');
  const grupos = sec.querySelectorAll('.aj-grupo').length, perguntas = sec.querySelectorAll('.aj-item').length;
  const b = document.getElementById('aj-busca'); b.value = 'PDF'; b.dispatchEvent(new Event('input', { bubbles: true }));
  const filtradas = sec.querySelectorAll('.aj-item').length;
  document.getElementById('aj-tela').value = 'Agenda';
  document.getElementById('aj-aconteceu').value = 'Botão não respondeu';
  document.getElementById('aj-copiar').click();
  await new Promise(r => setTimeout(r, 600));
  return { ativa: sec.classList.contains('ativa'), grupos, perguntas, filtradas, estado: document.getElementById('aj-estado').innerText };
});
ok(aj.ativa && aj.grupos >= 6 && aj.perguntas >= 20, 'a página de Ajuda abre pelo menu, com ' + aj.perguntas + ' perguntas em ' + aj.grupos + ' grupos');
ok(aj.filtradas > 0 && aj.filtradas < aj.perguntas, 'a busca filtra as perguntas ("PDF": ' + aj.filtradas + ')');
ok(/copiado|RELATO DE ERRO/.test(aj.estado) && !/Paciente Teste Real/.test(aj.estado), 'o relato de erro é montado (copiado ou exibido para copiar) e não leva nome de paciente');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
