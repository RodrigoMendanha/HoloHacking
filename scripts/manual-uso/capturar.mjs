/**
 * GUIA DE USO DO HOLOHACKING — capturas REAIS do sistema atual (servidor Supabase FALSO em memória, nada sai desta máquina).
 * Personagens INVENTADOS: nutricionista "Ana Ribeiro", paciente "Marina Alves" (do zero, pacote HOLOS-V1 v7 como em produção)
 * e, para o retorno, a paciente "Clara Souza" da fixture dos testes. Nenhum dado real.
 *   node scripts/manual-uso/capturar.mjs            -> scripts/manual-uso/telas/*.png
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const R = new URL('../../', import.meta.url).pathname;
const puppeteer = (await import(R + 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).default;
const { criarServidor, ligarPagina } = await import(R + 'testes/supabase-falso.mjs');
const { semearHolosAprovado } = await import(R + 'testes/holos-aprovado.mjs');
const { montarFixture } = await import(R + 'testes/fixture-direcao.mjs');
const { servir } = await import(R + 'scripts/video-holohacking-comercial/servidor.mjs');
globalThis.window = globalThis.window || globalThis;
const { construir } = await import(R + 'scripts/pacote-v7.mjs');
const { CASOS, respostas: respCaso } = await import(R + 'scripts/comparar-v5-v6.mjs');

const OUT = new URL('./telas/', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const servidor = await servir();
const srv = criarServidor();
const UA = srv.criarConta('ana.ribeiro@exemplo.com', 'senha-ficticia-1');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Ana Ribeiro', registro: 'CRN-0 00000', profissao: 'Nutricionista', especialidade: 'Nutrição Holística', cidade: 'Consultório',
  status: 'ativo', created_at: agora, updated_at: agora });

/* pacote vigente = HOLOS-V1 v7 (o publicado), com respostas desenhadas como na fixture: Metabólico e Detox em destaque */
const { v7 } = construir();
const pacote = Object.assign(JSON.parse(JSON.stringify(v7)), { status: 'aprovado' });
semearHolosAprovado(srv, UA, { pacote, version: 7, effective_from: '2026-01-01' });
await import(R + 'metodologia-motor.js').catch(() => null);
const caso = CASOS.find(c => c.id === 'C');
const tema = [...caso.tema, 'SNT-505', 'EMO-301', 'EMO-303', 'SNT-502', 'EMO-501'];
const RESP = respCaso(pacote, tema);
const ori = Object.fromEntries(pacote.perguntas.map(p => [p.stable_id, p.orientation]));
const carga = { 'SNT-301': 2, 'SNT-303': 2, 'SNT-304': 1, 'SNT-307': 2, 'SNT-501': 2, 'SNT-507': 1, 'ESP-303': 3, 'SNT-305': 2, 'SNT-308': 1, 'EMO-504': 1, 'SNT-505': 2, 'EMO-301': 1, 'EMO-303': 2, 'SNT-502': 2, 'EMO-501': 1 };
tema.forEach(id => { if (carga[id] !== undefined) RESP[id] = ori[id] === 'invertida' ? 3 - carga[id] : carga[id]; });
pacote.perguntas.forEach(p => { if (!caso.tema.includes(p.stable_id)) { const h = [...p.stable_id].reduce((a, c) => a + c.charCodeAt(0), 0); if (h % 5 === 0) RESP[p.stable_id] = p.orientation === 'invertida' ? 2 : 1; } });
const primarias = (sis) => pacote.associacoes.filter(x => x.destination_type === 'system' && x.destination_id === sis && x.role === 'primaria').map(x => x.question_stable_id);
const metab = primarias('metabolico');
primarias('acido_inflamatorio').filter(id => !metab.includes(id)).forEach(id => { RESP[id] = ori[id] === 'invertida' ? 3 : 0; });
primarias('detox_linfatico').filter(id => !metab.includes(id)).forEach((id, i) => { const c = i < 2 ? 2 : i < 4 ? 1 : 0; RESP[id] = ori[id] === 'invertida' ? 3 - c : c; });

/* paciente do retorno (fixture dos testes, já com 1ª consulta, HOLOSCAN, ferramentas e Resultado) */
const fx = await montarFixture(srv, UA, { nome: 'Clara Souza' });

const FORM = {
  motivo: { motivo: 'Cansaço no fim da tarde e fome forte à noite', objetivo: 'Ter mais disposição à tarde', mudar_primeiro: 'O lanche da tarde', ajudou: 'Levar marmita nos dias de escritório' },
  alimentar: { dificuldade: 'Belisco quando chego em casa', maior_fome: ['Tarde', 'Noite'], dificuldades: ['Falta de tempo', 'Comer à noite'] },
  saude: { sinal_principal: 'Fome muito intensa ou difícil de controlar' } };

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const erros = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
const feitas = [];
async function pagina(w, h, dsf = 2) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: w, height: h, deviceScaleFactor: dsf });
  await P.emulateTimezone('America/Sao_Paulo');
  P.on('pageerror', e => erros.push(e.message));
  await ligarPagina(P, srv);
  return P;
}
const SEM_ANIM = '*{transition:none!important;animation:none!important;caret-color:transparent!important} .topo,.barra-contexto,.abas-ficha-caixa{position:static!important}';
async function tela(P, nome, o = {}) {
  await espera(o.espera ?? 700);
  if (o.topo !== false) await P.evaluate(() => window.scrollTo(0, 0));
  await P.screenshot({ path: OUT + nome + '.png', fullPage: !!o.inteira });
  feitas.push(nome); console.log('  tela', nome);
}
async function el(P, sel, nome, o = {}) {
  await espera(o.espera ?? 500);
  const e = await P.$(sel); if (!e) { console.log('  SEM', sel, '(' + nome + ')'); return false; }
  await e.screenshot({ path: OUT + nome + '.png' }); feitas.push(nome); console.log('  recorte', nome); return true;
}
const clicar = (P, sel) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const clicarTexto = (P, re, escopo = 'button') => P.evaluate((re, escopo) => { const b = [...document.querySelectorAll(escopo)].find(x => new RegExp(re).test(x.textContent) && x.offsetParent); if (!b) return false; b.click(); return true; }, re, escopo);
const confirmarModal = async (P) => {
  await P.waitForFunction(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden'), { timeout: 4000 }).catch(() => null);
  await P.evaluate(() => { const b = document.querySelectorAll('#modal-confirmar-rodape button'); if (b.length) b[b.length - 1].click(); });
};
async function login(P) {
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.addStyleTag({ content: SEM_ANIM });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'ana.ribeiro@exemplo.com'); await P.type('#login-senha', 'senha-ficticia-1');
  return async () => {
    await P.click('#btn-entrar');
    await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
    await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
    await P.addStyleTag({ content: SEM_ANIM });
    await P.evaluate(() => {
      window.__copiado = null; window.__abertos = [];
      try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); } catch (e) { /* */ }
      window.open = (u) => { window.__abertos.push(String(u)); return {}; };
      /* gerador de PDF de mentira (o PDF real é testado à parte): só para a tela seguir */
      window.html2pdf = () => { const w = { set: () => w, from: () => w, toContainer: () => w, then: () => w, outputPdf: () => Promise.resolve(new Blob(['%PDF-1.4'], { type: 'application/pdf' })) }; return w; };
      const cria = URL.createObjectURL; URL.createObjectURL = (b) => cria.call(URL, b);
    });
  };
}

/* ================================== COMPUTADOR ================================== */
const D = await pagina(1440, 900);
const entrar = await login(D);
await tela(D, '01-login');
await entrar();
await tela(D, '02-dashboard');

/* cadastro */
await D.evaluate(() => window.irParaSecao('pacientes')); await espera(400);
await tela(D, '03-pacientes');
await clicar(D, '#btn-abrir-novo'); await espera(400);
await D.type('#np-nome', 'Marina Alves'); await D.type('#np-telefone', '(62) 99999-0000'); await D.type('#np-email', 'marina@exemplo.com');
await tela(D, '04-novo-paciente', { topo: false });
await D.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Cadastrar|Salvar paciente/i.test(x.textContent) && x.offsetParent && x.id !== 'btn-abrir-novo'); b.click(); });
await espera(1300);
const PID = await D.evaluate(() => window.pacienteAtivoId());
await tela(D, '05-ficha-nova');
await el(D, '#ficha-jornada', '05b-jornada');
await el(D, '#ficha-atendimento', '05c-atendimento-vazio');

/* Mapeamento Holístico */
await D.evaluate((pid) => window.levarParaFicha('aba:anamnese', pid), PID); await espera(900);
await tela(D, '06-mapeamento-antes');
await clicar(D, '[data-pc-acao="gerar"]'); await espera(1300);
await tela(D, '07-mapeamento-link');
await D.evaluate(() => { window.__copiado = null; const b = document.querySelector('[data-pc-acao="copiar"]'); if (b) b.click(); }); await espera(500);
const link = await D.evaluate(() => window.__copiado || '');
const token = (/#t=([^&\s]+)/.exec(link) || [])[1] || null;
console.log('  link do Mapeamento:', token ? 'ok' : 'SEM TOKEN');

/* a paciente no celular */
if (token) {
  const M = await pagina(390, 844, 2);
  await M.goto('http://127.0.0.1:5500/anamnese.html#t=' + token, { waitUntil: 'networkidle2' }); await M.addStyleTag({ content: SEM_ANIM });
  await tela(M, '08-celular-mapeamento-inicio', { inteira: true });
  await M.evaluate(() => { const b = document.getElementById('btn-seguir'); if (b) b.click(); }); await espera(700);
  await tela(M, '09-celular-mapeamento-etapa', { inteira: true });
  await M.close();
  const env = srv.tratar({ op: 'rpc', uid: null, nome: 'anamnese_publica_enviar', args: { p_token: token, p_conteudo: { tipo: 'primeira', formulario: FORM } } });
  console.log('  paciente enviou o Mapeamento:', env.error ? env.error.message : 'ok');
}
await D.evaluate(async (pid) => { if (window.PreConsulta) { window.PreConsulta.esquecer(); await window.PreConsulta.carregar(pid); } window.levarParaFicha('aba:anamnese', pid); }, PID); await espera(1000);
await tela(D, '10-mapeamento-recebido');
await clicar(D, '[data-pc-acao="revisado"]'); await espera(900);

/* atendimento */
await D.evaluate((pid) => window.levarParaFicha('aba:visao', pid), PID); await espera(500);
await clicar(D, '#ficha-atendimento [data-at-acao="novo"]'); await espera(500);
await tela(D, '11-novo-atendimento-modal', { topo: false });
await confirmarModal(D); await espera(1000);
await el(D, '#ficha-atendimento', '12-atendimento-ativo');

/* HOLOSCAN */
await D.evaluate(() => window.irParaSecao('holoscan')); await espera(600);
await tela(D, '13-holoscan-secao');
await clicar(D, '#btn-abrir-questionario'); await espera(700);
const nPerg = await D.evaluate((resp) => {
  const itens = [...document.querySelectorAll('.q-item[data-marcador]')];
  itens.slice(0, 6).forEach(it => { const v = resp[it.dataset.marcador] ?? 0; const b = it.querySelector('.q-btn[data-valor="' + v + '"]'); if (b) b.click(); });
  return itens.length;
}, RESP);
console.log('  perguntas do HOLOSCAN na tela:', nPerg);
await tela(D, '14-holoscan-questionario', { topo: false });
await D.evaluate((resp) => {
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach(it => { if (it.querySelector('.q-btn.marcado')) return; const v = resp[it.dataset.marcador] ?? 0; const b = it.querySelector('.q-btn[data-valor="' + v + '"]'); if (b) b.click(); });
  document.querySelector('[data-acao="calcular"]').click();
}, RESP); await espera(1000);
await tela(D, '15-holoscan-resultado');
await clicar(D, '#btn-salvar-holoscan'); await espera(1400);
await tela(D, '16-holoscan-salvo');
await tela(D, '16b-holoscan-salvo-inteira', { inteira: true });

/* ferramentas */
await D.evaluate(() => window.irParaSecao('corpo')); await espera(600);
await tela(D, '17-ferramentas-corpo');
await D.evaluate(() => window.irParaSecao('mente')); await espera(500); await tela(D, '17b-ferramentas-mente');
await D.evaluate(() => window.irParaSecao('espirito')); await espera(500); await tela(D, '17c-ferramentas-espirito');
await D.evaluate(() => { window.irParaSecao('corpo'); window.abrirFerramenta('vista-oq3'); }); await espera(700);
await D.evaluate(() => { const s = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  s('oq3-quer', 'Ter mais disposição à tarde'); s('oq3-precisa', 'Organizar o lanche da tarde'); s('oq3-consegue', 'Levar o lanche nos dias de escritório'); });
await tela(D, '18-ferramenta-oq3');
await clicar(D, '#btn-salvar-oq3'); await espera(1000);

/* Resultado HOLOS com o Playbook */
await D.evaluate((pid) => window.levarParaFicha('aba:resultado-holos', pid), PID);
await D.waitForFunction(() => !!document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'), { timeout: 15000 }).catch(() => null);
await tela(D, '19-resultado-holos-aba');
await clicar(D, '#aba-resultado-holos [data-rh-acao="playbook"]');
await D.waitForFunction(() => !!document.querySelector('#aba-resultado-holos .pb-wiz [data-pb-passo="2"]'), { timeout: 15000 }).catch(() => null); await espera(600);
await el(D, '#aba-resultado-holos [data-pb-passo="1"]', '20-playbook-1-leitura');
const foco = await D.evaluate(() => { const b = document.querySelector('[data-pb-acao="foco"]'); if (!b) return null; b.click(); return b.getAttribute('data-pb-id'); }); await espera(500);
console.log('  foco escolhido:', foco);
await el(D, '#aba-resultado-holos [data-pb-passo="2"]', '21-playbook-2-foco');
await D.evaluate(() => { const cs = [...document.querySelectorAll('[data-pb-passo="3"] [data-pb-est]')].slice(0, 3); cs.forEach(c => { if (!c.checked) c.click(); }); }); await espera(500);
await el(D, '#aba-resultado-holos [data-pb-passo="3"]', '22-playbook-3-estrategias');
await clicar(D, '[data-pb-acao="previa"]'); await espera(800);
await el(D, '#aba-resultado-holos [data-pb-passo="4"]', '23-playbook-4-previa');
await clicar(D, '[data-pb-acao="gerar"]'); await espera(1800);
await tela(D, '24-resultado-gerado');
await el(D, '.rh-ver-topo', '24b-resultado-botoes');

/* página Resultado: prévia e emitido */
await D.evaluate(() => window.irParaSecao('resultado')); await espera(1300);
await tela(D, '25-pagina-resultado-previa');
await clicar(D, '[data-rp-acao="emitir"]'); await espera(1500);
await tela(D, '26-pagina-resultado-emitido');
await el(D, '#rp-acoes', '26b-resultado-acoes');
await tela(D, '26c-documento-paciente', { inteira: true });

/* agenda */
await D.evaluate(async (pid) => { window.irParaSecao('agenda'); await new Promise(r => setTimeout(r, 300)); window.Agenda.novaConsultaPara(pid); }, PID); await espera(500);
await D.evaluate(() => { const am = new Date(Date.now() + 21 * 86400000); const s = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
  s('cf-data', am.getFullYear() + '-' + String(am.getMonth() + 1).padStart(2, '0') + '-' + String(am.getDate()).padStart(2, '0')); s('cf-hora', '10:00'); s('cf-tipo', 'Retorno'); });
await tela(D, '27-agenda-nova-consulta', { topo: false });
await clicar(D, '[data-salvar="consulta"]'); await espera(900);
await tela(D, '28-agenda');

/* dashboard com paciente, perfil */
await D.evaluate(() => window.irParaSecao('dashboard')); await espera(800); await tela(D, '29-dashboard-com-pacientes');
await D.evaluate(() => window.irParaSecao('perfil')); await espera(800); await tela(D, '30-perfil');
await tela(D, '30b-perfil-inteira', { inteira: true });
await D.evaluate(() => { const b = document.querySelector('[data-aba-perfil="ia"]'); if (b) b.click(); }); await espera(800); await tela(D, '31-perfil-assistente-ia');

/* retorno (paciente da fixture): Playbook do retorno com as decisões e o documento */
await D.evaluate(async (pid, eid) => { window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) {} window.levarParaFicha('aba:visao', pid); }, fx.PA, fx.E2 || fx.E1); await espera(900);
await tela(D, '32-ficha-retorno');
await D.evaluate((pid) => window.levarParaFicha('aba:evolucao', pid), fx.PA); await espera(900);
await tela(D, '33-evolucao');

await D.close();

/* ================================== CELULAR (WhatsApp) ================================== */
const C = await pagina(390, 844, 2);
await C.evaluateOnNewDocument(() => { navigator.canShare = () => true; navigator.share = () => new Promise(() => {}); });
const entrarC = await login(C); await entrarC();
await C.evaluate((pid) => window.levarParaFicha('aba:resultado-holos', pid), PID); await espera(1200);
const rid = srv.linhas('holos_results').filter(r => r.patient_id === PID && r.status !== 'rascunho').map(r => r.id).pop();
if (rid) { await C.evaluate((rid) => window.ResultadoHolos.abrirResultado(rid, 'paciente'), rid); await espera(800); }
await el(C, '.rh-ver-topo', '34-celular-resultado-ficha');
await C.close();

await nav.close(); if (servidor) servidor.close();
writeFileSync(OUT + 'lista.json', JSON.stringify(feitas, null, 1));
console.log(feitas.length + ' telas;', erros.length ? 'ERROS JS: ' + erros.slice(0, 5).join(' | ') : 'sem erro de JavaScript');
process.exit(0);
