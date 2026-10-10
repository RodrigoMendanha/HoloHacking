/* admin-usuarios — acoes de ACESSO da pagina Administracao (10/10).

   Liga o nucleo (nucleo.js, testado em testes/testar-admin-usuarios.mjs) ao
   Supabase de verdade:
   - quem chama: o JWT do pedido (supabase-js functions.invoke manda sozinho);
     eh_administrador() e chamado COM esse JWT;
   - Auth Admin (senha, e-mail, bloqueio): cliente com a service_role.

   Segredos: SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY ja
   existem no ambiente de toda Edge Function do projeto (o Supabase injeta);
   nada e copiado para o repositorio nem para o navegador. SITE_URL e opcional
   (padrao https://holohacking.com.br), usado no link de nova senha.

   Publicar: supabase functions deploy admin-usuarios (verify_jwt ligado, o padrao). */
import { createClient } from "jsr:@supabase/supabase-js@2";
import { tratarPedido } from "./nucleo.js";

const ORIGENS = ["https://holohacking.com.br", "https://www.holohacking.com.br", "http://127.0.0.1:5500", "http://localhost:5500"];

function cors(origem: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origem && ORIGENS.includes(origem) ? origem : ORIGENS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const h = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers: h });
  const json = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), { status, headers: { ...h, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ ok: false, erro: "metodo" }, 405);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const servico = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const site = (Deno.env.get("SITE_URL") ?? "https://holohacking.com.br").replace(/\/+$/, "");
  if (!url || !anon || !servico) return json({ ok: false, erro: "nao_configurado" }, 500);

  const autorizacao = req.headers.get("Authorization") ?? "";
  const token = autorizacao.replace(/^Bearer\s+/i, "");
  const comoQuemChama = createClient(url, anon, {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const publico = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const admin = createClient(url, servico, { auth: { persistSession: false, autoRefreshToken: false } });

  let corpo: unknown = null;
  try { corpo = await req.json(); } catch { corpo = null; }

  try {
    const r = await tratarPedido(corpo, {
      quemChama: async () => {
        if (!token) return null;
        const { data, error } = await comoQuemChama.auth.getUser(token);
        return error || !data?.user ? null : data.user.id;
      },
      ehAdmin: async () => {
        const { data, error } = await comoQuemChama.rpc("eh_administrador");
        return !error && data === true;
      },
      alvoEhAdmin: async (id: string) => {
        const { data, error } = await admin.from("administradores").select("user_id").eq("user_id", id).maybeSingle();
        return !!error || !!data;   // na duvida, trata como administrador (nao mexe)
      },
      lerUsuario: async (id: string) => {
        const { data, error } = await admin.auth.admin.getUserById(id);
        return error || !data?.user ? null : { id: data.user.id, email: data.user.email ?? null, user_metadata: data.user.user_metadata ?? {} };
      },
      atualizarUsuario: async (id: string, attrs: Record<string, unknown>) => {
        const { error } = await admin.auth.admin.updateUserById(id, attrs);
        return error ? { erro: error.message } : {};
      },
      enviarLinkSenha: async (email: string) => {
        const { error } = await publico.auth.resetPasswordForEmail(email, { redirectTo: site + "/" });
        return error ? { erro: error.message } : {};
      },
      atualizarEmailContato: async (id: string, email: string) => {
        await admin.from("profiles").update({ email_contato: email }).eq("id", id);
      },
      registrar: async (ator: string, alvo: string, acao: string, detalhes: Record<string, unknown>) => {
        const { error } = await admin.rpc("admin_registrar_acao_servico", { p_actor: ator, p_target: alvo, p_acao: acao, p_detalhes: detalhes });
        if (error) console.error("admin-usuarios: registro falhou", acao, error.code);
      },
      bytesAleatorios: (n: number) => crypto.getRandomValues(new Uint8Array(n)),
    });
    return json(r);
  } catch (e) {
    console.error("admin-usuarios: erro", e instanceof Error ? e.name : "desconhecido");
    return json({ ok: false, erro: "falha_interna" }, 500);
  }
});
