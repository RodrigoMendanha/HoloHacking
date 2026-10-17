// Gera supabase/functions/admin-usuarios/ARQUIVO-UNICO-PAINEL.ts: o index.ts com o nucleo.js embutido, para colar no
// editor de Edge Functions do painel do Supabase (que publica um arquivo so). Conteudo IDENTICO ao par index.ts + nucleo.js;
// testes/testar-admin-usuarios.mjs confere que o arquivo esta atualizado. Uso: node scripts/gerar-admin-usuarios-unico.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('../supabase/functions/admin-usuarios/', import.meta.url);
export function gerar() {
  const nucleo = readFileSync(new URL('nucleo.js', dir), 'utf8').replace(/^export /gm, '');
  const index = readFileSync(new URL('index.ts', dir), 'utf8').replace(/^import \{ tratarPedido \} from "\.\/nucleo\.js";\n/m, '');
  return '// @ts-nocheck\n// GERADO por scripts/gerar-admin-usuarios-unico.mjs — NAO editar a mao (edite index.ts / nucleo.js e gere de novo).\n' +
    '// Para colar no painel: Supabase > Edge Functions > Deploy a new function > Via Editor, nome "admin-usuarios".\n' +
    index.replace('import { createClient } from "jsr:@supabase/supabase-js@2";\n', 'import { createClient } from "jsr:@supabase/supabase-js@2";\n\n// ---- nucleo.js (embutido) ----\n' + '// @ts-nocheck\n' + nucleo + '// ---- fim do nucleo ----\n');
}
if (process.argv[1] && process.argv[1].endsWith('gerar-admin-usuarios-unico.mjs')) {
  writeFileSync(new URL('ARQUIVO-UNICO-PAINEL.ts', dir), gerar());
  console.log('gerado: supabase/functions/admin-usuarios/ARQUIVO-UNICO-PAINEL.ts');
}
