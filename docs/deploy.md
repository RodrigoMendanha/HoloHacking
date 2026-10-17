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
curl -s  http://127.0.0.1:<PORTA>/app.js | sha256sum               # 99d8d63860a1...
curl -s  http://127.0.0.1:<PORTA>/arquivos.js | sha256sum          # 893f4113d3fa...
curl -s  http://127.0.0.1:<PORTA>/index.html | sha256sum           # 3287d4a0578c...
curl -s  https://holohacking.com.br/sincronizacao.js | sha256sum   # 2da5d29945a1...
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

Todos os 79 arquivos que o `Dockerfile` copia (`index.html anamnese.html style.css favicon.svg
logo-holohacking.png *.js`). Atualizados no pacote de estabilizacao pre-producao (16/10: aba Assistente de IA escondida, retorno pelo ciclo, numeracao por paciente, Encerrar atendimento, estados da consulta, Evolucao antes x agora, PDF com numero de pagina, virgula decimal, textos; `agenda.js`, `ajuda.js`, `anamnese-convite.js`, `anamnese-publica.js`, `anamnese.html`, `app.js`, `arquivo-store.js`, `arquivos.js`, `atendimento.js`, `conexao-ia.js`, `consultas.js`, `dashboard.js`, `evolucao.js`, `ferramentas.js`, `ficha.js`, `formulario.js`, `index.html`, `login.js`, `metodologia.js`, `resultado-direcao.js`, `resultado-holos.js`, `resultado-pagina.js`, `resultado-playbook.js`, `style.css`, `utils.js`). Antes, no envio direto pelo WhatsApp (16/10: `resultado-holos.js` com "Enviar no WhatsApp" e "Baixar PDF" na versão vigente da ficha; `resultado-pagina.js` com `emitirEEnviar` e a faixa "PDF pronto"; `style.css`). Antes, no Playbook HOLOS PB-V1 (14/10: novos `playbook-holos.js` e `resultado-playbook.js` — o Resultado sem depender da IA; `resultado-holos.js`, `holos-ai-ponte.js`, `index.html`, `style.css`; depois da aprovação: respostas das ferramentas no passo 1 e em Corpo · Mente · Espírito, mensagens claras sem HOLOSCAN/atendimento). Antes, no painel de Atendimentos e na saída da Conduta (14/10: `consultas.js`, `dashboard.js`, `app.js`, `ajuda.js`, `ficha.js`, `holos-ai-ponte.js`, `resultado-holos.js`, `resultado-pagina.js`, `index.html`, `style.css`). Antes, na escolha de paciente da Holos IA e nas listas suspensas (14/10: `holos-ai-ponte.js`, `index.html`, `style.css`). Antes, no fluxo enxuto da ficha (14/10: `index.html`, `style.css`, `anamnese-convite.js`, `anamnese-v2.js`, `arquivos.js`, `dashboard.js`, `ficha.js`, `mapeamento-holistico.js`, `panorama.js`, `resultado-pagina.js`: jornada de 7 passos, Enviar Mapeamento, abas Conduta/Relatório e menu Atendimentos escondidos, desconfortos em opções, Marcar como revisado, PDF do Resultado com a identidade HoloHacking). Antes, no redesenho final do Mapeamento (14/10: `anamnese-publica.js`, `anamnese-v2.js`, `anamnese.html`, `mapeamento-holistico.js`: sono, o que dificulta, títulos dentro dos cartões). Antes, no Mapeamento Holístico MH-3 (14/10: `anamnese-publica.js`, `anamnese-v2.js`, `mapeamento-holistico.js`: perguntas abertas de volta, exemplo em cinza). Antes, na ajuda das ferramentas (14/10: `ajuda-ferramentas.js`, `formulario.js`, `style.css`: "?" na lista e em cada pergunta, exemplo em cinza). Antes, no Mapeamento Holístico MH-2 (14/10: `anamnese-publica.js`, `anamnese-v2.js`, `anamnese.html`, `holos-ai-ponte.js`, `mapeamento-holistico.js`, `style.css`: pré-consulta enxuta, versão gravada na resposta). Antes, no alinhamento do Dashboard (14/10: `style.css`, topo na mesma régua dos painéis). Antes, na troca do nome Holusiá -> Holos IA (14/10: `app.js`, `holos-ai-ponte.js`, `index.html`, `style.css`). Antes, na rodada UX de 14/10 (novo `ajuda-ferramentas.js` — o "?" das 10 ferramentas; `anamnese-publica.js`, `anamnese.html`, `app.js`, `contas.js`, `dashboard.js`, `ferramentas-fechamento.js`, `ficha.js`, `formulario.js`, `holos-ai-ponte.js`, `holoscan-oficial.js`, `index.html`, `style.css`: réguas sem resposta, contraste do modo claro, menu QF/QM/QE, página Holos IA, X do paciente, HOLOSCAN pré/pós, Tríade "Por quê", PQQ com 3 perguntas). Antes, na simplificação definitiva HOLOS AI → Resultado (14/10: `holos-ai-ponte.js` com 3 passos e o Resultado pronto; `holos-ai-contrato.js` com a regra fixa e o aceite automático; `resultado-holos.js` com `gerarAutomatico`; `resultado-pagina.js` com `emitirEPdf`; `holos-ai.js` com o contexto antigo recolhido; `style.css` com o cartão do Resultado pronto e o PDF simples). Antes, no fechamento da HOLOS AI v1.2 (14/10: `holos-ai-contrato.js` com as 4 chaves obrigatorias, regras estruturais e avisos; `holos-ai-ponte.js` com o rotulo unico; `holos-ai.js` com a nota do link do GPT). Antes, na ponte HOLOS AI → Resultado HOLOS (14/10: novos `holos-ai-contrato.js` e `holos-ai-ponte.js`; `holos-ai.js`, `resultado-holos.js`, `resultado-direcao.js`, `index.html`, `style.css`). Antes, na Fase 1 do plano mestre (13/10: fluxo do Mapeamento — `anamnese-convite.js`, `mapeamento-holistico.js`, `dashboard.js`, `ficha.js`, `style.css`). Antes, no HOLOS-V1 v5 (Lote 2B, 13/10: `metodologia-revisao-v3.js` ganha `MetodologiaRevisaoV5`; `metodologia-pacote.js`: pergunta so contextual no validador e decisao `contextualizar` na revisao; a publicacao direta encadeia v4 -> v5). Antes, na correcao 13/10 (as decisoes de 13/10 viram HOLOS-V1 v4, porque o v3 de producao foi o rascunho de 12/10 publicado por engano: `metodologia-revisao-v3.js`; e a aplicacao do HOLOSCAN deixa de mostrar a quantidade de perguntas: `questionario.js`, `index.html`, `ajuda.js`, `demo.js`). Antes, no HOLOS-V1 v3 das decisoes metodologicas de 13/10 (`metodologia-revisao-v3.js`: so as decisoes de 13/10 — SNT-210 e SNT-309 removidas, 13 EMO no Sistema Mental Emocional Espiritual; `metodologia-pacote.js`: retirada de associacoes contextuais na revisao; `metodologia-homologacao.js`, `ficha.js`, `resultado-sintese.js`: textos sem "84 perguntas" e PM-15 decidida). Antes, nas correcoes pos-teste do MR-V1 13/10 (`style.css`, `resultado-pagina.js`, `resultado-holos.js`, `resultado-sintese.js`, `sistemas-fechamento.js`, `ficha.js`, `index.html`: cores do tema claro fixas no documento da paciente, paginacao propria do PDF baixado, rodape compacto, "Proximo aprofundamento sugerido", rotulo do relatorio profissional, Mapa de Frequencias fora da interface, frase pos-HOLOSCAN). Antes, atualizados na rodada final de UX do Resultado da paciente 13/10 (`sistemas-fechamento.js`, `ferramentas-fechamento.js`, `resultado-holos.js`, `resultado-sintese.js`, `resultado-pagina.js`, `style.css`: linguagem da paciente, "Possiveis proximos aprofundamentos", "Por que usamos esta ferramenta", cartoes compactos nos Detalhes do mapa, impressao por copia em #rp-impressao e PDF baixado sem sobreposicao). Antes, no motor de resultados V1 12/10 (novos `resultado-legado-r3.js` e `sistemas-fechamento.js`; `ferramentas-fechamento.js`, `resultado-sintese.js`, `resultado-pagina.js`, `arquivos.js`, `holos-ai.js`, `proximos-passos.js`, desenho congelado das emissoes RF-1; `app.js`, `holoscan-oficial.js`, `relatorios.js`, `resultado-holos.js`, `resultado-pagina.js`, `utils.js`, `index.html`, `style.css`). A pagina publica de revisao das perguntas (`aprovacoes.html`, `aprovacoes.js`) saiu do site na publicacao direta 12/10. Atualizados na publicacao direta do HOLOSCAN 12/10 (`metodologia-pacote.js`, `metodologia-homologacao.js`: a versao nova entra no ar sozinha, sem aprovacao; tela so de consulta); antes, no Mapeamento Holistico enxuto 12/10 (novo `mapeamento-holistico.js`; `anamnese-publica.js`, `anamnese-v2.js`, `anamnese.html`, `anamnese-convite.js`, `anamnese.js`, `ficha.js`, `dashboard.js`, `index.html`, `style.css`: 5 blocos + revisar, selecao rapida, condicionais, resposta completa na ficha); antes, no redesign de Pacientes 12/10 (`app.js`, `index.html`, `ficha.js`, `atendimento.js`, `dashboard.js`, `style.css`: lista em tabela, ficha compacta, jornada horizontal, abas, Visao em duas colunas); antes, no Mapeamento Holistico V1 12/10 (`anamnese-publica.js`, `anamnese-v2.js`, `anamnese.html`: 7 etapas, sem medidas, perguntas novas); antes, no Mapeamento Holistico 12/10 (`anamnese-convite.js`, `anamnese.js`, `anamnese.html`, `dashboard.js`, `style.css`: leitura dos convites com colunas explicitas; depois a palavra "anamnese" saiu da interface: `anamnese-publica.js`, `anamnese-v2.js`, `timeline.js`, `ficha.js`, `relatorios.js`, `holos-ai.js`, `evolucao.js`, `demo.js`, `index.html`); antes, no Dashboard 12/10 (`dashboard.js`, `app.js`, `perfil.js`, `index.html`, `style.css`); antes, na revisao das perguntas 12/10 (novo `metodologia-revisao-v3.js`; `metodologia-pacote.js`, `metodologia-homologacao.js`, `questionario.js`, `holoscan-oficial.js`, `ficha.js`, `panorama.js`, `index.html`); antes, nas correcoes da jornada 12/10 (`app.js`, `arquivos.js`, `conduta.js`, `dashboard.js`, `ficha.js`, `formulario.js`, `holos-ai.js`, `index.html`, `proximos-passos.js`, `resultado-holos.js`, `resultado-sintese.js`, `anamnese.js`, `style.css`, `evolucao.js`, `ajuda.js`, `laboratorio.js`, `metodologia-homologacao.js`, `metodologia-decisoes-v1.js`); antes, no teste de ponta a ponta 10/10 (`style.css`: texto legivel nos cartoes dos Proximos Passos); antes, na Administracao 10/10 (`contas.js`, `login.js`, `app.js`, `index.html`, `style.css`); antes, no Resultado Final HOLOS 10/10 (novo `ferramentas-fechamento.js`; `resultado-sintese.js`, `resultado-holos.js`, `resultado-pagina.js`, `index.html`, `style.css`); antes, nas boas-vindas 09/10 (novo `boas-vindas.js`; `login.js`, `perfil.js`, `index.html`, `style.css`); antes, no Resultado + anamnese pre-consulta 09/10 (novos `anamnese.html`, `anamnese-publica.js`, `anamnese-convite.js`, `resultado-sintese.js`; `anamnese.js`, `anamnese-v2.js`, `resultado-holos.js`, `index.html`, `style.css`); antes, na conta pendente = somente Perfil 09/10 (`login.js`, `perfil.js`, `app.js`, `index.html`, `style.css`); antes, nos Proximos Passos HOLOS 09/10 (novo `proximos-passos.js`; `app.js`, `index.html`, `style.css`); antes, no prontuario 09/10 (exame e documento sao so arquivos: novo `resultado-pagina.js`; `documentos.js` removido — a secao global Documentos saiu do menu; `arquivos.js`, `arquivo-store.js`, `app.js`, `ficha.js`, `conduta.js`, `relatorios.js`, `evolucao.js`, `timeline.js`, `panorama.js`, `sincronizacao.js`, `migracao-supa.js`, `holos-ai.js`, `dashboard.js`, `ajuda.js`, `demo.js`, `documentos.js`, `index.html`, `style.css`; os arquivos `laboratorio-*.js` e `leitura-integrada-*.js` continuam copiados pelo `Dockerfile` mas nao sao mais carregados pelo `index.html`); antes, na correcao do Perfil (`perfil.js`, `style.css`); antes, na correcao das ferramentas (`formulario.js`, `ferramentas.js`, `app.js`, `index.html`, `style.css`); antes, na correcao da Leitura Integrada (`laboratorio.js`, `arquivos.js`, `agenda.js`, `app.js`, `index.html`, `style.css`); antes, na correcao do HOLOSCAN (`app.js`, `questionario.js`, `consultas.js`, `metodologia-inventario.js`, `index.html`, `style.css`); antes, na correcao da Agenda (`agenda.js`, `atendimento.js`, `app.js`, `ficha.js`, `style.css`); antes, na correcao de Pacientes/Atendimentos (`app.js`, `consultas.js`, `panorama.js`, `metodologia.js`, `questionario.js`, `index.html`, `style.css`); antes, na correcao do dashboard (`dashboard.js`, `agenda.js`, `app.js`, `panorama.js`, `sincronizacao.js`, `index.html`, `style.css`); antes, na troca do logo (pinha dourada: novo `logo-holohacking.png`; `favicon.svg`, `index.html`, `style.css`, `demo.js`); antes, na correcao pos-6.5 (leitura oficial do HOLOSCAN so com textos do pacote; rotulo neutro; textos e acentos: `app.js`, `formulario.js`, `ferramentas.js`, `index.html`); antes, Etapa 6.5 B da V1 (registros clinicos com IDs novos `*_v1`: novo `ferramentas-registro.js`; `ferramentas.js`, `formulario.js`, `panorama.js`, `migracao-supa.js`, `style.css`, `index.html`); antes, Etapa 6.5 (correcao P0: novo `holoscan-oficial.js`; `questionario.js`, `app.js`, `metodologia.js`, `utils.js`, `migracao-supa.js`, `sincronizacao.js`, `ficha.js`, `arquivos.js`, `consultas.js`, `dashboard.js`, `evolucao.js`, `timeline.js`, `panorama.js`, `laboratorio.js`, `metodologia-inventario.js`, `index.html`); antes, Etapa 6.0 da V1 (branch `claude/v1-etapa6-implementacao-li-local`: `laboratorio.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js`, `style.css` e o novo `leitura-integrada-pacote-v1.js`; antes, Etapa 5.3: `metodologia-homologacao.js` e `dados-router.js`; Etapa 5: inclui `laboratorio-catalogo.js`, `laboratorio-motor.js`, `leitura-integrada-motor.js` e `laboratorio.js`; antes, Etapa 4.2: `metodologia-decisoes-v1.js` e `questionario.js`; Etapa 4:
inclui `metodologia.js`, `atendimento.js`, `anamnese.js`, `conduta.js`, `timeline.js`, `relatorios.js`, `metodologia-inventario.js`, `metodologia-pacote.js`, `metodologia-motor.js` e `metodologia-homologacao.js`), conferidos contra a imagem do `docker build` da branch (o nginx ainda põe o
`50x.html` dele, que não é nosso):

```
7860c1ce16222dac59f6b677d169b9cd735d21348e3f469c5f3baf9e9f659787  agenda.js
a1522daaacfef947daabc101e6fe14f386567269dcc5172301091f30edce6c5d  ajuda-ferramentas.js
bccb904ac5708e222825a814a52a7c2eb91a1adcdfb43e70fe6c6ab8ea2780b9  ajuda.js
e3198e2a7a0d9b880d633f158c734ccd1d8d0efaeb4d5198ae6ccea2ff5f1d3b  anamnese-convite.js
4d9b98f560097eff23aea2f22a971d0c8672c4a971f826e67cb8af4b09b9efb5  anamnese-publica.js
bb8ef18b4059d51ad3114b4f656534ab75e10a36c387da5a066a4e994d0260f3  anamnese-v2.js
4e413e925d1aa364b31fd333196419b27ef62a8841e97c15ffae14d4934fd271  anamnese.html
164e9ffa364fce1a4d8d30fd1961189bc8dbc0ab9a2f7970b7d68b2f21963a57  anamnese.js
b1ea48449d74ba8427c7a59947ae73d55a4d88896ea1fcf4f9823dc4087bd049  aplicacoes.js
03972466f21772fe2630c011a152b477b8abed89fca41a94f2bb7a113ba59f1f  app.js
d3efacba60b26bc2da2311a273881948882570773e4016f59ce2a0845661746c  armazenamento.js
a22e47d0dae6f7b0b9161788b33c3be1717dabc23a1627ad7f1daa78ca6d2793  arquivo-store.js
f0724f5bbd2d01b80290e26b536f0e0b6ff59a0ac83ba6130e81c303af4cdf4a  arquivos.js
36b14d31a5254467fed88f677fd4b8fb66f24c44159158dad8e519c50ea51e21  atendimento.js
d91a1c66de10450919e3325443d2bdd554f8ddfec78f766295c93d49acc05f65  boas-vindas.js
410b78815fa33df41eeadd22c8f3dbfb5b5bfeecaf89784fb2d35a590474cdb7  caso-marina.js
e66cd4b4cd1163cce5680b8d2b56b820c44c1cf430ed413d8de2fe7766112a14  concorrencia.js
4a1734569410b9169cb1d28fdd1745323535192776c6cfa2c6e776de23566b86  conduta.js
35d997b3cb66a7f448de08f4a279b75152a58cbbca17a58b7fc1d9bfb3dc7834  consultas.js
9f3eebfe28981ef6af3d7f5a34f606b92de2d421950121ec914cf1ee60ace612  contas.js
25ffbc8bf45aec67e9214f403c5a1ffd297f183eaa664f53cebdb7d92e9c50f9  corpo-bancos.js
8f715a12540bc58c932997419f2272bab1e53d66e101929818e81b3d7524c6b6  dados-router.js
a77e7bf6acab37680d25eb5451442539bda71a84c6e921940a6065b9b9a3b806  dados.js
03dc8adbb80c6e1a58308fc906c5fe64ede9b3fc57868b1c21fd3f4ecba9a841  dashboard.js
6dc4dc4a868ff3a1b8fdc913a18749ca7090bf9dfa95e3c49a07bcf7d5cc7010  demo.js
9ae9343a3797dea93f881fdaed932cee1224a6d7968106205944807fa01ca7fc  evolucao.js
11e08342911df7f528993946a7e07746a9c26f66657eb0d139e746ade32e161f  excluir-paciente.js
ccab4b8d1492eab5ef40def11944fbc8612ff8d4bf26b36548f5641caaa54044  favicon.svg
a2eabd25492ea1091971c69278c0a6059ac8683029bd434412252badf302d678  ferramentas-fechamento.js
26c0d88be292ba4f6b688c61c4ae41e68772233b2be5b5e0c24f3be717e2f4eb  ferramentas-registro.js
5d13449fab23dc384497a893f0f2e5c2870d33635641f215149ba0f941b8259e  ferramentas.js
d57afcabf26e98334b0e93cf8808e1f595516095f8d5d1645dc1dd1ef74c77d0  ficha.js
d1c8a414d1cbbab41c062a4ba3b5b1d350166088ed8738e520f9b6e905c3ecf7  formulario.js
8d373ddb9bb1f1b44f1b6a873736d7c89e1697366458d0665175793280e1cc42  holos-ai-contrato.js
1ad644ad4ce3d1b2884a0b2a0da6144a4f4750185e16e67373d2a2779df215bd  holos-ai-ponte.js
296dd0ad3e1837639a96b22ec374b23147b0257fc7c37024a683506147b26b67  holos-ai.js
8174ebfc6672fd787e6baa9f2c749f1c61119f1d73d49f6fdcfe7d43854802b6  holoscan-oficial.js
b6c7e8b1341a10bf45c2f895218e5529176b9c36aa035be6a2aa1ed0fb41cfac  holoscan.js
b2705ac28dc9f6175ec5586ef02e86b00f2fe1265dbb23a34e3bb2cebb8718c3  importar-v1.js
5256e534a8af00c25f9ddcef64561ccafe185ad22322d386cfbe096541e4e9c0  index.html
66b6752b882d5cca5f666545b37db0dfed8c9e6ab8506189ba88bca88975f14a  laboratorio-catalogo.js
8ad2d6789fdc62fe83f2c9cc85acbf03e481ed40f3dc72575b20bc8eb0b2acbc  laboratorio-motor.js
58f831e43b3cfbc0ce0b9b4d227f5c9ff96ca161950408a1597f2fe4ea89e125  laboratorio.js
dc4e712db79263b6790346edb32e7ffc7c331911b2a2ef17d26b41e3cc389299  leitura-integrada-motor.js
994217cb6cc4208b15fe4d4a9197efd0518c400d68aa0b2f24a6b9a017d2e118  leitura-integrada-pacote-v1.js
bb13cc67d8c6ba0db8f0a4dcc92efe83a477c90b809a6ec889d71c8e9bae6026  login.js
ebb3b78b5a3777a2c5df2ff03ff1c532a82e1668bccadc885ebe679e8321a0b3  logo-holohacking.png
596000e2cf75ca5f713bd6d7a68599189422142cbd8a600bbd7f089769ce21b2  mapeamento-holistico.js
deefdf358d21011b1e0479acccbb47338035cfa5282c5fabe652c88a11ae52a7  metodologia-decisoes-v1.js
34241cadaa88ed07d47492ac681d31491f208e8e1790f78ea4449d3c573bfb15  metodologia-homologacao.js
0d8ddbd3ab22d08460009f4ea703c902bec4ea65e3d52a42be8e020343cacdb0  metodologia-inventario.js
ae87ad9c758f4ccf14cbb0404db8538b8705f4069049c4b002140ef1ec109bd8  metodologia-motor.js
b13dc7031ead03476e8221db94c3a23a2ef240fb9cdf2fa743d045be0b52079e  metodologia-pacote.js
9a5ba800e2446b294b812c74bf6557354fe3ddfe9e0ccb4d55984d3d05379b48  metodologia-revisao-v3.js
21e3cbb02d64b92fe35bfe664ebc2eac2cf645d11344668a4e8eb79e92133292  metodologia.js
7f4aa281060e7fcc194a1414d148c8aa10c4cebf23413a6807d3f42e5326fff2  migracao-supa.js
ae4c0461c810cb199de57885192fdd61392e95fb574c1eb8a143ce036c04538c  panorama.js
1e2c9c3bd1378346220e504b2f5cab5b46e23b5b7848ba9ab842637f91c09543  perfil.js
a8387a447381c54fff4d6a5bb0dcf2d974938674324228ef8120d6174557deeb  conexao-ia.js
8b5cb7bf4e0c4232719785bb3197f0909d171f96c84aef4852d7d6a315a7ec3e  playbook-holos.js
3dfffb773e3516d55ca606b2738b77a474275b7392b206baab827ad4027522cf  proximos-passos.js
e8e4288ff2a365495339ffe12fabf2971387db2e9a623dd492833b02862851d7  questionario.js
010aa193d55030aabd2cb511022fb018765eace03d921ecacc884d1c3e04e2f8  relatorios.js
8849e59a1d3fe76723aa1e59cc75213fc64172259c5bccd6d9b1151f21a9fb63  render-resultado.js
23520f5f414deb288f083d0a08389a1c96d1ec918c50fb95d44c3b8b36758e8c  restaurar-backup.js
2848d87ee9677b5327939694c6461d4f2eee0b11ec5cf44462d52c3a07f0964a  resultado-corpo.js
61aface27ec16ebd10cde05f3f0c5c6c89791044ebf6ce7e4797bc030cb146e9  resultado-direcao.js
7b11823fbac34092c3fb58adf3e085d2303e4575faec8183595b2c83730e6366  resultado-holos.js
136d4aa2b204a3a791c432a3061b2abaf1f955cafe4eb036820ae9bfc89b04ac  resultado-legado-r3.js
affb2c4f9c23bf3997ce92eea203dc9c9e8163e556b9d13ba1a59e9b97dad167  resultado-pagina.js
4c088623edd51e330a560c0022b226732a9a65649c3c459e4e71e48b95f855e8  resultado-playbook.js
24b2ac521cb8e59c543c6c6d60dc5dd38e09e9835e5a9fe8c0763c2595986406  resultado-sintese.js
2da5d29945a1f58cd9be4f9f3dcae01f879702ed2c841e860263a9576d7f1e8d  sincronizacao.js
f370c768274ee1e6c1a4fa70a732b5c67d3b748ddc8115bd40518ab6353ee6a8  sistemas-fechamento.js
cfc3e1f1edc880c04cca1b925524adbf22b28019796c76c8abdc046b1e42e2fd  style.css
bf22f70f68faacb4d4de62cd1e6265a21166f212f158fba09ee589f7b9e16e14  supabase-client.js
3d468040a16811adfa058aab6e57102c63472cd0f8c6932ff27c7f4591977043  timeline.js
df0516a6fb71a65596fb279d3efd095f51766873ca14cc62a1d5fea4684071f9  utils.js
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
