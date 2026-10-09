/**
 * Correcao das telas Pacientes e Atendimentos (auditoria de producao com Cowork, 06/10).
 *
 * Cobra, no navegador (modo local):
 *   1  Atendimentos: "Abrir ficha" vai para a ficha; "Abrir atendimento" seleciona o
 *      atendimento e abre a aba Conduta (antes trocava o paciente e ficava na tela)
 *   5  as listas de atendimentos e de consultas tem layout (grid), como a do HOLOSCAN
 *  18  consulta de hoje que ja passou vai para "anteriores"; 19 anterior sem atendimento
 *      oferece "Registrar atendimento"
 *   3  arquivado: botao principal "Reativar", menu so Reativar/Remover; na ficha os
 *      botoes de registro ficam DESABILITADOS e aparece "Reativar paciente"
 *   4  "ultimo contato" conta o atendimento registrado, nao so o HOLOSCAN
 *   6  cadastro recusa nascimento no futuro e telefone sem numero
 *   7  "Novo paciente" na aba Revisao abre o formulario visivel
 *   9  ao carregar, o paciente em foco e o primeiro ATIVO
 *  12  contadores so de ativos
 *  16  "Gerar o mapa" com 0 respostas explica (toast)
 *  23  a barra de contexto nao aparece na lista de pacientes
 *  25  ir para Pacientes sem abrir ficha nao deixa a tela em branco
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
await p.evaluate(() => { window.confirm = () => true; });
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const espera = ms => new Promise(r => setTimeout(r, ms));

/* toast: o que apareceu durante a acao */
await p.evaluate(() => {
  window.__toasts = [];
  const t = document.getElementById('toast');
  new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); })
    .observe(t, { childList: true, characterData: true, subtree: true });
});
const toasts = () => p.evaluate(() => { const v = window.__toasts.slice(); window.__toasts.length = 0; return v.join(' | '); });

const ids = await p.evaluate(async () => {
  const novo = async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    await new Promise(x => setTimeout(x, 300));
    return window.pacienteAtivoId();
  };
  const ana = await novo('Ana Ficticia');
  const bia = await novo('Bia Ficticia');
  return { ana, bia };
});

/* ---------------------------------------------------- Atendimentos ------- */
const at = await p.evaluate(async (ids) => {
  const dia = k => { const d = new Date(); d.setDate(d.getDate() + k); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const e = await window.AtendimentoAtual.iniciar({ patient_id: ids.ana, occurred_at: new Date(Date.now() - 2 * 86400000).toISOString() });
  // consulta de HOJE ja passada (00:01) e uma futura; uma de ontem sem atendimento
  await window.DadosLocais.from('consultas').insert({ paciente_id: ids.bia, data: dia(0), hora: '00:01:00', duracao: 60, tipo: 'Retorno', nota: '' });
  await window.DadosLocais.from('consultas').insert({ paciente_id: ids.bia, data: dia(5), hora: '10:00:00', duracao: 60, tipo: 'Retorno', nota: '' });
  await window.Agenda.recarregar();
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  window.redesenharConsultas();
  const corpo = document.getElementById('consultas-corpo');
  const blocos = corpo.querySelectorAll('#consultas-agenda .con-lista');
  const prox = blocos[0] ? [...blocos[0].querySelectorAll('.cons-linha')].map(l => l.innerText.replace(/\s+/g, ' ')) : [];
  const ant = blocos[1] ? [...blocos[1].querySelectorAll('.cons-linha')].map(l => l.innerText.replace(/\s+/g, ' ')) : [];
  const atLinha = corpo.querySelector('.at-linha');
  const consLinha = corpo.querySelector('.cons-linha');
  return { eid: e.id, prox, ant,
    gridAt: atLinha ? getComputedStyle(atLinha).display : null,
    gridCons: consLinha ? getComputedStyle(consLinha).display : null,
    botaoAt: atLinha ? atLinha.querySelector('[data-atendimento]').textContent.trim() : '',
    detalheAt: atLinha ? atLinha.querySelector('.con-detalhe').textContent : '' };
}, ids);
ok(at.gridAt === 'grid' && at.gridCons === 'grid', 'listas de atendimentos e consultas com layout (grid): ' + at.gridAt + ' / ' + at.gridCons);
ok(/^Abrir atendimento/.test(at.botaoAt) && /sem conduta/.test(at.detalheAt), 'atendimento: botão "Abrir atendimento" e "sem conduta" na linha: ' + at.detalheAt);
ok(at.prox.length === 1 && !/00:01/.test(at.prox.join()), 'a consulta de hoje que já passou sai de "próximas": ' + at.prox.join(' | '));
ok(at.ant.some(l => /00:01/.test(l) && /sem atendimento registrado/.test(l) && /Registrar atendimento/.test(l)),
   'e aparece em "anteriores", dizendo que não há atendimento e oferecendo registrar: ' + at.ant.join(' | '));

const irAt = await p.evaluate(async (eid) => {
  document.querySelector('#consultas-corpo [data-atendimento="' + eid + '"]').click();
  await new Promise(r => setTimeout(r, 300));
  return { secao: document.querySelector('.secao.ativa')?.id, ficha: !document.getElementById('vista-ficha').classList.contains('hidden'),
    aba: document.querySelector('[data-aba].ativa')?.dataset.aba, atual: (window.AtendimentoAtual.atual() || {}).id };
}, at.eid);
ok(irAt.secao === 'secao-pacientes' && irAt.ficha && irAt.aba === 'conduta' && irAt.atual === at.eid,
   '"Abrir atendimento" vai para a ficha, com o atendimento selecionado, na aba Conduta: ' + JSON.stringify(irAt));

const irFicha = await p.evaluate(async (bia) => {
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  document.querySelector('#consultas-corpo #consultas-agenda [data-paciente="' + bia + '"]').click();
  await new Promise(r => setTimeout(r, 300));
  return { secao: document.querySelector('.secao.ativa')?.id, ficha: !document.getElementById('vista-ficha').classList.contains('hidden'), nome: window.pacienteAtivoNome() };
}, ids.bia);
ok(irFicha.secao === 'secao-pacientes' && irFicha.ficha && irFicha.nome === 'Bia Ficticia', '"Abrir ficha" em Atendimentos abre a ficha (antes ficava na mesma tela)');

/* ---------------------------------------------------- último contato ----- */
const contato = await p.evaluate((ids) => {
  const s = window.Panorama.situacao(window.pacientesTodos().find(x => x.id === ids.ana));
  const sb = window.Panorama.situacao(window.pacientesTodos().find(x => x.id === ids.bia));
  return { ana: s.ultimoContato, nunca: s.nuncaAtendido, bia: sb.nuncaAtendido };
}, ids);
ok(contato.ana && !contato.nunca && contato.bia, 'último contato vem do atendimento registrado (Ana: ' + contato.ana + '); quem só tem consulta marcada continua sem atendimento');

/* ---------------------------------------------------- arquivado ---------- */
const arq = await p.evaluate(async (ids) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  const v = document.getElementById('voltar-lista'); if (v) v.click();
  window.pacientesTodos().find(x => x.id === ids.bia).status = 'inativo';
  // o estado interno e o mesmo objeto: trocar de tela redesenha a lista
  document.querySelector('[data-aba-pac="lista"]').click();
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  await new Promise(r => setTimeout(r, 200));
  const card = document.querySelector('.card-paciente[data-id="' + ids.bia + '"]');
  const menu = card ? [...card.querySelectorAll('.pac-menu-item')].map(b => b.textContent.trim()) : [];
  const principal = card ? card.querySelector('.pac-acao-principal').textContent.trim() : '';
  const barra = document.getElementById('barra-paciente-ctx').hidden;
  const total = document.getElementById('pac-total-cabeca').innerText;
  const nav = document.getElementById('nav-total-pac').textContent;
  window.abrirFichaDe(ids.bia);
  await new Promise(r => setTimeout(r, 200));
  const bt = [...document.querySelectorAll('.fic-acoes-topo button[data-atalho], .fic-acoes-topo button[data-ir]')].map(b => b.disabled);
  const reativar = document.getElementById('btn-reativar-paciente');
  const reativarVisivel = reativar && !reativar.classList.contains('hidden');
  return { menu, principal, barra, total, nav, bt, reativarVisivel };
}, ids);
ok(arq.principal === 'Reativar', 'lista: o botão principal do arquivado é "Reativar": ' + arq.principal);
ok(arq.menu.join(',') === 'Reativar paciente,Remover paciente', 'e o menu só tem Reativar e Remover: ' + arq.menu.join(' · '));
ok(arq.bt.length >= 3 && arq.bt.every(Boolean),   /* Marcar consulta, Adicionar arquivo, Aplicar HOLOSCAN (09/10: um botao de arquivo so) */ 'ficha do arquivado: botões de registro desabilitados de verdade (' + arq.bt.length + ')');
ok(arq.reativarVisivel, 'e a ficha tem o botão "Reativar paciente"');
ok(/^1 paciente ativo · 1 arquivado$/.test(arq.total.replace(/\s+/g, ' ')) && arq.nav === '1', 'contadores só de ativos: "' + arq.total + '", menu lateral ' + arq.nav);
ok(arq.barra === true, 'a barra de contexto não aparece na lista de pacientes');

const reat = await p.evaluate(async (bia) => {
  document.getElementById('btn-reativar-paciente').click();
  await new Promise(r => setTimeout(r, 400));
  const p = window.pacientesTodos().find(x => x.id === bia);
  const bt = [...document.querySelectorAll('.fic-acoes-topo button[data-atalho], .fic-acoes-topo button[data-ir]')].map(b => b.disabled);
  return { status: p.status, bt, escondido: document.getElementById('btn-reativar-paciente').classList.contains('hidden') };
}, ids.bia);
ok(reat.status === 'ativo' && reat.bt.every(x => !x) && reat.escondido, '"Reativar paciente" na ficha reativa e libera os botões');

/* ---------------------------------------------------- cadastro ----------- */
await toasts();
const cad = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  const v = document.getElementById('voltar-lista'); if (v) v.click();
  document.querySelector('[data-aba-pac="revisao"]').click();
  document.getElementById('btn-abrir-novo').click();
  const visivel = !document.getElementById('painel-novo').classList.contains('hidden') &&
    !document.getElementById('painel-pac-lista').classList.contains('hidden');
  const n0 = window.pacientesTodos().length;
  document.getElementById('np-nome').value = 'Cadastro Invalido';
  document.getElementById('np-nascimento').value = '2099-01-01';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('np-nascimento').value = '';
  document.getElementById('np-telefone').value = 'abc';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 200));
  const n1 = window.pacientesTodos().length;
  document.getElementById('np-telefone').value = '+55 11 99999-0000';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 300));
  return { visivel, recusou: n1 === n0, aceitou: window.pacientesTodos().length === n0 + 1, max: document.getElementById('np-nascimento').max };
});
const msgCad = await toasts();
ok(cad.visivel, '"Novo paciente" na aba Revisão abre o formulário visível (volta para a Lista)');
ok(cad.recusou && /futuro/.test(msgCad) && /Telefone inválido/.test(msgCad), 'cadastro recusa nascimento no futuro e telefone "abc": ' + msgCad.slice(0, 160));
ok(cad.aceitou, 'e aceita quando corrigido');

/* ---------------------------------------------------- Esc no excluir ---- */
const esc = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  const v = document.getElementById('voltar-lista'); if (v) v.click();
  const n0 = window.pacientesTodos().length;
  const card = document.querySelector('.card-paciente');
  card.querySelector('[data-item="remover"]').click();
  await new Promise(r => setTimeout(r, 300));
  const aberto = !document.getElementById('modal-confirmar-acao').classList.contains('hidden');
  document.body.focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise(r => setTimeout(r, 300));
  return { aberto, fechou: document.getElementById('modal-confirmar-acao').classList.contains('hidden'), igual: window.pacientesTodos().length === n0 };
});
ok(esc.aberto && esc.fechou && esc.igual, 'Esc fecha a confirmação de excluir (mesmo com o foco fora dela) e nada é apagado');

/* ---------------------------------------------------- tela em branco ----- */
const branco = await p.evaluate(async () => {
  window.abrirFichaDe(window.pacientesTodos()[0].id);
  await new Promise(r => setTimeout(r, 150));
  window.irParaSecao('pacientes');
  await new Promise(r => setTimeout(r, 150));
  return !document.getElementById('vista-lista-pacientes').classList.contains('hidden') ||
         !document.getElementById('vista-ficha').classList.contains('hidden');
});
ok(branco, 'ir para Pacientes sem abrir uma ficha mostra a lista (não fica em branco)');

/* ---------------------------------------------------- gerar com 0 -------- */
await toasts();
await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 200));
  document.querySelectorAll('.q-btn.ativo, .q-btn[aria-pressed="true"]').forEach(b => b.click());
  const g = document.querySelector('[data-acao="calcular"]'); if (g) g.click();
  await new Promise(r => setTimeout(r, 200));
});
const msgGerar = await toasts();
ok(/Responda ao menos uma pergunta/.test(msgGerar), '"Gerar o mapa" com 0 respostas explica o motivo: ' + msgGerar);

/* ---------------------------------------------------- foco ao carregar --- */
// arquiva dois pacientes no armazenamento e recarrega: o foco vai para um ATIVO
await p.evaluate(async (ids) => {
  const { data } = await window.DadosLocais.from('pacientes').select('*');
  for (const x of data) if (x.id === ids.bia || x.nome === 'Cadastro Invalido') await window.DadosLocais.from('pacientes').update({ status: 'inativo' }).eq('id', x.id);
}, ids);
await p.reload({ waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
const recarregado = await p.evaluate(() => {
  const a = window.pacientesTodos().find(x => x.id === window.pacienteAtivoId());
  return a ? a.status : null;
});
ok(recarregado === 'ativo', 'ao recarregar, o paciente em foco é um ATIVO (não o arquivado): ' + recarregado);

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou || ruim.length ? 1 : 0);
