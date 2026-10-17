/**
 * Fixture FICTICIA do Resultado HOLOS template 5 (direcionamento + estrategias + acompanhamento), no servidor falso:
 * HOLOS-V1 v6 aprovado; paciente "Marina Ficticia"; 1a consulta ha 21 dias (Mapeamento/anamnese V2 de primeira consulta,
 * HOLOSCAN do caso C do comparativo v5 x v6 — Metabolico como 1a area —, Mapa da Rotina, Linha do Momentum, PQQ, OQ3,
 * Conduta com objetivo/estrategia/acoes/monitoramento/retorno e 2 acordos). retorno() acrescenta o 2o atendimento (hoje),
 * anamnese de retorno, Conduta nova com acordos e um acordo anterior concluido. Nenhum dado real.
 */
import { semearHolosAprovado } from './holos-aprovado.mjs';

export async function montarFixture(srv, UA, opts = {}) {
  globalThis.window = globalThis.window || globalThis;
  const { construir } = await import('../scripts/pacote-v6.mjs');
  const { CASOS, respostas: respCaso } = await import('../scripts/comparar-v5-v6.mjs');
  const { v6 } = construir();
  const pacote = Object.assign(JSON.parse(JSON.stringify(v6)), { status: 'aprovado' });
  const pk = semearHolosAprovado(srv, UA, { pacote, version: 6, effective_from: '2026-01-01' });
  const q = (tabela, acao, extra) => srv.tratar({ op: 'query', uid: UA, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
  const rpc = (nome, args) => srv.tratar({ op: 'rpc', uid: UA, nome, args });
  const ins = (t, d) => { const r = q(t, 'insert', { dados: d }); if (r.error) throw new Error(t + ': ' + r.error.message); return r.data[0]; };

  const caso = CASOS.find(c => c.id === 'C');
  const tema = [...caso.tema, 'SNT-505', 'EMO-301', 'EMO-303', 'SNT-502', 'EMO-501'];
  const respostas = respCaso(pacote, tema);
  const ori = Object.fromEntries(pacote.perguntas.map(p => [p.stable_id, p.orientation]));
  const carga = { 'SNT-301': 2, 'SNT-303': 2, 'SNT-304': 1, 'SNT-307': 2, 'SNT-501': 2, 'SNT-507': 1, 'ESP-303': 3, 'SNT-305': 2, 'SNT-308': 1, 'EMO-504': 1, 'SNT-505': 2, 'EMO-301': 1, 'EMO-303': 2, 'SNT-502': 2, 'EMO-501': 1 };
  tema.forEach(id => { if (carga[id] !== undefined) respostas[id] = ori[id] === 'invertida' ? 3 - carga[id] : carga[id]; });
  pacote.perguntas.forEach(p => { if (!caso.tema.includes(p.stable_id)) { const h = [...p.stable_id].reduce((a, c) => a + c.charCodeAt(0), 0); if (h % 5 === 0) respostas[p.stable_id] = p.orientation === 'invertida' ? 2 : 1; } });
  /* desenho do caso (ficticio, so as RESPOSTAS; a matematica e o pacote nao mudam): Metabolico como area principal,
     Detox + Linfatico como segunda area, Acido-Inflamatorio sem carga (nota 10) */
  const primarias = (sis) => pacote.associacoes.filter(x => x.destination_type === 'system' && x.destination_id === sis && x.role === 'primaria').map(x => x.question_stable_id);
  const carga0 = (id) => { respostas[id] = ori[id] === 'invertida' ? 3 : 0; };
  const comCarga = (id, c) => { respostas[id] = ori[id] === 'invertida' ? 3 - c : c; };
  const metab = primarias('metabolico');
  primarias('acido_inflamatorio').filter(id => !metab.includes(id)).forEach(carga0);
  primarias('detox_linfatico').filter(id => !metab.includes(id)).forEach((id, i) => comCarga(id, i < 2 ? 2 : i < 4 ? 1 : 0));
  const m = globalThis.MotorMetodologico.calcular({ methodology_package: pacote, mode: 'homologacao', responses: respostas });
  const pkRow = srv.linhas('methodology_packages').find(x => x.id === pk.id);
  const nomes = {}; srv.linhas('methodology_systems').filter(s => s.package_id === pk.id).forEach(s => { nomes[s.code] = s.name; });

  const dia = 86400000;
  const t1 = new Date(Date.now() - 21 * dia).toISOString();
  const PA = ins('patients', { nome: opts.nome || 'Marina Ficticia', telefone: '62900000000' }).id;
  const E1 = ins('encounters', { patient_id: PA, occurred_at: t1, timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
  const FORM = {
      motivo: { motivo: 'Cansaço no fim da tarde e fome forte à noite', objetivo: 'Ter mais disposição à tarde', mudar_primeiro: 'O lanche da tarde', ajudou: 'Levar marmita nos dias de escritório' },
      alimentar: { dificuldade: 'Belisco quando chego em casa', maior_fome: ['Tarde', 'Noite'], dificuldades: ['Falta de tempo', 'Comer à noite'] },
      saude: { sinal_principal: 'Fome muito intensa ou difícil de controlar' } };
  /* opts.mapeamentoRecebido (auditoria Cowork 14/10): o Mapeamento foi RECEBIDO e REVISADO, mas nunca levado ao atendimento
     (nenhuma anamnese) — o caso que deixava o Pacote Holos IA com "Sem dado" */
  if (opts.mapeamentoRecebido) {
    const t0 = new Date(Date.now() - 22 * dia).toISOString();
    srv.tabelas.anamnesis_invites.push({ id: 'conv-' + PA, nutritionist_id: UA, patient_id: PA, encounter_id: null, status: 'concluido', form_version: 2, form_tipo: 'primeira',
      expires_at: new Date(Date.now() + dia).toISOString(), draft_content: null, submitted_content: { tipo: 'primeira', formulario: FORM }, save_count: 1, professional_snapshot: null,
      imported_anamnesis_id: null, imported_at: null, created_at: t0, started_at: t0, last_saved_at: t0, submitted_at: t0, revoked_at: null, sent_at: t0, sent_via: 'whatsapp', reviewed_at: t0 });
  } else ins('anamneses', { patient_id: PA, encounter_id: E1, revision_number: 1, status: 'salvo', content_version: 2,
    content: { formulario_versao: 2, tipo: 'primeira', meta: {}, dominios: {}, formulario: FORM } });
  const tri = m.triad_result;
  const payload = { application: { patient_id: PA, encounter_id: E1, quando: t1.slice(0, 10), versao_estrutura: 3, indice: m.index_result.valor, indice_maximo: 100, avaliavel: true,
      nota_media: m.index_result.valor / 10, triada: { fisico: tri.fisico.nota, mental: tri.mental.nota, espiritual: tri.espiritual.nota }, triada_com_dado: { fisico: true, mental: true, espiritual: true },
      cobertura: { respondidos: m.coverage.respondidos, total: m.coverage.total }, combinacoes: [], aprofundamentos: [],
      methodology_package_id: pkRow.id, methodology_package_version: pkRow.version, methodology_content_hash: pkRow.content_hash,
      engine_version: m.engine_version, engine_contract_version: m.engine_contract_version, calculation_mode: 'oficial' },
    answers: Object.keys(respostas).map(k => ({ marcador_id: k, valor: respostas[k] })),
    scores: Object.keys(m.system_results).map(k => { const s = m.system_results[k]; return { sistema: k, nome: nomes[k] || k, nota: s.nota, carga: s.carga, faixa: s.faixa, obtido: null, maximo: null, respondidos: s.respondidos, total_marcadores: s.total, avaliavel: s.avaliavel }; }) };
  const H = rpc('salvar_holoscan_completo', { payload }); if (H.error) throw new Error('holoscan: ' + H.error.message);
  rpc('registrar_proximos_passos', { p_application_id: H.data });
  const tool = (id, r, extra) => ins('tool_applications', Object.assign({ patient_id: PA, encounter_id: E1, ferramenta_id: id, versao_ferramenta: '1', status: 'concluida', respostas: r, iniciada_em: t1, concluida_em: t1 }, extra || {})).id;
  const T = {
    rotina: tool('mapa_rotina_v1', { acorda: '06:30', dorme: '23:30', sono: 'Acorda cansada', trabalho: 'Escritório, 9h às 18h', dificuldade: 'Fim da tarde: fome forte e cansaço',
      disponiveis: 'Manhã cedo e almoço', espacos: 'Preparar o lanche da tarde na noite anterior' },
      { status: 'revisada', leitura: 'O fim da tarde concentra fome forte e cansaço.', prioridade: 'Lanche da tarde', proximo_passo: 'Testar um lanche planejado às 16h' }),
    momentum: tool('linha_momentum', { energia: 4, carga: 8, controle: 4, suporte: 6, espaco_mental: 4, estabilidade: 6, sustenta: 'Gosta de cozinhar no fim de semana', limita: 'Jornada longa', nao_pedir: 'Mudanças grandes no jantar agora', estado: 'Reorganizar' }),
    pqq: tool('pqq', { objetivo: 'ter mais disposição à tarde', r1: 'para render melhor no trabalho', r2: 'para chegar em casa com energia', verdadeiro: 'sentir que dou conta da minha rotina' }),
    oq3: tool('oq3', { quer: 'chegar à noite com menos fome', precisa: 'comer melhor à tarde', consegue: 'levar um lanche pronto de casa' })
  };
  const C1 = ins('conducts', { patient_id: PA, encounter_id: E1, status: 'salvo', revision_number: 1, objective: 'Organizar o fim da tarde, que concentra fome forte e cansaço',
    nutrition_strategy: 'Começar por um lanche planejado antes da fome forte, sem mexer no resto da rotina nesta etapa',
    actions: 'Preparar o lanche da tarde na noite anterior\nAnotar fome e energia às 16h',
    resources: 'Lista de opções de lanche combinada na consulta', monitoring: 'Fome e energia às 16h\nComo fica o jantar nos dias em que o lanche acontece',
    return_plan: 'Retorno em 3 semanas para revisar o fim da tarde' }).id;
  const A1 = ins('agreements', { patient_id: PA, conduct_id: C1, description: 'Preparar o lanche da tarde na noite anterior', due_text: 'dias de trabalho', status: 'acordado', position: 1 }).id;
  const A2 = ins('agreements', { patient_id: PA, conduct_id: C1, description: 'Anotar fome e energia às 16h', due_text: 'até o retorno', status: 'acordado', position: 2 }).id;
  const fx = { pk, PA, E1, H: H.data, T, C1, A1, A2, notas: Object.fromEntries(Object.keys(m.system_results).map(k => [k, m.system_results[k].nota_exibicao])), q, rpc, ins };

  /* 2o atendimento (retorno, hoje): anamnese de retorno, Conduta nova, um acordo anterior concluido */
  fx.retorno = () => {
    const t2 = new Date(Date.now() - 3600000).toISOString();
    const E2 = ins('encounters', { patient_id: PA, occurred_at: t2, timezone: 'America/Sao_Paulo', type: 'consulta', modality: 'presencial' }).id;
    ins('anamneses', { patient_id: PA, encounter_id: E2, revision_number: 1, status: 'salvo', content_version: 2,
      content: { formulario_versao: 2, tipo: 'retorno', meta: {}, dominios: {}, formulario: { retorno: {
        melhorou: 'Chego em casa com menos fome nos dias em que levo o lanche', praticou: 'Levei o lanche em 3 dos 5 dias de trabalho',
        nao_praticou: 'Anotar a fome todos os dias', dificultou: 'Reuniões no fim da tarde', praticou_nivel: 'Boa parte' } } } });
    const ua = q('agreements', 'update', { dados: { status: 'concluido' }, filtros: [{ col: 'id', op: 'eq', val: A1 }] });
    if (ua.error) console.log('acordo concluido:', ua.error.message);
    const C2 = ins('conducts', { patient_id: PA, encounter_id: E2, status: 'salvo', revision_number: 1, objective: 'Manter o lanche da tarde e cuidar do jantar nos dias de reunião',
      nutrition_strategy: 'Manter o que funcionou e preparar uma alternativa para os dias de reunião',
      actions: 'Deixar um lanche de reserva na bolsa', monitoring: 'Fome à noite nos dias de reunião', return_plan: 'Retorno em 4 semanas' }).id;
    const A3 = ins('agreements', { patient_id: PA, conduct_id: C2, description: 'Deixar um lanche de reserva na bolsa', due_text: 'dias de reunião', status: 'acordado', position: 1 }).id;
    Object.assign(fx, { E2, C2, A3 });
    return fx;
  };
  return fx;
}

/* Testes anteriores ao template 5 que salvam Resultado HOLOS pela RPC: finalizar agora exige o Foco atual confirmado.
   comFoco(args) acrescenta uma direcao minima (so o foco, escrito e confirmado pela nutricionista) quando o payload nao tem. */
export const FOCO_FICTICIO = 'Foco ficticio de teste';
export function comFoco(args) {
  const a = Object.assign({}, args);
  a.payload = Object.assign({}, a.payload);
  if (!a.payload.direcao) a.payload.direcao = { schema_version: 1, tipo: 'primeira',
    foco_atual: { texto: FOCO_FICTICIO, origem: 'nutricionista', sugestao: false, confirmado: true, mostrar_paciente: true } };
  return a;
}

/* Resultado HISTORICO no formato anterior (template 4), como os que ja existem em producao: os testes do desenho dos
   templates 1-4 continuam cobrindo esse desenho (que nao mudou). Tira do snapshot so o que o template 5 acrescentou. */
export function comoTemplate4(srv, id) {
  const r = srv.tabelas.holos_results.find(x => x.id === id);
  if (!r || !r.content_snapshot) return r;
  r.template_version = 4; r.direcao = null;
  const s = r.content_snapshot; s.template_version = 4; delete s.direcao; delete s.direcao_paciente; delete s.caminho;
  return r;
}
