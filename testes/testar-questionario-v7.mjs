/**
 * HOLOS-V1 v7 (SO TEXTO, 13/10) PELA TELA, a partir do ESTADO REAL DE PRODUCAO de 13/10:
 *   v2..v5 retirados, v6 no ar, com uma aplicacao, um Resultado HOLOS historico (template 4) e uma emissao RF-2 feitos na v6.
 *   PUBLICACAO   o responsavel metodologico entra: a v7 e montada da v6 do banco, publicada e retira a v6
 *   TEXTO        so o texto oficial do Acido Inflamatorio muda (sem "exames"); os outros quatro identicos; nenhum cita exame
 *   NADA MAIS    perguntas e associacoes da v7 identicas as da v6 no banco; regras/faixas/escalas iguais
 *   SALVAR       aplicacao nova na v7: 81 respostas, denominadores 8/8/7/6/40, notas = as que a v6 daria
 *   HISTORICO    aplicacao, respostas, notas, Resultado e emissao da v6 identicos, byte a byte
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial, candidatoV1 } from './holos-aprovado.mjs';
import { construir } from '../scripts/pacote-v7.mjs';
import { calcular } from '../scripts/comparar-v2-v3.mjs';
import { comFoco, comoTemplate4 } from './fixture-direcao.mjs';

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

/* estado de producao: v2 -> v3 errado -> v4 -> v5 -> v6 (no ar) */
const v2 = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01', manterAprovador: true });
const caixa = {};
new Function('window', 'globalThis', readFileSync(new URL('../docs/v1/metodologia/historico/rascunho-revisao-v3-2026-10-12.js', import.meta.url), 'utf8'))(caixa, caixa);
const base = candidatoV1(); base.status = 'aprovado';
publicar(globalThis.PacoteMetodologico.aplicarRevisao(base, caixa.MetodologiaRevisaoV3));
const { v4: v4doc, v5: v5doc, v6: v6doc } = construir();
publicar(Object.assign(JSON.parse(JSON.stringify(v4doc)), { status: 'em_revisao' }));
publicar(Object.assign(JSON.parse(JSON.stringify(v5doc)), { status: 'em_revisao' }));
const v6 = publicar(Object.assign(JSON.parse(JSON.stringify(v6doc)), { status: 'em_revisao' }));

/* historico na v6: aplicacao + Resultado HOLOS (template 4, como os de producao) + emissao RF-2 */
const PV = ins('patients', { nome: 'Paciente V6 Ficticia' }).id;
const EV = ins('encounters', { patient_id: PV, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HV = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, v6.id, { patient_id: PV, encounter_id: EV, quando: new Date().toISOString().slice(0, 10) }) }).data;
const RV = rpc('salvar_resultado_holos', comFoco({ payload: { patient_id: PV, encounter_id: EV, holoscan_application_id: HV, tool_application_ids: [], operation_id: 'op-v6-ficticia' } }));
if (RV.error) throw new Error('resultado v6: ' + RV.error.message);
comoTemplate4(srv, RV.data);
const EMV = rpc('emitir_resultado_final', { payload: { holos_result_id: RV.data, operation_id: 'em-v6-ficticia' } });
if (EMV.error) throw new Error('emissao v6: ' + EMV.error.message);
const linhasDe = (t, pid) => srv.linhas(t).filter(x => x.package_id === pid);
const digital = () => JSON.stringify([srv.linhas('holoscan_applications').find(a => a.id === HV), srv.linhas('holoscan_answers').filter(a => a.application_id === HV),
  srv.linhas('holoscan_system_scores').filter(x => x.application_id === HV), srv.linhas('holos_results').find(r => r.id === RV.data),
  srv.linhas('holos_result_emissions').find(e => e.id === EMV.data.id),
  ['methodology_questions', 'methodology_associations', 'methodology_rules', 'methodology_systems', 'methodology_ranges'].map(t => linhasDe(t, v6.id).map(x => JSON.stringify(x)).join('|'))]);
const antes = digital();
ok(srv.linhas('methodology_packages').map(p => p.version + ':' + p.status).join(',') === '2:retirado,3:retirado,4:retirado,5:retirado,6:aprovado'
  && srv.linhas('holos_result_emissions').find(e => e.id === EMV.data.id).template_version === 'RF-2',
  'cenário = produção: v2..v5 retirados, v6 no ar, com aplicação, Resultado histórico (template 4) e emissão RF-2');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
/* a publicacao corre no login: nao recarregar a pagina antes de a v7 estar no ar (passo do deploy) */
await A.waitForFunction(() => window.PacoteMetodologico && window.PacoteMetodologico.todos().some(p => p.version === 7 && p.status === 'aprovado'), { timeout: 20000 }).catch(() => {});

titulo('PUBLICACAO DA v7');
const pk = (v) => srv.linhas('methodology_packages').find(x => x.code === 'HOLOS-V1' && x.version === v);
const v7 = pk(7), hoje = new Date().toISOString().slice(0, 10);
ok(v7 && v7.status === 'aprovado' && v7.governance_regime === 'publicacao_direta' && v7.effective_from === hoje && v7.lineage.revisao === 'HOLOS-V1-TEXTO-SISTEMAS-2026-10-13' && v7.lineage.parent_version === 6,
  'o responsável entra: a v7 (só texto, montada da v6) é publicada hoje, publicação direta');
ok(pk(6).status === 'retirado' && srv.linhas('methodology_packages').length === 6 && !srv.linhas('methodology_packages').some(p => p.status === 'em_revisao'),
  'a v6 sai do ar (retirada, fica no histórico); nenhuma outra versão nem rascunho pendente');
ok(v7.content_hash === rpc('metodologia_hash_conteudo', { p_package_id: v7.id }).data && rpc('validar_pacote_metodologico', { p_package_id: v7.id }).data.total_erros === 0, 'hash do servidor gravado; validador do servidor: 0 erros');

titulo('SO TEXTO');
const semIds = (t, pid) => linhasDe(t, pid).map(x => { const c = Object.assign({}, x); ['id', 'package_id', 'edition_id', 'created_at', 'updated_at', 'source', 'nutritionist_id', 'version'].forEach(k => delete c[k]); return JSON.stringify(c); }).sort().join('\n');
ok(['methodology_questions', 'methodology_associations', 'methodology_rules', 'methodology_ranges', 'methodology_scales'].every(t => semIds(t, v6.id) === semIds(t, v7.id)),
  'no banco: perguntas, associações (pesos, papéis, contextuais, Tríade), regras, faixas e escalas da v7 idênticas às da v6');
const txt = (pid) => Object.fromEntries(linhasDe('methodology_systems', pid).map(x => [x.code, x.public_text || '']));
const t6 = txt(v6.id), t7 = txt(v7.id);
ok(Object.keys(t6).filter(k => t6[k] !== t7[k]).join() === 'acido_inflamatorio' && /exames clínicos/.test(t6.acido_inflamatorio)
  && Object.values(t7).every(t => !/exame|laborat|composi[cç][aã]o corporal/i.test(t)),
  'no banco: só o texto do Ácido Inflamatório muda; nenhum texto oficial da v7 cita exame, laboratório ou composição corporal');

titulo('QUESTIONARIO E SALVAR NA v7');
const PN = ins('patients', { nome: 'Paciente V7 Ficticia' }).id;
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
const tela = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 600000).toISOString() });
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 250));
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 250));
  const itens = [...document.querySelectorAll('.q-item')];
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it, i) => { const b = it.querySelectorAll('.q-btn')[i % 4]; if (b && !b.classList.contains('marcado')) b.click(); });
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 700));
  document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 1500));
  return { n: itens.length };
}, PN);
const appN = srv.linhas('holoscan_applications').find(a => a.patient_id === PN);
const sc = appN ? srv.linhas('holoscan_system_scores').filter(s => s.application_id === appN.id) : [];
const den = Object.fromEntries(sc.map(s => [s.sistema, s.total_marcadores]));
ok(tela.n === 81 && appN && appN.methodology_package_version === 7 && srv.linhas('holoscan_answers').filter(a => a.application_id === appN.id).length === 81
  && den.fungico === 8 && den.acido_inflamatorio === 8 && den.metabolico === 7 && den.detox_linfatico === 6 && den.mental_emocional_espiritual === 40,
  'HOLOSCAN salvo na v7: 81 perguntas e respostas, denominadores 8/8/7/6/40 (iguais aos da v6)');
const resp = Object.fromEntries(srv.linhas('holoscan_answers').filter(a => a.application_id === appN.id).map(a => [a.marcador_id, Number(a.valor)]));
const esperado = calcular(Object.assign(JSON.parse(JSON.stringify(v6doc)), { status: 'aprovado' }), resp);
const n2 = (v) => v === null || v === undefined ? null : Number(Number(v).toFixed(4));
ok(sc.length === 5 && sc.every(s => n2(s.nota) === n2(esperado.r.system_results[s.sistema].nota)) && n2(appN.indice) === n2(esperado.r.index_result.valor),
  'as notas e o Índice gravados na v7 são exatamente os que a v6 daria para as mesmas respostas');

titulo('HISTORICO');
ok(digital() === antes, 'aplicação, respostas, notas, Resultado HOLOS (template 4) e emissão RF-2 feitos na v6 — e o pacote v6 inteiro — idênticos, byte a byte');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nquestionario v7: tudo ok');
process.exit(falhou ? 1 : 0);
