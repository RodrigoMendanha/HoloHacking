# HoloHacking V1 — Etapa 2 — Arquitetura: Anamnese estruturada e Conduta

Escrito antes da migration. Autoridade: Documento Mestre (§7–9, §30, §38.1) →
`DECISOES-V1.md` → relatórios das Etapas 0 e 1 → código.

Branch `claude/v1-etapa2-anamnese-conduta`, a partir de
`bef728ae951804edb668ce11765b5d9aa3a0c0f0` (Etapa 1 aprovada).

## 1. Posição no modelo

```
patients ──< encounters (atendimento clínico, Etapa 1)
                 ├──< anamneses      (uma por atendimento, em revisões)
                 └──< conducts       (uma por atendimento, em revisões)
                          └──< agreements (acordos de cada revisão da conduta)
```

* **encounter é o contexto clínico central.** Anamnese e Conduta têm
  `encounter_id NOT NULL` e FK composta `(encounter_id, patient_id,
  nutritionist_id) → encounters(id, patient_id, nutritionist_id)`: um registro do
  paciente A nunca aponta para atendimento do paciente B nem de outro profissional.
* Acordo tem FK composta `(conduct_id, patient_id, nutritionist_id) →
  conducts(id, patient_id, nutritionist_id)`.
* Nenhuma das três tabelas tem policy de DELETE. Histórico não se apaga.

## 2. Identidade, versão e revisão

Cada **revisão** é uma linha. `(encounter_id, revision_number)` é único.

| Estado (Mestre §38.1) | Significado | O que pode mudar |
|---|---|---|
| `rascunho` | trabalho em construção, retomável, fora dos indicadores | tudo (UPDATE na mesma linha) |
| `salvo` | aceito pelo servidor, com identidade e revisão | só `status → revisado` + `reviewed_at/by`, e `superseded_at` |
| `revisado` | salvo + conferência profissional identificada | só `superseded_at` |

Corrigir uma anamnese/conduta `salva`/`revisada` **não** altera a linha: a RPC cria
uma linha nova com `revision_number + 1` e `supersedes_id` apontando para a
anterior; a anterior recebe `superseded_at` e fica intacta (autoria e datas
preservadas). O trigger `proteger_revisao_consolidada` recusa qualquer outro
UPDATE em linha consolidada. "Revisado" não é homologação metodológica.

A **vigente** de um atendimento é a revisão com maior `revision_number` cujo
status é `salvo` ou `revisado`. Rascunho nunca é vigente, nunca entra em
dashboard, timeline consolidada, HOLOS AI nem exportação oficial (vai rotulado).

Autoria: `nutritionist_id` (dono/RLS), `reviewed_by` (quem conferiu; `auth.uid()`).
Datas: `created_at`/`updated_at` são de registro; `encounters.occurred_at` é a data
clínica (a anamnese e a conduta herdam a do atendimento). `reviewed_at` é a data
da conferência.

## 3. Anamnese — conteúdo

`anamneses.content JSONB` versionado (`content_version = 1`), validado no
servidor por `validar_conteudo_anamnese(jsonb)` (CHECK). Estrutura:

```
{ "dominios": {
    "<dominio>": { "itens": [
       { "campo": "texto livre curto (rótulo)",
         "estado": informado|negado_explicitamente|desconhecido|nao_investigado|nao_aplicavel|recusado,
         "origem": relato_paciente|observacao_profissional|documento_externo|dado_medido,
         "valor": texto|null,
         "medida": { "valor": numero, "unidade": texto, "data": AAAA-MM-DD, "metodo": texto, "responsavel": texto } | null,
         "previo": true|false,                 -- copiado de anamnese anterior, a revisar
         "fonte_anamnese_id": uuid|null
       } ] } } }
```

Domínios (Mestre §9): `motivo_objetivo`, `historia_alimentar`, `rotina_acesso`,
`sono`, `atividade_fisica`, `sintomas_relatados`, `condicoes_diagnosticos_informados`,
`medicamentos`, `suplementos`, `alergias_informadas`, `intolerancias_informadas`,
`antecedentes`, `contexto_familiar`, `contexto_social`, `avaliacoes`, `medidas`,
`emocional` (opcional), `sentido_pessoal` (opcional). Não há questionário fechado:
a profissional adiciona itens (rótulo + valor) a cada domínio.

Regras: `estado` e `origem` são obrigatórios em cada item (o CHECK recusa valores
fora da lista); **item ausente ou `valor` vazio não é "negado"** — só
`negado_explicitamente` é negação; nenhum valor padrão para peso, altura, alergia,
intolerância, diagnóstico ou condição; `medida` exige `unidade` quando há `valor`
(sem unidade padrão, sem conversão); diagnóstico/condição em
`condicoes_diagnosticos_informados` com `origem = relato_paciente` continua
"informado" (a tela rotula; o servidor não promove a confirmado).

## 4. Cópia explícita da anamnese anterior

`criar_anamnese_a_partir_de(p_encounter_id, p_source_anamnesis_id, operation_id)`:
copia o `content` da anamnese-fonte (do mesmo paciente/profissional, FK composta
`source_anamnesis_id`), marca **cada item** com `previo = true` e
`fonte_anamnese_id`, grava `copied_from_previous = true`,
`source_anamnesis_id`, status `rascunho`. Só por ação da profissional ("Criar a
partir da anamnese anterior"). Nunca toca `holoscan_*`.

## 5. Conduta — conteúdo

Colunas próprias (Mestre §30): `priorities JSONB` (lista de textos),
`objective`, `nutrition_strategy`, `actions`, `resources`, `related_tools JSONB`
(ids de ferramentas do catálogo), `requested_exams`, `referrals`, `monitoring`,
`return_plan`, `observations`, `nutrition_diagnosis`, `dietary_prescription`,
`professional_guidance` — todos opcionais. Nenhum depende de score, faixa, Índice,
HOLOSCAN completo ou ferramenta.

`references JSONB`: `{ holoscan_application_ids: [], tool_application_ids: [],
lab_collection_ids: [], document_ids: [], previous_encounter_ids: [] }`,
validado pelo trigger `validar_referencias_conduta` (cada id tem de ser do mesmo
`patient_id` e `nutritionist_id`). Referência, não cópia.

Revisão: `supersedes_id`, `revision_number`, e `revision_note` (o que foi mantido,
alterado, encerrado). Retorno: `previous_conduct_id` (a conduta vigente do
atendimento anterior exibida na abertura) e `previous_decision`
(`continuar|substituir|encerrar`) + `previous_decision_note` (justificativa). Nada
é transportado automaticamente.

## 6. Acordos

`agreements`: `description` (obrigatória), `responsible`, `due_text` (prazo ou
ocasião), `follow_up`, `status` (`proposto|acordado|em_acompanhamento|concluido|
revisto|encerrado`, CHECK — desenho funcional, não adesão), `status_note`,
`status_changed_at`, `position`, `origin_agreement_id` (quando a nova revisão da
conduta carrega um acordo da anterior), `operation_id`. Estado só muda por ação
explícita; nenhum cálculo de adesão; nada muda sozinho com o tempo.

## 7. Idempotência, concorrência, segurança

* `operation_id` + índice único parcial `(nutritionist_id, operation_id)` nas três
  tabelas; RPCs devolvem o registro existente no retry.
* Controle otimista: UPDATE de rascunho/acordo condicionado ao `updated_at` lido
  (mesmo padrão de pacientes e `encounters`).
* RLS SELECT/INSERT/UPDATE só `nutritionist_id = auth.uid()`; `anon` revogado;
  RPCs SECURITY INVOKER; trigger `bloquear_escrita_paciente_arquivado` nas três.
* Exclusão de paciente: `contarRegistros`/`temHistorico` passam a contar
  `anamneses` e `conducts`.

## 8. Frontend

Novos módulos `anamnese.js` e `conduta.js`; abas "Anamnese" e "Conduta" na ficha;
ambas lêem `AtendimentoAtual.atual()` e recarregam ao trocar de atendimento
(`AtendimentoAtual.aoMudar`); troca de paciente limpa. Sem atendimento: "Selecione
ou inicie um atendimento para registrar a anamnese/conduta." Salvar só confirma
após o servidor. Visão geral, timeline, dashboard (pendência operacional
"atendimento sem conduta salva"), HOLOS AI (só salvo/revisado) e exportação
(revisões com estado e rótulo de rascunho) são atualizados.

## 9. Fora desta etapa

Evolução completa, relatórios/emissões, Pacote Metodológico, 45 exames, Leitura
Integrada final, ferramentas ausentes, provedor da HOLOS AI, novos estados do
paciente, texto assistido (nenhuma geração de texto é feita).
