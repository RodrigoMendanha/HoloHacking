/**
 * ANAMNESE V2 na tela (Supabase falso, com conta):
 *   primeira consulta (7 blocos, chips, listas, sintomas, medidas, bloco intimo fechado), autosave (2,5 s, ao sair do campo,
 *   uma chamada por vez, expected_updated_at), recarregar, outra sessao (mesmo conteudo; conflito nao sobrescreve),
 *   logout/login, concluir, resumo (anamnese e Visao geral), corrigir (nova revisao), retorno sugerido / troca manual,
 *   "Ver anamnese completa anterior", copiar da anterior so na primeira consulta, conteudo intimo fora do relatorio sem marcacao,
 *   XSS, celular, teclado/ARIA, outro paciente / outra conta / arquivado recusados, coerencia formulario -> dominios em TODA
 *   gravacao, anamnese antiga intacta, e nao interferencia (HOLOSCAN, Resultado HOLOS, ferramentas, LI, exames).
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import '../anamnese-v2.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const V2 = globalThis.AnamneseV2;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
const q = (tabela, acao, extra, uid) => srv.tratar({ op: 'query', uid: uid || UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid || UA, nome, args });
const PA = ins('patients', { nome: 'Paciente Anamnese Ficticia' }).id;
const PB = ins('patients', { nome: 'Paciente Antiga Ficticia' }).id;
const PC = ins('patients', { nome: 'Paciente Arquivada Ficticia' }).id;
const enc = (pid, h) => ins('encounters', { patient_id: pid, occurred_at: new Date(Date.now() - h * 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const E1 = enc(PA, 72), E2 = enc(PA, 48), E3 = enc(PA, 1), EB = enc(PB, 5), EC = enc(PC, 5);
/* anamnese ANTIGA (formato anterior), ja consolidada, de outra paciente */
const LEGADO = { dominios: { alergias_informadas: { itens: [{ campo: 'Camarão', valor: '', estado: 'informado', origem: 'relato_paciente', medida: null, previo: false }] } } };
const legId = rpc('salvar_anamnese', { payload: { encounter_id: EB, content: LEGADO, status: 'salvo' } }).data;
srv.tabelas.patients.find(p => p.id === PC).status = 'inativo';

const anamneses = (pid) => srv.linhas('anamneses').filter(a => a.patient_id === pid).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
const coerente = (a) => a && V2.ehV2(a.content) && JSON.stringify(a.content.dominios) === JSON.stringify(V2.gerarDominiosDaAnamneseV2(a.content.formulario, a.content.meta, a.content.tipo));
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'integrated_readings',
  'lab_collections', 'lab_results', 'holos_results', 'methodology_packages'].map(t => srv.linhas(t)))).digest('hex');
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
  await entrar(P);
  return P;
}
async function entrar(P) {
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
}
const abrir = (P, pid, eid) => P.evaluate(async (pid, eid) => {
  window.definirPacienteAtivo(pid);
  await window.Anamnese.carregar();
  window.AtendimentoAtual.selecionarPorId(eid);
  window.levarParaFicha('aba:anamnese', pid);
  await new Promise(r => setTimeout(r, 400));
}, pid, eid);
const digitar = (P, sel, v) => P.evaluate((sel, v) => { const e = document.querySelector('#aba-anamnese ' + sel); e.focus(); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, sel, v);
const sair = (P, sel) => P.evaluate((sel) => { const e = document.querySelector('#aba-anamnese ' + sel); e.blur(); e.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); }, sel);
const clicar = (P, sel) => P.evaluate((sel) => { const b = document.querySelector('#aba-anamnese ' + sel) || document.querySelector(sel); if (!b) return false; b.click(); return true; }, sel);
const estado = (P) => P.evaluate(() => (document.getElementById('an2-estado') || {}).textContent || '');
const abrirBloco = (P, id) => P.evaluate((id) => { const d = document.querySelector('[data-an2-bloco="' + id + '"]'); if (d && !d.open) d.open = true; }, id);
const shot = async (P, nome) => { if (process.env.SHOT_DIR) { await P.addStyleTag({ content: '.topo,#toast{display:none!important}' }); const el = await P.$('#aba-anamnese'); if (el) await el.screenshot({ path: process.env.SHOT_DIR + '/' + nome + '.png' }); } };

const A = await sessao();

/* ----- primeira consulta: abrir nao grava; primeira por padrao (sem anterior) ----- */
await abrir(A, PA, E1);
const t0 = await A.evaluate(() => ({ form: !!document.querySelector('.an2-form'), blocos: [...document.querySelectorAll('.an2-bloco-t')].map(x => x.textContent),
  primeira: document.querySelector('[data-an2-tipo="primeira"]').getAttribute('aria-checked'), sugerido: !!document.querySelector('.an2-sugerido'),
  intimoFechado: !document.querySelector('.an2-intimo').open, copiar: !!document.querySelector('[data-an-acao="copiar"]') }));
ok(t0.form && t0.blocos.join('|') === 'Motivo e objetivo|História e rotina alimentar|Saúde e sintomas|Medicamentos, suplementos e restrições|Estilo de vida|Histórico e contexto|Avaliação objetiva',
  'primeira consulta: os 7 blocos na ordem');
ok(t0.primeira === 'true' && !t0.sugerido && !t0.copiar, 'sem anamnese anterior: Primeira consulta, sem sugestão de retorno e sem cópia');
ok(t0.intimoFechado, 'bloco íntimo (campos emocionais / sentido pessoal) fechado por padrão');
ok(anamneses(PA).length === 0, 'abrir a anamnese não grava nada');

/* ----- autosave: 2,5 s depois de digitar ----- */
const XSS = '<img src=x onerror="window.__xss=1"> energia';
await digitar(A, '[data-an2-campo="motivo.objetivo"]', XSS);
await espera(1200);
ok(anamneses(PA).length === 0 && /ainda não salvas/.test(await estado(A)), 'antes de 2,5 s: nada gravado, "Alterações ainda não salvas"');
await espera(2300);
let an = anamneses(PA);
ok(an.length === 1 && an[0].status === 'rascunho' && an[0].content.formulario.motivo.objetivo === XSS && coerente(an[0]) && /Salvo automaticamente/.test(await estado(A)),
  'autosave depois de 2,5 s: rascunho no servidor, domínios coerentes, "Salvo automaticamente…"');
ok(await A.evaluate(() => window.__xss !== 1), 'XSS no campo: não executa');

/* ----- chips, sintomas, listas, medidas ----- */
await abrirBloco(A, 'alimentar');
await clicar(A, '[data-an2-chip="alimentar.quem_prepara"][data-valor="Eu"]');
await clicar(A, '[data-an2-chip="alimentar.quem_prepara"][data-valor="Família"]');
await clicar(A, '[data-an2-chip="alimentar.maior_fome"][data-valor="Noite"]');
await abrirBloco(A, 'saude');
await clicar(A, '[data-an2-chip="saude.intestino"][data-valor="Outro"]'); await espera(100);
await digitar(A, '[data-an2-campo="saude.intestino_outro"]', 'varia com a semana');
await clicar(A, '[data-an2-chip="saude.azia_refluxo"][data-valor="nao"]');
await clicar(A, '[data-an2-chip="saude.distensao"][data-valor="frequente"]');
await clicar(A, '[data-an2-detalhar="saude.distensao"]'); await espera(100);
await digitar(A, '[data-an2-campo="saude.distensao_detalhe"]', 'à noite');
await abrirBloco(A, 'restricoes');
for (const [i, nome, freq] of [[0, 'Losartana', '1x/dia'], [1, 'Metformina', '2x/dia']]) {
  await clicar(A, '[data-an2-add="restricoes.medicamentos"]'); await espera(80);
  await digitar(A, '[data-an2-linha="restricoes.medicamentos.' + i + '.nome"]', nome);
  await digitar(A, '[data-an2-linha="restricoes.medicamentos.' + i + '.frequencia"]', freq);
}
await clicar(A, '[data-an2-add="restricoes.suplementos"]'); await espera(80);
await digitar(A, '[data-an2-linha="restricoes.suplementos.0.nome"]', 'Vitamina D');
await clicar(A, '[data-an2-add="restricoes.suplementos"]'); await espera(80);
await digitar(A, '[data-an2-linha="restricoes.suplementos.1.nome"]', 'Ômega 3');
await clicar(A, '[data-an2-add="restricoes.alergias"]'); await espera(80);
await digitar(A, '[data-an2-linha="restricoes.alergias.0.nome"]', 'Amendoim');
await A.evaluate(() => { const c = document.querySelector('[data-an2-nega="restricoes.intolerancias"]'); c.checked = true; c.dispatchEvent(new Event('change', { bubbles: true })); });
await abrirBloco(A, 'estilo');
await clicar(A, '[data-an2-chip="estilo.sono"][data-valor="Ruim"]');
await clicar(A, '[data-an2-chip="estilo.atividade"][data-valor="1–2x/semana"]');
await abrirBloco(A, 'contexto');
await A.evaluate(() => { document.querySelector('.an2-intimo').open = true; });
await digitar(A, '[data-an2-campo="contexto.emocional"]', 'INTIMO_EMOCIONAL');
await abrirBloco(A, 'objetiva');
await digitar(A, '[data-an2-campo="objetiva.peso"]', '72,4');
await digitar(A, '[data-an2-campo="objetiva.altura"]', '165');
await clicar(A, '[data-an2-add="objetiva.circunferencias"]'); await espera(80);
await digitar(A, '[data-an2-linha="objetiva.circunferencias.0.nome"]', 'Cintura');
await digitar(A, '[data-an2-linha="objetiva.circunferencias.0.valor"]', '92');
await sair(A, '[data-an2-linha="objetiva.circunferencias.0.valor"]');
await espera(1500);
an = anamneses(PA);
const d = an[0].content.dominios, it = (dom, campo) => ((d[dom] || {}).itens || []).find(x => x.campo === campo);
ok(an.length === 1 && coerente(an[0]), 'salvar ao sair do campo: uma linha só (o mesmo rascunho), domínios coerentes com o formulário');
ok(/Eu, Família/.test(it('rotina_acesso', 'Quem prepara as refeições').valor) && it('historia_alimentar', 'Períodos de maior fome').valor === 'Noite' && it('sintomas_relatados', 'Intestino').valor === 'Outro: varia com a semana',
  'chips (múltipla escolha, "Outro" com texto) gravados');
ok(it('sintomas_relatados', 'Azia / refluxo').estado === 'negado_explicitamente' && it('sintomas_relatados', 'Distensão').estado === 'informado' && it('sintomas_relatados', 'Distensão').valor === 'Frequente — à noite' && !it('sintomas_relatados', 'Náusea'),
  'sintomas: "Não" = negado explicitamente; "Frequente" + detalhe = informado; sintoma não respondido não gera nada');
ok(d.medicamentos.itens.length === 2 && d.suplementos.itens.length === 2 && it('alergias_informadas', 'Amendoim') && d.intolerancias_informadas.itens[0].estado === 'negado_explicitamente',
  'medicamentos e suplementos múltiplos; alergia; "Nega intolerâncias" = negado explicitamente');
ok(it('medidas', 'Peso').medida.valor === 72.4 && it('medidas', 'Peso').medida.unidade === 'kg' && it('medidas', 'Altura').medida.unidade === 'cm' && it('medidas', 'Cintura').medida.unidade === 'cm' && d.medidas.itens.every(x => x.origem === 'dado_medido'),
  'medidas com unidade e origem "dado medido" (altura usa a unidade mostrada na tela)');
ok(d.emocional && d.emocional.itens[0].valor === 'INTIMO_EMOCIONAL', 'bloco íntimo opcional gravado no domínio emocional');
ok(it('motivo_objetivo', 'Principal objetivo').estado === 'informado' && it('motivo_objetivo', 'Principal objetivo').origem === 'relato_paciente', 'padrão: informado + relato do paciente');

/* ----- Detalhes do registro: muda a fonte -> dominio regenerado ----- */
await A.evaluate(() => { const det = document.querySelector('[data-an2-meta-bloco="motivo"]'); if (det) det.open = true; });
await A.evaluate(() => { const s = document.querySelector('[data-an2-meta="motivo.objetivo"][data-an2-meta-campo="origem"]'); s.value = 'observacao_profissional'; s.dispatchEvent(new Event('change', { bubbles: true })); });
await espera(3000);
an = anamneses(PA);
ok(an[0].content.meta['motivo.objetivo'].origem === 'observacao_profissional' && an[0].content.dominios.motivo_objetivo.itens[0].origem === 'observacao_profissional' && coerente(an[0]),
  '"Detalhes do registro": trocar a fonte regenera o domínio (nunca editado à parte)');
const detTxt = await A.evaluate(() => document.querySelector('[data-an2-meta-bloco="motivo"]').innerText);
ok(/Estado/.test(detTxt) && /Fonte/.test(detTxt) && /Medido/.test(detTxt) && /Consulta/.test(detTxt) && /Última gravação/.test(detTxt), 'Detalhes do registro: estado, fonte, medido, autoria, consulta e data/hora');
await shot(A, 'an2-primeira');

/* ----- recarregar / logout-login: o mesmo rascunho ----- */
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await abrir(A, PA, E1);
const rec = await A.evaluate(() => ({ obj: document.querySelector('[data-an2-campo="motivo.objetivo"]').value, meds: document.querySelectorAll('[data-an2-linha$=".nome"]').length,
  azia: document.querySelector('[data-an2-chip="saude.azia_refluxo"][data-valor="nao"]').getAttribute('aria-pressed') }));
ok(rec.obj.includes('energia') && rec.meds >= 5 && rec.azia === 'true', 'recarregar: o rascunho volta com os mesmos campos, listas e chips');
await A.evaluate(async () => { await window.HoloAuth.sair(); });
await espera(800);
await entrar(A);
await abrir(A, PA, E1);
ok((await A.evaluate(() => document.querySelector('[data-an2-campo="motivo.objetivo"]').value)).includes('energia') && anamneses(PA).length === 1, 'logout e login: o rascunho continua no servidor e abre igual');

/* ----- outra sessao: mesmo conteudo; conflito nao sobrescreve ----- */
const B = await sessao();
await abrir(B, PA, E1);
ok((await B.evaluate(() => document.querySelector('[data-an2-campo="motivo.objetivo"]').value)) === (await A.evaluate(() => document.querySelector('[data-an2-campo="motivo.objetivo"]').value)), 'outro dispositivo: o mesmo conteúdo');
await digitar(B, '[data-an2-campo="motivo.motivo"]', 'MOTIVO_DO_OUTRO_DISPOSITIVO');
await sair(B, '[data-an2-campo="motivo.motivo"]'); await espera(1200);
await digitar(A, '[data-an2-campo="motivo.mudar_primeiro"]', 'jantar');
await sair(A, '[data-an2-campo="motivo.mudar_primeiro"]'); await espera(1200);
an = anamneses(PA);
ok(/outra sessão/.test(await estado(A)) && an[0].content.formulario.motivo.motivo === 'MOTIVO_DO_OUTRO_DISPOSITIVO' && !an[0].content.formulario.motivo.mudar_primeiro && coerente(an[0]),
  'conflito entre sessões: a segunda gravação NÃO sobrescreve; a tela avisa "alterada em outra sessão": ' + await estado(A));
await clicar(A, '#an2-tentar'); await espera(800);   // Recarregar
ok((await A.evaluate(() => document.querySelector('[data-an2-campo="motivo.motivo"]').value)) === 'MOTIVO_DO_OUTRO_DISPOSITIVO', 'Recarregar traz a versão do servidor');

/* ----- concluir, resumo, Visao geral ----- */
await clicar(A, '[data-an2-acao="concluir"]'); await espera(900);
an = anamneses(PA);
ok(an.length === 1 && an[0].status === 'salvo' && coerente(an[0]), 'Concluir anamnese: a mesma linha vira "salvo" (imutável), domínios coerentes');
const res = await A.evaluate(() => ({ t: (document.querySelector('.an2-resumo') || {}).innerText || '', ro: !document.querySelector('[data-an2-acao="concluir"]') && [...document.querySelectorAll('.an2-form input, .an2-form textarea')].every(x => x.disabled) }));
ok(res.ro && /Objetivo principal/.test(res.t) && /Sintomas informados/.test(res.t) && /Sintomas negados/.test(res.t) && /Azia/.test(res.t) && /Medicamentos e suplementos/.test(res.t) && /Losartana/.test(res.t)
  && /Alergias e intolerâncias/.test(res.t) && /Nega intolerâncias/.test(res.t) && /Sono e atividade/.test(res.t) && /Medidas/.test(res.t) && /72,4 kg/.test(res.t), 'resumo automático com os blocos (sem interpretação); tela só de leitura depois de concluir');
ok(!/INTIMO_EMOCIONAL/.test(res.t) && /Conteúdo íntimo/.test(res.t), 'resumo não mostra o texto íntimo');
await shot(A, 'an2-concluida');
const visao = await A.evaluate(async (pid) => { window.levarParaFicha('aba:visao', pid); await new Promise(r => setTimeout(r, 300)); return (document.getElementById('fic-an-resumo') || {}).innerText || ''; }, PA);
ok(/Resumo da anamnese/.test(visao), 'Visão geral da ficha mostra o resumo da anamnese');

/* ----- conteudo intimo: relatorio sem marcacao nao inclui ----- */
const emi = (intimo) => rpc('emitir_relatorio', { payload: { patient_id: PA, title: 'teste', selected_sources: { anamnesis_ids: [an[0].id], incluir_intimo: intimo }, operation_id: globalThis.crypto.randomUUID() } });
const r1 = emi(false), r2 = emi(true);
const snap = (r) => JSON.stringify((srv.linhas('report_emissions').find(x => x.id === r.data) || {}).content_snapshot || {});
ok(!r1.error && !/INTIMO_EMOCIONAL/.test(snap(r1)) && /Losartana/.test(snap(r1)) && /INTIMO_EMOCIONAL/.test(snap(r2)), 'relatório (servidor): lê os domínios gerados; conteúdo íntimo só entra com marcação explícita');
const evo = await A.evaluate((pid) => { const L = window.Anamnese.doPaciente(pid); return window.Evolucao && window.Evolucao.compararAnamnese ? window.Evolucao.compararAnamnese(null, L[0]).length : -1; }, PA);
const ctxAI = await A.evaluate((pid) => window.Anamnese.textoBruto(window.Anamnese.doPaciente(pid)[0]), PA);
ok(evo > 0 && /Losartana/.test(ctxAI) && /Azia \/ refluxo: \[Negado explicitamente\]/.test(ctxAI), 'Evolução e HOLOS AI leem os domínios gerados (ex.: "Azia / refluxo: [Negado explicitamente]")');

/* ----- corrigir: nova revisao; anterior intacta ----- */
await abrir(A, PA, E1);
await clicar(A, '[data-an-acao="corrigir"]'); await espera(300);
await digitar(A, '[data-an2-campo="motivo.expectativa"]', 'acompanhamento mensal');
await sair(A, '[data-an2-campo="motivo.expectativa"]'); await espera(1200);
await clicar(A, '[data-an2-acao="concluir"]'); await espera(900);
an = anamneses(PA).filter(a => a.encounter_id === E1).sort((a, b) => a.revision_number - b.revision_number);
ok(an.length === 2 && an[0].superseded_at && !an[0].content.formulario.motivo.expectativa && an[1].revision_number === 2 && an[1].supersedes_id === an[0].id && an[1].content.formulario.motivo.expectativa === 'acompanhamento mensal' && coerente(an[1]),
  'corrigir: rev. 2 nova; a rev. 1 fica intacta e marcada como substituída');
ok(/rev\. 1/.test(await A.evaluate(() => document.querySelector('.an-revisoes').innerText)), 'histórico de revisões visível');

/* ----- retorno: sugerido, troca manual, sem copia, anterior em leitura ----- */
await abrir(A, PA, E2);
const r0 = await A.evaluate(() => ({ ret: document.querySelector('[data-an2-tipo="retorno"]').getAttribute('aria-checked'), sug: !!document.querySelector('.an2-sugerido'),
  blocos: [...document.querySelectorAll('.an2-bloco-t')].map(x => x.textContent), copiar: !!document.querySelector('[data-an-acao="copiar"]'),
  anterior: (document.querySelector('.an2-anterior') || {}).innerText || '' }));
ok(r0.ret === 'true' && r0.sug && r0.blocos.join() === 'Desde a última consulta' && !r0.copiar, 'retorno sugerido (há anamnese concluída): "Desde a última consulta", sem copiar a anamnese inteira');
await A.evaluate(() => { document.querySelector('.an2-anterior').open = true; });
ok(/Ver anamnese completa anterior/.test(r0.anterior) && /Losartana/.test(await A.evaluate(() => document.querySelector('.an2-anterior').innerText)) && !(await A.evaluate(() => !!document.querySelector('.an2-anterior input:not([disabled]), .an2-anterior textarea'))),
  '"Ver anamnese completa anterior" em modo leitura');
await clicar(A, '[data-an2-tipo="primeira"]'); await espera(200);
ok(await A.evaluate(() => document.querySelectorAll('.an2-bloco').length === 7 && !!document.querySelector('[data-an-acao="copiar"]')), 'troca manual para Primeira consulta: os 7 blocos e "Criar a partir da anamnese anterior"');
await clicar(A, '[data-an2-tipo="retorno"]'); await espera(200);
const campos = await A.evaluate(() => [...document.querySelectorAll('[data-an2-bloco="retorno"] .an2-rot')].map(x => x.textContent));
ok(campos.length === 11 && /O que melhorou/.test(campos.join()) && /Principal dificuldade/.test(campos.join()), 'retorno: os 10 campos curtos (+ peso atual)');
await digitar(A, '[data-an2-campo="retorno.melhorou"]', 'sono melhor');
await digitar(A, '[data-an2-campo="retorno.peso"]', '71');
await sair(A, '[data-an2-campo="retorno.peso"]'); await espera(1200);
await shot(A, 'an2-retorno');
await clicar(A, '[data-an2-acao="concluir"]'); await espera(900);
const ret = anamneses(PA).find(a => a.encounter_id === E2);
ok(ret && ret.status === 'salvo' && ret.content.tipo === 'retorno' && ret.content.dominios.medidas.itens[0].medida.valor === 71 && !ret.content.formulario.motivo && !ret.copied_from_previous && coerente(ret),
  'retorno concluído: tipo retorno, peso como medida, nada copiado da anterior');

/* ----- copiar da anterior: so na primeira consulta; itens previos ----- */
await abrir(A, PA, E3);
await clicar(A, '[data-an2-tipo="primeira"]'); await espera(200);
await clicar(A, '[data-an-acao="copiar"]'); await espera(300);
await clicar(A, '#modal-confirmar-ok'); await espera(1500);
const cp = anamneses(PA).find(a => a.encounter_id === E3);
const fonteCp = anamneses(PA).find(a => a.id === (cp && cp.source_anamnesis_id));
ok(cp && cp.status === 'rascunho' && cp.copied_from_previous && fonteCp && fonteCp.status !== 'rascunho' && fonteCp.content.tipo === 'primeira' && fonteCp.encounter_id === E1 && cp.content.tipo === 'primeira' && coerente(cp)
  && Object.keys(cp.content.dominios).length > 5 && Object.values(cp.content.dominios).every(x => x.itens.every(i => i.previo === true && i.fonte_anamnese_id === fonteCp.id)),
  'cópia: rascunho novo a partir da última anamnese COMPLETA (a primeira consulta rev. 2, não o retorno); todos os itens prévios com a origem');
ok(JSON.stringify(fonteCp.content) === JSON.stringify(anamneses(PA).find(a => a.id === fonteCp.id).content) && !fonteCp.superseded_at, 'a anamnese de origem não muda');
ok(await A.evaluate(() => document.querySelectorAll('.an2-selo-previo').length > 3), 'na tela, os campos copiados aparecem "prévio — a revisar"');
await digitar(A, '[data-an2-campo="motivo.motivo"]', 'revisado agora');
await sair(A, '[data-an2-campo="motivo.motivo"]'); await espera(1200);
const cp2 = anamneses(PA).find(a => a.encounter_id === E3);
ok(cp2.content.dominios.motivo_objetivo.itens.find(i => i.campo === 'Motivo da consulta').previo === false && coerente(cp2), 'editar um campo copiado tira o "prévio" dele');

/* ----- anamnese antiga: abre igual, sem reinterpretacao ----- */
await abrir(A, PB, EB);
const leg = await A.evaluate(() => ({ antiga: !!document.querySelector('#aba-anamnese .an-dominio'), v2: !!document.querySelector('#aba-anamnese .an2-form'), t: document.getElementById('aba-anamnese').innerText }));
ok(leg.antiga && !leg.v2 && /Camarão/.test(leg.t) && JSON.stringify(srv.linhas('anamneses').find(a => a.id === legId).content) === JSON.stringify(LEGADO), 'anamnese antiga abre no formato antigo, sem conversão; o registro não muda');

/* ----- recusas ----- */
const outra = rpc('salvar_anamnese', { payload: { encounter_id: E3, content: V2.montarContent('primeira', { motivo: { objetivo: 'x' } }, {}), status: 'rascunho' } }, UB);
const cruz = rpc('salvar_anamnese', { payload: { id: cp2.id, encounter_id: EB, content: V2.montarContent('primeira', { motivo: { objetivo: 'x' } }, {}), status: 'rascunho' } }, UB);
ok(outra.error && cruz.error, 'outra nutricionista não grava anamnese no atendimento nem no rascunho alheio');
const arq = rpc('salvar_anamnese', { payload: { encounter_id: EC, content: V2.montarContent('primeira', { motivo: { objetivo: 'x' } }, {}), status: 'rascunho' } });
await abrir(A, PC, EC);
const arqTela = await A.evaluate(() => [...document.querySelectorAll('.an2-form input, .an2-form textarea, .an2-chip')].every(x => x.disabled) && !document.querySelector('[data-an2-acao="concluir"]'));
ok(arq.error && arqTela, 'paciente arquivado: o servidor recusa e a tela não oferece edição');

/* ----- celular, teclado, ARIA ----- */
const M = await sessao(390);
await abrir(M, PA, E3);
const mob = await M.evaluate(() => ({ larg: document.documentElement.scrollWidth, jan: window.innerWidth }));
ok(mob.larg <= mob.jan + 1, 'celular 390 px: sem rolagem horizontal (' + mob.larg + ')');
if (process.env.SHOT_DIR) { await M.addStyleTag({ content: '.topo,#toast{display:none!important}' }); const el = await M.$('#aba-anamnese'); if (el) await el.screenshot({ path: process.env.SHOT_DIR + '/an2-mobile.png' }); }
await abrir(A, PA, E3);
const aria = await A.evaluate(() => {
  const form = document.querySelector('.an2-form');
  const semRotulo = [...form.querySelectorAll('input, textarea, select')].filter(e => !(e.id && document.querySelector('label[for="' + e.id + '"]')) && !e.closest('label') && !e.getAttribute('aria-label'));
  return { semRotulo: semRotulo.length, radio: !!document.querySelector('[role="radiogroup"] [role="radio"][aria-checked]'), chips: [...document.querySelectorAll('.an2-chip')].every(b => b.tagName === 'BUTTON' && b.hasAttribute('aria-pressed')),
    grupos: [...document.querySelectorAll('.an2-chips')].every(g => g.getAttribute('role') === 'group' && g.getAttribute('aria-label')), status: document.getElementById('an2-estado').getAttribute('role') === 'status' };
});
ok(aria.semRotulo === 0 && aria.radio && aria.chips && aria.grupos && aria.status, 'ARIA: todo campo rotulado, tipo como radiogroup, chips como botões com aria-pressed, estado com role=status');
await A.evaluate(() => { const b = document.querySelector('[data-an2-chip="estilo.sono"][data-valor="Bom"]'); b.closest('details').open = true; b.focus(); });
await A.keyboard.press('Enter'); await espera(300);
ok(await A.evaluate(() => document.querySelector('[data-an2-chip="estilo.sono"][data-valor="Bom"]').getAttribute('aria-pressed') === 'true' && document.activeElement && document.activeElement.dataset.valor === 'Bom'),
  'teclado: Enter num chip marca e o foco fica no chip');

/* ----- coerencia em TODA gravacao; nao interferencia ----- */
ok(anamneses(PA).every(coerente), 'todas as anamneses V2 gravadas: domínios = gerarDominiosDaAnamneseV2(formulário) (nenhuma edição à parte)');
ok(digitais() === antes, 'não interferência: HOLOSCAN, notas, respostas, ferramentas, Leitura Integrada, exames, Resultado HOLOS e pacotes iguais');

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
