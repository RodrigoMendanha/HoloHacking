# MODELO V1 — COLETA, RESULTADO, COMPONENTE, EXAME CUSTOMIZADO

Etapa 5 · migration `20261001220000_etapa5_laboratorio.sql` (NÃO aplicada) · UI `laboratorio.js` · servidor falso espelhado em `testes/supabase-falso.mjs`.

## Coleta — `lab_collections`

Identidade = `id`. Nunca `patient_id + data`. **Duas coletas na mesma data existem**, com ids independentes; nenhuma RPC procura coleta por data para sobrescrever.

| Campo | Significado |
|---|---|
| `id`, `patient_id`, `nutritionist_id` | identidade e dono (RLS: `nutritionist_id = auth.uid()`; FK composta paciente↔profissional) |
| `coletado_em` (= **clinical_date**), `clinical_time` | data/hora **clínica** da coleta. `created_at`/`updated_at` são registro. O histórico ordena por `coletado_em` desc, depois hora, depois registro — nunca por `updated_at`. |
| `data_coleta_desconhecida` | legado: coleta antiga sem data; coleta V1 **salva** exige data (`rascunho` pode não ter) |
| `laboratorio` (= laboratory_name), `observacao` (= notes) | texto livre |
| `encounter_id` | **opcional e explícito** (checkbox "vincular ao atendimento ativo"); FK composta `(encounter, patient, nutritionist)`; nunca deduzido pela data, nunca "primeiro atendimento do dia", nunca consulta/agendamento |
| `document_id` | laudo associado, opcional (`documents` do mesmo profissional). Laudo sem resultados e resultados sem laudo são ambos válidos |
| `state` | `rascunho` (retomável, fora da saída oficial) · `salvo` (só após confirmação do servidor) · `revisado` (salvo + ação humana identificada: `marcar_coleta_revisada`, `reviewed_at/by`) |
| `source` | `manual` (painel V1), `revision` (criada por revisão), `legacy_panel` (painel legado), `legacy_migrated`, `extracted_draft` (reservado para extração futura: sempre rascunho até revisão humana) |
| `operation_id` | idempotência: retry da mesma operação devolve a mesma coleta (`unique (nutritionist_id, operation_id)`); nova operação no mesmo dia cria nova coleta |
| `revision`, `supersedes_id`, `superseded_at`, `revision_note`, `created_by` | correção de coleta consolidada = **nova linha** (versão N+1, mesma `coletado_em` salvo correção explícita), a anterior fica intacta com `superseded_at`; quem, quando, motivo, versão anterior e atual preservados. Não é "coleta clínica nova". |

**Criar vs editar** (UI e RPC): "Nova coleta" → sem `id` → sempre insere. "Editar esta coleta" → `id` explícito → só se `rascunho`. Coleta `salvo/revisado` → "Revisar (nova versão)" → `revisar_coleta_laboratorial` (exige motivo). Triggers `proteger_coleta_consolidada` / `proteger_resultado_consolidado`: consolidado não é sobrescrito nem apagado (hard-delete bloqueado); rascunho é editável/apagável.

**Nova coleta começa vazia.** "Usar estrutura da coleta anterior" copia só *quais* exames/variante/material/método estavam presentes — nunca valores, referências, observações ou datas. Nenhuma cópia silenciosa de conteúdo.

## Resultado — `lab_results`

| Campo | Regra |
|---|---|
| `exam_code` (FK `lab_exam_catalog`) **ou** `custom_exam_id` (FK `lab_custom_exams`) | exatamente um (CHECK); legado migrado pode ter nenhum (`origin additional_legacy` ou `requires_manual_mapping`) |
| `variant`, `material`, `method` | explícitos; nunca inventados. Identidade única por coleta: `(exame, variante, material)` |
| `value_original_text` **not null** | o valor **exatamente** como informado/laudo: "7,2", "< 0,10", "> 2000", "Negativo", "Reagente", "Não detectado". Nunca destruído |
| `numeric_value` | só quando o valor é inequivocamente numérico (`qualifier = eq`; CHECK) |
| `qualifier` | `eq` · `lt` · `lte` · `gt` · `gte` · `text`. Censurado ("< 0,10", "abaixo de", "acima do limite de quantificação") → `qualifier` + `censor_limit` (pode ser nulo), **`numeric_value` nulo** (CHECK: nunca 0,10 / 0,099 / 0) |
| `unit_original` | unidade como informada |
| `report_reference_text/min/max/operator/unit/population` | **referência do próprio laudo**, digitada pela profissional. `reference_status = informed` só com algo informado; senão `missing` (CHECK). **Ausência de referência não significa "dentro"** |
| `reference_source` | `laudo` (único valor usado na V1); `metodologica` reservado |
| `origin` | `manual` · `legacy_migrated` · `additional_legacy` · `extracted_draft` |
| `legacy_exame_id`, `legacy_ideal_min/max`, `legacy_sistema`, `requires_manual_mapping`, `mapping_note` | provenance do legado; nunca saída oficial |
| `result_date`, `notes`, `position`, `revision` (herdada da coleta) | — |

Qualitativo: preservado textualmente; sem regra homologada o motor devolve `not_classifiable / qualitative_without_rule`. Nunca `Negativo = 0`.

## Componentes — `lab_result_components`

Pertencem a um resultado de exame **composto** do catálogo (só LAB-001 Hemograma completo; trigger `proteger_componente_laboratorial`). Campos: `original_name`, `canonical_component_key` (opcional), `value_original_text`, `numeric_value`/`qualifier`/`censor_limit`, `unit_original`, `report_reference_*`, `notes`. Não são exames-base independentes; o catálogo continua com 45. Nenhuma lista clínica fixa de componentes foi inventada.

## Exame customizado — `lab_custom_exams`

`id`, `nutritionist_id`, `name` (único por profissional, case-insensitive), `aliases`, `notes`, `status`, `created_at`, `created_by`. RLS do dono. Não vira global, não ganha regra, referência ou vínculo. Não conta nos 45.

## RPCs

| RPC | Faz | Não faz |
|---|---|---|
| `salvar_coleta_laboratorial(payload)` | cria (sem `id`) ou edita rascunho (com `id`); `operation_id` idempotente; valida paciente, atendimento explícito, catálogo/custom, valor original, identidade única; grava componentes | não procura por data; não edita consolidada; não deduz atendimento |
| `revisar_coleta_laboratorial(payload)` | nova versão de coleta consolidada (motivo obrigatório); marca a anterior | não sobrescreve; não revisa versão já substituída |
| `marcar_coleta_revisada(id, responsável)` | `salvo → revisado` com responsável | não cria aprovação metodológica |
| `salvar_leitura_integrada(payload)` | ver `LEITURA-INTEGRADA-CONTRATO.md` | — |

Legado: `salvar_coleta_exames` (migration 140000) continua para outros clientes — identidade pelo id, sem busca por data; o app não a usa.

## Sincronização e concorrência

Servidor é a fonte: "Salvo" só após resposta; falha → "Não sincronizado"/"Não salvo" com aviso; rascunho vive no servidor (`state = rascunho`), sem localStorage novo. Coleta consolidada é imutável (trigger) — duas abas não a sobrescrevem; rascunho em duas abas: a última escrita vence só no rascunho (decisão de produto pendente para lock otimista de rascunho).
