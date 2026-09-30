# Exportação do relatório — texto, PDF ou link?

Referência: commit `40ea4ce` (branch da Rodada 08).

## Resposta curta

| Formato | Existe? | Onde |
|---|---|---|
| **PDF** | **Sim, pelo navegador.** O botão "Imprimir ou salvar em PDF" chama `window.print()`; o PDF sai do diálogo de impressão do navegador ("Salvar como PDF"). O app não gera PDF por conta própria. | botão `arquivos.js:1191-1192`; ação `arquivos.js:1466`; CSS de impressão (só o relatório vai para o papel) `style.css:3472-3496` e `style.css:3012-3015` |
| **Texto do relatório** | **Não existe.** Não há botão nem função que copie o relatório em texto. | busca: `innerText` e `clipboard` em `arquivos.js` → 0 ocorrências |
| **Link** | **Não existe.** Nada gera link público ou compartilhável do relatório. | busca por `navigator.share`, `createSignedUrl`, `jspdf`, `html2canvas`, `pdfmake` em todos os `.js`/`.html` → 0 ocorrências |

## O que existe perto disso (e não é o relatório)

1. **Contexto da HOLOS AI em texto** — ficha → aba HOLOS AI → "Caso completo" →
   "Copiar contexto" (`holos-ai.js:340-351` monta; `holos-ai.js:513-535` copia
   com `navigator.clipboard`). É **outro** texto: traz dados do paciente,
   HOLOSCAN, exames com valores, Leitura Integrada, consultas, OQ³, PQQ, Mapa do
   Propósito, ferramentas e evolução, mas **não** traz as seções do relatório na
   forma da tela, a interpretação profissional, as frases de fronteira nem os
   documentos.
2. **"Exportar dados"** na ficha (`index.html:820`; `app.js:1000-1033` e
   `reunirDadosPaciente()` logo abaixo) — baixa um **JSON** com os dados
   clínicos do paciente (com conta, o HOLOSCAN vem do servidor, aplicação por
   aplicação). É arquivo de dados, não texto legível do relatório.

## O que falta para o nutricionista copiar o relatório inteiro em texto

Um botão **"Copiar relatório em texto"** na barra do relatório
(`arquivos.js:1182-1193`), que monte o texto a partir do `#relatorio` já
desenhado. Pontos que precisam de cuidado, porque `innerText` sozinho erra:

1. **Seção E no registro "Para a nutricionista"** é um `<textarea>`
   (`arquivos.js:1355-1361`); `innerText` não inclui o valor do campo — é
   preciso ler `#rel-interpretacao.value` (ou usar o texto salvo).
2. **Seção D é assíncrona**: nasce com "Carregando…" e só depois é preenchida
   (`arquivos.js:1344`, `arquivos.js:1398-1414`). O botão precisa esperar essa
   leitura, ou refazer a lista antes de copiar.
3. **O selo "escrito pela nutricionista"** é CSS (`::after`,
   `style.css:1556-1557`) e não entra em `innerText`; tem de ser escrito no texto.
4. **Logo, assinatura e carimbo** são imagens: no texto, virar "(assinatura)" /
   "(carimbo)" ou sair.
5. **Registro**: decidir se o texto copiado segue o registro escolhido
   ("nutricionista" × "paciente") — hoje a única diferença é a seção E.
6. **Cópia**: `navigator.clipboard.writeText`, com a mesma saída de erro da HOLOS
   AI (`holos-ai.js:513-535`) para quando o navegador recusar.
7. **Teste** automatizado conferindo que as seções 1–7 do
   [`mapa-do-relatorio.md`](./mapa-do-relatorio.md) aparecem no texto copiado.

Tamanho estimado: uma função em `arquivos.js` (~40 linhas) + um teste. **Não foi
feito nesta rodada** (rodada só de leitura e documentação).
