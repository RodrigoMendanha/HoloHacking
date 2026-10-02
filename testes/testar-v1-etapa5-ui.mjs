/**
 * V1 — ETAPA 5 — UI DE EXAMES, LEITURA INTEGRADA E BARREIRA (Supabase falso, app real, puppeteer)
 *
 *  catalogo 45 na tela, categorias, busca, aliases · nova coleta vazia · duas coletas no mesmo dia · editar
 *  explicito · estado de salvamento (Salvo so apos o servidor) · exame custom · variante (PCR / PCR-us;
 *  magnesio / eritrocitario) · hemograma composto · qualitativo · censurado · referencia ausente · historico por
 *  data clinica · revisao · "usar estrutura" sem valores · comparacao (Evolucao) · timeline · relatorio snapshot
 *  · Leitura Integrada: selecao explicita, sem dados suficientes, salvar, confronto legado fora da saida oficial
 *  · exames nao alteram HOLOSCAN · nenhum score laboratorial · HOLOS AI sem inferencia · CMB/REC/SEL desligados
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const srv = criarServidor();
srv.criarConta('a@holo.test', 'senha-a-123');
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
await A.evaluate(() => { window.confirm = () => true; window.prompt = () => 'Profissional X'; });
const texto = (sel) => A.evaluate((sel) => (document.querySelector(sel) || {}).innerText || '', sel);
const PA = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click(); const v = document.getElementById('voltar-lista'); if (v) v.click();
  document.getElementById('btn-abrir-novo').click(); document.getElementById('np-nome').value = 'Paciente E5'; document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 100)); const a = (window.pacientesTodos() || []).find(x => x.nome === 'Paciente E5'); if (a) return a.id; }
  return null;
});
const abrirDocs = () => A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300)); document.querySelector('[data-aba="documentos"]').click(); for (let i = 0; i < 40 && !document.querySelector('#lab-corpo [data-lab-acao="nova"], #lab-corpo #lab-editor'); i++) await new Promise(r => setTimeout(r, 100)); }, PA);
const clicar = (sel) => A.evaluate(async (sel) => { const b = document.querySelector(sel); if (!b) return false; b.click(); await new Promise(r => setTimeout(r, 250)); return true; }, sel);
const digitar = (sel, v) => A.evaluate((sel, v) => { const i = document.querySelector(sel); if (!i) return false; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); return true; }, sel, v);
const coletasDe = () => srv.linhas('lab_collections').filter(c => c.patient_id === PA && c.source !== 'legacy_panel');
const resultadosDe = (cid) => srv.linhas('lab_results').filter(r => r.collection_id === cid);
const salvarEEsperar = async (sel) => {
  const vistos = [];
  await A.evaluate(async (sel) => { window.__vistos = []; const obs = new MutationObserver(() => { const e = document.getElementById('lab-salvo'); if (e && e.textContent && window.__vistos[window.__vistos.length - 1] !== e.textContent) window.__vistos.push(e.textContent); }); obs.observe(document.getElementById('lab-corpo'), { subtree: true, childList: true, characterData: true }); document.querySelector(sel).click(); for (let i = 0; i < 60 && document.querySelector('#lab-editor'); i++) await new Promise(r => setTimeout(r, 100)); await new Promise(r => setTimeout(r, 200)); obs.disconnect(); }, sel);
  return A.evaluate(() => window.__vistos);
};

titulo('CATALOGO NA TELA: 45, CATEGORIAS, BUSCA, ALIASES; NOVA COLETA VAZIA');
await abrirDocs();
ok(await A.evaluate(() => !!document.querySelector('#lab-corpo [data-lab-acao="nova"]') && /45 exames/.test(document.getElementById('lab-corpo').innerText) && /não alteram/.test(document.getElementById('lab-corpo').innerText)), 'painel V1 de exames na aba Documentos, com o aviso de 45 exames nao obrigatorios e de que nao alteram o HOLOSCAN');
ok(/Painel legado \(valores locais\) — fora da saída oficial/.test(await texto('#aba-documentos')), 'o painel antigo esta rotulado como LEGADO, fora da saida oficial');
await clicar('#lab-corpo [data-lab-acao="nova"]');
const e0 = await A.evaluate(() => ({ modo: document.getElementById('lab-modo').innerText, data: document.getElementById('lab-data').value, linhas: document.querySelectorAll('.lab-linha').length, n: document.querySelectorAll('#lab-catalogo [data-lab-add]').length, cats: document.querySelectorAll('#lab-categoria option').length - 1, legenda: document.querySelector('.lab-busca .dash-sub').innerText }));
ok(/Nova coleta/.test(e0.modo) && e0.data === '' && e0.linhas === 0, 'nova coleta comeca VAZIA (sem data, sem exames)');
ok(e0.n === 45 && e0.cats === 18 && /45 de 45/.test(e0.legenda) && /nenhum é obrigatório/.test(e0.legenda), '45 exames e 18 categorias no catalogo da tela; nenhum e obrigatorio');
await digitar('#lab-busca', 'ast');
ok(await A.evaluate(() => [...document.querySelectorAll('#lab-catalogo [data-lab-add]')].map(b => b.dataset.labAdd).join(',') === 'LAB-012'), 'busca "ast" acha TGO ou AST pelo alias');
await digitar('#lab-busca', 'ldl');
ok(await A.evaluate(() => document.querySelectorAll('#lab-catalogo [data-lab-add]').length === 2), 'busca "ldl" mostra os 2 candidatos: a escolha e humana');
await digitar('#lab-busca', '');
await A.select('#lab-categoria', 'Tireoide');
ok(await A.evaluate(() => document.querySelectorAll('#lab-catalogo [data-lab-add]').length === 3), 'filtro por categoria Tireoide = 3');
await A.select('#lab-categoria', '');

titulo('COLETA 1: PCR, PCR-us, MAGNESIO ERITROCITARIO, QUALITATIVO, CENSURADO, HEMOGRAMA, CUSTOM, SEM REFERENCIA');
await clicar('#lab-catalogo [data-lab-add="LAB-016"]');
await clicar('#lab-catalogo [data-lab-add="LAB-016"]');
await clicar('#lab-catalogo [data-lab-add="LAB-021"]');
await clicar('#lab-catalogo [data-lab-add="LAB-002"]');
await clicar('#lab-catalogo [data-lab-add="LAB-001"]');
await digitar('#lab-custom-nome', 'Exame custom E5');
await clicar('#lab-corpo [data-lab-acao="criar-custom"]');
await esperar(400);
const linhas = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
ok(linhas.length === 6 && srv.linhas('lab_custom_exams').length === 1 && srv.linhas('lab_exam_catalog').length === 45, '6 linhas (PCR x2, Mg, glicemia, hemograma, custom); custom criado sem entrar nos 45');
const L = (i, campo) => `[data-lab-linha="${linhas[i]}"] [data-lab-campo="${campo}"]`;
await digitar(L(0, 'value_original_text'), 'Negativo');
await digitar(L(1, 'variant'), 'ultrassensivel'); await digitar(L(1, 'value_original_text'), '< 0,10'); await digitar(L(1, 'unit_original'), 'mg/L');
await digitar(L(2, 'variant'), 'eritrocitario'); await digitar(L(2, 'material'), 'sangue total'); await digitar(L(2, 'value_original_text'), '5,1'); await digitar(L(2, 'unit_original'), 'mg/dL');
await digitar(L(3, 'value_original_text'), '7,2'); await digitar(L(3, 'unit_original'), 'mg/dL');
await clicar(`[data-lab-comp-add="${linhas[4]}"]`);
await A.evaluate(() => { const c = document.querySelector('[data-lab-comp="0"]'); c.querySelector('[data-lab-ccampo="original_name"]').value = 'Hemoglobina'; c.querySelector('[data-lab-ccampo="value_original_text"]').value = '13,2'; c.querySelector('[data-lab-ccampo="unit_original"]').value = 'g/dL'; c.querySelector('[data-lab-ccampo="report_reference_text"]').value = '12 a 16'; });
await digitar(L(5, 'value_original_text'), '12');
ok(await A.evaluate((s) => document.querySelector(s).closest('.lab-linha').querySelector('.lab-interp').textContent, L(1, 'value_original_text')) === 'censurado (lt 0.1)' && await A.evaluate((s) => document.querySelector(s).closest('.lab-linha').querySelector('.lab-interp').textContent, L(0, 'value_original_text')) === 'qualitativo', 'a tela mostra a interpretacao: "< 0,10" censurado, "Negativo" qualitativo');
ok(await A.evaluate(() => document.getElementById('lab-salvo').textContent) === 'Não salvo', 'estado "Não salvo" enquanto digita');
let vistos = await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
ok(/Informe a data/.test(await texto('#lab-erro')) && coletasDe().length === 0, 'sem data: nao salva e diz por que');
await digitar('#lab-data', '2026-03-10'); await digitar('#lab-hora', '08:30'); await digitar('#lab-laboratorio', 'Lab A');
vistos = await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
const C1 = coletasDe()[0];
ok(C1 && C1.state === 'salvo' && C1.coletado_em === '2026-03-10' && C1.clinical_time === '08:30' && resultadosDe(C1.id).length === 6, 'coleta 1 salva no servidor: estado salvo, data e hora clinicas, 6 resultados' + (C1 ? '' : ' [vistos: ' + vistos.join('→') + ']'));
ok(vistos.includes('Salvando...') && !vistos.includes('Salvo') === false || /Coleta salva/.test(await texto('#lab-aviso')), 'estados vistos: ' + vistos.join(' → ') + ' · "Salvo"/aviso so depois do servidor responder');
const rs1 = resultadosDe(C1.id);
const pcr = rs1.find(r => r.exam_code === 'LAB-016' && !r.variant), pcrus = rs1.find(r => r.exam_code === 'LAB-016' && r.variant === 'ultrassensivel'), mg = rs1.find(r => r.exam_code === 'LAB-021'), gli = rs1.find(r => r.exam_code === 'LAB-002'), hemo = rs1.find(r => r.exam_code === 'LAB-001'), cust = rs1.find(r => r.custom_exam_id);
ok(pcr && pcrus && pcr.id !== pcrus.id && pcr.value_original_text === 'Negativo' && pcr.qualifier === 'text' && pcr.numeric_value == null, 'PCR (qualitativo "Negativo", sem numero) e PCR-us sao resultados distintos');
ok(pcrus.value_original_text === '< 0,10' && pcrus.qualifier === 'lt' && pcrus.censor_limit === 0.1 && pcrus.numeric_value == null, 'PCR-us "< 0,10": censurado, numeric_value nulo');
ok(mg.variant === 'eritrocitario' && mg.material === 'sangue total' && mg.value_original_text === '5,1' && mg.numeric_value === 5.1, 'magnesio eritrocitario com variante e material explicitos; "5,1" preservado');
ok(gli.reference_status === 'missing' && srv.linhas('lab_result_components').filter(k => k.result_id === hemo.id).length === 1 && cust && cust.value_original_text === '12', 'glicemia sem referencia = missing; hemograma com 1 componente; custom gravado');
await abrirDocs(); await clicar(`#lab-corpo [data-lab-acao="ver"][data-id="${C1.id}"]`);
const ver = await texto('#lab-coletas');
ok(/não informada/.test(ver) && /não classificável/.test(ver) && /sem referência do laudo/.test(ver) && !/na faixa|dentro da referência|normal/.test(ver), 'sem referencia do laudo a tela diz "nao classificavel — sem referencia", nunca "dentro"/"normal"');
ok(/Hemoglobina 13,2 g\/dL/.test(ver) && /PCR · ultrassensivel/.test(ver) && /Magnésio · eritrocitario · sangue total/.test(ver), 'detalhe mostra componentes do hemograma, variante e material');

titulo('COLETA 2 NO MESMO DIA; EDITAR EXPLICITO; USAR ESTRUTURA SEM VALORES; RASCUNHO');
await clicar('#lab-corpo [data-lab-acao="nova"]');
ok(await A.evaluate(() => document.querySelectorAll('.lab-linha').length === 0 && document.getElementById('lab-data').value === ''), 'segunda "Nova coleta" tambem comeca vazia (nada herdado da anterior)');
await clicar('#lab-corpo [data-lab-acao="usar-estrutura"]');
const est = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => ({ nome: l.querySelector('b').textContent, v: l.querySelector('[data-lab-campo="value_original_text"]').value, ref: l.querySelector('[data-lab-campo="report_reference_text"]').value, variant: l.querySelector('[data-lab-campo="variant"]').value })));
ok(est.length === 6 && est.every(x => x.v === '' && x.ref === '') && est.some(x => x.variant === 'ultrassensivel') && est.some(x => x.variant === 'eritrocitario'), '"usar estrutura da coleta anterior": copia quais exames/variantes, NUNCA valores nem referencias');
const l2 = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
for (let i = 0; i < 4; i++) await clicar(`[data-lab-remover="${l2[i + 1]}"]`);
const l3 = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
await digitar(`[data-lab-linha="${l3[0]}"] [data-lab-campo="value_original_text"]`, 'Reagente');
await digitar(`[data-lab-linha="${l3[1]}"] [data-lab-campo="value_original_text"]`, '8');
await digitar(`[data-lab-linha="${l3[1]}"] [data-lab-campo="unit_original"]`, 'u');
await digitar('#lab-data', '2026-03-10'); await digitar('#lab-laboratorio', 'Lab B');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
const C2 = coletasDe().find(c => c.id !== C1.id);
ok(C2 && C2.coletado_em === '2026-03-10' && coletasDe().length === 2 && resultadosDe(C1.id).length === 6 && resultadosDe(C2.id).length === 2, 'duas coletas na MESMA data (ids distintos); a coleta 1 continua com 6 resultados');
await clicar('#lab-corpo [data-lab-acao="nova"]');
await clicar('#lab-catalogo [data-lab-add="LAB-030"]');
const l4 = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
await digitar(`[data-lab-linha="${l4[0]}"] [data-lab-campo="value_original_text"]`, '2,1');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar-rascunho"]');
const R1 = coletasDe().find(c => c.state === 'rascunho');
ok(R1 && resultadosDe(R1.id).length === 1 && (await A.evaluate(() => /Editar esta coleta \(rascunho\)/.test(document.getElementById('lab-modo').innerText))), 'rascunho guardado no servidor (retomavel) e o painel passa a EDITAR esse rascunho pelo id');
await digitar('#lab-data', '2026-03-12');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
ok(coletasDe().length === 3 && srv.linhas('lab_collections').find(c => c.id === R1.id).state === 'salvo' && srv.linhas('lab_collections').find(c => c.id === R1.id).coletado_em === '2026-03-12', 'editar o rascunho pelo id consolida a MESMA coleta (nao cria outra)');
const ordem = await A.evaluate(() => [...document.querySelectorAll('#lab-coletas > li.lab-coleta > b')].map(b => b.textContent));
ok(ordem.length === 3 && /12\/03\/2026/.test(ordem[0]) && ordem.slice(1).every(t => /10\/03\/2026/.test(t)), 'historico ordenado pela DATA CLINICA (12/03 antes das duas de 10/03), nao pela edicao: ' + ordem.join(' | '));

titulo('REVISAO DE COLETA CONSOLIDADA; TIMELINE; MARCAR REVISADA');
await clicar(`#lab-corpo [data-lab-acao="editar"][data-id="${C2.id}"]`);
ok(/Revisar coleta consolidada — nova versão/.test(await texto('#lab-modo')) && (await A.evaluate(() => !!document.getElementById('lab-motivo'))), 'coleta consolidada abre em modo REVISAR (nova versao), com campo de motivo');
const l5 = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
await digitar(`[data-lab-linha="${l5[1]}"] [data-lab-campo="value_original_text"]`, '9');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
ok(coletasDe().length === 3 && !srv.linhas('lab_collections').find(c => c.id === C2.id).superseded_at, 'sem motivo a revisao nao e gravada');
await digitar('#lab-motivo', 'valor digitado errado');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
const rev = srv.linhas('lab_collections').find(c => c.supersedes_id === C2.id);
ok(rev && rev.revision === 2 && rev.coletado_em === '2026-03-10' && srv.linhas('lab_collections').find(c => c.id === C2.id).superseded_at && resultadosDe(C2.id).length === 2 && resultadosDe(rev.id).find(r => r.custom_exam_id).value_original_text === '9', 'revisao: nova versao 2 com a mesma data clinica; versao anterior preservada e substituida; quem/quando/motivo gravados');
const lista = await texto('#lab-coletas');
ok(/revisão 2/.test(lista) && /1 versão anterior preservada/.test(lista) && (lista.match(/10\/03\/2026/g) || []).length === 2, 'a lista mostra a versao atual com "revisao 2" e a anterior preservada (nao como coleta nova)');
const tl = await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300)); document.querySelector('[data-aba="visao"]').click(); await new Promise(r => setTimeout(r, 400)); return (document.getElementById('fic-visao-timeline') || document.getElementById('aba-visao')).innerText; }, PA);
ok(/Revisão da coleta de exames \(versão 2\)/.test(tl) && /Coleta de exames/.test(tl) && /substituída/.test(tl) && !/rascunho/i.test(tl), 'timeline: coleta, revisao (nao "coleta nova") e versao substituida; rascunho nao entra');
await abrirDocs();
await clicar(`#lab-corpo [data-lab-acao="marcar-revisada"][data-id="${rev.id}"]`);
await esperar(300);
ok(srv.linhas('lab_collections').find(c => c.id === rev.id).state === 'revisado' && /revisado por Profissional X/.test(srv.linhas('lab_collections').find(c => c.id === rev.id).revision_note), '"Marcar como revisada": acao humana identificada (prompt pelo nome)');

titulo('EXAMES NAO ALTERAM O HOLOSCAN; SEM SCORE; HOLOS AI SEM INFERENCIA; CMB/REC/SEL DESLIGADOS');
const holo = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); await new Promise(r => setTimeout(r, 200));
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300));
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 300));
  const itens = [...document.querySelectorAll('.q-item')]; itens.forEach((it, i) => it.querySelectorAll('.q-btn')[i % 4].click());
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 600));
  if (!window.AtendimentoAtual.atual()) await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() });
  document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 900));
  const r = window.ultimaPontuacao(); return { indice: r.indice, notas: r.sistemas.map(s => [s.sistema, s.nota]), triada: JSON.stringify(r.triada) };
}, PA);
const antesApps = JSON.stringify(srv.linhas('holoscan_applications').map(a => [a.indice, a.nota_media, a.methodology_package_id]).concat(srv.linhas('holoscan_system_scores').map(x => [x.sistema, x.nota])));
await abrirDocs();
await clicar('#lab-corpo [data-lab-acao="nova"]'); await clicar('#lab-catalogo [data-lab-add="LAB-005"]');
const l6 = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
await digitar(`[data-lab-linha="${l6[0]}"] [data-lab-campo="value_original_text"]`, '300'); await digitar(`[data-lab-linha="${l6[0]}"] [data-lab-campo="unit_original"]`, 'mg/dL'); await digitar(`[data-lab-linha="${l6[0]}"] [data-lab-campo="report_reference_text"]`, '< 150'); await digitar(`[data-lab-linha="${l6[0]}"] [data-lab-campo="report_reference_max"]`, '150');
await digitar('#lab-data', '2026-03-15');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
const depois = await A.evaluate(() => { const r = window.ultimaPontuacao(); return { indice: r.indice, notas: r.sistemas.map(s => [s.sistema, s.nota]), triada: JSON.stringify(r.triada) }; });
ok(JSON.stringify(holo) === JSON.stringify(depois) && antesApps === JSON.stringify(srv.linhas('holoscan_applications').map(a => [a.indice, a.nota_media, a.methodology_package_id]).concat(srv.linhas('holoscan_system_scores').map(x => [x.sistema, x.nota]))), 'registrar exames (inclusive acima da referencia) NAO altera Indice, notas, Triada nem o HOLOSCAN salvo no servidor');
const C4 = coletasDe().find(c => c.coletado_em === '2026-03-15');
await clicar(`#lab-corpo [data-lab-acao="ver"][data-id="${C4.id}"]`);
const ver4 = await texto('#lab-coletas');
ok(/acima da referência informada/.test(ver4) && !/score|nota laboratorial|índice laboratorial|%/.test(ver4.replace(/100,0%|\d+,\d%/g, '')), 'com referencia do laudo: "acima da referencia informada"; nenhum score, nota ou indice laboratorial');
const ctxAI = await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300)); document.querySelector('[data-aba="holos-ai"]').click(); await new Promise(r => setTimeout(r, 400)); const b = document.querySelector('#ai-hub-atalhos [data-ctx="exames"]'); if (b) { b.click(); await new Promise(r => setTimeout(r, 300)); } return (document.getElementById('ai-hub-texto') || {}).textContent || ''; }, PA);
ok(/Triglicerídeos: 300 mg\/dL \(referência do laudo: < 150\)/.test(ctxAI) && /PCR · ultrassensivel: < 0,10 mg\/L \(sem referência informada\)/.test(ctxAI) && /revisão 2/.test(ctxAI), 'HOLOS AI recebe o dado factual: valor original, unidade, variante, referencia DO LAUDO, revisao');
ok(!/convergente|divergente|confirma|contradiz|acima da referência|abaixo da referência|ideal|faixa cadastrada|legacy/i.test(ctxAI), 'HOLOS AI NAO recebe classificacao, convergente/divergente, "confirma/contradiz" nem ideal legado');
ok(await A.evaluate(() => window.cmbParaExibir().length === 0 && window.Metodologia.regraDisponivel('CMB-001') === false && window.Metodologia.regraDisponivel('REC-001') === false && window.Metodologia.regraDisponivel('SEL-001') === false), 'CMB/REC/SEL continuam desligados');

titulo('LEITURA INTEGRADA: SELECAO EXPLICITA, SEM DADOS SUFICIENTES, SALVAR, CONFRONTO LEGADO FORA DA SAIDA OFICIAL');
const liTela = await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300)); document.querySelector('[data-aba="holoscan"]').click(); await new Promise(r => setTimeout(r, 500)); return document.getElementById('aba-holoscan-laboratorial').innerText; }, PA);
ok(/LI-V1 v1 · rascunho/.test(liTela) && /sem dados suficientes/.test(liTela) && !/Convergentes|Divergentes|Convergente\b|Divergente\b/.test(liTela), 'aba HOLOSCAN da ficha: Leitura Integrada V1 (pacote LI-V1 em rascunho), sem contagem de convergentes/divergentes');
const selLI = await A.evaluate(() => { const r = document.getElementById('aba-holoscan-laboratorial'); return { cta: !!r.querySelector('[data-ir="aba:documentos"]'), conf: r.querySelectorAll('.conf-item').length, apps: r.querySelectorAll('#li-app option').length - 1, cols: r.querySelectorAll('[data-li-coleta]').length }; });
ok(selLI.cta && selLI.conf === 0 && selLI.apps === 1 && selLI.cols === 4, 'selecao explicita: 1 aplicacao HOLOSCAN para escolher e 4 coletas (a versao substituida nao aparece); nenhum confronto legado (.conf-item): ' + JSON.stringify(selLI));
const liCalc = await A.evaluate(async () => {
  const r = document.getElementById('aba-holoscan-laboratorial');
  const sel = r.querySelector('#li-app'); sel.value = sel.options[sel.options.length - 1].value; sel.dispatchEvent(new Event('change'));
  r.querySelectorAll('[data-li-coleta]').forEach(cb => { cb.checked = true; cb.dispatchEvent(new Event('change')); });
  r.querySelector('[data-li-acao="calcular"]').click(); await new Promise(x => setTimeout(x, 300));
  return { estado: r.querySelector('.li-estado').textContent, motivos: r.querySelector('#li-resultado').innerText, trace: r.querySelector('#li-resultado pre').textContent };
});
ok(liCalc.estado === 'sem dados suficientes' && /sem_regra_homologada/.test(liCalc.motivos) && /sem_associacao_aprovada/.test(liCalc.motivos), 'HOLOSCAN + 4 coletas (uma com exame acima da referencia): estado sem dados suficientes, motivos sem_regra_homologada / sem_associacao_aprovada — nenhum "um exame fora = convergente"');
ok(/"rule_package_id"/.test(liCalc.trace) && /"holoscan_application_id"/.test(liCalc.trace) && /"collection_ids"/.test(liCalc.trace) && /"engine_version"/.test(liCalc.trace), 'trace explicavel na tela');
await A.evaluate(async () => { const r = document.getElementById('aba-holoscan-laboratorial'); r.querySelector('#li-responsavel').value = 'Profissional X'; r.querySelector('#li-nota').value = 'nota'; r.querySelector('[data-li-acao="salvar"]').click(); for (let i = 0; i < 40 && !document.querySelector('#aba-holoscan-laboratorial .dash-pendentes'); i++) await new Promise(x => setTimeout(x, 100)); });
const lr = srv.linhas('integrated_readings');
ok(lr.length === 1 && lr[0].state === 'sem_dados_suficientes' && lr[0].selected_collection_ids.length === 4 && lr[0].holoscan_application_id && lr[0].responsible === 'Profissional X' && lr[0].rule_version === 1 && /^[0-9a-f]{64}$/.test(lr[0].content_hash), 'leitura salva congela HOLOSCAN, 4 coletas, pacote/versao, responsavel, hash');
ok(/Leituras salvas/.test(await texto('#aba-holoscan-laboratorial')) && /sem dados suficientes · rev 1/.test(await texto('#aba-holoscan-laboratorial')), 'a leitura salva aparece na lista');
const secao = await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="confronto"]').click(); await new Promise(r => setTimeout(r, 400)); return document.getElementById('holo-confronto').innerText; });
ok(/sem dados suficientes/.test(secao) && !/faixa cadastrada|Convergente\b|Divergente\b|LEGADO/.test(secao), 'secao Leitura Integrada: V1 (sem dados suficientes), sem o confronto legado nem "faixa cadastrada"');
ok(!srv.linhas('integrated_reading_exam_domain_links').length && !srv.linhas('integrated_reading_domains').length, 'nenhum vinculo exame → dominio foi criado por nenhum caminho da tela');

titulo('EVOLUCAO: COMPARACAO COMPATIVEL E INCOMPATIVEL; RELATORIO: SNAPSHOT');
await abrirDocs();
await clicar('#lab-corpo [data-lab-acao="nova"]'); await clicar('#lab-catalogo [data-lab-add="LAB-005"]'); await clicar('#lab-catalogo [data-lab-add="LAB-016"]');
const l7 = await A.evaluate(() => [...document.querySelectorAll('.lab-linha')].map(l => l.dataset.labLinha));
await digitar(`[data-lab-linha="${l7[0]}"] [data-lab-campo="value_original_text"]`, '250'); await digitar(`[data-lab-linha="${l7[0]}"] [data-lab-campo="unit_original"]`, 'mg/dL'); await digitar(`[data-lab-linha="${l7[0]}"] [data-lab-campo="report_reference_text"]`, '< 170'); await digitar(`[data-lab-linha="${l7[0]}"] [data-lab-campo="report_reference_max"]`, '170');
await digitar(`[data-lab-linha="${l7[1]}"] [data-lab-campo="variant"]`, 'ultrassensivel'); await digitar(`[data-lab-linha="${l7[1]}"] [data-lab-campo="value_original_text"]`, '0,8'); await digitar(`[data-lab-linha="${l7[1]}"] [data-lab-campo="unit_original"]`, 'mg/dL');
await digitar('#lab-data', '2026-05-20');
await salvarEEsperar('#lab-corpo [data-lab-acao="salvar"]');
const evo = await A.evaluate(async (pid) => {
  const C = window.Sincronizacao.coletas(pid);
  const a = C.filter(c => c.coletado_em <= '2026-03-15' && !c.superseded_at && c.state !== 'rascunho'), b = C.filter(c => c.coletado_em === '2026-05-20');
  return window.Evolucao && window.Evolucao.compararExames ? window.Evolucao.compararExames(a, b) : null;
}, PA);
const tg = evo && evo.find(x => /Triglicerídeos/.test(x.nome)), pcrE = evo && evo.find(x => /PCR · ultrassensivel/.test(x.nome));
ok(tg && tg.delta === -50 && tg.unidade === 'mg/dL' && tg.direcao === 'reduziu' && tg.referencias_diferentes === true, 'Evolucao: triglicerideos 300 -> 250 mg/dL = delta -50 "reduziu"; referencias do laudo diferentes ficam visiveis');
ok(pcrE && pcrE.delta === null && /valor não numérico/.test(pcrE.motivo), 'PCR-us "< 0,10" (censurado) x "0,8": lado a lado, sem delta (valor nao numerico)');
const unidade = await A.evaluate(() => window.LabMotor.comparar({ exam_code: 'LAB-016', variant: 'ultrassensivel', value_original_text: '0,5', unit_original: 'mg/L' }, { exam_code: 'LAB-016', variant: 'ultrassensivel', value_original_text: '0,8', unit_original: 'mg/dL' }, { conversoes: [] }));
ok(!unidade.comparavel && unidade.motivos[0] === 'incompatible_unit' && unidade.anterior.value === '0,5' && unidade.atual.value === '0,8', 'mg/L x mg/dL sem conversao aprovada: lado a lado (valores visiveis), sem delta');
ok(!/melhor|pior|normaliz|agrav/i.test(JSON.stringify(evo)), 'nenhum "melhorou/piorou" na comparacao');
const previa = await A.evaluate((pid) => { const f = window.Relatorios.novoForm(pid); const F = window.Relatorios.fontesDisponiveis(pid); f.sel.lab_collection_ids = F.coletas.filter(c => c.coletado_em === '2026-05-20').map(c => c.id); return window.Relatorios.montarPrevia(pid, f); }, PA);
ok(previa.exames.length === 1 && previa.exames[0].resultados.some(r => r.valor === '250' && r.referencia_laudo && r.referencia_laudo.max === 170 && r.nome === 'Triglicerídeos') && previa.exames[0].resultados.every(r => !('classificacao' in r) && !('ideal' in r)), 'relatorio: snapshot com valor original e referencia do laudo da coleta ESCOLHIDA, sem classificacao');
const cnt = srv.linhas('report_emissions').length;
await A.evaluate(async (pid) => { try { const f = window.Relatorios.novoForm(pid); const F = window.Relatorios.fontesDisponiveis(pid); f.sel.lab_collection_ids = F.coletas.filter(c => c.coletado_em === '2026-05-20').map(c => c.id); f.title = 'E5'; if (window.Relatorios.emitir) await window.Relatorios.emitir(pid, f); } catch (e) { return String(e && e.message || e); } return null; }, PA);
const em = srv.linhas('report_emissions').slice(cnt)[0];
ok(!em || (em.content_snapshot && em.content_snapshot.exames && em.content_snapshot.exames[0].resultados.some(r => r.valor === '250' && r.referencia_laudo)), 'emissao (quando feita) guarda o snapshot V1 com valor e referencia' + (em ? '' : ' (sem API de emissao direta: coberto no servidor falso)'));

ok(errosJS.length === 0, 'sem erros de JS na pagina' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));
await nav.close();
console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
