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
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: UA, scope: 'integrated_reading', approval_stage: 1, display_name: 'Daniel' });   // Etapa 5.3
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
// Etapa 6.0 (mudanca legitima de contrato, documentada em docs/v1/ETAPA6-LEITURA-INTEGRADA.md): a tela de homologacao passa a
// selecionar a versao mais recente de LI-V1 — o candidato LI-V1@2 (em_revisao, 7 dominios / 47 vinculos, completude
// publicavel, 0 aprovacoes). LI-V1@1 (rascunho, vazio) continua como historico.
const liv1 = srv.linhas('integrated_reading_rule_packages').find(p => p.code === 'LI-V1' && p.version === 1);
const liv2 = srv.linhas('integrated_reading_rule_packages').find(p => p.code === 'LI-V1' && p.version === 2);

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
ok(t0.texto.includes('Leitura Integrada — homologação metodológica') && t0.texto.includes(liv2.id) && /version: 2/.test(t0.texto) && /em_revisao/.test(t0.texto), 'secao independente mostra package_id, version e status do candidato LI-V1@2 (em_revisao)');
ok(t0.indefinida === '' && !t0.erroCss, 'LI-V1@2 tem dominios aprovados: o aviso "Metodologia ainda nao definida" nao aparece; nenhum erro tecnico');
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
  papel: (document.querySelector('#mh-li [data-mh-papeis]') || {}).textContent || '',
  respPre: (document.querySelector('#mh-li-aprovar [data-mh-li-resp]') || {}).value, respRO: !!(document.querySelector('#mh-li-aprovar [data-mh-li-resp]') || {}).readOnly,
}));
const hServ = srv.tratar({ op: 'rpc', uid: srv.contas['a@holo.test'].id, nome: 'li_hash_conteudo', args: { p_package_id: liv2.id } }).data;
ok(t1.hash === hServ, 'Conferir hash mostra o content_hash calculado no servidor: ' + t1.hash.slice(0, 12) + '…');
ok(t1.bloqueios.length === 0 && hServ === 'fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9', 'LI-V1@2: 0 bloqueios metodologicos (completude publicavel); hash candidato fa99ec80… — o que falta e o ato humano');
ok(t1.homologarDisabled && /Bloqueado/.test(t1.motivo) && /faltam Aprovações 1 e 2/.test(t1.motivo) && t1.statusAviso === '', 'Homologar continua bloqueado: faltam as Aprovacoes 1 e 2 vigentes (pacote ja em_revisao)');
ok(t1.temForm, 'acoes Registrar Aprovacao disponiveis na tela (o servidor decide)');
ok(/Daniel/.test(t1.papel) && /Aprovação 1/.test(t1.papel) && t1.respPre === 'Daniel' && t1.respRO, 'Etapa 5.3: a tela mostra o papel da conta (Daniel, Aprovacao 1) e preenche o responsavel a partir dele (somente leitura)');
await A.evaluate(async () => {
  const caixa = document.getElementById('mh-li-aprovar');
  caixa.querySelector('[data-mh-li-resp]').value = 'Daniel'; caixa.querySelector('[data-mh-li-just]').value = 'teste de tela'; caixa.querySelector('[data-mh-li-conferi]').checked = true;
  caixa.querySelector('[data-mh-li-acao="registrar-aprovacao"]').click();
  for (let i = 0; i < 60 && !/recusada|registrada/.test((document.getElementById('mh-li-estado') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 100));
});
const t2 = await A.evaluate(() => (document.getElementById('mh-li-estado') || {}).textContent || '');
const aprovs = srv.linhas('integrated_reading_package_approvals');
ok(/registrada/.test(t2) && aprovs.length === 1 && aprovs[0].package_id === liv2.id && aprovs[0].step === 1 && aprovs[0].responsible === 'Daniel' && aprovs[0].content_hash === hServ && aprovs[0].approver_id, 'Aprovacao 1 pela tela (conta de teste no papel de Daniel) sobre LI-V1@2 e o hash conferido — fixture local, identidade real (approver_id): ' + t2.slice(0, 70));
ok(srv.linhas('integrated_reading_rule_packages').find(p => p.id === liv2.id).status === 'em_revisao' && srv.linhas('integrated_reading_package_snapshots').length === 0 && liv1.status === 'rascunho', 'uma aprovacao nao homologa: LI-V1@2 continua em_revisao, sem snapshot; LI-V1@1 continua rascunho');
ok(errosJS.length === 0, errosJS.length ? 'ERRO DE JS: ' + errosJS[0] : 'sem erro de JS');
await nav.close();
console.log('');
process.exit(falhou ? 1 : 0);
