/**
 * HOLOS-V1 v4 PELA TELA (decisoes de 13/10: SNT-210/SNT-309 removidas, 13 EMO no Sistema Mental Emocional Espiritual),
 * servidor falso com os contratos das migrations:
 *   PUBLICACAO   como em producao, o v3 no ar e o rascunho de 12/10 (publicado por engano);
 *                o responsavel metodologico entra e o v4 do codigo e gravado e publicado sozinho (validador + hash do
 *                servidor), o v2 sai do ar; outra conta nao publica; a tela so consulta
 *   QUESTIONARIO a tela mostra as perguntas do pacote vigente: 82 (47/19/16), mesmos textos do v2, SNT-210/309 fora;
 *                o botao diz "82 perguntas"
 *   SALVAR       aplicacao nova no v4 (82 respostas; Fungico 12, Acido Inflamatorio 11, Metabolico 10, Detox 12, MEE 37)
 *   MR-V1        (teste 24) o Resultado HOLOS de uma aplicacao v4 mostra as EMO movidas nos sinais dominantes do MEE e
 *                nenhuma EMO nem SNT-210/309 nos sistemas fisicos
 *   ANTIGO       (testes 22 e 25) a aplicacao, o Resultado HOLOS e a emissao RF (PDF) feitos no v2 continuam identicos
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial, candidatoV1 } from './holos-aprovado.mjs';
import { readFileSync } from 'node:fs';

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
/* ... com Resultado HOLOS salvo e Resultado Final emitido (RF) no v2 */
const RV = rpc('salvar_resultado_holos', { payload: { patient_id: PV, encounter_id: EV, holoscan_application_id: HV, tool_application_ids: [], operation_id: 'op-v2-ficticia' } });
if (RV.error) throw new Error('salvar_resultado_holos v2: ' + RV.error.message);
const EMV = rpc('emitir_resultado_final', { payload: { holos_result_id: RV.data, operation_id: 'em-v2-ficticia' } });
if (EMV.error) throw new Error('emitir_resultado_final v2: ' + EMV.error.message);
const digitalV2 = JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV),
  srv.linhas('holoscan_system_scores').filter(x => x.application_id === HV),
  srv.linhas('methodology_questions').filter(x => x.package_id === v2.id).map(x => x.stable_id + x.statement).join('|'),
  srv.linhas('methodology_associations').filter(x => x.package_id === v2.id).map(x => x.question_stable_id + '>' + x.destination_id + ':' + x.role + ':' + x.weight).join('|')]);
const digitalResultadoV2 = JSON.stringify([srv.linhas('holos_results').find(r => r.id === RV.data), srv.linhas('holos_result_emissions').find(e => e.id === EMV.data.id)]);
const dominantesV2 = srv.linhas('holos_results').find(r => r.id === RV.data).content_snapshot.holoscan.sistemas;

/* como em producao (13/10 05:37 UTC): um navegador com o front antigo publicou o RASCUNHO de 12/10 como v3 */
const caixa = {};
new Function('window', 'globalThis', readFileSync(new URL('../docs/v1/metodologia/historico/rascunho-revisao-v3-2026-10-12.js', import.meta.url), 'utf8'))(caixa, caixa);
const baseV2 = candidatoV1(); baseV2.status = 'aprovado';
const errado = semearHolosAprovado(srv, UA, { pacote: globalThis.PacoteMetodologico.aplicarRevisao(baseV2, caixa.MetodologiaRevisaoV3), aprovar: false });
if (rpc('publicar_pacote_metodologico', { p_package_id: errado.id }).error) throw new Error('fixture: publicar o v3 errado');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function entrar(url, email, senha, comPacote) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  /* este teste e o registro da publicacao da v4: simula o front da epoca da v4 (sem a revisao do Lote 2B, que
     publicaria a v5 no mesmo login). A v5 tem o seu proprio teste: testar-questionario-v5.mjs */
  await P.evaluateOnNewDocument(() => { Object.defineProperty(window, 'MetodologiaRevisaoV5', { configurable: false, get: () => undefined, set: () => {} }); });
  await P.goto(url, { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email || 'a@holo.test'); await P.type('#login-senha', senha || 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  if (comPacote !== false) await P.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().length > 0, { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
titulo('PUBLICACAO DIRETA: O v4 (DECISOES DE 13/10) ENTRA NO AR SOZINHO E RETIRA O v3 ERRADO');
/* outra conta (sem papel, sem pacote): entrar nao publica nada */
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
srv.tabelas.profiles.push({ id: UB, nome: 'Outra Ficticia', registro: 'CRN-0 0001', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const B = await entrar('http://127.0.0.1:5500/', 'b@holo.test', 'senha-b-123', false);
await espera(1200);
ok(!srv.linhas('methodology_packages').some(x => x.version === 4), 'outra conta entra: nada é publicado (só o responsável metodológico publica)');
await B.close();
const aprovacoesAntes = srv.linhas('methodology_package_approvals').length;
const A = await entrar('http://127.0.0.1:5500/');
await A.waitForFunction(() => window.PacoteMetodologico.todos().some(p => p.version === 4 && p.status === 'aprovado'), { timeout: 15000 }).catch(() => {});
const v3 = srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === 4);   // o pacote novo (v4)
const hoje = new Date().toISOString().slice(0, 10);
const v2b = srv.linhas('methodology_packages').find(x => x.id === v2.id);
ok(v3 && v3.status === 'aprovado' && v3.governance_regime === 'publicacao_direta' && v3.effective_from === hoje && srv.linhas('methodology_questions').filter(x => x.package_id === v3.id).length === 82,
  'o responsável metodológico entra: o v4 (82 perguntas, decisões de 13/10) é gravado e publicado hoje, regime publicação direta');
ok(v3.lineage && v3.lineage.revisao === 'HOLOS-V1-DECISOES-2026-10-13' && v3.lineage.parent_version === 2, 'o v4 vem do v2 com as decisões de 13/10 (não do v3 errado)');
ok(srv.linhas('methodology_package_approvals').length === aprovacoesAntes && srv.linhas('methodology_homologation_records').some(r => r.package_id === v3.id && r.source === 'publicacao direta'),
  'nenhuma Aprovação registrada; só o registro de auditoria da publicação');
const erradoDepois = srv.linhas('methodology_packages').find(x => x.id === errado.id);
ok(erradoDepois.status === 'retirado' && erradoDepois.version === 3 && v2b.status === 'retirado', 'o v3 errado sai do ar sozinho (retirado, fica no histórico); o v2 continua retirado [' + erradoDepois.status + ']');
ok(v3.content_hash === rpc('metodologia_hash_conteudo', { p_package_id: v3.id }).data, 'o hash gravado é o do servidor (o mesmo que o salvar do HOLOSCAN confere)');
const H = await entrar('http://127.0.0.1:5500/?homologacao=1');
await espera(800);
ok(srv.linhas('methodology_packages').filter(x => x.version === 4).length === 1 && srv.linhas('methodology_packages').length === 3, 'entrar de novo não grava outra versão (idempotente)');
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
    snt210: texto('SNT-210'), snt309: texto('SNT-309'), emo101: texto('EMO-101'), emo403: texto('EMO-403'), snt101: texto('SNT-101'), snt209: texto('SNT-209'), esp102: texto('ESP-102'), snt106: texto('SNT-106'), snt112: texto('SNT-112') };
}, PN);
ok(tela.n === 82 && tela.porBloco === '47/19/16' && tela.botao.trim() === 'Aplicar HOLOSCAN', '82 perguntas na tela (47/19/16); o botão diz só "' + tela.botao.trim() + '" (sem quantidade)');
const v2q = (id) => (srv.linhas('methodology_questions').find(x => x.package_id === v2.id && x.stable_id === id) || {}).statement;
ok(tela.snt210 === null && tela.snt309 === null, 'SNT-210 (PCR/VHS) e SNT-309 (triglicerídeos/HDL) não são mais perguntadas');
ok(['EMO-101', 'EMO-403', 'SNT-101'].every(id => tela[id.toLowerCase().replace('-', '')] === v2q(id)), 'as perguntas movidas e as demais têm o mesmo texto do v2 (nenhum texto revisado nesta versão)');
ok(tela.snt209 !== null && tela.esp102 !== null && tela.snt106 !== null && tela.snt112 === null, 'nada do rascunho de 12/10: SNT-209, ESP-102 e SNT-106 continuam; SNT-112 não existe');

titulo('SALVAR NO v4');
await A.evaluate(async () => {
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it, i) => { const b = it.querySelectorAll('.q-btn')[(i * 7) % 4]; if (!b.classList.contains('marcado')) b.click(); });
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 700));
  document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 1500));
});
const appN = srv.linhas('holoscan_applications').find(a => a.patient_id === PN);
const resp = appN ? srv.linhas('holoscan_answers').filter(a => a.application_id === appN.id) : [];
const notas = appN ? srv.linhas('holoscan_system_scores').filter(s => s.application_id === appN.id) : [];
ok(appN && appN.methodology_package_id === v3.id && appN.methodology_package_version === 4 && resp.length === 82 && !resp.some(r => ['SNT-210', 'SNT-309'].includes(r.marcador_id)),
  'HOLOSCAN novo salvo no v4: 82 respostas, nenhuma de SNT-210/SNT-309');
const den = Object.fromEntries(notas.map(s => [s.sistema, s.total_marcadores]));
ok(den.fungico === 12 && den.acido_inflamatorio === 11 && den.metabolico === 10 && den.detox_linfatico === 12 && den.mental_emocional_espiritual === 37,
  'notas do v4 com os denominadores novos: Fúngico 12, Ácido Inflamatório 11, Metabólico 10, Detox 12, MEE 37 (' + JSON.stringify(den) + ')');

titulo('MR-V1 NO v4 (teste 24)');
const MOVIDAS = ['EMO-101', 'EMO-102', 'EMO-103', 'EMO-201', 'EMO-202', 'EMO-203', 'EMO-204', 'EMO-301', 'EMO-302', 'EMO-303', 'EMO-401', 'EMO-402', 'EMO-403'];
/* as 13 com resposta maxima, o resto zerado: os dominantes do MEE tem de vir delas */
srv.tabelas.holoscan_answers.filter(r => r.application_id === appN.id).forEach(r => { const q3 = srv.linhas('methodology_questions').find(x => x.package_id === v3.id && x.stable_id === r.marcador_id); r.valor = MOVIDAS.includes(r.marcador_id) ? 3 : (q3.orientation === 'invertida' ? 3 : 0); });
const RN = rpc('previa_resultado_holos', { payload: { patient_id: PN, encounter_id: appN.encounter_id, holoscan_application_id: appN.id, tool_application_ids: [] } });
const sis = RN.data ? Object.fromEntries(RN.data.holoscan.sistemas.map(s => [s.sistema, s])) : {};
const domIds = (s) => (sis[s] ? sis[s].dominantes : []).map(d => d.question_id);
ok(!RN.error && domIds('mental_emocional_espiritual').join(',') === 'EMO-101,EMO-102,EMO-103',
  'Resultado HOLOS (MR-V1) de uma aplicação v4: sinais dominantes do MEE são as EMO movidas (empate pelo ID: ' + domIds('mental_emocional_espiritual').join(', ') + ')');
ok(['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico'].every(s => sis[s] && !domIds(s).some(id => /^EMO-/.test(id) || id === 'SNT-210' || id === 'SNT-309')
  && !sis[s].pontuou.some(x => /^EMO-/.test(x.question_id)) && !sis[s].contexto.some(x => MOVIDAS.includes(x.question_id))),
  'sistemas físicos: nenhuma EMO (nem como pontuada, nem como contexto) e nenhuma SNT-210/309 nos dominantes');
ok(sis.mental_emocional_espiritual && MOVIDAS.every(id => sis.mental_emocional_espiritual.pontuou.some(x => x.question_id === id)),
  'as 13 EMO aparecem como pontuadas no MEE');
ok(dominantesV2.some(s => s.sistema !== 'mental_emocional_espiritual' && s.pontuou.some(x => /^EMO-/.test(x.question_id))),
  'o Resultado HOLOS antigo (v2) continua com a composição do v2 (EMO nos sistemas físicos): histórico não recalculado');

titulo('APLICACAO ANTIGA NO v2');
ok(JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV),
  srv.linhas('holoscan_system_scores').filter(x => x.application_id === HV),
  srv.linhas('methodology_questions').filter(x => x.package_id === v2.id).map(x => x.stable_id + x.statement).join('|'),
  srv.linhas('methodology_associations').filter(x => x.package_id === v2.id).map(x => x.question_stable_id + '>' + x.destination_id + ':' + x.role + ':' + x.weight).join('|')]) === digitalV2,
  '22. a aplicação feita no v2 (respostas e notas) e as 84 perguntas e associações do v2 continuam idênticas (o v2 só foi retirado para aplicações novas)');
ok(JSON.stringify([srv.linhas('holos_results').find(r => r.id === RV.data), srv.linhas('holos_result_emissions').find(e => e.id === EMV.data.id)]) === digitalResultadoV2,
  '25. o Resultado HOLOS e a emissão RF (PDF) feitos no v2 continuam idênticos, byte a byte (snapshot e hash)');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nquestionario v3: tudo ok');
process.exit(falhou ? 1 : 0);
