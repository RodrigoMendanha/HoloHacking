# DECISÃO 14 — RESULTADOS QUALITATIVOS

Etapa 5.7 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 14 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 07 (regra 7: qualitativo preservado, sem classificação automática) e 09.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhum corte, peso, lista obrigatória ou regra deduzida do legado; campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI. Convergente/divergente **não** são tratados aqui (blocos 20–21); nenhuma relação domínio LI → sistema HOLOSCAN é criada (bloco 20 pendente).

## Pergunta (como no pacote)

**Se e como resultados textuais ("Negativo", "Reagente", "Não detectado", "Positivo", títulos "1/80") entram na Leitura Integrada: excluídos, mapeados para um estado por tabela aprovada por exame, ou só exibidos.**

## Estado atual

`qualifier = text`, valor original preservado; motor: `not_classifiable / qualitative_without_rule`; excluído da LI; nunca `Negativo = 0`. DECISÃO 07 regra 7: referência qualitativa do laudo preservada, sem classificação automática sem regra homologada. Nenhum dos 45 exames tem regra qualitativa.

## Opções

| Opção | Efeito |
|---|---|
| (a) excluídos da LI (como hoje) | resultados qualitativos nunca contam para suficiência nem estado |
| (b) tabela aprovada de mapeamento por exame (texto esperado → estado), com fonte e versão | exige vocabulário por laboratório; cada linha é decisão metodológica |
| (c) exibidos ao lado da leitura, sem contar | transparência sem efeito no estado |
| (d) (b) só para exames listados; (a)/(c) para os demais | — |

## Consequências e dependências

(b) interage com o bloco 16 (conta como "resultado utilizável"?), 19 (como entra em mistos) e 7 (referência qualitativa do laudo). Vocabulário varia por laboratório ("Reagente" pode ser esperado ou não conforme o exame).

## Conflitos / incompatíveis

Conversão implícita para número; regra sem fonte; marcador H/L do laudo virando estado (DECISÃO 07 regra 8).

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
