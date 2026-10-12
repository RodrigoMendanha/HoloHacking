/**
 * HOLOS-V1 v3 PELA TELA (revisao das perguntas 12/10), servidor falso com os contratos das migrations:
 *   HOMOLOGACAO  com o v2 aprovado, ?homologacao=1 oferece "HOLOS-V1 v3 — revisão das perguntas"; gravar = em_revisao
 *                (nada aprovado); Aprovacao (Daniel) + Homologar pelos botoes de sempre; retirar o v2 pela tela
 *   QUESTIONARIO a tela mostra as perguntas do pacote vigente: 82 (48/19/15), textos novos, IDs trocados, removidas fora;
 *                o botao diz "82 perguntas"
 *   SALVAR       aplicacao nova no v3 (82 respostas; Acido Inflamatorio sobre 14, Mental sobre 24)
 *   ANTIGO       a aplicacao feita no v2 continua no v2, intacta
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const v2 = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };

/* uma aplicacao ANTIGA no v2 (antes da revisao) */
const PV = ins('patients', { nome: 'Paciente V2 Ficticia' }).id;
const EV = ins('encounters', { patient_id: PV, occurred_at: new Date(Date.now() - 86400000 * 5).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HV = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, v2.id, { patient_id: PV, encounter_id: EV, quando: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10) }) }).data;
const digitalV2 = JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV).length,
  srv.linhas('methodology_questions').filter(x => x.package_id === v2.id).map(x => x.stable_id + x.statement).join('|')]);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function entrar(url) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto(url, { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().length > 0, { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
const estado = (P) => P.evaluate(() => (document.getElementById('mh-estado') || {}).textContent || '');
const acao = (P, a, re) => P.evaluate(async (a, re) => {
  document.querySelector('[data-mh-acao="' + a + '"]').click();
  for (let i = 0; i < 80 && !new RegExp(re).test((document.getElementById('mh-estado') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 100));
}, a, re);

titulo('HOMOLOGACAO: GRAVAR, APROVAR E HOMOLOGAR O v3 PELA TELA');
const H = await entrar('http://127.0.0.1:5500/?homologacao=1');
await H.evaluate(async () => { document.querySelector('.nav-item[data-secao="metodologia"]').click(); await new Promise(r => setTimeout(r, 400)); });
const opcoes = await H.evaluate(() => [...document.querySelectorAll('[data-mh-pacote] option')].map(o => o.value + '=' + o.textContent));
ok(opcoes.some(o => /^revisao-v3=HOLOS-V1 v3 — revisão das perguntas/.test(o)), 'com o v2 aprovado, a tela oferece "HOLOS-V1 v3 — revisão das perguntas (não gravado)"');
await H.evaluate(async () => { const s = document.querySelector('[data-mh-pacote]'); s.value = 'revisao-v3'; s.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 300)); });
const prev = await H.evaluate(() => ({ txt: document.getElementById('metodologia-corpo').innerText, botao: (document.querySelector('[data-mh-acao="gravar-candidato"]') || {}).textContent || '' }));
ok(/82 itens/i.test(prev.txt) && /Gravar HOLOS-V1 v3 \(em_revisao, sem aprovar\)/.test(prev.botao), 'prévia do v3: 82 itens; botão "Gravar HOLOS-V1 v3 (em_revisao, sem aprovar)"');
await acao(H, 'gravar-candidato', 'gravada|Não foi possível');
const v3 = srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === 3);
ok(v3 && v3.status === 'em_revisao' && srv.linhas('methodology_questions').filter(x => x.package_id === v3.id).length === 82 && /Versão nova gravada/.test(await estado(H)),
  'v3 gravado em_revisao com 82 perguntas (nada aprovado)' + (v3 ? '' : ' [' + (await estado(H)) + ']'));
ok(!(await H.evaluate(() => [...document.querySelectorAll('[data-mh-pacote] option')].some(o => o.value === 'revisao-v3'))), 'gravado o v3, a opção de montar de novo some (sem versão duplicada)');
await H.evaluate(async () => {
  if (!document.getElementById('mh-hash-servidor')) { document.querySelector('[data-mh-acao="conferir-hash"]').click(); for (let i = 0; i < 40 && !document.getElementById('mh-hash-servidor'); i++) await new Promise(r => setTimeout(r, 50)); }
  const cx = document.querySelector('.mh-aprovar'); cx.querySelector('[data-mh-resp]').value = 'Daniel'; cx.querySelector('[data-mh-just]').value = 'revisão das perguntas conferida (teste)'; cx.querySelector('[data-mh-conferi]').checked = true;
});
await acao(H, 'registrar-aprovacao', 'registrada|recusada');
await acao(H, 'homologar', 'homologado|recusada');
const v3b = srv.linhas('methodology_packages').find(x => x.id === v3.id);
ok(v3b.status === 'aprovado' && v3b.effective_from, 'Aprovação de Daniel + Homologar: v3 aprovado, vigente desde ' + v3b.effective_from + ' [' + (await estado(H)) + ']');
await H.evaluate(async (id) => { window.MetodologiaHomologacao.selecionar(id); window.MetodologiaHomologacao.desenhar(); await new Promise(r => setTimeout(r, 200)); }, v2.id);
const temRetirar = await H.evaluate(() => !!document.querySelector('[data-mh-acao="retirar"]'));
ok(temRetirar, 'no v2 aprovado, com o v3 aprovado, a tela oferece "Retirar esta versão"');
await H.evaluate(() => { document.querySelector('[data-mh-retirar-resp]').value = 'Daniel'; });
await acao(H, 'retirar', 'retirada|recusada');
ok(srv.linhas('methodology_packages').find(x => x.id === v2.id).status === 'retirado', 'v2 retirado pela tela (aplicações novas usam o v3) [' + (await estado(H)) + ']');

titulo('QUESTIONARIO: AS PERGUNTAS DO PACOTE VIGENTE');
const A = await entrar('http://127.0.0.1:5500/');
const PN = ins('patients', { nome: 'Paciente V3 Ficticia' }).id;
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
const tela = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 600000).toISOString() });
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 250));
  const botao = document.getElementById('btn-abrir-questionario').textContent;
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 250));
  const itens = [...document.querySelectorAll('.q-item')];
  const texto = (id) => ((document.querySelector('.q-item[data-marcador="' + id + '"] .q-pergunta') || {}).textContent || null);
  return { botao, n: itens.length, porBloco: [...document.querySelectorAll('.q-bloco')].map(b => b.querySelectorAll('.q-item').length).join('/'),
    snt101: texto('SNT-101'), snt104: texto('SNT-104'), snt112: texto('SNT-112'), snt411: texto('SNT-411'), snt511: texto('SNT-511'),
    snt209: texto('SNT-209'), esp102: texto('ESP-102'), snt106: texto('SNT-106'), esp404: texto('ESP-404'),
    botoes411: [...(document.querySelectorAll('.q-item[data-marcador="SNT-411"] .q-btn'))].map(b => b.textContent.replace(/^\d/, '')).join('/') };
}, PN);
ok(tela.n === 82 && tela.porBloco === '48/19/15' && /82 perguntas/.test(tela.botao), '82 perguntas na tela (48/19/15) e o botão diz "' + tela.botao.trim() + '"');
ok(tela.snt101 === 'Você sente uma forte vontade de ingerir doces ou pães quase todo dia?' && /sapinho/.test(tela.snt104), 'textos revisados na tela (SNT-101, SNT-104 com "sapinho")');
ok(/coceira no corpo/.test(tela.snt112) && /gosto metálico/.test(tela.snt411) && /triste e insatisfeito/.test(tela.snt511), 'perguntas trocadas com ID novo: SNT-112, SNT-411, SNT-511');
ok(tela.snt209 === null && tela.esp102 === null && tela.snt106 === null && tela.esp404 !== null, 'SNT-209 e ESP-102 não são mais perguntadas; SNT-106 saiu (virou SNT-112); ESP-404 continua');
ok(tela.botoes411 === 'Nunca/Às vezes/Frequente/Sempre', 'SNT-411 com a escala de frequência: ' + tela.botoes411);

titulo('SALVAR NO v3');
await A.evaluate(async () => {
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it, i) => { const b = it.querySelectorAll('.q-btn')[(i * 7) % 4]; if (!b.classList.contains('marcado')) b.click(); });
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 700));
  document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 1500));
});
const appN = srv.linhas('holoscan_applications').find(a => a.patient_id === PN);
const resp = appN ? srv.linhas('holoscan_answers').filter(a => a.application_id === appN.id) : [];
const notas = appN ? srv.linhas('holoscan_system_scores').filter(s => s.application_id === appN.id) : [];
ok(appN && appN.methodology_package_id === v3.id && appN.methodology_package_version === 3 && resp.length === 82 && !resp.some(r => ['SNT-209', 'ESP-102', 'SNT-106', 'SNT-410', 'SNT-507'].includes(r.marcador_id)),
  'HOLOSCAN novo salvo no v3: 82 respostas, nenhuma de pergunta removida ou trocada');
ok(notas.find(s => s.sistema === 'acido_inflamatorio')?.total_marcadores === 14 && notas.find(s => s.sistema === 'mental_emocional_espiritual')?.total_marcadores === 24,
  'notas do v3: Ácido Inflamatório sobre 14 perguntas, Mental Emocional Espiritual sobre 24');

titulo('APLICACAO ANTIGA NO v2');
ok(JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV).length,
  srv.linhas('methodology_questions').filter(x => x.package_id === v2.id).map(x => x.stable_id + x.statement).join('|')]) === digitalV2,
  'a aplicação feita no v2 e as 84 perguntas do v2 continuam idênticas (o v2 só foi retirado para aplicações novas)');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nquestionario v3: tudo ok');
process.exit(falhou ? 1 : 0);
