/**
 * MAPEAMENTO HOLISTICO ENXUTO (12/10) — contexto antes da consulta, pouca digitacao, muito toque.
 *   1  link sem consulta agendada, 7 dias; pagina sem login
 *   2  5 blocos + revisar, na ordem; nenhuma medida, exame ou observacao fisica
 *   3  selecao rapida: sintomas como triagem (sem Nunca/As vezes/Frequente/Sempre, sem copiar frase do HOLOSCAN)
 *   4  condicionais: "Outro" abre campo; sinal principal so com sinais marcados e com as opcoes marcadas;
 *      "Sim" abre texto (cirurgia, condicao, desconforto, rotina, mudanca, questao pessoal); limite de escolhas
 *   5  poucos campos de texto visiveis no fluxo normal
 *   6  "Prefiro nao responder"; enviar so com o essencial; autosave (Iniciado), retomar pelo mesmo link
 *   7  enviado: "Mapeamento enviado!"; resposta imutavel; condicional fechada nao vai ao servidor
 *   8  ficha: "Mapeamento recebido", resposta completa por etapa, sem formulario profissional vazio;
 *      Levar para o atendimento -> rascunho V2 editavel; edicao profissional nao altera o original
 *   9  retorno (quem tem anamnese salva): 1 etapa curta, selecao rapida, sem peso
 *  10  sem score, sem preenchimento do HOLOSCAN; HOLOSCAN, metodologia e Resultado intocados
 * SHOT_DIR=<pasta> grava as capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Teste', profissao: 'Nutricionista', registro: 'CRN-1 0000', status: 'ativo', cor_primaria: '#0b3325', cor_secundaria: '#c9a35a', created_at: agora, updated_at: agora });
const q = (tabela, acao, extra, uid) => srv.tratar({ op: 'query', uid: uid === undefined ? UA : uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid === undefined ? UA : uid, nome, args });
const PN = ins('patients', { nome: 'Nina Ficticia Teste', telefone: '62988887777' }).id;
const PR = ins('patients', { nome: 'Rita Ficticia Teste', telefone: '62977776666' }).id;
const enc = (pid, h) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() + h * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EN = enc(PN, -1), ER0 = enc(PR, -500);
if (rpc('salvar_anamnese', { payload: { encounter_id: ER0, content: { dominios: {} }, status: 'salvo' } }).error) throw new Error('fixture');
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications',
  'holos_results', 'holos_next_steps', 'methodology_packages', 'conducts'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();
const fonteHolo = createHash('sha256').update(['holoscan.js', 'holoscan-oficial.js', 'questionario.js', 'metodologia-decisoes-v1.js', 'metodologia-revisao-v3.js'].map(f => readFileSync(new URL('../' + f, import.meta.url))).join('|')).digest('hex');

const criar = (pid, tipo) => rpc('criar_convite_anamnese', { p_patient_id: pid, p_encounter_id: null, p_dias: 7, p_tipo: tipo, p_logo: null }).data;
const cN = criar(PN, 'primeira'), cR = criar(PR, 'retorno');
ok(!!cN.token && Math.round((Date.parse(cN.expires_at) - Date.now()) / 86400000) === 7, 'link criado sem consulta agendada, válido por 7 dias');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url, w, h) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: w || 390, height: h || 844 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto(url, { waitUntil: 'networkidle2' });
  await P.waitForFunction(() => document.getElementById('nav') && !document.getElementById('nav').hidden, { timeout: 8000 }).catch(() => {});
  return P;
}
const tela = (P) => P.evaluate(() => ({ h2: (document.querySelector('main h2') || {}).textContent || '', passo: document.getElementById('passo-txt').innerText,
  ids: [...document.querySelectorAll('main [id^="pa-"]')].map(e => e.id), txt: document.querySelector('main').innerText, btn: document.getElementById('btn-seguir').textContent,
  textos: [...document.querySelectorAll('main textarea, main input[type=text]')].filter(e => !e.closest('.lista-item')).map(e => e.id),
  sw: document.documentElement.scrollWidth, w: innerWidth }));
const seguir = (P) => P.evaluate(() => document.getElementById('btn-seguir').click()).then(() => espera(350));
const escrever = (P, id, v) => P.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
const marcar = (P, nome, valor) => P.evaluate((nome, valor) => { const e = [...document.querySelectorAll('input[name="' + nome + '"]')].find(i => i.value === valor); if (!e) return false; e.click(); return true; }, nome, valor).then(async r => { await espera(150); return r; });
const PROIBIDO = /objetiva|peso|altura|circunfer|outras_medidas|exames|obs_fisicas|outras_avaliacoes/;
const ESCALA_HOLO = /Nunca\s*Às vezes\s*Frequente\s*Sempre/;
/* as 82 frases do HOLOSCAN v3: nenhuma pode aparecer no Mapeamento */
const v3 = JSON.parse(readFileSync(new URL('../docs/v1/metodologia/pacote-metodologico-v3.json', import.meta.url), 'utf8')).pacote.perguntas.map(p => p.statement);

/* ===== primeira consulta ===== */
const M = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + cN.token);
let t = await tela(M);
ok(/Etapa 1 de 6/.test(t.passo), 'sem login; primeira consulta em 6 etapas (5 blocos + revisar)');
const titulos = [], todos = [], textosVisiveis = [];
/* etapa 1 */
titulos.push(t.h2); todos.push(t.txt);
ok(t.ids.some(i => i.startsWith('pa-motivo-motivos')) && t.textos.join() === 'pa-motivo-objetivo', 'etapa 1: motivos por seleção; um único campo de texto visível (o que mais gostaria de melhorar)');
await marcar(M, 'pa-motivo-motivos', 'Mais energia e disposição'); await marcar(M, 'pa-motivo-motivos', 'Outro');
t = await tela(M);
ok(t.ids.includes('pa-motivo-motivos-outro'), '"Outro" abre um campo curto');
await escrever(M, 'pa-motivo-motivos-outro', 'Preparar para uma cirurgia');
await escrever(M, 'pa-motivo-objetivo', 'Ter mais energia à tarde');
ok(!(await tela(M)).ids.includes('pa-motivo-acomp_experiencia'), 'experiência anterior só aparece depois de responder que já fez acompanhamento');
await marcar(M, 'pa-motivo-acomp_anterior', 'Sim, mas tive dificuldade para manter');
ok((await tela(M)).ids.includes('pa-motivo-acomp_experiencia'), '"Sim, mas..." abre o campo opcional sobre a experiência');
textosVisiveis.push((await tela(M)).textos.length);
if (SHOT) await M.screenshot({ path: SHOT + '/enxuto-etapa1.png', fullPage: true });
await seguir(M);
/* etapa 2 */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
ok(!t.ids.some(i => /sinal_principal|sinal_relacao/.test(i)), 'sinal principal e relação com a alimentação só aparecem depois de marcar sinais');
ok(!ESCALA_HOLO.test(t.txt), 'triagem de sinais sem a escala do HOLOSCAN (Nunca/Às vezes/Frequente/Sempre)');
await marcar(M, 'pa-alimentar-dificuldades', 'Falta de tempo'); await marcar(M, 'pa-alimentar-dificuldades', 'Beliscar'); await marcar(M, 'pa-alimentar-dificuldades', 'Comer à noite');
const limite = await M.evaluate(() => [...document.querySelectorAll('input[name="pa-alimentar-dificuldades"]')].filter(i => !i.checked).every(i => i.disabled));
ok(limite && /escolha até 3/.test((await tela(M)).txt), 'dificuldades: escolha até 3 (as outras ficam travadas)');
await marcar(M, 'pa-saude-sinais', 'Azia ou refluxo'); await marcar(M, 'pa-saude-sinais', 'Intestino preso');
t = await tela(M);
const princ = await M.evaluate(() => [...document.querySelectorAll('input[name="pa-saude-sinal_principal"]')].map(i => i.value));
ok(princ.join('|') === 'Azia ou refluxo|Intestino preso', 'sinal principal usa só os sinais marcados');
await marcar(M, 'pa-saude-sinal_principal', 'Azia ou refluxo');
await marcar(M, 'pa-saude-sinal_relacao', 'Sim');
ok((await tela(M)).ids.includes('pa-saude-sinal_relacao_obs'), '"Sim" na relação com a alimentação abre o texto opcional');
await escrever(M, 'pa-saude-sinal_relacao_obs', 'Depois de café');
await marcar(M, 'pa-saude-sinais', 'Não tenho percebido nenhum desses');
t = await tela(M);
ok(await M.evaluate(() => [...document.querySelectorAll('input[name="pa-saude-sinais"]:checked')].map(i => i.value).join()) === 'Não tenho percebido nenhum desses'
  && !t.ids.some(i => /sinal_principal/.test(i)), '"Não tenho percebido nenhum desses" desmarca os outros e fecha o sinal principal');
await marcar(M, 'pa-saude-sinais', 'Azia ou refluxo'); await marcar(M, 'pa-saude-sinal_principal', 'Azia ou refluxo');
await marcar(M, 'pa-alimentar-agua', '1–2 L');
textosVisiveis.push((await tela(M)).textos.filter(i => !/sinal_relacao_obs/.test(i)).length);
if (SHOT) await M.screenshot({ path: SHOT + '/enxuto-etapa2.png', fullPage: true });
await seguir(M);
/* etapa 3 */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
ok(!t.ids.includes('pa-saude-condicoes') && !t.ids.includes('pa-saude-cirurgias') && !t.ids.includes('pa-restricoes-evita_desconforto'), 'condição, cirurgia e desconforto: campo só depois de "Sim"');
await marcar(M, 'pa-saude-cirurgias_tem', 'Sim');
ok((await tela(M)).ids.includes('pa-saude-cirurgias'), 'cirurgia "Sim" abre "Qual e quando?"');
await escrever(M, 'pa-saude-cirurgias', 'Vesícula, 2020');
await marcar(M, 'pa-saude-condicoes_tem', 'Não');
await M.evaluate(() => { document.getElementById('pa-restricoes-medicamentos-nega').click(); document.getElementById('pa-restricoes-alergias-nega').click(); });
textosVisiveis.push((await tela(M)).textos.filter(i => !/cirurgias/.test(i)).length);
await seguir(M);
/* etapa 4 */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
ok(t.ids.includes('pa-estilo-dorme') && t.ids.includes('pa-estilo-acorda') && await M.evaluate(() => document.getElementById('pa-estilo-dorme').type === 'time'), 'horário de dormir e acordar em relógio, lado a lado');
ok(!/cabeça não desliga|acorda cansado|desperta/i.test(t.txt), 'sono sem repetir o que o HOLOSCAN investiga');
await escrever(M, 'pa-estilo-dorme', '23:00'); await escrever(M, 'pa-estilo-acorda', '06:30');
await marcar(M, 'pa-estilo-dificulta_opcoes', 'Tempo'); await marcar(M, 'pa-estilo-dificulta_opcoes', 'Cansaço');
ok(await M.evaluate(() => [...document.querySelectorAll('input[name="pa-estilo-dificulta_opcoes"]')].filter(i => !i.checked).every(i => i.disabled)), 'o que dificulta: até 2');
await marcar(M, 'pa-estilo-tabagismo', '');   // Prefiro nao responder
textosVisiveis.push((await tela(M)).textos.length);
await seguir(M);
/* etapa 5 */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
ok(!/propósito|espiritualidade|sentido da vida|trauma/i.test(t.txt), 'momento atual curto: sem propósito, espiritualidade, sentido da vida ou trauma');
await marcar(M, 'pa-contexto-pessoal_tem', 'Sim');
ok((await tela(M)).ids.includes('pa-contexto-pessoal'), 'questão pessoal "Sim" abre "Se quiser, conte um pouco"');
await escrever(M, 'pa-contexto-pessoal', 'TEXTO PESSOAL');
await marcar(M, 'pa-contexto-pessoal_tem', 'Não');
ok(!(await tela(M)).ids.includes('pa-contexto-pessoal'), 'voltar para "Não" fecha o campo');
await marcar(M, 'pa-contexto-apoio_nivel', '');   // Prefiro nao responder
textosVisiveis.push((await tela(M)).textos.length);
if (SHOT) await M.screenshot({ path: SHOT + '/enxuto-etapa5.png', fullPage: true });
await seguir(M);
/* revisar */
t = await tela(M);
ok(/Revisar e enviar/.test(t.h2) && /Etapa 6 de 6/.test(t.passo) && /Existe algo importante que não perguntamos/.test(t.txt) && t.btn === 'Enviar Mapeamento', 'revisar: resumo, pergunta final e "Enviar Mapeamento"');
ok(/Prefiro não responder/.test(t.txt) && !/TEXTO PESSOAL/.test(t.txt), 'revisão mostra "Prefiro não responder" e não mostra texto de pergunta fechada');
textosVisiveis.push(1);
ok(titulos.join('|') === 'O que te traz aqui|Alimentação e sinais que você percebe|Sua saúde e seus cuidados atuais|Sono, hábitos e rotina|Seu momento atual', 'os 5 blocos na ordem: ' + titulos.join(' · '));
const ids = (await M.evaluate(() => [...document.querySelectorAll('[id^="pa-"]')].map(e => e.id))).concat(todos.join(' ').match(/pa-[\w-]+/g) || []);
ok(!todos.join(' ').match(PROIBIDO) && !ids.some(i => PROIBIDO.test(i)), 'sem peso, altura, circunferências, exames ou observações físicas');
const somaTextos = textosVisiveis.reduce((a, b) => a + b, 0);
ok(somaTextos <= 6, 'poucos campos de texto no fluxo normal: ' + somaTextos + ' (o resto é toque)');
ok(!v3.some(frase => todos.join('\n').includes(frase)), 'nenhuma frase do HOLOSCAN v3 copiada no Mapeamento');
await espera(2500);
const rasc = srv.linhas('anamnesis_invites').find(c => c.id === cN.id);
ok(rasc.status === 'iniciado' && rasc.draft_content.formulario.saude.sinal_principal === 'Azia ou refluxo' && !rasc.draft_content.formulario.contexto.pessoal,
  'autosave: "Iniciado"; resposta de pergunta fechada não vai ao servidor');
if (SHOT) await M.screenshot({ path: SHOT + '/enxuto-revisar.png', fullPage: true });
await M.reload({ waitUntil: 'networkidle2' }); await espera(600);
ok(await M.evaluate(() => window.AnamnesePublica.estado().formulario.motivo.objetivo) === 'Ter mais energia à tarde', 'retomar pelo mesmo link: continua de onde parou');
for (let i = 0; i < 5; i++) await seguir(M);
await seguir(M); await espera(600);
const fim = srv.linhas('anamnesis_invites').find(c => c.id === cN.id);
ok(fim.status === 'concluido' && /Mapeamento enviado!/.test((await tela(M)).txt) && !/anamnese/i.test(todos.join(' ') + (await tela(M)).txt), 'enviado: "Mapeamento enviado!"; nenhuma palavra "anamnese" para o paciente');
ok(fim.submitted_content.formulario.estilo.tabagismo_prefiro_nao === true && Array.isArray(fim.submitted_content.formulario.motivo.motivos), '"Prefiro não responder" e seleções guardados');
const original = JSON.stringify(fim.submitted_content);
ok(rpc('anamnese_publica_salvar', { p_token: cN.token, p_conteudo: { formulario: { motivo: { objetivo: 'X' } } } }, null).error?.hint === 'ja_enviada', 'depois de enviar, o link não altera a resposta');
ok(await M.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'celular 390px sem rolagem lateral');

/* ===== ficha ===== */
const N = await (await nav.createBrowserContext()).newPage();
await N.setViewport({ width: 1366, height: 1000 });
N.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(N, srv);
await N.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await N.waitForSelector('#login-email', { visible: true });
await N.type('#login-email', 'a@holo.test'); await N.type('#login-senha', 'senha-a-123'); await N.click('#btn-entrar');
await N.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await N.evaluate(async (pid, eid) => { window.definirPacienteAtivo(pid); await window.Anamnese.carregar(); window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:anamnese', pid); await new Promise(r => setTimeout(r, 900)); }, PN, EN);
const f = await N.evaluate(() => ({ card: document.getElementById('an-preconsulta').innerText, reg: document.getElementById('anamnese-registro').innerHTML,
  botoes: [...document.querySelectorAll('#an-preconsulta [data-pc-acao]')].map(b => b.textContent.trim()) }));
ok(/Mapeamento recebido/.test(f.card) && /O que te traz aqui/.test(f.card) && /Qual é o principal motivo para buscar acompanhamento\?/.test(f.card) && /Mais energia e disposição, Outro: Preparar para uma cirurgia/.test(f.card)
  && /Azia ou refluxo/.test(f.card) && /Vesícula, 2020/.test(f.card), 'ficha: "Mapeamento recebido" com a resposta completa por etapa, nas perguntas que o paciente viu');
ok(f.botoes.join('|') === 'Esconder resposta|Levar para o atendimento|Enviar novo Mapeamento' && !/textarea|an2-form/.test(f.reg), 'ações Ver/Esconder resposta, Levar para o atendimento; sem formulário profissional vazio');
if (SHOT) { const el = await N.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/enxuto-ficha-recebido.png' }); }
await N.evaluate(() => document.querySelector('#an-preconsulta [data-pc-acao="usar"]').click()); await espera(1500);
const an = srv.linhas('anamneses').find(a => a.patient_id === PN && a.encounter_id === EN) || { content: {} };
ok(an.status === 'rascunho' && (an.content.meta || {})['saude.sinais']?.origem === 'relato_paciente' && Array.isArray(an.content.formulario.saude.sinais)
  && (an.content.meta || {})['estilo.tabagismo']?.estado === 'recusado', 'Levar para o atendimento: rascunho V2 com as respostas (origem relato_paciente; "Prefiro não responder" = recusado)');
ok(await N.evaluate(() => !!document.querySelector('#anamnese-registro .an2-form')), 'depois de levar, o rascunho profissional aparece para revisar e completar');
const ed = rpc('salvar_anamnese', { payload: { id: an.id, encounter_id: EN, expected_updated_at: an.updated_at, status: 'salvo',
  content: Object.assign({}, an.content, { formulario: Object.assign({}, an.content.formulario, { motivo: Object.assign({}, an.content.formulario.motivo, { objetivo: 'EDITADO' }) }) }) } });
ok(!ed.error && JSON.stringify(srv.linhas('anamnesis_invites').find(c => c.id === cN.id).submitted_content) === original, 'a edição profissional não altera a resposta original do paciente');
ok(!JSON.stringify(an.content.dominios || {}).match(/medidas|avaliacoes/), 'nada de medidas ou avaliações vindas do paciente');

/* ===== retorno ===== */
const R = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + cR.token);
t = await tela(R);
ok(/Etapa 1 de 2/.test(t.passo) && /Desde a última consulta/.test(t.h2) && !t.ids.some(i => /peso|medidas/.test(i)), 'retorno: 1 etapa curta + revisar, sem peso');
ok(t.textos.length <= 3 && t.ids.some(i => i.startsWith('pa-retorno-melhorou_opcoes')) && t.ids.some(i => i.startsWith('pa-retorno-dificultou_opcoes')), 'retorno por seleção rápida (' + t.textos.length + ' campos de texto visíveis)');
await marcar(R, 'pa-retorno-melhorou_opcoes', 'Sono');
ok((await tela(R)).ids.includes('pa-retorno-melhorou'), 'melhorou: o detalhe só aparece depois de marcar');
await marcar(R, 'pa-retorno-med_sup_mudou', 'Sim');
ok((await tela(R)).ids.includes('pa-retorno-medicamento'), 'mudança em medicamento "Sim" abre "O que mudou?"');
if (SHOT) await R.screenshot({ path: SHOT + '/enxuto-retorno.png', fullPage: true });
await seguir(R); await seguir(R); await espera(600);
ok(srv.linhas('anamnesis_invites').find(c => c.id === cR.id).status === 'concluido', 'retorno enviado');

ok(digitais() === antes, 'sem score e sem preenchimento do HOLOSCAN: HOLOSCAN, ferramentas, Resultado HOLOS, Próximos Passos, metodologia e condutas intactos');
ok(fonteHolo === createHash('sha256').update(['holoscan.js', 'holoscan-oficial.js', 'questionario.js', 'metodologia-decisoes-v1.js', 'metodologia-revisao-v3.js'].map(f => readFileSync(new URL('../' + f, import.meta.url))).join('|')).digest('hex'),
  'arquivos do HOLOSCAN não mudaram durante o teste');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
