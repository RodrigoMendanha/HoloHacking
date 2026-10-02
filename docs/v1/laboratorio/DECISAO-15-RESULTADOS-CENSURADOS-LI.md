# DECISÃO 15 — RESULTADOS CENSURADOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 15 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 07 e 09.

> **DECIDIDO — Etapa 5.8 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração de banco, aprovação formal, homologação ou deploy. Nenhuma regra concreta, corte, peso ou lista foi criado.

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


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 15 — resultados censurados):** incluem `< valor`, `<= valor`, `> valor`, `>= valor`, "abaixo do limite de detecção/quantificação", "acima do limite mensurável" e equivalentes.
1. Preservar `qualifier`, `censor_limit` e o texto original.
2. **Não** transformar `<5` em 5 ou 4,99, `>100` em 100, nem qualquer aproximação inventada.
3. Sem valor exato, `numeric_value` permanece nulo.
4. Classificação determinística **somente** quando o intervalo matematicamente possível do resultado censurado prova **inequivocamente um único estado** em relação à referência aplicável. Exemplo conceitual: `<5` com referência 10–20 → todo valor possível é abaixo de 10 → `below` demonstrável. `<5` com referência 0–10 → o valor pode estar dentro da faixa → não é possível provar `within` → `not_classifiable`, `reason_code = censored_value_ambiguous`.
5. Intervalo possível atravessando dois ou mais estados: `not_classifiable`.
6. Censurado **nunca** produz delta numérico exato (comparação longitudinal: lado a lado).
7. Censurado **nunca** entra como valor exato em média, score ou cálculo derivado.

Consequência técnica: lógica de intervalo contra a referência (extensão pequena do motor, com trace); comportamento atual (sempre `censored_value`) passa a admitir o caso demonstrável.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 14–19 e no Documento Mestre (dado bruto preservado; misto sem regra = sem dados suficientes; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
