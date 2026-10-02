# DECISÃO 15 — RESULTADOS CENSURADOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 15 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 07 e 09.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhum corte, peso, lista obrigatória ou regra deduzida do legado; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI. Convergente/divergente **não** são tratados aqui (blocos 20–21); nenhuma relação domínio LI → sistema HOLOSCAN é criada (bloco 20 pendente).

## Pergunta (como no pacote)

**Como entram valores "< 0,10", "> 2000", "abaixo do limite de quantificação": excluídos, classificados pela direção do censor contra a referência quando inequívoco, ou só exibidos.**

## Estado atual

`qualifier ∈ lt|lte|gt|gte`, `censor_limit`, `numeric_value` nulo (CHECK); motor: `not_classifiable / censored_value`; excluído da LI. Nunca substituído por `censor_limit`, limite/2 ou 0.

## Opções

| Opção | Efeito |
|---|---|
| (a) excluídos (como hoje) | marcadores frequentemente censurados nunca contam |
| (b) classificação só quando o intervalo censurado está inteiramente de um lado da referência (ex.: "< 0,10" contra referência "< 3" ⇒ dentro; "< 0,10" contra "0,05–0,20" ⇒ indecidível → não classificável) | extensão pequena do motor; trace registra a lógica de intervalo |
| (c) exibidos sem contar | transparência |

## Consequências e dependências

(b) interage com 16 (conta como utilizável quando decidível), 19 (direção do censor em mistos) e 10 (censor em unidade diferente). Comparação longitudinal de censurados: lado a lado, sem delta (bloco 25).

## Conflitos / incompatíveis

Substituir por número; tratar indecidível como dentro ou fora.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
