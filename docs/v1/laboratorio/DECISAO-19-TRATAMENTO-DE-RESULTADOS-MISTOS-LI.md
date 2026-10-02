# DECISÃO 19 — TRATAMENTO DE RESULTADOS MISTOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 19 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02 (direções), 09, 14, 15 e dos blocos 16–18.

> **DECIDIDO — Etapa 5.8 (arquitetura conservadora) e 5.13 (regras por domínio), Daniel, 02/10/2026.** Regra geral de agregação (unanimidade; mistura → `indeterminate`; `indeterminate` nunca vira convergente/divergente) e regras D01–D04 registradas abaixo; D05/D06/D07 `not_applicable`. **Ainda não é**: implementação, migration, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. O motor LI não está implementado.

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

**DECISÃO (Bloco 19 — resultados mistos): DECIDIDO.**

**Princípio geral.** A V1 **não** usa: maioria simples; média; score laboratorial; peso por exame; "um alterado vence"; "um normal vence"; contagem bruta de alterados; percentual de exames alterados. A direção laboratorial usa **somente** resultados `directional` que sejam elegíveis, classificáveis, integrem a regra de suficiência (Blocos 16/17), estejam temporalmente compatíveis (LI-TEMP-01 v1) e tenham referência/unidade/contexto válidos.

**Três direções internas.** Cada resultado directional elegível fornece `attention_present`, `attention_not_detected` ou `indeterminate`. A direção agregada do domínio (`laboratory_direction`) é uma dessas três.

**Regra geral de agregação (unanimidade).** Se **todos** os resultados directional considerados pela regra do domínio apontarem `attention_present` → `laboratory_direction = attention_present`. Se **todos** apontarem `attention_not_detected` → `attention_not_detected`. Se existir **mistura** entre `attention_present` e `attention_not_detected` → `indeterminate`. **Não resolver por maioria.**

**Indeterminate não é divergente.** Se `laboratory_direction = indeterminate`, o motor **não** pode produzir CONVERGENTE nem DIVERGENTE. Estado oficial: SEM DADOS SUFICIENTES, reason code `mixed_without_rule` ou reason code mais específico quando o `indeterminate` vier de regra específica já aprovada para o exame.

### Regras por domínio

**D01 (PCR obrigatória).** CASO 1: somente PCR classificável e suficiência satisfeita → direção do D01 = direção da PCR. CASO 2: PCR + Fibrinogênio classificáveis → present + present → `attention_present`; not_detected + not_detected → `attention_not_detected`; present + not_detected ou not_detected + present → `indeterminate`. **Fibrinogênio indeterminate:** se a PCR possui direção determinística e o Fibrinogênio resulta `indeterminate` por condição já prevista (ex.: direção não aplicável ao confronto, `below`), o fibrinogênio **não** invalida automaticamente a suficiência mínima já satisfeita pela PCR. Resultado `indeterminate` opcional não substitui nem necessariamente bloqueia o exame obrigatório classificável; mas `indeterminate` **nunca** é contado como atenção presente ou não detectada.

**D02.** Primeiro validar a suficiência (mínimo 2 classificáveis e LAB-002 OU LAB-004 presente). Depois agregar **apenas** os resultados directional classificáveis que participam daquela leitura: todos present → `attention_present`; todos not_detected → `attention_not_detected`; qualquer mistura present/not_detected → `indeterminate`. Insulina nunca decide isoladamente.

**D03 (LAB-005 + LAB-009 obrigatórios).** present + present → `attention_present`; not_detected + not_detected → `attention_not_detected`; present + not_detected ou not_detected + present → `indeterminate`.

**D04 (LAB-013 + LAB-015 obrigatórios).** present + present → `attention_present`; not_detected + not_detected → `attention_not_detected`; present + not_detected ou not_detected + present → `indeterminate`.

**D05 / D06 / D07.** `mixed_rule = not_applicable`. Não existe direção laboratorial cross-source para comparação com HOLOSCAN nesses domínios. Isso **não** impede classificação individual de exames, visualização, histórico ou comentário profissional.

### Ordem conceitual de avaliação (preserva DECISÕES 20/21 e a precedência da Etapa 5.9)

1. validar fonte HOLOSCAN quando aplicável; 2. validar versão compatível; 3. validar temporalidade (LI-TEMP-01 v1); 4. validar vínculos; 5. validar resultados selecionados; 6. validar referência/unidade/contexto; 7. aplicar suficiência do domínio (16/17); 8. aplicar regra de resultados mistos (19); 9. derivar `laboratory_direction`; 10. derivar `holoscan_direction` (Regra 20/21-A); 11. somente então avaliar CONVERGENTE/DIVERGENTE (DECISÕES 20/21).

### SEM DADOS SUFICIENTES

Usar quando: exame obrigatório ausente; mínimo não atingido; grupo obrigatório não atendido; referência necessária ausente; ambiguidade impede classificação; unidade incompatível; data clínica ausente; fora da janela; duplicidade não resolvida; resultado misto produz direção indeterminada; qualquer outra razão já homologada impedir direção determinística. **Não usar** para D05/D06/D07 apenas porque não possuem confronto HOLOSCAN: nesses domínios `cross_source_sufficiency = not_applicable`.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 16–21 e no Documento Mestre (um exame isolado não resolve; nenhum percentual global; nenhuma maioria/média/score; misto sem resolução determinística = sem dados suficientes). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
