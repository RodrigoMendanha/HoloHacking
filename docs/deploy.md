# Deploy — HoloHacking (holohacking.com.br)

Quem roda o deploy: **Rodrigo**. Este documento não tem senha, chave nem
token e não deve ganhar nenhum.

Cada afirmação está marcada:

- **[confirmado]**: verificado no repositório, no banco ou por comando, em 29-set.
- **[leitura]**: dedução ou informação de conversa, **não** verificada. Confira
  na VPS antes de seguir.

---

## 1. O que está confirmado

- **[confirmado]** O app é estático e não tem build. O `Dockerfile` usa
  `nginx:stable-alpine` e copia só `index.html style.css favicon.svg *.js` da
  raiz. As pastas `supabase/`, `testes/`, `docs/` e `node_modules/` não entram
  na imagem.
- **[confirmado]** Desde o commit `8e040b6`, o nginx da imagem responde
  `Cache-Control: no-cache` em tudo, mantendo `nosniff` e `Referrer-Policy`.
  Foi testado com `docker build` + `curl`: 200 com o header em `/`, `/app.js`,
  `/style.css` e na rota do SPA, e 304 com `If-None-Match`.
- **[confirmado]** O repositório não tem CI nem `.github/`. O deploy é manual.
- **[confirmado]** O DNS de `holohacking.com.br` aponta para `168.231.91.180`.
- **[confirmado]** Em 29-set, a produção servia a `cfce960`. Os logs do
  Supabase mostram consultas que só a `cfce960` faz, depois do push da
  `646bfcb`.
- **[informado]** Produção conhecida em 30-set: `849472f` (os mesmos arquivos
  servidos que a `646bfcb`).
- **[confirmado]** O que vai para o ar é a `main` atual: a `646bfcb`, o
  Cache-Control, o campo "Data da coleta" e o aviso dos controles
  deslizantes. Os 38 arquivos servidos são **idênticos** aos da `b355dd4`
  (rodada 04). Os hashes esperados estão no §3.5.
- **[confirmado]** Em 29-set, às 21:08 UTC, os logs do Supabase já mostravam
  leituras que só a `646bfcb` e as seguintes fazem. Não dá para distinguir
  `646bfcb` de `b355dd4` só por leitura: confira o hash (§3.4).
- **[confirmado]** A Edge Function `holos-ai` publicada no Supabase é a
  versão inerte do repositório (HOLOS AI não configurada). O deploy da VPS não
  depende dela nem a altera. Ver §6.
- **[confirmado]** As RPCs `salvar_holoscan_completo` e `salvar_coleta_exames`
  foram consertadas no banco de produção pela migration
  `20260929192605_fix_rpc_record_value`. O deploy do front **não** mexe no banco.
- **[confirmado]** `vercel.json` existe no repo. Não se sabe se há deploy na
  Vercel, porque o DNS aponta para o IP acima e não para a Vercel.

## 2. O que é leitura (não verificado)

- **[leitura]** A VPS é da Hostinger, com Docker. Um Caddy na frente faz HTTPS
  e repassa para o container nginx da imagem acima. Essa informação veio de
  conversa, não de arquivo do repo nem de acesso à máquina.
- **[leitura]** Não sei o diretório do clone na VPS, o nome do container, a
  porta publicada nem se há `docker compose`. Os passos abaixo usam
  `<DIR>`, `<CONTAINER>` e `<PORTA>`: descubra-os com o passo 3.1.

---

## 3. GESTO 1 — o deploy

### 3.0 Antes (no seu computador ou em qualquer máquina com psql)

```sh
SUPABASE_DB_URL='<connection string do Postgres>' sh supabase/checagem/checar-rpcs.sh
```

Siga só se sair `CHECAGEM DAS RPCs: OK`. A connection string fica em Supabase >
Project Settings > Database. Passe-a só no terminal, nunca num arquivo.

### 3.1 Descobrir como está hoje (na VPS, via SSH)

```sh
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'   # nome e porta do container do app
docker inspect <CONTAINER> --format '{{.Config.Image}}'   # imagem em uso
ls /etc/caddy 2>/dev/null; docker ps | grep -i caddy       # onde o Caddy está
```

Anote `<CONTAINER>`, a imagem e a porta (`<PORTA>`) antes de mexer. Se o
projeto sobe com `docker compose`, ache o `docker-compose.yml` e use a
variante compose do passo 3.3.

### 3.2 Trazer o código

O deploy é da **`main`** atual. Ela contém a
`646bfcb`, o Cache-Control (`8e040b6`), o campo "Data da coleta" e o aviso
dos controles deslizantes.

```sh
cd <DIR>                                   # clone do repo na VPS
git fetch origin
git checkout main && git pull --ff-only
git log --oneline -1                       # anote o commit
sha256sum index.html style.css favicon.svg *.js   # tem de bater com o §3.5
```

### 3.3 Construir e trocar o container

```sh
docker build -t holohacking:$(git rev-parse --short HEAD) .
docker stop <CONTAINER> && docker rename <CONTAINER> <CONTAINER>-anterior
docker run -d --name <CONTAINER> --restart unless-stopped -p <PORTA>:80 \
  holohacking:$(git rev-parse --short HEAD)
```

Com compose: `docker compose build && docker compose up -d`, no diretório
do `docker-compose.yml`.

Para voltar atrás:
`docker rm -f <CONTAINER> && docker rename <CONTAINER>-anterior <CONTAINER> && docker start <CONTAINER>`.

O Caddy não precisa mudar se o nome e a porta forem os mesmos.

### 3.4 Conferir na própria VPS

Num comando só, os 38 arquivos contra o §3.5 (tem de sair `OK: 38 de 38`):

```sh
sh scripts/conferir-producao.sh                            # o domínio público
sh scripts/conferir-producao.sh http://127.0.0.1:<PORTA>   # só o container
```

Os comandos abaixo são a mesma conferência, arquivo por arquivo.

```sh
curl -sI http://127.0.0.1:<PORTA>/app.js | grep -i cache-control   # Cache-Control: no-cache
curl -s  http://127.0.0.1:<PORTA>/app.js | sha256sum               # 2078f554223e...
curl -s  http://127.0.0.1:<PORTA>/arquivos.js | sha256sum          # af6a843b8aa8...
curl -s  http://127.0.0.1:<PORTA>/index.html | sha256sum           # 3b506304caad...
curl -s  https://holohacking.com.br/sincronizacao.js | sha256sum   # 1d363c320cf3...
```

Se o `app.js` der `dfca9ef7fd1f...`, o deploy pegou um commit das rodadas
06/07, que não deve ir ao ar. Se o `sincronizacao.js` der 200 com o HTML do
index, o arquivo não existe no container e o deploy **não** pegou a `main`
nova. Se `app.js` ou `arquivos.js`
baterem com os hashes da `646bfcb`/`849472f` (`dfbb3ef9a448...`,
`931bafd5ce52...`), o ar continua na versão de antes da rodada 04.

Conferência na tela:
- na ficha de um paciente, aba **Documentos**, cartão **Os valores do
  exame**, tem de existir o campo **Data da coleta**.

Depois, **uma vez**, recarregue o app no navegador de quem usa com Ctrl+Shift+R.
Isso cobre quem ainda tem os arquivos antigos em cache, de antes do
Cache-Control. Nas próximas atualizações não precisa.

### 3.5 Hashes esperados (sha256 dos arquivos servidos pela `main` saneada)

Todos os 38 arquivos que o `Dockerfile` copia (`index.html style.css favicon.svg
*.js`). São os mesmos da `main` da rodada 04 (`b355dd4`), conferidos contra
a imagem do `docker build` da branch de saneamento (o nginx ainda põe o
`50x.html` dele, que não é nosso):

```
3b506304caad5b352a110a453745823140de24e9155696cd8a3011424cf90a9b  index.html
ebfd54f26a7fa461bfedc8415d7e47898d42cf2327989056d45e434539af0f12  style.css
cd6ef22455f446156c4109649b2d0fc1fe803f0c6697e1029fa71e50ba44cf84  favicon.svg
0123c3be9f9a0e469f605fe6924e1ae76a11b15cda016a0209229fdd5818df2f  agenda.js
2243d3895aefe00fd8d6275c6f4b2de2c211c15988982442c34cd3cd74b5425a  aplicacoes.js
2078f554223ed86d13af3a908e5b992ff343273aea4dee6b372c5475bff132bf  app.js
d3efacba60b26bc2da2311a273881948882570773e4016f59ce2a0845661746c  armazenamento.js
d7302d5134bfa79098755da5f10405972e8ae7e3becfe6c0caad1d1d7a577e7e  arquivo-store.js
af6a843b8aa8fa3638ccf179e674cc7fb5c286e8afb9e12b3a470ab8417e340b  arquivos.js
410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7  caso-marina.js
e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14  concorrencia.js
685ae026fbdd6b534aba6b131f461b99c43a465949b87c68c0091a2b34ef1d88  consultas.js
6da59e2472a3d78eb7a6d9f7906ebd0f2fe3eba74ef7345d4723f3f77664f994  corpo-bancos.js
067d8023b58aee9b63d7accb58f75efbc2d86dc499e28e58ea868276e2ff5a3e  dados-router.js
a77e7bf6acab37680d25eb5451442539bda71a84c6e921940a6065b9b9a3b806  dados.js
9050e7a396452363a89caef423b2f291ba079a1b89ad6dbf0b705bbbb608999d  dashboard.js
3dc77dc11f87b4ba84105161194d306ee70b554ab1d6012d1df40dc1c2360f14  demo.js
43455b20ca6c84f847f839d70ac7e25f9cfa83036ea7e5d3256d9f04f0dadbf4  documentos.js
be74e1fb5321796fd207c03fbf0abd964b925db26fc8095c3ee6424cd6f4f5b6  evolucao.js
11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f  excluir-paciente.js
e31299488b3b783791cc2fc79b8aff907c604058f41cefb9ee959b5877664688  ferramentas.js
666eb26c73909f62f0f450c63df394c9c9db981f57bf43c12c8f090bf7056a68  ficha.js
660b2218e216a8b68655c9935b4e9b2bc182ba63c6b232e9b4b4b85876ad900e  formulario.js
d621f96a80646afc7bac9efe631d9e971ae0a0f0bd4911726a39bcbd787e1a19  holos-ai.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3  importar-v1.js
d3309f4a715f1f3d239842065a19f9cf2ba73baedbdb97fd979206ab8088e934  login.js
166b0e323628000f7e1a8274eb5b0012d5a22af67d4804c7b4d4f0e95efacf55  migracao-supa.js
cc6df703549926d580fabab5726f3fbed93de876d918ed1be6e28bf93b21d1a1  panorama.js
9edf7e3f792faf245fe3bc1ea904d4cda15e50d9922ece11e5a6f07345791707  perfil.js
6249295a8f4ee756ae75c3357eb158ce7726e24e7e0c8eaa637609a156ae4c91  questionario.js
8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63  render-resultado.js
23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c  restaurar-backup.js
2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a  resultado-corpo.js
1d363c320cf373cf29ae395cf5e341f8a5a924acedbcc6204b10530487a67f5c  sincronizacao.js
482687b6663c97cfc92151da80a62ff0fdfa8f82fc3ff24a399ab583d3ff0d6d  supabase-client.js
25719c0c46cf3c05003594ae67f48257a03873a34d16a78282329e8bd7882054  utils.js
f99c4197f8ac91ec9e5ec2f6970c12ad8ec0e3d8dc4513da856289799c095b68  validar-backup.js
```

Para refazer a lista no commit implantado: `sha256sum index.html style.css
favicon.svg *.js`.

---

## 4. GESTO 2 — liberar holohacking.com.br para a conferência do Claude

O ambiente de nuvem onde o Claude trabalha bloqueia `holohacking.com.br`
(o proxy responde 403). Sem isso, o Claude não consegue baixar os arquivos
servidos e comparar o hash com a lista do item 3.5.

1. Na sessão do Claude Code (claude.ai/code), abra o menu do ambiente de
   nuvem na barra de título da sessão e clique em **Edit**.
2. Em **Network access**, adicione `holohacking.com.br` aos domínios
   permitidos. Também serve escolher um nível de acesso mais amplo.
3. Salve. Na rodada seguinte, o Claude roda o item 3.4 contra o domínio
   público.

Referência: https://code.claude.com/docs/en/claude-code-on-the-web

---

## 5. Depois do deploy

"Pronto" só vale com duas nutricionistas reais salvando HOLOSCAN e exames num
aparelho e vendo tudo em outro. Quem salvou HOLOSCAN ou exames entre 22 e
29-set e viu erro deve entrar de novo **no mesmo navegador** em que salvou. A
migração da `main` nova reenvia o que ficou só no aparelho (ver RELEASE-STATE
§5 e §11.3).

---

## 6. Edge Function `holos-ai` (HOLOS AI)

- `supabase/functions/holos-ai/` é **inerte**: responde 503
  `{"erro":"HOLOS_AI_NAO_CONFIGURADA"}`, não chama serviço externo, não lê
  secret nem tabela. O frontend não chama a função.
- **Publicada no Supabase** em 30-set como versão 4, `verify_jwt = true`, com o
  mesmo código do repositório.
- Não configure secret nenhum para a `holos-ai` até a rodada da HOLOS AI
  definir a arquitetura dela.

Para republicar, só se o código mudar:

```sh
supabase functions deploy holos-ai --project-ref sllhyymeeyoozokgbnuv
```

Hashes do código publicado:

```
233e51b5a51b628d87aadfa6a17c01d2f11c5fa5e0b828a4ef7fd7b32ba00cb9  supabase/functions/holos-ai/index.ts
89a057c12c94ad55fc2a5da17792963db3141ec3362edef0007275e1ed6dbfd7  supabase/functions/holos-ai/indisponivel.ts
```
