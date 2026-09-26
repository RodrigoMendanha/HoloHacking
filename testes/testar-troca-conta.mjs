/**
 * TROCA DE CONTA — testa isolamento completo entre contas.
 *
 * A  Login A → grava dados → logout (stash)
 * B  Login B → confirma que nao ve dados de A
 * C  Logout B → Login A → dados de A restaurados
 * D  IndexedDB uid isolation (ArquivoStore)
 * E  Legado nao atribuido — registro sem uid invisivel para user autenticado
 * F  Aparencia sobrevive ao logout
 * G  Memoria limpa no logout
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

const UID_A = 'uid-conta-a-1234';
const UID_B = 'uid-conta-b-5678';

/* ==================================================================== */
console.log('\n  A — LOGIN A, GRAVAR DADOS, LOGOUT (STASH)\n');
/* ==================================================================== */

const secA = await p.evaluate(async (uidA) => {
  window.LoginView.abrirApp();
  await new Promise(r => setTimeout(r, 200));

  // Gravar dados clinicos de A
  localStorage.setItem('holohacking.dados.pacientes', JSON.stringify([
    { id: 'pac-A', nome: 'Paciente de A', created_at: '2024-01-01' }
  ]));
  localStorage.setItem('holohacking.pontuacao', JSON.stringify({ score: 42 }));
  localStorage.setItem('holohacking.questionario', JSON.stringify({ q1: 'sim' }));
  localStorage.setItem('holohacking.exames', JSON.stringify({ glicose: 90 }));
  localStorage.setItem('holohacking.aparencia', 'escuro');

  const temAntes = !!localStorage.getItem('holohacking.dados.pacientes');
  const temPontAntes = !!localStorage.getItem('holohacking.pontuacao');

  // Logout A via hook exposto em dev
  window._testeIsolamento.limpar(uidA);

  const temDepois = !!localStorage.getItem('holohacking.dados.pacientes');
  const temPontDepois = !!localStorage.getItem('holohacking.pontuacao');

  // Verificar que stash foi gravado
  const stashPac = localStorage.getItem('holohacking._stash.' + uidA + '.holohacking.dados.pacientes');
  const stashPont = localStorage.getItem('holohacking._stash.' + uidA + '.holohacking.pontuacao');
  const stashQuest = localStorage.getItem('holohacking._stash.' + uidA + '.holohacking.questionario');
  const stashExames = localStorage.getItem('holohacking._stash.' + uidA + '.holohacking.exames');

  return {
    temAntes, temPontAntes,
    temDepois, temPontDepois,
    stashPacOk: !!stashPac,
    stashPontOk: !!stashPont,
    stashQuestOk: !!stashQuest,
    stashExamesOk: !!stashExames,
  };
}, UID_A);

ok(secA.temAntes, 'A: dados gravados antes do logout');
ok(!secA.temDepois, 'A: dados.pacientes limpos apos logout');
ok(!secA.temPontDepois, 'A: pontuacao limpa apos logout');
ok(secA.stashPacOk, 'A: stash gravou pacientes de A');
ok(secA.stashPontOk, 'A: stash gravou pontuacao de A');
ok(secA.stashQuestOk, 'A: stash gravou questionario de A');
ok(secA.stashExamesOk, 'A: stash gravou exames de A');

/* ==================================================================== */
console.log('\n  B — LOGIN B, NAO VE DADOS DE A\n');
/* ==================================================================== */

const secB = await p.evaluate(async (uidB) => {
  // Restaurar estado de B (nao tem stash, nada deve aparecer)
  window._testeIsolamento.restaurar(uidB);

  const pacientes = localStorage.getItem('holohacking.dados.pacientes');
  const pontuacao = localStorage.getItem('holohacking.pontuacao');
  const questionario = localStorage.getItem('holohacking.questionario');
  const exames = localStorage.getItem('holohacking.exames');
  const holoscan = localStorage.getItem('holohacking.dados.holoscan');
  const ferramentas = localStorage.getItem('holohacking.ferramentas');

  // B grava seus proprios dados
  localStorage.setItem('holohacking.dados.pacientes', JSON.stringify([
    { id: 'pac-B', nome: 'Paciente de B', created_at: '2024-06-01' }
  ]));
  localStorage.setItem('holohacking.pontuacao', JSON.stringify({ score: 99 }));

  return {
    pacVazio: !pacientes,
    pontVazio: !pontuacao,
    questVazio: !questionario,
    examVazio: !exames,
    holoVazio: !holoscan,
    ferrVazio: !ferramentas,
  };
}, UID_B);

ok(secB.pacVazio, 'B: nao ve pacientes de A');
ok(secB.pontVazio, 'B: nao ve pontuacao de A');
ok(secB.questVazio, 'B: nao ve questionario de A');
ok(secB.examVazio, 'B: nao ve exames de A');
ok(secB.holoVazio, 'B: nao ve holoscan de A');
ok(secB.ferrVazio, 'B: nao ve ferramentas de A');

/* ==================================================================== */
console.log('\n  C — LOGOUT B, LOGIN A, DADOS DE A RESTAURADOS\n');
/* ==================================================================== */

const secC = await p.evaluate(async (uidA, uidB) => {
  // Logout B
  window._testeIsolamento.limpar(uidB);

  // Verificar que B foi guardado no stash
  const stashBPac = localStorage.getItem('holohacking._stash.' + uidB + '.holohacking.dados.pacientes');

  // Verificar que area principal esta limpa
  const mainVazio = !localStorage.getItem('holohacking.dados.pacientes');

  // Login A — restaurar
  window._testeIsolamento.restaurar(uidA);

  const pacA = localStorage.getItem('holohacking.dados.pacientes');
  const pontA = localStorage.getItem('holohacking.pontuacao');
  const questA = localStorage.getItem('holohacking.questionario');
  const examA = localStorage.getItem('holohacking.exames');

  let pacOk = false;
  let pontOk = false;
  let questOk = false;
  let examOk = false;
  try {
    const arr = JSON.parse(pacA);
    pacOk = Array.isArray(arr) && arr[0] && arr[0].id === 'pac-A';
    pontOk = JSON.parse(pontA).score === 42;
    questOk = JSON.parse(questA).q1 === 'sim';
    examOk = JSON.parse(examA).glicose === 90;
  } catch (e) { /* parse failure = not ok */ }

  return {
    stashBPacOk: !!stashBPac,
    mainVazio,
    pacOk, pontOk, questOk, examOk,
  };
}, UID_A, UID_B);

ok(secC.stashBPacOk, 'C: stash gravou dados de B ao sair');
ok(secC.mainVazio, 'C: area principal limpa entre B→A');
ok(secC.pacOk, 'C: pacientes de A restaurados (pac-A)');
ok(secC.pontOk, 'C: pontuacao de A restaurada (42)');
ok(secC.questOk, 'C: questionario de A restaurado');
ok(secC.examOk, 'C: exames de A restaurados');

/* ==================================================================== */
console.log('\n  D — INDEXEDDB UID ISOLATION (ARQUIVOSTORE)\n');
/* ==================================================================== */

const secD = await p.evaluate(async (uidA, uidB) => {
  if (!window.ArquivoStore) return { skip: true };

  // Helper: write directly to IndexedDB to avoid salvar()'s File expectation
  function idbPut(reg) {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('holohacking', 1);
      req.onsuccess = function () {
        var tx = req.result.transaction('arquivos', 'readwrite');
        var put = tx.objectStore('arquivos').put(reg);
        put.onsuccess = function () { resolve(); };
        put.onerror = function () { reject(put.error); };
      };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbDel(id) {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('holohacking', 1);
      req.onsuccess = function () {
        var tx = req.result.transaction('arquivos', 'readwrite');
        var del = tx.objectStore('arquivos').delete(id);
        del.onsuccess = function () { resolve(); };
        del.onerror = function () { reject(del.error); };
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  // Stub HoloAuth to return uid A
  var uidAtual = uidA;
  var authOriginal = window.HoloAuth;
  window.HoloAuth = {
    sessaoAtiva: function () { return true; },
    usuarioAtual: function () { return { id: uidAtual }; },
    estado: function () { return 'autenticado'; },
    aoMudarEstado: function () {},
  };

  // Write records directly to IndexedDB with uid fields
  await idbPut({ id: 'doc-A1', paciente: 'pac-A', nome: 'exame-A.pdf', tipo: 'application/pdf', uid: uidA });
  await idbPut({ id: 'doc-B1', paciente: 'pac-B', nome: 'exame-B.pdf', tipo: 'application/pdf', uid: uidB });

  // List as A — should only see A's doc
  var listaA = await window.ArquivoStore.listarTudo();
  var aVeDocA = listaA.some(function (d) { return d.id === 'doc-A1'; });
  var aVeDocB = listaA.some(function (d) { return d.id === 'doc-B1'; });

  // pegar estrito — A pega doc-A1 mas nao doc-B1
  var pegaA = await window.ArquivoStore.pegar('doc-A1');
  var pegaB = await window.ArquivoStore.pegar('doc-B1');

  // B cannot remove A's doc even knowing the ID
  var bRemoveAErro = false;
  uidAtual = uidB;
  try {
    await window.ArquivoStore.remover('doc-A1');
  } catch (e) {
    bRemoveAErro = true;
  }

  // Confirm doc-A1 still exists in IDB after B's failed removal
  var docA1Sobrevive = await new Promise(function (resolve, reject) {
    var req = indexedDB.open('holohacking', 1);
    req.onsuccess = function () {
      var tx = req.result.transaction('arquivos', 'readonly');
      var get = tx.objectStore('arquivos').get('doc-A1');
      get.onsuccess = function () { resolve(!!get.result); };
      get.onerror = function () { reject(get.error); };
    };
  });

  // B sees only B's doc
  var listaB = await window.ArquivoStore.listarTudo();
  var bVeDocA = listaB.some(function (d) { return d.id === 'doc-A1'; });
  var bVeDocB = listaB.some(function (d) { return d.id === 'doc-B1'; });

  // B can remove own doc
  var bRemoveBOk = false;
  try {
    await window.ArquivoStore.remover('doc-B1');
    bRemoveBOk = true;
  } catch (e) { /* failed */ }

  // Switch back to A — A can still pegar own doc, and can remove it
  uidAtual = uidA;
  var pegaAFinal = await window.ArquivoStore.pegar('doc-A1');
  var aRemoveAOk = false;
  try {
    await window.ArquivoStore.remover('doc-A1');
    aRemoveAOk = true;
  } catch (e) { /* failed */ }

  // Restore original
  window.HoloAuth = authOriginal;

  return {
    skip: false,
    bNaoVeA: !bVeDocA,
    bVeB: bVeDocB,
    aVeA: aVeDocA,
    aNaoVeB: !aVeDocB,
    pegaAOk: !!pegaA && pegaA.id === 'doc-A1',
    pegaBNull: !pegaB,
    bRemoveAErro: bRemoveAErro,
    docA1Sobrevive: docA1Sobrevive,
    bRemoveBOk: bRemoveBOk,
    pegaAFinalOk: !!pegaAFinal && pegaAFinal.id === 'doc-A1',
    aRemoveAOk: aRemoveAOk,
  };
}, UID_A, UID_B);

if (secD.skip) {
  console.log('  SKIP  ArquivoStore nao disponivel');
} else {
  ok(secD.bNaoVeA, 'D: B nao ve documento de A no IndexedDB');
  ok(secD.bVeB, 'D: B ve seu proprio documento');
  ok(secD.aVeA, 'D: A ve seu proprio documento');
  ok(secD.aNaoVeB, 'D: A nao ve documento de B');
  ok(secD.pegaAOk, 'D: pegar doc-A1 como A retorna registro');
  ok(secD.pegaBNull, 'D: pegar doc-B1 como A retorna undefined');
  ok(secD.bRemoveAErro, 'D: B nao consegue remover doc de A (erro)');
  ok(secD.docA1Sobrevive, 'D: doc-A1 ainda existe no IDB apos tentativa de B');
  ok(secD.bRemoveBOk, 'D: B consegue remover seu proprio doc');
  ok(secD.pegaAFinalOk, 'D: A ainda pega doc-A1 apos tentativa de B');
  ok(secD.aRemoveAOk, 'D: A consegue remover seu proprio doc');
}

/* ==================================================================== */
console.log('\n  E — LEGADO NAO ATRIBUIDO (SEM UID) INVISIVEL\n');
/* ==================================================================== */

const secE = await p.evaluate(async (uidA) => {
  if (!window.ArquivoStore) return { skip: true };

  // Helper: write/delete directly to IndexedDB
  function idbPut(reg) {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('holohacking', 1);
      req.onsuccess = function () {
        var tx = req.result.transaction('arquivos', 'readwrite');
        var put = tx.objectStore('arquivos').put(reg);
        put.onsuccess = function () { resolve(); };
        put.onerror = function () { reject(put.error); };
      };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbDel(id) {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('holohacking', 1);
      req.onsuccess = function () {
        var tx = req.result.transaction('arquivos', 'readwrite');
        var del = tx.objectStore('arquivos').delete(id);
        del.onsuccess = function () { resolve(); };
        del.onerror = function () { reject(del.error); };
      };
      req.onerror = function () { reject(req.error); };
    });
  }

  // Write legacy record directly (no uid field)
  await idbPut({ id: 'doc-legado', paciente: 'pac-X', nome: 'legado.pdf', tipo: 'application/pdf' });

  // Confirm it has no uid
  var regBruto = await new Promise(function (resolve, reject) {
    var db = indexedDB.open('holohacking', 1);
    db.onsuccess = function () {
      var tx = db.result.transaction('arquivos', 'readonly');
      var req = tx.objectStore('arquivos').get('doc-legado');
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    };
    db.onerror = function () { reject(db.error); };
  });
  var semUid = regBruto && !regBruto.uid;

  // Authenticate as A
  var authOriginal = window.HoloAuth;
  window.HoloAuth = {
    sessaoAtiva: function () { return true; },
    usuarioAtual: function () { return { id: uidA }; },
    estado: function () { return 'autenticado'; },
    aoMudarEstado: function () {},
  };

  // listarTudo as A — must NOT include legacy
  var lista = await window.ArquivoStore.listarTudo();
  var veDocLegado = lista.some(function (d) { return d.id === 'doc-legado'; });

  // pegar legacy as A — must return undefined
  var pegaLegado = await window.ArquivoStore.pegar('doc-legado');

  // A cannot remove legacy record (uid mismatch: undefined !== uidA)
  var removerLegadoErro = false;
  try {
    await window.ArquivoStore.remover('doc-legado');
  } catch (e) {
    removerLegadoErro = true;
  }

  // Confirm legacy still exists after failed removal
  var legadoSobrevive = await new Promise(function (resolve, reject) {
    var db = indexedDB.open('holohacking', 1);
    db.onsuccess = function () {
      var tx = db.result.transaction('arquivos', 'readonly');
      var req = tx.objectStore('arquivos').get('doc-legado');
      req.onsuccess = function () { resolve(!!req.result); };
      req.onerror = function () { reject(req.error); };
    };
    db.onerror = function () { reject(db.error); };
  });

  // Cleanup
  window.HoloAuth = authOriginal;
  await idbDel('doc-legado');

  return {
    skip: false,
    semUid: semUid,
    invisivelNaLista: !veDocLegado,
    pegarRetornaUndef: !pegaLegado,
    removerLegadoErro: removerLegadoErro,
    legadoSobrevive: legadoSobrevive,
  };
}, UID_A);

if (secE.skip) {
  console.log('  SKIP  ArquivoStore nao disponivel');
} else {
  ok(secE.semUid, 'E: registro legado gravado sem uid');
  ok(secE.invisivelNaLista, 'E: legado nao atribuido invisivel na listagem de A');
  ok(secE.pegarRetornaUndef, 'E: pegar legado como A retorna undefined');
  ok(secE.removerLegadoErro, 'E: A nao consegue remover registro legado (erro)');
  ok(secE.legadoSobrevive, 'E: legado permanece no IndexedDB apos tentativa');
}

/* ==================================================================== */
console.log('\n  F — APARENCIA SOBREVIVE AO LOGOUT\n');
/* ==================================================================== */

const secF = await p.evaluate(async (uidA) => {
  localStorage.setItem('holohacking.aparencia', 'escuro');
  window._testeIsolamento.limpar(uidA);
  var aparenciaIntacta = localStorage.getItem('holohacking.aparencia') === 'escuro';
  localStorage.removeItem('holohacking.aparencia');
  return { aparenciaIntacta };
}, UID_A);

ok(secF.aparenciaIntacta, 'F: preferencia de aparencia (tema) sobrevive ao logout');

/* ==================================================================== */
console.log('\n  G — MEMORIA LIMPA NO LOGOUT\n');
/* ==================================================================== */

const secG = await p.evaluate(async () => {
  var pacientes = window.pacientesTodos ? window.pacientesTodos() : null;
  var ativo = window.pacienteAtivoId ? window.pacienteAtivoId() : 'nao_existe';
  var carregado = window.pacientesCarregados ? window.pacientesCarregados() : true;

  return {
    pacientesVazios: Array.isArray(pacientes) && pacientes.length === 0,
    ativoNull: ativo === null,
    naoCarregado: carregado === false,
  };
});

ok(secG.pacientesVazios, 'G: lista de pacientes em memoria vazia');
ok(secG.ativoNull, 'G: nenhum paciente ativo em memoria');
ok(secG.naoCarregado, 'G: estado "carregado" voltou para false');

/* ==================================================================== */
console.log('\n  H — RESTORE NAO PERMITE BYPASS DE OWNERSHIP\n');
/* ==================================================================== */

const secH = await p.evaluate(async (uidA, uidB) => {
  if (!window.ArquivoStore) return { skip: true };

  var authOriginal = window.HoloAuth;
  window.HoloAuth = {
    sessaoAtiva: function () { return true; },
    usuarioAtual: function () { return { id: uidB }; },
    estado: function () { return 'autenticado'; },
    aoMudarEstado: function () {},
  };

  // B tries to restore records that belong to A — must be rejected
  var restoreAlheioErro = false;
  try {
    await window.ArquivoStore.substituirTudoEstrito([
      { id: 'doc-restore-1', paciente: 'pac-A', nome: 'r1.pdf', uid: uidA }
    ]);
  } catch (e) {
    restoreAlheioErro = true;
  }

  // B restores own records — must succeed and stamp uid
  var restoreProprioOk = false;
  try {
    await window.ArquivoStore.substituirTudoEstrito([
      { id: 'doc-restore-2', paciente: 'pac-B', nome: 'r2.pdf' }
    ]);
    restoreProprioOk = true;
  } catch (e) { /* failed */ }

  // Check that the restored record got uid=B
  var regRestaurado = await new Promise(function (resolve, reject) {
    var req = indexedDB.open('holohacking', 1);
    req.onsuccess = function () {
      var tx = req.result.transaction('arquivos', 'readonly');
      var get = tx.objectStore('arquivos').get('doc-restore-2');
      get.onsuccess = function () { resolve(get.result); };
      get.onerror = function () { reject(get.error); };
    };
    req.onerror = function () { reject(req.error); };
  });
  var uidEstampado = regRestaurado && regRestaurado.uid === uidB;

  // B restores record with own uid explicitly — must succeed
  var restoreComUidOk = false;
  try {
    await window.ArquivoStore.substituirTudoEstrito([
      { id: 'doc-restore-3', paciente: 'pac-B', nome: 'r3.pdf', uid: uidB }
    ]);
    restoreComUidOk = true;
  } catch (e) { /* failed */ }

  // Cleanup via direct IDB
  function idbClear() {
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open('holohacking', 1);
      req.onsuccess = function () {
        var tx = req.result.transaction('arquivos', 'readwrite');
        var clr = tx.objectStore('arquivos').clear();
        clr.onsuccess = function () { resolve(); };
        clr.onerror = function () { reject(clr.error); };
      };
      req.onerror = function () { reject(req.error); };
    });
  }
  await idbClear();
  window.HoloAuth = authOriginal;

  return {
    skip: false,
    restoreAlheioErro: restoreAlheioErro,
    restoreProprioOk: restoreProprioOk,
    uidEstampado: uidEstampado,
    restoreComUidOk: restoreComUidOk,
  };
}, UID_A, UID_B);

if (secH.skip) {
  console.log('  SKIP  ArquivoStore nao disponivel');
} else {
  ok(secH.restoreAlheioErro, 'H: restore com uid de outro usuario e rejeitado');
  ok(secH.restoreProprioOk, 'H: restore de registros proprios funciona');
  ok(secH.uidEstampado, 'H: registro sem uid recebe uid do usuario atual no restore');
  ok(secH.restoreComUidOk, 'H: restore com uid proprio explicito funciona');
}

/* ==================================================================== */
/* Limpeza final — remover stashes de teste */
/* ==================================================================== */
await p.evaluate((uidA, uidB) => {
  var prefixos = ['holohacking._stash.' + uidA + '.', 'holohacking._stash.' + uidB + '.'];
  var toRemove = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (prefixos.some(function (p) { return k.indexOf(p) === 0; })) toRemove.push(k);
  }
  toRemove.forEach(function (k) { localStorage.removeItem(k); });
  // Limpar chaves clinicas residuais
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
}, UID_A, UID_B);

await nav.close();
console.log(ruim.length ? '\n  ERRO: ' + ruim[0] : '\n  sem erro de JS');
process.exit(falhou ? 1 : 0);
