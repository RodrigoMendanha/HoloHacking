/**
 * MAPEAMENTO HOLISTICO V1 (12/10) — o formulario que o paciente responde antes da consulta (pagina publica por link).
 *
 *   1  primeira consulta: 7 etapas (6 + revisar e enviar), na ordem e com os titulos novos
 *   2  nada de medidas nem do espaco profissional: sem peso, altura, circunferencias, outras medidas, exames,
 *      observacoes fisicas nem outras avaliacoes (em nenhuma etapa)
 *   3  perguntas novas presentes (motivo, alimentacao, corpo, restricoes, rotina, historia); sintoma x diagnostico separados
 *   4  campos sensiveis: "Prefiro nao responder" (texto e escolha); espiritualidade so abre o "conte um pouco" com "Sim"
 *   5  campo aberto final na revisao; enviar so com ele (tudo o mais opcional)
 *   6  o que vai ao servidor: sem o "conte um pouco" escondido; resposta enviada imutavel
 *   7  levar para o atendimento: rascunho com as chaves novas (origem relato_paciente), "prefiro nao" vira recusado;
 *      a edicao profissional nao muda o original
 *   8  retorno (paciente com anamnese salva): 1 etapa + revisar; sem peso; perguntas novas de pratica
 *   9  nenhuma palavra "anamnese" na pagina do paciente (etapas, revisao, enviado)
 *  10  HOLOSCAN, ferramentas, Resultado HOLOS, Proximos Passos e metodologia intocados
 * SHOT_DIR=<pasta> grava as capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
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
const PN = ins('patients', { nome: 'Nina Ficticia Teste', telefone: '62988887777' }).id;    // nova: primeira consulta
const PR = ins('patients', { nome: 'Rita Ficticia Teste', telefone: '62977776666' }).id;    // com anamnese salva: retorno
const enc = (pid, h) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() + h * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EN = enc(PN, -1), ER0 = enc(PR, -500), ER = enc(PR, -1);
if (rpc('salvar_anamnese', { payload: { encounter_id: ER0, content: { dominios: {} }, status: 'salvo' } }).error) throw new Error('fixture');
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications',
  'holos_results', 'holos_next_steps', 'methodology_packages', 'conducts'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();

/* links criados pela nutricionista (RPC, sem agendamento) */
const criar = (pid, tipo) => rpc('criar_convite_anamnese', { p_patient_id: pid, p_encounter_id: null, p_dias: 7, p_tipo: tipo, p_logo: null }).data;
const cN = criar(PN, 'primeira'), cR = criar(PR, 'retorno');
ok(!!cN.token && !!cR.token && Math.round((Date.parse(cN.expires_at) - Date.now()) / 86400000) === 7, 'links criados sem consulta agendada, válidos por 7 dias');

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
  ids: [...document.querySelectorAll('main [id^="pa-"]')].map(e => e.id), txt: document.body.innerText, btn: document.getElementById('btn-seguir').textContent,
  secoes: [...document.querySelectorAll('main h3.secao')].map(e => e.textContent) }));
const seguir = (P) => P.evaluate(() => document.getElementById('btn-seguir').click()).then(() => espera(350));
const escrever = (P, id, v) => P.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, id, v);
const marcar = (P, id) => P.evaluate((id) => { const e = document.getElementById(id); e.click(); }, id);
const PROIBIDO = /objetiva|peso|altura|circunfer|outras_medidas|exames|obs_fisicas|outras_avaliacoes/;

/* ===== 1–5: primeira consulta ===== */
const M = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + cN.token);
const titulos = [], todosIds = [], textos = [];
let t = await tela(M);
ok(/Etapa 1 de 7/.test(t.passo), 'primeira consulta: "Etapa 1 de 7" (6 etapas + revisar e enviar), sem login');
for (let i = 0; i < 6; i++) {
  t = await tela(M);
  titulos.push(t.h2); todosIds.push(...t.ids); textos.push(t.txt);
  if (i === 2) ok(t.secoes.join('|') === 'O que você tem percebido|Diagnósticos já informados por profissionais de saúde', 'etapa 3: sintomas percebidos separados dos diagnósticos já informados');
  if (SHOT && i === 5) await M.screenshot({ path: SHOT + '/mapeamento-etapa6.png', fullPage: true });
  if (i < 5) await seguir(M);
}
ok(titulos.join('|') === 'Sobre você e o que busca|Sua alimentação no dia a dia|Como seu corpo tem se sentido|Medicamentos, suplementos, alergias e intolerâncias|Sono, energia e rotina|Sua história e seu momento de vida',
  'as 6 etapas na ordem: ' + titulos.join(' · '));
ok(!todosIds.some(id => PROIBIDO.test(id)), 'nenhuma etapa pede peso, altura, circunferências, outras medidas, exames, observações físicas ou outras avaliações');
const todo = textos.join('\n');
for (const [id, rot] of [['pa-motivo-ha_quanto_tempo', 'há quanto tempo'], ['pa-motivo-ja_tentou', 'o que já tentou'], ['pa-alimentar-dia_comum', 'um dia comum'],
  ['pa-alimentar-desejos', 'vontades'], ['pa-saude-pele', 'pele'], ['pa-restricoes-evita_desconforto', 'evita por desconforto'],
  ['pa-estilo-dorme', 'horário de dormir'], ['pa-estilo-dificulta', 'o que dificulta'], ['pa-estilo-funciona', 'o que funciona'],
  ['pa-contexto-mudancas_vida', 'mudanças recentes'], ['pa-contexto-emocional', 'emoções e alimentação']]) ok(todosIds.includes(id), 'pergunta nova: ' + rot);
ok(/Como costuma ser a sua alimentação em um dia comum\?/.test(todo) && /Você percebe desconfortos digestivos\?/.test(todo)
  && /Existe algum alimento que você evita porque percebe desconforto\?/.test(todo) && /Você percebe que emoções ou situações específicas influenciam a sua alimentação\?/.test(todo)
  && !/verdadeira necessidade|disbiose|Qual emoção/i.test(todo), 'linguagem de relato e percepção (sem "verdadeira necessidade", sem nome de diagnóstico, sem causa emocional)');

/* etapa 6: sensiveis */
t = await tela(M);
ok(['contexto-familiar', 'contexto-apoio', 'contexto-emocional', 'contexto-financeiro'].every(k => t.ids.includes('pa-' + k + '-nr')) && /Prefiro não responder/.test(t.txt),
  'campos sensíveis de texto com "Prefiro não responder"');
const sentidoOculto = await M.evaluate(() => document.querySelector('[data-se]') && document.querySelector('[data-se]').hidden);
await marcar(M, 'pa-contexto-sobrecarga-3');   // "Prefiro não responder" na escolha
await marcar(M, 'pa-contexto-sentido_importante-0'); await espera(100);   // "Sim"
const sentidoAberto = await M.evaluate(() => !document.querySelector('[data-se]').hidden);
await escrever(M, 'pa-contexto-sentido', 'TEXTO SENTIDO ESCONDIDO');
await marcar(M, 'pa-contexto-sentido_importante-1'); await espera(100);   // "Não": o "conte um pouco" fecha
const sentidoFechou = await M.evaluate(() => document.querySelector('[data-se]').hidden);
ok(sentidoOculto && sentidoAberto && sentidoFechou, 'espiritualidade: "Se quiser, conte um pouco" só aparece com "Sim" (Sim / Não / Prefiro não responder)');
await M.evaluate(() => { const c = document.getElementById('pa-contexto-emocional-nr'); c.click(); });
await seguir(M);

/* revisar e enviar */
t = await tela(M);
ok(/Revisar e enviar/.test(t.h2) && /Etapa 7 de 7/.test(t.passo) && t.ids.includes('pa-contexto-obs') && /que não perguntamos e que gostaria que sua nutricionista soubesse\?/.test(t.txt),
  'etapa 7: revisar e enviar com o campo aberto final');
ok(/Prefiro não responder/.test(t.txt) && !/TEXTO SENTIDO ESCONDIDO/.test(t.txt) && t.btn === 'Enviar Mapeamento', 'revisão: mostra o "Prefiro não responder", não mostra texto escondido; botão "Enviar Mapeamento"');
await escrever(M, 'pa-contexto-obs', 'Trabalho em turnos');
await espera(2500);
const rasc = srv.linhas('anamnesis_invites').find(c => c.id === cN.id);
ok(rasc.status === 'iniciado' && rasc.draft_content.formulario.contexto.obs === 'Trabalho em turnos' && !('sentido' in rasc.draft_content.formulario.contexto),
  'autosave: "Iniciado", o campo final salvo, e o "conte um pouco" escondido não vai ao servidor');
if (SHOT) await M.screenshot({ path: SHOT + '/mapeamento-revisar.png', fullPage: true });
await M.reload({ waitUntil: 'networkidle2' }); await espera(600);
ok(/Etapa 1 de 7/.test((await tela(M)).passo) && await M.evaluate(() => window.AnamnesePublica.estado().formulario.contexto.obs) === 'Trabalho em turnos', 'fechar e reabrir pelo mesmo link: continua de onde parou');
for (let i = 0; i < 6; i++) await seguir(M);
await seguir(M); await espera(600);
const fim = srv.linhas('anamnesis_invites').find(c => c.id === cN.id);
t = await tela(M);
ok(fim.status === 'concluido' && /Mapeamento enviado!/.test(t.txt) && fim.submitted_content.formulario.contexto.sobrecarga_prefiro_nao === true,
  'enviar só com campos opcionais: "Mapeamento enviado!", status concluído; "Prefiro não responder" guardado');
ok(!/anamnese/i.test(textos.join(' ') + ' ' + t.txt), 'nenhuma palavra "anamnese" na página do paciente (etapas, revisão e enviado)');
const original = JSON.stringify(fim.submitted_content);
ok(rpc('anamnese_publica_enviar', { p_token: cN.token, p_conteudo: { formulario: { motivo: { motivo: 'X' } } } }, null).error?.hint === 'ja_enviada', 'depois de enviar, o link não altera a resposta');

/* ===== 7: levar para o atendimento ===== */
const N = await (await nav.createBrowserContext()).newPage();
await N.setViewport({ width: 1366, height: 1000 });
N.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(N, srv);
await N.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await N.waitForSelector('#login-email', { visible: true });
await N.type('#login-email', 'a@holo.test'); await N.type('#login-senha', 'senha-a-123'); await N.click('#btn-entrar');
await N.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
const levar = (pid, eid) => N.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid); await window.Anamnese.carregar(); window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:anamnese', pid); await new Promise(r => setTimeout(r, 700));
  await window.PreConsulta.carregar(pid); window.PreConsulta.desenhar(); await new Promise(r => setTimeout(r, 200));
  document.querySelector('#an-preconsulta [data-pc-acao="usar"]').click(); await new Promise(r => setTimeout(r, 1500));
}, pid, eid);
await levar(PN, EN);
const an = srv.linhas('anamneses').find(a => a.patient_id === PN && a.encounter_id === EN) || { content: {} };
const meta = an.content.meta || {};
ok(an.status === 'rascunho' && an.content.tipo === 'primeira' && an.content.formulario.contexto.obs === 'Trabalho em turnos' && meta['contexto.obs']?.origem === 'relato_paciente'
  && meta['contexto.sobrecarga']?.estado === 'recusado' && meta['contexto.emocional']?.estado === 'recusado', 'levar para o atendimento: rascunho V2 com as chaves novas (origem relato_paciente); "Prefiro não responder" vira recusado');
const doms = Object.keys(an.content.dominios || {});
ok(!doms.includes('medidas') && !doms.includes('avaliacoes'), 'o rascunho não traz medidas nem avaliações vindas do paciente');
const r = rpc('salvar_anamnese', { payload: { id: an.id, encounter_id: EN, expected_updated_at: an.updated_at, status: 'salvo',
  content: Object.assign({}, an.content, { formulario: Object.assign({}, an.content.formulario, { contexto: Object.assign({}, an.content.formulario.contexto, { obs: 'EDITADO PELA NUTRI' }) }) }) } });
ok(JSON.stringify(srv.linhas('anamnesis_invites').find(c => c.id === cN.id).submitted_content) === original, 'a edição profissional do rascunho não altera a resposta original do paciente' + (r.error ? ' (salvar: ' + r.error.message + ')' : ''));

/* ===== 8: retorno ===== */
const R = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + cR.token);
t = await tela(R);
ok(/Etapa 1 de 2/.test(t.passo) && /Desde a última consulta/.test(t.h2), 'paciente com anamnese salva: retorno, 1 etapa + revisar e enviar');
ok(!t.ids.some(id => /peso|medidas/.test(id)), 'retorno: sem peso e sem "mudou peso/medidas"');
ok(['praticou', 'nao_praticou', 'facilitou', 'dificultou', 'nova_questao'].every(k => t.ids.includes('pa-retorno-' + k)), 'retorno: o que pôs em prática, o que não, o que facilitou, o que dificultou, questão nova');
await escrever(R, 'pa-retorno-praticou', 'Jantar mais cedo'); await seguir(R);
t = await tela(R);
ok(/Revisar e enviar/.test(t.h2) && t.ids.includes('pa-retorno-obs') && /Jantar mais cedo/.test(t.txt), 'retorno: revisão com o campo aberto final');
await seguir(R); await espera(600);
ok(srv.linhas('anamnesis_invites').find(c => c.id === cR.id).status === 'concluido' && !/anamnese/i.test((await tela(R)).txt), 'retorno enviado ("Mapeamento enviado!")');

/* ===== 10 ===== */
ok(digitais() === antes, 'HOLOSCAN, ferramentas, Resultado HOLOS, Próximos Passos, metodologia e condutas intactos');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
