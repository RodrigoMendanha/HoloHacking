/**
 * RELEASE 01 — VALIDAÇÃO ARQUITETURAL (PERSISTÊNCIA MULTI-DISPOSITIVO)
 *
 * Verifica, a partir do código-fonte, que:
 *
 *   A) sincronizarHistoricoHoloscan distingue erro vs vazio
 *   B) sincronizarRespostasHoloscan existe e hidrata questionário
 *   C) sincronizarExames distingue erro vs vazio e remoto vence stale
 *   D) Deduplicação por _supa_id no histórico HOLOSCAN
 *   E) carregarHoloscan é chamado após sync atualizar localStorage
 *   F) Panorama lê de localStorage (beneficia-se da hidratação)
 *   G) OQ3/PQQ/ferramentas passam por DadosRouter (já multi-device)
 *   H) Migração tem guarda de idempotência
 *   I) Isolamento por conta (RLS + uid)
 */
import { readFileSync } from 'fs';
import { join } from 'path';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

const ROOT = join(import.meta.url.replace('file://', ''), '..', '..');

function lerArquivo(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

const appJs = lerArquivo('app.js');
const arquivosJs = lerArquivo('arquivos.js');
const panoramaJs = lerArquivo('panorama.js');
const aplicacoesJs = lerArquivo('aplicacoes.js');
const migracaoJs = lerArquivo('migracao-supa.js');
const dadosRouterJs = lerArquivo('dados-router.js');

/* ============================================================ A) HOLOSCAN SYNC: ERRO vs VAZIO */

console.log('\n  A. sincronizarHistoricoHoloscan — erro vs vazio');

ok(
  /if\s*\(\s*appErr\s*\)/.test(appJs) && /console\.warn.*sincronizarHistoricoHoloscan.*erro/.test(appJs),
  'appErr tratado separadamente com console.warn'
);
ok(
  /if\s*\(\s*!apps\s*\)\s*return/.test(appJs),
  'apps nulo/vazio verificado separadamente de appErr'
);
ok(
  /if\s*\(\s*scErr\s*\).*console\.warn/.test(appJs),
  'scErr tratado separadamente com console.warn'
);

/* ============================================================ B) RESPOSTAS HOLOSCAN */

console.log('\n  B. sincronizarRespostasHoloscan — hidratação de questionário');

ok(
  /async\s+function\s+sincronizarRespostasHoloscan/.test(appJs),
  'função sincronizarRespostasHoloscan existe'
);
ok(
  /holoscan_answers/.test(appJs) && /\.in\(\s*["']application_id["']/.test(appJs),
  'busca holoscan_answers filtrado por application_id'
);
ok(
  /ultimaPorPaciente/.test(appJs),
  'seleciona a aplicação mais recente por paciente'
);
ok(
  /holohacking\.questionario/.test(appJs) && /localStorage\.setItem.*holohacking\.questionario/.test(appJs),
  'grava respostas hidratadas em localStorage("holohacking.questionario")'
);
ok(
  /pidsParaBuscar/.test(appJs) && /!qLocal\[pid\]/.test(appJs),
  'só busca para pacientes sem respostas locais'
);

/* ============================================================ C) EXAMES SYNC: ERRO vs VAZIO + REMOTO VENCE */

console.log('\n  C. sincronizarExames — erro vs vazio e stale cache');

ok(
  /if\s*\(\s*colRes\.error\s*\).*console\.warn/.test(arquivosJs),
  'erro de coletas tratado separadamente com console.warn'
);
ok(
  /if\s*\(\s*!colRes\.data\s*\|\|/.test(arquivosJs),
  'coletas vazias verificadas separadamente do erro'
);
ok(
  /if\s*\(\s*resRes\.error\s*\).*console\.warn/.test(arquivosJs),
  'erro de resultados tratado separadamente com console.warn'
);
ok(
  /remoteCount\s*>\s*localCount/.test(arquivosJs),
  'remoto vence quando tem mais resultados que local'
);
ok(
  /JSON\.stringify\(localVals\)\s*!==\s*JSON\.stringify\(vals\)/.test(arquivosJs),
  'remoto vence quando valores diferem (stale cache detection)'
);
ok(
  /localCount\s*===\s*0/.test(arquivosJs),
  'remoto preenche quando local está vazio'
);

/* ============================================================ D) DEDUPLICAÇÃO */

console.log('\n  D. Deduplicação no histórico HOLOSCAN');

ok(
  /_supa_id.*===.*app\.id/.test(appJs) || /e\._supa_id\s*===\s*app\.id/.test(appJs),
  'deduplicação por _supa_id no jaExiste'
);
ok(
  /quando.*===.*app\.quando/.test(appJs),
  'deduplicação por quando (mesmo dia) como fallback'
);
ok(
  /mesmoDia\s*>=\s*0/.test(appJs) && /tudo\[pid\]\[mesmoDia\]\s*=\s*pontuacao/.test(appJs),
  'entrada do mesmo dia é substituída (não duplicada)'
);

/* ============================================================ E) RELOAD APÓS SYNC */

console.log('\n  E. carregarHoloscan após sync atualizar localStorage');

const syncBlock = appJs.slice(
  appJs.indexOf('async function sincronizarHistoricoHoloscan'),
  appJs.indexOf('async function sincronizarRespostasHoloscan')
);
ok(
  /carregarHoloscan\(\)/.test(syncBlock),
  'carregarHoloscan() chamado dentro de sincronizarHistoricoHoloscan'
);
ok(
  /localStorage\.setItem.*holohacking\.pontuacao/.test(syncBlock),
  'pontuação gravada em localStorage antes de chamar carregarHoloscan'
);

/* ============================================================ F) PANORAMA LÊ DE localStorage */

console.log('\n  F. Panorama — lê de localStorage (beneficia-se da hidratação)');

ok(
  /caixa\(\s*["']holohacking\.questionario["']/.test(panoramaJs),
  'doPaciente lê questionário de localStorage via caixa()'
);
ok(
  /caixa\(\s*["']holohacking\.exames["']/.test(panoramaJs),
  'doPaciente lê exames de localStorage via caixa()'
);
ok(
  /ultimaPontuacao/.test(panoramaJs),
  'doPaciente usa ultimaPontuacao (que lê de localStorage)'
);
ok(
  /historicoPontuacao/.test(panoramaJs),
  'doPaciente usa historicoPontuacao (que lê de localStorage)'
);

/* ============================================================ G) OQ3/PQQ/FERRAMENTAS via DadosRouter */

console.log('\n  G. OQ3/PQQ/ferramentas — já multi-device via DadosRouter');

ok(
  /DadosRouter|banco\(\)/.test(aplicacoesJs),
  'Aplicacoes usa DadosRouter (ou banco() que retorna DadosRouter)'
);
ok(
  /from\(\s*["']aplicacoes["']\s*\)/.test(aplicacoesJs),
  'Aplicacoes.from("aplicacoes") — roteado para tool_applications'
);
ok(
  /aplicacoes.*tool_applications/i.test(dadosRouterJs),
  'DadosRouter roteia "aplicacoes" para "tool_applications"'
);

/* ============================================================ H) MIGRAÇÃO IDEMPOTENTE */

console.log('\n  H. Migração — guarda de idempotência');

ok(
  /holohacking\.migrado_supa_v1/.test(migracaoJs),
  'migração protegida por flag holohacking.migrado_supa_v1'
);
ok(
  /localStorage\.getItem\(MARCA\)/.test(migracaoJs),
  'verifica se migração já rodou antes de executar (via MARCA)'
);
ok(
  /salvar_holoscan_completo/.test(migracaoJs),
  'migração HOLOSCAN usa RPC salvar_holoscan_completo (upsert)'
);
ok(
  /salvar_coleta_exames/.test(migracaoJs),
  'migração exames usa RPC salvar_coleta_exames (upsert)'
);

/* ============================================================ I) ISOLAMENTO POR CONTA */

console.log('\n  I. Isolamento por conta — RLS + uid');

const MIGRATIONS = join(ROOT, 'supabase', 'migrations');
const { readdirSync } = await import('fs');
const allSql = readdirSync(MIGRATIONS)
  .filter(f => f.endsWith('.sql'))
  .map(f => readFileSync(join(MIGRATIONS, f), 'utf8'))
  .join('\n');

const tabelasComRLS = [
  { atual: 'holoscan_applications', original: 'holoscope_applications' },
  { atual: 'holoscan_answers', original: 'holoscope_answers' },
  { atual: 'holoscan_system_scores', original: 'holoscope_system_scores' },
  { atual: 'lab_collections', original: 'lab_collections' },
  { atual: 'lab_results', original: 'lab_results' },
  { atual: 'tool_applications', original: 'tool_applications' }
];

for (const t of tabelasComRLS) {
  const rlsOn = new RegExp('alter\\s+table\\s+(public\\.)?' + t.atual + '\\s+enable\\s+row\\s+level\\s+security', 'i').test(allSql)
    || new RegExp('alter\\s+table\\s+(public\\.)?' + t.original + '\\s+enable\\s+row\\s+level\\s+security', 'i').test(allSql);
  ok(rlsOn, 'RLS habilitado em ' + t.atual + (t.original !== t.atual ? ' (via ' + t.original + ')' : ''));
}

ok(
  /auth\.uid\(\)/.test(allSql),
  'policies usam auth.uid() para isolamento'
);

/* ============================================================ RESUMO */

console.log('\n  ---');
if (falhou) {
  console.error('\n  ALGUMA ASSERÇÃO FALHOU');
  process.exit(1);
}
console.log('  Todas as asserções passaram.\n');
