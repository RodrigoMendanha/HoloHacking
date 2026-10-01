/**
 * V1 — ETAPA 0: RECONCILIACAO DA RODADA 08 COM O DOCUMENTO MESTRE
 *
 * As 21 provas da Fase 28 do pedido. Supabase falso (supabase-falso.mjs),
 * app real, sessao autenticada. Nada aqui homologa metodologia: os testes
 * provam que o codigo NAO inventa regra e NAO apresenta rascunho como saida
 * oficial.
 *
 *    1  nenhum criterio metodologico de 50% (ou outro corte) no codigo
 *    2  ausencia continua null / sem dado
 *    3  resposta zero continua diferente de ausencia
 *    4  parcial guarda respostas + cobertura
 *    5  parcial nao vira saida oficial (Metodologia nega; tela com selo)
 *    6  conteudo rascunho nao e saida oficial V1 (fronteira unica)
 *    7  SNT-101 / SNT-501 continuam sem correcao inventada
 *    8  CMB nao entra no contexto assistivo (mas continua gravada)
 *    9  REC/SEL continuam desativados
 *   10  reguas manuais nao sao promovidas a Holoscan oficial
 *   11  duas coletas na mesma data persistem separadamente
 *   12  editar coleta A nao muda coleta B
 *   13  nova coleta continua vazia
 *   14  falso sucesso continua impossivel
 *   15  "Apagar tudo" continua inexistente
 *   16  "Backup completo" continua inexistente (com conta)
 *   17  reaplicacao continua vazia
 *   18  troca de paciente continua sem vazamento
 *   19  retorno universal de 28 dias nao dirige a V1
 *   20  Dashboard nao promove conteudo nao aprovado a indicador oficial
 *   21  HOLOS AI indisponivel nao envia contexto irregular
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url);
const ler = (f) => readFileSync(new URL(f, RAIZ), 'utf8');
const runtime = readdirSync(RAIZ).filter(f => f.endsWith('.js') && f !== 'holoscan.js');

/* ==================================================================== */
titulo('1 — NENHUM CORTE METODOLOGICO DE 50% NO CODIGO');
/* ==================================================================== */
const comCorte = runtime.filter(f => /COBERTURA_MINIMA\s*=\s*0?\.\d|coberturaMinima\s*=\s*0?\.\d/.test(ler(f)));
ok(comCorte.length === 0, 'nenhum arquivo de runtime define COBERTURA_MINIMA = 0,5 (ou outro): ' + (comCorte.join(', ') || 'nenhum'));
ok(!/^\s*var DIAS_REAVALIACAO\s*=\s*\d/m.test(ler('panorama.js')) && /DIAS_REAVALIACAO:\s*null/.test(ler('panorama.js')),
   'panorama.js nao define DIAS_REAVALIACAO = 28 (exporta null)');
ok(/coberturaMinima\(\)\s*\{\s*return null;/.test(ler('metodologia.js')), 'Metodologia.coberturaMinima() devolve null (sem politica homologada)');

/* ==================================================================== */
titulo('7 — SNT-101 / SNT-501 SEM CORRECAO INVENTADA');
/* ==================================================================== */
const sintomas = ler('motor/bancos/sintomas.csv').split('\n');
const linhas101 = sintomas.filter(l => l.startsWith('SNT-101,'));
const linhas501 = sintomas.filter(l => l.startsWith('SNT-501,'));
const pesosDe = (ls) => ls.map(l => l.split(',')[4]).sort().join('/');
ok(linhas101.length === 2 && pesosDe(linhas101) === '2/3', 'SNT-101 continua em 2 linhas (fungico 2, metabolico 3): ' + pesosDe(linhas101));
ok(linhas501.length === 2 && pesosDe(linhas501) === '2/3', 'SNT-501 continua em 2 linhas (metabolico 2, MEE 3): ' + pesosDe(linhas501));
ok(!/aprovado/.test(ler('motor/bancos/sintomas.csv')) && !/aprovado/.test(ler('motor/bancos/exames.csv')),
   'nenhum status foi trocado para "aprovado" nos bancos');

/* ==================================================================== */
// navegador + conta
/* ==================================================================== */
const srv = criarServidor();
srv.criarConta('e0@holo.test', 'senha-e0-123');
const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];

async function pagina(url) {
  const ctx = await nav.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 1366, height: 900 });
  p.on('pageerror', e => errosJS.push(e.message));
  p.on('dialog', d => d.accept());
  await ligarPagina(p, srv);
  await p.goto(url, { waitUntil: 'networkidle2' });
  await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await p.waitForSelector('#login-email', { visible: true });
  await p.type('#login-email', 'e0@holo.test');
  await p.type('#login-senha', 'senha-e0-123');
  await p.click('#btn-entrar');
  await p.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() &&
    window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  return p;
}
async function cadastrar(p, nome) {
  return p.evaluate(async (nome) => {
    document.querySelector('.nav-item[data-secao="pacientes"]').click();
    const v = document.getElementById('voltar-lista'); if (v) v.click();
    document.getElementById('btn-abrir-novo').click();
    document.getElementById('np-nome').value = nome;
    document.getElementById('btn-salvar-paciente').click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 100));
      const achou = (window.pacientesTodos() || []).find(x => x.nome === nome);
      if (achou) { window.definirPacienteAtivo(achou.id); return achou.id; }
    }
    return null;
  }, nome);
}
const p = await pagina('http://127.0.0.1:5500/');
const A = await cadastrar(p, 'Paciente Etapa Zero');

/* ==================================================================== */
titulo('6 — FRONTEIRA UNICA: CONTEUDO EM HOMOLOGACAO NAO E SAIDA OFICIAL');
/* ==================================================================== */
const fronteira = await p.evaluate(() => {
  const M = window.Metodologia;
  return {
    existe: !!M, status: M && M.status(), pacote: M && M.pacote(),
    negadas: M ? M.SAIDAS.filter(t => M.saidaOficialPermitida(t) === false).length : -1,
    total: M ? M.SAIDAS.length : -1,
    desconhecida: M ? M.saidaOficialPermitida('qualquer_coisa') : null,
    regra: M ? M.regraDisponivel('CMB-001') : null,
    cobertura: M ? M.coberturaMinima() : 'x',
    ausencia: window.HoloAusencia.coberturaMinima(),
    homolog: M ? M.modoHomologacao() : null,
  };
});
ok(fronteira.existe && fronteira.status === 'em_homologacao' && fronteira.pacote === null,
   'window.Metodologia existe; status "em_homologacao", sem pacote aprovado');
ok(fronteira.negadas === fronteira.total && fronteira.total >= 10 && fronteira.desconhecida === false,
   'saidaOficialPermitida() e false para as ' + fronteira.total + ' saidas dependentes (e para tipo desconhecido)');
ok(fronteira.regra === false && fronteira.cobertura === null && fronteira.ausencia === null,
   'regraDisponivel(CMB-001) false; coberturaMinima() null, tambem via HoloAusencia');
ok(fronteira.homolog === false, 'sem ?homologacao=1 na URL, modo de homologacao desligado');

/* ==================================================================== */
titulo('2, 3, 4, 5 — AUSENCIA, ZERO, PARCIAL');
/* ==================================================================== */
const parcial = await p.evaluate(async (pid) => {
  const q = window.HOLOSCAN.questionario();
  // 30 primeiras perguntas (BioRoot): uma com resposta ZERO, as outras 2
  const resp = q.slice(0, 30).map((x, i) => ({ marcador_id: x.id, intensidade: i === 0 ? 0 : 2 }));
  const r = window.HOLOSCAN.calcular(resp);
  const n = window.HoloAusencia.normalizar(r);
  const mee = n.sistemas.find(s => s.sistema === 'mental_emocional_espiritual');
  const fis = r.sistemas.find(s => s.sistema === 'fungico');
  // mesmo caso pela tela: responde no questionario e gera o mapa
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(x => setTimeout(x, 200));
  const itens = [...document.querySelectorAll('.q-item')];
  itens.slice(0, 30).forEach((it, i) => it.querySelectorAll('.q-btn')[i === 0 ? 0 : 2].click());
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(x => setTimeout(x, 400));
  const prio = document.getElementById('holo-prioridades').innerText;
  const tri = document.getElementById('holo-triada').innerText;
  const indice = document.getElementById('holo-interpretacao').innerText;
  return {
    meeNota: mee.nota, meeAval: mee.avaliavel, triMental: n.triada.mental, triFis: typeof n.triada.fisico,
    cobertura: r.cobertura, zeroConta: fis.respondidos,
    prio, tri, indice,
  };
}, A);
ok(parcial.meeAval === false && parcial.meeNota === null && parcial.triMental === null && parcial.triFis === 'number',
   '2: sistema sem resposta -> nota null, avaliavel false; eixo sem resposta -> null');
ok(parcial.zeroConta > 0 && parcial.cobertura.respondidos === 30 && parcial.cobertura.total === 84 && parcial.cobertura.percentual === 36,
   '3/4: resposta 0 conta como respondida; cobertura bruta 30 de 84 (36%) guardada');
ok(/em homologação/i.test(parcial.prio) && /em homologação/i.test(parcial.tri) && /em homologação/i.test(parcial.indice),
   '5: prioridades, Triade e Indice levam o selo "em homologacao" na tela');
ok(!/dados insuficientes/i.test(parcial.prio), '5: nenhum rotulo "dados insuficientes" (corte removido, nada no lugar)');

// salvar: o servidor recebe respostas, cobertura e scores — e as CMB gravadas
await p.evaluate(async () => { document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 800)); });
const apps = srv.linhas('holoscan_applications').filter(a => a.patient_id === A);
const answers = srv.linhas('holoscan_answers').filter(a => apps[0] && a.application_id === apps[0].id);
ok(apps.length === 1 && answers.length === 30 && apps[0].cobertura && apps[0].cobertura.respondidos === 30,
   '4: aplicacao parcial salva com 30 respostas e cobertura 30/84');

/* ==================================================================== */
titulo('17 — REAPLICACAO COMECA VAZIA');
/* ==================================================================== */
const rascunho = await p.evaluate((pid) => {
  const q = JSON.parse(localStorage.getItem('holohacking.questionario') || '{}')[pid] || {};
  const ap = JSON.parse(localStorage.getItem('holohacking.respostas_aplicadas') || '{}')[pid];
  return { rascunho: Object.keys(q).length, aplicadas: ap ? Object.keys(ap.respostas || {}).length : 0 };
}, A);
ok(rascunho.rascunho === 0 && rascunho.aplicadas === 30, 'apos salvar, o rascunho fica vazio e as respostas vao para respostas_aplicadas');

/* ==================================================================== */
titulo('9 — REC/SEL CONTINUAM DESATIVADOS');
/* ==================================================================== */
const rec = await p.evaluate(() => ({
  apresentaveis: window.CorpoBancos.regrasApresentaveis().length,
  total: window.CorpoBancos.RECOMENDACOES.length,
  aprovadas: window.CorpoBancos.RECOMENDACOES.filter(r => r.status === 'confirmado').length,
  aviso: (document.getElementById('holo-leitura') || {}).innerText || '',
}));
ok(rec.total === 23 && rec.aprovadas === 0 && rec.apresentaveis === 0, '23 regras REC, 0 aprovadas, 0 apresentaveis');
ok(/desativadas/.test(rec.aviso) && !/Sugestões herdadas/.test(rec.aviso), 'a tela diz que as sugestoes estao desativadas e nao lista nenhuma');

/* ==================================================================== */
titulo('10 — REGUAS MANUAIS FORA DA JORNADA NORMAL');
/* ==================================================================== */
const reguas = await p.evaluate(() => ({
  escondidas: [...document.querySelectorAll('.holo-range-wrap')].every(e => e.classList.contains('hidden')),
  textoEscondido: document.querySelector('.holo-modos span').classList.contains('hidden'),
  repontuar: !!document.getElementById('btn-repontuar'),
  liberada: window.pontuacaoManualLiberada(),
}));
ok(reguas.escondidas && reguas.textoEscondido && !reguas.repontuar && reguas.liberada === false,
   'sem ?homologacao=1: reguas, "ou pontue a mao" e "pontuar a mao" escondidos');
const q = await pagina('http://127.0.0.1:5500/?homologacao=1');
const reguasDev = await q.evaluate(() => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  return { visiveis: [...document.querySelectorAll('.holo-range-wrap')].every(e => !e.classList.contains('hidden')),
           liberada: window.pontuacaoManualLiberada(), modo: window.Metodologia.modoHomologacao() };
});
ok(reguasDev.visiveis && reguasDev.liberada === true && reguasDev.modo === true,
   'com ?homologacao=1 (contexto explicito de desenvolvimento) as reguas reaparecem — codigo preservado');
ok(/TABELAS QUE CONTINUAM EM DADOSLOCAIS[\s\S]*holoscan\s+—/.test(ler('dados-router.js')),
   'dados-router.js: a tabela "holoscan" (reguas) continua local');
await q.browserContext().close();

/* ==================================================================== */
titulo('11, 12, 13, 14 — COLETAS: IDENTIDADE PELO ID');
/* ==================================================================== */
const EX = await p.evaluate(() => window.HOLOSCAN.listaDeExames().slice(0, 3).map(e => e.id));
const D = '2026-05-05';
const duas = await p.evaluate(async (pid, d, ex) => {
  const a = await window.Sincronizacao.salvarColeta(pid, { [ex[0]]: 10 }, d, { modo: 'nova' });
  const b = await window.Sincronizacao.salvarColeta(pid, { [ex[0]]: 20 }, d, { modo: 'nova' });
  return { a, b };
}, A, D, EX);
const coletasD = srv.linhas('lab_collections').filter(c => c.patient_id === A && c.coletado_em === D);
const vals = (id) => Object.fromEntries(srv.linhas('lab_results').filter(r => r.collection_id === id).map(r => [r.exame_id, Number(r.valor)]));
ok(duas.a.ok && duas.b.ok && duas.a.coleta !== duas.b.coleta && coletasD.length === 2,
   '11: duas coletas em ' + D + ' persistem, ids independentes');
const editada = await p.evaluate(async (pid, d, ex, idA) => {
  return window.Sincronizacao.salvarColeta(pid, { [ex[0]]: 11, [ex[1]]: 7 }, d, { coletaId: idA, modo: 'editar' });
}, A, D, EX, duas.a.coleta);
ok(editada.ok && editada.coleta === duas.a.coleta && JSON.stringify(vals(duas.a.coleta)) === JSON.stringify({ [EX[0]]: 11, [EX[1]]: 7 }),
   '12: editar A pelo id troca so os resultados de A');
ok(JSON.stringify(vals(duas.b.coleta)) === JSON.stringify({ [EX[0]]: 20 }) &&
   srv.linhas('lab_collections').filter(c => c.patient_id === A && c.coletado_em === D).length === 2,
   '12: B nao mudou, e nenhuma terceira coleta nasceu');
ok(!/coletado_em\s*=\s*dt/.test(ler('supabase/migrations/20260930140000_exames_identidade_coleta.sql').split('if col_data->>')[0]),
   'migration 140000: a RPC nao procura mais coleta por (paciente, data)');
ok(/collection\.id|col_data->>'id'/.test(ler('supabase/migrations/20260930140000_exames_identidade_coleta.sql')) &&
   !/nao_futura|futuro/.test(ler('supabase/migrations/20260930140000_exames_identidade_coleta.sql').replace(/^--.*$/gm, '')),
   'migration 140000: editar pelo id; nenhuma regra de data futura no SQL (separada em migrations-pendentes/)');
ok(readdirSync(new URL('supabase/migrations-pendentes/', RAIZ)).some(f => /data_nao_futura/.test(f)),
   'a regra de data futura esta em supabase/migrations-pendentes/ (pendente de decisao)');

const painel = await p.evaluate(async (pid) => {
  window.abrirFichaDe(pid);
  await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="documentos"]').click();
  await new Promise(r => setTimeout(r, 400));
  const b = document.querySelector('#ex-corpo [data-acao="nova-coleta"]'); if (b) b.click();
  await new Promise(r => setTimeout(r, 200));
  const v = {};
  document.querySelectorAll('#ex-corpo .ex-linha').forEach(l => { const t = l.querySelector('input').value; if (t !== '') v[l.dataset.exame] = t; });
  return { modo: (document.getElementById('ex-modo') || {}).textContent || '', valores: Object.keys(v).length,
           data: document.getElementById('ex-data-coleta').value };
}, A);
ok(/Nova coleta/.test(painel.modo) && painel.valores === 0 && painel.data === '', '13: "Nova coleta" abre vazia, sem herdar valores nem data');

srv.falhar.push({ tabela: 'lab_collections', acao: 'upsert', vezes: 1 });
const antesFalha = srv.linhas('lab_collections').filter(c => c.patient_id === A).length;
const falha = await p.evaluate(async (pid, ex) =>
  window.Sincronizacao.salvarColeta(pid, { [ex[2]]: 3 }, '2026-05-06', { modo: 'nova' }), A, EX);
ok(!falha.ok && srv.linhas('lab_collections').filter(c => c.patient_id === A).length === antesFalha,
   '14: servidor falhou -> ok:false e nada novo no servidor (nenhum sucesso falso)');
srv.falhar.length = 0;

/* ==================================================================== */
titulo('15, 16 — "APAGAR TUDO" E "BACKUP COMPLETO" FORA');
/* ==================================================================== */
const conta = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="perfil"]').click();
  await new Promise(r => setTimeout(r, 200));
  const aba = document.querySelector('[data-aba-perfil="conta"]'); if (aba) aba.click();
  await new Promise(r => setTimeout(r, 200));
  const texto = (document.getElementById('secao-perfil') || {}).innerText || '';
  return { apagar: !!document.getElementById('btn-apagar-tudo'), texto };
});
ok(!conta.apagar && !/Apagar tudo/i.test(conta.texto), '15: nenhum "Apagar tudo"');
ok(!/backup completo|Exportar backup/i.test(conta.texto), '16: com conta, nenhum "Backup completo" / "Exportar backup"');
ok(/FORA DO ESCOPO OBRIGAT/i.test(ler('docs/v1/DECISOES-V1.md')) || /fora do escopo obrigat/i.test(ler('docs/v1/DECISOES-V1.md')),
   '16: DECISOES-V1.md registra backup completo fora do escopo obrigatorio da V1');

/* ==================================================================== */
titulo('19, 20 — 28 DIAS E DASHBOARD');
/* ==================================================================== */
const B = await cadastrar(p, 'Paciente Sem Salvar');
const dash = await p.evaluate(async (pidA, pidB) => {
  // B: mapa gerado e NAO salvo (previa)
  window.definirPacienteAtivo(pidB);
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  const qst = window.HOLOSCAN.questionario();
  window.aplicarPontuacao(window.HOLOSCAN.calcular(qst.map(x => ({ marcador_id: x.id, intensidade: 1 }))));
  // envelhece a aplicacao salva de A: 60 dias
  const t = JSON.parse(localStorage.getItem('holohacking.pontuacao'));
  t[pidA][0].quando = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10);
  localStorage.setItem('holohacking.pontuacao', JSON.stringify(t));
  document.querySelector('.nav-item[data-secao="dashboard"]').click();
  window.redesenharDashboard();
  await new Promise(r => setTimeout(r, 200));
  const c = window.Panorama.carteira();
  const ag = window.Panorama.agenda();
  return {
    tilesTxt: [...document.querySelectorAll('.dash-numeros .dash-tile')].map(t => t.textContent.replace(/\s+/g, ' ').trim()),
    barras: document.querySelectorAll('.dash-barra').length,
    homolog: !!document.querySelector('.dash-homologacao .selo-homologacao'),
    comMapa: c.comMapa, indiceMedio: c.indiceMedio, terreno: c.terreno.length,
    alertas: c.linhas.flatMap(l => l.alertas.map(a => a.curto)),
    derivadas: ag.linhas.map(l => l.derivada),
    dias: window.Panorama.DIAS_REAVALIACAO,
  };
}, A, B).catch(e => ({ erro: String(e) }));
ok(!dash.erro, 'dashboard desenhou sem erro' + (dash.erro ? ': ' + dash.erro : ''));
ok(dash.dias === null && dash.derivadas.every(d => d === null) && !dash.alertas.some(a => /reavalia/.test(a)),
   '19: sem DIAS_REAVALIACAO, sem data derivada, sem alerta "reavaliacao vencida" (A tem 60 dias)');
ok(dash.comMapa === 1 && dash.tilesTxt.some(t => /^1\s*com HOLOSCAN/.test(t)),
   '20: "com HOLOSCAN" conta so a aplicacao consolidada (A), nao a previa de B: ' + dash.tilesTxt.join(' · '));
ok(dash.indiceMedio === null && dash.terreno === 0 && dash.barras === 0 && dash.homolog,
   '20: Indice medio e terreno da carteira desligados; bloco "em homologacao" no lugar');

/* ==================================================================== */
titulo('18 — TROCA DE PACIENTE SEM VAZAMENTO');
/* ==================================================================== */
const C = await cadastrar(p, 'Paciente Vazio');
const troca = await p.evaluate(async (pidC) => {
  window.definirPacienteAtivo(pidC);
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 200));
  return { prio: document.getElementById('holo-prioridades').innerText.trim(),
           dom: document.getElementById('holo-dominantes').innerText.trim(),
           total: document.getElementById('holo-score-total').textContent.trim() };
}, C);
ok(troca.prio === '' && troca.dom === '' && troca.total === '—', 'paciente sem mapa: prioridades, dominantes e Indice vazios');

/* ==================================================================== */
titulo('8, 21 — HOLOS AI: SEM CMB, SEM PREVIA, COM SELO');
/* ==================================================================== */
// A tem aplicacao salva; o mapa de B (nao salvo) nao pode aparecer
const ctx = await p.evaluate(async (pidA, pidB) => {
  async function contextoDe(pid) {
    window.definirPacienteAtivo(pid);
    window.abrirFichaDe(pid);
    await new Promise(r => setTimeout(r, 300));
    document.querySelector('[data-aba="holos-ai"]').click();
    await new Promise(r => setTimeout(r, 200));
    document.querySelector('.ai-atalho-ctx[data-ctx="completo"]').click();
    await new Promise(r => setTimeout(r, 200));
    return (document.getElementById('ai-hub-texto') || {}).textContent || '';
  }
  return { a: await contextoDe(pidA), b: await contextoDe(pidB),
           urls: [...document.querySelectorAll('#ai-btn-chatgpt, #ai-btn-gemini')].map(b => b.getAttribute('href')) };
}, A, B);
const appA = srv.linhas('holoscan_applications').find(a => a.patient_id === A);
ok(appA && Array.isArray(appA.combinacoes), 'a aplicacao salva continua guardando as CMB no servidor (dado preservado)');
ok(!/CMB-|Leituras combinadas/.test(ctx.a), '8: nenhuma CMB no contexto assistivo de A');
ok(/HOLOSCAN/.test(ctx.a) && /EM HOMOLOGAÇÃO|em homologação/.test(ctx.a) && /Sistemas .*em homologação/.test(ctx.a),
   '21: o contexto de A traz o HOLOSCAN salvo marcado "em homologacao"');
ok(!/### Sistemas/.test(ctx.b), '21: a previa de B (mapa nao salvo) NAO entra no contexto');
ok(ctx.urls.every(u => !u), '21: botoes ChatGPT/Gemini sem URL (provedor nao integrado)');
ok(!/REC-|SEL-|Sugest/.test(ctx.a), '8: nenhuma regra REC/SEL no contexto');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));

await nav.close();
console.log('\n' + (falhou ? 'RESULTADO: FALHOU' : 'RESULTADO: VERDE') + '\n');
process.exit(falhou ? 1 : 0);
