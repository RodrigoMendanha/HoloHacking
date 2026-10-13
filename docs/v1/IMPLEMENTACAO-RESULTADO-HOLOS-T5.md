# Resultado HOLOS — template 5: Direcionamentos + Estratégias + Acompanhamento da evolução

Implementação aprovada em 13/10/2026 ("APROVADO PARA IMPLEMENTAÇÃO, COM AJUSTES", atualização de escopo e **"AJUSTE FINAL
CONSOLIDADO"** antes do deploy — DECISOES-V1 itens 192 e 193). Desenho de origem: `docs/v1/REDESENHO-RESULTADO-HOLOS.md`.
Todos os dados de exemplo são fictícios. **Nada foi publicado:** a migration não foi aplicada em produção e não houve deploy.

## 1. Propósito

O Resultado HOLOS passa a ser **DIRECIONAMENTOS + ESTRATÉGIAS + ACOMPANHAMENTO DA EVOLUÇÃO**:

DADO → INVESTIGAÇÃO → COMPREENSÃO → DIRECIONAMENTO → ESTRATÉGIA → ACORDO → OBSERVAÇÃO → RESULTADO PERCEBIDO → EVOLUÇÃO → AJUSTE.

Os cinco sistemas explicam **por que olhamos**; o direcionamento e as estratégias dizem **o que vamos fazer**.

### Ordem da visão da paciente (1ª consulta)

1. Seu momento agora · 2. O que está pesando agora · 3. O que você quer construir · 4. O que estamos compreendendo ·
5. **Foco atual** · 6. **Direcionamentos desta fase** · 7. **Estratégias combinadas** · 8. Caminho Corpo · Mente · Espírito ·
9. O que combinamos · 10. Até o próximo encontro, observe · 11. **Acompanhamento da evolução** (ponto de partida / "O que já está
mudando" e "Como vamos acompanhar") · 12. Próxima etapa · 13. Detalhes do mapa · 14. Os cinco sistemas.

"Como vamos caminhar" foi **removido** (não tinha função própria: as estratégias já ocupam esse lugar).

### Retorno

SEU CAMINHO ATÉ AQUI · ANTES / AGORA (com o direcionamento e as estratégias anteriores) · AVANÇOS · O QUE PERMANECEU ·
**ESTRATÉGIAS TESTADAS** (o que aconteceu, o que facilitou/dificultou, o que você percebeu, decisão) · O QUE FICOU MAIS CLARO ·
NOVO FOCO · NOVO DIRECIONAMENTO · NOVAS ESTRATÉGIAS · Corpo · Mente · Espírito · O que combinamos · OBSERVAR · PRÓXIMA ETAPA ·
Detalhes do mapa · Os cinco sistemas.

## 2. Compatibilidade histórica — sem regra retroativa

| | Templates 1–4 (já salvos) | Template 5 |
|---|---|---|
| Abrir / visualizar | desenho histórico | desenho novo |
| `direcao` / foco | não exigidos | rascunho salva sem foco; **finalizar exige foco** |
| Emitir | **RF-2** (regra histórica), sem nova versão | **RF-3**, exige foco no snapshot |
| PDF / WhatsApp | como sempre (mensagem histórica) | só emissão RF-3 com foco; mensagem nova |
| Emissões RF-1/RF-2 já feitas | abrem pelo desenho da época | — |

Provas: C01–C04 (`testar-resultado-direcao.mjs`), RD06a (PG), `testar-resultado-final.mjs` (Resultado template 4 emitido
pela regra histórica).

## 3. Banco — migration `20261021100000_resultado_holos_direcao.sql` (aditiva, ainda não aplicada)

- `holos_results.direcao jsonb` (nullable, até 256 KB). **Nenhuma tabela nova.**
- `resultado_holos_validar_item(it, lista)`: campos de item por lista, enums fechados (território, status, decisão),
  sugestão sem `ref` recusada, `tipo` só em padrões. `resultado_holos_validar_direcao`: `schema_version = 1`, só campos
  conhecidos, listas ≤ 40, texto ≤ 1000, **toda `ref` precisa ser desta paciente e desta nutricionista**, e `anterior` /
  `estrategia` precisam apontar para um Resultado **salvo desta paciente** (`referencia_cruzada`). Acompanhamento confirmado
  sem decisão é recusado.
- `resultado_holos_direcao_paciente` (projeção no **servidor**): só item `confirmado` **e** `mostrar_paciente`, não descartado,
  com texto; **hipótese nunca** (mesmo com `mostrar_paciente = true`); saída sem `ref` e só com os campos públicos de cada lista
  (`observacao` do acompanhamento fica fora).
- `resultado_holos_caminho`: Resultados anteriores (outros atendimentos), do snapshot imutável: data, foco, direcionamentos,
  estratégias, avanços e acordos compartilhados. Sem nota, sem recálculo.
- `montar_resultado_holos`: o template 4 virou `montar_resultado_holos_t4` (intacto); a nova montagem acrescenta
  `template_version: 5`, `direcao`, `direcao_paciente` e `caminho`.
- `salvar_rascunho_resultado_holos` grava a `direcao` (sem foco). `salvar_resultado_holos` exige foco (`foco_obrigatorio`).
- `emitir_resultado_final`: template ≥ 5 → RF-3 (foco obrigatório; congela `direcao_paciente` e `caminho`); template < 5 → RF-2
  (regra histórica). Constraint aceita RF-1/RF-2/RF-3.
- Imutabilidade: o gatilho `proteger_revisao_consolidada` compara a linha inteira (a `direcao` de um Resultado salvo não muda);
  emissões continuam imutáveis. Sem backfill.

### Schema final de `direcao` (schema_version 1)

```json
{
  "schema_version": 1,
  "tipo": "primeira | retorno",
  "momento": [Item], "dores": [Item], "desejos": [Item], "avancos": [Item], "permaneceu": [Item],
  "padroes": [Item + {"tipo": "padrao_observado | hipotese"}],
  "foco_atual": Item | null,
  "direcionamentos": [Item + {"territorio": "corpo|mente|espirito|integrado", "porque": "…", "objetivo": "…",
                              "status": "proposto|ativo|concluido|encerrado", "sistemas": ["metabolico", …]}],
  "estrategias": [Item + {"direcionamento_id": "id local", "finalidade": "…", "acao": "…", "observar": "…", "contexto": "…",
                          "prazo": "…", "responsavel": "…",
                          "status": "proposta|acordada|em_teste|manter|ajustar|substituir|concluida|encerrada",
                          "anterior": {"resultado_id": "uuid", "estrategia_id": "id local"} | null}],
  "acompanhamento_estrategias": [Item + {"estrategia": {"resultado_id": "uuid", "estrategia_id": "id local"},
                          "aplicou": "…", "facilitou": "…", "dificultou": "…", "percepcao": "…",
                          "observacao": "… (só profissional)", "mudanca": "…",
                          "decisao": "manter|ajustar|substituir|concluir|encerrar"}],
  "corpo": {"itens": [Item]}, "mente": {"itens": [Item]}, "espirito": {"itens": [Item]},
  "acordos_compartilhados": [Item], "observar": [Item], "proxima_etapa": Item | null
}
Item = {"id", "texto", "texto_sugerido", "origem", "ref": {"tipo", "id", "campo"},
        "sugestao", "confirmado", "mostrar_paciente", "descartado"}
```

Estados: **SUGERIDO** (`sugestao`, não confirmado) → **CONFIRMADO PELA NUTRICIONISTA** → **COMPARTILHADO COM A PACIENTE**
(`confirmado` + `mostrar_paciente`). Sugestão não confirmada nunca chega à paciente, ao PDF, ao WhatsApp nem ao Resultado Final.
Ao confirmar, direcionamento `proposto` vira `ativo` e estratégia `proposta` vira `acordada`.

**Histórico das estratégias:** a decisão do retorno não altera a estratégia anterior. MANTER/AJUSTAR geram uma estratégia
**nova** no Resultado do retorno, com `anterior` apontando para a original; o Resultado anterior fica idêntico (R11, RD07b).

## 4. Tela

- **Editor profissional** (aba Resultado HOLOS), por pilar. Primeira consulta: Direcionamento (momento, pesando, construir,
  padrões, foco, direcionamentos) · Estratégias (estratégias, Corpo/Mente/Espírito, acordos) · Evolução (observar, avanços,
  próxima etapa). Retorno: Acompanhamento das estratégias anteriores primeiro. Cada item mostra estado, origem e referência.
  - DIRECIONAMENTO: território, por quê, objetivo, status, sistemas ligados (opcional).
  - ESTRATÉGIA: direcionamento, para que serve, o que a paciente fará, o que observar, contexto/frequência, prazo, definida por,
    status, compartilhar.
  - ACOMPANHAMENTO: conseguiu aplicar, facilitou, dificultou, percepção, observação (só profissional), mudança, decisão — sem
    decisão não confirma. Depois de confirmar, "Trazer sugestões" gera avanços, o que permaneceu e a estratégia continuada.
  - **SÓ PARA A PROFISSIONAL**: hipóteses, leitura técnica, questões.
- **Sugestões** só citam registros: direcionamentos da Conduta (objetivo/prioridades), prioridade escrita na ferramenta e
  Resultado anterior; estratégias da Conduta (estratégia); acompanhamento das estratégias do Resultado anterior. **Nada sai
  da nota do HOLOSCAN.**
- **Os cinco sistemas** (fim do documento): prioritário ("Área principal para aprofundar" / "Área para aprofundar nesta etapa")
  com O QUE APARECEU, O QUE VALE OBSERVAR, COMO CUIDAR DESTE EIXO (texto-base CE-1 + limite) e PARA VOCÊ, NESTA FASE
  (direcionamentos ligados ao sistema e suas estratégias — da `direcao`, nunca da nota). Não prioritário: compacto, "Não aparece
  como um dos focos principais nesta etapa.", definição curta, cuidado base. A nota é detalhe: "a nota organiza as suas
  respostas; não indica doença nem saúde". Sem "normal/saudável/sem problema/perfeito/menos marcadores".
- **WhatsApp (RF-3):** "Olá, [nome]! Segue seu Resultado HOLOS de [data]. Nesta fase, nosso principal direcionamento é:
  [direcionamento]. No documento estão as estratégias que combinamos, o que observar até o próximo encontro e como vamos
  acompanhar a evolução." (sem direcionamento compartilhado, o foco ocupa o lugar; nunca hipótese).
- **PDF:** html2pdf com paginação própria; cada cartão (direcionamento, estratégia, bloco de sistema) é indivisível; direção
  primeiro, técnico no fim.

## 5. Não mudou

HOLOSCAN (perguntas, pesos, associações, fórmula, faixas, Índice, Tríade), pacotes HOLOS-V1 (v6), PP-V1, ferramentas,
templates 1–4, emissões RF-1/RF-2, Relatório. Nenhuma dieta, prescrição, suplemento, diagnóstico ou causa é gerada.

## 6. Testes

- `testes/testar-resultado-direcao.mjs` (servidor falso + tela; fixture `testes/fixture-direcao.mjs`, caso V6: Metabólico 3,8
  principal, Detox 6,7 segundo, Ácido 10,0): T01–T18, C01–C04 (compatibilidade), D01, E01, S01–S05 (sistemas), R01–R12
  (retorno), W01, P01 — 77 checagens.
- `supabase/tests/resultado-direcao-harness.sql` (Postgres local): RD00–RD10d.
- Testes antigos ajustados: os que salvavam Resultado novo passaram a confirmar um foco; os que testam o desenho anterior
  usam `comoTemplate4` (Resultado template 4, emitido pela regra histórica).

## 7. Capturas, PDFs e WhatsApp

`docs/v1/resultado-holos-t5/` (ver `LEIA-ME.md`).

## 8. Riscos restantes

1. **Ordem do deploy:** aplicar a migration 20261021100000 e publicar o front novo **juntos** (migration primeiro). No intervalo
   entre os dois, o front antigo continua lendo e emitindo o histórico (RF-2), mas **não consegue finalizar um Resultado novo**
   (o servidor passa a exigir foco, que o front antigo não envia).
2. **Projeção duplicada** (servidor = fonte da verdade; navegador = prévia): teste garante saída idêntica.
3. **Sugestões são citações** do que foi registrado; a nutricionista reescreve na voz dela quando quiser. O aviso de termos fora
   do método não bloqueia.
4. **Sistemas ligados** a um direcionamento são opcionais: sem ligação, o sistema prioritário não mostra "Para você, nesta fase"
   (por desenho — nada sai da nota).
5. **Caminho do retorno** mostra foco, direcionamentos, estratégias, avanços e acordos de Resultados template 5; Resultados
   antigos aparecem como registro anterior ao formato com foco.
6. **PDF**: o cartão grande de um sistema prioritário pode continuar na página seguinte (os blocos internos não são cortados).
7. **Exames fora do HOLOSCAN** (lembrete de Rodrigo em 13/10): exames só ficam guardados em Documentos para visualização. O texto
   público do sistema Metabólico no pacote publicado ainda cita "achados laboratoriais relatados no questionário"; a visão da
   paciente do template 5 **não usa** esse texto (usa a definição aprovada "Este eixo reúne…" e descarta qualquer definição que
   cite exame/laboratório). Corrigir o texto do próprio pacote exige uma nova versão do pacote (versão publicada não se edita).
