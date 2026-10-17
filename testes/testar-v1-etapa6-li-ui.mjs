/**
 * V1 — ETAPA 6.0 (reescrita 09/10) — LEITURA INTEGRADA FORA DA TELA; O HISTORICO FICA SO NO BANCO
 * (Supabase falso, app real, puppeteer)
 *
 *  A Etapa 6.0 provava os 7 dominios na tela, estados, direcoes, duplicidade, salvar por dominio. Decisao de
 *  produto 09/10: nada disso aparece mais. Com uma LI historica (D01 divergente) e uma coleta historica no servidor:
 *   1  nenhum dominio, Convergente/Divergente/Sem dados, "Calcular", "Salvar leitura" ou confronto em lugar nenhum
 *      (menu, aba HOLOSCAN, relatorio nutri/paciente, Resultado, Evolucao, Visao geral)
 *   2  ?homologacao=1 tambem nao (o confronto legado saiu)
 *   3  navegar por tudo nao altera a leitura historica nem a coleta no servidor (impressao digital)
 *   4  nenhuma frase banida (conclusao diagnostica) em nenhuma superficie
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHistorica } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const PA = srv.tratar({ op: 'query', uid: UA, q: { tabela: 'patients', acao: 'insert', dados: { nome: 'Paciente E6 UI' }, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } }).data[0].id;
const D = '2026-03-10';
const agora = () => new Date().toISOString();
/* aplicacao HISTORICA (pre-existente, sem pacote V1), coleta historica e LI historica: como o banco real os tem */
const HID = semearHistorica(srv, UA, { application: { patient_id: PA, quando: D, cobertura: { respondidos: 84, total: 84 } } });
const CID = globalThis.crypto.randomUUID();
srv.tabelas.lab_collections.push({ id: CID, nutritionist_id: UA, patient_id: PA, encounter_id: null, coletado_em: D, data_coleta_desconhecida: false, laboratorio: null, observacao: null, state: 'salvo', source: 'manual', revision: 1, created_by: UA, created_at: agora(), updated_at: agora() });
srv.tabelas.lab_results.push({ id: globalThis.crypto.randomUUID(), collection_id: CID, exam_code: 'LAB-027', value_original_text: '25', numeric_value: 25, qualifier: 'eq', unit_original: 'mg/L', report_reference_text: '10 a 20', report_reference_min: 10, report_reference_max: 20, created_at: agora() });
srv.tabelas.integrated_readings.push({ id: globalThis.crypto.randomUUID(), nutritionist_id: UA, patient_id: PA, holoscan_application_id: HID, responsible: 'Nutri Teste', state: 'divergente', domain_code: 'LI-D01',
  holoscan_direction: 'attention_absent', laboratory_direction: 'attention_present', professional_note: 'NOTA_HISTORICA_LI', revision: 1, reason_codes: [], trace: {}, created_at: agora() });
const digital = () => createHash('sha256').update(JSON.stringify(['integrated_readings', 'lab_collections', 'lab_results', 'holoscan_applications', 'holoscan_system_scores'].map(t => srv.linhas(t)))).digest('hex');
const antes = digital();

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
async function sessao(url) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto(url || 'http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await P.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await window.Sincronizacao.aguardar(); }, PA);
  return P;
}
const LI = /Leitura Integrada|Convergente|Divergente|Sem dados suficientes|LI-D0\d|Calcular leitura|Salvar leitura|NOTA_HISTORICA_LI|attention_|duplicate_result|confronto/i;
const PROIBIDO = [/resist[êe]ncia (a|à)?\s?insulina/i, /inflama[çc][ãa]o silenciosa/i, /processo inflamat[óo]rio ativo/i, /carga [áa]cida elevada/i, /metila[çc][ãa]o comprometida/i, /hiperalerta sustentado/i, /sobrecarga hep[áa]tica/i, /tireoide pedindo/i, /problema de tireoide/i];
async function varrer(P) {
  return P.evaluate(async (pid) => {
    const out = { menu: [...document.querySelectorAll('.nav-item')].map(b => b.dataset.secao), telas: {} };
    for (const aba of ['visao', 'holoscan', 'evolucao', 'relatorio']) { window.levarParaFicha('aba:' + aba, pid); await new Promise(r => setTimeout(r, 700)); out.telas[aba] = (document.getElementById('aba-' + aba) || {}).innerText || ''; }
    window.levarParaFicha('aba:relatorio', pid); await new Promise(r => setTimeout(r, 500));
    const bp = document.querySelector('[data-registro="paciente"]'); if (bp) { bp.click(); await new Promise(r => setTimeout(r, 400)); out.telas.relatorioPaciente = (document.getElementById('aba-relatorio') || {}).innerText || ''; }
    document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300));
    out.telas.secaoHoloscan = document.getElementById('secao-holoscan').innerText;
    document.querySelector('.nav-item[data-secao="resultado"]').click(); await new Promise(r => setTimeout(r, 900));
    out.telas.resultado = document.getElementById('secao-resultado').innerText;
    out.blocos = document.querySelectorAll('#aba-holoscan-laboratorial, #holo-confronto, #li-corpo, [data-li-acao], [data-li-dominio], .li-dominio').length;
    out.globais = ['Laboratorio', 'LabMotor', 'LeituraIntegradaMotor', 'LeituraIntegradaPacoteV1'].filter(n => !!window[n]);
    return out;
  }, PA);
}

titulo('1. NENHUMA LEITURA INTEGRADA EM TELA NENHUMA');
const A = await sessao();
const v = await varrer(A);
ok(!v.menu.includes('confronto') && v.blocos === 0 && v.globais.length === 0, 'menu sem Leitura Integrada; nenhum bloco de LI/confronto; nenhum modulo carregado');
const vazou = Object.entries(v.telas).filter(([, t]) => LI.test(t)).map(([k]) => k);
ok(vazou.length === 0, 'Visao geral, aba HOLOSCAN, Evolucao, relatorio (nutri e paciente), secao HOLOSCAN e Resultado: sem dominio, estado, direcao ou nota de LI' + (vazou.length ? ' — vazou em ' + vazou.join(',') : ''));
await A.close();

titulo('2. ?homologacao=1 TAMBEM NAO');
const H = await sessao('http://127.0.0.1:5500/?homologacao=1');
const vh = await varrer(H);
ok(!vh.menu.includes('confronto') && vh.blocos === 0 && vh.globais.length === 0 && !Object.values(vh.telas).some(t => LI.test(t)), 'em ?homologacao=1 o confronto legado tambem saiu e nenhuma LI aparece');
await H.close();

titulo('3. O HISTORICO NAO MUDOU');
ok(digital() === antes, 'leitura integrada, coleta, resultados e HOLOSCAN historicos intactos depois de navegar por tudo (duas sessoes)');

titulo('4. NENHUMA FRASE BANIDA');
const achados = [];
Object.entries(Object.assign({}, v.telas, vh.telas)).forEach(([k, t]) => PROIBIDO.forEach(re => { if (re.test(t)) achados.push(k + ':' + re.source); }));
ok(achados.length === 0, 'nenhuma conclusao diagnostica em superficie nenhuma' + (achados.length ? ': ' + achados.join(', ') : ''));

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
