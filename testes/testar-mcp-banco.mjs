/**
 * MCP — CHAVE PESSOAL NO BANCO (migration 20261027100000), no PostgreSQL LOCAL com todas as migrations. Dados ficticios.
 *   B1 permissoes: criar/revogar so authenticated; identificar/registrar so o servidor (service_role); anon nada
 *   B2 conta ativa cria a chave: mostrada uma vez (hh_mcp_...), banco guarda so o SHA-256; o hash nao e legivel pela nutri
 *   B3 conta pendente nao cria chave
 *   B4 mcp_identificar: chave certa -> nutricionista; errada, malformada, revogada ou conta que deixou de estar ativa -> nada
 *   B5 isolamento: outra nutricionista nao ve nem revoga a chave
 *   B6 no maximo 5 chaves ativas
 *   B7 registro de uso: gravado pelo servidor, visivel so a dona, sem conteudo clinico
 */
import './guarda-falhas.mjs';
import { conectar, criarNutri, como } from './mcp-pg.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const c = await conectar();
if (!c) { console.log('  PULADO: sem PostgreSQL local (scripts/montar-banco-mcp-local.sh)'); process.exit(0); }
const erroDe = async (p) => { try { await p; return null; } catch (e) { return e.hint || e.message; } };

/* B1 */
const priv = (await c.query(`select
  has_function_privilege('authenticated', 'public.criar_chave_mcp(text)', 'execute') a1,
  has_function_privilege('anon', 'public.criar_chave_mcp(text)', 'execute') a2,
  has_function_privilege('authenticated', 'public.revogar_chave_mcp(uuid)', 'execute') a3,
  has_function_privilege('authenticated', 'public.mcp_identificar(text)', 'execute') a4,
  has_function_privilege('anon', 'public.mcp_identificar(text)', 'execute') a5,
  has_function_privilege('service_role', 'public.mcp_identificar(text)', 'execute') a6,
  has_function_privilege('authenticated', 'public.mcp_registrar_uso(uuid,uuid,text,uuid,boolean,text)', 'execute') a7,
  has_column_privilege('authenticated', 'public.mcp_keys', 'key_hash', 'select') a8,
  has_table_privilege('authenticated', 'public.mcp_keys', 'insert') a9,
  has_table_privilege('authenticated', 'public.mcp_usage_log', 'insert') a10`)).rows[0];
ok(priv.a1 && !priv.a2 && priv.a3 && !priv.a4 && !priv.a5 && priv.a6 && !priv.a7 && !priv.a8 && !priv.a9 && !priv.a10,
  'B1 criar/revogar so authenticated; identificar/registrar so o servidor; hash e escrita direta fechados: ' + JSON.stringify(priv));

/* B2 */
const A = await criarNutri(c), B = await criarNutri(c), P = await criarNutri(c, { ativa: false });
const k1 = await como(c, A, q => q("select public.criar_chave_mcp('Claude do consultório') as r")).then(r => r[0].r);
ok(/^hh_mcp_[A-Za-z0-9_-]{43}$/.test(k1.chave) && k1.prefixo === k1.chave.slice(0, 12) && k1.nome === 'Claude do consultório', 'B2 chave criada e mostrada uma vez: ' + k1.prefixo + '…');
const guardado = (await c.query('select key_hash, prefixo from public.mcp_keys where id = $1', [k1.id])).rows[0];
const sha = (await import('node:crypto')).createHash('sha256').update(k1.chave).digest('hex');
ok(guardado.key_hash === sha && !JSON.stringify(guardado).includes(k1.chave), 'B2 o banco guarda so o SHA-256 da chave (nunca a chave)');
ok(/permission denied/.test(await erroDe(como(c, A, q => q('select key_hash from public.mcp_keys')))), 'B2 a propria nutricionista nao le o hash');
const lista = await como(c, A, q => q('select id, nome, prefixo, revoked_at from public.mcp_keys'));
ok(lista.length === 1 && lista[0].prefixo === k1.prefixo, 'B2 a nutricionista lista as proprias chaves (nome e prefixo)');

/* B3 */
ok(await erroDe(como(c, P, q => q("select public.criar_chave_mcp('x')"))) === 'conta_nao_liberada', 'B3 conta pendente nao cria chave');

/* B4 */
const ident = async (k) => (await c.query('select public.mcp_identificar($1) as r', [k])).rows[0].r;
const r1 = await ident(k1.chave);
ok(r1 && r1.nutritionist_id === A && r1.key_id === k1.id, 'B4 chave certa -> a nutricionista dona');
ok((await c.query('select last_used_at from public.mcp_keys where id = $1', [k1.id])).rows[0].last_used_at !== null, 'B4 uso registrado na chave (ultimo uso)');
ok(await ident(k1.chave.slice(0, -1) + (k1.chave.endsWith('A') ? 'B' : 'A')) === null && await ident('hh_mcp_curta') === null && await ident(null) === null && await ident("x' or '1'='1") === null,
  'B4 chave errada, malformada ou vazia -> nada');
await c.query("update public.profiles set status = 'pendente' where id = $1", [A]);
ok(await ident(k1.chave) === null, 'B4 conta que deixou de estar ativa -> a chave para de funcionar');
await c.query("update public.profiles set status = 'ativo' where id = $1", [A]);
ok((await ident(k1.chave))?.nutritionist_id === A, 'B4 conta liberada de novo -> volta a funcionar');

/* B5 */
ok((await como(c, B, q => q('select id from public.mcp_keys'))).length === 0, 'B5 outra nutricionista nao ve a chave');
ok(await erroDe(como(c, B, q => q('select public.revogar_chave_mcp($1)', [k1.id]))) === 'mcp_chave_nao_encontrada', 'B5 outra nutricionista nao revoga a chave');
await como(c, A, q => q('select public.revogar_chave_mcp($1)', [k1.id]));
ok(await ident(k1.chave) === null, 'B4 chave revogada -> nada (efeito imediato)');
ok((await como(c, A, q => q('select public.revogar_chave_mcp($1) as r', [k1.id])))[0].r.revogada === true, 'B4 revogar de novo nao da erro');

/* B6 */
for (let i = 0; i < 5; i++) await como(c, A, q => q('select public.criar_chave_mcp($1)', ['k' + i]));
ok(await erroDe(como(c, A, q => q("select public.criar_chave_mcp('sexta')"))) === 'mcp_limite_chaves', 'B6 no maximo 5 chaves ativas (revogadas nao contam)');

/* B7 */
await c.query("select public.mcp_registrar_uso($1, null, 'gerar_resultado', null, true, null)", [A]);
const logA = await como(c, A, q => q('select ferramenta, ok from public.mcp_usage_log'));
const logB = await como(c, B, q => q('select ferramenta from public.mcp_usage_log'));
ok(logA.length === 1 && logA[0].ferramenta === 'gerar_resultado' && logB.length === 0, 'B7 registro de uso visivel so a dona');
ok(/permission denied/.test(await erroDe(como(c, A, q => q("insert into public.mcp_usage_log (nutritionist_id, ferramenta, ok) values ($1, 'x', true)", [A])))), 'B7 a nutricionista nao escreve no registro');

await c.end();
console.log(falhou ? '\nFALHOU' : '\nOK');
process.exit(falhou ? 1 : 0);
