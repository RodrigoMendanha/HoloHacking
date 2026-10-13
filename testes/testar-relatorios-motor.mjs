/**
 * RELATORIOS, PDF E HOLOS AI (motor de resultados V1, 12/10, itens 34, 35 e 37; testes 26, 27, 30, 31 do item 41).
 * Caso ficticio no servidor falso: HOLOSCAN oficial + OQ3, PQQ, Carta, Conexao (com nomes de terceiros) + Resultado
 * HOLOS salvo + Conduta do atendimento.
 *   - relatorio da nutricionista: UM documento em 10 secoes a partir do Resultado salvo (sem o mapa ao vivo empilhado);
 *     o editor da interpretacao continua
 *   - relatorio "para o paciente" e pagina Resultado (PDF): a arquitetura da visao da paciente, um rodape so, um bloco so
 *     de proximos passos; sem IDs, hash, regra, governanca nem pendencias; sem a Carta nem nomes de terceiros
 *   - HOLOS AI: cabecalho coerente com o que entra; Carta so "realizada"; Conexao sem nomes de terceiros; exames fora
 *   - CSS de impressao: secao inteira nao e mais indivisivel (sem paginas meio vazias)
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';
import { comFoco } from './fixture-direcao.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const agora = new Date().toISOString();
const PA = ins('patients', { nome: 'Paciente Relatorio Ficticia' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: agora.slice(0, 10) }) }).data;
rpc('registrar_proximos_passos', { p_application_id: HA });
const tool = (id, r) => ins('tool_applications', { patient_id: PA, encounter_id: EA, ferramenta_id: id, versao_ferramenta: '1', status: 'concluida', respostas: r, iniciada_em: agora, concluida_em: agora }).id;
const T = [tool('oq3', { quer: 'QUER_FICT', precisa: 'PRECISA_FICT', consegue: 'CONSEGUE_FICT' }), tool('pqq', { objetivo: 'OBJ_FICT', r1: 'N1', verdadeiro: 'SINTESE_FICT' }),
  tool('carta_futuro', { carta: 'CARTA_INTIMA_NAO_ENVIAR', para_quando: '2027-01-01' }),
  tool('conexao_pertencimento_v1', { contar: 'Irmã Terceira Ficticia', pertence: 'grupo de corrida', vinculos: [{ rotulo: 'Irmã Terceira Ficticia', natureza: 'pessoa', papel: 'apoia', proximidade: 'próxima' }] }),
  /* 13/10: ferramentas que SEMPRE carregam pendencia metodologica (estado do Momentum, ponto de intervencao) */
  tool('linha_momentum', { energia: 4, carga: 6, controle: 5, suporte: 6, espaco: 4, estabilidade: 5, sustenta: 'S', limita: 'L', nao_pedir: 'N', estado_confirmado: 'reorganizar', justificativa_estado: 'J' }),
  tool('gatilhos_respostas_v1', { gatilho: 'g', pensamento: 'p', emocao: 'e', resposta: 'r', alternativa: 'a' })];
const vis = {}; T.forEach(id => { vis[id] = { mostrar: true }; });
const R = rpc('salvar_resultado_holos', comFoco({ payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: T, visao_paciente: { ferramentas: vis, proximos_passos: true },
  leitura_profissional: 'LEITURA_FICT', pontos_acompanhar: 'PONTOS_FICT', questoes_aprofundar: 'QUESTAO_SO_NUTRI' } }));
if (R.error) throw new Error(R.error.message);
const C1 = ins('conducts', { patient_id: PA, encounter_id: EA, status: 'salvo', revision_number: 1, objective: 'OBJETIVO_COND', nutrition_strategy: 'ESTRATEGIA_COND', actions: 'ACOES_COND', return_plan: 'RETORNO_COND', monitoring: 'MONITORAMENTO_COND' }).id;
ins('agreements', { patient_id: PA, conduct_id: C1, description: 'ACORDO_COND', due_text: 'diário', status: 'acordado', position: 1 });

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox'] });
const errosJS = [];
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

/* --- relatorio da ficha --- */
const rel = async (registro) => A.evaluate(async (pid, reg) => {
  window.levarParaFicha('aba:relatorio', pid); await new Promise(r => setTimeout(r, 800));
  const b = document.querySelector('[data-registro="' + reg + '"]'); if (b) b.click();
  for (let i = 0; i < 40 && !document.querySelector('[data-rel-unificado="' + reg + '"]'); i++) await new Promise(r => setTimeout(r, 100));
  const el = document.getElementById('relatorio');
  return { t: el.innerText, html: el.innerHTML, secoes: [...el.querySelectorAll('[data-rel-secao]')].map(s => s.getAttribute('data-rel-secao')), editor: !!el.querySelector('#rel-interpretacao') };
}, PA, registro);
const nut = await rel('nutri'), pac = await rel('paciente');
ok(nut.secoes.join() === '1,2,3,4,5,6,7,8,9,10' && !/A\. HOLOSCAN|G\. Resultado HOLOS|F\. Conduta vigente/.test(nut.t),
  'item 35: relatório da nutricionista = um documento em 10 seções (sem o mapa ao vivo e o Resultado empilhados) — ' + nut.secoes.join());
ok(/OBJETIVO_COND/.test(nut.t) && /ACORDO_COND/.test(nut.t) && /MONITORAMENTO_COND/.test(nut.t) && /RETORNO_COND/.test(nut.t) && /LEITURA_FICT/.test(nut.t) && /QUESTAO_SO_NUTRI/.test(nut.t)
  && /Decisão da nutricionista/.test(nut.t) && nut.editor, 'Conduta do atendimento (decisão da nutricionista), monitoramento/retorno, leitura; o editor da interpretação continua');
ok(/Proveniência técnica/.test(nut.t) && /HOLOS-V1 v/.test(nut.t) && /MR-V1/.test(nut.t), 'seção 10: proveniência técnica em rodapé discreto (pacote, motor, catálogo)');
ok(/Sua direção nesta etapa/i.test(pac.t) && /Foco atual/i.test(pac.t) && /Foco ficticio de teste/.test(pac.t) && !/QUESTAO_SO_NUTRI|MONITORAMENTO_COND|Proveniência|LEITURA_FICT/.test(pac.t)
  && !/CARTA_INTIMA_NAO_ENVIAR|Irmã Terceira Ficticia/.test(pac.t), 'relatório "para o paciente" = a visão da paciente (template 5: direção e foco), sem Carta, terceiros ou campos internos');

/* --- pagina Resultado (o PDF da paciente) --- */
await A.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click(); }, PA);
await A.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 });
const rp = await A.evaluate(() => { const d = document.getElementById('rp-doc'); return { t: d.innerText, html: d.innerHTML, rodapes: d.querySelectorAll('footer').length, ultimo: d.lastElementChild && d.lastElementChild.tagName,
  pp: [...d.querySelectorAll('h3,h4')].filter(h => /próximos passos/i.test(h.textContent)).length,
  semRodape: (d.innerText || '').replace(/Não é exame, não é diagnóstico e não é prescrição\. Os próximos passos são combinados em consulta\./g, '') }; });
ok(rp.rodapes === 1 && rp.ultimo === 'FOOTER', 'item 34: PDF da paciente com um rodapé só, no fim (antes: rodapé do Resultado HOLOS no meio, antes da Conduta)');
ok(!/[0-9a-f]{8}-[0-9a-f]{4}-|hash|REC-|rule|PENDÊNCIA|Pendências metodológicas|homologa|MR-V1|HOLOS-V1/i.test(rp.t) && !/data-pp-regra|rh-pendencias/.test(rp.html),
  'item 34: PDF sem IDs, hash, regra, governança nem pendências');
ok(rp.pp <= 1 && !/Próximos passos combinados/i.test(rp.t) && /Foco atual/i.test(rp.t), 'item 34: nenhum segundo título "Próximos passos" (template 5: a direção vem do que a nutricionista confirmou)');
ok(!/CARTA_INTIMA_NAO_ENVIAR|Irmã Terceira Ficticia|verdadeiro motivo/i.test(rp.t) && /A Carta ao Futuro Eu foi realizada como exercício/.test(rp.t),
  'testes 26/27/31: PDF da paciente sem o texto da Carta e sem nomes de terceiros (snapshot do Resultado salvo)');
ok(!/exame|laborat/i.test(rp.semRodape), 'teste 30: exames continuam fora do documento da paciente (só a negação do rodapé: "não é exame")');

/* --- 13/10: PENDENCIA METODOLOGICA e informacao INTERNA da visao profissional: nunca em superficie da paciente --- */
const PEND = /pend[eê]ncia|PM-\d|aguardando rodrigo|sem texto aprovado|não há texto aprovado|não há regra homologada/i;
const sup = await A.evaluate(async (pid) => {
  const R = window.ResultadoHolos; await R.carregar(pid);
  const r = R.doPaciente(pid).filter(x => x.status !== 'rascunho' && x.content_snapshot)[0];
  const d = document.createElement('div'); d.innerHTML = R.documentoHtml(r.content_snapshot, 'paciente', {});
  const prof = document.createElement('div'); prof.innerHTML = R.documentoHtml(r.content_snapshot, 'profissional', {});
  const RP = window.ResultadoPagina;
  return { pac: d.textContent, prof: prof.textContent, wa: RP.mensagemWhatsApp({ nome: 'Paciente Relatorio Ficticia' }, r, { nome: 'Nutri' }) };
}, PA);
ok(!PEND.test(sup.pac) && !PEND.test(rp.t) && !PEND.test(pac.t) && !PEND.test(sup.wa),
  'item 4 (13/10): nenhuma pendência metodológica na visão da paciente, no Resultado/PDF da paciente, no WhatsApp nem no relatório para o paciente');
ok(/Pendências metodológicas/.test(sup.prof), 'a nutricionista continua vendo as pendências, marcadas e recolhidas');

/* --- HOLOS AI --- */
const ia = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); window.levarParaFicha('aba:holos-ai', pid); await new Promise(r => setTimeout(r, 900));
  const b = document.querySelector('.ai-atalho-ctx[data-ctx="completo"]'); if (b) b.click(); await new Promise(r => setTimeout(r, 400));
  const ta = document.querySelector('#aba-holos-ai textarea'); return ta ? ta.value : document.getElementById('aba-holos-ai').innerText;
}, PA);
ok(!/CARTA_INTIMA_NAO_ENVIAR/.test(ia) && /Carta ao Futuro Eu foi realizada/.test(ia) && /O conteúdo não é incluído/.test(ia), 'item 37: HOLOS AI recebe a Carta só como realizada (o texto não vai)');
ok(!/Irmã Terceira Ficticia/.test(ia) && /Nomes de pessoas da rede não são incluídos/.test(ia), 'item 37: HOLOS AI sem nomes de terceiros da Conexão & Pertencimento');
ok(/Resultado HOLOS salvo entram as áreas para aprofundar/.test(ia) && /Resultado HOLOS \(último salvo\)/.test(ia) && !/prioridades, combinações, Leitura Integrada e sugestões automáticas NÃO/.test(ia),
  'item 37: o cabeçalho do contexto diz o que entra (o Resultado salvo entra; não diz mais que "prioridades" estão fora)');
ok(/Exames e documentos do prontuário \(arquivos e valores\) também NÃO estão incluídos/.test(ia), 'teste 30: exames continuam fora da HOLOS AI');

/* --- CSS de impressao --- */
const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
/* rodada de UX 13/10: a impressao da pagina Resultado usa a copia em #rp-impressao; as regras de pagina valem para .rp-doc */
ok(/body\.rh-imprimindo \.rh-secao\{break-inside:auto\}/.test(css) && /\.rp-doc \.rh-secao,\.rp-doc \.rh-sis,\.rp-doc \.rh-ferr,\.rp-doc \.rf-caixa\{break-inside:auto\}/.test(css) && !/\.rp-doc \.rh-secao,[^{]*\{break-inside:avoid\}/.test(css),
  'item 34: seção inteira deixou de ser indivisível na impressão (sem páginas meio vazias); só cartões pequenos e títulos ficam juntos');
ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log(falhou ? '\nFALHOU' : '\nrelatorios, PDF e HOLOS AI: tudo ok');
process.exit(falhou ? 1 : 0);
