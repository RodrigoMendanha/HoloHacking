/**
 * HOLOS-V1 v6 (fechamento das 61, 13/10) PELA TELA, a partir do ESTADO REAL DE PRODUCAO:
 *   v2, v3 (por engano) e v4 retirados, v5 no ar, com uma aplicacao, um Resultado HOLOS e uma emissao RF feitos na v5.
 *   PUBLICACAO   o responsavel metodologico entra: a v6 e montada da v5 do banco, publicada e retira a v5
 *   QUESTIONARIO 81 perguntas (SNT-110 sai; as 12 contextuais continuam coletadas), botao sem quantidade
 *   SALVAR       aplicacao nova na v6: denominadores 8/8/7/6/40
 *   MR-V1        contextuais so como contexto, nunca pontuadas nem dominantes; SNT-404 no Fungico; SNT-501/507 no Metabolico
 *   HISTORICO    aplicacao, Resultado HOLOS e emissao da v5 identicos, byte a byte
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial, candidatoV1 } from './holos-aprovado.mjs';
import { construir } from '../scripts/pacote-v6.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const publicar = (pacote) => { const pk = semearHolosAprovado(srv, UA, { pacote, aprovar: false }); const r = rpc('publicar_pacote_metodologico', { p_package_id: pk.id }); if (r.error) throw new Error('fixture publicar v' + pacote.version + ': ' + r.error.message); return pk; };

/* estado de producao: v2 -> v3 errado -> v4 -> v5 */
const v2 = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01', manterAprovador: true });
const caixa = {};
new Function('window', 'globalThis', readFileSync(new URL('../docs/v1/metodologia/historico/rascunho-revisao-v3-2026-10-12.js', import.meta.url), 'utf8'))(caixa, caixa);
const base = candidatoV1(); base.status = 'aprovado';
const v3 = publicar(globalThis.PacoteMetodologico.aplicarRevisao(base, caixa.MetodologiaRevisaoV3));
const { v4: v4doc, v5: v5doc } = construir();
publicar(Object.assign(JSON.parse(JSON.stringify(v4doc)), { status: 'em_revisao' }));
const v4 = publicar(Object.assign(JSON.parse(JSON.stringify(v5doc)), { status: 'em_revisao' }));   /* "v4" = a versao no ar antes (a v5) */

/* historico na v5: aplicacao + Resultado HOLOS + emissao RF */
const PV = ins('patients', { nome: 'Paciente V5 Ficticia' }).id;
const EV = ins('encounters', { patient_id: PV, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HV = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, v4.id, { patient_id: PV, encounter_id: EV, quando: new Date().toISOString().slice(0, 10) }) }).data;
const RV = rpc('salvar_resultado_holos', { payload: { patient_id: PV, encounter_id: EV, holoscan_application_id: HV, tool_application_ids: [], operation_id: 'op-v5-ficticia' } });
if (RV.error) throw new Error('resultado v4: ' + RV.error.message);
const EMV = rpc('emitir_resultado_final', { payload: { holos_result_id: RV.data, operation_id: 'em-v5-ficticia' } });
if (EMV.error) throw new Error('emissao v4: ' + EMV.error.message);
const digital = () => JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV),
  srv.linhas('holoscan_system_scores').filter(x => x.application_id === HV), srv.linhas('holos_results').find(r => r.id === RV.data),
  srv.linhas('holos_result_emissions').find(e => e.id === EMV.data.id),
  ['methodology_questions', 'methodology_associations', 'methodology_rules'].map(t => srv.linhas(t).filter(x => x.package_id === v4.id || x.package_id === v2.id).map(x => JSON.stringify(x)).join('|'))]);
const antes = digital();
ok(srv.linhas('methodology_packages').map(p => p.version + ':' + p.status).join(',') === '2:retirado,3:retirado,4:retirado,5:aprovado', 'cenário = produção: v2, v3 e v4 retirados, v5 no ar, com aplicação, Resultado e emissão');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().some(p => p.version === 6 && p.status === 'aprovado'), { timeout: 15000 }).catch(() => {});

titulo('PUBLICACAO DA v6');
const pk = (v) => srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === v);
const v6 = pk(6), hoje = new Date().toISOString().slice(0, 10);
ok(v6 && v6.status === 'aprovado' && v6.governance_regime === 'publicacao_direta' && v6.effective_from === hoje && v6.lineage.revisao === 'HOLOS-V1-FECHAMENTO-61-2026-10-13' && v6.lineage.parent_version === 5,
  'o responsável entra: a v6 (fechamento das 61, montada da v5) é publicada hoje, publicação direta');
ok(pk(5).status === 'retirado' && pk(4).status === 'retirado' && pk(3).status === 'retirado' && pk(2).status === 'retirado' && srv.linhas('methodology_packages').length === 5, 'a v5 sai do ar (retirada, fica no histórico); nenhuma outra versão gravada');
ok(v6.content_hash === rpc('metodologia_hash_conteudo', { p_package_id: v6.id }).data && rpc('validar_pacote_metodologico', { p_package_id: v6.id }).data.total_erros === 0, 'hash do servidor gravado; validador do servidor: 0 erros');
const a6 = (id) => srv.linhas('methodology_associations').filter(a => a.package_id === v6.id && a.question_stable_id === id).map(a => a.destination_type[0] + ':' + a.destination_id + ':' + a.role + ':' + a.weight).sort().join(' ');
ok(a6('SNT-110') === '' && a6('SNT-404') === 's:fungico:primaria:1 t:fisico:triade_por_bloco:1' && a6('SNT-501') === 's:metabolico:primaria:1 t:fisico:triade_por_bloco:1' && a6('SNT-104') === 's:fungico:secondary_contextual:null' && a6('SNT-410') === 's:detox_linfatico:secondary_contextual:null',
  'no banco: SNT-110 fora; SNT-404 no Fúngico; SNT-501 no Metabólico; SNT-104 e SNT-410 só contextuais (sem Tríade)');

titulo('QUESTIONARIO E SALVAR NA v6');
const PN = ins('patients', { nome: 'Paciente V6 Ficticia' }).id;
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
const tela = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 600000).toISOString() });
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 250));
  const botao = document.getElementById('btn-abrir-questionario').textContent.trim();
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 250));
  const itens = [...document.querySelectorAll('.q-item')];
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach(it => { const b = it.querySelectorAll('.q-btn')[2]; if (!b.classList.contains('marcado')) b.click(); });
  const conta = document.querySelector('.q-conta').textContent;
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 700));
  document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 1500));
  return { botao, n: itens.length, tem110: !!document.querySelector('.q-item[data-marcador="SNT-110"]'), tem104: !!document.querySelector('.q-item[data-marcador="SNT-104"]'), conta };
}, PN);
ok(tela.botao === 'Aplicar HOLOSCAN' && tela.n === 81 && !tela.tem110 && tela.tem104 && /Todas respondidas/.test(tela.conta) && !/\d/.test(tela.conta), 'tela: "Aplicar HOLOSCAN" sem número; 81 perguntas, sem SNT-110, contextuais coletadas; progresso sem números');
const appN = srv.linhas('holoscan_applications').find(a => a.patient_id === PN);
const den = appN ? Object.fromEntries(srv.linhas('holoscan_system_scores').filter(s => s.application_id === appN.id).map(s => [s.sistema, s.total_marcadores])) : {};
ok(appN && appN.methodology_package_version === 6 && srv.linhas('holoscan_answers').filter(a => a.application_id === appN.id).length === 81
  && den.fungico === 8 && den.acido_inflamatorio === 8 && den.metabolico === 7 && den.detox_linfatico === 6 && den.mental_emocional_espiritual === 40,
  'HOLOSCAN salvo na v6: 81 respostas, denominadores 8/8/7/6/40 (' + JSON.stringify(den) + ')');

titulo('MR-V1 NA v6');
const perg6 = Object.fromEntries(srv.linhas('methodology_questions').filter(x => x.package_id === v6.id).map(x => [x.stable_id, x]));
const CTX = ['SNT-104', 'SNT-105', 'SNT-109', 'SNT-206', 'SNT-305', 'SNT-306', 'SNT-308', 'SNT-408', 'SNT-409', 'SNT-410'];
const CARGA = [...CTX, 'SNT-404', 'SNT-501', 'SNT-507'];
srv.tabelas.holoscan_answers.filter(r => r.application_id === appN.id).forEach(r => { const inv = perg6[r.marcador_id].orientation === 'invertida'; r.valor = CARGA.includes(r.marcador_id) ? (inv ? 0 : 3) : (inv ? 3 : 0); });
const RN = rpc('previa_resultado_holos', { payload: { patient_id: PN, encounter_id: appN.encounter_id, holoscan_application_id: appN.id, tool_application_ids: [] } });
const S = RN.data ? Object.fromEntries(RN.data.holoscan.sistemas.map(s => [s.sistema, s])) : {};
const ids = (s, k) => (S[s] ? S[s][k] : []).map(x => x.question_id);
ok(!RN.error && ['SNT-104', 'SNT-105', 'SNT-109'].every(id => ids('fungico', 'contexto').includes(id) && !ids('fungico', 'pontuou').includes(id)) && ids('fungico', 'dominantes').join(',') === 'SNT-404',
  'Fúngico: candidíase, micose e antibiótico só contexto; o único dominante é SNT-404 (comida gordurosa)');
ok(ids('acido_inflamatorio', 'contexto').includes('SNT-206') && ids('acido_inflamatorio', 'dominantes').length === 0, 'Ácido-Inflamatório: SNT-206 só contexto, nenhum dominante');
ok(['SNT-305', 'SNT-306', 'SNT-308'].every(id => ids('metabolico', 'contexto').includes(id) && !ids('metabolico', 'pontuou').includes(id)) && ids('metabolico', 'dominantes').join(',') === 'SNT-501,SNT-507',
  'Metabólico: gordura na barriga, pele escurecida e dificuldade de perder peso só contexto; dominantes SNT-501 e SNT-507 (invertida)');
ok(['SNT-408', 'SNT-409', 'SNT-410'].every(id => ids('detox_linfatico', 'contexto').includes(id)) && ids('detox_linfatico', 'dominantes').length === 0 && !ids('detox_linfatico', 'pontuou').includes('SNT-404'),
  'Detox: pele, suor e celulite só contexto, nenhum dominante; SNT-404 já não pontua aqui');
ok(ids('mental_emocional_espiritual', 'dominantes').length === 0 && !ids('mental_emocional_espiritual', 'pontuou').includes('SNT-501'), 'MEE: SNT-501/507 já não pontuam aqui');

titulo('HISTORICO');
ok(digital() === antes, 'aplicação, respostas, notas, Resultado HOLOS e emissão feitos na v5 — e as perguntas/associações/regras da v5 e da v2 — idênticos, byte a byte');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nquestionario v6: tudo ok');
process.exit(falhou ? 1 : 0);
