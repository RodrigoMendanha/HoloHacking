# DECISÃO 05 — JANELA TEMPORAL ENTRE APLICAÇÃO HOLOSCAN E COLETA

Etapa 5.5 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 5 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende das DECISÕES 01 (7 domínios) e 02 (vínculos).

> **DECIDIDO — Etapa 5.11 (02/10/2026, Daniel).** Arquitetura registrada na Etapa 5.6; valor e regra oficial registrados abaixo (LI-TEMP-01 v1, ±30 dias corridos, inclusivos, global, simétrica). **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy.

## Pergunta

**QUAL É A JANELA TEMPORAL ENTRE A APLICAÇÃO HOLOSCAN E A COLETA PARA QUE UM RESULTADO CONTE?**

Nenhum número é sugerido aqui (nem 7, 30, 60 ou 90 dias). O valor é decisão humana.

## Por que

O Mestre §24 exige temporalidade. Comparar um relato de um momento com um exame de outro momento clínico muda o significado da leitura.

## Estado atual

- Regra `temporal` (`payload.max_days`, `target` global ou domínio): **0 linhas**. Sem regra, o motor **não aplica janela** (inclui tudo que foi selecionado) — mas o estado continua `sem_dados_suficientes` por falta das outras regras.
- Datas usadas: `holoscan_applications.quando` e `lab_collections.coletado_em` (**data clínica**, nunca `created_at`/`updated_at`). Coleta sem data clínica é excluída.
- Hoje a janela é **simétrica** (valor absoluto da diferença). Assimetria, janela por exame e "sem janela fixa com revisão humana" exigem extensão pequena do payload/motor.

## Arquiteturas (sem recomendação; valores em branco)

| Arquitetura | Descrição | Consequências |
|---|---|---|
| (A) Janela fixa global simétrica | `max_days = ___`, coleta antes ou depois da aplicação | simples de explicar; mesmo limite para exames de cinética diferente |
| (B) Janela anterior ≠ posterior | `antes = ___`, `depois = ___` dias | reconhece que exame anterior ou posterior ao relato têm sentidos distintos; extensão do payload |
| (C) Janela por domínio | `max_days(domínio) = ___` para cada D01…D07 | 7 valores a homologar; permite cinéticas diferentes (ex.: marcadores de média longa vs curta) sem nomear nenhum aqui |
| (D) Janela por exame | valor por vínculo | 47 valores; máxima precisão, máxima carga de decisão e de explicação |
| (E) Sem janela fixa, com revisão humana | a profissional confirma a pertinência temporal de cada par; o sistema registra a distância em dias no trace | nenhum corte automático; exige UI de confirmação e deixa a decisão por caso; risco de inconsistência entre profissionais |
| (F) Sem janela (regra ausente) | qualquer distância conta | **incompatível** com o Mestre como regra oficial (temporalidade é exigida) |

Combinações: (A) ou (C) como padrão + (E) para exceções registradas.

## Consequência matemática comum

Cada resultado fora da janela sai da contagem de suficiência (`incompatibilidade_temporal` no trace); se todos saem, `sem_dados_suficientes`. A janela interage com o bloco 6 (várias coletas dentro dela) e com o bloco 3 (aplicação elegível).

## Incompatíveis

Janela deduzida de `created_at`/`updated_at`; (F) como regra oficial; valor herdado do legado (que não tinha janela).

## O que fica bloqueado enquanto aberto

Avaliabilidade de qualquer domínio; bloco 6.


## Fundamento no Documento Mestre (registro, sem alterar o sentido)

- a profissional seleciona, ou aceita uma seleção explicável;
- aplicação e coletas entram com IDs e datas clínicas visíveis;
- a janela temporal é versionada;
- não há escolha silenciosa da "última modificada";
- a leitura salva congela fontes e resultado;
- nova coleta não reescreve leitura já emitida;
- o histórico laboratorial usa a data da coleta, não a data de atualização;
- somente registros consolidados entram em histórico, comparações e relatórios oficiais.

## Campo DECISÃO

**DECISÃO (Bloco 5 — janela temporal): DECIDIDO.** Arquitetura (Etapa 5.6) mantida integralmente: compatibilidade temporal obrigatória; datas clínicas; nunca `updated_at`/`created_at`; janela explícita, versionada, parte do pacote LI e rastreável; ausência de data ou fora da janela = `sem_dados_suficientes`; "sem janela" excluída.

### Regra oficial

| Campo | Valor |
|---|---|
| código conceitual | **LI-TEMP-01** |
| versão inicial | **1** |
| janela | **±30 dias corridos** |
| limites | **INCLUSIVOS** |
| regra conceitual | `abs(collection.clinical_date − holoscan.application_clinical_date) <= 30 dias` |
| tipo | **GLOBAL** · **SIMÉTRICA** |
| exceções na V1 inicial | **0** por domínio · **0** por exame · **0** por variante |

### Natureza da regra

A janela de ±30 dias é uma **REGRA OPERACIONAL AUTORAL E VERSIONADA DA V1**. **Não** deve ser descrita como: validade fisiológica universal; tempo biológico universal dos exames; prazo clínico universal; evidência de que todos os analitos representam exatamente os mesmos 30 dias.

Justificativa metodológica da V1: necessidade de uma regra temporal determinística; proximidade entre aplicação e coleta; predominância do contexto "últimos 30 dias" na edição aprovada do HOLOSCAN (50 dos 84 itens em `ultimos_30_dias`); simplicidade e explicabilidade da V1; possibilidade de versionamento futuro.

### Datas

| Fonte | Âncora |
|---|---|
| HOLOSCAN | `application_clinical_date` |
| laboratório | `collection.clinical_date` |

**Nunca** usar para compatibilidade: `created_at`, `updated_at`, `saved_at`, `reviewed_at`, `last_modified`, data de upload, data de edição.

### Casos

| Diferença (dias) | Estado |
|---|---|
| 0 | compatible |
| +30 | compatible |
| −30 | compatible |
| +31 | incompatible |
| −31 | incompatible |

### Fora da janela

Não apagar. Não invalidar o exame. Não invalidar a aplicação HOLOSCAN. Apenas: resultado/coleta **não elegível temporalmente** para aquela Leitura Integrada. Reason code: `outside_time_window`. Estado do domínio, quando a fonte temporalmente elegível for necessária: **SEM DADOS SUFICIENTES**.

### Data ausente

Se faltar data clínica necessária: reason code `missing_clinical_date`. Sem fallback para `created_at`, `updated_at`, data de cadastro ou data de upload.

### Múltiplas coletas na janela

O sistema pode ordenar por proximidade temporal; **não** escolhe silenciosamente; a profissional seleciona explicitamente; empates não têm desempate automático. **DECISÃO 06 preservada.**

### Snapshot

A leitura salva congela: `application_id`; `application_clinical_date`; `collection_ids`; `collection_clinical_dates`; `result_ids`; `temporal_delta_days` por coleta; `temporal_status`; `temporal_rule_code = LI-TEMP-01`; `temporal_rule_version = 1`.

### Delta temporal

Preservar o delta **com sinal** (`temporal_delta_days = collection.clinical_date − application_clinical_date`). Exemplo conceitual: aplicação = 02/10/2026, coleta = 20/09/2026 → `temporal_delta_days = −12`. O sinal **não** serve para inferência clínica; serve somente para rastreabilidade, ordenação e explicabilidade.

### Exceções futuras

A V1 inicial possui **0 exceções**. No futuro, uma exceção por domínio, exame, variante, material ou método só pode existir se: explicitamente definida; versionada; justificada; aprovada; incorporada a novo `content_hash`; analisada quanto à comparabilidade (DECISÃO 25).

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada no fundamento do Documento Mestre registrado acima e na edição aprovada do HOLOSCAN (contexto temporal predominante). Não atribuída ao legado. Não é afirmação fisiológica.

**FONTE:** Documento Mestre + pacote HOLOSCAN-V1 aprovado (contexto temporal, Etapa 4.2) + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
