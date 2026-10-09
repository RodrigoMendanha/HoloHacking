/**
 * V1 — ETAPA 1 — AGENDA x ATENDIMENTO, NA TELA (Supabase falso, com conta)
 *
 *    1  "Iniciar atendimento" e acao explicita (dialogo, confirmacao)
 *    2  abrir a Agenda nao cria atendimento
 *    3  abrir a ficha nao cria atendimento
 *    4  a hora passar nao cria atendimento
 *    5  atendimento sem agendamento ("Novo atendimento" na ficha)
 *    6  atendimento criado de agendamento guarda consultation_id
 *    7  HOLOSCAN novo grava encounter_id do atendimento selecionado
 *    8  sem atendimento, salvar HOLOSCAN oficial e recusado
 *    9  o rascunho do questionario continua
 *   10  ferramenta nova grava encounter_id do atendimento ativo
 *   11  ferramenta nao procura "consulta de hoje" (consulta_id null)
 *   12  duas consultas no mesmo dia nao causam vinculo errado
 *   13  criar outra consulta no mesmo dia nao altera vinculo existente
 *   14  coleta pode existir sem encounter
 *   15  coleta pode ser vinculada explicitamente
 *   16  trocar de paciente limpa encounter incompativel
 *   17  abrir o historico nao cria registro novo
 *   18  Atendimentos nao lista agendamento futuro como atendimento
 *   19  exportacao distingue agendamento e atendimento
 *   20  HOLOS AI recebe o atendimento como fato, sem metodologia
 *   +   cancelar e reagendar pela agenda; fuso (ida e volta); operation_id;
 *       controle otimista (updated_at); cabecalho da ficha
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
const UID_A = srv.criarConta('a@holo.test', 'senha-a-123');
/* Correcao P0 (pos-deploy 6.4): o HOLOSCAN so e calculado/gravado como aplicacao OFICIAL, sobre o pacote aprovado e vigente —
   como em producao, o servidor tem o HOLOS-V1 aprovado (fixture pelo caminho real). */
semearHolosAprovado(srv, UID_A);
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();
const A = await ctx.newPage();
await A.setViewport({ width: 1366, height: 900 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
  window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);
/* o questionario parcial pergunta por confirm() nativo; o teste responde sim */
await A.evaluate(() => { window.confirm = () => true; });

async function cadastrar(nome) {
  const id = await A.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const achou = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (achou) return achou.id;
    }
    return null;
  }, nome);
  await esperar(200);
  return id;
}
const diaISO = (n) => { const d = new Date(); d.setDate(d.getDate() + n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const encounters = (pid) => srv.linhas('encounters').filter(e => !pid || e.patient_id === pid);
const marcar = (pid, dia, hora) => A.evaluate(async (pid, dia, hora) => {
  const r = await window.supabaseClient.from('consultations').insert([{ patient_id: pid, data: dia, hora, tipo: 'retorno', duracao_min: 60 }]).select();
  await window.Agenda.carregarDados();
  return r.data[0].id;
}, pid, dia, hora);
const modalAberto = () => A.evaluate(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden'));
const confirmarModal = async () => { await A.evaluate(() => document.getElementById('modal-confirmar-ok').click()); await esperar(700); };

const PA = await cadastrar('Paciente Um');
const PB = await cadastrar('Paciente Dois');

/* ==================================================================== */
titulo('2, 3, 4 — NADA CRIA ATENDIMENTO SOZINHO');
/* ==================================================================== */
const cPassada = await marcar(PA, diaISO(-1), '09:00');          // a hora ja passou
const cHoje = await marcar(PA, diaISO(0), '23:55');
await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="agenda"]').click(); await new Promise(r => setTimeout(r, 400)); });
ok(encounters().length === 0, '2: abrir a Agenda nao criou atendimento');
await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 400)); }, PA);
ok(encounters().length === 0, '3: abrir a ficha nao criou atendimento');
ok(encounters().length === 0 && srv.linhas('consultations').some(c => c.id === cPassada),
   '4: agendamento com hora passada continua agendamento; nenhum atendimento nasceu');
const cabecalhoVazio = await A.evaluate(() => (document.getElementById('fic-at-valor') || {}).textContent || '');
ok(/Nenhum atendimento selecionado/.test(cabecalhoVazio), 'cabecalho da ficha: "' + cabecalhoVazio + '"');

/* ==================================================================== */
titulo('1, 6 — INICIAR ATENDIMENTO A PARTIR DO AGENDAMENTO');
/* ==================================================================== */
const abriu = await A.evaluate(async (cid) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 300));
  const ev = document.querySelector('[data-abrir="consulta"][data-id="' + cid + '"]');
  if (!ev) return { semEvento: true };
  ev.click();
  await new Promise(r => setTimeout(r, 300));
  return {
    iniciar: !!document.querySelector('[data-iniciar-atendimento="' + cid + '"]'),
    abrirVelho: !!document.querySelector('[data-abrir-atendimento]'),
  };
}, cHoje);
ok(abriu.iniciar && !abriu.abrirVelho && encounters().length === 0,
   '1: o agendamento abre com "Iniciar atendimento"; clicar no agendamento nao criou nada');
await A.evaluate(async (cid) => { document.querySelector('[data-iniciar-atendimento="' + cid + '"]').click(); await new Promise(r => setTimeout(r, 300)); }, cHoje);
const dialogo = await A.evaluate(() => ({
  aberto: !document.getElementById('modal-confirmar-acao').classList.contains('hidden'),
  titulo: document.getElementById('modal-confirmar-titulo').textContent,
  corpo: document.getElementById('modal-confirmar-corpo').innerText,
  data: (document.getElementById('at-data') || {}).value, hora: (document.getElementById('at-hora') || {}).value,
}));
ok(dialogo.aberto && dialogo.titulo === 'Iniciar atendimento' && /Paciente Um/.test(dialogo.corpo) && /Agendamento de origem/.test(dialogo.corpo),
   '1: o dialogo mostra paciente e agendamento de origem antes de criar');
/* correcao (auditoria Agenda): o atendimento e o que ACONTECEU — com o agendamento (23:55) ainda no futuro, a sugestao e
   AGORA (nunca a hora futura da consulta); data/hora no futuro sao recusadas. 00:00 abaixo: nunca no futuro. */
ok(dialogo.data === diaISO(0) && dialogo.hora !== '23:55' && encounters().length === 0,
   '1: data/hora efetiva sugerida = agora (o agendamento ainda esta no futuro); ainda nada criado: ' + dialogo.hora);
await A.evaluate(() => { document.getElementById('at-hora').value = '00:00'; });
await confirmarModal();
const e1 = encounters(PA);
ok(e1.length === 1 && e1[0].consultation_id === cHoje && e1[0].patient_id === PA,
   '6: confirmar criou UM atendimento ligado ao agendamento de origem');
ok(e1[0].timezone === 'America/Sao_Paulo' && e1[0].operation_id, 'com snapshot do fuso e operation_id');
const depois = await A.evaluate(() => ({
  ficha: !document.getElementById('vista-ficha').classList.contains('hidden'),
  pid: window.pacienteAtivoId(),
  ativo: window.AtendimentoAtual.atual() && window.AtendimentoAtual.atual().id,
  cab: document.getElementById('fic-at-valor').textContent,
}));
ok(depois.ficha && depois.pid === PA && depois.ativo === e1[0].id && /00:00/.test(depois.cab) && /com agendamento/.test(depois.cab),
   'a ficha abre com o atendimento selecionado e o cabecalho mostra data, hora e origem: ' + depois.cab);
const paredeEsperada = await A.evaluate((iso) => window.AtendimentoAtual.paraParede(iso, 'America/Sao_Paulo'), e1[0].occurred_at);
ok(paredeEsperada.data === diaISO(0) && paredeEsperada.hora === '00:00', 'occurred_at guardado como instante, lido de volta como 00:00 no fuso');

const deNovo = await A.evaluate(async (cid) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-abrir="consulta"][data-id="' + cid + '"]').click();
  await new Promise(r => setTimeout(r, 300));
  return { iniciar: !!document.querySelector('[data-iniciar-atendimento]'), abrir: !!document.querySelector('[data-abrir-atendimento-id]') };
}, cHoje);
ok(!deNovo.iniciar && deNovo.abrir && encounters(PA).length === 1,
   'reabrir o mesmo agendamento oferece "Abrir atendimento", nao duplica em silencio');

/* ==================================================================== */
titulo('5 — ATENDIMENTO SEM AGENDAMENTO');
/* ==================================================================== */
await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="consultas"]').click(); await new Promise(r => setTimeout(r, 300));
  document.querySelector('#aba-consultas [data-novo-atendimento]').click(); await new Promise(r => setTimeout(r, 300));
}, PA);
ok(await modalAberto() && encounters(PA).length === 1, '5: "Novo atendimento" pede confirmacao; ainda nada criado');
await A.evaluate(() => { document.getElementById('at-data').value = '2026-03-10'; document.getElementById('at-hora').value = '08:30'; });
await confirmarModal();
const e2 = encounters(PA).find(e => e.id !== e1[0].id);
ok(!!e2 && e2.consultation_id === null && e2.occurred_at === '2026-03-10T11:30:00.000Z',
   '5: atendimento sem agendamento, com data/hora explicita (08:30 em Sao Paulo = 11:30Z)');
ok(await A.evaluate(() => window.AtendimentoAtual.atual().id) === e2.id, 'e ele passa a ser o atendimento ativo');

/* ==================================================================== */
titulo('7, 8, 9 — HOLOSCAN');
/* ==================================================================== */
/* Ajuste (testes reais 06/10): gerar de novo com as MESMAS respostas de uma
   aplicacao ja salva passou a SER essa aplicacao ("ja esta salvo"), entao o
   cenario 8 responde diferente (botao 1) para ser uma aplicacao nova. */
async function responderECalcular(botao = 2) {
  await A.evaluate(async (botao) => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(x => setTimeout(x, 200));
    [...document.querySelectorAll('.q-item')].slice(0, 30).forEach((it) => it.querySelectorAll('.q-btn')[botao].click());
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(x => setTimeout(x, 400));
  }, botao);
}
async function salvarHolo() {
  return A.evaluate(async () => {
    const t = document.getElementById('toast'); const vistos = [];
    const obs = new MutationObserver(() => { if (t.textContent) vistos.push(t.textContent); });
    obs.observe(t, { childList: true, characterData: true, subtree: true });
    document.getElementById('btn-salvar-holoscan').click();
    await new Promise(r => setTimeout(r, 300));
    /* correcao (auditoria HOLOSCAN): aplicacao parcial (30 de 84) pede confirmacao antes de salvar */
    if (!document.getElementById('modal-confirmar-acao').classList.contains('hidden') &&
        document.getElementById('modal-confirmar-titulo').textContent === 'Questionário incompleto') document.getElementById('modal-confirmar-ok').click();
    await new Promise(r => setTimeout(r, 900));
    obs.disconnect();
    return vistos.concat([t.textContent]).join(' | ');
  });
}
await A.evaluate((pid) => window.definirPacienteAtivo(pid), PA);
await responderECalcular();
await salvarHolo();
const holos = srv.linhas('holoscan_applications').filter(a => a.patient_id === PA);
ok(holos.length === 1 && holos[0].encounter_id === e2.id, '7: o HOLOSCAN novo gravou encounter_id do atendimento selecionado');

await A.evaluate(() => window.AtendimentoAtual.limpar());
await responderECalcular(1);
const recusa = await salvarHolo();
ok(/Selecione ou inicie um atendimento para salvar\./.test(recusa) && srv.linhas('holoscan_applications').filter(a => a.patient_id === PA).length === 1,
   '8: sem atendimento ativo, salvar e recusado com a mensagem certa; nada foi ao servidor');
const rascunho = await A.evaluate((pid) => Object.keys((JSON.parse(localStorage.getItem('holohacking.questionario')) || {})[pid] || {}).length, PA);
ok(rascunho === 30, '9: o rascunho do questionario (30 respostas) continua neste navegador');

/* ==================================================================== */
titulo('10, 11, 12, 13 — FERRAMENTAS');
/* ==================================================================== */
const cHoje2 = await marcar(PA, diaISO(0), '15:00');              // duas consultas no mesmo dia
await A.evaluate((id) => window.AtendimentoAtual.selecionarPorId(id), e1[0].id);
await A.evaluate(async () => {
  window.abrirFerramentaPorId('mapa_crencas');
  await new Promise(r => setTimeout(r, 500));
  const el = document.querySelector('#vista-gen-mente #campo-crencas');
  el.value = 'crenca de teste'; el.dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('#vista-gen-mente [data-acao="concluir"]').click();
  await new Promise(r => setTimeout(r, 700));
});
const apps = srv.linhas('tool_applications').filter(a => a.patient_id === PA && a.ferramenta_id === 'mapa_crencas');
ok(apps.length === 1 && apps[0].encounter_id === e1[0].id, '10: a ferramenta gravou encounter_id do atendimento ativo');
ok(apps[0].consultation_id === null, '11: consultation_id ficou null — nenhuma "consulta de hoje" foi procurada (havia duas hoje)');
ok(apps[0].encounter_id === e1[0].id && e1[0].consultation_id === cHoje && cHoje2,
   '12: duas consultas no mesmo dia e o vinculo e com o atendimento escolhido, nao com a data');
await marcar(PA, diaISO(0), '17:00');
const appsDepois = srv.linhas('tool_applications').filter(a => a.patient_id === PA && a.ferramenta_id === 'mapa_crencas');
ok(appsDepois[0].encounter_id === e1[0].id && appsDepois[0].consultation_id === null,
   '13: marcar outra consulta no mesmo dia nao alterou o vinculo da aplicacao');

/* ==================================================================== */
titulo('14, 15 — COLETAS: EXAME E SO ARQUIVO (09/10)');
/* ==================================================================== */
/* A Etapa 1 provava o vinculo coleta x atendimento. Decisao de produto 09/10: nao existe mais coleta
   estruturada — nem pelo painel (que saiu da ficha), nem pela sincronizacao, nem pelo servidor, com ou
   sem atendimento ativo. */
await A.evaluate(async (pid) => {
  window.AtendimentoAtual.limpar();
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="documentos"]').click(); await new Promise(r => setTimeout(r, 400));
}, PA);
const painel14 = await A.evaluate(() => document.querySelectorAll('#ex-corpo, #lab-corpo, .ex-linha, [data-lancar], #ex-vincular-atendimento, [data-lab-acao]').length);
const r14 = await A.evaluate((pid) => window.Sincronizacao.salvarColeta(pid, { 'EXA-001': 95 }, '2026-02-01'), PA);
ok(painel14 === 0 && !r14.ok && r14.motivo === 'laboratorio_desativado' && srv.linhas('lab_collections').length === 0,
   '14: sem atendimento ativo: nenhum painel de valores na aba Documentos, e a sincronizacao recusa a coleta');
await A.evaluate(async (id) => { window.AtendimentoAtual.selecionarPorId(id); await new Promise(r => setTimeout(r, 300)); }, e2.id);
const r15 = await A.evaluate(async (pid, eid) => {
  const sb = window.supabaseClient;
  const rpc = await sb.rpc('salvar_coleta_laboratorial', { payload: { collection: { patient_id: pid, encounter_id: eid, clinical_date: '2026-02-02', state: 'salvo' }, results: [{ exam_code: 'LAB-002', value_original_text: '101', numeric_value: 101, qualifier: 'eq' }] } });
  const direto = await sb.from('lab_collections').insert([{ patient_id: pid, encounter_id: eid, coletado_em: '2026-02-02', data_coleta_desconhecida: false }]);
  return { rpc: rpc.error && rpc.error.hint, direto: direto.error && direto.error.code };
}, PA, e2.id);
ok(r15.rpc === 'laboratorio_desativado' && r15.direto === '42501' && srv.linhas('lab_collections').length === 0,
   '15: com atendimento ativo tambem: a RPC recusa (laboratorio_desativado) e a tabela nao aceita (42501)');

/* ==================================================================== */
titulo('16, 17 — TROCA DE PACIENTE E HISTORICO');
/* ==================================================================== */
const troca = await A.evaluate(async (pb, pa) => {
  const antes = window.AtendimentoAtual.atual() && window.AtendimentoAtual.atual().id;
  window.definirPacienteAtivo(pb); await new Promise(r => setTimeout(r, 200));
  const depois = window.AtendimentoAtual.atual();
  const idPara = window.AtendimentoAtual.idPara(pa);
  return { antes, depois, idPara };
}, PB, PA);
ok(troca.antes && troca.depois === null && troca.idPara === null, '16: trocar para outro paciente solta o atendimento (nunca A + atendimento de B)');
const n17 = encounters().length;
const hist = await A.evaluate(async (pa, alvo) => {
  window.abrirFichaDe(pa); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="consultas"]').click(); await new Promise(r => setTimeout(r, 300));
  const linhas = document.querySelectorAll('#fic-atendimentos .fic-at-linha').length;
  document.querySelector('#fic-atendimentos [data-abrir-atendimento="' + alvo + '"]').click();
  await new Promise(r => setTimeout(r, 300));
  return { linhas, ativo: window.AtendimentoAtual.atual().id, cab: document.getElementById('fic-at-valor').textContent };
}, PA, e1[0].id);
ok(hist.linhas === 2 && hist.ativo === e1[0].id && encounters().length === n17,
   '17: a aba lista os 2 atendimentos; abrir o antigo so seleciona (nenhum registro novo): ' + hist.cab);

/* ==================================================================== */
titulo('18 — TELA ATENDIMENTOS');
/* ==================================================================== */
await marcar(PB, diaISO(10), '09:00');                               // agendamento futuro de B
const tela = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  await new Promise(r => setTimeout(r, 400));
  return {
    rotulo: document.querySelector('.nav-item[data-secao="consultas"]').textContent.trim(),
    titulo: document.querySelector('#consultas-corpo h2').textContent,
    linhas: [...document.querySelectorAll('#atendimentos-lista .at-linha')].map(l => l.innerText.replace(/\s+/g, ' ')),
    agenda: document.querySelector('#consultas-agenda').innerText,
  };
});
ok(tela.rotulo === 'Atendimentos' && /atendimentos/.test(tela.titulo), 'o menu e o titulo dizem Atendimentos: ' + tela.titulo.trim());
ok(tela.linhas.length === 2 && tela.linhas.every(l => /Paciente Um/.test(l)) && !tela.linhas.some(l => /Paciente Dois/.test(l)),
   '18: a lista traz os 2 atendimentos reais; o agendamento futuro de Paciente Dois nao aparece como atendimento');
ok(/Paciente Dois/.test(tela.agenda) && /não são atendimentos|marcadas/.test(tela.agenda), 'o agendamento futuro fica no bloco da agenda, com esse nome');
ok(tela.linhas.some(l => /com agendamento/.test(l)) && tela.linhas.some(l => /sem agendamento/.test(l)), 'cada linha diz a origem: com/sem agendamento');

/* ==================================================================== */
titulo('CANCELAR E REAGENDAR PELA AGENDA');
/* ==================================================================== */
const antesCancel = srv.linhas('consultations').length;
await A.evaluate(async (cid) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click(); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-abrir="consulta"][data-id="' + cid + '"]').click(); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-cancelar="consulta"]').click(); await new Promise(r => setTimeout(r, 300));
  document.getElementById('cal-motivo').value = 'paciente pediu';
}, cHoje2);
await confirmarModal();
const cancelada = srv.linhas('consultations').find(c => c.id === cHoje2);
ok(srv.linhas('consultations').length === antesCancel && cancelada && cancelada.cancelled_at && cancelada.cancellation_reason === 'paciente pediu',
   'desmarcar nao apaga: o agendamento fica com cancelled_at e o motivo');
const escondida = await A.evaluate(async (cid) => {
  const some = !document.querySelector('[data-abrir="consulta"][data-id="' + cid + '"]');
  document.querySelector('[data-camada="canceladas"]').click(); await new Promise(r => setTimeout(r, 300));
  const volta = !!document.querySelector('[data-abrir="consulta"][data-id="' + cid + '"].cancelada');
  document.querySelector('[data-camada="canceladas"]').click(); await new Promise(r => setTimeout(r, 200));
  return { some, volta };
}, cHoje2);
ok(escondida.some && escondida.volta, 'a grade esconde a cancelada por padrao e "Ver canceladas" a mostra');
ok(encounters().length === n17, 'cancelar nao criou atendimento');

const cFutura = await marcar(PA, diaISO(5), '11:00');
/* a grade abre na semana da consulta ORIGINAL (diaISO(5)); antes abria na da data nova (diaISO(7)), o que so funcionava quando as
   duas caiam na mesma semana (o teste falhava em segundas-feiras, inclusive no commit d4c2da4 — bug do teste, nao do app) */
await A.evaluate(async (cid, novaData, dataOriginal) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click(); await new Promise(r => setTimeout(r, 300));
  document.getElementById('cal-data').value = dataOriginal; document.getElementById('cal-data').dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-abrir="consulta"][data-id="' + cid + '"]').click(); await new Promise(r => setTimeout(r, 300));
  document.getElementById('cf-data').value = novaData;
  document.getElementById('cf-hora').value = '16:00';
  // Reagendar so habilita quando dia/hora mudam (correcao auditoria Agenda): o evento de digitacao avisa a tela
  document.getElementById('cf-hora').dispatchEvent(new Event('input', { bubbles: true }));
  document.querySelector('[data-reagendar="consulta"]').click(); await new Promise(r => setTimeout(r, 300));
}, cFutura, diaISO(7), diaISO(5));
await confirmarModal();
const orig = srv.linhas('consultations').find(c => c.id === cFutura);
const nova = srv.linhas('consultations').find(c => c.rescheduled_from_id === cFutura);
ok(orig && orig.cancelled_at && nova && orig.rescheduled_to_id === nova.id && nova.data === diaISO(7) && nova.hora === '16:00' && orig.data === diaISO(5),
   'reagendar preserva o original (cancelado, ligado ao novo) e cria o novo com a data nova');
const fichaHist = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="consultas"]').click(); await new Promise(r => setTimeout(r, 300));
  return (document.getElementById('fic-canceladas') || {}).innerText || '';
}, PA);
ok(/reagendada/.test(fichaHist) && /cancelada/.test(fichaHist) && /paciente pediu/.test(fichaHist), 'o historico de canceladas/reagendadas e consultavel na ficha');

/* ==================================================================== */
titulo('19 — EXPORTACAO');
/* ==================================================================== */
const exportado = await A.evaluate(async () => {
  let dados = null;
  const origURL = URL.createObjectURL;
  URL.createObjectURL = (blob) => { blob.text().then(t => { dados = JSON.parse(t); }); return 'blob:fake'; };
  const origCreate = document.createElement.bind(document);
  document.createElement = function (tag) { const el = origCreate(tag); if (tag === 'a') el.click = () => {}; return el; };
  document.getElementById('btn-exportar-paciente').click();
  await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao');
  if (modal && !modal.classList.contains('hidden')) { document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800)); }
  await new Promise(r => setTimeout(r, 400));
  URL.createObjectURL = origURL; document.createElement = origCreate;
  return dados;
});
ok(exportado && Array.isArray(exportado.atendimentos) && exportado.atendimentos.length === 2 &&
   exportado.atendimentos.some(e => e.origem === 'com_agendamento' && e.consultation_id === cHoje) &&
   exportado.atendimentos.some(e => e.origem === 'sem_agendamento'),
   '19: a exportacao traz "atendimentos" (2), com origem e consultation_id');
ok(exportado && Array.isArray(exportado.agendamentos) && exportado.agendamentos.length >= 5 &&
   exportado.agendamentos.some(c => c.cancelled_at && c.rescheduled_to_id) && !('consultas' in exportado),
   '19: e "agendamentos" separados (com cancelados/reagendados marcados), nao chamados de atendimento');
ok(exportado && exportado.holoscanAplicacoes && exportado.holoscanAplicacoes[0].encounter_id === e2.id &&
   exportado.aplicacoesFerramentas[0].encounter_id === e1[0].id && !exportado.coletasExames,
   '19: HOLOSCAN e ferramenta exportados levam o encounter_id; nenhuma coleta (09/10: nada foi gravado)');

/* ==================================================================== */
titulo('20 — HOLOS AI');
/* ==================================================================== */
const contexto = await A.evaluate(async (pid, id) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 200));
  window.AtendimentoAtual.selecionarPorId(id);
  document.querySelector('[data-aba="holos-ai"]').click(); await new Promise(r => setTimeout(r, 300));
  document.querySelector('.ai-atalho-ctx[data-ctx="completo"]').click(); await new Promise(r => setTimeout(r, 200));
  return (document.getElementById('ai-hub-texto') || {}).textContent || '';
}, PA, e2.id);
ok(/Atendimentos registrados/.test(contexto) && /10\/03\/2026 às 08:30 · sem agendamento · SELECIONADO/.test(contexto) && /com agendamento de origem/.test(contexto),
   '20: o contexto traz os atendimentos como fato (quando, origem, qual esta selecionado)');
ok(/Agenda \(agendamentos\)/.test(contexto) && !/Realizada/.test(contexto), 'a agenda vai como agendamento, nunca como "realizada"');
/* simulacao 08/10: notas/faixas da aplicacao calculada pelo HOLOS-V1 OFICIAL entram (ver testar-v1-etapa0 item 21);
   o que nao e homologado (CMB, REC, SEL, Leitura Integrada no contexto) continua fora */
const vazou = contexto.match(/### Leitura Integrada|CMB-|\bREC-|\bSEL-/);
ok(!vazou, '20: nenhuma metodologia nao homologada voltou ao contexto' + (vazou ? ' — vazou: ' + vazou[0] + ' em "' + contexto.slice(Math.max(0, vazou.index - 60), vazou.index + 60).replace(/\n/g, ' ') + '"' : ''));

/* ==================================================================== */
titulo('AJUSTE FINAL — ATENDIMENTO E HISTORICO CLINICO NA EXCLUSAO');
/* ==================================================================== */
const PC = await cadastrar('Paciente Tres');
await A.evaluate(async (pid) => { await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, PC);
const soAtendimento = {
  encounters: srv.linhas('encounters').filter(e => e.patient_id === PC).length,
  holos: srv.linhas('holoscan_applications').filter(a => a.patient_id === PC).length,
  ferr: srv.linhas('tool_applications').filter(a => a.patient_id === PC).length,
  coletas: srv.linhas('lab_collections').filter(a => a.patient_id === PC).length,
  docs: srv.linhas('documents').filter(a => a.patient_id === PC).length,
  consultas: srv.linhas('consultations').filter(a => a.patient_id === PC).length,
};
ok(soAtendimento.encounters === 1 && !soAtendimento.holos && !soAtendimento.ferr && !soAtendimento.coletas && !soAtendimento.docs && !soAtendimento.consultas,
   'cenario: 1 atendimento, 0 HOLOSCAN, 0 ferramentas, 0 exames, 0 documentos, 0 agendamentos');
const modalExcluir = await A.evaluate(async (id) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click(); await new Promise(r => setTimeout(r, 250));
  const v = document.getElementById('voltar-lista'); if (v) v.click();
  document.querySelector('[data-menu="' + id + '"]').click(); await new Promise(r => setTimeout(r, 150));
  document.querySelector('#menu-' + id + ' [data-item="remover"]').click(); await new Promise(r => setTimeout(r, 700));
  const m = document.getElementById('modal-confirmar-acao');
  return { visivel: !m.classList.contains('hidden'),
           titulo: document.getElementById('modal-confirmar-titulo').textContent,
           corpo: document.getElementById('modal-confirmar-corpo').innerText,
           excluir: !!document.getElementById('modal-confirmar-ok'),
           arquivar: !!m.querySelector('.btn-arquivar') };
}, PC);
ok(modalExcluir.visivel && /Não é possível excluir Paciente Tres/.test(modalExcluir.titulo) && !modalExcluir.excluir && modalExcluir.arquivar,
   'paciente so com atendimento NAO e "sem historico": sem botao de excluir, so Arquivar — "' + modalExcluir.titulo + '"');
ok(/1 atendimento/.test(modalExcluir.corpo), 'o modal explica o motivo: "1 atendimento"');
await A.evaluate(() => { const f = document.getElementById('modal-confirmar-fechar'); if (f) f.click(); });
ok(srv.linhas('patients').some(p => p.id === PC) && srv.linhas('encounters').filter(e => e.patient_id === PC).length === 1,
   'paciente e atendimento continuam no servidor');

/* ==================================================================== */
titulo('FUSO, IDEMPOTENCIA E CONCORRENCIA');
/* ==================================================================== */
const fuso = await A.evaluate(() => {
  const A = window.AtendimentoAtual;
  return {
    sp: A.paraInstante('2026-01-15', '14:30', 'America/Sao_Paulo'),
    manaus: A.paraInstante('2026-01-15', '14:30', 'America/Manaus'),
    voltaSp: A.paraParede('2026-01-15T17:30:00.000Z', 'America/Sao_Paulo'),
    voltaManaus: A.paraParede('2026-01-15T17:30:00.000Z', 'America/Manaus'),
    meiaNoite: A.paraParede(A.paraInstante('2026-06-01', '23:30', 'America/Sao_Paulo'), 'America/Sao_Paulo'),
    utcDoMeiaNoite: A.paraInstante('2026-06-01', '23:30', 'America/Sao_Paulo'),
    padrao: A.fuso(),
  };
});
ok(fuso.sp === '2026-01-15T17:30:00.000Z' && fuso.manaus === '2026-01-15T18:30:00.000Z', 'parede -> instante respeita o fuso (SP -03, Manaus -04)');
ok(fuso.voltaSp.data === '2026-01-15' && fuso.voltaSp.hora === '14:30' && fuso.voltaManaus.hora === '13:30', 'instante -> parede volta certo nos dois fusos');
ok(fuso.meiaNoite.data === '2026-06-01' && fuso.meiaNoite.hora === '23:30' && fuso.utcDoMeiaNoite.startsWith('2026-06-02T02:30'),
   '23:30 em Sao Paulo e 02:30Z do dia seguinte — e volta como 23:30 do dia certo');
ok(fuso.padrao === 'America/Sao_Paulo', 'o fuso vem do perfil (padrao America/Sao_Paulo)');

const idem = await A.evaluate(async (pid) => {
  const op = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const a = await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: '2026-04-01T13:00:00.000Z', operation_id: op });
  const b = await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: '2026-04-01T13:00:00.000Z', operation_id: op });
  return { a: a.id, b: b.id };
}, PA);
ok(idem.a === idem.b && encounters(PA).filter(e => e.operation_id === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb').length === 1,
   'repetir a mesma operacao (retry/duplo clique) devolve o mesmo atendimento');

const conc = await A.evaluate(async (id) => {
  const r1 = await window.AtendimentoAtual.atualizar(id, { summary_text: 'da aba 1' });
  return r1;
}, e2.id);
srv.tabelas.encounters.find(e => e.id === e2.id).updated_at = new Date(Date.now() + 5000).toISOString();   // outra aba gravou
const conc2 = await A.evaluate(async (id) => window.AtendimentoAtual.atualizar(id, { summary_text: 'da aba 2, velha' }), e2.id);
ok(conc.ok && conc2.ok === false && conc2.conflito === true && srv.linhas('encounters').find(e => e.id === e2.id).summary_text === 'da aba 1',
   'controle otimista: a gravacao com updated_at velho e recusada e nao sobrescreve');

console.log('');
ok(errosJS.length === 0, errosJS.length ? 'ERRO DE JS: ' + errosJS[0] : 'sem erro de JS');
await nav.close();
process.exit(falhou ? 1 : 0);
