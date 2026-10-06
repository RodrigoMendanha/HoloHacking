/**
 * V1 — CORRECAO P0 (pos-deploy 6.4) — HOLOSCAN OFICIAL NA TELA (Supabase falso, com conta, navegador)
 *
 * O fluxo real da nutricionista: login -> paciente -> atendimento -> questionario (84) -> "Gerar o mapa" -> "Salvar".
 *  1. PARIDADE: o que a TELA mostra (Indice, 5 notas, Triada) = MotorMetodologico (modo oficial, pacote aprovado
 *     carregado do servidor) = o que fica SALVO (aplicacao, scores, respostas, proveniencia completa)
 *  2. As respostas salvas sao as do CALCULO, mesmo se o rascunho mudar entre "Gerar" e "Salvar"
 *  3. Selo: aplicacao nova V1 sem "Em homologação"; historica com "Aplicação histórica sem pacote metodológico V1"
 *  4. Pacote ausente: o mapa nao e gerado (mensagem clara + "Tentar novamente", que recarrega e gera);
 *     salvar sem pacote vigente e bloqueado; nenhuma aplicacao criada; nada do motor legado
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Oficial Ficticio' } }).data[0].id;
const PB = q('patients', 'insert', { dados: { nome: 'Paciente Sem Pacote Ficticio' } }).data[0].id;
const PH = q('patients', 'insert', { dados: { nome: 'Paciente Historico Ficticio' } }).data[0].id;
const PD = q('patients', 'insert', { dados: { nome: 'Paciente Sem Atendimento Ficticio' } }).data[0].id;
// aplicacao HISTORICA (anterior ao pacote): entra como a migration deixou o banco real — sem proveniencia
const agora = new Date().toISOString();
const hid = '00000000-0000-4000-8000-0000000000a1';
srv.tabelas.holoscan_applications.push({ id: hid, nutritionist_id: UA, patient_id: PH, encounter_id: null, quando: '2026-09-30', versao_estrutura: 2, versao_bancos: null, indice: 54, indice_maximo: 100, avaliavel: true, nota_media: 5.4,
  triada: { fisico: 5, mental: 5, espiritual: 6 }, triada_com_dado: { fisico: true, mental: true, espiritual: true }, cobertura: { respondidos: 84, total: 84, percentual: 100 }, combinacoes: [], aprofundamentos: [],
  interpretacao_texto: null, interpretacao_em: null, interpretacao_versao: null, created_at: agora, updated_at: agora, methodology_package_id: null, methodology_package_version: null,
  methodology_content_hash: null, engine_version: null, engine_contract_version: null, calculation_mode: null });
['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual'].forEach((c, i) => srv.tabelas.holoscan_system_scores.push({ id: '00000000-0000-4000-8000-00000000000' + i, application_id: hid, sistema: c, nome: c, nota: 5 + i / 10, carga: 5, faixa: 'medio', obtido: 1, maximo: 2, respondidos: 15, total_marcadores: 15, avaliavel: true, created_at: agora }));

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
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 }).catch(() => {});
await A.evaluate(() => { window.confirm = () => true; });

/** responde as 84 de forma deterministica (valor = (posicao no ID ordenado * 7 + 3) % 4) e gera o mapa */
async function responderEGerar(pid, quantas) {
  await A.evaluate((pid) => window.definirPacienteAtivo(pid), pid);
  return A.evaluate(async (n) => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(x => setTimeout(x, 250));
    const ids = window.HOLOSCAN.questionario().map(q => q.id).sort();
    const itens = [...document.querySelectorAll('.q-item[data-marcador]')].slice(0, n || 84);
    itens.forEach((it) => { const v = (ids.indexOf(it.dataset.marcador) * 7 + 3) % 4; it.querySelectorAll('.q-btn')[v].click(); });
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(x => setTimeout(x, 500));
    return { semPacote: !!document.getElementById('q-sem-pacote'), txt: (document.getElementById('q-resultado') || {}).innerText || '' };
  }, quantas);
}
async function salvar() {
  return A.evaluate(async () => {
    const t = document.getElementById('toast'); const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    document.getElementById('btn-salvar-holoscan').click();
    await new Promise(r => setTimeout(r, 900));
    obs.disconnect();
    return vistos.concat([t.textContent]).join(' | ');
  });
}

titulo('PACOTE OFICIAL CARREGADO DO SERVIDOR');
const b = await A.evaluate(() => ({ disp: window.HoloscanOficial.disponivel(), st: window.Metodologia.status(), p: window.Metodologia.pacote() }));
ok(b.disp && b.st === 'aprovado' && b.p && b.p.code === 'HOLOS-V1' && b.p.version === 2 && b.p.id === pk.id, 'Metodologia.pacote() = HOLOS-V1 v2 aprovado, carregado do servidor; HoloscanOficial disponivel');

titulo('1. PARIDADE: TELA = MOTOR OFICIAL = SALVO');
await A.evaluate(async (pid) => { await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, PA);
const g = await responderEGerar(PA);
ok(!g.semPacote, 'o mapa foi gerado (pacote oficial presente)');
const tela = await A.evaluate(() => {
  const chaves = { fungico: 'fungico', acido_inflamatorio: 'inflamatorio', metabolico: 'metabolico', detox_linfatico: 'detox', mental_emocional_espiritual: 'mental' };
  const sistemas = Object.keys(chaves).map(k => { const el = document.getElementById('val-' + chaves[k]) || document.querySelector('[id^="val-"][id*="' + chaves[k] + '"]'); return [k, el ? el.textContent.trim() : null]; });
  return { indice: document.getElementById('holo-score-total').textContent.trim(), sistemas, triada: [...document.querySelectorAll('#holo-triada .triada-nota')].map(x => x.textContent.trim()),
    interp: document.getElementById('holo-interpretacao').innerText, prio: (document.getElementById('holo-prioridades') || {}).innerText || '', r: window.ultimaPontuacao ? window.ultimaPontuacao() : null };
});
const esperado = await A.evaluate(() => {
  const P = window.Metodologia.obterPacoteAtivo(), M = window.MotorMetodologico;
  const ids = window.HOLOSCAN.questionario().map(q => q.id).sort(); const resp = {}; ids.forEach((id, i) => { resp[id] = (i * 7 + 3) % 4; });
  const v = M.calcular({ responses: resp, methodology_package: P, mode: 'oficial', engine_version: M.VERSAO });
  return { indice: v.index_result.valor, indice_exib: v.index_result.valor_exibicao, sistemas: Object.fromEntries(Object.entries(v.system_results).map(([k, x]) => [k, { nota: x.nota, exib: x.nota_exibicao, faixa: x.faixa, total: x.total }])),
    triada: ['fisico', 'mental', 'espiritual'].map(e => v.triad_result[e].nota_exibicao), resp };
});
const legado = await A.evaluate((resp) => window.HOLOSCAN.calcular(Object.keys(resp).map(id => ({ marcador_id: id, intensidade: resp[id] })), {}).indice, esperado.resp);
ok(tela.indice === esperado.indice_exib && tela.indice !== String(legado), 'Indice na tela = motor oficial (' + tela.indice + '), nao o legado (' + legado + ')');
ok(tela.sistemas.every(([k, t]) => t === esperado.sistemas[k].exib), '5 notas na tela = motor oficial: ' + tela.sistemas.map(x => x[1]).join(' / '));
ok(JSON.stringify(tela.triada) === JSON.stringify(esperado.triada), 'Triada na tela = motor oficial: ' + tela.triada.join(' / '));
ok(!/Em homologação/.test(tela.interp + tela.prio) && /oficial/.test(tela.interp), 'aplicacao nova V1: selo "oficial", sem "Em homologação" no mapa');
// Correcao pos-6.5 (auditoria de producao): a leitura do resultado OFICIAL so tem textos do pacote homologado
const leitura = await A.evaluate(() => { const el = document.getElementById('holo-leitura'); const P = window.Metodologia.obterPacoteAtivo();
  return { txt: el ? el.innerText : '', legado: el ? el.querySelectorAll('.leitura-eixos, .leitura-eixo, .leitura-combinadas, .leitura-encaminhar, .leitura-aprofundar').length + [...el.querySelectorAll('h4')].filter(h => /terreno|dire[cç][aã]o terap/i.test(h.textContent)).length + [...el.querySelectorAll('em')].filter(e => /padr[aã]o emocional/i.test(e.textContent)).length : -1, publicos: (P.sistemas || []).filter(x => x.public_text).length, publicoOk: (P.sistemas || []).every(x => !x.public_text || (el && el.innerText.indexOf(x.public_text) >= 0)),
    rotulos: [...document.querySelectorAll('.regua-pontas')].map(x => x.textContent) }; });
ok(leitura.legado === 0, 'leitura oficial sem os blocos do motor legado (terreno, padrao emocional, direcao terapeutica, eixos, combinacoes, aprofundamentos)');
ok(leitura.publicos === 5 && leitura.publicoOk && /A pontuação deste eixo ficou na faixa/.test(leitura.txt) && /a interpretação clínica é da nutricionista/.test(leitura.txt),
  'leitura oficial mostra o texto publico de cada sistema e a mensagem neutra da faixa, ambos do pacote');
ok(leitura.rotulos.length === 5 && leitura.rotulos.every(t => t === '0 a 10'), 'cartoes dos sistemas com rotulo neutro "Nota 0 a 10" (sem "ruim/bom")');
// 2. o rascunho muda entre Gerar e Salvar: o que se salva continua sendo o calculado
const mudado = await A.evaluate((pid) => { const t = JSON.parse(localStorage.getItem('holohacking.questionario')); const k = Object.keys(t[pid])[0]; t[pid][k] = (t[pid][k] + 1) % 4; localStorage.setItem('holohacking.questionario', JSON.stringify(t)); return k; }, PA);
const n0 = srv.linhas('holoscan_applications').length;
const msg = await salvar();
const apps = srv.linhas('holoscan_applications').filter(x => x.patient_id === PA);
const app = apps[apps.length - 1];
const sc = app ? srv.linhas('holoscan_system_scores').filter(x => x.application_id === app.id) : [];
const ans = app ? srv.linhas('holoscan_answers').filter(x => x.application_id === app.id) : [];
ok(srv.linhas('holoscan_applications').length === n0 + 1 && /salvo/i.test(msg), 'salvar criou UMA aplicacao (' + msg.slice(0, 60) + ')');
ok(app && app.calculation_mode === 'oficial' && app.methodology_package_id === pk.id && app.methodology_package_version === 2 && app.methodology_content_hash === pk.content_hash && app.engine_contract_version === 'holoscan-motor-contrato-v1' && app.encounter_id,
  'salvo com proveniencia completa: pacote, versao, hash homologado, motor, contrato, modo oficial, atendimento');
ok(app && app.indice === esperado.indice && sc.length === 5 && sc.every(s => s.nota === esperado.sistemas[s.sistema].nota && s.faixa === esperado.sistemas[s.sistema].faixa && s.total_marcadores === esperado.sistemas[s.sistema].total),
  'salvo = tela = motor: Indice ' + (app && app.indice) + ', 5 notas, faixas e totais (so primarios)');
ok(ans.length === 84 && ans.every(a => a.valor === esperado.resp[a.marcador_id]) && ans.find(a => a.marcador_id === mudado).valor === esperado.resp[mudado],
  '2: respostas salvas = as do CALCULO (a alteracao do rascunho depois de "Gerar" nao entrou)');
ok(app && app.combinacoes.length === 0 && app.aprofundamentos.length === 0, 'nenhuma combinacao/aprofundamento (nao homologados) na aplicacao oficial');

titulo('4. PACOTE AUSENTE: SEM MAPA, SEM SALVAR, SEM LEGADO');
await A.evaluate(async (pid) => { await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, PB);
const n1 = srv.linhas('holoscan_applications').length;
await A.evaluate(() => window.PacoteMetodologico.esquecer());
const sp = await responderEGerar(PB, 84);
ok(sp.semPacote && /Não foi possível carregar o pacote metodológico oficial vigente/.test(sp.txt) && /Tentar novamente/i.test(sp.txt), 'sem pacote: mensagem clara e botao "Tentar novamente"; o mapa nao e gerado');
ok(await A.evaluate((pid) => { const u = window.ultimaPontuacao(pid); return !u; }, PB), 'nenhum mapa (nem legado) guardado para o paciente');
await A.evaluate(async () => { document.querySelector('[data-acao="tentar-novamente"]').click(); await new Promise(r => setTimeout(r, 800)); });
const depois = await A.evaluate((pid) => { const u = window.ultimaPontuacao(pid); return u ? { oficial: u.oficial, pk: u.methodology_package_id } : null; }, PB);
ok(depois && depois.oficial === true && depois.pk === pk.id, '"Tentar novamente" recarrega o pacote e gera o mapa OFICIAL (as respostas continuaram guardadas)');
await A.evaluate(() => window.PacoteMetodologico.esquecer());
const msg2 = await salvar();
ok(srv.linhas('holoscan_applications').length === n1 && /pacote metodológico oficial vigente/.test(msg2), 'salvar sem pacote vigente: bloqueado com a mensagem; nenhuma aplicacao criada');
await A.evaluate(() => window.PacoteMetodologico.carregar());

titulo('3. HISTORICA: SEM PACOTE V1, SEM FINGIR');
await A.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.carregarTudo) await window.Sincronizacao.carregarTudo(); });
await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  const b = document.querySelector('[data-ficha="' + pid + '"]'); if (b) b.click();
  await new Promise(r => setTimeout(r, 500));
}, PH);
const fic = await A.evaluate(() => (document.querySelector('.fic-mapa') || {}).innerText || document.body.innerText);
ok(/Aplicação histórica sem pacote metodológico V1/.test(fic) && !/ainda não foram aprovados/.test(fic), 'ficha da historica: "Aplicação histórica sem pacote metodológico V1"; nao diz que o pacote atual nao foi aprovado');
const leitH = await A.evaluate((pid) => { window.definirPacienteAtivo(pid); const h = window.historicoPontuacao ? window.historicoPontuacao(pid) : [];
  const u = h[h.length - 1]; if (u && window.desenharPontuacao) window.desenharPontuacao(u, true);
  const el = document.getElementById('holo-leitura'); return { tem: !!u, oficial: u && u.oficial === true, txt: el ? el.innerText : '', legado: el ? el.querySelectorAll('.leitura-eixos, .leitura-sistema').length : -1 }; }, PH);
ok(leitH.tem && !leitH.oficial && /Aplicação histórica sem pacote metodológico V1/.test(leitH.txt) && leitH.legado === 0,
  'mapa da historica em producao: numeros gravados, sem leitura interpretativa do motor legado (so em ?homologacao=1)');
ok(srv.linhas('holoscan_applications').find(x => x.id === hid).methodology_package_id === null && srv.linhas('holoscan_applications').find(x => x.id === hid).indice === 54, 'historica intacta: sem proveniencia (sem backfill), Indice 54 como foi gravado');

titulo('4. GERADO SEM ATENDIMENTO: NAO SALVO NO SERVIDOR, E A TELA DIZ ISSO (auditoria Pacientes/Atendimentos)');
const appsAntes = srv.linhas('holoscan_applications').length;
const gd = await responderEGerar(PD);
const msgD = await salvar();
const estD = await A.evaluate((pid) => {
  const al = window.Panorama.alertas(window.Panorama.doPaciente(pid)).map(a => a.curto + '|' + a.botao);
  return { interp: document.getElementById('holo-interpretacao').innerText, alertas: al };
}, PD);
ok(!gd.semPacote && /atendimento/i.test(msgD) && srv.linhas('holoscan_applications').filter(x => x.patient_id === PD).length === 0,
   'sem atendimento selecionado, salvar e recusado e nada vai ao servidor: ' + msgD.slice(0, 90));
ok(/não salvo no servidor/.test(estD.interp), 'o mapa mostra "não salvo no servidor" ao lado do selo oficial');
ok(estD.alertas.some(a => /HOLOSCAN não salvo no servidor\|Salvar HOLOSCAN/.test(a)), 'e vira pendencia (dashboard e lista): ' + estD.alertas.join(' · '));
await A.evaluate(async (pid) => { await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, PD);
const msgD2 = await salvar();
const depD = await A.evaluate((pid) => ({ interp: document.getElementById('holo-interpretacao').innerText,
  alertas: window.Panorama.alertas(window.Panorama.doPaciente(pid)).map(a => a.curto) }), PD);
ok(srv.linhas('holoscan_applications').filter(x => x.patient_id === PD).length === 1 && /salvo/.test(msgD2) &&
   !/não salvo no servidor/.test(depD.interp) && !depD.alertas.some(a => /não salvo/.test(a)),
   'com o atendimento, salva no servidor; o aviso e a pendencia somem: ' + msgD2.slice(0, 60) + ' / ' + depD.alertas.join(',') + ' / ' + /não salvo/.test(depD.interp));
await responderEGerar(PD);
const msgD3 = await salvar();
ok(srv.linhas('holoscan_applications').filter(x => x.patient_id === PD).length === 1 && /exatamente estas respostas/.test(msgD3),
   'mesmas respostas no mesmo dia: nao grava duplicata (' + msgD3.slice(0, 80) + ')');
ok(srv.linhas('holoscan_applications').length === appsAntes + 1, 'so uma aplicacao nova no servidor');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
