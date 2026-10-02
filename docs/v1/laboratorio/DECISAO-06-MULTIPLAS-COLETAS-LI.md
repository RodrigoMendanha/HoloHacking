# DECISÃO 06 — MÚLTIPLAS COLETAS ELEGÍVEIS NA JANELA

Etapa 5.5 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 6 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` · depende das DECISÕES 01 (7 domínios) e 02 (vínculos).

> **NADA DECIDIDO.** Opções apresentadas sem recomendação; nenhum valor sugerido; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta

**SE EXISTIREM MÚLTIPLAS COLETAS ELEGÍVEIS (COM O MESMO EXAME) DENTRO DA JANELA, QUAL O SISTEMA DEVE USAR?**

## Por que

A contagem de suficiência (bloco 16) e de "fora/dentro" (bloco 19) muda conforme um exame repetido conte uma ou várias vezes, e conforme qual valor é usado.

## Estado atual

- Motor conta **cada resultado** incluído: o mesmo exame em duas coletas selecionadas conta duas vezes.
- UI permite marcar N coletas; nenhuma deduplicação.
- A data relevante é **`coletado_em` (clinical_date / data da coleta)**. **PROIBIDO**: "última modificada por `updated_at`" (o painel legado escolhia "valores atuais" por `updated_at` — LEGADO, incompatível).

## Opções (sem recomendação)

| Opção | Regra | Consequências |
|---|---|---|
| (a) Seleção manual | a profissional escolhe uma coleta por exame (UI por exame) | nenhuma decisão automática; mais cliques; rastreável |
| (b) Mais próxima da aplicação | menor `|coletado_em − quando|` | simétrica; empate precisa de regra; extensão pequena do motor |
| (c) Última antes da aplicação | maior `coletado_em ≤ quando` | privilegia o estado laboratorial que precede o relato; ignora coletas posteriores |
| (d) Primeira depois da aplicação | menor `coletado_em ≥ quando` | privilegia o exame feito a partir do relato; ignora anteriores |
| (e) Todas dentro da janela | cada resultado conta (como hoje) | infla suficiência; um mesmo exame pode estar "fora" e "dentro" ao mesmo tempo (vira caso de mistos, bloco 19) |
| (f) Regra por domínio/exame | (b)/(c)/(d) escolhidas por domínio ou por vínculo | precisão, mais regras a homologar e explicar |
| (g) Combinação manual | o sistema propõe por (b)/(c)/(d) e a profissional confirma ou troca | automação explicável + confirmação humana; extensão de UI |

Empate (duas coletas na mesma data clínica): precisa de regra explícita em qualquer opção automática (ex.: exigir escolha manual); **nunca** `created_at`/`updated_at`.

## Consequência matemática

(a)–(d),(f),(g): suficiência = nº de exames distintos; (e): suficiência = nº de resultados. A escolha interage com o bloco 5 (quantas coletas cabem na janela) e com o bloco 25 (comparabilidade de leituras).

## Incompatíveis

Qualquer escolha por `updated_at`/`created_at`; escolha implícita não registrada no trace.

## O que fica bloqueado enquanto aberto

Denominadores dos blocos 16–19.

## Campo DECISÃO

DECISÃO (opção: ______ · regra de empate: ______): ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
