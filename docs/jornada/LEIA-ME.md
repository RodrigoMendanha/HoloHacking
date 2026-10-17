# Jornada da Nutricionista com a Paciente — primeiro modelo (outubro de 2026)

Documento de apresentação de **como conduzir um acompanhamento de Nutrição Holística usando o HoloHacking**, ao longo de um ciclo de até 10 atendimentos. Escrito a partir de uma auditoria do sistema real (pacote metodológico HOLOS-V1 v6, catálogo PP-V1). Todas as pessoas, telas e dados de exemplo são **fictícios**.

## Arquivos

| Arquivo | O que é |
|---|---|
| `JORNADA-DA-NUTRICIONISTA-HOLOHACKING.md` | **Fonte editável** (Markdown). Toda mudança começa aqui. |
| `JORNADA-DA-NUTRICIONISTA-HOLOHACKING.html` | Versão diagramada (A4, identidade HoloHacking), gerada a partir do Markdown. |
| `JORNADA-DA-NUTRICIONISTA-HOLOHACKING.pdf` | PDF para leitura e apresentação (66 páginas A4, capa sem número). |
| `JORNADA-DA-NUTRICIONISTA-HOLOHACKING.docx` | Versão editável em Word, com o mesmo conteúdo e estilos na paleta do HoloHacking (diagramação simplificada). |
| `imagens/` | Logo (pinha oficial do projeto) e 17 capturas reais do sistema com pacientes fictícias. |

Para gerar de novo, depois de editar o Markdown:

```
python3 scripts/doc-jornada/build.py        # Markdown -> HTML
node scripts/doc-jornada/pdf.mjs            # HTML -> PDF (Chromium)
python3 scripts/doc-jornada/paginar.py      # números de página (capa sem número)
python3 scripts/doc-jornada/gerar_docx.py   # HTML -> DOCX (python-docx + beautifulsoup4)
```

## Imagens

| Imagem | Tela |
|---|---|
| `logo-pinha.png` | Logo oficial (`/logo-holohacking.png`, 256 px) |
| `01-ficha-paciente.png` | Ficha da paciente: cabeçalho, atendimento ativo, jornada clínica |
| `02b-mapeamento-link.png` | Link do Mapeamento gerado (o link de teste foi trocado por um ilustrativo) |
| `02-mapeamento-celular.png` | Mapeamento no celular, etapa 1 |
| `03-mapeamento-recebido.png` | Respostas recebidas na ficha |
| `14-mapeamento-retorno.png` | Mapeamento de retorno no celular |
| `04-holoscan-questionario.png` | Questionário HOLOSCAN em andamento |
| `05-holoscan-resultado.png` | "Resultado desta aplicação" e "Por onde investigar" |
| `06-proximos-passos.png` | Próximos Passos HOLOS (PP-V1) |
| `07-ferramentas-corpo.png` | Galeria das ferramentas do Corpo |
| `08-rh-profissional-decisao.png` | Resultado HOLOS profissional: topo e Resumo para decisão |
| `09-rh-sintese.png` | Síntese HOLOS |
| `10-paciente-areas.png`, `10b-paciente-entendemos.png` | Visão da paciente: áreas e resumo |
| `11-paciente-combinado.png` | Visão da paciente: foco, combinado, o que observar |
| `12-resultado-final-emitido.png` | Resultado Final emitido (PDF, WhatsApp, Imprimir) |
| `13-pdf-paciente-p1.png`, `13-pdf-paciente-p2.png` | Páginas do PDF que a paciente recebe |

## O que é do sistema atual e o que é visão futura

Tudo o que o documento descreve como função do HoloHacking foi conferido no código e na tela. Os pontos de **visão futura** estão marcados no texto com a caixa "Visão futura / experiência desejada" e reunidos no capítulo "Visão futura":

1. Ciclo de atendimentos no sistema (contagem, marcos, "ciclo atual").
2. Síntese do Ciclo como documento próprio.
3. Regra oficial de periodicidade do HOLOSCAN.
4. Comparação metodológica entre aplicações (diferenças de nota, Índice e Tríade).
5. Acompanhamento entre consultas pela paciente (registro de acordos, lembretes).
6. Envio do Resultado por link.
7. HOLOS AI integrada (hoje só monta e copia o contexto).
8. Estados de consulta na Agenda (confirmada, realizada, faltou).
9. Sugestão automática de data de retorno (foi retirada).
10. Textos aprovados de "por que usamos" e "o que significa" para todas as ferramentas.

## Achados no produto durante a auditoria (não corrigidos nesta tarefa)

- A aba "Ferramentas" da ficha ainda diz "84 respostas" (o HOLOSCAN vigente coleta 81).
- No tema escuro, parte do conteúdo de algumas abas da ficha (Ferramentas, Evolução) fica com contraste baixo.
- `perfil.js` ainda menciona "Calcula o retorno de 4 semanas…", função que foi retirada.
- O Mapeamento de primeira consulta tem 5 etapas + revisão; documentos antigos citam "8 etapas".
