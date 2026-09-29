/* ===========================================================================
   METANUTRI — a porta do app para o agente de negocio do hub
   ===========================================================================

   Esta funcao e a UNICA ligacao entre o app e o MetaNutri, o mentor de
   NEGOCIO da nutricionista (precificacao, captacao, posicionamento e
   consultorio). Ele nao e clinico e nao recebe dado de paciente.

     navegador --(JWT da nutricionista)--> holos-ai --(chave ags_)--> hub

   O que ela garante:
   - so responde a quem tem sessao valida no Auth do app (senao, 401);
   - a chave do hub vem do secret METANUTRI_AGENTE_KEY e nunca volta ao
     navegador nem vai para o log: a resposta e sempre {texto} ou
     {motivo, frase}, montada aqui, campo a campo;
   - sem o secret, responde motivo "sem_chave" e nada quebra;
   - teto de tempo (60 s em producao) cobrindo a chamada e a leitura da
     resposta; estourou, a frase e humana e o motivo e "tempo_esgotado";
   - repassa ao hub so {mensagem, historico}; nao grava a conversa.

   Este arquivo nao importa nada e nao usa Deno: o index.ts liga as
   dependencias reais, e os testes (Node) ligam um hub falso.
   =========================================================================== */

export const MAX_MENSAGEM = 2000;
export const MAX_HISTORICO = 20;
const MAX_CORPO = 100_000;
const MAX_FRASE = 600;
const MAX_TEXTO = 20_000;

export const FRASES: Record<string, string> = {
  sem_login: "Entre na sua conta do HoloHacking pra falar com o MetaNutri.",
  sem_chave: "O MetaNutri ainda não foi ligado neste app. Avise o suporte do HoloHacking.",
  mensagem: "Escreva uma pergunta de até 2000 caracteres.",
  tempo_esgotado: "O MetaNutri demorou demais pra responder. Tente de novo em instantes.",
  hub_fora: "Não consegui falar com o MetaNutri agora. Tente de novo em instantes.",
  metodo: "Pedido inválido.",
};

/** Status HTTP que a funcao devolve para cada motivo do hub. 401 fica
    reservado para "sem login no app": chave_invalida e problema do servidor,
    nao da nutricionista. */
const STATUS_DO_MOTIVO: Record<string, number> = {
  chave_invalida: 503,
  sem_chave: 503,
  limite_do_dia: 429,
  devagar: 429,
  mensagem: 400,
  ia_falhou: 502,
  banco: 502,
};

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type Usuario = { id: string };

export type Dependencias = {
  /** valor do secret METANUTRI_AGENTE_KEY; vazio/ausente = sem_chave */
  chave: string | undefined | null;
  hubUrl: string;
  /** teto de tempo da chamada ao hub, em milissegundos */
  tetoMs: number;
  /** confere o JWT no Auth; devolve null se nao for sessao valida */
  usuario: (token: string) => Promise<Usuario | null>;
  fetch: typeof fetch;
  /** uma linha por pedido: status, motivo e tempo. Nunca conteudo nem chave. */
  log?: (linha: string) => void;
};

function json(dados: unknown, status: number): Response {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

function recusa(motivo: string, status: number, frase?: string): Response {
  return json({ motivo, frase: frase || FRASES[motivo] || FRASES.hub_fora }, status);
}

/** Tira do texto qualquer ocorrencia da chave (defesa: o hub nunca deveria
    ecoa-la, mas se ecoar, ela nao chega ao navegador). */
function semChave(texto: string, chave: string): string {
  if (!chave || chave.length < 8) return texto;
  return texto.split(chave).join("[…]");
}

type Fala = { autor: "visitante" | "agente"; texto: string };

function limparHistorico(bruto: unknown): Fala[] {
  if (!Array.isArray(bruto)) return [];
  const falas: Fala[] = [];
  for (const f of bruto) {
    if (!f || typeof f !== "object") continue;
    const autor = (f as Record<string, unknown>).autor;
    const texto = (f as Record<string, unknown>).texto;
    if ((autor !== "visitante" && autor !== "agente") || typeof texto !== "string") continue;
    const t = texto.trim();
    if (!t) continue;
    falas.push({ autor, texto: t.slice(0, MAX_MENSAGEM) });
  }
  return falas.slice(-MAX_HISTORICO);
}

export async function tratar(req: Request, dep: Dependencias): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const inicio = Date.now();
  const registrar = (status: number, motivo: string) => {
    if (dep.log) dep.log(`metanutri status=${status} motivo=${motivo} ms=${Date.now() - inicio}`);
  };
  const fim = (r: Response, motivo: string) => { registrar(r.status, motivo); return r; };

  if (req.method !== "POST") return fim(recusa("metodo", 405), "metodo");

  // 1. Sessao da nutricionista
  const auth = req.headers.get("Authorization") || "";
  const token = /^Bearer\s+(.+)$/i.exec(auth.trim())?.[1]?.trim() || "";
  let usuario: Usuario | null = null;
  if (token) {
    try { usuario = await dep.usuario(token); } catch { usuario = null; }
  }
  if (!usuario || !usuario.id) return fim(recusa("sem_login", 401), "sem_login");

  // 2. Chave do hub
  const chave = (dep.chave || "").trim();
  if (!chave) return fim(recusa("sem_chave", 503), "sem_chave");

  // 3. Corpo: so {mensagem, historico}
  let corpo: Record<string, unknown>;
  try {
    const bruto = await req.text();
    if (bruto.length > MAX_CORPO) return fim(recusa("mensagem", 400), "mensagem");
    const lido = JSON.parse(bruto);
    if (!lido || typeof lido !== "object" || Array.isArray(lido)) throw new Error("corpo");
    corpo = lido as Record<string, unknown>;
  } catch {
    return fim(recusa("mensagem", 400), "mensagem");
  }
  const mensagem = typeof corpo.mensagem === "string" ? corpo.mensagem.trim() : "";
  if (!mensagem || mensagem.length > MAX_MENSAGEM) return fim(recusa("mensagem", 400), "mensagem");
  const historico = limparHistorico(corpo.historico);

  // 4. Hub, com teto de tempo cobrindo a chamada E a leitura da resposta
  const controle = new AbortController();
  let estourou = false;
  const relogio = setTimeout(() => { estourou = true; controle.abort(); }, dep.tetoMs);
  let status = 0;
  let bruto = "";
  try {
    const r = await dep.fetch(dep.hubUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${chave}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mensagem, historico }),
      signal: controle.signal,
    });
    status = r.status;
    bruto = await r.text();
  } catch {
    clearTimeout(relogio);
    return estourou
      ? fim(recusa("tempo_esgotado", 504), "tempo_esgotado")
      : fim(recusa("hub_fora", 502), "hub_fora");
  }
  clearTimeout(relogio);
  if (estourou) return fim(recusa("tempo_esgotado", 504), "tempo_esgotado");

  let dados: Record<string, unknown> | null = null;
  try {
    const lido = JSON.parse(bruto);
    if (lido && typeof lido === "object" && !Array.isArray(lido)) dados = lido as Record<string, unknown>;
  } catch { dados = null; }

  // 5. Resposta: montada campo a campo, nada do hub passa inteiro
  if (dados && status >= 200 && status < 300 && typeof dados.texto === "string" && dados.texto.trim()) {
    return fim(json({ texto: semChave(dados.texto, chave).slice(0, MAX_TEXTO) }, 200), "texto");
  }
  if (dados && typeof dados.motivo === "string" && typeof dados.frase === "string" && dados.frase.trim()) {
    const motivo = /^[a-z_]{1,40}$/.test(dados.motivo) ? dados.motivo : "hub_fora";
    const frase = semChave(dados.frase.trim(), chave).slice(0, MAX_FRASE);
    return fim(recusa(motivo, STATUS_DO_MOTIVO[motivo] || 502, frase), motivo);
  }
  return fim(recusa("hub_fora", 502), "hub_fora");
}

/** Confere o access token no Auth do proprio projeto (GET /auth/v1/user).
    Sessao anonima nao conta como nutricionista logada. */
export function usuarioPeloAuth(
  supabaseUrl: string,
  apikey: string,
  f: typeof fetch,
  tetoMs = 10_000,
): (token: string) => Promise<Usuario | null> {
  return async (token: string) => {
    if (!supabaseUrl || !apikey) return null;
    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), tetoMs);
    try {
      const r = await f(`${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user`, {
        headers: { "apikey": apikey, "Authorization": `Bearer ${token}` },
        signal: controle.signal,
      });
      if (r.status !== 200) return null;
      const u = await r.json();
      if (!u || typeof u.id !== "string" || !u.id || u.is_anonymous === true) return null;
      return { id: u.id };
    } catch {
      return null;
    } finally {
      clearTimeout(relogio);
    }
  };
}
