# DECISÃO 25 — COMPARABILIDADE LONGITUDINAL DA PRÓPRIA LEITURA INTEGRADA

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 25 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende da DECISÃO 06 (snapshot), da regra transversal (eixo 3) e dos blocos 16–22.

> **DECIDIDO QUANTO À ARQUITETURA DE COMPARABILIDADE — Etapa 5.9 (02/10/2026, Daniel).** Decisão metodológica humana registrada abaixo. **Ainda não é**: implementação, migration clínica, alteração do banco real, Aprovação 1, Aprovação 2, homologação ou deploy. Nenhuma tabela domínio → sistema, regra de direção, parâmetro ou texto específico por domínio foi criado.

## Pergunta (como no pacote)

**Se duas leituras salvas do mesmo paciente podem ser comparadas (mesma versão de pacote, mesmos domínios, mesma aplicação ou aplicações distintas) e o que é exibido ("mudou de estado", nunca "melhorou").**

Confirmado pelo pacote: o bloco 25 é a **comparabilidade da LI** (não a comparação de resultados laboratoriais, que é o eixo 3 por resultado e a Evolução).

## Estado atual

`integrated_readings` congela `rule_package_id + rule_version`, `engine_version`, aplicação, coletas, `result_ids`, referências e trace; imutável; revisão por `supersedes_id`. Nenhuma comparação entre leituras existe. **Comparabilidade não é assumida automaticamente.**

## Condições a levantar (todas candidatas a requisito; nenhuma decidida)

| Condição | Por quê |
|---|---|
| mesma versão do pacote LI | regras diferentes não comparam |
| mesmos domínios | lista de domínios faz parte do hash |
| mesmas regras (suficiência, mistos, convergência, textos) | idem |
| mesma janela temporal | janela diferente muda quem entra |
| mesma política de suficiência | idem |
| mesmos vínculos | vínculo diferente muda o numerador |
| mesma interpretação de resultados mistos | idem |
| fontes congeladas (snapshot) | já garantido pela imutabilidade |
| aplicação HOLOSCAN: mesma ou distinta | leitura de aplicações distintas compara estados em momentos diferentes — permitido? só lado a lado? |

## Opções (sem decidir)

| Opção | Consequência |
|---|---|
| (a) sem comparação de leituras na V1 | nada a exibir; evolução só por resultado laboratorial |
| (b) comparação permitida só entre leituras do mesmo `rule_package_id/rule_version`, lado a lado por domínio, rótulo neutro "estado anterior → estado atual" | regra simples e auditável |
| (c) incluir leituras de versões diferentes, marcadas "não comparável" (lado a lado sem conclusão) | mostra história sem comparar |
| (d) comparação permitida vs lado a lado decidida por regra versionada (`longitudinal_comparability_status` da leitura) | coerente com o eixo 3 |

## Incompatíveis

"melhorou/piorou/evoluiu bem"; comparar versões de regra distintas como iguais; escolha por `updated_at`; reescrever leitura antiga.


## Precedência obrigatória do motor LI (regra estrutural oficial, Etapa 5.9)

Antes de avaliar CONVERGENTE ou DIVERGENTE, o motor executa nesta ordem lógica: (1) validar aplicação HOLOSCAN; (2) validar pacote/versão compatível; (3) validar temporalidade; (4) validar vínculos metodológicos; (5) validar resultados laboratoriais; (6) validar referências/unidades/contexto; (7) validar suficiência do domínio; (8) resolver resultados mistos; (9) derivar direção do HOLOSCAN; (10) derivar direção laboratorial; (11) somente então determinar o estado da LI. **SEM DADOS SUFICIENTES tem precedência** quando qualquer requisito necessário não estiver atendido. **CONVERGENTE e DIVERGENTE nunca são fallback.**

## Direções internas conceituais (nomenclatura metodológica interna)

`attention_present` · `attention_not_detected` · `indeterminate`. **Não** são diagnóstico, score, prognóstico, "doente"/"saudável", nem são mostradas ao paciente como termos técnicos. Existem só para permitir comparação determinística entre fontes. Campos não implementados.

## Campo DECISÃO

**DECISÃO (Bloco 25 — comparabilidade longitudinal da própria LI):** duas Leituras Integradas do mesmo paciente só recebem comparação determinística de estado quando forem **metodologicamente compatíveis**: mesmo paciente; mesmo `domain_code`; e mesmo pacote LI **ou** compatibilidade explícita entre versões. A compatibilidade assegura, conforme aplicável: mesma definição do domínio; mesmos vínculos relevantes; mesma relação domínio → HOLOSCAN; mesma regra de direção HOLOSCAN; mesma política temporal; mesma regra de suficiência; mesma regra de exames obrigatórios; mesma regra de resultados mistos; mesma semântica de convergência/divergência.

*Snapshots:* a comparação usa os snapshots congelados das duas leituras. **Nunca:** recalcular leitura antiga com pacote novo; reescrever leitura histórica; trocar fonte antiga por coleta nova; usar `updated_at` como data clínica.

*Incompatibilidade:* `longitudinal_comparability_status = not_comparable`, motivo `methodology_not_comparable`; UI mostra lado a lado; nenhum delta interpretativo automático.

*Mudança de estado não é melhora/piora:* proibido DIVERGENTE → CONVERGENTE = "melhora", CONVERGENTE → DIVERGENTE = "piora", SEM DADOS → CONVERGENTE = "evolução positiva" ou equivalentes. A mudança representa apenas mudança de estado entre as fontes sob regras compatíveis; a interpretação clínica é profissional.

**JUSTIFICATIVA:** decisão autoral V1 aprovada por Daniel em 02/10/2026, apoiada na revisão clínica/documental dos blocos 20–25 e no Documento Mestre (um exame fora não basta; divergência não invalida fonte; ausência não é divergência; sem score; leitura salva congelada). Não atribuída ao legado.

**FONTE:** Documento Mestre + decisão autoral V1. FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR onde aplicável; nenhuma citação fabricada.

**RESPONSÁVEL:** Daniel (responsável primário). Revisão final de Rodrigo e registro no banco ficam para a homologação do pacote completo.

**DATA:** 02/10/2026.

**Status:** DECIDIDO QUANTO À ARQUITETURA DE COMPARABILIDADE — não implementado, não registrado no banco, não homologado.
