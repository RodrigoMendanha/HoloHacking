# DEPLOY MR-V1 — PRODUÇÃO (13/10)

**Status: SQL APLICADO E CONFERIDO · FRONTEND NO AR (46cab4e, 72/72 público) · TESTE CARLA PENDENTE**

Este documento não tem senha, token, chave, connection string nem dado de paciente.

## A. Branch/HEAD

| Item | Valor |
|---|---|
| Branch | `claude/admiring-mccarthy-jke2pf` |
| HEAD no início | `46cab4e68852617c05c85b032f501b7890dff738` (igual ao remoto) |
| `git status` | limpo |
| Commits da rodada de UX | `534881d` e `46cab4e` presentes |

**SQL**

| Arquivo | sha256 |
|---|---|
| `supabase/MOTOR-RESULTADOS-PARTE1.sql` | `1fba1cfe…d6b2d` |
| `supabase/MOTOR-RESULTADOS-PARTE2.sql` | `4f216b22…4fd0d` |
| `supabase/MOTOR-RESULTADOS-PARTE3.sql` | `77f2a6db…19007` |

Nenhum dos três mudou desde `cb72230`. O código servido no HEAD é idêntico ao da `46cab4e`; depois dela só mudaram o script de deploy e a documentação.

## B. SQL aplicado

Projeto Supabase `Holohacking` (produção, o mesmo de `supabase-client.js`). Cada parte foi aplicada inteira, com o texto do arquivo, numa transação (`begin … commit`), na ordem 1 → 2 → 3. Nenhum SQL foi editado.

**Pré-checagem (só leitura)**
- O MR-V1 ainda não estava aplicado: não existia `resultado_holos_dominantes`, e a regra das emissões só aceitava `RF-1`.
- Todas as dependências existem: `resultado_holos_sistemas`, `resultado_holos_ferramentas`, `resultado_holos_proximos_passos`, `proximos_passos_pendentes`, `conta_ativa`, `emissao_imagem_valida`.

**Não aplicados, como pedido**
- Administração (`20261016100000`): as funções `admin_*` não existem em produção.
- Publicação direta (`20261018100000`): `publicar_pacote_metodologico` não existe.
- HOLOSCAN v3.

Nenhum deles é necessário. O SQL do MR-V1 não os usa. O front `46cab4e` cai no modo sem administração quando `admin_painel` não existe (`contas.js`), e o botão de publicar um pacote metodológico falha sem a sua RPC. Isso mantém o v3 fora do ar.

## C. Horário

| Momento | Horário |
|---|---|
| Início | 13/10/2026 03:24 UTC (00:24 em Brasília) |
| Fim (conferências feitas) | 13/10/2026 03:29 UTC (00:29 em Brasília) |

## D. Verificações pós-SQL (no banco real, só leitura)

| Verificação | Resultado |
|---|---|
| Corpo das funções = arquivos (md5 de `prosrc`) | `resultado_holos_dominantes` `756b3c5f…` ✔ · `montar_resultado_holos` `b692d1b2…` ✔ · `emitir_resultado_final` `37965811…` ✔ · `emitir_relatorio` `a85d1a9b…` ✔ |
| Template 4 / MR-V1 no snapshot | `montar_resultado_holos` monta `template_version 4` e `motor_resultados 'MR-V1'` (corpo idêntico ao validado no Postgres local: 449 ok) |
| RF-2 permitido / RF-1 preservado | regra `template_version in ('RF-1','RF-2')`; as 2 emissões RF-1 continuam RF-1 |
| `emitir_resultado_final` | RF-2 com a Conduta do **atendimento do Resultado** (`c.encounter_id = r.encounter_id`) |
| `emitir_relatorio` | texto da metodologia pelo estado real do pacote |
| Sinais dominantes | `resultado_holos_dominantes` usa `methodology_questions.statement` (texto oficial da pergunta) |
| Mapa do Propósito | em `derivados.mapa_proposito`, com `fontes` (id e data do OQ³ e do PQQ) |
| Permissões | `emitir_*`: só `authenticated`; `montar_*` e `dominantes`: só pelas RPCs (sem `anon` nem `authenticated` direto) — como antes |
| Nada histórico reescrito | impressão digital (md5) **idêntica antes e depois**: emissões 2 `9ef7ec5e…`, Resultados 2 `6072331f…`, relatórios 2 `a408220a…`, HOLOSCAN 5 `99b10f3f…`, notas 25 `59e29469…` |
| Metodologia | único pacote: HOLOS-V1 v2 `aprovado` (hash `7af1dae6…`). v3 **não** publicado |

Observação: as partes foram executadas como SQL (igual ao SQL Editor), por isso a migration `20261019100000` **não** aparece na lista de migrations do Supabase. É o mesmo caso das partes já rodadas no editor.

## E. Deploy do frontend

**Não foi feito por esta sessão.**
- O deploy é manual, na VPS, feito pelo Rodrigo (`docs/deploy.md`).
- Esta sessão não tem acesso à VPS.
- A política de rede do ambiente bloqueia `holohacking.com.br` (proxy 403), então daqui também não dá para conferir o site público.

**Preparado e provado aqui**
- `scripts/deploy-etapa6-5b.sh` aponta para `46cab4e`. O container de rollback agora se chama `holohacking-web-antes-46cab4e`, porque o nome fixo antigo faria o swap parar.
- `docker build` da `46cab4e` feito localmente: `version.json` `{"commit":"46cab4e"}`.
- Container de teste: `conferir-producao` deu **72 de 72**, todos os scripts do index respondem 200, e os headers `Cache-Control: no-cache`, `nosniff` e `Referrer-Policy` estão presentes.

**Na VPS (Rodrigo)**

```
cd /opt/holohacking && git fetch origin claude/admiring-mccarthy-jke2pf
git show origin/claude/admiring-mccarthy-jke2pf:scripts/deploy-etapa6-5b.sh > /tmp/deploy-mr-v1.sh
sh /tmp/deploy-mr-v1.sh          # passos 4-8: temporario na 8082, para sozinho se nao der 72/72
sh /tmp/deploy-mr-v1.sh swap     # passos 9-11: troca, valida 8080 e o publico (72/72)
```

O script para sozinho em qualquer divergência e mantém o container anterior para rollback (comando no fim da saída).

**Entre o SQL e o deploy**, o front em produção é o anterior (`b12d6d6`). Ele foi conferido no código e convive com o SQL novo:
- desenha toda emissão do mesmo jeito, sem depender de RF-1;
- trata o template 4 pelo ramo `>= 3`;
- ignora os campos novos (`dominantes`, `derivados`).

Uma emissão gerada nesse intervalo sai RF-2 e é desenhada com o front antigo até o deploy.

### Deploy executado na VPS (Rodrigo, 13/10, imagem construída 03:32:33 UTC)

| Passo | Resultado |
|---|---|
| 4–8 (temporário 8082) | 72 de 72; todos os scripts do index respondem 200; `TEMPORARIO VERDE` |
| 9 (swap) | rollback preservado: `holohacking-web-antes-46cab4e` (imagem `holohacking-web:b12d6d6`) |
| 10 (8080) | `version.json` `{"commit":"46cab4e"}`; 72 de 72 |
| 11 (público) | `https://holohacking.com.br/version.json` `{"commit":"46cab4e"}`; `/`, `/app.js`, `/ferramentas-registro.js` e `/style.css` respondem 200; `no-cache`, `nosniff` e `Referrer-Policy` presentes; **72 de 72** |

## F. Hashes

| Onde | Resultado |
|---|---|
| Local (`46cab4e`) | 72 de 72 batem com `docs/deploy.md` §3.5 |
| Container `46cab4e` | 72 de 72 |
| Produção pública | **72 de 72** (passo 11 do script, em `https://holohacking.com.br`) |

## G–K. Teste Carla fictícia em produção

**PENDENTE.** Depende do deploy e de alguém logado no app real; esta sessão não tem acesso ao site nem credencial, e não deve ter.

**Roteiro (só paciente fictícia)**
1. Criar a paciente "Carla Ficticia" e um atendimento.
2. Aplicar o HOLOSCAN e salvar.
3. Concluir o Mapa da Rotina e o PQQ.
4. Salvar o Resultado HOLOS, com as duas ferramentas marcadas "Mostrar ao paciente" e os Próximos Passos ligados.
5. Conferir a visão profissional e a visão da paciente.
6. Registrar a Conduta **nesse atendimento**.
7. Na página Resultado: Gerar Resultado Final, Baixar PDF e Imprimir.
8. Ver a página do WhatsApp, sem enviar.

**Referência:** os checklists das seções 6, 7 e 8 da tarefa batem com as capturas homologadas em `docs/v1/motor-resultados/ux-final/`: 5 páginas em cada PDF, radar presente, sem sobreposição.

**Conferência no banco depois do teste:** é só leitura e não mostra conteúdo clínico. Esta sessão pode rodá-la quando o teste for feito; ela confirma template 4 e MR-V1, dominantes com o texto oficial, mapa com fontes, emissão RF-2 com a Conduta do mesmo atendimento, e as 2 emissões RF-1 intactas.

## L. Smoke tests

| Onde | Resultado |
|---|---|
| Suíte completa (servidor local + Supabase falso, `46cab4e`) | **VERDE**: 147 suítes, 4424 asserções, 0 falhas |
| Contra produção | **pendente / não executável daqui** (o host está bloqueado na rede deste ambiente). Não foi rodado nenhum teste que escreva em produção |

## M. Divergências

Nenhuma no SQL: checksums idênticos, nenhum dado alterado, nenhum erro. Pontos registrados:

1. O deploy do front e o teste em produção dependem do Rodrigo e da VPS.
2. A migration não fica registrada na lista do Supabase (aplicação como SQL, em partes).
3. O script de deploy tinha o nome do container de rollback fixo (`…-antes-b12d6d6`), o que faria o swap parar. Agora o nome usa o commit.

## N. Capturas

As capturas e os PDFs homologados (ambiente de teste, caso Carla) estão em `docs/v1/motor-resultados/ux-final/`. As capturas de produção ficam pendentes até o teste em produção.

## O. Status

| Item | Status |
|---|---|
| MR-V1 (banco) | **APLICADO E CONFERIDO** |
| MR-V1 (frontend) | **NO AR: 46cab4e, 72/72 no público; rollback em `holohacking-web-antes-46cab4e`** |
| Validação em produção (Carla, PDF, smoke) | **PENDENTE** |
| HOLOSCAN v3 | **NÃO PUBLICADO** |
| PP-V2 | **NÃO INICIADO** |
| Administração / Publicação direta | **NÃO APLICADAS** |
