/**
 * MOTOR DE RESULTADOS V1 (12/10) — servidor falso + tela.
 *   TECNICO   Indice com aviso anti-percentual na visao da paciente; paciente sem "faixa baixa/alta" como rotulo principal;
 *             empate da Triade com a mesma regra no HOLOSCAN, na Sintese e no Resultado; sinais dominantes com o texto
 *             APROVADO da pergunta (nunca o rotulo legado do holoscan.js); Conduta da previa e da emissao = a do atendimento do
 *             resultado; relatorio sem "nao homologado" com pacote aprovado.
 * Dados ficticios. SHOT_DIR=<pasta> grava capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const PA = ins('patients', { nome: 'Carla Ficticia Motor', telefone: '62999990000' }).id;
const E_ANT = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 86400000 * 2).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 86400000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const E_DEPOIS = ins('encounters', { patient_id: PA, occurred_at: new Date().toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: new Date(Date.now() - 86400000).toISOString().slice(0, 10) }) }).data;
rpc('registrar_proximos_passos', { p_application_id: HA });
const conc = new Date(Date.now() - 86400000 + 3600000).toISOString();
const tool = (id, r) => ins('tool_applications', { patient_id: PA, encounter_id: EA, ferramenta_id: id, versao_ferramenta: '1', status: 'concluida', respostas: r, iniciada_em: conc, concluida_em: conc }).id;
const T_OQ3 = tool('oq3', { quer: 'ter energia', precisa: 'dormir melhor', consegue: 'caminhar 10 min' });
const R = rpc('salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [T_OQ3],
  visao_paciente: { ferramentas: { [T_OQ3]: { mostrar: true } }, proximos_passos: false } } });
/* a Conduta do atendimento do resultado e uma Conduta MAIS RECENTE de outro atendimento */
ins('conducts', { patient_id: PA, encounter_id: EA, status: 'salvo', revision_number: 1, objective: 'OBJETIVO_DO_ATENDIMENTO_DO_RESULTADO' });
ins('conducts', { patient_id: PA, encounter_id: E_DEPOIS, status: 'salvo', revision_number: 1, objective: 'OBJETIVO_DE_OUTRO_ATENDIMENTO' });
const linhaR = srv.linhas('holos_results').find(r => r.id === R.data);
ok(!R.error && linhaR.template_version === 4 && linhaR.content_snapshot.motor_resultados === 'MR-V1' && linhaR.content_snapshot.holoscan.sistemas.every(s => Array.isArray(s.dominantes) && s.dominantes.length <= 3),
  'Resultado HOLOS novo: template 4, motor MR-V1, até 3 sinais dominantes por sistema no snapshot');
const pkQ = Object.fromEntries(srv.linhas('methodology_questions').filter(x => x.package_id === pk.id).map(x => [x.stable_id, x.statement]));
ok(linhaR.content_snapshot.holoscan.sistemas.every(s => s.dominantes.every(d => d.enunciado === pkQ[d.question_id] && d.pontos > 0)),
  'sinais dominantes do snapshot com o texto APROVADO da pergunta no pacote (e contribuição real > 0)');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function sessao(largura) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: largura || 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
const A = await sessao();

titulo('CORRECOES TECNICAS (itens 4.1 a 4.6)');
const doc = await A.evaluate(async (pid, rid) => {
  window.definirPacienteAtivo(pid);
  await window.ResultadoHolos.carregar(pid);
  const r = window.ResultadoHolos.porId(rid);
  const div = document.createElement('div');
  div.innerHTML = window.ResultadoHolos.documentoHtml(r.content_snapshot, 'paciente', {});
  const pac = div.innerText;
  div.innerHTML = window.ResultadoHolos.documentoHtml(r.content_snapshot, 'profissional', {});
  return { pac, prof: div.innerText };
}, PA, R.data);
ok(/Índice HOLOS[\s\S]{0,40}de 100[\s\S]{0,10}O Índice HOLOS organiza as respostas desta aplicação e não representa percentual de saúde\./.test(doc.pac),
  '4.1 visão da paciente: o aviso anti-percentual fica junto do Índice ("de 100")');
ok(!/faixa (baixa|intermediária|alta)/i.test(doc.pac) && /(Mais|Alguns|Menos) marcadores neste eixo/.test(doc.pac) && /faixa (baixa|intermediária|alta)/i.test(doc.prof),
  '4.2 paciente vê "Mais/Alguns/Menos marcadores neste eixo" (nunca "faixa baixa/alta"); a visão profissional mantém a faixa técnica');

const tri = await A.evaluate(() => {
  const T = window.triadeMenores, S = window.ResultadoSintese;
  const snap = (f, m, e) => ({ holoscan: { sistemas: [], triada: { fisico: f, mental: m, espiritual: e }, triada_com_dado: { fisico: true, mental: true, espiritual: true } } });
  const casos = [[6, 6, 8], [7, 7, 7], [5, 6, 7], [6, 8, 6]];
  return casos.map(c => { const t = T([{ nome: 'Corpo', valor: c[0] }, { nome: 'Mente', valor: c[1] }, { nome: 'Espírito', valor: c[2] }]); const f = S.fatos(snap(c[0], c[1], c[2]));
    return { t, menor: f.triade_menor, empate: f.triade_empate }; });
});
ok(tri[0].t.frase === 'Corpo e Mente apresentaram a mesma nota, a menor entre as dimensões.' && tri[0].menor === null && tri[0].empate.join() === 'Corpo,Mente'
  && tri[1].t.frase === 'As três dimensões apresentaram a mesma nota.' && tri[1].empate[0] === 'todas'
  && tri[2].t.menores.join() === 'Corpo' && tri[2].menor === 'Corpo'
  && tri[3].t.menores.join() === 'Corpo,Espírito' && tri[3].menor === null && tri[3].empate.join() === 'Corpo,Espírito',
  '4.3 empate da Tríade: a mesma regra no HOLOSCAN (triadeMenores) e na Síntese — empate nunca escolhe uma dimensão');

const dom = await A.evaluate(() => {
  const p = window.Metodologia.obterPacoteAtivo();
  const resp = {}; p.perguntas.forEach(q => { resp[q.stable_id] = 3; });
  const r = window.HoloscanOficial.calcular(resp, { applied_at: new Date().toISOString().slice(0, 10) });
  const textos = {}; p.perguntas.forEach(q => { textos[q.stable_id] = q.statement; });
  return { todos: r.sistemas.every(s => s.dominantes.every(d => d.rotulo === textos[d.marcador_id])), lista: r.sistemas.map(s => s.dominantes.map(d => d.rotulo).join(' | ')).join(' || ') };
});
ok(dom.todos && !/marcador inflamatório alterado no exame/i.test(dom.lista), '4.5 sinais dominantes com o texto aprovado da pergunta (nunca "marcador inflamatório alterado no exame")');

titulo('CONDUTA DA PREVIA E DA EMISSAO (item 4.6)');
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click(); for (let i = 0; i < 60 && !document.getElementById('rp-doc'); i++) await new Promise(r => setTimeout(r, 100)); }, PA);
let pg = await A.evaluate(() => (document.getElementById('resultado-pagina-corpo') || {}).innerText || '');
ok(/OBJETIVO_DO_ATENDIMENTO_DO_RESULTADO/.test(pg) && !/OBJETIVO_DE_OUTRO_ATENDIMENTO/.test(pg), 'prévia da página Resultado: a Conduta do atendimento do resultado (não a mais recente de outro atendimento)');
await A.evaluate(async () => { document.querySelector('[data-rp-acao="emitir"]').click(); for (let i = 0; i < 60 && !/Resultado Final nº/.test(document.getElementById('resultado-pagina-corpo').innerText); i++) await new Promise(r => setTimeout(r, 100)); });
const em = (srv.linhas('holos_result_emissions') || [])[0];
pg = await A.evaluate(() => (document.getElementById('rp-doc') || {}).innerText || '');
ok(em && em.template_version === 'RF-2' && em.content_snapshot.conduta.campos.objective === 'OBJETIVO_DO_ATENDIMENTO_DO_RESULTADO' && /OBJETIVO_DO_ATENDIMENTO_DO_RESULTADO/.test(pg) && !/OBJETIVO_DE_OUTRO_ATENDIMENTO/.test(pg),
  'emissão RF-2: congela e mostra a Conduta do atendimento do resultado');

titulo('RELATORIO (item 4.4)');
const rel = rpc('emitir_relatorio', { payload: { patient_id: PA, title: 'Relatório fictício', selected_sources: { holoscan_application_ids: [HA] } } });
const relRow = srv.linhas('report_emissions').find(x => x.id === rel.data);
ok(!rel.error && /pacote metodológico oficial aprovado \(HOLOS-V1 v2\)/.test(relRow.content_snapshot.metodologia) && !/não homologado/.test(relRow.content_snapshot.metodologia),
  'relatório emitido com HOLOSCAN oficial: diz o estado real do pacote (aprovado), sem "não homologado"');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nmotor de resultados: tudo ok');
process.exit(falhou ? 1 : 0);
