# PLANO — PLAYBOOK HOLOS (PB-V1): Resultado sem depender da IA

Data: 14/10/2026 · Situação: **APROVADO (14/10) E IMPLEMENTADO** (deploy pendente). Conteúdo PB-V1 aprovado; o PDF do playbook está em `docs/v1/PLAYBOOK-HOLOS-PB-V1.pdf` (gerado por `scripts/gerar-pdf-playbook.mjs`, direto do conteúdo do sistema).

---

## 1. O problema e a solução em uma frase

Sem a HOLOS AI, a nutricionista precisaria escrever sozinha o foco, os direcionamentos e as estratégias. Ela não tem o domínio do método para fazer isso bem e rápido.

**Solução:** um **Playbook HOLOS** dentro do sistema. É uma biblioteca curta e aprovada por você de focos e estratégias, organizada pelos 5 sistemas e por Corpo · Mente · Espírito.

O sistema mostra **só as opções que combinam** com:
- o HOLOSCAN do paciente (os 2 sistemas prioritários);
- as ferramentas aplicadas.

A nutricionista **escolhe e ajusta**, sem escrever do zero, e gera o mesmo Resultado e o mesmo PDF de hoje.

**Meta de uso:** montar um Resultado em **5 a 8 minutos**.

---

## 2. Princípios (não mudam)

1. **A nutricionista decide.** O sistema sugere opções e nada vai para o paciente sem ela escolher.
2. **Coerência com o método.**
   - As opções vêm dos 2 sistemas que o HOLOSCAN já prioriza ("Por onde investigar").
   - As ferramentas aplicadas só **reordenam** as opções. Elas não mudam o HOLOSCAN.
3. **Sem diagnóstico, sem prescrição.**
   - As estratégias são de **hábito, observação e rotina**. Não têm quantidades, alimentos proibidos ou "dieta", nem suplementos.
   - Os mesmos termos que o sistema já sinaliza hoje continuam valendo, e um teste vai garantir que nenhum texto do playbook os use.
4. **Pouco e bom.** Um Resultado usa só 3 a 6 estratégias.
5. **Rastreável.** Cada item gerado guarda de onde veio, por exemplo "Playbook PB-V1, estratégia ME-C1". Se o playbook mudar depois, os Resultados antigos ficam como foram emitidos.
6. **Tudo editável.** A nutricionista pode ajustar o texto de qualquer item antes de gerar.

---

## 3. Como a nutricionista vai usar (passo a passo)

### 3.1 Antes do Resultado (já existe hoje)
1. Mapeamento Holístico (o paciente responde antes da consulta).
2. HOLOSCAN aplicado e salvo. O sistema calcula os **2 sistemas prioritários**.
3. Próximos Passos (PP-V1): o sistema indica **quais ferramentas aplicar**, e ela aplica as que fizerem sentido.

### 3.2 Montar o Resultado: botão novo **"Montar com o Playbook"**
O botão fica na aba **Resultado HOLOS**, ao lado de "Gerar pela HOLOS AI". Na aba Holos IA também aparece o atalho "Sem IA? Monte com o Playbook".

O assistente abre em **4 passos numa tela só**:

**Passo 1 — Leitura do paciente (automático, só conferir)**
- **Mostra:**
  - os 2 sistemas prioritários do HOLOSCAN;
  - as ferramentas concluídas;
  - o estado da Linha do Momentum, se foi aplicada.
- **"Seu momento agora" e "O que você quer mudar":** o sistema traz as respostas do paciente no Mapeamento, como já faz hoje. Ela marca as que entram (✓) e pode ajustar o texto.

**Passo 2 — Escolher o Foco desta fase (1 clique)**
- Aparecem **6 cartões**: 3 focos de cada sistema prioritário. Cada cartão mostra o foco e o "por que" em uma linha.
- Ela escolhe **1**. Se nenhum servir, tem o botão "Escrever outro foco".
- O foco escolhido já traz:
  - os **2 direcionamentos** ("O que vamos trabalhar agora");
  - o **"Até o próximo encontro, observe"** (3 itens);
  - a **"Próxima etapa"**.
  
  Tudo vem marcado e editável, e ela pode desmarcar.

**Passo 3 — Escolher as estratégias (3 a 6 cliques)**
- **Três colunas:** Corpo · Mente · Espírito.
- **O que entra:** as 12 estratégias do sistema do foco, as 12 do outro sistema prioritário e as 15 gerais (estas recolhidas em "Ver estratégias gerais").
- **Ordem:**
  1. primeiro as do sistema do foco;
  2. dentro dele, primeiro as que **combinam com as ferramentas aplicadas**, com o selo "combina com o que apareceu no Gatilhos & Respostas", por exemplo.
- **Ao marcar uma estratégia,** ela abre já preenchida com "O que fazer", "Quando / com que frequência", "O que observar" e "Até quando" (padrão: até o próximo encontro). Ela pode editar qualquer campo numa linha.
- **Contador:** "4 estratégias escolhidas".
- **Linha do Momentum (se foi aplicada):** aparece uma orientação de quantidade. **Ver decisão D2.**

**Passo 4 — Revisar e gerar**
- **Prévia** exatamente como o paciente vai ver (o mesmo documento do PDF refinado).
- Botão **"Gerar Resultado"**. Ele salva e finaliza pelo mesmo caminho da Holos IA (gerar automático), então:
  - o Resultado fica pronto;
  - o PDF sai com 2 a 5 páginas;
  - o WhatsApp funciona;
  - o "Gerar PDF" emite o Resultado Final.

### 3.3 No retorno
O botão é o mesmo. O passo 1 muda: **"Como foi desde o último encontro"**.

**Para cada estratégia anterior:**
- **"Conseguiu aplicar?":** Sim / Em parte / Não.
- **Decisão:** Manter / Ajustar / Substituir / Concluir.
- Uma linha opcional de comentário.

**O que vem automático:**
- "O que já está mudando" e "O que ainda pesa" vêm do Mapeamento de retorno, como hoje.
- **Manter** leva a estratégia direto para o novo plano.
- **Substituir** abre a lista do passo 3.

**Foco:** a opção padrão é **"Manter o foco"**, com um clique. Ela também pode trocar pelos cartões.

O resultado do retorno sai no formato que já existe: "O que mudou desde o último encontro", "Estratégias testadas" e "O que manter e o que ajustar".

### 3.4 E o editor manual de hoje?
Continua existindo como "Montar manualmente (avançado)", para quem quiser escrever tudo.

---

## 4. Como o sistema escolhe o que mostrar (regras)

| Regra | Como funciona |
|---|---|
| Focos | 3 de cada um dos **2 sistemas prioritários** do HOLOSCAN salvo. Sem HOLOSCAN salvo, o botão fica desabilitado, com o aviso "Salve o HOLOSCAN primeiro". |
| Estratégias | Sistema do foco + o outro sistema prioritário + gerais |
| Ordem | Sistema do foco → combina com ferramenta aplicada → ordem do playbook |
| Ferramentas | Cada estratégia tem etiquetas das ferramentas com que combina. Etiqueta só ordena e mostra o selo; **não esconde** nada |
| Quantidade | Mínimo 1 e máximo 6 estratégias (limite que o PDF já usa) |
| Sem invenção | O sistema não cria texto: só copia o texto aprovado do playbook, que a nutricionista pode editar |

---

## 5. Estrutura de cada item do Playbook

**Foco** (3 por sistema):
- `id` (ex.: `ME-F1`);
- `texto`: o foco, como o paciente lê;
- `porque`: uma frase para o paciente;
- `direcionamentos`: 2 itens, cada um com título, território (Corpo/Mente/Espírito/Integrado) e objetivo;
- `observar`: 3 itens;
- `proxima_etapa`: uma frase.

**Estratégia** (12 por sistema + 15 gerais):
- `id` (ex.: `ME-C1`) e `sistema` (ou "geral");
- `territorio`: corpo, mente ou espírito;
- `titulo`;
- `acao`: o que fazer;
- `contexto`: quando / com que frequência;
- `observar`: o que observar;
- `prazo` (padrão: até o próximo encontro);
- `ferramentas`: as etiquetas, por exemplo `gatilhos_respostas_v1` ou `mapa_rotina_v1`.

Esses campos são **os mesmos que o Resultado já guarda hoje** (foco_atual, direcionamentos, estratégias com ação, observar, contexto e prazo). Por isso o PDF e a visão do paciente não mudam.

---

## 6. O que muda no sistema

| Peça | O que é | Tamanho |
|---|---|---|
| `playbook-holos.js` (novo) | O conteúdo PB-V1 (dados) + a função que escolhe e ordena as opções. Funciona também no Node, para testes | médio |
| `resultado-playbook.js` (novo) | O assistente de 4 passos (primeira consulta e retorno) | médio/grande |
| `resultado-holos.js` / `holos-ai-ponte.js` | Botão "Montar com o Playbook" e atalho na aba Holos IA | pequeno |
| **Sem migration** | Os itens do playbook entram com a origem que o servidor já aceita (`nutricionista`: foi ela quem escolheu). A rastreabilidade fica no id de cada item (`pb1-<ID do playbook>-…`) e na leitura profissional ("Montado com o Playbook HOLOS PB-V1 · Foco ME-F1 · Estratégias …"). O deploy é só do site | — |
| `style.css` | Cartões de foco, colunas de estratégia, selo "combina com…" | médio |
| Testes novos | (1) escolha e ordem das opções; (2) nenhum texto do playbook usa termo proibido; (3) primeira consulta de ponta a ponta até o PDF; (4) retorno com manter, ajustar e substituir; (5) Resultado antigo intacto; (6) o deploy continua sem migration | médio |

**O que NÃO muda:**
- HOLOSCAN, notas, Índice, Tríade e faixas;
- PP-V1;
- o fluxo da Holos IA;
- o layout do PDF;
- as tabelas, salvo a lista de origens aceitas.

**Depois (fase 2, opcional):**
- Levar o playbook para o banco, numa tela "Metodologia > Playbook" onde você edita os textos sem precisar de deploy.
- Colocar o playbook na base da Holos IA, para a IA escolher pelos mesmos IDs. Assim o resultado fica igual com ou sem IA.

---

## 7. Cronograma

| Quando | O quê | Quem |
|---|---|---|
| Hoje | Este plano + rascunho do playbook (seção 9) | eu |
| +1–2 dias | **Revisão do conteúdo:** marcar cada item como ✔ ok, ✎ ajustar ou ✖ tirar | **você** |
| em paralelo | Programar o sistema (o conteúdo é só dado e entra no fim) | eu |
| +2 dias | `playbook-holos.js`, migration, testes de escolha e de termos | eu |
| +2 dias | Assistente (primeira consulta e retorno), testes de ponta a ponta, PDF | eu |
| +1 dia | Ajustes da sua revisão, 3 casos de exemplo com PDF, suíte completa, deploy preparado | eu |
| fim | Aplicar a migration + deploy | você |

**Total: cerca de 5 dias úteis depois do "pode fazer"**, desde que a revisão do conteúdo saia nos 2 primeiros dias.

---

## 8. Decisões que preciso de você

| # | Pergunta | Minha recomendação |
|---|---|---|
| D1 | O conteúdo do playbook (seção 9) está no caminho certo? | Revise e marque ✔ / ✎ / ✖ |
| D2 | Usar a Linha do Momentum para **orientar** a quantidade de estratégias? Preservar 2–3 · Reorganizar 3–4 · Construir 4–5 · Expandir 5–6. Esse texto ainda não é homologado | Sim, só como orientação, sem travar |
| D3 | **Escolher no assistente = confirmar e compartilhar com o paciente?** | Sim. É ela quem clica, e tudo fica editável antes de gerar |
| D4 | Playbook no código agora (PB-V1) e editável pelo painel depois? | Sim: é mais rápido para lançar |
| D5 | O mesmo playbook vai para a Holos IA (Gem/GPT/API)? | Sim, na fase 2 |
| D6 | As 15 gerais aparecem abertas ou recolhidas? | Recolhidas, para não poluir |

---

## 9. RASCUNHO DO PLAYBOOK PB-V1

**Como ler:**
- **C** = Corpo, **M** = Mente, **E** = Espírito.
- "Até quando" é sempre "até o próximo encontro", salvo indicação.
- **Ferramentas (etiquetas):**

  | Etiqueta | Ferramenta |
  |---|---|
  | OQ3 | OQ³ |
  | MOM | Linha do Momentum |
  | ROT | Mapa da Rotina |
  | PQQ | Escada dos Porquês |
  | CRE | Mapa de Crenças |
  | GAT | Gatilhos & Respostas |
  | PRO | Mapa do Propósito |
  | RODA | Roda Holística da Vida |
  | CARTA | Carta ao Futuro Eu |
  | CON | Conexão & Pertencimento |

> Rascunho escrito a partir dos textos oficiais dos cinco sistemas (HOLOS-V1 v7, CE-1) e das dez ferramentas. **Precisa da sua revisão metodológica antes de entrar no sistema.**

---

### 9.1 Sistema METABÓLICO
*(energia, fome, saciedade, comportamento alimentar, refeições, rotina)*

**Focos**

| ID | Foco | Por que | Direcionamentos | Observe | Próxima etapa |
|---|---|---|---|---|---|
| ME-F1 | Organizar os horários das refeições para ter mais energia ao longo do dia | Seus relatos mostram fome, energia e horários pedindo mais organização. | 1. Corpo — Dar ritmo às refeições: ter horários mais previsíveis. 2. Mente — Perceber a fome antes que ela fique forte demais. | energia ao longo do dia · fome entre as refeições · horários que funcionaram | Revisar os horários que funcionaram e ajustar os que não couberam na rotina. |
| ME-F2 | Entender a sua fome e a sua saciedade | Reconhecer os sinais de fome e de satisfação ajuda a escolher com mais tranquilidade. | 1. Mente — Diferenciar fome do corpo de outras vontades. 2. Corpo — Comer com atenção para perceber a saciedade. | notas de fome e saciedade · momentos de comer sem fome · como termina as refeições | Olhar juntos os registros de fome e saciedade e escolher o próximo ajuste. |
| ME-F3 | Construir uma rotina alimentar que caiba no seu dia real | Mudanças que cabem na rotina são as que se sustentam. | 1. Corpo — Encontrar espaço na rotina para as refeições. 2. Espírito — Ligar o cuidado com a alimentação ao que importa para você. | onde a rotina quebra · o que facilitou · o que você conseguiu manter | Revisar o que coube na rotina e o que precisa de outra solução. |

**Estratégias**

| ID | T | Estratégia (o que fazer) | Quando / frequência | O que observar | Ferr. |
|---|---|---|---|---|---|
| ME-C1 | C | **Horários âncora** — combinar 2 ou 3 horários de refeição e tentar mantê-los | todos os dias | energia e fome entre as refeições | ROT, OQ3 |
| ME-C2 | C | **Fome de 0 a 10** — antes de comer, dar uma nota para a fome; ao terminar, para a saciedade | em pelo menos 1 refeição por dia | se começa a comer com fome muito alta | GAT |
| ME-C3 | C | **Energia depois de comer** — anotar como está a energia 1 a 2 horas depois das refeições principais | 3 dias na semana | em quais refeições a energia cai ou se mantém | ROT |
| ME-C4 | C | **Preparar o horário difícil** — deixar planejado o que fazer no horário em que a fome mais aperta | dias úteis | se chega com menos fome à refeição seguinte | ROT, GAT |
| ME-M1 | M | **Fome ou vontade?** — quando surgir vontade de comer fora de hora, perguntar "é fome do corpo ou outra coisa?" e anotar | sempre que acontecer | o que estava sentindo ou fazendo antes | GAT |
| ME-M2 | M | **Comer sem fome: o que veio antes** — registrar situação, pensamento e emoção quando comer sem fome | sempre que acontecer | situações que se repetem | GAT |
| ME-M3 | M | **Sem compensação** — notar se, depois de comer mais, aparece a vontade de pular a refeição seguinte, e conversar sobre isso no retorno | durante a semana | quando isso aparece e como se sente | CRE |
| ME-M4 | M | **Resposta combinada** — escolher, com a nutricionista, uma resposta alternativa para o gatilho mais frequente | sempre que o gatilho aparecer | se conseguiu usar a resposta e o que mudou | GAT |
| ME-E1 | E | **Energia para o que importa** — escolher uma atividade para a qual você quer ter mais energia e observar como a alimentação ajuda | durante a semana | energia nos dias dessa atividade | PQQ, RODA |
| ME-E2 | E | **Intenção do dia** — ao acordar, escolher uma intenção simples para o dia (ex.: "comer com calma no almoço") | todas as manhãs | quantos dias a intenção foi lembrada | PRO |
| ME-E3 | E | **Refeição com presença** — fazer uma refeição na semana com alguém importante, com tempo e atenção | 1 vez na semana | como se sentiu nessa refeição | CON |
| ME-E4 | E | **Ritmo que respeita você** — identificar um compromisso que atropela as refeições e pensar numa forma de proteger esse horário | durante a semana | se conseguiu proteger o horário | ROT, RODA |

---

### 9.2 Sistema FÚNGICO
*(relatos digestivos e alimentares, mucosas e couro cabeludo; não diagnostica fungos)*

**Focos**

| ID | Foco | Por que | Direcionamentos | Observe | Próxima etapa |
|---|---|---|---|---|---|
| FU-F1 | Perceber como a alimentação conversa com o seu conforto digestivo | Entender em que refeições e situações o desconforto aparece ajuda a escolher melhor. | 1. Corpo — Observar o conforto digestivo depois das refeições. 2. Mente — Notar como a pressa e as emoções aparecem nas refeições. | refeições com mais e menos desconforto · ritmo das refeições · dias mais tranquilos | Olhar os registros e escolher um ajuste para as refeições mais desconfortáveis. |
| FU-F2 | Dar mais regularidade e atenção à rotina alimentar | Uma rotina mais regular ajuda a perceber melhor os sinais que você relatou. | 1. Corpo — Organizar o ritmo das refeições. 2. Espírito — Transformar a refeição num momento de cuidado. | horários das refeições · refeições feitas com calma · como se sentiu | Revisar o que ficou mais regular e o que ainda falta. |
| FU-F3 | Observar a relação entre doces, beliscos e os sinais que você relatou | Perceber quando e por que os doces e beliscos aparecem abre espaço para escolhas novas. | 1. Mente — Entender o que vem antes da vontade de doce. 2. Corpo — Testar uma pausa antes do belisco. | momentos de vontade de doce · o que estava acontecendo · como se sentiu depois | Conversar sobre o que apareceu nos registros e escolher a próxima troca. |

**Estratégias**

| ID | T | Estratégia (o que fazer) | Quando / frequência | O que observar | Ferr. |
|---|---|---|---|---|---|
| FU-C1 | C | **Diário do conforto digestivo** — anotar como se sentiu depois das refeições principais (estufamento, desconforto ou bem-estar) | almoço e jantar | em quais refeições o desconforto aparece | ROT |
| FU-C2 | C | **Mastigar com calma** — em uma refeição do dia, comer sentada e mastigar com calma, sem pressa | 1 refeição por dia | diferença no conforto depois dessa refeição | ROT |
| FU-C3 | C | **Mapa dos doces e beliscos** — anotar quando come doce ou belisca e o que estava acontecendo | sempre que acontecer | horários e situações que se repetem | GAT, ROT |
| FU-C4 | C | **Pausa antes do belisco** — quando vier a vontade de beliscar fora de hora, esperar alguns minutos (beber água, respirar) e depois decidir | sempre que acontecer | se a vontade muda depois da pausa | GAT |
| FU-M1 | M | **Emoção e digestão** — nos dias de mais desconforto, anotar também como estava o seu dia emocionalmente | nos dias de desconforto | se há relação entre dias tensos e desconforto | GAT |
| FU-M2 | M | **O que a vontade de doce está pedindo** — perguntar-se se é cansaço, recompensa, tédio ou fome | sempre que aparecer | qual necessidade aparece mais | GAT |
| FU-M3 | M | **Comida sem culpa** — escolher uma ideia sobre comida que traz culpa e conversar sobre ela no retorno | durante a semana | quando essa ideia aparece | CRE |
| FU-M4 | M | **Plano para o momento difícil** — combinar o que fazer no horário em que a vontade de doce mais aparece | no horário combinado | se conseguiu seguir o plano | GAT, ROT |
| FU-E1 | E | **Refeição como cuidado** — preparar ou montar uma refeição na semana com atenção e carinho por você | 1 vez na semana | como se sentiu ao cuidar de si | PRO |
| FU-E2 | E | **Um momento antes de comer** — fazer uma pausa de três respirações antes da refeição principal | 1 vez por dia | se a refeição fica mais tranquila | — |
| FU-E3 | E | **Cuidar do ambiente da refeição** — deixar o lugar da refeição mais agradável (mesa, sem telas) | quando possível | se isso muda a forma de comer | RODA |
| FU-E4 | E | **Gentileza com o processo** — anotar uma pequena conquista do cuidado com a alimentação na semana | 1 vez na semana | o que já está mudando | CARTA |

---

### 9.3 Sistema ÁCIDO INFLAMATÓRIO
*(dor, rigidez, desconforto, mucosas, reatividade percebida; não mede inflamação nem pH)*

**Focos**

| ID | Foco | Por que | Direcionamentos | Observe | Próxima etapa |
|---|---|---|---|---|---|
| AI-F1 | Entender quando e em que situações os desconfortos aparecem | Conhecer o padrão dos desconfortos ajuda a escolher o que ajustar primeiro. | 1. Corpo — Registrar os desconfortos e o momento em que aparecem. 2. Mente — Perceber a relação entre tensão do dia e desconforto. | intensidade do desconforto · horários e dias · o que veio antes | Olhar juntos o padrão dos desconfortos e escolher um ajuste. |
| AI-F2 | Cuidar da recuperação: sono, movimento e pausas | Descanso e movimento possível fazem parte do cuidado com o desconforto. | 1. Corpo — Dar mais regularidade ao sono e ao movimento possível. 2. Espírito — Reservar tempo de descanso como cuidado. | qualidade do sono · rigidez ao acordar · como o corpo responde ao movimento | Revisar o que ajudou na recuperação e manter o que funcionou. |
| AI-F3 | Perceber como a alimentação e a rotina se relacionam com o seu desconforto | Observar a rotina real mostra o que pode estar pesando. | 1. Corpo — Comparar dias de mais e de menos desconforto. 2. Mente — Notar a sobrecarga na rotina. | alimentação nos dias de mais e menos desconforto · sobrecarga · sono | Conversar sobre o que os registros mostraram. |

**Estratégias**

| ID | T | Estratégia (o que fazer) | Quando / frequência | O que observar | Ferr. |
|---|---|---|---|---|---|
| AI-C1 | C | **Diário do desconforto** — dar uma nota de 0 a 10 para o desconforto e anotar o momento do dia | 1 vez por dia | padrões de horário e de dia | ROT |
| AI-C2 | C | **Movimento possível** — escolher um movimento leve que já faz parte da sua vida (caminhar, alongar), dentro do que é seguro para você | frequência combinada no atendimento | como o corpo responde nas horas seguintes | MOM, OQ3 |
| AI-C3 | C | **Dias bons e dias difíceis** — anotar o que comeu e como foi o dia em 2 dias de mais e 2 dias de menos desconforto | 4 dias na semana | diferenças entre esses dias | ROT |
| AI-C4 | C | **Hora regular para deitar** — escolher um horário para deitar e tentar mantê-lo | todas as noites | rigidez e disposição ao acordar | ROT |
| AI-M1 | M | **Tensão e desconforto** — anotar o nível de tensão do dia (0 a 10) ao lado da nota do desconforto | 1 vez por dia | se andam juntos | GAT |
| AI-M2 | M | **Pausas de soltar o corpo** — fazer 3 pausas curtas para respirar e soltar ombros e mandíbula | 3 vezes por dia | se o desconforto muda depois das pausas | — |
| AI-M3 | M | **Pensamentos no desconforto** — notar o pensamento que aparece quando o desconforto vem e anotar | quando acontecer | pensamentos que se repetem | CRE, GAT |
| AI-M4 | M | **Proteger-se da sobrecarga** — identificar uma situação que sobrecarrega e uma forma possível de se proteger | durante a semana | se conseguiu usar essa proteção | ROT |
| AI-E1 | E | **Prazer que cabe no corpo de hoje** — escolher uma atividade prazerosa que respeite o seu ritmo atual | 1 vez na semana | como se sentiu depois | RODA |
| AI-E2 | E | **Descanso sem culpa** — reservar um momento da semana sem obrigações | 1 vez na semana | se conseguiu descansar de verdade | MOM |
| AI-E3 | E | **Gratidão ao corpo** — anotar uma coisa que o seu corpo permitiu fazer no dia | 3 vezes na semana | como muda a relação com o corpo | CARTA |
| AI-E4 | E | **Ritmo com sentido** — ligar o cuidado com o corpo a algo que você quer continuar fazendo | durante a semana | se isso ajuda a manter o cuidado | PQQ, PRO |

---

### 9.4 Sistema DETOX E LINFÁTICO
*(retenção percebida, hábito intestinal, sensibilidade relatada; "detox" é nome do método e não mede nada do fígado ou da linfa)*

**Focos**

| ID | Foco | Por que | Direcionamentos | Observe | Próxima etapa |
|---|---|---|---|---|---|
| DL-F1 | Observar o funcionamento do seu intestino no dia a dia | Acompanhar o seu ritmo intestinal ajuda a perceber o que favorece o seu bem-estar. | 1. Corpo — Registrar o funcionamento intestinal. 2. Mente — Perceber como a pressa e a rotina interferem. | frequência e conforto · o que mudou na rotina · dias mais tranquilos | Olhar os registros e escolher um ajuste na rotina. |
| DL-F2 | Hidratação e movimento ao longo do dia | Água e movimento distribuídos no dia fazem parte do cuidado com o inchaço percebido. | 1. Corpo — Distribuir a hidratação ao longo do dia. 2. Corpo — Quebrar os longos períodos parado. | sede · inchaço percebido · pausas de movimento | Revisar o que coube no dia e o que precisa de lembrete. |
| DL-F3 | Perceber o que piora ou melhora o inchaço que você sente | Entender os momentos de inchaço ajuda a escolher o que ajustar. | 1. Corpo — Registrar quando o inchaço aparece. 2. Espírito — Criar espaço para o seu ritmo. | horários do inchaço · o que veio antes · sono e tempo sentado | Conversar sobre o que os registros mostraram. |

**Estratégias**

| ID | T | Estratégia (o que fazer) | Quando / frequência | O que observar | Ferr. |
|---|---|---|---|---|---|
| DL-C1 | C | **Registro do intestino** — anotar como foi o funcionamento intestinal (frequência e conforto) | todos os dias | o que muda nos dias diferentes | ROT |
| DL-C2 | C | **Água em momentos fixos** — ligar a água a momentos do dia (ao acordar, nas pausas, nas refeições) | todos os dias | se a sede e o inchaço mudam | ROT |
| DL-C3 | C | **Pausas de movimento** — levantar e se movimentar alguns minutos nos períodos longos sentada | várias vezes ao dia | inchaço no fim do dia | ROT, MOM |
| DL-C4 | C | **Diário do inchaço** — anotar em que momento o inchaço aparece e o que veio antes | quando acontecer | relação com alimentação, tempo sentada e sono | ROT |
| DL-M1 | M | **Sem adiar** — notar se a rotina corrida faz adiar a ida ao banheiro | durante a semana | quando isso acontece | ROT |
| DL-M2 | M | **Tensão e intestino** — anotar os dias de mais tensão ao lado do registro do intestino | todos os dias | se andam juntos | GAT |
| DL-M3 | M | **Ideias sobre "limpar o corpo"** — observar ideias que levam a restrições ou a "compensar" e conversar sobre elas | durante a semana | quando essas ideias aparecem | CRE |
| DL-M4 | M | **Plano para os dias corridos** — combinar o que manter, no mínimo, nos dias mais corridos | nos dias corridos | se conseguiu manter o mínimo | GAT, ROT |
| DL-E1 | E | **Manhã sem pressa** — criar alguns minutos tranquilos no começo do dia | todas as manhãs | como começa o dia | ROT |
| DL-E2 | E | **Tempo ao ar livre** — um momento ao ar livre, com calma | 1 a 2 vezes na semana | disposição e humor | RODA |
| DL-E3 | E | **Um "não" que protege** — identificar um compromisso que pode ser recusado para cuidar do seu ritmo | durante a semana | como se sentiu | RODA, CON |
| DL-E4 | E | **Ajuda na rotina** — combinar com alguém da casa uma ajuda concreta (ex.: dividir uma tarefa) | durante a semana | se sobrou mais espaço para o cuidado | CON |

---

### 9.5 Sistema MENTAL EMOCIONAL ESPIRITUAL
*(sono, alerta, foco, emoções, relação consigo e sentido; não diagnostica transtornos e não mede saúde espiritual)*

**Focos**

| ID | Foco | Por que | Direcionamentos | Observe | Próxima etapa |
|---|---|---|---|---|---|
| MEE-F1 | Cuidar do sono e do descanso | O descanso faz parte do cuidado com a alimentação e com a energia. | 1. Corpo — Criar um ritual para desacelerar à noite. 2. Mente — Esvaziar a mente antes de dormir. | horário de deitar e acordar · como acorda · telas à noite | Revisar o que ajudou o descanso e manter. |
| MEE-F2 | Perceber como as emoções aparecem na alimentação | Reconhecer a emoção antes de comer abre espaço para outras respostas. | 1. Mente — Nomear a emoção antes de comer fora do combinado. 2. Mente — Testar uma pausa antes de decidir. | emoções mais frequentes · situações · respostas que funcionaram | Conversar sobre o que apareceu e escolher a próxima resposta. |
| MEE-F3 | Fortalecer o sentido e a direção do seu cuidado | Quando o cuidado se conecta ao que importa, ele fica mais leve de manter. | 1. Espírito — Lembrar o seu "pra quê". 2. Espírito — Fortalecer o apoio e o pertencimento. | momentos em que o propósito ajudou · apoio que recebeu · como se sentiu | Revisar o que trouxe mais sentido e dar o próximo passo. |

**Estratégias**

| ID | T | Estratégia (o que fazer) | Quando / frequência | O que observar | Ferr. |
|---|---|---|---|---|---|
| MEE-C1 | C | **Ritual de desacelerar** — nos 30 minutos antes de dormir, sem telas, repetindo a mesma sequência (ex.: banho, luz baixa, leitura) | todas as noites | tempo para pegar no sono e como acorda | ROT |
| MEE-C2 | C | **Hora de acordar regular** — manter um horário parecido para acordar, inclusive no fim de semana | todos os dias | disposição pela manhã | ROT |
| MEE-C3 | C | **Última refeição e sono** — observar o intervalo entre a última refeição e a hora de dormir | todas as noites | como dorme em cada situação | ROT |
| MEE-C4 | C | **Luz da manhã** — alguns minutos de luz natural ou de caminhada pela manhã | quando possível | disposição e humor no dia | ROT, MOM |
| MEE-M1 | M | **Nomear a emoção** — antes de comer fora do combinado, dar nome ao que está sentindo | sempre que acontecer | emoções que se repetem | GAT |
| MEE-M2 | M | **Três respirações** — fazer três respirações lentas antes de decidir o que comer quando estiver tensa | sempre que acontecer | se a decisão muda depois da pausa | GAT |
| MEE-M3 | M | **Trocar a frase dura** — anotar uma frase dura que diz a si mesma e reescrever de forma mais gentil | 1 vez na semana | como se sente com a nova frase | CRE |
| MEE-M4 | M | **Esvaziar a mente** — escrever num papel o que está na cabeça antes de dormir | nas noites agitadas | se o sono melhora | — |
| MEE-E1 | E | **Um passo alinhado ao propósito** — escolher uma ação da semana ligada ao que dá sentido à sua vida | 1 vez na semana | como se sentiu | PRO, PQQ |
| MEE-E2 | E | **Contato que nutre** — um contato significativo com alguém de apoio | 1 vez na semana | como se sentiu depois | CON |
| MEE-E3 | E | **Prática de sentido** — se fizer parte da sua vida, reservar um tempo para a sua prática (oração, meditação, contemplação) | combinado com você | como fica o seu dia | CON |
| MEE-E4 | E | **Olhar para o caminho** — no fim da semana, anotar o que te aproximou de quem você quer ser | 1 vez na semana | o que já está mudando | CARTA |

---

### 9.6 ESTRATÉGIAS GERAIS (servem para qualquer paciente)

| ID | T | Estratégia (o que fazer) | Quando / frequência | O que observar | Ferr. |
|---|---|---|---|---|---|
| G01 | C | **Registro de 3 dias** — anotar o que comeu, o horário e como se sentiu | 3 dias (2 úteis + 1 de fim de semana) | horários, fome e energia | ROT |
| G02 | C | **Uma refeição com atenção** — uma refeição por dia sentada, sem telas | todos os dias | sabor, saciedade e calma | — |
| G03 | C | **Planejar a semana** — reservar um tempo curto para pensar nas refeições da semana | 1 vez na semana | se os dias ficaram mais fáceis | ROT, OQ3 |
| G04 | C | **Sono regular** — horários parecidos para deitar e acordar | todos os dias | disposição | ROT |
| G05 | C | **Movimento de que você gosta** — escolher um movimento prazeroso, dentro do que é seguro para você | frequência combinada | disposição e humor | MOM |
| G06 | C | **Água à vista** — deixar água por perto e beber ao longo do dia | todos os dias | sede e disposição | — |
| G07 | M | **O momento mais difícil do dia** — identificar o horário mais difícil e o que acontece antes dele | durante a semana | o que se repete | ROT, GAT |
| G08 | M | **Pausa antes de decidir** — antes de comer fora do combinado, esperar alguns minutos | sempre que acontecer | se a vontade muda | GAT |
| G09 | M | **Sem tudo ou nada** — quando algo sair do plano, seguir na próxima refeição como combinado, sem "chutar o balde" | sempre que acontecer | como lidou com o deslize | CRE |
| G10 | M | **Um avanço por semana** — anotar uma coisa que deu certo | 1 vez na semana | o que está mudando | — |
| G11 | E | **Lembrar o seu "pra quê"** — reler a síntese da Escada dos Porquês ou o motivo principal | 2 vezes na semana | se ajuda nos momentos difíceis | PQQ, PRO |
| G12 | E | **Uma área da vida com cuidado** — escolher uma área da Roda e um pequeno gesto semanal para ela | 1 vez na semana | como se sentiu | RODA |
| G13 | E | **Pessoa de apoio** — combinar com alguém de confiança como essa pessoa pode te apoiar nesta fase | durante a semana | se se sentiu apoiada | CON |
| G14 | E | **Pausa de gratidão** — um momento de pausa e gratidão antes de uma refeição | 1 vez por dia | como fica a refeição | — |
| G15 | E | **Frase da Carta** — escolher uma frase da Carta ao Futuro Eu para lembrar durante a semana | todos os dias | se a frase ajudou | CARTA |

**Total do rascunho:** 15 focos · 60 estratégias por sistema · 15 gerais · 30 direcionamentos (2 por foco).

---

## 10. Exemplo: como fica um caso (fictício)

**Situação do paciente:**
- **HOLOSCAN:** Metabólico e Mental Emocional Espiritual como prioritários.
- **Ferramentas:** Gatilhos & Respostas e Mapa da Rotina.
- **Mapeamento:** "cansaço no fim da tarde e fome forte à noite".

**O que a nutricionista faz:**
1. **Passo 1:** confere e marca o momento ("Cansaço no fim da tarde e fome forte à noite") e o desejo ("Ter mais disposição à tarde").
2. **Passo 2:** escolhe **ME-F1 — Organizar os horários das refeições para ter mais energia ao longo do dia**.
3. **Passo 3:** marca 4 estratégias. O sistema mostrou primeiro as que combinam com GAT e ROT:
   - ME-C1 Horários âncora;
   - ME-C4 Preparar o horário difícil;
   - ME-M1 Fome ou vontade?;
   - MEE-C1 Ritual de desacelerar.
4. **Passo 4:** confere a prévia e clica em **Gerar Resultado**.

**O que sai no PDF:**
1. Seu momento agora.
2. Foco desta fase (ME-F1).
3. O que vamos trabalhar agora (os 2 direcionamentos).
4. Seu plano até a próxima consulta: as 4 estratégias, com o que fazer, quando e o que observar.
5. Corpo · Mente · Espírito.
6. Até o próximo encontro, observe.
7. Próxima etapa.
8. Seu mapa HOLOS.
9. Ferramentas utilizadas.

**Tempo estimado:** 5 minutos.

---

## 11. O que foi implementado (14/10)

| Peça | Arquivo |
|---|---|
| Conteúdo PB-V1 (15 focos, 60 estratégias por sistema, 15 gerais) + escolha e ordem das opções | `playbook-holos.js` (novo) |
| Assistente de 4 passos (primeira consulta e retorno) | `resultado-playbook.js` (novo) |
| Preparar, pré-visualizar e gravar pelo mesmo caminho do Resultado | `resultado-holos.js` (`prepararPlaybook`, `previaPlaybook`, `gerarPorPlaybook`) |
| Botão "Montar com o Playbook" na aba Resultado HOLOS | `resultado-holos.js` |
| Atalho "Sem IA? Monte o Resultado com o Playbook" na aba Holos IA | `holos-ai-ponte.js` |
| Visual (cartões de foco, 3 colunas, modo claro e escuro, celular) | `style.css` |
| Testes | `testes/testar-playbook-holos.mjs` (30 asserções), `testes/testar-playbook-resultado.mjs` (ponta a ponta, 36 asserções) |
| Capturas (fictícias) | `docs/v1/capturas/playbook-1410/` |

**Decisões aplicadas (podem ser trocadas):**
- D2: o Momentum orienta a quantidade, sem travar.
- D3: escolher no assistente = confirmar e compartilhar.
- D4: o playbook fica no código (PB-V1).
- D6: as estratégias gerais ficam recolhidas.
- D5 (playbook na IA) fica para a fase 2.

**Banco:** nenhuma migration. **Deploy:** só do site.

## 12. Integração com as ferramentas e auditoria (14/10, depois da aprovação)

**O que as ferramentas trazem para o Resultado:**
- No passo 1 aparece o bloco **"O que apareceu nas ferramentas"**, com as palavras do paciente registradas nas ferramentas:
  - OQ³: o que quer e o que consegue fazer agora;
  - Mapa da Rotina: espaços da rotina para mudança;
  - Gatilhos & Respostas: o episódio e a resposta alternativa;
  - Escada dos Porquês: o objetivo e o que é verdadeiro;
  - Mapa de Crenças e Roda da Vida.
- O que ela deixa marcado entra no Resultado, em **"O que você quer construir"** e em **Corpo · Mente · Espírito**, antes dos títulos das estratégias.
- As ferramentas também ordenam as estratégias (selo "Combina com…").
- O documento lista as **"Ferramentas utilizadas"** do atendimento.

**Auditoria** (`testes/testar-playbook-auditoria.mjs`), com dados fictícios:

| Item verificado | Resultado |
|---|---|
| Áreas do assistente = "Áreas que merecem mais atenção" do Resultado (mesmo cálculo do HOLOSCAN) | ok |
| Foco e estratégias do mesmo sistema prioritário | ok |
| Respostas das ferramentas no passo 1 e no Resultado | ok |
| Botões: outros sistemas, escrever outro foco, ajustar o foco, estratégias gerais, desmarcar relato, Voltar, Gerar | ok |
| Página Resultado usa o Resultado do Playbook como vigente e mostra o foco | ok |
| Emitir + PDF real | ok (4 páginas) |
| Sem HOLOSCAN: mensagem clara, nada gravado | ok |
| Paciente arquivado: botão desabilitado | ok |
| Celular 390 px sem rolagem lateral | ok |

Exemplo de PDF gerado pelo Playbook: `docs/v1/capturas/playbook-1410/pdf-playbook-primeira-consulta.pdf`.
