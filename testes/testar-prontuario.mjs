/**
 * PRONTUARIO (decisao de produto 09/10) — Supabase falso, com conta:
 *   1  exames e documentos sao SO arquivos: biblioteca com tipo, titulo, data, arquivo e observacao;
 *      a tela nao tem "Lancar valores", painel de exames nem Leitura Integrada; a Conduta nao tem
 *      prescricao dietetica, diagnostico nutricional nem encaminhamentos
 *   2  guardar com conta: linha em documents (titulo, tipo, data, observacao) + objeto no Storage;
 *      a lista mostra titulo, tipo, data, arquivo, envio, responsavel e observacao
 *   3  multiplos dispositivos: outra sessao da mesma conta ve o documento
 *   4  arquivar: sai da lista, linha e arquivo continuam; "Ver arquivados" e "Restaurar"
 *   5  servidor: DELETE de documento recusado; objeto registrado nao sai do Storage; gravacao de
 *      coleta/resultado (RPCs e tabelas) recusada; nova Leitura Integrada recusada
 *   6  pagina Resultado: Resultado HOLOS salvo (visao da paciente) + Conduta vigente + identidade
 *      profissional; aviso de termos fora do metodo so na tela; PDF (gerador stub) e WhatsApp
 *      (numero do cadastro, mensagem pronta, PDF baixado); sem exames, sem ids internos
 *   7  sem Resultado HOLOS finalizado: a pagina convida a finalizar na ficha
 *   8  relatorio novo: sem exames, documento so como contagem, conduta sem os 3 campos
 *   9  nao interferencia: HOLOSCAN, notas, respostas, ferramentas, metodologia, coletas antigas e
 *      Leituras Integradas antigas ficam identicos
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado, payloadOficial } from './holos-aprovado.mjs';

mkdirSync('amostras', { recursive: true });
writeFileSync('amostras/receita-prontuario.pdf', '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
const ins = (tabela, dados) => { const r = q(tabela, 'insert', { dados }); if (r.error) throw new Error(tabela + ': ' + r.error.message); return r.data[0]; };

/* contas de criarConta() nascem sem perfil (como as contas reais anteriores ao cadastro): o perfil entra aqui */
const PERFIL = q('profiles', 'upsert', { dados: { id: UA, nome: 'Nutri Teste Ficticia', registro: 'CRN-3 00000', profissao: 'Nutricionista' } });
ok(!PERFIL.error && srv.linhas('profiles').some(x => x.id === UA && x.registro === 'CRN-3 00000'), 'fixture: perfil profissional da conta (nome e registro)');
const PA = ins('patients', { nome: 'Paciente Prontuario Ficticia', telefone: '(11) 98888-7777' }).id;
const PB = ins('patients', { nome: 'Paciente Sem Resultado Ficticia' }).id;
const EA = ins('encounters', { patient_id: PA, occurred_at: new Date(Date.now() - 3600000).toISOString(), timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
const hoje = new Date().toISOString().slice(0, 10);
const HA = rpc('salvar_holoscan_completo', { payload: payloadOficial(srv, pk.id, { patient_id: PA, encounter_id: EA, quando: hoje }) }).data;
const conc = new Date(Date.now() - 1800000).toISOString();
const T_OQ3 = ins('tool_applications', { patient_id: PA, encounter_id: EA, ferramenta_id: 'oq3', versao_ferramenta: '1', status: 'concluida', respostas: { quer: 'ter mais energia', precisa: 'dormir melhor', consegue: 'caminhar 10 minutos' }, iniciada_em: conc, concluida_em: conc }).id;
const T_ROD = ins('tool_applications', { patient_id: PA, encounter_id: EA, ferramenta_id: 'roda_vida', versao_ferramenta: '1', status: 'concluida', respostas: { saude: '4', relacoes: '7', puxa: 'trabalho' }, iniciada_em: conc, concluida_em: conc }).id;
const COND = rpc('salvar_conduta', { payload: { encounter_id: EA, status: 'salvo', objective: 'Reorganizar a rotina da noite', actions: 'Dormir antes das 23h três vezes por semana',
  nutrition_strategy: 'Montar um cardápio simples para a semana', professional_guidance: 'Caminhar 20 minutos de manhã', return_plan: 'Retorno em 30 dias',
  dietary_prescription: 'DIETA_NAO_DEVE_SER_GRAVADA', nutrition_diagnosis: 'DIAG_NAO', referrals: 'ENCAMINHA_NAO',
  agreements: [{ description: 'Avisar como foi a semana pelo WhatsApp', status: 'acordado' }] } });
ok(!COND.error, 'fixture: conduta salva (' + (COND.error ? COND.error.message : 'ok') + ')');
const condRow = srv.linhas('conducts')[0];
ok(condRow && condRow.dietary_prescription === null && condRow.nutrition_diagnosis === null && condRow.referrals === null && condRow.objective === 'Reorganizar a rotina da noite',
  'servidor: conduta nova nao guarda prescricao dietetica, diagnostico nutricional nem encaminhamentos');
const RES = rpc('salvar_resultado_holos', { payload: { patient_id: PA, encounter_id: EA, holoscan_application_id: HA, tool_application_ids: [T_OQ3, T_ROD],
  visao_paciente: { ferramentas: { [T_OQ3]: { mostrar: true }, [T_ROD]: { mostrar: false } } }, leitura_profissional: 'Leitura da nutri para a paciente', pontos_acompanhar: 'sono e rotina da noite', questoes_aprofundar: 'QUESTAO_SO_PROFISSIONAL' } });
ok(!RES.error, 'fixture: Resultado HOLOS salvo (' + (RES.error ? RES.error.message : 'ok') + ')');
const digitais = () => createHash('sha256').update(JSON.stringify(['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers', 'tool_applications', 'integrated_readings', 'lab_collections', 'lab_results',
  'methodology_packages', 'methodology_questions', 'methodology_associations', 'methodology_ranges', 'methodology_systems', 'integrated_reading_rule_packages', 'holos_results'].map(t => srv.linhas(t)))).digest('hex');
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
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
const abrirDocs = (P, pid) => P.evaluate(async (pid) => { window.levarParaFicha('aba:documentos', pid); await new Promise(r => setTimeout(r, 900)); }, pid);
const lista = (P) => P.evaluate(() => [...document.querySelectorAll('.bib-item')].map(it => ({ titulo: it.querySelector('.bib-titulo')?.textContent, tipo: it.querySelector('.doc-tipo')?.textContent,
  meta: it.querySelector('.bib-meta')?.innerText || '', obs: it.querySelector('.bib-obs')?.textContent || '', botoes: [...it.querySelectorAll('button')].map(b => b.textContent.trim()) })));
const texto = (P, sel) => P.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);

const A = await sessao();

/* ----- 1 ----- */
const ui = await A.evaluate(() => ({
  confronto: !!document.querySelector('.nav-item[data-secao="confronto"]') || !!document.getElementById('secao-confronto'),
  resultado: !!document.querySelector('.nav-item[data-secao="resultado"]') && !!document.getElementById('secao-resultado'),
  lab: !!window.Laboratorio || !!window.LabMotor || !!window.LeituraIntegradaMotor,
  campos: window.Conduta.CAMPOS.map(c => c[0])
}));
ok(!ui.confronto && ui.resultado && !ui.lab, 'menu: sem Leitura Integrada, com Resultado; nenhum módulo de laboratório carregado');
ok(!ui.campos.includes('dietary_prescription') && !ui.campos.includes('nutrition_diagnosis') && !ui.campos.includes('referrals') && ui.campos.includes('professional_guidance'),
  'Conduta na tela sem prescrição dietética, diagnóstico nutricional e encaminhamentos: ' + ui.campos.join(', '));
await abrirDocs(A, PA);
const docsUi = await A.evaluate(() => ({ campos: ['doc-tipo', 'doc-titulo', 'doc-data', 'doc-arquivo', 'doc-observacao'].every(id => !!document.getElementById(id)),
  tipos: [...document.querySelectorAll('#doc-tipo option')].map(o => o.textContent).join(','), semLab: !document.getElementById('lab-corpo') && !document.getElementById('ex-corpo') && !document.querySelector('[data-lancar]'),
  texto: document.getElementById('aba-documentos').innerText }));
ok(docsUi.campos && docsUi.tipos === 'Exame,Laudo,Receita,Encaminhamento,Documento,Outro' && docsUi.semLab && !/Lançar valores|Leitura Integrada|Painel legado/.test(docsUi.texto),
  'aba Documentos é a biblioteca: tipo, título, data, arquivo, observação; sem lançar valores');

/* ----- 2 ----- */
const campo = await A.$('#doc-arquivo');
await campo.uploadFile('amostras/receita-prontuario.pdf');
await espera(200);
await A.evaluate(async () => {
  document.getElementById('doc-tipo').value = 'Receita';
  document.getElementById('doc-titulo').value = 'Receita da dermatologista';
  document.getElementById('doc-data').value = '2026-10-01';
  document.getElementById('doc-observacao').value = 'trazida na consulta de retorno';
  document.getElementById('doc-guardar').click();
  await new Promise(r => setTimeout(r, 1200));
});
const doc = srv.linhas('documents')[0];
const objetos = () => Object.keys(srv.storage['patient-documents']);
ok(doc && doc.titulo === 'Receita da dermatologista' && doc.tipo === 'Receita' && doc.data_documento === '2026-10-01' && doc.observacao === 'trazida na consulta de retorno' && doc.nome === 'receita-prontuario.pdf' && doc.patient_id === PA && !doc.arquivado_em,
  'servidor: linha em documents com título, tipo, data, observação e nome do arquivo');
ok(objetos().length === 1 && objetos()[0] === doc.storage_path && doc.storage_path.indexOf(UA + '/' + PA + '/') === 0, 'servidor: o arquivo está no Storage, na pasta da conta/paciente');
const l2 = await lista(A);
ok(l2.length === 1 && l2[0].titulo === 'Receita da dermatologista' && l2[0].tipo === 'Receita' && /01\/10\/2026/.test(l2[0].meta) && /receita-prontuario\.pdf/.test(l2[0].meta) && /Enviado em/i.test(l2[0].meta)
  && /Nutri Teste Ficticia/.test(l2[0].meta) && l2[0].obs === 'trazida na consulta de retorno' && l2[0].botoes.join(',') === 'Abrir,Baixar,Arquivar',
  'lista: título, tipo, data, arquivo, envio, responsável (a nutricionista da conta), observação; Abrir/Baixar/Arquivar');
const abriu = await A.evaluate(() => new Promise(resolve => { const o = window.open; window.open = (u) => { window.open = o; resolve(!!u); }; document.querySelector('.bib-item [data-abrir]').click(); setTimeout(() => { window.open = o; resolve(false); }, 2000); }));
ok(abriu, '"Abrir" baixa o arquivo do Storage e abre (sem link público)');

/* ----- 3 ----- */
const B = await sessao();
await abrirDocs(B, PA);
const l3 = await lista(B);
ok(l3.length === 1 && l3[0].titulo === 'Receita da dermatologista' && l3[0].obs === 'trazida na consulta de retorno', 'outro dispositivo (mesma conta): vê o documento com título e observação');
const conteudoB = await B.evaluate(async () => { const it = await window.ArquivoStore.listar(window.pacienteAtivoId()); const r = await window.ArquivoStore.pegar(it[0].id); return (await r.arquivo.text()).slice(0, 4); });
ok(conteudoB === '%PDF', 'e abre o mesmo arquivo');
await B.close();

/* ----- 4 ----- */
await A.evaluate(async () => { document.querySelector('.bib-item [data-arquivar]').click(); await new Promise(r => setTimeout(r, 200)); document.getElementById('modal-confirmar-ok').click(); await new Promise(r => setTimeout(r, 700)); });
const docArq = srv.linhas('documents')[0];
ok(docArq.arquivado_em && docArq.arquivado_por === UA && objetos().length === 1 && (await lista(A)).length === 0, 'arquivar: sai da lista; a linha (com quem/quando) e o arquivo continuam');
await A.evaluate(async () => { document.querySelector('[data-acao="ver-arquivados"]').click(); await new Promise(r => setTimeout(r, 700)); });
const l4 = await lista(A);
ok(l4.length === 1 && /Arquivado em/i.test(l4[0].meta) && l4[0].botoes.includes('Restaurar'), '"Ver arquivados" mostra o arquivado com Restaurar');
await A.evaluate(async () => { document.querySelector('.bib-item [data-restaurar]').click(); await new Promise(r => setTimeout(r, 700)); });
const restaurou = { arquivados: (await lista(A)).length, linha: srv.linhas('documents')[0].arquivado_em };
await A.evaluate(async () => { document.querySelector('[data-acao="ver-arquivados"]').click(); await new Promise(r => setTimeout(r, 700)); });   /* "Voltar à lista" */
ok(!restaurou.linha && restaurou.arquivados === 0 && (await lista(A)).length === 1, 'Restaurar devolve à lista (arquivado_em volta a nulo; some dos arquivados, volta aos ativos)');

/* ----- 5 ----- */
const del = q('documents', 'delete', { filtros: [{ op: 'eq', col: 'id', val: doc.id }] });
srv.tratar({ op: 'storage', uid: UA, bucket: 'patient-documents', acaoStorage: 'remove', paths: [doc.storage_path] });
ok(del.error && del.error.code === '42501' && srv.linhas('documents').length === 1 && objetos().length === 1, 'servidor: DELETE de documento recusado e o arquivo registrado não sai do Storage');
const lab1 = rpc('salvar_coleta_laboratorial', { payload: { patient_id: PA, clinical_date: hoje, state: 'salvo', results: [{ exam_code: 'LAB-002', value_original_text: '5' }] } });
const lab2 = rpc('salvar_coleta_exames', { payload: { collection: { patient_id: PA, coletado_em: hoje }, results: [] } });
const lab3 = q('lab_collections', 'insert', { dados: { patient_id: PA, coletado_em: hoje, data_coleta_desconhecida: false } });
const li = rpc('salvar_leitura_integrada', { payload: { patient_id: PA, state: 'sem_dados_suficientes', responsible: 'x' } });
ok(lab1.error && lab1.error.hint === 'laboratorio_desativado' && lab2.error && lab2.error.hint === 'laboratorio_desativado' && lab3.error && lab3.error.code === '42501',
  'servidor: nova coleta/resultado estruturado recusada (RPCs: laboratorio_desativado; tabela: sem permissão)');
ok(li.error && li.error.hint === 'li_desativada' && srv.linhas('integrated_readings').length === 0, 'servidor: nova Leitura Integrada recusada (li_desativada)');

/* ----- 6 ----- */
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click(); }, PA);
await A.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 });
const rp = await A.evaluate(() => {
  const doc = document.getElementById('rp-doc');
  return { texto: doc.innerText, html: doc.innerHTML, paciente: !!doc.querySelector('.rh-doc-paciente'), aviso: document.getElementById('rp-aviso-termos')?.innerText || '',
    botoes: [...document.querySelectorAll('#rp-acoes button')].map(b => b.textContent.trim()), cab: document.querySelector('.rp-cab')?.innerText || '', rodape: document.querySelector('.rp-rodape')?.innerText || '' };
});
ok(rp.paciente && /Seu Mapa HOLOS/.test(rp.texto) && /Os cinco sistemas/.test(rp.texto) && /Leitura da nutri para a paciente/.test(rp.texto) && /OQ³/.test(rp.texto) && !/Roda Holística/.test(rp.texto),
  'Resultado: visão da paciente do Resultado HOLOS salvo (só as ferramentas marcadas para a paciente)');
ok(/Nutri Teste Ficticia/.test(rp.cab) && /CRN-3 00000/.test(rp.cab) && /Nutri Teste Ficticia · CRN-3 00000/.test(rp.rodape) && /não é diagnóstico/.test(rp.rodape), 'identidade profissional no cabeçalho e no rodapé (nome e registro)');
ok(/Próximos passos combinados/.test(rp.texto) && /Caminhar 20 minutos de manhã/.test(rp.texto) && /Avisar como foi a semana/.test(rp.texto) && /Retorno em 30 dias/.test(rp.texto), 'Conduta vigente: orientações, ações, retorno e combinados');
const semRodape = rp.texto.replace(/Não é exame, não é diagnóstico e não é prescrição\./, '');   /* a frase de fronteira do rodapé é a única menção legítima */
ok(!/DIETA_NAO|DIAG_NAO|ENCAMINHA_NAO|QUESTAO_SO_PROFISSIONAL|Pontuou neste sistema|hash|exame|Exame/.test(semRodape), 'nada profissional/interno vai para a paciente: sem prescrição, diagnóstico, encaminhamento, questões só profissionais, "pontuou", hash ou exames');
ok(/termos fora do método/.test(rp.aviso) && /cardápio/.test(rp.aviso), 'aviso SÓ NA TELA sobre termo fora do método no texto da nutri: ' + rp.aviso.slice(0, 60));
ok(rp.botoes.join(',') === 'Baixar PDF,Enviar pelo WhatsApp,Imprimir,Abrir na ficha', 'ações: ' + rp.botoes.join(' · '));
const numeros = await A.evaluate(() => ['(11) 98888-7777', '+55 11 98888-7777', '011 98888-7777', '5511988887777', '1198887777', '12345'].map(window.ResultadoPagina.numeroWhatsApp));
ok(numeros.join('|') === '5511988887777|5511988887777|5511988887777|5511988887777|551198887777|', 'número do WhatsApp: DDI 55 só quando falta; +55 não vira 5555: ' + numeros.join(' | '));
await A.evaluate(() => {
  window.html2pdf = () => ({ set() { return this; }, from() { return this; }, outputPdf() { return Promise.resolve(new Blob(['%PDF-1.4 falso'], { type: 'application/pdf' })); } });
  window.__baixados = []; const orig = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__baixados.push(this.download); return; } return orig.call(this); };
  window.__abertos = []; window.open = (u) => { window.__abertos.push(u); return {}; };
  try { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }); } catch (e) {}
});
await A.evaluate(async () => { document.querySelector('[data-rp-acao="pdf"]').click(); await new Promise(r => setTimeout(r, 600)); });
const pdf = await A.evaluate(() => ({ baixados: window.__baixados.slice(), gerando: document.body.classList.contains('rp-gerando') }));
ok(pdf.baixados.length === 1 && /^Resultado-HOLOS-Paciente-Prontuario-Ficticia\.pdf$/.test(pdf.baixados[0]) && !pdf.gerando, 'Baixar PDF: gera e baixa "' + pdf.baixados[0] + '" (nenhum link público)');
await A.evaluate(async () => { document.querySelector('[data-rp-acao="whatsapp"]').click(); await new Promise(r => setTimeout(r, 800)); });
const wa = await A.evaluate(() => ({ baixados: window.__baixados.slice(), abertos: window.__abertos.slice() }));
const url = wa.abertos[0] || '';
ok(wa.baixados.length === 2 && /^https:\/\/wa\.me\/5511988887777\?text=/.test(url) && /Resultado%20HOLOS/.test(url) && /Paciente/.test(decodeURIComponent(url)) && /Nutri%20Teste/.test(url),
  'WhatsApp (computador): baixa o PDF e abre a conversa da paciente (número do cadastro) com a mensagem pronta');
await A.setViewport({ width: 390, height: 800 }); await espera(300);
ok(await A.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), 'celular (390 px): sem rolagem lateral');
await A.setViewport({ width: 1366, height: 1000 });

/* ----- 7 ----- */
await A.evaluate(async (pid) => { window.definirPacienteAtivo(pid); await new Promise(r => setTimeout(r, 600)); }, PB);
await A.waitForFunction(() => !!document.getElementById('rp-vazio'), { timeout: 15000 });
const vazio = await A.evaluate(() => ({ t: document.getElementById('rp-vazio').innerText, botao: !!document.querySelector('#rp-vazio [data-rp-acao="ficha"]'), doc: !!document.getElementById('rp-doc') }));
ok(/Nenhum Resultado HOLOS finalizado/.test(vazio.t) && vazio.botao && !vazio.doc, 'sem resultado finalizado: convida a preparar na ficha, nada é inventado');

/* ----- 8 ----- */
const rel = rpc('emitir_relatorio', { payload: { patient_id: PA, title: 'Relatório teste', selected_sources: { lab_collection_ids: [], document_ids: [doc.id], conduct_ids: [condRow.id], holoscan_application_ids: [HA] } } });
const relRow = rel.error ? null : srv.linhas('report_emissions').find(r => r.id === rel.data);
const c = relRow && relRow.content_snapshot;
ok(c && !('exames' in c) && c.exames_incluidos === false && !('documentos' in c) && c.documentos_armazenados === 1 && !('dietary_prescription' in c.condutas[0]) && !('referrals' in c.condutas[0]) && /Caminhar 20/.test(c.condutas[0].professional_guidance),
  'relatório novo: sem exames, documento só como "1 armazenado", conduta sem os 3 campos' + (rel.error ? ' (' + rel.error.message + ')' : ''));

/* ----- 9 ----- */
ok(digitais() === antes, 'não interferência: HOLOSCAN, notas, respostas, ferramentas, metodologia, coletas e Leituras Integradas antigas e o Resultado HOLOS continuam idênticos');

console.log('');
ok(errosJS.length === 0, errosJS.length ? 'ERRO DE JS: ' + errosJS[0] : 'sem erro de JS');
await nav.close();
process.exit(falhou ? 1 : 0);
