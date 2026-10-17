#!/usr/bin/env node
/**
 * COMPARATIVO HOLOS-V1 v5 x v6 (fechamento das 61, 13/10): MESMAS respostas, as duas versoes, em 5 casos
 * contrastantes (A-E) pensados para a pergunta "faz sentido humano?". Para cada caso: notas dos 5 sistemas
 * (e quantos itens pontuam), Indice, Triade, 1a/2a area, sinais dominantes (MR-V1), contextuais respondidas
 * (sem pontuar) e ferramentas do PP-V1 (30 regras). Mesmo calculo de scripts/comparar-v2-v3.mjs.
 *
 *   node scripts/comparar-v5-v6.mjs           grava docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V5-V6.md
 *   node scripts/comparar-v5-v6.mjs --check   confere que o arquivo gravado e identico ao gerado agora
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { calcular } from './comparar-v2-v3.mjs';
import { construir } from './pacote-v6.mjs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V5-V6.md';

const NOME = { fungico: 'Fúngico', acido_inflamatorio: 'Ácido Inflamatório', metabolico: 'Metabólico', detox_linfatico: 'Detox e Linfático', mental_emocional_espiritual: 'Mental Emocional Espiritual' };
const SIS = Object.keys(NOME);

/* carga 3 nos itens do tema, 0 no resto (a resposta e o valor que produz a carga, respeitando as invertidas) */
export const CASOS = [
  { id: 'A', nome: 'digestivo / alimentar', tema: ['SNT-101', 'SNT-102', 'SNT-103', 'SNT-107', 'SNT-404', 'SNT-204', 'SNT-208', 'SNT-104', 'SNT-109'],
    humano: 'Relatos digestivos e de vontade de doce/pão. Espera-se Fúngico em 1º (digestivo/alimentar) e Ácido-Inflamatório em 2º (azia, piora com ultraprocessado). Candidíase (SNT-104) e antibiótico (SNT-109) só aparecem como contexto.' },
  { id: 'B', nome: 'dor / rigidez / reatividade', tema: ['SNT-201', 'SNT-202', 'SNT-203', 'SNT-205', 'SNT-209', 'SNT-407', 'SNT-403', 'SNT-206'],
    humano: 'Dor, rigidez e reatividade a cheiros, café e medicamento. Espera-se Ácido-Inflamatório em 1º e Detox (reatividade) em 2º. Acne/eczema/psoríase (SNT-206) é só contexto.' },
  { id: 'C', nome: 'fome / energia / refeição', tema: ['SNT-301', 'SNT-303', 'SNT-304', 'SNT-307', 'SNT-501', 'SNT-507', 'ESP-303', 'SNT-305', 'SNT-308', 'EMO-504'],
    humano: 'Fome, saciedade, sono depois do almoço, cansaço ao acordar e comer sem pausa. Espera-se Metabólico em 1º. Gordura na barriga (SNT-305) e dificuldade de perder peso (SNT-308) são só contexto; culpa depois de comer (EMO-504) pontua no MEE e é contexto no Metabólico.' },
  { id: 'D', nome: 'eliminação / retenção / intestinal', tema: ['SNT-401', 'SNT-402', 'SNT-405', 'SNT-406', 'SNT-408', 'SNT-409', 'SNT-410', 'ESP-502'],
    humano: 'Inchaço de pernas e rosto, intestino preso, ressaca com pouco álcool. Espera-se Detox e Linfático em 1º. Pele opaca, suor e celulite (SNT-408/409/410) e refeições com pressa (ESP-502) são só contexto.' },
  { id: 'E', nome: 'mental / emocional / propósito', tema: ['SNT-502', 'SNT-504', 'SNT-506', 'SNT-508', 'EMO-102', 'EMO-103', 'EMO-401', 'EMO-402', 'EMO-501', 'EMO-503', 'EMO-507', 'ESP-101', 'ESP-102', 'ESP-202', 'ESP-401', 'ESP-402', 'ESP-501'],
    humano: 'Cabeça que não desliga, preocupação, autocrítica, falta de direção. Espera-se o MEE em 1º; os sistemas físicos ficam sem carga. Contato com a natureza (ESP-501) é só contexto.' }
];
export function respostas(pk, tema) {
  const orient = Object.fromEntries(pk.perguntas.map(q => [q.stable_id, q.orientation]));
  return Object.fromEntries(pk.perguntas.map(q => { const z = tema.includes(q.stable_id) ? 3 : 0; return [q.stable_id, orient[q.stable_id] === 'invertida' ? 3 - z : z]; }));
}

const n1 = (v) => v === null || v === undefined ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
export function gerar() {
  const { v5, v6 } = construir();
  const v6a = Object.assign(JSON.parse(JSON.stringify(v6)), { status: 'aprovado' });
  const txt = Object.fromEntries(v6.perguntas.map(q => [q.stable_id, q.statement]));
  const L = [];
  L.push('# COMPARATIVO HOLOSCAN — HOLOS-V1 v5 × v6 (cinco casos contrastantes)\n');
  L.push('Gerado por `scripts/comparar-v5-v6.mjs` (determinístico; `--check` no teste). A v6 fecha as 61 perguntas que estavam em aberto na matriz (13/10/2026):');
  L.push('- removida: SNT-110;');
  L.push('- mudam de sistema: SNT-404 (Detox → Fúngico), SNT-501 e SNT-507 (MEE → Metabólico);');
  L.push('- passam a ser só contextuais: SNT-104, SNT-105, SNT-109 (Fúngico), SNT-206 (Ácido-Inflamatório), SNT-305, SNT-306, SNT-308 (Metabólico), SNT-408, SNT-409, SNT-410 (Detox);');
  L.push('- as outras ficam como estavam.\n');
  L.push('Cada caso tem carga máxima nos itens do tema e carga 0 no resto (respostas fictícias). Notas, Índice e Tríade vêm do `MotorMetodologico.calcular`. Os sinais dominantes seguem `resultado_holos_dominantes` (MR-V1). As ferramentas vêm de `ProximosPassos.selecionar` sobre as 30 regras do PP-V1. As contextuais respondidas aparecem à parte e não contribuem para nada.\n');
  CASOS.forEach(c => {
    const a = calcular(v5, respostas(v5, c.tema)), b = calcular(v6a, respostas(v6a, c.tema));
    L.push('## Caso ' + c.id + ' — ' + c.nome + '\n');
    L.push('**Leitura humana esperada:** ' + c.humano + '\n');
    L.push('| | v5 | v6 |\n|---|---|---|');
    SIS.forEach(s => {
      const x = a.r.system_results[s], y = b.r.system_results[s];
      L.push('| ' + NOME[s] + ' (nota · itens) | ' + n1(x.nota) + ' · ' + x.total + ' | ' + n1(y.nota) + ' · ' + y.total + ' |');
    });
    L.push('| **Índice** | ' + n1(a.r.index_result.valor) + ' | ' + n1(b.r.index_result.valor) + ' |');
    const tri = (r) => ['fisico', 'mental', 'espiritual'].map(k => n1(r.triad_result[k] && r.triad_result[k].nota)).join(' / ');
    L.push('| Tríade Corpo / Mente / Espírito | ' + tri(a.r) + ' | ' + tri(b.r) + ' |');
    L.push('| 1ª / 2ª área | ' + a.ordem.slice(0, 2).map(s => NOME[s]).join(' / ') + ' | ' + b.ordem.slice(0, 2).map(s => NOME[s]).join(' / ') + ' |');
    L.push('| PP-V1 (principal · complementares) | ' + a.pp.join(' · ') + ' | ' + b.pp.join(' · ') + ' |');
    L.push('');
    L.push('**v6 — pontuou (sinais dominantes das duas primeiras áreas):**\n');
    b.ordem.slice(0, 2).forEach((s, i) => {
      L.push('- ' + (i + 1) + 'ª ' + NOME[s] + ': ' + (b.dominantes[s].map(d => d.id + ' “' + txt[d.id] + '”').join('; ') || 'nenhum sinal pontuou'));
    });
    const ctx = b.r.contextual_associations.filter(x => { const v = respostas(v6a, c.tema)[x.question_id]; const q = v6.perguntas.find(p => p.stable_id === x.question_id); return (q.orientation === 'invertida' ? 3 - v : v) > 0; });
    L.push('\n**v6 — contexto, sem pontuar (contextuais com carga > 0):** ' + (ctx.length ? ctx.map(x => x.question_id + ' → ' + NOME[x.destination]).join('; ') : 'nenhuma') + '\n');
  });
  return L.join('\n') + '\n';
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const texto = gerar();
  if (process.argv.includes('--check')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    if (atual !== texto) { console.error('comparativo v5 x v6 DESATUALIZADO: rode node scripts/comparar-v5-v6.mjs'); process.exit(1); }
    console.log('comparativo v5 x v6 em dia');
  } else { writeFileSync(SAIDA, texto); console.log('gravado', SAIDA); }
}
