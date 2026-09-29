> **Histórico.** Este relatório descreve o fechamento do Lote 06 e ficou parcialmente
> desatualizado (ex.: signed URLs, OQ3/PQQ, leitura remota de HOLOSCAN/exames, 67 suítes).
> O estado técnico atual está em [`RELEASE-STATE.md`](RELEASE-STATE.md).

# RELATÓRIO ARQUITETURAL CORRIGIDO — LOTE 06

## ARQUITETURA

### Supabase autoritativo (quando autenticado via HoloAuth)

| Domínio | Tabela local | Tabela Supabase | Roteado por |
|---------|-------------|-----------------|-------------|
| Pacientes | `pacientes` | `patients` | `DadosRouter.from("pacientes")` → `supabaseClient.from("patients")` |
| Consultas | `consultas` | `consultations` | `DadosRouter.from("consultas")` → proxy com tradução |
| Bloqueios | `bloqueios` | `schedule_blocks` | `DadosRouter.from("bloqueios")` → proxy com tradução |
| Ferramentas | `aplicacoes` | `tool_applications` | `DadosRouter.from("aplicacoes")` → proxy com tradução |
| Perfil | — | `profiles` + `professional_assets` | `perfil.js` direto via `supabaseClient` |

### Híbrido (Supabase + cache local)

| Domínio | Storage local | Storage Supabase | Camada |
|---------|--------------|------------------|--------|
| Documentos | IndexedDB (`arquivo-store`) | `documents` + bucket `patient-documents` | `ArquivoStore` (salvarHibrido/listarHibrido/removerHibrido) |
| HOLOSCAN | localStorage (`holohacking.pontuacao`, questionário) | `holoscan_applications/answers/system_scores` via RPC | `migracao-supa.js` migra local→Supa; frontend lê/grava local para cálculo |
| Exames | localStorage (`holohacking.exames`) | `lab_collections/lab_results` via RPC | `migracao-supa.js` migra local→Supa; frontend lê/grava local |

### Local/legado

| Domínio | Onde mora | Observação |
|---------|-----------|------------|
| OQ3 | localStorage | Será migrado para `tool_applications` (etapa futura) |
| PQQ | localStorage | Será migrado para `tool_applications` (etapa futura) |
| HOLOS AI | `ai_threads`, `ai_messages` | Tabelas criadas, RLS ativa, sem integração frontend (dormentes) |

---

## SUPABASE

- **Tabelas clínicas confirmadas**: profiles, patients, consultations, schedule_blocks, holoscan_applications, holoscan_answers, holoscan_system_scores, lab_collections, lab_results, tool_applications, documents, professional_assets, ai_threads, ai_messages (14 tabelas, todas com RLS habilitada)
- **DadosRouter**: roteia pacientes/consultas/bloqueios/aplicacoes para Supabase quando `HoloAuth.sessaoAtiva()`; cai para DadosLocais quando offline
- **ArquivoStore**: camada híbrida — `salvarHibrido` grava IndexedDB + Supabase Storage + `documents` table; `listarHibrido` deduplica por nome+tamanho (Supabase tem prioridade); `removerHibrido` remove de ambos; ownership via `uidAtual()` → RLS `auth.uid()`

---

## ARQUIVAMENTO

- **Persiste no Supabase/camada autoritativa**: SIM — `mudarStatus()` usa `sb.from("pacientes").update({ status: novo })` onde `sb = DadosRouter` → `supabaseClient.from("patients")` quando autenticado
- **Reativação persiste**: SIM — mesmo caminho, status volta a `'ativo'`
- **Reload preserva status**: SIM — o status é relido do Supabase (ou DadosLocais offline) ao carregar pacientes
- **Questionário mostra feedback**: SIM — `gravar()` em `questionario.js:102-106` mostra toast "Paciente arquivado — reative para registrar novas informações."

---

## EXCLUSÃO

- **Paciente com histórico**: BLOQUEADO — `confirmarRemover()` consulta as 5 tabelas filhas no Supabase (`consultations`, `holoscan_applications`, `lab_collections`, `tool_applications`, `documents`) via `select("id", { count: "exact", head: true })`. Se qualquer contagem > 0 e sessão autenticada → modal "Não é possível excluir", sem botão de exclusão, apenas "Arquivar paciente"
- **Paciente sem histórico**: PERMITIDO — modal com "Excluir definitivamente" + "Arquivar em vez disso"
- **Histórico é verificado no Supabase**: SIM — `contarRegistros()` consulta as 5 tabelas FK-child diretamente via `supabaseClient` quando autenticado; fallback para fontes locais (Agenda, Panorama, ArquivoStore) quando offline
- **Remote delete ocorre antes do cleanup local**: SIM — `removerPacientes()` tenta `supabaseClient.from("patients").delete()` PRIMEIRO; só após sucesso remoto → `Armazenamento.excluirPaciente()` limpa local
- **Falha remota preserva cache local**: SIM — se o DELETE Supabase falha (RESTRICT ou network), a função retorna com toast de erro sem tocar dados locais
- **Cascade manual frontend**: NÃO — nenhum cascade destrutivo improvisado; o banco faz RESTRICT
- **Migration necessária**: NÃO — nenhuma migration criada ou alterada

### Garantia em camadas

| Camada | Proteção |
|--------|----------|
| Frontend (UI) | `confirmarRemover()` consulta Supabase, bloqueia se autenticado + histórico |
| Frontend (safety net) | `removerPacientes()` tenta DELETE no Supabase antes do cleanup local |
| Banco (última linha) | ON DELETE RESTRICT nas 5 tabelas filhas de `patients` |

---

## EXPORTAÇÃO

- **Fonte paciente**: `pacienteAtivo()` → `estado.pacientes` carregado via `DadosRouter.from("pacientes")` → Supabase (auth) / DadosLocais (offline)
- **Fonte consultas**: `Agenda.todas(id)` → usa `DadosRouter.from("consultas")` → Supabase (auth) / DadosLocais (offline)
- **Fonte HOLOSCAN**: `Panorama.doPaciente(id).pontuacao/historico` → localStorage (local). DadosRouter não roteia holoscan ainda (etapa futura). Dados migrados para Supabase via `migracao-supa.js` mas frontend ainda lê local.
- **Fonte exames**: `Panorama.doPaciente(id).exames` → localStorage (local). Mesma situação: dados migrados via RPC mas frontend lê local.
- **Fonte ferramentas**: `Panorama.doPaciente(id).ferramentas` → localStorage (local)
- **Fonte documentos**: `ArquivoStore.listar(id)` → `listarHibrido()` → Supabase `documents` + IndexedDB (híbrido, com deduplicação por nome+tamanho)
- **Usa somente localStorage**: NÃO — pacientes/consultas vêm do Supabase via DadosRouter quando autenticado; documentos via ArquivoStore híbrido
- **Duplicação remoto/cache evitada**: SIM — `listarHibrido()` deduplica por `nome|tamanho`; DadosRouter retorna apenas uma fonte (Supabase ou DadosLocais, nunca ambos); Panorama lê apenas localStorage
- **Ownership**: RLS `nutritionist_id = auth.uid()` em todas as queries Supabase; DadosLocais isolado por uid via `Armazenamento.manifesto`
- **Conta B pode exportar A**: NÃO — RLS impede. `DadosRouter` usa `supabaseClient` que carrega o JWT do usuário autenticado; queries retornam apenas dados do `nutritionist_id` correspondente
- **Tokens**: AUSENTES — `reunirDadosPaciente()` não inclui access_token, refresh_token, service_role, anon key
- **Signed URLs**: AUSENTES — exportação inclui apenas metadados de documentos (id, nome, tipo, tamanho, created_at), sem conteúdo binário nem URLs assinadas

---

## DOCUMENTOS

- **Fonte autoritativa**: Supabase `documents` table + bucket `patient-documents` (quando autenticado)
- **Storage**: bucket `patient-documents` com policies de ownership (`uid/patient_id/timestamp_nome`)
- **Cache**: IndexedDB local via `arquivo-store.js` (cache rápido, funciona offline)
- **Exclusão remota + cache**: `removerHibrido()` remove do Supabase (`documents` table + Storage bucket) e do IndexedDB. Se `supa:` prefixed → deleta Supabase primeiro; se local → deleta IndexedDB. Nenhum registro órfão.
- **Ownership**: RLS `nutritionist_id = auth.uid()`; `uidAtual()` verifica uid do usuário; Conta B NÃO pode excluir documento de Conta A

---

## FKs

| Tabela filha | FK para `patients` | ON DELETE | Efeito |
|-------------|-------------------|-----------|--------|
| `consultations` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | RESTRICT | Bloqueia DELETE do paciente |
| `holoscan_applications` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | RESTRICT | Bloqueia DELETE do paciente |
| `lab_collections` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | RESTRICT | Bloqueia DELETE do paciente |
| `tool_applications` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | RESTRICT | Bloqueia DELETE do paciente |
| `documents` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | RESTRICT | Bloqueia DELETE do paciente |

**Netas (CASCADE com a mãe, não com `patients`)**: `holoscan_answers` → `holoscan_applications`, `holoscan_system_scores` → `holoscan_applications`, `lab_results` → `lab_collections`, `ai_messages` → `ai_threads`.

**Por que paciente com histórico NÃO pode ser excluído**: qualquer registro em consultations, holoscan_applications, lab_collections, tool_applications ou documents impede o DELETE via ON DELETE RESTRICT. O frontend verifica isso antes de tentar (via `contarRegistros` → Supabase queries) e o banco rejeita como última linha de defesa.

---

## TESTES

- **Comando canônico**: `npm run teste`
- **Suítes**: 67
- **Assertions**: 2012
- **Falhas**: 0
- **Regressões**: 0

### Cobertura das novas assertions

| Teste | Tipo | Assertions |
|-------|------|-----------|
| `testar-arquitetura-lote06.mjs` | Source inspection (Node.js) | 60 — migrations, FKs, RLS, RPCs, Supabase queries em contarRegistros, ordem de delete, segurança de exportação, anon revogado |
| `testar-lote06-prontuario.mjs` seção 16 | Comportamental (Puppeteer + mock Supabase) | 16 — paciente com histórico bloqueado (mock), sem histórico permitido (mock), falha remota preserva local (mock), segurança de exportação |

---

## GIT

- **Commits novos**: 2 (correção arquitetural + fechamento com testes comportamentais)
- **SHA final**: `4392767` (fix: contarRegistros Supabase + exames no histórico)
- **Branch pushed**: `claude/lote-06` + `claude/dreamy-clarke-eeby4f`
- **Working tree limpa**: SIM (após commit)

---

## PENDÊNCIAS

- HOLOSCAN/exames: DadosRouter não roteia holoscan nem lab para Supabase ainda (etapa futura do dados-router.js). Exportação lê desses domínios via fonte local (Panorama). Dados já existem no Supabase via migração fire-and-forget, mas o frontend não os consulta diretamente.
- OQ3/PQQ: migração para `tool_applications` pendente (etapa futura).
- HOLOS AI (`ai_threads`, `ai_messages`): tabelas dormentes, sem integração frontend.

---

**NÃO MERGEADO. NÃO DEPLOYADO.**
