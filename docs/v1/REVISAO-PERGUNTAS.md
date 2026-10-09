# Revisão das perguntas do HOLOSCAN (página pública)

Pedido de 09/10: uma página simples para o revisor marcar, em cada uma das 84 perguntas do HOLOS-V1 v2, **Aprovar**, **Negar** ou **Editar**. Não tem login nem código.

## Endereço
`https://holohacking.com.br/aprovacoes.html`

A página é separada do app: não usa a tela de login nem lê nenhum dado clínico.

## Como funciona
- As perguntas aparecem agrupadas pelos 5 sistemas, com número, código e escala de respostas.
- **Aprovar** grava na hora.
- **Negar** grava na hora e abre um campo opcional para o motivo.
- **Editar** abre um campo com o texto atual para ele reescrever, mais um comentário opcional. Grava ao clicar em "Salvar edição".
- **Desfazer** volta a pergunta para pendente.
- Há também o botão "Aprovar as pendentes deste sistema", que pede confirmação na própria página.
- O topo mostra o progresso ("37 de 84") e tem o filtro "Só pendentes".
- **Concluir revisão** só funciona com todas as perguntas decididas. Antes de concluir, a página mostra o resumo do que foi negado e editado. Depois de concluir, tudo fica só para leitura.

## Dados (migration `20261010100000_revisao_perguntas.sql`)
- `revisoes_perguntas`: a rodada de revisão, com o pacote, o prazo (`expira_em`) e o estado (aberta, concluída ou cancelada). Só pode haver uma rodada aberta por vez.
- `revisoes_perguntas_itens`: as perguntas, copiadas do pacote aprovado no momento da abertura (texto, sistema principal e escala).
- `revisoes_perguntas_respostas`: o **histórico**. Cada decisão é um registro novo e vale a última de cada pergunta. Nada é alterado nem apagado, nem pelo dono do banco.
- As tabelas não têm acesso direto pela API: RLS ligada, sem política e com `revoke`.
- A página usa só 3 funções, liberadas também para quem não tem login:
  - `revisao_perguntas_ler()`;
  - `revisao_perguntas_registrar(id, decisao, texto, comentario)`;
  - `revisao_perguntas_concluir(nome)`.
- Recusas das funções: fora do prazo, depois de concluída, decisão inválida, pergunta que não pertence à revisão, edição sem texto, texto acima de 1000 caracteres e mais de 5000 registros por revisão.
- `revisao_perguntas_abrir(code, version, dias)` abre uma rodada. Só o dono do banco pode chamá-la, pelo SQL Editor.

**O pacote oficial não muda.** A revisão é um parecer. Uma versão nova (HOLOS-V1 v3) passa pela homologação oficial.

## Aplicar (quando autorizado)
Rode `supabase/REVISAO-PERGUNTAS-PARTE1.sql`, `PARTE2` e `PARTE3` no SQL Editor, na ordem e cada parte inteira.

A PARTE 3 abre a revisão com prazo de 15 dias e termina mostrando uma tabela de conferência. O resultado esperado é:
- revisão aberta: 1;
- perguntas: 84;
- decisões registradas: 0;
- migration registrada: 1.

Depois, faça o deploy do front, que inclui `aprovacoes.html` e `aprovacoes.js`.

## Ler o resultado
Leitura só pelo banco: a última decisão de cada pergunta, mais o motivo, o texto sugerido e o comentário.

Para cancelar uma rodada, rode:
```sql
update public.revisoes_perguntas set status = 'cancelada' where status = 'aberta';
```

## Provas
- **`supabase/tests/revisao-perguntas-harness.sql`**: V01 a V12 no Postgres local, dentro de `scripts/validar-cadeia-local.sh`.
- **`testes/testar-aprovacoes.mjs`**: 19 asserções na tela, com o servidor falso:
  - abre sem login;
  - aprovar, negar e editar;
  - edição vazia recusada, desfazer e aprovação em lote;
  - recarregar mantém as decisões, e o filtro funciona;
  - concluir só com tudo decidido;
  - prazo vencido fica só leitura;
  - texto com HTML não executa;
  - celular sem rolagem lateral;
  - nenhuma tabela é lida.
