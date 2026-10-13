/**
 * Resultado HOLOS no Supabase falso — o mesmo contrato da migration 20261009100000 (provada no harness SQL local,
 * supabase/tests/resultado-holos-harness.sql): montar_resultado_holos, previa / salvar_rascunho / salvar / revisar /
 * descartar_rascunho. O navegador manda so ids, textos e visibilidade; o snapshot sai das linhas "do banco".
 * Hash: sha256 do JSON do snapshot (no banco real e o sha256 do jsonb::text — o app nunca recalcula o hash).
 * Migration 20261015100000 (Resultado Final HOLOS): template 2 congela os Proximos Passos REGISTRADOS (holos_next_steps)
 * e o "compartilhar com a paciente" (visibilidade.proximos_passos, padrao false); emitir_resultado_final congela
 * Resultado (id + hash) + Conduta vigente + Perfil + imagens em holos_result_emissions (imutavel).
 * Migration 20261021100000 (template 5): holos_results.direcao (validada), projecao da paciente NO SERVIDOR
 * (direcao_paciente: so confirmado + compartilhado; hipotese NUNCA), caminho (Resultados anteriores), foco atual
 * obrigatorio para finalizar e emitir; emissao RF-3 congela direcao_paciente + caminho.
 */
import { createHash, randomUUID } from 'node:crypto';

const FERR_OK = ['oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro', 'mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const copia = (x) => JSON.parse(JSON.stringify(x));


/* ---------- template 5: direcao (espelho de 20261021100000) ---------- */
const LISTAS_D = ['momento', 'dores', 'desejos', 'avancos', 'permaneceu', 'padroes', 'direcionamentos', 'estrategias', 'acompanhamento_estrategias', 'acordos_compartilhados', 'observar'];
const TERR_D = ['corpo', 'mente', 'espirito'];
const UNICOS_D = ['foco_atual', 'proxima_etapa'];
const CHAVES_D = ['schema_version', 'tipo'].concat(LISTAS_D, TERR_D, UNICOS_D);
const CHAVES_ITEM = ['id', 'texto', 'texto_sugerido', 'origem', 'ref', 'sugestao', 'confirmado', 'mostrar_paciente', 'descartado'];
const EXTRAS_D = { padroes: ['tipo'], direcionamentos: ['territorio', 'porque', 'objetivo', 'status', 'sistemas'],
  estrategias: ['direcionamento_id', 'finalidade', 'acao', 'observar', 'contexto', 'prazo', 'responsavel', 'status', 'anterior'],
  acompanhamento_estrategias: ['estrategia', 'aplicou', 'facilitou', 'dificultou', 'percepcao', 'observacao', 'mudanca', 'decisao'] };
const PUBLICAS_D = { direcionamentos: ['id', 'territorio', 'porque', 'objetivo', 'status', 'sistemas'],
  estrategias: ['id', 'direcionamento_id', 'finalidade', 'acao', 'observar', 'contexto', 'prazo', 'responsavel', 'status', 'anterior'],
  acompanhamento_estrategias: ['estrategia', 'aplicou', 'facilitou', 'dificultou', 'percepcao', 'mudanca', 'decisao'] };
const TEXTOS_ITEM = ['texto_sugerido', 'porque', 'objetivo', 'direcionamento_id', 'finalidade', 'acao', 'observar', 'contexto', 'prazo', 'responsavel',
  'aplicou', 'facilitou', 'dificultou', 'percepcao', 'observacao', 'mudanca'];
const ORIGENS_D = ['relato_paciente', 'observacao_profissional', 'holoscan', 'ferramenta', 'conduta', 'acordo', 'nutricionista', 'resultado_anterior'];
const REF_TAB = { anamnese: 'anamneses', conduta: 'conducts', acordo: 'agreements', ferramenta: 'tool_applications', holoscan: 'holoscan_applications', resultado: 'holos_results', atendimento: 'encounters' };
const ehObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
export function itensDirecao(d) {
  if (!ehObj(d)) return [];
  const out = [];
  LISTAS_D.forEach(k => { if (Array.isArray(d[k])) out.push(...d[k]); });
  TERR_D.forEach(k => { if (ehObj(d[k]) && Array.isArray(d[k].itens)) out.push(...d[k].itens); });
  UNICOS_D.forEach(k => { if (ehObj(d[k])) out.push(d[k]); });
  return out;
}
const itemPaciente = (it) => ehObj(it) && it.confirmado === true && it.mostrar_paciente === true && it.descartado !== true
  && it.tipo !== 'hipotese' && typeof it.texto === 'string' && it.texto.trim() !== '';
const listaPaciente = (l, lista) => (Array.isArray(l) ? l : []).filter(x => itemPaciente(x) && (lista !== 'padroes' || x.tipo === 'padrao_observado'))
  .map(x => { const o = { texto: x.texto.trim(), origem: x.origem ?? null }; (PUBLICAS_D[lista] || []).forEach(k => { if (x[k] !== undefined && x[k] !== null) o[k] = copia(x[k]); }); return o; });
export function direcaoPaciente(d) {
  const vazio = { schema_version: 1, tipo: 'primeira', momento: [], dores: [], desejos: [], avancos: [], permaneceu: [], padroes: [], foco_atual: null,
    direcionamentos: [], estrategias: [], acompanhamento_estrategias: [], corpo: { itens: [] }, mente: { itens: [] }, espirito: { itens: [] }, acordos_compartilhados: [], observar: [], proxima_etapa: null };
  if (!ehObj(d)) return vazio;
  const f = d.foco_atual;
  const focoOk = ehObj(f) && f.confirmado === true && f.descartado !== true && f.tipo !== 'hipotese' && typeof f.texto === 'string' && f.texto.trim() !== '';
  return { schema_version: 1, tipo: d.tipo || 'primeira',
    momento: listaPaciente(d.momento, 'momento'), dores: listaPaciente(d.dores, 'dores'), desejos: listaPaciente(d.desejos, 'desejos'), avancos: listaPaciente(d.avancos, 'avancos'),
    permaneceu: listaPaciente(d.permaneceu, 'permaneceu'), padroes: listaPaciente(d.padroes, 'padroes'),
    foco_atual: focoOk ? { texto: f.texto.trim(), origem: f.origem ?? null } : null,
    direcionamentos: listaPaciente(d.direcionamentos, 'direcionamentos'), estrategias: listaPaciente(d.estrategias, 'estrategias'),
    acompanhamento_estrategias: listaPaciente(d.acompanhamento_estrategias, 'acompanhamento_estrategias'),
    corpo: { itens: listaPaciente(d.corpo && d.corpo.itens) }, mente: { itens: listaPaciente(d.mente && d.mente.itens) }, espirito: { itens: listaPaciente(d.espirito && d.espirito.itens) },
    acordos_compartilhados: listaPaciente(d.acordos_compartilhados), observar: listaPaciente(d.observar),
    proxima_etapa: itemPaciente(d.proxima_etapa) ? { texto: d.proxima_etapa.texto.trim(), origem: d.proxima_etapa.origem ?? null } : null };
}
export const focoOk = (d) => ehObj(d) && ehObj(d.foco_atual) && d.foco_atual.confirmado === true && d.foco_atual.descartado !== true
  && typeof d.foco_atual.texto === 'string' && d.foco_atual.texto.trim() !== '';

export function criarResultadoHolos(s, ctx) {
  const { statusConta, carimbo } = ctx;
  const T = s.tabelas;
  const recusa = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });
  class Recusa extends Error { constructor(m, hint, code) { super(m); this.hint = hint; this.code = code; } }
  const falha = (m, hint, code) => { throw new Recusa(m, hint, code); };

  function montar(uid, p) {
    if (!uid) falha('sessao obrigatoria', null, '42501');
    const pid = p.patient_id, eid = p.encounter_id || null, hid = p.holoscan_application_id || null;
    if (!pid) falha('paciente obrigatorio', 'payload_invalido', '22023');
    if (![pid, eid, hid].filter(Boolean).every(x => UUID.test(String(x)))) falha('identificador invalido', 'payload_invalido', '22023');
    const pac = T.patients.find(x => x.id === pid && x.nutritionist_id === uid);
    if (!pac) falha('paciente nao encontrado', 'referencia_cruzada');
    if (pac.status === 'inativo') falha('paciente arquivado: reative antes de registrar novas informacoes', 'paciente_arquivado');
    if (!eid) falha('atendimento obrigatorio', 'atendimento_obrigatorio');
    const enc = T.encounters.find(x => x.id === eid && x.patient_id === pid && x.nutritionist_id === uid);
    if (!enc) falha('atendimento de outro paciente ou inexistente', 'referencia_cruzada');
    if (!hid) falha('HOLOSCAN obrigatorio', 'holoscan_obrigatorio');
    const app = T.holoscan_applications.find(x => x.id === hid && x.patient_id === pid && x.nutritionist_id === uid);
    if (!app) falha('aplicacao HOLOSCAN de outro paciente ou inexistente', 'referencia_cruzada');
    if (!app.methodology_package_id || app.calculation_mode !== 'oficial') falha('aplicacao HOLOSCAN historica, sem pacote metodologico oficial', 'holoscan_nao_oficial');
    const pk = T.methodology_packages.find(x => x.id === app.methodology_package_id);
    if (!pk || !['aprovado', 'retirado'].includes(pk.status)) falha('pacote metodologico da aplicacao nao esta aprovado', 'holoscan_nao_oficial');

    const ids = p.tool_application_ids == null ? [] : p.tool_application_ids;
    if (!Array.isArray(ids)) falha('lista de ferramentas invalida', 'payload_invalido', '22023');
    if (!ids.every(x => UUID.test(String(x)))) falha('identificador de ferramenta invalido', 'payload_invalido', '22023');
    if (new Set(ids).size !== ids.length) falha('ferramenta repetida', 'fonte_repetida');
    if (ids.length > 9) falha('no maximo 9 ferramentas', 'payload_invalido');
    const tools = ids.map(id => T.tool_applications.find(t => t.id === id && t.patient_id === pid && t.nutritionist_id === uid));
    if (tools.some(t => !t)) falha('ferramenta de outro paciente ou inexistente', 'referencia_cruzada');
    if (new Set(tools.map(t => t.ferramenta_id)).size !== tools.length) falha('escolha uma unica aplicacao por ferramenta', 'fonte_repetida');
    if (tools.some(t => !['concluida', 'revisada'].includes(t.status))) falha('ferramenta em rascunho nao entra no Resultado HOLOS', 'fonte_nao_consolidada');
    if (tools.some(t => !FERR_OK.includes(t.ferramenta_id))) falha('ferramenta fora do catalogo atual', 'fonte_invalida');
    const vis = (p.visao_paciente && p.visao_paciente.ferramentas) || {};
    if (typeof vis !== 'object' || Array.isArray(vis)) falha('visibilidade invalida', 'payload_invalido', '22023');
    const ppVis = p.visao_paciente && p.visao_paciente.proximos_passos !== undefined && p.visao_paciente.proximos_passos !== null ? p.visao_paciente.proximos_passos : false;
    if (typeof ppVis !== 'boolean') falha('compartilhamento invalido', 'payload_invalido', '22023');

    /* template 5: direcao (formato, tamanho, referencias SO desta paciente) */
    const d = p.direcao === undefined || p.direcao === null ? null : p.direcao;
    const invalida = (m) => falha(m, 'direcao_invalida', '22023');
    if (d !== null) {
      if (!ehObj(d)) invalida('direcao invalida');
      if (JSON.stringify(d).length > 262144) invalida('direcao grande demais');
      if (d.schema_version !== 1) invalida('direcao: schema_version deve ser 1');
      Object.keys(d).forEach(k => { if (!CHAVES_D.includes(k)) invalida('direcao: campo desconhecido ' + k); });
      if ('tipo' in d && !['primeira', 'retorno'].includes(d.tipo)) invalida('direcao: tipo deve ser primeira ou retorno');
      const refRes = (r, obrig) => {
        if (r === undefined || r === null) { if (obrig) invalida('referencia da estrategia obrigatoria'); return; }
        if (!ehObj(r) || !UUID.test(String(r.resultado_id || '')) || typeof r.estrategia_id !== 'string' || r.estrategia_id.length > 64
          || Object.keys(r).some(k => !['resultado_id', 'estrategia_id'].includes(k))) invalida('referencia de estrategia invalida');
      };
      const item = (it, lista) => {
        const padrao = lista === 'padroes';
        if (!ehObj(it)) invalida('item de direcao invalido');
        Object.keys(it).forEach(k => { if (!CHAVES_ITEM.includes(k) && !(EXTRAS_D[lista] || []).includes(k)) invalida('campo de item desconhecido: ' + k); });
        if (typeof it.texto !== 'string' || !it.texto.trim() || it.texto.length > 1000) invalida('texto do item obrigatorio (ate 1000 caracteres)');
        TEXTOS_ITEM.forEach(k => { if (k in it && it[k] !== null && (typeof it[k] !== 'string' || it[k].length > 1000)) invalida('campo ' + k + ' invalido'); });
        if (lista === 'direcionamentos') {
          if (it.territorio != null && !['corpo', 'mente', 'espirito', 'integrado'].includes(it.territorio)) invalida('territorio invalido');
          if ('status' in it && !['proposto', 'ativo', 'concluido', 'encerrado'].includes(it.status)) invalida('status do direcionamento invalido');
          if ('sistemas' in it && (!Array.isArray(it.sistemas) || it.sistemas.length > 5 || it.sistemas.some(x => typeof x !== 'string' || x.length > 40))) invalida('sistemas invalidos');
        }
        if (lista === 'estrategias') {
          if ('status' in it && !['proposta', 'acordada', 'em_teste', 'manter', 'ajustar', 'substituir', 'concluida', 'encerrada'].includes(it.status)) invalida('status da estrategia invalido');
          refRes(it.anterior, false);
        }
        if (lista === 'acompanhamento_estrategias') {
          refRes(it.estrategia, true);
          if (it.decisao != null && !['manter', 'ajustar', 'substituir', 'concluir', 'encerrar'].includes(it.decisao)) invalida('decisao invalida');
          if (it.confirmado === true && !it.decisao) invalida('acompanhamento confirmado precisa da decisao');
        }
        if ('id' in it && (typeof it.id !== 'string' || it.id.length > 64)) invalida('id do item invalido');
        if (!ORIGENS_D.includes(it.origem)) invalida('origem do item invalida');
        ['sugestao', 'confirmado', 'mostrar_paciente', 'descartado'].forEach(k => { if (k in it && typeof it[k] !== 'boolean') invalida('campo ' + k + ' deve ser booleano'); });
        const r = it.ref;
        if (r !== undefined && r !== null) {
          if (!ehObj(r) || !REF_TAB[r.tipo] || !UUID.test(String(r.id || '')) || ('campo' in r && r.campo !== null && typeof r.campo !== 'string') || String(r.campo || '').length > 80
            || Object.keys(r).some(k => !['tipo', 'id', 'campo'].includes(k))) invalida('referencia do item invalida');
        } else if (it.sugestao === true) invalida('sugestao sem referencia de origem');
        if (padrao && !['padrao_observado', 'hipotese'].includes(it.tipo)) invalida('padrao precisa do tipo padrao_observado ou hipotese');
      };
      LISTAS_D.forEach(k => { if (k in d) { if (!Array.isArray(d[k]) || d[k].length > 40) invalida('direcao: ' + k + ' deve ser lista (ate 40 itens)'); d[k].forEach(it => item(it, k)); } });
      TERR_D.forEach(k => { if (k in d) {
        const t = d[k];
        if (!ehObj(t) || Object.keys(t).some(x => x !== 'itens') || ('itens' in t && (!Array.isArray(t.itens) || t.itens.length > 40))) invalida('direcao: ' + k + ' deve ser {itens: [...]}');
        (t.itens || []).forEach(it => item(it, k)); } });
      UNICOS_D.forEach(k => { if (k in d && d[k] !== null) item(d[k], k); });
      itensDirecao(d).forEach(it => { if (ehObj(it.ref)) {
        const tab = T[REF_TAB[it.ref.tipo]] || [];
        if (!tab.some(x => x.id === it.ref.id && x.patient_id === pid && x.nutritionist_id === uid)) falha('referencia de outra paciente ou inexistente', 'referencia_cruzada');
      } });
      /* estrategia anterior / acompanhada: Resultado SALVO desta paciente */
      itensDirecao(d).forEach(it => { const r = ehObj(it.anterior) ? it.anterior : ehObj(it.estrategia) ? it.estrategia : null; if (!r) return;
        if (!T.holos_results.some(h => h.id === r.resultado_id && h.patient_id === pid && h.nutritionist_id === uid && h.status !== 'rascunho'))
          falha('estrategia de Resultado de outra paciente ou nao salvo', 'referencia_cruzada'); });
    }
    /* caminho: Resultados anteriores (outros atendimentos, anteriores a este), do snapshot imutavel de cada um */
    const ocorrido = (id) => (T.encounters.find(x => x.id === id) || {}).occurred_at;
    const porEnc = {};
    T.holos_results.filter(h => h.patient_id === pid && h.nutritionist_id === uid && ['salvo', 'revisado'].includes(h.status) && !h.superseded_at
      && h.content_snapshot && h.encounter_id !== enc.id && String(ocorrido(h.encounter_id)) < String(enc.occurred_at))
      .forEach(h => { const a = porEnc[h.encounter_id]; if (!a || String(h.saved_at) > String(a.saved_at)) porEnc[h.encounter_id] = h; });
    const caminho = Object.values(porEnc).sort((a, b) => String(ocorrido(b.encounter_id)).localeCompare(String(ocorrido(a.encounter_id)))).slice(0, 10)
      .sort((a, b) => String(ocorrido(a.encounter_id)).localeCompare(String(ocorrido(b.encounter_id))))
      .map(h => ({ resultado_id: h.id, revision_number: h.revision_number, content_hash: h.content_hash, template_version: h.template_version, atendimento_em: ocorrido(h.encounter_id),
        foco: copia((h.content_snapshot.direcao_paciente || {}).foco_atual ?? null),
        direcionamentos: copia((h.content_snapshot.direcao_paciente || {}).direcionamentos || []), estrategias: copia((h.content_snapshot.direcao_paciente || {}).estrategias || []), avancos: copia((h.content_snapshot.direcao_paciente || {}).avancos || []),
        acordos: copia((h.content_snapshot.direcao_paciente || {}).acordos_compartilhados || []) }));

    const de = (t) => T[t].filter(l => l.package_id === pk.id);
    const sistemasPk = de('methodology_systems'), faixas = de('methodology_ranges'), assoc = de('methodology_associations'), perg = de('methodology_questions');
    const respostas = T.holoscan_answers.filter(a => a.application_id === app.id);
    const porQ = Object.fromEntries(perg.map(q => [q.stable_id, q]));
    const ordemQ = (a, b) => ((a.q.position ?? 1e9) - (b.q.position ?? 1e9)) || String(a.q.stable_id).localeCompare(String(b.q.stable_id));
    const itens = (sis, papel, comPeso) => assoc.filter(a => a.destination_type === 'system' && a.destination_id === sis && a.role === papel)
      .map(a => ({ a, q: porQ[a.question_stable_id], r: respostas.find(x => x.marcador_id === a.question_stable_id) })).filter(x => x.q && x.r)
      .sort(ordemQ).map(({ a, q, r }) => Object.assign({ question_id: q.stable_id, enunciado: q.statement, valor: r.valor,
        resposta: Array.isArray(q.response_labels) ? (q.response_labels[r.valor] ?? null) : null }, comPeso ? { peso: a.weight ?? null } : {}));
    /* template 4 (migration 20261019100000, resultado_holos_dominantes): ate 3 sinais dominantes reais por sistema —
       peso x valor orientado (a mesma conta do motor e dos Proximos Passos), texto aprovado da pergunta */
    const escalas = de('methodology_scales');
    const dominantes = (sis) => assoc.filter(a => a.destination_type === 'system' && a.destination_id === sis && a.role === 'primaria' && a.weight != null)
      .map(a => { const q = porQ[a.question_stable_id], r = respostas.find(x => x.marcador_id === a.question_stable_id), e = q && escalas.find(z => z.code === q.scale_code);
        if (!q || !r || r.valor === null || r.valor === undefined || !e) return null;
        return { question_id: q.stable_id, enunciado: q.statement, pontos: a.weight * (q.orientation === 'invertida' ? e.max_value - r.valor : r.valor - e.min_value) }; })
      .filter(x => x && x.pontos > 0).sort((a, b) => (b.pontos - a.pontos) || (a.question_id < b.question_id ? -1 : a.question_id > b.question_id ? 1 : 0)).slice(0, 3);
    const sistemas = T.holoscan_system_scores.filter(x => x.application_id === app.id).map(sc => {
      const ms = sistemasPk.find(y => y.code === sc.sistema) || {};
      const fx = faixas.find(f => f.destination_type === 'system' && f.destination_id === sc.sistema && f.label === sc.faixa) || {};
      return { _pos: ms.position ?? 99, sistema: sc.sistema, nome: sc.nome, nota: sc.nota, carga: sc.carga, faixa: sc.faixa, obtido: sc.obtido, maximo: sc.maximo,
        respondidos: sc.respondidos, total_marcadores: sc.total_marcadores, avaliavel: sc.avaliavel, texto_publico: ms.public_text ?? null,
        mensagem_nutri: fx.message_nutri ?? null, mensagem_paciente: fx.message_paciente ?? null,
        pontuou: itens(sc.sistema, 'primaria', true), contexto: itens(sc.sistema, 'secondary_contextual', false), dominantes: dominantes(sc.sistema) };
    }).sort((a, b) => (a._pos - b._pos) || a.sistema.localeCompare(b.sistema)).map(x => { delete x._pos; return x; });
    const ferramentas = tools.map(t => ({ id: t.id, ferramenta_id: t.ferramenta_id, versao_ferramenta: t.versao_ferramenta, status: t.status,
      iniciada_em: t.iniciada_em, concluida_em: t.concluida_em, encounter_id: t.encounter_id || null, respostas: copia(t.respostas || {}),
      leitura: t.leitura ?? null, prioridade: t.prioridade ?? null, proximo_passo: t.proximo_passo ?? null,
      mostrar_paciente: !!(vis[t.id] && vis[t.id].mostrar === true), ocultar: [] }));
    const prof = T.profiles.find(x => x.id === uid) || {};
    /* Proximos Passos: SO o registro imutavel existente (catalogo mais recente registrado); nada calculado aqui */
    const reg = (T.holos_next_steps || []).filter(n => n.holoscan_application_id === app.id && n.nutritionist_id === uid)
      .sort((a, b) => (b.catalog_version - a.catalog_version) || String(b.created_at).localeCompare(String(a.created_at)))[0];
    const pp = reg ? { registrado: true, registro_id: reg.id, registrado_em: reg.created_at,
      catalogo: { code: reg.catalog_code, version: reg.catalog_version, content_hash: reg.catalog_hash }, engine_version: reg.engine_version, content_hash: reg.content_hash,
      systems_order: copia(reg.systems_order), selection: copia(reg.selection), motivo: (reg.content_snapshot && reg.content_snapshot.motivo) ?? null } : { registrado: false };
    /* template 3 (migration 20261017100000, proximos_passos_pendentes): a mesma escolha, sem as concluidas no atendimento */
    if (reg) {
      const PPm = globalThis.ProximosPassos;
      const encs = [enc.id, app.encounter_id].filter(Boolean);
      const concluidas = [...new Set(T.tool_applications.filter(t => t.nutritionist_id === uid && t.patient_id === pid && encs.includes(t.encounter_id)
        && ['concluida', 'revisada'].includes(t.status)).map(t => t.ferramenta_id))].sort();
      const regras = T.holos_recommendation_rules.filter(g => g.catalog_id === reg.catalog_id);
      const sis = (reg.systems_order || []).map(x => x.system_id);
      const usadas = concluidas.slice(), sel = [];
      const slots = sis.length >= 2 ? [sis[0], sis[1], sis[0]] : sis.length ? [sis[0], sis[0], sis[0]] : [];
      slots.forEach(sx => { const e = PPm.escolher(regras, sx, usadas, concluidas); if (e) { usadas.push(e.tool_id); sel.push(Object.assign(e, { papel: sel.length ? 'complementar' : 'principal', slot: sel.length + 1 })); } });
      pp.pendentes = { concluidas_no_atendimento: concluidas, selection: sel, todas_realizadas: sel.length === 0 && sis.length > 0 };
    }
    /* MR-V1 (item 23, migration 20261019100000): Mapa do Proposito DERIVADO de OQ3 + PQQ, com as aplicacoes fonte */
    const temTxt = v => typeof v === 'string' ? v.trim() !== '' : v !== null && v !== undefined;
    const fOq3 = ferramentas.find(t => t.ferramenta_id === 'oq3'), fPqq = ferramentas.find(t => t.ferramenta_id === 'pqq');
    const ro = (fOq3 && fOq3.respostas) || {}, rp = (fPqq && fPqq.respostas) || {};
    const mapaProposito = fOq3 && fPqq && (temTxt(ro.quer) || temTxt(ro.precisa) || temTxt(ro.consegue))
      && (temTxt(rp.objetivo) || temTxt(rp.verdadeiro) || ['r1', 'r2', 'r3', 'r4', 'r5'].some(k => temTxt(rp[k])))
      ? { ferramenta_id: 'mapa', motor: 'MR-V1', regra: 'OQ3+PQQ', opcional: true,
          fontes: [{ ferramenta_id: 'oq3', id: fOq3.id, concluida_em: fOq3.concluida_em ?? null }, { ferramenta_id: 'pqq', id: fPqq.id, concluida_em: fPqq.concluida_em ?? null }],
          campos: { quer: ro.quer ?? null, importa: rp.verdadeiro ?? null, sustenta: ro.consegue ?? null, direcao: rp.objetivo ?? null } }
      : null;
    return {
      conteudo: {
        template_version: 5,
        motor_resultados: 'MR-V1',
        paciente: { id: pac.id, nome: pac.nome },
        profissional: { nome: prof.nome ?? null },
        atendimento: { id: enc.id, occurred_at: enc.occurred_at, timezone: enc.timezone ?? null, type: enc.type ?? null, modality: enc.modality ?? null },
        holoscan: { id: app.id, quando: app.quando, registrado_em: app.created_at, encounter_id: app.encounter_id,
          pacote: { id: pk.id, code: pk.code, version: pk.version, content_hash: pk.content_hash },
          engine_version: app.engine_version ?? null, calculation_mode: app.calculation_mode, cobertura: copia(app.cobertura ?? null),
          indice: app.indice ?? null, indice_maximo: app.indice_maximo ?? null, avaliavel: app.avaliavel, nota_media: app.nota_media ?? null,
          triada: copia(app.triada ?? null), triada_com_dado: copia(app.triada_com_dado ?? null), interpretacao_texto: app.interpretacao_texto ?? null, sistemas },
        ferramentas,
        derivados: { mapa_proposito: mapaProposito },
        proximos_passos: pp,
        visibilidade: { proximos_passos: ppVis },
        exames: { incluidos: false, nota: 'Exames e Leitura Integrada nao fazem parte desta versao do Resultado HOLOS.' },
        direcao: copia(d),
        direcao_paciente: direcaoPaciente(d),
        caminho
      },
      fontes: { holoscan: { id: app.id, updated_at: app.updated_at }, ferramentas: tools.map(t => ({ tipo: 'tool_application', id: t.id, updated_at: t.updated_at, status: t.status })) },
      pacote: { id: pk.id, version: pk.version, content_hash: pk.content_hash }
    };
  }
  const campos = (p) => ({ holoscan_application_id: p.holoscan_application_id ?? null, tool_application_ids: copia(p.tool_application_ids || []),
    visao_paciente: { ferramentas: copia((p.visao_paciente && p.visao_paciente.ferramentas) || {}),
      proximos_passos: !!(p.visao_paciente && p.visao_paciente.proximos_passos === true) } });
  const txt = (v) => (v === undefined || v === null || v === '') ? null : String(v);

  function rascunho(uid, p) {
    montar(uid, p);
    if (p.operation_id) { const j = T.holos_results.find(h => h.nutritionist_id === uid && h.operation_id === p.operation_id); if (j) return j.id; }
    if (p.id) {
      const a = T.holos_results.find(h => h.id === p.id && h.nutritionist_id === uid);
      if (!a) falha('rascunho nao encontrado', 'referencia_cruzada');
      if (a.status !== 'rascunho') falha('resultado salvo e imutavel: crie uma nova versao', 'revisao_imutavel');
      if (a.patient_id !== p.patient_id) falha('rascunho de outro paciente', 'referencia_cruzada');
      if (p.expected_updated_at && a.updated_at !== p.expected_updated_at) falha('o rascunho mudou em outra sessao', 'conflito');
      Object.assign(a, { encounter_id: p.encounter_id, holoscan_application_id: p.holoscan_application_id, selected_sources: campos(p),
        leitura_profissional: txt(p.leitura_profissional), pontos_acompanhar: txt(p.pontos_acompanhar), questoes_aprofundar: txt(p.questoes_aprofundar),
        direcao: ehObj(p.direcao) ? copia(p.direcao) : null, updated_at: carimbo() });
      return a.id;
    }
    let rev = 1;
    if (p.supersedes_id) {
      const ant = T.holos_results.find(h => h.id === p.supersedes_id && h.nutritionist_id === uid && h.patient_id === p.patient_id);
      if (!ant) falha('versao anterior nao encontrada', 'referencia_cruzada');
      if (ant.status === 'rascunho') falha('so se cria nova versao a partir de resultado salvo', 'payload_invalido');
      if (ant.superseded_at || T.holos_results.some(h => h.supersedes_id === ant.id)) falha('esta versao ja tem uma versao seguinte', 'conflito');
      rev = ant.revision_number + 1;
    }
    const t = carimbo();
    const l = { id: randomUUID(), nutritionist_id: uid, patient_id: p.patient_id, encounter_id: p.encounter_id, status: 'rascunho', revision_number: rev,
      supersedes_id: p.supersedes_id || null, superseded_at: null, holoscan_application_id: p.holoscan_application_id, selected_sources: campos(p),
      leitura_profissional: txt(p.leitura_profissional), pontos_acompanhar: txt(p.pontos_acompanhar), questoes_aprofundar: txt(p.questoes_aprofundar),
      content_snapshot: null, source_snapshot: null, content_hash: null, template_version: 1, methodology_package_id: null, methodology_package_version: null,
      methodology_content_hash: null, operation_id: p.operation_id || null, saved_at: null, reviewed_at: null, reviewed_by: null, created_at: t, updated_at: t,
      direcao: ehObj(p.direcao) ? copia(p.direcao) : null };
    T.holos_results.push(l);
    return l.id;
  }

  const IMG = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
  function imagem(v) {
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string' || v.length > 700000 || !IMG.test(v)) falha('imagem invalida', 'imagem_invalida', '22023');
    return v;
  }
  /* emitir_resultado_final: congela Resultado (id + hash), Conduta vigente (campos para a paciente + combinados), Perfil, imagens. */
  function emitir(uid, p) {
    if (!p.holos_result_id || !UUID.test(String(p.holos_result_id))) falha('resultado obrigatorio', 'payload_invalido', '22023');
    const img = p.imagens || {};
    if (typeof img !== 'object' || Array.isArray(img)) falha('imagens invalidas', 'imagem_invalida', '22023');
    if (!T.holos_result_emissions) T.holos_result_emissions = [];
    if (p.operation_id) { const j = T.holos_result_emissions.find(e => e.nutritionist_id === uid && e.operation_id === p.operation_id); if (j) return { id: j.id, emission_number: j.emission_number, content_hash: j.content_hash, created_at: j.created_at }; }
    const r = T.holos_results.find(h => h.id === p.holos_result_id && h.nutritionist_id === uid);
    if (!r) falha('resultado nao encontrado', 'referencia_cruzada');
    if (r.status === 'rascunho' || !r.content_snapshot) falha('so Resultado HOLOS salvo e emitido', 'resultado_nao_finalizado');
    if (r.superseded_at) falha('esta versao foi substituida: emita a versao atual', 'resultado_substituido');
    /* templates 1-4 (historicos): regra da epoca (RF-2), sem foco. Template 5: foco obrigatorio (RF-3) */
    const t5 = (r.template_version || 1) >= 5;
    if (t5 && !ehObj((r.content_snapshot.direcao_paciente || {}).foco_atual))
      falha('Resultado HOLOS sem Foco atual confirmado: defina e confirme o foco antes de emitir', 'foco_obrigatorio');
    const pac = T.patients.find(x => x.id === r.patient_id && x.nutritionist_id === uid);
    if (pac && pac.status === 'inativo') falha('paciente arquivado: reative antes de registrar novas informacoes', 'paciente_arquivado');
    const encDe = (id) => T.encounters.find(e => e.id === id) || {};
    /* RF-2 (migration 20261019100000): a Conduta do ATENDIMENTO DO RESULTADO — nunca a de outro atendimento */
    const cd = T.conducts.filter(c => c.patient_id === r.patient_id && c.nutritionist_id === uid && ['salvo', 'revisado'].includes(c.status) && c.encounter_id === r.encounter_id)
      .sort((a, b) => b.revision_number - a.revision_number)[0];
    const conduta = cd ? { id: cd.id, revision_number: cd.revision_number, encounter_id: cd.encounter_id, atendimento_em: encDe(cd.encounter_id).occurred_at ?? null,
      campos: { objective: cd.objective ?? null, nutrition_strategy: cd.nutrition_strategy ?? null, actions: cd.actions ?? null, resources: cd.resources ?? null,
        professional_guidance: cd.professional_guidance ?? null, return_plan: cd.return_plan ?? null },
      acordos: T.agreements.filter(a => a.conduct_id === cd.id && a.nutritionist_id === uid && String(a.description || '').trim())
        .sort((a, b) => ((a.position || 0) - (b.position || 0)) || String(a.created_at).localeCompare(String(b.created_at)))
        .map(a => ({ description: a.description, due_text: a.due_text ?? null })) } : null;
    const pr = T.profiles.find(x => x.id === uid) || {};
    const num = T.holos_result_emissions.filter(e => e.patient_id === r.patient_id).reduce((m, e) => Math.max(m, e.emission_number), 0) + 1;
    const agora = carimbo();
    const snap = { template: t5 ? 'RF-3' : 'RF-2', emitida_em: agora, emissao: { numero: num }, paciente: { id: pac.id, nome: pac.nome },
      resultado: { id: r.id, revision_number: r.revision_number, status: r.status, salvo_em: r.saved_at, content_hash: r.content_hash, template_version: r.template_version || 1 },
      conduta,
      profissional: { nome: pr.nome ?? null, profissao: pr.profissao ?? null, registro: pr.registro ?? null, especialidade: pr.especialidade ?? null, cidade: pr.cidade ?? null,
        telefone: pr.telefone ?? null, instagram: pr.instagram ?? null, cor_primaria: pr.cor_primaria ?? null, cor_secundaria: pr.cor_secundaria ?? null },
      imagens: { logo: imagem(img.logo), assinatura: imagem(img.assinatura), carimbo: imagem(img.carimbo) } };
    if (t5) Object.assign(snap, { direcao_paciente: copia(r.content_snapshot.direcao_paciente), caminho: copia(r.content_snapshot.caminho || []) });
    const l = { id: randomUUID(), nutritionist_id: uid, patient_id: r.patient_id, holos_result_id: r.id, result_content_hash: r.content_hash, conduct_id: cd ? cd.id : null,
      emission_number: num, template_version: snap.template, content_snapshot: snap, content_hash: createHash('sha256').update(JSON.stringify(snap), 'utf8').digest('hex'),
      operation_id: p.operation_id || null, created_at: agora };
    T.holos_result_emissions.push(l);
    return { id: l.id, emission_number: l.emission_number, content_hash: l.content_hash, created_at: l.created_at };
  }

  function rpc(uid, nome, args) {
    const p = (args && args.payload) || {};
    try {
      if (statusConta(uid) !== 'ativo') falha('conta aguardando liberacao', 'conta_inativa', '42501');
      if (nome === 'previa_resultado_holos') return { data: montar(uid, p).conteudo, error: null };
      if (nome === 'salvar_rascunho_resultado_holos') return { data: rascunho(uid, p), error: null };
      if (nome === 'salvar_resultado_holos') {
        if (p.operation_id) { const j = T.holos_results.find(h => h.nutritionist_id === uid && h.operation_id === p.operation_id && h.status !== 'rascunho'); if (j) return { data: j.id, error: null }; }
        const semOp = Object.assign({}, p); delete semOp.operation_id;
        const antes = copia(T.holos_results);   // uma transacao: recusa desfaz o rascunho gravado nesta chamada
        const id = rascunho(uid, semOp);
        const r = T.holos_results.find(h => h.id === id);
        if (!focoOk(r.direcao)) { T.holos_results.splice(0, T.holos_results.length, ...antes); falha('defina e confirme o Foco atual antes de finalizar o Resultado HOLOS', 'foco_obrigatorio'); }
        const m = montar(uid, Object.assign({ patient_id: r.patient_id, encounter_id: r.encounter_id }, r.selected_sources, { direcao: r.direcao }));
        const agora = carimbo();
        const conteudo = Object.assign({}, m.conteudo, {
          resultado: { id: r.id, revision_number: r.revision_number, supersedes_id: r.supersedes_id, salvo_em: agora },
          observacoes: { leitura_profissional: r.leitura_profissional, pontos_acompanhar: r.pontos_acompanhar, questoes_aprofundar: r.questoes_aprofundar } });
        Object.assign(r, { status: 'salvo', content_snapshot: conteudo, source_snapshot: m.fontes,
          content_hash: createHash('sha256').update(JSON.stringify(conteudo), 'utf8').digest('hex'), template_version: conteudo.template_version || 1,
          methodology_package_id: m.pacote.id, methodology_package_version: m.pacote.version, methodology_content_hash: m.pacote.content_hash,
          saved_at: agora, operation_id: p.operation_id || r.operation_id, updated_at: agora });
        if (r.supersedes_id) { const ant = T.holos_results.find(h => h.id === r.supersedes_id); if (ant && !ant.superseded_at) { ant.superseded_at = agora; ant.updated_at = agora; } }
        return { data: r.id, error: null };
      }
      if (nome === 'revisar_resultado_holos') {
        const r = T.holos_results.find(h => h.id === args.p_id && h.nutritionist_id === uid);
        if (!r) falha('resultado nao encontrado', 'referencia_cruzada');
        if (r.status !== 'salvo') falha('so um resultado salvo pode ser marcado como revisado', 'revisao_imutavel');
        const pac = T.patients.find(x => x.id === r.patient_id);
        if (pac && pac.status === 'inativo') falha('paciente arquivado: reative antes de registrar novas informacoes', 'paciente_arquivado');
        const agora = carimbo();
        Object.assign(r, { status: 'revisado', reviewed_at: agora, reviewed_by: uid, updated_at: agora });
        return { data: r.id, error: null };
      }
      if (nome === 'emitir_resultado_final') return { data: emitir(uid, p), error: null };
      if (nome === 'descartar_rascunho_resultado_holos') {
        const i = T.holos_results.findIndex(h => h.id === args.p_id && h.nutritionist_id === uid && h.status === 'rascunho');
        if (i < 0) falha('rascunho nao encontrado (resultado salvo nao e apagado)', 'revisao_imutavel');
        T.holos_results.splice(i, 1);
        return { data: true, error: null };
      }
    } catch (e) {
      if (e instanceof Recusa) return recusa(e.message, e.hint, e.code);
      throw e;
    }
    return null;
  }
  return { rpc, NOMES: ['previa_resultado_holos', 'salvar_rascunho_resultado_holos', 'salvar_resultado_holos', 'revisar_resultado_holos', 'descartar_rascunho_resultado_holos', 'emitir_resultado_final'] };
}
