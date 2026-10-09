/**
 * RESUMO ESTRUTURADO do Resultado HOLOS (resultado-sintese.js) — 09/10:
 *   1  so a partir do snapshot: fatos (Indice, notas, Triade, ferramentas por eixo), regra oficial "Por onde investigar"
 *      (2 sistemas de nota mais baixa), decisao da nutricionista e pendencias metodologicas, rotulados
 *   2  sem conclusao clinica: nenhuma frase de diagnostico/prioridade inventada; sem exames/LI/anamnese
 *   3  visao do paciente: so fatos simples (sem "Por onde investigar", sem pendencias, sem ferramentas ocultas)
 *   4  XSS: nomes vindos do snapshot sao escapados
 *   5  na tela: Resultado salvo SEM nenhuma observacao da nutricionista abre com o resumo; Proximos Passos HOLOS registrados
 *      aparecem SO na visao profissional; a visao do paciente e a pagina Resultado (PDF) nao trazem Proximos Passos
 *   6  nada recalculado: o snapshot salvo nao muda ao abrir; HOLOSCAN e ferramentas intactos
 * SHOT_DIR=<pasta> grava capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';
import '../resultado-sintese.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const RS = globalThis.ResultadoSintese;

/* ===== 1-4: unidade ===== */
const snap = {
  holoscan: { indice: 62.4, indice_maximo: 100, triada: { fisico: 6.1, mental: 4.2, espiritual: 7 }, triada_com_dado: { fisico: true, mental: true, espiritual: true },
    sistemas: [
      { sistema: 'fungico', nome: 'Fúngico', nota: 5.5, faixa: 'intermediaria', avaliavel: true },
      { sistema: 'acido_inflamatorio', nome: 'Ácido <b>Inflamatório</b>', nota: 3.1, faixa: 'atencao', avaliavel: true },
      { sistema: 'metabolico', nome: 'Metabólico', nota: 4.0, faixa: 'atencao', avaliavel: true },
      { sistema: 'detox_linfatico', nome: 'Detox + Linfático', nota: null, faixa: null, avaliavel: false },
      { sistema: 'mental_emocional_espiritual', nome: 'Mental-Emocional-Espiritual', nota: 8, faixa: 'equilibrio', avaliavel: true }] },
  ferramentas: [
    { ferramenta_id: 'oq3', mostrar_paciente: true, respostas: {} },
    { ferramenta_id: 'linha_momentum', mostrar_paciente: false, respostas: { estado_confirmado: 'em_construcao' }, leitura: 'minha leitura' },
    { ferramenta_id: 'pqq', mostrar_paciente: false, respostas: {} }],
  observacoes: {}
};
const MOD = { oq3: 'corpo', linha_momentum: 'corpo', pqq: 'mente' };
const opts = { moduloDe: (id) => MOD[id], nomeFerramenta: (id) => ({ oq3: 'OQ³', linha_momentum: 'Linha do Momentum', pqq: 'PQQ' })[id] };
const f = RS.fatos(snap, opts.moduloDe);
ok(f.investigar.map(s => s.sistema).join() === 'acido_inflamatorio,metabolico' && f.sistemas_com_nota === 4 && f.sem_nota.join() === 'Detox + Linfático',
  'regra oficial "Por onde investigar": os 2 sistemas COM nota mais baixa (sem nota fica de fora e é listado)');
ok(f.triade_mais_baixa === 'Mente' && f.indice === 62.4 && f.ferramentas.corpo.length === 2 && f.ferramentas.mente.length === 1 && f.eixos_sem_ferramenta.join() === 'Espírito',
  'fatos: Índice, Tríade (dimensão mais baixa), ferramentas por eixo e eixo sem ferramenta');
ok(f.momentum === 'em_construcao' && f.leituras_nutri === 1 && f.observacoes_nutri === 0, 'decisão da nutricionista: estado da Linha do Momentum escolhido por ela, leituras e observações contadas (0 de 3, nada obrigatório)');
const empate = RS.fatos({ holoscan: { triada: { fisico: 5, mental: 5, espiritual: 5 }, sistemas: [] } });
const empate2 = RS.fatos({ holoscan: { triada: { fisico: 4, mental: 4, espiritual: 6 }, sistemas: [] } });
ok(empate.triade_mais_baixa === null && empate.triade_empate[0] === 'todas' && empate2.triade_mais_baixa === null && empate2.triade_empate.join() === 'Corpo,Mente',
  'Tríade com empate: nenhuma dimensão é escolhida como "a mais baixa" pela ordem; o empate é dito');
const prof = RS.html(snap, 'profissional', opts), pac = RS.html(snap, 'paciente', opts);
ok(/Fatos/.test(prof) && /Regra oficial/.test(prof) && /Decisão da nutricionista/.test(prof) && /PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO\/DANIEL/.test(prof) && RS.PENDENCIAS.length >= 5,
  'visão profissional: rótulos Fatos / Regra oficial / Decisão da nutricionista + pendências metodológicas (' + RS.PENDENCIAS.map(p => p.id).join(', ') + ')');
const semTags = prof.replace(/<[^>]+>/g, ' ');
ok(!/diagnóstico de|você tem|indica que|sugere que|deve (fazer|tomar)|recomenda-se|grave|patolog/i.test(semTags.replace(/não é (diagnóstico|conclusão clínica)/gi, '')),
  'nenhuma frase de conclusão clínica, gravidade ou recomendação inventada');
ok(!/exame|leitura integrada|laborat|anamnese/i.test(semTags), 'o resumo não menciona nem usa exames, Leitura Integrada ou anamnese');
ok(/OQ³/.test(pac) && !/PQQ|Linha do Momentum/.test(pac) && !/Por onde investigar|Pendência|PENDÊNCIA|Regra oficial/.test(pac) && /Índice HOLOS: <b>62,4/.test(pac),
  'visão do paciente: só fatos simples e só as ferramentas marcadas para ela; sem "Por onde investigar" nem pendências');
ok(prof.includes('Ácido &lt;b&gt;Inflamatório&lt;/b&gt;') && !prof.includes('<b>Inflamatório</b>'), 'XSS: nome vindo do snapshot é escapado');
const pp = RS.htmlProximosPassos({ catalog_code: 'HOLOS-RECOMENDACOES-V1', catalog_version: 1, created_at: '2026-10-09T10:00:00Z', selection: [{ papel: 'principal', tool_id: 'oq3', next_action: 'Aplicar <script>x</script>' }] }, opts.nomeFerramenta);
ok(/OQ³<\/b> \(principal\)/.test(pp) && pp.includes('&lt;script&gt;') && /Só na visão profissional/.test(pp), 'Próximos Passos registrados: ferramenta, papel e ação do catálogo aprovado (texto escapado)');

/* ===== 5-6: na tela ===== */
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const PA = ins('patients', { nome: 'Paciente Sintese Ficticia', telefone: '62999990000' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: new Date().toISOString().slice(0, 10) }) }).data;
const conc = new Date(Date.now() - 1800000).toISOString();
const T = ins('tool_applications', { patient_id: PA, encounter_id: EA, ferramenta_id: 'oq3', versao_ferramenta: '1', status: 'concluida', respostas: { quer: 'energia' }, iniciada_em: conc, concluida_em: conc }).id;
const reg = rpc('registrar_proximos_passos', { p_application_id: HA });
const salvo = rpc('salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [T], visao_paciente: { ferramentas: { [T]: { mostrar: true } } } } });
const linha = srv.linhas('holos_results')[0];
ok(!salvo.error && linha && linha.status === 'salvo' && !linha.leitura_profissional && !linha.pontos_acompanhar && !linha.questoes_aprofundar,
  'Resultado HOLOS salvo SEM nenhuma observação da nutricionista (o servidor não exige texto livre)');
const snapAntes = JSON.stringify(linha.content_snapshot);
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'holos_next_steps', 'methodology_packages'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function sessao(largura) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: largura || 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
const abrirVer = async (P, visao) => {
  if (await P.evaluate((v) => { const t = document.querySelector('#aba-resultado-holos [data-rh-visao-troca="' + v + '"]'); if (t) { t.click(); return true; } return false; }, visao)) { await espera(900); return; }
  await P.evaluate(async (pid) => {
    window.levarParaFicha('aba:resultado-holos', pid);
    for (let i = 0; i < 60; i++) { const a = document.getElementById('aba-resultado-holos'); if (a && a.querySelector('[data-rh-acao="ver"]')) break; await new Promise(r => setTimeout(r, 100)); }
  }, PA);
  await P.evaluate((v) => document.querySelector('[data-rh-acao="ver"][data-rh-visao="' + v + '"]').click(), visao);
  await espera(900);
};
const A = await sessao();
await abrirVer(A, 'profissional');
const tp = await A.evaluate(() => { const d = document.querySelector('#aba-resultado-holos .rh-doc'); return d ? d.innerText : ''; });
ok(/Resumo estruturado/i.test(tp) && /Por onde investigar/i.test(tp) && /Pendências metodológicas/i.test(tp), 'tela (visão profissional): o resultado sem texto da nutricionista abre com o Resumo estruturado');
ok(!reg.error && /Próximos Passos HOLOS registrados/i.test(tp) && /HOLOS-RECOMENDACOES-V1/.test(tp), 'Próximos Passos HOLOS já registrados aparecem no resumo da visão profissional (catálogo aprovado)');
if (process.env.SHOT_DIR) { await new Promise(r => setTimeout(r, 900)); const el = await A.$('#aba-resultado-holos .rh-resumo'); if (el) await el.screenshot({ path: process.env.SHOT_DIR + '/resultado-resumo-profissional.png' }); }
await abrirVer(A, 'paciente');
const tpa = await A.evaluate(() => { const d = document.querySelector('#aba-resultado-holos .rh-doc'); return d ? d.innerText : ''; });
ok(/Resumo da sua avaliação/i.test(tpa) && !/Por onde investigar|Próximos Passos HOLOS|Pendência|PENDÊNCIA/.test(tpa), 'visão do paciente: "Resumo da sua avaliação" só com fatos; sem Próximos Passos nem pendências');
if (process.env.SHOT_DIR) { await new Promise(r => setTimeout(r, 900)); const el = await A.$('#aba-resultado-holos .rh-doc'); if (el) await el.screenshot({ path: process.env.SHOT_DIR + '/resultado-paciente-desktop.png' }); }
await A.evaluate(() => window.irParaSecao('resultado'));
await A.evaluate((pid) => { const s = document.getElementById('sel-resultado'); if (s) { s.value = pid; s.dispatchEvent(new Event('change', { bubbles: true })); } if (window.ResultadoPagina) window.ResultadoPagina.desenhar(); }, PA);
await espera(1200);
const pagina = await A.evaluate(() => (document.getElementById('resultado-pagina-corpo') || {}).innerText || '');
ok(/Resumo da sua avaliação/i.test(pagina) && !/Próximos Passos HOLOS|Por onde investigar|Pendência|PENDÊNCIA/.test(pagina), 'página Resultado (a que vira PDF/WhatsApp): resumo simples da paciente, sem Próximos Passos');
if (process.env.SHOT_DIR) await new Promise(r => setTimeout(r, 4500)), await A.screenshot({ path: process.env.SHOT_DIR + '/resultado-final-desktop.png' });
const M = await sessao(390);
await abrirVer(M, 'profissional');
ok(await M.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'celular 390px: o resumo não cria rolagem lateral');
if (process.env.SHOT_DIR) { await new Promise(r => setTimeout(r, 900)); const el = await M.$('#aba-resultado-holos .rh-resumo'); if (el) await el.screenshot({ path: process.env.SHOT_DIR + '/resultado-resumo-mobile.png' }); }
ok(JSON.stringify(srv.linhas('holos_results')[0].content_snapshot) === snapAntes && digitais() === antes, 'nada recalculado nem gravado: snapshot, HOLOSCAN, ferramentas e Próximos Passos iguais');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
