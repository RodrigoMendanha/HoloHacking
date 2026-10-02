# PACOTE DE DECISÃO HUMANA — LEITURA INTEGRADA V1

Etapa 5.1 · 02/10/2026 · branch `claude/v1-etapa5-1-decisoes-leitura-integrada` (a partir de `43daba2`) · para a liderança do método e os responsáveis clínicos.

> **NENHUMA DECISÃO CLÍNICA FOI TOMADA NESTE DOCUMENTO.** Os campos DECISÃO, JUSTIFICATIVA, RESPONSÁVEL e DATA estão em branco nos blocos 1–29. **Etapa 5.2:** o bloco 30 (governança) foi **fechado tecnicamente** — a Leitura Integrada reutiliza a dupla aprovação Daniel → Rodrigo do HOLOSCAN (`GOVERNANCA-HOMOLOGACAO-LI-V1.md`); nenhuma aprovação real foi registrada. Nenhuma opção está recomendada. Nenhum valor numérico de corte, janela ou referência é proposto.
>
> **Autoridade.** Documento Mestre (§§21–24) = destino da V1. Etapa 5 (`ETAPA5-LABORATORIO.md`) = infraestrutura técnica, já entregue. AS-IS (`INVENTARIO-LABORATORIO-AS-IS.md`) = evidência histórica. **Nenhuma regra do confronto legado é proposta oficial só porque existia**: onde aparece, está marcada **LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO**.
>
> **Estado técnico.** Pacote real `LI-V1@1` em `rascunho`, com 0 domínios, 0 vínculos, 0 regras, 0 textos. Único estado real possível: `sem_dados_suficientes`. Referências metodológicas, conversões e cálculos derivados: tabelas vazias. Migration `20261001220000` **não aplicada**; banco real **não validado**. HOLOS-V1@2 (HOLOSCAN) continua `em_revisao`, sem aprovação registrada.

## Como usar

- Cada bloco é **uma decisão**. Traz: o que decidir, por quê, o que existe hoje, fonte, legado relacionado, conflitos, opções tecnicamente possíveis, opções incompatíveis com o Mestre, consequência de cada opção, o que fica bloqueado, e os quatro campos a preencher.
- "Tecnicamente possível" significa: a infraestrutura da Etapa 5 (`leitura-integrada-motor.js`, tabelas `integrated_reading_*`, `lab_method_references`, `lab_unit_conversion_rules`, `lab_derived_calculations`) consegue representar a opção **sem código novo**, ou com extensão pequena e identificada. Não significa que a opção seja clinicamente adequada.
- Uma decisão sem responsável humano nomeado não pode ser registrada. Nenhuma decisão pode ser atribuída a "Liderança do método HOLOSCAN" (regra da Etapa 4.2).
- Enquanto qualquer bloco de 1 a 22 estiver aberto, a Leitura Integrada real continua **sem dados suficientes** para todo paciente, e nenhuma superfície oficial (ficha, Confronto, Evolução, relatório, HOLOS AI, Conduta) mostra convergente/divergente.

## Significado dos três estados (vale para todo o pacote)

- **CONVERGENTE** não significa diagnóstico confirmado, doença, causa ou "exame comprova o relato". Significa apenas que, segundo a regra homologada, o padrão laboratorial e o padrão de relato apontam no mesmo sentido para aquele domínio.
- **DIVERGENTE** não invalida o relato do paciente nem o exame. Significa apenas que, segundo a regra homologada, os dois não apontam no mesmo sentido; não hierarquiza qual "está certo".
- **SEM DADOS SUFICIENTES** é **obrigatório** sempre que falte qualquer uma destas peças: fonte (HOLOSCAN ou coleta), regra homologada, referência utilizável, compatibilidade (unidade/variante/material/método), suficiência, janela temporal satisfeita ou tratamento aprovado para resultados mistos. Nunca é "divergente por falta".

## Ordem de dependência

| Bloco | Decisão | Bloqueia |
|---|---|---|
| 30 | Processo de homologação do pacote LI | registro de qualquer decisão abaixo |
| 1 | Domínios oficiais | tudo |
| 2 | Exame/variante/material → domínio | tudo o que é por domínio |
| 7, 8, 9 | Referência elegível (laudo / metodológica / ausência) | classificação de qualquer resultado |
| 10–13 | Conversões, variante, material, método | compatibilidade de cada resultado |
| 14, 15 | Qualitativos, censurados | inclusão desses resultados |
| 3, 4, 5, 6 | Aplicação elegível, coletas elegíveis, janela, múltiplas coletas | montagem do par HOLOSCAN × laboratório |
| 16, 17, 18, 19 | Suficiência, conjunto mínimo, ausentes, mistos | passagem de "incluído" a "avaliável" |
| 20, 21, 22 | Regras formais dos três estados | o estado em si |
| 23, 24 | Textos (profissional, paciente) | o que aparece na tela e no relatório |
| 25 | Comparabilidade longitudinal da LI | Evolução da própria LI |
| 26, 27, 28, 29 | Derivados, customizados, legado fora dos 45, Insulina | cobertura de itens específicos |

O bloco **30** (quem aprova e como) foi fechado tecnicamente na Etapa 5.2; o **primeiro bloco que exige decisão humana** passa a ser o **1** (domínios).

---

## Legado — motor de confronto antigo (referência para todos os blocos)

**LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO. Não é default.**

Fonte: `motor/src/exames.ts` (`avaliarExames`, `confrontar(limiteBaixo = 3)`), `motor/bancos/exames.csv` (24 EXA-*, `sistema`, `ideal_min/max`, `leitura_baixo/alto`, status `rascunho`, fonte "literatura funcional — revisar"), `arquivos.js` (`window.Holoscan`, `HOLOSCAN_LIMITE_BAIXO = 3`, textos fixos). Hoje só aparece em `?homologacao=1`, rotulado.

Regra exata, por **sistema HOLOSCAN** (os 5 do questionário, usados como "domínio"):
1. `situacao` de cada exame = `ok` se `ideal_min ≤ valor ≤ ideal_max` do CSV, senão `baixo`/`alto` (referência = "ideal" do CSV, sem fonte homologada; unidade do CSV, sem conversão; só numérico).
2. `alterados` = nº de exames do sistema com `situacao ≠ ok`. Sem exame do sistema → `sem_exame`. Sem nota do sistema → `sem_exame`.
3. `relatoRuim` = `nota ≤ 3` (escala 0–10). `sangueRuim` = `alterados > 0` (**um único exame fora basta**).
4. `relatoRuim ∧ sangueRuim` → `confirma` (rótulo "Convergente"); `¬relatoRuim ∧ ¬sangueRuim` → `confirma` (rótulo "Convergente", texto "sem alteração"); os dois casos cruzados → `diverge` ("Divergente"); `sem_exame` → "Dados insuficientes".
5. Textos fixos: "Existe convergência entre o relato do paciente e os dados laboratoriais nesta dimensão." / "Relato e dados laboratoriais disponíveis estão convergentes nesta dimensão." / "O relato e os dados laboratoriais não estão caminhando na mesma direção neste momento." / "Ainda não há dados laboratoriais suficientes para realizar a leitura integrada desta dimensão." Os textos `leitura_*` do CSV e os `leitura` de `confrontar()` são causais ("O sintoma e anterior ao marcador — ou a causa esta noutro lugar") e já estão fora de toda superfície.
6. Sem janela temporal, sem versão de regra, sem suficiência mínima, sem tratamento de mistos (qualquer fora = fora), sem direção (acima/abaixo indiferente), sem variante (PCR-us tratado como item próprio), sem material, sem referência do laudo.

Vínculo legado exame → sistema (`exames.csv.sistema`, preservado em `lab_results.legacy_sistema`; **não homologado**):

| sistema legado | EXA-* |
|---|---|
| fungico | EXA-001 Candida albicans IgG |
| acido_inflamatorio | EXA-002 PCR ultrassensível, EXA-003 VHS, EXA-004 Ácido úrico |
| metabolico | EXA-005 Glicemia de jejum, EXA-006 Insulina de jejum, EXA-007 HOMA-IR, EXA-008 Hemoglobina glicada, EXA-009 Triglicerídeos, EXA-010 HDL, EXA-011 TSH, EXA-012 T4 livre |
| detox_linfatico | EXA-013 TGO, EXA-014 TGP, EXA-015 GGT, EXA-016 Bilirrubina total, EXA-017 Ureia, EXA-018 Creatinina |
| mental_emocional_espiritual | EXA-019 Vitamina D, EXA-020 B12, EXA-021 Ferritina, EXA-022 Mg eritrocitário, EXA-023 Homocisteína, EXA-024 Cortisol matinal |

Isto é **evidência histórica**. Nenhuma linha vira domínio ou vínculo da Leitura Integrada sem decisão nos blocos 1 e 2.

---

## BLOCO 1 — Domínios oficiais da Leitura Integrada

**O que decidir.** Quais domínios existem na Leitura Integrada V1 (nome, código, definição), e se "domínio" é a mesma entidade que "sistema HOLOSCAN" ou outra.

**Por quê.** Todo vínculo, suficiência, regra e texto é **por domínio**. Sem domínio não há leitura.

**O que existe.** `integrated_reading_domains`: **0 linhas**. Coluna opcional `holoscan_system` (CHECK nos 5 sistemas) permite ligar um domínio a um sistema **se decidido** — não é mapeamento automático. Motor: itera só domínios `aprovado`.

**Fonte.** Mestre §24 (Leitura Integrada exige vínculo aprovado, suficiência, temporalidade, resultados mistos); §16/§24.3/§43.2 (exames não alteram sistemas). Nenhum trecho do Mestre disponível no repositório define a lista de domínios.

**Legado.** Os 5 sistemas HOLOSCAN (Fúngico, Ácido Inflamatório, Metabólico, Detox e Linfático, Mental Emocional Espiritual) eram usados como domínio por `confrontar()`. **LEGADO, não homologado. Não são criados automaticamente.**

**Conflitos.** Tratar domínio = sistema HOLOSCAN acopla a Leitura Integrada à estrutura do questionário (qualquer mudança no HOLOS-V1 reabre a LI); tratar domínio ≠ sistema exige definir como "HOLOSCAN alterado" é lido para um domínio que não é um sistema (bloco 20).

**Opções tecnicamente possíveis.**
- (a) Domínios = os 5 sistemas HOLOSCAN, 1:1 (`holoscan_system` preenchido).
- (b) Domínios próprios da LI (por exemplo por eixo laboratorial), cada um ligado a 0, 1 ou mais sistemas HOLOSCAN por regra explícita de convergência (bloco 20).
- (c) Subconjunto: só alguns domínios na V1, os demais fora.
- (d) Nenhum domínio na V1: a Leitura Integrada permanece infraestrutura, estado único `sem_dados_suficientes`.

**Incompatíveis com o Mestre.** Domínio criado sem fonte e sem decisão registrada; domínio derivado de `legacy_sistema` automaticamente; domínio que altera nota, Índice ou Tríada.

**Consequência.** (a) a leitura "HOLOSCAN alterado" é direta (nota/faixa do sistema); cada sistema sem vínculo fica `sem dados suficientes`. (b) exige regra de convergência por domínio apontando sistema(s) — hoje o motor lê `system_results` por `holoscan_system` do domínio: um domínio sem `holoscan_system` precisa de extensão pequena do motor (regra de convergência com lista de sistemas). (c) idem, só para os escolhidos. (d) nada muda em relação a hoje.

**Bloqueado enquanto aberto.** Tudo (blocos 2–25).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 2 — Relação exame/variante/material → domínio

**O que decidir.** Para cada domínio do bloco 1: quais exames (LAB-xxx), com qual variante e material, pertencem ao domínio, e com qual **direção** relevante (`above`, `below`, `any`).

**Por quê.** O motor só inclui resultados com vínculo `aprovado`; sem vínculo → `sem_associacao_aprovada`.

**O que existe.** `integrated_reading_exam_domain_links` (`domain_id`, `exam_code`, `variant`, `material`, `direction ∈ any|above|below`, `reference_id` opcional, `status`): **0 linhas**. Catálogo-base: 45 exames, 18 categorias (categorias são organização do catálogo, **não** domínios).

**Fonte.** Mestre §21 (catálogo de 45), §24 (vínculo aprovado). Nenhuma associação exame → domínio consta no repositório como oficial.

**Legado.** `exames.csv.sistema` (tabela acima): 24 EXA-* → 5 sistemas. **LEGADO, não homologado.** Não propor "PCR → inflamação → Sistema Ácido", "Glicemia → Metabólico", "Ferritina → algum sistema" etc. sem fonte e decisão.

**Conflitos.** Um exame em mais de um domínio multiplica a contagem de suficiência; variante sem vínculo próprio (PCR vs PCR-us) fica fora mesmo com valor presente; direção `any` faz "abaixo" e "acima" contarem igual como "fora".

**Opções tecnicamente possíveis.** (a) vínculo explícito por (exame, variante, material, direção) — lista fechada com fonte por linha; (b) vínculo por exame com `variant/material = null` (aceita qualquer variante — a compatibilidade do bloco 11/12 decide); (c) exame em múltiplos domínios; (d) nenhum vínculo na V1.

**Incompatíveis com o Mestre.** Herdar `legacy_sistema` como vínculo; vínculo sem fonte; vínculo que faça o exame alterar a nota do sistema; mapeamento automático por categoria do catálogo.

**Consequência.** (a) só o que está listado conta; cada linha é auditável. (b) PCR e PCR-us entram no mesmo vínculo, mas a comparação longitudinal continua separada. (c) o mesmo resultado pode ser "fora" em dois domínios. (d) estado único `sem_dados_suficientes`.

**Bloqueado enquanto aberto.** Inclusão de qualquer resultado na leitura; blocos 16–22.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 3 — Qual aplicação HOLOSCAN é elegível

**O que decidir.** Qual aplicação HOLOSCAN entra na leitura: a escolhida explicitamente pela profissional (hoje), a mais recente consolidada, a mais próxima da coleta, só aplicações do pacote metodológico aprovado, só aplicações `avaliavel`, cobertura mínima.

**Por quê.** A leitura compara laboratório com **uma** aplicação; qual aplicação muda o resultado.

**O que existe.** UI: seleção explícita de 1 aplicação consolidada (lista com data clínica, estrutura, cobertura, id); nunca "a última". Motor: `holoscan_nao_avaliavel` se o sistema não tem nota. `methodology_package_id` da aplicação está gravado. HOLOS-V1@2 ainda `em_revisao` → **nenhuma aplicação hoje tem resultado oficial** (barreira da Etapa 4).

**Fonte.** Mestre §24 (temporalidade), §34.2 (seleção explícita, fonte visível), Etapa 4.2 (resultado oficial só com pacote aprovado).

**Legado.** `confrontar()` usava a pontuação local guardada (`pontuacaoGuardada`), sem id, sem versão, sem data. **LEGADO.**

**Conflitos.** Exigir pacote aprovado implica que a LI só funciona após a homologação do HOLOS-V1@2 (dupla aprovação); permitir aplicação em homologação contraria a barreira da Etapa 4.

**Opções tecnicamente possíveis.** (a) seleção explícita obrigatória (como hoje) + exigir `avaliavel` e pacote `aprovado`; (b) idem sem exigir pacote aprovado (**conflita** com a barreira da Etapa 4); (c) pré-seleção automática da mais recente dentro da janela, confirmada pela profissional; (d) cobertura mínima da aplicação como requisito (valor em branco).

**Incompatíveis com o Mestre.** Escolha por `updated_at`; aplicação não consolidada; aplicação cujo resultado não é oficial alimentar saída oficial.

**Consequência.** (a) LI indisponível até homologar o HOLOSCAN; nenhum código novo. (c) exige pequena extensão de UI; risco de parecer "automático". (d) exige campo na regra de convergência.

**Bloqueado enquanto aberto.** Montagem do par HOLOSCAN × laboratório.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 4 — Quais coletas são elegíveis

**O que decidir.** Quais coletas podem entrar: só `salvo`/`revisado` (hoje), só `revisado`, só coletas com laudo anexo, coletas do painel legado (`source = legacy_panel`), coletas migradas (`legacy_migrated`), coletas com `requires_manual_mapping`.

**Por quê.** Define a base factual da leitura.

**O que existe.** UI lista coletas não substituídas (`superseded_at` nulo) de qualquer `source`, inclusive legado; `rascunho` fora. Resultados legado têm `reference_status = missing` → não classificáveis → excluídos pelo motor (`sem_referencia_utilizavel`) mesmo quando selecionados.

**Fonte.** Mestre §22 (coleta por id, data clínica), §34.2, §36.1 (rascunho não é registro consolidado).

**Legado.** Painel legado grava `legacy_panel`, sem referência do laudo; não é classificável na V1.

**Conflitos.** Exigir `revisado` reduz a base; aceitar `legacy_panel` sem referência não produz classificação alguma (só aparece na seleção).

**Opções tecnicamente possíveis.** (a) `salvo` + `revisado`; (b) só `revisado`; (c) excluir `legacy_panel`/`legacy_migrated` da seleção; (d) exigir `document_id` (laudo anexo).

**Incompatíveis com o Mestre.** `rascunho`; coleta substituída; seleção por `updated_at`.

**Consequência.** (a) como hoje. (b) exige ato humano por coleta antes de qualquer leitura. (c) menos ruído na seleção; nenhum resultado legado deixaria de aparecer no histórico. (d) exige vínculo documento ↔ coleta em cada caso.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)); a decisão confirma ou restringe.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 5 — Janela temporal entre aplicação e coleta

**O que decidir.** Diferença máxima, em dias, entre `holoscan_applications.quando` e `lab_collections.coletado_em` para que um resultado conte; se é global ou por domínio; se é simétrica (coleta antes ou depois da aplicação).

**Por quê.** Mestre §24 exige temporalidade. Sem regra `temporal` aprovada, o motor **não** aplica janela (inclui tudo que foi selecionado) — mas sem regra de suficiência/convergência o estado é `sem_dados_suficientes` de qualquer forma.

**O que existe.** `integrated_reading_rules` tipo `temporal`, `payload.max_days` (número), `target` global ou domínio: **0 linhas**. Motor exclui com `incompatibilidade_temporal` quando `|dias| > max_days`; `clinical_date` ausente → excluído. Hoje a janela é simétrica (valor absoluto).

**Fonte.** Mestre §24. Nenhum valor consta.

**Legado.** Sem janela: qualquer valor local era confrontado com a pontuação guardada. **LEGADO.**

**Conflitos.** Janela estreita exclui muitas coletas reais; janela larga compara estados clínicos distintos; assimetria (só coleta posterior, por exemplo) exige extensão do motor (hoje só `max_days` absoluto).

**Opções tecnicamente possíveis.** (a) janela global única (`max_days` = ___); (b) janela por domínio; (c) assimétrica (antes ≠ depois) — extensão pequena do payload; (d) sem janela (regra `temporal` ausente) — **o motor aceita qualquer distância**.

**Incompatíveis com o Mestre.** (d) como regra oficial (temporalidade é exigida); janela deduzida da data de registro em vez da data clínica.

**Consequência.** Cada resultado fora da janela sai da contagem de suficiência; se todos saem, `sem_dados_suficientes`. O valor numérico **fica em branco** aqui.

**Bloqueado enquanto aberto.** Avaliabilidade de qualquer domínio.

DECISÃO: ______ (dias: ______ · escopo: ______ · simetria: ______)
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 6 — Política para múltiplas coletas na janela

**O que decidir.** Quando mais de uma coleta selecionada está na janela com o mesmo exame: usar a mais próxima da aplicação, a mais recente, todas (cada resultado conta), ou exigir escolha humana.

**Por quê.** Afeta a contagem de suficiência e de "fora"/"dentro".

**O que existe.** Motor conta **cada resultado** incluído (um exame repetido em duas coletas conta duas vezes). UI permite marcar N coletas. Nenhuma regra de deduplicação.

**Fonte.** Mestre §22 (coletas independentes), §24.

**Legado.** O painel legado só tinha "valores atuais" (a última registrada por `updated_at`) — **LEGADO / INCOMPATÍVEL** (escolha por data de edição).

**Conflitos.** "Mais recente" e "mais próxima da aplicação" divergem quando a coleta é posterior à aplicação; "todas" infla a suficiência; "escolha humana" exige UI por exame.

**Opções tecnicamente possíveis.** (a) um resultado por (exame, variante, material) por domínio, escolhido pela proximidade com `quando` da aplicação — extensão pequena do motor; (b) idem, pelo mais recente em `clinical_date`; (c) todos contam (como hoje); (d) exigir que a profissional selecione uma única coleta por exame (UI).

**Incompatíveis com o Mestre.** Qualquer escolha por `updated_at`/`created_at`.

**Consequência.** (a)/(b) suficiência = nº de exames distintos; (c) suficiência = nº de resultados; (d) sem decisão automática.

**Bloqueado enquanto aberto.** Contagens dos blocos 16–19 ficam ambíguas.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 7 — Referência laboratorial elegível (do laudo)

**O que decidir.** Se a referência **do laudo** (digitada pela profissional por resultado) é elegível para classificar um resultado dentro da Leitura Integrada; se exige mínimo e máximo, se aceita operador único (`<`, `≥`), se exige unidade igual à do valor, se aceita população informada.

**Por quê.** É a única referência existente; sem referência elegível não há `below/within/above`.

**O que existe.** `report_reference_text/min/max/operator/unit/population`, `reference_status informed|missing`, `reference_source = laudo`. Motor classifica com limites inclusivos; operador `<`/`≤`/`>`/`≥` respeitado; unidade da referência ≠ unidade do valor → `incompatible_unit`. Vínculo pode apontar `reference_id` (metodológica), senão o motor usa a do laudo.

**Fonte.** Mestre §21/§23 (referência do laudo é fato do documento); REFERENCIAS-E-UNIDADES.md §1.

**Legado.** Não existia; o legado usava só o "ideal" do CSV. **LEGADO.**

**Conflitos.** Referências de laboratórios diferentes para o mesmo exame não são equivalentes; a mesma profissional pode digitar referências distintas em duas coletas; referência só com um lado (`< 5`) classifica só "acima"/"não acima".

**Opções tecnicamente possíveis.** (a) referência do laudo elegível tal como informada; (b) elegível só com min e max; (c) elegível só quando a unidade do laudo é igual à do valor (já é o comportamento); (d) não elegível na LI — só metodológica (bloco 8).

**Incompatíveis com o Mestre.** Inventar referência quando o laudo não traz; tratar ausência como "dentro"; usar `legacy_ideal_*`.

**Consequência.** (a) mais resultados classificáveis, comparabilidade entre coletas depende do bloco 25. (b)/(c) menos resultados entram. (d) LI inoperante até o bloco 8 ter conteúdo.

**Bloqueado enquanto aberto.** Classificação de todo resultado.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 8 — Referência metodológica elegível

**O que decidir.** Se a V1 terá referências metodológicas próprias (por exame/variante/material/método/população/sexo/idade/contexto), com fonte, versão e vigência; quem as aprova; e a prioridade entre metodológica e do laudo quando ambas existem.

**Por quê.** Sem decisão, `lab_method_references` segue vazia e só a referência do laudo classifica.

**O que existe.** Tabela com `lower/upper_bound`, `operator`, `unit`, `source`, `source_version`, `justification`, `effective_from/to`, `status` (CHECK: aprovado exige responsável, provenance, hash e vigência), **0 linhas**, sem GRANT de escrita para a aplicação, sem botão. Motor só usa `status = aprovado` (`reference_not_approved` caso contrário); vínculo aponta `reference_id`.

**Fonte.** Mestre §23 (faixas e referências são decisão metodológica); REFERENCIAS-E-UNIDADES.md §2.

**Legado.** `ideal_min/ideal_max` do CSV ("literatura funcional — revisar", `rascunho`): **LEGADO / INCOMPATÍVEL** (sem fonte homologada). Preservado só em `legacy_ideal_*`.

**Conflitos.** Referência metodológica "funcional" diferente da do laudo pode classificar como "fora" um valor que o laudo chama de normal (e vice-versa); texto ao paciente precisa dizer qual referência foi usada.

**Opções tecnicamente possíveis.** (a) nenhuma referência metodológica na V1 (laudo apenas); (b) referências metodológicas aprovadas por migration versionada, com fonte por linha, prioridade sobre o laudo quando vinculadas; (c) idem, prioridade do laudo; (d) ambas mostradas, classificação só pela escolhida no vínculo.

**Incompatíveis com o Mestre.** Importar o "ideal" legado como referência; referência sem fonte/versão/vigência; aprovação sem responsável humano.

**Consequência.** (a) a leitura depende da qualidade dos laudos digitados. (b)/(c)/(d) exigem decisão **por exame**, com valor, unidade, fonte e população — **nenhum valor é proposto aqui**.

**Bloqueado enquanto aberto.** Qualquer classificação que não seja pela referência do laudo.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 9 — Política quando não há referência

**O que decidir.** O que acontece com um resultado sem referência do laudo e sem referência metodológica aprovada: excluído da leitura (hoje), conta como "não classificável" visível, bloqueia o domínio, ou gera pedido de complementação à profissional.

**O que existe.** Motor: `not_classifiable / missing_reference`; LI exclui o resultado (`sem_referencia_utilizavel`) e segue com os demais. **Ausência nunca é "dentro".**

**Fonte.** Mestre §23; REFERENCIAS-E-UNIDADES.md §1.

**Legado.** Toda linha legado tem `reference_status = missing` (o legado nunca guardou referência do laudo).

**Conflitos.** Excluir silenciosamente pode fazer um domínio parecer "suficiente" com poucos itens; bloquear o domínio inteiro por um item sem referência penaliza coletas incompletas.

**Opções tecnicamente possíveis.** (a) excluir e listar em `excluded_items` (como hoje); (b) excluir e tornar o domínio `sem_dados_suficientes` se qualquer vinculado estiver sem referência — extensão pequena; (c) aviso à profissional antes do cálculo para completar a referência (UI).

**Incompatíveis com o Mestre.** Assumir "dentro"; usar `legacy_ideal_*` como fallback.

**Consequência.** (a) suficiência conta só classificáveis. (b) mais domínios `sem dados`. (c) mais trabalho de digitação, mais resultados classificáveis.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 10 — Conversões de unidade permitidas

**O que decidir.** Quais conversões (de → para, fator, por exame quando o fator depende do analito), com fonte e versão, são aprovadas; quem aprova.

**O que existe.** `lab_unit_conversion_rules` (`exam_code` opcional, `from_unit`, `to_unit`, `factor`, `source`, `rule_version`, `status`): **0 linhas**. Motor converte só com `status = aprovado`; trace guarda valor/unidade original e convertido e a versão da regra. Unidades diferentes sem regra → `incompatible_unit` (não classificável; comparação só lado a lado). Provado por `TEST_FIXTURE_ONLY`.

**Fonte.** Mestre §21/§23; REFERENCIAS-E-UNIDADES.md §4.

**Legado.** Sem conversão: o CSV fixava uma unidade por exame e o valor era digitado "na unidade do CSV". **LEGADO.**

**Conflitos.** Fatores dependem do analito (massa ↔ molar) e às vezes do método; conversão errada é erro silencioso. Unidades textuais variam entre laudos ("mg/dL", "mg/dl", "mg por dL") — normalização textual não é conversão e também não existe.

**Opções tecnicamente possíveis.** (a) nenhuma conversão na V1 (igualdade textual de unidade exigida); (b) lista fechada de conversões aprovadas por migration, por exame; (c) normalização apenas ortográfica de unidade (maiúsculas/minúsculas, espaços) — extensão pequena, **não é conversão**, precisaria de decisão própria.

**Incompatíveis com o Mestre.** Fator sem fonte; conversão genérica sem `exam_code` para analitos em que o fator depende do analito; conversão aplicada ao valor original gravado (o original nunca é alterado).

**Consequência.** (a) resultados em unidade diferente da referência ficam fora. (b) cada regra é auditável no trace. (c) reduz falsos "incompatíveis" por grafia.

**Bloqueado enquanto aberto.** Classificação e comparação entre unidades diferentes.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 11 — Compatibilidade de variante

**O que decidir.** Se variantes do mesmo exame (PCR × PCR ultrassensível; Magnésio × Magnésio eritrocitário; outras que surjam) são equivalentes para fins de vínculo, classificação e comparação longitudinal, ou identidades distintas.

**O que existe.** `variant` explícita por resultado; identidade única por (exame, variante, material); motor: referência que declara variante diferente → `incompatible_variant`; vínculo pode fixar variante (`variant` não nulo) ou aceitar qualquer (nulo). Comparação longitudinal exige mesma variante.

**Fonte.** Mestre §21; CATALOGO-45-V1.md.

**Legado.** PCR-us (EXA-002) e Mg eritrocitário (EXA-022) eram itens próprios; a migração os preserva como variante de LAB-016 e LAB-021.

**Conflitos.** Tratar como equivalentes mistura métodos de sensibilidade diferente e compartimentos diferentes (sérico × eritrocitário); tratar como distintas exige vínculo por variante.

**Opções tecnicamente possíveis.** (a) variantes são identidades distintas (como hoje; vínculo por variante); (b) vínculo aceita qualquer variante (`variant = null`) mas comparação longitudinal continua por variante; (c) lista de equivalências aprovadas (extensão: tabela de equivalência, inexistente hoje).

**Incompatíveis com o Mestre.** Achatar variante sem decisão; inventar variante para linha legado.

**Consequência.** (a) PCR sem variante e PCR-us nunca se somam nem se comparam. (b) ambos contam para o domínio, mas separadamente na Evolução. (c) exige tabela nova e fonte.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 12 — Compatibilidade de material

**O que decidir.** Se materiais diferentes (soro, plasma, sangue total, eritrócitos, urina…) do mesmo exame são compatíveis para vínculo, classificação e comparação; se material ausente (`null`) é compatível com material informado.

**O que existe.** `material` explícito, nunca inventado; motor: referência que declara material diferente → `incompatible_material`; chave presente com valor nulo na referência exige material nulo no resultado. Migração do Mg eritrocitário: material **nulo** (não inventado).

**Fonte.** Mestre §21; MODELO-COLETA-RESULTADO.md.

**Legado.** Material nunca existiu no legado.

**Conflitos.** Exigir material igual exclui todo o legado (material nulo); aceitar nulo como "qualquer" pode comparar compartimentos distintos.

**Opções tecnicamente possíveis.** (a) material faz parte da identidade (como hoje); nulo só casa com nulo; (b) nulo compatível com qualquer material informado; (c) lista de equivalências (soro ≈ plasma para exames listados) — extensão.

**Incompatíveis com o Mestre.** Inventar material para linhas sem informação.

**Consequência.** (a) legado só se compara com legado. (b) mais comparações, menos rigor. (c) exige fonte por exame.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 13 — Compatibilidade de método

**O que decidir.** Para quais exames o método analítico é relevante (resultados de métodos diferentes não são comparáveis nem classificáveis pela mesma referência) e como isso é declarado.

**O que existe.** `method` texto livre por resultado; referência metodológica pode marcar `method_relevant = true` → método diferente → `incompatible_method`. Sem marca, método é ignorado. Nenhuma lista de métodos.

**Fonte.** Mestre §21.

**Legado.** Inexistente.

**Conflitos.** Método em texto livre varia ("quimioluminescência", "CLIA"); exigir igualdade textual gera falsos incompatíveis; ignorar método mistura técnicas em exames sensíveis a isso.

**Opções tecnicamente possíveis.** (a) método ignorado salvo `method_relevant` na referência metodológica (como hoje); (b) lista de exames com método relevante, mesmo com referência do laudo — extensão pequena (flag por vínculo); (c) vocabulário controlado de métodos (extensão).

**Incompatíveis com o Mestre.** Inventar método.

**Consequência.** (a) só com referência metodológica. (b)/(c) mais rigor, mais digitação.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 14 — Resultados qualitativos

**O que decidir.** Se e como resultados textuais ("Negativo", "Reagente", "Não detectado", "Positivo", títulos "1/80") entram na Leitura Integrada: excluídos, mapeados para `within/out` por tabela aprovada por exame, ou só exibidos.

**O que existe.** `qualifier = text`, valor preservado; motor: `not_classifiable / qualitative_without_rule`; excluído da LI. Nunca `Negativo = 0`.

**Fonte.** Mestre §23.

**Legado.** O legado só aceitava número (`valor numeric not null`); qualitativos não eram registráveis.

**Conflitos.** Vocabulário varia por laboratório; "Reagente" pode ser esperado ou não conforme o exame.

**Opções tecnicamente possíveis.** (a) excluídos da LI (como hoje); (b) tabela aprovada de mapeamento por exame (texto → estado), inexistente hoje — extensão; (c) exibidos ao lado da leitura, sem contar.

**Incompatíveis com o Mestre.** Conversão implícita para número; regra sem fonte.

**Consequência.** (a) os 45 do catálogo que costumam ser qualitativos nunca contam. (b) exige decisão por exame e por vocabulário.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 15 — Resultados censurados

**O que decidir.** Como entram valores "< 0,10", "> 2000", "abaixo do limite de quantificação": excluídos (hoje), classificados pela direção do censor contra a referência quando inequívoco (ex.: "< 0,10" com referência "< 3" ⇒ dentro), ou só exibidos.

**O que existe.** `qualifier ∈ lt|lte|gt|gte`, `censor_limit`, `numeric_value` nulo (CHECK); motor: `not_classifiable / censored_value`.

**Fonte.** Mestre §23; MODELO-COLETA-RESULTADO.md.

**Legado.** Não registrável (número obrigatório); na prática o usuário digitava o limite como valor — perda de informação que a V1 impede.

**Conflitos.** "< 0,10" contra referência "0,05–0,20" é indecidível; contra "< 3" é decidível. Regra parcial exige lógica de intervalos.

**Opções tecnicamente possíveis.** (a) excluídos (como hoje); (b) classificação só quando o intervalo censurado está inteiramente de um lado da referência — extensão pequena do motor; (c) exibidos sem contar.

**Incompatíveis com o Mestre.** Substituir por `censor_limit`, `limite/2` ou 0.

**Consequência.** (a) marcadores frequentemente censurados nunca contam. (b) mais inclusão, trace precisa registrar a lógica.

**Bloqueado enquanto aberto.** Nada tecnicamente (default atual é (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 16 — Suficiência mínima por domínio

**O que decidir.** A partir de quantos resultados classificáveis (ou de qual fração dos exames vinculados) um domínio é avaliável. **Valor em branco.**

**Por quê.** Sem regra `sufficiency` aprovada o motor devolve `sem_regra_homologada`.

**O que existe.** `integrated_reading_rules` tipo `sufficiency`, `payload.min_results` (número absoluto), global ou por domínio: **0 linhas**. Trace: `sufficiency = { min_results, included }`. Fração/percentual **não** existe no motor (extensão pequena).

**Fonte.** Mestre §24 (suficiência é exigida). Nenhum valor consta.

**Legado.** `doSistema.length ≥ 1` — **um exame bastava** para avaliar o sistema. **LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO.** Não é default.

**Conflitos.** Absoluto não considera quantos exames o domínio tem; fração não funciona para domínios pequenos; "maioria" muda de significado com o bloco 6.

**Arquiteturas tecnicamente possíveis (valores em branco).**
- (A) mínimo absoluto global: `min_results = ___`.
- (B) mínimo absoluto por domínio: `min_results(domínio) = ___`.
- (C) fração dos exames vinculados ao domínio: `___ %` — extensão do payload.
- (D) conjunto obrigatório (bloco 17) + mínimo.

**Consequência matemática.** Com N resultados classificáveis incluídos: (A)/(B) avaliável se `N ≥ min`; (C) avaliável se `N / vinculados ≥ fração`; (D) avaliável se todos os obrigatórios presentes e `N ≥ min`. Se não avaliável → `sem_dados_suficientes` (com `sufficiency` no trace). Um domínio com 1 exame vinculado e `min = 1` reproduz o legado — **isto precisa ser uma decisão explícita, não herança**.

**Bloqueado enquanto aberto.** Qualquer estado diferente de `sem_dados_suficientes`.

DECISÃO: ______ (arquitetura: ______ · valor: ______)
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 17 — Número/conjunto mínimo de exames

**O que decidir.** Se, além da contagem (bloco 16), há exames **obrigatórios** por domínio (sem os quais o domínio não é avaliável) e qual é esse conjunto.

**O que existe.** Não existe "obrigatório" no vínculo (extensão pequena: flag `required` no link). Catálogo **não é painel obrigatório** (decisão 68 da Etapa 5).

**Fonte.** Mestre §21 (não há painel universal), §24.

**Legado.** Inexistente.

**Conflitos.** Obrigatoriedade por domínio não é "checklist dos 45"; mas precisa ser comunicada à profissional sem virar solicitação automática de exame (Conduta não gera pedido).

**Opções tecnicamente possíveis.** (a) nenhum obrigatório; (b) obrigatórios por domínio via flag no vínculo; (c) grupos alternativos (um de A ou um de B) — extensão maior.

**Incompatíveis com o Mestre.** Tratar ausência de obrigatório como alteração; gerar solicitação de exame.

**Consequência.** (b) domínio sem o obrigatório → `sem_dados_suficientes` mesmo com N alto.

**Bloqueado enquanto aberto.** Nada tecnicamente (default (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 18 — Tratamento de exames ausentes

**O que decidir.** Como exames vinculados mas não coletados são tratados: ignorados na contagem (hoje), mostrados como "não coletado" no trace e na tela, ou considerados na fração do bloco 16(C).

**O que existe.** Motor só olha resultados presentes; ausentes não aparecem (não há `excluded` para "não coletado"). Ausência **não** é alteração (Mestre, decisão 68).

**Fonte.** Mestre §21.

**Legado.** `sem_exame` só quando nenhum exame do sistema; ausências parciais ignoradas.

**Opções tecnicamente possíveis.** (a) ignorar (como hoje); (b) listar no trace/tela os vinculados não coletados — extensão pequena; (c) entrar no denominador da fração (bloco 16C).

**Incompatíveis com o Mestre.** Ausência = fora; ausência gera pedido automático.

**Consequência.** (b) transparência sem efeito no estado; (c) efeito direto na suficiência.

**Bloqueado enquanto aberto.** Nada tecnicamente (default (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 19 — Tratamento de resultados mistos

**O que decidir.** Quando, no mesmo domínio, há resultados "fora" e "dentro": como se define "laboratório alterado". Política: qualquer fora; maioria; fração; só direção relevante; insuficiente (não decide).

**Por quê.** Sem regra `mixed` aprovada, mistos → `dados_mistos_sem_regra` → `sem_dados_suficientes`.

**O que existe.** Regra tipo `mixed`, `payload.policy ∈ majority | insufficient`: **0 linhas**. Motor: `majority` ⇒ alterado se `fora > dentro`; `insufficient` ⇒ `sem_dados_suficientes`; sem mistos (todos fora ou todos dentro) a regra não é consultada e "alterado" = `fora > 0`. Direção do vínculo já filtra o que conta como "fora" (acima/abaixo/qualquer). Fração e empate (`fora = dentro`) não estão parametrizados (hoje empate = não alterado em `majority`).

**Fonte.** Mestre §24 (resultados mistos exigem tratamento aprovado).

**Legado.** "qualquer fora" (`alterados > 0`). **LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO.** Não é default.

**Conflitos.** "Qualquer fora" é sensível a um único valor; "maioria" depende do nº de exames e do bloco 6; empate precisa de regra explícita.

**Opções tecnicamente possíveis.** (a) `insufficient` (mistos nunca decidem); (b) `majority` (empate = não alterado, ou definir empate — extensão); (c) `any_out` (qualquer fora) — **existe no motor só como comportamento sem mistos; como política para mistos exigiria ser declarada e aprovada**; (d) fração `___ %` — extensão; (e) por direção: só valores na direção do vínculo contam (já é o comportamento quando `direction ≠ any`).

**Incompatíveis com o Mestre.** Herdar "qualquer fora" sem decisão; política não versionada.

**Consequência.** (a) mais `sem dados`; (b) depende de N; (c) reproduz o legado; (d)/(e) exigem definição de denominador e direção.

**Bloqueado enquanto aberto.** Qualquer domínio com resultados mistos.

DECISÃO: ______ (política: ______ · empate: ______)
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 20 — Regra formal de CONVERGENTE

**O que decidir.** Definição formal de "HOLOSCAN alterado" para um domínio (nota ≤ X, faixa específica, Índice, outro) e a condição de convergência: `laboratório alterado ∧ HOLOSCAN alterado`; e se `laboratório não alterado ∧ HOLOSCAN não alterado` também é convergente (como no legado) ou um estado próprio.

**O que existe.** Regra tipo `convergence`, `payload.holoscan_max_nota` (nota ≤ X) **ou** `payload.holoscan_faixa` (faixa igual a), por domínio ligado a `holoscan_system`: **0 linhas**. Motor: `convergente` quando `labAlterado == holoAlterado` (**inclui** o caso "ambos não alterados"), `divergente` caso contrário; sem regra → `sem_regra_homologada`; sistema sem nota → `holoscan_nao_avaliavel`. Notas e faixas do HOLOSCAN vêm do HOLOS-V1@2 (faixas decididas na Etapa 4.2, ainda `em_revisao`).

**Fonte.** Mestre §24; Etapa 4.2 (faixas e notas do HOLOSCAN).

**Legado.** `nota ≤ 3` (escala 0–10 do motor L1) × `alterados > 0`; "ambos ok" também era "Convergente". **LEGADO / INCOMPATÍVEL COMO REGRA OFICIAL SEM HOMOLOGAÇÃO.** A escala e as faixas do HOLOS-V1@2 **não são** as do motor L1 — o corte 3 não é transportável sem decisão.

**Conflitos.** Corte por nota depende da escala do pacote aprovado; faixa depende da nomenclatura decidida na 4.2; convergência "ambos normais" pode ser lida como "saudável" (texto precisa evitar isso — bloco 23); domínio sem `holoscan_system` precisa de regra que nomeie o(s) sistema(s).

**Opções tecnicamente possíveis.** (a) `holoscan_max_nota = ___` por domínio; (b) `holoscan_faixa = ___` por domínio; (c) separar "convergente com alteração" de "convergente sem alteração" como estados/textos distintos — extensão pequena (hoje é um só estado); (d) convergência só no caso "ambos alterados", "ambos não alterados" vira estado neutro — extensão.

**Incompatíveis com o Mestre.** Convergente = diagnóstico; convergente alterar nota/Índice/Tríada; usar nota de pacote não aprovado como saída oficial.

**Consequência.** (a)/(b) decidem quantos pacientes caem em "HOLOSCAN alterado"; (c)/(d) mudam o número de estados exibidos e os textos.

**Bloqueado enquanto aberto.** Qualquer `convergente`.

DECISÃO: ______ (critério HOLOSCAN alterado: ______ · "ambos não alterados" = ______)
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 21 — Regra formal de DIVERGENTE

**O que decidir.** Se divergente é simplesmente `labAlterado ≠ holoAlterado` (hoje) ou se os dois sentidos são tratados de forma diferente: (i) HOLOSCAN alterado + laboratório não alterado; (ii) HOLOSCAN não alterado + laboratório alterado. E se há exigência adicional (por exemplo suficiência maior) para declarar divergência.

**O que existe.** Motor: um só estado `divergente` para os dois sentidos; o trace guarda `labAlterado`/`holoAlterado`, permitindo distinguir na tela sem mudar o motor.

**Fonte.** Mestre §24.

**Legado.** Os dois sentidos eram `diverge`, com textos causais distintos ("o que a anamnese não pega" / "o sintoma é anterior ao marcador") — **LEGADO; textos causais incompatíveis**.

**Conflitos.** Divergência não hierarquiza relato × exame; qualquer texto que sugira "o exame desmente o paciente" ou "o paciente exagera" é incompatível; sentido (ii) tende a ser lido como "achado silencioso" — leitura causal.

**Opções tecnicamente possíveis.** (a) estado único (como hoje), texto neutro único; (b) estado único com sub-rótulo pelo sentido (trace já permite); (c) dois estados distintos — extensão pequena; (d) exigir suficiência reforçada para divergente — extensão.

**Incompatíveis com o Mestre.** Divergente invalidar relato ou exame; texto causal; divergente gerar alerta no dashboard (retirado na Etapa 0).

**Consequência.** (b)/(c) mais informação à profissional, mais textos a homologar (bloco 23).

**Bloqueado enquanto aberto.** Qualquer `divergente`.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 22 — Regra formal de SEM DADOS SUFICIENTES

**O que decidir.** Confirmar a lista fechada de motivos que forçam `sem_dados_suficientes` e se algum motivo deve ser exibido de forma diferente (ex.: "sem regra homologada" vs "fora da janela").

**O que existe.** Motivos do motor: `sem_regra_homologada`, `sem_associacao_aprovada`, `sem_referencia_utilizavel`, `fonte_ausente`, `incompatibilidade_temporal`, `dados_mistos_sem_regra`, `holoscan_nao_avaliavel`, `unidade_incompativel`. Hoje é o **único estado real**. Servidor recusa salvar `convergente/divergente` sem vínculo aprovado em pacote aprovado.

**Fonte.** Mestre §24; LEITURA-INTEGRADA-CONTRATO.md.

**Legado.** `sem_exame` apenas (sem exame ou sem nota). **LEGADO** — não cobria regra, referência, compatibilidade, janela nem mistos.

**Opções tecnicamente possíveis.** (a) confirmar a lista e os rótulos neutros atuais; (b) acrescentar motivos (ex.: `exame_obrigatorio_ausente`, `coleta_nao_revisada`) conforme blocos 4 e 17 — extensão pequena; (c) agrupar motivos na tela.

**Incompatíveis com o Mestre.** Qualquer caminho em que a falta de peça produza convergente/divergente; "divergente por falta".

**Consequência.** Nenhuma no estado; só na transparência.

**Bloqueado enquanto aberto.** Nada (o estado é obrigatório e já é o comportamento).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 23 — Textos exibidos à profissional

**O que decidir.** Texto oficial, por estado (e por domínio, se for o caso), mostrado na ficha, no Confronto e no relatório clínico; obrigatoriamente neutro (sem causa, sem diagnóstico, sem conduta).

**O que existe.** Regra tipo `text`, `payload.{convergente, divergente, sem_dados_suficientes}`, global ou por domínio: **0 linhas**. Sem texto aprovado, a UI mostra só o estado, os motivos e o trace. Barreira de Conduta: nada gerado automaticamente ("recomenda", "prescreve", "solicite", "encaminhe", "suplementar" não existem).

**Fonte.** Mestre §30/§36 (texto só como proposta identificada), Etapa 0 (nenhum texto conclui "saudável/normal").

**Legado.** Os 4 textos fixos de `HOLOSCAN_TEXTO` (listados acima) e os textos causais de `confrontar()`/CSV. Os 4 fixos já são neutros, mas **LEGADO: só entram se aprovados aqui**; os causais são **INCOMPATÍVEIS**.

**Conflitos.** "Convergente sem alteração" pode ser lido como "sem prioridade" (Etapa 0: redação pendente de Rodrigo); texto por domínio exige nomenclatura dos domínios (bloco 1).

**Opções tecnicamente possíveis.** (a) um texto global por estado; (b) texto por domínio; (c) texto distinto por sentido da divergência (bloco 21) e por "convergente com/sem alteração" (bloco 20c) — extensão de payload.

**Incompatíveis com o Mestre.** Texto causal; texto que conclua diagnóstico, normalidade ou prioridade; texto com conduta.

**Bloqueado enquanto aberto.** Exibição de texto; relatório mostra só estado + motivos.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 24 — Textos exibidos ao paciente

**O que decidir.** Se a Leitura Integrada aparece em algum material voltado ao paciente (relatório entregue, resumo) e, se sim, com qual texto — ou se é restrita à profissional na V1.

**O que existe.** Nenhuma superfície voltada ao paciente mostra a LI; o relatório clínico (Etapa 3) é da profissional e inclui a LI só se salva e selecionada, e hoje só `sem_dados_suficientes`.

**Fonte.** Mestre §36 (prontuário), §30.

**Legado.** Nenhum texto ao paciente.

**Opções tecnicamente possíveis.** (a) LI não aparece ao paciente na V1; (b) aparece só o estado com texto aprovado específico; (c) aparece com explicação do que convergente/divergente **não** significa.

**Incompatíveis com o Mestre.** Texto que o paciente leia como diagnóstico, culpa ("você relata mas o exame não mostra") ou conduta.

**Bloqueado enquanto aberto.** Nada (default (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 25 — Comparabilidade longitudinal da própria Leitura Integrada

**O que decidir.** Se duas leituras salvas do mesmo paciente podem ser comparadas (mesma versão de pacote, mesmos domínios, mesma aplicação ou aplicações distintas) e o que é exibido ("mudou de estado", nunca "melhorou").

**O que existe.** `integrated_readings` congela `rule_package_id + rule_version`, `engine_version`, aplicação, coletas, referências e trace; revisão por `supersedes_id`. Nenhuma comparação entre leituras existe na Evolução (só comparação de resultados laboratoriais, pelo `LabMotor`).

**Fonte.** Mestre §24, §34.2 (versionamento), Etapa 4.2 (comparabilidade do HOLOSCAN: mesma estrutura).

**Legado.** Inexistente (nada era salvo).

**Opções tecnicamente possíveis.** (a) sem comparação na V1; (b) comparação só entre leituras do mesmo `rule_package_id/rule_version`, lado a lado por domínio, rótulo neutro "estado anterior → estado atual"; (c) incluir leituras de versões diferentes, marcadas como não comparáveis.

**Incompatíveis com o Mestre.** "melhorou/piorou"; comparar versões de regra distintas como se iguais; escolha por `updated_at`.

**Bloqueado enquanto aberto.** Nada (default (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 26 — Cálculos derivados

**O que decidir.** Se algum cálculo derivado entra na V1 (HOMA-IR, LDL calculado, razões, índices), com fórmula, versão, entradas obrigatórias, unidades exigidas, critérios de validade e fonte; e se o derivado pode receber vínculo a domínio.

**O que existe.** `lab_derived_calculations` (`code`, `formula`, `formula_version`, `inputs`, `required_units`, `criteria`, `source`, `status`): **0 linhas**; nenhum cálculo é ativado por presença de componentes; o motor laboratorial não calcula nada. HOMA-IR legado preservado como `additional_legacy` (bloco 28).

**Fonte.** Mestre §21 (fora dos 45), §23.

**Legado.** HOMA-IR como item digitado (EXA-007) — **LEGADO**; nunca calculado pelo sistema.

**Conflitos.** Derivado exige unidades fixas das entradas (bloco 10) e mesma coleta; fórmula sem versão é irreproduzível.

**Opções tecnicamente possíveis.** (a) nenhum derivado na V1; (b) derivados aprovados por migration, calculados pelo motor com trace (extensão do `LabMotor`: função de cálculo lendo `lab_derived_calculations`) e exibidos como derivados, sem vínculo; (c) idem, com vínculo a domínio como qualquer exame.

**Incompatíveis com o Mestre.** Fórmula sem fonte/versão; cálculo automático com entradas em unidades não verificadas; derivado digitado tratado como calculado.

**Bloqueado enquanto aberto.** Qualquer derivado.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 27 — Exames adicionais/customizados

**O que decidir.** Se exames customizados por profissional (`lab_custom_exams`) podem, em algum caso, receber vínculo a domínio ou referência metodológica; ou permanecem registro factual sem leitura.

**O que existe.** Custom exam: dado do dono, não global, sem regra/referência/vínculo; vínculo (`exam_code` FK no catálogo) **não aceita** custom. Comparação longitudinal de custom funciona pelo `LabMotor` (mesma identidade).

**Fonte.** Mestre §21.

**Legado.** Inexistente.

**Opções tecnicamente possíveis.** (a) nunca entram na LI (como hoje); (b) promoção a catálogo-base por migration (vira LAB-046+, decisão de catálogo, não de LI); (c) vínculo a custom — extensão de schema, **incompatível** com "catálogo global aprovado".

**Incompatíveis com o Mestre.** Regra por profissional; vínculo sem fonte; custom alterar contagem dos 45.

**Bloqueado enquanto aberto.** Nada (default (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 28 — Legado fora dos 45: Candida IgG, VHS, HOMA-IR, Cortisol matinal

**O que decidir.** Destino desses 4 itens (EXA-001, EXA-003, EXA-007, EXA-024): permanecem `additional_legacy` (histórico visível, sem leitura), entram no catálogo-base por migration (passaria a 46–49, exigindo nova decisão de catálogo), ou viram custom exams da profissional.

**O que existe.** Resultados antigos preservados com `origin = additional_legacy`, `exam_code` nulo, `legacy_*` preenchidos; visíveis no histórico, HOLOS AI (fato), Evolução (comparação legado × legado). Nenhum vínculo possível (não têm `exam_code`). Catálogo = 45 fixo (decisão 68).

**Fonte.** Mestre §21 (lista dos 45 não os inclui).

**Legado.** Vínculos legados: Candida → fungico; VHS → acido_inflamatorio; HOMA-IR → metabolico; Cortisol → mental_emocional_espiritual. **LEGADO, não homologado.**

**Opções tecnicamente possíveis.** (a) manter `additional_legacy`; (b) inclusão no catálogo-base por migration (reabre decisão 68); (c) migração para custom exam de quem registrou (perde o caráter global; identidade preservada).

**Incompatíveis com o Mestre.** Entrar na LI sem estar no catálogo aprovado; herdar vínculo legado.

**Bloqueado enquanto aberto.** Nada (default (a)).

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 29 — Insulina de jejum (EXA-006) ↔ Insulina basal (LAB-003)

**Estado exato da migração (sem decidir).**
- `motor/bancos/exames.csv`: EXA-006 "Insulina de jejum", sistema `metabolico`, unidade `uUI/mL`.
- Catálogo-base: LAB-003 "Insulina basal" (categoria Glicêmico), sem alias "Insulina de jejum".
- `laboratorio-catalogo.js` `MAPA_LEGADO["EXA-006"] = { code: "LAB-003", requires_manual_mapping: true, nota: "Insulina de jejum × Insulina basal: confirmar identidade" }` — o `code` ali é **sugestão para o revisor humano**, não mapeamento.
- `lab_mapear_legado('EXA-006')` (SQL) devolve `exam_code = null`, `origin = legacy_migrated`, `requires_manual_mapping = true`, `mapping_note = 'Insulina de jejum × Insulina basal (LAB-003): confirmar identidade'`. O servidor falso faz o mesmo (`exam_code` nulo quando `requires_manual_mapping`).
- Resultado: toda linha legado de EXA-006 (migrada ou gravada pelo painel legado) fica com `exam_code` **nulo**, valor original/numérico preservados, `legacy_exame_id = 'EXA-006'`, marcada para mapeamento manual. **Não** entra em vínculo, classificação ou comparação com LAB-003. Nenhum teste prova equivalência clínica. Cobertura de teste hoje: `testar-v1-etapa5-motor.mjs` prova só a **flag** `requires_manual_mapping` no `MAPA_LEGADO`; o harness local (L24–L27, L42–L43) cobre EXA-002, EXA-005, EXA-007 e EXA-022, **não** a linha migrada de EXA-006. Lacuna de teste registrada (não corrigida nesta etapa, que é documental): um check SQL provando `exam_code is null and requires_manual_mapping` para EXA-006 após a migration.

**O que decidir.** Se "Insulina de jejum" e "Insulina basal" são a **mesma identidade** (alias seguro → mapear EXA-006 → LAB-003 por migration, sem variante), identidades distintas (variante de LAB-003, ex.: `jejum`, ou custom exam), ou se permanece pendente.

**Por que não é alias automático.** Alias no catálogo é só nome alternativo do **mesmo** exame; "basal" e "de jejum" podem ou não designar a mesma condição de coleta conforme o laboratório. A Etapa 5 não encontrou fonte no repositório que prove a identidade; portanto **requer decisão manual**.

**Legado.** EXA-006 → metabolico. **LEGADO.**

**Opções tecnicamente possíveis.** (a) alias seguro: migration adiciona alias "Insulina de jejum" a LAB-003 e remapeia as linhas marcadas (`requires_manual_mapping → false`, `exam_code = LAB-003`); (b) variante: `exam_code = LAB-003`, `variant = 'jejum'` (comparação com "basal" sem variante não automática); (c) manter pendente (como hoje); (d) custom exam.

**Incompatíveis com o Mestre.** Remapear sem fonte; apagar `legacy_exame_id`.

**Consequência.** (a) EXA-006 passa a contar onde LAB-003 contar; (b) só onde houver vínculo da variante; (c) nunca conta.

**Bloqueado enquanto aberto.** Uso de EXA-006 em qualquer leitura.

DECISÃO: ______
JUSTIFICATIVA: ______
RESPONSÁVEL: ______
DATA: ______

---

## BLOCO 30 — Processo de homologação do pacote da Leitura Integrada

**O que decidir.** Quem aprova o pacote LI (e as referências metodológicas, conversões e derivados): se o processo de dupla aprovação da Etapa 4.2 (Aprovação 1 Daniel → Aprovação 2 Rodrigo, mesmo `package_id/version/content_hash`, invalidação se o conteúdo mudar) é **reutilizado** para a LI; como o `content_hash` da LI é calculado; o que invalida um ciclo.

**O que existe.**
- `integrated_reading_rule_packages`: `status ∈ rascunho|em_revisao|aprovado|retirado`, `content_hash`, `responsible`, `approval_provenance`; CHECK: `aprovado` exige os três. **Nenhuma RPC** de aprovação, **nenhum cálculo de hash**, **nenhuma invalidação automática**, **nenhum botão** existem para a LI. Mesma situação para `lab_method_references`, `lab_unit_conversion_rules`, `lab_derived_calculations`.
- Etapa 4.2 (`methodology_package_approvals`, `registrar_aprovacao_metodologica`, `metodologia_hash_conteudo`, `aprovar_pacote_metodologico`, triggers de invalidação) vale **só** para `methodology_packages` (HOLOSCAN). **Não foi reutilizada automaticamente para a LI.**
- Regra já fixada (decisão 67): nenhuma aprovação automática; nenhuma atribuída a "Liderança do método HOLOSCAN".

**Fonte.** Mestre §34.2 (versionamento, provenance); decisão 67 da Etapa 4.2.

**Legado.** Nenhum processo: o confronto legado entrou em produção sem homologação. **LEGADO / INCOMPATÍVEL.**

**Conflitos.** Reutilizar Daniel → Rodrigo é decisão de governança, não técnica; a LI tem quatro famílias de conteúdo (pacote, referências, conversões, derivados) que podem ter autoridades distintas; hash precisa cobrir domínios, vínculos, regras e textos — e as referências/conversões referenciadas, ou estas têm hash próprio.

**Opções tecnicamente possíveis.** (a) replicar o mecanismo da 4.2 para a LI (tabela de aprovações, RPC, hash SHA-256 sobre pacote + filhas ordenadas, triggers de invalidação em domínios/vínculos/regras) com os mesmos dois responsáveis; (b) mesmo mecanismo com responsáveis distintos ou um terceiro passo (ex.: revisão laboratorial); (c) hash único cobrindo também referências/conversões/derivados vinculados, ou hashes separados por família com aprovação própria; (d) nada é aprovado na V1 (LI fica em infraestrutura).

**Incompatíveis com o Mestre.** Aprovação sem responsável nomeado; aprovação atribuída a grupo; pacote mudar após aprovação sem invalidar; aprovação por UPDATE direto no banco.

**Consequência.** (a)–(c) exigem migration nova (fora desta etapa) antes de qualquer registro; até lá **nenhuma decisão dos blocos 1–29 pode ser registrada no sistema** — só neste documento. (d) nada muda.

**Bloqueado enquanto aberto.** O registro de todas as outras decisões.

**FECHADO TECNICAMENTE — Etapa 5.2 (02/10/2026).**
DECISÃO: a Leitura Integrada reutiliza a governança humana do Pacote Metodológico HOLOSCAN. Aprovação 1 = Daniel (responsável primário); Aprovação 2 = Rodrigo (revisão final); ordem obrigatória; as duas sobre o mesmo `package_id`, `version` e `content_hash` (hash canônico de pacote, domínios, vínculos com referência resolvida, todas as regras, dependências resolvidas — referências/conversões/derivados só elegíveis quando referenciados pelo pacote). Qualquer mudança metodológica invalida as aprovações vigentes (histórico append-only com motivo); voltar ao hash antigo não reativa. As duas aprovações não homologam: `homologar_pacote_li` é a ação final explícita, que exige validador de completude sem bloqueio, hash/versão atuais e as duas aprovações vigentes, e grava snapshot imutável. Implementação por estruturas próprias que espelham o contrato da 4.2 (opção B; justificativa em `GOVERNANCA-HOMOLOGACAO-LI-V1.md`). Migration `20261002100000`, não aplicada.
JUSTIFICATIVA: ordem de serviço da Etapa 5.2 (mesma governança já adotada para o HOLOSCAN na Etapa 4.2, decisão 67).
RESPONSÁVEL: definido pela ordem da Etapa 5.2 (governança); **nenhuma aprovação real registrada**.
DATA: 02/10/2026.
**O que continua aberto:** todo o conteúdo (blocos 1–29). Até ser decidido e levado ao pacote por migration versionada, `LI-V1@1` permanece em `rascunho`, incompleto, e **Homologar** fica bloqueado.

---

## Anexo A — Contagens da Etapa 5 (resolução documental)

### A.1 Harness local: 114 → 116

- `ca01683` (primeiro commit da Etapa 5): `supabase/tests/etapa5-harness.sql` com **L01–L41** (41 checks). Cadeia 130000→220000 + todos os harnesses anteriores: **114/114 ok**.
- `8a3524c` (segundo commit): acrescentados **L42** ("gravação legado pós-migration ganha valor original, numérico e LAB-002, sem referência inventada") e **L43** ("edição legado do valor refaz o valor original"), junto com a função `lab_mapear_legado()` e o trigger `lab_preencher_legado` (correção da regressão do painel legado). Cadeia: **116/116 ok**.
- Conclusão: 116 = 114 + 2; o relatório final estava correto; esta nota explica a diferença.

### A.2 Migração dos EXA (contagem fechada)

| Conjunto | Qtde | Itens |
|---|---|---|
| EXA existentes em `exames.csv` | **24** | EXA-001…EXA-024 |
| mapeados automaticamente para um LAB (exam_code preenchido) | **19** | EXA-002 (LAB-016 `ultrassensivel`), 004, 005, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022 (LAB-021 `eritrocitario`), 023 |
| `requires_manual_mapping` (exam_code nulo, `legacy_migrated`) | **1** | EXA-006 Insulina de jejum (bloco 29) |
| `additional_legacy` (fora dos 45) | **4** | EXA-001, EXA-003, EXA-007, EXA-024 |
| **Soma** | **24** | 19 + 1 + 4 = 24 ✔ |

`MAPA_LEGADO` tem **20 chaves** (19 mapeadas + EXA-006 com sugestão e `requires_manual_mapping`). As frases "20 EXA-* mapeados" / "20 inequívocos" em `INVENTARIO-LABORATORIO-AS-IS.md`, `ETAPA5-LABORATORIO.md` e `DECISOES-V1.md` (item 85) contavam EXA-006 entre os mapeados; foram corrigidas nesta etapa para **19 mapeados + 1 manual + 4 fora**. Nenhum dado ou código foi alterado: `lab_mapear_legado()` já devolvia `exam_code = null` para EXA-006. O rótulo da asserção em `testar-v1-etapa5-motor.mjs` ("20 inequivocos … insulina marcada para mapeamento manual") também conta EXA-006 entre os 20; a asserção em si confere `requires_manual_mapping === true` para EXA-006 e está correta — o rótulo não foi alterado para não tocar executável nesta etapa.
