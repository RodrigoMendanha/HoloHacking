# DECISÃO 25 — COMPARABILIDADE LONGITUDINAL DA PRÓPRIA LEITURA INTEGRADA

Etapa 5.8 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 25 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md` (nome e número do pacote). Depende da DECISÃO 06 (snapshot), da regra transversal (eixo 3) e dos blocos 16–22.

> **NADA DECIDIDO.** Opções e consequências sem recomendação; nenhuma regra clínica deduzida do legado; nenhuma relação domínio LI → sistema HOLOSCAN criada; nenhum score, peso, corte ou bibliografia. Campos DECISÃO em branco. Nenhuma alteração em migration, banco, servidor falso, motor ou UI.

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

## Campo DECISÃO

DECISÃO: ______

JUSTIFICATIVA: ______

FONTE: ______ (ou FONTE BIBLIOGRÁFICA FORMAL A CONSOLIDAR)

RESPONSÁVEL: ______

DATA: ______
