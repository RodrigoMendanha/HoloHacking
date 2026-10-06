/**
 * Correcao do Perfil (auditoria de producao com Cowork, 06/10). Navegador, modo local:
 *   1  nome vazio nao salva (assina os documentos); 2 e-mail invalido nao salva
 *   5  o aviso "sem registro / sem assinatura" so aparece com o que de fato falta
 *   6  cor digitada invalida: aviso e campo marcado; a cor salva nao muda
 *   8  o fuso diz que muda data e hora dos registros clinicos
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1400, height: 1100 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

const r = await p.evaluate(async () => {
  const espera = ms => new Promise(x => setTimeout(x, ms));
  document.querySelector('.nav-item[data-secao="perfil"]').click();
  document.querySelector('[data-aba-perfil="perfil"]').click();
  await espera(200);
  const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  const salvarEAviso = async () => { document.getElementById('btn-salvar-perfil').click(); await espera(300); return (document.getElementById('perfil-aviso') || {}).textContent || ''; };
  set('pf-nome', 'Nome Original'); await salvarEAviso();
  const fuso = document.getElementById('pf-fuso').parentElement.innerText;
  set('pf-nome', ''); const avNome = await salvarEAviso();
  const nomeGuardado = window.Perfil.atual().nome;
  set('pf-nome', 'Nome Original'); set('pf-email', 'email-invalido'); const avEmail = await salvarEAviso();
  const emailGuardado = window.Perfil.atual().email || '';
  set('pf-email', ''); set('pf-registro', 'CRN-0 00000'); await salvarEAviso();
  const porque = (document.querySelector('.perf-porque') || {}).textContent || '';
  document.querySelector('[data-aba-perfil="marca"]').click(); await espera(200);
  const corTxt = document.getElementById('pf-cor_primaria-texto');
  const corAntes = window.Perfil.atual().cor_primaria;
  corTxt.value = 'azul'; corTxt.dispatchEvent(new Event('input', { bubbles: true })); await espera(150);
  return { fuso, avNome, nomeGuardado, avEmail, emailGuardado, porque,
    corMarcada: corTxt.classList.contains('perf-invalido'), corDepois: window.Perfil.atual().cor_primaria, corAntes };
});
ok(/Informe o nome completo/.test(r.avNome) && r.nomeGuardado === 'Nome Original', 'nome vazio não salva: ' + r.avNome.slice(0, 60));
ok(/E-mail inválido/.test(r.avEmail) && r.emailGuardado !== 'email-invalido', 'e-mail inválido não salva');
ok(!/registro profissional/.test(r.porque) && (/assinatura/.test(r.porque) || r.porque === ''), 'o aviso diz só o que falta (registro preenchido sai do aviso): "' + r.porque.slice(0, 80) + '"');
ok(r.corMarcada && r.corDepois === r.corAntes, 'cor "azul" fica marcada como inválida e a cor salva não muda');
ok(/registros clínicos/.test(r.fuso), 'o fuso avisa que muda data e hora dos registros clínicos');

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou || ruim.length ? 1 : 0);
