# DECISÃO 24 — TEXTOS EXIBIDOS AO PACIENTE

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 24 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende do bloco 23.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhuma regra clínica deduzida do legado; nenhuma relação domínio LI → sistema HOLOSCAN criada; nenhum score, peso, corte ou bibliografia. Campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

## Pergunta (como no pacote)

**Se a Leitura Integrada aparece em algum material voltado ao paciente (relatório entregue, resumo) e, se sim, com qual texto — ou se é restrita à profissional na V1.**

## Estado atual

Nenhuma superfície voltada ao paciente mostra a LI; o relatório clínico (Etapa 3) é da profissional e inclui a LI só se salva e selecionada (hoje só `sem_dados_suficientes`). Nenhum texto ao paciente existe nem é escrito aqui.

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
| (a) LI não aparece ao paciente na V1 | nenhum texto a homologar; zero risco de leitura diagnóstica |
| (b) aparece só o estado, com texto aprovado específico para paciente | texto adicional a homologar; precisa explicar o que convergente/divergente **não** significa |
| (c) aparece com explicação dos limites (não diagnóstico, não culpa, não conduta) | mais texto; mais clareza |
| (d) aparece só a lista factual (exames, datas, referências do laudo), sem estado da LI | fato, não leitura |

## Incompatíveis

Texto que o paciente leia como diagnóstico, culpa ("você relata mas o exame não mostra") ou conduta.

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
