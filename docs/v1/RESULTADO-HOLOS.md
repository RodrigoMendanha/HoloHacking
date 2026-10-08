# Resultado HOLOS — visão integrada final do paciente

Etapa implementada localmente em 09/10/2026. **Não aplicada no banco real e sem deploy.**

## O que é
A página final que consolida, **por seleção explícita da nutricionista**:
- uma aplicação **HOLOSCAN oficial** (obrigatória);
- as ferramentas **concluídas** de Corpo, Mente e Espírito (opcionais; uma aplicação por ferramenta);
- as **observações profissionais**.

O HOLOSCAN deixa de carregar sozinho a conclusão: o Resultado HOLOS reúne o mapa, os registros das ferramentas e a leitura da nutricionista.

Esta versão **não** tem IA, exames, Leitura Integrada, interpretação automática, diagnóstico nem prescrição. Também **não** altera HOLOS-V1@2, LI-V1@2, notas, faixas, Índice, Tríade, respostas ou ferramentas.

## Onde fica
- **Ficha do paciente:** aba **Resultado HOLOS**, entre Ferramentas e Conduta.
- **Jornada clínica:** passo **CONSOLIDAR**, entre INTEGRAR (Ferramentas) e ACOMPANHAR.
- **Atalhos:** na linha de continuidade da ficha (Anamnese → HOLOSCAN → Ferramentas → Resultado HOLOS → Conduta → …) e no quadro de resultado do HOLOSCAN ("Resultado HOLOS →").
- **Histórico:** fica dentro da própria aba.

## Fluxo
1. **Gerar Resultado HOLOS** abre a seleção. Nada vem marcado.
   - **Atendimento:** o ativo já vem escolhido; se não houver, a nutricionista escolhe.
   - **HOLOSCAN:** escolha de uma aplicação. As históricas, sem pacote oficial, aparecem desabilitadas.
   - **Ferramentas:** por eixo, só as concluídas ou revisadas. Cada item mostra data, hora, código curto, status e atendimento.
   - **"Mostrar ao paciente":** uma chave por ferramenta, **desligada por padrão**.
   - **Observações:** leitura profissional, pontos para acompanhar e questões para aprofundar.
2. **Pré-visualizar:** o servidor monta o snapshot sem gravar, e a tela mostra a página marcada como "PRÉVIA".
3. **Salvar rascunho:** guarda a seleção, a visibilidade e os textos. Tudo continua editável.
4. **Salvar Resultado HOLOS:** pede confirmação e congela o resultado (snapshot + sha256).
5. **Marcar como revisado:** muda só o estado e registra quem revisou e quando (carimbo do servidor).
6. **Nova versão a partir desta:** cria um rascunho da revisão seguinte. A versão anterior fica no histórico, intacta e marcada como substituída.

## Visões
**Profissional:**
1. Identificação: paciente, data, nutricionista, atendimento, HOLOSCAN, nº de ferramentas, versão e pacote.
2. Visão geral HOLOSCAN: radar, Índice, Tríade e cobertura.
3. Os cinco sistemas, cada um com:
   - nota, faixa, cobertura e se é avaliável;
   - o texto oficial do pacote;
   - **Pontuou** e **Contexto, sem pontuar** separados, com enunciado e resposta.
4. Corpo, Mente e Espírito, com as ferramentas como foram registradas:
   - linha do tempo da rotina, fluxo dos gatilhos, rede de vínculos;
   - barras na Roda Holística e na Linha do Momentum;
   - escada no PQQ;
   - Mapa do Propósito, montado a partir do OQ³ e do PQQ selecionados.
5. Visão conjunta Corpo | Mente | Espírito: os registros lado a lado, sem conclusão.
6. Observações da nutricionista.
7. Nota: "Exames e Leitura Integrada — não incluídos nesta versão".

**Paciente:**
- Seu Mapa HOLOS: radar, sistemas com o texto oficial para o paciente, Índice e Tríade.
- Corpo, Mente e Espírito: **só as ferramentas com "Mostrar ao paciente"**. O Mapa do Propósito aparece só se o OQ³ e o PQQ estiverem visíveis.
- O que sua nutricionista observou.
- Pontos que serão acompanhados.
- Não aparecem: códigos, hash, pacote, "pontuou/contexto", cobertura técnica nem as questões para aprofundar.
- A linguagem segue "nesta avaliação" e "foi registrado".

**Impressão:** "Imprimir ou salvar em PDF" imprime só o documento aberto, na visão escolhida. Os detalhes saem abertos no papel.

## Dados (migration `20261009100000_resultado_holos.sql`)
- **Tabela `holos_results`:**
  - `status`: rascunho, salvo ou revisado;
  - versionamento: `revision_number`, `supersedes_id`, `superseded_at`;
  - seleção e textos: `holoscan_application_id`, `selected_sources`, os três textos da nutricionista;
  - snapshot: `content_snapshot`, `source_snapshot`, `content_hash`, `template_version`;
  - pacote: `methodology_package_*`;
  - controle: `operation_id`, `saved_at`, `reviewed_at`, `reviewed_by`.
- **Chaves compostas:** paciente, atendimento e versão anterior pertencem à mesma nutricionista.
- **`selected_sources`:** `{holoscan_application_id, tool_application_ids[], visao_paciente:{ferramentas:{<id>:{mostrar, ocultar:[]}}}}`. O campo `ocultar` fica reservado para ocultar itens específicos de uma ferramenta no futuro, sem mudar o modelo. Nesta versão ele é sempre `[]`.
- **Gatilhos:**
  - `updated_at`;
  - paciente arquivado;
  - `proteger_revisao_consolidada`: resultado salvo é imutável; só passa de salvo para revisado e só recebe `superseded_at` uma vez;
  - `carimbar_revisao`;
  - `proteger_identidade_resultado_holos`: paciente, profissional e versão nunca mudam; resultado salvo não é apagado.
- **RLS:** cada nutricionista só lê os próprios resultados. Não há INSERT, UPDATE nem DELETE direto: a escrita é só pelas funções.
- **Funções** (SECURITY DEFINER, `search_path` vazio, exigem `conta_ativa()`):
  - `previa_resultado_holos(payload)`;
  - `salvar_rascunho_resultado_holos(payload)`;
  - `salvar_resultado_holos(payload)`;
  - `revisar_resultado_holos(id)`;
  - `descartar_rascunho_resultado_holos(id)`.
  - Internas: `montar_resultado_holos(uid, payload)` e `resultado_holos_campos(payload)`.

## Snapshot (montado pelo servidor)
**O navegador envia só:** ids das fontes, os textos da nutricionista e as chaves de visibilidade.

**O servidor:**
1. busca as linhas reais;
2. valida:
   - paciente, atendimento, HOLOSCAN e ferramentas do mesmo paciente e da mesma nutricionista;
   - HOLOSCAN oficial, com pacote aprovado;
   - ferramentas concluídas, uma por ferramenta;
   - paciente não arquivado;
3. monta o snapshot a partir do que está **gravado** (nunca do conteúdo do payload):
   - **HOLOSCAN:** notas, faixas, Índice, Tríade e cobertura salvos, **sem recalcular**; textos oficiais do pacote; respostas que pontuaram e de contexto; interpretação registrada;
   - **ferramentas:** cópia integral, com respostas, leitura, prioridade, próximo passo e visibilidade;
   - **observações**, identificação e versão;
4. calcula `content_hash = sha256(content_snapshot::text)`.

Uma mudança posterior no OQ³ ou em qualquer ferramenta **não altera** um resultado salvo.

**Recusas (hint):** `holoscan_obrigatorio`, `holoscan_nao_oficial`, `atendimento_obrigatorio`, `referencia_cruzada`, `fonte_nao_consolidada`, `fonte_repetida`, `paciente_arquivado`, `revisao_imutavel`, `conflito`, `conta_inativa`, `payload_invalido`.

## Preparado para o futuro (nada ligado agora)
- **Relatório:** `ResultadoHolos.snapshotSalvo(id)` devolve o snapshot salvo, estruturado e versionado (`template_version`). O relatório poderá referenciar o resultado pelo id.
- **HOLOS AI:** o fluxo previsto é snapshot salvo → dados estruturados → sugestão → revisão → aprovação da nutricionista. Nesta etapa não existe nenhuma chamada externa.

## Provas
- **SQL, `supabase/tests/resultado-holos-harness.sql`:**
  - 24 verificações R00–R14 no Postgres local, com a cadeia completa de migrations e os harnesses anteriores (`scripts/validar-cadeia-local.sh`);
  - a cadeia inteira termina sem nenhuma falha.
- **Tela + servidor falso, `testes/testar-resultado-holos.mjs`:** 38 asserções.
- **Artefato:** testado em uma cópia local descartável (PRE e POS passam; a segunda execução é recusada).
- **Banco real:** as condições do PRE foram conferidas só com leitura.

## Aplicação real (quando autorizada)
1. Conferir o SHA-256 de `supabase/RESULTADO-HOLOS.sql`, informado no relatório da etapa.
2. Colar o arquivo **inteiro** no SQL Editor e rodar. É uma transação:
   - o PRE confere que a migration 20261008100000 está registrada e que as funções e colunas necessárias existem;
   - o POS confere 1 política, 5 gatilhos, 8 funções e os privilégios;
   - se algo falhar, nada é aplicado.
3. Conferir a tabela final: `holos_results` existe, RLS ligada, 5 gatilhos, 0 resultados, migration registrada.
4. Fazer o deploy do front pela VPS, com o roteiro apontando para o commit desta etapa.
5. Teste real: gerar um resultado de um paciente de teste, salvar, abrir as duas visões, imprimir e criar uma nova versão.
