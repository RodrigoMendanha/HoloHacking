# DECISÃO 16 — SUFICIÊNCIA MÍNIMA POR DOMÍNIO

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 16 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 01 (domínios), 02 (vínculos: D01 7 · D02 3 · D03 5 · D04 4 · D05 4 · D06 12 · D07 12 = 47 pares; contagem corrigida na Etapa 5.10 a partir da matriz), 04, 06, 09.

> **ARQUITETURA DECIDIDA / PARÂMETROS POR DOMÍNIO PENDENTES — Etapa 5.8 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração de banco, aprovação formal, homologação ou deploy. Nenhuma regra concreta, corte, peso ou lista foi criado.

## Pergunta (como no pacote)

**A partir de quantos resultados classificáveis (ou de qual fração dos exames vinculados) um domínio é avaliável?** Valor em branco.

## Estado atual

Regra `sufficiency` (`payload.min_results`, global ou por domínio): **0 linhas**; sem ela, `sem_regra_homologada`. Fração/percentual não existe no motor (extensão pequena). Trace: `sufficiency = { min_results, included }`. Com os vínculos da DECISÃO 02, o denominador potencial por domínio varia de 3 (D02) a 13 (D06).

## O que o material permite decidir (sem escolher)

- o que conta como **resultado utilizável** (classificável individualmente? elegível para a LI? só os dois?);
- **quantidade ou cobertura mínima** (absoluta, fração, ou conjunto específico);
- se a regra **varia por domínio**;
- como tratar resultado **não classificável** (DECISÃO 09: não conta para convergente/divergente, não invalida domínio);
- como tratar **ausência** (exame vinculado sem resultado na coleta);
- como tratar exames **vinculados mas não medidos**;
- como tratar **multi-domínio** (B12, Ácido fólico, Ferro, Ferritina, PTH contam em cada domínio?);
- se todos os exames têm o **mesmo peso** de suficiência;
- se existe **conjunto mínimo obrigatório**;
- se a suficiência depende apenas de **contagem** ou de **exames específicos**.

**Nenhum corte é sugerido** (nem 1 exame, 50%, 70%, 80%, 100%). O legado "um exame fora da referência basta" **não é regra oficial**.

## Arquiteturas (valores em branco)

| Arquitetura | Regra | Consequência matemática |
|---|---|---|
| (A) mínimo absoluto global | `min_results = ___` | igual para D02 (3 pares) e D06 (13); um mínimo alto inviabiliza domínios pequenos |
| (B) mínimo absoluto por domínio | `min(Dxx) = ___` ×7 | 7 valores a homologar |
| (C) fração dos vinculados | `___ %` por domínio | depende de como ausentes (bloco 18) entram no denominador; extensão do payload |
| (D) conjunto obrigatório + mínimo | bloco 17 + (A)/(B) | — |
| (E) utilizável = só classificável individualmente | define o numerador | não classificáveis (blocos 9, 14, 15) saem da contagem |

Em todas: N utilizáveis < mínimo → `sem_dados_suficientes`. Um domínio com 1 exame e `min = 1` reproduziria o legado — só por decisão explícita.


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 16 — suficiência, arquitetura):**
- Cada domínio LI terá **regra própria, explícita e versionada** de suficiência.
- A regra deve conseguir declarar: total de vínculos potencialmente aplicáveis; resultados encontrados; resultados elegíveis; resultados classificáveis; resultados excluídos; motivos de exclusão; cobertura calculada; exames ou grupos obrigatórios, se existirem; critério final de suficiência.
- **Não existe corte universal implícito.** Não assumir 50%, 70%, 80%, 100%, 1 exame, 2 exames ou outro corte.
- Enquanto a regra completa de um domínio não estiver homologada: estado do domínio = `sem_dados_suficientes`.
- Suficiência é avaliada **por domínio**; **não** existe suficiência global da LI.

Consequência técnica: o payload atual (`min_results`) é insuficiente para o contrato acima; a regra `sufficiency` precisará declarar cobertura, obrigatórios e critério, e o trace listar encontrados/elegíveis/classificáveis/excluídos com motivos (extensão na implementação em lote).

**Pendência:** **PARÂMETROS CONCRETOS POR DOMÍNIO (D01…D07).** Nenhum valor definido.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 14–19 e no Documento Mestre (dado bruto preservado; misto sem regra = sem dados suficientes; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ARQUITETURA DECIDIDA / PARÂMETROS POR DOMÍNIO PENDENTES — não implementado, não registrado no banco, não homologado.
