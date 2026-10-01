# O QUE DANIEL / LIDERANÇA DO MÉTODO PRECISA DECIDIR?

> **ETAPA 4.2 — DECISÕES METODOLÓGICAS V1 FECHADAS.** Todos os itens abaixo foram decididos
> (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`) e aplicados na nova versão candidata do pacote
> (HOLOS-V1@2, `em_revisao`, 0 bloqueios metodológicos no validador). Este documento fica como
> registro histórico do que estava pendente. **PUBLICAÇÃO TÉCNICA PENDENTE DE VALIDAÇÃO NO BANCO
> REAL.**

Etapa 4 — 01/10/2026. Base: `inventario-metodologico-v1.json` (verdade executável) e
`MATRIZ-HOMOLOGACAO-V1.md` (item a item).

Este documento lista **somente decisões metodológicas**. Nada aqui foi decidido pelo código.
Tudo o que existe hoje está importado como **RASCUNHO / PARA HOMOLOGAÇÃO**. Enquanto essas
decisões não forem tomadas e registradas (`methodology_homologation_records`, com responsável
humano), nenhum resultado do HOLOSCAN é oficial: nota, faixa, Índice, Tríada, comparação e
sugestão continuam bloqueados pela barreira central (`window.Metodologia`).

Hoje o validador de publicação aponta **12 bloqueios** no pacote rascunho importado
(`PacoteMetodologico.validar` / `validar_pacote_metodologico`). Cada bloco abaixo diz quais
deles a decisão resolve.

---

## 1. Os cinco sistemas

- Confirmar os **nomes oficiais**. A grafia recuperada difere do Mestre
  ("Sistema Ácido-Inflamatório" × "Sistema Ácido Inflamatório"; "Sistema Detox + Linfático" ×
  "Sistema Detox e Linfático"). Nenhuma renomeação foi feita.
- Aprovar ou reescrever os **textos de cada sistema** (definição, padrão emocional, impacto
  espiritual, texto ao paciente). Os textos atuais não foram validados clinicamente.

## 2. Questionário — 84 itens

- Confirmar que a **edição V1 tem exatamente estes 84 IDs** (49 físico, 19 mental/emocional,
  16 espiritual/propósito) e os **enunciados** atuais.
- Decidir o destino de **EMO-506**: existia numa cópia antiga do banco e não existe no ativo.
  Não foi recriado nem descartado.
- Definir o **contexto temporal** de cada bloco (ex.: "últimos 30 dias"). Hoje não existe.

## 3. Escalas

- Confirmar a **escala 0–3** e os **rótulos** recuperados, ou definir outra. Hoje existem
  duas: frequência (Nunca / Às vezes / Frequente / Sempre) em 73 itens e intensidade
  (Nada / Um pouco / Bastante / Muito) em 11 itens (5 físicos, 6 espirituais). É "estrutura
  recuperada", não edição oficial.
- Confirmar, item a item, **qual escala** cada pergunta usa.

## 4. Inversões

- Validar, item a item, as **9 perguntas invertidas** recuperadas do banco: SNT-507, EMO-507,
  ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501. Nenhuma inversão foi deduzida do texto da pergunta.
- Confirmar que **todas as demais são diretas**. Para o motor genérico, orientação ausente
  não vira "direta": item sem orientação aprovada bloqueia a publicação.

## 5. Associações e pesos

- Aprovar o **vínculo pergunta → sistema** e o **peso** de cada um dos 84 itens
  (pesos atuais 1 a 3, matriz tema "Associação/Peso").
- Decidir as **associações secundárias** das 9 emoções com dois sistemas. Hoje o peso
  secundário é igual ao primário (`peso_secundario_fator = 1`, anotado "decidido 27/08" sem
  registro de homologação). Essas 9 secundárias **não** geram bloqueio próprio no validador.
  *(Correção, Etapa 4.2: a versão anterior deste item dizia que ele "resolve 4 bloqueios
  `conflito_pendente`". Está errado: os 4 `conflito_pendente` vêm das quatro linhas primárias
  de SNT-101 (Fúngico/Metabólico) e SNT-501 (Metabólico/Mental Emocional Espiritual) e se
  resolvem no item 6.)*

## 6. SNT-101 e SNT-501 (ver `PENDENCIA-SNT-101-SNT-501.md`)

- **SNT-101**: hoje conta para Fúngico (peso 2) **e** Metabólico (peso 3), em duas linhas
  primárias. Decidir: um sistema só, os dois (com qual papel e peso), ou outro desenho.
- **SNT-501**: hoje conta para Metabólico (peso 2) **e** Mental Emocional Espiritual (peso 3).
  Mesma decisão. → resolve o bloqueio `snt_pendente` **e os 4 bloqueios `conflito_pendente`**
  (as duas linhas de cada ID).

## 7. Parcialidade (ausência)

Hoje: **SEM POLÍTICA OFICIAL APROVADA**. Dados são guardados e a cobertura é mostrada, mas
nenhuma nota que dependa disso é oficial. Decidir:

- **Denominador**: só itens respondidos, ou todos os itens do sistema/eixo.
- **Cobertura mínima** por sistema, eixo e Índice (o corte de 50% foi removido na Etapa 0
  e não foi reintroduzido; nenhum número foi escolhido).
- Tratamento de **"recusou responder"** e **"não se aplica"**.
- **Mínimos** de itens por sistema/eixo.
- **Redistribuição** de peso quando um sistema não é avaliável.
  → resolve o bloqueio `politica_parcialidade_ausente`.

## 8. Cobertura

- Confirmar que a **cobertura de preenchimento** (IDs respondidos ÷ 84) é apenas informativa
  e não decide avaliabilidade. É o único número exibido hoje.

## 9. Faixas

- Aprovar ou reescrever os **limites** (hoje ≤3 baixo, 3–6 médio, >6 alto em nota 0–10),
  a **inclusividade** das bordas, os **rótulos** e as **mensagens** (nutricionista e paciente)
  de cada sistema. As 15 faixas recuperadas não têm lacuna nem sobreposição; isso não as torna
  corretas.

## 10. Índice HOLOS

- Definir os **pesos α** dos cinco sistemas (hoje 0,20 cada — valor recuperado, não decisão).
- Definir a **elegibilidade**: quantos sistemas avaliáveis são necessários.
- Decidir se existe **Índice parcial** e como é rotulado. → resolve `indice_incompleto`.

## 11. Tríada

- Definir, para cada eixo (físico, mental, espiritual): **quais itens contribuem**, com **qual
  peso**, em **qual escala**, com **qual elegibilidade** e **qual agregação**. Hoje o eixo é
  derivado do bloco de origem do item, sem tabela aprovada. → resolve 3 `triada_incompleta`.

## 12. Comparabilidade entre aplicações

- Definir quando duas aplicações do HOLOSCAN podem ser comparadas (mesma edição? mesmos itens?
  mesma escala e pesos? cobertura mínima? janela de tempo?). Hoje não existe regra e a Evolução
  não calcula delta.

## 13. Combinações e sugestões

- **CMB** (16 combinações): CMB-001 está marcada "confirmado" no CSV, mas sem pacote aprovado.
  Decidir quais existem na V1.
- **REC-001..023** e **SEL-001**: nenhuma regra de sugestão de ferramenta é aprovada; decidir
  quais existem e com quais critérios.

## 14. Exemplos de verificação

- Fornecer pelo menos **um caso de referência** (respostas → resultado esperado por sistema,
  Índice e Tríada) calculado pela liderança do método. O pacote não publica sem isso.
  → resolve `exemplo_sem_resultado`.

---

### Como uma decisão vira oficial

1. A decisão é registrada no pacote (nova versão em `rascunho`/`em_revisao`).
2. `validar_pacote_metodologico` precisa retornar **0 erros**.
3. `aprovar_pacote_metodologico` exige **responsável humano e justificativa**, grava o registro
   de homologação e o hash do conteúdo. Não existe botão "aprovar tudo".
4. Depois de aprovado, o pacote é imutável; mudança = nova versão.

### O que **não** precisa de decisão humana (o código já resolve)

IDs duplicados, referências inexistentes, ordem de faixas, imutabilidade, versionamento, trilha
de cálculo, determinismo e bloqueio de saída oficial.
