# DECISÃO 21 — REGRA FORMAL DE DIVERGENTE

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 21 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende do bloco 20 e das DECISÕES 01–19.

> **ARQUITETURA DECIDIDA / TABELA DOMÍNIO → SISTEMA(S) E REGRAS DE DIREÇÃO PENDENTES — Etapa 5.9 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma tabela domínio → sistema, regra de direção, parâmetro ou texto específico por domínio foi criado.

## Pergunta (como no pacote)

**Divergente é simplesmente `labAlterado ≠ holoAlterado` ou os dois sentidos são tratados de forma diferente: (i) HOLOSCAN alterado + laboratório não alterado; (ii) HOLOSCAN não alterado + laboratório alterado? Há exigência adicional (ex.: suficiência reforçada) para declarar divergência?**

## Estado atual

Motor: um só estado `divergente` para os dois sentidos; o trace guarda `labAlterado`/`holoAlterado`, permitindo distinguir na tela sem mudar o motor. Legado: os dois sentidos eram `diverge` com textos causais ("o que a anamnese não pega" / "o sintoma é anterior ao marcador") — **LEGADO, textos incompatíveis**.

## Invariantes já decididos que valem aqui

- Um exame fora da referência **não basta** automaticamente para convergência (Mestre; DECISÕES 02, 19).
- Divergência **não invalida** o HOLOSCAN nem o exame.
- Ausência de uma fonte (aplicação não avaliável, coleta inelegível, sem referência, fora da janela, suficiência não atingida, misto sem regra) → `sem_dados_suficientes`, **nunca** divergente.
- A relação domínio LI → sistema(s) HOLOSCAN só existe por **regra explicitamente homologada** (DECISÃO 01, regra 3); nenhuma relação é inferida pelo nome.
- Direção `above/below/any` do vínculo (DECISÃO 02) indica só o lado da referência que pode participar; não é gravidade nem estado.

## Levantamento (sem decidir)

| Tema | Opções | Consequência |
|---|---|---|
| estados | (a) único; (b) único com sub-rótulo pelo sentido; (c) dois estados distintos | (b)/(c) mais informação e mais textos a homologar (bloco 23) |
| sentido (i) HOLOSCAN alterado + lab não alterado | mesmo estado / estado próprio / exigência extra | risco de leitura "o exame desmente o paciente" — incompatível |
| sentido (ii) HOLOSCAN não alterado + lab alterado | mesmo estado / estado próprio / exigência extra | risco de leitura "achado silencioso" causal — incompatível |
| exigência adicional | suficiência reforçada para divergente; mesma suficiência de convergente | assimetria precisa de justificativa; motor exige extensão |
| mistos | regra do domínio (bloco 19) decide "lab alterado" antes | sem regra → `sem_dados_suficientes`, nunca divergente |
| ausência de fonte | sempre `sem_dados_suficientes` | **nunca** "divergente por falta" |

## Incompatíveis

Divergente invalidar relato ou exame; texto causal; divergente gerar alerta no dashboard (retirado na Etapa 0); hierarquizar qual lado "está certo".


## Precedência obrigatória do motor LI (regra estrutural oficial, Etapa 5.9)

Antes de avaliar CONVERGENTE ou DIVERGENTE, o motor executa nesta ordem lógica: (1) validar aplicação HOLOSCAN; (2) validar pacote/versão compatível; (3) validar temporalidade; (4) validar vínculos metodológicos; (5) validar resultados laboratoriais; (6) validar referências/unidades/contexto; (7) validar suficiência do domínio; (8) resolver resultados mistos; (9) derivar direção do HOLOSCAN; (10) derivar direção laboratorial; (11) somente então determinar o estado da LI. **SEM DADOS SUFICIENTES tem precedência** quando qualquer requisito necessário não estiver atendido. **CONVERGENTE e DIVERGENTE nunca são fallback.**

## Direções internas conceituais (nomenclatura metodológica interna)

`attention_present` · `attention_not_detected` · `indeterminate`. **Não** são diagnóstico, score, prognóstico, "doente"/"saudável", nem são mostradas ao paciente como termos técnicos. Existem só para permitir comparação determinística entre fontes. Campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 21 — regra formal de DIVERGENTE, arquitetura):** DIVERGENTE só pode existir quando ambas as fontes são elegíveis, suficientes, avaliáveis, têm direção determinística e nenhuma condição de insuficiência tem precedência.

| HOLOSCAN | LAB | Estado |
|---|---|---|
| `attention_present` | `attention_not_detected` | DIVERGENTE |
| `attention_not_detected` | `attention_present` | DIVERGENTE |
| qualquer lado `indeterminate` | — | **não** produz DIVERGENTE |

**Divergência não é erro:** DIVERGENTE não invalida HOLOSCAN; não invalida exame; não prova que o relato esteja errado; não prova que o laboratório esteja errado; não significa baixa adesão; não significa incoerência do paciente. É apenas diferença entre direções de duas fontes suficientes e elegíveis, segundo regra homologada. **Textos automáticos proibidos:** "HOLOSCAN está errado", "exame contradiz o paciente", "relato inconsistente", "resultado incorreto".

**Ausência não é divergência:** se faltar HOLOSCAN elegível, laboratório elegível, referência, cobertura, vínculo, janela, regra ou seleção de resultado, o estado **não** é divergente → avaliar SEM DADOS SUFICIENTES.

**Pendência (não ocultável):** mesma tabela domínio → sistema(s) HOLOSCAN e regras de direção (bloco 20).

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 20–25 e no Documento Mestre (um exame fora não basta; divergência não invalida fonte; ausência não é divergência; sem score; leitura salva congelada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** ARQUITETURA DECIDIDA / TABELA DOMÍNIO → SISTEMA(S) E REGRAS DE DIREÇÃO PENDENTES — não implementado, não registrado no banco, não homologado.
