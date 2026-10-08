/**
 * RESULTADO HOLOS (aba da ficha, resultado-holos.js) — Supabase falso, com conta:
 *   1  selecao explicita: nada vem marcado; sem HOLOSCAN nao salva; aplicacao historica aparece desabilitada
 *   2  rascunho: grava, recarrega e continua com a mesma selecao/visibilidade/observacoes
 *   3  previa e salvar: o snapshot vem do servidor; visao profissional com os blocos; XSS nas observacoes nao executa
 *   4  visao do paciente: so as ferramentas com "Mostrar ao paciente"; sem ids, hash, regras ou "pontuou"
 *   5  alterar a ferramenta depois de salvar nao muda o resultado (snapshot); observacao salva nao muda
 *   6  revisar; nova versao a partir desta (revisao 2, anterior intacta); historico
 *   7  outra sessao do mesmo usuario ve igual; outra conta nao ve nem grava; outro paciente nao entra
 *   8  paciente arquivado: nao gera novo resultado
 *   9  celular (390 px), acessibilidade e impressao
 *  10  nao interferencia: HOLOSCAN, notas, respostas, ferramentas, LI, exames e pacotes ficam iguais
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial, semearHistorica } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const qq = (uid) => (tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const q = qq(UA), qb = qq(UB);
const rpcComo = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const ins = (fn, tabela, dados) => { const r = fn(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };

const PA = ins(q, 'patients', { nome: 'Paciente Resultado Ficticia' }).id;
const PB = ins(q, 'patients', { nome: 'Outra Paciente Ficticia' }).id;
const EA = ins(q, 'encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EB = ins(q, 'encounters', { patient_id: PB, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const hoje = new Date().toISOString().slice(0, 10);
const HA = rpcComo(UA, 'salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: hoje }) }).data;
const HB = rpcComo(UA, 'salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PB, encounter_id: EB, quando: hoje }) }).data;
const HH = semearHistorica(srv, UA, { application: { patient_id: PA, quando: '2026-06-01' } });
const conc = new Date(Date.now() - 1800000).toISOString();
const tool = (pid, fid, respostas, status) => ins(q, 'tool_applications', { patient_id: pid, encounter_id: pid === PA ? EA : EB, ferramenta_id: fid, versao_ferramenta: '1', status: status || 'concluida', respostas, iniciada_em: conc, concluida_em: status === 'rascunho' ? null : conc }).id;
const T_OQ3 = tool(PA, 'oq3', { quer: 'ter mais energia', precisa: 'dormir melhor', consegue: 'caminhar 10 minutos' });
const T_PQQ = tool(PA, 'pqq', { objetivo: 'emagrecer', r1: 'para me sentir bem', verdadeiro: 'romper o ciclo de autoabandono' });
const T_GAT = tool(PA, 'gatilhos_respostas_v1', { gatilho: 'discussão em casa', pensamento: 'PENSAMENTO_INTIMO', emocao: 'raiva', resposta: 'come doce', necessidade: 'descanso' });
const T_CON = tool(PA, 'conexao_pertencimento_v1', { contar: 'irmã', vinculos: [{ rotulo: 'Irmã', natureza: 'pessoa', tipo: 'família', papel: 'apoia', proximidade: 'próxima' }] });
const T_ROD = tool(PA, 'roda_vida', { saude: '4', relacoes: '7', puxa: 'trabalho' });
const T_RAS = tool(PA, 'mapa_crencas', { crencas: 'rascunho' }, 'rascunho');
const T_B = tool(PB, 'mapa_crencas', { crencas: 'de outra paciente' });

const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'integrated_readings',
  'lab_collections', 'lab_results', 'methodology_packages', 'methodology_associations', 'methodology_ranges', 'methodology_questions', 'integrated_reading_rule_packages'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function sessao(email, senha, largura) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: largura || 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
const abrirAba = (P, pid) => P.evaluate(async (pid) => {
  window.levarParaFicha('aba:resultado-holos', pid);
  for (let i = 0; i < 60; i++) { const a = document.getElementById('aba-resultado-holos'); if (a && !/Carregando/.test(a.textContent) && a.querySelector('[data-rh-acao]')) break; await new Promise(r => setTimeout(r, 100)); }
}, pid);
const esperarDados = (P) => P.waitForFunction((pid) => window.Aplicacoes && window.Aplicacoes.doPaciente(pid).filter(a => a.status !== 'rascunho').length >= 5 &&
  (window.historicoPontuacao(pid) || []).some(h => h._supa_id), { timeout: 15000 }, PA);
const clicar = (P, sel) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const confirmarModal = async (P) => { await espera(250); await clicar(P, '#modal-confirmar-ok'); await espera(700); };
const texto = (P, sel) => P.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);
const shot = async (P, nome, sel) => { if (!process.env.SHOT_DIR) return; await P.addStyleTag({ content: '.topo,#toast{display:none!important}' }); const el = sel ? await P.$(sel) : null; if (el) await el.screenshot({ path: process.env.SHOT_DIR + '/' + nome + '.png' }); else await P.screenshot({ path: process.env.SHOT_DIR + '/' + nome + '.png', fullPage: true }); };

const A = await sessao('a@holo.test', 'senha-a-123');
await esperarDados(A);
await abrirAba(A, PA);

/* ----- 1 ----- */
ok(/Nenhum Resultado HOLOS ainda/.test(await texto(A, '#aba-resultado-holos')), 'histórico vazio no começo');
await clicar(A, '[data-rh-acao="novo"]'); await espera(200);
const sel0 = await A.evaluate(() => ({
  radios: document.querySelectorAll('input[name="rh-holoscan"]').length, marcados: document.querySelectorAll('#rh-form input:checked').length,
  historicaOff: [...document.querySelectorAll('input[name="rh-holoscan"]')].filter(r => r.disabled).length,
  mostrarOff: [...document.querySelectorAll('[data-rh-mostrar]')].every(c => c.disabled && !c.checked),
  rascunhoListado: !!document.querySelector('[data-rh-ferr="mapa_crencas"]'),
  opcoes: [...document.querySelectorAll('.rh-opcao-txt b')].map(b => b.textContent), meta: [...document.querySelectorAll('.rh-opcao-txt small')].map(b => b.textContent)
}));
ok(sel0.radios === 2 && sel0.marcados === 0 && sel0.mostrarOff, 'seleção explícita: nada vem marcado (nem o HOLOSCAN mais recente) e "Mostrar ao paciente" começa desligado');
ok(sel0.historicaOff === 1 && sel0.meta.some(m => /histórica, sem pacote oficial/.test(m)), 'a aplicação HOLOSCAN histórica aparece, mas desabilitada');
ok(!sel0.rascunhoListado && sel0.opcoes.length === 7 && sel0.meta.every(m => /cód\. [0-9a-f]{8}/.test(m)), 'ferramenta em rascunho não é oferecida; cada fonte mostra data, código curto, status e atendimento: ' + sel0.opcoes.slice(0, 3).join(' | '));
await A.evaluate((ea) => { const s = document.getElementById('rh-atendimento'); s.value = ea; s.dispatchEvent(new Event('change', { bubbles: true })); }, EA);
await clicar(A, '[data-rh-acao="salvar"]'); await espera(400);
ok(/Escolha a aplicação HOLOSCAN/.test(await texto(A, '#rh-erro')) && srv.linhas('holos_results').length === 0, 'sem HOLOSCAN: recusado na tela, nada vai ao servidor');
const semH = rpcComo(UA, 'salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, tool_application_ids: [T_OQ3] } });
const histor = rpcComo(UA, 'salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HH } });
ok(semH.error && semH.error.hint === 'holoscan_obrigatorio' && histor.error && histor.error.hint === 'holoscan_nao_oficial', 'servidor: sem HOLOSCAN e HOLOSCAN histórico recusados');

/* seleciona: HOLOSCAN + OQ3, PQQ, Gatilhos, Conexao; mostrar ao paciente: OQ3 e PQQ */
const XSS = '<img src=x onerror="window.__xss=1"> leitura da nutri';
await A.evaluate((ha, ids, xss) => {
  document.querySelector('input[name="rh-holoscan"][value="' + ha + '"]').click();
  ids.forEach(id => document.querySelector('[data-rh-ferr][value="' + id + '"]').click());
  ['oq3', 'pqq'].forEach(f => { const v = document.querySelector('[data-rh-ferr="' + f + '"]:checked').value; document.querySelector('[data-rh-mostrar="' + v + '"]').click(); });
  const t = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  t('rh-leitura_profissional', xss); t('rh-pontos_acompanhar', 'sono e rotina da noite'); t('rh-questoes_aprofundar', 'QUESTAO_SO_PROFISSIONAL');
}, HA, [T_OQ3, T_PQQ, T_GAT, T_CON], XSS);
ok(/HOLOSCAN escolhido · 4 ferramentas · 2 na visão do paciente/.test(await texto(A, '#rh-contagem')), 'contagem da seleção visível: ' + await texto(A, '#rh-contagem'));

/* ----- 2: rascunho ----- */
await clicar(A, '[data-rh-acao="rascunho"]'); await espera(800);
const r0 = srv.linhas('holos_results')[0];
ok(r0 && r0.status === 'rascunho' && r0.content_snapshot === null && r0.selected_sources.tool_application_ids.length === 4 && r0.selected_sources.visao_paciente.ferramentas[T_OQ3].mostrar === true
  && r0.selected_sources.visao_paciente.ferramentas[T_GAT].mostrar === false && r0.leitura_profissional === XSS, 'rascunho no servidor: seleção, visibilidade e observações (sem snapshot)');
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperarDados(A);
await abrirAba(A, PA);
ok(/Rascunho/.test(await texto(A, '.rh-hist-lista')), 'depois de recarregar, o rascunho está no histórico');
await clicar(A, '[data-rh-acao="continuar"]'); await espera(300);
const cont = await A.evaluate(() => ({ h: (document.querySelector('input[name="rh-holoscan"]:checked') || {}).value, n: document.querySelectorAll('[data-rh-ferr]:checked').length,
  m: document.querySelectorAll('[data-rh-mostrar]:checked').length, l: document.getElementById('rh-leitura_profissional').value }));
ok(cont.h === HA && cont.n === 4 && cont.m === 2 && cont.l === XSS, 'continuar rascunho: a mesma seleção, visibilidade e observações');

/* ----- 3: previa e salvar ----- */
await clicar(A, '[data-rh-acao="previa"]'); await espera(800);
const pv = await A.evaluate(() => ({ t: (document.getElementById('rh-doc') || {}).innerText || '', previa: !!document.querySelector('.rh-previa-selo') }));
ok(pv.previa && /Visão geral HOLOSCAN/.test(pv.t) && /Cinco sistemas/.test(pv.t) && /Visão conjunta/.test(pv.t) && srv.linhas('holos_results')[0].status === 'rascunho', 'prévia (montada pelo servidor, marcada "PRÉVIA", nada gravado)');
await shot(A, 'rh-previa', '#rh-doc');
await clicar(A, '[data-rh-acao="salvar"]'); await confirmarModal(A);
const salvo = srv.linhas('holos_results').find(r => r.status === 'salvo');
ok(!!salvo && salvo.id === r0.id && salvo.content_hash && /^[0-9a-f]{64}$/.test(salvo.content_hash) && salvo.content_snapshot.holoscan.id === HA && salvo.content_snapshot.ferramentas.length === 4,
  'salvo: o rascunho vira resultado salvo, com snapshot do servidor e hash sha256');
ok(salvo.content_hash === createHash('sha256').update(JSON.stringify(salvo.content_snapshot), 'utf8').digest('hex'), 'hash confere com o snapshot gravado');
const prof = await A.evaluate(() => ({ t: document.getElementById('rh-doc').innerText, html: document.getElementById('rh-doc').innerHTML,
  sis: document.querySelectorAll('.rh-sis').length, det: document.querySelectorAll('.rh-sis-det').length, radar: !!document.querySelector('svg.rh-radar[role="img"][aria-label]'), xss: window.__xss === 1 }));
ok(prof.sis === 5 && prof.det === 10 && prof.radar && /Identificação|Paciente/.test(prof.t) && /Corpo/.test(prof.t) && /Mente/.test(prof.t) && /Espírito/.test(prof.t) && /Mapa do Propósito/.test(prof.t)
  && /Pontuou neste sistema/.test(prof.t) && /Contexto, sem pontuar/.test(prof.t) && /Observações da nutricionista/.test(prof.t) && /QUESTAO_SO_PROFISSIONAL/.test(prof.t) && /não incluídos nesta versão/.test(prof.t),
  'visão profissional: identificação, radar, 5 sistemas (pontuou × contexto), Corpo/Mente/Espírito, Mapa do Propósito, visão conjunta, observações, nota de exames');
ok(!prof.xss && /&lt;img src=x/.test(prof.html) && !/<img src="?x/.test(prof.html), 'XSS nas observações: aparece como texto, não executa');
ok(/romper o ciclo de autoabandono/.test(prof.t) && /PENSAMENTO_INTIMO/.test(prof.t) && /Irmã/.test(prof.t), 'ferramentas na visão profissional (PQQ, Gatilhos, Conexão)');
await shot(A, 'rh-profissional', '#rh-doc');

/* ----- 4: paciente ----- */
await clicar(A, '[data-rh-visao-troca="paciente"]'); await espera(300);
const pac = await A.evaluate(() => ({ t: document.getElementById('rh-doc').innerText }));
ok(/Seu Mapa HOLOS/.test(pac.t) && /ter mais energia/.test(pac.t) && /romper o ciclo/.test(pac.t) && /Mapa do Propósito/.test(pac.t), 'visão do paciente: mapa e as ferramentas com "Mostrar ao paciente" ligado (OQ³, PQQ e o Mapa do Propósito)');
ok(!/PENSAMENTO_INTIMO|discussão em casa/.test(pac.t) && !/Irmã/.test(pac.t), 'ferramenta com "Mostrar ao paciente" desligado (Gatilhos, Conexão) não aparece');
ok(!/cód\.|hash|[0-9a-f]{8}-[0-9a-f]{4}|Pontuou|Contexto, sem pontuar|HOLOS-V1@|QUESTAO_SO_PROFISSIONAL|respondidas/.test(pac.t), 'sem ids, hash, pacote, "pontuou", cobertura técnica nem questões para aprofundar');
ok(/O que sua nutricionista observou/.test(pac.t) && /leitura da nutri/.test(pac.t) && /Pontos que serão acompanhados/.test(pac.t) && /Nesta avaliação/.test(pac.t) && !/você tem|seu problema é|isso causa/i.test(pac.t),
  'observação e pontos da nutricionista; linguagem "nesta avaliação", sem "você tem" / "seu problema é"');
await shot(A, 'rh-paciente', '#rh-doc');

/* ----- 5: imutabilidade ----- */
srv.tabelas.tool_applications.find(t => t.id === T_OQ3).respostas = { quer: 'MUDOU_DEPOIS' };
const hashAntes = salvo.content_hash;
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await abrirAba(A, PA);
await clicar(A, '[data-rh-acao="ver"][data-rh-visao="profissional"]'); await espera(300);
const t5 = await texto(A, '#rh-doc');
ok(/ter mais energia/.test(t5) && !/MUDOU_DEPOIS/.test(t5) && srv.linhas('holos_results').find(r => r.id === salvo.id).content_hash === hashAntes, 'OQ³ alterado depois de salvar: o resultado continua com o OQ³ de antes (hash igual)');
const muda = rpcComo(UA, 'salvar_rascunho_resultado_holos', { payload: { id: salvo.id, patient_id: PA, encounter_id: EA, holoscan_application_id: HA, leitura_profissional: 'mudou' } });
const direto = q('holos_results', 'update', { dados: { leitura_profissional: 'mudou' }, filtros: [{ col: 'id', op: 'eq', val: salvo.id }] });
ok(muda.error && muda.error.hint === 'revisao_imutavel' && direto.error && srv.linhas('holos_results').find(r => r.id === salvo.id).leitura_profissional === XSS, 'observação de resultado salvo: recusada (RPC e escrita direta)');

/* ----- 6: revisar e nova versao ----- */
await clicar(A, '[data-rh-acao="revisar"]'); await espera(700);
ok(srv.linhas('holos_results').find(r => r.id === salvo.id).status === 'revisado' && /Revisado em/.test(await texto(A, '#aba-resultado-holos')), 'marcar como revisado');
await clicar(A, '[data-rh-acao="nova-versao"]'); await espera(300);
const nv = await A.evaluate(() => ({ aviso: (document.querySelector('.rh-aviso') || {}).textContent || '', n: document.querySelectorAll('[data-rh-ferr]:checked').length }));
ok(/Nova versão a partir do resultado nº 1/.test(nv.aviso) && nv.n === 4, 'nova versão começa com a seleção da anterior, ainda editável');
await A.evaluate(() => { const t = document.getElementById('rh-leitura_profissional'); t.value = 'leitura da versão 2'; t.dispatchEvent(new Event('input', { bubbles: true })); });
await clicar(A, '[data-rh-acao="salvar"]'); await confirmarModal(A);
const v2 = srv.linhas('holos_results').find(r => r.revision_number === 2), v1 = srv.linhas('holos_results').find(r => r.id === salvo.id);
ok(v2 && v2.supersedes_id === salvo.id && v2.status === 'salvo' && v1.superseded_at && v1.content_hash === hashAntes && v1.leitura_profissional === XSS && v2.content_snapshot.ferramentas.find(f => f.ferramenta_id === 'oq3').respostas.quer === 'MUDOU_DEPOIS',
  'nova versão: revisão 2 ligada à anterior (com o OQ³ de agora); a anterior fica intacta e marcada substituída');
await clicar(A, '[data-rh-acao="voltar"]'); await espera(200);
const hist = await A.evaluate(() => [...document.querySelectorAll('.rh-hist-item')].map(li => li.innerText.replace(/\s+/g, ' ')));
ok(hist.length === 2 && /versão nº 2/.test(hist[0]) && /substituída/.test(hist[1]) && hist.every(h => /HOLOSCAN/.test(h) && /4 ferramentas/.test(h) && /atendimento/.test(h)), 'histórico: duas versões, com data, status, atendimento, HOLOSCAN e nº de ferramentas');
await shot(A, 'rh-historico', '#aba-resultado-holos');

/* ----- 7: outra sessao / outra conta / outro paciente ----- */
const A2 = await sessao('a@holo.test', 'senha-a-123');
await abrirAba(A2, PA);
await clicar(A2, '[data-rh-acao="ver"][data-rh-id="' + salvo.id + '"][data-rh-visao="profissional"]'); await espera(300);
await clicar(A, '[data-rh-acao="ver"][data-rh-id="' + salvo.id + '"][data-rh-visao="profissional"]'); await espera(300);
ok((await texto(A2, '#rh-doc')) === (await texto(A, '#rh-doc')) && (await texto(A2, '#rh-doc')).length > 500, 'outra sessão do mesmo usuário: o resultado aparece idêntico');
ok(qb('holos_results', 'select', {}).data.length === 0, 'outra conta não vê nenhum resultado');
const alheio = rpcComo(UB, 'salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA } });
const revAlheio = rpcComo(UB, 'revisar_resultado_holos', { p_id: v2.id });
ok(alheio.error && alheio.error.hint === 'referencia_cruzada' && revAlheio.error && revAlheio.error.hint === 'referencia_cruzada', 'outra conta não cria nem revisa resultado de paciente alheio');
const cruz = ['holoscan', 'ferr', 'enc'].map(k => rpcComo(UA, 'salvar_resultado_holos', { payload: Object.assign({ patient_id: PA, encounter_id: EA, holoscan_application_id: HA },
  k === 'holoscan' ? { holoscan_application_id: HB } : k === 'ferr' ? { tool_application_ids: [T_B] } : { encounter_id: EB }) }).error);
const ras = rpcComo(UA, 'salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [T_RAS] } }).error;
const semEnc = rpcComo(UA, 'salvar_resultado_holos', { payload: { patient_id: PA, holoscan_application_id: HA } }).error;
ok(cruz.every(x => x && x.hint === 'referencia_cruzada') && ras && ras.hint === 'fonte_nao_consolidada' && semEnc && semEnc.hint === 'atendimento_obrigatorio',
  'HOLOSCAN, ferramenta e atendimento de outro paciente recusados; ferramenta em rascunho recusada; sem atendimento recusado');

/* ----- 10: nao interferencia (antes do arquivamento e fora a edicao proposital do OQ3) ----- */
srv.tabelas.tool_applications.find(t => t.id === T_OQ3).respostas = { quer: 'ter mais energia', precisa: 'dormir melhor', consegue: 'caminhar 10 minutos' };
ok(digitais() === antes, 'não interferência: HOLOSCAN, notas, Índice, Tríade, respostas, ferramentas, LI, exames e pacotes iguais depois de rascunho, prévia, salvar, revisar e nova versão');

/* ----- 9: celular, acessibilidade, impressao ----- */
const M = await sessao('a@holo.test', 'senha-a-123', 390);
await abrirAba(M, PA);
await clicar(M, '[data-rh-acao="ver"][data-rh-id="' + v2.id + '"][data-rh-visao="paciente"]'); await espera(400);
const mob = await M.evaluate(() => { const d = document.getElementById('rh-doc'); return { larg: d.scrollWidth, vis: d.clientWidth, pagina: document.documentElement.scrollWidth, janela: window.innerWidth }; });
ok(mob.larg <= mob.vis + 1 && mob.pagina <= mob.janela + 1, 'celular 390 px: sem rolagem horizontal (' + mob.larg + '/' + mob.vis + ', página ' + mob.pagina + ')');
await shot(M, 'rh-paciente-mobile');
await clicar(M, '[data-rh-visao-troca="profissional"]'); await espera(300);
const mob2 = await M.evaluate(() => { const d = document.getElementById('rh-doc'); return { larg: d.scrollWidth, vis: d.clientWidth, pagina: document.documentElement.scrollWidth, janela: window.innerWidth }; });
ok(mob2.larg <= mob2.vis + 1 && mob2.pagina <= mob2.janela + 1, 'celular 390 px, visão profissional: sem rolagem horizontal');
await shot(M, 'rh-profissional-mobile');
const a11y = await A.evaluate(() => {
  const d = document.getElementById('rh-doc');
  const secoes = [...d.querySelectorAll('section.rh-secao')];
  return { rotulo: !!d.getAttribute('aria-label'), secoes: secoes.length && secoes.every(s => { const id = s.getAttribute('aria-labelledby'); return id && document.getElementById(id); }),
    radar: !!d.querySelector('svg[role="img"][aria-label*="Radar"]'), botoes: [...document.querySelectorAll('#aba-resultado-holos button')].every(b => (b.textContent || b.getAttribute('aria-label') || '').trim()),
    pressed: [...document.querySelectorAll('[data-rh-visao-troca]')].every(b => b.hasAttribute('aria-pressed')) };
});
ok(a11y.rotulo && a11y.secoes && a11y.radar && a11y.botoes && a11y.pressed, 'acessibilidade: documento rotulado, seções com título ligado, radar com descrição, botões com texto e estado da troca de visão');
await A.evaluate(() => { document.body.classList.add('rh-imprimindo'); document.querySelectorAll('#rh-doc details').forEach(d => { d.open = true; }); });
await A.emulateMediaType('print');
const imp = await A.evaluate(() => ({ menu: getComputedStyle(document.querySelector('.sidebar') || document.body).visibility, doc: getComputedStyle(document.getElementById('rh-doc')).visibility,
  botoes: getComputedStyle(document.querySelector('[data-rh-acao="imprimir"]')).visibility }));
ok(imp.menu === 'hidden' && imp.doc === 'visible' && imp.botoes === 'hidden', 'impressão: só o documento aparece (menu e botões somem)');
if (process.env.SHOT_DIR) await A.pdf({ path: process.env.SHOT_DIR + '/rh-impressao.pdf', format: 'A4', printBackground: true });
await A.emulateMediaType('screen');
await A.evaluate(() => document.body.classList.remove('rh-imprimindo'));
const temImprimir = await A.evaluate(() => typeof window.print === 'function' && !!document.querySelector('[data-rh-acao="imprimir"]'));
ok(temImprimir, 'botão "Imprimir ou salvar em PDF" na visão aberta');

/* ----- 8: arquivado ----- */
srv.tabelas.patients.find(p => p.id === PA).status = 'inativo';
const arq = rpcComo(UA, 'salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA } });
ok(arq.error && arq.error.hint === 'paciente_arquivado', 'paciente arquivado: o servidor recusa novo Resultado HOLOS');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
