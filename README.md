# Holos Company

**Promessa:** transformar informações fragmentadas em uma visão clínica mais clara, organizada e
aplicável.

Método: **Nutrição Holística**, de **Rodrigo Mendanha** — livro publicado em 2025,
ISBN 978-65-987413-0-3. O movimento se chama Renascentismo Nutricional.

🔱 **[O que está dentro do quê](https://claude.ai/code/artifact/4ff7b29a-b2bf-4003-bbfc-fd930dfd58fc)** — o mapa de arquitetura. Resolve a confusão de nomes.

---

## A arquitetura

Um método, duas telas, três etapas.

```
Nutrição Holística ─ o método. O livro. Não é software.
  │
  ├─ HoloHacking ─ a plataforma clínica (o que a nutricionista compra)
  │     ├─ Holoscan ──► Holoscope ──► Holos AI
  │     │   lê dados      mapeia        apoia
  │     └─ 30 ferramentas clínicas em Corpo, Mente e Espírito
  │
  └─ App de Nutrição Holística ─ o app do PACIENTE
        jornada diária, práticas, hábitos, conteúdo
```

**Nome oficial:** **HoloHacking** (sem "s") — *a plataforma clínica da Nutrição
Holística*. Decidido em 27/08/2026.

**A regra que decide qualquer dúvida futura:** o que se vende é o HoloHacking, com o
app do paciente do outro lado da mesma assinatura. Holoscan, Holoscope e Holos AI
são partes dele — podem ganhar destaque comercial, mas não são softwares separados.

### As três etapas

| Etapa | Nas palavras do Rodrigo | Estado |
| --- | --- | --- |
| **Holoscan** | "Leitura e organização de dados, sinais, exames e padrões" | ❌ não existe — exame laboratorial não entra em lugar nenhum |
| **Holoscope** | "Mapeamento integral do paciente" | ✅ [motor construído](./Holos%20AI/motor/), determinístico e auditável |
| **Holos AI** | "Apoio ao raciocínio, planejamento, comunicação e acompanhamento" | ✅ construído, nunca rodou (falta credencial da API) |

### As subferramentas são entrada ou saída, não ferramentas

| Nome comercial | O que é | Onde está |
| --- | --- | --- |
| BioRoot™ | **entrada** — bloco físico | `bancos/sintomas.csv` |
| NeuroScan™ | **entrada** — bloco emocional | `bancos/emocoes.csv` |
| SoulIndex™ | **entrada** — bloco espiritual | `bancos/espiritual.csv` |
| Triada HOLOS® | **saída** — gráfico calculado | `src/motor.ts` |
| Mapa de Frequências™ | **saída** — gráfico calculado | `src/motor.ts` |

---

## Onde está cada coisa

| Pasta | O que guarda |
| --- | --- |
| [Holos AI/motor/](./Holos%20AI/motor/) | **O código.** Motor de pontuação, corpus do livro, agentes, 38 testes |
| [Holos AI/](./Holos%20AI/) | Documentos para o Rodrigo e o material original |
| [Holoscope/](./Holoscope/) | Material original do HOLOSCOPE (11/08) |
| [Holohacking/](./Holohacking/) | Material original — 1 parágrafo |
| [Agentes de IA Holos/](./Agentes%20de%20IA%20Holos/) | Material original — 1 lista |
| [Holoscan/](./Holoscan/) | Sem material próprio; o papel dele está definido no item acima |

---

## As três dúvidas de 11/08 — respondidas em 27/08

Ficaram abertas por três meses. O material do Rodrigo já continha a resposta das
três, num bloco que tinha se perdido no meio do resto ("sugestão de diferenciação
conceitual").

**1. Holoscope e Holos AI descreviam o mesmo motor.** Resolvido: não descrevem.
O Holoscope **mapeia** (e o cálculo é dele); o Holos AI **apoia** — escreve o
relatório, responde dúvida do método, acompanha em 4/8/12 semanas.

**2. O Holoscan tinha sumido.** Resolvido, e ao contrário do que parecia: ele não
é nome sobrando, é **buraco real**. O material lista "exames laboratoriais" como
a primeira coisa que o paciente preenche, e não existe nada hoje que receba exame.

**3. O papel do Holos AI mudou entre um material e outro.** Continua sendo a única
contradição de verdade: um bloco diz "apoio", outro diz que ele "classifica nos 5
sistemas e gera a pontuação".

> **Vale ficar com "apoio", por motivo técnico.** A pontuação precisa ser
> determinística — mesma resposta, mesmo número, sempre. Chamar isso de "AI" faz
> supor que é generativo, e no dia em que uma nutricionista aplicar duas vezes no
> mesmo paciente e vir 62 e depois 71, o produto perde a credibilidade clínica que
> ele vende. É como já está construído: o cálculo não usa IA nenhuma.

---

## O gargalo real

Não é mais o corpus — o livro está indexado, 258 trechos, e a IA responde citando
capítulo e página. O gargalo agora é o que **só o Rodrigo** pode dar:

- **as 15 leituras combinadas** (existem 5) — é o que separa o HOLOSCOPE de um formulário;
- **os chacras**, sem os quais o Mapa de Frequências não existe (o livro não menciona chacra em nenhuma das 145 páginas);
- **o peso de cada sistema** no Índice HOLOS — hoje é 20% para cada, escolha de programador;
- **a revisão dos 87 marcadores** já rascunhados, marcando aceito / corrijo / fora / falta.
