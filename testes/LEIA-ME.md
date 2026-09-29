# Testes do app

Rodam o app num Chrome de verdade, e **nao tocam em banco nenhum**: sem
sessao Supabase a persistencia e `dados.js`, que guarda no navegador; as
suites que exercitam o caminho autenticado usam um Supabase simulado dentro
da pagina. Cada rodada sobe um perfil limpo do Chrome, entao os testes
comecam sempre do zero e nao deixam nada para tras. `testar-app` roda
isolado, em jsdom.

## Comando canonico (release)

    npm ci
    npm run test:release        (identico a: npm run teste)

`testes/rodar.mjs` sobe um servidor estatico temporario em
`127.0.0.1:5500`, roda todas as suites de `testes/suites.mjs` em processos
separados, derruba o servidor e sai com exit 1 se qualquer suite:

  - terminou com exit != 0, ou
  - imprimiu alguma linha `FALHA`, ou
  - nao imprimiu nenhuma assercao `ok`.

Toda `testar-*.mjs` importa `guarda-falhas.mjs`, que forca exit 1 quando a
suite imprimiu `FALHA` — mesmo rodando a suite sozinha, fora do runner.
`testar-guarda-falhas.mjs` prova isso a cada rodada. Suite nova precisa
entrar em `suites.mjs`; o runner recusa arquivo `testar-*.mjs` fora da lista.

Opcoes: `--so <trecho-do-nome>`, `--verboso`, `--servidor-existente`
(nao sobe servidor; use so se a 5500 ja serve ESTE repositorio). A saida de
cada suite fica em `testes/.saida/` (ignorado pelo git).

O Chrome usado e `CHROME_PATH` ou, por padrao,
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

## Rodar uma suite solta

Com um servidor estatico na 5500 (`npx serve -l 5500 .`):


    node testes/testar-app.mjs           navegacao, as 30 ferramentas, salvar
    node testes/testar-dashboard.mjs     o trabalho de hoje, e nao a apresentacao
    node testes/testar-paciente.mjs      dois pacientes nao se sobrescrevem
    node testes/testar-troca-paciente.mjs  a tela nao mistura dois pacientes
    node testes/testar-dados.mjs         o app inteiro funciona sem rede
    node testes/testar-motor.mjs         o motor numa pagina em branco
    node testes/testar-integrado.mjs     o motor dentro da tela do HOLOSCAN
    node testes/testar-questionario.mjs  as 84 perguntas ate o mapa
    node testes/testar-cruzamento.mjs    exame e ferramenta chegam ao motor
    node testes/testar-triada.mjs        a Triada aparece e some na hora certa
    node testes/testar-frequencias.mjs   o Mapa de Frequencias, hoje em construcao
    node testes/testar-raciocinio.mjs    aprofundar, hipotese, encaminhar, territorios
    node testes/testar-fronteira.mjs     avaliacao nutricional, nao diagnostico medico

O caso de exemplo (caso.json) e ficticio e vem do repositorio do motor.
