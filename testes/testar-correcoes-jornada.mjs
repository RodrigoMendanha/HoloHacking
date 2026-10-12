/**
 * Correcoes do teste completo de 12/10 (paciente ficticia), servidor falso com os contratos das migrations:
 *   B1  Proximos Passos: o Resultado HOLOS novo (template 3) tira as ferramentas ja feitas no atendimento e recomenda a
 *       proxima; tudo feito -> mensagem neutra; o registro original continua congelado; Resultado antigo (template 2) igual;
 *       tela do HOLOSCAN marca "Ja realizada neste atendimento"
 * (os demais bugs entram neste arquivo, um bloco por bug)
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const RESP = { mapa_rotina_v1: { acorda: '06:30', dorme: '23:00', eventos: [{ inicio: '07:00', categoria: 'refeição', titulo: 'café' }] },
  gatilhos_respostas_v1: { gatilho: 'g', pensamento: 'p', emocao: 'e', resposta: 'r' }, conexao_pertencimento_v1: { contar: 'x', vinculos: [{ rotulo: 'X', natureza: 'pessoa', papel: 'apoia' }] } };
const ferramenta = (pid, eid, id) => ins('tool_applications', { patient_id: pid, encounter_id: eid, ferramenta_id: id, versao_ferramenta: '1', status: 'concluida',
  respostas: RESP[id] || { registro: 'ficticio' }, iniciada_em: new Date().toISOString(), concluida_em: new Date().toISOString() });

/* paciente + atendimento + HOLOSCAN oficial + Proximos Passos registrados ao salvar (como na tela) */
const PA = ins('patients', { nome: 'Paciente Teste Jornada Ficticia' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: new Date().toISOString().slice(0, 10) }) }).data;
const REG = rpc('registrar_proximos_passos', { p_application_id: HA }).data;
const sel = (s) => (s || []).map(x => x.tool_id);
const original = sel(REG.selection);

titulo('B1 — PROXIMOS PASSOS SEM AS FERRAMENTAS JA FEITAS');
/* as duas primeiras sugeridas feitas no atendimento (como PQQ + Mapa da Rotina no teste real) */
const T1 = ferramenta(PA, EA, original[0]).id, T2 = ferramenta(PA, EA, original[1]).id;
const R1 = rpc('salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [T1, T2],
  visao_paciente: { ferramentas: { [T1]: { mostrar: true }, [T2]: { mostrar: true } }, proximos_passos: true } } });
const snap = srv.linhas('holos_results').find(r => r.id === R1.data).content_snapshot;
const pend = sel(snap.proximos_passos.pendentes.selection);
ok(snap.template_version === 3 && pend.length >= 1 && !pend.includes(original[0]) && !pend.includes(original[1]),
  'Resultado novo (template 3): as ferramentas feitas no atendimento (' + original.slice(0, 2).join(', ') + ') saem dos Próximos Passos → ' + pend.join(', '));
ok(snap.proximos_passos.pendentes.selection[0].papel === 'principal' && sel(snap.proximos_passos.selection).join() === original.join(),
  'a próxima ainda não feita vira a principal; o registro original fica congelado ao lado (' + original.join(', ') + ')');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
const abrirResultado = async (rid, visao) => {
  await A.evaluate(async (pid) => {
    window.definirPacienteAtivo(pid); if (window.ResultadoHolos) window.ResultadoHolos.esquecer(); window.levarParaFicha('aba:resultado-holos', pid);
    for (let i = 0; i < 60; i++) { const a = document.getElementById('aba-resultado-holos'); if (a && a.querySelector('[data-rh-acao="ver"]')) break; await new Promise(r => setTimeout(r, 100)); }
  }, PA);
  await A.evaluate((id, v) => document.querySelector('[data-rh-acao="ver"][data-rh-id="' + id + '"][data-rh-visao="' + v + '"]').click(), rid, visao); await espera(700);
  return A.evaluate(() => { const d = document.querySelector('#aba-resultado-holos .rh-doc'); return d ? d.innerText : ''; });
};
const NOME = await A.evaluate(() => window.ProximosPassos.NOME_FERRAMENTA);
let t = await abrirResultado(R1.data, 'paciente');
const linhaPP = (t.match(/Próximos passos de aprofundamento:[^\n]*/) || [''])[0];
ok(linhaPP && !linhaPP.includes(NOME[original[0]]) && !linhaPP.includes(NOME[original[1]]) && linhaPP.includes(NOME[pend[0]]),
  'visão da paciente: "Próximos passos" sem as que ela já fez — ' + linhaPP.slice(0, 140));
t = await abrirResultado(R1.data, 'profissional');
ok(/sem as já realizadas neste atendimento/.test(t) && t.includes(NOME[pend[0]] + ' (principal)'), 'visão profissional: o catálogo indica a próxima ainda não feita como principal');

/* tudo feito: mensagem neutra */
const todas = ['oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro', 'mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1'];
todas.filter(f => !srv.linhas('tool_applications').some(x => x.encounter_id === EA && x.ferramenta_id === f)).forEach(f => ferramenta(PA, EA, f));
const R2 = rpc('salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [], visao_paciente: { ferramentas: {}, proximos_passos: true } } });
const snap2 = srv.linhas('holos_results').find(r => r.id === R2.data).content_snapshot;
const sobra = sel(snap2.proximos_passos.pendentes.selection);
ok(sobra.every(x => x === 'mapa') && (sobra.length || snap2.proximos_passos.pendentes.todas_realizadas === true),
  'todas as ferramentas do catálogo feitas: nada volta (só o Mapa do Propósito, que é derivado, pode sobrar)');
if (!sobra.length) {
  t = await abrirResultado(R2.data, 'paciente');
  ok(/As ferramentas sugeridas para esta etapa já foram feitas/.test(t) && !/Próximos passos de aprofundamento:/.test(t), 'paciente vê a mensagem neutra em vez da lista');
}

/* Resultado antigo (template 2): continua exatamente como foi congelado */
const antigo = JSON.parse(JSON.stringify(srv.linhas('holos_results').find(r => r.id === R1.data)));
Object.assign(antigo, { id: '00000000-0000-4000-8000-0000000000b2', template_version: 2, superseded_at: null, operation_id: null, saved_at: new Date(Date.now() - 86400000).toISOString() });
delete antigo.content_snapshot.proximos_passos.pendentes; antigo.content_snapshot.template_version = 2;
srv.tabelas.holos_results.push(antigo);
t = await abrirResultado(antigo.id, 'paciente');
ok(((t.match(/Próximos passos de aprofundamento:[^\n]*/) || [''])[0]).includes(NOME[original[0]]), 'Resultado antigo (template 2, já emitido): mostra o que foi congelado, sem mudança');

/* tela do HOLOSCAN: o cartao da ferramenta feita no atendimento e marcado */
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300)); }, PA);
await A.waitForFunction(() => { const a = document.getElementById('holo-proximos-passos'); return a && a.innerText && !/carregando/i.test(a.innerText) && a.querySelector('.pp-card'); }, { timeout: 10000 }).catch(() => {});
await espera(500);
const cartoes = await A.evaluate(() => [...document.querySelectorAll('#holo-proximos-passos .pp-card')].map(c => ({ feita: c.dataset.ppFeita === '1', txt: c.innerText.slice(0, 80) })));
ok(cartoes.length >= 2 && cartoes.slice(0, 2).every(c => c.feita && /Já realizada neste atendimento/i.test(c.txt)),
  'tela do HOLOSCAN: as sugeridas já feitas no atendimento aparecem "✓ Já realizada neste atendimento" (o registro não muda)');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\ncorrecoes da jornada: tudo ok');
process.exit(falhou ? 1 : 0);
