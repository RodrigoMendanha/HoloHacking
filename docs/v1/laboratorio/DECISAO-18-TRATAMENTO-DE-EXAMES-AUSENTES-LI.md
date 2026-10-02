# DECISÃO 18 — TRATAMENTO DE EXAMES AUSENTES

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 18 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02, 04 e do bloco 16.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhum corte, peso, lista obrigatória ou regra deduzida do legado; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI. Convergente/divergente **não** são tratados aqui (blocos 20–21); nenhuma relação domínio LI → sistema HOLOSCAN é criada (bloco 20 pendente).

## Pergunta (como no pacote)

**Como exames vinculados mas não coletados são tratados: ignorados na contagem, mostrados como "não coletado", ou considerados no denominador da fração?**

## Estado atual

Motor só olha resultados presentes; ausentes não aparecem no trace. Ausência **não** é alteração (decisão 68). DECISÃO 09: resultado não classificável é diferente de ausente (existe, mas sem referência).

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
| (a) ignorar (como hoje) | suficiência conta só o presente |
| (b) listar no trace/tela os vinculados não coletados | transparência sem efeito no estado |
| (c) entrar no denominador da fração (bloco 16C) | efeito direto na suficiência |
| (d) distinguir "não coletado" de "coletado e não classificável" nos motivos | coerente com a regra transversal dos três eixos |

## Conflitos / incompatíveis

Ausência = fora; ausência gera pedido automático; ausência de exame sem domínio (LAB-027/033/044) contar para algum domínio.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
