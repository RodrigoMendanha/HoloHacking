#!/usr/bin/env node
/**
 * Gera o HOLOS-V1 v7 (SO TEXTO, 13/10) a partir do v6: aplicarRevisao(v6, MetodologiaRevisaoV7) = v7 em_revisao.
 * E o MESMO calculo que a publicacao direta faz sobre o v6 gravado no servidor (o v6 local e identico ao de producao:
 * 81 perguntas, 153 associacoes e os mesmos textos; conferido por impressao digital em 13/10).
 * Unica mudanca: o texto oficial do Sistema Acido Inflamatorio deixa de citar exames.
 *
 *   node scripts/pacote-v7.mjs           grava docs/v1/metodologia/pacote-metodologico-v7.json e supabase/tests/pacote-v7-doc.sql
 *   node scripts/pacote-v7.mjs --check   confere que os arquivos gravados sao identicos aos gerados agora
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { construir as construirV6 } from './pacote-v6.mjs';
const RAIZ = new URL('..', import.meta.url).pathname;
const SAIDA = RAIZ + 'docs/v1/metodologia/pacote-metodologico-v7.json';
const SAIDA_SQL = RAIZ + 'supabase/tests/pacote-v7-doc.sql';
const P = globalThis.PacoteMetodologico, R = globalThis.MetodologiaRevisaoV7;

export function construir() {
  const anteriores = construirV6();
  const v6 = Object.assign(JSON.parse(JSON.stringify(anteriores.v6)), { status: 'aprovado' });
  const v7 = P.aplicarRevisao(JSON.parse(JSON.stringify(v6)), R);
  return Object.assign({}, anteriores, { v6, v7 });
}

export function gerar() {
  const { v6, v7 } = construir();
  const v = P.validar(v7);
  const texto = (pk, code) => (pk.sistemas.find(s => s.code === code) || {}).public_text;
  const doc = {
    gerado_por: 'scripts/pacote-v7.mjs',
    revisao: R.id, decidida_em: R.decidido_em, revisao_publica: R.revisao_publica,
    pacote_anterior: { code: v6.code, version: v6.version, content_hash_js: v6.content_hash },
    versao_nova: { code: v7.code, version: v7.version, status: v7.status, content_hash: v7.content_hash, perguntas: v7.perguntas.length, erros_validador: v.total_erros },
    mudancas: {
      textos_sistemas: Object.keys(R.textos_sistemas).map(code => ({ sistema: code, antes: texto(v6, code), depois: texto(v7, code) })),
      regra_metodologica: R.regra_metodologica,
      nada_mais: 'perguntas, IDs, ordem, associacoes, pesos, escalas, faixas, cobertura, Indice, Triade, contextuais, sinais dominantes e PP-V1 identicos ao v6'
    },
    pacote: v7
  };
  const json = JSON.stringify(doc, null, 2) + '\n';
  const lit = (o) => { const t = JSON.stringify(o); if (t.includes('$PCT$')) throw new Error('delimitador no conteudo'); return '$PCT$' + t + '$PCT$'; };
  const sql = '-- GERADO por scripts/pacote-v7.mjs — NAO EDITAR A MAO.\n' +
    '-- HOLOS-V1 v7 (so texto, 13/10) para o harness SQL local (BEGIN/ROLLBACK).\n' +
    'create temp table _pacote_v7 (doc jsonb not null) on commit drop;\n' +
    'grant select on _pacote_v7 to authenticated;\n' +
    'insert into _pacote_v7 values (' + lit(v7) + '::jsonb);\n';
  return { json, sql };
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const { json: texto, sql } = gerar();
  if (process.argv.includes('--check')) {
    const atual = existsSync(SAIDA) ? readFileSync(SAIDA, 'utf8') : '';
    const atualSql = existsSync(SAIDA_SQL) ? readFileSync(SAIDA_SQL, 'utf8') : '';
    if (atual !== texto || atualSql !== sql) { console.error('pacote v7 DESATUALIZADO: rode node scripts/pacote-v7.mjs'); process.exit(1); }
    console.log('pacote v7 em dia');
  } else {
    writeFileSync(SAIDA, texto); writeFileSync(SAIDA_SQL, sql);
    const d = JSON.parse(texto);
    console.log(d.versao_nova.code + ' v' + d.versao_nova.version + ' ' + d.versao_nova.status + ' hash ' + d.versao_nova.content_hash + ' perguntas ' + d.versao_nova.perguntas + ' erros ' + d.versao_nova.erros_validador);
  }
}
