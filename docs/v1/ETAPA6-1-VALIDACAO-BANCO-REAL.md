# HOLOHACKING V1 — ETAPA 6.1 — GATE DO BANCO REAL (BEGIN / ROLLBACK, SEM PERSISTÊNCIA)

Branch `claude/v1-etapa6-1-validacao-banco-real` (sobre `8e994f2`, Etapa 6.0.1). Data: 2026-10-02/03.

> **Resultado em uma linha:** FASE A (somente leitura) concluída no Supabase real; FASE B (dry-run mutável da cadeia inteira) **não pôde ser concluída no banco real** por limitação do conector SQL disponível ao agente — foi concluída integralmente num PostgreSQL local descartável (50 checagens, 0 falhas) e entregue como script reproduzível para execução humana com credencial segura. **Gate 6.1: NÃO APROVADO (pendente de execução do dry-run no real).** Zero alterações persistidas no banco real.

## 1. Alvo (FASE A, somente leitura)

| Item | Valor |
|---|---|
| Projeto Supabase | `sllhyymeeyoozokgbnuv` ("Holohacking", sa-east-1, ACTIVE_HEALTHY) — idêntico ao `PROJECT_URL` de `supabase-client.js`. Outros projetos da organização (inativos) não foram tocados. |
| Credencial | conector Supabase já configurado no ambiente do agente (MCP). Nenhum segredo lido, impresso ou pedido. |
| PostgreSQL | 17.6 (x86_64). Local de referência: 16. |
| Role de conexão | `postgres` (não superuser; `rolbypassrls = true`; `statement_timeout` padrão 2min) |
| Database / schema | `postgres` / `public` |
| Mecanismo de histórico | `supabase_migrations.schema_migrations` (version, statements, name, created_by, idempotency_key, rollback) |
| Última migration aplicada | `20260929192605` (`fix_rpc_record_value`) — 16 registros |
| Migrations pendentes (repo) | 14: `20260930130000` … `20261002130000` (406 KB), na ordem dos timestamps |
| Estado estrutural | 14 tabelas (todas com RLS), 7 funções, 49 policies, 12 triggers, 45 índices, 64 constraints, 0 views, 0 enums |
| Objetos das Etapas 0–6 | nenhum existe (`methodology_*`, `integrated_*`, `encounters`, `lab_exam_catalog`…): coerente com a última migration; **nenhum drift** detectado nas colunas das 14 tabelas |
| `holoscan_applications` | 4 aplicações (versao_estrutura 2); coluna `methodology_package_id` **não existe** ainda → 0 com proveniência / 4 sem; nenhum UPDATE |
| `methodology_approvers` | tabela não existe (nasce na 20261002110000) → 0 aprovadores, 0 aprovações |
| `lab_results.reference_status` | não existe ainda (nasce na 20261001220000/20261002130000) |
| Contagens (fingerprint) | patients 5, profiles 3, consultations 7, holoscan_answers 282, holoscan_system_scores 20, lab_collections 3, lab_results 22, tool_applications 12, documents 2, auth.users 3 |
| Sessões `idle in transaction` | 0 antes e 0 depois |

## 2. Transaction safety e locks (análise local das 14 pendentes)

- Nenhuma ocorrência de `CREATE INDEX CONCURRENTLY`, `VACUUM`, `ALTER SYSTEM`, `COMMIT/ROLLBACK/BEGIN` de topo, `SAVEPOINT`, `dblink`/`pg_net`/`http`, `NOTIFY`, `CREATE EXTENSION`, `COPY`, `REINDEX`, `CLUSTER`, `pg_sleep`, `DISABLE TRIGGER`. Único `set_config` é transacional (`is_local = true`) dentro de RPCs.
- `ALTER TABLE` em tabelas existentes: lab_results 23, lab_collections 9, holoscan_applications 6, consultations 3, tool_applications 2, holoscan_system_scores 2 — tabelas com ≤ 282 linhas; locks curtos. Proteções usadas na transação: `lock_timeout 3s`, `statement_timeout 60–110s`, `idle_in_transaction_session_timeout 30s`.
- Bloqueadores de transação: nenhum.

## 3. FASE B — dry-run mutável

### 3.1 Tentativas no banco real (conector MCP)
- O conector executa cada chamada numa sessão independente (pool): a transação `BEGIN … ROLLBACK` precisa caber numa única requisição. Provado com uma requisição pequena (`begin; set local …; create temp table; select; rollback;` → resultado devolvido, nada persistido).
- Requisição com as 4 primeiras migrations pendentes (≈25 KB, DDL) + checagens + `rollback`: **timeout do conector (60 s)**. Fingerprint pós-tentativa idêntico ao pré (14/7/49/12/64, histórico 16, `encounters` ausente, `nota` ainda NOT NULL, 0 sessões em transação): **nada persistiu**. Mesma limitação registrada na Etapa 4 ("requisições grandes expiram antes de chegar ao Postgres").
- A cadeia inteira (406 KB; 325 KB sem comentários) não cabe numa requisição do conector; a alternativa de empacotar/comprimir o SQL para caber foi **interrompida por política do ambiente** e não foi retomada.

### 3.2 Dry-run completo — PostgreSQL 16 local descartável (mesmo conteúdo que iria ao real)
`scripts/validar-cadeia-real-dry-run.sh` (novo): `BEGIN; set local lock_timeout/statement_timeout/idle_in_transaction_session_timeout; 14 migrations na ordem; supabase/tests/etapa6-1-checks-real.sql; ROLLBACK;` via `psql -v ON_ERROR_STOP=1`. Executado sobre o banco local `base` (stub de auth/storage + migrations anteriores a 130000): **50 checagens, 0 falhas**; após o ROLLBACK, 14 tabelas (estado inicial), 0 usuários sintéticos.

Checagens (todas ok localmente):
- A: tabelas/funções/RPCs esperadas existem (44 tabelas, 62 funções; 129 policies; 89 triggers); RLS ativo em todas as tabelas `public`; `anon` sem EXECUTE nas RPCs mutáveis.
- B: LI-V1@2 `em_revisao`; **`li_hash_conteudo` = `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9`**; completude publicável (0 bloqueios); LI-V1@1 rascunho.
- C: 7 domínios; 45 exames base; 42 com domínio; 3 sem; 47 pares; 5 multidomínio; directional 9 / contextual 38; D01=7 D02=3 D03=5 D04=4 D05=4 D06=12 D07=12.
- D: LI-TEMP-01 v1, `max_days 30`, inclusivo, simétrico; mixed v2 em D01–D04 com `directional_result_indeterminate` ≠ `mixed_results_indeterminate`; reason_semantics com ambos e `ambiguous_reference`; holoscan_direction exige HOLOS-V1 ≥ 2 aprovado / `incompatible_holoscan_version`.
- E/G: colunas, constraint e trigger de proveniência; aplicação nova (sintética) recebe `methodology_package_id/version`; versão incoerente recusada; UPDATE de backfill recusado; aplicação sem proveniência continua nula; **nenhum backfill**.
- H: referência ambígua persistida com texto/limites originais; flag ambígua sem referência não fabrica status (fica `missing`); escrita direta inválida recusada.
- I: aprovação 1 (uid A) ok; mesmo uid na aprovação 2 recusado; uid sem papel recusado; hash divergente recusado; mudança de conteúdo invalida aprovações e muda o hash; conteúdo restaurado volta ao hash esperado; dupla aprovação (2 uids) ativa; homologação explícita; conteúdo homologado imutável.
- J: leitura salva com snapshot preservando `ambiguous_reference` e referência original; convergente aceita só com pacote homologado; estado incoerente recusado; D05 sem confronto recusado.
- K: usuário comum não vê pacientes/leituras de outros; não grava nem lê `methodology_approvers`; não altera pacote LI.

Dados sintéticos: 3 `auth.users` fictícios, 2 aprovadores fictícios (`TEST_FIXTURE_E61`), 1 paciente "E61 SINTETICO", 1 pacote HOLOS-V1@2 rascunho, 2 aplicações, 2 coletas, 2 leituras — tudo dentro da transação; nenhum uid real.

## 4. Prova de rollback / estado pré = pós (banco real)
Fingerprints iguais antes e depois de todas as chamadas: histórico 16 (última `20260929192605`); 14 tabelas / 7 funções / 49 policies / 12 triggers / 64 constraints; `encounters` inexistente; `holoscan_system_scores_sem_dado_coerente` inexistente; `nota` NOT NULL; contagens (patients 5, apps 4, scores 20, lab_results 22, auth.users 3) iguais; 0 aprovadores; 0 aprovações; 0 aplicações com proveniência; 0 sessões em transação.

## 5. Não feito nesta etapa
COMMIT; `db push`; apply_migration; INSERT/UPDATE/DELETE persistente; backfill; cadastro de aprovadores reais; aprovação; homologação; deploy; DNS; VPS. Nenhuma credencial exposta ou pedida.

## 6. Bloqueador e próximo passo
- **Bloqueador:** o único canal ao banco real disponível ao agente (conector SQL do Supabase) não transporta uma transação do tamanho da cadeia pendente (timeout em ≈25 KB de DDL). Sem conexão direta (`psql`) com credencial em ambiente seguro, o dry-run real não pode ser executado pelo agente.
- **Próximo passo (humano, ambiente seguro, sem colar segredo em chat):** `PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD` via ambiente → `sh scripts/validar-cadeia-real-dry-run.sh` → esperado: JSON com 50 `ok: true`, nenhuma persistência (`ROLLBACK` sempre; `ON_ERROR_STOP`). Só depois: Etapa 6.2 (aplicar migrations), cadastro dos `auth.uid` reais, aprovações, homologação, deploy.

---

## 7. Correção de compatibilidade com dados reais (primeiro bloqueador real) — 2026-10-03

O dry-run manual (SQL Editor, `BLOCO1-V2`) chegou ao banco real e falhou em `20261001220000_etapa5_laboratorio.sql` com **SQLSTATE 23514**: `check constraint "lab_results_identidade" of relation "lab_results" is violated by some row`. Nada persistiu (transação única com ROLLBACK/abort).

**Causa raiz:** a migration adicionava `lab_results_identidade` (exam_code ou custom_exam_id ou origin legado ou requires_manual_mapping) *antes* de criar `lab_mapear_legado()`, o trigger `lab_results_preencher_legado` e o UPDATE determinístico que dá identidade às linhas legadas. As linhas reais já existentes (exame_id + valor) nascem com `exam_code = null`, `custom_exam_id = null`, `origin = 'manual'` (default) e `requires_manual_mapping = false`, violando a regra no instante do ADD CONSTRAINT. Localmente não aparecia porque o banco local não tinha `lab_results` legados.

**Correção (só compatibilidade de migration; regra final idêntica):**
1. `lab_results_identidade` passa a ser criada `NOT VALID` (mesma expressão).
2. Função de mapeamento, trigger e UPDATE determinístico seguem como estavam.
3. Logo após o UPDATE: `ALTER TABLE public.lab_results VALIDATE CONSTRAINT lab_results_identidade;` + bloco `DO` que falha a migration se restar alguma linha sem identidade.
4. **Segundo risco encontrado na auditoria:** os dois UPDATEs de normalização da mesma migration (lab_collections → `legacy_panel/salvo`; lab_results → preenchimento legado) disparam os triggers `*_paciente_arquivado` (migration 150000). Um paciente **arquivado** com coletas/resultados legados faria a migration falhar. O trigger específico é suspenso **só em volta de cada UPDATE** e religado em seguida, na mesma transação; a regra clínica continua valendo depois (teste L12).
5. Nenhum mapeamento inventado; nenhum dado alterado fora do que a migration já fazia; nenhum backfill fora da migration.

**Auditoria das 14 migrations (ADD CONSTRAINT / SET NOT NULL / UNIQUE em tabelas já populadas antes da normalização):** único caso real era `lab_results_identidade`. Demais constraints em tabelas populadas são satisfeitas por linhas legadas (defaults `missing`/`laudo`/`manual`/`salvo`/`legacy_panel`, colunas novas nulas, regras `faixa_coerente`/`sistema_valido` iguais às originais, `130000` já NOT VALID, `6.0.1` `reference_status` inclui `missing`). `value_original_text SET NOT NULL` vem depois do preenchimento e cobre toda linha com `exame_id` (NOT NULL original).

**Regressão com dados legados representativos (local):** `supabase/tests/legado-seed-pre-etapa5.sql` (entra antes das migrations no `validar-cadeia-local.sh`): 1 profissional sintético, 2 pacientes (1 arquivado), 1 consulta, 1 aplicação HOLOSCAN com score legado (nota 10 / avaliável=false), 3 coletas, **7 resultados legados** (EXA-002 mapeável com variante, EXA-009 mapeável, EXA-006 manual, EXA-001 additional_legacy, EXA-099 sem mapeamento provado, repetição em outra coleta, resultado de paciente arquivado), 1 ferramenta, 1 documento. `supabase/tests/legado-harness.sql`: L01–L12 ok (identidade satisfeita e validada; mapeamentos esperados; arquivado migrou; triggers religados; score legado preservado; bloqueio clínico continua). Cadeia completa local: **215 ok + 12 L-checks ok, 0 FALHOU**.

**V3:** `supabase/ETAPA6-1-DRY-RUN-BLOCO1-V3.sql` (435.007 bytes, 5.204 linhas) — BEGIN, timeouts, 14 migrations (com a correção), checagens 6.1, ROLLBACK; 0 COMMIT. Testada integralmente num banco local **com os dados legados commitados** (`base_legado`): como script (50/50) e como uma única mensagem Query (500 statements, 0 erros, 50/50); estado inicial restaurado (14 tabelas, 7 lab_results, colunas novas ausentes). `content_hash` LI-V1@2 continua `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9` (conteúdo metodológico intocado). SHA-256 da V3: `1a50e219ee63dbcf7b03db3455f8fb3f9a878c3f36ff7c1f410f00321dca4aef`.
