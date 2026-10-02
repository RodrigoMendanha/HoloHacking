# DECISÃO 17 — NÚMERO/CONJUNTO MÍNIMO DE EXAMES

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 17 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02 e do bloco 16.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhum corte, peso, lista obrigatória ou regra deduzida do legado; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI. Convergente/divergente **não** são tratados aqui (blocos 20–21); nenhuma relação domínio LI → sistema HOLOSCAN é criada (bloco 20 pendente).

## Pergunta (como no pacote)

**Além da contagem (bloco 16), há exames obrigatórios por domínio (sem os quais o domínio não é avaliável) e qual é esse conjunto?**

## Estado atual

Não existe "obrigatório" no vínculo (extensão pequena: flag `required`). O catálogo **não é painel obrigatório** (decisão 68). Nenhum conjunto mínimo existe.

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

## Opções

| Opção | Consequência |
|---|---|
| (a) nenhum obrigatório | só a contagem do bloco 16 decide |
| (b) obrigatórios por domínio (flag `required` no vínculo) | domínio sem o obrigatório → `sem_dados_suficientes` mesmo com N alto; precisa de fonte por obrigatório |
| (c) grupos alternativos ("um de A ou um de B") | extensão maior; mais explicação |
| (d) pesos de suficiência diferentes por exame | **não inventar pesos**; se existirem, cada peso é decisão com fonte |

## Conflitos / incompatíveis

Tratar ausência de obrigatório como alteração; gerar solicitação de exame (Conduta não gera pedido); listas herdadas do legado.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
