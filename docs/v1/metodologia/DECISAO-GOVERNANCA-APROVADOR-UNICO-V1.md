# Decisão formal — governança da V1: de dupla aprovação para aprovador único (Daniel)

**Data:** 2026-10-03 · **Etapa:** 6.3-B · **Migration:** `supabase/migrations/20261003100000_governanca_aprovador_unico.sql`
**Artefato de aplicação real:** `supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql` (com `ETAPA6-3-B-PREFLIGHT.sql` / `ETAPA6-3-B-POSTFLIGHT.sql`)
**Status:** decidido pelo responsável do produto; implementado e provado localmente. **Ainda não aplicado no banco real** (exige autorização própria).

## 1. Decisão

1. A governança metodológica da V1 (HOLOSCAN e Leitura Integrada) **passa de dupla aprovação (Daniel → Rodrigo) para aprovador único: Daniel** (responsável metodológico).
2. **A perda do controle de quatro olhos é uma decisão consciente.** A V1 deixa de ter uma segunda pessoa conferindo o mesmo pacote, versão e hash antes da homologação. O risco aceito: um erro de conteúdo do pacote não é mais barrado por uma segunda revisão humana. O que continua protegendo: hash calculado no servidor e conferido por quem aprova, invalidação automática por qualquer mudança, validador estrutural/completude, imutabilidade do pacote homologado e de seus snapshots, identidade real (`auth.uid()`), histórico append-only.
3. **Nenhuma estrutura simula uma segunda revisão.** `reviewed_by` / `reviewed_at` (segundo revisor) **ficam nulos** no regime `aprovador_unico`; nunca são preenchidos com Daniel para satisfazer o schema. O regime é registrado explicitamente:
   - `methodology_packages.governance_regime = 'aprovador_unico'` (no ato de homologar);
   - registro de homologação HOLOSCAN: `source = 'aprovador unico'`, evidência com `regime aprovador_unico`, responsável `Daniel (aprovador único — responsável metodológico)`;
   - Leitura Integrada: snapshot com `governance_regime = 'aprovador_unico'` e `approval_2 = NULL`; `approval_provenance` com `regime: 'aprovador_unico'`, `segunda_revisao: false` e **sem** `aprovacao_2`.
4. **Rodrigo:** os papéis de etapa 2 em `methodology_approvers` são **desativados** (`active = false`, `deactivated_at`, `deactivation_reason`), **nunca apagados**. Etapa 2 ativa passa a ser impossível (`approvers_somente_etapa1_ativa`); desativar exige data e motivo (`approvers_desativacao_coerente`).
5. **Homologação do HOLOSCAN:** quem homologa tem de ser, ao mesmo tempo, **dono do pacote** e **aprovador ativo `holoscan`/etapa 1**. Exige a Aprovação vigente sobre o mesmo `package_id`, `version` e `content_hash`, e o validador sem erros.
6. **Homologação da Leitura Integrada:** só o aprovador ativo `integrated_reading`/etapa 1, com a Aprovação vigente e a completude publicável.
7. **Etapa 2 descontinuada:** as RPCs recusam `p_etapa = 2` (hint `etapa_descontinuada`), e as tabelas de aprovação recusam `step <> 1` mesmo para a gestão técnica (`methodology_approvals_etapa_unica`, `li_approvals_etapa_unica`).
8. **Artefatos da Etapa 6.1 congelados:** `supabase/ETAPA6-1-*.sql`, `scripts/validar-cadeia-real-dry-run.sh` e `supabase/tests/etapa6-1-checks-real.sql` **não foram alterados**. Eles são a evidência histórica do contrato vigente naquela etapa (dupla aprovação). O mesmo vale para `ETAPA6-2-*` (aplicado) e `ETAPA6-3-A-APROVADORES.sql` (executado; marcado como superado).

## 2. O que NÃO muda

- Nenhuma regra clínica ou metodológica; nenhum conteúdo de pacote. `metodologia_hash_conteudo` e `li_hash_conteudo` não leem as colunas novas: o HOLOS-V1@2 continua `7af1dae6…` e o LI-V1@2 `fa99ec80…`.
- **A Aprovação 1 já registrada por Daniel no HOLOS-V1@2 é preservada** e continua vigente: mesmo id, versão, hash, `approved_by` e `approver_id`. Ela passa a ser a aprovação única desse pacote; nenhuma nova aprovação é criada pela migration.
- As 4 aplicações HOLOSCAN históricas, seus 20 scores, exames, pacotes LI e o pacote HOLOS ficam idênticos byte a byte. O artefato compara impressões digitais md5 das linhas inteiras, antes e depois, dentro da própria transação.
- Triggers de imutabilidade e de invalidação, RLS e grants seguem os mesmos. As funções mantêm as mesmas assinaturas: o front antigo e o novo chamam as mesmas RPCs.

## 3. Reversão

Voltar a ter quatro olhos exige **nova decisão e nova migration**: reativar etapa 2, remover os checks `*_etapa_unica` e redefinir as RPCs. O check `approvers_somente_etapa1_ativa` impede a reativação silenciosa por UPDATE. Pacotes homologados no regime `aprovador_unico` continuam registrados como tal, e não se reescreve história.

## 4. Provas

- Cadeia local: `scripts/validar-cadeia-local.sh`, com harness novo `supabase/tests/aprovador-unico-harness.sql` (substitui `dupla-aprovacao-harness.sql`) e checks reescritos em `etapa4`, `etapa5-2`, `etapa5-3` e `etapa6`.
- Testes JS: `testar-v1-aprovador-unico.mjs` (substitui `testar-v1-dupla-aprovacao.mjs`), `testar-v1-etapa4-banco`, `-etapa4-barreira`, `-etapa5-2-governanca-li(-ui)`, `-etapa5-3-seguranca-aprovadores` e `-etapa6-li-banco`. É uma mudança legítima de contrato, documentada no topo de cada arquivo; nenhuma proteção foi removida.
- Artefato real: `scripts/testar-aplicacao-aprovador-unico-local.sh` (T0–T6) sobre o estado real reproduzido localmente com identidades fictícias (`supabase/tests/etapa6-3-b-estado-real-local.sql`).

## 5. Aplicação real — APLICADA em 2026-10-03 (SQL Editor, autorizada)

| Arquivo | SHA-256 |
|---|---|
| `supabase/ETAPA6-3-B-APLICACAO-APROVADOR-UNICO.sql` | `42bccb68981f819fb13bd60fca13543ede6e2cc078924eb00aab62383d900ec1` |
| `supabase/ETAPA6-3-B-PREFLIGHT.sql` | `afa1d148947c20ce8dc843bb3528d793d5b6b15f07963e526839cba16fe2ef31` |
| `supabase/ETAPA6-3-B-POSTFLIGHT.sql` | `e261dbf926f284d7dbae3deec6e78714c121fbcc79bb16a16f4bb04ab46556ae` |

PRE-FLIGHT no banco real (somente leitura, 2026-10-03): `pode_aplicar = true`, `divergencias = {}`. As impressões digitais (md5 das linhas inteiras), que o POST-FLIGHT tem de devolver iguais, foram: apps `d5a62c16…`, scores `1c66f0d5…`, Aprovação 1 `d7b2d4cb…`, pacote HOLOS `f39b6ff4…`, Daniel `571c918d…`, identidade de Rodrigo `0e16aaa0…`, exames `e63dac4f…` e pacotes LI `3f1070b9…`.

**Resultado (2026-10-03):** o artefato foi aplicado manualmente no SQL Editor. Uma tentativa anterior pelo conector MCP estourou o limite de 60 s do conector e não persistiu nada: rollback integral, confirmado por leitura.

POST-FLIGHT: `aplicacao_ok = true`, divergências `{}`. Conferência final só de leitura:
- histórico 31, última `20261003100000` (`governanca_aprovador_unico`, 1 statement, `created_by` nulo);
- 44 tabelas, 62 funções, 129 policies, 89 triggers, 323 constraints;
- as 7 constraints novas ou refeitas estão validadas, com md5 da definição igual ao local (`142450bd…`);
- colunas novas presentes e `approval_2` nullable;
- as 4 RPCs executáveis por `authenticated` e não por `anon`.

As 8 impressões digitais são idênticas antes e depois: apps `d5a62c16…`, scores `1c66f0d5…`, Aprovação 1 `d7b2d4cb…`, pacote HOLOS `f39b6ff4…`, Daniel `571c918d…`, identidade de Rodrigo `0e16aaa0…`, exames `e63dac4f…`, pacotes LI `3f1070b9…`.

**Quebras de linha:** a colagem no SQL Editor converteu o fim de linha para CRLF. Há 262 `\r` no texto do histórico e 31–37 em cada função. Sem os `\r`, o texto do histórico tem md5 `7e5541a8…`, idêntico ao do arquivo da migration, e os corpos das 4 funções são idênticos aos aplicados localmente a partir do artefato. Nenhum literal atravessa linha, então o comportamento não muda.

Estado depois da aplicação:
- Daniel ativo nos dois escopos;
- Rodrigo inativo nos dois escopos, com data e motivo; as linhas não foram apagadas e a identidade foi preservada;
- HOLOS-V1@2 `em_revisao`, hash `7af1dae6…`, regime nulo, `reviewed_by`/`reviewed_at`/`approved_by` nulos;
- 1 aprovação, a A1 de Daniel, intacta; 0 de etapa 2; 0 registros de homologação;
- LI-V1@2 `em_revisao`, `fa99ec80…`, 0 aprovações, 0 snapshots;
- 4 aplicações sem proveniência e 20 scores, intactos.
