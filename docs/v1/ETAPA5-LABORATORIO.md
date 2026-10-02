# HOLOHACKING V1 — ETAPA 5 CONCLUÍDA

Laboratório, coletas, motor laboratorial e infraestrutura da Leitura Integrada. 02/10/2026.

**Nenhuma regra clínica foi inventada.** O Documento Mestre (§21–§24) é a autoridade; o AS-IS só serviu
para entender o legado (`laboratorio/INVENTARIO-LABORATORIO-AS-IS.md`). Toda decisão metodológica
pendente está em `laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`. A metodologia HOLOSCAN
(Etapa 4.2) **não** foi reaberta: HOLOS-V1@2 continua `em_revisao`, nenhuma aprovação registrada.

## BASELINE
- branch inicial: `claude/v1-etapa4-2-metodologia-final`
- HEAD inicial: `dd50183` (93 suítes, 2988 asserções, 0 falhas)

## GIT
- branch: `claude/v1-etapa5-laboratorio`
- commits (a partir de dd50183):
  - `ca01683` feat(labs): catalogo laboratorial v1, motor laboratorial e infraestrutura da leitura integrada
  - `8a3524c` feat(labs): painel V1 de coletas, barreira do confronto legado e integracoes
  - `c244791` test(labs): servidor falso, testes da etapa 5 e ajustes de contrato
  - `d643e66` docs(labs): catalogo, modelo, referencias, contrato da leitura integrada e decisoes da etapa 5
  - commit deste relatório: docs(labs): fecha a etapa 5
- working tree limpo após o commit deste relatório; push em `origin/claude/v1-etapa5-laboratorio`.

## CATÁLOGO (`laboratorio-catalogo.js`, `lab_exam_catalog`, `laboratorio/CATALOGO-45-V1.md`)
- exames-base: **45** (LAB-001..LAB-045), códigos únicos, 18 categorias, 16 aliases explícitos (TGO↔AST,
  TGP↔ALT, Gama GT↔GGT, Paratormônio↔PTH, 25 OH vitamina D↔Vitamina D 25-OH, entre outros).
- busca: nome/alias exato ou prefixo de palavra; **sem fuzzy matching**. Filtro por categoria.
- não é painel obrigatório; HOMA-IR, VHS, cortisol e Candida **não** entram.
- PCR ≠ PCR-us e Magnésio ≠ Magnésio eritrocitário: mesmo `exam_code`, `variant` explícita; material nunca inventado.
- custom exams por profissional (`lab_custom_exams`): dado do dono, não global, sem regra/referência/vínculo, fora dos 45.
- legado fora dos 45: 4 (Candida IgG, VHS, HOMA-IR, Cortisol matinal) → `additional_legacy`, preservados.
- Hemograma completo = 1 item (LAB-001) + `lab_result_components`.

## COLETAS (`lab_collections`, `laboratorio/MODELO-COLETA-RESULTADO.md`)
- identidade por `id`; duas coletas na mesma data coexistem (teste de banco + UI).
- "Nova coleta" sempre insere (sem id); "Editar esta coleta" exige id e só vale para `rascunho`;
  consolidada → "Revisar (nova versão)" com motivo, quem, quando, versão anterior intacta (`supersedes_id`).
- `encounter_id` opcional e explícito (checkbox); **nenhuma** associação automática por data.
- `clinical_date` (`coletado_em` + `clinical_time`) separada de `created_at/updated_at`; histórico ordena
  pela data clínica, nunca por `updated_at`.
- estados `rascunho` (fora da saída oficial: HOLOS AI, timeline, relatório, LI a ignoram) → `salvo` (só
  após confirmação do servidor) → `revisado` (ação humana identificada). Triggers impedem alterar/apagar
  consolidada. "Usar estrutura da coleta anterior" copia só a estrutura.
- escrita direta / RPC legada `salvar_coleta_exames` continuam funcionando (`source = legacy_panel`,
  default da coluna): identidade pelo id, nenhum upsert por data (auditado: migration 140000; teste
  `testar-rodada08-exames`, `testar-v1-etapa0` 11–13).

## RESULTADOS (`lab_results`)
- `value_original_text` **not null**, sempre preservado; `numeric_value` só com `qualifier = eq`;
  censurado ("< 0,10") → `qualifier lt` + `censor_limit`, numérico nulo (CHECK); qualitativo preservado
  ("Negativo", "Reagente", "Não detectado"), nunca 0.
- unidade, variante, método, material explícitos; identidade única por coleta (exame, variante, material).
- referência **do laudo** (`report_reference_*`, `reference_status informed|missing`, `reference_source laudo`).
- hemograma composto: componentes só em exame composto (trigger).

## REFERÊNCIAS (`laboratorio/REFERENCIAS-E-UNIDADES.md`)
- do laudo: a única usada na V1. Metodológica: `lab_method_references` **vazia**, sem botão, sem aprovação.
- ideal universal legado: **removido da saída oficial**; preservado em `legacy_ideal_min/max`.
- ausência de referência ≠ dentro (`not_classifiable / missing_reference`).
- conversões reais aprovadas: **0** (`lab_unit_conversion_rules` vazia); cálculos derivados: **0**.

## MOTOR LABORATORIAL (`laboratorio-motor.js`, `motor-lab-1.0.0`)
- estados `below | within | above | not_classifiable` + `reason_codes` + trace.
- unidade diferente sem conversão aprovada → `incompatible_unit`; variante/material/método diferentes →
  `incompatible_variant/material/method`; qualitativo → `qualitative_without_rule`; censurado → `censored_value`.
- **nenhum score laboratorial global**, nota, índice ou percentual.

## COMPARAÇÃO (Evolução)
- usa `clinical_date`; só mesma identidade + unidade igual (ou conversão aprovada) + numéricos.
- delta e direção `aumentou/reduziu/permaneceu`; **nunca** melhorou/piorou; referências diferentes visíveis.

## LEITURA INTEGRADA (`leitura-integrada-motor.js`, `laboratorio/LEITURA-INTEGRADA-CONTRATO.md`)
- infraestrutura: pacotes, domínios, vínculos exame→domínio, regras (suficiência, temporal, mistos,
  convergência, textos), leituras salvas (snapshot imutável + revisão), RLS, RPC com barreira no servidor.
- pacote real `LI-V1@1`: `rascunho`, **0** domínios, **0** vínculos, **0** regras → único estado real
  `sem_dados_suficientes` com motivos (`sem_regra_homologada`, `sem_associacao_aprovada`, …).
- convergente/divergente: só em fixtures `TEST_FIXTURE_ONLY` A–F do teste de motor; a migration e a UI não
  as contêm (teste explícito); o servidor recusa convergente/divergente sem vínculo aprovado.
- seleção explícita: 1 aplicação HOLOSCAN consolidada + N coletas por id; nunca "a última coleta".
- a leitura só lê `holoscan_applications` quando é desenhada (seção/aba aberta); o painel de exames não lê o HOLOSCAN.

## BARREIRA
- exames alteram sistemas/Índice/Tríada: **NÃO** (`testar-holoscan` B/C/D; `testar-v1-etapa5-banco`, `-ui`).
- confronto legado (`confrontar()`, `window.Holoscan`, `nota ≤ 3`, "um exame fora") alimenta saída oficial:
  **NÃO** — só em `?homologacao=1`, rotulado "LEGADO (modo de homologação) … não é saída oficial" (tela
  Confronto e aba HOLOSCAN da ficha).
- HOLOS AI recebe inferência: **NÃO** — só fato registrado (exame, variante, valor original, unidade, data,
  referência do laudo) de coletas salvas/revisadas; linha legado mantém o formato antigo (nome, valor,
  unidade, data), sem ideal.
- Conduta: nada gerado automaticamente.

## MIGRATION (`supabase/migrations/20261001220000_etapa5_laboratorio.sql`) — NÃO aplicada em produção
- catálogo (45 seeds, trigger de proteção), custom exams, colunas V1 em coletas/resultados, componentes,
  referências/conversões/derivados (vazias, select-only), tabelas da Leitura Integrada (LI-V1 seed),
  `integrated_readings`, triggers de consolidação, RPCs `salvar_coleta_laboratorial`,
  `revisar_coleta_laboratorial`, `marcar_coleta_revisada`, `salvar_leitura_integrada`, `lab_gravar_resultados`;
  `emitir_relatorio` com os campos V1 (rascunho recusado).
- migração determinística do legado por `lab_mapear_legado()` + trigger `lab_preencher_legado`
  (`laboratorio/MIGRACAO-LEGADO.md`): 24 EXA-* = 19 mapeados (PCR-us → LAB-016 `ultrassensivel`;
  Mg eritrocitário → LAB-021 `eritrocitario`, material nulo) + 1 `requires_manual_mapping` (Insulina de jejum,
  `exam_code` nulo) + 4 `additional_legacy` (contagem corrigida na Etapa 5.1; antes dizia "20 mapeados"); nenhum resultado perdido; gravações futuras do painel
  legado passam pela mesma regra.

## CADEIA LOCAL (PostgreSQL 16 local, `scripts/validar-cadeia-local.sh`)
- 130000 → 220000 + harnesses (Etapa 1, 2, 3, 4, 4.2, dupla aprovação, Etapa 5 L01–L43): **116 checks ok,
  0 falhas**, tudo em BEGIN … ROLLBACK, nada persistido.

## BANCO REAL
- validado: **NÃO** — sem conexão direta autorizada nesta sessão; **VALIDAÇÃO REAL PENDENTE**.
- alterado: **NÃO**.

## TESTES
- suíte completa: 96 suítes, 3167 asserções, 0 falhas.
- novos: `testar-v1-etapa5-motor.mjs` (53), `testar-v1-etapa5-banco.mjs` (64), `testar-v1-etapa5-ui.mjs` (51).
- **testes legados atualizados por mudança legítima de contrato** (nenhuma asserção removida; as do
  confronto legado passaram a rodar em `?homologacao=1`, e ganharam a contraparte oficial):
  - `testar-holoscan.mjs` E/F: `#holo-confronto` oficial = Leitura Integrada V1 ("sem dados suficientes",
    sem selo por sistema, exame fora da faixa não vira Divergente); F2 novo: legado só em `?homologacao=1`,
    rotulado, com o Detox "Divergente" preservado ali e o Índice intacto.
  - `testar-ficha-holoscan.mjs`: aba HOLOSCAN da ficha oficial = Leitura Integrada V1 (CTA, pacote LI-V1,
    sem `.conf-item`, sem "Última coleta"); as asserções originais (VAZIO, SEM MAPA, COM MAPA, ESTADOS,
    HISTÓRICO) rodam em `?homologacao=1` com o rótulo LEGADO; barreira oficial com a mesma receita.
  - `testar-ficha-holoscan-questionario.mjs`: "nenhum bloco Última aplicação" passou a procurar o título
    exato (a aba agora também tem o título "Leitura Integrada (V1)").
  - `testar-arquivos.mjs`, `testar-ficha-abas.mjs`: aba Documentos com 3 cartões (documento, Exames
    laboratoriais V1, Painel legado rotulado "fora da saída oficial").
  - `testar-storage-manifest.mjs`: 51 scripts no `index.html`. `testar-conferir-producao.mjs`: §3.5 com 53 arquivos.
- regressões corrigidas durante a suíte (não eram mudança de contrato): gravação direta do painel legado em
  `lab_results` (campos V1 preenchidos por trigger/espelho), default `source = legacy_panel`, leitura de
  `holoscan_applications` só ao desenhar a Leitura Integrada, HOLOS AI com formato legado para linha legado.

## DOCKER / DEPLOY
- build na HEAD final (commit deste relatório, que não altera arquivo servido): `version.json.commit == HEAD`,
  rotas 200 (inclui os 4 scripts novos), `OK: 53 de 53` idênticos. Deploy: **NÃO executado**.

## SEGREDOS
- auditoria (service_role, JWT, password, DATABASE_URL, tokens, chaves privadas) nos arquivos novos/alterados:
  nenhum segredo novo; as únicas ocorrências são pré-existentes (campos `type="password"` do `index.html` e a
  autenticação simulada do servidor falso). Publishable key existente não foi tocada nem impressa.

## PENDÊNCIAS METODOLÓGICAS (decisão humana; `laboratorio/HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`)
domínios · vínculos exame→domínio · janela temporal · suficiência · resultados mistos · regras de
convergência/divergência · referências metodológicas · conversões · cálculos derivados · qualitativos ·
censurados · mapeamento manual (Insulina de jejum) · autoridade/dupla aprovação para esses itens.

## RESULTADO
- Etapa 5 aprovada tecnicamente: **SIM** (gate técnico do banco real pendente).
- dados laboratoriais V1 prontos: SIM. Leitura Integrada estruturalmente pronta: SIM. Clinicamente
  homologada: **NÃO**.
- próximo passo: validar a cadeia 130000→220000 no banco real (BEGIN/ROLLBACK), depois decisões humanas da
  tabela de pendências. **Etapa 6 não iniciada.**
