/**
 * O PROPRIO HARNESS — uma assercao que falha precisa derrubar o exit code.
 *
 * Roda scripts descartaveis (num diretorio temporario do sistema, nunca no
 * repositorio) que importam a guarda e imprimem FALHA de formas diferentes,
 * e confere o exit code real de cada processo. Depois confere o veredito do
 * runner (avaliarSuite) nos casos que a guarda sozinha nao cobre.
 */
import './guarda-falhas.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { avaliarSuite } from './avaliar-suite.mjs';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };

const guarda = pathToFileURL(fileURLToPath(new URL('./guarda-falhas.mjs', import.meta.url))).href;
const dir = mkdtempSync(join(tmpdir(), 'holo-guarda-'));

function rodar(nome, corpo) {
  const arq = join(dir, nome + '.mjs');
  writeFileSync(arq, `import '${guarda}';\n${corpo}\n`);
  const r = spawnSync(process.execPath, [arq], { encoding: 'utf8' });
  return { codigo: r.status, saida: (r.stdout || '') + (r.stderr || '') };
}

console.log('\n  1. A GUARDA DERRUBA O EXIT CODE\n');

const soImprime = rodar('so-imprime', `
const ok = (c, t) => console.log((c ? '  ok    ' : '  FALHA ') + t);
ok(true, 'passa'); ok(false, 'falha proposital');`);
ok(soImprime.codigo !== 0, 'ok() que so imprime FALHA → exit ' + soImprime.codigo + ' (antes: 0)');

const exitZero = rodar('exit-zero', `
console.log('  ok    passa'); console.log('  FALHA falha proposital'); process.exit(0);`);
ok(exitZero.codigo !== 0, 'FALHA seguida de process.exit(0) explicito → exit ' + exitZero.codigo);

const formaSeparada = rodar('forma-separada', `
console.log('  ok    passa'); console.log('  FALHA', 'motivo em argumento separado');`);
ok(formaSeparada.codigo !== 0, "console.log('  FALHA', motivo) tambem conta → exit " + formaSeparada.codigo);

const verde = rodar('verde', `console.log('  ok    passa'); console.log('  6. FALHA E ROLLBACK (titulo de secao)');`);
ok(verde.codigo === 0, 'suite verde (titulo de secao com a palavra FALHA no meio nao conta) → exit ' + verde.codigo);

const excecao = rodar('excecao', `console.log('  ok    passa'); throw new Error('quebrou');`);
ok(excecao.codigo !== 0, 'excecao nao tratada → exit ' + excecao.codigo);

console.log('\n  2. O VEREDITO DO RUNNER\n');

ok(!avaliarSuite(soImprime).passou, 'runner reprova a suite que imprimiu FALHA');
ok(avaliarSuite(verde).passou && avaliarSuite(verde).oks === 1, 'runner aprova a suite verde e conta 1 assercao');
ok(!avaliarSuite({ codigo: 0, saida: '  FALHA x\n' }).passou,
   'runner reprova FALHA mesmo se o processo tivesse saido com 0');
ok(!avaliarSuite({ codigo: 0, saida: 'nada aqui\n' }).passou,
   'runner reprova suite sem nenhuma assercao ok (morreu antes de testar)');
ok(!avaliarSuite({ codigo: 1, saida: '  ok    a\n' }).passou,
   'runner reprova exit != 0 mesmo com todas as assercoes ok');

rmSync(dir, { recursive: true, force: true });
console.log(falhou ? '\n  harness com FALHA' : '\n  harness confiavel');
process.exit(falhou ? 1 : 0);
