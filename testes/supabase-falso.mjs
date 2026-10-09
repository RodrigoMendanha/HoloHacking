/**
 * SUPABASE FALSO — um "servidor" em memoria, no processo do Node, com a
 * semantica que importa do projeto real (supabase/migrations/):
 *
 *   - Auth: contas por e-mail/senha, sessao em localStorage do contexto;
 *   - RLS: toda tabela com nutritionist_id so mostra/altera linhas de
 *     auth.uid(); filhas (answers, scores, results) pelo dono da mae;
 *   - esquema ESTRITO: coluna que nao existe na migration e erro, como no
 *     PostgREST — o teste nao passa com payload que o banco real recusaria;
 *   - FKs: (patient_id, nutritionist_id) → patients; DELETE de paciente com
 *     filho e RESTRICT; application/collection apagam filhas em CASCADE;
 *   - RPCs salvar_holoscan_completo e salvar_coleta_exames como no SQL;
 *   - Storage: buckets privados, primeiro segmento do caminho = uid;
 *   - PostgREST devolve no maximo `maxLinhas` (1000) por pedido.
 *
 * Cada pagina recebe a biblioteca falsa no lugar do supabase-js do CDN
 * (interceptacao de rede) e fala com o servidor por page.exposeFunction.
 * Dois contextos de navegador diferentes = dois "computadores" com o mesmo
 * servidor: localStorage e IndexedDB separados, banco compartilhado.
 *
 * Falhas sob medida: servidor.falhar.push({ tabela, acao }) — acao em
 * select|insert|update|delete|upsert|rpc|upload|download|remove. `vezes`
 * opcional (padrao: sempre, ate remover).
 */

import { randomUUID, createHash } from 'node:crypto';
import { criarResultadoHolos } from './resultado-holos-falso.mjs';
import { criarRevisaoPerguntas } from './revisao-perguntas-falso.mjs';   // revisao das perguntas (migration 20261010100000)   // Resultado HOLOS (migration 20261009100000)
import '../metodologia-pacote.js';   // o MESMO validador de publicacao do navegador (Etapa 4)
import '../laboratorio-catalogo.js';  // os MESMOS 45 exames-base da migration 20261001220000 (Etapa 5)
import '../leitura-integrada-pacote-v1.js';
import { IDS_REGISTRO, erroRegistro, erroConcluido } from './registro-formato.mjs';   // Etapa 6.5 B: o formato lido da migration 20261005110000   // o MESMO conteudo LI-V1@2 da migration 20261002120000 (Etapa 6)

const COLUNAS = {
  patients: ['id', 'nutritionist_id', 'nome', 'nascimento', 'telefone', 'email', 'sexo', 'inicio', 'queixa', 'status', 'created_at', 'updated_at'],
  consultations: ['id', 'nutritionist_id', 'patient_id', 'data', 'hora', 'duracao_min', 'tipo', 'nota', 'cancelled_at', 'cancellation_reason', 'rescheduled_from_id', 'rescheduled_to_id', 'created_at', 'updated_at'],
  // V1 Etapa 1: o atendimento clinico (migration 20260930160000)
  encounters: ['id', 'nutritionist_id', 'patient_id', 'consultation_id', 'occurred_at', 'timezone', 'type', 'modality', 'status', 'summary_text', 'operation_id', 'created_at', 'updated_at'],
  // V1 Etapa 2 (migration 20260930170000)
  anamneses: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'revision_number', 'status', 'content_version', 'content', 'source_anamnesis_id', 'copied_from_previous', 'supersedes_id', 'superseded_at', 'revision_note', 'reviewed_at', 'reviewed_by', 'operation_id', 'created_at', 'updated_at'],
  conducts: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'revision_number', 'status', 'priorities', 'objective', 'nutrition_strategy', 'actions', 'resources', 'related_tools', 'requested_exams', 'referrals', 'monitoring', 'return_plan', 'observations', 'nutrition_diagnosis', 'dietary_prescription', 'professional_guidance', 'references', 'previous_conduct_id', 'previous_decision', 'previous_decision_note', 'supersedes_id', 'superseded_at', 'revision_note', 'reviewed_at', 'reviewed_by', 'operation_id', 'created_at', 'updated_at'],
  agreements: ['id', 'nutritionist_id', 'patient_id', 'conduct_id', 'description', 'responsible', 'due_text', 'follow_up', 'status', 'status_note', 'status_changed_at', 'position', 'origin_agreement_id', 'operation_id', 'created_at', 'updated_at'],
  // V1 Etapa 3 (migration 20260930180000): emissoes versionadas de relatorio
  report_emissions: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'report_type', 'revision_number', 'status', 'title', 'period_start', 'period_end', 'selected_sources', 'professional_text', 'source_snapshot', 'content_snapshot', 'content_hash', 'template_version', 'issued_at', 'created_by', 'supersedes_report_id', 'superseded_at', 'operation_id', 'created_at', 'updated_at'],
  // V1 Etapa 4 (migration 20260930190000): Pacote Metodologico
  methodology_packages: ['id', 'nutritionist_id', 'code', 'version', 'status', 'origin', 'justification', 'responsible', 'governance_regime', 'reviewed_by', 'reviewed_at', 'effective_from', 'effective_to', 'content_hash', 'approved_at', 'approved_by', 'retired_at', 'retired_reason', 'notes', 'created_by', 'created_at', 'updated_at', 'lineage'],
  methodology_questionnaire_editions: ['id', 'nutritionist_id', 'package_id', 'code', 'version', 'status', 'item_count', 'notes', 'created_at', 'updated_at'],
  methodology_scales: ['id', 'nutritionist_id', 'package_id', 'code', 'min_value', 'max_value', 'labels', 'kind', 'status', 'source', 'notes', 'created_at', 'updated_at'],
  methodology_systems: ['id', 'nutritionist_id', 'package_id', 'code', 'name', 'public_text', 'definition', 'emotional_pattern', 'spiritual_impact', 'color', 'position', 'status', 'source', 'notes', 'created_at', 'updated_at', 'legacy'],
  methodology_questions: ['id', 'nutritionist_id', 'package_id', 'edition_id', 'stable_id', 'statement', 'block', 'scale_code', 'response_labels', 'orientation', 'temporal_context', 'status', 'source', 'notes', 'version', 'position', 'created_at', 'updated_at'],
  methodology_associations: ['id', 'nutritionist_id', 'package_id', 'question_stable_id', 'destination_type', 'destination_id', 'weight', 'role', 'status', 'source', 'conflict', 'conflict_note', 'created_at', 'updated_at', 'legacy'],
  methodology_ranges: ['id', 'nutritionist_id', 'package_id', 'destination_type', 'destination_id', 'lower_bound', 'upper_bound', 'lower_inclusive', 'upper_inclusive', 'label', 'message_nutri', 'message_paciente', 'status', 'source', 'created_at', 'updated_at', 'legacy', 'lower_bound_exact', 'upper_bound_exact'],
  methodology_rules: ['id', 'nutritionist_id', 'package_id', 'rule_type', 'target', 'payload', 'status', 'source', 'notes', 'created_at', 'updated_at'],
  methodology_homologation_records: ['id', 'nutritionist_id', 'package_id', 'topic', 'element', 'version', 'decision', 'responsible', 'decided_at', 'source', 'justification', 'evidence', 'created_by', 'created_at'],
  // dupla aprovacao (migration 20261001210000): so a RPC escreve
  methodology_package_approvals: ['id', 'nutritionist_id', 'package_id', 'package_version', 'content_hash', 'step', 'role', 'responsible', 'justification', 'approved_by', 'approved_at', 'invalidated_at', 'invalidated_reason', 'created_at', 'approver_id'],
  methodology_approvers: ['id', 'user_id', 'scope', 'approval_stage', 'display_name', 'active', 'notes', 'created_at', 'created_by', 'deactivated_at', 'deactivation_reason'],
  schedule_blocks: ['id', 'nutritionist_id', 'data', 'inicio', 'fim', 'dia_todo', 'motivo', 'created_at', 'updated_at'],
  holoscan_applications: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'quando', 'versao_estrutura', 'versao_bancos', 'indice', 'indice_maximo', 'avaliavel', 'nota_media', 'triada', 'triada_com_dado', 'cobertura', 'combinacoes', 'aprofundamentos', 'interpretacao_texto', 'interpretacao_em', 'interpretacao_versao', 'created_at', 'updated_at', 'methodology_package_id', 'methodology_package_version', 'methodology_content_hash', 'engine_version', 'engine_contract_version', 'calculation_mode'],
  holoscan_answers: ['id', 'application_id', 'marcador_id', 'valor', 'created_at'],
  holoscan_system_scores: ['id', 'application_id', 'sistema', 'nome', 'nota', 'carga', 'faixa', 'obtido', 'maximo', 'respondidos', 'total_marcadores', 'avaliavel', 'created_at'],
  // V1 Etapa 5 (migration 20261001220000): coletas/resultados evoluidos + laboratorio + Leitura Integrada
  lab_collections: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'coletado_em', 'data_coleta_desconhecida', 'laboratorio', 'observacao', 'created_at', 'updated_at',
    'clinical_time', 'state', 'source', 'operation_id', 'revision', 'created_by', 'reviewed_at', 'reviewed_by', 'revision_note', 'supersedes_id', 'superseded_at', 'document_id'],
  lab_results: ['id', 'collection_id', 'exame_id', 'valor', 'unidade_no_momento', 'ideal_min_no_momento', 'ideal_max_no_momento', 'nome_exame_no_momento', 'sistema_no_momento', 'created_at',
    'exam_code', 'custom_exam_id', 'variant', 'value_original_text', 'numeric_value', 'qualifier', 'censor_limit', 'unit_original', 'method', 'material', 'report_reference_text', 'report_reference_min', 'report_reference_max',
    'report_reference_operator', 'report_reference_unit', 'report_reference_population', 'reference_status', 'reference_source', 'origin', 'notes', 'result_date', 'legacy_exame_id', 'legacy_ideal_min', 'legacy_ideal_max', 'legacy_sistema',
    'requires_manual_mapping', 'mapping_note', 'position', 'updated_at'],
  lab_exam_catalog: ['code', 'position', 'canonical_name', 'category', 'aliases', 'composite', 'status', 'catalog_version', 'created_at'],
  lab_custom_exams: ['id', 'nutritionist_id', 'name', 'aliases', 'notes', 'status', 'created_by', 'created_at', 'updated_at'],
  lab_result_components: ['id', 'result_id', 'position', 'original_name', 'canonical_component_key', 'value_original_text', 'numeric_value', 'qualifier', 'censor_limit', 'unit_original', 'report_reference_text', 'report_reference_min', 'report_reference_max', 'report_reference_operator', 'notes', 'created_at'],
  lab_method_references: ['id', 'exam_code', 'variant', 'material', 'method', 'population', 'sex', 'age_min', 'age_max', 'context', 'lower_bound', 'upper_bound', 'operator', 'unit', 'source', 'source_version', 'justification', 'effective_from', 'effective_to', 'status', 'responsible', 'approval_provenance', 'content_hash', 'version', 'created_at'],
  lab_unit_conversion_rules: ['id', 'exam_code', 'from_unit', 'to_unit', 'factor', 'source', 'rule_version', 'status', 'responsible', 'approval_provenance', 'created_at'],
  lab_derived_calculations: ['id', 'code', 'formula', 'formula_version', 'inputs', 'required_units', 'criteria', 'source', 'status', 'responsible', 'approval_provenance', 'created_at'],
  integrated_reading_rule_packages: ['id', 'code', 'version', 'status', 'notes', 'content_hash', 'responsible', 'approval_provenance', 'created_at'],
  integrated_reading_domains: ['id', 'package_id', 'code', 'name', 'holoscan_system', 'status', 'created_at', 'definition', 'holoscan_mapping_mode', 'position'],
  integrated_reading_exam_domain_links: ['id', 'package_id', 'domain_id', 'exam_code', 'variant', 'material', 'direction', 'reference_id', 'status', 'created_at', 'cross_source_role', 'direction_rules', 'variants_declared', 'version', 'source', 'justification'],
  integrated_reading_rules: ['id', 'package_id', 'rule_type', 'target', 'payload', 'status', 'created_at'],
  integrated_reading_package_dependencies: ['id', 'package_id', 'kind', 'ref_id', 'status', 'created_at'],
  integrated_reading_package_approvals: ['id', 'package_id', 'package_version', 'content_hash', 'step', 'role', 'responsible', 'justification', 'approved_by', 'approved_at', 'invalidated_at', 'invalidated_reason', 'created_at', 'approver_id'],
  integrated_reading_package_snapshots: ['id', 'package_id', 'package_version', 'content_hash', 'snapshot', 'approval_1', 'approval_2', 'homologated_by', 'homologated_at', 'governance_regime'],
  integrated_readings: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'responsible', 'clinical_context', 'holoscan_application_id', 'selected_collection_ids', 'selected_result_ids', 'references_snapshot', 'sources_snapshot', 'rule_package_id', 'rule_version', 'engine_version', 'state', 'reason_codes', 'trace', 'professional_note', 'revision', 'supersedes_id', 'superseded_at', 'content_hash', 'created_by', 'created_at', 'domain_code', 'holoscan_direction', 'laboratory_direction', 'snapshot'],
  tool_applications: ['id', 'nutritionist_id', 'patient_id', 'consultation_id', 'encounter_id', 'ferramenta_id', 'versao_ferramenta', 'origem_legada', 'status', 'iniciada_em', 'concluida_em', 'atualizada_em', 'respostas', 'resultado', 'leitura', 'prioridade', 'proximo_passo', 'created_at', 'updated_at'],
  documents: ['id', 'nutritionist_id', 'patient_id', 'nome', 'tipo', 'data_documento', 'mime_type', 'tamanho_bytes', 'storage_path', 'origem_local', 'created_at', 'updated_at',
    'titulo', 'observacao', 'arquivado_em', 'arquivado_por'],   // prontuario (20261011100000)
  professional_assets: ['id', 'nutritionist_id', 'tipo', 'nome', 'mime_type', 'tamanho_bytes', 'storage_path', 'created_at', 'updated_at'],
  profiles: null,          // nao estrito: o perfil nao e o assunto destes testes
  ai_threads: ['id', 'nutritionist_id', 'patient_id', 'titulo', 'created_at', 'updated_at'],
  ai_messages: ['id', 'thread_id', 'role', 'content', 'metadata', 'created_at'],
  /* Resultado HOLOS (migration 20261009100000): leitura so da propria; escrita SO pelas RPCs (resultado-holos-falso.mjs) */
  holos_results: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'status', 'revision_number', 'supersedes_id', 'superseded_at', 'holoscan_application_id',
    'selected_sources', 'leitura_profissional', 'pontos_acompanhar', 'questoes_aprofundar', 'content_snapshot', 'source_snapshot', 'content_hash', 'template_version',
    'methodology_package_id', 'methodology_package_version', 'methodology_content_hash', 'operation_id', 'saved_at', 'reviewed_at', 'reviewed_by', 'created_at', 'updated_at']
};

const METODOLOGIA = ['methodology_packages', 'methodology_questionnaire_editions', 'methodology_scales', 'methodology_systems', 'methodology_questions', 'methodology_associations', 'methodology_ranges', 'methodology_rules', 'methodology_homologation_records'];
const FILHAS_PACOTE = METODOLOGIA.filter(t => t !== 'methodology_packages');
const GLOBAIS_SO_LEITURA = ['lab_exam_catalog', 'lab_method_references', 'lab_unit_conversion_rules', 'lab_derived_calculations', 'integrated_reading_rule_packages', 'integrated_reading_domains', 'integrated_reading_exam_domain_links', 'integrated_reading_rules',
  'integrated_reading_package_dependencies', 'integrated_reading_package_approvals', 'integrated_reading_package_snapshots'];   // Etapa 5.2: aprovacoes so pela RPC
const DONO_DIRETO = [...METODOLOGIA, 'methodology_package_approvals', 'lab_custom_exams', 'integrated_readings', 'patients', 'consultations', 'encounters', 'anamneses', 'conducts', 'agreements', 'report_emissions', 'schedule_blocks', 'holoscan_applications',
  'lab_collections', 'tool_applications', 'documents', 'professional_assets', 'ai_threads', 'holos_results'];
const FILHAS = {           // tabela -> [coluna, mae]
  holoscan_answers: ['application_id', 'holoscan_applications'],
  holoscan_system_scores: ['application_id', 'holoscan_applications'],
  lab_results: ['collection_id', 'lab_collections'],
  lab_result_components: ['result_id', 'lab_results'],
  ai_messages: ['thread_id', 'ai_threads']
};
const COM_PACIENTE = ['consultations', 'encounters', 'anamneses', 'conducts', 'agreements', 'report_emissions', 'holoscan_applications', 'lab_collections', 'integrated_readings', 'tool_applications', 'documents', 'ai_threads'];
const DOMINIOS_AN = ['motivo_objetivo','historia_alimentar','rotina_acesso','sono','atividade_fisica','sintomas_relatados','condicoes_diagnosticos_informados','medicamentos','suplementos','alergias_informadas','intolerancias_informadas','antecedentes','contexto_familiar','contexto_social','avaliacoes','medidas','emocional','sentido_pessoal'];
const ESTADOS_AN = ['informado','negado_explicitamente','desconhecido','nao_investigado','nao_aplicavel','recusado'];
const ORIGENS_AN = ['relato_paciente','observacao_profissional','documento_externo','dado_medido'];
const ESTADOS_ACORDO = ['proposto','acordado','em_acompanhamento','concluido','revisto','encerrado'];
// validar_conteudo_anamnese (CHECK): estado e origem obrigatorios; medida com unidade; vazio e valido
function conteudoAnamneseValido(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
  if (c.dominios === undefined || c.dominios === null) return true;
  if (typeof c.dominios !== 'object' || Array.isArray(c.dominios)) return false;
  for (const [k, v] of Object.entries(c.dominios)) {
    if (!DOMINIOS_AN.includes(k)) return false;
    if (!v || typeof v !== 'object' || !Array.isArray(v.itens)) return false;
    for (const it of v.itens) {
      if (!it || typeof it !== 'object') return false;
      if (!ESTADOS_AN.includes(it.estado)) return false;
      if (!ORIGENS_AN.includes(it.origem)) return false;
      if (it.medida !== undefined && it.medida !== null) {
        if (typeof it.medida !== 'object') return false;
        if (it.medida.valor !== undefined && it.medida.valor !== null && !(it.medida.unidade && String(it.medida.unidade).trim())) return false;
      }
    }
  }
  return true;
}
// V1 Etapa 1: tabelas com encounter_id e FK composta (encounter_id, patient_id, nutritionist_id)
const COM_ENCOUNTER = ['holoscan_applications', 'tool_applications', 'lab_collections', 'integrated_readings'];
const UNICAS = {           // uniques alem da PK, como nas migrations
  lab_results: [['collection_id', 'exame_id']],
  lab_collections: [['nutritionist_id', 'operation_id']]
};
// dono(): lab_result_components e filha de lab_results (que e filha de lab_collections)

const FERRAMENTAS = ['oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro'].concat(IDS_REGISTRO);

const erro = (message, code) => ({ data: null, error: { message, code: code || 'XX000' } });
const agora = () => new Date().toISOString();
const copia = (x) => JSON.parse(JSON.stringify(x));

export function criarServidor() {
  const s = {
    contas: {},                        // email -> { senha, id }
    tabelas: Object.fromEntries(Object.keys(COLUNAS).map(t => [t, []])),
    storage: { 'patient-documents': {}, 'professional-assets': {} },
    falhar: [],
    aprovacaoRpc: null,
    log: [],
    maxLinhas: 1000,
    relogio: 0
  };

  // V1 Etapa 5: catalogo-base (45) e pacote LI-V1 sao configuracao global semeada pela migration
  if (globalThis.LabCatalogo) globalThis.LabCatalogo.linhasSeed().forEach(e => s.tabelas.lab_exam_catalog.push({ code: e.code, position: e.position, canonical_name: e.canonical_name, category: e.category, aliases: e.aliases, composite: e.composite, status: 'ativo', catalog_version: globalThis.LabCatalogo.VERSAO, created_at: agora() }));
  s.tabelas.integrated_reading_rule_packages.push({ id: randomUUID(), code: 'LI-V1', version: 1, status: 'rascunho', notes: 'Infraestrutura da Etapa 5: sem dominio, vinculo ou regra aprovados.', content_hash: null, responsible: null, approval_provenance: null, created_at: agora() });
  /* Etapa 6.0 (migration 20261002120000): LI-V1@2 em_revisao com o conteudo decidido — IDENTICO a leitura-integrada-pacote-v1.js.
     Nenhuma aprovacao, nenhum snapshot: a homologacao e ato humano (aprovador unico: Daniel). */
  (function seedLIV2() {
    const PK = globalThis.LeituraIntegradaPacoteV1; if (!PK) return;
    const pk = PK.pacote(); const pid = randomUUID();
    s.tabelas.integrated_reading_rule_packages.push({ id: pid, code: pk.code, version: pk.version, status: pk.status, notes: 'Etapa 6.0: conteudo metodologico decidido nas Etapas 5.4-5.13. Candidato em revisao: 0 aprovacoes, nao homologado.', content_hash: null, responsible: null, approval_provenance: null, created_at: agora() });
    const domIds = {};
    pk.domains.forEach(d => { const id = randomUUID(); domIds[d.code] = id; s.tabelas.integrated_reading_domains.push({ id, package_id: pid, code: d.code, name: d.name, definition: d.definition, holoscan_mapping_mode: d.holoscan_mapping_mode, holoscan_system: d.holoscan_system, position: d.position, status: 'aprovado', created_at: agora() }); });
    pk.links.forEach(l => s.tabelas.integrated_reading_exam_domain_links.push({ id: randomUUID(), package_id: pid, domain_id: domIds[l.domain], exam_code: l.exam_code, variant: null, material: null, direction: l.direction, reference_id: null, cross_source_role: l.cross_source_role, direction_rules: l.direction_rules, variants_declared: l.variants_declared, version: l.version, source: l.source, justification: l.justification, status: 'aprovado', created_at: agora() }));
    pk.rules.forEach(r => s.tabelas.integrated_reading_rules.push({ id: randomUUID(), package_id: pid, rule_type: r.rule_type, target: r.target, payload: JSON.parse(JSON.stringify(r.payload)), status: 'aprovado', created_at: agora() }));
  })();
  s.labRpc = null;
  s.criarConta = (email, senha, id) => {
    s.contas[email] = { senha, id: id || randomUUID() };
    return s.contas[email].id;
  };
  /* Cadastro pelo app (migration 20261008100000): auth.signUp cria a conta e o
     gatilho lidar_novo_usuario cria o perfil PENDENTE com nome/telefone/e-mail.
     Contas criadas por criarConta() (as dos testes antigos) nao tem perfil e
     contam como ativas — como as contas reais anteriores ao cadastro. */
  s.administradores = [];
  s.tornarAdmin = (uid) => { if (!s.administradores.includes(uid)) s.administradores.push(uid); };
  function statusConta(uid) {
    const p = s.tabelas.profiles.find(x => x.id === uid);
    return p && p.status ? p.status : 'ativo';
  }
  s.statusConta = statusConta;
  function cadastrar(msg) {
    if (s.contas[msg.email]) return erro('User already registered', 'user_already_exists');
    if (!msg.password || msg.password.length < 6) return erro('Password should be at least 6 characters.', 'weak_password');
    const id = s.criarConta(msg.email, msg.password);
    const meta = msg.data || {};
    s.tabelas.profiles.push({ id, nome: (meta.nome || '').trim() || msg.email, telefone: String(meta.telefone || '').replace(/\D/g, '') || null,
      email_contato: msg.email, status: 'pendente', aprovado_em: null, aprovado_por: null, created_at: agora(), updated_at: agora() });
    return { data: { id }, error: null };
  }

  function carimbo() {
    // estritamente crescente: created_at desempata ordem de insercao
    s.relogio = Math.max(Date.now(), s.relogio + 1);
    return new Date(s.relogio).toISOString();
  }

  function deveFalhar(tabela, acao) {
    const i = s.falhar.findIndex(f => (!f.tabela || f.tabela === tabela) && (!f.acao || f.acao === acao));
    if (i < 0) return false;
    const f = s.falhar[i];
    if (typeof f.vezes === 'number') { f.vezes--; if (f.vezes <= 0) s.falhar.splice(i, 1); }
    return true;
  }

  function dono(tabela, linha) {
    if (tabela === 'profiles') return linha.id;
    if (DONO_DIRETO.includes(tabela)) return linha.nutritionist_id;
    const f = FILHAS[tabela];
    if (f) {
      const mae = s.tabelas[f[1]].find(m => m.id === linha[f[0]]);
      return mae ? dono(f[1], mae) : null;
    }
    return null;
  }

  function pacoteDe(id) { return s.tabelas.methodology_packages.find(p => p.id === id); }
  /* Etapa 5.3: identidade real da dupla aprovacao — quem (auth user) e aprovador de qual escopo e etapa (methodology_approvers,
     configurada so por gestao tecnica: s.gestaoTecnica). O nome e display; a autorizacao e pelo uid. */
  const aprovador = (uid, scope, stage) => s.tabelas.methodology_approvers.find(a => a.user_id === uid && a.scope === scope && a.approval_stage === stage && a.active) || null;
  const ehAprovador = (uid, scope) => s.tabelas.methodology_approvers.some(a => a.user_id === uid && a.scope === scope && a.active);
  function visiveis(tabela, uid) {
    return s.tabelas[tabela].filter(l => {
      if (dono(tabela, l) === uid) return true;
      // RLS da Etapa 4: pacote aprovado/retirado (e suas filhas) e legivel por qualquer autenticado
      if (GLOBAIS_SO_LEITURA.includes(tabela)) return true;
      if (tabela === 'methodology_approvers') return l.user_id === uid;   // Etapa 5.3: cada conta le so os proprios papeis
      // Etapa 5.3: aprovador autorizado do HOLOSCAN le o pacote em_revisao de outro profissional (para conferir o hash)
      if (tabela === 'methodology_packages') return ['aprovado', 'retirado'].includes(l.status) || (l.status === 'em_revisao' && ehAprovador(uid, 'holoscan'));
      if (FILHAS_PACOTE.includes(tabela) || tabela === 'methodology_package_approvals') { const p = pacoteDe(l.package_id); return !!p && (['aprovado', 'retirado'].includes(p.status) || (p.status === 'em_revisao' && ehAprovador(uid, 'holoscan'))); }
      return false;
    });
  }

  function validarColunas(tabela, obj) {
    const cols = COLUNAS[tabela];
    if (!cols) return null;
    for (const k of Object.keys(obj)) {
      if (!cols.includes(k)) return erro(`Could not find the '${k}' column of '${tabela}' in the schema cache`, 'PGRST204');
    }
    return null;
  }

  function pacienteDe(uid, pid) {
    return s.tabelas.patients.find(p => p.id === pid && p.nutritionist_id === uid);
  }

  // trigger bloquear_escrita_paciente_arquivado (rodada 08, onda 4)
  const GUARDA_ARQUIVADO = ['consultations', 'encounters', 'anamneses', 'conducts', 'agreements', 'report_emissions', 'holoscan_applications', 'lab_collections', 'lab_results',
                            'lab_result_components', 'integrated_readings', 'tool_applications', 'documents'];
  function erroArquivado(tabela, linha) {
    if (!GUARDA_ARQUIVADO.includes(tabela)) return null;
    let pid = linha.patient_id;
    if (tabela === 'lab_results') {
      const c = s.tabelas.lab_collections.find(x => x.id === linha.collection_id);
      pid = c && c.patient_id;
    }
    if (tabela === 'lab_result_components') {
      const r = s.tabelas.lab_results.find(x => x.id === linha.result_id);
      const c = r && s.tabelas.lab_collections.find(x => x.id === r.collection_id);
      pid = c && c.patient_id;
    }
    const p = pid && s.tabelas.patients.find(x => x.id === pid);
    if (p && p.status === 'inativo') {
      return erro('paciente arquivado: reative antes de registrar novas informacoes', 'P0001');
    }
    return null;
  }

  function checarLinha(tabela, linha, uid) {
    const e = validarColunas(tabela, linha);
    if (e) return e;
    const arq = erroArquivado(tabela, linha);
    if (arq) return arq;
    if (DONO_DIRETO.includes(tabela) && linha.nutritionist_id !== uid) {
      return erro('new row violates row-level security policy for table "' + tabela + '"', '42501');
    }
    const f = FILHAS[tabela];
    if (f) {
      const mae = s.tabelas[f[1]].find(m => m.id === linha[f[0]]);
      if (!mae || dono(f[1], mae) !== uid) return erro('new row violates row-level security policy', '42501');
    }
    if (COM_PACIENTE.includes(tabela) && !pacienteDe(uid, linha.patient_id)) {
      return erro('insert or update on table "' + tabela + '" violates foreign key constraint', '23503');
    }
    if (tabela === 'tool_applications') {
      if (!FERRAMENTAS.includes(linha.ferramenta_id)) return erro('violates check constraint "tool_applications_ferramenta_valida"', '23514');
      if (!['rascunho', 'concluida', 'revisada'].includes(linha.status)) return erro('violates check constraint "tool_applications_status_valido"', '23514');
      if (linha.consultation_id) {
        const c = s.tabelas.consultations.find(x => x.id === linha.consultation_id &&
          x.patient_id === linha.patient_id && x.nutritionist_id === uid);
        if (!c) return erro('violates foreign key constraint "tool_applications_consultation_fk"', '23503');
      }
      // trigger validar_registro_clinico (Etapa 6.5 B): so os 3 registros clinicos estruturados
      const er = erroRegistro(linha, (oid) => s.tabelas.tool_applications.some(x => x.id === oid && x.id !== linha.id &&
        x.patient_id === linha.patient_id && x.nutritionist_id === uid && x.ferramenta_id === linha.ferramenta_id));
      if (er) return { data: null, error: { message: er[0], code: 'P0001', hint: er[1] } };
    }
    if (tabela === 'encounters') {
      if (!linha.occurred_at) return erro('null value in column "occurred_at" violates not-null constraint', '23502');
      if (linha.consultation_id) {
        const c = s.tabelas.consultations.find(x => x.id === linha.consultation_id &&
          x.patient_id === linha.patient_id && x.nutritionist_id === uid);
        if (!c) return erro('violates foreign key constraint "encounters_consultation_fk"', '23503');
      }
      if (linha.operation_id && s.tabelas.encounters.some(x => x.id !== linha.id && x.nutritionist_id === uid && x.operation_id === linha.operation_id)) {
        return erro('duplicate key value violates unique constraint "encounters_operation_unique"', '23505');
      }
    }
    if (tabela === 'anamneses' || tabela === 'conducts') {
      if (!linha.encounter_id) return erro('null value in column "encounter_id" violates not-null constraint', '23502');
      const e = s.tabelas.encounters.find(x => x.id === linha.encounter_id && x.patient_id === linha.patient_id && x.nutritionist_id === uid);
      if (!e) return erro('violates foreign key constraint "' + tabela + '_encounter_fk"', '23503');
      if (!['rascunho', 'salvo', 'revisado'].includes(linha.status)) return erro('violates check constraint "' + tabela + '_status_valido"', '23514');
      if (s.tabelas[tabela].some(x => x.id !== linha.id && x.encounter_id === linha.encounter_id && x.revision_number === linha.revision_number)) {
        return erro('duplicate key value violates unique constraint "' + tabela + '_encounter_revision_unique"', '23505');
      }
      if (linha.status === 'rascunho' && s.tabelas[tabela].some(x => x.id !== linha.id && x.encounter_id === linha.encounter_id && x.status === 'rascunho')) {
        return erro('duplicate key value violates unique constraint "' + tabela + '_um_rascunho_por_atendimento"', '23505');
      }
      if (linha.operation_id && s.tabelas[tabela].some(x => x.id !== linha.id && x.nutritionist_id === uid && x.operation_id === linha.operation_id)) {
        return erro('duplicate key value violates unique constraint "' + tabela + '_operation_unique"', '23505');
      }
      for (const col of (tabela === 'anamneses' ? ['source_anamnesis_id', 'supersedes_id'] : ['previous_conduct_id', 'supersedes_id'])) {
        if (!linha[col]) continue;
        const r = s.tabelas[tabela].find(x => x.id === linha[col] && x.patient_id === linha.patient_id && x.nutritionist_id === uid);
        if (!r) return erro('violates foreign key constraint "' + tabela + '_' + col.replace('_id', '') + '_fk"', '23503');
      }
      if (tabela === 'anamneses' && !conteudoAnamneseValido(linha.content)) return erro('violates check constraint "anamneses_conteudo_valido"', '23514');
      // trigger validar_proveniencia_anamnese (V1 Etapa 3): fonte consolidada, de outro atendimento, nunca a propria linha
      if (tabela === 'anamneses' && linha.source_anamnesis_id) {
        if (linha.source_anamnesis_id === linha.id) return erro('anamnese nao pode ter a si mesma como fonte', 'P0001');
        const fonte = s.tabelas.anamneses.find(x => x.id === linha.source_anamnesis_id);
        if (fonte && fonte.status === 'rascunho') return erro('fonte da copia precisa ser anamnese salva ou revisada', 'P0001');
        if (fonte && fonte.encounter_id === linha.encounter_id) return erro('fonte da copia precisa ser de outro atendimento', 'P0001');
      }
      if (tabela === 'conducts') {
        if (linha.previous_decision != null && !['continuar', 'substituir', 'encerrar'].includes(linha.previous_decision)) return erro('violates check constraint "conducts_decisao_valida"', '23514');
        const refs = linha.references || {};
        const alvos = { holoscan_application_ids: 'holoscan_applications', tool_application_ids: 'tool_applications', lab_collection_ids: 'lab_collections', document_ids: 'documents', previous_encounter_ids: 'encounters' };
        for (const [k, t] of Object.entries(alvos)) {
          for (const id of (refs[k] || [])) {
            if (!s.tabelas[t].some(x => x.id === id && x.patient_id === linha.patient_id && x.nutritionist_id === uid)) return erro('referencia de outro paciente ou inexistente (' + k + ')', 'P0001');
          }
        }
      }
    }
    if (tabela === 'agreements') {
      if (!linha.description || !String(linha.description).trim()) return erro('violates check constraint "agreements_descricao_nao_vazia"', '23514');
      if (!ESTADOS_ACORDO.includes(linha.status)) return erro('violates check constraint "agreements_status_valido"', '23514');
      const c = s.tabelas.conducts.find(x => x.id === linha.conduct_id && x.patient_id === linha.patient_id && x.nutritionist_id === uid);
      if (!c) return erro('violates foreign key constraint "agreements_conduct_fk"', '23503');
      if (linha.origin_agreement_id && !s.tabelas.agreements.some(x => x.id === linha.origin_agreement_id && x.patient_id === linha.patient_id && x.nutritionist_id === uid)) return erro('violates foreign key constraint "agreements_origin_fk"', '23503');
      // trigger validar_lineage_acordo (V1 Etapa 3): origem de OUTRA conduta, nunca a propria linha
      if (linha.origin_agreement_id) {
        if (linha.origin_agreement_id === linha.id) return erro('acordo nao pode ter a si mesmo como origem', 'P0001');
        const origem = s.tabelas.agreements.find(x => x.id === linha.origin_agreement_id);
        if (origem && origem.conduct_id === linha.conduct_id) return erro('acordo de origem precisa ser de outra conduta', 'P0001');
      }
      if (linha.operation_id && s.tabelas.agreements.some(x => x.id !== linha.id && x.nutritionist_id === uid && x.operation_id === linha.operation_id)) return erro('duplicate key value violates unique constraint "agreements_operation_unique"', '23505');
    }
    if (tabela === 'methodology_packages') {
      if (!['rascunho', 'em_revisao', 'aprovado', 'retirado'].includes(linha.status)) return erro('violates check constraint "methodology_packages_status_valido"', '23514');
      if (!linha.code || !String(linha.code).trim()) return erro('violates check constraint "methodology_packages_code_nao_vazio"', '23514');
      // migration 20261003100000: no regime aprovador_unico o segundo revisor (reviewed_by/at) e NULO; no legado (dupla) e obrigatorio
      const revisaoOk = linha.governance_regime === 'aprovador_unico' ? (!linha.reviewed_by && !linha.reviewed_at)
        : ((linha.governance_regime || 'dupla_aprovacao') === 'dupla_aprovacao' && !!linha.reviewed_by && !!linha.reviewed_at);
      if (['aprovado', 'retirado'].includes(linha.status) && !(linha.content_hash && linha.responsible && linha.effective_from && linha.approved_at && linha.approved_by && revisaoOk)) return erro('violates check constraint "methodology_packages_aprovado_completo"', '23514');
      if (linha.status === 'retirado' && !linha.retired_at) return erro('violates check constraint "methodology_packages_retirado_completo"', '23514');
      if (s.tabelas.methodology_packages.some(x => x.id !== linha.id && x.nutritionist_id === uid && x.code === linha.code && x.version === linha.version)) return erro('duplicate key value violates unique constraint "methodology_packages_code_version_unique"', '23505');
    }
    if (FILHAS_PACOTE.includes(tabela)) {
      const p = s.tabelas.methodology_packages.find(x => x.id === linha.package_id && x.nutritionist_id === uid);
      if (!p) return erro('violates foreign key constraint "' + tabela + '_package_fk"', '23503');
      if (tabela !== 'methodology_homologation_records' && linha.status && !['rascunho', 'para_homologacao', 'aprovado', 'retirado', 'aprovada', 'retirada'].includes(linha.status)) return erro('violates check constraint "' + tabela + '_status_valido"', '23514');
      if (tabela === 'methodology_questions') {
        if (linha.orientation != null && !['direta', 'invertida'].includes(linha.orientation)) return erro('violates check constraint "methodology_questions_orientacao_valida"', '23514');
        if (!['fisico', 'mental_emocional', 'espiritual'].includes(linha.block)) return erro('violates check constraint "methodology_questions_bloco_valido"', '23514');
        // V1 Etapa 4.2 (migration 20261001200000)
        if (linha.temporal_context != null && !globalThis.PacoteMetodologico.CONTEXTOS_TEMPORAIS.includes(linha.temporal_context)) return erro('violates check constraint "methodology_questions_contexto_temporal_valido"', '23514');
        if (!s.tabelas.methodology_questionnaire_editions.some(e => e.id === linha.edition_id && e.nutritionist_id === uid)) return erro('violates foreign key constraint "methodology_questions_edition_fk"', '23503');
        if (s.tabelas.methodology_questions.some(x => x.id !== linha.id && x.edition_id === linha.edition_id && x.stable_id === linha.stable_id)) return erro('duplicate key value violates unique constraint "methodology_questions_stable_id_unique"', '23505');
      }
      if (tabela === 'methodology_associations' && !['system', 'triad'].includes(linha.destination_type)) return erro('violates check constraint "methodology_associations_tipo_valido"', '23514');
      if (tabela === 'methodology_associations' && linha.role != null && !['primaria', 'secondary_contextual', 'triade_por_bloco', 'secundaria', 'derivada'].includes(linha.role)) return erro('violates check constraint "methodology_associations_papel_conhecido"', '23514');
      if (tabela === 'methodology_associations' && linha.role === 'secondary_contextual' && linha.weight != null) return erro('violates check constraint "methodology_associations_contextual_sem_peso"', '23514');
      if (tabela === 'methodology_ranges' && ['lower_bound_exact', 'upper_bound_exact'].some(k => linha[k] != null && !/^-?[0-9]+(\.[0-9]+)?(\/[1-9][0-9]*)?$/.test(linha[k]))) return erro('violates check constraint "methodology_ranges_limite_exato_formato"', '23514');
      if (tabela === 'methodology_ranges' && !['system', 'index', 'triad'].includes(linha.destination_type)) return erro('violates check constraint "methodology_ranges_tipo_valido"', '23514');
      if (tabela === 'methodology_scales' && (!(linha.max_value > linha.min_value) || s.tabelas.methodology_scales.some(x => x.id !== linha.id && x.package_id === linha.package_id && x.code === linha.code))) return erro('violates constraint on methodology_scales (intervalo/code_unique)', '23514');
      if (tabela === 'methodology_systems' && s.tabelas.methodology_systems.some(x => x.id !== linha.id && x.package_id === linha.package_id && x.code === linha.code)) return erro('duplicate key value violates unique constraint "methodology_systems_code_unique"', '23505');
      if (tabela === 'methodology_rules') {
        if (!['scoring', 'absence', 'index', 'triad', 'coverage', 'comparability', 'example', 'suggestion'].includes(linha.rule_type)) return erro('violates check constraint "methodology_rules_tipo_valido"', '23514');
        if (s.tabelas.methodology_rules.some(x => x.id !== linha.id && x.package_id === linha.package_id && x.rule_type === linha.rule_type && x.target === linha.target)) return erro('duplicate key value violates unique constraint "methodology_rules_tipo_alvo_unique"', '23505');
      }
      if (tabela === 'methodology_homologation_records' && (!linha.responsible || !String(linha.responsible).trim() || !linha.decision || !String(linha.decision).trim() || !linha.decided_at || !linha.topic || !linha.element)) return erro('violates check constraint "methodology_records_*"', '23514');
      if (tabela === 'methodology_homologation_records' && /lideran/i.test(linha.responsible)) return erro('violates check constraint "methodology_records_sem_lideranca"', '23514');
    }
    if (tabela === 'holoscan_applications' && linha.methodology_package_id && !s.tabelas.methodology_packages.some(x => x.id === linha.methodology_package_id)) return erro('violates foreign key constraint "holoscan_applications_methodology_package_id_fkey"', '23503');
    if (tabela === 'report_emissions') {
      if (!['rascunho', 'emitido'].includes(linha.status)) return erro('violates check constraint "report_emissions_status_valido"', '23514');
      if (linha.report_type && !['relatorio_clinico', 'evolucao', 'encaminhamento'].includes(linha.report_type)) return erro('violates check constraint "report_emissions_tipo_valido"', '23514');
      if (linha.status === 'emitido' && !(linha.issued_at && linha.source_snapshot && linha.content_snapshot && linha.content_hash && linha.created_by)) return erro('violates check constraint "report_emissions_emitido_completo"', '23514');
      if (linha.encounter_id && !s.tabelas.encounters.some(x => x.id === linha.encounter_id && x.patient_id === linha.patient_id && x.nutritionist_id === uid)) return erro('violates foreign key constraint "report_emissions_encounter_fk"', '23503');
      if (linha.supersedes_report_id && !s.tabelas.report_emissions.some(x => x.id === linha.supersedes_report_id && x.patient_id === linha.patient_id && x.nutritionist_id === uid)) return erro('violates foreign key constraint "report_emissions_supersedes_fk"', '23503');
      if (linha.operation_id && s.tabelas.report_emissions.some(x => x.id !== linha.id && x.nutritionist_id === uid && x.operation_id === linha.operation_id)) return erro('duplicate key value violates unique constraint "report_emissions_operation_unique"', '23505');
    }
    if (COM_ENCOUNTER.includes(tabela) && linha.encounter_id) {
      const e = s.tabelas.encounters.find(x => x.id === linha.encounter_id &&
        x.patient_id === linha.patient_id && x.nutritionist_id === uid);
      if (!e) return erro('violates foreign key constraint "' + tabela + '_encounter_fk"', '23503');
    }
    if (tabela === 'consultations') {
      for (const col of ['rescheduled_from_id', 'rescheduled_to_id']) {
        if (!linha[col]) continue;
        const c = s.tabelas.consultations.find(x => x.id === linha[col] && x.patient_id === linha.patient_id && x.nutritionist_id === uid);
        if (!c) return erro('violates foreign key constraint "consultations_' + col.replace('_id', '') + '_fk"', '23503');
      }
    }
    if (tabela === 'patients' && !['ativo', 'inativo'].includes(linha.status)) {
      return erro('violates check constraint "patients_status_valido"', '23514');
    }
    if (tabela === 'lab_collections') {
      const ok = (linha.data_coleta_desconhecida === true && linha.coletado_em == null) ||
                 (linha.data_coleta_desconhecida === false && linha.coletado_em != null);
      if (!ok) return erro('violates check constraint "lab_collections_data_coerente"', '23514');
      // Etapa 0 da V1: o trigger de "data da coleta no futuro" (rodada 08) saiu de
      // supabase/migrations/ (pendente de decisao de produto); nenhuma recusa por data.
      // V1 Etapa 5
      if (linha.state && !['rascunho', 'salvo', 'revisado'].includes(linha.state)) return erro('violates check constraint "lab_collections_state"', '23514');
      if (linha.source && !['manual', 'legacy_panel', 'legacy_migrated', 'extracted_draft', 'revision'].includes(linha.source)) return erro('violates check constraint "lab_collections_source"', '23514');
      if (linha.state === 'revisado' && !(linha.reviewed_at && linha.reviewed_by)) return erro('violates check constraint "lab_collections_revisado_completo"', '23514');
      if (linha.document_id && !s.tabelas.documents.some(d => d.id === linha.document_id && d.nutritionist_id === linha.nutritionist_id)) return erro('violates foreign key constraint "lab_collections_document_fk"', '23503');
    }
    if (tabela === 'lab_results') {
      if (linha.exam_code && !s.tabelas.lab_exam_catalog.some(c => c.code === linha.exam_code)) return erro('violates foreign key constraint "lab_results_exam_code_fkey"', '23503');
      if (linha.custom_exam_id && !s.tabelas.lab_custom_exams.some(c => c.id === linha.custom_exam_id)) return erro('violates foreign key constraint "lab_results_custom_exam_id_fkey"', '23503');
      if (linha.exam_code && linha.custom_exam_id) return erro('violates check constraint "lab_results_um_exame"', '23514');
      if (!linha.exam_code && !linha.custom_exam_id && !['additional_legacy', 'legacy_migrated'].includes(linha.origin) && !linha.requires_manual_mapping) return erro('violates check constraint "lab_results_identidade"', '23514');
      if (linha.qualifier && !['eq', 'lt', 'lte', 'gt', 'gte', 'text'].includes(linha.qualifier)) return erro('violates check constraint "lab_results_qualifier"', '23514');
      if (linha.numeric_value != null && linha.qualifier !== 'eq') return erro('violates check constraint "lab_results_numerico_so_exato"', '23514');
      if (!linha.value_original_text || !String(linha.value_original_text).trim()) return erro('null value in column "value_original_text" violates not-null constraint', '23502');
      if (linha.reference_status && !['informed', 'missing', 'ambiguous'].includes(linha.reference_status)) return erro('violates check constraint "lab_results_reference_status"', '23514');
      if (['informed', 'ambiguous'].includes(linha.reference_status) && linha.report_reference_text == null && linha.report_reference_min == null && linha.report_reference_max == null) return erro('violates check constraint "lab_results_referencia_informada"', '23514');
      if ((linha.reference_status || 'missing') === 'missing' && (linha.report_reference_text != null || linha.report_reference_min != null || linha.report_reference_max != null)) return erro('violates check constraint "lab_results_referencia_informada"', '23514');
      const ident = (x) => [x.collection_id, x.exam_code || '', x.custom_exam_id || '', x.variant || '', x.material || ''].join('|');
      if ((linha.exam_code || linha.custom_exam_id) && s.tabelas.lab_results.some(x => x.id !== linha.id && ident(x) === ident(linha))) return erro('duplicate key value violates unique constraint "lab_results_identidade_catalogo"', '23505');
    }
    if (tabela === 'lab_result_components') {
      const r = s.tabelas.lab_results.find(x => x.id === linha.result_id);
      const c = r && s.tabelas.lab_exam_catalog.find(x => x.code === r.exam_code);
      if (!c || !c.composite) return erro('componentes so existem em resultado de exame composto do catalogo (Hemograma completo)', 'P0001');
      if (!linha.original_name || !linha.value_original_text) return erro('violates check constraint "lab_components_*"', '23514');
    }
    if (tabela === 'lab_custom_exams') {
      if (!linha.name || !String(linha.name).trim()) return erro('violates check constraint "lab_custom_exams_nome_nao_vazio"', '23514');
      if (s.tabelas.lab_custom_exams.some(x => x.id !== linha.id && x.nutritionist_id === linha.nutritionist_id && String(x.name).trim().toLowerCase() === String(linha.name).trim().toLowerCase())) return erro('duplicate key value violates unique constraint "lab_custom_exams_nome_unico"', '23505');
    }
    if (tabela === 'integrated_readings') {
      if (!['convergente', 'divergente', 'sem_dados_suficientes'].includes(linha.state)) return erro('violates check constraint "ir_state"', '23514');
      const DIR = ['attention_present', 'attention_not_detected', 'indeterminate'];
      if ((linha.holoscan_direction != null && !DIR.includes(linha.holoscan_direction)) || (linha.laboratory_direction != null && !DIR.includes(linha.laboratory_direction))) return erro('violates check constraint "ir_direcoes"', '23514');
      if (!linha.responsible || !String(linha.responsible).trim()) return erro('violates check constraint "ir_responsavel"', '23514');
    }
    return null;
  }


  /* Etapa 5: espelha o trigger lab_results_preencher_legado — linha do painel
     legado (exame_id + valor, sem valor original) ganha os campos V1 pela
     tabela MAPA_LEGADO do catalogo; nunca inventa referencia nem material. */
  const FORA_DOS_45 = ['EXA-001', 'EXA-003', 'EXA-007', 'EXA-024'];
  function preencherLegado(l) {
    if (!l.exame_id || l.valor == null) return;
    if (l.value_original_text && l.value_original_text !== '__refazer__') return;
    const mapa = (globalThis.LabCatalogo && globalThis.LabCatalogo.MAPA_LEGADO[l.exame_id]) || null;
    const fora = FORA_DOS_45.includes(l.exame_id);
    l.value_original_text = String(l.valor); l.numeric_value = Number(l.valor); l.qualifier = 'eq';
    l.unit_original = l.unit_original || l.unidade_no_momento || null;
    l.legacy_exame_id = l.exame_id; l.legacy_ideal_min = l.ideal_min_no_momento ?? null; l.legacy_ideal_max = l.ideal_max_no_momento ?? null; l.legacy_sistema = l.sistema_no_momento || null;
    l.reference_status = 'missing'; l.report_reference_text = null; l.report_reference_min = null; l.report_reference_max = null;
    l.origin = fora ? 'additional_legacy' : 'legacy_migrated';
    l.exam_code = mapa && !mapa.requires_manual_mapping ? mapa.code : null; l.variant = (mapa && mapa.variant) || null;
    l.requires_manual_mapping = mapa ? !!mapa.requires_manual_mapping : !fora;
    l.mapping_note = mapa ? (mapa.nota || null) : (fora ? null : 'exame legado sem mapeamento provado');
  }

  function novaLinha(tabela, dados, uid) {
    const l = Object.assign({}, dados);
    if (!l.id) l.id = randomUUID();
    const t = carimbo();
    if (DONO_DIRETO.includes(tabela) && !('nutritionist_id' in l)) l.nutritionist_id = uid;
    const cols = COLUNAS[tabela] || [];
    if (cols.includes('created_at') && !l.created_at) l.created_at = t;
    if (cols.includes('updated_at') && !l.updated_at) l.updated_at = t;
    if (tabela === 'patients' && !l.status) l.status = 'ativo';
    if (tabela === 'tool_applications') {
      if (!l.status) l.status = 'rascunho';
      if (!l.respostas) l.respostas = {};
      if (!l.iniciada_em) l.iniciada_em = t;
      if (!l.atualizada_em) l.atualizada_em = t;
    }
    if (tabela === 'lab_collections' && l.data_coleta_desconhecida === undefined) l.data_coleta_desconhecida = false;
    if (tabela === 'lab_collections') { if (!l.state) l.state = 'salvo'; if (!l.source) l.source = 'legacy_panel'; if (!l.revision) l.revision = 1; }   // escrita direta = painel legado (default da migration 220000)
    if (tabela === 'lab_results') preencherLegado(l);
    if (tabela === 'lab_results') { if (!l.reference_status) l.reference_status = 'missing'; if (!l.reference_source) l.reference_source = 'laudo'; if (!l.origin) l.origin = 'manual'; if (l.requires_manual_mapping === undefined) l.requires_manual_mapping = false; if (!l.updated_at) l.updated_at = t; }
    if (tabela === 'lab_custom_exams' && !l.status) l.status = 'ativo';
    if (tabela === 'integrated_readings' && !l.revision) l.revision = 1;
    if (tabela === 'anamneses') { if (!l.status) l.status = 'rascunho'; if (l.revision_number === undefined) l.revision_number = 1; if (l.content_version === undefined) l.content_version = 1; if (l.content === undefined) l.content = {}; if (l.copied_from_previous === undefined) l.copied_from_previous = false; }
    if (tabela === 'conducts') { if (!l.status) l.status = 'rascunho'; if (l.revision_number === undefined) l.revision_number = 1; if (!l.priorities) l.priorities = []; if (!l.related_tools) l.related_tools = []; if (!l.references) l.references = {}; }
    if (tabela === 'agreements') { if (!l.status) l.status = 'proposto'; if (l.position === undefined) l.position = 0; }
    if (tabela === 'methodology_packages') { if (!l.status) l.status = 'rascunho'; if (l.version === undefined) l.version = 1; if (!l.created_by) l.created_by = uid; }
    if (FILHAS_PACOTE.includes(tabela) && tabela !== 'methodology_homologation_records' && !l.status) l.status = 'rascunho';
    if (tabela === 'methodology_questionnaire_editions' && l.version === undefined) l.version = 1;
    if (tabela === 'methodology_questions' && l.version === undefined) l.version = 1;
    if (tabela === 'methodology_associations' && l.conflict === undefined) l.conflict = false;
    if (tabela === 'methodology_ranges') { if (l.lower_inclusive === undefined) l.lower_inclusive = true; if (l.upper_inclusive === undefined) l.upper_inclusive = true; }
    if (tabela === 'methodology_rules') { if (!l.target) l.target = 'global'; if (!l.payload) l.payload = {}; }
    if (tabela === 'methodology_homologation_records' && !l.created_by) l.created_by = uid;
    if (tabela === 'report_emissions') { if (!l.status) l.status = 'rascunho'; if (!l.report_type) l.report_type = 'relatorio_clinico'; if (l.revision_number === undefined) l.revision_number = 1; if (!l.selected_sources) l.selected_sources = {}; if (l.template_version === undefined) l.template_version = 1; }
    // carimbar_revisao: revisado recebe reviewed_at/by do servidor
    if ((tabela === 'anamneses' || tabela === 'conducts') && l.status === 'revisado') { l.reviewed_at = l.reviewed_at || t; l.reviewed_by = uid; }
    return l;
  }

  function comparar(a, b) {
    if (a === b) return 0;
    if (a === null || a === undefined) return 1;      // NULLS LAST
    if (b === null || b === undefined) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b));
  }

  function filtrar(linhas, filtros) {
    return linhas.filter(l => filtros.every(f => {
      const v = l[f.col];
      switch (f.op) {
        case 'eq': return v !== null && v !== undefined && String(v) === String(f.val);
        case 'neq': return String(v) !== String(f.val);
        case 'in': return (f.val || []).map(String).includes(String(v));
        case 'is': return f.val === null ? (v === null || v === undefined) : v === f.val;
        case 'gt': return comparar(v, f.val) > 0;
        case 'gte': return comparar(v, f.val) >= 0;
        case 'lt': return comparar(v, f.val) < 0;
        case 'lte': return comparar(v, f.val) <= 0;
        default: return true;
      }
    }));
  }

  function projetar(linhas, colunas) {
    if (!colunas || colunas.trim() === '*') return linhas.map(copia);
    const cs = colunas.split(',').map(c => c.trim()).filter(Boolean);
    return linhas.map(l => { const o = {}; cs.forEach(c => { o[c] = l[c] === undefined ? null : copia(l[c]); }); return o; });
  }

  function finalizar(q, linhas) {
    if (q.single === 'single') {
      if (linhas.length !== 1) return erro('JSON object requested, multiple (or no) rows returned', 'PGRST116');
      return { data: linhas[0], error: null };
    }
    if (q.single === 'maybe') {
      if (linhas.length > 1) return erro('multiple rows returned', 'PGRST116');
      return { data: linhas[0] || null, error: null };
    }
    return { data: linhas, error: null };
  }

  /* Dupla aprovacao: a tabela de aprovacoes so e escrita pela RPC (sem GRANT de escrita);
     qualquer mudanca no conteudo do pacote (filhas) ou no code/version invalida as
     aprovacoes vigentes daquele pacote (trigger metodologia_invalidar_aprovacoes). */
  function invalidarAprovacoes(pid, motivo) {
    s.tabelas.methodology_package_approvals.forEach(a => { if (a.package_id === pid && !a.invalidated_at) { a.invalidated_at = agora(); a.invalidated_reason = motivo; } });
  }
  const protegerLab = (q, uid) => {
    // triggers proteger_coleta_consolidada / proteger_resultado_consolidado / proteger_componente_consolidado
    const t = q.tabela, cid = (c) => c && c.id;
    if (t === 'lab_collections' && ['update', 'delete'].includes(q.acao)) {
      for (const l of filtrar(visiveis(t, uid), q.filtros)) {
        if (l.source === 'legacy_panel') continue;
        if (!['salvo', 'revisado'].includes(l.state)) continue;
        if (q.acao === 'delete') return erro('coleta consolidada nao e apagada: corrija com uma revisao', 'P0001');
        const livres = ['updated_at', 'superseded_at', 'state', 'reviewed_at', 'reviewed_by', 'revision_note'];
        const mudou = Object.keys(q.dados).find(k => !livres.includes(k) && JSON.stringify(q.dados[k] === undefined ? null : q.dados[k]) !== JSON.stringify(l[k] === undefined ? null : l[k]));
        if (mudou) return erro('coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial', 'P0001');
        if (q.dados.state === 'rascunho') return erro('coleta consolidada nao volta a rascunho', 'P0001');
      }
    }
    if ((t === 'lab_results' || t === 'lab_result_components') && ['insert', 'upsert', 'update', 'delete'].includes(q.acao)) {
      const coletaDe = (l) => { if (t === 'lab_results') return s.tabelas.lab_collections.find(c => c.id === l.collection_id); const r = s.tabelas.lab_results.find(x => x.id === l.result_id); return r && s.tabelas.lab_collections.find(c => c.id === r.collection_id); };
      const linhas = (q.acao === 'insert' || q.acao === 'upsert') ? (Array.isArray(q.dados) ? q.dados : [q.dados]) : filtrar(visiveis(t, uid), q.filtros);
      for (const l of linhas) {
        const c = coletaDe(l);
        if (c && c.source !== 'legacy_panel' && ['salvo', 'revisado'].includes(c.state) && s.labRpc !== c.id) return erro('resultado de coleta consolidada e imutavel: corrija com revisar_coleta_laboratorial', 'P0001');
      }
    }
    return null;
  };
  /* ===================== V1 Etapa 5.2 — governanca da Leitura Integrada (espelha 20261002100000) =====================
     Mesmo contrato da dupla aprovacao do HOLOSCAN: Daniel (1) -> Rodrigo (2), mesmo package_id/version/content_hash;
     qualquer mudanca metodologica invalida (historico append-only, com motivo); 'aprovado' so por homologar_pacote_li,
     que exige completude; snapshot imutavel. As tabelas da LI sao globais e so leitura para a aplicacao: as escritas de
     "gestao tecnica" (como uma migration faria) entram por s.gestaoTecnica(), que aplica as mesmas protecoes e triggers. */
  const LI_FILHAS = ['integrated_reading_domains', 'integrated_reading_exam_domain_links', 'integrated_reading_rules', 'integrated_reading_package_dependencies'];
  const LI_REFERENCIADAS = { lab_method_references: 'reference', lab_unit_conversion_rules: 'conversion', lab_derived_calculations: 'derived' };
  const canon = (v) => { if (Array.isArray(v)) return v.map(canon); if (v && typeof v === 'object') { const o = {}; Object.keys(v).sort().forEach(k => { o[k] = canon(v[k]); }); return o; } return v === undefined ? null : v; };
  const semMeta = (o) => { if (!o) return null; const c = Object.assign({}, o); ['id', 'created_at', 'updated_at'].forEach(k => delete c[k]); return c; };
  const liEntidade = (kind, id) => semMeta((kind === 'reference' ? s.tabelas.lab_method_references : kind === 'conversion' ? s.tabelas.lab_unit_conversion_rules : s.tabelas.lab_derived_calculations).find(x => x.id === id));
  const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  function liConteudo(pid) {
    const pk = s.tabelas.integrated_reading_rule_packages.find(x => x.id === pid); if (!pk) return null;
    const doms = s.tabelas.integrated_reading_domains.filter(d => d.package_id === pid).slice().sort((a, b) => cmp(a.code, b.code));
    const codigo = (did) => (s.tabelas.integrated_reading_domains.find(d => d.id === did) || {}).code || '';
    const links = s.tabelas.integrated_reading_exam_domain_links.filter(l => l.package_id === pid).map(l => ({ domain: codigo(l.domain_id), exam_code: l.exam_code, variant: l.variant || null, material: l.material || null, direction: l.direction, status: l.status, cross_source_role: l.cross_source_role || 'contextual', direction_rules: l.direction_rules || null, variants_declared: l.variants_declared || null, version: l.version || 1, source: l.source || null, justification: l.justification || null, reference: l.reference_id ? liEntidade('reference', l.reference_id) : null }))
      .sort((a, b) => cmp([a.domain, a.exam_code, a.variant || '', a.material || '', a.direction].join('|'), [b.domain, b.exam_code, b.variant || '', b.material || '', b.direction].join('|')));
    const rules = s.tabelas.integrated_reading_rules.filter(r => r.package_id === pid).map(r => ({ rule_type: r.rule_type, target: r.target, payload: r.payload, status: r.status })).sort((a, b) => cmp(a.rule_type + '|' + a.target, b.rule_type + '|' + b.target));
    const deps = s.tabelas.integrated_reading_package_dependencies.filter(k => k.package_id === pid).map(k => ({ kind: k.kind, status: k.status, content: liEntidade(k.kind, k.ref_id), _o: k.kind + '|' + k.ref_id })).sort((a, b) => cmp(a._o, b._o)).map(k => { delete k._o; return k; });
    return canon({ package: { code: pk.code, version: pk.version }, domains: doms.map(d => ({ code: d.code, name: d.name, definition: d.definition || null, holoscan_mapping_mode: d.holoscan_mapping_mode || 'none', holoscan_system: d.holoscan_system || null, status: d.status })), links, rules, dependencies: deps });
  }
  // mesmo texto que public.li_conteudo_canonico::text (ordem de chaves do jsonb) -> mesmo hash do servidor real
  const liHash = (pid) => createHash('sha256').update(globalThis.LeituraIntegradaPacoteV1 ? globalThis.LeituraIntegradaPacoteV1.jsonbTexto(liConteudo(pid)) : JSON.stringify(liConteudo(pid)), 'utf8').digest('hex');
  function liValidar(pid) {
    const b = [];
    if (!s.tabelas.integrated_reading_rule_packages.some(x => x.id === pid)) return { publicavel: false, total_bloqueios: 1, bloqueios: ['pacote_inexistente'] };
    const doms = s.tabelas.integrated_reading_domains.filter(d => d.package_id === pid && d.status === 'aprovado').sort((a, c) => cmp(a.code, c.code));
    const regras = (tipo) => s.tabelas.integrated_reading_rules.filter(r => r.package_id === pid && r.rule_type === tipo && r.status === 'aprovado');
    if (!doms.length) b.push('sem_dominio_aprovado');
    doms.forEach(d => {
      const links = s.tabelas.integrated_reading_exam_domain_links.filter(l => l.domain_id === d.id);
      if (!links.some(l => l.status === 'aprovado')) b.push('dominio_sem_vinculo_aprovado:' + d.code);
      if (!regras('convergence').some(r => ['global', d.id, d.code].includes(r.target))) b.push('dominio_sem_regra_convergencia:' + d.code);
      if ((d.holoscan_mapping_mode || 'none') === 'mapped') {
        if (!links.some(l => l.status === 'aprovado' && l.cross_source_role === 'directional')) b.push('dominio_mapeado_sem_vinculo_directional:' + d.code);
        if (!regras('sufficiency').some(r => [d.id, d.code].includes(r.target))) b.push('dominio_mapeado_sem_regra_suficiencia:' + d.code);
        if (!regras('mixed').some(r => [d.id, d.code].includes(r.target))) b.push('dominio_mapeado_sem_regra_mistos:' + d.code);
      } else if (links.some(l => l.cross_source_role === 'directional')) b.push('dominio_sem_confronto_com_vinculo_directional:' + d.code);
    });
    if (!regras('temporal').length) b.push('sem_regra_temporal');
    if (!regras('sufficiency').length) b.push('sem_regra_suficiencia');
    if (!regras('mixed').length) b.push('sem_regra_resultados_mistos');
    if (!regras('convergence').length) b.push('sem_regra_convergencia_divergencia');
    if (doms.some(d => (d.holoscan_mapping_mode || 'none') === 'mapped') && !regras('holoscan_direction').length) b.push('sem_regra_direcao_holoscan');
    if (!regras('text').some(r => r.payload && 'convergente' in r.payload && 'divergente' in r.payload && 'sem_dados_suficientes' in r.payload)) b.push('sem_texto_oficial_dos_tres_estados');
    const n = LI_FILHAS.reduce((acc, t) => acc + s.tabelas[t].filter(x => x.package_id === pid && ['rascunho', 'em_revisao'].includes(x.status)).length, 0);
    if (n) b.push('elementos_nao_aprovados:' + n);
    const nr = s.tabelas.integrated_reading_exam_domain_links.filter(l => l.package_id === pid && l.reference_id && (s.tabelas.lab_method_references.find(r => r.id === l.reference_id) || {}).status !== 'aprovado').length;
    if (nr) b.push('vinculo_com_referencia_nao_aprovada:' + nr);
    const nd = s.tabelas.integrated_reading_package_dependencies.filter(k => k.package_id === pid && (liEntidade(k.kind, k.ref_id) || {}).status !== 'aprovado').length;
    if (nd) b.push('dependencia_nao_aprovada_ou_inexistente:' + nd);
    return { publicavel: b.length === 0, total_bloqueios: b.length, bloqueios: b };
  }
  function liInvalidar(pid, motivo) { s.tabelas.integrated_reading_package_approvals.forEach(a => { if (a.package_id === pid && !a.invalidated_at) { a.invalidated_at = carimbo(); a.invalidated_reason = motivo; } }); }
  const liVigentes = (pid) => s.tabelas.integrated_reading_package_approvals.filter(a => a.package_id === pid && !a.invalidated_at);
  s.liHomologar = null;
  /** Gestao tecnica (como uma migration): insert/update/delete nas tabelas globais da LI e nas entidades referenciadas,
      com as mesmas protecoes e triggers do SQL. Nao e caminho da aplicacao. */
  s.gestaoTecnica = (tabela, acao, dados, filtros) => {
    const tab = s.tabelas[tabela]; if (!tab) return erro('tabela desconhecida ' + tabela, '42P01');
    const alvo = acao === 'insert' ? [] : filtrar(tab, filtros || []);
    const pkgDe = (l) => s.tabelas.integrated_reading_rule_packages.find(x => x.id === l.package_id);
    const protegido = (pid) => { const pk = s.tabelas.integrated_reading_rule_packages.find(x => x.id === pid); return pk && ['aprovado', 'retirado'].includes(pk.status) && s.liHomologar !== pid; };
    if (tabela === 'methodology_approvers') {
      // migration 20261003100000: etapa 2 nunca ativa; desativacao exige data e motivo (nunca exclusao)
      const coerente = (l) => (l.active !== false) ? (l.approval_stage === 1 && !l.deactivated_at && !l.deactivation_reason) : (!!l.deactivated_at && !!String(l.deactivation_reason || '').trim());
      if (acao === 'delete') return erro('aprovador e historico: desative (active = false, com data e motivo)', '42501');
      if (acao !== 'insert') {
        const novos = alvo.map(l => Object.assign({}, l, dados));
        if (novos.some(l => !coerente(l))) return erro('violates check constraint "approvers_somente_etapa1_ativa/approvers_desativacao_coerente"', '23514');
        alvo.forEach(l => Object.assign(l, dados)); return { data: alvo.map(copia), error: null };
      }
      if (!coerente(Object.assign({ active: true }, dados))) return erro('violates check constraint "approvers_somente_etapa1_ativa/approvers_desativacao_coerente"', '23514');
      if (!['holoscan', 'integrated_reading'].includes(dados.scope) || ![1, 2].includes(dados.approval_stage)) return erro('violates check constraint "approvers_scope/stage"', '23514');
      if (!((dados.approval_stage === 1 && dados.display_name === 'Daniel') || (dados.approval_stage === 2 && dados.display_name === 'Rodrigo'))) return erro('violates check constraint "approvers_nome_por_etapa"', '23514');
      if (tab.some(a => a.scope === dados.scope && a.user_id === dados.user_id)) return erro('duplicate key value violates unique constraint "approvers_um_papel_por_escopo"', '23505');
      const l = novaLinha(tabela, Object.assign({ active: true }, dados), null); tab.push(l); return { data: [copia(l)], error: null };
    }
    if (tabela === 'integrated_reading_package_approvals' || tabela === 'integrated_reading_package_snapshots') {
      if (acao === 'delete') return erro(tabela === 'integrated_reading_package_approvals' ? 'aprovacao da leitura integrada e historico: nao e apagada' : 'snapshot homologado da leitura integrada e imutavel', 'P0001');
      if (acao === 'update') return erro(tabela === 'integrated_reading_package_approvals' ? 'aprovacao da leitura integrada e imutavel: so pode ser invalidada (uma vez)' : 'snapshot homologado da leitura integrada e imutavel', 'P0001');
      return erro('aprovacao so pela RPC registrar_aprovacao_li', '42501');
    }
    if (tabela === 'integrated_reading_rule_packages') {
      if (acao === 'insert') { const l = novaLinha(tabela, Object.assign({ version: 1, status: 'rascunho' }, dados), null); tab.push(l); return { data: [copia(l)], error: null }; }
      for (const l of alvo) {
        const novo = Object.assign({}, l, dados);
        if (acao === 'delete') return erro('pacote referenciado: on delete restrict', '23503');
        if (novo.status === 'aprovado' && l.status !== 'aprovado' && s.liHomologar !== l.id) return erro('aprovacao nao e edicao administrativa: use homologar_pacote_li (completude + Aprovacao 1 e 2 vigentes)', 'P0001');
        if (l.status === 'aprovado' && s.liHomologar !== l.id) {
          const so = Object.keys(dados).every(k => k === 'status');
          if (!(novo.status === 'retirado' && so)) return erro('pacote da leitura integrada aprovado e imutavel: alteracao exige NOVA VERSAO (so pode ser retirado)', 'P0001');
        }
        if (l.status === 'retirado') return erro('pacote retirado e historico: nao muda', 'P0001');
      }
      alvo.forEach(l => { const mudou = ('version' in dados && dados.version !== l.version) || ('code' in dados && dados.code !== l.code); Object.assign(l, dados); if (mudou) liInvalidar(l.id, 'pacote alterado depois da aprovacao (code/version)'); });
      return { data: alvo.map(copia), error: null };
    }
    if (LI_FILHAS.includes(tabela)) {
      const pids = acao === 'insert' ? [dados.package_id] : alvo.map(l => l.package_id);
      for (const pid of pids) if (protegido(pid)) return erro('conteudo de pacote ' + pkgDe({ package_id: pid }).status + ' da leitura integrada e imutavel: crie uma nova versao', 'P0001');
      if (acao === 'insert') {
        const base = tabela === 'integrated_reading_domains' ? { status: 'rascunho', holoscan_mapping_mode: dados.holoscan_system ? 'mapped' : 'none', definition: null, position: null } : tabela === 'integrated_reading_exam_domain_links' ? { status: 'rascunho', cross_source_role: 'contextual', direction_rules: null, variants_declared: null, version: 1, source: null, justification: null } : { status: 'rascunho' };
        const l = novaLinha(tabela, Object.assign(base, dados), null);
        if (tabela === 'integrated_reading_domains' && !['mapped', 'none'].includes(l.holoscan_mapping_mode)) return erro('violates check constraint "ird_mapping_mode"', '23514');
        if (tabela === 'integrated_reading_domains' && ((l.holoscan_mapping_mode === 'mapped') !== !!l.holoscan_system)) return erro('violates check constraint "ird_mapping_coerente"', '23514');
        if (tabela === 'integrated_reading_exam_domain_links' && !['directional', 'contextual'].includes(l.cross_source_role)) return erro('violates check constraint "irl_role"', '23514');
        if (tabela === 'integrated_reading_exam_domain_links' && ((l.cross_source_role === 'directional') !== !!l.direction_rules)) return erro('violates check constraint "irl_directional_rules"', '23514');
        if (tabela === 'integrated_reading_rules' && !['sufficiency', 'temporal', 'mixed', 'convergence', 'text', 'holoscan_direction', 'reason_semantics'].includes(l.rule_type)) return erro('violates check constraint "irr_type"', '23514');
        tab.push(l); liInvalidar(dados.package_id, 'conteudo metodologico alterado depois da aprovacao (' + tabela + ' insert)'); return { data: [copia(l)], error: null }; }
      if (acao === 'update') alvo.forEach(l => Object.assign(l, dados));
      if (acao === 'delete') s.tabelas[tabela] = tab.filter(l => !alvo.includes(l));
      pids.forEach(pid => liInvalidar(pid, 'conteudo metodologico alterado depois da aprovacao (' + tabela + ' ' + acao + ')'));
      return { data: alvo.map(copia), error: null };
    }
    if (tabela in LI_REFERENCIADAS) {
      if (acao === 'insert') { const l = novaLinha(tabela, Object.assign({ status: 'rascunho' }, dados), null); tab.push(l); return { data: [copia(l)], error: null }; }
      const kind = LI_REFERENCIADAS[tabela];
      const pids = new Set();
      alvo.forEach(l => {
        s.tabelas.integrated_reading_package_dependencies.filter(k => k.kind === kind && k.ref_id === l.id).forEach(k => pids.add(k.package_id));
        if (kind === 'reference') s.tabelas.integrated_reading_exam_domain_links.filter(x => x.reference_id === l.id).forEach(x => pids.add(x.package_id));
      });
      if (acao === 'update') alvo.forEach(l => Object.assign(l, dados));
      if (acao === 'delete') s.tabelas[tabela] = tab.filter(l => !alvo.includes(l));
      pids.forEach(pid => liInvalidar(pid, 'entidade referenciada alterada depois da aprovacao (' + tabela + ' ' + acao + ')'));
      return { data: alvo.map(copia), error: null };
    }
    return erro('gestaoTecnica nao cobre ' + tabela, 'P0001');
  };

  function consultar(uid, q) {
    const t = q.tabela;
    if (t === 'methodology_package_approvals' && q.acao !== 'select') return erro('permission denied for table methodology_package_approvals', '42501');
    if (t === 'methodology_approvers' && q.acao !== 'select') return erro('permission denied for table methodology_approvers', '42501');
    if ((GLOBAIS_SO_LEITURA.includes(t) || t === 'integrated_readings' || t === 'holos_results') && q.acao !== 'select' && uid) return erro('permission denied for table ' + t, '42501');
    /* Prontuario (20261011100000): a API perdeu a escrita nas tabelas lab_* (revoke) e o DELETE em documents */
    if (['lab_collections', 'lab_results', 'lab_result_components', 'lab_custom_exams'].includes(t) && q.acao !== 'select' && uid) return erro('permission denied for table ' + t, '42501');
    if (t === 'documents' && q.acao === 'delete' && uid) return erro('permission denied for table documents', '42501');
    if (uid && (t in s.tabelas)) { const pe = protegerLab(q, uid); if (pe) return pe; }
    const filhaConteudo = FILHAS_PACOTE.includes(t) && t !== 'methodology_homologation_records' && ['insert', 'upsert', 'update', 'delete'].includes(q.acao);
    const pacoteMuda = t === 'methodology_packages' && q.acao === 'update' && q.dados && ('version' in q.dados || 'code' in q.dados);
    if (!uid || !(t in s.tabelas) || !(filhaConteudo || pacoteMuda)) return consultarBase(uid, q);
    const tocados = new Set();
    if (q.acao === 'insert' || q.acao === 'upsert') (Array.isArray(q.dados) ? q.dados : [q.dados]).forEach(d => tocados.add(d.package_id));
    else filtrar(visiveis(t, uid), q.filtros).forEach(l => {
      if (!pacoteMuda) { tocados.add(l.package_id); return; }
      if (('version' in q.dados && q.dados.version !== l.version) || ('code' in q.dados && q.dados.code !== l.code)) tocados.add(l.id);
    });
    const r = consultarBase(uid, q);
    if (!r.error) tocados.forEach(pid => invalidarAprovacoes(pid, 'pacote alterado depois da aprovacao (' + t + ' ' + q.acao + ')'));
    return r;
  }
  function consultarBase(uid, q) {
    const t = q.tabela;
    /* trava real (politica RESTRICTIVE): conta nao ativa nao cria nem altera paciente */
    if (t === 'patients' && uid && ['insert', 'upsert', 'update'].includes(q.acao) && statusConta(uid) !== 'ativo')
      return erro('new row violates row-level security policy "patients_exige_conta_ativa_ins" for table "patients"', '42501');
    /* a propria nutri nao muda o proprio status */
    if (t === 'profiles' && uid && q.dados && ['insert', 'upsert', 'update'].includes(q.acao) &&
        (Array.isArray(q.dados) ? q.dados : [q.dados]).some(d => 'status' in d || 'aprovado_em' in d || 'aprovado_por' in d))
      return erro('o status da conta so e alterado pela equipe HoloHacking', '42501');
    if (t === 'administradores') return erro('permission denied for table administradores', '42501');
    if (!(t in s.tabelas)) return erro('relation "public.' + t + '" does not exist', '42P01');
    if (!uid) return erro('permission denied for table ' + t, '42501');   // anon revogado
    if (deveFalhar(t, q.acao)) return erro('falha simulada em ' + t + '/' + q.acao, 'SIMULADA');

    if (q.acao === 'select') {
      let linhas = filtrar(visiveis(t, uid), q.filtros);
      if (q.opcoes && q.opcoes.count) {
        const n = linhas.length;
        if (q.opcoes.head) return { data: null, count: n, error: null };
      }
      linhas = linhas.slice().sort((a, b) => {
        for (const o of q.ordem) { const c = comparar(a[o.col], b[o.col]); if (c) return o.asc ? c : -c; }
        return 0;
      });
      let de = 0, ate = linhas.length - 1;
      if (q.range) { de = q.range[0]; ate = q.range[1]; }
      ate = Math.min(ate, de + s.maxLinhas - 1);
      linhas = linhas.slice(de, ate + 1);
      return finalizar(q, projetar(linhas, q.colunas));
    }

    if ((q.acao === 'insert' || q.acao === 'upsert') && FILHAS_PACOTE.includes(t) && t !== 'methodology_homologation_records') {   // o registro de homologacao nao tem o trigger de imutabilidade (so de UPDATE)
      const linhasIns = Array.isArray(q.dados) ? q.dados : [q.dados];
      for (const d of linhasIns) {
        const p = s.tabelas.methodology_packages.find(x => x.id === d.package_id);
        if (p && ['aprovado', 'retirado'].includes(p.status) && s.aprovacaoRpc !== p.id) return erro('conteudo de pacote ' + p.status + ' e imutavel: crie uma nova versao do pacote', 'P0001');
      }
    }
    /* Correcao P0 (migration 20261005100000): sem policy de INSERT nas tabelas do HOLOSCAN — o unico caminho e a RPC. */
    if ((q.acao === 'insert' || q.acao === 'upsert') && ['holoscan_applications', 'holoscan_system_scores', 'holoscan_answers'].includes(t)) {
      return erro('new row violates row-level security policy for table "' + t + '"', '42501');
    }
    if (q.acao === 'insert' || q.acao === 'upsert') {
      const lista = Array.isArray(q.dados) ? q.dados : [q.dados];
      const novas = [];
      for (const d of lista) {
        /* conflito pela coluna do onConflict (padrao: id) — ou, num insert,
           por qualquer unique declarada na migration */
        const alvo = (q.acao === 'upsert' && q.upsert && q.upsert.onConflict)
          ? q.upsert.onConflict.split(',').map(c => c.trim()) : ['id'];
        const bate = (cols) => (l) => cols.every(c => d[c] !== undefined && d[c] !== null && String(l[c]) === String(d[c]));
        let existe = d && s.tabelas[t].find(bate(alvo));
        if (!existe && d && q.acao === 'insert') {
          for (const u of (UNICAS[t] || [])) {
            if (s.tabelas[t].some(bate(u)) || novas.some(n => n.nova && u.every(c => String(n.nova[c]) === String(d[c])))) {
              return erro('duplicate key value violates unique constraint "' + t + '_' + u.join('_') + '_unique"', '23505');
            }
          }
        }
        if (existe) {
          if (q.acao === 'upsert' && q.upsert && q.upsert.ignoreDuplicates) continue;
          if (q.acao === 'upsert') {                     // merge: update da linha propria
            if (dono(t, existe) !== uid) return erro('new row violates row-level security policy', '42501');
            const e = validarColunas(t, d) || erroArquivado(t, Object.assign({}, existe, d)); if (e) return e;
            novas.push({ merge: existe, d });
            continue;
          }
          return erro('duplicate key value violates unique constraint "' + t + '_pkey"', '23505');
        }
        const l = novaLinha(t, d, uid);
        if (t === 'documents') { l.arquivado_em = null; l.arquivado_por = null; }   // trigger documents_nasce_ativo
        const e = checarLinha(t, l, uid);
        if (e) return e;                                  // o comando inteiro falha
        novas.push({ nova: l });
      }
      const feitas = novas.map(n => {
        if (n.nova) { s.tabelas[t].push(n.nova); return n.nova; }
        if (t === 'lab_results' && n.d.valor !== undefined && n.d.value_original_text === undefined && n.d.valor !== n.merge.valor) n.merge.value_original_text = '__refazer__';
        Object.assign(n.merge, n.d);
        if (t === 'lab_results') preencherLegado(n.merge);
        if ((COLUNAS[t] || []).includes('updated_at')) n.merge.updated_at = carimbo();
        return n.merge;
      });
      if (!q.retornar) return { data: null, error: null };
      return finalizar(q, projetar(feitas, q.colunas));
    }

    if (q.acao === 'update') {
      // policy de UPDATE: nas tabelas de metodologia so o dono (a leitura e mais ampla); registro de homologacao nao tem policy de UPDATE
      let alvo = filtrar(visiveis(t, uid), q.filtros);
      if (METODOLOGIA.includes(t)) alvo = alvo.filter(l => l.nutritionist_id === uid);
      if (t === 'methodology_homologation_records') alvo = [];
      const e0 = validarColunas(t, q.dados); if (e0) return e0;
      for (const l of alvo) {
        const teste = Object.assign({}, l, q.dados);
        // triggers BEFORE UPDATE da Etapa 4 disparam antes das constraints (como no Postgres)
        if (t === 'methodology_packages') {
          const novo = teste;
          const sem = (o, chaves) => { const c = {}; Object.keys(o).sort().forEach(k => { if (!chaves.includes(k) && o[k] !== undefined) c[k] = o[k]; }); return JSON.stringify(c); };
          if (novo.status === 'aprovado' && l.status !== 'aprovado' && s.aprovacaoRpc !== l.id) return erro('aprovacao nao e edicao administrativa: use aprovar_pacote_metodologico (validador + registro de homologacao)', 'P0001');
          if (l.status === 'aprovado' && novo.status !== 'aprovado' && novo.status !== 'retirado') return erro('pacote aprovado e imutavel: alteracao exige NOVA VERSAO', 'P0001');
          if (l.status === 'aprovado' && novo.status === 'retirado' && sem(l, ['updated_at', 'status', 'retired_at', 'retired_reason', 'effective_to']) !== sem(novo, ['updated_at', 'status', 'retired_at', 'retired_reason', 'effective_to'])) return erro('pacote aprovado e imutavel: retirar so muda status, retired_at, retired_reason e effective_to', 'P0001');
          if (l.status === 'aprovado' && novo.status === 'aprovado' && sem(l, ['updated_at']) !== sem(novo, ['updated_at'])) return erro('pacote aprovado e imutavel: alteracao exige NOVA VERSAO', 'P0001');
          if (l.status === 'retirado' && sem(l, ['updated_at']) !== sem(novo, ['updated_at'])) return erro('pacote retirado e historico: permanece recuperavel e nao muda', 'P0001');
          if (l.status !== 'aprovado' && novo.status === 'retirado') return erro('so um pacote aprovado pode ser retirado', 'P0001');
        }
        if (FILHAS_PACOTE.includes(t) && t !== 'methodology_homologation_records') {
          const p = s.tabelas.methodology_packages.find(x => x.id === l.package_id);
          if (p && ['aprovado', 'retirado'].includes(p.status) && s.aprovacaoRpc !== p.id) return erro('conteudo de pacote ' + p.status + ' e imutavel: crie uma nova versao do pacote', 'P0001');
          if (('package_id' in q.dados && q.dados.package_id !== l.package_id) || ('nutritionist_id' in q.dados && q.dados.nutritionist_id !== l.nutritionist_id)) return erro('elemento nao muda de pacote nem de profissional', 'P0001');
        }
        // trigger documents_proteger (prontuario 20261011100000): o arquivo e o paciente nao mudam
        if (t === 'documents') {
          const fixos = ['patient_id', 'nutritionist_id', 'storage_path', 'mime_type', 'tamanho_bytes', 'origem_local', 'created_at'];
          const mudou = fixos.find(c => c in q.dados && JSON.stringify(q.dados[c] === undefined ? null : q.dados[c]) !== JSON.stringify(l[c] === undefined ? null : l[c]));
          if (mudou) return { data: null, error: { message: 'o arquivo do documento nao muda: so titulo, tipo, data, observacao e arquivamento', code: 'P0001', hint: 'documento_imutavel' } };
        }
        // trigger registro_clinico_concluido_imutavel (Etapa 6.5 B)
        if (t === 'tool_applications') {
          const ec = erroConcluido(l, teste);
          if (ec) return { data: null, error: { message: ec[0], code: 'P0001', hint: ec[1] } };
        }
        const e = checarLinha(t, teste, uid); if (e) return e;
        // trigger proteger_revisao_consolidada (V1 Etapa 2)
        if ((t === 'anamneses' || t === 'conducts') && l.status !== 'rascunho') {
          const livres = ['updated_at', 'superseded_at', 'status', 'reviewed_at', 'reviewed_by'];
          const mudou = Object.keys(q.dados).find(c => !livres.includes(c) && JSON.stringify(q.dados[c] === undefined ? null : q.dados[c]) !== JSON.stringify(l[c] === undefined ? null : l[c]));
          if (mudou) return erro('revisao consolidada e imutavel: corrija criando uma nova revisao', 'P0001');
          if ('status' in q.dados && q.dados.status !== l.status && !(l.status === 'salvo' && q.dados.status === 'revisado')) return erro('revisao consolidada so pode passar de salvo para revisado', 'P0001');
          if (l.superseded_at && 'superseded_at' in q.dados && q.dados.superseded_at !== l.superseded_at) return erro('superseded_at nao pode ser alterado depois de definido', 'P0001');
        }
        // trigger proteger_emissao (V1 Etapa 3): emitido so recebe superseded_at (uma vez)
        if (t === 'report_emissions' && l.status === 'emitido') {
          const livres = ['updated_at', 'superseded_at'];
          const mudou = Object.keys(q.dados).find(c => !livres.includes(c) && JSON.stringify(q.dados[c] === undefined ? null : q.dados[c]) !== JSON.stringify(l[c] === undefined ? null : l[c]));
          if (mudou) return erro('emissao de relatorio e imutavel: corrija com uma retificacao (nova emissao)', 'P0001');
          if (l.superseded_at && 'superseded_at' in q.dados && q.dados.superseded_at !== l.superseded_at) return erro('superseded_at nao pode ser alterado depois de definido', 'P0001');
        }
        if (t === 'report_emissions' && (('patient_id' in q.dados && q.dados.patient_id !== l.patient_id) || ('nutritionist_id' in q.dados && q.dados.nutritionist_id !== l.nutritionist_id))) return erro('emissao nao muda de paciente ou profissional', 'P0001');
        if (t === 'agreements' && (('conduct_id' in q.dados && q.dados.conduct_id !== l.conduct_id) || ('patient_id' in q.dados && q.dados.patient_id !== l.patient_id))) {
          return erro('acordo nao muda de conduta, paciente ou profissional', 'P0001');
        }
        // trigger proteger_snapshot_holoscan (+ encounter_id, V1 Etapa 1 ajuste final)
        if (t === 'holoscan_applications') {
          const IMUTAVEIS = ['nutritionist_id', 'patient_id', 'encounter_id', 'methodology_package_id', 'methodology_package_version', 'quando', 'versao_estrutura', 'versao_bancos',
            'methodology_content_hash', 'engine_version', 'engine_contract_version', 'calculation_mode',
            'indice', 'indice_maximo', 'avaliavel', 'nota_media', 'triada', 'triada_com_dado', 'cobertura', 'combinacoes', 'aprofundamentos'];
          const mudou = IMUTAVEIS.find(c => c in q.dados && JSON.stringify(q.dados[c] === undefined ? null : q.dados[c]) !== JSON.stringify(l[c] === undefined ? null : l[c]));
          if (mudou) return erro('campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id); somente interpretacao_texto, interpretacao_em e interpretacao_versao podem ser alterados', 'P0001');
        }
      }
      alvo.forEach(l => {
        const statusAntes = l.status;
        const arqAntes = l.arquivado_em || null;
        Object.assign(l, q.dados);
        if (t === 'documents' && 'arquivado_em' in q.dados) {   // quem e quando: do servidor
          if (q.dados.arquivado_em && !arqAntes) { l.arquivado_em = agora(); l.arquivado_por = uid; }
          else if (!q.dados.arquivado_em) { l.arquivado_em = null; l.arquivado_por = null; }
          else { l.arquivado_em = arqAntes; }
        }
        if ((COLUNAS[t] || []).includes('updated_at')) l.updated_at = carimbo();
        if (t === 'agreements' && 'status' in q.dados && q.dados.status !== statusAntes) l.status_changed_at = agora();
        if ((t === 'anamneses' || t === 'conducts')) {
          if (l.status === 'revisado' && statusAntes !== 'revisado') { l.reviewed_at = l.reviewed_at || agora(); l.reviewed_by = uid; }
          if (l.status !== 'revisado') { l.reviewed_at = null; l.reviewed_by = null; }
        }
      });
      if (!q.retornar) return { data: null, error: null };
      return finalizar(q, projetar(alvo, q.colunas));
    }

    if (q.acao === 'delete') {
      // encounters, anamneses, conducts: sem policy de DELETE (RLS) — zero linhas, sem erro, como no Postgres
      if (t === 'encounters' || t === 'anamneses' || t === 'conducts' || t === 'report_emissions' || t === 'methodology_packages' || t === 'methodology_homologation_records') return q.retornar ? finalizar(q, []) : { data: null, error: null };
      if (FILHAS_PACOTE.includes(t)) {
        const alvoF = filtrar(visiveis(t, uid), q.filtros);
        for (const l of alvoF) { const p = s.tabelas.methodology_packages.find(x => x.id === l.package_id); if (p && ['aprovado', 'retirado'].includes(p.status) && p.nutritionist_id === uid) return erro('conteudo de pacote ' + p.status + ' e imutavel: crie uma nova versao do pacote', 'P0001'); }
        const idsF = new Set(alvoF.filter(l => { const p = s.tabelas.methodology_packages.find(x => x.id === l.package_id); return p && p.nutritionist_id === uid && ['rascunho', 'em_revisao'].includes(p.status); }).map(l => l.id));
        const feitas = s.tabelas[t].filter(l => idsF.has(l.id));
        s.tabelas[t] = s.tabelas[t].filter(l => !idsF.has(l.id));
        return q.retornar ? finalizar(q, projetar(feitas, q.colunas)) : { data: null, error: null };
      }
      let alvo = filtrar(visiveis(t, uid), q.filtros);
      // agreements: so de conduta em RASCUNHO (policy agreements_delete_rascunho)
      if (t === 'agreements') alvo = alvo.filter(g => { const c = s.tabelas.conducts.find(x => x.id === g.conduct_id); return c && c.status === 'rascunho'; });
      if (t === 'patients') {
        for (const p of alvo) {
          for (const filha of COM_PACIENTE) {
            if (s.tabelas[filha].some(l => l.patient_id === p.id)) {
              return erro('update or delete on table "patients" violates foreign key constraint on table "' + filha + '"', '23503');
            }
          }
        }
      }
      const ids = new Set(alvo.map(l => l.id));
      s.tabelas[t] = s.tabelas[t].filter(l => !ids.has(l.id));
      // CASCADE das filhas
      Object.entries(FILHAS).forEach(([filha, [col, mae]]) => {
        if (mae === t) s.tabelas[filha] = s.tabelas[filha].filter(l => !ids.has(l[col]));
      });
      if (!q.retornar) return { data: null, error: null };
      return finalizar(q, projetar(alvo, q.colunas));
    }
    return erro('acao desconhecida ' + q.acao);
  }

  const resultadoHolos = criarResultadoHolos(s, { statusConta: (u) => statusConta(u), carimbo: () => carimbo() });
  const revisaoPerguntas = criarRevisaoPerguntas(s, {});
  s.revisaoPerguntas = revisaoPerguntas;
  function rpc(uid, nome, args) {
    if (revisaoPerguntas.NOMES.includes(nome)) return revisaoPerguntas.rpc(uid, nome, args);   // publicas (sem login)
    if (nome === 'minha_conta_status') return uid ? { data: statusConta(uid), error: null } : erro('permission denied for function minha_conta_status', '42501');
    if (nome === 'eh_administrador') return { data: !!uid && s.administradores.includes(uid), error: null };
    if (nome === 'listar_contas' || nome === 'decidir_conta') {
      if (!uid || !s.administradores.includes(uid)) return erro('apenas administradores', '42501');
      if (nome === 'listar_contas') {
        const st = args && 'p_status' in args ? args.p_status : 'pendente';
        const email = (id) => Object.keys(s.contas).find(e => s.contas[e].id === id) || null;
        return { data: s.tabelas.profiles.filter(p => p.status && (st === null || p.status === st))
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .map(p => ({ id: p.id, nome: p.nome, telefone: p.telefone, email: email(p.id), status: p.status, criado_em: p.created_at, aprovado_em: p.aprovado_em })), error: null };
      }
      const p = s.tabelas.profiles.find(x => x.id === args.p_user);
      if (!p) return erro('conta nao encontrada', 'P0002');
      p.status = args.p_aprovar ? 'ativo' : 'recusado'; p.aprovado_em = agora(); p.aprovado_por = uid;
      return { data: p.status, error: null };
    }
    if (!uid) return erro('permission denied for function ' + nome, '42501');
    if (deveFalhar('rpc:' + nome, 'rpc') || deveFalhar(null, 'rpc')) return erro('falha simulada em rpc ' + nome, 'SIMULADA');
    const p = args && args.payload;
    if (resultadoHolos.NOMES.includes(nome)) return resultadoHolos.rpc(uid, nome, args);
    if (nome === 'salvar_holoscan_completo') {
      if (!p || !p.application || !p.answers || !p.scores) return erro('payload incompleto', 'P0001');
      const a = p.application;
      /* Correcao P0 (migration 20261005100000): so aplicacao OFICIAL. Nivel 1 (proveniencia) e nivel 2
         (conferencia estrutural, so contagem) como a RPC real; o recalculo do hash do conteudo
         (metodologia_hash_conteudo) fica provado no harness SQL — aqui confere-se o hash homologado. */
      const mpId = a.methodology_package_id || null, mpVer = a.methodology_package_version == null ? null : Number(a.methodology_package_version);
      const recusa = (m, hint) => ({ data: null, error: { message: m, code: 'P0001', hint, details: null } });
      if (!mpId || mpVer === null) return recusa('proveniencia metodologica obrigatoria: aplicacao HOLOSCAN nova exige o pacote metodologico oficial (id e versao)', 'proveniencia_obrigatoria');
      if (a.calculation_mode !== 'oficial') return recusa('resultado oficial obrigatorio: calculation_mode deve ser oficial', 'modo_nao_oficial');
      if (a.engine_contract_version !== 'holoscan-motor-contrato-v1' || !a.engine_version) return recusa('resultado oficial obrigatorio: motor ou contrato do motor desconhecido', 'motor_desconhecido');
      if (!a.encounter_id) return recusa('aplicacao oficial exige atendimento (encounter_id)', 'sem_atendimento');
      const mp = s.tabelas.methodology_packages.find(x => x.id === mpId);
      if (!mp) return { data: null, error: { message: 'pacote metodologico ' + mpId + ' nao existe', code: 'P0002', hint: 'pacote_inexistente' } };
      if (mp.version !== mpVer) return recusa('versao declarada (' + mpVer + ') nao e a versao do pacote (' + mp.version + ')', 'proveniencia_incoerente');
      if (mp.status !== 'aprovado') return recusa('pacote metodologico nao aprovado (status ' + mp.status + '): nao produz aplicacao oficial', 'pacote_nao_aprovado');
      if (!a.quando || !mp.effective_from || mp.effective_from > a.quando || (mp.effective_to && mp.effective_to < a.quando)) return recusa('pacote metodologico nao vigente em ' + a.quando, 'pacote_nao_vigente');
      if (!a.methodology_content_hash || !mp.content_hash || a.methodology_content_hash !== mp.content_hash) return recusa('hash do pacote metodologico divergente do homologado', 'hash_divergente');
      const perg = s.tabelas.methodology_questions.filter(x => x.package_id === mpId);
      const esc = s.tabelas.methodology_scales.filter(x => x.package_id === mpId);
      const sist = s.tabelas.methodology_systems.filter(x => x.package_id === mpId).map(x => x.code);
      const prim = s.tabelas.methodology_associations.filter(x => x.package_id === mpId && x.destination_type === 'system' && x.role === 'primaria');
      if (!p.answers.length) return recusa('resultado oficial sem respostas', 'sem_respostas');
      if (new Set(p.answers.map(r => r.marcador_id)).size !== p.answers.length) return recusa('resposta duplicada para a mesma pergunta', 'resposta_duplicada');
      for (const r of p.answers) {
        const q = perg.find(x => x.stable_id === r.marcador_id), e = q && esc.find(x => x.code === q.scale_code);
        if (!e || typeof r.valor !== 'number' || !Number.isInteger(r.valor) || r.valor < e.min_value || r.valor > e.max_value) return recusa('resposta fora do pacote metodologico ou fora da escala do item', 'resposta_invalida');
      }
      if (!a.cobertura || a.cobertura.respondidos !== p.answers.length || a.cobertura.total !== perg.length) return recusa('contagem de cobertura divergente das respostas enviadas', 'contagem_divergente');
      if (p.scores.length !== sist.length || new Set(p.scores.map(x => x.sistema).filter(c => sist.includes(c))).size !== sist.length) return recusa('as notas devem cobrir exatamente os sistemas do pacote metodologico', 'sistemas_divergentes');
      const respondidas = new Set(p.answers.map(r => r.marcador_id));
      for (const sc of p.scores) {
        const meus = prim.filter(x => x.destination_id === sc.sistema);
        if (sc.respondidos !== meus.filter(x => respondidas.has(x.question_stable_id)).length || sc.total_marcadores !== meus.length) return recusa('contagem do sistema ' + sc.sistema + ' divergente dos vinculos primarios do pacote (vinculo secundario nao pontua)', 'contagem_divergente');
        if (typeof sc.avaliavel !== 'boolean') return recusa('sistema sem indicacao de avaliabilidade', 'nota_incoerente');
        if (sc.avaliavel) {
          if (typeof sc.nota !== 'number' || sc.nota < 0 || sc.nota > 10 || !sc.faixa) return recusa('sistema ' + sc.sistema + ' avaliavel sem nota 0..10 ou sem faixa', 'nota_incoerente');
          if (!s.tabelas.methodology_ranges.some(f => f.package_id === mpId && f.destination_type === 'system' && f.destination_id === sc.sistema && f.label === sc.faixa)) return recusa('faixa ' + sc.faixa + ' do sistema ' + sc.sistema + ' nao e uma faixa do pacote metodologico', 'faixa_fora_do_pacote');
        } else if (sc.nota !== null && sc.nota !== undefined || sc.faixa !== null && sc.faixa !== undefined) return recusa('sistema ' + sc.sistema + ' nao avaliavel nao tem nota nem faixa (ausencia nao e zero)', 'nota_incoerente');
      }
      const todos = p.scores.every(x => x.avaliavel);
      if ((a.indice === null || a.indice === undefined) === todos) return recusa('o Indice HOLOS existe se, e somente se, os sistemas forem todos avaliaveis (sem Indice parcial)', 'indice_incoerente');
      if ((a.indice === null || a.indice === undefined) !== (a.nota_media === null || a.nota_media === undefined)) return recusa('nota_media acompanha o Indice (nula quando o Indice e nulo)', 'indice_incoerente');
      if ((a.combinacoes || []).length || (a.aprofundamentos || []).length) return recusa('combinacoes e aprofundamentos nao fazem parte do pacote homologado: a aplicacao oficial os grava vazios', 'saida_nao_homologada');
      // rodada 08: eixo sem dado grava null, como a RPC real
      const triadaNorm = {};
      Object.keys(a.triada || {}).forEach(k => {
        triadaNorm[k] = a.triada_com_dado && a.triada_com_dado[k] === false ? null : a.triada[k];
      });
      const app = novaLinha('holoscan_applications', {
        nutritionist_id: uid, patient_id: a.patient_id, encounter_id: a.encounter_id || null, quando: a.quando,
        versao_estrutura: a.versao_estrutura, versao_bancos: a.versao_bancos,
        indice: a.indice, indice_maximo: a.indice_maximo, avaliavel: a.avaliavel,
        nota_media: a.nota_media, triada: triadaNorm, triada_com_dado: a.triada_com_dado,
        cobertura: a.cobertura, combinacoes: a.combinacoes || [], aprofundamentos: a.aprofundamentos || [],
        interpretacao_texto: a.interpretacao_texto || null,
        interpretacao_em: a.interpretacao_em || null,
        interpretacao_versao: a.interpretacao_versao || null,
        methodology_package_id: mpId, methodology_package_version: mpVer,
        methodology_content_hash: a.methodology_content_hash, engine_version: a.engine_version,
        engine_contract_version: a.engine_contract_version, calculation_mode: 'oficial'
      }, uid);
      const e = checarLinha('holoscan_applications', app, uid);
      if (e) return e;
      s.tabelas.holoscan_applications.push(app);
      p.answers.forEach(r => s.tabelas.holoscan_answers.push(novaLinha('holoscan_answers',
        { application_id: app.id, marcador_id: r.marcador_id, valor: Number(r.valor) }, uid)));
      // rodada 08: sistema sem resposta grava nota/carga/faixa null
      p.scores.forEach(r => s.tabelas.holoscan_system_scores.push(novaLinha('holoscan_system_scores',
        Object.assign({ application_id: app.id }, r,
          r.avaliavel ? {} : { nota: null, carga: null, faixa: null }), uid)));
      return { data: app.id, error: null };
    }
    if (nome === 'salvar_coleta_exames') return { data: null, error: { message: 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario', code: 'P0001', hint: 'laboratorio_desativado' } };
    if (nome === 'salvar_coleta_exames') {
      // Etapa 0 da V1: espelha a migration 20260930140000 reescrita —
      // identidade pelo id (collection.id → editar; sem id → inserir),
      // nunca por (paciente, data); nenhuma recusa por data.
      if (!p || !p.collection || !p.results) return erro('payload incompleto', 'P0001');
      const c = p.collection;
      const desconhecida = !!c.data_coleta_desconhecida;
      const dt = desconhecida ? null : (c.coletado_em || null);
      if (!desconhecida && !dt) return erro('coleta com data: informe coletado_em, ou marque data_coleta_desconhecida', 'P0001');
      if (!pacienteDe(uid, c.patient_id)) return erro('violates foreign key constraint', '23503');
      const arqColeta = erroArquivado('lab_collections', c);
      if (arqColeta) return arqColeta;
      let col = null;
      if (c.id) {
        col = s.tabelas.lab_collections.find(x => x.id === c.id && x.nutritionist_id === uid && x.patient_id === c.patient_id);
        if (!col) return erro('coleta ' + c.id + ' nao encontrada para este paciente', 'P0002');
      }
      if (col) {
        col.coletado_em = dt; col.data_coleta_desconhecida = desconhecida;
        col.laboratorio = c.laboratorio || null; col.observacao = c.observacao || null;
        col.updated_at = carimbo();
        s.tabelas.lab_results = s.tabelas.lab_results.filter(r => r.collection_id !== col.id);
      } else {
        col = novaLinha('lab_collections', { nutritionist_id: uid, patient_id: c.patient_id, coletado_em: dt,
          data_coleta_desconhecida: desconhecida, laboratorio: c.laboratorio || null, observacao: c.observacao || null }, uid);
        s.tabelas.lab_collections.push(col);
      }
      p.results.forEach(r => s.tabelas.lab_results.push(novaLinha('lab_results',
        Object.assign({ collection_id: col.id }, r, { valor: Number(r.valor) }), uid)));
      return { data: col.id, error: null };
    }
    if (nome === 'criar_atendimento') {
      // V1 Etapa 1: idempotente por operation_id; RLS/FKs como na migration 160000
      if (!p || !p.patient_id || !p.occurred_at) return erro('payload incompleto: patient_id e occurred_at sao obrigatorios', 'P0001');
      const op = p.operation_id || null;
      if (op) {
        const ja = s.tabelas.encounters.find(e => e.nutritionist_id === uid && e.operation_id === op);
        if (ja) {
          if (ja.patient_id !== p.patient_id) return erro('operation_id ja usado em atendimento de outro paciente', 'P0001');
          return { data: ja.id, error: null };
        }
      }
      const linha = novaLinha('encounters', {
        nutritionist_id: uid, patient_id: p.patient_id, consultation_id: p.consultation_id || null,
        occurred_at: p.occurred_at, timezone: p.timezone || null, type: p.type || null,
        modality: p.modality || null, status: p.status || null, summary_text: p.summary_text || null,
        operation_id: op
      }, uid);
      const e = checarLinha('encounters', linha, uid);
      if (e) return e;
      s.tabelas.encounters.push(linha);
      return { data: linha.id, error: null };
    }
    if (nome === 'reagendar_consulta') {
      // V1 Etapa 1: atomica — novo agendamento ligado ao original; o original vira cancelado
      const a = args || {};
      const orig = s.tabelas.consultations.find(c => c.id === a.p_consultation_id && c.nutritionist_id === uid);
      if (!orig) return erro('consulta ' + a.p_consultation_id + ' nao encontrada', 'P0002');
      if (!a.p_data || !a.p_hora) return erro('informe a nova data e a nova hora', 'P0001');
      if (orig.cancelled_at || orig.rescheduled_to_id) return erro('consulta ja cancelada ou reagendada; reagende a consulta vigente', 'P0001');
      const novo = novaLinha('consultations', {
        nutritionist_id: uid, patient_id: orig.patient_id, data: a.p_data, hora: a.p_hora,
        duracao_min: a.p_duracao_min || orig.duracao_min, tipo: a.p_tipo || orig.tipo,
        nota: a.p_nota != null ? a.p_nota : orig.nota, rescheduled_from_id: orig.id
      }, uid);
      const e = checarLinha('consultations', novo, uid);
      if (e) return e;
      s.tabelas.consultations.push(novo);
      orig.cancelled_at = agora(); orig.cancellation_reason = a.p_motivo || 'reagendada';
      orig.rescheduled_to_id = novo.id; orig.updated_at = carimbo();
      return { data: novo.id, error: null };
    }
    // ---------------- V1 Etapa 2 ----------------
    const encontrarAtendimento = (eid) => s.tabelas.encounters.find(e => e.id === eid && e.nutritionist_id === uid);
    const maxRev = (t, eid) => s.tabelas[t].filter(x => x.encounter_id === eid).reduce((m, x) => Math.max(m, x.revision_number), 0);
    const porOp = (t, op) => op ? s.tabelas[t].find(x => x.nutritionist_id === uid && x.operation_id === op) : null;
    const atualizar = (t, id, dados) => consultar(uid, { tabela: t, acao: 'update', dados, filtros: [{ op: 'eq', col: 'id', val: id }], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true });
    const inserir = (t, dados) => consultar(uid, { tabela: t, acao: 'insert', dados, filtros: [], ordem: [], range: null, colunas: '*', single: null, opcoes: {}, retornar: true });

    if (nome === 'salvar_anamnese') {
      if (!p) return erro('payload vazio', 'P0001');
      const status = p.status || 'rascunho';
      if (!['rascunho', 'salvo', 'revisado'].includes(status)) return erro('status invalido', 'P0001');
      const ja = porOp('anamneses', p.operation_id); if (ja) return { data: ja.id, error: null };
      let atual = p.id ? s.tabelas.anamneses.find(a => a.id === p.id && a.nutritionist_id === uid) : null;
      if (p.id && !atual) return erro('anamnese ' + p.id + ' nao encontrada', 'P0002');
      if (atual && p.expected_updated_at && atual.updated_at !== p.expected_updated_at) return erro('a anamnese foi alterada em outro lugar; recarregue antes de salvar', 'P0001');
      const soStatus = (x) => Object.keys(x).every(k => ['id', 'status', 'operation_id', 'expected_updated_at'].includes(k) || x[k] === undefined);
      if (atual && atual.status === 'salvo' && status === 'revisado' && soStatus(p)) { const r = atualizar('anamneses', atual.id, { status: 'revisado' }); return r.error ? r : { data: atual.id, error: null }; }
      if (atual && atual.status === 'rascunho') {
        const r = atualizar('anamneses', atual.id, { content: p.content !== undefined ? p.content : atual.content, status, revision_note: p.revision_note !== undefined && p.revision_note !== null ? p.revision_note : atual.revision_note, operation_id: atual.operation_id || p.operation_id || null });
        if (!r.error && status !== 'rascunho' && atual.supersedes_id) { const ant = s.tabelas.anamneses.find(x => x.id === atual.supersedes_id); if (ant && !ant.superseded_at) atualizar('anamneses', ant.id, { superseded_at: agora() }); }
        return r.error ? r : { data: atual.id, error: null };
      }
      if (atual) {
        const r = inserir('anamneses', { patient_id: atual.patient_id, encounter_id: atual.encounter_id, revision_number: maxRev('anamneses', atual.encounter_id) + 1, status, content_version: atual.content_version,
          content: p.content !== undefined ? p.content : atual.content, source_anamnesis_id: atual.source_anamnesis_id || null, copied_from_previous: atual.copied_from_previous, supersedes_id: atual.id, revision_note: p.revision_note || null, operation_id: p.operation_id || null });
        if (r.error) return r;
        if (status !== 'rascunho') atualizar('anamneses', atual.id, { superseded_at: agora() });
        return { data: r.data[0].id, error: null };
      }
      const e = encontrarAtendimento(p.encounter_id); if (!e) return erro('atendimento ' + p.encounter_id + ' nao encontrado', 'P0002');
      const rasc = s.tabelas.anamneses.find(a => a.encounter_id === e.id && a.status === 'rascunho');
      if (rasc) { const r = atualizar('anamneses', rasc.id, { content: p.content !== undefined ? p.content : rasc.content, status, revision_note: p.revision_note || rasc.revision_note || null, operation_id: rasc.operation_id || p.operation_id || null }); return r.error ? r : { data: rasc.id, error: null }; }
      const r = inserir('anamneses', { patient_id: e.patient_id, encounter_id: e.id, revision_number: maxRev('anamneses', e.id) + 1, status, content: p.content || {},
        source_anamnesis_id: p.source_anamnesis_id || null, copied_from_previous: !!p.copied_from_previous, revision_note: p.revision_note || null, operation_id: p.operation_id || null });
      return r.error ? r : { data: r.data[0].id, error: null };
    }
    if (nome === 'criar_anamnese_a_partir_de') {
      const a = args || {};
      const ja = porOp('anamneses', a.p_operation_id); if (ja) return { data: ja.id, error: null };
      const e = encontrarAtendimento(a.p_encounter_id); if (!e) return erro('atendimento nao encontrado', 'P0002');
      const fonte = s.tabelas.anamneses.find(x => x.id === a.p_source_id && x.nutritionist_id === uid);
      if (!fonte) return erro('anamnese de origem nao encontrada', 'P0002');
      if (fonte.patient_id !== e.patient_id) return erro('anamnese de origem e de outro paciente', 'P0001');
      if (fonte.status === 'rascunho') return erro('so uma anamnese salva ou revisada pode ser copiada', 'P0001');
      if (s.tabelas.anamneses.some(x => x.encounter_id === e.id && x.status === 'rascunho')) return erro('este atendimento ja tem um rascunho de anamnese', 'P0001');
      const conteudo = { dominios: {} };
      Object.entries((fonte.content || {}).dominios || {}).forEach(([k, v]) => { conteudo.dominios[k] = { itens: (v.itens || []).map(it => Object.assign({}, it, { previo: true, fonte_anamnese_id: fonte.id })) }; });
      const r = inserir('anamneses', { patient_id: e.patient_id, encounter_id: e.id, revision_number: maxRev('anamneses', e.id) + 1, status: 'rascunho', content_version: fonte.content_version, content: conteudo, source_anamnesis_id: fonte.id, copied_from_previous: true, operation_id: a.p_operation_id || null });
      return r.error ? r : { data: r.data[0].id, error: null };
    }
    if (nome === 'salvar_conduta') {
      if (!p) return erro('payload vazio', 'P0001');
      const status = p.status || 'rascunho';
      if (!['rascunho', 'salvo', 'revisado'].includes(status)) return erro('status invalido', 'P0001');
      const ja = porOp('conducts', p.operation_id); if (ja) return { data: ja.id, error: null };
      const CAMPOS = ['objective', 'nutrition_strategy', 'actions', 'resources', 'requested_exams', 'referrals', 'monitoring', 'return_plan', 'observations', 'nutrition_diagnosis', 'dietary_prescription', 'professional_guidance'];
      const campos = (base) => { const o = {}; CAMPOS.forEach(c => { o[c] = p[c] !== undefined ? (p[c] === '' ? null : p[c]) : (base ? base[c] : null); });
        // trigger conducts_sem_prescricao (prontuario 20261011100000): nada novo nesses 3 campos
        ['dietary_prescription', 'nutrition_diagnosis', 'referrals'].forEach(c => { o[c] = base ? (base[c] === undefined ? null : base[c]) : null; });
        return o; };
      let atual = p.id ? s.tabelas.conducts.find(c => c.id === p.id && c.nutritionist_id === uid) : null;
      if (p.id && !atual) return erro('conduta ' + p.id + ' nao encontrada', 'P0002');
      if (atual && p.expected_updated_at && atual.updated_at !== p.expected_updated_at) return erro('a conduta foi alterada em outro lugar; recarregue antes de salvar', 'P0001');
      let e, alvo, promover = false;
      const soStatusC = (x) => Object.keys(x).every(k => ['id', 'status', 'operation_id', 'expected_updated_at'].includes(k) || x[k] === undefined);
      if (atual && atual.status === 'salvo' && status === 'revisado' && soStatusC(p)) { const r = atualizar('conducts', atual.id, { status: 'revisado' }); return r.error ? r : { data: atual.id, error: null }; }
      if (!atual) {
        e = encontrarAtendimento(p.encounter_id); if (!e) return erro('atendimento ' + p.encounter_id + ' nao encontrado', 'P0002');
        atual = s.tabelas.conducts.find(c => c.encounter_id === e.id && c.status === 'rascunho') || null;
      } else e = encontrarAtendimento(atual.encounter_id);
      if (atual && atual.status === 'rascunho') {
        promover = true;
        const r = atualizar('conducts', atual.id, Object.assign(campos(atual), { priorities: p.priorities || atual.priorities, related_tools: p.related_tools || atual.related_tools, references: p.references || atual.references,
          previous_conduct_id: p.previous_conduct_id || atual.previous_conduct_id || null, previous_decision: p.previous_decision || atual.previous_decision || null,
          previous_decision_note: p.previous_decision_note !== undefined ? p.previous_decision_note : atual.previous_decision_note, revision_note: p.revision_note || atual.revision_note || null, operation_id: atual.operation_id || p.operation_id || null }));
        if (r.error) return r; alvo = atual;
      } else if (atual) {
        const r = inserir('conducts', Object.assign(campos(atual), { patient_id: atual.patient_id, encounter_id: atual.encounter_id, revision_number: maxRev('conducts', atual.encounter_id) + 1, status,
          priorities: p.priorities || atual.priorities, related_tools: p.related_tools || atual.related_tools, references: p.references || atual.references,
          previous_conduct_id: atual.previous_conduct_id || null, previous_decision: atual.previous_decision || null, previous_decision_note: atual.previous_decision_note || null,
          supersedes_id: atual.id, revision_note: p.revision_note || null, operation_id: p.operation_id || null }));
        if (r.error) return r; alvo = r.data[0];
        if (status !== 'rascunho') atualizar('conducts', atual.id, { superseded_at: agora() });
      } else {
        promover = true;
        const r = inserir('conducts', Object.assign(campos(null), { patient_id: e.patient_id, encounter_id: e.id, revision_number: maxRev('conducts', e.id) + 1, status: 'rascunho',
          priorities: p.priorities || [], related_tools: p.related_tools || [], references: p.references || {}, previous_conduct_id: p.previous_conduct_id || null,
          previous_decision: p.previous_decision || null, previous_decision_note: p.previous_decision_note || null, revision_note: p.revision_note || null, operation_id: p.operation_id || null }));
        if (r.error) return r; alvo = r.data[0];
      }
      if (Array.isArray(p.agreements)) {
        const mantidos = [];
        for (const g of p.agreements) {
          let ex = g.operation_id ? s.tabelas.agreements.find(x => x.nutritionist_id === uid && x.operation_id === g.operation_id) : null;
          if (!ex && g.id) ex = s.tabelas.agreements.find(x => x.id === g.id && x.conduct_id === alvo.id && x.nutritionist_id === uid);
          if (ex) { const r = atualizar('agreements', ex.id, { description: g.description || ex.description, responsible: g.responsible || null, due_text: g.due_text || null, follow_up: g.follow_up || null, status: g.status || ex.status, status_note: g.status_note || null, position: g.position !== undefined ? g.position : ex.position }); if (r.error) return r; }
          else { const r = inserir('agreements', { patient_id: e.patient_id, conduct_id: alvo.id, description: g.description, responsible: g.responsible || null, due_text: g.due_text || null, follow_up: g.follow_up || null, status: g.status || 'proposto', status_note: g.status_note || null, position: g.position || 0, origin_agreement_id: g.origin_agreement_id || null, operation_id: g.operation_id || null }); if (r.error) return r; ex = r.data[0]; }
          mantidos.push(ex.id);
        }
        if (promover) s.tabelas.agreements = s.tabelas.agreements.filter(x => x.conduct_id !== alvo.id || mantidos.includes(x.id));
      }
      if (promover && status !== 'rascunho') {
        const r = atualizar('conducts', alvo.id, { status }); if (r.error) return r;
        if (alvo.supersedes_id) { const ant = s.tabelas.conducts.find(x => x.id === alvo.supersedes_id); if (ant && !ant.superseded_at) atualizar('conducts', ant.id, { superseded_at: agora() }); }
      }
      return { data: alvo.id, error: null };
    }
    // ---------- V1 Etapa 4: pacote metodologico ----------
    const montarPacote = (id) => {
      const p = s.tabelas.methodology_packages.find(x => x.id === id); if (!p) return null;
      const filhas = (t) => s.tabelas[t].filter(x => x.package_id === id);
      return Object.assign({}, p, { edicao: filhas('methodology_questionnaire_editions')[0] || null, escalas: filhas('methodology_scales'), sistemas: filhas('methodology_systems'),
        perguntas: filhas('methodology_questions'), associacoes: filhas('methodology_associations'), faixas: filhas('methodology_ranges'), regras: filhas('methodology_rules'), registros: filhas('methodology_homologation_records') });
    };
    if (nome === 'validar_pacote_metodologico') {
      const id = args && args.p_package_id; const p = montarPacote(id);
      if (!p || !visiveis('methodology_packages', uid).some(x => x.id === id)) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      return { data: globalThis.PacoteMetodologico.validar(p), error: null };
    }
    // hash do conteudo calculado "no servidor" (o falso usa a mesma forma canonica para os dois passos)
    const hashServidor = (id) => {
      const p = montarPacote(id);
      const limpar = (o) => { const c = Object.assign({}, o); ['id', 'created_at', 'updated_at', 'nutritionist_id', 'package_id', 'edition_id'].forEach(k => delete c[k]); return c; };
      const ord = (lista, k) => lista.map(limpar).sort((a, b) => k(a) < k(b) ? -1 : k(a) > k(b) ? 1 : 0);
      const conteudo = { questions: ord(p.perguntas, x => x.stable_id), associations: ord(p.associacoes, x => [x.question_stable_id, x.destination_type, x.destination_id, x.role].join('|')), ranges: ord(p.faixas, x => [x.destination_type, x.destination_id, String(x.lower_bound).padStart(24, '0')].join('|')),
        systems: ord(p.sistemas, x => x.code), scales: ord(p.escalas, x => x.code), rules: ord(p.regras, x => x.rule_type + '|' + x.target), editions: ord(s.tabelas.methodology_questionnaire_editions.filter(e => e.package_id === id), x => x.code + '|' + x.version) };
      return createHash('sha256').update(JSON.stringify(conteudo), 'utf8').digest('hex');
    };
    const vigentes = (id) => s.tabelas.methodology_package_approvals.filter(a => a.package_id === id && !a.invalidated_at);
    if (nome === 'metodologia_hash_conteudo') {
      const id = args && args.p_package_id;
      if (!visiveis('methodology_packages', uid).some(x => x.id === id)) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      return { data: hashServidor(id), error: null };
    }
    if (nome === 'registrar_aprovacao_metodologica') {
      const id = args && args.p_package_id, etapa = args && args.p_etapa, resp = String((args && args.p_responsavel) || '').trim(), just = String((args && args.p_justificativa) || '').trim();
      if (!uid) return erro('nao autenticado', 'P0001');
      // migration 20261003100000: aprovador unico — so a etapa 1 (Daniel); etapa 2 descontinuada
      if (etapa === 2) return erro('Aprovacao 2 descontinuada: a V1 tem aprovador unico (Daniel); nao ha segunda revisao', 'P0001');
      if (etapa !== 1) return erro('etapa de aprovacao invalida: ' + etapa, 'P0001');
      if (/lideran/i.test(resp)) return erro('aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa', 'P0001');
      if (resp !== 'Daniel') return erro('a aprovacao e do aprovador unico da V1 (Daniel)', 'P0001');
      // identidade real — o usuario autenticado tem de ser o aprovador ativo holoscan/1
      const ap = aprovador(uid, 'holoscan', 1);
      if (!ap || ap.display_name !== resp) return erro('o usuario autenticado nao e o aprovador autorizado do HOLOSCAN (' + resp + ')', 'P0001');
      const pk = s.tabelas.methodology_packages.find(x => x.id === id);
      if (!pk) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      if (pk.status !== 'em_revisao') return erro('so um pacote em_revisao recebe aprovacao (status atual: ' + pk.status + ')', 'P0001');
      if (!just) return erro('aprovacao exige justificativa', 'P0001');
      const h = hashServidor(id);
      if (args.p_content_hash !== h) return erro('o pacote mudou: o hash conferido (' + String(args.p_content_hash || 'nenhum').slice(0, 12) + ') nao e o do conteudo atual (' + h.slice(0, 12) + ')', 'P0001');
      const v = globalThis.PacoteMetodologico.validar(montarPacote(id));
      if (!v.publicavel) return erro('aprovacao bloqueada pelo validador: ' + v.total_erros + ' erro(s)', 'P0001');
      vigentes(id).filter(a => a.package_version !== pk.version || a.content_hash !== h).forEach(a => { a.invalidated_at = agora(); a.invalidated_reason = 'versao ou conteudo diferentes do atual'; });
      if (vigentes(id).find(a => a.step === 1)) return erro('Aprovacao ja registrada para este conteudo', 'P0001');
      const linha = { id: randomUUID(), nutritionist_id: pk.nutritionist_id, package_id: id, package_version: pk.version, content_hash: h, step: 1, role: 'responsavel_primario',
        responsible: ap.display_name, justification: just, approved_by: uid, approver_id: ap.id, approved_at: carimbo(), invalidated_at: null, invalidated_reason: null, created_at: carimbo() };
      s.tabelas.methodology_package_approvals.push(linha);
      return { data: { id: linha.id, package_id: id, package_version: pk.version, content_hash: h, etapa: 1, responsavel: linha.responsible, approved_by: uid, approver_id: ap.id, status_pacote: pk.status, regime: 'aprovador_unico' }, error: null };
    }
    if (nome === 'aprovar_pacote_metodologico') {
      const id = args && args.p_package_id, reg = (args && args.p_registro) || {};
      if (!uid) return erro('nao autenticado', 'P0001');
      // migration 20261003100000: homologa quem e dono do pacote E aprovador ativo holoscan/1
      if (!aprovador(uid, 'holoscan', 1)) return erro('homologar o HOLOSCAN e ato do aprovador unico ativo (Daniel)', 'P0001');
      const pk = s.tabelas.methodology_packages.find(x => x.id === id && x.nutritionist_id === uid);
      if (!pk) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      if (pk.status !== 'em_revisao') return erro('so um pacote em_revisao pode ser aprovado (status atual: ' + pk.status + ')', 'P0001');
      const v = globalThis.PacoteMetodologico.validar(montarPacote(id));
      if (!v.publicavel) return erro('publicacao bloqueada pelo validador: ' + v.total_erros + ' erro(s) — ' + JSON.stringify(v.erros).slice(0, 400), 'P0001');
      const h = hashServidor(id);
      const a1 = vigentes(id).find(a => a.step === 1);
      if (!a1 || a1.package_version !== pk.version || a1.content_hash !== h)
        return erro('homologacao exige a Aprovacao (Daniel) vigente sobre o mesmo package_id, version e content_hash', 'P0001');
      const resp = 'Daniel (aprovador único — responsável metodológico)';
      const r0 = inserir('methodology_homologation_records', { package_id: id, topic: 'pacote', element: pk.code, version: String(pk.version), decision: 'aprovado', responsible: resp, decided_at: agora().slice(0, 10), source: 'aprovador unico',
        justification: 'Aprovação única (regime aprovador_unico, sem segunda revisão): ' + a1.justification, evidence: 'regime aprovador_unico; aprovacao ' + a1.id + '; content_hash ' + h + '; validar_pacote_metodologico: 0 erros' });
      if (r0.error) return r0;
      s.aprovacaoRpc = id;
      const r = atualizar('methodology_packages', id, { status: 'aprovado', governance_regime: 'aprovador_unico', approved_at: agora(), approved_by: a1.approved_by, reviewed_by: null, reviewed_at: null, responsible: resp, justification: pk.justification || 'aprovador unico', effective_from: reg.effective_from || pk.effective_from || agora().slice(0, 10), content_hash: h });
      s.aprovacaoRpc = null;
      if (r.error) return r;
      return { data: { id, status: 'aprovado', regime: 'aprovador_unico', content_hash: h, aprovacao_1: a1.id, validacao: v }, error: null };
    }
    // ---------------- V1 Etapa 5: laboratorio ----------------
    const gravarResultados = (cid, results) => {
      s.labRpc = cid;
      try {
        const antigos = s.tabelas.lab_results.filter(r => r.collection_id === cid && !r.exame_id).map(r => r.id);
        s.tabelas.lab_result_components = s.tabelas.lab_result_components.filter(k => !antigos.includes(k.result_id));
        s.tabelas.lab_results = s.tabelas.lab_results.filter(r => !antigos.includes(r.id));
        let n = 0, pos = 0;
        for (const r of (results || [])) {
          pos++;
          const code = r.exam_code ? String(r.exam_code).trim() : null, cust = r.custom_exam_id || null;
          if (!code && !cust) return erro('resultado ' + pos + ' sem exame (exam_code ou custom_exam_id)', 'P0001');
          if (code && cust) return erro('resultado ' + pos + ' com exame do catalogo E customizado', 'P0001');
          if (code && !s.tabelas.lab_exam_catalog.some(c => c.code === code && c.status === 'ativo')) return erro('exame ' + code + ' nao existe no catalogo-base', 'P0001');
          if (cust && !s.tabelas.lab_custom_exams.some(c => c.id === cust && c.nutritionist_id === uid)) return erro('exame customizado nao e deste profissional', 'P0001');
          if (!r.value_original_text || !String(r.value_original_text).trim()) return erro('resultado ' + pos + ' sem valor original', 'P0001');
          const q = r.qualifier || 'text', nv = q === 'eq' && r.numeric_value != null ? Number(r.numeric_value) : null;
          const refst = (r.report_reference_text != null || r.report_reference_min != null || r.report_reference_max != null) ? (r.reference_ambiguous === true ? 'ambiguous' : 'informed') : 'missing';   // Etapa 6.0.1
          const linha = novaLinha('lab_results', { collection_id: cid, exam_code: code, custom_exam_id: cust, variant: r.variant ? String(r.variant).trim() || null : null, value_original_text: String(r.value_original_text).trim(), numeric_value: nv, qualifier: q,
            censor_limit: r.censor_limit != null ? Number(r.censor_limit) : null, unit_original: r.unit_original ? String(r.unit_original).trim() || null : null, method: r.method || null, material: r.material || null,
            report_reference_text: r.report_reference_text ?? null, report_reference_min: r.report_reference_min != null ? Number(r.report_reference_min) : null, report_reference_max: r.report_reference_max != null ? Number(r.report_reference_max) : null,
            report_reference_operator: r.report_reference_operator || (refst === 'informed' ? 'range' : null), report_reference_unit: r.report_reference_unit || null, report_reference_population: r.report_reference_population || null,
            reference_status: refst, reference_source: 'laudo', origin: r.origin || 'manual', notes: r.notes || null, result_date: r.result_date || null, position: pos }, uid);
          const e = checarLinha('lab_results', linha, uid); if (e) return e;
          s.tabelas.lab_results.push(linha); n++;
          for (const [i, comp] of (r.components || []).entries()) {
            const k = novaLinha('lab_result_components', { result_id: linha.id, position: comp.position ?? i, original_name: comp.original_name, canonical_component_key: comp.canonical_component_key || null, value_original_text: comp.value_original_text,
              numeric_value: (comp.qualifier || 'text') === 'eq' && comp.numeric_value != null ? Number(comp.numeric_value) : null, qualifier: comp.qualifier || 'text', censor_limit: comp.censor_limit ?? null, unit_original: comp.unit_original || null,
              report_reference_text: comp.report_reference_text || null, report_reference_min: comp.report_reference_min ?? null, report_reference_max: comp.report_reference_max ?? null, report_reference_operator: comp.report_reference_operator || null, notes: comp.notes || null }, uid);
            const ek = checarLinha('lab_result_components', k, uid); if (ek) return ek;
            s.tabelas.lab_result_components.push(k);
          }
        }
        return { data: n, error: null };
      } finally { s.labRpc = null; }
    };
    if (nome === 'salvar_coleta_laboratorial') return { data: null, error: { message: 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario', code: 'P0001', hint: 'laboratorio_desativado' } };
    if (nome === 'salvar_coleta_laboratorial') {
      const c = p && p.collection; if (!c) return erro('payload incompleto: collection e obrigatoria', 'P0001');
      if (!pacienteDe(uid, c.patient_id)) return erro('paciente nao e deste profissional', 'P0001');
      const st = c.state || 'rascunho'; if (!['rascunho', 'salvo'].includes(st)) return erro('estado invalido para salvar: ' + st, 'P0001');
      const dt = c.clinical_date || null; if (!dt && st === 'salvo') return erro('coleta salva exige a data clinica (clinical_date)', 'P0001');
      let eid = null;
      if ('encounter_id' in c && c.encounter_id) { eid = c.encounter_id; if (!s.tabelas.encounters.some(e => e.id === eid && e.patient_id === c.patient_id && e.nutritionist_id === uid)) return erro('atendimento nao e deste paciente/profissional', 'P0001'); }
      const arq = erroArquivado('lab_collections', { patient_id: c.patient_id }); if (arq) return arq;
      const op = c.operation_id || null;
      if (!c.id && op) { const ja = s.tabelas.lab_collections.find(x => x.nutritionist_id === uid && x.operation_id === op); if (ja) { if (ja.patient_id !== c.patient_id) return erro('operation_id ja usado em coleta de outro paciente', 'P0001'); return { data: { id: ja.id, state: ja.state, repetida: true }, error: null }; } }
      let col;
      if (c.id) {
        col = s.tabelas.lab_collections.find(x => x.id === c.id && x.nutritionist_id === uid && x.patient_id === c.patient_id);
        if (!col) return erro('coleta ' + c.id + ' nao encontrada para este paciente', 'P0002');
        if (col.source !== 'legacy_panel' && ['salvo', 'revisado'].includes(col.state)) return erro('coleta consolidada: use revisar_coleta_laboratorial', 'P0001');
        Object.assign(col, { coletado_em: dt, data_coleta_desconhecida: !dt, clinical_time: c.clinical_time || null, laboratorio: c.laboratory_name ?? null, observacao: c.notes ?? null, state: st, source: 'manual', operation_id: op || col.operation_id || null, updated_at: carimbo() });
        if ('encounter_id' in c) col.encounter_id = eid; if ('document_id' in c) col.document_id = c.document_id || null;
        const e = checarLinha('lab_collections', col, uid); if (e) return e;
      } else {
        col = novaLinha('lab_collections', { nutritionist_id: uid, patient_id: c.patient_id, coletado_em: dt, data_coleta_desconhecida: !dt, clinical_time: c.clinical_time || null, laboratorio: c.laboratory_name ?? null, observacao: c.notes ?? null, encounter_id: eid, document_id: c.document_id || null, state: st, source: c.source || 'manual', operation_id: op, created_by: uid }, uid);
        const e = checarLinha('lab_collections', col, uid); if (e) return e;
        s.tabelas.lab_collections.push(col);
      }
      const g = gravarResultados(col.id, p.results); if (g.error) return g;
      if (st === 'salvo' && g.data === 0) return erro('coleta salva exige ao menos um resultado', 'P0001');
      return { data: { id: col.id, state: st, results: g.data, repetida: false }, error: null };
    }
    if (nome === 'revisar_coleta_laboratorial') return { data: null, error: { message: 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario', code: 'P0001', hint: 'laboratorio_desativado' } };
    if (nome === 'revisar_coleta_laboratorial') {
      const old = p && s.tabelas.lab_collections.find(x => x.id === p.collection_id && x.nutritionist_id === uid);
      if (!old) return erro('coleta nao encontrada', 'P0002');
      if (old.state === 'rascunho') return erro('coleta em rascunho se edita com salvar_coleta_laboratorial', 'P0001');
      if (old.superseded_at) return erro('esta coleta ja foi substituida por uma revisao', 'P0001');
      if (!p.reason || !String(p.reason).trim()) return erro('revisao exige motivo', 'P0001');
      const c = p.collection || {}; const dt = c.clinical_date || old.coletado_em; if (!dt) return erro('revisao de coleta consolidada exige a data clinica', 'P0001');
      const eid = 'encounter_id' in c ? (c.encounter_id || null) : old.encounter_id;
      if (eid && !s.tabelas.encounters.some(e => e.id === eid && e.patient_id === old.patient_id && e.nutritionist_id === uid)) return erro('atendimento nao e deste paciente/profissional', 'P0001');
      const novo = novaLinha('lab_collections', { nutritionist_id: uid, patient_id: old.patient_id, coletado_em: dt, data_coleta_desconhecida: false, clinical_time: c.clinical_time ?? old.clinical_time ?? null, laboratorio: c.laboratory_name ?? old.laboratorio ?? null, observacao: c.notes ?? old.observacao ?? null,
        encounter_id: eid, document_id: 'document_id' in c ? (c.document_id || null) : (old.document_id || null), state: 'salvo', source: 'revision', revision: old.revision + 1, supersedes_id: old.id, revision_note: String(p.reason).trim(), created_by: uid }, uid);
      const e = checarLinha('lab_collections', novo, uid); if (e) return e;
      s.tabelas.lab_collections.push(novo);
      const g = gravarResultados(novo.id, p.results); if (g.error) return g;
      if (g.data === 0) return erro('revisao exige ao menos um resultado', 'P0001');
      old.superseded_at = carimbo(); old.updated_at = old.superseded_at;
      return { data: { id: novo.id, supersedes_id: old.id, revision: novo.revision, results: g.data }, error: null };
    }
    if (nome === 'marcar_coleta_revisada') return { data: null, error: { message: 'resultados laboratoriais estruturados foram desativados: exame e guardado so como arquivo do prontuario', code: 'P0001', hint: 'laboratorio_desativado' } };
    if (nome === 'marcar_coleta_revisada') {
      const col = s.tabelas.lab_collections.find(x => x.id === (args && args.p_collection_id) && x.nutritionist_id === uid);
      if (!args || !String(args.p_responsible || '').trim()) return erro('revisao exige responsavel identificado', 'P0001');
      if (!col) return erro('coleta nao encontrada', 'P0002');
      if (col.state !== 'salvo') return erro('so coleta salva passa a revisada (estado atual: ' + col.state + ')', 'P0001');
      col.state = 'revisado'; col.reviewed_at = carimbo(); col.reviewed_by = uid; col.revision_note = (col.revision_note ? col.revision_note + ' | ' : '') + 'revisado por ' + String(args.p_responsible).trim(); col.updated_at = col.reviewed_at;
      return { data: { id: col.id, state: 'revisado' }, error: null };
    }
    if (nome === 'salvar_leitura_integrada') return { data: null, error: { message: 'a Leitura Integrada foi retirada do fluxo: exame nao produz resultado. As leituras salvas ficam so para leitura', code: 'P0001', hint: 'li_desativada' } };
    if (nome === 'salvar_leitura_integrada') {
      if (!p || !pacienteDe(uid, p.patient_id)) return erro('paciente nao e deste profissional', 'P0001');
      if (!p.responsible || !String(p.responsible).trim()) return erro('leitura exige responsavel identificado', 'P0001');
      if (!['convergente', 'divergente', 'sem_dados_suficientes'].includes(p.state)) return erro('estado invalido', 'P0001');
      const pkg = s.tabelas.integrated_reading_rule_packages.find(k => k.id === p.rule_package_id); if (!pkg) return erro('pacote de regras nao encontrado', 'P0002');
      const temVinculo = s.tabelas.integrated_reading_exam_domain_links.some(l => l.package_id === pkg.id && l.status === 'aprovado' && s.tabelas.integrated_reading_domains.some(d => d.id === l.domain_id && d.status === 'aprovado'));
      if (p.state !== 'sem_dados_suficientes' && !temVinculo) return erro('pacote ' + pkg.code + ' sem vinculo exame→dominio aprovado: a unica leitura possivel e sem_dados_suficientes', 'P0001');
      if (p.state !== 'sem_dados_suficientes' && pkg.status !== 'aprovado') return erro('pacote ' + pkg.code + ' nao aprovado: nenhuma leitura convergente/divergente e oficial', 'P0001');
      const DIR = ['attention_present', 'attention_not_detected', 'indeterminate'];
      const dcode = p.domain_code || null, hd = p.holoscan_direction || null, ld = p.laboratory_direction || null;
      if ((hd && !DIR.includes(hd))) return erro('direcao HOLOSCAN invalida', 'P0001');
      if ((ld && !DIR.includes(ld))) return erro('direcao laboratorial invalida', 'P0001');
      if (dcode) {
        const dom = s.tabelas.integrated_reading_domains.find(d => d.package_id === pkg.id && d.code === dcode);
        if (!dom) return erro('dominio ' + dcode + ' nao pertence ao pacote ' + pkg.code, 'P0002');
        if ((dom.holoscan_mapping_mode || 'none') === 'none') return erro('dominio ' + dcode + ' nao possui confronto HOLOSCAN na V1: nao ha leitura cross-source a salvar (informacao laboratorial apenas)', 'P0001', 'dominio_sem_confronto');
      }
      if (p.state !== 'sem_dados_suficientes') {
        if (!dcode) return erro('leitura convergente/divergente e por dominio: informe domain_code', 'P0001');
        if (!hd || !ld || hd === 'indeterminate' || ld === 'indeterminate') return erro('convergente/divergente exigem direcao HOLOSCAN e laboratorial deterministicas', 'P0001', 'direcao_indeterminada');
        if ((p.state === 'convergente' && hd !== ld) || (p.state === 'divergente' && hd === ld)) return erro('estado ' + p.state + ' incoerente com as direcoes ' + hd + ' x ' + ld, 'P0001', 'estado_incoerente');
      }
      if (p.holoscan_application_id && !s.tabelas.holoscan_applications.some(a => a.id === p.holoscan_application_id && a.patient_id === p.patient_id && a.nutritionist_id === uid)) return erro('aplicacao HOLOSCAN nao e deste paciente', 'P0001');
      for (const cid of (p.selected_collection_ids || [])) if (!s.tabelas.lab_collections.some(c => c.id === cid && c.patient_id === p.patient_id && c.nutritionist_id === uid)) return erro('coleta ' + cid + ' nao e deste paciente', 'P0001');
      for (const rid of (p.selected_result_ids || [])) { const r = s.tabelas.lab_results.find(x => x.id === rid); const c = r && s.tabelas.lab_collections.find(x => x.id === r.collection_id); if (!c || c.patient_id !== p.patient_id || c.nutritionist_id !== uid) return erro('resultado ' + rid + ' nao e deste paciente', 'P0001'); }
      let rev = 1;
      if (p.supersedes_id) { const ant = s.tabelas.integrated_readings.find(i => i.id === p.supersedes_id && i.nutritionist_id === uid && i.patient_id === p.patient_id && !i.superseded_at); if (!ant) return erro('leitura anterior nao encontrada ou ja revisada', 'P0001'); rev = ant.revision + 1; }
      const conteudo = { patient_id: p.patient_id, domain_code: dcode, holoscan_application_id: p.holoscan_application_id || null, collections: p.selected_collection_ids || [], results: p.selected_result_ids || [], references: p.references_snapshot || [], sources: p.sources_snapshot || {}, rule_package: pkg.code + '@' + pkg.version, engine: p.engine_version, state: p.state, holoscan_direction: hd, laboratory_direction: ld, reason_codes: p.reason_codes || [], trace: p.trace || {}, snapshot: p.snapshot || {}, note: p.professional_note || null };
      const h = createHash('sha256').update(JSON.stringify(conteudo), 'utf8').digest('hex');
      const arq = erroArquivado('integrated_readings', { patient_id: p.patient_id }); if (arq) return arq;
      const linha = novaLinha('integrated_readings', { nutritionist_id: uid, patient_id: p.patient_id, encounter_id: p.encounter_id || null, responsible: String(p.responsible).trim(), clinical_context: p.clinical_context || null, holoscan_application_id: p.holoscan_application_id || null,
        selected_collection_ids: p.selected_collection_ids || [], selected_result_ids: p.selected_result_ids || [], references_snapshot: p.references_snapshot || [], sources_snapshot: p.sources_snapshot || {}, rule_package_id: pkg.id, rule_version: pkg.version, engine_version: p.engine_version || '?',
        state: p.state, reason_codes: p.reason_codes || [], trace: p.trace || {}, professional_note: p.professional_note || null, revision: rev, supersedes_id: p.supersedes_id || null, content_hash: h, created_by: uid,
        domain_code: dcode, holoscan_direction: hd, laboratory_direction: ld, snapshot: p.snapshot || {} }, uid);
      const e = checarLinha('integrated_readings', linha, uid); if (e) return e;
      s.tabelas.integrated_readings.push(linha);
      if (p.supersedes_id) { const ant = s.tabelas.integrated_readings.find(i => i.id === p.supersedes_id); ant.superseded_at = carimbo(); }
      return { data: { id: linha.id, state: p.state, domain_code: dcode, revision: rev, content_hash: h }, error: null };
    }
    // ---------- V1 Etapa 5.2: governanca da Leitura Integrada ----------
    if (nome === 'meus_papeis_aprovacao') {
      if (!uid) return erro('nao autenticado', 'P0001');
      return { data: s.tabelas.methodology_approvers.filter(a => a.user_id === uid && a.active).sort((a, b) => cmp(a.scope + a.approval_stage, b.scope + b.approval_stage)).map(a => ({ scope: a.scope, approval_stage: a.approval_stage, display_name: a.display_name })), error: null };
    }
    if (nome === 'li_conteudo_canonico' || nome === 'li_hash_conteudo' || nome === 'li_validar_completude') {
      const id = args && args.p_package_id;
      if (!uid) return erro('nao autenticado', 'P0001');
      if (!s.tabelas.integrated_reading_rule_packages.some(x => x.id === id)) return nome === 'li_validar_completude' ? { data: liValidar(id), error: null } : { data: null, error: null };
      return { data: nome === 'li_hash_conteudo' ? liHash(id) : nome === 'li_conteudo_canonico' ? liConteudo(id) : liValidar(id), error: null };
    }
    if (nome === 'registrar_aprovacao_li') {
      if (!uid) return erro('nao autenticado', 'P0001');
      const id = args && args.p_package_id, etapa = args && args.p_etapa, resp = String((args && args.p_responsavel) || '').trim(), just = String((args && args.p_justificativa) || '').trim();
      const pk = s.tabelas.integrated_reading_rule_packages.find(x => x.id === id);
      if (!pk) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      if (pk.status !== 'em_revisao') return erro('so um pacote em_revisao recebe aprovacao (status atual: ' + pk.status + ')', 'P0001');
      if (/lideran/i.test(resp)) return erro('aprovacao nao pode ser atribuida a "Liderança do método HOLOSCAN": informe a pessoa', 'P0001');
      if (etapa === 2) return erro('Aprovacao 2 descontinuada: a V1 tem aprovador unico (Daniel); nao ha segunda revisao', 'P0001');
      if (etapa !== 1) return erro('etapa de aprovacao invalida: ' + etapa, 'P0001');
      if (resp !== 'Daniel') return erro('a aprovacao e do aprovador unico da V1 (Daniel)', 'P0001');
      const ap = aprovador(uid, 'integrated_reading', 1);   // identidade real: aprovador ativo integrated_reading/1
      if (!ap || ap.display_name !== resp) return erro('o usuario autenticado nao e o aprovador autorizado da Leitura Integrada (' + resp + ')', 'P0001');
      if (!just) return erro('aprovacao exige justificativa', 'P0001');
      if (args.p_version !== pk.version) return erro('a versao conferida (' + args.p_version + ') nao e a versao atual do pacote (' + pk.version + ')', 'P0001');
      const h = liHash(id);
      if (args.p_content_hash !== h) return erro('o pacote mudou: o hash conferido (' + String(args.p_content_hash || 'nenhum').slice(0, 12) + ') nao e o do conteudo atual (' + h.slice(0, 12) + ')', 'P0001');
      liVigentes(id).filter(a => a.package_version !== pk.version || a.content_hash !== h).forEach(a => { a.invalidated_at = carimbo(); a.invalidated_reason = 'versao ou conteudo diferentes do atual'; });
      if (liVigentes(id).find(a => a.step === 1)) return erro('Aprovacao ja registrada para este conteudo', 'P0001');
      const linha = { id: randomUUID(), package_id: id, package_version: pk.version, content_hash: h, step: 1, role: 'responsavel_primario', responsible: ap.display_name,
        justification: just, approved_by: uid, approver_id: ap.id, approved_at: carimbo(), invalidated_at: null, invalidated_reason: null, created_at: carimbo() };
      s.tabelas.integrated_reading_package_approvals.push(linha);
      return { data: { id: linha.id, package_id: id, package_version: pk.version, content_hash: h, etapa: 1, responsavel: linha.responsible, approved_by: uid, approver_id: ap.id, status_pacote: pk.status, regime: 'aprovador_unico', completude: liValidar(id) }, error: null };
    }
    if (nome === 'homologar_pacote_li') {
      if (!uid) return erro('nao autenticado', 'P0001');
      const id = args && args.p_package_id, resp = String((args && args.p_responsavel) || '').trim();
      const pk = s.tabelas.integrated_reading_rule_packages.find(x => x.id === id);
      if (!pk) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      if (pk.status !== 'em_revisao') return erro('so um pacote em_revisao pode ser homologado (status atual: ' + pk.status + ')', 'P0001');
      if (/lideran/i.test(resp) || resp !== 'Daniel') return erro('homologacao e ato do aprovador unico da V1 (Daniel; nunca da "Liderança do método HOLOSCAN")', 'P0001');
      const apH = aprovador(uid, 'integrated_reading', 1);   // aprovador ativo integrated_reading/1
      if (!apH || apH.display_name !== resp) return erro('o usuario autenticado nao e o aprovador autorizado da Leitura Integrada (' + resp + ')', 'P0001');
      if (args.p_version !== pk.version) return erro('a versao conferida (' + args.p_version + ') nao e a versao atual (' + pk.version + ')', 'P0001');
      const h = liHash(id);
      if (args.p_content_hash !== h) return erro('o pacote mudou: o hash conferido (' + String(args.p_content_hash || 'nenhum').slice(0, 12) + ') nao e o do conteudo atual (' + h.slice(0, 12) + ')', 'P0001');
      const v = liValidar(id);
      if (!v.publicavel) return erro('metodologia da leitura integrada incompleta: ' + v.total_bloqueios + ' bloqueio(s) — ' + JSON.stringify(v.bloqueios).slice(0, 400), 'P0001');
      const a1 = liVigentes(id).find(a => a.step === 1);
      if (!a1 || a1.package_version !== pk.version || a1.content_hash !== h)
        return erro('homologacao exige a Aprovacao (Daniel) vigente sobre o mesmo package_id, version e content_hash', 'P0001');
      const snap = { id: randomUUID(), package_id: id, package_version: pk.version, content_hash: h, snapshot: liConteudo(id), approval_1: a1.id, approval_2: null, homologated_by: uid, homologated_at: carimbo(), governance_regime: 'aprovador_unico' };
      s.tabelas.integrated_reading_package_snapshots.push(snap);
      s.liHomologar = id;
      Object.assign(pk, { status: 'aprovado', content_hash: h, responsible: 'Daniel (aprovador único — responsável metodológico)',
        approval_provenance: { regime: 'aprovador_unico', segunda_revisao: false, aprovacao_1: { id: a1.id, responsavel: a1.responsible, papel: a1.role, em: a1.approved_at, justificativa: a1.justification, approved_by: a1.approved_by }, homologado_por: resp, homologado_por_uid: uid, homologado_em: agora(), content_hash: h, completude: v } });
      s.liHomologar = null;
      return { data: { id, status: 'aprovado', regime: 'aprovador_unico', content_hash: h, aprovacao_1: a1.id, snapshot_id: snap.id, completude: v }, error: null };
    }
    if (nome === 'retirar_pacote_metodologico') {
      const id = args && args.p_package_id;
      const pk = s.tabelas.methodology_packages.find(x => x.id === id && x.nutritionist_id === uid);
      if (!pk) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      if (pk.status !== 'aprovado') return erro('so um pacote aprovado pode ser retirado', 'P0001');
      if (!String((args && args.p_responsible) || '').trim()) return erro('retirada exige responsavel', 'P0001');
      const r0 = inserir('methodology_homologation_records', { package_id: id, topic: 'pacote', element: pk.code, version: String(pk.version), decision: 'retirado', responsible: args.p_responsible, decided_at: agora().slice(0, 10), justification: args.p_motivo || null });
      if (r0.error) return r0;
      const r = atualizar('methodology_packages', id, { status: 'retirado', retired_at: agora(), retired_reason: args.p_motivo || null, effective_to: agora().slice(0, 10) });
      return r.error ? r : { data: id, error: null };
    }
    // ---------- V1 Etapa 3: relatorios ----------
    const opRel = (op, soEmitido) => op ? s.tabelas.report_emissions.find(x => x.nutritionist_id === uid && x.operation_id === op && (!soEmitido || x.status === 'emitido')) : null;
    if (nome === 'salvar_rascunho_relatorio') {
      if (!p) return erro('payload vazio', 'P0001');
      const ja = opRel(p.operation_id); if (ja) return { data: ja.id, error: null };
      const campos = { title: p.title || null, period_start: p.period_start || null, period_end: p.period_end || null, encounter_id: p.encounter_id || null,
        professional_text: p.professional_text || null, supersedes_report_id: p.supersedes_report_id || null };
      if (p.id) {
        const atual = s.tabelas.report_emissions.find(x => x.id === p.id && x.nutritionist_id === uid);
        if (!atual) return erro('relatorio ' + p.id + ' nao encontrado', 'P0002');
        if (atual.status === 'emitido') return erro('relatorio ja emitido e imutavel; retifique criando uma nova emissao', 'P0001');
        if (p.expected_updated_at && atual.updated_at !== p.expected_updated_at) return erro('o rascunho do relatorio foi alterado em outro lugar; recarregue antes de salvar', 'P0001');
        const r = atualizar('report_emissions', atual.id, Object.assign(campos, { selected_sources: p.selected_sources || atual.selected_sources, supersedes_report_id: campos.supersedes_report_id || atual.supersedes_report_id || null, operation_id: atual.operation_id || p.operation_id || null }));
        return r.error ? r : { data: atual.id, error: null };
      }
      if (!p.patient_id) return erro('patient_id e obrigatorio', 'P0001');
      const r = inserir('report_emissions', Object.assign(campos, { patient_id: p.patient_id, status: 'rascunho', selected_sources: p.selected_sources || {}, created_by: uid, operation_id: p.operation_id || null }));
      return r.error ? r : { data: r.data[0].id, error: null };
    }
    if (nome === 'emitir_relatorio') {
      if (!p) return erro('payload vazio', 'P0001');
      const ja = opRel(p.operation_id, true); if (ja) return { data: ja.id, error: null };
      let atual = null, pid;
      if (p.id) {
        atual = s.tabelas.report_emissions.find(x => x.id === p.id && x.nutritionist_id === uid);
        if (!atual) return erro('relatorio ' + p.id + ' nao encontrado', 'P0002');
        if (atual.status === 'emitido') { if (p.operation_id && atual.operation_id === p.operation_id) return { data: atual.id, error: null }; return erro('relatorio ja emitido; retifique criando uma nova emissao', 'P0001'); }
        if (p.expected_updated_at && atual.updated_at !== p.expected_updated_at) return erro('o rascunho do relatorio foi alterado em outro lugar; recarregue antes de emitir', 'P0001');
        pid = atual.patient_id;
      } else pid = p.patient_id;
      if (!pid) return erro('patient_id e obrigatorio', 'P0001');
      const sel = p.selected_sources || (atual && atual.selected_sources) || {};
      const intimo = sel.incluir_intimo === true, interp = sel.incluir_interpretacao !== false;
      let rev = 1, sup = null;
      const supId = p.supersedes_report_id || (atual && atual.supersedes_report_id) || null;
      if (supId) {
        sup = s.tabelas.report_emissions.find(x => x.id === supId && x.nutritionist_id === uid);
        if (!sup) return erro('emissao a retificar nao encontrada', 'P0002');
        if (sup.patient_id !== pid) return erro('emissao a retificar e de outro paciente', 'P0001');
        if (sup.status !== 'emitido') return erro('so uma emissao pode ser retificada', 'P0001');
        rev = sup.revision_number + 1;
      }
      const pac = pacienteDe(uid, pid); if (!pac) return erro('paciente nao encontrado', 'P0002');
      if (pac.status === 'inativo') return erro('paciente arquivado: reative antes de registrar novas informacoes', 'P0001');
      const prof = (s.tabelas.profiles || []).find(x => x.id === uid) || {};
      const fontes = {}; const addFonte = (k, o) => { (fontes[k] = fontes[k] || []).push(o); };
      const mine = (t, id) => s.tabelas[t].find(x => x.id === id && x.patient_id === pid && x.nutritionist_id === uid);
      const conteudo = { template_version: 1, tipos_de_conteudo: ['RELATO_DO_PACIENTE', 'OBSERVACAO_PROFISSIONAL', 'DADO_MEDIDO', 'DADO_DOCUMENTAL', 'INDICADOR_CALCULADO', 'TEXTO_ASSISTIDO'],
        paciente: { nome: pac.nome, nascimento: pac.nascimento || null, sexo: pac.sexo || null }, profissional: { nome: prof.nome || null, profissao: prof.profissao || null, registro: prof.registro || null },
        periodo: { inicio: p.period_start || (atual && atual.period_start) || null, fim: p.period_end || (atual && atual.period_end) || null }, titulo: p.title || (atual && atual.title) || null,
        metodologia: 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
        texto_assistido: [] };
      conteudo.atendimentos = [];
      for (const id of (sel.encounter_ids || [])) { const r = mine('encounters', id); if (!r) return erro('atendimento ' + id + ' nao e deste paciente', 'P0001');
        conteudo.atendimentos.push({ tipo_conteudo: 'DADO_DOCUMENTAL', id: r.id, occurred_at: r.occurred_at, timezone: r.timezone, type: r.type || null, modality: r.modality || null, com_agendamento: !!r.consultation_id }); addFonte('encounters', { id: r.id, updated_at: r.updated_at }); }
      conteudo.anamneses = [];
      for (const id of (sel.anamnesis_ids || [])) { const r = mine('anamneses', id); if (!r) return erro('anamnese ' + id + ' nao e deste paciente', 'P0001');
        if (r.status === 'rascunho') return erro('anamnese ' + id + ' e rascunho: nao entra em relatorio', 'P0001');
        const itens = [];
        for (const [dom, v] of Object.entries((r.content && r.content.dominios) || {})) { if (!intimo && ['emocional', 'sentido_pessoal'].includes(dom)) continue;
          for (const it of (v.itens || [])) { const tipo = { relato_paciente: 'RELATO_DO_PACIENTE', observacao_profissional: 'OBSERVACAO_PROFISSIONAL', documento_externo: 'DADO_DOCUMENTAL', dado_medido: 'DADO_MEDIDO' }[it.origem] || 'RELATO_DO_PACIENTE';
            const c = Object.assign({ dominio: dom, tipo_conteudo: tipo }, it); delete c.fonte_anamnese_id; itens.push(c); } }
        conteudo.anamneses.push({ id: r.id, encounter_id: r.encounter_id, revision_number: r.revision_number, status: r.status, content_version: r.content_version, intimo_incluido: intimo, itens });
        addFonte('anamneses', { id: r.id, revision_number: r.revision_number, updated_at: r.updated_at }); }
      conteudo.holoscan = [];
      for (const id of (sel.holoscan_application_ids || [])) { const r = mine('holoscan_applications', id); if (!r) return erro('aplicacao HOLOSCAN ' + id + ' nao e deste paciente', 'P0001');
        conteudo.holoscan.push({ tipo_conteudo: 'INDICADOR_CALCULADO', id: r.id, encounter_id: r.encounter_id || null, quando: r.quando, versao_estrutura: r.versao_estrutura, versao_bancos: r.versao_bancos || null, cobertura: r.cobertura || null, resultados_oficiais: false,
          interpretacao_profissional: interp ? (r.interpretacao_texto || null) : null, interpretacao_em: interp ? (r.interpretacao_em || null) : null }); addFonte('holoscan_applications', { id: r.id, updated_at: r.updated_at }); }
      conteudo.exames_incluidos = false;   // prontuario: coleta nao e mais fonte do relatorio
      conteudo.ferramentas = [];
      for (const id of (sel.tool_application_ids || [])) { const r = mine('tool_applications', id); if (!r) return erro('ferramenta ' + id + ' nao e deste paciente', 'P0001');
        if (r.status === 'rascunho') return erro('ferramenta ' + id + ' e rascunho: nao entra em relatorio', 'P0001');
        conteudo.ferramentas.push({ tipo_conteudo: 'RELATO_DO_PACIENTE', id: r.id, encounter_id: r.encounter_id || null, ferramenta_id: r.ferramenta_id, versao_ferramenta: r.versao_ferramenta, concluida_em: r.concluida_em, status: r.status,
          respostas: intimo ? r.respostas : null, respostas_incluidas: intimo, leitura_profissional: interp ? (r.leitura || null) : null, leitura_tipo: 'OBSERVACAO_PROFISSIONAL', prioridade: r.prioridade || null, proximo_passo: r.proximo_passo || null }); addFonte('tool_applications', { id: r.id, updated_at: r.updated_at }); }
      conteudo.condutas = [];
      for (const id of (sel.conduct_ids || [])) { const r = mine('conducts', id); if (!r) return erro('conduta ' + id + ' nao e deste paciente', 'P0001');
        if (r.status === 'rascunho') return erro('conduta ' + id + ' e rascunho: nao entra em relatorio', 'P0001');
        const ac = s.tabelas.agreements.filter(g => g.conduct_id === r.id && (!(sel.agreement_ids || []).length || sel.agreement_ids.includes(g.id))).sort((a, b) => (a.position - b.position) || String(a.created_at).localeCompare(String(b.created_at)))
          .map(g => ({ id: g.id, description: g.description, responsible: g.responsible || null, due_text: g.due_text || null, follow_up: g.follow_up || null, status: g.status, status_note: g.status_note || null }));
        const o = { tipo_conteudo: 'OBSERVACAO_PROFISSIONAL', id: r.id, encounter_id: r.encounter_id, revision_number: r.revision_number, status: r.status, priorities: r.priorities };
        for (const k of ['objective', 'nutrition_strategy', 'actions', 'resources', 'requested_exams', 'monitoring', 'return_plan', 'observations', 'professional_guidance']) o[k] = r[k] || null;
        o.acordos = ac; conteudo.condutas.push(o); addFonte('conducts', { id: r.id, revision_number: r.revision_number, updated_at: r.updated_at }); }
      conteudo.documentos_armazenados = s.tabelas.documents.filter(d => d.patient_id === pid && d.nutritionist_id === uid && !d.arquivado_em).length;   // so a referencia administrativa
      const texto = p.professional_text !== undefined && p.professional_text !== null ? p.professional_text : (atual && atual.professional_text) || null;
      conteudo.interpretacao_profissional = interp && texto ? { tipo_conteudo: 'OBSERVACAO_PROFISSIONAL', texto } : null;
      const hash = createHash('sha256').update(JSON.stringify(conteudo), 'utf8').digest('hex');
      const agoraTs = agora();
      const campos = { status: 'emitido', encounter_id: p.encounter_id || (atual && atual.encounter_id) || null, title: conteudo.titulo, period_start: conteudo.periodo.inicio, period_end: conteudo.periodo.fim,
        selected_sources: sel, professional_text: texto, source_snapshot: fontes, content_snapshot: conteudo, content_hash: hash, template_version: 1, issued_at: agoraTs, created_by: uid,
        revision_number: rev, supersedes_report_id: supId };
      let id;
      if (atual) { const r = atualizar('report_emissions', atual.id, Object.assign(campos, { operation_id: atual.operation_id || p.operation_id || null })); if (r.error) return r; id = atual.id; }
      else { const r = inserir('report_emissions', Object.assign(campos, { patient_id: pid, operation_id: p.operation_id || null })); if (r.error) return r; id = r.data[0].id; }
      if (sup && !sup.superseded_at) atualizar('report_emissions', sup.id, { superseded_at: agoraTs });
      return { data: id, error: null };
    }
    return erro('function ' + nome + ' does not exist', '42883');
  }

  function storage(uid, m) {
    if (!uid) return erro('not authenticated', '42501');
    if (deveFalhar(m.bucket, m.acaoStorage)) return erro('falha simulada em storage/' + m.acaoStorage, 'SIMULADA');
    const b = s.storage[m.bucket];
    if (!b) return erro('Bucket not found', '404');
    const meu = (path) => String(path).split('/')[0] === uid;
    if (m.acaoStorage === 'upload') {
      if (!meu(m.path)) return erro('new row violates row-level security policy', '42501');
      if (b[m.path]) return erro('The resource already exists', '409');
      b[m.path] = { b64: m.b64, tipo: m.tipo, dono: uid };
      return { data: { path: m.path }, error: null };
    }
    if (m.acaoStorage === 'download') {
      const o = b[m.path];
      if (!o || o.dono !== uid) return erro('Object not found', '404');
      return { data: { b64: o.b64, tipo: o.tipo }, error: null };
    }
    if (m.acaoStorage === 'remove') {
      // policy storage_patient_docs_delete (prontuario): objeto de documento registrado nao sai; so o orfao
      (m.paths || []).forEach(pth => { if (b[pth] && b[pth].dono === uid && !(m.bucket === 'patient-documents' && s.tabelas.documents.some(d => d.storage_path === pth))) delete b[pth]; });
      return { data: [], error: null };
    }
    return erro('op desconhecida');
  }

  s.tratar = (msg) => {
    s.log.push({ op: msg.op, tabela: msg.q && msg.q.tabela, acao: msg.q && msg.q.acao, nome: msg.nome, uid: msg.uid });
    if (msg.op === 'login') {
      const c = s.contas[msg.email];
      if (!c || c.senha !== msg.password) return erro('Invalid login credentials', 'invalid_credentials');
      return { data: { id: c.id }, error: null };
    }
    if (msg.op === 'signup') return cadastrar(msg);
    if (msg.op === 'recuperar') {
      if (s.limiteRecuperacao) return erro('email rate limit exceeded', 'over_email_send_rate_limit');
      s.pedidosRecuperacao = (s.pedidosRecuperacao || 0) + 1;
      return { data: {}, error: null };
    }
    if (msg.op === 'trocar_senha') {
      const email = Object.keys(s.contas).find(e => s.contas[e].id === msg.uid);
      if (!email) return erro('not authenticated', '42501');
      if (!msg.password || msg.password.length < 8) return erro('Password should be at least 8 characters.', 'weak_password');
      s.contas[email].senha = msg.password;
      return { data: {}, error: null };
    }
    if (msg.op === 'query') return consultar(msg.uid, msg.q);
    if (msg.op === 'rpc') return rpc(msg.uid, msg.nome, msg.args);
    if (msg.op === 'storage') return storage(msg.uid, msg);
    return erro('op desconhecida');
  };

  /** Linhas cruas de uma tabela (para o teste conferir o servidor). */
  s.linhas = (tabela) => copia(s.tabelas[tabela]);
  s.contarLog = (pred) => s.log.filter(pred).length;

  return s;
}

/* --------------------------------------------------------------------------
   A biblioteca que substitui o supabase-js dentro da pagina.
   -------------------------------------------------------------------------- */
const BIBLIOTECA = `(function () {
  var CHAVE = "sb-falso-auth-token";
  function chamar(msg) { return window.__supaFalso(JSON.stringify(msg)).then(function (t) { return JSON.parse(t); }); }
  function sessao() { try { return JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { return null; } }
  function uid() { var s = sessao(); return s && s.user ? s.user.id : null; }

  function Builder(tabela) {
    this.q = { tabela: tabela, acao: "select", filtros: [], ordem: [], range: null,
               colunas: "*", single: null, opcoes: {}, retornar: false };
  }
  Builder.prototype.select = function (c, o) {
    if (this.q.acao === "select") { this.q.colunas = c || "*"; this.q.opcoes = o || {}; }
    else { this.q.retornar = true; this.q.colunas = c || "*"; }
    return this;
  };
  Builder.prototype.insert = function (d) { this.q.acao = "insert"; this.q.dados = d; return this; };
  Builder.prototype.upsert = function (d, o) { this.q.acao = "upsert"; this.q.dados = d; this.q.upsert = o || {}; return this; };
  Builder.prototype.update = function (d) { this.q.acao = "update"; this.q.dados = d; return this; };
  Builder.prototype["delete"] = function () { this.q.acao = "delete"; return this; };
  ["eq", "neq", "in", "is", "gt", "gte", "lt", "lte"].forEach(function (op) {
    Builder.prototype[op] = function (col, val) { this.q.filtros.push({ op: op, col: col, val: val }); return this; };
  });
  Builder.prototype.order = function (col, o) { this.q.ordem.push({ col: col, asc: !o || o.ascending !== false }); return this; };
  Builder.prototype.range = function (a, b) { this.q.range = [a, b]; return this; };
  Builder.prototype.limit = function (n) { this.q.range = [0, n - 1]; return this; };
  Builder.prototype.single = function () { this.q.single = "single"; return this; };
  Builder.prototype.maybeSingle = function () { this.q.single = "maybe"; return this; };
  Builder.prototype.then = function (ok, falhou) {
    return chamar({ op: "query", uid: uid(), q: this.q }).then(ok, falhou);
  };
  Builder.prototype["catch"] = function (fn) { return this.then(null, fn); };

  function paraBase64(arquivo) {
    return new Promise(function (ok, falhou) {
      var r = new FileReader();
      r.onload = function () { ok(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { falhou(r.error); };
      r.readAsDataURL(arquivo);
    });
  }
  function deBase64(b64, tipo) {
    var bin = atob(b64 || ""), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Blob([u], { type: tipo || "application/octet-stream" });
  }

  function createClient() {
    var ouvintes = [];
    function emitir(ev, s) {
      setTimeout(function () { ouvintes.slice().forEach(function (fn) { try { fn(ev, s); } catch (e) {} }); }, 0);
    }
    var mRec = /access_token=falso-([^&]+)&.*type=recovery/.exec(location.hash || "");
    if (mRec) {
      var sRec = { access_token: "falso-" + mRec[1], user: { id: mRec[1], email: "" } };
      localStorage.setItem(CHAVE, JSON.stringify(sRec));
      setTimeout(function () { emitir("PASSWORD_RECOVERY", sRec); }, 400);
    }
    return {
      auth: {
        getSession: function () { return Promise.resolve({ data: { session: sessao() }, error: null }); },
        getUser: function () { var s = sessao(); return Promise.resolve({ data: { user: s ? s.user : null }, error: null }); },
        onAuthStateChange: function (fn) {
          ouvintes.push(fn);
          setTimeout(function () { try { fn("INITIAL_SESSION", sessao()); } catch (e) {} }, 0);
          return { data: { subscription: { unsubscribe: function () {
            var i = ouvintes.indexOf(fn); if (i >= 0) ouvintes.splice(i, 1); } } } };
        },
        signInWithPassword: function (c) {
          return chamar({ op: "login", email: c.email, password: c.password }).then(function (r) {
            if (r.error) return { data: { session: null, user: null }, error: { name: "AuthApiError", message: r.error.message } };
            var s = { access_token: "falso-" + r.data.id, user: { id: r.data.id, email: c.email } };
            localStorage.setItem(CHAVE, JSON.stringify(s));
            emitir("SIGNED_IN", s);
            return { data: { session: s, user: s.user }, error: null };
          });
        },
        signUp: function (c) {
          var o = c.options || {};
          return chamar({ op: "signup", email: c.email, password: c.password, data: o.data || {} }).then(function (r) {
            if (r.error) return { data: { session: null, user: null }, error: { name: "AuthApiError", message: r.error.message, code: r.error.code } };
            /* confirmacao de e-mail DESLIGADA (recomendado para o lancamento): ja nasce a sessao */
            var s = { access_token: "falso-" + r.data.id, user: { id: r.data.id, email: c.email, user_metadata: o.data || {} } };
            localStorage.setItem(CHAVE, JSON.stringify(s));
            emitir("SIGNED_IN", s);
            return { data: { session: s, user: s.user }, error: null };
          });
        },
        signOut: function () {
          localStorage.removeItem(CHAVE);
          emitir("SIGNED_OUT", null);
          return Promise.resolve({ error: null });
        },
        resetPasswordForEmail: function (email) {
          return chamar({ op: "recuperar", email: email }).then(function (r) {
            return r.error ? { data: null, error: { name: "AuthApiError", message: r.error.message, code: r.error.code } } : { data: {}, error: null };
          });
        },
        updateUser: function (u) {
          var s = sessao();
          if (!u || !u.password) return Promise.resolve({ data: {}, error: null });
          return chamar({ op: "trocar_senha", uid: s ? s.user.id : null, password: u.password }).then(function (r) {
            return r.error ? { data: null, error: { name: "AuthApiError", message: r.error.message } } : { data: { user: s && s.user }, error: null };
          });
        }
      },
      from: function (t) { return new Builder(t); },
      rpc: function (nome, args) { return chamar({ op: "rpc", uid: uid(), nome: nome, args: args }); },
      storage: {
        from: function (bucket) {
          return {
            upload: function (path, arquivo) {
              return paraBase64(arquivo).then(function (b64) {
                return chamar({ op: "storage", uid: uid(), bucket: bucket, acaoStorage: "upload", path: path, b64: b64, tipo: arquivo.type });
              });
            },
            download: function (path) {
              return chamar({ op: "storage", uid: uid(), bucket: bucket, acaoStorage: "download", path: path }).then(function (r) {
                if (r.error) return r;
                return { data: deBase64(r.data.b64, r.data.tipo), error: null };
              });
            },
            remove: function (paths) {
              return chamar({ op: "storage", uid: uid(), bucket: bucket, acaoStorage: "remove", paths: paths });
            }
          };
        }
      }
    };
  }
  window.supabase = { createClient: createClient };
})();`;

/**
 * Liga uma pagina ao servidor falso. Chamar ANTES do goto.
 */
export async function ligarPagina(page, servidor) {
  await page.exposeFunction('__supaFalso', (texto) => {
    let r;
    try { r = servidor.tratar(JSON.parse(texto)); }
    catch (e) { r = { data: null, error: { message: 'erro no servidor falso: ' + e.message, code: 'FALSO' } }; }
    return JSON.stringify(r);
  });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/.test(url)) {
      req.respond({ status: 200, contentType: 'text/javascript', body: BIBLIOTECA });
      return;
    }
    if (!/^http:\/\/127\.0\.0\.1:5500\//.test(url) && !/^(data|blob):/.test(url)) {
      req.abort();   // nada sai para a rede de verdade
      return;
    }
    req.continue();
  });
}
