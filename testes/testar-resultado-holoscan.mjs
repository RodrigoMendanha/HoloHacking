/**
 * Resultado do HOLOSCAN (testes reais 06/10). Supabase falso, com conta:
 *   1  a nota e a faixa de cada sistema aparecem nos cinco cartoes (fora da homologacao)
 *   2  quadro "Resultado desta aplicacao": sistemas do mais baixo ao mais alto e "Por onde investigar"
 *      com os dois de nota mais baixa; nenhum "Por onde comecar" com texto fixo
 *   3  gerar de novo com as MESMAS respostas depois de salvar nao mostra "nao salvo no servidor"
 *      nem cria pendencia; o Salvar diz que ja esta salvo
 *   4  a interpretacao escrita no quadro vai para o servidor
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { semearHolosAprovado } from './holos-aprovado.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const PA = q('patients', 'insert', { dados: { nome: 'Paciente Resultado Ficticio' } }).data[0].id;

const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const A = await (await nav.createBrowserContext()).newPage();
await A.setViewport({ width: 1400, height: 1000 });
A.on('pageerror', e => errosJS.push(e.message));
await ligarPagina(A, srv);
await A.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await A.waitForSelector('#login-email', { visible: true });
await A.type('#login-email', 'a@holo.test'); await A.type('#login-senha', 'senha-a-123'); await A.click('#btn-entrar');
await A.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await A.waitForFunction(() => window.HoloscanOficial && window.HoloscanOficial.disponivel(), { timeout: 15000 });
await A.evaluate(() => {
  window.__toasts = [];
  const t = document.getElementById('toast');
  new MutationObserver(() => { if (t.textContent) window.__toasts.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true });
});

const gerar = () => A.evaluate(async () => {
  document.querySelector('.nav-item[data-secao="holoscan"]').click();
  await new Promise(r => setTimeout(r, 250));
  document.getElementById('btn-abrir-questionario').click();
  await new Promise(r => setTimeout(r, 250));
  const itens = [...document.querySelectorAll('.q-item[data-marcador]')];
  itens.forEach((it, i) => { const b = it.querySelectorAll('.q-btn')[(i * 7) % 4]; if (!b.classList.contains('marcado')) b.click(); });
  document.querySelector('[data-acao="calcular"]').click();
  await new Promise(r => setTimeout(r, 700));
});

await A.evaluate(async (pid) => {
  window.definirPacienteAtivo(pid);
  await window.AtendimentoAtual.iniciar({ patient_id: pid, occurred_at: new Date(Date.now() - 600000).toISOString() });
}, PA);
await gerar();

/* ----- 1 e 2 ----- */
const tela = await A.evaluate(() => {
  const cards = [...document.querySelectorAll('.holo-card')].map(c => {
    const v = c.querySelector('.holo-valor');
    return { nota: v.textContent, visivel: v.offsetParent !== null, faixa: c.querySelector('.holo-faixa-card').textContent };
  });
  const res = document.getElementById('holo-resumo');
  return {
    cards, resVisivel: !res.classList.contains('hidden'), resTxt: res.innerText,
    ordem: [...res.querySelectorAll('.res-sis .res-nota')].map(x => parseFloat(x.textContent.replace(',', '.'))),
    investigar: [...res.querySelectorAll('.res-inv b')].map(b => b.textContent),
    primeiros: [...res.querySelectorAll('.res-sis .res-nome')].slice(0, 2).map(x => x.textContent),
    porOndeComecar: /Por onde começar/.test(document.getElementById('secao-holoscan').innerText),
    legado: /Estagnação e desordem|plexo solar/i.test(document.getElementById('secao-holoscan').innerText)
  };
});
ok(tela.cards.length === 5 && tela.cards.every(c => c.visivel && /^\d/.test(c.nota) && /^faixa /.test(c.faixa)),
   'os cinco cartões mostram nota e faixa: ' + tela.cards.map(c => c.nota + ' ' + c.faixa).join(' · '));
ok(!tela.legado, 'os cartões não trazem mais os rótulos emocionais da versão antiga');
ok(tela.resVisivel && /Resultado desta aplicação/i.test(tela.resTxt), 'aparece o quadro "Resultado desta aplicação"');
ok(tela.ordem.length === 5 && tela.ordem.every((v, i, a) => i === 0 || a[i - 1] <= v), 'sistemas do mais baixo ao mais alto: ' + tela.ordem.join(', '));
ok(tela.investigar.length === 2 && tela.investigar[0] === tela.primeiros[0] && tela.investigar[1] === tela.primeiros[1],
   '"Por onde investigar" traz os dois sistemas de nota mais baixa: ' + tela.investigar.join(', '));
ok(!tela.porOndeComecar, 'o bloco fixo "Por onde começar" saiu');

/* ----- 3: salvar, gerar de novo igual ----- */
await A.evaluate(async () => { document.getElementById('btn-salvar-holoscan').click(); await new Promise(r => setTimeout(r, 1000)); });
const n1 = srv.linhas('holoscan_applications').length;
await gerar();
const dep = await A.evaluate(async (pid) => {
  const selo = document.querySelectorAll('#secao-holoscan .selo-nao-salvo').length;
  const alertas = window.Panorama.alertas(window.Panorama.doPaciente(pid)).map(a => a.curto);
  window.__toasts.length = 0;
  document.getElementById('btn-salvar-holoscan').click();
  await new Promise(r => setTimeout(r, 800));
  return { selo, alertas, msg: window.__toasts.join(' | '), hist: window.historicoPontuacao(pid).length };
}, PA);
ok(n1 === 1, 'a primeira aplicação foi salva no servidor');
ok(dep.selo === 0 && !dep.alertas.some(a => /não salvo/.test(a)), 'gerar de novo com as mesmas respostas não mostra "não salvo no servidor" nem cria pendência: ' + dep.alertas.join(','));
ok(srv.linhas('holoscan_applications').length === 1 && /já está salvo|já estava salva/.test(dep.msg) && dep.hist === 1,
   'salvar de novo não duplica e diz que já está salvo: ' + dep.msg.slice(0, 80));

/* ----- 4: interpretacao ----- */
const it = await A.evaluate(async () => {
  document.getElementById('res-interp-texto').value = 'Leitura de teste';
  document.getElementById('res-interp-salvar').click();
  await new Promise(r => setTimeout(r, 800));
  return document.getElementById('res-interp-estado').textContent;
});
ok(/salva no servidor/.test(it) && srv.linhas('holoscan_applications')[0].interpretacao_texto === 'Leitura de teste', 'a interpretação escrita no quadro vai para o servidor: ' + it);

ok(errosJS.length === 0, 'nenhum erro de JavaScript na pagina' + (errosJS.length ? ': ' + errosJS.join(' | ').slice(0, 200) : ''));
await nav.close();
if (falhou) process.exitCode = 1;
