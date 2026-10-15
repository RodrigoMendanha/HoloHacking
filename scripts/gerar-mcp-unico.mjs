// Gera supabase/functions/holohacking-mcp/ARQUIVO-UNICO-PAINEL.ts: o index.ts com o nucleo.js, os modulos do metodo
// (shared/*.js) e o contrato/exemplo (shared/*.json) embutidos, para colar no editor de Edge Functions do painel do Supabase
// (que publica um arquivo so). Conteudo IDENTICO ao conjunto; testes/testar-mcp-funcao.mjs confere que esta atualizado e
// roda a funcao pelos dois caminhos. Uso: node scripts/sincronizar-mcp-shared.mjs && node scripts/gerar-mcp-unico.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../supabase/functions/holohacking-mcp/', import.meta.url);
const ler = (f) => readFileSync(new URL(f, dir), 'utf8');
export function gerar() {
  const mods = ['resultado-direcao.js', 'holos-ai-contrato.js', 'playbook-holos.js', 'sistemas-fechamento.js']
    .map(f => '// ---- shared/' + f + ' (embutido) ----\n' + ler('shared/' + f)).join('\n');
  const nucleo = ler('nucleo.js').replace(/^export /gm, '');
  let index = ler('index.ts');
  index = index.replace(/^import "\.\/shared\/[a-z-]+\.js";\n/gm, '')
    .replace(/^import contrato from .*\n/m, '').replace(/^import exemplo from .*\n/m, '')
    .replace(/^import \{ criarServidor \} from "\.\/nucleo\.js";\n/m, '');
  const json = '// ---- contrato e exemplo HOLOS_AI_RESULT v1 (embutidos) ----\nconst contrato = ' + JSON.stringify(JSON.parse(ler('shared/contrato-holos-ai-result.json'))) +
    ';\nconst exemplo = ' + JSON.stringify(JSON.parse(ler('shared/exemplo-holos-ai-result.json'))) + ';\n';
  return '// @ts-nocheck\n// GERADO por scripts/gerar-mcp-unico.mjs — NAO editar a mao (edite index.ts / nucleo.js / os modulos do app e gere de novo).\n' +
    '// Para colar no painel: Supabase > Edge Functions > Deploy a new function > Via Editor, nome "holohacking-mcp";\n' +
    '// depois, em Details, DESLIGUE "Enforce JWT Verification" (quem chama e o assistente de IA, com a chave pessoal).\n' +
    index.replace('import postgres from "npm:postgres@3.4.5";\n', 'import postgres from "npm:postgres@3.4.5";\n\n' + mods + '\n' + json + '\n// ---- nucleo.js (embutido) ----\n' + nucleo + '// ---- fim do nucleo ----\n');
}
if (process.argv[1] && process.argv[1].endsWith('gerar-mcp-unico.mjs')) {
  writeFileSync(new URL('ARQUIVO-UNICO-PAINEL.ts', dir), gerar());
  console.log('gerado: supabase/functions/holohacking-mcp/ARQUIVO-UNICO-PAINEL.ts');
}
