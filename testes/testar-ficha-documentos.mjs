/**
 * A aba Documentos da ficha — a BIBLIOTECA do prontuario (decisao de produto 09/10).
 *
 * Exame e documento sao so arquivos guardados: tipo, titulo, data, arquivo e
 * observacao. Nada e lido, interpretado ou lancado em coleta. Documento nao e
 * excluido: e arquivado (e pode ser restaurado).
 *
 * O que este teste cobra (sem sessao: o arquivo fica so neste navegador):
 *
 *   VAZIO        titulo e texto do estado vazio, sem contador "0".
 *   BOTAO        "+ Adicionar arquivo" aciona o MESMO input de arquivo da zona de arrastar.
 *   FORM         tipo (6 opcoes), titulo, data, observacao; sem titulo nao guarda.
 *   LISTA        upload de verdade aparece com titulo, tipo, data, nome do arquivo,
 *                data de envio, responsavel e observacao; contador acompanha.
 *   ORDEM        ArquivoStore.listar() ja ordena por data decrescente — a lista herda.
 *   ABRIR/BAIXAR "Abrir" chama window.open; "Baixar" dispara um download com o nome do arquivo.
 *   ARQUIVAR     some da lista, continua guardado; "Ver arquivados" mostra; "Restaurar" devolve.
 *   SEM LAB      nenhum "Lancar valores", nenhum painel de exames, nenhuma Leitura Integrada.
 *   ISOLAMENTO   a ficha de outro paciente nao herda os documentos.
 *   NAVEGACAO    o atalho do cabecalho ("Adicionar arquivo") leva para esta aba sem zerar a tela.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('amostras', { recursive: true });
writeFileSync('amostras/exame-doc.pdf', '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1300 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const conferir = ok;
const espera = ms => new Promise(r => setTimeout(r, ms));

const aba = (x) => p.evaluate(async (n) => {
  document.querySelector('[data-aba="' + n + '"]').click();
  await new Promise(r => setTimeout(r, 300));
}, x);
const abrirFichaDe = (id) => p.evaluate(async (pid) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.querySelector('[data-ficha="' + pid + '"]').click();
  await new Promise(r => setTimeout(r, 300));
}, id);
const lista = () => p.evaluate(() => ({
  total: document.getElementById('doc-total')?.textContent || '',
  itens: [...document.querySelectorAll('.bib-item')].map(it => ({
    titulo: it.querySelector('.bib-titulo')?.textContent, tipo: it.querySelector('.doc-tipo')?.textContent,
    meta: it.querySelector('.bib-meta')?.innerText || '', obs: it.querySelector('.bib-obs')?.textContent || '',
    botoes: [...it.querySelectorAll('button')].map(b => b.textContent.trim())
  }))
}));

/* --------------------------------------------------------- dois pacientes */
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
  const marina = await novo('Marina Alves');
  const carla = await novo('Carla Souza');
  return { marina, carla };
});

/* ------------------------------------------------------- sem documento --- */
await abrirFichaDe(ids.marina);
await aba('documentos');
const vazio = await p.evaluate(() => {
  const v = document.querySelector('#doc-lista .lista-vazia');
  return { titulo: v?.querySelector('strong')?.textContent, texto: v?.querySelector('span')?.textContent,
    total: document.getElementById('doc-total')?.textContent || '',
    tipos: [...document.querySelectorAll('#doc-tipo option')].map(o => o.textContent),
    campos: ['doc-tipo', 'doc-titulo', 'doc-data', 'doc-arquivo', 'doc-observacao'].map(id => !!document.getElementById(id)),
    botaoTopo: document.querySelector('.fic-consultas-topo [data-acao="adicionar-documento"]')?.textContent.trim(),
    semLab: !document.getElementById('lab-corpo') && !document.getElementById('ex-corpo') && !document.querySelector('[data-lancar]'),
    texto: document.getElementById('aba-documentos').innerText };
});
conferir(vazio.titulo === 'Nenhum documento adicionado', 'título do estado vazio: ' + vazio.titulo);
conferir(/Adicionar arquivo/.test(vazio.texto || ''), 'texto do estado vazio convida a adicionar: ' + vazio.texto);
conferir(vazio.total === '', 'sem documento, o contador fica em branco — não "0 documentos"');
conferir(JSON.stringify(vazio.tipos) === JSON.stringify(['Exame', 'Laudo', 'Receita', 'Encaminhamento', 'Documento', 'Outro']), 'os 6 tipos da biblioteca: ' + vazio.tipos.join(', '));
conferir(vazio.campos.every(Boolean) && vazio.botaoTopo === '+ Adicionar arquivo', 'formulário com tipo, título, data, arquivo e observação; botão "+ Adicionar arquivo"');
conferir(vazio.semLab && !/Lançar valores|Painel legado|Leitura Integrada|coleta/i.test(vazio.texto), 'sem painel de exames, sem "Lançar valores", sem Leitura Integrada: só a biblioteca');

const topoAciona = await p.evaluate(async () => {
  const campo = document.getElementById('doc-arquivo');
  return new Promise(resolve => {
    const ouvinte = () => { campo.removeEventListener('click', ouvinte); resolve(true); };
    campo.addEventListener('click', ouvinte);
    document.querySelector('.fic-consultas-topo [data-acao="adicionar-documento"]').click();
    setTimeout(() => { campo.removeEventListener('click', ouvinte); resolve(false); }, 400);
  });
});
conferir(topoAciona, '"+ Adicionar arquivo" do topo aciona o seletor de arquivo já existente');

/* ------------------------------------------ upload de verdade (o input) - */
const campo = await p.$('#doc-arquivo');
await campo.uploadFile('amostras/exame-doc.pdf');
await espera(200);
const preparado = await p.evaluate(() => ({ pendente: !document.getElementById('doc-pendente').classList.contains('hidden'), titulo: document.getElementById('doc-titulo').value }));
conferir(preparado.pendente && preparado.titulo === 'exame-doc', 'escolher o arquivo só prepara e sugere o título pelo nome: ' + preparado.titulo);
// sem titulo nao guarda
await p.evaluate(() => { document.getElementById('doc-titulo').value = ''; document.getElementById('doc-guardar').click(); });
await espera(200);
const semTitulo = await p.evaluate(() => ({ erro: !!document.getElementById('doc-sem-titulo'), itens: document.querySelectorAll('.bib-item').length }));
conferir(semTitulo.erro && semTitulo.itens === 0, 'sem título: pede o título e não guarda');
await p.evaluate(async () => {
  document.getElementById('doc-tipo').value = 'Exame';
  document.getElementById('doc-titulo').value = 'Hemograma completo';
  document.getElementById('doc-data').value = '2026-09-20';
  document.getElementById('doc-observacao').value = 'trazido na consulta de retorno';
  document.getElementById('doc-guardar').click();
  await new Promise(r => setTimeout(r, 900));
});
const umDoc = await lista();
const it0 = umDoc.itens[0] || {};
conferir(umDoc.itens.length === 1 && /1 documento$/.test(umDoc.total), 'guardou e o contador acompanha: ' + umDoc.total);
conferir(it0.titulo === 'Hemograma completo' && it0.tipo === 'Exame' && /20\/09\/2026/.test(it0.meta) && /exame-doc\.pdf/.test(it0.meta) && /Enviado em/.test(it0.meta) && /Responsável/.test(it0.meta) && it0.obs === 'trazido na consulta de retorno',
  'mostra título, tipo, data, nome do arquivo, data de envio, responsável e observação');
conferir(JSON.stringify(it0.botoes) === JSON.stringify(['Abrir', 'Baixar', 'Arquivar']), 'ações: Abrir, Baixar, Arquivar (nenhum "remover", nenhum "lançar valores")');

/* ----------------------------------- mais documentos, um com nome longo - */
await p.evaluate(async (pid) => {
  const arq = (texto, nome) => new File([texto], nome, { type: 'text/plain' });
  const dias = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  await window.ArquivoStore.salvar(pid, arq('a', 'laudo-tireoide.txt'),
    { nome: 'laudo-tireoide.txt', titulo: 'Laudo do endocrinologista sobre a tireoide e o eixo hormonal completo, revisão de setembro', tipo: 'Laudo', data: dias(-5) });
  await window.ArquivoStore.salvar(pid, arq('b', 'antigo.txt'), { nome: 'antigo.txt', titulo: 'Consentimento antigo', tipo: 'Documento', data: dias(-60) });
}, ids.marina);
await p.reload({ waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
await abrirFichaDe(ids.marina);
await aba('documentos');
await espera(400);
const tres = await lista();
conferir(/3 documentos$/.test(tres.total), 'o contador soma os três: ' + tres.total);
conferir(/Laudo do endocrinologista/.test(tres.itens[0].titulo) && tres.itens[1].titulo === 'Hemograma completo' && tres.itens[2].titulo === 'Consentimento antigo',
  'ordem decrescente por data, herdada do ArquivoStore: ' + tres.itens.map(i => i.titulo).join(' · '));
const overflowDesktop = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2);
conferir(overflowDesktop, 'título longo não estoura o layout em desktop');

/* ------------------------------------------------------------- abrir / baixar */
const abriu = await p.evaluate(async () => new Promise(resolve => {
  const original = window.open;
  window.open = function (url) { window.open = original; resolve(!!url); };
  document.querySelector('.bib-item [data-abrir]').click();
  setTimeout(() => { window.open = original; resolve(false); }, 1500);
}));
conferir(abriu, '"Abrir" chama window.open com o arquivo');
const baixou = await p.evaluate(async () => new Promise(resolve => {
  const original = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { HTMLAnchorElement.prototype.click = original; resolve(this.download); };
  [...document.querySelectorAll('.bib-item')].find(it => it.querySelector('.bib-titulo').textContent === 'Hemograma completo').querySelector('[data-baixar]').click();
  setTimeout(() => { HTMLAnchorElement.prototype.click = original; resolve(null); }, 1500);
}));
conferir(baixou === 'exame-doc.pdf', '"Baixar" dispara o download com o nome do arquivo: ' + baixou);

/* ------------------------------------------------------------- arquivar --- */
await p.evaluate(async () => {
  [...document.querySelectorAll('.bib-item')].find(it => it.querySelector('.bib-titulo').textContent === 'Hemograma completo').querySelector('[data-arquivar]').click();
  await new Promise(r => setTimeout(r, 200));
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 600));
});
const depoisArq = await lista();
const guardados = await p.evaluate(async (pid) => (await window.ArquivoStore.listarEstrito(pid)).length, ids.marina);
conferir(depoisArq.itens.length === 2 && /2 documentos$/.test(depoisArq.total) && guardados === 3, 'arquivar tira da lista (2) mas o registro continua guardado (3 no armazenamento)');
await p.evaluate(async () => { document.querySelector('[data-acao="ver-arquivados"]').click(); await new Promise(r => setTimeout(r, 400)); });
const arquivados = await lista();
conferir(arquivados.itens.length === 1 && arquivados.itens[0].titulo === 'Hemograma completo' && /Arquivado em/.test(arquivados.itens[0].meta) && arquivados.itens[0].botoes.includes('Restaurar') && /1 documento arquivado/.test(arquivados.total),
  '"Ver arquivados" mostra o documento arquivado, com data e botão Restaurar');
await p.evaluate(async () => { document.querySelector('.bib-item [data-restaurar]').click(); await new Promise(r => setTimeout(r, 500)); document.querySelector('[data-acao="ver-arquivados"]').click(); await new Promise(r => setTimeout(r, 400)); });
const restaurado = await lista();
conferir(restaurado.itens.length === 3 && restaurado.itens.some(i => i.titulo === 'Hemograma completo'), 'Restaurar devolve o documento à lista (3 de novo)');
const removerRecusa = await p.evaluate(() => window.ArquivoStore.remover('supa:00000000-0000-4000-8000-000000000001').then(() => 'aceitou', e => e.message));
conferir(/não é excluído|Arquivar/.test(removerRecusa), 'o caminho antigo de "remover" documento do prontuário recusa: ' + removerRecusa);

/* --------------------------------------------------- as duas nao se misturam */
await abrirFichaDe(ids.carla);
await aba('documentos');
const outraPessoa = await p.evaluate(() => ({ vazio: !!document.querySelector('#doc-lista .lista-vazia'), itens: document.querySelectorAll('.bib-item').length }));
conferir(outraPessoa.vazio && outraPessoa.itens === 0, 'a ficha de quem não tem documento continua vazia — as duas não se misturam');

/* --------------------------------------- navegacao do cabecalho nao zera - */
await abrirFichaDe(ids.marina);
await aba('visao');
const viaHeader = await p.evaluate(async () => {
  document.querySelector('.fic-acoes-topo [data-ir="aba:documentos"]').click();
  await new Promise(r => setTimeout(r, 250));
  return { abaAtiva: document.querySelector('[data-aba="documentos"]').classList.contains('ativa'), fichaVisivel: !document.getElementById('vista-ficha').classList.contains('hidden'),
    rotulo: document.querySelector('.fic-acoes-topo [data-ir="aba:documentos"]').textContent.trim(), semRegistrarExames: !document.querySelector('.fic-acoes-topo [data-rolar="lab-corpo"]') };
});
conferir(viaHeader.abaAtiva && viaHeader.fichaVisivel && viaHeader.rotulo === 'Adicionar arquivo' && viaHeader.semRegistrarExames, 'o atalho do cabeçalho ("Adicionar arquivo") leva para Documentos; "Registrar exames" saiu');

/* --------------------------------------------------------- responsividade */
for (const largura of [420, 900]) {
  await p.setViewport({ width: largura, height: 1000 });
  await espera(150);
  const semScroll = await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2);
  conferir(semScroll, largura + 'px: sem scroll horizontal');
}

console.log('');
ok(ruim.length === 0, ruim.length ? 'ERRO DE JS: ' + ruim[0] : 'sem erro de JS');
await nav.close();
process.exit(falhou ? 1 : 0);
