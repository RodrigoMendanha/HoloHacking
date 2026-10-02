# DECISÃO 26 — Cálculos derivados

Etapa 5.9 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 26 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). **Dependências:** DECISÕES 02 (um derivado só teria vínculo se decidido), 10 (unidades das entradas), 15 (censurado nunca entra em derivado), 07/09 (referência do derivado); blocos **16/17/19** (parâmetros pendentes: um derivado conta como posição de cobertura? como entra em mistos?) e **20/21** (direção).

> **DECIDIDO — Etapa 5.10 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma fórmula, alias, vínculo, migration ou mapeamento foi criado.

## Pergunta (como no pacote)

**Se algum cálculo derivado entra na V1 (HOMA-IR, LDL calculado, razões, índices), com fórmula, versão, entradas obrigatórias, unidades exigidas, critérios de validade e fonte; e se o derivado pode receber vínculo a domínio.**

## Por que

Derivado não é medido: é produzido por fórmula a partir de resultados. Sem contrato, vira "cálculo invisível"; com contrato errado, mistura unidades ou coletas.

## Estado atual

`lab_derived_calculations` (`code`, `formula`, `formula_version`, `inputs`, `required_units`, `criteria`, `source`, `status`, aprovação): **0 linhas**; nenhum cálculo é ativado por presença de componentes; o `LabMotor` não calcula nada. Entra no hash do pacote LI por dependência (Etapa 5.2). HOMA-IR legado (EXA-007) preservado como `additional_legacy` (bloco 28), **nunca** calculado pelo sistema.

## Documento Mestre

§21 (catálogo de 45 — derivados não estão nos 45), §23 (regras são decisão metodológica). Nenhuma fórmula ou derivado oficial consta no repositório.

## Legado

HOMA-IR como item **digitado** (EXA-007, sistema `metabolico` no CSV) — **LEGADO, não homologado**; nunca houve fórmula no sistema.

## Conflitos

- Derivado exige entradas **da mesma coleta** (ou regra explícita para coletas distintas), em **unidades fixas** (bloco 10) e **não censuradas** (DECISÃO 15).
- Fórmula sem versão é irreproduzível; derivado digitado ≠ derivado calculado.
- Derivado com vínculo a domínio altera a cobertura (bloco 17: conta como posição?) e os mistos (bloco 19) — parâmetros pendentes.
- Referência do derivado: do laudo (quando o laboratório o informa) ou metodológica (bloco 8) — nenhuma existe.

## Opções

| Opção | Consequência |
|---|---|
| (a) nenhum derivado na V1 | nada calculado; derivados informados pelo laudo entram só se estiverem no catálogo (não estão) ou como custom (bloco 27) |
| (b) derivados aprovados por migration (fórmula, versão, entradas, unidades, critérios, fonte), calculados pelo motor com trace e exibidos como derivados, **sem** vínculo | transparência; não participa da LI |
| (c) idem (b), com vínculo a domínio como qualquer exame | exige decisão no bloco 2 (vínculo), 16/17 (contagem), 19 (mistos), 20/21 (direção) |
| (d) derivado informado pelo laudo tratado como resultado próprio (não calculado), via catálogo futuro | reabre o catálogo (decisão 68) |

## Incompatíveis

Fórmula sem fonte/versão; cálculo com entradas em unidades não verificadas ou censuradas; derivado digitado tratado como calculado; ativação automática por presença de componentes.

## Campo DECISÃO

**DECISÃO (Bloco 26 — cálculos derivados):** a V1 **não tem cálculo derivado oficial**. `lab_derived_calculations` permanece com **0 linhas**; o motor laboratorial e o motor LI **não calculam nada**; nenhum derivado participa de domínio, cobertura, suficiência, mistos, convergência ou divergência.

**Contrato obrigatório para qualquer derivado futuro** (sem ele, o derivado não existe para o sistema):
- `code` próprio e estável (fora da numeração LAB-001…045);
- `name` canônico;
- `formula` explícita e `formula_version`;
- `inputs`: lista fechada de `exam_codes` obrigatórios do catálogo (com variante/material quando relevantes);
- `required_units`: unidade exigida de cada entrada (conversão só por regra homologada — DECISÃO 10);
- `criteria`: critérios de validade (mesma coleta ou regra explícita para coletas distintas; entradas não censuradas — DECISÃO 15; entradas com `classification_status` avaliável; sem entrada qualitativa — DECISÃO 14);
- `source` (fonte formal) e `justification`;
- `status` e aprovação em pacote LI (Daniel → Rodrigo → Homologar; o derivado entra no hash do pacote);
- referência do derivado declarada (laudo ou metodológica — DECISÕES 07/08/09), nunca presumida;
- vínculo a domínio **somente** por decisão explícita no Bloco 2 (nova linha da matriz), com direção, e com definição prévia de como conta nos blocos 16/17/19 e 20/21.

**Regras (6):**
1. Nenhum derivado é calculado, exibido como calculado ou usado pela LI na V1.
2. Nenhum derivado é ativado automaticamente pela presença dos seus componentes numa coleta.
3. Derivado **digitado** no laudo (valor informado pelo laboratório) é resultado informado, nunca derivado calculado; só entra no catálogo por decisão de catálogo (reabre a decisão 68), não por este bloco.
4. HOMA-IR legado (EXA-007) permanece `additional_legacy`, **nunca recalculado**, nunca tratado como calculado (Bloco 28).
5. Derivado futuro só nasce por migration versionada com o contrato completo acima e aprovação dupla; fórmula sem fonte/versão, entrada em unidade não verificada ou censurada e cálculo cruzando coletas sem regra são **proibidos**.
6. Derivado sem vínculo aprovado no Bloco 2 não participa de nenhuma Leitura Integrada, mesmo que calculado.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
