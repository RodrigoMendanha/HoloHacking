/**
 * RODADA 08 — ONDA 4: PACIENTE ARQUIVADO NAO RECEBE ESCRITA CLINICA
 *
 * Supabase falso (com o trigger bloquear_escrita_paciente_arquivado
 * emulado), app real.
 *
 *   1  a ficha abre, com o aviso "reative antes de registrar"
 *   2  a tela barra: HOLOSCAN, coleta, ferramenta, OQ3 — com a mensagem unica
 *   3  o SERVIDOR barra mesmo sem a tela: RPCs e escrita direta em
 *      consultations, tool_applications, documents, lab_collections
 *   4  reativar libera de novo
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const MSG = 'Paciente arquivado — reative antes de registrar novas informações.';

const srv = criarServidor();
srv.criarConta('a@holo.test', 'senha-a-123');
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
  await esperar(200);
}
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await pronto();

const P = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Arquivada';
  document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 100));
    const achou = (window.pacientesTodos() || []).find(x => x.nome === 'Paciente Arquivada');
    if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
  }
  return null;
});
await esperar(300);

/* arquiva no servidor e recarrega (como se tivesse sido arquivado noutra sessao) */
srv.tabelas.patients.find(p => p.id === P).status = 'inativo';
await A.reload({ waitUntil: 'networkidle2' });
await pronto();
await A.evaluate((pid) => window.definirPacienteAtivo(pid), P);
await esperar(200);

const contar = () => ({
  holoscan: srv.linhas('holoscan_applications').filter(x => x.patient_id === P).length,
  coletas: srv.linhas('lab_collections').filter(x => x.patient_id === P).length,
  apps: srv.linhas('tool_applications').filter(x => x.patient_id === P).length,
  consultas: srv.linhas('consultations').filter(x => x.patient_id === P).length,
  docs: srv.linhas('documents').filter(x => x.patient_id === P).length
});
const toasts = (codigo) => A.evaluate(async (codigo) => {
  const t = document.getElementById('toast');
  const vistos = [];
  const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
  obs.observe(t, { childList: true, characterData: true, subtree: true });
  t.textContent = '';
  await new Function('return (async () => {' + codigo + '})()')();
  await new Promise(r => setTimeout(r, 700));
  obs.disconnect();
  return vistos.join(' | ');
}, codigo);

/* ==================================================================== */
titulo('1. A FICHA ABRE');
/* ==================================================================== */

const ficha = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 300));
  const a = document.getElementById('fic-aviso-arquivado');
  return { arquivado: window.pacienteArquivado(pid), aviso: a ? a.textContent : '' };
}, P);
ok(ficha.arquivado && ficha.aviso === MSG, 'ficha aberta, com o aviso: "' + ficha.aviso + '"');

/* ==================================================================== */
titulo('2. A TELA BARRA');
/* ==================================================================== */

const antes = contar();
let t = await toasts(`document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('btn-salvar-holoscan').click();`);
ok(t.includes(MSG) && contar().holoscan === 0, 'Salvar HOLOSCAN: ' + t);

t = await toasts(`window.abrirFichaDe('${P}');
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 300));
  const inp = document.querySelector('#ex-corpo .ex-linha input');
  inp.value = '90'; inp.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('ex-data-coleta').value = '2026-03-20';
  document.querySelector('#ex-corpo [data-acao="conferir"]').click();`);
ok(t.includes(MSG) && contar().coletas === 0, 'Registrar coleta: ' + t);

const ferr = await A.evaluate(async () => {
  window.abrirFerramentaPorId('mapa_crencas');
  await new Promise(r => setTimeout(r, 400));
  const v = document.getElementById('vista-gen-mente');
  const c = v.querySelector('#campo-crencas');
  c.value = 'x'; c.dispatchEvent(new Event('input', { bubbles: true }));
  v.querySelector('[data-acao="concluir"]').click();
  await new Promise(r => setTimeout(r, 500));
  return v.querySelector('[data-papel="aviso"]').textContent;
});
ok(ferr === MSG && contar().apps === 0, 'Ferramenta: abre para ver, mas Concluir e barrado: "' + ferr + '"');
await A.evaluate(() => window.Sujeira && window.Sujeira.limparTudo());

t = await toasts(`document.querySelector('.nav-item[data-secao="mente"]').click();
  document.querySelector('[data-vista="vista-oq3"]').click();
  await new Promise(r => setTimeout(r, 300));
  const q = document.getElementById('oq3-quer'); q.value = 'x';
  q.dispatchEvent(new Event('input', { bubbles: true }));
  document.getElementById('btn-salvar-oq3').click();`);
ok(t.includes(MSG) && contar().apps === 0, 'Salvar OQ3: ' + t);
await A.evaluate(() => window.Sujeira && window.Sujeira.limparTudo());
ok(JSON.stringify(contar()) === JSON.stringify(antes), 'nada chegou ao servidor: ' + JSON.stringify(contar()));

/* ==================================================================== */
titulo('3. O SERVIDOR BARRA MESMO SEM A TELA');
/* ==================================================================== */

const direto = await A.evaluate(async (pid) => {
  const sb = window.supabaseClient;
  const res = [{ exame_id: 'EXA-001', valor: 1, unidade_no_momento: 'x', ideal_min_no_momento: 0,
                 ideal_max_no_momento: 2, nome_exame_no_momento: 'x', sistema_no_momento: 'metabolico' }];
  const m = (r) => (r && r.error ? r.error.message : 'GRAVOU');
  return {
    rpc_coleta: m(await sb.rpc('salvar_coleta_exames', { payload: {
      collection: { patient_id: pid, coletado_em: '2026-03-20', data_coleta_desconhecida: false }, results: res } })),
    rpc_holoscan: m(await sb.rpc('salvar_holoscan_completo', { payload: {
      application: { patient_id: pid, quando: '2026-03-20', versao_estrutura: 1, versao_bancos: 'x', indice: 1,
                     indice_maximo: 10, avaliavel: true, nota_media: 1, triada: {}, triada_com_dado: {}, cobertura: {} },
      answers: [], scores: [] } })),
    consultations: m(await sb.from('consultations').insert([{ patient_id: pid, data: '2030-01-01', hora: '09:00', tipo: 'retorno' }])),
    tool_applications: m(await sb.from('tool_applications').insert([{ patient_id: pid, ferramenta_id: 'mapa_crencas', versao_ferramenta: 'x' }])),
    documents: m(await sb.from('documents').insert([{ patient_id: pid, nome: 'x', storage_path: 'x/y.pdf' }])),
    lab_collections: m(await sb.from('lab_collections').insert([{ patient_id: pid, coletado_em: null, data_coleta_desconhecida: true }]))
  };
}, P);
Object.entries(direto).forEach(([k, v]) =>
  ok(/paciente arquivado/.test(v), k + ' recusado: ' + v));
ok(JSON.stringify(contar()) === JSON.stringify(antes), 'e nenhuma linha foi criada');

/* ==================================================================== */
titulo('4. REATIVAR LIBERA');
/* ==================================================================== */

const reativa = await A.evaluate(async (pid) => {
  const r1 = await window.supabaseClient.from('patients').update({ status: 'ativo' }).eq('id', pid);
  const r2 = await window.supabaseClient.from('tool_applications')
    .insert([{ patient_id: pid, ferramenta_id: 'mapa_crencas', versao_ferramenta: 'x' }]);
  return [r1.error ? r1.error.message : 'ok', r2.error ? r2.error.message : 'ok'];
}, P);
ok(reativa.join(',') === 'ok,ok' && contar().apps === 1, 'reativado: a escrita volta a gravar');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
