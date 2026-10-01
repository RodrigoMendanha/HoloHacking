# PACOTE DE DECISÃO HUMANA — HOMOLOGAÇÃO V1 DO HOLOSCAN

Etapa 4.1 · 01/10/2026 · para a liderança do método (Daniel e responsáveis clínicos).

> **ETAPA 4.2 — DECISÕES METODOLÓGICAS V1 FECHADAS.** As 15 decisões abaixo foram tomadas e estão preenchidas nos campos de cada bloco. Consolidação: `PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`. Aplicadas na nova versão candidata do pacote (HOLOS-V1@2, `em_revisao`): o validador não aponta nenhum bloqueio metodológico.
>
> **PUBLICAÇÃO TÉCNICA PENDENTE DE VALIDAÇÃO NO BANCO REAL.** O candidato não é publicado nem aprovado enquanto a cadeia de migrations (agora 130000→200000) não for validada no Supabase.

> **Estado técnico do banco real:** VALIDAÇÃO REAL PENDENTE — CONEXÃO DIRETA NÃO DISPONÍVEL. A cadeia de migrations 130000→190000 foi validada apenas em PostgreSQL 16 local (BEGIN/ROLLBACK, 33/33 verificações). Nenhuma migration foi aplicada no banco real. Isso não altera as decisões abaixo, que são metodológicas.

## Como usar este documento

- Cada bloco abaixo é **uma decisão**. Ele mostra o que existe hoje no projeto, as opções possíveis e o efeito de cada uma. **Nenhuma opção está recomendada.** Os valores atuais foram recuperados dos arquivos do projeto e **não foram aprovados por ninguém**.
- Preencha DECISÃO, Justificativa, Responsável e Data. Uma decisão sem responsável humano não pode ser registrada no sistema.
- Depois de decidido, cada item é registrado como nova versão do Pacote Metodológico. O sistema só publica quando o validador não aponta nenhum bloqueio, e a aprovação final exige responsável e justificativa. Não existe aprovação automática.
- Enquanto um bloco estiver em aberto, o HOLOSCAN continua coletando respostas e mostrando a **cobertura de preenchimento**, mas **não mostra resultado oficial** (nota por sistema, faixa, Índice, Tríada, comparação entre aplicações, sugestões).

## Ordem

Do que bloqueia mais coisas para o que bloqueia menos. A edição das perguntas vem primeiro porque todas as outras decisões se apoiam nela.

| # | Decisão | O que fica bloqueado enquanto estiver aberta |
|---|---|---|
| 1 | Edição oficial das 84 perguntas | tudo |
| 2 | Escalas e rótulos | toda pontuação |
| 3 | Inversões | pontuação dos itens invertidos e de seus sistemas |
| 4 | Associações aos cinco sistemas | nota de todos os sistemas |
| 5 | SNT-101 | Fúngico, Metabólico, eixo físico |
| 6 | SNT-501 | Metabólico, Mental Emocional Espiritual, eixo físico |
| 7 | Pesos | nota de todos os sistemas e da Tríada |
| 8 | Parcialidade (ausência) e cobertura | toda nota com resposta faltando |
| 9 | Faixas | rótulo e mensagem de cada sistema |
| 10 | Índice HOLOS | Índice |
| 11 | Tríada | os três eixos |
| 12 | Comparabilidade | comparação entre aplicações na Evolução |
| 13 | Nomenclatura e textos dos cinco sistemas | textos exibidos e relatório |
| 14 | Caso de referência (pedido pelo validador) | publicação do pacote |
| 15 | Combinações e sugestões (CMB, REC, SEL) | combinações e sugestões de ferramentas |

**Diferença em relação aos 14 blocos de `HOMOLOGACAO-PENDENTE.md`:** aqui SNT-101 e SNT-501 viraram duas decisões separadas (5 e 6); associações e pesos foram separados (4 e 7); cobertura entrou junto com parcialidade (8), porque uma depende da outra. O total passou de 14 para 15 decisões; nenhum tema foi retirado.

**Correção registrada:** `HOMOLOGACAO-PENDENTE.md` atribuiu os 4 bloqueios "conflito pendente" às associações secundárias. Na revalidação desta etapa, esses 4 bloqueios são das linhas de SNT-101 e SNT-501. As 9 secundárias não geram bloqueio próprio no validador, mas continuam pendentes (decisões 4 e 7).

## Estado do validador hoje (HEAD da Etapa 4)

O pacote rascunho importado do projeto tem **12 bloqueios**:

| Bloqueio | Quantidade | Resolvido pela decisão |
|---|---|---|
| conflito pendente (SNT-101 ×2, SNT-501 ×2) | 4 | 5 e 6 |
| SNT pendente | 1 | 5 e 6 |
| política de parcialidade ausente | 1 | 8 |
| configuração do Índice incompleta | 1 | 10 |
| configuração da Tríada incompleta (físico, mental, espiritual) | 3 | 11 |
| exemplo sem resultado esperado | 1 | 14 |
| elementos ainda não aprovados (297) | 1 | todas: cada elemento só sai de "rascunho" com decisão registrada |

O validador **não** aponta pergunta duplicada, escala ausente, orientação ausente, peso ausente, associação órfã nem lacuna ou sobreposição de faixas. Isso é **validação técnica**, não homologação clínica.


---

## DECISÃO 1 — Edição oficial das 84 perguntas

**O que precisa ser decidido:**
Quais perguntas formam a edição V1 do HOLOSCAN, com qual texto exato e com qual período de referência.

**Por que precisa ser decidido:**
Todas as outras decisões (escala, inversão, associação, peso, faixas, Índice, Tríada) são feitas sobre esta lista. Mudar uma pergunta depois exige nova versão da edição e torna aplicações antigas e novas não comparáveis sem regra.

**O que existe hoje:**
- 84 IDs únicos: 49 físico, 19 mental/emocional, 16 espiritual/propósito.
- 86 linhas nos bancos, porque SNT-101 e SNT-501 aparecem duas vezes cada (decisões 5 e 6).
- Todos os enunciados estão com status "rascunho" no arquivo de origem (fonte declarada: "rascunho-literatura-funcional" para os sintomas).
- Nenhuma pergunta tem período de referência ("contexto temporal") definido: o campo está vazio nas 84.
- Lista completa com enunciado no **Anexo A**.

**Fonte atual:**
`motor/bancos/sintomas.csv` (51 linhas), `motor/bancos/emocoes.csv` (19), `motor/bancos/espiritual.csv` (16); cópia anterior em `Holos AI/motor/bancos/`.

**Conflitos encontrados:**
- **EMO-506** existe na cópia anterior dos bancos e não existe no banco ativo, sem registro de quando ou por que saiu.
- Na cópia anterior, a segunda linha de SNT-101 tinha o ID SNT-302, e a segunda linha de SNT-501 tinha o ID SNT-310 com outro enunciado ("Você acorda cansado mesmo tendo dormido o suficiente?"). A unificação não tem registro.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar as 84 perguntas com os enunciados atuais.
2. Aprovar com alterações de texto em itens específicos.
3. Retirar ou acrescentar itens (inclusive decidir sobre EMO-506).
4. Definir um período de referência para todos os itens ou por bloco (por exemplo, "nos últimos 30 dias").

**Consequência de cada opção:**
1. A edição V1 fica igual à coleta já feita; as respostas guardadas até hoje passam a ser da mesma edição.
2. Cada item alterado vira nova versão do item; respostas antigas desse item ficam ligadas ao texto antigo e não são automaticamente comparáveis.
3. O total deixa de ser 84; a cobertura de preenchimento muda de denominador; associações, pesos e eixos dos itens novos precisam de decisão própria.
4. O texto exibido ao paciente passa a incluir o período; respostas coletadas antes não tinham esse período.

**O que acontece enquanto não decidirmos:**
A coleta continua como experimental. Nenhum resultado do HOLOSCAN é oficial. A cobertura de preenchimento (respondidos ÷ 84) continua sendo mostrada.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Edição V1 com 84 perguntas (49/19/16); EMO-506 fora; SNT-101 e SNT-501 com ID único; SNT-302, SNT-310 e EMO-506 não são recriadas. Contexto temporal por item (7 valores permitidos).

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 2 — Escalas e rótulos de resposta

**O que precisa ser decidido:**
Quais escalas de resposta valem, com quais rótulos, e qual escala cada pergunta usa.

**Por que precisa ser decidido:**
A escala define o valor numérico de cada resposta (0 a 3 hoje). Se a escala ou os rótulos mudarem, a mesma resposta passa a valer outra coisa e todas as notas mudam.

**O que existe hoje:**
Duas escalas de 0 a 3, registradas como **ESTRUTURA RECUPERADA** (não como edição oficial):

| Escala | 0 | 1 | 2 | 3 | Itens que usam |
|---|---|---|---|---|---|
| frequência | Nunca | Às vezes | Frequente | Sempre | 73 (físico 44, mental/emocional 19, espiritual 10) |
| intensidade | Nada | Um pouco | Bastante | Muito | 11 (físico 5, espiritual 6) |

A escala de cada item está no **Anexo A**.

**Fonte atual:**
`questionario.js` (ESCALAS) e `motor/bancos/config.csv` (escala_max = 3).

**Conflitos encontrados:**
Nenhum conflito técnico. Os rótulos nunca foram aprovados.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar as duas escalas com os rótulos atuais e a atribuição atual por item.
2. Aprovar a faixa 0–3, mas mudar rótulos.
3. Mudar o número de pontos (por exemplo 0–4 ou 0–10).
4. Trocar a escala de itens específicos (frequência ↔ intensidade).

**Consequência de cada opção:**
1. Respostas já coletadas continuam válidas com o mesmo valor.
2. O valor numérico se mantém, mas o significado mostrado ao paciente muda; respostas antigas foram dadas com outro rótulo.
3. Todas as cargas, notas e faixas precisam ser recalculadas; respostas antigas não cabem na nova escala sem regra de conversão.
4. Só o texto das opções daquele item muda; o valor 0–3 continua.

**O que acontece enquanto não decidirmos:**
As respostas são guardadas no valor 0–3 atual, mas nenhuma pontuação é oficial.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Escalas 0–3: frequência (Nunca/Às vezes/Frequente/Sempre) e intensidade (Nada/Um pouco/Bastante/Muito); atribuição do Anexo A mantida (73/11); escala desconhecida é erro.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 3 — Inversões

**O que precisa ser decidido:**
Quais perguntas são invertidas (resposta alta = situação melhor) e quais são diretas.

**Por que precisa ser decidido:**
Numa pergunta invertida, "Sempre" pesa como ausência de sinal. Se a orientação estiver errada, o item soma ao contrário na nota do sistema.

**O que existe hoje:**
9 itens marcados como invertidos no banco; os outros 75 marcados como diretos. **Nenhuma orientação foi deduzida do texto da pergunta.**

| ID | Bloco | Enunciado | Escala |
|---|---|---|---|
| SNT-507 | Físico | Você consegue perceber quando está com fome e quando já está satisfeito? | frequencia |
| EMO-507 | Mental/emocional | Você olha para sua vida hoje e se reconhece nela? | frequencia |
| ESP-101 | Espiritual/propósito | Você sente que sua vida tem uma direção clara? | intensidade |
| ESP-102 | Espiritual/propósito | Você sabe dizer o que veio fazer nesta vida? | intensidade |
| ESP-201 | Espiritual/propósito | Suas escolhas alimentares combinam com aquilo que você diz valorizar? | frequencia |
| ESP-202 | Espiritual/propósito | Você tem clareza sobre o que é inegociável para você? | intensidade |
| ESP-301 | Espiritual/propósito | Você sente que existe algo maior te sustentando? | intensidade |
| ESP-302 | Espiritual/propósito | Você reserva um momento do dia para agradecer alguma coisa? | frequencia |
| ESP-501 | Espiritual/propósito | Você passa algum tempo em contato com a natureza? | frequencia |

No motor genérico, item **sem** orientação aprovada não é tratado como direto: ele bloqueia a publicação.

**Fonte atual:**
coluna de sentido em `motor/bancos/sintomas.csv`, `emocoes.csv` e `espiritual.csv`.

**Conflitos encontrados:**
Nenhum conflito técnico. Todas as 84 orientações estão "pendente de homologação".

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Confirmar as 9 inversões e as 75 diretas como estão.
2. Alterar a orientação de itens específicos.
3. Reescrever itens invertidos para que todos fiquem diretos.

**Consequência de cada opção:**
1. A pontuação atual de cada item fica mantida.
2. O sinal da contribuição desses itens se inverte; a nota dos sistemas a que pertencem muda.
3. Muda o enunciado (volta à decisão 1); elimina inversões na pontuação.

**O que acontece enquanto não decidirmos:**
Os 9 itens invertidos e seus sistemas não têm resultado oficial.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): 9 invertidas (SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501); 75 diretas; z = resposta ou 3 − resposta; orientação ausente é erro.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 4 — Associações das perguntas aos cinco sistemas

**O que precisa ser decidido:**
A qual sistema (ou sistemas) cada pergunta contribui, e se a contribuição é primária ou secundária.

**Por que precisa ser decidido:**
A nota de cada sistema é calculada só com as perguntas associadas a ele. Uma associação errada coloca sinal de um terreno na nota de outro.

**O que existe hoje:**
95 associações pergunta → sistema (86 primárias + 9 secundárias), além de 84 vínculos com a Tríada (decisão 11).

| Sistema | Associações | Primárias | Secundárias | Soma dos pesos |
|---|---|---|---|---|
| Sistema Fúngico | 15 | 15 | 0 | 33 |
| Sistema Ácido-Inflamatório | 16 | 16 | 0 | 37 |
| Sistema Metabólico | 19 | 16 | 3 | 51 |
| Sistema Detox + Linfático | 16 | 15 | 1 | 37 |
| Sistema Mental-Emocional-Espiritual | 29 | 24 | 5 | 77 |

As 9 associações secundárias (todas de emoções):

| Pergunta | Sistema secundário | Peso usado hoje |
|---|---|---|
| EMO-101 | Sistema Metabólico | 3 |
| EMO-103 | Sistema Mental-Emocional-Espiritual | 2 |
| EMO-201 | Sistema Mental-Emocional-Espiritual | 3 |
| EMO-203 | Sistema Detox + Linfático | 2 |
| EMO-301 | Sistema Mental-Emocional-Espiritual | 3 |
| EMO-302 | Sistema Mental-Emocional-Espiritual | 3 |
| EMO-402 | Sistema Mental-Emocional-Espiritual | 3 |
| EMO-502 | Sistema Metabólico | 3 |
| EMO-504 | Sistema Metabólico | 3 |

O peso secundário hoje é igual ao primário: `peso_secundario_fator = 1`, anotado como "decidido 27/08" no arquivo de configuração, sem registro de homologação. Associação de cada item no **Anexo A**.

**Fonte atual:**
`motor/bancos/sintomas.csv`, `emocoes.csv`, `espiritual.csv` (colunas de sistema e sistema secundário) e `motor/bancos/config.csv`.

**Conflitos encontrados:**
- SNT-101 e SNT-501 com duas associações primárias cada (decisões 5 e 6).
- Fator secundário 1 "decidido" sem registro.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar todas as associações atuais, incluindo as 9 secundárias.
2. Aprovar as primárias e retirar as secundárias.
3. Manter as secundárias com peso reduzido (fator menor que 1).
4. Revisar associações item a item.

**Consequência de cada opção:**
1. As notas dos sistemas usam exatamente o conjunto de itens de hoje.
2. Metabólico perde 3 itens, Detox e Linfático perde 1, Mental Emocional Espiritual perde 5; o máximo possível desses sistemas diminui.
3. O item continua contando nos dois sistemas, mas pesa menos no secundário; o fator precisa ser escolhido (decisão 7).
4. Cada mudança altera a lista de itens e o máximo do sistema afetado.

**O que acontece enquanto não decidirmos:**
Nenhuma nota de sistema é oficial.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Exatamente um sistema primário pontuável por pergunta; as 9 secundárias recuperadas ficam como secondary_contextual, sem contribuição numérica.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 5 — SNT-101

**O que precisa ser decidido:**
Para quais sistemas SNT-101 contribui, com qual peso em cada um, e como entra na Tríada.

**Por que precisa ser decidido:**
Hoje SNT-101 soma em dois sistemas ao mesmo tempo, com pesos diferentes, sem registro de que isso tenha sido decidido. O Documento Mestre (§12) pede revisão desses vínculos sem herdar os pesos do sistema antigo.

**O que existe hoje:**
| Campo | Valor recuperado |
|---|---|
| Pergunta | Você sente vontade forte de doce ou pão quase todo dia? |
| Rótulo interno | vontade intensa e recorrente de doce |
| Bloco | Físico |
| Escala | frequencia (Nunca / Às vezes / Frequente / Sempre) |
| Orientação | direta |
| Associação 1 | Sistema Fúngico, peso 2, registrada como "primaria" (motor/bancos/sintomas.csv:2) |
| Associação 2 | Sistema Metabólico, peso 3, registrada como "primaria" (motor/bancos/sintomas.csv:24) |
| Primário / secundário | **as duas linhas estão registradas como primárias**; não existe registro de qual seria secundária |
| Tríada | eixo fisico, peso 2 (usa a primeira linha do arquivo; a segunda não entra na Tríada); vínculo derivado do bloco, não de tabela aprovada |
| Cobertura | conta uma vez (por ID) |
| Status | PENDENTE DE HOMOLOGAÇÃO |

Na cópia anterior dos bancos:

| Arquivo:linha | ID | Sistema | Peso | Enunciado |
|---|---|---|---|---|
| Holos AI/motor/bancos/sintomas.csv:2 | SNT-101 | Sistema Fúngico | 2 | mesmo enunciado |
| Holos AI/motor/bancos/sintomas.csv:24 | **SNT-302** | Sistema Metabólico | 3 | mesmo enunciado |

**Fonte atual:**
motor/bancos/sintomas.csv:2, motor/bancos/sintomas.csv:24; cópia anterior em `Holos AI/motor/bancos/sintomas.csv`; relatório `PENDENCIA-SNT-101-SNT-501.md`.

**Conflitos encontrados:**
- Mesmo ID em duas linhas primárias, com sistemas e pesos diferentes (2 × 3).
- Na cópia anterior eram dois IDs diferentes; a unificação não tem registro.
- A Tríada usa só a primeira linha, por ordem do arquivo.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Manter nos dois sistemas, com os pesos atuais (2 e 3).
2. Manter nos dois sistemas, com outros pesos.
3. Manter só em Sistema Fúngico.
4. Manter só em Sistema Metabólico.
5. Manter em um sistema como primária e no outro como secundária.
6. Dividir em duas perguntas com IDs diferentes.
7. Definir separadamente o eixo e o peso na Tríada.

**Consequência de cada opção:**
1. Uma única resposta continua somando nos dois sistemas; a resposta pesa mais em Sistema Metabólico.
2. Uma única resposta continua somando nos dois sistemas; os pesos novos entram na decisão 7.
3. Sistema Metabólico perde um item; o máximo possível desse sistema diminui.
4. Sistema Fúngico perde um item; o máximo possível desse sistema diminui.
5. O item conta nos dois, mas a regra de peso secundário (decisão 7) passa a valer para um deles.
6. Muda a edição (decisão 1): o questionário passa a ter mais um item.
7. O vínculo com a Tríada deixa de depender da ordem das linhas no arquivo.

**O que acontece enquanto não decidirmos:**
Sistema Fúngico, Sistema Metabólico e o eixo físico da Tríada não podem ter resultado oficial. O validador mantém 3 bloqueios ligados a este item (2 de conflito e o bloqueio "SNT pendente", compartilhado com SNT-501).


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Primário pontuável: Sistema Fúngico, peso 1; Metabólico = secondary_contextual (linha histórica SNT-302); Tríada físico peso 1; ultimos_30_dias.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 6 — SNT-501

**O que precisa ser decidido:**
Para quais sistemas SNT-501 contribui, com qual peso em cada um, e como entra na Tríada.

**Por que precisa ser decidido:**
Hoje SNT-501 soma em dois sistemas ao mesmo tempo, com pesos diferentes, sem registro de que isso tenha sido decidido. O Documento Mestre (§12) pede revisão desses vínculos sem herdar os pesos do sistema antigo.

**O que existe hoje:**
| Campo | Valor recuperado |
|---|---|
| Pergunta | Você acorda cansado mesmo dormindo as horas necessárias? |
| Rótulo interno | sono não reparador |
| Bloco | Físico |
| Escala | frequencia (Nunca / Às vezes / Frequente / Sempre) |
| Orientação | direta |
| Associação 1 | Sistema Metabólico, peso 2, registrada como "primaria" (motor/bancos/sintomas.csv:32) |
| Associação 2 | Sistema Mental-Emocional-Espiritual, peso 3, registrada como "primaria" (motor/bancos/sintomas.csv:43) |
| Primário / secundário | **as duas linhas estão registradas como primárias**; não existe registro de qual seria secundária |
| Tríada | eixo fisico, peso 2 (usa a primeira linha do arquivo; a segunda não entra na Tríada); vínculo derivado do bloco, não de tabela aprovada |
| Cobertura | conta uma vez (por ID) |
| Status | PENDENTE DE HOMOLOGAÇÃO |

Na cópia anterior dos bancos:

| Arquivo:linha | ID | Sistema | Peso | Enunciado |
|---|---|---|---|---|
| Holos AI/motor/bancos/sintomas.csv:32 | **SNT-310** | Sistema Metabólico | 2 | "Você acorda cansado mesmo tendo dormido o suficiente?" |
| Holos AI/motor/bancos/sintomas.csv:43 | SNT-501 | Sistema Mental-Emocional-Espiritual | 3 | mesmo enunciado |

**Fonte atual:**
motor/bancos/sintomas.csv:32, motor/bancos/sintomas.csv:43; cópia anterior em `Holos AI/motor/bancos/sintomas.csv`; relatório `PENDENCIA-SNT-101-SNT-501.md`.

**Conflitos encontrados:**
- Mesmo ID em duas linhas primárias, com sistemas e pesos diferentes (2 × 3).
- Na cópia anterior eram dois IDs diferentes; a unificação não tem registro.
- A Tríada usa só a primeira linha, por ordem do arquivo.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Manter nos dois sistemas, com os pesos atuais (2 e 3).
2. Manter nos dois sistemas, com outros pesos.
3. Manter só em Sistema Metabólico.
4. Manter só em Sistema Mental-Emocional-Espiritual.
5. Manter em um sistema como primária e no outro como secundária.
6. Dividir em duas perguntas com IDs diferentes.
7. Definir separadamente o eixo e o peso na Tríada.

**Consequência de cada opção:**
1. Uma única resposta continua somando nos dois sistemas; a resposta pesa mais em Sistema Mental-Emocional-Espiritual.
2. Uma única resposta continua somando nos dois sistemas; os pesos novos entram na decisão 7.
3. Sistema Mental-Emocional-Espiritual perde um item; o máximo possível desse sistema diminui.
4. Sistema Metabólico perde um item; o máximo possível desse sistema diminui.
5. O item conta nos dois, mas a regra de peso secundário (decisão 7) passa a valer para um deles.
6. Muda a edição (decisão 1): o questionário passa a ter mais um item.
7. O vínculo com a Tríada deixa de depender da ordem das linhas no arquivo.

**O que acontece enquanto não decidirmos:**
Sistema Metabólico, Sistema Mental-Emocional-Espiritual e o eixo físico da Tríada não podem ter resultado oficial. O validador mantém 3 bloqueios ligados a este item (2 de conflito e o bloqueio "SNT pendente", compartilhado com SNT-101).


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Primário pontuável: Sistema Mental Emocional Espiritual, peso 1; Metabólico = secondary_contextual (linha histórica SNT-310); Tríada físico peso 1; ultimos_30_dias.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 7 — Pesos

**O que precisa ser decidido:**
Quanto cada pergunta pesa em cada sistema, e qual o peso de uma associação secundária.

**Por que precisa ser decidido:**
A carga de um sistema é a soma de peso × resposta. Pesos diferentes mudam a nota e a ordem dos sistemas.

**O que existe hoje:**
- Pesos de 1 a 3 por associação: peso 1 em 3, peso 2 em 44, peso 3 em 48 (95 associações).
- Peso secundário = peso primário × 1.
- O motor antigo só aceita pesos de 1 a 3 (aviso do validador do motor; isso também não é decisão homologada).
- Nenhum peso foi normalizado, completado ou convertido em padrão oficial. Peso de cada item no **Anexo A**.

**Fonte atual:**
`motor/bancos/sintomas.csv`, `emocoes.csv`, `espiritual.csv`, `config.csv`.

**Conflitos encontrados:**
SNT-101 e SNT-501 (decisões 5 e 6); fator secundário sem registro (decisão 4).

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar os pesos atuais item a item.
2. Usar peso igual para todos os itens.
3. Revisar pesos item a item.
4. Definir uma faixa de pesos diferente de 1 a 3.

**Consequência de cada opção:**
1. As notas reproduzem exatamente o cálculo experimental de hoje.
2. Cada sistema passa a ser uma média simples das respostas; itens hoje com peso 3 perdem importância relativa.
3. Cada mudança altera a nota do sistema afetado e, por consequência, o Índice e a Tríada.
4. A relação entre o item mais e o menos importante muda; o motor precisa de regra nova.

**O que acontece enquanto não decidirmos:**
Nenhuma nota de sistema, eixo ou Índice é oficial.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Todos os 84 vínculos primários com peso 1; hierarquia 1/2/3 sai da fórmula e fica como legacy_recovered_weight.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 8 — Política de parcialidade (respostas faltando) e cobertura

**O que precisa ser decidido:**
Como calcular a nota de um sistema quando nem todas as perguntas foram respondidas, e a partir de quanto preenchimento a nota é aceita.

**Por que precisa ser decidido:**
Na prática, aplicações incompletas são comuns. Sem regra, a mesma pessoa pode ter notas diferentes só porque deixou perguntas em branco.

**O que existe hoje:**
- **SEM POLÍTICA OFICIAL APROVADA.**
- O cálculo experimental usa "denominador por respondidos": divide pelo máximo só das perguntas respondidas (não homologado).
- Cobertura mínima: **nenhuma**. O corte de 50% do sistema antigo foi removido na Etapa 0 e não foi reintroduzido; nenhum número foi escolhido.
- Estados de resposta existentes hoje: respondido (0 a 3) e ausente. "Recusou responder" e "não se aplica" não existem.
- Cobertura de preenchimento = perguntas respondidas ÷ 84. É mostrada só como informação e não decide nada.

**Fonte atual:**
`motor/src/motor.ts`, `utils.js` (HoloAusencia), `metodologia.js` (coberturaMinima() = null), Documento Mestre §14.3 e §18.

**Conflitos encontrados:**
Nenhum conflito técnico. O sistema antigo tinha um corte de 50% sem fonte, já removido.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. **Denominador por respondidos.** Nota = 10 − 10 × (Σ peso × resposta dos respondidos) ÷ (Σ peso × 3 dos respondidos).
2. **Denominador completo.** Nota = 10 − 10 × (Σ peso × resposta dos respondidos) ÷ (Σ peso × 3 de todos os itens do sistema).
3. **Exigência de completude.** Só existe nota se todos os itens do sistema forem respondidos.
4. **Cobertura mínima por sistema** combinada com um dos denominadores acima, com o número escolhido pela liderança.
5. **Mínimo de itens respondidos** por sistema ou eixo (contagem, não percentual).
6. **Criar os estados "recusou responder" e "não se aplica"**, decidindo se cada um sai do denominador ou conta como ausente.

**Consequência de cada opção:**
1. Pergunta em branco não conta nem a favor nem contra. Exemplo: sistema com 10 itens de peso 1, 2 respondidos com 3 e 8 em branco → nota 0 (pior possível), a mesma de quem respondeu os 10 com 3. Notas com pouca resposta parecem tão firmes quanto notas completas.
2. Pergunta em branco conta como "sem sinal". No mesmo exemplo → nota 8,0. A nota tende a ficar melhor quanto mais perguntas faltam.
3. Os dois denominadores dão o mesmo resultado; qualquer pergunta em branco deixa o sistema sem nota.
4. Abaixo do mínimo o sistema fica "não avaliável"; acima, usa o denominador escolhido. O número não foi sugerido aqui.
5. Mesmo efeito da opção 4, mas medido em número de perguntas.
6. A coleta passa a registrar o motivo da ausência; "não se aplica" pode sair do cálculo sem penalizar.

**O que acontece enquanto não decidirmos:**
As respostas são guardadas e a cobertura de preenchimento é mostrada. Nenhuma nota que dependa de resposta faltando é oficial. O validador mantém o bloqueio "política de parcialidade ausente".


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Cobertura por sistema = respondidos válidos / itens primários; avaliável com cobertura ≥ 0,80; em branco, recusada e não aplicável não são zero e reduzem a cobertura; nota pelos respondidos.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 9 — Faixas

**O que precisa ser decidido:**
Os limites, rótulos e mensagens que traduzem a nota de cada sistema em "baixo", "médio" ou "alto".

**Por que precisa ser decidido:**
A faixa decide qual mensagem a nutricionista e o paciente veem. Um limite diferente muda a leitura sem mudar a nota.

**O que existe hoje:**
15 faixas: 3 por sistema, com os mesmos limites nos cinco sistemas. Nota de 0 a 10, em que 10 = maior estabilidade.

| Rótulo | Limite inferior | Limite superior | Regra |
|---|---|---|---|
| baixo | 0 (incluído) | 3 (incluído) | nota <= 3 |
| medio | 3 (excluído) | 6 (incluído) | 3 < nota <= 6 |
| alto | 6 (excluído) | 10 (incluído) | nota > 6 |

**VALIDAÇÃO TÉCNICA:** as 15 faixas não têm lacuna, sobreposição nem ordem inválida. **Isso não é homologação clínica.**

Não existe faixa para o Índice: as quatro faixas antigas (<40, <60, <80, ≥80) foram removidas na Rodada 08 por não terem fonte. Mensagens de cada faixa no **Anexo B**.

**Fonte atual:**
`motor/bancos/regras.csv` (limites 3 e 6) e `motor/bancos/mensagens.csv` (mensagens).

**Conflitos encontrados:**
Nenhum conflito técnico.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar limites, rótulos e mensagens atuais.
2. Aprovar os limites e reescrever as mensagens.
3. Mudar os limites (iguais para todos os sistemas).
4. Definir limites diferentes por sistema.
5. Mudar o número de faixas.
6. Criar faixas para o Índice.

**Consequência de cada opção:**
1. A leitura atual da coleta experimental passa a ser oficial.
2. Mesma classificação, com outro texto.
3. Notas perto de 3 ou 6 mudam de faixa.
4. A mesma nota pode significar faixas diferentes em sistemas diferentes.
5. Rótulos e mensagens precisam ser criados para as novas faixas.
6. O Índice passa a ter rótulo; hoje não tem nenhum.

**O que acontece enquanto não decidirmos:**
Nenhum rótulo ou mensagem de faixa é exibido como oficial.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): 0 ≤ nota < 10/3 baixa; 10/3 ≤ nota < 20/3 intermediária; 20/3 ≤ nota ≤ 10 alta; classificação com precisão interna; exibição com 1 casa; mensagens neutras.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 10 — Índice HOLOS

**O que precisa ser decidido:**
Como os cinco sistemas se combinam num único Índice, e quando o Índice pode ser mostrado.

**Por que precisa ser decidido:**
O Índice é o número mais visível para o paciente. Pesos e regras de ausência mudam esse número sem mudar nenhuma resposta.

**O que existe hoje:**
Tudo abaixo é **RECUPERADO / NÃO HOMOLOGADO**:

| Item | Valor recuperado |
|---|---|
| Pesos α | Sistema Fúngico 0,2; Sistema Ácido-Inflamatório 0,2; Sistema Metabólico 0,2; Sistema Detox + Linfático 0,2; Sistema Mental-Emocional-Espiritual 0,2 (soma 1) |
| Fórmula | nota média = Σ nota do sistema × (peso do sistema ÷ soma dos pesos dos sistemas avaliáveis); Índice = nota média × 100 ÷ 10 |
| Escala | 0 a 100, 0 casas decimais |
| Renormalização | sistema sem nenhuma resposta sai do Índice e os pesos dos outros são redistribuídos proporcionalmente |
| Elegibilidade | basta um sistema ter uma resposta |
| Sistema não avaliável | excluído da média; não vale 10 nem 0 |

Também existe no código antigo uma conta de reserva (soma × 2), usada quando o motor não carrega; ela está fora da barreira e não é saída oficial.

O Documento Mestre (§16) diz que pesos iguais não são decisão final e que a renormalização automática não é adotada.

**Fonte atual:**
`motor/bancos/regras.csv` (peso_indice), `motor/src/motor.ts`, `motor/bancos/config.csv`, `app.js` (indiceDoMotor).

**Conflitos encontrados:**
A renormalização atual contraria o comportamento conservador descrito no Mestre §16.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Pesos iguais (0,20).
2. Pesos diferentes por sistema (valores a definir).
3. Índice só com os cinco sistemas avaliáveis.
4. Índice com mínimo de sistemas avaliáveis (número a definir), sem renormalizar.
5. Índice com renormalização, mostrado como "Índice parcial".

**Consequência de cada opção:**
1. Cada sistema influencia o Índice na mesma proporção.
2. Sistemas com peso maior movem mais o Índice.
3. Qualquer sistema sem nota deixa o Índice sem valor.
4. Com sistemas faltando, o Índice precisa de regra para o peso que falta.
5. Existe número mesmo com sistemas faltando, com identificação visível de que é parcial.

**O que acontece enquanto não decidirmos:**
Nenhum Índice é oficial. O validador mantém o bloqueio "configuração do Índice incompleta" (faltam α, elegibilidade e regra de Índice parcial).


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Pesos 0,20; só com os cinco sistemas avaliáveis; sem renormalização; sem Índice parcial; Índice = 10 × Σ(nota × 0,20); 0–100; 1 casa; sem faixas.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 11 — Tríada

**O que precisa ser decidido:**
Como as respostas formam os três eixos (físico, mental, espiritual): quais itens, com qual peso, em qual escala e com qual regra de ausência.

**Por que precisa ser decidido:**
A Tríada aparece para o paciente como leitura do equilíbrio entre corpo, mente e espírito. Hoje ela é derivada automaticamente do bloco de cada pergunta.

**O que existe hoje:**
| Item | O que existe hoje | O que foi aprovado |
|---|---|---|
| Eixos | fisico, mental, espiritual | nada |
| Associações | por bloco: físico ← 49 itens do bloco físico; mental ← 19 itens do bloco mental/emocional; espiritual ← 16 itens do bloco espiritual | nada |
| Pesos | o peso da primeira linha primária do item (SNT-101 e SNT-501 usam só a primeira linha) | nada |
| Escala | 0 a 10, eixo = 10 − carga | nada |
| Agregação | Σ peso × resposta ÷ Σ peso × 3, só com respondidos | nada |
| Ausência | eixo sem nenhuma resposta fica sem valor | nada |

O vínculo de cada item com a Tríada está no **Anexo A**.

**Fonte atual:**
`motor/src/motor.ts` (EIXO_POR_ORIGEM).

**Conflitos encontrados:**
- O vínculo é derivado do bloco, não de uma tabela aprovada; o Mestre §17 pede política explícita por ID.
- SNT-501 está no Sistema Mental Emocional Espiritual mas entra no eixo físico, porque está no bloco físico.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar o vínculo por bloco, com os pesos atuais.
2. Definir uma tabela própria item → eixo.
3. Pesos próprios da Tríada, diferentes dos pesos dos sistemas.
4. Outra escala ou agregação.
5. Regra de mínimo de respostas por eixo.

**Consequência de cada opção:**
1. A Tríada reproduz o cálculo experimental de hoje.
2. Um item pode ir para um eixo diferente do seu bloco, ou para mais de um eixo.
3. O eixo deixa de acompanhar automaticamente a mudança de peso nos sistemas.
4. O valor de cada eixo muda; a exibição ao paciente precisa acompanhar.
5. Eixo com poucas respostas fica sem valor.

**O que acontece enquanto não decidirmos:**
A Tríada não emite nota oficial. O validador mantém 3 bloqueios "configuração da Tríada incompleta".


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Eixos físico/mental/espiritual pelo bloco (49/19/16), peso 1, mesma orientação; eixo avaliável com cobertura ≥ 0,80; sem nota global, sem faixa, sem interpretação automática.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 12 — Comparabilidade entre aplicações

**O que precisa ser decidido:**
Quando duas aplicações do HOLOSCAN do mesmo paciente podem ser comparadas, e como a diferença é mostrada.

**Por que precisa ser decidido:**
A Evolução só pode dizer "melhorou" ou "piorou" se as duas aplicações foram medidas da mesma forma.

**O que existe hoje:**
Não existe regra. A Evolução mostra as aplicações lado a lado, sem calcular diferença.

**Fonte atual:**
`docs/v1/DECISOES-V1.md` (decisão 31).

**Conflitos encontrados:**
Nenhum.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Comparar só aplicações da mesma versão de edição e de pacote.
2. Comparar entre versões diferentes, com regra de equivalência por item.
3. Exigir cobertura mínima nas duas aplicações para comparar.
4. Definir janela de tempo mínima ou máxima entre aplicações.
5. Não comparar números; manter só lado a lado.

**Consequência de cada opção:**
1. Qualquer mudança aprovada no pacote cria uma "quebra": antes e depois não se comparam.
2. Permite comparar através de versões, mas exige uma tabela de equivalência aprovada.
3. Aplicações incompletas ficam fora da comparação.
4. Aplicações muito próximas ou muito distantes não são comparadas.
5. A Evolução continua como está hoje.

**O que acontece enquanto não decidirmos:**
A Evolução não mostra diferença de HOLOSCAN.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Delta só com mesmo paciente, edição, pacote, contrato do motor, sistema avaliável nas duas e mesmo conjunto pontuado; senão lado a lado; nunca melhorou/piorou automático.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 13 — Nomenclatura e textos dos cinco sistemas

**O que precisa ser decidido:**
O nome oficial de cada sistema e os textos de definição, padrão emocional e impacto espiritual.

**Por que precisa ser decidido:**
Esses textos aparecem na ficha, no relatório e para o paciente.

**O que existe hoje:**
| Código | Nome recuperado | Grafia no Documento Mestre | Fonte e status |
|---|---|---|---|
| fungico | Sistema Fúngico | Sistema Fúngico | motor/bancos/sistemas.csv:2 — rascunho 13/09 — aguarda revisão do Rodrigo |
| acido_inflamatorio | Sistema Ácido-Inflamatório | Sistema Ácido Inflamatório | motor/bancos/sistemas.csv:3 — rascunho 13/09 — o termo ácido não está definido e aguarda o Rodrigo |
| metabolico | Sistema Metabólico | Sistema Metabólico | motor/bancos/sistemas.csv:4 — rascunho 13/09 — aguarda revisão do Rodrigo |
| detox_linfatico | Sistema Detox + Linfático | Sistema Detox e Linfático | motor/bancos/sistemas.csv:5 — rascunho 13/09 — o termo detox não está definido e aguarda o Rodrigo |
| mental_emocional_espiritual | Sistema Mental-Emocional-Espiritual | Sistema Mental Emocional Espiritual | motor/bancos/sistemas.csv:6 — rascunho 13/09 — aguarda revisão do Rodrigo |

Nenhum texto foi validado clinicamente. Textos completos no **Anexo C**.

**Fonte atual:**
`motor/bancos/sistemas.csv`; Documento Mestre §11.

**Conflitos encontrados:**
Três nomes diferem do Mestre só na pontuação (hífen, "+" ou "e"). Os arquivos de origem registram que os termos "ácido" e "detox" não estão definidos. Nenhum nome foi alterado automaticamente.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Adotar a grafia do Documento Mestre.
2. Manter a grafia recuperada.
3. Aprovar os textos atuais.
4. Reescrever os textos (inclusive definir "ácido" e "detox").

**Consequência de cada opção:**
1. Três nomes mudam na tela; o código interno continua o mesmo.
2. A tela continua como hoje; o Mestre fica diferente da tela.
3. Os textos deixam de ser rascunho.
4. Os textos novos substituem os atuais em nova versão do pacote.

**O que acontece enquanto não decidirmos:**
Os textos aparecem marcados como rascunho e não entram como conteúdo oficial.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Nomes oficiais dos cinco sistemas e textos oficiais seguros; impacto espiritual causal e equivalentes fora do conteúdo oficial (legado preservado em provenance).

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 14 — Caso de referência (pedido pelo validador)

**O que precisa ser decidido:**
Pelo menos um exemplo completo, calculado pela liderança do método: um conjunto de respostas e o resultado esperado (nota por sistema, Índice e Tríada).

**Por que precisa ser decidido:**
É a prova de que o sistema calcula o que o método diz. Sem ele, ninguém consegue verificar se o pacote aprovado reproduz a regra decidida.

**O que existe hoje:**
Não existe nenhum caso de referência. Os exemplos usados nos testes automáticos são fictícios (TEST_FIXTURE_ONLY) e não representam o HOLOSCAN.

**Fonte atual:**
validador `validar_pacote_metodologico` (bloqueio "exemplo sem resultado esperado").

**Conflitos encontrados:**
Nenhum.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Fornecer um caso.
2. Fornecer vários casos (por exemplo: aplicação completa, incompleta e com itens invertidos).

**Consequência de cada opção:**
1. O validador libera esse bloqueio; o pacote passa a ter uma verificação.
2. Mais situações verificadas antes da publicação.

**O que acontece enquanto não decidirmos:**
O pacote não pode ser publicado, mesmo que todas as outras decisões estejam tomadas.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): REF-01, REF-02 e REF-03 com resultado esperado exato e de tela.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## DECISÃO 15 — Combinações e sugestões (CMB, REC, SEL)

**O que precisa ser decidido:**
Quais combinações de sistemas (CMB) e quais regras de sugestão de ferramentas (REC, SEL) existem na V1.

**Por que precisa ser decidido:**
Combinações e sugestões são mostradas à nutricionista como leitura e ação; hoje nenhuma está liberada.

**O que existe hoje:**
- 16 combinações (CMB); CMB-001 marcada "confirmado" no arquivo, mas sem pacote aprovado. Nenhuma é exibida.
- 23 regras de sugestão: REC-001 a REC-015 marcadas "legado não validado"; REC-016 a REC-023 "rascunho não validado". Nenhuma é apresentável.
- SEL-001 (seleção): 2 do pior sistema, 1 do segundo, momentum sem valor, máximo 4; rascunho.

**Fonte atual:**
`motor/bancos/combinacoes.csv`, `corpo-bancos.js`.

**Conflitos encontrados:**
CMB-001 com status "confirmado" sem decisão registrada.

**Opções tecnicamente possíveis** (listadas sem recomendação, em ordem neutra):
1. Aprovar um subconjunto de CMB/REC/SEL.
2. Não ter combinações nem sugestões automáticas na V1.
3. Reescrever as regras.

**Consequência de cada opção:**
1. Só as aprovadas aparecem, e só com pacote aprovado.
2. A nutricionista escolhe ferramentas sem sugestão do sistema.
3. Novas regras entram como nova versão do pacote.

**O que acontece enquanto não decidirmos:**
Nenhuma combinação ou sugestão automática é mostrada.


**Campo para decisão humana:**

DECISÃO (Etapa 4.2 — FECHADA): Nenhuma combinação ou sugestão automática oficial na V1; CMB-001..016, REC-001..023 e SEL-001 como legado não oficial; seleção manual profissional preservada.

Justificativa:
Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). As opções acima ficam como registro do que foi considerado.

Responsável:
Liderança do método HOLOSCAN (registro da Etapa 4.2; assinatura nominal na aprovação formal do pacote)

Data:
01/10/2026


---

## Anexo A — As 84 perguntas como estão hoje (RECUPERADO / NÃO HOMOLOGADO)

| # | ID | Bloco | Enunciado | Escala | Orientação | Sistema(s): peso | Tríada: peso |
|---|---|---|---|---|---|---|---|
| 1 | SNT-101 | Físico | Você sente vontade forte de doce ou pão quase todo dia? | frequencia | direta | Sistema Fúngico: 2; Sistema Metabólico: 3 | fisico: 2 |
| 2 | SNT-102 | Físico | Sua barriga incha ou dá gases depois das refeições? | frequencia | direta | Sistema Fúngico: 3 | fisico: 3 |
| 3 | SNT-103 | Físico | Sua língua costuma ter uma camada esbranquiçada? | frequencia | direta | Sistema Fúngico: 3 | fisico: 3 |
| 4 | SNT-104 | Físico | Você tem candidíase ou sapinho com frequência? | frequencia | direta | Sistema Fúngico: 3 | fisico: 3 |
| 5 | SNT-105 | Físico | Você tem micose de pele ou unha que volta sempre? | frequencia | direta | Sistema Fúngico: 3 | fisico: 3 |
| 6 | SNT-106 | Físico | Você sente coceira na região íntima ou anal? | frequencia | direta | Sistema Fúngico: 2 | fisico: 2 |
| 7 | SNT-107 | Físico | Sua cabeça fica pesada ou confusa depois de comer massa ou doce? | frequencia | direta | Sistema Fúngico: 2 | fisico: 2 |
| 8 | SNT-108 | Físico | Você tem caspa ou coceira no couro cabeludo com frequência? | frequencia | direta | Sistema Fúngico: 1 | fisico: 1 |
| 9 | SNT-109 | Físico | Você precisou tomar antibiótico ao longo da vida? | frequencia | direta | Sistema Fúngico: 2 | fisico: 2 |
| 10 | SNT-110 | Físico | Você passa mal com pouca bebida alcoólica? | frequencia | direta | Sistema Fúngico: 2 | fisico: 2 |
| 11 | SNT-111 | Físico | Você vive com nariz entupido ou sinusite? | frequencia | direta | Sistema Fúngico: 1 | fisico: 1 |
| 12 | SNT-201 | Físico | Você sente dor nas articulações mesmo sem ter feito esforço? | frequencia | direta | Sistema Ácido-Inflamatório: 3 | fisico: 3 |
| 13 | SNT-202 | Físico | Você acorda com o corpo travado que leva um tempo para soltar? | frequencia | direta | Sistema Ácido-Inflamatório: 3 | fisico: 3 |
| 14 | SNT-203 | Físico | Você sente o corpo dolorido sem causa clara? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 15 | SNT-204 | Físico | Você sente azia ou queimação no estômago? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 16 | SNT-205 | Físico | Você tem dor de cabeça mais de uma vez por semana? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 17 | SNT-206 | Físico | Sua pele tem crises de acne inflamada, eczema ou psoríase? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 18 | SNT-207 | Físico | Sua gengiva sangra ao escovar? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 19 | SNT-208 | Físico | Você percebe que piora quando come ultraprocessado ou açúcar? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 20 | SNT-209 | Físico | Suas mãos ou dedos amanhecem inchados? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | fisico: 2 |
| 21 | SNT-210 | Físico | Seus exames costumam mostrar PCR ou VHS acima do normal? | frequencia | direta | Sistema Ácido-Inflamatório: 3 | fisico: 3 |
| 22 | SNT-301 | Físico | Você fica com muito sono logo depois do almoço? | frequencia | direta | Sistema Metabólico: 3 | fisico: 3 |
| 23 | SNT-303 | Físico | Você sente fome de novo pouco tempo depois de ter comido? | frequencia | direta | Sistema Metabólico: 3 | fisico: 3 |
| 24 | SNT-304 | Físico | Você come depois do jantar mesmo sem fome real? | frequencia | direta | Sistema Metabólico: 3 | fisico: 3 |
| 25 | SNT-305 | Físico | Sua gordura se concentra na barriga? | intensidade | direta | Sistema Metabólico: 3 | fisico: 3 |
| 26 | SNT-306 | Físico | A pele do seu pescoço ou axila está mais escura e aveludada? | intensidade | direta | Sistema Metabólico: 3 | fisico: 3 |
| 27 | SNT-307 | Físico | Você fica irritado ou trêmulo se atrasa uma refeição? | frequencia | direta | Sistema Metabólico: 2 | fisico: 2 |
| 28 | SNT-308 | Físico | Você tem dificuldade de perder peso mesmo comendo pouco? | intensidade | direta | Sistema Metabólico: 2 | fisico: 2 |
| 29 | SNT-309 | Físico | Seus exames costumam mostrar triglicerídeos altos ou HDL baixo? | frequencia | direta | Sistema Metabólico: 3 | fisico: 3 |
| 30 | SNT-401 | Físico | Você percebe inchaço nas pernas ou nos pés no fim do dia? | frequencia | direta | Sistema Detox + Linfático: 3 | fisico: 3 |
| 31 | SNT-402 | Físico | Seu rosto amanhece inchado? | frequencia | direta | Sistema Detox + Linfático: 2 | fisico: 2 |
| 32 | SNT-403 | Físico | Cheiros fortes te incomodam mais do que incomodam as outras pessoas? | frequencia | direta | Sistema Detox + Linfático: 3 | fisico: 3 |
| 33 | SNT-404 | Físico | Comida gordurosa te faz passar mal ou pesa muito? | frequencia | direta | Sistema Detox + Linfático: 2 | fisico: 2 |
| 34 | SNT-405 | Físico | Você passa um dia ou mais sem evacuar? | frequencia | direta | Sistema Detox + Linfático: 3 | fisico: 3 |
| 35 | SNT-406 | Físico | Uma taça já te dá ressaca no dia seguinte? | frequencia | direta | Sistema Detox + Linfático: 2 | fisico: 2 |
| 36 | SNT-407 | Físico | Você reage muito forte a medicamento ou a café? | frequencia | direta | Sistema Detox + Linfático: 2 | fisico: 2 |
| 37 | SNT-408 | Físico | Sua pele está opaca ou com olheiras marcadas? | intensidade | direta | Sistema Detox + Linfático: 2 | fisico: 2 |
| 38 | SNT-409 | Físico | Seu suor tem odor forte? | frequencia | direta | Sistema Detox + Linfático: 2 | fisico: 2 |
| 39 | SNT-410 | Físico | Você tem celulite acentuada? | intensidade | direta | Sistema Detox + Linfático: 1 | fisico: 1 |
| 40 | SNT-501 | Físico | Você acorda cansado mesmo dormindo as horas necessárias? | frequencia | direta | Sistema Metabólico: 2; Sistema Mental-Emocional-Espiritual: 3 | fisico: 2 |
| 41 | SNT-502 | Físico | Você demora a dormir porque a cabeça não desliga? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | fisico: 3 |
| 42 | SNT-503 | Físico | Você acorda de madrugada e custa a voltar a dormir? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 2 | fisico: 2 |
| 43 | SNT-504 | Físico | Você se preocupa muito com coisas que ainda nem aconteceram? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | fisico: 3 |
| 44 | SNT-505 | Físico | Você come para se acalmar quando fica ansioso ou triste? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | fisico: 3 |
| 45 | SNT-506 | Físico | Você sente que está sempre em alerta esperando algo dar errado? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | fisico: 3 |
| 46 | SNT-507 | Físico | Você consegue perceber quando está com fome e quando já está satisfeito? | frequencia | invertida | Sistema Mental-Emocional-Espiritual: 3 | fisico: 3 |
| 47 | SNT-508 | Físico | Você tem dificuldade de manter o foco em uma tarefa? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 2 | fisico: 2 |
| 48 | SNT-509 | Físico | Você perde a paciência com facilidade? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 2 | fisico: 2 |
| 49 | SNT-510 | Físico | Você tem se afastado das pessoas? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 2 | fisico: 2 |
| 50 | EMO-101 | Mental/emocional | Você adia começar coisas mesmo sabendo que precisa fazer? | frequencia | direta | Sistema Fúngico: 3; Sistema Metabólico: 3 (sec.) | mental: 3 |
| 51 | EMO-102 | Mental/emocional | Você sente que sua vida está desorganizada e não consegue pôr ordem? | frequencia | direta | Sistema Fúngico: 2 | mental: 2 |
| 52 | EMO-103 | Mental/emocional | Você sente um peso para sair do lugar mesmo querendo mudar? | frequencia | direta | Sistema Fúngico: 2; Sistema Mental-Emocional-Espiritual: 2 (sec.) | mental: 2 |
| 53 | EMO-201 | Mental/emocional | Você se irrita com facilidade por coisas pequenas? | frequencia | direta | Sistema Ácido-Inflamatório: 3; Sistema Mental-Emocional-Espiritual: 3 (sec.) | mental: 3 |
| 54 | EMO-202 | Mental/emocional | Sua raiva sobe rápido e demora a passar? | frequencia | direta | Sistema Ácido-Inflamatório: 3 | mental: 3 |
| 55 | EMO-203 | Mental/emocional | Você costuma aceitar o que não quer para evitar conflito? | frequencia | direta | Sistema Ácido-Inflamatório: 2; Sistema Detox + Linfático: 2 (sec.) | mental: 2 |
| 56 | EMO-204 | Mental/emocional | Você engole o que gostaria de dizer para não criar problema? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | mental: 2 |
| 57 | EMO-301 | Mental/emocional | Você sente um vazio que a comida parece tentar preencher? | frequencia | direta | Sistema Metabólico: 3; Sistema Mental-Emocional-Espiritual: 3 (sec.) | mental: 3 |
| 58 | EMO-302 | Mental/emocional | Você passa os dias no piloto automático sem perceber o que está fazendo? | frequencia | direta | Sistema Metabólico: 3; Sistema Mental-Emocional-Espiritual: 3 (sec.) | mental: 3 |
| 59 | EMO-303 | Mental/emocional | Você usa comida como recompensa depois de um dia difícil? | frequencia | direta | Sistema Metabólico: 2 | mental: 2 |
| 60 | EMO-401 | Mental/emocional | Você se pega remoendo uma mágoa antiga? | frequencia | direta | Sistema Detox + Linfático: 3 | mental: 3 |
| 61 | EMO-402 | Mental/emocional | Você costuma guardar o que sente em vez de falar? | frequencia | direta | Sistema Detox + Linfático: 3; Sistema Mental-Emocional-Espiritual: 3 (sec.) | mental: 3 |
| 62 | EMO-403 | Mental/emocional | Você tem dificuldade de aceitar ajuda ou cuidado das pessoas? | frequencia | direta | Sistema Detox + Linfático: 2 | mental: 2 |
| 63 | EMO-501 | Mental/emocional | Você fala consigo mesmo de um jeito que não falaria com um amigo? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | mental: 3 |
| 64 | EMO-502 | Mental/emocional | Quando você sai da linha um dia você sente que perdeu tudo e abandona? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3; Sistema Metabólico: 3 (sec.) | mental: 3 |
| 65 | EMO-503 | Mental/emocional | Você se descreve com frases como sempre fui assim ou não tenho força de vontade? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | mental: 3 |
| 66 | EMO-504 | Mental/emocional | Você sente culpa ou vergonha depois de comer? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3; Sistema Metabólico: 3 (sec.) | mental: 3 |
| 67 | EMO-505 | Mental/emocional | Você sente que seu corpo trabalha contra você? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | mental: 3 |
| 68 | EMO-507 | Mental/emocional | Você olha para sua vida hoje e se reconhece nela? | frequencia | invertida | Sistema Mental-Emocional-Espiritual: 3 | mental: 3 |
| 69 | ESP-101 | Espiritual/propósito | Você sente que sua vida tem uma direção clara? | intensidade | invertida | Sistema Metabólico: 3 | espiritual: 3 |
| 70 | ESP-102 | Espiritual/propósito | Você sabe dizer o que veio fazer nesta vida? | intensidade | invertida | Sistema Mental-Emocional-Espiritual: 2 | espiritual: 2 |
| 71 | ESP-103 | Espiritual/propósito | Sua rotina de hoje te afasta do que você quer para a sua vida? | intensidade | direta | Sistema Metabólico: 2 | espiritual: 2 |
| 72 | ESP-201 | Espiritual/propósito | Suas escolhas alimentares combinam com aquilo que você diz valorizar? | frequencia | invertida | Sistema Mental-Emocional-Espiritual: 3 | espiritual: 3 |
| 73 | ESP-202 | Espiritual/propósito | Você tem clareza sobre o que é inegociável para você? | intensidade | invertida | Sistema Mental-Emocional-Espiritual: 2 | espiritual: 2 |
| 74 | ESP-203 | Espiritual/propósito | Você abre mão do que é inegociável para você só para agradar alguém? | frequencia | direta | Sistema Ácido-Inflamatório: 2 | espiritual: 2 |
| 75 | ESP-301 | Espiritual/propósito | Você sente que existe algo maior te sustentando? | intensidade | invertida | Sistema Mental-Emocional-Espiritual: 2 | espiritual: 2 |
| 76 | ESP-302 | Espiritual/propósito | Você reserva um momento do dia para agradecer alguma coisa? | frequencia | invertida | Sistema Mental-Emocional-Espiritual: 2 | espiritual: 2 |
| 77 | ESP-303 | Espiritual/propósito | Você começa a comer sem fazer nenhuma pausa antes? | frequencia | direta | Sistema Metabólico: 2 | espiritual: 2 |
| 78 | ESP-401 | Espiritual/propósito | Você sente que não merece as coisas boas que conquista? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | espiritual: 3 |
| 79 | ESP-402 | Espiritual/propósito | Quando as coisas começam a dar certo você acaba boicotando? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 3 | espiritual: 3 |
| 80 | ESP-403 | Espiritual/propósito | Você repete sobre si mesmo histórias que ouviu na família e nunca questionou? | frequencia | direta | Sistema Mental-Emocional-Espiritual: 2 | espiritual: 2 |
| 81 | ESP-404 | Espiritual/propósito | Você acredita que para ter saúde precisa sofrer ou se privar? | intensidade | direta | Sistema Ácido-Inflamatório: 2 | espiritual: 2 |
| 82 | ESP-405 | Espiritual/propósito | Você carrega o peso de não ter conseguido perdoar alguém? | frequencia | direta | Sistema Detox + Linfático: 3 | espiritual: 3 |
| 83 | ESP-501 | Espiritual/propósito | Você passa algum tempo em contato com a natureza? | frequencia | invertida | Sistema Fúngico: 2 | espiritual: 2 |
| 84 | ESP-502 | Espiritual/propósito | Você faz suas refeições sozinho e com pressa? | frequencia | direta | Sistema Detox + Linfático: 2 | espiritual: 2 |

## Anexo B — Mensagens das faixas (RECUPERADO / NÃO HOMOLOGADO)

| Sistema | Faixa | Mensagem para a nutricionista | Mensagem para o paciente |
|---|---|---|---|
| Sistema Fúngico | baixo | O Fúngico é o terreno mais carregado deste mapa. Os sinais de mucosa e pele aparecem junto com a vontade recorrente de doce — e o padrão emocional que o material associa a ele é estagnação e desordem. | Seu corpo vem dando sinais de que o terreno está desorganizado: aquilo que volta sempre — na pele, na boca, no intestino — costuma andar junto com a vontade forte de doce. |
| Sistema Fúngico | medio | O Fúngico tem sinais presentes, mas ainda não dominantes. Vale olhar quais marcadores pesaram antes de intervir aqui. | Existem sinais aparecendo neste terreno, e ainda dá para agir cedo. |
| Sistema Fúngico | alto | O Fúngico está equilibrado hoje. Não é prioridade de conduta neste momento. | Este terreno está bem hoje. |
| Sistema Ácido-Inflamatório | baixo | O Ácido-Inflamatório é o terreno mais carregado deste mapa: dor sem causa mecânica clara, rigidez ao acordar e mucosas reagindo mais do que deveriam. O padrão emocional associado é irritação e reatividade. | Seu corpo está reagindo mais do que precisaria — e isso aparece de dois jeitos ao mesmo tempo: na dor e na paciência que fica curta. |
| Sistema Ácido-Inflamatório | medio | O Ácido-Inflamatório tem sinais presentes sem dominar o quadro. Vale conferir os marcadores de dor e o par emocional antes de intervir. | Há sinais de irritação aparecendo — no corpo e no humor. |
| Sistema Ácido-Inflamatório | alto | O Ácido-Inflamatório está equilibrado hoje. | Este terreno está bem hoje. |
| Sistema Metabólico | baixo | O Metabólico é o terreno mais carregado deste mapa: a energia oscila ao longo do dia e o comer acompanha essa oscilação. O padrão emocional associado é vazio e falta de propósito — e é o sistema onde sinal do corpo e comportamento alimentar se sustentam um ao outro. | Sua energia tem oscilado muito ao longo do dia, e a comida vem tentando dar conta disso. Existe um vazio nessa conta que não é fome. |
| Sistema Metabólico | medio | O Metabólico tem sinais presentes sem dominar o quadro. Vale conferir a compulsão e a resposta depois das refeições. | Sua energia está oscilando ao longo do dia. |
| Sistema Metabólico | alto | O Metabólico está equilibrado hoje. | Este terreno está bem hoje. |
| Sistema Detox + Linfático | baixo | O Detox + Linfático é o terreno mais carregado deste mapa: o que entra não está saindo na mesma medida — retenção, intestino lento, e sensibilidade aumentada a cheiro, álcool e medicamento. O padrão emocional associado é acúmulo de mágoas e emoções não processadas. | Há acúmulo — e ele aparece tanto no corpo, no inchaço e no intestino, quanto no que ficou sem ser dito ou resolvido. |
| Sistema Detox + Linfático | medio | O Detox + Linfático tem sinais presentes sem dominar o quadro. Vale conferir retenção e sensibilidade a odores. | Seu corpo está acumulando um pouco mais do que consegue eliminar. |
| Sistema Detox + Linfático | alto | O Detox + Linfático está equilibrado hoje. | Este terreno está bem hoje. |
| Sistema Mental-Emocional-Espiritual | baixo | O Mental-Emocional-Espiritual é o terreno mais carregado deste mapa: sono, estado de alerta e a narrativa interna aparecem juntos. É o sistema que descreve em que estado a paciente chega para tudo o mais — e por isso costuma sustentar os outros quatro. | O que aparece aqui não é falta de disciplina: é o estado em que você tem chegado para o dia. O sono, o alerta constante e o jeito como você fala consigo mesma estão sustentando o resto. |
| Sistema Mental-Emocional-Espiritual | medio | O Mental-Emocional-Espiritual tem sinais presentes sem dominar o quadro. Vale conferir a narrativa interna e a qualidade do sono. | Sua mente tem trabalhado mais do que descansado. |
| Sistema Mental-Emocional-Espiritual | alto | O Mental-Emocional-Espiritual está equilibrado hoje. | Este terreno está bem hoje. |

## Anexo C — Textos dos cinco sistemas (RECUPERADO / NÃO HOMOLOGADO)

### Sistema Fúngico

- Definição: O terreno em que a microbiota perde equilíbrio a favor de fungos e leveduras. Caracteriza-se por sinais em mucosa e pele que voltam, por resposta rápida ao carboidrato simples, e por uma sensação de peso e desorganização que acompanha o quadro.
- Padrão emocional: estagnação e desordem
- Impacto espiritual: perda de vitalidade e clareza
- Fonte: motor/bancos/sistemas.csv:2 — rascunho 13/09 — aguarda revisão do Rodrigo

### Sistema Ácido-Inflamatório

- Definição: O terreno de inflamação de baixo grau sustentada. Expressa-se como dor sem causa mecânica clara, rigidez ao acordar, e mucosas e pele reagindo mais do que deveriam — acompanhado de um encurtamento do pavio.
- Padrão emocional: irritação e reatividade
- Impacto espiritual: bloqueio no plexo solar
- Fonte: motor/bancos/sistemas.csv:3 — rascunho 13/09 — o termo ácido não está definido e aguarda o Rodrigo

### Sistema Metabólico

- Definição: O terreno da desregulação da glicose e da resposta à insulina, lido junto com o comportamento alimentar que o sustenta. É o único sistema em que o sinal do corpo e o padrão de comer estão na mesma leitura — porque um alimenta o outro.
- Padrão emocional: vazio e falta de propósito
- Impacto espiritual: dessintonização do corpo como templo
- Fonte: motor/bancos/sistemas.csv:4 — rascunho 13/09 — aguarda revisão do Rodrigo

### Sistema Detox + Linfático

- Definição: O terreno da sobrecarga das vias de eliminação — hepática, intestinal e linfática. Expressa-se como o que entra e não sai: retenção, intestino lento, pele sem viço — e como sensibilidade aumentada a tudo que precisa ser metabolizado.
- Padrão emocional: acúmulo de mágoas e emoções não processadas
- Impacto espiritual: bloqueio do fluxo
- Fonte: motor/bancos/sistemas.csv:5 — rascunho 13/09 — o termo detox não está definido e aguarda o Rodrigo

### Sistema Mental-Emocional-Espiritual

- Definição: O terreno do estado do sistema nervoso e da relação da pessoa consigo mesma. Reúne sono, alerta, foco e a narrativa interna — e chega até a pergunta de sentido. É o sistema que descreve em que estado a pessoa chega para tudo o mais.
- Padrão emocional: desconexão de si
- Impacto espiritual: queda de frequência geral
- Fonte: motor/bancos/sistemas.csv:6 — rascunho 13/09 — aguarda revisão do Rodrigo

