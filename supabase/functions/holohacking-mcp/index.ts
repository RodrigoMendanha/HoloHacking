/* holohacking-mcp — o servidor MCP do HoloHacking (Edge Function, Deno).

   Liga o nucleo (nucleo.js, testado em testes/testar-mcp-servidor.mjs contra o PostgreSQL com todas as migrations) ao banco
   de verdade pela conexao SUPABASE_DB_URL, que o Supabase injeta em toda Edge Function: nenhum segredo novo, nada no
   repositorio nem no navegador.

   Identidade: a chave pessoal hh_mcp_... (no caminho /holohacking-mcp/<chave> ou em Authorization: Bearer <chave>) e
   resolvida por public.mcp_identificar (so o servidor executa). Depois, CADA chamada roda numa transacao COMO a
   nutricionista: set local role authenticated + request.jwt.claims = { sub: <uid> } — o mesmo que o PostgREST faz.
   Valem o mesmo RLS, os mesmos gatilhos (conta ativa, paciente arquivado) e as mesmas RPCs do app.

   Publicar (o JWT do Supabase nao se aplica: quem chama e o assistente de IA, com a chave pessoal):
     node scripts/sincronizar-mcp-shared.mjs
     supabase functions deploy holohacking-mcp --no-verify-jwt --project-ref <projeto> */
import postgres from "npm:postgres@3.4.5";
import "./shared/resultado-direcao.js";
import "./shared/holos-ai-contrato.js";
import "./shared/playbook-holos.js";
import "./shared/sistemas-fechamento.js";
import contrato from "./shared/contrato-holos-ai-result.json" with { type: "json" };
import exemplo from "./shared/exemplo-holos-ai-result.json" with { type: "json" };
import { criarServidor } from "./nucleo.js";

const G = globalThis as Record<string, unknown>;
const URL_BANCO = Deno.env.get("SUPABASE_DB_URL") ?? "";
const SITE = (Deno.env.get("SITE_URL") ?? "https://holohacking.com.br").replace(/\/+$/, "");
const sql = URL_BANCO ? postgres(URL_BANCO, { prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10 }) : null;

type Q = (texto: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

const servidor = criarServidor({
  mod: { RD: G.ResultadoDirecao, C: G.HolosAIContrato, PB: G.PlaybookHolos, SF: G.SistemasFechamento },
  uuid: () => crypto.randomUUID(),
  site: SITE,
  contrato,
  exemplo,
  identificar: async (chave: string) => {
    if (!sql) return null;
    const [l] = await sql`select public.mcp_identificar(${chave}) as r`;
    return l?.r ?? null;
  },
  comoNutri: (uid: string, fn: (q: Q) => Promise<unknown>) => {
    if (!sql) throw new Error("nao_configurado");
    return sql.begin(async (tx) => {
      await tx.unsafe("set local role authenticated");
      await tx.unsafe("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, role: "authenticated" })]);
      const q: Q = (texto, params) => tx.unsafe(texto, (params ?? []) as never[]) as unknown as Promise<Record<string, unknown>[]>;
      return await fn(q);
    });
  },
  registrarUso: async (uid: string, key: string, ferramenta: string, paciente: string | null, ok: boolean, erro: string | null) => {
    if (!sql) return;
    await sql`select public.mcp_registrar_uso(${uid}, ${key}, ${ferramenta}, ${paciente}, ${ok}, ${erro})`;
  },
});

async function tratar(req: Request): Promise<Response> {
  const corpo = req.method === "POST" ? await req.text() : "";
  if (corpo.length > 600_000) return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Pedido grande demais" } }), { status: 413, headers: { "Content-Type": "application/json" } });
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k] = v; });
  const r = await servidor.tratarHttp({ metodo: req.method, caminho: new URL(req.url).pathname, headers, corpo });
  return new Response(r.corpo || null, { status: r.status, headers: r.headers });
}
/* MCP_PORTA_LOCAL: so nos testes locais (testes/testar-mcp-funcao.mjs); no Supabase, Deno.serve padrao */
const portaLocal = Deno.env.get("MCP_PORTA_LOCAL");
if (portaLocal) Deno.serve({ port: Number(portaLocal), hostname: "127.0.0.1" }, tratar); else Deno.serve(tratar);
