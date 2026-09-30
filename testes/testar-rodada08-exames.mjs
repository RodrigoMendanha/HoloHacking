/**
 * RODADA 08 — ONDA 2: IDENTIDADE DA COLETA E SINCRONIZACAO DOS EXAMES
 *
 * Supabase falso (supabase-falso.mjs), app real, painel de exames da ficha.
 *
 *   1  nova coleta comeca VAZIA — nao herda os valores da anterior
 *   2  a coleta nova grava so o que foi digitado nela
 *   3  "Nova coleta" numa data que ja tem coleta e recusada (tela e servidor)
 *   4  servidor recusa data futura (RPC e escrita direta)
 *   5  "Editar coleta existente" carrega os valores DAQUELA coleta e troca so ela
 *   6  estados: Não salvo / Salvando... / Salvo / Não sincronizado — "Salvo"
 *      nunca aparece antes da confirmacao; "Tentar de novo" completa o envio
 *   7  "Excluir coleta" remove a coleta e os resultados dela, e so ela
 *   8  trocar de paciente volta a "Nova coleta" vazia
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

async function pronto(p) {
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await p.evaluate(() => window.Sincronizacao.aguardar());
  await esperar(150);
  await p.evaluate(() => window.Sincronizacao.aguardar());
}
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await pronto(A);

async function cadastrar(nome) {
  return A.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const achou = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
    }
    return null;
  }, nome);
}

const P = await cadastrar('Paciente Coletas');
await pronto(A);
const EX = await A.evaluate(() => window.HOLOSCAN.listaDeExames().slice(0, 3).map(e => e.id));

async function abrirPainel(pid) {
  await A.evaluate(async (pid) => {
    window.definirPacienteAtivo(pid);
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('[data-aba="documentos"]').click();
    await new Promise(r => setTimeout(r, 300));
  }, pid);
}
const painel = () => A.evaluate(() => {
  const v = {};
  document.querySelectorAll('#ex-corpo .ex-linha').forEach(l => {
    const t = l.querySelector('input').value; if (t !== '') v[l.dataset.exame] = Number(t);
  });
  const d = document.getElementById('ex-data-coleta');
  return { valores: v, data: d.value, dataTravada: d.disabled,
           modo: (document.getElementById('ex-modo') || {}).textContent || '',
           salvo: (document.getElementById('ex-salvo') || {}).textContent || '',
           erro: (document.getElementById('ex-data-erro') || {}).textContent || '',
           coletas: document.querySelectorAll('#ex-corpo .ex-coleta').length };
});
/** digita, poe a data (se dada) e clica o botao principal; devolve os estados vistos */
async function registrar(valores, data) {
  return A.evaluate(async (valores, data) => {
    Object.keys(valores).forEach(id => {
      const inp = document.querySelector('#ex-corpo .ex-linha[data-exame="' + id + '"] input');
      inp.value = String(valores[id]); inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const d = document.getElementById('ex-data-coleta');
    if (data !== null && !d.disabled) d.value = data;
    const vistos = [];
    const alvo = document.getElementById('ex-corpo');
    const obs = new MutationObserver(() => {
      const s = document.getElementById('ex-salvo');
      if (s && s.textContent && vistos[vistos.length - 1] !== s.textContent) vistos.push(s.textContent);
    });
    obs.observe(alvo, { childList: true, characterData: true, subtree: true });
    document.querySelector('#ex-corpo [data-acao="conferir"]').click();
    await new Promise(r => setTimeout(r, 900));
    obs.disconnect();
    return vistos;
  }, valores, data);
}
const coletasDe = (pid) => srv.linhas('lab_collections').filter(c => c.patient_id === pid);
const resultadosDe = (colId) => srv.linhas('lab_results').filter(r => r.collection_id === colId);
const valoresSrv = (colId) => Object.fromEntries(resultadosDe(colId).map(r => [r.exame_id, Number(r.valor)]));
const D1 = '2026-03-20', D2 = '2026-06-10';

/* ==================================================================== */
titulo('1-2. NOVA COLETA NAO HERDA VALORES');
/* ==================================================================== */

await abrirPainel(P);
let e = await painel();
ok(/Nova coleta/.test(e.modo) && Object.keys(e.valores).length === 0 && e.data === '',
   'o painel abre em "Nova coleta", vazio e sem data: ' + e.modo.trim().slice(0, 40));

let vistos = await registrar({ [EX[0]]: 90, [EX[1]]: 5 }, D1);
e = await painel();
ok(coletasDe(P).length === 1 && Object.keys(valoresSrv(coletasDe(P)[0].id)).length === 2,
   'coleta 1 gravada no servidor com os 2 valores digitados');
ok(vistos.includes('Salvando...') && e.salvo === 'Salvo',
   'estados vistos: ' + vistos.join(' → ') + ' — termina em "Salvo"');
ok(/Editar coleta existente/.test(e.modo) && e.dataTravada && e.data === D1,
   'depois de salvar, o painel EDITA a coleta gravada (data travada em ' + e.data + ')');

await A.evaluate(() => document.querySelector('#ex-corpo [data-acao="nova-coleta"]').click());
e = await painel();
ok(/Nova coleta/.test(e.modo) && Object.keys(e.valores).length === 0 && e.data === '' && !e.dataTravada,
   '"Nova coleta": formulario VAZIO — nenhum valor da coleta anterior');

await registrar({ [EX[0]]: 80 }, D2);
const col2 = coletasDe(P).find(c => c.coletado_em === D2);
ok(coletasDe(P).length === 2 && col2 && JSON.stringify(valoresSrv(col2.id)) === JSON.stringify({ [EX[0]]: 80 }),
   'coleta 2 (' + D2 + ') tem SO o valor digitado nela: ' + JSON.stringify(col2 && valoresSrv(col2.id)));
const col1 = coletasDe(P).find(c => c.coletado_em === D1);
ok(valoresSrv(col1.id)[EX[0]] === 90 && valoresSrv(col1.id)[EX[1]] === 5,
   'e a coleta 1 continua com os valores dela');

/* ==================================================================== */
titulo('3. NOVA COLETA EM DATA QUE JA TEM COLETA');
/* ==================================================================== */

await abrirPainel(P);
vistos = await registrar({ [EX[0]]: 1 }, D1);
e = await painel();
ok(/Já existe uma coleta/.test(e.erro) && coletasDe(P).length === 2 && valoresSrv(col1.id)[EX[0]] === 90,
   'a tela recusa e nada muda no servidor: "' + e.erro + '"');
ok(!vistos.includes('Salvo'), 'nenhum "Salvo" apareceu: ' + (vistos.join(' → ') || '(nenhum estado)'));

const rpcNova = await A.evaluate(async (pid, d, eid) => {
  const r = await window.supabaseClient.rpc('salvar_coleta_exames', { payload: {
    collection: { patient_id: pid, coletado_em: d, data_coleta_desconhecida: false, modo: 'nova' },
    results: [{ exame_id: eid, valor: 1, unidade_no_momento: 'x', ideal_min_no_momento: 0,
                ideal_max_no_momento: 2, nome_exame_no_momento: 'x', sistema_no_momento: 'metabolico' }] } });
  return r.error ? r.error.message : 'sem erro';
}, P, D1, EX[0]);
ok(/coleta ja existe/.test(rpcNova) && valoresSrv(col1.id)[EX[0]] === 90,
   'o SERVIDOR tambem recusa modo "nova" numa data ocupada: ' + rpcNova);

/* ==================================================================== */
titulo('4. DATA FUTURA RECUSADA NO SERVIDOR');
/* ==================================================================== */

const futura = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
const fut = await A.evaluate(async (pid, d, eid) => {
  const r1 = await window.supabaseClient.rpc('salvar_coleta_exames', { payload: {
    collection: { patient_id: pid, coletado_em: d, data_coleta_desconhecida: false },
    results: [{ exame_id: eid, valor: 1, unidade_no_momento: 'x', ideal_min_no_momento: 0,
                ideal_max_no_momento: 2, nome_exame_no_momento: 'x', sistema_no_momento: 'metabolico' }] } });
  const r2 = await window.supabaseClient.from('lab_collections')
    .insert([{ patient_id: pid, coletado_em: d, data_coleta_desconhecida: false }]);
  return [r1.error ? r1.error.message : 'sem erro', r2.error ? r2.error.message : 'sem erro'];
}, P, futura, EX[0]);
ok(/futuro/.test(fut[0]) && /futuro/.test(fut[1]) && coletasDe(P).length === 2,
   'RPC e escrita direta com ' + futura + ' recusadas: ' + fut.join(' | '));

/* ==================================================================== */
titulo('5. EDITAR COLETA EXISTENTE');
/* ==================================================================== */

await A.evaluate((id) => document.querySelector('#ex-corpo [data-acao="editar-coleta"][data-coleta="' + id + '"]').click(), col1.id);
e = await painel();
ok(/Editar coleta existente/.test(e.modo) && e.dataTravada && e.data === D1 &&
   e.valores[EX[0]] === 90 && e.valores[EX[1]] === 5 && Object.keys(e.valores).length === 2,
   'Editar carrega os valores DAQUELA coleta, com a data travada: ' + JSON.stringify(e.valores));
await A.evaluate((eid) => {
  const inp = document.querySelector('#ex-corpo .ex-linha[data-exame="' + eid + '"] input');
  inp.value = '95'; inp.dispatchEvent(new Event('input', { bubbles: true }));
}, EX[0]);
e = await painel();
ok(e.salvo === 'Não salvo', 'alterar um valor mostra "Não salvo"');
vistos = await registrar({}, null);
ok(valoresSrv(col1.id)[EX[0]] === 95 && valoresSrv(col1.id)[EX[1]] === 5 && coletasDe(P).length === 2,
   'salvar troca SO a coleta editada (95), sem criar outra');
ok(JSON.stringify(valoresSrv(col2.id)) === JSON.stringify({ [EX[0]]: 80 }), 'e a coleta 2 nao mudou');

/* ==================================================================== */
titulo('6. FALHA NAO VIRA "SALVO"; TENTAR DE NOVO COMPLETA');
/* ==================================================================== */

await abrirPainel(P);
srv.falhar.push({ tabela: 'rpc:salvar_coleta_exames', acao: 'rpc', vezes: 1 });
vistos = await registrar({ [EX[2]]: 7 }, '2026-07-01');
e = await painel();
ok(!vistos.includes('Salvo') && /Não sincronizado/.test(e.salvo) && coletasDe(P).length === 2,
   'RPC falhou: estados ' + vistos.join(' → ') + ' — nenhum "Salvo", nada no servidor');
ok(await A.evaluate(() => !!document.querySelector('#ex-corpo [data-acao="reenviar-ex"]')),
   'e o botao "Tentar de novo" aparece');
await A.evaluate(async () => {
  document.querySelector('#ex-corpo [data-acao="reenviar-ex"]').click();
  await new Promise(r => setTimeout(r, 900));
});
e = await painel();
const col3 = coletasDe(P).find(c => c.coletado_em === '2026-07-01');
ok(col3 && JSON.stringify(valoresSrv(col3.id)) === JSON.stringify({ [EX[2]]: 7 }) && e.salvo === 'Salvo',
   '"Tentar de novo" grava a mesma coleta (mesma data, mesmos valores) e mostra "Salvo"');

/* ==================================================================== */
titulo('7. EXCLUIR COLETA');
/* ==================================================================== */

await abrirPainel(P);
const antesRes = srv.linhas('lab_results').length;
const n2 = resultadosDe(col2.id).length;
await A.evaluate(async (id) => {
  document.querySelector('#ex-corpo [data-acao="excluir-coleta"][data-coleta="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 150));
}, col2.id);
const modal = await A.evaluate(() => ({
  aberto: !document.getElementById('modal-confirmar-acao').classList.contains('hidden'),
  titulo: document.getElementById('modal-confirmar-titulo').textContent
}));
ok(modal.aberto && /Excluir coleta/.test(modal.titulo), 'pede confirmacao antes: "' + modal.titulo + '"');
await A.evaluate(async () => {
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 700));
});
ok(!coletasDe(P).some(c => c.id === col2.id) && resultadosDe(col2.id).length === 0 &&
   srv.linhas('lab_results').length === antesRes - n2,
   'a coleta e os ' + n2 + ' resultado(s) dela sairam do servidor');
ok(coletasDe(P).length === 2 && valoresSrv(col1.id)[EX[0]] === 95,
   'as outras coletas ficaram intactas');
e = await painel();
ok(e.coletas === 2, 'a lista do painel mostra as 2 que sobraram');

/* ==================================================================== */
titulo('8. TROCAR DE PACIENTE');
/* ==================================================================== */

await A.evaluate((id) => document.querySelector('#ex-corpo [data-acao="editar-coleta"][data-coleta="' + id + '"]').click(), col1.id);
const Q = await cadastrar('Paciente Outra');
await pronto(A);
await abrirPainel(Q);
e = await painel();
ok(/Nova coleta/.test(e.modo) && Object.keys(e.valores).length === 0 && e.data === '' && e.coletas === 0,
   'outro paciente: "Nova coleta" vazia, sem as coletas do anterior');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));

await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
