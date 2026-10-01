#!/usr/bin/env node
/**
 * Gera a NOVA VERSAO CANDIDATA do Pacote Metodologico V1 (Etapa 4.2):
 * inventario importado (HOLOS-V1@1, preservado) + decisoes V1 fechadas
 * (metodologia-decisoes-v1.js) -> HOLOS-V1@2, status em_revisao.
 *
 *   node scripts/pacote-candidato-v1.mjs           grava docs/v1/metodologia/pacote-metodologico-v1-candidato.json
 *                                                  e supabase/tests/etapa4-2-pacotes.sql (os dois pacotes para o harness SQL local)
 *   node scripts/pacote-candidato-v1.mjs --check   confere que os arquivos gravados sao identicos aos gerados agora
 *
 * Deterministico: sem data do relogio, sem aleatoriedade. O mesmo inventario
 * e as mesmas decisoes produzem o mesmo JSON e o mesmo hash.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/pacote-metodologico-v1-candidato.json';
const SAIDA_SQL = RAIZ + 'supabase/tests/etapa4-2-pacotes.sql';
await import(RAIZ + 'metodologia-pacote.js');
await import(RAIZ + 'metodologia-motor.js');
await import(RAIZ + 'metodologia-decisoes-v1.js');
const P = globalThis.PacoteMetodologico, M = globalThis.MotorMetodologico, D = globalThis.MetodologiaDecisoesV1;

export function gerar() {
  const inv = JSON.parse(readFileSync(RAIZ + 'docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
  const base = P.importarInventario(inv, 'HOLOS-V1', 1);
  const cand = P.aplicarDecisoesV1(base, D);
  const v = P.validar(cand);
  const refs = cand.regras.filter(r => r.rule_type === 'example').map(r => ({ id: r.target, divergencias: M.conferirExemplo(cand, r.payload) }));
  const doc = {
    gerado_por: 'scripts/pacote-candidato-v1.mjs',
    status_metodologico: D.status_metodologico,
    status_tecnico: D.status_tecnico,
    pacote_anterior: { code: base.code, version: base.version, status: base.status, content_hash: P.hashConteudo(base), erros_validador: P.validar(base).total_erros },
    candidato: { code: cand.code, version: cand.version, status: cand.status, content_hash: cand.content_hash, erros_validador: v.total_erros, publicavel_metodologicamente: v.publicavel, referencias: refs },
    pacote: cand
  };
  const json = JSON.stringify(doc, null, 2) + '\n';
  const lit = (o) => { const t = JSON.stringify(o); if (t.includes('$PCT$')) throw new Error('delimitador no conteudo'); return '$PCT$' + t + '$PCT$'; };
  const sql = '-- GERADO por scripts/pacote-candidato-v1.mjs — NAO EDITAR A MAO.\n' +
    '-- Pacotes para o harness SQL local (BEGIN/ROLLBACK): o importado (HOLOS-V1@1, historico) e o candidato (HOLOS-V1@2).\n' +
    'create temp table _pacotes (nome text primary key, doc jsonb not null) on commit drop;\n' +
    'grant select on _pacotes to authenticated;\n' +
    "insert into _pacotes values ('importado', " + lit(base) + "::jsonb), ('candidato', " + lit(cand) + '::jsonb);\n';
  return { json, sql };
}

const { json: texto, sql } = gerar();
if (process.argv.includes('--check')) {
  const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
  const atualSql = existsSync(SAIDA_SQL) ? readFileSync(SAIDA_SQL, 'utf8') : '';
  if (atual !== texto || atualSql !== sql) { console.error('pacote candidato DESATUALIZADO: rode node scripts/pacote-candidato-v1.mjs'); process.exit(1); }
  console.log('pacote candidato em dia');
} else {
  writeFileSync(SAIDA, texto); writeFileSync(SAIDA_SQL, sql);
  const d = JSON.parse(texto);
  console.log('candidato ' + d.candidato.code + '@' + d.candidato.version + ' ' + d.candidato.status + ' hash ' + d.candidato.content_hash + ' erros ' + d.candidato.erros_validador);
}
