/**
 * HOLOS AI -> RESULTADO HOLOS AUTOMATICO (simplificacao definitiva 14/10; migrations 20261023100000 + 20261024100000).
 * Servidor falso com as regras das migrations (provadas no Postgres local: holos-ai-ponte-harness.sql e
 * holos-ai-automatico-harness.sql) + tela. Paciente FICTICIA (fixture do template 5: Mapeamento, HOLOSCAN, ferramentas,
 * Conduta) e o JSON canonico ficticio docs/v1/holos-ai-gpt/exemplo-resultado.json.
 * "Fiz a consulta, mandei os dados para a HOLOS AI, trouxe a resposta e o Resultado ficou pronto."
 * TESTE VERTICAL (contando cliques):
 *   V01 aba HOLOS AI antes do Resultado HOLOS; 3 passos; nenhuma revisao item a item na tela
 *   V02 Copiar Pacote HOLOS AI: so dados reais, sem nome/telefone, sem exames
 *   V03 colar + "Importar e gerar resultado" (1 clique): valida, guarda o original (sha256), versiona, aceita pela regra fixa
 *       e monta o Resultado HOLOS FINALIZADO; "Ver resultado", "Gerar PDF", "Editar resultado"
 *   V04 regra fixa: so profissional interno; para a paciente o elegivel (foco, direcionamentos, estrategias, C/M/E, observar,
 *       proxima etapa, o relato do Mapeamento); sem hipotese, alerta, fonte, sintese, IDs, catalogo
 *   V05 Ver resultado: visao da paciente com as secoes do metodo e o mapa HOLOSCAN no fim
 *   V06 Gerar PDF (1 clique): emite o Resultado Final (RF-3) e baixa o PDF; nº de paginas
 *   V07 Editar resultado (opcional): abre a nova versao no editor
 *   V08 RETORNO: o Pacote traz o resultado anterior; a decisao da IA (AJUSTAR) vira o estado da estrategia; novo Resultado
 *   V09 recarregar: Resultado pronto continua; detalhes tecnicos fechados; celular sem rolagem lateral
 * NEGATIVOS: N01 JSON invalido · N02 schema 2 · N03 estrutura invalida · N09 obrigatorias/territorio (nada salvo, texto preservado)
 *   N04 nova importacao = nova versao + novo Resultado (o anterior fica no historico) · N06 so profissional nunca para a paciente
 *   N07 nao interferencia (HOLOSCAN, ferramentas, pacotes, Mapeamento, Conduta) · N08 outra conta nao le nem aceita
 *   N10 sem HOLOSCAN salvo: importacao guardada e aceita, Resultado nao gerado com aviso claro e "Gerar resultado" (1 clique)
 * SHOT_DIR=<pasta> grava capturas. PDF_OUT=<arquivo> grava o PDF da paciente.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
const agora = new Date().toISOString();
[UA, UB].forEach((id, i) => srv.tabelas.profiles.push({ id, nome: 'Nutri Ficticia ' + (i + 1), registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora }));
const fx = await montarFixture(srv, UA);
const { PA, E1, H } = fx;
fx.retorno();                       // 2o atendimento (retorno, hoje), sem HOLOSCAN proprio
const E2 = fx.E2;
const EXEMPLO = readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8');
const RESPOSTA_GPT = 'Segue a análise.\n\n=== HOLOS_AI_RESULT ===\nTIPO: primeira_consulta\n(...)\n=== FIM_HOLOS_AI_RESULT ===\n\n```json\n' + EXEMPLO + '\n```\n\nTudo acima é SUGERIDO.';
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications',
  'holos_next_steps', 'methodology_packages', 'conducts', 'agreements', 'anamneses'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();
const imps = () => srv.linhas('holos_ai_imports');
const itens = (iid) => srv.linhas('holos_ai_import_items').filter(x => !iid || x.import_id === iid);
const finais = (eid) => srv.linhas('holos_results').filter(r => r.status !== 'rascunho' && r.encounter_id === eid);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
const H2P_LOCAL = '/tmp/claude-0/-home-user-HoloHacking/2536f0de-9516-5291-b095-34b766c5940f/scratchpad/h2p/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js';
async function sessao(email, senha) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: 1280, height: 1000 });
  await P.emulateTimezone('America/Sao_Paulo');
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', email); await P.type('#login-senha', senha); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
  await preparar(P);
  return P;
}
async function preparar(P) {
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  /* gerador de PDF: o da CDN; offline, a copia local (a mesma versao) */
  if (existsSync(H2P_LOCAL)) await P.addScriptTag({ path: H2P_LOCAL }).catch(() => null);
  await P.evaluate(() => {
    window.__toasts = []; const av = window.avisar; window.avisar = (m) => { window.__toasts.push(m); if (av) av(m); };
    window.__copiado = null; window.__baixados = [];
    try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); } catch (e) { /* sem clipboard */ }
    /* conta os cliques de verdade da nutricionista (botoes e links) */
    window.__cliques = 0; document.addEventListener('click', (ev) => { if (ev.isTrusted && ev.target.closest('button, a, summary')) window.__cliques++; }, true);
    const cria = URL.createObjectURL; URL.createObjectURL = (b) => { window.__baixados.push(b); return cria.call(URL, b); };
  });
}
const P = await sessao('a@holo.test', 'senha-a-123');
const clicar = (s) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, s);
const clicarDeVerdade = async (s) => { const b = await P.$(s); if (!b) return false; await b.click(); return true; };
const texto = (s) => P.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, s);
const shot = async (nome, sel) => { if (!SHOT) return; const e = await P.$(sel); if (e) await e.screenshot({ path: SHOT + '/' + nome + '.png' }); };
async function abrirAba(aba, eid) {
  await P.evaluate(async (pid, eid, aba) => { window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) { /* sem atendimento */ }
    window.levarParaFicha('aba:' + aba, pid); }, PA, eid || E1, aba);
  await espera(900);
}
async function escolherAtendimento(eid) {
  await P.evaluate((eid) => { const s = document.getElementById('hai-atendimento'); s.value = eid; s.dispatchEvent(new Event('change', { bubbles: true })); }, eid); await espera(400);
}
async function colar(t) { await P.evaluate((t) => { const a = document.getElementById('hai-json'); a.value = t; a.dispatchEvent(new Event('input', { bubbles: true })); }, t); }
async function colarEImportar(t, real) {
  await colar(t);
  if (real) await clicarDeVerdade('[data-hai-acao="importar"]'); else await clicar('[data-hai-acao="importar"]');
  await espera(1600);
}
const cliques = () => P.evaluate(() => window.__cliques);
const zerarCliques = () => P.evaluate(() => { window.__cliques = 0; });
const t0 = Date.now();

/* ===================== V01 aba e passos ===================== */
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.querySelector('.hai-passos'), { timeout: 15000 });
const abas = await P.evaluate(() => [...document.querySelectorAll('.abas [data-aba], [role="tablist"] [data-aba]')].map(b => b.dataset.aba));
ok(abas.indexOf('holos-ai') >= 0 && abas.indexOf('holos-ai') === abas.indexOf('resultado-holos') - 1, 'V01 aba HOLOS AI logo antes do Resultado HOLOS (' + abas.join(' > ') + ')');
const passos = await P.evaluate(() => [...document.querySelectorAll('.hai-passo h4')].map(h => h.textContent.trim()));
ok(JSON.stringify(passos) === JSON.stringify(['Copiar Pacote Holusiá', 'Abrir Holusiá', 'Colar resultado da Holusiá']), 'V01 3 passos: ' + passos.join(' · '));
const telaV1 = await P.evaluate(() => {
  const r = document.querySelector('.hai-ponte'), fora = (el) => !el.closest('details:not([open])');
  return { botoes: [...r.querySelectorAll('button, a.btn-fantasma, .hai-indisp')].filter(fora).map(b => b.textContent.trim()),
    revisao: !!r.querySelector('[data-hai-acao="confirmar"], [data-hai-acao="descartar"], [data-hai-acao="concluir"], [data-hai-acao="confirmar-secao"], [data-hai-acao="compartilhar"], #hai-revisao'),
    detalhes: !!r.querySelector('details#hai-detalhes:not([open])'), legado: !!document.querySelector('details#ai-hub-legado:not([open])') };
});
ok(telaV1.botoes.length === 3 && /Copiar Pacote Holusiá/.test(telaV1.botoes[0]) && /Abrir Holusiá/.test(telaV1.botoes[1]) && /Importar e gerar resultado/.test(telaV1.botoes[2]),
  'V01 à vista só 3 ações: ' + telaV1.botoes.map(b => b.replace(/\s+/g, ' ')).join(' | '));
ok(!telaV1.revisao && telaV1.detalhes && telaV1.legado, 'V01 sem Revisar/Confirmar/Descartar/Compartilhar/Concluir; "Detalhes técnicos da análise" e o contexto antigo recolhidos');
await shot('hai-1-passos', '.hai-ponte');

/* ===================== V02 Pacote ===================== */
await zerarCliques();
await clicarDeVerdade('[data-hai-acao="copiar-pacote"]'); await espera(500);
const pacTxt = await P.evaluate(() => window.__copiado);
let pac = null; try { pac = JSON.parse(pacTxt); } catch (e) { pac = null; }
ok(!!pac && pac.pacote === 'HOLOS_AI_PACOTE' && pac.pacote_version === 1 && pac.atendimento.tipo === 'primeira_consulta' && pac.resultado_anterior === 'Sem dado',
  'V02 "Copiar Pacote Holusiá" copia um JSON (pacote_version 1, primeira consulta, sem resultado anterior)');
ok(!!pac && !/Marina|62900000000/.test(pacTxt) && pac.paciente_contexto_minimo.identificador === 'M.F.', 'V02 pacote sem nome e sem telefone (identificador por iniciais)');
ok(!!pac && /Cansaço no fim da tarde/.test(pac.mapeamento) && /Sistemas/.test(pac.holoscan) && /Rotina/.test(pac.ferramentas_aplicadas) && /Organizar o fim da tarde/.test(pac.conduta)
  && !/laborat|hemograma|glicemia/i.test(pacTxt), 'V02 pacote com Mapeamento, HOLOSCAN, ferramentas e Conduta reais; sem exames');

/* ===================== N01..N03, N09 importacao invalida ===================== */
await colarEImportar('{"schema_version": 1, "tipo": ');
const n1 = { erro: await texto('.hai-erro'), cola: await P.evaluate(() => document.getElementById('hai-json').value) };
ok(/Não importado/.test(n1.erro) && /JSON inválido/.test(n1.erro) && n1.cola === '{"schema_version": 1, "tipo": ' && imps().length === 0 && finais(E1).length === 0,
  'N01 JSON inválido: erro claro, nada salvo (nem Resultado), texto colado preservado');
await shot('hai-n1-json-invalido', '.hai-ponte');
await colarEImportar(EXEMPLO.replace('"schema_version": 1', '"schema_version": 2'));
ok(/schema_version 2 não é compatível/.test(await texto('.hai-erro')) && imps().length === 0, 'N02 schema_version incompatível: recusado, nada salvo');
const ruim = JSON.parse(EXEMPLO); ruim.estrategias[0].decisao_sugerida = 'MANTER';
await colarEImportar(JSON.stringify(ruim));
ok(/MANTER EM OBSERVAÇÃO/.test(await texto('.hai-erro')) && imps().length === 0 && itens().length === 0, 'N03 estrutura inválida (MANTER na 1ª consulta): recusada, nada salvo');
const srvRuim = srv.tratar({ op: 'rpc', uid: UA, nome: 'importar_holos_ai', args: { p_encounter_id: E1, p_texto: JSON.stringify(ruim) } });
const srvSch = srv.tratar({ op: 'rpc', uid: UA, nome: 'importar_holos_ai', args: { p_encounter_id: E1, p_texto: EXEMPLO.replace('"schema_version": 1', '"schema_version": 2') } });
const srvJs = srv.tratar({ op: 'rpc', uid: UA, nome: 'importar_holos_ai', args: { p_encounter_id: E1, p_texto: '{oops' } });
ok(srvRuim.error && srvRuim.error.hint === 'resultado_invalido' && srvSch.error.hint === 'schema_incompativel' && srvJs.error.hint === 'json_invalido' && imps().length === 0,
  'N01–N03 servidor: json_invalido / schema_incompativel / resultado_invalido sem gravar nada');
const semPlano = JSON.parse(EXEMPLO); delete semPlano.plano_acompanhamento;
await colarEImportar(JSON.stringify(semPlano));
const errPlano = await texto('.hai-erro');
const menteEst = JSON.parse(EXEMPLO); menteEst.mente.estrategias = ['E2'];
await colarEImportar(JSON.stringify(menteEst));
const errMente = await texto('.hai-erro');
ok(/falta a chave "plano_acompanhamento"/.test(errPlano) && /mente está "nao_aprofundado"/.test(errMente) && imps().length === 0 && itens().length === 0,
  'N09 sem plano_acompanhamento e estratégia em Mente "nao_aprofundado": recusados, nada salvo');

/* ===================== V03 importar e gerar (1 clique) ===================== */
await zerarCliques();
const tImp = Date.now();
await colarEImportar(RESPOSTA_GPT, true);
await P.waitForFunction(() => !!document.querySelector('#hai-pronto [data-hai-acao="pdf"]'), { timeout: 15000 }).catch(() => null);
const msImport = Date.now() - tImp;
const cliquesImport = await cliques();
const i1 = imps()[0];
ok(!!i1 && i1.versao === 1 && i1.status === 'confirmado' && i1.aceite === 'automatico' && i1.texto_original === RESPOSTA_GPT && i1.encounter_id === E1
  && i1.texto_sha256 === createHash('sha256').update(RESPOSTA_GPT, 'utf8').digest('hex'), 'V03 importado e aceito pela regra fixa: versão 1, original guardado (sha256), aceite automático');
ok(itens(i1.id).length === 62 && itens(i1.id).every(x => x.estado === 'confirmado' && x.valor_profissional === null), 'V03 62 itens confirmados de uma vez, valor da IA intacto (nenhuma edição)');
const r1 = finais(E1).pop();
ok(!!r1 && r1.status === 'salvo' && r1.template_version === 5 && r1.content_snapshot.direcao_paciente.foco_atual && r1.selected_sources.holoscan_application_id === H,
  'V03 Resultado HOLOS FINALIZADO montado sozinho (template 5, foco confirmado, HOLOSCAN do atendimento)');
const pronto = await P.evaluate(() => { const s = document.getElementById('hai-pronto'); return s ? { txt: s.innerText, bot: [...s.querySelectorAll('button')].map(b => b.textContent.trim()) } : null; });
ok(!!pronto && /ANÁLISE IMPORTADA/.test(pronto.txt) && /Resultado HOLOS pronto/.test(pronto.txt) && JSON.stringify(pronto.bot) === JSON.stringify(['Ver resultado', 'Gerar PDF', 'Editar resultado']) && cliquesImport === 1,
  'V03 tela: "✓ Análise importada · Resultado HOLOS pronto" com Ver resultado · Gerar PDF · Editar resultado — 1 clique (' + msImport + ' ms)');
await shot('hai-3-pronto', '.hai-ponte');

/* ===================== V04 regra fixa ===================== */
const it = (sec, chave) => itens(i1.id).find(x => x.secao === sec && x.chave === chave);
const soProf = itens(i1.id).filter(x => x.so_profissional);
ok(soProf.length > 20 && soProf.every(x => !x.compartilhar) && it('direcionamentos', 'D1').compartilhar && it('estrategias', 'E1').compartilhar,
  'V04 regra fixa: ' + soProf.length + ' itens só profissionais internos; direcionamento e estratégias elegíveis marcados para a paciente');
const dp = r1.content_snapshot.direcao_paciente, dpTxt = JSON.stringify(dp);
ok(dp.foco_atual.texto === 'Organizar o fim da tarde' && dp.direcionamentos.some(d => d.texto === 'Organizar o fim da tarde') && dp.estrategias.length >= 1
  && dp.observar.length >= 1 && dp.proxima_etapa && dp.corpo.itens.length >= 1 && (dp.momento || []).some(m => /Cansaço no fim da tarde/.test(m.texto)),
  'V04 para a paciente: momento (Mapeamento), foco, direcionamentos, estratégias, Corpo, o que observar e próxima etapa');
ok(!/reuniões da tarde podem dificultar|nota maior = menos marcadores|Síntese HOLOS AI|REC-MET|REC-FUN|sha256|not_catalogued|hipótese|candid|"ref"/i.test(dpTxt),
  'V04/N06 para a paciente: sem hipótese, alerta, síntese/raciocínio, fontes, regras do catálogo, IDs/referências');
ok(/^Síntese HOLOS AI \(importação v1, aceite automático\)/.test(r1.leitura_profissional || '') && /Organizar o fim da tarde/.test(JSON.stringify(r1.direcao)),
  'V04 síntese integrada só na leitura profissional; registro completo (com o interno) guardado no Resultado');

/* ===================== V05 ver resultado ===================== */
await zerarCliques();
await clicarDeVerdade('[data-hai-acao="ver-resultado"]');
await P.waitForFunction(() => !!document.querySelector('#aba-resultado-holos #rh-doc'), { timeout: 15000 }); await espera(400);
const ver = await P.evaluate(() => ({ aba: (document.querySelector('[data-aba].ativa') || { dataset: {} }).dataset.aba, txt: document.getElementById('rh-doc').innerText,
  h: [...document.querySelectorAll('#rh-doc h3, #rh-doc h4')].map(h => h.textContent.trim()) }));
const secoesPac = ['Seu momento agora', 'O que estamos compreendendo', 'Foco atual', 'Direcionamentos', 'Estratégias', 'Corpo', 'Até o próximo encontro, observe', 'Próxima etapa', 'Detalhes do mapa'];
const faltam = secoesPac.filter(s => !ver.h.some(h => h.indexOf(s) === 0) && ver.txt.indexOf(s) < 0);
ok(ver.aba === 'resultado-holos' && !faltam.length && (await cliques()) === 1, 'V05 "Ver resultado" (1 clique): visão da paciente com as seções do método' + (faltam.length ? ' — faltam: ' + faltam.join(', ') : ''));
ok(!/SUGESTÃO|HOLOS AI|hipótese|not_catalogued|REC-/.test(ver.txt), 'V05 visão da paciente sem marca de sugestão, sem HOLOS AI, sem hipótese, sem catálogo');
await shot('hai-5-resultado-paciente', '#rh-doc');
const lista = await P.evaluate(() => { document.querySelector('[data-rh-acao="voltar"]').click(); return new Promise(r => setTimeout(() => r({ prim: (document.querySelector('.rh-acoes-topo .btn-verde') || {}).textContent, manual: !!document.querySelector('details.rh-manual:not([open]) [data-rh-acao="novo"]') }), 300)); });
ok(/Gerar pela HOLOS AI/.test(lista.prim || '') && lista.manual, 'V05 Resultado HOLOS: ação principal "Gerar pela HOLOS AI"; montagem manual recolhida em "avançado"');

/* ===================== V06 gerar PDF ===================== */
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.querySelector('#hai-pronto [data-hai-acao="pdf"]'), { timeout: 15000 });
await zerarCliques();
const temLib = await P.evaluate(() => typeof window.html2pdf === 'function');
await clicarDeVerdade('[data-hai-acao="pdf"]');
await P.waitForFunction(() => (window.__toasts || []).some(t => /PDF gerado|Não foi possível gerar o PDF/.test(t)), { timeout: 30000 }).catch(() => null);
const em = srv.linhas('holos_result_emissions').filter(e => e.holos_result_id === r1.id).pop();
const pdfInfo = await P.evaluate(async () => {
  const b = (window.__baixados || []).filter(x => x && x.type === 'application/pdf').pop();
  if (!b) return { toasts: window.__toasts.slice(-3) };
  const t = await b.text();
  const u8 = new Uint8Array(await b.arrayBuffer()); let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768));
  return { tam: b.size, paginas: (t.match(/\/Type\s*\/Page[^s]/g) || []).length, b64: btoa(s), sec: document.querySelector('.nav-item.ativo, .nav-item[aria-current="page"]') ? 1 : 0 };
});
ok(!!em && em.template_version === 'RF-3' && /Organizar o fim da tarde/.test(JSON.stringify(em.content_snapshot)) && (await cliques()) === 1,
  'V06 "Gerar PDF" (1 clique): Resultado Final emitido (RF-3, congelado) a partir do Resultado pronto');
ok(!temLib || (pdfInfo.tam > 20000 && pdfInfo.paginas >= 2 && pdfInfo.paginas <= 4),
  'V06 PDF da paciente baixado' + (temLib ? ': ' + pdfInfo.paginas + ' páginas, ' + pdfInfo.tam + ' bytes (meta 2–4)' : ' (gerador indisponível offline)') + (pdfInfo.toasts ? ' ' + JSON.stringify(pdfInfo.toasts) : ''));
if (process.env.PDF_OUT && pdfInfo.b64) writeFileSync(process.env.PDF_OUT, Buffer.from(pdfInfo.b64, 'base64'));
const docPac = await texto('#rp-doc');
ok(!/reuniões da tarde podem dificultar|nota maior = menos marcadores|SUGESTÃO|HOLOS AI|not_catalogued|hipótese/.test(docPac) && /Organizar o fim da tarde/.test(docPac),
  'N06 documento oficial (base do PDF): sem só profissional, sem marca de sugestão');
await shot('hai-6-documento', '#rp-doc');
const msg = await P.evaluate(() => window.ResultadoPagina.mensagemWhatsAppEmissao({ nome: 'Marina Ficticia' }, window.ResultadoPagina.emissaoAtual()));
ok(/Nesta fase, nosso principal direcionamento é: Organizar o fim da tarde\./.test(msg || '') && !/hipótese|HOLOS AI/.test(msg), 'V06 WhatsApp da emissão com o foco');

/* ===================== V07 editar (opcional) ===================== */
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.querySelector('[data-hai-acao="editar-resultado"]'), { timeout: 15000 });
await clicar('[data-hai-acao="editar-resultado"]');
await P.waitForFunction(() => !!document.getElementById('rd-editor'), { timeout: 15000 });
const ed = await P.evaluate(() => ({ aviso: (document.querySelector('#rh-form .rh-aviso') || {}).textContent || '', foco: (document.querySelector('[data-rd-bloco="foco_atual"] textarea') || {}).value || '' }));
ok(/Nova versão a partir do resultado nº 1/.test(ed.aviso) && /Organizar o fim da tarde/.test(ed.foco), 'V07 "Editar resultado" abre a nova versão no editor (a versão pronta continua no histórico)');
await clicar('[data-rh-acao="cancelar"]'); await espera(300);

/* ===================== N04 nova importacao no mesmo atendimento ===================== */
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.getElementById('hai-json'), { timeout: 15000 });
const v2json = JSON.parse(EXEMPLO); v2json.direcionamentos[0].titulo = 'Organizar o fim da tarde com calma';
await colarEImportar(JSON.stringify(v2json, null, 2));
await P.waitForFunction(() => /v2/.test((document.getElementById('hai-pronto') || {}).innerText || ''), { timeout: 15000 }).catch(() => null);
const i2 = imps().find(x => x.versao === 2), r2 = finais(E1).find(r => r.id !== r1.id);
const r1agora = srv.linhas('holos_results').find(r => r.id === r1.id);
ok(!!i2 && i2.status === 'confirmado' && imps().find(x => x.id === i1.id).texto_original === RESPOSTA_GPT && !!r2 && r2.supersedes_id === r1.id && !!r1agora.superseded_at
  && r1agora.content_hash === r1.content_hash && r2.content_snapshot.direcao_paciente.foco_atual.texto === 'Organizar o fim da tarde com calma',
  'N04 nova importação = versão 2 + Resultado nº 2 (substitui o nº 1, que fica no histórico idêntico); importação v1 intacta');

/* ===================== N06 / N08 servidor ===================== */
const hip = itens(i1.id).find(x => x.secao === 'pontos_para_aprofundar' && x.valor_ia.tipo === 'hipotese');
const tentaHip = srv.tratar({ op: 'rpc', uid: UA, nome: 'salvar_rascunho_resultado_holos', args: { payload: { patient_id: PA, encounter_id: E1, holoscan_application_id: H, tool_application_ids: [],
  visao_paciente: { ferramentas: {}, proximos_passos: false }, direcao: { schema_version: 1, tipo: 'primeira', padroes: [{ texto: 'HIPOTESE', origem: 'holos_ai', tipo: 'hipotese',
    ref: { tipo: 'holos_ai', id: i1.id, campo: hip.id }, sugestao: true, confirmado: true, mostrar_paciente: true }] } } } });
ok(tentaHip.error && tentaHip.error.hint === 'holos_ai_so_profissional', 'N06 servidor: hipótese da HOLOS AI marcada para a paciente é recusada mesmo com aceite automático');
const outra = srv.tratar({ op: 'query', uid: UB, q: { tabela: 'holos_ai_imports', acao: 'select', filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } });
const outraAc = srv.tratar({ op: 'rpc', uid: UB, nome: 'aceitar_importacao_holos_ai', args: { p_import_id: i1.id } });
const outraImp = srv.tratar({ op: 'rpc', uid: UB, nome: 'importar_holos_ai', args: { p_encounter_id: E1, p_texto: EXEMPLO } });
const direto = srv.tratar({ op: 'query', uid: UA, q: { tabela: 'holos_ai_imports', acao: 'update', dados: { aceite: 'revisao' }, filtros: [{ col: 'id', op: 'eq', val: i1.id }], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } });
const deNovo = srv.tratar({ op: 'rpc', uid: UA, nome: 'aceitar_importacao_holos_ai', args: { p_import_id: i1.id } });
ok((outra.data || []).length === 0 && outraAc.error.hint === 'referencia_cruzada' && outraImp.error.hint === 'atendimento_obrigatorio' && direto.error && direto.error.code === '42501'
  && deNovo.data && deNovo.data.repetida === true, 'N08 outra conta não lê, não aceita nem importa; a dona não grava direto; aceitar de novo não muda nada');

/* ===================== V08 RETORNO ===================== */
await escolherAtendimento(E2);
await P.evaluate(() => { window.__copiado = null; document.querySelector('[data-hai-acao="copiar-pacote"]').click(); }); await espera(500);
const pacR = JSON.parse(await P.evaluate(() => window.__copiado) || 'null');
ok(!!pacR && pacR.atendimento.tipo === 'retorno' && pacR.resultado_anterior && pacR.resultado_anterior.foco_atual === 'Organizar o fim da tarde com calma'
  && pacR.resultado_anterior.estrategias.length >= 1 && pacR.resultado_anterior.o_que_observar.length >= 1 && !!pacR.resultado_anterior.proxima_etapa,
  'V08 retorno: o Pacote traz o resultado anterior (foco, estratégias, o que observar, próxima etapa) para a HOLOS AI comparar');
const ret = JSON.parse(EXEMPLO); ret.tipo = 'retorno'; ret.estrategias[0].decisao_sugerida = 'AJUSTAR'; ret.estrategias[0].motivo_decisao = 'Aplicou em 3 de 5 dias.';
await colarEImportar(JSON.stringify(ret, null, 2));
await P.waitForFunction(() => !!document.querySelector('#hai-pronto [data-hai-acao="pdf"]'), { timeout: 15000 }).catch(() => null);
const rR = finais(E2).pop();
const eR = rR && rR.content_snapshot.direcao_paciente.estrategias.find(x => /^Lanche planejado/.test(x.texto));
ok(!!rR && rR.content_snapshot.direcao_paciente.tipo === 'retorno' && !!eR && eR.status === 'ajustar' && rR.selected_sources.holoscan_application_id === H,
  'V08 retorno importado → Resultado pronto (tipo retorno); a decisão da IA (AJUSTAR) vira o estado da estratégia; HOLOSCAN mais recente');

/* ===================== N10 sem HOLOSCAN salvo ===================== */
const semH = await (async () => {
  const s2 = criarServidor(); const U = s2.criarConta('c@holo.test', 'senha-c-123');
  s2.tabelas.profiles.push({ id: U, nome: 'Nutri C', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: agora, updated_at: agora });
  const q = (tabela, acao, extra) => s2.tratar({ op: 'query', uid: U, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
  const p = q('patients', 'insert', { dados: { nome: 'Paciente Sem Mapa Ficticia' } }).data[0].id;
  const e = q('encounters', 'insert', { dados: { patient_id: p, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' } }).data[0].id;
  const P2 = await (await nav.createBrowserContext()).newPage();
  await P2.setViewport({ width: 1280, height: 1000 }); P2.on('pageerror', x => errosJS.push(x.message));
  await ligarPagina(P2, s2);
  await P2.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P2.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P2.waitForSelector('#login-email', { visible: true });
  await P2.type('#login-email', 'c@holo.test'); await P2.type('#login-senha', 'senha-c-123'); await P2.click('#btn-entrar');
  await P2.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P2.evaluate(async (p, e) => { window.definirPacienteAtivo(p); try { await window.AtendimentoAtual.selecionarPorId(e); } catch (x) { /* */ } window.levarParaFicha('aba:holos-ai', p); }, p, e);
  await P2.waitForFunction(() => !!document.getElementById('hai-json'), { timeout: 15000 });
  await P2.evaluate((t) => { const a = document.getElementById('hai-json'); a.value = t; a.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('[data-hai-acao="importar"]').click(); }, EXEMPLO);
  await espera(1800);
  const r = await P2.evaluate(() => ({ txt: (document.getElementById('hai-pronto') || {}).innerText || '', gerar: !!document.querySelector('#hai-pronto [data-hai-acao="gerar"]') }));
  await P2.close();
  return { r, imp: s2.linhas('holos_ai_imports')[0], res: s2.linhas('holos_results').length };
})();
ok(semH.imp && semH.imp.status === 'confirmado' && semH.res === 0 && /RESULTADO AINDA NÃO GERADO/.test(semH.r.txt) && /HOLOSCAN/.test(semH.r.txt) && semH.r.gerar,
  'N10 sem HOLOSCAN salvo: análise guardada e aceita, Resultado não gerado com o motivo e "Gerar resultado" (1 clique depois de salvar o HOLOSCAN)');

/* ===================== V10 PAGINA HOLUSIA (rodada UX 14/10) ===================== */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('holusia'); }, PA); await espera(1200);
const pag = await P.evaluate(() => {
  const nav = [...document.querySelectorAll('.nav-item[data-secao]')].map(b => b.dataset.secao);
  const a = document.getElementById('holusia-alvo');
  return { nav, ativa: (document.querySelector('.secao.ativa') || {}).id, cab: document.querySelector('#secao-holusia .secao-cabeca').innerText,
    passos: [...a.querySelectorAll('.hai-passo h4')].map(h => h.textContent.trim()), pronto: (a.querySelector('#hai-pronto') || {}).innerText || '',
    fichaVazia: !(document.getElementById('hai-ponte') || { innerHTML: '' }).innerHTML.trim() };
});
const iE = pag.nav.indexOf('espirito');
ok(pag.nav.slice(iE, iE + 3).join(' > ') === 'espirito > holusia > resultado', 'V10 navegação: Corpo → Mente → Espírito → Holusiá → Resultado (' + pag.nav.join(' > ') + ')');
ok(pag.ativa === 'secao-holusia' && /Holusiá/.test(pag.cab) && /Transforme os dados da consulta em uma leitura integrada/.test(pag.cab) && pag.passos.length === 3
  && /ANÁLISE IMPORTADA/.test(pag.pronto) && pag.fichaVazia, 'V10 página Holusiá: cabeçalho, 3 passos e o Resultado pronto do atendimento (a mesma ponte; a aba da ficha fica vazia enquanto isso)');
await P.evaluate(() => document.querySelector('#holusia-alvo [data-hai-acao="ver-resultado"]').click()); await espera(900);
ok(await P.evaluate(() => (document.querySelector('.secao.ativa') || {}).id === 'secao-resultado'), 'V10 "Ver resultado" na página Holusiá leva à página Resultado (a saída da jornada)');
await P.evaluate(() => window.limparPacienteAtivo()); await espera(400);
await P.evaluate(() => window.irParaSecao('holusia')); await espera(500);
const semPac = await P.evaluate(() => ({ txt: document.getElementById('holusia-alvo').innerText, barra: document.getElementById('barra-paciente-ctx').hidden, pid: window.pacienteAtivoId() }));
ok(semPac.pid === null && /Nenhum paciente selecionado/.test(semPac.txt) && semPac.barra, 'V10 X da barra: paciente desselecionado; Holusiá mostra "Nenhum paciente selecionado" (nada oculto), barra some');
await P.evaluate((pid) => window.definirPacienteAtivo(pid), PA); await espera(300);

/* ===================== V09 recarregar + celular ===================== */
await P.reload({ waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await preparar(P);
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.getElementById('hai-pronto'), { timeout: 15000 });
const reab = await P.evaluate(() => ({ pronto: document.getElementById('hai-pronto').innerText, fechado: !!document.querySelector('details#hai-detalhes:not([open])'),
  hist: [...document.querySelectorAll('#hai-detalhes .hai-tabela tbody tr')].length }));
ok(/ANÁLISE IMPORTADA/.test(reab.pronto) && /v2/.test(reab.pronto) && reab.fechado && reab.hist === 2, 'V09 recarregado: Resultado pronto (análise v2); detalhes técnicos fechados, com as 2 versões');
await P.evaluate(() => { document.getElementById('hai-detalhes').open = true; }); await espera(200);
const det = await texto('#hai-detalhes');
ok(/ACEITE AUTOMÁTICO/.test(det) && /INTERNO/.test(det) && /PACIENTE/.test(det) && !(await P.evaluate(() => !!document.querySelector('#hai-detalhes button[data-hai-acao="confirmar"], #hai-detalhes input'))),
  'V09 "Detalhes técnicos da análise": só leitura, cada item marcado INTERNO ou PACIENTE, aceite automático');
await shot('hai-9-detalhes', '#hai-detalhes');
await P.evaluate(() => { document.getElementById('hai-detalhes').open = false; });
await P.setViewport({ width: 390, height: 900 }); await espera(400);
ok(!(await P.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'celular (390 px): aba HOLOS AI sem rolagem lateral');
await shot('hai-9-celular', '.hai-ponte');
await P.setViewport({ width: 1280, height: 1000 });

/* ===================== N07 ===================== */
ok(digitais() === antes, 'N07 HOLOSCAN (aplicações, respostas, notas), Próximos Passos, ferramentas, pacotes, Mapeamento e Conduta idênticos');
ok(errosJS.length === 0, 'sem erro de JavaScript na página' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));
console.log('\n  MEDIDAS (caso fictício): copiar 1 + abrir 1 + importar e gerar ' + cliquesImport + ' + gerar PDF 1 = ' + (3 + cliquesImport) + ' cliques; importar→resultado ' + msImport + ' ms; PDF '
  + (pdfInfo.paginas || '?') + ' páginas; teste total ' + Math.round((Date.now() - t0) / 1000) + ' s');

await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK: HOLOS AI -> Resultado HOLOS automático');
process.exit(falhou ? 1 : 0);
