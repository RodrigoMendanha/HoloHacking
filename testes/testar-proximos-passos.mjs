/**
 * PROXIMOS PASSOS HOLOS (motor oficial V1) — Supabase falso, com conta, navegador. Cobre os 20 testes obrigatorios:
 *   1  sistema 1 + sistema 2 -> principal + 2 complementares       11  Conduta vazia: a recomendacao existe mesmo assim
 *   2  ferramenta duplicada e deduplicada                            12  HOLOS AI "em desenvolvimento": nada muda
 *   3  concluida no atendimento atual e pulada                       13  o botao abre a ferramenta certa
 *   4  concluida em atendimento anterior NAO e excluida              14  e mantem o paciente certo
 *   5  nenhum sistema avaliavel -> nenhuma recomendacao              15  ausencia de dados nao vira recomendacao
 *   6  um sistema avaliavel -> ate 3 daquele sistema                 16  catalogo novo nao altera o registro antigo
 *   7  regra nao aprovada nunca aparece (servidor)                   17  Resultado da paciente nao recebe a recomendacao
 *   8  ferramenta fora das 10 nunca aparece (servidor)               18  PDF/WhatsApp nao recebem a recomendacao
 *   9  REC legada nunca aparece                                      19  mesma entrada + mesma versao = mesma saida
 *  10  exame nunca influencia                                        20  RLS: o frontend nao altera o catalogo nem os registros
 *  +  resultado ainda nao salvo: previa com o mesmo motor; ao salvar o HOLOSCAN, o registro e feito no servidor
 *  +  aplicacao anterior ao catalogo: nada automatico; acao explicita registra
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, semearHistorica, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const agora = () => new Date().toISOString();
const hoje = agora().slice(0, 10);
const paciente = (nome) => ins('patients', { nome }).id;
const atendimento = (pid, quando) => ins('encounters', { patient_id: pid, occurred_at: quando || agora(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
/* notas controladas: {sistema: nota|null}; null = nao avaliavel (sem nota, sem faixa); Indice so com todos avaliaveis */
function app(pid, eid, notas) {
  const pl = payloadOficial(srv, pk.id, { patient_id: pid, encounter_id: eid, quando: hoje });
  pl.scores = pl.scores.map(s => (s.sistema in notas) ? (notas[s.sistema] === null ? Object.assign({}, s, { avaliavel: false, nota: null, faixa: null }) : Object.assign({}, s, { nota: notas[s.sistema] })) : s);
  if (pl.scores.some(s => !s.avaliavel)) { pl.application.indice = null; pl.application.nota_media = null; pl.application.avaliavel = pl.scores.some(s => s.avaliavel); }
  const r = rpc('salvar_holoscan_completo', { payload: pl });
  if (r.error) throw new Error('holoscan: ' + r.error.message);
  return r.data;
}
const NOTAS = { fungico: 3, metabolico: 4, acido_inflamatorio: 7, detox_linfatico: 7, mental_emocional_espiritual: 7 };
const concluir = (pid, eid, ferr) => ins('tool_applications', { patient_id: pid, encounter_id: eid, ferramenta_id: ferr, versao_ferramenta: '1', status: 'concluida', respostas: { eventos: [] }, iniciada_em: agora(), concluida_em: agora() });

const P1 = paciente('Paciente PP Um Ficticia'); const E1 = atendimento(P1); const A1 = app(P1, E1, NOTAS);
const P2 = paciente('Paciente PP Dois Ficticia'); const E2 = atendimento(P2); concluir(P2, E2, 'mapa_rotina_v1'); const A2 = app(P2, E2, NOTAS);
const P3 = paciente('Paciente PP Tres Ficticia'); const E3a = atendimento(P3, new Date(Date.now() - 86400000 * 30).toISOString()); concluir(P3, E3a, 'mapa_rotina_v1'); const E3 = atendimento(P3); const A3 = app(P3, E3, NOTAS);
const P4 = paciente('Paciente PP Quatro Ficticia'); const E4 = atendimento(P4); const A4 = app(P4, E4, { fungico: 3, metabolico: null, acido_inflamatorio: null, detox_linfatico: null, mental_emocional_espiritual: null });
const P5 = paciente('Paciente PP Cinco Ficticia'); const E5 = atendimento(P5); const A5 = app(P5, E5, { fungico: null, metabolico: null, acido_inflamatorio: null, detox_linfatico: null, mental_emocional_espiritual: null });
const P6 = paciente('Paciente PP Seis Ficticia'); const A6 = semearHistorica(srv, UA, { application: { patient_id: P6, quando: '2026-05-01', indice: 40 }, scores: [{ sistema: 'fungico', nome: 'F', nota: 3, carga: 3, faixa: 'baixo', obtido: 1, maximo: 3, respondidos: 2, total_marcadores: 2, avaliavel: true }] });
const P7 = paciente('Paciente PP Sete Ficticia'); const E7 = atendimento(P7); const A7 = app(P7, E7, NOTAS);
srv.tabelas.holoscan_applications.find(a => a.id === A7).created_at = '2026-01-01T00:00:00.000Z';   // anterior ao catalogo
const P8 = paciente('Paciente PP Oito Ficticia');
ok(A1 && A2 && A3 && A4 && A5 && A6 && A7 && srv.linhas('holos_recommendation_rules').length === 30 && srv.linhas('conducts').length === 0, 'fixtures: 7 aplicacoes (5 oficiais + 1 historica + 1 anterior ao catalogo), catalogo com 30 regras, NENHUMA conduta');
const nomeSis = {}; srv.linhas('methodology_systems').filter(x => x.package_id === pk.id).forEach(x => { nomeSis[x.code] = x.name; });
const regs = (aid) => srv.linhas('holos_next_steps').filter(n => n.holoscan_application_id === aid);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1100 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await A.evaluate(async () => { await window.Sincronizacao.aguardar(); });

/* abre o HOLOSCAN do paciente e espera o bloco de Proximos Passos terminar */
async function bloco(pid) {
  await A.evaluate(async (id) => { window.definirPacienteAtivo(id); document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300)); }, pid);
  const alvo = () => { const a = document.getElementById('holo-proximos-passos'); const v = document.getElementById('holo-proximos-passos-vazio'); return (a && a.innerText) ? a : (v && !v.classList.contains('hidden') && v.innerText) ? v : null; };
  await A.waitForFunction(() => { const a = document.getElementById('holo-proximos-passos'); const v = document.getElementById('holo-proximos-passos-vazio'); const b = (a && a.innerText) ? a : (v && !v.classList.contains('hidden')) ? v : null; return b && b.innerText && !/carregando/i.test(b.innerText); }, { timeout: 10000 }).catch(() => {});
  return A.evaluate(() => {
    const a0 = document.getElementById('holo-proximos-passos'); const v0 = document.getElementById('holo-proximos-passos-vazio');
    const b = (a0 && a0.innerText) ? a0 : (v0 && !v0.classList.contains('hidden') && v0.innerText) ? v0 : null;
    const card = (el) => ({ regra: el.dataset.ppRegra, ferramenta: el.querySelector('.pp-ferramenta').childNodes[0].textContent.trim(), tool: el.querySelector('[data-pp-abrir]').dataset.ppAbrir,
      sistema: (el.querySelector('.pp-sistema b') || {}).textContent, sinais: [...el.querySelectorAll('.pp-sinais li')].map(x => x.textContent), razao: el.querySelector('.pp-razao').textContent, acao: el.querySelector('.pp-acao p').textContent });
    return { texto: b ? b.innerText : '(sem bloco)', principal: b && b.querySelector('.pp-principal') ? card(b.querySelector('.pp-principal')) : null,
      comps: b ? [...b.querySelectorAll('.pp-comps .pp-card')].map(card) : [], meta: b ? (b.querySelector('.pp-meta') || {}).textContent : '', botaoAtual: !!(b && b.querySelector('#pp-ver-atual')),
      posicao: (() => { const inv = [...document.querySelectorAll('#holo-resumo .res-tit')].map(t => t.textContent); return inv.indexOf('Por onde investigar') >= 0 && inv.indexOf('Próximos Passos HOLOS') === inv.indexOf('Por onde investigar') + 1; })() };
  });
}
const PROIBIDO = /tratamento|prescri[çc][ãa]o|diagn[óo]stico|\bcura\b|protocolo indicado|conduta obrigat[óo]ria/i;

titulo('1-2. SISTEMA 1 + SISTEMA 2: PRINCIPAL + 2 COMPLEMENTARES, SEM REPETIR');
const b1 = await bloco(P1);
ok(b1.posicao && /Ferramentas do método que podem ajudar a aprofundar as áreas prioritárias desta aplicação/.test(b1.texto), 'o bloco "Próximos Passos HOLOS" entra logo depois de "Por onde investigar", com o subtítulo');
ok(b1.principal && b1.principal.regra === 'REC-FUN-01' && b1.principal.tool === 'mapa_rotina_v1' && b1.principal.ferramenta === 'Mapa da Rotina', 'principal: REC-FUN-01 Mapa da Rotina (sistema de nota mais baixa): ' + JSON.stringify(b1.principal && b1.principal.regra));
ok(b1.comps.map(c => c.regra).join(',') === 'REC-MET-02,REC-FUN-03' && b1.comps.map(c => c.tool).join(',') === 'gatilhos_respostas_v1,mapa_crencas', 'complementares: REC-MET-02 (MET-01 repetiria o Mapa da Rotina) e REC-FUN-03: ' + b1.comps.map(c => c.regra).join(','));
ok(new Set([b1.principal.tool].concat(b1.comps.map(c => c.tool))).size === 3, 'nenhuma ferramenta repetida entre os 3 cards');
ok(b1.principal.sistema === nomeSis.fungico && b1.comps[0].sistema === nomeSis.metabolico && b1.principal.sinais.length === 3 && b1.principal.sinais.every(s => s.length > 5), 'cada card diz o sistema de origem (nome oficial do pacote) e ate 3 sinais dominantes com o texto da pergunta');
ok(/Este sistema apareceu entre as áreas prioritárias desta aplicação\. Estes foram alguns dos sinais que mais contribuíram para sua pontuação\./.test(b1.texto) && /Por que esta ferramenta\?/i.test(b1.texto) && /O que fazer agora/i.test(b1.texto), 'explicacao sem causalidade; "Por que esta ferramenta?" e "O que fazer agora"');
ok(b1.principal.razao === 'Ajuda a localizar alimentação, horários, sinais percebidos e hábitos dentro do cotidiano real.' && /Aplique o Mapa da Rotina/.test(b1.principal.acao), 'professional_reason e next_action vem do catalogo, sem alteracao');
ok(!PROIBIDO.test(b1.texto), 'linguagem: sem tratamento, prescrição, diagnóstico, cura, protocolo indicado, conduta obrigatória');
ok(/registrado em/.test(b1.meta) && regs(A1).length === 1 && regs(A1)[0].catalog_version === 1 && regs(A1)[0].selection.map(s => s.rule_id).join(',') === 'REC-FUN-01,REC-MET-02,REC-FUN-03', 'aplicacao salva depois do catalogo: registrada automaticamente no servidor (1 snapshot, catalogo v1, mesma selecao)');
ok(/Outras possibilidades de aprofundamento/i.test(b1.texto) && /Próximo passo recomendado/i.test(b1.texto), 'titulos dos cards: "Próximo passo recomendado" e "Outras possibilidades de aprofundamento"');

titulo('3-4. FERRAMENTA CONCLUIDA NO ATENDIMENTO ATUAL X EM ATENDIMENTO ANTERIOR');
const b2 = await bloco(P2);
ok(b2.principal && b2.principal.regra === 'REC-FUN-02' && b2.comps.map(c => c.regra).join(',') === 'REC-MET-03,REC-FUN-04', 'Mapa da Rotina concluido NESTE atendimento e pulado: FUN-02, MET-03, FUN-04: ' + [b2.principal && b2.principal.regra].concat(b2.comps.map(c => c.regra)).join(','));
const b3 = await bloco(P3);
ok(b3.principal && b3.principal.regra === 'REC-FUN-01', 'Mapa da Rotina concluido em atendimento ANTERIOR nao e excluido (sem janela de dias): ' + (b3.principal && b3.principal.regra));

titulo('5-6, 15. UM OU NENHUM SISTEMA AVALIAVEL');
const b4 = await bloco(P4);
ok(b4.principal && b4.principal.regra === 'REC-FUN-01' && b4.comps.map(c => c.regra).join(',') === 'REC-FUN-02,REC-FUN-03', 'so o fungico avaliavel: ate 3 regras dele, por rank: ' + b4.comps.map(c => c.regra).join(','));
const b5 = await bloco(P5);
ok(!b5.principal && b5.comps.length === 0 && /Não há dados suficientes para gerar Próximos Passos HOLOS nesta aplicação\./.test(b5.texto), 'nenhum sistema avaliavel: nenhuma ferramenta, com o motivo (ausencia de dados nao vira recomendacao)');
const b6 = await bloco(P6);
ok(!b6.principal && /só para aplicações oficiais/.test(b6.texto) && regs(A6).length === 0, 'aplicacao historica (sem pacote oficial): nada e inventado, nada e registrado');

titulo('APLICACAO ANTERIOR AO CATALOGO: NADA AUTOMATICO; ACAO EXPLICITA');
const b7 = await bloco(P7);
ok(!b7.principal && b7.botaoAtual && /anterior ao catálogo/.test(b7.texto) && regs(A7).length === 0, 'aplicacao anterior ao catalogo: so o botao "Ver Próximos Passos segundo o catálogo atual"; nenhum registro');
await A.evaluate(async () => { document.getElementById('pp-ver-atual').click(); await new Promise(r => setTimeout(r, 800)); });
const b7b = await A.evaluate(() => ({ regra: (document.querySelector('#holo-proximos-passos .pp-principal') || {}).dataset ? document.querySelector('#holo-proximos-passos .pp-principal').dataset.ppRegra : null, meta: (document.querySelector('#holo-proximos-passos .pp-meta') || {}).textContent }));
ok(b7b.regra === 'REC-FUN-01' && /ação explícita/.test(b7b.meta) && regs(A7).length === 1, 'depois do clique: recomendacao calculada pelo catalogo atual e registrada');
/* teste de ponta a ponta 10/10: no tema claro o texto do cartao herdava o creme da secao e ficava ilegivel */
const contraste = await A.evaluate(() => {
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const card = document.querySelector('#holo-proximos-passos .pp-principal'), txt = card.querySelector('.pp-razao') || card;
  const a = lum(getComputedStyle(txt).color), b = lum(getComputedStyle(card).backgroundColor);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
});
ok(contraste >= 4.5, 'texto do cartao dos Próximos Passos legível (contraste ' + contraste.toFixed(1) + ':1, mínimo 4,5:1)');

titulo('13-14. O BOTAO ABRE A FERRAMENTA CERTA E MANTEM O PACIENTE');
await bloco(P1);
const abriu = await A.evaluate(async () => {
  document.querySelector('#holo-proximos-passos .pp-principal [data-pp-abrir]').click();
  await new Promise(r => setTimeout(r, 600));
  const ativa = document.querySelector('.secao.ativa');
  const vista = document.querySelector('#vista-gen-corpo');
  return { secao: ativa ? ativa.id : null, texto: vista && !vista.classList.contains('hidden') ? vista.innerText.slice(0, 400) : document.getElementById('secao-corpo').innerText.slice(0, 400), pid: window.pacienteAtivoId() };
}, P1);
ok(abriu.secao === 'secao-corpo' && /Mapa da Rotina/.test(abriu.texto), 'Iniciar ferramenta abre o Mapa da Rotina (window.abrirFerramentaPorId): ' + abriu.secao);
ok(abriu.pid === P1, 'e o paciente ativo continua o da aplicacao');
const comp = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300));
  const b = document.querySelector('#holo-proximos-passos .pp-comps [data-pp-abrir="gatilhos_respostas_v1"]'); if (!b) return { achou: false };
  b.click(); await new Promise(r => setTimeout(r, 600));
  return { achou: true, secao: document.querySelector('.secao.ativa').id, texto: document.getElementById('secao-mente').innerText.slice(0, 300) };
});
ok(comp.achou && comp.secao === 'secao-mente' && /Gatilhos/.test(comp.texto), 'o card complementar abre a ferramenta dele (Gatilhos & Respostas, Mente)');

titulo('7-9. NAO APROVADA, FORA DAS 10 E REC LEGADA NUNCA APARECEM; 19. DETERMINISMO');
const prev = await A.evaluate(async (aid) => { const sb = window.supabaseClient; const a = await sb.rpc('proximos_passos_holos', { p_application_id: aid }); const b = await sb.rpc('proximos_passos_holos', { p_application_id: aid }); return { a: a.data, b: b.data, erro: a.error }; }, A2);
const limpo = (x) => { const c = Object.assign({}, x); delete c.registrado; delete c.registro_id; delete c.registrado_em; return JSON.stringify(c); };
ok(!prev.erro && limpo(prev.a) === limpo(prev.b) && limpo(prev.a) === limpo(regs(A2)[0].content_snapshot), 'a previa e deterministica e igual ao snapshot registrado (mesma entrada + mesma versao = mesma saida)');
ok(prev.a.selection.every(s => /^REC-(FUN|AIN|MET|DTL|MEE)-0[1-6]$/.test(s.rule_id)) && prev.a.selection.every(s => ['oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1'].includes(s.tool_id)), 'so regras do catalogo novo e so as 10 ferramentas (nenhuma REC-001…023/SEL-001, nenhuma travada)');
const fun01 = srv.tabelas.holos_recommendation_rules.find(r => r.rule_id === 'REC-FUN-01'); fun01.status = 'retirado';
const semFun01 = await A.evaluate(async (aid) => (await window.supabaseClient.rpc('proximos_passos_holos', { p_application_id: aid })).data.selection.map(s => s.rule_id).join(','), A3);
fun01.status = 'aprovado';
ok(semFun01 === 'REC-FUN-02,REC-MET-01,REC-FUN-03', 'regra retirada no servidor nunca aparece (REC-FUN-01 retirada -> FUN-02; MET-01 entra porque o Mapa da Rotina de P3 foi em OUTRO atendimento; FUN-03): ' + semFun01);
ok(!/REC-0\d\d|SEL-001/.test(JSON.stringify(srv.linhas('holos_recommendation_rules'))), 'o catalogo do servidor nao contem nenhuma REC legada');

titulo('10-12. EXAME, CONDUTA VAZIA E HOLOS AI NAO INFLUENCIAM');
srv.tabelas.lab_collections.push({ id: crypto.randomUUID(), nutritionist_id: UA, patient_id: P1, encounter_id: E1, coletado_em: '2026-03-01', data_coleta_desconhecida: false, state: 'salvo', source: 'manual', revision: 1, created_by: UA, created_at: agora(), updated_at: agora() });
const b1x = await bloco(P1);
ok(b1x.principal.regra === 'REC-FUN-01' && b1x.comps.map(c => c.regra).join(',') === 'REC-MET-02,REC-FUN-03' && regs(A1).length === 1, 'com uma coleta historica no paciente, nada muda (o motor nem le exames); o registro continua um so');
ok(srv.linhas('conducts').length === 0 && b1x.principal, 'sem nenhuma Conduta, a recomendacao existe (nao depende de objetivo, estrategia, acoes…)');
const ia = await A.evaluate(async (pid) => { window.levarParaFicha('aba:holos-ai', pid); await new Promise(r => setTimeout(r, 500)); const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 300));
  return { texto: (document.getElementById('ai-hub-texto') || {}).textContent || '', selo: document.getElementById('aba-holos-ai').innerText }; }, P1);
ok(ia.selo.length > 20 && !/Próximos Passos|REC-FUN|Mapa da Rotina/.test(ia.texto), 'HOLOS AI (contexto) nao recebe a recomendacao (nao integrada nesta tarefa) e a recomendacao existiu sem ela');

titulo('16. CATALOGO NOVO NAO ALTERA O REGISTRO ANTIGO');
{
  const c1 = srv.tabelas.holos_recommendation_catalogs[0]; const c2 = Object.assign({}, c1, { id: crypto.randomUUID(), version: 2, content_hash: 'v2-fixture', created_at: agora() });
  srv.tabelas.holos_recommendation_catalogs.push(c2);
  const v2 = srv.tabelas.holos_recommendation_rules.filter(r => r.catalog_id === c1.id).map(r => Object.assign({}, r, { id: crypto.randomUUID(), catalog_id: c2.id, catalog_version: 2, rule_id: 'V2-' + r.rule_id, rank: r.rank === 1 ? 6 : r.rank === 6 ? 1 : r.rank }));
  v2.forEach(r => srv.tabelas.holos_recommendation_rules.push(r));
  await A.evaluate(() => window.ProximosPassos.esquecer());
  const b1v2 = await bloco(P1);
  const previaV2 = await A.evaluate(async (aid) => (await window.supabaseClient.rpc('proximos_passos_holos', { p_application_id: aid })).data, A1);
  ok(b1v2.principal.regra === 'REC-FUN-01' && /registrado em/.test(b1v2.meta) && regs(A1).length === 1 && regs(A1)[0].catalog_version === 1 && regs(A1)[0].content_hash === regs(A1)[0].content_hash,
    'com um catalogo v2 no servidor, a tela continua mostrando o registro v1 (nunca recalculado em silencio)');
  ok(previaV2.catalogo.version === 2 && previaV2.selection[0].rule_id === 'V2-REC-FUN-06', 'a previa pelo catalogo atual ja seria outra (v2) — mas so viraria registro novo por acao, sem tocar o v1');
  srv.tabelas.holos_recommendation_rules = srv.tabelas.holos_recommendation_rules.filter(r => r.catalog_id !== c2.id);
  srv.tabelas.holos_recommendation_catalogs = srv.tabelas.holos_recommendation_catalogs.filter(c => c.id !== c2.id);
  await A.evaluate(() => window.ProximosPassos.esquecer());
}

titulo('20. RLS: O FRONTEND NAO ALTERA O CATALOGO NEM OS REGISTROS');
const rls = await A.evaluate(async (aid) => {
  const sb = window.supabaseClient; const h = (r) => (r.error ? r.error.code : 'GRAVOU');
  return {
    regraIns: h(await sb.from('holos_recommendation_rules').insert([{ rule_id: 'REC-FUN-07', system_id: 'fungico', rank: 6, tool_id: 'pqq', professional_reason: 'x', next_action: 'y', status: 'aprovado' }])),
    regraUpd: h(await sb.from('holos_recommendation_rules').update({ rank: 2 }).eq('rule_id', 'REC-FUN-01')),
    regraDel: h(await sb.from('holos_recommendation_rules').delete().eq('rule_id', 'REC-FUN-01')),
    catUpd: h(await sb.from('holos_recommendation_catalogs').update({ status: 'retirado' }).eq('version', 1)),
    regIns: h(await sb.from('holos_next_steps').insert([{ holoscan_application_id: aid, patient_id: 'x', catalog_id: 'y', catalog_code: 'z', catalog_version: 1, catalog_hash: 'h', engine_version: 'x', systems_order: [], selection: [], content_snapshot: {}, content_hash: 'h' }])),
    regUpd: h(await sb.from('holos_next_steps').update({ selection: [] }).eq('holoscan_application_id', aid)),
    regDel: h(await sb.from('holos_next_steps').delete().eq('holoscan_application_id', aid)),
    le: (await sb.from('holos_recommendation_rules').select('rule_id')).data.length
  };
}, A1);
ok(['regraIns', 'regraUpd', 'regraDel', 'catUpd', 'regIns', 'regUpd', 'regDel'].every(k => rls[k] === '42501') && rls.le === 30 && srv.linhas('holos_recommendation_rules').length === 30 && regs(A1).length === 1,
  'insert/update/delete no catalogo e nos registros: 42501; o frontend so le (30 regras)');

titulo('17-18. RESULTADO DA PACIENTE, PDF E WHATSAPP: RECOMENDACAO SO QUANDO COMPARTILHADA (item 180, padrao desligado)');
const RES = rpc('salvar_resultado_holos', { payload: { patient_id: P1, encounter_id: E1, holoscan_application_id: A1, tool_application_ids: [], visao_paciente: { ferramentas: {} }, leitura_profissional: 'Leitura da nutri', pontos_acompanhar: 'sono', questoes_aprofundar: 'x' } });
ok(!RES.error, 'fixture: Resultado HOLOS salvo para a paciente (' + (RES.error ? RES.error.message : 'ok') + ')');
const rp = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click();
  for (let i = 0; i < 50 && !document.getElementById('rp-doc'); i++) await new Promise(r => setTimeout(r, 100));
  const doc = document.getElementById('rp-doc');
  const p = (window.pacientesTodos() || []).find(x => x.id === pid);
  return { texto: doc ? doc.innerText : '', html: doc ? doc.innerHTML : '', whats: window.ResultadoPagina.mensagemWhatsApp(p, { saved_at: '2026-10-09' }, { nome: 'Nutri' }) };
}, P1);
ok(rp.texto.length > 100 && !/Próximos Passos|Mapa da Rotina|REC-FUN|Ajuda a localizar alimentação/.test(rp.texto) && !/pp-card|pp-principal/.test(rp.html), 'a pagina Resultado da paciente nao mostra os Proximos Passos');
ok(!/Próximos|REC-/.test(rp.whats), 'a mensagem do WhatsApp nao muda');
const snapR = srv.linhas('holos_results')[0].content_snapshot;
ok(snapR.template_version === 2 && snapR.visibilidade && snapR.visibilidade.proximos_passos === false && snapR.proximos_passos && typeof snapR.proximos_passos.registrado === 'boolean',
  'o snapshot do Resultado HOLOS congela os Proximos Passos (registrados ou nao) com o compartilhamento DESLIGADO por padrao')

titulo('RESULTADO AINDA NAO SALVO: PREVIA; AO SALVAR O HOLOSCAN, O REGISTRO');
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, P8);
const previaTela = await A.evaluate(async (respostas) => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 300));
  const m = {}; respostas.forEach(x => m[x.marcador_id] = x.intensidade);
  document.querySelectorAll('.q-item').forEach(i => { const v = m[i.dataset.marcador]; if (v !== undefined) i.querySelectorAll('.q-btn')[v].click(); });
  document.querySelector('[data-acao="calcular"]').click();
  for (let i = 0; i < 60; i++) { const b = document.getElementById('holo-proximos-passos'); if (b && b.innerText && !/carregando/i.test(b.innerText)) break; await new Promise(r => setTimeout(r, 100)); }
  const b = document.getElementById('holo-proximos-passos');
  return { cards: b.querySelectorAll('.pp-card').length, meta: (b.querySelector('.pp-meta') || {}).textContent || '', regra: (b.querySelector('.pp-principal') || { dataset: {} }).dataset.ppRegra, sistema1: document.querySelector('#holo-resumo .res-inv b').textContent, sistemaCard: (b.querySelector('.pp-sistema b') || {}).textContent };
}, caso.respostas);
ok(previaTela.cards >= 1 && /prévia/.test(previaTela.meta) && previaTela.sistemaCard === previaTela.sistema1, 'resultado calculado e ainda nao salvo: previa pelo mesmo motor, pelo MESMO primeiro sistema de "Por onde investigar" (' + previaTela.sistema1 + ')');
const antesSalvar = srv.linhas('holos_next_steps').length;
await A.evaluate(async () => { document.getElementById('btn-salvar-holoscan').click(); for (let i = 0; i < 60; i++) { const m = document.querySelector('#holo-proximos-passos .pp-meta'); if (m && /registrado em/.test(m.textContent)) break; await new Promise(r => setTimeout(r, 100)); } });
const salvo = await A.evaluate(() => ({ meta: (document.querySelector('#holo-proximos-passos .pp-meta') || {}).textContent || '', regra: (document.querySelector('#holo-proximos-passos .pp-principal') || { dataset: {} }).dataset.ppRegra }));
const novaApp = srv.linhas('holoscan_applications').find(a => a.patient_id === P8);
ok(/registrado em/.test(salvo.meta) && novaApp && srv.linhas('holos_next_steps').length === antesSalvar + 1 && regs(novaApp.id).length === 1 && regs(novaApp.id)[0].selection[0].rule_id === salvo.regra && regs(novaApp.id)[0].selection[0].rule_id === previaTela.regra,
  'ao salvar o HOLOSCAN: snapshot registrado no servidor para a aplicacao nova, com a mesma selecao da previa (' + previaTela.regra + ')');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
