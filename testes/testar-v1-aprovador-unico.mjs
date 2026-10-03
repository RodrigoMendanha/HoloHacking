/**
 * V1 — HOMOLOGACAO METODOLOGICA COM APROVADOR UNICO (migrations 20261001210000 + 20261003100000; Supabase falso
 * que espelha as migrations; provadas em PostgreSQL local — supabase/tests/aprovador-unico-harness.sql)
 *
 * MUDANCA LEGITIMA DE CONTRATO (Etapa 6.3-B, decisao docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md):
 * este arquivo era testar-v1-dupla-aprovacao.mjs (Daniel -> Rodrigo). As assercoes de ordem/pessoas/quatro olhos
 * viraram assercoes do aprovador unico; nenhuma protecao foi removida (hash, invalidacao, imutabilidade, "Liderança",
 * escrita direta, identidade real). Novas: etapa 2 recusada; Rodrigo com papel desativado nao aprova nem homologa;
 * homologar exige dono do pacote E aprovador ativo; reviewed_by/reviewed_at NULOS (nenhuma segunda revisao simulada).
 *
 *  - Aprovacao = Daniel (aprovador unico, responsavel metodologico), sobre package_id, version e content_hash
 *  - pacote mudou depois da aprovacao -> invalidada; exige nova (voltar ao hash antigo nao ressuscita)
 *  - nenhuma aprovacao automatica: tabela sem escrita direta; o candidato V1 nasce sem registro algum
 *  - nada atribuido a "Liderança do método HOLOSCAN" (aprovacao nem registro de homologacao)
 *  - homologado (aprovado) so com a aprovacao valida; o registro nomeia so Daniel e o regime aprovador_unico
 */
import './guarda-falhas.mjs';
import { readFileSync } from 'node:fs';
import { criarServidor } from './supabase-falso.mjs';
import '../metodologia-motor.js';
import '../metodologia-decisoes-v1.js';

let falhou = false;
const ok = (c, t) => { if (!c) falhou = true; console.log((c ? '  ok    ' : '  FALHA ') + t); };
const titulo = (t) => console.log('\n  ' + t + '\n');
const srv = criarServidor();
const UA = srv.criarConta('a@holo.test', 'x');
const UB = srv.criarConta('b@holo.test', 'x');
const UC = srv.criarConta('c@holo.test', 'x');   // conta autenticada SEM papel de aprovacao
// identidade real — aprovadores configurados por gestao tecnica (nunca pela aplicacao); UA = Daniel (ativo);
// UB = Rodrigo com o papel de etapa 2 DESATIVADO (como no banco real depois da migration 20261003100000)
srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: UA, scope: 'holoscan', approval_stage: 1, display_name: 'Daniel' });
const recusaAtivo = srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: UB, scope: 'holoscan', approval_stage: 2, display_name: 'Rodrigo' });
srv.gestaoTecnica('methodology_approvers', 'insert', { user_id: UB, scope: 'holoscan', approval_stage: 2, display_name: 'Rodrigo', active: false, deactivated_at: '2026-10-03T00:00:00Z', deactivation_reason: 'etapa 2 descontinuada (aprovador unico)' });
const q = (uid, tabela, acao, extra) => srv.tratar({ op: 'query', uid, q: Object.assign({ tabela, acao, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true }, extra) });
const insert = (uid, t, dados) => q(uid, t, 'insert', { dados });
const update = (uid, t, dados, filtros) => q(uid, t, 'update', { dados, filtros });
const del = (uid, t, filtros) => q(uid, t, 'delete', { filtros });
const rpc = (uid, nome, args) => srv.tratar({ op: 'rpc', uid, nome, args });
const eq = (col, val) => [{ op: 'eq', col, val }];
const P = globalThis.PacoteMetodologico, D = globalThis.MetodologiaDecisoesV1;
const aprovar = (id, etapa, resp, h, just, uid) => rpc(uid || UA, 'registrar_aprovacao_metodologica', { p_package_id: id, p_etapa: etapa, p_responsavel: resp, p_justificativa: just === undefined ? 'conferido (teste)' : just, p_content_hash: h });
const hash = (id) => rpc(UA, 'metodologia_hash_conteudo', { p_package_id: id }).data;
const aprovs = (id) => srv.linhas('methodology_package_approvals').filter(a => a.package_id === id);
const status = (id) => srv.linhas('methodology_packages').find(x => x.id === id).status;

/** grava o candidato V1 (como a tela faz: salvarRascunho) com a versao dada */
function gravarCandidato(version) {
  const inv = JSON.parse(readFileSync(new URL('../docs/v1/metodologia/inventario-metodologico-v1.json', import.meta.url), 'utf8'));
  const c = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
  const pk = insert(UA, 'methodology_packages', { code: c.code, version, status: 'em_revisao', origin: c.origin, justification: c.justification, notes: c.notes, lineage: c.lineage, content_hash: c.content_hash }).data[0];
  const ed = insert(UA, 'methodology_questionnaire_editions', Object.assign({}, c.edicao, { package_id: pk.id })).data[0];
  const ins = (t, l) => { if (l.length) { const r = insert(UA, t, l.map(x => Object.assign({}, x, { package_id: pk.id }))); if (r.error) throw new Error(t + ': ' + r.error.message); } };
  ins('methodology_scales', c.escalas); ins('methodology_systems', c.sistemas); ins('methodology_questions', c.perguntas.map(x => Object.assign({}, x, { edition_id: ed.id })));
  ins('methodology_associations', c.associacoes); ins('methodology_ranges', c.faixas); ins('methodology_rules', c.regras); ins('methodology_homologation_records', c.registros);
  return { pk, c };
}

titulo('NADA AUTOMATICO; NADA DA "LIDERANCA"');
const { pk, c } = gravarCandidato(2);
ok(c.registros.length === 0 && srv.linhas('methodology_homologation_records').filter(x => x.package_id === pk.id).length === 0 && aprovs(pk.id).length === 0, 'o candidato V1 nasce sem registro de homologacao e sem aprovacao (nada criado pelo codigo)');
ok(!/lideran/i.test(JSON.stringify(c)) && !('responsavel' in D), 'nenhum registro, decisao ou campo do pacote atribuido a "Liderança do método HOLOSCAN"');
const h = hash(pk.id);
ok(/^[0-9a-f]{64}$/.test(h) && hash(pk.id) === h, 'hash do conteudo calculado no servidor, estavel');
let r = insert(UA, 'methodology_package_approvals', { package_id: pk.id, package_version: 2, content_hash: h, step: 1, role: 'responsavel_primario', responsible: 'Daniel', justification: 'direto' });
ok(r.error && r.error.code === '42501' && aprovs(pk.id).length === 0, 'aprovacao nao entra por escrita direta na tabela (so pela RPC)');
r = aprovar(pk.id, 1, 'Liderança do método HOLOSCAN', h);
ok(r.error && /Liderança/.test(r.error.message) && aprovs(pk.id).length === 0, 'aprovacao atribuida a "Liderança do método HOLOSCAN" recusada');
r = insert(UA, 'methodology_homologation_records', { package_id: pk.id, topic: 'pacote', element: 'x', decision: 'aprovado', responsible: 'Liderança do método HOLOSCAN', decided_at: '2026-10-01' });
ok(r.error && /sem_lideranca/.test(r.error.message), 'registro de homologacao atribuido a "Liderança do método HOLOSCAN" recusado');

titulo('APROVADOR UNICO: PESSOAS');
ok(recusaAtivo.error && /etapa1_ativa/.test(recusaAtivo.error.message) && srv.linhas('methodology_approvers').filter(a => a.approval_stage === 2 && a.active).length === 0, 'cadastro: papel de etapa 2 ATIVO e recusado (so existe como historico desativado)');
ok(/descontinuada/.test(aprovar(pk.id, 2, 'Rodrigo', h, undefined, UB).error.message) && /descontinuada/.test(aprovar(pk.id, 2, 'Rodrigo', h).error.message) && aprovs(pk.id).length === 0, 'Aprovacao 2 descontinuada: recusada para Rodrigo e para Daniel (nenhuma segunda revisao)');
ok(/Daniel/.test(aprovar(pk.id, 1, 'Rodrigo', h).error.message) && /aprovador autorizado/.test(aprovar(pk.id, 1, 'Daniel', h, undefined, UB).error.message), 'Aprovacao so por Daniel; Rodrigo (papel desativado) nao aprova nem digitando Daniel');
ok(/justificativa/.test(aprovar(pk.id, 1, 'Daniel', h, '  ').error.message) && /etapa/.test(aprovar(pk.id, 3, 'Daniel', h).error.message), 'sem justificativa ou com etapa invalida: recusada');
ok(/o pacote mudou/.test(aprovar(pk.id, 1, 'Daniel', '0'.repeat(64)).error.message), 'hash conferido diferente do conteudo atual: recusada');
ok(/Aprovacao \(Daniel\) vigente/.test(rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: { responsible: 'Alguem', justification: 'x' } }).error.message) && status(pk.id) === 'em_revisao', 'homologar sem aprovacao: recusado (o responsavel do chamador nao substitui a aprovacao)');
r = aprovar(pk.id, 1, 'Daniel', h, 'responsavel primario: conteudo conferido (teste)');
const a1 = aprovs(pk.id)[0];
ok(!r.error && a1.step === 1 && a1.responsible === 'Daniel' && a1.role === 'responsavel_primario' && a1.package_version === 2 && a1.content_hash === h && a1.approved_by === UA && a1.approver_id && status(pk.id) === 'em_revisao', 'Aprovacao (Daniel, step 1, responsavel_primario) registrada com package_id, version e hash; pacote continua em_revisao (homologar e ato separado)');
ok(/ja registrada/.test(aprovar(pk.id, 1, 'Daniel', h).error.message), 'Aprovacao repetida: recusada');
ok(/aprovador autorizado/.test(rpc(UC, 'registrar_aprovacao_metodologica', { p_package_id: pk.id, p_etapa: 1, p_responsavel: 'Daniel', p_justificativa: 'x', p_content_hash: h }).error.message) && aprovs(pk.id).length === 1, 'conta sem papel nao se passa por Daniel (identidade real pelo uid)');
ok(/aprovador unico ativo/.test(rpc(UB, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: {} }).error.message) && /aprovador unico ativo/.test(rpc(UC, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: {} }).error.message) && status(pk.id) === 'em_revisao', 'homologar: Rodrigo (desativado) e conta sem papel recusados (exige aprovador ativo holoscan/1)');

titulo('PACOTE MUDOU ENTRE AS APROVACOES');
const faixa = srv.linhas('methodology_ranges').find(f => f.package_id === pk.id && f.destination_id === 'fungico' && f.label === 'baixa');
update(UA, 'methodology_ranges', { message_nutri: faixa.message_nutri + ' ' }, eq('id', faixa.id));
ok(aprovs(pk.id)[0].invalidated_at && /methodology_ranges/.test(aprovs(pk.id)[0].invalidated_reason), 'mudanca de conteudo depois da Aprovacao: invalidada (historico mantido, com motivo)');
const h2 = hash(pk.id);
ok(h2 !== h && /Aprovacao \(Daniel\) vigente/.test(rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: {} }).error.message), 'homologar recusado: exige nova Aprovacao sobre o conteudo atual');
update(UA, 'methodology_ranges', { message_nutri: faixa.message_nutri.trimEnd() }, eq('id', faixa.id));
ok(hash(pk.id) === h && rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: {} }).error && status(pk.id) === 'em_revisao', 'voltar ao mesmo hash nao ressuscita a Aprovacao invalidada');
aprovar(pk.id, 1, 'Daniel', h);
update(UA, 'methodology_packages', { version: 3 }, eq('id', pk.id));
ok(aprovs(pk.id).filter(a => !a.invalidated_at).length === 0, 'mudanca de versao depois da aprovacao: invalidada');
ok(rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: {} }).error && status(pk.id) === 'em_revisao', 'aprovacao de outra versao nao homologa');
update(UA, 'methodology_packages', { version: 2 }, eq('id', pk.id));
const assoc = srv.linhas('methodology_associations').find(a => a.package_id === pk.id);
aprovar(pk.id, 1, 'Daniel', h); del(UA, 'methodology_associations', eq('id', assoc.id));
ok(aprovs(pk.id).filter(a => !a.invalidated_at).length === 0, 'apagar uma associacao tambem invalida a aprovacao');
insert(UA, 'methodology_associations', Object.assign({}, assoc, { id: undefined }));
ok(hash(pk.id) === h, 'conteudo restaurado (mesmo hash)');

titulo('CICLO VALIDO E HOMOLOGACAO');
const e0 = P.estadoAprovacao(Object.assign({}, srv.linhas('methodology_packages').find(x => x.id === pk.id), { aprovacoes: aprovs(pk.id) }), h);
ok(e0.proxima === 1 && !e0.homologavel && e0.invalidadas === 3 && e0.regime === 'aprovador_unico' && !('aprovacao2' in e0) && !('valida2' in e0), 'estado do ciclo na tela: proxima = Aprovacao; 3 invalidadas no historico; nenhum campo de segunda revisao');
r = aprovar(pk.id, 1, 'Daniel', h, 'aprovador unico: conteudo conferido (teste)');
const pkLinha = srv.linhas('methodology_packages').find(x => x.id === pk.id);
const e2 = P.estadoAprovacao(Object.assign({}, pkLinha, { aprovacoes: aprovs(pk.id) }), h);
const vig = aprovs(pk.id).filter(a => !a.invalidated_at);
ok(!r.error && r.data.regime === 'aprovador_unico' && vig.length === 1 && vig[0].step === 1 && vig[0].package_version === 2 && vig[0].content_hash === h && e2.valida1 && e2.homologavel && e2.proxima === 'homologar' && status(pk.id) === 'em_revisao', 'uma unica Aprovacao (Daniel) valida sobre package_id, version e content_hash: proxima = Homologar; o pacote so muda quando homologado');
ok(!P.estadoAprovacao(Object.assign({}, pkLinha, { aprovacoes: aprovs(pk.id) }), '1'.repeat(64)).homologavel, 'estado do ciclo: hash diferente do aprovado nao e homologavel');
r = rpc(UA, 'aprovar_pacote_metodologico', { p_package_id: pk.id, p_registro: { responsible: 'Liderança do método HOLOSCAN', justification: 'tentativa' } });
const reg = srv.linhas('methodology_homologation_records').filter(x => x.package_id === pk.id);
const pk2 = srv.linhas('methodology_packages').find(x => x.id === pk.id);
ok(!r.error && pk2.status === 'aprovado' && pk2.content_hash === h && r.data.aprovacao_1 === vig[0].id && !('aprovacao_2' in r.data) && r.data.regime === 'aprovador_unico', 'homologado: status aprovado com o content_hash aprovado por Daniel; resposta sem aprovacao_2');
ok(pk2.governance_regime === 'aprovador_unico' && pk2.reviewed_by === null && pk2.reviewed_at === null && pk2.approved_by === UA, 'regime aprovador_unico registrado; reviewed_by/reviewed_at NULOS (nenhuma segunda revisao simulada); approved_by = Daniel');
ok(reg.length === 1 && /^Daniel/.test(reg[0].responsible) && !/Rodrigo/.test(reg[0].responsible + pk2.responsible) && /^Daniel/.test(pk2.responsible) && !/lideran/i.test(reg[0].responsible + pk2.responsible) && reg[0].source === 'aprovador unico' && /aprovador_unico/.test(reg[0].evidence) && reg[0].evidence.includes(h), 'registro de homologacao e responsavel do pacote = Daniel (aprovador unico; o "responsible" do chamador e ignorado); evidencia com o regime e o hash');
ok(aprovs(pk.id).length === 4 && aprovs(pk.id).filter(a => a.invalidated_at).length === 3 && aprovs(pk.id).every(a => a.step === 1), 'historico completo: 4 aprovacoes (3 invalidadas, 1 que homologou), todas de etapa 1');
ok(update(UA, 'methodology_package_approvals', { responsible: 'X' }, eq('package_id', pk.id)).error && del(UA, 'methodology_package_approvals', eq('package_id', pk.id)).error, 'aprovacao nao e editavel nem apagavel');
ok(/so um pacote em_revisao/.test(aprovar(pk.id, 1, 'Daniel', h).error.message), 'pacote homologado nao recebe nova aprovacao (mudanca exige nova versao)');

console.log('\n  RESULTADO: ' + (falhou ? 'VERMELHO' : 'VERDE'));
process.exit(falhou ? 1 : 0);
