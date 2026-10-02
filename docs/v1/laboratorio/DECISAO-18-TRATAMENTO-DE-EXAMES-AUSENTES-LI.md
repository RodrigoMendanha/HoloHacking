# DECISÃO 18 — TRATAMENTO DE EXAMES AUSENTES

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 18 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02, 04 e do bloco 16.

> **DECIDIDO — Etapa 5.8 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração de banco, aprovação formal, homologação ou deploy. Nenhuma regra concreta, corte, peso ou lista foi criado.

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


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 18 — exames ausentes):** regra fundamental: **EXAME NÃO MEDIDO = AUSÊNCIA DE DADO.** Nunca significa normal, dentro, alterado, zero, favorável ou desfavorável.

Exame ausente: não possui direção; não contribui para convergência nem divergência; **reduz a cobertura pertinente**; **não invalida automaticamente** todo o domínio. O domínio fica `sem_dados_suficientes` apenas quando a regra mínima não é atingida **ou** falta exame/grupo explicitamente obrigatório (blocos 16–17).

**Motivos separados tecnicamente** (não colapsar em "faltando"): `missing_exam`, `missing_reference`, `not_classifiable`, `not_eligible`, `outside_time_window`, `incompatible_unit`, `incompatible_variant`, `incompatible_material`, `incompatible_method`, `ambiguous_reference`, `qualitative_rule_missing`, `censored_value_ambiguous`.

Consequência técnica: o trace passa a listar os vinculados não coletados (`missing_exam`) distintos dos coletados e excluídos por outro motivo; vocabulário de motivos unificado entre os três eixos.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 14–19 e no Documento Mestre (dado bruto preservado; misto sem regra = sem dados suficientes; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
