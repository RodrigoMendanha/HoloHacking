# DECISÃO 05 — JANELA TEMPORAL ENTRE APLICAÇÃO HOLOSCAN E COLETA

Etapa 5.5 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 5 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende das DECISÕES 01 (7 domínios) e 02 (vínculos).

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor sugerido; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO (arquitetura: ______ · valores: ______ · escopo: ______ · simetria: ______): ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
