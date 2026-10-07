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
85. **Migração determinística do legado** (migration 20261001220000, NÃO aplicada): 24 EXA-* = 19 mapeados
    com variante preservada + 1 `requires_manual_mapping` (Insulina de jejum) + 4 `additional_legacy`;
    coletas antigas → `source = legacy_panel`, `state = salvo`. Nenhum resultado perdido.
    (`docs/v1/laboratorio/MIGRACAO-LEGADO.md`)
86. **Homologação da Leitura Integrada e das referências metodológicas é decisão humana pendente**
    (`docs/v1/laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`); nenhuma aprovação registrada.

### Etapa 5.2 — Governança e dupla aprovação da Leitura Integrada (02/10/2026)

87. **A Leitura Integrada reutiliza a governança humana do HOLOSCAN (decisão 67).** Aprovação 1 = Daniel
    (responsável primário); Aprovação 2 = Rodrigo (revisão final); ordem obrigatória; as duas sobre o mesmo
    `package_id`, `version` e `content_hash`. Hash canônico cobre pacote, domínios, vínculos (com referência
    resolvida), todas as regras e dependências resolvidas (referências, conversões, derivados — elegíveis só
    quando referenciados pelo pacote). Mudança metodológica invalida (histórico append-only com motivo);
    voltar ao hash antigo não reativa. As duas aprovações não homologam: `homologar_pacote_li` é a ação
    final, exige validador de completude sem bloqueio, hash/versão atuais e as duas aprovações vigentes, e
    grava snapshot imutável. `aprovado` só por essa RPC; aprovado/retirado imutáveis. Estruturas próprias
    espelhando o contrato da 4.2 (opção B: a tabela do HOLOSCAN é por profissional, o pacote LI é global).
    Migration 20261002100000 (NÃO aplicada). **Nenhuma aprovação registrada; LI-V1@1 em rascunho; blocos
    clínicos 1–29 abertos** (`docs/v1/laboratorio/GOVERNANCA-HOMOLOGACAO-LI-V1.md`).

### Etapa 5.3 — Identidade real na dupla aprovação; material do Bloco 1 (02/10/2026)

88. **Aprovação é da conta autenticada autorizada, não do nome digitado.** Auditoria: as RPCs da 4.2 e da 5.2
    validavam só a string "Daniel"/"Rodrigo" (vulnerabilidade B nos dois escopos). Correção (migration
    20261002110000, NÃO aplicada): `methodology_approvers` (user_id, scope holoscan|integrated_reading,
    approval_stage 1|2, display_name, active), escrita só por gestão técnica, nasce vazia, um papel por
    pessoa e escopo; `registrar_aprovacao_metodologica`, `registrar_aprovacao_li` e `homologar_pacote_li`
    exigem o aprovador autenticado do escopo+etapa; Aprovação 2 não pode ser do mesmo uid da Aprovação 1;
    `approver_id` + `approved_by` no histórico; aprovador lê o pacote HOLOSCAN em_revisao alheio (só
    leitura). Daniel → Rodrigo, hash, invalidação, histórico e ação final inalterados. Nenhum uid, e-mail
    ou senha no repositório; nenhuma aprovação real (`docs/v1/metodologia/APROVADORES-AUTORIZADOS.md`).
89. **Bloco 1 (domínios da Leitura Integrada) aberto para decisão humana** em
    `docs/v1/laboratorio/DECISAO-01-DOMINIOS-LI.md`: NÃO HÁ DEFINIÇÃO HOMOLOGADA RECUPERADA; o legado (5
    sistemas como dimensão) é evidência, não proposta; 5 arquiteturas apresentadas sem recomendação; nenhum
    domínio criado; LI-V1@1 intocado.

### Etapa 5.4 — DECISÃO 01 registrada (domínios da Leitura Integrada) e matriz do Bloco 2 (02/10/2026)

90. **Domínios da Leitura Integrada (DECISÃO 01, Daniel, 02/10/2026)**: arquitetura A — domínios próprios e
    independentes do HOLOSCAN; 7 domínios: LI-D01 Hematológico e Inflamatório, LI-D02 Glicêmico e Metabólico,
    LI-D03 Lipídico, LI-D04 Hepático, LI-D05 Renal e Hidroeletrolítico, LI-D06 Micronutrientes e Metabolismo
    Mineral, LI-D07 Endócrino e Hormonal (definições e limites em `docs/v1/laboratorio/DECISAO-01-DOMINIOS-LI.md`).
    Regras estruturais: domínio ≠ sistema HOLOSCAN; nenhuma relação inferida pelo nome; relação futura só por
    regra homologada; exame em 0/1/N domínios; vínculo decidido e versionado; exame sem vínculo fica no
    prontuário e fora da LI; sem domínio "Outros"; categorias do catálogo não são domínios; vínculos legados não
    herdados; domínio não é diagnóstico; mudança na lista altera o `content_hash` e exige novo ciclo.
    Fonte: decisão autoral V1 (não recuperada de literatura ou do legado). **Status: decisão humana aprovada;
    não registrada no banco (Aprovação 1/2), não homologada, não implementada** (migration/banco/servidor
    falso/motor/UI intocados; implementação em lote após o bloco 2 e demais regras).
91. **Bloco 2 (vínculos exame → domínio) aberto** com a matriz dos 45 exames em
    `docs/v1/laboratorio/DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md`: 0 decididos, 45 pendentes; categoria e
    `legacy_sistema` só como contexto (NÃO HOMOLOGADOS PARA VÍNCULO); 12 exames marcados sensíveis; Insulina
    basal × "Insulina de jejum" continua pendente (bloco 29).

### Etapa 5.5 — DECISÃO 02 registrada (vínculos exame → domínio) e blocos 3–6 abertos (02/10/2026)

92. **Vínculos exame → domínio (DECISÃO 02, Daniel, 02/10/2026)**: 45 exames decididos — 42 com domínio
    (47 pares exame → domínio), 3 sem domínio na V1 (LAB-027 Alumínio, LAB-033 Ácido úrico, LAB-044 CK: ficam
    no prontuário, fora da LI), 5 multi-domínio (LAB-025 B12, LAB-026 Ácido fólico, LAB-028 Ferro sérico,
    LAB-029 Ferritina → D01+D06; LAB-034 PTH → D06+D07). Direção `above/below/any` registrada por exame e
    significa só "qual lado de uma referência aplicável poderá participar da regra" — não diagnóstico,
    gravidade, melhora, piora, causalidade nem convergência; a direção sozinha não produz estado. PCR
    (sem variante / ultrassensível, D01) e Magnésio (sem variante / eritrocitário, D06) são vínculos
    distintos, sem fundir referência, material ou método. Insulina basal (D02) não resolve a identidade
    legado "Insulina de jejum" (bloco 29). Hemograma vinculado no composto (componentes sem domínio).
    0 vínculos herdados do legado; 0 categorias usadas automaticamente. Fonte: decisão autoral V1 apoiada em
    revisão clínica/documental; FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR (nenhuma citação fabricada).
    **Status: decisão humana aprovada; não implementada, não registrada no banco, não homologada**
    (`docs/v1/laboratorio/DECISAO-02-VINCULOS-EXAME-DOMINIO-LI.md`).
93. **Blocos 3–6 abertos** sem decisão: `DECISAO-03-ELEGIBILIDADE-HOLOSCAN-LI.md` (9 opções),
    `DECISAO-04-ELEGIBILIDADE-COLETAS-LI.md` (coleta × resultado), `DECISAO-05-JANELA-TEMPORAL-LI.md`
    (6 arquiteturas, nenhum valor sugerido), `DECISAO-06-MULTIPLAS-COLETAS-LI.md` (7 opções; proibido
    `updated_at`; data relevante = `coletado_em`).

### Etapa 5.6 — DECISÕES 03, 04 e 06 registradas; DECISÃO 05 parcial; blocos 7–13 abertos (02/10/2026)

94. **Aplicação HOLOSCAN elegível (DECISÃO 03, Daniel)**: uma aplicação por leitura; seleção explícita; mesmo
    paciente; consolidada/salva oficialmente; rascunho e prévia não entram; produzida sob pacote HOLOSCAN
    homologado, com versão declarada compatível pelo pacote LI (sem compatibilidade declarada → sem dados
    suficientes); aplicação parcial contribui só nos domínios avaliáveis; históricas aceitas se explícitas,
    consolidadas, compatíveis e dentro da regra temporal; "revisado" não é requisito adicional.
95. **Coletas e resultados elegíveis (DECISÃO 04, Daniel)**: coleta — mesma paciente, consolidada, data clínica
    conhecida, sem rascunho nem substituída, laboratório e atendimento opcionais, IDs independentes; resultado —
    elegibilidade por resultado; sem referência → não classificável; unidade/variante/material/método
    incompatível afeta só aquele resultado/vínculo; conteúdo copiado e extração assistida exigem conferência
    humana; customizado, additional_legacy e qualquer item fora do catálogo não entram sem vínculo homologado.
96. **Janela temporal — arquitetura (DECISÃO 05, PARCIAL, Daniel)**: compatibilidade temporal obrigatória; datas
    clínicas; nunca `updated_at`/`created_at`; janela explícita, versionada, parte do pacote LI e rastreável na
    leitura salva; sem data ou fora da janela → sem dados suficientes. **Valor em dias NÃO decidido** (não
    assumir 7/30/60/90; não inventar).
97. **Múltiplas coletas (DECISÃO 06, Daniel)**: 1..N coletas elegíveis por seleção explícita; sugestão por
    proximidade da data clínica; nenhuma escolha silenciosa; `updated_at` nunca; empate sem desempate automático
    (apresentar à profissional); leitura salva congela application_id + collection_ids + result_ids; exame/
    variante em mais de uma coleta exige seleção humana do result_id, senão sem dados suficientes; regra futura
    para múltiplos resultados não inferida; leitura salva não é reescrita por coleta futura.
    Fundamento registrado: princípios do Documento Mestre (seleção explicável, IDs e datas visíveis, janela
    versionada, sem "última modificada", snapshot congelado, histórico por data de coleta, só consolidados).
    **Status das decisões 94–97: humanas, aprovadas; não implementadas, não registradas no banco, não homologadas.**
98. **Blocos 7–13 abertos** sem decisão: `DECISAO-07…13` (referência do laudo, referência metodológica, ausência
    de referência, conversões, compatibilidade de variante/material/método); 0 referências, 0 conversões,
    nenhuma equivalência inferida; casos obrigatórios e sensíveis destacados.

### Etapa 5.7 — DECISÕES 07–13 registradas; regra transversal; blocos 14–19 abertos (02/10/2026)

99. **Regra transversal da LI V1 (Daniel)**: um resultado tem três eixos de estado independentes —
    classificação individual (`classification_status`), elegibilidade para LI (`li_eligibility_status`) e
    comparabilidade longitudinal (`longitudinal_comparability_status`). Pode ser válido e classificável e,
    ao mesmo tempo, não elegível e não comparável; comparabilidade nunca vira "inválido"; motivos separados.
    Nomenclatura conceitual, campos não implementados.
100. **Referência do laudo (DECISÃO 07)**: referência primária = a declarada no próprio laudo, por resultado;
    conteúdo original sempre preservado (`reference_raw_text` + estruturação quando possível + condições só
    se declaradas); seleção determinística só quando provável; ambiguidade → `not_classifiable /
    ambiguous_reference`; sem escolha silenciosa; qualitativos e marcadores H/L preservados sem classificação
    automática; laudo nunca sobrescrito por referência metodológica.
101. **Referência metodológica (DECISÃO 08, arquitetura)**: entidade separada; só com exame, variante/material/
    método quando pertinentes, unidade, limite, fonte verificável, justificativa, população, condições,
    versão, responsável e aprovação; sem "faixa ideal universal"; UI mostra REFERÊNCIA DO LAUDO e REFERÊNCIA
    METODOLÓGICA sem substituir; 0 aprovadas, nenhuma criada.
102. **Ausência de referência (DECISÃO 09)**: resultado salvo, visível, original preservado;
    `not_classifiable / missing_applicable_reference`; nunca normal/dentro/alterado/fora; não conta para
    convergente/divergente; não invalida coleta, demais resultados nem domínio; suficiência futura decide.
103. **Conversões (DECISÃO 10, arquitetura)**: só regra homologada (exame, variante/material quando
    pertinente, unit_from/to, fator ou fórmula, condições, fonte, versão, aprovação); original_value/unit
    sempre preservados, convertido registrado com regra/versão; 0 conversões; incompatível sem conversão →
    bloqueado; nada inferido por conversibilidade aparente.
104. **Variante (DECISÃO 11)**: variantes diferentes incompatíveis até declaração explícita; nenhuma
    equivalência por nome, alias, unidade, legado ou categoria; PCR ≠ PCR-us; Mg ≠ Mg eritrocitário;
    T4 livre, T3 livre, Testosterona livre e total já são exam_codes distintos (não recriar como variante);
    hierarquia exam_code → variant → material → method; 25-OH vitamina D distinta de outras formas.
105. **Material (DECISÃO 12)**: não é exigência universal; bloqueia só a operação (vínculo, referência,
    conversão, regra, comparação) que o exige; ausente bloqueia só quando a operação exige material
    conhecido; nunca inventado.
106. **Método (DECISÃO 13)**: classificação individual separada de comparação longitudinal; método ausente
    não bloqueia universalmente (classificável pela referência do laudo se ela não exigir método); regra
    metodológica dependente de método exige método compatível; comparação considera exam_code, variant,
    material, unit, method e contexto de referência; métodos diferentes podem bloquear comparação numérica;
    sem equivalência sem regra; incompatibilidade ≠ piora/melhora. Casos de regressão conceitual A–F
    registrados. **Status 100–106: decisões humanas aprovadas; não implementadas, não registradas no banco,
    não homologadas.** Bloco 5 continua PARCIALMENTE DECIDIDO (valor em dias pendente).
107. **Blocos 14–19 abertos** sem decisão, com os nomes do pacote: `DECISAO-14` qualitativos, `-15`
    censurados, `-16` suficiência mínima por domínio, `-17` número/conjunto mínimo, `-18` exames ausentes,
    `-19` resultados mistos (misto sem regra → sem dados suficientes; um exame fora não converge; sem score
    laboratorial); nenhum corte, peso ou lista sugerido.

### Etapa 5.8 — DECISÕES 14–19 registradas; blocos 20–25 abertos (02/10/2026)

108. **Qualitativos (DECISÃO 14)**: preservados textualmente; nunca convertidos em número; classificação só com
    regra qualitativa específica, versionada e homologada (exame/variante/material/método) que declare termos
    e classificação; sem regra → `not_classifiable / qualitative_rule_missing`; não contam para
    convergente/divergente; nenhuma regra criada.
109. **Censurados (DECISÃO 15)**: qualifier/censor_limit/texto preservados; nunca aproximados; `numeric_value`
    nulo; classificação determinística só quando o intervalo possível prova um único estado contra a
    referência (ex.: <5 vs 10–20 → below; <5 vs 0–10 → `censored_value_ambiguous`); sem delta; nunca em
    média, score ou derivado.
110. **Suficiência (DECISÃO 16, arquitetura)**: regra própria, explícita e versionada por domínio, declarando
    vínculos aplicáveis, encontrados, elegíveis, classificáveis, excluídos (motivos), cobertura, obrigatórios
    e critério; sem corte universal (não 50/70/80/100%, 1 ou 2 exames); sem suficiência global; sem regra →
    sem dados suficientes. **Parâmetros por domínio pendentes.**
111. **Conjunto mínimo (DECISÃO 17, arquitetura)**: quantidade, conjunto, grupo ou combinação
    (`min_classifiable_results`, `required_exam_codes`, `required_exam_groups`, conceituais); hemograma conta
    1; componentes não inflam; mesmo exame+variante repetido ocupa 1 posição após seleção do result_id;
    multi-domínio contribui 1× por domínio; não classificável não conta como classificável; pesos não
    assumidos iguais. **Valores por domínio pendentes.**
112. **Exames ausentes (DECISÃO 18)**: não medido = ausência de dado (nunca normal/dentro/alterado/zero);
    sem direção; não contribui para convergência/divergência; reduz cobertura; não invalida o domínio; sem
    dados só se a regra mínima falhar ou faltar obrigatório; reason_codes separados (`missing_exam`,
    `missing_reference`, `not_classifiable`, `not_eligible`, `outside_time_window`, `incompatible_unit/
    variant/material/method`, `ambiguous_reference`, `qualitative_rule_missing`, `censored_value_ambiguous`).
113. **Mistos (DECISÃO 19, arquitetura conservadora)**: proibidos maioria simples automática, média de exames
    heterogêneos, score laboratorial global, "um alterado vence", "maioria normal vence", not_classifiable
    como within; regra própria por domínio, versionada; sem regra → `mixed_without_rule` / sem dados
    suficientes; um exame fora não produz convergente/divergente. **Regras por domínio pendentes.**
    Regra transversal dos três eixos aplicada aos blocos 14–19. Bloco 5 continua PARCIALMENTE DECIDIDO.
    **Status 108–113: decisões humanas aprovadas; não implementadas, não registradas no banco, não homologadas.**
114. **Blocos 20–25 abertos** sem decisão, com os nomes do pacote: Regra formal de CONVERGENTE, Regra formal de
    DIVERGENTE, Regra formal de SEM DADOS SUFICIENTES, Textos exibidos à profissional, Textos exibidos ao
    paciente, Comparabilidade longitudinal da própria Leitura Integrada (`DECISAO-20…25`); nenhuma relação
    domínio → sistema HOLOSCAN criada; nenhum texto oficial escrito; comparabilidade não assumida.

### Etapa 5.9 — DECISÕES 20–25 registradas; precedência do motor; blocos 26–29 abertos (02/10/2026)

115. **Precedência obrigatória do motor LI (regra estrutural)**: validar aplicação HOLOSCAN → pacote/versão
    compatível → temporalidade → vínculos → resultados → referências/unidades/contexto → suficiência do
    domínio → resolver mistos → derivar direção HOLOSCAN → derivar direção laboratorial → só então o estado.
    SEM DADOS SUFICIENTES tem precedência; CONVERGENTE/DIVERGENTE nunca são fallback. Direções internas
    conceituais `attention_present` / `attention_not_detected` / `indeterminate` (não diagnóstico, score,
    prognóstico ou "doente/saudável"; não exibidas ao paciente; campos não implementados).
116. **CONVERGENTE (DECISÃO 20, arquitetura)**: só com fontes HOLOSCAN e laboratorial elegíveis, suficientes
    e avaliáveis, regras do domínio homologadas, sem precedência de SEM DADOS e direções determinísticas;
    present+present ou not_detected+not_detected → convergente; indeterminate nunca; convergência sem sinal
    não afirma saúde/ausência de doença/risco; um exame isolado fora da referência não converge. **Tabela
    domínio → sistema(s) HOLOSCAN e regras de direção pendentes** (nenhuma inferência por nome; LI-D02 não é
    automaticamente o Sistema Metabólico).
117. **DIVERGENTE (DECISÃO 21, arquitetura)**: present×not_detected em qualquer ordem, só com ambas as fontes
    elegíveis/suficientes/avaliáveis/determinísticas; indeterminate nunca; divergência não é erro, não invalida
    HOLOSCAN nem exame, não prova relato ou laboratório errados, não é baixa adesão nem incoerência; textos
    "HOLOSCAN está errado", "exame contradiz o paciente", "relato inconsistente", "resultado incorreto"
    proibidos; ausência de qualquer requisito → SEM DADOS, nunca divergente. Mesma tabela pendente.
118. **SEM DADOS SUFICIENTES (DECISÃO 22)**: estado oficial com precedência; não é erro, negativo, ausência
    de doença nem divergência; lista explícita de reason_codes (missing_holoscan_source, holoscan_not_evaluable,
    incompatible_holoscan_version, missing_lab_source, insufficient_domain_coverage, missing_required_exam,
    missing_reference, ambiguous_reference, qualitative_rule_missing, censored_value_ambiguous,
    incompatible_unit/variant/material/method, outside_time_window, missing_clinical_date, mixed_without_rule,
    missing_domain_holoscan_mapping, missing_domain_sufficiency_rule, missing_temporal_rule,
    duplicate_result_unresolved, e outros aprovados distintos); explicabilidade obrigatória.
119. **Textos à profissional (DECISÃO 23, estrutura + textos-base)**: estrutura técnica completa (fontes,
    ids, datas, direções, referências, excluídos e motivos, cobertura, regra/versão, observação separada);
    3 textos-base neutros; linguagem proibida; textos por domínio pendentes só se necessários.
120. **Textos ao paciente (DECISÃO 24, estrutura + textos-base)**: simples, não diagnóstico, não alarmista,
    sem reason_codes crus, sem esconder limitações; 4 textos-base (convergente, convergência sem sinais,
    divergente, sem dados); tradução de motivos (tabela completa pendente).
121. **Comparabilidade da LI (DECISÃO 25)**: comparação determinística só entre leituras metodologicamente
    compatíveis (mesmo paciente, domínio, pacote ou compatibilidade explícita entre versões); usa snapshots;
    nunca recalcular leitura antiga, reescrever histórico, trocar fonte ou usar updated_at; incompatível →
    `not_comparable / methodology_not_comparable`, lado a lado, sem delta; mudança de estado nunca é
    melhora/piora. **Status 116–121: decisões humanas aprovadas; não implementadas, não registradas no banco,
    não homologadas.** Pendências não ocultáveis: bloco 5 (regra temporal), 16/17/19 (por domínio), 20/21
    (tabela e direções).
122. **Blocos 26–29 abertos** sem decisão, com os nomes do pacote: Cálculos derivados; Exames
    adicionais/customizados; Legado fora dos 45 (Candida IgG, VHS, HOMA-IR, Cortisol matinal); Insulina de
    jejum (EXA-006) ↔ Insulina basal (LAB-003) — IDENTIDADE NÃO HOMOLOGADA, sem alias automático
    (`DECISAO-26…29`); dependências dos blocos 5, 16, 17, 19, 20 e 21 marcadas.

### Etapa 5.10 — DECISÕES 26–29 registradas; status dos 29 blocos; pacote final de pendências (02/10/2026)

123. **Cálculos derivados (DECISÃO 26; texto conferido na Etapa 5.10.1)**: arquitetura admitida; 0 derivados
    oficiais na LI V1 inicial; cálculo futuro exige calculation_code, nome, fórmula, exam_codes, variantes/
    materiais/métodos aplicáveis, unidades, conversões, elegibilidade, ausências, precisão, arredondamento, fonte,
    justificativa, versão, responsável e aprovação metodológica (governança geral do pacote); 6 regras (preservar
    entradas; não substitui original; não entra nos 45; sem domínio automático; sem LI sem vínculo próprio;
    nada ativado por existir no legado); HOMA-IR legado histórico, não recalculado, não convertido silenciosamente.
124. **Exames customizados (DECISÃO 27; conferido na 5.10.1)**: cadastro fora dos 45 permitido, preservando nome,
    valor, unidade, referência do laudo, variante, material, método, origem, observações, documento; aparece na
    coleta e no histórico; por padrão sem código LAB, domínio, direção, interpretação, referência metodológica,
    conversão, derivado, convergência/divergência ou participação na LI; participação futura só por contrato
    explícito, versionado e homologado; nunca altera silenciosamente os 45; equivalência não inferida por nome.
125. **Legado fora dos 45 (DECISÃO 28; conferido na 5.10.1)**: EXA-001/003/007/024 permanecem `additional_legacy`
    com 8 regras (visíveis no histórico; dados preservados; não apagados; não convertidos em LAB-xxx; fora da LI
    automática; sem herança de legacy_sistema, faixa ideal, texto ou interpretação antigos; fora da contagem dos
    45; futuro — exame adicional, derivado ou catálogo — só por nova decisão); HOMA-IR não recalculado nem
    convertido silenciosamente.
126. **EXA-006 ↔ LAB-003 (DECISÃO 29; conferido na 5.10.1)**: não é alias automático; novos registros usam LAB-003;
    histórico permanece legado até revisão explícita; mapeamento manual individual só quando a profissional
    confirmar mesmo exame e condições de coleta, preservando source_legacy_id, target_exam_code, responsável, data,
    motivo, proveniência e versão da decisão; sem alias textual global; sem migração pelo nome. IDENTIDADE NÃO
    HOMOLOGADA = sem equivalência global, sem impedir o mapeamento individual.
127. **Correção documental de contagem**: a distribuição por domínio escrita na Etapa 5.5 ("D01 8 · D06 13 ·
    D07 10") era erro de digitação; a matriz aprovada (fonte) dá **D01 7 · D02 3 · D03 5 · D04 4 · D05 4 ·
    D06 12 · D07 12 = 47 pares** (45 exames-base, 42 vinculados, 3 sem domínio, 5 multi-domínio). Nenhum
    vínculo mudou. Correção reconferida programaticamente e autorizada por Daniel.
128. **Status dos 29 blocos** (Anexo B do pacote): 21 decididos, 7 com arquitetura decidida e parâmetros
    pendentes, 1 parcial. **Bloqueiam a implementação: 5, 16, 17, 19, 20, 21.**
129. **Pacote final de pendências executáveis** (`docs/v1/laboratorio/PACOTE-FINAL-PENDENCIAS-EXECUTAVEIS-LI-V1.md`):
    fichas por domínio LI-D01…D07, matriz final, janela temporal, matriz domínio → HOLOSCAN, suficiência,
    mistos e checklist de 17 itens — **todos os campos pendentes vazios/PENDENTE, sem sugestão de valor**.
    Nada implementado; LI-V1@1 rascunho com 0 aprovações; migration 20261002110000 não aplicada.

### Etapa 5.10.1 — auditoria de fidelidade dos blocos 26–29; pendências reclassificadas (02/10/2026)

130. **Auditoria de fidelidade** (`docs/v1/laboratorio/AUDITORIA-FIDELIDADE-BLOCOS-26-29.md`): os textos 26–29
    registrados na 5.10 foram comparados campo a campo com o contrato canônico ditado por Daniel; omissões,
    divergências e acréscimos não aprovados corrigidos; nada reinterpretado; nenhum vínculo alterado.
131. **Pendências reclassificadas** em `PACOTE-FINAL-PENDENCIAS-EXECUTAVEIS-LI-V1.md` em três grupos:
    **A** bloqueadores metodológicos do motor LI oficial (5, 16, 17, 19, 20/21); **B** gates operacionais de
    homologação/produção (migrations, cadeia real, auth.uid reais de Daniel e Rodrigo, Aprovação 1, Aprovação 2,
    Homologar, content_hash, deploy) — não são metodologia indefinida; **C** zero declarado/opcional/futuro
    (8, 10, 14, 24, 26, 27, 28, 29) — não bloqueiam. **Bloco 30** = governança já estruturada; pendência apenas
    operacional (migration não aplicada, tabela de aprovadores vazia, auth.uid reais não cadastrados).

### Etapa 5.11 — DECISÃO 05 fechada (LI-TEMP-01 v1); matriz domínio LI → HOLOSCAN preparada sem decidir (02/10/2026)

132. **Janela temporal (DECISÃO 05, DECIDIDO)**: regra **LI-TEMP-01 v1** — `abs(collection.clinical_date −
    application_clinical_date) <= 30` dias corridos, limites inclusivos, global, simétrica, 0 exceções por
    domínio/exame/variante na V1 inicial; regra **operacional autoral e versionada** (não validade fisiológica
    universal); justificativa: determinismo, proximidade, contexto "últimos 30 dias" predominante no HOLOSCAN
    aprovado, explicabilidade, versionamento futuro; âncoras `application_clinical_date` e
    `collection.clinical_date`; nunca created_at/updated_at/saved_at/reviewed_at/last_modified/upload/edição;
    casos 0, ±30 compatible, ±31 incompatible; fora da janela → `outside_time_window` (nada apagado ou
    invalidado), sem data → `missing_clinical_date` sem fallback; múltiplas coletas conforme DECISÃO 06;
    snapshot congela ids, datas clínicas, `temporal_delta_days` com sinal (só rastreabilidade/ordenação/
    explicabilidade), `temporal_status`, `temporal_rule_code`, `temporal_rule_version`; exceções futuras só
    explícitas, versionadas, justificadas, aprovadas, com novo content_hash e análise de comparabilidade.
133. **Bloqueadores metodológicos restantes**: 16, 17, 19, 20/21 (Bloco 5 removido do grupo A do pacote final).
134. **Matriz de decisão domínio LI → HOLOSCAN** (`docs/v1/laboratorio/MATRIZ-DECISAO-DOMINIOS-LI-HOLOSCAN-V1.md`):
    7 linhas LI-D01…D07 com todos os campos decisórios PENDENTE; universo dos 5 sistemas do pacote HOLOSCAN
    aprovado (códigos, IDs primários e contextuais, avaliabilidade ≥ 0,80, escala 0–10, faixas 10/3 e 20/3)
    exibido só como contexto; arquiteturas A–E e opções de múltiplos sistemas documentadas sem recomendação;
    casos de regressão A–H com EXPECTED = PENDENTE; **nenhuma inferência automática** de relação domínio → sistema.

### Etapa 5.12 — Blocos 20/21: matriz domínios LI → HOLOSCAN e cross_source_role (02/10/2026)

135. **Regra 20/21-A — direção HOLOSCAN (aprovada por Daniel)**: para os 5 sistemas, com as faixas oficiais do
    HOLOS-V1@2 e sem cortes novos: faixa baixa → `attention_present`; intermediária → `indeterminate`; alta →
    `attention_not_detected`; sistema não avaliável → `indeterminate`. Direções internas da LI: present ≠ doença,
    not_detected ≠ saúde, indeterminate ≠ ausência de dado clínico.
136. **Regra 20/21-B — cross_source_role (aprovada por Daniel)**: cada vínculo exame → domínio é `directional`
    (pode participar, quando elegível/classificável/suficiente, da direção laboratorial comparada ao HOLOSCAN; não
    é diagnóstico, peso, voto automático nem resolve o domínio sozinho) ou `contextual` (pertence ao domínio,
    visível, classificável, rastreável, pode contar para suficiência se a regra futura determinar, mas não produz
    sozinho direção laboratorial). Atributo adicional do vínculo: 45/42/3/47/5 inalterados.
137. **Matriz final 20/21 (DECISÃO 20-21, `DECISAO-20-21-MATRIZ-FINAL-DOMINIOS-HOLOSCAN-V1.md`)**: D01 →
    `acido_inflamatorio` (directional LAB-016, LAB-018; contextual LAB-001, 025, 026, 028, 029); D02 → `metabolico`
    (directional LAB-002, LAB-003, LAB-004; LAB-003 nunca decide sozinho); D03 → `metabolico` (directional LAB-005,
    LAB-009; contextual LAB-006, 007, 008); D04 → `detox_linfatico` (directional LAB-013, LAB-015; contextual
    LAB-012, 014; dados hepáticos são dados clínicos próprios, não prova de score); D05, D06, D07 → nenhum na V1
    (`holoscan_mapping_mode = none`; todos contextuais; sem Convergente/Divergente; sem herança de legado; ausência
    intencional ≠ `missing_domain_holoscan_mapping`; não é "Sem dados suficientes"). Direções conceituais por exame
    registradas; regras de mistos/discordância PENDENTES no Bloco 19. Relação autoral, comparativa, versionada e
    não diagnóstica. Multidomínio preservado (LAB-034 em D06 e D07), sem duplicar resultado nem voto.
138. **Status 20/21**: ARQUITETURA + MAPEAMENTO DOMÍNIO→HOLOSCAN DECIDIDOS; estado final CONVERGENTE/DIVERGENTE
    depende de 16, 17 e 19. **Motor LI não completo.** Bloqueadores metodológicos restantes: 16, 17, 19.

### Etapa 5.13 — Blocos 16, 17 e 19 fechados: suficiência, mínimos/grupos e resultados mistos (02/10/2026)

139. **Suficiência por domínio (DECISÃO 16, DECIDIDO)**: suficiência cross-source usa somente vínculos
    `cross_source_role = directional`; contextual não aumenta cobertura, não substitui obrigatório, não torna
    suficiente, não cria direção nem convergência/divergência (segue visível, classificável, rastreável);
    nenhum percentual global (50/60/70/80/100%); `cross_source_sufficiency_mode` rule_based (D01–D04) ou
    not_applicable (D05–D07); `lab_domain_availability` ≠ `cross_source_sufficiency`.
140. **Mínimos, obrigatórios e grupos (DECISÃO 17, DECIDIDO)**: D01 min 1, LAB-016 PCR obrigatória, LAB-018
    opcional; D02 min 2 + grupo GLYCEMIC_ANCHOR = LAB-002 OU LAB-004 (insulina nunca resolve sozinha); D03 min 2,
    LAB-005 e LAB-009 obrigatórios; D04 min 2, LAB-013 e LAB-015 obrigatórios; D05/D06/D07 null/[]/[]
    (not_applicable; não é insuficiência nem `missing_domain_holoscan_mapping`). Exame obrigatório ausente ou
    não classificável → SEM DADOS SUFICIENTES com reason code da causa real.
141. **Resultados mistos (DECISÃO 19, DECIDIDO)**: sem maioria, média, score, peso, "um vence", contagem ou
    percentual de alterados; só directional elegíveis/classificáveis/suficientes/temporalmente compatíveis;
    unanimidade → present ou not_detected; mistura → `indeterminate`; `indeterminate` nunca produz
    CONVERGENTE/DIVERGENTE → SEM DADOS SUFICIENTES (`mixed_without_rule` ou código mais específico); D01 PCR
    decide sozinha quando só ela é classificável, PCR + fibrinogênio por unanimidade, fibrinogênio indeterminate
    não invalida a PCR; D02 agrega só os directional classificáveis após a suficiência; D03/D04 unanimidade dos
    dois obrigatórios; D05/D06/D07 not_applicable; ordem conceitual de 11 passos preservando 20/21.
142. **Estado da metodologia LI após 5.13**: blocos 16, 17, 19 DECIDIDOS; 20/21 com dependências resolvidas;
    **0 bloqueadores metodológicos** para definir o motor oficial da LI. Continuam pendentes (operacional/
    técnico): implementação, migrations, validação da cadeia real, approvers reais, auth.uid de Daniel e Rodrigo,
    Aprovação 1, Aprovação 2, Homologar, content_hash final, testes de implementação, deploy. Nada implementado;
    nada homologado; matriz 20/21 e contagens (45/42/3/47/5; 7/3/5/4/4/12/12) inalteradas.

### Etapa 6.0 — implementação executável da Leitura Integrada V1, local (02/10/2026)

143. **Correção semântica de reason code**: mistura `present + not_detected` em conjunto COM regra homologada
    (D01–D04, unanimidade) → `laboratory_direction = indeterminate` com `mixed_results_indeterminate`;
    `mixed_without_rule` reservado a conjunto futuro sem regra homologada. Nenhum estado oficial novo (continua
    SEM DADOS SUFICIENTES). Docs 19, 22, pacote, resumo e pacote final corrigidos.
144. **Migration 20261002120000 (não aplicada)**: extensão mínima do schema (modo de mapeamento e definição do
    domínio; `cross_source_role`, `direction_rules`, `variants_declared`, versão/fonte/justificativa do vínculo;
    tipos de regra `holoscan_direction` e `reason_semantics`; leitura com domínio, direções e snapshot);
    `li_conteudo_canonico`/`li_validar_completude`/`salvar_leitura_integrada` estendidos; seed **LI-V1@2
    em_revisao** com 7 domínios, 47 vínculos (9 directional + 38 contextual) e 18 regras; LI-V1@1 preservado;
    0 aprovações. Provas de contagem na própria migration.
145. **Pacote executável** (`leitura-integrada-pacote-v1.js`): mesmo conteúdo da migration; texto canônico no
    formato `jsonb::text`; **content_hash candidato `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9`**,
    idêntico em PostgreSQL local, servidor falso e JS. Não homologado.
146. **Motor 2.0.0** (`leitura-integrada-motor.js`): 11 passos na ordem decidida; HOLOSCAN como fonte congelada
    (HOLOS-V1 ≥ 2 aprovado; faixa → attention_*; não avaliável → indeterminate); LI-TEMP-01 com delta com sinal;
    duplicidade sem escolha silenciosa (`duplicate_result_unresolved`); suficiência só com directional; unanimidade;
    estado por domínio; D05–D07 `not_applicable` (estado nulo, nunca `missing_domain_holoscan_mapping`);
    snapshot congelável. `laboratorio-motor.js` 1.1.0: censurado determinístico (DECISÃO 15) e referência ambígua.
    Nota conservadora: participante obrigatório com direção `indeterminate` → direção laboratorial indeterminada;
    opcional (fibrinogênio) `indeterminate` não conta nem bloqueia.
147. **Persistência por domínio e snapshot imutável**: leitura salva com `domain_code`, direções e snapshot
    (fontes, datas, deltas, valores/unidades originais, classificações, referências, excluídos, regras/versões,
    pacotes, estado, motivos); observação profissional separada; convergente/divergente só com pacote aprovado e
    direções determinísticas coerentes; domínio sem confronto não recebe leitura cross-source.
148. **UI mínima**: leitura por domínio; fonte HOLOSCAN pela aplicação + pacote metodológico registrado (nunca
    limites legados 3/6); D05–D07 com texto neutro de interface; motivos humanizados; duplicidade com escolha
    explícita; salvar por domínio; sem linguagem diagnóstica; confronto legado fora da saída oficial.
149. **Servidor falso e testes**: fake espelha o contrato (seed LI-V1@2, mesmo hash); suítes novas etapa6-li-motor
    (88), etapa6-li-banco (30), etapa6-li-ui (12); suítes legadas ajustadas por mudança legítima de contrato
    (documentado em `docs/v1/ETAPA6-LEITURA-INTEGRADA.md`); harness SQL `etapa6` (E01–E30) na cadeia local:
    207 checks ok. **Banco real não validado; nada aplicado; nada homologado; nada deployado.**

### Etapa 6.0.1 — fechamento pré-gate real (02/10/2026)

150. **Regra directional indeterminate**: após a suficiência estrutural, participante directional com direção
    `indeterminate` e sem exceção específica → `laboratory_direction = indeterminate`, SEM DADOS SUFICIENTES,
    reason code `directional_result_indeterminate`; `mixed_results_indeterminate` só com mistura real
    present + not_detected; exceção D01 (fibrinogênio opcional) preservada. Regra de mistos v2; pacote JS,
    migration candidata, motor 2.0.1, fake e testes atualizados (D02 HbA1c, D03 HDL, D04 GGT, exceção D01).
151. **Referência ambígua ponta a ponta**: `lab_results.reference_status` aceita `ambiguous` (migration
    20261002130000; referência original preservada; RPC `lab_gravar_resultados` grava `ambiguous` quando declarado);
    LabMotor → `ambiguous_reference` (não classificável, nada fabricado); motor → item excluído com motivo,
    status e texto/limites originais no snapshot; persistência e fake; UI (checkbox "referência ambígua" no
    editor; excluídos com referência original na LI; motivos visíveis na leitura salva). Teste de persistência:
    salvar → reler → motivo presente.
152. **Proveniência das aplicações HOLOSCAN** (`POLITICA-COMPATIBILIDADE-APLICACOES-HISTORICAS-HOLOSCAN-LI.md`):
    nova aplicação recebe `methodology_package_id` + `methodology_package_version` só quando declarados pelo app
    (pacote aprovado e vigente) e validados pelo servidor; campos imutáveis após o insert (sem backfill);
    histórica permanece sem vínculo; LI → `incompatible_holoscan_version`. Nada inferido por data, faixa, respostas
    ou estrutura. Nenhum backfill no banco real.
153. **content_hash candidato recalculado**: anterior `7c6d93a0…` → **novo `fa99ec80507e277307a9b0d2a09a8f0abc1519e55bede08d8715697412137be9`**;
    igual em JS, PostgreSQL local (harness E13/E31) e servidor falso. O anterior não é reutilizado.
154. **Governança da V1: aprovador único (Daniel)** (Etapa 6.3-B, `docs/v1/metodologia/DECISAO-GOVERNANCA-APROVADOR-UNICO-V1.md`,
    migration `20261003100000`). A dupla aprovação (Daniel → Rodrigo) foi substituída por aprovador único. **A perda do controle de quatro
    olhos é uma decisão consciente.** Nenhuma segunda revisão é simulada: `reviewed_by`/`reviewed_at` nulos no regime `aprovador_unico`
    (registrado em `governance_regime`, no registro de homologação e na proveniência/snapshot da LI, com `approval_2` nulo). Os papéis
    de Rodrigo são desativados com data e motivo, nunca apagados. Homologar o HOLOSCAN exige ser dono do pacote e aprovador ativo
    `holoscan`/1. A Aprovação 1 já registrada de Daniel no HOLOS-V1@2 é preservada. Os artefatos da Etapa 6.1 ficam congelados como evidência
    histórica. Nenhuma regra clínica/metodológica muda; os hashes HOLOS `7af1dae6…` e LI `fa99ec80…` também não.
155. **HOLOSCAN só oficial: a tela e o dado salvo saem do MESMO motor** (Etapa 6.5, correção P0 pós-deploy 6.4,
    `docs/v1/ETAPA6-5-CORRECAO-P0-HOLOSCAN-OFICIAL.md`, migration `20261005100000`). Achado: "Gerar o mapa" usava o motor legado
    (`holoscan.js`: pesos 1–3, os 11 vínculos `secondary_contextual` pontuando, Índice renormalizado) e "Salvar" gravava com o carimbo
    HOLOS-V1@2. Agora o mapa é calculado pelo `MotorMetodologico` em modo oficial sobre o pacote aprovado e vigente (`holoscan-oficial.js`),
    sem Panorama/exames/ferramentas, e o payload sai do mesmo objeto, com as respostas do cálculo. Sem pacote carregado não há mapa
    (mensagem + "Tentar novamente"); o motor legado só responde em `?homologacao=1` ou sem Supabase (modo local), com selo, nunca salvo.
    Decisões do responsável (05/10): (1) sem pacote, bloquear e oferecer "Tentar novamente"; (2) aprofundamentos e combinações gravados
    vazios; (3) Índice nulo quando algum sistema não é avaliável (sem Índice parcial); (4) `nota_media` = Índice/10, nula com ele;
    (5) servidor com nível 1 (proveniência: pacote aprovado, vigente, versão, hash homologado e recalculado, modo e contrato do motor,
    atendimento) e nível 2 (contagens: respostas no pacote e na escala, uma nota por sistema, respondidos/total só pelos vínculos primários,
    faixa do pacote, Índice só com todos avaliáveis); recálculo das notas no servidor fica para etapa própria (Edge Function com o mesmo
    motor, nunca um segundo motor em SQL). Sem INSERT direto nas tabelas do HOLOSCAN. Selo pela proveniência: oficial V1, ou "Aplicação
    histórica sem pacote metodológico V1". As 4 aplicações históricas, HOLOS-V1@2 e LI-V1@2 não mudam; sem backfill.
156. **Mapa da Rotina, Gatilhos & Respostas e Conexão & Pertencimento como REGISTROS CLÍNICOS ESTRUTURADOS** (Etapa 6.5 B,
    `docs/v1/ETAPA6-5-B-REGISTROS-CLINICOS.md`, migration `20261005110000`). Catálogo final: Corpo 03, Mente 03, Espírito 04 (10 ativas).
    Sem score, faixa, diagnóstico, classificação, interpretação ou recomendação automática; sem síntese (`resultado` sempre nulo, exigido
    pelo servidor); nenhum efeito em HOLOSCAN, Índice, Tríada, faixas, Leitura Integrada ou exames (Panorama e HOLOS AI não os leem).
    Modelo: `tool_applications` reutilizada (mesmo ciclo rascunho → concluída → revisada, RLS, arquivado, atendimento), com o formato de
    cada registro validado no servidor por lista branca (chaves, tipos, tamanhos, opções). Opções descritivas escolhidas por quem registra:
    categorias da rotina, percepção baixa/média/alta, dias, natureza/tipo/papel/proximidade/momento do vínculo. Intensidade da emoção 0–10
    rotulada "percepção do paciente — não é escore clínico". Espiritualidade em grupo opcional, sem presumir religião, Deus, "algo maior"
    ou família tradicional. Gatilhos: um episódio por aplicação. Histórico: aplicação concluída/revisada é **imutável** (respostas,
    resultado, data e atendimento); a leitura profissional continua (revisada); correção = "Nova a partir desta" (cópia em rascunho novo,
    com `origem_id`) ou "Nova aplicação". As 5 decisões técnicas (percepção baixa/média/alta, intensidade 0–10 como
    percepção, imutabilidade com "Nova a partir desta", um episódio por aplicação, atributos descritivos dos vínculos) foram
    **aprovadas pelo responsável em 06/10**.
157. **IDs novos para os registros clínicos; os antigos ficam congelados no schema antigo** (Etapa 6.5 B, 06/10). Novos:
    `mapa_rotina_v1`, `gatilhos_respostas_v1`, `conexao_pertencimento_v1`, com `versao_ferramenta = 1` exigido pelo servidor.
    Antigos (`mapa_rotina`, `gatilhos_respostas`, `conexao_pertencimento`): legado, inativos, proibidos no servidor, nunca abrem
    o formulário novo, nunca são reinterpretados nem convertidos. Um ID nunca aponta para dois schemas. A tela mostra só o nome
    clínico, sem `_v1`. Teste permanente: `testes/testar-v1-registros-legado.mjs`. Exclusão de aplicação concluída/revisada:
    risco registrado; mudança de contrato das 9 ferramentas fica para etapa própria (possível estado "anulada").
158. **Leitura do HOLOSCAN só com o pacote homologado** (correção pós-6.5, auditoria de produção com Cowork, 06/10). Resultado
    OFICIAL: nome, nota, faixa, o texto público do sistema e a mensagem neutra da faixa, todos do HOLOS-V1@2 (Decisões 9 e 13), mais
    o aviso de que a interpretação clínica é da nutricionista. Sai da tela oficial o que vinha do motor legado e não está no pacote:
    "padrão emocional", "direção terapêutica" (eixos), definições em rascunho. Aplicações HISTÓRICAS em produção: números gravados,
    sem leitura interpretativa legada; a leitura legada só aparece em `?homologacao=1` ou em modo local (mesma regra do motor legado
    na correção P0). Cartões dos sistemas: rótulo neutro "Nota 0 a 10" no lugar de "Score 0 ruim · 10 bom". Nenhum dado mudou.
159. **Dashboard conta os mesmos pacientes em todas as seções** (auditoria do dashboard com Cowork, 06/10). Paciente
    ARQUIVADO não entra em "Precisa de você", "Pacientes recentes", "Atendimentos sem conduta" nem em "Rascunhos"; o tile
    "Pendências" do topo é o mesmo número de "Precisa de você" (pacientes ativos com alerta + atendimentos sem conduta salva, que
    passaram para dentro desse bloco). Consultas marcadas continuam aparecendo (compromisso real), com a etiqueta "arquivado".
    "Próximas consultas" lista todas as consultas futuras por data e hora (até 5), não só a próxima de cada paciente. Hora sem
    segundos em toda a tela (a agenda normaliza "HH:MM:SS" do banco na leitura). Saíram o bloco "N pacientes / N com HOLOSCAN"
    (repetia o cabeçalho com outro número) e o aviso "O terreno da sua carteira" (recurso desligado). Ordem: cabeçalho → Hoje →
    Precisa de você → Rascunhos → Próximas → Recentes → Jornada → Primeiros passos. Botões: "mapa sem conduta" agora é "Abrir
    conduta" (aba Conduta da ficha, também na lista de pacientes); "Abrir conduta" de um atendimento seleciona esse atendimento; a
    Jornada diz qual paciente está em foco, não segue com paciente arquivado e INTEGRAR abre as Ferramentas do paciente (antes ia
    ao Corpo). Cards HOLOSCAN/Corpo/Mente só na apresentação de conta nova. Seletor do HOLOSCAN: opção "Selecione um paciente"
    quando não há paciente ativo, aviso só nesse caso, e "(arquivado)" no nome de quem está arquivado. A sincronização redesenha
    o dashboard quando os dados chegam. Nenhuma regra clínica nem dado mudou. Fica com a nutricionista: os dois cadastros de
    teste com o mesmo nome (um arquivado) — renomear ou remover pela própria tela.
160. **Pacientes e Atendimentos: correções da auditoria de produção** (Cowork, 06/10). (a) HOLOSCAN calculado e guardado
    só no navegador — salvar exige atendimento selecionado e, sem ele, nada vai ao servidor — passa a ser dito: selo
    "não salvo no servidor" ao lado do selo oficial (mapa e lista de aplicações) e pendência "HOLOSCAN não salvo no servidor"
    (dashboard e lista de pacientes). Não há reenvio automático: o vínculo com o atendimento é escolha explícita. Uma aplicação
    com exatamente as mesmas respostas de outra já salva no mesmo dia não é gravada de novo. "Voltaram para reavaliar" conta
    aplicações em pelo menos dois dias distintos. (b) Atendimentos: "Abrir ficha" vai para a ficha; "Abrir atendimento"
    seleciona o atendimento na aba Conduta; listas com layout; consulta de hoje já passada vai para "anteriores", que dizem se há
    atendimento registrado e oferecem registrá-lo; aplicações do mesmo dia em ordem decrescente. (c) Arquivado: botão principal
    "Reativar", menu só Reativar/Remover, botões de registro da ficha desabilitados de verdade, botão "Reativar paciente" na
    ficha; ao carregar, o foco é o primeiro paciente ativo; contadores (menu lateral, cabeçalho, "Novos", "Sem contato") só de
    ativos. (d) "Último contato" = o mais recente entre atendimentos registrados e HOLOSCAN ("Sem atendimento ainda"). (e)
    Cadastro recusa nascimento futuro e telefone sem 8–15 dígitos; "Novo paciente" na aba Revisão volta para a Lista; campo Sexo
    no visual dos demais; "Registrar exames"/"Novo documento" rolam até o ponto certo da aba Documentos; "Gerar o mapa" vazio
    avisa em toast; Esc fecha a confirmação de excluir; a barra de contexto some na seção Pacientes; ir para Pacientes sem
    abrir ficha mostra a lista. Fica PENDENTE de decisão: se aplicação parcial antiga (ex.: 30 de 84 respostas, motor anterior)
    conta como aplicação — o motor oficial já exige cobertura mínima; as históricas não são alteradas (sem backfill). Dados de
    teste duplicados ou sobrando no banco não foram tocados.
161. **Agenda: correções da auditoria de produção** (Cowork, 06/10). Abrir a ficha a partir de outra tela (Agenda,
    Atendimentos: "Abrir/Iniciar atendimento", "Abrir ficha") navega para Pacientes antes (`levarPara`). O atendimento é o que
    ACONTECEU: com a consulta de origem ainda no futuro, a data/hora sugerida é agora, e data/hora no futuro são recusadas.
    Consulta com atendimento registrado não pode ser desmarcada nem reagendada. Bloqueio por cima de consulta pergunta antes
    ("Conflito de horário"), como a consulta por cima de bloqueio. Eventos simultâneos dividem a largura da coluna. Nova
    consulta: só pacientes ativos, começa em "Selecione o paciente" (a ficha continua abrindo já com a pessoa), paciente
    travado na edição, hora sugerida nunca no passado (próxima hora cheia hoje). Mudar dia/hora e clicar "Salvar" REAGENDA
    (a original fica cancelada e ligada à nova); "Reagendar" só habilita com mudança. Item do quadro "Hoje" abre a consulta.
    Abrir a Agenda pelo menu volta para hoje. Hora sem segundos (normalização na leitura, item 159). Dados de teste no banco
    (consultas canceladas, atendimentos abertos, bloqueio de teste) não foram tocados.
162. **HOLOSCAN: correções da auditoria de produção** (Cowork, 06/10). A tela mostra, junto do "Salvar", a qual
    atendimento a aplicação ficará ligada, com troca e "Novo atendimento" (atendimento com data no futuro é sinalizado).
    Salvar um questionário incompleto pede confirmação mostrando a cobertura e se o Índice saiu (nenhum limite presumido,
    Mestre §18); cancelar não grava. Aplicação calculada e não salva no servidor não entra nos números de Atendimentos
    (continua listada com "não salvo no servidor", item 160). Um só "Limpar" (o do questionário), com o modal do app — o
    `confirm()` nativo saiu também do "Gerar o mapa" com perguntas em branco (a confirmação passou para o Salvar). Clicar de
    novo numa resposta marcada a desmarca. Seletor sem arquivados (exceto o paciente em foco) e "Carregando pacientes…"
    durante a carga. Texto da seção 2 sem "Pontue cada sistema"; seções numeradas 1–6; acentos da leitura legada; nome
    inteiro do paciente nas mensagens. "Onde olhar primeiro": nome do sistema sem quebra e aviso legível. Botões para seguir
    para Leitura Integrada e Conduta. NÃO mudou (conteúdo metodológico do HOLOS-V1@2, fora do escopo): textos iguais dos
    cinco sistemas ("Área do mapa…") e da faixa, redação das perguntas de antibiótico e PCR com a escala de frequência.
163. **Leitura Integrada e exames: correções da auditoria de produção** (Cowork, 06/10). Só apresentação — nenhuma regra do
    LI-V1@2, nenhum estado calculado e nenhum dado congelado (snapshot/hash) mudam. Domínio "Sem dados suficientes" diz o porquê
    quando é falta de direção (HOLOSCAN sem direção definida na faixa intermediária; exames sem direção comum). Nomes clínicos no
    lugar de códigos (exames, sistema, faixa com acento, domínio); regras, códigos e snapshot recolhidos em "Ver detalhes técnicos";
    cada domínio marcado "Confronto HOLOSCAN × exames" ou "Informação laboratorial (sem confronto)". Seletores sem id/estrutura;
    aplicação incompleta aparece desabilitada; "registrada em" só quando há duas aplicações na mesma data. "Calcular leitura" só
    com aplicação e coleta escolhidas. Leituras salvas com data/hora local e nome do domínio; a leitura salva grava o
    `encounter_id` do atendimento ativo (o RPC já aceitava); responsável vem do Perfil e não esvazia. Referência "até X" / "≥ X"
    e decimal com vírgula. "Marcar como revisada" e "Remover bloqueio" usam o modal do app (sem `prompt`/`confirm` nativos).
    Formulário de coleta e Leitura Integrada com CSS. Painel legado de exames recolhido. Texto da ficha sem "sem regra homologada
    ainda"; "Documentos" vira link. PENDENTE de decisão metodológica (não alterado): tratamento da faixa intermediária do
    HOLOSCAN na direção (hoje "indeterminada" → domínio sem confronto) e a regra de unanimidade dos resultados mistos (ex.:
    glicemia e HbA1c altas com insulina normal → direção laboratorial indeterminada). A nota no snapshot como fração exata
    ("35/6") é a representação racional do motor (E4.2), não erro; relatórios devem formatar ao exibir.
164. **Ferramentas Corpo/Mente/Espírito: correções da auditoria de produção** (Cowork, 06/10). Nenhuma ferramenta conclui
    aplicação vazia (antes só a que declarava `exige_resposta`; 9 de 10 gravavam "concluída" sem resposta) — campos de controle
    (`origem_id`, `versao_ferramenta`) e caixas desmarcadas não contam; "Registrar leitura" vazia é recusada. OQ3/PQQ: "Limpar"
    numa aplicação salva começa uma NOVA (modal do app), em vez de esvaziar e deixar o "Salvar" sobrescrever a salva; OQ3 recusa
    data de consulta no futuro. Editar uma aplicação REVISADA mantém "revisada" (antes voltava a "concluída" sem aviso) e avisa
    que a leitura continua. Régua não respondida sem marcador e com "não respondido" (antes parecia 5). O cabeçalho de cada
    ferramenta diz o atendimento ao qual ela fica ligada (o vínculo já era gravado se houvesse atendimento selecionado; continua
    opcional — exigir atendimento, como no HOLOSCAN, fica PENDENTE de decisão). Ficha e dashboard redesenham depois de salvar
    (pendência "mapa sem conduta" não fica velha). Cartão do Espírito na apresentação do dashboard. Acentos (Linha do Momentum,
    Mapa de Crenças, Roda, Carta). "Marcar como revisada" da coleta: o nome digitado é gravado em `revision_note` ("revisado por
    …") — não se perde. PENDENTE: padronizar editável × travado depois de concluir entre as ferramentas de registro e as demais.
165. **Perfil: correções da auditoria de produção** (Cowork, 06/10). Nome completo obrigatório (assina os documentos) e
    e-mail validado, ambos checados ANTES de alterar o perfil em memória. Texto das imagens da aba Marca: com conta, "salvas na
    sua conta" (sobem ao servidor), mantido o aviso de que não é assinatura ICP-Brasil. Aviso "sem registro/sem assinatura" só
    com o que de fato falta. Cor digitada inválida: campo marcado e aviso (a cor salva não muda). Prévia de assinatura/carimbo em
    fundo branco. Fuso: avisa que muda data e hora dos registros clínicos (e saiu a menção ao "retorno de 4 semanas", que não
    existe desde a Etapa 0). Texto da cópia local corrigido: ao sair, a cópia de trabalho fica guardada neste navegador
    separada por conta (stash, para devolver rascunhos não sincronizados) — "sair limpa essa cópia" era falso. PENDENTE de
    decisão (privacidade × rascunho): apagar o stash ao sair (protege computador compartilhado, perde rascunho não sincronizado)
    ou manter (comportamento atual, coberto por testar-troca-conta e testar-rodada08-sessao).
166. **HOLOSCAN: nota visível e selo "não salvo" coerente** (testes reais, 06/10). (a) A nota de cada sistema estava DENTRO da
    régua manual, e a régua é escondida fora da homologação (item das réguas manuais): os cinco cartões não mostravam número
    nenhum. A nota e a faixa do pacote ficam agora num bloco próprio do cartão; a régua continua só em `?homologacao=1`. Os
    rótulos emocionais/espirituais da versão antiga ("Estagnação e desordem", "Bloqueio no plexo solar"…) saíram dos cartões:
    não pertencem ao HOLOS-V1@2 (mesma regra do item 158). (b) Gerar o mapa de novo com as mesmas respostas de uma aplicação
    já salva criava uma entrada local pendente ao lado da salva — o Salvar recusava a duplicata e o selo "não salvo no
    servidor" ficava para sempre. Agora o cálculo repetido É a aplicação salva (local e na sincronização); o Salvar marca a
    entrada pelo instante do cálculo (não mais "a de hoje"), então calcular num dia e salvar no outro não deixa órfão.
167. **Resultado desta aplicação e "Por onde investigar"** (testes reais, 06/10; decisão da usuária: "resumo com o que existe").
    Quadro no topo do resultado do HOLOSCAN que só REORGANIZA conteúdo aprovado: sistemas do mais baixo ao mais alto com nota
    e faixa, Tríade e dimensão mais baixa, sistemas sem nota (cobertura < 80%), e "Por onde investigar" — os dois sistemas de
    nota mais baixa com os sinais que mais pesaram (aritmética das respostas, já exibida no bloco 3). O bloco fixo "Por onde
    começar" saiu (sugestões de ferramenta continuam desligadas, item 65). Campo "Sua interpretação" no próprio quadro,
    gravado em `holoscan_applications.interpretacao_texto` (único campo editável do snapshot). Nenhum texto de conclusão
    clínica é gerado. PENDENTE de decisão de método: textos de conclusão por sistema × faixa (15) e ferramentas sugeridas
    por sistema — exigem nova versão do pacote (HOLOS-V1@3) com aprovação.
168. **Leitura Integrada guiada e laudo → coleta** (testes reais, 06/10; decisão: "em 2 fases" e "guiar para lançar exame").
    Sem coleta, a Leitura Integrada explica que compara o HOLOSCAN com valores de exame e oferece "Lançar exame" e "Lançar
    valores de <laudo>" para os PDFs/imagens já enviados sem coleta. Só coleta CONSOLIDADA entra na lista (DECISAO-04:
    rascunho e `extracted_draft` ficam fora; antes o rascunho aparecia). Na lista de documentos, cada laudo mostra "valores
    lançados" / "sem valores lançados" e o botão "Lançar valores deste exame", que abre a coleta já ligada ao documento
    (`document_id`), com a data dele e o laudo aberto ao lado. Nada é lido de dentro do arquivo nesta fase. Fase 2 (leitura
    automática por IA, sempre como rascunho com revisão humana) desenhada em `docs/v1/laboratorio/IMPORTACAO-EXAMES-IA.md`,
    PENDENTE: chave de API como segredo do Supabase e decisão sobre enviar laudos a um provedor de IA (LGPD/consentimento).
169. **Teste real de ponta a ponta (07/10) e página de Ajuda.** Tudo o que o roteiro salvou foi conferido no banco. Correções de
    tela: o atendimento ativo fica guardado na aba do navegador (sessionStorage, por paciente) e volta depois de recarregar;
    com um atendimento antigo ativo, a aba Conduta e a Visão geral mostram onde está a conduta vigente da pessoa; a ficha conta
    os resultados das coletas V1 (antes só o painel legado); HOLOSCAN salvo não aparece mais como "não iniciado"; o alerta
    "mapa sem conduta" some quando há conduta registrada; busca de exames com sinônimos SÓ DE BUSCA ("glicose" → Glicemia de
    jejum; não viram alias nem mudam o catálogo do servidor) e contador acompanhando a busca; "Próxima consulta" ignora a de
    hoje que já passou ou já virou atendimento; "Ver" de uma consulta no Dashboard abre a consulta; o relatório desenha a
    referência do laudo, que já estava no snapshot. Nova seção **Ajuda** (perguntas frequentes, passo a passo, glossário e
    "reportar um erro" que monta um relato SEM dado de paciente e o copia; envio por e-mail só se houver endereço de suporte
    configurado). PENDENTE: o texto "resultados ainda não oficiais / Pacote V1 não homologado" do relatório vem do servidor
    (`emitir_relatorio`, migration 20261001220000) e precisa de uma migration nova; "Por onde investigar" lista sinais
    espirituais dentro de sistemas físicos porque é assim que o pacote HOLOS-V1@2 associa os marcadores — conferir com o
    método (Daniel), não é ajuste de tela.

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
- ~~**Catálogo final das 10 ferramentas**~~ — **IMPLEMENTADO localmente na Etapa 6.5 B** (item 156): Mapa da Rotina,
  Gatilhos & Respostas e Conexão & Pertencimento como registros clínicos estruturados. Pendente: aplicação no banco real e deploy.
- **Quatro estados administrativos do paciente** — cadastrado, em acompanhamento,
  acompanhamento encerrado, arquivado (Mestre §33); hoje só ativo/inativo.
- **HOLOS AI obrigatória no lançamento inicial?** (Mestre §41.4)
- **Política de data futura de coleta** — regra da Rodada 08 sem contrato no Mestre;
  separada em `supabase/migrations-pendentes/`.
- ~~**Homologação do Pacote Metodológico V1**, parcialidade, pesos, faixas, Índice, Tríada~~ —
  **DECIDIDAS na Etapa 4.2** (itens 52–66). Pendente só a **publicação técnica**: validar a
  cadeia 130000→210000 no banco real, registrar a Aprovação 1 (Daniel) e a Aprovação 2 (Rodrigo)
  sobre o mesmo pacote, versão e hash, e então homologar o HOLOS-V1@2 (item 67).
- **Leitura Integrada** — infraestrutura (Etapa 5), decisões 1–29 (Etapas 5.4–5.13) e **implementação local**
  (Etapa 6.0, itens 143–149) concluídas. Pendente só o gate técnico/operacional (grupo B de
  `docs/v1/laboratorio/PACOTE-FINAL-PENDENCIAS-EXECUTAVEIS-LI-V1.md`): validar a cadeia no banco real, aplicar as
  migrations, cadastrar os `auth.uid` reais, Aprovação 1 (Daniel), Aprovação 2 (Rodrigo), Homologar LI-V1@2
  (hash `fa99ec80…`), registrar o pacote V1 nas aplicações HOLOSCAN, deploy. (Mestre §24)
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
