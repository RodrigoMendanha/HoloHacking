# HOLOS AI

> "O agente que diagnostica o ser humano em 360°."

**O que é:** IA que identifica padrões físicos, emocionais, mentais e espirituais a partir das
respostas do nutricionista ou do paciente.

Material completo em [material-original.md](./material-original.md).

## Fluxo

**Entrada:** perguntas respondidas · sintomas · padrões emocionais · estilo de vida ·
emoções recorrentes · queixas principais

**Processamento:**
1. Classifica nos 5 sistemas
2. Gera pontuação HOLOS (0–100)
3. Identifica padrões invisíveis
4. Mapeia conexões (ansiedade → intestino → compulsão → autocrítica)
5. Cria resumo clínico holístico

**Saída:** Score HOLOS · Triada HOLOS · Mapa de Frequências · principais desequilíbrios ·
"o que está realmente acontecendo" · primeiros passos

## Pré-requisitos (o que precisa existir antes)

Esta é a lista de dependências do projeto — sem elas a IA não nasce:

1. Banco de sintomas × sistemas
2. Banco de emoções × padrões emocionais
3. Banco espiritual × valores × princípios × propósito × fé × bloqueios × chacras
4. Regras de pontuação (0 a 10 por sistema)
5. Mensagens padrão para os relatórios
6. Templates visuais

## Status

Motor L1 implementado e rodando em [`motor/`](./motor/) — pontuação determinística,
validador dos bancos e guardrail de escopo. Os 6 bancos existem em CSV, mas 66 das
67 linhas ainda são exemplo de formato, não o método. O gargalo continua sendo o
material do Rodrigo.

```bash
cd motor && node src/cli.ts pontuar casos/exemplo-01.json
```

## A definir

- **Fronteira com o [Holoscope](../Holoscope/)** — ver nota no README raiz; hoje os dois
  descrevem o mesmo motor de pontuação
- Onde a IA sugere e onde apenas organiza
- Como o profissional revisa antes de qualquer saída chegar ao paciente
- Rastreabilidade das sugestões

---

Parte da [Holos Company](../README.md).
