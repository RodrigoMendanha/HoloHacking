# APROVADORES AUTORIZADOS — IDENTIDADE REAL NA DUPLA APROVAÇÃO

Etapa 5.3 · 02/10/2026 · migration `20261002110000_aprovadores_metodologicos.sql` (**NÃO aplicada**) · harness `supabase/tests/etapa5-3-harness.sql` (S01–S21) · teste `testes/testar-v1-etapa5-3-seguranca-aprovadores.mjs`.

## 1. Auditoria (antes da correção)

| Caminho | O que validava | Identidade registrada | Autorização do uid | Resultado |
|---|---|---|---|---|
| HOLOSCAN — `registrar_aprovacao_metodologica` (4.2, migration 210000) | string `p_responsavel` = `'Daniel'` (etapa 1) / `'Rodrigo'` (etapa 2); dono do pacote | `approved_by = auth.uid()` | **nenhuma** | **B**: qualquer usuário autenticado dono de um pacote `em_revisao` informava "Daniel" e depois "Rodrigo" com a mesma conta |
| Leitura Integrada — `registrar_aprovacao_li` / `homologar_pacote_li` (5.2, migration 20261002100000) | string `p_responsavel` | `approved_by` / `homologated_by = auth.uid()` | **nenhuma** | **B**: qualquer usuário autenticado informava "Daniel"/"Rodrigo" |
| Servidor falso, tela, testes | idem (campo de texto livre; testes com uma só conta para os dois nomes) | — | — | espelhavam a falha |

Conclusão da auditoria: a Aprovação 1 e a Aprovação 2 estavam vinculadas a um **nome digitado**, não a uma identidade autenticada autorizada. Vulnerabilidade confirmada nos dois escopos; corrigida antes de qualquer decisão metodológica nova.

## 2. Regra (depois da correção)

- **`methodology_approvers`**: `user_id` (auth.users), `scope` ∈ `holoscan | integrated_reading`, `approval_stage` ∈ `1 | 2`, `display_name` (CHECK: etapa 1 = "Daniel", etapa 2 = "Rodrigo"; nunca "Liderança"), `active`, `notes`, `created_at/by`. **`unique (scope, user_id)`**: uma pessoa tem no máximo um papel por escopo (quatro olhos no cadastro).
- **Só gestão técnica escreve** (migration/SQL com os uids reais, que **não estão no repositório**; nenhum e-mail, senha ou UUID no frontend). A aplicação só lê os próprios papéis (RLS `user_id = auth.uid()`; RPC `meus_papeis_aprovacao()`).
- **Nasce vazia.** Até ser configurada, **ninguém** registra aprovação em nenhum escopo. Isto é o padrão seguro pretendido.
- `registrar_aprovacao_metodologica` e `registrar_aprovacao_li`: o chamador (`auth.uid()`) tem de ser o aprovador **ativo** daquele escopo e etapa (`aprovador_autorizado(scope, stage)`); o nome continua sendo conferido e tem de bater com o papel (display/auditoria). A aprovação grava `approved_by` (uid real) **e** `approver_id`. A Aprovação 2 não pode ser do mesmo uid da Aprovação 1 vigente (quatro olhos também na RPC).
- `homologar_pacote_li`: só por aprovador ativo da Leitura Integrada, com `p_responsavel` = seu `display_name`. `aprovar_pacote_metodologico` (HOLOSCAN): continua sendo o ato do dono do pacote, só com as duas aprovações vigentes (contrato da 4.2 mantido).
- **Leitura do pacote HOLOSCAN por aprovador**: antes só o dono via o pacote `em_revisao` (por isso digitava os dois nomes). Agora quem tem papel no escopo `holoscan` lê o pacote `em_revisao` de outro profissional, suas filhas, aprovações e registros — **só leitura**, para conferir o hash. Nenhuma escrita nova é concedida.
- Sem sessão (`auth.uid()` nulo): recusado.

Nada muda em: ordem Daniel → Rodrigo, hash conferido = hash do servidor, invalidação por mudança (histórico com motivo), ação final explícita, nomes nas mensagens e registros.

## 3. Provas

Harness local (S01–S21, cadeia 130000 → 20261002110000, BEGIN/ROLLBACK, 177 checks): cadastro só por gestão técnica; um papel por escopo; nome por etapa; migration não cadastra ninguém; conta lê só os próprios papéis; impostor sem papel não se passa por Daniel nem por Rodrigo (LI e HOLOSCAN); Rodrigo autorizado não faz a etapa 1; Daniel autorizado não faz a etapa 2 (mudar o nome não contorna `auth.uid()`); anon falha; aprovação grava uid real + `approver_id` + nome; duas identidades distintas no histórico; homologar LI só por aprovador; aprovador lê pacote HOLOSCAN `em_revisao` alheio e conta sem papel não.

Servidor falso e testes (`testar-v1-etapa5-3-seguranca-aprovadores`, `testar-v1-dupla-aprovacao`, `testar-v1-etapa4-barreira` com login de Rodrigo para a Aprovação 2, `testar-v1-etapa5-2-governanca-li` e `-ui`): mesmas provas pela aplicação e pela tela.

## 4. Mudanças de contrato documentadas

- 4.2: "outra conta não aprova pacote alheio" → agora **o aprovador autorizado** (outra conta) aprova o pacote alheio; **conta sem papel** não. O dono deixa de poder registrar as duas aprovações sozinho.
- Tela: o campo "Responsável" vem preenchido pelo papel da conta (somente leitura) ou avisa que a conta não está autorizada; a homologação da LI usa o papel da conta (sem perguntar o nome).

## 5. Pendências

- Cadastro real de Daniel e Rodrigo (uids do Supabase) nos dois escopos: gestão técnica, fora do repositório, após validar a cadeia no banco real.
- Nenhuma aprovação real registrada em nenhum escopo.
