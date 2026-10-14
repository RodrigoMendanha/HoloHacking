/**
 * CORREÇÃO PÓS-AUDITORIA COWORK 14/10 (caso fictício de ponta a ponta) — servidor falso, dados fictícios.
 *   F10      status das 10 ferramentas (Disponível / Em preenchimento / Concluída / Mapa derivado) e contagem = etiquetas (0, 1, várias, 10/10)
 *   N81      o texto da aba Ferramentas usa o total de perguntas do pacote vigente (o v7 publicado tem 81), nunca o 84 fixo
 *   SOLTAR   Soltar o atendimento: a ferramenta aberta e ainda não gravada perde o "Atendimento: …"; a data sugerida do OQ³ sai
 *   OQ3      nova aplicação do OQ³ já vem com a data do atendimento ativo (sem digitar); a data digitada não é trocada
 *   HOLO     "HOLOSCAN concluído" não aparece antes de salvar; Salvar com o mapa já salvo não grava de novo
 *   CTA      botão principal e "Etapa atual" acompanham a jornada (Aplicar HOLOSCAN → Ir para Ferramentas → Abrir Holos IA)
 *   DASH     paciente ativa com etapa feita aparece no Acompanhamento ("Em atendimento"); "Abrir atendimento" seleciona o atendimento
 *   ABA      ficha de outra paciente abre na Visão geral (não na aba da paciente anterior)
 *   AGENDA   falha ao gravar nunca é silenciosa e não apaga o que foi digitado; redesenho no meio do preenchimento também não apaga
 *   RES      a classificação técnica da estratégia não aparece em "Quando / com que frequência"
 *   TEXTO    "Cadastro realizado com sucesso." (sem concordância pelo nome); toast no alto da tela
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Auditoria', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const RESP = { mapa_rotina_v1: { acorda: '06:30', dorme: '23:00', eventos: [{ inicio: '07:00', categoria: 'refeição', titulo: 'café' }] },
  gatilhos_respostas_v1: { gatilho: 'g', pensamento: 'p', emocao: 'e', resposta: 'r' }, conexao_pertencimento_v1: { contar: 'x', vinculos: [{ rotulo: 'X', natureza: 'pessoa', papel: 'apoia' }] },
  oq3: { quer: 'quer ficticio', precisa: 'precisa ficticio', consegue: 'consegue ficticio' }, pqq: { objetivo: 'objetivo ficticio', verdadeiro: 'pra que ficticio' } };
const agoraIso = () => new Date().toISOString();
const ferramenta = (pid, eid, id, status) => ins('tool_applications', { patient_id: pid, encounter_id: eid, ferramenta_id: id, versao_ferramenta: '1', status: status || 'concluida',
  respostas: RESP[id] || { registro: 'ficticio' }, iniciada_em: agoraIso(), concluida_em: status === 'rascunho' ? null : agoraIso() });
const atendimento = (pid, horasAtras) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - horasAtras * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const holoscan = (pid, eid) => rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: pid, encounter_id: eid, quando: new Date().toISOString().slice(0, 10) }) }).data;

const NOVE = ['oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1'];
const P0 = ins('patients', { nome: 'Zero Ficticia Ferramentas' }).id;
const P1 = ins('patients', { nome: 'Uma Ficticia Ferramenta' }).id; const E1 = atendimento(P1, 26);
ferramenta(P1, E1, 'oq3'); ferramenta(P1, E1, 'linha_momentum', 'rascunho');
const P3 = ins('patients', { nome: 'Varias Ficticia Ferramentas' }).id; const E3 = atendimento(P3, 30);
['oq3', 'pqq', 'roda_vida'].forEach(f => ferramenta(P3, E3, f));
const P10 = ins('patients', { nome: 'Todas Ficticia Ferramentas' }).id; const E10 = atendimento(P10, 30);
NOVE.forEach(f => ferramenta(P10, E10, f));
const PH = ins('patients', { nome: 'Holoscan Ficticia Jornada' }).id; const EH = atendimento(PH, 1); holoscan(PH, EH);
const PT = ins('patients', { nome: 'Ferramentas Ficticia Jornada' }).id; const ET = atendimento(PT, 30); holoscan(PT, ET); ferramenta(PT, ET, 'roda_vida');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
const P = await (await nav.createBrowserContext()).newPage();
await P.setViewport({ width: 1366, height: 900 });
P.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(P, srv);
await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await P.waitForSelector('#login-email', { visible: true });
await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { for (let i = 0; i < 60 && !(window.JornadaPaciente && window.JornadaPaciente.carregado()); i++) await new Promise(r => setTimeout(r, 100)); window.__toasts = []; const av = window.avisar; window.avisar = (m) => { window.__toasts.push(String(m)); return av && av(m); }; });
const espera = ms => new Promise(r => setTimeout(r, ms));

/* ============================ F10 — status e contagem ============================ */
const ferr = (pid) => P.evaluate(async (pid) => {
  window.levarParaFicha('aba:ferramentas', pid); await new Promise(r => setTimeout(r, 500));
  const est = document.querySelector('#aba-ferramentas .fic-forms-rodape .fic-form-estado');
  const chips = [...document.querySelectorAll('#aba-ferramentas .fic-ferramentas .fic-chip')].map(c => c.textContent.trim());
  if (window.remarcarCardsDeFerramenta) window.remarcarCardsDeFerramenta();
  const selo = (sel) => { const s = document.querySelector(sel + ' .ferr-status'); return s ? s.textContent.trim() : null; };
  const cards = {};
  ['linha_momentum', 'mapa_rotina_v1', 'mapa_crencas', 'gatilhos_respostas_v1', 'roda_vida', 'carta_futuro', 'conexao_pertencimento_v1'].forEach(id => { cards[id] = selo('[data-ferramenta="' + id + '"]'); });
  cards.oq3 = selo('[data-vista="vista-oq3"]'); cards.pqq = selo('[data-vista="vista-pqq"]'); cards.mapa = selo('[data-vista="vista-mapa"]');
  return { contagem: est ? est.textContent.trim() : '', chips, cards, sub: (document.querySelector('#aba-ferramentas .dash-sub') || {}).textContent || '', n: window.HoloscanOficial && window.HoloscanOficial.perguntas ? window.HoloscanOficial.perguntas().length : null };
}, pid);
const num = (txt) => { const m = /^(\d+) de (\d+) aplicadas$/.exec(txt); return m ? [Number(m[1]), Number(m[2])] : txt === 'nenhuma aplicada' ? [0, 10] : null; };
const f0 = await ferr(P0), f1 = await ferr(P1), f3 = await ferr(P3), f10 = await ferr(P10);
ok(f0.contagem === 'nenhuma aplicada' && f0.chips.length === 0 && Object.values(f0.cards).every(s => s === 'Disponível'), '0/10: "nenhuma aplicada", nenhuma etiqueta, as 10 ferramentas "Disponível" — ' + JSON.stringify(f0.cards));
ok(JSON.stringify(num(f1.contagem)) === '[1,10]' && f1.chips.join() === 'OQ³' && f1.cards.oq3 === 'Concluída' && f1.cards.linha_momentum === 'Em preenchimento' && f1.cards.mapa === 'Falta o PQQ' && f1.cards.pqq === 'Disponível',
  '1/10: OQ³ "Concluída" (antes ficava "Disponível"); rascunho da Linha do Momentum "Em preenchimento" e fora da contagem; Mapa "Falta o PQQ" — ' + f1.contagem + ' · ' + JSON.stringify(f1.cards));
ok(JSON.stringify(num(f3.contagem)) === '[4,10]' && f3.chips.length === 4 && f3.chips.includes('Mapa do Propósito') && f3.cards.oq3 === 'Concluída' && f3.cards.pqq === 'Concluída' && f3.cards.mapa === 'Montado' && f3.cards.roda_vida === 'Concluída',
  'várias: OQ³ + PQQ + Roda = "4 de 10" com 4 etiquetas — o Mapa do Propósito derivado aparece como etiqueta (antes contava sem etiqueta) — ' + f3.contagem + ' · ' + f3.chips.join(', '));
ok(JSON.stringify(num(f10.contagem)) === '[10,10]' && f10.chips.length === 10 && Object.values(f10.cards).every(s => s === 'Concluída' || s === 'Montado'),
  '10/10: "10 de 10 aplicadas", 10 etiquetas, nenhum card "Disponível" — ' + f10.chips.join(', '));
ok([f0, f1, f3, f10].every(f => { const n = num(f.contagem); return n && n[0] === f.chips.length; }), 'em todos os casos a contagem é igual ao número de etiquetas');

/* ============================ N81 — total de perguntas do pacote vigente ============================ */
const v7 = JSON.parse(readFileSync(new URL('../docs/v1/metodologia/pacote-metodologico-v7.json', import.meta.url), 'utf8'));
ok(v7.pacote.perguntas.length === 81 && f0.n > 0 && new RegExp('formulário: ' + f0.n + ' respostas').test(f0.sub) && (f0.n === 84 || !/84/.test(f0.sub)),
  'aba Ferramentas: "' + f0.sub.slice(0, 60) + '…" usa o total do pacote vigente (' + f0.n + ' aqui; o v7 publicado tem ' + v7.pacote.perguntas.length + ')');
const fichaJs = readFileSync(new URL('../ficha.js', import.meta.url), 'utf8');
ok(!/formulário: 84/.test(fichaJs) && /totalVigente\(\)/.test(fichaJs), 'nenhum "84" fixo no texto da aba (vem de HoloscanOficial.perguntas())');

/* ============================ OQ3 + SOLTAR ============================ */
const oq = await P.evaluate(async (pid, eid) => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid); await w(200);
  window.irParaSecao('corpo'); window.abrirFerramenta && window.abrirFerramenta('vista-oq3'); await w(300);
  document.getElementById('btn-nova-oq3').click(); await w(600);
  const at = window.AtendimentoAtual.atual();
  const d = new Date(at.occurred_at); const dia = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const comAt = document.getElementById('oq3-data').value;
  window.AtendimentoAtual.limpar(); await w(200);
  const semAt = document.getElementById('oq3-data').value;
  window.AtendimentoAtual.selecionarPorId(eid); await w(200);
  document.getElementById('oq3-data').value = '2026-01-02'; document.getElementById('oq3-data').dispatchEvent(new Event('input', { bubbles: true }));
  window.AtendimentoAtual.limpar(); await w(200);
  const digitada = document.getElementById('oq3-data').value;
  return { dia, comAt, semAt, digitada };
}, P1, E1);
ok(oq.comAt === oq.dia, 'OQ³: nova aplicação já vem com a data do atendimento ativo (' + oq.comAt + '), sem digitar');
ok(oq.semAt === '' && oq.digitada === '2026-01-02', 'Soltar limpa a data sugerida; a data que a nutricionista digitou nunca é trocada');
const solt = await P.evaluate(async (pid, eid) => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  window.definirPacienteAtivo(pid); window.AtendimentoAtual.selecionarPorId(eid); await w(200);
  window.irParaSecao('mente'); await w(200);
  document.querySelector('[data-ferramenta="mapa_crencas"]').click(); await w(800);
  const faixa = () => { const f = document.querySelector('#vista-gen-mente .form-faixa, .vista-ferramenta:not(.hidden) .form-faixa'); return f ? f.textContent : ''; };
  const antes = faixa();
  document.querySelector('#ficha-atendimento [data-at-acao="limpar"]') ? document.querySelector('#ficha-atendimento [data-at-acao="limpar"]').click() : window.AtendimentoAtual.limpar();
  await w(300);
  return { antes, depois: faixa(), atual: window.AtendimentoAtual.atual() };
}, P3, E3);
ok(/Atendimento:/.test(solt.antes) && /Sem atendimento selecionado/.test(solt.depois) && !solt.atual, 'Soltar: a ferramenta aberta (não gravada) deixa de dizer "Atendimento: …" — ' + solt.depois.replace(/\s+/g, ' ').slice(0, 90));

/* ============================ HOLO — concluído e idempotência ============================ */
const holo = await P.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); window.irParaSecao('holoscan'); await new Promise(r => setTimeout(r, 400));
  const av = document.getElementById('holo-concluido');
  return { existe: !!av, escondido: !!av && (av.hidden || getComputedStyle(av).display === 'none'), botao: document.getElementById('btn-salvar-holoscan').textContent.trim() };
}, P0);
ok(holo.existe && holo.escondido && holo.botao === 'Salvar HOLOSCAN', '"HOLOSCAN concluído" não aparece antes de salvar (antes era um texto fixo na página)');
const appJs = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
ok(/pontuacaoNaTela && pontuacaoNaTela\._supa_id\)\{\s*toast\("Este HOLOSCAN já está salvo/.test(appJs) && /aviso\.hidden = !salvo/.test(appJs),
  'Salvar com o mapa já salvo só avisa (nunca grava de novo); o aviso "concluído" segue o estado salvo');

/* ============================ CTA + ETAPA ATUAL ============================ */
const cta = (pid) => P.evaluate(async (pid) => {
  window.irParaSecao('pacientes'); window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 500));
  const pil = document.getElementById('fic-faixa-etapa'); const atual = document.querySelector('#ficha-jornada .fic-step.atual .fic-step-nome');
  return { cta: window.ctaFicha(), etapa: pil ? pil.querySelector('b').textContent : '', jornada: atual ? atual.textContent : null };
}, pid);
const cH = await cta(PH), cT = await cta(PT), c0 = await cta(P0);
ok(c0.cta.txt === 'Aplicar HOLOSCAN' && cH.cta.txt === 'Ir para Ferramentas' && cH.cta.ir === 'aba:ferramentas' && cT.cta.txt === 'Abrir Holos IA' && cT.cta.ir === 'aba:holos-ai',
  'botão principal pela etapa: sem HOLOSCAN "' + c0.cta.txt + '" → HOLOSCAN salvo "' + cH.cta.txt + '" → com ferramenta "' + cT.cta.txt + '"');
ok(cH.etapa === cH.jornada && cH.etapa === 'Ferramentas' && cT.etapa === 'Holos IA' && c0.etapa && c0.etapa !== '—',
  '"Etapa atual" = etapa atual da jornada (nunca "—" com a jornada andando): ' + [c0.etapa, cH.etapa, cT.etapa].join(' / '));
await cta(PT);
const clique = await P.evaluate(async () => { document.getElementById('btn-aplicar-holoscan').click(); await new Promise(r => setTimeout(r, 400)); const a = document.querySelector('#ficha-arquivos .aba.ativa'); return a ? a.dataset.aba : ''; });
ok(clique === 'holos-ai', 'o botão "Abrir Holos IA" leva à aba Holos IA da ficha (' + clique + ')');

/* ============================ ABA inicial ============================ */
const aba = await P.evaluate(async (a, b) => {
  window.levarParaFicha('aba:resultado-holos', a); await new Promise(r => setTimeout(r, 400));
  const antes = document.querySelector('#ficha-arquivos .aba.ativa').dataset.aba;
  window.irParaSecao('pacientes'); window.abrirFichaDe(b); await new Promise(r => setTimeout(r, 400));
  return { antes, depois: document.querySelector('#ficha-arquivos .aba.ativa').dataset.aba };
}, PH, P0);
ok(aba.antes === 'resultado-holos' && aba.depois === 'visao', 'ficha de outra paciente abre na Visão geral (antes herdava a aba "' + aba.antes + '")');

/* ============================ DASH ============================ */
const dash = await P.evaluate(async (ph) => {
  window.JornadaPaciente.recarregar(); await new Promise(r => setTimeout(r, 400));
  window.irParaSecao('dashboard'); window.redesenharDashboard && window.redesenharDashboard(); await new Promise(r => setTimeout(r, 400));
  const linhas = [...document.querySelectorAll('#dash-lista-acompanhamento .dash-acomp')].map(l => ({ pid: l.dataset.paciente, etapa: l.dataset.etapa, porque: l.querySelector('.dash-porque').textContent }));
  const btn = document.querySelector('#dash-lista-hoje [data-atendimento][data-paciente="' + ph + '"]');
  const rotulo = btn ? btn.textContent.trim() : '';
  if (btn) btn.click(); await new Promise(r => setTimeout(r, 500));
  const at = window.AtendimentoAtual.atual();
  return { linhas, rotulo, atendimento: at ? at.id : null, ativo: window.pacienteAtivoId() };
}, PH);
const lh = dash.linhas.find(l => l.pid === PH), lt = dash.linhas.find(l => l.pid === PT);
ok(lh && lh.etapa === 'em_atendimento' && /Próximo passo: Ferramentas/.test(lh.porque) && lt && /Próximo passo: Holos IA/.test(lt.porque),
  'Dashboard: pacientes ativas com HOLOSCAN/ferramentas aparecem no Acompanhamento como "Em atendimento" (antes sumiam) — ' + (lh ? lh.porque : '—'));
ok(!dash.linhas.some(l => l.pid === P0), 'quem ainda não começou nenhuma etapa não entra (nenhuma etapa inventada)');
ok(/Abrir atendimento/.test(dash.rotulo) && dash.ativo === PH && dash.atendimento === EH, '"Abrir atendimento" (Agenda de Hoje) abre a ficha COM o atendimento selecionado');

/* ============================ AGENDA ============================ */
const ag = await P.evaluate(async (pid) => {
  const w = ms => new Promise(r => setTimeout(r, ms));
  window.irParaSecao('agenda'); await w(200);
  window.Agenda.novaConsultaPara(pid); await w(300);
  document.getElementById('cf-nota').value = 'NOTA_FICTICIA_RETORNO';
  const am = new Date(Date.now() + 86400000); document.getElementById('cf-data').value = am.getFullYear() + '-' + String(am.getMonth() + 1).padStart(2, '0') + '-' + String(am.getDate()).padStart(2, '0');
  document.getElementById('cf-hora').value = '15:30';
  /* um redesenho no meio do preenchimento (troca de paciente, carga) nao apaga o digitado */
  window.Agenda.recarregar && await window.Agenda.recarregar(); await w(200);
  const aposRedesenho = { nota: document.getElementById('cf-nota').value, hora: document.getElementById('cf-hora').value };
  const R = window.DadosRouter, orig = R.from;
  R.from = function (t) { if (t === 'consultas') return { insert: () => ({ select: () => ({ single: () => Promise.reject(new Error('rede ficticia caiu')) }) }) }; return orig.apply(R, arguments); };
  window.__toasts.length = 0;
  document.querySelector('[data-salvar="consulta"]').click(); await w(600);
  R.from = orig;
  const aviso = document.getElementById('cal-aviso');
  return { aposRedesenho, aviso: aviso ? aviso.textContent : '', toasts: window.__toasts.join(' | '), nota: (document.getElementById('cf-nota') || {}).value, aberto: !!document.getElementById('cf-nota') };
}, P0);
ok(ag.aposRedesenho.nota === 'NOTA_FICTICIA_RETORNO' && ag.aposRedesenho.hora === '15:30', 'Agenda: redesenho no meio do preenchimento mantém o que foi digitado (antes "voltava ao padrão")');
ok(/Não foi possível salvar a consulta/.test(ag.aviso) && /Não foi possível salvar a consulta/.test(ag.toasts) && ag.aberto && ag.nota === 'NOTA_FICTICIA_RETORNO' && !srv.linhas('consultations').some(c => c.patient_id === P0),
  'Agenda: falha ao gravar mostra o erro (no formulário e no aviso) e mantém os campos; nada gravado — ' + JSON.stringify({ aviso: ag.aviso, t: ag.toasts.slice(0, 120), aberto: ag.aberto, nota: ag.nota }));

/* ============================ RES — frequência ============================ */
const res = await P.evaluate(() => {
  const dp = { tipo: 'primeira', direcionamentos: [], estrategias: [
    { id: 'e1', texto: 'Estrategia ficticia A', contexto: 'Comportamental/metodológica', prazo: '2 semanas' },
    { id: 'e2', texto: 'Estrategia ficticia B', contexto: '3 vezes por semana' }] };
  const div = document.createElement('div'); div.innerHTML = window.ResultadoDirecao.htmlPaciente(dp, [], {});
  return [...div.querySelectorAll('.rd-est')].map(li => li.innerText.replace(/\s+/g, ' '));
});
ok(res.length === 2 && !/Comportamental\/metodológica/.test(res[0]) && !/com que frequência/.test(res[0]) && /Prazo 2 semanas/.test(res[0]) && /com que frequência 3 vezes por semana/.test(res[1]),
  'Resultado: a classificação técnica não aparece em "Quando / com que frequência"; frequência de verdade continua — ' + res.join(' || '));
const contrato = readFileSync(new URL('../holos-ai-contrato.js', import.meta.url), 'utf8');
ok(!/contexto: CLASSIFICACOES\[/.test(contrato), 'importação da Holos IA não grava mais a classificação no campo de frequência');

/* ============================ TEXTO + toast ============================ */
ok(/toast\("Cadastro realizado com sucesso\."\)/.test(appJs) && !/cadastrado com sucesso/.test(appJs), 'cadastro: "Cadastro realizado com sucesso." (sem "Fulana cadastrado")');
const pub = readFileSync(new URL('../anamnese-publica.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
ok(/fale com sua nutricionista/.test(pub) && !/fale com ela/.test(pub) && /O que está na interseção/.test(html) && !/O que esta na interseção/.test(html), 'textos: "fale com sua nutricionista"; "O que está na interseção"');
const toast = await P.evaluate(() => { const t = document.getElementById('toast'); const cs = getComputedStyle(t); return { top: parseFloat(cs.top), pe: cs.pointerEvents }; });
ok(toast.top > 0 && toast.top < 200 && toast.pe === 'none', 'toast no alto da tela, sem receber clique (não cobre "Copiar link" / "Enviar pelo WhatsApp" no rodapé)');

ok(errosJS.length === 0, 'sem erro de JavaScript (' + errosJS.slice(0, 2).join(' | ') + ')');
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
