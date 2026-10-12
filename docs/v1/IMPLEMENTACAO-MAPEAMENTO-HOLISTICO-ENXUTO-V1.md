# Mapeamento Holístico enxuto — V1 (12/10)

Objetivo: o paciente responde em **3 a 5 minutos**, quase tudo por toque, e a nutricionista recebe contexto antes da consulta.

**O que foi mantido do fluxo:**
- link com token e validade de 7 dias;
- página sem login;
- autosave e retomada pelo mesmo link;
- estados Iniciado e Mapeamento recebido;
- resposta original imutável;
- "Levar para o atendimento", que cria o rascunho profissional.

**O que não foi feito:** nenhuma migration, nenhum deploy, nenhum acesso ao banco real.

**O que não mudou:** HOLOSCAN (perguntas, cálculo, pesos, sistemas, Índice, Tríade), Próximos Passos, catálogo, ferramentas, Conduta, Holos AI, exames/documentos, Resultado e PDF.

---

## A. Estado anterior

**Mapeamento V1** (commit `6a13285`, implantado em `b12d6d6`):
- 7 etapas de coleta, mais a revisão;
- cerca de **70 campos** visíveis, a maioria de texto livre ("Conte como é…", "O que já tentou…");
- sintomas como 9 perguntas separadas, cada uma com a mesma escala de frequência;
- sono, energia, rotina e contexto com 26 campos.

**Retorno:** 13 caixas de texto.

**Na ficha, a resposta:**
- era recebida e guardada (conferido no banco real: convite `concluido`, 6 blocos);
- aparecia recolhida;
- vinha acompanhada do formulário profissional vazio logo abaixo. Isso confundia: a nutricionista não sabia onde estava a resposta.

## B. Problemas encontrados

1. **Muito texto.** Mais de 40 caixas de texto na primeira consulta: tempo estimado de 15 a 25 minutos e alto risco de abandono.
2. **Sintomas por frequência.** Eram perguntados com escala de frequência, parecida com a do HOLOSCAN. O HOLOSCAN já investiga a intensidade.
3. **Sobreposição com o HOLOSCAN** em sono (despertares, acordar cansado), fome depois de comer, vontade de doces e estresse ou sobrecarga (ver D).
4. **Intimidade.** Campos íntimos (sentido pessoal, espiritualidade, sobrecarga emocional) eram perguntados ao paciente antes de existir vínculo.
5. **Alergia × desconforto.** "Alimentos evitados" misturava alergia e desconforto.
6. **Ficha.** O formulário profissional vazio aparecia antes de qualquer resposta ser levada ao atendimento.
7. **Bug de código encontrado e corrigido nesta tarefa:** a página pública chamava a lista de etapas antiga, que tinha sido removida. A página não abria (`ETAPAS_PRIMEIRA is not defined`). O teste novo pegou o erro antes do commit.

## C. Matriz campo atual → decisão

Legenda:
- **M** manter;
- **S** simplificar;
- **SEL** transformar em seleção;
- **COND** tornar condicional;
- **R** remover da tela do paciente.

O campo **continua no esquema** e no editor profissional, e as respostas antigas continuam aparecendo.

| Campo V1 (chave) | Novo bloco | Decisão | Motivo |
|---|---|---|---|
| motivo.motivo | 1 | R → `motivos` (SEL, multi + Outro) | toque em vez de texto |
| motivo.objetivo | 1 | S (uma linha) | é o único texto essencial do bloco 1 |
| motivo.ha_quanto_tempo, ja_tentou, ajudou, nao_funcionou | 1 | R → `acomp_anterior` (SEL) + `acomp_experiencia` (COND) | a experiência anterior em 1 toque |
| alimentar.dia_comum, refeicoes, horarios, cafe/almoco/jantar/lanches | 2 | R → `padrao` (SEL, multi) | recordatório é da consulta |
| alimentar.dificuldade | 2 | R → `dificuldades` (SEL, até 3) | seleção |
| alimentar.maior_fome, saciedade, sem_fome | 2 | R → `fome_percebida` (SEL) | o HOLOSCAN investiga fome depois de comer (SNT-303/304) |
| alimentar.desejos | 2 | R | SNT-101 (doces) |
| alimentar.preferencias, evitados, bebidas, quem_prepara, com_quem, comer_fora, delivery, trabalho | 2 | R (comer fora/delivery viraram opções de `padrao`) | detalhe para a consulta |
| alimentar.agua | 2 | M (rótulos em litros) | — |
| alimentar.alcool | 4 | M (4 opções para o paciente) | movido para hábitos |
| saude.intestino, gastrointestinais, azia_refluxo, distensao, nausea, dor, dor_cabeca, retencao | 2 | R → `sinais` (SEL multi, só presença) + `sinal_principal` + `sinal_relacao` | triagem, sem escala |
| saude.pele, ciclo, mudancas, outros | 2 | R | consulta / HOLOSCAN |
| saude.condicoes | 3 | COND (`condicoes_tem` Sim) | — |
| saude.cirurgias | 3 | COND (`cirurgias_tem` Sim → "Qual e quando?") | — |
| restricoes.medicamentos, suplementos | 3 | M (lista com "Não uso") | — |
| restricoes.alergias, intolerancias | 3 | M, **separadas** | — |
| restricoes.evita_desconforto | 3 | COND (`evita_tem` Sim) | não é registrado como alergia |
| estilo.dorme, acorda | 4 | S (relógio, lado a lado) | — |
| estilo.sono, despertares, energia | 4 | R | SNT-501/502/503 (sono), SNT-301 |
| estilo.trabalho, deslocamento, pausas, rotina, dias_diferentes | 4 | R → `previsibilidade` + `trabalho_tipo` (SEL) | seleção |
| estilo.atividade | 4 | M (rótulos por extenso) | — |
| estilo.estresse | 4 | R | HOLOSCAN (emocional) |
| estilo.tabagismo | 4 | M (sensível, "Prefiro não responder") | — |
| estilo.dificulta | 4 | R → `dificulta_opcoes` (SEL, até 2) | seleção |
| estilo.funciona | 4 | COND (`funciona_tem` Sim) | — |
| contexto.historia_alimentacao, familiar_saude, familiar, responsabilidades, financeiro, social | 5 | R | consulta |
| contexto.mudancas_vida | 5 | COND (`mudanca_tem` Sim, sensível) | — |
| contexto.apoio | 5 | R → `apoio_nivel` (SEL, sensível) | — |
| contexto.sobrecarga, emocional, sentido_importante, sentido | 5 | R | íntimo / HOLOSCAN Mental e Espiritual |
| — (novo) contexto.pessoal_tem + pessoal | 5 | COND, sensível | espaço para o que o paciente quiser contar |
| contexto.obs | revisar | M (pergunta final) | — |
| objetiva.* (peso, altura, medidas, exames, obs físicas) | — | R (já estavam fora na V1) | nunca coletar do paciente |
| retorno.melhorou, piorou | retorno | SEL (`*_opcoes`) + detalhe COND | seleção |
| retorno.praticou, nao_praticou | retorno | `praticou_nivel` (SEL) + 2 linhas curtas | — |
| retorno.facilitou, dificultou | retorno | R → `facilitou_opcoes`, `dificultou_opcoes` | seleção |
| retorno.alimentacao, rotina, sintomas | retorno | R → `mudanca_geral` (SEL) + `mudanca_obs` (COND) | seleção |
| retorno.medicamento, suplemento | retorno | `med_sup_mudou` Sim → `medicamento` (COND) | um campo só |
| retorno.nova_questao | retorno | COND (`nova_questao_tem` Sim) | — |
| retorno.dificuldade | retorno | R (coberto por `dificultou_opcoes`) | — |
| retorno.peso, peso_medidas | — | R | nunca coletar do paciente |
| retorno.obs | revisar | M (pergunta final) | — |

## D. Cruzamento Mapeamento × HOLOSCAN

Classes:
- **A** necessária no Mapeamento mesmo existindo no HOLOSCAN;
- **B** triagem resumida no Mapeamento;
- **C** só no HOLOSCAN;
- **D** pertence a ferramenta HOLOS;
- **E** baixo valor / remover.

| Tema | HOLOSCAN v3 | Classe | No Mapeamento |
|---|---|---|---|
| Azia, estufamento/gases, dor de cabeça, inchaço, intestino | SNT-102, SNT-204, SNT-205, SNT-401/402, SNT-405 | **B** | só presença (marcar ou não), qual incomoda mais e se percebe relação com a comida; sem frequência nem intensidade |
| Vontade de doces | SNT-101 | **C** | removido (só aparece como dificuldade, "Vontade de doces", sem escala) |
| Fome depois de comer, comer sem fome à noite | SNT-303, SNT-304 | **C** | removido; ficou só a percepção geral (`fome_percebida`) |
| Sono (acordar cansado, demorar a dormir, acordar de madrugada) | SNT-501, SNT-502, SNT-503 | **C** | removido; ficaram só os horários (dado de rotina) |
| Sono depois do almoço | SNT-301 | **C** | — |
| Dores que pioram com ultraprocessados | SNT-208 | **C** | — |
| Estresse, tristeza, emoções | SNT-511, EMO-* | **C** | removidos `estresse`, `sobrecarga`, `emocional` |
| Sentido, propósito, espiritualidade | ESP-* | **C / D** (Mapa do Propósito, PQQ) | removidos `sentido_importante`, `sentido` |
| Exames (PCR/VHS, triglicerídeos/HDL) | SNT-210, SNT-309 | **E** no Mapeamento | nunca coletados (ver R) |
| Medicamentos, suplementos, alergias, intolerâncias, condições, cirurgias | — | **A** | mantidos |
| Água, álcool, tabaco, atividade física | — | **A** | mantidos, por toque |
| Motivo, objetivo, rotina, apoio, momento de vida | — | **A** | mantidos, por toque |

O teste confere que **nenhuma das 82 frases do HOLOSCAN v3** aparece na página e que a escala "Nunca / Às vezes / Frequente / Sempre" não existe.

## E. Estrutura final

**Primeira consulta: 5 blocos + revisar** ("Etapa X de 6").

| # | Bloco | O que tem |
|---|---|---|
| 1 | O que te traz aqui | 4 perguntas, 1 condicional |
| 2 | Alimentação e sinais que você percebe | 8 perguntas, 3 condicionais |
| 3 | Sua saúde e seus cuidados atuais | 10 perguntas, 3 condicionais |
| 4 | Sono, hábitos e rotina | 10 perguntas, 1 condicional |
| 5 | Seu momento atual | 5 perguntas, 2 condicionais |
| 6 | Revisar e enviar | resumo + pergunta final + "Enviar Mapeamento" → "Mapeamento enviado!" |

**Retorno:** 1 etapa curta + revisar. Retorno só para quem tem um registro profissional salvo (a regra anterior foi mantida).

**Fluxo normal sem "Sim":** **4 campos de texto visíveis** em toda a primeira consulta (medido pelo teste). O resto é toque.

## F. Perguntas finais da primeira consulta

**1. O que te traz aqui**
- Qual é o principal motivo para buscar acompanhamento? *(várias; "Outro" abre "Qual motivo?")* Opções:
  - Emagrecimento / composição corporal
  - Melhorar minha alimentação
  - Mais energia e disposição
  - Sintomas ou desconfortos
  - Saúde intestinal
  - Melhorar minha relação com a alimentação
  - Organizar minha rotina
  - Acompanhamento de uma condição de saúde
  - Outro
- O que você mais gostaria de melhorar neste momento? *(uma linha)*
- Você já fez acompanhamento nutricional antes? Opções:
  - Nunca
  - Sim, e foi uma experiência positiva
  - Sim, mas tive dificuldade para manter
  - Sim, mas não funcionou como eu esperava
- Quer contar algo sobre essa experiência? *(só se a resposta anterior for diferente de "Nunca")*

**2. Alimentação e sinais que você percebe**
- Como sua alimentação acontece na maior parte dos dias? *(várias)* Opções:
  - Tenho horários relativamente organizados
  - Meus horários variam bastante
  - Costumo pular refeições
  - Passo muito tempo sem comer
  - Como muitas vezes fora de casa
  - Uso bastante delivery ou comida pronta
  - Tenho dificuldade para planejar as refeições
  - Minha alimentação muda bastante nos fins de semana
- Quais são hoje suas principais dificuldades com a alimentação? *(até 3; "Outra" abre campo)* Opções:
  - Falta de tempo
  - Falta de organização
  - Vontade de doces
  - Fome muito intensa
  - Beliscar
  - Comer à noite
  - Comer fora / delivery
  - Finais de semana
  - Dificuldade para manter mudanças
  - Falta de apoio
  - Não saber o que fazer
  - Outra
- Como você percebe sua fome atualmente? Opções:
  - Parece equilibrada
  - Às vezes fico com muita fome
  - Tenho momentos em que a fome parece difícil de controlar
  - Costumo passar longos períodos sem sentir fome
  - Não sei dizer
- O que você tem percebido no seu corpo ultimamente? *(várias; "Não tenho percebido nenhum desses" desmarca as outras)* Opções:
  - Azia ou refluxo
  - Estufamento ou muitos gases
  - Enjoo
  - Dor ou desconforto no estômago depois de comer
  - Intestino preso
  - Intestino solto / diarreia
  - Alternância entre intestino preso e solto
  - Dor de cabeça
  - Outras dores frequentes
  - Inchaço ou retenção percebida
  - Fome muito intensa ou difícil de controlar
  - Outro sinal que tem me incomodado
- Qual desses sinais mais incomoda você hoje? *(só aparece com sinais marcados; as opções são os sinais marcados)*
- Você percebe alguma relação desse desconforto com alimentação ou refeições? Opções: Sim · Não · Não sei perceber
  - Se quiser, conte brevemente o que percebe. *(só com "Sim")*
- Quanto de água você costuma beber por dia? Opções:
  - Menos de 1 litro
  - Entre 1 e 2 litros
  - Mais de 2 litros
  - Não sei dizer

**3. Sua saúde e seus cuidados atuais**
- Algum profissional de saúde já informou que você possui alguma condição ou diagnóstico? Não · Sim → "Qual condição ou diagnóstico?"
- Já realizou alguma cirurgia? Não · Sim → "Qual e quando?"
- Medicamentos que usa *(lista, ou "Não uso")*
- Suplementos que usa *(lista, ou "Não uso")*
- Possui alguma alergia conhecida ou diagnosticada? *(lista, ou "Não")*
- Possui alguma intolerância conhecida? *(lista, ou "Não")*
- Existe algum alimento que você evita porque percebe desconforto? Não · Sim → "Qual alimento e o que você costuma perceber?"
  - Fica separado de alergia e de intolerância.

**4. Sono, hábitos e rotina**
- Que horas costuma dormir? / Que horas costuma acordar? *(relógios lado a lado)*
- Como seus dias costumam ser? Opções:
  - Bastante previsíveis
  - Variam um pouco
  - Muito imprevisíveis
- Seu trabalho ou atividade principal acontece principalmente em: *("Outro" abre "Qual?")* Opções:
  - Horário comercial
  - Turnos
  - Período noturno
  - Horários variáveis
  - Em casa
  - Não estou trabalhando atualmente
  - Outro
- Você pratica atividade física atualmente? Opções:
  - Não
  - 1 a 2 vezes por semana
  - 3 a 4 vezes por semana
  - 5 ou mais vezes por semana
- Com que frequência costuma consumir bebida alcoólica? Opções:
  - Não consumo
  - Ocasionalmente
  - 1 a 2 vezes por semana
  - 3 ou mais vezes por semana
- Em relação ao cigarro/tabaco: Nunca fumei · Sou ex-fumante · Fumo atualmente · Prefiro não responder
- O que mais dificulta cuidar de você hoje? *(até 2; "Outra" abre "O que mais?")* Opções:
  - Tempo
  - Trabalho
  - Cansaço
  - Filhos / família
  - Organização
  - Questões financeiras
  - Saúde
  - Falta de apoio
  - Outra
- Existe algo na sua rotina que funciona bem e você gostaria de preservar? Sim · Não · Não sei
  - Se quiser, conte o que funciona. *(só com "Sim")*

**5. Seu momento atual** (opcional; cada pergunta tem "Prefiro não responder")
- Aconteceu alguma mudança importante na sua vida recentemente? Não · Sim · Prefiro não responder
  - Se quiser, conte brevemente. *(só com "Sim")*
- Você sente que tem apoio para cuidar da sua saúde neste momento? Sim · Em parte · Não · Prefiro não responder
- Existe alguma questão pessoal que você considera importante que sua nutricionista saiba antes da consulta? Não · Sim · Prefiro não responder
  - Se quiser, conte um pouco. *(só com "Sim")*

**6. Revisar e enviar**
- Resumo do que foi respondido.
- Existe algo importante que não perguntamos e que você gostaria que sua nutricionista soubesse?
- **Enviar Mapeamento** → **Mapeamento enviado!**

## G. Perguntas finais do retorno

**Desde a última consulta**
- O que melhorou desde a última consulta? *(várias; "Nada mudou ainda" é exclusiva; "Outro" abre campo)* Opções:
  - Energia e disposição
  - Digestão / intestino
  - Sono
  - Sintomas
  - Organização da alimentação
  - Rotina
  - Relação com a comida
  - Nada mudou ainda
  - Outro
  - Detalhe: "Quer detalhar o que melhorou?" *(só depois de marcar)*
- O que piorou? *(mesmas opções)*
  - Detalhe: "Quer detalhar o que piorou?" *(só depois de marcar)*
- Quanto você conseguiu colocar em prática? Quase tudo · Boa parte · Pouco · Quase nada
  - Duas linhas curtas: "O que você conseguiu colocar em prática?" e "O que você não conseguiu colocar em prática?"
- O que facilitou? Opções:
  - Planejamento
  - Rotina mais organizada
  - Apoio da família ou de alguém
  - Orientações claras
  - Motivação
  - Outro
- O que dificultou? *(as mesmas opções do bloco 4)*
- Houve alguma mudança importante na alimentação, rotina ou sintomas? Alimentação · Rotina · Sintomas · Nenhuma mudança importante
  - Qual mudança? *(só depois de marcar)*
- Houve mudança em medicamentos ou suplementos? Não · Sim → "O que mudou?"
- Apareceu alguma questão nova desde o último encontro? Não · Sim → "Qual questão?"

**Revisar e enviar:** "Existe algo mais que gostaria que sua nutricionista soubesse?"

O retorno não tem peso nem medidas.

## H. Campos removidos (da tela do paciente)

**Nenhum campo saiu do esquema** e nenhum dado foi apagado.
- Respostas antigas que usavam esses campos continuam na ficha, em "Outras respostas (versão anterior do formulário)".
- O editor profissional continua tendo todos eles.

**Saíram da página do paciente:**
- **Motivo:** motivo (texto), ha_quanto_tempo, ja_tentou, ajudou, nao_funcionou.
- **Alimentar:** dia_comum, refeicoes, horarios, cafe, almoco, jantar, lanches, maior_fome, saciedade, sem_fome, desejos, preferencias, evitados, bebidas, quem_prepara, com_quem, comer_fora, delivery, trabalho, dificuldade.
- **Saúde:** intestino, gastrointestinais, azia_refluxo, distensao, nausea, dor, dor_cabeca, retencao, pele, ciclo, mudancas, outros.
- **Estilo:** sono, despertares, energia, trabalho, deslocamento, pausas, rotina, dias_diferentes, estresse, dificulta.
- **Contexto:** historia_alimentacao, familiar_saude, familiar, responsabilidades, sobrecarga, apoio, financeiro, emocional, sentido_importante, sentido.
- **Retorno:** alimentacao, rotina, sintomas, suplemento, dificuldade, facilitou, dificultou.
- **Medidas** (peso, altura, circunferências, outras medidas, exames, observações físicas): **nunca** são coletadas do paciente. A página também se recusa a desenhar qualquer campo de medida.

## I. Campos transformados em seleção (novos no esquema)

**Primeira consulta, por bloco do esquema:**

| Bloco | Campos novos |
|---|---|
| motivo | `motivos` (multi + Outro), `acomp_anterior` |
| alimentar | `padrao` (multi), `dificuldades` (multi, até 3, + Outra), `fome_percebida` |
| saude | `sinais` (multi + exclusiva), `sinal_principal`, `sinal_relacao`, `condicoes_tem`, `cirurgias_tem` |
| restricoes | `evita_tem` |
| estilo | `previsibilidade`, `trabalho_tipo` (+ Outro), `dificulta_opcoes` (multi, até 2, + Outra), `funciona_tem` |
| contexto | `mudanca_tem`, `apoio_nivel`, `pessoal_tem` |

**Retorno:** `melhorou_opcoes`, `piorou_opcoes`, `praticou_nivel`, `facilitou_opcoes`, `dificultou_opcoes`, `mudanca_geral`, `med_sup_mudou`, `nova_questao_tem`.

Cada campo novo:
- usa um **domínio já existente** (`motivo_objetivo`, `historia_alimentar`, `sintomas_relatados`, `condicoes_diagnosticos_informados`, `antecedentes`, `rotina_acesso`, `contexto_social`, `emocional`, `medicamentos`);
- é levado ao rascunho profissional por "Levar para o atendimento", com origem `relato_paciente`;
- quando a resposta é "Prefiro não responder", entra com estado `recusado`.

## J. Campos condicionais

| Campo | Aparece quando |
|---|---|
| motivo.acomp_experiencia | `acomp_anterior` ≠ "Nunca" |
| "Outro"/"Outra" (motivos, dificuldades, trabalho, dificulta, áreas do retorno) | a opção é marcada; abre um campo curto (`<campo>_outro`) |
| saude.sinal_principal e saude.sinal_relacao | há sinal marcado (exceto "Não tenho percebido nenhum desses") |
| saude.sinal_relacao_obs | `sinal_relacao` = Sim |
| saude.condicoes | `condicoes_tem` = Sim |
| saude.cirurgias | `cirurgias_tem` = Sim |
| restricoes.evita_desconforto | `evita_tem` = Sim |
| estilo.funciona | `funciona_tem` = Sim |
| contexto.mudancas_vida | `mudanca_tem` = Sim |
| contexto.pessoal | `pessoal_tem` = Sim |
| retorno.melhorou / piorou | algo marcado (exceto "Nada mudou ainda") |
| retorno.mudanca_obs | algo marcado (exceto "Nenhuma mudança importante") |
| retorno.medicamento | `med_sup_mudou` = Sim |
| retorno.nova_questao | `nova_questao_tem` = Sim |

**Regras ao enviar:**
- Se o paciente volta para "Não", o texto da pergunta fechada **não é enviado ao servidor** (`MapeamentoHolistico.limparForm`).
- Um sinal principal que deixou de estar marcado também é descartado.

**Limites e exclusivas:**
- até 3 dificuldades;
- até 2 "o que dificulta";
- quando o limite é atingido, as outras opções ficam travadas;
- as opções exclusivas desmarcam as outras.

## K. Campos abertos restantes

**Visíveis no fluxo normal da primeira consulta (4):**
1. O que você mais gostaria de melhorar neste momento? *(uma linha)*
2. Que horas costuma dormir?
3. Que horas costuma acordar?
4. Pergunta final da revisão.

Os itens 2 e 3 são relógios, não texto livre.

**Só quando o paciente escolhe** "Sim", "Outro" ou marca algo:
- a experiência anterior;
- o "Outro" de cada lista;
- o texto da relação sinal-alimentação;
- condição, cirurgia e alimento evitado;
- o que funciona na rotina;
- mudança recente e questão pessoal.

Quase todos são de uma linha. A questão pessoal tem caixa de texto.

**Listas:** medicamentos, suplementos, alergias e intolerâncias. Só são preenchidas se o paciente usa ou tem.

**Retorno:** 2 linhas visíveis ("conseguiu" / "não conseguiu colocar em prática"), mais a pergunta final.

## L. Alterações de banco

**Nenhuma.**
- Nenhuma migration nova.
- Banco real não tocado.

O sanitizador do servidor (`convite_anamnese_limpar`):
- aceita qualquer chave dentro dos blocos permitidos, por isso os campos novos são gravados sem mudança de esquema;
- continua recusando o bloco `objetiva` além de peso/altura (que a página não envia).

**Compatibilidade:**
- Respostas antigas (V1 e anteriores) continuam legíveis.
- Os campos sem lugar no formulário novo aparecem em "Outras respostas (versão anterior do formulário)".

## M. Arquivos alterados

| Arquivo | O que mudou |
|---|---|
| `mapeamento-holistico.js` (novo) | fonte única das etapas, perguntas, regras (condicional, limite, exclusiva, Outro, relógio, linha curta), sensíveis, limpeza do envio e desenho da resposta. Usado pela página do paciente e pela ficha |
| `anamnese-v2.js` | campos novos de seleção (seção I); opções de água e álcool ampliadas; "O que busca" no resumo usa motivos e acompanhamento anterior. Nenhum campo antigo removido |
| `anamnese-publica.js` | desenho da página a partir de `MapeamentoHolistico`: chips com limite, exclusiva e "Outro", relógios lado a lado, condicionais redesenhadas na hora, "Prefiro não responder", revisão por etapa, pergunta final |
| `anamnese.html` | ordem dos scripts; CSS (`.campo-par`, `.campo-hora`, chips maiores para o toque, chip travado) |
| `anamnese-convite.js` | resposta aberta por padrão (Ver/Esconder resposta), **Levar para o atendimento**, Enviar novo Mapeamento, Mapeamentos anteriores; resposta desenhada por `MapeamentoHolistico.respostaHtml` |
| `anamnese.js` | o editor profissional só aparece depois de levar a resposta ao atendimento, ou quando já há rascunho ou registro. Antes disso, mostra só os registros anteriores, para leitura |
| `ficha.js`, `dashboard.js`, `index.html`, `style.css` | linha "Mapeamento Holístico" na Visão Geral com "Ver respostas do Mapeamento"; Dashboard "Respondido pelo paciente"; estilos `mh-*` da resposta |
| `docs/deploy.md` | hashes do §3.5 (72 arquivos) |
| `testes/testar-mapeamento-enxuto.mjs` (novo) | ver O |
| `testes/testar-mapeamento-holistico-v1.mjs` (removido) | testava a estrutura de 7 etapas, que deixou de existir; substituído pelo teste novo na suíte |
| `testes/testar-v1-etapa2.mjs` | liga `__REGISTRO_PROFISSIONAL` (só no teste), porque exercita o editor profissional direto, sem Mapeamento |
| `testes/testar-storage-manifest.mjs` | 60 tags de script (+ `mapeamento-holistico.js`) |
| `testes/suites.mjs` | troca do teste da V1 pelo enxuto |

## N. Segurança

**Mantido, sem nenhuma mudança no servidor:**
- token (só o hash fica no banco);
- validade de 7 dias e revogação;
- acesso sem conta;
- RLS;
- grant por coluna (`token_hash` fechado; a leitura usa colunas explícitas);
- autosave e retomada pelo mesmo link;
- separação entre pacientes;
- **resposta original imutável**: depois de enviada, o link não altera mais nada, e a edição profissional acontece numa cópia (rascunho V2).

**Texto livre:** é sempre escapado na ficha e na revisão (`esc`).

**Dados dos testes e capturas:** todos fictícios.

## O. Testes

**Novo: `testes/testar-mapeamento-enxuto.mjs`, 46 asserções, verde.** Cobre os 30 itens obrigatórios:

| Itens | Cobertura |
|---|---|
| 1–6 | link sem consulta, sem login, autosave, retomada, Iniciado, envio |
| 7–11 | Mapeamento recebido, original imutável, Levar para o atendimento, rascunho editável, edição que não altera o original |
| 12–13 | primeira consulta e retorno corretos |
| 14–17 | sem peso, altura, circunferências e exames |
| 18 | 5 blocos + revisão, na ordem |
| 19 | condicionais (Outro, sinal principal, Sim → texto, limite, exclusiva, voltar para Não fecha) |
| 20 | "Prefiro não responder" |
| 21 | sintomas por seleção |
| 22 | sem a escala do HOLOSCAN e sem nenhuma das 82 frases do v3 |
| 23–24 | sem score e sem preenchimento do HOLOSCAN (tabelas de HOLOSCAN, ferramentas, Resultado, Próximos Passos, metodologia e condutas com o mesmo hash antes e depois) |
| 25 | 4 campos de texto no fluxo normal |
| 29 | celular 390px sem rolagem lateral |
| 30 | hash dos arquivos do HOLOSCAN (`holoscan.js`, `holoscan-oficial.js`, `questionario.js`, `metodologia-decisoes-v1.js`, `metodologia-revisao-v3.js`) igual antes e depois |

**Itens 26–28** (WhatsApp, copiar link, revogar) continuam cobertos por `testar-mapeamento-holistico.mjs` e `testar-anamnese-pre-consulta.mjs`, que estão verdes na suíte.

**Capturas** (dados fictícios) em `docs/v1/mapeamento-enxuto/`:
- `enxuto-etapa1`, `enxuto-etapa2`, `enxuto-etapa5`, `enxuto-revisar`, `enxuto-retorno` (390px);
- `enxuto-ficha-recebido`.

**Suíte completa:** ver a resposta da entrega.

## P. Git diff --stat

Ver a resposta da entrega. O diff é contra `b12d6d6`, a versão implantada.

## Q. Commits

- `02fbbde`: WIP do Mapeamento (não implantar).
- Commit desta entrega: Mapeamento Holístico enxuto V1.

**Sem deploy.**

## R. Pendências

1. **Deploy.** Não foi feito. Para implantar, o script `scripts/deploy-etapa6-5b.sh` precisa apontar (`ESPERADO`) para o commit desta entrega.
2. **Editor profissional sem Mapeamento.**
   - Hoje o editor só aparece depois de "Levar para o atendimento", ou se já houver rascunho ou registro.
   - Para paciente que não respondeu o Mapeamento, a nutricionista não tem onde abrir um registro profissional em branco.
   - Isso segue a decisão "o formulário da nutricionista não pode mais existir", mas convém confirmar se é o desejado.
3. **Campos antigos no editor profissional.** O editor continua mostrando os campos antigos (ex.: sono, despertares, estresse). Falta decidir se eles saem também do editor profissional.

### PENDÊNCIAS HOLOSCAN V3 PARA REVISÃO METODOLÓGICA SEPARADA

- **82 × 84.** O arquivo atual (`docs/v1/HOLOSCAN-PERGUNTAS-V3.md`, pacote v3) tem **82 perguntas**. Ainda há referências a **84**, todas de texto:

| Arquivo | Onde |
|---|---|
| `ficha.js` | linha 19 (comentário), linha 617 ("Cada reaplicação refaz todas as 84 perguntas") e linha 817 ("84 perguntas em três blocos") |
| `questionario.js` | linha 2 (comentário) |
| `demo.js` | linha 278 (legenda do vídeo) |
| `metodologia-decisoes-v1.js` e `metodologia-revisao-v3.js` | histórico da v2, que está correto como registro |

- **SNT-210:** "Seus exames costumam mostrar PCR ou VHS acima do normal?" Pergunta sobre exame laboratorial. A decisão atual é que exames não impactam o Resultado HOLOS.
- **SNT-309:** "Seus exames costumam mostrar triglicerídeos altos ou HDL baixo?" Mesmo ponto.
- **Nenhuma delas foi alterada nesta tarefa.**
