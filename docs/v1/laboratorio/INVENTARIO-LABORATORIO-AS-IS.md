# INVENTÁRIO LABORATORIAL — AS-IS (antes da Etapa 5)

Etapa 5 · 02/10/2026 · branch `claude/v1-etapa5-laboratorio` (a partir de `dd50183`)

O AS-IS serve só para entender a implementação de origem. Nada aqui vira regra oficial. Classificação de cada peça:
**ATIVO** (continua em uso na V1), **LEGADO** (fica, isolado e rotulado), **INCOMPATÍVEL COM O MESTRE** (contraria §21–§24, §34.2, §43.2),
**PRESERVAR COMO HISTÓRICO** (não apagar), **REMOVER DA SAÍDA OFICIAL** (não alimenta UI oficial, Evolução, relatórios, HOLOS AI, Conduta, Dashboard).

## 1. Banco

| Peça | O que é | Classificação | O que a Etapa 5 fez |
|---|---|---|---|
| `lab_collections` (fase 2C, 2026-09-21) | coleta por paciente: `coletado_em` (data clínica), `data_coleta_desconhecida`, `laboratorio`, `observacao`, `encounter_id` (Etapa 1) | ATIVO | evoluída: `clinical_time`, `state` (rascunho/salvo/revisado), `source`, `operation_id` (idempotente), `revision`/`supersedes_id`/`superseded_at`/`revision_note`, `reviewed_*`, `document_id`, `created_by`. `coletado_em` **é** a `clinical_date`. Linhas antigas: `source = legacy_panel`, `state = salvo`. |
| `lab_results` (fase 2C) | um resultado por `exame_id` EXA-*, `valor numeric not null`, `unidade_no_momento`, **`ideal_min/ideal_max_no_momento not null`**, `nome_exame_no_momento`, **`sistema_no_momento` CHECK nos 5 sistemas** | INCOMPATÍVEL COM O MESTRE (ideal sem fonte; exame → sistema HOLOSCAN; numérico obrigatório) + PRESERVAR COMO HISTÓRICO | colunas legado ficam (agora nulas para linhas V1) e viram `legacy_exame_id`, `legacy_ideal_min/max`, `legacy_sistema`; novas colunas: `exam_code`, `custom_exam_id`, `variant`, `value_original_text`, `numeric_value`, `qualifier`, `censor_limit`, `unit_original`, `method`, `material`, `report_reference_*`, `reference_status`, `reference_source`, `origin`, `requires_manual_mapping`. Unique legado `(collection_id, exame_id)` mantida; unique V1 por `(coleta, exame, variante, material)`. |
| RPC `salvar_coleta_exames` (fase 6 → reescrita na Etapa 0, migration 140000) | em produção (fase 6 + fix): **upsert por paciente + data, apagando resultados**; na migration 140000 (não aplicada): identidade pelo `collection.id`, sem busca por data | fase 6 em produção: INCOMPATÍVEL COM O MESTRE; versão 140000: ATIVO-LEGADO (o app não a chama) | auditada; continua para outros clientes; sem regressão: **nenhuma** busca por data. A V1 usa `salvar_coleta_laboratorial` (collection_id explícito + `operation_id`). |
| trigger `bloquear_escrita_paciente_arquivado` em `lab_collections`/`lab_results` | paciente arquivado não recebe escrita | ATIVO | estendido a `lab_result_components` (via resultado→coleta) e `integrated_readings`. |
| `emitir_relatorio` (Etapa 3): bloco de exames com `exame_id/nome/valor/unidade` | snapshot do relatório | ATIVO | substituída (mesma função) para gravar valor original e referência do laudo dos resultados V1; rascunho não entra. |
| `supabase/migrations-pendentes/PENDENTE_lab_collections_data_nao_futura.sql` | recusa de data futura (Rodada 08) | PENDENTE de decisão de produto | intocada. |

## 2. Frontend

| Peça | O que é | Classificação | O que a Etapa 5 fez |
|---|---|---|---|
| `arquivos.js` — painel `#ex-corpo` ("Os valores do exame") | 24 itens fixos de `motor/bancos/exames.csv`, `faixa cadastrada` (ideal de rascunho), `na faixa/abaixo/acima`, confronto `#ex-confronto`, Nova/Editar/Excluir coleta, estados Não salvo/Salvando/Salvo/Não sincronizado, rascunho local `holohacking.exames` | LEGADO + INCOMPATÍVEL (ideal, exame→sistema, "um exame fora") + REMOVER DA SAÍDA OFICIAL | fica isolado e rotulado **"Painel legado (valores locais) — fora da saída oficial"**; só enxerga coletas `source = legacy_panel` (`Sincronizacao.coletasLegado`). A entrada oficial é `#lab-corpo` (`laboratorio.js`). |
| `arquivos.js` — `window.Holoscan` (`estado/rotulo/texto`), `desenharHoloscan()` (`#holo-confronto`), `desenharHoloscanAba()` (`#aba-holoscan-laboratorial`) | confronto legado: `nota ≤ 3` (HOLOSCAN_LIMITE_BAIXO) × "um exame fora da faixa" = Convergente / Divergente / Dados insuficientes; contagem por estado | INCOMPATÍVEL COM O MESTRE (§24: sem vínculo exame→domínio, suficiência, janela e versão) + REMOVER DA SAÍDA OFICIAL + PRESERVAR COMO HISTÓRICO | **fora da saída oficial**: as duas superfícies passam a desenhar a Leitura Integrada V1 (`Laboratorio.desenharLeituraIntegrada`). O confronto legado só aparece com `?homologacao=1`, com faixa "LEGADO". |
| `motor/src/exames.ts` — `avaliarExames()`, `confrontar(limiteBaixo = 3)`, `lerExames()` em `holoscan.js` (`window.HOLOSCAN.lerExames/listaDeExames`) | motor L1 empacotado; `leitura_baixo/leitura_alto` causais do CSV | LEGADO + PRESERVAR COMO HISTÓRICO | intocado; não é chamado por nenhuma superfície oficial (`leitura-integrada-motor.js` não o conhece). `testar-exames.mjs` continua provando o motor legado em isolamento. |
| `motor/bancos/exames.csv` (24 EXA-*) | catálogo legado com `sistema`, `ideal_min/max`, leituras causais, `status rascunho`, fonte "literatura funcional — revisar" | INCOMPATÍVEL (ideal, sistema) + PRESERVAR COMO HISTÓRICO | intocado. Mapeamento determinístico → catálogo-base (`LabCatalogo.MAPA_LEGADO`): 19 inequívocos (PCR-us → LAB-016 + variante; Mg eritrocitário → LAB-021 + variante), 1 `requires_manual_mapping` (Insulina de jejum, `exam_code` nulo), 4 fora dos 45 (Candida IgG, VHS, HOMA-IR, Cortisol) → `additional_legacy`. |
| `sincronizacao.js` — `salvarColetaPorId` (upsert direto em `lab_collections`/`lab_results`), `atualizarColetas`, `coletas()`, `decidirExames`, `ultimaRegistrada` (por `updated_at`) | ponte servidor↔painel legado | ATIVO-LEGADO | lê as colunas novas (`COLS_COLETA`/`COLS_RESULT`); marca o que grava como `source: legacy_panel, state: salvo`; `ultimaRegistrada` e `coletasLegado` só olham coletas do painel legado. `coletas()` continua alimentando timeline/Evolução/relatórios/HOLOS AI com **todas** as coletas. |
| `holos-ai.js` — `dadosExames()` | contexto factual de exames (valor, unidade, data); já excluía o ideal (Etapa 0) e a Leitura Integrada | ATIVO | resultados V1: valor original, unidade, variante, material, referência do laudo, revisão; rascunho e versão substituída fora. Sem classificação, convergente/divergente, ideal. |
| `timeline.js` — evento "Coleta de exames" (`coletado_em`, `created_at`) | ATIVO | rascunho fora; revisão vira "Revisão da coleta (versão N)"; versão substituída marcada. |
| `evolucao.js` — `compararExames`: delta só mesmo `exame_id` e mesma unidade | ATIVO | resultado V1: identidade `exame + variante + material`; compatibilidade e delta pelo `LabMotor` (unidade igual ou conversão aprovada — nenhuma; valor numérico); referências diferentes visíveis; "aumentou/reduziu/permaneceu". |
| `relatorios.js` — `montarPrevia` (exames: `exame_id/nome/valor/unidade`) | ATIVO | snapshot V1 com valor original e referência do laudo; sem classificação. |
| `excluir-paciente.js` | exclusão completa do paciente (tabelas por paciente) | ATIVO | as novas tabelas descem pelas FKs existentes (`lab_results` cascade, componentes cascade); `integrated_readings` e `lab_collections` consolidadas: `on delete restrict` — a exclusão de paciente com leitura salva fica para decisão (como atendimentos). |
| `armazenamento.js` — chave `holohacking.exames` (valores locais do painel legado) | ATIVO-LEGADO | intocada; o painel V1 não usa localStorage (rascunho vive no servidor, `state = rascunho`). |
| `caso-marina.js`, `panorama.js` (regra "exame.EXA-005 >= 100") | demo e cruzamento legado | LEGADO | intocados; fora da saída oficial desde a Etapa 0. |

## 3. Testes

| Suíte | Fixava | Decisão |
|---|---|---|
| `testar-exames.mjs` | motor legado (`lerExames`, confirma/diverge) em isolamento | mantida: prova o legado como legado |
| `testar-rodada08-exames.mjs`, `testar-release01-*`, `testar-recuperacao-pendente.mjs`, `testar-v1-etapa0/1.mjs` | fluxo do painel legado (`#ex-corpo`) | mantidas sem alteração (o painel legado continua operando sobre as próprias coletas) |
| `testar-ficha-holoscan.mjs`, `testar-holoscan.mjs`, `testar-arquivos.mjs` | **confronto legado como saída oficial** (Convergente/Divergente por "um exame fora", `faixa cadastrada` em `#holo-confronto`) | **atualizadas**: as superfícies oficiais mostram a Leitura Integrada V1 (sem dados suficientes); o legado só em `?homologacao=1`. Mudança legítima de contrato (Mestre §24), documentada em `ETAPA5-LABORATORIO.md`. |
| `testar-storage-manifest.mjs` | contagem de scripts do index | 47 → 51 (4 scripts da Etapa 5) |

## 4. Vínculos exame → sistema HOLOSCAN e cálculos de Leitura Integrada existentes

- `exames.csv.sistema` e `lab_results.sistema_no_momento`: vínculo exame → sistema HOLOSCAN. **Não é regra oficial**: preservado como `legacy_sistema`; nenhum domínio da Leitura Integrada é criado a partir dele.
- `confrontar()`: único cálculo de Leitura Integrada existente ("um exame fora" × `nota ≤ 3`). **Bloqueado como saída oficial**; não existe regra homologada que o substitua: o pacote LI-V1 nasce sem domínios, vínculos, suficiência, janela ou regra de resultados mistos.
- `ideal_min/ideal_max` (CSV e `lab_results`): única "referência" existente, sem fonte homologada. **Removida da saída oficial**; preservada em `legacy_ideal_*`; não alimenta motor, Leitura Integrada, HOLOS AI nem relatório.
