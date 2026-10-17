/* holohacking-mcp — NUCLEO (sem Deno, sem rede): o servidor MCP do HoloHacking.

   Substitui o "agente" (Holos IA por copiar e colar o Pacote num GPT e colar o JSON de volta): a nutricionista conecta o
   HoloHacking no assistente uma vez e pede "gere o Resultado da Marina". A IA busca o contexto aqui, escreve a analise no
   contrato HOLOS_AI_RESULT v1 (o MESMO do agente) ou escolhe foco e estrategias do Playbook, e o Resultado HOLOS e gravado
   na ficha, finalizado para a nutricionista revisar e emitir no app.

   Transporte: MCP Streamable HTTP (POST JSON-RPC 2.0, resposta application/json). tratarHttp() recebe o pedido HTTP ja
   lido e devolve { status, headers, corpo } — o index.ts (Deno) e os testes (Node) usam a MESMA funcao.

   Dependencias (injetadas; nada de rede aqui):
     identificar(chave)            -> { nutritionist_id, key_id } | null   (RPC mcp_identificar, so o servidor)
     comoNutri(uid, fn)            -> executa fn(q) numa transacao COMO a nutricionista (role authenticated + claims):
                                      q(sql, params) -> linhas. Mesmo RLS, mesmos gatilhos e RPCs do app.
     registrarUso(uid, key, ferramenta, patient, ok, erro)   (RPC mcp_registrar_uso; sem conteudo clinico)
     mod: { RD: ResultadoDirecao, C: HolosAIContrato, PB: PlaybookHolos, SF: SistemasFechamento }
     uuid(): string ; agora(): Date ; site: URL do app (texto das respostas)
   Seguranca: a chave nunca aparece em resposta nem em registro. Nada aqui emite o Resultado Final nem envia ao paciente. */

export const VERSAO = '1.0.0';
export const PROTOCOLOS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FERRAMENTAS_RESULTADO = ['oq3', 'linha_momentum', 'mapa_rotina_v1', 'pqq', 'mapa_crencas', 'gatilhos_respostas_v1', 'mapa', 'roda_vida', 'carta_futuro'];
const MODULO = { oq3: 'corpo', linha_momentum: 'corpo', mapa_rotina_v1: 'corpo', pqq: 'mente', mapa_crencas: 'mente', gatilhos_respostas_v1: 'mente', mapa: 'espirito', roda_vida: 'espirito', carta_futuro: 'espirito' };
const LISTAS_RELATO = ['momento', 'dores', 'desejos', 'avancos', 'permaneceu', 'acordos_compartilhados'];
const ORIGENS_RELATO = ['relato_paciente', 'acordo', 'resultado_anterior'];
/* o MESMO limite do Resultado automatico do app (resultado-holos.js): PDF da paciente de 2 a 4 paginas */
const LIMITE_PACIENTE = { momento: 2, dores: 3, desejos: 2, avancos: 3, permaneceu: 3, padroes: 3, direcionamentos: 3, estrategias: 4,
  corpo: 2, mente: 2, espirito: 2, acordos_compartilhados: 3, observar: 4 };

export const INSTRUCOES = [
  'HoloHacking — plataforma clínica da Nutrição Holística. Você atende SOMENTE a nutricionista dona desta conexão.',
  '"O sistema organiza. O método orienta. A IA sugere. A nutricionista interpreta e decide."',
  'Para gerar o Resultado HOLOS de um paciente: (1) buscar_pacientes pelo nome; (2) contexto_paciente; (3) escreva a análise no',
  'contrato HOLOS_AI_RESULT v1 (instrucoes_resultado traz o contrato completo e um exemplo) e chame gerar_resultado; OU, mais simples,',
  'escolha 1 foco e 2 a 4 estratégias do Playbook (vêm no contexto) e chame gerar_resultado_playbook.',
  'O Resultado fica gravado na ficha, finalizado; a nutricionista revisa e emite o PDF no app. Nada é enviado ao paciente por aqui.',
  'INEGOCIÁVEL: não diagnosticar (candidíase, disbiose, resistência à insulina, diabetes, tireoide, inflamação, pH, toxinas, função',
  'hepática/linfática, transtorno mental, "saúde espiritual"); não afirmar causalidade; não prescrever (alimentos, quantidades,',
  'suplementos, protocolos); não recalcular o HOLOSCAN; não inventar dados ("Sem dado"). Os sistemas são eixos do método, não doenças:',
  'nota menor = mais marcadores. Tudo é SUGERIDO até a nutricionista confirmar. Português do Brasil, direto, sem emojis.'
].join('\n');

/* ---------------------------------------------------------------- utilidades */
const tem = (x) => x !== null && x !== undefined && String(x).trim() !== '';
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
function sem(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
function iniciais(nome) { return String(nome || '').trim().split(/\s+/).filter(Boolean).map(p => p[0].toUpperCase() + '.').join(' ') || '—'; }
function idade(nasc, agora) {
  if (!nasc) return null;
  const iso = nasc instanceof Date ? nasc.getFullYear() + '-' + String(nasc.getMonth() + 1).padStart(2, '0') + '-' + String(nasc.getDate()).padStart(2, '0') : String(nasc).slice(0, 10);
  const d = new Date(iso + 'T12:00:00Z'); if (isNaN(d)) return null;
  let a = agora.getUTCFullYear() - d.getUTCFullYear(); const m = agora.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && agora.getUTCDate() < d.getUTCDate())) a--; return a >= 0 && a < 130 ? a : null;
}
const dia = (x) => (!x ? null : x instanceof Date ? x.toISOString().slice(0, 10) : String(x).slice(0, 10));
class ErroFerramenta extends Error { constructor(msg, codigo) { super(msg); this.codigo = codigo || 'erro'; } }

/* mensagens das recusas do servidor (hint do PostgreSQL) */
const HINTS = {
  holoscan_obrigatorio: 'Este paciente ainda não tem HOLOSCAN oficial salvo. Aplique e salve o HOLOSCAN no app primeiro.',
  foco_obrigatorio: 'Sem Foco atual confirmado o Resultado não fica pronto.',
  paciente_arquivado: 'O paciente está arquivado: reative-o no app para gerar o Resultado.',
  conta_nao_liberada: 'A conta ainda não foi liberada pela equipe HoloHacking.',
  holos_ai_json_invalido: 'O JSON não está no contrato HOLOS_AI_RESULT v1.',
  holos_ai_contrato: 'O JSON não está no contrato HOLOS_AI_RESULT v1.'
};
function mensagemPg(e) {
  const h = e && (e.hint || (e.cause && e.cause.hint));
  if (h && HINTS[h]) return HINTS[h];
  if (h) return 'O servidor recusou (' + h + '): ' + String(e.message || '').slice(0, 200);
  return 'Não foi possível concluir agora: ' + String((e && e.message) || e).slice(0, 200);
}

/* ---------------------------------------------------------------- leitura (sempre COMO a nutricionista) */
async function paciente(q, pid) {
  if (!UUID.test(String(pid || ''))) throw new ErroFerramenta('paciente_id inválido: use o id que buscar_pacientes devolveu.', 'paciente_id');
  const [p] = await q('select id, nome, nascimento, sexo, status from public.patients where id = $1', [pid]);
  if (!p) throw new ErroFerramenta('Paciente não encontrado nesta conta.', 'paciente_nao_encontrado');
  return p;
}
async function holoscansOficiais(q, pid) {
  return q("select id, encounter_id, quando, created_at, indice, triada from public.holoscan_applications where patient_id = $1 and methodology_package_id is not null order by created_at desc", [pid]);
}
async function atendimentos(q, pid) {
  return q('select id, occurred_at, weight_kg, height_cm from public.encounters where patient_id = $1 order by occurred_at desc', [pid]);
}
async function resultados(q, pid) {
  return q('select id, encounter_id, status, revision_number, supersedes_id, superseded_at, saved_at, created_at, direcao, content_snapshot is not null as tem_snapshot from public.holos_results where patient_id = $1 order by created_at desc', [pid]);
}
/* o atendimento do Resultado: o pedido; senao o do HOLOSCAN oficial mais recente; senao o mais recente (como o app) */
function escolherAtendimento(encs, hs, pedido) {
  if (pedido) { const e = encs.find(x => x.id === pedido); if (!e) throw new ErroFerramenta('Atendimento não encontrado para este paciente.', 'atendimento'); return e; }
  const h = hs.find(x => x.encounter_id); if (h) { const e = encs.find(x => x.id === h.encounter_id); if (e) return e; }
  return encs[0] || null;
}
async function vigente(q, tabela, eid) {
  const l = await q(`select * from public.${tabela} where encounter_id = $1 and superseded_at is null order by revision_number desc, created_at desc`, [eid]);
  return l.find(x => x.status === 'salvo' || x.status === 'revisado') || l.find(x => x.status === 'rascunho') || null;
}
async function anteriorDe(q, pid, eid, encs) {
  const atual = encs.find(e => e.id === eid), ref = atual ? String(atual.occurred_at instanceof Date ? atual.occurred_at.toISOString() : atual.occurred_at) : '';
  const l = await q("select id, encounter_id, saved_at, direcao, content_snapshot->'direcao_paciente' as direcao_paciente from public.holos_results where patient_id = $1 and status <> 'rascunho' and superseded_at is null and content_snapshot is not null and encounter_id is distinct from $2 order by saved_at desc nulls last", [pid, eid]);
  return l.find(r => { const e = encs.find(x => x.id === r.encounter_id); const oc = e ? String(e.occurred_at instanceof Date ? e.occurred_at.toISOString() : e.occurred_at) : null; return !ref || !oc || oc < ref; }) || null;
}

/* Monta TUDO o que o Resultado precisa (as mesmas fontes do caminho automatico do app) */
async function preparar(q, mod, pid, pedidoEid) {
  const { RD, SF } = mod;
  const p = await paciente(q, pid);
  if (p.status === 'inativo') throw new ErroFerramenta(HINTS.paciente_arquivado, 'paciente_arquivado');
  /* uma conexao por transacao: as consultas vao em sequencia */
  const encs = await atendimentos(q, pid), hs = await holoscansOficiais(q, pid), res = await resultados(q, pid);
  const e = escolherAtendimento(encs, hs, pedidoEid);
  if (!e) throw new ErroFerramenta('Este paciente ainda não tem atendimento. Inicie um atendimento no app.', 'sem_atendimento');
  const h = hs.find(x => x.encounter_id === e.id) || hs[0];
  if (!h) throw new ErroFerramenta(HINTS.holoscan_obrigatorio, 'holoscan_obrigatorio');
  const ferrs = await q("select id, ferramenta_id, status, concluida_em, respostas, resultado, leitura, prioridade, proximo_passo from public.tool_applications where encounter_id = $1 and status in ('concluida', 'revisada') order by concluida_em desc nulls last", [e.id]);
  const visto = {}, tools = [];
  FERRAMENTAS_RESULTADO.forEach(fid => { const t = ferrs.find(x => x.ferramenta_id === fid); if (t && !visto[fid]) { visto[fid] = 1; tools.push(t.id); } });
  const finais = res.filter(r => r.status !== 'rascunho' && r.encounter_id === e.id && !r.superseded_at && !res.some(x => x.supersedes_id === r.id));
  const an0 = await vigente(q, 'anamneses', e.id), cd = await vigente(q, 'conducts', e.id), ant = await anteriorDe(q, pid, e.id, encs);
  let an = an0 ? { id: an0.id, refTipo: null, content: an0.content } : null;
  if (!an) {
    const [cv] = await q("select id, form_tipo, submitted_content, submitted_at from public.anamnesis_invites where patient_id = $1 and submitted_content is not null order by submitted_at desc nulls last limit 1", [pid]);
    if (cv && cv.submitted_content && cv.submitted_content.formulario) an = { id: e.id, refTipo: 'atendimento', content: { tipo: cv.submitted_content.tipo || cv.form_tipo, formulario: cv.submitted_content.formulario }, convite: true };
  }
  const acordos = cd ? await q('select * from public.agreements where conduct_id = $1 order by position', [cd.id]) : [];
  let acordosAnt = [];
  if (ant && ant.encounter_id) { const cdA = await vigente(q, 'conducts', ant.encounter_id); if (cdA) acordosAnt = await q('select * from public.agreements where conduct_id = $1 order by position', [cdA.id]); }
  const tipo = (an && an.content && an.content.tipo === 'retorno') || ant ? 'retorno' : 'primeira';
  const form = { pid, encounter_id: e.id, holoscan_application_id: h.id, tools, supersedes_id: finais[0] ? finais[0].id : null };
  const payloadBase = { id: null, supersedes_id: form.supersedes_id, patient_id: pid, encounter_id: e.id, holoscan_application_id: h.id, tool_application_ids: tools.slice(),
    visao_paciente: { ferramentas: Object.fromEntries(tools.map(id => [id, { mostrar: false, ocultar: [] }])), proximos_passos: false },
    leitura_profissional: '', pontos_acompanhar: '', questoes_aprofundar: '', expected_updated_at: null };
  const [{ r: snap }] = await q('select public.previa_resultado_holos($1::jsonb) as r', [Object.assign({}, payloadBase, { direcao: null })]);
  const fechs = SF ? SF.deResultado(snap, (id) => id) : [];
  const sis = (snap && snap.holoscan && snap.holoscan.sistemas) || [];
  const prioridade = fechs.map((x, i) => ({ x, s: sis[i] })).filter(o => o.x && o.x.resultado && o.x.resultado.prioridade).sort((a, b) => a.x.resultado.posicao - b.x.resultado.posicao);
  const areas = prioridade.map(o => ({ nome: o.x.nome, dominantes: (o.s && o.s.dominantes) || [] }));
  const ctxSug = {
    tipo, anamnese: an ? { id: an.id, refTipo: an.refTipo, content: an.content } : null, conduta: cd, acordos, acordosAnteriores: acordosAnt,
    ferramentas: ((snap && snap.ferramentas) || []).map(t => ({ id: t.id, ferramenta_id: t.ferramenta_id, modulo: MODULO[t.ferramenta_id] || null, respostas: t.respostas || {}, proximo_passo: t.proximo_passo, prioridade: t.prioridade })),
    direcaoAtual: RD.normalizar(null, tipo), holoscan: h.id ? { id: h.id, areas } : null,
    anterior: ant && ant.direcao_paciente ? { id: ant.id, direcao_paciente: ant.direcao_paciente } : null
  };
  const momentum = ((snap && snap.ferramentas) || []).find(t => t.ferramenta_id === 'linha_momentum');
  return { p, e, h, snap, form, payloadBase, tipo, an, cd, acordos, ant, ctxSug, sis, prioridade, fechs,
    momentum: momentum && momentum.respostas ? momentum.respostas.estado_confirmado || momentum.respostas.estado || null : null };
}

/* ---------------------------------------------------------------- ferramentas MCP */
async function buscarPacientes(q, a) {
  const busca = sem(a.nome || a.busca || '');
  const l = await q("select p.id, p.nome, p.status, (select max(e.occurred_at) from public.encounters e where e.patient_id = p.id) as ultimo_atendimento, (select max(h.created_at) from public.holoscan_applications h where h.patient_id = p.id and h.methodology_package_id is not null) as ultimo_holoscan, (select count(*)::int from public.holos_results r where r.patient_id = p.id and r.status <> 'rascunho') as resultados from public.patients p order by p.nome limit 2000", []);
  const palavras = busca.split(/\s+/).filter(Boolean);
  const achados = l.filter(p => (a.incluir_arquivados || p.status !== 'inativo') && palavras.every(w => sem(p.nome).includes(w))).slice(0, 15);
  return { total: achados.length, pacientes: achados.map(p => ({ paciente_id: p.id, nome: p.nome, arquivado: p.status === 'inativo',
    ultimo_atendimento: dia(p.ultimo_atendimento), ultimo_holoscan: dia(p.ultimo_holoscan), resultados_salvos: p.resultados })),
    dica: achados.length > 1 ? 'Mais de um paciente: confirme com a nutricionista qual é antes de gerar.' : achados.length ? null : 'Nenhum paciente com esse nome nesta conta.' };
}

function textoMapeamento(an) {
  if (!an || !an.content) return null;
  const f = an.content.formulario || {}, out = {};
  Object.keys(f).forEach(sec => { const o = f[sec]; if (o && typeof o === 'object') { const v = {}; Object.keys(o).forEach(k => { if (Array.isArray(o[k]) ? o[k].length : tem(o[k])) v[k] = o[k]; }); if (Object.keys(v).length) out[sec] = v; } });
  return { tipo: an.content.tipo || null, origem: an.convite ? 'respostas originais do Mapeamento (link)' : 'Mapeamento/anamnese do atendimento', respostas: out };
}

async function contextoPaciente(q, mod, a, agora) {
  const { PB, RD } = mod;
  const x = await preparar(q, mod, a.paciente_id, a.atendimento_id || null);
  const snap = x.snap || {}, h = snap.holoscan || {};
  const prio = x.prioridade.map(o => o.x.sistema);
  const ferrIds = ((snap.ferramentas) || []).map(t => t.ferramenta_id);
  const op = PB.opcoes({ prioritarios: prio, ferramentas: ferrIds, momentum: x.momentum });
  const S = RD.sugestoes(x.ctxSug), relato = {};
  LISTAS_RELATO.forEach(k => { relato[k] = (S[k] || []).filter(it => it && ORIGENS_RELATO.includes(it.origem) && !RD.termosFora(it.texto).length).map(it => it.texto); });
  const anterior = x.ant && x.ant.direcao_paciente ? x.ant.direcao_paciente : null;
  return {
    paciente: { paciente_id: x.p.id, iniciais: iniciais(x.p.nome), idade: idade(x.p.nascimento, agora), sexo: x.p.sexo || null },
    atendimento: { atendimento_id: x.e.id, data: dia(x.e.occurred_at), tipo: x.tipo === 'retorno' ? 'retorno' : 'primeira_consulta',
      medidas: { peso_kg: num(x.e.weight_kg), altura_cm: num(x.e.height_cm) } },
    holoscan: { holoscan_id: x.h.id, data: dia(x.h.quando || x.h.created_at), indice: num(h.indice), triade: h.triada || null,
      sistemas: (h.sistemas || []).map(s => ({ sistema: s.sistema, nome: s.nome, nota: num(s.nota), faixa: s.faixa || null,
        sinais_que_mais_pontuaram: (s.dominantes || []).slice(0, 3).map(d => d.enunciado || d.rotulo || d.question_id) })),
      areas_prioritarias: x.prioridade.map(o => ({ posicao: o.x.resultado.posicao, sistema: o.x.sistema, nome: o.x.nome, nota: o.x.resultado.nota })),
      leitura: 'Nota menor = mais marcadores. Os sistemas são eixos do método, não doenças nem diagnóstico.' },
    ferramentas_aplicadas: ((snap.ferramentas) || []).map(t => ({ ferramenta: t.ferramenta_id, nome: PB.NOME_FERR[t.ferramenta_id] || t.ferramenta_id, respostas: t.respostas || {}, leitura: t.leitura || null, prioridade: t.prioridade || null, proximo_passo: t.proximo_passo || null })),
    mapeamento: textoMapeamento(x.an),
    conduta: x.cd ? { objetivo: x.cd.objective || null, estrategia: x.cd.nutrition_strategy || null, acoes: x.cd.actions || null, acordos: x.acordos.map(c => c.description) } : null,
    relato_para_o_resultado: relato,
    resultado_anterior: anterior ? { foco: anterior.foco_atual || null, estrategias: (anterior.estrategias || []).map(e => ({ texto: e.texto, acao: e.acao || null })), proxima_etapa: anterior.proxima_etapa || null } : null,
    linha_do_momentum: x.momentum ? { estado: x.momentum, orientacao: op.momentum } : null,
    playbook: { versao: op.versao, recomendado: '2 a 4 estratégias (máximo ' + PB.MAX_ESTRATEGIAS + ')',
      focos: op.focos.map(g => ({ area: g.nome, prioridade: g.prioridade, focos: g.focos.map(f => ({ foco_id: f.id, texto: f.texto, por_que: f.porque })) })),
      estrategias: op.estrategias.filter(e => e.grupo !== 'outro').map(e => ({ estrategia_id: e.id, titulo: e.titulo, territorio: e.territorio, sistema: e.sistema, tipo: PB.TIPO[e.tipo], acao: e.acao, quando: e.contexto, observar: e.observar,
        cuidado: e.cuidado || null, combina_com_ferramentas: e.combina })) },
    como_gerar: 'Opção A (análise completa): chame instrucoes_resultado, escreva o JSON HOLOS_AI_RESULT v1 e envie em gerar_resultado. Opção B (rápida): gerar_resultado_playbook com 1 foco_id e 2 a 4 estrategia_id desta lista.'
  };
}

/* Resultado AUTOMATICO a partir da analise (a mesma regra do app: resultado-holos.js gerarAutomatico) */
function direcaoAutomatica(mod, x, imp, itens) {
  const { RD, C } = mod;
  const d = RD.normalizar(null, imp.tipo === 'retorno' ? 'retorno' : x.tipo);
  const Ssis = RD.sugestoes(Object.assign({}, x.ctxSug, { direcaoAtual: d })), Srel = {};
  let nRel = 0;
  LISTAS_RELATO.forEach(k => {
    Srel[k] = (Ssis[k] || []).filter(it => it && ORIGENS_RELATO.includes(it.origem)).map(it => { nRel++; return Object.assign({}, it, { confirmado: true, mostrar_paciente: !RD.termosFora(it.texto).length, descartado: false }); });
  });
  RD.mesclar(d, Srel);
  const m = C.paraDirecao(imp, itens, { automatico: true });
  RD.mesclar(d, m.S);
  Object.keys(LIMITE_PACIENTE).forEach(k => {
    const l = k === 'corpo' || k === 'mente' || k === 'espirito' ? (d[k] || {}).itens : d[k]; let n = 0;
    (l || []).forEach(it => { if (it.mostrar_paciente && ++n > LIMITE_PACIENTE[k]) it.mostrar_paciente = false; });
  });
  if (m.foco) d.foco_atual = m.foco;
  if (m.proxima_etapa) d.proxima_etapa = m.proxima_etapa;
  return { d, m, nRel };
}

async function salvar(q, mod, x, d, leitura, uuid) {
  const payload = Object.assign({}, x.payloadBase, { leitura_profissional: leitura || '', direcao: mod.RD.paraGravar(d), operation_id: uuid() });
  const [{ r: id }] = await q('select public.salvar_resultado_holos($1::jsonb) as r', [payload]);
  const [row] = await q('select id, revision_number, status, saved_at from public.holos_results where id = $1', [id]);
  return row;
}

function resumoGravado(mod, d, row, x, site) {
  const dp = mod.RD.projecaoPaciente(d) || {};
  const txt = (it) => (it && (it.texto || it.titulo)) || null;
  return { gravado: true, resultado_id: row.id, versao: row.revision_number, status: row.status, substituiu_versao_anterior: !!x.form.supersedes_id,
    foco: txt(dp.foco_atual) || txt(d.foco_atual), direcionamentos: (dp.direcionamentos || []).map(txt).filter(Boolean),
    estrategias: (dp.estrategias || []).map(e => ({ texto: txt(e), acao: e.acao || null, quando: e.contexto || null, observar: e.observar || null })),
    proxima_etapa: txt(dp.proxima_etapa) || txt(d.proxima_etapa),
    proximo_passo: 'Resultado HOLOS gravado na ficha (aba Resultado HOLOS), finalizado. A nutricionista revisa e, na página Resultado, gera o Resultado Final (PDF e WhatsApp)' + (site ? ' em ' + site : '') + '. Nada foi enviado ao paciente.' };
}

async function gerarResultado(q, mod, a, dep) {
  const { C } = mod;
  const bruto = a.resultado === undefined ? a.resultado_json : a.resultado;
  if (bruto === undefined || bruto === null || bruto === '') throw new ErroFerramenta('Envie a análise em "resultado" (objeto JSON no contrato HOLOS_AI_RESULT v1).', 'sem_resultado');
  let obj = bruto;
  if (typeof bruto === 'string') {
    const x = C.extrairJson(bruto);   // aceita o texto inteiro ou o 1o bloco ```json``` (como o agente)
    if (!x || !x.json) throw new ErroFerramenta('Não encontrei um JSON válido em "resultado"' + (x && x.erro ? ': ' + x.erro : '') + '.', 'json_invalido');
    obj = x.json;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new ErroFerramenta('Não encontrei um JSON válido em "resultado".', 'json_invalido');
  const texto = JSON.stringify(obj);
  const v = C.validar(obj);
  if (v.erros && v.erros.length) {
    const err = new ErroFerramenta('A análise não está no contrato HOLOS_AI_RESULT v1. Corrija e chame gerar_resultado de novo.', 'contrato');
    err.detalhes = { erros: v.erros.slice(0, 40), avisos: (v.avisos || []).slice(0, 20) }; throw err;
  }
  const x = await preparar(q, mod, a.paciente_id, a.atendimento_id || null);
  let r;
  try { [{ r }] = await q('select public.importar_holos_ai($1::uuid, $2::text, $3::uuid) as r', [x.e.id, texto, dep.uuid()]); }
  catch (e) { throw new ErroFerramenta(mensagemPg(e), (e && e.hint) || 'importar'); }
  await q('select public.aceitar_importacao_holos_ai($1::uuid) as r', [r.id]);
  const [imp] = await q('select * from public.holos_ai_imports where id = $1', [r.id]);
  const itens = await q('select * from public.holos_ai_import_items where import_id = $1 order by secao, ordem', [r.id]);
  const { d, m, nRel } = direcaoAutomatica(mod, x, imp, itens);
  if (!mod.RD.focoConfirmado(d)) throw new ErroFerramenta('A análise não trouxe nenhum direcionamento: sem foco, o Resultado não fica pronto. Inclua pelo menos 1 direcionamento e envie de novo.', 'sem_foco');
  const leitura = m.leitura ? 'Síntese HOLOS AI via MCP (importação v' + imp.versao + ', aceite automático): ' + m.leitura : '';
  const row = await salvar(q, mod, x, d, leitura, dep.uuid);
  return Object.assign(resumoGravado(mod, d, row, x, dep.site), { importacao_versao: imp.versao, itens_do_relato: nRel, itens_so_profissional: (m.retidos || []).length,
    avisos: (v.avisos || []).slice(0, 10) });
}

async function gerarPlaybook(q, mod, a, dep) {
  const { PB, RD } = mod;
  const x = await preparar(q, mod, a.paciente_id, a.atendimento_id || null);
  const prio = x.prioridade.map(o => o.x.sistema), ferrIds = ((x.snap && x.snap.ferramentas) || []).map(t => t.ferramenta_id);
  const op = PB.opcoes({ prioritarios: prio, ferramentas: ferrIds });
  const focosValidos = [].concat(...op.focos.map(g => g.focos), ...op.focosOutros.map(g => g.focos)).map(f => f.id);
  if (!a.foco_id && !tem(a.foco_texto)) throw new ErroFerramenta('Escolha 1 foco: foco_id (dos focos do contexto) ou foco_texto.', 'foco');
  if (a.foco_id && !focosValidos.includes(a.foco_id)) throw new ErroFerramenta('foco_id desconhecido: use um foco_id de contexto_paciente.', 'foco');
  const ests = Array.isArray(a.estrategias) ? a.estrategias : [];
  if (!ests.length) throw new ErroFerramenta('Escolha de 2 a 4 estratégias (estrategia_id).', 'estrategias');
  if (ests.length > PB.MAX_ESTRATEGIAS) throw new ErroFerramenta('No máximo ' + PB.MAX_ESTRATEGIAS + ' estratégias (o recomendado é 2 a 4).', 'estrategias');
  const validas = op.estrategias.map(e => e.id);
  const escolhidas = ests.map(e => (typeof e === 'string' ? { id: e } : { id: e.estrategia_id || e.id, acao: e.acao, contexto: e.quando || e.contexto, observar: e.observar }));
  const ruins = escolhidas.filter(e => !validas.includes(e.id)).map(e => e.id);
  if (ruins.length) throw new ErroFerramenta('Estratégia(s) fora das opções deste paciente: ' + ruins.join(', ') + '. Use estrategia_id de contexto_paciente.', 'estrategias');
  const escolha = { foco: a.foco_id ? { id: a.foco_id } : { livre: String(a.foco_texto).trim() }, estrategias: escolhidas };
  if (Array.isArray(a.observar) && a.observar.length) escolha.observar = a.observar.filter(tem).map(String);
  if (tem(a.proxima_etapa)) escolha.proxima_etapa = String(a.proxima_etapa);
  const m = PB.montarDirecao(escolha);
  /* o relato do paciente (Mapeamento, acordos, Resultado anterior) entra como no assistente do app */
  const S = RD.sugestoes(x.ctxSug), rel = {};
  LISTAS_RELATO.forEach(k => { rel[k] = (S[k] || []).filter(it => it && ORIGENS_RELATO.includes(it.origem) && !RD.termosFora(it.texto).length).map(it => Object.assign({}, it, { confirmado: true, mostrar_paciente: true, descartado: false })); });
  const d = RD.normalizar(null, x.tipo);
  RD.mesclar(d, rel);
  d.foco_atual = m.foco_atual || null;
  d.direcionamentos = (m.direcionamentos || []).slice();
  d.estrategias = (m.estrategias || []).slice(0, PB.MAX_ESTRATEGIAS);
  ['corpo', 'mente', 'espirito'].forEach(t => { d[t].itens = (m[t] || []).slice(); });
  d.observar = (m.observar || []).slice();
  d.proxima_etapa = m.proxima_etapa || null;
  if (!RD.focoConfirmado(d)) throw new ErroFerramenta(HINTS.foco_obrigatorio, 'foco');
  const row = await salvar(q, mod, x, d, PB.resumo(escolha) + ' (via MCP)', dep.uuid);
  return Object.assign(resumoGravado(mod, d, row, x, dep.site), { playbook: PB.VERSAO, aviso: escolhidas.length > 4 ? 'Mais de 4 estratégias: o método recomenda 2 a 4, 5 ou mais só com motivo concreto.' : null });
}

async function resultadosPaciente(q, a) {
  await paciente(q, a.paciente_id);
  const l = await resultados(q, a.paciente_id);
  return { resultados: l.filter(r => r.status !== 'rascunho').map(r => ({ resultado_id: r.id, versao: r.revision_number, status: r.status, salvo_em: r.saved_at ? new Date(r.saved_at).toISOString() : null,
    vigente: !r.superseded_at && !l.some(x => x.supersedes_id === r.id), foco: r.direcao && r.direcao.foco_atual ? r.direcao.foco_atual.texto || null : null })) };
}

async function agenda(q, a, agora) {
  const d = tem(a.data) ? String(a.data).slice(0, 10) : agora.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new ErroFerramenta('data no formato AAAA-MM-DD.', 'data');
  const l = await q("select c.id, c.hora, c.duracao_min, c.tipo, p.id as paciente_id, p.nome from public.consultations c join public.patients p on p.id = c.patient_id where c.data = $1 and c.cancelled_at is null order by c.hora", [d]);
  return { data: d, consultas: l.map(c => ({ hora: c.hora ? String(c.hora).slice(0, 5) : null, duracao_min: c.duracao_min, tipo: c.tipo, paciente_id: c.paciente_id, nome: c.nome })) };
}

function estrategiasPlaybook(mod, a) {
  const { PB } = mod;
  const s = a.sistema ? String(a.sistema) : null;
  if (s && !PB.NOME_SISTEMA[s] && s !== 'geral') throw new ErroFerramenta('sistema: ' + Object.keys(PB.NOME_SISTEMA).concat('geral').join(', '), 'sistema');
  return { versao: PB.VERSAO, focos: PB.FOCOS.filter(f => !s || f.sistema === s).map(f => ({ foco_id: f.id, sistema: f.sistema, texto: f.texto, por_que: f.porque })),
    estrategias: PB.ESTRATEGIAS.filter(e => !s || e.sistema === s).map(e => ({ estrategia_id: e.id, sistema: e.sistema, territorio: e.territorio, titulo: e.titulo, tipo: PB.TIPO[e.tipo], nivel: e.nivel,
      acao: e.acao, quando: e.contexto, observar: e.observar, cuidado: e.cuidado || null, so_com_ferramenta: e.requer || null })) };
}

/* ---------------------------------------------------------------- catalogo das ferramentas */
const P = (props, req) => ({ type: 'object', properties: props, required: req || [], additionalProperties: false });
const ID = { type: 'string', description: 'paciente_id devolvido por buscar_pacientes' };
export const FERRAMENTAS = [
  { name: 'buscar_pacientes', title: 'Buscar paciente', description: 'Encontra pacientes desta nutricionista pelo nome (ou parte dele). Devolve paciente_id, último atendimento e último HOLOSCAN. Use antes de qualquer outra ferramenta.',
    inputSchema: P({ nome: { type: 'string', description: 'nome ou parte do nome; vazio lista todos' }, incluir_arquivados: { type: 'boolean' } }), annotations: { readOnlyHint: true } },
  { name: 'contexto_paciente', title: 'Contexto do paciente', description: 'O contexto do Resultado HOLOS (substitui o Pacote do agente): atendimento, tipo (primeira consulta/retorno), HOLOSCAN com as áreas prioritárias, ferramentas aplicadas, Mapeamento, Conduta, Resultado anterior e as opções do Playbook (focos e estratégias com ids). Só iniciais e idade: sem contatos.',
    inputSchema: P({ paciente_id: ID, atendimento_id: { type: 'string', description: 'opcional; padrão: o atendimento do HOLOSCAN mais recente' } }, ['paciente_id']), annotations: { readOnlyHint: true } },
  { name: 'instrucoes_resultado', title: 'Instruções e contrato do Resultado', description: 'As regras do método e o contrato JSON HOLOS_AI_RESULT v1 (com exemplo) para escrever a análise que gerar_resultado recebe.',
    inputSchema: P({}), annotations: { readOnlyHint: true } },
  { name: 'gerar_resultado', title: 'Gerar Resultado HOLOS (análise)', description: 'Grava o Resultado HOLOS a partir da análise escrita no contrato HOLOS_AI_RESULT v1 (o mesmo do agente HOLOS AI). O servidor valida; havendo erro, devolve a lista para corrigir. O Resultado fica finalizado na ficha para a nutricionista revisar e emitir. Não envia nada ao paciente.',
    inputSchema: P({ paciente_id: ID, atendimento_id: { type: 'string' }, resultado: { type: ['object', 'string'], description: 'objeto JSON HOLOS_AI_RESULT v1 (24 chaves); aceita também o texto com um bloco ```json```' } }, ['paciente_id', 'resultado']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
  { name: 'gerar_resultado_playbook', title: 'Gerar Resultado HOLOS (Playbook)', description: 'Caminho rápido: grava o Resultado HOLOS com 1 foco e 2 a 4 estratégias do Playbook HOLOS (ids de contexto_paciente). O relato do paciente (Mapeamento, acordos) entra junto. Não envia nada ao paciente.',
    inputSchema: P({ paciente_id: ID, atendimento_id: { type: 'string' }, foco_id: { type: 'string' }, foco_texto: { type: 'string', description: 'foco escrito pela nutricionista, se nenhum dos focos servir' },
      estrategias: { type: 'array', minItems: 1, maxItems: 6, items: { anyOf: [{ type: 'string' }, { type: 'object', properties: { estrategia_id: { type: 'string' }, acao: { type: 'string' }, quando: { type: 'string' }, observar: { type: 'string' } }, required: ['estrategia_id'] }] } },
      observar: { type: 'array', items: { type: 'string' } }, proxima_etapa: { type: 'string' } }, ['paciente_id', 'estrategias']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false } },
  { name: 'resultados_paciente', title: 'Resultados do paciente', description: 'As versões do Resultado HOLOS deste paciente (vigente, foco e data).',
    inputSchema: P({ paciente_id: ID }, ['paciente_id']), annotations: { readOnlyHint: true } },
  { name: 'agenda', title: 'Agenda do dia', description: 'Consultas marcadas num dia (padrão: hoje), com o paciente_id para preparar a consulta.',
    inputSchema: P({ data: { type: 'string', description: 'AAAA-MM-DD' } }), annotations: { readOnlyHint: true } },
  { name: 'estrategias_playbook', title: 'Playbook HOLOS', description: 'Consulta o Playbook HOLOS: focos e estratégias de um sistema (fungico, acido_inflamatorio, metabolico, detox_linfatico, mental_emocional_espiritual ou geral), com tipo, nível e cuidados.',
    inputSchema: P({ sistema: { type: 'string' } }), annotations: { readOnlyHint: true } }
];
export const PROMPTS = [{ name: 'gerar_resultado', title: 'Gerar o Resultado HOLOS', description: 'Gera o Resultado HOLOS de um paciente com os dados do HoloHacking.',
  arguments: [{ name: 'paciente', description: 'nome do paciente', required: true }] }];

/* ---------------------------------------------------------------- servidor */
export function criarServidor(dep) {
  const agora = () => (dep.agora ? dep.agora() : new Date());
  async function chamar(auth, nome, a) {
    a = a && typeof a === 'object' ? a : {};
    const f = FERRAMENTAS.find(x => x.name === nome);
    if (!f) return { erroProtocolo: { code: -32602, message: 'Ferramenta desconhecida: ' + nome } };
    if (nome === 'instrucoes_resultado') return { ok: { instrucoes: INSTRUCOES, contrato: dep.contrato || null, exemplo: dep.exemplo || null,
      lembretes: ['schema_version 1; exatamente as 24 chaves do contrato.', 'tipo: primeira_consulta ou retorno (o do contexto).', 'Direcionamentos e estratégias com status SUGERIDO; hipótese sempre so_profissional true.', 'rascunho_paciente simples, sem números do HOLOSCAN.'] } };
    if (nome === 'estrategias_playbook') { try { return { ok: estrategiasPlaybook(dep.mod, a) }; } catch (e) { return { falha: e }; } }
    const pid = UUID.test(String(a.paciente_id || '')) ? a.paciente_id : null;
    try {
      const r = await dep.comoNutri(auth.nutritionist_id, (q) => {
        if (nome === 'buscar_pacientes') return buscarPacientes(q, a);
        if (nome === 'contexto_paciente') return contextoPaciente(q, dep.mod, a, agora());
        if (nome === 'gerar_resultado') return gerarResultado(q, dep.mod, a, dep);
        if (nome === 'gerar_resultado_playbook') return gerarPlaybook(q, dep.mod, a, dep);
        if (nome === 'resultados_paciente') return resultadosPaciente(q, a);
        if (nome === 'agenda') return agenda(q, a, agora());
        throw new ErroFerramenta('não implementada');
      });
      await uso(auth, nome, pid, true, null);
      return { ok: r };
    } catch (e) {
      await uso(auth, nome, pid, false, e instanceof ErroFerramenta ? e.codigo : ((e && e.hint) || 'erro'));
      return { falha: e };
    }
  }
  async function uso(auth, nome, pid, ok, erro) { try { if (dep.registrarUso) await dep.registrarUso(auth.nutritionist_id, auth.key_id, nome, pid, ok, erro); } catch (e) { /* o registro nunca derruba a resposta */ } }

  function conteudo(r) {
    if (r.ok !== undefined) return { content: [{ type: 'text', text: JSON.stringify(r.ok, null, 2) }], structuredContent: r.ok, isError: false };
    const e = r.falha, msg = e instanceof ErroFerramenta ? e.message : mensagemPg(e);
    const corpo = { erro: e instanceof ErroFerramenta ? e.codigo : 'servidor', mensagem: msg }; if (e && e.detalhes) corpo.detalhes = e.detalhes;
    return { content: [{ type: 'text', text: JSON.stringify(corpo, null, 2) }], structuredContent: corpo, isError: true };
  }

  async function mensagem(auth, m) {
    const resp = (result) => ({ jsonrpc: '2.0', id: m.id, result });
    const erro = (code, message) => ({ jsonrpc: '2.0', id: m && m.id !== undefined ? m.id : null, error: { code, message } });
    if (!m || m.jsonrpc !== '2.0' || typeof m.method !== 'string') return erro(-32600, 'Pedido inválido');
    const notificacao = m.id === undefined || m.id === null;
    if (notificacao) return null;   // notifications/initialized, cancelled, ...: sem resposta
    switch (m.method) {
      case 'initialize': {
        const pedida = m.params && m.params.protocolVersion;
        return resp({ protocolVersion: PROTOCOLOS.includes(pedida) ? pedida : PROTOCOLOS[0], capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } },
          serverInfo: { name: 'holohacking', title: 'HoloHacking', version: VERSAO }, instructions: INSTRUCOES });
      }
      case 'ping': return resp({});
      case 'tools/list': return resp({ tools: FERRAMENTAS });
      case 'prompts/list': return resp({ prompts: PROMPTS });
      case 'prompts/get': {
        const nomeP = m.params && m.params.name, arg = (m.params && m.params.arguments) || {};
        if (nomeP !== 'gerar_resultado') return erro(-32602, 'Prompt desconhecido');
        return resp({ description: PROMPTS[0].description, messages: [{ role: 'user', content: { type: 'text', text:
          'Gere o Resultado HOLOS de ' + (arg.paciente || 'o paciente') + ' no HoloHacking: busque o paciente, leia o contexto, escreva a análise no contrato HOLOS_AI_RESULT v1 seguindo as instruções do método e grave com gerar_resultado. Depois me mostre o foco e as estratégias gravadas.' } }] });
      }
      case 'resources/list': return resp({ resources: [] });
      case 'tools/call': {
        const nome = m.params && m.params.name;
        if (typeof nome !== 'string') return erro(-32602, 'name obrigatório');
        const r = await chamar(auth, nome, m.params.arguments);
        if (r.erroProtocolo) return { jsonrpc: '2.0', id: m.id, error: r.erroProtocolo };
        return resp(conteudo(r));
      }
      default: return erro(-32601, 'Método não suportado: ' + m.method);
    }
  }

  /* pedido HTTP -> resposta. chave: do caminho (/holohacking-mcp/<chave>) ou Authorization: Bearer <chave> */
  async function tratarHttp({ metodo, caminho, headers, corpo }) {
    const h = {};
    Object.keys(headers || {}).forEach(k => { h[k.toLowerCase()] = headers[k]; });
    const base = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, mcp-session-id, mcp-protocol-version', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE', 'Cache-Control': 'no-store' };
    const json = (status, obj) => ({ status, headers: Object.assign({ 'Content-Type': 'application/json' }, base), corpo: obj === null ? '' : JSON.stringify(obj) });
    if (metodo === 'OPTIONS') return { status: 204, headers: base, corpo: '' };
    if (metodo === 'GET' || metodo === 'DELETE') return { status: 405, headers: Object.assign({ Allow: 'POST' }, base), corpo: '' };
    if (metodo !== 'POST') return { status: 405, headers: base, corpo: '' };
    const seg = String(caminho || '').split('/').filter(Boolean);
    const doCaminho = seg.find(s => /^hh_mcp_/.test(s)) || null;
    const doHeader = String(h.authorization || '').replace(/^Bearer\s+/i, '').trim();
    const chave = doCaminho || (/^hh_mcp_/.test(doHeader) ? doHeader : null);
    const negado = { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Chave do HoloHacking inválida, revogada ou conta não liberada. Gere uma nova chave no Perfil do app.' } };
    let auth = null;
    try { auth = chave ? await dep.identificar(chave) : null; } catch (e) { auth = null; }
    if (!auth || !auth.nutritionist_id) return json(401, negado);
    let msg;
    try { msg = typeof corpo === 'string' ? JSON.parse(corpo) : corpo; } catch (e) { return json(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON inválido' } }); }
    if (Array.isArray(msg)) {
      if (!msg.length) return json(400, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Lote vazio' } });
      const rs = [];
      for (const m of msg) { const r = await mensagem(auth, m); if (r) rs.push(r); }   // em sequencia: uma transacao por vez
      return rs.length ? json(200, rs) : { status: 202, headers: base, corpo: '' };
    }
    const r = await mensagem(auth, msg);
    return r ? json(200, r) : { status: 202, headers: base, corpo: '' };
  }
  return { tratarHttp, mensagem };
}
