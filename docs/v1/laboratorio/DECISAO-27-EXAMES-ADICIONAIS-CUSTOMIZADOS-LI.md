# DECISÃO 27 — Exames adicionais/customizados

Etapa 5.9 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 27 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). **Dependências:** DECISÃO 01 (regra 6: sem vínculo aprovado fica fora da LI), 02 (vínculo só para `exam_code` do catálogo), 04 (regras 16 e 18: customizado não participa automaticamente; item fora do catálogo exige vínculo explícito homologado).

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nada preenchido por legado, nome parecido, categoria, conhecimento geral, inferência clínica ou "parece lógico". Campos DECISÃO, RESPONSÁVEL e DATA vazios. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
