# DECISÃO 17 — NÚMERO/CONJUNTO MÍNIMO DE EXAMES

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 17 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 02 e do bloco 16.

> **ARQUITETURA DECIDIDA / VALORES POR DOMÍNIO PENDENTES — Etapa 5.8 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração de banco, aprovação formal, homologação ou deploy. Nenhuma regra concreta, corte, peso ou lista foi criado.

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


## Regra transversal (aplicada a este bloco)

Três eixos independentes por resultado: `classification_status` · `li_eligibility_status` · `longitudinal_comparability_status`. Exemplo: um resultado censurado pode ser **válido como dado bruto**, **não classificável individualmente** e, portanto, **não elegível** para determinada regra da LI — isso **não** o torna inválido. Motivos registrados separadamente por eixo. Nomenclatura conceitual; campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 17 — número/conjunto mínimo, arquitetura):** a suficiência de um domínio poderá ser definida por (A) quantidade mínima de resultados classificáveis; (B) conjunto obrigatório de exames; (C) grupo obrigatório; (D) combinação de quantidade + conjunto/grupo. Contrato conceitual: `min_classifiable_results`, `required_exam_codes`, `required_exam_groups` — **campos não implementados**.

**Regras de contagem:**
1. Hemograma completo conta como **um** exame-base para cobertura.
2. Componentes internos do hemograma **não** inflam a suficiência.
3. Mesmo `exam_code` + `variant` medido várias vezes **não** cria várias posições de cobertura; depois da seleção explícita do `result_id` aplicável (DECISÃO 06), ocupa **uma** posição metodológica.
4. Exame multi-domínio pode contribuir **uma vez em cada domínio** ao qual possui vínculo oficial (não duplica o exame no prontuário nem na contagem global dos 45).
5. Exame não classificável **não** conta automaticamente como resultado classificável.
6. **Não assumir** que todos os exames têm o mesmo peso de suficiência (pesos, se existirem, são decisão com fonte — nenhum criado).

**Pendência:** **PARÂMETROS CONCRETOS POR DOMÍNIO** (quantidades, conjuntos, grupos). Nenhum valor definido.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 14–19 e no Documento Mestre (dado bruto preservado; misto sem regra = sem dados suficientes; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ARQUITETURA DECIDIDA / VALORES POR DOMÍNIO PENDENTES — não implementado, não registrado no banco, não homologado.
