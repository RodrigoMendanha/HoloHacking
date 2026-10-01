# ETAPA 0 — RECONCILIAÇÃO DA RODADA 08 COM O DOCUMENTO MESTRE — RELATÓRIO FINAL

# Resumo executivo

A branch da Rodada 08 virou a fundação V1 reconciliada com o Documento Mestre
(`HOLOHACKING-V1-ESPECIFICACAO-MESTRE.pdf`, v1.0, 30/09/2026). As correções técnicas da
Rodada 08 foram preservadas. O que contrariava o Mestre foi ajustado ou desativado: o corte
de cobertura de 50%, a identidade da coleta por (paciente + data), o retorno universal de 28
dias, os indicadores agregados do dashboard, os deltas da Evolução e o contexto da HOLOS AI
(que passou a conter só dado bruto consolidado e texto da profissional — nenhuma nota, faixa,
Índice, Tríada, prioridade, combinação, Leitura Integrada ou sugestão, nem rotulada). Toda saída que depende de parâmetro metodológico passou a
carregar o selo "Em homologação" por uma fronteira única (`metodologia.js`). Nenhuma regra
nova foi inventada, nenhum peso, faixa ou pergunta foi alterado, nenhuma migration foi
aplicada, nada foi deployado nem mergeado.

# Baseline real

- Branch inicial: `claude/rodada08-integridade-v1` (local) = `origin/claude/admiring-mccarthy-jke2pf`.
- HEAD inicial: `449f6f2`. `origin/main`: `6bf10f5` (produção conhecida). Working tree limpo.
- Diferença 6bf10f5..449f6f2: 16 commits, 74 arquivos.
- Migrations no repositório: 19. Aplicadas no Supabase (`list_migrations`): 16, até
  `20260929192605_fix_rpc_record_value`. As três da Rodada 08 (`20260930130000`,
  `20260930140000`, `20260930150000`) **não estão aplicadas**.
- Suíte canônica em 449f6f2 (`node testes/rodar.mjs`): **80 suítes, 2392 asserções, 0 falhas**.
  (A primeira execução registrou 4 asserções reprovadas em `testar-conferir-producao`, causadas
  por um arquivo novo meu — `metodologia.js` — criado no diretório enquanto a suíte rodava; a
  suíte foi rodada de novo com o arquivo fora do diretório e passou. Nenhuma falha pertence a
  449f6f2.)

# Documento Mestre × Rodada 08

A matriz completa, item a item, está em `docs/v1/ETAPA0-RECONCILIACAO.md` (31 itens + 3
migrations). Decisões aprovadas e pendentes em `docs/v1/DECISOES-V1.md`.

# Mantido

Ausência ≠ 10 (`HoloAusencia.normalizar`); resposta 0 ≠ ausência (motor); reaplicação vazia
(`respostas_aplicadas`); troca de paciente limpa estado; nova coleta vazia; editar ≠ criar;
"salvo" só após o servidor; abrir ferramenta não cria rascunho; guarda de edição não salva;
"Apagar tudo" fora; "Backup completo" fora com conta; modais, editar paciente, navegação
Pacientes, agenda técnica, concorrência, logout limpa DOM, exportação do servidor, version.json,
build, responsividade, requisições, erros humanos; bloqueio de paciente arquivado (front +
migration 150000); migration 130000 (NULL para ausência); CMB ocultas; REC/SEL desativados;
HOLOS AI sem provedor.

# Ajustado

| Item | Antes (Rodada 08) | Agora (Etapa 0) | Arquivos |
|---|---|---|---|
| Corte de cobertura | `COBERTURA_MINIMA = 0.5` → "dados insuficientes"; sistema parcial não disputava "crítico" | Corte removido; `suficiente()` = tem nota; `Metodologia.coberturaMinima()` = null; cobertura bruta continua exibida | utils.js, metodologia.js |
| Fronteira de saída oficial | não existia | `window.Metodologia` (status `em_homologacao`, `saidaOficialPermitida()` sempre false sem pacote, `selo()`/`avisoHtml()`) | metodologia.js, index.html, style.css |
| Selo "Em homologação" | — | Mapa de prioridades, Índice, Tríade, ficha (Mapa HOLOS), relatório (A e B), Leitura Integrada (seção e aba), tela Consultas, Evolução, contexto HOLOS AI | app.js, ficha.js, arquivos.js, consultas.js, evolucao.js, holos-ai.js |
| Identidade da coleta | "Nova coleta" recusada se já havia coleta na data (front + RPC) | ID gerado no cliente; nova = id novo; editar = id escolhido; gravação direta por id (sem RPC); RPC da migration reescrita (id → editar, sem id → inserir) | sincronizacao.js, arquivos.js, migration 140000, supabase-falso.mjs |
| Consolidação da coleta | — | Se os resultados falham depois de a coleta ser criada nesta chamada, a coleta vazia é desfeita; registro local fica pendente com o mesmo id | sincronizacao.js |
| Dashboard | "Índice HOLOS médio", "terreno da carteira", "reavaliações vencidas"; "com HOLOSCAN" contava mapas não salvos | Só "pacientes" e "com HOLOSCAN" (consolidadas); bloco "em homologação" no lugar do terreno | panorama.js, dashboard.js |
| Evolução | primeira × última com "+N", "subiu/caiu", deltas | Lado a lado, sem delta, sem ganho; selo "comparabilidade não verificada"; lista de todas as aplicações | evolucao.js |
| Tela Consultas | variação do Índice "+N" | selo em vez de variação | consultas.js |
| HOLOS AI | contexto com notas, faixas, Índice, Tríada, dominantes, CMB, Leitura Integrada, faixa ideal dos exames, mapas não salvos, exames locais com conta | **Ajuste final (revisão humana):** só dado bruto consolidado e texto autoral — cadastro; data e cobertura bruta das aplicações aceitas pelo servidor; interpretação profissional; exames com valor/unidade/laboratório/data (sem faixa ideal); consultas; respostas e leitura profissional das ferramentas. Nenhum conteúdo dependente de metodologia não aprovada entra, nem rotulado "em homologação" (Mestre §36.1) | holos-ai.js |

# Desativado

| Item | Como | Arquivos |
|---|---|---|
| Retorno universal de 28 dias | sem alerta "reavaliação vencida", sem data derivada na agenda, sem camada "Retornos sugeridos", `Panorama.DIAS_REAVALIACAO = null`; nenhum número substituto | panorama.js, dashboard.js, agenda.js |
| Alerta de divergência relato × exame | retirado das pendências (regra em homologação); a leitura continua na própria tela, com selo | panorama.js |
| Réguas manuais dos 5 sistemas (LEGADO / EM REVISÃO) | escondidas por padrão; visíveis só com `?homologacao=1`; Salvar recusa sem mapa do questionário; código preservado; nunca sincronizam | app.js |
| Recusa de data futura de coleta | removida do front e da migration; trigger separado em `supabase/migrations-pendentes/` | arquivos.js, migration 140000 |

# Pendente de homologação

Notas e faixas dos 5 sistemas (bancos em rascunho); Índice (peso 0,20 ≠ peso oficial); Tríada
(política por ID; SNT-101/SNT-501 intocados); Leitura Integrada (regra nota ≤ 3 × 1 exame
fora); regra de data futura de coleta; conteúdo mínimo para "Concluir" uma ferramenta
(`exige_resposta` mantido como guarda técnica); 10 ferramentas; Agenda × Atendimento;
Anamnese; Conduta; 4 estados do paciente; HOLOS AI no lançamento; política de parcialidade;
pesos; faixas; regras de sugestão. Lista completa em `DECISOES-V1.md`.

# Migrations revisadas

| Migration | Coerente? | Natureza | Decisão não homologada? | Aplicável antes do Pacote? | Mudou nesta etapa? |
|---|---|---|---|---|---|
| 20260930130000 | sim (§15, §34.2) | técnica | não (sem corte de 50%) | sim | não |
| 20260930140000 | agora sim | técnica | não (a de data futura saiu) | sim | **sim**: RPC por id, sem upsert/recusa por data; trigger de data futura movido para `supabase/migrations-pendentes/PENDENTE_lab_collections_data_nao_futura.sql` |
| 20260930150000 | sim (§33) | técnica | não | sim | não |

Nenhuma aplicada. Ordem sugerida continua 130000 → 140000 → 150000 (decisão humana).

# Cobertura e parcialidade

Cobertura bruta = respondidos ÷ 84, calculada e exibida (tela, ficha, relatório, contexto).
Nenhum mínimo presumido. Aplicação parcial guarda respostas, estados e cobertura; o motor
continua calculando internamente (denominador por respondidos) para o ambiente de
homologação, e tudo o que ele devolve aparece com o selo. Não há "Índice parcial" nem "Tríada
parcial" oficiais.

# Conteúdo metodológico

100% dos bancos continua em `rascunho`; nenhum status foi trocado; nenhum peso, pergunta,
inversão ou faixa alterada; SNT-101 e SNT-501 continuam com duas linhas e pesos 2/3 (teste
cobre). A barreira é `window.Metodologia`; não é o Pacote Metodológico.

# Índice e Tríada

Matemática intocada. Índice com peso 0,20 ≠ peso oficial V1 (registrado). Tríada mantém
"sem dado ≠ 10". Ambos com selo. Não oficializados.

# Laboratório

Identidade = id. Duas coletas na mesma data persistem (testado no falso e no banco real em
ROLLBACK). Editar por id não toca outra coleta. Nova coleta vazia. Data futura: sem regra
(pendente). A RPC `salvar_coleta_exames` em produção continua a versão antiga (upsert por
data) até alguém aplicar a 140000 reescrita; o app não a chama mais.

# Leitura Integrada

Não reconstruída. Regra atual classificada EM HOMOLOGAÇÃO: selo na seção, na aba da ficha,
no relatório e no contexto; alerta de divergência retirado do dashboard/ficha.

# Ferramentas

Sem mudança de conteúdo. `exige_resposta` (Mapa de Crenças) e a recusa de OQ3/PQQ vazios
ficam como guarda técnica de aplicação vazia, classificadas pendentes de decisão sobre
conteúdo mínimo. Catálogo manual continua acessível; nenhuma sugestão automática.

# Dashboard

Ver "Ajustado". Rascunho/prévia não conta: `Panorama.consolidada(p)` = `_supa_id` com sessão
(sem sessão, modo local de desenvolvimento, a caixa local é a persistência).

# Evolução

Lado a lado, sem melhora/piora. Histórico preservado, nada reescrito.

# HOLOS AI

Indisponível ("Em desenvolvimento"); nenhum provedor. Contexto assistivo (ajuste final
após revisão humana): o Mestre §36.1 exige "somente registros salvos autorizados e conteúdos
aprovados". Enquanto o Pacote Metodológico não existe, o contexto **não contém** notas dos
cinco sistemas, faixas, Índice HOLOS, Tríada numérica, prioridades, sinais dominantes,
combinações CMB, Leitura Integrada determinística, recomendações REC/SEL nem a "faixa ideal"
de exames.csv — rotular como "em homologação" não bastava. Contém só dado bruto consolidado
(cadastro; data e cobertura bruta "N de 84" das aplicações aceitas pelo servidor; exames com
valor, unidade, laboratório e data da coleta salva; consultas; respostas das ferramentas) e
texto de autoria humana (interpretação profissional, leitura profissional das ferramentas).
Mapa gerado e não salvo continua fora. O cabeçalho do contexto diz o que ficou de fora e por
quê. `ai_threads`/`ai_messages` intocadas.

# Backup

"Apagar tudo" continua fora. "Backup completo" continua fora com conta. Decisão de produto
registrada: backup completo fora do escopo obrigatório da V1 (override de §39.2/§41.3).
Utilitários internos (validar/restaurar/importar) preservados para migração e recuperação
técnica; só não expostos como promessa.

# Legados

Preservados sem uso na jornada normal: réguas manuais (só `?homologacao=1`), CMB (calculadas e
gravadas, ocultas, fora do contexto), REC/SEL, `mensagens.csv`, chakras/territórios, RPC
`salvar_holoscope_completo`, chave `holoscope`.

# Testes

Nova suíte `testes/testar-v1-etapa0.mjs` com as 21 provas da Fase 28 (44 asserções).
Suítes ajustadas ao contrato novo (sem reduzir cobertura): rodada08-holoscan, rodada08-exames,
dashboard, evolucao, ficha, ficha-abas, atendimento, calendario, calendario-datas,
release01-falhas-remotas, holos-ai, historico-legado, triada, frequencias, storage-manifest.
`docs/deploy.md §3.5` regenerado com os 39 arquivos servidos.

Resultado final da suíte completa (após o ajuste final do contexto): **81 suítes, 2440 asserções, 0 falhas**
(baseline: 80 / 2392 / 0).

# Supabase

Somente leitura, exceto a validação da migration 140000 reescrita em `BEGIN … ROLLBACK`
(papel `authenticated` com claims da nutricionista dona do primeiro paciente): duas coletas
na mesma data com ids distintos; editar por id troca só a editada; id inexistente recusado;
data futura aceita; nenhum trigger de data futura. Conferido depois: a função em produção
continua a versão antiga, 0 linhas sobraram, 0 triggers novos. Nenhuma migration aplicada,
nenhum dado alterado, nenhuma credencial impressa.

# Docker

Build preliminar no HEAD `d8d5ef1` (`docker build --build-arg COMMIT=$(git rev-parse HEAD)`):
imagem gerada; container local servindo `/`, `app.js`, `holoscan.js`, `arquivos.js`,
`ferramentas.js`, `agenda.js`, `holos-ai.js`, `metodologia.js` e `version.json` com 200;
sha256 de `app.js`, `holoscan.js` e `metodologia.js` iguais aos do repositório;
`scripts/conferir-producao.sh http://127.0.0.1:18080` → "OK: 39 de 39";
`version.json.commit` = `d8d5ef1224d393fc8109bfceca13d3076cc49797` = HEAD daquele build.
O build final é refeito sobre o HEAD final da etapa (este documento entra num commit
posterior ao do código) e o resultado — `version.json.commit` igual a `git rev-parse HEAD` —
é registrado na resposta de entrega. Nenhuma imagem foi publicada; nenhum deploy.

# Riscos restantes

1. Enquanto a 140000 reescrita não for aplicada, qualquer outro cliente que chame a RPC
   antiga continua fazendo upsert por data. O app desta branch não a chama.
2. Produção (`main` 6bf10f5) continua com o comportamento anterior a esta branch e à
   Rodada 08 (ausência = 10 gravado, "faixa alto", rascunho pré-preenchido na reaplicação).
3. Em modo local (localhost, sem sessão) mapas gerados contam como consolidados — é o modo de
   desenvolvimento, não a V1.
4. Na tela, o selo "em homologação" é informativo; nada impede a nutricionista de ler os
   números. O bloqueio real de saída oficial depende do Pacote Metodológico. (No contexto da
   HOLOS AI esses números já não entram.)
5. `exige_resposta` e a recusa de OQ3/PQQ vazios continuam ativos como guarda técnica
   pendente de decisão.

# Decisões pendentes

Ver `docs/v1/DECISOES-V1.md`, seção "Decisões pendentes".

# Prontidão para Etapa 1

A fundação está reconciliada: nenhuma regra não homologada dirige a V1, nenhum parâmetro foi
inventado, e as correções técnicas da Rodada 08 seguem valendo. Bloqueadores para a Etapa 1
(Fundação de Dados): decisões humanas sobre Agenda × Atendimento, Anamnese, Conduta, os quatro
estados do paciente e o catálogo das 10 ferramentas — e a aplicação (humana) das migrations
130000 → 140000 (reescrita) → 150000 quando o deploy desta branch for decidido.
