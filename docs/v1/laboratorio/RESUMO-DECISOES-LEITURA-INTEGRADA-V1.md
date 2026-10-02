# Leitura Integrada V1 — decisões humanas necessárias (resumo)

Etapa 5.1 · 02/10/2026 · resumo de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`. **Nenhuma decisão tomada; nenhuma opção recomendada; nenhum valor proposto.** "Hoje" = estado técnico da Etapa 5. "Legado" = confronto antigo (`nota ≤ 3` × um exame fora da faixa do CSV), **LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO**, visível só em `?homologacao=1`.

Enquanto os blocos 1–22 estiverem abertos, toda Leitura Integrada real é **sem dados suficientes**. O bloco 30 (governança) está fechado tecnicamente: quando houver conteúdo decidido, ele entra por migration, o pacote passa a `em_revisao` e segue Daniel → Rodrigo → Homologar.

Significados fixos: CONVERGENTE ≠ diagnóstico; DIVERGENTE não invalida relato nem exame; SEM DADOS SUFICIENTES é obrigatório quando falta fonte, regra, referência, compatibilidade, suficiência ou tratamento aprovado de mistos.

| # | Decisão | Hoje | Legado | Decidir |
|---|---|---|---|---|
| 1 | Domínios oficiais | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.4)**: arquitetura A, 7 domínios LI-D01…LI-D07, 11 regras; não registrado no banco, não homologado, não implementado | 5 sistemas HOLOSCAN usados como domínio (não herdados) | — (`DECISAO-01-DOMINIOS-LI.md`) |
| 2 | Exame/variante/material → domínio | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.5)**: 42 exames com domínio (47 pares), 3 sem, 5 multi; direções registradas; variantes PCR/Mg distintas; 0 herdados; não implementado, não homologado | `exames.csv.sistema` — NÃO HOMOLOGADO PARA VÍNCULO, não herdado | — (`DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md`); material/método por vínculo na implementação |
| 3 | Aplicação HOLOSCAN elegível | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.6)**: 1 aplicação, seleção explícita, mesmo paciente, consolidada, sem rascunho/prévia, pacote HOLOSCAN homologado + compatibilidade de versão declarada pelo pacote LI, parcial só onde avaliável, históricas sob regra temporal; não implementado | pontuação local sem id | — (`DECISAO-03-ELEGIBILIDADE-HOLOSCAN-LI.md`) |
| 4 | Coletas e resultados elegíveis | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.6)**: coleta consolidada, mesma paciente, data clínica, sem rascunho/substituída, laboratório e atendimento opcionais; resultado elegível por resultado (referência/unidade/variante só o afetam), copiado/extraído exigem conferência humana, custom e additional_legacy não entram sem vínculo homologado; não implementado | valores atuais locais | — (`DECISAO-04-ELEGIBILIDADE-COLETAS-LI.md`) |
| 5 | Janela temporal | **PARCIALMENTE DECIDIDO (Daniel, 02/10/2026, Etapa 5.6)**: compatibilidade temporal obrigatória, datas clínicas, nunca `updated_at`, janela explícita/versionada/no pacote/rastreável, fora da janela ou sem data = sem dados | sem janela | **valor/regra exata em dias** (não assumir 7/30/60/90) — `DECISAO-05-JANELA-TEMPORAL-LI.md` |
| 6 | Múltiplas coletas na janela | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.6)**: 1..N por seleção explícita, sugestão por proximidade da data clínica, sem escolha silenciosa, `updated_at` nunca, empate sem desempate automático, snapshot application_id + collection_ids + result_ids, exame duplicado exige seleção humana do result_id; não implementado | última por `updated_at` (proibido) | — (`DECISAO-06-MULTIPLAS-COLETAS-LI.md`) |
| 7 | Referência do laudo | **DECIDIDO (Daniel, 02/10/2026, Etapa 5.7)**: referência primária = a do laudo, por resultado; original preservado; ambiguidade → `ambiguous_reference`; qualitativos e H/L sem classificação automática; laudo nunca sobrescrito | não existia | — (`DECISAO-07-REFERENCIA-LABORATORIAL-DO-LAUDO-LI.md`) |
| 8 | Referência metodológica | **DECIDIDO QUANTO À ARQUITETURA (Etapa 5.7)**: entidade separada com contrato completo e aprovação; sem "faixa ideal universal"; UI laudo × metodológica; 0 criadas | "ideal" do CSV sem fonte | conteúdo (quais, limites, fontes) — `DECISAO-08-REFERENCIA-METODOLOGICA-LI.md` |
| 9 | Sem referência | **DECIDIDO (Etapa 5.7)**: `not_classifiable / missing_applicable_reference`; nunca normal/fora; não conta para convergente/divergente; não invalida coleta/domínio; suficiência decide | ideal sempre presente | — (`DECISAO-09-AUSENCIA-DE-REFERENCIA-LI.md`) |
| 10 | Conversões de unidade | **DECIDIDO QUANTO À ARQUITETURA (Etapa 5.7)**: só regra homologada (contrato completo); original preservado; 0 conversões; incompatível → bloqueado; nada inferido | unidade fixa do CSV | conteúdo (quais conversões) — `DECISAO-10-CONVERSOES-DE-UNIDADE-LI.md` |
| 11 | Compatibilidade de variante | **DECIDIDO (Etapa 5.7)**: variantes incompatíveis até declaração explícita; PCR ≠ PCR-us; Mg ≠ eritrocitário; livre/total já são exam_codes | PCR-us item próprio | — (`DECISAO-11-COMPATIBILIDADE-DE-VARIANTE-LI.md`) |
| 12 | Compatibilidade de material | **DECIDIDO (Etapa 5.7)**: não universal; bloqueia só a operação que exige; ausente bloqueia só quando exigido; nunca inventado | inexistente | — (`DECISAO-12-COMPATIBILIDADE-DE-MATERIAL-LI.md`) |
| 13 | Compatibilidade de método | **DECIDIDO (Etapa 5.7)**: classificação individual ≠ comparação longitudinal; método ausente não bloqueia universalmente; regra dependente de método exige método; métodos diferentes podem bloquear comparação; sem equivalência sem regra | inexistente | — (`DECISAO-13-COMPATIBILIDADE-DE-METODO-LI.md`) |
| 14 | Resultados qualitativos (`DECISAO-14-RESULTADOS-QUALITATIVOS-LI.md`) | não classificáveis, excluídos | não registráveis | tabela por exame ou exclusão |
| 15 | Resultados censurados (`DECISAO-15-RESULTADOS-CENSURADOS-LI.md`) | não classificáveis, excluídos | digitados como número | classificação por intervalo ou exclusão |
| 16 | Suficiência mínima por domínio (`DECISAO-16-SUFICIENCIA-MINIMA-POR-DOMINIO-LI.md`) | sem regra | 1 exame bastava | arquitetura (absoluto/por domínio/fração) + valor ___ |
| 17 | Número/conjunto mínimo de exames (`DECISAO-17-NUMERO-CONJUNTO-MINIMO-DE-EXAMES-LI.md`) | sem obrigatórios | inexistente | flag `required` ou nenhum |
| 18 | Tratamento de exames ausentes (`DECISAO-18-TRATAMENTO-DE-EXAMES-AUSENTES-LI.md`) | ignorados | ignorados | ignorar, listar, denominador |
| 19 | Tratamento de resultados mistos (`DECISAO-19-TRATAMENTO-DE-RESULTADOS-MISTOS-LI.md`) | sem regra → sem dados | qualquer fora = alterado | `insufficient`, `majority`, fração, direção; empate |
| 20 | CONVERGENTE | sem regra; motor: lab alterado == HOLOSCAN alterado | `nota ≤ 3` ∧ ≥1 fora; "ambos ok" também | critério HOLOSCAN alterado; "ambos não alterados" |
| 21 | DIVERGENTE | estado único, dois sentidos | textos causais por sentido | único, sub-rótulo, dois estados |
| 22 | SEM DADOS SUFICIENTES | 8 motivos, único estado real | só `sem_exame` | confirmar lista/rótulos |
| 23 | Textos à profissional | nenhum aprovado | 4 textos fixos (neutros) + causais | textos neutros por estado/domínio |
| 24 | Textos ao paciente | nenhum | nenhum | aparece ou não; texto |
| 25 | Comparabilidade da LI | nenhuma comparação | nada era salvo | mesma versão, lado a lado, nunca melhorou/piorou |
| 26 | Cálculos derivados | tabela vazia | HOMA-IR digitado | nenhum ou aprovados com fórmula/versão |
| 27 | Customizados | fora da LI | inexistente | fora, promoção ao catálogo |
| 28 | Candida IgG, VHS, HOMA-IR, Cortisol | `additional_legacy` | vínculos a 4 sistemas | manter, catálogo, custom |
| 29 | Insulina de jejum ↔ basal | `exam_code` nulo, `requires_manual_mapping` | EXA-006 → metabolico | alias seguro, variante, pendente, custom — **não automático** |
| 30 | Homologação do pacote LI | **FECHADO TECNICAMENTE (Etapa 5.2)**: Daniel → Rodrigo, hash canônico, invalidação, `homologar_pacote_li` com completude, snapshot; 0 aprovações registradas | sem processo | — (conteúdo dos blocos 1–29 continua aberto) |

**Primeiro bloco que exige decisão humana:** 5 (valor da janela temporal), depois 14–19 — o 30 foi fechado tecnicamente (5.2); os blocos 1–4 e 6–13 foram decididos (8 e 10 quanto à arquitetura) e o 5 parcialmente decidido por Daniel (5.4–5.7); blocos 14–19 preparados; nenhuma aprovação real registrada. Regra transversal (5.7): três eixos de estado por resultado — classificação, elegibilidade para LI, comparabilidade longitudinal.

**Contagens da Etapa 5 (Anexo A do pacote):** harness 114 → 116 = L42/L43 acrescentados em `8a3524c`; EXA: 24 = 19 mapeados + 1 manual (EXA-006) + 4 `additional_legacy`.
