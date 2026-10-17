#!/usr/bin/env node
/**
 * Gera o HOLOS-V1 v6 (fechamento das 61, 13/10) a partir do v5:
 * v2 -> (MetodologiaRevisaoV3) v4 -> (MetodologiaRevisaoV5) v5 -> aplicarRevisao(MetodologiaRevisaoV6) = v6 em_revisao.
 * E o MESMO calculo que a publicacao direta faz sobre o v5 gravado no servidor.
 *
 *   node scripts/pacote-v6.mjs           grava docs/v1/metodologia/pacote-metodologico-v6.json (revisao humana)
 *                                        e supabase/tests/pacote-v6-doc.sql (o v5 para o harness SQL local)
 *   node scripts/pacote-v6.mjs --check   confere que os arquivos gravados sao identicos aos gerados agora
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/pacote-metodologico-v6.json';
const SAIDA_SQL = RAIZ + 'supabase/tests/pacote-v6-doc.sql';
await import(RAIZ + 'metodologia-pacote.js');
await import(RAIZ + 'metodologia-motor.js');
await import(RAIZ + 'metodologia-decisoes-v1.js');
await import(RAIZ + 'metodologia-revisao-v3.js');
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, D = globalThis.MetodologiaDecisoesV1;
const R4 = globalThis.MetodologiaRevisaoV3, R5 = globalThis.MetodologiaRevisaoV5, R = globalThis.MetodologiaRevisaoV6;

export function construir() {
  const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
  const v2 = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
  v2.status = 'aprovado';
  const v4 = P.aplicarRevisao(v2, R4); v4.status = 'aprovado';
  const v5 = P.aplicarRevisao(JSON.parse(JSON.stringify(v4)), R5); v5.status = 'aprovado';
  const v6 = P.aplicarRevisao(JSON.parse(JSON.stringify(v5)), R);
  return { v2, v4, v5, v6 };
}

export function gerar() {
  const { v5, v6 } = construir();
  const v = P.validar(v6);
  const refs = v6.regras.filter(r => r.rule_type === 'example').map(r => ({ id: r.target, divergencias: M.conferirExemplo(v6, r.payload) }));
  const texto = (id) => v5.perguntas.find(q => q.stable_id === id).statement;
  const doc = {
    gerado_por: 'scripts/pacote-v6.mjs',
    revisao: R.id, decidida_em: R.decidido_em, revisao_publica: R.revisao_publica,
    pacote_anterior: { code: v5.code, version: v5.version, content_hash_js: v5.content_hash },
    versao_nova: { code: v6.code, version: v6.version, status: v6.status, content_hash: v6.content_hash, perguntas: v6.perguntas.length, erros_validador: v.total_erros, referencias: refs },
    mudancas: {
      removidas: Object.keys(R.remover || {}).map(id => ({ id, texto: texto(id), justificativa: R.remover[id] })),
      sistema_mudado: Object.keys(R.mover).map(id => ({ id, texto: texto(id), de: R.mover[id].de, para: R.mover[id].para, justificativa: R.mover[id].motivo })),
      so_contextuais: Object.keys(R.contextualizar).map(id => ({ id, texto: texto(id), era_primaria_de: R.contextualizar[id].de, justificativa: R.contextualizar[id].motivo })),
      mantidas: Object.keys(R.manter).map(id => ({ id, texto: texto(id), decisao: R.manter[id] })),
      regra_metodologica: R.regra_metodologica
    },
    pacote: v6
  };
  const json = JSON.stringify(doc, null, 2) + '\n';
  const lit = (o) => { const t = JSON.stringify(o); if (t.includes('$PCT$')) throw new Error('delimitador no conteudo'); return '$PCT$' + t + '$PCT$'; };
  const sql = '-- GERADO por scripts/pacote-v6.mjs — NAO EDITAR A MAO.\n' +
    '-- HOLOS-V1 v6 (fechamento das 61, 13/10) para o harness SQL local (BEGIN/ROLLBACK).\n' +
    'create temp table _pacote_v6 (doc jsonb not null) on commit drop;\n' +
    'grant select on _pacote_v6 to authenticated;\n' +
    'insert into _pacote_v6 values (' + lit(v6) + '::jsonb);\n';
  return { json, sql };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const { json: texto, sql } = gerar();
  if (process.argv.includes('--check')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    const atualSql = existsSync(SAIDA_SQL) ? readFileSync(SAIDA_SQL, 'utf8') : '';
    if (atual !== texto || atualSql !== sql) { console.error('pacote v6 DESATUALIZADO: rode node scripts/pacote-v6.mjs'); process.exit(1); }
    console.log('pacote v6 em dia');
  } else {
    writeFileSync(SAIDA, texto); writeFileSync(SAIDA_SQL, sql);
    const d = JSON.parse(texto);
    console.log(d.versao_nova.code + ' v' + d.versao_nova.version + ' ' + d.versao_nova.status + ' hash ' + d.versao_nova.content_hash + ' perguntas ' + d.versao_nova.perguntas + ' erros ' + d.versao_nova.erros_validador + ' refs ' + JSON.stringify(d.versao_nova.referencias.map(r => r.divergencias.length)));
  }
}
