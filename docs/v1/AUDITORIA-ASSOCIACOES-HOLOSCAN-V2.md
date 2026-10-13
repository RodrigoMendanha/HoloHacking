# AUDITORIA DAS ASSOCIAÇÕES PERGUNTA → SISTEMA — HOLOSCAN HOLOS-V1 v2

Auditoria metodológica **somente leitura** · 13/10/2026 · pacote auditado: **HOLOS-V1 versão 2** (o publicado em produção)

> **Nada foi alterado.** Este documento não muda nenhuma pergunta, associação, peso, orientação, escala, faixa, regra, pacote, motor, catálogo PP-V1, teste nem dado salvo. Não remove SNT-210 nem SNT-309. Não propõe associação nova: onde aparece "merece revisão", é só uma sinalização para o metodologista. Nenhuma justificativa foi inventada: toda justificativa citada é **literal**, com o arquivo de origem; onde não há texto escrito, a célula diz **"não documentada"**. Nenhum dado de paciente real foi usado.

---

## 1. Objetivo

Listar, para cada uma das 84 perguntas do HOLOS-V1 v2, a qual sistema ela pontua hoje, com que peso, orientação e escala, e **o que está escrito** (se algo está) que sustente essa associação. A partir disso, classificar cada associação em A/B/C/D (legenda na seção 4) e destacar os itens que merecem revisão metodológica, em especial os que apareceram no teste real (Fúngico e Ácido Inflamatório) e as duas perguntas sobre exames (SNT-210 e SNT-309).

O v3 (82 perguntas; `docs/v1/HOLOSCAN-PERGUNTAS-V3.md`, `scripts/pacote-v3.mjs`, `metodologia-revisao-v3.js`) **não está publicado** e **não é o objeto** desta auditoria. Ele só é citado quando já registrou uma decisão sobre um item do v2.

## 2. Fonte dos dados e como foram extraídos

### 2.1 De onde vem o v2

O v2 não é escrito à mão: é gerado de forma determinística por `scripts/pacote-candidato-v1.mjs`, que lê o inventário `docs/v1/metodologia/inventario-metodologico-v1.json`, importa o HOLOS-V1@1 com `PacoteMetodologico.importarInventario` (`metodologia-pacote.js`) e aplica as 15 decisões fechadas da Etapa 4.2 (`metodologia-decisoes-v1.js`) com `PacoteMetodologico.aplicarDecisoesV1`. O resultado está versionado em `docs/v1/metodologia/pacote-metodologico-v1-candidato.json`. Em produção, o mesmo conteúdo foi gravado pela tela de homologação:

> "O conteúdo é reconstruído deterministicamente do inventário + decisões fechadas da Etapa 4.2 (mesmas funções de `scripts/pacote-candidato-v1.mjs`; `--check` garante o JSON candidato atualizado). **Nada é inventado.**" — `docs/v1/ETAPA6-3-PLANO-GOVERNANCA-E-DEPLOY.md`

### 2.2 Extração programática (sem cópia manual)

As 84 linhas da tabela da seção 5 foram geradas por script, não digitadas:

1. `node scripts/pacote-candidato-v1.mjs --check` → `pacote candidato em dia` (o JSON versionado é idêntico ao que o gerador produz hoje; nada foi gravado).
2. Script descartável (fora do repositório), no Node: `await import('metodologia-pacote.js')`, `metodologia-motor.js`, `metodologia-decisoes-v1.js`; `P.importarInventario(inventario, 'HOLOS-V1', 1)` → `P.aplicarDecisoesV1(base, MetodologiaDecisoesV1)`. Resultado: `HOLOS-V1` versão `2`, **84 perguntas**, e o objeto gerado é **byte a byte igual** ao `pacote` do JSON versionado (`JSON.stringify` idêntico).
3. De cada pergunta: `stable_id`, `statement`, `block`, `scale_code`, `orientation`, `source`, `position`; de `associacoes`: `role` (`primaria`, `secondary_contextual`, `triade_por_bloco`), `destination_id`, `weight`, `source`, `legacy`.
4. Conferência cruzada: os 24 textos "Antes (v2)" de `docs/v1/REVISAO-PERGUNTAS-V3.md` batem com o extraído.

### 2.3 Identificação do pacote (hash)

| Verificação | Resultado |
|---|---|
| `code` / `version` | `HOLOS-V1` / `2` |
| Perguntas / blocos | 84 = 49 Físico + 19 Mental/Emocional + 16 Espiritual |
| Escalas | 73 frequência + 11 intensidade, ambas 0–3 |
| Orientação | 75 diretas + 9 invertidas |
| Associações | 84 `primaria` (peso 1) + 11 `secondary_contextual` (peso nulo) + 84 `triade_por_bloco` (peso 1) |
| Faixas | 15 (3 por sistema) |
| Hash calculado com a função do repositório (`PacoteMetodologico.hashConteudo`, JS) | `3593d782f1cd3a35b05ecae36836ab71746064cc99960853705dd3e2ac3f24c4` |
| Hash do pacote aprovado em produção (servidor, SQL) | `7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402` |

**O hash de produção não pôde ser recalculado aqui.** Ele vem da função SQL `public.metodologia_hash_conteudo(p_package_id)` (`supabase/migrations/20261001210000_dupla_aprovacao_metodologica.sql`), que serializa as **linhas gravadas** nas tabelas `methodology_*` (com as colunas e defaults do banco). Reproduzir isso exige gravar o pacote num PostgreSQL com o schema completo, o que esta auditoria somente leitura não fez. A identificação do v2 foi feita assim:

- o hash JS reproduzido (`3593d782…`) é o mesmo registrado como hash do candidato v2 em `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md` (tabela da seção 1);
- a relação entre os dois hashes está escrita: "**Hash HOLOS esperado (servidor, `metodologia_hash_conteudo`): `7af1dae64c1e020cdeb436ea35f87f67b232210a36bddc6bef3e01940881b402`** — calculado localmente gravando o candidato sobre o schema pós-6.2 (…; 84 perguntas, 5 sistemas, 15 faixas; validador `publicavel = true`, 0 erros). O hash JS gravado inicialmente pelo cliente (`3593d782…`, algoritmo diferente) é sobrescrito pelo hash SQL na homologação." — `docs/v1/ETAPA6-3-PLANO-GOVERNANCA-E-DEPLOY.md`;
- o estado de produção: "único pacote: HOLOS-V1 v2 `aprovado` (hash `7af1dae6…`). v3 **não** publicado" — `docs/v1/DEPLOY-MR-V1-PRODUCAO.md`; "Aprovado, `content_hash 7af1dae64c1e…`, vigente desde 2026-10-03; 84 perguntas; 5 sistemas (…); 84 associações primárias peso 1; 11 `secondary_contextual`; 84 `triade_por_bloco`; 15 faixas" — `docs/v1/ESTADO-ATUAL-PRE-RECOMENDACOES-HOLOS.md`. As contagens batem com as extraídas.

## 3. Declaração

Nenhum arquivo do repositório foi modificado além deste documento. Não houve commit. Os scripts usados na extração e nas simulações ficaram num diretório temporário, fora do repositório. As simulações da seção 7.3 usaram o **motor real** (`metodologia-motor.js`) sobre uma cópia **em memória** do pacote, com `status = 'aprovado'` e `effective_from = '2026-10-03'` (porque o motor recusa calcular em modo oficial sobre um pacote `em_revisao`, que é o status do JSON versionado). Nenhuma resposta usada é de paciente: são vetores sintéticos (todas as respostas iguais).

## 4. Legenda e critérios

### 4.1 Status

| Status | Significado | Critério aplicado |
|---|---|---|
| **A** | associação claramente sustentada por documentação aprovada | existe uma decisão aprovada que decide **nominalmente** o vínculo pergunta → sistema deste item |
| **B** | associação autoral existente, mas justificativa não documentada | o vínculo está no pacote aprovado (aprovado **em bloco** pelas Decisões 4 e 7), mas não há texto que justifique este item; e nenhum critério de C ou D se aplica |
| **C** | associação que merece revisão metodológica | (C1) conteúdo emocional, espiritual, comportamental ou ambiental pontuando um sistema físico (Fúngico, Ácido Inflamatório, Metabólico, Detox e Linfático); (C2) conteúdo corporal pontuando o MEE fora dos temas que o texto oficial do MEE cita; (C3) enunciado ou vínculo que pode induzir leitura causal ou diagnóstica; (C4) vínculo já contestado por escrito na revisão pública do v2 |
| **D** | conflito com decisão atual | o item pontua algo que uma decisão vigente diz que não pode entrar no resultado |

Um item recebe uma única letra; a ordem de precedência é D > A > C > B. "Merece revisão" **não** é recomendação de mudar a associação.

### 4.2 O que conta como "documentação aprovada"

- **Aprovado:** as 15 decisões fechadas da Etapa 4.2 (`docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`, `docs/v1/metodologia/PACOTE-DECISAO-HUMANA-V1.md`) e as decisões numeradas de `docs/v1/DECISOES-V1.md`.
- **Decisão 4** (associações) aprova a regra, não o conteúdo de cada item: "Exatamente **um** sistema primário pontuável por pergunta (84). As 9 secundárias recuperadas viram `secondary_contextual`: não pontuam, não duplicam a pergunta, não entram no denominador nem na cobertura, não afetam o Índice nem a Tríada." — `PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`. O campo "Justificativa" da decisão diz só: "Decisão metodológica V1 encerrada pela liderança do método e registrada na Etapa 4.2 (…). As opções acima ficam como registro do que foi considerado." — `PACOTE-DECISAO-HUMANA-V1.md`.
- **Decisão 7** (pesos): "Peso 1 nos 84 vínculos primários. A hierarquia 1/2/3 sai da fórmula e fica como `legacy_recovered_weight`." — `PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`.
- **Decisões 5 e 6** são as únicas que decidem nominalmente o sistema de uma pergunta (SNT-101 e SNT-501).
- **Não é justificativa aprovada:** o Anexo A de `PACOTE-DECISAO-HUMANA-V1.md` ("As 84 perguntas como estão hoje (RECUPERADO / NÃO HOMOLOGADO)") e o campo `source` de cada pergunta. O inventário descreve essas origens assim (`docs/v1/metodologia/INVENTARIO-FONTES.md`): bloco físico (`motor/bancos/sintomas.csv`) — "`status=rascunho` em todas; `fonte=rascunho-literatura-funcional` (SNT-505, SNT-507: livro p. 90/91)" e "literatura funcional + livro, montadas por quem programou"; bloco mental-emocional (`emocoes.csv`) — "`rascunho`; fontes "material 11/08" e "livro p. 89–93""; bloco espiritual (`espiritual.csv`) — "`rascunho`; fontes "livro p. 38–63" e "material 11/08""; homologação de todas: "PENDENTE". Por isso a tabela mostra o `source` como **"Prov."** (proveniência registrada, citada literalmente de `docs/v1/metodologia/pacote-metodologico-v1-candidato.json`, campo `perguntas[].source`), sempre ao lado de **"não documentada"**.
- **Textos oficiais dos sistemas (Decisão 13)** descrevem o que cada eixo organiza. Eles são citados nas seções 5 e 6 só como **contexto temático**; não são justificativa item a item:
  - Fúngico: "Eixo autoral do HOLOSCAN que organiza respostas relacionadas a sinais digestivos, mucosas, pele e padrões de desejo alimentar agrupados pelo método. Não diagnostica candidíase, infecção fúngica, disbiose ou qualquer outra doença."
  - Ácido Inflamatório: "Eixo autoral que organiza respostas relacionadas a dor, rigidez, pele, mucosas e reatividade presentes no questionário. O termo 'ácido' faz parte da nomenclatura autoral e não representa medição do pH corporal. O eixo não diagnostica inflamação nem substitui avaliação ou exames clínicos."
  - Metabólico: "Eixo autoral que organiza respostas relacionadas a energia, fome, comportamento alimentar, composição corporal percebida e achados laboratoriais relatados no questionário. Não diagnostica resistência à insulina, diabetes ou outra condição metabólica."
  - Detox e Linfático: "Eixo autoral que organiza respostas relacionadas a inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias presentes no questionário. 'Detox' é nomenclatura do método; a pontuação não mede toxinas, função hepática ou função linfática."
  - Mental Emocional Espiritual: "Eixo autoral que organiza respostas relacionadas a sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal. Não diagnostica transtornos mentais e não mede saúde, valor ou qualidade espiritual."
  
  (todos de `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`, seção 4)

### 4.3 Coluna "tema sugerido"

Está **"—" nas 84 linhas**. O único quadro do repositório com um tema por pergunta é a tabela do PP-V2, e ela diz "a definir" com status `PENDENTE_DE_HOMOLOGACAO`: "**Tema potencial:** fica *a definir*. O bloco do pacote é indicado só como ponto de partida." e "**Nenhuma destas relações entra no motor vigente.**" — `docs/v1/IMPLEMENTACAO-MOTOR-RESULTADOS-HOLOHACKING-V1.md`, seção R. Os rótulos de agrupamento da seção D de `docs/v1/IMPLEMENTACAO-MAPEAMENTO-HOLISTICO-ENXUTO-V1.md` (por exemplo "Sono (acordar cansado, demorar a dormir, acordar de madrugada)") servem ao cruzamento Mapeamento × HOLOSCAN v3 e não foram aprovados como temas de pergunta; por isso não foram usados.

### 4.4 Coluna "ferramentas PP-V1 candidatas"

O PP-V1 liga **SISTEMA → FERRAMENTA**, não pergunta → ferramenta. Por isso as ferramentas candidatas de uma pergunta são **as 6 regras do catálogo HOLOS-RECOMENDACOES-V1 do seu sistema primário**, na ordem de `rank` (fonte: `testes/proximos-passos-catalogo-v1.mjs`, que o teste exige idêntico à migration `supabase/migrations/20261012100000_proximos_passos_holos.sql`). A pergunta não escolhe ferramenta: "explica cada recomendacao com o sistema de origem e ate 3 sinais dominantes que o HOLOSCAN ja calcula (eles NAO escolhem a ferramenta)" — `proximos-passos.js`. "Principal" e "complementar" não são atributos da regra: o motor escolhe, pelos dois sistemas de "Por onde investigar", "no maximo 1 recomendacao principal + 2 complementares, sem repetir ferramenta" (`proximos-passos.js`): a principal é a primeira ferramenta disponível do 1º sistema; a 1ª complementar vem do 2º sistema; a 2ª complementar, de novo do 1º.

| Sistema | rank 1 › 2 › 3 › 4 › 5 › 6 (regras) |
|---|---|
| Fúngico | Mapa da Rotina › Gatilhos & Respostas › Mapa de Crenças Alimentares › Linha do Momentum › OQ³ › Conexão & Pertencimento (REC-FUN-01…06) |
| Ácido Inflamatório | Mapa da Rotina › Linha do Momentum › Gatilhos & Respostas › Roda Holística da Vida › Conexão & Pertencimento › OQ³ (REC-AIN-01…06) |
| Metabólico | Mapa da Rotina › Gatilhos & Respostas › Mapa de Crenças Alimentares › Linha do Momentum › OQ³ › Carta ao Futuro Eu (REC-MET-01…06) |
| Detox e Linfático | Mapa da Rotina › Linha do Momentum › OQ³ › Roda Holística da Vida › Conexão & Pertencimento › Gatilhos & Respostas (REC-DTL-01…06) |
| Mental Emocional Espiritual | PQQ › Mapa de Crenças Alimentares › Gatilhos & Respostas › Mapa do Propósito › Carta ao Futuro Eu › Conexão & Pertencimento (REC-MEE-01…06) |

Na tabela, nomes curtos: Rotina, Gatilhos, Crenças, Momentum, OQ³, Conexão, Roda, Carta, PQQ, Mapa do Propósito.

## 5. As 84 perguntas do HOLOS-V1 v2

Ordem do pacote (`position`). Peso = peso da associação primária (o único que pontua). Todas as perguntas também têm a associação `triade_por_bloco` (peso 1) com o eixo da Tríade indicado na coluna "bloco". "Prov." = campo `source` da pergunta em `docs/v1/metodologia/pacote-metodologico-v1-candidato.json` (proveniência histórica, não justificativa aprovada; ver 4.2).

| question_id | texto | bloco | sistema primário atual | associação secundária/contextual | peso | orientação · escala | justificativa metodológica existente | tema sugerido | ferramentas PP-V1 candidatas (sistema primário, ordem de rank) | status |
|---|---|---|---|---|---|---|---|---|---|---|
| SNT-101 | Você sente vontade forte de doce ou pão quase todo dia? | Físico (Tríade Corpo) | Fúngico | Metabólico — `secondary_contextual`, sem pontuação (Decisão 5) | 1 | direta · frequência 0–3 | Decisão explícita do item: «"Você sente vontade forte de doce ou pão quase todo dia?" Primário: **Sistema Fúngico**, peso 1. Metabólico como `secondary_contextual`, sem contribuição» — `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md` (Decisão 5). Campo Justificativa da decisão: «Decisão metodológica V1 encerrada pela liderança do método» — `docs/v1/metodologia/PACOTE-DECISAO-HUMANA-V1.md` (sem fundamento clínico escrito) | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | A — decisão nominal do vínculo deste item |
| SNT-102 | Sua barriga incha ou dá gases depois das refeições? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:3)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-103 | Sua língua costuma ter uma camada esbranquiçada? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:4)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-104 | Você tem candidíase ou sapinho com frequência? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:5)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | C — enunciado nomeia uma condição («candidíase») que o texto oficial do próprio sistema diz não diagnosticar («Não diagnostica candidíase, infecção fúngica…», D13); o termo «candid» está na lista de linguagem proibida do Fúngico em `sistemas-fechamento.js`, mas o enunciado pode aparecer literal como sinal dominante (§6.4 e §7.5) |
| SNT-105 | Você tem micose de pele ou unha que volta sempre? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:6)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | C — enunciado nomeia micose (infecção fúngica de pele/unha) num eixo cujo texto oficial diz «Não diagnostica … infecção fúngica» (D13); leitura diagnóstica possível |
| SNT-106 | Você sente coceira na região íntima ou anal? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:7)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; substituído no v3 por SNT-112 (não publicado) |
| SNT-107 | Sua cabeça fica pesada ou confusa depois de comer massa ou doce? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:8)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-108 | Você tem caspa ou coceira no couro cabeludo com frequência? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:9)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-109 | Você precisou tomar antibiótico ao longo da vida? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:10)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; item de histórico de exposição («ao longo da vida») em escala de frequência |
| SNT-110 | Você passa mal com pouca bebida alcoólica? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:11)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sinal próximo de SNT-406 (álcool), que pontua outro sistema (Detox) |
| SNT-111 | Você vive com nariz entupido ou sinusite? | Físico (Tríade Corpo) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:12)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-201 | Você sente dor nas articulações mesmo sem ter feito esforço? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:13)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-202 | Você acorda com o corpo travado que leva um tempo para soltar? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:14)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-203 | Você sente o corpo dolorido sem causa clara? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:15)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-204 | Você sente azia ou queimação no estômago? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:16)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-205 | Você tem dor de cabeça mais de uma vez por semana? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:17)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; tema «dor» coberto pelo texto oficial D13 do Ácido Inflamatório |
| SNT-206 | Sua pele tem crises de acne inflamada, eczema ou psoríase? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:18)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — enunciado nomeia diagnósticos dermatológicos («acne inflamada, eczema ou psoríase») num eixo cujo texto oficial diz «O eixo não diagnostica inflamação» (D13); leitura diagnóstica possível |
| SNT-207 | Sua gengiva sangra ao escovar? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:19)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-208 | Você percebe que piora quando come ultraprocessado ou açúcar? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:20)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; redação revisada no v3 («as dores no corpo ou de cabeça pioram…») |
| SNT-209 | Suas mãos ou dedos amanhecem inchados? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:21)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — a revisão pública do v2 negou o item com o motivo «sem relação causal direta com o Sistema Ácido Inflamatório» (`docs/v1/REVISAO-PERGUNTAS-V3.md`); removido no v3 (item 183), que não está publicado; no v2 em produção o vínculo continua |
| SNT-210 | Seus exames costumam mostrar PCR ou VHS acima do normal? | Físico (Tríade Corpo) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:22)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | D — CONFLITO COM DECISÃO ATUAL: pergunta sobre resultado de exame laboratorial (PCR/VHS) pontua o Ácido Inflamatório; decisão vigente: exames não entram em nenhum resultado (ver §7). Pendência PM-15 aberta |
| SNT-301 | Você fica com muito sono logo depois do almoço? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:23)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-303 | Você sente fome de novo pouco tempo depois de ter comido? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:25)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-304 | Você come depois do jantar mesmo sem fome real? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:26)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-305 | Sua gordura se concentra na barriga? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:27)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-306 | A pele do seu pescoço ou axila está mais escura e aveludada? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:28)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-307 | Você fica irritado ou trêmulo se atrasa uma refeição? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:29)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-308 | Você tem dificuldade de perder peso mesmo comendo pouco? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:30)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-309 | Seus exames costumam mostrar triglicerídeos altos ou HDL baixo? | Físico (Tríade Corpo) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:31)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | D — CONFLITO COM DECISÃO ATUAL: pergunta sobre resultado de exame laboratorial (triglicerídeos/HDL) pontua o Metabólico; decisão vigente: exames não entram em nenhum resultado (ver §7). Pendência PM-15 aberta. Nota: o texto oficial D13 do Metabólico cita «achados laboratoriais relatados no questionário» |
| SNT-401 | Você percebe inchaço nas pernas ou nos pés no fim do dia? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:33)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-402 | Seu rosto amanhece inchado? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:34)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-403 | Cheiros fortes te incomodam mais do que incomodam as outras pessoas? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:35)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-404 | Comida gordurosa te faz passar mal ou pesa muito? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:36)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-405 | Você passa um dia ou mais sem evacuar? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:37)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-406 | Uma taça já te dá ressaca no dia seguinte? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:38)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sinal próximo de SNT-110 (álcool), que pontua outro sistema (Fúngico) |
| SNT-407 | Você reage muito forte a medicamento ou a café? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:39)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-408 | Sua pele está opaca ou com olheiras marcadas? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:40)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-409 | Seu suor tem odor forte? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:41)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| SNT-410 | Você tem celulite acentuada? | Físico (Tríade Corpo) | Detox e Linfático | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:42)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; substituído no v3 por SNT-411 (não publicado) |
| SNT-501 | Você acorda cansado mesmo dormindo as horas necessárias? | Físico (Tríade Corpo) | Mental Emocional Espiritual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 6) | 1 | direta · frequência 0–3 | Decisão explícita do item: «"Você acorda cansado mesmo dormindo as horas necessárias?" Primário: **Sistema Mental Emocional Espiritual**, peso 1. Metabólico como `secondary_contextual`, sem contribuição» — `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md` (Decisão 6). Campo Justificativa: «Decisão metodológica V1 encerrada pela liderança do método» — `PACOTE-DECISAO-HUMANA-V1.md` (sem fundamento clínico escrito) | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | A — decisão nominal do vínculo deste item |
| SNT-502 | Você demora a dormir porque a cabeça não desliga? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:44)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sono: tema citado no texto oficial D13 do MEE; bloco Físico (Tríade Corpo) |
| SNT-503 | Você acorda de madrugada e custa a voltar a dormir? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:45)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; sono: tema citado no texto oficial D13 do MEE; bloco Físico (Tríade Corpo) |
| SNT-504 | Você se preocupa muito com coisas que ainda nem aconteceram? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:46)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo mental no bloco Físico (conta na Tríade Corpo) |
| SNT-505 | Você come para se acalmar quando fica ansioso ou triste? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 90 (Trava do Trauma Alimentar) (motor/bancos/sintomas.csv:47)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo emocional no bloco Físico (conta na Tríade Corpo) |
| SNT-506 | Você sente que está sempre em alerta esperando algo dar errado? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:48)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo mental no bloco Físico (conta na Tríade Corpo) |
| SNT-507 | Você consegue perceber quando está com fome e quando já está satisfeito? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | invertida · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 91 (Trava da Desconexão Corpo-Mente) (motor/bancos/sintomas.csv:49)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | C — conteúdo corporal/interoceptivo (perceber fome e saciedade, bloco Físico) pontua o MEE; o texto oficial do MEE (D13) lista «sono, alerta, foco, emoções, relação consigo e questões de sentido pessoal» e não cita sinais de fome/saciedade. Substituído no v3 por SNT-511 (não publicado) |
| SNT-508 | Você tem dificuldade de manter o foco em uma tarefa? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:50)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo mental no bloco Físico (conta na Tríade Corpo) |
| SNT-509 | Você perde a paciência com facilidade? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:51)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo emocional no bloco Físico (conta na Tríade Corpo) |
| SNT-510 | Você tem se afastado das pessoas? | Físico (Tríade Corpo) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:52)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; conteúdo relacional no bloco Físico (conta na Tríade Corpo) |
| EMO-101 | Você adia começar coisas mesmo sabendo que precisa fazer? | Mental/Emocional (Tríade Mente) | Fúngico | Metabólico — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Fúngico: estagnação e desordem) (motor/bancos/emocoes.csv:2)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | C — conteúdo comportamental (adiar tarefas) pontua um sistema de nome fisiológico (Fúngico); o texto oficial D13 do Fúngico cita «sinais digestivos, mucosas, pele e padrões de desejo alimentar» e não cita comportamento ou emoção; o vínculo vem do padrão emocional legado «estagnação e desordem» (rascunho) |
| EMO-102 | Você sente que sua vida está desorganizada e não consegue pôr ordem? | Mental/Emocional (Tríade Mente) | Fúngico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Fúngico: estagnação e desordem) (motor/bancos/emocoes.csv:3)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | C — conteúdo comportamental/emocional (vida desorganizada) pontua o Fúngico; mesma situação de EMO-101 (padrão legado «estagnação e desordem», não coberto pelo texto oficial D13) |
| EMO-103 | Você sente um peso para sair do lugar mesmo querendo mudar? | Mental/Emocional (Tríade Mente) | Fúngico | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Fúngico) (motor/bancos/emocoes.csv:4)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | C — conteúdo emocional («peso para sair do lugar») pontua o Fúngico; a associação pode sugerir ao leitor uma relação entre estado emocional e um eixo de nome fúngico; vínculo vem do padrão legado do Fúngico (rascunho). Já tem MEE como contextual (não pontua) |
| EMO-201 | Você se irrita com facilidade por coisas pequenas? | Mental/Emocional (Tríade Mente) | Ácido Inflamatório | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Ácido-Inflamatório: irritação e reatividade) (motor/bancos/emocoes.csv:5)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — conteúdo emocional (irritação) pontua o Ácido Inflamatório; o texto oficial D13 cita «reatividade» sem dizer se é emocional; vínculo vem do padrão legado «irritação e reatividade». Já tem MEE como contextual (não pontua) |
| EMO-202 | Sua raiva sobe rápido e demora a passar? | Mental/Emocional (Tríade Mente) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Ácido-Inflamatório) (motor/bancos/emocoes.csv:6)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — conteúdo emocional (raiva) pontua o Ácido Inflamatório; mesma situação de EMO-201 |
| EMO-203 | Você costuma aceitar o que não quer para evitar conflito? | Mental/Emocional (Tríade Mente) | Ácido Inflamatório | Detox e Linfático — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (impacto espiritual: bloqueio no plexo solar) (motor/bancos/emocoes.csv:7)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — conteúdo emocional/relacional pontua o Ácido Inflamatório; a proveniência registrada é «impacto espiritual: bloqueio no plexo solar», expressão que a Decisão 13 retirou do conteúdo oficial como termo causal («"bloqueio no plexo solar" … saem do conteúdo oficial»); a associação continua |
| EMO-204 | Você engole o que gostaria de dizer para não criar problema? | Mental/Emocional (Tríade Mente) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (impacto espiritual: bloqueio no plexo solar) (motor/bancos/emocoes.csv:8)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — conteúdo emocional/relacional pontua o Ácido Inflamatório; proveniência «impacto espiritual: bloqueio no plexo solar» (termo retirado do conteúdo oficial pela Decisão 13); a associação continua |
| EMO-301 | Você sente um vazio que a comida parece tentar preencher? | Mental/Emocional (Tríade Mente) | Metabólico | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Metabólico: vazio e falta de propósito) (motor/bancos/emocoes.csv:9)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | C — conteúdo emocional (vazio) pontua o Metabólico; o texto oficial D13 do Metabólico cita «comportamento alimentar», mas não emoção; vínculo vem do padrão legado «vazio e falta de propósito». Já tem MEE como contextual (não pontua) |
| EMO-302 | Você passa os dias no piloto automático sem perceber o que está fazendo? | Mental/Emocional (Tríade Mente) | Metabólico | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 56 (Propósito de Vida e Nutrição) (motor/bancos/emocoes.csv:10)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | C — conteúdo de atenção/comportamento (piloto automático) pontua o Metabólico; no v2 o enunciado não menciona alimentação (o v3 acrescenta «em relação à alimentação»); MEE como contextual (não pontua) |
| EMO-303 | Você usa comida como recompensa depois de um dia difícil? | Mental/Emocional (Tríade Mente) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/emocoes.csv:11)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | C — comportamento alimentar emocional (comida como recompensa) do bloco Mente pontua o Metabólico; o texto oficial D13 do Metabólico inclui «comportamento alimentar», o que dá cobertura temática, mas não há justificativa do item |
| EMO-401 | Você se pega remoendo uma mágoa antiga? | Mental/Emocional (Tríade Mente) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Detox: acúmulo de mágoas) (motor/bancos/emocoes.csv:12)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | C — conteúdo emocional (mágoa) pontua o Detox e Linfático; texto oficial D13 do Detox cita «inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias»; vínculo vem do padrão legado «acúmulo de mágoas» (rascunho); pode sugerir leitura causal emoção→eliminação |
| EMO-402 | Você costuma guardar o que sente em vez de falar? | Mental/Emocional (Tríade Mente) | Detox e Linfático | Mental Emocional Espiritual — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Detox: emoções não processadas) (motor/bancos/emocoes.csv:13)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | C — conteúdo emocional (guardar o que sente) pontua o Detox e Linfático; padrão legado «emoções não processadas»; texto oficial D13 não cobre o tema. MEE como contextual (não pontua) |
| EMO-403 | Você tem dificuldade de aceitar ajuda ou cuidado das pessoas? | Mental/Emocional (Tríade Mente) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Detox) (motor/bancos/emocoes.csv:14)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | C — conteúdo relacional (aceitar ajuda) pontua o Detox e Linfático; texto oficial D13 não cobre o tema |
| EMO-501 | Você fala consigo mesmo de um jeito que não falaria com um amigo? | Mental/Emocional (Tríade Mente) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 92 (Reparentalização Nutricional) (motor/bancos/emocoes.csv:15)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| EMO-502 | Quando você sai da linha um dia você sente que perdeu tudo e abandona? | Mental/Emocional (Tríade Mente) | Mental Emocional Espiritual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 89 (Trava da Perfeição) (motor/bancos/emocoes.csv:16)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| EMO-503 | Você se descreve com frases como sempre fui assim ou não tenho força de vontade? | Mental/Emocional (Tríade Mente) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 89 (Trava da Identidade Limitante) (motor/bancos/emocoes.csv:17)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| EMO-504 | Você sente culpa ou vergonha depois de comer? | Mental/Emocional (Tríade Mente) | Mental Emocional Espiritual | Metabólico — `secondary_contextual`, sem pontuação (Decisão 4) | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 90 (Trava do Trauma Alimentar) (motor/bancos/emocoes.csv:18)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| EMO-505 | Você sente que seu corpo trabalha contra você? | Mental/Emocional (Tríade Mente) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 91 (Trava da Desconexão Corpo-Mente) (motor/bancos/emocoes.csv:19)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| EMO-507 | Você olha para sua vida hoje e se reconhece nela? | Mental/Emocional (Tríade Mente) | Mental Emocional Espiritual | — | 1 | invertida · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Mental-Emocional: desconexão de si) (motor/bancos/emocoes.csv:20)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-101 | Você sente que sua vida tem uma direção clara? | Espiritual (Tríade Espírito) | Metabólico | — | 1 | invertida · intensidade 0–3 | não documentada (item a item). Prov.: «livro p. 56 (Propósito de Vida e Nutrição) (motor/bancos/espiritual.csv:2)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | C — conteúdo de propósito (direção de vida, invertida) pontua o Metabólico; proveniência «Propósito de Vida e Nutrição» não menciona o sistema; texto oficial D13 não cobre o tema |
| ESP-102 | Você sabe dizer o que veio fazer nesta vida? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | invertida · intensidade 0–3 | não documentada (item a item). Prov.: «livro p. 57 (Reconexão com o Propósito) (motor/bancos/espiritual.csv:3)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item; removido no v3 (revisão: «muito ampla, ambígua para interpretação»); a negação é de redação, não de vínculo |
| ESP-103 | Sua rotina de hoje te afasta do que você quer para a sua vida? | Espiritual (Tríade Espírito) | Metabólico | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «livro p. 57 (Avaliação de Alinhamento) (motor/bancos/espiritual.csv:4)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | C — conteúdo de propósito/rotina pontua o Metabólico; proveniência «Avaliação de Alinhamento» não menciona o sistema; texto oficial D13 não cobre o tema |
| ESP-201 | Suas escolhas alimentares combinam com aquilo que você diz valorizar? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | invertida · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 54 (A Nutrição como Expressão de Propósito e Valores) (motor/bancos/espiritual.csv:5)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-202 | Você tem clareza sobre o que é inegociável para você? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | invertida · intensidade 0–3 | não documentada (item a item). Prov.: «livro p. 57 (Clarificação de Valores) (motor/bancos/espiritual.csv:6)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-203 | Você abre mão do que é inegociável para você só para agradar alguém? | Espiritual (Tríade Espírito) | Ácido Inflamatório | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 46 (princípios inegociáveis) (motor/bancos/espiritual.csv:7)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — conteúdo de valores/relacional (abrir mão do inegociável) pontua o Ácido Inflamatório; a proveniência registrada («princípios inegociáveis») não menciona o sistema; texto oficial D13 não cobre o tema |
| ESP-301 | Você sente que existe algo maior te sustentando? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | invertida · intensidade 0–3 | não documentada (item a item). Prov.: «livro p. 38 (O Pilar Espiritual) (motor/bancos/espiritual.csv:8)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-302 | Você reserva um momento do dia para agradecer alguma coisa? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | invertida · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 60 (Gratidão Consciente) (motor/bancos/espiritual.csv:9)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-303 | Você começa a comer sem fazer nenhuma pausa antes? | Espiritual (Tríade Espírito) | Metabólico | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 62 (Pausa Consciente) (motor/bancos/espiritual.csv:10)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Carta | C — comportamento alimentar (pausa antes de comer) do bloco Espírito pontua o Metabólico; o texto oficial D13 inclui «comportamento alimentar» (cobertura temática), mas não há justificativa do item; proveniência «Pausa Consciente» |
| ESP-401 | Você sente que não merece as coisas boas que conquista? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 86 (Investigação de Crenças Limitantes) (motor/bancos/espiritual.csv:11)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-402 | Quando as coisas começam a dar certo você acaba boicotando? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 89 (travas mentais e emocionais) (motor/bancos/espiritual.csv:12)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-403 | Você repete sobre si mesmo histórias que ouviu na família e nunca questionou? | Espiritual (Tríade Espírito) | Mental Emocional Espiritual | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 91 (Biografia Consciente) (motor/bancos/espiritual.csv:13)» | — | PQQ › Crenças › Gatilhos › Mapa do Propósito › Carta › Conexão | B — vínculo vigente (aprovado em bloco pelas Decisões 4 e 7), sem justificativa escrita para este item |
| ESP-404 | Você acredita que para ter saúde precisa sofrer ou se privar? | Espiritual (Tríade Espírito) | Ácido Inflamatório | — | 1 | direta · intensidade 0–3 | não documentada (item a item). Prov.: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/espiritual.csv:14)» | — | Rotina › Momentum › Gatilhos › Roda › Conexão › OQ³ | C — crença («para ter saúde precisa sofrer») pontua o Ácido Inflamatório; redação + eixo podem sugerir causalidade; a revisão pública negou o item «por estar no Sistema Ácido Inflamatório» e a decisão de 12/10 (DECISOES-V1 item 183) o move para o MEE no v3 (não publicado); no v2 o vínculo continua |
| ESP-405 | Você carrega o peso de não ter conseguido perdoar alguém? | Espiritual (Tríade Espírito) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «material 11/08 (padrão do Detox: acúmulo de mágoas) (motor/bancos/espiritual.csv:15)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | C — conteúdo espiritual/relacional (perdão) pontua o Detox e Linfático; padrão legado «acúmulo de mágoas»; texto oficial D13 não cobre o tema; pode sugerir leitura causal |
| ESP-501 | Você passa algum tempo em contato com a natureza? | Espiritual (Tríade Espírito) | Fúngico | — | 1 | invertida · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 39 (alimentação como ato sagrado) (motor/bancos/espiritual.csv:16)» | — | Rotina › Gatilhos › Crenças › Momentum › OQ³ › Conexão | C — hábito ambiental/espiritual (contato com a natureza, invertida) pontua o Fúngico; a proveniência registrada («alimentação como ato sagrado») não menciona o Fúngico; o texto oficial D13 do Fúngico não cobre o tema; a associação pode sugerir causalidade («pouco contato com a natureza» elevando um eixo fúngico) |
| ESP-502 | Você faz suas refeições sozinho e com pressa? | Espiritual (Tríade Espírito) | Detox e Linfático | — | 1 | direta · frequência 0–3 | não documentada (item a item). Prov.: «livro p. 63 (Comunhão Consciente) (motor/bancos/espiritual.csv:17)» | — | Rotina › Momentum › OQ³ › Roda › Conexão › Gatilhos | C — contexto social/comportamental da refeição (sozinho e com pressa) pontua o Detox e Linfático; proveniência «Comunhão Consciente» não menciona o sistema; texto oficial D13 não cobre o tema |

## 6. Destaques

### 6.1 (a) Perguntas emocionais, espirituais ou comportamentais em sistemas físicos

São 21 itens dos blocos Mental/Emocional e Espiritual cujo **único** sistema que pontua é físico. Todos estão como **C**. Nenhum tem justificativa escrita item a item; a proveniência de vários aponta para os "padrões emocionais" legados dos sistemas, que o inventário classifica como rascunho (a linha de `motor/bancos/sistemas.csv`, que traz `padrao_emocional` e `impacto_espiritual`, registra "`status_definicao=rascunho` ("aguarda revisão")" — `docs/v1/metodologia/INVENTARIO-FONTES.md`) e que a Decisão 13 tirou do texto oficial ("legado recuperado so em legacy (nao exibido)", nota do sistema no pacote).

| Sistema físico | Itens (bloco) | O texto oficial D13 do sistema cobre o tema? |
|---|---|---|
| Fúngico | EMO-101, EMO-102, EMO-103 (Mente); ESP-501 (Espírito) | Não: cita "sinais digestivos, mucosas, pele e padrões de desejo alimentar" |
| Ácido Inflamatório | EMO-201, EMO-202, EMO-203, EMO-204 (Mente); ESP-203, ESP-404 (Espírito) | Parcial/ambíguo: cita "reatividade", sem dizer se é emocional |
| Metabólico | EMO-301, EMO-302, EMO-303 (Mente); ESP-101, ESP-103, ESP-303 (Espírito) | Só para EMO-303 e ESP-303 ("comportamento alimentar"); não para vazio, piloto automático, direção de vida e rotina × vida desejada |
| Detox e Linfático | EMO-401, EMO-402, EMO-403 (Mente); ESP-405, ESP-502 (Espírito) | Não: cita "inchaço, hábito intestinal, pele e sensibilidade relatada a substâncias" |

Efeito prático, sem juízo de mérito: como cada pergunta tem **um** primário pontuável e as secundárias não pontuam (Decisão 4), a resposta a esses itens soma **só** no sistema físico, nunca no MEE. Cinco deles têm o MEE como `secondary_contextual` (EMO-103, EMO-201, EMO-301, EMO-302, EMO-402) e EMO-203 tem o Detox e Linfático como contextual; isso **não** muda a nota desses sistemas.

Os textos de definição aprovados no motor de resultados (MR-V1) já descrevem os eixos de forma mais ampla — por exemplo Fúngico: "Categoria autoral que organiza determinados relatos digestivos, alimentares, sensoriais, de hábitos e vitalidade previstos pelo HOLOSCAN." (`sistemas-fechamento.js`) — mas também não explicam por que cada item está no eixo.

### 6.2 (b) Perguntas de conteúdo corporal no MEE

O MEE recebe 10 perguntas do bloco Físico (SNT-501 a SNT-510), que contam na **Tríade Corpo** e pontuam o **MEE**:

| Item | Conteúdo | Status | Observação |
|---|---|---|---|
| SNT-501 | acordar cansado | **A** | decidido nominalmente (Decisão 6); "SNT-501 fica no eixo físico" da Tríade (Decisão 11) |
| SNT-502, SNT-503 | sono | B | "sono" está no texto oficial D13 do MEE |
| SNT-507 | perceber fome e saciedade (invertida) | **C** | sinal corporal/interoceptivo que o texto D13 do MEE não cita; substituído no v3 por SNT-511 (não publicado) |
| SNT-504, 505, 506, 508, 509, 510 | preocupação, comer para se acalmar, alerta, foco, paciência, afastamento | B | conteúdo mental/emocional/relacional, coerente com o MEE, mas **no bloco Físico**: conta na Tríade Corpo (Decisão 11: eixo "pelo **bloco** da pergunta") |

Ponto para o metodologista (não é status): pela regra da Tríade, 6 itens de conteúdo mental/emocional entram no eixo Corpo, e 21 itens de conteúdo emocional/espiritual (6.1) entram nos eixos Mente/Espírito mas pontuam sistemas físicos.

### 6.3 (c) Itens que podem induzir leitura causal ou diagnóstica

Sinalização neutra; nenhum destes enunciados afirma causa, mas o par **enunciado + nome do eixo** pode ser lido assim por quem vê o resultado:

- **EMO-103** "Você sente um peso para sair do lugar mesmo querendo mudar?" → Fúngico: estado emocional pontuando um eixo de nome fúngico.
- **ESP-501** "Você passa algum tempo em contato com a natureza?" (invertida) → Fúngico: quem responde "Nunca" soma 3 pontos no Fúngico; a proveniência ("livro p. 39 (alimentação como ato sagrado)") não menciona o Fúngico.
- **ESP-404** "Você acredita que para ter saúde precisa sofrer ou se privar?" → Ácido Inflamatório: crença pontuando um eixo de nome inflamatório.
- **EMO-203, EMO-204** → Ácido Inflamatório: proveniência "impacto espiritual: bloqueio no plexo solar"; a Decisão 13 diz que "\"Impacto espiritual\" causal, \"bloqueio no plexo solar\", \"queda de frequência\", \"dessintonização\" e equivalentes saem do conteúdo oficial" (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`). O termo saiu do texto; o vínculo que nasceu dele ficou.
- **EMO-401, ESP-405** → Detox e Linfático: mágoa e perdão num eixo de "eliminação" (proveniência "padrão do Detox: acúmulo de mágoas").
- **SNT-104** (candidíase), **SNT-105** (micose), **SNT-206** (acne inflamada, eczema, psoríase): o enunciado nomeia condições que o texto oficial do próprio eixo diz não diagnosticar.
- **SNT-208** "Você percebe que piora quando come ultraprocessado ou açúcar?" pede ao paciente uma relação causal percebida; ficou como B (é o relato do paciente, e o v3 já revisou a redação).

### 6.4 (d) Os exemplos do teste real

**Fúngico**

| Item | Fatos |
|---|---|
| EMO-103 "Você sente um peso para sair do lugar mesmo querendo mudar?" | bloco Mental/Emocional (Tríade Mente); primário **Fúngico**, peso 1, direta, frequência; contextual MEE (Decisão 4, sem pontuação); peso legado 2 (`emocoes.csv:4`); Prov.: «material 11/08 (padrão do Fúngico) (motor/bancos/emocoes.csv:4)»; justificativa item a item: **não documentada**; mantido igual no v3 (`HOLOSCAN-PERGUNTAS-V3.md`, nº 14). **C** |
| ESP-501 "Você passa algum tempo em contato com a natureza?" | bloco Espiritual (Tríade Espírito); primário **Fúngico**, peso 1, **invertida** (z = 3 − resposta; Decisão 3), frequência; peso legado 2 (`espiritual.csv:16`); Prov.: «livro p. 39 (alimentação como ato sagrado) (motor/bancos/espiritual.csv:16)»; justificativa: **não documentada**; mantido igual no v3 (nº 15). **C** |
| SNT-104 "Você tem candidíase ou sapinho com frequência?" | bloco Físico (Tríade Corpo); primário **Fúngico**, peso 1, direta, frequência, contexto `ultimos_3_meses`; peso legado 3 (`sintomas.csv:5`); Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:5)»; justificativa: **não documentada**; no v3 só muda o texto ("Você tem candidíase com frequência (íntima ou na boca, o "sapinho")?"). Tensão registrada: o texto oficial do Fúngico diz "Não diagnostica candidíase" e `sistemas-fechamento.js` lista "candid" entre os termos que nunca aparecem no fechamento do Fúngico; mas o enunciado é exibido literalmente como sinal dominante (seção 7.5). O teste de linguagem proibida (`testes/testar-sistemas-fechamento.mjs`) usa enunciados fictícios ("Enunciado aprovado fungico 1"), por isso não cobre esse caso. Conferido nesta auditoria com um snapshot sintético: com SNT-104 entre os dominantes, a palavra "candidíase" aparece nas visões profissional e da paciente. **C** |

**Ácido Inflamatório**

| Item | Fatos |
|---|---|
| ESP-404 "Você acredita que para ter saúde precisa sofrer ou se privar?" | bloco Espiritual (Tríade Espírito); primário **Ácido Inflamatório**, peso 1, direta, **intensidade**; peso legado 2 (`espiritual.csv:14`); Prov.: «livro p. 90 (Trava da Resistência ao Prazer) (motor/bancos/espiritual.csv:14)»; justificativa: **não documentada**. Já contestado por escrito: "negada na revisão por estar no Sistema Ácido Inflamatório; mantida, por decisão de 12/10, no **Sistema Mental Emocional Espiritual** (mesmo texto, peso 1, Tríade Espírito)" — `docs/v1/REVISAO-PERGUNTAS-V3.md`; DECISOES-V1 item 183. Vale para o v3, **não publicado**: no v2 em produção o item continua pontuando o Ácido Inflamatório. **C** |
| SNT-205 "Você tem dor de cabeça mais de uma vez por semana?" | bloco Físico; primário **Ácido Inflamatório**, peso 1, direta, frequência, `ultimos_30_dias`; peso legado 2 (`sintomas.csv:17`); Prov.: «rascunho-literatura-funcional (motor/bancos/sintomas.csv:17)»; justificativa: **não documentada**; o tema "dor" está no texto oficial D13 do eixo; mantido igual no v3 (nº 20). **B** |
| SNT-210 "Seus exames costumam mostrar PCR ou VHS acima do normal?" | **D** — ver seção 7 |

## 7. SNT-210 e SNT-309 — D: CONFLITO COM DECISÃO ATUAL

**Não foram removidos nem alterados.** Esta seção só documenta.

### 7.1 Ficha dos dois itens (HOLOS-V1 v2)

| | SNT-210 | SNT-309 |
|---|---|---|
| Texto | "Seus exames costumam mostrar PCR ou VHS acima do normal?" | "Seus exames costumam mostrar triglicerídeos altos ou HDL baixo?" |
| Bloco / Tríade | Físico / Corpo (peso 1) | Físico / Corpo (peso 1) |
| Sistema que pontua | **Ácido Inflamatório** (`primaria`, peso 1) | **Metabólico** (`primaria`, peso 1) |
| Associação contextual | nenhuma | nenhuma |
| Orientação / escala | direta / frequência 0–3 (Nunca, Às vezes, Frequente, Sempre) | direta / frequência 0–3 |
| Contexto temporal | `sem_periodo_especifico` (Decisão 1) | `sem_periodo_especifico` |
| Peso legado (fora do cálculo) | 3 (`motor/bancos/sintomas.csv:22`) | 3 (`motor/bancos/sintomas.csv:31`) |
| Prov. | «rascunho-literatura-funcional (motor/bancos/sintomas.csv:22)» | «rascunho-literatura-funcional (motor/bancos/sintomas.csv:31)» |
| Justificativa item a item | não documentada | não documentada (o texto D13 do Metabólico cita "achados laboratoriais relatados no questionário") |
| Itens primários do sistema | 16 | 14 |

### 7.2 Onde está escrita a decisão atual

- "o sistema **não lê, interpreta, estrutura, classifica, compara, pontua nem cruza exames**" — `docs/v1/DECISOES-V1.md`, item 175 (09/10, "Prontuário: exames e documentos são só arquivos"); o mesmo em `docs/v1/PRONTUARIO-DOCUMENTOS.md`.
- "Sem IA, sem exames, sem interpretação automática" — `docs/v1/DECISOES-V1.md`, item 173 (Resultado HOLOS).
- "Exames, Leitura Integrada, REC-001…023/SEL-001, Conduta, HOLOS AI, Resultado/PDF/WhatsApp da paciente e HOLOS-V1@2 ficam **fora**" — `docs/v1/DECISOES-V1.md`, item 176 (Próximos Passos).
- "**Continuam fora de qualquer resultado:** os exames e a Leitura Integrada." — `docs/v1/RESULTADO-FINAL-DECISOES-APROVADAS.md` (item 180).
- "Exames são só arquivos do prontuário. Não entram em nenhum resultado." — `docs/v1/RESULTADO-FINAL-HOLOS.md`.
- "**SNT-210:** "Seus exames costumam mostrar PCR ou VHS acima do normal?" Pergunta sobre exame laboratorial. A decisão atual é que exames não impactam o Resultado HOLOS." / "**SNT-309:** (…) Mesmo ponto." — `docs/v1/IMPLEMENTACAO-MAPEAMENTO-HOLISTICO-ENXUTO-V1.md`, seção R.
- Pendência aberta: "PM-15 | **SNT-210 e SNT-309** ("Seus exames costumam mostrar…"): pendência do pacote HOLOSCAN, não resolvida. Exames continuam fora" — `docs/v1/IMPLEMENTACAO-MOTOR-RESULTADOS-HOLOHACKING-V1.md`, seção Q; o mesmo texto está em `resultado-sintese.js` (lista de pendências, PM-15) e é exibido só na visão profissional.

Por que é conflito: as decisões acima retiram **exames** de qualquer resultado, mas os dois itens fazem o paciente relatar o resultado de um exame, e esse relato **pontua** um sistema (logo, a nota, a faixa, o Índice, a Tríade, a ordem de "Por onde investigar" e os Próximos Passos). Há também uma tensão documental: a Decisão 13 (01/10, anterior à 175) aprovou para o Metabólico o texto "achados laboratoriais relatados no questionário".

### 7.3 Quanto podem influenciar

Fórmulas usadas (as do próprio sistema):

- Contribuição de um item ao sistema — SQL `public.resultado_holos_dominantes` (`supabase/MOTOR-RESULTADOS-PARTE1.sql`): `a.weight * (case when q.orientation = 'invertida' then sc2.max_value - ans.valor else ans.valor - sc2.min_value end)`. Para os dois itens (peso 1, direta, escala 0–3): **contribuição = resposta**, de 0 a **3**.
- Nota do sistema — `metodologia-motor.js`, `notaDe`: "Nota normalizada 0..10 pelos respondidos: 10 − 10·A/D", com A = Σ contribuições e D = Σ (peso × 3) **dos itens primários respondidos** (Decisão 8: "Nota pelos respondidos: A = Σz, D = Σ3, carga = 10·A/D, **nota = 10 − carga**").
- Logo, com *n* itens primários respondidos no sistema, a diferença entre responder 0 e 3 num destes itens é **Δnota = 10 × 3 / (3n) = 10/n**, e a fatia do item no máximo do sistema é **3 / (3n) = 1/n**.
- Índice: "Índice = 10 × Σ(nota × 0,20)" (Decisão 10) → **ΔÍndice = 2 × Δnota** (escala 0–100).
- Tríade Corpo: mesma fórmula sobre os itens do bloco Físico → **ΔCorpo = 10/n_corpo**.

| | SNT-210 → Ácido Inflamatório | SNT-309 → Metabólico |
|---|---|---|
| Contribuição máxima do item | 3 | 3 |
| Máximo do sistema com todos respondidos | 16 × 3 = 48 | 14 × 3 = 42 |
| Fatia do item (todos respondidos) | 3/48 = **6,25%** | 3/42 = **7,14%** |
| Fatia do item (cobertura mínima: 13/16 e 12/14) | 3/39 = **7,69%** | 3/36 = **8,33%** |
| Δ máximo na nota 0–10 (todos respondidos) | **0,625** | **0,714** |
| Δ máximo na nota 0–10 (cobertura mínima) | **0,769** | **0,833** |
| Δ máximo no Índice 0–100 (todos / mínimo) | 1,25 / 1,54 | 1,43 / 1,67 |
| Δ máximo na Tríade Corpo (49 respondidos / 40, o mínimo) | 0,204 / 0,25 | 0,204 / 0,25 |
| Os dois juntos | Índice até 2,68 pontos (todos respondidos); Tríade Corpo até 0,41 | |

Conferência com o motor real (`MotorMetodologico.calcular`, vetores sintéticos):

| Cenário | Ácido Inflamatório (item = 0 → 3) | Metabólico (item = 0 → 3) | Índice |
|---|---|---|---|
| todos os outros z = 0 | 10,0 → 9,4 (exato 9,375) | 10,0 → 9,3 (exato 9,286) | 100,0 → 98,8 / 98,6 |
| todos os outros z = 1 | 6,9 **alta** → 6,3 **intermediária** | 6,9 **alta** → 6,2 **intermediária** | 67,1 → 65,8 / 65,7 |
| cobertura mínima, outros z = 0 | 10,0 → 9,2 (13 respondidos) | 10,0 → 9,2 (12 respondidos) | — |

Consequências possíveis de uma única resposta a estes itens: **mudar a faixa** do sistema (os limites são 10/3 e 20/3; no 2º cenário a faixa cai de alta para intermediária); **mudar a ordem de "Por onde investigar"** (menor nota = 1ª área), e com ela a "1ª/2ª área para aprofundar" e a seleção do PP-V1 (que usa os dois primeiros sistemas); mudar o Índice e a Tríade Corpo.

### 7.4 Cobertura, Índice e Tríade

- **Cobertura por sistema (80%)**: os dois contam no denominador e no numerador. "Cobertura por sistema = válidas dos itens primários / itens primários do sistema" (Decisão 8). Ácido Inflamatório avalia com 13/16; Metabólico com 12/14 (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`, seção 7). Simulação: deixar o item em branco dá cobertura 15/16 = 93,75% e 13/14 = 92,86%, e o sistema continua avaliável.
- **Cobertura global** (informativa): contam em "respostas numéricas válidas / 84".
- **Índice**: só existe com os cinco sistemas avaliáveis (Decisão 10); os itens entram pela nota dos sistemas.
- **Tríade**: os dois são do bloco Físico e entram na Tríade Corpo (49 itens; avalia com 40).
- **Não há "não se aplica" na tela**: o motor aceita os estados `recusado`/`nao_aplicavel` (`metodologia-motor.js`, contrato de entrada), mas `holoscan-oficial.js` chama o motor com `response_states: {}`, e a tela só permite as 4 respostas ou deixar em branco ("Desmarcar: clicar de novo na resposta marcada deixa a pergunta em branco." — `questionario.js`). Quem não tem exame precisa responder "Nunca" (conta 0, como ausência de carga) ou deixar em branco (reduz a cobertura).

### 7.5 Como aparecem no Resultado

Eles aparecem como **sinais dominantes**, com o **texto da pergunta**:

- Tela do HOLOSCAN: `holoscan-oficial.js` (`paraTela`) monta até 5 dominantes por sistema (contribuição > 0, maior primeiro, empate por `question_id`); `app.js` mostra até 3 em `#holo-dominantes`.
- Snapshot do Resultado HOLOS (template 4): `resultado_holos_dominantes` grava até 3 por sistema com `'enunciado', d.statement` ("os sinais dominantes reais de cada sistema (texto aprovado da pergunta)" — `supabase/MOTOR-RESULTADOS-PARTE1.sql`).
- Fechamento dos sistemas, bloco C "O que mais contribuiu para este resultado" (`sistemas-fechamento.js`): na visão **profissional** e na visão **da paciente** (com o aviso "Essa associação ajuda a orientar a investigação e não significa que um desses fatores cause os outros.").
- Cartões do PP-V1 (visão profissional): "Sinais deste sistema que merecem atenção" (`proximos-passos.js`); os dominantes ficam congelados no snapshot dos Próximos Passos.
- Relatório: bloco "Sinais dominantes" (`arquivos.js`); Síntese HOLOS (`resultado-sintese.js`).
- Conferido nesta auditoria: um snapshot sintético com SNT-210 entre os dominantes do Ácido Inflamatório produz "PCR" no HTML das visões profissional e da paciente.
- Desempate: em contribuições iguais vence o `question_id` menor. "SNT-210" e "SNT-309" são os últimos IDs dos seus sistemas na ordem alfabética (EMO-… < ESP-… < SNT-…), então, num empate em 3 pontos, eles só entram entre os 3 dominantes se menos de 3 outros itens do sistema tiverem 3 pontos.

### 7.6 O que seria afetado se fossem removidos ou substituídos (só mapeamento; nada foi feito)

| Dependência | Efeito |
|---|---|
| Pacote | Qualquer mudança é uma **versão nova** (hash novo). O v2 aprovado (`7af1dae6…`) não muda: "Qualquer mudança no pacote (pergunta, associação, faixa, regra, escala, sistema, edição, `code` ou `version`) **invalida** as aprovações vigentes daquela versão" (`PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`, seção 10). Hoje a publicação de versão nova é pela RPC `publicar_pacote_metodologico` (DECISOES-V1 item 187), que "confere o validador e calcula o hash do servidor, põe a versão nova no ar e retira a anterior". |
| Decisões em dado | `metodologia-decisoes-v1.js` lista os dois em `contexto_temporal` (`sem_periodo_especifico`) e `aplicarDecisoesV1` recusa divergência ("Divergência é erro"). O caminho do v3 foi um objeto de revisão separado (`metodologia-revisao-v3.js` + `PacoteMetodologico.aplicarRevisao`), sem editar as decisões V1. |
| Motor | O motor é genérico e lê tudo do pacote; não há ID fixo no cálculo. A regra `example` (REF-01/02/03) lista respostas para os 84 IDs e precisaria ser regenerada numa versão nova. |
| Cobertura / limites de 80% | Base v2: Ácido Inflamatório 16 → 15 (avaliaria com 12), Metabólico 14 → 13 (com 11), Tríade Corpo 49 → 47 (com 38), global 84 → 82. Base v3: Ácido Inflamatório 14 → 13 (com 11), Metabólico 14 → 13, Tríade Corpo 48 → 46 (com 37), global 82 → 80. |
| Comparabilidade | Delta só com "mesma `methodology_package_version` (…) e **mesmo conjunto de IDs pontuados**" (Decisão 12); entre versões, a Evolução mostra lado a lado, sem delta. |
| Aplicações, respostas e snapshots já salvos | Ficam como estão, no v2: "HOLOSCANs, Resultados HOLOS e emissões já salvos continuam no v2, congelados." (`docs/v1/REVISAO-PERGUNTAS-V3.md`). Isso inclui `holoscan_answers` com os dois IDs, as notas em `holoscan_system_scores`, os dominantes com o texto da pergunta nos snapshots do Resultado HOLOS e dos Próximos Passos, e as emissões imutáveis do Resultado Final (item 180). |
| PP-V1 | O catálogo (sistema → ferramenta) não cita perguntas e não muda. A **seleção** pode mudar, porque depende da ordem dos sistemas. Snapshots já registrados ficam congelados. |
| v3 | O v3 **não** resolveu os dois: estão iguais em `docs/v1/HOLOSCAN-PERGUNTAS-V3.md` (nº 24 SNT-210 no Ácido Inflamatório, nº 37 SNT-309 no Metabólico), e "**Pendências do v3 para revisão metodológica separada** (não alteradas): SNT-210 (PCR/VHS) e SNT-309 (triglicerídeos/HDL)" — `docs/v1/PUBLICACAO-DIRETA-HOLOSCAN.md`. Mudança neles afetaria também `docs/v1/metodologia/pacote-metodologico-v3.json` e `supabase/tests/pacote-v3-doc.sql`. |
| Mapeamento Holístico | Já não coleta exames: "Exames (PCR/VHS, triglicerídeos/HDL) \| SNT-210, SNT-309 \| **E** no Mapeamento \| nunca coletados" (`IMPLEMENTACAO-MAPEAMENTO-HOLISTICO-ENXUTO-V1.md`). |
| Legado (desligado) | `motor/bancos/sintomas.csv:22,31`; `motor/bancos/combinacoes.csv` CMB-013 ("marcador.SNT-210 >= 2") e CMB-014 ("marcador.SNT-309 >= 2 E marcador.SNT-306 >= 2"), não executadas (Decisão 15); `holoscan.js` (bundle legado); `Holos AI/motor/`; a matriz da Leitura Integrada (`docs/v1/laboratorio/MATRIZ-DECISAO-DOMINIOS-LI-HOLOSCAN-V1.md`), fora do fluxo (item 175). |
| Testes que citam os IDs | `testes/caso.json`, `testes/golden/rf1-fixture.json` (enunciados nos dominantes), `testes/testar-raciocinio.mjs` (condição legada `marcador.SNT-210 >= 2`), `testes/testar-resultado-sintese.mjs` (texto da PM-15), `supabase/tests/etapa4-2-pacotes.sql` (gerado), `supabase/tests/pacote-v3-doc.sql` (gerado). Testes que fixam contagens por sistema: `testes/testar-v1-etapa4-2-pacote-v1.mjs` (limites de 80% do v2), `testes/testar-pacote-v3.mjs` e `testes/testar-questionario-v3.mjs` ("Ácido Inflamatório sobre 14"). |

## 8. Contagens

### 8.1 Por status

| Status | Itens | Quais |
|---|---|---|
| A | 2 | SNT-101, SNT-501 |
| B | 54 | os demais |
| C | 26 | SNT-104, SNT-105, SNT-206, SNT-209, SNT-507; EMO-101, EMO-102, EMO-103, EMO-201, EMO-202, EMO-203, EMO-204, EMO-301, EMO-302, EMO-303, EMO-401, EMO-402, EMO-403; ESP-101, ESP-103, ESP-203, ESP-303, ESP-404, ESP-405, ESP-501, ESP-502 |
| D | 2 | SNT-210, SNT-309 |
| **Total** | **84** | |

### 8.2 Por sistema primário

| Sistema | Itens | A | B | C | D |
|---|---|---|---|---|---|
| Fúngico | 15 | 1 | 8 | 6 | 0 |
| Ácido Inflamatório | 16 | 0 | 7 | 8 | 1 |
| Metabólico | 14 | 0 | 7 | 6 | 1 |
| Detox e Linfático | 15 | 0 | 10 | 5 | 0 |
| Mental Emocional Espiritual | 24 | 1 | 22 | 1 | 0 |
| **Total** | **84** | **2** | **54** | **26** | **2** |

Leitura: 82 das 84 associações (todas menos SNT-101 e SNT-501) não têm justificativa escrita item a item; elas existem porque a Decisão 4 aprovou "um primário pontuável por pergunta" sobre o conjunto recuperado. Nos quatro sistemas físicos, 27 dos 60 itens estão em C ou D (25 C + 2 D); no MEE, 1 de 24.

## 9. Perguntas em aberto para o metodologista

1. **Fundamento das 82 associações sem decisão nominal.** A Decisão 4 aprovou a regra "um primário por pergunta" sobre o conjunto recuperado (Anexo A, "RECUPERADO / NÃO HOMOLOGADO"). Existe um fundamento escrito por item (material 11/08, páginas do livro) que deva ser registrado como justificativa, ou o vínculo é autoral e assim deve constar?
2. **Itens emocionais/espirituais em sistemas físicos (21).** A intenção do método é que esses itens pontuem só o sistema físico (como hoje) e nunca o MEE? O fato de vários terem o MEE como contextual, sem pontuar, é intencional?
3. **EMO-203 e EMO-204.** O vínculo com o Ácido Inflamatório nasceu do "impacto espiritual: bloqueio no plexo solar", que a Decisão 13 tirou do conteúdo oficial. O vínculo continua válido sem esse fundamento?
4. **ESP-501 (natureza → Fúngico, invertida).** Qual é o racional do vínculo? A proveniência registrada ("alimentação como ato sagrado") não cita o Fúngico.
5. **ESP-404, SNT-209 (e ESP-102).** A decisão de 12/10 já os move/remove no v3. Enquanto o v3 não for publicado, o v2 continua pontuando ESP-404 no Ácido Inflamatório e SNT-209 também. Isso é aceito até a troca de versão, ou deve ser tratado como conflito com decisão atual?
6. **Enunciados com nome de condição (SNT-104, SNT-105, SNT-206).** Como conciliar o enunciado com o texto oficial "não diagnostica …" e com a lista de termos proibidos do Fúngico ("candid"), dado que o enunciado aparece literal como sinal dominante para a paciente?
7. **SNT-507** (fome/saciedade, invertida) pontuando o MEE: confirmar o racional (o v3 troca por SNT-511).
8. **Tríade por bloco.** Seis itens de conteúdo mental/emocional (SNT-504, 505, 506, 508, 509, 510) entram na Tríade Corpo; isso é intencional?
9. **Sinais parecidos em sistemas diferentes**: SNT-110 (Fúngico) e SNT-406 (Detox e Linfático), ambos sobre tolerância a pouca bebida alcoólica. É intencional que o mesmo tipo de sinal pontue dois eixos?
10. **SNT-210 e SNT-309 (PM-15).** Com a decisão "exames não entram em nenhum resultado", estes relatos de exame devem continuar pontuando? Se não, qual tratamento (texto, contexto contextual sem pontuação, remoção), em que versão, e o que fazer com o texto D13 do Metabólico ("achados laboratoriais relatados no questionário")? Enquanto isso, os dois podem mover a nota em até 0,63–0,83 ponto, mudar faixa, ordem de prioridade e Próximos Passos.
11. **"Não se aplica"** para itens que dependem de ter feito exame: a tela não oferece o estado, embora o motor o aceite. É desejado?
12. **Tema por pergunta (PP-V2).** Nenhum tema está aprovado; a tabela do PP-V2 segue "a definir". Esta auditoria não sugere temas.

## 10. Reprodução

```sh
node scripts/pacote-candidato-v1.mjs --check      # "pacote candidato em dia"
```

No Node (ESM), na raiz do repositório:

```js
import { readFileSync } from 'node:fs';
await import('./metodologia-pacote.js'); await import('./metodologia-motor.js'); await import('./metodologia-decisoes-v1.js');
const P = globalThis.PacoteMetodologico, D = globalThis.MetodologiaDecisoesV1;
const inv = JSON.parse(readFileSync('docs/v1/metodologia/inventario-metodologico-v1.json', 'utf8'));
const v2 = P.aplicarDecisoesV1(P.importarInventario(inv, 'HOLOS-V1', 1), D);
// v2.version === 2; v2.perguntas.length === 84; v2.content_hash === '3593d782…' (hash JS)
// v2.associacoes.filter(a => a.role === 'primaria') → sistema e peso de cada pergunta
```

Catálogo PP-V1: `import { REGRAS } from './testes/proximos-passos-catalogo-v1.mjs'` (30 regras, 6 por sistema).
