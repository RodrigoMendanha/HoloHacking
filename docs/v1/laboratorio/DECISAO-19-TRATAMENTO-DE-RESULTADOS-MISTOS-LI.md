# DECISÃO 19 — TRATAMENTO DE RESULTADOS MISTOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 19 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02 (direções), 09, 14, 15 e dos blocos 16–18.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhum corte, peso, lista obrigatória ou regra deduzida do legado; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI. Convergente/divergente **não** são tratados aqui (blocos 20–21); nenhuma relação domínio LI → sistema HOLOSCAN é criada (bloco 20 pendente).

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
