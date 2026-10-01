# PENDÊNCIA DE HOMOLOGAÇÃO — SNT-101 e SNT-501

Gerado por `scripts/inventario-metodologico.mjs` a partir dos bancos atuais. **Nada foi corrigido.** Os dois IDs aparecem em DUAS linhas primárias cada um, com sistemas e pesos diferentes. O Mestre (§12) é explícito: "IDs como SNT-101 e SNT-501 exigem revisão dos vínculos, sem herdar automaticamente pesos inconsistentes encontrados no AS-IS". Enquanto a decisão humana não existir, **nenhuma saída oficial pode depender destes vínculos**.

Status no inventário recuperado: **PENDENTE DE HOMOLOGAÇÃO** (os dois) — registro histórico, preservado sem alteração.

> **Etapa 4.2 — DECISÕES METODOLÓGICAS V1 FECHADAS.** SNT-101: primário pontuável **Sistema Fúngico**, peso 1; Metabólico como `secondary_contextual`, sem contribuição numérica (linha histórica SNT-302, não recriada) — Decisão 5. SNT-501: primário pontuável **Sistema Mental Emocional Espiritual**, peso 1; Metabólico como `secondary_contextual`, sem contribuição numérica (linha histórica SNT-310, não recriada) — Decisão 6. Tríada de ambos: eixo físico, peso 1. Contexto: `ultimos_30_dias`. Aplicado só na **nova versão candidata** do pacote (HOLOS-V1@2); este inventário e o pacote importado (HOLOS-V1@1) continuam como histórico. Ver `PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`.

## SNT-101 — vontade intensa e recorrente de doce

- **Enunciado:** Você sente vontade forte de doce ou pão quase todo dia?
- **Bloco:** fisico
- **Cobertura:** conta UMA vez (por ID) na cobertura; pontua em DOIS sistemas com pesos diferentes
- **Tríada atual:** eixo fisico, peso usado 2 (primeira linha primaria do banco (motor.ts); a segunda linha nao entra na Triada)

### Linhas atuais (duplicadas)

| Arquivo:linha | Sistema | Peso | Escala | Sentido | Chacra | Território | Fonte | Status |
|---|---|---|---|---|---|---|---|---|
| motor/bancos/sintomas.csv:2 | fungico | 2 | frequencia | direto | sacral | comportamento | rascunho-literatura-funcional | rascunho |
| motor/bancos/sintomas.csv:24 | metabolico | 3 | frequencia | direto | sacral | comportamento | rascunho-literatura-funcional | rascunho |

### Associações atuais

| Destino | Peso | Papel | Conflito |
|---|---|---|---|
| system:fungico | 2 | primaria | sim — mesmo ID em 2 linhas primarias (fungico peso 2 / metabolico peso 3) |
| system:metabolico | 3 | primaria | sim — mesmo ID em 2 linhas primarias (fungico peso 2 / metabolico peso 3) |
| triad:fisico | 2 | derivada | vinculo com a Triada implementado por derivacao da origem, nao por tabela aprovada (Mestre §17) |

### Onde mais aparece (cópia anterior dos bancos)

| Arquivo:linha | ID na cópia | Sistema | Peso | Enunciado |
|---|---|---|---|---|
| Holos AI/motor/bancos/sintomas.csv:2 | SNT-101 | fungico | 2 | Você sente vontade forte de doce ou pão quase todo dia? |
| Holos AI/motor/bancos/sintomas.csv:24 | SNT-302 | metabolico | 3 | Você sente vontade forte de doce ou pão quase todo dia? |

### Diferenças encontradas

- pesos diferentes por sistema (fungico 2 × metabolico 3)
- na copia anterior (Holos AI/motor) a linha do metabolico tinha o ID SNT-302 — o ID foi unificado depois, sem registro de decisao
- territorio "comportamento" nas duas linhas; chacra "sacral" nas duas

### Decisão necessária

Confirmar se o item contribui para um ou dois sistemas, com que peso em cada um, e qual eixo/peso vale na Triada. Nada e corrigido por inferencia.

## SNT-501 — sono não reparador

- **Enunciado:** Você acorda cansado mesmo dormindo as horas necessárias?
- **Bloco:** fisico
- **Cobertura:** conta UMA vez (por ID) na cobertura; pontua em DOIS sistemas com pesos diferentes
- **Tríada atual:** eixo fisico, peso usado 2 (primeira linha primaria do banco (motor.ts); a segunda linha nao entra na Triada)

### Linhas atuais (duplicadas)

| Arquivo:linha | Sistema | Peso | Escala | Sentido | Chacra | Território | Fonte | Status |
|---|---|---|---|---|---|---|---|---|
| motor/bancos/sintomas.csv:32 | metabolico | 2 | frequencia | direto | — | sistema_nervoso | rascunho-literatura-funcional | rascunho |
| motor/bancos/sintomas.csv:43 | mental_emocional_espiritual | 3 | frequencia | direto | — | sistema_nervoso | rascunho-literatura-funcional | rascunho |

### Associações atuais

| Destino | Peso | Papel | Conflito |
|---|---|---|---|
| system:metabolico | 2 | primaria | sim — mesmo ID em 2 linhas primarias (metabolico peso 2 / mental_emocional_espiritual peso 3) |
| system:mental_emocional_espiritual | 3 | primaria | sim — mesmo ID em 2 linhas primarias (metabolico peso 2 / mental_emocional_espiritual peso 3) |
| triad:fisico | 2 | derivada | vinculo com a Triada implementado por derivacao da origem, nao por tabela aprovada (Mestre §17) |

### Onde mais aparece (cópia anterior dos bancos)

| Arquivo:linha | ID na cópia | Sistema | Peso | Enunciado |
|---|---|---|---|---|
| Holos AI/motor/bancos/sintomas.csv:32 | SNT-310 | metabolico | 2 | Você acorda cansado mesmo tendo dormido o suficiente? |
| Holos AI/motor/bancos/sintomas.csv:43 | SNT-501 | mental_emocional_espiritual | 3 | Você acorda cansado mesmo dormindo as horas necessárias? |

### Diferenças encontradas

- pesos diferentes por sistema (metabolico 2 × mental_emocional_espiritual 3)
- na copia anterior (Holos AI/motor) a linha do metabolico era SNT-310 ("cansaco ao acordar mesmo dormindo", enunciado diferente) — unificada depois, sem registro de decisao
- eixo da Triada derivado como fisico pela origem; o sistema mental_emocional_espiritual nao muda isso

### Decisão necessária

Confirmar se o item contribui para um ou dois sistemas, com que peso em cada um, e qual eixo/peso vale na Triada. Nada e corrigido por inferencia.

