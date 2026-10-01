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
docker build --build-arg COMMIT=$(git rev-parse --short HEAD) \
  -t holohacking:$(git rev-parse --short HEAD) .
docker stop <CONTAINER> && docker rename <CONTAINER> <CONTAINER>-anterior
docker run -d --name <CONTAINER> --restart unless-stopped -p <PORTA>:80 \
  holohacking:$(git rev-parse --short HEAD)
```

Com compose: `docker compose build && docker compose up -d`, no diretório
do `docker-compose.yml` (passe o commit: `COMMIT=$(git rev-parse --short HEAD)`
como build arg).

O build grava `/version.json` (rodada 08). Confira que o commit no ar é o
que você construiu — o mesmo aparece em Perfil → Conta → Versão do app:

```sh
curl -s http://127.0.0.1:<PORTA>/version.json   # {"version":"0.2.0","commit":"<commit>","builtAt":"..."}
```

`version.json` muda a cada build e por isso **não** entra na lista de
hashes do §3.5.

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
curl -s  http://127.0.0.1:<PORTA>/app.js | sha256sum               # e0ec1b5b041c...
curl -s  http://127.0.0.1:<PORTA>/arquivos.js | sha256sum          # eeec4b819f3f...
curl -s  http://127.0.0.1:<PORTA>/index.html | sha256sum           # 4c01ee32b730...
curl -s  https://holohacking.com.br/sincronizacao.js | sha256sum   # 52d51d4e6717...
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

Todos os 39 arquivos que o `Dockerfile` copia (`index.html style.css favicon.svg
*.js`). Atualizados na Etapa 0 da V1 (branch `claude/v1-etapa0-reconciliacao-mestre`,
inclui `metodologia.js`), conferidos contra a imagem do `docker build` da branch (o nginx ainda põe o
`50x.html` dele, que não é nosso):

```
1599f78b18c11431b79d95464563d7627344c5f41212216c185e59df573c03d2  index.html
a6138345e9cc7cd3d218b755fa721684804b238407ff7e3cdfd844e82c8e0927  style.css
cd6ef22455f446156c4109649b2d0fc1fe803f0c6697e1029fa71e50ba44cf84  favicon.svg
437f2931212f5659852bdbba43e1f6838223e011b2a1f585a64524eeca91201b  agenda.js
2243d3895aefe00fd8d6275c6f4b2de2c211c15988982442c34cd3cd74b5425a  aplicacoes.js
cee21af61ced49b1980770f3ebf9acb20ef1988b8e6cc9cf717a8f50f8afd22f  app.js
d3efacba60b26bc2da2311a273881948882570773e4016f59ce2a0845661746c  armazenamento.js
77f0a880c8784e9e45ad608e4c62dc9791f9a750d75225d85edd9e15a150ce69  arquivo-store.js
dfeffd07050aa39109f7f881ecc0c4d8a1b1911f15ca25a287448dec29836a6a  arquivos.js
410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7  caso-marina.js
e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14  concorrencia.js
f28f869b626c67700c4831090052ffbe31f3a6dc61f87b99fa89fdf647c8fe70  consultas.js
25ffbc8bf45aec67e9214f403c5a1ffd297f183eaa664f53cebdb7d92e9c50f9  corpo-bancos.js
067d8023b58aee9b63d7accb58f75efbc2d86dc499e28e58ea868276e2ff5a3e  dados-router.js
a77e7bf6acab37680d25eb5451442539bda71a84c6e921940a6065b9b9a3b806  dados.js
f22835e915f67643e6a8036294a5032a3f9e5967ef037961144ca43e0779fed5  dashboard.js
a29fad23f5ea2543661b0cd1429670340afbc0ec6654928a6a92fa9d117bf890  demo.js
d7920a0868425c28a2b3192214010fee62bf1153a0c9c9478e8bc9481940cfcc  documentos.js
e0113a4a7080e8d9e1733329a44812fffbf3a1ed7c7a38a5e0cfef589f4d7aa2  evolucao.js
11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f  excluir-paciente.js
66e3f1a501b0a1fc98db4c4d1801148e01cfde71ad1b79ba0d8302f296c5e52b  ferramentas.js
90f4fd1e28d0d06cda848255cd3a543fca5522b16b3bb6005b99e42f7c86856d  ficha.js
ace6c65cf3f034c43125a348d7c8a834f217b31912916a9f16450f5454bbb178  formulario.js
416804e1ec24ab9dd11fa2f6d1fec55b5e193cdfd4731fb98d58e841f0c331e1  holos-ai.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3  importar-v1.js
4d2d9e978566566de60c0009701497790a5dc96d0e6de1bfb8dfbf3889e8faa6  login.js
96d867af34caf51c2e184475750e112815bb728459cec0f13eca8cbdf229643f  metodologia.js
166b0e323628000f7e1a8274eb5b0012d5a22af67d4804c7b4d4f0e95efacf55  migracao-supa.js
0aa32a8554ffecbe0e7198a13ed65aa2ea062478eaf632f45d1fa90978ef0db1  panorama.js
2beaabe619d8dd09438a7bfbbc4677e52cd015cea5483086b6cee46865cd13a3  perfil.js
6249295a8f4ee756ae75c3357eb158ce7726e24e7e0c8eaa637609a156ae4c91  questionario.js
8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63  render-resultado.js
23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c  restaurar-backup.js
2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a  resultado-corpo.js
b206c63d35a7724e04669b71f2cc7ce98cdc27bc2fc85389522f5daa9ff0a789  sincronizacao.js
482687b6663c97cfc92151da80a62ff0fdfa8f82fc3ff24a399ab583d3ff0d6d  supabase-client.js
078361d4aace416d6e43c2ff741ae6f4ec4ec5c07630d7395f6213070c265022  utils.js
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
