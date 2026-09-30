# Relatório de exemplo — paciente FICTÍCIA

> **Tudo aqui é inventado.** Nenhum dado de paciente real, nada copiado do
> Supabase. Os números do HOLOSCAN não foram escritos à mão: saíram do motor do
> app (`holoscan.js`, `HOLOSCAN.calcular` e `HOLOSCAN.lerExames`) rodando sobre
> respostas e exames inventados, para que sejam coerentes entre si como na tela.
> Formato: o da aba **Relatório**, registro **"Para a nutricionista"**, como
> descrito em [`mapa-do-relatorio.md`](./mapa-do-relatorio.md). Estado do código:
> branch da Rodada 08 (em produção, "médio" ainda aparece "medio").

---

**Nutricionista Exemplo**
*Nutrição Holística · Cidade Fictícia*

### Mapa HOLOS · Laura Exemplo

30/09/2026 · cobertura 95%

*Avaliação nutricional integral construída a partir do que o paciente relata.
Não é exame, não é diagnóstico médico e não substitui avaliação clínica.*

---

## A. HOLOSCAN — o que o paciente relatou

Aplicado em 22/09/2026

### Mapa de prioridades

- **Sistema Metabólico** — 2.3 · 19 de 19 respondidas · faixa baixo
- **Sistema Fúngico** — 5.6 · 14 de 15 respondidas · faixa médio
- **Sistema Mental-Emocional-Espiritual** — 5.8 · 29 de 29 respondidas · faixa médio
- **Sistema Detox + Linfático** — 7.3 · 15 de 16 respondidas · faixa alto
- **Sistema Ácido-Inflamatório** — 7.5 · 14 de 16 respondidas · faixa alto

### Sinais dominantes

- **Sistema Fúngico** — distensão abdominal após refeição, micose recorrente,
  sensação de vida bagunçada, desconexão com a natureza, névoa mental após
  carboidrato
- **Sistema Ácido-Inflamatório** — dificuldade de dizer não, dor de cabeça
  frequente, rigidez ao acordar, marcador inflamatório alterado no exame, engolir
  o que gostaria de dizer
- **Sistema Metabólico** — sensação de vazio, ausência de direção, sonolência
  forte depois do almoço, compulsão ou beliscar à noite, escurecimento nas dobras
  da pele
- **Sistema Detox + Linfático** — dificuldade de dizer não, mal-estar com alimento
  gorduroso, mágoa antiga não resolvida, mágoa que trava o fluxo, retenção de
  líquido
- **Sistema Mental-Emocional-Espiritual** — sensação de vazio, vida no
  automático, pensamento tudo ou nada, corpo visto como adversário, autossabotagem
  recorrente

### Tríada

Físico **5.3** · Mental **5.9** · Espiritual **5.1**

*(Bloco "Leitura combinada": não aparece — está desligado no app.)*

### Os cinco sistemas

| Sistema | Nota | Faixa |
|---|---|---|
| Sistema Metabólico | 2.3 | baixo |
| Sistema Fúngico | 5.6 | médio |
| Sistema Mental-Emocional-Espiritual | 5.8 | médio |
| Sistema Detox + Linfático | 7.3 | alto |
| Sistema Ácido-Inflamatório | 7.5 | alto |

Em cada um: *Área do mapa. Investigar com mais profundidade na consulta.*

*Os cinco sistemas são categorias de organização do mapa, não categorias de doença.*

### Índice HOLOS (informação secundária)

**57** de 100

*O Índice HOLOS resume as respostas deste mapa e não representa percentual de saúde.*

---

## B. Leitura Integrada (Holoscan) — o que os exames acrescentam

- **Sistema Fúngico** — Convergente. Relato e dados laboratoriais disponíveis
  estão convergentes nesta dimensão.
- **Sistema Ácido-Inflamatório** — Convergente. Relato e dados laboratoriais
  disponíveis estão convergentes nesta dimensão.
- **Sistema Metabólico** — Convergente. Existe convergência entre o relato do
  paciente e os dados laboratoriais nesta dimensão.
- **Sistema Detox + Linfático** — Convergente. Relato e dados laboratoriais
  disponíveis estão convergentes nesta dimensão.
- **Sistema Mental–Emocional–Espiritual** — Divergente. O relato e os dados
  laboratoriais não estão caminhando na mesma direção neste momento.

*A Leitura Integrada organiza informações laboratoriais para apoiar a
interpretação profissional. Não realiza diagnóstico.*

---

## C. Consultas e acompanhamento

3 consultas registradas.

- **14/10/2026** · 09:00 · Retorno
- **22/09/2026** · 10:00 · Reavaliação HOLOSCAN
- **25/08/2026** · 14:30 · Primeira consulta

---

## D. Documentos e materiais

2 documentos registrados.

- **Exames de setembro** · Exame laboratorial · 15/09/2026
- **Termo assinado** · Termo de consentimento · 25/08/2026

---

## E. Interpretação profissional — *escrito pela nutricionista*

Mapa com o Metabólico como terreno mais carregado, e o relato bate com os exames
desta dimensão. O que mais pesou foi vazio e falta de direção, junto com a
sonolência depois do almoço e o beliscar à noite. No Mental-Emocional-Espiritual o
relato e os exames não vão na mesma direção: aprofundar na próxima consulta.
Retorno marcado para 14/10.

---

*(assinatura e carimbo)*

Nutricionista Exemplo · CRN-0 00000 (fictício)
(00) 00000-0000 · @exemplo

Documento gerado pelo HoloHacking. Os marcadores e as faixas ainda estão em
revisão pelo autor do método. Queixa que sugira doença deve ser encaminhada ao
médico.

---

## Fora do relatório — os dados inventados que geraram o exemplo

O relatório **não mostra** os valores dos exames; eles ficam na aba Documentos e
na tela Leitura Integrada. Para o agente entender de onde saiu a seção B:

| Exame (fictício) | Valor | Unidade | Faixa cadastrada | Situação |
|---|---|---|---|---|
| Candida albicans IgG | 0.4 | índice | 0 a 0.9 | na faixa |
| PCR ultrassensível | 0.8 | mg/L | 0 a 1 | na faixa |
| Glicemia de jejum | 97 | mg/dL | 70 a 90 | acima |
| Insulina de jejum | 9.1 | uUI/mL | 2 a 6 | acima |
| HOMA-IR | 2.2 | índice | 0 a 1.8 | acima |
| Triglicerídeos | 138 | mg/dL | 40 a 100 | acima |
| HDL | 48 | mg/dL | 55 a 100 | abaixo |
| TGP (ALT) | 24 | U/L | 10 a 26 | na faixa |
| Vitamina D (25-OH) | 27 | ng/mL | 40 a 60 | abaixo |
| Ferritina | 62 | ng/mL | 50 a 150 | na faixa |

- Metabólico: nota 2.3 (≤ 3, relato comprometido) e 5 de 5 exames fora da faixa → Convergente.
- Mental-Emocional-Espiritual: nota 5.8 (> 3) e 1 de 2 exames fora (vitamina D) → Divergente.
- Os outros três: nota > 3 e nenhum exame fora → Convergente ("sem alteração").
- Questionário: 80 das 84 perguntas respondidas (95%).
