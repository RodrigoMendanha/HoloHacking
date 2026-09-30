/* ===========================================================================
   HOLOS AI — Edge Function em estado INERTE
   ===========================================================================

   HOLOS AI e a camada de inteligencia artificial do HoloHacking: recebe o
   contexto ja organizado pelo HOLOSCAN e ajuda a nutricionista a discutir o
   caso. Nao diagnostica, nao prescreve e nao altera nada do HOLOSCAN.

   A arquitetura definitiva dela sera feita numa rodada propria. Ate la, esta
   funcao e so um marcador seguro:
   - nao chama servico externo nenhum;
   - nao le secret nem variavel de ambiente;
   - nao usa a chave de servico do banco nem le tabela;
   - nao recebe nem devolve dado clinico (o corpo do pedido nem e lido);
   - responde 503 com o codigo HOLOS_AI_NAO_CONFIGURADA.

   O frontend atual (holos-ai.js) nao chama esta funcao.

   Este arquivo nao importa nada e nao usa Deno, para os testes rodarem no
   Node; o index.ts so o liga ao Deno.serve.
   =========================================================================== */

export const CODIGO = "HOLOS_AI_NAO_CONFIGURADA";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function tratar(req: Request): Response {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  return new Response(
    JSON.stringify({ erro: CODIGO, mensagem: "A HOLOS AI ainda não está disponível." }),
    { status: 503, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } },
  );
}
