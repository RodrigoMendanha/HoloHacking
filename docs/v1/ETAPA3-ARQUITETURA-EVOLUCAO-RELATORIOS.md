# HoloHacking V1 — Etapa 3 — Arquitetura: Evolução, Timeline e Relatórios

Escrito antes da migration. Autoridade: Documento Mestre (§8, §31, §32, §38.1) →
`DECISOES-V1.md` → Etapas 0, 1 e 2 aprovadas → código. Branch
`claude/v1-etapa3-evolucao-relatorios`, a partir de `766b12b6b3b5369394fd3c9029fb98402bbabc8a`.

## 1. Vocabulário

| Termo | O que é | O que não é |
|---|---|---|
| **Evento clínico** | um registro **consolidado** com data clínica: atendimento realizado, anamnese salva/revisada, HOLOSCAN consolidado (com id remoto), coleta salva, ferramenta concluída, conduta salva/revisada, acordo com situação alterada, documento anexado, relatório emitido. Agendamento entra como evento **administrativo**, rotulado. | rascunho, prévia, cache local não sincronizado |
| **Data clínica** | quando aconteceu (`encounters.occurred_at`, `coletado_em`, `quando`, `concluida_em`, data do documento) | — |
| **Data de registro** | quando foi gravado (`created_at`, `issued_at`) — sempre consultável ("registrado em") | substituta da data clínica |
| **Fonte** | a linha de origem (tabela + id + revisão) | uma tela |
| **Revisão** | nova linha da mesma entidade (`revision_number`, `supersedes_id`) — correção documental | novo evento clínico |
| **Consolidado** | `status ∈ {salvo, revisado}`; HOLOSCAN com `_supa_id`; ferramenta `status ≠ rascunho`; coleta no servidor; documento no servidor | `rascunho` |
| **Comparação** | duas fontes **escolhidas** lado a lado; delta numérico só com comparabilidade verificada | "primeiro × último" automático |
| **Relatório** | snapshot versionado das fontes **selecionadas** pela profissional (`report_emissions`) | a ficha impressa |
| **Emissão/snapshot** | linha `emitido`: `source_snapshot` (ids/revisões) + `content_snapshot` (conteúdo copiado **pelo servidor**) + `content_hash` técnico; imutável | documento anexado |

HISTÓRICO = tudo o que está consolidado no prontuário. EVOLUÇÃO = leitura
longitudinal desse histórico por atendimento, com comparações explícitas.
TIMELINE = o histórico ordenado por data clínica. RELATÓRIO = recorte selecionado
e congelado do histórico. DOCUMENTO ANEXADO = arquivo trazido de fora
(`documents` + Storage), inalterado nesta etapa.

## 2. Proveniência (fechamento da Etapa 2)

Já no banco: `source_anamnesis_id` e `origin_agreement_id` têm FK composta
`(id, patient_id, nutritionist_id)` → não cruzam paciente nem profissional. Esta
etapa acrescenta o que faltava server-side: trigger `validar_proveniencia_anamnese`
(a fonte não é a própria linha, é consolidada e é de **outro** atendimento) e
`validar_lineage_acordo` (o acordo de origem pertence a **outra** conduta do mesmo
paciente). Nenhuma linha histórica é reescrita.

## 3. Evolução (`evolucao.js`, aba "Evolução" da ficha)

* **Seleção explícita** de A e B: dois atendimentos do paciente (ou "linha de
  base" = primeiro atendimento com registro consolidado; "atual" = atendimento
  ativo ou o mais recente) — sempre mostrando quais fontes foram escolhidas.
  Nenhum "primeiro × último" implícito.
* Seções recolhíveis: resumo do intervalo · atendimentos · anamnese · medidas ·
  HOLOSCAN · exames · ferramentas · conduta e acordos · timeline do intervalo.
* **Anamnese**: vigente de A × vigente de B por domínio e rótulo do item: novo,
  alterado, negado explicitamente, desconhecido, recusado, não investigado,
  informação prévia ainda não revisada (`previo`). Sem interpretação.
* **Medidas**: delta só quando mesmo rótulo, mesma `unidade` e ambos os valores
  numéricos; mostra "80 kg → 78 kg (−2 kg)"; unidade diferente → lado a lado sem
  delta. Nunca "melhora"/"piora".
* **HOLOSCAN**: aplicações consolidadas (com id remoto) ligadas aos atendimentos
  escolhidos (ou do intervalo de datas): identificação, data, versão da estrutura,
  cobertura bruta, interpretação profissional — **sem** delta de nota, Índice,
  Tríada ou faixa (Pacote Metodológico não homologado; selo "em homologação").
* **Exames**: coletas em ordem cronológica; delta só com mesmo `exame_id` e mesma
  `unidade_no_momento`; sem equivalência inventada entre exames.
* **Ferramentas**: lado a lado; delta numérico só para mesma `ferramenta_id`, mesma
  `versao_ferramenta` e campos numéricos iguais em `resultado`; narrativas só
  conteúdo lado a lado.
* **Conduta/acordos**: conduta vigente de A → de B; acordos de A → situação atual
  (via `origin_agreement_id` ou mesmo acordo); decisão registrada (continuar /
  substituir / encerrar). Sem score de adesão; sem "não cumpriu".
* O bloco antigo da tela HOLOSCAN ("Aplicações lado a lado", já sem deltas)
  permanece como visualização local; a Evolução oficial é a aba.

## 4. Timeline (`timeline.js`)

`window.Timeline.eventos(pid)` é a única fonte de eventos para a Visão geral, a
Evolução, a HOLOS AI e a exportação. Cada evento: `{ tipo, titulo, detalhe, quando
(data clínica), registrado_em, revisao (bool), ref: {tabela, id}, acao }`.
Ordenação principal por data clínica; "registrado em" sempre disponível.
Só consolidado: HOLOSCAN só com `_supa_id` quando há sessão; ferramentas
`≠ rascunho`; anamnese/conduta `salvo|revisado`; coletas/documentos do servidor;
atendimentos; emissões `emitido`. Revisões aparecem como "Anamnese revisada" /
"Conduta revisada" ligadas ao registro original (`supersedes_id`), com acesso à
versão anterior.

## 5. Relatórios (`report_emissions`, `relatorios.js`)

```
report_emissions
  id, nutritionist_id, patient_id, encounter_id NULL (FK composta),
  report_type ('relatorio_clinico'), revision_number, status (rascunho|emitido),
  title, period_start, period_end,
  selected_sources JSONB   -- ids escolhidos por tipo + flags (incluir_intimo, incluir_interpretacao)
  professional_text        -- interpretação/notas da profissional (OBSERVAÇÃO PROFISSIONAL)
  source_snapshot JSONB    -- ids, revisões e updated_at das fontes no momento da emissão
  content_snapshot JSONB   -- conteúdo copiado PELO SERVIDOR, por tipo de conteúdo
  content_hash TEXT        -- sha256 do content_snapshot (técnico, não é assinatura)
  template_version INT, issued_at, created_by,
  supersedes_report_id (FK composta), superseded_at, operation_id, created_at, updated_at
```

* **Rascunho** (editável; `expected_updated_at` contra sobrescrita; nunca entra
  como emissão, timeline oficial, HOLOS AI nem conta como relatório emitido).
* **Emitido**: a RPC `emitir_relatorio` valida **cada** id selecionado (mesmo
  paciente, mesmo profissional, consolidado) e monta `source_snapshot` e
  `content_snapshot` a partir das linhas do banco — o JSON do frontend só
  escolhe; o conteúdo vem do servidor. Trigger `proteger_emissao` recusa qualquer
  UPDATE depois (só `superseded_at`). Alterar anamnese, conduta, paciente, exame
  ou ferramenta depois não muda a emissão (testado).
* **Retificação**: `emitir_relatorio` com `supersedes_report_id` cria nova
  emissão (`revision_number + 1`) e marca a original como substituída; a original
  continua recuperável.
* **Tipos de conteúdo** no snapshot: `RELATO_DO_PACIENTE`, `OBSERVACAO_PROFISSIONAL`,
  `DADO_MEDIDO`, `DADO_DOCUMENTAL`, `INDICADOR_CALCULADO` (só cobertura bruta e
  identificação da aplicação), `TEXTO_ASSISTIDO` (estrutura presente, sempre vazia).
* **Metodologia**: nenhuma nota, faixa, Índice, Tríada, Leitura Integrada, CMB,
  REC/SEL entra no snapshot; a seção HOLOSCAN traz data, versão, cobertura e a
  frase "resultados metodológicos ainda não oficiais".
* **Conteúdo íntimo** (respostas de ferramentas narrativas, campos emocionais e de
  sentido pessoal da anamnese): só com `incluir_intimo = true`, escolha explícita.
* **Impressão**: `window.print()` de uma renderização do **snapshot** (nunca da
  ficha viva). Sem PDF assinado, sem serviço pago, sem envio externo.
* **Hash**: sha256 determinístico do `content_snapshot` (texto jsonb canônico),
  rotulado "hash técnico do snapshot"; não é assinatura digital.
* Solicitação de exames: não implementada (pendência).

## 6. Integridade, idempotência, concorrência

RLS só do dono; `anon` revogado; sem DELETE; trigger de paciente arquivado;
`operation_id` único parcial (retry devolve a mesma emissão); rascunho com
controle otimista; emissão imutável. Exclusão de paciente: `contarRegistros`
passa a contar `report_emissions`.
