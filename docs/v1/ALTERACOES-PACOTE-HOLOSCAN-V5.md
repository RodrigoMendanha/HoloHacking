# ALTERAÇÕES DO PACOTE HOLOSCAN — HOLOS-V1 v5 (Lote 2B, 13/10/2026)

**Status:** implementado e testado. A publicação em produção está na seção 9.

**Origem:** decisões explícitas de Rodrigo, no Lote 2B, em 13/10/2026. Decisão explícita é autorização de implementação imediata.

**Base:** **HOLOS-V1 v4**, a versão no ar (hash do servidor `2e2f169c…`, hash JS `7e7d02e8…`).

**Versão nova:** **HOLOS-V1 v5**, com hash JS `6523b8e7e914d70a5869bf52744b47d7f14ceb7fbc62e494623de87c3498e425`. O hash do servidor é calculado na publicação.

**Preservados sem alteração:**
- as versões v2, v3 e v4;
- as aplicações, snapshots, Resultados, emissões e relatórios.

Este documento não contém dado de paciente.

## 1. Decisões aplicadas (só estas 8, mais 2 registros)

| Pergunta | Decisão | Antes (v4) | Depois (v5) | Justificativa |
|---|---|---|---|---|
| ESP-101 | MOVER | Metabólico | Mental Emocional Espiritual | Direção, propósito e sentido pertencem diretamente ao eixo Mental-Emocional-Espiritual. |
| ESP-103 | MOVER | Metabólico | MEE | Investiga alinhamento entre rotina, escolhas e direção de vida. |
| ESP-203 | MOVER | Ácido Inflamatório | MEE | Investiga valores, limites e comportamento interpessoal. Não deve pontuar um sistema físico por associação simbólica. |
| ESP-404 | MOVER | Ácido Inflamatório | MEE | Investiga crença sobre saúde, sofrimento e privação. Não deve pontuar um sistema físico. |
| ESP-405 | MOVER | Detox e Linfático | MEE | Investiga conteúdo emocional/simbólico relacionado a perdão. Não deve sugerir relação automática entre mágoa, detoxificação ou fluxo linfático. |
| ESP-303 | MANTER | Metabólico | Metabólico | Apesar de estar no bloco espiritual, o conteúdo investiga diretamente comportamento alimentar e contexto da refeição. |
| ESP-501 | CONTEXTUAL | Fúngico (pontuava) | contextual do Fúngico, **sem pontuação** | Informação holística potencialmente útil, mas sem justificativa metodológica para alterar a nota do Fúngico ou de outro sistema. |
| ESP-502 | CONTEXTUAL | Detox e Linfático (pontuava) | contextual do Detox, **sem pontuação** | Investiga contexto da refeição, ritmo, rotina e pertencimento, mas sem justificativa para alterar a nota do Detox ou de outro sistema físico. |
| EMO-502 | CONTEXTUAL MANTIDO | contextual do Metabólico | igual | Sem pontuação metabólica (a primária continua no MEE). |
| EMO-504 | CONTEXTUAL MANTIDO | contextual do Metabólico | igual | Idem. |

**Como as decisões foram aplicadas**
- **MOVER:**
  - só muda o sistema primário;
  - o peso é preservado: os 5 itens têm peso 1, igual a todos os primários do MEE, e nenhum peso foi inventado;
  - a Tríade continua Espírito;
  - o texto, a escala e a orientação são iguais aos da v4;
  - o sistema físico anterior **não** ficou como contexto.
- **CONTEXTUAL (ESP-501, ESP-502):**
  - a pergunta **continua no questionário**, e a resposta é coletada e gravada;
  - a associação com o sistema físico virou `secondary_contextual`, sem peso, e a pergunta **saiu da Tríade**;
  - não entra em denominador, nota, Índice, Tríade, sinais dominantes, prioridade nem Próximos Passos;
  - não foi para outro sistema pontuável;
  - no Resultado HOLOS aparece só em "Contexto, sem pontuar" do Fúngico ou do Detox.
- **Justificativas:** cada uma fica gravada na associação (`conflict_note`) e no objeto da revisão (`MetodologiaRevisaoV5`, em `metodologia-revisao-v3.js`).

**Regras metodológicas registradas**
- "O bloco de origem da pergunta não define automaticamente o sistema. A associação deve ser sustentada pelo conteúdo investigado." Em resumo: **o conteúdo da pergunta vale mais que o bloco de origem** para definir o sistema.
- "Associação contextual não altera nota, Índice, prioridade, sinais dominantes ou Próximos Passos e não implica causalidade." Em resumo: **contextual não pontua e não implica causalidade.**

## 2. Mudança de contrato: pergunta só contextual

Até a v4, o contrato exigia que toda pergunta tivesse **exatamente um sistema primário** e **exatamente um eixo da Tríade**. As decisões sobre ESP-501 e ESP-502 pedem uma pergunta coletada que não pontua nada. Para isso:

- **Validador JS** (`metodologia-pacote.js`): a pergunta sem primária é aceita **só** se tiver pelo menos uma associação `secondary_contextual` **e nenhum** eixo da Tríade. Continuam erro:
  - pergunta sem nenhuma associação a sistema;
  - pergunta sem primária mas com Tríade;
  - mais de uma primária.
- **Validador SQL:** migration nova `supabase/migrations/20261020100000_pergunta_so_contextual.sql`.
  - Muda só esse trecho de `validar_pacote_metodologico`; o resto é idêntico ao de `20261001200000`.
  - Não altera nenhum dado.
  - v2, v3 e v4 continuam válidos.
- **Revisão** (`aplicarRevisao`): nova decisão `contextualizar`, que converte a primária em contextual sem peso e remove o vínculo com a Tríade. Ela é recusada:
  - se o sistema de origem não confere;
  - se falta justificativa;
  - se o resultado não bate com o esperado (só contextuais, Tríade, contagens).
- **Motor, salvar HOLOSCAN, MR-V1 e PP-V1:** sem mudança de código. Todos já trabalham por associação primária; a contextual sempre foi devolvida à parte, sem contribuição.

## 3. Contagens (recalculadas da composição nova)

| | v4 | v5 |
|---|---|---|
| Perguntas coletadas | 82 | **82** |
| Perguntas pontuáveis (com primária) | 82 | **80** |
| Fúngico | 12 | **11** |
| Ácido Inflamatório | 11 | **9** |
| Metabólico | 10 | **8** |
| Detox e Linfático | 12 | **10** |
| Mental Emocional Espiritual | 37 | **42** |
| Tríade Corpo / Mente / Espírito | 47 / 19 / 16 | **47 / 19 / 14** |
| Cobertura mínima por sistema (80%) | 10/12 · 9/11 · 8/10 · 10/12 · 30/37 | **9/11 · 8/9 · 7/8 · 8/10 · 34/42** |
| Associações contextuais | 4 | **6** (+ESP-501→Fúngico, +ESP-502→Detox) |
| Cobertura de preenchimento (global) | / 82 | / 82: ESP-501/502 continuam sendo perguntadas |

O Índice continua só com os 5 sistemas avaliáveis, e as faixas, escalas e pesos são iguais.

## 4. Comparativo v4 × v5 (mesmas respostas)

Completo em `docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V4-V5.md`, gerado por `scripts/comparar-v4-v5.mjs`. Cada caso mostra as 5 notas, o Índice, a Tríade, as prioridades, os sinais dominantes e o PP-V1.

| Caso fictício | Índice v4 → v5 | 1ª / 2ª área v4 → v5 | PP-V1 v4 → v5 |
|---|---|---|---|
| F1 Carla (determinístico) | 53,9 → 51,3 | Detox/Ácido → Detox/**Metabólico** | Mapa da Rotina · Linha do Momentum · OQ³ → Mapa da Rotina · **Gatilhos & Respostas** · Linha do Momentum |
| F2 carga espiritual (ESP = 3) | 54,0 → 60,9 | Metabólico/MEE → **MEE/Metabólico** | → PQQ · Mapa da Rotina · Mapa de Crenças Alimentares |
| F3 só as 5 ESP movidas = 3 | 60,5 → 65,1 | Metabólico/Ácido → **MEE/Fúngico** | → PQQ · Mapa da Rotina · Mapa de Crenças Alimentares |
| F4 só ESP-501/502 = 3 | 64,4 → 66,7 | Fúngico/Detox → Fúngico/Ácido | igual |
| F5 carga física (SNT = 3) | 29,2 → 17,7 | igual | igual |
| F6 uniforme 2 | 33,3 → 33,3 | igual | igual |

**Impacto das 8 decisões**
- Sinais dominantes:
  - os sistemas físicos não mostram mais ESP-101/103/203/404/405 nem ESP-501/502;
  - as movidas aparecem só no MEE.
- No caso F4, ESP-501 e ESP-502 no máximo deixam de puxar a nota do Fúngico e do Detox.
- No caso F5, o Índice cai porque os sistemas físicos passam a ser só sintomas físicos.

## 5. Testes

**`testes/testar-pacote-v5.mjs` (46 asserções)**
- Cada uma das 5 movidas só pontua o MEE.
- ESP-303 continua no Metabólico.
- ESP-501:
  - não pontua o Fúngico;
  - de 0 a 3, não muda nenhuma nota, Índice ou Tríade;
  - não é dominante e não muda prioridade nem ferramentas;
  - não entra em denominador.
- ESP-502: o mesmo, no Detox.
- EMO-502 e EMO-504 continuam só contextuais no Metabólico.
- Contextuais:
  - não alteram score;
  - não entram em dominantes;
  - não escolhem ferramenta.
- A v4 continua byte a byte igual e a v2 intacta.
- PP-V1 continua com as 30 regras, sha256 igual.
- Contrato:
  - pergunta sem primária e com Tríade é recusada;
  - pergunta sem associação é recusada.
- O resultado é determinístico.
- Revisão errada é recusada.
- Artefatos e comparativo estão em dia.

**`testes/testar-questionario-v5.mjs` (tela + servidor falso)** parte do estado real de produção: v2 e v3 retirados, v4 no ar com aplicação, Resultado e emissão. Prova que:
- no login, a v5 é publicada e retira a v4;
- 82 perguntas na tela, ESP-501/502 coletadas, botão sem número;
- salvar na v5 grava 11/9/8/10/42;
- no Resultado HOLOS, ESP-501/502 aparecem só como contexto e as movidas pontuam no MEE;
- o histórico da v4 continua byte a byte igual.

**`testes/testar-questionario-v3.mjs`** continua sendo o registro da publicação da v4. Ele simula o front daquela época.

**Postgres local** (cadeia completa, BEGIN … ROLLBACK): **458 verificações ok**. O harness novo, `pacote-v5-harness-pre.sql` + `pacote-v5-harness.sql`, cobre:

| Verificação | O que prova |
|---|---|
| PV5-00 | versão no ar com o conteúdo da v4 |
| PV5-01 | o validador antigo recusa só ESP-501/502, ou seja, a migration é necessária |
| PV5-02 | depois da migration, a v5 tem 0 erros |
| PV5-03 | publicação direta: v5 no ar, v4 retirada com auditoria |
| PV5-04 | contagens no banco |
| PV5-05 | HOLOSCAN salvo na v5 |
| PV5-06 | `resultado_holos_dominantes` sem ESP-501/502 |
| PV5-07 | contextual com Tríade é recusado |
| PV5-08 | histórico idêntico |

**Suíte completa:** ver a seção 9.

## 6. Arquivos

| Arquivo | Mudança |
|---|---|
| `metodologia-revisao-v3.js` | + `MetodologiaRevisaoV5` (Lote 2B) |
| `metodologia-pacote.js` | validador aceita a pergunta só contextual; `aplicarRevisao` com `contextualizar` e conferência de Tríade e só contextuais; publicação direta encadeia v4 → v5 |
| `supabase/migrations/20261020100000_pergunta_so_contextual.sql` | nova (validador SQL) |
| `scripts/pacote-v5.mjs`, `docs/v1/metodologia/pacote-metodologico-v5.json`, `supabase/tests/pacote-v5-doc.sql` | novos |
| `scripts/comparar-v4-v5.mjs`, `docs/v1/metodologia/COMPARATIVO-HOLOSCAN-V4-V5.md` | novos |
| `testes/testar-pacote-v5.mjs`, `testes/testar-questionario-v5.mjs` | novos; adicionados à suíte |
| `testes/testar-questionario-v3.mjs` | simula o front da v4 |
| `supabase/tests/pacote-v5-harness-pre.sql`, `pacote-v5-harness.sql`, `scripts/validar-cadeia-local.sh` | harness novo na cadeia |
| `docs/v1/MATRIZ-HOMOLOGACAO-84-PERGUNTAS-HOLOSCAN.md` + `.csv` | 8 decisões como DECISÃO APLICADA; EMO-502/504 como CONTEXTUAL MANTIDO; 61 em aberto |
| `docs/v1/DECISOES-V1.md` | item 190 |
| `docs/deploy.md` §3.5 | hashes |

**Não alterados:** ferramentas, Conduta, PP-V1 (sem PP-V2), escalas, faixas, pesos e histórico.

## 7. Histórico

Ficam imutáveis:
- v2, v3 e v4;
- aplicações, respostas, notas, sinais dominantes, Resultados HOLOS, Próximos Passos, emissões (PDF) e relatórios.

Ao ser publicada, a v5 só muda o status da v4 para `retirado`, vigente até ontem. **Nada é recalculado.**

## 8. Ordem da publicação

1. **Backup e verificação:** impressões digitais (md5) só por leitura.
2. **Migration `20261020100000`:** aplicada antes do login.
   - Ela só afrouxa o validador para a pergunta só contextual.
   - Fronts antigos não são afetados.
   - Sem a migration, a v5 ficaria `em_revisao`, recusada pelo validador, até ela ser aplicada.
3. **Deploy do front novo** na VPS.
4. **Login do responsável metodológico**, com todas as abas antigas fechadas: a v5 é gravada e publicada, e a v4 é retirada.
5. **Conferência:** v5 no ar; contagens; histórico idêntico ao do passo 1.
6. **Smoke test** com paciente fictícia.

**Rollback**
- Front: o container anterior.
- Metodologia: publicar uma v6 com o conteúdo desejado. Pacote publicado não se edita.
- A migration do validador pode ficar mesmo com rollback, porque é compatível com todas as versões.

## 9. Publicação em produção

Feita em 13/10/2026, na ordem da seção 8:
- migration `20261020100000` aplicada antes do login (md5 da função igual ao do repositório);
- deploy do front; login do responsável metodológico com as abas antigas fechadas;
- **HOLOS-V1 v5 aprovado** (hash do servidor `dc615afc…`, publicação direta); v2, v3 e v4 `retirado`.

Conferência depois da publicação (só leitura, md5 agregados, sem dado clínico): as impressões digitais de aplicações, respostas, notas, Resultados HOLOS, emissões, relatórios e Próximos Passos anteriores ficaram iguais às de antes; os números novos vieram só da aplicação de smoke.

Smoke test com paciente fictícia: aprovado. Uma primeira aplicação de smoke saiu com 81/82 respostas porque uma pergunta ficou sem resposta na tela (artefato do teste, sem bug); a conferência seguinte saiu 82/82.

A versão seguinte é a **HOLOS-V1 v6** (fechamento das 61): `docs/v1/ALTERACOES-PACOTE-HOLOSCAN-V6.md`.
