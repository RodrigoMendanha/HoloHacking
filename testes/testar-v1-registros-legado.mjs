/**
 * V1 — ETAPA 6.5 (B) — COMPATIBILIDADE COM AS VERSOES ANTIGAS (TESTE PERMANENTE)
 *
 * mapa_rotina, gatilhos_respostas e conexao_pertencimento ja existiram com OUTRO formato (inativos). A Etapa 6.5 congela
 * esses IDs no schema antigo e cria IDs NOVOS para os registros clinicos: mapa_rotina_v1, gatilhos_respostas_v1,
 * conexao_pertencimento_v1. Este teste prova que um payload antigo NUNCA vira registro novo:
 *  1. payload antigo completo e recusado            2. payload antigo parcial e recusado
 *  3. a caixa antiga holohacking.ferramentas nao vira *_v1 (primeiro acesso e sessao ja ativa)
 *  4. localStorage antigo nao aparece no historico das ferramentas novas
 *  5. nada sincroniza em silencio                    6. nada sobrescreve registro novo
 *  7. modo local nao abre payload antigo com o formulario novo
 *  8. nao existe conversao automatica ID antigo -> ID novo (codigo e dados)
 * (Achado que originou o teste: com os IDs reutilizados, o payload antigo PARCIAL era aceito e a caixa antiga subia
 *  como registro novo. Ver docs/v1/ETAPA6-5-B-REGISTROS-CLINICOS.md, secao 8.)
 */
import './guarda-falhas.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const RAIZ = new URL('..', import.meta.url);
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Legado Ficticio' } }).data[0].id;
const ANTIGOS = ['mapa_rotina', 'gatilhos_respostas', 'conexao_pertencimento'];
const NOVOS = ANTIGOS.map(x => x + '_v1');
const registros = () => srv.linhas('tool_applications').filter(x => ANTIGOS.includes(x.ferramenta_id) || NOVOS.includes(x.ferramenta_id));

/* formatos ANTIGOS, como o catalogo os define (entradas legado: true de ferramentas.js) */
const ANTIGO_COMPLETO = {
  mapa_rotina: { eventos: [{ inicio: '07:00', fim: null, tipo: 'Refeição', titulo: 'café', onde: 'casa', fome: '6', energia: '4', estresse: '3', observacao: null }], barreira: 'falta de tempo', comecar: 'almoço' },
  gatilhos_respostas: { gatilho1: 'briga', resposta1: 'come doce', escolha1: 'caminhar', gatilho2: null, resposta2: null, escolha2: null, gatilho3: null, resposta3: null, escolha3: null },
  conexao_pertencimento: { sustentam: 'irmã', drenam: 'trabalho', pertence: 'igreja', sozinho: 'domingo' }
};
/* subconjuntos ANTIGOS cujas chaves coincidem com o formato novo (o caso que era aceito com os IDs reutilizados) */
const ANTIGO_PARCIAL = {
  mapa_rotina: { eventos: [{ inicio: '07:00', titulo: 'café', observacao: 'rápido' }] },
  gatilhos_respostas: {},
  conexao_pertencimento: { pertence: 'igreja' }
};

titulo('0. CATALOGO: IDS ANTIGOS CONGELADOS, IDS NOVOS ATIVOS');
globalThis.window = globalThis;
await import('../ferramentas.js');
const cat = (id) => window.CATALOGO_FERRAMENTAS.find(f => f.id === id);
ok(ANTIGOS.every(id => cat(id) && cat(id).legado === true && !cat(id).registro && !window.FERRAMENTAS_ATIVAS.includes(id)), 'IDs antigos: legado, sem registro, fora de FERRAMENTAS_ATIVAS');
ok(ANTIGOS.every(id => JSON.stringify(cat(id)) === JSON.stringify(Object.assign({}, cat(id)))) && cat('gatilhos_respostas').campos.map(c => c.id).join() === 'gatilho1,resposta1,escolha1,gatilho2,resposta2,escolha2,gatilho3,resposta3,escolha3'
  && cat('mapa_rotina').resultado === 'rotina' && cat('conexao_pertencimento').campos.map(c => c.id).join() === 'sustentam,drenam,pertence,sozinho', 'schema antigo preservado nos IDs antigos');
ok(NOVOS.every(id => cat(id) && cat(id).registro === true && !cat(id).legado && window.FERRAMENTAS_ATIVAS.includes(id)), 'IDs novos: registro clinico, ativos');
ok(NOVOS.every(id => !/_v1/.test(cat(id).titulo + cat(id).chamada + cat(id).descricao)) && NOVOS.every((id, i) => cat(id).titulo === cat(ANTIGOS[i]).titulo), 'o nome clinico na tela continua o mesmo, sem "_v1"');
const html = readFileSync(new URL('index.html', RAIZ), 'utf8');
ok(ANTIGOS.every(id => !html.includes('data-ferramenta="' + id + '"')) && NOVOS.every(id => html.includes('data-ferramenta="' + id + '"')) && !/>[^<]*_v1[^<]*</.test(html), 'galeria: card so dos IDs novos; "_v1" nunca aparece como texto');

titulo('1-2, 6. SERVIDOR: PAYLOAD ANTIGO E REGISTRO NOVO');
const ins = (fid, r, extra) => q('tool_applications', 'insert', { dados: Object.assign({ patient_id: PA, ferramenta_id: fid, versao_ferramenta: '0', status: 'concluida', respostas: r }, extra || {}) });
const motivo = (r) => r.error ? (r.error.hint || (/ferramenta_valida/.test(r.error.message) ? 'ferramenta_valida' : r.error.message)) : 'ACEITO';
const comp = ANTIGOS.map(fid => fid + ':' + motivo(ins(fid, ANTIGO_COMPLETO[fid])));
ok(comp.every(x => /:ferramenta_valida$/.test(x)), '1. payload antigo COMPLETO recusado nos 3 IDs antigos: ' + comp.join(' '));
const parc = ANTIGOS.map(fid => fid + ':' + motivo(ins(fid, ANTIGO_PARCIAL[fid], { versao_ferramenta: '1' })));
ok(parc.every(x => /:ferramenta_valida$/.test(x)), '2. payload antigo PARCIAL recusado nos 3 IDs antigos (mesmo com versao 1): ' + parc.join(' '));
const comNovo = ANTIGOS.map((fid, i) => NOVOS[i] + ':' + motivo(ins(NOVOS[i], ANTIGO_COMPLETO[fid], { versao_ferramenta: '1' })));
ok(comNovo.every(x => /:registro_formato$/.test(x)), 'payload antigo COMPLETO enviado com ID novo: recusado pelo formato: ' + comNovo.join(' '));
const novo = ins('gatilhos_respostas_v1', { gatilho: 'fila', resposta: 'belisca' }, { versao_ferramenta: '1' }).data[0];
const sob = q('tool_applications', 'update', { dados: { respostas: ANTIGO_COMPLETO.gatilhos_respostas }, filtros: [{ op: 'eq', col: 'id', val: novo.id }] });
ok(sob.error && JSON.stringify(srv.linhas('tool_applications').find(x => x.id === novo.id).respostas) === JSON.stringify({ gatilho: 'fila', resposta: 'belisca' }), '6. payload antigo nao sobrescreve registro novo (' + motivo(sob) + ')');
const antesNav = JSON.stringify(registros());

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
async function pagina() {
  const pg = await (await nav.createBrowserContext()).newPage();
  pg.on('dialog', d => d.accept().catch(() => {}));
  await ligarPagina(pg, srv);
  await pg.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  return pg;
}
async function entrar(pg) {
  await pg.waitForSelector('#login-email', { visible: true });
  await pg.type('#login-email', 'a@holo.test'); await pg.type('#login-senha', 'senha-a-123'); await pg.click('#btn-entrar');
  await pg.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 1500));   // migracao-supa + Aplicacoes.carregar/migrar
}
const semear = (pg, caixa, tabela) => pg.evaluate((caixa, tabela) => {
  if (caixa) localStorage.setItem('holohacking.ferramentas', JSON.stringify(caixa));
  if (tabela) localStorage.setItem('holohacking.dados.aplicacoes', JSON.stringify(tabela));
}, caixa, tabela);
const agora = new Date().toISOString();
const linhaLocal = (fid, r, i) => ({ id: '00000000-0000-4000-8000-00000000010' + i, paciente_id: PA, consulta_id: null, ferramenta_id: fid, versao_ferramenta: '1', status: 'concluida',
  iniciada_em: agora, concluida_em: agora, atualizada_em: agora, respostas: r, resultado: null, leitura: null, prioridade: null, proximo_passo: null, created_at: agora });
const TABELA_ANTIGA = ANTIGOS.map((fid, i) => linhaLocal(fid, ANTIGO_COMPLETO[fid], i)).concat([linhaLocal('conexao_pertencimento', ANTIGO_PARCIAL.conexao_pertencimento, 3), linhaLocal('mapa_rotina', ANTIGO_PARCIAL.mapa_rotina, 4)]);
const CAIXA_ANTIGA = { [PA]: { gatilhos_respostas: ANTIGO_COMPLETO.gatilhos_respostas, mapa_rotina: ANTIGO_PARCIAL.mapa_rotina, conexao_pertencimento: ANTIGO_PARCIAL.conexao_pertencimento } };
const historicoNovo = (pg) => pg.evaluate((pid, ids) => { if (window.definirPacienteAtivo) window.definirPacienteAtivo(pid); return ids.map(id => window.Aplicacoes.historico(id, pid).length).join(','); }, PA, NOVOS);
const temNovoEsperado = (h) => h === '0,1,0';   // so o gatilhos_respostas_v1 criado no servidor acima

titulo('3-5. NAVEGADOR COM SESSAO');
let P = await pagina();
await semear(P, CAIXA_ANTIGA, TABELA_ANTIGA);
await P.reload({ waitUntil: 'networkidle2' });
await entrar(P);
ok(JSON.stringify(registros()) === antesNav, '3/5. primeiro acesso: caixa antiga e tabela local antiga nao subiram nem viraram *_v1 (servidor identico)');
const h1 = await historicoNovo(P);
ok(temNovoEsperado(h1), '4. historico das ferramentas novas so com o registro novo do servidor, nada antigo: ' + h1);
await semear(P, CAIXA_ANTIGA, null);
await P.reload({ waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await new Promise(r => setTimeout(r, 1500));
ok(JSON.stringify(registros()) === antesNav, '3/5. sessao ja ativa: a caixa antiga e recusada no servidor (ID antigo) e nada vira *_v1');
const h2 = await historicoNovo(P);
ok(temNovoEsperado(h2), '4. e o historico das novas continua sem nada antigo: ' + h2);
ok(JSON.stringify(srv.linhas('tool_applications').find(x => x.id === novo.id).respostas) === JSON.stringify({ gatilho: 'fila', resposta: 'belisca' }), '6. o registro novo continua intacto');
const abre = await P.evaluate((ids) => ids.map(id => window.abrirFerramentaPorId(id)), ANTIGOS);
ok(abre.every(x => x === false) && await P.evaluate((ids) => ids.every(id => !document.querySelector('[data-ferramenta="' + id + '"]')), ANTIGOS), 'ID antigo nao abre o formulario novo (abrirFerramentaPorId recusa; sem card)');

titulo('7. MODO LOCAL (SEM SUPABASE)');
const L = await (await nav.createBrowserContext()).newPage();
L.on('dialog', d => d.accept().catch(() => {}));
await L.setRequestInterception(true);
L.on('request', r => /supabase|cdn\.jsdelivr/.test(r.url()) ? r.abort() : r.continue());
await L.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await L.evaluate((t, pid) => { localStorage.setItem('holohacking.dados.aplicacoes', JSON.stringify(t)); localStorage.setItem('holohacking.dados.pacientes', JSON.stringify([{ id: pid, nome: 'Paciente Legado Ficticio', status: 'ativo', created_at: new Date().toISOString() }])); }, TABELA_ANTIGA, PA);
await L.reload({ waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1200));
const local = await L.evaluate((pid, novos, antigos) => ({ cliente: !!window.supabaseClient, novos: novos.map(id => window.Aplicacoes.historico(id, pid).length).join(','),
  antigos: antigos.map(id => window.Aplicacoes.historico(id, pid).length).join(','), abre: antigos.map(id => window.abrirFerramentaPorId(id)) }), PA, NOVOS, ANTIGOS);
ok(!local.cliente && local.novos === '0,0,0', '7. modo local: nenhuma aplicacao antiga e oferecida as ferramentas novas (' + local.novos + ')');
ok(local.antigos === '2,1,2' && local.abre.every(x => x === false), 'e as antigas continuam so como legado local, com o ID antigo, sem abrir o formulario (' + local.antigos + ')');
await nav.close();

titulo('8. NENHUMA CONVERSAO ID ANTIGO -> ID NOVO');
ok(JSON.stringify(registros()) === antesNav && registros().every(x => NOVOS.includes(x.ferramenta_id) && !Object.keys(x.respostas).some(k => /^(gatilho[123]|resposta[123]|escolha[123]|sustentam|drenam|sozinho|barreira|comecar)$/.test(k))),
  'nenhum registro *_v1 com chave do schema antigo; nenhum registro com ID antigo no servidor');
const fontes = readdirSync(new URL('.', RAIZ)).filter(f => f.endsWith('.js'));
const comV1 = fontes.filter(f => /(mapa_rotina|gatilhos_respostas|conexao_pertencimento)_v1/.test(readFileSync(new URL(f, RAIZ), 'utf8'))).sort();
/* 09/10: proximos-passos.js e o catalogo oficial de recomendacao (sistema -> uma das 10 ferramentas ativas): cita os IDs novos de proposito.
   10/10: ferramentas-fechamento.js (resultado estruturado de cada ferramenta, item 180) tambem le pelos IDs novos. */
ok(JSON.stringify(comV1) === JSON.stringify(['ferramentas-fechamento.js', 'ferramentas.js', 'migracao-supa.js', 'proximos-passos.js']), 'os IDs novos so aparecem no catalogo, na lista de sincronizacao, no motor de Proximos Passos e no fechamento das ferramentas: ' + comV1.join(', '));
const conversao = fontes.filter(f => /["']?(mapa_rotina|gatilhos_respostas|conexao_pertencimento)["']?\s*[:=]\s*["'](mapa_rotina|gatilhos_respostas|conexao_pertencimento)_v1|replace\([^)]*_v1|\+\s*["']_v1["']/.test(readFileSync(new URL(f, RAIZ), 'utf8')));
ok(conversao.length === 0, 'nenhum mapa/replace/concatenacao que transforme ID antigo em ID novo' + (conversao.length ? ': ' + conversao.join(', ') : ''));

console.log(falhou ? '\n  RESULTADO: FALHOU' : '\n  RESULTADO: ok');
process.exit(falhou ? 1 : 0);
