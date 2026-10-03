# HOLOHACKING V1 — ETAPA 6.2 — PLANO DE APLICAÇÃO REAL DAS 14 MIGRATIONS (PREPARAÇÃO; NADA APLICADO)

Base: gate 6.1 APROVADO (`docs/v1/ETAPA6-1-VALIDACAO-BANCO-REAL.md` §8): dry-run V3 no projeto `sllhyymeeyoozokgbnuv`, 50/50 checks, hash LI-V1@2 `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9`, pós-rollback = estado inicial. Este documento só prepara e audita; **nenhum SQL de aplicação é gerado ou executado aqui**.

## 1. Sequência exata (ordem dos timestamps; a mesma do dry-run aprovado)
1. `20260930130000_holoscan_ausencia_null` 2. `20260930140000_exames_identidade_coleta` 3. `20260930150000_paciente_arquivado_bloqueia_escrita` 4. `20260930160000_etapa1_atendimentos` 5. `20260930170000_etapa2_anamnese_conduta` 6. `20260930180000_etapa3_relatorios` 7. `20260930190000_etapa4_pacote_metodologico` 8. `20261001200000_etapa4_2_contrato_metodologico_v1` 9. `20261001210000_dupla_aprovacao_metodologica` 10. `20261001220000_etapa5_laboratorio` (versão corrigida, commit `6777b83`) 11. `20261002100000_governanca_leitura_integrada` 12. `20261002110000_aprovadores_metodologicos` 13. `20261002120000_etapa6_leitura_integrada_v1` 14. `20261002130000_etapa6_0_1_fechamento_pre_gate`.
Conteúdo: byte a byte os arquivos do repo em `HEAD` da branch `claude/v1-etapa6-1-validacao-banco-real` (os mesmos cuja concatenação formou a V3 aprovada; única diferença textual da V3 foi o delimitador `$function$` → `$$`).

## 2. Mecanismo real de histórico (inspecionado, somente leitura, 2026-10-03)
`supabase_migrations.schema_migrations(version text, statements text[], name text, created_by text, idempotency_key text, rollback text[])`. As 16 linhas existentes têm: `version` = timestamp **da execução** (não do arquivo), `name` = sufixo, `statements` = **1 elemento** com o SQL completo, `created_by` = e-mail da conta do dashboard, `idempotency_key` e `rollback` nulos. Ou seja: o projeto nunca aplicou migrations pela CLI; aplicou pelo mecanismo do dashboard/MCP (`apply_migration`), que grava exatamente esse formato.
**Consequência auditada:** 15 dos 16 arquivos já aplicados no repo têm timestamp **diferente** da versão registrada (ex.: repo `20260918181315` vs histórico `20260918181418`); só `20260929192605` coincide. Logo `supabase db push` enxergaria 15 migrations "pendentes" já aplicadas e tentaria reaplicá-las → **proibido** sem antes `supabase migration repair` do histórico (fora do escopo da 6.2).

## 3. Método recomendado e por quê
**Script único de aplicação pelo SQL Editor (mesmo canal e mesmo texto do dry-run aprovado), em UMA transação, com registro explícito do histórico no formato real.**
- Supabase CLI: descartada agora (histórico desalinhado; reaplicaria 15 migrations; CLI ausente no ambiente do agente).
- `psql` controlado: equivalente e preferível quando houver credencial em ambiente seguro (não há no Claude Cloud; o canal MCP expira com requisições grandes). O script será o mesmo; `scripts/validar-cadeia-real-dry-run.sh` é o molde.
- SQL Editor: foi o canal que **provou** a cadeia inteira no real (V3). O script de aplicação = **V3 sem o bloco de checagens sintéticas**, com (a) guarda de pré-condição dentro da transação, (b) as 14 migrations, (c) 14 `INSERT` em `schema_migrations` no formato observado, (d) auto-verificação pós-aplicação dentro da transação (`DO` que aborta se o fingerprint final divergir), (e) `COMMIT` explícito como última linha. Não é "remover o ROLLBACK": é um artefato novo, gerado pelo mesmo gerador, **provado localmente** antes (ver §8) com o histórico simulado no formato real.

## 4. Transação, erro, atomicidade, reexecução, locks, timeouts
- **Uma transação** para as 14 migrations + histórico: tudo ou nada. Erro em qualquer statement → abort → nada aplicado, nada registrado (foi assim que a V2 falhou sem deixar rastro).
- **Guarda inicial** (dentro da transação, antes da 1ª migration): `DO` que lê o fingerprint e levanta exceção se `hist_n <> 16`, `hist_ultima <> '20260929192605'`, 14/7/49/12/64 ou contagens de dados divergirem, ou se qualquer tabela nova já existir → impede dupla aplicação e aplicação sobre estado desconhecido.
- **Reexecução**: se abortar, corrigir a causa localmente (ciclo da 6.1), regenerar, re-rodar PRE-FLIGHT e aplicar de novo; a guarda garante que só roda sobre o estado 16/14/7/49/12/64. Depois do sucesso a guarda recusa (hist_n = 30).
- **Rollback/recovery**: antes do COMMIT, automático. Depois do COMMIT não há "down migration": a recuperação é restaurar backup/PITR do projeto (fazer **backup manual/snapshot no dashboard imediatamente antes**). Nenhuma migration apaga dado; colunas novas são aditivas; `salvar_holoscan_completo` e `salvar_coleta_exames` continuam compatíveis com o front atual (6.0.1 mantém os payloads antigos).
- **Locks**: `set local lock_timeout = '5s'` (ALTER TABLE em tabelas pequenas; se o app estiver em uso e segurar lock, aborta em 5 s em vez de travar produção); aplicar em janela sem uso do app. `set local statement_timeout = '110s'` (V3 inteira correu em segundos no real). `idle_in_transaction_session_timeout = '60s'`.
- **Dados legados**: cobertos (22 `lab_results`: identidade NOT VALID → preenchimento → VALIDATE; triggers de arquivado suspensos só na normalização; provado no real pela V3).
- **Triggers/RLS**: todas as tabelas novas com RLS (check A2 da V3 no real); anon sem EXECUTE nas RPCs mutáveis (A5); triggers de arquivado religados (L10 local).
- **Hash LI**: seed da 20261002120000 produz `fa99ec80…` (confirmado no real); auto-verificação pós-aplicação exige esse hash.
- **Sem backfill HOLOSCAN**: 4 aplicações seguem com `methodology_package_id` nulo (E2 no real: total 4, com 0); auto-verificação exige `apps_com_proveniencia = 0`.
- **`methodology_approvers` vazia**: nasce vazia (E4 no real); auto-verificação exige 0. Cadastro de Daniel/Rodrigo é a Etapa 6.3, pela RPC/gestão técnica, nunca pela migration.

## 5. PRE-FLIGHT (somente leitura) — `supabase/ETAPA6-2-PREFLIGHT.sql`
Executar imediatamente antes da aplicação. Devolve `pode_aplicar` = true só se: hist_n 16, hist_ultima 20260929192605, n_tabelas 14, n_funcoes 7, n_policies 49, n_triggers 12, n_constraints 64, patients 5, holoscan_applications 4, holoscan_system_scores 20, lab_collections 3, lab_results 22, auth_users 3, tabelas novas 0, 0 sessões em transação, 0 locks exclusivos pendentes em `public`. **Se false: parar.** A mesma condição será repetida como guarda dentro do script de aplicação.

## 6. POST-FLIGHT (somente leitura) — `supabase/ETAPA6-2-POSTFLIGHT.sql`
Esperado após o COMMIT: hist_n **30**, hist_ultima **20261002130000**, 14 versões novas registradas, n_tabelas **44**, n_funcoes **62**, n_policies **129**, n_triggers **89**, n_constraints **317**, n_indexes 139 (informativo; delta +94 sobre 45), identidade_violacoes 0 e constraint validada, lab_results 22 todos com `legacy_exame_id` e `value_original_text`, catálogo 45, pacotes LI `LI-V1@1:rascunho,LI-V1@2:em_revisao`, li_hash_v2 `fa99ec80…`, approvers 0, li_aprovacoes 0, met_aprovacoes 0, leituras 0, met_pacotes 0, encounters 0, apps 4 / com proveniência 0, `nota` nullable YES, triggers de arquivado `O,O`, contagens inalteradas (5/4/20/3/22/3), 0 sessões em transação. Os valores estruturais vêm do dry-run real (44 tabelas / 62 funções já observados na V3 — check A1) e dos deltas medidos localmente sobre o mesmo fingerprint inicial (+30 tabelas, +55 funções, +80 policies, +77 triggers, +253 constraints).

## 7. Registro do histórico (formato a reproduzir)
Para cada migration, dentro da mesma transação, após o seu SQL: `insert into supabase_migrations.schema_migrations (version, name, statements, created_by) values ('<timestamp do arquivo>', '<sufixo>', array[<SQL completo do arquivo>], '<identificação do executor>')`. `version` = timestamp **do arquivo** (alinha repo e histórico daqui em diante); `statements` com 1 elemento, como as 16 linhas existentes; `idempotency_key`/`rollback` nulos. Observação: as 15 linhas antigas desalinhadas ficam como estão (reparo de histórico para CLI é tarefa separada, documentada aqui como risco residual).

## 8. Antes de gerar o script definitivo (próxima resposta, com autorização)
1. Gerar `supabase/ETAPA6-2-APLICACAO-REAL.sql` pelo gerador da V3 (guarda + 14 migrations + 14 inserts de histórico + auto-verificação + COMMIT; zero ROLLBACK no caminho feliz).
2. Provar localmente em banco descartável com dados legados e `supabase_migrations.schema_migrations` simulada no formato real (16 linhas): aplicar, rodar POST-FLIGHT (valores de §6 ajustados aos dados locais), aplicar de novo → guarda recusa; e provar que uma falha injetada no meio não deixa nem objetos nem histórico.
3. Calcular SHA-256; publicar; Daniel executa: backup/snapshot → PRE-FLIGHT (true) → script → POST-FLIGHT → relatório.

## 9. Risco residual
- Histórico das 15 migrations antigas desalinhado com o repo (herança do método dashboard): não impede a 6.2, impede `supabase db push` até reparo.
- Janela de locks: segundos; mitigada por `lock_timeout` e janela sem uso.
- Sem down-migration: mitigação é backup/PITR antes do COMMIT.
- O front em produção continua o atual até a Etapa de deploy; as RPCs novas são aditivas e as antigas permanecem compatíveis.

Banco real alterado nesta preparação: **NÃO** (apenas 1 SELECT de inspeção do formato do histórico). Approvers: NÃO. Aprovação: NÃO. Homologação: NÃO. Deploy: NÃO.
