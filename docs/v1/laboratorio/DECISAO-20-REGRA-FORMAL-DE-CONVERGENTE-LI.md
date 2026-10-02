# DECISÃO 20 — REGRA FORMAL DE CONVERGENTE

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 20 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 01–04, 06, 07, 09, 11–19 e do valor do bloco 5.

> **ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS — Etapa 5.9 (arquitetura) e 5.12 (mapeamento), Daniel, 02/10/2026.** Tabela domínio → sistema, regra de direção HOLOSCAN (20/21-A) e papéis `cross_source_role` (20/21-B) registrados em `DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md`. O estado final CONVERGENTE **ainda depende dos Blocos 16, 17 e 19**; o motor LI não está completo. **Ainda não é**: implementação, migration, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy.

## Pergunta (como no pacote)

**Definição formal de "HOLOSCAN alterado" para um domínio e a condição de convergência; e se "laboratório não alterado ∧ HOLOSCAN não alterado" também é convergente (como no legado) ou um estado próprio.**

## Estado atual

Regra `convergence` (`payload.holoscan_max_nota` ou `payload.holoscan_faixa`, por domínio ligado a `holoscan_system`): **0 linhas**. Motor: `convergente` quando `labAlterado == holoAlterado` (**inclui** "ambos não alterados"); sem regra → `sem_regra_homologada`; sistema sem nota → `holoscan_nao_avaliavel`. Os 7 domínios (DECISÃO 01) **não** têm `holoscan_system`: um domínio pode relacionar-se a 0, 1 ou N sistemas, só por regra homologada. Notas/faixas vêm do HOLOS-V1@2 (`em_revisao`; compatibilidade de versão declarada pelo pacote LI — DECISÃO 03).

## Invariantes já decididos que valem aqui

- Um exame fora da referência **não basta** automaticamente para convergência (Mestre; DECISÕES 02, 19).
- Divergência **não invalida** o HOLOSCAN nem o exame.
- Ausência de uma fonte (aplicação não avaliável, coleta inelegível, sem referência, fora da janela, suficiência não atingida, misto sem regra) → `sem_dados_suficientes`, **nunca** divergente.
- A relação domínio LI → sistema(s) HOLOSCAN só existe por **regra explicitamente homologada** (DECISÃO 01, regra 3); nenhuma relação é inferida pelo nome.
- Direção `above/below/any` do vínculo (DECISÃO 02) indica só o lado da referência que pode participar; não é gravidade nem estado.

## Levantamento (sem decidir)

| Tema | Opções | Consequência |
|---|---|---|
| **qual entrada HOLOSCAN participa** | nota do sistema; faixa do sistema; Índice HOLOS; Tríada; combinação | nota/faixa exigem a tabela domínio → sistema(s); Índice/Tríada são globais e não por domínio |
| **qual direção do HOLOSCAN é usada** | "alterado" = nota ≤ X (escala do pacote aprovado); faixa específica; qualquer faixa não "boa" | X depende da escala/faixas do HOLOS-V1@2; nenhum valor sugerido (o `≤ 3` legado era de outra escala e não é transportável) |
| **quais dados laboratoriais participam** | só resultados elegíveis + classificáveis + dentro da janela + com suficiência (blocos 4, 5, 9, 16–18) | tudo o mais já é `sem_dados_suficientes` antes de chegar aqui |
| **como below/within/above entram** | "fora" só na direção do vínculo (`above`/`below`) ou qualquer lado (`any`); `within` = não alterado | direção contrária à do vínculo conta como "dentro" para o domínio ou vira estado próprio (bloco 19) |
| **direção dos vínculos (Bloco 2)** | filtro do que conta como "laboratório alterado" | já registrado por exame; não é gravidade |
| **resultado misto** | regra `mixed` do domínio (bloco 19) decide "laboratório alterado"; sem regra → `sem_dados_suficientes` | convergência só é calculada depois de resolvida a mistura |
| **insuficiência precede** | suficiência (16–18) e temporalidade (5) avaliadas **antes** | nenhuma convergência sem suficiência |
| **relação domínio → sistema(s)** | (i) tabela própria (`domain_id`, `holoscan_system`, `role`, `status`, versão) — **não existe hoje** (extensão de schema); (ii) campo único `holoscan_system` no domínio (1:1 — insuficiente para N) | tabela própria permite 0..N sistemas por domínio com fonte por linha |
| **múltiplos sistemas por domínio** | "HOLOSCAN alterado" = qualquer sistema relacionado alterado / todos / maioria / sistema principal declarado | cada opção muda a frequência de "alterado"; precisa de regra explícita |
| **"ambos não alterados"** | (a) convergente (como hoje/legado); (b) estado próprio "convergente sem alteração" (texto distinto, bloco 23); (c) estado neutro fora de convergente | risco de leitura "saudável" em (a) — texto deve evitar (bloco 23) |

## Consequências

Cada escolha muda quantos pacientes caem em "HOLOSCAN alterado" e em convergente. Nenhuma produz diagnóstico: CONVERGENTE significa só que, segundo a regra homologada, laboratório e relato apontam no mesmo sentido para o domínio.

## Incompatíveis

Convergente = diagnóstico; convergente alterar nota/Índice/Tríada; nota de pacote não aprovado como saída oficial; relação domínio → sistema inferida pelo nome; corte herdado do legado.


## Precedência obrigatória do motor LI (regra estrutural oficial, Etapa 5.9)

Antes de avaliar CONVERGENTE ou DIVERGENTE, o motor executa nesta ordem lógica: (1) validar aplicação HOLOSCAN; (2) validar pacote/versão compatível; (3) validar temporalidade; (4) validar vínculos metodológicos; (5) validar resultados laboratoriais; (6) validar referências/unidades/contexto; (7) validar suficiência do domínio; (8) resolver resultados mistos; (9) derivar direção do HOLOSCAN; (10) derivar direção laboratorial; (11) somente então determinar o estado da LI. **SEM DADOS SUFICIENTES tem precedência** quando qualquer requisito necessário não estiver atendido. **CONVERGENTE e DIVERGENTE nunca são fallback.**

## Direções internas conceituais (nomenclatura metodológica interna)

`attention_present` · `attention_not_detected` · `indeterminate`. **Não** são diagnóstico, score, prognóstico, "doente"/"saudável", nem são mostradas ao paciente como termos técnicos. Existem só para permitir comparação determinística entre fontes. Campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 20 — regra formal de CONVERGENTE, arquitetura):** CONVERGENTE só pode existir quando: (A) a fonte HOLOSCAN é elegível, suficiente e avaliável; (B) a fonte laboratorial é elegível, suficiente e avaliável; (C) todas as regras necessárias do domínio estão homologadas; (D) nenhuma condição de SEM DADOS SUFICIENTES tem precedência; (E) as duas fontes produzem direção determinística.

| HOLOSCAN | LAB | Estado |
|---|---|---|
| `attention_present` | `attention_present` | CONVERGENTE |
| `attention_not_detected` | `attention_not_detected` | CONVERGENTE |
| qualquer fonte `indeterminate` | — | **não** produz CONVERGENTE → avaliar SEM DADOS SUFICIENTES |

**Convergência sem sinal:** CONVERGENTE não significa obrigatoriamente presença de alteração; pode existir quando as duas fontes elegíveis não identificam sinal de atenção na direção comparada. Isso **não** permite afirmar paciente saudável, ausência de doença, ausência de risco, função normal global ou garantia de saúde.

**Um exame isolado:** UM ÚNICO EXAME FORA DA REFERÊNCIA NÃO PRODUZ AUTOMATICAMENTE CONVERGÊNCIA. A fonte laboratorial passa antes pelas regras homologadas de vínculo, elegibilidade, suficiência, resultados mistos e direção laboratorial.

**Tabela domínio → sistema(s) HOLOSCAN: PREENCHIDA na Etapa 5.12** (`DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md`): D01 → `acido_inflamatorio`; D02 → `metabolico`; D03 → `metabolico`; D04 → `detox_linfatico`; D05, D06, D07 → nenhum na V1 (`holoscan_mapping_mode = none`, ausência intencional ≠ mapeamento faltando). Direção HOLOSCAN (Regra 20/21-A): baixa → `attention_present`, intermediária → `indeterminate`, alta → `attention_not_detected`, não avaliável → `indeterminate`. Papéis `cross_source_role` directional/contextual por vínculo (Regra 20/21-B). Nenhuma inferência por nome foi usada; a relação é autoral, comparativa, versionada, não diagnóstica.

**Pendência restante (não ocultável):** direção laboratorial final do domínio depende da suficiência (16), dos mínimos/conjuntos (17) e da regra de mistos (19). CONVERGENTE não é executável sem eles.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 20–25 e no Documento Mestre (um exame fora não basta; divergência não invalida fonte; ausência não é divergência; sem score; leitura salva congelada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS (Etapas 5.9 e 5.12) — estado final depende de 16/17/19; não implementado, não registrado no banco, não homologado.
