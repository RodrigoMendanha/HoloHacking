# Limites — o que o app diz que o HOLOSCAN e o relatório NÃO fazem

Para o agente **"Nutrição Holística — Nutri"**. Frase exata (como está no
arquivo) e arquivo:linha. Referência: commit `40ea4ce` (branch da Rodada 08).
Quando a frase ocupa várias linhas no código, o arquivo:linha dá o intervalo.

Busca feita: varredura de todos os arquivos versionados (`.js`, `.html`, `.md`,
`.csv`, `.ts`) por "não é / não são / não substitui / não realiza / não altera /
não corrige / não representa / não diagnostica / não prescreve / não sugere /
não classifica / não homologada / diagnóstico / encaminhar / fora do escopo",
fora `testes/`, `node_modules/` e o pacote minificado `holoscan.js` (cópia do
`motor/src`). A pasta `Holos AI/motor/` é uma cópia antiga do motor com as mesmas
frases do `motor/`; não foi repetida aqui.

## 1. O que a pessoa vê — relatório

| # | Frase exata | Arquivo:linha |
|---|---|---|
| R1 | "Avaliação nutricional integral construída a partir do que o paciente relata. Não é exame, não é diagnóstico médico e não substitui avaliação clínica." | `arquivos.js:1212-1214` |
| R2 | "Área do mapa. Investigar com mais profundidade na consulta." | `arquivos.js:1289` |
| R3 | "Os cinco sistemas são categorias de organização do mapa, não categorias de doença." | `arquivos.js:1292-1293` |
| R4 | "O Índice HOLOS resume as respostas deste mapa e não representa percentual de saúde." | `arquivos.js:1297-1298` |
| R5 | "A Leitura Integrada organiza informações laboratoriais para apoiar a interpretação profissional. Não realiza diagnóstico." | `arquivos.js:1314-1315` |
| R6 | "Documento gerado pelo HoloHacking. Os marcadores e as faixas ainda estão em revisão pelo autor do método. Queixa que sugira doença deve ser encaminhada ao médico." | `arquivos.js:1384-1386` |
| R7 | Selo da seção E: "escrito pela nutricionista" | `style.css:1556-1557` |

## 2. O que a pessoa vê — telas do HOLOSCAN e da Leitura Integrada

| # | Frase exata | Arquivo:linha |
|---|---|---|
| T1 | "O radar mostra os cinco sistemas juntos; a lista ordena do que pede mais investigação para o que pede menos — é prioridade de olhar, não conclusão." | `index.html:469` |
| T2 | "Os cinco sistemas são categorias de organização do mapa, não categorias de doença." | `index.html:481` |
| T3 | "O HOLOSCAN é uma avaliação nutricional integral construída a partir do que o paciente relata. Não é exame, não é diagnóstico médico e não substitui avaliação clínica." | `index.html:604-607` |
| T4 | "Mapa de Frequências — em revisão": "Onde o fluxo está travado, lido das mesmas respostas do questionário. Parado até a correspondência chacra–marcador ser revisada." | `index.html:628-629` |
| T5 | "A Leitura Integrada compara, sistema a sistema, o que o paciente relata no HOLOSCAN com o que os exames mostram. Ela não corrige o mapa nem o exame: mostra onde os dois caminham juntos, onde divergem — e onde ainda não há dado para comparar." | `index.html:659` |
| T6 | "A Leitura Integrada organiza informações laboratoriais para apoiar a interpretação profissional. Não realiza diagnóstico, não altera o HOLOSCAN e não substitui avaliação médica." | `index.html:676-678` |
| T7 | "O Índice HOLOS resume as respostas deste mapa e não representa percentual de saúde." | `app.js:2277` |
| T8 | "definição em revisão" (ao lado da definição de cada sistema) | `app.js:2726` |
| T9 | Título de bloco: "Fora do escopo da nutrição" (combinações de encaminhamento — hoje não aparece) | `app.js:2775` |
| T10 | "Conferir antes de concluir: …" (leitura combinada como hipótese — hoje não aparece) | `app.js:2791` |
| T11 | "Sugestões herdadas da versão anterior do app. Nenhuma foi validada pelo método — a escolha é sua." | `app.js:2829-2830` |
| T12 | "As sugestões de ferramenta herdadas do app anterior estão desativadas até serem validadas pelo método. A escolha da conduta é da nutricionista." | `app.js:2847-2850` |
| T13 | "Eixo sem resposta não recebe nota: o desenho só é fechado com os três." (Tríade) | `app.js:3302-3303` |
| T14 | "… território(s) sem nenhuma pergunta: … Não é equilíbrio — é o que o questionário ainda não alcança." (painel de territórios, desligado em `motor/bancos/config.csv:9`) | `app.js:2321-2326` |
| T15 | "A Leitura Integrada organiza informações laboratoriais para apoiar a interpretação profissional. Não realiza diagnóstico." (aba HOLOSCAN da ficha) | `arquivos.js:173-174` |
| T16 | Mesma frase, no painel de exames | `arquivos.js:811-812` |
| T17 | "As faixas são as da literatura funcional, mais estreitas que as do laboratório de propósito: laboratório marca doença, aqui se olha terreno. São rascunho, não homologadas clinicamente, e esperam a revisão do Rodrigo." | `arquivos.js:480-482` |
| T18 | "… da faixa cadastrada. Faixa em revisão — não homologada clinicamente." (dica ao passar o mouse no exame) | `arquivos.js:760-762` |
| T19 | "Opcional. Na primeira consulta o paciente costuma não ter exame nenhum, e o mapa não depende disto. O exame não altera o Índice — ele confronta o que o paciente relatou com o que o sangue mostra." | `arquivos.js:969-971` |
| T20 | Texto da Leitura Integrada para "relato e exame sem alteração": "Relato e dados laboratoriais disponíveis estão convergentes nesta dimensão." — escolhido para **não** concluir "saudável", "normal" nem "sem prioridade" | texto `arquivos.js:92`; razão `arquivos.js:82-86` |

## 3. O que a pessoa vê — ferramentas e HOLOS AI

| # | Frase exata | Arquivo:linha |
|---|---|---|
| F1 | Escala de Energia Vital: "Percepcao subjetiva de disposicao, vigor e capacidade funcional ao longo do dia. Nao e medida bioenergetica nem diagnostico fisiologico." | `ferramentas.js:92` |
| F2 | Leitura de Sinais: "Organiza o relato corporal em investigacao clinica. Nao diagnostica: separa o que foi relatado do que precisa ser aprofundado." | `ferramentas.js:124` |
| F3 | Linha do Momentum: "… Nao e forca de vontade, motivacao, obediencia nem comprometimento moral." | `ferramentas.js:288`; também `corpo-bancos.js:115` |
| F4 | "o sistema nao sugere — a leitura e sua" | `ferramentas.js:306` |
| F5 | "O estado do Momentum não é sugerido pelo sistema: ele depende de uma leitura das seis dimensões juntas, feita por você. Escolha o estado e registre a justificativa." | `corpo-bancos.js:122-125` |
| F6 | "Os três níveis — adequado, atenção, prioridade — existem no método, mas as faixas numéricas ainda estão em validação. Por enquanto, o sistema mostra a medida observada e não a classifica." (Ritmo & Sono) | `corpo-bancos.js:190-193` |
| F7 | "Tudo acima é medida do dia registrado. O sistema não diz que um intervalo é longo nem que uma nota é alta: não há faixa validada para nenhuma das duas coisas." | `render-resultado.js:109-111` |
| F8 | "Tudo acima é relato organizado, não achado. O sistema não elege sinal para aprofundar: a prioridade do método — acompanhar, aprofundar, correlacionar, encaminhar — é sua." | `render-resultado.js:168-170` |
| F9 | "O sistema não diz se isto é pouco ou bastante: quantos registros bastam para falar de padrão, e como agrupá-los por período do dia, são decisões do método que ainda não foram tomadas." | `render-resultado.js:197-199` |
| F10 | "A matriz distribui; ela não ordena nem escolhe. E nenhum campo registra se um hábito sustenta ou dificulta a mudança — por isso a tela não separa os hábitos entre bons e ruins: mostra a consistência relatada e as duas notas, como vieram." | `render-resultado.js:248-251` |
| F11 | "O sistema não sugere estado. Escolha um na leitura profissional." | `render-resultado.js:284` |
| F12 | "As notas aparecem como foram dadas. O sistema não marca acordo nenhum como frágil: não há limiar de confiança validado." | `render-resultado.js:331-332` |
| F13 | "O que o sistema mostra acima é observação. A interpretação é sua, e é ela que fecha a aplicação." | `formulario.js:293-294` |
| F14 | "Ferramentas ativas de Corpo, Mente e Espírito. Não são formulário do paciente: são conduta." | `ficha.js:898-899` |
| F15 | Contexto da HOLOS AI: "(— = eixo sem resposta; não é nota)" | `holos-ai.js:93` |
| F16 | HOLOS AI: "Os dados permanecem neste navegador. Nenhuma informação é enviada automaticamente para serviços externos. A ação de copiar e usar o contexto parte de você." — **atenção:** com conta, os dados ficam no servidor do HoloHacking, não "neste navegador"; a segunda e a terceira frases continuam verdadeiras | `holos-ai.js:448-450` |

## 4. Documentos e regras do agente (não aparecem na tela)

| # | Frase exata | Arquivo:linha |
|---|---|---|
| D1 | "Ele não mede nada. Não é exame, não é diagnóstico médico e não substitui avaliação clínica — e a tela diz isso, no mapa e no registro que vai para o paciente. Diagnóstico **nutricional** é atribuição da nutricionista; diagnóstico de **doença** é ato médico, e a fronteira entre os dois é a decisão D5 de 27/08: a palavra do produto é *avaliação integral*." | `README.md:39-43` |
| D2 | "Os cinco sistemas não são doenças: são **agrupamentos de sinais que o paciente relata e que costumam andar juntos** …" | `README.md:32-34` |
| D3 | "Por isso os cinco cards descrevem o **sinal relatado**, nunca a causa" | `README.md:45` |
| D4 | Decisão D5: "**'avaliação integral'**, sai 'diagnóstico'" | `motor/README.md:414` |
| D5 | "LIMITES QUE VOCE NAO ATRAVESSA, EM NENHUMA HIPOTESE: – Voce nao prescreve medicamento, nao indica dose e nao manda parar, trocar ou suspender nada que um medico tenha prescrito. – Voce nao diagnostica doenca. Diagnostico de doenca e ato medico. O que o HOLOSCAN produz e um mapa de carga por sistema, nao um diagnostico clinico. – Voce nao promete cura. – Quando a pergunta sair do seu escopo, diga isso em uma frase e encaminhe ao profissional certo. Nao contorne, nao responda 'por cima', nao dilua." | `motor/src/agente/prompts.ts:11-18` |
| D6 | "leitura — uma HIPOTESE a investigar — nunca um achado fechado / encaminhar — isto aqui sai do escopo da nutricao e pede outro profissional. A distincao e do metodo: 'o Holoscan nao deve interpretar sintomas como diagnostico definitivo' e 'deve dizer quando sugerir encaminhamento'." | `motor/src/tipos.ts:147-153` |
| D7 | "ausencia de dado nao e sinal de saude" (sistema sem resposta sai do Índice) | `motor/src/motor.ts:218-220` |
| D8 | HOLOS AI inerte: "Nao diagnostica, nao prescreve e nao altera nada do HOLOSCAN." | `supabase/functions/holos-ai/indisponivel.ts:7` |
| D9 | "A HOLOS AI de verdade (camada de IA que discute o caso a partir do HOLOSCAN, sem diagnosticar nem alterar score) será feita numa rodada própria." | `RELEASE-STATE.md:252-254` |
| D10 | Especificação futura do agente: fronteira "não diagnostica, não prescreve" | `docs/holos-ai-plano.md:27` |
| D11 | A frase `leitura` que o motor gera para o confronto com exames "tem tom causal — 'e o que a anamnese nao pega' — e nao deve chegar a interface clinica nem ao relatorio do paciente" | `arquivos.js:75-77` |
| D12 | Da Tríade saiu a frase "É por onde a conduta começa": "nada no metodo diz que a dimensao mais baixa da Triade e por onde comecar" | `app.js:3291-3296` |

### Política de escopo do agente (`motor/politicas/escopo.csv`)

| Id | Motivo | Tipo | Resposta exata | Linha |
|---|---|---|---|---|
| ESC-001 | Prescrição de medicamento é ato médico | bloqueio | "Isso é prescrição médica e está fora do que eu posso responder. Encaminhe ao médico responsável." | `:2` |
| ESC-002 | Indicação de dose | bloqueio | "Não indico dose. Quem define dose é o profissional prescritor na consulta." | `:3` |
| ESC-003 | Suspensão de medicamento é ato médico | bloqueio | "Alteração de medicamento só com o médico que prescreveu. Não posso orientar sobre isso." | `:4` |
| ESC-004 | Diagnóstico de doença é ato médico | bloqueio | "Diagnóstico de doença é do médico. O que eu leio aqui é o mapa dos sistemas — não um diagnóstico clínico." | `:5` |
| ESC-005 | Promessa de cura | bloqueio | "Não trabalho com promessa de cura. Posso mostrar o que o mapa aponta e quais são os primeiros passos." | `:6` |
| ESC-006 | Interpretação de exame fora do escopo nutricional | aviso | "Posso comentar o que isso significa dentro do mapa dos sistemas. A interpretação clínica do exame é do profissional." | `:7` |
| ESC-007 | Conduta restritiva sem avaliação individual | aviso | "Isso depende de avaliação individual. Não dá para responder sem a nutricionista olhar o caso." | `:8` |
| ESC-008 | Conduta terapêutica para doença é ato médico | bloqueio | "Tratamento de doença é conduta médica. Posso falar do que o método diz sobre o terreno; o tratamento é com o médico." | `:9` |
| ESC-009 | Pedido de dose | bloqueio | "Não indico dose. Quem define dose é o profissional prescritor na consulta." | `:10` |
| ESC-010 | Pedido de indicação de suplemento ou medicamento | aviso | "Indicação individual é da nutricionista na consulta. Posso dizer o que o método diz sobre esse sistema." | `:11` |
| ESC-011 | Pedido de quantidade a ingerir — é prescrição | bloqueio | "Quantidade de medicamento ou suplemento é prescrição, e isso é com quem prescreve. Posso falar do padrão alimentar por trás da queixa." | `:12` |

### Encaminhamento nos bancos (não aparece na tela hoje)

| Frase exata | Arquivo:linha |
|---|---|
| CMB-013: "Exame inflamatório alterado relatado — leitura e conduta são do médico" → "encaminhar ao médico com os exames antes de qualquer conduta nutricional" | `motor/bancos/combinacoes.csv:14` |
| CMB-014: "Alteração lipídica relatada com sinal de resistência insulínica — pede avaliação médica" | `motor/bancos/combinacoes.csv:15` |
| CMB-015: "Infecção fúngica de repetição relatada — pede avaliação médica" → "quadro de repetição não se resolve só por alimentação" | `motor/bancos/combinacoes.csv:16` |
| CMB-016: "Sofrimento mental sustentado com isolamento — pede avaliação em saúde mental" | `motor/bancos/combinacoes.csv:17` |
| EXA-001 (Candida IgG): "Nao e exame de rotina e isolado nao fecha diagnostico." | `motor/bancos/exames.csv:2` |
| EXA-011 (TSH): "Possivel hipertireoidismo — encaminhar." / "Tireoide pedindo mais estimulo; encaminhar ao medico." | `motor/bancos/exames.csv:12` |
| EXA-012 (T4 livre): "Producao tireoidiana baixa — encaminhar." | `motor/bancos/exames.csv:13` |
| EXA-018 (Creatinina): "Funcao renal a investigar — encaminhar." | `motor/bancos/exames.csv:19` |

## 5. Frase que CONTRADIZ os limites (não usar)

| Frase exata | Arquivo:linha | Por quê |
|---|---|---|
| "O agente que diagnostica o ser humano em 360°." | `Holos AI/material-original.md:9` | Material comercial de 11/08, anterior à decisão D5 (`motor/README.md:414`). O app diz o contrário (R1, T3, D1). |
| "Ele é o 'exame de sangue da alma' — mas emocional, espiritual e metabólico." | `Holos AI/material-original.md:17` | O app diz "Não é exame" (R1, T3). |
