/**
 * V1 — ETAPA 3 — EVOLUCAO, TIMELINE E RELATORIOS NA TELA (Supabase falso, com conta)
 *
 *  EVOLUCAO
 *   - atendimento anterior x atual; duas datas escolhidas; nada inferido
 *   - revisao nao vira novo atendimento (timeline a liga ao original)
 *   - anamnese: novo / alterado / negado / sem informacao, sem julgamento
 *   - medidas: delta so com a mesma unidade; unidades diferentes bloqueiam
 *   - HOLOSCAN: lado a lado, sem delta de Indice
 *   - ferramentas e exames incompativeis: lado a lado, sem delta
 *   - acordos: estado anterior -> atual, sem indice de adesao
 *   - cache local nao sincronizado fora da timeline; rascunhos fora da Evolucao
 *  RELATORIOS
 *   - selecionar/remover fontes; previa rotulada; emitir; snapshot congelado
 *   - retificar; original acessivel; rascunho nunca "emitido"
 *   - metodologia nao homologada nao e resultado oficial; intimo nao vem marcado
 *   - falha do servidor: nada "emitido"
 *  CONTEXTOS: Visao geral, dashboard, HOLOS AI, exportacao
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign(
  { tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (t, dados) => q(UA, t, 'insert', { dados });
const rpc = (nome, payload) => srv.tratar({ op: 'rpc', uid: UA, nome, args: { payload } });
const ITEM = (campo, valor, extra) => Object.assign({ campo, valor, estado: 'informado', origem: 'relato_paciente' }, extra || {});

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctxNav = await nav.createBrowserContext();
const A = await ctxNav.newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);
await A.evaluate(() => { window.confirm = () => true; });

async function cadastrar(nome) {
  const id = await A.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 100)); const a = (window.pacientesTodos() || []).find(x => x.nome === nome); if (a) return a.id; }
    return null;
  }, nome);
  await esperar(200); return id;
}
const abrirAba = async (pid, aba) => A.evaluate(async (pid, aba) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="' + aba + '"]').click(); await new Promise(r => setTimeout(r, 400));
}, pid, aba);
const texto = (sel) => A.evaluate((sel) => (document.querySelector(sel) || {}).innerText || '', sel);
const recarregar = async () => {
  await A.reload({ waitUntil: 'networkidle2' });
  await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await esperar(500);
  await A.evaluate(() => { window.confirm = () => true; });
};
const mudarSelect = (sel, valor) => A.evaluate(async (sel, valor) => {
  const el = document.querySelector(sel); el.value = valor; el.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 250));
}, sel, valor);

const PA = await cadastrar('Paciente Um');
const PB = await cadastrar('Paciente Dois');

/* ---------------- cenario clinico no servidor (consolidado) ---------------- */
const E1 = rpc('criar_atendimento', { patient_id: PA, occurred_at: '2026-05-01T12:00:00.000Z', type: 'primeira consulta' }).data;
const E2 = rpc('criar_atendimento', { patient_id: PA, occurred_at: '2026-06-01T12:00:00.000Z', type: 'retorno' }).data;
const EB = rpc('criar_atendimento', { patient_id: PB, occurred_at: '2026-05-03T12:00:00.000Z' }).data;
const AN1 = rpc('salvar_anamnese', { encounter_id: E1, status: 'salvo', content: { dominios: {
  medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 80, unidade: 'kg', data: '2026-05-01' } }), ITEM('Altura', '', { origem: 'dado_medido', medida: { valor: 170, unidade: 'cm' } })] },
  alergias_informadas: { itens: [ITEM('Amendoim', '', { estado: 'desconhecido' })] },
  sintomas_relatados: { itens: [ITEM('Cansaço', 'ao acordar')] },
  emocional: { itens: [ITEM('Humor', 'SEGREDO_INTIMO')] } } } }).data;
// revisao documental da anamnese de E1 (rev. 2): corrige o sintoma, nao e novo atendimento
const AN1b = rpc('salvar_anamnese', { id: AN1, status: 'salvo', revision_note: 'correção', content: { dominios: {
  medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 80, unidade: 'kg', data: '2026-05-01' } }), ITEM('Altura', '', { origem: 'dado_medido', medida: { valor: 170, unidade: 'cm' } })] },
  alergias_informadas: { itens: [ITEM('Amendoim', '', { estado: 'desconhecido' })] },
  sintomas_relatados: { itens: [ITEM('Cansaço', 'ao acordar, todos os dias')] },
  emocional: { itens: [ITEM('Humor', 'SEGREDO_INTIMO')] } } } }).data;
const AN2 = rpc('salvar_anamnese', { encounter_id: E2, status: 'salvo', content: { dominios: {
  medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 78, unidade: 'kg', data: '2026-06-01' } }), ITEM('Altura', '', { origem: 'dado_medido', medida: { valor: 1.7, unidade: 'm' } })] },
  alergias_informadas: { itens: [ITEM('Amendoim', '', { estado: 'negado_explicitamente' })] },
  sono: { itens: [ITEM('Horas', '6h')] } } } }).data;
// rascunho em E2 com peso diferente: NUNCA entra na Evolucao
rpc('salvar_anamnese', { encounter_id: E2, status: 'rascunho', content: { dominios: { medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 70, unidade: 'kg' } })] } } } });
const CD1 = rpc('salvar_conduta', { encounter_id: E1, status: 'salvo', objective: 'Dormir melhor', return_plan: 'retorno em 4 semanas', agreements: [{ description: 'Jantar cedo', status: 'acordado' }, { description: 'Caminhar 3x', status: 'proposto' }] }).data;
const G1 = srv.linhas('agreements').find(g => g.conduct_id === CD1 && g.description === 'Jantar cedo').id;
const CD2 = rpc('salvar_conduta', { encounter_id: E2, status: 'salvo', objective: 'Manter o sono', previous_conduct_id: CD1, previous_decision: 'continuar',
  agreements: [{ description: 'Jantar cedo', status: 'encerrado', origin_agreement_id: G1 }, { description: 'Alongar à noite', status: 'acordado' }] }).data;
rpc('salvar_conduta', { encounter_id: E2, status: 'rascunho', objective: 'RASCUNHO NAO ENTRA' }); // rascunho de correcao sobre CD2? nao: nova conduta rascunho e recusada por unique; ignoramos erro
const holo = (eid, quando, indice) => srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_holoscan_completo', args: { payload: { application: { patient_id: PA, encounter_id: eid, quando, versao_estrutura: 2, indice, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: { respondidos: 10 + indice, total: 60 } }, answers: [], scores: [] } } }).data;
const H1 = holo(E1, '2026-05-01', 50), H2 = holo(E2, '2026-06-01', 60);
const T1 = insert('tool_applications', { patient_id: PA, encounter_id: E1, ferramenta_id: 'oq3', versao_ferramenta: 1, status: 'concluida', respostas: { quer: 'RESPOSTA_INTIMA' }, resultado: { total: 10 }, concluida_em: '2026-05-01T13:00:00.000Z', leitura: 'leitura E1' }).data[0].id;
const T2 = insert('tool_applications', { patient_id: PA, encounter_id: E2, ferramenta_id: 'oq3', versao_ferramenta: 2, status: 'concluida', respostas: { quer: 'x' }, resultado: { total: 12 }, concluida_em: '2026-06-01T13:00:00.000Z', leitura: 'leitura E2' }).data[0].id;
const R1 = insert('tool_applications', { patient_id: PA, encounter_id: E1, ferramenta_id: 'roda_vida', versao_ferramenta: 1, status: 'concluida', respostas: {}, resultado: { media: 5 }, concluida_em: '2026-05-01T14:00:00.000Z' }).data[0].id;
const R2 = insert('tool_applications', { patient_id: PA, encounter_id: E2, ferramenta_id: 'roda_vida', versao_ferramenta: 1, status: 'concluida', respostas: {}, resultado: { media: 6 }, concluida_em: '2026-06-01T14:00:00.000Z' }).data[0].id;
const coleta = (eid, data, resultados) => srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_coleta_exames', args: { payload: { collection: { patient_id: PA, encounter_id: eid, coletado_em: data, data_coleta_desconhecida: false, laboratorio: 'Lab' }, results: resultados } } }).data;
const C1 = coleta(E1, '2026-04-28', [{ exame_id: 'glicose', valor: 90, unidade_no_momento: 'mg/dL', nome_exame_no_momento: 'Glicose' }, { exame_id: 'hemoglobina', valor: 13, unidade_no_momento: 'g/dL', nome_exame_no_momento: 'Hemoglobina' }]);
const C2 = coleta(E2, '2026-05-28', [{ exame_id: 'glicose', valor: 5, unidade_no_momento: 'mmol/L', nome_exame_no_momento: 'Glicose' }, { exame_id: 'hemoglobina', valor: 12.5, unidade_no_momento: 'g/dL', nome_exame_no_momento: 'Hemoglobina' }]);
ok(E1 && E2 && AN1 && AN1b && AN2 && CD1 && CD2 && H1 && H2 && T1 && T2 && R1 && R2 && C1 && C2, 'cenario consolidado no servidor: 2 atendimentos, anamneses (com revisão e rascunho), condutas, HOLOSCANs, ferramentas, coletas');
// a coleta com encounter_id: a RPC real nao recebe encounter_id; o falso tambem nao — ligamos direto (como sincronizacao.js faz)
for (const [c, e] of [[C1, E1], [C2, E2]]) q(UA, 'lab_collections', 'update', { dados: { encounter_id: e }, filtros: [{ op: 'eq', col: 'id', val: c }] });
await recarregar();

/* ==================================================================== */
titulo('EVOLUCAO: PONTOS ESCOLHIDOS, NUNCA INFERIDOS');
/* ==================================================================== */
await abrirAba(PA, 'evolucao');
let pontos = await texto('#aba-evolucao .evo-pontos');
ok(/A:.*Atendimento anterior.*01\/05\/2026/.test(pontos) && /B:.*Atendimento atual.*01\/06\/2026/.test(pontos), 'anterior × atual: A = 01/05, B = 01/06 — ' + pontos.replace(/\s+/g, ' '));
ok(!/primeira aplicação/i.test(await texto('#aba-evolucao .evo-cabecalho')), 'a aba nao fala em "primeira × última aplicação"');
await mudarSelect('#aba-evolucao [data-evo-modo]', 'base_atual');
ok(/Escolha qual atendimento é a linha de base/.test(await texto('#evo-sem-comparacao')), 'linha de base: nada e assumido como base — pede escolha explicita');
await mudarSelect('#aba-evolucao [data-evo-a]', E1);
pontos = await texto('#aba-evolucao .evo-pontos');
ok(/Linha de base \(escolhida\)/.test(pontos) && !(await A.evaluate(() => !!document.getElementById('evo-sem-comparacao'))), 'base escolhida: comparacao montada');
await mudarSelect('#aba-evolucao [data-evo-modo]', 'datas');
ok(/Informe as duas datas/.test(await texto('#evo-sem-comparacao')), 'duas datas: sem datas, sem comparacao');
await A.evaluate(async () => {
  const a = document.querySelector('[data-evo-data-a]'); a.value = '2026-05-15'; a.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 200));
  const b = document.querySelector('[data-evo-data-b]'); b.value = '2026-06-15'; b.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 300));
});
pontos = await texto('#aba-evolucao .evo-pontos');
ok(/Até 15\/05\/2026/.test(pontos) && /Até 15\/06\/2026/.test(pontos), 'duas datas escolhidas: A ate 15/05, B ate 15/06');
let med = await texto('#aba-evolucao [data-evo-secao="medidas"]');
ok(/80 kg/.test(med) && /78 kg/.test(med), 'por data: o estado consolidado ate cada data (80 kg → 78 kg)');
await mudarSelect('#aba-evolucao [data-evo-modo]', 'escolha');
await mudarSelect('#aba-evolucao [data-evo-a]', E1);
await mudarSelect('#aba-evolucao [data-evo-b]', E2);
pontos = await texto('#aba-evolucao .evo-pontos');
ok(/Atendimento A.*01\/05/.test(pontos) && /Atendimento B.*01\/06/.test(pontos), 'dois atendimentos escolhidos');

/* ==================================================================== */
titulo('EVOLUCAO: ANAMNESE, MEDIDAS, HOLOSCAN, EXAMES, FERRAMENTAS, ACORDOS');
/* ==================================================================== */
const an = await texto('#aba-evolucao [data-evo-secao="anamnese"]');
ok(/Horas.*6h.*Novo/.test(an.replace(/\s+/g, ' ')) && /Amendoim.*Negado explicitamente/.test(an.replace(/\s+/g, ' ')) && /Cansaço.*Anterior não revisto/.test(an.replace(/\s+/g, ' ')),
   'anamnese: novo (Horas), negado explicitamente (Amendoim), anterior nao revisto (Cansaço)');
ok(/rev\. 2/.test(an) && !/melhorou|piorou|\+\d+ ?%|-\d+ ?%/i.test(an) && /Peso.*Alterado/.test(an.replace(/\s+/g, ' ')), 'a anamnese de A e a revisao vigente (rev. 2) e nada e "melhor" ou "pior"');
med = await texto('#aba-evolucao [data-evo-secao="medidas"]');
ok(/Peso.*80 kg.*78 kg.*delta -2 kg/.test(med.replace(/\s+/g, ' ')), 'medida compativel: 80 kg → 78 kg, delta -2 kg — sem "melhora"');
ok(/Altura.*170 cm.*1\.7 m.*unidades diferentes/.test(med.replace(/\s+/g, ' ')) && !/melhorou|piorou/i.test(med), 'unidades diferentes (cm × m): sem delta, sem conversao');
ok(!/70 kg/.test(med), 'o rascunho de anamnese (70 kg) NAO entra na Evolucao');
const holoSec = await texto('#aba-evolucao [data-evo-secao="holoscan"]');
ok(/01\/05\/2026/.test(holoSec) && /01\/06\/2026/.test(holoSec) && /60 de 60 respondidas|70 de 60 respondidas/.test(holoSec) && !/delta [+-]?\d/i.test(holoSec) && !/Índice \d/.test(holoSec) && /não foi homologada/.test(holoSec),
   'HOLOSCAN: datas, versao e cobertura lado a lado; nenhum delta nem Indice; selo de nao homologado');
const ex = await texto('#aba-evolucao [data-evo-secao="exames"]');
ok(/Glicose.*90 mg\/dL.*5 mmol\/L.*unidades diferentes/.test(ex.replace(/\s+/g, ' ')), 'exame com unidade diferente (mg/dL × mmol/L): lado a lado, sem delta');
ok(/Hemoglobina.*13 g\/dL.*12\.5 g\/dL.*delta -0,5 g\/dL/.test(ex.replace(/\s+/g, ' ')), 'mesmo exame, mesma unidade: delta -0,5 g/dL');
const fe = await texto('#aba-evolucao [data-evo-secao="ferramentas"]');
ok(/OQ³[\s\S]*versões diferentes/.test(fe) && /Roda[\s\S]*media: 5 → 6 \(delta \+1\)/.test(fe), 'ferramenta com versao diferente so lado a lado; mesma ferramenta/versao com delta por chave numerica');
const cd = await texto('#aba-evolucao [data-evo-secao="conduta"]');
ok(/Jantar cedo.*Acordado.*Jantar cedo.*Encerrado.*Encerrado/.test(cd.replace(/\s+/g, ' ')) && /Alongar à noite.*Novo/.test(cd.replace(/\s+/g, ' ')) && /Caminhar 3x.*Sem registro na conduta atual/.test(cd.replace(/\s+/g, ' ')),
   'acordos: anterior → atual (Encerrado), novo, sem registro na conduta atual');
ok(!/\d+ ?%/.test(cd) && !/não cumpriu[^”]/.test(cd) && /Nenhum índice de adesão/.test(cd) && /decisão sobre a anterior: Continuar/.test(cd), 'nenhum indice de adesao nem "nao cumpriu"; a decisao registrada aparece');
const atend = await texto('#aba-evolucao [data-evo-secao="atendimentos"]');
ok((atend.match(/registrado em/g) || []).length === 2, 'atendimentos no intervalo: 2 (a revisao da anamnese nao virou atendimento)');
const tlEvo = await A.evaluate(() => [...document.querySelectorAll('#aba-evolucao [data-evo-secao="timeline"] .fic-evento')].map(e => e.className + '|' + e.innerText.replace(/\s+/g, ' ')));
ok(tlEvo.some(t => /revisao/.test(t) && /Anamnese revisada \(rev\. 2\)/.test(t)) && tlEvo.some(t => /registrado em/.test(t)), 'timeline do intervalo: revisao marcada como revisao, com data de registro');
ok(!tlEvo.some(t => /consulta/.test(t.split('|')[0])), 'a timeline da Evolucao nao mistura agendamentos');
const resumo = await texto('#aba-evolucao .evo-resumo');
ok(/1 medidas com delta comparável/.test(resumo) && /1 exames com delta comparável/.test(resumo), 'resumo conta so o comparavel: ' + resumo);
await A.evaluate(async () => { document.querySelector('[data-evo-fonte="holoscan"]').click(); await new Promise(r => setTimeout(r, 250)); });
ok(!(await A.evaluate(() => !!document.querySelector('#aba-evolucao [data-evo-secao="holoscan"]'))), 'desmarcar a fonte HOLOSCAN esconde a secao');
await A.evaluate(async () => { document.querySelector('[data-evo-abrir="medidas"]').click(); await new Promise(r => setTimeout(r, 250)); });
ok(await A.evaluate(() => document.querySelector('#aba-evolucao [data-evo-secao="medidas"] .evo-secao-corpo').hidden), 'secao recolhivel');

/* ==================================================================== */
titulo('TIMELINE: SO O CONSOLIDADO, DATA CLINICA × DATA DE REGISTRO');
/* ==================================================================== */
await A.evaluate((pid) => {
  // cache local de um calculo nao sincronizado (sem _supa_id): nao e evento
  const tudo = JSON.parse(localStorage.getItem('holohacking.pontuacao') || '{}');
  tudo[pid] = (tudo[pid] || []).concat([{ quando: '2026-06-20', indice: 99, indice_maximo: 100, sistemas: [], calculado_em: '2026-06-20T10:00:00.000Z', versao_estrutura: 2 }]);
  localStorage.setItem('holohacking.pontuacao', JSON.stringify(tudo));
}, PA);
const tl = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="visao"]').click(); await new Promise(r => setTimeout(r, 500));
  return [...document.querySelectorAll('#fic-visao-timeline .fic-evento')].map(e => ({ cls: e.className, txt: e.innerText.replace(/\s+/g, ' '), reg: e.dataset.registradoEm, title: e.title }));
}, PA);
ok(tl.filter(e => /mapa/.test(e.cls)).length === 2 && !tl.some(e => /99/.test(e.txt) && /mapa/.test(e.cls)), 'HOLOSCAN: so as 2 aplicacoes do servidor; o cache local nao sincronizado fica fora');
ok(!tl.some(e => /RASCUNHO NAO ENTRA|rascunho/i.test(e.txt)), 'nenhum rascunho (anamnese/conduta) na timeline');
const rev = tl.find(e => /Anamnese revisada \(rev\. 2\)/.test(e.txt));
ok(rev && /revisao/.test(rev.cls) && rev.reg && /registrado em/.test(rev.title) && /01\/05\/2026/.test(rev.txt), 'revisao: ligada ao atendimento original (data clinica 01/05), data de registro consultavel');
const filtros = await A.evaluate(() => [...document.querySelectorAll('[data-filtro-linha]')].map(b => b.textContent.trim()));
ok(filtros.includes('Atendimentos') && filtros.includes('Relatórios'), 'filtros: ' + filtros.join(' · '));
const ordem = tl.map(e => e.txt.slice(0, 40));
ok(tl.length >= 10 && tl.every((e, i) => i === 0 || true), 'a timeline junta tudo: ' + tl.length + ' eventos — ' + ordem.slice(0, 3).join(' / '));
ok(tl.some(e => /atendimento/.test(e.cls) && /Atendimento realizado/.test(e.txt)), 'atendimentos entram como evento clinico');
const visao = await texto('#fic-atendimento-clinico');
ok(/Última evolução disponível\s*atendimento anterior × atual \(2 atendimentos registrados\)/i.test(visao.replace(/\s+/g, ' ')) && /Último relatório emitido\s*nenhum emitido/i.test(visao.replace(/\s+/g, ' ')), 'Visao geral: ultima evolucao disponivel e "nenhum relatorio emitido"');

/* ==================================================================== */
titulo('RELATORIOS: SELECAO EXPLICITA, PREVIA, EMISSAO');
/* ==================================================================== */
await abrirAba(PA, 'relatorio');
ok(/Nenhum relatório ainda/.test(await texto('#relatorios-emissoes')) && (await A.evaluate(() => !!document.querySelector('#relatorio-checklist'))), 'aba Relatorio: lista vazia; o checklist antigo continua abaixo');
await A.evaluate(async () => { document.querySelector('[data-rel-acao="novo"]').click(); await new Promise(r => setTimeout(r, 400)); });
const form = await A.evaluate(() => ({
  marcados: [...document.querySelectorAll('#rel-form [data-rel-fonte]')].filter(c => c.checked).length,
  total: document.querySelectorAll('#rel-form [data-rel-fonte]').length,
  intimo: document.querySelector('[data-rel-opcao="incluir_intimo"]').checked,
  interp: document.querySelector('[data-rel-opcao="incluir_interpretacao"]').checked,
  pendencia: document.getElementById('rel-form').innerText
}));
ok(form.total >= 10 && form.marcados === 0, 'nada vem marcado: ' + form.total + ' fontes, 0 marcadas');
ok(form.intimo === false && form.interp === true, 'conteudo intimo NAO vem marcado; interpretacao profissional vem');
ok(/Solicitação de exames com assinatura: não implementada/.test(form.pendencia), 'pendencia da solicitacao de exames registrada na tela');
ok(!/RASCUNHO NAO ENTRA/.test(form.pendencia) && (await A.evaluate(() => [...document.querySelectorAll('[data-rel-fonte="anamnesis_ids"]')].map(c => c.parentNode.innerText))).filter(t => /substituída/.test(t)).length === 1 && (await A.evaluate(() => document.querySelectorAll('[data-rel-fonte="anamnesis_ids"]').length)) === 3, 'so anamneses consolidadas sao oferecidas (rev. 1 marcada como substituida, rev. 2, e a de E2; rascunho fora)');
await A.evaluate(async (ids) => {
  for (const [k, v] of ids) { const c = document.querySelector('[data-rel-fonte="' + k + '"][value="' + v + '"]'); if (c) c.click(); }
  document.querySelector('[data-rel-campo="title"]').value = 'Relatório de retorno';
  document.querySelector('[data-rel-campo="professional_text"]').value = 'Interpretação escrita pela profissional.';
  document.querySelector('[data-rel-acao="previa"]').click(); await new Promise(r => setTimeout(r, 300));
}, [['encounter_ids', E1], ['anamnesis_ids', AN1b], ['holoscan_application_ids', H1], ['conduct_ids', CD1], ['tool_application_ids', T1]]);
let previa = await texto('#rel-previa');
ok(/PRÉVIA — não emitida/.test(previa) && /Dormir melhor/.test(previa) && /Peso/.test(previa) && /Interpretação escrita/.test(previa), 'previa rotulada, com as fontes escolhidas');
ok(!/SEGREDO_INTIMO|RESPOSTA_INTIMA/.test(previa) && /campos íntimos não incluídos/.test(previa) && /respostas não incluídas/.test(previa), 'previa sem conteudo intimo (anamnese e respostas da ferramenta)');
ok(/não são oficiais/.test(previa) && !/Índice/.test(previa) && /resultados não oficiais/.test(previa), 'HOLOSCAN na previa: aplicacao realizada, sem resultado oficial');
await A.evaluate(async (cd) => { document.querySelector('[data-rel-fonte="conduct_ids"][value="' + cd + '"]').click(); document.querySelector('[data-rel-acao="previa"]').click(); await new Promise(r => setTimeout(r, 300)); }, CD1);
previa = await texto('#rel-previa');
ok(!/Dormir melhor/.test(previa) && /Peso/.test(previa), 'remover uma fonte tira so ela da previa');
ok(srv.linhas('report_emissions').length === 0, 'previa nao grava nada');
// falha do servidor: nada "emitido"
srv.falhar.push({ tabela: 'rpc:emitir_relatorio', acao: 'rpc' });
let r = await A.evaluate(async () => {
  document.querySelector('[data-rel-acao="emitir"]').click();
  for (let i = 0; i < 30 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
  document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 600));
  return { estado: document.getElementById('rel-estado').textContent, lista: document.querySelector('#rel-emissoes') ? document.querySelector('#rel-emissoes').innerText : '', toast: document.getElementById('toast').textContent };
});
ok(/Não foi possível emitir/.test(r.estado) && /Nada foi emitido/.test(r.estado) && !/Relatório emitido/.test(r.toast) && srv.linhas('report_emissions').length === 0, 'servidor falhou: "nao foi possivel emitir", nada mostrado como emitido');
srv.falhar.length = 0;
r = await A.evaluate(async () => {
  document.querySelector('[data-rel-acao="emitir"]').click();
  for (let i = 0; i < 30 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
  const corpo = document.getElementById('modal-confirmar-corpo').innerText;
  document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800));
  return { corpo, tela: document.getElementById('relatorios-emissoes').innerText };
});
let em = srv.linhas('report_emissions');
ok(em.length === 1 && em[0].status === 'emitido' && em[0].revision_number === 1 && em[0].content_hash, 'emitido: 1 emissao no servidor, rev. 1, com hash');
ok(/sem conteúdo íntimo/.test(r.corpo) && /Emissão nº 1/.test(r.tela) && /Relatório de retorno/.test(r.tela) && /Hash técnico/.test(r.tela) && /não é assinatura/.test(r.tela), 'a emissao aparece com numero, titulo e hash tecnico (nao assinatura)');
ok(!/SEGREDO_INTIMO|RESPOSTA_INTIMA/.test(JSON.stringify(em[0].content_snapshot)) && em[0].selected_sources.incluir_intimo === false && !em[0].selected_sources.conduct_ids.length, 'snapshot sem conteudo intimo e sem a conduta removida');
const EM1 = em[0].id;

/* ==================================================================== */
titulo('RELATORIOS: SNAPSHOT CONGELADO, RETIFICACAO, ORIGINAL ACESSIVEL, RASCUNHO');
/* ==================================================================== */
rpc('salvar_anamnese', { id: AN1b, status: 'salvo', revision_note: 'rev 3', content: { dominios: { medidas: { itens: [ITEM('Peso', '', { origem: 'dado_medido', medida: { valor: 99, unidade: 'kg' } })] } } } });
q(UA, 'patients', 'update', { dados: { nome: 'Paciente Um Renomeada' }, filtros: [{ op: 'eq', col: 'id', val: PA }] });
await recarregar();
await abrirAba(PA, 'relatorio');
await A.waitForSelector('[data-rel-acao="ver"][data-rel-id="' + EM1 + '"]', { timeout: 8000 });
await A.evaluate(async (id) => { document.querySelector('[data-rel-acao="ver"][data-rel-id="' + id + '"]').click(); await new Promise(r => setTimeout(r, 300)); }, EM1);
await A.waitForSelector('#rel-documento', { timeout: 5000 });
let ver = await texto('#rel-documento');
ok(/Peso.*80 kg/.test(ver.replace(/\s+/g, ' ')) && !/99/.test(ver) && /Paciente: Paciente Um/.test(ver) && !/Renomeada/.test(ver), 'a emissao mostra o snapshot: 80 kg (nao 99) e o nome da epoca');
ok(srv.linhas('report_emissions')[0].content_snapshot.anamneses[0].itens[0].medida.valor === 80, 'no servidor o snapshot continua igual depois da revisao da fonte');
// retificar
await A.evaluate(async () => { document.querySelector('[data-rel-acao="voltar"]').click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('[data-rel-acao="retificar"]').click(); await new Promise(r => setTimeout(r, 400)); });
const formRet = await A.evaluate(() => ({ titulo: document.querySelector('#rel-form .dash-titulo').textContent, marcados: [...document.querySelectorAll('#rel-form [data-rel-fonte]')].filter(c => c.checked).map(c => c.dataset.relFonte) }));
ok(/Retificação/.test(formRet.titulo) && formRet.marcados.includes('anamnesis_ids') && formRet.marcados.includes('holoscan_application_ids'), 'retificar abre o formulario com a selecao da emissao original');
await A.evaluate(async () => {
  document.querySelector('[data-rel-campo="title"]').value = 'Relatório de retorno (retificado)';
  document.querySelector('[data-rel-acao="emitir"]').click();
  for (let i = 0; i < 30 && !document.getElementById('modal-confirmar-ok'); i++) await new Promise(r => setTimeout(r, 50));
  document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800));
});
em = srv.linhas('report_emissions');
const orig = em.find(x => x.id === EM1), ret = em.find(x => x.id !== EM1);
ok(em.length === 2 && ret.status === 'emitido' && ret.revision_number === 2 && ret.supersedes_report_id === EM1 && orig.superseded_at && orig.content_snapshot.anamneses[0].itens[0].medida.valor === 80, 'retificacao: emissao nº 2 ligada; original preservada e marcada como substituida');
ver = await texto('#relatorios-emissoes');
ok(/Emissão nº 2/.test(ver) && /retifica/.test(ver) && (await A.evaluate(() => !!document.querySelector('[data-rel-acao="ver"][data-rel-id]'))), 'a retificacao mostra a relacao com a original');
await A.evaluate(async () => { [...document.querySelectorAll('[data-rel-acao="ver"]')].find(b => /original/.test(b.textContent)).click(); await new Promise(r => setTimeout(r, 300)); });
ver = await texto('#rel-documento');
ok(/Emissão nº 1/.test(ver) && /substituída por retificação/.test(ver) && /80 kg/.test(ver), 'a original continua acessivel, marcada como substituida');
// rascunho
await A.evaluate(async () => { document.querySelector('[data-rel-acao="voltar"]').click(); await new Promise(r => setTimeout(r, 200)); document.querySelector('[data-rel-acao="novo"]').click(); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-rel-campo="title"]').value = 'RASCUNHO PENDENTE'; document.querySelector('[data-rel-acao="rascunho"]').click(); await new Promise(r => setTimeout(r, 600)); });
em = srv.linhas('report_emissions');
const rasc = em.find(x => x.status === 'rascunho');
ok(rasc && rasc.title === 'RASCUNHO PENDENTE' && !rasc.issued_at && /Rascunho salvo/.test(await texto('#rel-estado')) && /não emitido/.test(await texto('#rel-estado')), 'rascunho salvo no servidor, sem issued_at, e a tela diz "nao emitido"');
await A.evaluate(async () => { document.querySelector('[data-rel-acao="voltar"]').click(); await new Promise(r => setTimeout(r, 300)); });
const lista = await A.evaluate(() => [...document.querySelectorAll('#rel-emissoes .rel-emissao')].map(li => li.className + '|' + li.innerText.replace(/\s+/g, ' ')));
ok(lista.some(l => /rascunho\|/.test(l) && /RASCUNHO PENDENTE/.test(l) && /não emitido/.test(l) && !/Emitido/.test(l.split('|')[1].replace('não emitido', ''))), 'na lista o rascunho e "Rascunho · nao emitido", nunca "Emitido"');
const tl2 = await A.evaluate(async (pid) => { document.querySelector('[data-aba="visao"]').click(); await new Promise(r => setTimeout(r, 500));
  return { eventos: [...document.querySelectorAll('#fic-visao-timeline .fic-evento.relatorio')].map(e => e.innerText.replace(/\s+/g, ' ')), visao: document.getElementById('fic-atendimento-clinico').innerText.replace(/\s+/g, ' ') }; }, PA);
ok(tl2.eventos.length === 2 && tl2.eventos.some(t => /Retificação/.test(t)) && !tl2.eventos.some(t => /RASCUNHO PENDENTE/.test(t)), 'timeline: 2 emissoes (uma retificacao); o rascunho fica fora');
ok(/Último relatório emitido.*retificado.*emissão nº 2/.test(tl2.visao) && !/RASCUNHO PENDENTE/.test(tl2.visao), 'Visao geral: ultimo relatorio EMITIDO (a retificacao), nunca o rascunho');

/* ==================================================================== */
titulo('CONTEXTOS: DASHBOARD, HOLOS AI, EXPORTACAO, HISTORICO');
/* ==================================================================== */
const dash = await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="dashboard"]').click(); await new Promise(r => setTimeout(r, 500)); return (document.getElementById('dash-rascunhos') || {}).innerText || ''; });
ok(/Rascunhos pendentes/.test(dash) && /1 relatório em rascunho/.test(dash) && /RASCUNHO PENDENTE/.test(dash) && /anamnese em rascunho/.test(dash) && !/Índice/.test(dash), 'dashboard: rascunhos pendentes (anamnese, relatorio) sem Indice medio — ' + dash.replace(/\s+/g, ' ').slice(0, 120));
const ctx = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="holos-ai"]').click(); await new Promise(r => setTimeout(r, 400));
  const out = {};
  for (const id of ['evolucao', 'relatorios', 'completo']) {
    const b = document.querySelector('#ai-hub-atalhos [data-ctx="' + id + '"]');
    if (b) { b.click(); await new Promise(r => setTimeout(r, 300)); }
    out[id] = (document.getElementById('ai-hub-texto') || {}).textContent || '';
  }
  return out;
}, PA);
const vaz = /### Índice HOLOS|### Tríada|- Físico:|faixa \d|### Leitura Integrada|CMB-|\bREC-|\bSEL-|nota \d/;
ok(/Linha do tempo consolidada/.test(ctx.evolucao) && /Anamnese revisada/.test(ctx.evolucao) && /registrado em/.test(ctx.evolucao) && !/RASCUNHO|rascunho de/i.test(ctx.evolucao) && !vaz.test(ctx.evolucao) && !/Índice 50|Índice 60/.test(ctx.evolucao),
   'HOLOS AI (evolucao): timeline consolidada com data de registro, sem rascunho e sem Indice');
ok(/Relatórios emitidos/.test(ctx.relatorios) && /Emissão nº 2/.test(ctx.relatorios) && /Emissão nº 1/.test(ctx.relatorios) && !/RASCUNHO PENDENTE/.test(ctx.relatorios) && !/SEGREDO_INTIMO/.test(ctx.relatorios) && !vaz.test(ctx.relatorios),
   'HOLOS AI (relatorios emitidos): so emissoes, sem rascunho, sem conteudo intimo');
ok(!/Emissão nº/.test(ctx.completo) && /Linha do tempo consolidada/.test(ctx.completo), 'o atalho "Caso completo" traz a timeline mas nao os relatorios sem a profissional escolher');
const dados = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  let dados = null; const origURL = URL.createObjectURL;
  URL.createObjectURL = (blob) => { blob.text().then(t => { dados = JSON.parse(t); }); return 'blob:fake'; };
  const origCreate = document.createElement.bind(document);
  document.createElement = function (tag) { const el = origCreate(tag); if (tag === 'a') el.click = () => {}; return el; };
  document.getElementById('btn-exportar-paciente').click(); await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao');
  if (modal && !modal.classList.contains('hidden')) { document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800)); }
  await new Promise(r => setTimeout(r, 400)); URL.createObjectURL = origURL; document.createElement = origCreate; return dados;
}, PA);
ok(dados && Array.isArray(dados.timeline) && dados.timeline.some(e => e.revisao && e.original_id) && dados.timeline.every(e => 'data_clinica' in e && 'registrado_em' in e), 'exportacao: timeline com data clinica, data de registro e revisao ligada ao original');
ok(dados && dados.evolucao && dados.evolucao.holoscan.delta === null && dados.evolucao.medidas.some(m => m.campo === 'Peso' && m.delta === -21 && m.unidade === 'kg') && dados.evolucao.medidas.some(m => m.campo === 'Altura' && m.delta === null), 'exportacao: metadados da Evolucao (delta so no comparavel — a rev. 3 ja vale 99 kg; HOLOSCAN sem delta)');
ok(dados && dados.relatorios && dados.relatorios.length === 3 && dados.relatorios.some(x => x.rotulo === 'RASCUNHO (não emitido)') && dados.relatorios.some(x => x.supersedes_report_id === EM1 && x.revision_number === 2) && dados.relatorios.every(x => x.status !== 'emitido' || x.content_snapshot), 'exportacao: emissoes com snapshot, retificacao ligada e rascunho rotulado');
const hist = await A.evaluate(async (pb) => {
  const r = await window.supabaseClient.rpc('emitir_relatorio', { payload: { patient_id: pb, title: 'so relatorio', selected_sources: {} } });
  return r.error ? r.error.message : 'ok';
}, PB);
ok(hist === 'ok' && srv.linhas('report_emissions').filter(x => x.patient_id === PB).length === 1, 'Paciente Dois recebe uma emissao sem outras fontes (so identificacao e profissional)');

ok(errosJS.length === 0, 'sem erros de JS na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
