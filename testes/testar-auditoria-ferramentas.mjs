/**
 * Correcao das ferramentas Corpo/Mente/Espirito (auditoria de producao com Cowork, 06/10). Navegador, modo local:
 *   1  nenhuma ferramenta conclui uma aplicacao VAZIA; leitura profissional vazia tambem e recusada
 *   2  OQ3: "Limpar" numa aplicacao salva comeca uma NOVA (com confirmacao) — a salva nao e sobrescrita
 *   4  o cabecalho da ferramenta diz a qual atendimento ela fica ligada
 *   5  OQ3 recusa data de consulta no futuro; editar uma aplicacao REVISADA nao a rebaixa para concluida
 *   7  o cartao do Espirito existe na apresentacao do dashboard
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1400, height: 1200 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

const espirito = await p.evaluate(() => !!document.querySelector('#dash-metodo .card-pilar[data-ir="espirito"]'));
ok(espirito, 'a apresentação do dashboard tem o cartão do Espírito');

await p.evaluate(async () => {
  window.__toasts = [];
  const t = document.getElementById('toast');
  new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true });
  document.querySelector('.nav-item[data-secao="pacientes"]').click();
  document.getElementById('btn-abrir-novo').click();
  document.getElementById('np-nome').value = 'Paciente Ferramentas Ficticio';
  document.getElementById('btn-salvar-paciente').click();
  await new Promise(r => setTimeout(r, 300));
});

/* ----- 1: nenhuma ferramenta conclui vazia ----- */
const FERR = [['corpo', 'linha_momentum'], ['corpo', 'mapa_rotina_v1'], ['mente', 'mapa_crencas'], ['mente', 'gatilhos_respostas_v1'],
  ['espirito', 'roda_vida'], ['espirito', 'carta_futuro'], ['espirito', 'conexao_pertencimento_v1']];
for (const [mod, id] of FERR) {
  const r = await p.evaluate(async (mod, id) => {
    document.querySelector('.nav-item[data-secao="' + mod + '"]').click();
    await new Promise(x => setTimeout(x, 150));
    const card = document.querySelector('[data-ferramenta="' + id + '"]');
    if (!card) return { semCard: true };
    card.click();
    await new Promise(x => setTimeout(x, 400));
    const cab = (document.querySelector('.vista-ferramenta:not(.hidden) .form-sub') || {}).textContent || '';
    const b = document.querySelector('.vista-ferramenta:not(.hidden) [data-acao="concluir"]');
    if (!b) return { semBotao: true, cab };
    b.click();
    await new Promise(x => setTimeout(x, 500));
    const app = window.Aplicacoes.ultima(id);
    const volta = document.querySelector('.vista-ferramenta:not(.hidden) .btn-voltar'); if (volta) volta.click();
    return { concluiu: !!(app && app.status === 'concluida'), cab };
  }, mod, id);
  ok(!r.semCard && !r.semBotao && !r.concluiu, id + ': concluir vazia é recusado' + (r.semCard ? ' (sem card)' : r.semBotao ? ' (sem botão)' : ''));
  if (id === 'linha_momentum') ok(/Sem atendimento selecionado/.test(r.cab), 'o cabeçalho diz que não há atendimento selecionado: ' + r.cab.slice(0, 90));
}

/* ----- 4 + 1 (leitura) + 5 (revisada): Mapa de Crencas com atendimento ----- */
const crencas = await p.evaluate(async () => {
  const e = await window.AtendimentoAtual.iniciar({ patient_id: window.pacienteAtivoId(), occurred_at: new Date(Date.now() - 3600000).toISOString() });
  document.querySelector('.nav-item[data-secao="mente"]').click();
  await new Promise(x => setTimeout(x, 150));
  document.querySelector('[data-ferramenta="mapa_crencas"]').click();
  await new Promise(x => setTimeout(x, 400));
  const v = document.querySelector('.vista-ferramenta:not(.hidden)');
  const cab = (v.querySelector('.form-sub') || {}).textContent || '';
  const campo = v.querySelector('.form-ferramenta textarea, .form-ferramenta input[type="text"]');
  campo.value = 'Comer à noite engorda'; campo.dispatchEvent(new Event('input', { bubbles: true }));
  v.querySelector('[data-acao="concluir"]').click();
  await new Promise(x => setTimeout(x, 500));
  const app = window.Aplicacoes.ultima('mapa_crencas');
  const v2 = document.querySelector('.vista-ferramenta:not(.hidden)');
  const rev = v2.querySelector('[data-acao="revisar"]');
  let leituraVazia = null;
  if (rev) { rev.click(); await new Promise(x => setTimeout(x, 300)); leituraVazia = window.Aplicacoes.ultima('mapa_crencas').status; }
  // leitura de verdade
  v2.querySelector('#leit-texto').value = 'Crença central ligada ao horário';
  rev.click(); await new Promise(x => setTimeout(x, 400));
  const statusRevisada = window.Aplicacoes.ultima('mapa_crencas').status;
  // editar a revisada
  const c2 = v2.querySelector('.form-ferramenta textarea, .form-ferramenta input[type="text"]');
  let statusDepois = null;
  if (c2 && !c2.disabled) {
    c2.value = 'Comer à noite engorda muito'; c2.dispatchEvent(new Event('input', { bubbles: true }));
    const b = v2.querySelector('[data-acao="concluir"]'); if (b) { b.click(); await new Promise(x => setTimeout(x, 500)); }
    statusDepois = window.Aplicacoes.ultima('mapa_crencas').status;
  }
  return { e: e.id, cab, enc: app && app.encounter_id, status: app && app.status, leituraVazia, statusRevisada, statusDepois };
});
ok(/Atendimento: /.test(crencas.cab) && crencas.enc === crencas.e, 'com atendimento selecionado, o cabeçalho mostra o atendimento e a aplicação fica ligada a ele');
ok(crencas.leituraVazia === 'concluida', 'registrar leitura profissional vazia é recusado (continua "concluida")');
ok(crencas.statusRevisada === 'revisada', 'com leitura escrita, vira "revisada"');
ok(crencas.statusDepois === null || crencas.statusDepois === 'revisada', 'editar a aplicação revisada mantém "revisada" (não volta para concluída sem aviso): ' + crencas.statusDepois);

/* ----- 2 + 5: OQ3 ----- */
const oq3 = await p.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="corpo"]').click();
  await new Promise(x => setTimeout(x, 150));
  document.querySelector('[data-vista="vista-oq3"]').click();
  await new Promise(x => setTimeout(x, 400));
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  // data no futuro
  const d = new Date(); d.setDate(d.getDate() + 30);
  set('oq3-data', d.toISOString().slice(0, 10)); set('oq3-quer', 'Primeira aplicação');
  window.__toasts.length = 0;
  document.getElementById('btn-salvar-oq3').click(); await new Promise(x => setTimeout(x, 400));
  const futuro = window.__toasts.join(' | ');
  set('oq3-data', '');
  document.getElementById('btn-salvar-oq3').click(); await new Promise(x => setTimeout(x, 500));
  const primeira = window.Aplicacoes.ultima('oq3');
  const idPrimeira = primeira && primeira.id;
  // Limpar numa aplicacao salva: modal, e comeca uma NOVA
  document.querySelector('[data-limpar="oq3"]').click(); await new Promise(x => setTimeout(x, 300));
  const titulo = document.getElementById('modal-confirmar-titulo').textContent;
  document.getElementById('modal-confirmar-ok').click(); await new Promise(x => setTimeout(x, 500));
  set('oq3-precisa', 'Só o precisa');
  document.getElementById('btn-salvar-oq3').click(); await new Promise(x => setTimeout(x, 500));
  const aPrimeira = window.Aplicacoes.historico('oq3').filter(a => a.id === idPrimeira)[0] || null;
  return { futuro, titulo, idPrimeira, quer: aPrimeira && aPrimeira.respostas && aPrimeira.respostas.quer,
    ultimaId: (window.Aplicacoes.ultima('oq3') || {}).id };
});
ok(/não pode estar no futuro/.test(oq3.futuro), 'OQ3 recusa data de consulta no futuro: ' + oq3.futuro.slice(0, 70));
ok(oq3.titulo === 'Começar uma nova aplicação', '"Limpar" numa aplicação salva pede confirmação (modal do app)');
ok(oq3.idPrimeira && oq3.ultimaId && oq3.ultimaId !== oq3.idPrimeira, 'e começa uma NOVA aplicação (a última agora é outra)');
ok(oq3.quer === 'Primeira aplicação', 'a aplicação salva não foi sobrescrita (o "quer" continua): ' + oq3.quer);

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou || ruim.length ? 1 : 0);
