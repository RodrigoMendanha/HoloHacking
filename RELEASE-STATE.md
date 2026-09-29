# RELEASE-STATE — HoloHacking

Estado técnico **atual** do código, escrito no Lote de Release 01 (persistência
autoritativa e multi-dispositivo). Só fatos verificáveis no repositório. Onde
este arquivo e documentos anteriores divergirem (inclusive
`RELATORIO-ARQUITETURAL-LOTE06.md`), vale este.

- **Feature freeze** até o primeiro release para nutricionistas: nada de
  funcionalidade nova, tela nova ou migration nova sem decisão explícita.
- **Produção** (holohacking.com.br) ainda roda uma versão anterior. Este
  release não foi deployado.

---

## 1. Teste canônico

```
npm ci
npm run test:release        # idêntico a: npm run teste
```

`testes/rodar.mjs`:

1. confere que toda `testes/testar-*.mjs` está em `testes/suites.mjs`;
2. sobe um servidor estático temporário em `127.0.0.1:5500`. Se a porta estiver
   ocupada, para com erro, porque reaproveitar um servidor desconhecido podia
   dar verde falso (`--servidor-existente` para forçar);
3. roda cada suíte num processo próprio e **reprova** a suíte se ela:
   terminou com exit ≠ 0, **ou** imprimiu uma linha `FALHA`, **ou** não fez
   nenhuma asserção `ok`;
4. derruba o servidor e sai com exit 1 se qualquer suíte reprovou.

Toda suíte importa `testes/guarda-falhas.mjs`, que força exit 1 quando a
suíte imprimiu `FALHA`, mesmo rodando sozinha. `testar-guarda-falhas.mjs`
prova isso a cada rodada. Antes deste release, 14 suítes imprimiam `FALHA` e
saíam com 0. Isso foi verificado injetando uma falha na versão `cfce960`.

As suítes `testar-release01-*` usam `testes/supabase-falso.mjs`: um banco em
memória com RLS por `nutritionist_id`, esquema **estrito** (coluna fora da
migration é erro), FKs RESTRICT/CASCADE, as duas RPCs, Storage com prefixo por
uid e o limite de 1000 linhas do PostgREST. Dois contextos de navegador
diferentes funcionam como dois computadores com o mesmo banco.

---

## 2. Onde cada dado mora

| Domínio | Sem sessão | Com sessão (autoritativo) | Cópia local com sessão |
|---|---|---|---|
| Pacientes | `holohacking.dados.pacientes` | `patients` (DadosRouter) | nenhuma |
| Consultas / bloqueios | `dados.consultas` / `dados.bloqueios` | `consultations` / `schedule_blocks` (DadosRouter, com tradução de campos) | memória da Agenda |
| Ferramentas (OQ³, PQQ, Linha do Momentum, Mapa de Crenças, Roda, Carta) | `dados.aplicacoes` | `tool_applications` (DadosRouter) | memória de Aplicacoes |
| HOLOSCAN | `holohacking.pontuacao` + `holohacking.questionario` | `holoscan_applications` / `_answers` / `_system_scores` (escrita: RPC `salvar_holoscan_completo`) | as mesmas caixas, reescritas por `sincronizacao.js` |
| Exames | `holohacking.exames` (valores atuais) | `lab_collections` / `lab_results` (escrita: RPC `salvar_coleta_exames`) | `holohacking.exames` + coletas **em memória** |
| Documentos | IndexedDB `holohacking/arquivos` | `documents` + bucket privado `patient-documents` | IndexedDB (cópia vinculada por `_supa_id`) |
| Perfil | `dados.perfil` | `profiles` + `professional_assets` (perfil.js) | — |
| HOLOS AI | — | `ai_threads` / `ai_messages` **dormentes** | — |

**DadosRouter** (`dados-router.js`) só roteia `pacientes`, `consultas`,
`bloqueios` e `aplicacoes`, e só quando `HoloAuth.sessaoAtiva()`. O resto passa
por `DadosLocais`.

---

## 3. Sincronização (`sincronizacao.js`)

Chamada por `carregarTudo()` (app.js) a cada mudança de sessão. A lista de
pacientes aparece antes; quando a leitura remota termina, as telas se
redesenham. A exportação espera essa leitura (`Sincronizacao.aguardar()`).

**Leitura em lote.** Uma leitura por tabela para a carteira inteira, fatiada
em 100 ids por filtro `.in()` e paginada de 1000 em 1000:

- HOLOSCAN: 3 leituras (aplicações, scores, respostas da **última**
  aplicação de cada paciente);
- exames: 2 leituras (coletas e resultados);
- mais a recarga de consultas (Agenda) e de aplicações (Aplicacoes).

**Regras:**

1. **Servidor vence.** Uma entrada local com identidade remota é trocada pela
   versão do servidor, ou sai se o servidor não a tem mais.
2. **Identidade é o ID remoto.** Duas aplicações do HOLOSCAN no mesmo dia são
   dois registros. `guardarPontuacao` só substitui, no mesmo dia, a entrada
   **ainda não salva**, e grava `calculado_em`.
3. **Erro não é vazio.** Com qualquer leitura falhando, nenhuma caixa local é
   tocada e o estado fica `"erro"`. A ficha diz "Não foi possível carregar…" e
   não "Nenhuma aplicação". Agenda e Aplicacoes também mantêm o cache em erro.
4. **O que só existe aqui não se perde.** Os casos que permanecem:
   - HOLOSCAN calculado e não salvo, quando é mais novo que o do servidor no
     mesmo dia (ou quando o servidor não tem nada naquele dia);
   - exame digitado e não conferido (`rascunho`);
   - exame cujo envio falhou (`pendente`, reenviado na próxima carga com a
     data original);
   - respostas do questionário editadas depois da última sincronização.
5. **De quem é.** Se a conta muda durante a leitura, o resultado é descartado.

As decisões ficam em `holohacking.sincronizacao` (metadado, não dado clínico;
entra no stash por conta). As tabelas de decisão são testadas uma a uma em
`testar-release01-regras.mjs`.

**Data da coleta de exames.** O painel de exames **não tem campo de data de
coleta**, então a profissional nunca informa essa data. Por isso, conferir e
salvar grava **data de coleta desconhecida** (`data_coleta_desconhecida =
true`, `coletado_em = null`). Não se inventa "hoje". O momento do registro
fica em `created_at`/`updated_at`: é dado técnico, usado para escolher a
coleta atual e para o "registrada desde" do retorno, e nunca é mostrado como
data da coleta. A tela e a linha do tempo dizem "data não informada".
Consequências:
- a RPC mantém **uma** coleta sem data por paciente (upsert), e cada registro
  pelo painel atualiza essa coleta;
- coletas com data clínica válida (vindas de outros caminhos, ou já
  existentes) são preservadas;
- um reenvio pendente usa a mesma data, ou a mesma ausência de data, com que
  foi registrado;
- os valores atuais do painel são os da última coleta **registrada**.

Datas são strings `AAAA-MM-DD` de ponta a ponta. O teste lê a mesma coleta em
UTC−3, UTC+14 e UTC−11 e o dia não muda.

---

## 4. Documentos

- `ArquivoStore.salvar` só resolve depois de saber o destino remoto.
  `sincronizado: true` significa local + servidor; `false` significa só neste
  navegador (upload ou linha falhou, e nesse caso o objeto órfão sai do
  bucket); `null` significa sem sessão.
- A tela avisa "somente neste dispositivo" quando o envio falha. A lista marca
  "só neste dispositivo" nos arquivos locais sem par remoto.
- A listagem deduplica por identidade (`_supa_id`) e, para o legado, por
  nome + tamanho. Excluir um documento remoto apaga também a cópia local, e a
  tela só confirma se o servidor confirmou.
- Abrir um documento remoto usa `storage.download()` **autenticado**. Não há
  signed URL no código, e isso é intencional. Nenhum caminho de storage ou URL
  vai para localStorage ou para a exportação.
- A seção Documentos (todos os pacientes) usa `listarTudoHibrido`.

---

## 5. Migração local → servidor (`migracao-supa.js`)

- A marca é **por uid**: `holohacking.migrado_supa.<uid>`. A marca global
  antiga `holohacking.migrado_supa_v1` é só lida, nunca mais gravada.
- Com a marca antiga presente e sem a marca da conta, o caso é tratado como
  legado ambíguo: pacientes e bloqueios **não** sobem, porque não há como
  provar de quem são, mas continuam no navegador. O resto só entra se o
  paciente já for da conta, garantido pela FK.
- A marca só é gravada se todos os passos terminaram sem erro. Todos são
  idempotentes: upsert por id com `ignoreDuplicates`, HOLOSCAN conferido por
  (paciente, dia) numa leitura paginada, e exames só para paciente sem coleta
  no servidor.
- Aplicações de ferramenta criadas sem sessão sobem com o mesmo id. Sem o
  vínculo de consulta se a consulta não existir no servidor. Ferramenta legada
  fica local.
- Corrigido neste release: a migração lia `DadosLocais` de forma síncrona e
  **nunca** enviava pacientes, consultas nem bloqueios criados sem sessão.

---

## 6. Contas no mesmo navegador (`login.js`)

- Logout: as caixas clínicas (incluindo `holohacking.sincronizacao`) vão para
  `holohacking._stash.<uid>.*` e saem do disco. A memória de Sincronizacao,
  Agenda e Aplicacoes é limpa.
- `holohacking.dono_local` guarda o uid dono das caixas no disco. Se outra
  conta entra depois de uma sessão que terminou sem logout (token expirado),
  as caixas da anterior vão para o stash dela antes de qualquer leitura ou
  migração.
- O IndexedDB filtra por `uid` dentro do `arquivo-store.js`.

---

## 7. Exclusão de paciente

- Paciente com histórico continua bloqueado (regra do Lote 06; FKs RESTRICT).
- **Em lote:** um paciente por vez. Cada um sai do servidor e, em seguida, do
  navegador. Se o servidor recusar o N-ésimo, os anteriores já estão
  consistentes e os seguintes nem são tentados.
- Corrigido neste release: com sessão, a limpeza local recusava
  (`PACIENTE_NAO_EXISTE`, porque o cadastro mora no servidor) e o cache
  clínico ficava órfão. Agora `excluirPaciente(..., { raizRemota: true })`.

---

## 8. Exportação JSON do prontuário

Espera a leitura remota e inclui: paciente, consultas, HOLOSCAN (histórico,
última pontuação e respostas), valores atuais de exame, coletas datadas (com
sessão), aplicações de ferramenta e metadados de documentos. Não inclui token,
senha, caminho de storage, URL nem binário.

---

## 9. Segurança

- Sem alteração de RLS, policies, buckets, Auth ou schema neste release, e sem
  migration nova.
- Nenhum `service_role`, senha ou segredo no frontend. A publishable key em
  `supabase-client.js` é pública por desenho.
- Dados vindos do servidor são escapados como os locais. Há teste com payload
  HTML no nome do paciente, no laboratório, no documento e na leitura.
- `supabase/functions/holos-ai` (Gemini, lê `GEMINI_API_KEY` e
  `SUPABASE_SERVICE_ROLE_KEY` do ambiente da função) **existe e não é chamada
  pelo frontend**: é um componente dormente.

---

## 10. Pendências conhecidas

1. **Data de coleta de exames:** falta um campo de data de coleta no painel.
   Sem ele, os registros ficam como data desconhecida (ver §3). Criar o campo
   é mudança de tela e depende de decisão de produto.
2. ~~HOLOSCAN cujo "Salvar" falhou~~ **resolvido:** o local fica, o aviso é
   "Os dados foram salvos neste dispositivo, mas não foi possível
   sincronizá-los…", e salvar de novo tenta de novo. Não há fila automática.
3. ~~Interpretação fire-and-forget~~ **resolvido:** "Salvo." só depois da
   confirmação do servidor. Se falhar, aparece o aviso e o texto fica marcado
   como pendente; a hidratação não o troca pela versão antiga do servidor, e
   salvar de novo reenvia.
4. **Leituras via DadosRouter** (pacientes, consultas, aplicações) **não são
   paginadas.** Acima de 1000 linhas por tabela, o PostgREST corta. O HOLOSCAN
   e os exames já são paginados.
5. **Marcas `holohacking.oq3.migrado` / `pqq.migrado`** (migração das caixas
   legadas pré-versionamento) continuam globais por navegador.
6. **Legado ambíguo:** um paciente criado sem sessão num navegador que já tinha
   a marca global antiga não sobe sozinho (fica local, não se perde).
7. **`ai_threads`:** FK simples para `patients` com `ON DELETE CASCADE`, além
   da FK composta. Módulo dormente, não usado pelo frontend. Revisar antes de
   ativar a IA.
8. **Documento enviado por `<input type=file>`:** o Chrome mantém a cópia
   local do IndexedDB atrelada ao arquivo de origem. Se o original for apagado
   do disco, a leitura local falha (a cópia remota não é afetada).
9. **Infra fora deste lote:** SMTP próprio, configuração final do Supabase
   Auth, URLs oficiais dos agentes HOLOS AI e deploy.
