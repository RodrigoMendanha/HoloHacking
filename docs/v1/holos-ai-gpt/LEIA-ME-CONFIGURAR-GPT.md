# Como criar o GPT "HOLOS AI" (copiar e colar)

ChatGPT → **Explorar GPTs** → **Criar** → aba **Configurar**.

| Campo | O que colocar |
|---|---|
| **Nome** | `HOLOS AI` |
| **Descrição** | `Analisa o Pacote HOLOS AI do atendimento gerado pelo HoloHacking e devolve direcionamentos, estratégias e pontos de observação para a nutricionista confirmar. Não diagnostica nem prescreve.` |
| **Instruções** | o texto **inteiro** de `00-INSTRUCOES-GPT.md` (5,8 mil caracteres; o limite do GPT é 8 mil) |
| **Iniciadores de conversa** | `Analise este Pacote HOLOS AI (anexo o PDF)` · `Analise este Pacote de RETORNO` · `Refaça o PDF com os ajustes que vou indicar` |
| **Conhecimento** (enviar os arquivos) | `01-REGRAS-E-FORMATO.md`, `02-SISTEMAS-E-FERRAMENTAS.md`, `03-EXEMPLO-PACOTE-E-RESULTADO.md`, `04-ESPECIFICACAO-HOLOS-AI.md`, `holos_ai_pdf.py`, `exemplo-dados.json` (+ os livros/aulas oficiais do método, quando houver) |
| **Recursos** | ✅ **Code Interpreter & Data Analysis** (obrigatório: gera o PDF) · ❌ Navegação na web · ❌ Geração de imagens |
| **Ações** | nenhuma |
| **Compartilhamento** | "Somente pessoas com o link" (ou só você, durante o piloto) |

## Uso
1. No HoloHacking, gere o Pacote HOLOS AI do atendimento (PDF).
2. Abra o GPT HOLOS AI e envie o PDF.
3. O GPT devolve no chat o bloco `HOLOS_AI_RESULT` e o link do PDF final:
   - **Parte A:** o Pacote inteiro, transcrito e organizado.
   - **Parte B:** a análise.
   - **Parte C:** fontes, alertas e o que faltou.
4. Revise cada item: **Confirmar / Editar / Descartar**. Só o que você confirmar vai para o Resultado HOLOS da paciente.

## Teste rápido antes de usar com paciente real
Envie ao GPT o caso fictício da seção 1 de `03-EXEMPLO-PACOTE-E-RESULTADO.md`. Confira cinco pontos:
- **Formato:** a resposta segue o formato do bloco `HOLOS_AI_RESULT`.
- **Sem diagnóstico:** nenhum termo diagnóstico aparece afirmado.
- **Sem prescrição:** nenhuma estratégia vira prescrição.
- **Rastreabilidade:** todo direcionamento e toda estratégia têm "Baseado em".
- **PDF completo:** o PDF tem as 3 partes e o Pacote inteiro na Parte A.

## Versões
- **Agente:** `HOLOS-AI-GPT 1.0` (13/10/2026).
- **Textos dos sistemas:** HOLOS-V1 v7.
- **Catálogos:** ainda não homologados. Por isso, todo direcionamento e toda estratégia saem como "CANDIDATO NÃO CATALOGADO — requer validação profissional".
- **Quando houver catálogo oficial:** anexe-o ao Conhecimento do GPT e atualize a versão.
