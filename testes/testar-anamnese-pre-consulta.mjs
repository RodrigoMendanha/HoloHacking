/**
 * ANAMNESE PRE-CONSULTA por link (Supabase falso com as regras da migration 20261014100000):
 *   1  ficha: "Não enviada" -> Gerar link -> "Enviada", link sem ID, banco sem token puro
 *   2  WhatsApp: conversa da paciente com mensagem pronta, sem dado sensivel
 *   3  pagina publica (celular 390px, sem conta): identidade da nutricionista, etapas, autosave no servidor
 *   4  fechar/reabrir e outro aparelho: o rascunho volta do servidor
 *   5  campos intimos opcionais com "Prefiro nao responder"; campos da profissional fora
 *   6  enviar: concluido, congelado; reabrir o link so mostra "enviada"; reenvio recusado
 *   7  ficha: "Concluída", Ver resposta (relato da paciente, texto escapado), Levar para a anamnese do atendimento
 *      (rascunho V2, origem relato_paciente, peso NAO vira dado medido, "prefiro nao" vira recusado); o relato nao muda
 *   8  seguranca: outra conta nao ve nem cria; token errado/inventado; revogado; expirado
 *   9  nao interferencia: HOLOSCAN, ferramentas, Resultado HOLOS, metodologia e anamnese antiga intactos
 *  10  acessibilidade: todo campo com rotulo; foco no titulo de cada etapa; teclado
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
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Teste', profissao: 'Nutricionista', registro: 'CRN-1 0000', status: 'ativo', cor_primaria: '#0b3325', cor_secundaria: '#c9a35a', created_at: agora, updated_at: agora });
const q = (tabela, acao, extra, uid) => srv.tratar({ op: 'query', uid: uid === undefined ? UA : uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const ins = (tabela, dados, uid) => { const r = q(tabela, 'insert', { dados }, uid); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid === undefined ? UA : uid, nome, args });
const PA = ins('patients', { nome: 'Joana Ficticia Teste', telefone: '(62) 98888-7777' }).id;
const PB = ins('patients', { nome: 'Outra Ficticia Teste' }).id;
const enc = (pid, h) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() + h * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EA = enc(PA, 48), EB0 = enc(PB, -24);
const LEGADO = { dominios: { alergias_informadas: { itens: [{ campo: 'Camarão', valor: '', estado: 'informado', origem: 'relato_paciente', medida: null, previo: false }] } } };
const legId = rpc('salvar_anamnese', { payload: { encounter_id: EB0, content: LEGADO, status: 'salvo' } }).data;
const legAntes = JSON.stringify(srv.linhas('anamneses').find(a => a.id === legId));
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'integrated_readings',
  'lab_collections', 'lab_results', 'holos_results', 'holos_next_steps', 'methodology_packages', 'conducts'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();

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
}
const abrirFicha = (P, pid, eid) => P.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid);
  await window.Anamnese.carregar();
  if (eid) window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:anamnese', pid);
  await new Promise(r => setTimeout(r, 700));
}, pid, eid);
const pc = (P) => P.evaluate(() => { const c = document.getElementById('an-preconsulta'); return { txt: c ? c.innerText : '', status: (c && c.querySelector('.pc-status') || {}).textContent || '', link: (c && c.querySelector('.pc-link code') || {}).textContent || '' }; });
const clicarPc = (P, acao) => P.evaluate(a => { const b = document.querySelector('#an-preconsulta [data-pc-acao="' + a + '"]'); if (!b) return false; b.click(); return true; }, acao);
const confirmarModal = async (P) => { await espera(250); await P.evaluate(() => { const b = document.getElementById('modal-confirmar-ok'); if (b) b.click(); }); await espera(700); };

/* ===== 1 ===== */
const N = await pagina('http://127.0.0.1:5500/');
await entrar(N, 'a@holo.test', 'senha-a-123');
await abrirFicha(N, PA, EA);
let s = await pc(N);
ok(/Não enviada/.test(s.status) && /Gerar link/i.test(s.txt), 'ficha: "Anamnese pré-consulta — Não enviada" com "Gerar link"');
await clicarPc(N, 'gerar'); await espera(900);
s = await pc(N);
const convite = srv.linhas('anamnesis_invites')[0];
const token = (/#t=([A-Za-z0-9_-]+)$/.exec(s.link) || [])[1];
ok(/Enviada/.test(s.status) && !!token && token.length === 43 && /\/anamnese\.html#t=/.test(s.link), 'Gerar link: status "Enviada" e link /anamnese.html#t=<token de 43>');
ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(s.link) && !JSON.stringify(srv.linhas('anamnesis_invites')).includes(token) && srv.convitesAnamnese.hashes.get(convite.id) === createHash('sha256').update(token).digest('hex'),
  'o link não tem ID de paciente nem de nutricionista; a tabela guarda só o hash do token');
ok(convite.encounter_id === EA && convite.form_tipo === 'primeira' && convite.professional_snapshot.nome === 'Nutri Ficticia Teste', 'convite ligado à paciente e à consulta futura ativa; identidade da nutricionista copiada no convite');
if (SHOT) { await new Promise(r => setTimeout(r, 900)); const el = await N.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/ficha-preconsulta-link.png' }); }
const cores = await N.evaluate(() => { const c = document.querySelector('#an-preconsulta .pc-cartao'); const d = document.querySelector('#an-preconsulta .pc-datas dd'); return { cartao: getComputedStyle(c).color, dd: getComputedStyle(d).color, fundo: getComputedStyle(c).backgroundColor }; });
ok(cores.dd === cores.cartao && cores.dd !== cores.fundo && cores.dd !== 'rgb(244, 239, 227)', 'cartão legível: datas e link com a cor de texto do cartão (não herdam o creme da ficha)');

/* ===== 2 ===== */
await N.evaluate(() => { window.__aberto = null; window.open = (u) => { window.__aberto = u; return null; }; });
await clicarPc(N, 'whatsapp'); await espera(200);
const wa = await N.evaluate(() => window.__aberto || '');
const waTxt = decodeURIComponent((wa.split('text=')[1] || '').replace(/\+/g, ' '));
ok(/wa\.me\/5562988887777/.test(wa) && waTxt.includes('Olá, Joana') && waTxt.includes(s.link) && !/Ficticia Teste|CRN|diagn/i.test(waTxt),
  'WhatsApp: conversa da paciente (55 + telefone) com a mensagem pronta e o link; sem sobrenome nem dado clínico');

/* ===== 3 ===== */
const URL_PUB = 'http://127.0.0.1:5500/anamnese.html#t=' + token;
const M = await pagina(URL_PUB, 390, 844);
await M.waitForFunction(() => document.getElementById('nav') && !document.getElementById('nav').hidden, { timeout: 8000 }).catch(() => {});
let pub = await M.evaluate(() => ({ cab: document.getElementById('cabeca').innerText, passo: document.getElementById('passo-txt').innerText, h2: (document.querySelector('main h2') || {}).textContent, foco: document.activeElement && document.activeElement.tagName,
  sw: document.documentElement.scrollWidth, w: innerWidth, txt: document.body.innerText }));
ok(/Nutri Ficticia Teste/.test(pub.cab) && /CRN-1 0000/.test(pub.cab) && /Olá, Joana!/.test(pub.cab) && !/Ficticia Teste/.test(pub.cab.replace('Nutri Ficticia Teste', '')),
  'página pública sem conta: nome, profissão e CRN da nutricionista; "Olá, Joana!" (só o primeiro nome)');
ok(/Etapa 1 de 8/.test(pub.passo) && /Sobre você e seu objetivo/.test(pub.h2) && pub.foco === 'H2' && pub.sw <= pub.w + 1, 'celular 390px: "Etapa 1 de 8 — Sobre você e seu objetivo", foco no título, sem rolagem lateral');
ok(!/nutritionist_id|patient_id|domin|origem|meta/i.test(pub.txt), 'nenhum ID, "domínio", origem ou metadado técnico na tela da paciente');
if (SHOT) await new Promise(r => setTimeout(r, 900)), await M.screenshot({ path: SHOT + '/publica-mobile.png' });
const XSS = '<img src=x onerror="window.__x=1">Mais energia';
await M.evaluate((x) => {
  const set = (id, v) => { const e = document.getElementById(id); e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  set('pa-motivo-motivo', 'Cansaço à tarde'); set('pa-motivo-objetivo', x);
}, XSS);
await espera(2600);
const rasc = srv.linhas('anamnesis_invites').find(c => c.id === convite.id);
ok(rasc.status === 'iniciado' && rasc.draft_content.formulario.motivo.motivo === 'Cansaço à tarde' && !!rasc.started_at, 'autosave: o rascunho chega ao servidor (status "Iniciada")');
ok(/Salvo às/.test(await M.evaluate(() => document.getElementById('salvo').textContent)), 'a página avisa "Salvo às hh:mm"');

/* ===== 4 ===== */
await M.reload({ waitUntil: 'networkidle2' }); await espera(700);
ok(await M.evaluate(() => document.getElementById('pa-motivo-motivo').value) === 'Cansaço à tarde', 'fechar e reabrir o link: o que foi escrito volta');
const D = await pagina(URL_PUB, 1280, 900);
await espera(600);
ok(await D.evaluate(() => (document.getElementById('pa-motivo-motivo') || {}).value) === 'Cansaço à tarde', 'outro aparelho (computador): o rascunho vem do servidor');
if (SHOT) await new Promise(r => setTimeout(r, 900)), await D.screenshot({ path: SHOT + '/publica-desktop.png' });
await D.close();

/* ===== 5 ===== */
const seguir = async () => { await M.evaluate(() => document.getElementById('btn-seguir').click()); await espera(350); };
for (let i = 0; i < 5; i++) await seguir();
pub = await M.evaluate(() => ({ h2: document.querySelector('main h2').textContent, txt: document.querySelector('main').innerText, nr: !!document.getElementById('pa-contexto-emocional-nr'),
  rotulos: [...document.querySelectorAll('main input, main textarea, main select')].every(i => i.labels && i.labels.length || i.getAttribute('aria-label') || i.closest('label')) }));
ok(/Histórico e contexto/.test(pub.h2) && /Opcional\. Responda só se quiser/.test(pub.txt) && pub.nr, 'etapa 6: campos emocionais e de sentido pessoal OPCIONAIS, com "Prefiro não responder"');
ok(pub.rotulos, 'todo campo tem rótulo (label ou aria-label)');
await M.evaluate(() => { const c = document.getElementById('pa-contexto-emocional-nr'); c.click(); });
await seguir();
pub = await M.evaluate(() => ({ h2: document.querySelector('main h2').textContent, ids: [...document.querySelectorAll('main [id^="pa-objetiva-"]')].map(e => e.id) }));
ok(/Medidas/.test(pub.h2) && pub.ids.some(i => i === 'pa-objetiva-peso') && !pub.ids.some(i => /circunfer|exames|obs_fisicas|outras/.test(i)), 'etapa 7 (Medidas): só peso e altura; medidas aferidas e exames são da profissional e não aparecem');
await M.evaluate(() => { const e = document.getElementById('pa-objetiva-peso'); e.value = '70'; e.dispatchEvent(new Event('input', { bubbles: true })); });
await seguir();
pub = await M.evaluate(() => ({ h2: document.querySelector('main h2').textContent, txt: document.querySelector('main').innerText, btn: document.getElementById('btn-seguir').textContent }));
ok(/Revisar e enviar/.test(pub.h2) && pub.txt.includes('Cansaço à tarde') && pub.txt.includes(XSS) && pub.txt.includes('Prefiro não responder') && /Enviar anamnese/.test(pub.btn),
  'etapa 8: revisão mostra as respostas como texto (inclusive o "<img ...>" literal) e "Enviar anamnese"');
ok(await M.evaluate(() => window.__x === undefined), 'XSS: o texto com HTML não executou na página pública');

/* ===== 6 ===== */
await seguir(); await espera(600);
const fim = srv.linhas('anamnesis_invites').find(c => c.id === convite.id);
pub = await M.evaluate(() => document.querySelector('main').innerText);
ok(fim.status === 'concluido' && fim.submitted_content.formulario.motivo.objetivo === XSS && fim.draft_content === null && /Anamnese enviada!/.test(pub),
  'enviar: status Concluída, resposta congelada no servidor e "Anamnese enviada!" na tela');
if (SHOT) await new Promise(r => setTimeout(r, 900)), await M.screenshot({ path: SHOT + '/publica-enviada-mobile.png' });
const reenvio = rpc('anamnese_publica_enviar', { p_token: token, p_conteudo: { formulario: { motivo: { motivo: 'OUTRA' } } } }, null);
const resalvar = rpc('anamnese_publica_salvar', { p_token: token, p_conteudo: { formulario: { motivo: { motivo: 'OUTRA' } } } }, null);
await M.reload({ waitUntil: 'networkidle2' }); await espera(500);
pub = await M.evaluate(() => document.body.innerText);
ok(reenvio.error && reenvio.error.hint === 'ja_enviada' && resalvar.error && resalvar.error.hint === 'ja_enviada' && /Anamnese enviada!/.test(pub) && !pub.includes('Cansaço') &&
  srv.linhas('anamnesis_invites').find(c => c.id === convite.id).submitted_content.formulario.motivo.motivo === 'Cansaço à tarde',
  'reenvio e novo salvamento recusados (já enviada); reabrir o link mostra só "enviada", sem as respostas');

/* ===== 7 ===== */
await N.evaluate(async () => { await window.PreConsulta.carregar(window.pacienteAtivoId()); window.PreConsulta.desenhar(); });
await espera(300);
s = await pc(N);
ok(/Concluída/.test(s.status) && /Ver resposta/i.test(s.txt) && /Levar para a anamnese do atendimento/i.test(s.txt), 'ficha: "Concluída" com datas, "Ver resposta" e "Levar para a anamnese do atendimento"');
await clicarPc(N, 'ver'); await espera(300);
s = await pc(N);
ok(/Relato da paciente/.test(s.txt) && s.txt.includes('Cansaço à tarde') && s.txt.includes('<img src=x') && await N.evaluate(() => window.__x === undefined) && /Prefiro não responder/.test(s.txt),
  'Ver resposta: relato da paciente organizado (texto com HTML mostrado literal, não executado) e os "Prefiro não responder"');
if (SHOT) { await new Promise(r => setTimeout(r, 900)); const el = await N.$('#an-preconsulta'); if (el) await el.screenshot({ path: SHOT + '/ficha-preconsulta-resposta.png' }); }
await clicarPc(N, 'usar'); await espera(1500);
const an = srv.linhas('anamneses').filter(a => a.patient_id === PA);
const a0 = an[0] || { content: {} }, meta = a0.content.meta || {};
const doms = a0.content.dominios || {};
const peso = ((doms.medidas || {}).itens || []).find(i => i.campo === 'Peso');
const emo = ((doms.emocional || {}).itens || [])[0];
ok(an.length === 1 && a0.status === 'rascunho' && a0.encounter_id === EA && a0.content.formulario_versao === 2, 'Levar para a anamnese: cria UM rascunho V2 no atendimento ativo (a nutricionista revisa e salva)');
ok(meta['motivo.motivo'] && meta['motivo.motivo'].origem === 'relato_paciente' && meta['motivo.motivo'].pre_consulta === convite.id && peso && peso.origem === 'relato_paciente' && emo && emo.estado === 'recusado',
  'rastreabilidade: cada campo com origem relato_paciente e a referência do convite; peso informado NÃO vira dado medido; "Prefiro não responder" vira estado recusado');
const cv2 = srv.linhas('anamnesis_invites').find(c => c.id === convite.id);
ok(cv2.imported_anamnesis_id === a0.id && JSON.stringify(cv2.submitted_content) === JSON.stringify(fim.submitted_content), 'o convite registra que foi levado; o relato original continua igual');
ok(await N.evaluate(() => /Rascunho|rascunho/.test(document.getElementById('anamnese-registro').innerText)), 'a aba mostra o rascunho da anamnese logo abaixo, para revisar');

/* ===== 8 ===== */
const B = rpc('criar_convite_anamnese', { p_patient_id: PA }, UB);
const vB = q('anamnesis_invites', 'select', {}, UB);
ok(B.error && B.error.hint === 'paciente_invalido' && vB.data.length === 0, 'outra conta: não cria link para paciente alheio e não vê convites');
ok(rpc('anamnese_publica_abrir', { p_token: 'A'.repeat(43) }, null).data.estado === 'invalido' && rpc('anamnese_publica_abrir', { p_token: token.slice(0, 42) + (token[42] === 'A' ? 'B' : 'A') }, null).data.estado === 'invalido'
  && q('anamnesis_invites', 'select', {}, null).error, 'token inventado ou com 1 caractere trocado: "inválido"; anônimo não lê a tabela');
await abrirFicha(N, PB, null);
await clicarPc(N, 'gerar'); await espera(900);
const tokB = (/#t=([A-Za-z0-9_-]+)$/.exec((await pc(N)).link) || [])[1];
await clicarPc(N, 'revogar'); await confirmarModal(N);
const R = await pagina('http://127.0.0.1:5500/anamnese.html#t=' + tokB, 390, 844); await espera(500);
ok(/foi substituído/.test(await R.evaluate(() => document.body.innerText)) && /Revogada/.test((await pc(N)).status), 'Revogar: a ficha mostra "Revogada" e o link abre só o aviso');
await clicarPc(N, 'gerar'); await espera(900);
const tokC = (/#t=([A-Za-z0-9_-]+)$/.exec((await pc(N)).link) || [])[1];
const hC = createHash('sha256').update(tokC).digest('hex');
srv.preConsulta.vencer([...srv.convitesAnamnese.hashes.entries()].find(([, h]) => h === hC)[0]);
await R.goto('http://127.0.0.1:5500/anamnese.html#t=' + tokC, { waitUntil: 'networkidle2' }); await espera(1200);   // so o "#" muda: a pagina recarrega sozinha
await N.evaluate(async (pid) => { await window.PreConsulta.carregar(pid); window.PreConsulta.desenhar(); }, PB); await espera(300);
ok(/venceu/.test(await R.evaluate(() => document.body.innerText)) && /Expirada/.test((await pc(N)).status), 'link vencido: "Expirada" na ficha e aviso na página');
const sem = await pagina('http://127.0.0.1:5500/anamnese.html', 390, 844); await espera(400);
ok(/Link não encontrado/.test(await sem.evaluate(() => document.body.innerText)), 'sem token: "Link não encontrado"');

/* ===== 9 ===== */
ok(digitais() === antes, 'HOLOSCAN, ferramentas, Resultado HOLOS, Próximos Passos, metodologia e condutas intactos');
ok(JSON.stringify(srv.linhas('anamneses').find(a => a.id === legId)) === legAntes, 'anamnese antiga (formato anterior) intacta');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
