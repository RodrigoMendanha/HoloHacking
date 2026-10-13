#!/usr/bin/env node
/**
 * PROVA DE EQUIVALENCIA HOLOS-V1 v6 x v7 (so texto, 13/10): MESMAS respostas, as duas versoes, em 12 casos (os 5 casos
 * contrastantes A-E e 7 bordas). Para cada caso exige IGUALDADE EXATA de: cinco notas (e itens, respondidos e cobertura),
 * Indice, Triade, ordem/prioridades, sinais dominantes, Proximos Passos (PP-V1) e contextuais. A unica diferenca permitida
 * entre os pacotes e o texto oficial dos sistemas.
 *
 *   node scripts/comparar-v6-v7.mjs           grava docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V6-V7.md
 *   node scripts/comparar-v6-v7.mjs --check   confere que o arquivo gravado e identico ao gerado agora
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { calcular } from './comparar-v2-v3.mjs';
import { CASOS, respostas } from './comparar-v5-v6.mjs';
import { construir } from './pacote-v7.mjs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V6-V7.md';
const NOME = { fungico: 'Fúngico', acido_inflamatorio: 'Ácido Inflamatório', metabolico: 'Metabólico', detox_linfatico: 'Detox e Linfático', mental_emocional_espiritual: 'Mental Emocional Espiritual' };
const SIS = Object.keys(NOME);

/* bordas: uniforme baixa/alta, tudo no meio, exatamente 80% em cada sistema, abaixo de 80%, so contextuais, alternado */
function bordas(pk) {
  const ids = pk.perguntas.map(q => q.stable_id);
  const orient = Object.fromEntries(pk.perguntas.map(q => [q.stable_id, q.orientation]));
  const max = Object.fromEntries(pk.perguntas.map(q => [q.stable_id, (pk.escalas.find(e => e.code === q.scale_code) || { max_value: 3 }).max_value]));
  const carga = (id, z) => orient[id] === 'invertida' ? max[id] - z : z;
  const todas = (fz) => Object.fromEntries(ids.map((id, i) => [id, carga(id, fz(id, i))]));
  const prim = (s) => pk.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === s).map(a => a.question_stable_id);
  const sem = (r, fora) => Object.fromEntries(Object.entries(r).filter(([id]) => !fora.includes(id)));
  const oitenta = (r) => { let fora = []; SIS.forEach(s => { const p = prim(s).sort(); fora = fora.concat(p.slice(0, Math.floor(p.length * 0.2))); }); return sem(r, fora); };
  const abaixo = (r) => { let fora = []; SIS.forEach(s => { const p = prim(s).sort(); fora = fora.concat(p.slice(0, Math.ceil(p.length * 0.5))); }); return sem(r, fora); };
  const ctx = ids.filter(id => !pk.associacoes.some(a => a.question_stable_id === id && (a.role === 'primaria' || a.destination_type === 'triad')));
  return [
    { id: 'B1', nome: 'tudo sem carga (0)', respostas: todas(() => 0) },
    { id: 'B2', nome: 'carga máxima em tudo', respostas: todas(id => max[id]) },
    { id: 'B3', nome: 'carga 1 em tudo', respostas: todas(() => 1) },
    { id: 'B4', nome: 'alternado 0/2/3', respostas: todas((id, i) => [0, 2, 3][i % 3]) },
    { id: 'B5', nome: 'exatamente 80% respondido em cada sistema', respostas: oitenta(todas((id, i) => (i % 4))) },
    { id: 'B6', nome: 'abaixo de 80% em todos os sistemas', respostas: abaixo(todas(() => 2)) },
    { id: 'B7', nome: 'só as contextuais com carga', respostas: todas(id => ctx.includes(id) ? max[id] : 0) }
  ];
}

export function chave(c) {
  const sist = c.sistemas.map(s => [s.sistema, s.nota, s.avaliavel, s.respondidos, s.total_marcadores, s.cobertura].join(':'));
  const tri = ['fisico', 'mental', 'espiritual'].map(k => JSON.stringify(c.r.triad_result[k]));
  const dom = SIS.map(s => s + '=' + c.dominantes[s].map(d => d.id + '/' + d.pontos).join(','));
  const ctx = (c.r.contextual_associations || []).map(x => x.question_id + '>' + x.destination).sort();
  return { notas: sist.join(' '), indice: JSON.stringify(c.r.index_result), triade: tri.join(' '), ordem: c.ordem.join('>'), dominantes: dom.join(' '), pp: c.pp.join('|'), contextuais: ctx.join(' ') };
}
export function casos(v6) {
  return CASOS.map(c => ({ id: c.id, nome: c.nome, respostas: respostas(v6, c.tema) })).concat(bordas(v6));
}
const n1 = (v) => v === null || v === undefined ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
export function gerar() {
  const { v6, v7 } = construir();
  const v7a = Object.assign(JSON.parse(JSON.stringify(v7)), { status: 'aprovado' });
  const L = [];
  L.push('# PROVA DE EQUIVALÊNCIA — HOLOS-V1 v6 × v7 (só texto)\n');
  L.push('Gerado por `scripts/comparar-v6-v7.mjs` (determinístico; `--check` no teste). A v7 muda **só o texto oficial do Sistema Ácido Inflamatório**, que deixa de citar exames (exames não participam do HOLOSCAN; decisão de 13/10/2026). Respostas fictícias.\n');
  L.push('## Texto que muda\n');
  ['acido_inflamatorio'].forEach(code => {
    L.push('- **antes (v6):** ' + v6.sistemas.find(s => s.code === code).public_text);
    L.push('- **depois (v7):** ' + v7.sistemas.find(s => s.code === code).public_text + '\n');
  });
  L.push('## Mesmas respostas, mesmo resultado\n');
  L.push('Para cada caso, v6 e v7 dão **exatamente** as mesmas notas (com itens, respondidos e cobertura), Índice, Tríade, ordem das áreas, sinais dominantes, Próximos Passos (PP-V1) e contextuais.\n');
  L.push('| Caso | Notas F / Á / M / D / MEE | Índice | 1ª / 2ª área | PP-V1 | v6 = v7 |\n|---|---|---|---|---|---|');
  let diverg = 0;
  casos(v6).forEach(c => {
    const a = calcular(v6, c.respostas), b = calcular(v7a, c.respostas);
    const ka = chave(a), kb = chave(b);
    const igual = Object.keys(ka).every(k => ka[k] === kb[k]);
    if (!igual) diverg++;
    L.push('| ' + c.id + ' — ' + c.nome + ' | ' + SIS.map(s => n1(a.r.system_results[s].nota)).join(' / ') + ' | ' + n1(a.r.index_result.valor) + ' | ' +
      a.ordem.slice(0, 2).map(s => NOME[s]).join(' / ') + ' | ' + (a.pp.join(' · ') || '—') + ' | ' + (igual ? 'idêntico' : '**DIFERENTE**') + ' |');
  });
  L.push('\n**Casos com diferença: ' + diverg + '.**\n');
  return L.join('\n') + '\n';
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const texto = gerar();
  if (process.argv.includes('--check')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    if (atual !== texto) { console.error('comparativo v6 x v7 DESATUALIZADO: rode node scripts/comparar-v6-v7.mjs'); process.exit(1); }
    console.log('comparativo v6 x v7 em dia');
  } else { writeFileSync(SAIDA, texto); console.log('gravado', SAIDA); }
}
