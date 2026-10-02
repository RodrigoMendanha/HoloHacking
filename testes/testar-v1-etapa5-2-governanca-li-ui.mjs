/**
 * V1 — ETAPA 5.2 (tela): secao "Leitura Integrada — homologacao metodologica" em ?homologacao=1.
 *  - mostra package_id, version, status, hash do servidor (apos Conferir), bloqueios, Aprovacao 1 e 2
 *  - LI-V1@1 em rascunho e incompleto: "Metodologia da Leitura Integrada ainda nao definida" (nao e erro), Homologar bloqueado
 *  - nenhuma aprovacao nasce da tela; tentativa em pacote rascunho e recusada pelo servidor e mostrada como recusa
 *  - a secao do HOLOSCAN continua existindo (dupla aprovacao do HOLOSCAN intacta)
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
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
await A.goto('http://127.0.0.1:5500/?homologacao=1', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);
await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="metodologia"]').click(); await new Promise(r => setTimeout(r, 400)); });
await A.waitForFunction(() => document.querySelector('#mh-li-pacote'), { timeout: 10000 });
const liv1 = srv.linhas('integrated_reading_rule_packages').find(p => p.code === 'LI-V1');

const t0 = await A.evaluate(() => ({
  texto: document.getElementById('mh-li').innerText.replace(/\s+/g, ' '),
  hash: document.getElementById('mh-li-hash').textContent,
  indefinida: (document.getElementById('mh-li-indefinida') || {}).textContent || '',
  erroCss: !!document.querySelector('#mh-li .q-erro, #mh-li .erro'),
  homologarDisabled: document.getElementById('mh-li-homologar').disabled,
  motivo: (document.getElementById('mh-li-homologar-motivo') || {}).textContent || '',
  aprov: [...document.querySelectorAll('#mh-li-aprovacoes li')].map(l => l.textContent),
  holoscanSecao: !!document.querySelector('#metodologia-corpo .mh-topo'),
}));
ok(t0.texto.includes('Leitura Integrada — homologação metodológica') && t0.texto.includes(liv1.id) && /version: 1/.test(t0.texto) && /rascunho/.test(t0.texto), 'secao independente mostra package_id, version e status do LI-V1@1');
ok(/Metodologia da Leitura Integrada ainda não definida/.test(t0.indefinida) && !t0.erroCss, 'avisa "Metodologia da Leitura Integrada ainda não definida" como informacao, nao como erro tecnico');
ok(t0.hash === 'não conferido' && t0.homologarDisabled && /confira o hash/.test(t0.motivo), 'antes de conferir: hash nao conferido, Homologar bloqueado com motivo');
ok(t0.aprov.length === 2 && /Daniel/.test(t0.aprov[0]) && /Rodrigo/.test(t0.aprov[1]) && t0.aprov.every(a => /pendente/.test(a)), 'Aprovacao 1 (Daniel) e Aprovacao 2 (Rodrigo) pendentes');
ok(t0.holoscanSecao, 'a secao do pacote HOLOSCAN continua na mesma tela (dupla aprovacao do HOLOSCAN intacta)');

await A.evaluate(async () => { document.querySelector('[data-mh-li-acao="conferir-hash"]').click(); for (let i = 0; i < 60 && !/^[0-9a-f]{64}$/.test(document.getElementById('mh-li-hash').textContent); i++) await new Promise(r => setTimeout(r, 100)); });
const t1 = await A.evaluate(() => ({
  hash: document.getElementById('mh-li-hash').textContent,
  bloqueios: [...document.querySelectorAll('#mh-li-bloqueios code')].map(c => c.textContent),
  homologarDisabled: document.getElementById('mh-li-homologar').disabled,
  motivo: (document.getElementById('mh-li-homologar-motivo') || {}).textContent || '',
  statusAviso: (document.getElementById('mh-li-status-aviso') || {}).textContent || '',
  temForm: !!document.getElementById('mh-li-aprovar'),
}));
const hServ = srv.tratar({ op: 'rpc', uid: srv.contas['a@holo.test'].id, nome: 'li_hash_conteudo', args: { p_package_id: liv1.id } }).data;
ok(t1.hash === hServ, 'Conferir hash mostra o content_hash calculado no servidor: ' + t1.hash.slice(0, 12) + '…');
ok(t1.bloqueios.includes('sem_dominio_aprovado') && t1.bloqueios.includes('sem_regra_temporal') && t1.bloqueios.includes('sem_regra_suficiencia') && t1.bloqueios.includes('sem_regra_convergencia_divergencia'), 'bloqueios metodologicos listados: ' + t1.bloqueios.join(', '));
ok(t1.homologarDisabled && /Bloqueado/.test(t1.motivo) && /em_revisao/.test(t1.statusAviso), 'Homologar continua bloqueado; tela explica que aprovacao exige pacote em_revisao (gestao tecnica, nao botao)');
ok(t1.temForm, 'acoes Registrar Aprovacao disponiveis na tela (o servidor decide)');
await A.evaluate(async () => {
  const caixa = document.getElementById('mh-li-aprovar');
  caixa.querySelector('[data-mh-li-resp]').value = 'Daniel'; caixa.querySelector('[data-mh-li-just]').value = 'teste de tela'; caixa.querySelector('[data-mh-li-conferi]').checked = true;
  caixa.querySelector('[data-mh-li-acao="registrar-aprovacao"]').click();
  for (let i = 0; i < 60 && !/recusada|registrada/.test((document.getElementById('mh-li-estado') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 100));
});
const t2 = await A.evaluate(() => (document.getElementById('mh-li-estado') || {}).textContent || '');
ok(/recusada/.test(t2) && srv.linhas('integrated_reading_package_approvals').length === 0,   // a tela humaniza a mensagem (mensagemHumana), como na secao do HOLOSCAN
 'tentativa de Aprovacao 1 no LI-V1 (rascunho) e recusada pelo servidor e mostrada como recusa; nenhuma aprovacao criada: ' + t2.slice(0, 70));
ok(srv.linhas('integrated_reading_rule_packages').find(p => p.code === 'LI-V1').status === 'rascunho', 'LI-V1@1 continua rascunho');
ok(errosJS.length === 0, errosJS.length ? 'ERRO DE JS: ' + errosJS[0] : 'sem erro de JS');
await nav.close();
console.log('');
process.exit(falhou ? 1 : 0);
