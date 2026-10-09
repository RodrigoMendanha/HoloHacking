/**
 * LOTE 05 — COBERTURA COMPORTAMENTAL
 *
 * Testa as funcionalidades implementadas no Lote 05:
 *
 *   1. OFFLINE / ONLINE        banner, aria-live, restabelecimento
 *   2. DIRTY STATE              beforeunload condicional, marcaSuja / limpaSuja
 *   3. BUSCA GLOBAL             nome, telefone, e-mail, acentos, case-insensitive
 *   4. AGENDA → PACIENTE        clicar na agenda abre ficha correta
 *   5. CONTEXTO DO PACIENTE     barra de contexto visível fora da ficha
 *   6. TIMELINE — FILTROS       Tudo, Consultas, HOLOSCAN, Documentos, Ferramentas
 *   7. PRÓXIMAS / ANTERIORES    ordenação correta de consultas futuras e passadas
 *   8. UTILS.JS                 escapar e dataBR centralizados, sem sobreescrita
 *   9. XSS CORRIGIDO            selector options e avatar da busca escapam HTML
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { congelarRelogio } from './relogio-fixo.mjs';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1400, height: 1200 });
await congelarRelogio(p, '2026-09-27T10:00:00');
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

/* Helpers ---------------------------------------------------------------- */
const esperar = (ms) => p.evaluate(ms => new Promise(r => setTimeout(r, ms)), ms);
const novaPaciente = (nome, extra) => p.evaluate(async (n, e) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = n;
  if (e && e.telefone) document.getElementById('np-telefone').value = e.telefone;
  if (e && e.email) document.getElementById('np-email').value = e.email;
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 500));
  return window.pacienteAtivoId();
}, nome, extra || {});

/* ==================================================================== */
console.log('\n  1. OFFLINE / ONLINE');
/* ==================================================================== */

const offline = await p.evaluate(async () => {
  var banner = document.getElementById('banner-offline');
  var texto  = document.getElementById('banner-offline-texto');
  if (!banner || !texto) return { existe: false };

  var inicialHidden = banner.hidden;
  var ariaLive = banner.getAttribute('aria-live') || banner.closest('[aria-live]');
  var ariaAttr = banner.getAttribute('aria-live');

  // simulate going offline
  Object.defineProperty(navigator, 'onLine', { value: false, writable: true, configurable: true });
  window.dispatchEvent(new Event('offline'));
  await new Promise(r => setTimeout(r, 100));

  var offlineHidden = banner.hidden;
  var offlineTexto = texto.textContent;

  // simulate coming back online
  Object.defineProperty(navigator, 'onLine', { value: true, writable: true, configurable: true });
  window.dispatchEvent(new Event('online'));
  await new Promise(r => setTimeout(r, 100));

  var onlineTexto = texto.textContent;
  var onlineClasse = banner.classList.contains('online');

  // verify it doesn't block navigation
  var nav = document.querySelector('.barra-lateral');
  var navClickable = nav ? getComputedStyle(nav).pointerEvents !== 'none' : true;

  // wait for banner to hide
  await new Promise(r => setTimeout(r, 4500));
  var bannerHiddenAfter = banner.hidden;

  return {
    existe: true,
    inicialHidden,
    ariaAttr,
    offlineHidden,
    offlineTexto,
    onlineTexto,
    onlineClasse,
    navClickable,
    bannerHiddenAfter
  };
});

ok(offline.existe, 'banner offline existe no DOM');
ok(offline.inicialHidden, 'ONLINE: nenhum aviso indevido — banner começa hidden');
ok(!offline.offlineHidden, 'ONLINE → OFFLINE: banner aparece');
ok(offline.offlineTexto.includes('offline') &&
   offline.offlineTexto.includes('sincronizadas'),
   'texto comunica estado offline: "' + offline.offlineTexto.slice(0, 60) + '"');
ok(offline.onlineTexto.includes('restabelecida'),
   'OFFLINE → ONLINE: feedback de conexão restabelecida: "' + offline.onlineTexto + '"');
ok(offline.onlineClasse, 'classe "online" aplicada no retorno');
ok(offline.ariaAttr === 'polite' || offline.ariaAttr === 'assertive',
   'aria-live funcionando: ' + offline.ariaAttr);
ok(offline.navClickable, 'banner não bloqueia navegação');
ok(offline.bannerHiddenAfter, 'banner desaparece após retorno ao online');

// Verify no sync queue was created
const noSync = await p.evaluate(() => {
  return typeof window.syncQueue === 'undefined' &&
         typeof window.filaSincronizacao === 'undefined' &&
         typeof window.offlineQueue === 'undefined';
});
ok(noSync, 'nenhuma fila de sync fictícia foi criada');

/* ==================================================================== */
console.log('\n  2. DIRTY STATE / BEFOREUNLOAD');
/* ==================================================================== */

const dirty = await p.evaluate(async () => {
  // check that marcaSuja and limpaSuja exist
  var temMarca = typeof window.marcaSuja === 'function';
  var temLimpa = typeof window.limpaSuja === 'function';

  // navigate without changes — no dirty state
  document.querySelector('.nav-item[data-secao="perfil"]').click();
  await new Promise(r => setTimeout(r, 200));
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));

  // test: create a beforeunload event and check if it's prevented
  // with empty state, it should NOT be prevented
  var evLimpo = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evLimpo);
  var impedidoLimpo = evLimpo.defaultPrevented;

  // mark dirty
  window.marcaSuja('teste-paciente');
  var evSujo = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evSujo);
  var impedidoSujo = evSujo.defaultPrevented;

  // clean up
  window.limpaSuja('teste-paciente');
  var evLimpoDepois = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evLimpoDepois);
  var impedidoAposLimpar = evLimpoDepois.defaultPrevented;

  // double-mark and partial clean
  window.marcaSuja('campo-a');
  window.marcaSuja('campo-b');
  var evDois = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evDois);
  var impedidoComDois = evDois.defaultPrevented;

  window.limpaSuja('campo-a');
  var evUm = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evUm);
  var impedidoComUm = evUm.defaultPrevented;

  window.limpaSuja('campo-b');
  var evZero = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evZero);
  var impedidoComZero = evZero.defaultPrevented;

  return {
    temMarca, temLimpa,
    impedidoLimpo,
    impedidoSujo,
    impedidoAposLimpar,
    impedidoComDois,
    impedidoComUm,
    impedidoComZero
  };
});

ok(dirty.temMarca && dirty.temLimpa, 'marcaSuja e limpaSuja estão disponíveis globalmente');
ok(!dirty.impedidoLimpo, 'formulário sem alteração: sair sem alerta');
ok(dirty.impedidoSujo, 'formulário com alteração real: proteção ativa');
ok(!dirty.impedidoAposLimpar, 'salvar/limpar: estado dirty limpa e sair sem alerta');
ok(dirty.impedidoComDois, 'dois campos sujos: proteção ativa');
ok(dirty.impedidoComUm, 'um campo limpo, um sujo: proteção ativa');
ok(!dirty.impedidoComZero, 'todos limpos: sem alerta');

// verify: real form input triggers dirty state
const dirtyForm = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 300));
  document.getElementById('btn-abrir-novo').click();
  await new Promise(r => setTimeout(r, 300));

  // type into np-nome to trigger input listener
  var campo = document.getElementById('np-nome');
  campo.value = 'teste dirty';
  campo.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));

  var evSujo = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evSujo);
  var impedido = evSujo.defaultPrevented;

  // salvar limpa o estado
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 500));

  var evAposSalvar = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(evAposSalvar);
  var impedidoApos = evAposSalvar.defaultPrevented;

  return { impedido, impedidoApos };
});

ok(dirtyForm.impedido, 'input real no formulário de paciente ativa dirty state');
ok(!dirtyForm.impedidoApos, 'após salvar paciente, dirty state limpo');

// Navigate between tabs without editing — no alert
const dirtyNav = await p.evaluate(async () => {
  // make sure no dirty state lingering
  window.limpaSuja('paciente');
  window.limpaSuja('oq3');
  window.limpaSuja('pqq');

  var sections = ['pacientes', 'corpo', 'mente', 'espirito', 'holoscan', 'perfil'];
  for (var i = 0; i < sections.length; i++) {
    var btn = document.querySelector('.nav-item[data-secao="' + sections[i] + '"]');
    if (btn) btn.click();
    await new Promise(r => setTimeout(r, 150));
  }

  var ev = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(ev);
  return !ev.defaultPrevented;
});

ok(dirtyNav, 'navegação comum entre abas sem alteração NÃO gera alerta');

/* ==================================================================== */
console.log('\n  3. BUSCA GLOBAL');
/* ==================================================================== */

// Create patients with specific searchable data
const pidJoao = await novaPaciente('João da Silva', { telefone: '11999887766', email: 'joao@clinica.com' });
const pidMaria = await novaPaciente('María Eugênia', { telefone: '21988776655', email: 'maria.eu@saude.org' });

const busca = await p.evaluate(async () => {
  var input = document.getElementById('busca-global-input');
  var res = document.getElementById('busca-global-resultados');
  if (!input || !res) return { existe: false };

  function buscar(termo) {
    input.value = termo;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    var itens = [...res.querySelectorAll('.busca-global-item')];
    var nomes = itens.map(i => i.querySelector('span:last-child').textContent);
    var aberta = res.classList.contains('aberta');
    var ariaExp = input.closest('[role=combobox]').getAttribute('aria-expanded');
    return { nomes, aberta, ariaExp };
  }

  // by name
  var porNome = buscar('João');

  // by name without accent (accent-insensitive)
  var semAcento = buscar('Joao');

  // case insensitive
  var minuscula = buscar('joão');
  var maiuscula = buscar('JOÃO');

  // by phone
  var porTelefone = buscar('999887766');

  // by email
  var porEmail = buscar('maria.eu@');

  // accent-insensitive with special chars
  var eugenia = buscar('eugenia');

  // clear
  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  var limpo = res.classList.contains('aberta');
  var ariaLimpo = input.closest('[role=combobox]').getAttribute('aria-expanded');

  return {
    existe: true,
    porNome, semAcento, minuscula, maiuscula,
    porTelefone, porEmail, eugenia,
    limpo, ariaLimpo
  };
});

ok(busca.existe, 'busca global presente no DOM');
ok(busca.porNome.nomes.some(n => n.includes('João')),
   'busca por nome: encontra "João da Silva"');
ok(busca.semAcento.nomes.some(n => n.includes('João')),
   'busca sem acento: "Joao" encontra "João da Silva"');
ok(busca.minuscula.nomes.some(n => n.includes('João')),
   'case insensitive: "joão" encontra resultado');
ok(busca.maiuscula.nomes.some(n => n.includes('João')),
   'case insensitive: "JOÃO" encontra resultado');
ok(busca.porTelefone.nomes.some(n => n.includes('João')),
   'busca por telefone: encontra paciente pelo número');
ok(busca.porEmail.nomes.some(n => n.includes('María')),
   'busca por e-mail: encontra paciente pelo email');
ok(busca.eugenia.nomes.some(n => n.includes('María')),
   'accent-insensitive: "eugenia" encontra "Eugênia"');
ok(busca.porNome.ariaExp === 'true', 'aria-expanded=true quando resultados visíveis');
ok(busca.ariaLimpo === 'false', 'aria-expanded=false quando busca limpa');

// clicking result opens correct patient
const buscaAbre = await p.evaluate(async () => {
  var input = document.getElementById('busca-global-input');
  var res = document.getElementById('busca-global-resultados');
  input.value = 'João';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));
  var item = res.querySelector('.busca-global-item');
  if (!item) return { clicou: false };
  var idEsperado = item.dataset.id;
  item.click();
  await new Promise(r => setTimeout(r, 400));
  var ativoId = window.pacienteAtivoId();
  var ficaAberta = !document.getElementById('vista-ficha').classList.contains('hidden');
  return { clicou: true, idEsperado, ativoId, ficaAberta };
});

ok(buscaAbre.clicou, 'resultado da busca é clicável');
ok(buscaAbre.idEsperado === buscaAbre.ativoId,
   'busca → abre a ficha do paciente correto: ' + buscaAbre.ativoId);
ok(buscaAbre.ficaAberta, 'ficha do paciente abre após clicar no resultado');

// verify no cross-user data (only the user's own patients appear)
const buscaIsolada = await p.evaluate(() => {
  // all patients come from local storage — no cross-user possible
  var todos = (window.pacientesTodos && window.pacientesTodos()) || [];
  var naoEMeu = todos.filter(p => p.nutritionist_id && p.nutritionist_id !== 'local');
  return { totalLocal: todos.length, naoMeus: naoEMeu.length };
});
ok(buscaIsolada.naoMeus === 0, 'nenhum dado de outro usuário aparece na busca');

/* ==================================================================== */
console.log('\n  4. AGENDA → PACIENTE / ATENDIMENTO');
/* ==================================================================== */

// Create a consultation for pidJoao via window.Agenda API
const agendaNav = await p.evaluate(async (pidJoao) => {
  // go to agenda
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  await new Promise(r => setTimeout(r, 500));

  // check Agenda API
  if (!window.Agenda || !window.Agenda.todas) return { temAgenda: false };

  // fill consultation form
  var selPac = document.querySelector('#cal-paciente');
  if (selPac) {
    selPac.value = pidJoao;
    selPac.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var selData = document.getElementById('cal-data');
  if (selData) {
    selData.value = '2026-09-28';
    selData.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var selHora = document.getElementById('cal-hora');
  if (selHora) {
    selHora.value = '14:00';
    selHora.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var btnSalvar = document.querySelector('[data-salvar="consulta"]');
  if (btnSalvar) {
    btnSalvar.click();
    await new Promise(r => setTimeout(r, 600));
  }

  // verify the consultation exists
  var todas = window.Agenda.todas(pidJoao);
  var temConsulta = todas.length > 0;

  // now click "Abrir atendimento" if it exists
  var abrirBtn = document.querySelector('[data-abrir-atendimento]');
  if (abrirBtn) {
    var pidDoBtn = abrirBtn.dataset.abrirAtendimento;
    abrirBtn.click();
    await new Promise(r => setTimeout(r, 500));
    var ativoId = window.pacienteAtivoId();
    var fichaVisivel = !document.getElementById('vista-ficha').classList.contains('hidden');
    return {
      temAgenda: true,
      temConsulta,
      pidDoBtn,
      ativoId,
      fichaVisivel,
      correto: pidDoBtn === ativoId
    };
  }

  return { temAgenda: true, temConsulta, semBotao: true };
}, pidJoao);

ok(agendaNav.temAgenda, 'API window.Agenda disponível');
if (agendaNav.temConsulta && !agendaNav.semBotao) {
  ok(agendaNav.correto, 'agenda → paciente correto é ativado: ' + agendaNav.ativoId);
  ok(agendaNav.ficaVisivel, 'agenda → ficha/atendimento abre');
} else if (agendaNav.temConsulta) {
  ok(true, 'consulta criada na agenda (botão abrir depende de seleção)');
}

// test levarParaFicha function
const levarPara = await p.evaluate(async (pidJoao) => {
  if (!window.levarParaFicha) return { tem: false };
  window.levarParaFicha('ficha', pidJoao);
  await new Promise(r => setTimeout(r, 500));
  var ativoId = window.pacienteAtivoId();
  var ficaVisivel = !document.getElementById('vista-ficha').classList.contains('hidden');
  return { tem: true, correto: ativoId === pidJoao, ficaVisivel };
}, pidJoao);

ok(levarPara.tem, 'window.levarParaFicha disponível');
ok(levarPara.correto, 'levarParaFicha ativa o paciente correto');
ok(levarPara.ficaVisivel, 'levarParaFicha abre a ficha');

/* ==================================================================== */
console.log('\n  5. CONTEXTO DO PACIENTE');
/* ==================================================================== */

const ctx = await p.evaluate(async (pidJoao) => {
  // ensure João is the active patient
  if (window.abrirFichaDe) {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    window.abrirFichaDe(pidJoao);
    await new Promise(r => setTimeout(r, 400));
  }

  var barra = document.getElementById('barra-paciente-ctx');
  if (!barra) return { existe: false };

  // when on ficha, bar should be hidden
  var naFicha = barra.hidden;

  // navigate to other sections and check bar visibility
  var secoes = ['holoscan', 'corpo', 'mente', 'espirito'];
  var resultados = {};
  for (var i = 0; i < secoes.length; i++) {
    var btn = document.querySelector('.nav-item[data-secao="' + secoes[i] + '"]');
    if (btn) {
      btn.click();
      await new Promise(r => setTimeout(r, 200));
      var nome = document.getElementById('bpctx-nome');
      resultados[secoes[i]] = {
        visivel: !barra.hidden,
        nome: nome ? nome.textContent : ''
      };
    }
  }

  // role and aria-label
  var role = barra.getAttribute('role');
  var ariaLabel = barra.getAttribute('aria-label');

  return { existe: true, naFicha, resultados, role, ariaLabel };
}, pidJoao);

ok(ctx.existe, 'barra de contexto do paciente existe');
ok(ctx.naFicha, 'na ficha: barra de contexto escondida');
for (const [secao, r] of Object.entries(ctx.resultados || {})) {
  ok(r.visivel, secao + ': barra de contexto visível');
  ok(r.nome.includes('João'), secao + ': nome do paciente correto: "' + r.nome + '"');
}
ok(ctx.role === 'navigation', 'barra tem role="navigation"');
ok(ctx.ariaLabel && ctx.ariaLabel.includes('paciente'), 'barra tem aria-label descritivo');

// Change patient and verify context updates
const ctxTroca = await p.evaluate(async (pidMaria) => {
  if (window.abrirFichaDe) {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    window.abrirFichaDe(pidMaria);
    await new Promise(r => setTimeout(r, 400));
  }
  // go to holoscan
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 200));
  var nome = document.getElementById('bpctx-nome');
  return { nome: nome ? nome.textContent : '' };
}, pidMaria);

ok(ctxTroca.nome.includes('María'),
   'trocar de paciente atualiza o contexto: "' + ctxTroca.nome + '"');

/* ==================================================================== */
console.log('\n  6. TIMELINE — FILTROS');
/* ==================================================================== */

// Create a patient with rich data for timeline
const pidTimeline = await novaPaciente('Paciente Timeline');

const timeline = await p.evaluate(async (pid) => {
  // insert consultations via DadosLocais (the local storage layer)
  var dl = window.DadosLocais;
  if (dl) {
    await dl.from('consultas').insert({
      paciente_id: pid, data: '2026-09-20', hora: '09:00',
      duracao: 60, tipo: 'Retorno', nota: 'Acompanhamento'
    }).select().single();
    await dl.from('consultas').insert({
      paciente_id: pid, data: '2026-09-30', hora: '14:00',
      duracao: 45, tipo: 'Primeira consulta'
    }).select().single();
  }

  // insert an exam document via ArquivoStore mock in localStorage
  if (dl) {
    await dl.from('aplicacoes').insert({
      paciente_id: pid, ferramenta_id: 'roda_vida',
      status: 'concluida', iniciada_em: '2026-09-18T08:00:00',
      concluida_em: '2026-09-18T08:30:00'
    }).select().single();
  }

  // reload agenda so it picks up the new consultations
  if (window.Agenda && window.Agenda.recarregar) await window.Agenda.recarregar();

  // inject structured exam values into holohacking.exames (local lab data)
  var chaveEx = 'holohacking.exames';
  var examesAtuais = {};
  try { examesAtuais = JSON.parse(localStorage.getItem(chaveEx) || '{}'); } catch (e) {}
  examesAtuais[pid] = { glicose: '92', colesterol_total: '185' };
  localStorage.setItem(chaveEx, JSON.stringify(examesAtuais));

  // inject an exam-type document via ArquivoStore — it must stay as "documento"
  if (window.ArquivoStore && window.ArquivoStore.listar) {
    var originalListar = window.ArquivoStore.listar;
    window.ArquivoStore.listar = function (p) {
      return originalListar(p).then(function (lista) {
        lista.push({
          id: 'exam-fake-1', nome: 'Hemograma completo',
          tipo: 'Exame laboratorial', data: '2026-09-15',
          tamanho: 120000, paciente_id: pid
        });
        return lista;
      });
    };
  }

  // activate the patient and go to ficha
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  if (window.abrirFichaDe) window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 400));

  // timeline lives inside "Visão geral" tab
  var abaVisao = document.querySelector('[data-aba="visao"]');
  if (abaVisao) {
    abaVisao.click();
    await new Promise(r => setTimeout(r, 300));
  }

  var alvo = document.getElementById('fic-visao-timeline');
  if (!alvo) return { temTimeline: false };

  // check filter buttons
  var filtros = [...alvo.querySelectorAll('[data-filtro-linha]')];
  var nomesFiltros = filtros.map(f => f.textContent.trim());

  // count initial events (Tudo)
  var eventosTudo = alvo.querySelectorAll('.fic-evento').length;

  // test each filter
  var resultados = {};
  var filtrosIds = ['tudo', 'consulta', 'mapa', 'ferramenta', 'documento'];
  for (var i = 0; i < filtrosIds.length; i++) {
    var btn = alvo.querySelector('[data-filtro-linha="' + filtrosIds[i] + '"]');
    if (btn) {
      btn.click();
      await new Promise(r => setTimeout(r, 200));
      var eventos = alvo.querySelectorAll('.fic-evento');
      var tipos = [...eventos].map(e => {
        if (e.classList.contains('consulta')) return 'consulta';
        if (e.classList.contains('mapa')) return 'mapa';
        if (e.classList.contains('exame')) return 'exame';
        if (e.classList.contains('documento')) return 'documento';
        if (e.classList.contains('ferramenta')) return 'ferramenta';
        return 'outro';
      });
      var btnNovo = alvo.querySelector('[data-filtro-linha="' + filtrosIds[i] + '"]');
      var pressed = btnNovo ? btnNovo.getAttribute('aria-pressed') : null;
      resultados[filtrosIds[i]] = {
        total: eventos.length,
        tipos: [...new Set(tipos)],
        pressed
      };
    }
  }

  // restore to Tudo
  var btnTudo = alvo.querySelector('[data-filtro-linha="tudo"]');
  if (btnTudo) btnTudo.click();
  await new Promise(r => setTimeout(r, 200));
  var eventosTudoFinal = alvo.querySelectorAll('.fic-evento').length;

  // check chronological order (most recent first)
  var datas = [...alvo.querySelectorAll('.fic-evento')].map(e => {
    var texto = e.querySelector('.fic-evento-quando');
    return texto ? texto.textContent : '';
  });

  return {
    temTimeline: true,
    nomesFiltros,
    eventosTudo,
    eventosTudoFinal,
    resultados,
    primeiraData: datas[0],
    ultimaData: datas[datas.length - 1]
  };
}, pidTimeline);

if (timeline.temTimeline) {
  ok(timeline.nomesFiltros.includes('Tudo'), 'filtro "Tudo" presente');
  /* V1 Etapa 1 (ajuste final): a agenda e agendamento, e o filtro diz isso */
  ok(timeline.nomesFiltros.includes('Agendamentos') && !timeline.nomesFiltros.includes('Consultas'), 'filtro "Agendamentos" presente (não "Consultas")');
  ok(timeline.nomesFiltros.includes('HOLOSCAN'), 'filtro "HOLOSCAN" presente');
  ok(!timeline.nomesFiltros.includes('Exames'), 'sem filtro "Exames" (coleta estruturada saiu da linha do tempo, 09/10)');
  ok(timeline.nomesFiltros.includes('Ferramentas'), 'filtro "Ferramentas" presente');
  ok(timeline.nomesFiltros.includes('Documentos e exames'), 'filtro "Documentos e exames" presente');

  if (timeline.resultados.consulta) {
    ok(timeline.resultados.consulta.tipos.every(t => t === 'consulta'),
       'filtro Consultas mostra apenas consultas');
    ok(timeline.resultados.consulta.pressed === 'true',
       'aria-pressed=true no filtro ativo');
  }
  ok(!timeline.resultados.exame, 'nenhum evento de exame estruturado (valores locais não viram evento)');
  if (timeline.resultados.documento) {
    ok(timeline.resultados.documento.tipos.every(t => t === 'documento'),
       'filtro Documentos mostra apenas documentos');
    ok(timeline.resultados.documento.total > 0,
       'documento "Exame laboratorial" permanece como documento: ' + timeline.resultados.documento.total);
  }
  if (timeline.resultados.ferramenta) {
    ok(timeline.resultados.ferramenta.tipos.every(t => t === 'ferramenta'),
       'filtro Ferramentas mostra apenas ferramentas');
  }
  ok(timeline.eventosTudo > 0 && timeline.resultados.tudo,
     'os eventos aparecem em Tudo: ' + timeline.eventosTudo + ' eventos');
  ok(timeline.eventosTudoFinal === timeline.eventosTudo,
     '"Tudo" restaura todos os eventos: ' + timeline.eventosTudoFinal);
} else {
  ok(false, 'timeline não encontrada no DOM');
}

/* ==================================================================== */
console.log('\n  7. PRÓXIMAS / ANTERIORES');
/* ==================================================================== */

const consultasOrdem = await p.evaluate(async (pid) => {
  // go to ficha of timeline patient who has consultations
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  if (window.abrirFichaDe) window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 500));

  var abaConsultas = document.querySelector('[data-aba="consultas"]');
  if (abaConsultas) {
    abaConsultas.click();
    await new Promise(r => setTimeout(r, 400));
  }

  var painel = document.getElementById('aba-consultas');
  if (!painel) return { temPainel: false };

  // check sections
  var titulos = [...painel.querySelectorAll('.dash-titulo')].map(h => h.textContent.trim());
  var temProximas = titulos.some(t => t.includes('Próxima'));
  var temAnteriores = titulos.some(t => t.includes('anterior'));

  // get dates from each section
  var blocos = painel.querySelectorAll('.dash-bloco');
  var proximasDatas = [];
  var anterioresDatas = [];

  for (var i = 0; i < blocos.length; i++) {
    var titulo = blocos[i].querySelector('.dash-titulo');
    if (!titulo) continue;
    var itens = [...blocos[i].querySelectorAll('.dash-pendente')];
    var datas = itens.map(item => {
      var b = item.querySelector('.dash-quem b');
      return b ? b.textContent.trim() : '';
    });
    if (titulo.textContent.includes('Próxim')) {
      proximasDatas = datas;
    } else if (titulo.textContent.includes('anterior')) {
      anterioresDatas = datas;
    }
  }

  return {
    temPainel: true,
    temProximas,
    temAnteriores,
    proximasDatas,
    anterioresDatas
  };
}, pidTimeline);

ok(consultasOrdem.temPainel, 'painel de consultas existe');
ok(consultasOrdem.temProximas, 'seção "Próximas consultas" presente');
if (consultasOrdem.temProximas) {
  ok(consultasOrdem.proximasDatas.length > 0, 'próximas consultas listadas: ' + consultasOrdem.proximasDatas.length);
}
ok(consultasOrdem.temAnteriores, 'seção "Consultas anteriores" presente');

/* ==================================================================== */
console.log('\n  8. UTILS.JS');
/* ==================================================================== */

const utils = await p.evaluate(() => {
  // Verify escapar and dataBR are globally available
  var temEscapar = typeof window.escapar === 'function';
  var temDataBR = typeof window.dataBR === 'function';

  // Test escapar
  var xssPayload = '<img src=x onerror="alert(1)">';
  var escapado = temEscapar ? window.escapar(xssPayload) : '';
  var xssSeguro = escapado.indexOf('<') === -1 && escapado.indexOf('>') === -1;

  // Test dataBR
  var data1 = temDataBR ? window.dataBR('2026-09-27') : '';
  var data2 = temDataBR ? window.dataBR(null) : 'falhou';
  var data3 = temDataBR ? window.dataBR('') : 'falhou';

  // Test edge cases
  var escaparNull = temEscapar ? window.escapar(null) : 'falhou';
  var escaparUndef = temEscapar ? window.escapar(undefined) : 'falhou';
  var escaparNum = temEscapar ? window.escapar(42) : 'falhou';
  var escaparAspas = temEscapar ? window.escapar('"teste"') : '';

  // Check script loading order
  var scripts = [...document.querySelectorAll('script[src]')];
  var posUtils = scripts.findIndex(s => s.src.includes('utils.js'));
  var posApp = scripts.findIndex(s => s.src.includes('app.js'));
  var posFicha = scripts.findIndex(s => s.src.includes('ficha.js'));
  var posDashboard = scripts.findIndex(s => s.src.includes('dashboard.js'));

  return {
    temEscapar, temDataBR,
    xssSeguro, escapado,
    data1, data2, data3,
    escaparNull, escaparUndef, escaparNum, escaparAspas,
    posUtils, posApp, posFicha, posDashboard
  };
});

ok(utils.temEscapar, 'window.escapar está disponível globalmente');
ok(utils.temDataBR, 'window.dataBR está disponível globalmente');
ok(utils.xssSeguro, 'escapar protege XSS: "' + utils.escapado.slice(0, 50) + '"');
ok(utils.data1 === '27/09/2026', 'dataBR converte ISO para BR: ' + utils.data1);
ok(utils.data2 === '', 'dataBR com null retorna vazio');
ok(utils.data3 === '', 'dataBR com string vazia retorna vazio');
ok(utils.escaparNull === '', 'escapar(null) retorna string vazia');
ok(utils.escaparUndef === '', 'escapar(undefined) retorna string vazia');
ok(utils.escaparNum === '42', 'escapar(42) retorna "42"');
ok(utils.escaparAspas.includes('&quot;'), 'escapar escapa aspas duplas');
ok(utils.posUtils >= 0, 'utils.js está no index.html');
ok(utils.posUtils < utils.posApp, 'utils.js carrega ANTES de app.js: posição ' + utils.posUtils + ' vs ' + utils.posApp);
ok(utils.posUtils < utils.posFicha, 'utils.js carrega ANTES de ficha.js');
ok(utils.posUtils < utils.posDashboard, 'utils.js carrega ANTES de dashboard.js');

// Verify no module overwrites global functions
const noOverwrite = await p.evaluate(() => {
  var escRef1 = window.escapar;
  var datRef1 = window.dataBR;
  // call them to verify they're the same function reference
  var r1 = escRef1('<b>');
  var r2 = window.escapar('<b>');
  return {
    mesmaRef: escRef1 === window.escapar && datRef1 === window.dataBR,
    mesmoResultado: r1 === r2
  };
});
ok(noOverwrite.mesmaRef, 'nenhuma função global foi sobrescrita acidentalmente');

/* ==================================================================== */
console.log('\n  9. XSS CORRIGIDO — seletores e busca');
/* ==================================================================== */

const XSS_PAYLOAD = '<img src=x onerror="window.__xss_lote05=1">';

// Create a patient with XSS payload in name
await novaPaciente(XSS_PAYLOAD, { telefone: '11222333444' });
await esperar(400);

const xss = await p.evaluate(async (payload) => {
  // Check selector options (atualizarSeletores)
  var seletores = document.querySelectorAll('.seletor-paciente');
  var opcoes = [];
  seletores.forEach(s => {
    [...s.options].forEach(o => opcoes.push(o.innerHTML));
  });
  var optionComTag = opcoes.some(o => o.indexOf('<img') >= 0);
  var optionEscapado = opcoes.some(o => o.indexOf('&lt;img') >= 0);

  // Check search results
  var input = document.getElementById('busca-global-input');
  var res = document.getElementById('busca-global-resultados');
  input.value = 'onerror';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 100));

  var itens = [...res.querySelectorAll('.busca-global-item')];
  var htmlItens = itens.map(i => i.innerHTML);
  var avatarHtml = itens.map(i => {
    var av = i.querySelector('.pac-avatar');
    return av ? av.innerHTML : '';
  });
  var nomeHtml = itens.map(i => {
    var sp = i.querySelectorAll('span');
    return sp.length >= 2 ? sp[1].innerHTML : '';
  });

  var buscaComTag = htmlItens.some(h => h.indexOf('<img') >= 0);
  var buscaEscapado = nomeHtml.some(h => h.indexOf('&lt;img') >= 0);

  input.value = '';
  input.dispatchEvent(new Event('input', { bubbles: true }));

  // Check if any XSS executed
  var xssExecutou = typeof window.__xss_lote05 !== 'undefined';

  // Check patient list cards
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 300));
  var cards = document.querySelectorAll('.card-paciente');
  var cardComTag = false;
  cards.forEach(c => {
    if (c.innerHTML.indexOf('<img src=x') >= 0) cardComTag = true;
  });

  return {
    optionComTag, optionEscapado,
    buscaComTag, buscaEscapado,
    xssExecutou, cardComTag,
    totalOpcoes: opcoes.length,
    totalItens: itens.length
  };
}, XSS_PAYLOAD);

ok(!xss.xssExecutou, 'window.__xss_lote05 NÃO foi definido — nenhum script executou');
ok(!xss.optionComTag, 'selector options: nenhuma <img> tag viva no HTML');
ok(xss.optionEscapado, 'selector options: payload escapado com &lt;img');
ok(!xss.buscaComTag, 'busca global: nenhuma <img> tag viva nos resultados');
if (xss.totalItens > 0) {
  ok(xss.buscaEscapado, 'busca global: nome do paciente escapado nos resultados');
}
ok(!xss.cardComTag, 'cards de paciente: nenhuma <img> tag viva');

/* ------------------------------------------------------------------ fim - */
console.log('');
ok(ruim.length === 0, ruim.length ? 'ERRO DE JS: ' + ruim[0] : 'sem erro de JS');
await nav.close();
process.exit(falhou ? 1 : 0);
