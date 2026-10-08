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
  `nginx:stable-alpine` e copia só `index.html style.css favicon.svg logo-holohacking.png *.js` da
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
sha256sum index.html style.css favicon.svg logo-holohacking.png *.js   # tem de bater com o §3.5
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

Num comando só, os 56 arquivos contra o §3.5 (tem de sair `OK: 56 de 56`):

```sh
sh scripts/conferir-producao.sh                            # o domínio público
sh scripts/conferir-producao.sh http://127.0.0.1:<PORTA>   # só o container
```

Os comandos abaixo são a mesma conferência, arquivo por arquivo.

```sh
curl -sI http://127.0.0.1:<PORTA>/app.js | grep -i cache-control   # Cache-Control: no-cache
curl -s  http://127.0.0.1:<PORTA>/app.js | sha256sum               # 9a99174a0df2...
curl -s  http://127.0.0.1:<PORTA>/arquivos.js | sha256sum          # d40530d439ee...
curl -s  http://127.0.0.1:<PORTA>/index.html | sha256sum           # 2dca4406d8a4...
curl -s  https://holohacking.com.br/sincronizacao.js | sha256sum   # 4da93a366a07...
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

Todos os 57 arquivos que o `Dockerfile` copia (`index.html style.css favicon.svg
logo-holohacking.png *.js`). Atualizados na correcao do Perfil (`perfil.js`, `style.css`); antes, na correcao das ferramentas (`formulario.js`, `ferramentas.js`, `app.js`, `index.html`, `style.css`); antes, na correcao da Leitura Integrada (`laboratorio.js`, `arquivos.js`, `agenda.js`, `app.js`, `index.html`, `style.css`); antes, na correcao do HOLOSCAN (`app.js`, `questionario.js`, `consultas.js`, `metodologia-inventario.js`, `index.html`, `style.css`); antes, na correcao da Agenda (`agenda.js`, `atendimento.js`, `app.js`, `ficha.js`, `style.css`); antes, na correcao de Pacientes/Atendimentos (`app.js`, `consultas.js`, `panorama.js`, `metodologia.js`, `questionario.js`, `index.html`, `style.css`); antes, na correcao do dashboard (`dashboard.js`, `agenda.js`, `app.js`, `panorama.js`, `sincronizacao.js`, `index.html`, `style.css`); antes, na troca do logo (pinha dourada: novo `logo-holohacking.png`; `favicon.svg`, `index.html`, `style.css`, `demo.js`); antes, na correcao pos-6.5 (leitura oficial do HOLOSCAN so com textos do pacote; rotulo neutro; textos e acentos: `app.js`, `formulario.js`, `ferramentas.js`, `index.html`); antes, Etapa 6.5 B da V1 (registros clinicos com IDs novos `*_v1`: novo `ferramentas-registro.js`; `ferramentas.js`, `formulario.js`, `panorama.js`, `migracao-supa.js`, `style.css`, `index.html`); antes, Etapa 6.5 (correcao P0: novo `holoscan-oficial.js`; `questionario.js`, `app.js`, `metodologia.js`, `utils.js`, `migracao-supa.js`, `sincronizacao.js`, `ficha.js`, `arquivos.js`, `consultas.js`, `dashboard.js`, `evolucao.js`, `timeline.js`, `panorama.js`, `laboratorio.js`, `metodologia-inventario.js`, `index.html`); antes, Etapa 6.0 da V1 (branch `claude/v1-etapa6-implementacao-li-local`: `laboratorio.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js`, `style.css` e o novo `leitura-integrada-pacote-v1.js`; antes, Etapa 5.3: `metodologia-homologacao.js` e `dados-router.js`; Etapa 5: inclui `laboratorio-catalogo.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js` e `laboratorio.js`; antes, Etapa 4.2: `metodologia-decisoes-v1.js` e `questionario.js`; Etapa 4:
inclui `metodologia.js`, `atendimento.js`, `anamnese.js`, `conduta.js`, `timeline.js`, `relatorios.js`, `metodologia-inventario.js`, `metodologia-pacote.js`, `metodologia-motor.js` e `metodologia-homologacao.js`), conferidos contra a imagem do `docker build` da branch (o nginx ainda põe o
`50x.html` dele, que não é nosso):

```
7a2363c636da01da5e4cb4fd4e6be050119e22c365b3c6277e54f32a51bcd610  index.html
67fb362eb2fb5a2dceb55b07a4d4af26447eb918367f91d358a1bc013283fd5f  style.css
ccab4b8d1492eab5ef40def11944fbc8612ff8d4bf26b36548f5641caaa54044  favicon.svg
ebb3b78b5a3777a2c5df2ff03ff1c532a82e1668bccadc885ebe679e8321a0b3  logo-holohacking.png
1b4e897703b3af0b5c5be21bc334ad4c389b1eaa0d0c6832d4b6264e52d6f58e  agenda.js
475eef541ee174dbe66cb6e7e46cbb6d9fa9f6d5f60c20b5537c80e9936568ab  ajuda.js
cd0daa04a10e165dd536874170bf3c005d9bdb4041b15deb766c2b30596dfef4  anamnese.js
b1ea48449d74ba8427c7a59947ae73d55a4d88896ea1fcf4f9823dc4087bd049  aplicacoes.js
d1ddce7576f9e309e9b1eca5613151e09233f42e21905dc377ccddd8e6fc4b91  app.js
d3efacba60b26bc2da2311a273881948882570773e4016f59ce2a0845661746c  armazenamento.js
bfe67f309f3118f231557fd1ee791b6109d5a7e6b2ec6383587e1279f3c35818  arquivo-store.js
8b42c92d8584eaf7584a13ce3a222b3b18478d0aff235b82e0e9cf333d88fe57  arquivos.js
beb7c9738377c0a57ab081d9f876d4c501bc21217006b029abe48ca3da956966  atendimento.js
410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7  caso-marina.js
e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14  concorrencia.js
e0b155f2f7cf73faf4b79ca5bc67f1468a5dee62fed8912f7c81873a3f9b0141  conduta.js
0903c2502cb8a3a19fadc964a0946b7b59d2e45a55a9bdbfcf8f7d7a7e841bba  consultas.js
8ada3ba6b43822000e07d335631edeefb01aead266be719e3f030b772c627ef5  contas.js
25ffbc8bf45aec67e9214f403c5a1ffd297f183eaa664f53cebdb7d92e9c50f9  corpo-bancos.js
8f715a12540bc58c932997419f2272bab1e53d66e101929818e81b3d7524c6b6  dados-router.js
a77e7bf6acab37680d25eb5451442539bda71a84c6e921940a6065b9b9a3b806  dados.js
4894a728959aa4975bb97d1f46ac136721ca6552280edb7f0a23c315a6535239  dashboard.js
e3754c8ad67864812ed43e829414048c2de729ed4bafbc90ac2c6c282f6ad561  demo.js
f5b720a50871eed8d39e12a7dc7cef6194601bf107a46d9d02032df4089756d7  documentos.js
df872b5cbec1bfa67b617b9413943c2171a7a31663767b9ef77e49ca15a924d3  evolucao.js
11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f  excluir-paciente.js
26c0d88be292ba4f6b688c61c4ae41e68772233b2be5b5e0c24f3be717e2f4eb  ferramentas-registro.js
9c4f481f1f86ae6dd0aac18178093939e3992ef6463a20a81a72099a1fceb5b5  ferramentas.js
ec930eaa37560456df704e0c6a9b6ac260537e21e63b399ab5810681fb5c8425  ficha.js
7c887045f2ea357d49671a2a1b184ab807155f772631d878e73e891aa24db631  formulario.js
c3ba263de187e37e962d90265ce3449d0354c3734268ef5f71f81c0f61ddd10e  holos-ai.js
a1fdc291ea46a92dfb48ec92c2c12b7f87be9fb2ed9a9f48cfd29a6721135878  holoscan-oficial.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3  importar-v1.js
66b6752b882d5cca5f666545b37db0dfed8c9e6ab8506189ba88bca88975f14a  laboratorio-catalogo.js
8ad2d6789fdc62fe83f2c9cc85acbf03e481ed40f3dc72575b20bc8eb0b2acbc  laboratorio-motor.js
66ca581a8cdb088279a8977e022b71fb58ee3e0cb757805f532d5f1709d1684c  laboratorio.js
dc4e712db79263b6790346edb32e7ffc7c331911b2a2ef17d26b41e3cc389299  leitura-integrada-motor.js
994217cb6cc4208b15fe4d4a9197efd0518c400d68aa0b2f24a6b9a017d2e118  leitura-integrada-pacote-v1.js
193e220d3d91d872cfb15ff516224be3ba3f54ab9851ed045dc2230e49320844  login.js
51f9b31c0cf3ab7c0b530d07f37a84b205e9e314103ce1397e9a9ff04b3130ba  metodologia-decisoes-v1.js
0baf93b77cbd9dba9fabcc3f374f2272fbb086b56b183ffffefb6fe3cdb23c78  metodologia-homologacao.js
64fd24c09eb5442b3637a2c675acc76ad41cfee5b412818fd862b00878c745df  metodologia-inventario.js
ae87ad9c758f4ccf14cbb0404db8538b8705f4069049c4b002140ef1ec109bd8  metodologia-motor.js
f089a9413c9fb82209a9a027c78fe78b5eb0c8503dd66f290eea13bd88c1b862  metodologia-pacote.js
6125293ef79431419a3d416d9ccf1bab19ee77d6b7dde64a27c6a5399458708d  metodologia.js
1d5658c6163937094a3ff3611dec8fe089635e6b2027210fef99a45157eed59c  migracao-supa.js
efd736245a2d0bdcb74ffd7f8c3537bef76a64858336a30b6845113780899f74  panorama.js
4361bb915d95808d752026cf741827d7e89b0e89bd9eefb4d18331390e1ea19e  perfil.js
3e6b83515b8c77d7ff26313ad144a2451c24bbb7816109ea4c24429d8aa6e235  questionario.js
eadcbe99f24cc9376cd86494e8260d664388973a55d47ad7eb0ba6835cd7df39  relatorios.js
8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63  render-resultado.js
23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c  restaurar-backup.js
2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a  resultado-corpo.js
acd31da0914a60a6dc4a498fe517628243b0f14dc6f508de6ceb9c18cdc37b6a  sincronizacao.js
482687b6663c97cfc92151da80a62ff0fdfa8f82fc3ff24a399ab583d3ff0d6d  supabase-client.js
8ead7f7e68af785c1c1b2455987cf1a69161913dea0c91f384ac5bd4fbc06de5  timeline.js
4fb021a657aea7e2908081b01e8828444047d2a316a566abdd98d03b0f819cdd  utils.js
f99c4197f8ac91ec9e5ec2f6970c12ad8ec0e3d8dc4513da856289799c095b68  validar-backup.js
```

Para refazer a lista no commit implantado: `sha256sum index.html style.css
favicon.svg logo-holohacking.png *.js`.

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
