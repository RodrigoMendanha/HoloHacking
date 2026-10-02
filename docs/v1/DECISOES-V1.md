# DECISÕES V1 — registro do que está aprovado

Só entra aqui decisão realmente aprovada (Documento Mestre, versão documental 1.0, ou
decisão explícita de produto registrada nesta etapa). O que depende de homologação está
na seção **Decisões pendentes**, sem resposta.

## Decisões aprovadas

1. **O Documento Mestre é o destino da V1.** `HOLOHACKING-V1-ESPECIFICACAO-MESTRE.pdf`
   (30/09/2026) define o comportamento pretendido. (Mestre §1.1)
2. **O AS-IS é só ponto de partida.** `ESTADO-ATUAL-COMPLETO-HOLOHACKING-AS-IS.md` é
   evidência do estado em 30/09/2026, não especificação. (Mestre §1.1, §44.1)
3. **Regra metodológica não homologada não é inventada pelo código.** Nenhum peso, faixa,
   corte, associação, regra laboratorial ou regra de sugestão é preenchido por
   aproximação, escolha do desenvolvedor, frontend, backend ou IA. (Mestre §1.2, §13)
4. **Sem dado = sem dado.** Sistema ou eixo sem resposta tem nota, carga e faixa nulas;
   resposta válida zero é resposta, não ausência; não há nota 10 por ausência nem nota
   zero por régua intocada. (Mestre §15)
5. **Nova aplicação não herda respostas.** Reaplicar o Holoscan cria aplicação nova,
   vazia; respostas anteriores não são marcadas automaticamente. (Mestre §8, §15)
6. **Nova coleta não herda resultados.** Nova coleta começa vazia; editar uma coleta é
   diferente de criar outra. (Mestre §22)
7. **Exames não alteram sistemas, Índice ou Tríada.** (Mestre §16, §24.3, §43.2)
8. **"Apagar tudo" está fora.** Removido na Rodada 08; não volta. (Mestre §33, §40.2)
9. **Backup completo está fora do escopo obrigatório da V1.** Decisão de produto
   registrada em 01/10/2026, como override explícito do critério "backup restaurado em
   teste" (Mestre §39.2, §41.3). Não se restaura o botão "Backup completo", não se
   implementa novo sistema de backup nesta etapa. As exportações existentes continuam
   tendo que ser verdadeiras e autorizadas.
10. **HOLOS AI não configurada permanece indisponível.** Nenhum provedor é integrado até
    haver configuração, contrato e validação; a jornada clínica segue operante.
    (Mestre §36.2)
11. **Duas coletas na mesma data têm identidade própria.** A identidade da coleta é o
    ID; `patient_id + data` nunca é identidade. (Mestre §22, §34.2, §43.2)
12. **Sem retorno universal automático.** Prazos de acompanhamento são definidos pela
    profissional; o automatismo de 28 dias foi neutralizado, sem número substituto.
    (Mestre §29, §33)
13. **Saída não homologada não é saída oficial.** Até existir Pacote Metodológico
    aprovado, notas dos 5 sistemas, faixas, prioridade calculada, Índice, Tríada
    numérica, combinações, sugestões e Leitura Integrada determinística aparecem
    identificadas como "em homologação". (Mestre §12, §13, §41.1)
14. **Critério mínimo de cobertura não é presumido.** O corte de 50% da Rodada 08 foi
    removido e não foi substituído. A cobertura bruta (respondidos ÷ 84) continua
    calculada e exibida. (Mestre §18)
15. **Conteúdo oculto ou retirado não sai em contexto assistivo.** CMB ocultas, regras
    REC/SEL, mapas não consolidados e rascunhos não entram no contexto da HOLOS AI.
    (Mestre §29, §35, §36.1)

### Etapa 1 — Agenda × Atendimento (01/10/2026)

16. **Agenda e Atendimento são entidades distintas.** `consultations` é o AGENDAMENTO
    (administrativo); `encounters` é o ATENDIMENTO clínico. Agendamento pode existir
    sem atendimento; atendimento pode existir sem agendamento. (Mestre §6)
17. **Vínculo clínico é sempre explícito.** HOLOSCAN, ferramentas e coletas novas ligam-se
    ao atendimento escolhido (`encounter_id`). Nunca se procura "a consulta de hoje", "a
    primeira desta data" nem "a última consulta" para criar vínculo. (Mestre §6, §8)
18. **Atendimento só nasce por gesto explícito.** "Iniciar atendimento" (da agenda) ou
    "Novo atendimento" (da ficha), com confirmação de data/hora. Marcar, abrir agenda,
    abrir ficha ou a hora chegar não criam atendimento.
19. **Cancelar não apaga; reagendar preserva o original.** `cancelled_at` +
    `cancellation_reason`; reagendamento cria novo agendamento ligado por
    `rescheduled_from_id`/`rescheduled_to_id`, numa operação atômica. (Mestre §6, §33)
20. **Aplicação oficial do HOLOSCAN exige atendimento ativo.** Sem ele, nada é
    consolidado no servidor; o rascunho local do questionário continua permitido.
21. **Histórico não recebe backfill por data.** `encounter_id` dos registros anteriores
    fica NULL até vinculação humana explícita, se essa função vier a existir.
22. **`tool_applications.consultation_id` é legado.** Vínculo antigo com o agendamento;
    preservado, não apagado, não backfilled. `encounter_id` é o vínculo clínico V1.

### Etapa 2 — Anamnese estruturada e Conduta (01/10/2026)

23. **Anamnese e Conduta pertencem ao atendimento.** `encounter_id NOT NULL` com FK
    composta (paciente/profissional); nenhum registro cruza paciente. (Mestre §9, §30)
24. **Estados clínicos do Mestre §38.1.** `rascunho` (editável, fora dos indicadores),
    `salvo` (aceito pelo servidor), `revisado` (conferência identificada). Consolidado é
    imutável: corrigir cria revisão nova e preserva a anterior. "Revisado" não é
    homologação metodológica.
25. **Vazio ≠ negado.** Cada item da anamnese tem estado (`informado`,
    `negado_explicitamente`, `desconhecido`, `nao_investigado`, `nao_aplicavel`,
    `recusado`) e origem (`relato_paciente`, `observacao_profissional`,
    `documento_externo`, `dado_medido`) obrigatórios; nenhum valor padrão para peso,
    altura, alergia, intolerância, diagnóstico ou condição; diagnóstico informado continua
    informado. Medida exige unidade; nenhuma conversão.
26. **Cópia da anamnese anterior é ação explícita.** Itens entram como prévios a revisar,
    com `source_anamnesis_id`; nunca automática; nunca alcança o HOLOSCAN.
27. **Conduta não depende de score.** Nenhum campo obrigatório; nenhuma exigência de nota,
    faixa, Índice, HOLOSCAN completo ou ferramenta; nenhum medicamento ou encaminhamento
    como ordem autônoma; nenhum alerta, limiar ou diagnóstico inventado.
28. **Acordos têm estados funcionais, não adesão.** `proposto`, `acordado`,
    `em_acompanhamento`, `concluido`, `revisto`, `encerrado`; só mudam por ação explícita;
    nenhum score de adesão. No retorno, a conduta anterior é mostrada e nada é
    transportado automaticamente (continuar/substituir/encerrar com justificativa).
29. **Só registro consolidado alimenta histórico oficial.** Rascunho não entra em
    dashboard, timeline consolidada, contexto da HOLOS AI nem exportação sem rótulo.

### Etapa 3 — Evolução, Timeline e Relatório clínico base (01/10/2026)

30. **Evolução é histórico longitudinal por atendimento, nunca "primeira × última".**
    Dois pontos escolhidos explicitamente (atendimento anterior × atual; linha de base
    escolhida × atual; dois atendimentos; duas datas). Nada é assumido como linha de base
    em silêncio. (Mestre §8, §19, §31)
31. **Nenhum delta metodológico.** Notas, Índice, Tríada e faixas do HOLOSCAN não têm
    delta oficial enquanto o Pacote Metodológico V1 não for homologado: só datas, versão,
    cobertura bruta, interpretação profissional e id de aplicação lado a lado. Nunca
    "melhorou", "piorou" ou "+X%".
32. **Delta numérico só entre a mesma coisa na mesma unidade.** Medidas da anamnese (mesmo
    rótulo + mesma unidade), exames (mesmo `exame_id` + unidade compatível, sem equivalência
    inventada) e ferramentas (mesma ferramenta + mesma versão + mesma chave numérica).
    Incompatível fica lado a lado, com o motivo.
33. **Acordos: estado anterior → estado atual.** Continuado, alterado, revisto, encerrado,
    novo, sem registro na conduta atual; nenhum índice de adesão; "sem registro" não é
    "não cumpriu". (Mestre §30)
34. **Timeline só com o consolidado.** Atendimento, anamnese/conduta salvas ou revisadas,
    acordo alterado, HOLOSCAN com identidade remota, coleta, ferramenta concluída,
    documento anexado, relatório emitido; agendamento como evento administrativo. Rascunho,
    prévia e cache local não sincronizado ficam fora. Data clínica ordena; data de registro
    é consultável. Revisão aparece ligada ao registro original, não como novo evento.
35. **Relatório = emissão versionada de fontes escolhidas.** `report_emissions`: rascunho
    editável; emissão imutável com `source_snapshot` e `content_snapshot` montados pelo
    servidor a partir de fontes validadas (mesmo paciente/profissional, só consolidadas);
    correção = retificação (`supersedes_report_id`, `revision_number + 1`), original
    acessível. Nada vem selecionado por padrão; conteúdo íntimo (campos emocionais, sentido
    pessoal, respostas das ferramentas) só por escolha explícita.
36. **Tipos de conteúdo no snapshot.** RELATO_DO_PACIENTE, OBSERVACAO_PROFISSIONAL,
    DADO_MEDIDO, DADO_DOCUMENTAL, INDICADOR_CALCULADO, TEXTO_ASSISTIDO (estrutura;
    nenhum texto assistido é gerado). Metodologia não homologada nunca entra como
    resultado oficial (`resultados_oficiais: false`).
37. **`content_hash` é hash técnico (sha256 do snapshot), não assinatura digital.**
    Impressão/PDF pelo navegador a partir do snapshot, não da ficha viva; nenhum serviço
    pago; nenhum PDF assinado prometido; binário não persistido.
38. **Proveniência fechada no servidor.** `source_anamnesis_id` exige fonte consolidada de
    outro atendimento (nunca a própria linha); `origin_agreement_id` exige acordo de outra
    conduta (nunca o próprio). As FKs compostas já impedem cruzar paciente/profissional.
39. **Relatório conta como histórico.** Paciente com emissão não é "sem histórico"; não há
    policy de DELETE em `report_emissions`.
40. **Solicitação de exames com assinatura: não implementada** (pendência registrada na
    tela e aqui). Envio externo, provider da HOLOS AI e Pacote Metodológico seguem fora.

### Etapa 4 — Infraestrutura do Pacote Metodológico (01/10/2026)

41. **Código existente não é autoridade metodológica.** Tudo o que existe (84 itens, escalas,
    9 inversões, 179 associações, pesos, 15 faixas, Índice 0,20, Tríada, CMB/REC/SEL) foi
    importado como **RASCUNHO / PARA HOMOLOGAÇÃO**. Nada foi aprovado, normalizado ou corrigido.
42. **Pacote Metodológico persistente e versionado** (`methodology_packages` + edição do
    questionário, escalas, sistemas, perguntas, associações, faixas, regras e registros de
    homologação). Status: rascunho, em_revisao, aprovado, retirado.
43. **Aprovação não é edição administrativa.** Só `aprovar_pacote_metodologico` aprova: exige
    status `em_revisao`, responsável humano, justificativa e validador com 0 erros; grava registro
    de homologação e `content_hash` sha256. UPDATE direto para `aprovado` é recusado por trigger.
44. **Pacote aprovado é imutável; retirado é histórico.** Mudança exige nova versão. Retirar só
    muda status e vigência; conteúdo continua legível. Sem DELETE de pacote. O snapshot do
    HOLOSCAN guarda `methodology_package_id` como campo imutável.
45. **Validador aponta, não corrige.** Duplicidade, referência inexistente, associação órfã,
    escala ou orientação ausente, peso ausente, conflito, SNT pendente, faixa com lacuna,
    sobreposição ou ordem inválida, parcialidade, Índice, Tríada, regra e exemplo incompletos.
46. **Orientação ausente não é direta.** O motor genérico recusa item sem orientação aprovada.
47. **Dois modos.** HOMOLOGAÇÃO executa qualquer pacote e marca toda saída com `mode`,
    `package_status` e `package_version`; essa saída não entra em Dashboard, Evolução,
    relatório, HOLOS AI, Conduta ou sugestão. OFICIAL só com pacote aprovado e vigente, sem
    fallback para rascunho nem para o motor legado.
48. **Barreira única:** `window.Metodologia` (obterPacoteAtivo, podeCalcularOficial,
    podeExibirOficial, motivosBloqueio, modoHomologacao). Hoje não há pacote aprovado: status
    `em_homologacao`, toda saída oficial bloqueada.
49. **Cobertura de preenchimento** = IDs validamente respondidos ÷ 84. Só informativa; não decide
    avaliabilidade. Nenhum corte mínimo foi escolhido (50% continua removido).
50. **Fixtures TEST_FIXTURE_ONLY** provam o motor (determinismo, direta/invertida, múltiplas
    associações, ausência ≠ 0, valor inválido = erro, faixas, Índice, Tríada). Nunca são copiadas
    para o pacote V1.
51. **Tela Metodologia / Homologação** só para consulta, visível com `?homologacao=1`; exporta
    JSON/CSV só de metodologia; não existe botão "aprovar tudo".

### Etapa 4.2 — Pacote Metodológico V1: decisões humanas fechadas (01/10/2026)

**DECISÕES METODOLÓGICAS V1 FECHADAS.** Detalhe completo: `docs/v1/metodologia/PACOTE-METODOLOGICO-V1-DECISOES-FINAIS.md`.
**PUBLICAÇÃO TÉCNICA PENDENTE DE VALIDAÇÃO NO BANCO REAL** (cadeia 130000→200000).

52. **Questionário V1**: 84 perguntas (49/19/16); EMO-506 fora; SNT-101 e SNT-501 com um único ID;
    SNT-302, SNT-310 e EMO-506 não são recriadas. Cada item tem exatamente um contexto temporal
    dentre 7 valores permitidos (nenhum item em `ultimos_7_dias` nesta edição).
53. **Escalas 0–3** (frequência: Nunca/Às vezes/Frequente/Sempre; intensidade: Nada/Um pouco/
    Bastante/Muito); 73/11 mantido. Escala desconhecida é erro (o questionário não cai mais em
    frequência).
54. **Orientação**: 9 invertidas, 75 diretas; z = resposta ou 3 − resposta; ausente é erro.
55. **Um primário pontuável por pergunta.** As 9 secundárias recuperadas e as linhas metabólicas de
    SNT-101 (histórica SNT-302) e SNT-501 (histórica SNT-310) viram `secondary_contextual`: sem
    peso, sem soma, fora de denominador, cobertura, Índice e Tríada.
56. **SNT-101 → Sistema Fúngico; SNT-501 → Sistema Mental Emocional Espiritual**, peso 1, Tríada
    física peso 1, `ultimos_30_dias`.
57. **Peso 1 em todos os vínculos primários**; 1/2/3 só como `legacy_recovered_weight`.
58. **Parcialidade**: sistema e eixo avaliáveis com cobertura ≥ 0,80 (itens primários / do eixo);
    em branco, recusada e não aplicável não são zero e reduzem a cobertura; nota pelos respondidos
    (10 − 10·Σz/Σ3); cobertura exibida junto da nota quando < 100%. Sem denominador completo, sem 50%.
59. **Faixas** [0, 10/3) baixa, [10/3, 20/3) intermediária, [20/3, 10] alta, classificadas pela
    fração exata (nunca pelo valor de tela); exibição com 1 casa; mensagens neutras.
60. **Índice** = 10 × Σ(nota × 0,20), só com os cinco sistemas avaliáveis; sem renormalização, sem
    Índice parcial, sem faixas; 1 casa.
61. **Tríada** pelo bloco (49/19/16), peso 1, mesma orientação, cobertura ≥ 0,80 por eixo; sem nota
    global, sem faixa, sem interpretação automática.
62. **Comparabilidade**: delta só com mesmo paciente, edição, versão do pacote, contrato do motor,
    sistema avaliável nas duas e mesmo conjunto pontuado; senão lado a lado. Só "subiu/desceu/
    permaneceu"; nunca "melhorou/piorou".
63. **Nomenclatura e textos oficiais** dos cinco sistemas; impacto espiritual causal, padrão
    emocional e mensagens antigas só em `legacy` (provenance), nunca em conteúdo oficial.
64. **REF-01/REF-02/REF-03** no pacote, com esperado exato e de tela; o validador JS confere cada um
    contra o motor.
65. **Nenhuma CMB/REC/SEL oficial**; política `suggestion` com `automatica: false` e a mensagem "Não
    há sugestão automática validada para esta edição."; seleção manual profissional mantida.
66. **Nova versão, não edição**: o candidato é HOLOS-V1@2 (`em_revisao`), com linhagem (código,
    versão, status e hash do importado) e hash SHA-256 próprio; o importado continua reproduzível.
    Motor sem fallback; aritmética racional exata. Migration 20261001200000 (NÃO aplicada) leva o
    contrato ao banco.
67. **Homologação por dupla aprovação, em ordem.** Aprovação 1 = Daniel (responsável primário pela
    homologação); Aprovação 2 = Rodrigo (segundo responsável / revisão final). O pacote só passa a
    aprovado com as duas registradas sobre o mesmo `package_id`, `version` e `content_hash`. Se o
    pacote mudar entre elas, o ciclo daquela versão é invalidado e exige de novo 1 e 2. Nenhuma
    aprovação é automática (só a RPC escreve) e nenhuma pode ser atribuída a "Liderança do método
    HOLOSCAN". Migration 20261001210000 (NÃO aplicada).

### Etapa 5 — Laboratório, coletas, motor laboratorial e infraestrutura da Leitura Integrada (02/10/2026)

Fonte: Documento Mestre §21–§24 (autoridade); AS-IS só para entender o legado
(`docs/v1/laboratorio/INVENTARIO-LABORATORIO-AS-IS.md`). Nenhuma regra clínica foi inventada.

68. **Catálogo-base de 45 exames (LAB-001..LAB-045)**, versão `catalogo-lab-v1.0`, global e somente
    leitura pela aplicação, com categorias e aliases explícitos (TGO↔AST, TGP↔ALT, Gama GT↔GGT,
    Paratormônio↔PTH, 25 OH vitamina D↔Vitamina D 25-OH). Busca por nome/alias exato ou prefixo —
    **sem** fuzzy matching. Não é painel obrigatório. HOMA-IR, VHS, cortisol e Candida **não** entram.
    (`docs/v1/laboratorio/CATALOGO-45-V1.md`)
69. **PCR ≠ PCR-us e Magnésio ≠ Magnésio eritrocitário**: mesmo `exam_code`, `variant` explícita;
    material nunca inventado. Comparação entre variantes diferentes não é automática.
70. **Legado fora dos 45** (Candida albicans IgG, VHS, HOMA-IR, Cortisol matinal) → `additional_legacy`:
    preservado, visível no histórico, sem regra, faixa, leitura ou interpretação.
71. **Exame customizado por profissional** (`lab_custom_exams`): dado do dono, não vira global, não
    ganha regra, referência nem vínculo, não conta nos 45.
72. **Hemograma completo = 1 item** (LAB-001) com componentes em `lab_result_components`; nenhuma
    lista clínica fixa de componentes foi inventada.
73. **Coleta é identificada por `id`, nunca por paciente + data.** Duas coletas na mesma data
    coexistem. "Nova coleta" sempre insere; "Editar esta coleta" exige id e só vale para `rascunho`.
    `encounter_id` é opcional e explícito (checkbox); nunca deduzido por data. `clinical_date`
    (`coletado_em` + `clinical_time`) é separada de `created_at`/`updated_at`.
74. **Estados da coleta**: `rascunho` (fora da saída oficial) → `salvo` (só após confirmação do
    servidor) → `revisado` (ação humana identificada). Coleta consolidada é imutável (trigger);
    correção = nova revisão com quem/quando/motivo e versão anterior preservada (`supersedes_id`).
    Nenhum hard-delete de coleta consolidada.
75. **Nova coleta começa vazia**; "usar estrutura da coleta anterior" copia só a estrutura
    (exame/variante/material/método), nunca valores, referências, observações ou datas.
76. **Valor original sempre preservado** (`value_original_text` not null). `numeric_value` só quando
    inequivocamente numérico. Censurado ("< 0,10") → `qualifier` + `censor_limit`, `numeric_value`
    nulo (CHECK). Qualitativo preservado textualmente; nunca `Negativo = 0`.
77. **Referência do laudo é a única referência da V1** (`report_reference_*`, `reference_source =
    laudo`), digitada pela profissional. **Ausência de referência não significa "dentro"**
    (`not_classifiable / missing_reference`). Referência metodológica (`lab_method_references`),
    conversões (`lab_unit_conversion_rules`) e cálculos derivados (`lab_derived_calculations`) são
    infraestrutura **vazia**, sem botão e sem aprovação.
78. **"Ideal" legado removido da saída oficial**: preservado só em `legacy_ideal_min/max`
    (provenance). Não aparece como referência, não alimenta motor, Leitura Integrada, HOLOS AI nem
    relatório.
79. **Motor laboratorial** (`motor-lab-1.0.0`): `below | within | above | not_classifiable` +
    `reason_codes` + trace. Unidade diferente sem conversão **aprovada** = não classificável.
    Variante/material/método incompatíveis = não classificável. **Nenhum score laboratorial global**,
    nota, índice ou percentual de exames bons.
80. **Comparação entre resultados** só com mesma identidade (exame, variante, material, método
    relevante) e unidade igual ou conversão aprovada; delta e "aumentou/reduziu/permaneceu";
    **nunca "melhorou/piorou"**; referências diferentes ficam visíveis; a seleção é da profissional,
    por `clinical_date`, nunca por `updated_at`.
81. **Laboratório é independente do motor HOLOSCAN**: exames nunca alteram sistemas, Índice, Tríada,
    respostas, pesos ou faixas (testes explícitos de barreira).
82. **Leitura Integrada = infraestrutura genérica dirigida por pacote de regras**
    (`integrated_reading_rule_packages/domains/exam_domain_links/rules`). O pacote real `LI-V1@1` nasce
    em `rascunho` **sem** domínios, vínculos, suficiência, janela temporal, regra de mistos ou textos;
    logo o único estado real é `sem_dados_suficientes`, com motivos. Convergente/divergente só existem
    em fixtures `TEST_FIXTURE_ONLY` (A–F), fora da migration e da UI. O servidor recusa
    convergente/divergente sem vínculo aprovado em pacote aprovado.
83. **Seleção explícita** de 1 aplicação HOLOSCAN consolidada + N coletas (por id, com data clínica);
    nunca "a última coleta". Leitura salva (`integrated_readings`) é snapshot congelado e imutável;
    correção = nova revisão.
84. **Confronto legado bloqueado da saída oficial** (`confrontar()`, `window.Holoscan`, `nota ≤ 3`,
    "um exame fora = convergente"): só em `?homologacao=1`, rotulado LEGADO. HOLOS AI não recebe
    inferência laboratorial (só dado factual de coletas salvas/revisadas).
85. **Migração determinística do legado** (migration 20261001220000, NÃO aplicada): 20 EXA-* mapeados
    com variante preservada, 4 → `additional_legacy`, Insulina de jejum → `requires_manual_mapping`;
    coletas antigas → `source = legacy_panel`, `state = salvo`. Nenhum resultado perdido.
    (`docs/v1/laboratorio/MIGRACAO-LEGADO.md`)
86. **Homologação da Leitura Integrada e das referências metodológicas é decisão humana pendente**
    (`docs/v1/laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`); nenhuma aprovação registrada.

## Decisões pendentes (não decididas aqui)

- **Solicitação de exames com assinatura jurídica** — fora da Etapa 3; `conducts.requested_exams`
  continua texto livre; nenhum documento assinado é gerado. (Mestre §30, §41)
- **Envio externo de relatórios** (e-mail, WhatsApp, portal) — fora; emissão só é vista e
  impressa pela profissional.
- **Comparabilidade entre aplicações do HOLOSCAN** — regra DECIDIDA na Etapa 4.2 (item 62) e
  implementada no motor (`MotorMetodologico.comparar`); a Evolução continua sem delta do HOLOSCAN
  até o pacote ser publicado (nenhum pacote aprovado).
- **Equivalências entre exames** (PCR × PCR-us, unidades) — nenhuma criada; delta só no mesmo
  `exame_id` e unidade igual. (Mestre §21)
- **Documentos × atendimento** — `documents` continua sem `encounter_id`; o relatório referencia
  documento por id (metadados), não por atendimento.
- **Texto assistido** — nenhuma geração de texto existe; quando existir, entra como
  proposta identificada e só vira prontuário após confirmação (Mestre §30, §36).
- **Vocabulário de `type`/`modality` do atendimento e campos fechados da anamnese** —
  texto livre por ora; sem questionário fechado.

- **Estados de agendamento e de atendimento** — o Mestre propõe estados; a Etapa 1 usa o
  mínimo funcional (`cancelled_at`; `encounters.status` texto livre, "aberto" por
  padrão) sem CHECK. Enum definitivo pendente de produto. (Mestre §6)
- **Vinculação humana de registros históricos a atendimentos** — função não criada; o
  histórico fica sem `encounter_id`.
- **Exclusão de atendimento** — `encounters` não tem policy de DELETE; como a exclusão
  completa de paciente (Rodada 08) trata atendimentos fica para decisão.
- **Anamnese obrigatória** — formulário estruturado previsto no Mestre §9, ausente no AS-IS.
- **Conduta obrigatória** — entidade clínica prevista no Mestre §30, ausente no AS-IS.
- **Catálogo final das 10 ferramentas** — 3 de Corpo, 3 de Mente, 4 de Espírito
  (Mestre §25-28); hoje 7 ativas, e Mapa da Rotina, Gatilhos & Respostas e Conexão &
  Pertencimento não existem.
- **Quatro estados administrativos do paciente** — cadastrado, em acompanhamento,
  acompanhamento encerrado, arquivado (Mestre §33); hoje só ativo/inativo.
- **HOLOS AI obrigatória no lançamento inicial?** (Mestre §41.4)
- **Política de data futura de coleta** — regra da Rodada 08 sem contrato no Mestre;
  separada em `supabase/migrations-pendentes/`.
- ~~**Homologação do Pacote Metodológico V1**, parcialidade, pesos, faixas, Índice, Tríada~~ —
  **DECIDIDAS na Etapa 4.2** (itens 52–66). Pendente só a **publicação técnica**: validar a
  cadeia 130000→210000 no banco real, registrar a Aprovação 1 (Daniel) e a Aprovação 2 (Rodrigo)
  sobre o mesmo pacote, versão e hash, e então homologar o HOLOS-V1@2 (item 67).
- **Leitura Integrada** — a Etapa 5 entregou a **infraestrutura** (itens 82–84); continuam pendentes
  as decisões humanas: domínios, vínculo exame↔domínio, suficiência, janela temporal, referências
  metodológicas, conversões, cálculos derivados, resultados mistos, regras de convergência/divergência
  e textos (`docs/v1/laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`). (Mestre §24)
- **Regras de sugestão de ferramentas** — nenhuma das 23 REC nem SEL-001 é aprovada; a Etapa 4.2
  decidiu que nenhuma sugestão automática é oficial na V1 (item 65). (Mestre §29)
- **Conteúdo mínimo para "Concluir" uma ferramenta** — a guarda técnica da Rodada 08
  (Mapa de Crenças não conclui vazio; OQ3/PQQ não salvam vazios) fica mantida como
  guarda de aplicação vazia, pendente de decisão metodológica.
- **Réguas manuais dos 5 sistemas** — LEGADO / EM REVISÃO; fora da jornada normal,
  visíveis só em modo de homologação (`?homologacao=1`); não sincronizadas.
- ~~**Catálogo laboratorial de 45 exames**~~ — **ENTREGUE na Etapa 5** (itens 68–72). Pendente só o
  mapeamento manual dos itens legado marcados `requires_manual_mapping` (Insulina de jejum) e a
  validação da migration 20261001220000 no banco real. (Mestre §21)
