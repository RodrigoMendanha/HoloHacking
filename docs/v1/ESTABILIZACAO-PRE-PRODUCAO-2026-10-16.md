# Pacote de estabilização pré-produção — 16/10/2026

Feito apenas no ambiente local, na branch `claude/admiring-mccarthy-jke2pf`.
- **Sem deploy.**
- **Sem SQL em produção.**
- **Sem publicar Edge Function.**
- `20261027100000_mcp_chaves` **não** foi aplicada.

Todos os dados usados nos testes são fictícios.

## 1. O que mudou (por bloco de commit)

| Bloco | Conteúdo |
|---|---|
| 1/9 | Aba "Assistente de IA" escondida pela flag `ASSISTENTE_IA_VISIVEL` (padrão `false`). Código, tabelas, contratos e funções intactos. |
| 2/9 | **Retorno pelo ciclo.** É retorno quando existe Mapeamento não-rascunho, atendimento concluído, Resultado HOLOS não-rascunho ou emissão. O Mapeamento de retorno é a fonte 1. O Playbook lê os campos `*_opcoes` (facilitou, dificultou, piorou etc.). O que veio do encontro anterior aparece só como referência, sem nada pré-marcado. |
| 3/9 | **Atendimento e agenda.** A interpretação é salva junto com o HOLOSCAN. A ficha e o Dashboard se atualizam sem F5. Depois da entrega, o botão principal é "Marcar retorno". Novo "Encerrar atendimento" (status `concluido`, só quando alguém clica). Consultas com estado Agendada/Em atendimento/Realizada. Consulta futura pede confirmação. "Atendimentos hoje" conta todos. |
| 4/9 | **Resultado e Evolução.** Resultado com "nº N" por paciente (a versão só aparece na tela). Foco mantido × novo. Nova versão abre pelo Playbook, no mesmo atendimento. Nova emissão pede confirmação. Evolução em "antes × agora" sem jargão, com o Mapeamento de retorno e as decisões das estratégias. |
| 5/9 | **Telas e textos.** "Ver arquivados" sempre visível. Espírito com 3 ferramentas (a oculta não abre por atalho). PQQ renomeado para "Escada dos Porquês". Corpo/Mente/Espírito. Vírgula decimal na tela. Explicação das 81 perguntas. O Mapeamento retoma a etapa e avisa quando falta pergunta obrigatória. Ajuda do retorno. |
| 6/9 | **PDF, celular e formulários.** PDF com número de página, sem partir cartão. Radar legível. Tríade sem corte. Cabeçalhos menores no celular. A aba rola até o conteúdo. Nova consulta já vem com o paciente do contexto. Máscara de telefone. Descartar. Erro aparece junto do campo. O stash é removido depois de restaurar. O paciente sobrevive ao F5. |
| 7/9 | **Testes.** Teste novo `testes/testar-estabilizacao-1610.mjs` (A–U e regressão do histórico). Ao abrir o Playbook, os convites são conferidos de novo (resposta de retorno que chegou depois). Hashes da §3.5 de `docs/deploy.md` atualizados. |

## 2. Preservação de dados (complemento obrigatório)

- **Nada apagado nem sobrescrito.** Nenhum DROP, DELETE, UPDATE em massa ou backfill.
  - O único UPDATE novo é o do botão "Encerrar atendimento". Ele altera um único atendimento e só quando a profissional clica.
- **Nenhum recálculo silencioso** de HOLOSCAN, Índice, Tríade, prioridades, estratégias, Resultados ou aplicações antigas.
  - A vírgula decimal e os nomes novos (Corpo/Mente/Espírito, Escada dos Porquês, "nº N") são só formatação de tela. IDs, chaves, `revision_number` e conteúdo gravado não mudam.
- **Resultados e emissões finalizados continuam imutáveis.**
  - O teste confere que o `revision_number` e o hash do Resultado antigo (template 4) não mudam.
  - Confere também que nenhum Resultado histórico é recriado ou apagado.
- **Status "concluído":** nenhum atendimento antigo foi convertido (teste M).
- **Retorno:** a regra nova vale só para fluxos novos. O tipo dos convites já gravados não muda (teste D).
- **Assistente de IA:** só está escondido; nada foi apagado.
- **Ferramentas ocultas e legadas:** não foram removidas.
- **Histórico de ferramentas:** intacto (teste S).

## 3. Migrations

**Nenhuma migration é necessária para este pacote.**
- `encounters.status` é texto livre, e o UPDATE já é permitido pela RLS do dono.
- Os estados da consulta são derivados de `consultation_id`.

Continuam pendentes em produção, como na auditoria de 16/10:
- `20261016100000_administracao`: pendência intencional, decisão sua;
- `20261027100000_mcp_chaves`: **não aplicar** sem decisão.

## 4. Plano de rollback

O pacote só mexe nos arquivos estáticos do front.
- **Antes do deploy:** marcar a imagem atual como `holohacking-web-antes-<curto>`, como já faz `scripts/deploy-etapa6-5b.sh`.
- **Para voltar:** subir de novo essa imagem. O banco não muda, então o rollback não exige SQL.
- **Atendimentos encerrados com o build novo:** continuam com status `concluido`. O build antigo exibe esse valor como texto e não quebra.

## 5. Backup recomendado antes do deploy

- Backup lógico do banco: `pg_dump` do schema `public` mais o storage `patient-documents`, ou o backup diário do Supabase confirmado no painel.
- Exportar `holos_results`, `holos_result_emissions`, `encounters` e `anamnesis_invites`, para conferência depois do deploy.

## 6. Riscos residuais

1. **Stash local do logout.** Agora é removido depois de restaurar, mas sem expiração por idade. Apagar por idade poderia perder dados não sincronizados. **Decisão sua.**
2. **F5.** Restaura o paciente. A seção e a aba voltam ao padrão (dívida técnica registrada).
3. **Evolução.** Lê o Mapeamento de retorno do que já foi carregado. Uma resposta que chega com a ficha aberta aparece na próxima conferência automática (20 s) ou ao abrir o Playbook.
4. **Numeração "nº N".** É derivada na tela pela ordem do primeiro Resultado salvo de cada atendimento. Como Resultados finalizados não são apagados, o número é estável. O que fica gravado (`revision_number`, IDs) não muda.
5. **PDF.** O número de página depende do html2pdf. Com o modo de impressão do navegador, vale a regra CSS dos cartões.

## 7. Testes

**Teste novo.** `testes/testar-estabilizacao-1610.mjs` tem 51 asserções e cobre:
- A–U;
- primeira consulta → Resultado → entrega → Marcar retorno → Encerrar → retorno (Mapeamento de retorno → Playbook → Resultado nº 2);
- Evolução antes × agora;
- documentos, Espírito e interpretação;
- celular em 390 px;
- regressão de um paciente antigo (Resultado template 4 abre; `revision_number` e hash não mudam; nada recriado nem apagado).

**Suíte completa** (`npm run teste`): 174 suítes, 5.206 asserções.
- A última falha restante (o texto "Resultado para a paciente" no `testar-holoscan`) foi corrigida e conferida isoladamente: verde.
- A privacidade A/B (`testar-isolamento-resultado-ab`) está verde.

**Ajustes nos testes antigos.** Todos refletem mudanças pedidas, sem enfraquecer a regra conferida:
- vírgula decimal na tela;
- Espírito com 3 ferramentas;
- a ferramenta oculta não abre por atalho (o teste abre o cartão direto);
- textos sem jargão ("poucas respostas para dar nota", sem "cód.", sem "(aba Relatório)", "HOLOSCAN oficial" com a versão na dica);
- erro junto do campo no cadastro;
- ação principal pós-entrega;
- aviso da nova versão;
- nova emissão com confirmação;
- datas do teste novo no fuso do navegador;
- nota de fechamento de seção não conta como título órfão no PDF;
- rolar até o botão antes de clicar (o topo fixo cobre o que fica acima da aba).

**Comportamentos corrigidos durante os testes:**
- Abrir o Playbook confere de novo os convites, para pegar a resposta de retorno que chegou com a ficha aberta.
- Resultado da HOLOS AI continua abrindo o editor em "Nova versão".
- A Evolução não mostra números de aplicação de teste.
- O título não fica sozinho quando o cartão inteiro desce para a página seguinte.
- O cabeçalho do Mapeamento fica completo na 1ª etapa e só encolhe depois.
