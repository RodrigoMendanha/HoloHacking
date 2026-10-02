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

> Texto conferido contra o contrato canônico ditado por Daniel na Etapa 5.10.1 (02/10/2026); auditoria em `AUDITORIA-FIDELIDADE-BLOCOS-26-29.md`.

**DECISÃO (Bloco 26 — cálculos derivados):** a V1 **admite a arquitetura** para cálculos derivados (`lab_derived_calculations`), mas a LI V1 inicial possui **0 cálculos derivados oficiais**. Nada é calculado pelo sistema na V1.

**Qualquer cálculo futuro exige explicitamente:** `calculation_code`; nome; fórmula explícita; `exam_codes` de entrada; variantes aplicáveis quando pertinentes; materiais aplicáveis quando pertinentes; métodos aplicáveis quando pertinentes; unidades de entrada; conversões permitidas; critérios de elegibilidade; tratamento de ausências; precisão; arredondamento; fonte; justificativa; versão; responsável; aprovação metodológica (que segue a governança geral do pacote metodológico — Bloco 30 —, não é atributo clínico do cálculo).

**Regras obrigatórias (6):**
1. Preservar os valores originais de entrada.
2. Resultado derivado não substitui o exame original.
3. Cálculo derivado não entra automaticamente nos 45 exames-base.
4. Cálculo derivado não recebe domínio automaticamente.
5. Cálculo derivado não participa da LI sem vínculo próprio homologado.
6. HOMA-IR ou qualquer outro cálculo não é ativado apenas porque existia no legado.

**HOMA-IR legado (EXA-007):** permanece histórico; não é recalculado automaticamente; não é convertido silenciosamente em cálculo oficial (ver Bloco 28).

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
