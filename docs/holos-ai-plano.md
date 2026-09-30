# HOLOS AI — estado atual e plano (rodada 08, onda 9)

**Decisão desta rodada:** não há especificação oficial da HOLOS AI. Por isso
**nenhum provedor foi integrado** e nenhuma arquitetura nova foi criada. O que
esta rodada fez foi tirar botão morto da tela e deixar o contexto clínico
correto para quando a integração vier.

## O que existe hoje

| Peça | Estado |
|---|---|
| Aba **HOLOS AI** na ficha (`holos-ai.js`) | Gera o **contexto** do paciente em texto (caso completo, HOLOSCAN, exames, evolução) para copiar. Nada é enviado a lugar nenhum. |
| Botões "HOLOS AI no ChatGPT / Gemini" | Sem URL configurada (`HOLOS_AI_URLS` vazio). Agora aparecem **"Em desenvolvimento"**, com `aria-disabled` e sem link. Ganham link com `window.HolosAI.configurarUrls({ chatgpt, gemini })`. |
| Edge Function `holos-ai` (`supabase/functions/holos-ai`) | **Inerte**: responde 503 `HOLOS_AI_NAO_CONFIGURADA`, não lê secret, não lê tabela, não lê o corpo do pedido. O front não a chama. |
| Tabelas `ai_threads` / `ai_messages` | Existem (migration 20260923180000), com RLS por nutricionista. Nenhuma tela grava nelas. |
| `Holos AI/README.md` | Conceito (entrada → 5 sistemas → pontuação → padrões → resumo). Os bancos que a IA pressupõe ainda são, na maior parte, exemplo de formato — não o método. |

Contexto gerado (corrigido nesta rodada, onda 8): dados do paciente; mapa
HOLOSCAN atual com ausência explícita ("sem dado", "dados insuficientes");
exames com nome, resultado, unidade, data e faixa; Leitura Integrada;
consultas; OQ³, PQQ e Mapa do Propósito; Linha do Momentum, Mapa de Crenças,
Roda Holística da Vida e Carta ao Futuro; evolução entre aplicações.

## O que precisa ser decidido antes de integrar (não é técnico)

1. **Especificação do agente**: o que ele pode e não pode dizer (fronteira
   "não diagnostica, não prescreve"), tom, formato da resposta, idioma.
2. **Provedor e contrato**: qual modelo, onde roda, quem paga, retenção de
   dados pelo provedor, base legal para enviar dado de saúde (LGPD, dado
   sensível), consentimento do paciente.
3. **Validação do método**: os bancos que a IA usaria precisam estar
   homologados pela responsável pelo método — hoje não estão.

## Plano técnico, quando (e se) houver especificação

1. **Servidor, nunca navegador**: a chamada ao provedor mora na Edge Function
   `holos-ai`; a chave fica em secret do Supabase; o front só chama a função
   com o JWT da sessão. Nenhuma chave no frontend.
2. **Mínimo necessário**: a função monta o contexto a partir das tabelas
   (sob o uid do JWT), sem nome, e-mail ou telefone do paciente — só o dado
   clínico estruturado. O texto de contexto da aba já é o formato de partida.
3. **Registro**: pergunta e resposta vão para `ai_threads`/`ai_messages`,
   com versão do contexto e do modelo; sem dado clínico em `metadata`.
4. **Guardrails**: filtro de escopo na saída (o motor já tem um guardrail
   de escopo em `Holos AI/motor`), limite de tamanho, timeout e mensagem
   humana quando o provedor falhar.
5. **Testes**: função com provedor falso (como `testes/supabase-falso.mjs`),
   testes de RLS nas tabelas de conversa, teste de que nenhuma chave aparece
   no bundle servido.
6. **Liga/desliga**: variável de ambiente na função; enquanto desligada,
   continua o 503 de hoje e a tela continua "Em desenvolvimento".
