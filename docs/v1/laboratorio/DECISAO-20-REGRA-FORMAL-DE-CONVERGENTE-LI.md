# DECISÃO 20 — REGRA FORMAL DE CONVERGENTE

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 20 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende das DECISÕES 01–04, 06, 07, 09, 11–19 e do valor do bloco 5.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhuma regra clínica deduzida do legado; nenhuma relação domínio LI → sistema HOLOSCAN criada; nenhum score, peso, corte ou bibliografia. Campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
