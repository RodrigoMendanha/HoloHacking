# HOLOHACKING V1 — ETAPA 6.1 — GATE DO BANCO REAL (BEGIN / ROLLBACK, SEM PERSISTÊNCIA)

Branch `claude/v1-etapa6-1-validacao-banco-real` (sobre `8e994f2`, Etapa 6.0.1); retomada em `claude/determined-volta-gey45f` (sobre `4713603`). Data: 2026-10-02/03.

> **Retomada 2026-10-03 (§7):** credenciais `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD` presentes no ambiente e `psql` 16 instalado, mas a política de rede do contêiner não abre a porta TCP do PostgreSQL (só HTTPS via proxy); o dry-run **não foi executado** no real. Nenhuma conexão psql chegou ao banco; fingerprint persistente idêntico ao de 2026-10-02. **Gate 6.1 continua NÃO APROVADO.**

> **Resultado em uma linha (2026-10-02):** FASE A (somente leitura) concluída no Supabase real; FASE B (dry-run mutável da cadeia inteira) **não pôde ser concluída no banco real** por limitação do conector SQL disponível ao agente — foi concluída integralmente num PostgreSQL local descartável (50 checagens, 0 falhas) e entregue como script reproduzível para execução humana com credencial segura. **Gate 6.1: NÃO APROVADO (pendente de execução do dry-run no real).** Zero alterações persistidas no banco real.

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

## 7. Retomada 2026-10-03 — tentativa de executar `scripts/validar-cadeia-real-dry-run.sh` no banco real

| Item | Resultado |
|---|---|
| Variáveis `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | as 5 **presentes** no ambiente (só a presença foi testada; nenhum valor foi lido para resposta, impresso ou gravado) |
| `psql` | disponível (PostgreSQL client 16.14) |
| DNS do host do banco | resolve (2 endereços) |
| TCP para a porta do banco | **timeout** a partir do contêiner: a política de rede do ambiente só libera saída HTTPS pelo proxy; a porta do PostgreSQL não é alcançável |
| Túnel pela porta do proxy | o proxy responde ao `CONNECT`, mas montar um túnel TCP local para o `psql` foi **negado pela política de contenção do ambiente** e **não foi contornado** |
| `sh scripts/validar-cadeia-real-dry-run.sh` | **não executado**: a conexão nunca se estabeleceu, logo nenhuma transação foi aberta no real (nada a reverter; o script, se rodasse, só faria `BEGIN … ROLLBACK` com `ON_ERROR_STOP`) |
| Checagens | 0 executadas no real (50 esperadas; 50/50 ok somente no PostgreSQL local, §3.2) |
| Hash LI-V1@2 no banco real | **não obtido** (esperado `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9`) |
| Migrations persistidas | 0 (histórico 16, última `20260929192605`, igual a 2026-10-02) |
| Dados sintéticos restantes | 0 usuários `e61-*@teste.invalid`, 0 pacientes `E61 SINTETICO`; tabelas `methodology_approvers`, `integrated_reading_package_approvals`, `integrated_readings` ausentes |
| Estado antes = estado depois | **SIM**: `supabase/ETAPA6-1-VERIFICACAO-POS-ROLLBACK.sql` (somente leitura, via conector) devolveu 16 / `20260929192605` / 14 tabelas / 7 funções / 49 policies / 12 triggers / 64 constraints / 0 tabelas novas / `encounters` ausente / 0 colunas de proveniência / 0 `reference_status` / `nota` NOT NULL / constraint de scores ausente / contagens patients 5, apps 4, scores 20, lab_collections 3, lab_results 22, auth.users 3 / 0 sessões em transação — idêntico ao §1 e §4 |
| COMMIT / `db push` / migration persistente / backfill / approver real / aprovação / homologação / deploy | nenhum |
| **Gate 6.1 aprovado** | **NÃO** (dry-run no real ainda pendente) |

**Desbloqueio (humano):** ou (a) liberar, nas configurações de rede do ambiente de nuvem, o host e a porta do PostgreSQL do projeto e repetir `sh scripts/validar-cadeia-real-dry-run.sh` nesta mesma sessão; ou (b) executar o script numa máquina com acesso direto ao banco e credencial em ambiente seguro, colando aqui **apenas** o JSON de saída (`k`, `ok`, `d`) e o JSON de `supabase/ETAPA6-1-VERIFICACAO-POS-ROLLBACK.sql`. Só então o gate 6.1 pode ser avaliado. **Etapa 6.2 não iniciada.**
