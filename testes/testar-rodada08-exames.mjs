/**
 * RODADA 08 — ONDA 2 (reescrita 09/10): EXAME E SO ARQUIVO DO PRONTUARIO
 *
 * Supabase falso (supabase-falso.mjs), app real, com conta. A Onda 2 provava a identidade da coleta e a
 * sincronizacao dos exames pelo painel da ficha. Decisao de produto 09/10: o painel saiu; o sistema nao
 * le, interpreta, estrutura, classifica, compara ou pontua exames.
 *
 *   1  a aba Documentos nao tem painel de valores: nem "Nova coleta", "Editar coleta", "Excluir coleta",
 *      "Conferir com o mapa" nem "Lancar valores"
 *   2  a coleta HISTORICA (ja no servidor) e lida como esta (so leitura) e NAO vira evento, nem entra na
 *      Evolucao, no relatorio, na Visao geral nem no contexto da HOLOS AI
 *   3  nenhum caminho grava coleta: Sincronizacao.salvarColeta (nova/editar/excluir), as 4 RPCs e as tabelas
 *   4  o valor legado em localStorage (holohacking.exames) nao e enviado, nao e apagado e nao aparece em tela
 *   5  trocar de paciente: a biblioteca mostra os arquivos do paciente certo
 *   6  HOLOSCAN oficial identico antes e depois (Indice, notas, Triada)
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Exames Ficticia' } }).data[0].id;
const PB = q('patients', 'insert', { dados: { nome: 'Paciente Dois Ficticia' } }).data[0].id;
const agora = () => new Date().toISOString();
const EA = q('encounters', 'insert', { dados: { patient_id: PA, occurred_at: agora(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' } }).data[0].id;
const HID = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: agora().slice(0, 10) }) }).data;
ok(!!HID, 'fixture: HOLOSCAN oficial salvo');
/* coleta HISTORICA, como o banco real a tem (anterior a 09/10) */
const CID = globalThis.crypto.randomUUID();
srv.tabelas.lab_collections.push({ id: CID, nutritionist_id: UA, patient_id: PA, encounter_id: null, coletado_em: '2026-03-20', data_coleta_desconhecida: false, laboratorio: 'Lab Historico', observacao: null, state: 'salvo', source: 'manual', revision: 1, created_by: UA, created_at: agora(), updated_at: agora() });
srv.tabelas.lab_results.push({ id: globalThis.crypto.randomUUID(), collection_id: CID, exame_id: 'EXA-001', valor: 4321, unidade_no_momento: 'mg/dL', nome_exame_no_momento: 'Glicose Historica', sistema_no_momento: 'metabolico', created_at: agora() });
const scoresAntes = JSON.stringify(srv.linhas('holoscan_system_scores').filter(s => s.application_id === HID));

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await window.Sincronizacao.aguardar(); }, PA);
const antes = await A.evaluate((pid) => { const u = window.ultimaPontuacao(pid); return JSON.stringify({ i: u.indice, s: u.sistemas.map(x => [x.sistema, x.nota, x.faixa]), t: u.triada }); }, PA);

titulo('1. A ABA DOCUMENTOS NAO TEM PAINEL DE VALORES');
const aba = await A.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 800));
  const t = document.getElementById('aba-documentos').innerText;
  return { painel: document.querySelectorAll('#ex-corpo, .ex-linha, #ex-data-coleta, #ex-modo, [data-acao="nova-coleta"], [data-acao="conferir"], [data-lab-acao], [data-lancar]').length,
    texto: t, biblioteca: !!document.getElementById('doc-arquivo') && !!document.getElementById('doc-titulo'), modulos: !!window.Laboratorio || !!window.LabMotor || !!window.LabCatalogo };
}, PA);
ok(aba.painel === 0 && !aba.modulos, 'nenhum painel, botao ou modulo de laboratorio na ficha');
ok(!/Nova coleta|Editar coleta|Excluir coleta|Conferir com o mapa|Lançar valores|Salvando|Não sincronizado/.test(aba.texto) && aba.biblioteca, 'os estados e botoes da Onda 2 sumiram; o que ha e a biblioteca de arquivos');

titulo('2. A COLETA HISTORICA E SO LEITURA E NAO APARECE EM TELA NENHUMA');
const telas = await A.evaluate(async (pid) => {
  const out = { lidas: (window.Sincronizacao.coletas(pid) || []).map(c => c.coletado_em) };
  const ler = async (aba, id) => { window.levarParaFicha('aba:' + aba, pid); await new Promise(r => setTimeout(r, 700)); return (document.getElementById(id) || {}).innerText || ''; };
  out.visao = await ler('visao', 'aba-visao');
  out.evolucao = await ler('evolucao', 'aba-evolucao');
  out.relatorio = await ler('relatorio', 'aba-relatorio');
  out.holoscan = await ler('holoscan', 'aba-holoscan');
  window.levarParaFicha('aba:holos-ai', pid); await new Promise(r => setTimeout(r, 400));
  const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 300));
  out.ia = (document.getElementById('ai-hub-texto') || {}).textContent || '';
  return out;
}, PA);
ok(telas.lidas.length === 1 && telas.lidas[0] === '2026-03-20', 'a coleta historica e lida do servidor como esta (so leitura)');
const VAZA = /4321|Glicose Historica|Lab Historico|Coleta de exames/;
ok(!VAZA.test(telas.visao) && !VAZA.test(telas.evolucao) && !VAZA.test(telas.relatorio) && !VAZA.test(telas.holoscan) && !VAZA.test(telas.ia),
   'nem valor, nem nome do exame, nem laboratorio, nem evento de coleta na Visao geral, Evolucao, relatorio, aba HOLOSCAN ou contexto da IA');

titulo('3. NENHUM CAMINHO GRAVA COLETA');
const grava = await A.evaluate(async (pid, cid) => {
  const sb = window.supabaseClient;
  const S = window.Sincronizacao;
  const out = {};
  out.nova = (await S.salvarColeta(pid, { 'EXA-001': 10 }, '2026-04-01', { modo: 'nova' })).motivo;
  out.editar = (await S.salvarColeta(pid, { 'EXA-001': 11 }, '2026-03-20', { coletaId: cid, modo: 'editar' })).motivo;
  const h = (r) => (r.error ? r.error.hint || r.error.code : 'GRAVOU');
  out.rpc1 = h(await sb.rpc('salvar_coleta_exames', { payload: { collection: { patient_id: pid, coletado_em: '2026-04-01', data_coleta_desconhecida: false }, results: [{ exame_id: 'EXA-001', valor: 1 }] } }));
  out.rpc2 = h(await sb.rpc('salvar_coleta_laboratorial', { payload: { collection: { patient_id: pid, clinical_date: '2026-04-01', state: 'salvo' }, results: [{ exam_code: 'LAB-002', value_original_text: '1' }] } }));
  out.rpc3 = h(await sb.rpc('revisar_coleta_laboratorial', { payload: { collection_id: cid, reason: 'x', results: [] } }));
  out.rpc4 = h(await sb.rpc('marcar_coleta_revisada', { payload: { collection_id: cid } }));
  out.ins = h(await sb.from('lab_collections').insert([{ patient_id: pid, coletado_em: '2026-04-01', data_coleta_desconhecida: false }]));
  out.upd = h(await sb.from('lab_collections').update({ observacao: 'x' }).eq('id', cid));
  out.del = h(await sb.from('lab_collections').delete().eq('id', cid));
  out.res = h(await sb.from('lab_results').delete().eq('collection_id', cid));
  return out;
}, PA, CID);
ok(grava.nova === 'laboratorio_desativado' && grava.editar === 'laboratorio_desativado', 'Sincronizacao.salvarColeta (nova e editar): recusa');
ok(['rpc1', 'rpc2', 'rpc3', 'rpc4'].every(k => grava[k] === 'laboratorio_desativado'), 'as 4 RPCs de laboratorio: laboratorio_desativado');
ok(['ins', 'upd', 'del', 'res'].every(k => grava[k] === '42501'), 'tabelas lab_collections/lab_results: insert, update e delete sem permissao (42501)');
ok(srv.linhas('lab_collections').length === 1 && srv.linhas('lab_results').length === 1 && srv.linhas('lab_collections')[0].observacao === null, 'a coleta historica continua unica e intacta');

titulo('4. VALOR LEGADO NO APARELHO: NAO SOBE, NAO SOME, NAO APARECE');
await A.evaluate((pid) => { localStorage.setItem('holohacking.exames', JSON.stringify({ [pid]: { 'EXA-005': 8765 } })); }, PA);
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
const legado = await A.evaluate(async (pid) => {
  await window.Sincronizacao.aguardar();
  window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 700));
  const doc = document.getElementById('aba-documentos').innerText;
  window.levarParaFicha('aba:visao', pid); await new Promise(r => setTimeout(r, 500));
  return { local: (JSON.parse(localStorage.getItem('holohacking.exames') || '{}')[pid] || {})['EXA-005'], doc, visao: document.getElementById('aba-visao').innerText };
}, PA);
ok(legado.local === 8765 && srv.linhas('lab_collections').length === 1, 'o valor legado continua no aparelho e nao virou coleta no servidor');
ok(!/8765/.test(legado.doc) && !/8765/.test(legado.visao), 'e nao aparece na aba Documentos nem na Visao geral');

titulo('5. TROCAR DE PACIENTE: A BIBLIOTECA E DO PACIENTE CERTO');
const troca = await A.evaluate(async (pa, pb) => {
  const f = new File(['%PDF-1.4 a'], 'laudo-a.pdf', { type: 'application/pdf' });
  await window.ArquivoStore.salvar(pa, f, { nome: 'laudo-a.pdf', titulo: 'Laudo da paciente A', tipo: 'Exame', data: '2026-03-20' });
  const lista = async (pid) => { window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 800)); return [...document.querySelectorAll('.bib-item .bib-titulo')].map(e => e.textContent); };
  return { a: await lista(pa), b: await lista(pb), a2: await lista(pa) };
}, PA, PB);
ok(troca.a.join() === 'Laudo da paciente A' && troca.b.length === 0 && troca.a2.join() === 'Laudo da paciente A', 'A ve o laudo; B nao; voltar a A mostra o laudo de novo');

titulo('6. HOLOSCAN INTOCADO');
const depois = await A.evaluate((pid) => { const u = window.ultimaPontuacao(pid); return JSON.stringify({ i: u.indice, s: u.sistemas.map(x => [x.sistema, x.nota, x.faixa]), t: u.triada }); }, PA);
ok(depois === antes, 'Indice, notas, faixas e Triada identicos antes e depois');
ok(JSON.stringify(srv.linhas('holoscan_system_scores').filter(s => s.application_id === HID)) === scoresAntes, 'os scores no servidor nao mudaram');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
