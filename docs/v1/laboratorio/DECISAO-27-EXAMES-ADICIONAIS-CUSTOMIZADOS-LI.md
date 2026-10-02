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

> Texto conferido contra o contrato canônico ditado por Daniel na Etapa 5.10.1 (02/10/2026); auditoria em `AUDITORIA-FIDELIDADE-BLOCOS-26-29.md`.

**DECISÃO (Bloco 27 — exames adicionais/customizados):** a profissional pode cadastrar exame adicional/customizado fora dos 45 exames-base (`lab_custom_exams`).

**O registro pode preservar:** nome; valor original; unidade; referência do laudo; variante; material; método; origem; observações; documento relacionado. **Pode aparecer:** na coleta; no histórico.

**Por padrão NÃO recebe:** código LAB-001..045; domínio LI; direção; interpretação automática; referência metodológica; conversão; cálculo derivado; convergência/divergência; participação automática na LI.

**Para participar futuramente da LI:** exige contrato metodológico explícito, versionado e homologado.

Exame customizado **nunca altera silenciosamente** o catálogo-base de 45. Equivalência de customizado com exame canônico: **NÃO inferida por nome**.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 26–29 e no Documento Mestre (catálogo fechado de 45; nada entra na LI sem vínculo homologado; legado é evidência, não regra; identidade não se presume por nome). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO — não implementado, não registrado no banco, não homologado.
