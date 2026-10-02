# LEITURA INTEGRADA — CONTRATO DA INFRAESTRUTURA V1

Etapa 5 · `leitura-integrada-motor.js` (`motor-leitura-integrada-1.0.0`) · migration `20261001220000` · UI em `laboratorio.js` (`#holo-confronto` e aba HOLOSCAN da ficha).

> **IMPLEMENTA A INFRAESTRUTURA. NÃO INVENTA A METODOLOGIA.** O pacote real `LI-V1` nasce em `rascunho`, **sem** domínio, **sem** vínculo exame → domínio, **sem** suficiência, **sem** janela temporal, **sem** regra de resultados mistos, **sem** textos. Logo o único estado real possível é `sem_dados_suficientes`.

## Entidades (configuração global, somente leitura pela aplicação)

| Tabela | Conteúdo | V1 real |
|---|---|---|
| `integrated_reading_rule_packages` | `code`, `version`, `status`, `content_hash`, `responsible`, `approval_provenance` | `LI-V1@1`, `rascunho` |
| `integrated_reading_domains` | `package_id`, `code`, `name`, `holoscan_system` (opcional, **não** é mapeamento automático), `status` | **0 linhas** |
| `integrated_reading_exam_domain_links` | `domain_id`, `exam_code`, `variant`, `material`, `direction` (`any/above/below`), `reference_id`, `status` | **0 linhas** |
| `integrated_reading_rules` | `rule_type` ∈ `sufficiency` (`min_results`), `temporal` (`max_days`), `mixed` (`policy`), `convergence` (`holoscan_max_nota` ou `holoscan_faixa`), `text` (`convergente/divergente/sem_dados_suficientes`), `status` | **0 linhas** |

Domínio ≠ sistema HOLOSCAN: nenhum domínio é criado, e nenhum exame é mapeado a Fúngico/Metabólico/Ácido Inflamatório etc. Isso é decisão metodológica (`HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`).

## Motor genérico — `LeituraIntegradaMotor.calcular(entrada)`

Entrada: `rule_package` (com `domains`, `links`, `rules`), `holoscan_application` (`id`, `applied_at`, `system_results`), `collections` (`id`, `clinical_date`), `results`, `classifications` (saída do `LabMotor` por resultado).

Por domínio **aprovado**: exige vínculos aprovados, regra de suficiência e de convergência aprovadas, HOLOSCAN presente e avaliável; inclui só resultados vinculados, classificáveis e dentro da janela (`temporal`); aplica suficiência; resultados mistos exigem regra `mixed`; compara "laboratório alterado" (pela direção do vínculo e política de mistos) com "HOLOSCAN alterado" (regra de convergência) → `convergente` / `divergente`. Qualquer peça faltando → `sem_dados_suficientes` com motivo. **"Um exame fora" nunca basta**: sem pacote aprovado com vínculo, suficiência e convergência, nada converge nem diverge.

Estados: `convergente` · `divergente` · `sem_dados_suficientes`. Motivos: `sem_regra_homologada`, `sem_associacao_aprovada`, `sem_referencia_utilizavel`, `fonte_ausente`, `incompatibilidade_temporal`, `dados_mistos_sem_regra`, `holoscan_nao_avaliavel`, `unidade_incompativel`. "Divergente" nunca é usado porque algo falta.

Trace por domínio: `domain_id`, `holoscan_application_id`, `collection_ids`, `result_ids`, `reference_ids`, `rule_package_id`, `rule_version`, `temporal_rule`, `included_items`, `excluded_items`, `excluded_reasons`, `sufficiency`, `state`, `reason_codes`, `engine_version`.

Fixtures `TEST_FIXTURE_ONLY` (`testar-v1-etapa5-motor.mjs`): A convergente, B divergente, C sem associação, D mistos sem regra, E fora da janela, F unidade incompatível. O teste prova que nenhuma fixture está na migration nem na UI.

## Seleção (UI)

Explícita: 1 aplicação HOLOSCAN consolidada (lista com data clínica, estrutura, cobertura, id) + N coletas (checkbox, com data clínica, estado, revisão, id). Nunca "a última coleta modificada" nem "última por `updated_at`". Mostra estado, motivos e trace.

## Persistência — `integrated_readings` (escrita só por `salvar_leitura_integrada`)

Congela: `patient_id`, `nutritionist_id`, `responsible`, `clinical_context`, `encounter_id`, `holoscan_application_id`, `selected_collection_ids`, `selected_result_ids`, `references_snapshot`, `sources_snapshot`, `rule_package_id` + `rule_version`, `engine_version`, `state`, `reason_codes`, `trace`, `professional_note`, `revision`, `supersedes_id`, `content_hash` (SHA-256 no servidor), `created_at/by`.

- Barreira no servidor: com `LI-V1` sem vínculo aprovado (e sem `status = aprovado`), só `sem_dados_suficientes` é aceito; `convergente/divergente` são recusados.
- Imutável (trigger): correção = nova revisão (`supersedes_id`), anterior preservada. Nova coleta futura ou nova regra futura **não** alteram leitura salva.
- Não toca `holoscan_applications`, `holoscan_system_scores`, Índice, Tríada, respostas, `methodology_package_id` nem contrato do motor (testes de banco e UI).

## Fronteiras

- **Conduta**: nada é gerado automaticamente; sem "recomenda", "prescreve", "solicite", "encaminhe", "suplementar".
- **HOLOS AI**: não recebe convergente/divergente, inferência laboratorial, "exame confirma/contradiz", classificação ou ideal legado; recebe só dado factual já autorizado (exame, variante, valor original, unidade, data, laboratório, referência do laudo) de coletas salvas/revisadas.
- **Timeline**: leitura salva pode aparecer só com registro explícito (`integrated_readings`); rascunho de coleta não entra.
- **Relatórios**: Leitura Integrada só entra se salva e explicitamente selecionada — e, na V1, nunca com classificação convergente/divergente (não existe).
- **Confronto legado** (`confrontar()`, `window.Holoscan`, `nota ≤ 3`, "um exame fora"): só em `?homologacao=1`, rotulado LEGADO; nenhuma superfície oficial o consome.
