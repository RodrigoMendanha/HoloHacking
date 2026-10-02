# DECISÃO 12 — COMPATIBILIDADE DE MATERIAL

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 12 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor, faixa, fator ou equivalência proposto; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta

**Quando materiais diferentes do mesmo exame são compatíveis para vínculo, referência, classificação e comparação — e como tratar material ausente?**

**Não inventar material ausente.** O legado nunca registrou material; na migração ele ficou nulo (inclusive para Mg eritrocitário).

## Estado atual

`material` texto livre, explícito, nunca inventado; faz parte da identidade (exame, variante, material); referência que declara material diferente → `incompatible_material`; chave presente com valor nulo exige material nulo no resultado. DECISÃO 04 regra 13: incompatibilidade afeta aquele resultado/vínculo.

## Materiais a considerar (somente se realmente registrados no resultado)

soro · plasma · sangue total · eritrocitário · outros declarados no laudo. Nenhuma lista fixa existe no sistema; nenhuma é criada aqui.

## Opções (sem decidir)

| Opção | Consequência |
|---|---|
| (a) material faz parte da identidade; nulo só casa com nulo (como hoje) | legado só se compara com legado; máximo rigor |
| (b) nulo compatível com qualquer material informado | mais comparações; risco de comparar compartimentos distintos |
| (c) lista de equivalências aprovadas (ex.: soro ≈ plasma para exames listados), com fonte | extensão de tabela; decisão por exame |
| (d) vocabulário controlado de materiais | extensão; reduz falsos incompatíveis por grafia |

## O que fica bloqueado enquanto aberto

Nada tecnicamente (default = (a)).

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
