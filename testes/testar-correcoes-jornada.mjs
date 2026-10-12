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

titulo('B3 — TEXTO DA FAIXA PARA A PACIENTE');
t = await abrirResultado(R1.data, 'paciente');
ok(!/Revise os itens respondidos|interpretação profissional|cobertura/i.test(t) && /apareceu com (mais|alguns|poucos) sinais nas suas respostas/.test(t),
  'visão da paciente (Resultado novo): texto simples por faixa, sem "Revise os itens… interpretação profissional"');
t = await abrirResultado(R1.data, 'profissional');
ok(/Revise os itens respondidos/.test(t), 'visão profissional: continua com a mensagem técnica do pacote');
t = await abrirResultado(antigo.id, 'paciente');
ok(/Revise os itens respondidos/.test(t), 'Resultado antigo (template 2, já emitido): texto congelado como foi emitido');

titulo('B2 — INTERPRETACAO DO HOLOSCAN SO NA VISAO PROFISSIONAL');
srv.tabelas.holoscan_applications.find(a => a.id === HA).interpretacao_texto = 'INTERP_INTERNA_DA_NUTRI';
srv.tabelas.holos_results.filter(r => r.status !== 'rascunho' && r.template_version === 3).forEach(r => {
  r.content_snapshot.observacoes = { leitura_profissional: 'LEITURA_PARA_A_PACIENTE', pontos_acompanhar: 'PONTOS_PARA_ACOMPANHAR', questoes_aprofundar: 'QUESTAO_INTERNA' }; });
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
const rel = async (registro) => A.evaluate(async (pid, reg) => {
  window.levarParaFicha('aba:relatorio', pid); await new Promise(r => setTimeout(r, 800));
  const b = document.querySelector('[data-registro="' + reg + '"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 900));
  const el = document.getElementById('relatorio'); const ta = el.querySelector('#rel-interpretacao');
  return el.innerText + (ta ? '\n[campo]' + ta.value : '');
}, PA, registro);
const relPac = await rel('paciente'), relNut = await rel('nutri');
ok(!/INTERP_INTERNA_DA_NUTRI/.test(relPac) && /LEITURA_PARA_A_PACIENTE/.test(relPac) && /PONTOS_PARA_ACOMPANHAR/.test(relPac) && !/QUESTAO_INTERNA/.test(relPac),
  'relatório "Para o paciente": sem a interpretação interna; mostra "Leitura profissional" e "Pontos para acompanhar" do Resultado HOLOS');
ok(/D\. Leitura da sua nutricionista/.test(relPac) && !/encaminhad|médico/i.test(relPac), 'seção D da paciente com título próprio; sem encaminhamento médico');
ok(/INTERP_INTERNA_DA_NUTRI/.test(relNut) && /só para você/.test(relNut), 'relatório "Para a nutricionista": a interpretação continua lá, marcada "só para você"');

titulo('B4 / B5 — RELATORIO DA NUTRICIONISTA COMPLETO; HOLOSCAN LIGADO AO ATENDIMENTO');
ok(/1 atendimento registrado/.test(relNut) && !/Nenhuma consulta registrada/.test(relNut), 'seção B lista o atendimento (mesmo sem agendamento)');
ok(/E\. Ferramentas concluídas/.test(relNut) && /Mapa da Rotina/.test(relNut) && /Linha do Momentum/.test(relNut), 'seção E: ferramentas concluídas');
ok(/F\. Conduta vigente/.test(relNut) && /G\. Resultado HOLOS/.test(relNut) && /LEITURA_PARA_A_PACIENTE/.test(relNut) && /QUESTAO_INTERNA/.test(relNut), 'seções F (Conduta) e G (último Resultado HOLOS salvo, com as observações)');
ok(!/E\. Ferramentas concluídas|F\. Conduta vigente|QUESTAO_INTERNA/.test(relPac), 'nada disso vai para a versão da paciente');
const formRH = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); if (window.ResultadoHolos) window.ResultadoHolos.esquecer(); window.levarParaFicha('aba:resultado-holos', pid);
  for (let i = 0; i < 60; i++) { const a = document.querySelector('#aba-resultado-holos [data-rh-acao="novo"]'); if (a) break; await new Promise(r => setTimeout(r, 100)); }
  document.querySelector('#aba-resultado-holos [data-rh-acao="novo"]').click(); await new Promise(r => setTimeout(r, 600));
  const sel = document.getElementById('rh-atendimento'); const h = document.querySelector('input[name="rh-holoscan"]:checked');
  return { enc: sel ? sel.value : null, holoscan: h ? h.value : null, txt: (document.querySelector('.rh-opcoes') || {}).innerText || '' };
}, PA);
ok(formRH.enc === EA && formRH.holoscan === null, 'Resultado HOLOS → Gerar: o atendimento já vem preenchido (mesmo depois de recarregar a página); o HOLOSCAN continua escolha explícita');
ok(!/sem atendimento/.test(formRH.txt) && /HOLOS-V1 v2/.test(formRH.txt) && !/HOLOS-V12|HOLOS-V1@2/.test(formRH.txt), 'a aplicação mostra o atendimento e "HOLOS-V1 v2": ' + formRH.txt.split('\n').slice(0, 2).join(' | '));

titulo('B6 — "INICIAR FERRAMENTA" ABRE A FERRAMENTA');
const b6 = await A.evaluate(async (pid) => {
  sessionStorage.clear();
  window.definirPacienteAtivo(pid); if (window.AtendimentoAtual.limpar) window.AtendimentoAtual.limpar();
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  for (let i = 0; i < 80; i++) { if (document.querySelector('#holo-proximos-passos [data-pp-abrir]')) break; await new Promise(r => setTimeout(r, 100)); }
  const botoes = [...document.querySelectorAll('#holo-proximos-passos [data-pp-abrir]')];
  const b = botoes[botoes.length - 1]; const id = b.dataset.ppAbrir;
  b.click(); await new Promise(r => setTimeout(r, 900));
  const sec = document.querySelector('.secao.ativa');
  const form = [...document.querySelectorAll('.secao.ativa .form-ferramenta, .secao.ativa [id^="form-"]')].some(e => e.offsetParent !== null);
  const at = window.AtendimentoAtual.idPara(pid);
  const r = { id, secao: sec && sec.id, form, at };
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 400));
  window.abrirFerramentaPorId('pqq'); await new Promise(r => setTimeout(r, 900));
  r.pqq = !!(document.getElementById('vista-pqq') && document.getElementById('vista-pqq').offsetParent !== null);
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 400));
  window.abrirFerramentaPorId('oq3'); await new Promise(r => setTimeout(r, 900));
  r.oq3 = !!(document.getElementById('vista-oq3') && document.getElementById('vista-oq3').offsetParent !== null);
  return r;
}, PA);
ok(b6.secao !== 'secao-holoscan' && b6.form, 'o botão "Iniciar ferramenta" leva ao módulo da ferramenta e abre o formulário (' + b6.id + ' → ' + b6.secao + ')');
ok(b6.at === EA, 'sem atendimento ativo, a ferramenta abre no atendimento do HOLOSCAN que gerou a recomendação');
ok(b6.pqq && b6.oq3, 'PQQ e OQ³ (ferramentas com tela própria) também abrem a partir do HOLOSCAN');

titulo('B7 — VISAO GERAL MOSTRA A ANAMNESE CONCLUIDA');
const b7 = await A.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid);
  window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:visao', pid); await new Promise(r => setTimeout(r, 600));
  const linha = () => ([...document.querySelectorAll('#aba-visao *')].map(e => e.textContent).find(t => /^Anamnese/.test(t) && t.length < 200) || document.getElementById('aba-visao').innerText);
  const pega = () => { const t = document.getElementById('aba-visao').innerText; const i = t.search(/Anamnese \(atendimento ativo\)|Anamnese\s*\n\s*(rev|não|rascunho)/); return i < 0 ? t.slice(0, 300) : t.slice(i, i + 80); };
  const antes = [pega()];
  await window.Anamnese.salvar({ encounter_id: eid, content: { formato: 'v2', dominios: {} }, status: 'salvo' });
  await new Promise(r => setTimeout(r, 400));
  const depois = [pega()];
  return { antes: antes && antes[0], depois: depois && depois[0] };
}, PA, EA);
ok(/não registrada/.test(b7.antes || '') && /rev\. 1 · salvo/.test(b7.depois || ''), 'Visão Geral: ao salvar a anamnese, a linha muda sozinha de "não registrada" para "rev. 1 · salvo" (' + (b7.depois || '').replace(/\s+/g, ' ') + ')');

titulo('B8 — HOLOS AI: TODAS AS FERRAMENTAS CONCLUIDAS E O RESULTADO HOLOS');
const ia = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); window.levarParaFicha('aba:holos-ai', pid); await new Promise(r => setTimeout(r, 900));
  const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 400));
  const ta = document.querySelector('#aba-holos-ai textarea'); return ta ? ta.value : document.getElementById('aba-holos-ai').innerText;
}, PA);
ok(/### Mapa da Rotina/.test(ia) && /### Gatilhos & Respostas/.test(ia) && /### Conexão & Pertencimento/.test(ia) && /### Linha do Momentum/.test(ia),
  'Caso completo inclui as ferramentas estruturadas concluídas (Mapa da Rotina, Gatilhos & Respostas, Conexão & Pertencimento) e as demais');
ok(/Resultado HOLOS \(último salvo\)/.test(ia) && /LEITURA_PARA_A_PACIENTE/.test(ia) && /1ª área para investigar/.test(ia), 'e o último Resultado HOLOS salvo (Síntese + observações)');

titulo('B9 — CONDUTA: AS 10 FERRAMENTAS EM "FERRAMENTAS RELACIONADAS"');
const b9 = await A.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:conduta', pid); await new Promise(r => setTimeout(r, 700));
  const n = document.querySelector('[data-cd-acao="nova"]'); if (n) n.click(); await new Promise(r => setTimeout(r, 500));
  return [...document.querySelectorAll('[data-cd-tool]')].map(c => c.closest('label').textContent.trim());
}, PA, EA);
ok(b9.length === 10 && ['OQ³', 'PQQ', 'Mapa do Propósito', 'Mapa da Rotina', 'Linha do Momentum'].every(x => b9.includes(x)), 'lista com as 10 ferramentas do método: ' + b9.join(', '));

titulo('B10 — AJUSTES VISUAIS');
const b10 = await A.evaluate(async (pid, eid) => {
  const out = {};
  window.definirPacienteAtivo(pid);
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 500));
  const svg = document.getElementById('radar-svg'), vb = svg.viewBox.baseVal;
  out.rotulosCabem = [...svg.querySelectorAll('text')].every(t => { const b = t.getBBox(); return b.x >= vb.x - 0.5 && b.x + b.width <= vb.x + vb.width + 0.5; });
  out.inflam = [...svg.querySelectorAll('text')].some(t => t.textContent === 'Inflamatório');
  window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:conduta', pid); await new Promise(r => setTimeout(r, 600));
  const n = document.querySelector('[data-cd-acao="nova"]'); if (n) n.click(); await new Promise(r => setTimeout(r, 400));
  const ta = document.querySelector('[data-cd-campo="objective"]'), inp = document.querySelector('.perf-campo input, .perf-campo select');
  out.ta = ta ? getComputedStyle(ta).backgroundColor : null; out.inp = inp ? getComputedStyle(inp).backgroundColor : null;
  document.querySelector('.nav-item[data-secao="dashboard"]').click(); await new Promise(r => setTimeout(r, 600));
  out.dash = (document.querySelector('.dash-resumo') || {}).innerText || '';
  return out;
}, PA, EA);
ok(b10.inflam && b10.rotulosCabem, 'radar do HOLOSCAN: "Inflamatório" e os outros nomes cabem inteiros no gráfico');
ok(b10.ta && b10.ta === b10.inp, 'Conduta: caixas de texto com o mesmo fundo dos outros campos do tema (' + b10.ta + ')');
ok(/Atendimentos hoje/.test(b10.dash), 'Dashboard: "Atendimentos hoje" conta também os atendimentos sem agendamento (' + b10.dash.replace(/\s+/g, ' ').slice(0, 80) + ')');
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('resultado'); await new Promise(r => setTimeout(r, 1200)); }, PA);
const radarDoc = await A.evaluate(() => { const t = document.querySelector('#rp-doc .rh-radar-rotulo'); if (!t) return null;
  const lum = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const a = lum(getComputedStyle(t).fill), b = lum(getComputedStyle(document.getElementById('rp-doc')).backgroundColor); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); });
ok(radarDoc === null || radarDoc >= 4.5, 'radar no documento da paciente (fundo creme): nomes com contraste ' + (radarDoc ? radarDoc.toFixed(1) + ':1' : '(sem radar nesta tela)'));
await A.evaluate(() => document.body.classList.add('escuro'));
const radarDocEscuro = await A.evaluate(() => { const t = document.querySelector('#rp-doc .rh-radar-rotulo'); return t ? getComputedStyle(t).fill : null; });
ok(radarDocEscuro === null || /29, 58, 46/.test(radarDocEscuro), 'e continua escuro no tema escuro (o documento é sempre creme): ' + radarDocEscuro);
await A.evaluate(() => document.body.classList.remove('escuro'));

/* B5 de verdade: HOLOSCAN salvo NESTA sessao (sem recarregar) ja aparece ligado ao atendimento */
const PB = ins('patients', { nome: 'Paciente Sessao Ficticia' }).id;
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
const sess = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  const at = await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 600000).toISOString() });
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 250));
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 250));
  [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it, i) => { const b = it.querySelectorAll('.q-btn')[(i * 7) % 4]; if (!b.classList.contains('marcado')) b.click(); });
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 700));
  document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 1500));
  if (window.ResultadoHolos) window.ResultadoHolos.esquecer(); window.levarParaFicha('aba:resultado-holos', pid);
  for (let i = 0; i < 60; i++) { const a = document.querySelector('#aba-resultado-holos [data-rh-acao="novo"]'); if (a) break; await new Promise(r => setTimeout(r, 100)); }
  document.querySelector('#aba-resultado-holos [data-rh-acao="novo"]').click(); await new Promise(r => setTimeout(r, 600));
  const h = document.querySelector('input[name="rh-holoscan"]:checked');
  return { at: at && at.id, enc: (document.getElementById('rh-atendimento') || {}).value, h: !!h, txt: (document.querySelector('.rh-opcoes') || {}).innerText || '' };
}, PB);
const appB = srv.linhas('holoscan_applications').find(a => a.patient_id === PB);
ok(appB && appB.encounter_id === sess.at && sess.enc === sess.at && !/sem atendimento/.test(sess.txt),
  'HOLOSCAN salvo agora, sem recarregar: gravado com o atendimento e mostrado com ele no Resultado HOLOS (' + sess.txt.split('\n')[1] + ')');

/* B11: nomes padronizados — Tríade (Corpo / Mente / Espírito), OQ³, HOLOS-V1 v2 */
console.log('\nB11 — nomes padronizados');
const nomes = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300));
  const tri = [...document.querySelectorAll('svg text')].map(t => t.textContent.trim()).filter(t => /^(CORPO|MENTE|ESPÍRITO|FÍSICO|MENTAL|ESPIRITUAL)$/.test(t));
  const nav = (document.querySelector('.nav-item[data-secao="corpo"] .nav-tag') || {}).textContent || '';
  const visivel = document.body.innerText + ' ' + [...document.querySelectorAll('.secao')].map(s => s.textContent).join(' ');
  return { tri, nav, oq3: /\bOQ3\b/.test(visivel), triada: /Tríada/.test(visivel) };
});
ok(nomes.tri.join(',') === 'CORPO,MENTE,ESPÍRITO', 'Tríade do HOLOSCAN com Corpo / Mente / Espírito: ' + nomes.tri.join(' · '));
ok(nomes.nav === 'OQ³' && !nomes.oq3, 'menu e telas escrevem OQ³ (nenhum "OQ3" visível): ' + nomes.nav);
ok(!nomes.triada, 'nenhuma tela escreve "Tríada"');
const fsB11 = await import('fs');
const fonte = f => fsB11.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
ok(!/"Físico"|Físico <b>|\(Físico, Mental/.test(fonte('app.js') + fonte('arquivos.js') + fonte('evolucao.js') + fonte('ajuda.js') + fonte('holos-ai.js')),
  'relatório, Evolução, Ajuda e HOLOS AI sem os rótulos Físico/Mental/Espiritual');
ok(/aprovado \(HOLOS-V1 v2\)/.test(fonte("ajuda.js")) && /code \+ " v" \+ h\.pacote\.version/.test(fonte('resultado-holos.js')), 'versão do pacote escrita como "HOLOS-V1 v2"');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\ncorrecoes da jornada: tudo ok');
process.exit(falhou ? 1 : 0);
