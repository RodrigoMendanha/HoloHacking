/**
 * Perfil — correcoes da auditoria de 09/10 (Supabase falso):
 *   1  leitura do servidor que falha: estado de erro com "Tentar novamente", sem formulario vazio, sem salvar,
 *      sem enviar imagem; o servidor nao muda; "Tentar novamente" recupera
 *   2  trocar foto/logo/assinatura/carimbo com upload que falha: a imagem ANTIGA (registro e arquivo) continua
 *   3  registro da imagem que falha depois do upload: o arquivo novo nao fica orfao; a antiga continua
 *   4  troca bem-sucedida: 1 registro, 1 arquivo, o antigo apagado DEPOIS
 *   5  dois dispositivos: campos diferentes se somam (sem apagar o do outro); o MESMO campo vira conflito explicito
 *   6  senha: Perfil -> Alterar senha exige 8 (como cadastro e nova senha)
 *   7  "Documentos" nao aparece mais em Preferencias; "Manter conectado" saiu do login
 *   8  conta sem linha em profiles: salvar cria a linha (antes "salvava" nada)
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UID = srv.criarConta('robusta@holo.test', 'senha-robusta-1');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UID, nome: 'Robusta Teste Ficticia', telefone: '62999990000', email_contato: 'robusta@holo.test', registro: 'CRN-1 1111', cidade: 'Goiânia/GO',
  instagram: '@antes', profissao: 'Nutricionista', status: 'ativo', aprovado_em: agora, created_at: agora, updated_at: agora });
const PNG = 'amostras/laudo.png';

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina() {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1280, height: 900 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  /* as janelas de boas-vindas sao testadas em testar-boas-vindas.mjs; aqui a pessoa as fecha */
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  return P;
}
async function entrar(P, email, senha) {
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => document.getElementById('tela-login').hidden, { timeout: 8000 }).catch(() => {});
  await espera(500);
}
async function abrirPerfil(P, aba = 'perfil') {
  await P.evaluate(() => window.irParaSecao('perfil')); await espera(200);
  await P.evaluate(a => document.querySelector('[data-aba-perfil="' + a + '"]').click(), aba); await espera(200);
}
const preencher = (P, v) => P.evaluate((v) => { for (const k of Object.keys(v)) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); } }, v);
const salvarPerfil = async (P) => { await P.evaluate(() => document.getElementById('btn-salvar-perfil').click()); await espera(600); };
const avisoPerfil = (P) => P.evaluate(() => (document.getElementById('perfil-aviso') || {}).textContent || '');
const linha = () => srv.linhas('profiles').find(p => p.id === UID);
async function enviar(P, campo, aba) {
  await abrirPerfil(P, aba);
  const [fc] = await Promise.all([P.waitForFileChooser(), P.evaluate(c => document.querySelector('[data-enviar="' + c + '"]').click(), campo)]);
  await fc.accept([PNG]);
  await espera(900);
}
const assets = (tipo) => srv.linhas('professional_assets').filter(a => a.nutritionist_id === UID && (!tipo || a.tipo === tipo));
const objetos = (tipo) => Object.keys(srv.storage['professional-assets']).filter(k => k.startsWith(UID + '/' + (tipo ? tipo + '/' : '')));

const A = await pagina();
await entrar(A, 'robusta@holo.test', 'senha-robusta-1');

/* ----- 1 ----- */
srv.falhar.push({ tabela: 'profiles', acao: 'select', vezes: 1 });
await A.reload({ waitUntil: 'networkidle2' }); await espera(900);
await abrirPerfil(A);
const e1 = await A.evaluate(() => ({ erro: !!document.querySelector('#painel-perfil [data-perfil-recarregar]'), form: !!document.getElementById('pf-nome'),
  salvar: !!document.getElementById('btn-salvar-perfil'), enviar: !!document.querySelector('#secao-perfil [data-enviar]'), texto: document.getElementById('painel-perfil').innerText }));
ok(e1.erro && !e1.form && !e1.salvar && !e1.enviar && /Não foi possível carregar o seu perfil/.test(e1.texto),
  'leitura do perfil falhou: aparece o erro com "Tentar novamente"; sem formulário vazio, sem Salvar e sem enviar imagem');
const antes = JSON.stringify(linha());
await abrirPerfil(A, 'marca');
ok(!(await A.evaluate(() => !!document.getElementById('btn-salvar-marca'))), 'a aba Marca também fica bloqueada (sem Salvar)');
const forcado = await A.evaluate(async () => { const m = window.Perfil.atual(); return m.registro; });
ok(forcado === '' && JSON.stringify(linha()) === antes, 'nada foi escrito no servidor durante a falha (registro e cidade continuam lá)');
await abrirPerfil(A);
await A.evaluate(() => document.querySelector('[data-perfil-recarregar]').click()); await espera(900);
const rec = await A.evaluate(() => ({ nome: (document.getElementById('pf-nome') || {}).value, reg: (document.getElementById('pf-registro') || {}).value }));
ok(rec.nome === 'Robusta Teste Ficticia' && rec.reg === 'CRN-1 1111', '"Tentar novamente" carrega o perfil de verdade (nome e CRN de volta)');

/* ----- 2/3/4 ----- */
for (const [c, a] of [['foto_id', 'perfil'], ['logo_id', 'marca'], ['assinatura_id', 'marca'], ['carimbo_id', 'marca']]) await enviar(A, c, a);
ok(assets().length === 4 && objetos().length === 4, 'as 4 imagens enviadas (4 registros, 4 arquivos)');
for (const [c, a, tipo] of [['foto_id', 'perfil', 'foto'], ['logo_id', 'marca', 'logo'], ['assinatura_id', 'marca', 'assinatura'], ['carimbo_id', 'marca', 'carimbo']]) {
  const velho = assets(tipo)[0];
  srv.falhar.push({ tabela: 'professional-assets', acao: 'upload', vezes: 1 });
  await enviar(A, c, a);
  const depois = assets(tipo);
  const msg = await avisoPerfil(A);
  ok(depois.length === 1 && depois[0].storage_path === velho.storage_path && !!srv.storage['professional-assets'][velho.storage_path] && /anterior continua/.test(msg),
    tipo + ': upload falhou → registro e arquivo ANTIGOS intactos, e a tela avisa ("' + msg.slice(0, 60) + '…")');
}
{
  const velho = assets('logo')[0];
  srv.falhar.push({ tabela: 'professional_assets', acao: 'upsert', vezes: 1 });
  await enviar(A, 'logo_id', 'marca');
  ok(assets('logo')[0].storage_path === velho.storage_path && objetos('logo').length === 1 && !!srv.storage['professional-assets'][velho.storage_path],
    'logo: o registro falhou depois do upload → o arquivo novo é retirado (sem órfão) e o antigo continua');
  await enviar(A, 'logo_id', 'marca');
  const novo = assets('logo')[0];
  ok(novo.storage_path !== velho.storage_path && objetos('logo').length === 1 && objetos('logo')[0] === novo.storage_path,
    'logo: troca bem-sucedida → 1 registro, 1 arquivo (o novo); o antigo apagado depois do registro');
  const img = await A.evaluate(() => !!document.querySelector('#perf-logo-alvo img'));
  ok(img, 'e a tela mostra o logo novo');
}

/* ----- 5 ----- */
const B = await pagina();
await entrar(B, 'robusta@holo.test', 'senha-robusta-1');
await abrirPerfil(A); await abrirPerfil(B);
await preencher(B, { 'pf-cidade': 'Anápolis/GO' }); await salvarPerfil(B);
await preencher(A, { 'pf-instagram': '@depois' }); await salvarPerfil(A);
ok(linha().cidade === 'Anápolis/GO' && linha().instagram === '@depois', 'dois dispositivos, campos diferentes: a cidade de B e o Instagram de A ficam os dois (nada apagado)');
ok(await A.evaluate(() => document.getElementById('pf-cidade').value) === 'Anápolis/GO', 'e a tela de A passa a mostrar a cidade que B salvou');
await preencher(B, { 'pf-cidade': 'Cidade de B' }); await salvarPerfil(B);
await preencher(A, { 'pf-cidade': 'Cidade de A' }); await salvarPerfil(A);
const conf = await avisoPerfil(A);
ok(linha().cidade === 'Cidade de B' && /outro dispositivo/.test(conf) && /Cidade\/UF/.test(conf), 'o MESMO campo nos dois: conflito explícito ("' + conf.slice(0, 70) + '…"), o valor de B não é sobrescrito');
ok(await A.evaluate(() => document.getElementById('pf-cidade').value) === 'Cidade de B', 'depois do conflito a tela de A mostra o que está no servidor');
await preencher(A, { 'pf-cidade': 'Cidade de A' }); await salvarPerfil(A);
ok(linha().cidade === 'Cidade de A', 'salvando de novo (agora consciente), A grava');

/* ----- 6 ----- */
await abrirPerfil(A, 'conta');
await A.evaluate(() => { document.getElementById('conta-nova-senha').value = '1234567'; document.getElementById('conta-confirmar-senha').value = '1234567'; document.getElementById('btn-trocar-senha').click(); });
await espera(300);
ok(/pelo menos 8 caracteres/.test(await A.evaluate(() => document.getElementById('conta-senha-aviso').textContent)) && srv.contas['robusta@holo.test'].senha === 'senha-robusta-1',
  'Perfil → Alterar senha recusa 7 caracteres ("pelo menos 8") sem ir ao servidor');
await A.evaluate(() => { document.getElementById('conta-nova-senha').value = 'nova-senha-8'; document.getElementById('conta-confirmar-senha').value = 'nova-senha-8'; document.getElementById('btn-trocar-senha').click(); });
await espera(500);
ok(srv.contas['robusta@holo.test'].senha === 'nova-senha-8', 'com 8 caracteres a senha é trocada');

/* ----- 7 ----- */
await abrirPerfil(A, 'prefs');
const prefs = await A.evaluate(() => [...document.querySelectorAll('[data-modulo]')].map(b => b.dataset.modulo));
ok(!prefs.includes('documentos') && prefs.includes('agenda'), 'Preferências sem a chave "Documentos" (sem efeito desde que o menu saiu): ' + prefs.join(','));
const L = await pagina();
await L.waitForSelector('#login-email', { visible: true });
ok(!(await L.evaluate(() => !!document.getElementById('login-manter'))), 'login sem "Manter conectado" (a caixa não tinha efeito)');
await L.evaluate(() => { location.hash = ''; });
await L.goto('http://127.0.0.1:5500/cadastro', { waitUntil: 'networkidle2' }); await espera(300);
await L.evaluate(() => { window.supabaseClient.auth.signUp = () => Promise.resolve({ data: {}, error: { message: 'Database error saving new user', code: 'unexpected_failure' } }); });
await preencher(L, { 'cad-nome': 'Erro Banco Teste', 'cad-email': 'erro@holo.test', 'cad-telefone': '62999990001', 'cad-senha': 'senha-erro-1', 'cad-senha2': 'senha-erro-1' });
await L.click('#btn-cadastrar'); await espera(400);
const mc = await L.evaluate(() => document.getElementById('cadastro-mensagem').textContent);
ok(/concluir o cadastro/.test(mc) && !/entrar/i.test(mc), 'erro do servidor no cadastro fala de cadastro, não de "entrar": ' + mc);
await L.evaluate(() => { window.supabaseClient.auth.signUp = () => Promise.resolve({ data: {}, error: { message: 'Password should be at least 8 characters.', code: 'weak_password' } }); });
await L.click('#btn-cadastrar'); await espera(400);
const mf = await L.evaluate(() => document.getElementById('cadastro-mensagem').textContent);
ok(/pelo menos 8 caracteres/.test(mf) && !/letras|números/.test(mf), 'senha fraca: a mensagem diz a regra real (8 caracteres), sem exigir letras/números: ' + mf);

/* ----- 8 ----- */
const SEM = srv.criarConta('semlinha@holo.test', 'senha-sem-linha-1');
const S = await pagina();
await entrar(S, 'semlinha@holo.test', 'senha-sem-linha-1');
await abrirPerfil(S);
await preencher(S, { 'pf-nome': 'Sem Linha Teste', 'pf-registro': 'CRN-9 9' }); await salvarPerfil(S);
const sl = srv.linhas('profiles').find(p => p.id === SEM);
ok(!!sl && sl.registro === 'CRN-9 9', 'conta sem linha em profiles: Salvar cria a linha (antes não gravava nada e dizia "salvo")');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
