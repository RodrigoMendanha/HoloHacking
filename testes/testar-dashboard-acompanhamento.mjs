/**
 * DASHBOARD 12/10 — topo claro, "Em acompanhamento", "Acompanhamento dos pacientes", Perfil no topo.
 * Servidor falso com os contratos das migrations; pacientes FICTICIOS, um em cada etapa, cada etapa vinda de dado real:
 *   Aguardando anamnese   convite enviado e no prazo            Anamnese recebida   convite concluido, nao usado
 *   HOLOSCAN em andamento questionario com respostas guardadas   Resultado pronto    Resultado HOLOS salvo, sem emissao
 *   Resultado apresentado Resultado Final emitido                Aguardando retorno  ja atendido + consulta marcada a frente
 *   sem etapa             paciente so cadastrado (nao conta)     convite vencido / revogado (nao conta)
 * Tambem: nenhum "Pendências"/"Precisa de você"; Agenda de Hoje vazia elegante e com atendimento; perfil do topo
 * (clique, Enter, Espaco, aria-label); 390px sem rolagem lateral. SHOT_DIR=<pasta> grava as capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';
import { comFoco } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = () => new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Ana Ficticia Lima', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora(), updated_at: agora() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const dia = (n) => { const d = new Date(Date.now() + n * 86400000); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const pac = (nome) => ins('patients', { nome }).id;
const enc = (pid, diasAtras) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - diasAtras * 86400000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const convite = (pid, extra) => srv.tabelas.anamnesis_invites.push(Object.assign({ id: globalThis.crypto.randomUUID(), nutritionist_id: UA, patient_id: pid, encounter_id: null, status: 'enviado', form_version: 2, form_tipo: 'primeira',
  expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), draft_content: null, submitted_content: null, save_count: 0, professional_snapshot: {}, imported_anamnesis_id: null, imported_at: null,
  created_at: new Date(Date.now() - 86400000).toISOString(), started_at: null, last_saved_at: null, submitted_at: null, revoked_at: null }, extra || {}));
const resultado = (pid, eid) => {
  const h = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: pid, encounter_id: eid, quando: dia(-3) }) }).data;
  const r = rpc('salvar_resultado_holos', comFoco({ payload: { patient_id: pid, encounter_id: eid, holoscan_application_id: h, tool_application_ids: [] } }));
  if (r.error) throw new Error('resultado: ' + r.error.message);
  return r.data;
};

const P = {
  mariana: pac('Mariana Souza Ficticia'), beatriz: pac('Beatriz Nogueira Ficticia'), camila: pac('Camila Torres Ficticia'),
  felipe: pac('Felipe Andrade Ficticio'), helena: pac('Helena Prado Ficticia'), juliana: pac('Juliana Martins Ficticia'),
  lucas: pac('Lucas Ribeiro Ficticio'), vencido: pac('Otavio Vencido Ficticio')
};
convite(P.mariana);
convite(P.beatriz, { status: 'concluido', submitted_content: { ficticio: true }, submitted_at: new Date(Date.now() - 2 * 3600000).toISOString(), started_at: agora() });
convite(P.vencido, { expires_at: new Date(Date.now() - 86400000).toISOString() });
const eF = enc(P.felipe, 3); resultado(P.felipe, eF);
const eH = enc(P.helena, 10); const rH = resultado(P.helena, eH);
const em = rpc('emitir_resultado_final', { payload: { holos_result_id: rH } });
enc(P.juliana, 20); ins('consultations', { patient_id: P.juliana, data: dia(5), hora: '14:00', tipo: 'retorno' });

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function entrar(largura, altura, escuro) {
  const A = await (await nav.createBrowserContext()).newPage();
  await A.setViewport({ width: largura, height: altura || 1000 });
  A.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(A, srv);
  await A.evaluateOnNewDocument((pid, escuro) => {
    setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80);
    // HOLOSCAN em andamento: rascunho do questionario guardado neste aparelho (como a tela grava)
    localStorage.setItem('holohacking.questionario', JSON.stringify({ [pid]: { 'SNT-101': 1, 'SNT-102': 2, 'SNT-103': 0 } }));
    localStorage.setItem('holohacking.aparencia', escuro ? 'escuro' : 'claro');
  }, P.camila, !!escuro);
  await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await A.waitForSelector('#login-email', { visible: true });
  await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
  await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await A.evaluate(async (escuro) => { if (window.definirAparencia) window.definirAparencia(escuro ? 'escuro' : 'claro'); if (window.irParaSecao) window.irParaSecao('dashboard'); }, !!escuro);
  await A.waitForFunction(() => document.querySelectorAll('#dash-lista-acompanhamento .dash-acomp').length >= 6, { timeout: 15000 }).catch(() => {});
  await A.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await espera(300);
  return A;
}

titulo('ETAPAS DERIVADAS DE DADOS REAIS');
const A = await entrar(1440, 1100);
const tela = await A.evaluate(() => ({
  linhas: [...document.querySelectorAll('#dash-lista-acompanhamento .dash-acomp')].map(b => ({ nome: b.querySelector('b').textContent, etapa: b.dataset.etapa, status: b.querySelector('.dash-status').textContent.trim(),
    destino: b.dataset.destino, data: b.querySelector('.dash-acomp-data').textContent.trim(), sub: b.querySelector('.dash-porque').textContent })),
  tiles: [...document.querySelectorAll('#secao-dashboard .dash-resumo .dash-tile')].map(t => t.querySelector('b').textContent + '|' + t.querySelector('span').textContent),
  frase: document.querySelector('#secao-dashboard .dash-cabeca p').textContent,
  texto: document.getElementById('dash-trabalho').innerText,
  titulos: [...document.querySelectorAll('#dash-trabalho .dash-titulo')].map(h => h.childNodes[0].textContent.trim())
}));
const de = (n) => tela.linhas.find(l => l.nome.startsWith(n));
ok(de('Mariana')?.etapa === 'aguardando_anamnese' && de('Mariana').status === 'Aguardando Mapeamento', 'convite enviado e no prazo → Aguardando Mapeamento');
ok(de('Beatriz')?.etapa === 'anamnese_recebida' && de('Beatriz').status === 'Mapeamento recebido', 'convite concluído e ainda não usado → Mapeamento recebido');
ok(de('Camila')?.etapa === 'holoscan_andamento' && /3 de 84 respondidas/.test(de('Camila').sub), 'questionário com respostas guardadas → HOLOSCAN em andamento (' + (de('Camila') || {}).sub + ')');
ok(de('Felipe')?.etapa === 'resultado_pronto', 'Resultado HOLOS salvo sem emissão → Resultado pronto');
ok(!em.error && de('Helena')?.etapa === 'resultado_apresentado', 'Resultado Final emitido → Resultado apresentado' + (em.error ? ' [' + em.error.message + ']' : ''));
const dj = de('Juliana');
ok(dj?.etapa === 'aguardando_retorno' && dj.destino === 'consulta' && /às 14:00/.test(dj.sub) && dj.data.length === 10, 'já atendida + consulta marcada à frente → Aguardando retorno (' + (dj || {}).data + ')');
ok(!de('Lucas') && !de('Otavio'), 'só cadastrado e convite vencido NÃO entram (nenhuma etapa inventada)');
ok(tela.linhas.map(l => l.etapa).join(',') === 'aguardando_anamnese,anamnese_recebida,holoscan_andamento,resultado_pronto,resultado_apresentado,aguardando_retorno', 'lista na ordem da jornada');
ok(tela.tiles.join(' / ') === '8|Pacientes ativos / 0|Atendimentos hoje / ' + tela.tiles[2].split('|')[0] + '|Próxima consulta / 6|Em acompanhamento', 'cards: ' + tela.tiles.join(' · '));
ok(/Você tem 6 pacientes em acompanhamento na sua carteira/.test(tela.frase), 'saudação: "' + tela.frase + '"');
ok(!/pendênc|Precisa de você|Alta prioridade|Média|Baixa/i.test(tela.texto), 'nenhum "Pendências", "Precisa de você" nem prioridade no Dashboard');
ok(tela.titulos.join(' | ') === 'Agenda de Hoje | Acompanhamento dos pacientes', 'só dois blocos abaixo do topo, lado a lado: ' + tela.titulos.join(' | '));
ok(!/Primeiros passos|Jornada clínica|Pacientes recentes|Próximas consultas marcadas|sem conduta salva|Rascunhos|Novo paciente|Abrir HOLOSCAN/.test(tela.texto),
  'tela limpa: sem Primeiros passos, Jornada clínica, recentes, próximas consultas, rascunhos, sem conduta nem botões extras no topo');
const pinha = await A.evaluate(() => { const el = document.querySelector('#secao-dashboard .dash-hero .dash-hero-pinha'); return el ? getComputedStyle(el).backgroundImage : ''; });
ok(/logo-holohacking\.png/.test(pinha), 'a pinha da marca é o fundo do topo marfim');
const vazio = await A.evaluate(() => { const b = document.getElementById('dash-agenda-hoje'); return { t: b.innerText, nova: !!b.querySelector('[data-destino="nova-consulta"]'), abrir: !!b.querySelector('[data-destino="agenda"]') }; });
ok(/Nenhuma consulta hoje/.test(vazio.t) && /revisar seus pacientes/.test(vazio.t) && vazio.nova && vazio.abrir, 'Agenda de Hoje vazia: estado elegante + "Nova consulta" + "Abrir agenda"');
const cores = await A.evaluate(() => [...document.querySelectorAll('#secao-dashboard .dash-status')].map(s => getComputedStyle(s).color));
ok(!cores.some(c => { const m = c.match(/\d+/g).map(Number); return m[0] > 180 && m[1] < 90 && m[2] < 90; }), 'nenhum status em vermelho de alerta');
const hero = await A.evaluate(() => { const h = document.querySelector('#secao-dashboard .dash-hero'); const cs = getComputedStyle(h); const t = getComputedStyle(h.querySelector('h2'));
  return { fundo: cs.backgroundImage + cs.backgroundColor, texto: t.color }; });
ok(/247, 242, 230|245, 239, 225/.test(hero.fundo) && /15, 59, 43/.test(hero.texto), 'topo marfim (não branco puro) com título verde');
if (SHOT) { await A.screenshot({ path: SHOT + '/dashboard-1440-claro.png', fullPage: true }); }

titulo('CLIQUES');
const ir = async (nome) => A.evaluate(async (n) => {
  window.irParaSecao('dashboard'); await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('#dash-lista-acompanhamento .dash-acomp')].find(b => b.querySelector('b').textContent.startsWith(n)).click();
  await new Promise(r => setTimeout(r, 400));
  return { secao: (document.querySelector('.secao.ativa') || {}).id, aba: (document.querySelector('#secao-pacientes .aba.ativa[data-aba]') || { dataset: {} }).dataset.aba || null, pid: window.pacienteAtivoId() };
}, nome);
const c1 = await ir('Beatriz');
ok(c1.secao === 'secao-pacientes' && c1.aba === 'anamnese' && c1.pid === P.beatriz, 'Mapeamento recebido → ficha da paciente, aba Anamnese');
const c2 = await ir('Camila');
ok(c2.secao === 'secao-holoscan' && c2.pid === P.camila, 'HOLOSCAN em andamento → HOLOSCAN da paciente');
const c3 = await ir('Felipe');
ok(c3.secao === 'secao-resultado' && c3.pid === P.felipe, 'Resultado pronto → página Resultado da paciente');
const c4 = await ir('Juliana');
ok(c4.secao === 'secao-agenda', 'Aguardando retorno → a consulta na Agenda');
const t5 = await A.evaluate(async () => { window.irParaSecao('dashboard'); await new Promise(r => setTimeout(r, 200));
  document.querySelector('#secao-dashboard .dash-tile[data-destino="acompanhamento"]').click(); await new Promise(r => setTimeout(r, 300));
  return document.activeElement && document.activeElement.classList.contains('dash-acomp'); });
ok(t5, 'card "Em acompanhamento" leva ao bloco e foca a primeira linha');

titulo('PERFIL NO TOPO');
const chip = await A.evaluate(() => { const c = document.getElementById('chip-perfil');
  return { nome: document.getElementById('chip-nome').textContent, papel: document.getElementById('chip-papel').textContent, av: document.getElementById('chip-avatar').textContent,
    role: c.getAttribute('role'), tab: c.tabIndex, aria: c.getAttribute('aria-label'), cursor: getComputedStyle(c).cursor }; });
ok(chip.nome === 'Ana Ficticia Lima' && chip.papel === 'Nutricionista' && chip.av === 'AL', 'topo mostra iniciais, nome e profissão do Perfil: ' + chip.av + ' · ' + chip.nome + ' · ' + chip.papel);
ok(chip.role === 'button' && chip.tab === 0 && chip.aria === 'Abrir meu perfil' && chip.cursor === 'pointer', 'acessível: role=button, tabindex 0, aria-label "Abrir meu perfil", cursor pointer');
const viaClique = await A.evaluate(async () => { window.irParaSecao('dashboard'); document.getElementById('chip-perfil').click(); await new Promise(r => setTimeout(r, 200)); return document.querySelector('.secao.ativa').id; });
ok(viaClique === 'secao-perfil', 'clique abre o Perfil');
for (const tecla of ['Enter', ' ']) {
  await A.evaluate(() => { window.irParaSecao('dashboard'); document.getElementById('chip-perfil').focus(); });
  await A.keyboard.press(tecla === ' ' ? 'Space' : tecla); await espera(200);
  ok((await A.evaluate(() => document.querySelector('.secao.ativa').id)) === 'secao-perfil', (tecla === ' ' ? 'Espaço' : 'Enter') + ' no perfil do topo abre o Perfil');
}

titulo('AGENDA DE HOJE COM ATENDIMENTO');
const PH = pac('Hoje Atendida Ficticia');
ins('consultations', { patient_id: PH, data: dia(0), hora: '23:59', tipo: 'primeira consulta' });
await A.evaluate(async () => { if (window.Agenda && window.Agenda.carregar) await window.Agenda.carregar(); if (window.recarregarPacientes) await window.recarregarPacientes(); window.irParaSecao('dashboard'); window.redesenharDashboard(); await new Promise(r => setTimeout(r, 300)); });
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.evaluate(async () => { window.irParaSecao('dashboard'); await new Promise(r => setTimeout(r, 600)); });
const hoje = await A.evaluate(() => ({ linhas: [...document.querySelectorAll('#dash-lista-hoje .dash-pendente')].map(l => l.innerText.replace(/\s+/g, ' ')), tile: [...document.querySelectorAll('#secao-dashboard .dash-tile')].find(t => /Atendimentos hoje/.test(t.innerText)).querySelector('b').textContent }));
ok(hoje.linhas.length === 1 && /23:59/.test(hoje.linhas[0]) && hoje.tile === '1', 'consulta de hoje aparece na Agenda de Hoje e conta em "Atendimentos hoje": ' + hoje.linhas.join(' | '));

titulo('TELAS MENORES');
for (const [w, h, nome] of [[1280, 900, 'dashboard-1280'], [900, 1100, 'dashboard-tablet-900'], [390, 844, 'dashboard-390']]) {
  const B = await entrar(w, h, true);
  const m = await B.evaluate(() => ({ lateral: document.documentElement.scrollWidth - window.innerWidth,
    colunas: getComputedStyle(document.querySelector('#secao-dashboard .dash-resumo')).gridTemplateColumns.split(' ').length,
    duas: getComputedStyle(document.querySelector('#secao-dashboard .dash-colunas')).gridTemplateColumns.split(' ').length }));
  ok(m.lateral <= 0, w + 'px: sem rolagem lateral');
  if (w === 390) ok(m.colunas === 2 && m.duas === 1, '390px: cards em 2×2; Agenda e Acompanhamento empilhados');
  if (w === 1280) ok(m.duas === 2, '1280px: Agenda e Acompanhamento lado a lado');
  if (SHOT) await B.screenshot({ path: SHOT + '/' + nome + '-escuro.png', fullPage: true });
}
if (SHOT) { const B = await entrar(1440, 1100, true); await B.screenshot({ path: SHOT + '/dashboard-1440-escuro.png', fullPage: true }); }

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\ndashboard acompanhamento: tudo ok');
process.exit(falhou ? 1 : 0);
