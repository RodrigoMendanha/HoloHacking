/* holos-ai — HOLOS AI em estado inerte (ver indisponivel.ts).

   Responde 503 HOLOS_AI_NAO_CONFIGURADA a qualquer pedido, sem chamar nada
   e sem ler secret. A implementacao da HOLOS AI vem numa rodada propria. */
import { tratar } from "./indisponivel.ts";

Deno.serve((req: Request) => tratar(req));
