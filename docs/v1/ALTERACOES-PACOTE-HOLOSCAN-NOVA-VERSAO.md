# ALTERAÇÕES DO PACOTE HOLOSCAN — HOLOS-V1 v4 (decisões de 13/10/2026)

**Status:** IMPLEMENTADO E TESTADO no código. A publicação em produção segue a ordem da seção 9.

> **Por que v4 e não v3 (incidente de 13/10, 05:37 UTC).** Depois do deploy do front `74d0286` e da migration da publicação direta, o login do responsável metodológico rodou num navegador que ainda tinha o **front antigo** (`46cab4e`) carregado. Esse front trazia o **rascunho de 12/10** e o publicou como **HOLOS-V1 v3**.
> - Conteúdo da v3 publicada: 82 perguntas, com textos revisados, trocas e ESP-404. **Não** tem as decisões de 13/10.
> - A v2 foi retirada corretamente, com auditoria.
> - **Nenhum HOLOSCAN nem Resultado foi feito na v3**: 0 e 0, conferido logo depois.
>
> Um pacote publicado é imutável e não se apaga. Por isso as decisões de 13/10 entram como **v4**:
> - mesmo conteúdo testado, só o número muda;
> - montada a partir da v2, não da v3 errada;
> - publicada pelo mesmo caminho, retira a v3 automaticamente.
>
> A v3 fica no histórico como registro. O front antigo, mesmo em cache, não publica mais nada, porque a v3 dele já existe. A guarda nova impede que uma v4 que não seja exatamente esta revisão vá ao ar.
>
> **Prevenção.** Antes do login que publica, fechar **todas** as abas do sistema e abrir uma aba nova.

**Origem:** decisões explícitas de Rodrigo em 13/10/2026. A regra operacional é "decisão explícita de Rodrigo = autorização para implementar". Ficam preservados o versionamento, os testes, o histórico, a auditoria e o rollback.

**Base:** o pacote ativo em produção, **HOLOS-V1 v2** (hash do servidor `7af1dae6…`, hash JS `3593d782…`). A versão nova é o **HOLOS-V1 v4** (ver o quadro acima: a v3 de produção é o rascunho de 12/10, publicado por engano):
- hash JS `7e7d02e8813d71e95309e41f2b7b1c588e673a0c298e3d865b60ee92ee5ab98a`;
- o hash do servidor é calculado na publicação.

Este documento não contém dado de paciente. Todos os casos são fictícios.

## 1. O que mudou (e só isto)

| # | Decisão | Perguntas |
|---|---|---|
| 1 | **REMOVER**: não é pontuável, não é contextual, não vai para outro sistema, não tem item substituto | SNT-210, SNT-309 |
| 2 | **MOVER** a associação primária para o **Sistema Mental Emocional Espiritual** | EMO-101, 102, 103 (antes no Fúngico); EMO-201, 202, 203, 204 (antes no Ácido Inflamatório); EMO-301, 302, 303 (antes no Metabólico); EMO-401, 402, 403 (antes no Detox e Linfático) |
| 3 | **Retirar a relação antiga**: ela não fica como contextual | EMO-101 → Metabólico e EMO-203 → Detox e Linfático (contextuais físicas); contextual MEE de EMO-103, 201, 301, 302 e 402 (ficaria redundante, porque o MEE virou o primário) |
| 4 | **Regra metodológica ativa** (registrada no pacote e em `DECISOES-V1.md`, item 188) | — |

**Regra metodológica ativa:**
- "Uma relação holística, simbólica ou contextual entre emoção e corpo não é suficiente, por si só, para justificar que uma resposta mental/emocional altere matematicamente a nota de um sistema físico."
- "Perguntas mentais/emocionais devem pontuar sistema físico somente quando existir justificativa metodológica específica, documentada e aprovada para aquela associação."

**O que NÃO mudou**
- Textos, escalas, orientações e períodos das perguntas.
- As outras 69 perguntas: idênticas ao v2.
- Faixas, a regra do Índice (5 sistemas avaliáveis), a regra da Tríade (associações de Tríade iguais) e a cobertura mínima de 80%.
- PP-V1: as 30 regras, SISTEMA → CATÁLOGO → FERRAMENTA.
- Ferramentas, Conduta, exames.
- O rascunho de 12/10 (textos revisados, trocas SNT-106/410/507, SNT-209, ESP-102, ESP-404) **não foi importado**. Ele foi arquivado em `docs/v1/metodologia/historico/` e nunca esteve em produção.

## 2. Justificativas oficiais

| Pergunta | Decisão | Justificativa |
|---|---|---|
| SNT-210 | REMOVER | Exames e documentos não participam do Resultado HOLOS. PCR/VHS não deve alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos. |
| SNT-309 | REMOVER | Exames e documentos não participam do Resultado HOLOS. Triglicerídeos/HDL não devem alterar notas, sistemas, Índice, prioridades, sinais dominantes ou Próximos Passos. |
| EMO-101 | MOVER → MEE | Procrastinação, prontidão e autorregulação comportamental. |
| EMO-102 | MOVER → MEE | Organização pessoal e comportamento. |
| EMO-103 | MOVER → MEE | Prontidão, dificuldade percebida para iniciar mudança e autorregulação. |
| EMO-201 | MOVER → MEE | Irritabilidade e regulação emocional. |
| EMO-202 | MOVER → MEE | Intensidade e duração percebida da raiva. |
| EMO-203 | MOVER → MEE | Limites, comportamento interpessoal e evitação de conflito. |
| EMO-204 | MOVER → MEE | Expressão emocional e comportamento interpessoal. |
| EMO-301 | MOVER → MEE | Relação entre estado emocional e alimentação. |
| EMO-302 | MOVER → MEE | Consciência, atenção ao comportamento e funcionamento em piloto automático. |
| EMO-303 | MOVER → MEE | Uso da comida como recompensa e comportamento alimentar associado ao estado emocional. |
| EMO-401 | MOVER → MEE | Ruminação emocional. |
| EMO-402 | MOVER → MEE | Expressão e regulação emocional. |
| EMO-403 | MOVER → MEE | Apoio, vínculo e capacidade de receber cuidado. |

Cada justificativa fica gravada na associação nova (`conflict_note`: "sistema mudado na revisao (de → para): justificativa"). As remoções ficam registradas no objeto da revisão e na linhagem do pacote (`lineage.revisao = HOLOS-V1-DECISOES-2026-10-13`).

**Pesos (auditados, nenhum inventado).** As 13 perguntas movidas têm todas:
- peso 1;
- escala de frequência 0–3;
- orientação direta.

É o mesmo peso de todos os itens primários do MEE. O peso foi preservado e nenhuma pergunta exigiu decisão de peso.

## 3. Contagens (recalculadas da composição nova)

| | v2 | v4 |
|---|---|---|
| Total de perguntas | 84 | **82** |
| Bloco Corpo / Mente / Espírito (= itens da Tríade) | 49 / 19 / 16 | **47 / 19 / 16** |
| Fúngico | 15 | **12** |
| Ácido Inflamatório | 16 | **11** |
| Metabólico | 14 | **10** |
| Detox e Linfático | 15 | **12** |
| Mental Emocional Espiritual | 24 | **37** |
| Escalas frequência / intensidade | 73 / 11 | 71 / 11 |
| Invertidas | 9 | 9 (as mesmas) |
| Cobertura global | "/ 84" | "/ 82" |
| Cobertura mínima por sistema (80%) | — | Fúngico 10/12, Ácido Inflamatório 9/11, Metabólico 8/10, Detox 10/12, MEE 30/37 |
| Associações contextuais | 11 | 4 (saíram 7, item 3 da seção 1) |

O `aplicarRevisao` recusa a montagem se qualquer número final for diferente do esperado (`esperado` em `metodologia-revisao-v3.js`).

## 4. Impacto matemático

- **Nota do sistema** = 10 − 10·Σ(peso·carga)/Σ(peso·3) sobre os itens primários respondidos. Com menos itens, cada item físico pesa mais no seu sistema:
  - Ácido Inflamatório: de 1/16 para 1/11;
  - Metabólico: de 1/14 para 1/10.
- **Cada item do MEE pesa menos:** de 1/24 para 1/37.
- **As 13 EMO deixam de mexer nos sistemas físicos.** Prova (teste 19c): com as 13 no máximo, as notas dos 4 físicos não mudam e só o MEE cai.
- **SNT-210/309 deixam de existir para as aplicações novas.** Saem também da Tríade Corpo (47 itens).
- **Índice:** a regra é a mesma (só com os 5 sistemas avaliáveis). O valor muda conforme as notas novas.
- **Tríade:** as associações de Tríade das 13 EMO continuam "Mente". A Tríade só muda pela saída de SNT-210/309 do Corpo.
- **Prioridade e PP-V1:** o catálogo é igual. A seleção pode mudar naturalmente, porque a ordem dos sistemas muda.

## 5. Comparativo v2 × v4 (mesmas respostas)

O arquivo completo é `docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V2-V3.md`. Ele é gerado por `scripts/comparar-v2-v3.mjs`, e o teste confere que está em dia. Para cada caso ele mostra:
- as 5 notas;
- o Índice;
- a Tríade;
- a 1ª e a 2ª área;
- os sinais dominantes (regra MR-V1);
- as ferramentas do PP-V1.

| Caso fictício | Índice v2 → v4 | 1ª / 2ª área v2 → v4 | PP-V1 v2 → v4 |
|---|---|---|---|
| F1 Carla (determinístico) | 53,7 → 53,9 | Detox/Ácido → Detox/Ácido | igual: Mapa da Rotina · Linha do Momentum · OQ³ |
| F2 emocional alto (EMO = 3), físico 1 | 51,8 → 59,8 | Ácido/MEE → **MEE/Fúngico** | Mapa da Rotina · PQQ · Linha do Momentum → **PQQ · Mapa da Rotina · Mapa de Crenças Alimentares** |
| F3 físico alto (SNT = 3), resto 0 | 39,7 → 29,2 | Fúngico/Detox → igual | igual |
| F4 uniforme 2 | 33,3 → 33,3 | igual | igual |
| F5 só exames altos (SNT-210/309 = 3) | 64,9 → 66,7 | **Metabólico**/Ácido → **Fúngico**/Ácido | igual |
| F6 as 13 EMO = 3, resto 1 | 55,1 → 62,0 | Ácido/Metabólico → **MEE/Fúngico** | → PQQ · Mapa da Rotina · Mapa de Crenças Alimentares |

**Sinais dominantes no v4**
- Nenhum sistema físico mostra EMO; nenhum mostra SNT-210/309.
- As EMO movidas aparecem no MEE. Exemplos:
  - F1: EMO-203, EMO-302, EMO-401;
  - F2: EMO-101, EMO-102, EMO-103.

## 6. Testes

**Os 25 testes obrigatórios**

| # | Teste | Onde |
|---|---|---|
| 1 | total 82 (47/19/16) | `testes/testar-pacote-v3.mjs` |
| 2–3 | SNT-210 e SNT-309 não existem (nem pergunta, nem associação) | idem |
| 4 | nenhuma pontua: o motor do v4 recusa a resposta; nenhum sistema as conta | idem + harness PG PV05 |
| 5 | nenhuma aparece como dominante (no v2, com as mesmas respostas, eram) | idem + PV09 |
| 6–18 | cada EMO → MEE: peso 1, Tríade Mente, texto, escala e justificativa | idem + PV01 |
| 19 | nenhuma das 13 altera sistema físico (sem associação física; notas físicas iguais com as 13 no máximo) | idem + PV01 |
| 20 | cobertura com os denominadores novos (Fúngico 10/12 avaliável, 9/12 não; MEE 30/37 sim, 29/37 não; global /82) | idem + PV04 |
| 21 | Índice só com os 5 sistemas avaliáveis (sem Índice parcial) | idem |
| 22 | v2 idêntico: hash `3593d782…`, 84 perguntas; aplicação, respostas, notas, perguntas e associações do v2 intactas | `testar-pacote-v3.mjs`, `testar-questionario-v3.mjs`, PV08 |
| 23 | PP-V1 com as mesmas 30 regras (6 por sistema, sha256 do catálogo `b9bbebe8…`) e rodando sobre o v4 | `testar-pacote-v3.mjs` |
| 24 | MR-V1: o Resultado HOLOS de uma aplicação v4 mostra as EMO como dominantes do MEE; os físicos sem EMO nem SNT-210/309 | `testar-questionario-v3.mjs` + PV09 (função SQL real) |
| 25 | Resultado HOLOS e emissão RF (PDF) do v2 idênticos, byte a byte, depois da publicação do v4 | `testar-questionario-v3.mjs` |

**Outros testes**
- Validador: 0 erros (com REF-01/02/03).
- Determinismo: mesmo v2 + mesmas decisões = mesmo hash.
- Recusas: revisão de outra versão, pergunta inexistente, sistema de origem errado, contextual redundante não listada, contextual inexistente, contagens divergentes.
- `pacote-v3.mjs --check` e `comparar-v2-v3.mjs --check` em dia.
- Tela: 82 perguntas (47/19/16), mesmo texto do v2, salvar no v4 com os denominadores novos.
- **Guarda nova** (`testes/testar-publicacao-guarda-v3.mjs`): com a v3 errada no ar (como em produção), uma v4 `em_revisao` que não seja exatamente esta revisão **não** é publicada.

**Postgres local (cadeia completa, BEGIN … ROLLBACK)**
- PV01–PV09 ok, num total de 449 verificações ok.
- O PV09 chama `resultado_holos_dominantes` (MR-V1) numa aplicação v4.

**Suíte completa:** VERDE (147 suítes, 4450 asserções, 0 falhas); ver 9.1.

## 7. Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `metodologia-revisao-v3.js` | reescrito: só as decisões de 13/10, regra metodológica, `remover_contextuais`, contagens esperadas |
| `metodologia-pacote.js` | `aplicarRevisao` aceita `remover_contextuais` (valida e recusa redundância não listada; grava a justificativa na associação); a publicação direta só publica um `em_revisao` que seja exatamente esta revisão |
| `metodologia-homologacao.js` | rótulo "decisões de 13/10" |
| `ficha.js` | textos sem "84 perguntas" (versão vigente) |
| `questionario.js`, `index.html`, `ajuda.js`, `demo.js` | decisão de 13/10: a aplicação do HOLOSCAN não mostra mais quantas perguntas há. Botão "Aplicar HOLOSCAN"; o progresso mostra a barra e "Em andamento"/"Todas respondidas · completo", sem números |
| `resultado-sintese.js` | PM-15 sai das pendências (decidida) |
| `docs/v1/metodologia/pacote-metodologico-v3.json`, `supabase/tests/pacote-v3-doc.sql` | regenerados por `scripts/pacote-v3.mjs` |
| `docs/v1/metodologia/historico/*` | rascunho de 12/10 arquivado (JS + JSON) |
| `scripts/pacote-v3.mjs` | registra justificativas, contextuais retiradas e a regra |
| `scripts/comparar-v2-v3.mjs` + `docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V2-V3.md` | novos |
| `testes/testar-pacote-v3.mjs`, `testes/testar-questionario-v3.mjs` | reescritos (testes 1–25) |
| `testes/testar-publicacao-guarda-v3.mjs` | novo (adicionado à suíte) |
| `testes/testar-resultado-sintese.mjs`, `testes/holos-aprovado.mjs`, `testes/testar-storage-manifest.mjs` | expectativa sem PM-15; comentários |
| `supabase/tests/pacote-v3-harness.sql` | PV01/04/05 com o v4 novo; PV09 (MR-V1) |
| `docs/v1/MATRIZ-HOMOLOGACAO-84-PERGUNTAS-HOLOSCAN.md` + `.csv` | 15 decisões como **DECISÃO APLICADA**; 69 em aberto |
| `docs/v1/DECISOES-V1.md` | item 188; item 183 marcado como substituído |
| `docs/v1/HOLOSCAN-PERGUNTAS-V3.md`, `REVISAO-PERGUNTAS-V3.md`, `PUBLICACAO-DIRETA-HOLOSCAN.md` | nota de substituição |
| `docs/deploy.md` §3.5 | hashes (72 arquivos) |

**Sem migration nova.** O v4 é gravado pela API e publicado pela RPC da publicação direta (migration `20261018100000`, já existente).

## 8. Histórico (imutável)

- **HOLOS-V1 v2 não é apagado nem alterado.** Na publicação ele passa a `retirado` (vigente até ontem) e continua no banco.
- Aplicações, respostas, notas, sinais dominantes, Resultados HOLOS, Próximos Passos e emissões RF-1/RF-2 (PDF) já salvos continuam ligados ao v2. **Nada é recalculado.**
- Os testes 22 e 25 e o PV08 conferem isso.

## 9. Migração / publicação em produção (ordem obrigatória)

**Situação em 13/10:**
- passos 1 a 3 feitos: front `74d0286` no ar, impressões digitais registradas, migration aplicada;
- no passo 4, a v3 errada foi publicada (ver o quadro do topo);
- falta deployar o commit desta correção e repetir o passo 4, **com todas as abas fechadas**, para publicar a v4.

> **A ordem importa.** O front antigo (`46cab4e`) trazia o rascunho de 12/10 como `MetodologiaRevisaoV3`. Se a RPC de publicação direta for criada antes do front novo, o próximo login do responsável metodológico publicaria o rascunho antigo.
>
> A guarda nova protege o front novo contra um `em_revisao` antigo, mas não muda o front antigo.

1. **Deploy do front novo** (Rodrigo, na VPS), com `scripts/deploy-etapa6-5b.sh` apontando para o commit desta entrega: 72/72, rollback no container anterior.
2. **Backup / verificação (só leitura):** impressões digitais (md5) de pacotes, aplicações, notas, Resultados HOLOS, emissões e relatórios. Confirmar que só existe o HOLOS-V1 v2 (sem v4 `em_revisao`).
   - Conferido nesta sessão, antes do deploy: só o v2 `aprovado` (`7af1dae6…`).
3. **Aplicar a migration `20261018100000_publicacao_direta_metodologia.sql`**, só depois do passo 1:
   - cria `publicar_pacote_metodologico` e o regime `publicacao_direta`;
   - fecha as RPCs da revisão pública antiga.
4. **Login do responsável metodológico:** o front grava o v4 (`em_revisao`) e chama a RPC. A RPC confere o validador e o hash do servidor, publica o v4 hoje e retira o v2 com registro de auditoria.
5. **Verificação:**
   - v4 `aprovado` / `publicacao_direta`;
   - hash do servidor gravado;
   - 82 perguntas e contagens por sistema;
   - v2 `retirado`;
   - impressões digitais do histórico idênticas às do passo 2.
6. **Smoke test** com paciente fictícia, depois apagar ou arquivar:
   - HOLOSCAN no v4;
   - Resultado HOLOS com os dominantes do MEE;
   - PP-V1.

### 9.1 Impressões digitais pré-publicação (produção, só leitura, 13/10/2026)

Contagens e md5 agregados por ID e hash, sem conteúdo clínico. Têm de ser idênticos depois da publicação. A única exceção é `pacotes`: ganha a v3 errada (retirada pela v4) e a v4, e a v2 passa a `retirado`.

| tabela | linhas | md5 |
|---|---|---|
| methodology_packages | 1 (só HOLOS-V1 v2 `aprovado`, `7af1dae6…`) | `fa22f9e0…` |
| holoscan_applications | 6 | `cc9da75c…` |
| holoscan_answers | 504 | `468f5044…` |
| holoscan_system_scores | 30 | `118bd1ed…` |
| holos_results | 3 | `b85977d6…` |
| holos_result_emissions | 3 | `5871721f…` |
| report_emissions | 2 | `5f50be5b…` |
| holos_next_steps | 3 | `821a37ba…` |
| `publicar_pacote_metodologico` | não existe (migration 20261018 não aplicada) | — |

**Suíte completa no commit `74d0286`:** VERDE. Foram 147 suítes, 4450 asserções e 0 falhas, e os 72 de 72 arquivos batem com `docs/deploy.md` §3.5. A guarda nova e as suítes que carregam `metodologia-pacote.js` foram rodadas de novo depois da última mudança: todas ok.

## 10. Rollback

- **Front:** container `holohacking-web-antes-<commit anterior>` (o script mostra o comando). Voltar o front **não** desfaz uma publicação já feita.
  - O front antigo não publica mais nada: a v3 dele já existe (é a errada, que a v4 retira).
  - **Antes** da publicação, voltar ao front antigo com a migration aplicada publicaria o rascunho de 12/10. Por isso, se o front for revertido antes do passo 4, a migration não deve ser aplicada.
- **Metodologia:** um pacote publicado é imutável e não volta a `em_revisao`. O rollback versionado e auditável é publicar uma **versão seguinte** (v5) com o conteúdo desejado (por exemplo, o da v2), pelo mesmo caminho da publicação direta. As aplicações feitas no v4 continuam no v4.
- **Histórico:** nenhum rollback mexe em aplicações, Resultados ou emissões. Cada um continua na versão em que foi feito.

## 11. Pendências que continuam (não decididas aqui)

- 8 perguntas ESP que pontuam sistemas físicos (Lote 2): EM ABERTO.
- O texto D13 do Metabólico cita "achados laboratoriais relatados no questionário". Sem decisão, ficou como estava.
- PP-V2: não iniciado.
