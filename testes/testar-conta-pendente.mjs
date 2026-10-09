/**
 * Conta PENDENTE = somente Perfil (09/10). Supabase falso com as mesmas regras da migration 20261013100000.
 *   E2E  cadastro -> pendente -> app abre so com o Perfil -> dados + foto, logo, assinatura, carimbo -> salvar ->
 *        sair -> entrar -> tudo la -> outro dispositivo (celular) -> tudo la -> area clinica bloqueada ->
 *        administradora libera -> recarregar -> app completo
 *   SEG  pendente le/edita o proprio perfil e envia as proprias imagens; NAO muda o proprio status, nao ve perfil
 *        nem arquivo de outra, nao cria paciente, nao grava agenda, HOLOSCAN, ferramenta, Resultado HOLOS,
 *        conduta, documento de paciente, relatorio, HOLOS AI, nem usa RPC clinica; rota clinica cai no Perfil
 *   REC  recusada: tela "Acesso nao liberado", nao edita perfil nem envia imagem
 * SHOT_DIR=<pasta> grava as capturas (desktop e celular).
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const ADM = srv.criarConta('equipe@holo.test', 'senha-adm-123');
srv.tornarAdmin(ADM);
/* outra nutricionista ATIVA, com perfil, imagem e paciente: a pendente nao pode ver nada disso */
const OUTRA = srv.criarConta('outra@holo.test', 'senha-outra-1');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: OUTRA, nome: 'Outra Ativa Ficticia', registro: 'CRN-5 5555', status: 'ativo', created_at: agora, updated_at: agora });
srv.tabelas.professional_assets.push({ id: 'aa000000-0000-4000-8000-000000000001', nutritionist_id: OUTRA, tipo: 'logo', nome: 'l.png', mime_type: 'image/png', tamanho_bytes: 5, storage_path: OUTRA + '/logo/1.png', created_at: agora, updated_at: agora });
srv.storage['professional-assets'][OUTRA + '/logo/1.png'] = { b64: 'AA==', tipo: 'image/png', dono: OUTRA };

const PNG = 'amostras/laudo.png';
const SHOT = process.env.SHOT_DIR || null;
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url, w = 1280, h = 900) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: w, height: h });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto(url, { waitUntil: 'networkidle2' });
  return P;
}
const preencher = (P, v) => P.evaluate((v) => { for (const k of Object.keys(v)) { const el = document.getElementById(k); el.value = v[k]; el.dispatchEvent(new Event('input', { bubbles: true })); } }, v);
async function entrar(P, email, senha) {
  await P.waitForSelector('#login-email', { visible: true });
  await P.evaluate(() => { document.getElementById('login-email').value = ''; document.getElementById('login-senha').value = ''; });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => document.getElementById('tela-login').hidden || !document.getElementById('tela-status-conta').hidden, { timeout: 8000 }).catch(() => {});
  await espera(600);
}
const aba = async (P, a) => { await P.evaluate(a => document.querySelector('[data-aba-perfil="' + a + '"]').click(), a); await espera(200); };
async function enviar(P, campo, a) {
  await aba(P, a);
  const [fc] = await Promise.all([P.waitForFileChooser(), P.evaluate(c => document.querySelector('[data-enviar="' + c + '"]').click(), campo)]);
  await fc.accept([PNG]);
  await espera(900);
}
const estado = (P) => P.evaluate(() => ({
  pendente: document.body.classList.contains('conta-pendente'),
  login: !document.getElementById('tela-login').hidden,
  perfil: document.getElementById('secao-perfil').classList.contains('ativa') && document.getElementById('secao-perfil').offsetParent !== null,
  menu: [...document.querySelectorAll('.nav-item')].filter(b => b.offsetParent !== null).map(b => b.dataset.secao),
  secoes: [...document.querySelectorAll('.secao')].filter(s => s.offsetParent !== null).map(s => s.id),
  aviso: (document.getElementById('perfil-aviso-conta') || {}).innerText || '',
  prefs: !!(document.getElementById('tab-prefs') && document.getElementById('tab-prefs').offsetParent !== null),
  sair: !!(document.getElementById('sr-sair') && !document.getElementById('sr-sair').hidden)
}));
const imgs = (P) => P.evaluate(() => ['perf-foto-alvo', 'perf-logo-alvo', 'perf-assinatura-alvo', 'perf-carimbo-alvo'].map(i => !!(document.getElementById(i) && document.getElementById(i).querySelector('img'))));

/* ================= E2E ================= */
const C = await pagina('http://127.0.0.1:5500/cadastro');
await espera(300);
await preencher(C, { 'cad-nome': 'Nova Nutri Ficticia', 'cad-email': 'nova@holo.test', 'cad-telefone': '62988887777', 'cad-senha': 'senha-nova-1', 'cad-senha2': 'senha-nova-1' });
await C.click('#btn-cadastrar');
await C.waitForFunction(() => document.body.classList.contains('conta-pendente'), { timeout: 8000 }).catch(() => {});
await espera(600);
const ID = srv.linhas('profiles').find(p => p.email_contato === 'nova@holo.test').id;
let e = await estado(C);
ok(srv.statusConta(ID) === 'pendente' && e.pendente && !e.login && e.perfil, 'cadastro → status pendente → o app abre direto no Perfil');
ok(e.menu.join() === 'perfil' && e.sair, 'menu da pendente: só Perfil (e Sair da conta) — menu: ' + e.menu.join());
ok(e.secoes.join() === 'secao-perfil', 'nenhuma seção clínica visível: ' + e.secoes.join());
ok(/sendo preparado/.test(e.aviso) && /Complete seu perfil agora/.test(e.aviso) && /liberado em breve/.test(e.aviso), 'aviso no topo: cadastro sendo preparado, complete o perfil, acesso liberado em breve');
ok(['Foto', 'CRN', 'Logo', 'Assinatura', 'Carimbo', 'Contato'].every(x => e.aviso.includes(x)), 'checklist em destaque: Foto, CRN, Logo, Assinatura, Carimbo, Contato');
ok(!e.prefs, 'aba Preferências (módulos do menu clínico) escondida para a pendente; Perfil, Marca e Conta continuam');
if (SHOT) await C.screenshot({ path: SHOT + '/pendente-perfil-desktop.png' });

/* preencher e salvar */
await preencher(C, { 'pf-registro': 'CRN-1 12345', 'pf-especialidade': 'Nutrição Holística', 'pf-cidade': 'Goiânia/GO', 'pf-instagram': '@nova', 'pf-profissao': 'Nutricionista' });
await C.evaluate(() => document.getElementById('btn-salvar-perfil').click()); await espera(700);
const p1 = srv.linhas('profiles').find(p => p.id === ID);
ok(p1.registro === 'CRN-1 12345' && p1.cidade === 'Goiânia/GO' && p1.telefone === '62988887777' && p1.status === 'pendente', 'pendente salva os dados profissionais no servidor (CRN, cidade, Instagram); status continua pendente');
for (const [c, a] of [['foto_id', 'perfil'], ['logo_id', 'marca'], ['assinatura_id', 'marca'], ['carimbo_id', 'marca']]) await enviar(C, c, a);
const meus = srv.linhas('professional_assets').filter(a => a.nutritionist_id === ID);
ok(meus.length === 4 && meus.every(a => a.storage_path.startsWith(ID + '/')) && Object.keys(srv.storage['professional-assets']).filter(k => k.startsWith(ID + '/')).length === 4,
  'foto, logo, assinatura e carimbo enviados: 4 registros e 4 arquivos na pasta da própria conta');
await aba(C, 'marca');
await C.evaluate(() => { const el = document.getElementById('pf-cor_primaria-texto'); el.value = '#224466'; el.dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('btn-salvar-marca').click(); });
await espera(500);
ok(srv.linhas('profiles').find(p => p.id === ID).cor_primaria === '#224466', 'cores salvas');
e = await estado(C);
ok(/6 de 6/.test(e.aviso), 'o checklist do aviso fica completo (6 de 6)');
if (SHOT) await C.screenshot({ path: SHOT + '/pendente-perfil-completo-desktop.png', fullPage: false });

/* sair e entrar de novo */
await C.evaluate(() => window.HoloAuth.sair()); await espera(600);
await entrar(C, 'nova@holo.test', 'senha-nova-1');
await aba(C, 'perfil');
const vol = await C.evaluate(() => ({ reg: document.getElementById('pf-registro').value, cid: document.getElementById('pf-cidade').value }));
await aba(C, 'marca'); await espera(800);
const im1 = await imgs(C);
e = await estado(C);
ok(e.pendente && e.menu.join() === 'perfil' && vol.reg === 'CRN-1 12345' && vol.cid === 'Goiânia/GO' && im1.every(Boolean), 'sair e entrar: continua pendente (só Perfil) e tudo permanece (dados + 4 imagens)');

/* outro dispositivo (celular) */
const M = await pagina('http://127.0.0.1:5500/', 390, 844);
await entrar(M, 'nova@holo.test', 'senha-nova-1');
await aba(M, 'perfil');
const vm = await M.evaluate(() => document.getElementById('pf-registro').value);
await aba(M, 'marca'); await espera(900);
const im2 = await imgs(M);
const em = await estado(M);
ok(em.pendente && vm === 'CRN-1 12345' && im2.every(Boolean), 'outro dispositivo (celular): pendente, dados e 4 imagens');
ok(await M.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'celular sem rolagem horizontal');
await aba(M, 'perfil');
if (SHOT) { await M.evaluate(() => window.scrollTo(0, 0)); await M.screenshot({ path: SHOT + '/pendente-perfil-mobile.png' }); }

/* rota clinica */
for (const s of ['dashboard', 'pacientes', 'agenda', 'consultas', 'holoscan', 'resultado', 'corpo', 'contas', 'metodologia', 'ajuda']) {
  await C.evaluate(s => window.irParaSecao(s), s);
}
await C.evaluate(() => { const b = document.querySelector('.nav-item[data-secao="pacientes"]'); b.click(); });
await C.evaluate(() => { const b = document.querySelector('[data-ir="perfil"], [data-ir]'); if (b) b.click(); });
await espera(300);
e = await estado(C);
ok(e.perfil && e.secoes.join() === 'secao-perfil', 'qualquer área clínica pedida por atalho, menu escondido ou chamada direta cai no Perfil');
await C.goto('http://127.0.0.1:5500/#pacientes', { waitUntil: 'networkidle2' }); await espera(900);
e = await estado(C);
ok(e.perfil && e.secoes.join() === 'secao-perfil' && e.pendente, 'URL com #pacientes: abre no Perfil');

/* ================= SEGURANCA (direto na API, sem a tela) ================= */
const seg = await C.evaluate(async (OUTRA) => {
  const sb = window.supabaseClient, eu = window.HoloAuth.usuarioAtual().id;
  const h = (r) => !!(r && r.error);
  const hint = (r) => (r && r.error && (r.error.hint || r.error.code)) || 'aceito';
  const res = {};
  res.lePerfil = ((await sb.from('profiles').select('*').eq('id', eu)).data || []).length === 1;
  res.editaPerfil = !h(await sb.from('profiles').update({ especialidade: 'Teste API' }).eq('id', eu).select());
  res.status = h(await sb.from('profiles').update({ status: 'ativo' }).eq('id', eu).select());
  res.perfilOutra = ((await sb.from('profiles').select('*').eq('id', OUTRA)).data || []).length;
  res.assetsOutra = ((await sb.from('professional_assets').select('*').eq('nutritionist_id', OUTRA)).data || []).length;
  res.arquivoOutra = h(await sb.storage.from('professional-assets').download(OUTRA + '/logo/1.png'));
  res.paciente = hint(await sb.from('patients').insert({ nome: 'Paciente Ficticio' }).select());
  res.agenda = hint(await sb.from('schedule_blocks').insert({ data: '2026-10-20', dia_todo: true, motivo: 'x' }).select());
  res.consulta = hint(await sb.from('consultations').insert({ data: '2026-10-20', hora: '09:00' }).select());
  res.holoscan = hint(await sb.rpc('salvar_holoscan_completo', { payload: {} }));
  res.ferramenta = hint(await sb.from('tool_applications').insert({ ferramenta_id: 'oq3', versao_ferramenta: '1', status: 'rascunho', respostas: {} }).select());
  res.resultado = hint(await sb.rpc('salvar_resultado_holos', { payload: {} }));
  res.rascunho = hint(await sb.rpc('salvar_rascunho_resultado_holos', { payload: {} }));
  res.conduta = hint(await sb.rpc('salvar_conduta', { payload: {} }));
  res.condutaTab = hint(await sb.from('conducts').insert({ status: 'rascunho' }).select());
  res.documento = hint(await sb.from('documents').insert({ nome: 'x.pdf' }).select());
  res.arquivoPaciente = h(await sb.storage.from('patient-documents').upload(eu + '/p/1.pdf', new Blob(['x'], { type: 'application/pdf' })));
  res.relatorio = hint(await sb.rpc('emitir_relatorio', { payload: {} }));
  res.relatorioTab = hint(await sb.from('report_emissions').insert({ report_type: 'x' }).select());
  res.ia = hint(await sb.from('ai_threads').insert({ titulo: 'x' }).select());
  res.atendimento = hint(await sb.rpc('criar_atendimento', { payload: {} }));
  res.proximos = hint(await sb.rpc('registrar_proximos_passos', { p_application_id: '00000000-0000-4000-8000-000000000000' }));
  res.metodologia = hint(await sb.from('methodology_packages').insert({ code: 'X', version: 1 }).select());
  return res;
}, OUTRA);
ok(seg.lePerfil && seg.editaPerfil, 'pendente lê e edita o próprio perfil pela API');
ok(seg.status && srv.statusConta(ID) === 'pendente', 'pendente NÃO altera o próprio status');
ok(seg.perfilOutra === 0 && seg.assetsOutra === 0 && seg.arquivoOutra, 'pendente não vê o perfil, as imagens nem o arquivo de outra nutricionista');
const travas = ['paciente', 'agenda', 'consulta', 'holoscan', 'ferramenta', 'resultado', 'rascunho', 'conduta', 'condutaTab', 'documento', 'relatorio', 'relatorioTab', 'ia', 'atendimento', 'proximos', 'metodologia'];
const passou = travas.filter(k => seg[k] === 'aceito');
ok(passou.length === 0 && seg.arquivoPaciente, 'pendente NÃO grava: paciente, agenda, consulta, HOLOSCAN, ferramenta, Resultado HOLOS, conduta, documento (registro e arquivo), relatório, HOLOS AI, atendimento, Próximos Passos, metodologia' +
  (passou.length ? ' — PASSOU: ' + passou.join(',') : ''));
ok(travas.filter(k => k !== 'paciente').every(k => seg[k] === 'conta_nao_liberada' || seg[k] === '42501'), 'as recusas vêm da trava do servidor (conta_nao_liberada): ' + travas.map(k => k + '=' + seg[k]).join(' '));
ok(srv.linhas('patients').length === 0 && srv.linhas('schedule_blocks').length === 0 && srv.linhas('tool_applications').length === 0, 'nada clínico foi gravado no servidor');

/* ================= LIBERACAO ================= */
const A = await pagina('http://127.0.0.1:5500/');
await entrar(A, 'equipe@holo.test', 'senha-adm-123');
await A.waitForFunction(() => { const n = document.getElementById('nav-contas'); return n && !n.classList.contains('hidden'); }, { timeout: 8000 }).catch(() => {});
await A.evaluate(() => document.querySelector('.nav-item[data-secao="contas"]').click());
await A.waitForFunction((id) => document.querySelector('[data-ct-aprovar="' + id + '"]'), { timeout: 8000 }, ID).catch(() => {});
await A.evaluate((id) => document.querySelector('[data-ct-aprovar="' + id + '"]').click(), ID); await espera(700);
ok(srv.statusConta(ID) === 'ativo', 'administradora libera a conta (Configurações → Contas)');
await C.reload({ waitUntil: 'networkidle2' });
await C.waitForFunction(() => document.getElementById('tela-login').hidden && window.ContaAcesso && window.ContaAcesso.status() === 'ativo', { timeout: 8000 }).catch(() => {});
await espera(600);
e = await estado(C);
ok(!e.pendente && ['dashboard', 'pacientes', 'agenda', 'holoscan', 'perfil'].every(x => e.menu.includes(x)) && !/sendo preparado/.test(e.aviso),
  'recarregou: o sistema completo abre (menu: ' + e.menu.join(',') + '), sem o aviso de pendente');
const criou = await C.evaluate(async () => { const r = await window.supabaseClient.from('patients').insert({ nome: 'Paciente Ficticio' }).select(); return !r.error; });
const p2 = srv.linhas('profiles').find(p => p.id === ID);
ok(criou && p2.registro === 'CRN-1 12345' && srv.linhas('professional_assets').filter(a => a.nutritionist_id === ID).length === 4,
  'liberada: cria paciente; o perfil e as 4 imagens feitos como pendente continuam (sem novo cadastro, sem nova senha)');
/* o celular (sessao aberta) libera por "Verificar acesso novamente" */
await M.evaluate(() => document.getElementById('btn-verificar-acesso').click());
await M.waitForFunction(() => window.ContaAcesso && window.ContaAcesso.status() === 'ativo' && !document.body.classList.contains('conta-pendente'), { timeout: 8000 }).catch(() => {});
ok(!(await M.evaluate(() => document.body.classList.contains('conta-pendente'))), 'na outra sessão aberta, "Verificar acesso novamente" libera o app completo');

/* ================= RECUSADA ================= */
const R = await pagina('http://127.0.0.1:5500/cadastro');
await espera(300);
await preencher(R, { 'cad-nome': 'Recusada Ficticia Teste', 'cad-email': 'rec@holo.test', 'cad-telefone': '62977776666', 'cad-senha': 'senha-rec-12', 'cad-senha2': 'senha-rec-12' });
await R.click('#btn-cadastrar'); await espera(900);
const RID = srv.linhas('profiles').find(p => p.email_contato === 'rec@holo.test').id;
await A.evaluate(() => window.Contas.desenhar()); await espera(500);
await A.evaluate((id) => document.querySelector('[data-ct-recusar="' + id + '"]').click(), RID); await espera(300);
await A.evaluate(() => document.getElementById('modal-confirmar-ok').click()); await espera(600);
await R.reload({ waitUntil: 'networkidle2' }); await espera(900);
const er = await R.evaluate(() => ({ status: !document.getElementById('tela-status-conta').hidden, titulo: document.getElementById('status-conta-titulo').textContent, login: !document.getElementById('tela-login').hidden }));
ok(er.status && er.login && /Acesso não liberado/.test(er.titulo), 'recusada: login mostra só "Acesso não liberado" (o app não abre)');
if (SHOT) await R.screenshot({ path: SHOT + '/recusada-desktop.png' });
const rs = await R.evaluate(async () => {
  const sb = window.supabaseClient, eu = window.HoloAuth.usuarioAtual().id;
  await sb.from('profiles').update({ nome: 'Mudou' }).eq('id', eu);
  const img = await sb.storage.from('professional-assets').upload(eu + '/logo/1.png', new Blob(['x'], { type: 'image/png' }));
  const reg = await sb.from('professional_assets').insert({ nutritionist_id: eu, tipo: 'logo', nome: 'l.png', mime_type: 'image/png', tamanho_bytes: 1, storage_path: eu + '/logo/1.png' }).select();
  const ag = await sb.from('schedule_blocks').insert({ data: '2026-10-20', dia_todo: true }).select();
  return { img: !!img.error, reg: !!reg.error, ag: !!ag.error };
});
ok(srv.linhas('profiles').find(p => p.id === RID).nome === 'Recusada Ficticia Teste' && rs.img && rs.reg && rs.ag, 'recusada não edita o perfil, não envia imagem e não grava nada clínico');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
