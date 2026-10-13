# Como criar o GPT "HOLOS AI" (copiar e colar)

ChatGPT → **Explorar GPTs** → **Criar** → aba **Configurar**.

| Campo | O que colocar |
|---|---|
| **Nome** | `HOLOS AI` |
| **Descrição** | `Lê o Resultado HOLOS (ou o Pacote HOLOS AI) exportado pelo HoloHacking e gera o Resultado Completo em PDF: leitura dos sistemas, ferramentas do catálogo, direcionamentos, estratégias, plano e roteiro do retorno, para a nutricionista confirmar. Não diagnostica nem prescreve.` |
| **Instruções** | o texto **inteiro** de `00-INSTRUCOES-GPT.md` (4,9 mil caracteres; o limite do GPT é 8 mil) |
| **Iniciadores de conversa** | `Gere o Resultado Completo deste Resultado HOLOS (anexo o PDF)` · `Analise este retorno` · `Refaça o PDF com os ajustes que vou indicar` |
| **Conhecimento** (enviar os arquivos) | `01-REGRAS-E-FORMATO.md`, `02-SISTEMAS-E-FERRAMENTAS.md`, `03-EXEMPLO-PACOTE-E-RESULTADO.md`, `04-ESPECIFICACAO-HOLOS-AI.md`, `05-CATALOGO-FERRAMENTAS-PP-V1.md`, `holos_ai_pdf.py`, `exemplo-dados.json` (+ os livros/aulas oficiais do método, quando houver) |
| **Recursos** | ✅ **Code Interpreter & Data Analysis** — **obrigatório**: é ele que gera o PDF. Sem ele, o GPT entrega um HTML para você salvar como PDF pelo navegador. · ❌ Navegação na web · ❌ Geração de imagens |
| **Ações** | nenhuma |
| **Compartilhamento** | "Somente pessoas com o link" (ou só você, durante o piloto) |

## Uso
1. No HoloHacking, baixe o PDF do Resultado HOLOS (ou o Pacote HOLOS AI) do atendimento.
2. Abra o GPT HOLOS AI e envie o PDF.
3. O GPT devolve no chat o bloco `HOLOS_AI_RESULT` e o link do PDF final:
   - **Parte A:** o documento enviado inteiro, transcrito e organizado.
   - **Parte B:** o Resultado Completo (sistemas, ferramentas, direcionamentos, estratégias, plano, roteiro e texto para a paciente).
   - **Parte C:** fontes, alertas e o que faltou.
4. Revise cada item: **Confirmar / Editar / Descartar**. Só o que você confirmar vai para o Resultado HOLOS da paciente.

## Teste rápido antes de usar com paciente real
Envie ao GPT o PDF do Resultado HOLOS da "Paciente Teste T5 Fictícia" e compare com `03-EXEMPLO-PACOTE-E-RESULTADO.md` e com `HOLOS-AI_PACIENTE-TESTE-T5_2026-10-13.pdf`. Confira cinco pontos:
- **Formato:** a resposta segue o formato do bloco `HOLOS_AI_RESULT`.
- **Sem diagnóstico:** nenhum termo diagnóstico aparece afirmado.
- **Sem prescrição:** nenhuma estratégia vira prescrição.
- **Rastreabilidade:** todo direcionamento e toda estratégia têm "Baseado em".
- **PDF completo:** o PDF tem as 3 partes e o Pacote inteiro na Parte A.

## Versões
- **Agente:** `HOLOS-AI-GPT 1.1` (13/10/2026). Mudanças da 1.1: aceita o PDF do Resultado HOLOS; entrega o Resultado Completo (ferramentas pelo catálogo PP-V1, 3 a 5 estratégias em Corpo/Mente/Espírito, plano, roteiro, texto para a paciente); PDF obrigatório, com HTML de reserva.
- **Textos dos sistemas:** HOLOS-V1 v7.
- **Ferramentas:** catálogo homologado HOLOS-RECOMENDACOES-V1 (arquivo 05).
- **Direcionamentos e estratégias:** ainda sem catálogo homologado. Por isso, saem como "CANDIDATO NÃO CATALOGADO — requer validação profissional".
- **Quando houver catálogo oficial:** anexe-o ao Conhecimento do GPT e atualize a versão.

## Se o PDF não sair
1. **Verifique o Code Interpreter:** abra o GPT → **Editar** → **Configurar** → **Recursos**. Confirme que **Code Interpreter & Data Analysis** está marcado e salve.
2. **Verifique o Conhecimento:** confira se `holos_ai_pdf.py` está entre os arquivos.
3. **Migração para plugins:** o ChatGPT avisou que os GPTs precisam ser migrados para plugins até 11/12. Ao migrar, mantenha o mesmo nome, as Instruções, os arquivos e o recurso Code Interpreter ligado.
