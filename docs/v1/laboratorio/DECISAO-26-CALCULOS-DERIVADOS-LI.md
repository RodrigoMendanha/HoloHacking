# DECISÃO 26 — Cálculos derivados

Etapa 5.9 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 26 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). **Dependências:** DECISÕES 02 (um derivado só teria vínculo se decidido), 10 (unidades das entradas), 15 (censurado nunca entra em derivado), 07/09 (referência do derivado); blocos **16/17/19** (parâmetros pendentes: um derivado conta como posição de cobertura? como entra em mistos?) e **20/21** (direção).

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nada preenchido por legado, nome parecido, categoria, conhecimento geral, inferência clínica ou "parece lógico". Campos DECISÃO, RESPONSÁVEL e DATA vazios. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
