# HoloHacking V1 — Etapa 3 — Evolução + Timeline + Relatório clínico base

# Resumo executivo

A Etapa 3 transforma a Evolução em **histórico longitudinal por atendimento**
(dois pontos escolhidos pela profissional, fontes consolidadas lado a lado, delta
só entre a mesma coisa na mesma unidade, nenhum julgamento), cria a **Timeline
clínica verdadeira** (só o que foi efetivamente registrado; data clínica ×
data de registro; revisão ligada ao original) e a **base de Relatórios
versionados** (`report_emissions`: rascunho editável → emissão imutável com
snapshot montado pelo servidor a partir de fontes escolhidas uma a uma;
correção = retificação ligada; original acessível). Fecha também a
proveniência da Etapa 2 (`source_anamnesis_id`, `origin_agreement_id`) no
servidor. Nenhuma regra metodológica foi criada: o HOLOSCAN entra sem delta,
sem Índice, sem faixa; acordos não têm adesão; nada vira "melhorou" ou
"piorou". Nada foi aplicado em produção; a cadeia 130000 → 180000 foi validada
em BEGIN/ROLLBACK no banco real (35 checagens) e nada persistiu.

# Baseline

| Item | Valor |
|---|---|
| Branch inicial | `claude/v1-etapa2-anamnese-conduta` |
| HEAD inicial | `766b12b6b3b5369394fd3c9029fb98402bbabc8a` |
| Suíte inicial | 85 suítes · 2605 asserções · 0 falhas (`scratchpad/baseline-etapa3.log`) |
| Branch de trabalho | `claude/v1-etapa3-evolucao-relatorios` |

# Arquitetura

`docs/v1/ETAPA3-ARQUITETURA-EVOLUCAO-RELATORIOS.md` (escrito antes do código):
vocabulário (evento clínico, data clínica, data de registro, fonte, revisão,
consolidado, comparação, relatório, emissão/snapshot) e a distinção
HISTÓRICO / EVOLUÇÃO / TIMELINE / RELATÓRIO / DOCUMENTO ANEXADO.

# Proveniência (fechamento da Etapa 2)

* Verificado: as FKs compostas `(id, patient_id, nutritionist_id)` já impediam
  `source_anamnesis_id` e `origin_agreement_id` de cruzar paciente ou
  profissional; o que faltava era a linhagem.
* Migration `20260930180000`: trigger `validar_proveniencia_anamnese` (fonte
  consolidada, de outro atendimento, nunca a própria linha) e
  `validar_lineage_acordo` (origem em outra conduta, nunca o próprio acordo).
  Nenhuma linha histórica reescrita. Espelhado no Supabase falso.

# Evolução (`evolucao.js`, aba "Evolução" da ficha)

* `window.Evolucao`: modos `anterior_atual`, `base_atual` (base escolhida),
  `escolha` (dois atendimentos), `datas` (duas datas). Sem dois pontos
  escolhidos não há comparação; "primeira × última aplicação" automática não
  existe mais na ficha (o bloco lado a lado da tela HOLOSCAN, Etapa 0, continua
  intacto e sem delta).
* Em cada ponto vale só o consolidado: anamnese/conduta vigente do atendimento
  (ou a última consolidada até a data), HOLOSCAN com identidade remota ligado
  ao atendimento (`_supa_encounter_id`) ou o mais recente até a data, coletas e
  ferramentas concluídas do atendimento. Rascunho e cache local ficam fora.
* Anamnese: novo / alterado / negado explicitamente / sem informação
  (desconhecido, não investigado, recusado, não aplicável) / prévio (copiado e
  não revisto) / anterior não revisto. Medidas com delta só no mesmo rótulo e
  mesma unidade (ex.: "80 kg → 78 kg, delta -2 kg"); unidades diferentes
  bloqueiam ("cm × m: sem delta"). Nunca "melhora".
* HOLOSCAN: datas, versão, cobertura bruta, interpretação profissional e id
  lado a lado, selo "comparação não homologada"; nenhum delta de nota, Índice,
  Tríada ou faixa.
* Exames: delta só no mesmo `exame_id` com unidade igual (ex.: Hemoglobina
  13 → 12,5 g/dL, delta -0,5 g/dL); mg/dL × mmol/L fica lado a lado. Nenhuma
  equivalência inventada; faixas de referência não entram.
* Ferramentas: lado a lado por ferramenta; delta só na mesma versão e chave
  numérica do `resultado`.
* Conduta: campos anterior × atual (igual/alterado) e decisão registrada;
  acordos: continuado / alterado / revisto / encerrado / novo / sem registro na
  conduta atual. Nenhum índice de adesão; "sem registro" não é "não cumpriu".
* Timeline do intervalo (sem agendamentos), seções recolhíveis, seleção de
  fontes. `Evolucao.metadados(pid)` alimenta a exportação (sem HTML, sem
  julgamento).

# Timeline (`timeline.js`)

* `window.Timeline.eventos(pid, opcoes)` é a única fonte da linha do tempo
  (Visão geral, Evolução, HOLOS AI, exportação). Eventos: atendimento
  realizado; anamnese salva / **anamnese revisada (rev. N)** ligada ao
  original; conduta salva / conduta revisada; acordo alterado; aplicação do
  HOLOSCAN (com sessão, só com `_supa_id`); coleta; ferramenta concluída;
  documento anexado; relatório emitido / retificação. Agendamento entra como
  evento administrativo (filtro próprio).
* Fora: rascunho de anamnese/conduta/relatório, prévia, cálculo local não
  sincronizado.
* Cada evento tem `quando` (data clínica, ordena) e `registrado_em` (data de
  registro). Na Visão geral a data de registro fica em `title` e
  `data-registrado-em` (consultável sem se confundir com a data clínica); na
  Evolução e na HOLOS AI aparece "registrado em".

# Relatórios (`relatorios.js`, migration `20260930180000`)

* Tabela `report_emissions`: `id, nutritionist_id, patient_id, encounter_id
  (NULL), report_type, revision_number, status (rascunho|emitido), title,
  period_start, period_end, selected_sources, professional_text,
  source_snapshot, content_snapshot, content_hash, template_version,
  issued_at, created_by, supersedes_report_id, superseded_at, operation_id,
  created_at, updated_at`. CHECK `emitido` ⇒ snapshot + hash + issued_at.
  FKs compostas para paciente, atendimento e emissão substituída. RLS por
  `nutritionist_id`; sem policy de DELETE; anon revogado; trigger
  `proteger_emissao` (depois de emitido só `superseded_at`, uma vez);
  paciente arquivado bloqueado; `operation_id` único por profissional.
* RPC `salvar_rascunho_relatorio`: cria/atualiza rascunho, idempotente por
  `operation_id`, conflito por `expected_updated_at`, recusa editar emitido.
* RPC `emitir_relatorio`: valida **cada** id selecionado no servidor (mesmo
  paciente e profissional; anamnese, conduta e ferramenta só consolidadas; id
  inexistente recusado), monta `content_snapshot` (identificação proporcional,
  profissional, período, atendimentos, anamnese por domínio, HOLOSCAN com
  `resultados_oficiais: false` e nota de metodologia, exames, ferramentas,
  conduta + acordos, documentos, interpretação profissional) e
  `source_snapshot` (ids, revisões, `updated_at`), calcula `content_hash`
  (sha256 do snapshot — hash técnico, não assinatura), carimba `issued_at`,
  `created_by`. Retificação: `supersedes_report_id` ⇒ `revision_number + 1` e
  `superseded_at` na original; original intacta.
* Tipos de conteúdo rotulados: RELATO_DO_PACIENTE, OBSERVACAO_PROFISSIONAL,
  DADO_MEDIDO, DADO_DOCUMENTAL, INDICADOR_CALCULADO, TEXTO_ASSISTIDO (lista
  vazia: nenhum texto assistido é gerado).
* Conteúdo íntimo (domínios emocional e sentido pessoal; respostas das
  ferramentas) só com `incluir_intimo: true`, nunca por padrão.
* UI (aba Relatório, acima do checklist da Rodada 08): lista de emissões e
  rascunhos; "Novo relatório" com título, período, fontes por grupo (nada
  marcado), interpretação profissional (texto da profissional), prévia rotulada
  "PRÉVIA — não emitida", "Salvar rascunho", "Emitir" (confirmação; emitido só
  aparece depois da resposta do servidor; falha ⇒ "Não foi possível emitir …
  Nada foi emitido"), "Ver" (snapshot), "Imprimir" (janela do navegador a
  partir do snapshot), "Retificar" (formulário com a seleção da original),
  "Ver emissão original". Pendência na tela: solicitação de exames com
  assinatura não implementada.

# Contextos

* Visão geral: último atendimento, última evolução disponível (só por
  atendimento), conduta vigente, retorno, último relatório **emitido** (rascunho
  nunca).
* Dashboard: "Atendimentos sem conduta salva" (Etapa 2) + "Rascunhos
  pendentes" (anamneses, condutas e relatórios em rascunho). Nenhum Índice
  médio.
* HOLOS AI (sem provider): seção "Linha do tempo consolidada (data clínica e
  data de registro)" no caso completo e na evolução; atalho novo "Relatórios
  emitidos" (snapshots; rascunho nunca; conteúdo íntimo só se estava na
  emissão). O HOLOSCAN na timeline entra sem Índice.
* Exportação: `timeline` (tipo, título, data clínica, registrado em, revisão,
  original, ref), `evolucao` (seleção, deltas comparáveis, HOLOSCAN sem delta),
  `relatorios` (status rotulado, revisão, datas, autoria, versões,
  `supersedes_report_id`, `source_snapshot`, `content_snapshot`).
* Histórico: `contarRegistros`/`temHistorico` contam `report_emissions`;
  paciente com relatório não é "sem histórico".
* Login/logout e sincronização: `Relatorios.carregar/esquecer`,
  `Evolucao.esquecer`.
* Correção de contexto: `trocarAba` passou a mostrar/esconder também os
  painéis Anamnese, Conduta e Evolução (antes os dois primeiros ficavam fora da
  lista).

# Supabase (BEGIN/ROLLBACK no banco real, PostgreSQL 17.6)

Cadeia `BEGIN → 130000 → 140000 → 150000 → 160000 → 170000 → 180000 → testes →
ROLLBACK` em uma única transação (`scratchpad/cadeia-e3.sql`): 35 checagens
`ok`, nenhuma `FALHOU` — proveniência (09a–09d, 10a–10d), fonte cruzada (01,
01b), id inexistente (12), só consolidado (08, 08b), rascunho sem snapshot e
conflito otimista (07, 07b, 07c), emissão com snapshot/hash (E1), íntimo fora
por padrão (17), HOLOSCAN sem Índice (18), tipos de conteúdo (19), idempotência
(05), imutabilidade (03, 03b, 03c), DELETE sem efeito (31), snapshot congelado
depois de revisar a fonte e renomear o paciente (11, 21), retificação (04,
04b), histórico (06), paciente arquivado (AR), RLS entre profissionais (02,
02b, 02c). Em seguida: 0 tabelas novas, 0 colunas novas, 0 funções novas, 0
triggers novos, 0 pacientes de teste, 0 constraints novas — **nada
persistiu**. Migrations **não aplicadas** em produção.

# Testes

| Item | Valor |
|---|---|
| Suíte final | 87 suítes · 2719 asserções · 0 falhas (`scratchpad/final-etapa3.log`) |
| Novas | `testar-v1-etapa3-banco.mjs` (48 asserções), `testar-v1-etapa3.mjs` (66 asserções) |
| Ajustada também | `testar-holos-ai.mjs` (5 atalhos de contexto; +1 asserção) |
| Ajustadas | `testar-storage-manifest.mjs` (42 scripts), `testar-arquivos.mjs` (aba Evolução), `testar-v1-etapa2.mjs` ("Anamnese revisada"; regex sem distinção de caixa porque o painel agora é realmente exibido) |

Nenhuma asserção removida.

# Docker

`docker build --build-arg COMMIT=$(git rev-parse HEAD) --build-arg VERSAO=0.2.0` sobre o HEAD final da branch; container em `127.0.0.1:18081`: `/` (200), `app.js`, `ficha.js`, `evolucao.js`, `relatorios.js`, `timeline.js`, `anamnese.js`, `conduta.js`, `atendimento.js`, `holos-ai.js` e `version.json` (200), `version.json.commit == HEAD`, `scripts/conferir-producao.sh` verde contra a imagem. SHA da imagem, HEAD e resultado dos checks na resposta de fechamento. Nenhum deploy executado.

# Git

| Commit | Assunto |
|---|---|
|` | `bc191fc test(v1): fixa atalho novo da HOLOS AI e regex do snapshot |
|` | `7baf75f fix(db): fecha proveniencia da etapa 2 e cria report_emissions |
|` | `beca6b9 test(v1): cobre etapa 3 |
|` | `4a76386 fix(context): integra evolucao e relatorios aos contextos |
|` | `aa16b6e feat(relatorios): cria snapshots e emissoes versionadas |
|` | `a468d73 feat(timeline): consolida eventos clinicos salvos |
|` | `855383d feat(evolucao): cria historico longitudinal por atendimento |
|` | `a2e21ab docs(v1): define evolucao timeline e relatorios |
| (este) | `docs(v1): fecha etapa 3` |

Branch `claude/v1-etapa3-evolucao-relatorios`, a partir de `766b12b6b3b5369394fd3c9029fb98402bbabc8a`. Working tree limpa no fechamento; push feito para `origin`. HEAD final na resposta de fechamento.

# Pendências (não decididas aqui)

Ver `docs/v1/DECISOES-V1.md`, "Decisões pendentes": solicitação de exames com
assinatura; envio externo; comparabilidade entre aplicações do HOLOSCAN;
equivalências entre exames; `documents.encounter_id`; Pacote Metodológico;
catálogo de 45 exames; Leitura Integrada final; 3 ferramentas; provider da
HOLOS AI; estados do paciente.

# Resultado

Etapa 3 concluída. Nenhum bloqueador. Próximo bloco recomendado: Pacote
Metodológico V1 (homologação de pesos, faixas, Índice, Tríada e regra de
comparabilidade), que destrava os deltas do HOLOSCAN na Evolução e os
resultados oficiais no relatório — sem tocar no que esta etapa congelou.
