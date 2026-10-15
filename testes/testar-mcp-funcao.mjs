/**
 * MCP — a EDGE FUNCTION de verdade (supabase/functions/holohacking-mcp/index.ts no Deno, driver postgres.js) contra o
 * PostgreSQL LOCAL com todas as migrations, por HTTP, como o assistente de IA chama. Dados ficticios.
 *   F1 shared/: os modulos do metodo e o contrato sao copias IDENTICAS das do app (scripts/sincronizar-mcp-shared.mjs)
 *   F2 index.ts: conexao SUPABASE_DB_URL, transacao COMO a nutricionista (role authenticated + claims), sem segredo no codigo
 *   F3 (Deno) initialize + tools/list + buscar + contexto + gerar_resultado + gerar_resultado_playbook por HTTP; chave errada 401
 * Deno: MCP_DENO=/caminho/deno, ou "deno" no PATH, ou node_modules/.bin/deno. Sem Deno ou sem PostgreSQL local: F3 PULADO.
 */
import './guarda-falhas.mjs';
import { readFileSync, existsSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { execSync, spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { ARQUIVOS, DESTINO } from '../scripts/sincronizar-mcp-shared.mjs';
import { conectar, criarNutri, criarCaso, como } from './mcp-pg.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const R = new URL('../', import.meta.url).pathname;

/* F1 */
const dif = Object.entries(ARQUIVOS).filter(([d, s]) => !existsSync(DESTINO + d) || readFileSync(DESTINO + d, 'utf8') !== readFileSync(R + s, 'utf8')).map(([d]) => d);
ok(!dif.length, 'F1 shared/ identico ao app (' + Object.keys(ARQUIVOS).length + ' arquivos)' + (dif.length ? ': DIFERENTE ' + dif.join(', ') + ' — rode node scripts/sincronizar-mcp-shared.mjs' : ''));

/* F2 */
const idx = readFileSync(R + 'supabase/functions/holohacking-mcp/index.ts', 'utf8');
ok(/Deno\.env\.get\("SUPABASE_DB_URL"\)/.test(idx) && /set local role authenticated/.test(idx) && /request\.jwt\.claims/.test(idx) && /mcp_identificar/.test(idx) && /mcp_registrar_uso/.test(idx),
  'F2 index.ts: SUPABASE_DB_URL (injetada), transacao como a nutricionista, chave resolvida no servidor, registro de uso');
ok(!/service_role|SERVICE_ROLE|eyJ[A-Za-z0-9_-]{10,}|sk-[A-Za-z0-9]{10,}/.test(idx + readFileSync(R + 'supabase/functions/holohacking-mcp/nucleo.js', 'utf8')), 'F2 nenhuma chave, token ou service_role no codigo');

/* F3 */
const candidatos = [process.env.MCP_DENO, R + 'node_modules/.bin/deno'].filter(Boolean);
let deno = candidatos.find(p => existsSync(p)) || null;
if (!deno) { try { execSync('deno --version', { stdio: 'ignore' }); deno = 'deno'; } catch {} }
const c = deno ? await conectar() : null;
if (!deno || !c) {
  console.log('  PULADO F3: ' + (!deno ? 'sem Deno (MCP_DENO=/caminho/deno)' : 'sem PostgreSQL local'));
} else {
  const porta = await new Promise(r => { const s = createServer().listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
  const dir = mkdtempSync(tmpdir() + '/mcp-fn-');
  cpSync(R + 'supabase/functions/holohacking-mcp', dir + '/holohacking-mcp', { recursive: true });
  const env = Object.assign({}, process.env, { SUPABASE_DB_URL: 'postgres://postgres@127.0.0.1:55432/mcp', MCP_PORTA_LOCAL: String(porta), DENO_CERT: process.env.DENO_CERT || (existsSync('/root/.ccr/ca-bundle.crt') ? '/root/.ccr/ca-bundle.crt' : '') });
  const p = spawn(deno, ['run', '--allow-net', '--allow-env', '--allow-read', '--allow-sys', 'index.ts'], { cwd: dir + '/holohacking-mcp', env, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = ''; p.stdout.on('data', d => { saida += d; }); p.stderr.on('data', d => { saida += d; });
  const base = 'http://127.0.0.1:' + porta + '/holohacking-mcp/';
  let no = false;
  for (let i = 0; i < 120 && !no; i++) { await new Promise(r => setTimeout(r, 500)); try { await fetch(base, { method: 'OPTIONS' }); no = true; } catch {} }
  ok(no, 'F3 a Edge Function sobe no Deno' + (no ? '' : ': ' + saida.slice(-400)));
  if (no) {
    const A = await criarNutri(c), fx = await criarCaso(c, A, { nome: 'Teresa Ficticia Deno' });
    const chave = (await como(c, A, q => q("select public.criar_chave_mcp('Deno') as r")))[0].r.chave;
    let n = 0;
    const post = async (method, params, k = chave) => { const r = await fetch(base + k, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++n, method, params }) }); return { status: r.status, j: await r.json().catch(() => null) }; };
    const tool = async (name, args) => (await post('tools/call', { name, arguments: args })).j.result;
    ok((await post('ping', {}, 'hh_mcp_' + 'z'.repeat(43))).status === 401, 'F3 chave errada -> 401');
    const ini = await post('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'teste', version: '1' } });
    ok(ini.status === 200 && ini.j.result.serverInfo.name === 'holohacking', 'F3 initialize' + (ini.status !== 200 ? ' ' + ini.status + ' ' + JSON.stringify(ini.j) + ' | ' + saida.slice(-600) : ''));
    ok((await post('tools/list')).j.result.tools.length === 8, 'F3 tools/list: 8 ferramentas');
    const b = (await tool('buscar_pacientes', { nome: 'teresa' })).structuredContent;
    ok(b.total === 1 && b.pacientes[0].paciente_id === fx.PA, 'F3 buscar_pacientes no banco (postgres.js, como a nutricionista)');
    const cx = (await tool('contexto_paciente', { paciente_id: fx.PA })).structuredContent;
    ok(cx.holoscan && cx.holoscan.areas_prioritarias[0].sistema === 'metabolico' && cx.paciente.idade > 30, 'F3 contexto_paciente (HOLOSCAN, areas, idade)' + (cx.erro ? ' ERRO ' + cx.mensagem : ''));
    const ex = JSON.parse(readFileSync(R + 'docs/v1/holos-ai-gpt/exemplo-resultado.json', 'utf8')); ex.tipo = 'primeira_consulta';
    const g = await tool('gerar_resultado', { paciente_id: fx.PA, resultado: ex });
    ok(!g.isError && g.structuredContent.gravado && g.structuredContent.versao === 1, 'F3 gerar_resultado grava o Resultado HOLOS' + (g.isError ? ' ERRO ' + JSON.stringify(g.structuredContent) : ''));
    const g2 = await tool('gerar_resultado_playbook', { paciente_id: fx.PA, foco_id: 'ME-F2', estrategias: ['ME-C2', 'ME-M1'] });
    ok(!g2.isError && g2.structuredContent.versao === 2, 'F3 gerar_resultado_playbook grava a versao 2' + (g2.isError ? ' ERRO ' + JSON.stringify(g2.structuredContent) : ''));
    const log = (await c.query('select count(*)::int n from public.mcp_usage_log where nutritionist_id = $1', [A])).rows[0].n;
    ok(log === 4, 'F3 registro de uso pela Edge Function: ' + log);
  }
  p.kill('SIGTERM');
  rmSync(dir, { recursive: true, force: true });
}
if (c) await c.end();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
