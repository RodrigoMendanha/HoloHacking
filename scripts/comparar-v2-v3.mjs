#!/usr/bin/env node
/**
 * COMPARATIVO HOLOS-V1 v2 x v3 (decisoes de 13/10): MESMAS respostas, as duas versoes do pacote.
 * Para cada fixture mostra: nota dos 5 sistemas, Indice, Triade, prioridade (1a/2a area), sinais dominantes
 * (ate 3 por sistema, mesma regra da funcao SQL resultado_holos_dominantes do MR-V1) e as ferramentas do PP-V1
 * (ProximosPassos.selecionar sobre as 30 regras do catalogo HOLOS-RECOMENDACOES-V1, ordem de "Por onde investigar").
 *
 *   node scripts/comparar-v2-v3.mjs           grava docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V2-V3.md
 *   node scripts/comparar-v2-v3.mjs --check   confere que o arquivo gravado e identico ao gerado agora
 *
 * Deterministico. Nao toca banco nem pacote: so calcula.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V2-V3.md';
globalThis.window = globalThis;
await import(RAIZ + 'metodologia-pacote.js');
await import(RAIZ + 'metodologia-motor.js');
await import(RAIZ + 'metodologia-decisoes-v1.js');
await import(RAIZ + 'metodologia-revisao-v3.js');
await import(RAIZ + 'utils.js');
await import(RAIZ + 'proximos-passos.js');
const { REGRAS } = await import(RAIZ + 'testes/proximos-passos-catalogo-v1.mjs');
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, PP = globalThis.ProximosPassos;

export function pacotes() {
  const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
  const v2 = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), globalThis.MetodologiaDecisoesV1);
  v2.status = 'aprovado';
  const v3 = P.aplicarRevisao(JSON.parse(JSON.stringify(v2)), globalThis.MetodologiaRevisaoV3);
  v3.status = 'aprovado';
  return { v2, v3 };
}

/* respostas ficticias deterministicas (sempre sobre as 84 perguntas do v2; no v3 entram so as que existem) */
export function fixtures(v2) {
  const ids = v2.perguntas.map(q => q.stable_id);
  const orient = Object.fromEntries(v2.perguntas.map(q => [q.stable_id, q.orientation]));
  const soma = (id) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0);
  const carga = (id, z) => orient[id] === 'invertida' ? 3 - z : z;   // z = carga desejada; resposta = valor que produz essa carga
  const monta = (f) => Object.fromEntries(ids.map(id => [id, carga(id, f(id))]));
  return [
    { id: 'F1', nome: 'Carla fictícia (padrão determinístico)', respostas: Object.fromEntries(v2.perguntas.map(q => [q.stable_id, soma(q.stable_id) % 4])) },
    { id: 'F2', nome: 'carga emocional alta (EMO = 3), físico baixo (SNT = 1), espiritual 1', respostas: monta(id => id.startsWith('EMO') ? 3 : 1) },
    { id: 'F3', nome: 'carga física alta (SNT = 3), emocional e espiritual 0', respostas: monta(id => id.startsWith('SNT') ? 3 : 0) },
    { id: 'F4', nome: 'carga uniforme 2', respostas: monta(() => 2) },
    { id: 'F5', nome: 'só exames altos (SNT-210 e SNT-309 = 3), resto 1', respostas: monta(id => (id === 'SNT-210' || id === 'SNT-309') ? 3 : 1) },
    { id: 'F6', nome: 'as 13 EMO movidas = 3, resto 1', respostas: monta(id => /^EMO-(10[123]|20[1-4]|30[123]|40[123])$/.test(id) ? 3 : 1) }
  ];
}

const NOME = { fungico: 'Fúngico', acido_inflamatorio: 'Ácido Inflamatório', metabolico: 'Metabólico', detox_linfatico: 'Detox e Linfático', mental_emocional_espiritual: 'Mental Emocional Espiritual' };
const SIS = Object.keys(NOME);

export function calcular(pk, respostasTodas) {
  const ids = new Set(pk.perguntas.map(q => q.stable_id));
  const responses = Object.fromEntries(Object.entries(respostasTodas).filter(([id]) => ids.has(id)));
  const r = M.calcular({ responses, methodology_package: pk, mode: 'homologacao', engine_version: 'comparativo', questionnaire_edition: { code: pk.edicao.code, version: pk.edicao.version } });
  /* dominantes: mesma regra da SQL resultado_holos_dominantes (contribuicao = peso x carga, > 0, maior primeiro, empate por ID) */
  const q = Object.fromEntries(pk.perguntas.map(x => [x.stable_id, x]));
  const esc = Object.fromEntries(pk.escalas.map(e => [e.code, e]));
  const dominantes = {};
  SIS.forEach(s => {
    dominantes[s] = pk.associacoes.filter(a => a.destination_type === 'system' && a.role === 'primaria' && a.destination_id === s && a.weight != null && responses[a.question_stable_id] != null)
      .map(a => { const qq = q[a.question_stable_id], e = esc[qq.scale_code], v = responses[a.question_stable_id];
        return { id: a.question_stable_id, pontos: a.weight * (qq.orientation === 'invertida' ? e.max_value - v : v - e.min_value) }; })
      .filter(d => d.pontos > 0).sort((a, b) => b.pontos - a.pontos || (a.id < b.id ? -1 : 1)).slice(0, 3);
  });
  const sistemas = SIS.map(s => { const x = r.system_results[s]; return { sistema: s, nome: NOME[s], nota: x.nota, avaliavel: x.avaliavel, respondidos: x.respondidos, total_marcadores: x.total, cobertura: x.cobertura,
    dominantes: dominantes[s].map(d => ({ marcador_id: d.id, pontos: d.pontos })) }; });
  const ordem = PP.ordenarSistemas({ sistemas });
  const sel = PP.selecionar({ sistemas: ordem, regras: REGRAS.map(g => Object.assign({ status: 'aprovado' }, g)), concluidas: [] });
  return { r, sistemas, ordem: ordem.map(o => o.system_id), dominantes, pp: sel.selection.map(x => PP.NOME_FERRAMENTA[x.tool_id] || x.tool_id), ids };
}

const n1 = (v) => v === null || v === undefined ? '—' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
export function gerar() {
  const { v2, v3 } = pacotes();
  const L = [];
  L.push('# COMPARATIVO HOLOSCAN — HOLOS-V1 v2 × v3 (mesmas respostas)\n');
  L.push('Gerado por `scripts/comparar-v2-v3.mjs` (determinístico; `--check` no teste). O v3 é o das decisões de 13/10/2026: SNT-210 e SNT-309 removidas e 13 perguntas EMO movidas para o Sistema Mental Emocional Espiritual. As respostas são fictícias. No v3 entram só as 82 perguntas que existem nele.\n');
  L.push('Regras usadas: as notas, o Índice e a Tríade vêm do `MotorMetodologico.calcular` (o mesmo motor da aplicação). Os sinais dominantes seguem a regra de `resultado_holos_dominantes` (MR-V1): até 3 por sistema, a contribuição tem de ser maior que 0, a maior vem primeiro e o empate é decidido pelo ID. As ferramentas vêm de `ProximosPassos.selecionar` sobre as 30 regras do PP-V1, na ordem de "Por onde investigar", sem ferramentas concluídas.\n');
  fixtures(v2).forEach(f => {
    const a = calcular(v2, f.respostas), b = calcular(v3, f.respostas);
    L.push('## ' + f.id + ' — ' + f.nome + '\n');
    L.push('| | v2 | v3 |\n|---|---|---|');
    SIS.forEach(s => {
      const x = a.r.system_results[s], y = b.r.system_results[s];
      L.push('| ' + NOME[s] + ' (nota · itens) | ' + n1(x.nota) + ' · ' + x.total + ' | ' + n1(y.nota) + ' · ' + y.total + ' |');
    });
    L.push('| **Índice** | ' + n1(a.r.index_result.valor) + ' | ' + n1(b.r.index_result.valor) + ' |');
    const tri = (r) => ['fisico', 'mental', 'espiritual'].map(k => n1((r.triad_result || {})[k] && r.triad_result[k].nota !== undefined ? r.triad_result[k].nota : (r.triad_result || {})[k])).join(' / ');
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
    if (atual !== texto) { console.error('comparativo v2 x v3 DESATUALIZADO: rode node scripts/comparar-v2-v3.mjs'); process.exit(1); }
    console.log('comparativo v2 x v3 em dia');
  } else { writeFileSync(SAIDA, texto); console.log('gravado', SAIDA); }
}
