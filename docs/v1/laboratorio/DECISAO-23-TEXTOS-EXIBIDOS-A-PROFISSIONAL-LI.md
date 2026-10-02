# DECISÃO 23 — TEXTOS EXIBIDOS À PROFISSIONAL

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 23 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende dos blocos 20–22 (estados e motivos) e da DECISÃO 01 (nomes dos domínios).

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhuma regra clínica deduzida do legado; nenhuma relação domínio LI → sistema HOLOSCAN criada; nenhum score, peso, corte ou bibliografia. Campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta (como no pacote)

**Texto oficial, por estado (e por domínio, se for o caso), mostrado na ficha, no Confronto e no relatório clínico.** Este bloco **é** o que decide esses textos; **nenhum texto oficial é escrito aqui** — só requisitos e opções.

## Estado atual

Regra `text` (`payload.{convergente, divergente, sem_dados_suficientes}`, global ou por domínio): **0 linhas**. Sem texto aprovado, a UI mostra só estado, motivos e trace. Barreira de Conduta ativa.

## Requisitos já fixados para qualquer texto oficial

- texto **neutro**, linguagem **não diagnóstica**;
- explicação das **fontes usadas** (aplicação, coletas, resultados, referências, pacote/versão);
- **motivos de exclusão** visíveis;
- **versão/regra** aplicada visível;
- **observação profissional separada** do texto do sistema;
- **proibido** "exame confirma diagnóstico", "exame comprova/desmente o relato";
- **proibido** "saudável", "normal", "sem prioridade" por ausência de alterações (convergente sem alteração não é atestado de saúde);
- **proibido** conduta ("recomenda", "prescreve", "solicite", "encaminhe", "suplementar");
- textos do legado (`HOLOSCAN_TEXTO`, `leitura_*` causais) **não** entram sem decisão.

## Opções (sem decidir)

| Opção | Consequência |
|---|---|
| (a) um texto global por estado (3 textos) | mínimo a homologar; genérico |
| (b) texto por domínio (7 × 3) | específico; 21 textos a homologar |
| (c) textos distintos por sentido da divergência e por "convergente com/sem alteração" (depende dos blocos 20–21) | mais estados textuais |
| (d) texto = estado + motivos + fontes gerados por template neutro aprovado (sem frase clínica) | explicabilidade máxima com um só template |

## Incompatíveis

Texto causal; conclusão de diagnóstico, normalidade ou prioridade; conduta; herdar os 4 textos fixos do legado sem decisão.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
