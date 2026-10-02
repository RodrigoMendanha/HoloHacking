# GOVERNANÇA E DUPLA APROVAÇÃO DA LEITURA INTEGRADA — V1

Etapa 5.2 · 02/10/2026 · migration `20261002100000_governanca_leitura_integrada.sql` (**NÃO aplicada**) · tela `?homologacao=1` → Metodologia → "Leitura Integrada — homologação metodológica" · servidor falso espelhado · harness `supabase/tests/etapa5-2-harness.sql` (G00–G39).

> **Fecha tecnicamente o bloco 30 do pacote de decisão humana** (`PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`): a Leitura Integrada reutiliza a **mesma governança humana** do Pacote Metodológico HOLOSCAN. **Nenhuma aprovação real foi registrada. Nada foi homologado. Os blocos clínicos 1–29 continuam abertos.** O pacote real `LI-V1@1` segue em `rascunho`, com 0 domínios, 0 vínculos, 0 regras.

## 1. Regra de aprovação

| Etapa | Responsável | Papel |
|---|---|---|
| Aprovação 1 | **Daniel** | responsável primário |
| Aprovação 2 | **Rodrigo** | revisão final |

- Ordem obrigatória Daniel → Rodrigo. Rodrigo não aprova sem uma Aprovação 1 **vigente** (não invalidada) do mesmo `package_id`, `version` e `content_hash`.
- Toda aprovação referencia exatamente `package_id` + `package_version` + `content_hash` (o hash que a pessoa conferiu na tela tem de ser o do conteúdo atual do servidor; a versão também).
- Responsável diferente, "Liderança do método HOLOSCAN", hash divergente, versão divergente, justificativa vazia, pacote fora de `em_revisao`: **recusados**.
- Só a RPC escreve na tabela de aprovações (sem GRANT de INSERT/UPDATE/DELETE para a aplicação); aprovação é **append-only**: nunca é apagada nem editada — só pode ser **invalidada uma vez**, com motivo.

## 2. O que entra no `content_hash`

`li_conteudo_canonico(package_id)` → JSON canônico (jsonb normaliza chaves; listas ordenadas por chaves de negócio) → `li_hash_conteudo` = SHA-256.

| Bloco | Conteúdo | Ordenação |
|---|---|---|
| `package` | `code`, `version` | — |
| `domains` | `code`, `name`, `holoscan_system`, `status` | `code` |
| `links` | `domain` (código), `exam_code`, `variant`, `material`, `direction`, `status`, `reference` (conteúdo da referência metodológica resolvida, sem id/datas) | domínio, exame, variante, material, direção |
| `rules` | `rule_type`, `target`, `payload` integral, `status` — **todas** as regras (temporal, suficiência, mistos, convergência/divergência, textos e qualquer tipo futuro: política de ausência, múltiplas coletas, qualitativos, censurados, parâmetros do motor) | `rule_type`, `target` |
| `dependencies` | `kind` (`reference` / `conversion` / `derived`), `status`, `content` (linha resolvida da referência, conversão ou cálculo derivado, incluindo sua versão) | `kind`, `ref_id` |

Fora do hash: `id`, `created_at`/`updated_at`, `notes`, aprovações, snapshots, ordem acidental de consulta. Mesmo conteúdo ⇒ mesmo hash; mudança relevante ⇒ hash diferente (provado: domínio, vínculo, regra, referência, conversão, derivado, version).

**Referências / conversões / derivados.** Uma linha dessas tabelas com `status = aprovado` **não** é elegível por si: só é usada por um pacote oficial se estiver em `integrated_reading_package_dependencies` (ou em `links.reference_id`) daquele pacote — e, portanto, dentro do hash e do snapshot homologado. Mudança posterior na entidade **não** altera o pacote aprovado (snapshot congelado) e **invalida** as aprovações de qualquer pacote em revisão que a referencie. Uso novo exige nova versão do pacote e nova homologação.

## 3. Invalidação

`li_invalidar_trigger` (AFTER) em: pacote (`code`/`version`), domínios, vínculos, regras, dependências (INSERT/UPDATE/DELETE) e nas entidades referenciadas (`lab_method_references`, `lab_unit_conversion_rules`, `lab_derived_calculations`, UPDATE/DELETE → todos os pacotes que as referenciam). `registrar_aprovacao_li` também invalida aprovações vigentes de outra versão/hash antes de registrar. Invalidação grava `invalidated_at` + `invalidated_reason` e preserva a linha. **Voltar o conteúdo ao hash antigo não reativa** aprovação invalidada: o ciclo recomeça por Daniel.

## 4. Completude (barreira) — `li_validar_completude`

Bloqueios detectados: `sem_dominio_aprovado`, `dominio_sem_vinculo_aprovado:<código>`, `dominio_sem_regra_convergencia:<código>`, `sem_regra_temporal`, `sem_regra_suficiencia`, `sem_regra_resultados_mistos`, `sem_regra_convergencia_divergencia`, `sem_texto_oficial_dos_tres_estados`, `elementos_nao_aprovados:<n>`, `vinculo_com_referencia_nao_aprovada:<n>`, `dependencia_nao_aprovada_ou_inexistente:<n>`. O validador **não cria** conteúdo; LI-V1@1 hoje tem 6 bloqueios. Registrar aprovação **não** exige completude (a resposta traz os bloqueios); **homologar exige**.

## 5. Ação final explícita — `homologar_pacote_li(package_id, version, content_hash, responsável)`

As duas aprovações **não** homologam. A homologação verifica de novo: pacote `em_revisao`; responsável = Daniel ou Rodrigo (nunca "Liderança"); versão e hash atuais; completude sem bloqueio; Aprovação 1 e 2 vigentes sobre o mesmo `package_id`/`version`/`content_hash`, 2 depois de 1. Então: grava **snapshot imutável** (`integrated_reading_package_snapshots`: conteúdo canônico, hash, ids das aprovações, quem/quando), e `status → aprovado` com `content_hash`, `responsible` ("Daniel (Aprovação 1 — responsável primário) / Rodrigo (Aprovação 2 — revisão final)") e `approval_provenance`.

Estados do pacote: `rascunho` → `em_revisao` (gestão técnica versionada, por migration) → `aprovado` (só pela RPC; trigger recusa UPDATE direto, inclusive de superusuário) → `retirado` (único UPDATE permitido em aprovado). Pacote aprovado/retirado e suas filhas são **imutáveis**: mudança = nova versão.

## 6. Arquitetura: por que estruturas próprias (opção B)

Auditadas `methodology_package_approvals`, `metodologia_hash_conteudo`, `registrar_aprovacao_metodologica`, `aprovar_pacote_metodologico` e os triggers `metodologia_invalidar_aprovacoes` (migration 210000). A tabela de aprovações do HOLOSCAN tem FK composta `(package_id, nutritionist_id)` para `methodology_packages` (pacote **do profissional**); o pacote da Leitura Integrada é **global** (sem `nutritionist_id`), e seu hash cobre entidades que o HOLOSCAN não tem. Generalizar exigiria alterar a tabela e as funções já aprovadas do HOLOSCAN (`package_type`, FK polimórfica) — risco de regressão num contrato fechado. Escolha: **espelhar o contrato** em tabelas/funções próprias (`integrated_reading_package_approvals`, `li_*`, `registrar_aprovacao_li`, `homologar_pacote_li`), com as mesmas regras, mensagens e CHECKs. O HOLOSCAN não foi tocado (`testar-v1-dupla-aprovacao.mjs` e `dupla-aprovacao-harness.sql` inalterados e verdes).

## 7. Segurança

Tabelas globais com RLS `select` para `authenticated` e **nenhum** GRANT de escrita; RPCs `SECURITY DEFINER` com `set search_path = ''`, `EXECUTE` só para `authenticated`; funções de trigger sem `EXECUTE` para roles de aplicação; nenhum admin genérico; `approved_by`/`homologated_by` = `auth.uid()` de quem clicou; o nome do responsável é o ato humano declarado (como no HOLOSCAN).

## 8. Tela

`?homologacao=1` → Metodologia → seção **"Leitura Integrada — homologação metodológica"** (independente da seção do HOLOSCAN): `package_id`, `version`, `status`, contagens de domínios/vínculos/regras, `content_hash` do servidor (após **Conferir hash**, que também traz os bloqueios), Aprovação 1 e 2 (registrada / pendente / "não vale para o conteúdo atual"), invalidadas, ações **Conferir hash**, **Registrar Aprovação N** (responsável, justificativa, "conferi o hash"), **Homologar** (desabilitado com motivo enquanto houver bloqueio, faltar aprovação ou o pacote não estiver `em_revisao`). Aviso **"Metodologia da Leitura Integrada ainda não definida."** quando não há domínio aprovado — informação, não erro técnico.

## 9. Pendências

- Validação da cadeia 130000 → 20261002100000 no banco real (sem conexão autorizada nesta sessão). Nenhuma migration aplicada.
- Decisões clínicas 1–29 do pacote de decisão humana: **abertas**. Quando decididas, entram por migration versionada (domínios, vínculos, regras, dependências), o pacote passa a `em_revisao`, e só então Daniel → Rodrigo → Homologar.
- Nenhuma Aprovação 1 ou 2 registrada; nenhum pacote da LI homologado.
