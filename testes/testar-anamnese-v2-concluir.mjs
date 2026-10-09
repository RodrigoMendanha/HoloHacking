/**
 * Anamnese V2 — "Concluir anamnese" logo depois de digitar (Supabase falso, com conta).
 * Defeito encontrado na gravacao do video-tutorial (09/10): ao clicar em Concluir, o campo perde o foco e dispara a
 * gravacao automatica; a conclusao saia com o updated_at antigo e o servidor recusava por conflito
 * ("Nao foi possivel concluir agora"). Agora a conclusao espera a gravacao em andamento e usa o updated_at novo.
 *   1  digitar e concluir em seguida (antes dos 2,5 s): conclui na primeira tentativa, sem erro de conflito
 *   2  o conteudo concluido tem o que foi digitado por ultimo (nada perdido)
 *   3  conflito de verdade (outra sessao gravou antes) continua recusado, sem sobrescrever
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const PA = ins('patients', { nome: 'Paciente Concluir Ficticia' }).id;
const PB = ins('patients', { nome: 'Paciente Conflito Ficticia' }).id;
const enc = (pid) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const EA = enc(PA), EB = enc(PB);
const erros = [];
const tratar = srv.tratar.bind(srv);
srv.tratar = (m) => { const r = tratar(m); if (m.nome === 'salvar_anamnese' && r.error) erros.push(r.error.message); return r; };

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1366, height: 1000 });
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(() => { window.confirm = () => true; });
const abrir = (pid, eid) => P.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid); await window.Anamnese.carregar(); window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:anamnese', pid); await new Promise(r => setTimeout(r, 500));
}, pid, eid);
const toast = () => P.evaluate(() => (document.getElementById('toast') || {}).textContent || '');

/* 1 + 2: digitar com o teclado de verdade e clicar em Concluir na hora (o clique tira o foco do campo) */
await abrir(PA, EA);
await P.click('#an2-motivo-motivo'); await P.keyboard.type('Cansaço à tarde.');
await P.click('#an2-motivo-objetivo'); await P.keyboard.type('Ter mais energia');
await P.click('[data-an2-acao="concluir"]');
await espera(300); await P.evaluate(() => { const b = document.getElementById('modal-confirmar-ok'); if (b && b.offsetParent) b.click(); });
await espera(2500);
const a = srv.linhas('anamneses').filter(x => x.patient_id === PA);
ok(a.length === 1 && a[0].status === 'salvo' && erros.length === 0, '1. concluir logo depois de digitar conclui na primeira tentativa, sem conflito (' + (await toast()) + (erros.length ? ' | servidor: ' + erros.join(' / ') : '') + ')');
ok(a[0] && a[0].content.formulario.motivo.objetivo === 'Ter mais energia' && a[0].content.formulario.motivo.motivo === 'Cansaço à tarde.', '2. o conteúdo concluído tem o último texto digitado');

/* 3: conflito real continua recusado */
await abrir(PB, EB);
await P.click('#an2-motivo-motivo'); await P.keyboard.type('Primeiro texto');
await espera(3200);   // gravacao automatica
const r0 = srv.linhas('anamneses').find(x => x.patient_id === PB);
// outra sessao grava por cima (o updated_at muda)
srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_anamnese', args: { payload: { id: r0.id, encounter_id: EB, content: r0.content, status: 'rascunho', expected_updated_at: r0.updated_at } } });
const depoisOutra = srv.linhas('anamneses').find(x => x.patient_id === PB).updated_at;
erros.length = 0;
await P.click('#an2-motivo-objetivo'); await P.keyboard.type('mudança local');
await P.click('[data-an2-acao="concluir"]');
await espera(300); await P.evaluate(() => { const b = document.getElementById('modal-confirmar-ok'); if (b && b.offsetParent) b.click(); });
await espera(2500);
const b = srv.linhas('anamneses').find(x => x.patient_id === PB);
ok(b.status === 'rascunho' && b.updated_at === depoisOutra && !(b.content.formulario.motivo || {}).objetivo, '3. conflito real (outra sessão gravou antes): não conclui e não sobrescreve');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na página' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
if (falhou) process.exitCode = 1;
