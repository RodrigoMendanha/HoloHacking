/**
 * As tres telas de Atendimento: Consultas, Agenda e Documentos.
 *
 * O que elas prometem, e o que este teste cobra:
 *
 *   Consultas   cada aplicacao do HOLOSCAN vira uma linha, da mais recente
 *               para tras, e a variacao do Indice so existe da 2a em diante.
 *   Agenda      a data derivada e ultima aplicacao + 28 dias; a data marcada
 *               por uma pessoa manda sobre ela; quem nunca teve mapa fica em
 *               "Sem data" em vez de ganhar uma data inventada.
 *   Documentos  os arquivos de TODOS os pacientes, cada um com o nome do dono.
 *
 * Nenhuma das tres calcula: as tres leem panorama.js e o ArquivoStore, que sao
 * os mesmos que a ficha e o dashboard leem. Se divergirem, alguem escreveu a
 * regra duas vezes.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';

const caso = JSON.parse(readFileSync(new URL('caso.json', import.meta.url), 'utf8'));

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1500, height: 1300 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
let falhou = false;
const conferir = (c, t) => { if (!c) falhou = true; ok(c, t); };

/* ---------------------------------------------------- as telas existem --- */

const existem = await p.evaluate(() => {
  const ir = s => { document.querySelector('.nav-item[data-secao="' + s + '"]').click();
                    return document.getElementById('secao-' + s).classList.contains('ativa'); };
  return {
    consultas: ir('consultas'),
    agenda: ir('agenda'),
    caminho: document.getElementById('caminho-atual').textContent,
    // o HOLOSCAN mudou de grupo: e ferramenta, nao atendimento
    grupoHolo: document.querySelector('.nav-item[data-secao="holoscan"]')
                 .closest('.nav-grupo')
                 .getAttribute('aria-labelledby'),
    grupoConsultas: document.querySelector('.nav-item[data-secao="consultas"]')
                 .closest('.nav-grupo')
                 .getAttribute('aria-labelledby'),
  };
});
conferir(existem.consultas && existem.agenda,
  'as tres secoes abrem pelo menu');
conferir(existem.caminho === 'Agenda',   // 09/10: a ultima secao visitada e a Agenda (Documentos saiu do menu)
  'o caminho no topo acompanha: ' + existem.caminho);
conferir(existem.grupoHolo === 'nav-grupo-recursos',
  'HOLOSCAN esta em Recursos');
conferir(existem.grupoConsultas === 'nav-grupo-atendimento',
  'Consultas esta em Atendimento');

/* ------------------------------------------------------- tudo vazio ------ */

const vazio = await p.evaluate(() => {
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  const c = document.getElementById('consultas-corpo').innerText;
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  const a = document.getElementById('agenda-corpo').innerText;
  return { c: c.replace(/\s+/g, ' '), a: a.replace(/\s+/g, ' '),
           linhas: document.querySelectorAll('.con-linha').length };
});
conferir(/Nenhum atendimento registrado/i.test(vazio.c) && vazio.linhas === 0,
  'sem paciente, nao inventa consulta');
conferir(/Nenhuma consulta esta semana/i.test(vazio.a) && /livre neste período/i.test(vazio.a),
  'sem nada marcado, a agenda diz que está livre');

/* ---------------------------------------------- uma carteira de verdade -- */

const ids = await p.evaluate(async (respostas) => {
  const novo = async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    await new Promise(x => setTimeout(x, 300));
    return window.pacienteAtivoId();
  };
  const sentido = {}; HOLOSCAN.questionario().forEach(q => sentido[q.id] = q.sentido);
  const variar = n => respostas.map(x => ({ marcador_id: x.marcador_id,
    intensidade: sentido[x.marcador_id] === 'invertido'
      ? Math.min(3, Math.max(0, x.intensidade + n))
      : Math.max(0, Math.min(3, x.intensidade - n)) }));

  const dias = n => {
    const d = new Date(); d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  /* Reaplicar no mesmo dia SUBSTITUI — e e assim que tem que ser, senao um
     ajuste de resposta viraria duas consultas. Entao a data de cada aplicacao
     e acertada antes da proxima, e nao todas no fim. */
  const datar = (pid, i, quando) => {
    const h = JSON.parse(localStorage.getItem('holohacking.pontuacao'));
    h[pid][i].quando = quando;
    localStorage.setItem('holohacking.pontuacao', JSON.stringify(h));
  };

  // Marina: duas aplicacoes, a segunda melhor — ha evolucao para mostrar
  const marina = await novo('Marina Alves');
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  window.aplicarPontuacao(HOLOSCAN.calcular(respostas));
  datar(marina, 0, dias(-40));
  window.aplicarPontuacao(HOLOSCAN.calcular(variar(2)));
  datar(marina, 1, dias(-20));       // +28 = daqui a 8 dias -> "mais adiante"

  // Carla: uma aplicacao velha — a reavaliacao dela ja venceu
  const carla = await novo('Carla Souza');
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  window.aplicarPontuacao(HOLOSCAN.calcular(variar(1)));
  datar(carla, 0, dias(-60));        // +28 = 32 dias atras  -> vencida

  // Sofia: cadastrada e nada feito — nao tem data nenhuma
  const sofia = await novo('Sofia Martins');

  return { marina, carla, sofia };
}, caso.respostas);

/* ------------------------------------------------------- consultas ------- */

const con = await p.evaluate(() => {
  document.querySelector('.nav-item[data-secao="consultas"]').click();
  return {
    linhas: [...document.querySelectorAll('.con-linha')].map(l => ({
      dia: l.querySelector('.con-dia').textContent,
      nome: l.querySelector('.con-quem b').textContent,
      detalhe: l.querySelector('.con-detalhe').textContent,
      indice: l.querySelector('.con-indice').textContent.replace(/Índice/, '').trim(),
      variacao: l.querySelector('.con-var')?.textContent || null,
    })),
    tiles: [...document.querySelectorAll('.dash-tile')].map(t =>
      t.querySelector('b').textContent + ' ' + t.querySelector('span').textContent),
    meses: [...document.querySelectorAll('.dash-titulo')].map(t => t.textContent.trim()),
  };
});

conferir(con.linhas.length === 3,
  'tres aplicacoes viraram tres consultas: ' + con.linhas.length);
conferir(con.linhas[0].nome === 'Marina Alves' && /2ª/.test(con.linhas[0].detalhe),
  'a mais recente vem primeiro: ' + con.linhas[0].nome + ' / ' + con.linhas[0].detalhe);
conferir(con.linhas[2].nome === 'Carla Souza',
  'a mais antiga vem por ultimo: ' + con.linhas[2].nome);
/* Etapa 0 da V1: sem variacao calculada entre aplicacoes (comparabilidade
   nao homologada, Mestre §19). Correcao P0 (pos-deploy 6.4, mudanca de contrato
   documentada): o selo de cada linha diz a PROVENIENCIA da aplicacao — estas,
   sem pacote metodologico, levam "Aplicação histórica sem pacote metodológico V1"
   (antes: "Em homologação" para tudo, falso depois da aprovacao do HOLOS-V1@2). */
conferir(con.linhas.every(l => l.variacao !== null && /Aplicação histórica sem pacote metodológico V1/.test(l.variacao) && !/[+-]\d/.test(l.variacao)),
  'nenhuma linha inventa "o quanto andou"; todas levam o selo: ' + con.linhas[0].variacao);
conferir(con.linhas.every(l => /mais baixos:/.test(l.detalhe)),
  'cada linha diz quais sistemas pesaram');
/* V1 Etapa 1: aplicacao do HOLOSCAN nao e atendimento — o tile diz o que conta */
conferir(con.tiles.some(t => /^3 aplicações do HOLOSCAN/.test(t)) && !con.tiles.some(t => /^\d+ atendimentos?$/.test(t)),
  'conta aplicações do HOLOSCAN, não "atendimentos": ' + (con.tiles.find(t => /aplicaç/.test(t)) || '—'));
conferir(con.tiles.some(t => /^1 voltou para reavaliar/.test(t)),
  'conta quem voltou: ' + (con.tiles.find(t => /voltou|voltaram/.test(t)) || '—'));

/* ---------------------------------------------------------- agenda ------- */

/* A agenda virou calendário: o que era lista de retornos agora é grade de
   horas com consultas e bloqueios. As regras dela estão em
   testar-calendario.mjs — aqui só se confere que a seção abre. */
const age = await p.evaluate(() => {
  document.querySelector('.nav-item[data-secao="agenda"]').click();
  return {
    ativa: document.getElementById('secao-agenda').classList.contains('ativa'),
    temBarra: !!document.querySelector('.cal-barra'),
    vistas: [...document.querySelectorAll('.cal-vistas [data-vista]')].map(b => b.textContent),
  };
});
conferir(age.ativa && age.temBarra, 'a agenda abre pelo menu');
conferir(age.vistas.join(',') === 'Dia,Semana,Mês',
  'com as três formas de ver o período: ' + age.vistas.join(' · '));

/* ------------------------------------------------------ documentos ------- */
/* 09/10: a secao global "Documentos" saiu do menu. Documento se acessa SO pela
   ficha do paciente (aba Documentos): cada ficha mostra os arquivos daquela pessoa. */
const semMenu = await p.evaluate(() => ({
  nav: !!document.querySelector('.nav-item[data-secao="documentos"]'),
  secao: !!document.getElementById('secao-documentos'),
  script: [...document.scripts].some(s => /documentos\.js/.test(s.src)),
}));
conferir(!semMenu.nav && !semMenu.secao && !semMenu.script,
  'nao ha secao Documentos no menu nem documentos.js carregado');

// dois arquivos, de dois pacientes diferentes
await p.evaluate(async (ids) => {
  const fazer = (nome, texto, mime) =>
    new File([texto], nome, { type: mime });
  await window.ArquivoStore.salvar(ids.marina, fazer('hemograma.pdf', '%PDF-1.4 marina', 'application/pdf'),
    { nome: 'hemograma.pdf', titulo: 'Hemograma completo', tipo: 'Exame', data: '2026-09-01' });
  await window.ArquivoStore.salvar(ids.carla, fazer('laudo.txt', 'laudo da carla', 'text/plain'),
    { nome: 'laudo.txt', titulo: 'Laudo do endocrinologista', tipo: 'Laudo', data: '2026-08-15' });
}, ids);

const naFicha = (id) => p.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid);
  await new Promise(r => setTimeout(r, 600));
  return [...document.querySelectorAll('#aba-documentos .bib-item')].map(it => ({
    titulo: it.querySelector('.bib-titulo').textContent,
    tipo: it.querySelector('.doc-tipo').textContent,
    meta: it.querySelector('.bib-meta').innerText.replace(/\s+/g, ' '),
  }));
}, id);
const deMarina = await naFicha(ids.marina);
const deCarla = await naFicha(ids.carla);
conferir(deMarina.length === 1 && deMarina[0].titulo === 'Hemograma completo' && /01\/09\/2026/.test(deMarina[0].meta),
  'a ficha de Marina mostra so o arquivo dela, com a data: ' + JSON.stringify(deMarina));
conferir(deCarla.length === 1 && deCarla[0].titulo === 'Laudo do endocrinologista' && deCarla[0].tipo === 'Laudo',
  'a ficha de Carla mostra so o arquivo dela: ' + JSON.stringify(deCarla));
conferir(deMarina.every(i => /B|KB|MB/.test(i.meta)) && deCarla.every(i => /B|KB|MB/.test(i.meta)),
  'mostra o tamanho do arquivo');

// --- arquivar tira da lista e NAO apaga (decisao 09/10) ---
const removido = await p.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid);
  await new Promise(r => setTimeout(r, 600));
  document.querySelector('#aba-documentos [data-arquivar]').click();
  await new Promise(r => setTimeout(r, 150));
  document.getElementById('modal-confirmar-ok').click();   // rodada 08: confirma no modal
  await new Promise(r => setTimeout(r, 600));
  const naTela = document.querySelectorAll('#aba-documentos .bib-item').length;
  const noBanco = (await window.ArquivoStore.listarTudo()).length;
  return { naTela, noBanco };
}, ids.marina);
conferir(removido.naTela === 0 && removido.noBanco === 2,
  'arquivar tira da lista da ficha e NAO apaga: ' + removido.noBanco + ' continuam guardados');

/* --------------------------------------------------------------- fim ----- */
console.log('');
ok(ruim.length === 0, ruim.length ? 'ERRO DE JS: ' + ruim[0] : 'sem erro de JS');
if (ruim.length) falhou = true;
await nav.close();
process.exit(falhou ? 1 : 0);
