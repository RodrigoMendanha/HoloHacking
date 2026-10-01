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
import '../metodologia-pacote.js';   // o MESMO validador de publicacao do navegador (Etapa 4)

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
  methodology_packages: ['id', 'nutritionist_id', 'code', 'version', 'status', 'origin', 'justification', 'responsible', 'reviewed_by', 'reviewed_at', 'effective_from', 'effective_to', 'content_hash', 'approved_at', 'approved_by', 'retired_at', 'retired_reason', 'notes', 'created_by', 'created_at', 'updated_at'],
  methodology_questionnaire_editions: ['id', 'nutritionist_id', 'package_id', 'code', 'version', 'status', 'item_count', 'notes', 'created_at', 'updated_at'],
  methodology_scales: ['id', 'nutritionist_id', 'package_id', 'code', 'min_value', 'max_value', 'labels', 'kind', 'status', 'source', 'notes', 'created_at', 'updated_at'],
  methodology_systems: ['id', 'nutritionist_id', 'package_id', 'code', 'name', 'public_text', 'definition', 'emotional_pattern', 'spiritual_impact', 'color', 'position', 'status', 'source', 'notes', 'created_at', 'updated_at'],
  methodology_questions: ['id', 'nutritionist_id', 'package_id', 'edition_id', 'stable_id', 'statement', 'block', 'scale_code', 'response_labels', 'orientation', 'temporal_context', 'status', 'source', 'notes', 'version', 'position', 'created_at', 'updated_at'],
  methodology_associations: ['id', 'nutritionist_id', 'package_id', 'question_stable_id', 'destination_type', 'destination_id', 'weight', 'role', 'status', 'source', 'conflict', 'conflict_note', 'created_at', 'updated_at'],
  methodology_ranges: ['id', 'nutritionist_id', 'package_id', 'destination_type', 'destination_id', 'lower_bound', 'upper_bound', 'lower_inclusive', 'upper_inclusive', 'label', 'message_nutri', 'message_paciente', 'status', 'source', 'created_at', 'updated_at'],
  methodology_rules: ['id', 'nutritionist_id', 'package_id', 'rule_type', 'target', 'payload', 'status', 'source', 'notes', 'created_at', 'updated_at'],
  methodology_homologation_records: ['id', 'nutritionist_id', 'package_id', 'topic', 'element', 'version', 'decision', 'responsible', 'decided_at', 'source', 'justification', 'evidence', 'created_by', 'created_at'],
  schedule_blocks: ['id', 'nutritionist_id', 'data', 'inicio', 'fim', 'dia_todo', 'motivo', 'created_at', 'updated_at'],
  holoscan_applications: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'quando', 'versao_estrutura', 'versao_bancos', 'indice', 'indice_maximo', 'avaliavel', 'nota_media', 'triada', 'triada_com_dado', 'cobertura', 'combinacoes', 'aprofundamentos', 'interpretacao_texto', 'interpretacao_em', 'interpretacao_versao', 'created_at', 'updated_at', 'methodology_package_id'],
  holoscan_answers: ['id', 'application_id', 'marcador_id', 'valor', 'created_at'],
  holoscan_system_scores: ['id', 'application_id', 'sistema', 'nome', 'nota', 'carga', 'faixa', 'obtido', 'maximo', 'respondidos', 'total_marcadores', 'avaliavel', 'created_at'],
  lab_collections: ['id', 'nutritionist_id', 'patient_id', 'encounter_id', 'coletado_em', 'data_coleta_desconhecida', 'laboratorio', 'observacao', 'created_at', 'updated_at'],
  lab_results: ['id', 'collection_id', 'exame_id', 'valor', 'unidade_no_momento', 'ideal_min_no_momento', 'ideal_max_no_momento', 'nome_exame_no_momento', 'sistema_no_momento', 'created_at'],
  tool_applications: ['id', 'nutritionist_id', 'patient_id', 'consultation_id', 'encounter_id', 'ferramenta_id', 'versao_ferramenta', 'origem_legada', 'status', 'iniciada_em', 'concluida_em', 'atualizada_em', 'respostas', 'resultado', 'leitura', 'prioridade', 'proximo_passo', 'created_at', 'updated_at'],
  documents: ['id', 'nutritionist_id', 'patient_id', 'nome', 'tipo', 'data_documento', 'mime_type', 'tamanho_bytes', 'storage_path', 'origem_local', 'created_at', 'updated_at'],
  professional_assets: ['id', 'nutritionist_id', 'tipo', 'nome', 'mime_type', 'tamanho_bytes', 'storage_path', 'created_at', 'updated_at'],
  profiles: null,          // nao estrito: o perfil nao e o assunto destes testes
  ai_threads: ['id', 'nutritionist_id', 'patient_id', 'titulo', 'created_at', 'updated_at'],
  ai_messages: ['id', 'thread_id', 'role', 'content', 'metadata', 'created_at']
};

const METODOLOGIA = ['methodology_packages', 'methodology_questionnaire_editions', 'methodology_scales', 'methodology_systems', 'methodology_questions', 'methodology_associations', 'methodology_ranges', 'methodology_rules', 'methodology_homologation_records'];
const FILHAS_PACOTE = METODOLOGIA.filter(t => t !== 'methodology_packages');
const DONO_DIRETO = [...METODOLOGIA, 'patients', 'consultations', 'encounters', 'anamneses', 'conducts', 'agreements', 'report_emissions', 'schedule_blocks', 'holoscan_applications',
  'lab_collections', 'tool_applications', 'documents', 'professional_assets', 'ai_threads'];
const FILHAS = {           // tabela -> [coluna, mae]
  holoscan_answers: ['application_id', 'holoscan_applications'],
  holoscan_system_scores: ['application_id', 'holoscan_applications'],
  lab_results: ['collection_id', 'lab_collections'],
  ai_messages: ['thread_id', 'ai_threads']
};
const COM_PACIENTE = ['consultations', 'encounters', 'anamneses', 'conducts', 'agreements', 'report_emissions', 'holoscan_applications', 'lab_collections', 'tool_applications', 'documents', 'ai_threads'];
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
const COM_ENCOUNTER = ['holoscan_applications', 'tool_applications', 'lab_collections'];
const UNICAS = {           // uniques alem da PK, como nas migrations
  lab_results: [['collection_id', 'exame_id']]
};
const FERRAMENTAS = ['oq3', 'pqq', 'linha_momentum', 'mapa_crencas', 'roda_vida', 'carta_futuro'];

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

  s.criarConta = (email, senha, id) => {
    s.contas[email] = { senha, id: id || randomUUID() };
    return s.contas[email].id;
  };

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
      return mae ? mae.nutritionist_id : null;
    }
    return null;
  }

  function pacoteDe(id) { return s.tabelas.methodology_packages.find(p => p.id === id); }
  function visiveis(tabela, uid) {
    return s.tabelas[tabela].filter(l => {
      if (dono(tabela, l) === uid) return true;
      // RLS da Etapa 4: pacote aprovado/retirado (e suas filhas) e legivel por qualquer autenticado
      if (tabela === 'methodology_packages') return ['aprovado', 'retirado'].includes(l.status);
      if (FILHAS_PACOTE.includes(tabela)) { const p = pacoteDe(l.package_id); return !!p && ['aprovado', 'retirado'].includes(p.status); }
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
                            'tool_applications', 'documents'];
  function erroArquivado(tabela, linha) {
    if (!GUARDA_ARQUIVADO.includes(tabela)) return null;
    let pid = linha.patient_id;
    if (tabela === 'lab_results') {
      const c = s.tabelas.lab_collections.find(x => x.id === linha.collection_id);
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
      if (!mae || mae.nutritionist_id !== uid) return erro('new row violates row-level security policy', '42501');
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
      if (['aprovado', 'retirado'].includes(linha.status) && !(linha.content_hash && linha.responsible && linha.reviewed_by && linha.reviewed_at && linha.effective_from && linha.approved_at && linha.approved_by)) return erro('violates check constraint "methodology_packages_aprovado_completo"', '23514');
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
        if (!s.tabelas.methodology_questionnaire_editions.some(e => e.id === linha.edition_id && e.nutritionist_id === uid)) return erro('violates foreign key constraint "methodology_questions_edition_fk"', '23503');
        if (s.tabelas.methodology_questions.some(x => x.id !== linha.id && x.edition_id === linha.edition_id && x.stable_id === linha.stable_id)) return erro('duplicate key value violates unique constraint "methodology_questions_stable_id_unique"', '23505');
      }
      if (tabela === 'methodology_associations' && !['system', 'triad'].includes(linha.destination_type)) return erro('violates check constraint "methodology_associations_tipo_valido"', '23514');
      if (tabela === 'methodology_ranges' && !['system', 'index', 'triad'].includes(linha.destination_type)) return erro('violates check constraint "methodology_ranges_tipo_valido"', '23514');
      if (tabela === 'methodology_scales' && (!(linha.max_value > linha.min_value) || s.tabelas.methodology_scales.some(x => x.id !== linha.id && x.package_id === linha.package_id && x.code === linha.code))) return erro('violates constraint on methodology_scales (intervalo/code_unique)', '23514');
      if (tabela === 'methodology_systems' && s.tabelas.methodology_systems.some(x => x.id !== linha.id && x.package_id === linha.package_id && x.code === linha.code)) return erro('duplicate key value violates unique constraint "methodology_systems_code_unique"', '23505');
      if (tabela === 'methodology_rules') {
        if (!['scoring', 'absence', 'index', 'triad', 'coverage', 'comparability', 'example'].includes(linha.rule_type)) return erro('violates check constraint "methodology_rules_tipo_valido"', '23514');
        if (s.tabelas.methodology_rules.some(x => x.id !== linha.id && x.package_id === linha.package_id && x.rule_type === linha.rule_type && x.target === linha.target)) return erro('duplicate key value violates unique constraint "methodology_rules_tipo_alvo_unique"', '23505');
      }
      if (tabela === 'methodology_homologation_records' && (!linha.responsible || !String(linha.responsible).trim() || !linha.decision || !String(linha.decision).trim() || !linha.decided_at || !linha.topic || !linha.element)) return erro('violates check constraint "methodology_records_*"', '23514');
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
      // Etapa 0 da V1: o trigger de "data da coleta no futuro" (rodada 08)
      // saiu de supabase/migrations/ (pendente de decisao de produto);
      // o falso espelha o banco: nenhuma recusa por data.
    }
    return null;
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

  function consultar(uid, q) {
    const t = q.tabela;
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
        const e = checarLinha(t, l, uid);
        if (e) return e;                                  // o comando inteiro falha
        novas.push({ nova: l });
      }
      const feitas = novas.map(n => {
        if (n.nova) { s.tabelas[t].push(n.nova); return n.nova; }
        Object.assign(n.merge, n.d);
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
          const IMUTAVEIS = ['nutritionist_id', 'patient_id', 'encounter_id', 'methodology_package_id', 'quando', 'versao_estrutura', 'versao_bancos',
            'indice', 'indice_maximo', 'avaliavel', 'nota_media', 'triada', 'triada_com_dado', 'cobertura', 'combinacoes', 'aprofundamentos'];
          const mudou = IMUTAVEIS.find(c => c in q.dados && JSON.stringify(q.dados[c] === undefined ? null : q.dados[c]) !== JSON.stringify(l[c] === undefined ? null : l[c]));
          if (mudou) return erro('campos historicos do snapshot HOLOSCAN sao imutaveis (inclusive o atendimento, encounter_id); somente interpretacao_texto, interpretacao_em e interpretacao_versao podem ser alterados', 'P0001');
        }
      }
      alvo.forEach(l => {
        const statusAntes = l.status;
        Object.assign(l, q.dados);
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

  function rpc(uid, nome, args) {
    if (!uid) return erro('permission denied for function ' + nome, '42501');
    if (deveFalhar('rpc:' + nome, 'rpc') || deveFalhar(null, 'rpc')) return erro('falha simulada em rpc ' + nome, 'SIMULADA');
    const p = args && args.payload;
    if (nome === 'salvar_holoscan_completo') {
      if (!p || !p.application || !p.answers || !p.scores) return erro('payload incompleto', 'P0001');
      const a = p.application;
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
        interpretacao_versao: a.interpretacao_versao || null
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
      const campos = (base) => { const o = {}; CAMPOS.forEach(c => { o[c] = p[c] !== undefined ? (p[c] === '' ? null : p[c]) : (base ? base[c] : null); }); return o; };
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
    if (nome === 'aprovar_pacote_metodologico') {
      const id = args && args.p_package_id, reg = (args && args.p_registro) || null;
      const pk = s.tabelas.methodology_packages.find(x => x.id === id && x.nutritionist_id === uid);
      if (!pk) return erro('pacote ' + id + ' nao encontrado', 'P0002');
      if (pk.status !== 'em_revisao') return erro('so um pacote em_revisao pode ser aprovado (status atual: ' + pk.status + ')', 'P0001');
      if (!reg || !String(reg.responsible || '').trim() || !String(reg.justification || '').trim()) return erro('aprovacao exige registro de homologacao com responsavel humano e justificativa', 'P0001');
      const v = globalThis.PacoteMetodologico.validar(montarPacote(id));
      if (!v.publicavel) return erro('publicacao bloqueada pelo validador: ' + v.total_erros + ' erro(s) — ' + JSON.stringify(v.erros).slice(0, 400), 'P0001');
      const p = montarPacote(id);
      const limpar = (o) => { const c = Object.assign({}, o); ['id', 'created_at', 'updated_at', 'nutritionist_id', 'package_id', 'edition_id'].forEach(k => delete c[k]); return c; };
      const conteudo = { questions: p.perguntas.map(limpar), associations: p.associacoes.map(limpar), ranges: p.faixas.map(limpar), systems: p.sistemas.map(limpar), scales: p.escalas.map(limpar), rules: p.regras.map(limpar) };
      const h = createHash('sha256').update(JSON.stringify(conteudo), 'utf8').digest('hex');
      const r0 = inserir('methodology_homologation_records', { package_id: id, topic: 'pacote', element: pk.code, version: String(pk.version), decision: 'aprovado', responsible: reg.responsible, decided_at: reg.decided_at || agora().slice(0, 10), source: reg.source || null, justification: reg.justification, evidence: reg.evidence || 'validar_pacote_metodologico: 0 erros' });
      if (r0.error) return r0;
      s.aprovacaoRpc = id;
      const r = atualizar('methodology_packages', id, { status: 'aprovado', approved_at: agora(), approved_by: uid, reviewed_by: uid, reviewed_at: agora(), responsible: reg.responsible, justification: reg.justification || pk.justification, effective_from: reg.effective_from || pk.effective_from || agora().slice(0, 10), content_hash: h });
      s.aprovacaoRpc = null;
      if (r.error) return r;
      return { data: { id, status: 'aprovado', content_hash: h, validacao: v }, error: null };
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
        metodologia: 'Resultados metodológicos do HOLOSCAN (notas, faixas, Índice, Tríada, Leitura Integrada) ainda não são oficiais: Pacote Metodológico V1 não homologado. Constam só identificação, data, versão e cobertura bruta.',
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
      conteudo.exames = [];
      for (const id of (sel.lab_collection_ids || [])) { const r = mine('lab_collections', id); if (!r) return erro('coleta ' + id + ' nao e deste paciente', 'P0001');
        const res = s.tabelas.lab_results.filter(x => x.collection_id === r.id).sort((a, b) => String(a.exame_id).localeCompare(String(b.exame_id))).map(x => ({ exame_id: x.exame_id, nome: x.nome_exame_no_momento, valor: x.valor, unidade: x.unidade_no_momento }));
        conteudo.exames.push({ tipo_conteudo: 'DADO_MEDIDO', id: r.id, encounter_id: r.encounter_id || null, coletado_em: r.coletado_em, data_coleta_desconhecida: r.data_coleta_desconhecida, laboratorio: r.laboratorio || null, resultados: res }); addFonte('lab_collections', { id: r.id, updated_at: r.updated_at }); }
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
        for (const k of ['objective', 'nutrition_strategy', 'actions', 'resources', 'requested_exams', 'referrals', 'monitoring', 'return_plan', 'observations', 'nutrition_diagnosis', 'dietary_prescription', 'professional_guidance']) o[k] = r[k] || null;
        o.acordos = ac; conteudo.condutas.push(o); addFonte('conducts', { id: r.id, revision_number: r.revision_number, updated_at: r.updated_at }); }
      conteudo.documentos = [];
      for (const id of (sel.document_ids || [])) { const r = mine('documents', id); if (!r) return erro('documento ' + id + ' nao e deste paciente', 'P0001');
        conteudo.documentos.push({ tipo_conteudo: 'DADO_DOCUMENTAL', id: r.id, nome: r.nome, tipo: r.tipo || null, data_documento: r.data_documento || null }); addFonte('documents', { id: r.id, updated_at: r.updated_at }); }
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
      (m.paths || []).forEach(pth => { if (b[pth] && b[pth].dono === uid) delete b[pth]; });
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
        signOut: function () {
          localStorage.removeItem(CHAVE);
          emitir("SIGNED_OUT", null);
          return Promise.resolve({ error: null });
        },
        resetPasswordForEmail: function () { return Promise.resolve({ data: {}, error: null }); },
        updateUser: function () { return Promise.resolve({ data: {}, error: null }); }
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
