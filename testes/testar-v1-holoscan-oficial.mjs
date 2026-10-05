/**
 * V1 — CORRECAO P0 (pos-deploy 6.4) — HOLOSCAN OFICIAL: MESMO MOTOR NA TELA E NO DADO SALVO (sem navegador)
 *
 * Achado da auditoria: "Gerar o mapa" usava o motor LEGADO (holoscan.js: pesos 1..3, vinculos secundarios
 * pontuando, Indice renormalizado) e "Salvar" carimbava HOLOS-V1@2. Com as mesmas 84 respostas: legado
 * Indice 54 x oficial 51,3. Aqui se prova, sobre o pacote HOLOS-V1 aprovado (fixture = mesmo conteudo do real):
 *  1. PARIDADE: HoloscanOficial (tela) = MotorMetodologico (modo oficial) = payload = linhas salvas (5 sistemas,
 *     contagens, Indice, faixas, Triada, cobertura, ausencia)
 *  2. SECONDARY_CONTEXTUAL: as 11 secundarias aparecem como contexto e nao mudam nota nem total_marcadores
 *  3. PACOTE AUSENTE / NAO APROVADO / NAO VIGENTE: nada se calcula como oficial; ErroSemPacote, sem fallback
 *  4-6. RPC (servidor falso = migration 20261005100000): recusa pacote nao aprovado, nao vigente, proveniencia
 *     nula, hash/versao divergentes, secundaria contada, combinacoes; aceita a aplicacao oficial
 *  7. Panorama/exames/ferramentas nao entram no calculo oficial (o motor oficial nem os recebe)
 *  8. Selo por proveniencia: oficial V1 sem "em homologacao"; historica = "sem pacote metodologico V1"
 *  9. migracao local: HOLOSCAN so do navegador nao sobe sem proveniencia
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import '../metodologia-pacote.js';
import '../metodologia-motor.js';
import '../metodologia-decisoes-v1.js';
import '../metodologia.js';
import '../holoscan-oficial.js';
import { criarServidor } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url).pathname;
vm.runInThisContext(readFileSync(RAIZ + 'holoscan.js', 'utf8') + ';globalThis.HOLOSCAN = HOLOSCAN;');
const P = globalThis.PacoteMetodologico, MM = globalThis.MotorMetodologico, B = globalThis.Metodologia, O = globalThis.HoloscanOficial, H = globalThis.HOLOSCAN;
const erro = (f) => { try { f(); return null; } catch (e) { return e; } };

// ---- servidor falso com o HOLOS-V1 APROVADO pelo caminho real (aprovador unico) ----
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x');
const pkRow = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
/** o pacote como o navegador o carrega (PacoteMetodologico.carregar: linha + filhas) */
function montarComoCliente(id) {
  const row = srv.linhas('methodology_packages').find(x => x.id === id);
  const p = Object.assign(P.novo(row.code, row.version), JSON.parse(JSON.stringify(row)));
  const de = (t) => srv.linhas(t).filter(l => l.package_id === id).map(l => JSON.parse(JSON.stringify(l)));
  p.edicao = de('methodology_questionnaire_editions')[0]; p.escalas = de('methodology_scales'); p.sistemas = de('methodology_systems');
  p.perguntas = de('methodology_questions'); p.associacoes = de('methodology_associations'); p.faixas = de('methodology_ranges');
  p.regras = de('methodology_rules'); p.registros = de('methodology_homologation_records'); p.aprovacoes = de('methodology_package_approvals');
  return p;
}
let PACOTE = montarComoCliente(pkRow.id);
P.ativo = (dia) => (PACOTE && P.vigente(PACOTE, dia) ? PACOTE : null);   // o cache do cliente (carregar) com o pacote do servidor

const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const pa = q('patients', 'insert', { dados: { nome: 'P0 TESTE FICTICIO' } }).data[0].id;
const en = q('encounters', 'insert', { dados: { patient_id: pa, occurred_at: new Date().toISOString() } }).data[0].id;
const HOJE = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();

titulo('PACOTE OFICIAL CARREGADO');
ok(pkRow.status === 'aprovado' && pkRow.governance_regime === 'aprovador_unico' && B.status() === 'aprovado' && B.pacote().code === 'HOLOS-V1' && O.disponivel(),
  'HOLOS-V1 aprovado (aprovador unico) e vigente: Metodologia "aprovado", HoloscanOficial disponivel');
const ids = PACOTE.perguntas.map(x => x.stable_id).sort();
const RESP = {}; ids.forEach((id, i) => { RESP[id] = (i * 7 + 3) % 4; });

titulo('1. PARIDADE — TELA = MOTOR OFICIAL = PAYLOAD = SALVO');
const r = O.calcular(RESP, { patient_id: pa });
const v = MM.calcular({ responses: RESP, methodology_package: PACOTE, mode: 'oficial', engine_version: MM.VERSAO, questionnaire_edition: { code: PACOTE.edicao.code, version: PACOTE.edicao.version }, application_context: { applied_at: HOJE, patient_id: pa } });
ok(r.oficial === true && r.calculation_mode === 'oficial' && r.methodology_package_id === pkRow.id && r.methodology_package_version === 2 && r.methodology_content_hash === pkRow.content_hash
  && r.engine_version === MM.VERSAO && r.engine_contract_version === MM.CONTRATO, 'resultado oficial com proveniencia do CALCULO: pacote, versao, hash homologado, motor e contrato');
const sistOk = Object.keys(v.system_results).every(c => {
  const a = r.sistemas.find(s => s.sistema === c), b = v.system_results[c];
  return a && a.nota === b.nota && a.nota_exata === b.nota_exata && a.nota_exibicao === b.nota_exibicao && a.faixa === b.faixa && a.respondidos === b.respondidos && a.total_marcadores === b.total && a.avaliavel === b.avaliavel;
});
ok(r.sistemas.length === 5 && sistOk, '5 sistemas: nota (exata e de tela), faixa, respondidos, total e avaliavel identicos ao MotorMetodologico');
ok(r.indice === v.index_result.valor && r.indice_exibicao === v.index_result.valor_exibicao && r.nota_media === v.index_result.valor / 10, 'Indice identico ao motor (' + r.indice_exibicao + '); nota_media = Indice/10');
ok(['fisico', 'mental', 'espiritual'].every(e => r.triada[e] === v.triad_result[e].nota && r.triada_exibicao[e] === v.triad_result[e].nota_exibicao && r.triada_com_dado[e] === v.triad_result[e].avaliavel), 'Triada identica ao motor');
ok(r.cobertura.respondidos === v.coverage.respondidos && r.cobertura.total === 84 && r.cobertura.fracao === v.coverage.fracao, 'cobertura identica (84/84)');
const leg = H.calcular(ids.map(id => ({ marcador_id: id, intensidade: RESP[id] })), {});
ok(leg.indice !== r.indice && leg.sistemas.find(s => s.sistema === 'metabolico').total_marcadores === 19 && r.sistemas.find(s => s.sistema === 'metabolico').total_marcadores === 14,
  'o achado reproduzido: motor legado Indice ' + leg.indice + ' (metabolico 19 itens) x oficial ' + r.indice_exibicao + ' (metabolico 14) — a tela agora usa o oficial');
const pl = O.payload(r, { patient_id: pa, encounter_id: en, quando: HOJE });
ok(pl.answers.length === 84 && pl.answers.every(a => RESP[a.marcador_id] === a.valor) && pl.scores.every(s => { const t = r.sistemas.find(x => x.sistema === s.sistema); return t.nota === s.nota && t.faixa === s.faixa && t.respondidos === s.respondidos && t.total_marcadores === s.total_marcadores; })
  && pl.application.indice === r.indice && pl.application.combinacoes.length === 0 && pl.application.aprofundamentos.length === 0, 'payload: as respostas DO CALCULO e as notas/Indice da tela; combinacoes e aprofundamentos vazios');
let res = rpc('salvar_holoscan_completo', { payload: pl });
const salvo = res.data && srv.linhas('holoscan_applications').find(x => x.id === res.data);
const scSalvos = res.data ? srv.linhas('holoscan_system_scores').filter(x => x.application_id === res.data) : [];
ok(!res.error && salvo && salvo.calculation_mode === 'oficial' && salvo.methodology_package_id === pkRow.id && salvo.methodology_content_hash === pkRow.content_hash && salvo.indice === r.indice
  && scSalvos.length === 5 && scSalvos.every(s => { const t = r.sistemas.find(x => x.sistema === s.sistema); return t.nota === s.nota && t.faixa === s.faixa && t.total_marcadores === s.total_marcadores; })
  && srv.linhas('holoscan_answers').filter(x => x.application_id === res.data).length === 84, 'salvo = tela: Indice, 5 notas, faixas, contagens, 84 respostas e proveniencia completa (' + (res.error ? res.error.message : 'ok') + ')');

titulo('2. SECONDARY_CONTEXTUAL NAO PONTUA');
const sec = PACOTE.associacoes.filter(a => a.role === 'secondary_contextual');
ok(sec.length === 11 && sec.every(a => a.weight === null || a.weight === undefined), '11 vinculos secondary_contextual, todos com weight nulo');
ok(r.contextuais.length === 11, 'as 11 aparecem como contexto no resultado (sem contribuicao numerica)');
// mexer SO nas respostas de itens cujo vinculo secundario e metabolico nao pode mudar a nota do metabolico
const secMet = sec.filter(a => a.destination_id === 'metabolico').map(a => a.question_stable_id);
const RESP2 = Object.assign({}, RESP); secMet.forEach(id => { RESP2[id] = RESP[id] === 3 ? 0 : 3; });
const r2 = O.calcular(RESP2, {});
const m1 = r.sistemas.find(s => s.sistema === 'metabolico'), m2 = r2.sistemas.find(s => s.sistema === 'metabolico');
ok(m1.nota_exata === m2.nota_exata && m1.total_marcadores === 14 && m2.total_marcadores === 14 && m1.respondidos === 14, 'mudar as respostas dos ' + secMet.length + ' itens com vinculo secundario metabolico nao muda a nota nem o total do Metabolico (14)');
ok(r.sistemas.reduce((a, s) => a + s.total_marcadores, 0) === 84, 'soma dos total_marcadores = 84 (so vinculos primarios; secundarios fora)');

titulo('7. PANORAMA / EXAMES / FERRAMENTAS NAO ENTRAM NO CALCULO OFICIAL');
globalThis.Panorama = { contexto: () => { throw new Error('o calculo oficial nao pode ler o Panorama'); } };
const r3 = O.calcular(RESP, { patient_id: pa });
ok(r3.indice === r.indice && JSON.stringify(r3.sistemas.map(s => s.nota_exata)) === JSON.stringify(r.sistemas.map(s => s.nota_exata)), 'o calculo oficial nao consulta Panorama.contexto() (exames/ferramentas) e da o mesmo resultado');
const legSem = H.calcular(ids.map(id => ({ marcador_id: id, intensidade: RESP[id] })), {});
const legCom = H.calcular(ids.map(id => ({ marcador_id: id, intensidade: RESP[id] })), { exames: { 'EXA-005': 500, 'EXA-001': 1 }, ferramentas: { x: { y: 9 } } });
ok(JSON.stringify([legSem.indice, legSem.sistemas.map(s => [s.nota, s.faixa]), legSem.triada]) === JSON.stringify([legCom.indice, legCom.sistemas.map(s => [s.nota, s.faixa]), legCom.triada]),
  'achado 7.22 (motor legado): o contexto so alimentava combinacoes — notas, faixas, Indice e Triada iguais com ou sem exames; e as combinacoes nao vao mais para a aplicacao');
delete globalThis.Panorama;

titulo('AUSENCIA E INDICE NULO (sem Indice parcial)');
const parcial = {}; ids.forEach(id => { parcial[id] = RESP[id]; });
PACOTE.associacoes.filter(a => a.role === 'primaria' && a.destination_id === 'fungico').slice(0, 4).forEach(a => { delete parcial[a.question_stable_id]; });
const rp = O.calcular(parcial, {});
const fung = rp.sistemas.find(s => s.sistema === 'fungico');
ok(fung.avaliavel === false && fung.nota === null && fung.faixa === null && rp.indice === null && rp.indice_exibicao === null && rp.nota_media === null && rp.indice_motivo,
  'Fungico abaixo de 80% (11/15): sem nota, sem faixa; Indice e nota_media NULOS (nunca parcial, nunca zero): ' + rp.indice_motivo.slice(0, 50));
res = rpc('salvar_holoscan_completo', { payload: O.payload(rp, { patient_id: pa, encounter_id: en, quando: HOJE }) });
ok(!res.error && srv.linhas('holoscan_applications').find(x => x.id === res.data).indice === null, 'a aplicacao incompleta e salva com Indice NULL (ausencia explicita)');

titulo('4-6. O SERVIDOR RECUSA O QUE NAO E OFICIAL');
const recusa = (p) => { const x = rpc('salvar_holoscan_completo', { payload: p }); return x.error ? (x.error.hint || x.error.message) : 'ACEITO'; };
const clone = (o) => JSON.parse(JSON.stringify(o));
const n0 = srv.linhas('holoscan_applications').length;
let p = clone(pl); p.application.methodology_package_id = null; p.application.methodology_package_version = null;
ok(recusa(p) === 'proveniencia_obrigatoria', '6: proveniencia nula recusada');
p = clone(pl); delete p.application.calculation_mode; ok(recusa(p) === 'modo_nao_oficial', 'resultado sem modo oficial (legado/homologacao) recusado');
p = clone(pl); p.application.methodology_package_version = 1; ok(recusa(p) === 'proveniencia_incoerente', 'versao divergente recusada');
p = clone(pl); p.application.methodology_content_hash = 'x'; ok(recusa(p) === 'hash_divergente', 'hash divergente recusado');
p = clone(pl); p.application.quando = '2025-12-31'; ok(recusa(p) === 'pacote_nao_vigente', '5: pacote nao vigente na data clinica recusado');
// fixture de teste NAO aprovada (nao e versao metodologica: TEST_FIXTURE_ONLY, so no banco falso)
const rasc = semearHolosAprovado(srv, UA, { code: 'TEST_FIXTURE_ONLY-NAO-APROVADO', version: 1, aprovar: false });
p = clone(pl); p.application.methodology_package_id = rasc.id; p.application.methodology_package_version = 1; ok(recusa(p) === 'pacote_nao_aprovado', '4: pacote nao aprovado (em_revisao) recusado');
p = clone(pl); const sm = p.scores.find(s => s.sistema === 'metabolico'); sm.total_marcadores = 19; sm.respondidos = 19; ok(recusa(p) === 'contagem_divergente', 'metabolico com as 5 secundarias contadas (19) recusado');
p = clone(pl); p.application.combinacoes = [{ id: 'CMB-001' }]; ok(recusa(p) === 'saida_nao_homologada', 'combinacoes na aplicacao oficial recusadas');
p = clone(pl); p.scores[0].faixa = 'medio'; ok(recusa(p) === 'faixa_fora_do_pacote', 'faixa legada (medio) recusada');
p = clone(pl); p.application.encounter_id = null; ok(recusa(p) === 'sem_atendimento', 'sem atendimento recusado');
ok(srv.linhas('holoscan_applications').length === n0, 'nenhuma das recusas criou aplicacao');
ok(q('holoscan_applications', 'insert', { dados: { patient_id: pa, quando: HOJE, versao_estrutura: 2, indice: 1, indice_maximo: 100, avaliavel: true, nota_media: 1, triada: {}, triada_com_dado: {}, cobertura: {} } }).error.code === '42501',
  'insert direto na tabela (fora da RPC) recusado');

titulo('3. PACOTE AUSENTE / NAO APROVADO / NAO VIGENTE: SEM CALCULO OFICIAL');
const guard = PACOTE;
PACOTE = null;
let e = erro(() => O.calcular(RESP, {}));
ok(!O.disponivel() && O.pacote() === null && e && e.codigo === 'sem_pacote_oficial' && e.message === O.MSG_SEM_PACOTE, '3: pacote nao carregado: ErroSemPacote com a mensagem clara; nada calculado (sem fallback para o legado)');
ok(erro(() => O.payload(Object.assign({}, r, { oficial: false }), {})).codigo === 'sem_pacote_oficial' && erro(() => O.payload(leg, {})).codigo === 'sem_pacote_oficial', 'payload recusa resultado nao oficial (inclusive o do motor legado)');
PACOTE = Object.assign(clone(guard), { status: 'em_revisao' });
ok(!O.disponivel() && O.pacote() === null, 'pacote em_revisao nao e oficial');
PACOTE = Object.assign(clone(guard), { effective_from: '2999-01-01' });
ok(!O.disponivel() && erro(() => O.calcular(RESP, {})).codigo === 'sem_pacote_oficial', 'pacote aprovado mas ainda nao vigente nao e oficial');
PACOTE = guard;

titulo('8. SELO POR PROVENIENCIA');
ok(B.naturezaAplicacao(r) === 'oficial_v1' && !/Em homologação/.test(B.seloAplicacao(r)) && /oficial/.test(B.seloAplicacao(r)) && !/homologa/i.test(B.avisoAplicacaoHtml(r)), 'aplicacao oficial V1: selo "oficial", sem "Em homologação"');
const hist = { quando: '2026-09-30', indice: 54, sistemas: [] };
const visivel = (h) => h.replace(/<[^>]+>/g, '');
ok(B.naturezaAplicacao(hist) === 'historica_sem_pacote' && visivel(B.seloAplicacao(hist)) === 'Aplicação histórica sem pacote metodológico V1' && !/não aprovad/.test(B.avisoAplicacaoHtml(hist)) && /não é saída oficial V1/.test(B.avisoAplicacaoHtml(hist)),
  'historica: "Aplicação histórica sem pacote metodológico V1" — nao finge ser oficial, nao diz que o pacote atual nao foi aprovado');
ok(B.naturezaAplicacao({ indice: 1, homologacao_legado: true }) === 'homologacao' && /Em homologação/.test(B.seloAplicacao({ homologacao_legado: true })), 'modo homologacao (motor legado em ?homologacao=1): selo de homologacao');
ok(!/ainda não foram aprovados/.test(B.aviso()) && /não homologado/.test(B.aviso()), 'com pacote aprovado, o aviso generico deixa de dizer que perguntas/pesos/faixas nao foram aprovados');

titulo('9. MIGRACAO LOCAL: HOLOSCAN SO DO NAVEGADOR NAO SOBE SEM PROVENIENCIA');
const mig = readFileSync(RAIZ + 'migracao-supa.js', 'utf8');
ok(/function migrarHoloscan\(\)[\s\S]{0,900}return Promise\.resolve\(0\);/.test(mig) && !/rpc\("salvar_holoscan_completo"/.test(mig), 'migracao-supa nao chama mais salvar_holoscan_completo (mapas legados ficam no aparelho)');
const q2 = readFileSync(RAIZ + 'questionario.js', 'utf8');
ok(!/Panorama\.contexto\(\)/.test(q2) && /HoloscanOficial/.test(q2) && /tentar-novamente/.test(q2), 'questionario: sem Panorama.contexto(), calcula pelo HoloscanOficial, com "Tentar novamente"');

if (falhou) process.exitCode = 1;
