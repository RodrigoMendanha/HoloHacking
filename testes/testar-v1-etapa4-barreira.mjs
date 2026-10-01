/**
 * V1 — ETAPA 4 — BARREIRA CENTRAL (Supabase falso, com conta)
 *
 *  Pacote RASCUNHO (o inventario V1 gravado) e numeros do modo homologacao NAO alimentam:
 *   - dashboard (nenhum Indice medio, nenhuma faixa oficial)
 *   - Evolucao (sem delta de HOLOSCAN; selo de nao homologado)
 *   - relatorio (resultados_oficiais = false; nenhum numero de homologacao)
 *   - HOLOS AI (contexto sem notas/faixas/Indice; sem saida de pacote rascunho)
 *   - Indice/Triada/faixas oficiais (Metodologia nega todas as saidas)
 *   - recomendacoes (regrasApresentaveis = []; cmbParaExibir = [])
 *  Legado identificado (indiceDoMotor, combinacoesDoMotor, reguas manuais, REC/SEL) continua fora da saida oficial.
 *  A tela Metodologia/Homologacao so existe com ?homologacao=1 e nao tem "aprovar tudo".
 *  Modo oficial recusa pacote rascunho; nenhum fallback.
 *  Etapa 4.2: o CANDIDATO V1 (decisoes fechadas) e gravado pela tela como nova versao em_revisao
 *  (linhagem, hash, 15 registros), confere REF-01..03 e continua fora da saida oficial.
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
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const ctxNav = await nav.createBrowserContext();
const A = await ctxNav.newPage();
await A.setViewport({ width: 1366, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/?homologacao=1', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await esperar(300);
await A.evaluate(() => { window.confirm = () => true; });
const texto = (sel) => A.evaluate((sel) => (document.querySelector(sel) || {}).innerText || '', sel);
const VAZ = /### Índice HOLOS|### Tríada|- Físico:|faixa \d|### Leitura Integrada|CMB-|\bREC-|\bSEL-|nota \d/;

titulo('SEM PACOTE: TODA SAIDA OFICIAL NEGADA');
const b0 = await A.evaluate(() => { const M = window.Metodologia; return { status: M.status(), pacote: M.pacote(), pode: M.podeCalcularOficial(), motivos: M.motivosBloqueio(), negadas: M.SAIDAS.filter(t => !M.podeExibirOficial(t)).length, total: M.SAIDAS.length, cob: M.coberturaMinima() }; });
ok(b0.status === 'em_homologacao' && b0.pacote === null && b0.pode === false && b0.negadas === b0.total && b0.cob === null && /nenhum Pacote Metodológico/.test(b0.motivos[0]), 'Metodologia: em_homologacao, sem pacote, 11 saidas negadas, cobertura minima null, motivo legivel');

titulo('INVENTARIO GRAVADO COMO RASCUNHO PELA TELA');
await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="metodologia"]').click(); await new Promise(r => setTimeout(r, 400)); });
ok(!(await A.evaluate(() => !!document.querySelector('#metodologia-corpo button[data-mh-acao*="aprovar"]'))) && !/aprovar tudo/i.test((await texto('#metodologia-corpo')).replace('Não existe "aprovar tudo"', '')), 'a tela nao tem botao "aprovar tudo"');
await A.evaluate(async () => { document.querySelector('[data-mh-acao="importar-rascunho"]').click(); for (let i = 0; i < 60 && !/gravado/.test(document.getElementById('mh-estado').textContent); i++) await new Promise(r => setTimeout(r, 100)); });
const pk = srv.linhas('methodology_packages')[0];
ok(pk && pk.status === 'rascunho' && srv.linhas('methodology_questions').filter(q => q.package_id === pk.id).length === 84 && srv.linhas('methodology_questions').every(q => q.status === 'para_homologacao'), 'pacote gravado como RASCUNHO com 84 perguntas para_homologacao (nenhuma aprovada)');
const tela = await texto('#metodologia-corpo');
ok(/HOLOS-V1/.test(tela) && /rascunho/.test(tela) && /Bloqueada/.test(tela) && /snt_pendente/.test(tela) && /politica_parcialidade_ausente/.test(tela), 'tela mostra o pacote rascunho, a saida oficial bloqueada e as pendencias do validador');
const b1 = await A.evaluate(() => { const M = window.Metodologia; return { status: M.status(), pode: M.podeCalcularOficial(), motivos: M.motivosBloqueio(), ativo: M.obterPacoteAtivo() }; });
ok(b1.status === 'em_homologacao' && b1.pode === false && b1.ativo === null && /nenhum Pacote Metodológico aprovado \(1 em rascunho/.test(b1.motivos[0]), 'com pacote rascunho: continua em_homologacao, pacote ativo null');

titulo('MODO HOMOLOGACAO PRODUZ NUMEROS; MODO OFICIAL RECUSA');
const hom = await A.evaluate(() => {
  const p = window.PacoteMetodologico.todos()[0]; const M = window.MotorMetodologico;
  const resp = {}; p.perguntas.slice(0, 20).forEach(q => { resp[q.stable_id] = 2; });
  const h = M.calcular({ responses: resp, methodology_package: p, mode: 'homologacao' });
  let oficial = null; try { M.calcular({ responses: resp, methodology_package: p, mode: 'oficial' }); } catch (e) { oficial = e.codigo; }
  return { mode: h.mode, status: h.package_status, versao: h.package_version, contribs: h.item_contributions.length, notaA: h.system_results.fungico, motivos: h.non_evaluable_reasons.slice(0, 3), oficial, eh: window.Metodologia.ehSaidaHomologacao(h) };
});
ok(hom.mode === 'homologacao' && hom.status === 'rascunho' && hom.versao === 1 && hom.contribs > 0, 'modo homologacao executa o rascunho (trilha gerada) e carrega mode/package_status/package_version');
ok(hom.notaA.nota === null && /sem politica de denominador/.test(hom.notaA.motivo), 'sem politica de ausencia aprovada, nem em homologacao sai nota de sistema (dados e cobertura preservados)');
ok(hom.oficial === 'oficial_bloqueado' && hom.eh === true, 'modo oficial recusa o rascunho; a saida de homologacao e reconhecida pela barreira');

titulo('CANDIDATO V1 (DECISOES FECHADAS) GRAVADO EM REVISAO — SEM PUBLICAR');
await A.evaluate(async () => { const sel = document.querySelector('[data-mh-pacote]'); sel.value = 'candidato'; sel.dispatchEvent(new Event('change')); await new Promise(r => setTimeout(r, 300)); });
const telaCand = await texto('#metodologia-corpo');
ok(/DECISOES METODOLOGICAS V1 FECHADAS/.test(telaCand) && /PUBLICACAO TECNICA PENDENTE DE VALIDACAO NO BANCO REAL/.test(telaCand) && /Nenhum erro estrutural/.test(telaCand) && /candidato, não gravado/.test(telaCand) && /Bloqueada/.test(telaCand), 'tela: candidato V1 com decisoes fechadas, publicacao tecnica pendente, validador sem erros e saida oficial ainda bloqueada');
await A.evaluate(async () => { document.querySelector('[data-mh-aba="regras"]').click(); await new Promise(r => setTimeout(r, 200)); });
const telaRegras = await texto('#metodologia-corpo');
ok(/REF-01[\s\S]*confere[\s\S]*REF-02[\s\S]*confere[\s\S]*REF-03[\s\S]*confere/.test(telaRegras) && /Não há sugestão automática validada para esta edição\./.test(telaRegras), 'aba de regras: REF-01..03 conferem com o motor; "Não há sugestão automática validada para esta edição."');
await A.evaluate(async () => { document.querySelector('[data-mh-aba="resumo"]').click(); await new Promise(r => setTimeout(r, 100)); document.querySelector('[data-mh-acao="gravar-candidato"]').click(); for (let i = 0; i < 80 && !/Candidato gravado/.test(document.getElementById('mh-estado').textContent); i++) await new Promise(r => setTimeout(r, 100)); });
const pk2 = srv.linhas('methodology_packages').find(x => x.version === 2);
ok(pk2 && pk2.status === 'em_revisao' && pk2.lineage && pk2.lineage.parent_version === 1 && /^[0-9a-f]{64}$/.test(pk2.content_hash) && !pk2.approved_at, 'candidato gravado como NOVA VERSAO (v2) em_revisao, com linhagem e hash; nada aprovado');
ok(srv.linhas('methodology_questions').filter(x => x.package_id === pk2.id && x.temporal_context).length === 84 && srv.linhas('methodology_associations').filter(x => x.package_id === pk2.id).length === 179 && srv.linhas('methodology_homologation_records').filter(x => x.package_id === pk2.id).length === 15 && srv.linhas('methodology_questions').filter(x => x.package_id === pk.id && x.status === 'para_homologacao').length === 84, 'v2 com 84 perguntas, 179 associacoes e 15 registros de decisao; o rascunho v1 continua intacto');
const b2 = await A.evaluate(() => { const M = window.Metodologia, P = window.PacoteMetodologico, Mo = window.MotorMetodologico; const c = P.todos().find(x => x.version === 2); let of = null; try { Mo.calcular({ responses: {}, methodology_package: c, mode: 'oficial' }); } catch (e) { of = e.codigo; } const ref = c.regras.find(r => r.target === 'REF-03'); const h = Mo.calcular({ responses: ref.payload.entrada.responses, methodology_package: c, mode: 'homologacao' }); return { status: M.status(), ativo: M.obterPacoteAtivo(), motivo: M.motivosBloqueio()[0], of, val: P.validar(c).total_erros, idx: h.index_result.valor_exibicao, eh: M.ehSaidaHomologacao(h) }; });
ok(b2.status === 'em_homologacao' && b2.ativo === null && /nenhum Pacote Metodológico aprovado \(2 em rascunho/.test(b2.motivo) && b2.of === 'oficial_bloqueado' && b2.val === 0, 'candidato em_revisao (0 erros no validador) nao vira oficial: barreira em homologacao, modo oficial recusa');
ok(b2.idx === '66.7' && b2.eh === true, 'modo homologacao com o candidato lido do servidor: REF-03 -> Indice 66.7, e a saida continua marcada como homologacao');

titulo('CONTEXTOS OFICIAIS NAO RECEBEM O RASCUNHO NEM O LEGADO');
// paciente com HOLOSCAN aplicado (coleta experimental consolidada)
const PA = await A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="pacientes"]').click(); const v = document.getElementById('voltar-lista'); if (v) v.click();
  document.getElementById('btn-abrir-novo').click(); document.getElementById('np-nome').value = 'Paciente Barreira'; document.getElementById('btn-salvar-paciente').click();
  for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, 100)); const a = (window.pacientesTodos() || []).find(x => x.nome === 'Paciente Barreira'); if (a) return a.id; }
  return null;
});
const holo = await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid); await new Promise(r => setTimeout(r, 200));
  document.querySelector('.nav-item[data-secao="holoscan"]').click(); await new Promise(r => setTimeout(r, 300));
  document.getElementById('btn-abrir-questionario').click(); await new Promise(r => setTimeout(r, 300));
  const itens = [...document.querySelectorAll('.q-item')];
  itens.forEach((it, i) => it.querySelectorAll('.q-btn')[i % 4].click());
  document.querySelector('[data-acao="calcular"]').click(); await new Promise(r => setTimeout(r, 600));
  return { interp: (document.getElementById('holo-interpretacao') || {}).innerHTML || '', selo: !!document.querySelector('#secao-holoscan .selo-homologacao'), cmb: window.cmbParaExibir().length, regras: window.CorpoBancos ? window.CorpoBancos.regrasApresentaveis().length : -1, itens: itens.length };
}, PA);
ok(holo.itens === 84, 'questionario na tela: 84 itens (coleta experimental)');
ok(holo.selo && /selo-homologacao/.test(holo.interp), 'HOLOSCAN: o Indice continua com selo "em homologacao" (coleta experimental, sem resultado oficial)');
ok(holo.cmb === 0 && holo.regras === 0, 'legado: cmbParaExibir() = [] e regrasApresentaveis() = [] — nenhuma combinacao nem recomendacao apresentavel');
const legado = await A.evaluate(() => ({ idx: typeof window.indiceDoMotor, regra: window.Metodologia.regraDisponivel('CMB-001'), rec: window.Metodologia.regraDisponivel('REC-001'), sel: window.Metodologia.regraDisponivel('SEL-001') }));
ok(legado.regra === false && legado.rec === false && legado.sel === false, 'legado: CMB-001, REC-001 e SEL-001 indisponiveis para uso oficial (regraDisponivel)');
const dash = await A.evaluate(async () => { document.querySelector('.nav-item[data-secao="dashboard"]').click(); await new Promise(r => setTimeout(r, 500)); return document.getElementById('secao-dashboard').innerText; });
ok(!/Índice HOLOS médio|Índice médio/i.test(dash) && !/faixa (baixa|média|alta) oficial/i.test(dash), 'dashboard: nenhum Indice medio, nenhuma faixa oficial');
const ctx = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300));
  document.querySelector('[data-aba="holos-ai"]').click(); await new Promise(r => setTimeout(r, 400));
  const out = {}; for (const id of ['completo', 'holoscan', 'evolucao']) { const b = document.querySelector('#ai-hub-atalhos [data-ctx="' + id + '"]'); if (b) { b.click(); await new Promise(r => setTimeout(r, 300)); } out[id] = (document.getElementById('ai-hub-texto') || {}).textContent || ''; }
  return out;
}, PA);
ok(Object.values(ctx).every(t => !VAZ.test(t) && !/homologacao|package_status|TEST_FIXTURE/.test(t)), 'HOLOS AI: nenhum contexto traz notas, faixas, Indice, Triada, CMB/REC/SEL nem saida de pacote rascunho');
const evo = await A.evaluate(async (pid) => { window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 300)); document.querySelector('[data-aba="evolucao"]').click(); await new Promise(r => setTimeout(r, 400)); return document.getElementById('aba-evolucao').innerText; }, PA);
ok(!/delta [+-]?\d/.test(evo) && /sem comparação metodológica|não homologada|Nada é comparado por conta própria/.test(evo), 'Evolucao: sem delta de HOLOSCAN; selo de nao homologado');
const previa = await A.evaluate((pid) => { const f = window.Relatorios.novoForm(pid); const F = window.Relatorios.fontesDisponiveis(pid); f.sel.holoscan_application_ids = F.holoscan.map(h => h._supa_id); return window.Relatorios.montarPrevia(pid, f); }, PA);
ok(previa.holoscan.every(h => h.resultados_oficiais === false && !('indice' in h) && !('mode' in h)) && /não são oficiais/.test(previa.metodologia), 'relatorio: HOLOSCAN com resultados_oficiais=false, sem Indice e sem numero de homologacao');
const exp = await A.evaluate(async (pid) => {
  window.abrirFichaDe(pid); await new Promise(r => setTimeout(r, 200));
  let dados = null; const origURL = URL.createObjectURL; URL.createObjectURL = (blob) => { blob.text().then(t => { dados = JSON.parse(t); }); return 'blob:fake'; };
  const origCreate = document.createElement.bind(document); document.createElement = function (tag) { const el = origCreate(tag); if (tag === 'a') el.click = () => {}; return el; };
  document.getElementById('btn-exportar-paciente').click(); await new Promise(r => setTimeout(r, 400));
  const modal = document.getElementById('modal-confirmar-acao'); if (modal && !modal.classList.contains('hidden')) { document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 800)); }
  await new Promise(r => setTimeout(r, 300)); URL.createObjectURL = origURL; document.createElement = origCreate; return JSON.stringify(dados || {});
}, PA);
ok(!/TEST_FIXTURE|"mode":"homologacao"|package_status/.test(exp), 'exportacao do paciente nao carrega saida de homologacao');
ok(!srv.linhas('holoscan_applications').some(a => a.methodology_package_id), 'nenhuma aplicacao salva aponta para o pacote rascunho');
const semFlag = await A.evaluate(async () => { history.replaceState(null, '', '/'); return { modo: window.Metodologia.modoHomologacao() }; });
ok(semFlag.modo === false, 'sem ?homologacao=1 o modo de homologacao e falso (nao vem de localStorage nem da tela)');
ok(errosJS.length === 0, 'sem erros de JS na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
