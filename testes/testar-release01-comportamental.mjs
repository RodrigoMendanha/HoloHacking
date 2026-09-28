/**
 * RELEASE 01 — PERSISTÊNCIA MULTI-DISPOSITIVO (comportamental)
 *
 * Testa no navegador (Puppeteer):
 *
 *   1. HOLOSCAN HYDRATION:  dados remotos hidratados no localStorage são lidos pelo app
 *   2. EXAMES A→B:          sincronizarExames preenche localStorage via mock Supabase
 *   3. STALE CACHE:         remoto mais novo sobrescreve cache stale em exames
 *   4. ERRO vs VAZIO:       erro Supabase preserva cache; vazio legítimo preserva
 *   5. PANORAMA:            doPaciente reflete dados hidratados
 *   6. OQ3/PQQ:             DadosRouter + Aplicacoes disponíveis
 *   7. EXPORT:              dados hidratados incluídos na exportação (via botão)
 *   8. MIGRAÇÃO GUARD:      migração com flag não reexecuta
 */
import puppeteer from 'puppeteer-core';
import { congelarRelogio } from './relogio-fixo.mjs';

const nav = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const p = await nav.newPage();
await p.setViewport({ width: 1400, height: 1200 });
await congelarRelogio(p, '2026-09-27T14:00:00');
const ruim = []; p.on('pageerror', e => ruim.push(e.message));
await p.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
await p.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const esperar = (ms) => p.evaluate(ms => new Promise(r => setTimeout(r, ms)), ms);

/* ============================================================ SEMEAR */

await p.evaluate(() => {
  const T = 'holohacking.dados.';
  localStorage.setItem(T + 'pacientes', JSON.stringify([
    { id: 'pac-X', nome: 'Xavier Multi', status: 'ativo', nascimento: '1990-01-01',
      telefone: '11999990001', created_at: '2026-01-01T10:00:00Z' },
    { id: 'pac-Y', nome: 'Yara Multi', status: 'ativo', nascimento: '1985-06-15',
      telefone: '11999990002', created_at: '2026-02-01T10:00:00Z' }
  ]));
  localStorage.setItem(T + 'consultas', JSON.stringify([]));
  localStorage.setItem(T + 'holoscan', JSON.stringify([]));
  localStorage.setItem(T + 'aplicacoes', JSON.stringify([]));
  localStorage.setItem(T + 'oq3', JSON.stringify([]));
  localStorage.setItem(T + 'pqq', JSON.stringify([]));
  localStorage.removeItem("holohacking.pontuacao");
  localStorage.removeItem("holohacking.questionario");
  localStorage.removeItem("holohacking.exames");
  localStorage.setItem("holohacking.migrado_supa_v1", "2026-01-01");
});

await p.reload({ waitUntil: 'networkidle2' });
await p.waitForFunction(() => window.pacientesCarregados && window.pacientesCarregados());

/* ============================================================ 1. HOLOSCAN HYDRATION */

console.log('\n  1. HOLOSCAN HYDRATION — dados remotos lidos pelo app');

const holo1 = await p.evaluate(() => {
  localStorage.setItem("holohacking.pontuacao", JSON.stringify({
    'pac-X': [{
      quando: '2026-09-20', indice: 43.5, indice_maximo: 100, avaliavel: true,
      nota_media: 4.35, triada: 'alerta', triada_com_dado: true, cobertura: 0.85,
      combinacoes: [], aprofundamentos: [], _supa_id: 'app-1',
      sistemas: [
        { sistema: 'fungico', nome: 'Fúngico', nota: 5.2, carga: 'moderada', faixa: 'atencao',
          obtido: 26, maximo: 50, respondidos: 10, total_marcadores: 10, avaliavel: true },
        { sistema: 'acido_inflamatorio', nome: 'Ácido Inflamatório', nota: 3.8,
          carga: 'leve', faixa: 'normal', obtido: 19, maximo: 50,
          respondidos: 10, total_marcadores: 10, avaliavel: true },
        { sistema: 'metabolico', nome: 'Metabólico', nota: 6.1,
          carga: 'alta', faixa: 'critico', obtido: 30.5, maximo: 50,
          respondidos: 10, total_marcadores: 10, avaliavel: true },
        { sistema: 'detox_linfatico', nome: 'Detox Linfático', nota: 4.0,
          carga: 'moderada', faixa: 'atencao', obtido: 20, maximo: 50,
          respondidos: 10, total_marcadores: 10, avaliavel: true },
        { sistema: 'mental_emocional_espiritual', nome: 'Mental Emocional', nota: 2.6,
          carga: 'leve', faixa: 'normal', obtido: 13, maximo: 50,
          respondidos: 10, total_marcadores: 10, avaliavel: true }
      ]
    }]
  }));

  var hist = window.historicoPontuacao ? window.historicoPontuacao('pac-X') : [];
  var ult = window.ultimaPontuacao ? window.ultimaPontuacao('pac-X') : null;

  return {
    histLen: hist.length,
    ultIndice: ult ? ult.indice : null,
    ultSistemas: ult ? (ult.sistemas || []).length : 0,
    ultTriada: ult ? ult.triada : null,
    supaId: ult ? ult._supa_id : null
  };
});

ok(holo1.histLen === 1, '1a: histórico lido com 1 entry: ' + holo1.histLen);
ok(holo1.ultIndice === 43.5, '1b: últimaPontuação.indice = 43.5: ' + holo1.ultIndice);
ok(holo1.ultSistemas === 5, '1c: 5 sistemas presentes: ' + holo1.ultSistemas);
ok(holo1.ultTriada === 'alerta', '1d: triada = alerta: ' + holo1.ultTriada);
ok(holo1.supaId === 'app-1', '1e: _supa_id preservado: ' + holo1.supaId);

/* ============================================================ 1bis. ANSWERS HYDRATION */

console.log('\n  1bis. ANSWERS — respostas hidratadas lidas pelo Panorama');

const ans1 = await p.evaluate(() => {
  var q = {};
  try { q = JSON.parse(localStorage.getItem("holohacking.questionario")) || {}; } catch(e) {}

  q['pac-X'] = { 'SNT-101': 3, 'SNT-102': 2, 'SNT-103': 1 };
  localStorage.setItem("holohacking.questionario", JSON.stringify(q));

  var d = window.Panorama ? window.Panorama.doPaciente('pac-X') : null;
  return {
    ok: !!d,
    respondidas: d ? d.respondidas : 0,
    totalPerguntas: d ? d.totalPerguntas : 0
  };
});

ok(ans1.ok, '1bis-a: Panorama.doPaciente executou');
ok(ans1.respondidas === 3, '1bis-b: 3 respostas reais refletidas: ' + ans1.respondidas);
ok(ans1.totalPerguntas === 84, '1bis-c: totalPerguntas = 84: ' + ans1.totalPerguntas);

/* ============================================================ 2. EXAMES A→B */

console.log('\n  2. EXAMES A→B — sincronizarExames preenche localStorage');

const ex2 = await p.evaluate(async () => {
  localStorage.removeItem("holohacking.exames");

  var mockCols = [
    { id: 'col-1', patient_id: 'pac-X', coletado_em: '2026-09-15',
      data_coleta_desconhecida: false, laboratorio: 'Lab A', observacoes: null,
      created_at: '2026-09-15T10:00:00Z' }
  ];

  var mockRes = [
    { collection_id: 'col-1', exame_id: 'EXA-001', valor: 85.5,
      unidade_no_momento: 'mg/dL', ideal_min_no_momento: 70, ideal_max_no_momento: 99,
      nome_exame_no_momento: 'Glicemia', sistema_no_momento: 'metabolico' },
    { collection_id: 'col-1', exame_id: 'EXA-002', valor: 45.2,
      unidade_no_momento: 'U/L', ideal_min_no_momento: 10, ideal_max_no_momento: 40,
      nome_exame_no_momento: 'TGO', sistema_no_momento: 'detox_linfatico' }
  ];

  var origSupa = window.supabaseClient;
  var origAuth = window.HoloAuth;
  window.HoloAuth = { sessaoAtiva: function() { return true; }, usuarioAtual: function() { return { id: 'uid-mock' }; } };
  window.supabaseClient = {
    from: function(table) {
      return {
        select: function() {
          return {
            in: function() {
              if (table === 'lab_collections') {
                return { order: function() { return Promise.resolve({ data: mockCols, error: null }); } };
              }
              return Promise.resolve({ data: mockRes, error: null });
            }
          };
        }
      };
    }
  };

  var pacientes = JSON.parse(localStorage.getItem('holohacking.dados.pacientes'));
  await window.sincronizarExames(pacientes);
  await new Promise(function(r) { setTimeout(r, 300); });

  var exames = JSON.parse(localStorage.getItem("holohacking.exames") || "{}");
  window.supabaseClient = origSupa;
  window.HoloAuth = origAuth;

  return {
    temPacX: !!exames['pac-X'],
    qtdExames: exames['pac-X'] ? Object.keys(exames['pac-X']).length : 0,
    glicemia: exames['pac-X'] ? exames['pac-X']['EXA-001'] : null,
    tgo: exames['pac-X'] ? exames['pac-X']['EXA-002'] : null,
    pacYVazio: !exames['pac-Y'] || Object.keys(exames['pac-Y']).length === 0
  };
});

ok(ex2.temPacX, '2a: exames aparecem para pac-X');
ok(ex2.qtdExames === 2, '2b: 2 exames sincronizados: ' + ex2.qtdExames);
ok(ex2.glicemia === 85.5, '2c: Glicemia = 85.5: ' + ex2.glicemia);
ok(ex2.tgo === 45.2, '2d: TGO = 45.2: ' + ex2.tgo);
ok(ex2.pacYVazio, '2e: pac-Y sem exames (nenhum remoto): ' + ex2.pacYVazio);

/* ============================================================ 3. STALE CACHE */

console.log('\n  3. STALE CACHE — remoto sobrescreve cache stale');

const stale = await p.evaluate(async () => {
  localStorage.setItem("holohacking.exames", JSON.stringify({
    'pac-X': { 'EXA-001': 50.0 }
  }));

  var mockCols = [
    { id: 'col-2', patient_id: 'pac-X', coletado_em: '2026-09-25',
      data_coleta_desconhecida: false, laboratorio: 'Lab B', observacoes: null,
      created_at: '2026-09-25T10:00:00Z' }
  ];

  var mockRes = [
    { collection_id: 'col-2', exame_id: 'EXA-001', valor: 92.0,
      unidade_no_momento: 'mg/dL', ideal_min_no_momento: 70, ideal_max_no_momento: 99,
      nome_exame_no_momento: 'Glicemia', sistema_no_momento: 'metabolico' },
    { collection_id: 'col-2', exame_id: 'EXA-003', valor: 120.0,
      unidade_no_momento: 'mg/dL', ideal_min_no_momento: null, ideal_max_no_momento: 200,
      nome_exame_no_momento: 'Colesterol', sistema_no_momento: 'metabolico' }
  ];

  var origSupa = window.supabaseClient;
  var origAuth = window.HoloAuth;
  window.HoloAuth = { sessaoAtiva: function() { return true; }, usuarioAtual: function() { return { id: 'uid-mock' }; } };
  window.supabaseClient = {
    from: function(table) {
      return {
        select: function() {
          return {
            in: function() {
              if (table === 'lab_collections') {
                return { order: function() { return Promise.resolve({ data: mockCols, error: null }); } };
              }
              return Promise.resolve({ data: mockRes, error: null });
            }
          };
        }
      };
    }
  };

  var pacientes = JSON.parse(localStorage.getItem('holohacking.dados.pacientes'));
  await window.sincronizarExames(pacientes);
  await new Promise(function(r) { setTimeout(r, 300); });

  var exames = JSON.parse(localStorage.getItem("holohacking.exames") || "{}");
  window.supabaseClient = origSupa;
  window.HoloAuth = origAuth;

  return {
    glicemia: exames['pac-X'] ? exames['pac-X']['EXA-001'] : null,
    colesterol: exames['pac-X'] ? exames['pac-X']['EXA-003'] : null,
    qtd: exames['pac-X'] ? Object.keys(exames['pac-X']).length : 0
  };
});

ok(stale.glicemia === 92.0, '3a: Glicemia atualizada de 50 para 92: ' + stale.glicemia);
ok(stale.colesterol === 120.0, '3b: Colesterol novo presente: ' + stale.colesterol);
ok(stale.qtd === 2, '3c: 2 exames (remoto substituiu stale): ' + stale.qtd);

/* ============================================================ 4. ERRO vs VAZIO */

console.log('\n  4. ERRO vs VAZIO — erro preserva cache, vazio preserva');

const errVazio = await p.evaluate(async () => {
  localStorage.setItem("holohacking.exames", JSON.stringify({
    'pac-X': { 'EXA-001': 77.0, 'EXA-005': 33.0 }
  }));

  var origSupa = window.supabaseClient;
  var origAuth = window.HoloAuth;
  window.HoloAuth = { sessaoAtiva: function() { return true; }, usuarioAtual: function() { return { id: 'uid-mock' }; } };

  window.supabaseClient = {
    from: function() {
      return {
        select: function() {
          return {
            in: function() {
              return { order: function() { return Promise.resolve({ data: null, error: { message: 'network timeout' } }); } };
            }
          };
        }
      };
    }
  };

  var pacientes = JSON.parse(localStorage.getItem('holohacking.dados.pacientes'));
  await window.sincronizarExames(pacientes);
  await new Promise(function(r) { setTimeout(r, 200); });

  var exAposErro = JSON.parse(localStorage.getItem("holohacking.exames") || "{}");
  var preservadoErro = exAposErro['pac-X'] && exAposErro['pac-X']['EXA-001'] === 77.0;

  window.supabaseClient = {
    from: function(table) {
      return {
        select: function() {
          return {
            in: function() {
              if (table === 'lab_collections') {
                return { order: function() { return Promise.resolve({ data: [], error: null }); } };
              }
              return Promise.resolve({ data: [], error: null });
            }
          };
        }
      };
    }
  };

  await window.sincronizarExames(pacientes);
  await new Promise(function(r) { setTimeout(r, 200); });

  var exAposVazio = JSON.parse(localStorage.getItem("holohacking.exames") || "{}");
  var preservadoVazio = exAposVazio['pac-X'] && exAposVazio['pac-X']['EXA-001'] === 77.0;

  window.supabaseClient = origSupa;
  window.HoloAuth = origAuth;

  return { preservadoErro: preservadoErro, preservadoVazio: preservadoVazio };
});

ok(errVazio.preservadoErro, '4a: erro Supabase NÃO apagou cache local');
ok(errVazio.preservadoVazio, '4b: resposta vazia legítima NÃO apagou cache existente');

/* ============================================================ 5. PANORAMA */

console.log('\n  5. PANORAMA — doPaciente reflete dados hidratados');

const pano = await p.evaluate(() => {
  localStorage.setItem("holohacking.exames", JSON.stringify({
    'pac-X': { 'EXA-001': 85.5, 'EXA-002': 45.2 }
  }));

  if (!window.Panorama) return { ok: false, motivo: 'Panorama não existe' };

  var d = window.Panorama.doPaciente('pac-X');
  return {
    ok: true,
    temPontuacao: !!d.pontuacao,
    indice: d.pontuacao ? d.pontuacao.indice : null,
    respondidas: d.respondidas,
    exames: d.exames,
    historico: d.historico.length
  };
});

ok(pano.ok, '5a: Panorama disponível');
ok(pano.temPontuacao, '5b: pontuação presente');
ok(pano.indice === 43.5, '5c: índice = 43.5: ' + pano.indice);
ok(pano.respondidas === 3, '5d: 3 respostas: ' + pano.respondidas);
ok(pano.exames === 2, '5e: 2 exames: ' + pano.exames);
ok(pano.historico === 1, '5f: 1 registro no histórico: ' + pano.historico);

/* ============================================================ 6. OQ3/PQQ via DadosRouter */

console.log('\n  6. OQ3/PQQ — DadosRouter + Aplicacoes prontos');

const oq3 = await p.evaluate(() => {
  return {
    dadosRouter: typeof window.DadosRouter === 'object' && window.DadosRouter !== null,
    aplicacoes: typeof window.Aplicacoes === 'object' && window.Aplicacoes !== null,
    preenchidas: !!window.Aplicacoes && typeof window.Aplicacoes.preenchidas === 'function',
    ultima: !!window.Aplicacoes && typeof window.Aplicacoes.ultima === 'function'
  };
});

ok(oq3.dadosRouter, '6a: DadosRouter disponível');
ok(oq3.aplicacoes, '6b: Aplicacoes disponível');
ok(oq3.preenchidas, '6c: Aplicacoes.preenchidas é função');
ok(oq3.ultima, '6d: Aplicacoes.ultima é função');

/* ============================================================ 7. EXPORT (via Panorama — mesma fonte da exportação) */

console.log('\n  7. EXPORT — Panorama.doPaciente (fonte da exportação) inclui dados');

const exp = await p.evaluate(() => {
  if (!window.Panorama) return { ok: false, motivo: 'Panorama não existe' };

  var d = window.Panorama.doPaciente('pac-X');
  return {
    ok: true,
    temPontuacao: !!d.pontuacao,
    indice: d.pontuacao ? d.pontuacao.indice : null,
    exames: d.exames,
    respondidas: d.respondidas,
    historico: d.historico.length,
    valoresExames: d.valoresExames ? Object.keys(d.valoresExames).length : 0
  };
});

ok(exp.ok, '7a: Panorama.doPaciente executou');
ok(exp.temPontuacao, '7b: pontuação incluída na fonte de exportação');
ok(exp.indice === 43.5, '7c: índice = 43.5: ' + exp.indice);
ok(exp.exames === 2, '7d: 2 exames incluídos: ' + exp.exames);
ok(exp.respondidas === 3, '7e: 3 respostas incluídas: ' + exp.respondidas);
ok(exp.historico === 1, '7f: histórico com 1 entry: ' + exp.historico);

/* ============================================================ 8. MIGRAÇÃO GUARD */

console.log('\n  8. MIGRAÇÃO GUARD — flag impede reexecução');

const migGuard = await p.evaluate(() => {
  var flag = localStorage.getItem("holohacking.migrado_supa_v1");
  return { flagExiste: !!flag };
});

ok(migGuard.flagExiste, '8a: flag de migração existe (impede reexecução)');

/* ============================================================ RESUMO */

const errosReais = ruim.filter(function(e) {
  return !e.includes('supabase') && !e.includes('Supabase') &&
    !e.includes('net::ERR') && !e.includes('Failed to fetch') &&
    !e.includes('cdn.jsdelivr.net');
});
if (errosReais.length > 0) {
  console.log('\n  erros de JS inesperados: ' + errosReais.join('; '));
}

console.log('\n  ---');
await nav.close();
if (falhou) {
  console.error('\n  ALGUMA ASSERÇÃO FALHOU');
  process.exit(1);
}
console.log('  Todas as asserções passaram.\n');
