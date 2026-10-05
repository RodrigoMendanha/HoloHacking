# HOLOHACKING V1 — ETAPA 6.5 — CORREÇÃO P0: HOLOSCAN SÓ OFICIAL

**Estado:** implementado e provado localmente. **Não aplicado no banco real e sem deploy.** Cada um desses passos exige autorização própria.

## 1. O problema (auditoria de produção, pós-deploy 6.4)

- "Gerar o mapa" calculava pelo **motor legado** (`holoscan.js`), e "Salvar" gravava a aplicação com `methodology_package_id` do **HOLOS-V1@2**. O resultado era legado e o carimbo era oficial.
- Reprodução local com as mesmas 84 respostas: legado **Índice 50** × oficial **49,1**. A auditoria encontrou 54 × 51,3.
- O legado:
  - pontua os 11 vínculos `secondary_contextual` (Metabólico com 19 itens em vez de 14; Mental-emocional-espiritual com 29 em vez de 24; Detox com 16 em vez de 15);
  - usa pesos 1–3 do CSV, quando o V1@2 dá peso 1 a todos os primários;
  - redistribui os pesos do Índice entre os sistemas avaliáveis e arredonda para inteiro.
- **Achado 7.22.** `Panorama.contexto()` (exames e ferramentas) **não muda** notas, faixas, Índice nem Tríada: só alimentava as combinações. Mas as combinações (CMB, não homologadas) **eram gravadas** na aplicação.
- **Achados adicionais:**
  - as respostas gravadas vinham do navegador no momento do salvar, e não do cálculo;
  - `migracao-supa.js` podia enviar HOLOSCAN antigo do navegador sem pacote e sem atendimento;
  - `indice` e `nota_media` eram `NOT NULL`;
  - a constraint de faixa só aceitava `baixo/medio/alto`, então a aplicação oficial (`baixa/intermediaria/alta`) seria recusada;
  - havia policies de INSERT direto nas 3 tabelas do HOLOSCAN.

## 2. A correção

**Navegador**
- **`holoscan-oficial.js` (novo).** É o único caminho do questionário até a aplicação:
  - chama `MotorMetodologico.calcular(mode: "oficial")` sobre `Metodologia.obterPacoteAtivo()`;
  - traduz a saída 1:1 para o formato da tela, sem nenhuma conta própria;
  - `payload()` sai do mesmo objeto, com as respostas do cálculo.
- **`questionario.js`.**
  - Sem pacote aprovado e vigente: mensagem *"Não foi possível carregar o pacote metodológico oficial vigente. O mapa não pode ser gerado nem salvo."* e botão **Tentar novamente**, que recarrega o pacote. As respostas continuam guardadas.
  - Não lê mais `Panorama.contexto()`.
  - O motor legado só responde em `?homologacao=1` ou sem cliente Supabase (modo local), com selo de homologação e sem nunca ser salvo.
- **`app.js`.**
  - Salvar exige resultado oficial, calculado com o pacote vigente: mesmo id, versão e hash.
  - Grava combinações e aprofundamentos vazios.
  - Mostra o Índice com 1 casa, ou "—" quando nulo, e a faixa do pacote.
  - Recusa do servidor vira uma mensagem clara.
- **Selo por proveniência** (`metodologia.js` e telas):
  - aplicação oficial V1: "HOLOS-V1 v2 · oficial", sem "Em homologação";
  - histórica: "Aplicação histórica sem pacote metodológico V1";
  - o aviso "em homologação" fica só para o que não foi homologado: comparação, agregados da carteira, confronto legado.
- **`migracao-supa.js`:** HOLOSCAN guardado só no navegador não sobe mais.
- **`sincronizacao.js`:** passa a ler `methodology_package_id/version` (já existentes no banco real).

**Banco** (`supabase/migrations/20261005100000_holoscan_oficial_v1.sql`)
- **Colunas novas** (anuláveis; as históricas ficam nulas, sem backfill): `methodology_content_hash`, `engine_version`, `engine_contract_version`, `calculation_mode`. Entram no snapshot imutável.
- **`indice` e `nota_media`** podem ser nulos, só em aplicação oficial.
- **Faixas:** aceita as do pacote V1, além das legadas, que continuam nas históricas.
- **Trigger BEFORE INSERT:** toda aplicação nova exige pacote aprovado, vigente na data clínica, versão, hash homologado e modo oficial.
- **`salvar_holoscan_completo`, nível 1:** o mesmo que o trigger, mais:
  - recálculo de `metodologia_hash_conteudo`;
  - contrato do motor;
  - atendimento.
- **`salvar_holoscan_completo`, nível 2** (só contagem, sem regra clínica refeita em SQL):
  - respostas dentro do pacote e da escala, sem duplicatas;
  - cobertura;
  - uma nota por sistema do pacote;
  - `respondidos`/`total_marcadores` pelos **vínculos primários**;
  - nota de 0 a 10 com faixa do pacote, ou nota e faixa nulas se não avaliável;
  - Índice só com todos os sistemas avaliáveis;
  - combinações e aprofundamentos vazios.
- **Sem INSERT direto** nas tabelas do HOLOSCAN: o único caminho é a RPC.
- **Nível 3, não feito:** recalcular nota, faixa, Índice e Tríada em SQL seria um segundo motor. Se for desejado, fica para uma Edge Function com o mesmo `metodologia-motor.js`.

## 3. Provas (locais)

- **Cadeia local** (`scripts/validar-cadeia-local.sh`): 260 ok, 0 falhas.
  - Inclui `supabase/tests/holoscan-oficial-harness.sql`, H00–H20: as recusas; o aceite da aplicação oficial e da aplicação com Índice NULL; inserts diretos recusados; trigger; imutabilidade; históricas idênticas.
- **Artefato do banco real** (`scripts/testar-aplicacao-holoscan-oficial-local.sh`, sobre a reprodução do estado real pós-6.3-E):
  - T0 pre-flight `pode_aplicar = true`;
  - T1 aplicação integral, post-flight `aplicacao_ok = true` e digitais iguais;
  - T2 segunda execução, T3 estado divergente, T4 falha no meio e T5 pós-verificação falhando abortam sem gravar nada;
  - T6: o payload oficial é aceito; o payload do front antigo, o resultado legado e as secundárias contadas são recusados.
- **Testes JS novos:**
  - `testar-v1-holoscan-oficial.mjs`: paridade tela = motor = payload = salvo; secundárias; Panorama; ausência; recusas; pacote ausente, não aprovado e não vigente; selo; migração;
  - `testar-v1-holoscan-oficial-ui.mjs`: navegador, do fluxo real até o salvo, com a tela igual ao motor e ao salvo; o rascunho alterado depois de gerar não entra; sem pacote; "Tentar novamente"; histórica.
- **Testes legados ajustados** (mudança de contrato documentada no próprio arquivo):
  - testes de banco e de interface agora gravam HOLOSCAN só oficial, sobre o HOLOS-V1 aprovado (fixture `testes/holos-aprovado.mjs`, aprovado pelo caminho real);
  - aplicações pré-existentes entram como históricas;
  - `testar-v1-etapa1.mjs` tinha um bug de data, independente desta etapa: falhava às segundas-feiras inclusive em `d4c2da4`.
- **`docs/deploy.md` §3.5:** 55 arquivos.
- **Inventário metodológico regenerado:** muda só o sha de `questionario.js`; o conteúdo do pacote é idêntico, `content_hash` JS `3593d782…`.

## 4. Ordem para produção (cada passo com autorização própria)

1. **Backup/snapshot** do Supabase.
2. **`supabase/ETAPA6-5-PREFLIGHT.sql`** (só leitura): tem de dar `pode_aplicar = true`. Guarde as `digitais`.
3. **`supabase/ETAPA6-5-APLICACAO-HOLOSCAN-OFICIAL.sql`** no SQL Editor, inteiro: uma transação, com guarda, migration, histórico, verificação e COMMIT.
4. **`supabase/ETAPA6-5-POSTFLIGHT.sql`**: tem de dar `aplicacao_ok = true`, com as **digitais iguais** às do pre-flight.
5. **Deploy do front** na VPS (como na 6.4), com `conferir-producao.sh` dando **55 de 55**.
   - A ordem importa: **migration antes do front**.
   - Entre os passos 3 e 5, o front antigo fica sem conseguir salvar HOLOSCAN: o servidor recusa resultado sem modo oficial. Isso é intencional.
6. **`supabase/ETAPA6-5-VERIFICACAO-POS-DEPLOY.sql`**: tem de dar `deploy_ok = true` e `primeira_app_ok = false`.
7. **Primeira aplicação HOLOSCAN real** e nova verificação: `primeira_app_ok = true`.

## 5. Efeitos visíveis para a nutricionista

- O Índice aparece com 1 casa (ex.: 49,1) e pode aparecer como **"—"** quando algum sistema fica abaixo de 80% de respostas.
- Sistemas abaixo da cobertura mínima aparecem como "X de N respondidas · abaixo da cobertura mínima do pacote: sem nota".
- As faixas passam a ser **baixa / intermediária / alta**, as do pacote.
- As 4 aplicações históricas continuam com os números de antes e o rótulo "Aplicação histórica sem pacote metodológico V1".
