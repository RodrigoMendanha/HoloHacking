# HOLOHACKING V1 — ETAPA 6.2 — ARTEFATO DE APLICAÇÃO REAL (PRONTO; NÃO EXECUTADO NO BANCO REAL)

Branch `claude/v1-etapa6-1-validacao-banco-real`. Base: gate 6.1 APROVADO (dry-run V3 no projeto `sllhyymeeyoozokgbnuv`); plano `docs/v1/ETAPA6-2-PLANO-APLICACAO-REAL.md`. Data: 2026-10-03.

## 1. Artefato
| Arquivo | Tamanho | SHA-256 |
|---|---|---|
| `supabase/ETAPA6-2-APLICACAO-REAL.sql` (aplicação) | 831.127 bytes, 10.116 linhas | `2ebab82fd25fc2b26eeae0b5029ac218a8d7b763fb526fa8faf0c1c2425be4a7` |
| `supabase/ETAPA6-2-PREFLIGHT.sql` (somente leitura) | 3.735 bytes | `2d89dfc0a685f8e2868528fd0c7e5b8e491beedb353fd1e8ef7cfb111e4f749a` |
| `supabase/ETAPA6-2-POSTFLIGHT.sql` (somente leitura) | 5.052 bytes | `3af3f7291210ab609002919f446a92ec47be6b97725c74a873656f11c1803dd0` |

Gerado por `scripts/gerar-aplicacao-real.py` a partir dos arquivos de `supabase/migrations` em HEAD (reproduzível; regenerar muda o SHA só se as migrations mudarem). Estrutura, nesta ordem, numa única transação:
1. `BEGIN;` (exatamente um) + `lock_timeout 5s`, `statement_timeout 110s`, `idle_in_transaction_session_timeout 60s`.
2. **Guarda PRE-FLIGHT** (`DO $guarda$`): compara o fingerprint com o aprovado no gate 6.1 — hist_n 16, hist_ultima 20260929192605, 14 tabelas / 7 funções / 49 policies / 12 triggers / 64 constraints, patients 5, holoscan_applications 4, holoscan_system_scores 20, lab_collections 3, lab_results 22, auth_users 3, 0 tabelas novas, 0 versões novas já registradas. Qualquer diferença → `RAISE EXCEPTION` (hint `etapa6_2_guarda`) antes da primeira migration.
3. **14 migrations** na ordem `20260930130000` … `20261002130000`, texto dos arquivos do repo (única transformação: delimitador `$function$` → `$$` em 4 funções, igual à V3 aprovada); inclui a `20261001220000` corrigida (`lab_results_identidade` NOT VALID → preenchimento → VALIDATE; triggers de arquivado suspensos só na normalização).
4. **14 INSERTs** em `supabase_migrations.schema_migrations` (ver §2).
5. **Verificação pós-aplicação** (`DO $pos$`): exige hist_n 30, hist_ultima 20261002130000, 14 versões novas, 44/62/129/89/317, catálogo 45, `LI-V1@1:rascunho,LI-V1@2:em_revisao`, `li_hash_v2 = fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9`, approvers 0, aprovações LI 0, aprovações metodológicas 0, leituras 0, methodology_packages 0, encounters 0, apps 4 com 0 proveniência, dados 5/20/3/22/3 inalterados, 0 violações de identidade e constraint validada, 22 legados preenchidos, `nota` nullable, triggers de arquivado `O,O`. Qualquer diferença → `RAISE EXCEPTION` (hint `etapa6_2_pos`) → nada persiste.
6. `COMMIT;` — exatamente um, última instrução efetiva. Nenhum `ROLLBACK` no caminho de sucesso (toda falha aborta a transação por si).

Não contém: aprovadores, aprovações, homologação, deploy, backfill de proveniência HOLOSCAN, dados sintéticos, UPDATE/DELETE em `schema_migrations`.

## 2. Histórico de migrations — formato real auditado (somente leitura, 2026-10-03)
`supabase_migrations.schema_migrations`: `version text NOT NULL` (PK), `statements text[]` (nullable), `name text`, `created_by text`, `idempotency_key text` (UNIQUE), `rollback text[]` — todos nullable e sem default; sem triggers; sem RLS; owner `postgres` (INSERT permitido). As 16 linhas existentes: `statements` com exatamente 1 elemento, `idempotency_key` e `rollback` nulos, `created_by` = 1 valor distinto (e-mail da conta do dashboard).
Os 14 INSERTs novos usam só `version`, `name`, `statements`: `version` = timestamp do arquivo (alinha repo e histórico daqui em diante), `name` = sufixo do arquivo, `statements = array[<conteúdo integral do arquivo do repo>]` (provado byte a byte: 14/14 iguais ao arquivo), `idempotency_key`/`rollback` nulos como nas linhas antigas.
**`created_by`: NÃO reproduzido — fica NULL.** O e-mail das 16 linhas antigas é gravado pelo mecanismo do Dashboard/MCP a partir da sessão autenticada; o SQL Editor executa como role `postgres` sem essa identidade, e escrever um e-mail à mão seria falsificar metadado. Alternativa segura, se a liderança quiser o campo preenchido: depois do COMMIT, um UPDATE explícito e assinado só nas 14 linhas novas (`where version >= '20260930130000'`) com a identidade real de quem executou — decisão humana, fora deste artefato. As 16 linhas antigas não são tocadas.

## 3. Prova local (PostgreSQL 16 descartável) — `scripts/testar-aplicacao-real-local.sh`
Template `base_fp` = banco `base` (stub + migrations até 20260929192605) + `supabase/tests/fingerprint-real-seed.sql`, que reproduz o fingerprint real: 16 versões/nomes reais no histórico, 14/7/49/12/64, auth_users 3, patients 5 (1 arquivado), 4 aplicações HOLOSCAN com 20 scores (um com o artefato legado nota 10 / avaliável=false), 3 coletas, **22 resultados legados** (mapeáveis, EXA-006 manual, additional_legacy ×3, sem mapeamento provado, resultado de paciente arquivado). PRE-FLIGHT externo no template: `pode_aplicar = true`.

| Teste | Resultado |
|---|---|
| T1 aplicação integral do arquivo exato (`psql -f`) | exit 0; guarda ok; verificação pós ok; último comando `COMMIT`; depois 30/44/62/129/89/317, dados 5/4/20/3/22/3 |
| T1 POST-FLIGHT externo | hist 30 / última 20261002130000 / 14 versões novas; 44/62/129/89/317; identidade 0 violações e validada; 22 legados preenchidos (2 com mapeamento manual); catálogo 45; `LI-V1@1:rascunho,LI-V1@2:em_revisao`; hash `fa99ec80…`; approvers 0; aprovações 0; leituras 0; met_pacotes 0; encounters 0; apps 4 / proveniência 0; `nota` YES; triggers `O,O`; contagens inalteradas; 0 sessões em transação |
| T2 segunda execução | recusada pela guarda (`hist_n=30 (esperado 16); n_funcoes=62 (esperado 7)`), estado inalterado |
| T3 fingerprint divergente (lab_results = 21) | abortado na guarda antes da 1ª migration; estado 16/14/7/49/12/64 intacto |
| T4 falha injetada após a 7ª migration (`select 1/0`) | abort; histórico 16, 0 objetos novos, dados intactos |
| T5 falha no INSERT do histórico (versão duplicada) | abort por PK; toda a aplicação desfeita (16/14/7/49/12/64) |
| T6 verificação pós-aplicação falhando (esperado 45 tabelas) | abort (`n_tabelas=44 (esperado 45)`); nada persiste |
| T7 arquivo inteiro como UMA mensagem Query do protocolo simples (caminho do SQL Editor) | 831.127 bytes, 508 statements, 0 erros, `BEGIN`…`COMMIT`, guarda ok, pós ok; `created_by` das 14 novas = NULL; `statements[1]` idêntico ao arquivo do repo 14/14 |

## 4. Como executar manualmente (quando autorizado)
1. **Recuperação disponível antes de começar:** verificar no Dashboard do projeto (Database → Backups) qual medida existe — backups diários do plano e/ou PITR; se nenhuma estiver habilitada, fazer um backup manual (`pg_dump` do schema `public` + `auth.users` via conexão segura, ou snapshot do painel) e registrar hora/local. Não há down-migration; esta é a única via de retorno depois do COMMIT.
2. Janela sem uso do app (locks de segundos; `lock_timeout 5s` aborta em vez de travar).
3. SQL Editor do projeto `sllhyymeeyoozokgbnuv`: rodar `ETAPA6-2-PREFLIGHT.sql`. Prosseguir **só** se `pode_aplicar = true`.
4. Baixar `ETAPA6-2-APLICACAO-REAL.sql`, conferir SHA-256, abrir em editor de texto, copiar tudo, colar numa aba nova, Ctrl+End deve mostrar `COMMIT;` na linha 10116, nada selecionado, executar. Esperado: sucesso sem erro (a guarda e a verificação emitem NOTICEs).
5. Rodar `ETAPA6-2-POSTFLIGHT.sql` e comparar com os valores esperados (cabeçalho do arquivo / §1 item 5). Guardar o JSON no relatório da etapa.

## 5. Se aparecer erro
- Erro na **guarda**: o banco não está no estado aprovado (algo mudou desde o gate 6.1). Nada foi aplicado. Não forçar: rodar PRE-FLIGHT, entender a diferença, re-aprovar o fingerprint (novo dry-run) e só então regenerar.
- Erro no **meio da cadeia** ou no **histórico**: nada persiste (T4/T5). Registrar statement/SQLSTATE, corrigir localmente (ciclo da 6.1: migration + regressão + dry-run V-next no real), regenerar com `scripts/gerar-aplicacao-real.py`, repetir PRE-FLIGHT e aplicar.
- Erro na **verificação pós-aplicação**: nada persiste (T6); investigar a divergência antes de qualquer nova tentativa.
- **Timeout do editor** sem resposta: rodar PRE-FLIGHT; se continuar 16/14/7/49/12/64 nada foi aplicado (a transação abortou); se mostrar 30/44, a aplicação concluiu — rodar POST-FLIGHT.

## 6. O que NÃO executar de novo automaticamente
- Nunca re-rodar o artefato "para garantir": a guarda recusa (T2), mas a decisão é humana.
- Nunca editar o artefato à mão (regenerar pelo script e recalcular SHA-256).
- Nunca executar `supabase db push` (histórico das 15 migrations antigas desalinhado).
- Não cadastrar aprovadores, aprovar, homologar ou fazer deploy nesta etapa.

---

## 7. EXECUÇÃO REAL — ETAPA 6.2 CONCLUÍDA (2026-10-03)

Executada manualmente por Daniel no SQL Editor do projeto `sllhyymeeyoozokgbnuv`, fora do agente, com o artefato `ETAPA6-2-APLICACAO-REAL.sql` (SHA-256 `2ebab82fd25fc2b26eeae0b5029ac218a8d7b763fb526fa8faf0c1c2425be4a7`).

1. **Recuperação disponível antes:** backup existente no Dashboard do projeto confirmado antes da aplicação.
2. **PRE-FLIGHT aprovado:** `pode_aplicar = true` (fingerprint 16 / 20260929192605 / 14 / 7 / 49 / 12 / 64; dados 5 / 4 / 20 / 3 / 22 / 3).
3. **Aplicação real commitada:** guarda ok → 14 migrations → 14 linhas de histórico → verificação pós ok → `COMMIT`.
4. **POST-FLIGHT aprovado** (fingerprint final real):

| Item | Valor real |
|---|---|
| hist_n / hist_ultima / versões novas | 30 / 20261002130000 / 14 |
| tabelas / funções / policies / triggers / constraints / índices | 44 / 62 / 129 / 89 / 317 / 139 |
| lab_results_identidade | 0 violações; constraint validada |
| lab_results legados preenchidos / com mapeamento manual | 22 / 3 |
| catálogo laboratorial | 45 |
| pacotes LI | LI-V1@1 rascunho; LI-V1@2 em_revisao |
| li_hash_v2 | `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9` (confirmado) |
| approvers / aprovações LI / aprovações metodológicas | 0 / 0 / 0 |
| leituras integradas / methodology_packages / encounters | 0 / 0 / 0 |
| aplicações HOLOSCAN / com proveniência | 4 / 0 |
| `holoscan_system_scores.nota` nullable | YES |
| triggers de paciente arquivado | `O,O` (habilitados) |
| patients / holoscan_applications / holoscan_system_scores / lab_collections / lab_results / auth_users | 5 / 4 / 20 / 3 / 22 / 3 |
| sessões em transação | 0 |

Observação: `lab_results_mapeamento_manual = 3` no real (local deu 2 com dados sintéticos): reflete os exames legados reais sem mapeamento provado / EXA-006; não é verificação da guarda pós e não altera nada — esses resultados ficam marcados para mapeamento humano, sem inferência.

5. **`created_by` NULL nas 14 linhas novas:** decisão humana consciente (não falsificar metadado; as 16 linhas antigas intocadas).
6. **Não realizado:** nenhum aprovador cadastrado, nenhuma aprovação, nenhuma homologação, nenhum deploy.
7. **Aplicações históricas** (4) permanecem sem proveniência metodológica (sem backfill; política `POLITICA-COMPATIBILIDADE-APLICACOES-HISTORICAS-HOLOSCAN-LI.md`).

**ETAPA 6.2 = CONCLUÍDA NO BANCO REAL.** Próximo gate: `docs/v1/ETAPA6-3-PLANO-GOVERNANCA-E-DEPLOY.md`.
