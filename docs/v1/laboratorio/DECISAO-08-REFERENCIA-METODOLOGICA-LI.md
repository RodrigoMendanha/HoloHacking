# DECISÃO 08 — REFERÊNCIA METODOLÓGICA

Etapa 5.6 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 8 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **DECIDIDO QUANTO À ARQUITETURA — Etapa 5.7 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhum campo, referência, conversão ou equivalência foi criado.

## Pergunta

**A V1 terá referências metodológicas próprias do pacote LI? Com qual contrato, para quais exames, e com que prioridade frente à referência do laudo?**

**Não inventar "faixa ideal".** O "ideal" legado (`exames.csv`, "literatura funcional — revisar") está fora da saída oficial e **não** é candidato.

## Estado atual

`lab_method_references`: `exam_code`, `variant`, `material`, `method`, `population`, `sex`, `age_min/max`, `context`, `lower/upper_bound`, `operator`, `unit`, `source`, `source_version`, `justification`, `effective_from/to`, `status` (CHECK: `aprovado` exige responsável, provenance, hash, vigência), `version`. **0 linhas.** Só gestão técnica escreve. Entra no hash do pacote LI quando referenciada por vínculo (`reference_id`) ou dependência (Etapa 5.2). Motor usa só `status = aprovado`.

## Contrato (o que cada referência metodológica precisaria ter — levantamento)

| Campo | Significado | Existe |
|---|---|---|
| fonte (`source`, `source_version`) | documento/base de onde o intervalo vem | sim |
| justificativa | por que este intervalo para este uso | sim |
| população (`population`, `sex`, `age_min/max`) | a quem se aplica | sim |
| condições (`context`: jejum, fase, gestação etc.) | condição de coleta/estado | sim (texto) |
| unidade | obrigatória, igual à do valor ou com conversão aprovada (bloco 10) | sim |
| variante / material / método | identidade a que se aplica | sim |
| versão + vigência | `version`, `effective_from/to` | sim |
| aprovação | `status`, `responsible`, `approval_provenance`, `content_hash`; e inclusão no hash do pacote LI | sim |

## Opções (sem decidir)

(a) nenhuma referência metodológica na V1 (só laudo); (b) referências metodológicas aprovadas por migration, por exame, com prioridade sobre o laudo quando vinculadas; (c) idem, prioridade do laudo; (d) ambas visíveis, classificação pela escolhida no vínculo. Qualquer opção com conteúdo exige decisão **por exame**, com fonte — nenhum número aqui.

## O que fica bloqueado enquanto aberto

Qualquer classificação que não seja pela referência do laudo.


## Regra transversal (princípio oficial da LI V1, Etapa 5.7)

**Um resultado possui três eixos de estado independentes:**
1. **Classificação individual** — pode ou não ser classificado contra uma referência aplicável (`classification_status`).
2. **Elegibilidade para Leitura Integrada** — pode ou não participar de uma LI, considerando domínio, vínculo, temporalidade, versão, suficiência e demais regras (`li_eligibility_status`).
3. **Comparabilidade longitudinal** — pode ou não ser comparado diretamente a outro resultado histórico (`longitudinal_comparability_status`).

Um resultado pode ser válido e classificável individualmente e, ao mesmo tempo, não ser elegível para a LI nem comparável longitudinalmente. **Nunca transformar problema de comparabilidade em "resultado inválido".** Os motivos são registrados separadamente por eixo. A nomenclatura acima é **conceitual**: os campos **não** foram implementados nesta etapa.

## Casos de regressão conceitual (obrigatórios para a implementação futura)

| Caso | Situação | Resultado esperado |
|---|---|---|
| A | referência válida do próprio laudo; método não informado; a referência não exige método | **individualmente classificável** |
| B | dois resultados do mesmo `exam_code` com métodos diferentes, cada um com referência válida própria | ambos classificáveis individualmente; **comparação numérica não automaticamente permitida** |
| C | resultado sem referência aplicável | guardado, visível, **não classificável** (`missing_applicable_reference`); nunca "normal" |
| D | PCR (`variant = null`) e PCR-us (`variant = ultrassensivel`) | **não** silenciosamente equivalentes |
| E | Magnésio (`variant = null`) e Magnésio eritrocitário (`variant = eritrocitario`) | **não** silenciosamente equivalentes |
| F | Testosterona livre (LAB-037) e total (LAB-038) | `exam_code`s distintos; **não** recriar como variante artificial |

## Campo DECISÃO

**DECISÃO (Bloco 8 — referência metodológica, arquitetura):**
- Uma referência metodológica é uma entidade **separada** da referência laboratorial do laudo.
- Só pode existir com: exame; variante quando pertinente; material quando pertinente; método quando pertinente; unidade; limite/faixa/regra; **fonte verificável**; justificativa; população; condições de aplicação; versão; responsável; **aprovação metodológica**.
- **Não existe "faixa ideal universal"** por simples convenção do sistema.
- Se futuramente existir referência metodológica diferente da do laboratório, a interface apresenta claramente **REFERÊNCIA DO LAUDO** e **REFERÊNCIA METODOLÓGICA**, sem substituir silenciosamente uma pela outra.
- Hoje: **0 referências metodológicas aprovadas. Nenhuma criada nesta etapa.** O conteúdo (quais exames, quais limites, quais fontes) continua pendente e só entra por migration versionada com aprovação.

Consequência técnica: `lab_method_references` já tem os campos do contrato; a UI de exibição dupla (laudo × metodológica) é extensão futura.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 7–13 e no Documento Mestre (dado bruto preservado; nenhuma inferência sem regra homologada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO QUANTO À ARQUITETURA — não implementado, não registrado no banco, não homologado.
