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
- **[confirmado]** Os arquivos servidos deste branch são **byte a byte iguais
  aos da `646bfcb`** (`git diff --quiet 646bfcb HEAD` nos arquivos copiados).
  Os commits depois dela só mexem em `Dockerfile`, `supabase/`,
  `RELEASE-STATE.md` e `docs/`.
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

O deploy é da **646bfcb** mais o Cache-Control (`8e040b6`). Os dois estão no
branch `claude/admiring-mccarthy-jke2pf`. O caminho recomendado é abrir um PR
desse branch para `main`, fazer o merge e fazer o deploy da `main`. Sem merge,
use o branch direto.

```sh
cd <DIR>                                   # clone do repo na VPS
git fetch origin
git checkout main && git pull --ff-only    # depois do merge
# ou, sem merge:  git checkout -B deploy origin/claude/admiring-mccarthy-jke2pf
git log --oneline -1                       # anote o commit
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

```sh
curl -sI http://127.0.0.1:<PORTA>/app.js | grep -i cache-control   # Cache-Control: no-cache
curl -s  http://127.0.0.1:<PORTA>/app.js | sha256sum               # dfbb3ef9a448...
curl -s  http://127.0.0.1:<PORTA>/index.html | sha256sum           # 3b506304caad...
curl -s  https://holohacking.com.br/sincronizacao.js | sha256sum   # c9defc73580f...
```

Se o `sincronizacao.js` der 200 com o HTML do index, o arquivo não existe
no container, e o deploy **não** pegou a `646bfcb`.

Depois, **uma vez**, recarregue o app no navegador de quem usa com Ctrl+Shift+R.
Isso cobre quem ainda tem os arquivos antigos em cache, de antes do
Cache-Control. Nas próximas atualizações não precisa.

### 3.5 Hashes esperados (sha256 dos arquivos da 646bfcb)

```
3b506304caad5b352a110a453745823140de24e9155696cd8a3011424cf90a9b  index.html
173092617705bd0e7323b06150d602160f93ca832d10ab9e3725e1bc92673abf  style.css
dfbb3ef9a448ee88d00a71f94c59a349f0576211209fcf587927cdc317e52ff3  app.js
c9defc73580fe14b3aba885337c7d51fc1b7abe6c7e852567c613d6e1928ca06  sincronizacao.js
931bafd5ce522effc97ea84d7bd776586ea9da23ad112e070ec3e2fc154f961e  arquivos.js
199c7a9b9d4ec05a0c676fd171523e9c2015b1b1fb33a78eaf14af7801453788  migracao-supa.js
ac2361fc832b284d956a7e5bdb85d4eeb8648f6318e9421354dbb11f6d404efa  login.js
547c3592c469cb26ae8c800ca592698b942e1ef22df1b1b5f8ab61b3d8dd4e98  aplicacoes.js
f6c042e5764551dc258ed81f56bec08de43282c1b099d1ef02aa354055c1686f  armazenamento.js
d7302d5134bfa79098755da5f10405972e8ae7e3becfe6c0caad1d1d7a577e7e  arquivo-store.js
4475073c1ae00bd32a82bf72670b74ba136958e6a63aa7e4e7a1c238dd31e23e  ficha.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
```

A lista completa sai de `sha256sum index.html style.css favicon.svg *.js` no
commit implantado.

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
migração da `646bfcb` reenvia o que ficou só no aparelho (ver RELEASE-STATE §5).
