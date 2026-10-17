# Dashboard — Acompanhamento dos pacientes (12/10)

Redesenho do topo do Dashboard. "Pendências" deixa de ser o eixo da tela e dá lugar a **Acompanhamento dos pacientes**, e o Perfil passa a ser aberto pelo canto superior direito. Não muda metodologia, HOLOSCAN, Resultado nem banco de dados.

## O que mudou na tela

| Antes | Agora |
|---|---|
| Topo verde com 4 números lado a lado | Topo **marfim** (#f5efe1, não branco) com texto verde, folhagem discreta e 4 cards claros com ícone e seta, clicáveis |
| "Você tem N atendimentos hoje e **M pendências** na carteira." | "Você tem **N pacientes em acompanhamento** na sua carteira e **M atendimentos** hoje." (sem nenhum em acompanhamento: "N pacientes ativos") |
| Card **Pendências** | Card **Em acompanhamento** (leva à lista e foca a primeira linha) |
| Bloco "Hoje N" (só aparecia com consulta) | **Agenda de Hoje**, sempre visível: consultas marcadas para hoje + atendimentos de hoje sem agendamento. Vazia: "Nenhuma consulta hoje" + **Nova consulta**. Botão **Abrir agenda** |
| **Precisa de você** (sem HOLOSCAN, questionário parado, mapa sem conduta, atendimentos sem conduta) | **Acompanhamento dos pacientes**, ao lado da Agenda. Cada linha mostra avatar, nome, informação curta, data, etapa e seta |
| "Nutricionista" + "N" estáticos no topo | Bloco **iniciais + nome + profissão + seta**, que abre o **Perfil** com clique, Enter ou Espaço (`role=button`, `tabindex=0`, `aria-label="Abrir meu perfil"`). Mostra a foto do Perfil, se houver |

**Segunda rodada (12/10, pedido da usuária): o Dashboard é só o que está na imagem aprovada.**

- **Topo marfim:** "Plataforma clínica", saudação, frase-resumo e os 4 cards. A **pinha da marca** fica ao fundo como marca d'água, com a citação "Saúde integral para uma vida extraordinária.". Em telas largas, o topo ocupa a largura toda da área de conteúdo.
- **Abaixo do topo, lado a lado:** **Agenda de Hoje** e **Acompanhamento dos pacientes**.

**Saíram do Dashboard:**

- Próximas consultas marcadas: continuam na Agenda.
- Pacientes recentes: continuam em Pacientes.
- Jornada clínica: continua no menu e na ficha.
- Rascunhos e atendimentos sem conduta salva: continuam na ficha.
- O aviso "HOLOSCAN não salvo no servidor": continua no cartão do paciente e na ficha.
- Os botões "Novo paciente" e "Abrir HOLOSCAN".
- **Primeiros passos:** vão virar uma janela nos primeiros acessos da nutricionista (a fazer). Não ficam fixos no Dashboard.

**Conta sem nenhum paciente:** o topo mostra "Comece cadastrando seu primeiro paciente" com o botão **Cadastrar primeiro paciente**, e a apresentação do método aparece abaixo.

## Etapas e de onde vem cada uma

Cada paciente ativo recebe **uma** etapa, verificada nesta ordem. Paciente sem nenhuma delas não está "em acompanhamento": não entra na lista nem no número.

| Etapa | Regra (só dados que já existem) | Fonte | Ao clicar |
|---|---|---|---|
| **HOLOSCAN em andamento** | Questionário com respostas guardadas e ainda não salvo | Rascunho do questionário **neste aparelho** (`holohacking.questionario`) | HOLOSCAN da paciente |
| **Aguardando anamnese** | Convite de anamnese pré-consulta `enviado` ou `iniciado`, dentro da validade | `anamnesis_invites` | Ficha → Anamnese |
| **Anamnese recebida** | Convite `concluido` e ainda não usado num atendimento (`imported_at` vazio) | `anamnesis_invites` | Ficha → Anamnese |
| **Resultado pronto** | Resultado HOLOS `salvo` ou `revisado`, vigente (não substituído), sem Resultado Final emitido | `holos_results` + `holos_result_emissions` | Página Resultado |
| **Aguardando retorno** | Já teve atendimento **e** tem consulta marcada à frente | Agenda (`consultations`) + `encounters` | A consulta na Agenda |
| **Resultado apresentado** | Resultado Final emitido do Resultado HOLOS vigente | `holos_result_emissions` | Página Resultado |

- A lista segue a ordem da jornada e, dentro de cada etapa, a data mais recente primeiro. Mostra 6 linhas; com mais, aparece **Ver todos (N)**.
- **"Em acompanhamento"** é o número de pacientes ativos com alguma dessas etapas. É o mesmo número da lista.
- Convite vencido ou revogado não conta.
- Paciente arquivado não entra.
- Paciente só cadastrado não entra.
- Paciente sem HOLOSCAN não entra.
- Ferramenta não aplicada nunca é etapa.

**Leitura e sincronização.**

- O Dashboard faz 3 consultas a mais, só de leitura: convites, Resultados HOLOS e emissões. Elas trazem só as colunas de estado e nunca o conteúdo das respostas nem o código do convite.
- As consultas são refeitas a cada abertura do Dashboard, no máximo uma vez a cada 5 segundos.
- Ao trocar de conta ou sair, o que foi lido é apagado na hora.
- A RLS garante que cada nutricionista vê só os seus registros.
- Pacientes, agenda, atendimentos e HOLOSCAN já vinham carregados pela sincronização, que redesenha o Dashboard ao terminar.

**Conferido no banco real em 12/10, só leitura:**

- as colunas existem;
- RLS ligada nas 3 tabelas, com política "só os próprios";
- quem está logado lê as colunas usadas, e o código secreto do convite (`token_hash`) continua fechado;
- anônimo não lê nada.

A mesma regra calculada direto no banco para a conta em uso deu 4 pacientes ativos e 2 em acompanhamento (1 "Aguardando retorno" e 1 "Resultado apresentado").

**Cores das etapas.** Não há vermelho nem "alta/média/baixa".

| Tom | Etapas |
|---|---|
| Dourado suave | Aguardando anamnese, Aguardando retorno |
| Verde | Anamnese recebida, Resultado pronto |
| Oliva | HOLOSCAN em andamento |
| Verde discreto | Resultado apresentado |

## Etapas que não foram usadas

- **Pronto para consulta** ("anamnese revisada e consulta ainda não realizada"). O sistema não registra "anamnese revisada" separado do atendimento. Usar a anamnese pré-consulta (`imported_at`) acontece **dentro** de um atendimento, então a consulta já começou. Não há dado que sustente a regra sem inventar.
- **HOLOSCAN em andamento entre aparelhos.** O questionário em andamento fica só no navegador onde está sendo respondido, e o servidor só recebe o HOLOSCAN salvo. Em outro aparelho, essa etapa não aparece.

## Larguras

| Largura | Comportamento |
|---|---|
| ≥ 1181 px | Cards em 4 colunas; Agenda e Acompanhamento lado a lado |
| ≤ 1180 px | Cards em 2×2; os dois blocos empilhados |
| ≤ 760 px | Topo com folhagem menor; nas linhas do Acompanhamento, etapa e data vão para baixo do nome; o perfil do topo mostra só o avatar |
| 390 px | Sem rolagem lateral (testado) |

## Capturas

As capturas estão em `docs/v1/dashboard/`, todas com dados **fictícios**:

- `dashboard-1440-escuro.png` e `dashboard-1440-claro.png`;
- `dashboard-1280-escuro.png`;
- `dashboard-tablet-900-escuro.png`;
- `dashboard-390-escuro.png`.

## Testes

**`testes/testar-dashboard-acompanhamento.mjs`** cobre:

- cada etapa a partir de um registro real;
- que convite vencido e paciente só cadastrado não entram;
- a ordem da lista;
- os cards e a frase do topo;
- que não aparece "Pendências", "Precisa de você" nem prioridade;
- a Agenda de Hoje vazia e com consulta;
- que nenhum status fica vermelho e que o topo é marfim;
- os cliques de cada etapa;
- o card "Em acompanhamento";
- o perfil do topo: nome, iniciais, acessibilidade, clique, Enter e Espaço;
- 1280, 900 e 390 px sem rolagem lateral;
- tela limpa: só o topo e os dois blocos, com a pinha ao fundo.

**Testes antigos ajustados à tela nova:**

- `testar-dashboard.mjs`: "Precisa de você" virou "Acompanhamento dos pacientes"; saíram os blocos removidos.
- `testar-v1-etapa2.mjs`: o Dashboard não lista mais "sem conduta salva".
- `testar-v1-etapa3.mjs`: o Dashboard não mostra mais os rascunhos.
- `testar-rodada08-contexto.mjs`: a Evolução abre pelo HOLOSCAN, não mais pela Jornada do Dashboard.
