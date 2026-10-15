# MCP do HoloHacking — o Resultado HOLOS pela conversa com a IA

> Substitui o "agente" (copiar o Pacote → colar no GPT → copiar o JSON → colar e importar).
> A nutricionista conecta uma vez e pede: **"@HoloHacking gere o Resultado da Marina"**.

## 1. Para a nutricionista (passo a passo)
1. **Perfil → aba "Assistente de IA" → Gerar URL de conexão.**
   - A URL aparece **uma vez**: copie e guarde como uma senha.
2. **No assistente:**
   - **Claude** (claude.ai ou app): Configurações → **Conectores** → **Adicionar conector personalizado** → nome *HoloHacking* → cole a URL → Adicionar.
   - **ChatGPT**: Configurações → **Conectores** (modo desenvolvedor) → **Criar** → cole a URL em "URL do servidor MCP" → sem autenticação.
3. **Na conversa:** ative o HoloHacking e peça *"Gere o Resultado HOLOS da Marina"*. O assistente:
   - **busca a paciente** (se houver mais de uma com o nome, pergunta qual é);
   - **lê o contexto**: HOLOSCAN, áreas prioritárias, ferramentas, Mapeamento, Conduta e Resultado anterior;
   - **escreve a análise** e **grava o Resultado HOLOS** na ficha.
4. **No app:** ficha → aba **Resultado HOLOS** para revisar; página **Resultado** → **Gerar Resultado Final** (PDF e WhatsApp), como sempre.

Outros pedidos que funcionam:
- *"Quem eu atendo hoje?"* (agenda)
- *"Monte o Resultado da Marina com o Playbook: foco nos horários e 3 estratégias"*
- *"Quais estratégias do Playbook servem para o sistema Fúngico?"*
- *"Quais versões do Resultado a Marina tem?"*

**Para desligar:** Perfil → Assistente de IA → **Revogar**. O efeito é imediato.

## 2. O que o servidor faz (e o que não faz)
| Ferramenta | Grava? | O que faz |
|---|---|---|
| `buscar_pacientes` | não | pelo nome (sem acento, parte do nome); só os pacientes desta nutricionista; sem contatos |
| `contexto_paciente` | não | o "Pacote" montado no servidor. Paciente: só **iniciais, idade e sexo**. Inclui atendimento, primeira consulta ou retorno, HOLOSCAN (5 sistemas, áreas prioritárias, sinais), ferramentas com respostas, Mapeamento, Conduta, relato que entra no Resultado, Resultado anterior, Linha do Momentum e Playbook (focos e estratégias com ids) |
| `instrucoes_resultado` | não | regras do método + contrato HOLOS_AI_RESULT v1 (o schema 06) + exemplo |
| `gerar_resultado` | **sim** | recebe a análise no contrato HOLOS_AI_RESULT v1, o **mesmo do agente** (objeto ou texto com bloco ```json```), e a valida com o mesmo validador. Com erro, devolve a lista para a IA corrigir. Fluxo: `importar_holos_ai` → `aceitar_importacao_holos_ai` → Resultado montado pela **mesma regra do Resultado automático do app** (relato, regra fixa da HOLOS AI, limites do PDF da paciente, foco) → `salvar_resultado_holos` |
| `gerar_resultado_playbook` | **sim** | 1 foco + 2 a 4 estratégias do Playbook PB-V2 (ids do contexto; ação, quando e observar podem ser ajustados) + o relato do paciente → `salvar_resultado_holos` |
| `resultados_paciente` | não | versões do Resultado (vigente, foco, data) |
| `agenda` | não | consultas de um dia |
| `estrategias_playbook` | não | Playbook por sistema |

**Não faz:**
- não emite o Resultado Final nem envia ao paciente;
- não grava HOLOSCAN, anamnese, agenda ou cadastro;
- não funciona para conta pendente ou recusada;
- não mostra nome, telefone, e-mail nem nascimento no contexto clínico.

Cada Resultado gravado pelo MCP é uma **nova versão**: a anterior continua no histórico. A leitura profissional registra a origem ("via MCP", importação vN ou "Playbook PB-V2 · Foco …").

## 3. Arquitetura
- **Edge Function `holohacking-mcp`** (Supabase, Deno), transporte MCP *Streamable HTTP*: POST JSON-RPC 2.0 com resposta JSON; GET responde 405.
  - `nucleo.js`: protocolo e ferramentas, sem rede.
  - `index.ts`: liga o núcleo ao banco pela conexão **`SUPABASE_DB_URL`**, que o Supabase injeta. **Nenhum segredo novo.**
  - `shared/`: cópias idênticas dos módulos do método do app (`resultado-direcao.js`, `holos-ai-contrato.js`, `playbook-holos.js`, `sistemas-fechamento.js`) e do contrato/exemplo.
  - `ARQUIVO-UNICO-PAINEL.ts`: tudo num arquivo, para colar no painel.
- **Identidade:**
  - a chave pessoal `hh_mcp_…` vai no caminho `/holohacking-mcp/<chave>` (ou em `Authorization: Bearer`);
  - `mcp_identificar` (só o servidor) devolve a nutricionista se a chave não foi revogada **e a conta está ativa**;
  - **cada chamada roda COMO a nutricionista**: `set local role authenticated` + `request.jwt.claims.sub`, exatamente o que o PostgREST faz. Valem o mesmo RLS, os mesmos gatilhos (conta ativa, paciente arquivado) e as mesmas RPCs do app.
- **Banco** (`20261027100000_mcp_chaves.sql`, aditiva):
  - `mcp_keys` guarda **só o SHA-256**: a chave é mostrada uma vez, há no máximo 5 ativas, e a nutri lê nome, prefixo e datas, nunca o hash;
  - `mcp_usage_log` guarda ferramenta, ok/erro, paciente e data, **sem conteúdo clínico e sem a chave**; só a dona lê;
  - RPCs `criar_chave_mcp` e `revogar_chave_mcp` (authenticated); `mcp_identificar` e `mcp_registrar_uso` (só service_role / servidor).
- **Front:** `conexao-ia.js` (aba "Assistente de IA" no Perfil).

## 4. Deploy (produção) — sem mexer em nada existente
1. **Banco** (SQL Editor do Supabase): cole e rode `supabase/migrations/20261027100000_mcp_chaves.sql` inteiro (já tem begin/commit). Conferência:
   ```sql
   select to_regclass('public.mcp_keys') is not null as chaves, to_regclass('public.mcp_usage_log') is not null as registro,
          has_function_privilege('authenticated','public.criar_chave_mcp(text)','execute') as criar,
          not has_function_privilege('authenticated','public.mcp_identificar(text)','execute') as identificar_fechado;
   ```
   As quatro colunas devem voltar `true`.
2. **Edge Function**, de um destes jeitos:
   - **Painel:** Edge Functions → *Deploy a new function* → *Via Editor* → nome **`holohacking-mcp`** → cole `supabase/functions/holohacking-mcp/ARQUIVO-UNICO-PAINEL.ts` → Deploy. Depois, em *Details*, **desligue "Enforce JWT Verification"**.
   - **CLI:**
     ```
     node scripts/sincronizar-mcp-shared.mjs && node scripts/gerar-mcp-unico.mjs
     supabase functions deploy holohacking-mcp --no-verify-jwt --project-ref sllhyymeeyoozokgbnuv
     ```
   - Não precisa configurar secret: `SUPABASE_DB_URL` já existe em toda Edge Function. `SITE_URL` é opcional.
3. **Site:** deploy normal (`conexao-ia.js`, `index.html`, `perfil.js`, `style.css`, `supabase-client.js`).
4. **Teste rápido:** Perfil → Assistente de IA → Gerar URL. Conecte no Claude e peça *"liste meus pacientes"*.

## 5. Testes
| Suíte | O que prova |
|---|---|
| `testar-mcp-banco.mjs` | PostgreSQL local com todas as migrations: permissões, hash, conta pendente, revogação imediata, isolamento entre contas, limite de 5, registro de uso |
| `testar-mcp-servidor.mjs` | o núcleo de ponta a ponta no PostgreSQL local: HTTP (401/405/400, lote), protocolo (initialize, tools, prompts), as 8 ferramentas, Resultado gravado pelas duas vias, recusas (contrato, outra conta, arquivado, sem HOLOSCAN), registro de uso sem a chave |
| `testar-mcp-funcao.mjs` | a **Edge Function real no Deno** (driver postgres.js), por `index.ts` e por `ARQUIVO-UNICO-PAINEL.ts`; cópias `shared/` idênticas ao app; nenhum segredo no código |
| `testar-mcp-perfil.mjs` | a aba do Perfil no navegador: URL mostrada uma vez, lista sem a chave, revogar, limite, conta pendente, celular |

O banco local é montado por `scripts/montar-banco-mcp-local.sh`, chamado sozinho pelos testes quando falta. Sem PostgreSQL local ou sem Deno, as partes que dependem deles aparecem como **PULADO**.

## 6. Próximos passos possíveis (fora desta entrega)
- Retorno pelo Playbook com a decisão de cada estratégia anterior (manter/ajustar/concluir) direto na conversa.
- Ferramentas de escrita além do Resultado: gerar o link do Mapeamento, marcar consulta, cadastrar paciente.
- OAuth (login pelo próprio HoloHacking ao conectar), no lugar da URL com chave.
