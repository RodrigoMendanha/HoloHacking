# Homologação V1 — decisões necessárias

Resumo do `PACOTE-DECISAO-HUMANA-V1.md`. Nenhuma opção é recomendada. Todos os valores atuais foram recuperados dos arquivos do projeto e estão **pendentes de homologação**. Enquanto um bloqueio estiver aberto, o HOLOSCAN coleta respostas e mostra cobertura, mas não mostra resultado oficial.

## Bloqueio 1 — Edição oficial das 84 perguntas
Pergunta: As 84 perguntas (49 físicas, 19 mentais-emocionais, 16 espirituais) são a edição oficial V1, com estes enunciados?
Valor atual: 84 IDs recuperados de `motor/bancos/*.csv`, nenhum aprovado.
Decisão necessária: aprovar, editar ou remover cada pergunta e fechar a lista oficial.

## Bloqueio 2 — Escalas e rótulos
Pergunta: Qual escala vale para cada pergunta e que número cada rótulo recebe?
Valor atual: frequência (Nunca/Às vezes/Frequente/Sempre) em 73 itens; intensidade (Nada/Um pouco/Bastante/Muito) em 11 itens.
Decisão necessária: confirmar escalas, rótulos e valores numéricos.

## Bloqueio 3 — Inversões
Pergunta: Quais perguntas têm pontuação invertida (resposta "boa" = nota alta)?
Valor atual: 9 invertidas: SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501.
Decisão necessária: confirmar, retirar ou acrescentar inversões, item a item.

## Bloqueio 4 — Associações aos cinco sistemas
Pergunta: Cada pergunta soma em quais sistemas, como primária ou secundária?
Valor atual: 95 associações a sistemas (86 primárias + 9 secundárias, todas de EMO) + 84 vínculos de Tríada = 179.
Decisão necessária: aprovar a tabela de vínculos pergunta → sistema.

## Bloqueio 5 — SNT-101
Pergunta: "Você sente vontade forte de doce ou pão quase todo dia?" soma em quais sistemas e com que peso?
Valor atual: Sistema Fúngico peso 2 **e** Sistema Metabólico peso 3, ambas registradas como primárias; Tríada físico peso 2.
Decisão necessária: escolher um sistema, os dois (definindo primária/secundária e pesos) ou outra configuração.

## Bloqueio 6 — SNT-501
Pergunta: "Você acorda cansado mesmo dormindo as horas necessárias?" soma em quais sistemas e com que peso?
Valor atual: Sistema Metabólico peso 2 **e** Sistema Mental-Emocional-Espiritual peso 3, ambas registradas como primárias; Tríada físico peso 2.
Decisão necessária: escolher um sistema, os dois (definindo primária/secundária e pesos) ou outra configuração.

## Bloqueio 7 — Pesos
Pergunta: Que peso cada associação recebe?
Valor atual: peso 1 ×3, peso 2 ×44, peso 3 ×48; nenhum peso tem origem documentada.
Decisão necessária: aprovar ou redefinir os pesos de cada associação.

## Bloqueio 8 — Parcialidade e cobertura
Pergunta: Como calcular a nota quando faltam respostas, e a partir de quanta cobertura um sistema mostra resultado?
Valor atual: nenhuma política. Exemplo: 10 itens, 2 respondidos com 3 → nota 0,0 ou 8,0 conforme o denominador.
Decisão necessária: definir denominador, cobertura mínima (sem corte pré-definido) e tratamento de "recusou"/"não se aplica".

## Bloqueio 9 — Faixas
Pergunta: As faixas baixo/médio/alto e seus limites valem clinicamente?
Valor atual: 15 faixas, iguais nos 5 sistemas: baixo 0–3, médio (3–6], alto (6–10]. Sem buraco nem sobreposição = **validação técnica**, não homologação clínica.
Decisão necessária: aprovar limites e mensagens por sistema.

## Bloqueio 10 — Índice HOLOS
Pergunta: Como o Índice é calculado?
Valor atual: **RECUPERADO / NÃO HOMOLOGADO**: 0,20 por sistema, renormalização, elegível com 1 sistema respondido, escala 0–100, sem casas decimais.
Decisão necessária: aprovar ou redefinir pesos, elegibilidade e escala.

## Bloqueio 11 — Tríada
Pergunta: Como a Tríada (físico/mental-emocional/espiritual) é calculada?
Valor atual: existe vínculo derivado do bloco de cada pergunta (84); nada foi aprovado (regra, pesos, faixas, texto).
Decisão necessária: aprovar a regra da Tríada ou declarar que não entra na V1.

## Bloqueio 12 — Comparabilidade
Pergunta: Quando duas aplicações podem ser comparadas?
Valor atual: sem regra aprovada.
Decisão necessária: definir se comparação exige mesma versão do pacote e mesma cobertura.

## Bloqueio 13 — Nomenclatura e textos
Pergunta: Qual é a grafia oficial dos 5 sistemas e quais textos descrevem cada um?
Valor atual: o código e o Documento Mestre diferem em 3 nomes (ex.: "Detox + Linfático" × "Detox e Linfático").
Decisão necessária: fixar nomes e textos oficiais.

## Bloqueio 14 — Caso de referência
Pergunta: Qual conjunto de respostas, com resultado esperado conferido por humano, serve de caso de referência?
Valor atual: exemplo sem resultado esperado (validador aponta `exemplo_sem_resultado`).
Decisão necessária: fornecer respostas + resultado esperado aprovado.

## Bloqueio 15 — Combinações e sugestões (CMB, REC, SEL)
Pergunta: As 16 combinações, 23 sugestões e a regra de seleção entram na V1?
Valor atual: REC-001..015 legado não validado; REC-016..023 rascunho; SEL-001 2/1/sem limite/máx. 4.
Decisão necessária: aprovar, editar ou excluir da V1.
