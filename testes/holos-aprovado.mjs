/**
 * Fixture de teste: grava o HOLOS-V1 candidato (inventario + decisoes V1, o mesmo conteudo do HOLOS-V1@2 real)
 * no Supabase falso e o APROVA pelo caminho real (registrar_aprovacao_metodologica + aprovar_pacote_metodologico,
 * aprovador unico Daniel). Nada e aprovado "por fora": o pacote passa pelo validador e pelas mesmas RPCs.
 *
 * Uso: const pk = semearHolosAprovado(srv, UA, { effective_from: '2026-01-01' });
 * Correcao P0 (pos-deploy 6.4): com o HOLOSCAN calculado SO pelo motor oficial, todo teste que aplica o
 * questionario precisa de um pacote aprovado e vigente — como em producao.
 */
import { readFileSync } from 'node:fs';
import '../metodologia-pacote.js';
import '../metodologia-decisoes-v1.js';

export function candidatoV1() {
  const P = globalThis.PacoteMetodologico, D = globalThis.MetodologiaDecisoesV1;
  const inv = JSON.parse(readFileSync(new URL('../docs/v1/metodologia/inventario-metodologico-v1.json', import.meta.url), 'utf8'));
  return P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
}

export function semearHolosAprovado(srv, uid, opts) {
  opts = opts || {};
  const version = opts.version || 2;
  const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
  const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
  if (!srv.linhas('methodology_approvers').some(a => a.user_id === uid && a.scope === 'holoscan' && a.approval_stage === 1 && a.active !== false)) {
    srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: uid, scope: 'holoscan', approval_stage: 1, display_name: 'Daniel' });
  }
  const c = candidatoV1();
  const pk = q('methodology_packages', 'insert', { dados: { code: c.code, version, status: 'em_revisao', origin: c.origin, justification: c.justification, notes: c.notes, lineage: c.lineage, content_hash: c.content_hash } }).data[0];
  const ed = q('methodology_questionnaire_editions', 'insert', { dados: Object.assign({}, c.edicao, { package_id: pk.id }) }).data[0];
  const ins = (t, l) => { if (l.length) { const r = q(t, 'insert', { dados: l.map(x => Object.assign({}, x, { package_id: pk.id })) }); if (r.error) throw new Error(t + ': ' + r.error.message); } };
  ins('methodology_scales', c.escalas); ins('methodology_systems', c.sistemas); ins('methodology_questions', c.perguntas.map(x => Object.assign({}, x, { edition_id: ed.id })));
  ins('methodology_associations', c.associacoes); ins('methodology_ranges', c.faixas); ins('methodology_rules', c.regras);
  if (opts.aprovar === false) return srv.linhas('methodology_packages').find(x => x.id === pk.id);
  const h = rpc('metodologia_hash_conteudo', { p_package_id: pk.id }).data;
  let r = rpc('registrar_aprovacao_metodologica', { p_package_id: pk.id, p_etapa: 1, p_responsavel: 'Daniel', p_justificativa: 'conferido (fixture de teste)', p_content_hash: h });
  if (r.error) throw new Error('aprovacao: ' + r.error.message);
  r = rpc('aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: { effective_from: opts.effective_from || '2026-01-01' } });
  if (r.error) throw new Error('homologacao: ' + r.error.message);
  return srv.linhas('methodology_packages').find(x => x.id === pk.id);
}

/**
 * Payload OFICIAL valido para salvar_holoscan_completo sobre o pacote pkId (como HoloscanOficial.payload o monta):
 * todas as perguntas respondidas com min+1, uma nota por sistema, respondidos/total pelos vinculos PRIMARIOS,
 * faixa do pacote. Notas ficticias (o servidor nao refaz a conta clinica). `app` traz patient_id, encounter_id, quando.
 */
export function payloadOficial(srv, pkId, app) {
  const pk = srv.linhas('methodology_packages').find(x => x.id === pkId);
  const de = (t) => srv.linhas(t).filter(l => l.package_id === pkId);
  const esc = de('methodology_scales'), perg = de('methodology_questions'), prim = de('methodology_associations').filter(a => a.destination_type === 'system' && a.role === 'primaria');
  const fx = (c) => de('methodology_ranges').filter(f => f.destination_type === 'system' && f.destination_id === c);
  const faixa = (c) => ((fx(c).find(f => f.label === 'intermediaria') || fx(c)[0]) || {}).label || 'intermediaria';
  return {
    application: Object.assign({ versao_estrutura: 3, indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5,
      triada: { fisico: 5, mental: 5, espiritual: 5 }, triada_com_dado: { fisico: true, mental: true, espiritual: true },
      cobertura: { respondidos: perg.length, total: perg.length }, combinacoes: [], aprofundamentos: [],
      methodology_package_id: pk.id, methodology_package_version: pk.version, methodology_content_hash: pk.content_hash,
      engine_version: 'motor-generico-2.0.0', engine_contract_version: 'holoscan-motor-contrato-v1', calculation_mode: 'oficial' }, app || {}),
    answers: perg.map(q => ({ marcador_id: q.stable_id, valor: esc.find(e => e.code === q.scale_code).min_value + 1 })),
    scores: de('methodology_systems').map(y => {
      const n = prim.filter(a => a.destination_id === y.code).length;
      return { sistema: y.code, nome: y.name, nota: 5, carga: 5, faixa: faixa(y.code), obtido: 1, maximo: 2, respondidos: n, total_marcadores: n, avaliavel: true };
    })
  };
}

/**
 * Aplicacao HISTORICA (anterior a correcao P0 / ao pacote V1): entra como o banco real ja a tem — sem proveniencia, gravada
 * pelo motor legado. Nao passa pela RPC (que agora so aceita aplicacao oficial): e estado pre-existente, como uma migration
 * o deixaria. Devolve o id.
 */
export function semearHistorica(srv, uid, dados) {
  const agora = new Date().toISOString();
  const id = dados.id || globalThis.crypto.randomUUID();
  srv.tabelas.holoscan_applications.push(Object.assign({ id, nutritionist_id: uid, patient_id: null, encounter_id: null, quando: agora.slice(0, 10), versao_estrutura: 2, versao_bancos: null,
    indice: 50, indice_maximo: 100, avaliavel: true, nota_media: 5, triada: {}, triada_com_dado: {}, cobertura: {}, combinacoes: [], aprofundamentos: [],
    interpretacao_texto: null, interpretacao_em: null, interpretacao_versao: null, created_at: agora, updated_at: agora,
    methodology_package_id: null, methodology_package_version: null, methodology_content_hash: null, engine_version: null, engine_contract_version: null, calculation_mode: null },
    dados.application || {}, { id }));
  (dados.answers || []).forEach(a => srv.tabelas.holoscan_answers.push({ id: globalThis.crypto.randomUUID(), application_id: id, marcador_id: a.marcador_id, valor: a.valor, created_at: agora }));
  (dados.scores || []).forEach(s => srv.tabelas.holoscan_system_scores.push(Object.assign({ id: globalThis.crypto.randomUUID(), application_id: id, created_at: agora }, s)));
  return id;
}
