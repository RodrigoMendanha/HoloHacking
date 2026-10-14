/**
 * ISOLAMENTO A/B DO RESULTADO (auditoria Cowork 14/10, P0): nada da paciente A aparece, e nada é gerado
 * nem enviado com os dados dela, quando a paciente selecionada passa a ser B. Servidor falso, dados fictícios.
 *   A  Resultado HOLOS (template 5, foco confirmado) + Resultado Final emitido
 *   B  sem Resultado HOLOS
 *   C  Resultado HOLOS salvo, sem emissão (prévia)
 * Cobre: DOM da página Resultado, emissão em memória, PDF, WhatsApp, Imprimir, troca com a seção fechada,
 *        troca no meio do carregamento, aba Resultado HOLOS da ficha e Pacote Holos IA.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';
import { comFoco } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Iso', registro: 'CRN-1 0001', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
function pacienteComResultado(nome, tel) {
  const pid = ins('patients', { nome, telefone: tel }).id;
  const eid = ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
  const hid = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: pid, encounter_id: eid, quando: new Date().toISOString().slice(0, 10) }) }).data;
  rpc('registrar_proximos_passos', { p_application_id: hid });
  const r = rpc('salvar_resultado_holos', comFoco({ payload: { patient_id: pid, encounter_id: eid, holoscan_application_id: hid, tool_application_ids: [], visao_paciente: { ferramentas: {} } } }));
  if (r.error) throw new Error('resultado: ' + r.error.message);
  return { pid, rid: r.data };
}
const A = pacienteComResultado('Alfa Ficticia Isolamento', '62911110000');
const emA = rpc('emitir_resultado_final', { payload: { holos_result_id: A.rid, imagens: {} } });
const PB = ins('patients', { nome: 'Beta Ficticia Isolamento', telefone: '62922220000' }).id;
const C = pacienteComResultado('Gama Ficticia Isolamento', '62933330000');
ok(!emA.error, 'preparo: A com Resultado Final emitido; B sem resultado; C com resultado salvo e sem emissão');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1366, height: 1000 });
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(() => {
  window.__abertos = []; window.open = (u) => { window.__abertos.push(String(u)); return {}; };
  window.__baixados = 0; const orig = URL.createObjectURL; URL.createObjectURL = (b) => { window.__baixados++; return orig.call(URL, b); };
  window.__impressoes = 0; window.print = () => { window.__impressoes++; };
});

const estado = () => P.evaluate(() => {
  const corpo = document.getElementById('resultado-pagina-corpo');
  const em = window.ResultadoPagina.emissaoAtual();
  return { txt: corpo ? corpo.innerText : '', doc: !!document.getElementById('rp-doc'), emPid: em ? em.patient_id : null, emId: em ? em.id : null,
    pdfBtn: !!document.querySelector('[data-rp-acao="pdf"]'), whatsBtn: !!document.querySelector('[data-rp-acao="whatsapp"]'), dono: corpo ? corpo.dataset.rpPid || null : null };
});
const esperarDesenho = () => P.evaluate(async () => { for (let i = 0; i < 80; i++) { if (!document.getElementById('rp-carregando')) break; await new Promise(r => setTimeout(r, 100)); } await new Promise(r => setTimeout(r, 200)); });

/* 1. A emitida na tela */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('resultado'); }, A.pid);
await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await esperarDesenho();
const e1 = await estado();
ok(e1.doc && /Alfa/.test(e1.txt) && e1.emPid === A.pid && e1.dono === A.pid && e1.pdfBtn, 'A: Resultado Final emitido na tela (documento, emissão e botões de A)');

/* 2. troca para B com a página aberta */
await P.evaluate((pid) => window.definirPacienteAtivo(pid), PB); await esperarDesenho();
const e2 = await estado();
ok(!e2.doc && !/Alfa/.test(e2.txt) && /Beta/.test(e2.txt) && e2.emPid === null && !e2.pdfBtn && !e2.whatsBtn && e2.dono !== A.pid,
  'B (página aberta): nenhum texto, documento, emissão ou botão de A; mostra o estado vazio de B');
const ac2 = await P.evaluate(async () => {
  const pdf = await window.ResultadoPagina.gerarPdf().then(() => 'gerou', e => e.message);
  window.__abertos = []; const w = await window.ResultadoPagina.enviarWhatsApp();
  window.ResultadoPagina.imprimir();
  return { pdf, w: w && w.modo, abertos: window.__abertos.slice(), imp: window.__impressoes, imp2: !!document.getElementById('rp-impressao') && /Alfa/.test(document.getElementById('rp-impressao').innerText) };
});
ok(ac2.pdf !== 'gerou' && ac2.w === 'bloqueado' && ac2.abertos.length === 0 && !ac2.imp2, 'B: PDF, WhatsApp e Imprimir não saem com dados de A (' + ac2.pdf + ')');

/* 3. A de novo, depois C (resultado sem emissão): a emissão de A não vira a de C */
await P.evaluate((pid) => window.definirPacienteAtivo(pid), A.pid); await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await esperarDesenho();
const volta = await estado();
ok(volta.doc && /Alfa/.test(volta.txt) && volta.emPid === A.pid && volta.emId === emA.data.id, 'de volta a A: o Resultado Final de A reaparece, lido de novo do servidor (emissão ' + (volta.emId === emA.data.id ? 'a mesma' : 'outra') + ')');
const storage = await P.evaluate((rid, emid) => { const tudo = []; for (const st of [localStorage, sessionStorage]) for (let i = 0; i < st.length; i++) { const k = st.key(i); tudo.push(k + '=' + st.getItem(k)); } const j = tudo.join('\n'); return { rid: j.includes(rid), em: j.includes(emid) }; }, A.rid, emA.data.id);
ok(!storage.rid && !storage.em, 'storage do navegador sem o Resultado nem a emissão de A (nada de Resultado fica guardado fora do servidor)');
await P.evaluate((pid) => window.definirPacienteAtivo(pid), C.pid); await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await esperarDesenho();
const e3 = await estado();
const ac3 = await P.evaluate(async () => ({ pdf: await window.ResultadoPagina.gerarPdf().then(() => 'gerou', e => e.message), w: window.__abertos.length }));
ok(/Gama/.test(e3.txt) && !/Alfa/.test(e3.txt) && e3.emPid === null && e3.dono === C.pid && /PRÉVIA/.test(e3.txt), 'C: prévia de C, sem a emissão nem o nome de A');
ok(ac3.pdf !== 'gerou' && /Resultado Final/.test(ac3.pdf), 'C: PDF bloqueado até emitir o Resultado Final de C (nunca o PDF de A)');

/* 4. troca com a página fechada: ao voltar, nada de A aparece nem por um instante */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); }, A.pid); await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await esperarDesenho();
await P.evaluate(() => window.irParaSecao('dashboard'));
await P.evaluate((pid) => window.definirPacienteAtivo(pid), PB);
const e4 = await P.evaluate(() => { const c = document.getElementById('resultado-pagina-corpo'); return { txt: c ? c.innerText : '', em: window.ResultadoPagina.emissaoAtual() }; });
ok(!/Alfa/.test(e4.txt) && e4.em === null, 'troca com a página fechada: o conteúdo de A some da página (não reaparece ao voltar)');
await P.evaluate(() => window.irParaSecao('resultado')); await esperarDesenho();
const e4b = await estado();
ok(!/Alfa/.test(e4b.txt) && /Beta/.test(e4b.txt) && !e4b.doc, 'ao voltar ao Resultado com B: só o estado de B');

/* 5. troca no meio do carregamento: o carregamento atrasado de A não desenha por cima de B */
await P.evaluate(async (a, b) => {
  const orig = window.ResultadoHolos.carregar;
  window.ResultadoHolos.carregar = (pid) => new Promise(r => setTimeout(() => r(orig(pid)), pid === a ? 700 : 0));
  window.definirPacienteAtivo(a); window.ResultadoPagina.desenhar();
  await new Promise(r => setTimeout(r, 50)); window.definirPacienteAtivo(b);
  await new Promise(r => setTimeout(r, 1500)); window.ResultadoHolos.carregar = orig;
}, A.pid, PB);
const e5 = await estado();
ok(!/Alfa/.test(e5.txt) && !e5.doc && e5.emPid === null, 'troca durante o carregamento: o desenho atrasado de A é descartado');

/* 6. ficha de B: aba Resultado HOLOS e Pacote Holos IA sem nada de A */
const e6 = await P.evaluate(async (b, rA) => {
  window.levarParaFicha('aba:resultado-holos', b);
  for (let i = 0; i < 60; i++) { const x = document.getElementById('aba-resultado-holos'); if (x && x.innerText.length > 20) break; await new Promise(r => setTimeout(r, 100)); }
  const aba = document.getElementById('aba-resultado-holos').innerText;
  const temVersaoA = !!document.querySelector('[data-rh-id="' + rA + '"]');
  const lista = window.ResultadoHolos.doPaciente(b).length;
  let pac = '';
  if (window.HolosAIPonte && window.HolosAIPonte.montarPacote) { try { pac = JSON.stringify(window.HolosAIPonte.montarPacote(b, null)); } catch (e) { pac = 'ERRO ' + e.message; } }
  return { aba, temVersaoA, lista, pac };
}, PB, A.rid);
ok(!/Alfa/.test(e6.aba) && !e6.temVersaoA && e6.lista === 0, 'ficha de B, aba Resultado HOLOS: nenhuma versão de A');
ok(e6.pac.length > 50 && !/^ERRO/.test(e6.pac) && !/Alfa|62911110000/.test(e6.pac), 'Pacote Holos IA de B: nada de A');
ok(errosJS.length === 0, 'sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');

await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
