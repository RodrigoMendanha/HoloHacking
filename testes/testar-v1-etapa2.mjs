/**
 * V1 — ETAPA 2 — ANAMNESE E CONDUTA NA TELA (Supabase falso, com conta)
 *
 *  - sem atendimento nao ha como salvar anamnese nem conduta
 *  - trocar de paciente limpa o contexto; trocar de atendimento carrega o certo
 *  - salvar so confirma depois do servidor (falha => nada "salvo")
 *  - copiar a anamnese anterior e acao explicita; a copia aparece como previa
 *  - HOLOSCAN (rascunho do questionario) continua vazio depois da copia
 *  - campo vazio nao vira "negado"; diagnostico informado continua rotulado
 *  - conduta anterior aparece no retorno; acordo nao muda sozinho
 *  - revisao preserva a anterior; rascunho nao entra no dashboard nem na HOLOS AI
 *  - exportacao distingue revisoes e rotula rascunho
 *  - paciente so com anamnese/conduta nao e "sem historico"
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));

const srv = criarServidor();
srv.criarConta('a@holo.test', 'senha-a-123');
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctx = await nav.createBrowserContext();
const A = await ctx.newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test');
await A.type('#login-senha', 'senha-a-123');
await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);
await A.evaluate(() => { window.confirm = () => true; });

async function cadastrar(nome) {
  const id = await A.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 100)); const a = (window.pacientesTodos() || []).find(x => x.nome === nome); if (a) return a.id; }
    return null;
  }, nome);
  await esperar(200); return id;
}
const abrirAba = async (pid, aba) => A.evaluate(async (pid, aba) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="' + aba + '"]').click(); await new Promise(r => setTimeout(r, 350));
}, pid, aba);
const texto = (sel) => A.evaluate((sel) => (document.querySelector(sel) || {}).innerText || '', sel);
const iniciarAtendimento = (pid, iso) => A.evaluate(async (pid, iso) => (await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: iso })).id, pid, iso);
const anamneses = (pid) => srv.linhas('anamneses').filter(a => a.patient_id === pid);
const condutas = (pid) => srv.linhas('conducts').filter(c => c.patient_id === pid);

const PA = await cadastrar('Paciente Um');
const PB = await cadastrar('Paciente Dois');

/* ==================================================================== */
titulo('SEM ATENDIMENTO NAO HA ANAMNESE NEM CONDUTA');
/* ==================================================================== */
await abrirAba(PA, 'anamnese');
ok(/Selecione ou inicie um atendimento para registrar a anamnese\./.test(await texto('#aba-anamnese')) && !(await A.evaluate(() => !!document.querySelector('#aba-anamnese [data-an-acao]'))),
   'aba Anamnese sem atendimento: mensagem certa e nenhuma acao de salvar');
await abrirAba(PA, 'conduta');
ok(/Selecione ou inicie um atendimento para registrar a conduta\./.test(await texto('#aba-conduta')), 'aba Conduta sem atendimento: mensagem certa');
const abas = await A.evaluate(() => [...document.querySelectorAll('#ficha-arquivos .aba[data-aba]')].map(b => b.textContent.trim()));
ok(abas.indexOf('Anamnese') < abas.indexOf('HOLOSCAN') && abas.indexOf('Conduta') > abas.indexOf('Ferramentas'),
   'a ordem das abas reflete a jornada: Atendimento -> Anamnese -> HOLOSCAN -> Ferramentas/Exames -> Conduta: ' + abas.join(' · '));
ok(anamneses(PA).length === 0 && condutas(PA).length === 0, 'nada foi criado ao abrir as abas');

/* ==================================================================== */
titulo('ANAMNESE: RASCUNHO, ESTADOS DE CAMPO, SALVO');
/* ==================================================================== */
const E1 = await iniciarAtendimento(PA, '2026-05-01T12:00:00.000Z');
await abrirAba(PA, 'anamnese');
const cab = await texto('#aba-anamnese .an-topo');
ok(/Paciente Um/.test(cab) && /atendimento de/.test(cab), 'a aba mostra paciente e atendimento ativo: ' + cab.replace(/\s+/g, ' ').slice(0, 80));
await A.evaluate(async () => {
  document.querySelector('#aba-anamnese [data-an-acao="nova"]').click(); await new Promise(r => setTimeout(r, 200));
  document.querySelector('[data-an-adicionar="alergias_informadas"]').click(); await new Promise(r => setTimeout(r, 200));
  const it = document.querySelector('.an-item[data-an-dom="alergias_informadas"]');
  it.querySelector('[data-an-campo="campo"]').value = 'Amendoim';
  it.querySelector('[data-an-campo="estado"]').value = 'desconhecido';
  document.querySelector('[data-an-adicionar="condicoes_diagnosticos_informados"]').click(); await new Promise(r => setTimeout(r, 200));
  const dx = document.querySelector('.an-item[data-an-dom="condicoes_diagnosticos_informados"]');
  dx.querySelector('[data-an-campo="campo"]').value = 'Hipotireoidismo';
  dx.querySelector('[data-an-campo="valor"]').value = 'relatado pela paciente';
  document.querySelector('[data-an-adicionar="medidas"]').click(); await new Promise(r => setTimeout(r, 200));
  const md = document.querySelector('.an-item[data-an-dom="medidas"]');
  md.querySelector('[data-an-campo="campo"]').value = 'Peso';
  md.querySelector('[data-an-campo="origem"]').value = 'dado_medido';
  const cb = md.querySelector('[data-an-campo="tem_medida"]'); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true }));
  await new Promise(r => setTimeout(r, 200));
});
ok(anamneses(PA).length === 0, 'editar na tela nao grava nada antes de salvar');
// medida sem unidade -> recusa local, nada no servidor
let toast = await A.evaluate(async () => {
  const md = document.querySelector('.an-item[data-an-dom="medidas"]');
  md.querySelector('[data-an-campo="m_valor"]').value = '70';
  document.querySelector('#aba-anamnese [data-an-acao="rascunho"]').click(); await new Promise(r => setTimeout(r, 500));
  return document.getElementById('toast').textContent;
});
ok(/unidade/.test(toast) && anamneses(PA).length === 0, 'medida com valor e sem unidade e recusada antes de ir ao servidor: ' + toast);
await A.evaluate(async () => {
  document.querySelector('.an-item[data-an-dom="medidas"] [data-an-campo="m_unidade"]').value = 'kg';
  document.querySelector('#aba-anamnese [data-an-acao="rascunho"]').click(); await new Promise(r => setTimeout(r, 700));
});
let an = anamneses(PA);
ok(an.length === 1 && an[0].status === 'rascunho' && an[0].encounter_id === E1, 'rascunho salvo no servidor, ligado ao atendimento');
const itensAlergia = an[0].content.dominios.alergias_informadas.itens;
ok(itensAlergia[0].estado === 'desconhecido' && itensAlergia[0].valor === '' && !an[0].content.dominios.intolerancias_informadas,
   'campo vazio nao virou "negado": alergia ficou "desconhecido"; intolerancias nem existem (nada afirmado, nada negado)');
ok(an[0].content.dominios.medidas.itens[0].medida.unidade === 'kg' && an[0].content.dominios.medidas.itens[0].origem === 'dado_medido', 'medida com valor, unidade e origem "dado medido"');
ok(/Rascunho salvo/.test(await texto('#an-estado')), 'estado do salvamento: ' + await texto('#an-estado'));
const seloDx = await A.evaluate(() => document.querySelector('.an-item[data-an-dom="condicoes_diagnosticos_informados"] .an-selo.informado')?.textContent || '');
ok(/informado, não confirmado/.test(seloDx), 'diagnostico informado pelo paciente leva o selo "informado, não confirmado"');

// falha de rede: nada "salvo"
srv.falhar.push({ tabela: 'rpc:salvar_anamnese', acao: 'rpc' });
const falha = await A.evaluate(async () => {
  document.querySelector('#aba-anamnese [data-an-acao="salvar"]').click(); await new Promise(r => setTimeout(r, 700));
  return { estado: document.getElementById('an-estado').textContent, toast: document.getElementById('toast').textContent };
});
ok(/Não foi possível salvar/.test(falha.estado) && !/Salvo$/.test(falha.estado) && anamneses(PA)[0].status === 'rascunho',
   'servidor falhou: nenhum "salvo", o registro continua rascunho: ' + falha.estado);
srv.falhar.length = 0;
await A.evaluate(async () => { document.querySelector('#aba-anamnese [data-an-acao="salvar"]').click(); await new Promise(r => setTimeout(r, 700)); });
an = anamneses(PA);
ok(an.length === 1 && an[0].status === 'salvo' && /^Salvo/.test(await texto('#an-estado')), 'agora sim: salvo (mesma linha do rascunho, rev. 1)');

/* ==================================================================== */
titulo('ANAMNESE: REVISAO PRESERVA A ANTERIOR; REVISADO');
/* ==================================================================== */
await A.evaluate(async () => {
  document.querySelector('#aba-anamnese [data-an-acao="corrigir"]').click(); await new Promise(r => setTimeout(r, 200));
  const it = document.querySelector('.an-item[data-an-dom="alergias_informadas"]');
  it.querySelector('[data-an-campo="estado"]').value = 'negado_explicitamente';
  document.querySelector('#aba-anamnese [data-an-acao="salvar"]').click(); await new Promise(r => setTimeout(r, 700));
});
an = anamneses(PA).sort((a, b) => a.revision_number - b.revision_number);
ok(an.length === 2 && an[0].superseded_at && an[0].content.dominios.alergias_informadas.itens[0].estado === 'desconhecido' &&
   an[1].revision_number === 2 && an[1].supersedes_id === an[0].id && an[1].content.dominios.alergias_informadas.itens[0].estado === 'negado_explicitamente',
   'corrigir criou a rev. 2; a rev. 1 ficou intacta e marcada como substituida');
const revs = await texto('#aba-anamnese .an-revisoes');
ok(/rev\. 1/.test(revs) && /substituída/.test(revs) && /rev\. 2/.test(revs), 'o historico de revisoes aparece na aba: ' + revs.replace(/\s+/g, ' ').slice(0, 90));
await A.evaluate(async () => { document.querySelector('#aba-anamnese [data-an-acao="revisar"]').click(); await new Promise(r => setTimeout(r, 700)); });
an = anamneses(PA).sort((a, b) => a.revision_number - b.revision_number);
ok(an.length === 2 && an[1].status === 'revisado' && an[1].reviewed_by, '"Marcar como revisada" muda o estado da mesma revisao, com quem conferiu');

/* ==================================================================== */
titulo('TROCA DE PACIENTE E DE ATENDIMENTO');
/* ==================================================================== */
await A.evaluate(async (pb) => { window.definirPacienteAtivo(pb); await new Promise(r => setTimeout(r, 200)); }, PB);
await abrirAba(PB, 'anamnese');
ok(/Selecione ou inicie um atendimento/.test(await texto('#aba-anamnese')), 'trocar para Paciente Dois limpa o contexto: sem atendimento, sem anamnese de A');
const E2 = await iniciarAtendimento(PA, '2026-06-01T12:00:00.000Z');
await abrirAba(PA, 'anamnese');
const copiaBtn = await A.evaluate(() => !!document.querySelector('#aba-anamnese [data-an-acao="copiar"]'));
ok(copiaBtn && anamneses(PA).filter(a => a.encounter_id === E2).length === 0, 'no atendimento novo (retorno) ha a acao "Criar a partir da anamnese anterior" e nada foi copiado sozinho');
await A.evaluate(async (e1) => { window.AtendimentoAtual.selecionarPorId(e1); await new Promise(r => setTimeout(r, 300)); }, E1);
ok(/Revisão vigente: rev\. 2 · revisado/.test(await texto('#aba-anamnese')), 'voltar ao atendimento 1 carrega a anamnese dele (rev. 2 revisada)');
await A.evaluate(async (e2) => { window.AtendimentoAtual.selecionarPorId(e2); await new Promise(r => setTimeout(r, 300)); }, E2);

/* ==================================================================== */
titulo('COPIA EXPLICITA DA ANTERIOR; HOLOSCAN INTOCADO');
/* ==================================================================== */
const qAntes = await A.evaluate((pid) => JSON.stringify((JSON.parse(localStorage.getItem('holohacking.questionario')) || {})[pid] || {}), PA);
await A.evaluate(async () => {
  document.querySelector('#aba-anamnese [data-an-acao="copiar"]').click(); await new Promise(r => setTimeout(r, 300));
});
ok(await A.evaluate(() => !document.getElementById('modal-confirmar-acao').classList.contains('hidden')) && anamneses(PA).filter(a => a.encounter_id === E2).length === 0,
   'copiar pede confirmacao; ainda nada copiado');
await A.evaluate(async () => { document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800)); });
const copia = anamneses(PA).find(a => a.encounter_id === E2);
ok(copia && copia.status === 'rascunho' && copia.copied_from_previous && copia.source_anamnesis_id === an[1].id, 'a copia nasce como rascunho com source_anamnesis_id da rev. 2');
const previos = await A.evaluate(() => ({ itens: document.querySelectorAll('#aba-anamnese .an-item.previo').length, selos: document.querySelectorAll('#aba-anamnese .an-selo.previo').length, texto: document.querySelector('#aba-anamnese .an-titulo').innerText }));
ok(previos.itens === 3 && previos.selos >= 3 && /itens prévios precisam ser revisados/i.test(previos.texto), 'na tela, cada item copiado aparece como previo a revisar');
const qDepois = await A.evaluate((pid) => JSON.stringify((JSON.parse(localStorage.getItem('holohacking.questionario')) || {})[pid] || {}), PA);
ok(qAntes === '{}' && qDepois === '{}' && srv.linhas('holoscan_applications').length === 0, 'o HOLOSCAN continua vazio: a copia nao preenche questionario nem aplicacao');

/* ==================================================================== */
titulo('CONDUTA: SEM SCORE, COM ACORDOS; RETORNO MOSTRA A ANTERIOR');
/* ==================================================================== */
await A.evaluate(async (e1) => { window.AtendimentoAtual.selecionarPorId(e1); await new Promise(r => setTimeout(r, 200)); }, E1);
await abrirAba(PA, 'conduta');
await A.evaluate(async () => {
  document.querySelector('#aba-conduta [data-cd-acao="nova"]').click(); await new Promise(r => setTimeout(r, 200));
  document.getElementById('cd-objective').value = 'Dormir melhor';
  document.getElementById('cd-return_plan').value = 'retorno em 3 semanas';
  document.querySelector('#aba-conduta [data-cd-acao="add-acordo"]').click(); await new Promise(r => setTimeout(r, 200));
  const li = document.querySelector('#cd-acordos .cd-acordo.edit');
  li.querySelector('[data-cd-g="description"]').value = 'Jantar até 20h';
  li.querySelector('[data-cd-g="status"]').value = 'acordado';
  document.querySelector('#aba-conduta [data-cd-acao="salvar"]').click(); await new Promise(r => setTimeout(r, 800));
});
let cd = condutas(PA);
ok(cd.length === 1 && cd[0].status === 'salvo' && cd[0].encounter_id === E1 && cd[0].objective === 'Dormir melhor' && srv.linhas('holoscan_applications').length === 0,
   'conduta salva sem HOLOSCAN, sem ferramenta, sem nota alguma');
const ag = srv.linhas('agreements').filter(g => g.conduct_id === cd[0].id);
ok(ag.length === 1 && ag[0].status === 'acordado' && ag[0].description === 'Jantar até 20h', 'o acordo foi salvo com a situacao escolhida');
await A.evaluate(async (e2) => { window.AtendimentoAtual.selecionarPorId(e2); await new Promise(r => setTimeout(r, 300)); }, E2);
const retorno = await texto('#cd-anterior');
ok(/Conduta anterior \(retorno\)/.test(retorno) && /Dormir melhor/.test(retorno) && /retorno em 3 semanas/.test(retorno) && /Jantar até 20h/.test(retorno) && /Acordado/i.test(retorno),
   'no atendimento de retorno, a conduta anterior aparece com objetivo, retorno planejado e acordos');
ok(condutas(PA).filter(c => c.encounter_id === E2).length === 0 && srv.linhas('agreements').find(g => g.id === ag[0].id).status === 'acordado',
   'nada foi transportado nem mudou de estado sozinho');
await A.evaluate(async () => {
  document.querySelector('#aba-conduta [data-cd-acao="nova"]').click(); await new Promise(r => setTimeout(r, 200));
  document.querySelector('#aba-conduta [data-cd-levar]').click(); await new Promise(r => setTimeout(r, 200));
  document.getElementById('cd-decisao').value = 'continuar';
  document.getElementById('cd-decisao-nota').value = 'manter o combinado; dificuldade com fins de semana';
  document.getElementById('cd-objective').value = 'Manter o jantar cedo';
  document.querySelector('#aba-conduta [data-cd-acao="salvar"]').click(); await new Promise(r => setTimeout(r, 800));
});
const cd2 = condutas(PA).find(c => c.encounter_id === E2);
const ag2 = srv.linhas('agreements').filter(g => g.conduct_id === (cd2 || {}).id);
ok(cd2 && cd2.previous_conduct_id === cd[0].id && cd2.previous_decision === 'continuar' && /fins de semana/.test(cd2.previous_decision_note),
   'a nova conduta registra a decisao sobre a anterior com justificativa');
ok(ag2.length === 1 && ag2[0].origin_agreement_id === ag[0].id && ag2[0].status === 'proposto' && srv.linhas('agreements').find(g => g.id === ag[0].id).status === 'acordado',
   '"Levar acordos" copia como proposto, com origem; o acordo anterior nao mudou');
await A.evaluate(async () => {
  document.querySelector('#cd-acordos [data-cd-acordo-estado][data-cd-estado="em_acompanhamento"]').click(); await new Promise(r => setTimeout(r, 200));
  document.getElementById('cd-acordo-nota').value = 'relatou que conseguiu na maioria dos dias';
  document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 700));
});
const agMud = srv.linhas('agreements').find(g => g.id === ag2[0].id);
ok(agMud.status === 'em_acompanhamento' && agMud.status_changed_at && /maioria dos dias/.test(agMud.status_note), 'mudar a situacao de um acordo e acao explicita, confirmada, com nota: ' + agMud.status + ' / ' + agMud.status_note);

/* ==================================================================== */
titulo('VISAO GERAL, TIMELINE, DASHBOARD, HOLOS AI, EXPORTACAO');
/* ==================================================================== */
const diag = await A.evaluate(async () => {
  const acoes = [...document.querySelectorAll('#aba-conduta [data-cd-acao]')].map(b => b.dataset.cdAcao);
  const b = document.querySelector('#aba-conduta [data-cd-acao="corrigir"]'); if (!b) return { acoes, semBotao: true, toast: document.getElementById('toast').textContent };
  b.click(); await new Promise(r => setTimeout(r, 200));
  const obs = document.getElementById('cd-observations'); if (!obs) return { acoes, semCampo: true };
  obs.value = 'rascunho de correção';
  document.querySelector('#aba-conduta [data-cd-acao="rascunho"]').click(); await new Promise(r => setTimeout(r, 700));
  return { acoes, estado: document.getElementById('cd-estado').textContent, toast: document.getElementById('toast').textContent };
});
const rasc = condutas(PA).find(c => c.encounter_id === E2 && c.status === 'rascunho');
ok(rasc && rasc.revision_number === 2 && condutas(PA).find(c => c.id === cd2.id).status === 'salvo' && !condutas(PA).find(c => c.id === cd2.id).superseded_at,
   'um rascunho de correcao coexiste com a rev. 1 salva, que continua vigente — ' + JSON.stringify(diag) + ' / condutas E2: ' + JSON.stringify(condutas(PA).filter(c => c.encounter_id === E2).map(c => [c.revision_number, c.status, !!c.superseded_at])));
await abrirAba(PA, 'visao');
const visao = await texto('#fic-atendimento-clinico');
ok(/Último atendimento/i.test(visao) && /Conduta vigente/i.test(visao) && /rev\. 1 · salvo/.test(visao) && /Manter o jantar cedo/.test(visao) && !/rascunho de correção/.test(visao),
   'Visao geral: ultimo atendimento, anamnese e conduta VIGENTE (rev. 1), nunca o rascunho — ' + visao.replace(/\s+/g, ' ').slice(0, 300));
const tl = await A.evaluate(() => [...document.querySelectorAll('#fic-visao-timeline .fic-evento')].map(e => e.innerText.replace(/\s+/g, ' ')).join(' | '));
ok(/Anamnese salva/.test(tl) && /Anamnese revisada \(rev\. 2\)/.test(tl) && /Conduta salva/.test(tl) && !/rascunho de correção/.test(tl),
   'timeline: anamnese salva, revisao como revisao, conduta salva; rascunho fora — ' + tl.slice(0, 300));
const filtros = await A.evaluate(() => [...document.querySelectorAll('[data-filtro-linha]')].map(b => b.textContent.trim()));
ok(filtros.includes('Anamnese') && filtros.includes('Conduta'), 'filtros da timeline: ' + filtros.join(' · '));
const dash = await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="dashboard"]').click(); await new Promise(r => setTimeout(r, 400)); return (document.getElementById('dash-sem-conduta') || {}).innerText || ''; });
ok(dash === '' || !/Paciente Um/.test(dash), 'dashboard: Paciente Um tem conduta salva nos dois atendimentos — nao esta em "sem conduta salva"' + (dash ? ' (' + dash.replace(/\s+/g, ' ').slice(0, 60) + ')' : ''));
const E3 = await iniciarAtendimento(PB, '2026-05-02T12:00:00.000Z');
await A.evaluate(async (e3) => { await window.Conduta.salvar({ encounter_id: e3, status: 'rascunho', objective: 'so rascunho' }).catch(() => {}); }, E3);
const dash2 = await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="pacientes"]').click(); document.querySelector('.nav-item[data-secao="dashboard"]').click(); await new Promise(r => setTimeout(r, 400)); return (document.getElementById('dash-sem-conduta') || {}).innerText || ''; });
ok(/Paciente Dois/.test(dash2) && /conduta em rascunho/.test(dash2), 'dashboard: atendimento com conduta so em RASCUNHO conta como "sem conduta salva" (rascunho nao e conduta)');
/* Correcao do dashboard (pos-6.5): "Abrir conduta" leva ao ATENDIMENTO (selecionado), na aba Conduta — nao so a ficha. */
const irConduta = await A.evaluate(async (e3) => {
  const bt = document.querySelector('#dash-sem-conduta [data-atendimento="' + e3 + '"]');
  if (!bt) return { achou: false };
  bt.click(); await new Promise(r => setTimeout(r, 400));
  return { achou: true, botao: bt.textContent.trim(), atual: (window.AtendimentoAtual.atual() || {}).id,
    aba: document.querySelector('[data-aba].ativa')?.dataset.aba, secao: document.querySelector('.secao.ativa')?.id };
}, E3);
ok(irConduta.achou && irConduta.atual === E3 && irConduta.aba === 'conduta' && irConduta.secao === 'secao-pacientes',
   'dashboard: "Abrir conduta" seleciona o atendimento sem conduta e abre a aba Conduta: ' + JSON.stringify(irConduta));
const gerarContexto = (eid) => A.evaluate(async (pid, eid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 200));
  window.AtendimentoAtual.selecionarPorId(eid);
  document.querySelector('[data-aba="holos-ai"]').click(); await new Promise(r => setTimeout(r, 300));
  document.querySelector('.ai-atalho-ctx[data-ctx="completo"]').click(); await new Promise(r => setTimeout(r, 200));
  return (document.getElementById('ai-hub-texto') || {}).textContent || '';
}, PA, eid);
const ctx1 = await gerarContexto(E1);
ok(/## Anamnese \(salva\/revisada/.test(ctx1) && /rev\. 2 · revisado/.test(ctx1) && /Amendoim: \[Negado explicitamente\]/.test(ctx1) && /Hipotireoidismo: relatado pela paciente \(Relato do paciente; informado, não confirmado\)/.test(ctx1),
   'HOLOS AI (atendimento 1): anamnese CONSOLIDADA (rev. 2 revisada), com estado e origem e o "informado, não confirmado"');
const contexto = await gerarContexto(E2);
ok(!/## Anamnese/.test(contexto), 'HOLOS AI (atendimento 2): a anamnese deste atendimento e RASCUNHO (copia) e NAO entra');
ok(/## Conduta e acordos/.test(contexto) && /Manter o jantar cedo/.test(contexto) && /Jantar até 20h \[Em acompanhamento\]/.test(contexto) && !/rascunho de correção/.test(contexto),
   'HOLOS AI: conduta vigente e acordos salvos; o rascunho de correcao fica fora');
ok(!/### Índice HOLOS|### Tríada|- Físico:|faixa \d|### Leitura Integrada|CMB-|\bREC-|\bSEL-|nota \d/.test(contexto), 'nenhuma metodologia nao homologada no contexto');

const exportado = await A.evaluate(async () => {
  let dados = null; const origURL = URL.createObjectURL;
  URL.createObjectURL = (blob) => { blob.text().then(t => { dados = JSON.parse(t); }); return 'blob:fake'; };
  const origCreate = document.createElement.bind(document);
  document.createElement = function (tag) { const el = origCreate(tag); if (tag === 'a') el.click = () => {}; return el; };
  document.getElementById('btn-exportar-paciente').click(); await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao');
  if (modal && !modal.classList.contains('hidden')) { document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800)); }
  await new Promise(r => setTimeout(r, 400)); URL.createObjectURL = origURL; document.createElement = origCreate; return dados;
});
ok(exportado && exportado.anamneses && exportado.anamneses.length === 3 && exportado.anamneses.filter(a => a.registro_oficial).length === 2 &&
   exportado.anamneses.some(a => a.revision_number === 2 && a.supersedes_id) && exportado.anamneses.some(a => a.status === 'rascunho' && /RASCUNHO/.test(a.rotulo)),
   'exportacao: 3 anamneses (2 oficiais, 1 rascunho rotulado), revisoes com supersedes_id');
ok(exportado && exportado.condutas && exportado.condutas.length === 3 && exportado.condutas.every(c => Array.isArray(c.acordos)) &&
   exportado.condutas.some(c => c.previous_decision === 'continuar') && exportado.condutas.some(c => c.status === 'rascunho' && !c.registro_oficial),
   'exportacao: 3 condutas com acordos, decisao sobre a anterior e rascunho rotulado');

/* ==================================================================== */
titulo('EXCLUSAO: ANAMNESE/CONDUTA SAO HISTORICO');
/* ==================================================================== */
const PC = await cadastrar('Paciente Tres');
const EC = await iniciarAtendimento(PC, '2026-05-03T12:00:00.000Z');
await A.evaluate(async (ec) => { await window.Anamnese.salvar({ encounter_id: ec, content: {}, status: 'rascunho' }); }, EC);
const modalExcluir = await A.evaluate(async (id) => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click(); await new Promise(r => setTimeout(r, 250));
  const v = document.getElementById('voltar-lista'); if (v) v.click();
  document.querySelector('[data-menu="' + id + '"]').click(); await new Promise(r => setTimeout(r, 150));
  document.querySelector('#menu-' + id + ' [data-item="remover"]').click(); await new Promise(r => setTimeout(r, 700));
  return { titulo: document.getElementById('modal-confirmar-titulo').textContent, corpo: document.getElementById('modal-confirmar-corpo').innerText,
           excluir: !!document.getElementById('modal-confirmar-ok') };
}, PC);
ok(/Não é possível excluir Paciente Tres/.test(modalExcluir.titulo) && !modalExcluir.excluir && /1 anamnese/.test(modalExcluir.corpo),
   'paciente com atendimento e anamnese (rascunho) nao e "vazio": so arquivar — ' + modalExcluir.corpo.replace(/\s+/g, ' ').slice(0, 80));
await A.evaluate(() => { const f = document.getElementById('modal-confirmar-fechar'); if (f) f.click(); });

console.log('');
ok(errosJS.length === 0, errosJS.length ? 'ERRO DE JS: ' + errosJS[0] : 'sem erro de JS');
await nav.close();
process.exit(falhou ? 1 : 0);
