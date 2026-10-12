#!/usr/bin/env node
/**
 * Gera o HOLOS-V1 v3 (revisao das perguntas, 12/10) a partir do v2 candidato:
 * PacoteMetodologico.aplicarRevisao(v2, metodologia-revisao-v3.js) -> v3 em_revisao.
 * E o MESMO calculo que a tela de Homologacao faz sobre o v2 gravado no servidor.
 *
 *   node scripts/pacote-v3.mjs           grava docs/v1/metodologia/pacote-metodologico-v3.json (para revisao humana)
 *                                        e supabase/tests/pacote-v3-doc.sql (o v3 para o harness SQL local)
 *   node scripts/pacote-v3.mjs --check   confere que os arquivos gravados sao identicos aos gerados agora
 *
 * Deterministico: o mesmo v2 e a mesma revisao produzem o mesmo JSON e o mesmo hash.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/pacote-metodologico-v3.json';
const SAIDA_SQL = RAIZ + 'supabase/tests/pacote-v3-doc.sql';
await import(RAIZ + 'metodologia-pacote.js');
await import(RAIZ + 'metodologia-motor.js');
await import(RAIZ + 'metodologia-decisoes-v1.js');
await import(RAIZ + 'metodologia-revisao-v3.js');
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, D = globalThis.MetodologiaDecisoesV1, R = globalThis.MetodologiaRevisaoV3;

export function gerar() {
  const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
  const v2 = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
  v2.status = 'aprovado';
  const v3 = P.aplicarRevisao(v2, R);
  const v = P.validar(v3);
  const refs = v3.regras.filter(r => r.rule_type === 'example').map(r => ({ id: r.target, divergencias: M.conferirExemplo(v3, r.payload) }));
  const mudancas = {
    textos: Object.keys(R.textos).map(id => ({ id, antes: v2.perguntas.find(q => q.stable_id === id).statement, depois: R.textos[id] })),
    trocadas: Object.keys(R.trocar).map(id => ({ antes: id, texto_antes: v2.perguntas.find(q => q.stable_id === id).statement, depois: R.trocar[id].novo_id, texto_depois: R.trocar[id].texto })),
    removidas: Object.keys(R.remover).map(id => ({ id, texto: v2.perguntas.find(q => q.stable_id === id).statement, motivo: R.remover[id] })),
    sistema_mudado: Object.keys(R.mover).map(id => ({ id, de: R.mover[id].de, para: R.mover[id].para }))
  };
  const doc = {
    gerado_por: 'scripts/pacote-v3.mjs',
    revisao: R.id, decidida_em: R.decidido_em, revisao_publica: R.revisao_publica,
    pacote_anterior: { code: v2.code, version: v2.version, content_hash_js: v2.content_hash },
    versao_nova: { code: v3.code, version: v3.version, status: v3.status, content_hash: v3.content_hash, perguntas: v3.perguntas.length, erros_validador: v.total_erros, referencias: refs },
    mudancas,
    pacote: v3
  };
  const json = JSON.stringify(doc, null, 2) + '\n';
  const lit = (o) => { const t = JSON.stringify(o); if (t.includes('$PCT$')) throw new Error('delimitador no conteudo'); return '$PCT$' + t + '$PCT$'; };
  const sql = '-- GERADO por scripts/pacote-v3.mjs — NAO EDITAR A MAO.\n' +
    '-- HOLOS-V1 v3 (revisao das perguntas) para o harness SQL local (BEGIN/ROLLBACK).\n' +
    'create temp table _pacote_v3 (doc jsonb not null) on commit drop;\n' +
    'grant select on _pacote_v3 to authenticated;\n' +
    'insert into _pacote_v3 values (' + lit(v3) + '::jsonb);\n';
  return { json, sql };
}

const { json: texto, sql } = gerar();
if (process.argv.includes('--check')) {
  const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
  const atualSql = existsSync(SAIDA_SQL) ? readFileSync(SAIDA_SQL, 'utf8') : '';
  if (atual !== texto || atualSql !== sql) { console.error('pacote v3 DESATUALIZADO: rode node scripts/pacote-v3.mjs'); process.exit(1); }
  console.log('pacote v3 em dia');
} else {
  writeFileSync(SAIDA, texto); writeFileSync(SAIDA_SQL, sql);
  const d = JSON.parse(texto);
  console.log(d.versao_nova.code + ' v' + d.versao_nova.version + ' ' + d.versao_nova.status + ' hash ' + d.versao_nova.content_hash + ' perguntas ' + d.versao_nova.perguntas + ' erros ' + d.versao_nova.erros_validador);
}
