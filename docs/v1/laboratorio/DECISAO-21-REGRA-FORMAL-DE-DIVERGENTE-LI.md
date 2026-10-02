# DECISÃO 21 — REGRA FORMAL DE DIVERGENTE

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 21 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende do bloco 20 e das DECISÕES 01–19.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhuma regra clínica deduzida do legado; nenhuma relação domínio LI → sistema HOLOSCAN criada; nenhum score, peso, corte ou bibliografia. Campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta (como no pacote)

**Divergente é simplesmente `labAlterado ≠ holoAlterado` ou os dois sentidos são tratados de forma diferente: (i) HOLOSCAN alterado + laboratório não alterado; (ii) HOLOSCAN não alterado + laboratório alterado? Há exigência adicional (ex.: suficiência reforçada) para declarar divergência?**

## Estado atual

Motor: um só estado `divergente` para os dois sentidos; o trace guarda `labAlterado`/`holoAlterado`, permitindo distinguir na tela sem mudar o motor. Legado: os dois sentidos eram `diverge` com textos causais ("o que a anamnese não pega" / "o sintoma é anterior ao marcador") — **LEGADO, textos incompatíveis**.

## Invariantes já decididos que valem aqui

- Um exame fora da referência **não basta** automaticamente para convergência (Mestre; DECISÕES 02, 19).
- Divergência **não invalida** o HOLOSCAN nem o exame.
- Ausência de uma fonte (aplicação não avaliável, coleta inelegível, sem referência, fora da janela, suficiência não atingida, misto sem regra) → `sem_dados_suficientes`, **nunca** divergente.
- A relação domínio LI → sistema(s) HOLOSCAN só existe por **regra explicitamente homologada** (DECISÃO 01, regra 3); nenhuma relação é inferida pelo nome.
- Direção `above/below/any` do vínculo (DECISÃO 02) indica só o lado da referência que pode participar; não é gravidade nem estado.

## Levantamento (sem decidir)

| Tema | Opções | Consequência |
|---|---|---|
| estados | (a) único; (b) único com sub-rótulo pelo sentido; (c) dois estados distintos | (b)/(c) mais informação e mais textos a homologar (bloco 23) |
| sentido (i) HOLOSCAN alterado + lab não alterado | mesmo estado / estado próprio / exigência extra | risco de leitura "o exame desmente o paciente" — incompatível |
| sentido (ii) HOLOSCAN não alterado + lab alterado | mesmo estado / estado próprio / exigência extra | risco de leitura "achado silencioso" causal — incompatível |
| exigência adicional | suficiência reforçada para divergente; mesma suficiência de convergente | assimetria precisa de justificativa; motor exige extensão |
| mistos | regra do domínio (bloco 19) decide "lab alterado" antes | sem regra → `sem_dados_suficientes`, nunca divergente |
| ausência de fonte | sempre `sem_dados_suficientes` | **nunca** "divergente por falta" |

## Incompatíveis

Divergente invalidar relato ou exame; texto causal; divergente gerar alerta no dashboard (retirado na Etapa 0); hierarquizar qual lado "está certo".

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
