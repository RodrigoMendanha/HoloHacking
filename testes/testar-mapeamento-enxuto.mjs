/**
 * MAPEAMENTO HOLISTICO MH-3 (pre-consulta, 14/10) — conhecer a pessoa com as palavras dela + toques nas objetivas.
 *   A  link -> abrir -> preencher parte -> fechar -> voltar -> continuar -> enviar -> chega na ficha
 *   B  condicionais (Sim abre o campo; Nao/Nunca nao; "Outro" abre campo curto)
 *   C  celular 390 px sem rolagem lateral; marca HoloHacking, "Pre-consulta" e o metodo corpo-mente-espirito no topo
 *   D  respostas abertas guardadas com as palavras do paciente
 *   E  status (Iniciado -> concluido) e resposta imutavel depois de enviada
 *   F  obrigatorias so as essenciais: o que falta aparece pelo nome, com atalho, sem apagar o resto
 *   G  Levar para o atendimento (rascunho V2 com as perguntas novas; a edicao nao altera o original)
 *   H  Pacote Holos IA com a estrutura MH-3 (questionario MH-3, etapas, palavras do paciente)
 *   I  historico: uma resposta MH-1 continua aparecendo com as etapas e perguntas que o paciente viu
 *   J  o token de um paciente nao abre o de outro (link invalido)
 *   K  recarregar nao perde resposta;  L  enviar de novo nao duplica
 *   +  sem repetir HOLOSCAN/ferramentas (sono, fome, emocoes, rotina, proposito) e sem peso, medidas ou exames
 *   +  retorno inalterado; HOLOSCAN e metodologia intocados
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

/* ===== primeira consulta (MH-3) ===== */
const M = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + cN.token);
let t = await tela(M);
const topo = await M.evaluate(() => document.getElementById('cabeca').innerText);
ok(/Etapa 1 de 5/.test(t.passo), 'sem login; primeira consulta em 5 etapas (4 blocos + revisar)');
ok(/HoloHacking/.test(topo) && /Pré-consulta/i.test(topo) && /corpo, mente e espírito/.test(topo) && /10 minutos/.test(topo)
  && await M.evaluate(() => !!document.querySelector('#cabeca .marca img[src="/logo-holohacking.png"]')), 'C: topo com a marca HoloHacking, "Pré-consulta" e o método corpo-mente-espírito');
const titulos = [], todos = [];
/* etapa 1 — o que te traz aqui (escrever + tocar) */
titulos.push(t.h2); todos.push(t.txt);
ok((t.txt.match(/\(obrigatória\)/g) || []).length === 2 && t.textos.length === 4 && await M.evaluate(() => !!document.getElementById('pa-motivo-motivo').placeholder),
  'etapa 1: o que busca (toque) + 4 perguntas para escrever com exemplo em cinza; 2 obrigatórias');
await marcar(M, 'pa-motivo-melhorar', 'Mais energia e disposição'); await marcar(M, 'pa-motivo-melhorar', 'Outro');
ok((await tela(M)).ids.includes('pa-motivo-melhorar-outro'), 'B: "Outro" abre um campo curto');
await escrever(M, 'pa-motivo-melhorar-outro', 'Preparar para uma cirurgia');
await escrever(M, 'pa-motivo-motivo', 'Ando muito cansada e sem tempo para comer direito');
await escrever(M, 'pa-motivo-ha_quanto_tempo', 'Uns 2 anos');
await escrever(M, 'pa-motivo-ja_tentou', 'Dieta da internet, não consegui manter');
await escrever(M, 'pa-motivo-mudar_primeiro', 'Ter energia para brincar com meus filhos');
ok(!(await tela(M)).ids.includes('pa-motivo-acomp_experiencia'), 'B: experiência anterior só depois de responder que já fez acompanhamento');
await marcar(M, 'pa-motivo-acomp_anterior', 'Nunca');
ok(!(await tela(M)).ids.includes('pa-motivo-acomp_experiencia'), 'B: "Nunca" não abre o campo');
await marcar(M, 'pa-motivo-acomp_anterior', 'Sim, mas não me senti compreendido(a)');
ok((await tela(M)).ids.includes('pa-motivo-acomp_experiencia'), 'B: "Sim, mas..." abre o campo opcional');
await escrever(M, 'pa-motivo-acomp_experiencia', 'Dieta muito rígida');
if (SHOT) await M.screenshot({ path: SHOT + '/mh3-etapa1-390.png', fullPage: true });
await seguir(M);
/* etapa 2 — alimentacao hoje */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
await escrever(M, 'pa-alimentar-dia_comum', 'Café com pão às 7h; almoço no trabalho; jantar às 20h');
await escrever(M, 'pa-estilo-dias_diferentes', 'Acordo mais tarde e almoço na casa da família');
await escrever(M, 'pa-alimentar-preferencias', 'Gosto de frutas; não como fígado');
await marcar(M, 'pa-alimentar-escolha', 'Vegetariana');
await marcar(M, 'pa-alimentar-refeicoes_como', 'Em casa'); await marcar(M, 'pa-alimentar-refeicoes_como', 'Como correndo');
await marcar(M, 'pa-alimentar-agua', '1–2 L');
await escrever(M, 'pa-alimentar-dificuldade', 'Beliscar à noite');
if (SHOT) await M.screenshot({ path: SHOT + '/mh3-etapa2-390.png', fullPage: true });
await seguir(M);
/* etapa 3 — saude */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
ok(!t.ids.some(i => /condicoes$|med_sup_quais|alergia_qual|desconforto_qual|familiar_saude/.test(i)) && t.textos.length === 0, 'B: saúde só com toques; os campos abrem com "Sim"');
await marcar(M, 'pa-saude-condicoes_tem', 'Sim');
ok((await tela(M)).ids.includes('pa-saude-condicoes'), 'B: diagnóstico "Sim" abre "Qual condição ou diagnóstico?"');
await escrever(M, 'pa-saude-condicoes', 'Hipotireoidismo');
await marcar(M, 'pa-saude-med_sup_tem', 'Ambos'); await escrever(M, 'pa-saude-med_sup_quais', 'Levotiroxina 50 mcg; vitamina D');
await marcar(M, 'pa-saude-alergia_tem', 'Não');
ok(!(await tela(M)).ids.includes('pa-saude-alergia_qual'), 'B: alergia "Não" não abre campo');
await marcar(M, 'pa-saude-desconforto_tem', 'Sim'); await escrever(M, 'pa-saude-desconforto_qual', 'Refluxo depois do almoço');
await marcar(M, 'pa-contexto-familiar_tem', 'Sim'); await escrever(M, 'pa-contexto-familiar_saude', 'Diabetes (mãe)');
await marcar(M, 'pa-saude-exames_tem', 'Sim');
ok(/leve na consulta ou envie para a sua nutricionista/i.test((await tela(M)).txt) && !(await M.evaluate(() => !!document.querySelector('main input[type=file]'))), 'exames: só a orientação, sem anexo no link');
if (SHOT) await M.screenshot({ path: SHOT + '/mh3-etapa3-390.png', fullPage: true });
await seguir(M);
/* etapa 4 — habitos e momento */
t = await tela(M); titulos.push(t.h2); todos.push(t.txt);
await marcar(M, 'pa-estilo-atividade', '1–2x/semana');
ok((await tela(M)).ids.includes('pa-estilo-atividade_qual'), 'B: atividade física abre "Qual atividade física?"');
await escrever(M, 'pa-estilo-atividade_qual', 'Caminhada');
await marcar(M, 'pa-alimentar-alcool', 'Ocasional');
await marcar(M, 'pa-estilo-tabagismo', '');   // Prefiro nao responder
await escrever(M, 'pa-estilo-rotina', 'Trabalho das 8h às 17h, sentada');
await marcar(M, 'pa-estilo-sono_atual', 'Durmo, mas acordo cansado(a)');
await marcar(M, 'pa-estilo-dificulta_hoje', 'Falta de tempo'); await marcar(M, 'pa-estilo-dificulta_hoje', 'Outro');
ok((await tela(M)).ids.includes('pa-estilo-dificulta_hoje-outro'), 'B: "Outro" no que dificulta abre "O que mais dificulta hoje?"');
await escrever(M, 'pa-estilo-dificulta_hoje-outro', 'Plantões');
await escrever(M, 'pa-contexto-momento_agora', 'Mudei de cidade há pouco tempo');
if (SHOT) await M.screenshot({ path: SHOT + '/mh3-etapa4-390.png', fullPage: true });
await seguir(M);
/* revisar */
t = await tela(M);
ok(/Revisar e enviar/.test(t.h2) && /Etapa 5 de 5/.test(t.passo) && t.btn === 'Enviar Mapeamento' && !/Para enviar, falta/.test(t.txt), 'revisar: resumo, pergunta final e "Enviar Mapeamento" (nada obrigatório faltando)');
ok(titulos.join('|') === 'O que te traz aqui|Sua alimentação hoje|Sua saúde|Seus hábitos e seu momento', 'as 4 etapas na ordem: ' + titulos.join(' · '));
const perguntas = await M.evaluate(() => window.MapeamentoHolistico.etapasDe('primeira').reduce((n, et) => n + window.MapeamentoHolistico.camposDa('primeira', et).filter(c => !c.r.se).length, 0) + 1);
ok(perguntas === 27, '27 perguntas principais (as outras só abrem quando a resposta pede): ' + perguntas);
const tudo = todos.join('\n');
ok(!/que horas|fome|emoç|propósito|sentido da vida/i.test(tudo), 'sem repetir HOLOSCAN e ferramentas (horários, fome, emoções, propósito); sono e o que dificulta entram só como toque');
ok(!/peso|altura|circunfer|CPF|RG\b|caso clínico/i.test(tudo) && !v3.some(frase => tudo.includes(frase)), 'sem peso, medidas, CPF/RG, caso clínico e sem frase do HOLOSCAN');
await espera(2600);
const rasc = srv.linhas('anamnesis_invites').find(c => c.id === cN.id);
ok(rasc.status === 'iniciado' && rasc.draft_content.formulario.saude.desconforto_qual === 'Refluxo depois do almoço' && rasc.draft_content.formulario.motivo.versao_mapeamento === 'MH-3'
  && !rasc.draft_content.formulario.saude.alergia_qual, 'A/E: autosave "Iniciado", versão MH-3 gravada; condicional fechada não vai ao servidor');
/* K: recarregar e voltar pelo mesmo link */
await M.reload({ waitUntil: 'networkidle2' }); await espera(700);
ok(await M.evaluate(() => window.AnamnesePublica.estado().formulario.motivo.mudar_primeiro) === 'Ter energia para brincar com meus filhos', 'K: recarregar/voltar pelo mesmo link continua de onde parou');
/* F: obrigatoria apagada -> o envio mostra exatamente o que falta e nao apaga o resto */
await M.evaluate(() => { const f = window.AnamnesePublica.estado().formulario; f.saude.condicoes_tem = ''; });
for (let i = 0; i < 4; i++) await seguir(M);
t = await tela(M);
ok(/Para enviar, falta responder/.test(t.txt) && /Algum profissional de saúde já informou/.test(t.txt) && await M.evaluate(() => document.getElementById('btn-seguir').disabled)
  && await M.evaluate(() => window.AnamnesePublica.estado().formulario.saude.desconforto_qual) === 'Refluxo depois do almoço', 'F: falta uma obrigatória: aparece pelo nome, envio travado, nada apagado');
if (SHOT) await M.screenshot({ path: SHOT + '/mh3-falta-390.png', fullPage: true });
await M.evaluate(() => [...document.querySelectorAll('.faltam .btn-link')][0].click()); await espera(300);
ok(/Sua saúde/.test((await tela(M)).h2), 'F: o atalho leva à etapa da pergunta');
await marcar(M, 'pa-saude-condicoes_tem', 'Sim');
await M.evaluate(() => { window.AnamnesePublica.estado().formulario.saude.condicoes = ''; });
await seguir(M); await seguir(M);
ok(/Para enviar, falta responder/.test((await tela(M)).txt) && /Qual condição ou diagnóstico\?/.test((await tela(M)).txt), 'F: diagnóstico "Sim" torna "Qual condição ou diagnóstico?" obrigatória');
await M.evaluate(() => [...document.querySelectorAll('.faltam .btn-link')][0].click()); await espera(300);
await escrever(M, 'pa-saude-condicoes', 'Hipotireoidismo');
await seguir(M); await seguir(M);
await escrever(M, 'pa-contexto-obs', 'Trabalho em turnos alternados');
if (SHOT) await M.screenshot({ path: SHOT + '/mh3-revisar-390.png', fullPage: true });
ok(await M.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'C: celular 390px sem rolagem lateral');
await seguir(M); await espera(700);
const fim = srv.linhas('anamnesis_invites').find(c => c.id === cN.id);
t = await tela(M);
ok(fim.status === 'concluido' && /Mapeamento enviado com sucesso/.test(t.txt) && /apoiar a sua consulta/.test(t.txt) && !/anamnese/i.test(tudo + t.txt), 'A/E: enviado: "Mapeamento enviado com sucesso"; nenhuma palavra "anamnese"');
ok(await M.evaluate(() => document.querySelector('#cabeca .topo-instrucao').hidden), 'depois de enviar, o topo não diz mais que dá para continuar pelo link');
const sf = fim.submitted_content.formulario;
ok(sf.motivo.melhorar_outro === 'Preparar para uma cirurgia' && sf.saude.med_sup_quais === 'Levotiroxina 50 mcg; vitamina D' && sf.alimentar.preferencias === 'Gosto de frutas; não como fígado'
  && sf.estilo.tabagismo_prefiro_nao === true && sf.estilo.sono_atual === 'Durmo, mas acordo cansado(a)' && sf.estilo.dificulta_hoje_outro === 'Plantões' && sf.motivo.motivo === 'Ando muito cansada e sem tempo para comer direito' && sf.alimentar.dia_comum.startsWith('Café com pão') && sf.contexto.obs === 'Trabalho em turnos alternados', 'D: respostas abertas e "Prefiro não responder" guardados com as palavras do paciente');
const original = JSON.stringify(fim.submitted_content);
ok(rpc('anamnese_publica_salvar', { p_token: cN.token, p_conteudo: { formulario: { motivo: { motivo: 'X' } } } }, null).error?.hint === 'ja_enviada', 'E: depois de enviar, o link não altera a resposta');
const env2 = rpc('anamnese_publica_enviar', { p_token: cN.token, p_conteudo: JSON.parse(original) }, null);
ok(env2.error?.hint === 'ja_enviada' && srv.linhas('anamnesis_invites').filter(c => c.patient_id === PN).length === 1 && JSON.stringify(srv.linhas('anamnesis_invites').find(c => c.id === cN.id).submitted_content) === original, 'L: enviar de novo não duplica nem muda a resposta');
/* J: outro paciente / token alterado */
const outro = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + cR.token.slice(0, -4) + 'zzzz');
ok(/Link não encontrado/.test((await tela(outro)).txt), 'J: um token que não é o do paciente não abre nada');
/* desktop */
if (SHOT) { const D = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + criar(ins('patients', { nome: 'Dora Ficticia Teste' }).id, 'primeira').token, 1366, 900); await D.screenshot({ path: SHOT + '/mh3-etapa1-1366.png', fullPage: true }); }

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
const abrir = await N.evaluate(() => { const b = document.querySelector('#an-preconsulta [data-pc-acao="ver"]'); if (b) b.click(); return !!b; }); await espera(300);
const f = await N.evaluate(() => ({ card: document.getElementById('an-preconsulta').innerText }));
ok(abrir && /O que te traz aqui/.test(f.card) && /Sua saúde/.test(f.card) && /Refluxo depois do almoço/.test(f.card)
  && /Sua alimentação hoje/.test(f.card) && /Questionário MH-3/.test(f.card), 'ficha: resposta organizada pelas 4 etapas, com as palavras do paciente e a versão MH-3');
if (SHOT) { const el = await N.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/mh3-ficha.png' }); }
const temUsar = await N.evaluate(() => { const b = document.querySelector('#an-preconsulta [data-pc-acao="usar"]'); if (b) b.click(); return !!b; }); await espera(1500);
const an = srv.linhas('anamneses').find(a => a.patient_id === PN && a.encounter_id === EN) || { content: {} };
ok(temUsar && an.status === 'rascunho' && an.content.formulario.saude.med_sup_quais === 'Levotiroxina 50 mcg; vitamina D' && (an.content.meta || {})['saude.desconforto_qual']?.origem === 'relato_paciente',
  'G: Levar para o atendimento: rascunho com as respostas MH-3 (origem relato_paciente)');
const ed = rpc('salvar_anamnese', { payload: { id: an.id, encounter_id: EN, expected_updated_at: an.updated_at, status: 'salvo',
  content: Object.assign({}, an.content, { formulario: Object.assign({}, an.content.formulario, { motivo: Object.assign({}, an.content.formulario.motivo, { motivo: 'EDITADO' }) }) }) } });
ok(!ed.error && JSON.stringify(srv.linhas('anamnesis_invites').find(c => c.id === cN.id).submitted_content) === original, 'G: a edição profissional não altera a resposta original do paciente');
/* H: Pacote Holos IA */
const pac = await N.evaluate(async (pid, eid) => { await window.Anamnese.carregar(); const p = window.HolosAIPonte.montarPacote(pid, eid); return p && p.mapeamento; }, PN, EN);
ok(/Questionário MH-3/.test(pac || '') && /### Sua saúde/.test(pac) && /Refluxo depois do almoço/.test(pac) && /Quais medicamentos ou suplementos\?: Levotiroxina/.test(pac) && !/62988887777|Nina/.test(pac),
  'H: Pacote Holos IA com a estrutura MH-3, as palavras do paciente e sem nome/contato');
/* I: historico MH-1 continua como foi respondido */
const h1 = await N.evaluate(() => window.MapeamentoHolistico.respostaHtml({ tipo: 'primeira', formulario: { motivo: { motivos: ['Saúde intestinal'], objetivo: 'Intestino regular' },
  saude: { sinais: ['Azia ou refluxo'], sinal_principal: 'Azia ou refluxo' }, estilo: { dorme: '23:00' } } }));
ok(/Alimentação e sinais que você percebe/.test(h1) && /Qual é o principal motivo para buscar acompanhamento\?/.test(h1) && /Que horas costuma dormir\?/.test(h1) && /Questionário MH-1/.test(h1),
  'I: resposta MH-1 aparece com as etapas e perguntas que o paciente viu (versão anterior)');

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
