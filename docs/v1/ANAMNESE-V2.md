# Anamnese V2: formulário clínico rápido

Implementada localmente em 09/10/2026. **Sem migration, sem banco real e sem deploy.**

## O que muda para a nutricionista
- **Dois fluxos** com a escolha sempre visível: **Primeira consulta** e **Retorno**.
  - Se o paciente já tem uma anamnese concluída, **Retorno** vem marcado como "sugerido".
- **Primeira consulta** tem 7 blocos expansíveis, cada um com um contador de registros:
  1. Motivo e objetivo
  2. História e rotina alimentar
  3. Saúde e sintomas
  4. Medicamentos, suplementos e restrições
  5. Estilo de vida
  6. Histórico e contexto
  7. Avaliação objetiva
- **Bloco íntimo opcional:** "Campos emocionais e sentido pessoal", dentro de *Histórico e contexto*. Fica fechado por padrão e é totalmente opcional.
- **Formas de preencher:**
  - **chips**, sempre com "Outro" e texto livre;
  - **sintomas** com "Não / Às vezes / Frequente" e "+ Detalhar";
  - **listas próprias**: medicamentos e suplementos (nome, dose, frequência, observação), alergias e intolerâncias;
  - **negações explícitas**: "Não usa medicamentos", "Nega alergias" e semelhantes;
  - **medidas** com unidade: peso em kg, altura em cm ou m, circunferências e outras medidas.
- **Mapa da Rotina:** no bloco Estilo de vida, o atalho "Quer aprofundar a rotina? **Abrir Mapa da Rotina**". A anamnese guarda só o resumo.
- **Retorno**, tela "Desde a última consulta":
  - os 10 campos curtos, mais o peso atual;
  - "**Ver anamnese completa anterior**", só para leitura;
  - nenhuma cópia da anamnese inteira.
- **Criar a partir da anamnese anterior:** só na Primeira consulta.
  - Cria um **rascunho novo** com cada campo marcado "prévio — a revisar".
  - Não altera a anterior.
  - Copia da última anamnese **completa** (primeira consulta V2 ou formato antigo), nunca de um retorno.
  - Se a anterior está no formato antigo, a cópia usa o mecanismo antigo, sem conversão.
- **Detalhes do registro:** em cada bloco, um painel recolhido mostra estado, fonte, se é medido, autoria, consulta e data/hora. A nutricionista pode trocar estado e fonte ali.
- **Salvamento automático do rascunho.** O botão final é **Concluir anamnese**. Depois vêm **Marcar como revisada** e **Corrigir (nova revisão)**.
- **Resumo automático** (sem IA e sem interpretação), no fim da anamnese e na Visão geral da ficha.
  - Blocos: Objetivo principal, Pontos clínicos, Hábitos alimentares, Sintomas informados, Sintomas negados, Medicamentos e suplementos, Alergias e intolerâncias, Sono e atividade, Contexto, Medidas.
  - O texto íntimo não aparece no resumo; ele só indica que existe.
- **Depois de concluída**, a tela mostra só o que foi registrado.

## Como fica gravado (sem migration)
É a mesma linha de `anamneses`, com as mesmas RPCs (`salvar_anamnese`, `criar_anamnese_a_partir_de`), a mesma RLS, os mesmos estados (rascunho → salvo → revisado), as mesmas revisões e a mesma trava de paciente arquivado. Muda o conteúdo:
```
content = { formulario_versao: 2, tipo: "primeira" | "retorno",
            formulario: { <bloco>: { <campo>: valor } },
            meta: { "<bloco>.<campo>": { estado, origem, em, previo, fonte_anamnese_id } },
            dominios: <GERADO> }
```
O validador do servidor (`validar_conteudo_anamnese`) confere só os `dominios` e aceita as outras chaves. Por isso nada no banco precisa mudar.

## Regra rígida: `dominios` é derivado
`content.dominios` **nunca** é editado pela tela V2. Ele sai sempre de uma única função canônica, em `anamnese-v2.js`:
`gerarDominiosDaAnamneseV2(formulario, meta, tipo)`. O único caminho de gravação, `montarContent`, chama essa função a cada salvamento.

| Regra | Como fica |
|---|---|
| Campo vazio | Não gera item (vazio nunca é "não") |
| Sintoma "Não" | `negado_explicitamente` |
| Sintoma "Às vezes" ou "Frequente" | `informado`, com o detalhe |
| "Não usa…" ou "Nega…" sem nenhum item na lista | `negado_explicitamente` |
| Medida | `medida{valor, unidade}` (a unidade mostrada na tela), origem `dado_medido`. Sem unidade, não grava |
| Demais campos | `informado` + `relato_paciente`, ou o que a nutricionista escolheu em "Detalhes do registro" |
| Bloco íntimo | Domínios `emocional` e `sentido_pessoal`, os mesmos que o relatório só inclui com marcação explícita |
| Tipo inativo | Não entra no registro |

Relatório (prévia e `emitir_relatorio`), Evolução e HOLOS AI continuam lendo **somente** esses `dominios`.

## Salvamento automático
- **Quando:** 2,5 s depois de parar de digitar, ao sair do campo e ao trocar de bloco. Só o **rascunho**.
- **Como:** uma chamada por vez. Se houver alterações durante uma gravação, elas vão na gravação seguinte.
- **Conflito:** usa `expected_updated_at`. Se outra sessão gravou antes, nada é sobrescrito; a tela mostra "Alterada em outra sessão — recarregue" e oferece **Recarregar**.
- **Indicador:** "Salvando…" → "Salvo automaticamente há poucos segundos / há X s / há X min", ou "Não salvo — tentar novamente".
- **Abrir a anamnese não grava nada.** O rascunho nasce no primeiro preenchimento.

## Compatibilidade com o formato antigo
- Anamnese **sem** `formulario_versao` abre no **formato antigo**, como foi gravada.
- Rascunho antigo continua no **editor antigo**.
- Nada é convertido, preenchido por backfill ou reinterpretado.
- O roteamento é só pelo marcador do conteúdo gravado.

## Provas
- **`testes/testar-anamnese-v2-dominios.mjs`** (20): a função canônica, campo a campo, contra o validador do servidor, lido da própria migration.
- **`testes/testar-anamnese-v2.mjs`** (47): tela, salvamento automático, conflito, recarregar, logout/login, outra sessão, concluir, resumo, correção, retorno, cópia, formato antigo, recusas, XSS, celular, teclado, ARIA e não interferência.
  - Cada gravação confere `dominios == gerarDominiosDaAnamneseV2(formulario)`.
- **`testes/testar-v1-etapa2.mjs`** (48): a anamnese **antiga** continua abrindo, editando, salvando, revisando e sendo copiada como antes.

## Fora desta etapa
- Validar o `formulario` também no servidor (exigiria migration).
- A Evolução compara itens pelo rótulo do campo. Uma V2 comparada com uma antiga mostra os itens como novos ou ausentes, não como alterados.
