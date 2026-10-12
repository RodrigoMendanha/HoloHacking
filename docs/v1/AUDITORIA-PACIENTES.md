# Auditoria do módulo Pacientes — HoloHacking (12/10, só leitura)

Nada foi alterado: nem código, nem CSS, nem HTML, nem banco. Fontes:
- leitura do código (referências `arquivo:linha`);
- consultas **só de leitura** ao banco real: RLS, políticas, triggers, storage e contagens agregadas, sem nenhum dado de paciente;
- a suíte local completa sobre a versão atual (com o Dashboard novo): **VERDE, 138 suítes, 4214 asserções, 0 falhas**.

Marcação usada: **[BUG]** defeito encontrado (não corrigido) · **[RISCO]** ponto frágil · **[ESTIMATIVA]** não medido em navegador.

---

## 1. Arquitetura geral
- **Aplicação:** SPA estática em JS puro. Seções trocadas por `irPara` (app.js:277). A seção Pacientes tem duas vistas: `#vista-lista-pacientes` e `#vista-ficha`.
- **Banco:** Supabase via `window.DadosRouter`.
  - Com sessão, lê e grava no servidor.
  - Sem sessão, usa `DadosLocais` (localStorage).
- **Carga:** no login, `carregarTudo` (app.js:515) chama `Sincronizacao.hidratar` (sincronizacao.js:589), que carrega para a memória **todas** as linhas da conta de agenda, atendimentos, anamneses, condutas, ferramentas, relatórios e HOLOSCAN.
- **Ficha:** cada aba é desenhada sob demanda (`DESENHOS`, ficha.js:1083). Os módulos são registrados em `window.*`: AtendimentoAtual, Anamnese, Conduta, Agenda, Aplicacoes, Panorama, Timeline, ResultadoHolos, ArquivoStore, Relatorios e HolosAI.
- **Troca de paciente:** `definirAtivo` dispara cerca de 17 ouvintes `aoTrocarPaciente`.
- **Sem tempo real:** não há realtime nem polling.

## 2. Página de lista
| Campo visual | Origem | Tabela/coluna | Derivado? | Cálculo | Atualização |
|---|---|---|---|---|---|
| Avatar | `cardPaciente` app.js:765 | patients.nome | sim | 1ª letra (sem trim) | refresh da lista |
| Nome | idem | patients.nome | não | — | idem |
| Ícone de sexo | app.js:712 | patients.sexo | sim | F→♀, M→♂ | idem |
| Ativo/Arquivado | panorama.js:319 | patients.status | sim | `inativo` = arquivado | idem |
| Último contato | `Panorama.situacao` panorama.js:281 | encounters.occurred_at + último HOLOSCAN | sim | data mais recente (agendamento **não** conta); vermelho a partir de 90 dias | só redesenha a lista |
| Cadastrado | app.js:727 | patients.created_at | sim | `slice(0,10)` da data **UTC** **[BUG: cadastro depois das ~21h aparece com o dia seguinte]** | idem |
| Próximo atendimento | `Agenda.proxima` agenda.js:1159 | consultations | sim | 1ª consulta futura sem atendimento iniciado | idem |
| Telefone/e-mail | app.js | patients.telefone/email | não | links `tel:`/`mailto:` | idem |
| Botão principal | `proximoPasso` app.js:753 | Panorama.alertas | sim | Arquivado → "Reativar"; senão o alerta de menor peso ("Salvar HOLOSCAN"/"Continuar"/"Aplicar agora"/"Abrir conduta"); sem alerta → "Abrir ficha" | idem |
| Menu ▾ | `menuDoPaciente` app.js:794 | — | — | Agendar, Aplicar/Reaplicar HOLOSCAN, Abrir questionário, OQ³, PQQ, Mapa, Arquivar, Remover (arquivado: Reativar e Remover) | — |
- **Ordenação:** cadastro, nome ou contato.
- **Seleção em lote:** barra com Arquivar, Reativar e Remover.
- **Aba Revisão:** lista `aguardandoMapa` (algo começado, sem HOLOSCAN). Inclui arquivados e ignora busca e filtros.
- **[RISCO]** O select de `patients` não tem paginação (app.js:519). Acima de 1000 linhas, o PostgREST corta em silêncio.
- **[BUG]** A lista não é redesenhada quando `hidratar` termina; só o Dashboard é (sincronizacao.js:633). Os cards podem ficar com "Sem atendimento ainda" até a próxima navegação.

## 3. Filtros
Os chips filtram no navegador com `Panorama.situacao` (app.js:672):

| Chip | Regra |
|---|---|
| Todos | todos, inclusive arquivados |
| Ativos | `!inativo` |
| Novos | até 30 dias do cadastro, e ativo |
| Sem contato 90d+ | ativo |
| Arquivados | `inativo` |
| Ficha vazia | `s.vazia`, **inclui arquivados** **[inconsistente com Novos e Sem contato]** |

- As contagens dos chips seguem a busca. O total do cabeçalho e `#nav-total-pac` ignoram a busca.
- Trocar de chip limpa a seleção.

## 4. Busca
- **Busca da lista** (`combinaComABusca` app.js:821):
  - campos: nome, queixa, e-mail, telefone;
  - sem acento e sem maiúsculas, por `includes`, sem debounce;
  - telefone não é normalizado: "999991234" não acha "99999-1234";
  - o placeholder não menciona "queixa".
- **Busca global do topo** (app.js:459):
  - campos: nome, telefone, e-mail, inclusive arquivados;
  - mostra até 6 resultados;
  - Enter abre o 1º;
  - não há navegação por setas, embora o campo esteja marcado como combobox.
- Cada tecla recalcula `Panorama.situacao` de todos os pacientes, e essa função relê o localStorage. **[RISCO de desempenho]**

## 5. Status
- **Valores existentes no banco:** `patients.status` só admite `ativo` e `inativo` (check). "Arquivado" é a palavra da tela para `inativo`.
- **Estados derivados que existem hoje:**
  - Novo (até 30 dias);
  - Sem contato (90 dias ou mais);
  - Ficha vazia;
  - Aguardando mapa;
  - as 6 etapas do Dashboard (dashboard.js `etapaDe`): HOLOSCAN em andamento, Aguardando anamnese, Anamnese recebida, Resultado pronto, Aguardando retorno, Resultado apresentado.
- Não existe "pronto para consulta", "em tratamento", "alta" nem "faltou". Criar algum deles seria inventar status.

## 6. Ações
- **Clique no card:** abre a ficha. **[BUG]** Clicar em telefone ou e-mail também abre a ficha (falta `stopPropagation`).
- **Arquivar:** pede confirmação e avisa sobre consultas futuras (app.js:1322), depois `update patients.status` direto.
- **Reativar:** não pede confirmação (app.js:1629, 1768).
- **Remover** (app.js:1381–1573):
  - Pré-checagem: 9 contagens por paciente. Não conta holos_results, holos_result_emissions nem integrated_readings.
  - Com histórico, só permite arquivar.
  - Depois, `delete from patients` e limpeza local com lock, snapshot e rollback (excluir-paciente.js).
  - As FKs RESTRICT protegem no servidor. Quando o banco recusa, a única mensagem é o toast "possui dados no prontuário".
- **Exportar dados:** gera um JSON só de leitura (app.js:1069).

## 7. Ficha
- **Abertura:** `abrirFicha` (app.js:993) monta cabeçalho, atendimento ativo, "Sobre/Detalhes", faixa de pílulas, Jornada estática e 11 abas.
  - Só abre paciente presente em `estado.pacientes`.
  - O estado dos Detalhes (aberto/fechado) não reseta ao trocar de paciente.
- **Bloco "Atendimento ativo"** (atendimento.js:389): é **funcional**. Anamnese, conduta e HOLOSCAN só salvam com atendimento ativo (anamnese.js:462, conduta.js:429, app.js:3840).
  - Ações: Selecionar, Iniciar novo (RPC `criar_atendimento`) e Soltar.
  - O atendimento ativo fica guardado em sessionStorage, por aba do navegador.

## 8. Cabeçalho
- **Conteúdo:** avatar, nome, status, contato com "Cadastrado em", idade/nascimento/sexo e Detalhes (queixa, início, contatos).
- **Botões** (`.fic-acoes-topo`, index.html:859–868), nesta ordem: Voltar, Editar, Marcar consulta, Adicionar arquivo, Aplicar HOLOSCAN, Reativar (só arquivado), Exportar dados.
- **Paciente arquivado:**
  - os botões `[data-atalho]` e `[data-ir]` ficam desabilitados;
  - **Editar continua habilitado**;
  - a Jornada e as pílulas também continuam clicáveis.
- **Pílulas da faixa** (ficha.js:113):
  - **Última aplicação:** leva à seção HOLOSCAN.
  - **Próxima consulta:** leva à Agenda. **[BUG confirmado: mostra a hora com segundos, "14:00:00"; ficha.js:124 não faz `slice(0,5)` como a agenda faz]**
  - **Em aberto:** número de alertas; leva à Visão.
  - **Documentos e exames:** número; leva a Documentos.
- **Conta pendente:** o bloqueio só existe em `irPara` (app.js:277). `abrirFicha` e `levarPara` não checam. O servidor bloqueia toda escrita.

## 9. Jornada Clínica
HTML estático (index.html:894–932), igual para todo paciente. Não lê nenhum dado.

| Passo | Entrada | Critério de conclusão | Dado | Ação | Destino |
|---|---|---|---|---|---|
| MAPEAR | botão | nenhum (estático) | — | HOLOSCAN | seção HOLOSCAN |
| INTEGRAR | botão | nenhum | — | Ferramentas | seção Corpo |
| CONSOLIDAR | botão | nenhum | — | Resultado HOLOS | aba resultado-holos |
| APRESENTAR | botão | nenhum | — | Resultado | seção Resultado |
| ACOMPANHAR | botão | nenhum | — | Evolução | **aba:visao [BUG: deveria ser aba:evolucao]** |

Existem ainda 3 conjuntos de "chips de continuidade" estáticos: na Visão (ficha.js:214), em Atendimentos (:439) e no HOLOSCAN (:570).

**Dados que já permitiriam marcar cada passo como feito, sem inventar** (decisão de 12/10):

| Passo | Dado real |
|---|---|
| Mapear | HOLOSCAN salvo |
| Integrar | ≥1 ferramenta concluída/revisada |
| Consolidar | Resultado HOLOS salvo/revisado vigente |
| Apresentar | Resultado Final emitido |
| Acompanhar | 2+ HOLOSCANs salvos |

## 10. Abas
- **Lista:** 11 abas (index.html:936), trocadas por `trocarAba` (arquivos.js:806).
  - Aliases: exames→documentos, formularios→ferramentas, confronto→holoscan, linha→visao.
  - Desenho sob demanda; só a aba aberta é desenhada.
  - **Sem hash nem URL.** A aba fica só em memória (`abaAtual`, ficha.js:48) e **não reseta ao trocar de paciente**.
  - Sem subabas, exceto os modos da Evolução e o alternador profissional/paciente do Resultado e do Relatório.

| Aba | Arquivo | Tabelas | RPCs | Exige atendimento? |
|---|---|---|---|---|
| Visão geral | ficha.js:268 | caches em memória + documents | — | não |
| Atendimentos | ficha.js:485 | encounters, consultations | criar_atendimento | não |
| Anamnese | anamnese.js / anamnese-v2.js / anamnese-convite.js | anamneses, anamnesis_invites | salvar_anamnese, criar_anamnese_a_partir_de, criar/revogar/marcar_convite… | registro sim; pré-consulta não |
| Conduta | conduta.js | conducts, agreements | salvar_conduta | sim |
| HOLOSCAN | ficha.js:594 | histórico local + servidor | — (o salvamento é na seção) | — |
| Ferramentas | ficha.js:793 | campos do paciente + tool_applications | — | — |
| Resultado HOLOS | resultado-holos.js | holos_results | 5 RPCs | encounter obrigatório no formulário |
| Evolução | evolucao.js:217 | caches | — | não |
| Documentos | arquivos.js:185 / arquivo-store.js | documents + bucket | — | não |
| Relatório | relatorios.js + arquivos.js:455 | report_emissions, holoscan_applications.interpretacao_texto | salvar_rascunho_relatorio, emitir_relatorio | não |
| HOLOS AI | holos-ai.js | — | — (só monta contexto e copia) | não |

**[RISCO, ESTIMATIVA]** A barra de abas tem rolagem lateral com a barra de rolagem escondida (style.css:1311), e o conteúdo é limitado a 1080px. "Relatório" e "HOLOS AI" provavelmente ficam fora da tela mesmo em 1920px, sem nenhuma pista visual.

## 11. Visão Geral
Ordem dos blocos:
1. **Alertas** (`Panorama.alertas`): "HOLOSCAN não salvo no servidor", "Sem HOLOSCAN aplicado", "Questionário parado", "mapa sem conduta".
2. **Atendimento clínico:** último atendimento, anamnese, conduta vigente, retorno previsto, acordos, próxima consulta, última evolução e último relatório. Inclui chips de continuidade e o "Resumo da anamnese" recolhido.
3. Sem mapa, mostra só um texto vazio, Documentos e a Linha do tempo, e para aí.
4. Mapa HOLOS.
5. Cinco sistemas.
6. Leitura combinada: **nunca aparece**, porque `cmbParaExibir` sempre devolve `[]`.
7. Interpretação profissional (somente leitura; é editada no Relatório).
8. **"Desde a última consulta"** **[BUG: conta a partir do último agendamento e não do atendimento; mostra "Índice HOLOS subiu/caiu", delta que a Evolução proíbe]**
9. Documentos recentes (3).
10. Linha do tempo.

## 12. Mapa HOLOS
- **Fonte:** `ultimaPontuacao(pid)`, a última entrada de `holohacking.pontuacao` (localStorage), mesclada com o servidor (`holoscan_applications` + `holoscan_system_scores`). Mostra a aplicação **mais recente, mesmo que ainda não salva**.
- **Selo de origem:** oficial vX, histórica ou homologação, mais a marca "não salvo no servidor".
- **Valores:** Índice "X de 10,0" e Tríade (Físico/Mental/Espiritual, com 1 casa decimal).
  - Diferença: aqui a Tríade ignora `triada_com_dado`; o Resultado HOLOS respeita.
- **"Mais baixos":** 2 sistemas, só os que têm cobertura suficiente.
- Não há botão "ver resultado" nem ligação com o snapshot do Resultado HOLOS.

## 13. Cinco sistemas
- **Ordem:** `porLeitura`. Primeiro os suficientes, da menor para a maior nota; depois os insuficientes; depois os sem nota.
- **Barra:** largura = nota/10, trilho de 5px, uma cor só (dourado). Barra cheia = mais equilíbrio.
- **Texto:** "sem dado", "dados insuficientes" ou a faixa **gravada** (`baixa/intermediaria/alta`, ou `baixo/medio/alto` nas aplicações históricas), mais "respondidas/total".
- **Estados:** `.sem-dado` com opacidade .5. `.insuficiente` não tem CSS.
- A faixa some no celular.
- Nenhum texto "atenção" ou "estável" é inventado.

## 14. Timeline
- **Montagem:** `Timeline.eventos` (timeline.js:52), refeito a cada desenho e nunca persistido. Só entram itens consolidados.
- **Filtros (9):** Tudo, Agendamentos, Atendimentos, Anamnese, Conduta, HOLOSCAN, Ferramentas, Documentos e exames, Relatórios. O filtro escolhido não é salvo.
- **Ordem:** data clínica decrescente, agrupada por mês. Consultas futuras aparecem com anel tracejado.
- **Onde aparece:** só dentro da Visão. A Evolução usa um recorte por intervalo.
- **[BUG]** Clicar num evento de Ferramenta não faz nada: aponta para `aba:formularios`, e nenhum `[data-aba]` tem esse valor.
- **[RISCO]** Um clique em `data-ir` dentro da timeline provavelmente dispara 2 vezes (mesmo handler em `#aba-visao` e no container interno).
- **Ficam de fora:** cadastro, convites de anamnese, Resultado HOLOS, Resultado Final, Próximos Passos, consultas canceladas e arquivamento.

## 15. Atendimentos
- **Topo:** "Novo atendimento" (modal com data e hora, sem data futura, RPC `criar_atendimento`) e "Marcar consulta".
- **Lista de encounters:** em ordem decrescente, com "Abrir/Selecionado"; Abrir apenas torna o atendimento ativo.
- **Blocos da agenda:** próximas, anteriores e canceladas/reagendadas.
- **[BUG/lacuna]**
  - Não dá para editar nem excluir um atendimento: `AtendimentoAtual.atualizar` existe, mas nada o chama.
  - O status fica sempre "aberto".
  - Não há link do atendimento para a anamnese, a conduta ou o HOLOSCAN dele.
- **Regra:** "Agendamento não é atendimento" é respeitada aqui.

## 16. Anamnese
- **Pré-consulta** (anamnese-convite.js):
  - Convite com link de 7 dias. Estados: Não enviada, Enviada, Iniciada, Concluída, Expirada, Revogada.
  - O token fica só em memória, então Copiar e WhatsApp só funcionam na sessão que gerou o link.
  - "Levar para a anamnese" exige um atendimento ativo **sem** anamnese. Cria um rascunho V2 com origem `relato_paciente` e marca o convite como usado. A resposta da paciente nunca muda.
- **Registro:** por atendimento, com revisões (rascunho → salvo → revisado).
  - O autosave grava rascunho 2,5 s depois de digitar.
  - "Concluir" grava como salvo; depois disso a anamnese fica só leitura, com "Corrigir (nova revisão)".
  - Anamneses antigas mantêm o editor de 18 domínios.
- **[RISCO]** `anamnese-convite.js` faz `select("*")` em `anamnesis_invites`. O banco real tem grant por coluna, com `token_hash` fechado, então essa leitura pode falhar em produção. Confirmar antes de mexer na aba.

## 17. HOLOSCAN
- **Na ficha (só leitura):**
  - Botão Iniciar/Reaplicação (leva à seção).
  - "Última aplicação": Índice, cobertura e "em andamento" se houver rascunho local.
  - Histórico.
- **[BUG]**
  - "Abrir resultado" abre as **respostas**, e elas vêm do localStorage. Em outro aparelho aparece "Nenhuma resposta guardada".
  - "Ver HOLOSCAN" no histórico não abre a aplicação específica.
- **O salvamento acontece na seção HOLOSCAN** (RPC `salvar_holoscan_completo`, app.js:3927).
- **Próximos Passos ficam na seção, não na ficha.** Apenas abrir a seção pode registrar um snapshot (RPC `registrar_proximos_passos`).
- **v3:** as perguntas vêm de `HoloscanOficial.perguntas` (pacote vigente). O texto "refaz todas as 84 perguntas" (ficha.js) está **desatualizado: o v3 tem 82**.

## 18. Ferramentas
- **Aba da ficha:** 4 cards (HOLOSCAN, OQ³, PQQ e Mapa do Propósito, este derivado) e chips "X de N aplicadas".
  - OQ³ e PQQ são lidos dos campos do objeto paciente, não de `tool_applications`.
- **Histórico, status e leitura profissional** ficam nas seções Corpo/Mente/Espírito, não na aba.
- O vínculo com o atendimento é gravado no 1º salvamento e não aparece na aba.

## 19. Resultado
- **Aba Resultado HOLOS:**
  - Só funciona com sessão.
  - Lista de versões e editor: atendimento, HOLOSCAN salvo, ferramentas com "Mostrar ao paciente", Próximos Passos e 3 observações.
  - Visão profissional/paciente, PDF por `print`, Revisar, "Nova versão a partir desta". O snapshot é imutável.
- **Página Resultado:**
  - Mostra o Resultado HOLOS vigente mais a conduta.
  - "Gerar Resultado Final" chama a RPC `emitir_resultado_final`, que congela tudo.
  - PDF e WhatsApp só a partir da emissão.
  - Não aparece na timeline.

## 20. Documentos
- **Formulário:** tipo, título, data, arquivos de até 10 MB (pdf/imagens/txt/csv) e observação.
- **Armazenamento:** bucket privado `patient-documents`, mais cópia no IndexedDB.
- **Sem exclusão, só arquivamento.** O banco bloqueia DELETE (grant revogado e trigger).
- O sistema não lê nem interpreta exames (confirmado no Panorama, nos Próximos Passos e no Relatório).

## 21. Evolução
- **Na ficha:** 4 modos (anterior × atual, base × atual, dois atendimentos, duas datas) e 7 fontes.
  - Diferença só quando é comparável: mesma unidade, mesma ferramenta, versão e escala.
  - **Sem delta de Índice, Tríade ou nota.**
  - A seleção fica em memória.
- **Na seção HOLOSCAN** (`#holo-evolucao`): primeira × última aplicação, lado a lado, sem delta.

## 22. Rotas
- O app **não usa hash nem pushState** nas telas. Não há deep link para paciente, aba, HOLOSCAN ou Resultado, e o Voltar do navegador sai do app.
- Depois de recarregar a página: abre no Dashboard, com o 1º paciente ativo.
- **Pontos de entrada (window):**
  - `abrirFichaDe`
  - `levarParaFicha` (`"aba:x"`)
  - `irParaSecao`
  - `definirPacienteAtivo`
  - atributos `data-ir`, `data-atalho`, `data-bpctx`
- **Proteção de "alterações não salvas":** cobre o menu, `.btn-voltar` e `bpctx`. Não cobre clique no card, `data-atalho` nem `levarPara`.

## 23. Banco
- **`patients`:** status `ativo`/`inativo`; `unique (id, nutritionist_id)`.
- **FKs compostas `(patient_id, nutritionist_id)` com RESTRICT:**
  - consultations, holoscan_applications, tool_applications, documents, encounters, anamneses, conducts, agreements, report_emissions, integrated_readings, holos_results, holos_result_emissions.
- **FKs com CASCADE:**
  - `anamnesis_invites`;
  - `ai_threads` / `ai_messages`;
  - `holos_next_steps`, mas um trigger bloqueia o delete dela, então um paciente com próximos passos não pode ser excluído.
- **Triggers (conferidos no banco real):**
  - `bloquear_escrita_paciente_arquivado` em 13 tabelas;
  - `exigir_conta_ativa` em todas;
  - proteção de snapshot/proveniência no HOLOSCAN;
  - `registro_clinico_concluido_imutavel` nas ferramentas;
  - `proteger_revisao_consolidada` em anamnese, conduta e holos_results;
  - `conduta_sem_prescricao`;
  - proteções das emissões.
- **Contagem atual (agregada):** 5 pacientes (1 arquivado), 6 atendimentos, 4 consultas, 2 anamneses, 3 condutas, 4 HOLOSCANs, 15 ferramentas, 1 Resultado HOLOS, 1 emissão, 2 documentos.

## 24. Queries
| Momento | O que lê |
|---|---|
| Login | `patients *` sem paginação; `hidratar` (HOLOSCAN em lotes de 100 IDs; cada módulo lê **a tabela inteira da conta**). Anamneses, condutas, encounters e relatórios são lidos **2 vezes**; exames são lidos mesmo desligados |
| Abrir a ficha | só `documents` daquele paciente (deduplicado). O resto vem da memória. A cadeia `aoTrocarPaciente` roda 2 vezes com `levarPara`; a ficha é desenhada 2 vezes |
| Abas | Anamnese → `anamnesis_invites` (paciente) · Resultado HOLOS → `holos_results` (paciente) · Documentos → `documents` · HOLOSCAN → `holos_next_steps` |
| Cada salvamento | relê a tabela **inteira** da conta, inclusive no autosave da anamnese a cada 2,5 s |
| Dashboard | 3 tabelas (convites, resultados, emissões), TTL de 5 s; roda também a cada troca de paciente |

## 25. Sincronização
| Área | Fonte da verdade | Cache local | Realtime | Refresh | Conflito | Multi-dispositivo |
|---|---|---|---|---|---|---|
| Lista | patients | memória | não | login/ações próprias | Editar checa `updated_at`; arquivar/reativar = última escrita vence | outro aparelho só vê no reload |
| Anamnese | anamneses (RPC) | memória (conta toda) | não | após salvar | `expected_updated_at` | ok após reload |
| Convites | anamnesis_invites | memória por paciente | não | ao abrir a aba | RPC | ok |
| Atendimentos | encounters | memória + sessionStorage (ativo) | não | após salvar | `updated_at` | atendimento ativo é por aba |
| Agenda | consultations | memória | não | ao abrir a Agenda | **nenhum** | ok após reload |
| HOLOSCAN | applications/answers/scores (RPC) | **localStorage** (histórico, rascunho, respostas) | não | só no login | servidor vence quando há `_supa_id` | **rascunho e não salvos ficam só no aparelho** |
| Ferramentas | tool_applications | memória | não | após salvar | **nenhum** | ok |
| Resultado HOLOS | holos_results (RPC) | memória por paciente | não | ao abrir | `expected_updated_at` | ok |
| Documentos | documents + bucket | IndexedDB | não | por chamada | imutável | upload que falhou fica "só neste dispositivo" |
| Conduta | conducts/agreements | memória | não | após salvar | `expected_updated_at` | ok |
- `concorrencia.js` só cobre o armazenamento local e nunca bloqueia escrita no servidor.
- **[RISCO de privacidade]** No logout, os dados clínicos vão para `holohacking._stash.<uid>.*` no localStorage e ficam lá (login.js:91). Num computador compartilhado, os dados sobrevivem ao logout.

## 26. RLS
- RLS ligada em todas as tabelas. A regra é sempre `nutritionist_id = auth.uid()` no USING e no WITH CHECK. `anon` não lê nada.
- A FK composta impede ligar um registro a paciente de outra conta.
- **Só leitura pelo cliente (escrita via RPC):** holos_results, emissions, next_steps, integrated_readings, anamnesis_invites, holoscan_answers e holoscan_system_scores.
- **Ainda permitem DELETE direto pelo cliente:**
  - `holoscan_applications` **[RISCO: a política `delete_proprios` existe, conferido no banco real]**;
  - consultations;
  - tool_applications;
  - agreements (só em rascunho).
- **Conta pendente:** políticas RESTRICTIVE em `patients` mais o trigger `exigir_conta_ativa` em todas as tabelas e no storage. **Não mexer** (a liberação é manual).
- **Storage:** só a primeira pasta (uid) é conferida. A pasta do paciente não é checada contra o dono.
- **Paciente arquivado não protegido em:** `holos_next_steps`, `ai_threads`/`ai_messages` e edição do próprio cadastro.
- **Lacuna de teste:** não há harness SQL de RLS cruzada para patients, consultations e holoscan_applications (só no Supabase falso).

## 27. Performance
1. **Corte silencioso acima de 1000 linhas** em patients, anamneses, conducts, agreements, encounters, consultations, tool_applications, report_emissions e nas tabelas do Dashboard. Pela ordenação de cada uma, se perdem:
   - **as anamneses, condutas e relatórios mais novos;**
   - **as consultas futuras;**
   - **os pacientes mais antigos.**
2. Releitura da tabela inteira a cada salvamento, inclusive no autosave da anamnese.
3. `Panorama` custa O(n²): reparse do localStorage por paciente, a cada tecla da busca e a cada troca de paciente.
4. `holohacking.pontuacao` cresce sem limite, mais os stashes. A gravação não tem try/catch: estourar a cota quebra a sincronização do HOLOSCAN.
5. `content_snapshot` das emissões pode ter até 3 MB e é lido com `select *`.
6. Com 5 pacientes, nada disso aparece hoje.

## 28. Mobile
Larguras pedidas:

| Largura | Comportamento |
|---|---|
| 1920 / 1440 | igual a 1440, porque o conteúdo é limitado a 1080px. Muito espaço vazio; as regras `.main-content` (style.css:4019) estão mortas |
| 1024 | card com 5 colunas e área de ação fixa de 15.5rem; a coluna de informação fica estreita entre 961 e 1100px |
| 768 | menu lateral empilhado no topo (≤960); card em 2 faixas (≤900); botões do cabeçalho ocupam 100% (≤700); faixa em grade 2×2 |
| 390 | menu lateral vira rolagem horizontal (≤480); a faixa dos sistemas some; botões da Jornada em linha própria (≤640) |

**Riscos de estouro:**
- barra de abas;
- `.topo` sem quebra de linha;
- e-mail longo em `.fic-contato` sem word-break;
- botões com `nowrap`.

`testar-responsividade.mjs` cobre 375/768/1366/1920 com `scrollWidth`.

## 29. Duplicações
| Dado | Aparece onde | Redundante? | Recomendação futura |
|---|---|---|---|
| Próxima consulta | pílula, Visão (atend. clínico), aba Atendimentos, timeline, card da lista | sim (4× na ficha) | manter a pílula e a aba Atendimentos |
| Último HOLOSCAN | pílula, Mapa da Visão, aba HOLOSCAN, card HOLOSCAN em Ferramentas, timeline, "Desde a última consulta" | sim | Mapa na Visão + aba HOLOSCAN |
| Pendências | alertas da Visão, pílula "Em aberto", botão do card, Dashboard | sim, e é o conceito "pendência" que o Dashboard abandonou | "Etapa atual" (decisão de 12/10) + só o aviso técnico "não salvo" |
| Documentos | pílula, Visão (3), aba, timeline, Relatório | parcial | ok |
| Anamnese | Visão (linha + resumo), aba, timeline, Evolução | parcial | ok |
| Conduta/acordos | Visão, aba, timeline, Evolução, Relatório, Resultado | parcial | ok |
| "Aplicar HOLOSCAN" | cabeçalho, alerta, pílula, aba, card de Ferramentas, Jornada | sim (6 caminhos) | 1 botão principal + Jornada |
| Continuidade | Jornada + 3 conjuntos de chips | sim, e todos estáticos | só a Jornada, com estado real |

## 30. Riscos
**Bugs encontrados (nenhum corrigido):**
1. Timeline: clique em Ferramenta não faz nada.
2. Jornada ACOMPANHAR aponta para a Visão.
3. "Desde a última consulta": conta a partir do agendamento e mostra delta do Índice.
4. "Abrir resultado" abre respostas que só existem no aparelho.
5. Hora com segundos na pílula.
6. Data de cadastro em UTC.
7. Telefone/e-mail no card abrem a ficha.
8. A lista não é redesenhada depois do `hidratar`.
9. Texto "84 perguntas" com o v3 vigente (82).

**Riscos estruturais:**
- corte de 1000 linhas;
- stash de dados no logout;
- DELETE direto em holoscan_applications;
- `select("*")` nos convites;
- abas escondidas;
- bloco "Atendimento ativo" acoplado ao salvamento;
- sem deep link.

## 31. O que pode ser redesenhado imediatamente (A — visual puro)
- CSS da lista e da ficha, escopado em `#secao-pacientes`: bordas, elevação, tipografia, espaçamento.
- Barras dos sistemas: espessura e rótulo junto, mesmo dado.
- Abas com indicador forte e com pista de rolagem.
- Filtros da timeline em segmented control.
- Pílulas compactas.
- Largura útil maior em ≥1440.
- Menu ⋯ no lugar do ▾.

## 32. O que exige cuidado (B — visual + pequena lógica)
- **Lista em tabela no desktop e cards no celular:** mesmos dados e handlers, delegação em `#painel-pac-lista`; vários testes fixam `.card-paciente`.
- **Cabeçalho com "Mais ações":** os testes fixam a ordem dos botões. Manter as regras de desabilitar para arquivado.
- **Jornada horizontal com ✓ real:** exige extrair `etapaDe` e os carregadores para um módulo comum com o Dashboard.
- **"Em aberto" → "Etapa atual":** troca de conceito; remove os alertas de pendência.
- **Visão em 2 colunas:** reordena `desenharVisao`; a timeline tem handler duplicado.
- **Cabeçalho e abas sticky:** já existem topo fixo e barra de contexto.
- **Bloco "Atendimento ativo" numa linha:** pode compactar, **não pode remover**.

## 33. O que não deve ser alterado (C — lógica crítica)
- Regras do atendimento ativo para anamnese, conduta e HOLOSCAN.
- RPCs de salvamento e revisão, `expected_updated_at`, imutabilidade de snapshots.
- Motor HOLOSCAN, pacote HOLOS-V1 (v2/v3), hashes, faixas e cálculo do Índice e da Tríade.
- Resultado HOLOS, emissão do Resultado Final, Relatórios.
- RLS, triggers, conta pendente (liberação manual), FKs, exclusão e arquivamento.
- `Sincronizacao`/merge do histórico, `excluir-paciente.js`.
- Documentos sem interpretação de exames; nenhum diagnóstico, prescrição ou encaminhamento.
- Não criar status novos nem deltas não homologados (sparkline do Índice, comparação de notas).

## 34. Plano recomendado para redesign (em etapas, cada uma com testes e captura)
1. **Etapa 0 (opcional, separada do visual):** corrigir os bugs 1–9 da seção 30 com testes. São pequenos e baixam o risco de o redesenho "herdar" defeitos. Decisão da usuária.
2. **Etapa 1 — visual puro (A):** CSS escopado; abas; barras; segmented control; pílulas.
3. **Etapa 2 — lista:** tabela no desktop e cards no celular, mesmos dados.
4. **Etapa 3 — cabeçalho:** "Mais ações", linha do atendimento ativo, sticky.
5. **Etapa 4 — Jornada com estado real e "Etapa atual":** módulo compartilhado `jornada-paciente.js` com o Dashboard.
6. **Etapa 5 — Visão em 2 colunas** e remoção das duplicações acordadas.
7. **Fora do redesenho (recomendado registrar):** paginação acima de 1000 linhas, stash no logout, DELETE de holoscan_applications, `select("*")` dos convites. Exigem migration ou mudança de lógica e autorização própria.

## 35. Arquivos que provavelmente serão alterados depois
- `style.css` (bloco escopado novo)
- `index.html` (cabeçalho, Jornada, abas)
- `app.js` (`cardPaciente`/`renderPacientes`/`menuDoPaciente`, `abrirFicha`)
- `ficha.js` (`desenharFaixa`, `desenharVisao`, `desenharLinha`, `desenharHolo`)
- `atendimento.js` (`desenharCabecalho`)
- `jornada-paciente.js` (novo) + `dashboard.js`
- `timeline.js` (só para o bug do clique)
- `arquivos.js` (`trocarAba`, se as abas mudarem)

## 36. Testes que precisaremos atualizar
- **Fixam a estrutura atual:**
  - `testar-lista-pacientes.mjs` (cards, chips, busca, ordem, Revisão, lote)
  - `testar-ficha-abas.mjs` (ordem dos botões, faixa, texto da Jornada)
  - `testar-ficha.mjs`
  - `testar-auditoria-pacientes-atendimentos.mjs` (`fic-acoes-topo`, `pac-menu`, reativar)
  - `testar-lote06-prontuario.mjs` (`data-item`, exportar)
  - `testar-rodada08-exclusoes.mjs`
  - `testar-lote05-comportamental.mjs` (busca global, bpctx)
  - `testar-responsividade.mjs`
  - `testar-xss.mjs` (`.card-paciente`)
  - `testar-v1-etapa1.mjs`
  - `testar-ficha-relatorio.mjs`
  - `testar-rodada08-arquivado.mjs`
  - `testar-dashboard-acompanhamento.mjs` (se a regra das etapas for para um módulo comum)
- **Cerca de 40 arquivos usam `levarParaFicha`/`abrirFichaDe`:** devem continuar funcionando sem mudança se a API for mantida.
- **Testes novos sugeridos:**
  - redesenho (tabela/cards, teclado, sticky, larguras 390/768/1024/1440/1920);
  - Jornada com estado real;
  - regressão dos bugs 1–9.

---
**Status:** só documentação. Nenhuma correção ou redesenho foi feito; cada etapa da seção 34 depende de autorização própria.
