/**
 * Ponte HOLOS AI no Supabase falso — o mesmo contrato da migration 20261023100000 (provada no Postgres local,
 * supabase/tests/holos-ai-ponte-harness.sql): importar_holos_ai, revisar_item_holos_ai, concluir_revisao_holos_ai,
 * descartar_importacao_holos_ai. A validacao do JSON e a do holos-ai-contrato.js (o servidor real tem a copia em SQL,
 * holos_ai_problemas). Importacao nunca sobrescreve outra (versao 1, 2...); valor da IA imutavel; so profissional nunca
 * compartilhavel. A conferencia dos itens da HOLOS AI no Resultado HOLOS fica em resultado-holos-falso.mjs.
 */
import { createHash, randomUUID } from 'node:crypto';
import '../holos-ai-contrato.js';

const C = globalThis.HolosAIContrato;
const copia = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
const ehObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

export function criarHolosAI(s, ctx) {
  const T = s.tabelas;
  let ultimo = 0;
  const agora = () => { ultimo = Math.max(Date.now(), ultimo + 1); return new Date(ultimo).toISOString(); };
  const recusa = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });
  class Recusa extends Error { constructor(m, hint, code) { super(m); this.hint = hint; this.code = code; } }
  const falha = (m, hint, code) => { throw new Recusa(m, hint, code); };
  const arquivado = (pid) => { const p = T.patients.find(x => x.id === pid); return p && p.status === 'inativo'; };
  const semId = (x) => { const o = copia(x); delete o.nutritionist_id; delete o.patient_id; return o; };

  function importar(uid, a) {
    if (a.p_operation_id) {
      const j = T.holos_ai_imports.find(x => x.nutritionist_id === uid && x.operation_id === a.p_operation_id);
      if (j) return { id: j.id, versao: j.versao, repetida: true };
    }
    const enc = T.encounters.find(e => e.id === a.p_encounter_id && e.nutritionist_id === uid);
    if (!enc) falha('atendimento nao encontrado', 'atendimento_obrigatorio');
    const texto = a.p_texto;
    if (typeof texto !== 'string' || texto.trim().length < 2) falha('cole o JSON HOLOS_AI_RESULT', 'json_invalido', '22023');
    if (texto.length > C.TEXTO_MAX) falha('texto grande demais', 'json_invalido', '22023');
    const x = C.extrairJson(texto);
    if (!x.json) falha(x.erro, 'json_invalido', '22023');
    const v = C.validar(x.json);
    if (v.incompativel) falha(v.erros[0], 'schema_incompativel', '22023');
    if (v.erros.length) falha('HOLOS_AI_RESULT invalido (' + v.erros.length + ' problema(s)): ' + v.erros.slice(0, 12).join(' | '), 'resultado_invalido', '22023');
    if (arquivado(enc.patient_id)) falha('paciente arquivado: reative antes de registrar novas informacoes', 'paciente_arquivado');
    const j = x.json;
    const versao = T.holos_ai_imports.filter(i => i.encounter_id === enc.id).reduce((m, i) => Math.max(m, i.versao), 0) + 1;
    const t = agora();
    const imp = { id: randomUUID(), nutritionist_id: uid, patient_id: enc.patient_id, encounter_id: enc.id, versao, schema_version: 1, tipo: j.tipo,
      origem: 'holos_ai_gpt', agente: ehObj(j.meta) && typeof j.meta.agente === 'string' ? j.meta.agente.slice(0, 200) : null,
      kb_version: ehObj(j.meta) && typeof j.meta.kb_version === 'string' ? j.meta.kb_version.slice(0, 400) : null,
      entrada: ehObj(j.entrada) ? copia(j.entrada) : null, texto_original: texto, json_original: copia(j),
      texto_sha256: createHash('sha256').update(texto, 'utf8').digest('hex'), status: 'importado', operation_id: a.p_operation_id || null,
      imported_at: t, revisao_iniciada_em: null, concluida_em: null, descartada_em: null, updated_at: t };
    T.holos_ai_imports.push(imp);
    const itens = C.explodir(j);
    itens.forEach(it => T.holos_ai_import_items.push({ id: randomUUID(), import_id: imp.id, nutritionist_id: uid, patient_id: enc.patient_id,
      secao: it.secao, ordem: it.ordem, chave: it.chave, valor_ia: copia(it.valor), so_profissional: C.soProfissional(it.secao),
      estado: 'sugerido', valor_profissional: null, compartilhar: false, revisado_em: null, created_at: t }));
    return { id: imp.id, versao, itens: itens.length, repetida: false };
  }

  function emRevisao(imp) {
    if (!['importado', 'em_revisao'].includes(imp.status)) falha('revisao encerrada: a importacao esta ' + imp.status, 'holos_ai_revisao_encerrada');
  }
  function revisar(uid, a) {
    const it = T.holos_ai_import_items.find(x => x.id === a.p_item_id && x.nutritionist_id === uid);
    if (!it) falha('item nao encontrado', 'referencia_cruzada');
    const imp = T.holos_ai_imports.find(x => x.id === it.import_id);
    emRevisao(imp);
    const estado = a.p_estado, comp = a.p_compartilhar === true;
    if (!['sugerido', 'confirmado', 'editado', 'descartado'].includes(estado)) falha('estado invalido', 'holos_ai_estado_invalido', '22023');
    if (comp && (it.so_profissional || !['confirmado', 'editado'].includes(estado))) falha('este item nao pode ir para a paciente', 'holos_ai_so_profissional');
    let novo = null;
    if (estado === 'editado') {
      const pv = a.p_valor;
      if (pv === null || pv === undefined) falha('edicao sem valor', 'holos_ai_edicao_invalida', '22023');
      if (typeof it.valor_ia === 'string') {
        if (typeof pv !== 'string' || !pv.trim() || pv.length > 5000) falha('o texto editado e obrigatorio', 'holos_ai_edicao_invalida', '22023');
        novo = pv.trim();
      } else {
        const edit = C.EDITAVEIS[it.secao] || ['texto'];
        if (!ehObj(pv)) falha('edicao deve trazer os campos de texto', 'holos_ai_edicao_invalida', '22023');
        Object.keys(pv).forEach(k => {
          if (!edit.includes(k) || typeof pv[k] !== 'string' || pv[k].length > 5000 || (['titulo', 'texto', 'resumo'].includes(k) && !pv[k].trim()))
            falha('campo ' + k + ' nao pode ser editado assim', 'holos_ai_edicao_invalida', '22023');
        });
        novo = Object.assign(copia(it.valor_ia), copia(pv));
      }
    }
    if (arquivado(it.patient_id)) falha('paciente arquivado: reative antes de registrar novas informacoes', 'paciente_arquivado');
    const t = agora();
    Object.assign(it, { estado, valor_profissional: estado === 'editado' ? novo : null,
      compartilhar: comp && ['confirmado', 'editado'].includes(estado) && !it.so_profissional, revisado_em: estado === 'sugerido' ? null : t });
    if (imp.status === 'importado') Object.assign(imp, { status: 'em_revisao', revisao_iniciada_em: t, updated_at: t });
    return semId(it);
  }

  function rpc(uid, nome, a) {
    a = a || {};
    try {
      if (!uid) falha('sessao obrigatoria', null, '42501');
      if (ctx.statusConta && ctx.statusConta(uid) !== 'ativo') falha('conta aguardando liberacao', 'conta_nao_liberada', '42501');
      if (nome === 'importar_holos_ai') return { data: importar(uid, a), error: null };
      if (nome === 'revisar_item_holos_ai') return { data: revisar(uid, a), error: null };
      if (nome === 'concluir_revisao_holos_ai' || nome === 'descartar_importacao_holos_ai') {
        const imp = T.holos_ai_imports.find(x => x.id === a.p_import_id && x.nutritionist_id === uid);
        if (!imp) falha('importacao nao encontrada', 'referencia_cruzada');
        if (!['importado', 'em_revisao'].includes(imp.status)) falha('a importacao ja esta ' + imp.status, 'holos_ai_revisao_encerrada');
        const t = agora();
        if (nome === 'descartar_importacao_holos_ai') { Object.assign(imp, { status: 'descartado', descartada_em: t, updated_at: t }); return { data: { id: imp.id, status: 'descartado' }, error: null }; }
        const itens = T.holos_ai_import_items.filter(x => x.import_id === imp.id);
        const pend = itens.filter(x => x.estado === 'sugerido').length, aceitos = itens.filter(x => ['confirmado', 'editado'].includes(x.estado)).length;
        if (pend > 0) falha('ainda ha ' + pend + ' item(ns) sem revisao: confirme, edite ou descarte cada um', 'holos_ai_revisao_incompleta');
        if (!aceitos) falha('nenhum item confirmado: descarte a importacao em vez de concluir', 'holos_ai_nada_confirmado');
        Object.assign(imp, { status: 'confirmado', concluida_em: t, revisao_iniciada_em: imp.revisao_iniciada_em || t, updated_at: t });
        return { data: { id: imp.id, status: 'confirmado', aceitos }, error: null };
      }
    } catch (e) {
      if (e instanceof Recusa) return recusa(e.message, e.hint, e.code);
      throw e;
    }
    return null;
  }
  return { rpc, NOMES: ['importar_holos_ai', 'revisar_item_holos_ai', 'concluir_revisao_holos_ai', 'descartar_importacao_holos_ai'] };
}

/* conferencia dos itens da HOLOS AI dentro da direcao do Resultado HOLOS (espelho do trecho novo de resultado_holos_validar_direcao) */
export function conferirItensHolosAI(T, uid, pid, d, itens, falha) {
  itens.forEach(it => {
    const r = it.ref;
    if (!ehObj(r) || r.tipo !== 'holos_ai') return;
    const imp = T.holos_ai_imports.find(x => x.id === r.id && x.patient_id === pid && x.nutritionist_id === uid);
    const ai = imp && T.holos_ai_import_items.find(x => x.id === r.campo && x.import_id === imp.id);
    if (!ai) falha('item da HOLOS AI de outra paciente ou inexistente', 'referencia_cruzada');
    if (imp.status !== 'confirmado') falha('a revisao desta importacao HOLOS AI ainda nao foi concluida', 'holos_ai_nao_concluida');
    if (it.confirmado === true && !['confirmado', 'editado'].includes(ai.estado)) falha('item da HOLOS AI descartado ou nao revisado nao entra confirmado', 'holos_ai_item_nao_aceito');
    if (ai.so_profissional && (it.mostrar_paciente === true || (it === d.foco_atual && it.confirmado === true))) falha('item so profissional da HOLOS AI nao vai para a paciente', 'holos_ai_so_profissional');
  });
}
