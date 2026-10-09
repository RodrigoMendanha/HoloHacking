/**
 * RESULTADO FINAL HOLOS na tela (decisoes aprovadas 10/10, DECISOES-V1 item 180), servidor falso:
 *   PROF      Sintese HOLOS (1a/2a area, Triade, catalogo congelado, aplicadas, limite), "Resultado estruturado" por ferramenta
 *   PACIENTE  resumo simples; ferramentas so autorizadas; Carta so "realizada"; Proximos Passos OFF por padrao; ON aparece
 *   FORM      "Compartilhar Proximos Passos com a paciente" desligado por padrao; ligado vai para o snapshot (template 2)
 *   ANTIGO    resultado template 1: nada buscado ao vivo (nenhuma leitura de holos_next_steps ao abrir)
 *   EMISSAO   PREVIA sem emissao; gerar; Perfil e Conduta mudam depois: emissao antiga identica (HTML e PDF); nova usa os novos
 *   SEGURANCA outra nutricionista nao le; arquivado nao emite; XSS escapado na emissao
 *   UX        390px sem rolagem lateral; switch com rotulo (teclado/ARIA); Imprimir
 * SHOT_DIR=<pasta> grava capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const UB = srv.criarConta('b@holo.test', 'senha-b-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia Antes', registro: 'CRN-1 0001', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args, uid) => srv.tratar({ op: 'rpc', uid: uid || UA, nome, args });
const ins = (tabela, dados) => { const r = q(UA, tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };
const PA = ins('patients', { nome: 'Paciente Final Ficticia', telefone: '62999990000' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: new Date().toISOString().slice(0, 10) }) }).data;
const conc = new Date(Date.now() - 1800000).toISOString();
const tool = (id, r) => ins('tool_applications', { patient_id: PA, encounter_id: EA, ferramenta_id: id, versao_ferramenta: '1', status: 'concluida', respostas: r, iniciada_em: conc, concluida_em: conc }).id;
const T_OQ3 = tool('oq3', { quer: 'ter energia', precisa: 'dormir melhor', consegue: 'caminhar 10 min' });
const T_GAT = tool('gatilhos_respostas_v1', { gatilho: 'cobrança', pensamento: 'PENSAMENTO_PRIVADO', resposta: 'come doce' });
const T_CAR = tool('carta_futuro', { carta: 'CARTA_INTIMA_NAO_MOSTRAR', para_quando: '2027-01-01' });
const reg = rpc('registrar_proximos_passos', { p_application_id: HA });
const base = { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [T_OQ3, T_GAT, T_CAR],
  visao_paciente: { ferramentas: { [T_OQ3]: { mostrar: true }, [T_GAT]: { mostrar: false }, [T_CAR]: { mostrar: true } } } };
const R1 = rpc('salvar_resultado_holos', { payload: base });
const linha1 = srv.linhas('holos_results').find(r => r.id === R1.data);
ok(!reg.error && !R1.error && linha1.template_version === 2 && linha1.content_snapshot.proximos_passos.registrado === true && linha1.content_snapshot.visibilidade.proximos_passos === false,
  'Resultado HOLOS (template 2): Próximos Passos congelados no snapshot; compartilhar com a paciente DESLIGADO por padrão');
ok(rpc('salvar_resultado_holos', { payload: Object.assign({}, base, { visao_paciente: { ferramentas: {}, proximos_passos: 'sim' } }) }).error?.hint === 'payload_invalido', 'compartilhamento que não é true/false: recusado');

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function sessao(largura) {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: largura || 1366, height: 1000 });
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' + (SHOT ? '.topo,.ficha-barra,[class*="topo"]{position:static!important}' : '') });
  return P;
}
const abrirAba = (P) => P.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  if (window.ResultadoHolos) window.ResultadoHolos.esquecer();
  window.levarParaFicha('aba:resultado-holos', pid);
  for (let i = 0; i < 60; i++) { const a = document.getElementById('aba-resultado-holos'); if (a && a.querySelector('[data-rh-acao="novo"]')) break; await new Promise(r => setTimeout(r, 100)); }
}, PA);
const ver = async (P, id, visao) => { await P.evaluate((id, v) => document.querySelector('[data-rh-acao="ver"][data-rh-id="' + id + '"][data-rh-visao="' + v + '"]').click(), id, visao); await espera(700); };
const docTxt = (P) => P.evaluate(() => { const d = document.querySelector('#aba-resultado-holos .rh-doc'); return d ? d.innerText : ''; });

const A = await sessao();
await abrirAba(A);
await ver(A, R1.data, 'profissional');
let t = await docTxt(A);
ok(/Síntese HOLOS/.test(t) && /1ª área para investigar/.test(t) && /2ª área para investigar/.test(t) && /Pelo catálogo vigente \(HOLOS-RECOMENDACOES-V1 v1\)/i.test(t) && /Na Tríade|Tríade sem dado/.test(t)
  && /foram aplicadas: OQ³, Gatilhos & Respostas e Carta ao Futuro Eu/.test(t) && /não possui regra homologada para afirmar gravidade, diagnóstico ou causa/.test(t),
  'visão profissional: Síntese HOLOS (1ª/2ª área, Tríade, catálogo congelado, aplicadas, limite explícito)');
ok((t.match(/Resultado estruturado/gi) || []).length >= 3 && /O que quer\s*\n?\s*ter energia/i.test(t) && /Carta ao Futuro Eu\s*\n?\s*realizada/i.test(t) && !/CARTA_INTIMA_NAO_MOSTRAR/.test(t),
  'cada ferramenta com "Resultado estruturado" (o registro completo fica recolhido); Carta: "realizada"');
if (SHOT) { await espera(400); const el = await A.$('#aba-resultado-holos .rh-sintese'); if (el) await el.screenshot({ path: SHOT + '/sintese-profissional.png' }); }
await A.evaluate(() => document.querySelector('#aba-resultado-holos [data-rh-visao-troca="paciente"]').click()); await espera(700);
t = await docTxt(A);
ok(/Resumo da sua avaliação/.test(t) && /áreas que aparecem primeiro para aprofundar/.test(t) && /OQ³/.test(t) && !/Gatilhos|PENSAMENTO_PRIVADO/.test(t)
  && !/CARTA_INTIMA_NAO_MOSTRAR/.test(t) && /Carta ao Futuro Eu/.test(t), 'visão paciente: resumo simples; ferramentas só autorizadas; Carta só "realizada" (o texto nunca aparece)');
ok(!/Próximos passos de aprofundamento|Mapa da Rotina|Pelo catálogo|PENDÊNCIA|Regra oficial|HOLOS-RECOMENDACOES|hash|REC-/.test(t), 'Próximos Passos OFF: não aparecem para a paciente; sem pendência, código, hash ou regra interna');
if (SHOT) { await espera(400); const el = await A.$('#aba-resultado-holos .rh-doc'); if (el) await el.screenshot({ path: SHOT + '/paciente-pp-off.png' }); }

/* FORM: o switch, desligado por padrao; ligar -> snapshot com visibilidade true; paciente ve */
await A.evaluate(() => { document.querySelector('[data-rh-acao="voltar"]').click(); });
await espera(300);
await A.evaluate(() => document.querySelector('[data-rh-acao="novo"]').click()); await espera(400);
const sw = await A.evaluate(() => { const c = document.getElementById('rh-compartilhar-pp'); return c ? { marcado: c.checked, rotulo: c.closest('label') ? c.closest('label').innerText : '', foco: (c.focus(), document.activeElement === c) } : null; });
ok(sw && sw.marcado === false && /Compartilhar Próximos Passos HOLOS com a paciente/.test(sw.rotulo) && sw.foco, 'formulário: "Compartilhar Próximos Passos com a paciente" desligado por padrão, com rótulo e focável pelo teclado');
await A.evaluate((ha, ids, ea) => {
  const sel = document.getElementById('rh-atendimento'); sel.value = ea; sel.dispatchEvent(new Event('change', { bubbles: true }));
  document.querySelector('input[name="rh-holoscan"][value="' + ha + '"]').click();
  ids.forEach(id => { const c = document.querySelector('[data-rh-ferr][value="' + id + '"]'); if (c && !c.checked) c.click(); });
  const m = document.querySelector('[data-rh-mostrar="' + ids[0] + '"]'); if (m && !m.checked) m.click();
  document.getElementById('rh-compartilhar-pp').click();
}, HA, [T_OQ3], EA);
await espera(200);
await A.evaluate(() => document.querySelector('[data-rh-acao="salvar"]').click()); await espera(300);
await A.evaluate(() => { const b = document.getElementById('modal-confirmar-ok'); if (b) b.click(); }); await espera(1200);
const R2 = srv.linhas('holos_results').filter(r => r.status !== 'rascunho').sort((a, b) => String(b.saved_at).localeCompare(String(a.saved_at)))[0];
ok(R2 && R2.id !== R1.data && R2.content_snapshot.visibilidade.proximos_passos === true && R2.selected_sources.visao_paciente.proximos_passos === true, 'switch ligado → snapshot congela visibilidade.proximos_passos = true');
await A.evaluate(() => document.querySelector('#aba-resultado-holos [data-rh-visao-troca="paciente"]').click()); await espera(700);
t = await docTxt(A);
ok(/Próximos passos de aprofundamento/.test(t) && /Nenhuma é obrigatória/.test(t) && !/Ajuda a localizar|REC-|Aplique o/.test(t), 'Próximos Passos ON: aparecem para a paciente em linguagem simples (só nomes de ferramentas)');
if (SHOT) { await espera(400); const el = await A.$('#aba-resultado-holos .rh-pp-paciente'); if (el) await el.screenshot({ path: SHOT + '/paciente-pp-on.png' }); }

/* RESULTADO ANTIGO (template 1): nada buscado ao vivo */
const antigo = JSON.parse(JSON.stringify(linha1));
Object.assign(antigo, { id: '00000000-0000-4000-8000-0000000000a1', template_version: 1, superseded_at: new Date().toISOString(), operation_id: null });
delete antigo.content_snapshot.proximos_passos; delete antigo.content_snapshot.visibilidade; antigo.content_snapshot.template_version = 1;
srv.tabelas.holos_results.push(antigo);
await abrirAba(A);
await espera(1500);   /* o painel do HOLOSCAN da ficha le os seus proprios Proximos Passos; aqui conta so o abrir do Resultado antigo */
const logAntes = srv.log.length;
await ver(A, antigo.id, 'profissional');
t = await docTxt(A);
const leuPP = srv.log.slice(logAntes).some(l => l.tabela === 'holos_next_steps' || l.nome === 'proximos_passos_holos' || l.nome === 'registrar_proximos_passos');
ok(/salvo antes de os Próximos Passos HOLOS fazerem parte do Resultado/.test(t) && !leuPP, 'resultado antigo (template 1): mostra só o que tem; nenhuma leitura de Próximos Passos ao vivo');

/* EMISSAO */
const C1 = ins('conducts', { patient_id: PA, encounter_id: EA, status: 'salvo', revision_number: 1, objective: 'Objetivo Antes', actions: 'Ação <img src=x onerror="window.__xss=1">' }).id;
ins('agreements', { patient_id: PA, conduct_id: C1, description: 'Beber água', due_text: 'diário', status: 'acordado', position: 1 });
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); if (window.Conduta && window.Conduta.carregar) await window.Conduta.carregar(); window.irParaSecao('resultado'); }, PA);
await A.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 });
const previa = await A.evaluate(() => ({ acoes: [...document.querySelectorAll('#rp-acoes button')].map(b => b.textContent.trim()), selo: !!document.querySelector('.rp-previa-selo'), pdf: !!document.querySelector('[data-rp-acao="pdf"]') }));
ok(previa.acoes.join(',') === 'Gerar Resultado Final,Abrir na ficha' && previa.selo && !previa.pdf, 'sem emissão: PRÉVIA, só "Gerar Resultado Final" (PDF/WhatsApp só de emissão)');
await A.evaluate(async () => { document.querySelector('[data-rp-acao="emitir"]').click(); for (let i = 0; i < 50 && !document.querySelector('[data-rp-acao="pdf"]'); i++) await new Promise(r => setTimeout(r, 100)); });
const em1 = srv.linhas('holos_result_emissions')[0];
const html1 = await A.evaluate(() => document.getElementById('rp-doc').outerHTML);
ok(em1 && em1.emission_number === 1 && em1.template_version === 'RF-1' && em1.holos_result_id === R2.id && em1.result_content_hash === R2.content_hash && em1.content_snapshot.conduta.campos.objective === 'Objetivo Antes'
  && em1.content_snapshot.profissional.nome === 'Nutri Ficticia Antes' && /Nutri Ficticia Antes/.test(html1) && /Objetivo Antes/.test(html1),
  'emissão gerada: congela Resultado (id + hash), Conduta, nome, CRN e template RF-1');
ok(!(await A.evaluate(() => window.__xss === 1)) && html1.includes('&lt;img src=x'), 'XSS no texto da Conduta: escapado na emissão');
if (SHOT) { await espera(400); await A.screenshot({ path: SHOT + '/emissao-desktop.png' }); }
await A.evaluate(() => {
  window.__pdfs = [];
  window.html2pdf = () => ({ set() { return this; }, from(el) { window.__pdfs.push(el.outerHTML); return this; }, outputPdf() { return Promise.resolve(new Blob(['%PDF-1.4 falso'], { type: 'application/pdf' })); } });
  const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) return; return orig.call(this); };
});
await A.evaluate(async () => { document.querySelector('[data-rp-acao="pdf"]').click(); await new Promise(r => setTimeout(r, 500)); });
/* Perfil e Conduta mudam DEPOIS */
const prof = srv.tabelas.profiles.find(x => x.id === UA); prof.nome = 'Nutri Ficticia Depois'; prof.registro = 'CRN-9 9999';
ins('conducts', { patient_id: PA, encounter_id: EA, status: 'salvo', revision_number: 2, objective: 'Objetivo Depois', supersedes_id: C1 });
await A.evaluate(async () => { if (window.Conduta && window.Conduta.carregar) await window.Conduta.carregar(); window.ResultadoPagina.desenhar(); for (let i = 0; i < 40 && !document.getElementById('rp-doc'); i++) await new Promise(r => setTimeout(r, 100)); await new Promise(r => setTimeout(r, 400)); });
const html1b = await A.evaluate(() => document.getElementById('rp-doc').outerHTML);
await A.evaluate(async () => { document.querySelector('[data-rp-acao="pdf"]').click(); await new Promise(r => setTimeout(r, 500)); });
const pdfs = await A.evaluate(() => window.__pdfs.slice());
ok(html1b === html1 && pdfs.length === 2 && pdfs[0] === pdfs[1] && pdfs[0] === html1, 'Perfil e Conduta mudaram: a emissão antiga e o PDF dela continuam idênticos (mesmo HTML)');
await A.evaluate(async () => { document.querySelector('[data-rp-acao="emitir"]').click(); for (let i = 0; i < 50 && !/Depois/.test((document.getElementById('rp-doc') || {}).innerText || ''); i++) await new Promise(r => setTimeout(r, 100)); });
const em2 = srv.linhas('holos_result_emissions').find(e => e.emission_number === 2);
const html2 = await A.evaluate(() => document.getElementById('rp-doc').outerHTML);
ok(em2 && em2.content_snapshot.profissional.nome === 'Nutri Ficticia Depois' && em2.content_snapshot.conduta.campos.objective === 'Objetivo Depois' && /Objetivo Depois/.test(html2) && /CRN-9 9999/.test(html2),
  'nova emissão usa os dados novos (nome, CRN, Conduta)');
await A.evaluate(async (id) => { document.querySelector('.rp-emissoes').open = true; document.querySelector('[data-rp-acao="ver-emissao"][data-rp-em="' + id + '"]').click(); await new Promise(r => setTimeout(r, 600)); }, em1.id);
const html1c = await A.evaluate(() => document.getElementById('rp-doc').outerHTML);
ok(html1c === html1 && JSON.stringify(srv.linhas('holos_result_emissions').find(e => e.id === em1.id).content_snapshot) === JSON.stringify(em1.content_snapshot), 'emissão antiga reaberta pela lista: intacta (snapshot e documento iguais)');
await A.evaluate(() => { window.__print = 0; window.print = () => { window.__print++; }; document.querySelector('[data-rp-acao="imprimir"]').click(); });
ok(await A.evaluate(() => window.__print === 1 && document.body.classList.contains('rp-imprimindo')), 'Imprimir: imprime só o documento da emissão');

/* SEGURANCA */
const outra = q(UB, 'holos_result_emissions', 'select', {});
ok((outra.data || []).length === 0 && rpc('emitir_resultado_final', { payload: { holos_result_id: R2.id } }, UB).error?.hint === 'referencia_cruzada', 'outra nutricionista: não lê emissões nem emite com o resultado de outra conta');
ok(q(UA, 'holos_result_emissions', 'update', { dados: { content_hash: 'x' }, filtros: [['id', 'eq', em1.id]] }).error && q(UA, 'holos_result_emissions', 'delete', { filtros: [['id', 'eq', em1.id]] }).error,
  'emissão não é alterada nem apagada pela API');
srv.tabelas.patients.find(p => p.id === PA).status = 'inativo';
ok(rpc('emitir_resultado_final', { payload: { holos_result_id: R2.id } }).error?.hint === 'paciente_arquivado', 'paciente arquivado: nenhuma emissão nova');
srv.tabelas.patients.find(p => p.id === PA).status = 'ativo';
ok(rpc('emitir_resultado_final', { payload: { holos_result_id: R2.id, imagens: { logo: 'javascript:alert(1)' } } }).error?.hint === 'imagem_invalida', 'imagem que não é PNG/JPEG/WebP em base64: recusada');

/* transicao: front no ar antes do SQL (tabela de emissoes ausente) -> a pagina segue como antes, sem quebrar */
const T2 = await sessao();
await T2.evaluate(() => {
  const orig = window.supabaseClient.from.bind(window.supabaseClient);
  window.supabaseClient.from = (t) => t !== 'holos_result_emissions' ? orig(t) : { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.holos_result_emissions' in the schema cache" } }) }) }) };
});
await T2.evaluate(async (pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('resultado'); for (let i = 0; i < 50 && !document.getElementById('rp-doc'); i++) await new Promise(r => setTimeout(r, 100)); }, PA);
const trans = await T2.evaluate(() => [...document.querySelectorAll('#rp-acoes button')].map(b => b.textContent.trim()).join(','));
ok(trans === 'Baixar PDF,Enviar pelo WhatsApp,Imprimir,Abrir na ficha', 'banco sem a migration de emissões: a página continua como antes (PDF/WhatsApp), sem erro: ' + trans);

/* UX: 390px */
const M = await sessao(390);
await M.evaluate(async (pid) => { window.definirPacienteAtivo(pid); window.irParaSecao('resultado'); for (let i = 0; i < 50 && !document.getElementById('rp-doc'); i++) await new Promise(r => setTimeout(r, 100)); }, PA);
ok(await M.evaluate(() => !!document.getElementById('rp-doc') && document.documentElement.scrollWidth <= window.innerWidth + 1), 'celular 390px: emissão sem rolagem lateral');
if (SHOT) { await espera(400); await M.screenshot({ path: SHOT + '/emissao-mobile.png' }); }
await abrirAba(M);
await ver(M, R2.id, 'profissional');
ok(await M.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'celular 390px: Síntese HOLOS sem rolagem lateral');

ok(errosJS.length === 0, 'nenhum erro de JavaScript' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 300) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
