/**
 * MAPEAMENTO HOLISTICO — FLUXO (Plano mestre, Fase 1, 13/10). Supabase falso com as regras das migrations
 * 20261014100000 (pre-consulta) e 20261022100000 (Link enviado). Paciente e nutricionista ficticias.
 *   F01  sem convite: "Não enviado", caminho com 4 passos, nenhum feito
 *   F02  gerar: "Link gerado · ainda não enviado"; banco sem sent_at
 *   F03  WhatsApp: "Link enviado" na hora; banco grava sent_at/sent_via (1o envio); segundo clique nao muda
 *   F04  Dashboard e Visao geral contam a MESMA etapa
 *   F05  o paciente comeca a responder em outro aparelho: a ficha aberta mostra sozinha "começou a responder"
 *   F06  o paciente ENVIA com a ficha aberta: sem nenhum clique, a aba mostra "Mapeamento recebido", data e hora,
 *        o RESUMO nas palavras do paciente e avisa; a Visao geral tambem muda; a resposta ja estava salva no servidor
 *   F07  "Abrir Mapeamento completo" / "Fechar"; enviar outro Mapeamento e acao secundaria
 *   F08  Levar para o atendimento: "em revisão"; anamnese do atendimento concluida: "Revisado"
 *   F09  historico: todos os envios, com datas de gerado/enviado/recebido/levado
 *   F10  banco SEM a migration 20261022100000: tudo continua funcionando ("Link enviado" so nesta sessao)
 *   F11  seguranca: outra conta nao marca; convite respondido nao e remarcado
 *   F12  nao interferencia: HOLOSCAN, ferramentas, Resultado HOLOS, metodologia e a resposta original intactos
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
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Teste', profissao: 'Nutricionista', registro: 'CRN-0 00000', status: 'ativo', cor_primaria: '#0b3325', cor_secundaria: '#c9a35a', created_at: agora, updated_at: agora });
const q = (tabela, acao, extra, uid) => srv.tratar({ op: 'query', uid: uid === undefined ? UA : uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const ins = (tabela, dados, uid) => { const r = q(tabela, 'insert', { dados }, uid); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid === undefined ? UA : uid, nome, args });
const PA = ins('patients', { nome: 'Marina Ficticia Teste', telefone: '(62) 98888-7777' }).id;
const PB = ins('patients', { nome: 'Clara Ficticia Teste', telefone: '(62) 97777-6666' }).id;
const enc = (pid, h) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() + h * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EA = enc(PA, -1), EB = enc(PB, -1);
const convites = (pid) => srv.linhas('anamnesis_invites').filter(c => !pid || c.patient_id === pid);
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications',
  'holos_results', 'holos_next_steps', 'methodology_packages', 'conducts'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();

const RESPOSTA = { formulario: {
  motivo: { motivos: ['Mais energia e disposição'], objetivo: 'Ter mais disposição à tarde' },
  alimentar: { dificuldades: ['Comer à noite', 'Beliscar'], fome_percebida: 'Forte no fim da tarde' },
  saude: { sinais: ['Azia ou refluxo', 'Cansaço'], sinal_principal: 'Cansaço' },
  estilo: { previsibilidade: 'Corridos e imprevisíveis' },
  contexto: { obs: 'Trabalho em turnos alternados.' } } };

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await P.evaluateOnNewDocument(() => { window.__MH_POLL_MS = 400; });   // o ciclo real e 20 s; aqui, rapido
  await ligarPagina(P, srv);
  await P.goto(url, { waitUntil: 'networkidle2' });
  return P;
}
async function entrar(P, email, senha) {
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await P.evaluate(() => {
    window.__toasts = []; const av = window.avisar; window.avisar = (m) => { window.__toasts.push(m); if (av) av(m); };
    window.__aberto = []; window.open = (u) => { window.__aberto.push(u); return null; };
  });
}
const abrirFicha = (P, pid, eid, aba) => P.evaluate(async (pid, eid, aba) => {
  window.definirPacienteAtivo(pid);
  await window.Anamnese.carregar();
  if (eid) window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:' + (aba || 'anamnese'), pid);
  await new Promise(r => setTimeout(r, 700));
}, pid, eid, aba);
const pc = (P) => P.evaluate(() => {
  const c = document.getElementById('an-preconsulta');
  return { txt: c ? c.innerText : '', status: (c && c.querySelector('.pc-status') || {}).textContent || '',
    feitos: c ? c.querySelectorAll('.pc-passo.feito').length : -1, atual: (c && c.querySelector('.pc-passo.atual') || {}).textContent || '',
    passos: c ? c.querySelectorAll('.pc-passo').length : 0, resumo: (c && c.querySelector('.pc-resumo') || {}).innerText || '',
    botoes: c ? [...c.querySelectorAll('[data-pc-acao]')].map(b => b.dataset.pcAcao + ':' + b.textContent.trim()) : [],
    hist: c ? [...c.querySelectorAll('.pc-hist-lista > li')].map(l => l.innerText) : [], erro: !!(c && c.querySelector('.q-erro')) };
});
const clicarPc = (P, acao) => P.evaluate(a => { const b = document.querySelector('#an-preconsulta [data-pc-acao="' + a + '"]'); if (!b) return false; b.click(); return true; }, acao);
const ate = async (P, fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 4000)) { if (await fn()) return true; await espera(150); } return false; };
const tokenDe = (link) => (/#t=([A-Za-z0-9_-]+)$/.exec(link || '') || [])[1];
const foto = async (P, nome) => { if (!SHOT) return; await espera(300); const el = await P.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/' + nome + '.png' }); };

const N = await pagina('http://127.0.0.1:5500/');
await entrar(N, 'a@holo.test', 'senha-a-123');

/* F01 */
await abrirFicha(N, PA, EA);
let s = await pc(N);
ok(/Não enviado/.test(s.status) && s.passos === 4 && s.feitos === 0 && !s.erro && s.botoes.join('|') === 'gerar:Enviar Mapeamento Holístico',
  'F01 sem convite: "Não enviado", caminho Link gerado → Link enviado → Mapeamento recebido → Revisado, nenhum feito');
await foto(N, 'f1-nao-enviado');

/* F02 */
await clicarPc(N, 'gerar'); await espera(900);
s = await pc(N);
const c1 = convites(PA)[0] || {};
const tok = tokenDe((await N.evaluate(() => (document.querySelector('#an-preconsulta .pc-link code') || {}).textContent || '')));
ok(/Link gerado/.test(s.status) && /Ainda não enviado ao paciente/.test(s.txt) && /Link gerado com sucesso/.test(s.txt) && s.feitos === 1 && /Link gerado/.test(s.atual)
  && c1.status === 'enviado' && c1.sent_at === null && !!tok,
  'F02 gerar: status "Link gerado" + "Ainda não enviado ao paciente" (não é mais "Enviado" só por gerar); banco sem sent_at');
await foto(N, 'f2-link-gerado');

/* F03 */
await clicarPc(N, 'whatsapp'); await espera(500);
s = await pc(N);
const c2 = convites(PA)[0];
ok(/Link enviado/.test(s.status) && /Enviado pelo WhatsApp em/i.test(s.txt) && s.feitos === 2 && !!c2.sent_at && c2.sent_via === 'whatsapp' && c2.status === 'enviado'
  && (await N.evaluate(() => window.__aberto.length)) === 1,
  'F03 WhatsApp: "Link enviado" na hora; o banco grava o 1º envio (sent_at, via whatsapp); o status do convite não muda');
const sent1 = c2.sent_at;
await clicarPc(N, 'whatsapp'); await espera(400);
ok(convites(PA)[0].sent_at === sent1 && convites(PA)[0].sent_via === 'whatsapp', 'F03 mandar de novo não muda o registro do 1º envio');
await foto(N, 'f3-link-enviado');

/* F04 */
await N.evaluate(() => window.JornadaPaciente && window.JornadaPaciente.recarregar());
const etDash = await ate(N, () => N.evaluate((pid) => { const e = window.JornadaPaciente.etapa(pid); return e && e.chave === 'aguardando_anamnese' && /Link enviado/.test(e.sub); }, PA), 3000);
const visao1 = await N.evaluate(async () => { window.desenharAbaDaFicha('visao'); await new Promise(r => setTimeout(r, 300)); return document.getElementById('aba-visao').innerText; });
ok(etDash && /Mapeamento Holístico\s*Link enviado/i.test(visao1), 'F04 Dashboard ("Aguardando Mapeamento · Link enviado") e Visão geral ("Link enviado") contam a mesma etapa');
await abrirFicha(N, PA, EA);

/* F05 — o paciente comeca em outro aparelho */
rpc('anamnese_publica_salvar', { p_token: tok, p_conteudo: { formulario: { motivo: { objetivo: 'Ter mais' } } } }, null);
const comecou = await ate(N, async () => /começou a responder/.test((await pc(N)).txt), 4000);
s = await pc(N);
ok(comecou && /Link enviado/.test(s.status) && /Paciente começou em/i.test(s.txt), 'F05 o paciente começou em outro aparelho: a ficha aberta mostra sozinha "O paciente começou a responder"');

/* F06 — o paciente envia com a ficha aberta */
await N.evaluate(() => { window.__toasts.length = 0; window.__leituras = 0; const orig = window.supabaseClient.from.bind(window.supabaseClient);
  window.supabaseClient.from = (t) => { const b = orig(t); if (t === 'anamnesis_invites') { const sel = b.select.bind(b); b.select = (c) => { window.__leituras++; (window.__cols = window.__cols || []).push(c); return sel(c); }; } return b; }; });
const env = rpc('anamnese_publica_enviar', { p_token: tok, p_conteudo: RESPOSTA }, null);
const t0 = Date.now();
const chegou = await ate(N, async () => /Mapeamento recebido/.test((await pc(N)).status), 5000);
const dt = Date.now() - t0;
s = await pc(N);
const cv = convites(PA).find(c => c.patient_id === PA);
const toasts = await N.evaluate(() => window.__toasts.slice());
ok(!env.error && cv.status === 'concluido' && !!cv.submitted_at, 'F06 o envio do paciente já salva a resposta no servidor (concluído, data e hora), sem ação da nutricionista');
ok(chegou && s.feitos === 3 && /Mapeamento recebido/.test(s.atual) && /Recebido em/i.test(s.txt) && /\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/.test(s.txt),
  'F06 a ficha ABERTA mostra sozinha "Mapeamento recebido" com data e hora (' + dt + ' ms, sem clicar nada)');
ok(/Motivo da consulta/i.test(s.resumo) && /Mais energia e disposição/.test(s.resumo) && /Ter mais disposição à tarde/.test(s.resumo) && /Comer à noite, Beliscar/.test(s.resumo)
  && /Cansaço/.test(s.resumo) && /Trabalho em turnos alternados/.test(s.resumo) && /sem interpretação/i.test(s.resumo) && !/Respostas do paciente/.test(s.txt),
  'F06 depois de recebido, a aba mostra o RESUMO nas palavras do paciente (motivo, objetivo, dificuldades, sinais, algo mais), sem interpretação; a resposta completa fica fechada');
ok(toasts.some(t => /Mapeamento recebido de Marina/.test(t)), 'F06 aviso: "Mapeamento recebido de Marina. A resposta já está na ficha."');
const cols = await N.evaluate(() => window.__cols || []);
ok(cols.some(c => !/submitted_content/.test(c)) && cols.every(c => !/token_hash|\*/.test(c)), 'F06 a conferência periódica lê só colunas de estado (sem a resposta, sem token_hash); a resposta só é lida quando algo mudou');
await foto(N, 'f6-recebido-resumo');
const visao2 = await N.evaluate(async () => { window.desenharAbaDaFicha('visao'); await new Promise(r => setTimeout(r, 300)); return document.getElementById('aba-visao').innerText; });
ok(/Mapeamento Holístico\s*Mapeamento recebido/i.test(visao2), 'F06 a Visão geral também mostra "Mapeamento recebido"');
await abrirFicha(N, PA, EA);

/* F07 */
s = await pc(N);
ok(s.botoes.join('|') === 'ver:Abrir Mapeamento completo|revisado:Marcar como revisado|usar:Levar para o atendimento|novo:Enviar novo Mapeamento'
  && await N.evaluate(() => !!document.querySelector('#an-preconsulta .pc-acoes-sec [data-pc-acao="novo"]')),
  'F07 ações: Abrir Mapeamento completo, Marcar como revisado (14/10), Levar para o atendimento; "Enviar novo Mapeamento" separado como ação secundária (a tela não fica centrada no link)');
await clicarPc(N, 'ver'); await espera(250);
s = await pc(N);
ok(/Respostas do paciente/.test(s.txt) && /O que te traz aqui/.test(s.txt) && s.botoes[0] === 'ver:Fechar Mapeamento completo', 'F07 "Abrir Mapeamento completo" mostra a resposta inteira por etapa');
await foto(N, 'f7-mapeamento-completo');
await clicarPc(N, 'ver'); await espera(200);
ok(!/Respostas do paciente/.test((await pc(N)).txt), 'F07 "Fechar Mapeamento completo" recolhe');

/* F08 */
await clicarPc(N, 'usar'); await espera(1500);
s = await pc(N);
const levado = convites(PA).find(c => c.status === 'concluido');
ok(!!levado.imported_anamnesis_id && /Mapeamento recebido/.test(s.status) && /em revisão/.test(s.txt) && s.feitos === 3,
  'F08 Levar para o atendimento: rascunho criado; etapa continua "Mapeamento recebido · em revisão" (rascunho não é revisado)');
const an = srv.linhas('anamneses').find(a => a.id === levado.imported_anamnesis_id);
const concl = rpc('salvar_anamnese', { payload: { encounter_id: an.encounter_id, content: an.content, status: 'salvo', expected_updated_at: an.updated_at, id: an.id } });
await N.evaluate(async () => { await window.Anamnese.carregar(); window.PreConsulta.desenhar(); });
const rev = await ate(N, async () => /Revisado/.test((await pc(N)).status), 3000);
s = await pc(N);
ok(!concl.error && rev && s.feitos === 4 && /Anamnese do atendimento concluída/.test(s.txt), 'F08 anamnese do atendimento concluída: etapa "Revisado" (4 de 4)' + (concl.error ? ' — ' + concl.error.message : ''));
await foto(N, 'f8-revisado');

/* F09 */
await clicarPc(N, 'novo'); await espera(400);
await N.evaluate(() => { const b = document.getElementById('modal-confirmar-ok'); if (b) b.click(); }); await espera(1000);
s = await pc(N);
ok(convites(PA).length === 2 && /Link gerado/.test(s.status) && s.hist.length === 2 && /Revisado/i.test(s.hist[1]) && /enviado pelo WhatsApp em/.test(s.hist[1]) && /recebido em/.test(s.hist[1])
  && /levado para o atendimento em/.test(s.hist[1]) && /atual/i.test(s.hist[0]),
  'F09 histórico: os 2 envios, o anterior com gerado/enviado pelo WhatsApp/recebido/levado e "Revisado"; o novo como atual');
await foto(N, 'f9-historico');

/* F10 — banco sem a migration 20261022100000 */
srv.semMigracao = { colunas: { anamnesis_invites: ['sent_at', 'sent_via'] }, rpcs: ['marcar_convite_anamnese_enviado'] };
const N2 = await pagina('http://127.0.0.1:5500/');
await entrar(N2, 'a@holo.test', 'senha-a-123');
await abrirFicha(N2, PB, EB);
await clicarPc(N2, 'gerar'); await espera(900);
let s2 = await pc(N2);
const tokB = tokenDe((await N2.evaluate(() => (document.querySelector('#an-preconsulta .pc-link code') || {}).textContent || '')));
const gerouSem = /Link gerado/.test(s2.status) && !s2.erro;
await clicarPc(N2, 'whatsapp'); await espera(500);
s2 = await pc(N2);
rpc('anamnese_publica_enviar', { p_token: tokB, p_conteudo: RESPOSTA }, null);
const chegouSem = await ate(N2, async () => /Mapeamento recebido/.test((await pc(N2)).status), 5000);
ok(gerouSem && /Link enviado/.test(s2.status) && !s2.erro && chegouSem && !convites(PB)[0].sent_at,
  'F10 banco sem a migration nova: gera, "Link enviado" (só nesta sessão), recebe sozinho; nenhuma mensagem de erro');
delete srv.semMigracao;

/* F11 */
const novoA = convites(PA).find(c => c.status === 'enviado'), velhoA = convites(PA).find(c => c.status === 'concluido');
const outro = rpc('marcar_convite_anamnese_enviado', { p_id: novoA.id, p_via: 'copiado' }, UB);
const fechado = rpc('marcar_convite_anamnese_enviado', { p_id: velhoA.id, p_via: 'copiado' });
const anon = rpc('marcar_convite_anamnese_enviado', { p_id: novoA.id, p_via: 'copiado' }, null);
ok(outro.error && outro.error.hint === 'convite_invalido' && fechado.error && fechado.error.hint === 'convite_fechado' && anon.error,
  'F11 outra conta não marca; convite respondido não é remarcado; sem login, recusado');

/* F12 */
ok(digitais() === antes && JSON.stringify(velhoA.submitted_content.formulario.motivo) === JSON.stringify(RESPOSTA.formulario.motivo),
  'F12 HOLOSCAN, ferramentas, Resultado HOLOS, metodologia e conduta intactos; a resposta original do paciente não mudou');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));

await nav.close();
if (falhou) { console.log('\nFALHOU'); process.exit(1); }
console.log('\nOK — Mapeamento: fluxo (Fase 1)');
