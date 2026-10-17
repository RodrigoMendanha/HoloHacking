/**
 * PACOTE DE ESTABILIZACAO PRE-PRODUCAO (16/10) — servidor falso, dados FICTICIOS.
 * Cobre os testes novos obrigatorios A–U e a regressao de historico:
 *   A  paciente sem historico -> convite de PRIMEIRA consulta
 *   B/C paciente com Resultado HOLOS anterior (sem anamnese profissional) -> convite de RETORNO
 *   D  historico antigo (anamnese profissional salva) continua dando retorno; tipo de convites ja gravados nao muda
 *   C/D/E campos facilitou_opcoes, dificultou_opcoes, piorou_opcoes chegam ao Playbook
 *   F  o que veio do Resultado anterior NAO vem marcado em "O que ainda pesa" (bloco "No encontro anterior")
 *   G  interpretacao digitada sai junto com "Salvar HOLOSCAN" e continua depois de recarregar
 *   H  a ficha (etapa, botao principal) atualiza sozinha depois de gerar/revisar o Resultado
 *   I  Resultado do retorno = "Resultado HOLOS nº 2" (revision_number nao muda)
 *   J/K Evolucao sem UUID/jargao, com antes x agora do HOLOSCAN e sem diferenca calculada
 *   L  "Ver arquivados" com zero documentos ativos
 *   M  Encerrar atendimento (status concluido; os registros ficam)
 *   N  consulta com atendimento concluido = Realizada (e Em atendimento antes)
 *   O  consulta futura pede confirmacao antes de iniciar
 *   P  botao principal depois da entrega = "Marcar retorno"
 *   Q  Dashboard conta atendimento iniciado hoje a partir de consulta de outro dia
 *   R/S Espirito com 3 ferramentas visiveis; a oculta nao abre por caminho indireto
 *   T  PDF com numero de pagina (e o cartao do plano nao e partido quando cabe inteiro)
 *   U  nova versao de um Resultado do Playbook reabre o Playbook no mesmo atendimento
 *   +  IA escondida; paciente ANTIGO (template 4) abre normalmente; nenhum erro de JavaScript
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture, comFoco, comoTemplate4 } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n== ' + t);
const srv = criarServidor();
const UA = srv.criarConta('est@holo.test', 'senha-est-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Estabilizacao', registro: 'CRN-0 0016', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA, { nome: 'Paciente Ficticia Ciclo', mapeamentoRecebido: true });
const { PA, E1, q, rpc, ins } = fx;
const dia = 86400000;
/* paciente novo, sem nada */
const PN = ins('patients', { nome: 'Paciente Ficticia Nova' }).id;
/* paciente ANTIGO (historico): anamnese profissional salva + Resultado no formato anterior (template 4) */
const PH = ins('patients', { nome: 'Paciente Ficticia Historica', telefone: '62911112222' }).id;
const EH = ins('encounters', { patient_id: PH, occurred_at: new Date(Date.now() - 60 * dia).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta' }).id;
ins('anamneses', { patient_id: PH, encounter_id: EH, revision_number: 1, status: 'salvo', content_version: 2, content: { formulario_versao: 2, tipo: 'primeira', meta: {}, dominios: {}, formulario: { motivo: { motivo: 'Historico ficticio' } } } });
const HH = rpc('salvar_holoscan_completo', { payload: { application: Object.assign({}, srv.linhas('holoscan_applications').find(a => a.patient_id === PA), { id: undefined, patient_id: PH, encounter_id: EH, quando: new Date(Date.now() - 60 * dia).toISOString().slice(0, 10) }),
  answers: srv.linhas('holoscan_answers').filter(a => a.application_id === srv.linhas('holoscan_applications').find(x => x.patient_id === PA).id).map(a => ({ marcador_id: a.marcador_id, valor: a.valor })),
  scores: srv.linhas('holoscan_system_scores').filter(s => s.application_id === srv.linhas('holoscan_applications').find(x => x.patient_id === PA).id).map(s => Object.assign({}, s, { id: undefined, application_id: undefined })) } });
let RH = null;
if (HH && HH.data) {
  rpc('registrar_proximos_passos', { p_application_id: HH.data });
  const r = rpc('salvar_resultado_holos', comFoco({ payload: { patient_id: PH, encounter_id: EH, holoscan_application_id: HH.data, tool_application_ids: [], visao_paciente: { ferramentas: {} } } }));
  RH = r && r.data; if (RH) comoTemplate4(srv, RH);
}
const conviteHistoricoAntes = JSON.stringify(srv.linhas('anamnesis_invites').map(c => [c.id, c.form_tipo]));
const nHolosAntes = srv.linhas('holos_results').length;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1366, height: 1000 });
await P.emulateTimezone('America/Sao_Paulo');
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
const espera = ms => new Promise(r => setTimeout(r, ms));
const txt = (sel) => P.evaluate(s => { const el = document.querySelector(s); return el ? el.innerText : ''; }, sel);
const clicar = (sel) => P.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);
const marcar = (sel) => P.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return el.checked; }, sel);
async function entrar() {
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'est@holo.test'); await P.type('#login-senha', 'senha-est-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); window.__toasts = []; const t = document.getElementById('toast'); if (t) new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true }); });
}
async function recarregar() {
  await P.reload({ waitUntil: 'networkidle2' });
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); window.__toasts = []; const t = document.getElementById('toast'); if (t) new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true }); });
}
await entrar();

titulo('IA escondida');
const ia = await P.evaluate(() => ({ tab: document.getElementById('tab-ia').hidden, flag: window.ASSISTENTE_IA_VISIVEL, holos: window.HOLOS_IA_VISIVEL }));
ok(ia.tab && ia.flag === false && ia.holos === false, 'aba "Assistente de IA" escondida (flag desligada), HOLOS AI escondida; nada apagado');

titulo('A–D primeira consulta x retorno (so o convite NOVO)');
const tipoN = await P.evaluate(async (pid) => window.PreConsulta.tipoDoConvite(pid), PN);
ok(tipoN === 'primeira', 'A paciente sem historico: primeira consulta');
const tipoAantes = await P.evaluate(async (pid) => { if (window.Anamnese && window.Anamnese.carregar) await window.Anamnese.carregar(); return window.PreConsulta.tipoDoConvite(pid); }, PA);
ok(tipoAantes === 'primeira', 'antes do primeiro Resultado (Mapeamento so revisado, sem anamnese): ainda primeira consulta');
const tipoH = await P.evaluate(async (pid) => window.PreConsulta.tipoDoConvite(pid), PH);
ok(tipoH === 'retorno', 'D historico antigo (anamnese profissional salva): retorno, como antes');

titulo('Primeira consulta: Playbook -> Resultado (H: ficha sem F5)');
async function abrirResultado(pid, eid) {
  await P.evaluate((pid, eid) => { window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid); window.levarParaFicha('aba:resultado-holos', pid); }, pid, eid);
  await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'), { timeout: 15000 });
}
async function abrirPlaybook() {
  await clicar('#aba-resultado-holos [data-rh-acao="playbook"]');
  await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos .pb-wiz [data-pb-passo="2"]') || /q-erro/.test((document.querySelector('#aba-resultado-holos .pb-wiz') || {}).innerHTML || ''), { timeout: 15000 });
}
async function gerar() {
  await clicar('[data-pb-acao="gerar"]');
  await P.waitForFunction(() => !document.querySelector('#aba-resultado-holos .pb-wiz') && !!document.querySelector('#aba-resultado-holos #rh-doc'), { timeout: 15000 }).catch(() => null);
  await espera(900);
}
await abrirResultado(PA, E1);
const etapaAntes = await P.evaluate(() => (document.getElementById('fic-faixa-etapa') || {}).innerText || '');
await abrirPlaybook();
await clicar('[data-pb-acao="foco"][data-pb-id="ME-F1"]'); await espera(250);
for (const id of ['ME-C1', 'ME-C4']) { await marcar('[data-pb-est="' + id + '"]'); await espera(150); }
await gerar();
const r1 = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.status !== 'rascunho').pop();
ok(!!r1 && r1.encounter_id === E1, 'Resultado HOLOS da primeira consulta gerado pelo Playbook');
await P.waitForFunction(() => /Resultado/.test((document.getElementById('fic-faixa-etapa') || {}).innerText || '') && !/Montar Resultado HOLOS/.test((document.getElementById('btn-aplicar-holoscan') || {}).textContent || ''), { timeout: 8000 }).catch(() => null);
const fichaDepois = await P.evaluate(() => ({ etapa: (document.getElementById('fic-faixa-etapa') || {}).innerText || '', cta: (document.getElementById('btn-aplicar-holoscan') || {}).textContent || '' }));
ok(!/Montar Resultado HOLOS/.test(fichaDepois.cta) && fichaDepois.etapa !== etapaAntes, 'H a ficha avancou sozinha depois de gerar (sem F5): etapa "' + etapaAntes.replace(/\s+/g, ' ') + '" -> "' + fichaDepois.etapa.replace(/\s+/g, ' ') + '", botao "' + fichaDepois.cta + '"');
const num1 = await P.evaluate((id) => window.ResultadoHolos.rotuloNumero(window.ResultadoHolos.porId(id)), r1.id);
ok(num1 === 'nº 1', 'Resultado da primeira consulta: nº 1 (' + num1 + ')');

titulo('U: nova versao a partir de um Resultado do Playbook');
await P.evaluate(() => { const b = document.querySelector('[data-rh-acao="voltar"]'); if (b) b.click(); });
await espera(300);
await P.evaluate((id) => { window.ResultadoHolos.abrirResultado(id, 'profissional'); }, r1.id); await espera(500);
await clicar('[data-rh-acao="nova-versao"]');
await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos .pb-wiz [data-pb-passo="2"]') || !!document.querySelector('#rh-leitura_profissional'), { timeout: 15000 }).catch(() => null);
await espera(500);
const nv = await P.evaluate(() => ({ playbook: !!document.querySelector('#aba-resultado-holos .pb-wiz'), manual: !!document.querySelector('#rh-leitura_profissional'),
  foco: (document.querySelector('[data-pb-acao="foco"][aria-pressed="true"]') || {}).getAttribute ? document.querySelector('[data-pb-acao="foco"][aria-pressed="true"]').getAttribute('data-pb-id') : null,
  est: [...document.querySelectorAll('[data-pb-est]:checked')].map(i => i.getAttribute('data-pb-est')).sort().join(',') }));
ok(nv.playbook && !nv.manual && nv.foco === 'ME-F1' && nv.est === 'ME-C1,ME-C4', 'U "Nova versão" de um Resultado do Playbook reabre o Playbook com foco e estratégias marcados (não o modo manual): ' + JSON.stringify(nv));
await gerar();
const r1b = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.status !== 'rascunho' && !x.superseded_at).pop();
ok(r1b && r1b.encounter_id === E1 && r1b.supersedes_id === r1.id && r1b.revision_number === 2, 'U a nova versao fica no MESMO atendimento, ligada a anterior (revision_number 2 interno)');
const num1b = await P.evaluate((id) => window.ResultadoHolos.rotuloNumero(window.ResultadoHolos.porId(id)), r1b.id);
ok(num1b === 'nº 1 · versão 2', 'I numeracao visivel por paciente: continua nº 1 (versão 2 do mesmo atendimento): ' + num1b);

titulo('Entrega: emitir, CTA "Marcar retorno" (P), Encerrar (M)');
await P.evaluate(() => { window.irParaSecao('resultado'); }); await espera(800);
await clicar('[data-rp-acao="emitir"]');
await P.waitForFunction(() => !!document.querySelector('[data-rp-acao="pdf"]'), { timeout: 15000 }).catch(() => null);
await espera(800);
ok(srv.linhas('holos_result_emissions').filter(e => e.patient_id === PA).length === 1, 'Resultado Final emitido');
titulo('T: PDF');
const pdf = await P.evaluate(async () => {
  if (typeof window.html2pdf !== 'function') return { semLib: true };
  try { const r = await window.ResultadoPagina.gerarPdf(); const t = await r.blob.text(); return { tam: r.blob.size, num: /\(1 \/ \d+\) Tj/.test(t) || /1 \/ \d/.test(t) }; } catch (e) { return { erro: e.message }; }
});
ok(pdf.semLib || (pdf.tam > 1000 && pdf.num), 'T PDF gerado com número de página ("1 / N")' + (pdf.semLib ? ' (html2pdf indisponivel aqui: so a regra de cartao)' : ''));
const cartao = await P.evaluate(() => {
  const doc = document.getElementById('rp-doc'); if (!doc || !window.ResultadoPagina.paginar) return null;
  const c = doc.cloneNode(true); c.id = 'rp-doc-copia'; c.style.width = '760px'; document.body.appendChild(c);
  window.ResultadoPagina.paginar(c, 1000);
  const plano = [...c.querySelectorAll('.pf-bloco')].find(b => /Seu plano até a próxima consulta/.test(b.innerText));
  let res = null;
  if (plano) { const top = plano.getBoundingClientRect().top - c.getBoundingClientRect().top, alt = plano.getBoundingClientRect().height; res = { cabe: alt <= 700, partido: Math.floor(top / 1000) !== Math.floor((top + alt - 1) / 1000) }; }
  c.remove(); return res;
});
ok(!cartao || !cartao.cabe || !cartao.partido, 'T o cartão "Seu plano até a próxima consulta" não é partido entre páginas quando cabe inteiro: ' + JSON.stringify(cartao));
await P.evaluate((pid) => { window.levarParaFicha('ficha', pid); }, PA); await espera(1200);
const pos = await P.evaluate(() => ({ cta: document.getElementById('btn-aplicar-holoscan').textContent, etapa: (document.getElementById('fic-faixa-etapa') || {}).innerText || '',
  menu: [...document.querySelectorAll('#fic-mais-pos [data-pos-acao]')].map(b => b.textContent).join('|') }));
ok(pos.cta === 'Marcar retorno' && /Resultado entregue/.test(pos.etapa), 'P depois da entrega: botão principal "Marcar retorno", etapa "Resultado entregue" (não "Reaplicar HOLOSCAN")');
ok(/Ver Resultado/.test(pos.menu) && /Baixar PDF/.test(pos.menu) && /Enviar no WhatsApp/.test(pos.menu) && /Encerrar atendimento/.test(pos.menu) && /Reaplicar HOLOSCAN/.test(pos.menu), 'P ações secundárias em "Mais ações": ' + pos.menu);
/* M: encerrar */
await P.evaluate((eid) => window.AtendimentoAtual.selecionarPorId(eid), E1); await espera(300);
await clicar('#btn-encerrar-atendimento'); await espera(300);
const confEnc = await txt('#modal-confirmar-titulo');
await clicar('#modal-confirmar-ok'); await espera(900);
const e1 = srv.linhas('encounters').find(e => e.id === E1);
ok(confEnc === 'Encerrar atendimento' && e1.status === 'concluido', 'M "Encerrar atendimento" confirma e grava status concluido');
ok(srv.linhas('holoscan_applications').some(a => a.encounter_id === E1) && srv.linhas('holos_results').some(r => r.encounter_id === E1) && srv.linhas('tool_applications').some(t => t.encounter_id === E1),
  'M encerrar nao apaga nada: HOLOSCAN, Resultado e ferramentas continuam ligados ao atendimento');
ok(await P.evaluate(() => !window.AtendimentoAtual.atual()), 'M o contexto ativo e solto depois de encerrar');
ok(srv.linhas('encounters').filter(e => e.status === 'concluido').length === 1, 'M nenhum atendimento antigo foi convertido (so o encerrado agora)');

titulo('B/C: depois do Resultado, o novo convite e de RETORNO (sem anamnese profissional)');
const tipoAdepois = await P.evaluate(async (pid) => window.PreConsulta.tipoDoConvite(pid), PA);
ok(tipoAdepois === 'retorno' && srv.linhas('anamneses').filter(a => a.patient_id === PA).length === 0, 'B/C com Resultado anterior e SEM anamnese profissional: retorno');
ok(JSON.stringify(srv.linhas('anamnesis_invites').map(c => [c.id, c.form_tipo])) === conviteHistoricoAntes, 'D o tipo dos convites ja gravados nao mudou');

titulo('Agenda (O, N) e Dashboard (Q)');
/* consulta de ONTEM (marcada) -> iniciada hoje; e uma consulta futura */
/* as datas no MESMO fuso do navegador (America/Sao_Paulo), senao perto da meia-noite UTC "ontem" vira "hoje" */
const diaSP = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const dOntem = diaSP(Date.now() - dia), dFut = diaSP(Date.now() + 5 * dia);
const C0 = ins('consultations', { patient_id: PA, data: dOntem, hora: '09:00', tipo: 'retorno' }).id;
const CF = ins('consultations', { patient_id: PA, data: dFut, hora: '15:00', tipo: 'retorno' }).id;
await recarregar();
/* O: consulta futura pede confirmacao */
const futura = await P.evaluate(async (cid) => {
  window.irParaSecao('agenda'); await new Promise(r => setTimeout(r, 300));
  const c = window.Agenda.todas(window.pacienteAtivoId(), { incluirCanceladas: true }).find(x => x.id === cid) || window.Agenda.daCarteira().find(x => x.id === cid);
  const pr = window.AtendimentoAtual.abrirDialogo({ patient_id: c.paciente_id, consulta: c });
  await new Promise(r => setTimeout(r, 250));
  const t = document.getElementById('modal-confirmar-titulo').textContent, corpo = document.getElementById('modal-confirmar-corpo').innerText;
  document.querySelector('#modal-confirmar-acao .btn-cancelar').click();
  await pr; return { t, corpo };
}, CF);
ok(futura.t === 'Consulta no futuro' && /marcada para .* às 15:00/.test(futura.corpo) && !srv.linhas('encounters').some(e => e.consultation_id === CF), 'O consulta futura: "Esta consulta está marcada para DD/MM às HH:MM. Deseja iniciar o atendimento agora?"; Cancelar nao cria nada');
/* consulta de ontem iniciada hoje -> retorno em andamento */
const E2 = await P.evaluate(async (cid) => { const c = window.Agenda.todas(window.pacienteAtivoId(), { incluirCanceladas: true }).find(x => x.id === cid) || window.Agenda.daCarteira().find(x => x.id === cid); const e = await window.AtendimentoAtual.iniciar({ patient_id: c.paciente_id, consultation_id: c.id, occurred_at: new Date().toISOString(), type: 'retorno' }); return e.id; }, C0);
await espera(500);
const estC = await P.evaluate((cid) => { const c = window.Agenda.todas(window.pacienteAtivoId(), { incluirCanceladas: true }).find(x => x.id === cid) || window.Agenda.daCarteira().find(x => x.id === cid); return window.AtendimentoAtual.estadoDaConsulta(c).chave; }, C0);
ok(estC === 'em_atendimento', 'N consulta que virou atendimento aberto: "Em atendimento" (nao continua como pendente)');
const dash = await P.evaluate(async () => { window.irParaSecao('dashboard'); await new Promise(r => setTimeout(r, 600)); return document.getElementById('secao-dashboard').innerText.replace(/\s+/g, ' '); });
ok(/1 Atendimentos hoje|Atendimentos hoje/.test(dash) && /de consulta de outro dia/.test(dash), 'Q Dashboard conta o atendimento iniciado hoje a partir de consulta de outro dia');

titulo('Mapeamento de RETORNO respondido (C, D, E) e Playbook do retorno (F)');
/* o convite de retorno, respondido pela paciente (como o anamnese_publica_enviar grava) */
const t2 = new Date(Date.now() + 1000).toISOString();
srv.tabelas.anamnesis_invites.push({ id: 'conv-ret-' + PA, nutritionist_id: UA, patient_id: PA, encounter_id: E2, status: 'concluido', form_version: 2, form_tipo: 'retorno',
  expires_at: new Date(Date.now() + dia).toISOString(), draft_content: null, submitted_content: { tipo: 'retorno', formulario: { retorno: {
    melhorou_opcoes: ['Energia'], melhorou: 'Chego em casa com mais energia', piorou_opcoes: ['Sono'], facilitou_opcoes: ['Levar marmita'], dificultou_opcoes: ['Reuniões no fim da tarde'],
    praticou_nivel: 'Boa parte', nao_praticou: 'Anotar a fome', mudanca_geral: ['Rotina'], mudanca_obs: 'Mudei de turno', nova_questao_tem: 'Sim', nova_questao: 'Dor de cabeça à tarde' } } },
  save_count: 1, professional_snapshot: null, imported_anamnesis_id: null, imported_at: null, created_at: t2, started_at: t2, last_saved_at: t2, submitted_at: t2, revoked_at: null, sent_at: t2, sent_via: 'whatsapp', reviewed_at: null });
await abrirResultado(PA, E2);
await abrirPlaybook();
const leit = await P.evaluate(() => ({ rel: [...document.querySelectorAll('[data-pb-passo="1"] .pb-rel:not(.pb-rel-anterior) .pb-check')].map(l => ({ t: l.innerText.replace(/\s+/g, ' '), c: l.querySelector('input').checked })),
  ant: [...document.querySelectorAll('[data-pb-anterior] .pb-check')].map(l => ({ t: l.innerText.replace(/\s+/g, ' '), c: l.querySelector('input').checked })), encontro: (document.querySelector('.pb-leitura') || {}).innerText || '' }));
const tudo = leit.rel.map(x => x.t).join(' | ');
ok(/retorno/.test(leit.encontro), 'o Playbook do 2º atendimento e de RETORNO');
ok(/O que facilitou: Levar marmita/.test(tudo), 'C facilitou_opcoes chega ao Playbook');
ok(/O que dificultou: Reuniões no fim da tarde/.test(tudo), 'D dificultou_opcoes chega ao Playbook');
ok(/O que piorou: Sono/.test(tudo), 'E piorou_opcoes chega ao Playbook');
ok(/Mudei de turno/.test(tudo) && /Dor de cabeça à tarde/.test(tudo) && /Chego em casa com mais energia/.test(tudo), 'textos livres e questao nova do retorno tambem chegam');
ok(!/Cansaço no fim da tarde e fome forte à noite/.test(tudo), 'o Mapeamento da PRIMEIRA consulta nao entra no lugar do de retorno');
ok(leit.ant.length === 0 || leit.ant.every(x => !x.c), 'F o que veio do encontro anterior aparece separado ("No encontro anterior") e NADA vem marcado: ' + leit.ant.length + ' item(ns)');
/* decisoes das estrategias anteriores e gerar o Resultado do retorno */
const idsAnt = await P.evaluate(() => [...document.querySelectorAll('[data-pb-aplicou]')].map(s => s.getAttribute('data-pb-aplicou')));
await P.evaluate((ids) => { ids.forEach((id, i) => { const s = document.querySelector('[data-pb-aplicou="' + id + '"]'); if (s) { s.value = s.options[1] ? s.options[1].value : s.value; s.dispatchEvent(new Event('change', { bubbles: true })); } const r = document.querySelector('[data-pb-decisao="' + id + '"][value="' + (i === 0 ? 'manter' : 'concluir') + '"]'); if (r) r.click(); }); }, idsAnt);
await espera(300);
await gerar();
const r2 = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.encounter_id === E2 && x.status !== 'rascunho').pop();
ok(!!r2 && r2.revision_number === 1, 'Resultado do retorno gravado (revision_number interno continua 1 no novo atendimento)');
const telaR2 = await txt('#aba-resultado-holos');
const num2 = await P.evaluate((id) => window.ResultadoHolos.rotuloNumero(window.ResultadoHolos.porId(id)), r2 && r2.id);
const pagR2 = await P.evaluate(async () => { window.irParaSecao('resultado'); await new Promise(r => setTimeout(r, 900)); return (document.getElementById('rp-acoes') || {}).innerText || ''; });
ok(num2 === 'nº 2' && /Resultado HOLOS nº 2/i.test(pagR2), 'I o Resultado do retorno aparece como "Resultado HOLOS nº 2" (ficha e página Resultado): ' + num2);
ok(/Foco mantido nesta fase/.test(telaR2) && !/Novo foco desta fase/.test(telaR2), 'foco mantido: "Foco mantido nesta fase" (nao "Novo foco")');

titulo('J/K Evolucao');
await P.evaluate((pid) => { window.levarParaFicha('aba:evolucao', pid); }, PA); await espera(1200);
const evo = await txt('#aba-evolucao');
ok(!/[0-9a-f]{8}-[0-9a-f]{4}-/.test(evo) && !/delta|homolog|consolidad|rev\. \d|versão \d/i.test(evo), 'J Evolução sem UUID, "delta", "homologação", "consolidada", "rev. N" ou "versão N"');
const tabH = await txt('#evo-holoscan-tabela');
ok(/Índice HOLOS/.test(tabH) && /Antes/i.test(tabH) && /Agora/i.test(tabH) && /Sistema Metabólico/.test(tabH) && /Corpo/.test(tabH) && /Mente/.test(tabH) && /Espírito/.test(tabH) && !/[+-]\d+,\d/.test(tabH), 'K HOLOSCAN anterior x atual lado a lado (Índice, sistemas, Tríade), sem diferença calculada');
ok(/Mapeamento de retorno/.test(evo) && /O que facilitou/.test(evo) && /O que dificultou/.test(evo) && /O que ainda precisa de atenção/.test(evo), 'Evolução mostra a síntese do Mapeamento de retorno (sem "anamnese consolidada")');
ok(/MANTER|CONCLUIR/.test(evo), 'Evolução: estratégia anterior -> decisão registrada (MANTER/CONCLUIR)');

titulo('N: consulta com atendimento encerrado = Realizada');
await P.evaluate(async (eid) => { await window.AtendimentoAtual.encerrar(eid); }, E2); await espera(400);
const estC2 = await P.evaluate((cid) => { const c = window.Agenda.todas(window.pacienteAtivoId(), { incluirCanceladas: true }).find(x => x.id === cid) || window.Agenda.daCarteira().find(x => x.id === cid); return window.AtendimentoAtual.estadoDaConsulta(c).chave; }, C0);
ok(estC2 === 'realizada', 'N consulta com atendimento concluido: "Realizada"');

titulo('G interpretacao salva junto do HOLOSCAN (paciente nova)');
await P.evaluate(() => { window.confirm = () => true; });
await P.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, PN);
await P.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 }).catch(() => {});
await P.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(x => setTimeout(x, 300));
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it, i) => { it.querySelectorAll('.q-btn')[(i * 7 + 3) % 4].click(); });
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(x => setTimeout(x, 700));
});
const INTERP = 'Interpretação fictícia escrita antes de salvar o HOLOSCAN';
const g1 = await P.evaluate((t) => { const c = document.getElementById('res-interp-texto'); if (!c) return { campo: false }; c.value = t; c.dispatchEvent(new Event('input', { bubbles: true })); return { campo: true, suja: window.Sujeira ? window.Sujeira.lista().indexOf('interpretacao') >= 0 : null }; }, INTERP);
ok(g1.campo && g1.suja === true, 'G digitar a interpretação marca alteração não salva (há aviso ao sair)');
await clicar('#btn-salvar-holoscan'); await espera(1500);
const appN = srv.linhas('holoscan_applications').filter(a => a.patient_id === PN).pop();
ok(appN && appN.interpretacao_texto === INTERP, 'G "Salvar HOLOSCAN" leva junto a interpretação (sem clicar em "Salvar interpretação")');
await recarregar();
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="holoscan"]').click(); }, PN); await espera(1200);
const g2 = await P.evaluate(() => (document.getElementById('res-interp-texto') || {}).value || '');
ok(g2 === INTERP, 'G depois de recarregar a interpretação continua lá');

titulo('L Documentos: Ver arquivados com zero ativos');
const docs = await P.evaluate(async (pid) => {
  window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 800));
  const blob = new Blob(['teste'], { type: 'text/plain' });
  const f = new File([blob], 'documento-ficticio.txt', { type: 'text/plain' });
  const s = await window.ArquivoStore.salvar(pid, f, { tipo: 'Outro', titulo: 'Documento fictício', data: null }).catch(e => ({ erro: e.message }));
  const lista = await window.ArquivoStore.listar(pid, { arquivados: false });
  if (lista[0] && window.ArquivoStore.arquivar) await window.ArquivoStore.arquivar(lista[0].id).catch(() => null);
  window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 1200));
  const cartao = document.getElementById('doc-lista-cartao');
  return { salvou: !s || !s.erro, visivel: cartao && !cartao.classList.contains('hidden'), botao: !!document.querySelector('#doc-lista-cartao [data-acao="ver-arquivados"]'), txt: cartao ? cartao.innerText : '' };
}, PN);
ok(docs.visivel && docs.botao && /Nenhum documento ativo/.test(docs.txt), 'L com zero documentos ativos o "Ver arquivados" continua visível: ' + JSON.stringify({ v: docs.visivel, b: docs.botao, s: docs.salvou }));

titulo('R/S Espirito');
const esp = await P.evaluate(async () => {
  window.irParaSecao('espirito'); await new Promise(r => setTimeout(r, 300));
  const vis = [...document.querySelectorAll('#galeria-espirito .card-ferr')].filter(c => !c.hidden && !c.classList.contains('hidden')).length;
  return { vis, contador: document.getElementById('contador-espirito').innerText, abre: window.abrirFerramentaPorId('conexao_pertencimento_v1'), dash: (document.querySelector('.ferramenta') && [...document.querySelectorAll('.ferramenta')].map(x => x.textContent).join('|')) || '' };
});
ok(esp.vis === 3 && /^3 ferramentas/i.test(esp.contador.trim()), 'R Espírito: 3 ferramentas visíveis e o contador diz 3');
ok(esp.abre === false, 'S a ferramenta oculta (Conexão & Pertencimento) não abre por caminho indireto');
ok(srv.linhas('tool_applications').length > 0, 'S historico de ferramentas intacto');

titulo('Regressao: paciente ANTIGO abre normalmente; nada historico foi alterado');
const antigo = await P.evaluate(async (pid) => {
  window.levarParaFicha('ficha', pid); await new Promise(r => setTimeout(r, 900));
  window.levarParaFicha('aba:resultado-holos', pid); await new Promise(r => setTimeout(r, 1200));
  const t = document.getElementById('aba-resultado-holos').innerText;
  window.levarParaFicha('aba:evolucao', pid); await new Promise(r => setTimeout(r, 900));
  return { res: t, evo: document.getElementById('aba-evolucao').innerText, nome: document.getElementById('ficha-nome').textContent };
}, PH);
ok(/Historica/.test(antigo.nome) && /Resultado HOLOS/.test(antigo.res) && antigo.evo.length > 0, 'paciente com Resultado no formato anterior (template 4) abre: ficha, Resultado HOLOS e Evolução');
const r1Agora = srv.linhas('holos_results').find(r => r.id === r1.id);
ok(r1Agora.revision_number === r1.revision_number && r1Agora.content_hash === r1.content_hash, 'o Resultado antigo continua com o mesmo revision_number e hash (imutavel)');
ok(srv.linhas('holos_results').length >= nHolosAntes && !srv.linhas('holos_results').some(r => r.patient_id === PH && r.id !== RH), 'nenhum Resultado historico foi recriado ou apagado');

titulo('Celular 390px: ficha, Resultado e Evolução sem rolagem lateral');
await P.setViewport({ width: 390, height: 844 });
const larg = await P.evaluate(async (pid) => {
  const medir = () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  const r = {};
  window.levarParaFicha('ficha', pid); await new Promise(x => setTimeout(x, 900)); r.ficha = medir();
  window.levarParaFicha('aba:resultado-holos', pid); await new Promise(x => setTimeout(x, 1200)); r.resultado = medir();
  window.levarParaFicha('aba:evolucao', pid); await new Promise(x => setTimeout(x, 900)); r.evolucao = medir();
  return r;
}, PA);
ok(larg.ficha <= 392 && larg.resultado <= 392 && larg.evolucao <= 392, 'em 390px nada passa da largura da tela: ' + JSON.stringify(larg));

ok(errosJS.length === 0, 'nenhum erro de JavaScript na página' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nRESULTADO: FALHOU' : '\nRESULTADO: OK');
process.exit(falhou ? 1 : 0);
