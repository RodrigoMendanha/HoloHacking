/**
 * GUARDA DE FALHAS — importada no topo de toda suite (testar-*.mjs).
 *
 * Cada suite tem o seu `ok()` e imprime "  FALHA <texto>" quando uma
 * assercao nao passa. Algumas so imprimiam: o processo terminava com
 * exit 0 e `npm run teste` saia verde com FALHA no log. Esta guarda fecha
 * isso sem depender de cada suite lembrar de marcar `falhou`:
 *
 *   - conta toda linha de console.log que COMECA com "FALHA";
 *   - no evento 'exit', se contou alguma, forca process.exitCode = 1 —
 *     inclusive por cima de um process.exit(0) explicito (o Node le
 *     exitCode de novo depois dos listeners de 'exit').
 *
 * Nao troca nenhuma assercao e nao esconde nenhuma saida: so impede que
 * uma falha impressa termine em verde.
 */

const original = console.log.bind(console);
let falhas = 0;

console.log = (...args) => {
  if (typeof args[0] === 'string' && /^\s*FALHA\b/.test(args[0])) falhas++;
  original(...args);
};

process.on('exit', (codigo) => {
  if (falhas > 0) {
    if (!codigo) original('\n  [guarda-falhas] ' + falhas + ' assercao(oes) com FALHA — saindo com exit 1');
    process.exitCode = 1;
  }
});

export const quantasFalhas = () => falhas;
