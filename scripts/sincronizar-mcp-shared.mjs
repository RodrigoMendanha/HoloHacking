/**
 * Copia para a Edge Function holohacking-mcp os modulos do METODO que o servidor MCP reaproveita (os MESMOS do app) e o
 * contrato HOLOS_AI_RESULT v1 com o exemplo. Rode depois de mudar qualquer um deles; testes/testar-mcp-funcao.mjs falha se
 * a copia estiver diferente.   node scripts/sincronizar-mcp-shared.mjs
 */
import { copyFileSync, mkdirSync } from 'node:fs';
const R = new URL('../', import.meta.url).pathname;
export const ARQUIVOS = {
  'resultado-direcao.js': 'resultado-direcao.js', 'holos-ai-contrato.js': 'holos-ai-contrato.js', 'playbook-holos.js': 'playbook-holos.js',
  'sistemas-fechamento.js': 'sistemas-fechamento.js',
  'contrato-holos-ai-result.json': 'docs/v1/holos-ai-gpt/06-SCHEMA-HOLOS-AI-RESULT.json', 'exemplo-holos-ai-result.json': 'docs/v1/holos-ai-gpt/exemplo-resultado.json'
};
export const DESTINO = R + 'supabase/functions/holohacking-mcp/shared/';
if (import.meta.url === 'file://' + process.argv[1]) {
  mkdirSync(DESTINO, { recursive: true });
  for (const [dst, src] of Object.entries(ARQUIVOS)) copyFileSync(R + src, DESTINO + dst);
  console.log('copiados:', Object.keys(ARQUIVOS).length);
}
