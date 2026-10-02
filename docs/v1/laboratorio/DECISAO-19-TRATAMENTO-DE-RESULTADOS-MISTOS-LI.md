# DECISÃO 19 — TRATAMENTO DE RESULTADOS MISTOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 19 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02 (direções), 09, 14, 15 e dos blocos 16–18.

> **ARQUITETURA CONSERVADORA DECIDIDA / REGRA ESPECÍFICA POR DOMÍNIO PENDENTE — Etapa 5.8 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração de banco, aprovação formal, homologação ou deploy. Nenhuma regra concreta, corte, peso ou lista foi criado.

## Pergunta (como no pacote)

**Quando, no mesmo domínio, há resultados abaixo, dentro, acima e não classificáveis, em combinações diferentes: como se define "laboratório alterado" para o domínio?**

Regra do Documento Mestre preservada: **resultado misto sem regra homologada → `sem_dados_suficientes`.** Um único exame fora da referência **não** produz automaticamente convergência. **Não criar score laboratorial global.**

## Estado atual

Regra `mixed` (`payload.policy ∈ majority | insufficient`): **0 linhas**. Motor: mistos sem regra → `dados_mistos_sem_regra` → `sem_dados_suficientes`; sem mistos (todos fora ou todos dentro) a regra não é consultada e "alterado" = `fora > 0`. A direção do vínculo (DECISÃO 02) já filtra o que conta como "fora" (acima/abaixo/qualquer). Não classificáveis não entram na contagem (DECISÃO 09). Fração, empate e peso não estão parametrizados.

## Combinações a cobrir (todas precisam de regra explícita)

| Combinação no domínio | Hoje | A decidir |
|---|---|---|
| todos dentro | "não alterado" | confirmar |
| todos fora na direção do vínculo | "alterado" | confirmar; **1 único fora** = alterado só por decisão explícita |
| fora em direção **contrária** à do vínculo (ex.: HDL acima, vínculo `below`) | conta como "dentro" para o domínio | confirmar ou tratar como estado próprio |
| dentro + fora (mistos) | `sem_dados_suficientes` | política: maioria / qualquer fora / fração ___ / insuficiente |
| empate (fora = dentro) | não alterado em `majority` | regra explícita de empate |
| mistos + não classificáveis | não classificáveis fora da contagem | confirmar (DECISÃO 09) |
| multi-domínio (mesmo resultado em D01 e D06) | conta em cada domínio | confirmar |
| censurados/qualitativos decidíveis (blocos 14–15) | fora da contagem | se (b) dos blocos 14/15, como entram |

## Arquiteturas (sem decidir)

(a) `insufficient` — mistos nunca decidem; (b) `majority` com regra de empate; (c) `any_out` — qualquer fora (reproduz o legado; **só por decisão explícita, nunca default**); (d) fração `___ %`; (e) por direção do vínculo apenas; (f) política por domínio.

## Consequências

(a) mais `sem dados`; (b)/(d) dependem de N e do bloco 6 (um exame em várias coletas); (c) sensível a um único valor. Nenhuma opção produz convergente/divergente por si: isso depende dos blocos 20–21 (regra HOLOSCAN alterado e relação domínio → sistema).

## Conflitos / incompatíveis

Herdar "qualquer fora"; política não versionada; score/índice laboratorial; direção virando gravidade.


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 19 — resultados mistos, arquitetura conservadora):**

**Proibido:** maioria simples automática; média de exames heterogêneos; score laboratorial global; "um alterado vence os normais"; "a maioria normal vence o alterado"; normalizar `not_classifiable` como `within`.

- Resultado misto pode envolver combinações de `below`, `within`, `above`, `not_classifiable`.
- A regra para interpretar mistura é **própria do domínio, versionada e homologada**.
- Enquanto a regra do domínio não existir: `reason_code = mixed_without_rule`, estado = `sem_dados_suficientes`.
- Um único exame fora da referência **não** produz automaticamente convergente ou divergente.
- `not_classifiable` **não** conta como "normal" para resolver mistura.
- **Não criar score laboratorial global.**

Consequência técnica: a política `majority` existente no motor **não** pode ser usada como default; cada domínio exigirá regra `mixed` própria com contrato declarado; o motivo passa a `mixed_without_rule`.

**Pendência:** **REGRAS ESPECÍFICAS POR DOMÍNIO (D01…D07).** Nenhuma definida.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 14–19 e no Documento Mestre (dado bruto preservado; misto sem regra = sem dados suficientes; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ARQUITETURA CONSERVADORA DECIDIDA / REGRA ESPECÍFICA POR DOMÍNIO PENDENTE — não implementado, não registrado no banco, não homologado.
