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
- **[confirmado]** O que vai para o ar é a `main` depois do merge da rodada 06:
  a `main` da rodada 04 (`b355dd4`: `646bfcb`, Cache-Control, campo "Data da
  coleta", aviso dos controles deslizantes) mais o **MetaNutri**. Os arquivos
  servidos que mudaram desde a `b355dd4` são `app.js`, `index.html`,
  `style.css`, `supabase-client.js` e o novo `metanutri.js` (39 arquivos
  servidos no total). Os hashes esperados estão no §3.5.
- **[confirmado]** Em 29-set, às 21:08 UTC, os logs do Supabase já mostravam
  leituras que só a `646bfcb` e as seguintes fazem. Não dá para distinguir
  `646bfcb` de `b355dd4` só por leitura: confira o hash (§3.4).
- **[confirmado]** A Edge Function `holos-ai` (a porta do MetaNutri) já está
  no Supabase, versão 3, `verify_jwt = false`, com o mesmo código do repo
  (`supabase/functions/holos-ai/`). Ela não depende do deploy da VPS. Falta
  só a chave (§6).
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

O deploy é da **`main`** depois do merge da rodada 06. Ela já contém a
`646bfcb`, o Cache-Control (`8e040b6`), o campo "Data da coleta", o aviso
dos controles deslizantes e o MetaNutri.

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

Num comando só, os 39 arquivos contra o §3.5 (tem de sair `OK: 39 de 39`):

```sh
sh scripts/conferir-producao.sh                            # o domínio público
sh scripts/conferir-producao.sh http://127.0.0.1:<PORTA>   # só o container
```

Os comandos abaixo são a mesma conferência, arquivo por arquivo.

```sh
curl -sI http://127.0.0.1:<PORTA>/app.js | grep -i cache-control   # Cache-Control: no-cache
curl -s  http://127.0.0.1:<PORTA>/app.js | sha256sum               # dfca9ef7fd1f...
curl -s  http://127.0.0.1:<PORTA>/arquivos.js | sha256sum          # 7a7d638038bd...
curl -s  http://127.0.0.1:<PORTA>/index.html | sha256sum           # a64e890079e1...
curl -s  http://127.0.0.1:<PORTA>/metanutri.js | sha256sum         # c4bcd8b2e697...
curl -s  https://holohacking.com.br/sincronizacao.js | sha256sum   # 58552c7c0682...
```

Se `metanutri.js` ou `sincronizacao.js` derem 200 com o HTML do index, o
arquivo não existe no container, e o deploy **não** pegou a `main` nova. Se
`app.js` bater com `d2e922ff41a0...`, o deploy pegou a `main` da rodada 04,
sem o MetaNutri. Se `app.js` ou `arquivos.js` baterem com os hashes da
`646bfcb` (`dfbb3ef9a448...`, `931bafd5ce52...`), pegou a versão de antes da
rodada 04.

Conferência na tela:
- na ficha de um paciente, aba **Documentos**, cartão **Os valores do
  exame**, tem de existir o campo **Data da coleta**;
- logado, o menu tem **Negócio → MetaNutri** (roteiro em RELEASE-STATE §12.3).

Depois, **uma vez**, recarregue o app no navegador de quem usa com Ctrl+Shift+R.
Isso cobre quem ainda tem os arquivos antigos em cache, de antes do
Cache-Control. Nas próximas atualizações não precisa.

### 3.5 Hashes esperados (sha256 dos arquivos servidos pela `main` da rodada 06)

Todos os 39 arquivos que o `Dockerfile` copia (`index.html style.css favicon.svg
*.js`), calculados no código que vai para a `main` no merge da rodada 06 e
conferidos contra a imagem do `docker build` (o nginx ainda põe o `50x.html`
dele, que não é nosso):

```
a64e890079e19a4574a8ce179d8ea3af2dd47b0f7dbc424babd87a280f7ff94b  index.html
a0dd329348081c9b27e226a90da540748045d7245efccbe661026a90f05506a9  style.css
cd6ef22455f446156c4109649b2d0fc1fe803f0c6697e1029fa71e50ba44cf84  favicon.svg
1a09c374ba7ddfde9088fd207845bcad3680bc918172831b83cf548ff285eb8f  agenda.js
547c3592c469cb26ae8c800ca592698b942e1ef22df1b1b5f8ab61b3d8dd4e98  aplicacoes.js
dfca9ef7fd1ff2ec41fb03d305b40d87f596a1e81d142deec09fb11d98ebe038  app.js
f6c042e5764551dc258ed81f56bec08de43282c1b099d1ef02aa354055c1686f  armazenamento.js
d7302d5134bfa79098755da5f10405972e8ae7e3becfe6c0caad1d1d7a577e7e  arquivo-store.js
7a7d638038bd61911636879ee7f66074a0f1101cc7704fe1acbcbdf6840bb552  arquivos.js
410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7  caso-marina.js
e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14  concorrencia.js
685ae026fbdd6b534aba6b131f461b99c43a465949b87c68c0091a2b34ef1d88  consultas.js
6da59e2472a3d78eb7a6d9f7906ebd0f2fe3eba74ef7345d4723f3f77664f994  corpo-bancos.js
067d8023b58aee9b63d7accb58f75efbc2d86dc499e28e58ea868276e2ff5a3e  dados-router.js
8a5d42956edd044e0c0a949790e49e877e0631ab37974863720230d3ef94443a  dados.js
9050e7a396452363a89caef423b2f291ba079a1b89ad6dbf0b705bbbb608999d  dashboard.js
3dc77dc11f87b4ba84105161194d306ee70b554ab1d6012d1df40dc1c2360f14  demo.js
43455b20ca6c84f847f839d70ac7e25f9cfa83036ea7e5d3256d9f04f0dadbf4  documentos.js
177f1658971f782ad46b2e4245330bd4905d78a714911805bbbdb93f68229171  evolucao.js
11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f  excluir-paciente.js
b41d0539ec749cc46551f8821f2faba3014b178ecea747c06828d733d3873d03  ferramentas.js
4475073c1ae00bd32a82bf72670b74ba136958e6a63aa7e4e7a1c238dd31e23e  ficha.js
cc3eecad693512374d08dee1372e73f76d1e68832ab6298ac6e75d4d0fe4436d  formulario.js
4cec96283203cb03dd1339c9ceb421d4d321b0912dd5d499f561ab52bfe3c46a  holos-ai.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3  importar-v1.js
ac2361fc832b284d956a7e5bdb85d4eeb8648f6318e9421354dbb11f6d404efa  login.js
c4bcd8b2e697688f429397c3fb203e7852f019de2cc4f68add02d6dab7f89043  metanutri.js
199c7a9b9d4ec05a0c676fd171523e9c2015b1b1fb33a78eaf14af7801453788  migracao-supa.js
1755b752431a4b5b10777f65a1b9d24e1c8b0bd6a1cf7f3f34a5b03e66f8b79a  panorama.js
9edf7e3f792faf245fe3bc1ea904d4cda15e50d9922ece11e5a6f07345791707  perfil.js
8c37bec63cd0f676f5519a8facd8a67f0478ec7daa674c6912e5ae1da62a755e  questionario.js
8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63  render-resultado.js
23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c  restaurar-backup.js
2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a  resultado-corpo.js
58552c7c068267a56f2bd61fd24caac0352cd3508627e7775eb96dee7b7253f2  sincronizacao.js
db34d59f91ba7f4e0b2223d36dff0d02effa814fb041f1dc565d84d5b4c3e2ee  supabase-client.js
e99e65461a74c8c89ab9a179b82618af71f606d70d114bb7888ddaeae4618030  utils.js
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

## 6. MetaNutri — colar a chave do hub (Luan)

A Edge Function `holos-ai` já está no Supabase e responde. Sem a chave, a
tela do MetaNutri mostra "O MetaNutri ainda não foi ligado neste app…".
Para ligar, **só o Luan**, com a chave `ags_` do hub em mãos:

1. Entre em supabase.com, no projeto do HoloHacking (`sllhyymeeyoozokgbnuv`).
2. Menu da esquerda: **Edge Functions** → **Secrets**.
3. **Add new secret**:
   - **Name:** `METANUTRI_AGENTE_KEY`
   - **Value:** a chave `ags_` do hub, colada direto do hub.
4. **Save**. Não precisa redeploy: a função lê o secret a cada pedido.
5. Teste pela tela (RELEASE-STATE §12.3, passo 5).

A chave **nunca** vai para arquivo, commit, issue, chat ou mensagem. Ela
fica só nesse secret. Não aparece no navegador nem no log da função.

Para trocar a chave, edite o mesmo secret. Para desligar o MetaNutri, apague
o secret: a tela volta à frase de "ainda não foi ligado".

### 6.1 Redeploy da função (só se o código dela mudar)

O código está em `supabase/functions/holos-ai/` (`index.ts` e
`metanutri.ts`). Com a Supabase CLI logada:

```sh
supabase functions deploy holos-ai --no-verify-jwt --project-ref sllhyymeeyoozokgbnuv
```

`--no-verify-jwt` é de propósito: a função confere o JWT ela mesma e
responde 401 sem sessão. Hashes do código que está no ar (versão 3, rodada 07):

```
fcaf5708c97d2a87def3b74e6af6eb37177c441ce8b734cb6bd51dfd1d623873  supabase/functions/holos-ai/index.ts
bb18a608dca436191913aaa33a9fcafa15b524c3ca89b0141201962f7b0d9f1d  supabase/functions/holos-ai/metanutri.ts
```
