/**
 * MONTAR COM O PLAYBOOK (PB-V1) — Resultado HOLOS sem IA, de ponta a ponta no navegador (servidor falso, dados ficticios).
 *   W1  o botao "Montar com o Playbook" abre o assistente na aba Resultado HOLOS (e o atalho na aba Holos IA)
 *   W2  passo 1: areas prioritarias do HOLOSCAN, ferramentas, Linha do Momentum e o relato do Mapeamento/anamnese
 *   W3  passo 2: 3 focos por area prioritaria; sem foco nao gera
 *   W4  passo 3: estrategias do sistema do foco primeiro, "combina com" das ferramentas, edicao, limite de 6
 *   W5  previa = o documento do paciente; Gerar grava o Resultado (template 5) com a direcao escolhida, rastreavel ao playbook
 *   W6  RETORNO: estrategias anteriores com decisao (manter / ajustar / concluir / substituir), foco mantido, nova estrategia;
 *       o documento do retorno mostra o que foi possivel fazer e o que manter e ajustar
 *   W7  sem erro de JavaScript; capturas para a revisao
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const CAP = process.env.CAPTURAS_DIR || null;
if (CAP) mkdirSync(CAP, { recursive: true });
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Playbook', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA, { nome: 'Paciente Ficticia Playbook' });
const { PA, E1 } = fx;

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
const capturar = async (nome) => { if (CAP) await P.screenshot({ path: CAP + '/' + nome + '.png', fullPage: true }); };

async function abrirResultado(eid) {
  await P.evaluate((pid, eid) => { window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid); window.levarParaFicha('aba:resultado-holos', pid); }, PA, eid);
  await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'), { timeout: 15000 });
}
async function abrirPlaybook() {
  await clicar('#aba-resultado-holos [data-rh-acao="playbook"]');
  await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos .pb-wiz [data-pb-passo="2"]') || /q-erro/.test((document.querySelector('#aba-resultado-holos .pb-wiz') || {}).innerHTML || ''), { timeout: 15000 });
}

/* W1 */
await abrirResultado(E1);
const botao = await P.evaluate(() => { const b = document.querySelector('#aba-resultado-holos [data-rh-acao="playbook"]'); return b ? { t: b.textContent, d: b.disabled } : null; });
ok(botao && botao.t === 'Montar com o Playbook' && !botao.d, 'W1 botão "Montar com o Playbook" na aba Resultado HOLOS');
await abrirPlaybook();
ok(!!(await P.$('#aba-resultado-holos .pb-wiz')), 'W1 o assistente abre dentro da aba Resultado HOLOS');

/* W2 */
const leitura = await txt('#aba-resultado-holos [data-pb-passo="1"]');
ok(/1ª área: Metabólico/.test(leitura) && /2ª área: /.test(leitura), 'W2 áreas prioritárias do HOLOSCAN (Metabólico em 1º): ' + (leitura.match(/1ª área[^\n]*/) || [''])[0]);
ok(/Mapa da Rotina/.test(leitura) && /Escada dos Porquês|PQQ/.test(leitura), 'W2 ferramentas concluídas do atendimento');
ok(/Linha do Momentum/.test(leitura) && /Reorganizar/.test(leitura), 'W2 estado da Linha do Momentum');
ok(/Cansaço no fim da tarde e fome forte à noite/.test(leitura) && /Ter mais disposição à tarde/.test(leitura), 'W2 o que o paciente contou (anamnese) para marcar');
const relMarcados = await P.evaluate(() => [...document.querySelectorAll('[data-pb-rel]')].filter(c => c.checked).length);
ok(relMarcados >= 2, 'W2 relato já marcado (' + relMarcados + ' itens), a nutricionista desmarca o que não quiser');

/* W3 */
const focos = await P.evaluate(() => [...document.querySelectorAll('[data-pb-passo="2"] .pb-focos-grupo')].map(g => ({ t: g.querySelector('.pb-grupo-tit').textContent, n: g.querySelectorAll('.pb-foco').length })));
ok(focos.length === 2 && focos.every(g => g.n === 3) && /1ª área prioritária · Metabólico/.test(focos[0].t), 'W3 3 focos para cada área prioritária: ' + focos.map(g => g.t).join(' | '));
await clicar('[data-pb-acao="gerar"]'); await espera(300);
ok(/Escolha o Foco desta fase/.test(await txt('#pb-msg')), 'W3 sem foco o Resultado não é gerado');
await clicar('[data-pb-acao="foco"][data-pb-id="ME-F1"]'); await espera(300);
ok(await P.evaluate(() => document.querySelector('[data-pb-id="ME-F1"]').getAttribute('aria-pressed') === 'true'), 'W3 foco ME-F1 escolhido');
await capturar('playbook-1-leitura-foco');

/* W4 */
const ests = await P.evaluate(() => [...document.querySelectorAll('[data-pb-passo="3"] .pb-coluna')].map(c => [...c.querySelectorAll('[data-pb-est]')].map(i => i.getAttribute('data-pb-est'))));
ok(ests.length === 3 && ests[0][0].startsWith('ME-') && ests[1][0].startsWith('ME-') && ests[2][0].startsWith('ME-'), 'W4 em Corpo, Mente e Espírito, primeiro as do sistema do foco: ' + ests.map(c => c[0]).join(', '));
const combina = await P.evaluate(() => { const el = document.querySelector('[data-pb-est="ME-C1"]').closest('.pb-est'); return el.innerText; });
ok(/Combina com .*Mapa da Rotina/.test(combina), 'W4 selo "combina com" a ferramenta aplicada');
ok(/Reorganizar/.test(await txt('.pb-contador')) && /3 a 4/.test(await txt('.pb-contador')), 'W4 orientação da Linha do Momentum (3 a 4 estratégias)');
for (const id of ['ME-C1', 'ME-C4', 'ME-M1']) { await marcar('[data-pb-est="' + id + '"]'); await espera(150); }
await P.evaluate(() => { const i = document.querySelector('[data-pb-campo="ME-C4:acao"]'); i.value = 'Levar um lanche pronto para as 16h.'; i.dispatchEvent(new Event('input', { bubbles: true })); });
const campos = await P.evaluate(() => ({ c: document.querySelector('[data-pb-campo="ME-C1:contexto"]').value, o: document.querySelector('[data-pb-campo="ME-C1:observar"]').value }));
ok(campos.c === 'Todos os dias.' && /energia/.test(campos.o), 'W4 ao marcar, os campos vêm preenchidos (quando, o que observar)');
await clicar('[data-pb-acao="gerais"]'); await espera(150);
for (const id of ['G01', 'G04', 'G10']) { await marcar('[data-pb-est="' + id + '"]'); await espera(150); }
const lim = await P.evaluate(() => ({ n: document.querySelectorAll('[data-pb-est]:checked').length, bloq: document.querySelector('[data-pb-est="G11"]').disabled, cont: document.querySelector('.pb-contador').innerText }));
ok(lim.n === 6 && lim.bloq && /6/.test(lim.cont), 'W4 limite de 6 estratégias (a 7ª fica bloqueada)');
for (const id of ['G01', 'G04', 'G10']) { await marcar('[data-pb-est="' + id + '"]'); await espera(120); }
await capturar('playbook-2-estrategias');

/* W5 */
await clicar('[data-pb-acao="previa"]'); await espera(400);
const previa = await txt('.pb-previa');
ok(/PRÉVIA/.test(previa) && /Foco desta fase/.test(previa) && /Organizar os horários das refeições/.test(previa) && /Horários âncora/i.test(previa) && /Levar um lanche pronto para as 16h/.test(previa),
  'W5 prévia = documento do paciente com o foco, o plano e a edição');
await clicar('[data-pb-acao="gerar"]');
await P.waitForFunction(() => !document.querySelector('#aba-resultado-holos .pb-wiz') && !!document.querySelector('#aba-resultado-holos #rh-doc'), { timeout: 15000 }).catch(() => null);
await espera(500);
const r1 = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.status !== 'rascunho').pop();
const d1 = r1 && r1.direcao, dp1 = r1 && r1.content_snapshot && r1.content_snapshot.direcao_paciente;
ok(!!r1 && r1.template_version === 5 && r1.encounter_id === E1, 'W5 Resultado HOLOS gravado (template 5) no atendimento');
ok(d1 && d1.foco_atual && d1.foco_atual.id.startsWith('pb1-ME-F1') && d1.foco_atual.confirmado && d1.foco_atual.origem === 'nutricionista', 'W5 foco gravado, confirmado, rastreável ao playbook (ME-F1)');
ok(d1 && d1.estrategias.length === 3 && d1.estrategias.map(e => window_origem(e.id)).join(',') === 'ME-C1,ME-C4,ME-M1', 'W5 3 estratégias escolhidas, na ordem, com o id do playbook');
ok(dp1 && dp1.estrategias.some(e => e.acao === 'Levar um lanche pronto para as 16h.') && dp1.direcionamentos.length === 2 && dp1.observar.length === 3 && dp1.proxima_etapa,
  'W5 visão do paciente: edição, 2 direcionamentos, observe e próxima etapa');
ok(dp1 && dp1.momento.some(m => /Cansaço no fim da tarde/.test(m.texto)), 'W5 o relato marcado entra em "Seu momento agora"');
ok(/Playbook HOLOS PB-V1 · Foco ME-F1 · Estratégias ME-C1, ME-C4, ME-M1/.test(r1.leitura_profissional || ''), 'W5 leitura profissional registra versão e ids do playbook');
const doc1 = await txt('#aba-resultado-holos #rh-doc');
ok(/Foco desta fase/.test(doc1) && /Seu plano até a próxima consulta/.test(doc1) && /Corpo · Mente · Espírito/.test(doc1) && !/RESULTADO EM CONSTRUÇÃO/.test(doc1), 'W5 o Resultado abre pronto na visão do paciente');
await capturar('playbook-3-resultado-gerado');

/* W6 — retorno */
fx.retorno();
await P.reload({ waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await abrirResultado(fx.E2);
await abrirPlaybook();
const ret = await txt('#aba-resultado-holos [data-pb-passo="1b"]');
ok(/Como foi desde o último encontro/.test(ret) && /Horários âncora/.test(ret) && /Preparar o horário difícil/.test(ret), 'W6 retorno: as estratégias do encontro anterior para acompanhar');
ok(await P.evaluate(() => { const r = document.querySelector('[data-pb-manter="sim"]'); return !!r && r.checked; }), 'W6 "Manter o foco" vem marcado');
await clicar('[data-pb-acao="gerar"]'); await espera(300);
ok(/Registre a decisão de cada estratégia/.test(await txt('#pb-msg')), 'W6 sem decisão das estratégias anteriores não gera');
const idsAnt = await P.evaluate(() => [...document.querySelectorAll('[data-pb-aplicou]')].map(s => s.getAttribute('data-pb-aplicou')));
const dec = ['manter', 'ajustar', 'concluir'];
for (let i = 0; i < idsAnt.length; i++) {
  await P.evaluate((id, d, ap) => {
    const s = document.querySelector('[data-pb-aplicou="' + id + '"]'); s.value = ap; s.dispatchEvent(new Event('change', { bubbles: true }));
    const r = document.querySelector('[data-pb-decisao="' + id + '"][value="' + d + '"]'); r.click();
  }, idsAnt[i], dec[i] || 'substituir', i === 2 ? 'nao' : 'sim');
  await espera(150);
}
await P.evaluate((id) => { const i = document.querySelector('[data-pb-ajuste="' + id + '"]'); i.value = 'Levar o lanche também nos dias de reunião.'; i.dispatchEvent(new Event('input', { bubbles: true })); }, idsAnt[1]);
await marcar('[data-pb-est="ME-M2"]'); await espera(150);
ok(/3<\/b> de até 6|3 de até 6/.test(await P.evaluate(() => document.querySelector('.pb-contador').innerHTML)) || /\b3\b de até 6/.test(await txt('.pb-contador')), 'W6 contador soma as continuadas (2) e a nova (1)');
await capturar('playbook-4-retorno');
await clicar('[data-pb-acao="gerar"]');
await P.waitForFunction(() => !document.querySelector('#aba-resultado-holos .pb-wiz') && !!document.querySelector('#aba-resultado-holos #rh-doc'), { timeout: 15000 }).catch(() => null);
await espera(500);
const r2 = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.status !== 'rascunho' && x.encounter_id === fx.E2).pop();
const d2 = r2 && r2.direcao, dp2 = r2 && r2.content_snapshot && r2.content_snapshot.direcao_paciente;
ok(!!r2 && d2.tipo === 'retorno', 'W6 Resultado do retorno gravado');
ok(d2 && d2.acompanhamento_estrategias.length === 3 && d2.acompanhamento_estrategias.every(a => a.decisao && a.estrategia && a.estrategia.resultado_id === r1.id),
  'W6 acompanhamento das 3 estratégias anteriores, cada uma com decisão e ligada ao Resultado anterior');
ok(d2 && d2.estrategias.length === 3 && d2.estrategias[0].status === 'manter' && d2.estrategias[1].status === 'ajustar' && d2.estrategias[1].acao === 'Levar o lanche também nos dias de reunião.' && window_origem(d2.estrategias[2].id) === 'ME-M2',
  'W6 plano: mantida + ajustada (com a edição) + 1 nova do playbook');
ok(d2 && d2.foco_atual && d2.foco_atual.texto === d1.foco_atual.texto && d2.foco_atual.origem === 'resultado_anterior', 'W6 foco mantido do encontro anterior');
const doc2 = await txt('#aba-resultado-holos #rh-doc');
ok(/O que foi possível fazer/i.test(doc2) && /O que manter e o que ajustar/i.test(doc2) && /Vamos manter/i.test(doc2) && /Vamos ajustar/i.test(doc2), 'W6 documento do retorno: o que foi possível fazer e o que manter e ajustar');
await capturar('playbook-5-retorno-gerado');

/* W1 (atalho) */
await P.evaluate((pid) => window.levarParaFicha('aba:holos-ai', pid), PA);
await espera(1000);
const atalho = await P.evaluate(() => { const b = document.querySelector('[data-hai-acao="playbook"]'); return b ? b.closest('p').innerText : ''; });
ok(/Sem IA\? Monte o Resultado com o Playbook/.test(atalho), 'W1 atalho na aba Holos IA');
await clicar('[data-hai-acao="playbook"]');
await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos .pb-wiz'), { timeout: 10000 }).catch(() => null);
ok(!!(await P.$('#aba-resultado-holos .pb-wiz')), 'W1 o atalho abre o assistente na aba Resultado HOLOS');

/* W7 */
ok(errosJS.length === 0, 'W7 sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);

function window_origem(id) { const m = /^pb1-(.+)$/.exec(String(id || '')); if (!m) return null; const p = m[1].split('-'); while (p.length) { const k = p.join('-'); if (/^(ME|FU|AI|DL|MEE)-[CMEF]\d$|^G\d\d$/.test(k)) return k; p.pop(); } return null; }
