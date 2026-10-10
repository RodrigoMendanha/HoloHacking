// @ts-nocheck
// GERADO por scripts/gerar-admin-usuarios-unico.mjs — NAO editar a mao (edite index.ts / nucleo.js e gere de novo).
// Para colar no painel: Supabase > Edge Functions > Deploy a new function > Via Editor, nome "admin-usuarios".
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

// ---- nucleo.js (embutido) ----
// @ts-nocheck
/* admin-usuarios — NUCLEO (sem Deno, sem rede): a regra de cada acao.

   O index.ts liga este nucleo ao Supabase de verdade (Auth Admin com a
   service_role, que so existe no ambiente da Edge Function). Os testes
   (testes/testar-admin-usuarios.mjs) e o servidor falso usam o MESMO nucleo
   com dependencias simuladas.

   Acoes (corpo JSON { acao, user_id, ... }):
     definir_senha      gera uma senha provisoria, marca
                        user_metadata.precisa_trocar_senha = true e devolve a
                        senha UMA vez (nunca vai para o registro)
     enviar_link_senha  e-mail "criar nova senha" (fluxo normal do Supabase)
     trocar_email       { email } troca o e-mail de login (ja confirmado) e o
                        e-mail de contato do perfil
     bloquear           { motivo? } ban no Auth: a pessoa nao entra
     desbloquear        tira o ban

   Regras: so administrador (conferido com o JWT de quem chama); nunca na
   propria conta; nunca numa conta de administrador; tudo registrado em
   admin_audit_log (admin_registrar_acao_servico), sem senha/token/link.
   Resposta sempre { ok: true, ... } ou { ok: false, erro, mensagem }. */

const ACOES = ['definir_senha', 'enviar_link_senha', 'trocar_email', 'bloquear', 'desbloquear'];
const BAN_LONGO = '876000h';   // ~100 anos: "ate desbloquear"
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sem 0/O, 1/l/I

function gerarSenha(bytesAleatorios) {
  // 12 caracteres sem vies (descarta bytes >= 220 = 4 x 55), com maiuscula, minuscula e numero
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    let s = '';
    while (s.length < 12) for (const x of bytesAleatorios(32)) { if (x < 220 && s.length < 12) s += ALFABETO[x % ALFABETO.length]; }
    if (/[a-z]/.test(s) && /[A-Z]/.test(s) && /[2-9]/.test(s)) return s;
  }
  throw new Error('gerador de senha sem entropia');
}

const falha = (erro, mensagem) => ({ ok: false, erro, mensagem: mensagem || erro });

/**
 * @param corpo  objeto do pedido
 * @param d      dependencias:
 *   quemChama() -> uid | null            (JWT de quem chamou)
 *   ehAdmin(uid) -> boolean              (eh_administrador com o JWT de quem chamou)
 *   alvoEhAdmin(uid) -> boolean
 *   lerUsuario(uid) -> { id, email, user_metadata } | null
 *   atualizarUsuario(uid, attrs) -> { erro?: string }
 *   enviarLinkSenha(email) -> { erro?: string }
 *   atualizarEmailContato(uid, email) -> void
 *   registrar(ator, alvo, acao, detalhes) -> void
 *   bytesAleatorios(n) -> Uint8Array
 */
async function tratarPedido(corpo, d) {
  const uid = await d.quemChama();
  if (!uid) return falha('nao_autenticado', 'Entre de novo.');
  if (!(await d.ehAdmin(uid))) return falha('apenas_administradores', 'Só a administração pode fazer isso.');
  corpo = corpo && typeof corpo === 'object' ? corpo : {};
  const acao = corpo.acao, alvo = String(corpo.user_id || '');
  if (!ACOES.includes(acao)) return falha('acao_invalida');
  if (!UUID.test(alvo)) return falha('conta_nao_encontrada');
  if (alvo === uid) return falha('propria_conta', 'Use o Perfil para mudar a sua própria conta.');
  const u = await d.lerUsuario(alvo);
  if (!u) return falha('conta_nao_encontrada');
  if (await d.alvoEhAdmin(alvo)) return falha('alvo_administrador', 'Contas da administração não são alteradas por aqui.');

  if (acao === 'definir_senha') {
    const senha = gerarSenha(d.bytesAleatorios);
    const meta = Object.assign({}, u.user_metadata || {}, { precisa_trocar_senha: true });
    const r = await d.atualizarUsuario(alvo, { password: senha, user_metadata: meta });
    if (r && r.erro) return falha('falha_auth', r.erro);
    await d.registrar(uid, alvo, 'definir_senha', { provisoria: true });
    return { ok: true, senha_provisoria: senha };
  }
  if (acao === 'enviar_link_senha') {
    if (!u.email) return falha('email_invalido');
    const r = await d.enviarLinkSenha(u.email);
    if (r && r.erro) return falha(/rate limit|too many/i.test(r.erro) ? 'limite_envio' : 'falha_auth', r.erro);
    await d.registrar(uid, alvo, 'enviar_link_senha', {});
    return { ok: true };
  }
  if (acao === 'trocar_email') {
    const novo = String(corpo.email || '').trim().toLowerCase();
    if (!EMAIL.test(novo) || novo.length > 254) return falha('email_invalido');
    if (novo === String(u.email || '').toLowerCase()) return falha('email_igual');
    const r = await d.atualizarUsuario(alvo, { email: novo, email_confirm: true });
    if (r && r.erro) return falha(/already|registered|exists|duplicate/i.test(r.erro) ? 'email_em_uso' : 'falha_auth', r.erro);
    await d.atualizarEmailContato(alvo, novo);
    await d.registrar(uid, alvo, 'trocar_email', { de: u.email || null, para: novo });
    return { ok: true, email: novo };
  }
  const bloquear = acao === 'bloquear';
  const r = await d.atualizarUsuario(alvo, { ban_duration: bloquear ? BAN_LONGO : 'none' });
  if (r && r.erro) return falha('falha_auth', r.erro);
  const motivo = String(corpo.motivo || '').trim().slice(0, 500);
  await d.registrar(uid, alvo, acao, bloquear && motivo ? { motivo } : {});
  return { ok: true };
}
// ---- fim do nucleo ----

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
