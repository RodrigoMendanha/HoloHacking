# Resultado final do processo HOLOS: auditoria, arquitetura e o que foi feito (09/10)

Decisão: `DECISOES-V1.md` item 178. **Atualização 10/10 (item 180):** as decisões metodológicas aprovadas foram implementadas — Síntese HOLOS, fechamento das ferramentas, Modelo B e emissão imutável. Ver `RESULTADO-FINAL-DECISOES-APROVADAS.md`; as PM-01…PM-05 abaixo ficaram decididas.
**Situação:** implementado localmente, só no front. Sem migration, sem banco real, sem deploy.

**Regra vigente:**
- Exames são só arquivos do prontuário. Não entram em nenhum resultado.
- A Leitura Integrada está fora do fluxo.
- HOLOS-V1@2, as 84 perguntas e os pesos não foram tocados.

---

## A1. Auditoria do Resultado atual

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Onde fica | **Aba "Resultado HOLOS"** da ficha (`#aba-resultado-holos`, `resultado-holos.js`) e **página "Resultado · Paciente"** do menu (`#secao-resultado`, `resultado-pagina.js`) |
| 2 | Diferenças | **Resultado HOLOS** (`holos_results`): snapshot congelado, montado no servidor, com HOLOSCAN oficial + ferramentas + 3 observações opcionais; versionado. **Página Resultado**: não grava; mostra o último Resultado HOLOS salvo, na visão da paciente, + Conduta vigente + Perfil; é a que gera PDF/WhatsApp. **Relatório** (`report_emissions`): emissão própria, com seleção de fontes; do HOLOSCAN leva só cobertura + `interpretacao_texto`. **Conduta** (`conducts`): por atendimento, com revisões e acordos. **Interpretação do HOLOSCAN**: `holoscan_applications.interpretacao_texto`, copiada no snapshot (só visão profissional) |
| 3 | Arquivos | `resultado-holos.js`, `resultado-pagina.js`, `resultado-sintese.js` (novo), `conduta.js`, `relatorios.js`, `proximos-passos.js`, `app.js` (quadro do HOLOSCAN), `style.css` |
| 4 | Tabelas | `holos_results`, `holoscan_applications`, `holoscan_system_scores`, `holoscan_answers`, `tool_applications`, `methodology_*`, `holos_next_steps`, `conducts`, `agreements`, `profiles` |
| 5 | RPCs | `previa_resultado_holos`, `salvar_rascunho_resultado_holos`, `salvar_resultado_holos`, `revisar_resultado_holos`, `descartar_rascunho_resultado_holos` (internas: `montar_resultado_holos`, `resultado_holos_sistemas`) |
| 6–7 | Snapshot e hash | `content_snapshot` = paciente, profissional, atendimento, HOLOSCAN (notas/faixas **salvas**, Índice, Tríade, cobertura, textos oficiais do pacote, respostas que pontuaram ou deram contexto), ferramentas (cópia integral), observações. `content_hash` = sha256 do conteúdo |
| 8–9 | Versão e histórico | `revision_number`, `supersedes_id` com histórico linear, `superseded_at`; rascunho → salvo → revisado; o que está salvo é imutável (gatilho) |
| 10–11 | Visões | **Um só snapshot**; a visão profissional ou da paciente é um filtro no navegador |
| 12 | Impressão e PDF | `@media print` na aba; página Resultado com html2pdf, imprimir e WhatsApp |
| 13–14 | Dados que entram e que não entram | **Entram:** HOLOSCAN oficial, as ferramentas escolhidas (9 tipos + Mapa do Propósito derivado de OQ³ + PQQ) e as 3 observações. **Não entram:** exames, Leitura Integrada, anamnese, Próximos Passos (fora do snapshot), REC/SEL |
| 15–16 | Calculado ou só exibido | **Salvos e não recalculados:** notas, faixas, Índice, Tríade, cobertura. **Calculados ao salvar:** "pontuou"/"contexto" e o hash. **Só para exibir:** radar, visão conjunta, Mapa do Propósito |
| 17 | Depende de texto da nutricionista | As 3 observações, a leitura/prioridade/próximo passo de cada ferramenta, a interpretação do HOLOSCAN e a Conduta. **Nada disso é obrigatório para salvar** |
| 18 | Determinístico | Notas, faixas, Índice, Tríade, "Por onde investigar" (dois sistemas de nota mais baixa) e Próximos Passos HOLOS (catálogo aprovado) |
| 19 | Depende de metodologia não homologada | Conclusão integrada, fechamento por ferramenta, ferramenta → ferramenta, prioridade e gravidade (pendências PM-01 a PM-05) |
| 20 | Recomendações desligadas | REC-001…015 (`legado_nao_validado`), REC-016…023 (`rascunho_nao_validado`), SEL-001 (`rascunho`) em `corpo-bancos.js`; `regrasApresentaveis()` só aceita `confirmado` e hoje não há nenhuma; as combinações CMB também ficam fora |
| 21–24 | Ferramentas | São 9 `tool_applications` aceitas + o Mapa do Propósito derivado. **Resultado estruturado:** só a Linha do Momentum, e é o `estado_confirmado` escolhido pela nutricionista. **Leitura própria:** todas (`leitura`/`prioridade`/`proximo_passo`, só na visão profissional). **Sem regra oficial de fechamento:** todas |
| 25–26 | Conduta e Resultado | Não há vínculo no banco. A página Resultado junta a Conduta vigente **ao vivo**. O Resultado existe sem Conduta |
| 27 | Risco de dado ao vivo | O snapshot do Resultado HOLOS **não muda**. A página Resultado mistura o snapshot com a Conduta vigente e o Perfil **ao vivo**: um PDF gerado hoje pode diferir de um anterior. Registrado como risco; corrigir exige gravar a emissão (decisão de produto) |

## A2. Fluxo, e em que etapa cada dado nasce

| Etapa | Dado que nasce | Quem |
|---|---|---|
| Paciente | `patients` (nome, telefone…) | nutricionista |
| Anamnese pré-consulta (nova) | `anamnesis_invites.submitted_content` = relato da paciente | paciente |
| Consulta | `encounters` | nutricionista |
| Anamnese | `anamneses` (V2, com rascunho → salvo → revisado) | nutricionista; pode partir do relato da paciente |
| HOLOSCAN | respostas → motor oficial → notas/faixas/Índice/Tríade | paciente responde; o **sistema** calcula pelo pacote homologado |
| Próximos Passos HOLOS | `holos_next_steps` (sistema → ferramenta) | **sistema**, catálogo aprovado |
| Ferramentas | `tool_applications.respostas` (+ leitura da nutricionista) | paciente e nutricionista |
| Resultado HOLOS | `holos_results.content_snapshot` | sistema monta; nutricionista escolhe as fontes |
| Conclusão | **não existe regra**; hoje é só observação opcional da nutricionista | nutricionista (PENDÊNCIA) |
| Conduta | `conducts` + `agreements` | nutricionista |
| Resultado final para a paciente | página Resultado / PDF / WhatsApp (snapshot + Conduta + Perfil) | composição de exibição |

## A3. Matriz de dados

Legenda: **S** = sim · **N** = não · **P** = pendência metodológica.

| Fonte | Dado | Estruturado? | Homologado? | Entra no Resultado? | Gera conclusão? | Gera prioridade? | Indica ferramenta? | Gera próximo passo? | Precisa decisão metodológica? |
|---|---|---|---|---|---|---|---|---|---|
| HOLOSCAN | respostas (84) | S | S (HOLOS-V1@2) | S (pontuou/contexto, profissional) | N | N | N | N | — |
| Índice | nota 0–100 | S | S | S | N | N | N | N | — |
| Tríade | Corpo/Mente/Espírito | S | S | S (dimensão mais baixa só como fato; empate é dito) | N | P | N | N | S (uso clínico) |
| Fúngico | nota, faixa, mensagens | S | S | S | N | S, só a ordem ("Por onde investigar") | S (catálogo REC-FUN) | S (next_action do catálogo) | — |
| Ácido-Inflamatório | idem | S | S | S | N | S (ordem) | S (REC-AIN) | S | — |
| Metabólico | idem | S | S | S | N | S (ordem) | S (REC-MET) | S | — |
| Detox + Linfático | idem | S | S | S | N | S (ordem) | S (REC-DTL) | S | — |
| Mental-Emocional-Espiritual | idem | S | S | S | N | S (ordem) | S (REC-MEE) | S | — |
| OQ³ | quer/precisa/consegue/alavancas | S (textos) | N (sem regra de leitura) | S | N | N | N | N | P |
| Linha do Momentum | 6 notas + estado escolhido | S | parcial (estado é da nutricionista) | S | N | N | N | N | P |
| Mapa da Rotina | blocos, horários, eventos | S | N | S | N | N | N | N | P |
| PQQ | objetivo, r1–r5, verdadeiro | S (textos) | N | S | N | N | N | N | P |
| Mapa de Crenças | crenças, origem, alternativa | S (textos) | N | S | N | N | N | N | P |
| Gatilhos & Respostas | episódio → resposta | S | N | S | N | N | N | N | P |
| Mapa do Propósito | derivado de OQ³ + PQQ | derivado | N | S (se os dois marcados) | N | N | N | N | P |
| Roda Holística | 8 notas + "puxa" | S | N (sem faixa) | S | N | N | N | N | P |
| Carta ao Futuro Eu | texto | N | N | S | N | N | N | N | P |
| Conexão & Pertencimento | vínculos | S | N | S | N | N | N | N | P |
| Anamnese | relato e domínios | S | N (relato, não metodologia) | **N** (fora do Resultado) | N | N | N | N | P (se um dia entrar) |
| Conduta | estratégia, ações, acordos | S | N (decisão profissional) | página Resultado, ao vivo | é a decisão da nutricionista | N | N | é a decisão da nutricionista | — |

## A4. Arquitetura para conclusão automática

`DADOS HOMOLOGADOS → REGRAS OFICIAIS → PRIORIDADES → SÍNTESE → PRÓXIMOS PASSOS`

**Implementado** (`resultado-sintese.js`), em quatro camadas que nunca se misturam e que aparecem **rotuladas** na tela:
1. **Fatos**: Índice; quantos sistemas têm nota (e quais não têm); a ordem do mais baixo ao mais alto; a Tríade (e "dimensão mais baixa" só sem empate); as ferramentas aplicadas por eixo.
2. **Regra oficial**: "Por onde investigar", os dois sistemas com nota mais baixa (mesma regra do HOLOSCAN e do catálogo). Também os **Próximos Passos HOLOS já registrados**: o snapshot imutável `holos_next_steps`, lido sem recalcular.
3. **Decisão da nutricionista**: o estado escolhido na Linha do Momentum, quantas leituras de ferramenta foram registradas, quantas observações (de 3, nenhuma obrigatória).
4. **Pendências metodológicas** (PM-01 a PM-05), com o selo `PENDÊNCIA METODOLÓGICA — AGUARDANDO RODRIGO/DANIEL`.

**Garantias:**
- Nenhuma inferência vira fato. O teste procura frases de conclusão, gravidade ou recomendação.
- Nada é recalculado: o resumo é derivado do snapshot já salvo.

## A5. Indicação de ferramentas

**Já existe uma regra oficial:** o catálogo **HOLOS-RECOMENDACOES-V1** (sistema → ferramenta, 30 regras, aprovado em 09/10, item 176). Ele já está aplicado no HOLOSCAN. Agora também aparece no resumo da **visão profissional** do Resultado, como registro, sem recalcular.

**Não existe regra** "resultado da ferramenta X → ferramenta Y": é a PM-03.
- **Arquitetura:** o padrão do catálogo de Próximos Passos (tabela global imutável + regras aprovadas + snapshot por aplicação) é o encaixe natural.
- A futura matriz deve ser **uma nova versão de catálogo** com outro tipo de origem, e não uma tabela paralela.
- **Nada foi preenchido.**

## A6. Página final, com hierarquia

**Visão profissional, nesta ordem:**
1. Identificação
2. **Resumo estruturado** (novo)
3. HOLOSCAN: Índice e Tríade
4. Os 5 sistemas
5. Corpo, Mente e Espírito com as ferramentas
6. Visão conjunta
7. Observações da nutricionista
8. Histórico

A Conduta fica na aba Conduta e na página Resultado.

**Visão da paciente:**
- **"Resumo da sua avaliação"** (novo, só fatos simples: sistemas, Índice e as ferramentas marcadas para ela);
- o mapa, os sistemas com a mensagem oficial para a paciente, as ferramentas marcadas e as observações dela;
- sem IDs, hash, códigos, pendências, "Por onde investigar" ou Próximos Passos.

## A7. Resultado sem texto obrigatório

**Auditado:** o servidor e a tela **não exigem** texto livre para salvar. Os três campos são opcionais (`nullif`), e a Conduta diz "Nenhum campo é obrigatório".

O teste salva um Resultado sem nenhuma observação e confere que ele abre com o resumo completo.

## A8. Motor de regras futuro

**Não foi criada nenhuma tabela nova.** A governança existente já resolve:
- os pacotes metodológicos (aprovação, hash, versão);
- o catálogo de Próximos Passos (tabela global imutável, `approved_at`, `content_hash`, snapshot por uso).

Uma regra futura de conclusão ou de ferramenta → ferramenta deve:
- ser aprovada e versionada como o catálogo;
- ser aplicada por uma função de servidor;
- ser registrada em snapshot, para nunca reescrever resultado antigo.

## A9. Compatibilidade

- O snapshot, o hash, a imutabilidade, revisão/supersedes, a fonte no servidor, a seleção explícita e as duas visões continuam iguais.
- O resumo é só exibição, derivada do snapshot.
- Resultados já salvos ganham o resumo ao serem abertos, sem nenhuma gravação.

## Riscos restantes

- **Página Resultado e PDF:** misturam o snapshot com a Conduta e o Perfil **ao vivo**, e não há registro de emissão. Ver A1 #27.
- **Mensagem de faixa para a paciente:** traz uma frase dirigida à profissional (PM-05; pendência antiga).
- **Mapa do Propósito:** o catálogo de Próximos Passos pode recomendá-lo, mas ele não é uma `tool_application` aceita no Resultado HOLOS.

## Capturas de tela

Em `docs/v1/resultado-anamnese/`, geradas por `SHOT_DIR=docs/v1/resultado-anamnese node testes/testar-resultado-sintese.mjs` (dados fictícios):
`resultado-resumo-profissional.png`, `resultado-paciente-desktop.png`, `resultado-final-desktop.png` e `resultado-resumo-mobile.png`.
