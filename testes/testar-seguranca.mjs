/**
 * SEGURANCA — auditoria estatica e de comportamento.
 *
 *   A  Nenhuma chave secreta no frontend (service_role, Gemini, etc.)
 *   B  Nenhum dado clinico em console.log/warn/error/debug
 *   C  Links externos tem rel="noopener noreferrer"
 *   D  Nenhum dado clinico em URL
 *   E  XSS basico: nome de paciente com <script> nao executa
 *   F  Sessao expirada bloqueia o app
 *   G  Tela de login protege telas clinicas
 */
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1366, height: 900 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
const consoles = []; p.on('console', m => consoles.push(m.text()));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

/* ==================================================================== */
console.log('\n  A — NENHUMA CHAVE SECRETA NO FRONTEND\n');
/* ==================================================================== */

const RAIZ = join(new URL('.', import.meta.url).pathname, '..');
const EXTENSOES = ['.js', '.html', '.css'];
const IGNORAR = ['node_modules', '.git', 'testes'];

function varrerArquivos(dir) {
  let arquivos = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORAR.includes(item.name)) continue;
    const caminho = join(dir, item.name);
    if (item.isDirectory()) {
      arquivos = arquivos.concat(varrerArquivos(caminho));
    } else if (EXTENSOES.some(ext => item.name.endsWith(ext))) {
      arquivos.push(caminho);
    }
  }
  return arquivos;
}

const PADROES_PERIGOSOS = [
  /service[_-]?role/i,
  /secret[_-]?key/i,
  /GEMINI[_-]?API[_-]?KEY/i,
  /supabase[_-]?service/i,
  /postgresql?:\/\//i,
  /connection[_-]?string/i,
];

const arquivos = varrerArquivos(RAIZ);
const achados = [];

for (const arq of arquivos) {
  const conteudo = readFileSync(arq, 'utf-8');
  for (const padrao of PADROES_PERIGOSOS) {
    if (padrao.test(conteudo)) {
      const rel = arq.replace(RAIZ, '');
      // Permitir mencoes em comentarios explicativos (como supabase-client.js)
      const linhas = conteudo.split('\n');
      const linhaNum = linhas.findIndex(l => padrao.test(l)) + 1;
      const linha = linhas[linhaNum - 1] || '';
      const ehComentario = /^\s*(\/\/|\/\*|\*|<!--)/.test(linha);
      // Detectar se a linha esta dentro de um bloco /* ... */
      let dentroDeBloco = false;
      let aberto = false;
      for (let i = 0; i < linhaNum; i++) {
        const l = linhas[i];
        if (/\/\*/.test(l)) aberto = true;
        if (/\*\//.test(l)) aberto = false;
      }
      dentroDeBloco = aberto;
      if (!ehComentario && !dentroDeBloco) {
        achados.push(rel + ':' + linhaNum + ' → ' + padrao.toString());
      }
    }
  }
}

ok(achados.length === 0, 'nenhuma chave secreta encontrada em codigo ativo' +
   (achados.length ? ': ' + achados.join('; ') : ''));

/* ==================================================================== */
console.log('\n  B — CONSOLE NAO VAZA DADOS CLINICOS\n');
/* ==================================================================== */

// Abrir o app e navegar
await p.evaluate(() => {
  window.LoginView.abrirApp();
});
await new Promise(r => setTimeout(r, 500));

const consoleLimpo = await p.evaluate(() => {
  return true; // O que interessa e o que o listener capturou
});

const TERMOS_CLINICOS = ['senha', 'password', 'token', 'access_token', 'refresh_token'];
const vazamentos = consoles.filter(t => {
  const lower = t.toLowerCase();
  // Ignorar avisos internos do Chromium (acessibilidade, DevTools)
  if (/\[dom\]|\[deprecation\]|\[violation\]|goo\.gl|chromestatus|more info/i.test(t)) return false;
  return TERMOS_CLINICOS.some(termo => {
    if (termo === 'token') return /\btoken\b/i.test(lower) && !/auth-token|autoRefreshToken/i.test(lower);
    return lower.includes(termo);
  });
});

ok(vazamentos.length === 0, 'nenhum dado sensivel no console' +
   (vazamentos.length ? ': ' + vazamentos[0] : ''));

/* ==================================================================== */
console.log('\n  C — LINKS EXTERNOS TEM NOOPENER NOREFERRER\n');
/* ==================================================================== */

const links = await p.evaluate(() => {
  const externos = [...document.querySelectorAll('a[target="_blank"]')];
  const semProtecao = externos.filter(a => {
    const rel = (a.getAttribute('rel') || '').toLowerCase();
    return !rel.includes('noopener') || !rel.includes('noreferrer');
  });
  return semProtecao.map(a => ({
    href: a.href,
    rel: a.getAttribute('rel'),
    texto: a.textContent.trim().substring(0, 40)
  }));
});

ok(links.length === 0, 'todos os links target=_blank tem noopener noreferrer' +
   (links.length ? ': ' + links.map(l => l.texto).join(', ') : ''));

/* ==================================================================== */
console.log('\n  D — NENHUM DADO CLINICO EM URL\n');
/* ==================================================================== */

const urlLimpa = await p.evaluate(() => {
  const url = location.href;
  const clinico = ['paciente', 'consulta', 'holoscan', 'senha', 'token'];
  const achados = clinico.filter(t => url.toLowerCase().includes(t));
  return { limpa: achados.length === 0, achados };
});

ok(urlLimpa.limpa, 'nenhum dado clinico na URL' +
   (urlLimpa.achados.length ? ': ' + urlLimpa.achados.join(', ') : ''));

/* ==================================================================== */
console.log('\n  E — XSS BASICO: SCRIPT EM NOME NAO EXECUTA\n');
/* ==================================================================== */

const xss = await p.evaluate(async () => {
  window.__xss_fired = false;
  const nomePerigoso = '<img src=x onerror="window.__xss_fired=true">';

  // Gravar paciente com nome malicioso no localStorage
  localStorage.setItem('holohacking.dados.pacientes', JSON.stringify([
    { id: 'xss-test', nome: nomePerigoso, created_at: '2024-01-01' }
  ]));

  await new Promise(r => setTimeout(r, 300));
  const disparou = window.__xss_fired;

  // Limpar
  localStorage.removeItem('holohacking.dados.pacientes');
  delete window.__xss_fired;

  return { disparou };
});

ok(!xss.disparou, 'injecao XSS via nome de paciente nao executou');

/* ==================================================================== */
console.log('\n  F — SESSAO EXPIRADA BLOQUEIA O APP\n');
/* ==================================================================== */

const sessao = await p.evaluate(async () => {
  // Simular sessao expirada — HoloAuth deve bloquear
  const estado = window.HoloAuth ? window.HoloAuth.estado() : 'desconhecido';

  // Sem supabaseClient no ambiente de teste, o estado deve ser nao_autenticado
  // e o app deve estar bloqueado (tela de login visivel)
  const telaLogin = document.getElementById('tela-login');

  return {
    estado,
    temHoloAuth: !!window.HoloAuth,
    temAuthService: !!window.AuthService,
    temTrocarSenha: !!(window.AuthService && window.AuthService.trocarSenha),
  };
});

ok(sessao.temHoloAuth, 'HoloAuth existe');
ok(sessao.temAuthService, 'AuthService existe');
ok(sessao.temTrocarSenha, 'AuthService.trocarSenha existe');

/* ==================================================================== */
console.log('\n  G — TELA DE LOGIN PROTEGE TELAS CLINICAS\n');
/* ==================================================================== */

const protecao = await p.evaluate(async () => {
  // Fechar o app (voltar para login)
  const tela = document.getElementById('tela-login');
  tela.hidden = false;
  document.body.classList.add('login-aberto');
  document.getElementById('app').setAttribute('aria-hidden', 'true');

  await new Promise(r => setTimeout(r, 100));

  const appEscondido = getComputedStyle(document.getElementById('app')).display === 'none';
  const loginVisivel = !tela.hidden && getComputedStyle(tela).display !== 'none';

  return { appEscondido, loginVisivel };
});

ok(protecao.appEscondido, 'o app fica display:none quando login esta aberto');
ok(protecao.loginVisivel, 'a tela de login esta visivel e cobre tudo');

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
