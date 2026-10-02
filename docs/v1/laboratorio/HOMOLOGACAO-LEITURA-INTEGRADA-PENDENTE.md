# HOMOLOGAÇÃO PENDENTE — LEITURA INTEGRADA E REFERÊNCIAS LABORATORIAIS

Etapa 5 · 02/10/2026. **Nada abaixo foi decidido.** Nenhum valor é proposto como aprovado; nenhuma associação foi inventada. A infraestrutura existe (`LEITURA-INTEGRADA-CONTRATO.md`); o conteúdo é decisão humana da liderança do método, a registrar com a mesma disciplina da Etapa 4.2 (versão, responsável, provenance, dupla aprovação quando aplicável).

Enquanto estes pontos estiverem abertos: toda Leitura Integrada real é **sem dados suficientes**; nenhum exame é classificado contra referência metodológica; nenhuma conversão ou cálculo derivado existe; HOLOS AI, relatórios, Evolução e Conduta não recebem inferência laboratorial.

| # | O que precisa ser decidido | O que existe hoje | Fonte atual |
|---|---|---|---|
| 1 | **Quais domínios existem** na Leitura Integrada (e se domínio = sistema HOLOSCAN ou outra entidade) | nenhum domínio; `integrated_reading_domains` vazia | — (o legado usava os 5 sistemas via `exames.csv.sistema`, sem decisão registrada) |
| 2 | **Quais exames pertencem a cada domínio**, com direção (acima/abaixo/qualquer) | nenhum vínculo; `integrated_reading_exam_domain_links` vazia | legado: `exames.csv.sistema` (24 EXA-*), preservado só como `legacy_sistema` |
| 3 | **Variante/material/método aceitos** por vínculo (ex.: PCR vs PCR-us; Mg vs Mg eritrocitário) | identidade preservada no resultado; nenhuma equivalência definida | — |
| 4 | **Referências elegíveis** para classificar (laudo, metodológica, ambas; prioridade) e **referências metodológicas** por exame/variante/material/população (com fonte, versão, vigência) | só a referência **do laudo**; `lab_method_references` vazia; ideal legado fora da saída oficial | legado: `ideal_min/max` de "literatura funcional — revisar", sem fonte homologada |
| 5 | **Janela temporal** entre aplicação HOLOSCAN e coleta (dias; por domínio ou global) | nenhuma regra `temporal` | — |
| 6 | **Suficiência mínima** (quantos resultados classificáveis por domínio; quais obrigatórios) | nenhuma regra `sufficiency` | — |
| 7 | **Tratamento de resultados mistos** (dentro e fora no mesmo domínio): maioria, qualquer fora, insuficiente | nenhuma regra `mixed` | legado: "qualquer fora" (`alterados > 0`), **não homologado** |
| 8 | **Regra para convergente** (como "HOLOSCAN alterado" é definido: nota ≤ X, faixa, outro; como "laboratório alterado" é definido) | nenhuma regra `convergence` | legado: `nota ≤ 3` × "um exame fora", **não homologado** |
| 9 | **Regra para divergente** (e se há assimetria: HOLOSCAN alterado + exames dentro vs HOLOSCAN ok + exames fora) | idem | legado: ambos os casos viravam "diverge", **não homologado** |
| 10 | **Textos** por estado (convergente / divergente / sem dados suficientes), por domínio ou globais, neutros | nenhum texto (`rule_type = text`) | legado: frases fixas de `window.Holoscan.texto` e leituras causais do CSV, fora da saída oficial |
| 11 | **Regras qualitativas** (como "Negativo/Reagente/Não detectado" entram, se entram) | qualitativo = não classificável | — |
| 12 | **Conversões de unidade** aprovadas (fator, fonte, versão) | `lab_unit_conversion_rules` vazia; unidade diferente = não classificável/não comparável | — |
| 13 | **Cálculos derivados**, se algum (HOMA-IR, LDL calculado, razões): fórmula, versão, entradas, unidades, critérios, fonte | `lab_derived_calculations` vazia | legado: HOMA-IR como item digitado (EXA-007), preservado como `additional_legacy` |
| 14 | **Censurados** ("< 0,10", "acima do limite"): se e como classificam | não classificável | — |
| 15 | **Mapeamento manual** dos itens legado marcados `requires_manual_mapping` (Insulina de jejum × Insulina basal; qualquer EXA-* sem identidade provada) | preservados com nota | `MIGRACAO-LEGADO.md` |
| 16 | ~~**Status/autoridade** para aprovar~~ — **FECHADO TECNICAMENTE na Etapa 5.2**: mesma governança do HOLOSCAN (Aprovação 1 Daniel → Aprovação 2 Rodrigo, mesmo `package_id/version/content_hash`, invalidação por mudança, ação final `homologar_pacote_li` com validador de completude). Referências, conversões e derivados só são elegíveis quando referenciados pelo pacote (dependências/vínculos) — entram no hash e no snapshot. **Nenhuma aprovação registrada.** | `GOVERNANCA-HOMOLOGACAO-LI-V1.md`; migration 20261002100000 (não aplicada) | Etapa 4.2 (mesmo modelo) |

Enquanto não decidido: preservar dado bruto + marcar pendência + não produzir saída oficial dependente. Os itens 1–15 continuam abertos (conteúdo metodológico); o item 16 (governança) está fechado tecnicamente, sem nenhuma aprovação real.
