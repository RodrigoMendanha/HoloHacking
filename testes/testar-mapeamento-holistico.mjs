/**
 * MAPEAMENTO HOLISTICO DA SAUDE (anamnese pre-consulta) — o envio do link pela ficha (correcao 12/10).
 *
 * O bug: a ficha lia anamnesis_invites com select("*"). No banco real o SELECT e concedido COLUNA a COLUNA (token_hash
 * fora); o PostgREST expande "*" para todas as colunas e o banco recusa a leitura inteira (42501, provado no Postgres
 * local: supabase/tests/anamnese-pre-consulta-harness.sql AP18). O convite era criado, a releitura falhava e a tela
 * voltava para "Nao enviado", sem link. O Supabase falso agora recusa "*" do mesmo jeito.
 *
 *   1  regressao: "*" recusado; a ficha le colunas explicitas, sem token_hash; o fonte nao tem mais select("*")
 *   2  enviar: RPC devolve id + token + expires_at; linha criada (so o hash); URL /anamnese.html#t=<token>;
 *      "Link gerado com sucesso", status Enviado, criacao, validade 7 dias, expiracao; Copiar / WhatsApp / Revogar
 *   3  releitura falhando depois de criar: o link continua na tela (nao volta para "Nao enviado")
 *   4  copiar: area de transferencia com o link completo + aviso; API recusada -> reserva (execCommand) + aviso;
 *      sem link na sessao: nao ha botao de copiar (nada vazio e copiado)
 *   5  WhatsApp: telefone salvo normalizado (sem +55, com +55, com 55), mensagem do Mapeamento, sem dado clinico
 *   6  estados ao recarregar a ficha: Iniciado (paciente abriu e escreveu) -> Concluido + "Mapeamento recebido"
 *   7  levar para o atendimento: exige atendimento ativo; nao sobrescreve anamnese existente; cria um rascunho so;
 *      o botao some depois; a resposta original nao muda
 *   8  isolamento: outro paciente nao mostra o convite; outra nutricionista nao le, nao cria, nao revoga
 * SHOT_DIR=<pasta> grava as capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Teste', profissao: 'Nutricionista', registro: 'CRN-1 0000', status: 'ativo', cor_primaria: '#0b3325', cor_secundaria: '#c9a35a', created_at: agora, updated_at: agora });
const q = (tabela, acao, extra, uid) => srv.tratar({ op: 'query', uid: uid === undefined ? UA : uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const ins = (tabela, dados, uid) => { const r = q(tabela, 'insert', { dados }, uid); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid === undefined ? UA : uid, nome, args });
const PA = ins('patients', { nome: 'Lia Ficticia Teste', telefone: '(62) 98888-7777' }).id;
const PB = ins('patients', { nome: 'Rui Ficticio Teste', telefone: '+55 62 97777-6666' }).id;
const PC = ins('patients', { nome: 'Teo Ficticio Teste', telefone: '5562966665555' }).id;
const PD = ins('patients', { nome: 'Ana Ficticia Teste' }).id;
const enc = (pid, h) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() + h * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EA = enc(PA, -2), EA2 = enc(PA, -1);
/* EA2 ja tem anamnese salva: levar o Mapeamento para ele nao pode sobrescrever */
const anEA2 = rpc('salvar_anamnese', { payload: { encounter_id: EA2, content: { dominios: {} }, status: 'salvo' } });
if (anEA2.error) throw new Error('fixture: ' + anEA2.error.message);
const convites = (pid) => srv.linhas('anamnesis_invites').filter(c => !pid || c.patient_id === pid);

/* ===== 1 — regressao do bug ===== */
const estrela = q('anamnesis_invites', 'select', {});
const hashCol = q('anamnesis_invites', 'select', { colunas: 'id,token_hash' });
const explicita = q('anamnesis_invites', 'select', { colunas: 'id,patient_id,status,expires_at' });
ok(estrela.error && estrela.error.code === '42501' && hashCol.error && hashCol.error.code === '42501' && !explicita.error,
  'servidor falso como o banco real: select("*") e token_hash recusados (42501); colunas explícitas aceitas');
const fonte = readFileSync(new URL('../anamnese-convite.js', import.meta.url), 'utf8');
const colunas = (/var COLUNAS = "([^"]+)"/.exec(fonte) || [])[1] || '';
ok(!/select\(\s*["']\*["']\s*\)/.test(fonte) && /select\(COLUNAS\)/.test(fonte) && colunas && !/token_hash/.test(colunas),
  'anamnese-convite.js: sem select("*"); lê só COLUNAS, sem token_hash');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function pagina(url, w, h) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: w || 1366, height: h || 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
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
const abrirFicha = (P, pid, eid) => P.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid);
  await window.Anamnese.carregar();
  if (eid) window.AtendimentoAtual.selecionarPorId(eid); else if (window.AtendimentoAtual.limpar) window.AtendimentoAtual.limpar();
  window.levarParaFicha('aba:anamnese', pid);
  await new Promise(r => setTimeout(r, 700));
}, pid, eid);
const recarregarCartao = (P, pid) => P.evaluate(async (pid) => { window.PreConsulta.esquecer(); await window.PreConsulta.carregar(pid); window.PreConsulta.desenhar(); await new Promise(r => setTimeout(r, 150)); }, pid);
const pc = (P) => P.evaluate(() => {
  const c = document.getElementById('an-preconsulta');
  return { txt: c ? c.innerText : '', status: (c && c.querySelector('.pc-status') || {}).textContent || '', link: (c && c.querySelector('.pc-link code') || {}).textContent || '',
    botoes: c ? [...c.querySelectorAll('[data-pc-acao]')].map(b => b.dataset.pcAcao + ':' + b.textContent.trim()) : [], erro: !!(c && c.querySelector('.q-erro')) };
});
const clicarPc = (P, acao) => P.evaluate(a => { const b = document.querySelector('#an-preconsulta [data-pc-acao="' + a + '"]'); if (!b) return false; b.click(); return true; }, acao);
const toasts = (P) => P.evaluate(() => window.__toasts.slice());
const abertos = (P) => P.evaluate(() => window.__aberto.slice());
const tokenDe = (link) => (/#t=([A-Za-z0-9_-]+)$/.exec(link || '') || [])[1];

const N = await pagina('http://127.0.0.1:5500/');
await entrar(N, 'a@holo.test', 'senha-a-123');

/* ===== 2 — enviar ===== */
await abrirFicha(N, PA, EA);
let s = await pc(N);
ok(/Não enviado/.test(s.status) && !s.erro && s.botoes.join('|') === 'gerar:Enviar Mapeamento Holístico',
  'ficha sem convite: "Mapeamento Holístico da Saúde", status "Não enviado", sem erro de leitura, botão "Enviar Mapeamento Holístico"');
await N.evaluate(() => { const orig = window.supabaseClient.rpc.bind(window.supabaseClient); window.__rpcCriar = null;
  window.supabaseClient.rpc = (n, a) => { const p = Promise.resolve(orig(n, a)); if (n === 'criar_convite_anamnese') p.then(r => { window.__rpcCriar = r && r.data ? Object.keys(r.data).sort() : null; }); return p; }; });
await clicarPc(N, 'gerar'); await espera(900);
s = await pc(N);
const cA = convites(PA)[0] || {};
const tokA = tokenDe(s.link);
const chaves = await N.evaluate(() => window.__rpcCriar);
ok(convites(PA).length === 1 && cA.status === 'enviado' && cA.patient_id === PA && !!cA.expires_at, 'a RPC criar_convite_anamnese criou UMA linha em anamnesis_invites (status enviado, com validade)');
ok(Array.isArray(chaves) && ['expires_at', 'id', 'token'].every(k => chaves.includes(k)), 'a RPC devolve id, token e expires_at para a tela (' + (chaves || []).join(',') + ')');
ok(!!tokA && tokA.length === 43 && s.link === 'http://127.0.0.1:5500/anamnese.html#t=' + tokA && srv.convitesAnamnese.hashes.get(cA.id) === createHash('sha256').update(tokA).digest('hex')
  && !JSON.stringify(convites()).includes(tokA), 'URL montada: <origem>/anamnese.html#t=<token de 43>; o banco guarda só o hash, nunca o token');
ok(/Enviado/.test(s.status) && /Link gerado com sucesso/.test(s.txt) && /Criado em/i.test(s.txt) && /Validade/i.test(s.txt) && /7 dias/.test(s.txt) && /Expira em/i.test(s.txt),
  'logo após enviar: "Link gerado com sucesso", status "Enviado", data de criação, validade (7 dias) e expiração');
ok(s.botoes.join('|') === 'copiar:Copiar link|whatsapp:Enviar pelo WhatsApp|revogar:Revogar link', 'botões: Copiar link, Enviar pelo WhatsApp, Revogar link');
if (SHOT) { await espera(600); const el = await N.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/mapeamento-link-gerado.png' }); }

/* ===== 4 — copiar ===== */
await N.evaluate(() => { window.__copiado = null; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); });
await clicarPc(N, 'copiar'); await espera(200);
ok(await N.evaluate(() => window.__copiado) === s.link && (await toasts(N)).includes('Link copiado.'), 'Copiar link: a área de transferência recebe a URL completa e aparece "Link copiado."');
await N.evaluate(() => { window.__toasts.length = 0; window.__reserva = null;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('negado')) } });
  document.execCommand = (cmd) => { const a = document.activeElement; window.__reserva = cmd === 'copy' && a ? a.value : null; return cmd === 'copy'; }; });
await clicarPc(N, 'copiar'); await espera(200);
ok(await N.evaluate(() => window.__reserva) === s.link && (await toasts(N)).includes('Link copiado.'), 'API de cópia recusada: a reserva copia o mesmo link completo e avisa');

/* ===== 5 — WhatsApp ===== */
await clicarPc(N, 'whatsapp'); await espera(200);
let wa = (await abertos(N)).pop() || '';
let msg = decodeURIComponent((wa.split('text=')[1] || ''));
ok(/^https:\/\/wa\.me\/5562988887777\?text=/.test(wa), 'WhatsApp: telefone salvo sem +55 "(62) 98888-7777" → wa.me/5562988887777');
ok(msg === 'Olá, Lia.\n\nAntes da nossa consulta, peço que preencha o seu Mapeamento Holístico da Saúde pelo link abaixo:\n\n' + s.link + '\n\nAs informações serão utilizadas para preparar seu atendimento.',
  'mensagem do Mapeamento com o primeiro nome e o link completo');
ok(!/Ficticia|CRN|diagn|sintoma|HOLOSCAN|anamnese/i.test(msg.replace(s.link, '')), 'a mensagem não leva sobrenome nem informação clínica');
for (const [pid, esperado, rot] of [[PB, '5562977776666', 'com "+55 62 97777-6666"'], [PC, '5562966665555', 'já com 55 ("5562966665555")']]) {
  await abrirFicha(N, pid, null);
  await clicarPc(N, 'gerar'); await espera(900);
  await clicarPc(N, 'whatsapp'); await espera(200);
  wa = (await abertos(N)).pop() || '';
  ok(wa.startsWith('https://wa.me/' + esperado + '?text='), 'WhatsApp: telefone ' + rot + ' → wa.me/' + esperado + ' (55 uma vez só)');
}
await abrirFicha(N, PD, null);
await N.evaluate(() => { window.__toasts.length = 0; });
await clicarPc(N, 'gerar'); await espera(900);
await clicarPc(N, 'whatsapp'); await espera(200);
wa = (await abertos(N)).pop() || '';
ok(/^https:\/\/wa\.me\/\?text=/.test(wa) && (await toasts(N)).some(t => /Telefone do paciente não cadastrado/.test(t)), 'sem telefone salvo: abre o WhatsApp para escolher o contato e avisa');

/* ===== 3 — releitura falhando depois de criar ===== */
await N.evaluate(() => {
  const orig = window.supabaseClient.from.bind(window.supabaseClient);
  window.__fromOrig = orig;
  window.supabaseClient.from = (t) => t !== 'anamnesis_invites' ? orig(t)
    : { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied for table anamnesis_invites' } }) }) }) };
});
await clicarPc(N, 'revogar'); await espera(250); await N.evaluate(() => { const b = document.getElementById('modal-confirmar-ok'); if (b) b.click(); }); await espera(700);
await clicarPc(N, 'gerar'); await espera(900);
s = await pc(N);
ok(/Enviado/.test(s.status) && !!tokenDe(s.link) && /Link gerado com sucesso/.test(s.txt) && s.botoes.some(b => b.startsWith('copiar')),
  'se a releitura falhar depois de criar, o convite novo continua na tela com o link (não volta para "Não enviado")');
await N.evaluate(() => { window.supabaseClient.from = window.__fromOrig; });

/* sem link nesta sessao (outra aba/recarregou): nada vazio para copiar */
await abrirFicha(N, PA, EA);
await recarregarCartao(N, PA);
s = await pc(N);
ok(/Enviado/.test(s.status) && !s.link && !s.botoes.some(b => /^(copiar|whatsapp)/.test(b)) && s.botoes.some(b => b === 'novo:Gerar novo link'),
  'recarregou a ficha: o link não volta (só o hash no banco); sem botão de copiar/WhatsApp, com "Gerar novo link"');

/* ===== 6 — estados ===== */
ok(rpc('anamnese_publica_abrir', { p_token: tokA }, null).data.estado === 'aberto', 'link válido abre (estado aberto)');
const salvo = rpc('anamnese_publica_salvar', { p_token: tokA, p_conteudo: { formulario: { retorno: { melhorou: 'Sono' } } } }, null);
await recarregarCartao(N, PA);
s = await pc(N);
ok(!salvo.error && /Iniciado/.test(s.status) && /Iniciado em/i.test(s.txt), 'paciente abriu e escreveu: ao recarregar, a ficha mostra "Iniciado" com a data');
const enviado = rpc('anamnese_publica_enviar', { p_token: tokA, p_conteudo: { formulario: { retorno: { melhorou: 'Sono', dificuldade: 'Lanches' } } } }, null);
await recarregarCartao(N, PA);
s = await pc(N);
ok(!enviado.error && /Concluído/.test(s.status) && /Mapeamento recebido/.test(s.txt) && /Recebido em/i.test(s.txt)
  && s.botoes.join('|') === 'ver:Esconder resposta|usar:Levar para o atendimento|novo:Enviar novo Mapeamento',
  'paciente enviou: "Mapeamento recebido", status "Concluído", data, resposta aberta (Esconder resposta) e "Levar para o atendimento"');
const recebido = JSON.stringify(convites(PA).find(c => c.status === 'concluido').submitted_content);
if (SHOT) { await clicarPc(N, 'ver'); await espera(500); const el = await N.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/mapeamento-recebido.png' }); await clicarPc(N, 'ver'); }

/* ===== 7 — levar para o atendimento ===== */
const nAn = () => srv.linhas('anamneses').filter(a => a.patient_id === PA).length;
const n0 = nAn();
await N.evaluate(() => { window.AtendimentoAtual.limpar && window.AtendimentoAtual.limpar(); window.__toasts.length = 0; });
await clicarPc(N, 'usar'); await espera(800);
ok(nAn() === n0 && (await toasts(N)).some(t => /Selecione ou inicie um atendimento/.test(t)), 'sem atendimento ativo: não leva (pede para selecionar um atendimento)');
await N.evaluate((e) => { window.AtendimentoAtual.selecionarPorId(e); window.__toasts.length = 0; }, EA2);
await clicarPc(N, 'usar'); await espera(800);
ok(nAn() === n0 && (await toasts(N)).some(t => /já tem Mapeamento Holístico/.test(t)), 'atendimento que já tem anamnese: não sobrescreve (recusa)');
await N.evaluate((e) => { window.AtendimentoAtual.selecionarPorId(e); window.__toasts.length = 0; }, EA);
await clicarPc(N, 'usar'); await espera(1500);
const novas = srv.linhas('anamneses').filter(a => a.patient_id === PA && a.encounter_id === EA);
ok(nAn() === n0 + 1 && novas.length === 1 && novas[0].status === 'rascunho' && novas[0].content.formulario_versao === 2
  && ((novas[0].content.meta || {})['retorno.melhorou'] || {}).origem === 'relato_paciente', 'atendimento ativo sem anamnese: cria UM rascunho V2 (retorno, pois já há anamnese salva) com origem relato_paciente');
s = await pc(N);
ok(!s.botoes.some(b => b.startsWith('usar')) && /Levado para o atendimento em/.test(s.txt), 'depois de levar: o botão some e a ficha registra "Levado para o atendimento em …"');
ok(JSON.stringify(convites(PA).find(c => c.status === 'concluido').submitted_content) === recebido, 'a resposta original do paciente não mudou');
const outraVez = await N.evaluate(async (c) => { try { await window.Anamnese.usarPreConsulta(c); return 'aceito'; } catch (e) { return e.message; } }, convites(PA).find(c => c.status === 'concluido'));
ok(/já tem Mapeamento Holístico/.test(outraVez) && nAn() === n0 + 1, 'levar de novo para o mesmo atendimento: recusado, sem duplicar');

/* ===== 8 — isolamento ===== */
await abrirFicha(N, PD, null);
await recarregarCartao(N, PD);
s = await pc(N);
ok(convites(PD).every(c => c.patient_id === PD) && !/Concluído|Mapeamento recebido/.test(s.txt), 'outro paciente: a ficha dele mostra só os convites dele');
const lidoB = q('anamnesis_invites', 'select', { colunas: 'id,patient_id,status' }, UB);
const criaB = rpc('criar_convite_anamnese', { p_patient_id: PA }, UB);
const abertoD = convites(PD).find(c => c.status === 'enviado');
const revB = rpc('revogar_convite_anamnese', { p_id: abertoD.id }, UB);
ok(!lidoB.error && lidoB.data.length === 0 && criaB.error && revB.error && abertoD.status === 'enviado', 'outra nutricionista: não lê, não cria para paciente alheio e não revoga convite alheio');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
