# Homologação V1 — decisões necessárias

> **DECISÕES METODOLÓGICAS V1 FECHADAS (Etapa 4.2).** Cada bloqueio abaixo traz a decisão tomada em "Decidido". Detalhe: `PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`.
> **PUBLICAÇÃO TÉCNICA PENDENTE DE VALIDAÇÃO NO BANCO REAL.**

Resumo do `PACOTE-DECISAO-HUMANA-V1.md`. "Valor atual" é o que foi recuperado dos arquivos antes da decisão (registro histórico). Até a publicação técnica do pacote, o HOLOSCAN coleta respostas e mostra cobertura, mas não mostra resultado oficial.

## Bloqueio 1 — Edição oficial das 84 perguntas
Pergunta: As 84 perguntas (49 físicas, 19 mentais-emocionais, 16 espirituais) são a edição oficial V1, com estes enunciados?
Valor atual: 84 IDs recuperados de `motor/bancos/*.csv`, nenhum aprovado.
Decisão necessária: aprovar, editar ou remover cada pergunta e fechar a lista oficial.
Decidido: Edição V1 com 84 perguntas (49/19/16); EMO-506 fora; SNT-101 e SNT-501 com ID único; SNT-302, SNT-310 e EMO-506 não são recriadas. Contexto temporal por item (7 valores permitidos).

## Bloqueio 2 — Escalas e rótulos
Pergunta: Qual escala vale para cada pergunta e que número cada rótulo recebe?
Valor atual: frequência (Nunca/Às vezes/Frequente/Sempre) em 73 itens; intensidade (Nada/Um pouco/Bastante/Muito) em 11 itens.
Decisão necessária: confirmar escalas, rótulos e valores numéricos.
Decidido: Escalas 0–3: frequência (Nunca/Às vezes/Frequente/Sempre) e intensidade (Nada/Um pouco/Bastante/Muito); atribuição do Anexo A mantida (73/11); escala desconhecida é erro.

## Bloqueio 3 — Inversões
Pergunta: Quais perguntas têm pontuação invertida (resposta "boa" = nota alta)?
Valor atual: 9 invertidas: SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501.
Decisão necessária: confirmar, retirar ou acrescentar inversões, item a item.
Decidido: 9 invertidas (SNT-507, EMO-507, ESP-101, ESP-102, ESP-201, ESP-202, ESP-301, ESP-302, ESP-501); 75 diretas; z = resposta ou 3 − resposta; orientação ausente é erro.

## Bloqueio 4 — Associações aos cinco sistemas
Pergunta: Cada pergunta soma em quais sistemas, como primária ou secundária?
Valor atual: 95 associações a sistemas (86 primárias + 9 secundárias, todas de EMO) + 84 vínculos de Tríada = 179.
Decisão necessária: aprovar a tabela de vínculos pergunta → sistema.
Decidido: Exatamente um sistema primário pontuável por pergunta; as 9 secundárias recuperadas ficam como secondary_contextual, sem contribuição numérica.

## Bloqueio 5 — SNT-101
Pergunta: "Você sente vontade forte de doce ou pão quase todo dia?" soma em quais sistemas e com que peso?
Valor atual: Sistema Fúngico peso 2 **e** Sistema Metabólico peso 3, ambas registradas como primárias; Tríada físico peso 2.
Decisão necessária: escolher um sistema, os dois (definindo primária/secundária e pesos) ou outra configuração.
Decidido: Primário pontuável: Sistema Fúngico, peso 1; Metabólico = secondary_contextual (linha histórica SNT-302); Tríada físico peso 1; ultimos_30_dias.

## Bloqueio 6 — SNT-501
Pergunta: "Você acorda cansado mesmo dormindo as horas necessárias?" soma em quais sistemas e com que peso?
Valor atual: Sistema Metabólico peso 2 **e** Sistema Mental-Emocional-Espiritual peso 3, ambas registradas como primárias; Tríada físico peso 2.
Decisão necessária: escolher um sistema, os dois (definindo primária/secundária e pesos) ou outra configuração.
Decidido: Primário pontuável: Sistema Mental Emocional Espiritual, peso 1; Metabólico = secondary_contextual (linha histórica SNT-310); Tríada físico peso 1; ultimos_30_dias.

## Bloqueio 7 — Pesos
Pergunta: Que peso cada associação recebe?
Valor atual: peso 1 ×3, peso 2 ×44, peso 3 ×48; nenhum peso tem origem documentada.
Decisão necessária: aprovar ou redefinir os pesos de cada associação.
Decidido: Todos os 84 vínculos primários com peso 1; hierarquia 1/2/3 sai da fórmula e fica como legacy_recovered_weight.

## Bloqueio 8 — Parcialidade e cobertura
Pergunta: Como calcular a nota quando faltam respostas, e a partir de quanta cobertura um sistema mostra resultado?
Valor atual: nenhuma política. Exemplo: 10 itens, 2 respondidos com 3 → nota 0,0 ou 8,0 conforme o denominador.
Decisão necessária: definir denominador, cobertura mínima (sem corte pré-definido) e tratamento de "recusou"/"não se aplica".
Decidido: Cobertura por sistema = respondidos válidos / itens primários; avaliável com cobertura ≥ 0,80; em branco, recusada e não aplicável não são zero e reduzem a cobertura; nota pelos respondidos.

## Bloqueio 9 — Faixas
Pergunta: As faixas baixo/médio/alto e seus limites valem clinicamente?
Valor atual: 15 faixas, iguais nos 5 sistemas: baixo 0–3, médio (3–6], alto (6–10]. Sem buraco nem sobreposição = **validação técnica**, não homologação clínica.
Decisão necessária: aprovar limites e mensagens por sistema.
Decidido: 0 ≤ nota < 10/3 baixa; 10/3 ≤ nota < 20/3 intermediária; 20/3 ≤ nota ≤ 10 alta; classificação com precisão interna; exibição com 1 casa; mensagens neutras.

## Bloqueio 10 — Índice HOLOS
Pergunta: Como o Índice é calculado?
Valor atual: **RECUPERADO / NÃO HOMOLOGADO**: 0,20 por sistema, renormalização, elegível com 1 sistema respondido, escala 0–100, sem casas decimais.
Decisão necessária: aprovar ou redefinir pesos, elegibilidade e escala.
Decidido: Pesos 0,20; só com os cinco sistemas avaliáveis; sem renormalização; sem Índice parcial; Índice = 10 × Σ(nota × 0,20); 0–100; 1 casa; sem faixas.

## Bloqueio 11 — Tríada
Pergunta: Como a Tríada (físico/mental-emocional/espiritual) é calculada?
Valor atual: existe vínculo derivado do bloco de cada pergunta (84); nada foi aprovado (regra, pesos, faixas, texto).
Decisão necessária: aprovar a regra da Tríada ou declarar que não entra na V1.
Decidido: Eixos físico/mental/espiritual pelo bloco (49/19/16), peso 1, mesma orientação; eixo avaliável com cobertura ≥ 0,80; sem nota global, sem faixa, sem interpretação automática.

## Bloqueio 12 — Comparabilidade
Pergunta: Quando duas aplicações podem ser comparadas?
Valor atual: sem regra aprovada.
Decisão necessária: definir se comparação exige mesma versão do pacote e mesma cobertura.
Decidido: Delta só com mesmo paciente, edição, pacote, contrato do motor, sistema avaliável nas duas e mesmo conjunto pontuado; senão lado a lado; nunca melhorou/piorou automático.

## Bloqueio 13 — Nomenclatura e textos
Pergunta: Qual é a grafia oficial dos 5 sistemas e quais textos descrevem cada um?
Valor atual: o código e o Documento Mestre diferem em 3 nomes (ex.: "Detox + Linfático" × "Detox e Linfático").
Decisão necessária: fixar nomes e textos oficiais.
Decidido: Nomes oficiais dos cinco sistemas e textos oficiais seguros; impacto espiritual causal e equivalentes fora do conteúdo oficial (legado preservado em provenance).

## Bloqueio 14 — Caso de referência
Pergunta: Qual conjunto de respostas, com resultado esperado conferido por humano, serve de caso de referência?
Valor atual: exemplo sem resultado esperado (validador aponta `exemplo_sem_resultado`).
Decisão necessária: fornecer respostas + resultado esperado aprovado.
Decidido: REF-01, REF-02 e REF-03 com resultado esperado exato e de tela.

## Bloqueio 15 — Combinações e sugestões (CMB, REC, SEL)
Pergunta: As 16 combinações, 23 sugestões e a regra de seleção entram na V1?
Valor atual: REC-001..015 legado não validado; REC-016..023 rascunho; SEL-001 2/1/sem limite/máx. 4.
Decisão necessária: aprovar, editar ou excluir da V1.
Decidido: Nenhuma combinação ou sugestão automática oficial na V1; CMB-001..016, REC-001..023 e SEL-001 como legado não oficial; seleção manual profissional preservada.
