/**
 * RESULTADO → ENVIAR DIRETO NO WHATSAPP (16/10). Servidor falso, dados fictícios.
 *   W1 na ficha (aba Resultado HOLOS, versão vigente): "Enviar no WhatsApp" + "Baixar PDF" (+ Imprimir, preservado);
 *      versão substituída não oferece envio
 *   W2 celular: um clique emite o Resultado Final (uma vez só) e abre o compartilhar com o PDF ANEXADO e a mensagem do foco
 *   W3 o navegador recusou o compartilhar (o clique "expirou" enquanto o PDF era gerado): faixa "PDF pronto" com UM botão
 *      que envia o PDF anexado; depois some
 *   W4 computador: baixa o PDF e abre a conversa da paciente (wa.me com o número dela) com a mensagem; não emite de novo
 *   W5 janela bloqueada pelo navegador: a faixa traz o link da conversa (um clique abre)
 *   W6 "Baixar PDF" na ficha baixa o PDF da emissão; paciente arquivada não tem os botões; sem erro de JavaScript
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';
import { comFoco } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('w@holo.test', 'senha-w-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Whats', registro: 'CRN-1 0002', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
function pacienteComResultado(nome, tel, versoes = 1) {
  const pid = ins('patients', { nome, telefone: tel }).id;
  const eid = ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
  const hid = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: pid, encounter_id: eid, quando: new Date().toISOString().slice(0, 10) }) }).data;
  rpc('registrar_proximos_passos', { p_application_id: hid });
  const ids = [];
  for (let i = 0; i < versoes; i++) {
    const r = rpc('salvar_resultado_holos', comFoco({ payload: Object.assign({ patient_id: pid, encounter_id: eid, holoscan_application_id: hid, tool_application_ids: [], visao_paciente: { ferramentas: {} } }, ids.length ? { supersedes_id: ids[ids.length - 1] } : {}) }));
    if (r.error) throw new Error('resultado: ' + r.error.message);
    ids.push(r.data);
  }
  return { pid, ids, rid: ids[ids.length - 1] };
}
const A = pacienteComResultado('Ana Ficticia Whats', '(62) 98888-7777', 2);
const B = pacienteComResultado('Bia Ficticia Whats', '62977776666');
const Z = pacienteComResultado('Zoe Ficticia Arquivada', '62966665555');
const emissoes = (pid) => srv.linhas('holos_result_emissions').filter(x => x.patient_id === pid);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const erros = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function sessao({ celular }) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: celular ? 420 : 1366, height: 1000 });
  P.on('pageerror', e => erros.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument((celular) => {
    setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80);
    /* gerador de PDF de mentira (o real e testado em testar-pdf-paciente-final): devolve um PDF pequeno */
    window.html2pdf = () => { const w = { set: () => w, from: () => w, toContainer: () => w, then: () => w, outputPdf: () => Promise.resolve(new Blob(['%PDF-1.4 ficticio'], { type: 'application/pdf' })) }; return w; };
    window.__abertos = []; window.__bloquear = false;
    window.open = (u) => { if (window.__bloquear) return null; window.__abertos.push(String(u)); return {}; };
    window.__baixados = [];
    const cria = URL.createObjectURL; URL.createObjectURL = (b) => { window.__baixados.push(b.type); return cria.call(URL, b); };
    window.__compartilhados = []; window.__recusar = 0;
    if (celular) {
      navigator.canShare = (d) => !!(d && d.files && d.files.length);
      navigator.share = (d) => {
        if (window.__recusar > 0) { window.__recusar--; const e = new Error('precisa de um clique'); e.name = 'NotAllowedError'; return Promise.reject(e); }
        window.__compartilhados.push({ arquivos: d.files.map(f => f.name + '|' + f.type), texto: d.text }); return Promise.resolve();
      };
    } else { delete navigator.share; navigator.canShare = undefined; }
  }, celular);
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'w@holo.test'); await P.type('#login-senha', 'senha-w-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  return P;
}
async function verNaFicha(P, pid, rid) {
  await P.evaluate((pid) => window.levarParaFicha('aba:resultado-holos', pid), pid); await espera(900);
  await P.evaluate((rid) => window.ResultadoHolos.abrirResultado(rid, 'paciente'), rid); await espera(500);
}
const botoes = (P) => P.evaluate(() => [...document.querySelectorAll('.rh-ver-botoes button')].map(b => b.textContent.trim()));
const clicarRh = async (P, acao) => { await P.evaluate((a) => document.querySelector('.rh-ver-botoes [data-rh-acao="' + a + '"]').click(), acao); };
const aguardar = (P, fn, ms = 8000) => P.waitForFunction(fn, { timeout: ms }).then(() => true, () => false);

/* ---------------- celular ---------------- */
const C = await sessao({ celular: true });
await verNaFicha(C, A.pid, A.rid);
const b1 = await botoes(C);
ok(b1[0] === 'Enviar no WhatsApp' && b1.includes('Baixar PDF') && b1.includes('Imprimir ou salvar em PDF'), 'W1 versão vigente na ficha: ' + b1.join(' · '));
await verNaFicha(C, A.pid, A.ids[0]);
const b1v = await botoes(C);
ok(!b1v.includes('Enviar no WhatsApp') && b1v.includes('Imprimir ou salvar em PDF'), 'W1 versão substituída: sem envio (só Imprimir)');

await verNaFicha(C, A.pid, A.rid);
await clicarRh(C, 'whatsapp');
const w2 = await aguardar(C, () => window.__compartilhados.length === 1);
const c2 = await C.evaluate(() => ({ c: window.__compartilhados[0], secao: document.querySelector('#secao-resultado.ativa') !== null }));
ok(w2 && c2.c.arquivos.length === 1 && /\.pdf\|application\/pdf$/.test(c2.c.arquivos[0]) && /Ana/.test(c2.c.texto || ''), 'W2 celular: compartilhar abriu com o PDF anexado e a mensagem da paciente (' + (c2.c ? c2.c.arquivos[0] : '-') + ')');
ok(emissoes(A.pid).length === 1 && emissoes(A.pid)[0].holos_result_id === A.rid, 'W2 o Resultado Final foi emitido uma vez, da versão vigente');

/* W3: o navegador recusa o primeiro compartilhar */
await verNaFicha(C, B.pid, B.rid);
await C.evaluate(() => { window.__recusar = 1; window.__compartilhados = []; });
await clicarRh(C, 'whatsapp');
const faixa = await aguardar(C, () => !!document.querySelector('#rp-envio-pronto [data-rp-acao="enviar-pronto"]'));
ok(faixa && (await C.evaluate(() => window.__compartilhados.length)) === 0, 'W3 compartilhar recusado: aparece a faixa "PDF pronto" com o botão Enviar no WhatsApp');
await C.evaluate(() => document.querySelector('[data-rp-acao="enviar-pronto"]').click());
const w3 = await aguardar(C, () => window.__compartilhados.length === 1 && !document.getElementById('rp-envio-pronto'));
ok(w3 && (await C.evaluate(() => /\.pdf\|/.test(window.__compartilhados[0].arquivos[0]) && /Bia/.test(window.__compartilhados[0].texto))), 'W3 um toque na faixa envia o PDF anexado; a faixa some');

/* ---------------- computador ---------------- */
const D = await sessao({ celular: false });
await verNaFicha(D, A.pid, A.rid);
await clicarRh(D, 'whatsapp');
const w4 = await aguardar(D, () => window.__abertos.length === 1);
const d4 = await D.evaluate(() => ({ ab: window.__abertos[0], baix: window.__baixados.filter(t => t === 'application/pdf').length }));
ok(w4 && /^https:\/\/wa\.me\/5562988887777\?text=/.test(d4.ab) && /Ana/.test(decodeURIComponent(d4.ab)) && d4.baix === 1, 'W4 computador: PDF baixado e conversa da paciente aberta com a mensagem (' + (d4.ab || '').slice(0, 30) + '…)');
ok(emissoes(A.pid).length === 1, 'W4 não emitiu de novo (a emissão da versão vigente é reaproveitada)');

/* W5: janela bloqueada */
await verNaFicha(D, B.pid, B.rid);
await D.evaluate(() => { window.__bloquear = true; window.__abertos = []; });
await clicarRh(D, 'whatsapp');
const w5 = await aguardar(D, () => !!document.querySelector('#rp-envio-pronto a[data-rp-acao="abrir-conversa"]'));
const href = await D.evaluate(() => { const a = document.querySelector('#rp-envio-pronto a'); return a ? a.getAttribute('href') + '|' + a.target : ''; });
ok(w5 && /^https:\/\/wa\.me\/5562977776666\?text=.*\|_blank$/.test(href), 'W5 janela bloqueada: a faixa traz o link da conversa da paciente (abre em um clique)');

/* W6 */
await D.evaluate(() => { window.__bloquear = false; window.__baixados = []; });
await verNaFicha(D, A.pid, A.rid);
await clicarRh(D, 'pdf');
ok(await aguardar(D, () => window.__baixados.includes('application/pdf')), 'W6 "Baixar PDF" na ficha baixa o PDF');
q('patients', 'update', { dados: { status: 'inativo' }, filtros: [{ op: 'eq', col: 'id', val: Z.pid }] });
ok(srv.linhas('patients').filter(x => x.status === 'inativo').map(x => x.id).join() === Z.pid, 'W6 preparo: só a Zoe arquivada');
await D.evaluate(async () => { if (window.recarregarPacientes) await window.recarregarPacientes(); });
await D.reload({ waitUntil: 'networkidle2' }).catch(() => null);
await D.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 }).catch(() => null);
await verNaFicha(D, Z.pid, Z.rid);
const bz = await botoes(D);
ok(!bz.includes('Enviar no WhatsApp') && !bz.includes('Baixar PDF'), 'W6 paciente arquivada: sem Enviar no WhatsApp nem Baixar PDF (' + bz.join(' · ') + ')');
ok(!erros.length, 'W6 sem erro de JavaScript' + (erros.length ? ': ' + erros.slice(0, 3).join(' | ') : ''));

await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
