/**
 * RESULTADO DAS FERRAMENTAS (motor de resultados V1, 12/10, itens 16-27 e 39; testes 17-29 do item 41).
 * Parte 1 (Node): o contrato de FerramentasFechamento.resultado() — o que apareceu / o que significa / o que pode mudar /
 * proximo passo — com os textos literais do pedido; sem score, sem classificacao, sem causa, sem Conduta.
 * Parte 2 (navegador): o snapshot ficticio com as 9 ferramentas (testes/golden/rf1-fixture.json) desenhado pelo
 * Resultado HOLOS atual — "Resultado da ferramenta" separado do "Registro da ferramenta" e da "Leitura da nutricionista";
 * a paciente nao ve formulario inteiro, nomes de terceiros, texto da Carta nem "verdadeiro motivo".
 */
import './guarda-falhas.mjs';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
require('../ferramentas-fechamento.js');
const FF = globalThis.FerramentasFechamento;

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const R = (id, respostas, extra) => Object.assign({ ferramenta_id: id, id: 'id-' + id, status: 'concluida', concluida_em: '2026-10-12T14:00:00.000Z', respostas }, extra || {});
const tudo = x => JSON.stringify(x);
const rotulos = x => x.apareceu.map(i => i.rotulo);
const CONDUTA = /objective|nutrition_strategy|actions|return_plan|conduta|prescri/i;

const oq3 = R('oq3', { quer: 'QUER', precisa: 'PRECISA', consegue: 'CONSEGUE', alavancas: 'ALAVANCA' });
const pqq = R('pqq', { objetivo: 'OBJ', r1: 'N1', r2: 'N2', r3: 'N3', verdadeiro: 'SINTESE' });
const so = [oq3];
const ambos = [oq3, pqq];

/* 18. OQ3 */
const xo = FF.resultado(oq3, so), xo2 = FF.resultado(oq3, ambos);
ok(rotulos(xo).join('|') === 'O que a pessoa quer|O que precisa ser considerado|O que ela consegue sustentar agora|Possíveis alavancas'
  && xo.muda === 'O planejamento da etapa deve considerar simultaneamente desejo, necessidade e capacidade atual.' && xo.significa === null,
  'OQ³: quer / precisa / consegue / alavancas + "o que isso muda" literal; "significa" sem texto aprovado = pendência');
ok(!/score|pontua|alinhad|desalinhad|\d+\s*%|nota/i.test(tudo(xo2)) && xo.proximo === null && xo2.proximo === 'Mapa do Propósito disponível como aprofundamento opcional.',
  'teste 18: OQ³ sem score nem "alinhado/desalinhado"; Mapa do Propósito só quando o PQQ também está no resultado');

/* 19. Momentum */
const mom = R('linha_momentum', { energia: 2, carga: 9, controle: 2, suporte: 1, espaco: 2, estabilidade: 1, sustenta: 'S', limita: 'L', nao_pedir: 'N', justificativa_estado: 'JUST' });
const xm = FF.resultado(mom, []), xm2 = FF.resultado(Object.assign({}, mom, { respostas: Object.assign({}, mom.respostas, { estado_confirmado: 'construir' }) }), []);
ok(xm.estado === null && /não registrado/.test(xm.apareceu[0].valor) && xm2.estado === 'Construir',
  'teste 19: Momentum sem algoritmo — dimensões extremas sem estado escolhido NÃO geram estado; só o escolhido pela nutricionista aparece');
ok(rotulos(xm2).includes('Fatores que sustentam') && rotulos(xm2).includes('Fatores que limitam') && rotulos(xm2).includes('O que evitar nesta etapa')
  && xm2.apareceu.find(i => i.rotulo === 'Justificativa da nutricionista').so_profissional === true
  && xm2.muda === 'Este estado ajuda a calibrar a exigência e a quantidade de mudanças propostas nesta etapa.'
  && xm2.pendencias.some(p => /banco de estados em rascunho/.test(p)) && !CONDUTA.test(tudo(xm2)),
  'Momentum: sustenta/limita/evitar, justificativa só profissional, texto do estado = PENDÊNCIA (banco em rascunho), nenhuma Conduta');

/* 20. Rotina */
const rot = R('mapa_rotina_v1', { acorda: '06:00', dorme: '23:00', trabalho: 'escritório', dificuldade: '16h', disponiveis: 'manhã', espacos: 'lanche', eventos: [{ inicio: '07:00', titulo: 'Café' }] }, { leitura: 'LEITURA_DA_NUTRI' });
const xr = FF.resultado(rot, []);
ok(rotulos(xr).join('|') === 'Rotina atual|Momentos de maior dificuldade|Momentos disponíveis|Oportunidades / espaços para mudança' && xr.leitura_nutri === 'LEITURA_DA_NUTRI'
  && xr.muda === 'Essas informações ajudam a escolher mudanças que realmente caibam na rotina atual.' && xr.proximo === null && !/coma|inclua|reduza|substitua|dieta|card[aá]pio/i.test(tudo(xr)),
  'teste 20: Rotina factual, sem ação nutricional automática; leitura da nutricionista separada');

/* 21. PQQ */
const xp = FF.resultado(pqq, ambos);
ok(rotulos(xp).join('|') === 'Objetivo declarado|O que foi ganhando importância ao longo do PQQ|Síntese construída com a paciente' && xp.apareceu[1].valor === 'N1 → N2 → N3'
  && !/verdadeiro motivo/i.test(tudo(xp)) && xp.muda === 'Essa síntese pode ajudar a manter as mudanças conectadas ao significado que a própria paciente atribui ao objetivo.'
  && xp.proximo === 'Mapa do Propósito disponível como aprofundamento opcional.' && FF.resultado(pqq, [pqq]).proximo === null,
  'teste 21: PQQ sem "verdadeiro motivo" (síntese construída com a paciente); o que ganhou importância = só os níveis registrados; sem PQQ → Crenças/Gatilhos');

/* 22. Crencas */
const xc = FF.resultado(R('mapa_crencas', { crencas: 'comer à noite engorda', origem: 'mãe', mais_atrapalha: 'culpa', alternativa: 'jantar com calma' }), []);
ok(rotulos(xc).join('|') === 'Crença registrada|Origem percebida|Crença que mais dificulta|Alternativa construída' && xc.proximo === null
  && !/irracional|limitante|disfuncional|categoria|tipo de crença|distorç/i.test(tudo(xc)),
  'teste 22: Crenças só com os campos que existem; sem classificação, taxonomia nem "irracional"; sem próximo passo automático');

/* 23. Gatilhos */
const xg = FF.resultado(R('gatilhos_respostas_v1', { contexto: 'fim do dia', gatilho: 'cansaço', pensamento: 'mereço', emocao: 'ansiedade', intensidade: 7, resposta: 'come doce',
  consequencia_imediata: 'alívio', necessidade: 'descanso', alternativa: 'chá', observacao_nutri: 'OBS' }), []);
ok(xg.apareceu.filter(i => i.elo).map(i => i.rotulo).join(' ↓ ') === 'Situação ↓ Gatilho ↓ Pensamento / emoção relatada ↓ Resposta / comportamento ↓ Consequência percebida ↓ Necessidade / recurso ↓ Alternativa'
  && xg.muda === 'A sequência ajuda a tornar observável o que acontece antes e depois de determinado comportamento.'
  && xg.pendencias.some(p => /Ponto de intervenção/.test(p)) && !/causa|porque|corpo|sintoma|inflama/i.test(xg.apareceu.map(i => i.rotulo).join(' ')) && xg.proximo === null,
  'teste 23: Gatilhos — cadeia SITUAÇÃO→…→ALTERNATIVA, sem elo corporal nem causa; "ponto de intervenção" = PENDÊNCIA');

/* 24. Proposito */
ok(FF.resultadoProposito(so) === null && FF.resultadoProposito([pqq]) === null && FF.resultadoProposito(ambos).fontes.map(f => f.id).join() === 'id-oq3,id-pqq'
  && rotulos(FF.resultadoProposito(ambos)).join('|') === 'O que eu quero|Por que isso importa|O que consigo sustentar agora'
  && !/Direção/.test(JSON.stringify(FF.resultadoProposito(ambos).apareceu)),
  'teste 24: Mapa do Propósito só deriva de OQ³ + PQQ, com a referência das duas aplicações fonte; sem bloco "Direção desta etapa" (13/10)');
const der = { motor: 'MR-V1', fontes: [{ ferramenta_id: 'oq3', id: 'X1' }, { ferramenta_id: 'pqq', id: 'X2' }], campos: { quer: 'Q_CONGELADO', importa: 'I', sustenta: 'S', direcao: 'D' } };
const xpr = FF.resultadoProposito(ambos, der);
ok(xpr.apareceu[0].valor === 'Q_CONGELADO' && xpr.fontes[0].id === 'X1' && xpr.derivado_agora === false && FF.resultadoProposito(ambos).derivado_agora === true,
  'item 39: template 4 usa a versão derivada congelada no snapshot; resultado antigo é derivado agora e marcado como tal');

/* 25. Roda */
const xd = FF.resultado(R('roda_vida', { saude: 4, relacoes: 7, trabalho: 5, financas: 6, espiritualidade: 8, lazer: 3, desenvolvimento: 6, proposito: 7 }), []);
ok(xd.apareceu[0].rotulo === 'Áreas percebidas como mais cuidadas' && xd.apareceu[0].valor === 'Espiritualidade' && xd.apareceu[1].valor === 'Lazer'
  && !/m[eé]dia|5,75|5\.75|total|global/i.test(tudo(xd)) && xd.muda === 'Essa percepção ajuda a escolher quais áreas merecem atenção neste momento.',
  'teste 25: Roda — mais e menos cuidadas, sem média global; "área escolhida" não é inventada');

/* 26. Carta */
const xca = FF.resultado(R('carta_futuro', { carta: 'CARTA_INTIMA', para_quando: '2027-01-01' }), []);
ok(!/CARTA_INTIMA/.test(tudo(xca)) && xca.apareceu[0].valor === 'A Carta ao Futuro Eu foi realizada como exercício de reflexão sobre identidade, direção e cuidado futuro.'
  && !/identidade:|compromisso|promessa/i.test(tudo(xca).replace('reflexão sobre identidade, direção', '')),
  'teste 26: Carta — texto aprovado, nunca o conteúdo; nada extraído (identidade, compromisso, promessa)');

/* 27. Conexao */
const xx = FF.resultado(R('conexao_pertencimento_v1', { contar: 'Irmã Ficticia', pertence: 'grupo de corrida', espiritualidade: 'ESP', vinculos: [{ rotulo: 'Irmã Ficticia', papel: 'apoia' }, { rotulo: 'Colega Ficticio', papel: 'dificulta' }] }), []);
const pacX = xx.apareceu.filter(i => !i.so_profissional);
ok(!/Ficticia|Ficticio|ESP/.test(tudo(pacX)) && /1 de 2 vínculos/.test(pacX[0].valor) && xx.apareceu.some(i => i.so_profissional && /Ficticia/.test(i.valor))
  && xx.muda === 'Essas informações ajudam a compreender quais recursos de apoio estão disponíveis durante o processo.' && !/score|pontua|nota/i.test(tudo(xx)),
  'teste 27: Conexão — na paciente só contagem (sem nomes de terceiros) e sem espiritualidade sem autorização; sem score');

/* 28-29. nenhuma ferramenta escreve Conduta */
const todos = [xo2, xm2, xr, xp, xc, xg, xd, xca, xx, FF.resultadoProposito(ambos)];
ok(todos.every(x => x.motor === 'MR-V1' && !('conduta' in x) && !CONDUTA.test(Object.keys(x).join(' '))),
  'testes 28-29: todo resultado é versionado (MR-V1) e nenhum gera campo de Conduta (a Conduta continua manual)');

/* ---------- parte 2: navegador ---------- */
const fx = JSON.parse(readFileSync(new URL('./golden/rf1-fixture.json', import.meta.url), 'utf8'));
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const P = await nav.newPage();
const errosJS = [];
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, criarServidor());
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.ResultadoHolos && window.FerramentasFechamento && window.CATALOGO_FERRAMENTAS, { timeout: 15000 });
const d = await P.evaluate((snap) => {
  const div = document.createElement('div'); document.body.appendChild(div);
  div.innerHTML = window.ResultadoHolos.documentoHtml(snap, 'paciente', {});
  const pac = div.innerText, pacHtml = div.innerHTML;
  div.innerHTML = window.ResultadoHolos.documentoHtml(snap, 'profissional', {});
  const prof = div.innerText, nRes = div.querySelectorAll('.rf-caixa').length, nReg = div.querySelectorAll('details.rh-registro').length;
  const leitura = !!div.querySelector('.rf-leitura');
  const ordemProf = [...div.querySelectorAll('section > h3')].map(h => h.textContent.trim());
  div.innerHTML = window.ResultadoHolos.documentoHtml(snap, 'paciente', { blocos: { foco: '<p>FOCO_CONDUTA</p>', combinado: '<p>COMBINADO_CONDUTA</p>', observar: '<p>RETORNO_CONDUTA</p>' }, semRodape: true });
  const ordemPac = [...div.querySelectorAll('section > h3')].map(h => h.textContent.trim()), rodapes = div.querySelectorAll('footer').length;
  div.remove();
  return { pac, pacHtml, prof, nRes, nReg, leitura, ordemProf, ordemPac, rodapes };
}, fx.resultado.content_snapshot);
ok(d.nRes >= 9 && d.nReg >= 9 && /Resultado da ferramenta/i.test(d.prof) && /Registro da ferramenta/i.test(d.prof) && d.leitura && /Leitura da nutricionista/i.test(d.prof),
  'teste 17: "Resultado da ferramenta" separado do "Registro da ferramenta" (recolhido) e da "Leitura da nutricionista"');
ok(/Mapa do Propósito/.test(d.prof) && /derivado de OQ³/.test(d.prof) && /Gerado com o motor de resultados atual a partir do registro histórico/.test(d.prof),
  'Mapa do Propósito pelo resultado derivado; resultado antigo (template 3) rotulado como registro histórico');
ok(!/CARTA_INTIMA_NAO_MOSTRAR|Irmã Ficticia|Colega Ficticio|verdadeiro motivo|JUSTIFICATIVA_SO_PROFISSIONAL|OBS_SO_PROFISSIONAL|Pendências metodológicas|Registro da ferramenta/i.test(d.pac)
  && !/rh-visual|rh-registro/.test(d.pacHtml) && /Síntese construída com a paciente/.test(d.pac) && /A Carta ao Futuro Eu foi realizada como exercício/.test(d.pac),
  'paciente: só o resultado — sem formulário inteiro/desenho, sem nomes de terceiros, sem o texto da Carta, sem "verdadeiro motivo", sem pendências');
ok(d.ordemProf.join(' | ') === 'Resumo para decisão | Por que o sistema chegou a isso | Resultados das ferramentas | Síntese HOLOS | Leitura profissional — observações da nutricionista | Conduta',
  'item 30: visão profissional na ordem conclusão → evidência → ferramentas → síntese → leitura → Conduta (vínculo) — ' + d.ordemProf.join(' | '));
ok(d.ordemPac.join(' | ') === 'O que entendemos nesta etapa | Áreas para aprofundar | O que descobrimos com as ferramentas | Nosso foco agora | O que ficou combinado | O que observar até o próximo encontro | Detalhes do mapa'
  && d.rodapes === 0, 'item 31: visão da paciente em 8 blocos (Seu Mapa HOLOS no cabeçalho; detalhes do mapa por último) e sem rodapé no meio quando a página Resultado põe o seu — ' + d.ordemPac.join(' | '));
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nresultado das ferramentas: tudo ok');
process.exit(falhou ? 1 : 0);
