# Como o método lê cada seção do relatório

Para o agente **"Nutrição Holística — Nutri"**. Companheiro de
[`mapa-do-relatorio.md`](./mapa-do-relatorio.md): mesma ordem de seções.

**Regra deste documento:** só entra o que está escrito no código, nos textos do
app ou nos docs do repositório, com arquivo:linha. O que não está escrito em
lugar nenhum foi para a lista **"Perguntar ao Rodrigo"**, no fim. Referência de
linha: commit `40ea4ce` (branch da Rodada 08).

## Antes de tudo: o que existe (e o que não existe) no repositório

- **O livro não está no repositório.** Ele é a fonte do método — "Tríade do Ser,
  ciclo PSAM, os 5 A's, as 6 tarefas, holismo, ressignificação de 'dieta' e
  'nutrir'" (`motor/README.md:296-298`) — mas o texto fica fora do git
  (`motor/corpus/fontes/README.md:6-7`; registro em `motor/corpus/fontes.csv:2`).
  Por isso **Tríade do Ser** e **ciclo PSAM** aparecem no repositório só pelo
  nome (`motor/README.md:297`; `motor/bancos/perguntas.csv:2-3`, que diz que o
  PSAM está no "capítulo 3"). O conteúdo deles não está escrito aqui.
- **"O livro não fala dos 5 sistemas"**: zero ocorrências de Fúngico,
  Ácido-Inflamatório, HOLOSCAN e Índice HOLOS nas 145 páginas; os 5 sistemas
  são construção separada, do material comercial de 11/08 e dos bancos em CSV
  (`motor/README.md:292-299`).
- **Quase tudo que liga resposta a leitura está em `rascunho`**: 51 sintomas,
  19 emoções, 16 itens espirituais, 30 mensagens, 24 exames e 15 das 16
  combinações têm `status = rascunho` nos CSVs de `motor/bancos/`. As definições
  dos sistemas dizem "rascunho 13/09 — aguarda revisão do Rodrigo"
  (`motor/bancos/sistemas.csv:2-6`).
- A **Tríade** que o app mostra se chama **"Tríade HOLOS"** (`index.html:624-625`,
  `app.js:3132-3148`). Em nenhum lugar o repositório diz que ela é a mesma coisa
  que a **Tríade do Ser** do livro.

### O que o app diz sobre o método como um todo

- Olhar · Questionar · Compreender: "Enxergar o ser humano por inteiro: o que
  ele quer, o que precisa e o que consegue sustentar." / "Investigar os porquês
  profundos por trás das metas, acessando valores, crenças, emoções e
  histórias." / "Reunir tudo em um mapa claro: direção para o paciente e um
  plano que realmente pode ser vivido." (`index.html:370-386`)
- "Transformação não acontece apenas quando existe conhecimento. Ela acontece
  quando desejo, necessidade e capacidade caminham juntos e quando o propósito
  por trás dos objetivos fica claro." (`index.html:368`)
- "Nem sempre o melhor plano é o mais completo. O melhor plano é aquele que o
  paciente consegue transformar em vida." (`index.html:389`)
- Fluxo clínico: História → HOLOSCAN → Leitura Integrada → Aprofundamento →
  Interpretação → Conduta → Evolução, "só como referência visual — não é um
  wizard, nenhuma etapa bloqueia a seguinte" (`index.html:434-436`, `index.html:660`).
- "O HOLOSCAN não é uma lista de perguntas": o que separa formulário de anamnese
  é a pergunta que vem depois da resposta alta — o "passo 4 do método"
  (`app.js:2799-2803`).
- O HOLOSCAN "não interpreta sintoma como diagnóstico definitivo" e "deve dizer
  quando sugerir encaminhamento" — citado como regra do método em
  `motor/src/tipos.ts:147-153` e `app.js:2760-2769`.
- As quatro prioridades do método para um sinal — **acompanhar, aprofundar,
  correlacionar, encaminhar** — são atribuídas pela nutricionista, não pelo
  sistema (`resultado-corpo.js:292-299`, `render-resultado.js:168-170`).
- "O que o sistema mostra acima é observação. A interpretação é sua, e é ela que
  fecha a aplicação." (`formulario.js:293-294`)

---

## 1. Cabeçalho (data, cobertura, fronteira)

- **O que o método conclui:** nada clínico. A cobertura diz quanto do
  questionário foi respondido; a nota passou a ser calculada só sobre o que
  foi respondido, e "`cobertura` diz o quanto disso ela respondeu"
  (`motor/src/motor.ts:167-171`). A fronteira fixa diz o que o documento é
  (ver `limites.md`).
- **Esfera da Tríade do Ser:** não se aplica. · **Travas:** não se aplica. ·
  **PSAM:** não se aplica. · **Ferramentas:** não se aplica.

## 2. A.1 Mapa de prioridades

- **O que o método conclui:** é **ordem de olhar**, não conclusão: "a lista
  ordena do que pede mais investigação para o que pede menos — é prioridade de
  olhar, não conclusão." (`index.html:469`). Nota baixa = sistema mais
  carregado. Faixa: "baixo" é o sistema em maior desequilíbrio e "alto" o em
  equilíbrio; cortes 3 e 6, "decidido em 27/08" (`motor/src/motor.ts:113-121`,
  `motor/bancos/regras.csv:2-6`). Na tela do HOLOSCAN, "as duas notas mais
  baixas: é por onde a conduta começa" (`app.js:2700`) — só entre sistemas com
  cobertura suficiente (`app.js:2701-2703`).
- **Esfera da Tríade do Ser:** não escrito. Cada sistema tem um "padrão
  emocional" e um "impacto espiritual" associados, **ambos rascunho**
  (`motor/bancos/sistemas.csv:2-6`); o impacto espiritual foi retirado da tela
  clínica por não ter validação metodológica (`app.js:2729-2745`).
- **Travas:** não escrito para o sistema como um todo (ver A.2).
- **PSAM:** não escrito.
- **Ferramentas indicadas:** existe uma tabela herdada, **não validada e
  desligada**: 3 ferramentas por sistema (REC-001 a REC-015,
  `corpo-bancos.js:302-409`), escolhidas 2 do pior sistema + 1 do segundo
  (SEL-001, `corpo-bancos.js:476-491`). A tela hoje diz: "As sugestões de
  ferramenta herdadas do app anterior estão desativadas até serem validadas
  pelo método. A escolha da conduta é da nutricionista." (`app.js:2847-2850`).
  Para referência (status `legado_nao_validado`):

  | Sistema | Ferramentas herdadas (não validadas) | Motivo registrado |
  |---|---|---|
  | Fúngico | Gatilhos e respostas · Diário corporal · Mapa da rotina | "compulsão por doce responde a gatilho, não a força de vontade" · "separar fome do corpo de vontade da cabeça" · "onde do dia a compulsão aparece" |
  | Ácido-Inflamatório | Reenquadramento · Ritmo & sono · Autocompaixão | "a reatividade começa num pensamento" · "sono ruim mantém o corpo em alerta" · "irritação consigo alimenta a de fora" |
  | Metabólico | PQQ · Círculo de sentido · Âncoras de motivação | "o vazio pede propósito, não dieta" · "o que ainda dá sentido" · "o que sustenta quando a vontade cai" |
  | Detox + Linfático | História alimentar · Diário de emoções · Conexão e pertencimento | "mágoa antiga tem data de início" · "o que é engolido junto com a comida" · "quem sustenta e quem drena" |
  | Mental-Emocional-Espiritual | Autocompaixão · Roda da vida · Práticas contemplativas | "como ela fala consigo é o terreno" · "qual área está puxando as outras" · "religar antes de mudar" |

  A maioria dessas ferramentas foi retirada da galeria na revisão clínica
  (`corpo-bancos.js:509-516`). O agente **não deve apresentar essa tabela como
  indicação do método**.

## 3. A.2 Sinais dominantes

- **O que o método conclui:** são os sinais que mais pesaram (até 5 por sistema)
  — descrição, não causa. Na tela do HOLOSCAN, a resposta alta abre a pergunta de
  aprofundamento: "Pelo que pesou mais. A resposta alta abre a pergunta seguinte
  — é onde o mapa vira conversa." (`app.js:2806-2808`). Cada marcador tem sua
  pergunta de aprofundamento na coluna `aprofundar` dos CSVs.
- **Esfera da Tríade do Ser:** o marcador tem uma **origem** — sintoma, emoção
  ou espiritual — e o app a usa para a Tríade HOLOS: sintoma → físico, emoção →
  mental, espiritual → espiritual (`motor/src/motor.ts:22-26`). Se isso é a
  Tríade do Ser → **perguntar**.
- **Travas:** 9 marcadores citam uma trava do livro na coluna `fonte` (todos
  `rascunho`). Se um deles aparece como dominante, o agente pode dizer qual trava
  a fonte cita — **não o que a trava significa**, que não está escrito:

  | Marcador | Sinal | Trava citada | Onde |
  |---|---|---|---|
  | SNT-505 | comer para acalmar emoção | Trava do Trauma Alimentar (livro p. 90) | `motor/bancos/sintomas.csv:47` |
  | SNT-507 | não percebe fome nem saciedade | Trava da Desconexão Corpo-Mente (p. 91) | `motor/bancos/sintomas.csv:49` |
  | EMO-303 | comida como recompensa | Trava da Resistência ao Prazer (p. 90) | `motor/bancos/emocoes.csv:11` |
  | EMO-502 | pensamento tudo ou nada | Trava da Perfeição (p. 89) | `motor/bancos/emocoes.csv:16` |
  | EMO-503 | identidade fixa sobre si | Trava da Identidade Limitante (p. 89) | `motor/bancos/emocoes.csv:17` |
  | EMO-504 | culpa depois de comer | Trava do Trauma Alimentar (p. 90) | `motor/bancos/emocoes.csv:18` |
  | EMO-505 | corpo visto como adversário | Trava da Desconexão Corpo-Mente (p. 91) | `motor/bancos/emocoes.csv:19` |
  | ESP-402 | autossabotagem recorrente | "travas mentais e emocionais" (p. 89) | `motor/bancos/espiritual.csv:12` |
  | ESP-404 | saúde associada a sofrimento | Trava da Resistência ao Prazer (p. 90) | `motor/bancos/espiritual.csv:14` |

- **PSAM:** não escrito.
- **Ferramentas indicadas:** não escrito por sinal.

## 4. A.3 Tríada (Tríade HOLOS)

- **O que o app conclui:** "Integração físico-mental-espiritual"
  (`index.html:625`). Físico = "o que o corpo mostra", Mental = "o que a emoção
  mostra", Espiritual = "o que o propósito mostra" (`app.js:3144-3148`). Vem da
  origem do marcador, não das notas dos sistemas (`app.js:3137-3140`). A tela
  destaca a dimensão mais baixa, e só isso: a frase "É por onde a conduta começa"
  foi retirada porque "nada no método diz que a dimensão mais baixa da Tríade é
  por onde começar" (`app.js:3291-3296`). Eixo sem resposta não recebe nota
  (`app.js:3302-3303`).
- **Esfera da Tríade do Ser:** a Tríade HOLOS tem os três eixos corpo/físico,
  mente/mental, espírito/espiritual; a correspondência com a Tríade do Ser do
  livro **não está escrita** → perguntar.
- **Travas / PSAM / Ferramentas:** não escrito.

## 5. A.4 Leitura combinada

- **Hoje não aparece** (`app.js:2656-2670`). Quando voltar, o método pede que
  seja lida como **hipótese** ("Conferir antes de concluir"), nunca achado, e
  que as do tipo `encaminhar` venham antes, como "Fora do escopo da nutrição"
  (`app.js:2758-2797`). As quatro de encaminhamento (CMB-013 a CMB-016) apontam
  médico ou saúde mental (`motor/bancos/combinacoes.csv:14-17`). Uma única
  combinação está `confirmado` (CMB-001), mas o texto dela ainda aguarda revisão
  de tom (`app.js:2659-2664`).
- **Tríade do Ser / Travas / PSAM / Ferramentas:** não escrito. (CMB-010 e
  CMB-012 citam páginas do livro como fonte; conteúdo não está no repo.)

## 6. A.5 Os cinco sistemas

- **O que o app conclui:** "Área do mapa. Investigar com mais profundidade na
  consulta." — frase igual para todos (`arquivos.js:1289`). "Os cinco sistemas
  são categorias de organização do mapa, não categorias de doença."
  (`arquivos.js:1292-1293`). No README: são "agrupamentos de sinais que o
  paciente relata e que costumam andar juntos, cada um com o padrão emocional e
  o impacto espiritual que o método associa a ele" (`README.md:32-34`), e o
  HOLOSCAN é "instrumento de triagem e priorização: ele responde 'por onde eu
  começo com esta paciente?'" (`README.md:36-37`).
- **Definições e padrão emocional (rascunho, `motor/bancos/sistemas.csv:2-6`):**

  | Sistema | Padrão emocional | Definição (resumo) |
  |---|---|---|
  | Fúngico | estagnação e desordem | microbiota em desequilíbrio a favor de fungos e leveduras; sinais de mucosa e pele que voltam; resposta rápida ao carboidrato simples |
  | Ácido-Inflamatório | irritação e reatividade | inflamação de baixo grau sustentada; dor sem causa mecânica, rigidez ao acordar ("o termo ácido não está definido") |
  | Metabólico | vazio e falta de propósito | desregulação da glicose/insulina lida junto com o comportamento alimentar que a sustenta |
  | Detox + Linfático | acúmulo de mágoas e emoções não processadas | sobrecarga das vias de eliminação; "o que entra e não sai" ("o termo detox não está definido") |
  | Mental-Emocional-Espiritual | desconexão de si | estado do sistema nervoso e relação consigo; "é o sistema que descreve em que estado a pessoa chega para tudo o mais" |

  O **impacto espiritual** de cada sistema existe no CSV, mas não é mostrado:
  são textos legado sem validação (`app.js:2729-2745`).
- **Direção terapêutica** (tela do HOLOSCAN, dois sistemas mais baixos,
  `app.js:2749-2823`), de `motor/bancos/eixos.csv` (todas as linhas `rascunho`,
  "roteamento a confirmar"): Reprogramação Metabólica, Neuroregulação,
  Inteligência Espiritual, com práticas por sistema.
- **Textos por sistema × faixa** (`motor/bancos/mensagens.csv`, 30 linhas,
  registros "nutri" e "paciente", com "primeiros passos"): existem, mas são
  **rascunho** e saíram da saída clínica (`arquivos.js:1279-1281`). O agente
  não deve usá-los como leitura do método.
- **Esfera da Tríade do Ser / Travas / PSAM:** não escrito por sistema.
- **Ferramentas indicadas:** ver A.1 (tabela herdada, desligada).

## 7. A.6 Índice HOLOS

- **O que o app conclui:** "resume as respostas deste mapa e não representa
  percentual de saúde" (`arquivos.js:1297-1298`, `app.js:2277`). É "informação
  secundária" e fica no fim, de propósito (`arquivos.js:1217-1221`). As faixas
  antigas do Índice (<40/<60/<80) foram removidas por não terem fonte
  (`app.js:2268-2274`). Sistema sem resposta fica fora da conta: "ausência de
  dado não é sinal de saúde" (`motor/src/motor.ts:217-220`).
- **Tríade do Ser / Travas / PSAM / Ferramentas:** não escrito.

## 8. B. Leitura Integrada

- **O que o app conclui:** compara, sistema a sistema, relato × exames; "não
  corrige o mapa nem o exame: mostra onde os dois caminham juntos, onde divergem
  — e onde ainda não há dado para comparar" (`index.html:659`). Na tela da
  Leitura Integrada, divergência pede aprofundamento: "N dimensão(ões) com
  divergência — aprofundar na consulta." (`arquivos.js:806-809`). O caso "relato
  sem alteração + exame sem alteração" usa texto próprio que **não conclui
  "saudável", "normal" nem "sem prioridade"** — redação final pendente com o
  Rodrigo (`arquivos.js:82-86`). As faixas dos exames "são as da literatura
  funcional, mais estreitas que as do laboratório de propósito: laboratório marca
  doença, aqui se olha terreno. São rascunho, não homologadas clinicamente"
  (`arquivos.js:480-482`). O exame "não altera o Índice" (`arquivos.js:970`).
- **Tríade do Ser / Travas / PSAM / Ferramentas:** não escrito.

## 9. C. Consultas e acompanhamento

- **O que o app conclui:** registro da jornada; "'nenhuma consulta' também é
  informação da jornada" (`arquivos.js:1317-1320`). Sem leitura metodológica.
- **Tríade do Ser / Travas / PSAM / Ferramentas:** não se aplica.

## 10. D. Documentos e materiais

- **O que o app conclui:** lista de documentos, sem leitura.
- **Tríade do Ser / Travas / PSAM / Ferramentas:** não se aplica.

## 11. E. Interpretação profissional

- **O que o app conclui:** é o texto da nutricionista, "nunca gerado
  automaticamente. Nunca misturado com A/B/C/D sem etiqueta"
  (`arquivos.js:1346-1350`). É o passo "Interpretação" do fluxo clínico. O agente
  pode ajudar a nutricionista a **pensar** o texto; quem escreve e assina é ela.
- **Tríade do Ser / Travas / PSAM / Ferramentas:** o que ela escrever.

## 12. Rodapé

- "Os marcadores e as faixas ainda estão em revisão pelo autor do método. Queixa
  que sugira doença deve ser encaminhada ao médico." (`arquivos.js:1384-1386`)

---

## Perguntar ao Rodrigo

**Conceitos do livro (nada escrito no repo):**
1. O que é a **Tríade do Ser**, e ela é a mesma "Tríade HOLOS" (físico · mental ·
   espiritual) que o relatório mostra? Se não, como uma se lê na outra?
2. O que é o **ciclo PSAM** (capítulo 3): as etapas, e em que parte do relatório
   (ou da jornada História → … → Evolução) cada etapa entra?
3. O que é cada **trava** (Perfeição, Identidade Limitante, Resistência ao
   Prazer, Trauma Alimentar, Desconexão Corpo-Mente; livro p. 89-91), como a
   nutricionista a reconhece no relatório e o que ela faz diante dela? Os 9
   marcadores que citam travas estão certos?
4. Os **5 A's** e as **6 tarefas** citados no README do motor entram na leitura do
   relatório? Como?

**Leitura por seção:**
5. **Mapa de prioridades:** "baixo" (nota ≤ 3), "médio" (≤ 6), "alto" (> 6) —
   os cortes 3 e 6 estão validados? O que o método diz sobre cada faixa?
6. **Por onde começar:** o método confirma "as duas notas mais baixas são por
   onde a conduta começa" (`app.js:2700`)? Com que ferramenta, por sistema? A
   tabela herdada REC-001..015 serve?
7. **Sinais dominantes:** o método lê o conjunto dos 5 sinais de cada sistema
   (padrão), ou sinal a sinal?
8. **Tríade:** o que a dimensão mais baixa significa para a conduta, se significa
   algo?
9. **Os cinco sistemas:** as definições e os padrões emocionais de
   `sistemas.csv` (rascunho 13/09) estão certos? O "impacto espiritual" deve
   aparecer? Onde?
10. **Direção terapêutica** (Reprogramação Metabólica, Neuroregulação,
    Inteligência Espiritual — `eixos.csv`): é do método? O roteamento por
    sistema está certo?
11. **Mensagens por sistema e faixa** (`mensagens.csv`, 30 textos + primeiros
    passos): podem ser usadas pelo agente? Em qual registro (nutri/paciente)?
12. **Combinações** (CMB-001..016): quais voltam, com qual texto, e se o agente
    pode citá-las como hipótese.
13. **Índice HOLOS:** o método dá algum sentido a faixas do Índice, ou ele é só
    resumo?
14. **Leitura Integrada:** a redação final do caso "relato e exame sem alteração"
    (decisão 4, pendente); as faixas funcionais dos 24 exames; o corte "nota ≤ 3 =
    relato comprometido".
15. **Cobertura:** a partir de quanto o sistema tem dados suficientes? O app usa
    50% como limiar de apresentação (Rodada 08) sem validação.
16. **Consultas e documentos:** há leitura do método sobre ritmo de consultas
    (ex.: reavaliação em 4 semanas) que o agente deva usar?

**Conflitos entre textos do repositório:**
17. O material original da HOLOS AI diz "O agente que **diagnostica** o ser
    humano em 360°" e "exame de sangue da alma" (`Holos AI/material-original.md:9`,
    `:17`), e o app decidiu o contrário: "avaliação integral, sai diagnóstico"
    (decisão D5, `motor/README.md:414`; `README.md:39-43`). Confirmar que o agente
    segue o app.
18. A tela do HOLOSCAN diz que ele "mostra por onde a conduta começa: quais
    sistemas pesam mais, o que aparece junto e qual ferramenta responde a isso"
    (`index.html:433`), mas a indicação de ferramenta está desligada e a leitura
    combinada fora da tela. Qual texto vale?
