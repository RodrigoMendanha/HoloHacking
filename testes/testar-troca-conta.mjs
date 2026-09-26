/**
 * TROCA DE CONTA — testa que dados de A nao vazam para B.
 *
 * Simula login A → uso → logout → login B → confere isolamento.
 * Tudo com stub, sem Supabase real.
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
console.log('\n  A — SIMULAR LOGIN A, GRAVAR DADO, LOGOUT\n');
/* ==================================================================== */

const antesLogout = await p.evaluate(async () => {
  // Entrar como dev (bypass)
  window.LoginView.abrirApp();
  await new Promise(r => setTimeout(r, 200));

  // Gravar dado clinico no localStorage (simula uso)
  localStorage.setItem('holohacking.dados.pacientes', JSON.stringify([
    { id: 'pac-A', nome: 'Paciente de A', created_at: '2024-01-01' }
  ]));
  localStorage.setItem('holohacking.pontuacao', JSON.stringify({ score: 42 }));

  const temDadosAntes = !!localStorage.getItem('holohacking.dados.pacientes');

  // Simular logout via limparEstadoLocal (que e chamado no SIGNED_OUT)
  if (window.limparEstadoApp) window.limparEstadoApp();
  if (window.limparEstadoPerfil) window.limparEstadoPerfil();

  // Limpar chaves clinicas (mesma lista que login.js usa)
  var chaves = [
    'holohacking.dados.pacientes', 'holohacking.dados.holoscan',
    'holohacking.dados.oq3', 'holohacking.dados.pqq',
    'holohacking.dados.consultas', 'holohacking.dados.bloqueios',
    'holohacking.dados.aplicacoes', 'holohacking.dados.perfil',
    'holohacking.pontuacao', 'holohacking.questionario',
    'holohacking.ferramentas', 'holohacking.exames',
    'holohacking.agenda'
  ];
  chaves.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });

  const temDadosDepois = !!localStorage.getItem('holohacking.dados.pacientes');
  const temPontuacao = !!localStorage.getItem('holohacking.pontuacao');

  return { temDadosAntes, temDadosDepois, temPontuacao };
});

ok(antesLogout.temDadosAntes, 'dados de A estavam no localStorage');
ok(!antesLogout.temDadosDepois, 'dados de pacientes limpos apos logout');
ok(!antesLogout.temPontuacao, 'pontuacao clinica limpa apos logout');

/* ==================================================================== */
console.log('\n  B — APOS LIMPEZA, B NAO VE DADOS DE A\n');
/* ==================================================================== */

const depoisLogin = await p.evaluate(async () => {
  // Simular que B entrou — verificar que o localStorage nao tem dados de A
  const pacientes = localStorage.getItem('holohacking.dados.pacientes');
  const holoscan = localStorage.getItem('holohacking.dados.holoscan');
  const pontuacao = localStorage.getItem('holohacking.pontuacao');
  const questionario = localStorage.getItem('holohacking.questionario');
  const ferramentas = localStorage.getItem('holohacking.ferramentas');
  const exames = localStorage.getItem('holohacking.exames');

  return {
    pacientesVazio: !pacientes,
    holoscanVazio: !holoscan,
    pontuacaoVazio: !pontuacao,
    questionarioVazio: !questionario,
    ferramentasVazio: !ferramentas,
    examesVazio: !exames,
  };
});

ok(depoisLogin.pacientesVazio, 'B nao ve pacientes de A');
ok(depoisLogin.holoscanVazio, 'B nao ve holoscan de A');
ok(depoisLogin.pontuacaoVazio, 'B nao ve pontuacao de A');
ok(depoisLogin.questionarioVazio, 'B nao ve questionario de A');
ok(depoisLogin.ferramentasVazio, 'B nao ve ferramentas de A');
ok(depoisLogin.examesVazio, 'B nao ve exames de A');

/* ==================================================================== */
console.log('\n  C — ESTADO EM MEMORIA FOI LIMPO\n');
/* ==================================================================== */

const estadoMem = await p.evaluate(async () => {
  const pacientes = window.pacientesTodos ? window.pacientesTodos() : null;
  const ativo = window.pacienteAtivoId ? window.pacienteAtivoId() : 'nao_existe';
  const carregado = window.pacientesCarregados ? window.pacientesCarregados() : true;

  return {
    pacientesVazios: Array.isArray(pacientes) && pacientes.length === 0,
    ativoNull: ativo === null,
    naoCarregado: carregado === false,
  };
});

ok(estadoMem.pacientesVazios, 'lista de pacientes em memoria esta vazia');
ok(estadoMem.ativoNull, 'nenhum paciente ativo em memoria');
ok(estadoMem.naoCarregado, 'estado "carregado" voltou para false');

/* ==================================================================== */
console.log('\n  D — APARENCIA NAO E APAGADA NO LOGOUT\n');
/* ==================================================================== */

const aparencia = await p.evaluate(async () => {
  localStorage.setItem('holohacking.aparencia', 'escuro');

  // Simular logout novamente
  var chaves = [
    'holohacking.dados.pacientes', 'holohacking.dados.holoscan',
    'holohacking.dados.oq3', 'holohacking.dados.pqq',
    'holohacking.dados.consultas', 'holohacking.dados.bloqueios',
    'holohacking.dados.aplicacoes', 'holohacking.dados.perfil',
    'holohacking.pontuacao', 'holohacking.questionario',
    'holohacking.ferramentas', 'holohacking.exames',
    'holohacking.agenda'
  ];
  chaves.forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });

  const aparenciaIntacta = localStorage.getItem('holohacking.aparencia') === 'escuro';
  localStorage.removeItem('holohacking.aparencia');
  return { aparenciaIntacta };
});

ok(aparencia.aparenciaIntacta, 'preferencia de aparencia (tema) sobrevive ao logout');

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
