# Redesenho do Resultado HOLOS — da leitura do HOLOSCAN para uma direção de acompanhamento

**Fase:** auditar, desenhar e prototipar (13/10/2026). **Nada foi implementado.** Este documento e o protótipo (`docs/v1/redesenho-resultado/prototipo.html`) são para revisão antes de qualquer código.

**Referência conceitual:** a lógica de organização das análises de Rodrigo: dores, desejos e avanços, e a cadeia *situação atual → padrão percebido → crença, medo ou contexto → camada mais profunda a investigar*. O PDF de referência citado no pedido não estava disponível nesta sessão (não está no repositório nem no ambiente). Usei só a lógica descrita no pedido, sem nenhuma interpretação de caso real. Todo exemplo aqui é **fictício**.

---

## 1. Auditoria: o que já existe

### 1.1 O Resultado HOLOS hoje

| Peça | Onde está | O que guarda |
|---|---|---|
| `holos_results` | tabela, versionada (rascunho → salvo → revisado; correção = nova versão) | atendimento, aplicação HOLOSCAN, ferramentas escolhidas e visibilidade por ferramenta, **3 textos livres** (`leitura_profissional`, `pontos_acompanhar`, `questoes_aprofundar`), `content_snapshot` congelado (template 4), hash |
| `content_snapshot.holoscan` | montado no servidor | notas, faixas, cobertura, Índice, Tríade, por sistema: `pontuou`, `contexto` e `dominantes` (até 3) |
| `content_snapshot.ferramentas` | montado no servidor | respostas e fechamento de cada ferramenta escolhida |
| `content_snapshot.proximos_passos` | PP-V1 congelado | principal + complementares, pendentes no atendimento |
| `holos_result_emissions` | Resultado Final, imutável | congela o Resultado (visão da paciente) + a **Conduta do mesmo atendimento** + identidade do Perfil → PDF |

**Visão da paciente hoje** ("Seu Mapa HOLOS"): O que entendemos nesta etapa · Áreas para aprofundar (cartões por sistema, com nota) · O que descobrimos com as ferramentas · Nosso foco agora (= `leitura_profissional`) · O que ficou combinado (Conduta) · O que observar até o próximo encontro (= `pontos_acompanhar`) · Detalhes do mapa.

**Diagnóstico do problema:** a estrutura atual é organizada **pelo instrumento** (sistemas, notas, ferramentas). A paciente sai sabendo "o Metabólico deu 4,3", mas a direção do acompanhamento fica diluída em dois textos livres e na Conduta. Não há lugar para **desejos**, **avanços**, **padrões** nem para um **foco atual** explícito, e nada separa Corpo, Mente e Espírito como caminhos de trabalho.

### 1.2 Dados que já existem e podem alimentar a nova arquitetura

| Fonte | Campo existente | Serve para |
|---|---|---|
| **Mapeamento (paciente) / Mapeamento profissional — primeira consulta** | `motivos`, `objetivo`, `expectativa`, `mudar_primeiro` | **Desejos** |
| | `dificuldades` (até 3), `dificuldade` (maior), `sinais`, `sinal_principal`, `maior_fome`, `ja_tentou`, `nao_funcionou` | **Dores** |
| | `ajudou` | **Avanços prévios** (o que já funcionou antes) |
| | cada campo tem **origem** (`relato_paciente`, `observacao_profissional`, `documento_externo`, `dado_medido`) | separar as fontes |
| **Mapeamento de retorno** ("Desde a última consulta") | `melhorou`, `melhorou_opcoes`, `praticou`, `praticou_nivel`, `facilitou`, `facilitou_opcoes` | **Avanços** |
| | `piorou`, `piorou_opcoes`, `nao_praticou`, `dificultou`, `dificultou_opcoes`, `dificuldade`, `nova_questao` | **Dores / dificuldades que permaneceram** |
| **HOLOSCAN** (snapshot) | áreas para aprofundar, `dominantes` (sinais que mais pontuaram), `contexto` | **Dores** (sinais relatados), **onde olhar**, Detalhes do mapa |
| **OQ³** | `quer`, `precisa`, `consegue`, `alavancas` | **Desejos** (quer), **Corpo** (consegue = o que cabe agora) |
| **Linha do Momentum** | estado (escolhido pela nutricionista), `o que NÃO é hora de pedir`, sustenta/limita | **Corpo** (calibrar a ação) |
| **Mapa da Rotina** | momentos mais difíceis e disponíveis, espaços para mudança, eventos | **Corpo**, **Dores**, **Padrões** |
| **PQQ** | objetivo declarado, "pra que" verdadeiro | **Desejos**, **Espírito** (sentido) |
| **Mapa de Crenças** | crença que mais atrapalha, crença alternativa | **Mente** |
| **Gatilhos & Respostas** | gatilho → pensamento → emoção → resposta → consequência; alternativa | **Mente**, **Padrões** |
| **Roda / Carta / Conexão / Mapa do Propósito** | área que puxa para baixo, direção, apoio | **Espírito** |
| **Leitura profissional por ferramenta** | "o que chamou atenção", "prioridade", "próximo passo" | **Padrões**, **Foco**, **Próxima etapa** |
| **Conduta** | `priorities`, `objective`, `nutrition_strategy`, `actions`, `monitoring`, `return_plan`, `professional_guidance` | **Foco atual** (objective), **O que combinamos**, **Observe** (monitoring), **Próxima etapa** (return_plan) |
| **Acordos** | descrição, prazo, estado (Proposto → Acordado → Em acompanhamento → **Concluído** / Revisto / Encerrado) | **O que combinamos**; **Avanços** (acordo concluído = conquista registrada) |
| **Resultado HOLOS** | `leitura_profissional`, `pontos_acompanhar`, `questoes_aprofundar` | Momento, Observe, Hipóteses (só profissional) |
| **Resultados anteriores** (versões imutáveis) | todos os acima, por atendimento | **Evolução longitudinal** sem reescrever o passado |

### 1.3 O que falta

| Falta | Por quê não dá para derivar |
|---|---|
| **Foco atual do acompanhamento** confirmado | hoje mora implícito em `conducts.objective` ou na leitura livre; precisa ser um campo próprio, salvo pela nutricionista |
| **Desejos** como lista curada | os dados de origem existem, mas alguém precisa escolher e redigir o que vai para a paciente |
| **Avanços** registrados com origem (paciente × profissional) | o retorno traz o relato, mas a seleção do que é avanço é da nutricionista; e precisa acumular por atendimento |
| **Padrões observados** e **hipóteses** separados | não existe nenhum campo; hoje caberia num texto livre, misturando observação e hipótese |
| **Corpo / Mente / Espírito** como caminhos | não existe; a Conduta é única e não separa territórios |
| **Momento** (síntese curta) | pode reusar `leitura_profissional`, mas a função muda (síntese de abertura, não "foco") |

---

## 2. Princípio do método

| Peça | Função |
|---|---|
| **HOLOSCAN** | mostra **onde olhar** |
| **Ferramentas** | ajudam a **aprofundar** |
| **Leitura profissional** | organiza o **significado** |
| **Conduta** | define **o que fazer** |
| **Resultado HOLOS** | devolve **direção** para a paciente |
| **Evolução** | mostra **o que mudou** |

O Resultado deixa de ser "relatório do instrumento" e passa a ser **a carta de direção da etapa**. O instrumento vai para o fim (transparência).

---

## 3. Arquitetura final do Resultado (visão da paciente)

| # | Bloco | Pergunta que responde | Fonte principal | Quem confirma |
|---|---|---|---|---|
| A | **Seu momento agora** | Onde esta pessoa está? | síntese da nutricionista (sugestão factual pré-preenchida) | nutricionista |
| B | **O que está pesando agora** (Dores) | O que está pedindo atenção? | Mapeamento, HOLOSCAN (sinais), ferramentas, atendimento | nutricionista escolhe os itens |
| C | **O que você quer construir** (Desejos) | O que ela quer construir? | objetivo, OQ³ "quer", PQQ, fala registrada | nutricionista escolhe/redige |
| D | **O que já está mudando** (Avanços) | O que já funciona? | retorno, acordos concluídos, observação | nutricionista, com origem marcada |
| E | **O que estamos compreendendo** (Padrões) | O que estamos entendendo? | padrões observados registrados | nutricionista |
| F | **Foco atual** | Qual é o foco? | campo próprio (sugestão: `conducts.objective`) | nutricionista (obrigatório para emitir) |
| G | **Caminho Corpo · Mente · Espírito** | O que fazer em cada território? | ferramentas + Conduta | nutricionista; vazio = "ainda não aprofundado nesta etapa" |
| H | **O que combinamos** | O que foi combinado? | Conduta + acordos compartilháveis | já existe |
| I | **Até o próximo encontro, observe** | O que observar? | `conducts.monitoring` / `pontos_acompanhar` (3 a 5 itens) | nutricionista |
| J | **Próxima etapa** | O que revisaremos depois? | `conducts.return_plan` + "o que revisaremos" | nutricionista |
| K | **Detalhes do mapa** | Transparência | snapshot HOLOSCAN (radar, Índice, Tríade, sistemas) | automático |

**Regra de ouro:** cada item mostra de onde veio (rótulo discreto: *você contou*, *registrado pela sua nutricionista*, *do HOLOSCAN*, *da ferramenta X*). Nada mistura fontes em silêncio.

### Linguagem por tipo de afirmação

| Tipo | Como aparece | Exemplo |
|---|---|---|
| Relato | "Você contou que…" / "você relatou…" | "Você relatou sono logo depois do almoço." |
| Padrão observado | descrição de quando/como aparece, sem causa | "Nos dias com tarde longa sem pausa, você relata chegar à noite com mais fome." |
| Hipótese | **só na visão profissional** | "Investigar se a organização da tarde contribui para a fome noturna." |
| Interpretação profissional | atribuída à nutricionista | "Sua nutricionista propõe começar pela organização da tarde." |
| Linguagem autoral/simbólica | marcada como linguagem do método | "Na linguagem do método, este é um momento de Reorganizar." |

Frases proibidas continuam bloqueadas (lista do MR-V1 + "isso causou", "seu corpo está mostrando que", "sua doença vem de", "bloqueio energético", "você tem resistência à insulina", "você tem candidíase", "toxinas acumuladas"). A verificação automática já existente (`PROIBIDOS`) passa a rodar também sobre os textos livres antes de emitir, como **aviso**, não bloqueio.

---

## 4. Modelo Dores / Desejos / Avanços

Cada item é um objeto pequeno:

```
{ texto, origem: "relato_paciente" | "observacao_profissional" | "holoscan" | "ferramenta" | "conduta",
  ref: { tipo, id, campo }   // de onde foi sugerido (opcional)
  mostrar_paciente: true }
```

- **Dores** ("O que está pesando agora"): 2 a 5 itens. Sugestões automáticas vêm de `sinal_principal`, `dificuldades`, `maior_fome`, dos sinais dominantes das 2 primeiras áreas (reescritos como relato: "Você relatou…") e, no retorno, de `piorou`/`dificultou`/`nao_praticou`. A nutricionista marca as que entram e pode reescrever.
- **Desejos** ("O que você quer construir"): 1 a 3 itens. Sugestões: `objetivo`, `mudar_primeiro`, OQ³ "quer", PQQ "pra que verdadeiro". **Nunca inventados**: sem dado de origem, o bloco não mostra sugestão.
- **Avanços** ("O que já está mudando"): no primeiro atendimento, texto fixo *"Ainda não há evolução registrada — este é o ponto de partida."* (opcional: "o que já funcionou antes", de `ajudou`). Nos retornos: sugestões de `melhorou`, `praticou`, `facilitou` e de **acordos que mudaram para Concluído**; cada avanço marca a origem (você contou × sua nutricionista observou).

## 5. Modelo Corpo / Mente / Espírito

| Território | Pergunta | Campos (paciente) | Fontes de sugestão |
|---|---|---|---|
| **Corpo** | O que precisa acontecer na vida real? | **Foco** · **Ação / experiência combinada** · **O que observar** | OQ³ (consegue), Linha do Momentum (estado, o que não pedir), Mapa da Rotina (momentos difíceis, espaços para mudança), Conduta (ações) |
| **Mente** | O que me faz repetir? | **Padrão a aprofundar** · **O que percebemos** · **Nova resposta / experiência** (só se definida) | Gatilhos & Respostas (sequência, alternativa), Mapa de Crenças (crença que mais atrapalha, alternativa), PQQ |
| **Espírito** | Para onde quero levar minha vida? | **Direção** · **O que importa agora** · **Pequeno movimento de alinhamento** (só se combinado) | Mapa do Propósito, Roda (área que puxa para baixo), Carta (só "foi realizada"), Conexão (apoio) |

- Território sem material: **"Ainda não aprofundado nesta etapa."** Nunca preencher à força.
- **Ação** em qualquer território só aparece se estiver na Conduta/acordos ou se a nutricionista escrever. O sistema não cria ação.

## 6. Modelo de padrões observados e hipóteses

Registro profissional, por atendimento:

```
padroes: [{ tipo: "padrao_observado" | "hipotese", texto, origem, desde_atendimento, status: "ativo" | "esclarecido" | "descartado" }]
```

- **Padrão observado** → pode ir para a paciente (bloco E), escrito como descrição.
- **Hipótese** → **nunca** vai para a paciente; aparece só na visão profissional, ao lado de "Questões para aprofundar" (que já existe).
- Exemplo: *Padrão:* "Relata mais fome noturna nos dias em que passa a tarde sem refeição." *Hipótese:* "Investigar se a organização da tarde contribui para esse padrão."

## 7. Modelo de evolução longitudinal

Cada Resultado é imutável e ligado a um atendimento. A evolução é lida **da sequência de Resultados**, sem reescrever o passado:

```
Ponto de partida → Experimento → Observação → Aprendizado → Ajuste → Avanço → Novo foco
```

- Na visão da paciente (retornos), um bloco curto **"Seu caminho até aqui"**: por atendimento, o foco daquela etapa e os avanços registrados (texto, não nota).
- Na visão profissional: linha do tempo dos focos, avanços, padrões (com status) e acordos.
- Notas do HOLOSCAN continuam fora disso (comparabilidade não homologada; Evolução lado a lado, como hoje).

---

## 8. Fluxos

### 8.1 Primeira consulta

1. Mapeamento recebido → levado para o atendimento.
2. HOLOSCAN → áreas para aprofundar e sinais.
3. Ferramenta (se couber) → leitura profissional da ferramenta.
4. Conduta → objetivo, ações, acordos, monitoramento, retorno.
5. **Montar resultado para a paciente** (novo bloco no formulário do Resultado HOLOS): o sistema pré-preenche **sugestões** (marcadas "sugestão — confirmar"); a nutricionista escolhe, edita e confirma Dores, Desejos, Foco atual, Corpo/Mente/Espírito, Observe e Próxima etapa. Avanços = ponto de partida.
6. Pré-visualizar → salvar → Resultado Final → PDF/WhatsApp.

### 8.2 Retorno

1. Mapeamento de retorno → levado para o atendimento.
2. Revisão de acordos (continuar / substituir / encerrar; concluídos viram sugestão de avanço).
3. (Reaplicação do HOLOSCAN só se a nutricionista decidir.)
4. Ferramenta da etapa, se houver.
5. Conduta nova.
6. **Montar resultado** com o formato de retorno: **Antes** (foco anterior, vindo do Resultado anterior) · **Agora** (o que aconteceu) · **Avanços** · **Dificuldades que permaneceram** · **Padrões** (o que ficou mais claro) · **Corpo / Mente / Espírito** (evolução ou novo passo) · **Novo foco**.

## 9. O que pode ser automático e o que exige a nutricionista

| Automático (preenche) | Sugerido (precisa confirmar) | Só a nutricionista |
|---|---|---|
| notas, faixas, Índice, Tríade, radar | resumo factual do momento ("Nesta etapa você trouxe… o HOLOSCAN mostrou…") | interpretação |
| áreas para aprofundar, sinais, contexto | itens de Dores a partir do Mapeamento, HOLOSCAN e retorno | causa (nunca afirmada) |
| ferramentas sugeridas (PP-V1) e concluídas | itens de Desejos a partir de objetivo/OQ³/PQQ | **foco atual** (confirmação obrigatória) |
| respostas estruturadas das ferramentas | itens de Avanços a partir do retorno e de acordos concluídos | Conduta e ações |
| histórico factual (datas, versões, acordos) | perguntas para aprofundar | conclusões emocionais ou espirituais |
| | Observe a partir de `monitoring`/`pontos_acompanhar` | padrões e hipóteses |
| | Corpo: texto a partir da Conduta (ações) | direção de Espírito, nova resposta de Mente |

Nenhuma sugestão vai para a paciente sem confirmação: no rascunho, cada sugestão aparece desmarcada ou marcada "sugestão — confirmar"; **salvar o Resultado exige o Foco atual preenchido** (o resto pode ficar vazio e o bloco some).

---

## 10. Impactos

### PDF
- Mesma geração (html2pdf, emissão imutável), **ordem nova**: A–J nas primeiras páginas (direção), K (Detalhes do mapa) no fim.
- Estimativa: 4 a 6 páginas (hoje 5–6). O radar e os cinco sistemas viram anexo "Detalhes do mapa".
- Emissões antigas não mudam (template 4 continua desenhado como hoje).

### WhatsApp
- Mecanismo igual (PDF anexado; sem link).
- Mensagem passa a citar o foco: *"Olá, [nome]! Segue o seu Resultado HOLOS ([data]). Nesta etapa, nosso foco é: [foco atual]. Ele também traz o que combinamos e o que observar até o próximo encontro. Qualquer dúvida, é só me chamar."*

### Banco
**Implementação mínima (recomendada):** uma coluna nova, sem tabela nova.
- `holos_results.direcao jsonb` (nullable): `{ momento, dores[], desejos[], avancos[], padroes[], foco_atual, corpo{}, mente{}, espirito{}, observar[], proxima_etapa }`, com itens `{texto, origem, ref, mostrar_paciente}`.
- RPC de salvar valida o formato e os tamanhos; **foco_atual obrigatório** quando `direcao` existe; copia `direcao` para o `content_snapshot` (template **5**). Hipóteses ficam em `direcao.padroes` com `tipo = hipotese` e o desenho da paciente as ignora.
- A emissão (Resultado Final) passa a congelar `direcao` junto (já congela o snapshot inteiro).
- Evolução: leitura dos `holos_results` anteriores do mesmo paciente (já imutáveis). Sem reescrita de histórico.
- Migration aditiva; templates 1–4 continuam válidos; RLS igual.

**Depois (se a prática pedir):** tabela `patient_progress_notes` (append-only) para avanços e padrões fora do Resultado (por atendimento, com status). Não é necessária na primeira versão.

---

## 11. Implementação mínima recomendada (quando aprovada)

1. **Migration aditiva**: `holos_results.direcao jsonb` + validação na RPC + snapshot template 5 + emissão congelando `direcao`. Harness SQL.
2. **Formulário profissional**: bloco "Montar resultado para a paciente" no editor do Resultado HOLOS, com sugestões pré-preenchidas (do Mapeamento, retorno, HOLOSCAN, ferramentas, Conduta) e confirmação. Foco atual obrigatório.
3. **Visão da paciente nova** (template 5): A–K na ordem do protótipo; blocos vazios somem; C/M/E com "Ainda não aprofundado nesta etapa".
4. **Retorno**: "Seu caminho até aqui" e "Antes / Agora" lidos do Resultado anterior.
5. **PDF e WhatsApp**: nova ordem e mensagem com o foco.
6. **Testes**: linguagem proibida nos textos, sugestões nunca publicadas sem confirmação, hipóteses nunca na visão da paciente, templates antigos intactos, emissão imutável, histórico preservado.

Fora desta primeira versão: tabela de notas de progresso, comparação numérica entre aplicações, qualquer sugestão gerada por IA.

---

## 12. Entregáveis desta fase

| # | Item | Onde |
|---|---|---|
| 1–4 | auditoria, dados que suportam, campos faltantes, reaproveitáveis | seções 1.1–1.3 |
| 5 | arquitetura final | seção 3 |
| 6–8 | wireframe profissional, wireframe paciente, mockup do caso V6 | `docs/v1/redesenho-resultado/prototipo.html` (abas: Paciente · 1ª consulta, Paciente · retorno, Profissional · montar resultado) e capturas na mesma pasta |
| 9–10 | fluxos de primeira consulta e retorno | seção 8 |
| 11–14 | modelos Dores/Desejos/Avanços, C/M/E, padrões, evolução | seções 4–7 |
| 15–16 | automático × nutricionista | seção 9 |
| 17–19 | PDF, WhatsApp, banco | seção 10 |
| 20 | implementação mínima | seção 11 |
