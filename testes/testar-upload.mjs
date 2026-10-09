/** Subir PDF e foto de exame, listar, abrir e ARQUIVAR (documento nao e apagado — decisao 09/10). */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('amostras', { recursive: true });
// PDF minimo valido e um PNG 1x1
writeFileSync('amostras/exame.pdf', '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
writeFileSync('amostras/laudo.png', Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'));

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless:'new', args:['--no-sandbox','--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({width:1400,height:1000});
const ruim=[]; p.on('pageerror',e=>ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/',{waitUntil:'networkidle2'});
let falhou = false;
const ok = (c,t) => { if (!c) falhou = true; console.log((c?'  ok    ':'  FALHA ')+t); };

const abrirDocs = () => p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('vista-lista-pacientes').classList.add('hidden');
  document.getElementById('vista-ficha').classList.remove('hidden');
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 500));
});
await abrirDocs();
ok(await p.$('#doc-solta') !== null, 'a area de arrastar existe');

const campo = await p.$('#doc-arquivo');
await campo.uploadFile('amostras/exame.pdf', 'amostras/laudo.png');
// escolher o arquivo so prepara; o envio e no botao Guardar (tipo Exame sem data: confirma "Guardar sem data")
await p.evaluate(async () => {
  document.getElementById('doc-titulo').value = 'Exames de setembro';
  for (let i = 0; i < 2; i++) { const b = document.getElementById('doc-guardar'); if (!b) break; b.click(); await new Promise(r => setTimeout(r, 120)); }
});
await new Promise(r => setTimeout(r, 900));

const dep = await p.evaluate(() => ({
  itens: document.querySelectorAll('.bib-item').length,
  titulos: [...document.querySelectorAll('.bib-titulo')].map(e=>e.textContent),
  arquivos: [...document.querySelectorAll('.bib-meta')].map(e=>e.innerText),
  aviso: document.querySelector('.doc-ok')?.textContent,
}));
ok(dep.itens === 2, dep.itens + ' arquivos guardados: ' + dep.titulos.join(', '));
ok(dep.titulos.join('|') === 'Exames de setembro (1)|Exames de setembro (2)', 'dois arquivos de uma vez: o título ganha (1) e (2)');
ok(dep.arquivos.every(t => /B|KB|MB/.test(t)) && dep.arquivos.some(t => /exame\.pdf/.test(t)) && dep.arquivos.some(t => /laudo\.png/.test(t)), 'mostra o nome e o tamanho de cada arquivo');
ok(/guardado/.test(dep.aviso||''), 'confirma o guardado');

// sobrevive a recarregar
await p.reload({waitUntil:'networkidle2'});
await new Promise(r => setTimeout(r, 700));
await abrirDocs();
const vivo = await p.evaluate(() => document.querySelectorAll('.bib-item').length);
ok(vivo === 2, 'sobrevivem a recarregar a pagina: ' + vivo);

// o arquivo guardado e o mesmo que entrou
const conteudo = await p.evaluate(async () => {
  const itens = await window.ArquivoStore.listar(window.pacienteAtivoId() || '_sem_paciente');
  const pdf = itens.find(i => /pdf/i.test(i.nome));
  const r = await window.ArquivoStore.pegar(pdf.id);
  return { mime: r.mime, texto: (await r.arquivo.text()).slice(0, 8), titulo: r.titulo };
});
ok(conteudo.texto.startsWith('%PDF'), 'o PDF volta intacto: ' + conteudo.texto);
ok(/pdf/.test(conteudo.mime), 'tipo reconhecido: ' + conteudo.mime);

// arquivar: sai da lista, continua guardado, pode voltar
const arq = await p.evaluate(async () => {
  document.querySelector('[data-arquivar]').click();
  await new Promise(r => setTimeout(r, 150));
  document.getElementById('modal-confirmar-ok').click();
  await new Promise(r => setTimeout(r, 500));
  const naLista = document.querySelectorAll('.bib-item').length;
  const guardados = (await window.ArquivoStore.listarEstrito(window.pacienteAtivoId() || '_sem_paciente')).length;
  document.querySelector('[data-acao="ver-arquivados"]').click();
  await new Promise(r => setTimeout(r, 400));
  const arquivados = document.querySelectorAll('.bib-item [data-restaurar]').length;
  document.querySelector('.bib-item [data-restaurar]').click();
  await new Promise(r => setTimeout(r, 400));
  document.querySelector('[data-acao="ver-arquivados"]').click();
  await new Promise(r => setTimeout(r, 400));
  return { naLista, guardados, arquivados, deVolta: document.querySelectorAll('.bib-item').length };
});
ok(arq.naLista === 1 && arq.guardados === 2, 'arquivar tira da lista (sobrou 1) e NAO apaga (2 continuam guardados)');
ok(arq.arquivados === 1 && arq.deVolta === 2, '"Ver arquivados" mostra o arquivado e "Restaurar" devolve: ' + arq.deVolta);

await nav.close();
console.log(ruim.length?'\n  ERRO: '+ruim[0]:'\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
