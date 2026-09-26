/**
 * RECUPERACAO DE SENHA — testes da tela de recuperacao e da tela de nova senha.
 *
 * Tudo com stub: sem chamada de rede, sem CDN, sem Supabase real.
 * O que se testa e o comportamento da VIEW — validacao, estados, navegacao.
 */
import puppeteer from 'puppeteer-core';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1366, height: 900 });
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

/* ==================================================================== */
console.log('\n  A — TELA DE RECUPERACAO APARECE E VALIDA\n');
/* ==================================================================== */

const recup = await p.evaluate(async () => {
  document.getElementById('link-esqueci').click();
  await new Promise(r => setTimeout(r, 150));

  const tela = document.getElementById('tela-recuperar');
  const visivel = tela && !tela.hidden;
  const formLogin = document.getElementById('form-login');
  const loginEscondido = formLogin && formLogin.hidden;

  // Submit sem email
  document.getElementById('form-recuperar').requestSubmit();
  await new Promise(r => setTimeout(r, 100));
  const erroVazio = document.getElementById('erro-recuperar-email').textContent;

  // Submit com email invalido
  document.getElementById('recuperar-email').value = 'invalido';
  document.getElementById('form-recuperar').requestSubmit();
  await new Promise(r => setTimeout(r, 100));
  const erroFormato = document.getElementById('erro-recuperar-email').textContent;

  return { visivel, loginEscondido, erroVazio, erroFormato };
});

ok(recup.visivel, 'a tela de recuperacao esta visivel');
ok(recup.loginEscondido, 'o formulario de login esta escondido');
ok(/informe/i.test(recup.erroVazio), 'submit sem email mostra erro: "' + recup.erroVazio + '"');
ok(/válido/i.test(recup.erroFormato), 'email invalido mostra erro: "' + recup.erroFormato + '"');

/* ==================================================================== */
console.log('\n  B — RECUPERACAO COM STUB MOSTRA MENSAGEM NEUTRA\n');
/* ==================================================================== */

const envio = await p.evaluate(async () => {
  const original = window.AuthService.recuperarSenha;
  let chamou = false;
  window.AuthService.recuperarSenha = function (email) {
    chamou = true;
    return Promise.resolve({
      ok: true, motivo: null,
      mensagem: 'Se houver uma conta associada a este e-mail, enviaremos as instruções.'
    });
  };

  document.getElementById('recuperar-email').value = 'teste@clinica.com';
  document.getElementById('form-recuperar').requestSubmit();
  await new Promise(r => setTimeout(r, 300));

  const msg = document.getElementById('recuperar-mensagem').textContent;
  window.AuthService.recuperarSenha = original;
  return { chamou, msg };
});

ok(envio.chamou, 'AuthService.recuperarSenha foi chamado');
ok(/instruções/i.test(envio.msg), 'mensagem neutra exibida: "' + envio.msg + '"');
ok(!/enviamos.*link|verifique/i.test(envio.msg), 'nao afirma ter enviado um link especifico');

/* ==================================================================== */
console.log('\n  C — VOLTAR RETORNA AO LOGIN\n');
/* ==================================================================== */

const voltar = await p.evaluate(async () => {
  document.getElementById('link-voltar-login').click();
  await new Promise(r => setTimeout(r, 100));
  const formLogin = document.getElementById('form-login');
  const telaRecup = document.getElementById('tela-recuperar');
  return {
    loginVisivel: formLogin && !formLogin.hidden,
    recupEscondida: telaRecup && telaRecup.hidden,
  };
});

ok(voltar.loginVisivel, 'formulario de login reaparece ao clicar Voltar');
ok(voltar.recupEscondida, 'tela de recuperacao fica escondida');

/* ==================================================================== */
console.log('\n  D — TELA DE NOVA SENHA VALIDA CAMPOS\n');
/* ==================================================================== */

const novaSenha = await p.evaluate(async () => {
  const tela = document.getElementById('tela-nova-senha');
  if (!tela) return { existe: false };
  tela.hidden = false;
  document.getElementById('form-login').hidden = true;

  // Submit vazio
  document.getElementById('form-nova-senha').requestSubmit();
  await new Promise(r => setTimeout(r, 100));
  const erroVazia = document.getElementById('erro-nova-senha').textContent;

  // Senha curta
  document.getElementById('nova-senha').value = '123';
  document.getElementById('form-nova-senha').requestSubmit();
  await new Promise(r => setTimeout(r, 100));
  const erroCurta = document.getElementById('erro-nova-senha').textContent;

  // Senhas diferentes
  document.getElementById('nova-senha').value = 'senha-nova-ok';
  document.getElementById('confirmar-senha').value = 'outra-coisa';
  document.getElementById('form-nova-senha').requestSubmit();
  await new Promise(r => setTimeout(r, 100));
  const erroDiferente = document.getElementById('erro-confirmar-senha').textContent;

  tela.hidden = true;
  document.getElementById('form-login').hidden = false;

  return { existe: true, erroVazia, erroCurta, erroDiferente };
});

ok(novaSenha.existe, 'a tela de nova senha existe no HTML');
ok(/informe/i.test(novaSenha.erroVazia), 'campo vazio mostra erro: "' + novaSenha.erroVazia + '"');
ok(/6 caracteres/i.test(novaSenha.erroCurta), 'senha curta mostra erro: "' + novaSenha.erroCurta + '"');
ok(/coincidem/i.test(novaSenha.erroDiferente), 'senhas diferentes mostra erro: "' + novaSenha.erroDiferente + '"');

/* ==================================================================== */
console.log('\n  E — TROCAR SENHA COM STUB FUNCIONA\n');
/* ==================================================================== */

const troca = await p.evaluate(async () => {
  const tela = document.getElementById('tela-nova-senha');
  tela.hidden = false;
  document.getElementById('form-login').hidden = true;

  const original = window.AuthService.trocarSenha;
  let chamou = false;
  window.AuthService.trocarSenha = function (senha) {
    chamou = true;
    return Promise.resolve({ ok: true, motivo: null, mensagem: 'Senha alterada com sucesso.' });
  };

  document.getElementById('nova-senha').value = 'minha-nova-senha-123';
  document.getElementById('confirmar-senha').value = 'minha-nova-senha-123';
  document.getElementById('form-nova-senha').requestSubmit();
  await new Promise(r => setTimeout(r, 300));

  const msg = document.getElementById('nova-senha-mensagem').textContent;
  window.AuthService.trocarSenha = original;

  tela.hidden = true;
  document.getElementById('form-login').hidden = false;

  return { chamou, msg };
});

ok(troca.chamou, 'AuthService.trocarSenha foi chamado');
ok(/sucesso|alterada/i.test(troca.msg), 'mensagem de sucesso: "' + troca.msg + '"');

/* ==================================================================== */
console.log('\n  F — EMAIL PREENCHIDO E LEVADO PARA RECUPERACAO\n');
/* ==================================================================== */

const prefill = await p.evaluate(async () => {
  document.getElementById('login-email').value = 'meu@email.com';
  document.getElementById('link-esqueci').click();
  await new Promise(r => setTimeout(r, 100));
  const val = document.getElementById('recuperar-email').value;
  document.getElementById('link-voltar-login').click();
  return { emailLevado: val };
});

ok(prefill.emailLevado === 'meu@email.com', 'o email digitado no login e levado para a recuperacao: ' + prefill.emailLevado);

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
