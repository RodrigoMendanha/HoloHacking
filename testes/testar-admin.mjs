/**
 * Administracao (10/10). Supabase falso com o contrato da migration 20261016100000 e a Edge Function admin-usuarios
 * (mesmo nucleo de producao):
 *   1  conta comum nao ve o menu nem abre o painel (servidor recusa)
 *   2  administradora: menu "Administracao" com o numero de pendentes; aba Cadastros abre primeiro; Visao geral com
 *      numeros; nenhum dado de paciente na pagina (so contagens)
 *   3  liberar / recusar com motivo / voltar para analise — tudo no Historico
 *   4  Contas: busca, filtro, Gerenciar (dados, perfil %, uso), corrigir nome e telefone
 *   5  senha provisoria: aparece uma vez; a nutricionista entra com ela e e OBRIGADA a criar uma senha nova
 *   6  bloquear (nao entra, mensagem clara) / desbloquear; trocar e-mail (entra com o novo); link de nova senha
 *   7  sem a Edge Function publicada: mensagem clara; sem o SQL novo: modo antigo (pendentes + Liberar) continua
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
if (SHOT) mkdirSync(SHOT, { recursive: true });
const srv = criarServidor();
const agora = () => new Date().toISOString();
const perfil = (id, nome, tel, status, extra) => srv.tabelas.profiles.push(Object.assign({ id, nome, telefone: tel, email_contato: null, status, aprovado_em: status === 'pendente' ? null : agora(), aprovado_por: null, created_at: agora(), updated_at: agora() }, extra || {}));
const ADM = srv.criarConta('equipe@holo.test', 'senha-adm-123'); srv.tornarAdmin(ADM); perfil(ADM, 'Equipe HoloHacking', '11900000000', 'ativo');
const PEND = srv.criarConta('pendente@holo.test', 'senha-pend-1'); perfil(PEND, 'Paula Pendente', '11911112222', 'pendente');
const ATIVA = srv.criarConta('ativa@holo.test', 'senha-ativa-1');
perfil(ATIVA, 'Beatriz Ativa', '21933334444', 'ativo', { profissao: 'Nutricionista', registro: 'CRN-0 00000', cidade: 'Cidade Teste' });
srv.contas['ativa@holo.test'].ultimo_acesso = new Date(Date.now() - 3 * 86400000).toISOString();
srv.tabelas.patients.push({ id: 'p-fict-1', nutritionist_id: ATIVA, nome: 'Paciente Ficticio Sigiloso', status: 'ativo', created_at: agora(), updated_at: agora() });
srv.tabelas.professional_assets.push({ id: 'a1', nutritionist_id: ATIVA, tipo: 'logo', nome: 'logo.png', created_at: agora() });
const COMUM = srv.criarConta('comum@holo.test', 'senha-comum-1'); perfil(COMUM, 'Carla Comum', null, 'ativo');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina() {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1280, height: 900 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  return P;
}
async function entrar(P, email, senha) {
  await P.waitForSelector('#login-email', { visible: true });
  await P.evaluate(() => { document.getElementById('login-email').value = ''; document.getElementById('login-senha').value = ''; });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await espera(900);
}
const texto = (P) => P.evaluate(() => document.getElementById('contas-corpo').innerText);
const toast = (P) => P.evaluate(() => document.getElementById('toast').textContent);
async function confirmarModal(P, campos) {
  await P.waitForFunction(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden'), { timeout: 4000 });
  if (campos) await P.evaluate((c) => { for (const k of Object.keys(c)) document.querySelector('#modal-confirmar-corpo [name="' + k + '"]').value = c[k]; }, campos);
  await P.evaluate(() => { const b = document.querySelectorAll('#modal-confirmar-rodape button'); b[b.length - 1].click(); });
  await espera(700);
}
const clicar = (P, sel) => P.evaluate((s) => document.querySelector(s).click(), sel);
const shot = async (P, nome) => { if (SHOT) { await P.evaluate(() => { const t = document.querySelector('.topo'); if (t) t.style.position = 'static'; }); await P.screenshot({ path: SHOT + '/' + nome + '.png', fullPage: true }); } };

/* ----- 1 ----- */
const C = await pagina();
await entrar(C, 'comum@holo.test', 'senha-comum-1');
ok(await C.evaluate(() => document.getElementById('tela-login').hidden && document.getElementById('nav-contas').classList.contains('hidden')), 'conta comum entra e NÃO vê o menu Administração');
const recusa = await C.evaluate(async () => { const r = await window.supabaseClient.rpc('admin_painel'); const f = await window.supabaseClient.functions.invoke('admin-usuarios', { body: { acao: 'bloquear', user_id: '00000000-0000-4000-8000-000000000000' } }); return { rpc: r.error && r.error.code, fn: f.data && f.data.erro }; });
ok(recusa.rpc === '42501' && recusa.fn === 'apenas_administradores', 'e o servidor recusa o painel e as ações de acesso para ela (' + JSON.stringify(recusa) + ')');

/* ----- 2 ----- */
const A = await pagina();
await entrar(A, 'equipe@holo.test', 'senha-adm-123');
await A.waitForFunction(() => !document.getElementById('nav-contas').classList.contains('hidden'), { timeout: 8000 }).catch(() => {});
const menu = await A.evaluate(() => ({ txt: document.getElementById('nav-contas').innerText, num: document.getElementById('nav-contas-num').textContent }));
ok(/Administração/.test(menu.txt) && menu.num === '1', 'administradora vê "Administração" com 1 cadastro aguardando');
await clicar(A, '#nav-contas');
await A.waitForFunction(() => document.querySelector('[data-ad-aba-atual]'), { timeout: 8000 }).catch(() => {});
let t = await texto(A);
ok(await A.evaluate(() => document.querySelector('[data-ad-aba-atual]').dataset.adAbaAtual === 'cadastros') && /Aguardando liberação \(1\)/.test(t) && /Paula Pendente/.test(t) && /pendente@holo\.test/.test(t) && /\(11\) 91111-2222/.test(t),
  'com cadastro aguardando, a aba Cadastros abre primeiro: nome, e-mail, telefone e quando');
await shot(A, '01-cadastros');
await clicar(A, '[data-ad-aba="geral"]'); await espera(200);
const nums = await A.evaluate(() => Object.fromEntries([...document.querySelectorAll('.ad-num')].map(n => [n.querySelector('span').textContent, n.querySelector('b').textContent])));
ok(nums['contas no total'] === '4' && nums['aguardando liberação'] === '1' && nums['liberadas'] === '3' && nums['pacientes'] === '1' && nums['cadastros hoje'] === '4' && nums['nunca entraram'] === '1',
  'Visão geral: contas, aguardando, liberadas, cadastros hoje, acessos e uso (' + JSON.stringify(nums) + ')');
const pagTexto = await A.evaluate(() => document.body.innerText);
ok(!/Paciente Ficticio Sigiloso/.test(pagTexto), 'nenhum nome de paciente na página de administração (só contagens)');
await shot(A, '02-visao-geral');

/* ----- 3 ----- */
await clicar(A, '[data-ad-aba="cadastros"]'); await espera(200);
await clicar(A, '[data-ct-aprovar="' + PEND + '"]'); await espera(700);
ok(srv.statusConta(PEND) === 'ativo' && /Acesso liberado/.test(await toast(A)) && await A.evaluate(() => document.getElementById('nav-contas-num').hidden), 'Liberar acesso: conta ativa, aviso e contador zerado');
await clicar(A, '[data-ad-aba="contas"]'); await espera(200);
await clicar(A, '[data-ad-gerenciar="' + PEND + '"]'); await espera(200);
await clicar(A, '[data-ad-status="recusado"][data-id="' + PEND + '"]');
await confirmarModal(A, { motivo: 'cadastro de teste' });
ok(srv.statusConta(PEND) === 'recusado', 'Recusar (com motivo) a partir do painel da conta');
await clicar(A, '[data-ad-status="pendente"][data-id="' + PEND + '"]');
await confirmarModal(A);
ok(srv.statusConta(PEND) === 'pendente' && srv.linhas('profiles').find(p => p.id === PEND).aprovado_em === null, 'Voltar para análise: pendente de novo');
ok(await A.evaluate((me) => !document.querySelector('[data-ad-status][data-id="' + me + '"]'), ADM), 'a própria conta não tem botões de status');

/* ----- 4 ----- */
await A.evaluate(() => { const b = document.getElementById('ad-busca'); b.value = 'beatriz'; b.dispatchEvent(new Event('input', { bubbles: true })); }); await espera(200);
let linhas = await A.evaluate(() => [...document.querySelectorAll('#ad-lista > li')].map(l => l.dataset.conta));
ok(linhas.length === 1 && linhas[0] === ATIVA, 'busca por nome encontra só a conta certa');
await A.evaluate(() => { const b = document.getElementById('ad-busca'); b.value = '2193333'; b.dispatchEvent(new Event('input', { bubbles: true })); }); await espera(200);
ok((await A.evaluate(() => document.querySelectorAll('#ad-lista > li').length)) === 1, 'busca por telefone também');
await A.evaluate(() => { const b = document.getElementById('ad-busca'); b.value = ''; b.dispatchEvent(new Event('input', { bubbles: true })); const f = document.getElementById('ad-filtro'); f.value = 'pendentes'; f.dispatchEvent(new Event('change', { bubbles: true })); }); await espera(200);
linhas = await A.evaluate(() => [...document.querySelectorAll('#ad-lista > li')].map(l => l.dataset.conta));
ok(linhas.length === 1 && linhas[0] === PEND, 'filtro "Aguardando" mostra só as pendentes');
await A.evaluate(() => { const f = document.getElementById('ad-filtro'); f.value = 'todas'; f.dispatchEvent(new Event('change', { bubbles: true })); }); await espera(200);
await clicar(A, '[data-ad-gerenciar="' + ATIVA + '"]'); await espera(200);
const det = await A.evaluate(() => document.getElementById('ad-detalhe').innerText);
ok(/Pacientes\s*1/.test(det) && /Perfil profissional \(60%\)/i.test(det) && /CRN-0 00000/.test(det) && /há 3 dias|\d{2}\/\d{2}\/\d{4}/.test(det), 'Gerenciar: uso (contagens), perfil com % de preenchimento, último acesso');
await shot(A, '03-gerenciar');
await A.evaluate(() => { const f = document.querySelector('[data-ad-form-perfil]'); f.nome.value = 'Beatriz Ativa Corrigida'; f.telefone.value = '(21) 3333-4444'; f.requestSubmit(); }); await espera(700);
const pB = srv.linhas('profiles').find(p => p.id === ATIVA);
ok(pB.nome === 'Beatriz Ativa Corrigida' && pB.telefone === '2133334444', 'corrigir nome e telefone grava no servidor (limpo)');

/* ----- 5 ----- */
await clicar(A, '[data-ad-acesso="definir_senha"][data-id="' + ATIVA + '"]');
await confirmarModal(A);
const prov = await A.evaluate(() => { const c = document.getElementById('ad-senha-provisoria'); return c ? c.textContent : null; });
ok(!!prov && prov.length === 12 && srv.contas['ativa@holo.test'].senha === prov && srv.contas['ativa@holo.test'].meta.precisa_trocar_senha === true,
  'senha provisória: aparece uma vez para a administradora e vale no Auth, com troca obrigatória marcada');
ok(await A.evaluate(() => /wa\.me\/552133334444\?text=/.test(document.querySelector('.ad-senha a').href)), 'botão "Enviar por WhatsApp" com a mensagem pronta');
await shot(A, '04-senha-provisoria');
ok(!JSON.stringify(srv.registroAdmin).includes(prov), 'a senha provisória não vai para o histórico');
await clicar(A, '[data-ad-aba="geral"]'); await espera(150);
ok(!(await A.evaluate((s) => document.body.innerHTML.includes(s), prov)), 'trocando de aba, a senha some da tela');

const B = await pagina();
await entrar(B, 'ativa@holo.test', 'senha-ativa-1');
ok(/E-mail ou senha incorretos/.test(await B.evaluate(() => document.getElementById('login-mensagem') ? document.getElementById('login-mensagem').textContent : document.body.innerText)), 'a senha antiga deixou de valer');
await entrar(B, 'ativa@holo.test', prov);
await B.waitForFunction(() => !document.getElementById('tela-nova-senha').hidden, { timeout: 6000 }).catch(() => {});
ok(await B.evaluate(() => !document.getElementById('tela-nova-senha').hidden && !document.getElementById('nova-senha-obrigatoria').hidden && !document.getElementById('tela-login').hidden),
  'entrando com a senha provisória, ela é OBRIGADA a criar uma senha nova antes do app');
await shot(B, '05-troca-obrigatoria');
await B.evaluate(() => { document.getElementById('nova-senha').value = 'minha-senha-nova-1'; document.getElementById('confirmar-senha').value = 'minha-senha-nova-1'; });
await clicar(B, '#btn-nova-senha');
await B.waitForFunction(() => document.getElementById('tela-login').hidden, { timeout: 8000 }).catch(() => {});
ok(await B.evaluate(() => document.getElementById('tela-login').hidden) && srv.contas['ativa@holo.test'].senha === 'minha-senha-nova-1' && srv.contas['ativa@holo.test'].meta.precisa_trocar_senha === false,
  'com a senha nova o app abre e a marca de troca obrigatória é limpa');

/* ----- 6 ----- */
await clicar(A, '[data-ad-aba="contas"]'); await espera(150);
if (!(await A.evaluate(() => !!document.getElementById('ad-detalhe')))) { await clicar(A, '[data-ad-gerenciar="' + ATIVA + '"]'); await espera(200); }
await clicar(A, '[data-ad-acesso="bloquear"][data-id="' + ATIVA + '"]');
await confirmarModal(A, { motivo: 'teste de bloqueio' });
ok(srv.administracao.banido(srv.contas['ativa@holo.test']) && /Bloqueada/.test(await texto(A)), 'Bloquear: a conta fica bloqueada (selo na lista)');
const B2 = await pagina();
await entrar(B2, 'ativa@holo.test', 'minha-senha-nova-1');
ok(await B2.evaluate(() => !document.getElementById('tela-login').hidden && /bloqueado/.test(document.body.innerText)), 'bloqueada não entra e vê "Este acesso está bloqueado"');
await clicar(A, '[data-ad-acesso="desbloquear"][data-id="' + ATIVA + '"]'); await espera(700);
ok(!srv.administracao.banido(srv.contas['ativa@holo.test']), 'Desbloquear devolve o acesso');
await clicar(A, '[data-ad-acesso="trocar_email"][data-id="' + ATIVA + '"]');
await confirmarModal(A, { email: 'comum@holo.test' });
ok(/outra conta/.test(await toast(A)) && !!srv.contas['ativa@holo.test'], 'trocar para e-mail de outra conta: recusado com mensagem clara');
await clicar(A, '[data-ad-acesso="trocar_email"][data-id="' + ATIVA + '"]');
await confirmarModal(A, { email: 'Beatriz.Nova@holo.test' });
ok(!srv.contas['ativa@holo.test'] && !!srv.contas['beatriz.nova@holo.test'] && srv.linhas('profiles').find(p => p.id === ATIVA).email_contato === 'beatriz.nova@holo.test', 'Trocar e-mail: login e contato passam para o novo');
const B3 = await pagina();
await entrar(B3, 'beatriz.nova@holo.test', 'minha-senha-nova-1');
ok(await B3.evaluate(() => document.getElementById('tela-login').hidden), 'ela entra com o e-mail novo e a mesma senha');
await clicar(A, '[data-ad-acesso="enviar_link_senha"][data-id="' + ATIVA + '"]');
await confirmarModal(A);
ok(srv.pedidosLinkSenha[0] === 'beatriz.nova@holo.test', 'Enviar link de nova senha vai para o e-mail atual da conta');

await clicar(A, '[data-ad-aba="historico"]'); await espera(200);
t = await texto(A);
const frases = ['liberou o acesso de', 'recusou o cadastro de', 'voltou para análise', 'corrigiu os dados de', 'definiu uma senha provisória', 'bloqueou o acesso de', 'desbloqueou o acesso de', 'trocou o e-mail de', 'enviou link de nova senha'];
ok(frases.every(f => t.includes(f)) && /motivo: cadastro de teste/.test(t) && /ativa@holo\.test → beatriz\.nova@holo\.test/.test(t),
  'Histórico mostra cada ação com quem fez, em quem, motivo e de → para');
ok(srv.registroAdmin.length === 9, 'o servidor registrou 9 ações (' + srv.registroAdmin.map(r => r.acao).join(',') + ')');
await shot(A, '06-historico');

/* ----- 7 ----- */
srv.semFuncaoAdmin = true;
await clicar(A, '[data-ad-aba="contas"]'); await espera(150);
if (!(await A.evaluate(() => !!document.getElementById('ad-detalhe')))) { await clicar(A, '[data-ad-gerenciar="' + ATIVA + '"]'); await espera(200); }
await clicar(A, '[data-ad-acesso="desbloquear"], [data-ad-acesso="bloquear"]');
if (await A.evaluate(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden'))) await confirmarModal(A);
await espera(300);
ok(/ainda não está publicada/.test(await toast(A)), 'sem a Edge Function publicada: mensagem clara (nada muda)');
srv.semFuncaoAdmin = false;
srv.semAdminSql = true;
const A2 = await pagina();
await entrar(A2, 'equipe@holo.test', 'senha-adm-123');
await A2.waitForFunction(() => !document.getElementById('nav-contas').classList.contains('hidden'), { timeout: 8000 }).catch(() => {});
await clicar(A2, '#nav-contas');
await A2.waitForFunction(() => document.querySelector('[data-ct-aprovar]'), { timeout: 8000 }).catch(() => {});
await clicar(A2, '[data-ct-aprovar="' + PEND + '"]'); await espera(700);
ok(srv.statusConta(PEND) === 'ativo', 'sem o SQL novo aplicado: a página cai no modo antigo e Liberar continua funcionando');
srv.semAdminSql = false;

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nadministracao: tudo ok');
process.exit(falhou ? 1 : 0);
