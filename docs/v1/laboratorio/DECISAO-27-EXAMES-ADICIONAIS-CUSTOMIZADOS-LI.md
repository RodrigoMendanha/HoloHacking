# DECISÃO 27 — Exames adicionais/customizados

Etapa 5.9 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 27 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). **Dependências:** DECISÃO 01 (regra 6: sem vínculo aprovado fica fora da LI), 02 (vínculo só para `exam_code` do catálogo), 04 (regras 16 e 18: customizado não participa automaticamente; item fora do catálogo exige vínculo explícito homologado).

> **DECIDIDO — Etapa 5.10 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma fórmula, alias, vínculo, migration ou mapeamento foi criado.

## Pergunta (como no pacote)

**Se exames customizados por profissional (`lab_custom_exams`) podem, em algum caso, receber vínculo a domínio ou referência metodológica; ou permanecem registro factual sem leitura.**

## Por que

Custom exam é dado do profissional; a LI é metodologia global. Misturar os dois criaria regra por profissional.

## Estado atual

`lab_custom_exams` (dono, nome único por profissional, aliases, notas, status): não é global; sem regra, referência ou vínculo; o vínculo (`exam_code` FK no catálogo) **não aceita** custom; comparação longitudinal de custom funciona pelo `LabMotor` (mesma identidade). DECISÃO 04 regras 16/18 já fixam: não participa automaticamente; só com vínculo explícito e homologado.

## Documento Mestre

§21 (catálogo-base global de 45); §34.2 (versionamento). Nenhum trecho prevê leitura sobre exame por profissional.

## Legado

Inexistente (o legado só tinha os 24 EXA fixos).

## Conflitos

- Vínculo a custom tornaria a metodologia dependente de dado não versionado e não global.
- Promoção ao catálogo-base muda a contagem dos 45 (decisão 68) e exige nova versão do catálogo e do pacote LI (hash).
- Um custom pode duplicar semanticamente um LAB existente (ex.: nome diferente para o mesmo exame) — a resolução é humana, nunca por nome.

## Opções

| Opção | Consequência |
|---|---|
| (a) custom nunca entra na LI (comportamento atual; coerente com DECISÃO 04) | registro factual, Evolução por identidade, fora de qualquer domínio |
| (b) promoção ao catálogo-base por migration (vira LAB-046+), com decisão de catálogo e novo vínculo (bloco 2) | reabre a decisão 68 e o hash do pacote; o custom é remapeado humanamente |
| (c) vínculo direto a custom (extensão de schema) | **incompatível** com catálogo global aprovado e com regra por profissional |
| (d) "equivalência humana" custom → LAB registrada pelo profissional, sem efeito na LI (só para busca/Evolução) | não é vínculo metodológico; decisão de produto |

## Incompatíveis

Regra por profissional; vínculo sem fonte; custom alterar a contagem dos 45; equivalência por nome.

## Campo DECISÃO

**DECISÃO (Bloco 27 — exames adicionais/customizados):** exames customizados por profissional (`lab_custom_exams`) são **permitidos como registro factual** (histórico, Evolução por identidade própria, HOLOS AI como fato). Por padrão **não recebem nada relacionado à LI**: sem vínculo a domínio, sem referência metodológica, sem direção, sem participação em cobertura, suficiência, mistos, convergência ou divergência (coerente com DECISÕES 01 regra 6 e 04 regras 16/18).

**Regras:**
1. Custom nunca é promovido a exame-base por nome, categoria, semelhança ou uso frequente.
2. Custom **nunca altera a contagem dos 45** (decisão 68): promoção ao catálogo é decisão de catálogo, por migration, com novo vínculo decidido no Bloco 2 — não é consequência deste bloco.
3. Nenhuma "equivalência" custom → LAB é vínculo metodológico; se um dia existir, é recurso de busca/Evolução sem efeito na LI.
4. Regra por profissional não existe na LI: o pacote é global e homologado.
5. Resultado custom, para a LI, é `li_eligibility_status = not_eligible` com motivo explícito (código a unificar com a lista da DECISÃO 22 na implementação), nunca silencioso.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
