/**
 * Laudo e so arquivo (reescrita 09/10; antes: Leitura Integrada guiada e laudo -> coleta). Supabase falso, com conta:
 *   1  o laudo ja enviado aparece na biblioteca com Abrir/Baixar/Arquivar — sem "Lancar valores deste exame" nem
 *      "valores lancados"; nenhum documento esta ligado a coleta
 *   2  a aba HOLOSCAN nao convida a lancar exame nem a Leitura Integrada; o quadro do HOLOSCAN leva ao Resultado
 *   3  "Abrir" e "Baixar" vem do Storage privado (sem link publico)
 *   4  o nome do laudo aparece so na ficha (biblioteca e Visao geral); o relatorio leva so a contagem
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Laudo Ficticio' } }).data[0].id;
const agora = () => new Date().toISOString();
const EA = q('encounters', 'insert', { dados: { patient_id: PA, occurred_at: agora(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' } }).data[0].id;
srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: agora().slice(0, 10) }) } });
// um laudo (imagem PNG de 1x1) ja enviado
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const path = UA + '/' + PA + '/1_laudo.png';
srv.tratar({ op: 'storage', uid: UA, bucket: 'patient-documents', acaoStorage: 'upload', path, b64: PNG, tipo: 'image/png' });
const DOC = q('documents', 'insert', { dados: { patient_id: PA, nome: 'laudo.png', titulo: 'Laudo de outubro', tipo: 'Exame', data_documento: '2026-10-01', observacao: 'trazido pela paciente', mime_type: 'image/png', tamanho_bytes: 68, storage_path: path } }).data[0].id;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });

/* ----- 1 ----- */
const bib = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 900));
  const it = document.querySelector('.bib-item');
  return { itens: document.querySelectorAll('.bib-item').length, titulo: it && it.querySelector('.bib-titulo').textContent, obs: it && (it.querySelector('.bib-obs') || {}).textContent,
    botoes: it ? [...it.querySelectorAll('button')].map(b => b.textContent.trim()) : [], texto: document.getElementById('aba-documentos').innerText, lancar: document.querySelectorAll('[data-lancar], [data-lab-acao]').length };
}, PA);
ok(bib.itens === 1 && bib.titulo === 'Laudo de outubro' && bib.obs === 'trazido pela paciente' && bib.botoes.join(',') === 'Abrir,Baixar,Arquivar', 'o laudo aparece na biblioteca com titulo, observacao e Abrir/Baixar/Arquivar');
ok(bib.lancar === 0 && !/Lançar valores|valores lançados|ligar a uma coleta|coleta/i.test(bib.texto), 'sem "Lancar valores deste exame", sem "valores lancados", sem coleta');
ok(srv.linhas('lab_collections').length === 0 && !srv.linhas('documents')[0].arquivado_em, 'nenhuma coleta existe; o documento continua ativo');

/* ----- 2 ----- */
const holo = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:holoscan', pid); await new Promise(r => setTimeout(r, 700));
  const aba = document.getElementById('aba-holoscan').innerText;
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 400));
  const quadro = document.querySelector('[data-res-ir="resultado"]');
  return { aba, lab: !!document.getElementById('aba-holoscan-laboratorial'), quadro: quadro ? quadro.textContent : '', chips: [...document.querySelectorAll('#aba-holoscan .fic-chip')].map(b => b.textContent) };
}, PA);
ok(!holo.lab && !/Lançar exame|Leitura Integrada|Registrar exames|laudo/i.test(holo.aba), 'a aba HOLOSCAN nao convida a lancar exame nem a Leitura Integrada');
ok(/Resultado para a paciente/.test(holo.quadro) && holo.chips.includes('Resultado para a paciente'), 'o quadro do HOLOSCAN e a aba levam ao Resultado para a paciente');

/* ----- 3 ----- */
const abrir = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 800));
  const urls = [];
  const o = window.open; window.open = (u) => { urls.push(String(u)); return {}; };
  const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { urls.push('download:' + this.download); return; } return orig.call(this); };
  document.querySelector('.bib-item [data-abrir]').click(); await new Promise(r => setTimeout(r, 900));
  document.querySelector('.bib-item [data-baixar]').click(); await new Promise(r => setTimeout(r, 900));
  window.open = o; HTMLAnchorElement.prototype.click = orig;
  return { urls };
}, PA);
ok(abrir.urls.length === 2 && abrir.urls.some(u => /^blob:/.test(u)) && abrir.urls.some(u => /^download:/.test(u)) && !abrir.urls.some(u => /http.*(public|sign)/.test(u)), 'Abrir e Baixar usam o arquivo baixado do Storage privado (blob), nenhum link publico: ' + abrir.urls.map(u => u.slice(0, 14)).join(' | '));

/* ----- 4 ----- */
const onde = await A.evaluate(async (pid) => {
  const out = {};
  for (const aba of ['visao', 'relatorio', 'evolucao']) { window.levarParaFicha('aba:' + aba, pid); await new Promise(r => setTimeout(r, 700)); out[aba] = (document.getElementById('aba-' + aba) || {}).innerText || ''; }
  out.menuSemDocumentos = !document.querySelector('.nav-item[data-secao="documentos"]') && !document.getElementById('secao-documentos');
  document.querySelector('.nav-item[data-secao="resultado"]').click(); await new Promise(r => setTimeout(r, 900));
  out.resultado = document.getElementById('secao-resultado').innerText;
  return out;
}, PA);
ok(onde.menuSemDocumentos && /Laudo de outubro/.test(onde.visao), 'nao ha secao Documentos no menu (documento so na ficha); o laudo aparece nos documentos recentes da Visao geral');
ok(/1 documento\/exame armazenado/.test(onde.relatorio) && !/Laudo de outubro|laudo\.png/.test(onde.relatorio), 'o relatorio leva so a contagem (sem nome do arquivo)');
ok(!/Laudo de outubro|laudo\.png/.test(onde.evolucao) && !/Laudo de outubro|laudo\.png/.test(onde.resultado), 'Evolucao e Resultado nao mencionam o laudo');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
