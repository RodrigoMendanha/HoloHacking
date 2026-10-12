/**
 * HOLOS-V1 v3 PELA TELA (revisao das perguntas 12/10), servidor falso com os contratos das migrations:
 *   PUBLICACAO   (12/10, sem homologacao) o responsavel metodologico entra e o v3 do codigo e gravado e publicado
 *                sozinho (validador + hash do servidor), o v2 sai do ar; outra conta nao publica; a tela so consulta
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
const v2 = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01', manterAprovador: true });
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
async function entrar(url, email, senha, comPacote) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto(url, { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email || 'a@holo.test'); await P.type('#login-senha', senha || 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  if (comPacote !== false) await P.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().length > 0, { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
titulo('PUBLICACAO DIRETA: O v3 ENTRA NO AR SOZINHO, SEM APROVACAO NEM HOMOLOGACAO');
/* outra conta (sem papel, sem pacote): entrar nao publica nada */
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
srv.tabelas.profiles.push({ id: UB, nome: 'Outra Ficticia', registro: 'CRN-0 0001', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const B = await entrar('http://127.0.0.1:5500/', 'b@holo.test', 'senha-b-123', false);
await espera(1200);
ok(!srv.linhas('methodology_packages').some(x => x.version === 3), 'outra conta entra: nada é publicado (só o responsável metodológico publica)');
await B.close();
const aprovacoesAntes = srv.linhas('methodology_package_approvals').length;
const A = await entrar('http://127.0.0.1:5500/');
await A.waitForFunction(() => window.PacoteMetodologico.todos().some(p => p.version === 3 && p.status === 'aprovado'), { timeout: 15000 }).catch(() => {});
const v3 = srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === 3);
const hoje = new Date().toISOString().slice(0, 10);
const v2b = srv.linhas('methodology_packages').find(x => x.id === v2.id);
ok(v3 && v3.status === 'aprovado' && v3.governance_regime === 'publicacao_direta' && v3.effective_from === hoje && srv.linhas('methodology_questions').filter(x => x.package_id === v3.id).length === 82,
  'o responsável metodológico entra: o v3 (82 perguntas) é gravado e publicado hoje, regime publicação direta');
ok(srv.linhas('methodology_package_approvals').length === aprovacoesAntes && srv.linhas('methodology_homologation_records').some(r => r.package_id === v3.id && r.source === 'publicacao direta'),
  'nenhuma Aprovação registrada; só o registro de auditoria da publicação');
ok(v2b.status === 'retirado' && v2b.effective_to < hoje, 'o v2 sai do ar sozinho (retirado, vigente até ontem) [' + v2b.status + ' ' + v2b.effective_to + ']');
ok(v3.content_hash === rpc('metodologia_hash_conteudo', { p_package_id: v3.id }).data, 'o hash gravado é o do servidor (o mesmo que o salvar do HOLOSCAN confere)');
const H = await entrar('http://127.0.0.1:5500/?homologacao=1');
await espera(800);
ok(srv.linhas('methodology_packages').filter(x => x.version === 3).length === 1, 'entrar de novo não grava outra versão (idempotente)');
await H.evaluate(async () => { document.querySelector('.nav-item[data-secao="metodologia"]').click(); await new Promise(r => setTimeout(r, 400)); });
const telaM = await H.evaluate(() => ({ botoes: [...document.querySelectorAll('[data-mh-acao]')].map(b => b.dataset.mhAcao), txt: document.getElementById('metodologia-corpo').innerText }));
ok(!telaM.botoes.some(b => /aprovacao|homologar|retirar|gravar|importar|hash/.test(b)) && !/Registrar Aprovação|Homologar pacote/.test(telaM.txt),
  'a tela de Metodologia é só consulta: sem Registrar Aprovação, Homologar, Retirar ou Gravar (' + telaM.botoes.join(',') + ')');
await H.close();

titulo('QUESTIONARIO: AS PERGUNTAS DO PACOTE VIGENTE');
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
