# DECISÃO 01 — DOMÍNIOS OFICIAIS DA LEITURA INTEGRADA

Etapa 5.3 · 02/10/2026 · material para decisão de **Daniel** (responsável primário) · detalha o bloco 1 de `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`.

> **NÃO HÁ DEFINIÇÃO HOMOLOGADA RECUPERADA.** O repositório não contém nenhuma definição metodológica anterior, aprovada ou com fonte, dos domínios da Leitura Integrada. O que existe é o **legado** (os cinco sistemas do HOLOSCAN usados como "dimensão" pelo confronto antigo) e a **infraestrutura** da Etapa 5 (tabela vazia). Este documento **não** completa a lacuna com conhecimento geral, **não** recomenda arquitetura, **não** propõe nomes oficiais e **não** preenche a decisão.

## O que precisa ser decidido

1. **Quais domínios existem** na Leitura Integrada V1: lista fechada com código, nome e definição de cada um.
2. **O que é um domínio**: a mesma entidade que um sistema HOLOSCAN, uma entidade própria da Leitura Integrada, ou uma mistura.
3. **Como cada domínio se relaciona com o HOLOSCAN** para efeito de "HOLOSCAN alterado" (um sistema, mais de um, nenhum) — a relação é dado do pacote (`holoscan_system` ou regra de convergência), não inferência.

## Por que

Toda a Leitura Integrada é **por domínio**: vínculos exame → domínio (bloco 2), suficiência (16–18), resultados mistos (19), convergente/divergente (20–21), textos (23–24), comparabilidade (25). Sem domínio não há leitura; o único estado possível continua `sem_dados_suficientes`.

## Estado atual (Etapa 5 / 5.2 / 5.3)

- `integrated_reading_domains`: **0 linhas**. Campos: `package_id`, `code`, `name`, `holoscan_system` (opcional; CHECK nos 5 códigos de sistema; **não** é mapeamento automático), `status`.
- Motor (`leitura-integrada-motor.js`): itera só domínios `aprovado`; lê "HOLOSCAN alterado" por `holoscan_system` do domínio; um domínio sem `holoscan_system` exige extensão pequena (regra de convergência com lista de sistemas).
- Pacote real `LI-V1@1`: `rascunho`; `li_validar_completude` aponta `sem_dominio_aprovado`.
- Governança: decidido o domínio, ele entra por migration versionada (código, nome, fonte na `notes`), o pacote passa a `em_revisao` e segue Daniel → Rodrigo → Homologar (com identidade real, Etapa 5.3).

## Documento Mestre

O repositório registra do Mestre (via `ETAPA0-RECONCILIACAO.md`, `DECISOES-V1.md`, `HOMOLOGACAO-LEITURA-INTEGRADA-PENDENTE.md`):
- §24: a Leitura Integrada exige **vínculo aprovado** exame → domínio, **suficiência**, **temporalidade** e tratamento de **resultados mistos**; estados convergente / divergente / sem dados suficientes.
- §16, §24.3, §43.2: exames **não alteram** sistemas, Índice ou Tríada.
- §21: catálogo de 45 exames (sem vínculo a sistema no catálogo).
- §23: faixas e referências são decisão metodológica.
- **Nenhum trecho disponível no repositório lista os domínios** nem afirma que domínio = sistema HOLOSCAN. Se o Documento Mestre completo contiver essa lista, ela é a fonte a citar na DECISÃO; aqui ela **não foi recuperada**.

## Legado (evidência histórica, não proposta)

- `confrontar()` (`motor/src/exames.ts`) e `window.Holoscan` (`arquivos.js`) usavam como "dimensão" os **cinco sistemas do HOLOSCAN**: `fungico`, `acido_inflamatorio`, `metabolico`, `detox_linfatico`, `mental_emocional_espiritual`.
- `exames.csv.sistema` ligava os 24 EXA-* a esses cinco (tabela em `PACOTE-DECISAO-HUMANA-LEITURA-INTEGRADA-V1.md`, seção "Legado"); preservado só em `lab_results.legacy_sistema`.
- Fonte declarada do CSV: "literatura funcional — revisar", status `rascunho`. **Nunca homologado.** Hoje visível só em `?homologacao=1`, rotulado LEGADO.

## Nomes que aparecem hoje e o que são

| Nome | Onde | Natureza | Candidato oficial? |
|---|---|---|---|
| Fúngico, Ácido Inflamatório, Metabólico, Detox e Linfático, Mental Emocional Espiritual | sistemas do HOLOSCAN (HOLOS-V1@2, Etapa 4.2) e "dimensões" do confronto legado | **sistemas do questionário**; como domínio da LI são **apenas legado** | só se decidido no bloco 1 (opção B ou D); não herdados |
| 18 categorias do catálogo (Hematologia, Glicêmico, Lipídico, Lipídico especializado, Renal, Hepático, Inflamação, Investigação contextual, Eletrólitos, Minerais, Vitaminas, Elementos especializados, Ferro, Tireoide, Metabólico, Metabolismo mineral, Hormonal, Muscular) | `laboratorio-catalogo.js`, `CATALOGO-45-V1.md` | **organização do catálogo** para busca; decisão 68 diz que categoria **não** é domínio | não automaticamente; qualquer uso como domínio é decisão nova com fonte |
| `TEST_FIXTURE_ONLY_*` | harnesses e testes | fixtures de teste | nunca |

Não existe nenhum outro nome de domínio no repositório.

## Conflitos

- **Acoplamento**: domínio = sistema HOLOSCAN acopla a LI à estrutura do questionário (toda nova versão do HOLOS-V1 reabre a LI e sua homologação).
- **Semântica**: um exame laboratorial pode informar mais de um "sistema" do questionário; o legado resolvia por fixação arbitrária (`exames.csv.sistema`), sem fonte.
- **"HOLOSCAN alterado"** para um domínio que não é sistema exige definir qual(is) sistema(s) e qual critério (bloco 20).
- **Explicabilidade**: a profissional precisa entender por que um exame entrou num domínio e por que o domínio convergiu; nomes iguais aos dos sistemas facilitam a leitura mas podem sugerir que o exame "confirma o sistema" (leitura causal, incompatível).

## Opções (arquiteturas tecnicamente possíveis — nenhuma recomendada)

**A) Domínios independentes do HOLOSCAN.** Entidades próprias da LI (lista a definir, com fonte), sem `holoscan_system`; cada domínio aponta por regra de convergência para 0..N sistemas.
**B) Domínios iguais aos cinco sistemas.** Cinco domínios, 1:1, `holoscan_system` preenchido.
**C) Domínios laboratoriais por área fisiológica.** Agrupamentos de exames por área (lista e nomes a definir, com fonte; as categorias do catálogo **não** são essa lista automaticamente), cada um relacionado a sistema(s) por regra explícita.
**D) Domínios híbridos.** Alguns domínios coincidem com sistemas, outros são próprios/laboratoriais; relação declarada caso a caso.
**E) Nenhum domínio na V1.** A LI permanece infraestrutura; estado único `sem_dados_suficientes`.

## Consequências por opção

| Impacto | A — independentes | B — cinco sistemas | C — áreas fisiológicas | D — híbrido | E — nenhum |
|---|---|---|---|---|---|
| Vínculos exame → domínio (bloco 2) | lista nova, fonte por linha; nenhuma herança | tentação de herdar `exames.csv.sistema` — **não permitido** sem fonte; 24 EXA legados cobrem só parte dos 45 | vínculo "natural" por área, mas ainda exige fonte por linha; exame pode cair em mais de uma área | mistura das regras acima; mais casos a documentar | nenhum |
| Suficiência (16–18) | contagem por domínio novo; domínios pequenos tendem a `sem dados` | contagem por sistema; sistemas com poucos exames (ex.: o que o legado chamava de "fúngico" tinha 1) ficam quase sempre `sem dados` ou exigem `min = 1` (reproduz o legado, decisão explícita) | áreas com muitos exames permitem mínimos maiores; áreas pequenas idem B | variável por domínio | não se aplica |
| Convergência/divergência (20–21) | exige regra que nomeie o(s) sistema(s) por domínio (extensão pequena do motor) | direta: nota/faixa do sistema | exige regra sistema(s) ↔ área | ambas | não se aplica |
| Relatórios | seção por domínio com nomes novos (texto a homologar, bloco 23) | mesma nomenclatura do HOLOSCAN (risco de leitura "exame confirma sistema"; texto neutro obrigatório) | nomenclatura laboratorial, mais próxima do laudo | duas nomenclaturas na mesma tela | só "sem dados suficientes" |
| Comparação longitudinal (25) | estável enquanto a lista da LI não mudar | muda sempre que a estrutura do HOLOSCAN mudar (nova versão da LI) | estável se as áreas forem estáveis | depende da parte acoplada | não se aplica |
| Explicabilidade | "por que este exame está aqui" precisa de fonte própria | fácil de narrar, difícil de justificar sem fonte (o legado nunca teve) | fácil de narrar pelo laudo; relação com sintoma exige regra explícita | mais regras a explicar | máxima (nada é afirmado) |
| Esforço técnico | migration + extensão pequena do motor (lista de sistemas na convergência) | migration só | migration + extensão pequena | migration + extensão pequena | nenhum |

Nada acima é clínico: são consequências de arquitetura. Os valores (quais exames, quantos, qual corte) ficam nos blocos seguintes.

## Dependências futuras

Decidido o bloco 1: bloco 2 (vínculos) só pode ser aberto com a lista de domínios; blocos 16–19 dependem do tamanho de cada domínio; bloco 20 depende da relação domínio ↔ sistema(s); bloco 23 depende dos nomes. Se a decisão for E, os blocos 2–25 ficam suspensos e a LI permanece como hoje.

## Campo DECISÃO

DECISÃO (arquitetura e lista de domínios, com código, nome, definição e, se houver, sistema(s) HOLOSCAN relacionados): ______

Fonte citada (Documento Mestre §/página ou outra fonte metodológica): ______

JUSTIFICATIVA: ______

RESPONSÁVEL (Daniel — responsável primário; depois revisão de Rodrigo): ______

DATA: ______
