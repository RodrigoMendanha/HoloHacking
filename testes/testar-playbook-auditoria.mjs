/**
 * AUDITORIA DO PLAYBOOK (PB-V1) — o Resultado gerado e REAL de acordo com o HOLOSCAN e as ferramentas, os botoes funcionam e tudo
 * fica sincronizado (servidor falso, dados ficticios).
 *   A1  coerencia com o HOLOSCAN: as areas prioritarias do assistente sao as mesmas do Resultado ("Areas que merecem mais
 *       atencao") e o foco/estrategias vem dessas areas
 *   A2  ferramentas: o que o paciente respondeu nelas aparece no passo 1 e entra em Corpo · Mente · Espirito / desejos;
 *       "Ferramentas utilizadas" lista as ferramentas do atendimento
 *   A3  botoes: outros sistemas, ajustar (edicao vai para o Resultado), gerais, desmarcar relato, foco escrito, voltar
 *   A4  sincronizacao: a pagina Resultado mostra o Resultado do Playbook como vigente; Emitir + PDF real (2 a 5 paginas)
 *   A5  sem HOLOSCAN: mensagem clara, nada gravado; paciente arquivado: botao desabilitado
 *   A6  celular (390 px): sem rolagem lateral
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const H2P_LOCAL = '/tmp/claude-0/-home-user-HoloHacking/2536f0de-9516-5291-b095-34b766c5940f/scratchpad/h2p/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js';
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Auditoria', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA, { nome: 'Paciente Ficticia Auditoria' });
const { PA, E1, ins } = fx;
/* ferramentas que faltavam na fixture (respostas ficticias do paciente) */
ins('tool_applications', { patient_id: PA, encounter_id: E1, ferramenta_id: 'gatilhos_respostas_v1', versao_ferramenta: '1', status: 'concluida', iniciada_em: agora, concluida_em: agora,
  respostas: { contexto: 'Chegar em casa depois do trabalho', gatilho: 'Cansaço e fome acumulada', resposta: 'Belisco o que tiver', alternativa: 'Comer o lanche planejado antes de sair' } });
const PSEM = ins('patients', { nome: 'Paciente Ficticia Sem Holoscan' }).id;
ins('encounters', { patient_id: PSEM, occurred_at: agora, timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' });
const PARQ = ins('patients', { nome: 'Paciente Ficticia Arquivada', status: 'inativo' }).id;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1366, height: 1000 });
await P.emulateTimezone('America/Sao_Paulo');
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
const espera = ms => new Promise(r => setTimeout(r, ms));
const txt = (sel) => P.evaluate(s => { const el = document.querySelector(s); return el ? el.innerText : ''; }, sel);
const clicar = (sel) => P.evaluate(s => { const el = document.querySelector(s); if (el) el.click(); return !!el; }, sel);
const marcar = (sel) => P.evaluate(s => { const el = document.querySelector(s); if (!el) return false; el.click(); return el.checked; }, sel);
const digitar = (sel, v) => P.evaluate((s, v) => { const i = document.querySelector(s); i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); }, sel, v);

async function abrir(pid, eid) {
  await P.evaluate((pid, eid) => { window.definirPacienteAtivo(pid); if (eid) window.AtendimentoAtual.selecionarPorId(eid); window.levarParaFicha('aba:resultado-holos', pid); }, pid, eid);
  await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"], #aba-resultado-holos [data-rh-acao="voltar"]'), { timeout: 15000 });
  await clicar('#aba-resultado-holos [data-rh-acao="voltar"]');
  await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'), { timeout: 15000 });
}
async function abrirPlaybook() {
  await clicar('#aba-resultado-holos [data-rh-acao="playbook"]');
  await P.waitForFunction(() => { const w = document.querySelector('#aba-resultado-holos .pb-wiz'); return w && !/Preparando o Playbook/.test(w.innerText); }, { timeout: 15000 });
}

/* A5 — sem HOLOSCAN / arquivado */
await abrir(PSEM, null);
await abrirPlaybook();
ok(/Aplique e salve o HOLOSCAN deste paciente primeiro/.test(await txt('#aba-resultado-holos .pb-wiz')) && !(await P.$('[data-pb-passo]')), 'A5 sem HOLOSCAN: mensagem clara e nenhum passo para preencher');
ok(srv.linhas('holos_results').filter(r => r.patient_id === PSEM).length === 0, 'A5 nada gravado para o paciente sem HOLOSCAN');
await clicar('[data-pb-acao="sair"]'); await espera(300);
ok(!!(await P.$('#aba-resultado-holos [data-rh-acao="playbook"]')) && !(await P.$('.pb-wiz')), 'A3 "Voltar" sai do assistente para o histórico');
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.levarParaFicha('aba:resultado-holos', pid); }, PARQ);
await espera(1200);
ok(await P.evaluate(() => { const b = document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'); return !!b && b.disabled; }), 'A5 paciente arquivado: "Montar com o Playbook" desabilitado');

/* A1/A2 — leitura */
await abrir(PA, E1);
await abrirPlaybook();
const prioAssist = await P.evaluate(() => [...document.querySelectorAll('[data-pb-passo="1"] .pb-chip-sis')].map(c => c.textContent.replace(/^\dª área: /, '')));
ok(prioAssist.length === 2, 'A1 o assistente mostra 2 áreas prioritárias: ' + prioAssist.join(', '));
const leitura = await txt('[data-pb-passo="1"]');
ok(/O que apareceu nas ferramentas/i.test(leitura) && /levar um lanche pronto de casa/.test(leitura) && /sentir que dou conta da minha rotina/.test(leitura) && /Cansaço e fome acumulada/.test(leitura),
  'A2 passo 1 traz o que o paciente respondeu nas ferramentas (OQ³, Escada dos Porquês, Gatilhos)');
ok(/Gatilhos & Respostas/.test(leitura), 'A2 Gatilhos & Respostas entra na lista de ferramentas do atendimento');

/* A3 — botoes */
await clicar('[data-pb-acao="outros"]'); await espera(200);
ok((await P.$$('[data-pb-passo="2"] .pb-focos-grupo')).length === 5, 'A3 "Ver focos de outros sistemas" mostra os 5 sistemas');
await clicar('[data-pb-acao="outros"]'); await espera(200);
ok((await P.$$('[data-pb-passo="2"] .pb-focos-grupo')).length === 2, 'A3 e esconde de novo');
await clicar('[data-pb-acao="foco"][data-pb-id="LIVRE"]'); await espera(200);
ok(!!(await P.$('[data-pb-livre]')), 'A3 "Escrever outro foco" abre o campo do foco');
const focoCartao = await P.evaluate(() => document.querySelector('[data-pb-passo="2"] .pb-focos .pb-foco').getAttribute('data-pb-id'));
await clicar('[data-pb-acao="foco"][data-pb-id="' + focoCartao + '"]'); await espera(200);
await clicar('[data-pb-acao="ajustar"]'); await espera(200);
ok((await P.$$('[data-pb-dir]')).length === 4 && (await P.$$('[data-pb-obs]')).length === 3 && !!(await P.$('[data-pb-prox]')), 'A3 "Ajustar o que vem com o foco" abre direcionamentos, observe e próxima etapa');
await digitar('[data-pb-dir="0:titulo"]', 'Direcionamento ajustado pela nutricionista');
await digitar('[data-pb-prox]', 'Revisar os horários no próximo encontro (ajustado).');
const ests = await P.evaluate(() => [...document.querySelectorAll('[data-pb-passo="3"] .pb-est')].filter(e => e.querySelector('.pb-chip-foco')).map(e => e.querySelector('[data-pb-est]').getAttribute('data-pb-est')));
ok(ests.length === 12, 'A1 12 estratégias do sistema do foco no topo');
const doSistema = ests.slice(0, 3);
for (const id of doSistema) { await marcar('[data-pb-est="' + id + '"]'); await espera(120); }
await clicar('[data-pb-acao="gerais"]'); await espera(200);
ok((await P.$$('[data-pb-est^="G"]')).length === 13 && !(await P.$('[data-pb-est="G12"]')) && !(await P.$('[data-pb-est="G15"]')), 'A3 "Ver estratégias gerais" mostra 13 (G12 e G15 só com a Roda da Vida / Carta aplicadas)');
await marcar('[data-pb-est="G10"]'); await espera(120);
/* desmarcar um relato: nao pode ir para o Resultado */
const desmarcado = await P.evaluate(() => { const c = [...document.querySelectorAll('[data-pb-rel]')].find(x => x.checked && /Belisco quando chego em casa/.test(x.closest('label').innerText)); if (!c) return null; c.click(); return c.closest('label').innerText.trim(); });
ok(!!desmarcado, 'A3 desmarcar um item do relato');
await clicar('[data-pb-acao="gerar"]');
await P.waitForFunction(() => !document.querySelector('#aba-resultado-holos .pb-wiz') && !!document.querySelector('#aba-resultado-holos #rh-doc'), { timeout: 15000 }).catch(() => null);
await espera(500);
const r = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.status !== 'rascunho').pop();
const dp = r && r.content_snapshot && r.content_snapshot.direcao_paciente;
ok(!!dp, 'A3 "Gerar Resultado" grava o Resultado');
ok(dp && dp.direcionamentos[0].texto === 'Direcionamento ajustado pela nutricionista' && /\(ajustado\)/.test((dp.proxima_etapa || {}).texto || ''), 'A3 os ajustes do foco vão para o Resultado');
ok(dp && ![].concat(dp.dores, dp.momento, dp.desejos).some(x => /Belisco quando chego em casa/.test(x.texto)), 'A3 o item desmarcado não vai para o Resultado');
ok(dp && dp.estrategias.length === 4 && dp.estrategias.some(e => /avanço|deu certo/i.test(e.texto + e.acao)), 'A3 3 estratégias do sistema + 1 geral no plano');

/* A2 — ferramentas no Resultado */
const cme = dp ? [].concat(dp.corpo.itens, dp.mente.itens, dp.espirito.itens).map(x => x.texto).join(' | ') : '';
ok(/levar um lanche pronto de casa/.test(cme) && /sentir que dou conta da minha rotina/.test(cme), 'A2 Corpo · Mente · Espírito trazem o que o paciente respondeu nas ferramentas');
ok(dp && dp.desejos.some(d => /OQ³|chegar à noite com menos fome/.test(d.texto)), 'A2 o desejo declarado no OQ³ entra em "O que você quer construir"');
const doc = await txt('#aba-resultado-holos #rh-doc');
ok(/Ferramentas utilizadas/i.test(doc) && /Mapa da Rotina/.test(doc) && /OQ³/.test(doc) && /Gatilhos/.test(doc), 'A2 "Ferramentas utilizadas" lista as ferramentas do atendimento');

/* A1 — mesmas areas do Resultado */
const areasDoc = await P.evaluate(() => { const l = document.querySelector('#rh-doc .pf-areas'); return l ? [...l.querySelectorAll('li b')].map(b => b.textContent.trim()) : []; });
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
ok(areasDoc.length === 2 && areasDoc.every((a, i) => norm(a).indexOf(norm(prioAssist[i]).slice(0, 6)) >= 0 || norm(prioAssist[i]).indexOf(norm(a).slice(0, 6)) >= 0),
  'A1 áreas do assistente = "Áreas que merecem mais atenção" do Resultado: ' + areasDoc.join(', ') + ' × ' + prioAssist.join(', '));
const sisFoco = r && r.direcao.foco_atual.id.replace(/^pb1-/, '').split('-')[0];
ok(['ME', 'DL', 'FU', 'AI', 'MEE'].includes(sisFoco) && r.direcao.estrategias.filter(e => /^pb1-(ME|DL|FU|AI|MEE)-/.test(e.id)).every(e => e.id.indexOf('pb1-' + sisFoco + '-') === 0),
  'A1 o foco e as estratégias marcadas são do mesmo sistema prioritário (' + sisFoco + ')');

/* A4 — sincronizacao com a pagina Resultado + PDF real */
if (existsSync(H2P_LOCAL)) await P.addScriptTag({ path: H2P_LOCAL }).catch(() => null);
const pag = await P.evaluate(async () => {
  window.irParaSecao('resultado');
  await new Promise(r => setTimeout(r, 1200));
  const vig = window.ResultadoPagina.resultadoFinal(window.pacienteAtivoId());
  return { id: vig && vig.id, texto: (document.getElementById('secao-resultado') || {}).innerText || '' };
});
ok(pag.id === r.id, 'A4 a página Resultado usa o Resultado do Playbook como vigente');
const focoTxt = r.direcao.foco_atual.texto;
ok(pag.texto.indexOf(focoTxt.slice(0, 30)) >= 0, 'A4 a página Resultado mostra o foco escolhido');
const pdf = await P.evaluate(async () => {
  if (typeof window.html2pdf !== 'function') return { erro: 'sem html2pdf' };
  try {
    const res = await window.ResultadoPagina.emitirEPdf();
    const buf = new Uint8Array(await res.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return { b64: btoa(s), paginas: (s.match(/\/Type\s*\/Page[^s]/g) || []).length };
  } catch (e) { return { erro: e.message }; }
});
if (pdf.erro) ok(/html2pdf/.test(pdf.erro), 'A4 PDF: gerador indisponível offline (' + pdf.erro + ')');
else {
  ok(pdf.paginas >= 2 && pdf.paginas <= 5, 'A4 Emitir + PDF real do Resultado do Playbook: ' + pdf.paginas + ' páginas (meta 2 a 5)');
  ok(srv.linhas('holos_result_emissions').some(x => x.holos_result_id === r.id), 'A4 emissão (Resultado Final) registrada para este Resultado');
  if (process.env.PDF_DIR) { mkdirSync(process.env.PDF_DIR, { recursive: true }); writeFileSync(process.env.PDF_DIR + '/pdf-playbook-primeira-consulta.pdf', Buffer.from(pdf.b64, 'base64')); }
}

/* A6 — celular */
await P.setViewport({ width: 390, height: 900 });
await abrir(PA, E1);
await abrirPlaybook();
await clicar('[data-pb-acao="foco"][data-pb-id="' + focoCartao + '"]'); await espera(300);
const lateral = await P.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(lateral <= 1, 'A6 celular 390 px: sem rolagem lateral (' + lateral + ' px)');
if (process.env.CAPTURAS_DIR) await P.screenshot({ path: process.env.CAPTURAS_DIR + '/playbook-6-celular.png', fullPage: true });

ok(errosJS.length === 0, 'sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
