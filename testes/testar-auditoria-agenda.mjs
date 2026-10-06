/**
 * Correcao da Agenda (auditoria de producao com Cowork, 06/10). No navegador, modo local:
 *   1  "Abrir atendimento"/"Iniciar atendimento" levam para a ficha (levarPara navega)
 *   2  atendimento nao nasce no futuro: com a consulta adiante, a sugestao e agora; futuro e recusado
 *   3  consulta com atendimento nao pode ser desmarcada nem reagendada
 *   4  bloqueio por cima de consulta pergunta antes ("Conflito de horario")
 *   5  eventos simultaneos dividem a largura da coluna
 *   6  Nova consulta: so ativos, comeca vazia, paciente travado na edicao
 *   7  hora sugerida para hoje nao fica no passado
 *   8  "Salvar" com dia/hora mudados reagenda (original cancelada e ligada a nova)
 *  10  item do quadro "Hoje" abre a consulta
 *  11  abrir a Agenda volta para hoje
 *  12  Reagendar desabilitado ate mudar dia ou hora
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1400, height: 1100 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

await p.evaluate(() => {
  window.__toasts = [];
  const t = document.getElementById('toast');
  new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); })
    .observe(t, { childList: true, characterData: true, subtree: true });
});

const base = await p.evaluate(async () => {
  const novo = async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    await new Promise(x => setTimeout(x, 300));
    return window.pacienteAtivoId();
  };
  const ana = await novo('Ana Agenda Ficticia');
  const bia = await novo('Bia Agenda Ficticia');
  const arq = await novo('Arquivada Agenda Ficticia');
  await window.DadosLocais.from('pacientes').update({ status: 'inativo' }).eq('id', arq);
  window.pacientesTodos().find(x => x.id === arq).status = 'inativo';
  const d = new Date(); d.setDate(d.getDate() + 2);
  const futuro = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const ins = async (pid, dia, hora) => (await window.DadosLocais.from('consultas').insert({ paciente_id: pid, data: dia, hora, duracao: 60, tipo: 'Retorno', nota: '' }).select().single()).data.id;
  const cFut = await ins(ana, futuro, '11:00:00');
  const cHoje = await ins(bia, window.hojeISO(), '00:00:00');
  await window.Agenda.recarregar();
  return { ana, bia, arq, futuro, cFut, cHoje };
});

/* 11 + 10: abre em hoje; o item de "Hoje" abre a consulta */
const hoje = await p.evaluate(async (b) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 300));
  const semana = document.querySelector('[data-vista="semana"]'); if (semana) semana.click();
  await new Promise(r => setTimeout(r, 200));
  const item = document.querySelector('.cal-hoje-item[data-abrir="consulta"][data-id="' + b.cHoje + '"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 200));
  const titulo = (document.querySelector('.cal-form-topo h3') || {}).textContent;
  const fechar = document.querySelector('[data-fechar]'); if (fechar) fechar.click();
  return { botao: !!item && item.tagName === 'BUTTON', titulo };
}, base);
ok(hoje.botao && hoje.titulo === 'Editar consulta', 'o item do quadro "Hoje" é um botão e abre a consulta: ' + hoje.titulo);

const voltaHoje = await p.evaluate(async () => {
  document.querySelector('[data-andar="1"]').click(); document.querySelector('[data-andar="1"]').click();
  await new Promise(r => setTimeout(r, 150));
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 300));
  return !!document.querySelector('.cal-cabeca-dia.hoje, .cal-celula.hoje');
});
ok(voltaHoje, 'ao abrir a Agenda de novo, o período volta para hoje');

/* 6 + 7: formulario de nova consulta */
const form = await p.evaluate(async (b) => {
  document.querySelector('#agenda-corpo [data-novo="consulta"]').click();
  await new Promise(r => setTimeout(r, 200));
  const sel = document.getElementById('cf-paciente');
  const opcoes = [...sel.options].map(o => o.value);
  const hora = document.getElementById('cf-hora').value, dia = document.getElementById('cf-data').value;
  const agora = new Date(); const agoraHM = String(agora.getHours()).padStart(2, '0') + ':' + String(agora.getMinutes()).padStart(2, '0');
  document.querySelector('[data-salvar="consulta"]').click();
  await new Promise(r => setTimeout(r, 200));
  const aviso = document.getElementById('cal-aviso').textContent;
  document.querySelector('[data-fechar]').click();
  return { primeiro: opcoes[0], vazio: sel.value === '', semArq: !opcoes.includes(b.arq), comAtivos: opcoes.includes(b.ana) && opcoes.includes(b.bia),
    futuraOuHoje: dia > window.hojeISO() || hora >= agoraHM, aviso };
}, base);
ok(form.primeiro === '' && form.vazio, 'Nova consulta começa com "Selecione o paciente" (nada pré-escolhido)');
ok(form.semArq && form.comAtivos, 'a lista de pacientes só tem ativos');
ok(form.futuraOuHoje, 'a hora sugerida não fica no passado');
ok(/Escolha o paciente/.test(form.aviso), 'salvar sem paciente pede o paciente: ' + form.aviso);

/* 12 + 6: edicao — paciente travado; Reagendar so com mudanca */
const edit = await p.evaluate(async (b) => {
  window.Agenda && document.getElementById('cal-data') && (document.getElementById('cal-data').value = b.futuro, document.getElementById('cal-data').dispatchEvent(new Event('change', { bubbles: true })));
  await new Promise(r => setTimeout(r, 250));
  document.querySelector('[data-abrir="consulta"][data-id="' + b.cFut + '"]').click();
  await new Promise(r => setTimeout(r, 200));
  const travado = document.getElementById('cf-paciente').disabled;
  const r = document.querySelector('[data-reagendar]');
  const antes = r.disabled;
  document.getElementById('cf-hora').value = '15:00';
  document.getElementById('cf-hora').dispatchEvent(new Event('input', { bubbles: true }));
  const depois = r.disabled;
  return { travado, antes, depois };
}, base);
ok(edit.travado, 'na edição o paciente fica travado');
ok(edit.antes === true && edit.depois === false, 'Reagendar desabilitado até mudar o dia ou a hora');

/* 8: Salvar com hora mudada = reagendar */
const reag = await p.evaluate(async (b) => {
  document.querySelector('[data-salvar="consulta"]').click();
  await new Promise(r => setTimeout(r, 250));
  const titulo = document.getElementById('modal-confirmar-titulo').textContent;
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 600));
  const t = window.DadosLocais.exportar().tabelas.consultas;
  const orig = t.find(c => c.id === b.cFut), nova = t.find(c => c.rescheduled_from_id === b.cFut);
  return { titulo, cancelada: !!(orig && orig.cancelled_at), ligada: !!(nova && orig.rescheduled_to_id === nova.id), hora: nova && String(nova.hora).slice(0, 5), novaId: nova && nova.id };
}, base);
ok(reag.titulo === 'Reagendar consulta' && reag.cancelada && reag.ligada && reag.hora === '15:00',
   '"Salvar" com a hora mudada reagenda: a original fica cancelada e ligada à nova (' + reag.hora + ')');

/* 2 + 1: iniciar atendimento a partir da consulta futura */
await p.evaluate(() => { window.__toasts.length = 0; });
const ini = await p.evaluate(async (id) => {
  document.querySelector('[data-abrir="consulta"][data-id="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-iniciar-atendimento="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 250));
  const sugerida = { data: document.getElementById('at-data').value, hora: document.getElementById('at-hora').value };
  // tenta o futuro: recusado
  const d = new Date(); d.setDate(d.getDate() + 3);
  document.getElementById('at-data').value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 300));
  const n1 = window.AtendimentoAtual.todos().length;
  // de novo, agora com a sugestao (agora)
  document.querySelector('[data-iniciar-atendimento="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 250));
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 500));
  return { sugerida, n1, n2: window.AtendimentoAtual.todos().length, secao: document.querySelector('.secao.ativa')?.id,
    ficha: !document.getElementById('vista-ficha').classList.contains('hidden'), toasts: window.__toasts.join(' | ') };
}, reag.novaId);
ok(ini.sugerida.data === await p.evaluate(() => window.hojeISO()), 'a consulta está no futuro: a data sugerida para o atendimento é hoje (' + ini.sugerida.data + ' ' + ini.sugerida.hora + ')');
ok(ini.n1 === 0 && /não pode ter data e hora no futuro/.test(ini.toasts), 'atendimento com data no futuro é recusado; nada gravado');
ok(ini.n2 === 1 && ini.secao === 'secao-pacientes' && ini.ficha, '"Iniciar atendimento" cria e leva para a ficha (antes ficava na Agenda)');

/* 3: com atendimento, sem desmarcar nem reagendar; "Abrir atendimento" navega */
const comAt = await p.evaluate(async (b, id) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 300));
  document.getElementById('cal-data').value = b.futuro; document.getElementById('cal-data').dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 250));
  document.querySelector('[data-abrir="consulta"][data-id="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 200));
  const desmarcar = !!document.querySelector('[data-cancelar="consulta"]'), reag = !!document.querySelector('[data-reagendar]');
  const abrir = document.querySelector('[data-abrir-atendimento-id]');
  if (abrir) abrir.click();
  await new Promise(r => setTimeout(r, 300));
  return { desmarcar, reag, abrir: !!abrir, secao: document.querySelector('.secao.ativa')?.id };
}, base, reag.novaId);
ok(!comAt.desmarcar && !comAt.reag, 'consulta com atendimento: sem "Desmarcar" nem "Reagendar"');
ok(comAt.abrir && comAt.secao === 'secao-pacientes', '"Abrir atendimento" na Agenda leva para a ficha');

/* 4 + 5: bloqueio por cima de consulta; eventos lado a lado */
const bloq = await p.evaluate(async (b) => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 300));
  document.getElementById('cal-data').value = b.futuro; document.getElementById('cal-data').dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 250));
  document.querySelector('#agenda-corpo [data-novo="bloqueio"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('bf-data').value = b.futuro;
  document.getElementById('bf-inicio').value = '14:30';
  document.getElementById('bf-fim').value = '15:30';
  document.querySelector('[data-salvar="bloqueio"]').click();
  await new Promise(r => setTimeout(r, 250));
  const aberto = !document.getElementById('modal-confirmar-acao').classList.contains('hidden');
  const titulo = document.getElementById('modal-confirmar-titulo').textContent;
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 600));
  const col = document.querySelector('.cal-coluna[data-dia="' + b.futuro + '"]');
  const evs = col ? [...col.querySelectorAll('.cal-evento')].filter(e => !e.classList.contains('cancelada')) : [];
  const caixas = evs.map(e => e.getBoundingClientRect());
  const sobrepostos = caixas.length >= 2 && caixas.some((a, i) => caixas.some((c, j) => i !== j && a.left === c.left && a.width === c.width && a.top < c.bottom && c.top < a.bottom));
  return { aberto, titulo, n: evs.length, sobrepostos, gravou: window.DadosLocais.exportar().tabelas.bloqueios.length };
}, base);
ok(bloq.aberto && bloq.titulo === 'Conflito de horário' && bloq.gravou === 1, 'bloqueio por cima de consulta pergunta antes ("Conflito de horário") e grava se confirmado');
ok(bloq.n >= 2 && !bloq.sobrepostos, 'consulta e bloqueio no mesmo horário ficam lado a lado, não um em cima do outro (' + bloq.n + ' eventos)');

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou || ruim.length ? 1 : 0);
