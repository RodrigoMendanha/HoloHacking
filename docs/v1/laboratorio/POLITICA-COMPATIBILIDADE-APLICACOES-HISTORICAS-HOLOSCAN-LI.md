# Política — compatibilidade de aplicações HOLOSCAN históricas com a Leitura Integrada (V1)

Etapa 6.0.1 · 02/10/2026 · política executável (migration `20261002130000`, `app.js`, servidor falso, motor 2.0.1). Complementa a DECISÃO 03 (aplicação elegível) e a Regra 20/21-A (direção HOLOSCAN só com pacote HOLOS-V1 ≥ 2 aprovado).

## Regra

> **Ausência de proveniência não pode ser preenchida silenciosamente.**

1. **Proveniência declarada, nunca inferida.** Toda aplicação HOLOSCAN **nova** salva por `salvar_holoscan_completo` recebe `methodology_package_id` **e** `methodology_package_version` **somente** quando o cliente os declara e o servidor os valida (pacote existente; versão declarada igual à versão do pacote). O app declara esses campos apenas quando existe um pacote metodológico **aprovado e vigente** (`Metodologia.pacote()`); caso contrário envia nulos.
2. **Aplicação histórica permanece sem vínculo.** Uma aplicação gravada sem proveniência suficiente **continua** com `methodology_package_id = null` e `methodology_package_version = null`. Os dois campos são **imutáveis depois do insert** (trigger `holoscan_applications_proveniencia`): nenhum UPDATE os preenche, troca ou apaga.
3. **Nenhum backfill.** Não se infere HOLOS-V1@2 (nem outro pacote) por data da aplicação, por faixa/nota, pelas respostas, pela `versao_estrutura` ou por estrutura parecida. Não há migration de backfill; a migration 6.0.1 prova que nenhuma linha nasce com proveniência.
4. **LI sem prova = sem confronto.** Quando a LI não consegue provar a compatibilidade (aplicação sem pacote; pacote de código diferente; versão < 2; pacote não aprovado), a direção HOLOSCAN é `indeterminate` com reason code **`incompatible_holoscan_version`** e o domínio fica **SEM DADOS SUFICIENTES**. O estado e o motivo são explicados na tela e congelados no snapshot.
5. **Consequência honesta.** Enquanto nenhuma aplicação real carregar proveniência de um pacote aprovado, toda Leitura Integrada real em D01–D04 fica em SEM DADOS por `incompatible_holoscan_version`. Isso é o esperado: a saída oficial exige HOLOSCAN calculado com o pacote homologado, e o pacote HOLOS-V1@2 ainda está em revisão.

## O que a profissional pode fazer

Aplicar o HOLOSCAN **de novo** quando houver pacote aprovado e vigente: a aplicação nova nasce com proveniência e passa a ser elegível. A aplicação antiga continua no histórico, sem vínculo, sem reescrita.

## Provas

- SQL local (`supabase/tests/etapa6-harness.sql` E35–E38): aplicação nova recebe proveniência validada; versão incoerente recusada; backfill por UPDATE recusado; histórica continua sem vínculo.
- Servidor falso e `testar-v1-etapa6-li-banco.mjs`: mesmas provas + LI devolve `incompatible_holoscan_version`.
- Motor (`testar-v1-etapa6-li-motor.mjs`): sem pacote, pacote v1 ou pacote não aprovado → `incompatible_holoscan_version`.
