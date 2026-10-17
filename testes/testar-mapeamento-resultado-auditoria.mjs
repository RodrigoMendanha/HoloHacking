/**
 * MAPEAMENTO HOLÍSTICO → PACOTE HOLOS IA → RESULTADO (auditoria Cowork 14/10, itens 1 e 27) — servidor falso, dados fictícios.
 * O caso da auditoria: o Mapeamento foi preenchido, enviado, RECEBIDO e REVISADO ("Marcar como revisado"), mas nunca levado
 * ao atendimento (nenhuma anamnese). Antes: o Pacote ia com "mapeamento": "Sem dado" e o Resultado ficava sem
 * "Seu momento agora" / "O que você quer construir".
 *   M1  o Pacote leva o Mapeamento: origem, data de recebimento/revisão, perguntas e respostas originais (sem reescrever)
 *   M2  sem resposta não se inventa nada (paciente sem Mapeamento: "Sem dado")
 *   M3  importar um HOLOS_AI_RESULT válido gera o Resultado com momento (do Mapeamento), desejos, foco, direcionamentos,
 *       estratégias, Corpo/Mente/Espírito, o que observar e próxima etapa — sem revisar item a item
 *   M4  a resposta original da paciente não muda
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const agora = new Date().toISOString();
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Mapeamento', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
const fx = await montarFixture(srv, UA, { nome: 'Paciente Ficticia Mapeamento Revisado', mapeamentoRecebido: true });
const { PA, E1 } = fx;
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PB = q('patients', 'insert', { dados: { nome: 'Paciente Ficticia Sem Mapeamento' } }).data[0].id;
const original = JSON.stringify(srv.linhas('anamnesis_invites').find(c => c.patient_id === PA).submitted_content);
ok(srv.linhas('anamneses').filter(a => a.patient_id === PA).length === 0, 'preparo: Mapeamento recebido e revisado, nenhuma anamnese no atendimento (o caso da auditoria)');

const EXEMPLO = readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8');
const RESPOSTA = '=== HOLOS_AI_RESULT ===\n```json\n' + EXEMPLO + '\n```';

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1280, height: 1000 });
await P.emulateTimezone('America/Sao_Paulo');
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => {
  if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar();
  window.__copiado = null;
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); } catch (e) { /* sem clipboard */ }
});
const espera = ms => new Promise(r => setTimeout(r, ms));
const pacote = async (pid, eid) => {
  await P.evaluate(async (pid, eid) => { window.definirPacienteAtivo(pid); if (eid) window.AtendimentoAtual.selecionarPorId(eid); window.levarParaFicha('aba:holos-ai', pid); }, pid, eid);
  await espera(1200);
  await P.evaluate(() => { window.__copiado = null; document.querySelector('[data-hai-acao="copiar-pacote"]').click(); });
  await espera(800);
  return P.evaluate(() => window.__copiado);
};

/* M1 */
const txtA = await pacote(PA, E1);
let pacA = null; try { pacA = JSON.parse(txtA); } catch (e) { pacA = null; }
const mA = pacA ? pacA.mapeamento : '';
ok(!!pacA && mA !== 'Sem dado' && /Origem: Mapeamento Holístico/.test(mA) && /recebido em \d\d\/\d\d\/\d{4}/.test(mA) && /revisado pela nutricionista em \d\d\/\d\d\/\d{4}/.test(mA),
  'M1 Pacote: "mapeamento" com origem Mapeamento Holístico, data de recebimento e de revisão (antes "Sem dado")');
ok(/Cansaço no fim da tarde e fome forte à noite/.test(mA) && /Ter mais disposição à tarde/.test(mA) && /Belisco quando chego em casa/.test(mA) && /Tarde/.test(mA),
  'M1 Pacote: respostas originais da paciente, sem reescrever (motivo, objetivo, dificuldade, maior fome)');
ok(!!pacA && !/Paciente Ficticia|62900000000/.test(txtA), 'M1 Pacote sem nome e telefone da paciente');
/* M2 */
const pacB = await P.evaluate(async (pid) => { window.definirPacienteAtivo(pid); if (window.PreConsulta) await window.PreConsulta.carregar(pid); return window.HolosAIPonte.montarPacote(pid, null); }, PB);
ok(!!pacB && pacB.mapeamento === 'Sem dado', 'M2 paciente sem Mapeamento: "Sem dado" (nada inventado)');

/* M3 */
await P.evaluate(async (pid, eid) => { window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid); window.levarParaFicha('aba:holos-ai', pid); }, PA, E1);
await espera(1200);
await P.evaluate((t) => { const a = document.getElementById('hai-json'); a.value = t; a.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-hai-acao="importar"]').click(); }, RESPOSTA);
await P.waitForFunction(() => !!document.querySelector('#hai-pronto'), { timeout: 15000 }).catch(() => null);
await espera(800);
const r = srv.linhas('holos_results').filter(x => x.patient_id === PA && x.status !== 'rascunho').pop();
const dp = r && r.content_snapshot ? r.content_snapshot.direcao_paciente : null;
const tem = (k) => dp && Array.isArray(dp[k]) && dp[k].length > 0;
ok(!!r && r.template_version === 5, 'M3 Resultado HOLOS gerado sozinho a partir do HOLOS_AI_RESULT (sem revisão item a item)');
ok(tem('momento') && dp.momento.some(m => /Cansaço no fim da tarde/.test(m.texto)), 'M3 "Seu momento agora" vem do Mapeamento recebido: ' + (dp && dp.momento ? dp.momento.map(m => m.texto).join(' | ').slice(0, 120) : '—'));
ok(tem('desejos') && dp.desejos.some(m => /Ter mais disposição à tarde/.test(m.texto)), 'M3 "O que você quer construir" vem do Mapeamento recebido');
ok(!!dp && !!dp.foco_atual && tem('direcionamentos') && tem('estrategias') && tem('observar') && !!dp.proxima_etapa && ((dp.corpo || {}).itens || []).length >= 1,
  'M3 foco, direcionamentos, estratégias, Corpo, o que observar e próxima etapa preenchidos');
const tela = await P.evaluate(async () => {
  const b = document.querySelector('[data-hai-acao="ver-resultado"]'); if (b) b.click();
  for (let i = 0; i < 40 && !document.querySelector('#aba-resultado-holos #rh-doc'); i++) await new Promise(r => setTimeout(r, 100));
  const d = document.querySelector('#aba-resultado-holos #rh-doc'); return d ? d.innerText : '';
});
ok(/Seu momento agora/.test(tela) && /O que você quer mudar/i.test(tela) && /Ter mais disposição à tarde/.test(tela) && /Foco desta fase/.test(tela), 'M3 na visão da paciente: "Seu momento agora" com o que a paciente trouxe e o que quer mudar (do Mapeamento)');

/* M4 */
ok(JSON.stringify(srv.linhas('anamnesis_invites').find(c => c.patient_id === PA).submitted_content) === original, 'M4 a resposta original do Mapeamento não mudou');
ok(errosJS.length === 0, 'sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
