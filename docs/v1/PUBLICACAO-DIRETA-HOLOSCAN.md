# HOLOSCAN sem homologação: publicação direta (12/10)

> **Atualização 13/10/2026.** O mecanismo de publicação direta descrito aqui continua o mesmo. A versão publicada
> com as decisões de 13/10 é o HOLOS-V1 **v4**; a v3 de produção é o rascunho de 12/10, publicado por engano por um
> navegador com o front antigo carregado (0 aplicações) e retirado pela v4. Ver `docs/v1/ALTERACOES-PACOTE-HOLOSCAN-NOVA-VERSAO.md`.

**Decisão da usuária (12/10):** "o sistema todo já está aprovado, essas perguntas já estão aprovadas... qualquer alteração que a gente faça no HOLOSCAN... deixar direto".

Escolhas feitas por ela:
- a publicação é **automática no deploy**;
- a página pública de revisão (`aprovacoes.html`) **sai do ar**.

## Como funciona agora

1. A revisão das perguntas vem no código (hoje `metodologia-revisao-v3.js`).
2. Depois do deploy, o responsável metodológico entra no sistema. É a conta dona do v2, a única com o papel `holoscan/1`.
3. Com essa entrada, o próprio sistema faz o resto:
   - **grava** o HOLOS-V1 v3 a partir do v2 que está no banco (82 perguntas);
   - **publica** o v3, com a RPC nova `publicar_pacote_metodologico`.
4. Na publicação, o servidor:
   - confere o validador (zero erros) e calcula o hash do conteúdo;
   - põe o v3 **no ar hoje**;
   - **retira o v2**, que fica vigente só até ontem.
5. Daí em diante, todo HOLOSCAN novo, de qualquer conta, usa o v3.
   - O questionário mostra as 82 perguntas e o botão diz "82 perguntas".
6. **Nada se perde:**
   - HOLOSCANs, Resultados e emissões já salvos **continuam no v2**, idênticos;
   - a Evolução mostra v2 e v3 lado a lado, como antes.

**Não há botão, Aprovação, Homologação nem SQL a cada versão.**

**Uma mudança futura nas perguntas (v4, v5…)** segue o mesmo caminho:
1. eu escrevo a revisão no código;
2. você faz o deploy;
3. no seu próximo login, a versão nova entra no ar.

## O que continua protegendo o motor e a sincronização

São verificações técnicas, não aprovação:

| Proteção | Por quê |
|---|---|
| Só o responsável metodológico publica | o pacote no ar vale para **todas** as contas. Sem essa trava, qualquer conta poderia trocar as perguntas de todo mundo |
| Validador do servidor sem erros | escalas, sistemas, faixas, Índice e Tríade completos; sem isso o motor calcularia errado |
| Hash do conteúdo calculado no servidor | é o mesmo que `salvar_holoscan_completo` confere em cada HOLOSCAN; o motor e o banco nunca divergem |
| Só a versão seguinte (v2 → v3 → v4) | não pula número nem volta atrás |
| Versão publicada é imutável | texto novo exige versão nova; os HOLOSCANs antigos nunca mudam |
| Registro de auditoria | `methodology_homologation_records` guarda quem publicou, quando e o hash (fonte "publicacao direta") |

**Ficam no banco, intactas:** as RPCs antigas de Aprovação e Homologação, as aprovações já registradas e as respostas da revisão pública. Nada é apagado.

## Arquivos

| Arquivo | O que mudou |
|---|---|
| `supabase/migrations/20261018100000_publicacao_direta_metodologia.sql` (nova) | regime `publicacao_direta` nas constraints; RPC `publicar_pacote_metodologico`; RPCs anônimas da revisão pública fechadas (`revoke`) |
| `metodologia-pacote.js` | `publicar`, `publicarRevisoesPendentes`. Antes de gravar qualquer coisa, confere o papel da conta (`meus_papeis_aprovacao`); é idempotente, então entrar de novo não grava outra versão |
| `metodologia-homologacao.js` | o login chama `publicarRevisoesPendentes`. A tela (`?homologacao=1`) virou só consulta: saíram Gravar, Registrar Aprovação, Homologar e Retirar |
| `aprovacoes.html`, `aprovacoes.js` (removidos), `Dockerfile` | a página de revisão pública sai do site |
| `testes/supabase-falso.mjs` | a mesma RPC, com as mesmas regras |
| `testes/holos-aprovado.mjs` | a fixture tira o papel de responsável depois de semear o v2 (os testes antigos continuam no v2). `manterAprovador: true` mantém o papel |
| `testes/testar-questionario-v3.mjs` | refeito para o fluxo novo (ver Testes) |
| `testes/testar-aprovacoes.mjs` (removido), `testes/suites.mjs`, `testes/testar-conferir-producao.mjs` | página fora do ar |
| `supabase/tests/publicacao-direta-harness.sql` (novo), `scripts/validar-cadeia-local.sh` | prova no Postgres |
| `docs/deploy.md` | hashes do §3.5 (70 arquivos) |

## Testes

**Postgres local** (`supabase/tests/publicacao-direta-harness.sql`, com as regras reais do banco), **442 ok, 0 falhas** na cadeia:

| Teste | O que prova |
|---|---|
| PD01 | conta sem o papel não publica |
| PD02 | versão fora de ordem é recusada |
| PD03 | a versão publicada fica no ar hoje, com o hash do servidor e **nenhuma Aprovação registrada**; a anterior é retirada, com auditoria |
| PD04 | HOLOSCAN novo na versão publicada é aceito; na anterior, recusado |
| PD05 | publicar de novo é recusado; a versão publicada é imutável |
| PD06 | as RPCs da revisão pública não são mais chamáveis pela API; as respostas antigas ficam intactas |

**Pela tela** (`testes/testar-questionario-v3.mjs`, 16 ok):
- outra conta entra e nada é publicado;
- a responsável entra, o v3 é publicado sozinho e o v2 é retirado;
- não há Aprovação registrada; o hash é o do servidor; entrar de novo não duplica;
- a tela de Metodologia não tem botões de aprovação;
- o questionário tem 82 perguntas (48/19/15), com os textos novos;
- um HOLOSCAN salvo no v3 tem 82 respostas (Ácido Inflamatório sobre 14, Mental sobre 24);
- a aplicação antiga do v2 fica idêntica.

**As partes do SQL Editor** rodaram **duas vezes seguidas** dentro da cadeia local, sem erro.

## Para colocar no ar (nesta ordem)

1. **Banco: SQL Editor do Supabase.** Rode `supabase/PUBLICACAO-DIRETA-PARTE1.sql` e depois `PARTE2.sql`, cada uma inteira.
   - O último `select` de cada parte tem de mostrar tudo `true`.
   - A pré-checagem da parte 1 também deve sair `true`: v2 existe e o responsável está ativo. Isso foi conferido no banco real, só leitura.
2. **Deploy do site** com o commit desta entrega.
3. **Entre no sistema com a conta do responsável metodológico.** O v3 entra no ar nesse momento.
   - Para conferir: o botão do HOLOSCAN passa a dizer "82 perguntas".

**Se o deploy vier antes do banco:** o login grava o v3 "em revisão", mas não consegue publicar, porque o servidor ainda não tem a RPC.
- O v3 "em revisão" fica parado, sem efeito; o v2 continua no ar.
- Depois de rodar o SQL, basta entrar de novo: esse mesmo v3 é publicado, sem duplicar.

**SHA-256:**
```
f8faff1fb8f827aa074698b0a79142f20c74a33b8d7b07ceb15e4ecf3028824f  20261018100000_publicacao_direta_metodologia.sql
ed4e88cb5f8a05bcade4c4c5578b5a1d20f9251da24df3f6c547c16556ae3f52  PUBLICACAO-DIRETA-PARTE1.sql
659b81bb9e4c88fc6f5ded2b20e37960a401bf87dd4cb7114f63166d2aff0f9e  PUBLICACAO-DIRETA-PARTE2.sql
```

## Observações

- **Em uso no dia da publicação:** um HOLOSCAN começado no v2 antes do login da responsável e salvo depois é recusado pelo servidor, porque o v2 saiu do ar. É preciso refazer o questionário no v3. Para evitar, entre no sistema logo depois do deploy.
- **Modo `?homologacao=1`:** continua existindo para a consulta técnica do pacote e para o motor legado. Não aprova nem publica nada.
- **Pendências do v3 para revisão metodológica separada** (não alteradas): SNT-210 (PCR/VHS) e SNT-309 (triglicerídeos/HDL). Ver `IMPLEMENTACAO-MAPEAMENTO-HOLISTICO-ENXUTO-V1.md`, seção R.
