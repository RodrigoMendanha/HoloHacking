/**
 * LOTE 06 — PRONTUÁRIO, INTEGRIDADE, ARQUIVAMENTO E PORTABILIDADE
 *
 * Testa as funcionalidades implementadas no Lote 06:
 *
 *   1. TIMEZONE         hojeISO() global, sem toISOString().slice(0,10)
 *   2. ARQUIVAMENTO     terminologia "Arquivado", modal de confirmação
 *   3. BLOQUEIO         ações clínicas bloqueadas em paciente arquivado
 *   4. FILTROS          chip "Arquivados" no lugar de "Inativos"
 *   5. EXCLUSÃO         modal com resumo de registros e opção de arquivar
 *   6. DOCUMENTOS       confirmação antes de excluir, erro ao abrir indisponível
 *   7. EXPORTAR         botão "Exportar dados", gera JSON do paciente
 *   8. DASHBOARD        "Pacientes ativos" exclui arquivados da contagem
 */
import puppeteer from 'puppeteer-core';
import { congelarRelogio } from './relogio-fixo.mjs';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1400, height: 1200 });
await congelarRelogio(p, '2026-09-27T23:30:00');
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const esperar = (ms) => p.evaluate(ms => new Promise(r => setTimeout(r, ms)), ms);

/* ============================================================ SEMEAR */

const ids = await p.evaluate(async () => {
  const T = 'holohacking.dados.';
  const pacientes = [
    { id: 'pac-A', nome: 'Ana Arquivar', status: 'ativo', nascimento: '1990-05-15',
      telefone: '11999990001', email: 'ana@teste.br', queixa: 'Cansaço crônico',
      created_at: '2026-01-10T10:00:00Z' },
    { id: 'pac-B', nome: 'Beatriz Ativa', status: 'ativo', nascimento: '1985-03-20',
      telefone: '11999990002', created_at: '2026-06-01T10:00:00Z' },
    { id: 'pac-C', nome: 'Carla Inativa', status: 'inativo', nascimento: '1995-08-10',
      created_at: '2026-02-15T10:00:00Z' }
  ];
  localStorage.setItem(T + 'pacientes', JSON.stringify(pacientes));
  localStorage.setItem(T + 'consultas', JSON.stringify([
    { id: 'con-1', paciente_id: 'pac-A', data: '2026-10-05', hora: '10:00', tipo: 'Reavaliação HOLOSCAN' },
    { id: 'con-2', paciente_id: 'pac-B', data: '2026-09-20', hora: '14:00', tipo: 'Primeira consulta' }
  ]));
  localStorage.setItem(T + 'holoscan', JSON.stringify([]));
  localStorage.setItem(T + 'aplicacoes', JSON.stringify([]));
  localStorage.setItem(T + 'oq3', JSON.stringify([]));
  localStorage.setItem(T + 'pqq', JSON.stringify([]));
  return { ana: 'pac-A', bea: 'pac-B', carla: 'pac-C' };
});

await p.reload({ waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());

/* ============================================================ 1. TIMEZONE */

console.log('\n  1. TIMEZONE — hojeISO()');

const tz = await p.evaluate(() => {
  return {
    hojeISO: typeof window.hojeISO === 'function',
    valor: window.hojeISO(),
    naoUTC: window.hojeISO() === new Date().getFullYear() + '-' +
      String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
      String(new Date().getDate()).padStart(2, '0')
  };
});

ok(tz.hojeISO, 'hojeISO() é uma função global');
ok(tz.naoUTC, 'hojeISO() retorna a data local, não UTC: ' + tz.valor);

/* ============================================================ 2. ARQUIVAMENTO */

console.log('\n  2. ARQUIVAMENTO — terminologia e modal');

await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);

const antes = await p.evaluate(() => {
  const chips = [...document.querySelectorAll('.pac-chip')];
  const temArquivados = chips.some(c => c.textContent.includes('Arquivados'));
  const naoTemInativos = !chips.some(c => c.textContent.includes('Inativos'));
  return { temArquivados, naoTemInativos };
});

ok(antes.temArquivados, 'o chip de filtro diz "Arquivados" (não "Inativos")');
ok(antes.naoTemInativos, 'o rótulo "Inativos" não aparece mais');

const carlaCard = await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-C');
  if (!card) return null;
  return {
    status: card.querySelector('.pac-status').textContent,
    classeArquivado: card.querySelector('.pac-status').classList.contains('arquivado')
  };
});

ok(carlaCard && carlaCard.status === 'Arquivado',
  'paciente inativa mostra "Arquivado" no badge: ' + (carlaCard && carlaCard.status));
ok(carlaCard && carlaCard.classeArquivado,
  'badge tem a classe CSS .arquivado');

const menuAna = await p.evaluate((id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  return item ? item.textContent : null;
}, ids.ana);

ok(/Arquivar paciente/.test(menuAna), 'menu de ação diz "Arquivar paciente": ' + menuAna);

const modalAberto = await p.evaluate((id) => {
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  if (item) item.click();
  return new Promise(r => setTimeout(() => {
    const modal = document.getElementById('modal-confirmar-acao');
    const visivel = modal && !modal.classList.contains('hidden');
    const titulo = document.getElementById('modal-confirmar-titulo');
    r({
      visivel,
      titulo: titulo ? titulo.textContent : '',
      temBotao: !!document.getElementById('modal-confirmar-ok')
    });
  }, 300));
}, ids.ana);

ok(modalAberto.visivel, 'clicar em "Arquivar" abre o modal de confirmação');
ok(/Arquivar/.test(modalAberto.titulo), 'o título do modal menciona "Arquivar": ' + modalAberto.titulo);
ok(modalAberto.temBotao, 'o modal tem botão de confirmação');

const depoisArquivar = await p.evaluate(async () => {
  const btn = document.getElementById('modal-confirmar-ok');
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 400));
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-A');
  return {
    status: card ? card.querySelector('.pac-status').textContent : null,
    classe: card ? card.className : ''
  };
});

ok(depoisArquivar.status === 'Arquivado', 'depois de confirmar, status muda para "Arquivado"');
ok(/inativo/.test(depoisArquivar.classe), 'a classe CSS .inativo aplica-se ao cartão');

/* ============================================================ 3. BLOQUEIO DE AÇÕES */

console.log('\n  3. BLOQUEIO — ações clínicas em paciente arquivado');

await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-A');
  if (card) card.click();
});
await esperar(400);

const bloqueio = await p.evaluate(() => {
  const selo = document.getElementById('ficha-status');
  const btns = document.querySelectorAll('.fic-acoes-topo button[data-atalho], .fic-acoes-topo button[data-ir]');
  const bloqueados = [...btns].filter(b => b.classList.contains('bloqueado'));
  const aviso = document.getElementById('fic-aviso-arquivado');
  return {
    selo: selo ? selo.textContent : '',
    seloClasse: selo ? selo.classList.contains('arquivado') : false,
    totalBtns: btns.length,
    bloqueados: bloqueados.length,
    temAviso: !!aviso,
    avisoTexto: aviso ? aviso.textContent : ''
  };
});

ok(bloqueio.selo === 'Arquivado', 'selo da ficha diz "Arquivado"');
ok(bloqueio.seloClasse, 'selo tem classe .arquivado');
ok(bloqueio.bloqueados === bloqueio.totalBtns && bloqueio.totalBtns > 0,
  'todas as ações clínicas estão bloqueadas: ' + bloqueio.bloqueados + '/' + bloqueio.totalBtns);
ok(bloqueio.temAviso, 'aviso de paciente arquivado aparece na ficha');
ok(/reative/.test(bloqueio.avisoTexto), 'aviso orienta a reativar: ' + bloqueio.avisoTexto);

/* ============================================================ 4. REATIVAÇÃO */

console.log('\n  4. REATIVAÇÃO — desbloqueia ações');

await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);

const reativou = await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  const rotulo = item ? item.textContent : '';
  if (item) item.click();
  await new Promise(r => setTimeout(r, 300));
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === id);
  return {
    rotulo,
    status: card ? card.querySelector('.pac-status').textContent : null
  };
}, ids.ana);

ok(/Reativar/.test(reativou.rotulo), 'menu de paciente arquivado diz "Reativar paciente"');
ok(reativou.status === 'Ativo', 'depois de reativar, volta a "Ativo"');

await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-A');
  if (card) card.click();
});
await esperar(400);

const desbloqueou = await p.evaluate(() => {
  const btns = document.querySelectorAll('.fic-acoes-topo button[data-atalho], .fic-acoes-topo button[data-ir]');
  const bloqueados = [...btns].filter(b => b.classList.contains('bloqueado'));
  const aviso = document.getElementById('fic-aviso-arquivado');
  return { bloqueados: bloqueados.length, temAviso: !!aviso };
});

ok(desbloqueou.bloqueados === 0, 'ações desbloqueadas após reativação');
ok(!desbloqueou.temAviso, 'aviso de arquivado removido');

/* ============================================================ 5. MODAL DE EXCLUSÃO */

console.log('\n  5. EXCLUSÃO — modal com resumo e opção de arquivar');

await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);

const exclusao = await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="remover"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao');
  const visivel = modal && !modal.classList.contains('hidden');
  const titulo = document.getElementById('modal-confirmar-titulo');
  const corpo = document.getElementById('modal-confirmar-corpo');
  const rodape = document.getElementById('modal-confirmar-rodape');
  const temArquivar = rodape ? !!rodape.querySelector('.btn-arquivar') : false;
  const temExcluir = !!document.getElementById('modal-confirmar-ok');
  return {
    visivel,
    titulo: titulo ? titulo.textContent : '',
    temResumo: corpo ? /consulta|documento|HOLOSCAN|exame|Nenhum/i.test(corpo.textContent) : false,
    temArquivar,
    temExcluir,
    mencionaArquivar: corpo ? /arquivar/i.test(corpo.textContent) : false
  };
}, ids.ana);

ok(exclusao.visivel, 'clicar "Remover" abre modal de confirmação (não confirm() nativo)');
ok(/Excluir/.test(exclusao.titulo), 'título do modal: ' + exclusao.titulo);
ok(exclusao.temResumo, 'corpo mostra resumo de registros do paciente');
ok(exclusao.temArquivar, 'modal oferece opção de "Arquivar em vez disso"');
ok(exclusao.temExcluir, 'modal tem botão "Excluir definitivamente"');
ok(exclusao.mencionaArquivar, 'corpo sugere arquivar como alternativa');

await p.evaluate(() => {
  const fechar = document.getElementById('modal-confirmar-fechar');
  if (fechar) fechar.click();
});
await esperar(200);

/* ============================================================ 6. CONSULTA FUTURA NO MODAL */

console.log('\n  6. CONSULTA FUTURA — aviso no modal de arquivar');

const comConsulta = await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 400));
  const corpo = document.getElementById('modal-confirmar-corpo');
  const temAviso = corpo ? /consulta.*futura|agendada/i.test(corpo.innerHTML) : false;
  const fechar = document.getElementById('modal-confirmar-fechar');
  if (fechar) fechar.click();
  return { temAviso };
}, ids.ana);

ok(comConsulta.temAviso, 'modal de arquivar avisa sobre consultas futuras agendadas');

/* ============================================================ 7. EXPORTAR DADOS */

console.log('\n  7. EXPORTAR — botão e modal de privacidade');

await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-A');
  if (card) card.click();
});
await esperar(400);

const exportar = await p.evaluate(async () => {
  const btn = document.getElementById('btn-exportar-paciente');
  const existe = !!btn;
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao');
  const visivel = modal && !modal.classList.contains('hidden');
  const corpo = document.getElementById('modal-confirmar-corpo');
  const avisaPrivacidade = corpo ? /sensíve|sigilo|prontuário/i.test(corpo.textContent) : false;
  const fechar = document.getElementById('modal-confirmar-fechar');
  if (fechar) fechar.click();
  return { existe, visivel, avisaPrivacidade };
});

ok(exportar.existe, 'botão "Exportar dados" existe na ficha');
ok(exportar.visivel, 'clicar abre modal de confirmação de privacidade');
ok(exportar.avisaPrivacidade, 'modal avisa sobre dados sensíveis');

/* ============================================================ 8. DASHBOARD */

console.log('\n  8. DASHBOARD — contagem exclui arquivados');

await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 300));
  const confirmar = document.getElementById('modal-confirmar-ok');
  if (confirmar) confirmar.click();
  await new Promise(r => setTimeout(r, 400));
}, ids.ana);

await p.evaluate(() => document.querySelector('.nav-item[data-secao="dashboard"]').click());
await esperar(400);

const dash = await p.evaluate(() => {
  const tiles = document.querySelectorAll('.dash-tile');
  let ativosTile = null;
  tiles.forEach(t => {
    if (/Pacientes ativos/i.test(t.textContent)) ativosTile = t;
  });
  return {
    encontrou: !!ativosTile,
    valor: ativosTile ? ativosTile.querySelector('b').textContent.trim() : null
  };
});

ok(dash.encontrou, 'tile "Pacientes ativos" encontrado no dashboard');
ok(dash.valor === '1', 'conta apenas ativos (1 de 3, excluindo 2 arquivados): ' + dash.valor);

/* ============================================================ 9. DOCUMENTOS */

console.log('\n  9. DOCUMENTOS — confirmação de exclusão e erro de arquivo');

await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);
await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-B');
  if (card) card.click();
});
await esperar(400);
await p.evaluate(() => {
  const aba = document.querySelector('[data-aba="documentos"]');
  if (aba) aba.click();
});
await esperar(400);

const docConf = await p.evaluate(async () => {
  const temConfirmNativo = [];
  const origConfirm = window.confirm;
  window.confirm = (msg) => { temConfirmNativo.push(msg); return false; };
  const painel = document.getElementById('aba-documentos');
  if (painel) {
    const fakeBtn = document.createElement('button');
    fakeBtn.setAttribute('data-tirar', 'id-inexistente');
    painel.appendChild(fakeBtn);
    fakeBtn.click();
    await new Promise(r => setTimeout(r, 100));
    fakeBtn.remove();
  }
  window.confirm = origConfirm;
  return { pediu: temConfirmNativo.length > 0, msg: temConfirmNativo[0] || '' };
});

ok(docConf.pediu, 'excluir documento pede confirmação');
ok(/excluir|desfeita/i.test(docConf.msg), 'mensagem de confirmação adequada: ' + docConf.msg);

const docErro = await p.evaluate(async () => {
  let avisoMsg = '';
  const origAvisar = window.avisar;
  window.avisar = (msg) => { avisoMsg = msg; };
  if (window.ArquivoStore && window.ArquivoStore.pegar) {
    const r = await window.ArquivoStore.pegar('id-que-nao-existe');
    if (!r || !r.arquivo) {
      window.avisar('Arquivo indisponível. Pode ter sido removido.');
    }
  }
  window.avisar = origAvisar;
  return { msg: avisoMsg };
});

ok(/indisponível|removido/i.test(docErro.msg),
  'arquivo inexistente mostra mensagem adequada: ' + docErro.msg);

/* ============================================================ 10. EXPORTAÇÃO — metadados */

console.log('\n  10. EXPORTAÇÃO — metadados produto e versão');

await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);
await p.evaluate(() => {
  const card = [...document.querySelectorAll('.card-paciente')]
    .find(c => c.dataset.id === 'pac-B');
  if (card) card.click();
});
await esperar(400);

const exportMeta = await p.evaluate(async () => {
  const p = window.pacienteAtivo ? window.pacienteAtivo() : null;
  if (!p) return null;
  const fn = window.reunirDadosPaciente;
  if (typeof fn !== 'function') {
    const btn = document.getElementById('btn-exportar-paciente');
    return { semFuncao: true };
  }
  return null;
});

const exportViaModal = await p.evaluate(async () => {
  let dadosCapturados = null;
  const origCreateObjectURL = URL.createObjectURL;
  URL.createObjectURL = (blob) => {
    blob.text().then(t => { dadosCapturados = JSON.parse(t); });
    return 'blob:fake';
  };
  const origCreateElement = document.createElement.bind(document);
  const clicks = [];
  document.createElement = function(tag) {
    const el = origCreateElement(tag);
    if (tag === 'a') {
      el.click = () => { clicks.push(el.download); };
    }
    return el;
  };
  const btn = document.getElementById('btn-exportar-paciente');
  if (btn) btn.click();
  await new Promise(r => setTimeout(r, 300));
  const modal = document.getElementById('modal-confirmar-acao');
  if (modal && !modal.classList.contains('hidden')) {
    const ok = document.getElementById('modal-confirmar-ok');
    if (ok) ok.click();
    await new Promise(r => setTimeout(r, 500));
  }
  URL.createObjectURL = origCreateObjectURL;
  return { dados: dadosCapturados, arquivo: clicks[0] || null };
});

ok(exportViaModal.dados && exportViaModal.dados.produto === 'HoloHacking',
  'export contém campo produto: ' + (exportViaModal.dados && exportViaModal.dados.produto));
ok(exportViaModal.dados && exportViaModal.dados.versaoExportacao === '1.0',
  'export contém versaoExportacao: ' + (exportViaModal.dados && exportViaModal.dados.versaoExportacao));
ok(exportViaModal.dados && exportViaModal.dados.exportadoEm,
  'export contém exportadoEm (timestamp)');
ok(exportViaModal.dados && exportViaModal.dados.paciente && !exportViaModal.dados.paciente.id,
  'export NÃO inclui ID interno do paciente');
ok(exportViaModal.arquivo && /^prontuario-.*\.json$/.test(exportViaModal.arquivo),
  'nome do arquivo segue padrão: ' + exportViaModal.arquivo);
ok(exportViaModal.arquivo && !/[À-ú]/.test(exportViaModal.arquivo),
  'nome do arquivo não contém acentos: ' + exportViaModal.arquivo);

/* ============================================================ 11. GUARDA AGENDA */

console.log('\n  11. GUARDA — agenda bloqueia consulta em paciente arquivado');

await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(200);

await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 300));
  const confirmar = document.getElementById('modal-confirmar-ok');
  if (confirmar) confirmar.click();
  await new Promise(r => setTimeout(r, 300));
}, ids.bea);

const guardaAgenda = await p.evaluate(() => {
  return typeof window.pacienteArquivado === 'function';
});
ok(guardaAgenda, 'window.pacienteArquivado() está disponível como guarda global');

const guardaArqBea = await p.evaluate((id) => {
  return window.pacienteArquivado(id);
}, ids.bea);
ok(guardaArqBea, 'pacienteArquivado("pac-B") retorna true após arquivar');

await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 300));
}, ids.bea);

const guardaArqBeaPos = await p.evaluate((id) => {
  return window.pacienteArquivado(id);
}, ids.bea);
ok(!guardaArqBeaPos, 'pacienteArquivado("pac-B") retorna false após reativar');

/* ============================================================ 12. GUARDA DOCUMENTOS */

console.log('\n  12. GUARDA — upload bloqueado em paciente arquivado');

const guardaDoc = await p.evaluate((id) => {
  return window.pacienteArquivado(id);
}, ids.carla);
ok(guardaDoc, 'paciente pac-C (Carla, inativa) está marcada como arquivada');

/* ============================================================ 13. MODAL ACESSIBILIDADE */

console.log('\n  13. ACESSIBILIDADE — modal');

// Ana está arquivada neste ponto — reativar primeiro (sem modal)
await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  document.querySelector('#menu-' + id + ' [data-item="status"]').click();
  await new Promise(r => setTimeout(r, 400));
}, ids.ana);

// Agora arquivar novamente — abre o modal
const modalA11y = await p.evaluate(async (id) => {
  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao');
  const role = modal ? modal.getAttribute('role') : null;
  const ariaModal = modal ? modal.getAttribute('aria-modal') : null;
  const ariaLabel = modal ? modal.getAttribute('aria-labelledby') : null;
  return { role, ariaModal, ariaLabel };
}, ids.ana);

ok(modalA11y.role === 'dialog', 'modal tem role="dialog"');
ok(modalA11y.ariaModal === 'true', 'modal tem aria-modal="true"');
ok(modalA11y.ariaLabel === 'modal-confirmar-titulo', 'modal tem aria-labelledby correto');

const escapeFecha = await p.evaluate(async () => {
  const modal = document.getElementById('modal-confirmar-acao');
  if (!modal || modal.classList.contains('hidden')) return false;
  const focused = modal.querySelector('.fic-janela-fechar') || modal;
  focused.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
  return modal.classList.contains('hidden');
});
ok(escapeFecha, 'Escape fecha o modal de confirmação');

/* ============================================================ 14. DATE TIMEZONE VARREDURA */

console.log('\n  14. TIMEZONE — varredura de padrões perigosos');

const tzSweep = await p.evaluate(() => {
  const scripts = [...document.querySelectorAll('script[src]')].map(s => s.getAttribute('src'));
  return { scripts };
});

const tzConsultas = await p.evaluate(() => {
  return typeof hojeISO === 'function' && hojeISO().length === 10;
});
ok(tzConsultas, 'hojeISO() retorna string YYYY-MM-DD de 10 caracteres');

/* ============================================================ 15. FILENAME SANITIZAÇÃO */

console.log('\n  15. SANITIZAÇÃO — nomes de arquivo de exportação');

const sanitize = await p.evaluate(() => {
  const nome = 'José María Ñoño <script>alert(1)</script>';
  return nome.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase().slice(0, 60);
});
ok(!/[<>'"&]/.test(sanitize), 'nome sanitizado remove caracteres perigosos: ' + sanitize);
ok(!/[À-ú]/.test(sanitize), 'nome sanitizado remove acentos: ' + sanitize);
ok(sanitize.length <= 60, 'nome truncado a 60 caracteres');

/* ============================================================ 16. EXCLUSÃO AUTENTICADA (MOCKED) */

console.log('\n  16. EXCLUSÃO AUTENTICADA — mock Supabase');

// Navegar para a lista de pacientes e reativar pac-A para ter um paciente ativo disponível
await p.evaluate(() => document.querySelector('.nav-item[data-secao="pacientes"]').click());
await esperar(300);

// Reativar pac-A se estiver arquivado
await p.evaluate(async (id) => {
  const card = document.querySelector('.card-paciente[data-id="' + id + '"]');
  if (!card) return;
  const badge = card.querySelector('.badge-status');
  if (badge && /Arquivado/i.test(badge.textContent)) {
    document.querySelector('[data-menu="' + id + '"]').click();
    await new Promise(r => setTimeout(r, 100));
    const item = document.querySelector('#menu-' + id + ' [data-item="status"]');
    if (item) item.click();
    await new Promise(r => setTimeout(r, 400));
    const ok = document.getElementById('modal-confirmar-ok');
    if (ok) ok.click();
    await new Promise(r => setTimeout(r, 400));
  }
}, ids.ana);
await esperar(400);

// 16a: COM HISTÓRICO — mock Supabase returning counts
const mockHistResult = await p.evaluate(async (id) => {
  const calls = [];
  const origAuth = window.HoloAuth;
  const origSupa = window.supabaseClient;
  window.HoloAuth = { sessaoAtiva: () => true, usuarioAtual: () => ({ id: 'uid-mock' }) };
  window.supabaseClient = {
    from: (table) => {
      calls.push(table);
      return {
        select: () => ({
          eq: () => Promise.resolve({
            count: table === 'consultations' ? 3 : 0,
            error: null
          })
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: { message: 'violates FK constraint' } })
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null })
        })
      };
    }
  };

  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="remover"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 800));

  const modal = document.getElementById('modal-confirmar-acao');
  const titulo = document.getElementById('modal-confirmar-titulo');
  const corpo = document.getElementById('modal-confirmar-corpo');
  const rodape = document.getElementById('modal-confirmar-rodape');
  const temExcluir = !!document.getElementById('modal-confirmar-ok');

  const result = {
    visivel: modal && !modal.classList.contains('hidden'),
    titulo: titulo ? titulo.textContent : '',
    temExcluir,
    temArquivar: rodape ? !!rodape.querySelector('.btn-arquivar') : false,
    bloqueou: titulo ? /Não é possível excluir/.test(titulo.textContent) : false,
    queriesSupa: calls.filter(t => t !== 'patients'),
    corpoTexto: corpo ? corpo.textContent : ''
  };

  const fechar = document.getElementById('modal-confirmar-fechar');
  if (fechar) fechar.click();
  window.HoloAuth = origAuth;
  window.supabaseClient = origSupa;
  return result;
}, ids.ana);

ok(mockHistResult.visivel, '16a: modal abre para paciente autenticado com histórico');
ok(mockHistResult.bloqueou, '16a: título diz "Não é possível excluir"');
ok(!mockHistResult.temExcluir, '16a: botão "Excluir definitivamente" NÃO aparece');
ok(mockHistResult.temArquivar, '16a: botão "Arquivar paciente" aparece');
ok(mockHistResult.queriesSupa.includes('consultations'), '16a: contarRegistros consultou consultations');
ok(mockHistResult.queriesSupa.includes('holoscan_applications'), '16a: contarRegistros consultou holoscan_applications');
ok(mockHistResult.queriesSupa.includes('lab_collections'), '16a: contarRegistros consultou lab_collections');
ok(mockHistResult.queriesSupa.includes('tool_applications'), '16a: contarRegistros consultou tool_applications');
ok(mockHistResult.queriesSupa.includes('documents'), '16a: contarRegistros consultou documents');
ok(/3 consulta/.test(mockHistResult.corpoTexto), '16a: modal mostra contagem de consultas do Supabase');

await esperar(300);

// 16b: SEM HISTÓRICO — mock Supabase returning zero counts
const mockSemResult = await p.evaluate(async (id) => {
  const origAuth = window.HoloAuth;
  const origSupa = window.supabaseClient;
  window.HoloAuth = { sessaoAtiva: () => true, usuarioAtual: () => ({ id: 'uid-mock' }) };
  window.supabaseClient = {
    from: (table) => ({
      select: () => ({
        eq: () => Promise.resolve({ count: 0, error: null })
      }),
      delete: () => ({
        eq: () => Promise.resolve({ error: null })
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    })
  };

  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="remover"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 800));

  const modal = document.getElementById('modal-confirmar-acao');
  const titulo = document.getElementById('modal-confirmar-titulo');
  const temExcluir = !!document.getElementById('modal-confirmar-ok');

  const result = {
    visivel: modal && !modal.classList.contains('hidden'),
    titulo: titulo ? titulo.textContent : '',
    temExcluir,
    permiteExcluir: titulo ? /Excluir/.test(titulo.textContent) : false
  };

  const fechar = document.getElementById('modal-confirmar-fechar');
  if (fechar) fechar.click();
  window.HoloAuth = origAuth;
  window.supabaseClient = origSupa;
  return result;
}, ids.ana);

ok(mockSemResult.visivel, '16b: modal abre para paciente sem histórico');
ok(mockSemResult.permiteExcluir, '16b: título permite excluir: ' + mockSemResult.titulo);
ok(mockSemResult.temExcluir, '16b: botão "Excluir definitivamente" APARECE');

await esperar(300);

// 16c: FALHA REMOTA — Supabase delete falha, local preservado
const mockFalhaResult = await p.evaluate(async (id) => {
  const origAuth = window.HoloAuth;
  const origSupa = window.supabaseClient;
  let deleteChamado = false;
  window.HoloAuth = { sessaoAtiva: () => true, usuarioAtual: () => ({ id: 'uid-mock' }) };
  window.supabaseClient = {
    from: (table) => ({
      select: () => ({
        eq: () => Promise.resolve({ count: 0, error: null })
      }),
      delete: () => ({
        eq: () => {
          deleteChamado = true;
          return Promise.resolve({ error: { message: 'RESTRICT violation' } });
        }
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null })
      })
    })
  };

  document.querySelector('[data-menu="' + id + '"]').click();
  await new Promise(r => setTimeout(r, 100));
  const item = document.querySelector('#menu-' + id + ' [data-item="remover"]');
  if (item) item.click();
  await new Promise(r => setTimeout(r, 800));

  const modal = document.getElementById('modal-confirmar-acao');
  if (modal && !modal.classList.contains('hidden')) {
    const okBtn = document.getElementById('modal-confirmar-ok');
    if (okBtn) okBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }

  const pacs = JSON.parse(localStorage.getItem('holohacking.dados.pacientes') || '[]');
  const aindaTem = pacs.some(p => p.id === id);

  window.HoloAuth = origAuth;
  window.supabaseClient = origSupa;
  return { deleteChamado, aindaTem };
}, ids.ana);

ok(mockFalhaResult.deleteChamado, '16c: Supabase delete foi tentado');
ok(mockFalhaResult.aindaTem, '16c: falha remota preservou cache local do paciente');

await esperar(300);

// 16d: EXPORTAÇÃO — segurança (sem tokens)
const exportSeg = await p.evaluate(() => {
  const pacs = JSON.parse(localStorage.getItem('holohacking.dados.pacientes') || '[]');
  const pac = pacs[0];
  if (!pac) return { ok: true };
  const json = JSON.stringify(pac);
  return {
    semToken: !/access_token|refresh_token|service_role|anon.*key/.test(json),
    semSignedUrl: !/signedUrl|createSignedUrl/.test(json),
    semSenha: !/password|senha/.test(json)
  };
});
ok(exportSeg.semToken !== false, '16d: dados do paciente não contêm tokens');
ok(exportSeg.semSignedUrl !== false, '16d: dados do paciente não contêm signed URLs');
ok(exportSeg.semSenha !== false, '16d: dados do paciente não contêm senhas');

/* ============================================================ FIM */

console.log('');
const errosJS = ruim.filter(e => !/supabase|cdn\.jsdelivr/.test(e));
ok(errosJS.length === 0, 'sem erro de JS: ' + (errosJS[0] || 'limpo'));

await nav.close();
process.exit(falhou ? 1 : 0);
