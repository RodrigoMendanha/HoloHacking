# HOLOHACKING V1 — ETAPA 6.0 — IMPLEMENTAÇÃO EXECUTÁVEL DA LEITURA INTEGRADA (LOCAL)

Branch `claude/v1-etapa6-implementacao-li-local` (sobre `cc4dbad`, Etapa 5.13). Primeira etapa não-docs da nova Leitura Integrada. **Banco real não tocado.** Nenhuma migration aplicada, nenhum approver real, nenhuma aprovação, nada homologado, nada deployado.

> **Estado em uma linha:** metodologia decidida (Etapas 5.4–5.13) → **implementada localmente** (migration, pacote executável, motor, persistência, servidor falso, UI mínima, testes, cadeia SQL local) → **banco real não validado** → **nada homologado** → **nada deployado**.

## AUTORIDADE

Documento Mestre = destino; decisões da Etapa 5 (`docs/v1/laboratorio/DECISAO-*.md`, `DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md`, `PACOTE-FINAL-PENDENCIAS-EXECUTAVEIS-LI-V1.md`) = contrato executável; legado = referência histórica. Nenhuma regra clínica inventada; nenhuma relação inferida; `legacy_sistema` não herdado; `confrontar()` antigo fora do fluxo oficial (continua isolado atrás do modo de homologação); HOLOSCAN nunca alterado por exames.

## CORREÇÃO SEMÂNTICA (antes de codificar)

Os mistos de D01–D04 **têm** regra homologada (unanimidade). A mistura `present + not_detected` produz `laboratory_direction = indeterminate` com reason code técnico **`mixed_results_indeterminate`** ("há regra homologada para o conjunto, mas a regra resulta em direção laboratorial indeterminada"). **`mixed_without_rule`** fica reservado ao cenário futuro em que realmente não exista regra homologada para determinado conjunto. Nenhum estado oficial novo: o estado continua SEM DADOS SUFICIENTES. Docs corrigidos: `DECISAO-19`, `DECISAO-22`, `PACOTE-DECISAO-HUMANA` (bloco 19), `RESUMO`, `PACOTE-FINAL` §7, `DECISOES-V1.md`.

## MIGRATION — `supabase/migrations/20261002120000_etapa6_leitura_integrada_v1.sql` (NÃO aplicada)

Próximo timestamp livre após `20261002110000`. Extensão mínima e compatível do schema das Etapas 5/5.2 (nada dropado):

| Tabela | Colunas/constraints novas |
|---|---|
| `integrated_reading_domains` | `definition`, `holoscan_mapping_mode` (`mapped` \| `none`, default `none`), `position`; `ird_mapping_coerente` (mapped ⇔ `holoscan_system` não nulo) |
| `integrated_reading_exam_domain_links` | `cross_source_role` (`directional` \| `contextual`, default `contextual`), `direction_rules jsonb`, `variants_declared text[]`, `version`, `source`, `justification`; `irl_directional_rules` (directional ⇔ `direction_rules`); `irl_unico` |
| `integrated_reading_rules` | `rule_type` passa a aceitar `holoscan_direction` e `reason_semantics` |
| `integrated_readings` | `domain_code`, `holoscan_direction`, `laboratory_direction`, `snapshot jsonb`; `ir_direcoes` |

Funções substituídas: `li_conteudo_canonico` (cobre os campos novos), `li_validar_completude` (+ `sem_regra_direcao_holoscan`; domínio mapped exige directional, suficiência e mistos próprios; domínio none não pode ter directional), `salvar_leitura_integrada` (congela domínio, direções e snapshot no conteúdo e no hash; recusa leitura cross-source em domínio `none` — hint `dominio_sem_confronto`; convergente/divergente exigem pacote aprovado, domínio, direções determinísticas e coerência estado × direções).

**Seed:** `LI-V1` versão **2**, status **`em_revisao`**, com 7 domínios, 47 vínculos (9 directional + 38 contextual), 18 regras (temporal, holoscan_direction, 7 sufficiency, 7 mixed, convergence, text, reason_semantics), tudo `aprovado` como elemento. `LI-V1@1` (rascunho, infraestrutura) preservado como histórico. A própria migration prova: 7 / 47 / 42 / 3 / 5 / 9 / 38, por domínio 7/3/5/4/4/12/12, nenhum directional em domínio none, completude publicável, 0 aprovações, 0 snapshots, 0 approvers.

**Dados metodológicos inseridos:** exatamente os de `leitura-integrada-pacote-v1.js` (o SQL de seed é gerado por `sqlInserts()` do módulo; o teste `etapa6-li-motor` prova que a migration contém cada insert).

A marcação de referência do laudo como ambígua (`reference_status = 'ambiguous'`) ficou **fora** desta migration (o LabMotor já classifica `ambiguous_reference` quando a referência vier marcada; a persistência/UI dessa marcação é acabamento posterior).

## PACOTE EXECUTÁVEL — `leitura-integrada-pacote-v1.js` (`window.LeituraIntegradaPacoteV1`)

| Campo | Valor |
|---|---|
| code / version / status | LI-V1 / 2 / em_revisao |
| domínios | LI-D01…LI-D07 com definição (DECISÃO 01), `holoscan_mapping_mode`, sistema |
| vínculos | 47 (DECISÃO 02), `direction` above/below/any, `cross_source_role`, `direction_rules` (só directional), `variants_declared` (LAB-016 `ultrassensivel`, LAB-021 `eritrocitario`) |
| directional | D01 LAB-016, LAB-018 · D02 LAB-002, LAB-003, LAB-004 · D03 LAB-005, LAB-009 · D04 LAB-013, LAB-015 |
| contextual | os outros 38 (D05/D06/D07 só contextual) |
| temporal | LI-TEMP-01 v1: `max_days 30`, inclusivo, simétrico, global, 0 exceções, âncoras clínicas, campos técnicos proibidos |
| holoscan_direction | HOLOS-V1 ≥ 2 **aprovado**; baixa → present, intermediária → indeterminate, alta → not_detected; não avaliável → indeterminate |
| sufficiency | D01 min 1, obrig. LAB-016, opc. LAB-018 · D02 min 2 + GLYCEMIC_ANCHOR {LAB-002 OU LAB-004} · D03 min 2, obrig. LAB-005+LAB-009 · D04 min 2, obrig. LAB-013+LAB-015 · D05–D07 `not_applicable` (min null) |
| mixed | D01–D04 `unanimity` (mistura → indeterminate, `mixed_results_indeterminate`; opcional indeterminate ignorado; participante indeterminate bloqueia) · D05–D07 `not_applicable` |
| convergence | present+present / not+not → convergente; cruzado → divergente; indeterminate nunca; ordem dos 11 passos |
| text | textos-base profissional e paciente (DECISÕES 23/24) + texto neutro de domínio sem confronto |
| reason_semantics | vocabulário aprovado traduzido para humano (inclui `mixed_results_indeterminate`) |
| **content_hash** | **`7c6d93a0f91c790ba052c8687822c4513ad27015a7dc86c506d437b52beb6d1a`** — sha256 do texto canônico no formato `jsonb::text` (ordem de chaves do PostgreSQL); **idêntico** em SQL local (`li_hash_conteudo`), no servidor falso e no JS |

Direções por exame conforme ditado (5.12): PCR/fibrinogênio/HbA1c/TG/ALT/GGT `above → present, within → not_detected, below → indeterminate`; HDL `below → present, within → not_detected, above → indeterminate`; glicemia e insulina `above/below → present, within → not_detected`. Nota de implementação (conservadora, documentada): em exame **participante** (obrigatório ou membro de grupo) com direção `indeterminate` (ex.: HbA1c abaixo em D02), a direção laboratorial fica `indeterminate`; em exame **opcional** (fibrinogênio em D01) o `indeterminate` não conta nem bloqueia — como ditado.

## MOTOR — `leitura-integrada-motor.js` 2.0.0 (`LeituraIntegradaMotor.calcular`)

Entrada: `rule_package`, `holoscan { application { id, clinical_date, methodology_package {code, version, status} }, system_results }`, `collections [{id, clinical_date}]`, `results`, `classifications` (saída do LabMotor), `selected_result_ids`, `patient_id`. Saída por domínio: modo (`enabled` \| `not_applicable`), disponibilidade laboratorial (distinta da suficiência), temporal (delta com sinal por coleta), itens (classificação, papel, direção, inclusão/exclusão com motivo), suficiência, mistos, HOLOSCAN (pacote, avaliabilidade, faixa, direção), `laboratory_direction`, `holoscan_direction`, estado oficial (nulo em domínio sem confronto), reason_codes, textos e **snapshot** congelável.

Ordem implementada: 1 fonte HOLOSCAN → 2 versão compatível → 3 temporalidade (LI-TEMP-01) → 4 vínculos → 5 resultados selecionados (duplicidade) → 6 referência/unidade/contexto (classificação do LabMotor, nunca duplicada) → 7 suficiência (só directional) → 8 mistos (unanimidade) → 9 `laboratory_direction` → 10 `holoscan_direction` → 11 estado. Sem maioria, média, peso, score, "um vence", recálculo do HOLOSCAN, herança de legado ou `confrontar()`.

`laboratorio-motor.js` 1.1.0: valor censurado classifica **só quando o intervalo prova um único estado** (DECISÃO 15; `numeric_value` continua nulo; senão `censored_value_ambiguous`); referência marcada `ambiguous` → `ambiguous_reference` (DECISÃO 07).

## PERSISTÊNCIA / SNAPSHOT

Leitura salva **por domínio** (`integrated_readings.domain_code`), com `holoscan_direction`, `laboratory_direction` e `snapshot` (paciente, domínio, aplicação e data clínica, pacote HOLOSCAN, coletas com datas e deltas, result_ids, itens com valor/unidade originais, variante/material/método, classificação, referências e origem, excluídos com motivo, regra temporal/versão, pacote LI/versão, regras de suficiência e mistos/versões, direções, estado, motivos). Observação profissional em coluna separada (fora do hash do snapshot, dentro do hash da leitura). Imutabilidade: trigger existente (`proteger_leitura_integrada`) cobre as colunas novas; nova coleta e nova versão do pacote não reescrevem leituras salvas (provado em SQL local e no servidor falso). Domínios `none` não recebem leitura cross-source (RPC recusa; UI não oferece).

## SERVIDOR FALSO (`testes/supabase-falso.mjs`)

Importa o pacote JS e semeia LI-V1@2 com o mesmo conteúdo da migration; colunas novas; `liConteudo`/`liHash` passam a usar o serializador `jsonb::text` do pacote (hash igual ao do PostgreSQL); completude estendida; RPC `salvar_leitura_integrada` com domínio, direções, snapshot, coerência e recusa em domínio `none`; constraints novas em `gestaoTecnica`. Nenhum comportamento diferente do contrato SQL.

## UI MÍNIMA (`laboratorio.js`, `style.css`)

Pacote em uso: maior versão viva de LI-V1 (aprovado vigente tem prioridade). Fonte HOLOSCAN congelada: respostas da aplicação + pacote metodológico registrado nela (`methodology_package_id`) → `MotorMetodologico` → nota/faixa **oficiais** (nunca limites legados 3/6); aplicação sem pacote V1 → `incompatible_holoscan_version`. Tela por domínio: estado, texto-base, direções, exames usados, contextuais, excluídos com motivo humano, regras/versões, snapshot, botão de salvar por domínio (só D01–D04). D05/D06/D07: texto neutro "Este domínio é apresentado como informação laboratorial na V1 e não possui confronto automático com um sistema HOLOSCAN." (texto de interface, não estado oficial). Duplicidade: a tela pede escolha explícita do `result_id`. Coletas ordenadas por proximidade da data clínica (sugestão; nunca escolhidas; empates visíveis). Observação profissional separada. Nenhum texto "confirma/prova/diagnostica/normal global/saudável/doente/cura/melhora/piora" como conclusão. `index.html` não mudou (o pacote JS é dado do servidor; o arquivo é servido para conferência e reuso em Node).

## TESTES

Novos: `testar-v1-etapa6-li-motor.mjs` (88: contagens, hash, migration == JS, temporal 0/±30/±31/sem data, HOLOSCAN baixa/intermediária/alta/não avaliável/ausente/versão, D01–D04 completos, D05–D07 not_applicable, classificação (referência ausente/ambígua, unidade, qualitativo, censurado determinístico/ambíguo, variante/material/método), duplicidade, estados, snapshot, não interferência com nota/faixa/Índice/Tríada, sem legado), `testar-v1-etapa6-li-banco.mjs` (30: seed, hash, completude, governança intocada, leitura por domínio, barreira em_revisao, homologação **local de fixture** → convergente/divergente, coerência, duplicidade, snapshot imutável contra nova coleta e nova versão, não interferência), `testar-v1-etapa6-li-ui.mjs` (12: 7 domínios, D05–D07 neutros, motivos humanos, duplicidade explícita, salvar por domínio, sem linguagem diagnóstica, sem legado).

Ajustes por mudança legítima de contrato (nenhuma asserção removida; todas reescritas para o contrato decidido):
- `testar-v1-etapa5-motor.mjs`: fixtures do motor 1.0.0 (`min_results`, `max_days`, `policy majority`, `holoscan_max_nota`) → contrato 2.0.0 (unanimidade, LI-TEMP-01, faixa → attention_*); censurado "< 0,10" contra [70,99] agora **prova below** (DECISÃO 15) e "< 80" é `censored_value_ambiguous`.
- `testar-v1-etapa5-banco.mjs`: LI-V1@1 continua rascunho e vazio; LI-V1@2 existe em_revisao com 7/47.
- `testar-v1-etapa5-ui.mjs`: pacote em uso LI-V1 v2 (em_revisao, não homologado); leitura por domínio; aplicação legada sem pacote V1 → sem dados; D05–D07 neutros; 47 vínculos vêm da migration, não da tela.
- Harness SQL `etapa5`/`etapa5-2`: consultas a `code = 'LI-V1'` pinadas a `version = 1`.

Cadeia SQL local (`scripts/validar-cadeia-local.sh`, PostgreSQL 16, BEGIN…ROLLBACK): 130000 → **20261002120000** + harnesses (4, 4.2, dupla aprovação, 5, 5.2, 5.3, **6: E01–E30**) = **207 checks ok, 0 FALHOU**. Hash de LI-V1@2 no SQL = `7c6d93a0…` = JS = servidor falso.

Suíte completa (`node testes/rodar.mjs`, porta 5500 livre): **102 suítes, 3391 asserções, 0 falhas, 0 reprovadas** (antes da etapa: 99 / 3258). Nenhum teste removido.

## DOCKER

Imagem construída localmente na HEAD (`docker build --build-arg COMMIT=$(git rev-parse --short HEAD)`), container em porta local: `version.json.commit == HEAD`, rotas 200 (inclui `/leitura-integrada-pacote-v1.js`), `sh scripts/conferir-producao.sh http://127.0.0.1:18085` → **OK: 54 de 54** arquivos batem com `docs/deploy.md` §3.5 (lista regenerada: 53 → 54 arquivos; hashes de `laboratorio.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js`, `style.css` atualizados). **Nenhum deploy.** Container removido após a conferência.

## BANCO REAL / GOVERNANÇA

Supabase real intocado; migrations 20261002100000/110000/120000 não aplicadas; `methodology_approvers` vazia; nenhum `auth.uid` real; 0 aprovações; nada homologado (completude de LI-V1@2 publicável: o que falta é o ato humano). VALIDAÇÃO REAL PENDENTE.

## PRÓXIMO GATE (fora desta etapa)

1. Validar a cadeia 130000 → 20261002120000 no Supabase real (conexão autorizada; BEGIN/ROLLBACK; ON_ERROR_STOP).
2. Aplicar as migrations. 3. Cadastrar os `auth.uid` reais de Daniel e Rodrigo em `methodology_approvers`. 4. Aprovação 1 (Daniel) e Aprovação 2 (Rodrigo) sobre LI-V1@2 / versão 2 / `7c6d93a0…`. 5. Homologar. 6. Registrar `methodology_package_id` nas aplicações HOLOSCAN calculadas com HOLOS-V1@2 (hoje nenhuma aplicação real carrega o pacote V1: toda leitura real fica em sem dados por `incompatible_holoscan_version` até isso). 7. Deploy.
