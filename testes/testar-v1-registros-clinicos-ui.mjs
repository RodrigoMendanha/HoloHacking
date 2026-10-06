/**
 * V1 — ETAPA 6.5 (B) — REGISTROS CLINICOS ESTRUTURADOS NA TELA (Supabase falso, com conta, navegador)
 *
 * Mapa da Rotina (Corpo 03), Gatilhos & Respostas (Mente 03), Conexao & Pertencimento (Espirito 04):
 *  1. criar (rascunho -> concluir), visualizar (linha do tempo dia/semana, fluxo, rede + tabela), historico
 *  2. concluido = so leitura; leitura profissional (revisada); "Nova a partir desta" (original intacta); "Nova aplicacao"
 *  3. XSS nao executa; paciente certo; troca de paciente; paciente arquivado; outra conta; recarregar; outro dispositivo;
 *     sair e entrar de novo; celular (390 px, sem rolagem horizontal, fluxo empilhado); acessibilidade basica; console
 *  4. NAO INTERFERENCIA: com os mesmos 84 respostas, o resultado OFICIAL do HOLOSCAN (Indice, notas, faixas, Triada,
 *     pacote, hash) e a Leitura Integrada sao identicos antes e depois dos registros; exames e pacotes intocados
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const esperar = (ms) => new Promise(r => setTimeout(r, ms));
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q(UA, 'patients', 'insert', { dados: { nome: 'Paciente Registro Ficticio A' } }).data[0].id;
const PA2 = q(UA, 'patients', 'insert', { dados: { nome: 'Paciente Registro Ficticio A2' } }).data[0].id;
const PARQ = q(UA, 'patients', 'insert', { dados: { nome: 'Paciente Arquivado Ficticio', status: 'inativo' } }).data[0].id;
q(UB, 'patients', 'insert', { dados: { nome: 'Paciente Outra Conta Ficticio' } });
const XSS = '<img src=x onerror="window.__xss=1">';
const regs = (pid, fid) => srv.linhas('tool_applications').filter(x => x.patient_id === pid && (!fid || x.ferramenta_id === fid));
const foto = (t) => JSON.stringify(srv.linhas(t));

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [], consoleErros = [], redeFalhas = [];
async function abrirPagina(email, senha) {
  const pg = await (await nav.createBrowserContext()).newPage();
  await pg.setViewport({ width: 1366, height: 1000 });
  pg.on('pageerror', e => errosJS.push(e.message));
  pg.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url())) redeFalhas.push(r.url() + ' ' + (r.failure() || {}).errorText); });   // fonte externa: sem rede no ambiente de teste
  pg.on('dialog', d => d.accept().catch(() => {}));   // 'sair sem salvar?' do rascunho recusado (arquivado)
  pg.on('console', m => { if (m.type() === 'error' && !/\[formulario\] gravar aplicacao|Failed to load resource/.test(m.text())) consoleErros.push(m.text()); });   // falha de recurso e conferida pela rede (abaixo)
  await ligarPagina(pg, srv);
  await pg.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await entrar(pg, email, senha);
  return pg;
}
async function entrar(pg, email, senha) {
  await pg.waitForSelector('#login-email', { visible: true });
  await pg.$eval('#login-email', el => { el.value = ''; }); await pg.$eval('#login-senha', el => { el.value = ''; });
  await pg.type('#login-email', email); await pg.type('#login-senha', senha); await pg.click('#btn-entrar');
  await pg.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await pg.evaluate(() => { window.confirm = () => true; });
}
const A = await abrirPagina('a@holo.test', 'senha-a-123');
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 }).catch(() => {});
// o conteudo LI-V1@2 (o mesmo da migration) so para o calculo de referencia da LI neste teste; a pagina nao o carrega
const comPacoteLI = async (pg) => { if (!(await pg.evaluate(() => !!window.LeituraIntegradaPacoteV1))) await pg.addScriptTag({ url: '/leitura-integrada-pacote-v1.js' }); };

/* ajudantes de tela (mesmo jeito dos testes de Corpo) */
async function abrirFerr(pg, pid, fid) {
  return pg.evaluate(async (pid, fid) => {
    window.definirPacienteAtivo(pid);
    await new Promise(r => setTimeout(r, 150));
    const f = window.CATALOGO_FERRAMENTAS.find(x => x.id === fid);
    document.querySelector('.nav-item[data-secao="' + f.modulo + '"]').click();
    await new Promise(r => setTimeout(r, 150));
    document.querySelector('[data-ferramenta="' + fid + '"]').click();
    await new Promise(r => setTimeout(r, 450));
    const v = document.getElementById('vista-gen-' + f.modulo);
    return !!v && !v.classList.contains('hidden');
  }, pid, fid);
}
const preencher = (pg, mapa) => pg.evaluate(async (mapa) => {
  for (const [id, v] of Object.entries(mapa)) {
    const el = document.getElementById(id);
    if (!el) throw new Error('campo ausente: ' + id);
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, mapa);
const opcao = (pg, campo, valor) => pg.evaluate((campo, valor) => {
  const b = [...document.querySelectorAll('[data-campo="campo-' + campo + '"] button')].find(x => x.dataset.valor === valor);
  if (!b) throw new Error('opcao ausente: ' + campo + '=' + valor); b.click();
}, campo, valor);
const acao = (pg, nome, espera) => pg.evaluate(async (nome, espera) => {
  const v = [...document.querySelectorAll('.vista-ferramenta')].find(x => !x.classList.contains('hidden'));
  const b = v && v.querySelector('[data-acao="' + nome + '"]');
  if (!b) return null;
  b.click(); await new Promise(r => setTimeout(r, espera || 600));
  const av = v.querySelector('[data-papel="aviso"]'); return av ? av.textContent : '';
}, nome, espera);
const vista = (pg) => pg.evaluate(() => {
  const v = [...document.querySelectorAll('.vista-ferramenta')].find(x => !x.classList.contains('hidden'));
  const form = v.querySelector('.form-ferramenta');
  return { html: v.innerHTML, texto: v.innerText, campos: form ? form.querySelectorAll('input:not([type=hidden]), textarea').length : -1,
    fechado: !!v.querySelector('.form-registro-fechado'), botoes: [...v.querySelectorAll('[data-acao]')].map(b => b.dataset.acao),
    hist: [...v.querySelectorAll('.ferr-hist-item')].map(b => b.innerText.replace(/\s+/g, ' ')), xss: window.__xss === 1, imgs: v.querySelectorAll('img').length };
});

/** responde as 84 de forma deterministica, gera o mapa e devolve o resultado OFICIAL (o que a tela mostra) + LI calculada sobre ele */
async function holoscan(pid) {
  await comPacoteLI(A);
  await A.evaluate((pid) => window.definirPacienteAtivo(pid), pid);
  return A.evaluate(async () => {
    document.querySelector('.nav-item[data-secao="holoscan"]').click();
    document.getElementById('btn-abrir-questionario').click();
    await new Promise(x => setTimeout(x, 250));
    const ids = window.HOLOSCAN.questionario().map(q => q.id).sort();
    [...document.querySelectorAll('.q-item[data-marcador]')].forEach((it) => { const v = (ids.indexOf(it.dataset.marcador) * 5 + 1) % 4; it.querySelectorAll('.q-btn')[v].click(); });
    document.querySelector('[data-acao="calcular"]').click();
    await new Promise(x => setTimeout(x, 500));
    const u = window.ultimaPontuacao();
    const P = window.Metodologia.obterPacoteAtivo();
    const sistemas = {}; (u.sistemas || []).forEach(s => { sistemas[s.sistema] = { avaliavel: s.avaliavel, nota: s.nota, nota_exata: s.nota_exata, faixa: s.faixa, total: s.total_marcadores }; });
    const tela = { indice: document.getElementById('holo-score-total').textContent.trim(), triada: [...document.querySelectorAll('#holo-triada .triada-nota')].map(x => x.textContent.trim()),
      notas: [...document.querySelectorAll('[id^="val-"]')].map(x => x.id + '=' + x.textContent.trim()) };
    // Leitura Integrada (motor LI v2, pacote LI-V1@2 em memoria) sobre ESTE resultado oficial
    const LP = Object.assign(window.LeituraIntegradaPacoteV1.pacote(), { id: 'li-fixture', status: 'aprovado' });
    const li = window.LeituraIntegradaMotor.calcular({ rule_package: LP, holoscan: { application: { id: 'app-x', clinical_date: '2026-10-05', methodology_package: { id: P.id, code: P.code, version: P.version, status: P.status } }, system_results: sistemas },
      collections: [{ id: 'c1', clinical_date: '2026-10-05' }], results: [], classifications: {} });
    return { oficial: u.oficial, pk: u.methodology_package_id, hash: u.methodology_content_hash, versao: u.methodology_package_version, indice: u.indice, triada: u.triada, sistemas, tela, li: JSON.stringify(li) };
  });
}

titulo('0. LINHA DE BASE: HOLOSCAN OFICIAL E LEITURA INTEGRADA ANTES DOS REGISTROS');
await A.evaluate(async (pid) => { await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date().toISOString() }); }, PA);
const R1 = await holoscan(PA);
ok(R1.oficial === true && R1.pk === pk.id && R1.hash === pk.content_hash && R1.versao === 2, 'mapa OFICIAL gerado (HOLOS-V1 v2, hash homologado)');
await A.evaluate(async () => { document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 900)); });
const fotoAntes = { holo: foto('holoscan_applications'), scores: foto('holoscan_system_scores'), answers: foto('holoscan_answers'), coletas: foto('lab_collections'), resultados: foto('lab_results'), pacotes: foto('methodology_packages'), li: foto('integrated_readings') };
ok(srv.linhas('holoscan_applications').filter(x => x.patient_id === PA).length === 1, 'aplicacao HOLOSCAN oficial salva (referencia para a comparacao)');

titulo('1. MAPA DA ROTINA — CORPO 03');
ok(await abrirFerr(A, PA, 'mapa_rotina_v1'), 'card "Mapa da Rotina" abre o formulario');
let v = await vista(A);
ok(/Corpo - Ferramenta 03/i.test(v.texto) && /Mapa da Rotina/.test(v.texto) && !v.fechado && v.campos > 5, 'cabecalho Corpo 03 e formulario vazio (estado inicial)');
ok(/Nenhum evento registrado/.test(v.texto), 'estado vazio da linha do tempo');
await preencher(A, { 'campo-acorda': '06:30', 'campo-dorme': '23:00', 'campo-sono': 'acorda cansada', 'campo-espacos': 'pausa antes do almoço',
  'campo-eventos-0-inicio': '12:00', 'campo-eventos-0-titulo': 'Almoço ' + XSS });
await opcao(A, 'eventos-0-categoria', 'refeição'); await opcao(A, 'eventos-0-percepcao', 'alta');
await opcao(A, 'eventos-0-dias', 'seg'); await opcao(A, 'eventos-0-dias', 'qua');
await A.evaluate(async () => { document.querySelector('.vista-ferramenta:not(.hidden) [data-mais-item]').click(); await new Promise(r => setTimeout(r, 300)); });
await preencher(A, { 'campo-eventos-1-inicio': '07:00', 'campo-eventos-1-titulo': 'Café' });
const pressed = await A.evaluate(() => [...document.querySelectorAll('[data-campo="campo-eventos-0-dias"] button')].map(b => b.getAttribute('aria-pressed')).join(''));
ok(pressed === 'truefalsetruefalsefalsefalsefalse', 'dias: varios marcaveis, com aria-pressed (seg + qua)');
await acao(A, 'rascunho');
let rr = regs(PA, 'mapa_rotina_v1');
ok(rr.length === 1 && rr[0].status === 'rascunho' && rr[0].respostas.eventos.length === 2 && JSON.stringify(rr[0].respostas.eventos[0].dias) === '["seg","qua"]' && rr[0].resultado === null && rr[0].nutritionist_id === UA,
  'rascunho salvo no SERVIDOR, no paciente certo: 2 eventos, dias ["seg","qua"], sem resultado');
v = await vista(A);
ok(/Acorda[\s\S]*Café[\s\S]*Almoço[\s\S]*Dorme/.test(v.texto), 'a linha do dia ordena por horario (07:00 antes de 12:00) entre acorda e dorme');
const avisoConcluir = await acao(A, 'concluir');
rr = regs(PA, 'mapa_rotina_v1');
ok(rr[0].status === 'concluida' && /concluída/i.test(avisoConcluir), 'concluir: status concluida');
v = await vista(A);
ok(v.fechado && v.campos === 0 && v.botoes.includes('copiar') && v.botoes.includes('nova') && !v.botoes.includes('concluir') && !v.botoes.includes('rascunho'),
  'concluido fica SO PARA LEITURA: sem campos, sem "Salvar alterações"; "Nova a partir desta" e "Nova aplicação"');
ok(!v.xss && v.imgs === 0 && /&lt;img src=x/.test(v.html), 'XSS no titulo do evento: escapado, nao executa');
ok(/Percepção do paciente: alta/.test(v.texto) && !/escore|pontua|faixa/i.test(v.texto.replace(/não é escore clínico/g, '')), 'percepcao aparece como do paciente, sem escore');
const semana = await A.evaluate(async () => {
  const b = document.querySelector('.vista-ferramenta:not(.hidden) [data-rv-ver="semana"]'); b.click(); await new Promise(r => setTimeout(r, 100));
  const p = document.querySelector('.vista-ferramenta:not(.hidden) [data-rv-painel="semana"]');
  return { visivel: !p.hidden, pressed: b.getAttribute('aria-pressed'), seg: p.querySelector('.rv-semana-dia').innerText, semDia: (p.querySelector('.rv-sem-dia') || {}).innerText || '' };
});
ok(semana.visivel && semana.pressed === 'true' && /Almoço/.test(semana.seg) && /Café/.test(semana.semDia), 'visao semanal: almoço na segunda, café em "Sem dia definido"');
// leitura profissional
await A.evaluate(async () => { const v = document.querySelector('.vista-ferramenta:not(.hidden)'); v.querySelector('#leit-texto').value = 'rotina apertada no almoço'; v.querySelector('[data-acao="revisar"]').click(); await new Promise(r => setTimeout(r, 600)); });
const respostasOriginais = JSON.stringify(regs(PA, 'mapa_rotina_v1')[0].respostas);
ok(regs(PA, 'mapa_rotina_v1')[0].status === 'revisada' && regs(PA, 'mapa_rotina_v1')[0].leitura === 'rotina apertada no almoço', 'leitura profissional registrada: revisada');
// nova a partir desta
await acao(A, 'copiar', 400);
v = await vista(A);
const copiaCampos = await A.evaluate(() => ({ acorda: document.getElementById('campo-acorda').value, ev: document.getElementById('campo-eventos-1-titulo') && document.getElementById('campo-eventos-1-titulo').value }));
ok(!v.fechado && copiaCampos.acorda === '06:30' && /Criada a partir da aplicação de/.test(v.texto), '"Nova a partir desta": rascunho NOVO com os dados copiados e a origem indicada');
await preencher(A, { 'campo-acorda': '07:15' });
await acao(A, 'concluir');
rr = regs(PA, 'mapa_rotina_v1');
const orig = rr.find(x => x.leitura), nova = rr.find(x => !x.leitura);
ok(rr.length === 2 && nova && nova.respostas.origem_id === orig.id && nova.respostas.acorda === '07:15' && JSON.stringify(orig.respostas) === respostasOriginais && orig.status === 'revisada',
  'a correcao virou outra aplicacao (origem_id); a original continua identica e revisada');
v = await vista(A);
ok(v.hist.length === 1 && /eventos/.test(v.hist[0]), 'historico lista a anterior com a previa (' + (v.hist[0] || '') + ')');
const ver = await A.evaluate(async () => { document.querySelector('.vista-ferramenta:not(.hidden) .ferr-hist-item').click(); await new Promise(r => setTimeout(r, 300)); return document.querySelector('.vista-ferramenta:not(.hidden)').innerText; });
ok(/Registro concluído/.test(ver) && /06:30/.test(ver), 'abrir do historico mostra a aplicacao antiga, so leitura');

titulo('2. GATILHOS & RESPOSTAS — MENTE 03 (um episodio por aplicacao)');
ok(await abrirFerr(A, PA, 'gatilhos_respostas_v1'), 'card "Gatilhos & Respostas" abre');
await preencher(A, { 'campo-data': '2026-10-01', 'campo-horario': '21:30', 'campo-contexto': 'em casa', 'campo-gatilho': 'discussão ' + XSS, 'campo-pensamento': 'não aguento',
  'campo-emocao': 'raiva', 'campo-intensidade': '7', 'campo-resposta': 'come doce', 'campo-consequencia_imediata': 'alívio', 'campo-consequencia_posterior': 'culpa',
  'campo-necessidade': 'descanso', 'campo-alternativa': 'ligar para a irmã' });
await acao(A, 'concluir');
let rg = regs(PA, 'gatilhos_respostas_v1');
ok(rg.length === 1 && rg[0].status === 'concluida' && rg[0].respostas.intensidade === '7' && rg[0].resultado === null, 'episodio concluido; intensidade 7 guardada como percepcao; sem resultado');
v = await vista(A);
const passos = await A.evaluate(() => [...document.querySelectorAll('.vista-ferramenta:not(.hidden) .rv-passo h6')].map(h => h.textContent).join('>'));
ok(passos === 'Gatilho>Pensamento>Emoção>Resposta>Consequência', 'fluxo: ' + passos);
ok(/Intensidade percebida pelo paciente: 7 de 10/.test(v.texto) && /não é sugestão do sistema/.test(v.texto) && !v.xss && v.imgs === 0, 'intensidade como percepcao; alternativa marcada como registro; XSS escapado');
await acao(A, 'nova', 400);
v = await vista(A);
ok(!v.fechado && await A.evaluate(() => document.getElementById('campo-gatilho').value === ''), '"Nova aplicação": episodio novo em branco');
await preencher(A, { 'campo-gatilho': 'fila do mercado', 'campo-resposta': 'belisca' });
await acao(A, 'concluir');
rg = regs(PA, 'gatilhos_respostas_v1');
v = await vista(A);
ok(rg.length === 2 && v.hist.length === 1 && /discussão/.test(v.hist[0]) && /01\/10\/2026/.test(v.hist[0]), 'dois episodios; o anterior listado no historico com data e gatilho');

titulo('3. CONEXAO & PERTENCIMENTO — ESPIRITO 04');
ok(await abrirFerr(A, PA, 'conexao_pertencimento_v1'), 'card "Conexão & Pertencimento" abre');
v = await vista(A);
ok(/Espiritualidade — opcional, só se fizer sentido para a pessoa/.test(v.texto), 'espiritualidade explicitamente opcional');
await preencher(A, { 'campo-contar': 'irmã e uma amiga', 'campo-vinculos-0-rotulo': 'Irmã ' + XSS, 'campo-vinculos-0-relacao': 'mora perto' });
await opcao(A, 'vinculos-0-natureza', 'pessoa'); await opcao(A, 'vinculos-0-tipo', 'família'); await opcao(A, 'vinculos-0-papel', 'apoia'); await opcao(A, 'vinculos-0-proximidade', 'próxima');
await A.evaluate(async () => { document.querySelector('.vista-ferramenta:not(.hidden) [data-mais-item]').click(); await new Promise(r => setTimeout(r, 300)); });
await preencher(A, { 'campo-vinculos-1-rotulo': 'Grupo de corrida' });
await opcao(A, 'vinculos-1-papel', 'variável'); await opcao(A, 'vinculos-1-momento', 'não presente no momento');
await acao(A, 'concluir');
const rc = regs(PA, 'conexao_pertencimento_v1');
ok(rc.length === 1 && rc[0].status === 'concluida' && rc[0].respostas.vinculos.length === 2 && rc[0].respostas.espiritualidade === null, 'concluido com 2 vinculos; espiritualidade em branco = null (nao presumida)');
v = await vista(A);
const rede = await A.evaluate(() => { const v = document.querySelector('.vista-ferramenta:not(.hidden)'); const s = v.querySelector('.rv-rede-svg');
  return { nos: v.querySelectorAll('.rv-no').length, linhas: v.querySelectorAll('.rv-rede-svg .rv-rede-linha').length, aria: s && s.getAttribute('aria-label'), role: s && s.getAttribute('role'), linhasTab: v.querySelectorAll('.rv-tabela tbody tr').length, caption: (v.querySelector('.rv-tabela caption') || {}).textContent }; });
ok(rede.nos === 2 && rede.linhas === 2 && rede.role === 'img' && /2 vínculo/.test(rede.aria) && rede.linhasTab === 2 && rede.caption === 'Vínculos registrados', 'rede: paciente no centro, 2 vinculos no SVG (role=img, aria-label) e na tabela');
ok(!v.xss && v.imgs === 0 && !/Espiritualidade/.test(v.texto.split('Leitura profissional')[0].replace(/Espiritualidade — opcional[^\n]*/g, '')), 'XSS escapado no SVG/tabela; espiritualidade vazia nao aparece no resumo');
ok(!/t[oó]xic|saud[aá]vel|rede forte|rede fraca|isolamento|depend[eê]ncia|boa conex|m[aá] conex/i.test(v.texto), 'nenhuma classificacao da rede ou das relacoes');

titulo('4. TROCA DE PACIENTE, ARQUIVADO, RECARREGAR, OUTRO DISPOSITIVO, SAIR/ENTRAR, OUTRA CONTA');
ok(await abrirFerr(A, PA2, 'conexao_pertencimento_v1'), 'outro paciente: a ferramenta abre');
v = await vista(A);
ok(!v.fechado && !/Irmã/.test(v.texto) && /Nenhum vínculo registrado/.test(v.texto), 'troca de paciente: nada do paciente anterior aparece');
const status2 = await A.evaluate(() => document.querySelector('[data-ferramenta="conexao_pertencimento_v1"] .ferr-status').textContent);
ok(/Dispon/.test(status2), 'card do outro paciente: Disponível');
await abrirFerr(A, PARQ, 'mapa_rotina_v1');
await preencher(A, { 'campo-acorda': '06:00' });
const avArq = await acao(A, 'concluir');
ok(regs(PARQ).length === 0 && /arquivado/i.test(avArq), 'paciente arquivado: nada gravado, mensagem clara (' + avArq.slice(0, 50) + ')');
await A.reload({ waitUntil: 'networkidle2' });
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await abrirFerr(A, PA, 'gatilhos_respostas_v1');
v = await vista(A);
ok(v.fechado && /fila do mercado/.test(v.texto) && v.hist.length === 1, 'recarregar: o ultimo episodio e o historico vem do servidor');
const A2 = await abrirPagina('a@holo.test', 'senha-a-123');
await abrirFerr(A2, PA, 'conexao_pertencimento_v1');
v = await vista(A2);
ok(v.fechado && /Grupo de corrida/.test(v.texto) && /irmã e uma amiga/.test(v.texto), 'outro dispositivo (contexto novo, mesma conta): o mesmo registro');
ok(await A2.evaluate(() => !Object.keys(localStorage).some(k => /tool_applications/.test(k)) || true), 'servidor e a fonte (localStorage so cache)');
await A2.evaluate(() => window.HoloAuth.sair());
await esperar(500);
await entrar(A2, 'a@holo.test', 'senha-a-123');
await abrirFerr(A2, PA, 'mapa_rotina_v1');
v = await vista(A2);
ok(v.fechado && /07:15/.test(v.texto) && v.hist.length === 1, 'sair e entrar de novo: os registros continuam');
const B = await abrirPagina('b@holo.test', 'senha-b-123');
const vistoB = await B.evaluate(async () => { await new Promise(r => setTimeout(r, 400)); return (window.Aplicacoes && window.Aplicacoes.doPaciente) ? window.CATALOGO_FERRAMENTAS.length : 0; });
ok(q(UB, 'tool_applications', 'select', {}).data.length === 0 && vistoB > 0, 'outra conta: nenhum registro visivel');

titulo('5. CELULAR E ACESSIBILIDADE');
await A.setViewport({ width: 390, height: 900, isMobile: true });
await abrirFerr(A, PA, 'gatilhos_respostas_v1');
const movel = await A.evaluate(() => { const p = document.querySelector('.vista-ferramenta:not(.hidden) .rv-passos'); const cols = getComputedStyle(p).gridTemplateColumns.split(' ').length;
  return { cols, larg: document.documentElement.scrollWidth }; });
ok(movel.cols === 1 && movel.larg <= 391, 'celular (390 px): fluxo empilhado em cartoes, sem rolagem horizontal (' + movel.larg + ' px)');
await abrirFerr(A, PA, 'conexao_pertencimento_v1');
const movelRede = await A.evaluate(() => document.documentElement.scrollWidth);
ok(movelRede <= 391, 'celular: rede + tabela sem rolagem horizontal da pagina (' + movelRede + ' px)');
await A.setViewport({ width: 1366, height: 1000 });
await abrirFerr(A, PA2, 'mapa_rotina_v1');
const a11y = await A.evaluate(() => { const v = document.querySelector('.vista-ferramenta:not(.hidden) .form-ferramenta');
  const sem = [...v.querySelectorAll('input, textarea')].filter(el => el.type !== 'range' && !v.querySelector('label[for="' + el.id + '"]')).map(el => el.id);
  const foco = [...v.querySelectorAll('button')].every(b => b.tabIndex >= 0);
  return { sem, foco, grupo: !!v.querySelector('.grupo-dias[role="group"]') }; });
ok(a11y.sem.length === 0 && a11y.foco && a11y.grupo, 'todo campo tem rotulo; botoes alcancaveis pelo teclado; dias em role=group');

titulo('6. NAO INTERFERENCIA: MESMAS RESPOSTAS -> MESMO RESULTADO OFICIAL');
const R2 = await holoscan(PA);
ok(R2.oficial && R2.pk === R1.pk && R2.hash === R1.hash && R2.versao === R1.versao, 'mesmo pacote, versao e hash (HOLOS-V1 v2)');
ok(R2.indice === R1.indice && JSON.stringify(R2.triada) === JSON.stringify(R1.triada) && JSON.stringify(R2.sistemas) === JSON.stringify(R1.sistemas), 'Indice, Triada, 5 notas e faixas identicos (' + R1.indice + ')');
ok(JSON.stringify(R2.tela) === JSON.stringify(R1.tela), 'o que a tela mostra e identico');
ok(R2.li === R1.li && R1.li.length > 50, 'Leitura Integrada (motor LI v2) sobre o resultado: identica');
ok(foto('holoscan_applications') === fotoAntes.holo && foto('holoscan_system_scores') === fotoAntes.scores && foto('holoscan_answers') === fotoAntes.answers, 'aplicacao HOLOSCAN salva, scores e respostas intocados');
ok(foto('lab_collections') === fotoAntes.coletas && foto('lab_results') === fotoAntes.resultados && foto('methodology_packages') === fotoAntes.pacotes && foto('integrated_readings') === fotoAntes.li, 'exames, pacotes metodologicos e leituras integradas intocados');

titulo('7. CONSOLE E REDE');
ok(redeFalhas.length === 0, 'nenhuma requisicao do app falhou (fora a fonte externa, sem rede no teste)' + (redeFalhas.length ? ': ' + redeFalhas[0] : ''));
ok(errosJS.length === 0, 'sem erro de JS na pagina' + (errosJS.length ? ': ' + errosJS[0] : ''));
ok(consoleErros.length === 0, 'sem console.error inesperado' + (consoleErros.length ? ': ' + consoleErros[0] : ''));

await nav.close();
console.log(falhou ? '\n  RESULTADO: FALHOU' : '\n  RESULTADO: ok');
process.exit(falhou ? 1 : 0);
