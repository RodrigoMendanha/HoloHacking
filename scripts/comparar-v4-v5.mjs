#!/usr/bin/env node
/**
 * COMPARATIVO HOLOS-V1 v4 x v5 (Lote 2B, 13/10): MESMAS respostas, as duas versoes.
 * Para cada caso: nota dos 5 sistemas (e quantos itens pontuam), Indice, Triade, 1a/2a area, sinais dominantes
 * (regra de resultado_holos_dominantes, MR-V1) e ferramentas do PP-V1 (30 regras). Usa o mesmo calculo de
 * scripts/comparar-v2-v3.mjs.
 *
 *   node scripts/comparar-v4-v5.mjs           grava docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V4-V5.md
 *   node scripts/comparar-v4-v5.mjs --check   confere que o arquivo gravado e identico ao gerado agora
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { calcular } from './comparar-v2-v3.mjs';
import { construir } from './pacote-v5.mjs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V4-V5.md';

const NOME = { fungico: 'Fúngico', acido_inflamatorio: 'Ácido Inflamatório', metabolico: 'Metabólico', detox_linfatico: 'Detox e Linfático', mental_emocional_espiritual: 'Mental Emocional Espiritual' };
const SIS = Object.keys(NOME);
const MOVIDAS = ['ESP-101', 'ESP-103', 'ESP-203', 'ESP-404', 'ESP-405'], CTX = ['ESP-501', 'ESP-502'];

export function fixtures(v4) {
  const ids = v4.perguntas.map(q => q.stable_id);
  const orient = Object.fromEntries(v4.perguntas.map(q => [q.stable_id, q.orientation]));
  const soma = (id) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const carga = (id, z) => orient[id] === 'invertida' ? 3 - z : z;   // z = carga desejada
  const monta = (f) => Object.fromEntries(ids.map(id => [id, carga(id, f(id))]));
  return [
    { id: 'F1', nome: 'Carla fictícia (padrão determinístico)', respostas: Object.fromEntries(ids.map(id => [id, soma(id) % 4])) },
    { id: 'F2', nome: 'carga espiritual alta (ESP = 3), resto 1', respostas: monta(id => id.startsWith('ESP') ? 3 : 1) },
    { id: 'F3', nome: 'só as 5 ESP movidas = 3, resto 1', respostas: monta(id => MOVIDAS.includes(id) ? 3 : 1) },
    { id: 'F4', nome: 'só ESP-501 e ESP-502 = 3 (contextuais na v5), resto 1', respostas: monta(id => CTX.includes(id) ? 3 : 1) },
    { id: 'F5', nome: 'carga física alta (SNT = 3), resto 0', respostas: monta(id => id.startsWith('SNT') ? 3 : 0) },
    { id: 'F6', nome: 'carga uniforme 2', respostas: monta(() => 2) }
  ];
}

const n1 = (v) => v === null || v === undefined ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
export function gerar() {
  const { v4, v5 } = construir();
  v5.status = 'aprovado';
  const L = [];
  L.push('# COMPARATIVO HOLOSCAN — HOLOS-V1 v4 × v5 (mesmas respostas)\n');
  L.push('Gerado por `scripts/comparar-v4-v5.mjs` (determinístico; `--check` no teste). A v5 aplica o Lote 2B de 13/10/2026 sobre a v4:');
  L.push('- ESP-101, ESP-103, ESP-203, ESP-404 e ESP-405 passam a pontuar o Mental Emocional Espiritual;');
  L.push('- ESP-501 e ESP-502 passam a ser só contextuais: são coletadas, mas não pontuam e não entram na Tríade;');
  L.push('- ESP-303, EMO-502 e EMO-504 ficam como estavam.\n');
  L.push('As respostas são fictícias. Notas, Índice e Tríade vêm do `MotorMetodologico.calcular`. Os sinais dominantes seguem a regra de `resultado_holos_dominantes` (MR-V1), e as ferramentas vêm de `ProximosPassos.selecionar` sobre as 30 regras do PP-V1.\n');
  fixtures(v4).forEach(f => {
    const a = calcular(v4, f.respostas), b = calcular(v5, f.respostas);
    L.push('## ' + f.id + ' — ' + f.nome + '\n');
    L.push('| | v4 | v5 |\n|---|---|---|');
    SIS.forEach(s => {
      const x = a.r.system_results[s], y = b.r.system_results[s];
      L.push('| ' + NOME[s] + ' (nota · itens) | ' + n1(x.nota) + ' · ' + x.total + ' | ' + n1(y.nota) + ' · ' + y.total + ' |');
    });
    L.push('| **Índice** | ' + n1(a.r.index_result.valor) + ' | ' + n1(b.r.index_result.valor) + ' |');
    const tri = (r) => ['fisico', 'mental', 'espiritual'].map(k => n1(r.triad_result[k] && r.triad_result[k].nota)).join(' / ');
    L.push('| Tríade Corpo / Mente / Espírito | ' + tri(a.r) + ' | ' + tri(b.r) + ' |');
    L.push('| 1ª / 2ª área | ' + a.ordem.slice(0, 2).map(s => NOME[s]).join(' / ') + ' | ' + b.ordem.slice(0, 2).map(s => NOME[s]).join(' / ') + ' |');
    L.push('| PP-V1 (principal · complementares) | ' + a.pp.join(' · ') + ' | ' + b.pp.join(' · ') + ' |');
    SIS.forEach(s => {
      const d = (x) => x.dominantes[s].map(o => o.id + ' (' + o.pontos + ')').join(', ') || '—';
      L.push('| dominantes ' + NOME[s] + ' | ' + d(a) + ' | ' + d(b) + ' |');
    });
    L.push('');
  });
  return L.join('\n') + '\n';
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const texto = gerar();
  if (process.argv.includes('--check')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    if (atual !== texto) { console.error('comparativo v4 x v5 DESATUALIZADO: rode node scripts/comparar-v4-v5.mjs'); process.exit(1); }
    console.log('comparativo v4 x v5 em dia');
  } else { writeFileSync(SAIDA, texto); console.log('gravado', SAIDA); }
}
