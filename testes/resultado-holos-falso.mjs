/**
 * Resultado HOLOS no Supabase falso — o mesmo contrato da migration 20261009100000 (provada no harness SQL local,
 * supabase/tests/resultado-holos-harness.sql): montar_resultado_holos, previa / salvar_rascunho / salvar / revisar /
 * descartar_rascunho. O navegador manda so ids, textos e visibilidade; o snapshot sai das linhas "do banco".
 * Hash: sha256 do JSON do snapshot (no banco real e o sha256 do jsonb::text — o app nunca recalcula o hash).
 */
import { createHash, randomUUID } from 'node:crypto';

const FERR_OK = ['oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro', 'mapa_rotina_v1', 'gatilhos_respostas_v1', 'conexao_pertencimento_v1'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const copia = (x) => JSON.parse(JSON.stringify(x));

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

    const de = (t) => T[t].filter(l => l.package_id === pk.id);
    const sistemasPk = de('methodology_systems'), faixas = de('methodology_ranges'), assoc = de('methodology_associations'), perg = de('methodology_questions');
    const respostas = T.holoscan_answers.filter(a => a.application_id === app.id);
    const porQ = Object.fromEntries(perg.map(q => [q.stable_id, q]));
    const ordemQ = (a, b) => ((a.q.position ?? 1e9) - (b.q.position ?? 1e9)) || String(a.q.stable_id).localeCompare(String(b.q.stable_id));
    const itens = (sis, papel, comPeso) => assoc.filter(a => a.destination_type === 'system' && a.destination_id === sis && a.role === papel)
      .map(a => ({ a, q: porQ[a.question_stable_id], r: respostas.find(x => x.marcador_id === a.question_stable_id) })).filter(x => x.q && x.r)
      .sort(ordemQ).map(({ a, q, r }) => Object.assign({ question_id: q.stable_id, enunciado: q.statement, valor: r.valor,
        resposta: Array.isArray(q.response_labels) ? (q.response_labels[r.valor] ?? null) : null }, comPeso ? { peso: a.weight ?? null } : {}));
    const sistemas = T.holoscan_system_scores.filter(x => x.application_id === app.id).map(sc => {
      const ms = sistemasPk.find(y => y.code === sc.sistema) || {};
      const fx = faixas.find(f => f.destination_type === 'system' && f.destination_id === sc.sistema && f.label === sc.faixa) || {};
      return { _pos: ms.position ?? 99, sistema: sc.sistema, nome: sc.nome, nota: sc.nota, carga: sc.carga, faixa: sc.faixa, obtido: sc.obtido, maximo: sc.maximo,
        respondidos: sc.respondidos, total_marcadores: sc.total_marcadores, avaliavel: sc.avaliavel, texto_publico: ms.public_text ?? null,
        mensagem_nutri: fx.message_nutri ?? null, mensagem_paciente: fx.message_paciente ?? null,
        pontuou: itens(sc.sistema, 'primaria', true), contexto: itens(sc.sistema, 'secondary_contextual', false) };
    }).sort((a, b) => (a._pos - b._pos) || a.sistema.localeCompare(b.sistema)).map(x => { delete x._pos; return x; });
    const ferramentas = tools.map(t => ({ id: t.id, ferramenta_id: t.ferramenta_id, versao_ferramenta: t.versao_ferramenta, status: t.status,
      iniciada_em: t.iniciada_em, concluida_em: t.concluida_em, encounter_id: t.encounter_id || null, respostas: copia(t.respostas || {}),
      leitura: t.leitura ?? null, prioridade: t.prioridade ?? null, proximo_passo: t.proximo_passo ?? null,
      mostrar_paciente: !!(vis[t.id] && vis[t.id].mostrar === true), ocultar: [] }));
    const prof = T.profiles.find(x => x.id === uid) || {};
    return {
      conteudo: {
        template_version: 1,
        paciente: { id: pac.id, nome: pac.nome },
        profissional: { nome: prof.nome ?? null },
        atendimento: { id: enc.id, occurred_at: enc.occurred_at, timezone: enc.timezone ?? null, type: enc.type ?? null, modality: enc.modality ?? null },
        holoscan: { id: app.id, quando: app.quando, registrado_em: app.created_at, encounter_id: app.encounter_id,
          pacote: { id: pk.id, code: pk.code, version: pk.version, content_hash: pk.content_hash },
          engine_version: app.engine_version ?? null, calculation_mode: app.calculation_mode, cobertura: copia(app.cobertura ?? null),
          indice: app.indice ?? null, indice_maximo: app.indice_maximo ?? null, avaliavel: app.avaliavel, nota_media: app.nota_media ?? null,
          triada: copia(app.triada ?? null), triada_com_dado: copia(app.triada_com_dado ?? null), interpretacao_texto: app.interpretacao_texto ?? null, sistemas },
        ferramentas,
        exames: { incluidos: false, nota: 'Exames e Leitura Integrada nao fazem parte desta versao do Resultado HOLOS.' }
      },
      fontes: { holoscan: { id: app.id, updated_at: app.updated_at }, ferramentas: tools.map(t => ({ tipo: 'tool_application', id: t.id, updated_at: t.updated_at, status: t.status })) },
      pacote: { id: pk.id, version: pk.version, content_hash: pk.content_hash }
    };
  }
  const campos = (p) => ({ holoscan_application_id: p.holoscan_application_id ?? null, tool_application_ids: copia(p.tool_application_ids || []),
    visao_paciente: { ferramentas: copia((p.visao_paciente && p.visao_paciente.ferramentas) || {}) } });
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
        leitura_profissional: txt(p.leitura_profissional), pontos_acompanhar: txt(p.pontos_acompanhar), questoes_aprofundar: txt(p.questoes_aprofundar), updated_at: carimbo() });
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
      methodology_content_hash: null, operation_id: p.operation_id || null, saved_at: null, reviewed_at: null, reviewed_by: null, created_at: t, updated_at: t };
    T.holos_results.push(l);
    return l.id;
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
        const id = rascunho(uid, semOp);
        const r = T.holos_results.find(h => h.id === id);
        const m = montar(uid, Object.assign({ patient_id: r.patient_id, encounter_id: r.encounter_id }, r.selected_sources));
        const agora = carimbo();
        const conteudo = Object.assign({}, m.conteudo, {
          resultado: { id: r.id, revision_number: r.revision_number, supersedes_id: r.supersedes_id, salvo_em: agora },
          observacoes: { leitura_profissional: r.leitura_profissional, pontos_acompanhar: r.pontos_acompanhar, questoes_aprofundar: r.questoes_aprofundar } });
        Object.assign(r, { status: 'salvo', content_snapshot: conteudo, source_snapshot: m.fontes,
          content_hash: createHash('sha256').update(JSON.stringify(conteudo), 'utf8').digest('hex'),
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
  return { rpc, NOMES: ['previa_resultado_holos', 'salvar_rascunho_resultado_holos', 'salvar_resultado_holos', 'revisar_resultado_holos', 'descartar_rascunho_resultado_holos'] };
}
