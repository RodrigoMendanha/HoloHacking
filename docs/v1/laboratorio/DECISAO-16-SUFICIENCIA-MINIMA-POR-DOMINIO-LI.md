# DECISÃO 16 — SUFICIÊNCIA MÍNIMA POR DOMÍNIO

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 16 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 01 (domínios), 02 (vínculos: D01 8 · D02 3 · D03 5 · D04 4 · D05 4 · D06 13 · D07 10 pares), 04, 06, 09.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhum corte, peso, lista obrigatória ou regra deduzida do legado; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI. Convergente/divergente **não** são tratados aqui (blocos 20–21); nenhuma relação domínio LI → sistema HOLOSCAN é criada (bloco 20 pendente).

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
