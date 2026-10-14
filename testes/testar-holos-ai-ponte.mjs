/**
 * PONTE HOLOS AI -> HOLOHACKING (14/10, migration 20261023100000). Servidor falso com as regras da migration (provada no
 * Postgres local, supabase/tests/holos-ai-ponte-harness.sql) + tela. Paciente FICTICIA (fixture do Resultado template 5:
 * Mapeamento, HOLOSCAN, ferramentas aplicadas, Conduta) e o JSON canonico ficticio docs/v1/holos-ai-gpt/exemplo-resultado.json.
 * TESTE VERTICAL:
 *   V01 aba HOLOS AI antes do Resultado HOLOS; 5 passos
 *   V02 Copiar Pacote HOLOS AI: so dados reais, sem nome/telefone, sem exames, com Mapeamento, HOLOSCAN e ferramentas
 *   V03 importar (resposta inteira do GPT colada) -> versao 1, 62 itens, tudo SUGESTAO HOLOS AI
 *   V04 revisar: editar uma estrategia (IA + editado guardados), confirmar, descartar, compartilhar; so profissional sem "compartilhar"
 *   V05 concluir revisao (bloqueado com pendencia) -> CONFIRMADO
 *   V06 Gerar Resultado HOLOS -> editor com os itens confirmados (origem HOLOS AI); rascunho salvo
 *   V07 confirmar o foco, finalizar (template 5): para a paciente so o confirmado e compartilhado, com o texto EDITADO
 *   V08 emitir (RF-3) -> documento oficial / PDF; WhatsApp "Nesta fase, nosso principal direcionamento é: ..."
 *   V09 reabrir o atendimento (recarregar): historico e revisao persistidos
 * NEGATIVOS:
 *   N01 JSON invalido: erro claro, nada salvo, texto preservado     N02 schema_version incompativel
 *   N03 estrutura invalida (MANTER na 1a consulta)                  N04 nova importacao nao sobrescreve a anterior
 *   N05 descartado nao aparece no PDF/emissao                        N06 so profissional nunca para a paciente (tela + servidor)
 *   N07 nao interferencia: HOLOSCAN, ferramentas, pacotes intactos   N08 outra conta nao le nem revisa
 *   N09 fechamento 14/10: sem plano_acompanhamento / estrategia em territorio "nao_aprofundado" -> recusado, nada salvo;
 *       Plano B a partir de hipotese, Composicao como estrategia e rascunho "que combinamos" -> AVISO visivel (nao bloqueia)
 * SHOT_DIR=<pasta> grava capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync } from 'node:fs';
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
const EXEMPLO = readFileSync(new URL('../docs/v1/holos-ai-gpt/exemplo-resultado.json', import.meta.url), 'utf8');
const RESPOSTA_GPT = 'Segue a análise.\n\n=== HOLOS_AI_RESULT ===\nTIPO: primeira_consulta\n(...)\n=== FIM_HOLOS_AI_RESULT ===\n\n```json\n' + EXEMPLO + '\n```\n\nTudo acima é SUGERIDO.';
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications',
  'holos_next_steps', 'methodology_packages', 'conducts', 'agreements', 'anamneses'].map(t => srv.linhas(t)))).digest('hex');
const antes = digitais();
const imps = () => srv.linhas('holos_ai_imports');
const itens = (iid) => srv.linhas('holos_ai_import_items').filter(x => !iid || x.import_id === iid);

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
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
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  await P.evaluate(() => {
    window.__toasts = []; const av = window.avisar; window.avisar = (m) => { window.__toasts.push(m); if (av) av(m); };
    window.__copiado = null;
    try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { window.__copiado = t; return Promise.resolve(); } } }); } catch (e) { /* sem clipboard */ }
  });
  return P;
}
const P = await sessao('a@holo.test', 'senha-a-123');
const clicar = (s) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, s);
const texto = (s) => P.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, s);
const confirmarModal = async () => { await espera(300); await clicar('#modal-confirmar-ok'); await espera(900); };
const shot = async (nome, sel) => { if (!SHOT) return; const e = await P.$(sel); if (e) await e.screenshot({ path: SHOT + '/' + nome + '.png' }); };
async function abrirAba(aba) {
  await P.evaluate(async (pid, eid, aba) => { window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) { /* sem atendimento */ }
    window.levarParaFicha('aba:' + aba, pid); }, PA, E1, aba);
  await espera(900);
}
async function colarEImportar(t) {
  await P.evaluate((t) => { const a = document.getElementById('hai-json'); a.value = t; a.dispatchEvent(new Event('input', { bubbles: true })); }, t);
  await clicar('[data-hai-acao="importar"]'); await espera(900);
}
const noItem = (sec, re, acao) => P.evaluate((sec, re, acao) => {
  const li = [...document.querySelectorAll('[data-hai-secao="' + sec + '"] .hai-item')].find(l => new RegExp(re).test(l.querySelector('.hai-item-texto') ? l.querySelector('.hai-item-texto').textContent : l.textContent));
  if (!li) return false; const b = li.querySelector('[data-hai-acao="' + acao + '"]'); if (!b) return false; b.click(); return true; }, sec, re, acao);
const doItem = (sec, re) => P.evaluate((sec, re) => {
  const li = [...document.querySelectorAll('[data-hai-secao="' + sec + '"] .hai-item')].find(l => new RegExp(re).test(l.textContent));
  return li ? { texto: li.innerText, compartilhar: !!li.querySelector('input[data-hai-acao="compartilhar"]'), marcado: !!(li.querySelector('input[data-hai-acao="compartilhar"]') || {}).checked } : null; }, sec, re);

/* ===================== V01 aba e passos ===================== */
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.querySelector('.hai-passos'), { timeout: 15000 });
const abas = await P.evaluate(() => [...document.querySelectorAll('.abas [data-aba], [role="tablist"] [data-aba]')].map(b => b.dataset.aba));
ok(abas.indexOf('holos-ai') >= 0 && abas.indexOf('holos-ai') === abas.indexOf('resultado-holos') - 1, 'V01 aba HOLOS AI logo antes do Resultado HOLOS (' + abas.join(' > ') + ')');
const passos = await P.evaluate(() => [...document.querySelectorAll('.hai-passo h4')].map(h => h.textContent.trim()));
ok(JSON.stringify(passos) === JSON.stringify(['Copiar Pacote HOLOS AI', 'Abrir HOLOS AI', 'Importar Resultado HOLOS AI', 'Revisar análise', 'Gerar Resultado HOLOS']),
  'V01 os 5 passos: ' + passos.join(' · '));
ok(await P.evaluate(() => document.querySelector('[data-hai-acao="gerar"]').disabled) && /Cole aqui o JSON HOLOS_AI_RESULT/.test(await texto('.hai-colar')),
  'V01 "Gerar Resultado HOLOS" desabilitado antes de uma revisão concluída; campo "Cole aqui o JSON HOLOS_AI_RESULT"');
await shot('hai-1-passos', '.hai-ponte');

/* ===================== V02 Pacote ===================== */
await clicar('[data-hai-acao="copiar-pacote"]'); await espera(500);
const pacTxt = await P.evaluate(() => window.__copiado);
let pac = null; try { pac = JSON.parse(pacTxt); } catch (e) { pac = null; }
ok(!!pac && pac.pacote === 'HOLOS_AI_PACOTE' && pac.pacote_version === 1 && pac.atendimento.tipo === 'primeira_consulta', 'V02 "Copiar Pacote HOLOS AI" copia um JSON (pacote_version 1, primeira consulta)');
ok(!!pac && !/Marina|62900000000/.test(pacTxt) && pac.paciente_contexto_minimo.identificador === 'M.F.', 'V02 pacote sem nome e sem telefone (identificador por iniciais)');
ok(!!pac && /Cansaço no fim da tarde/.test(pac.mapeamento) && /Belisco quando chego em casa/.test(pac.mapeamento) && /Sistemas/.test(pac.holoscan) && /Mapa da Rotina|Rotina/.test(pac.ferramentas_aplicadas) && /Organizar o fim da tarde/.test(pac.conduta),
  'V02 pacote com Mapeamento, HOLOSCAN (sistemas), ferramentas aplicadas e Conduta reais');
ok(!!pac && !/laborat|hemograma|glicemia/i.test(pacTxt) && pac.fora_do_pacote.some(x => /exames/.test(x)), 'V02 exames fora do pacote');

/* ===================== N01..N03 importacao invalida ===================== */
await colarEImportar('{"schema_version": 1, "tipo": ');
const n1 = { erro: await texto('.hai-erro'), cola: await P.evaluate(() => document.getElementById('hai-json').value) };
ok(/Não importado/.test(n1.erro) && /JSON inválido/.test(n1.erro) && n1.cola === '{"schema_version": 1, "tipo": ' && imps().length === 0, 'N01 JSON inválido: erro claro, nada salvo, texto colado preservado');
await shot('hai-n1-json-invalido', '.hai-ponte');
await colarEImportar(EXEMPLO.replace('"schema_version": 1', '"schema_version": 2'));
ok(/schema_version 2 não é compatível/.test(await texto('.hai-erro')) && imps().length === 0, 'N02 schema_version incompatível: recusado, nada salvo');
const ruim = JSON.parse(EXEMPLO); ruim.estrategias[0].decisao_sugerida = 'MANTER';
await colarEImportar(JSON.stringify(ruim));
ok(/MANTER EM OBSERVAÇÃO/.test(await texto('.hai-erro')) && imps().length === 0 && itens().length === 0, 'N03 estrutura inválida (MANTER na 1ª consulta): recusada, nada salvo (nem parcial)');
/* o servidor recusa sozinho (a tela nao e a unica barreira) */
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
const srvMente = srv.tratar({ op: 'rpc', uid: UA, nome: 'importar_holos_ai', args: { p_encounter_id: E1, p_texto: JSON.stringify(menteEst) } });
ok(/falta a chave "plano_acompanhamento"/.test(errPlano) && /mente está "nao_aprofundado"/.test(errMente) && srvMente.error && srvMente.error.hint === 'resultado_invalido'
  && imps().length === 0 && itens().length === 0, 'N09 sem plano_acompanhamento e estratégia em Mente "nao_aprofundado": recusados na tela e no servidor, nada salvo');

/* ===================== V03 importar ===================== */
await colarEImportar(RESPOSTA_GPT);
const i1 = imps()[0];
ok(!!i1 && i1.versao === 1 && i1.status === 'importado' && i1.texto_original === RESPOSTA_GPT && i1.schema_version === 1 && i1.encounter_id === E1 && i1.agente === 'HOLOS-AI-GPT 1.2'
  && i1.texto_sha256 === createHash('sha256').update(RESPOSTA_GPT, 'utf8').digest('hex'), 'V03 importado: versão 1, texto colado e JSON originais guardados (sha256), agente, atendimento');
ok(itens(i1.id).length === 62 && new Set(itens(i1.id).map(x => x.secao)).size === 20 && itens(i1.id).every(x => x.estado === 'sugerido' && !x.compartilhar),
  'V03 62 itens separados em 20 seções (não um textão), todos SUGESTÃO, nenhum compartilhado');
const tela3 = await P.evaluate(() => ({ chips: document.querySelectorAll('.hai-item .hai-chip-sug').length, secoes: document.querySelectorAll('.hai-secao').length, campo: document.getElementById('hai-json').value }));
ok(tela3.chips === 62 && tela3.secoes === 20 && tela3.campo === '', 'V03 tela: revisão aberta com 20 seções e 62 "SUGESTÃO HOLOS AI"; campo de colar limpo');
await shot('hai-3-revisao', '#hai-revisao');

/* ===================== V04 revisar ===================== */
const hip = await doItem('pontos_para_aprofundar', 'reuniões da tarde');
const ale = await doItem('alertas_profissionais', 'nota maior = menos marcadores');
ok(!!hip && !hip.compartilhar && /Só profissional/.test(hip.texto) && !!ale && !ale.compartilhar, 'V04/N06 hipótese e alertas: "Só profissional", sem opção de compartilhar');
await noItem('estrategias', '^Lanche planejado', 'editar'); await espera(300);
await P.evaluate(() => { const li = document.querySelector('.hai-item .hai-editor').closest('.hai-item'); const t = li.querySelector('textarea[data-hai-campo="o_que_fazer"]');
  t.value = 'Preparar o lanche na noite anterior e comer entre 15h30 e 16h, conforme a Conduta.'; li.querySelector('[data-hai-acao="salvar-edicao"]').click(); });
await espera(800);
const e1 = itens(i1.id).find(x => x.secao === 'estrategias' && x.chave === 'E1');
ok(e1.estado === 'editado' && /15h30 e 16h/.test(e1.valor_profissional.o_que_fazer) && e1.valor_ia.o_que_fazer === 'Preparar o lanche na noite anterior e comer por volta das 16h.'
  && imps().find(x => x.id === i1.id).status === 'em_revisao', 'V04 estratégia EDITADA: valor da IA preservado + valor da nutricionista; importação EM REVISÃO');
ok(/Ver o original da HOLOS AI/.test((await doItem('estrategias', '^Lanche planejado|EDITADO')) ? (await doItem('estrategias', 'Lanche planejado')).texto : ''), 'V04 tela mostra o editado e o original da IA');
/* descartar E2 (sugestao nova); confirmar e compartilhar D1 e E1; o que observar "reunioes" confirmado sem compartilhar */
await noItem('estrategias', '^Registro rápido', 'descartar'); await espera(600);
await noItem('o_que_observar', 'reuniões da tarde atrapalham', 'confirmar'); await espera(600);
await noItem('direcionamentos', '^Organizar o fim da tarde', 'confirmar'); await espera(600);
const marcar = (sec, re) => P.evaluate((sec, re) => { const li = [...document.querySelectorAll('[data-hai-secao="' + sec + '"] .hai-item')].find(l => new RegExp(re).test(l.textContent));
  const c = li && li.querySelector('input[data-hai-acao="compartilhar"]'); if (!c) return false; c.click(); return true; }, sec, re);
ok(await marcar('direcionamentos', 'Organizar o fim da tarde'), 'V04 direcionamento confirmado ganha "Compartilhar com a paciente"'); await espera(600);
ok(await marcar('estrategias', 'Lanche planejado'), 'V04 estratégia editada pode ser compartilhada'); await espera(700);
const it = (sec, chave) => itens(i1.id).find(x => x.secao === sec && x.chave === chave);
ok(it('direcionamentos', 'D1').compartilhar && it('estrategias', 'E1').compartilhar && it('estrategias', 'E1').estado === 'editado' && /15h30/.test(it('estrategias', 'E1').valor_profissional.o_que_fazer)
  && it('estrategias', 'E2').estado === 'descartado' && itens(i1.id).find(x => x.secao === 'o_que_observar' && x.ordem === 1).estado === 'confirmado'
  && !itens(i1.id).find(x => x.secao === 'o_que_observar' && x.ordem === 1).compartilhar,
  'V04 banco: D1 e E1 compartilhados (E1 continua editado), E2 descartado, observação das reuniões confirmada só profissional');
const tela4 = await P.evaluate(() => ({ cat: document.getElementById('hai-revisao').innerText, leg: [...document.querySelectorAll('[data-hai-secao="estrategias"] legend, [data-hai-secao="direcionamentos"] legend')].map(l => l.innerText) }));
ok(!/not_catalogued|NÃO CATALOGAD|CANDIDAT[OA] NÃO/.test(tela4.cat) && tela4.leg.length === 2 && tela4.leg.every(t => /SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL/.test(t)),
  'V04 rótulo único "SUGESTÃO HOLOS AI — REQUER REVISÃO PROFISSIONAL" por seção; "not_catalogued" não aparece na tela');
const hipId = itens(i1.id).find(x => x.secao === 'pontos_para_aprofundar' && x.valor_ia.tipo === 'hipotese').id;
const tenta = srv.tratar({ op: 'rpc', uid: UA, nome: 'revisar_item_holos_ai', args: { p_item_id: hipId, p_estado: 'confirmado', p_compartilhar: true } });
ok(tenta.error && tenta.error.hint === 'holos_ai_so_profissional', 'N06 servidor recusa compartilhar hipótese (holos_ai_so_profissional)');
await shot('hai-4-revisando', '#hai-revisao');

/* ===================== V05 concluir ===================== */
ok(await P.evaluate(() => document.querySelector('[data-hai-acao="concluir"]').disabled), 'V05 "Concluir revisão" bloqueado enquanto há sugestão pendente');
const secs = await P.evaluate(() => [...document.querySelectorAll('.hai-secao')].map(s => s.dataset.haiSecao));
for (const s of secs) { await P.evaluate((s) => { const b = document.querySelector('[data-hai-secao="' + s + '"] [data-hai-acao="confirmar-secao"]'); if (b) b.click(); }, s); await espera(450); }
await marcar('corpo', 'Lanche planejado'); await espera(500);
await marcar('proxima_etapa', 'Retorno'); await espera(500);
ok(itens(i1.id).every(x => x.estado !== 'sugerido') && it('estrategias', 'E2').estado === 'descartado', 'V05 "Confirmar todos desta seção" decide o restante sem reverter o descartado');
await clicar('[data-hai-acao="concluir"]'); await confirmarModal();
ok(imps().find(x => x.id === i1.id).status === 'confirmado' && /CONFIRMADO/.test(await texto('.hai-rev-topo')) && !(await P.evaluate(() => !!document.querySelector('.hai-item [data-hai-acao="confirmar"]'))),
  'V05 revisão concluída: CONFIRMADO; itens sem ações de revisão');
const tarde = srv.tratar({ op: 'rpc', uid: UA, nome: 'revisar_item_holos_ai', args: { p_item_id: it('estrategias', 'E2').id, p_estado: 'confirmado' } });
ok(tarde.error && tarde.error.hint === 'holos_ai_revisao_encerrada', 'V05 depois de concluída, nenhum item muda (revisao_encerrada)');

/* ===================== N04 nova importacao (com AVISOS do fechamento) ===================== */
const comAviso = JSON.parse(EXEMPLO);
comAviso.estrategias.push({ id: 'E3', origem: 'nova', titulo: 'Plano B para dias de reunião às 16h', territorio: 'Corpo', direcionamento_id: 'D1', classificacao: 'comportamental_metodologica',
  decisao_sugerida: null, motivo_decisao: null, o_que_fazer: 'Combinar um horário alternativo para os dias de reunião.', o_que_observar: 'Se a reunião impediu o lanche.',
  prazo: 'Até o retorno', criterio_sucesso: 'Aplicar com frequência suficiente para permitir avaliação no retorno.', baseado_em: ['Mapa da Rotina: reuniões à tarde'], catalogo: 'not_catalogued', status: 'SUGERIDO' });
comAviso.corpo.estrategias.push('E3');
comAviso.rascunho_paciente += ' Nos dias de reunião, use o horário alternativo que combinamos.';
const EXEMPLO_AVISO = JSON.stringify(comAviso, null, 2);
await colarEImportar(EXEMPLO_AVISO);
const avisoTela = await texto('.hai-aviso');
ok(/Avisos \(não impedem\)/.test(avisoTela) && /E3 repete uma hipótese/.test(avisoTela) && /sugestão nova E3 como combinada/.test(avisoTela),
  'N09 hipótese virando estratégia e sugestão nova "combinada" no rascunho: AVISO visível na revisão (não bloqueia; a nutricionista decide)');
const v1 = imps().find(x => x.id === i1.id), v2 = imps().find(x => x.versao === 2);
ok(!!v2 && v2.status === 'importado' && v1.status === 'confirmado' && v1.texto_original === RESPOSTA_GPT && itens(v1.id).filter(x => x.estado === 'editado').length === 1,
  'N04 nova importação vira versão 2; a versão 1 (confirmada, com a edição) continua idêntica');
await clicar('[data-hai-acao="descartar-import"]'); await confirmarModal();
ok(imps().find(x => x.versao === 2).status === 'descartado' && itens(v2.id).length === 63, 'N04 versão 2 descartada fica no histórico (nada apagado)');
const hist = await P.evaluate(() => [...document.querySelectorAll('.hai-tabela tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')));
ok(hist.length === 2 && /v2.*DESCARTADO/.test(hist[0]) && /v1.*CONFIRMADO/.test(hist[1]), 'N04 tela: histórico com v2 DESCARTADO e v1 CONFIRMADO');
await shot('hai-5-historico', '.hai-ponte');

/* ===================== V06 gerar Resultado HOLOS ===================== */
await P.evaluate(() => { const b = document.querySelector('[data-hai-acao="gerar"]'); b.click(); });
await P.waitForFunction(() => !!document.getElementById('rd-editor'), { timeout: 15000 }); await espera(500);
const ed = await P.evaluate(() => ({ aba: (document.querySelector('[data-aba].ativa') || {}).dataset ? document.querySelector('[data-aba].ativa').dataset.aba : '', erro: (document.getElementById('rh-erro') || {}).textContent || '',
  itens: [...document.querySelectorAll('.rd-ed-item')].map(l => (l.querySelector('textarea') || {}).value || ''), html: document.getElementById('rd-editor').innerText }));
ok(ed.aba === 'resultado-holos' && /HOLOSCAN/.test(ed.erro), 'V06 "Gerar Resultado HOLOS" abre o Resultado HOLOS do atendimento (pede a escolha do HOLOSCAN, sem pré-marcação)');
ok(ed.itens.some(t => /^Organizar o fim da tarde/.test(t)) && ed.itens.some(t => /^Lanche planejado/.test(t)) && !ed.itens.some(t => /^Plano B|^Registro rápido/.test(t))
  && !ed.itens.some(t => /reuniões da tarde podem dificultar/.test(t)) && /HOLOS AI/.test(ed.html), 'V06 editor com direcionamento e estratégias confirmados (origem HOLOS AI); sem o descartado; sem hipótese');
await P.evaluate((h) => { document.querySelector('input[name="rh-holoscan"][value="' + h + '"]').click(); }, H); await espera(200);
await clicar('[data-rh-acao="rascunho"]'); await espera(1200);
const rasc = srv.linhas('holos_results').filter(r => r.status === 'rascunho' && r.encounter_id === E1).pop();
const dHai = rasc ? [].concat(rasc.direcao.direcionamentos, rasc.direcao.estrategias, rasc.direcao.padroes, rasc.direcao.observar, rasc.direcao.corpo.itens).filter(x => x.origem === 'holos_ai') : [];
const eRasc = rasc && rasc.direcao.estrategias.find(x => /^Lanche planejado/.test(x.texto));
ok(!!rasc && dHai.length > 5 && dHai.every(x => x.ref && x.ref.tipo === 'holos_ai' && x.ref.id === i1.id && x.confirmado === true) && /15h30/.test(eRasc.acao)
  && /^Síntese HOLOS AI/.test(rasc.leitura_profissional || '') && rasc.direcao.foco_atual && rasc.direcao.foco_atual.confirmado === false && rasc.direcao.foco_atual.origem === 'holos_ai',
  'V06 rascunho salvo: itens da HOLOS AI com referência à importação v1, estratégia com o texto EDITADO, síntese na leitura profissional, foco só como sugestão');
ok(!JSON.stringify(rasc.direcao).includes('Registro rápido') && !JSON.stringify(rasc.direcao).includes('Plano B') && !JSON.stringify(rasc.direcao).includes(v2.id)
  && eRasc.status === 'acordada' && !/combinamos|horário alternativo/.test(JSON.stringify(rasc.direcao)) && !/nosso foco é organizar o fim da tarde/.test(JSON.stringify(rasc)),
  'N05 descartado (E2) e a importação v2 descartada fora do Resultado; só a estratégia acordada entra como acordada; o rascunho de mensagem da IA não entra');

/* ===================== V07 foco + finalizar ===================== */
await P.evaluate(() => { const li = [...document.querySelectorAll('[data-rd-bloco="foco_atual"] .rd-ed-item')][0]; const b = li && li.querySelector('[data-rd-acao="confirmar"]'); if (b) b.click(); }); await espera(300);
await clicar('[data-rh-acao="salvar"]'); await confirmarModal(); await espera(500);
const fin = srv.linhas('holos_results').filter(r => r.status === 'salvo' && r.encounter_id === E1).pop();
const dp = fin && fin.content_snapshot.direcao_paciente;
ok(!!fin && fin.template_version === 5 && dp.foco_atual && dp.foco_atual.texto === 'Organizar o fim da tarde', 'V07 Resultado HOLOS finalizado (template 5) com o foco confirmado');
ok(dp.direcionamentos.length === 1 && dp.direcionamentos[0].texto === 'Organizar o fim da tarde' && dp.estrategias.length === 1 && /15h30/.test(dp.estrategias[0].acao)
  && dp.corpo.itens.length === 1 && dp.proxima_etapa && /Retorno/.test(dp.proxima_etapa.texto), 'V07 para a paciente: direcionamento, estratégia EDITADA, Corpo e próxima etapa compartilhados');
const dpTxt = JSON.stringify(dp);
ok(!/Registro rápido|Plano B|reuniões da tarde podem dificultar|reuniões da tarde atrapalham|nota maior = menos marcadores|Síntese HOLOS AI|REC-MET|REC-FUN|Linha do Momentum|sha256|not_catalogued|composição do lanche/i.test(dpTxt) && dp.mente.itens.length === 0 && dp.espirito.itens.length === 0,
  'N05/N06 para a paciente: sem o confirmado não compartilhado, sem descartado, sem hipótese, sem alerta, sem síntese/raciocínio, sem ferramentas recomendadas; Mente/Espírito vazios');

/* ===================== V08 emitir, PDF, WhatsApp ===================== */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click(); }, PA);
await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await espera(600);
await clicar('[data-rp-acao="emitir"]'); await espera(1800);
await P.waitForFunction(() => !!document.querySelector('[data-rp-acao="pdf"]'), { timeout: 15000 });
const em = srv.linhas('holos_result_emissions').filter(e => e.holos_result_id === fin.id).pop();
const docPac = await texto('#rp-doc');
ok(!!em && em.template_version === 'RF-3' && /Organizar o fim da tarde/.test(docPac) && /15h30 e 16h/.test(docPac), 'V08 emissão RF-3: documento oficial com o direcionamento e a estratégia editada');
ok(!/Registro rápido|Plano B|reuniões da tarde podem dificultar|reuniões da tarde atrapalham|nota maior = menos marcadores|SUGESTÃO|HOLOS AI|not_catalogued|combinamos/.test(docPac) && !JSON.stringify(em.content_snapshot).includes('Plano B'),
  'N05/N06 documento oficial (base do PDF): sem descartado, sem só profissional, sem não compartilhado, sem marca de sugestão');
await shot('hai-8-documento', '#rp-doc');
const msg = await P.evaluate(() => window.ResultadoPagina.mensagemWhatsAppEmissao({ nome: 'Marina Ficticia' }, window.ResultadoPagina.emissaoAtual()));
ok(/Nesta fase, nosso principal direcionamento é: Organizar o fim da tarde\./.test(msg || '') && !/Plano B|hipótese|HOLOS AI/.test(msg), 'V08 WhatsApp: "Nesta fase, nosso principal direcionamento é: Organizar o fim da tarde." (só o confirmado)');
await P.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js' }).catch(() => null);
let pdf = await P.evaluate(async () => { if (typeof window.html2pdf !== 'function') return { semLib: true }; try { const r = await window.ResultadoPagina.gerarPdf(); return { tam: r.blob.size, nome: r.nome }; } catch (e) { return { erro: e.message }; } });
if (pdf.semLib) {
  const local = '/tmp/claude-0/-home-user-HoloHacking/2536f0de-9516-5291-b095-34b766c5940f/scratchpad/h2p/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js';
  if (existsSync(local)) { await P.addScriptTag({ path: local }); pdf = await P.evaluate(async () => { try { const r = await window.ResultadoPagina.gerarPdf(); return { tam: r.blob.size, nome: r.nome }; } catch (e) { return { erro: e.message }; } }); }
}
ok(pdf.semLib || (pdf.tam > 20000 && /\.pdf$/.test(pdf.nome)), 'V08 PDF oficial gerado pelo HoloHacking a partir da emissão' + (pdf.semLib ? ' (gerador indisponível offline: documento conferido acima)' : ' (' + pdf.tam + ' bytes)'));

/* ===================== V09 reabrir ===================== */
await P.reload({ waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await abrirAba('holos-ai');
await P.waitForFunction(() => !!document.querySelector('.hai-tabela'), { timeout: 15000 });
await P.evaluate(() => { const b = [...document.querySelectorAll('[data-hai-acao="abrir"]')].find(x => x.closest('tr').innerText.includes('v1')); if (b) b.click(); }); await espera(500);
const reab = await P.evaluate(() => ({ hist: [...document.querySelectorAll('.hai-tabela tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')), topo: (document.querySelector('.hai-rev-topo') || {}).innerText || '',
  editado: [...document.querySelectorAll('.hai-item-ed')].length, gerar: !document.querySelector('[data-hai-acao="gerar"]').disabled }));
ok(reab.hist.length === 2 && /v1/.test(reab.topo) && /CONFIRMADO/.test(reab.topo) && reab.editado === 1 && reab.gerar, 'V09 reaberto: histórico (v1 CONFIRMADO, v2 DESCARTADO), a revisão com o item EDITADO e "Gerar" disponível');
ok(srv.linhas('holos_results').some(r => r.id === fin.id && r.status === 'salvo') && srv.linhas('holos_result_emissions').some(e => e.id === em.id), 'V09 Resultado HOLOS e emissão persistidos');
await P.setViewport({ width: 390, height: 900 }); await espera(400);
ok(!(await P.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'celular (390 px): aba HOLOS AI sem rolagem lateral');
await shot('hai-9-celular', '.hai-ponte');
await P.setViewport({ width: 1280, height: 1000 });

/* ===================== N07 / N08 ===================== */
ok(digitais() === antes, 'N07 HOLOSCAN (aplicações, respostas, notas), Próximos Passos, ferramentas, pacotes, Mapeamento e Conduta idênticos');
const outra = srv.tratar({ op: 'query', uid: UB, q: { tabela: 'holos_ai_imports', acao: 'select', filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } });
const outraRev = srv.tratar({ op: 'rpc', uid: UB, nome: 'revisar_item_holos_ai', args: { p_item_id: it('estrategias', 'E1').id, p_estado: 'descartado' } });
const outraImp = srv.tratar({ op: 'rpc', uid: UB, nome: 'importar_holos_ai', args: { p_encounter_id: E1, p_texto: EXEMPLO } });
const direto = srv.tratar({ op: 'query', uid: UA, q: { tabela: 'holos_ai_import_items', acao: 'update', dados: { estado: 'confirmado' }, filtros: [{ col: 'id', op: 'eq', val: it('estrategias', 'E2').id }], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } });
ok((outra.data || []).length === 0 && outraRev.error.hint === 'referencia_cruzada' && outraImp.error.hint === 'atendimento_obrigatorio' && direto.error && direto.error.code === '42501',
  'N08 outra conta não lê, não revisa nem importa; a dona não grava direto na tabela (só pelas RPCs)');
ok(errosJS.length === 0, 'sem erro de JavaScript na página' + (errosJS.length ? ': ' + errosJS.slice(0, 3).join(' | ') : ''));

await nav.close();
console.log(falhou ? '\nFALHOU' : '\nOK: ponte HOLOS AI -> Resultado HOLOS');
process.exit(falhou ? 1 : 0);
