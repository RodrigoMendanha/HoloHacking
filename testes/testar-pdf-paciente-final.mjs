/**
 * PDF DO PACIENTE — REFINO FINAL (15/10). Documento da paciente = produto final da consulta: simples e aplicável.
 *   ORDEM     momento → compreendendo → foco → trabalhar → plano (+ combinamos) → C/M/E → observe → próxima etapa → mapa → ferramentas
 *   FORA      nada técnico: "Por que" técnico, "Para que"/critério de sucesso, classificação, status de estratégia, catálogo, IDs, hipótese
 *   LIMITES   1-3 direcionamentos, 3-5 itens de "observe", 2 por território; foco = 1 frase
 *   PLANO     O que fazer / Quando-com que frequência (só com dado real; nunca classificação) / O que observar / Até quando
 *   COMBINAMOS só o que foi acordado (estratégia acordada/em teste/manter/ajustar + acordos), nunca proposta nova da Holos IA
 *   TERR      território sem material: "Ainda não aprofundado nesta etapa."
 *   RETORNO   o que mudou (foco anterior, avanços, o que ainda pesa), o que foi possível fazer, manter/ajustar, novo foco
 *   7 PERG.   o documento responde: por que acompanhamento, o que apareceu, foco, o que fazer, quando, o que observar, o que vamos avaliar
 *   PDF       caso longo e retorno viram PDF de verdade (html2pdf): nº de páginas dentro da meta, sem cartão cortado
 * PDF_DIR=<pasta> grava os PDFs (caso longo e retorno).
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { existsSync, writeFileSync } from 'node:fs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const H2P_LOCAL = '/tmp/claude-0/-home-user-HoloHacking/2536f0de-9516-5291-b095-34b766c5940f/scratchpad/h2p/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js';
const it = (texto, extra) => Object.assign({ texto, origem: 'nutricionista' }, extra || {});
const LONGO = 'Texto ficticio propositalmente longo para conferir a quebra de linha e de pagina no documento da paciente, sem cortar nada nem sair da caixa. ';
const PRIMEIRA = {
  tipo: 'primeira',
  momento: [it('Você chegou ao acompanhamento trazendo: cansaço fictício no fim da tarde.')],
  dores: [it('O que mais tem incomodado: fome forte à noite.'), it(LONGO + LONGO)],
  desejos: [it('Seu principal objetivo: mais disposição à tarde.')],
  padroes: [it('A fome e o cansaço aparecem juntos no fim da tarde.'), it('As reuniões da tarde coincidem com o horário mais difícil.')],
  foco_atual: it('Organizar a alimentação da tarde para acompanhar fome e energia.'),
  direcionamentos: [
    it('Organizar a tarde', { id: 'd1', porque: 'POR_QUE_TECNICO_LONGO com Metabólico e REC-MET-01', objetivo: 'Criar uma rotina possível nesse período. Segunda frase que não entra.' }),
    it('Entender o beliscar noturno', { id: 'd2', porque: 'Observar em quais situações aparece.' }),
    it('Cuidar do sono', { id: 'd3', objetivo: 'Perceber o que é possível ajustar.' }),
    it('QUARTO_DIRECIONAMENTO_FORA', { id: 'd4', objetivo: 'não entra (máximo 3)' })],
  estrategias: [
    it('Lanche da tarde', { id: 'e1', direcionamento_id: 'd1', acao: 'Levar o lanche de casa e comer entre 15h30 e 16h.', contexto: 'Nos dias úteis', observar: 'Energia à tarde e fome no jantar.', prazo: 'Até o próximo retorno', finalidade: 'Critério de sucesso: CRITERIO_FORA', status: 'acordada' }),
    it('Registro do beliscar', { id: 'e2', direcionamento_id: 'd2', acao: 'Anotar quando o beliscar aparece.', contexto: 'Comportamental/metodológica', observar: 'Situações e horários.', status: 'proposta' }),
    it('Estratégia longa', { id: 'e3', acao: LONGO + LONGO + LONGO, observar: LONGO, prazo: '2 semanas', status: 'em_teste' })],
  corpo: { itens: [it('Organizar a tarde e acompanhar fome e energia.'), it('Observar o sono.'), it('TERCEIRO_ITEM_CORPO_FORA')] },
  mente: { itens: [] },
  espirito: { itens: [it('Fortalecer autonomia e cuidado de si.')] },
  acordos_compartilhados: [it('Fazer o ritual de descanso antes de dormir.')],
  observar: ['fome no fim da tarde', 'energia', 'vontade de beliscar', 'sono', 'o que facilita os combinados', 'SEXTO_OBSERVAR_FORA'].map(t => it(t)),
  proxima_etapa: null
};
const RETORNO = {
  tipo: 'retorno',
  momento: [it('Você contou que a semana foi corrida.')], avancos: [it('Conseguiu levar o lanche em 4 de 5 dias.')], permaneceu: [it('O beliscar noturno ainda aparece.')],
  acompanhamento_estrategias: [
    { texto: 'Lanche da tarde', aplicou: 'Conseguiu em 4 de 5 dias.', facilitou: 'Preparar na noite anterior.', percepcao: 'Mais energia às 17h.', decisao: 'manter' },
    { texto: 'Registro do beliscar', aplicou: 'Registrou 2 vezes.', dificultou: 'Esquecer de anotar.', decisao: 'ajustar' }],
  padroes: [], foco_atual: it('Manter o lanche e entender o beliscar.'),
  direcionamentos: [it('Entender o beliscar noturno', { id: 'd2', objetivo: 'Registrar de um jeito mais simples.' })],
  estrategias: [it('Registro simples', { id: 'e9', acao: 'Marcar só um X no dia em que beliscar.', observar: 'Em que dias acontece.', status: 'acordada' })],
  corpo: { itens: [] }, mente: { itens: [it('Perceber o que vem antes do beliscar.')] }, espirito: { itens: [] },
  observar: [it('dias em que o beliscar aparece')], proxima_etapa: it('No próximo encontro vamos ver se o registro simples ajudou.')
};
const CAMINHO = [{ atendimento_em: '2026-10-01T12:00:00Z', foco: { texto: 'Organizar a alimentação da tarde.' }, avancos: [] }];

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1280, height: 1000 });
const errosJS = []; P.on('pageerror', e => errosJS.push(e.message));
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForFunction(() => !!(window.ResultadoDirecao && window.ResultadoPagina), { timeout: 10000 });

const render = (dp, caminho) => P.evaluate((dp, caminho) => {
  const div = document.createElement('div'); div.innerHTML = window.ResultadoDirecao.htmlPaciente(dp, caminho, { nome: 'Paciente Ficticia PDF', data: '15/10/2026' });
  return { html: div.innerHTML, txt: div.textContent.replace(/\s+/g, ' '), titulos: [...div.querySelectorAll('.pf-tit')].map(h => h.textContent.trim()),
    dirs: div.querySelectorAll('.pf-dir').length, observe: div.querySelectorAll('#pf-observar li').length, corpo: div.querySelectorAll('.pf-terr-corpo li').length,
    cards: [...div.querySelectorAll('#pf-plano .pf-card')].map(c => c.textContent.replace(/\s+/g, ' ')),
    comb: [...div.querySelectorAll('#pf-combinamos li')].map(l => l.textContent.trim()), foco: [...div.querySelectorAll('.pf-foco-txt')].length };
}, dp, caminho);

const a = await render(PRIMEIRA, []);
const ORDEM = ['Seu momento agora', 'O que estamos compreendendo', 'Foco desta fase', 'O que vamos trabalhar agora', 'Seu plano até a próxima consulta', 'Nesta fase, combinamos',
  'Corpo · Mente · Espírito', 'Até o próximo encontro, observe', 'Próxima etapa'];
ok(JSON.stringify(a.titulos) === JSON.stringify(ORDEM), 'ORDEM: ' + a.titulos.join(' → '));
ok(!/POR_QUE_TECNICO|REC-MET|CRITERIO_FORA|Critério de sucesso|Comportamental\/metodológica|Para que|Por que|ACORDADA|Proposta|classifica|catalog|hipótese|candidat/i.test(a.txt),
  'FORA: sem "Por que" técnico, critério de sucesso, classificação, status, catálogo, IDs, hipótese');
ok(a.dirs === 3 && !/QUARTO_DIRECIONAMENTO_FORA/.test(a.txt) && /Criar uma rotina possível nesse período\./.test(a.txt) && !/Segunda frase que não entra/.test(a.txt) && /Observar em quais situações aparece\./.test(a.txt),
  'LIMITES: no máximo 3 direcionamentos, cada um com título + uma frase (objetivo; sem objetivo, a frase curta)');
ok(a.observe === 5 && !/SEXTO_OBSERVAR_FORA/.test(a.txt) && a.corpo === 2 && !/TERCEIRO_ITEM_CORPO_FORA/.test(a.txt) && a.foco === 1, 'LIMITES: 5 itens em "observe", 2 por território, 1 foco');
ok(/O que fazer ?Levar o lanche de casa e comer entre 15h30 e 16h\./.test(a.cards[0]) && /Quando \/ com que frequência ?Nos dias úteis/.test(a.cards[0]) && /O que observar ?Energia à tarde/.test(a.cards[0]) && /Até quando ?Até o próximo retorno/.test(a.cards[0]),
  'PLANO: O que fazer · Quando/frequência (dado real) · O que observar · Até quando');
ok(!/com que frequência/.test(a.cards[1]) && !/Comportamental/.test(a.cards[1]), 'PLANO: classificação técnica nunca aparece como frequência (o campo some)');
ok(a.comb.length === 3 && a.comb.some(c => /Levar o lanche de casa/.test(c)) && a.comb.some(c => /ritual de descanso/.test(c)) && !a.comb.some(c => /Anotar quando o beliscar/.test(c)),
  'COMBINAMOS: estratégias acordadas/em teste + acordos; a proposta nova não aparece como combinada — ' + a.comb.map(c => c.slice(0, 40)).join(' | '));
ok(/Mente.*Ainda não aprofundado nesta etapa\./.test(a.txt), 'TERR: território sem material = "Ainda não aprofundado nesta etapa."');
ok(/Na próxima consulta vamos revisar o que aconteceu com essas estratégias/.test(a.txt) && /O plano pode evoluir/.test(a.txt), 'PRÓXIMA ETAPA: frase padrão quando não registrada; o plano pode evoluir');
/* 7 perguntas de compreensão */
const resp = {
  'por que estou fazendo acompanhamento': /O que você trouxe.*cansaço fictício/i.test(a.txt),
  'o que apareceu na consulta': /O que estamos compreendendo.*fome e o cansaço aparecem juntos/.test(a.txt),
  'qual meu foco agora': /Foco desta fase.*Organizar a alimentação da tarde/.test(a.txt),
  'o que preciso fazer': /O que fazer/.test(a.txt),
  'quando preciso fazer': /Quando \/ com que frequência/.test(a.txt),
  'o que preciso observar': /Até o próximo encontro, observe/.test(a.txt),
  'o que vamos avaliar no retorno': /Próxima etapa.*revisar/.test(a.txt) };
ok(Object.values(resp).every(Boolean), '7 PERGUNTAS respondidas: ' + Object.entries(resp).map(([k, v]) => (v ? '✓ ' : '✗ ') + k).join(' · '));

const r = await render(RETORNO, CAMINHO);
ok(/O que mudou desde o último encontro/.test(r.txt) && /Foco do encontro anterior.*Organizar a alimentação da tarde/.test(r.txt) && /Conseguiu levar o lanche em 4 de 5 dias/.test(r.txt) && /O que ainda pesa/.test(r.txt)
  && /O que foi possível fazer/.test(r.txt) && /Decisão: Manter/.test(r.txt) && /O que manter e o que ajustar.*Vamos manter.*Lanche da tarde.*Vamos ajustar.*Registro do beliscar/.test(r.txt) && /Novo foco desta fase/.test(r.txt),
  'RETORNO: o que mudou, o que foi possível fazer, manter/ajustar, novo foco');
ok(!/Seu momento agora/.test(r.txt) && r.titulos.indexOf('O que mudou desde o último encontro') === 0, 'RETORNO: não repete o primeiro documento (começa pelo que mudou)');

/* PDF de verdade (html2pdf, a mesma paginação do botão "Baixar PDF") */
if (existsSync(H2P_LOCAL)) await P.addScriptTag({ path: H2P_LOCAL }).catch(() => null);
const pdf = async (dp, caminho) => P.evaluate(async (dp, caminho) => {
  const corpo = document.getElementById('resultado-pagina-corpo');
  document.querySelectorAll('.secao').forEach(s => s.classList.remove('ativa')); document.getElementById('secao-resultado').classList.add('ativa');
  corpo.innerHTML = '<article class="rp-doc" id="rp-doc"><div class="rh-doc rh-doc-paciente rd-doc">' + window.ResultadoDirecao.htmlPaciente(dp, caminho, { nome: 'Paciente Ficticia PDF', data: '15/10/2026' }) + '</div></article>';
  window.pacienteAtivoId = () => 'pac-ficticia'; corpo.dataset.rpPid = 'pac-ficticia';
  if (typeof window.html2pdf !== 'function') return { erro: 'sem html2pdf' };
  try {
    const res = await window.ResultadoPagina.gerarPdf();
    const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return { b64: btoa(s), paginas: (s.match(/\/Type\s*\/Page[^s]/g) || []).length };
  } catch (e) { return { erro: e.message }; }
}, dp, caminho);
const p1 = await pdf(PRIMEIRA, []), p2 = await pdf(RETORNO, CAMINHO);
if (p1.erro || p2.erro) ok(/html2pdf/.test(p1.erro || p2.erro), 'PDF: gerador indisponível offline (' + (p1.erro || p2.erro) + ')');
else {
  ok(p1.paginas >= 2 && p1.paginas <= 5, 'PDF caso longo (textos longos, 3 estratégias, frequência, território vazio): ' + p1.paginas + ' páginas (meta 2 a 5)');
  ok(p2.paginas >= 1 && p2.paginas <= 4, 'PDF retorno: ' + p2.paginas + ' páginas');
  if (process.env.PDF_DIR) { writeFileSync(process.env.PDF_DIR + '/pdf-caso-longo.pdf', Buffer.from(p1.b64, 'base64')); writeFileSync(process.env.PDF_DIR + '/pdf-retorno.pdf', Buffer.from(p2.b64, 'base64')); }
}
ok(errosJS.length === 0, 'sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
