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

Todos os 64 arquivos que o `Dockerfile` copia (`index.html aprovacoes.html style.css favicon.svg
logo-holohacking.png *.js`). Inclui a pagina publica de revisao das perguntas (`aprovacoes.html`, `aprovacoes.js`). Atualizados na conta pendente = somente Perfil 09/10 (`login.js`, `perfil.js`, `app.js`, `index.html`, `style.css`); antes, nos Proximos Passos HOLOS 09/10 (novo `proximos-passos.js`; `app.js`, `index.html`, `style.css`); antes, no prontuario 09/10 (exame e documento sao so arquivos: novo `resultado-pagina.js`; `documentos.js` removido — a secao global Documentos saiu do menu; `arquivos.js`, `arquivo-store.js`, `app.js`, `ficha.js`, `conduta.js`, `relatorios.js`, `evolucao.js`, `timeline.js`, `panorama.js`, `sincronizacao.js`, `migracao-supa.js`, `holos-ai.js`, `dashboard.js`, `ajuda.js`, `demo.js`, `documentos.js`, `index.html`, `style.css`; os arquivos `laboratorio-*.js` e `leitura-integrada-*.js` continuam copiados pelo `Dockerfile` mas nao sao mais carregados pelo `index.html`); antes, na correcao do Perfil (`perfil.js`, `style.css`); antes, na correcao das ferramentas (`formulario.js`, `ferramentas.js`, `app.js`, `index.html`, `style.css`); antes, na correcao da Leitura Integrada (`laboratorio.js`, `arquivos.js`, `agenda.js`, `app.js`, `index.html`, `style.css`); antes, na correcao do HOLOSCAN (`app.js`, `questionario.js`, `consultas.js`, `metodologia-inventario.js`, `index.html`, `style.css`); antes, na correcao da Agenda (`agenda.js`, `atendimento.js`, `app.js`, `ficha.js`, `style.css`); antes, na correcao de Pacientes/Atendimentos (`app.js`, `consultas.js`, `panorama.js`, `metodologia.js`, `questionario.js`, `index.html`, `style.css`); antes, na correcao do dashboard (`dashboard.js`, `agenda.js`, `app.js`, `panorama.js`, `sincronizacao.js`, `index.html`, `style.css`); antes, na troca do logo (pinha dourada: novo `logo-holohacking.png`; `favicon.svg`, `index.html`, `style.css`, `demo.js`); antes, na correcao pos-6.5 (leitura oficial do HOLOSCAN so com textos do pacote; rotulo neutro; textos e acentos: `app.js`, `formulario.js`, `ferramentas.js`, `index.html`); antes, Etapa 6.5 B da V1 (registros clinicos com IDs novos `*_v1`: novo `ferramentas-registro.js`; `ferramentas.js`, `formulario.js`, `panorama.js`, `migracao-supa.js`, `style.css`, `index.html`); antes, Etapa 6.5 (correcao P0: novo `holoscan-oficial.js`; `questionario.js`, `app.js`, `metodologia.js`, `utils.js`, `migracao-supa.js`, `sincronizacao.js`, `ficha.js`, `arquivos.js`, `consultas.js`, `dashboard.js`, `evolucao.js`, `timeline.js`, `panorama.js`, `laboratorio.js`, `metodologia-inventario.js`, `index.html`); antes, Etapa 6.0 da V1 (branch `claude/v1-etapa6-implementacao-li-local`: `laboratorio.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js`, `style.css` e o novo `leitura-integrada-pacote-v1.js`; antes, Etapa 5.3: `metodologia-homologacao.js` e `dados-router.js`; Etapa 5: inclui `laboratorio-catalogo.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js` e `laboratorio.js`; antes, Etapa 4.2: `metodologia-decisoes-v1.js` e `questionario.js`; Etapa 4:
inclui `metodologia.js`, `atendimento.js`, `anamnese.js`, `conduta.js`, `timeline.js`, `relatorios.js`, `metodologia-inventario.js`, `metodologia-pacote.js`, `metodologia-motor.js` e `metodologia-homologacao.js`), conferidos contra a imagem do `docker build` da branch (o nginx ainda põe o
`50x.html` dele, que não é nosso):

```
1b4e897703b3af0b5c5be21bc334ad4c389b1eaa0d0c6832d4b6264e52d6f58e  agenda.js
360eebba79920771434125ef9dc82717bae8ec1a82155b23a6b5c7b6ff173261  ajuda.js
de35fb23e02e7596c583d13331d8fb4ceea2f05c5ac8b3066444529f4ef4c67d  anamnese-v2.js
5400142e00d78a6d2036a928ccf93a3525191f0131b44cdd0e0dcef53e6ffd86  anamnese.js
b1ea48449d74ba8427c7a59947ae73d55a4d88896ea1fcf4f9823dc4087bd049  aplicacoes.js
4c2b0383f592895e35a45869e5efe2a840e04a73a92d85ddd530fbd8aa6e2c93  app.js
6952336cdfd5aa3387bd8a9e15f1860897ae0302e2bfcadbb5f13a32fed89eae  aprovacoes.html
5daf4f30c86424e65636abf8de6dd9edc72439d7533a7bd6e1b7c8a091870825  aprovacoes.js
d3efacba60b26bc2da2311a273881948882570773e4016f59ce2a0845661746c  armazenamento.js
5bb2e258075f144c1ba48d99781919f8bc7be04900d6867cc7bd96fb8ebde6b4  arquivo-store.js
777e27e02ee55ca38405feac5d23660da8efb01348f936eb5198ea589ae207d6  arquivos.js
beb7c9738377c0a57ab081d9f876d4c501bc21217006b029abe48ca3da956966  atendimento.js
410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7  caso-marina.js
e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14  concorrencia.js
173551a8211a366dd6d0ddcbfbab12eaa5bae8d9828a1339d7c3982b0fcaf9cf  conduta.js
0903c2502cb8a3a19fadc964a0946b7b59d2e45a55a9bdbfcf8f7d7a7e841bba  consultas.js
8ada3ba6b43822000e07d335631edeefb01aead266be719e3f030b772c627ef5  contas.js
25ffbc8bf45aec67e9214f403c5a1ffd297f183eaa664f53cebdb7d92e9c50f9  corpo-bancos.js
8f715a12540bc58c932997419f2272bab1e53d66e101929818e81b3d7524c6b6  dados-router.js
a77e7bf6acab37680d25eb5451442539bda71a84c6e921940a6065b9b9a3b806  dados.js
6e3c12499206f03dbb09e34a55dd10efc5d5cc317a1763540d0e8d5a7caed250  dashboard.js
ddeab39e18a0594ecbc64e243b0863f46718e8d9fd45c8ff4ed3658b3b0ba612  demo.js
268838159c1ece024be95518b34b5612dcec93c93b15e4ce8db4d4c9aa3ee3af  evolucao.js
11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f  excluir-paciente.js
ccab4b8d1492eab5ef40def11944fbc8612ff8d4bf26b36548f5641caaa54044  favicon.svg
26c0d88be292ba4f6b688c61c4ae41e68772233b2be5b5e0c24f3be717e2f4eb  ferramentas-registro.js
9c4f481f1f86ae6dd0aac18178093939e3992ef6463a20a81a72099a1fceb5b5  ferramentas.js
b14d2b873997b758f3ccaa270a7e615c82b9e00f15c5ad52fc6a80b7f0e5500b  ficha.js
7c887045f2ea357d49671a2a1b184ab807155f772631d878e73e891aa24db631  formulario.js
e86a0e9fb6152446a8ab3f4a2f863172be89d5a513a59f6700b262a8f62e303b  holos-ai.js
a1fdc291ea46a92dfb48ec92c2c12b7f87be9fb2ed9a9f48cfd29a6721135878  holoscan-oficial.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3  importar-v1.js
c45f77aa04bfc7e5f4ce53017122836bd6da2870d2c0cd6bef37af8bdca33b97  index.html
66b6752b882d5cca5f666545b37db0dfed8c9e6ab8506189ba88bca88975f14a  laboratorio-catalogo.js
8ad2d6789fdc62fe83f2c9cc85acbf03e481ed40f3dc72575b20bc8eb0b2acbc  laboratorio-motor.js
66ca581a8cdb088279a8977e022b71fb58ee3e0cb757805f532d5f1709d1684c  laboratorio.js
dc4e712db79263b6790346edb32e7ffc7c331911b2a2ef17d26b41e3cc389299  leitura-integrada-motor.js
994217cb6cc4208b15fe4d4a9197efd0518c400d68aa0b2f24a6b9a017d2e118  leitura-integrada-pacote-v1.js
642a5dd3105290175553acfc8570d25f1d7abfd63d3b98b40f533410f4d3c644  login.js
ebb3b78b5a3777a2c5df2ff03ff1c532a82e1668bccadc885ebe679e8321a0b3  logo-holohacking.png
51f9b31c0cf3ab7c0b530d07f37a84b205e9e314103ce1397e9a9ff04b3130ba  metodologia-decisoes-v1.js
0baf93b77cbd9dba9fabcc3f374f2272fbb086b56b183ffffefb6fe3cdb23c78  metodologia-homologacao.js
64fd24c09eb5442b3637a2c675acc76ad41cfee5b412818fd862b00878c745df  metodologia-inventario.js
ae87ad9c758f4ccf14cbb0404db8538b8705f4069049c4b002140ef1ec109bd8  metodologia-motor.js
f089a9413c9fb82209a9a027c78fe78b5eb0c8503dd66f290eea13bd88c1b862  metodologia-pacote.js
6125293ef79431419a3d416d9ccf1bab19ee77d6b7dde64a27c6a5399458708d  metodologia.js
7f4aa281060e7fcc194a1414d148c8aa10c4cebf23413a6807d3f42e5326fff2  migracao-supa.js
5da956d0ae2628b06fc13086e5334f949138e84b6948b087f2039a6e585643a3  panorama.js
c0528c6c297de3593623d4a4579706e7dedfc643c9cdfdbecc7f4de8217413b9  perfil.js
b2c713a5d709dfce9192b705ac69938225de094503c9f6f1a904c1a91a4f272f  proximos-passos.js
3e6b83515b8c77d7ff26313ad144a2451c24bbb7816109ea4c24429d8aa6e235  questionario.js
41d50ba55561fccc476f18b867ee1ed79928d8d0ba44496fef1008c6f985dc7d  relatorios.js
8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63  render-resultado.js
23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c  restaurar-backup.js
2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a  resultado-corpo.js
7fe3bc466ce3cb54374b13d43966c4b761ba79bd899d488196e9154452016e53  resultado-holos.js
79ccaee711a1bbe0c1f00e98fd5b5407d909e6c84a84def035c48fe4187c77fd  resultado-pagina.js
2da5d29945a1f58cd9be4f9f3dcae01f879702ed2c841e860263a9576d7f1e8d  sincronizacao.js
5a816006c0da60242dbbbf4aa6467317c74ebd859d7963a4eaef67283f6c1b10  style.css
482687b6663c97cfc92151da80a62ff0fdfa8f82fc3ff24a399ab583d3ff0d6d  supabase-client.js
06d270ebd63159d3535171777d8237f820223897389cb0bf81d2b8ba31ea3bc2  timeline.js
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
