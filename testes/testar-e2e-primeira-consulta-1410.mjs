/**
 * PONTA A PONTA DO ZERO (auditoria Cowork 14/10, item 30) — paciente fictícia NOVA, servidor falso, nenhum reload.
 * Cadastro → Mapeamento Holístico (link; a paciente responde) → revisar → abrir atendimento → HOLOSCAN (todas as
 * perguntas do pacote vigente) → salvar → ferramentas → Soltar → reabrir → Pacote Holos IA → importar → Resultado HOLOS
 * → Resultado Final (emissão + PDF) → agendar retorno → reabrir a ficha.
 * Registra: passos, cliques de verdade, erros de JavaScript e reloads (0). Inconsistência residual = FALHA.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia E2E', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid === undefined ? UA : uid, nome, args });
const EXEMPLO = readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8');
const H2P_LOCAL = '/tmp/claude-0/-home-user-HoloHacking/2536f0de-9516-5291-b095-34b766c5940f/scratchpad/h2p/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js';

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = []; let reloads = -1;
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1366, height: 900 });
await P.emulateTimezone('America/Sao_Paulo');
P.on('pageerror', e => errosJS.push(e.message));
P.on('load', () => { reloads++; });
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
if (existsSync(H2P_LOCAL)) await P.addScriptTag({ path: H2P_LOCAL }).catch(() => null);
await P.evaluate(() => {
  window.__toasts = []; const av = window.avisar; window.avisar = (m) => { window.__toasts.push(String(m)); return av && av(m); };
  const t = document.getElementById('toast'); new MutationObserver(() => { if (t.textContent && window.__toasts[window.__toasts.length - 1] !== t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true });
  window.__copiado = null; window.__baixados = []; window.__abertos = [];
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); } catch (e) { /* sem clipboard */ }
  const cria = URL.createObjectURL; URL.createObjectURL = (b) => { window.__baixados.push(b); return cria.call(URL, b); };
  window.open = (u) => { window.__abertos.push(String(u)); return {}; };
  window.__cliques = 0; document.addEventListener('click', (ev) => { if (ev.isTrusted && ev.target.closest('button, a, summary')) window.__cliques++; }, true);
});
const espera = ms => new Promise(r => setTimeout(r, ms));
const clicar = async (sel) => { const b = await P.$(sel); if (!b) return false; await b.click(); return true; };
const confirmarModal = async () => {
  await P.waitForFunction(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden'), { timeout: 4000 });
  await P.evaluate(() => { const b = document.querySelectorAll('#modal-confirmar-rodape button'); b[b.length - 1].click(); });
};
const NOME = 'Iara Ficticia Ponta a Ponta';

/* 1. Cadastro */
await P.evaluate(() => { window.irParaSecao('pacientes'); });
await clicar('#btn-abrir-novo'); await espera(300);
await P.type('#np-nome', NOME); await P.type('#np-telefone', '62987650000'); await P.type('#np-email', 'iara.ficticia@exemplo.com');
await P.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Cadastrar|Salvar paciente/i.test(x.textContent) && x.offsetParent && !/btn-abrir-novo/.test(x.id)); b.click(); });
await espera(1200);
const c1 = await P.evaluate(() => ({ toasts: window.__toasts.join(' | '), aba: (document.querySelector('#ficha-arquivos .aba.ativa') || {}).dataset?.aba, nome: document.getElementById('ficha-nome').textContent,
  enviar: !document.getElementById('btn-enviar-mapeamento').classList.contains('hidden'), pid: window.pacienteAtivoId() }));
const PID = c1.pid;
ok(/Cadastro realizado com sucesso\./.test(c1.toasts) && c1.nome === NOME && c1.aba === 'visao' && c1.enviar, '1 cadastro: "Cadastro realizado com sucesso.", ficha aberta na Visão geral, "Enviar Mapeamento Holístico" em destaque — ' + JSON.stringify(c1));

/* 2. Mapeamento: gerar o link na ficha; a paciente responde pelo link */
await P.evaluate(() => window.levarParaFicha('aba:anamnese', window.pacienteAtivoId())); await espera(800);
await clicar('[data-pc-acao="gerar"]'); await espera(1200);
const conv = srv.linhas('anamnesis_invites').find(c => c.patient_id === PID);
ok(!!conv, '2 link do Mapeamento gerado na ficha');
/* a paciente (sem conta) responde e envia — o token vem do servidor falso, como do link */
await P.evaluate(() => { window.__copiado = null; const b = document.querySelector('[data-pc-acao="copiar"]'); if (b) b.click(); }); await espera(500);
const link = await P.evaluate(() => window.__copiado || '');
const tokenDe = (/#t=([^&\s]+)/.exec(link) || [])[1] || null;
ok(!!tokenDe, '2 "Copiar link" entrega o link do Mapeamento (anamnese.html#t=…)');
let enviado = false;
if (tokenDe) enviado = !rpc('anamnese_publica_enviar', { p_token: tokenDe, p_conteudo: { formulario: { motivo: { motivo: 'Cansaço fictício no fim da tarde', objetivo: 'Mais disposição fictícia' } } } }, null).error;
if (!enviado) { conv.status = 'concluido'; conv.submitted_at = new Date().toISOString(); conv.submitted_content = { tipo: 'primeira', formulario: { motivo: { motivo: 'Cansaço fictício no fim da tarde', objetivo: 'Mais disposição fictícia' } } }; }
await P.evaluate(async (pid) => { if (window.PreConsulta) { window.PreConsulta.esquecer(); await window.PreConsulta.carregar(pid); } window.levarParaFicha('aba:anamnese', pid); }, PID); await espera(900);
ok(enviado, '2 a paciente respondeu e enviou pelo link (RPC pública, sem conta)');
/* 3. revisar */
const temRevisar = await clicar('[data-pc-acao="revisado"]'); await espera(900);
const c3 = srv.linhas('anamnesis_invites').find(c => c.id === conv.id);
ok(c3.status === 'concluido' && (!!c3.reviewed_at || temRevisar), '3 Mapeamento recebido e marcado como revisado (' + (c3.reviewed_at ? 'reviewed_at gravado' : 'clique') + ')');

/* 4. abrir atendimento */
await P.evaluate(() => window.levarParaFicha('aba:visao', window.pacienteAtivoId())); await espera(400);
await clicar('#ficha-atendimento [data-at-acao="novo"]'); await confirmarModal(); await espera(900);
const EID = await P.evaluate(() => (window.AtendimentoAtual.atual() || {}).id || null);
ok(!!EID && srv.linhas('encounters').some(e => e.id === EID && e.patient_id === PID), '4 atendimento aberto e selecionado');

/* 5-6. HOLOSCAN com todas as perguntas do pacote vigente + salvar (e salvar de novo não duplica) */
const holo = await P.evaluate(async () => {
  window.irParaSecao('holoscan'); await new Promise(r => setTimeout(r, 300));
  const antes = { concl: !document.getElementById('holo-concluido').hidden };
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 400));
  const itens = [...document.querySelectorAll('.q-item[data-marcador]')];
  itens.forEach((it, i) => { const bs = it.querySelectorAll('.q-btn'); bs[(i * 7 + 3) % bs.length].click(); });
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 700));
  return { antes, total: itens.length, vigente: window.HoloscanOficial.perguntas().length };
});
await clicar('#btn-salvar-holoscan'); await espera(1300);
await clicar('#btn-salvar-holoscan'); await espera(700);
const c6 = await P.evaluate(() => ({ concl: !document.getElementById('holo-concluido').hidden, btn: document.getElementById('btn-salvar-holoscan').textContent.trim(), toasts: window.__toasts.slice(-3).join(' | ') }));
const apps = srv.linhas('holoscan_applications').filter(a => a.patient_id === PID);
ok(!holo.antes.concl && holo.total === holo.vigente && holo.total > 0, '5 HOLOSCAN: "concluído" escondido antes de responder; respondidas todas as ' + holo.total + ' perguntas do pacote vigente');
ok(apps.length === 1 && apps[0].encounter_id === EID && c6.concl && c6.btn === 'HOLOSCAN salvo ✓' && /já está salvo/.test(c6.toasts), '6 salvo uma vez só (2º clique só avisa); "HOLOSCAN concluído" aparece; botão "HOLOSCAN salvo ✓" — ' + JSON.stringify({ n: apps.length, c6 }));

/* 7. ferramentas: OQ³ (data do atendimento automática) */
const c7 = await P.evaluate(async () => {
  window.irParaSecao('corpo'); window.abrirFerramenta('vista-oq3'); await new Promise(r => setTimeout(r, 500));
  const data = document.getElementById('oq3-data').value;
  document.getElementById('oq3-quer').value = 'Quer ficticio'; document.getElementById('oq3-precisa').value = 'Precisa ficticio'; document.getElementById('oq3-consegue').value = 'Consegue ficticio';
  document.getElementById('btn-salvar-oq3').click(); await new Promise(r => setTimeout(r, 900));
  window.remarcarCardsDeFerramenta();
  return { data, selo: document.querySelector('[data-vista="vista-oq3"] .ferr-status').textContent.trim() };
});
const oq3 = srv.linhas('tool_applications').filter(t => t.patient_id === PID && t.ferramenta_id === 'oq3' && t.status === 'concluida');
ok(oq3.length === 1 && oq3[0].encounter_id === EID && c7.data && c7.selo === 'Concluída', '7 OQ³ salvo no atendimento, com a data do atendimento já preenchida (' + c7.data + '); card "Concluída"');

/* 8. Soltar e reabrir */
const c8 = await P.evaluate(async (eid) => {
  window.levarParaFicha('aba:visao', window.pacienteAtivoId()); await new Promise(r => setTimeout(r, 400));
  document.querySelector('#ficha-atendimento [data-at-acao="limpar"]').click(); await new Promise(r => setTimeout(r, 300));
  const solto = !window.AtendimentoAtual.atual() && /Nenhum atendimento/.test(document.getElementById('ficha-atendimento').innerText);
  window.AtendimentoAtual.selecionarPorId(eid); await new Promise(r => setTimeout(r, 300));
  return { solto, reaberto: (window.AtendimentoAtual.atual() || {}).id === eid, etapa: document.getElementById('fic-faixa-etapa').innerText, cta: window.ctaFicha().txt };
}, EID);
ok(c8.solto && c8.reaberto, '8 Soltar limpa a seleção; reabrir o mesmo atendimento volta ao contexto');
ok(/Resultado HOLOS/.test(c8.etapa) && c8.cta === 'Montar Resultado HOLOS', '8 etapa atual e botão principal acompanham a jornada: ' + c8.etapa.replace(/\s+/g, ' ') + ' / ' + c8.cta);

/* 9-11. Pacote → Holos IA → importar → Resultado HOLOS (14/10: a aba Holos IA esta escondida, mas o fluxo continua no codigo) */
await P.evaluate((pid) => window.levarParaFicha('aba:holos-ai', pid), PID); await espera(1300);
await P.evaluate(() => { window.__copiado = null; document.querySelector('[data-hai-acao="copiar-pacote"]').click(); }); await espera(800);
const pac = await P.evaluate(() => { try { return JSON.parse(window.__copiado); } catch (e) { return null; } });
ok(!!pac && /Origem: Mapeamento Holístico/.test(pac.mapeamento) && /Cansaço fictício no fim da tarde/.test(pac.mapeamento) && /Sistemas/.test(pac.holoscan) && /OQ³/.test(pac.ferramentas_aplicadas) && !/Iara|62987650000/.test(JSON.stringify(pac)),
  '9 Pacote Holos IA com Mapeamento, HOLOSCAN e OQ³ reais (sem nome/telefone)');
await P.evaluate((t) => { const a = document.getElementById('hai-json'); a.value = t; a.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-hai-acao="importar"]').click(); }, '=== HOLOS_AI_RESULT ===\n```json\n' + EXEMPLO + '\n```');
await P.waitForFunction(() => !!document.querySelector('#hai-pronto'), { timeout: 15000 }).catch(() => null); await espera(600);
const res = srv.linhas('holos_results').filter(r => r.patient_id === PID && r.status !== 'rascunho');
const dp = res.length ? res[res.length - 1].content_snapshot.direcao_paciente : null;
ok(res.length === 1 && res[0].encounter_id === EID && dp && (dp.momento || []).some(m => /Cansaço fictício/.test(m.texto)) && dp.foco_atual,
  '10-11 importado → Resultado HOLOS pronto no atendimento, com "Seu momento agora" do Mapeamento e foco');

/* 12. Resultado Final + PDF */
const c12 = await P.evaluate(async () => {
  try { await window.ResultadoPagina.emitirEPdf(); } catch (e) { return { erro: e.message, n: window.__baixados.length }; }
  return { erro: null, n: window.__baixados.length, txt: (document.getElementById('resultado-pagina-corpo') || {}).innerText || '', dono: document.getElementById('resultado-pagina-corpo').dataset.rpPid };
});
const emis = srv.linhas('holos_result_emissions').filter(e => e.patient_id === PID);
ok(emis.length === 1 && (c12.n >= 1 || /html2pdf|gerador de PDF/.test(c12.erro || '')) && (c12.erro === null ? c12.dono === PID : true),
  '12 Resultado Final emitido' + (c12.n ? ' e PDF baixado' : ' (PDF: gerador indisponível offline — ' + c12.erro + ')'));

/* 13. agendar retorno */
const c13 = await P.evaluate(async (pid) => {
  window.irParaSecao('agenda'); await new Promise(r => setTimeout(r, 200));
  window.Agenda.novaConsultaPara(pid); await new Promise(r => setTimeout(r, 300));
  const am = new Date(Date.now() + 7 * 86400000);
  document.getElementById('cf-data').value = am.getFullYear() + '-' + String(am.getMonth() + 1).padStart(2, '0') + '-' + String(am.getDate()).padStart(2, '0');
  document.getElementById('cf-hora').value = '10:00'; document.getElementById('cf-tipo').value = 'Retorno';
  document.querySelector('[data-salvar="consulta"]').click(); await new Promise(r => setTimeout(r, 900));
  return window.__toasts.slice(-2).join(' | ');
}, PID);
ok(srv.linhas('consultations').filter(c => c.patient_id === PID).length === 1 && /Consulta marcada/.test(c13), '13 retorno agendado na primeira tentativa (' + c13.slice(0, 60) + ')');

/* 14. reabrir a ficha */
const c14 = await P.evaluate(async (pid) => {
  window.irParaSecao('pacientes'); window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 700));
  const pil = [...document.querySelectorAll('#ficha-faixa .fic-pilula')].map(p => p.innerText.replace(/\s+/g, ' '));
  const feitos = [...document.querySelectorAll('#ficha-jornada .fic-step.feito')].length;
  return { pil, feitos, aba: document.querySelector('#ficha-arquivos .aba.ativa').dataset.aba };
}, PID);
ok(/às 10:00/.test(c14.pil[0]) && /HOLOSCAN/i.test(c14.pil[1]) && !/nenhum/.test(c14.pil[1]) && c14.feitos >= 5,
  '14 ficha reaberta sem recarregar: próxima consulta, último HOLOSCAN, ' + c14.feitos + ' etapas concluídas na jornada — ' + c14.pil.join(' | '));

const cliques = await P.evaluate(() => window.__cliques);
ok(reloads === 0, 'nenhum reload necessário (' + reloads + ')');
ok(errosJS.length === 0, 'sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');
console.log('          cliques de verdade registrados: ' + cliques);
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
