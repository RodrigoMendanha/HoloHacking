/* holos-ai — a porta do app para o MetaNutri (ver metanutri.ts).

   Ambiente da funcao (painel do Supabase → Edge Functions → Secrets):
   - METANUTRI_AGENTE_KEY: a chave ags_ do hub. Sem ela, a funcao responde
     {motivo: "sem_chave"} e o app mostra a frase; nada quebra.
   - SUPABASE_URL e SUPABASE_ANON_KEY: postos pelo proprio Supabase, usados
     so para conferir o JWT da nutricionista em /auth/v1/user.

   Deploy com verify_jwt = false: a conferencia do JWT e feita aqui dentro
   (usuarioPeloAuth), e responde 401 sem sessao valida. */
import { tratar, usuarioPeloAuth } from "./metanutri.ts";

const HUB_URL = "https://hub.luansales.com/api/agente-site";
const TETO_MS = 60_000;

Deno.serve((req: Request) => {
  const apikey = Deno.env.get("SUPABASE_ANON_KEY") || req.headers.get("apikey") || "";
  return tratar(req, {
    chave: Deno.env.get("METANUTRI_AGENTE_KEY"),
    hubUrl: HUB_URL,
    tetoMs: TETO_MS,
    usuario: usuarioPeloAuth(Deno.env.get("SUPABASE_URL") || "", apikey, fetch),
    fetch,
    log: (linha: string) => console.log(linha),
  });
});
