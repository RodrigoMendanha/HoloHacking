/**
 * O veredito de UMA suite, a partir do que ela fez — nao do que ela disse.
 *
 * Uma suite passa somente se as tres coisas valem juntas:
 *   1. o processo terminou com exit 0;
 *   2. nenhuma linha da saida comeca com "FALHA";
 *   3. houve pelo menos uma assercao "ok" (suite que nao afirma nada nao
 *      prova nada — costuma ser uma suite que morreu antes do primeiro teste).
 *
 * O runner usa isto; testar-guarda-falhas.mjs prova que funciona.
 */
export function avaliarSuite({ codigo, saida }) {
  const linhas = String(saida || '').split('\n');
  const oks = linhas.filter(l => /^\s+ok\s/.test(l)).length;
  const falhas = linhas.filter(l => /^\s*FALHA\b/.test(l)).length;
  const motivos = [];
  if (codigo !== 0) motivos.push('exit ' + codigo);
  if (falhas > 0) motivos.push(falhas + ' FALHA');
  if (oks === 0) motivos.push('nenhuma assercao ok');
  return { passou: motivos.length === 0, oks, falhas, motivos };
}
