# RELATÓRIO ARQUITETURAL CORRIGIDO — LOTE 06

## 1. INVENTÁRIO SUPABASE COMPLETO

15 arquivos de migration aplicados em `supabase/migrations/`:

| # | Arquivo | Tabelas/Objetos criados |
|---|---------|------------------------|
| 1 | `20260918181315_fase1_profiles_patients.sql` | `profiles`, `patients`, trigger `lidar_novo_usuario()`, trigger `tocar_updated_at()` |
| 2 | `20260918181500_fase1_endurecer_funcoes.sql` | Hardening de funções existentes |
| 3 | `20260918181700_fase1_otimizar_policies.sql` | Otimização de RLS policies |
| 4 | `20260921172844_fase2a_consultations_schedule_blocks_profiles.sql` | `consultations`, `schedule_blocks`, UNIQUE(id,nutritionist_id) em patients, campos profissionais em profiles |
| 5 | `20260921193000_fase2b_holoscope.sql` | `holoscope_applications`, `holoscope_answers`, `holoscope_system_scores`, trigger imutabilidade |
| 6 | `20260921201500_fase2c_lab_collections_results.sql` | `lab_collections`, `lab_results` |
| 7 | `20260921210000_fase2d_tool_applications.sql` | `tool_applications`, trigger imutabilidade identidade |
| 8 | `20260921220000_fase2e_documents_storage_assets.sql` | `documents`, `professional_assets`, buckets `patient-documents` e `professional-assets` |
| 9 | `20260921221000_fase2e_fix_unindexed_fks.sql` | Índices em FKs sem índice |
| 10 | `20260922010000_fase5_rpc_salvar_holoscope.sql` | RPC `salvar_holoscope_completo` (SECURITY DEFINER) |
| 11 | `20260922020000_fase6_rpc_salvar_coleta_exames.sql` | RPC `salvar_coleta_exames` (SECURITY DEFINER) |
| 12 | `20260922030000_hardening_revoke_anon_grants.sql` | REVOKE em role anon |
| 13 | `20260923180000_holos_ai_threads_messages.sql` | `ai_threads`, `ai_messages` |
| 14 | `20260923200000_rename_holoscope_to_holoscan.sql` | Rename holoscope_* → holoscan_*, RPC `salvar_holoscan_completo`, wrapper de compatibilidade |
| 15 | `20260924150000_revoke_anon_execute_security_definer.sql` | REVOKE EXECUTE em RPCs para anon |

**14 tabelas no Supabase**: profiles, patients, consultations, schedule_blocks, holoscan_applications, holoscan_answers, holoscan_system_scores, lab_collections, lab_results, tool_applications, documents, professional_assets, ai_threads, ai_messages.

**Todas com RLS habilitada.** Todas com isolamento por `nutritionist_id = auth.uid()`.

---

## 2. CLASSIFICAÇÃO REAL — ONDE CADA DOMÍNIO MORA

### A) SUPABASE AUTHORITATIVE (quando autenticado via HoloAuth)

| Domínio | Tabela local | Tabela Supabase | Roteado por |
|---------|-------------|-----------------|-------------|
| Pacientes | `pacientes` | `patients` | `DadosRouter.from("pacientes")` → `supabaseClient.from("patients")` |
| Consultas | `consultas` | `consultations` | `DadosRouter.from("consultas")` → proxy com tradução de campos |
| Bloqueios | `bloqueios` | `schedule_blocks` | `DadosRouter.from("bloqueios")` → proxy com tradução |
| Ferramentas | `aplicacoes` | `tool_applications` | `DadosRouter.from("aplicacoes")` → proxy com tradução |
| Perfil | — | `profiles` + `professional_assets` | `perfil.js` direto via `supabaseClient` |

### B) HÍBRIDO (Supabase + cache local)

| Domínio | Storage local | Storage Supabase | Camada |
|---------|--------------|------------------|--------|
| Documentos | IndexedDB (`arquivo-store`) | `documents` + bucket `patient-documents` | `ArquivoStore` (salvarHibrido/listarHibrido/removerHibrido) |
| HOLOSCAN | localStorage (`holohacking.pontuacao`, questionário) | `holoscan_applications/answers/system_scores` via RPC | `migracao-supa.js` migra local→Supa; frontend lê/grava local para cálculo |
| Exames | localStorage (`holohacking.exames`) | `lab_collections/lab_results` via RPC | `migracao-supa.js` migra local→Supa; frontend lê/grava local |

### C) LOCAL / LEGADO

| Domínio | Onde mora | Observação |
|---------|-----------|------------|
| OQ3 | localStorage | Será migrado para `tool_applications` (etapa futura) |
| PQQ | localStorage | Será migrado para `tool_applications` (etapa futura) |

### D) DORMENTES

| Domínio | Tabelas Supabase | Observação |
|---------|-----------------|------------|
| HOLOS AI | `ai_threads`, `ai_messages` | Tabelas criadas, RLS ativa, sem integração frontend |

**Fallback universal**: sem sessão Supabase (`!HoloAuth.sessaoAtiva()`), DadosRouter cai para `DadosLocais` — tudo funciona offline via localStorage.

---

## 3. FK CONSTRAINTS — MAPA DE INTEGRIDADE

### Filhas diretas de `patients` — ON DELETE RESTRICT

| Tabela filha | FK | Constraint | Efeito |
|-------------|-----|------------|--------|
| `consultations` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | ON DELETE RESTRICT | Bloqueia DELETE se existir consulta |
| `holoscan_applications` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | ON DELETE RESTRICT | Bloqueia DELETE se existir aplicação HOLOSCAN |
| `lab_collections` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | ON DELETE RESTRICT | Bloqueia DELETE se existir coleta |
| `tool_applications` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | ON DELETE RESTRICT | Bloqueia DELETE se existir ferramenta |
| `documents` | `(patient_id, nutritionist_id)` → `patients(id, nutritionist_id)` | ON DELETE RESTRICT | Bloqueia DELETE se existir documento |

### Netas — ON DELETE CASCADE (cascateiam com a mãe, não com `patients`)

| Tabela neta | FK mãe | Constraint |
|------------|--------|------------|
| `holoscan_answers` | → `holoscan_applications` | ON DELETE CASCADE |
| `holoscan_system_scores` | → `holoscan_applications` | ON DELETE CASCADE |
| `lab_results` | → `lab_collections` | ON DELETE CASCADE |
| `ai_messages` | → `ai_threads` | ON DELETE CASCADE |

**Resultado**: o Supabase NÃO permite deletar `patients` que tenham qualquer registro filho. A constraint ON DELETE RESTRICT impede no banco.

---

## 4. SEGURANÇA DA EXCLUSÃO

### Cenário: paciente autenticado COM histórico

1. `confirmarRemover()` verifica `HoloAuth.sessaoAtiva()` e `contarRegistros()` (`app.js:1064-1085`)
2. Se ambos verdadeiros → modal informativo "Não é possível excluir", lista registros, oferece "Arquivar paciente"
3. Exclusão NÃO prossegue. O botão "Excluir definitivamente" NÃO aparece.

### Cenário: paciente autenticado SEM histórico

1. `confirmarRemover()` mostra modal com "Excluir definitivamente" + "Arquivar em vez disso"
2. Se confirmado → `removerPacientes()` tenta `supabaseClient.from("patients").delete()` PRIMEIRO (`app.js:1152-1160`)
3. Se RESTRICT bloquear (filhos não contados pelo frontend) → toast "paciente possui dados no prontuário. Arquive-o."
4. Só após Supabase aceitar → `Armazenamento.excluirPaciente()` limpa local

### Cenário: sem sessão (offline / não autenticado)

1. `confirmarRemover()` mostra modal padrão com resumo + "Excluir definitivamente"
2. `removerPacientes()` pula Supabase, vai direto para `Armazenamento.excluirPaciente()` (limpeza local)

### Garantia em camadas

| Camada | Proteção |
|--------|----------|
| Frontend (UI) | `confirmarRemover()` bloqueia se autenticado + histórico |
| Frontend (safety net) | `removerPacientes()` tenta DELETE no Supabase antes do local |
| Banco (última linha) | ON DELETE RESTRICT nas 5 tabelas filhas |

---

## 5. EXPORTAÇÃO — FONTES REAIS

`reunirDadosPaciente()` em `app.js:958-998`:

| Dado | Fonte | Camada |
|------|-------|--------|
| Dados do paciente | `pacienteAtivo()` — que vem de `estado.pacientes`, carregado via `DadosRouter.from("pacientes")` | Supabase (auth) / Local (offline) |
| Consultas | `Agenda.todas(id)` — que usa `DadosRouter.from("consultas")` internamente | Supabase (auth) / Local (offline) |
| Documentos (metadados) | `ArquivoStore.listar(id)` — `listarHibrido()` → Supabase `documents` + IndexedDB | Híbrido |
| Pontuação HOLOSCAN | `Panorama.doPaciente(id).pontuacao` — lê de localStorage | Local |
| Ferramentas aplicadas | `Panorama.doPaciente(id).ferramentas` — lê de localStorage | Local |
| Histórico HOLOSCAN | `Panorama.doPaciente(id).historico` — lê de localStorage | Local |
| OQ3, PQQ | `p.oq3`, `p.pqq` do objeto paciente | DadosRouter → Supabase/Local |
| Metadados | `produto: "HoloHacking"`, `versaoExportacao: "1.0"`, `exportadoEm` | Estáticos |

**Nota**: pontuação e ferramentas ainda são lidas de fonte local (Panorama). Após a migração fire-and-forget (`migracao-supa.js`), os dados existem no Supabase, mas o frontend ainda lê do local para cálculo e exibição.

---

## 6. ARQUIVAMENTO E REATIVAÇÃO

`mudarStatus()` em `app.js:1124-1137`:
- Usa `sb.from("pacientes").update({ status: novo }).eq("id", id)`
- `sb` é `window.DadosRouter` → quando autenticado, roteia para `supabaseClient.from("patients")`
- CHECK constraint no banco: `status IN ('ativo', 'inativo')` — UI diz "Arquivado", banco armazena `'inativo'`
- Sem sessão → cai para `DadosLocais` (localStorage)

---

## 7. DOCUMENTOS — OWNERSHIP E SUPABASE

`ArquivoStore` em `arquivo-store.js`:
- `temSupa()`: verifica `supabaseClient` + `HoloAuth.sessaoAtiva()`
- `salvarSupa()`: upload para bucket `patient-documents`, insert em `documents`
- `listarSupa()`: query `documents` table filtrada por `patient_id`
- `removerSupa()`: delete de `documents` + `supabaseClient.storage.from("patient-documents").remove()`
- Ownership via `uidAtual()` → `auth.uid()` no RLS
- Operações híbridas: `salvarHibrido()`, `listarHibrido()`, `pegarHibrido()`, `removerHibrido()`

---

## 8. QUESTIONÁRIO — FEEDBACK AO BLOQUEAR

`gravar()` em `questionario.js:102-106`:
- ANTES: `if (window.pacienteArquivado && window.pacienteArquivado()) return;` — silencioso
- AGORA: mostra toast "Paciente arquivado — reative para registrar novas informações."
- Guarda `pacienteArquivado()` é definida globalmente e respeita o status do paciente ativo

---

## 9. RLS E SEGURANÇA

| Controle | Estado |
|----------|--------|
| RLS habilitada | Todas as 14 tabelas |
| Isolamento | `nutritionist_id = auth.uid()` em todas as policies |
| Role anon | Privilégios revogados (SELECT, INSERT, UPDATE, DELETE) |
| RPCs | EXECUTE revogado para anon; SECURITY DEFINER para operações atômicas |
| Storage | Buckets privados com policies de ownership |
| Frontend | Sem service_role key, sem secrets no Git |

---

## 10. ALTERAÇÕES REALIZADAS NESTE LOTE (FASE ARQUITETURAL)

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `app.js` | `confirmarRemover()`: bloqueia exclusão para paciente autenticado com histórico, mostra modal informativo com resumo e opção de arquivar |
| `app.js` | `removerPacientes()`: tenta `supabaseClient.from("patients").delete()` antes da limpeza local; RESTRICT funciona como safety net |
| `questionario.js` | `gravar()`: adiciona toast de feedback quando paciente está arquivado (antes era silencioso) |
| `package.json` | Adicionado `testar-arquitetura-lote06.mjs` à cadeia de testes |

### Arquivos criados

| Arquivo | Finalidade |
|---------|-----------|
| `testes/testar-arquitetura-lote06.mjs` | 52 assertions validando: tabelas existem nas migrations, FKs corretas (RESTRICT/CASCADE), exclusão bloqueada, exportação usa fachadas, arquivamento persiste, documentos Supabase+ownership, questionário com feedback, RLS em todas as tabelas, RPCs existem, anon revogado |

---

## 11. RESULTADO DOS TESTES

```
66 suítes de teste
1985 assertions
0 falhas
0 regressões
```

Inclui a nova suíte `testar-arquitetura-lote06.mjs` com 52 assertions — todas passaram.

---

## 12. O QUE NÃO FOI FEITO (CONFORME ESPECIFICADO)

- Nenhuma migration criada
- Nenhuma RLS alterada
- Nenhuma FK alterada
- Nenhuma Storage policy alterada
- Nenhuma tabela Supabase removida
- Nenhum deploy realizado
- Nenhum merge realizado
- Nenhum fallback legado removido
- Nenhuma configuração do Supabase alterada
- Nenhum dado real tocado
