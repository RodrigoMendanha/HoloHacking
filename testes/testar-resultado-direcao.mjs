/**
 * RESULTADO HOLOS TEMPLATE 5 — direcionamento + estrategias + acompanhamento da evolucao (migration 20261021100000),
 * servidor falso + tela. Fixture FICTICIA v6 (testes/fixture-direcao.mjs). Os 18 testes obrigatorios da aprovacao:
 *   T01 rascunho salva sem foco            T02 emissao recusa sem foco             T03 foco confirmado permite emissao
 *   T04 sugestao nao confirmada fora       T05 sugestao confirmada aparece         T06 hipotese nunca para a paciente
 *   T07 padrao confirmado pode aparecer    T08 territorio vazio "Ainda nao..."     T09 Conduta alimenta acordos compartilhaveis
 *   T10 retorno le o resultado anterior    T11 historico inalterado                T12 templates 1-4 intactos
 *   T13 template 5 imutavel apos emissao   T14 PDF                                 T15 WhatsApp
 *   T16 linguagem proibida                 T17 origem/ref preservados              T18 nenhuma acao inventada
 * Ajuste final (13/10): C01–C04 compatibilidade 1–4 (RF-2), D01 direcionamentos, E01 estrategias, S01–S05 cinco sistemas,
 * R01–R12 acompanhamento das estrategias no retorno, W01/P01 WhatsApp e documento emitido.
 * SHOT_DIR=<pasta> grava capturas.
 */
import './guarda-falhas.mjs';
import puppeteer from 'puppeteer-core';
import { criarServidor, ligarPagina } from './supabase-falso.mjs';
import { montarFixture } from './fixture-direcao.mjs';

globalThis.window = globalThis.window || globalThis;
await import('../resultado-direcao.js');
const RD = globalThis.ResultadoDirecao;
let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const SHOT = process.env.SHOT_DIR || null;
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'senha-a-123');
srv.criarConta('b@holo.test', 'senha-b-123');
srv.tabelas.profiles.push({ id: UA, nome: 'Nutri Ficticia', registro: 'CRN-0 0000', profissao: 'Nutricionista', status: 'ativo', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
const fx = await montarFixture(srv, UA);
const { rpc, PA, E1, H, C1, A1 } = fx;
const base = { patient_id: PA, encounter_id: E1, holoscan_application_id: fx.H, tool_application_ids: [], visao_paciente: { ferramentas: {}, proximos_passos: false } };
const item = (texto, origem, ref, sugestao, confirmado, mostrar, extra) => JSON.parse(JSON.stringify(Object.assign({ texto, origem, ref: ref || undefined, texto_sugerido: sugestao ? texto : undefined,
  sugestao, confirmado, mostrar_paciente: mostrar }, extra || {})));
const ref = (tipo, id, campo) => ({ tipo, id, campo });
const PROIBIDAS = /\b(dieta|calori|kcal|card[aá]pio|prescri|suplement|diagn[oó]stic|encaminh|isso causou|seu corpo est[aá] mostrando|bloqueio energ|resist[eê]ncia [aà] insulina|candid|toxina|trauma)/i;

/* ======================= servidor (RPC) ======================= */
const dSemFoco = { schema_version: 1, tipo: 'primeira', dores: [item('SUGESTAO_NAO_CONFIRMADA', 'conduta', ref('conduta', C1, 'actions'), true, false, true)] };
const rasc = rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, base, { direcao: dSemFoco }) });
ok(!rasc.error && srv.linhas('holos_results').find(r => r.id === rasc.data).status === 'rascunho', 'T01 rascunho salva SEM foco atual (com uma sugestão ainda não confirmada)');
const semFoco = rpc('salvar_resultado_holos', { payload: Object.assign({}, base, { direcao: dSemFoco }) });
const focoSoSugerido = rpc('salvar_resultado_holos', { payload: Object.assign({}, base, { direcao: Object.assign({}, dSemFoco, { foco_atual: item('Organizar a tarde', 'conduta', ref('conduta', C1, 'objective'), true, false, true) }) }) });
ok(semFoco.error?.hint === 'foco_obrigatorio' && focoSoSugerido.error?.hint === 'foco_obrigatorio' && !srv.linhas('holos_results').some(r => r.status !== 'rascunho'),
  'finalizar sem foco (ou com foco só SUGERIDO) é recusado: foco_obrigatorio; nada finalizado');
const anteriores = srv.linhas('holos_results').filter(r => r.status === 'salvo');

const dCompleta = { schema_version: 1, tipo: 'primeira',
  momento: [item('Você chegou trazendo cansaço à tarde.', 'relato_paciente', ref('holoscan', H, 'areas'), true, true, true)],
  dores: [item('SUGESTAO_NAO_CONFIRMADA', 'conduta', ref('conduta', C1, 'actions'), true, false, true), item('Sono depois do almoço', 'holoscan', ref('holoscan', H, 'SNT-507'), true, true, true)],
  padroes: [item('Nos dias com tarde longa sem pausa, relata mais fome à noite.', 'observacao_profissional', null, false, true, true, { tipo: 'padrao_observado' }),
    item('HIPOTESE_SECRETA investigar organização da tarde', 'observacao_profissional', null, false, true, true, { tipo: 'hipotese' })],
  foco_atual: item('Organizar o fim da tarde', 'conduta', ref('conduta', C1, 'objective'), true, true, true),
  acordos_compartilhados: [item('Preparar o lanche da tarde na noite anterior', 'acordo', ref('acordo', A1, 'description'), true, true, true)],
  corpo: { itens: [item('Preparar o lanche da tarde na noite anterior', 'conduta', ref('conduta', C1, 'actions'), true, true, true)] }, mente: { itens: [] },
  observar: [item('Fome e energia às 16h', 'conduta', ref('conduta', C1, 'monitoring'), true, true, true)],
  proxima_etapa: item('Retorno em 3 semanas', 'conduta', ref('conduta', C1, 'return_plan'), true, true, true),
  direcionamentos: [
    item('Organizar o fim da tarde', 'conduta', ref('conduta', C1, 'objective'), true, true, true, { id: 'dir1', territorio: 'corpo', porque: 'A tarde concentra fome e cansaço.', objetivo: 'Chegar ao jantar com menos fome.', status: 'ativo', sistemas: ['metabolico'] }),
    item('DIR_SUGERIDO_NAO_CONFIRMADO', 'conduta', ref('conduta', C1, 'priorities'), true, false, true, { id: 'dir2', territorio: 'integrado', status: 'proposto' }),
    item('DIR_SO_PROFISSIONAL', 'nutricionista', null, false, true, false, { id: 'dir3', territorio: 'mente', status: 'ativo' })],
  estrategias: [
    item('Pausa organizada no período da tarde', 'conduta', ref('conduta', C1, 'nutrition_strategy'), true, true, true, { id: 'est1', direcionamento_id: 'dir1', finalidade: 'Evitar a fome forte.', acao: 'Fazer uma pausa com lanche às 16h.',
      observar: 'Fome ao chegar em casa.', contexto: 'Dias de trabalho', prazo: 'Até o retorno', responsavel: 'Nutricionista (Conduta)', status: 'acordada' }),
    item('Registrar energia diariamente', 'nutricionista', null, false, true, true, { id: 'est2', direcionamento_id: 'dir1', acao: 'Anotar a energia às 16h.', status: 'em_teste' }),
    item('EST_SUGERIDA_NAO_CONFIRMADA', 'conduta', ref('conduta', C1, 'nutrition_strategy'), true, false, true, { id: 'est3', status: 'proposta' })] };
const r1 = rpc('salvar_resultado_holos', { payload: Object.assign({}, base, { direcao: dCompleta }) });
const R1 = srv.linhas('holos_results').find(r => r.id === r1.data);
const dp = R1 && R1.content_snapshot.direcao_paciente;
ok(!r1.error && R1.status === 'salvo' && R1.template_version === 5 && dp.foco_atual.texto === 'Organizar o fim da tarde', 'foco confirmado: Resultado finalizado no template 5, foco na projeção da paciente');
ok(!JSON.stringify(dp).includes('SUGESTAO_NAO_CONFIRMADA'), 'T04 sugestão NÃO confirmada não aparece na projeção da paciente (montada pelo servidor)');
ok(dp.dores.length === 1 && dp.dores[0].texto === 'Sono depois do almoço', 'T05 sugestão confirmada e compartilhada aparece');
ok(!JSON.stringify(dp).includes('HIPOTESE_SECRETA') && JSON.stringify(R1.content_snapshot.direcao).includes('HIPOTESE_SECRETA'),
  'T06 hipótese com mostrar_paciente = true NÃO entra na projeção da paciente (servidor); fica só no registro profissional');
ok(dp.padroes.length === 1 && /tarde longa/.test(dp.padroes[0].texto), 'T07 padrão observado confirmado aparece');
ok(dp.mente.itens.length === 0 && dp.espirito.itens.length === 0 && dp.corpo.itens.length === 1, 'T08 (servidor) territórios sem item confirmado ficam vazios na projeção');
ok(dp.acordos_compartilhados[0].texto === 'Preparar o lanche da tarde na noite anterior', 'T09 (servidor) acordo da Conduta compartilhado entra em "O que combinamos"');
ok(dp.direcionamentos.length === 1 && dp.direcionamentos[0].texto === 'Organizar o fim da tarde' && dp.direcionamentos[0].territorio === 'corpo' && dp.direcionamentos[0].porque && dp.direcionamentos[0].objetivo
  && !JSON.stringify(dp).includes('DIR_SUGERIDO_NAO_CONFIRMADO') && !JSON.stringify(dp).includes('DIR_SO_PROFISSIONAL'),
  'D01 direcionamento SUGERIDO não confirmado fica fora; confirmado só profissional fica fora; confirmado + compartilhado aparece (com território, por quê e objetivo)');
ok(dp.estrategias.length === 2 && dp.estrategias.every(e => e.direcionamento_id === 'dir1') && dp.estrategias[0].acao && dp.estrategias[0].observar && dp.estrategias[0].status === 'acordada'
  && !JSON.stringify(dp).includes('EST_SUGERIDA_NAO_CONFIRMADA') && !dp.estrategias.some(e => 'ref' in e || 'sugestao' in e),
  'E01 estratégia compartilhada mantém o vínculo com o direcionamento e os campos públicos; sugestão não confirmada fora; projeção sem ref');
const dr = R1.content_snapshot.direcao;
ok(dr.dores[1].ref.tipo === 'holoscan' && dr.dores[1].ref.campo === 'SNT-507' && dr.dores[1].sugestao === true && dr.dores[1].confirmado === true && dr.dores[1].texto_sugerido === 'Sono depois do almoço'
  && dr.foco_atual.ref.id === C1 && JSON.stringify(R1.direcao) === JSON.stringify(dr), 'T17 origem, ref, sugestão, confirmado e texto sugerido preservados (registro e snapshot)');
ok(rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, base, { direcao: { schema_version: 1, dores: [{ texto: 'x', origem: 'holoscan', sugestao: true }] } }) }).error?.hint === 'direcao_invalida',
  'T17 sugestão sem referência de origem é recusada pelo servidor');
ok(rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, base, { direcao: { schema_version: 2 } }) }).error?.hint === 'direcao_invalida'
  && rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, base, { direcao: { schema_version: 1, dieta: [] } }) }).error?.hint === 'direcao_invalida',
  'formato validado no servidor: schema_version 1 e só campos conhecidos');
/* ref de outra paciente */
const PB = fx.ins('patients', { nome: 'Outra Ficticia' }).id; const EB = fx.ins('encounters', { patient_id: PB, occurred_at: new Date(Date.now() - 7200000).toISOString() }).id;
ok(rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, base, { direcao: { schema_version: 1, dores: [item('x', 'conduta', ref('atendimento', EB), true, false, false)] } }) }).error?.hint === 'referencia_cruzada',
  'referência para registro de OUTRA paciente é recusada');

/* emissao */
const t4 = srv.linhas('holos_results').length;
const emSem = rpc('emitir_resultado_final', { payload: { holos_result_id: rasc.data } });
ok(emSem.error && ['resultado_nao_finalizado', 'foco_obrigatorio'].includes(emSem.error.hint), 'T02 rascunho sem foco não é emitido');
const em1 = rpc('emitir_resultado_final', { payload: { holos_result_id: r1.data, operation_id: 'op-em-1' } });
const E1row = (srv.linhas('holos_result_emissions') || []).find(e => e.id === em1.data?.id);
ok(!em1.error && E1row.template_version === 'RF-3' && E1row.content_snapshot.direcao_paciente.foco_atual.texto === 'Organizar o fim da tarde'
  && !JSON.stringify(E1row.content_snapshot).includes('HIPOTESE_SECRETA') && !JSON.stringify(E1row.content_snapshot).includes('SUGESTAO_NAO_CONFIRMADA') && !('direcao' in E1row.content_snapshot),
  'T03 foco confirmado permite emitir (RF-3); snapshot público sem hipótese, sem sugestão não confirmada e sem a direção completa');
ok(t4 === srv.linhas('holos_results').length, 'emitir não cria nem muda Resultado');
const upd = fx.q('holos_results', 'update', { dados: { direcao: { schema_version: 1 } }, filtros: [{ col: 'id', op: 'eq', val: r1.data }] });
const updEm = fx.q('holos_result_emissions', 'update', { dados: { content_hash: 'x' }, filtros: [{ col: 'id', op: 'eq', val: E1row.id }] });
ok(!!upd.error && !!updEm.error && srv.linhas('holos_results').find(r => r.id === r1.data).content_hash === R1.content_hash, 'T13 template 5 imutável depois de salvo/emitido (Resultado e emissão não mudam)');

/* COMPATIBILIDADE HISTORICA (ajuste final): templates 1-4 seguem a regra historica (RF-2), sem direcao, sem foco, sem nova versao */
const t4row = Object.assign(JSON.parse(JSON.stringify(R1)), { id: '00000000-0000-4000-8000-0000000000a4', template_version: 4, encounter_id: E1, operation_id: null, supersedes_id: null,
  content_snapshot: Object.assign({}, R1.content_snapshot, { template_version: 4, direcao: undefined, direcao_paciente: undefined, caminho: undefined }), direcao: null });
srv.tabelas.holos_results.push(t4row);
const nRes4 = srv.linhas('holos_results').length;
const em4 = rpc('emitir_resultado_final', { payload: { holos_result_id: t4row.id, operation_id: 'op-em-t4' } });
const E4row = (srv.linhas('holos_result_emissions') || []).find(e => e.id === em4.data?.id);
ok(!em4.error && E4row && E4row.template_version === 'RF-2' && !('direcao_paciente' in E4row.content_snapshot) && !('caminho' in E4row.content_snapshot)
  && srv.linhas('holos_results').find(r => r.id === t4row.id).template_version === 4 && srv.linhas('holos_results').length === nRes4,
  'C01/A Resultado template 4 SEM direcao e SEM foco é emitido pela regra histórica (RF-2), sem nova versão e sem reescrita');
/* template 5 sem foco no snapshot (forjado direto na tabela): a emissao recusa */
const t5semFoco = Object.assign(JSON.parse(JSON.stringify(R1)), { id: '00000000-0000-4000-8000-0000000000a5', operation_id: null, supersedes_id: null,
  content_snapshot: Object.assign({}, JSON.parse(JSON.stringify(R1.content_snapshot)), { direcao_paciente: Object.assign({}, R1.content_snapshot.direcao_paciente, { foco_atual: null }) }) });
srv.tabelas.holos_results.push(t5semFoco);
const em5sem = rpc('emitir_resultado_final', { payload: { holos_result_id: t5semFoco.id } });
ok(em5sem.error?.hint === 'foco_obrigatorio' && !(srv.linhas('holos_result_emissions') || []).some(e => e.holos_result_id === t5semFoco.id), 'C03/C template 5 SEM foco não é emitido (foco_obrigatorio)');
srv.tabelas.holos_results.splice(srv.tabelas.holos_results.findIndex(r => r.id === t5semFoco.id), 1);
ok(!em1.error && E1row.template_version === 'RF-3', 'C04/D template 5 COM foco é emitido (RF-3)');

/* ======================= sugestoes (modulo) ======================= */
const ctxSemConduta = { tipo: 'primeira', anamnese: null, conduta: null, acordos: [], ferramentas: [], holoscan: null, anterior: null };
const S0 = RD.sugestoes(ctxSemConduta);
ok(Object.values(S0).every(l => l.length === 0), 'T18 sem nenhum registro de origem, o sistema não sugere nada (não inventa)');
const ctx = { tipo: 'primeira', anamnese: { id: fx.PA, content: { formulario: { motivo: { motivo: 'Cansaço à tarde', objetivo: 'Mais disposição' }, saude: { sinal_principal: 'Fome intensa' } } } },
  conduta: null, acordos: [], ferramentas: [{ id: fx.T.oq3, ferramenta_id: 'oq3', modulo: 'corpo', respostas: { quer: 'menos fome à noite', consegue: 'levar lanche' } }],
  holoscan: { id: H, areas: [{ nome: 'Metabólico', dominantes: [{ question_id: 'SNT-507', enunciado: 'Sinto sono depois do almoço' }] }] } };
const S1 = RD.sugestoes(ctx);
const todasS1 = [].concat(...Object.values(S1));
ok(todasS1.length > 0 && todasS1.every(s => s.sugestao === true && s.confirmado === false && s.mostrar_paciente === false && s.ref && s.ref.id && s.origem),
  'sugestões nascem NÃO confirmadas, não compartilhadas, com origem e ref (nenhum checkbox pré-marcado conta como confirmação)');
ok(S1.corpo.every(s => s.origem !== 'conduta') && S1.acordos_compartilhados.length === 0 && S1.estrategias.length === 0 && S1.foco_atual.length === 0 && S1.observar.length === 0,
  'T18 sem Conduta: nenhuma estratégia, acordo, foco, observar ou ação de Conduta sugerida; Corpo só cita o que a paciente registrou');
const ctxC = Object.assign({}, ctx, { conduta: { id: C1, objective: 'Organizar a tarde', actions: 'Preparar o lanche\nAnotar fome', monitoring: 'Fome às 16h', return_plan: 'Retorno em 3 semanas' },
  acordos: [{ id: A1, description: 'Preparar o lanche', status: 'acordado' }, { id: fx.A2, description: 'ACORDO_ENCERRADO', status: 'encerrado' }] });
const S2 = RD.sugestoes(ctxC);
ok(S2.acordos_compartilhados.some(s => s.ref.id === A1 && s.origem === 'acordo') && !JSON.stringify(S2).includes('ACORDO_ENCERRADO') && S2.corpo.filter(s => s.origem === 'conduta').length === 2
  && S2.foco_atual[0].texto === 'Organizar a tarde', 'T09 a Conduta alimenta acordos compartilháveis (encerrado não), ações do Corpo, foco e próxima etapa — sempre como sugestão');
const textos = (S) => [].concat(...Object.values(S)).map(s => s.texto.replace(/“[^”]*”/g, '')).join(' | ');
ok(!PROIBIDAS.test(textos(S1)) && !PROIBIDAS.test(textos(S2)), 'T16 o sistema não gera linguagem proibida (dieta, prescrição, suplementação, diagnóstico, causalidade...) nas sugestões');
const dAv = RD.normalizar({ schema_version: 1, foco_atual: { texto: 'Fazer dieta', confirmado: true, origem: 'nutricionista' }, dores: [] });
ok(RD.avisos(dAv).includes('dieta') && RD.termosFora('isso causou a doença').includes('isso causou'), 'T16 texto da nutricionista com termo fora do método gera AVISO na tela');
const proj = RD.projecaoPaciente(dCompleta);
ok(JSON.stringify(proj) === JSON.stringify(dp), 'projeção da tela = projeção do servidor (mesma regra, mesma saída)');
const hipForcada = RD.projecaoPaciente({ schema_version: 1, padroes: [{ texto: 'HIP', origem: 'nutricionista', confirmado: true, mostrar_paciente: true, tipo: 'hipotese' }], foco_atual: { texto: 'f', confirmado: true, tipo: 'hipotese', origem: 'nutricionista' } });
ok(hipForcada.padroes.length === 0 && hipForcada.foco_atual === null, 'T06 (tela) hipótese forçada como compartilhada nunca é projetada');
ok(RD.mensagemWhatsApp('Marina Ficticia', '13/10/2026', 'Foco X.', 'Organizar o fim da tarde.') ===
  'Olá, Marina! Segue seu Resultado HOLOS de 13/10/2026. Nesta fase, nosso principal direcionamento é: Organizar o fim da tarde. No documento estão as estratégias que combinamos, o que observar até o próximo encontro e como vamos acompanhar a evolução.'
  && RD.mensagemWhatsApp('Marina Ficticia', '13/10/2026', 'Organizar o fim da tarde.', null) === RD.mensagemWhatsApp('Marina Ficticia', '13/10/2026', 'outro', 'Organizar o fim da tarde'),
  'T15 mensagem do WhatsApp exatamente no texto aprovado (direcionamento; sem direcionamento compartilhado, o foco ocupa o lugar)');
/* OS CINCO SISTEMAS (caso V6: Metabólico prioritário, Detox segundo, Ácido 10,0 fora dos focos) */
const SIS = [{ sistema: 'metabolico', nome: 'Metabólico', nota: 3.8, dominantes: [{ enunciado: 'Você fica com muito sono logo depois do almoço?' }], texto_publico: 'Eixo autoral metabólico. Segunda frase.' },
  { sistema: 'detox_linfatico', nome: 'Detox e Linfático', nota: 6.7, dominantes: [{ enunciado: 'Seu rosto amanhece inchado?' }], texto_publico: 'Eixo autoral detox.' },
  { sistema: 'acido_inflamatorio', nome: 'Ácido Inflamatório', nota: 10, dominantes: [], texto_publico: 'Eixo autoral ácido.' },
  { sistema: 'fungico', nome: 'Fúngico', nota: 10, dominantes: [], texto_publico: 'Eixo autoral fúngico.' },
  { sistema: 'mental_emocional_espiritual', nome: 'Mental Emocional Espiritual', nota: 8.7, dominantes: [], texto_publico: 'Eixo autoral MEE.' }];
const FECH = [{ sistema: 'metabolico', resultado: { prioridade: true, posicao: 1 } }, { sistema: 'detox_linfatico', resultado: { prioridade: true, posicao: 2 } }];
const hs = RD.htmlCincoSistemas(SIS, FECH, dp);
const cartaoDe = (html, code) => { const i = html.indexOf('data-rd-sistema="' + code + '"'); const j = html.indexOf('</article>', i); return i < 0 ? '' : html.slice(i, j); };
const txt = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
const met = cartaoDe(hs, 'metabolico'), dtx = cartaoDe(hs, 'detox_linfatico'), aci = cartaoDe(hs, 'acido_inflamatorio');
const esc2 = (t) => t.replace(/"/g, '&quot;');
ok(/Área principal para aprofundar/.test(met) && /Área para aprofundar nesta etapa/.test(dtx) && ['O que apareceu', 'O que vale observar', 'Como cuidar deste eixo'].every(t => met.includes(t))
  && met.includes(esc2(RD.CUIDADO_EIXOS.metabolico.cuidar)) && aci.includes(RD.CUIDADO_EIXOS.acido_inflamatorio.cuidar) && hs.indexOf('metabolico') < hs.indexOf('detox_linfatico'),
  'S01 sistemas: o texto-base "Como cuidar deste eixo" aparece (prioritário e não prioritário); Metabólico principal, Detox segundo');
ok(/Para você, nesta fase/.test(met) && met.includes('Organizar o fim da tarde') && met.includes('Pausa organizada no período da tarde') && !/Para você, nesta fase/.test(dtx),
  'S02 sistemas: o direcionamento e as estratégias INDIVIDUAIS aparecem só no sistema ligado pela nutricionista');
const dirSemSis = { direcionamentos: [{ id: 'dx', texto: 'DIR_INTEGRADO_SEM_SISTEMA', territorio: 'integrado' }], estrategias: [{ texto: 'EST_DO_DIR_INTEGRADO', direcionamento_id: 'dx' }] };
ok(S2.direcionamentos.length > 0 && S2.direcionamentos.every(x => !x.sistemas || x.sistemas.length === 0)
  && !RD.htmlCincoSistemas(SIS, FECH, dirSemSis).includes('DIR_INTEGRADO_SEM_SISTEMA') && RD.projecaoPaciente({ schema_version: 1, direcionamentos: [{ texto: 'DIR_INTEGRADO_SEM_SISTEMA', origem: 'nutricionista', territorio: 'integrado', confirmado: true, mostrar_paciente: true }] }).direcionamentos.length === 1,
  'D02 vínculo direcionamento → sistema é opcional: as sugestões nunca inventam sistema; direcionamento sem sistema é válido, aparece em "Direcionamentos desta fase" e em nenhum cartão de sistema');
ok(!/Para você, nesta fase/.test(RD.htmlCincoSistemas(SIS, FECH, {})) && S1.estrategias.length === 0 && S1.direcionamentos.length === 0,
  'S03 nenhuma estratégia nem direcionamento sai da nota: sem direção confirmada o sistema não mostra "Para você"; HOLOSCAN sozinho não gera estratégia');
ok(!/\b(normal|saudáve|sem problema|sem doença|perfeit|menos marcadores|alguns marcadores)/i.test(txt(hs)), 'S04 sistemas: sem "normal / saudável / sem problema / sem doença / perfeito / menos marcadores"');
ok(aci.includes(RD.NAO_PRIORITARIO) && /10,0 de 10/.test(aci) && /não indica doença nem saúde/.test(aci) && !/Para você/.test(aci),
  'S05 nota 10,0 não vira normalidade: Ácido fica "' + RD.NAO_PRIORITARIO + '", nota como detalhe e "não indica doença nem saúde"');

/* ======================= tela ======================= */
const nav = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] });
const errosJS = [];
const espera = ms => new Promise(r => setTimeout(r, ms));
async function sessao() {
  const P = await (await nav.createBrowserContext()).newPage();
  await P.setViewport({ width: Number(process.env.VW || 1280), height: 1000, deviceScaleFactor: Number(process.env.DPR || 1) });
  await P.emulateTimezone('America/Sao_Paulo');
  P.on('pageerror', e => errosJS.push(e.message));
  await ligarPagina(P, srv);
  await P.evaluateOnNewDocument(() => { setInterval(() => { if (window.BoasVindas && window.BoasVindas.aberta()) window.BoasVindas.fechar(); }, 80); });
  await P.goto('http://127.0.0.1:5500/', { waitUntil: 'networkidle2' });
  await P.waitForSelector('#login-email', { visible: true });
  await P.type('#login-email', 'a@holo.test'); await P.type('#login-senha', 'senha-a-123'); await P.click('#btn-entrar');
  await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
  await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
  await P.addStyleTag({ content: '*{transition:none!important;animation:none!important}' });
  return P;
}
const P = await sessao();
const clicar = (s) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.click(); return true; }, s);
const texto = (s) => P.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText : ''; }, s);
const confirmarModal = async () => { await espera(300); await clicar('#modal-confirmar-ok'); await espera(900); };
const noItem = (re, acao) => P.evaluate((re, acao) => {
  const li = [...document.querySelectorAll('.rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return false; const b = li.querySelector('[data-rd-acao="' + acao + '"]'); if (!b) return false; b.click(); return true; }, re, acao);
const noItemSec = (sec, re, acao) => P.evaluate((sec, re, acao) => {
  const li = [...document.querySelectorAll('[data-rd-bloco="' + sec + '"] .rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return false; const b = li.querySelector('[data-rd-acao="' + acao + '"]'); if (!b) return false; b.click(); return true; }, sec, re, acao);
const campo = (sec, re, k, v) => P.evaluate((sec, re, k, v) => {
  const li = [...document.querySelectorAll('[data-rd-bloco="' + sec + '"] .rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return false; const e = li.querySelector('[data-rd-campo$="|' + k + '"]'); if (!e) return false;
  if (e.tagName === 'SELECT' && k === 'direcionamento_id') { const o = [...e.options].find(o => new RegExp(v).test(o.textContent)); e.value = o ? o.value : ''; } else e.value = v;
  e.dispatchEvent(new Event('change', { bubbles: true })); return true; }, sec, re, k, v);
const estadoSec = (sec, re) => P.evaluate((sec, re) => {
  const li = [...document.querySelectorAll('[data-rd-bloco="' + sec + '"] .rd-ed-item')].find(l => new RegExp(re).test(l.querySelector('textarea').value));
  if (!li) return null; const st = li.querySelector('[data-rd-campo$="|status"]'); return { classe: li.className, status: st ? st.value : null, texto: li.innerText }; }, sec, re);
const shot = async (nome, sel) => { if (!SHOT) return; const e = await P.$(sel); if (e) await e.screenshot({ path: SHOT + '/' + nome + '.png' }); };
async function abrir(eid) {
  await P.evaluate(async (pid, eid) => { window.definirPacienteAtivo(pid); try { await window.AtendimentoAtual.selecionarPorId(eid); } catch (e) {}
    window.ResultadoHolos.esquecer(); window.levarParaFicha('aba:resultado-holos', pid);
    for (let i = 0; i < 80; i++) { const a = document.getElementById('aba-resultado-holos'); if (a && a.querySelector('[data-rh-acao="novo"]')) break; await new Promise(r => setTimeout(r, 100)); } }, PA, eid);
}
async function novo(eid) {
  await abrir(eid);
  await clicar('[data-rh-acao="novo"]'); await espera(300);
  await P.evaluate((eid, h, tools) => { const s = document.getElementById('rh-atendimento'); s.value = eid; s.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('input[name="rh-holoscan"][value="' + h + '"]').click();
    tools.forEach(id => { const c = document.querySelector('[data-rh-ferr][value="' + id + '"]'); if (c && !c.checked) c.click(); }); }, eid, H, Object.values(fx.T));
  await espera(200);
}
await novo(E1);
const ed0 = await P.evaluate(() => ({ editor: !!document.getElementById('rd-editor'), status: (document.getElementById('rd-status') || {}).textContent || '', itens: document.querySelectorAll('.rd-ed-item').length,
  pilares: [...document.querySelectorAll('.rd-ed-pilar-tit')].map(h => h.firstChild.textContent.trim()), soProf: !!document.querySelector('.rd-so-prof-grupo') }));
ok(ed0.editor && /RESULTADO EM CONSTRUÇÃO/.test(ed0.status) && ed0.itens === 0 && ed0.soProf, 'editor "MONTAR RESULTADO PARA A PACIENTE": começa vazio e em construção; área "SÓ PARA A PROFISSIONAL" presente');
ok(['Direcionamento', 'Estratégias', 'Acompanhamento da evolução'].every(t => ed0.pilares.includes(t)), 'editor organizado em Direcionamento · Estratégias · Acompanhamento da evolução');
await clicar('[data-rd-acao="sugerir"]'); await espera(1200);
const ed1 = await P.evaluate(() => ({ itens: document.querySelectorAll('.rd-ed-item').length, sug: document.querySelectorAll('.rd-ed-item .rd-estado-sugerido').length,
  marcados: [...document.querySelectorAll('.rd-ed-item [data-rd-acao="compartilhar"]')].filter(c => c.checked).length, sel: document.querySelectorAll('.rd-estado-sugerido').length }));
ok(ed1.itens > 10 && ed1.sug === ed1.itens && ed1.marcados === 0, 'sugestões trazidas: todas "SUGESTÃO DO SISTEMA", nenhuma confirmada e nenhuma marcada para compartilhar (' + ed1.itens + ')');
await shot('t5-editor-sugestoes', '#rd-editor');
await clicar('[data-rh-acao="salvar"]'); await espera(500);
ok(/Foco atual/.test(await texto('#rh-erro')) && !srv.linhas('holos_results').some(r => r.status === 'salvo' && r.encounter_id === E1 && r.id !== r1.data && r.id !== t4row.id), 'tela: finalizar sem foco é bloqueado com a mensagem do foco');
await clicar('[data-rh-acao="rascunho"]'); await espera(900);
const rascTela = srv.linhas('holos_results').filter(r => r.status === 'rascunho' && r.direcao && (r.direcao.dores || []).length > 2).pop();
ok(!!rascTela && rascTela.direcao.foco_atual === null && [].concat(rascTela.direcao.dores, rascTela.direcao.momento).every(i => i.confirmado === false && i.sugestao === true && i.ref),
  'T01 (tela) rascunho salvo sem foco, com as sugestões registradas como sugestão (origem e ref)');
/* confirma alguns itens */
for (const re of ['^Você chegou', 'sinal que mais', 'principal objetivo', '^Preparar o lanche da tarde na noite anterior \\(', '^Fome e energia às 16h']) await noItem(re, 'confirmar'), await espera(100);
await noItem('Períodos de maior fome', 'excluir'); await espera(100);
await P.evaluate(() => { const t = document.querySelector('[data-rd-novo="hipoteses"]'); t.value = 'HIPOTESE_DA_TELA investigar a tarde'; document.querySelector('[data-rd-acao="adicionar"][data-rd-sec="hipoteses"]').click(); }); await espera(150);
await P.evaluate(() => { const t = document.querySelector('[data-rd-novo="padroes"]'); t.value = 'PADRAO_DA_TELA tarde sem pausa'; document.querySelector('[data-rd-acao="adicionar"][data-rd-sec="padroes"]').click(); }); await espera(150);
await P.evaluate(() => document.querySelector('[data-rd-acao="usar"][data-rd-sec="foco_atual"]').click()); await espera(200);
ok(/RESULTADO EM CONSTRUÇÃO/.test(await texto('#rd-status')), 'foco escolhido mas não confirmado: continua "RESULTADO EM CONSTRUÇÃO"');
await noItemSec('foco_atual', '^Organizar o fim da tarde', 'confirmar'); await espera(200);
ok(/Foco atual confirmado/.test(await texto('#rd-status')), 'foco confirmado: status muda');
/* direcionamento e estrategia: sugestao -> confirmado (status vira ATIVO / ACORDADA) -> compartilhado */
const dirSug = await estadoSec('direcionamentos', '^Organizar o fim da tarde');
const estSug = await estadoSec('estrategias', '^Começar por um lanche');
ok(!!dirSug && /rd-ed-sugerido/.test(dirSug.classe) && !!estSug && /rd-ed-sugerido/.test(estSug.classe), 'editor: direcionamento e estratégia chegam como SUGESTÃO DO SISTEMA (' + (dirSug && dirSug.status) + ' / ' + (estSug && estSug.status) + ')');
await campo('direcionamentos', '^Organizar o fim da tarde', 'territorio', 'corpo');
await P.evaluate(() => { const li = [...document.querySelectorAll('[data-rd-bloco="direcionamentos"] .rd-ed-item')].find(l => /^Organizar o fim da tarde/.test(l.querySelector('textarea').value));
  const c = li && li.querySelector('[data-rd-sis$="|metabolico"]'); if (c && !c.checked) c.click(); });
await noItemSec('direcionamentos', '^Organizar o fim da tarde', 'confirmar'); await espera(150);
await campo('estrategias', '^Começar por um lanche', 'direcionamento_id', 'Organizar o fim da tarde');
await campo('estrategias', '^Começar por um lanche', 'acao', 'Levar um lanche e comer às 16h.');
await noItemSec('estrategias', '^Começar por um lanche', 'confirmar'); await espera(150);
const dirConf = await estadoSec('direcionamentos', '^Organizar o fim da tarde'), estConf = await estadoSec('estrategias', '^Começar por um lanche');
ok(/COMPARTILHADO COM A PACIENTE/.test(dirConf.texto) && dirConf.status === 'ativo' && /COMPARTILHADO COM A PACIENTE/.test(estConf.texto) && estConf.status === 'acordada',
  'editor: ao confirmar, direcionamento PROPOSTO vira ATIVO e estratégia PROPOSTA vira ACORDADA (confirmado · compartilhado)');
await P.evaluate(() => { const b = document.querySelector('[data-rd-acao="usar"][data-rd-sec="proxima_etapa"]'); if (b) b.click(); }); await espera(200);
await noItemSec('proxima_etapa', '.', 'confirmar'); await espera(150);
await clicar('[data-rh-acao="previa"]'); await espera(1000);
await P.evaluate(() => { const b = document.querySelector('[data-rh-visao-troca="paciente"]'); if (b) b.click(); }); await espera(400);
const pv = await texto('#rh-doc');
ok(/Ainda não aprofundado nesta etapa/.test(pv) && /O que vamos colocar em prática\?/.test(pv) && /O que queremos compreender nos padrões que se repetem\?/.test(pv) && /Que direção queremos fortalecer\?/.test(pv),
  'T08 território sem item mostra "Ainda não aprofundado nesta etapa." com as perguntas aprovadas de Corpo, Mente e Espírito');
ok(!/HIPOTESE_DA_TELA/.test(pv) && /PADRAO_DA_TELA/.test(pv) && !/Períodos de maior fome/.test(pv) && !/Dificuldades com a alimentação/.test(pv),
  'prévia da paciente: hipótese fora; padrão confirmado dentro; sugestão excluída e sugestão não confirmada fora');
/* PDF da paciente refinado (15/10): compreensão e ação primeiro, mapa no fim; sem a página dos cinco sistemas */
const ordem = await P.evaluate(() => [...document.querySelectorAll('#rh-doc .pf-tit')].map(h => h.textContent.trim()));
const ORDEM = ['Seu momento agora', 'O que estamos compreendendo', 'Foco desta fase', 'O que vamos trabalhar agora', 'Seu plano até a próxima consulta',
  'Corpo · Mente · Espírito', 'Até o próximo encontro, observe', 'Próxima etapa', 'Seu mapa HOLOS'];
const posicoes = ORDEM.map(t => ordem.indexOf(t));
ok(posicoes.every(i => i >= 0) && posicoes.every((v, i) => i === 0 || v > posicoes[i - 1]) && !/Os cinco sistemas|Detalhes do mapa|Como vamos caminhar/.test(pv),
  'visão da paciente na ordem do refino (momento → compreendendo → foco → trabalhar → plano → C/M/E → observe → próxima etapa → mapa), sem a página dos cinco sistemas: ' + ordem.join(' / '));
ok(/O plano pode evoluir/.test(pv), '1ª consulta: a próxima etapa deixa claro que o plano pode evoluir');
await shot('t5-previa-paciente', '#rh-doc');
await clicar('[data-rh-acao="salvar"]'); await confirmarModal();
const salvoTela = srv.linhas('holos_results').filter(r => r.status === 'salvo' && r.encounter_id === E1 && r.id !== r1.data).pop();
ok(!!salvoTela && salvoTela.template_version === 5 && salvoTela.content_snapshot.direcao_paciente.foco_atual && JSON.stringify(salvoTela.content_snapshot.direcao).includes('HIPOTESE_DA_TELA')
  && !JSON.stringify(salvoTela.content_snapshot.direcao_paciente).includes('HIPOTESE_DA_TELA'), 'tela: finalizado no template 5; hipótese só no registro profissional');
const prof = await texto('#rh-doc');
ok(/CONFIRMADO · COMPARTILHADO COM A PACIENTE/.test(prof) && /SUGESTÃO DO SISTEMA/.test(prof) && /HIPOTESE_DA_TELA/.test(prof) && /Só para a profissional/i.test(prof),
  'visão profissional: estados (sugestão / confirmado / compartilhado), origem e a hipótese na área só profissional');

/* pagina Resultado: emitir, PDF, WhatsApp */
await P.evaluate((pid) => { window.definirPacienteAtivo(pid); document.querySelector('.nav-item[data-secao="resultado"]').click(); }, PA);
await P.waitForFunction(() => !!document.getElementById('rp-doc'), { timeout: 15000 }); await espera(600);
await clicar('[data-rp-acao="emitir"]'); await espera(1800);
await P.waitForFunction(() => !!document.querySelector('[data-rp-acao="pdf"]'), { timeout: 15000 });
const emTela = srv.linhas('holos_result_emissions').filter(e => e.holos_result_id === salvoTela.id).pop();
ok(!!emTela && emTela.template_version === 'RF-3', 'Resultado Final emitido (RF-3) a partir do Resultado com foco');
const docPac = await texto('#rp-doc');
ok(!/HIPOTESE_DA_TELA/.test(docPac) && /Organizar o fim da tarde/.test(docPac), 'documento emitido: foco presente, hipótese ausente');
const msg = await P.evaluate(() => window.ResultadoPagina.mensagemWhatsAppEmissao({ nome: 'Marina Ficticia' }, window.ResultadoPagina.emissaoAtual()));
ok(/^Olá, Marina! Segue seu Resultado HOLOS de \d\d\/\d\d\/\d{4}\. Nesta fase, nosso principal direcionamento é: Organizar o fim da tarde, que concentra fome forte e cansaço\. No documento estão as estratégias que combinamos, o que observar até o próximo encontro e como vamos acompanhar a evolução\.$/.test(msg || '') && !/HIPOTESE/.test(msg),
  'W01 WhatsApp: mensagem aprovada, com o direcionamento congelado na emissão, sem hipótese');
ok(/Foco desta fase/.test(docPac) && /O que vamos trabalhar agora/.test(docPac) && /Seu plano até a próxima consulta/.test(docPac) && /Levar um lanche e comer às 16h/.test(docPac) && !/SUGESTÃO DO SISTEMA/.test(docPac),
  'P01 documento emitido (base do PDF): foco, direcionamento e estratégias compartilhadas presentes; nada de sugestão');
/* B: emissao HISTORICA (template 4 / RF-2) continua abrindo pelo desenho historico */
const hist = await P.evaluate((em, r) => { try { const h = window.ResultadoPagina.documentoEmissao(em, r); return { ok: true, tam: h.length, construcao: /EM CONSTRUÇÃO/.test(h), foco: window.ResultadoPagina.focoDaEmissao(em) }; } catch (e) { return { erro: e.message }; } },
  E4row, srv.linhas('holos_results').find(r => r.id === t4row.id));
ok(hist.ok && hist.tam > 1000 && !hist.construcao && hist.foco === null, 'C02/B emissão histórica do template 4 (RF-2) abre pelo desenho histórico, sem exigir foco' + (hist.erro ? ': ' + hist.erro : ''));
await P.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js' }).catch(() => null);
let pdf = await P.evaluate(async () => { if (typeof window.html2pdf !== 'function') return { semLib: true }; try { const r = await window.ResultadoPagina.gerarPdf(); return { tam: r.blob.size, nome: r.nome }; } catch (e) { return { erro: e.message }; } });
if (pdf.semLib) {
  /* sem rede: o gerador usa a mesma copia local do html2pdf que a captura usa, se existir; senao, so o bloqueio e testado */
  const { existsSync } = await import('node:fs');
  const local = '/tmp/claude-0/-home-user-HoloHacking/2536f0de-9516-5291-b095-34b766c5940f/scratchpad/h2p/node_modules/html2pdf.js/dist/html2pdf.bundle.min.js';
  if (existsSync(local)) { await P.addScriptTag({ path: local }); pdf = await P.evaluate(async () => { try { const r = await window.ResultadoPagina.gerarPdf(); return { tam: r.blob.size, nome: r.nome }; } catch (e) { return { erro: e.message }; } }); }
}
if (process.env.PDF_OUT && !pdf.semLib) {
  if (process.env.FONTE) await P.addStyleTag({ content: 'html{font-size:' + process.env.FONTE + '}' });   /* simula a fonte padrao maior do navegador */   /* ferramenta de conferencia: grava o PDF gerado para inspecao visual */
  const b64 = await P.evaluate(async () => { const r = await window.ResultadoPagina.gerarPdf(); const buf = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768)); return btoa(s); });
  (await import('node:fs')).writeFileSync(process.env.PDF_OUT, Buffer.from(b64, 'base64'));
}
ok(pdf.semLib || (pdf.tam > 20000 && /\.pdf$/.test(pdf.nome)), 'T14 PDF da emissão RF-3 gerado' + (pdf.semLib ? ' (gerador indisponível offline: só o bloqueio testado)' : ' (' + pdf.tam + ' bytes)'));
const bloqueio = await P.evaluate(async () => { const orig = window.ResultadoPagina.emissaoAtual(); return window.ResultadoPagina.focoDaEmissao({ template_version: 'RF-3', content_snapshot: { direcao_paciente: { foco_atual: null } } }) === null
  && window.ResultadoPagina.mensagemWhatsAppEmissao({ nome: 'X' }, { template_version: 'RF-3', content_snapshot: { direcao_paciente: {} } }) === null && !!window.ResultadoPagina.focoDaEmissao(orig); });
ok(bloqueio, 'T14/T15 emissão RF-3 sem foco não gera mensagem nem PDF da paciente; RF-2 histórica segue a regra histórica (C02)');
await P.setViewport({ width: 390, height: 900 }); await espera(400);
ok(!(await P.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)), 'celular (390 px): documento da paciente sem rolagem lateral');
await P.setViewport({ width: 1280, height: 1000 });

/* ======================= retorno ======================= */
const fpAntes = JSON.stringify(srv.linhas('holos_results').filter(r => r.status !== 'rascunho').map(r => [r.id, r.content_hash, r.status, JSON.stringify(r.direcao)]));
const emAntes = JSON.stringify(srv.linhas('holos_result_emissions').map(e => [e.id, e.content_hash]));
fx.retorno();
await P.reload({ waitUntil: 'networkidle2' });
await P.waitForFunction(() => window.HoloAuth && window.HoloAuth.sessaoAtiva() && window.pacientesCarregados && window.pacientesCarregados(), { timeout: 15000 });
await P.evaluate(async () => { if (window.Sincronizacao && window.Sincronizacao.aguardar) await window.Sincronizacao.aguardar(); });
await novo(fx.E2);
ok((await P.evaluate(() => (document.querySelector('input[name="rd-tipo"]:checked') || {}).value)) === 'retorno', 'retorno reconhecido (anamnese de retorno / Resultado anterior)');
await clicar('[data-rd-acao="sugerir"]'); await espera(1200);
const sugR = await P.evaluate(() => [...document.querySelectorAll('.rd-ed-item')].map(l => l.querySelector('textarea').value + ' @' + l.querySelector('.rd-origem').textContent));
ok(sugR.some(s => /^Acordo concluído: Preparar o lanche/.test(s)) && sugR.some(s => /Resultado anterior/.test(s)) && sugR.some(s => /^O que melhorou/.test(s)),
  'retorno: avanços sugeridos do Mapeamento de retorno e do acordo concluído; itens do Resultado anterior marcados como tal');
/* ACOMPANHAMENTO da estrategia anterior: sem decisao nao confirma; com experiencia, percepcao e decisao, confirma */
const acSug = await estadoSec('acompanhamento_estrategias', '^Começar por um lanche');
await noItemSec('acompanhamento_estrategias', '^Começar por um lanche', 'confirmar'); await espera(150);
const acSemDec = await estadoSec('acompanhamento_estrategias', '^Começar por um lanche');
ok(!!acSug && /rd-ed-sugerido/.test(acSug.classe) && /rd-ed-sugerido/.test(acSemDec.classe), 'R01 retorno: cada estratégia anterior vira um item de acompanhamento; sem DECISÃO não é confirmado');
for (const [k, v] of [['aplicou', 'Conseguiu em 4 de 6 dias'], ['facilitou', 'Deixar o lanche separado'], ['dificultou', 'Reuniões no fim da tarde'], ['percepcao', 'PERCEPCAO_DA_PACIENTE chegou com menos fome'],
  ['observacao', 'OBS_INTERNA_DA_NUTRI'], ['decisao', 'manter']]) await campo('acompanhamento_estrategias', '^Começar por um lanche', k, v);
await noItemSec('acompanhamento_estrategias', '^Começar por um lanche', 'confirmar'); await espera(150);
ok(/COMPARTILHADO COM A PACIENTE/.test((await estadoSec('acompanhamento_estrategias', '^Começar por um lanche')).texto), 'R02 retorno: acompanhamento com experiência, percepção e decisão é confirmado');
await clicar('[data-rd-acao="sugerir"]'); await espera(1200);
const continua = await estadoSec('estrategias', '^Começar por um lanche');
ok(!!continua && continua.status === 'manter' && /registro anterior não muda/.test(continua.texto), 'R03 decisão MANTER sugere a estratégia continuada (status manter, ligada à anterior; o registro anterior não muda)');
await noItemSec('estrategias', '^Começar por um lanche', 'confirmar'); await espera(150);
for (const re of ['^O que melhorou', '^Acordo concluído', '^O que dificultou']) await noItem(re, 'confirmar'), await espera(100);
await P.evaluate(() => document.querySelector('[data-rd-acao="usar"][data-rd-sec="foco_atual"]').click()); await espera(200);
await noItemSec('foco_atual', '^Manter o lanche da tarde', 'confirmar'); await espera(200);
await clicar('[data-rh-acao="salvar"]'); await confirmarModal();
const r2 = srv.linhas('holos_results').filter(r => r.status === 'salvo' && r.encounter_id === fx.E2).pop();
const cam = r2 && r2.content_snapshot.caminho;
ok(!!r2 && cam.length >= 1 && cam[cam.length - 1].foco && /Organizar o fim da tarde/.test(cam[cam.length - 1].foco.texto) && !JSON.stringify(cam).includes('HIPOTESE') && !JSON.stringify(cam).includes('"nota"'),
  'T10 retorno lê o Resultado anterior (foco e avanços compartilhados do snapshot imutável), sem hipótese e sem nota');
await P.evaluate(() => { const b = document.querySelector('[data-rh-visao-troca="paciente"]'); if (b) b.click(); }); await espera(400);
const pr = await texto('#rh-doc');
const prL = pr.toLowerCase(), FALTAM_R04 = ['O que mudou desde o último encontro', 'Foco do encontro anterior', 'Organizar o fim da tarde', 'Avanços', 'O que ainda pesa', 'Novo foco desta fase', 'Manter o lanche da tarde', 'O que manter e o que ajustar', 'Seu mapa HOLOS'].filter(x => !prL.includes(x.toLowerCase()));
ok(!FALTAM_R04.length,
  'R04 retorno na visão da paciente (refino 15/10): o que mudou (foco anterior, avanços, o que ainda pesa), o que manter/ajustar, novo foco, … mapa — faltam: ' + JSON.stringify(FALTAM_R04));
ok(/O que foi possível fazer/.test(pr) && /Conseguiu em 4 de 6 dias/.test(pr) && /PERCEPCAO_DA_PACIENTE/.test(pr) && /decisão: manter/i.test(pr) && !/OBS_INTERNA_DA_NUTRI/.test(pr),
  'R05 retorno: "O que foi possível fazer" com o que aconteceu, o que a paciente percebeu e a decisão; observação da nutricionista fica só profissional');
const rr = r2.content_snapshot.direcao_paciente;
ok(rr.acompanhamento_estrategias.length === 1 && rr.acompanhamento_estrategias[0].decisao === 'manter' && !('observacao' in rr.acompanhamento_estrategias[0])
  && rr.estrategias.some(e => e.status === 'manter' && e.anterior && e.anterior.estrategia_id), 'R06 servidor: acompanhamento com decisão na projeção (sem a observação interna); estratégia continuada com o vínculo "anterior"');
await shot('t5-retorno-paciente', '#rh-doc');
const fpDepois = JSON.stringify(srv.linhas('holos_results').filter(r => r.status !== 'rascunho' && r.id !== r2.id).map(r => [r.id, r.content_hash, r.status, JSON.stringify(r.direcao)]));
ok(fpAntes === fpDepois && emAntes === JSON.stringify(srv.linhas('holos_result_emissions').map(e => [e.id, e.content_hash])), 'T11 histórico inalterado: Resultados e emissões anteriores idênticos depois do retorno');

/* ======================= retorno no servidor: acompanhamento, decisoes e historico das estrategias ======================= */
const R1antes = JSON.stringify(srv.linhas('holos_results').find(r => r.id === r1.data));
const refEst = (eid) => ({ resultado_id: r1.data, estrategia_id: eid });
const acomp = (texto, eid, extra) => item(texto, 'resultado_anterior', ref('resultado', r1.data, 'estrategias'), true, true, true, Object.assign({ estrategia: refEst(eid) }, extra));
const dRet = (mod) => Object.assign({ schema_version: 1, tipo: 'retorno',
  foco_atual: item('Manter a pausa da tarde', 'nutricionista', null, false, true, true),
  acompanhamento_estrategias: [
    acomp('Pausa organizada no período da tarde', 'est1', { aplicou: 'Conseguiu em 4 de 6 dias', facilitou: 'Lanche pronto', dificultou: 'Reuniões', percepcao: 'Menos fome à noite', observacao: 'OBS_SO_PROF', mudanca: 'Jantar mais tranquilo', decisao: 'manter' }),
    acomp('Registrar energia diariamente', 'est2', { aplicou: 'Registrou em 2 de 7 dias', dificultou: 'Esquecia à tarde', decisao: 'ajustar' })],
  avancos: [item('Menos fome à noite nos dias com pausa', 'relato_paciente', null, false, true, true)],
  estrategias: [
    item('Pausa organizada no período da tarde', 'resultado_anterior', ref('resultado', r1.data, 'estrategias'), true, true, true, { id: 'est1b', status: 'manter', anterior: refEst('est1') }),
    item('Registrar energia 3 vezes por semana', 'nutricionista', null, false, true, true, { id: 'est2b', status: 'ajustar', anterior: refEst('est2') })] }, mod || {});
const baseR = Object.assign({}, base, { encounter_id: fx.E2 });
const semDec = dRet({ acompanhamento_estrategias: [acomp('Pausa organizada no período da tarde', 'est1', { aplicou: 'x' })] });
ok(rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, baseR, { direcao: semDec }) }).error?.hint === 'direcao_invalida', 'R07 servidor: acompanhamento confirmado SEM decisão é recusado');
const fora = dRet({ estrategias: [item('x', 'nutricionista', null, false, true, true, { id: 'e9', status: 'manter', anterior: { resultado_id: '00000000-0000-4000-8000-00000000dead', estrategia_id: 'est1' } })] });
ok(rpc('salvar_rascunho_resultado_holos', { payload: Object.assign({}, baseR, { direcao: fora }) }).error?.hint === 'referencia_cruzada', 'R08 servidor: estratégia "anterior" que não é Resultado salvo desta paciente é recusada');
const r3 = rpc('salvar_resultado_holos', { payload: Object.assign({}, baseR, { direcao: dRet() }) });
const R3 = srv.linhas('holos_results').find(r => r.id === r3.data);
const dp3 = R3 && R3.content_snapshot.direcao_paciente;
ok(!r3.error && dp3.acompanhamento_estrategias.map(a => a.decisao).join() === 'manter,ajustar' && dp3.acompanhamento_estrategias[0].aplicou === 'Conseguiu em 4 de 6 dias'
  && dp3.acompanhamento_estrategias[0].percepcao === 'Menos fome à noite' && dp3.acompanhamento_estrategias[0].dificultou === 'Reuniões' && !JSON.stringify(dp3).includes('OBS_SO_PROF'),
  'R09 retorno registra a experiência (aplicou, facilitou, dificultou, percepção, mudança) e a DECISÃO (manter / ajustar) de cada estratégia; observação interna fora da paciente');
ok(dp3.estrategias.find(e => e.id === 'est2b').anterior.estrategia_id === 'est2' && dp3.estrategias.find(e => e.id === 'est1b').status === 'manter' && dp3.avancos.length === 1 && dp3.foco_atual.texto === 'Manter a pausa da tarde',
  'R10 manter / ajustar viram estratégias NOVAS ligadas à anterior (histórico preservado); avanços e novo foco no retorno');
const R1depois = srv.linhas('holos_results').find(r => r.id === r1.data);
ok(JSON.stringify(R1depois) === R1antes && R1depois.direcao.estrategias.find(e => e.id === 'est2').texto === 'Registrar energia diariamente' && R1depois.direcao.estrategias.find(e => e.id === 'est1').status === 'acordada',
  'R11 a estratégia anterior NÃO é sobrescrita: o Resultado da 1ª consulta continua idêntico (texto e status originais)');
ok(!JSON.stringify(R3.content_snapshot.caminho).includes('EST_SUGERIDA_NAO_CONFIRMADA') && !JSON.stringify(R3.content_snapshot.caminho).includes('HIPOTESE') && !JSON.stringify(R3.content_snapshot.caminho).includes('DIR_SO_PROFISSIONAL'),
  'R12 caminho do retorno: só o que foi compartilhado nos Resultados anteriores (sem hipótese, sem sugestão, sem item só profissional)');

/* segunda nutricionista nao le */
const B = srv.tratar({ op: 'query', uid: srv.linhas('profiles').length && srv.criarConta ? null : null, q: { tabela: 'holos_results', acao: 'select', filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true } });
ok(!B.data || B.data.length === 0, 'sem sessão: nenhum Resultado é lido');
ok(errosJS.length === 0, 'sem erro de JavaScript na tela' + (errosJS.length ? ': ' + errosJS.join(' | ') : ''));
await nav.close();
if (falhou) { console.log('\nRESULTADO: FALHOU'); process.exit(1); }
console.log('\nRESULTADO: OK');
