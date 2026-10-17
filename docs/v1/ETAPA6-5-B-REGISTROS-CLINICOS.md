# HOLOHACKING V1 — ETAPA 6.5 (B) — TRÊS REGISTROS CLÍNICOS ESTRUTURADOS

**Estado:** implementado e provado localmente, junto com a correção P0 (`ETAPA6-5-CORRECAO-P0-HOLOSCAN-OFICIAL.md`). **Não aplicado no banco real e sem deploy.**

## 1. O que entra

| Módulo | Nº | Ferramenta | ID | Papel na lógica do módulo |
|---|---|---|---|---|
| Corpo | 03 | **Mapa da Rotina** | `mapa_rotina_v1` | realidade (OQ³ = direção, Momentum = capacidade) |
| Mente | 03 | **Gatilhos & Respostas** | `gatilhos_respostas_v1` | comportamento observado (PQQ = significado, Crenças = interpretação) |
| Espírito | 04 | **Conexão & Pertencimento** | `conexao_pertencimento_v1` | pertencimento e conexão (Propósito, Roda e Carta já cobrem sentido e futuro) |

A tela mostra só o nome clínico; o sufixo `_v1` nunca aparece. `versao_ferramenta` dos registros novos é `1`, e o servidor exige isso.

**Natureza.** São REGISTROS CLÍNICOS ESTRUTURADOS. O sistema organiza e apresenta o que foi registrado e não infere nada.
- Não há score, faixa, diagnóstico, classificação, interpretação nem recomendação automática.
- `resultado` é sempre nulo, e o servidor exige isso.
- Não há efeito em HOLOSCAN, nos 5 sistemas, no Índice, na Tríada, nas faixas, nas combinações, na Leitura Integrada ou nos exames.
- `Panorama.contexto()` e o HOLOS AI não leem estes registros.
- O uso futuro em outra metodologia fica possível, porque o dado é estruturado e validado, mas está **desligado**.

## 2. Arquitetura e modelo de dados

**Tabela.** Reutiliza `public.tool_applications`, sem tabela nova. Motivos:
- é o mesmo ciclo das outras 6 ferramentas (rascunho → concluída → revisada);
- já tem RLS por `nutritionist_id`, FK paciente + nutricionista, bloqueio de paciente arquivado, vínculo com o atendimento (`encounter_id`) e identidade imutável;
- já tem sincronização, relatórios e exportação;
- o dado não é consultado de forma relacional.

**Formato.** O risco de um jsonb "genérico ruim" foi resolvido no servidor (migration `20261005110000`): o trigger `validar_registro_clinico` aceita só as chaves, os tipos, os tamanhos e as opções do catálogo. O formato é lido da própria migration pelo servidor falso e pelos testes, que o comparam campo a campo com `ferramentas.js`.

**Mapa da Rotina** (`respostas`):
- campos:
  - `acorda` e `dorme` (hora HH:MM);
  - `sono`, `trabalho`, `deslocamentos`, `familia`, `domesticas`, `estudos`, `compromissos`, `dificuldade`, `disponiveis`, `espacos` e `observacoes` (texto até 8000);
- `eventos` (até 100 itens), cada um com:
  - `inicio` e `fim` (hora);
  - `categoria` (sono/refeição/trabalho/deslocamento/exercício/pausa/estudo/cuidado familiar/compromisso/fome/energia/estresse/outro);
  - `titulo`, `descricao` e `observacao` (texto até 1000);
  - `percepcao` (baixa/média/alta, rotulada "percepção do paciente — não é escore clínico");
  - `dias` (subconjunto de seg…dom, sem repetição).

**Gatilhos & Respostas.** Um **episódio por aplicação**:
- `data` (data válida) e `horario`;
- `contexto`, `gatilho`, `pensamento`, `emocao`;
- `intensidade` (inteiro 0–10, percepção do paciente, opcional);
- `resposta`, `consequencia_imediata`, `consequencia_posterior`, `necessidade`, `observacao_nutri`;
- `alternativa`, opcional, escrita por quem atende ou pelo paciente; nunca é sugerida pelo sistema.

**Conexão & Pertencimento:**
- campos:
  - `contar`, `apoia_mudanca`, `dificulta_mudanca`, `pertence`, `sozinha`, `fortalecem`, `dificultam`, `referencias`, `espacos_seguros`, `percepcao_apoio`, `conexao_consigo` e `observacoes`;
  - grupo opcional *"Espiritualidade — opcional, só se fizer sentido para a pessoa"*: `espiritualidade`, `comunidade_religiosa`, `pratica_espiritual`, `algo_maior`;
- `vinculos` (até 100), cada um com:
  - `rotulo`, `relacao`, `contexto` (data ou contexto) e `observacao`;
  - `natureza`: pessoa/grupo/ambiente/comunidade/outro;
  - `tipo`: família/amizade/parceiro(a)/trabalho/comunidade/outro;
  - `papel`: apoia/dificulta/neutro/variável;
  - `proximidade`: próxima/intermediária/distante;
  - `momento`: presente / não presente no momento.

Todos os atributos são **descritivos e escolhidos por quem registra**. Não existe "tóxica", "saudável", "rede forte/fraca", "isolamento" nem "dependência" (o servidor recusa).

**Comum às três:** `origem_id` (opcional) é o uuid da aplicação da mesma ferramenta e do mesmo paciente de onde a cópia saiu.

## 3. Histórico

- **Concluída ou revisada é imutável.** O trigger `registro_clinico_concluido_imutavel` recusa mudar `respostas`, `resultado`, `concluida_em` e `encounter_id`, e recusa voltar a rascunho.
- **A leitura profissional continua.** Leitura, prioridade e próximo passo podem ser registrados, e a aplicação passa a "revisada".
- **Corrigir ou atualizar** é feito por:
  - **"Nova a partir desta"**: copia o registro para um rascunho novo com `origem_id`; nada é gravado até salvar e a original continua igual;
  - **"Nova aplicação"**: começa em branco.
- **O rascunho continua editável.**
- **Lista "Aplicações anteriores"**: mostra data e estado, com uma prévia (gatilho do episódio, nº de eventos, nº de vínculos).

## 4. Interface

- **Cards e contadores.** Um card em cada galeria: Corpo 3, Mente 3, Espírito 4.
- **Formulário.** O formulário genérico ganhou o tipo de campo `dias`: botões que ligam e desligam, com `aria-pressed`, em `role=group`.
- **Visualização** (`ferramentas-registro.js`, tudo escapado, inclusive o SVG):
  - **Linha do dia:** acorda → eventos por horário → dorme, com alternância **Dia / Semana**; na semana, uma coluna por dia e uma coluna "Sem dia definido".
  - **Fluxo:** Gatilho → Pensamento → Emoção → Resposta → Consequência, horizontal no desktop e em cartões empilhados no celular. A intensidade aparece como "percepção do paciente" e a alternativa como "não é sugestão do sistema".
  - **Rede:** paciente no centro e vínculos ao redor.
    - A distância segue a proximidade registrada.
    - O traço da linha segue o papel, e não só a cor.
    - O vínculo "não presente no momento" fica esmaecido.
    - Legenda: "como foram registrados — não é classificação".
    - Uma tabela com os mesmos dados serve de alternativa acessível.
- **Rascunho.** A visualização acompanha o preenchimento.
- **Concluído.** Mostra a visualização e o resumo das respostas, sem nenhum campo editável.

## 5. Segurança

- **RLS.** As policies de `tool_applications` ficaram como estavam: só a própria nutricionista; anon sem acesso.
- **Paciente.** A FK (paciente, nutricionista) impede registrar em paciente alheio, e o paciente arquivado é barrado pelo trigger existente.
- **Funções.** As funções novas não são `SECURITY DEFINER`; as de formato não têm EXECUTE para anon.
- **Texto.** É guardado literalmente e escapado na tela; nenhum valor do registro vira classe, estilo ou URL.

## 6. Provas locais

- **Cadeia** (`scripts/validar-cadeia-local.sh`): F01–F16, com:
  - aceitação;
  - cada recusa de formato;
  - limites;
  - XSS guardado como texto;
  - imutabilidade;
  - leitura profissional;
  - origem;
  - rascunho editável;
  - arquivado;
  - outra conta;
  - anon;
  - não interferência (outras ferramentas, HOLOSCAN, pacotes, LI identicos);
  - OQ³ sem regra nova.
- **`testes/testar-v1-registros-clinicos.mjs`** (sem navegador):
  - catálogo = servidor;
  - natureza;
  - espiritualidade inclusiva;
  - servidor falso;
  - escapamento das 3 visualizações;
  - ausência de classificação;
  - não interferência estática.
- **`testes/testar-v1-registros-clinicos-ui.mjs`** (navegador): o fluxo real das 3 ferramentas, mais:
  - troca de paciente, arquivado, recarregar;
  - outro dispositivo, sair/entrar, outra conta;
  - celular (390 px), acessibilidade, console e rede;
  - **não interferência:** com as mesmas 84 respostas, o resultado oficial do HOLOSCAN (Índice, notas, faixas, Tríada, pacote, hash) e a Leitura Integrada são idênticos antes e depois dos registros, e aplicações, scores, respostas, exames, pacotes e leituras ficam intocados.
- **Artefato único** (`scripts/testar-aplicacao-holoscan-oficial-local.sh`): T0–T7, com T7 para os registros depois da aplicação.

## 7. Testes legados ajustados (mudança de contrato documentada no próprio arquivo)

- `testar-ferramentas-ativas` (4 → 7 ativas de catálogo, 23 → 20 legadas recusadas);
- `testar-app` (7 cards);
- `testar-ficha` ("1 de 10 aplicadas");
- `testar-corpo` (8 com síntese; o teste da síntese antiga da rotina é pulado com o motivo);
- `testar-storage-manifest` (53 scripts).

## 8. IDs antigos congelados (compatibilidade com as versões desativadas)

**Achado.** Na primeira versão desta etapa, os registros novos reutilizavam os IDs `mapa_rotina`, `gatilhos_respostas` e `conexao_pertencimento`. Esses IDs já existiam no catálogo com **outro formato**, inativos desde a revisão de Corpo/Mente/Espírito:
- `mapa_rotina`: `eventos[]` com `tipo/onde/fome/energia/estresse`, mais `barreira` e `comecar`;
- `gatilhos_respostas`: `gatilho1..3`, `resposta1..3`, `escolha1..3`;
- `conexao_pertencimento`: `sustentam`, `drenam`, `pertence`, `sozinho`.

Um payload antigo **parcial**, cujas chaves coincidiam com as novas (`{pertence}`, `eventos[{inicio, titulo, observacao}]`), era aceito como registro novo. E a caixa antiga `holohacking.ferramentas`, com sessão ativa, subia como registro novo.

**Decisão (responsável, 06/10).** Usar IDs novos (`*_v1`). Os IDs antigos ficam **congelados no schema antigo**:
- **Catálogo:** entradas `legado: true`, idênticas às de `69dfaf7`; fora de `FERRAMENTAS_ATIVAS`, sem card; `abrirFerramentaPorId` recusa.
- **Servidor:** proibidos pela constraint `tool_applications_ferramenta_valida`, com payload completo ou parcial.
- **Navegador:**
  - `migracao-supa.js` só sobe os IDs novos;
  - a caixa antiga é recusada no servidor pelo ID;
  - o histórico das ferramentas novas nunca mostra aplicação de ID antigo;
  - no modo local, a aplicação antiga continua só como legado local, com o ID antigo.
- **Nenhuma conversão** de ID antigo para ID novo, nem no código nem nos dados.

**Banco real (só leitura, 06/10):** 0 registros nos 3 IDs antigos e nos 3 novos.

**Teste permanente:** `testes/testar-v1-registros-legado.mjs`, com 8 provas: payload completo, payload parcial, caixa antiga, histórico, sincronização, sobrescrita, modo local, conversão. Na cadeia local: F17 (IDs antigos recusados) e F18 (`versao_ferramenta = 1`).

**Risco conhecido (anterior a esta etapa, inalterado):** com sessão ativa, `Aplicacoes.migrar()` tenta subir a caixa antiga; o servidor recusa o ID antigo e a caixa é removida do navegador. É o mesmo comportamento de `d4c2da4` para esses IDs, que a constraint nunca aceitou.

## 9. Exclusão de aplicações (risco registrado, fora da 6.5)

- **Regra atual.** A policy `tool_applications_delete_proprios`, da Fase 2D, deixa a própria nutricionista apagar qualquer aplicação de ferramenta, inclusive concluída ou revisada, nas 9 ferramentas.
- **Na tela.** Nenhuma tela chama exclusão: `Aplicacoes.apagar` não tem chamador. Só uma chamada direta à API apagaria.
- **Referências que ficariam soltas** (não há FK):
  - `conducts.references.tool_application_ids`, conferido só na gravação;
  - fontes dos snapshots de relatório (id e `updated_at`).
- **Documento Mestre**, pelas citações de `ETAPA0-RECONCILIACAO.md`: §33 "Arquivar… não equivale a apagar"; §40.2 "V1 não implementa exclusão automática".
- **Na Etapa 6.5:** a regra de DELETE **não foi alterada**, nenhum botão de exclusão foi criado e a capacidade de apagar não foi ampliada.
- **Etapa própria, depois:** aplicação concluída ou revisada não é excluída; possível estado "anulada", com motivo e histórico.
