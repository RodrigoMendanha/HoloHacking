# CORREÇÕES PÓS-TESTE MR-V1 (13/10)

Estas correções vêm do teste controlado em produção com a paciente fictícia "Carla Ficticia" (Cowork, 13/10).

Esta rodada **não** altera:
- o cálculo do HOLOSCAN, as notas e as faixas;
- o Índice e a Tríade;
- as associações e os pesos;
- o PP-V1;
- o catálogo e a Conduta;
- o banco/SQL.

Também não publica o HOLOSCAN v3 e não inicia o PP-V2. O código de `proximos-passos.js`, `metodologia*.js`, `holoscan*.js` e `supabase/` está idêntico ao de `43d0759`.

## Parte A — correções técnicas / UX

| # | Pedido | Causa encontrada | Correção |
|---|---|---|---|
| 1 | Contraste do PDF | A conta usa o **tema escuro**. O documento da paciente (papel creme) usava as variáveis de cor do tema, então rótulos, intros, descrições e nomes de ferramenta saíam creme ou dourado-claro sobre creme (contraste 1,1). Os testes rodavam no tema claro. | `.rp-doc` fixa as cores do tema claro (texto e rótulos em verde-escuro, contraste ≥ 5); o rótulo "Resultado da ferramenta" passou de dourado para verde-escuro. O dourado ficou só na identidade: "HOLOHACKING · HOLOSCAN", "RESULTADO HOLOS", filete. A interface escura não mudou. Commit `43d0759` + esta rodada. |
| 2 | 6ª página (só assinatura e rodapé) | Reproduzido com assinatura e carimbo no perfil e textos como os do teste: 6 páginas. | Margem do PDF = a do jsPDF (12 mm), sem somar o padding da tela; espaço entre seções menor; rodapé com assinatura/carimbo **ao lado** do texto (antes ficava empilhado); radar um pouco menor. **Fonte não reduzida.** Resultado: 5 páginas, rodapé na página 5. |
| 3 | Densidade (página 4 com cerca de 40% vazia) | A quebra automática do html2pdf movia blocos inteiros. Ela deixava título sozinho no fim da página, moldura de cartão vazia e página com metade vazia. | Paginação própria (`ResultadoPagina.paginar`) na cópia que o html2pdf monta (o documento da tela e o HTML da emissão não mudam). Detalhes abaixo da tabela. No caso Carla, as páginas 1–4 ficam cheias e só a 5ª, a última, termina antes do fim. |
| 4 | "Último relatório emitido: nenhum emitido" depois do Resultado Final nº 1 | **São objetos diferentes.** O Relatório profissional (`report_emissions`, aba Relatório) e o Resultado Final da paciente (`holos_result_emissions`, página Resultado) são tabelas e conceitos distintos. A consulta estava certa. | Nomenclatura: "Último relatório profissional (aba Relatório): nenhum relatório profissional emitido. O Resultado Final da paciente fica na página Resultado." Os dois conceitos continuam separados. |
| 5 | Mapa de Frequências | O cartão "Mapa de Frequências — em revisão" aparecia entre as subferramentas do HOLOSCAN. | Cartão com `hidden`: fica fora da interface, sem apagar código nem dados (a regra `mapa_frequencias_ativo = nao` continua). |
| 6 | Frase pós-HOLOSCAN | Frase causal e mística no fim da seção HOLOSCAN. | "HOLOSCAN concluído. Revise as áreas prioritárias e os próximos aprofundamentos sugeridos antes de seguir para as ferramentas." |
| 7 | Próximos aprofundamentos (paciente) | O sistema mostrava "Principal:" mesmo quando a ferramenta era complementar no motor global. | **Resumo:** "Próximo aprofundamento sugerido: [principal do PP-V1]" e "Outras possibilidades: [complementares]. Nenhuma é obrigatória…". **Cartão do sistema:** "Ferramenta que pode ajudar a aprofundar este eixo: X" (ou "Ferramentas que podem ajudar…: X e Y", na ordem do catálogo), sem "Principal". O PP-V1 e a visão profissional (catálogo/rank) não mudaram. |

**Regras da paginação própria (item 3)**
- blocos pequenos não quebram;
- título, intro e rótulo vão junto com o bloco seguinte;
- quando o bloco que cruzaria a página é o começo de um cartão, vai o cartão inteiro;
- cartão grande quebra só entre blocos;
- o título "O que descobrimos com as ferramentas" fica no mesmo grupo do primeiro eixo.

## PDF Carla final (reprodução fiel ao teste)

Condições: tema escuro, assinatura e carimbo, textos do Mapa da Rotina iguais aos do teste.

| Caminho | Resultado |
|---|---|
| Baixar PDF | **5 páginas** |
| Imprimir | **5 páginas** |

Conferência página por página:
- nenhuma página em branco;
- radar presente;
- sem sobreposição;
- sem título sozinho e sem moldura vazia;
- páginas 1–4 cheias;
- rodapé e assinatura só no fim;
- contraste legível.

Arquivos em `docs/v1/motor-resultados/pos-teste/`:
- `pdf-carla-final-baixado.pdf` e `pdf-carla-final-impresso.pdf`, mais `pdf-*-todas-as-paginas.png`;
- `antes-contraste-tema-escuro-p1.png`: o problema reproduzido;
- capturas 1–8 (profissional e paciente);
- `10-ficha-visao-ultimo-relatorio.png`: o rótulo novo;
- `11-holoscan-subferramentas-sem-mapa-frequencias.png`;
- `12-holoscan-frase-final.png`.

## Testes

**Novos**, em `testes/testar-resultado-ux-paciente.mjs`:
- tema escuro: contraste ≥ 4,5 nos rótulos do documento da paciente (falha sem a correção: 1,1);
- paginação própria no documento real: nenhum bloco cruza o fim da página e nenhum título fica sozinho;
- "Próximo aprofundamento sugerido" = principal do PP-V1, e "Outras possibilidades" = complementares;
- cartão do sistema sem "Principal";
- frase pós-HOLOSCAN nova presente e a antiga ausente.

**Ajustados:**

| Teste | Mudança |
|---|---|
| `testar-frequencias` | cartão fora da interface |
| `testar-v1-etapa3` | rótulo do relatório profissional |
| `testar-resultado-final` e `testar-prontuario` | o html2pdf falso aceita `toContainer/then` |
| `testar-resultado-sintese`, `testar-correcoes-jornada`, `testar-resultado-final` | textos novos dos próximos aprofundamentos |
| `testar-ferramentas-resultado` | o título de "O que descobrimos" dentro do primeiro eixo |

**PP-V1 idêntico:** `testar-resultado-sintese` confere as 30 relações Sistema → Ferramenta e os ranks.

**Hashes:** `docs/deploy.md` §3.5 atualizado (7 arquivos servidos mudaram).

## Parte B

Ver `docs/v1/AUDITORIA-ASSOCIACOES-HOLOSCAN-V2.md`: só leitura, nenhuma associação alterada.

**PARE.** Nenhum SQL e nenhum deploy desta rodada. O frontend corrigido precisa de deploy autorizado (VPS, script com o commit novo).
