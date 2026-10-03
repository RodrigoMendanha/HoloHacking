# HOLOHACKING V1 — ETAPA 6.3 — ROTEIRO DE EXECUÇÃO HUMANA DA GOVERNANÇA (PREVIEW + SQL EDITOR)

Plano de origem: `ETAPA6-3-PLANO-GOVERNANCA-E-DEPLOY.md`. Estado de partida: banco pós-6.2 (30 / 44 / 62 / 129 / 89 / 317), LI-V1@2 `em_revisao` (`fa99ec80…`), nenhum pacote HOLOS, 0 aprovadores, 0 aprovações, 4 aplicações HOLOSCAN históricas sem proveniência. **Nenhum uid/e-mail neste repositório nem no chat.**

## 0. Até o deploy final (vale desde já)
- **Não** criar nova aplicação HOLOSCAN nem editar/salvar coleta de exames pelo front antigo de produção (`holohacking.com.br`), salvo necessidade operacional inevitável. Motivos: aplicação nova pelo front antigo fica sem proveniência para sempre; salvar de novo uma coleta com data cria **outra** coleta.
- **Não** usar o preview para atendimento clínico (nenhuma aplicação HOLOSCAN, coleta ou leitura no preview). Ele serve só para a governança.

## 1. Preview escolhido: Vercel Preview já conectado ao repositório (sem custo, sem infra nova)
- **Fato verificado:** o repositório já está ligado a um projeto Vercel (`holo-hacking`, time `nutrihighticket-6011s-projects`); **cada push desta branch gera um Preview Deployment** automaticamente (status "Vercel — Deployment has completed" em cada commit). `vercel.json` já serve a raiz estática sem build. Produção (`holohacking.com.br`) é a VPS (DNS `168.231.91.180`) e **não é tocada**.
- **URL:** abrir o commit do HEAD no GitHub (branch `claude/v1-etapa6-1-validacao-banco-real`) → ícone de status ✓ → "Vercel — Details" → URL do deployment **daquele commit** (formato `https://holo-hacking-<id>-nutrihighticket-6011s-projects.vercel.app`). Usar a URL **do commit** (imutável), não o alias da branch.
- **Privacidade:** no painel Vercel → projeto `holo-hacking` → Settings → Deployment Protection → confirmar "Vercel Authentication" **ativa para Preview** (só membros do time abrem). Mesmo sem ela, o app exige login do Supabase e a RLS vale.
- **Autenticação:** o login do app usa `signInWithPassword` do Supabase (funciona em qualquer origem). Daniel e Rodrigo entram com as **próprias** contas, as mesmas cujos uids forem cadastrados no passo A. O preview aponta para o Supabase real (mesmo `supabase-client.js`).
- **Garantir que é a HEAD V1 correta:**
  1. No painel/GitHub, o deployment mostra o SHA do commit: tem de ser o HEAD informado na resposta desta etapa.
  2. No preview, F12 → Console → colar `scripts/conferir-preview-console.js` → esperado `OK: 56 de 56 arquivos batem com docs/deploy.md §3.5` (só faz GET dos arquivos estáticos).
- **`version.json`:** **não existe no Vercel** (é gerado só no `docker build` da VPS, Dockerfile linhas 10-13). No preview, a prova de versão é o SHA do deployment + o script de console acima. `version.json.commit` só será conferido no deploy final da VPS.
- **Encerrar depois:** após o deploy final, no painel Vercel → Deployments → apagar os Preview Deployments desta branch (ou manter protegidos); opcionalmente desligar previews automáticos (Settings → Git). Previews **antigos** de etapas anteriores também apontam para o Supabase real: **não usá-los**; apagar ao encerrar.

## 2. Sequência (Daniel = estágio 1; Rodrigo = estágio 2; contas diferentes)
Antes de tudo, no SQL Editor: rodar `supabase/ETAPA6-3-VERIFICACAO.sql` e **guardar** `historicas_fingerprint` (baseline; tem de ser igual no fim).

**A — Aprovadores (Daniel, SQL Editor, gestão técnica).**
1. Pegar os dois uids no painel Supabase → Authentication → Users (não colar no chat).
2. Copiar `supabase/ETAPA6-3-A-APROVADORES.sql` para um editor local, substituir `__UID_DANIEL__` e `__UID_RODRIGO__`, executar inteiro. **Não salvar o arquivo preenchido no repositório.**
3. Rodar `supabase/ETAPA6-3-A-VERIFICAR-APROVADORES.sql`. Esperado: 4 linhas (`holoscan|1|Daniel`, `holoscan|2|Rodrigo`, `integrated_reading|1|Daniel`, `integrated_reading|2|Rodrigo`, quantidade 1, ativos 1) e `RESUMO: total=4 uids_distintos=2 cada_conta_um_estagio=true daniel_e_rodrigo_contas_diferentes=true`.
   O script aborta (nada grava) se: placeholder não substituído, uid inválido/inexistente, uids iguais, tabela não vazia, fingerprint ≠ pós-6.2, pacote HOLOS já existente, LI ≠ `em_revisao`, aprovações > 0.

**B — Daniel entra no preview** (URL do commit HEAD; conferir SHA + console `OK`). Login com a conta de Daniel. Abrir `<URL>/?homologacao=1`.

**C — Gravar HOLOS-V1@2 (Daniel).** No seletor: "Candidato V1 — decisões fechadas (não gravado) — em_revisao" → botão **"Gravar candidato V1 (em_revisao, sem aprovar)"** (uma vez só).
Conferir no SQL Editor (`ETAPA6-3-VERIFICACAO.sql`): `holos_pacotes = HOLOS-V1@2:em_revisao`, `holos_v2_perguntas = 84`, `holos_v2_sistemas = 5`, `holos_v2_faixas = 15`, `holos_v2_publicavel = true`, **`holos_v2_hash = 7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402`**. **Qualquer divergência: PARAR** (não aprovar; reportar o JSON).

**D — HOLOS: aprovações e homologação.**
5. Daniel (mesma sessão): no pacote HOLOS-V1@2 → Responsável "Daniel", justificativa → **"Registrar Aprovação 1"** (a tela envia o hash do servidor).
6. Rodrigo, **em outro navegador/aba anônima com a conta dele**, mesmo preview `?homologacao=1` → HOLOS-V1@2 → Responsável "Rodrigo", justificativa → **"Registrar Aprovação 2"**.
7. Daniel (dono do pacote) → **"Homologar"**.
8. Conferir: `holos_v2_status = aprovado`, `holos_aprovacoes = 1:Daniel,2:Rodrigo`, `holos_aprovacoes_hash_ok = 2`, `holos_aprovadores_distintos = 2`, `holos_v2_vigente_desde` = data de hoje.

**E — LI-V1@2: aprovações e homologação** (mesma tela, bloco "Leitura Integrada", pacote LI-V1 v2, hash exibido `fa99ec80…`).
9. Daniel → Responsável "Daniel" → **"Registrar Aprovação 1"**.
10. Rodrigo (conta dele) → Responsável "Rodrigo" → **"Registrar Aprovação 2"**.
11. Daniel ou Rodrigo → **"Homologar"** (mensagem "Pacote da Leitura Integrada homologado (aprovado).").
12. Conferir: `li_v2_status = aprovado`, `li_aprovacoes = 1:Daniel,2:Rodrigo`, `li_aprovacoes_hash_ok = 2`, `li_aprovadores_distintos = 2`, `li_snapshots = 1`.

**F — Verificação final do gate** (`ETAPA6-3-VERIFICACAO.sql`): **`gate_6_3_ok = true`**, `approvers = 4`, `approvers_uids_distintos = 2`, `historicas = 4`, `historicas_sem_proveniencia = 4`, `historicas_fingerprint` **igual ao baseline**, `apps_com_pacote_nao_aprovado = 0`. (`apps_com_holos_v2` ainda 0: a prova de proveniência é depois do deploy.) Se `novas_sem_proveniencia > 0`, alguém usou o front antigo: registrar, sem corrigir.

Se qualquer botão recusar ("Aprovação recusada: …", "Homologação recusada: …"): PARAR e reportar a mensagem (as RPCs não deixam rastro parcial).

## 3. Prova local (já feita)
Banco PostgreSQL descartável no estado pós-6.2 com fingerprint real: guardas do cadastro (placeholder, uids iguais, uid inexistente, fingerprint alterado, repetição) abortam; cadastro válido → 4 papéis / 2 contas; candidato gravado → hash `7af1dae6…`, 84/5/15, publicável; A1/A2/homologação HOLOS e LI → `gate_6_3_ok = true`; `historicas_fingerprint` idêntico antes/depois.

## 4. Janela de deploy (depois de `gate_6_3_ok = true`)
1. **Commit:** o HEAD desta branch no momento (se só houver commits de docs depois, os arquivos servidos não mudam; conferir `git diff --stat <HEAD-preview>..<HEAD> -- '*.js' index.html style.css favicon.svg` vazio).
2. **Fast-forward:** possível — o HEAD é descendente linear de `main` (`HEAD..main = 0`, merge-base = ponta da `main`); todos os branches de etapa estão contidos. `git checkout main && git merge --ff-only claude/v1-etapa6-1-validacao-banco-real && git push origin main` (Rodrigo).
3. **Suíte completa** no HEAD: `node testes/rodar.mjs` → 0 falhas.
4. **Hashes:** `docs/deploy.md` §3.5 já confere com o HEAD (56/56); regenerar só se arquivo servido mudar.
5. **Docker build na VPS:** `docker build --build-arg COMMIT=$(git rev-parse --short HEAD) -t holohacking:<HEAD> .`; testar o container numa porta local antes da troca; `version.json.commit == HEAD`; `sh scripts/conferir-producao.sh http://127.0.0.1:<PORTA>` → OK.
6. **Troca do container** (docs/deploy.md §3) e conferência pública: `https://holohacking.com.br/version.json` → commit == HEAD; `scripts/conferir-producao.sh https://holohacking.com.br` → OK.
7. **Smoke:** login; lista de pacientes; ficha; selo da Metodologia sem "em homologação" para HOLOS-V1@2; laboratório abre coletas legadas; Leitura Integrada mostra LI-V1 v2 aprovado.
8. **Primeira aplicação HOLOSCAN real pós-deploy** (atendimento normal) e então `ETAPA6-3-VERIFICACAO.sql`: `apps_com_holos_v2 ≥ 1`, `novas_sem_proveniencia` sem aumento desde o fim do gate, `apps_com_pacote_nao_aprovado = 0`, `historicas_fingerprint` inalterado.
9. Encerrar previews (§1).
