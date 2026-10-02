# DECISÃO 03 — ELEGIBILIDADE DA APLICAÇÃO HOLOSCAN NA LEITURA INTEGRADA

Etapa 5.5 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 3 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende das DECISÕES 01 (7 domínios) e 02 (vínculos).

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor sugerido; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta

**QUAL APLICAÇÃO HOLOSCAN PODE PARTICIPAR DA LEITURA INTEGRADA?**

## Por que

A LI compara o laboratório com **uma** aplicação HOLOSCAN; qual aplicação entra muda o resultado e a rastreabilidade. A relação domínio → sistema(s) HOLOSCAN só existirá por regra homologada (DECISÃO 01, regra 3), mas a aplicação precisa ser elegível antes de qualquer regra.

## Estado atual

- UI: seleção **explícita** de 1 aplicação consolidada (lista com data clínica, estrutura, cobertura, id); nunca "a última".
- Dado da aplicação: `holoscan_applications` (`quando`, `versao_estrutura`, `cobertura`, `avaliavel`, `methodology_package_id`); scores por sistema em `holoscan_system_scores` (nota/faixa nulas quando não avaliável).
- Barreira da Etapa 4: HOLOS-V1@2 está `em_revisao` → **nenhuma aplicação hoje tem resultado oficial**; o motor da LI devolve `holoscan_nao_avaliavel` quando o sistema não tem nota.
- Não existe "aplicação revisada" como estado próprio hoje (há consolidada = salva no servidor; "revisão" é nova aplicação).

## Opções (sem recomendação)

| Opção | O que significa | Consequência |
|---|---|---|
| (a) Somente aplicação consolidada (salva no servidor) | qualquer aplicação gravada entra | base maior; inclui aplicações com baixa cobertura ou de pacote não aprovado — exige combinar com (e)/(f) |
| (b) Somente aplicação revisada | exigiria um estado "revisada" (ato humano) que **não existe** no modelo atual | extensão de schema/UI; menos aplicações elegíveis; mais rastreabilidade humana |
| (c) Salva mas não revisada | igual a (a) enquanto não existir "revisada" | — |
| (d) Aplicação parcial (cobertura abaixo do mínimo do pacote) | entra mesmo sem resultado por sistema | o domínio cai em `holoscan_nao_avaliavel` → `sem_dados_suficientes`; aceitar só gera trace, não leitura |
| (e) Aplicação não avaliável (`avaliavel = false`) | idem | idem (d) |
| (f) Versão metodológica diferente da vigente | aplicação calculada com outro `methodology_package_id` | compara notas de pacotes distintos; comparabilidade exige mesma estrutura (Etapa 4.2); aceitar exige marcar não comparável |
| (g) Aplicação histórica anterior (qualquer data) | sem limite temporal próprio; a janela (bloco 5) decide | depende do bloco 5; sem janela, uma aplicação antiga pode ser comparada a coleta recente |
| (h) Aplicação escolhida manualmente (como hoje) | a profissional escolhe, sob as restrições acima | nenhuma automação; o sistema valida só elegibilidade |
| (i) Exigir pacote HOLOSCAN `aprovado` para a aplicação | só aplicações com resultado oficial | LI indisponível até a homologação do HOLOS-V1@2 (dupla aprovação com identidade real); coerente com a barreira da Etapa 4 |

Combinações são possíveis (ex.: (h) + (i) + `avaliavel` + cobertura mínima ___). Nenhuma é recomendada aqui.

## Incompatíveis com o Mestre / decisões anteriores

Escolha automática por `updated_at`; aplicação não consolidada (local, não salva); aplicação cujo resultado não é oficial alimentar saída oficial (Etapa 4); inferir sistema ↔ domínio pelo nome (DECISÃO 01).

## O que fica bloqueado enquanto aberto

Montagem do par HOLOSCAN × laboratório; blocos 5, 6, 20.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
