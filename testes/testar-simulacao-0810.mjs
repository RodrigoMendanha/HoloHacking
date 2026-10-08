/**
 * Consulta simulada de 08/10 (jornada completa). Supabase falso, com conta:
 *   1  relatorio, secao B: mostra as LEITURAS INTEGRADAS SALVAS (nao o confronto legado)
 *   2  relatorio, secao D e menu Documentos: o laudo do servidor aparece; falha passageira tenta de novo;
 *      servidor fora diz "nao foi possivel carregar" (nunca "nenhum documento")
 *   3  escolher o arquivo NAO envia; "Guardar" envia com nome/tipo/data; sem data pede confirmacao;
 *      o laudo novo entra na lista de laudos que podem ser ligados a uma coleta
 *   9  Conexao & Pertencimento: natureza/tipo/papel/proximidade de cada vinculo sao gravados e aparecem na tabela;
 *      a lista diz que as opcoes sao para tocar
 *   7  Conduta: cada ferramenta aparece uma vez, com o nome (nunca o id interno)
 *   6  leitura digitada antes de "Concluir aplicacao" nao some; "Registrar leitura" confirma e a confirmacao fica
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Simulada Ficticia' } }).data[0].id;
const DOC = q('documents', 'insert', { dados: { patient_id: PA, nome: 'laudo_teste.pdf', tipo: 'Exame laboratorial', data_documento: null, mime_type: 'application/pdf', tamanho_bytes: 10, storage_path: UA + '/' + PA + '/1_laudo_teste.pdf' } });
srv.tabelas.integrated_readings.push({ id: '00000000-0000-4000-8000-0000000000a1', nutritionist_id: UA, patient_id: PA, responsible: 'Nutri Teste', state: 'convergente', domain_code: 'LI-D03',
  holoscan_direction: 'attention_present', laboratory_direction: 'attention_present', professional_note: 'Triglicerideos e HDL acompanham o relato.', revision: 1, reason_codes: [], snapshot: {}, superseded_at: null, created_at: new Date().toISOString() });

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
A.on('console', m => { if (m.type() === 'error') console.log('   [console]', m.text().slice(0, 200)); });
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
const espera = ms => new Promise(r => setTimeout(r, ms));
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 600000).toISOString() });
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 250));
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 250));
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it, i) => { const b = it.querySelectorAll('.q-btn')[(i * 7) % 4]; if (!b.classList.contains('marcado')) b.click(); });
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(r => setTimeout(r, 700));
  document.getElementById('btn-salvar-holoscan').click();
  await new Promise(r => setTimeout(r, 1000));
}, PA);
ok(srv.linhas('holoscan_applications').length === 1, 'HOLOSCAN salvo no servidor');

/* ----- 1 ----- */
const relB = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:relatorio', pid);
  for (let i = 0; i < 40; i++) { const e = document.getElementById('rel-li-corpo'); if (e && !/Carregando/.test(e.textContent)) break; await new Promise(r => setTimeout(r, 100)); }
  const e = document.getElementById('rel-li-corpo');
  const nutri = e ? e.innerText : '(sem secao B)';
  const bp = document.querySelector('[data-registro="paciente"]'); if (bp) bp.click();
  for (let i = 0; i < 40; i++) { const x = document.getElementById('rel-li-corpo'); if (x && !/Carregando/.test(x.textContent)) break; await new Promise(r => setTimeout(r, 100)); }
  const pac = (document.getElementById('rel-li-corpo') || {}).innerText || '';
  const bn = document.querySelector('[data-registro="nutri"]'); if (bn) bn.click();
  return { nutri, pac };
}, PA);
ok(/Lipídico/.test(relB.nutri) && /Convergente/.test(relB.nutri) && /HDL acompanham/.test(relB.nutri) && !/Dados insuficientes/.test(relB.nutri), 'relatório, seção B: mostra a leitura salva (Lipídico convergente, com a observação) — ' + relB.nutri.slice(0, 140).replace(/\n/g, ' | '));
ok(/padrão semelhante neste domínio/.test(relB.pac) && !/Convergente/.test(relB.pac) && !/HDL acompanham/.test(relB.pac), 'versão para o paciente: o texto decidido para o paciente, sem rótulo técnico nem observação interna');

/* ----- 2 ----- */
const relD = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:relatorio', pid);
  for (let i = 0; i < 40; i++) { const e = document.getElementById('rel-documentos-corpo'); if (e && !/Carregando/.test(e.textContent)) break; await new Promise(r => setTimeout(r, 100)); }
  const e = document.getElementById('rel-documentos-corpo');
  return e ? e.textContent : '(sem secao D: ' + document.getElementById('aba-relatorio').innerText.slice(0, 200) + ')';
}, PA);
ok(/laudo_teste\.pdf/.test(relD), 'relatório, seção D: o laudo do servidor aparece — ' + relD.slice(0, 120));
const menu = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="documentos"]').click();
  await new Promise(r => setTimeout(r, 1200));
  return document.getElementById('secao-documentos').innerText;
});
ok(/laudo_teste\.pdf/.test(menu), 'menu Documentos: o laudo aparece — ' + menu.slice(0, 160).replace(/\n/g, ' | '));

const menuDeNovo = () => A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  await new Promise(r => setTimeout(r, 1700));
  document.querySelector('.nav-item[data-secao="documentos"]').click();
  await new Promise(r => setTimeout(r, 2500));
  return document.getElementById('secao-documentos').innerText;
});
srv.falhar.push({ tabela: 'documents', acao: 'select', vezes: 1 });
ok(/laudo_teste\.pdf/.test(await menuDeNovo()), 'uma falha passageira do servidor: a lista tenta de novo e o laudo aparece');
srv.falhar.push({ tabela: 'documents', acao: 'select', vezes: 50 });
const fora = await menuDeNovo();
srv.falhar.length = 0;
ok(/Não foi possível carregar os documentos do servidor/.test(fora) && !/Nenhum documento guardado/.test(fora), 'servidor fora: a tela diz que não carregou (não "nenhum documento")');

/* ----- 3 ----- */
mkdirSync('amostras', { recursive: true });
writeFileSync('amostras/laudo-sim.pdf', '%PDF-1.4\n%%EOF\n');
await A.evaluate(async (pid) => { window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 500)); }, PA);
const antes = srv.linhas('documents').length;
await (await A.$('#doc-arquivo')).uploadFile('amostras/laudo-sim.pdf');
await espera(700);
const prep = await A.evaluate(() => ({ caixa: (document.getElementById('doc-pendente') || {}).innerText || '' }));
ok(srv.linhas('documents').length === antes && /laudo-sim\.pdf/.test(prep.caixa) && /Nada foi enviado/.test(prep.caixa), 'escolher o arquivo só prepara: nada vai ao servidor antes de "Guardar"');
await A.evaluate(() => { document.getElementById('doc-nome').value = 'Laudo coleta outubro'; document.getElementById('doc-guardar').click(); });
await espera(300);
const semData = await A.evaluate(() => ({ aviso: (document.getElementById('doc-sem-data') || {}).textContent || '', botao: (document.getElementById('doc-guardar') || {}).textContent || '' }));
ok(/sem data/.test(semData.aviso) && srv.linhas('documents').length === antes, 'exame sem data: pede a data (ou "Guardar sem data") antes de enviar');
await A.evaluate(() => { const d = document.getElementById('doc-data'); d.value = '2026-10-06'; d.dispatchEvent(new Event('change', { bubbles: true })); });
await espera(150);
await A.evaluate(() => document.getElementById('doc-guardar').click());
await A.waitForFunction((n) => document.querySelectorAll('#doc-lista .doc-item').length >= n, { timeout: 8000 }, 2).catch(() => {});
await espera(1200);
const novo = srv.linhas('documents').find(d => d.nome === 'Laudo coleta outubro');
ok(!!novo && novo.data_documento === '2026-10-06' && novo.tipo === 'Exame laboratorial', 'guardado com o nome, o tipo e a data preenchidos');
const vinc = await A.evaluate((id) => (window.Laboratorio.dados().documentos || []).some(d => d.id === id), novo && novo.id);
ok(vinc, 'o laudo novo já aparece entre os laudos que podem ser ligados a uma coleta');

/* ----- 6 ----- */
const V6 = '#vista-gen-mente';
await A.evaluate(async () => { window.abrirFerramentaPorId('mapa_crencas'); await new Promise(r => setTimeout(r, 600)); });
await A.evaluate((v) => {
  const c = document.querySelector(v + ' #campo-crencas'); c.value = 'crenca de teste'; c.dispatchEvent(new Event('input', { bubbles: true }));
  const l = document.querySelector(v + ' #leit-texto'); if (l) { l.value = 'leitura escrita antes de concluir'; l.dispatchEvent(new Event('input', { bubbles: true })); }
  document.querySelector(v + ' [data-acao="concluir"]').click();
}, V6);
await espera(1200);
const l6 = await A.evaluate((v) => ({ txt: (document.querySelector(v + ' #leit-texto') || {}).value || '', aviso: (document.querySelector(v + ' [data-papel="aviso-leitura"]') || {}).textContent || '' }), V6);
ok(l6.txt === 'leitura escrita antes de concluir' && /ainda não foi registrada/.test(l6.aviso), 'a leitura digitada antes de concluir continua no campo, com aviso de que falta registrar');
await A.evaluate((v) => document.querySelector(v + ' [data-acao="revisar"]').click(), V6);
await espera(3500);
const r6 = await A.evaluate((v) => (document.querySelector(v + ' [data-papel="aviso-leitura"]') || {}).textContent || '', V6);
const app6 = srv.linhas('tool_applications').find(a => a.patient_id === PA && a.ferramenta_id === 'mapa_crencas');
ok(app6 && app6.leitura === 'leitura escrita antes de concluir' && /Leitura registrada às \d\d:\d\d/.test(r6), '"Registrar leitura" grava e a confirmação continua na tela depois de 3 s: ' + r6);

/* ----- 7 ----- */
const c7 = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:conduta', pid);
  await new Promise(r => setTimeout(r, 500));
  const nova = document.querySelector('[data-cd-acao="nova"]'); if (nova) nova.click();
  await new Promise(r => setTimeout(r, 300));
  const nomes = [...document.querySelectorAll('[data-cd-tool]')].map(i => i.parentElement.textContent.trim());
  const refs = (document.getElementById('cd-referencias') || {}).textContent || '';
  return { nomes, refs };
}, PA);
const dup = c7.nomes.filter((n, i) => c7.nomes.indexOf(n) !== i);
ok(c7.nomes.length >= 7 && !dup.length && !c7.nomes.some(n => /_v1|_/.test(n)), 'Conduta: ferramentas sem repetição e com nome: ' + c7.nomes.join(' | '));
ok(/Mapa de Crenças/.test(c7.refs) && !/mapa_crencas/.test(c7.refs), 'referências da Conduta mostram o nome da ferramenta aplicada, não o id');

/* ----- 9 ----- */
const V9 = '#vista-gen-espirito';
await A.evaluate(async () => { window.abrirFerramentaPorId('conexao_pertencimento_v1'); await new Promise(r => setTimeout(r, 600)); });
ok(await A.evaluate((v) => /toque nas opções para marcar: Natureza, Tipo, Papel percebido na mudança, Proximidade percebida, No momento/.test((document.querySelector(v + ' [data-lista="vinculos"]') || {}).textContent || ''), V9), 'a lista de vínculos diz que as opções são para tocar');
const clicar = (sel) => A.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
await A.evaluate((v) => { const e = document.querySelector(v + ' #campo-vinculos-0-rotulo'); e.value = 'irmã'; e.dispatchEvent(new Event('input', { bubbles: true })); }, V9);
const marcou = [await clicar(V9 + ' [data-campo="campo-vinculos-0-natureza"] [data-valor="pessoa"]'), await clicar(V9 + ' [data-campo="campo-vinculos-0-tipo"] [data-valor="família"]'),
  await clicar(V9 + ' [data-campo="campo-vinculos-0-papel"] [data-valor="apoia"]'), await clicar(V9 + ' [data-campo="campo-vinculos-0-proximidade"] [data-valor="próxima"]')];
await clicar(V9 + ' [data-mais-item]'); await espera(200);
await A.evaluate((v) => { const e = document.querySelector(v + ' #campo-vinculos-1-rotulo'); e.value = 'grupo de corrida'; e.dispatchEvent(new Event('input', { bubbles: true })); }, V9);
await clicar(V9 + ' [data-campo="campo-vinculos-1-natureza"] [data-valor="grupo"]');
await clicar(V9 + ' [data-acao="concluir"]'); await espera(1200);
const app9 = srv.linhas('tool_applications').find(a => a.patient_id === PA && a.ferramenta_id === 'conexao_pertencimento_v1');
const v9 = app9 && app9.respostas && app9.respostas.vinculos || [];
ok(v9.length === 2 && v9[0].natureza === 'pessoa' && v9[0].tipo === 'família' && v9[0].papel === 'apoia' && v9[0].proximidade === 'próxima' && v9[1].natureza === 'grupo', 'Conexão: natureza, tipo, papel e proximidade de cada vínculo são gravados (mesmo depois de acrescentar outro vínculo)');
const tab9 = await A.evaluate((v) => (document.querySelector(v + ' .rv-tabela') || {}).innerText || '', V9);
ok(/irmã\s+pessoa\s+família/.test(tab9) && /apoia\s+próxima/.test(tab9), 'e aparecem na tabela de vínculos');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
