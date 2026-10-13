# Como criar o GPT "HOLOS AI" (copiar e colar)

ChatGPT → **Explorar GPTs** → **Criar** → aba **Configurar**.

| Campo | O que colocar |
|---|---|
| **Nome** | `HOLOS AI` |
| **Descrição** | `Lê o Pacote HOLOS AI (ou o PDF do Resultado HOLOS) exportado pelo HoloHacking e devolve a análise do atendimento em texto legível + JSON importável: sistemas prioritários, ferramentas do catálogo PP-V1, direcionamentos, estratégias, acompanhamento e roteiro do retorno. Tudo é sugestão para a nutricionista confirmar. Não diagnostica nem prescreve.` |
| **Instruções** | o texto **inteiro** de `00-INSTRUCOES-GPT.md` (6,3 mil caracteres; o limite do GPT é 8 mil) |
| **Iniciadores de conversa** | `Analise este atendimento (anexo o Pacote HOLOS AI)` · `Analise este Resultado HOLOS (anexo o PDF)` · `Analise este retorno` · `Gere o PDF de conferência desta análise` |
| **Conhecimento** (enviar os arquivos) | `01-REGRAS-E-FORMATO.md`, `02-SISTEMAS-E-FERRAMENTAS.md`, `03-EXEMPLO-PACOTE-E-RESULTADO.md`, `04-ESPECIFICACAO-HOLOS-AI.md`, `05-CATALOGO-FERRAMENTAS-PP-V1.md`, `06-SCHEMA-HOLOS-AI-RESULT.json`, `exemplo-resultado.json`, `exemplo-entrada-transcrita.json`, `holos_ai_pdf.py` (+ os livros/aulas oficiais do método, quando houver). **Remova** os arquivos da 1.1 que não existem mais: `exemplo-dados.json` e o PDF antigo. |
| **Recursos** | ✅ **Code Interpreter & Data Analysis** — **recomendado** (valida o JSON e gera o PDF de conferência). Sem ele, o GPT entrega o texto e o JSON normalmente. · ❌ Navegação na web · ❌ Geração de imagens |
| **Ações** | nenhuma |
| **Compartilhamento** | "Somente pessoas com o link" (ou só você, durante o piloto) |

## O que o GPT devolve
1. **HOLOS_AI_RESULT legível:** a análise para a nutricionista ler.
2. **JSON estruturado** (`schema_version: 1`): o mesmo conteúdo, pronto para o HoloHacking importar.
3. **PDF de conferência:** só quando você pedir. Ele **não é o documento oficial**.
   - O PDF oficial da paciente é gerado pelo HoloHacking, depois que você revisa e confirma a análise importada.
   - Se o PDF falhar, nada se perde: o texto e o JSON são a saída oficial.

**Entrada:**
- Envie o Pacote HOLOS AI, o PDF do Resultado HOLOS ou os dois.
- Com os dois, o Pacote prevalece.
- O PDF sozinho funciona como fallback temporário.

## Uso
1. No HoloHacking, exporte o Pacote HOLOS AI do atendimento (ou baixe o PDF do Resultado HOLOS).
2. Abra o GPT HOLOS AI e envie o documento.
3. Leia o bloco legível. Se a resposta for cortada antes do fim do JSON, escreva `continuar`.
4. Copie o bloco JSON para importar no HoloHacking.
   - A importação no HoloHacking ainda será construída numa fase própria do plano mestre.
   - Até lá, use o texto legível para revisar.
5. Revise cada item: **Confirmar / Editar / Descartar**. Só o que você confirmar vai para o Resultado HOLOS da paciente.

## Teste rápido antes de usar com paciente real
Envie ao GPT o PDF do Resultado HOLOS da "Paciente Teste T5 Fictícia". Compare a resposta com `03-EXEMPLO-PACOTE-E-RESULTADO.md` e `exemplo-resultado.json`, conferindo estes pontos:
- **Duas partes:** veio o bloco `HOLOS_AI_RESULT` **e** um bloco ```json``` com `schema_version: 1` e todas as chaves.
- **Primeira consulta:** a estratégia acordada aparece como "MANTER EM OBSERVAÇÃO — SUGERIDO", não como "MANTER".
- **Ferramentas:** até 3, com ID REC-…, sem repetir e sem o Mapa da Rotina, que já foi concluído.
- **Territórios:** Espírito aparece como "Ainda não aprofundado nesta etapa.", sem estratégia inventada.
- **Classificação:** cada estratégia diz se é observação, comportamental/metodológica ou se requer decisão profissional na Conduta.
- **Segurança:**
  - nenhum termo diagnóstico afirmado;
  - nenhuma estratégia virou prescrição;
  - tudo tem "Baseado em".

Se o Code Interpreter estiver ligado, peça: `rode validar_resultado no JSON`. A resposta esperada é uma lista vazia, `[]`.

## Versões
- **Agente:** `HOLOS-AI-GPT 1.2` (13/10/2026). Mudanças da 1.2:
  - saída canônica = texto legível + JSON (`schema_version: 1`);
  - PDF só de conferência e opcional;
  - Pacote prevalece sobre o PDF;
  - até 3 ferramentas (PP-V1, sem duplicata, sem as concluídas no encontro);
  - Corpo/Mente/Espírito sem preenchimento forçado;
  - estratégias classificadas;
  - "MANTER EM OBSERVAÇÃO — SUGERIDO" na primeira consulta.
- **Schema da saída:** `06-SCHEMA-HOLOS-AI-RESULT.json`, versão 1. Qualquer mudança de campo vira `schema_version: 2`.
- **Textos dos sistemas:** HOLOS-V1 v7.
- **Ferramentas:** catálogo homologado HOLOS-RECOMENDACOES-V1 (arquivo 05).
- **Direcionamentos e estratégias:** ainda sem catálogo homologado. Por isso, saem como "CANDIDATO NÃO CATALOGADO — requer validação profissional".

## Se o PDF de conferência não sair
- Isso **não impede** o uso: o texto e o JSON continuam valendo.
- **Para ativar o PDF:**
  1. Abra o GPT → **Editar** → **Configurar** → **Recursos**.
  2. Marque **Code Interpreter & Data Analysis** e salve.
  3. Confirme que `holos_ai_pdf.py` está no Conhecimento.
- **Migração para plugins:** o ChatGPT avisou que os GPTs precisam ser migrados para plugins até 11/12. Ao migrar, mantenha o mesmo nome, as Instruções e os arquivos.
