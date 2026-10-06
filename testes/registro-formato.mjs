/**
 * Formato dos REGISTROS CLINICOS ESTRUTURADOS (Etapa 6.5 B) lido da PROPRIA migration 20261005110000 — fonte unica para
 * o servidor falso e para os testes que comparam servidor x catalogo (ferramentas.js). Sem copia escrita a mao.
 */
import { readFileSync } from 'node:fs';

const SQL = readFileSync(new URL('../supabase/migrations/20261005110000_ferramentas_registro_v1.sql', import.meta.url), 'utf8');

function corpo(nome) {
  const i = SQL.indexOf('function public.' + nome);
  const a = SQL.indexOf('$$', i), b = SQL.indexOf('$$', a + 2);
  return SQL.slice(a + 2, b);
}
const pares = (txt) => { const o = {}; for (const m of txt.matchAll(/'(\w+)'\s*,\s*'([\w:]+)'/g)) o[m[1]] = m[2]; return o; };

export const OPCOES = JSON.parse(corpo('registro_clinico_opcoes').match(/select\s+'([\s\S]*?)'::jsonb/)[1]);

export const FORMATO = (() => {
  const out = {};
  const partes = corpo('registro_clinico_formato').split(/\n\s*when '/).slice(1);
  for (const p of partes) {
    const id = p.slice(0, p.indexOf("'"));
    const [camposTxt, itemTxt] = p.split(/'item'\s*,\s*jsonb_build_object\(/);
    const campos = pares(camposTxt.split(/'lista'/)[0].replace(/^[\s\S]*?'campos'\s*,\s*jsonb_build_object\(/, ''));
    const lista = (camposTxt.match(/'lista'\s*,\s*'(\w+)'/) || [])[1] || null;
    out[id] = { campos, lista, item: itemTxt ? pares(itemTxt) : null };
  }
  return out;
})();

export const IDS_REGISTRO = Object.keys(FORMATO);

const UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function dataValida(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
}

/** Espelho de registro_clinico_valor_invalido: null se ok, senao o motivo. */
export function valorInvalido(tipo, v) {
  if (v === null || v === undefined) return null;
  if (tipo === 'dias') {
    if (!Array.isArray(v)) return 'dias deve ser lista';
    if (v.length > 7) return 'dias: mais de 7';
    if (v.some(d => typeof d !== 'string' || !OPCOES.dias.includes(d))) return 'dia invalido';
    if (new Set(v).size !== v.length) return 'dia repetido';
    return null;
  }
  if (tipo === 'nota') {
    if (typeof v !== 'number' && typeof v !== 'string') return 'intensidade deve ser numero';
    return /^(10|[0-9])$/.test(String(v)) ? null : 'intensidade fora de 0 a 10';
  }
  if (typeof v !== 'string') return 'valor deve ser texto';
  if (tipo === 'texto') return v.length > 1000 ? 'texto longo demais' : null;
  if (tipo === 'textarea') return v.length > 8000 ? 'texto longo demais' : null;
  if (tipo === 'hora') return /^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(v) ? null : 'horario invalido';
  if (tipo === 'data') return dataValida(v) ? null : 'data invalida';
  if (tipo.startsWith('op:')) return (OPCOES[tipo.slice(3)] || []).includes(v) ? null : 'opcao fora da lista';
  return 'tipo desconhecido';
}

/** Espelho de validar_registro_clinico. `existe(origemId)` diz se a origem e desta ferramenta/paciente/profissional. */
export function erroRegistro(linha, existe) {
  const fmt = FORMATO[linha.ferramenta_id];
  if (!fmt) return null;
  if (String(linha.versao_ferramenta) !== '1') return ['versao_ferramenta do registro clinico deve ser 1', 'registro_versao'];
  if (linha.resultado !== null && linha.resultado !== undefined) return ['registro clinico estruturado nao tem resultado automatico (resultado deve ser nulo)', 'registro_resultado'];
  const r = linha.respostas;
  if (!r || typeof r !== 'object' || Array.isArray(r)) return ['respostas do registro devem ser um objeto', 'registro_formato'];
  if (JSON.stringify(r).length > 200000) return ['registro grande demais', 'registro_formato'];
  for (const [k, v] of Object.entries(r)) {
    if (k === 'origem_id') {
      if (v === null) continue;
      if (typeof v !== 'string' || !UUID.test(v)) return ['origem_id invalido', 'registro_formato'];
      if (!existe(v)) return ['origem_id nao e uma aplicacao desta ferramenta para este paciente', 'registro_formato'];
    } else if (fmt.lista && k === fmt.lista) {
      if (v === null) continue;
      if (!Array.isArray(v)) return ['campo ' + k + ' deve ser lista', 'registro_formato'];
      if (v.length > 100) return ['campo ' + k + ' com mais de 100 itens', 'registro_formato'];
      for (const item of v) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return ['item de ' + k + ' deve ser objeto', 'registro_formato'];
        for (const [ik, iv] of Object.entries(item)) {
          if (!(ik in fmt.item)) return ['campo ' + ik + ' nao existe nos itens de ' + k, 'registro_formato'];
          const m = valorInvalido(fmt.item[ik], iv);
          if (m) return [k + '.' + ik + ': ' + m, 'registro_formato'];
        }
      }
    } else if (k in fmt.campos) {
      const m = valorInvalido(fmt.campos[k], v);
      if (m) return [k + ': ' + m, 'registro_formato'];
    } else {
      return ['campo ' + k + ' nao existe neste registro', 'registro_formato'];
    }
  }
  return null;
}

/** Espelho de registro_clinico_concluido_imutavel. */
export function erroConcluido(antes, depois) {
  if (!FORMATO[antes.ferramenta_id]) return null;
  if (!['concluida', 'revisada'].includes(antes.status)) return null;
  const j = (x) => JSON.stringify(x === undefined ? null : x);
  if (!['concluida', 'revisada'].includes(depois.status) || j(depois.respostas) !== j(antes.respostas) || j(depois.resultado) !== j(antes.resultado)
      || j(depois.concluida_em) !== j(antes.concluida_em) || j(depois.encounter_id) !== j(antes.encounter_id)) {
    return ['registro concluido nao e reescrito: para corrigir, crie uma nova aplicacao (a anterior fica no historico)', 'registro_concluido'];
  }
  return null;
}
