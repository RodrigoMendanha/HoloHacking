# Implementação — Mapeamento Holístico V1 (12/10)

O formulário que o paciente responde antes da consulta, por link, foi aprimorado sem reconstruir o fluxo:
- o link, o token, o autosave e os estados continuam iguais;
- "Levar para o atendimento" continua igual;
- a resposta original continua imutável;
- não houve migration nem mudança no banco real.

## A. Estado anterior

- **Nome na interface:** "Anamnese pré-consulta". A palavra "anamnese" já saiu de toda a interface (commit anterior).
- **Primeira consulta:** 8 etapas. Uma delas era "Medidas", com peso e altura informados pelo paciente.
- **Retorno:** uma etapa, com "Mudou peso/medidas?" e "Peso atual".
- **Perguntas:** as da Anamnese V2, com rótulos simples para o paciente.
- **Campos sensíveis com "Prefiro não responder":** só dois, emocional e sentido pessoal.

## B. Matriz: campo atual → etapa nova

Todos os campos continuam no esquema da Anamnese V2 (`anamnese-v2.js`), que é o mesmo da anamnese profissional. "Some só do paciente" quer dizer que o campo continua no formulário da nutricionista.

**Legenda:**
- **M** = mantém
- **R** = só muda o rótulo para o paciente
- **S** = some só do paciente
- **N** = campo novo

| Campo atual (chave) | Etapa nova | Decisão |
|---|---|---|
| `motivo.motivo` | 1 | R: "Qual é o principal motivo para buscar acompanhamento agora?" |
| `motivo.objetivo` | 1 | R: "O que você gostaria que estivesse diferente?" |
| `motivo.expectativa`, `motivo.mudar_primeiro` | — | S (equivalentes às duas acima) |
| `alimentar.refeicoes`, `horarios`, `maior_fome`, `preferencias`, `evitados`, `agua`, `alcool`, `quem_prepara`, `comer_fora`, `delivery`, `trabalho`, `dificuldade` | 2 | M / R |
| `alimentar.cafe`, `almoco`, `jantar`, `lanches`, `obs` | — | S (substituídos pela pergunta aberta "um dia comum") |
| `saude.intestino`, `gastrointestinais`, `azia_refluxo`, `distensao`, `nausea`, `dor`, `outros` | 3, "O que você tem percebido" | M / R ("Você percebe desconfortos digestivos?") |
| `saude.condicoes`, `saude.cirurgias` | 3, "Diagnósticos já informados por profissionais de saúde" | R |
| `restricoes.medicamentos`, `suplementos`, `alergias`, `intolerancias` | 4 | M / R |
| `estilo.sono`, `atividade`, `trabalho`, `estresse`, `tabagismo`, `rotina` | 5 | M / R |
| `contexto.familiar_saude`, `familiar`, `financeiro` | 6 | M (familiar e financeiro passam a ser sensíveis) |
| `contexto.social` | — | S (coberto por "apoio" e "responsabilidades") |
| `contexto.emocional` | 6 | R: "Você percebe que emoções ou situações específicas influenciam a sua alimentação?" (sensível) |
| `contexto.sentido` | 6 | R: "Se quiser, conte um pouco." Só aparece com "Sim" na pergunta de sentido pessoal |
| `contexto.obs` | 7, Revisar | R: o campo aberto final |
| `objetiva.*` (peso, altura, circunferências, outras medidas, observações físicas, exames, outras avaliações) | — | Some da coleta do paciente; fica só no atendimento |
| `retorno.melhorou`, `piorou`, `alimentacao`, `rotina`, `sintomas`, `medicamento`, `suplemento`, `dificuldade` | retorno | M / R |
| `retorno.peso_medidas`, `retorno.peso` | — | Some da coleta do paciente |
| `retorno.obs` | retorno, Revisar | R: o campo aberto final |

## C. Nomenclatura

| Antes | Agora |
|---|---|
| Anamnese pré-consulta | Mapeamento Holístico da Saúde |
| Enviar anamnese | Enviar Mapeamento |
| Anamnese enviada! | Mapeamento enviado! |
| Anamnese recebida | Mapeamento recebido |
| Levar para a anamnese do atendimento | Levar para o atendimento |

Tabelas, RPCs, arquivos e chaves internas (`anamneses`, `anamnesis_invites`, `anamnese-*.js`) não mudaram.

## D. Primeira consulta: 7 etapas

1. **Sobre você e o que busca**
   - motivo
   - o que gostaria que estivesse diferente
   - há quanto tempo
   - o que já tentou
   - o que ajudou
   - o que não funcionou
2. **Sua alimentação no dia a dia**
   - um dia comum (campo aberto)
   - refeições e horários
   - fome, saciedade, comer sem fome, vontades frequentes
   - preferências e alimentos que evita
   - água, outras bebidas e álcool
   - quem prepara, onde e com quem come
   - comer fora e delivery
   - no trabalho
   - maior dificuldade
3. **Como seu corpo tem se sentido**
   - "O que você tem percebido": intestino, desconfortos digestivos, azia, barriga estufada, enjoo, inchaço ou retenção, dor de cabeça, outras dores, pele, ciclo menstrual (sensível), mudanças recentes, outros sinais.
   - "Diagnósticos já informados por profissionais de saúde": diagnósticos e cirurgias.
4. **Medicamentos, suplementos, alergias e intolerâncias**
   - Medicamentos, suplementos, alergias conhecidas e intolerâncias conhecidas, em blocos separados.
   - Alimentos que evita por perceber desconforto.
5. **Sono, energia e rotina**
   - horário de dormir e de acordar, qualidade do sono, despertares
   - energia ao longo do dia
   - trabalho, deslocamento, atividade física, pausas
   - rotina e períodos corridos
   - dias úteis x fins de semana
   - estresse, tabagismo
   - o que mais dificulta; o que já funciona e quer preservar
6. **Sua história e seu momento de vida** (tudo opcional)
   - história com a alimentação
   - saúde na família
   - mudanças recentes
   - contexto familiar (sensível)
   - responsabilidades
   - sobrecarga (sensível)
   - apoio (sensível)
   - finanças (sensível)
   - emoções e alimentação (sensível)
   - sentido pessoal: Sim / Não / Prefiro não responder. Com "Sim" aparece "Se quiser, conte um pouco."
7. **Revisar e enviar**
   - as respostas, por etapa, com "Editar esta etapa";
   - o campo aberto final: "Tem alguma coisa importante sobre você, sua alimentação, sua saúde ou seu momento atual que não perguntamos e que gostaria que sua nutricionista soubesse?"

## E. Retorno: 1 etapa + revisar

**"Desde a última consulta":**
- o que melhorou e o que piorou;
- **o que conseguiu colocar em prática** e **o que não conseguiu**;
- **o que facilitou** e **o que dificultou**;
- mudanças na alimentação, na rotina e nos sintomas;
- **se apareceu alguma questão nova**;
- medicamentos e suplementos;
- principal dificuldade.

A revisão traz o campo aberto final. Os itens em negrito são novos.

A regra de qual formulário usar não mudou: se o paciente não tem anamnese profissional salva, recebe o de primeira consulta; se tem, recebe o de retorno. Não depende de agendamento e o paciente não escolhe.

## F. O que saiu da coleta

**Primeira consulta:**
- peso e altura;
- os demais campos de `objetiva`: circunferências, outras medidas, observações físicas, exames, outras avaliações. Nunca foram mostrados ao paciente; continuam fora.

**Retorno:** peso e "Mudou peso/medidas?".

**Dados antigos:** nada foi apagado. Rascunhos e respostas que já tinham peso ou altura continuam iguais no banco. A página só deixou de pedir. O servidor ainda aceita `objetiva.peso`/`altura` de um rascunho antigo, para não perder dado.

## G. Campos novos

São todos campos novos dentro dos blocos que já existem no JSON do formulário. Cada um usa um domínio já existente da anamnese. Assim, "Levar para o atendimento" os leva com origem `relato_paciente`, e eles aparecem também no formulário da nutricionista.

| Bloco | Campos novos |
|---|---|
| motivo | `ha_quanto_tempo`, `ja_tentou`, `ajudou`, `nao_funcionou` |
| alimentar | `dia_comum`, `saciedade`, `desejos`, `sem_fome`, `bebidas`, `com_quem` |
| saude | `dor_cabeca`, `retencao`, `pele`, `ciclo`, `mudancas` |
| restricoes | `evita_desconforto` |
| estilo | `dorme`, `acorda`, `despertares`, `energia`, `deslocamento`, `pausas`, `dias_diferentes`, `dificulta`, `funciona` |
| contexto | `historia_alimentacao`, `mudancas_vida`, `responsabilidades`, `sobrecarga` (íntimo), `apoio`, `sentido_importante` (íntimo) |
| retorno | `praticou`, `nao_praticou`, `facilitou`, `dificultou`, `nova_questao` |

O "Resumo" que a nutricionista vê ganhou dois grupos novos: "O que busca" e "Rotina". Os campos íntimos continuam fora do resumo.

## H. Banco

Não houve migration.
- O servidor (`convite_anamnese_limpar`, migration `20261014100000`) já guarda qualquer campo dentro dos blocos permitidos.
- `salvar_anamnese` aceita os domínios usados, porque são todos da lista que já existe.

## I. Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `anamnese-publica.js` | etapas, ordem, perguntas, campos sensíveis (texto e escolha), pergunta condicional, campo final, envio sem o campo condicional escondido |
| `anamnese-v2.js` | campos novos e resumo |
| `anamnese.html` | 2 regras de estilo (subtítulo da etapa e campo final) |
| `testes/testar-mapeamento-holistico-v1.mjs` | teste novo, 36 verificações |
| `testes/testar-anamnese-pre-consulta.mjs`, `testes/testar-anamnese-v2.mjs` | 7 etapas, sem Medidas, retorno com 16 campos |
| `testes/suites.mjs`, `docs/deploy.md` | registro do teste e hashes |

## J. Fluxo do paciente

1. Abre o link, sem conta.
2. Responde as 6 etapas no ritmo dele. Tudo é salvo sozinho ("Salvo às hh:mm"), e ele pode fechar e voltar pelo mesmo link.
3. Revisa, pode escrever no campo final e toca em **Enviar Mapeamento**.
4. Vê "Mapeamento enviado!". Depois disso, o link não altera mais nada.

Só é preciso responder uma pergunta qualquer para enviar: tudo é opcional.

## K. Fluxo da nutricionista

1. Na ficha, aba **Mapeamento Holístico**, clica em **Enviar Mapeamento Holístico**. Aparece **Link gerado com sucesso**, com o link, a validade e os botões Copiar link, Enviar pelo WhatsApp e Revogar link.
2. O status passa por Iniciado e depois **Mapeamento recebido**, com **Ver resposta** e **Levar para o atendimento**.
3. No atendimento, as respostas viram rascunho. Ela revisa, completa e salva.

## L. Segurança e preservação do original

- **Token:** igual. Só o hash fica no banco, o token vai depois do `#`, a página é anônima e usa 3 RPCs.
- **Resposta enviada:** fica congelada (`submitted_content`). Reenviar e salvar de novo são recusados.
- **Edição profissional:** acontece no rascunho da anamnese. O teste prova que ela não muda o original.
- **"Prefiro não responder":** vira o estado `recusado` no rascunho. Nada sensível é obrigatório.
- **Pergunta condicional:** se o paciente marcar "Não" depois de ter escrito no "conte um pouco", esse texto não vai ao servidor.

## M. Testes

**`testar-mapeamento-holistico-v1.mjs` (36 verificações):**
- link sem agendamento, válido por 7 dias;
- página sem login;
- as 7 etapas, na ordem;
- nenhuma etapa com peso, altura, circunferências, exames ou observações físicas;
- as perguntas novas e a linguagem de percepção;
- sintoma separado de diagnóstico;
- "Prefiro não responder" em texto e em escolha;
- a pergunta condicional de sentido pessoal;
- o campo final;
- autosave ("Iniciado"), fechar e reabrir;
- enviar só com campos opcionais;
- "Mapeamento enviado!" e nenhuma palavra "anamnese" para o paciente;
- resposta imutável;
- levar para o atendimento com as chaves novas e o estado `recusado`, sem medidas;
- a edição profissional não muda o original;
- retorno: 1 etapa, sem peso, perguntas de prática;
- HOLOSCAN, ferramentas, Resultado HOLOS, Próximos Passos e metodologia intocados.

**Também passando:**
- `testar-mapeamento-holistico.mjs` (link, copiar, WhatsApp, revogar, estados, segurança e isolamento);
- `testar-anamnese-pre-consulta.mjs` (token válido, inválido, expirado, revogado e concluído);
- `testar-anamnese-v2*.mjs` e `testar-v1-etapa2.mjs`.

## N–O. Diff e commits

Veja o relatório da entrega (`git diff --stat` e hashes dos commits na branch `claude/admiring-mccarthy-jke2pf`).

## P. Pendências

- **Formulário da nutricionista:** os campos novos também aparecem lá, no mesmo bloco. É o esperado, porque o rascunho precisa carregá-los, mas o formulário profissional ficou mais longo.
- **Campos que somem só do paciente** (expectativa, refeições detalhadas, vida social): continuam no formulário da nutricionista. Se quiser, podemos tirá-los de lá também; isso é uma decisão sua.
- **Validação no banco real:** não houve. Só depois do deploy autorizado.
