#!/usr/bin/env node
/**
 * Gera o HOLOS-V1 v5 (Lote 2B, 13/10) a partir do v4:
 * v2 (inventario + decisoes V1) -> aplicarRevisao(MetodologiaRevisaoV3) = v4 -> aplicarRevisao(MetodologiaRevisaoV5) = v5 em_revisao.
 * E o MESMO calculo que a publicacao direta faz sobre o v4 gravado no servidor.
 *
 *   node scripts/pacote-v5.mjs           grava docs/v1/metodologia/pacote-metodologico-v5.json (revisao humana)
 *                                        e supabase/tests/pacote-v5-doc.sql (o v5 para o harness SQL local)
 *   node scripts/pacote-v5.mjs --check   confere que os arquivos gravados sao identicos aos gerados agora
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/pacote-metodologico-v5.json';
const SAIDA_SQL = RAIZ + 'supabase/tests/pacote-v5-doc.sql';
await import(RAIZ + 'metodologia-pacote.js');
await import(RAIZ + 'metodologia-motor.js');
await import(RAIZ + 'metodologia-decisoes-v1.js');
await import(RAIZ + 'metodologia-revisao-v3.js');
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, D = globalThis.MetodologiaDecisoesV1;
const R4 = globalThis.MetodologiaRevisaoV3, R = globalThis.MetodologiaRevisaoV5;

export function construir() {
  const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
  const v2 = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
  v2.status = 'aprovado';
  const v4 = P.aplicarRevisao(v2, R4); v4.status = 'aprovado';
  const v5 = P.aplicarRevisao(JSON.parse(JSON.stringify(v4)), R);
  return { v2, v4, v5 };
}

export function gerar() {
  const { v4, v5 } = construir();
  const v = P.validar(v5);
  const refs = v5.regras.filter(r => r.rule_type === 'example').map(r => ({ id: r.target, divergencias: M.conferirExemplo(v5, r.payload) }));
  const texto = (id) => v4.perguntas.find(q => q.stable_id === id).statement;
  const doc = {
    gerado_por: 'scripts/pacote-v5.mjs',
    revisao: R.id, decidida_em: R.decidido_em, revisao_publica: R.revisao_publica,
    pacote_anterior: { code: v4.code, version: v4.version, content_hash_js: v4.content_hash },
    versao_nova: { code: v5.code, version: v5.version, status: v5.status, content_hash: v5.content_hash, perguntas: v5.perguntas.length, erros_validador: v.total_erros, referencias: refs },
    mudancas: {
      sistema_mudado: Object.keys(R.mover).map(id => ({ id, texto: texto(id), de: R.mover[id].de, para: R.mover[id].para, justificativa: R.mover[id].motivo })),
      so_contextuais: Object.keys(R.contextualizar).map(id => ({ id, texto: texto(id), era_primaria_de: R.contextualizar[id].de, justificativa: R.contextualizar[id].motivo })),
      mantidas: Object.keys(R.manter).map(id => ({ id, texto: texto(id), decisao: R.manter[id] })),
      regra_metodologica: R.regra_metodologica
    },
    pacote: v5
  };
  const json = JSON.stringify(doc, null, 2) + '\n';
  const lit = (o) => { const t = JSON.stringify(o); if (t.includes('$PCT$')) throw new Error('delimitador no conteudo'); return '$PCT$' + t + '$PCT$'; };
  const sql = '-- GERADO por scripts/pacote-v5.mjs — NAO EDITAR A MAO.\n' +
    '-- HOLOS-V1 v5 (Lote 2B, 13/10) para o harness SQL local (BEGIN/ROLLBACK).\n' +
    'create temp table _pacote_v5 (doc jsonb not null) on commit drop;\n' +
    'grant select on _pacote_v5 to authenticated;\n' +
    'insert into _pacote_v5 values (' + lit(v5) + '::jsonb);\n';
  return { json, sql };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const { json: texto, sql } = gerar();
  if (process.argv.includes('--check')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    const atualSql = existsSync(SAIDA_SQL) ? readFileSync(SAIDA_SQL, 'utf8') : '';
    if (atual !== texto || atualSql !== sql) { console.error('pacote v5 DESATUALIZADO: rode node scripts/pacote-v5.mjs'); process.exit(1); }
    console.log('pacote v5 em dia');
  } else {
    writeFileSync(SAIDA, texto); writeFileSync(SAIDA_SQL, sql);
    const d = JSON.parse(texto);
    console.log(d.versao_nova.code + ' v' + d.versao_nova.version + ' ' + d.versao_nova.status + ' hash ' + d.versao_nova.content_hash + ' perguntas ' + d.versao_nova.perguntas + ' erros ' + d.versao_nova.erros_validador + ' refs ' + JSON.stringify(d.versao_nova.referencias.map(r => r.divergencias.length)));
  }
}
