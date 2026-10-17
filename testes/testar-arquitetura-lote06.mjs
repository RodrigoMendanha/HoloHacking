/**
 * LOTE 06 — VALIDAÇÃO ARQUITETURAL
 *
 * Verifica, a partir do código-fonte e das migrations, que:
 *
 *   A) migrations contêm as tabelas clínicas esperadas
 *   B) FKs de tabelas filhas para patients usam ON DELETE RESTRICT
 *   C) exclusão definitiva não é possível para pacientes com histórico
 *      quando autenticado no Supabase
 *   D) exportação usa dados da fachada/DadosRouter (não só local)
 *   E) arquivamento e reativação persistem via DadosRouter
 *   F) documentos autenticados seguem Supabase + ownership
 *   G) questionário mostra feedback ao bloquear gravar em arquivado
 */
import './guarda-falhas.mjs';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

const ROOT = join(import.meta.url.replace('file://', ''), '..', '..');
const MIGRATIONS = join(ROOT, 'supabase', 'migrations');

function lerMigrations() {
  return readdirSync(MIGRATIONS)
    .filter(f => f.endsWith('.sql'))
    .map(f => ({ nome: f, sql: readFileSync(join(MIGRATIONS, f), 'utf8') }));
}

function lerArquivo(rel) {
  return readFileSync(join(ROOT, rel), 'utf8');
}

/* ============================================================ A) TABELAS */

console.log('\n  A. MIGRATIONS — tabelas clínicas existem');

const allSql = lerMigrations().map(m => m.sql).join('\n');

const tabelasEsperadas = [
  'profiles', 'patients', 'consultations', 'schedule_blocks',
  'holoscan_applications', 'holoscan_answers', 'holoscan_system_scores',
  'lab_collections', 'lab_results', 'tool_applications',
  'documents', 'professional_assets', 'ai_threads', 'ai_messages'
];

for (const t of tabelasEsperadas) {
  const existe = new RegExp('create\\s+table\\s+(if\\s+not\\s+exists\\s+)?(public\\.)?' + t, 'i').test(allSql)
    || new RegExp('rename\\s+to\\s+' + t, 'i').test(allSql);
  ok(existe, 'migration cria ou renomeia tabela: ' + t);
}

/* ============================================================ B) FK RESTRICT */

console.log('\n  B. FKs — tabelas filhas usam ON DELETE RESTRICT');

const filhasComRestrict = [
  { tabela: 'consultations', fk: 'patients' },
  { tabela: 'holoscan_applications', fk: 'patients' },
  { tabela: 'lab_collections', fk: 'patients' },
  { tabela: 'tool_applications', fk: 'patients' },
  { tabela: 'documents', fk: 'patients' }
];

for (const { tabela, fk } of filhasComRestrict) {
  const regex = new RegExp(
    'create\\s+table[^;]*?' + tabela.replace('holoscan_', 'holos(?:cope|can)_') +
    '[^;]*?references\\s+public\\.' + fk +
    '[^;]*?on\\s+delete\\s+restrict',
    'is'
  );
  ok(regex.test(allSql), tabela + ' → ' + fk + ': ON DELETE RESTRICT');
}

const filhasComCascade = [
  { tabela: 'holoscan_answers', fk: 'holoscan_applications' },
  { tabela: 'holoscan_system_scores', fk: 'holoscan_applications' },
  { tabela: 'lab_results', fk: 'lab_collections' },
  { tabela: 'ai_messages', fk: 'ai_threads' }
];

for (const { tabela, fk } of filhasComCascade) {
  const regex = new RegExp(
    'create\\s+table[^;]*?' + tabela.replace('holoscan_', 'holos(?:cope|can)_') +
    '[^;]*?references\\s+public\\.' + fk.replace('holoscan_', 'holos(?:cope|can)_') +
    '[^;]*?on\\s+delete\\s+cascade',
    'is'
  );
  ok(regex.test(allSql), tabela + ' → ' + fk + ': ON DELETE CASCADE');
}

/* ============================================================ C) EXCLUSÃO BLOQUEADA */

console.log('\n  C. EXCLUSÃO — bloqueada para paciente autenticado com histórico');

const appJs = lerArquivo('app.js');

ok(/HoloAuth.*sessaoAtiva\(\)/.test(appJs) && /Não é possível excluir/.test(appJs),
  'confirmarRemover verifica sessão autenticada e bloqueia exclusão com histórico');

ok(/supabaseClient\.from\(.*consultations.*\).*count.*exact/.test(appJs),
  'contarRegistros consulta consultations no Supabase quando autenticado');

ok(/supabaseClient\.from\(.*holoscan_applications.*\).*count.*exact/.test(appJs),
  'contarRegistros consulta holoscan_applications no Supabase');

ok(/supabaseClient\.from\(.*lab_collections.*\).*count.*exact/.test(appJs),
  'contarRegistros consulta lab_collections (exames) no Supabase');

ok(/supabaseClient\.from\(.*tool_applications.*\).*count.*exact/.test(appJs),
  'contarRegistros consulta tool_applications no Supabase');

ok(/supabaseClient\.from\(.*documents.*\).*count.*exact/.test(appJs),
  'contarRegistros consulta documents no Supabase');

ok(/resumo\.exames/.test(appJs),
  'temHistorico inclui exames (lab_collections) na verificação');

ok(/supabaseClient\.from\(.*patients.*\)\.delete\(\)/.test(appJs),
  'removerPacientes tenta deletar do Supabase antes do cleanup local');

ok(/paciente possui dados no prontuário/.test(appJs),
  'removerPacientes mostra mensagem adequada se RESTRICT bloquear');

const deleteIdx = appJs.indexOf('supabaseClient.from("patients").delete()');
const localIdx = appJs.indexOf('Armazenamento.excluirPaciente', deleteIdx);
ok(deleteIdx > 0 && localIdx > deleteIdx,
  'removerPacientes: Supabase delete aparece ANTES do cleanup local no código');

/* ============================================================ D) EXPORTAÇÃO */

console.log('\n  D. EXPORTAÇÃO — usa fachada/fontes corretas');

ok(/ArquivoStore.*listar/.test(appJs),
  'exportação lê documentos via ArquivoStore (camada híbrida)');

ok(/Agenda.*todas/.test(appJs) && /consultas/.test(appJs),
  'exportação lê consultas via Agenda (que usa DadosRouter)');

ok(/Panorama.*doPaciente/.test(appJs),
  'exportação lê pontuação/ferramentas via Panorama');

ok(/produto.*HoloHacking/.test(appJs) && /versaoExportacao/.test(appJs),
  'exportação inclui metadados de produto');

ok(!/access_token|refresh_token|service_role|anon.*key|supabase.*secret/.test(
  appJs.slice(appJs.indexOf('reunirDadosPaciente'), appJs.indexOf('reunirDadosPaciente') + 2000)),
  'exportação NÃO inclui tokens, secrets ou service_role');

ok(!/signedUrl|createSignedUrl/.test(
  appJs.slice(appJs.indexOf('reunirDadosPaciente'), appJs.indexOf('reunirDadosPaciente') + 2000)),
  'exportação NÃO gera signed URLs');

/* ============================================================ E) ARQUIVAMENTO */

console.log('\n  E. ARQUIVAMENTO — persiste via DadosRouter');

ok(/sb\.from\(.*pacientes.*\)\.update\(.*status/.test(appJs),
  'mudarStatus usa sb.from("pacientes").update (DadosRouter → Supabase quando autenticado)');

const dadosRouter = lerArquivo('dados-router.js');

ok(/supabaseClient\.from\(.*patients.*\)/.test(dadosRouter),
  'DadosRouter roteia "pacientes" para Supabase patients quando autenticado');

ok(/DadosLocais\.from\(tabela\)/.test(dadosRouter),
  'DadosRouter cai para DadosLocais quando sem sessão');

/* ============================================================ F) DOCUMENTOS */

console.log('\n  F. DOCUMENTOS — Supabase + ownership');

const arquivoStore = lerArquivo('arquivo-store.js');

ok(/salvarSupa/.test(arquivoStore) && /supabaseClient\.storage/.test(arquivoStore),
  'ArquivoStore tem camada Supabase para salvar');

ok(/listarSupa/.test(arquivoStore) && /documents/.test(arquivoStore),
  'ArquivoStore tem camada Supabase para listar');

ok(/arquivarHibrido/.test(arquivoStore) && /arquivado_em/.test(arquivoStore) && !/removerSupa/.test(arquivoStore),
  'ArquivoStore arquiva no Supabase (arquivado_em) e nao tem camada para apagar documento (09/10)');

ok(/patient-documents/.test(arquivoStore),
  'ArquivoStore usa bucket patient-documents');

ok(/uidAtual/.test(arquivoStore),
  'ArquivoStore verifica ownership via uid');

/* ============================================================ G) QUESTIONÁRIO */

console.log('\n  G. QUESTIONÁRIO — feedback ao bloquear');

const questionario = lerArquivo('questionario.js');

ok(/pacienteArquivado.*\{/.test(questionario),
  'gravar() verifica pacienteArquivado com bloco (não silencioso)');

ok(/avisar.*(Paciente arquivado|MSG_ARQUIVADO)/.test(questionario),
  'gravar() mostra toast quando paciente está arquivado');

/* ============================================================ RLS */

console.log('\n  H. RLS — todas as tabelas têm row level security');

for (const t of tabelasEsperadas) {
  const tAlternado = t.replace('holoscan_', 'holos(?:cope|can)_');
  const regex = new RegExp('alter\\s+table\\s+public\\.' + tAlternado + '\\s+enable\\s+row\\s+level\\s+security', 'i');
  ok(regex.test(allSql), t + ' tem RLS habilitada');
}

/* ============================================================ RPCs */

console.log('\n  I. RPCs — funções atômicas existem');

ok(/salvar_holoscan_completo/.test(allSql), 'RPC salvar_holoscan_completo existe');
ok(/salvar_coleta_exames/.test(allSql), 'RPC salvar_coleta_exames existe');
ok(/security\s+definer/i.test(allSql), 'RPCs usam SECURITY DEFINER');

/* ============================================================ ANON REVOKE */

console.log('\n  J. SEGURANÇA — anon revogado');

ok(/REVOKE.*FROM\s+anon/i.test(allSql), 'privilégios do role anon são revogados');

/* ============================================================ FIM */

console.log('');
ok(!falhou, 'validação arquitetural completa sem falhas');
await new Promise(r => r()); // keep consistent with async pattern
process.exit(falhou ? 1 : 0);
