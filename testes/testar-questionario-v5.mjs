/**
 * HOLOS-V1 v5 (Lote 2B, 13/10) PELA TELA, a partir do ESTADO REAL DE PRODUCAO:
 *   v2 retirado, v3 (rascunho de 12/10, por engano) retirado, v4 no ar, com uma aplicacao, um Resultado HOLOS e uma
 *   emissao RF feitos na v4.
 *   PUBLICACAO   o responsavel metodologico entra: a v5 e montada da v4 do banco, publicada e retira a v4
 *   QUESTIONARIO as 82 perguntas continuam (ESP-501 e ESP-502 coletadas), botao sem quantidade
 *   SALVAR       aplicacao nova na v5: denominadores 11/9/8/10/42
 *   MR-V1        ESP-501/ESP-502 so como contexto (Fungico/Detox), nunca pontuadas nem dominantes; as 5 ESP movidas no MEE
 *   HISTORICO    aplicacao, Resultado HOLOS e emissao da v4 identicos, byte a byte
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial, candidatoV1 } from './holos-aprovado.mjs';
import { construir } from '../scripts/pacote-v5.mjs';

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

/* estado de producao: v2 -> v3 errado -> v4 */
const v2 = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01', manterAprovador: true });
const caixa = {};
new Function('window', 'globalThis', readFileSync(new URL('../docs/v1/metodologia/historico/rascunho-revisao-v3-2026-10-12.js', import.meta.url), 'utf8'))(caixa, caixa);
const base = candidatoV1(); base.status = 'aprovado';
const v3 = publicar(globalThis.PacoteMetodologico.aplicarRevisao(base, caixa.MetodologiaRevisaoV3));
const { v4: v4doc } = construir();
const v4 = publicar(Object.assign(JSON.parse(JSON.stringify(v4doc)), { status: 'em_revisao' }));

/* historico na v4: aplicacao + Resultado HOLOS + emissao RF */
const PV = ins('patients', { nome: 'Paciente V4 Ficticia' }).id;
const EV = ins('encounters', { patient_id: PV, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HV = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, v4.id, { patient_id: PV, encounter_id: EV, quando: new Date().toISOString().slice(0, 10) }) }).data;
const RV = rpc('salvar_resultado_holos', { payload: { patient_id: PV, encounter_id: EV, holoscan_application_id: HV, tool_application_ids: [], operation_id: 'op-v4-ficticia' } });
if (RV.error) throw new Error('resultado v4: ' + RV.error.message);
const EMV = rpc('emitir_resultado_final', { payload: { holos_result_id: RV.data, operation_id: 'em-v4-ficticia' } });
if (EMV.error) throw new Error('emissao v4: ' + EMV.error.message);
const digital = () => JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV),
  srv.linhas('holoscan_system_scores').filter(x => x.application_id === HV), srv.linhas('holos_results').find(r => r.id === RV.data),
  srv.linhas('holos_result_emissions').find(e => e.id === EMV.data.id),
  ['methodology_questions', 'methodology_associations', 'methodology_rules'].map(t => srv.linhas(t).filter(x => x.package_id === v4.id || x.package_id === v2.id).map(x => JSON.stringify(x)).join('|'))]);
const antes = digital();
ok(srv.linhas('methodology_packages').map(p => p.version + ':' + p.status).join(',') === '2:retirado,3:retirado,4:aprovado', 'cenário = produção: v2 e v3 retirados, v4 no ar, com aplicação, Resultado e emissão');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
/* este teste e o registro da publicacao da v5: simula o front da epoca da v5 (sem a revisao do fechamento das 61, que
   publicaria a v6 no mesmo login). A v6 tem o seu proprio teste: testar-questionario-v6.mjs */
await A.evaluateOnNewDocument(() => { Object.defineProperty(window, 'MetodologiaRevisaoV6', { configurable: false, get: () => undefined, set: () => {} }); });
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().some(p => p.version === 5 && p.status === 'aprovado'), { timeout: 15000 }).catch(() => {});

titulo('PUBLICACAO DA v5');
const pk = (v) => srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === v);
const v5 = pk(5), hoje = new Date().toISOString().slice(0, 10);
ok(v5 && v5.status === 'aprovado' && v5.governance_regime === 'publicacao_direta' && v5.effective_from === hoje && v5.lineage.revisao === 'HOLOS-V1-LOTE-2B-2026-10-13' && v5.lineage.parent_version === 4,
  'o responsável entra: a v5 (Lote 2B, montada da v4) é publicada hoje, publicação direta');
ok(pk(4).status === 'retirado' && pk(3).status === 'retirado' && pk(2).status === 'retirado' && srv.linhas('methodology_packages').length === 4, 'a v4 sai do ar (retirada, fica no histórico); nenhuma outra versão gravada');
ok(v5.content_hash === rpc('metodologia_hash_conteudo', { p_package_id: v5.id }).data && rpc('validar_pacote_metodologico', { p_package_id: v5.id }).data.total_erros === 0, 'hash do servidor gravado; validador do servidor: 0 erros (pergunta só contextual aceita)');
const a5 = (id) => srv.linhas('methodology_associations').filter(a => a.package_id === v5.id && a.question_stable_id === id).map(a => a.destination_type[0] + ':' + a.destination_id + ':' + a.role + ':' + a.weight).sort().join(' ');
ok(a5('ESP-501') === 's:fungico:secondary_contextual:null' && a5('ESP-502') === 's:detox_linfatico:secondary_contextual:null' && a5('ESP-303') === 's:metabolico:primaria:1 t:espiritual:triade_por_bloco:1',
  'no banco: ESP-501 e ESP-502 só contextuais (sem Tríade), ESP-303 no Metabólico');

titulo('QUESTIONARIO E SALVAR NA v5');
const PN = ins('patients', { nome: 'Paciente V5 Ficticia' }).id;
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
  return { botao, n: itens.length, tem501: !!document.querySelector('.q-item[data-marcador="ESP-501"]'), tem502: !!document.querySelector('.q-item[data-marcador="ESP-502"]'), conta };
}, PN);
ok(tela.botao === 'Aplicar HOLOSCAN' && tela.n === 82 && tela.tem501 && tela.tem502 && /Todas respondidas/.test(tela.conta) && !/\d/.test(tela.conta), 'tela: "Aplicar HOLOSCAN" sem número; 82 perguntas, ESP-501 e ESP-502 continuam coletadas; progresso sem números');
const appN = srv.linhas('holoscan_applications').find(a => a.patient_id === PN);
const den = appN ? Object.fromEntries(srv.linhas('holoscan_system_scores').filter(s => s.application_id === appN.id).map(s => [s.sistema, s.total_marcadores])) : {};
ok(appN && appN.methodology_package_version === 5 && srv.linhas('holoscan_answers').filter(a => a.application_id === appN.id).length === 82
  && den.fungico === 11 && den.acido_inflamatorio === 9 && den.metabolico === 8 && den.detox_linfatico === 10 && den.mental_emocional_espiritual === 42,
  'HOLOSCAN salvo na v5: 82 respostas (inclui ESP-501/502), denominadores 11/9/8/10/42 (' + JSON.stringify(den) + ')');

titulo('MR-V1 NA v5');
/* ESP-501, ESP-502 e as 5 movidas com carga maxima; o resto sem carga */
const perg5 = Object.fromEntries(srv.linhas('methodology_questions').filter(x => x.package_id === v5.id).map(x => [x.stable_id, x]));
const CARGA = ['ESP-501', 'ESP-502', 'ESP-101', 'ESP-103', 'ESP-203', 'ESP-404', 'ESP-405'];
srv.tabelas.holoscan_answers.filter(r => r.application_id === appN.id).forEach(r => { const inv = perg5[r.marcador_id].orientation === 'invertida'; r.valor = CARGA.includes(r.marcador_id) ? (inv ? 0 : 3) : (inv ? 3 : 0); });
const RN = rpc('previa_resultado_holos', { payload: { patient_id: PN, encounter_id: appN.encounter_id, holoscan_application_id: appN.id, tool_application_ids: [] } });
const S = RN.data ? Object.fromEntries(RN.data.holoscan.sistemas.map(s => [s.sistema, s])) : {};
const ids = (s, k) => (S[s] ? S[s][k] : []).map(x => x.question_id);
ok(!RN.error && ids('fungico', 'contexto').includes('ESP-501') && !ids('fungico', 'pontuou').includes('ESP-501') && !ids('fungico', 'dominantes').includes('ESP-501'), 'ESP-501 aparece só como contexto do Fúngico: não pontua e não é dominante');
ok(ids('detox_linfatico', 'contexto').includes('ESP-502') && !ids('detox_linfatico', 'pontuou').includes('ESP-502') && !ids('detox_linfatico', 'dominantes').includes('ESP-502'), 'ESP-502 aparece só como contexto do Detox: não pontua e não é dominante');
ok(['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico'].every(s => ids(s, 'dominantes').length === 0), 'com carga só nas ESP decididas, nenhum sistema físico tem sinal dominante (ESP-501/502 não pontuam; as movidas estão no MEE)');
ok(ids('mental_emocional_espiritual', 'dominantes').join(',') === 'ESP-101,ESP-103,ESP-203' && ['ESP-101', 'ESP-103', 'ESP-203', 'ESP-404', 'ESP-405'].every(id => ids('mental_emocional_espiritual', 'pontuou').includes(id)),
  'as 5 ESP movidas pontuam no MEE; dominantes do MEE: ' + ids('mental_emocional_espiritual', 'dominantes').join(', '));
ok(ids('metabolico', 'pontuou').includes('ESP-303') && ['EMO-502', 'EMO-504'].every(id => ids('metabolico', 'contexto').includes(id) && !ids('metabolico', 'pontuou').includes(id)), 'Metabólico: ESP-303 pontua; EMO-502/504 só contexto');

titulo('HISTORICO');
ok(digital() === antes, 'aplicação, respostas, notas, Resultado HOLOS e emissão feitos na v4 — e as perguntas/associações/regras da v4 e da v2 — idênticos, byte a byte');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nquestionario v5: tudo ok');
process.exit(falhou ? 1 : 0);
