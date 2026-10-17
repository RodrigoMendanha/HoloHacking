/**
 * VIDEO COMERCIAL HOLOHACKING — passo 1: captura das telas REAIS do sistema atual, com a paciente FICTICIA da fixture
 * dos testes (testes/fixture-direcao.mjs), com nomes INVENTADOS ("Marina Alves", nutricionista "Ana Ribeiro"), servidor Supabase
 * FALSO em memoria.
 * Nenhum dado real: nada sai desta maquina. Telas em 2x (deviceScaleFactor 2) para o zoom do video nao borrar.
 *   node scripts/video-holohacking-comercial/capturar.mjs [pasta]   (padrao: scripts/video-holohacking-comercial/telas)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
const R = new URL('../../', import.meta.url).pathname;
const puppeteer = (await import(R + 'node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js')).default;
const { criarServidor, ligarPagina } = await import(R + 'testes/supabase-falso.mjs');
const { montarFixture } = await import(R + 'testes/fixture-direcao.mjs');
const { servir } = await import(new URL('./servidor.mjs', import.meta.url).pathname);
const servidor = await servir();
const out = process.argv[2] || new URL(process.env.VIDEO_LARGURA === 'celular' ? './telas-celular' : './telas', import.meta.url).pathname; mkdirSync(out, { recursive: true });
const srv = criarServidor();
const UA = srv.criarConta('nutri@holo.test', 'senha-nutri-1');
/* nomes INVENTADOS para o video (nenhuma pessoa real) */
srv.tabelas.profiles.push({ id: UA, nome: 'Ana Ribeiro', registro: 'CRN-0 00000', profissao: 'Nutricionista', especialidade: 'Nutrição Holística', cidade: 'Consultório', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const fx = await montarFixture(srv, UA, { nome: 'Marina Alves' });
/* VIDEO_LARGURA=celular: largura de celular (o sistema e responsivo), 1080 px de imagem — usada no video vertical/quadrado */
const CEL = process.env.VIDEO_LARGURA === 'celular';
const VW = CEL ? 432 : 1440, VH = CEL ? 900 : 900, DSF = CEL ? 2.5 : 2;
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const P = await (await nav.createBrowserContext()).newPage();
const erros = []; P.on('pageerror', e => erros.push(e.message));
await P.setViewport({ width: VW, height: VH, deviceScaleFactor: DSF });
await P.emulateTimezone('America/Sao_Paulo');
await ligarPagina(P, srv);
await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
const espera = ms => new Promise(r => setTimeout(r, ms));
const feitas = [];
/* tela inteira (o que a pessoa ve) e recorte de um elemento */
const tela = async (nome) => { await espera(700); await P.evaluate(() => window.scrollTo(0, 0)); await P.screenshot({ path: out + '/' + nome + '.png' }); feitas.push(nome); };
const el = async (sel, nome) => { const e = await P.$(sel); if (!e) { console.log('SEM', sel); return; } await e.screenshot({ path: out + '/' + nome + '.png' }); feitas.push(nome); };
/* ancoras: onde ficam (em px da imagem 2x) os titulos de cada bloco de uma tela longa — a camera do video usa isto */
const ancoras = {};
const elA = async (sel, nome, textos) => {
  await el(sel, nome);
  ancoras[nome] = await P.evaluate((sel, textos, dsf) => {
    const raiz = document.querySelector(sel); if (!raiz) return {};
    const r0 = raiz.getBoundingClientRect(), res = {};
    const cands = [...raiz.querySelectorAll('h1,h2,h3,h4,h5,legend,summary,.titulo,strong,span,p')];
    textos.forEach(t => {
      const h = cands.find(x => x.offsetParent !== null && x.textContent.trim().startsWith(t));
      if (!h) return;
      const r = h.getBoundingClientRect();
      res[t] = { x: Math.round((r.left - r0.left) * dsf), y: Math.round((r.top - r0.top) * dsf), w: Math.round(r.width * dsf), h: Math.round(r.height * dsf) };
    });
    return res;
  }, sel, textos, DSF);
};
async function entrar() {
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  if (await P.$('#login-email')) {
    const vis = await P.evaluate(() => { const e = document.getElementById('login-email'); return e && e.offsetParent !== null; });
    if (vis) { await P.type('#login-email', 'nutri@holo.test'); await P.type('#login-senha', 'senha-nutri-1'); await P.click('#btn-entrar'); }
  }
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important} .topo,.barra-contexto,#toast,.abas-ficha-caixa{position:static!important}' });
}
const clicar = (sel) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, sel);
const confirmarModal = async () => { await espera(300); await clicar('#modal-confirmar-ok'); await espera(900); };
/* clica numa acao do item cujo texto casa com a expressao */
const noItem = (re, acao) => P.evaluate((re, acao) => {
  const li = [...document.querySelectorAll('.rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return 'SEM ' + re; const b = li.querySelector('[data-rd-acao="' + acao + '"]'); if (!b) return 'SEM BOTAO ' + acao; b.click(); return 'ok';
}, re, acao);
const noItemSec = (sec, re, acao) => P.evaluate((sec, re, acao) => {
  const li = [...document.querySelectorAll('[data-rd-bloco="' + sec + '"] .rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return 'SEM ' + re; const b = li.querySelector('[data-rd-acao="' + acao + '"]'); if (!b) return 'SEM BOTAO'; b.click(); return 'ok'; }, sec, re, acao);
const campo = (sec, re, k, v) => P.evaluate((sec, re, k, v) => {
  const li = [...document.querySelectorAll('[data-rd-bloco="' + sec + '"] .rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return 'SEM ' + re; const e = li.querySelector('[data-rd-campo$="|' + k + '"]'); if (!e) return 'SEM CAMPO ' + k;
  if (e.tagName === 'SELECT' && k === 'direcionamento_id') { const o = [...e.options].find(o => new RegExp(v).test(o.textContent)); e.value = o ? o.value : ''; } else e.value = v;
  e.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; }, sec, re, k, v);
const sis = (sec, re, code) => P.evaluate((sec, re, code) => {
  const li = [...document.querySelectorAll('[data-rd-bloco="' + sec + '"] .rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  const c = li && li.querySelector('[data-rd-sis$="|' + code + '"]'); if (c && !c.checked) c.click(); return c ? 'ok' : 'SEM'; }, sec, re, code);
const escrever = (sec, txt) => P.evaluate((sec, txt) => { const t = document.querySelector('[data-rd-novo="' + sec + '"]'); t.value = txt; document.querySelector('[data-rd-acao="adicionar"][data-rd-sec="' + sec + '"]').click(); }, sec, txt);
const abrirResultadoHolos = async (eid) => {
  await P.evaluate(async (pid, eid) => {
    window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) {}
    window.ResultadoHolos.esquecer(); window.levarParaFicha('aba:resultado-holos', pid);
    for (let i = 0; i < 80; i++) { const a = document.getElementById('aba-resultado-holos'); if (a && a.querySelector('[data-rh-acao="novo"]')) break; await new Promise(r => setTimeout(r, 100)); }
  }, fx.PA, eid);
};
async function montar(eid, tipo, passos) {
  await abrirResultadoHolos(eid);
  await clicar('[data-rh-acao="novo"]'); await espera(300);
  await P.evaluate((eid, h, tools) => {
    const s = document.getElementById('rh-atendimento'); s.value = eid; s.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('input[name="rh-holoscan"][value="' + h + '"]').click();
    tools.forEach(id => { const c = document.querySelector('[data-rh-ferr][value="' + id + '"]'); if (c && !c.checked) c.click(); });
    ['mapa_rotina_v1', 'pqq'].forEach(f => { const c = document.querySelector('[data-rh-ferr="' + f + '"]:checked'); if (c) { const m = document.querySelector('[data-rh-mostrar="' + c.value + '"]'); if (m && !m.checked) m.click(); } });
  }, eid, fx.H, Object.values(fx.T));
  await espera(200);
  const tipoAtual = await P.evaluate(() => (document.querySelector('input[name="rd-tipo"]:checked') || {}).value);
  console.log('tipo de encontro sugerido:', tipoAtual, '(esperado ' + tipo + ')');
  await clicar('[data-rd-acao="sugerir"]'); await espera(1200);
  console.log('sugestoes:', await P.evaluate(() => (document.querySelector('.rd-sug-msg') || {}).textContent));
  await passos();
}

await entrar();
/* ===================== telas do sistema (antes de montar o Resultado) ===================== */
await tela('a01-dashboard');
await P.evaluate((pid) => window.levarParaFicha('aba:visao', pid), fx.PA); await tela('a02-ficha-visao');
await el('.fic-topo', 'a02b-ficha-topo');
await P.evaluate(async (pid, eid) => { window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) {} window.levarParaFicha('aba:anamnese', pid); }, fx.PA, fx.E1);
await espera(900);
await P.evaluate(() => { document.querySelectorAll('#aba-anamnese details').forEach(d => { d.open = true; }); });
await tela('a03-mapeamento');
await elA('#aba-anamnese', 'a03b-mapeamento-conteudo', ['Revisão vigente', 'Motivo e objetivo', 'História e rotina alimentar', 'Saúde e sintomas', 'Resumo do Mapeamento']);
for (const s of ['holoscan', 'corpo', 'mente', 'espirito']) {
  await P.evaluate((pid, s) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="' + s + '"]').click(); }, fx.PA, s);
  await tela('a04-secao-' + s);
}
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="holoscan"]').click(); }, fx.PA); await espera(800);
await elA('#secao-holoscan', 'a05-holoscan-pagina', ['O mapa', 'Resultado desta aplicação', 'Próximos Passos HOLOS', 'Onde olhar primeiro', 'Avaliação Integral do Terreno', 'O que mais pesou nas suas respostas', 'Tríade HOLOS']);
await P.evaluate(() => { const b = document.getElementById('btn-abrir-questionario'); if (b) b.click(); }); await espera(900);
await tela('a06-holoscan-questionario');
/* ===================== 1a consulta ===================== */
await montar(fx.E1, 'primeira', async () => {
    await el('#rd-editor', 'p01-editor-sugestoes');
  for (const [re, ac] of [['^Você chegou', 'confirmar'], ['primeiras áreas', 'confirmar'], ['sinal que mais', 'confirmar'], ['Maior dificuldade alimentar', 'confirmar'],
    ['principal objetivo', 'confirmar'], ['quer \\(OQ', 'confirmar'], ['^Preparar o lanche da tarde na noite anterior$', 'confirmar'],
    ['^Preparar o lanche da tarde na noite anterior \\(', 'confirmar'], ['^Anotar fome e energia às 16h \\(', 'confirmar'], ['^Fome e energia às 16h', 'confirmar'],
    ['Como fica o jantar', 'confirmar'], ['verdadeiro para você', 'confirmar'], ['Períodos de maior fome', 'excluir'], ['Lista de opções', 'excluir']]) {
    const r = await noItem(re, ac); if (r !== 'ok') console.log(r);
    await espera(120);
  }
  /* DIRECIONAMENTO (sugerido da Conduta) ligado ao Metabolico; ESTRATEGIA (da Conduta) ligada ao direcionamento */
  for (const r of [await campo('direcionamentos', '^Organizar o fim da tarde', 'territorio', 'corpo'),
    await campo('direcionamentos', '^Organizar o fim da tarde', 'porque', 'O fim da tarde concentra fome forte e cansaço, e o lanche costuma não acontecer.'),
    await campo('direcionamentos', '^Organizar o fim da tarde', 'objetivo', 'Chegar ao jantar com menos fome e mais energia.'),
    await sis('direcionamentos', '^Organizar o fim da tarde', 'metabolico')]) if (r !== 'ok') console.log('dir', r);
  await noItem('^Organizar o fim da tarde', 'confirmar'); await espera(200);
  await noItem('^Lanche da tarde$', 'excluir'); await espera(150);
  for (const r of [await campo('estrategias', '^Começar por um lanche', 'direcionamento_id', 'Organizar o fim da tarde'),
    await campo('estrategias', '^Começar por um lanche', 'finalidade', 'Evitar chegar ao fim da tarde com fome forte.'),
    await campo('estrategias', '^Começar por um lanche', 'acao', 'Levar um lanche planejado e comer por volta das 16h.'),
    await campo('estrategias', '^Começar por um lanche', 'observar', 'Fome e energia ao chegar em casa.'),
    await campo('estrategias', '^Começar por um lanche', 'contexto', 'Dias de trabalho'),
    await campo('estrategias', '^Começar por um lanche', 'prazo', 'Até o retorno (3 semanas)')]) if (r !== 'ok') console.log('est', r);
  console.log('est conf', await noItemSec('estrategias', '^Começar por um lanche', 'confirmar')); await espera(200);
  await P.evaluate(() => document.querySelector('[data-rd-acao="usar"][data-rd-sec="foco_atual"]').click()); await espera(200);
  await P.evaluate(() => document.querySelector('[data-rd-acao="usar"][data-rd-sec="proxima_etapa"]').click()); await espera(200);
  await noItem('^Retorno em 3 semanas', 'confirmar'); await espera(150);
  await escrever('padroes', 'Nos dias em que a tarde passa sem pausa para comer, você relata chegar em casa com mais fome.'); await espera(150);
  await escrever('hipoteses', 'Investigar se a organização da tarde contribui para a fome noturna.'); await espera(150);
  /* estado intermediario: foco sugerido e nao confirmado -> RESULTADO EM CONSTRUCAO */
  await el('#rd-editor', 'p02-editor-em-construcao');
  await noItem('^Organizar o fim da tarde', 'confirmar'); await espera(200);
  await el('#rd-editor', 'p03-editor-confirmado');
  await el('.rd-so-prof-grupo', 'p04-so-profissional');
  await clicar('[data-rh-acao="rascunho"]'); await espera(900);
  await clicar('[data-rh-acao="previa"]'); await espera(1000);
  await P.evaluate(() => { const b = document.querySelector('[data-rh-visao-troca="paciente"]'); if (b) b.click(); }); await espera(500);
  await el('#rh-doc', 'p05-previa-paciente');
  await clicar('[data-rh-acao="salvar"]'); await confirmarModal();
});
const r1 = srv.linhas('holos_results').find(r => r.status === 'salvo' && r.encounter_id === fx.E1);
console.log('r1', r1 && r1.template_version, r1 && JSON.stringify(r1.content_snapshot.direcao_paciente).slice(0, 300));
await el('#rh-doc', 'p06-visao-profissional');

/* pagina Resultado: emitir, PDF, WhatsApp */
async function paginaResultado(prefixo) {
  await P.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click(); }, fx.PA);
  try { await P.waitForFunction(() => !!document.getElementById('rp-doc') || !!document.getElementById('rp-vazio'), { timeout: 8000 }); }
  catch (e) { console.log('ERROS', erros.join(' | '), 'CORPO', await P.evaluate(() => (document.getElementById('resultado-pagina-corpo') || {}).innerHTML || 'sem corpo').then(x => x.slice(0, 500))); throw e; }
  await espera(800);
  console.log(prefixo, 'antes de emitir:', (await P.evaluate(() => (document.getElementById('resultado-pagina-corpo') || {}).innerText || '')).slice(0, 300).replace(/\n/g, ' | '));
  await clicar('[data-rp-acao="emitir"]'); await espera(2500);
  console.log(prefixo, 'depois:', (await P.evaluate(() => (document.getElementById('resultado-pagina-corpo') || {}).innerText || '')).slice(0, 300).replace(/\n/g, ' | '));
  await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await espera(800);
    await el('#rp-doc', prefixo + '-paciente-documento');
  for (const id of ['foco', 'direcionamentos', 'estrategias', 'cme', 'observar', 'caminho', 'antes-agora', 'avancos', 'testadas', 'cinco'])
    if (await P.$('#rp-doc #rd-' + id)) await el('#rp-doc #rd-' + id, prefixo + '-sec-' + id);
  for (const k of ['direcionamento', 'estrategias', 'evolucao'])
    if (await P.$('#rp-doc .rd-pilar-' + k)) await el('#rp-doc .rd-pilar-' + k, prefixo + '-pilar-' + k);
  if (prefixo === 'p1') for (const [code, nome] of [['metabolico','sistema-metabolico-prioritario'],['detox_linfatico','sistema-detox-segundo'],['acido_inflamatorio','sistema-acido-10']]) await el('#rp-doc [data-rd-sistema="' + code + '"]', 'p1-' + nome);
}
await paginaResultado('p1');

/* ===================== retorno ===================== */
fx.retorno();
await P.reload({ waitUntil: 'networkidle2' }); await entrar();
await montar(fx.E2, 'retorno', async () => {
  await el('#rd-editor', 'r01-editor-retorno-sugestoes');
  /* ACOMPANHAMENTO da estrategia anterior: experiencia, percepcao, dificuldade, decisao */
  for (const r of [await campo('acompanhamento_estrategias', '^Começar por um lanche', 'aplicou', 'Conseguiu em 4 de 6 dias de trabalho.'),
    await campo('acompanhamento_estrategias', '^Começar por um lanche', 'facilitou', 'Deixar o lanche separado na noite anterior.'),
    await campo('acompanhamento_estrategias', '^Começar por um lanche', 'dificultou', 'Reuniões no fim da tarde.'),
    await campo('acompanhamento_estrategias', '^Começar por um lanche', 'percepcao', 'Nos dias em que fez, chegou ao jantar com menos fome.'),
    await campo('acompanhamento_estrategias', '^Começar por um lanche', 'observacao', 'Adesão boa; dias de reunião são o ponto frágil.'),
    await campo('acompanhamento_estrategias', '^Começar por um lanche', 'decisao', 'manter')]) if (r !== 'ok') console.log('acomp', r);
  console.log('acomp conf', await noItemSec('acompanhamento_estrategias', '^Começar por um lanche', 'confirmar')); await espera(200);
  await clicar('[data-rd-acao="sugerir"]'); await espera(1200);
  console.log('sugestoes depois do acompanhamento:', await P.evaluate(() => (document.querySelector('.rd-sug-msg') || {}).textContent));
  for (const [re, ac] of [['^Quanto você conseguiu', 'confirmar'], ['^O que melhorou', 'confirmar'], ['^O que você conseguiu colocar', 'confirmar'], ['^Acordo concluído', 'confirmar'],
    ['^O que ainda não foi possível', 'confirmar'], ['^O que dificultou', 'confirmar'], ['Nos dias em que a tarde passa', 'confirmar'],
    ['^Deixar um lanche de reserva na bolsa$', 'confirmar'], ['^Na estratégia “Começar', 'confirmar'], ['^Manter o lanche da tarde e cuidar', 'confirmar'], ['^Deixar um lanche de reserva na bolsa \\(', 'confirmar'], ['^Fome à noite nos dias de reunião', 'confirmar'],
    ['verdadeiro para você', 'confirmar']]) {
    const r = await noItem(re, ac); if (r !== 'ok') console.log(r);
    await espera(120);
  }
  /* a estrategia continuada (MANTER, ligada a anterior) e o novo direcionamento */
  await campo('estrategias', '^Começar por um lanche', 'direcionamento_id', 'Manter o lanche'); console.log('est cont', await noItemSec('estrategias', '^Começar por um lanche', 'confirmar')); await espera(150);
  await campo('direcionamentos', '^Manter o lanche da tarde e cuidar', 'territorio', 'corpo'); await sis('direcionamentos', '^Manter o lanche da tarde e cuidar', 'metabolico');
  await campo('direcionamentos', '^Manter o lanche da tarde e cuidar', 'objetivo', 'Sustentar o lanche e ter um plano para os dias de reunião.');
  await noItem('^Manter o lanche da tarde e cuidar', 'confirmar'); await espera(150);
  await campo('estrategias', '^Manter o que funcionou', 'direcionamento_id', 'Manter o lanche'); await campo('estrategias', '^Manter o que funcionou', 'acao', 'Deixar um lanche de reserva na bolsa para os dias de reunião.');
  await campo('estrategias', '^Manter o que funcionou', 'observar', 'Fome à noite nos dias de reunião.'); await noItem('^Manter o que funcionou', 'confirmar'); await espera(150);
  await P.evaluate(() => document.querySelector('[data-rd-acao="usar"][data-rd-sec="foco_atual"]').click()); await espera(200);
  await noItem('^Manter o lanche da tarde e cuidar', 'confirmar'); await espera(150);
  await P.evaluate(() => document.querySelector('[data-rd-acao="usar"][data-rd-sec="proxima_etapa"]').click()); await espera(200);
  await noItem('^Retorno em 4 semanas', 'confirmar'); await espera(150);
  await el('#rd-editor', 'r02-editor-retorno-confirmado');
  for (const [b, n] of [['acompanhamento_estrategias','r02a-editor-acompanhamento'],['estrategias','r02b-editor-estrategias'],['direcionamentos','r02c-editor-direcionamentos'],['hipoteses','r02d-editor-hipoteses']]) await el('#rd-editor [data-rd-bloco="' + b + '"]', n);
  await clicar('[data-rh-acao="salvar"]'); await confirmarModal();
});
const r2 = srv.linhas('holos_results').find(r => r.status === 'salvo' && r.encounter_id === fx.E2);
console.log('r2 caminho', r2 && JSON.stringify(r2.content_snapshot.caminho));
await el('#rh-doc', 'r03-visao-profissional-retorno');
await paginaResultado('r1');
console.log('erros JS:', erros.length ? erros.join(' | ') : 'nenhum');
await nav.close();
writeFileSync(out + '/telas.json', JSON.stringify({ gerado_em: new Date().toISOString(), viewport: [VW, VH, DSF], telas: feitas, ancoras }, null, 2));
if (servidor) servidor.close();
console.log('telas:', feitas.length, 'erros JS:', erros.length);
