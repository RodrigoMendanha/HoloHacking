/**
 * HOLOS AI — a Edge Function supabase/functions/holos-ai em estado INERTE.
 *
 * Enquanto a arquitetura da HOLOS AI nao chega (rodada propria), a funcao do
 * repositorio so pode responder "nao configurada":
 *   1  qualquer POST/GET: 503 {erro: "HOLOS_AI_NAO_CONFIGURADA"}
 *   2  OPTIONS: 204 com CORS (o navegador nao quebra no preflight)
 *   3  o corpo do pedido nem e lido — dado clinico nao entra
 *   4  o codigo nao chama rede, nao le secret/env, nao usa service_role,
 *      e nao tem resto do MetaNutri (hub, chave, historico)
 */
import './guarda-falhas.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { tratar, CODIGO } from '../supabase/functions/holos-ai/indisponivel.ts';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const URL_F = 'https://x.supabase.co/functions/v1/holos-ai';

for (const metodo of ['POST', 'GET']) {
  const req = new Request(URL_F, metodo === 'POST'
    ? { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer qualquer' },
        body: JSON.stringify({ paciente: 'ficticio', mensagem: 'oi' }) }
    : { method: 'GET' });
  const r = tratar(req);
  const corpo = await r.json();
  ok(r.status === 503 && corpo.erro === CODIGO && CODIGO === 'HOLOS_AI_NAO_CONFIGURADA',
     metodo + ': 503 {erro: HOLOS_AI_NAO_CONFIGURADA}');
  ok(Object.keys(corpo).sort().join(',') === 'erro,mensagem', metodo + ': a resposta so tem erro e mensagem');
  ok(r.headers.get('Access-Control-Allow-Origin') === '*', metodo + ': com CORS');
  if (metodo === 'POST') ok(req.bodyUsed === false, 'o corpo do pedido nao e lido: dado clinico nao entra');
}
const pre = tratar(new Request(URL_F, { method: 'OPTIONS' }));
ok(pre.status === 204 && /POST/.test(pre.headers.get('Access-Control-Allow-Methods') || ''), 'OPTIONS: 204 com CORS');

const dir = new URL('../supabase/functions/holos-ai/', import.meta.url);
const arquivos = readdirSync(dir);
ok(arquivos.sort().join(',') === 'index.ts,indisponivel.ts', 'a funcao so tem index.ts e indisponivel.ts: ' + arquivos.join(', '));
const src = arquivos.map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
const codigo = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok(!/fetch\(|Deno\.env|createClient|\.from\(|\.rpc\(/.test(codigo), 'o codigo nao chama rede, nao le env, nao usa supabase-js');
ok(!/service_role|GEMINI|ANTHROPIC|OPENAI|METANUTRI|hub\.luansales|agente-site|historico/i.test(src),
   'nenhuma chave de IA, service_role nem resto do MetaNutri (nem em comentario)');
ok(/Deno\.serve\(\(req: Request\) => tratar\(req\)\)/.test(src), 'index.ts so liga o handler inerte ao Deno.serve');

process.exit(falhou ? 1 : 0);
