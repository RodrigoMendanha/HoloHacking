# Roteiro do Rodrigo — uma página

Quatro passos, nesta ordem. Em cada um está escrito o que você deve ver.
Se aparecer outra coisa, **pare**, anote a hora e mande o que apareceu na
tela (sem senha, sem chave e sem nome de paciente).

Detalhes, se precisar: `docs/deploy.md` (deploy) e `RELEASE-STATE.md` §11
e §12 (testes).

---

## 1. Colocar a `main` no ar (VPS da Hostinger, Docker e Caddy)

Entre na VPS por SSH. Os nomes entre `< >` são da sua VPS. Se ainda não sabe
quais são, o primeiro comando mostra.

**1.1 Ver como está hoje**

```sh
docker ps --format '{{.Names}}\t{{.Image}}\t{{.Ports}}'
```

Você vê uma linha por container. O do app usa uma imagem `holohacking:...`
ou `nginx`. Anote o nome dele (`<CONTAINER>`) e a porta da esquerda em
`0.0.0.0:<PORTA>->80/tcp`. O Caddy não muda.

**1.2 Trazer o código**

```sh
cd <DIR>                      # a pasta do repositório na VPS
git fetch origin
git checkout main && git pull --ff-only
git log --oneline -1
```

Você vê uma linha que começa pelo commit do merge mais recente da `main`
(a de 30-set ou depois).

**1.3 Construir e trocar o container**

```sh
docker build -t holohacking:$(git rev-parse --short HEAD) .
docker stop <CONTAINER> && docker rename <CONTAINER> <CONTAINER>-anterior
docker run -d --name <CONTAINER> --restart unless-stopped -p <PORTA>:80 \
  holohacking:$(git rev-parse --short HEAD)
```

O `build` termina sem `ERROR`. O `run` imprime um código comprido (o id do
container novo). Se o projeto usa `docker compose`, troque os três comandos
por `docker compose build && docker compose up -d`, na pasta do
`docker-compose.yml`.

Para voltar atrás, se algo der errado:

```sh
docker rm -f <CONTAINER> && docker rename <CONTAINER>-anterior <CONTAINER> && docker start <CONTAINER>
```

## 2. Conferir o que está no ar, num comando só

Ainda na pasta do repositório (na VPS ou no seu computador):

```sh
sh scripts/conferir-producao.sh
```

Você tem de ver:

```
Conferindo 38 arquivos em https://holohacking.com.br
OK: 38 de 38 arquivos batem com docs/deploy.md §3.5
```

Se aparecer `DIFEREM:`, o ar não é a `main`. A lista diz quais arquivos.
"voltou o index.html" quer dizer que o arquivo nem existe no ar: o deploy
não pegou o código novo. Refaça o passo 1.

Para conferir só o container, antes de passar pelo Caddy:
`sh scripts/conferir-producao.sh http://127.0.0.1:<PORTA>`.

Depois do OK, no navegador de quem usa o app, abra
https://holohacking.com.br e aperte **Ctrl+Shift+R** uma vez (no celular,
feche e abra a aba).

## 3. Criar a segunda nutricionista (RELEASE-STATE §11.1)

1. Entre em supabase.com, no projeto do HoloHacking.
2. Menu da esquerda: **Authentication** → **Users**.
3. **Add user** → **Create new user**.
4. Preencha o e-mail dela e uma senha provisória. Marque **Auto Confirm
   User**. Clique em **Create user**.
5. Você vê a conta nova na lista **Users**, já confirmada.
6. Mande a senha provisória a ela por ligação ou mensagem direta. Nunca por
   arquivo, grupo ou e-mail coletivo.

O perfil dela nasce sozinho. Não precisa fazer mais nada no banco.

## 4. Os testes

### 4.1 Do aparelho A para o aparelho B (RELEASE-STATE §11.2)

Cada nutricionista faz na **própria conta**, com um paciente **de teste**
(nome inventado).

**Aparelho A** (por exemplo, o computador):

1. Entre na conta. Você vê o **Dashboard**.
2. **Pacientes** → **Novo paciente** → só o **Nome** → **Salvar paciente**.
   Você vê "<primeiro nome> cadastrado com sucesso." e a ficha abre.
3. **Aplicar HOLOSCAN** → **Aplicar questionário — 84 perguntas** →
   responda → **Gerar o mapa** → **Salvar HOLOSCAN**. Você vê "HOLOSCAN
   salvo na ficha de <primeiro nome>. Score: <n>". Anote o score.
   - Não use os controles deslizantes: eles avisam "Salvo só neste
     aparelho…" e o teste não vale.
4. Na ficha, **Registrar exames**. No cartão **Os valores do exame**:
   - **Conferir com o mapa** sem data: você vê "Informe a data da coleta
     para registrar os exames.";
   - escolha uma **Data da coleta** passada (não hoje), digite 2 ou 3
     valores e clique em **Conferir com o mapa**. Não aparece mensagem
     nenhuma, e o aviso do campo some. Anote a data e os valores.

**Aparelho B** (por exemplo, o celular), mesma conta:

1. **Pacientes** → o paciente de teste. Espere uns segundos.
2. Aba **Visão geral**: você vê "N valores registrados." (o N que você
   digitou) e, na **Linha do tempo**, "Coleta de exames" **na data anotada**.
3. Aba **HOLOSCAN**: você vê o índice igual ao score anotado e, em
   **Histórico de coletas**, uma linha com a data anotada.

Se em qualquer passo aparecer "…não foi possível sincronizá-los…", "Exames
salvos só neste dispositivo…" ou "Não foi possível carregar…", o teste
falhou: anote a hora e avise.

**Pronto** quando os passos 1 e 2 derem OK, e as duas nutricionistas
passarem o 4.1, cada uma na própria conta.
