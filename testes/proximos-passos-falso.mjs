/**
 * Proximos Passos HOLOS no Supabase falso — o mesmo contrato da migration 20261012100000 (provada no harness SQL local,
 * supabase/tests/proximos-passos-harness.sql): proximos_passos_holos (previa) e registrar_proximos_passos (snapshot
 * unico por aplicacao e catalogo, imutavel). A selecao usa o MESMO motor do navegador (proximos-passos.js, carregado
 * no Node); a ordem dos sistemas e os sinais dominantes sao recalculados "das linhas do banco", como a funcao SQL faz.
 */
import { createHash, randomUUID } from 'node:crypto';

const ORDEM = ['fungico', 'acido_inflamatorio', 'metabolico', 'detox_linfatico', 'mental_emocional_espiritual'];
const copia = (x) => JSON.parse(JSON.stringify(x));

export function criarProximosPassos(s, ctx) {
  const { statusConta, carimbo } = ctx;
  const T = s.tabelas;
  const recusa = (m, hint, code) => ({ data: null, error: { message: m, code: code || 'P0001', hint: hint || null, details: null } });

  function catalogoAtual() {
    return T.holos_recommendation_catalogs.filter(c => c.code === 'HOLOS-RECOMENDACOES-V1' && c.status === 'aprovado').sort((a, b) => b.version - a.version)[0] || null;
  }
  function calcular(uid, appId) {
    const P = globalThis.ProximosPassos;
    if (!P) throw new Error('proximos-passos.js nao carregado no servidor falso');
    const app = T.holoscan_applications.find(a => a.id === appId && a.nutritionist_id === uid);
    if (!app) return recusa('aplicacao HOLOSCAN nao encontrada', 'referencia_cruzada');
    if (!app.methodology_package_id) return recusa('Proximos Passos HOLOS so para aplicacao oficial (pacote HOLOS-V1)', 'aplicacao_nao_oficial');
    const cat = catalogoAtual();
    if (!cat) return recusa('catalogo de recomendacoes indisponivel', 'catalogo_indisponivel');
    const mp = app.methodology_package_id;
    const nomes = {}; T.methodology_systems.filter(x => x.package_id === mp).forEach(x => { nomes[x.code] = x.name; });
    const perguntas = {}; T.methodology_questions.filter(q => q.package_id === mp).forEach(q => { perguntas[q.stable_id] = q; });
    const escalas = {}; T.methodology_scales.filter(e => e.package_id === mp).forEach(e => { escalas[e.code] = e; });
    const respostas = {}; T.holoscan_answers.filter(a => a.application_id === appId && a.valor !== null && a.valor !== undefined).forEach(a => { respostas[a.marcador_id] = Number(a.valor); });
    const sistemas = T.holoscan_system_scores.filter(sc => sc.application_id === appId && sc.avaliavel === true && sc.nota !== null && sc.nota !== undefined)
      .sort((a, b) => (Number(a.nota) - Number(b.nota)) || (ORDEM.indexOf(a.sistema) - ORDEM.indexOf(b.sistema)))
      .map(sc => {
        const dom = T.methodology_associations.filter(a => a.package_id === mp && a.destination_type === 'system' && a.destination_id === sc.sistema && a.role === 'primaria' && a.weight !== null && a.weight !== undefined && (a.question_stable_id in respostas))
          .map(a => { const q = perguntas[a.question_stable_id]; const e = q && escalas[q.scale_code]; if (!q || !e) return null;
            const v = respostas[a.question_stable_id]; const z = q.orientation === 'invertida' ? e.max_value - v : v - e.min_value;
            return { question_id: a.question_stable_id, rotulo: q.statement, pontos: Number(a.weight) * z }; })
          .filter(d => d && d.pontos > 0).sort((a, b) => (b.pontos - a.pontos) || a.question_id.localeCompare(b.question_id)).slice(0, 3);
        return { system_id: sc.sistema, nome: nomes[sc.sistema] || sc.sistema, nota: sc.nota, faixa: sc.faixa, respondidos: sc.respondidos, total_marcadores: sc.total_marcadores, dominantes: dom };
      });
    const concluidas = app.encounter_id ? [...new Set(T.tool_applications.filter(t => t.nutritionist_id === uid && t.patient_id === app.patient_id && t.encounter_id === app.encounter_id && ['concluida', 'revisada'].includes(t.status)).map(t => t.ferramenta_id))].sort() : [];
    const regras = T.holos_recommendation_rules.filter(r => r.catalog_id === cat.id && r.status === 'aprovado');
    const sel = P.selecionar({ sistemas, regras, concluidas });
    const r = { catalogo: { id: cat.id, code: cat.code, version: cat.version, content_hash: cat.content_hash, created_at: cat.created_at }, engine_version: 'PP-V1',
      holoscan_application_id: app.id, patient_id: app.patient_id, encounter_id: app.encounter_id || null, quando: app.quando,
      methodology_package_id: mp, methodology_content_hash: app.methodology_content_hash || null,
      systems_order: sel.systems_order, concluidas_no_atendimento: sel.concluidas_no_atendimento, selection: sel.selection, motivo: sel.motivo };
    return { data: copia(r), error: null };
  }
  function previa(uid, appId) {
    const r = calcular(uid, appId); if (r.error) return r;
    const reg = T.holos_next_steps.find(n => n.nutritionist_id === uid && n.holoscan_application_id === appId && n.catalog_id === r.data.catalogo.id);
    return { data: Object.assign(r.data, { registrado: !!reg, registro_id: reg ? reg.id : null, registrado_em: reg ? reg.created_at : null }), error: null };
  }
  function registrar(uid, appId) {
    if (statusConta(uid) !== 'ativo') return recusa('conta aguardando liberacao', 'conta_inativa', '42501');
    const r = calcular(uid, appId); if (r.error) return r;
    const c = r.data;
    const antes = T.holos_next_steps.find(n => n.nutritionist_id === uid && n.holoscan_application_id === appId && n.catalog_id === c.catalogo.id);
    if (antes) return { data: Object.assign(copia(antes.content_snapshot), { registrado: true, registro_id: antes.id, registrado_em: antes.created_at }), error: null };
    const hash = createHash('sha256').update(JSON.stringify(c)).digest('hex');
    const reg = { id: randomUUID(), nutritionist_id: uid, patient_id: c.patient_id, encounter_id: c.encounter_id, holoscan_application_id: appId, catalog_id: c.catalogo.id,
      catalog_code: c.catalogo.code, catalog_version: c.catalogo.version, catalog_hash: c.catalogo.content_hash, engine_version: c.engine_version,
      systems_order: copia(c.systems_order), selection: copia(c.selection), content_snapshot: copia(c), content_hash: hash, created_at: carimbo() };
    T.holos_next_steps.push(reg);
    return { data: Object.assign(copia(c), { registrado: true, registro_id: reg.id, registrado_em: reg.created_at }), error: null };
  }
  return {
    NOMES: ['proximos_passos_holos', 'registrar_proximos_passos'],
    rpc(uid, nome, args) {
      if (!uid) return recusa('sessao obrigatoria', null, '42501');
      const id = args && args.p_application_id;
      if (!id) return recusa('identificador invalido', 'payload_invalido', '22023');
      return nome === 'proximos_passos_holos' ? previa(uid, id) : registrar(uid, id);
    }
  };
}
