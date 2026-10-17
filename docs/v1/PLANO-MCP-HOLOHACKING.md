# MCP do HoloHacking — substitui o "agente" (Holos IA por copiar e colar)

## O que muda
| | Agente (GPT/Gem) | MCP |
|---|---|---|
| Como começa | nutri copia o Pacote da ficha e cola no GPT | nutri escreve "**@HoloHacking gere o Resultado da Marina**" |
| Dados | o que foi colado (pode estar desatualizado) | a IA busca no sistema, na hora |
| Volta para o sistema | copiar o JSON, colar, importar (erro = refazer) | a IA grava direto; o servidor valida |
| Segurança | o texto colado fica no histórico do GPT | chave pessoal, revogável; cada nutri só vê os próprios pacientes (RLS); conta pendente não usa |
| Resultado | mesma regra (contrato HOLOS_AI_RESULT v1, aceite automático) | **a mesma**: importar_holos_ai + aceitar + Resultado finalizado para revisão/emissão pela nutri |

## Arquitetura
- **Servidor MCP = Edge Function `holohacking-mcp`** (Supabase, Deno), transporte *Streamable HTTP* (POST JSON-RPC, resposta JSON).
  - `nucleo.js` (sem Deno, sem rede): protocolo MCP + ferramentas. Testado em Node contra o PostgreSQL local com TODAS as migrations.
  - `index.ts`: liga o núcleo ao banco real pela conexão `SUPABASE_DB_URL` (injetada pelo Supabase; nenhum segredo novo).
- **Identidade:** chave pessoal `hh_mcp_…` (gerada no Perfil, mostrada uma vez, só o hash SHA-256 fica no banco).
  - URL de conexão: `https://<projeto>.supabase.co/functions/v1/holohacking-mcp/<chave>` (ou `Authorization: Bearer <chave>`).
  - `mcp_identificar(hash)` (só o servidor) devolve a nutricionista se a chave não foi revogada e a conta está **ativa**.
- **Cada chamada roda COMO a nutricionista:** transação com `set local role authenticated` + `request.jwt.claims.sub = <uid>`.
  - Valem o mesmo RLS, os mesmos gatilhos (paciente arquivado, conta ativa) e as mesmas RPCs do app (`importar_holos_ai`, `aceitar_importacao_holos_ai`, `previa_resultado_holos`, `salvar_resultado_holos`).
- **Módulos do método reaproveitados:** `resultado-direcao.js`, `holos-ai-contrato.js`, `playbook-holos.js`, `sistemas-fechamento.js`, `resultado-sintese.js`.
  - Cópia idêntica em `supabase/functions/_shared/` (um teste confere que são idênticos).
- **Registro de uso:** cada ferramenta chamada fica em `mcp_usage_log` (sem conteúdo clínico), visível à nutri.

## Ferramentas do MCP
| Ferramenta | Faz |
|---|---|
| `buscar_pacientes` | encontra o paciente pelo nome (só ativos; nome e id, sem contatos) |
| `contexto_paciente` | o "Pacote" do agente, montado no servidor: atendimento, tipo (primeira/retorno), HOLOSCAN (5 sistemas, áreas prioritárias), ferramentas concluídas, Mapeamento, medidas, Resultado anterior, opções do Playbook (focos e estratégias) |
| `gerar_resultado` | recebe o JSON HOLOS_AI_RESULT v1 escrito pela IA; valida (mesmo contrato do agente); grava o Resultado HOLOS finalizado |
| `gerar_resultado_playbook` | caminho mais simples: foco + 2 a 4 estratégias do Playbook PB-V2 (ids) → Resultado gravado |
| `resultados_paciente` | versões do Resultado HOLOS (para conferir o que foi gravado) |
| `agenda` | consultas de um dia (preparar a consulta) |
| `estrategias_playbook` | consulta o Playbook por sistema (focos, estratégias, cuidados) |

Prompt pronto (`prompts/list`): **gerar_resultado** — "gere o Resultado HOLOS de <paciente>".

## O que NÃO faz (de propósito)
- Não emite o Resultado Final nem envia ao paciente: a nutricionista revisa e emite no app.
- Não manda nome, telefone, e-mail ou data de nascimento no contexto clínico (iniciais e idade, como o Pacote).
- Não grava HOLOSCAN, anamnese, agenda ou cadastro (fica para uma próxima etapa).
- Não funciona para conta pendente/recusada.

## Entregas
1. Migration `20261027100000_mcp_chaves.sql` + harness SQL.
2. Edge Function `supabase/functions/holohacking-mcp/` (núcleo + index) + `_shared/`.
3. Perfil: gerar/revogar a chave e ver a URL de conexão + passo a passo.
4. Testes: banco (PG local), protocolo e ferramentas ponta a ponta (PG local), tela (servidor falso), suíte.
5. Deploy: SQL em partes para o SQL Editor + `supabase functions deploy holohacking-mcp --no-verify-jwt`.
