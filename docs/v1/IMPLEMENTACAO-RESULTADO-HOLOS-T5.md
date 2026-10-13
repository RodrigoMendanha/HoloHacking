# Resultado HOLOS — template 5: Direcionamento + Estratégias + Acompanhamento da evolução

Implementação aprovada em 13/10/2026 ("APROVADO PARA IMPLEMENTAÇÃO, COM AJUSTES" + atualização de escopo
"Resultado HOLOS = DIRECIONAMENTOS + ESTRATÉGIAS + ACOMPANHAMENTO DA EVOLUÇÃO"). Desenho de origem:
`docs/v1/REDESENHO-RESULTADO-HOLOS.md` e `docs/v1/redesenho-resultado/prototipo.html`. Todos os dados de exemplo são fictícios.

## 1. O que muda

O Resultado HOLOS deixa de ser principalmente a leitura do HOLOSCAN e passa a ser a **direção do acompanhamento**,
organizada em três pilares. O HOLOSCAN vai para o fim ("Detalhes do mapa").

| Pilar | Pergunta | Blocos (1ª consulta) |
|---|---|---|
| **Direcionamento** | Onde você está e para onde vamos | Seu momento agora · O que está pesando agora · O que você quer construir · O que estamos compreendendo · **Foco atual** |
| **Estratégias** | Como vamos caminhar | Como vamos caminhar (estratégias) · Caminho Corpo · Mente · Espírito · O que combinamos |
| **Acompanhamento da evolução** | Como vamos acompanhar o que muda | O que já está mudando · Até o próximo encontro, observe · Próxima etapa |
| — | Transparência | Detalhes do mapa (radar, Índice, Tríade, cinco sistemas, registros das ferramentas compartilhadas) |

**Retorno:** Acompanhamento da evolução (Seu caminho até aqui · Antes / Agora · Avanços · O que permaneceu · O que ficou mais claro) →
Direcionamento (Novo foco, O que você quer construir) → Estratégias (Como vamos caminhar, Corpo · Mente · Espírito, O que combinamos) →
Acompanhamento até o próximo encontro (Observe · Próxima etapa) → Detalhes do mapa.

**Diferença em relação à ordem aprovada antes da atualização de escopo:** "O que já está mudando" saiu da 4ª posição
(entre "O que você quer construir" e "O que estamos compreendendo") e foi para o pilar **Acompanhamento da evolução**,
porque é evolução, não direção. "Estratégias" (campo *Estratégia* da Conduta) entrou como bloco próprio. As demais
posições seguem a ordem aprovada. Internamente continuam `dores`, `desejos`, `avancos`.

## 2. Banco — migration `20261021100000_resultado_holos_direcao.sql` (aditiva)

- `holos_results.direcao jsonb` (nullable, até 256 KB). **Nenhuma tabela nova.**
- `resultado_holos_validar_direcao`: formato `schema_version = 1`, só campos conhecidos, listas até 40 itens, texto até 1000,
  origem e tipo de referência de listas fechadas, booleanos, **sugestão sem `ref` recusada** (rastreabilidade), `tipo` só em
  padrões (`padrao_observado` | `hipotese`) e **toda `ref` precisa ser um registro desta paciente e desta nutricionista**.
- `resultado_holos_direcao_paciente` (projeção no **servidor**): só item com `confirmado = true` **e** `mostrar_paciente = true`,
  não descartado, com texto; **`tipo = hipotese` nunca** (mesmo com `mostrar_paciente = true`); padrões só `padrao_observado`;
  a projeção sai sem `ref`.
- `resultado_holos_caminho`: Resultados anteriores da paciente (outros atendimentos, anteriores a este; versão vigente de cada um),
  lidos do snapshot imutável: data, foco, avanços e acordos compartilhados. Sem nota (nada recalculado, nada comparado).
- `montar_resultado_holos`: o template 4 foi **renomeado** para `montar_resultado_holos_t4` (corpo intacto) e a nova montagem
  acrescenta `template_version: 5`, `direcao`, `direcao_paciente` e `caminho`.
- `salvar_rascunho_resultado_holos`: grava a `direcao`. **Rascunho não exige foco.**
- `salvar_resultado_holos` (finalizar): exige **Foco atual confirmado** (`foco_obrigatorio`); o snapshot sai do que está gravado.
- `emitir_resultado_final` → **RF-3**: exige template 5 com foco confirmado no snapshot (`foco_obrigatorio`; Resultados de templates
  1–4 não são emitidos — cria-se uma nova versão com foco). Congela `direcao_paciente` e `caminho` (o snapshot público nunca leva a
  direção completa). A Conduta do atendimento continua congelada como registro (regra RF-2).
- Imutabilidade: o gatilho `proteger_revisao_consolidada` compara a linha inteira, então a `direcao` de um Resultado salvo não muda;
  emissões continuam imutáveis. Sem backfill: Resultados, emissões e PDFs anteriores ficam como estão.

### Formato final de `direcao` (schema_version 1)

```json
{
  "schema_version": 1,
  "tipo": "primeira | retorno",
  "momento":   [Item], "dores": [Item], "desejos": [Item],
  "avancos":   [Item], "permaneceu": [Item],
  "padroes":   [Item + {"tipo": "padrao_observado | hipotese"}],
  "foco_atual": Item | null,
  "estrategias": [Item],
  "corpo":   {"itens": [Item]}, "mente": {"itens": [Item]}, "espirito": {"itens": [Item]},
  "acordos_compartilhados": [Item],
  "observar": [Item],
  "proxima_etapa": Item | null
}
Item = {
  "id": "local", "texto": "…", "texto_sugerido": "… (quando veio de sugestão)",
  "origem": "relato_paciente | observacao_profissional | holoscan | ferramenta | conduta | acordo | nutricionista | resultado_anterior",
  "ref": {"tipo": "anamnese | conduta | acordo | ferramenta | holoscan | resultado | atendimento", "id": "uuid", "campo": "…"},
  "sugestao": true|false, "confirmado": true|false, "mostrar_paciente": true|false, "descartado": true|false
}
```

Estados: **SUGESTÃO DO SISTEMA** (`sugestao`, não confirmado) → **CONFIRMADO PELA NUTRICIONISTA** (`confirmado`; só profissional se
`mostrar_paciente = false` ou hipótese) → **COMPARTILHADO COM A PACIENTE** (`confirmado` + `mostrar_paciente`). Sugestão excluída fica
`descartado` (registro), nunca na paciente.

## 3. Tela

- **Editor "MONTAR RESULTADO PARA A PACIENTE"** (aba Resultado HOLOS da ficha), por pilar. Botão *Trazer sugestões do sistema*
  (usa a prévia do servidor). Cada item mostra estado, origem e referência; ações: editar, **Confirmar**, *Desfazer confirmação*,
  *Compartilhar com a paciente* (só depois de confirmar), *Excluir*; *Adicionar* (escrito pela nutricionista). Nada vem confirmado.
  Status no topo: **RESULTADO EM CONSTRUÇÃO** até o foco ser confirmado.
- **SÓ PARA A PROFISSIONAL**: hipóteses, leitura técnica, questões para aprofundar, observações que não vão para a paciente.
- Sugestões (`resultado-direcao.js`, `sugestoes`): só citam o que já foi registrado — Mapeamento/anamnese (primeira e retorno), sinais
  dominantes das duas primeiras áreas do HOLOSCAN, OQ³, PQQ, Mapa da Rotina, Crenças, Gatilhos, Roda, Conduta (objetivo, estratégia,
  recursos, ações, orientações, monitoramento, retorno), acordos (não encerrados/revistos), acordo anterior concluído, Resultado anterior.
  **Nenhuma ação é criada**: ação só vem da Conduta/acordo, do próximo passo escrito na ferramenta, ou do que a nutricionista escrever.
- Termos fora do método (dieta, prescrição, suplementação, diagnóstico, causalidade…) no que vai para a paciente geram **aviso** na tela.
- **Página Resultado**: sem foco confirmado → "RESULTADO EM CONSTRUÇÃO", sem botão de emitir. Emissão RF-3 → PDF, WhatsApp, Imprimir.
  Emissões RF-1/RF-2 antigas continuam visíveis e imprimíveis como registro, sem PDF/WhatsApp novos.
- **WhatsApp:** "Olá, [nome]! Segue o seu Resultado HOLOS de [data]. Nesta etapa, nosso foco é: [foco]. No documento você encontra o
  que estamos observando, o que combinamos e o que vamos revisar no próximo encontro." (foco congelado na emissão; nunca hipótese).
- **PDF:** mesma geração (html2pdf, paginação própria); cada bloco do template 5 é indivisível; direção nas primeiras páginas, Detalhes
  do mapa no fim.

## 4. Não mudou

HOLOSCAN (perguntas, pesos, associações, fórmula, faixas, Índice, Tríade), pacotes HOLOS-V1 (v6 vigente), PP-V1, ferramentas,
templates 1–4 e seus desenhos, emissões RF-1/RF-2, Relatório.

## 5. Testes

- `testes/testar-resultado-direcao.mjs` (servidor falso + tela; fixture `testes/fixture-direcao.mjs`): os 18 testes obrigatórios
  (T01…T18) e mais checagens de ordem, editor, retorno, celular e erros de JavaScript.
- `supabase/tests/resultado-direcao-harness.sql` (Postgres local, `scripts/validar-cadeia-local.sh`): RD00–RD09.
- Testes antigos que salvavam Resultado sem foco ou esperavam template 4 / RF-2 foram ajustados para o template 5 (ver commit).

## 6. Capturas, PDFs e WhatsApp

`docs/v1/resultado-holos-t5/` (ver `LEIA-ME.md` da pasta): editor profissional, visão da paciente (1ª consulta e retorno,
desktop e celular), Resultado emitido, PDF da 1ª consulta e do retorno (5 páginas cada, sem cartão cortado nem página vazia)
e as duas mensagens de WhatsApp.

## 7. Riscos restantes

1. **Resultados já salvos em produção (templates 1–4) não emitem mais sem foco**: para enviar à paciente, a nutricionista cria
   "Nova versão a partir desta" e confirma o foco (a versão anterior fica no histórico). Emissões já feitas continuam visíveis e
   imprimíveis como registro, mas sem PDF/WhatsApp novos.
2. **Leitura profissional e "Pontos para acompanhar" deixaram de ir para a paciente** no template 5 (ficam em SÓ PARA A
   PROFISSIONAL); o que a paciente vê é só o que foi confirmado e compartilhado na direção.
3. **"O que já está mudando"** foi para o pilar Acompanhamento da evolução (atualização de escopo); se Rodrigo quiser a posição 4
   original, é uma troca só de desenho.
4. **Sugestões são citações** do que foi registrado ("Seu principal objetivo: …"); a nutricionista deve reescrever na voz dela
   quando quiser. O aviso de termos fora do método não bloqueia (como decidido no desenho).
5. **Projeção duplicada**: a regra "hipótese nunca / só confirmado + compartilhado" existe no servidor (fonte da verdade) e no
   navegador (prévia do editor); um teste garante que as duas dão o mesmo resultado.
6. **Caminho do retorno** mostra só foco, avanços e acordos de Resultados template 5; Resultados antigos aparecem como "registro
   anterior ao formato com foco".
7. **Produção**: a migration 20261021100000 ainda não foi aplicada (coluna `direcao` não existe no banco real). O front novo exige
   a migration: aplicar o SQL **antes** do deploy do front.
