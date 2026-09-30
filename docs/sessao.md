# Sessão, logout e o que fica no navegador (rodada 08)

## Ao sair da conta

1. **Tela**: todo campo digitável do app volta vazio, e todo conteúdo
   desenhado com dado de paciente é esvaziado (lista, ficha, abas,
   ferramentas, HOLOSCAN, agenda, consultas, documentos, seletores de
   paciente). A tela de entrada cobre o app, e por baixo não sobra nome nem
   texto clínico (`limparTelaClinica` em `app.js`; teste
   `testar-rodada08-sessao.mjs`).
2. **Memória**: pacientes, agenda, aplicações, coletas e edição não salva
   da conta que saiu são esquecidos.
3. **localStorage**: as caixas clínicas de trabalho (lista em
   `CHAVES_CLINICAS`, `login.js`) saem das chaves principais e vão para o
   stash **da própria conta**: `holohacking._stash.<uid>.<chave>`. Outra
   conta que entrar no mesmo navegador não lê esse stash; a mesma conta, ao
   voltar, recupera a cópia de trabalho dela.

## O que continua no navegador depois do logout

| Chave | O que é | Clínico? |
|---|---|---|
| `holohacking._stash.<uid>.*` | cópia de trabalho da conta que saiu (respostas em andamento, pontuação, exames locais, sincronização) | **sim** — isolado por uid |
| `holohacking.aparencia` | tema claro/escuro | não |
| `holohacking.revisao`, `holohacking.operacao*` | controle entre abas e recuperação de operação interrompida | não (a recuperação guarda cópia só durante a operação) |
| `holohacking.migrado_supa*`, `holohacking.pqq.migrado` | marcadores de migração já feita | não |
| IndexedDB `holohacking-arquivos` | cópias locais de documentos, filtradas por uid | **sim** — isolado por uid |
| `sb-*-auth-token` | sessão do Supabase | removido pelo próprio Supabase no logout |

Com conta, o dado clínico de verdade está no servidor; o stash é só a
cópia de trabalho deste navegador. Em computador compartilhado, além de
sair da conta, limpe os dados do site nas configurações do navegador.

## Concorrência entre abas

Editar o cadastro envia só os campos que mudaram e, com conta, só grava se
o cadastro ainda estiver na versão que foi aberta (`updated_at`). Se outra
aba ou aparelho salvou antes, nada é gravado e a tela pede para reabrir a
ficha. Ferramentas gravam só os campos da própria ação (respostas,
conclusão, leitura), e a gravação só vale depois que o servidor confirma.
